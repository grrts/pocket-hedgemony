import rawConfig from "../../../../rules/data/domain/events.json" with { type: "json" };
import rawTree from "../../../../rules/data/domain/events-tree.json" with { type: "json" };

/**
 * The event tree's data model (event-tree/schema/event-tree.d.ts, as the
 * runtime layers actually write it) and the world state the event engine
 * reads and writes. Balance numbers live in rules/data/domain/events.json;
 * a sample of the tree (all ages and periods, a set of events, every
 * modifier, an index of all 306 events) in events-tree.json.
 */

export type Id = string;
/** A condition tree: logic (all, any, not, at_least) or one vocabulary leaf. */
export type Condition = { [type: string]: unknown };
/** One vocabulary effect, e.g. `{ on: "$realm", stat: { stability: -2 } }`. */
export type Effect = { [type: string]: unknown };

export interface Effects {
  immediate?: Effect[];
  /** Each entry carries `after_years` (a number or a range) and an optional `if`. */
  delayed?: Effect[];
  ongoing?: Effect[];
  long_term?: Effect[];
  /** Revolutions' tiers (revolutions context): applied when a tagged rising ends. */
  rising_won?: Effect[];
  rising_crushed?: Effect[];
}

/** An AI factor: the data's `{if, factor}` or the schema's named `{factor: <balance id>, mult}`. */
export interface AiFactor {
  if?: Condition;
  factor: number | string;
  mult?: number;
}

export interface OptionDef {
  id: Id;
  chooser: string | null;
  historical?: boolean;
  allowed?: Condition;
  ai: { base: number; factors?: AiFactor[] };
  effects: Effects;
}

export type RoleRelation = "initiator" | "participant" | "affected" | "beneficiary" | "cost_bearer" | "victim" | "resister";

export interface RoleDef {
  historical: Id[];
  select: "fixed" | { where?: string; condition: Condition };
  as: RoleRelation[];
}

export interface Availability {
  earliest: number;
  /** null: open to the campaign's end. */
  latest: number | null;
  mode: "mandatory" | "approximate" | "reference";
  repeat: "one_time" | "recurring" | "process";
  cooldown_years?: number;
}

export interface SelectionDef {
  mode: "immediate" | "pool" | "decision";
  mean_years?: number;
  weight?: number;
  modifiers?: { if?: Condition; condition?: Condition; mult: number }[];
}

export interface ExecutionDef {
  duration_years?: number;
  cooldown_years?: number;
  max_occurrences?: number;
  maintain?: Condition;
  cancel_if?: Condition;
}

export interface FollowUp {
  event: Id;
  delay: [number, number];
  boost: number;
}

export interface EventDef {
  id: Id;
  name?: string;
  ages: Id[];
  periods: Id[];
  regions: Id[];
  importance?: "major" | "regional" | "local";
  depiction?: "narrative_only";
  /** Optional soundtrack tag (music-design 6). */
  music?: string;
  /** Scripted onboarding events never fire in a real campaign (tutorial-design 3.4). */
  tutorial_only?: boolean;
  roles: Record<Id, RoleDef>;
  availability: Availability;
  requires?: Condition;
  optional?: { event: Id; weight: number }[];
  trigger: Condition;
  invalidated_if?: Condition | null;
  selection: SelectionDef;
  execution?: ExecutionDef;
  exclusive_with?: Id[];
  options: OptionDef[];
  effects: Effects;
  follow_ups?: FollowUp[];
  history?: { date: unknown; confidence?: string; disputes?: string };
}

export interface AgeDef {
  id: Id;
  name: string;
  window: { earliest_start: number; latest_end: number | null };
  start: Condition;
  end: Condition;
  force_start?: number;
  force_end?: number;
  regions: Id[];
}

export interface PeriodDef {
  id: Id;
  name: string;
  kind: string;
  ages: Id[];
  regions: Id[];
  window: [number, number];
  start: Condition | "initial";
  end: Condition;
  parent?: Id;
}

export interface ModifierDef {
  id: Id;
  scope: "province" | "country" | "region" | "global";
  changes: Record<string, number | string>;
  years: number;
  decay?: "none" | "linear" | "exponential";
  stacking?: "none" | "refresh" | "stack";
}

export interface IndexEntry {
  date: unknown;
  ages: Id[];
  periods: Id[];
  regions: Id[];
  depiction?: string;
}

export interface Tree {
  ages: AgeDef[];
  periods: PeriodDef[];
  events: Record<Id, EventDef>;
  index: Record<Id, IndexEntry>;
  modifiers: ModifierDef[];
  localization: Record<string, string>;
}

export type EventsConfig = typeof rawConfig;
export const eventsConfig: EventsConfig = rawConfig;
export const balance = rawConfig.balance;
/** The sample event tree shipped with the rules. Treat it as read-only; copy before changing. */
export const tree = rawTree as unknown as Tree;

export function eventDef(id: Id): EventDef {
  const ev = tree.events[id];
  if (!ev) throw new Error(`Unknown event: ${id}`);
  return ev;
}
export function ageDef(id: Id): AgeDef {
  const a = tree.ages.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown age: ${id}`);
  return a;
}
export function periodDef(id: Id): PeriodDef {
  const p = tree.periods.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown period: ${id}`);
  return p;
}
export function modifierDef(id: Id): ModifierDef {
  const m = tree.modifiers.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown modifier: ${id}`);
  return m;
}

/** A deep copy of plain data, so tests and games never change the shared tree. */
export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

// ---------------------------------------------------------------- the world the tree reads

/** A country (polity, company or movement) as the event tree sees it. */
export interface CountryState {
  /** Default true; a polity that owns nothing no longer exists. */
  exists?: boolean;
  /** Event-tree government value (enums governments: monarchy, republic …). */
  government?: string;
  religion?: string;
  cultureGroup?: string;
  /** Stored and derived statistics by id (statistics.yaml), e.g. debt, stability. */
  stats: Record<string, number>;
  ideologies?: Record<string, number>;
  innovations?: string[];
  flags?: string[];
  /** Countries this one is at war with. */
  enemies?: string[];
  relations?: { other: string; type: string }[];
  opinions?: Record<string, number>;
  borders?: string[];
  human?: boolean;
  /** Region of the capital, for `where` limits. */
  region?: string;
  /** colonial_presence by `where` target. */
  colonies?: Record<string, number>;
  /** Rebel types active in the country. */
  rebels?: string[];
  tradePresence?: Record<string, number>;
  /** Locked actions (revolutions' `lock`), unlocked mechanics (`unlock`). */
  unlocked?: string[];
}

/** A province, area, region or the globe: `province:<id>`, `area:<id>`, `region:<id>`, `global`. */
export interface PlaceState {
  stats: Record<string, number | string>;
  owner?: string;
  controller?: string;
  /** Provinces inside an area or region (place keys). */
  provinces?: string[];
  flags?: string[];
  religion?: string;
  cultureGroup?: string;
  ideologies?: Record<string, number>;
  innovations?: Record<string, number>;
  religionShares?: Record<string, number>;
  /** Population of named population groups living here. */
  groups?: Record<string, number>;
}

/** One time an event fired. */
export interface Occurrence {
  event: Id;
  year: number;
  month: number;
  option?: Id;
  roles: Record<Id, string[]>;
}

export interface War {
  id: Id;
  attackers: string[];
  defenders: string[];
  goal?: string;
  ongoing: boolean;
}

export interface RunningEvent {
  event: Id;
  roles: Record<Id, string[]>;
  option?: Id;
  /** Month index (year × 12 + month − 1) it started and ends. */
  start: number;
  end: number;
}

export interface FlagSet {
  on: string;
  id: Id;
  /** Month index it expires; absent = never. */
  until?: number;
}

/** A modifier on a target (EVT-051). */
export interface ModifierInstance {
  id: string;
  target: string;
  /** Month index applied (or last refreshed). */
  start: number;
  /** Duration in years; 0 = permanent. */
  years: number;
  stacks: number;
}

/** Ongoing play state the effects write: rebels raised, locks and unlocks, applied changes. */
export interface Rebels {
  on: string;
  type: string;
  size: string;
  /** Men who rose, taken from the province's recruit pool (D-EVT-5). */
  men?: number;
  /** Revolutions: the event a tagged rising belongs to. */
  revolution?: string;
}

export interface World {
  year: number;
  month: number;
  countries: Record<string, CountryState>;
  places: Record<string, PlaceState>;
  history: Occurrence[];
  running: RunningEvent[];
  ages: Id[];
  periods: Id[];
  wars: Record<Id, War>;
  flags: FlagSet[];
  tradeRoutes: { from: string; to: string; open: boolean }[];
  colonies: { who: string; where: string; type: string }[];
  casusBelli: { who: string; against: string; type: string; until?: number }[];
  modifiers: ModifierInstance[];
  rebels: Rebels[];
}

export function emptyWorld(year = 1444, month = 1): World {
  return { year, month, countries: {}, places: {}, history: [], running: [], ages: [], periods: [], wars: {}, flags: [], tradeRoutes: [], colonies: [], casusBelli: [], modifiers: [], rebels: [] };
}

/** Month index of a world date. */
export function monthIndex(year: number, month = 1): number {
  return year * 12 + (month - 1);
}
export function now(w: World): number {
  return monthIndex(w.year, w.month);
}

export function country(w: World, id: string): CountryState {
  return (w.countries[id] ??= { stats: {} });
}
export function place(w: World, key: string): PlaceState {
  return (w.places[key] ??= { stats: {} });
}
export function exists(w: World, id: string): boolean {
  const c = w.countries[id];
  if (c) return c.exists !== false;
  return Object.values(w.places).some((p) => (p.groups?.[id] ?? 0) > 0);
}
