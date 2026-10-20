import { fileName, maySync, queueUpload, readHeader, retryWaitSeconds, syncClient, syncedSet, syncPlan, type SaveHeader, type SyncClient, type SyncMoment } from "@ph/engine/domain/saves";
import type { StoredSave } from "../saves/store.ts";
import { CloudError, type CloudApi, type KeyValue, type RemoteSave, type Usage } from "./api.ts";

/**
 * Cloud saves on the device (SAVE-053 … SAVE-069): the upload queue, the
 * headers that arrived from other devices, tombstones, and downloading a
 * save when it is opened. The rules come from the engine (`syncedSet`,
 * `syncPlan`, the queue and its back-off); this file only does the calls and
 * keeps what it learnt between launches.
 */

/** The parts of the SaveStore the sync uses. */
export interface LocalSaves {
  list(): Promise<StoredSave[]>;
  read(path: string): Promise<Uint8Array | undefined>;
  commit(path: string, bytes: Uint8Array, removed: readonly string[]): Promise<StoredSave>;
  remove(path: string): Promise<void>;
}

/** A Load line for a save that is in the cloud only: its bytes come down when it is opened (SAVE-064). */
export const CLOUD_PATH = "cloud:";

type Removal = { saveId: string } | { campaignId: string };

/** What this device uploaded, to keep only the newest of each kind in the cloud (SAVE-055). */
interface Uploaded {
  campaignId: string;
  kind: SaveHeader["kind"];
  savedAt: number;
}

interface Remembered {
  cursor?: string;
  rows: RemoteSave[];
  uploaded: Record<string, Uploaded>;
  /** Saves this device took out of the cloud for leaving the synced set; their tombstones leave the local copy alone. */
  pruned: string[];
  /** Deletions still to send, oldest first. */
  removals: Removal[];
  usage?: Usage;
  /** The account is full: from the usage, or from a refused upload until the usage drops or an upload passes (SAVE-069). */
  full?: boolean;
}

const QUEUE_KEY = "ph.cloud-queue";
const STATE_KEY = "ph.cloud-state";

/** The save id in a file name `<campaignId>/<savedAt>-<saveId>.phsave` (SAVE-053). */
export function saveIdOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1).replace(/\.phsave$/, "");
  return base.slice(base.indexOf("-") + 1);
}

/** A cloud row as a Load line: the header fields the server keeps, the rest empty. */
export function cloudEntry(r: RemoteSave): StoredSave {
  const header = {
    saveId: r.saveId,
    campaignId: r.campaignId,
    kind: r.kind,
    name: r.name,
    savedAt: r.savedAt,
    device: r.device,
    platform: r.platform,
    gameVersion: r.gameVersion,
    formatVersion: r.formatVersion,
    turn: r.turn,
    date: r.date,
    playerNation: r.nation,
    ironman: r.ironman,
    thumbnail: "",
  } as SaveHeader;
  return { path: CLOUD_PATH + r.saveId, header, head: new Uint8Array() };
}

export type CloudState = "signed_out" | "up_to_date" | "waiting" | "offline" | "full" | "newer_elsewhere";

export class CloudSync {
  readonly api: CloudApi;
  private readonly saves: LocalSaves;
  private readonly kv: KeyValue;
  private readonly q: SyncClient;
  private mem: Remembered;
  private running: Promise<void> = Promise.resolve();
  private offline = false;
  /** An ironman upload was refused because another device is further along (SAVE-089). */
  private newerElsewhere = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly now: () => number;
  private readonly online: () => boolean;
  private readonly later: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  /** Told whenever what the Load card or the account card shows may have changed. */
  onChange: () => void = () => {};

  constructor(
    api: CloudApi,
    saves: LocalSaves,
    kv: KeyValue,
    opts: { device: string; now?: () => number; online?: () => boolean; later?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>; retryBaseSeconds?: number },
  ) {
    this.api = api;
    this.saves = saves;
    this.kv = kv;
    this.q = syncClient(opts.device, { load: () => kv.get(QUEUE_KEY), save: (t) => kv.set(QUEUE_KEY, t) }, opts.retryBaseSeconds ? { retryBaseSeconds: opts.retryBaseSeconds } : {});
    this.mem = { rows: [], uploaded: {}, pruned: [], removals: [] };
    try {
      this.mem = { ...this.mem, ...(JSON.parse(kv.get(STATE_KEY) ?? "{}") as Partial<Remembered>) };
    } catch {
      // Start over: the next fetch fills it again.
    }
    this.now = opts.now ?? Date.now;
    this.online = opts.online ?? (() => typeof navigator === "undefined" || navigator.onLine !== false);
    this.later = opts.later ?? ((fn, ms) => setTimeout(fn, ms));
    api.onSignedOut = () => this.forget();
  }

  // ---------------------------------------------------------------- what the cards show

  /** The account card's status line, the overview of cloud state (accounts-design §3). */
  state(): CloudState {
    if (!this.api.signedIn) return "signed_out";
    if (this.offline || !this.online()) return "offline";
    if (this.mem.full) return "full";
    if (this.newerElsewhere) return "newer_elsewhere";
    return this.q.queue.length ? "waiting" : "up_to_date";
  }

  statusText(): string {
    const n = this.q.queue.length;
    switch (this.state()) {
      case "signed_out":
        return "";
      case "offline":
        return "Offline, will sync when connected";
      case "full":
        return "Storage full. Delete old saves to make room.";
      case "newer_elsewhere":
        return "This ironman game is further along on another device. Load it there first.";
      case "waiting":
        return `${n} save${n === 1 ? "" : "s"} waiting to upload`;
      default:
        return "Up to date";
    }
  }

  usage(): Usage | undefined {
    return this.mem.usage;
  }

  /** The saves other devices put in the cloud that this device does not hold, as Load lines. */
  remote(local: readonly StoredSave[]): StoredSave[] {
    if (!this.api.signedIn) return [];
    const here = new Set(local.map((e) => e.header.saveId));
    return this.mem.rows.filter((r) => !here.has(r.saveId)).map(cloudEntry);
  }

  // ---------------------------------------------------------------- what the game tells it

  /**
   * A save was written (SAVE-065): its upload is queued, and saves it replaced
   * that this device had uploaded leave the cloud too (a manual save saved over).
   */
  saved(path: string, removed: readonly string[] = []): void {
    if (!this.api.signedIn) return;
    queueUpload(this.q, path);
    for (const p of removed) this.removeSave(saveIdOf(p), true);
    this.remember();
  }

  /** The player deleted a save on this device: it leaves the cloud too (SAVE-062). */
  deleted(saveId: string): void {
    if (!this.api.signedIn) return;
    this.removeSave(saveId, false);
    this.remember();
    this.onChange();
    void this.run("after_save");
  }

  /** The player deleted a campaign on this device: every save of it leaves the cloud (SAVE-056). */
  deletedCampaign(campaignId: string): void {
    if (!this.api.signedIn) return;
    this.mem.removals.push({ campaignId });
    this.mem.rows = this.mem.rows.filter((r) => r.campaignId !== campaignId);
    for (const [id, u] of Object.entries(this.mem.uploaded)) if (u.campaignId === campaignId) delete this.mem.uploaded[id];
    this.remember();
    this.onChange();
    void this.run("after_save");
  }

  /** Signed in on this device: what it already holds of the synced set goes up (SAVE-055). */
  async signedIn(): Promise<void> {
    for (const e of syncedSet(await this.saves.list())) queueUpload(this.q, e.path);
    this.onChange();
    await this.run("launch");
  }

  /**
   * Syncs at a moment (SAVE-064, SAVE-066): at launch and on return to the
   * app the changes since the cursor come first, then the queue; after a save
   * the queue, then the changes so the storage line is current. Backgrounding
   * does nothing. Runs one after another.
   */
  run(moment: SyncMoment): Promise<void> {
    const plan = syncPlan(moment);
    if (!plan.length) return this.running;
    const go = async () => {
      const id = this.api.deviceId;
      if (id) this.q.deviceToken = id;
      else delete this.q.deviceToken;
      if (!maySync(this.q)) return;
      try {
        if (moment === "after_save") {
          await this.empty();
          await this.fetchChanges();
        } else {
          await this.fetchChanges();
          await this.empty();
        }
        this.offline = false;
      } catch (e) {
        if (e instanceof CloudError && e.offline) this.offline = true;
        else if (!(e instanceof CloudError)) throw e;
      } finally {
        this.remember();
        this.retryLater();
        this.onChange();
      }
    };
    this.running = this.running.then(go, go);
    return this.running;
  }

  /** Opens a save that is in the cloud only: its bytes come down into the SaveStore (SAVE-064). */
  async download(saveId: string): Promise<StoredSave> {
    const bytes = await this.api.getSave(saveId);
    const header = readHeader(bytes);
    if (header.saveId !== saveId) throw new CloudError(422, "wrong_save");
    const entry = await this.saves.commit(fileName(header), bytes, []);
    this.onChange();
    return entry;
  }

  // ---------------------------------------------------------------- the work

  private removeSave(saveId: string, onlyIfUploaded: boolean): void {
    if (onlyIfUploaded && !this.mem.uploaded[saveId]) return;
    delete this.mem.uploaded[saveId];
    this.mem.rows = this.mem.rows.filter((r) => r.saveId !== saveId);
    if (!this.mem.removals.some((r) => "saveId" in r && r.saveId === saveId)) this.mem.removals.push({ saveId });
  }

  /** `GET /api/saves?since=`: headers and tombstones, page after page. */
  private async fetchChanges(): Promise<void> {
    for (;;) {
      const r = await this.api.changes(this.mem.cursor);
      // After two accounts were combined the list starts over: the cloud lines held so far give way to it (SAVE-192).
      const rows = new Map(r.reset ? [] : this.mem.rows.map((x) => [x.saveId, x]));
      for (const s of r.saves) rows.set(s.saveId, s);
      const local = r.tombstones.length ? await this.saves.list() : [];
      for (const t of r.tombstones) {
        rows.delete(t.saveId);
        delete this.mem.uploaded[t.saveId];
        const mine = this.mem.pruned.indexOf(t.saveId);
        if (mine >= 0) {
          this.mem.pruned.splice(mine, 1);
          continue;
        }
        // A save deleted on another device goes here too; Resume and Ironman saves leave by their own rotation.
        const copy = local.find((e) => e.header.saveId === t.saveId && (e.header.kind === "manual" || e.header.kind === "autosave"));
        if (copy) await this.saves.remove(copy.path);
      }
      this.mem.rows = [...rows.values()];
      this.mem.cursor = r.cursor;
      if (r.usage) {
        const was = this.mem.usage;
        const dropped = !!was && (r.usage.saves < was.saves || r.usage.bytes < was.bytes);
        this.mem.full = r.usage.saves >= r.usage.quotaSaves || r.usage.bytes >= r.usage.quotaBytes || (!!this.mem.full && !dropped);
        this.mem.usage = r.usage;
      }
      if (!r.more) return;
    }
  }

  /**
   * Sends the deletions, then empties the upload queue oldest first, uploading
   * only saves still in the synced set. A failure that can pass waits longer
   * each time; a full account or a newer ironman game stops for the player.
   */
  private async empty(): Promise<void> {
    await this.sendRemovals();
    const local = await this.saves.list();
    const synced = new Map(syncedSet(local).map((e) => [e.path, e as StoredSave]));
    const now = this.now();
    const keep: typeof this.q.queue = [];
    const items = [...this.q.queue];
    try {
      while (items.length) {
        const item = items[0]!;
        const entry = synced.get(item.path);
        const bytes = entry && item.notBefore <= now ? await this.saves.read(item.path) : undefined;
        if (entry && item.notBefore > now) keep.push(item);
        if (!bytes) {
          // Waiting out its back-off, or no longer in the synced set: older autosaves and the backup stay local.
          items.shift();
          continue;
        }
        try {
          await this.api.putSave(entry!.header.saveId, bytes);
          this.uploaded(entry!.header, local);
        } catch (e) {
          if (!(e instanceof CloudError)) throw e;
          if (e.code === "save_id_exists") this.uploaded(entry!.header, local);
          else if (e.code === "not_the_newest") this.newerElsewhere = true;
          else if (e.offline || e.code === "signed_out") throw e;
          else if (e.code === "quota_full" || e.status === 507) {
            this.mem.full = true;
            return;
          } else {
            item.attempts++;
            item.notBefore = now + retryWaitSeconds(this.q, item.attempts) * 1000;
            keep.push(item);
          }
        }
        items.shift();
      }
    } finally {
      // What was not reached stays queued, in its order (unless the device was signed out meanwhile).
      if (this.api.signedIn) {
        this.q.queue = [...keep, ...items];
        this.kv.set(QUEUE_KEY, JSON.stringify(this.q.queue));
      }
    }
    // The older saves the uploads replaced.
    await this.sendRemovals();
  }

  private async sendRemovals(): Promise<void> {
    while (this.mem.removals.length) {
      const r = this.mem.removals[0]!;
      try {
        if ("saveId" in r) await this.api.deleteSave(r.saveId);
        else await this.api.deleteCampaign(r.campaignId);
      } catch (e) {
        if (!(e instanceof CloudError) || e.offline || e.code === "signed_out" || e.status >= 500 || e.status === 429) throw e;
        // Already gone (404) or refused for good: nothing more to send.
      }
      this.mem.removals.shift();
      this.remember();
    }
  }

  /** A save reached the cloud: the older one of its kind that this device sent leaves it (SAVE-055). */
  private uploaded(h: SaveHeader, local: readonly StoredSave[]): void {
    this.mem.uploaded[h.saveId] = { campaignId: h.campaignId, kind: h.kind, savedAt: h.savedAt };
    this.mem.full = false;
    if (h.kind === "ironman" || h.kind === "resume") this.newerElsewhere = false;
    if (h.kind === "manual") return;
    for (const [id, u] of Object.entries(this.mem.uploaded)) {
      if (id === h.saveId || u.campaignId !== h.campaignId || u.kind !== h.kind || u.savedAt >= h.savedAt) continue;
      this.removeSave(id, true);
      if (local.some((e) => e.header.saveId === id)) this.mem.pruned.push(id);
    }
  }

  /** Waits for the soonest queued retry, while the app is open (SAVE-065). */
  private retryLater(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    const next = Math.min(...this.q.queue.map((q) => q.notBefore).filter((t) => t > this.now()));
    if (!Number.isFinite(next) || this.offline || this.mem.full) return;
    this.timer = this.later(() => void this.run("after_save"), next - this.now());
  }

  private remember(): void {
    this.kv.set(STATE_KEY, JSON.stringify(this.mem));
  }

  /** Signed out: the queue and everything learnt from the account go. */
  private forget(): void {
    this.q.queue = [];
    this.kv.set(QUEUE_KEY, undefined);
    this.mem = { rows: [], uploaded: {}, pruned: [], removals: [] };
    this.kv.set(STATE_KEY, undefined);
    this.offline = false;
    this.newerElsewhere = false;
    this.onChange();
  }
}
