import { CHECKPOINT_START, START_ID, type Ruleset } from "@ph/rules";
import { hashWorld } from "../../hash.ts";
import type { Rng } from "../../rng.ts";
import type { Order } from "../../turn.ts";
import type { World } from "../../world.ts";
import type { TileGrid } from "../../tiles.ts";
import { crc32, hex32 } from "./bytes.ts";
import {
  FORMAT_VERSION,
  SaveError,
  decodeSave,
  encodeSave,
  headerSpan,
  readHeader,
  savesConfig,
  type AppTier,
  type CampaignOptions,
  type SaveFlags,
  type Platform,
  type RawChunk,
  type SaveHeader,
  type SaveKind,
} from "./format.ts";
import { migrate, validateChunks, type Migration } from "./migrations.ts";
import { mapHash, restoreWorld, rulesHash, thumbnail, worldChunks, type MappingTables, type SavedGame } from "./world-chunks.ts";

/**
 * Kinds of save, campaigns, Continue, saving by hand, the Resume save and the
 * orders journal, safe writing, loading with its checks, ironman and the free
 * tier (save-system §2, §3, §5.4, §6). Storage is injected; nothing here
 * touches a disk, a clock or the network.
 */

const C = savesConfig;
const M = C.messages;

// ---------------------------------------------------------------- storage

/** Where a platform keeps save files: a folder on disk, or IndexedDB on the web. */
export interface SaveStorage {
  /** Final files only; temporary files are not listed. */
  list(): string[];
  read(path: string): Uint8Array | undefined;
  write(path: string, bytes: Uint8Array): void;
  flush(path: string): void;
  rename(from: string, to: string): void;
  remove(path: string): void;
  /** On the web: runs the steps as one IndexedDB transaction, all or nothing. */
  transaction?: (steps: () => void) => void;
}

export class NoSpaceError extends Error {}
export class KilledError extends Error {}

export const TEMP_SUFFIX = ".tmp";

/** An in-memory store: the web's IndexedDB stand-in and the test double. */
export interface MemoryStorage extends SaveStorage {
  files: Map<string, Uint8Array>;
  log: string[];
  /** Bytes free; writing more throws NoSpaceError. */
  freeBytes: number;
  /** Count down operations; at zero the app is killed (throws KilledError). */
  killAfter: number | undefined;
}

export function memoryStorage(opts: { freeBytes?: number; transactional?: boolean } = {}): MemoryStorage {
  const s: MemoryStorage = {
    files: new Map(),
    log: [],
    freeBytes: opts.freeBytes ?? Infinity,
    killAfter: undefined,
    list: () => [...s.files.keys()].filter((p) => !p.endsWith(TEMP_SUFFIX)).sort(),
    read: (p) => s.files.get(p),
    write: (p, bytes) => {
      step(`write ${p}`);
      if (bytes.length > s.freeBytes) throw new NoSpaceError(M.no_space);
      s.freeBytes -= bytes.length;
      s.files.set(p, bytes.slice());
    },
    flush: (p) => step(`flush ${p}`),
    rename: (a, b) => {
      step(`rename ${a} ${b}`);
      const f = s.files.get(a);
      if (!f) throw new Error(`no file ${a}`);
      s.files.delete(a);
      s.files.set(b, f);
    },
    remove: (p) => {
      step(`remove ${p}`);
      const f = s.files.get(p);
      if (f) s.freeBytes += f.length;
      s.files.delete(p);
    },
  };
  function step(what: string) {
    if (s.killAfter !== undefined) {
      if (s.killAfter <= 0) throw new KilledError("app killed");
      s.killAfter--;
    }
    s.log.push(what);
  }
  if (opts.transactional) {
    s.transaction = (steps) => {
      const before = new Map(s.files);
      const free = s.freeBytes;
      s.log.push("begin transaction");
      try {
        steps();
        s.log.push("commit transaction");
      } catch (e) {
        s.files = before;
        s.freeBytes = free;
        throw e;
      }
    };
  }
  return s;
}

/**
 * Writes one file safely (SAVE-032): to a temporary file in the same folder,
 * flushed and renamed to its final name (one transaction on the web), and
 * only then removes what it replaces. Returns the steps taken.
 */
export function writeFileSafely(storage: SaveStorage, path: string, bytes: Uint8Array, replaces: readonly string[] = []): string[] {
  const steps: string[] = [];
  const tmp = path + TEMP_SUFFIX;
  const commit = () => {
    storage.write(tmp, bytes);
    steps.push("written to a temporary file in the same folder");
    if (!storage.transaction) {
      storage.flush(tmp);
      steps.push("flushed to disk");
    }
    storage.rename(tmp, path);
    steps.push("renamed to its final name");
  };
  if (storage.transaction) {
    storage.transaction(commit);
    steps.push("committed in a single IndexedDB transaction");
  } else commit();
  for (const old of replaces) {
    storage.remove(old);
    steps.push(`removed ${old}`);
  }
  return steps;
}

/** Copies the Steam demo's saves (found under the same save folder name) into the full game's folder on first launch (SAVE-083). */
export function importDemoSaves(demo: SaveStorage, full: SaveStorage, firstLaunch: boolean): string[] {
  if (!firstLaunch) return [];
  const have = new Set(full.list());
  const copied: string[] = [];
  for (const p of demo.list()) {
    if (have.has(p)) continue;
    writeFileSafely(full, p, demo.read(p)!);
    copied.push(p);
  }
  return copied;
}

// ---------------------------------------------------------------- campaigns

export interface Campaign {
  campaignId: string;
  playerNation: string;
  nationName: string;
  ironman: boolean;
  options: CampaignOptions;
  /** The newest ironman save this device knows, the parent of the next one. */
  ironmanHead?: string;
  /** A save that failed the hash check was opened in this campaign. */
  modified: boolean;
  playSeconds: number;
  /** The player played on as another realm after game over (D-SAVE-1). */
  switchedCountry?: boolean;
  /** The campaign began as the tutorial (D-SAVE-1). */
  beganAsTutorial?: boolean;
  /** The app that writes its saves; full when not given (D-SAVE-13). */
  app?: AppTier;
}

export const DEFAULT_OPTIONS: CampaignOptions = { difficulty: "normal", events: "historical", endDate: "1939-08-31" };

/** 16 hex digits from the game's own Rng. */
export function randomId(rng: Rng): string {
  return hex32(rng.nextU32()) + hex32(rng.nextU32());
}

/** One new game is one campaign with a random id (SAVE-012); ironman is chosen here and kept (SAVE-086). */
export function newCampaign(rng: Rng, init: { playerNation: string; nationName: string; ironman?: boolean; options?: CampaignOptions }): Campaign {
  return {
    campaignId: randomId(rng),
    playerNation: init.playerNation,
    nationName: init.nationName,
    ironman: init.ironman ?? false,
    options: init.options ?? DEFAULT_OPTIONS,
    modified: false,
    playSeconds: 0,
  };
}

/** Ironman cannot be turned on or off once the campaign has begun. */
export function canChangeIronman(_campaign: Campaign): false {
  return false;
}

export type CampaignAction = "manual save" | "load an earlier point" | "console" | "export" | "import";

/** What ironman forbids (SAVE-087) and still allows (SAVE-088). */
export function allowed(campaign: Campaign, action: CampaignAction): boolean {
  if (!campaign.ironman) return true;
  if (action === "export") return C.ironman.allow_export;
  return action === "import";
}

// ---------------------------------------------------------------- dates and names

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "May 1492". */
export function longDate(d: { y: number; m: number }): string {
  return `${MONTHS[d.m - 1]} ${d.y}`;
}

/** "Dec 1511", "June 1530": month names over five letters are cut to three, as the design's messages write them. */
export function shortDate(d: { y: number; m: number }): string {
  const name = MONTHS[d.m - 1]!;
  return `${name.length > 5 ? name.slice(0, 3) : name} ${d.y}`;
}

/** The default name of a new manual save: nation and date (SAVE-018). */
export function defaultSaveName(nationName: string, d: { y: number; m: number }): string {
  return `${nationName}, ${longDate(d)}`;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}

// ---------------------------------------------------------------- free tier

/** Whether a nation needs the full game (free mobile tier: the Ottomans and France are free). */
export function needsFullGame(nation: string): boolean {
  return !C.free_tier.free_nations.includes(nation);
}

// ---------------------------------------------------------------- writing saves

/** What a device knows about itself when it saves. */
export interface SaveContext {
  storage: SaveStorage;
  rules: Ruleset;
  rng: Rng;
  device: string;
  platform: Platform;
  gameVersion: string;
  /** The caller's clock, in ms. */
  now: number;
}

export interface WriteOptions {
  name?: string;
  /** Orders queued so far; kept only in a Resume save (SAVE-044). */
  orders?: readonly Order[];
  /** Manual save picked to save over (after "Replace?"). */
  replace?: string;
  /** Autosaves kept per campaign (1, 3 or 5). */
  keep?: number;
  events?: SavedGame["events"];
  history?: unknown[];
  /** Chunks of systems that keep their own state (diplomacy, religion …), each with its own version. */
  systemChunks?: readonly RawChunk[];
  /** A fixed save id instead of a random one (tests and tools). */
  saveId?: string;
}

export interface Written {
  header: SaveHeader;
  path: string;
  bytes: Uint8Array;
  removed: string[];
  steps: string[];
  /** "Saved." for saves the player sees being made. */
  toast?: string;
}

export interface SaveEntry {
  path: string;
  header: SaveHeader;
}

/** Every save in storage with its header, read without decompressing a chunk. */
export function entries(storage: SaveStorage): SaveEntry[] {
  const out: SaveEntry[] = [];
  for (const path of storage.list()) {
    try {
      out.push({ path, header: readHeader(storage.read(path)!) });
    } catch {
      // A file whose header cannot be read is not listed.
    }
  }
  return out;
}

/**
 * The Load list's reads (SAVE-036): for each file only its first bytes, up to
 * the end of the header; nothing past it is read or decompressed.
 */
export function readListing(paths: readonly string[], readRange: (path: string, start: number, end: number) => Uint8Array): SaveEntry[] {
  const out: SaveEntry[] = [];
  for (const path of paths) {
    try {
      const span = headerSpan(readRange(path, 0, 10));
      out.push({ path, header: readHeader(readRange(path, 0, span)) });
    } catch {
      // Not listed.
    }
  }
  return out;
}

const newestFirst = (a: SaveEntry, b: SaveEntry) => b.header.savedAt - a.header.savedAt || b.header.turn - a.header.turn;

/** `<campaignId>/<savedAt>-<saveId>.phsave` (SAVE-053). */
export function fileName(h: Pick<SaveHeader, "campaignId" | "savedAt" | "saveId">): string {
  return `${h.campaignId}/${h.savedAt}-${h.saveId}${C.format.extension}`;
}

/** The header and bytes for a save of `world`, without writing it. */
export function buildSave(ctx: SaveContext, campaign: Campaign, world: World, kind: SaveKind, opts: WriteOptions = {}): { header: SaveHeader; bytes: Uint8Array } {
  const game: SavedGame = { playerNation: campaign.playerNation, options: campaign.options };
  if (kind === "resume" && opts.orders) game.orders = opts.orders;
  if (opts.events) game.events = opts.events;
  if (opts.history) game.history = opts.history;
  const chunks = [...worldChunks(world, game), ...(opts.systemChunks ?? [])];
  const date = { y: world.date.year, m: world.date.month };
  const header: SaveHeader = {
    saveId: opts.saveId ?? randomId(ctx.rng),
    campaignId: campaign.campaignId,
    kind,
    name: opts.name ?? (kind === "autosave" ? "Auto" : defaultSaveName(campaign.nationName, date)),
    savedAt: ctx.now,
    device: ctx.device,
    platform: ctx.platform,
    gameVersion: ctx.gameVersion,
    formatVersion: FORMAT_VERSION,
    rulesHash: rulesHash(ctx.rules),
    mapHash: mapHash(ctx.rules),
    turn: world.turn,
    date,
    playerNation: campaign.playerNation,
    ironman: campaign.ironman,
    playSeconds: campaign.playSeconds,
    options: campaign.options,
    tier: { nation: campaign.playerNation, needsFullGame: needsFullGame(campaign.playerNation), app: campaign.app ?? "full" },
    flags: saveFlags(campaign),
    worldHash: hashWorld(restoreWorld(new Map(chunks.map((c) => [c.id, c])), world.rules, {}, world.tiles).world),
    thumbnail: thumbnail(world, campaign.playerNation),
    modified: campaign.modified,
    start: START_ID,
  };
  if (kind === "ironman" && campaign.ironmanHead) header.parent = campaign.ironmanHead;
  return { header, bytes: encodeSave(header, chunks) };
}

/** Saves a campaign may hold of a kind (INV-SAVE-1). */
function keepOf(kind: SaveKind, opts: WriteOptions): number {
  if (kind === "resume") return C.kinds.resume.keep;
  if (kind === "ironman") return C.kinds.ironman.keep;
  if (kind === "autosave") return opts.keep ?? C.kinds.autosave.keep;
  return Infinity;
}

/**
 * Writes a save of `kind` and then rotates out what it replaces: the oldest
 * Resume, Ironman or autosave beyond the number kept, or the manual save
 * picked to save over. Throws NoSpaceError with the player's message when the
 * device is full; existing saves are then untouched.
 */
export function writeSave(ctx: SaveContext, campaign: Campaign, world: World, kind: SaveKind, opts: WriteOptions = {}): Written {
  if (kind === "manual" && !allowed(campaign, "manual save")) throw new Error("ironman campaigns have no manual saves");
  if (kind === "autosave" && campaign.ironman) throw new Error("ironman campaigns have no autosaves");
  if (kind === "ironman" && !campaign.ironman) throw new Error("not an ironman campaign");
  const { header, bytes } = buildSave(ctx, campaign, world, kind, opts);
  const path = fileName(header);
  const same = entries(ctx.storage)
    .filter((e) => e.header.campaignId === campaign.campaignId && e.header.kind === kind)
    .sort(newestFirst);
  const keep = keepOf(kind, opts);
  const replaces = kind === "manual" ? (opts.replace ? [opts.replace] : []) : same.slice(Math.max(0, keep - 1)).map((e) => e.path);
  const steps = ["serialised and compressed in the worker", ...writeFileSafely(ctx.storage, path, bytes, replaces)];
  if (kind === "ironman") campaign.ironmanHead = header.saveId;
  const out: Written = { header, path, bytes, removed: replaces, steps };
  if (kind === "manual") out.toast = M.saved;
  return out;
}

/** Writes a save, or returns the no-space message without touching existing saves (SAVE-023). */
export function trySave(ctx: SaveContext, campaign: Campaign, world: World, kind: SaveKind, opts: WriteOptions = {}): Written | { error: string } {
  try {
    return writeSave(ctx, campaign, world, kind, opts);
  } catch (e) {
    if (e instanceof NoSpaceError) return { error: M.no_space };
    throw e;
  }
}

// ---------------------------------------------------------------- autosaves

/** The autosave interval as the settings offer it: every 1, 6 or 12 months, or off (X-18: monthly at most). */
export type AutosaveInterval = 1 | 6 | 12 | "off";

export interface AutosaveOptions {
  interval: AutosaveInterval;
  keep: 1 | 3 | 5;
}

export const AUTOSAVE_DEFAULTS: AutosaveOptions = {
  interval: C.kinds.autosave.interval_months as AutosaveInterval,
  keep: C.kinds.autosave.keep as 1 | 3 | 5,
};

/** Offered intervals and counts, in the words of the design (SAVE-015). */
export function autosaveChoices(): { intervals: string[]; counts: number[] } {
  const labels = C.kinds.autosave.interval_labels as Record<string, string>;
  return { intervals: C.kinds.autosave.interval_options.map((o) => labels[String(o)]!), counts: [...C.kinds.autosave.keep_options] };
}

/**
 * Whether a turn writes an autosave at its start (SAVE-008, SAVE-100):
 * `monthBegins` is the month that begins in the turn, or null when none does
 * (X-18: the rotating autosave stays monthly, so a turn that begins no month
 * writes none). Every 12 months means each January, every 6 months January
 * and July (D-SAVE-9). Off and ironman never autosave.
 */
export function autosaveDue(interval: AutosaveInterval, monthBegins: number | null, ironman = false): boolean {
  if (ironman || interval === "off" || monthBegins === null) return false;
  const month = monthBegins;
  if (interval === 1) return true;
  if (interval === 12) return month === C.kinds.autosave.every_12_month;
  return C.kinds.autosave.every_6_months.includes(month);
}

// ---------------------------------------------------------------- Continue and the Load screen

/** The newest Resume or Ironman save across all campaigns, and the Continue label (SAVE-014). */
export function continueTarget(all: readonly SaveEntry[], thisDevice: string, nationName: (id: string) => string): { entry: SaveEntry; label: string } | undefined {
  const entry = all.filter((e) => e.header.kind === "resume" || e.header.kind === "ironman").sort(newestFirst)[0];
  if (!entry) return undefined;
  const h = entry.header;
  const values = { nation: nationName(h.playerNation), date: longDate(h.date), device: h.device };
  return { entry, label: fill(h.device === thisDevice ? M.continue : M.continue_from, values) };
}

export interface CampaignCard {
  campaignId: string;
  nation: string;
  nationName: string;
  date: { y: number; m: number };
  turn: number;
  playSeconds: number;
  thumbnail: string;
  ironman: boolean;
  /** The saves the player can load, newest first; Resume saves are not listed. */
  saves: SaveEntry[];
}

/** The Load screen: campaigns first, newest first; each lists its saves newest first (SAVE-013). */
export function loadList(all: readonly SaveEntry[], nationName: (id: string) => string): CampaignCard[] {
  const byCampaign = new Map<string, SaveEntry[]>();
  for (const e of [...all].sort(newestFirst)) {
    const list = byCampaign.get(e.header.campaignId) ?? [];
    list.push(e);
    byCampaign.set(e.header.campaignId, list);
  }
  return [...byCampaign.values()].map((list) => {
    const h = list[0]!.header;
    const ironman = h.ironman;
    // An ironman campaign is listed as the campaign itself: only its newest save.
    const saves = ironman ? list.filter((e) => e.header.kind === "ironman").slice(0, 1) : list.filter((e) => e.header.kind !== "resume");
    return {
      campaignId: h.campaignId,
      nation: h.playerNation,
      nationName: nationName(h.playerNation),
      date: h.date,
      turn: h.turn,
      playSeconds: h.playSeconds,
      thumbnail: h.thumbnail,
      ironman,
      saves,
    };
  });
}

// ---------------------------------------------------------------- saving by hand

/** The Save panel: "New save" at the top, the campaign's manual saves under it (SAVE-017). */
export function saveSlots(all: readonly SaveEntry[], campaignId: string): string[] {
  return [M.new_save, ...all.filter((e) => e.header.campaignId === campaignId && e.header.kind === "manual").sort(newestFirst).map((e) => e.header.name)];
}

export type NewSaveAnswer =
  | { action: "write"; name: string }
  | { action: "choose a save to replace"; choices: SaveEntry[] }
  | { action: "not allowed" };

/**
 * The player picked "New save": write with the default name, or, at a limit
 * (20 per campaign, 100 in all), ask which save to replace; never remove one
 * silently (SAVE-009, SAVE-020).
 */
export function newManualSave(all: readonly SaveEntry[], campaign: Campaign, date: { y: number; m: number }): NewSaveAnswer {
  if (!allowed(campaign, "manual save")) return { action: "not allowed" };
  const manual = all.filter((e) => e.header.kind === "manual");
  const mine = manual.filter((e) => e.header.campaignId === campaign.campaignId);
  if (mine.length >= C.kinds.manual.max_per_campaign) return { action: "choose a save to replace", choices: mine.sort(newestFirst) };
  if (manual.length >= C.kinds.manual.max_total) return { action: "choose a save to replace", choices: manual.sort(newestFirst) };
  return { action: "write", name: defaultSaveName(campaign.nationName, date) };
}

/** Saving over a manual save asks "Replace?" first (SAVE-019). */
export function replaceQuestion(): string {
  return M.replace;
}

/** Deleting a save needs the player's confirmation (SAVE-021). */
export function deleteSave(storage: SaveStorage, path: string, confirmed: boolean): { ask: "confirm" } | { removed: string } {
  if (!confirmed) return { ask: "confirm" };
  storage.remove(path);
  return { removed: path };
}

/** Deleting a campaign removes all its saves locally (the cloud side tombstones them, SAVE-056). */
export function deleteCampaign(storage: SaveStorage, campaignId: string): string[] {
  const gone = entries(storage).filter((e) => e.header.campaignId === campaignId).map((e) => e.path);
  for (const p of gone) storage.remove(p);
  return gone;
}

// ---------------------------------------------------------------- export and import

/** Export: a `.phsave` file through the share sheet on phones or a save dialog on desktop, no limit (SAVE-011, SAVE-078). */
export function exportSave(platform: Platform, entry: SaveEntry, bytes: Uint8Array): { fileName: string; via: string; bytes: Uint8Array } {
  const via = (C.export as Record<string, string>)[platform] ?? C.export.desktop;
  return { fileName: `${entry.header.name}${C.format.extension}`, via, bytes: bytes.slice() };
}

// ---------------------------------------------------------------- the orders journal

/** Orders queued since the turn began, tied to the Resume save they follow (INV-SAVE-11). */
export interface OrdersJournal {
  campaignId: string;
  turn: number;
  resumeHash: string;
  orders: Order[];
  /** Choices made at before-the-battle stops, by day (D-SAVE-10). */
  choices?: { day: number; choice: string }[];
}

/** The hash a journal names its Resume save by. */
export function saveHash(bytes: Uint8Array): string {
  return hex32(crc32(bytes));
}

export function makeJournal(resume: { header: SaveHeader; bytes: Uint8Array }, orders: readonly Order[]): OrdersJournal {
  return { campaignId: resume.header.campaignId, turn: resume.header.turn, resumeHash: saveHash(resume.bytes), orders: orders.map((o) => ({ ...o })) };
}

/** A journal whose turn or Resume hash does not match is ignored (SAVE-028). */
export function journalApplies(journal: Pick<OrdersJournal, "turn" | "resumeHash">, resume: { turn: number; hash: string }): boolean {
  return journal.turn === resume.turn && journal.resumeHash === resume.hash;
}

export type Lifecycle = "end_turn" | "pause" | "quit" | "exit_to_menu" | "suspend" | "background" | "safety_timer";

/**
 * What a lifecycle moment writes (save-system §3.1, §3.2, §5.2): the journal
 * on pause, quit, suspend and background, and every 30 s while orders change;
 * nothing new while a turn is being processed; never an upload on background.
 */
export function lifecycleWrites(moment: Lifecycle, state: { turnRunning: boolean; ordersChanged: boolean }): string[] {
  if (state.turnRunning) return [];
  if (moment === "end_turn") return ["resume save for the new turn, in the worker", "clear the journal", "queue the upload"];
  if (moment === "safety_timer") return state.ordersChanged ? ["orders journal"] : [];
  return (C.orders_journal.write_on as string[]).includes(moment) ? ["orders journal"] : [];
}

/** The journal's safety-net interval, in seconds. */
export const JOURNAL_SAFETY_SECONDS = C.orders_journal.safety_interval_seconds;

/** The lifecycle moment a platform event stands for (SAVE-029), or undefined. */
export function platformMoment(platform: string, event: string): Lifecycle | undefined {
  const table = (C.platform_events as Record<string, Record<string, string>>)[platform];
  return table?.[event] as Lifecycle | undefined;
}

/** On desktop, quitting waits for the write, up to 2 s (SAVE-031). */
export function desktopQuitSeconds(writeSeconds: number): number {
  return Math.min(writeSeconds, C.desktop_quit_wait_seconds);
}

// ---------------------------------------------------------------- loading

export interface OpenOptions {
  rules: Ruleset;
  /** The full game is unlocked on this device. */
  fullGame: boolean;
  /** The player saw the hash warning and chose to open the save anyway. */
  acceptModified?: boolean;
  buildFormatVersion?: number;
  migrations?: readonly Migration[];
  tables?: MappingTables;
  /** The map's tiles, as the world was made with (createWorld). */
  tiles?: TileGrid;
}

export type Opened = {
  kind: "opened";
  world: ReturnType<typeof restoreWorld>["world"];
  game: ReturnType<typeof restoreWorld>["game"];
  header: SaveHeader;
  warnings: string[];
  migrationsRun: string[];
  /** The mapping step ran because rules or map differ. */
  mapped: boolean;
  defaulted: string[];
  /** hashWorld() of the loaded world. */
  loadedHash: string;
};

export type OpenResult =
  | Opened
  | { kind: "rejected"; problem: "damaged" | "wrong-magic" | "newer-version" | "other-start"; message: string }
  | { kind: "locked"; nation: string; message: string }
  | { kind: "hash warning"; message: string }
  | { kind: "refused"; reason: "ironman save failed the hash check" };

/** The start a save's campaign began from (SAVE-111): saves from before the 1378 switch began in 1444. */
export const saveStart = (header: Pick<SaveHeader, "start">): string => header.start ?? CHECKPOINT_START;

/**
 * Opens a save (SaveLoader): CRCs, format version, the nation lock, format
 * migrations, the mapping step when rules or map differ, validation, and the
 * recomputed worldHash.
 */
export function openSave(bytes: Uint8Array, opts: OpenOptions, nationName: (id: string) => string = (id) => id): OpenResult {
  let decoded;
  try {
    decoded = decodeSave(bytes);
  } catch (e) {
    if (e instanceof SaveError) return { kind: "rejected", problem: e.problem, message: e.problem === "damaged" ? "This save is damaged." : e.message };
    throw e;
  }
  const header = { ...decoded.header };
  const buildVersion = opts.buildFormatVersion ?? FORMAT_VERSION;
  if (header.formatVersion > buildVersion) return { kind: "rejected", problem: "newer-version", message: M.newer_version };
  // A campaign plays on in the world it began in (SAVE-111): the client reopens in that start first.
  if (saveStart(header) !== START_ID) return { kind: "rejected", problem: "other-start", message: `This campaign began in ${saveStart(header)}.` };
  if (header.tier.needsFullGame && !opts.fullGame) {
    return { kind: "locked", nation: header.tier.nation, message: fill(M.locked_nation, { nation: nationName(header.tier.nation) }) };
  }
  const { chunks, ran } = migrate(decoded.chunks, header.formatVersion, buildVersion, opts.migrations);
  const problems = validateChunks(chunks);
  if (problems.length) return { kind: "rejected", problem: "damaged", message: "This save is damaged." };
  const mapped = header.rulesHash !== rulesHash(opts.rules) || header.mapHash !== mapHash(opts.rules);
  const restored = restoreWorld(chunks, opts.rules, mapped ? (opts.tables ?? {}) : {}, opts.tiles);
  const loadedHash = hashWorld(restored.world);
  if (!mapped && C.integrity.verify_world_hash && loadedHash !== header.worldHash) {
    if (header.ironman) return { kind: "refused", reason: "ironman save failed the hash check" };
    if (!opts.acceptModified) return { kind: "hash warning", message: "This save does not match its check and may have been edited." };
    header.modified = true;
  }
  return { kind: "opened", world: restored.world, game: restored.game, header, warnings: restored.warnings, migrationsRun: ran, mapped, defaulted: restored.defaulted, loadedHash };
}

/**
 * Continue: opens the newest Resume (or Ironman) save of a campaign, falling
 * back to the one before if the newest is damaged, and says so (SAVE-033,
 * SAVE-091, SAVE-096). The orders journal goes back in the queue if it matches.
 */
export function continueCampaign(
  storage: SaveStorage,
  campaignId: string,
  opts: OpenOptions,
  journal?: OrdersJournal,
): { opened: Opened; orders: Order[]; journal: "applied" | "ignored" | "none"; message?: string; path: string } | { error: string } {
  const candidates = entries(storage)
    .filter((e) => e.header.campaignId === campaignId && (e.header.kind === "resume" || e.header.kind === "ironman"))
    .sort(newestFirst);
  const unreadable = storage
    .list()
    .filter((p) => p.startsWith(`${campaignId}/`) && !candidates.some((c) => c.path === p));
  let damaged = unreadable.length > 0;
  for (const c of candidates) {
    const bytes = storage.read(c.path)!;
    const r = openSave(bytes, opts);
    if (r.kind === "rejected" && r.problem === "damaged") {
      damaged = true;
      continue;
    }
    if (r.kind !== "opened") return { error: "message" in r ? r.message : r.reason };
    let orders = [...r.game.orders];
    let used: "applied" | "ignored" | "none" = "none";
    if (journal) {
      used = journalApplies(journal, { turn: r.header.turn, hash: saveHash(bytes) }) ? "applied" : "ignored";
      if (used === "applied") orders = journal.orders.map((o) => ({ ...o }));
    }
    const out: { opened: Opened; orders: Order[]; journal: typeof used; message?: string; path: string } = { opened: r, orders, journal: used, path: c.path };
    if (damaged) out.message = fill(M.damaged_fallback, { date: shortDate(r.header.date) });
    return out;
  }
  return { error: "This save is damaged." };
}

/**
 * Import (SAVE-079, SAVE-088): checks magic, CRCs and worldHash, then adds the
 * file as a new Manual save; an ironman save instead starts on this device as
 * the newest of its line, following the imported one.
 */
export function importSave(ctx: SaveContext, bytes: Uint8Array, online = true): { kind: "imported"; entry: SaveEntry } | { kind: "rejected"; message: string } {
  // An ironman save is imported only online, so the head check runs (D-SAVE-15, SAVE-102).
  if (!online && readHeader(bytes).kind === "ironman") return { kind: "rejected", message: M.ironman_import_offline };
  // The nation lock is checked when the imported save is opened, like any other.
  const r = openSave(bytes, { rules: ctx.rules, fullGame: true });
  if (r.kind === "rejected") return { kind: "rejected", message: r.message };
  if (r.kind !== "opened") return { kind: "rejected", message: "message" in r ? r.message : r.reason };
  const decoded = decodeSave(bytes);
  const header: SaveHeader = { ...decoded.header, saveId: randomId(ctx.rng), savedAt: ctx.now, device: ctx.device, platform: ctx.platform };
  if (header.kind === "ironman") header.parent = decoded.header.saveId;
  else header.kind = "manual";
  const out = encodeSave(header, [...decoded.chunks.values()]);
  const path = fileName(header);
  writeFileSafely(ctx.storage, path, out);
  return { kind: "imported", entry: { path, header } };
}

// ---------------------------------------------------------------- ironman lines

/** The one question when an ironman line split between two devices (SAVE-090). */
export function ironmanSplitQuestion(
  a: { device: string; date: { y: number; m: number }; turn: number },
  b: { device: string; date: { y: number; m: number }; turn: number },
): { question: string; recommended: "a" | "b" } {
  const question = fill(M.ironman_split, { a: a.device, a_date: shortDate(a.date), b: b.device, b_date: shortDate(b.date) });
  return { question, recommended: a.turn >= b.turn ? "a" : "b" };
}

/** The player picked one line: the other line's saves are removed. */
export function keepIronmanLine(storage: SaveStorage, campaignId: string, keepDevice: string): string[] {
  const gone = entries(storage)
    .filter((e) => e.header.campaignId === campaignId && e.header.kind === "ironman" && e.header.device !== keepDevice)
    .map((e) => e.path);
  for (const p of gone) storage.remove(p);
  return gone;
}

// ---------------------------------------------------------------- bug reports

/**
 * Send a report (SAVE-097): the campaign's Resume save and the orders journal,
 * only when the player chose to send it.
 */
export function bugReport(storage: SaveStorage, campaignId: string, journal: OrdersJournal | undefined, playerChose: boolean): { resume: Uint8Array; journal: OrdersJournal | undefined } | undefined {
  if (!playerChose) return undefined;
  const resume = entries(storage)
    .filter((e) => e.header.campaignId === campaignId && e.header.kind === "resume")
    .sort(newestFirst)[0];
  if (!resume) return undefined;
  return { resume: storage.read(resume.path)!.slice(), journal: journal && { ...journal, orders: journal.orders.map((o) => ({ ...o })) } };
}

/** Whether an ironman campaign writes its save at a moment (SAVE-010: after every End turn and on every exit). */
export function ironmanWrites(moment: Lifecycle): boolean {
  return (C.kinds.ironman.write_on as string[]).includes(moment);
}

/** The header flags achievements reads (X-16, D-SAVE-1). */
export function saveFlags(c: Campaign): SaveFlags {
  return {
    ironman_unbroken: c.ironman && !c.modified,
    cheat_marked: c.modified,
    switched_country: c.switchedCountry ?? false,
    began_as_tutorial: c.beganAsTutorial ?? false,
  };
}

/**
 * "Restore the last autosave" on the failure screen (D-SAVE-3, SAVE-101): the
 * campaign's Resume save, or its newest rotating autosave when every Resume
 * save is damaged.
 */
export function restoreLastAutosave(storage: SaveStorage, campaignId: string, opts: OpenOptions): { opened: Opened; path: string; kind: SaveKind } | { error: string } {
  const mine = entries(storage).filter((e) => e.header.campaignId === campaignId).sort(newestFirst);
  for (const kind of ["resume", "autosave"] as const) {
    for (const e of mine.filter((x) => x.header.kind === kind)) {
      const r = openSave(storage.read(e.path)!, opts);
      if (r.kind === "opened") return { opened: r, path: e.path, kind };
    }
  }
  return { error: "This save is damaged." };
}

/** A choice made at a before-the-battle stop goes into the orders journal with its day (D-SAVE-10, SAVE-103). */
export function journalChoice(journal: OrdersJournal, day: number, choice: string): OrdersJournal {
  return { ...journal, choices: [...(journal.choices ?? []), { day, choice }] };
}

/** The files beside the saves that ride the account sync (D-SAVE-6, SAVE-104). */
export function syncedFiles(): string[] {
  return [...C.cloud.synced_files];
}

/** Whether a lifecycle moment writes the Resume save (SAVE-007): never on backgrounding (D-SAVE-2). */
export function resumeWrites(moment: Lifecycle): boolean {
  return (C.kinds.resume.write_on as string[]).includes(moment);
}
