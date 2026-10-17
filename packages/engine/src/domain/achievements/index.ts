import config from "../../../../rules/data/domain/achievements.json" with { type: "json" };
import { runTurnPlan, type SystemStep, type TurnLogEntry, type TurnPlan } from "../time-and-turns/index.ts";

/**
 * Achievements (domain/achievements/spec.md): the list and its limits, when
 * tests run, which campaigns may earn, campaign and lifetime counters,
 * progress reported each store's way, the offline unlock queue and catch-up,
 * the free tier and the Steam demo, store ids, icons and the in-game toast,
 * filter and turn report line. The list lives in
 * rules/data/domain/achievements.json (from achievements.yaml). Nothing here
 * changes the simulation: an unlock gives nothing inside the game (ACH-001).
 */

export type AchievementsConfig = typeof config;
export const achievementsConfig: AchievementsConfig = config;

export type Tier = "copper" | "silver" | "gold" | "crown";
export type Scope = "campaign" | "lifetime";
export type Store = "Steam" | "Game Center" | "Google Play";
export const STORES: readonly Store[] = ["Steam", "Game Center", "Google Play"];
export type TestValue = string | number | boolean | { [k: string]: TestValue };
export type Test = Record<string, TestValue>;

export interface AchievementDefinition {
  id: string;
  name: string;
  text: string;
  category: string;
  tier: Tier;
  hidden?: boolean;
  scope: Scope;
  moment: string;
  test: Test;
  progress?: { stat: string; target: number | string };
  full_game?: boolean;
  refs: string[];
}

/** The launch list, in the YAML's order. */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = config.achievements as unknown as AchievementDefinition[];
export const MOMENTS: readonly string[] = config.moments;
export const TIERS = config.tiers as Record<Tier, number>;
export const LIMITS = config.limits;

export function definition(id: string, list: readonly AchievementDefinition[] = ACHIEVEMENTS): AchievementDefinition {
  const d = list.find((a) => a.id === id);
  if (!d) throw new Error(`Unknown achievement ${id}`);
  return d;
}

/** Points of a tier: copper 5, silver 10, gold 20, crown 40, the same on Game Center and Google Play (ACH-009). */
export function pointsOf(d: Pick<AchievementDefinition, "tier">): number {
  return TIERS[d.tier];
}

export function totalPoints(list: readonly Pick<AchievementDefinition, "tier">[]): number {
  return list.reduce((n, d) => n + pointsOf(d), 0);
}

// ---------------------------------------------------------------- list rules (ACH-008..013)

/** Problems with a list against the store limits and the field lengths; empty when it passes. */
export function checkList(list: readonly Pick<AchievementDefinition, "id" | "name" | "text" | "tier">[]): string[] {
  const out: string[] = [];
  if (list.length > LIMITS.max_achievements) out.push(`${list.length} achievements, more than ${LIMITS.max_achievements}`);
  const total = totalPoints(list);
  if (total > LIMITS.max_points_total) out.push(`${total} points, more than ${LIMITS.max_points_total}`);
  const ids = new Set<string>();
  for (const d of list) {
    const p = pointsOf(d);
    if (p % LIMITS.points_multiple !== 0 || p > LIMITS.max_points_each) out.push(`${d.id}: ${p} points`);
    if (d.name.length > LIMITS.name_max) out.push(`${d.id}: name longer than ${LIMITS.name_max}`);
    if (d.text.length > LIMITS.text_max) out.push(`${d.id}: text longer than ${LIMITS.text_max}`);
    if (ids.has(d.id)) out.push(`${d.id}: duplicate id`);
    ids.add(d.id);
  }
  return out;
}

/** What is left for updates: slots and points under the caps. */
export function reserve(count: number, points: number): { slots: number; points: number } {
  return { slots: LIMITS.max_achievements - count, points: LIMITS.max_points_total - points };
}

/** An update must leave at least 10 slots and 100 points in reserve (ACH-012). */
export function checkUpdate(before: { count: number; points: number }, added: { count: number; points: number }): { ok: boolean; slots: number; points: number } {
  const r = reserve(before.count + added.count, before.points + added.points);
  return { ok: r.slots >= LIMITS.reserve_slots_min && r.points >= LIMITS.reserve_points_min, ...r };
}

/** Every value a test names, flattened (for the "no country", "no harm" checks, ACH-004, ACH-005). */
export function testValues(t: Test): string[] {
  const out: string[] = [];
  const walk = (v: TestValue): void => {
    if (typeof v === "object") Object.values(v).forEach(walk);
    else out.push(String(v));
  };
  Object.values(t).forEach(walk);
  return out;
}

/** Achievements whose test names a region or area (`region:` / `area:`). */
export function regionNamingRows(list: readonly AchievementDefinition[] = ACHIEVEMENTS): string[] {
  return list.filter((d) => testValues(d.test).some((v) => /^(region|area):/.test(v))).map((d) => d.id);
}

/** Rows whose test reads one of the given events. */
export function rowsReadingEvents(events: readonly string[], list: readonly AchievementDefinition[] = ACHIEVEMENTS): string[] {
  const set = new Set(events);
  return list.filter((d) => testValues(d.test).some((v) => set.has(v))).map((d) => d.id);
}

export const NARRATIVE_ONLY_EVENTS: readonly string[] = config.narrative_only_events;

// ---------------------------------------------------------------- tests

/** What the game tells a test: final values of the stats it reads, and the moment's details. */
export type Facts = Record<string, unknown>;

const ERA_LADDER = config.era_ladder;
const HARVEST_LADDER = config.harvest_ladder;
const num = (v: unknown): number => (typeof v === "number" ? v : Number.NaN);

/** Does one key of a test hold? Keys read the facts the way the YAML writes them. */
function keyHolds(key: string, want: TestValue, f: Facts): boolean {
  switch (key) {
    case "date":
      return f.date === want;
    case "before":
      return typeof f.date === "string" && f.date < String(want);
    case "event_role": {
      const w = want as { event: string; role: string };
      const roles = (f.event_roles ?? []) as { event: string; role: string }[];
      return roles.some((r) => r.event === w.event && (w.role === "any" || r.role === w.role));
    }
    case "owns":
    case "owns_all":
      return ((f[key] ?? []) as string[]).includes(String(want));
    case "invention_era_min":
      return ERA_LADDER.indexOf(String(f.invention_era)) >= ERA_LADDER.indexOf(String(want)) && ERA_LADDER.includes(String(f.invention_era));
    case "capital_harvest_at_least":
      return HARVEST_LADDER.includes(String(f.capital_harvest)) && HARVEST_LADDER.indexOf(String(f.capital_harvest)) >= HARVEST_LADDER.indexOf(String(want));
  }
  if (key.endsWith("_not")) return key.slice(0, -4) in f && f[key.slice(0, -4)] !== want;
  if (key.endsWith("_min")) return num(f[key.slice(0, -4)]) >= num(want);
  if (key.endsWith("_max")) return num(f[key.slice(0, -4)]) <= num(want);
  // A bare count is reached at that number; a bare 0 means none at all.
  if (typeof want === "number") return want === 0 ? f[key] === 0 : num(f[key]) >= want;
  return f[key] === want;
}

/** A test holds when every one of its keys holds. */
export function testHolds(t: Test, f: Facts): boolean {
  return Object.entries(t).every(([k, v]) => keyHolds(k, v, f));
}

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Facts under which a test just holds: each count exactly at its threshold. */
export function factsMeeting(t: Test): Facts {
  const f: Facts = {};
  for (const [key, want] of Object.entries(t)) {
    if (key === "date") f.date = want;
    else if (key === "before") f.date ??= dayBefore(String(want));
    else if (key === "event_role") f.event_roles = [want];
    else if (key === "owns" || key === "owns_all") f[key] = [want];
    else if (key === "invention_era_min") f.invention_era = want;
    else if (key === "capital_harvest_at_least") f.capital_harvest = want;
    else if (key.endsWith("_not")) f[key.slice(0, -4)] = `not ${String(want)}`;
    else if (key.endsWith("_min") || key.endsWith("_max")) f[key.slice(0, -4)] = want;
    else f[key] = want;
  }
  return f;
}

// ---------------------------------------------------------------- eligibility (ACH-034..043)

export type Flag = "ironman_unbroken" | "cheat_marked" | "switched_country";
export type Cheat = "debug" | "editor" | "free play";
export type App = "full" | "free_ios" | "free_android" | "steam_demo";

/** What one campaign carries in its save. */
export interface CampaignAchievements {
  flags: Record<Flag, boolean>;
  tutorial: boolean;
  difficulty?: string;
  events?: "historical" | "free";
  realm?: string;
  /** Campaign counters for progress rows; reset with each new game (ACH-048). */
  counters: Record<string, number>;
  /** Achievements earned in this campaign, with the date. */
  earned: Record<string, string>;
  /** `date` rows already checked on their day (ACH-032). */
  datesChecked: string[];
  /** Warnings shown before an action that ends eligibility (ACH-043). */
  warned: string[];
}

export function newCampaign(o: { ironman: boolean; tutorial?: boolean; realm?: string; difficulty?: string; events?: "historical" | "free" }): CampaignAchievements {
  const tutorial = o.tutorial ?? false;
  return {
    // The tutorial is never ironman (onboarding), so it earns nothing (ACH-039).
    flags: { ironman_unbroken: o.ironman && !tutorial, cheat_marked: false, switched_country: false },
    tutorial,
    ...(o.difficulty === undefined ? {} : { difficulty: o.difficulty }),
    ...(o.events === undefined ? {} : { events: o.events }),
    ...(o.realm === undefined ? {} : { realm: o.realm }),
    counters: {},
    earned: {},
    datesChecked: [],
    warned: [],
  };
}

/** Eligible: ironman never left, no cheat, still the starting realm; difficulty and events don't matter (ACH-034, ACH-038). */
export function eligible(c: CampaignAchievements): boolean {
  return c.flags.ironman_unbroken && !c.flags.cheat_marked && !c.flags.switched_country && !c.tutorial;
}

export interface EligibilityLost {
  type: "CampaignEligibilityLost";
  flag: Flag;
}

/** Leaving ironman ends it for good (INV-ACH-13). */
export function leaveIronman(c: CampaignAchievements): EligibilityLost {
  c.flags.ironman_unbroken = false;
  return { type: "CampaignEligibilityLost", flag: "ironman_unbroken" };
}

/** Any cheat, used even once, marks the save for good (ACH-036). */
export function useCheat(c: CampaignAchievements, cheat: Cheat): EligibilityLost {
  if (!(config.cheats as string[]).includes(cheat)) throw new Error(`Unknown cheat ${cheat}`);
  c.flags.cheat_marked = true;
  return { type: "CampaignEligibilityLost", flag: "cheat_marked" };
}

/** Playing on as another country after game over stops awards from that moment (ACH-037). */
export function switchCountry(c: CampaignAchievements, country: string): EligibilityLost {
  c.flags.switched_country = true;
  c.realm = country;
  return { type: "CampaignEligibilityLost", flag: "switched_country" };
}

export type EndingAction = "turn on a cheat" | "play on as another country after game over";

/**
 * An action that would end eligibility: the first ask warns and waits; it
 * goes ahead only once the player confirms (ACH-043).
 */
export function askEndingAction(c: CampaignAchievements, action: EndingAction, confirmed: boolean): { warning: string | null; proceeds: boolean } {
  if (!eligible(c)) return { warning: null, proceeds: true };
  if (!confirmed) {
    const first = !c.warned.includes(action);
    if (first) c.warned.push(action);
    return { warning: first ? "Achievements end for this campaign." : null, proceeds: false };
  }
  return { warning: null, proceeds: true };
}

/** The pause menu and the new game screen say whether the campaign can earn (ACH-042). */
export function eligibilityLine(c: CampaignAchievements): "can earn achievements" | "cannot earn achievements" {
  return eligible(c) ? "can earn achievements" : "cannot earn achievements";
}

// ---------------------------------------------------------------- the profile and the stores

export interface StoreState {
  reachable: boolean;
  /** Achievements the store has. */
  unlocked: string[];
  /** Hidden in the store (retired). */
  hidden: string[];
}

export interface Profile {
  app: App;
  /** Every earned achievement, with the date (written before any store call, INV-ACH-10). */
  unlocked: Record<string, string>;
  /** Lifetime counters: distinct things counted across eligible games (ACH-028, ACH-041). */
  lifetime: Record<string, string[]>;
  /** Best value reported per progress stat and store (ACH-049). */
  best: Record<string, Record<Store, number>>;
  /** Unlocks not yet on a store (ACH-052). */
  queue: { id: string; store: Store }[];
  /** The Steam demo's own list (ACH-057). */
  demoList: string[];
  /** Calls made to stores, for the reader. */
  sent: { store: Store; id: string; kind: "unlock" | "progress"; value?: number }[];
}

export function newProfile(app: App = "full"): Profile {
  return { app, unlocked: {}, lifetime: {}, best: {}, queue: [], demoList: [], sent: [] };
}

/** Stores the app talks to: the Steam demo talks to none (ACH-057); a phone build to its own store. */
export function storesOf(app: App): Store[] {
  if (app === "steam_demo") return [];
  if (app === "free_ios") return ["Game Center"];
  if (app === "free_android") return ["Google Play"];
  return [...STORES];
}

export interface AchievementUnlocked {
  type: "AchievementUnlocked";
  id: string;
  tier: Tier;
  date: string;
  place?: string;
}

/**
 * Writes an unlock to the profile at once and queues it for the stores
 * (ACH-051); the Steam demo keeps it in its local list instead (ACH-057).
 * An achievement gives nothing inside the game (ACH-001).
 */
export function recordUnlock(p: Profile, d: AchievementDefinition, date: string, place?: string): AchievementUnlocked {
  if (p.app === "steam_demo") {
    if (!p.demoList.includes(d.id)) p.demoList.push(d.id);
  } else {
    p.unlocked[d.id] ??= date;
    for (const store of storesOf(p.app)) p.queue.push({ id: d.id, store });
  }
  return { type: "AchievementUnlocked", id: d.id, tier: d.tier, date, ...(place === undefined ? {} : { place }) };
}

/** Sends what waits in the queue to every reachable store (ACH-052). */
export function drainQueue(p: Profile, stores: Partial<Record<Store, StoreState>>): string[] {
  const sent: string[] = [];
  p.queue = p.queue.filter((q) => {
    const s = stores[q.store];
    if (!s?.reachable) return true;
    if (!s.unlocked.includes(q.id)) s.unlocked.push(q.id);
    p.sent.push({ store: q.store, id: q.id, kind: "unlock" });
    sent.push(q.id);
    return false;
  });
  return sent;
}

/** Start-up: drain the queue, then send anything the store's list is missing (ACH-052, ACH-053). */
export function startUp(p: Profile, stores: Partial<Record<Store, StoreState>>): string[] {
  const sent = drainQueue(p, stores);
  for (const store of storesOf(p.app)) {
    const s = stores[store];
    if (!s?.reachable) continue;
    for (const id of Object.keys(p.unlocked)) {
      if (s.unlocked.includes(id)) continue;
      s.unlocked.push(id);
      p.sent.push({ store, id, kind: "unlock" });
      sent.push(id);
    }
  }
  return sent;
}

/** Buying the full game: the free download's own profile carries on as it is (ACH-054). */
export function buyFromFreeDownload(p: Profile): Profile {
  return { ...p, app: "full", queue: [...p.queue] };
}

/** Buying after the Steam demo: the full game reads the demo's profile and awards its list (ACH-058). */
export function importDemo(full: Profile, demo: Profile, date: string): AchievementUnlocked[] {
  return demo.demoList.filter((id) => !(id in full.unlocked)).map((id) => recordUnlock(full, definition(id), date));
}

// ---------------------------------------------------------------- running tests (ACH-015, ACH-026..033)

export interface Catalogue {
  list: readonly AchievementDefinition[];
  /** Retired ids: hidden in every store, test off, never deleted (ACH-064). */
  retired: string[];
}

export function launchCatalogue(): Catalogue {
  return { list: ACHIEVEMENTS, retired: [] };
}

export interface Evaluation {
  /** Rows whose test ran. */
  ran: string[];
  unlocked: AchievementUnlocked[];
}

/** Lifetime counters as facts, under their stat names. */
export function lifetimeFacts(p: Profile): Facts {
  return Object.fromEntries(Object.entries(p.lifetime).map(([k, v]) => [k, v.length]));
}

/**
 * A moment occurred: runs only the rows whose `moment` names it (ACH-031), `date`
 * rows only on their day and once (ACH-032), and only in an eligible
 * campaign (ACH-014). Campaign rows read this campaign's facts alone
 * (ACH-027); lifetime rows read the profile's counters (ACH-028).
 */
export function evaluate(cat: Catalogue, c: CampaignAchievements, p: Profile, moment: string, facts: Facts, date: string, place?: string): Evaluation {
  const out: Evaluation = { ran: [], unlocked: [] };
  if (!eligible(c)) return out;
  for (const d of cat.list) {
    if (d.moment !== moment || cat.retired.includes(d.id)) continue;
    if (moment === "date") {
      if (d.test.date !== date || c.datesChecked.includes(d.id)) continue;
      c.datesChecked.push(d.id);
    }
    out.ran.push(d.id);
    if (d.id in c.earned || (d.scope === "lifetime" && d.id in p.unlocked)) continue;
    const f = d.scope === "lifetime" ? { ...facts, ...lifetimeFacts(p) } : { ...facts, date: facts.date ?? date };
    if (!testHolds(d.test, f)) continue;
    c.earned[d.id] = date;
    out.unlocked.push(recordUnlock(p, d, date, place));
  }
  return out;
}

/**
 * Counts a lifetime thing (a realm played 10 years, a non-historical option
 * picked) only for an eligible campaign (ACH-041).
 */
export function countLifetime(p: Profile, c: CampaignAchievements, counter: string, thing: string): number {
  const list = (p.lifetime[counter] ??= []);
  if (eligible(c) && !list.includes(thing)) list.push(thing);
  return list.length;
}

/**
 * The turn's own systems run first, then the achievement tests last of all,
 * so they read final values (ACH-033, time-and-turns TIME-050).
 */
export function runTurnWithTests(plan: Omit<TurnPlan, "achievements">, tests: SystemStep[]): TurnLogEntry[] {
  return runTurnPlan({ ...plan, achievements: tests });
}

// ---------------------------------------------------------------- progress (ACH-044..050)

/** A progress row's numeric target. */
export function targetOf(d: AchievementDefinition): number {
  const t = d.progress?.target;
  if (typeof t !== "number") throw new Error(`${d.id} has no numeric progress target`);
  return t;
}

/** Google Play: an incremental achievement; targets above 10,000 count in steps (people in ten thousands, gold in tens) (ACH-045). */
export function googleSteps(stat: string, target: number, value: number): number {
  const size = target > config.progress.google_steps_above ? ((config.progress.google_step_size as Record<string, number>)[stat] ?? 1) : 1;
  return Math.floor(Math.min(value, target) / size);
}

/** Game Center: percent complete (ACH-046). */
export function gameCenterPercent(target: number, value: number): number {
  return Math.min(100, (value / target) * 100);
}

/** Steam: the progress popups (25, 50, 75 %) crossed going from one value to another (ACH-047). */
export function steamPopups(target: number, from: number, to: number): number[] {
  return config.progress.steam_popups_pct.filter((pct) => from < (target * pct) / 100 && to >= (target * pct) / 100);
}

export interface ProgressReport {
  /** This campaign's own value, shown in the in-game list (ACH-050). */
  inGame: { value: number; target: number };
  /** Stores told, with the value; empty when it did not beat the best already reported (ACH-049). */
  reported: { store: Store; value: number }[];
}

/** A progress counter changed: keep it, and report it to stores only when it beats their best. */
export function progress(p: Profile, c: CampaignAchievements, d: AchievementDefinition, value: number, stores: Partial<Record<Store, StoreState>> = {}): ProgressReport {
  const stat = d.progress?.stat;
  if (!stat) throw new Error(`${d.id} has no progress`);
  const target = targetOf(d);
  c.counters[stat] = value;
  const reported: { store: Store; value: number }[] = [];
  if (eligible(c)) {
    const best = (p.best[stat] ??= { Steam: 0, "Game Center": 0, "Google Play": 0 });
    for (const store of storesOf(p.app)) {
      if (value <= best[store]) continue;
      if (stores[store]?.reachable === false) continue;
      best[store] = value;
      reported.push({ store, value });
      p.sent.push({ store, id: d.id, kind: "progress", value });
    }
  }
  return { inGame: { value, target }, reported };
}

/** A new game: campaign counters start again from nothing (ACH-048). */
export function resetCounters(c: CampaignAchievements): void {
  c.counters = {};
}

// ---------------------------------------------------------------- free tier and demo (ACH-054..058)

/** A row marked `full_game` can't be earned with the free tier's countries alone (ACH-055). */
export function earnableWithFreeCountries(d: AchievementDefinition): boolean {
  return d.full_game !== true;
}

// ---------------------------------------------------------------- store ids and upload (ACH-059..064)

export function steamId(id: string): string {
  return `${config.stores.steam_prefix}${id.toUpperCase()}`;
}

export function gameCenterId(id: string, bundle: string = config.stores.bundle_id): string {
  return `${bundle}${config.stores.game_center_infix}${id}`;
}

/** Google's id comes from its console after upload, kept in achievements.google.json (ACH-062). */
export function googleId(id: string, mapping: Record<string, string>): string | undefined {
  return mapping[id];
}

export const GOOGLE_MAPPING_FILE = config.stores.google_mapping_file;

export interface StoreRow {
  storeId: string | undefined;
  id: string;
  points: number;
  hidden: boolean;
  /** Name and text per language. */
  names: Record<string, { name: string; text: string }>;
}

export type Locales = Record<string, Record<string, { name: string; text: string }>>;

/** The build step: each store's upload rows from the one list, with localised names and texts (ACH-002, ACH-063). */
export function buildStoreLists(cat: Catalogue, locales: Locales = {}, googleMapping: Record<string, string> = {}): Record<Store, { file: string; rows: StoreRow[] }> {
  const rows = (idOf: (id: string) => string | undefined): StoreRow[] =>
    cat.list.map((d) => ({
      storeId: idOf(d.id),
      id: d.id,
      points: pointsOf(d),
      hidden: d.hidden === true || cat.retired.includes(d.id),
      names: { en: { name: d.name, text: d.text }, ...Object.fromEntries(Object.entries(locales).flatMap(([lang, m]) => (m[d.id] ? [[lang, m[d.id]!]] : []))) },
    }));
  const f = config.stores.upload_files;
  return {
    Steam: { file: f.steam, rows: rows(steamId) },
    "Game Center": { file: f.game_center, rows: rows((id) => gameCenterId(id)) },
    "Google Play": { file: f.google_play, rows: rows((id) => googleId(id, googleMapping)) },
  };
}

/** Retiring: hidden in every store, test turned off, never deleted; players keep it (ACH-064). */
export function retire(cat: Catalogue, id: string, stores: Partial<Record<Store, StoreState>> = {}): Catalogue {
  definition(id, cat.list);
  for (const s of Object.values(stores)) if (s && !s.hidden.includes(id)) s.hidden.push(id);
  return { list: cat.list, retired: [...cat.retired, id] };
}

// ---------------------------------------------------------------- hidden rows, icons, in the game

/** A hidden row shows only "Hidden achievement" and its tier until earned (ACH-030). */
export function shownAs(d: AchievementDefinition, earned: boolean): { name: string; text: string | null; tier: Tier } {
  if (d.hidden && !earned) return { name: "Hidden achievement", text: null, tier: d.tier };
  return { name: d.name, text: d.text, tier: d.tier };
}

/** The icon: 32 × 32 in the game's palette with a 2-pixel frame in the tier's colour (ACH-065). */
export function iconOf(tier: Tier): { size: number; frame: number; frameColour: string } {
  return { size: config.icons.size, frame: config.icons.frame, frameColour: (config.icons.frame_colours as Record<Tier, string>)[tier] };
}

/** Export for a store: whole-number nearest-neighbour scaling, no smoothing; Steam also gets a locked image (ACH-066, ACH-067). */
export function iconExport(store: Store): { factor: number; size: number; filter: "nearest"; smoothing: false; locked: string | null } {
  const factor = (config.icons.scale as Record<Store, number>)[store];
  return { factor, size: config.icons.size * factor, filter: "nearest", smoothing: false, locked: store === "Steam" ? config.icons.steam_locked : null };
}

export type OpenScreen = "battle" | "event" | null;

/** The unlock toast: 3 seconds at the top with icon, name and tier and the sting; waits for a battle or event screen; none when switched off (ACH-069..071). */
export function toastFor(d: AchievementDefinition, settings: { toasts: boolean }, open: OpenScreen = null): { show: boolean; waitsFor: OpenScreen; seconds: number; shows: { icon: ReturnType<typeof iconOf>; name: string; tier: Tier }; sound: string | null } {
  const show = settings.toasts;
  return {
    show,
    waitsFor: show && open && config.toast.waits_for.includes(open) ? open : null,
    seconds: config.toast.seconds,
    shows: { icon: iconOf(d.tier), name: d.name, tier: d.tier },
    sound: show ? config.toast.sound : null,
  };
}

/** Is a row already ruled out on this date (a `before` or a `date` that has passed)? */
export function ruledOut(d: AchievementDefinition, date: string): boolean {
  const before = d.test.before;
  if (typeof before === "string" && date >= before) return true;
  const day = d.test.date;
  return d.moment === "date" && typeof day === "string" && date > day;
}

/** The "earnable in this campaign" filter: not earned, not ruled out (ACH-073). */
export function earnableInCampaign(cat: Catalogue, earned: Record<string, string>, date: string): string[] {
  return cat.list.filter((d) => !(d.id in earned) && !cat.retired.includes(d.id) && !ruledOut(d, date)).map((d) => d.id);
}

/** One turn report line per unlock, jumping to the place when there is one (ACH-074). */
export function reportLine(u: AchievementUnlocked): { text: string; jumpTo: string | null } {
  return { text: `Achievement: ${definition(u.id).name}`, jumpTo: u.place ?? null };
}
