import * as subj from "../subjects/index.ts";
import { eventsConfig, exists, inRegion, now, type Condition, type World } from "./model.ts";

/**
 * The condition language (vocabulary.yaml): logic all, any, not, at_least and
 * one evaluator per declared leaf type. Adding a type means adding one
 * evaluator (EVT-050); other contexts pass theirs in `ctx.conditions`.
 */

/** Who the roles are bound to, and `this` inside any_country / all_countries / count_countries. */
export interface Ctx {
  roles: Record<string, string[]>;
  this?: string;
  /** Extra leaf evaluators (other contexts' conditions, e.g. revolutions' grievance). */
  conditions?: Record<string, LeafEval>;
}

export type LeafEval = (params: Record<string, unknown>, w: World, ctx: Ctx) => boolean;

/** A role named in a condition that has no holder yet. */
/** Thrown when a condition names a role not yet bound; thrown often while binding, so it skips the stack trace. */
export class UnboundRole extends Error {
  constructor(role: string) {
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;
    super(role);
    Error.stackTraceLimit = limit;
  }
}

const LOGIC = new Set(["all", "any", "not", "at_least"]);

export function compare(a: number | string | undefined, op: string, b: number | string): boolean {
  if (a === undefined) return false;
  if (op === "==") return a === b;
  if (typeof a !== "number" || typeof b !== "number") return false;
  switch (op) {
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    default:
      throw new Error(`Unknown comparison: ${op}`);
  }
}

/** Resolves a target to the ids it names: `$role`, `this`, an entity id or a place key. */
export function resolve(target: unknown, ctx: Ctx): string[] {
  if (typeof target !== "string") throw new Error(`Bad target: ${JSON.stringify(target)}`);
  if (target.startsWith("$")) {
    const held = ctx.roles[target.slice(1)];
    if (!held) throw new UnboundRole(target);
    return held;
  }
  if (target === "this") {
    if (!ctx.this) throw new Error("`this` outside any_country / all_countries / count_countries");
    return [ctx.this];
  }
  return [target];
}

/** The type and params of a leaf, with the data's shorthands (`{event: id}`, `{exists: id}`, `{period_active: id}`). */
export function leaf(c: Condition): [string, Record<string, unknown>] {
  const known = parsed.get(c);
  if (known) return known;
  const entries = Object.entries(c);
  if (entries.length !== 1) throw new Error(`A condition leaf has one key: ${JSON.stringify(c)}`);
  const [type, raw] = entries[0]!;
  const out: [string, Record<string, unknown>] =
    raw !== null && typeof raw === "object" && !Array.isArray(raw) ? [type, raw as Record<string, unknown>] : [type, { [SHORT[type] ?? "value"]: raw }];
  parsed.set(c, out);
  return out;
}

const SHORT: Record<string, string> = { event: "id", event_active: "id", period_active: "id", age_active: "id", exists: "who", war_ongoing: "war" };
/** Leaves are read every month, so each is parsed once. */
const parsed = new WeakMap<Condition, [string, Record<string, unknown>]>();

function statOf(w: World, id: string, stat: string): number | string | undefined {
  const c = w.countries[id];
  if (c) return c.stats[stat];
  const p = w.places[id];
  return p?.stats[stat];
}

/** Provinces a place key covers: itself, or its listed provinces. */
function provincesOf(w: World, where: string): string[] {
  const p = w.places[where];
  return p?.provinces?.length ? p.provinces : [where];
}

function share(w: World, who: string, where: string, field: "owner" | "controller"): number {
  const ps = provincesOf(w, where);
  const held = ps.filter((k) => {
    const p = w.places[k];
    return p && (field === "owner" ? p.owner === who : (p.controller ?? p.owner) === who);
  });
  return ps.length ? held.length / ps.length : 0;
}

function atWar(w: World, a: string, b?: string): boolean {
  const c = w.countries[a];
  if (!c) return false;
  return b ? (c.enemies ?? []).includes(b) || (w.countries[b]?.enemies ?? []).includes(a) : (c.enemies ?? []).length > 0;
}

function hasRelation(w: World, a: string, b: string, type: string): boolean {
  const has = (x: string, y: string, t: string) => (w.countries[x]?.relations ?? []).some((r) => r.other === y && r.type === t);
  if (type === "war") return atWar(w, a, b);
  if (type === "subject") return has(a, b, "subject") || has(b, a, "overlord");
  if (type === "overlord") return has(a, b, "overlord") || has(b, a, "subject");
  return has(a, b, type) || (["alliance", "rivalry", "truce", "trade_pact", "personal_union"].includes(type) && has(b, a, type));
}

/** The kind of the subject bond behind a subject / overlord / personal_union relation (SUBJ-097), if the world keeps it. */
function subjectKind(w: World, a: string, b: string, type: string): string | undefined {
  if (!w.subjects || (type !== "subject" && type !== "overlord" && type !== "personal_union")) return undefined;
  return subj.relationByEvent(w.subjects, a, b, type).kind;
}

/**
 * Direct subjects of `id`, a head count or by reach weights (`by_reach: true`,
 * SUBJ-097). A subject the world keeps no bond for counts as the relations data's plain subject.
 */
function subjectCount(w: World, id: string, byReach: boolean): number {
  const mine = Object.keys(w.countries).filter((o) => o !== id && hasRelation(w, o, id, "subject"));
  if (!byReach) return mine.length;
  const t = now(w);
  const bondOf = (o: string, over: string) => (w.subjects?.[o]?.overlord === over ? w.subjects[o]! : subj.bondFromRelation(o, over, t));
  const list = mine.map((o) => bondOf(o, id));
  // their own subjects raise their weight (SUBJ-059)
  for (const o of mine) for (const x of Object.keys(w.countries)) if (x !== o && hasRelation(w, x, o, "subject")) list.push(bondOf(x, o));
  return subj.subjectCountByEvent(list, id, true);
}

function countries(w: World, where: unknown): string[] {
  return Object.entries(w.countries)
    .filter(([, c]) => c.exists !== false && (where === undefined || inRegion(c.region, where)))
    .map(([id]) => id);
}

function share01(map: Record<string, number> | undefined, id: string): number {
  return map?.[id] ?? 0;
}

/** True when an event occurred (with an outcome, within years, and a role bound to `by`). */
export function occurred(w: World, id: string, outcome?: unknown, withinYears?: unknown, by?: { role: string; who: string }): boolean {
  return w.history.some(
    (o) =>
      o.event === id &&
      (outcome === undefined || o.option === outcome) &&
      (withinYears === undefined || now(w) - (o.year * 12 + o.month - 1) <= Number(withinYears) * 12) &&
      (by === undefined || (o.roles[by.role] ?? []).includes(by.who)),
  );
}

function flagOn(w: World, who: string, id: string): boolean {
  if (w.flags.some((f) => f.on === who && f.id === id && (f.until === undefined || f.until > now(w)))) return true;
  return (w.countries[who]?.flags ?? []).includes(id) || (w.places[who]?.flags ?? []).includes(id);
}

const some = (ids: string[], f: (id: string) => boolean): boolean => ids.some(f);

/** One evaluator per condition type declared in vocabulary.yaml (EVT-025). */
export const CONDITIONS: Record<string, LeafEval> = {
  date: (p, w) => {
    const y = w.year + (w.month - 1) / 12;
    const at = (v: unknown, end: boolean): number => {
      const s = String(v);
      const [yy, mm] = s.split("-");
      return Number(yy) + (mm ? (Number(mm) - 1) / 12 : end ? 11 / 12 : 0);
    };
    return (p.min === undefined || y >= at(p.min, false)) && (p.max === undefined || y <= at(p.max, true));
  },
  exists: (p, w, ctx) => some(resolve(p.who, ctx), (id) => exists(w, id)),
  controls: (p, w, ctx) => some(resolve(p.who, ctx), (id) => share(w, id, String(p.where), "controller") >= Number(p.min_share ?? 1)),
  owns: (p, w, ctx) => some(resolve(p.who, ctx), (id) => share(w, id, String(p.where), "owner") >= Number(p.min_share ?? 1)),
  borders: (p, w, ctx) => some(resolve(p.who, ctx), (a) => resolve(p.other, ctx).some((b) => (w.countries[a]?.borders ?? []).includes(b) || (w.countries[b]?.borders ?? []).includes(a))),
  at_war: (p, w, ctx) => some(resolve(p.who, ctx), (a) => (p.other === undefined ? atWar(w, a) : resolve(p.other, ctx).some((b) => atWar(w, a, b)))),
  war_ongoing: (p, w) => w.wars[String(p.war)]?.ongoing === true,
  relation: (p, w, ctx) =>
    some(resolve(p.who, ctx), (a) => resolve(p.other, ctx).some((b) => hasRelation(w, a, b, String(p.type)) && (p.kind === undefined || subjectKind(w, a, b, String(p.type)) === p.kind))),
  opinion: (p, w, ctx) => some(resolve(p.who, ctx), (a) => resolve(p.other, ctx).some((b) => compare(w.countries[a]?.opinions?.[b] ?? 0, String(p.op), Number(p.value)))),
  stat: (p, w, ctx) => some(resolve(p.who, ctx), (id) => compare(statOf(w, id, String(p.stat)), String(p.op), p.value as number | string)),
  rank: (p, w, ctx) =>
    some(resolve(p.who, ctx), (id) => {
      const stat = String(p.stat);
      const mine = w.countries[id]?.stats[stat];
      if (mine === undefined) return false;
      const rank = 1 + Object.values(w.countries).filter((c) => c.exists !== false && (c.stats[stat] ?? -Infinity) > mine).length;
      return compare(rank, String(p.op), Number(p.value));
    }),
  government: (p, w, ctx) => some(resolve(p.who, ctx), (id) => w.countries[id]?.government === p.is),
  religion: (p, w, ctx) => some(resolve(p.who, ctx), (id) => (w.countries[id]?.religion ?? w.places[id]?.religion) === p.is),
  religion_share: (p, w, ctx) => some(resolve(p.where, ctx), (id) => compare(share01(w.places[id]?.religionShares, String(p.religion)), String(p.op), Number(p.value))),
  culture_group: (p, w, ctx) => some(resolve(p.who, ctx), (id) => (w.countries[id]?.cultureGroup ?? w.places[id]?.cultureGroup) === p.is),
  innovation: (p, w, ctx) =>
    some(resolve(p.who, ctx), (id) => {
      const c = w.countries[id];
      const v = c ? ((c.innovations ?? []).includes(String(p.id)) ? 1 : 0) : share01(w.places[id]?.innovations, String(p.id));
      return p.op === undefined ? v > 0 : compare(v, String(p.op), typeof p.value === "boolean" ? (p.value ? 1 : 0) : Number(p.value));
    }),
  ideology: (p, w, ctx) => some(resolve(p.who, ctx), (id) => compare(share01(w.countries[id]?.ideologies ?? w.places[id]?.ideologies, String(p.id)), String(p.op), Number(p.value))),
  tech: (p, w, ctx) => some(resolve(p.who, ctx), (id) => compare(w.countries[id]?.stats[`tech_${String(p.track)}`], String(p.op), Number(p.value))),
  colonial_presence: (p, w, ctx) => some(resolve(p.who, ctx), (id) => compare(w.countries[id]?.colonies?.[String(p.where)] ?? 0, String(p.op), Number(p.value))),
  trade_presence: (p, w, ctx) => some(resolve(p.who, ctx), (id) => compare(w.countries[id]?.tradePresence?.[String(p.hub)] ?? 0, String(p.op), Number(p.value))),
  rebels_active: (p, w, ctx) => some(resolve(p.who, ctx), (id) => (w.countries[id]?.rebels ?? []).some((t) => p.type === undefined || p.type === "any" || t === p.type)),
  subject_count: (p, w, ctx) => some(resolve(p.who, ctx), (id) => compare(subjectCount(w, id, p.by_reach === true), String(p.op), Number(p.value))),
  subject_loyalty: (p, w, ctx) =>
    some(resolve(p.who, ctx), (who) => resolve(p.target, ctx).some((t) => subj.subjectLoyaltyHolds(w.subjects ? subj.bondUnder(w.subjects, who, t) : undefined, String(p.op), String(p.step)))),
  event: (p, w) => occurred(w, String(p.id), p.outcome, p.within_years, p.by as { role: string; who: string } | undefined),
  event_active: (p, w) => w.running.some((r) => r.event === p.id),
  period_active: (p, w) => w.periods.includes(String(p.id)),
  age_active: (p, w) => w.ages.includes(String(p.id)),
  flag: (p, w, ctx) => some(p.who === undefined ? ["global"] : resolve(p.who, ctx), (id) => flagOn(w, id, String(p.id))),
  any_country: (p, w, ctx) => countries(w, p.where).some((id) => holds(p.condition as Condition, w, { ...ctx, this: id })),
  all_countries: (p, w, ctx) => countries(w, p.where).every((id) => holds(p.condition as Condition, w, { ...ctx, this: id })),
  count_countries: (p, w, ctx) =>
    compare(countries(w, p.where).filter((id) => holds(p.condition as Condition, w, { ...ctx, this: id })).length, String(p.op), Number(p.value)),
};

/** Evaluates a condition tree over the world (EVT-025). */
export function holds(c: Condition | null | undefined, w: World, ctx: Ctx = { roles: {} }): boolean {
  if (c === null || c === undefined) return true;
  if (Array.isArray(c)) return c.every((x) => holds(x as Condition, w, ctx));
  if ("all" in c) return (c.all as Condition[]).every((x) => holds(x, w, ctx));
  if ("any" in c) return (c.any as Condition[]).some((x) => holds(x, w, ctx));
  if ("not" in c) return !holds(c.not as Condition, w, ctx);
  if ("at_least" in c) {
    const a = c.at_least as { n: number; of: Condition[] };
    return a.of.filter((x) => holds(x, w, ctx)).length >= a.n;
  }
  const [type, params] = leaf(c);
  const fn = ctx.conditions?.[type] ?? CONDITIONS[type];
  if (!fn) throw new Error(`Undeclared condition type: ${type}`);
  return fn(params, w, ctx);
}

/** Like `holds`, but a condition naming an unbound role counts as not decidable (undefined). */
export function holdsIfBound(c: Condition | null | undefined, w: World, ctx: Ctx): boolean | undefined {
  try {
    return holds(c, w, ctx);
  } catch (e) {
    if (e instanceof UnboundRole) return undefined;
    throw e;
  }
}

/**
 * Like `holdsIfBound`, but decides what it can leaf by leaf: an `all` with one
 * false part is false, an `any` with one true part is true, whatever the unbound roles hold.
 */
export function holdsSoFar(c: Condition | null | undefined, w: World, ctx: Ctx): boolean | undefined {
  if (c === null || c === undefined) return true;
  const parts = Array.isArray(c) ? (c as Condition[]) : "all" in c ? (c.all as Condition[]) : "any" in c ? (c.any as Condition[]) : null;
  if (parts) {
    const want = !Array.isArray(c) && "any" in c;
    let open = false;
    for (const x of parts) {
      const v = holdsSoFar(x, w, ctx);
      if (v === want) return want;
      if (v === undefined) open = true;
    }
    return open ? undefined : !want;
  }
  if ("not" in c) {
    const v = holdsSoFar(c.not as Condition, w, ctx);
    return v === undefined ? undefined : !v;
  }
  return holdsIfBound(c, w, ctx);
}

/** Walks every leaf of a condition tree. */
export function leaves(c: unknown, visit: (type: string, params: Record<string, unknown>) => void): void {
  if (c === null || c === undefined || typeof c !== "object") return;
  if (Array.isArray(c)) return c.forEach((x) => leaves(x, visit));
  const o = c as Condition;
  for (const k of LOGIC) {
    if (k in o) {
      const inner = k === "at_least" ? (o[k] as { of: unknown }).of : o[k];
      return leaves(inner, visit);
    }
  }
  const [type, params] = leaf(o);
  visit(type, params);
  if (type === "any_country" || type === "all_countries" || type === "count_countries") leaves(params.condition, visit);
}

/** Declared condition types (vocabulary.yaml). */
export const DECLARED_CONDITIONS = Object.keys(eventsConfig.vocabulary.conditions);
