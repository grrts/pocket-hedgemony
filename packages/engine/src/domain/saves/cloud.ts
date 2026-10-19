import type { Rng } from "../../rng.ts";
import { fnv1a } from "./bytes.ts";
import { SaveError, readHeader, savesConfig, verifyCrcs, type Platform, type SaveHeader } from "./format.ts";
import { randomId, type SaveEntry } from "./library.ts";

/**
 * Cloud saves on the Pocket Hegemony server (save-system §5.1, §5.2, §6.2) as a
 * pure domain model: accounts, devices and tokens, the Save table, object
 * storage, tombstones, the changes cursor, quotas, the ironman head check, the
 * synced set and the device's upload queue. No network: callers pass the
 * server value and the time.
 */

const S = savesConfig.cloud.server;
const DAY_MS = 86_400_000;

/** The Save row the server keeps for the Load screen (SAVE-061). */
export interface SaveRow {
  account: string;
  campaignId: string;
  saveId: string;
  kind: SaveHeader["kind"];
  name: string;
  savedAt: number;
  device: string;
  platform: Platform;
  gameVersion: string;
  formatVersion: number;
  turn: number;
  date: { y: number; m: number };
  nation: string;
  ironman: boolean;
  size: number;
  deletedAt: number | null;
}

export const SAVE_ROW_FIELDS = [
  "account", "campaign", "save id", "kind", "name", "saved at", "device", "platform",
  "game version", "format version", "turn", "date", "nation", "ironman", "size", "deleted at",
] as const;

export interface Device {
  name: string;
  platform: Platform | "steam";
  deviceToken: string;
}

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  devices: Device[];
}

export interface CloudServer {
  accounts: Map<string, Account>;
  /** The Save table: header fields only, never bytes. */
  rows: Map<string, SaveRow>;
  /** S3-compatible object storage: `<accountId>/<campaignId>/<saveId>.phsave` → bytes. */
  objects: Map<string, Uint8Array>;
  /** Change log for "changes since the cursor". */
  changes: { cursor: number; saveId: string }[];
  cursor: number;
  /** Per campaign: the newest ironman save. */
  heads: Map<string, string>;
  /** Emails sent (password reset). */
  outbox: { to: string; subject: string }[];
  /** Uploads a device may make per window; the design gives no numbers, so the operator sets them. */
  rateLimit?: { uploads: number; windowMs: number };
  uploadTimes: Map<string, number[]>;
  rng: Rng;
}

export function createServer(rng: Rng, rateLimit?: { uploads: number; windowMs: number }): CloudServer {
  const s: CloudServer = { accounts: new Map(), rows: new Map(), objects: new Map(), changes: [], cursor: 0, heads: new Map(), outbox: [], uploadTimes: new Map(), rng };
  if (rateLimit) s.rateLimit = rateLimit;
  return s;
}

export function objectKey(account: string, campaignId: string, saveId: string): string {
  return `${account}/${campaignId}/${saveId}${savesConfig.format.extension}`;
}

/** Keychain on iOS, Keystore on Android, `safeStorage` in Electron (SAVE-057). */
export function secureStorage(platform: string): string | undefined {
  return (savesConfig.secure_storage as Record<string, string>)[platform];
}

export function createAccount(server: CloudServer, email: string, password: string, id?: string): Account {
  const acc: Account = { id: id ?? `acc-${randomId(server.rng)}`, email, passwordHash: fnv1a(password), devices: [] };
  server.accounts.set(acc.id, acc);
  return acc;
}

/** `POST /api/sessions`: a short-lived access token and a long-lived device token (SAVE-057). */
export function signIn(
  server: CloudServer,
  email: string,
  password: string,
  device: string,
  platform: Platform | "steam",
): { accessToken: string; accessTtl: "short"; deviceToken: string; deviceTtl: "long"; keptIn: string | undefined } | { error: string } {
  const acc = [...server.accounts.values()].find((a) => a.email === email);
  if (!acc || acc.passwordHash !== fnv1a(password)) return { error: "wrong email or password" };
  const deviceToken = `dev-${randomId(server.rng)}`;
  acc.devices = acc.devices.filter((d) => d.name !== device);
  acc.devices.push({ name: device, platform, deviceToken });
  return { accessToken: `acc-${randomId(server.rng)}`, accessTtl: "short", deviceToken, deviceTtl: "long", keptIn: secureStorage(platform === "steam" ? "desktop" : platform) };
}

/** The account a device token belongs to, if it is still signed in. */
export function authorise(server: CloudServer, deviceToken: string): Account | undefined {
  return [...server.accounts.values()].find((a) => a.devices.some((d) => d.deviceToken === deviceToken));
}

/** Any device can sign out any other device of the account. */
export function signOutDevice(server: CloudServer, deviceToken: string, deviceName: string): boolean {
  const acc = authorise(server, deviceToken);
  if (!acc) return false;
  const before = acc.devices.length;
  acc.devices = acc.devices.filter((d) => d.name !== deviceName);
  return acc.devices.length < before;
}

export function requestPasswordReset(server: CloudServer, email: string): void {
  if ([...server.accounts.values()].some((a) => a.email === email)) server.outbox.push({ to: email, subject: "password reset" });
}

/** Deleting the account deletes every save with it (SAVE-058). */
export function deleteAccount(server: CloudServer, deviceToken: string): boolean {
  const acc = authorise(server, deviceToken);
  if (!acc) return false;
  for (const [id, row] of server.rows) {
    if (row.account !== acc.id) continue;
    server.objects.delete(objectKey(acc.id, row.campaignId, row.saveId));
    server.rows.delete(id);
  }
  server.accounts.delete(acc.id);
  return true;
}

function change(server: CloudServer, saveId: string): void {
  server.cursor++;
  server.changes.push({ cursor: server.cursor, saveId });
}

export type UploadRefusal =
  | "not signed in"
  | "rate limit"
  | "too big"
  | "wrong magic"
  | "damaged"
  | "header differs from its row"
  | "save id exists with other bytes"
  | "quota"
  | "load the newer game first";

/** The row a client sends with an upload, built from the save's header. */
export function rowOf(account: string, header: SaveHeader, size: number): SaveRow {
  return {
    account,
    campaignId: header.campaignId,
    saveId: header.saveId,
    kind: header.kind,
    name: header.name,
    savedAt: header.savedAt,
    device: header.device,
    platform: header.platform,
    gameVersion: header.gameVersion,
    formatVersion: header.formatVersion,
    turn: header.turn,
    date: header.date,
    nation: header.playerNation,
    ironman: header.ironman,
    size,
    deletedAt: null,
  };
}

function sameRow(a: SaveRow, b: SaveRow): boolean {
  const keys = Object.keys(a) as (keyof SaveRow)[];
  return keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * `PUT /api/saves/{saveId}`: rate limit, size cap, magic, CRCs, header against
 * the row, write-once, quota, and for ironman the head check (SAVE-063,
 * SAVE-068, SAVE-069, SAVE-070, SAVE-089).
 */
export function putSave(server: CloudServer, deviceToken: string, row: Omit<SaveRow, "account">, bytes: Uint8Array, now: number): { ok: true } | { ok: false; refusal: UploadRefusal } {
  const acc = authorise(server, deviceToken);
  if (!acc) return { ok: false, refusal: "not signed in" };
  if (server.rateLimit) {
    const times = (server.uploadTimes.get(deviceToken) ?? []).filter((t) => now - t < server.rateLimit!.windowMs);
    if (times.length >= server.rateLimit.uploads) return { ok: false, refusal: "rate limit" };
    times.push(now);
    server.uploadTimes.set(deviceToken, times);
  }
  if (bytes.length > S.max_save_mb * 1024 * 1024) return { ok: false, refusal: "too big" };
  let header: SaveHeader;
  try {
    verifyCrcs(bytes);
    header = readHeader(bytes);
  } catch (e) {
    return { ok: false, refusal: e instanceof SaveError && e.problem === "wrong-magic" ? "wrong magic" : "damaged" };
  }
  const full: SaveRow = { ...row, account: acc.id };
  if (!sameRow(full, rowOf(acc.id, header, bytes.length))) return { ok: false, refusal: "header differs from its row" };
  const existing = server.rows.get(row.saveId);
  if (existing) {
    const stored = server.objects.get(objectKey(acc.id, existing.campaignId, existing.saveId));
    return stored && sameBytes(stored, bytes) ? { ok: true } : { ok: false, refusal: "save id exists with other bytes" };
  }
  const mine = [...server.rows.values()].filter((r) => r.account === acc.id && r.deletedAt === null);
  const usedMb = mine.reduce((n, r) => n + r.size, 0) / (1024 * 1024);
  if (mine.length >= S.quota_saves || usedMb + bytes.length / (1024 * 1024) > S.quota_mb) return { ok: false, refusal: "quota" };
  if (header.kind === "ironman" && S.ironman_head_check) {
    const head = server.heads.get(header.campaignId);
    if (head !== undefined && header.parent !== head) return { ok: false, refusal: "load the newer game first" };
    server.heads.set(header.campaignId, header.saveId);
  }
  server.rows.set(row.saveId, full);
  server.objects.set(objectKey(acc.id, row.campaignId, row.saveId), bytes.slice());
  change(server, row.saveId);
  return { ok: true };
}

/** `POST /api/campaigns/{campaignId}/ironman-head`: claim the line if `parent` is still its head. */
export function claimIronmanHead(server: CloudServer, campaignId: string, saveId: string, parent: string | undefined): { ok: true } | { ok: false; head: string } {
  const head = server.heads.get(campaignId);
  if (head !== undefined && head !== parent) return { ok: false, head };
  server.heads.set(campaignId, saveId);
  return { ok: true };
}

/** `GET /api/saves?since=<cursor>`: headers and tombstones changed since the cursor, and the new cursor. */
export function changesSince(server: CloudServer, deviceToken: string, since: number): { rows: SaveRow[]; tombstones: { saveId: string; deletedAt: number }[]; cursor: number } | undefined {
  const acc = authorise(server, deviceToken);
  if (!acc) return undefined;
  const ids = new Set(server.changes.filter((c) => c.cursor > since).map((c) => c.saveId));
  const rows: SaveRow[] = [];
  const tombstones: { saveId: string; deletedAt: number }[] = [];
  for (const id of ids) {
    const r = server.rows.get(id);
    if (!r || r.account !== acc.id) continue;
    if (r.deletedAt !== null) tombstones.push({ saveId: id, deletedAt: r.deletedAt });
    else rows.push({ ...r });
  }
  return { rows, tombstones, cursor: server.cursor };
}

/** `GET /api/saves/{saveId}`: the bytes. */
export function getSave(server: CloudServer, deviceToken: string, saveId: string): Uint8Array | undefined {
  const acc = authorise(server, deviceToken);
  const r = server.rows.get(saveId);
  if (!acc || !r || r.account !== acc.id || r.deletedAt !== null) return undefined;
  return server.objects.get(objectKey(acc.id, r.campaignId, saveId))?.slice();
}

/** `DELETE /api/saves/{saveId}`: a tombstone; the bytes stay until purged. */
export function deleteCloudSave(server: CloudServer, deviceToken: string, saveId: string, now: number): boolean {
  const acc = authorise(server, deviceToken);
  const r = server.rows.get(saveId);
  if (!acc || !r || r.account !== acc.id || r.deletedAt !== null) return false;
  r.deletedAt = now;
  change(server, saveId);
  return true;
}

/** `DELETE /api/campaigns/{campaignId}`: tombstones every save of the campaign. */
export function deleteCloudCampaign(server: CloudServer, deviceToken: string, campaignId: string, now: number): number {
  const acc = authorise(server, deviceToken);
  if (!acc) return 0;
  let n = 0;
  for (const r of server.rows.values()) {
    if (r.account === acc.id && r.campaignId === campaignId && r.deletedAt === null) {
      r.deletedAt = now;
      change(server, r.saveId);
      n++;
    }
  }
  return n;
}

/** Purges the bytes of tombstones older than 30 days (SAVE-062). */
export function purge(server: CloudServer, now: number): string[] {
  const gone: string[] = [];
  for (const r of server.rows.values()) {
    if (r.deletedAt !== null && now - r.deletedAt >= savesConfig.tombstone_purge_days * DAY_MS) {
      if (server.objects.delete(objectKey(r.account, r.campaignId, r.saveId))) gone.push(r.saveId);
    }
  }
  return gone;
}

// ---------------------------------------------------------------- the synced set

/**
 * The saves a device uploads (SAVE-055): every Manual save, and per campaign
 * the latest Resume, the latest Ironman and the newest autosave. Older
 * autosaves, the backup Resume save and the orders journal stay local.
 */
export function syncedSet(all: readonly SaveEntry[]): SaveEntry[] {
  const out: SaveEntry[] = [];
  const newest = new Map<string, SaveEntry>();
  for (const e of all) {
    if (e.header.kind === "manual") {
      out.push(e);
      continue;
    }
    const key = `${e.header.campaignId}|${e.header.kind}`;
    const cur = newest.get(key);
    if (!cur || e.header.savedAt > cur.header.savedAt) newest.set(key, e);
  }
  return [...out, ...newest.values()];
}

// ---------------------------------------------------------------- the device side

export interface QueueItem {
  path: string;
  attempts: number;
  /** Not before this time (ms), after a failure. */
  notBefore: number;
}

/** Where the upload queue is kept so it survives restarts (INV-SAVE-16). */
export interface QueueStore {
  load(): string | undefined;
  save(text: string): void;
}

export interface SyncClient {
  device: string;
  deviceToken?: string;
  cursor: number;
  online: boolean;
  metered: boolean;
  /** "Sync on Wi-Fi only", default off (SAVE-067). */
  wifiOnly: boolean;
  /** Cloud saves on (settings). */
  enabled: boolean;
  queue: QueueItem[];
  store: QueueStore;
  /** Headers that arrived from the cloud, by save id. */
  known: Map<string, SaveRow>;
  /** Seconds of the first retry wait; each failure doubles it. */
  retryBaseSeconds: number;
}

export function syncClient(device: string, store: QueueStore, init: Partial<Pick<SyncClient, "online" | "metered" | "wifiOnly" | "retryBaseSeconds">> = {}): SyncClient {
  let queue: QueueItem[] = [];
  const saved = store.load();
  if (saved) queue = JSON.parse(saved) as QueueItem[];
  return {
    device,
    cursor: 0,
    online: init.online ?? true,
    metered: init.metered ?? false,
    wifiOnly: init.wifiOnly ?? S.wifi_only_default,
    enabled: true,
    queue,
    store,
    known: new Map(),
    retryBaseSeconds: init.retryBaseSeconds ?? 1,
  };
}

function persist(c: SyncClient): void {
  c.store.save(JSON.stringify(c.queue));
}

/** Whether the device may sync now: signed in, cloud on, online, and not metered while Wi-Fi only. */
export function maySync(c: SyncClient): boolean {
  return c.deviceToken !== undefined && c.enabled && c.online && !(c.wifiOnly && c.metered);
}

/** A save was written: queue its upload (SAVE-065). */
export function queueUpload(c: SyncClient, path: string): void {
  if (!c.queue.some((q) => q.path === path)) c.queue.push({ path, attempts: 0, notBefore: 0 });
  persist(c);
}

/** The wait before the next try after `attempts` failures: it grows each time. */
export function retryWaitSeconds(c: SyncClient, attempts: number): number {
  return c.retryBaseSeconds * 2 ** (attempts - 1);
}

/**
 * Empties the queue oldest first while the device may sync. A refused upload
 * that can succeed later stays queued with a growing wait; a refusal the
 * player must act on (quota, ironman split) is reported.
 */
export function runQueue(
  c: SyncClient,
  upload: (path: string) => { ok: true } | { ok: false; refusal: UploadRefusal | "offline" },
  now: number,
): { uploaded: string[]; failed: { path: string; refusal: string; retryAt: number }[]; askPlayer: { path: string; refusal: UploadRefusal }[] } {
  const uploaded: string[] = [];
  const failed: { path: string; refusal: string; retryAt: number }[] = [];
  const askPlayer: { path: string; refusal: UploadRefusal }[] = [];
  if (!maySync(c)) return { uploaded, failed, askPlayer };
  const keep: QueueItem[] = [];
  for (const item of c.queue) {
    if (item.notBefore > now) {
      keep.push(item);
      continue;
    }
    const r = upload(item.path);
    if (r.ok) uploaded.push(item.path);
    else if (r.refusal === "quota" || r.refusal === "load the newer game first") askPlayer.push({ path: item.path, refusal: r.refusal });
    else {
      item.attempts++;
      item.notBefore = now + retryWaitSeconds(c, item.attempts) * 1000;
      failed.push({ path: item.path, refusal: r.refusal, retryAt: item.notBefore });
      keep.push(item);
    }
  }
  c.queue = keep;
  persist(c);
  return { uploaded, failed, askPlayer };
}

export type SyncMoment = "launch" | "resume" | "after_save" | "background";

/**
 * What a sync does at a moment (SAVE-064, SAVE-066): fetch changes since the
 * cursor at launch and on return, headers first; bytes only on open, or in
 * the background for the newest Resume save. Backgrounding does nothing extra.
 */
export function syncPlan(moment: SyncMoment): string[] {
  if (moment === "background") return [];
  if (!(S.sync_on as string[]).includes(moment)) return [];
  if (moment === "after_save") return ["empty the upload queue"];
  return ["fetch changes since the last cursor", "headers first", "bytes on open, or in the background for the newest Resume save", "empty the upload queue"];
}

/** Fetches changes since the cursor; tombstoned saves are forgotten. Returns what arrived. */
export function fetchChanges(c: SyncClient, server: CloudServer): { arrived: SaveRow[]; removed: string[] } {
  if (!maySync(c)) return { arrived: [], removed: [] };
  const r = changesSince(server, c.deviceToken!, c.cursor);
  if (!r) return { arrived: [], removed: [] };
  for (const row of r.rows) c.known.set(row.saveId, row);
  for (const t of r.tombstones) c.known.delete(t.saveId);
  c.cursor = r.cursor;
  return { arrived: r.rows, removed: r.tombstones.map((t) => t.saveId) };
}

/** Where saves are kept without our server (SAVE-073 … SAVE-077). */
export function storeBackup(platform: "steam" | "android" | "ios" | "web"): Record<string, unknown> {
  return { ...(savesConfig.cloud.store_backups as unknown as Record<string, Record<string, unknown>>)[platform] };
}

/**
 * Sign-in options (SAVE-059): each platform's store sign-ins first, email last; on iOS any
 * third-party sign-in brings Sign in with Apple.
 */
export function signInOptions(platform: string, later: readonly string[] = []): string[] {
  const byPlatform = savesConfig.sign_in.at_launch as Record<string, readonly string[]>;
  const opts = [...(byPlatform[platform] ?? byPlatform.web ?? []), ...later.filter((o) => !(byPlatform[platform] ?? []).includes(o))];
  const apple = savesConfig.sign_in.ios_needs;
  if (platform === "ios" && opts.some((o) => o !== apple && o !== "email and password") && !opts.includes(apple)) opts.unshift(apple);
  return opts;
}
