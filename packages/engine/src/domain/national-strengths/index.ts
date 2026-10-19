import config from "../../../../rules/data/domain/national-strengths.json" with { type: "json" };
import examples from "../../../../rules/data/domain/national-strengths-examples.json" with { type: "json" };
import type { Rng } from "../../rng.ts";
import mapSetup from "../../../../rules/data/domain/scenario-setup-map.json" with { type: "json" };
import gazetteer from "../../../../rules/data/domain/national-strengths-places.json" with { type: "json" };
import { ERAS, eraIndex, type Era } from "../research/index.ts";
import { lonLatOf, pixelOf } from "../world-map/index.ts";

/**
 * National strengths (domain/national-strengths/spec.md): a country's
 * heritage of birthright, heydays, ambitions (goals in plain sight, rewards
 * hidden until earned, X-27), legacies and burden;
 * the levers they pull and what they cost; the heritage conditions; budgets;
 * archetype generation; and what happens when countries change hands. The
 * rules, levers and archetypes live in rules/data/domain/national-strengths.json
 * (copied from national-strengths/config). State is plain data the caller
 * owns; draws use only the Rng the caller hands in. Heritage is evaluated
 * once per turn, after the event tree, and counts time in months by the date
 * (D-HER-9, X-18).
 */

export const nsConfig = config;
export const RULES = config.rules;

// ---------------------------------------------------------------- data shapes

/** A condition: one key naming its type (event tree language plus heritage's six). */
export type Condition = { [type: string]: any };

export interface Effect {
  lever: string;
  value: number | boolean;
  where?: string;
  [param: string]: unknown;
}

export interface Birthright {
  id: string;
  name: string;
  text: string;
  why?: string;
  needs?: Condition;
  effects: Effect[];
}

export interface Mark {
  name: string;
  text: string;
  effects: Effect[];
}

export interface Heyday {
  id: string;
  name: string;
  age: string;
  text: string;
  why?: string;
  wakes: Condition;
  ends?: Condition;
  effects: Effect[];
  mark?: Mark;
}

export interface Legacy {
  id: string;
  name: string;
  great?: boolean;
  text: string;
  effects: Effect[];
}

export type Theme = "land" | "sea" | "trade" | "faith" | "crown" | "learning" | "survival" | "wealth";

export interface Ambition {
  id: string;
  name: string;
  theme: Theme;
  /** The build's riddle, no longer shown (X-27). */
  hint?: string;
  /** The plain goal, shown while the ambition is open (X-27). */
  text: string;
  historical?: boolean;
  window?: [number, number];
  /** The build's hint condition, retired with hidden goals (X-27). */
  stir?: Condition;
  /** Drawn only while this holds: an earlier ambition done, an event, a coast (HER-090). */
  requires?: Condition;
  goal: Condition;
  fail?: Condition;
  age?: string;
  legacy: Legacy;
}

export interface Burden {
  id: string;
  name: string;
  text: string;
  why?: string;
  effects: Effect[];
  shed: Condition;
  shed_text?: string;
  turned: Legacy;
}

/** A country's heritage as written (authored) or generated. */
export interface HeritageData {
  id: string;
  authored?: boolean;
  archetype?: string;
  secondary_archetype?: string | null;
  birthright: Birthright;
  heydays: Heyday[];
  ambitions: Ambition[];
  burden?: Burden | null;
}

/** Example heritage (small extracts of the build). */
export const EXAMPLES = examples.heritage as unknown as Record<string, HeritageData>;

export function exampleHeritage(id: string): HeritageData {
  const h = EXAMPLES[id];
  if (!h) throw new Error(`No example heritage for ${id}`);
  return structuredClone(h);
}

// ---------------------------------------------------------------- levers (HER-035..039)

export type Unit = "pct" | "steps" | "count" | "flag";

export interface LeverDef {
  group: string;
  unit: Unit;
  points: number;
  params: string[];
  owner: string;
  meaning: string;
  better: "higher" | "lower";
}

export const LEVERS = config.levers as Record<string, LeverDef>;

export function lever(key: string): LeverDef {
  const l = LEVERS[key];
  if (!l) throw new Error(`Unknown lever ${key}`);
  return l;
}

/** A lever whose owning design is still being written (HER-038). */
export function isProvisional(key: string): boolean {
  lever(key);
  return config.provisional_levers.includes(key) || LEVERS[key]!.owner.includes("provisional");
}

/**
 * When the owning design names its rule, a provisional lever may be renamed:
 * only the key changes, in the catalogue and in every heritage effect (HER-038).
 */
export function renameProvisionalLever(levers: Record<string, LeverDef>, data: HeritageData[], from: string, to: string, owner: string): { levers: Record<string, LeverDef>; data: HeritageData[] } {
  if (!isProvisional(from)) throw new Error(`${from} is not provisional`);
  const def = levers[from];
  if (!def) throw new Error(`Unknown lever ${from}`);
  const out: Record<string, LeverDef> = {};
  for (const [k, v] of Object.entries(levers)) out[k === from ? to : k] = k === from ? { ...v, owner } : v;
  const swap = (e: Effect): Effect => (e.lever === from ? { ...e, lever: to } : e);
  const effectsOf = <T extends { effects: Effect[] }>(x: T): T => ({ ...x, effects: x.effects.map(swap) });
  return {
    levers: out,
    data: data.map((d) => ({
      ...d,
      birthright: effectsOf(d.birthright),
      heydays: d.heydays.map((h) => ({ ...effectsOf(h), ...(h.mark ? { mark: effectsOf(h.mark) } : {}) })),
      ambitions: d.ambitions.map((a) => ({ ...a, legacy: effectsOf(a.legacy) })),
      ...(d.burden ? { burden: { ...effectsOf(d.burden), turned: effectsOf(d.burden.turned) } } : {}),
    })),
  };
}

/** Scope factor of an effect: `where` limits, a terrain or sea param; factors multiply, never below 0.25 (HER-048). */
export function scopeFactor(e: Effect): number {
  const sc = config.scope_cost;
  const w = typeof e.where === "string" ? e.where : "realm";
  let f = (sc.where as Record<string, number>)[w.split(":")[0]!] ?? 1;
  if ("terrain" in e) f *= sc.terrain_param;
  if ("sea" in e) f *= sc.sea_param;
  return Math.max(f, sc.floor);
}

/**
 * Points an effect spends: value × points per unit × scope; a flag counts
 * one; a lever where lower is better counts the other way; `ware_output_pct`
 * without a ware costs triple; `stat` costs the stat's stat_points (HER-045..049).
 */
export function effectPoints(e: Effect): number {
  const l = lever(e.lever);
  let cost = e.lever === "stat" ? ((RULES.stat_points as Record<string, number>)[String(e.stat)] ?? 0) : l.points;
  if (e.lever === "ware_output_pct" && !("ware" in e)) cost *= 3;
  const mag = l.unit === "flag" ? 1 : Number(e.value);
  const sign = l.unit === "flag" ? 1 : l.better === "lower" ? -1 : 1;
  return cost * mag * sign * scopeFactor(e);
}

export function effectsPoints(effects: readonly Effect[]): number {
  return effects.reduce((n, e) => n + effectPoints(e), 0);
}

// ---------------------------------------------------------------- budgets (HER-045..050)

export type Part = "birthright" | "heyday" | "legacy" | "great_legacy" | "burden";

/** Size class: mean of the six size-dependent assessments on very low 1 … very high 5 (HER-047). */
export function sizeClass(assessments: Record<string, string>): number {
  const levels = config.levels as Record<string, number>;
  const vals = config.size_dims.map((d) => levels[assessments[d] ?? ""]).filter((v): v is number => v !== undefined);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
}

/** Bonus to birthrights and heydays by size class (HER-046). */
export function sizeBonus(size: number): number {
  for (const row of RULES.budget.size_bonus) if (size >= row.size_class_min) return row.bonus;
  return RULES.budget.size_bonus.at(-1)!.bonus;
}

/** A part's budget, with the size bonus where it applies (HER-045, HER-046). */
export function partBudget(part: Part, size?: number): number {
  const base = RULES.budget[part];
  const bonus = size !== undefined && RULES.budget.size_bonus_applies_to.includes(part) ? sizeBonus(size) : 0;
  return base + bonus;
}

/** The build lists a part outside its budget ± tolerance (HER-050). */
export function outsideBudget(points: number, budget: number): boolean {
  return Math.abs(points - budget) > RULES.budget.tolerance + 1e-9;
}

// ---------------------------------------------------------------- the world conditions read

/** What heritage conditions read about one country (from the owning contexts). */
export interface CountryFacts {
  exists?: boolean;
  /** Inventions known (research). */
  knows?: string[];
  /** Catalogue places held (holds_place). */
  places?: string[];
  /** Targets owned: `province:<id>`, `area:<id>`, `region:<id>`. */
  owns?: string[];
  /** Seas on which the country owns a harbour (coastal). */
  harbours?: string[];
  /** Country-card counts (officials, lords, loyal_lords, building:market …). */
  counts?: Record<string, number>;
  /** The same counts at the campaign start. */
  start?: Record<string, number>;
  overlord?: string | null;
  /** Countries it is at war with. */
  atWarWith?: string[];
  religion?: string;
  stats?: Record<string, number>;
  /** Colonial presence by `where`. */
  colonial?: Record<string, number>;
  /** Kinds of rebels active. */
  rebels?: string[];
  /** Share (0-1) of trade power held in each trade hub (trade_presence). */
  trade?: Record<string, number>;
  /** Years it has owned an annexed country's capital and held a majority of its homeland, by that country (HER-060). */
  homelandHeldYears?: Record<string, number>;
  /** Share (0-1) of each target's provinces it owns, for `owns` with a `min_share`. */
  shares?: Record<string, number>;
  /** Countries whose land borders its own (borders). */
  borders?: string[];
}

export interface WorldFacts {
  year: number;
  month?: number;
  countries: Record<string, CountryFacts>;
  ages: { active: string[]; ended: string[] };
  /** Events that have happened. */
  events: string[];
  /** "A is the T of B" (alliance, subject, overlord, personal_union …). */
  relations: { who: string; other: string; type: string }[];
  /** Heritage of every country, for the `heritage` condition. */
  heritage?: Record<string, Heritage>;
}

export function emptyWorld(year = 1444): WorldFacts {
  return { year, countries: {}, ages: { active: [], ended: [] }, events: [], relations: [] };
}

const SYMMETRIC = new Set(["alliance", "rivalry", "truce", "trade_pact", "personal_union"]);
const INVERSE: Record<string, string> = { subject: "overlord", overlord: "subject" };

/** `relation {who: A, other: B, type: T}` reads "A is the T of B" (HER-042). */
export function relationHolds(w: WorldFacts, who: string, other: string, type: string): boolean {
  return w.relations.some(
    (r) =>
      (r.who === who && r.other === other && r.type === type) ||
      (r.who === other && r.other === who && (SYMMETRIC.has(type) ? r.type === type : INVERSE[r.type] === type)),
  );
}

function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case "==":
      return a === b;
    default:
      return a >= b;
  }
}

/** A count's target: a number, or relative to the campaign start ("start*2", "start+3") (HER-043). */
export function countTarget(value: number | string, start: number): number {
  if (typeof value === "number") return value;
  const m = /^start([*+])(\d+(?:\.\d+)?)$/.exec(value);
  if (!m) throw new Error(`Bad count value ${value}`);
  return m[1] === "*" ? start * Number(m[2]) : start + Number(m[2]);
}

function country(w: WorldFacts, id: string): CountryFacts {
  return w.countries[id] ?? {};
}

/** Does a condition hold, with `this` bound to the heritage's country (HER-040, HER-041)? */
export function holds(c: Condition, w: WorldFacts, self: string): boolean {
  const entries = Object.entries(c);
  if (entries.length !== 1) throw new Error(`A condition has one key: ${JSON.stringify(c)}`);
  const [type, v] = entries[0]!;
  const who = (x: unknown): string => (x === "this" || x === undefined ? self : String(x));
  const cf = (x: unknown) => country(w, who(x));
  switch (type) {
    case "all":
      return (v as Condition[]).every((x) => holds(x, w, self));
    case "any":
      return (v as Condition[]).some((x) => holds(x, w, self));
    case "not":
      return !holds(v, w, self);
    case "knows":
      return (cf(v.who).knows ?? []).includes(v.invention);
    case "holds_place":
      return (cf(v.who).places ?? []).includes(v.place);
    case "coastal": {
      const seas = cf(v.who).harbours ?? [];
      return v.sea ? seas.includes(v.sea) : seas.length > 0;
    }
    case "count": {
      const c2 = cf(v.who);
      const now = c2.counts?.[v.thing] ?? 0;
      return compare(now, v.op ?? ">=", countTarget(v.value, c2.start?.[v.thing] ?? 0));
    }
    case "heritage": {
      const h = w.heritage?.[who(v.who)];
      return h ? heritageStates(h, v.id).includes(v.state) : false;
    }
    case "independent":
      return !cf(v.who).overlord && !w.relations.some((r) => (r.who === who(v.who) && r.type === "subject") || (r.other === who(v.who) && r.type === "overlord"));
    case "relation":
      return relationHolds(w, who(v.who), who(v.other), v.type);
    case "at_war": {
      const wars = cf(v.who).atWarWith ?? [];
      return v.other ? wars.includes(who(v.other)) : wars.length > 0;
    }
    case "exists":
      return who(v.who) in w.countries && cf(v.who).exists !== false;
    case "owns":
      return v.min_share !== undefined ? (cf(v.who).shares?.[v.where] ?? 0) >= v.min_share : (cf(v.who).owns ?? []).includes(v.where);
    case "date":
      return (v.min === undefined || w.year >= v.min) && (v.max === undefined || w.year <= v.max);
    case "event":
      return w.events.includes(v.id);
    case "age_active":
      return w.ages.active.includes(v.id);
    case "stat":
      return compare(cf(v.who).stats?.[v.stat] ?? 0, v.op ?? ">=", v.value);
    case "colonial_presence":
      return compare(cf(v.who).colonial?.[v.where] ?? 0, v.op ?? ">=", v.value);
    case "religion":
      return cf(v.who).religion === v.is;
    case "rebels_active": {
      const rebels = cf(v.who).rebels ?? [];
      return v.type ? rebels.includes(v.type) : rebels.length > 0;
    }
    case "trade_presence":
      return compare(cf(v.who).trade?.[v.hub] ?? 0, v.op ?? ">=", v.value);
    case "subject_count": {
      const me = who(v.who);
      const subjects = new Set<string>();
      for (const [id, c2] of Object.entries(w.countries)) if (c2.overlord === me) subjects.add(id);
      for (const r of w.relations) {
        if (r.type === "overlord" && r.who === me) subjects.add(r.other);
        if (r.type === "subject" && r.other === me) subjects.add(r.who);
      }
      return compare(subjects.size, v.op ?? ">=", v.value);
    }
    case "borders": {
      const near = cf(v.who).borders ?? [];
      return v.other ? near.includes(who(v.other)) : near.length > 0;
    }
    default:
      // A condition on state no context in play keeps yet (a religion's share, a period) does not hold.
      return false;
  }
}

// ---------------------------------------------------------------- progress (HER-018, HER-021, HER-022)

/** The leaves of a condition tree (all, any and not are branches; a `not` counts as one leaf). */
export function leaves(c: Condition): Condition[] {
  const [type, v] = Object.entries(c)[0]!;
  if (type === "all" || type === "any") return (v as Condition[]).flatMap(leaves);
  return [c];
}

/** A count-like leaf's number now and its target, for `count` and `subject_count` reaching up to a value; null for any other leaf. */
function counted(c: Condition, w: WorldFacts, self: string): { now: number; target: number } | null {
  const [type, v] = Object.entries(c)[0]!;
  if (!(v.op ?? ">=").startsWith(">")) return null;
  const who = v.who === "this" || v.who === undefined ? self : String(v.who);
  if (type === "count") {
    const cf = country(w, who);
    return { now: cf.counts?.[v.thing] ?? 0, target: countTarget(v.value, cf.start?.[v.thing] ?? 0) + (v.op === ">" ? 1 : 0) };
  }
  if (type === "subject_count") {
    let now = 0;
    while (holds({ subject_count: { who, op: ">=", value: now + 1 } }, w, self)) now++;
    return { now, target: Number(v.value) + (v.op === ">" ? 1 : 0) };
  }
  return null;
}

/** How far a leaf is met: a count leaf partly, by how far it has come; any other leaf 0 or 1. */
export function leafShare(c: Condition, w: WorldFacts, self: string): number {
  const n = counted(c, w, self);
  if (n) return n.target <= 0 ? 1 : Math.min(1, n.now / n.target);
  return holds(c, w, self) ? 1 : 0;
}

/** The share of a goal that is met: the mean of its leaves (HER-021). */
export function goalShare(goal: Condition, w: WorldFacts, self: string): number {
  const ls = leaves(goal);
  return ls.reduce((n, l) => n + leafShare(l, w, self), 0) / ls.length;
}

/** Progress as the player reads it, "have of need" (HER-018). */
export interface Progress {
  have: number;
  need: number;
}

/**
 * Progress on a goal (HER-018): a count against its target; a goal of
 * several parts, the parts met; one of several ways, the way nearest done;
 * a yes-or-no goal, 0 or 1 of 1 (HER-022).
 */
export function progress(goal: Condition, w: WorldFacts, self: string): Progress {
  const [type, v] = Object.entries(goal)[0]!;
  if (type === "all" || type === "any") {
    const parts = v as Condition[];
    if (parts.length === 1) return progress(parts[0]!, w, self);
    if (type === "all") return { have: parts.filter((p) => holds(p, w, self)).length, need: parts.length };
    const best = parts.reduce((a, b) => (goalShare(b, w, self) > goalShare(a, w, self) + 1e-9 ? b : a));
    return progress(best, w, self);
  }
  const n = counted(goal, w, self);
  if (n && n.target > 1) {
    const need = Math.ceil(n.target - 1e-9);
    return { have: Math.min(need, Math.floor(n.now + 1e-9)), need };
  }
  return { have: holds(goal, w, self) ? 1 : 0, need: 1 };
}

// ---------------------------------------------------------------- the heritage aggregate

export type HeydayState = "waiting" | "awake" | "asleep" | "ended";
/** An ambition drawn: open (its goal and progress shown, X-27), or settled as done or lost. */
export type AmbitionState = "open" | "done" | "lost";

export interface HeritageEvent {
  type: string;
  id?: string;
  detail?: string;
}

export interface Heritage {
  country: string;
  birthrights: { item: Birthright; dormant: boolean; from?: string }[];
  heydays: { item: Heyday; state: HeydayState; yearsAwake: number; forcedUntil?: number }[];
  /** Ambitions not drawn yet. */
  pool: Ambition[];
  /** Age entries waiting for their age (HER-026). */
  waitingForAge: Ambition[];
  /** Ambitions drawn: the open ones and those done or lost; `share` of the goal met, `near` once it is within reach (HER-021). */
  ambitions: { item: Ambition; state: AmbitionState; share: number; near: boolean }[];
  legacies: Legacy[];
  /** `armed` false: its shed condition held on the first day, so it sheds only once that has failed (HER-084). */
  burden: { item: Burden; state: "held" | "shed"; armed?: boolean } | null;
  /** Annexed birthrights held until they wake (HER-059). */
  claims: { from: string; item: Birthright }[];
  counselYear: number | null;
  /** Heydays the player chose to put to sleep (HER-013). */
  slept: string[];
  /** Waiting for the player: a sixth legacy, or a third heyday waking. */
  ask: { kind: "let_go_legacy"; legacy: Legacy } | { kind: "sleep_heyday"; waking: string; awake: string[] } | null;
  log: HeritageEvent[];
  /** One line each in the monthly digest (HER-071). */
  digest: string[];
}

export function newHeritage(country: string, data: HeritageData): Heritage {
  const d = structuredClone(data);
  return {
    country,
    birthrights: [{ item: d.birthright, dormant: false }],
    heydays: d.heydays.slice(0, RULES.heydays.max_per_country).map((item) => ({ item, state: "waiting", yearsAwake: 0 })),
    pool: d.ambitions.filter((a) => !a.age),
    waitingForAge: d.ambitions.filter((a) => a.age),
    ambitions: [],
    legacies: [],
    burden: d.burden ? { item: d.burden, state: "held" } : null,
    claims: [],
    counselYear: null,
    slept: [],
    ask: null,
    log: [],
    digest: [],
  };
}

export const isOpen = (s: AmbitionState): boolean => s === "open";

export function openAmbitions(h: Heritage): Heritage["ambitions"] {
  return h.ambitions.filter((a) => isOpen(a.state));
}

/** Which heritage states an item is in, for the `heritage` condition (HER-068). */
export function heritageStates(h: Heritage, id: string): string[] {
  const out: string[] = [];
  const b = h.birthrights.find((x) => x.item.id === id);
  if (b) out.push("held", ...(b.dormant ? [] : ["awake"]));
  const hd = h.heydays.find((x) => x.item.id === id);
  if (hd?.state === "awake") out.push("awake");
  const am = h.ambitions.find((x) => x.item.id === id);
  if (am && (am.state === "done" || am.state === "lost")) out.push(am.state);
  if (h.legacies.some((l) => l.id === id)) out.push("held");
  if (h.burden?.item.id === id) out.push(h.burden.state);
  return out;
}

// ---------------------------------------------------------------- ambitions: drawing (HER-014, HER-015, HER-023, HER-027)

export type HistoryMode = "drawn" | "historical_only";

/**
 * Draws ambitions until 3 are open: at the start at least one is tagged
 * historical (HER-015); "Historical only" draws only those (HER-027). With a
 * world, a goal that already holds is put back and another drawn (HER-023),
 * and one whose requirement fails stays in the pool (HER-090); without a
 * world, no ambition with a requirement is drawn. `except` stays in the pool.
 */
export function drawAmbitions(h: Heritage, rng: Rng, opts: { mode?: HistoryMode; world?: WorldFacts; start?: boolean; except?: string } = {}): Ambition[] {
  const drawn: Ambition[] = [];
  const putBack = new Set<string>(opts.except ? [opts.except] : []);
  const w = opts.world;
  for (const a of h.pool) if (a.requires && (!w || !holds(a.requires, w, h.country))) putBack.add(a.id);
  const mode = opts.mode ?? (RULES.ambitions.history_mode_setting.default as HistoryMode);
  for (;;) {
    if (openAmbitions(h).length >= RULES.ambitions.active) break;
    const eligible = h.pool.filter((a) => !putBack.has(a.id) && (mode === "drawn" || a.historical));
    if (!eligible.length) break;
    const needHistorical = opts.start && !openAmbitions(h).some((a) => a.item.historical) && openAmbitions(h).length >= RULES.ambitions.active - RULES.ambitions.guaranteed_historical;
    const historical = eligible.filter((a) => a.historical);
    const from = needHistorical && historical.length ? historical : eligible;
    const pick = from[rng.int(from.length)]!;
    if (w && (holds(pick.goal, w, h.country) || lostAlready(pick, w, h.country))) {
      putBack.add(pick.id);
      h.log.push({ type: "AmbitionPutBack", id: pick.id });
      continue;
    }
    h.pool = h.pool.filter((a) => a.id !== pick.id);
    h.ambitions.push({ item: pick, state: "open", share: w ? goalShare(pick.goal, w, h.country) : 0, near: false });
    h.log.push({ type: "AmbitionDrawn", id: pick.id });
    drawn.push(pick);
  }
  return drawn;
}

/** An ambition that could only be lost: its deadline gone or its fail holding (HER-023). */
function lostAlready(a: Ambition, w: WorldFacts, self: string): boolean {
  return (a.window !== undefined && w.year > a.window[1]) || (a.fail !== undefined && holds(a.fail, w, self));
}

/** The campaign starts: draw 3 (HER-015, HER-023); a burden already shed on the first day waits until its condition fails once (HER-084). */
export function startCampaign(h: Heritage, rng: Rng, world: WorldFacts, mode: HistoryMode = "drawn"): Ambition[] {
  if (h.burden && holds(h.burden.item.shed, world, h.country)) h.burden.armed = false;
  return drawAmbitions(h, rng, { mode, world, start: true });
}

/** An age begins: entries naming it join the pool (HER-026). */
export function ageBegins(h: Heritage, age: string): Ambition[] {
  const joining = h.waitingForAge.filter((a) => a.age === age);
  h.waitingForAge = h.waitingForAge.filter((a) => a.age !== age);
  h.pool.push(...joining);
  return joining;
}

// ---------------------------------------------------------------- legacies (HER-029..031)

/** Grants a legacy; a sixth asks which one to let go (HER-030). */
export function grantLegacy(h: Heritage, l: Legacy): "granted" | "ask" {
  if (h.legacies.length >= RULES.ambitions.max_legacies) {
    h.ask = { kind: "let_go_legacy", legacy: l };
    return "ask";
  }
  h.legacies.push(l);
  h.log.push({ type: "LegacyGranted", id: l.id });
  return "granted";
}

/** The answer to a sixth legacy: the one let go leaves, the new one stays unless it was the one let go. */
export function letGoLegacy(h: Heritage, id: string): void {
  if (h.ask?.kind !== "let_go_legacy") throw new Error("No legacy waits to be placed");
  const incoming = h.ask.legacy;
  h.ask = null;
  h.log.push({ type: "LegacyReleased", id });
  if (incoming.id === id) return;
  h.legacies = h.legacies.filter((l) => l.id !== id);
  h.legacies.push(incoming);
  h.log.push({ type: "LegacyGranted", id: incoming.id });
}

/** The mark of a heyday: its mark block, or its first lever at a third (mark_share) of its value (HER-012). */
export function markOf(hd: Heyday): Legacy {
  if (hd.mark) return { id: `${hd.id}_mark`, name: hd.mark.name, text: hd.mark.text, effects: hd.mark.effects };
  const first = hd.effects[0]!;
  const value = typeof first.value === "number" ? Math.round(first.value * RULES.heydays.mark_share) : first.value;
  return { id: `${hd.id}_mark`, name: hd.name, text: hd.text, effects: [{ ...first, value }] };
}

// ---------------------------------------------------------------- the evaluation (spec §9)

function endHeyday(h: Heritage, hd: Heritage["heydays"][number]): void {
  hd.state = "ended";
  h.log.push({ type: "HeydayEnded", id: hd.item.id });
  if (hd.yearsAwake >= RULES.heydays.mark_after_years) {
    const mark = markOf(hd.item);
    h.log.push({ type: "MarkGranted", id: mark.id });
    grantLegacy(h, mark);
  }
}

/** The share of an open ambition's goal met; the first time it comes within reach, one digest line (HER-021, HER-071). */
function measure(h: Heritage, a: Heritage["ambitions"][number], w: WorldFacts): void {
  a.share = goalShare(a.item.goal, w, h.country);
  if (!a.near && a.share >= RULES.ambitions.within_reach - 1e-9 && a.share < 1) {
    a.near = true;
    const p = progress(a.item.goal, w, h.country);
    h.digest.push(`${a.item.name} is within reach: ${p.have} of ${p.need}.`);
    h.log.push({ type: "AmbitionNear", id: a.item.id });
  }
}

function finish(h: Heritage, a: Heritage["ambitions"][number], state: "done" | "lost"): void {
  a.state = state;
  h.log.push({ type: state === "done" ? "AmbitionDone" : "AmbitionLost", id: a.item.id });
  if (state === "done") grantLegacy(h, a.item.legacy);
}

/**
 * Evaluates a country's heritage against the world, in the order of spec §9:
 * birthright needs, heydays, ambitions (with replacements drawn when an Rng
 * is given), then the burden.
 */
export function evaluate(h: Heritage, w: WorldFacts, rng?: Rng): HeritageEvent[] {
  const from = h.log.length;
  const self = h.country;
  // 0. Dormant claims wake after claim_years holding the capital and most of the homeland (HER-060, D-HER-1).
  const held = country(w, self).homelandHeldYears ?? {};
  for (const c of [...h.claims]) if ((held[c.from] ?? 0) >= RULES.inheritance.claim_years) wakeClaim(h, c.from);
  // 1. Birthright needs: dormant or awake (HER-005, HER-006).
  for (const b of h.birthrights) {
    const dormant = b.item.needs ? !holds(b.item.needs, w, self) : false;
    if (dormant !== b.dormant) h.log.push({ type: dormant ? "BirthrightDormant" : "BirthrightWoke", id: b.item.id });
    b.dormant = dormant;
  }
  // 2. Heydays (HER-008..013).
  const waking: Heritage["heydays"] = [];
  for (const hd of h.heydays) {
    if (hd.state === "ended") continue;
    if (w.ages.ended.includes(hd.item.age) || (hd.item.ends && holds(hd.item.ends, w, self))) {
      endHeyday(h, hd);
      continue;
    }
    if (!w.ages.active.includes(hd.item.age)) {
      hd.state = "waiting";
      continue;
    }
    const forced = hd.forcedUntil !== undefined && w.year < hd.forcedUntil;
    if (forced || holds(hd.item.wakes, w, self)) {
      if (hd.state !== "awake") waking.push(hd);
    } else if (hd.state !== "asleep") {
      if (hd.state === "awake") h.log.push({ type: "HeydaySlept", id: hd.item.id });
      hd.state = "asleep";
    }
  }
  for (const hd of waking) {
    const awake = h.heydays.filter((x) => x.state === "awake");
    if (awake.length < RULES.heydays.max_active) {
      hd.state = "awake";
      h.slept = h.slept.filter((x) => x !== hd.item.id);
      h.log.push({ type: "HeydayWoke", id: hd.item.id });
    } else {
      hd.state = "asleep";
      if (!h.slept.includes(hd.item.id)) h.ask = { kind: "sleep_heyday", waking: hd.item.id, awake: awake.map((x) => x.item.id) };
    }
  }
  // 3. Ambitions (HER-018..022).
  let finished = 0;
  for (const a of openAmbitions(h)) {
    const am = a.item;
    if ((am.window && w.year > am.window[1]) || (am.fail && holds(am.fail, w, self))) {
      finish(h, a, "lost");
      finished++;
      continue;
    }
    if (holds(am.goal, w, self)) {
      finish(h, a, "done");
      finished++;
      continue;
    }
    measure(h, a, w);
  }
  if (finished && rng && RULES.ambitions.redraw_on_complete_or_fail) drawAmbitions(h, rng, { world: w });
  // 4. The burden (HER-032, HER-033).
  if (h.burden?.state === "held") {
    const shed = holds(h.burden.item.shed, w, self);
    if (h.burden.armed === false) {
      if (!shed) h.burden.armed = true;
    } else if (shed) shedBurden(h);
  }
  return h.log.slice(from);
}

/** Adds years served to every awake heyday. */
export function serveYears(h: Heritage, years: number): void {
  for (const hd of h.heydays) if (hd.state === "awake") hd.yearsAwake += years;
}

/**
 * One turn of heritage (HER-078, D-HER-9, X-18): evaluated once, after the
 * event tree. Time is measured by the date, not by turns: `monthsBegun` is
 * the number of new months that began in this turn (0 or 1 in a weekly turn),
 * and each awake heyday serves that many months (12 to a year).
 */
export function turnTick(h: Heritage, w: WorldFacts, rng: Rng | undefined, monthsBegun: number): HeritageEvent[] {
  const out = evaluate(h, w, rng);
  const perYear = RULES.timing.months_per_year;
  if (monthsBegun > 0) for (const hd of h.heydays) if (hd.state === "awake") hd.yearsAwake = Math.round(hd.yearsAwake * perYear + monthsBegun) / perYear;
  return out;
}

/** The heritage of a turn in which a new month begins: evaluated, and one month served. */
export function monthTick(h: Heritage, w: WorldFacts, rng?: Rng): HeritageEvent[] {
  return turnTick(h, w, rng, 1);
}

/**
 * The AI's answer when a third heyday would wake or a sixth legacy is earned
 * (HER-079, D-HER-12): the one with the fewest lever points goes; on a tie,
 * the one held longest.
 */
export function aiAnswer(h: Heritage): string | null {
  const ask = h.ask;
  if (!ask) return null;
  if (ask.kind === "sleep_heyday") {
    const ids = [...ask.awake, ask.waking];
    const hds = ids.map((id) => h.heydays.find((x) => x.item.id === id)!);
    const pick = hds.reduce((a, b) => {
      const pa = effectsPoints(a.item.effects);
      const pb = effectsPoints(b.item.effects);
      return pb < pa - 1e-9 || (Math.abs(pa - pb) < 1e-9 && b.yearsAwake > a.yearsAwake) ? b : a;
    });
    chooseSleepingHeyday(h, pick.item.id);
    return pick.item.id;
  }
  const all = [...h.legacies, ask.legacy];
  const pick = all.reduce((a, b) => (effectsPoints(b.effects) < effectsPoints(a.effects) - 1e-9 ? b : a));
  letGoLegacy(h, pick.id);
  return pick.id;
}

/** The player's answer when a third heyday would wake: the chosen one sleeps (HER-013). */
export function chooseSleepingHeyday(h: Heritage, id: string): void {
  if (h.ask?.kind !== "sleep_heyday") throw new Error("No heyday waits to wake");
  const { waking } = h.ask;
  h.ask = null;
  h.slept.push(id);
  const sleeper = h.heydays.find((x) => x.item.id === id)!;
  if (id !== waking) {
    sleeper.state = "asleep";
    h.log.push({ type: "HeydaySlept", id });
    const w = h.heydays.find((x) => x.item.id === waking)!;
    w.state = "awake";
    h.log.push({ type: "HeydayWoke", id: waking });
  }
}

// ---------------------------------------------------------------- burden (HER-032..034)

/** Sheds the burden and grants its turned legacy (HER-033, HER-067). */
export function shedBurden(h: Heritage): Legacy | null {
  if (h.burden?.state !== "held") return null;
  h.burden.state = "shed";
  h.log.push({ type: "BurdenShed", id: h.burden.item.id });
  grantLegacy(h, h.burden.item.turned);
  return h.burden.item.turned;
}

/**
 * What a resident envoy learns (HER-025, D-HER-11, X-27): after
 * envoy_reveal_years at the court, the name, goal and progress of one of the
 * host's open ambitions, never its reward.
 */
export function envoyReading(host: Heritage, yearsResident: number, rng: Rng, w: WorldFacts): { name: string; goal: string; theme: Theme; progress: Progress } | null {
  if (yearsResident < RULES.ambitions.envoy_reveal_years) return null;
  const open = openAmbitions(host);
  if (!open.length) return null;
  const a = open[rng.int(open.length)]!;
  host.log.push({ type: "AmbitionRead", id: a.item.id });
  return { name: a.item.name, goal: a.item.text, theme: a.item.theme, progress: progress(a.item.goal, w, host.country) };
}

/**
 * Whether a pool's size is within the rules (HER-014, D-HER-10): at least
 * pool_min_authored or pool_min_generated, at most pool_max; age ambitions
 * join on top and do not count.
 */
export function poolWithinLimits(d: HeritageData, kind: "authored" | "generated"): boolean {
  const n = d.ambitions.filter((a) => !a.age).length;
  const min = kind === "authored" ? RULES.ambitions.pool_min_authored : RULES.ambitions.pool_min_generated;
  return n >= min && n <= RULES.ambitions.pool_max;
}

/** Gold never buys a burden off (HER-034). */
export function offerGoldForBurden(_h: Heritage, _gold: number): false {
  return false;
}

// ---------------------------------------------------------------- counsel and events (HER-024, HER-064..068)

export function counselGold(era: Era): number {
  const g = RULES.ambitions.counsel.gold_by_era[eraIndex(era)];
  if (g === undefined) throw new Error(`No counsel price in era ${era}`);
  return g;
}

/**
 * Counsel, a new aim (HER-024, X-27): gold by era, once every 10 years; one
 * open ambition goes back to the pool and another is drawn in its place at
 * once. Refused when the pool has nothing else to draw.
 */
export function payCounsel(h: Heritage, ambition: string, w: WorldFacts, era: Era, treasury: { gold: number }, rng: Rng): { ok: true; gold: number; drawn: Ambition } | { ok: false; reason: "too_soon" | "gold" | "not_open" | "none_left" } {
  if (h.counselYear !== null && w.year - h.counselYear < RULES.ambitions.counsel.cooldown_years) return { ok: false, reason: "too_soon" };
  const a = openAmbitions(h).find((x) => x.item.id === ambition);
  if (!a) return { ok: false, reason: "not_open" };
  const gold = counselGold(era);
  if (treasury.gold < gold) return { ok: false, reason: "gold" };
  const at = h.ambitions.indexOf(a);
  const before = { pool: h.pool, ambitions: h.ambitions, log: h.log.length };
  h.ambitions = h.ambitions.filter((x) => x !== a);
  const [drawn] = drawAmbitions(h, rng, { world: w, except: a.item.id });
  if (!drawn) {
    h.pool = before.pool;
    h.ambitions = before.ambitions;
    h.log.length = before.log;
    return { ok: false, reason: "none_left" };
  }
  // The new aim takes the old one's place in the list; the old one can be drawn again later.
  const fresh = h.ambitions.pop()!;
  h.ambitions.splice(at, 0, fresh);
  h.pool.push(a.item);
  treasury.gold -= gold;
  h.counselYear = w.year;
  h.log.push({ type: "AmbitionSetAside", id: a.item.id });
  return { ok: true, gold, drawn };
}

export const ERA_LIST: readonly Era[] = ERAS;

/** `wake_heyday {on, id, years}`: awake for those years even if its condition fails (HER-065). */
export function wakeHeydayByEvent(h: Heritage, id: string, years: number, w: WorldFacts): void {
  const hd = h.heydays.find((x) => x.item.id === id);
  if (!hd) throw new Error(`No heyday ${id}`);
  hd.forcedUntil = w.year + years;
  evaluate(h, w);
}


// ---------------------------------------------------------------- effects in play (HER-035..037, HER-061)

/** Effects in force: the awake birthrights, awake heydays, legacies and a held burden. */
export function activeEffects(h: Heritage): Effect[] {
  return [
    ...h.birthrights.filter((b) => !b.dormant).flatMap((b) => b.item.effects),
    ...h.heydays.filter((x) => x.state === "awake").flatMap((x) => x.item.effects),
    ...h.legacies.flatMap((l) => l.effects),
    ...(h.burden?.state === "held" ? h.burden.item.effects : []),
  ];
}

/** Where a lever may apply: what a province is. */
export interface Place {
  capital?: boolean;
  coast?: boolean;
  core?: boolean;
  royal?: boolean;
  lords?: boolean;
  frontier?: boolean;
  terrain?: string;
  culture?: string;
  faith?: string;
  area?: string;
  region?: string;
}

/** Does an effect apply in a place: only inside its `where` scope (HER-037). */
export function appliesIn(e: Effect, p: Place): boolean {
  const w = typeof e.where === "string" ? e.where : "realm";
  if (w === "realm") return true;
  const [kind, val] = w.split(":") as [keyof Place, string | undefined];
  return val === undefined ? p[kind] === true : p[kind] === val;
}

/** The sum a country's heritage adds to one lever in a place, for the given lever params. */
export function leverIn(h: Heritage, key: string, p: Place = {}, params: Record<string, unknown> = {}): number {
  return activeEffects(h)
    .filter((e) => e.lever === key && appliesIn(e, p) && Object.entries(params).every(([k, v]) => e[k] === v))
    .reduce((n, e) => n + (typeof e.value === "number" ? e.value : 1), 0);
}

/** An event's weight raised by `event_weight` (+100 doubles it) (HER-068). */
export function eventWeight(h: Heritage, event: string, base: number): number {
  return base * (1 + leverIn(h, "event_weight", {}, { event }) / 100);
}

/** An option opened by `event_option` (HER-068). */
export function optionOpen(h: Heritage, event: string, option: string): boolean {
  return activeEffects(h).some((e) => e.lever === "event_option" && e.event === event && e.option === option);
}

// ---------------------------------------------------------------- what the player sees (HER-001, HER-002, HER-016..020, HER-070, HER-073)

/** An ambition as its own realm sees it (HER-016..020, X-27). */
export interface AmbitionView {
  theme: Theme;
  name: string;
  /** The plain goal, always shown. */
  goal: string;
  /** Have of need while open (HER-018). */
  progress?: Progress;
  /** Within reach (HER-021). */
  near?: boolean;
  /** The promised legacy's name: all of the reward shown while open (HER-017). */
  legacy: string;
  great?: boolean;
  /** What the legacy gives, only once the ambition is done (HER-019). */
  reward?: string;
  deadline?: number;
  state: AmbitionState;
}

export function ambitionView(a: Heritage["ambitions"][number], w?: WorldFacts, self = ""): AmbitionView {
  const v: AmbitionView = { theme: a.item.theme, name: a.item.name, goal: a.item.text, legacy: a.item.legacy.name, state: a.state };
  if (a.item.legacy.great) v.great = true;
  if (a.state === "open") {
    if (w) v.progress = progress(a.item.goal, w, self);
    if (a.near) v.near = true;
    if (a.item.window) v.deadline = a.item.window[1];
  }
  if (a.state === "done") v.reward = a.item.legacy.text;
  return v;
}

export interface CardRow {
  row: "Birthright" | "Golden age" | "Ambitions" | "Weakness" | "Legacies";
  lines: string[];
  greyed?: boolean;
  /** Tapping the row: full text, history note and what it changes (HER-002). */
  details: { name: string; text: string; why?: string; changes: Effect[] }[];
}

/** The heritage card: five rows, never more (HER-001). */
export function card(h: Heritage, ageName: (id: string) => string = (id) => id): CardRow[] {
  const detail = (x: { name: string; text: string; why?: string; effects: Effect[] }) => ({ name: x.name, text: x.text, ...(x.why ? { why: x.why } : {}), changes: x.effects });
  const awake = h.heydays.filter((x) => x.state === "awake");
  return [
    { row: "Birthright", lines: h.birthrights.map((b) => b.item.name), greyed: h.birthrights.every((b) => b.dormant), details: h.birthrights.map((b) => detail(b.item)) },
    { row: "Golden age", lines: awake.map((x) => `${x.item.name} (${ageName(x.item.age)} · active)`), details: awake.map((x) => detail(x.item)) },
    { row: "Ambitions", lines: openAmbitions(h).map((a) => a.item.name), details: [] },
    { row: "Weakness", lines: h.burden?.state === "held" ? [h.burden.item.name] : [], details: h.burden?.state === "held" ? [detail(h.burden.item)] : [] },
    { row: "Legacies", lines: h.legacies.length ? h.legacies.map((l) => l.name) : ["none yet"], details: h.legacies.map(detail) },
  ];
}

/** The nation picker: birthright, burden, ambitions counted, heydays as their ages (HER-073). */
export function pickerSummary(d: HeritageData): { birthright: string; burden: string | null; ambitions: number; heydayAges: string[] } {
  return {
    birthright: d.birthright.name,
    burden: d.burden?.name ?? null,
    ambitions: Math.min(RULES.ambitions.active, d.ambitions.filter((a) => !a.age).length),
    heydayAges: d.heydays.map((h) => h.age),
  };
}

/** The Heritage row of the country card: birthright, awake heyday, the open ambitions' shares, burden; opens the sheet (HER-070). */
export function heritageRow(h: Heritage): { birthright: string; heyday: string | null; ambitions: number[]; burden: string | null; opens: "Heritage sheet" } {
  return {
    birthright: h.birthrights[0]!.item.id,
    heyday: h.heydays.find((x) => x.state === "awake")?.item.id ?? null,
    ambitions: openAmbitions(h).map((a) => a.share),
    burden: h.burden?.state === "held" ? h.burden.item.id : null,
    opens: "Heritage sheet",
  };
}

/**
 * What the map shimmers over (HER-072): the places and areas named by each
 * open ambition within reach. The map draws a faint shimmer only: no outline, no name.
 */
export function shimmer(h: Heritage): { places: string[]; outline: false; named: false }[] {
  const out: { places: string[]; outline: false; named: false }[] = [];
  for (const a of openAmbitions(h)) {
    if (!a.near) continue;
    const places = leaves(a.item.goal).flatMap((l) => {
      const [type, v] = Object.entries(l)[0]!;
      if (type === "holds_place") return [String(v.place)];
      if (type === "owns") return [String(v.where)];
      return [];
    });
    if (places.length) out.push({ places, outline: false, named: false });
  }
  return out;
}

// ---------------------------------------------------------------- AI (HER-069)

/** The AI sees its own ambitions' goals and weighs them at ai.ambition_goal_weight. */
export function aiGoals(h: Heritage): { ambition: string; plainGoal: string; goal: Condition; weight: number }[] {
  return openAmbitions(h).map((a) => ({ ambition: a.item.id, plainGoal: a.item.text, goal: a.item.goal, weight: RULES.ai.ambition_goal_weight }));
}

// ---------------------------------------------------------------- countries changing hands (HER-059..063)

/** Annexation: the annexed birthright becomes a dormant claim of the annexer (HER-059). */
export function annex(annexer: Heritage, annexed: Heritage): void {
  annexer.claims.push({ from: annexed.country, item: annexed.birthrights[0]!.item });
  annexer.log.push({ type: "DormantClaimCreated", id: annexed.birthrights[0]!.item.id });
}

/** A claim wakes as another birthright, never beyond 2 (HER-060); evaluate wakes it after claim_years (D-HER-1). */
export function wakeClaim(h: Heritage, from: string): boolean {
  const claim = h.claims.find((c) => c.from === from);
  if (!claim || h.birthrights.length >= RULES.inheritance.max_birthrights) return false;
  h.claims = h.claims.filter((c) => c !== claim);
  h.birthrights.push({ item: claim.item, dormant: false, from });
  h.log.push({ type: "DormantClaimWoke", id: claim.item.id });
  return true;
}

/** Released: its catalogue heritage, or the generated heritage of its archetype (HER-062). */
export function releasedHeritage(id: string, known: Record<string, HeritageData>, record?: CatalogueRecord, catalogue: Record<string, CatalogueRecord> = {}): HeritageData {
  const own = known[id];
  if (own) return structuredClone(own);
  if (!record) throw new Error(`${id} needs a record to generate from`);
  return generate(record, sizeBonus(recordSize(record)), catalogue);
}

/**
 * Formed: keeps the forming country's birthright and legacies, adds the
 * formed country's own heritage if any, and draws from both pools (HER-063).
 */
export function formCountry(id: string, forming: Heritage, formed: HeritageData | null, rng: Rng): Heritage {
  const h = newHeritage(id, formed ?? { id, birthright: forming.birthrights[0]!.item, heydays: [], ambitions: [] });
  // the forming country's own birthright first, then the formed country's own;
  // any other birthright (an inherited one) goes back to a dormant claim (D-HER-17)
  const own = forming.birthrights.find((b) => !b.from) ?? forming.birthrights[0]!;
  const keep = formed ? [{ ...own }, { item: formed.birthright, dormant: false }] : forming.birthrights.map((b) => ({ ...b }));
  h.birthrights = keep.slice(0, RULES.inheritance.max_birthrights);
  h.claims = [...forming.claims, ...forming.birthrights.filter((b) => !h.birthrights.some((k) => k.item.id === b.item.id)).map((b) => ({ from: b.from ?? forming.country, item: b.item }))];
  h.legacies = [...forming.legacies];
  h.pool = [...forming.pool, ...(formed ? formed.ambitions.filter((a) => !a.age) : [])];
  h.burden = formed?.burden ? { item: formed.burden, state: "held" } : forming.burden;
  drawAmbitions(h, rng);
  return h;
}

// ---------------------------------------------------------------- generation (HER-051..058)

/** The catalogue fields generation reads (scenario-setup), through an anti-corruption layer. */
export interface CatalogueRecord {
  id: string;
  names: { common_en: string };
  meta?: { region: string; detail_tier: string };
  classification?: { entity_type: string; entity_type_notes?: string };
  historical: {
    geography: { extent_1444?: string; core_region?: string; climate_terrain_resources?: string; advantages?: string[]; capital?: { name?: string } | null; access?: { seas?: string[]; rivers?: string[] } };
    economy?: { main_activities?: string[]; resource_base?: string; goods?: unknown[] };
    society?: { settlement_pattern?: string; religions?: { tradition?: string }[] };
    identity?: { background?: string };
  };
  gameplay: {
    ai_personality?: { economic_priorities: { focus: string[] }; expansion: { modes: string[] }; diplomacy: { likely_rivals?: string[]; preferred_partners?: string[] } };
    starting_assessment?: Record<string, { level: string }>;
    representation: { mode: string };
  };
  event_connections?: { possible_future_paths?: { path: string; chain_type?: string; event_keys?: string[]; earliest_plausible?: string }[] };
}

export const CATALOGUE_EXAMPLES = examples.catalogue as unknown as Record<string, CatalogueRecord>;
const EVENT_LINKS = examples.event_links as Record<string, { match: string; event_tree_ids: string[] }>;

export type HeritageKind = "authored" | "generated" | "generated_decentralised" | "none";
export type Group = keyof typeof config.groups;

/** Who gets what (HER-051, HER-052). */
export function heritageKindOf(group: Group): HeritageKind {
  return config.groups[group].heritage as HeritageKind;
}

/** The group of a catalogue record from its tier and representation: tier A playables are hand-written (HER-051, HER-052). */
export function groupOfRecord(tier: string, representation: string): Group {
  const g = config.groups;
  if (g.decentralised.modes.includes(representation)) return "decentralised";
  if (g.tier_a.modes.includes(representation)) return tier === "A" ? "tier_a" : "tier_b_c";
  return "background";
}

interface Archetype {
  id: string;
  label: string;
  detect: Record<string, any>;
  birthright: Birthright;
  heydays: (Omit<Heyday, "id" | "age"> & { age_options: string[] })[];
  burden: Burden;
  ambition_themes: Theme[];
}
const ARCH = config.archetypes as unknown as {
  decentralized_allowed: string[];
  archetypes: Archetype[];
  theme_ambitions: Record<Theme, Omit<Ambition, "id" | "theme" | "legacy">>;
  legacies: Record<Theme, Omit<Legacy, "id">[]>;
};
export const ARCHETYPE_IDS: readonly string[] = ARCH.archetypes.map((a) => a.id);
export const DECENTRALISED_ARCHETYPES: readonly string[] = ARCH.decentralized_allowed;
export function archetypeTemplates(id: string): Archetype {
  const a = ARCH.archetypes.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown archetype ${id}`);
  return a;
}
export function archetypeLabel(id: string): string {
  return archetypeTemplates(id).label;
}
const PLAYABLE = ["playable_country", "playable_subject", "decentralized_polity"];
const AGE_REGIONS = new Map(config.ages.map((a) => [a.id, new Set(a.regions)]));

export function ageName(id: string): string {
  return config.ages.find((a) => a.id === id)?.name ?? id;
}

/** Size class of a catalogue record. */
export function recordSize(rec: CatalogueRecord): number {
  const sa = rec.gameplay.starting_assessment ?? {};
  return sizeClass(Object.fromEntries(Object.entries(sa).map(([k, v]) => [k, v.level])));
}

function macroRegions(region: string): Set<string> {
  for (const [k, v] of Object.entries(config.macro_regions)) if (region.startsWith(k)) return new Set(v);
  return new Set();
}

interface Features {
  text: string;
  seas: boolean;
  rivers: number;
  etype: string;
  focus: Set<string>;
  modes: Set<string>;
  naval: number;
  size: number;
  religion: string;
  region: string;
  mode: string;
  fill: Record<string, string>;
}

function features(rec: CatalogueRecord): Features {
  const h = rec.historical;
  const g = h.geography;
  const ec = h.economy ?? {};
  const so = h.society ?? {};
  const parts = [g.extent_1444 ?? "", g.core_region ?? "", g.climate_terrain_resources ?? "", (g.advantages ?? []).join(" "), (ec.main_activities ?? []).join(" "), ec.resource_base ?? "", (ec.goods ?? []).filter((x) => typeof x === "string").join(" "), so.settlement_pattern ?? "", h.identity?.background ?? "", rec.classification?.entity_type_notes ?? ""];
  const text = parts.filter((p) => typeof p === "string" && p).join(" ").toLowerCase();
  const levels = config.levels as Record<string, number>;
  const sa = rec.gameplay.starting_assessment ?? {};
  const acc = g.access ?? {};
  const goodsList = (ec.goods ?? []).filter((x): x is string => typeof x === "string").slice(0, 2);
  const goods = goodsList.length ? goodsList : (ec.main_activities ?? []).slice(0, 1).length ? (ec.main_activities ?? []).slice(0, 1) : ["its own produce"];
  const name = rec.names.common_en;
  let cap = g.capital?.name || name;
  cap = cap.split(/[;(/,]/)[0]!.trim() || name;
  let terr = (g.climate_terrain_resources || "rugged country").split(/[.;:]/)[0]!.trim().replace(/,+$/, "");
  if (terr.length > 70) terr = terr.slice(0, 70).split(" ").slice(0, -1).join(" ").replace(/,+$/, "");
  const ai = rec.gameplay.ai_personality;
  return {
    text,
    seas: (acc.seas ?? []).length > 0,
    rivers: (acc.rivers ?? []).length,
    etype: rec.classification?.entity_type ?? "",
    focus: new Set(ai?.economic_priorities.focus ?? []),
    modes: new Set(ai?.expansion.modes ?? []),
    naval: levels[sa.naval_capability?.level ?? ""] ?? 1,
    size: recordSize(rec),
    religion: (so.religions ?? []).slice(0, 1).map((r) => r.tradition ?? "").join(" ").toLowerCase(),
    region: rec.meta?.region ?? "",
    mode: rec.gameplay.representation.mode,
    fill: {
      name,
      capital: cap,
      goods: goods.join(" and ").toLowerCase(),
      sea: acc.seas?.[0] ?? "sea",
      river: acc.rivers?.[0] ?? "river",
      woods: /jungle|rainforest|tropical forest/.test(text) ? "jungle" : "forest",
      terrain_words: terr ? terr.slice(0, 1).toLowerCase() + terr.slice(1, 80) : "rugged country",
    },
  };
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** An archetype's score for a record; null when it can't apply (decentralised polities: crownless archetypes only, HER-056). */
function score(a: Archetype, f: Features): number | null {
  const d = a.detect;
  if (f.mode === "decentralized_polity" && !ARCH.decentralized_allowed.includes(a.id)) return null;
  if (!Object.keys(d).length) return 0.5;
  if ("seas" in d && d.seas !== f.seas) return null;
  if ("mode" in d && !d.mode.includes(f.mode)) return null;
  if ("size_min" in d && f.size < d.size_min) return null;
  if ("rivers_min" in d && f.rivers < d.rivers_min) return null;
  if ("naval_min" in d && f.naval < d.naval_min) return null;
  if ("region_any" in d && !d.region_any.some((r: string) => f.region.startsWith(r))) return null;
  if ("religion_any" in d && !d.religion_any.some((w: string) => f.religion.includes(w))) return null;
  let s = 0;
  if ("entity_type" in d) s += d.entity_type.includes(f.etype) ? 3 : -1;
  if ("focus_any" in d) s += Math.min(3, 1.5 * d.focus_any.filter((x: string) => f.focus.has(x)).length);
  if ("modes_any" in d) s += d.modes_any.some((x: string) => f.modes.has(x)) ? 1 : 0;
  if ("text_any" in d) {
    const n = d.text_any.filter((w: string) => new RegExp(`\\b${escapeRe(w)}`).test(f.text)).length;
    if (!n) return null;
    s += Math.min(3, n);
  }
  if ("region_any" in d) s += 4;
  if ("religion_any" in d) s += 1;
  return s;
}

/** Archetypes scored for a record, best first; those that can't apply are left out (HER-057). */
export function scoreArchetypes(rec: CatalogueRecord): { id: string; score: number }[] {
  const f = features(rec);
  return ARCH.archetypes
    .map((a, i) => ({ a, i, s: score(a, f) }))
    .filter((x): x is { a: Archetype; i: number; s: number } => x.s !== null)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => ({ id: x.a.id, score: x.s }));
}

function fill<T>(obj: T, vals: Record<string, string>): T {
  if (typeof obj === "string") return (obj.includes("{") ? obj.replace(/\{(\w+)\}/g, (_, k: string) => vals[k] ?? `{${k}}`) : obj) as T;
  if (Array.isArray(obj)) return obj.map((x) => fill(x, vals)) as T;
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fill(v, vals)])) as T;
  return obj;
}

/** Python's round(): halves go to the even neighbour. */
function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff === 0.5) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

function scale(effects: Effect[], factor: number): Effect[] {
  return effects.map((e) => {
    const out = { ...e };
    if (lever(e.lever).unit === "pct" && typeof e.value === "number" && Math.abs(e.value) >= 5 && factor !== 1) {
      const v = roundHalfEven((e.value * factor) / 5) * 5;
      out.value = v || e.value;
    }
    return out;
  });
}

/** Scales percentages so an item spends close to its budget (HER-054: "scaled to the country's budget"). */
function fit(effects: Effect[], target: number): Effect[] {
  const pctOf = (es: Effect[]) => es.filter((e) => lever(e.lever).unit === "pct").reduce((n, e) => n + effectPoints(e), 0);
  const pct = pctOf(effects);
  const rest = effects.filter((e) => lever(e.lever).unit !== "pct").reduce((n, e) => n + effectPoints(e), 0);
  if (pct <= 0) return effects;
  let factor = Math.max(1, Math.min(2.5, (target * 0.97 - rest) / pct));
  let out = scale(effects, factor);
  while (effectsPoints(out) > target + 0.5 && factor > 1) {
    factor -= 0.1;
    out = scale(effects, factor);
  }
  return out;
}

function rescaleText(text: string, old: Effect[], next: Effect[]): string {
  old.forEach((o, i) => {
    const n = next[i]!;
    if (o.value !== n.value && typeof o.value === "number") text = text.replace(new RegExp(`(?<!\\d)${Math.abs(o.value)} %`), `${Math.abs(Number(n.value))} %`);
  });
  return text;
}

/** The first allowed age whose regions cover the country (HER-054). */
export function pickAge(options: readonly string[], regions: ReadonlySet<string>): string {
  for (const a of options) if ([...(AGE_REGIONS.get(a) ?? [])].some((r) => regions.has(r))) return a;
  return options[0]!;
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

function crc32(s: string): number {
  let c = ~0;
  for (const byte of new TextEncoder().encode(s)) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function legacyFor(cid: string, theme: Theme, used: Set<string>): Legacy {
  const pool = ARCH.legacies[theme];
  const i = crc32(`${cid}:${theme}`) % pool.length;
  for (let k = 0; k < pool.length; k++) {
    const lg = structuredClone(pool[(i + k) % pool.length]!) as Legacy;
    const id = `${cid}_${slug(lg.name)}`;
    if (!used.has(id)) {
      used.add(id);
      return { ...lg, id };
    }
  }
  const lg = structuredClone(pool[i]!) as Legacy;
  const id = `${cid}_${slug(lg.name)}_${used.size}`;
  used.add(id);
  return { ...lg, id };
}

function yearOf(s: unknown): number | null {
  const m = /1[4-9]\d\d/.exec(String(s ?? ""));
  return m ? Number(m[0]) : null;
}

function generatedAmbitions(rec: CatalogueRecord, arch: Archetype, f: Features, cat: Record<string, CatalogueRecord>): Ambition[] {
  const cid = rec.id;
  const usedLegacies = new Set<string>();
  const ids = new Set<string>();
  const out: Ambition[] = [];
  const add = (a: Omit<Ambition, "id" | "theme" | "legacy">, theme: Theme) => {
    const id = `${cid}_${slug(a.name)}`;
    if (ids.has(id)) return;
    ids.add(id);
    out.push({ ...a, id, theme, legacy: legacyFor(cid, theme, usedLegacies) } as Ambition);
  };
  const pathTheme = config.path_theme as Record<string, Theme>;
  const pathHint = config.path_hint as Record<Theme, string>;
  let paths = 0;
  for (const p of rec.event_connections?.possible_future_paths ?? []) {
    const th = pathTheme[p.chain_type ?? ""];
    if (!th || paths >= (rec.meta?.detail_tier === "B" ? 2 : 1)) continue;
    let ev: string | undefined;
    for (const k of p.event_keys ?? []) {
      const l = EVENT_LINKS[k];
      if (l && (l.match === "exact" || l.match === "equivalent")) ev = l.event_tree_ids[0];
      if (ev) break;
    }
    if (!ev) continue;
    const y = yearOf(p.earliest_plausible);
    const a: Omit<Ambition, "id" | "theme" | "legacy"> = {
      name: p.path.slice(0, 60).replace(/[ ,;]+$/, ""),
      hint: pathHint[th],
      text: `Make it your history: ${p.path.replace(/\.+$/, "")}.`,
      historical: true,
      stir: y ? { date: { min: Math.max(1444, y - 5) } } : { exists: { who: "this" } },
      goal: { event: { id: ev, by: "this" } },
      ...(y ? { window: [1444, Math.min(1939, y + 60)] as [number, number] } : {}),
    };
    add(a, th);
    paths++;
  }
  const dip = rec.gameplay.ai_personality?.diplomacy ?? {};
  const playable = (x: string) => (cat[x] && PLAYABLE.includes(cat[x]!.gameplay.representation.mode) ? cat[x]! : null);
  const rivals = (dip.likely_rivals ?? []).filter((x) => x !== cid && playable(x)).map((x) => playable(x)!);
  const partners = (dip.preferred_partners ?? []).filter((x) => x !== cid && playable(x)).map((x) => playable(x)!);
  if (rivals[0]) {
    const r = rivals[0];
    const rname = r.names.common_en;
    add({ name: `Outlast ${rname}`, hint: "An old enemy at the gate.", text: `See ${rname} fall, or make it your subject.`, historical: true, stir: { at_war: { who: "this", other: r.id } }, goal: { any: [{ not: { exists: { who: r.id } } }, { relation: { who: r.id, other: "this", type: "subject" } }] } }, "land");
  }
  if (rivals[1]) {
    const r = rivals[1];
    const rname = r.names.common_en;
    const capn = (r.historical.geography.capital?.name || rname).split(/[;(/,]/)[0]!.trim();
    add({ name: `Take ${capn}`, hint: "A rival's hearth.", text: `Hold ${capn}, the seat of ${rname}.`, historical: false, stir: { at_war: { who: "this", other: r.id } }, goal: { holds_place: { who: "this", place: capn } } }, "land");
  }
  if (partners[0]) {
    const p = partners[0];
    const pname = p.names.common_en;
    add({ name: `One crown with ${pname}`, hint: "A friend who could be family.", text: `Bring ${pname} under your crown, as a subject or in a union.`, historical: false, stir: { at_war: { who: p.id } }, goal: { any: [{ relation: { who: p.id, other: "this", type: "subject" } }, { relation: { who: "this", other: p.id, type: "personal_union" } }] } }, "crown");
  }
  const themes = [...arch.ambition_themes];
  if (f.size < 2.5 && !themes.includes("survival")) themes.unshift("survival");
  for (const th of [...themes, "land", "wealth", "trade"] as Theme[]) {
    if (out.length >= 5 && !arch.ambition_themes.slice(0, 2).includes(th)) break;
    if (out.length >= 6) break;
    add(structuredClone(ARCH.theme_ambitions[th]), th);
  }
  if (!out.some((a) => a.historical)) {
    const a = out.find((x) => x.theme === "survival" || x.theme === arch.ambition_themes[0]) ?? out[0];
    if (a) a.historical = true;
  }
  for (const a of out) a.historical ??= false;
  return out;
}

/**
 * Generates heritage for a catalogue record: the best archetype gives
 * birthright and burden, the second best (score 2 or more) may add a heyday;
 * names take the country's own words; percentages scale to its budget;
 * ambitions come from its rivals, partners, paths and themes (HER-053..057).
 */
export function generate(rec: CatalogueRecord, bonus: number, cat: Record<string, CatalogueRecord> = CATALOGUE_EXAMPLES): HeritageData {
  const cid = rec.id;
  const f = features(rec);
  const regions = macroRegions(f.region);
  const scored = scoreArchetypes(rec);
  const archOf = (id: string) => ARCH.archetypes.find((a) => a.id === id)!;
  const best = archOf(scored[0]!.id);
  const secondId = scored.slice(1).find((x) => x.score >= 2 && x.id !== best.id)?.id;
  const second = secondId ? archOf(secondId) : null;
  const budget = RULES.budget;

  const b = fill(structuredClone(best.birthright), f.fill);
  const bEff = fit(b.effects, budget.birthright + bonus);
  const birthright: Birthright = { ...b, text: rescaleText(b.text, b.effects, bEff), effects: bEff, id: `${cid}_${slug(b.name)}` };

  const heydays: Heyday[] = [];
  const agesUsed = new Set<string>();
  for (const a of [best, ...(second ? [second] : [])]) {
    for (const t of a.heydays) {
      const { age_options, ...h } = fill(structuredClone(t), f.fill);
      const age = pickAge(age_options, regions);
      if (agesUsed.has(age)) continue;
      agesUsed.add(age);
      const eff = fit(h.effects, budget.heyday + bonus);
      heydays.push({ ...h, text: rescaleText(h.text, h.effects, eff), effects: eff, age, id: `${cid}_${slug(h.name)}` });
    }
  }
  const bd = fill(structuredClone(best.burden), f.fill);
  const burden: Burden = { ...bd, id: `${cid}_${slug(bd.name)}`, turned: { ...bd.turned, id: `${cid}_${slug(bd.turned.name)}` } };
  return {
    id: cid,
    authored: false,
    archetype: best.id,
    secondary_archetype: second?.id ?? null,
    birthright,
    heydays: heydays.slice(0, RULES.heydays.max_per_country),
    burden,
    ambitions: generatedAmbitions(rec, best, f, cat),
  };
}

/** An authored file overrides the generated parts it defines (HER-058). */
export function mergeAuthored(generated: HeritageData, authored: Partial<HeritageData>): HeritageData {
  const out: HeritageData = { ...generated };
  if (authored.birthright) out.birthright = authored.birthright;
  if (authored.heydays) out.heydays = authored.heydays;
  if (authored.ambitions) out.ambitions = authored.ambitions.map((a) => ({ ...a, historical: a.historical ?? false }));
  if (authored.burden) out.burden = authored.burden;
  if (Object.keys(authored).some((k) => ["birthright", "heydays", "ambitions", "burden"].includes(k))) out.authored = true;
  return out;
}

// ---------------------------------------------------------------- place names (HER-044, D-HER-16)

/** Where a place name sits: a scenario-map capital or port of that name, else the heritage gazetteer's (national-strengths-places.json). */
export function placeLonLat(name: string, provinces: readonly { id: string; x?: number; y?: number }[] = []): { lon: number; lat: number } | null {
  const n = mapSetup.nations.find((x) => x.name === name);
  if (n) return { lon: n.capital[0]!, lat: n.capital[1]! };
  const port = (mapSetup.ports as unknown as [string, string, string][]).find((p) => p[0] === name);
  const prov = port ? provinces.find((p) => p.id === port[2]) : undefined;
  if (prov && prov.x !== undefined && prov.y !== undefined) return lonLatOf(prov.x, prov.y);
  const at = (gazetteer.places as unknown as Record<string, [number, number]>)[name];
  return at ? { lon: at[0], lat: at[1] } : null;
}

/**
 * Binds a heritage place name to one map province (D-HER-16): the land
 * province whose centre lies nearest the place. A name the map does not hold
 * stays listed in places-to-bind.md, and its condition is false until bound.
 */
export function bindPlace(name: string, provinces: readonly { id: string; x?: number; y?: number; terrain: string }[]): string | null {
  const at = placeLonLat(name, provinces);
  if (!at) return null;
  const { x, y } = pixelOf(at.lon, at.lat);
  let best: string | null = null;
  let dist = Infinity;
  for (const p of provinces) {
    if (p.terrain === "sea" || p.terrain === "ocean" || p.x === undefined || p.y === undefined) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < dist) {
      dist = d;
      best = p.id;
    }
  }
  return best;
}
