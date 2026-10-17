import { addMonths, compareDates, dateKey, dateKeyEnd, DATE_RE, monthOf, monthsBetween } from "./dates.ts";
import { config } from "./rules.ts";

/**
 * The relation model (diplomacy spec 4): nine relation types in three slots
 * per pair, the exclusivity matrix and the relation actions. This is a port of
 * country-relations/tools/relations_engine.py and validate.py; their tests are
 * the shared contract.
 */

export interface RelationRecord {
  id: string;
  type: string;
  source: string;
  target: string;
  direction: string;
  start_date?: string | null;
  expires_on?: string | null;
  origin?: string;
  locked?: boolean;
  note?: string | null;
  subject_kind?: string;
  autonomy?: string;
  [extra: string]: unknown;
}

export interface FactRecord {
  id: string;
  fact: string;
  source: string;
  target: string;
  direction: string;
  start_date?: string | null;
  [extra: string]: unknown;
}

/** Every stored relation and fact of a game, and the current date. */
export interface RelationGraph {
  date: string;
  relations: RelationRecord[];
  facts: FactRecord[];
  seq: number;
}

/** A relation action refused by its requirements. */
export class RuleError extends Error {}

const rules = config.relations;

export const RELATION_TYPES = Object.keys(rules.types);

export function layerOf(type: string): string | undefined {
  return rules.types[type]?.layer;
}

export function createGraph(date: string, relations: RelationRecord[] = [], facts: FactRecord[] = []): RelationGraph {
  return { date, relations: structuredClone(relations), facts: structuredClone(facts), seq: 0 };
}

const samePair = (r: { source: string; target: string }, a: string, b: string) =>
  (r.source === a && r.target === b) || (r.source === b && r.target === a);

// ---------------------------------------------------------------- queries

export function find(g: RelationGraph, type: string, a: string, b: string, ordered = false): RelationRecord[] {
  return g.relations.filter((r) => r.type === type && (ordered ? r.source === a && r.target === b : samePair(r, a, b)));
}

export function has(g: RelationGraph, type: string, a: string, b: string): boolean {
  return find(g, type, a, b).length > 0;
}

function stanceRecord(g: RelationGraph, a: string, b: string): RelationRecord | undefined {
  return g.relations.find(
    (r) => layerOf(r.type) === "stance" && ((r.source === a && r.target === b) || (r.direction === "mutual" && r.source === b && r.target === a)),
  );
}

/** The stance stored for a toward b, if any. */
export function storedStance(g: RelationGraph, a: string, b: string): string | null {
  return stanceRecord(g, a, b)?.type ?? null;
}

export function storedStanceRecord(g: RelationGraph, a: string, b: string): RelationRecord | undefined {
  return stanceRecord(g, a, b);
}

/** Stance of a toward b: stored, else implied (Hostile at war, Friendly allied), else the default (DIPL-005). */
export function stance(g: RelationGraph, a: string, b: string): string {
  const s = storedStance(g, a, b);
  if (s) return s;
  for (const [t, implied] of Object.entries(rules.implied_stance)) {
    if (!t.startsWith("$") && has(g, t, a, b)) return implied;
  }
  return rules.default_stance;
}

/** The state relation of a pair (At War, Truce or Alliance), if any. */
export function stateOf(g: RelationGraph, a: string, b: string): string | null {
  return g.relations.find((r) => layerOf(r.type) === "state" && samePair(r, a, b))?.type ?? null;
}

/** Overlord of a country, read from its Subject record; never stored (DIPL-001). */
export function overlord(g: RelationGraph, c: string): string | null {
  return g.relations.find((r) => r.type === "subject" && r.source === c)?.target ?? null;
}

export function subjectsOf(g: RelationGraph, c: string): string[] {
  return g.relations.filter((r) => r.type === "subject" && r.target === c).map((r) => r.source);
}

export function relationsBetween(g: RelationGraph, a: string, b: string): RelationRecord[] {
  return g.relations.filter((r) => samePair(r, a, b));
}

export function factsBetween(g: RelationGraph, a: string, b: string): FactRecord[] {
  return g.facts.filter((f) => samePair(f, a, b));
}

export function hasFact(g: RelationGraph, fact: string, a: string, b: string, ordered = false): boolean {
  return g.facts.some((f) => f.fact === fact && (ordered ? f.source === a && f.target === b : samePair(f, a, b)));
}

/** Countries a country is at war with. */
export function enemiesOf(g: RelationGraph, c: string): string[] {
  return g.relations.filter((r) => r.type === "at_war" && (r.source === c || r.target === c)).map((r) => (r.source === c ? r.target : r.source));
}

export function alliesOf(g: RelationGraph, c: string): string[] {
  return g.relations.filter((r) => r.type === "alliance" && (r.source === c || r.target === c)).map((r) => (r.source === c ? r.target : r.source));
}

// ---------------------------------------------------------------- primitives

export function newRecord(g: RelationGraph, type: string, a: string, b: string, direction: string, extra: Partial<RelationRecord> = {}): RelationRecord {
  g.seq++;
  const r: RelationRecord = { id: `g${g.seq}_${type}`, type, source: a, target: b, direction, start_date: monthOf(g.date), origin: "gameplay", ...extra };
  g.relations.push(r);
  return r;
}

export function removeRelation(g: RelationGraph, type: string, a: string, b: string): void {
  g.relations = g.relations.filter((r) => !(r.type === type && samePair(r, a, b)));
}

/** Removes a's stance toward b, splitting a mutual record so b's stance toward a survives. */
function clearPerspective(g: RelationGraph, a: string, b: string): void {
  const keep: RelationRecord[] = [];
  for (const r of g.relations) {
    if (layerOf(r.type) !== "stance" || !samePair(r, a, b)) {
      keep.push(r);
      continue;
    }
    if (r.direction === "one_way" && r.source === a) continue;
    if (r.direction === "mutual") {
      keep.push({ ...r, id: `${r.id}_split`, source: b, target: a, direction: "one_way" });
      continue;
    }
    keep.push(r);
  }
  g.relations = keep;
}

/** Stores a's stance toward b; the default stance is not stored; agreeing one-way stances merge into one mutual record. */
export function setStance(g: RelationGraph, a: string, b: string, type: string, note?: string): void {
  clearPerspective(g, a, b);
  if (type === rules.default_stance) return;
  const back = g.relations.find((r) => r.type === type && r.direction === "one_way" && r.source === b && r.target === a);
  if (back) {
    back.direction = "mutual";
    if (note && !back.note) back.note = note;
    return;
  }
  newRecord(g, type, a, b, "one_way", note ? { note } : {});
}

function applyEnds(g: RelationGraph, ends: readonly string[], a: string, b: string): void {
  for (const t of ends) {
    if (t === "all") g.relations = g.relations.filter((r) => r.source !== a && r.target !== a);
    else if (layerOf(t) === "stance") {
      for (const [x, y] of [[a, b], [b, a]] as const) if (stance(g, x, y) === t) clearPerspective(g, x, y);
    } else removeRelation(g, t, a, b);
  }
}

function checkRequires(g: RelationGraph, name: string, a: string, b: string): void {
  const req = rules.actions[name]?.requires ?? {};
  for (const t of req.no_relation ?? []) if (has(g, t, a, b)) throw new RuleError(`${name}: ${a} and ${b} have a ${t}; end it first`);
  if (req.not_subject_of_target && overlord(g, a) === b) throw new RuleError(`${name}: ${a} is ${b}'s subject; use independence_war`);
  if (req.not_subject_pair && (overlord(g, a) === b || overlord(g, b) === a)) throw new RuleError(`${name}: subject and overlord cannot do this`);
  for (const t of req.stance_not ?? []) {
    if (t === stance(g, a, b) || t === stance(g, b, a)) throw new RuleError(`${name}: stance between ${a} and ${b} is ${t}`);
  }
}

/**
 * Runs an action; if it would change or remove a locked relation and is not a
 * scripted event, everything is put back and the action is refused (DIPL-017).
 */
export function guarded<T>(g: RelationGraph, scripted: boolean, fn: () => T): T {
  const before = structuredClone(g.relations);
  const locked = before.filter((r) => r.locked);
  const out = fn();
  if (!scripted) {
    for (const r of locked) {
      const now = g.relations.find((x) => x.id === r.id);
      if (!now || JSON.stringify(now) !== JSON.stringify(r)) {
        g.relations = before;
        throw new RuleError(`relation ${r.id} is locked; only a scripted event may change it`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- actions

/** DIPL-022 … DIPL-024. */
export function declareWar(g: RelationGraph, a: string, b: string, extra: Partial<RelationRecord> = {}): RelationRecord {
  checkRequires(g, "declare_war", a, b);
  if (overlord(g, b) === a) throw new RuleError("declare_war: an overlord ends a subject relation by annexing or releasing it");
  const act = rules.actions.declare_war!;
  applyEnds(g, act.ends ?? [], a, b);
  const war = newRecord(g, "at_war", a, b, "mutual", extra);
  for (const [x, y] of [[a, b], [b, a]] as const) {
    if (storedStance(g, x, y) === null) setStance(g, x, y, act.sets_stance_if_missing ?? "hostile");
  }
  return war;
}

/** DIPL-025: the subject leaves the hierarchy; the at-war record remembers the kind for an overlord victory. */
export function independenceWar(g: RelationGraph, subject: string): string {
  const rec = g.relations.find((r) => r.type === "subject" && r.source === subject);
  if (!rec) throw new RuleError(`${subject} has no overlord`);
  const ov = rec.target;
  removeRelation(g, "subject", subject, ov);
  newRecord(g, "at_war", subject, ov, "mutual", { war_goal: "independence", former_kind: rec.subject_kind ?? "vassal", former_autonomy: rec.autonomy ?? "moderate" });
  setStance(g, subject, ov, "hostile");
  setStance(g, ov, subject, "hostile");
  return ov;
}

/** Ends an independence war: an overlord victory restores the subject (DIPL-025). */
export function endIndependenceWar(g: RelationGraph, subject: string, winner: string): void {
  const war = g.relations.find((r) => r.type === "at_war" && r.war_goal === "independence" && r.source === subject);
  if (!war) throw new RuleError(`${subject} fights no independence war`);
  const ov = war.target;
  if (winner === ov) {
    removeRelation(g, "at_war", subject, ov);
    makeSubject(g, subject, ov, String(war.former_kind), String(war.former_autonomy));
  } else {
    makePeace(g, subject, ov);
  }
}

export interface PeaceOptions {
  /** The winner that makes the other its subject. */
  vassalize?: string;
  kind?: string;
  autonomy?: string;
  truceMonths?: number;
}

/** DIPL-026: an implied Hostile becomes stored; a Truce (or a Subject) follows. */
export function makePeace(g: RelationGraph, a: string, b: string, o: PeaceOptions = {}): void {
  if (!has(g, "at_war", a, b)) throw new RuleError(`make_peace: ${a} and ${b} are not at war`);
  for (const [x, y] of [[a, b], [b, a]] as const) if (storedStance(g, x, y) === null) setStance(g, x, y, "hostile");
  removeRelation(g, "at_war", a, b);
  if (o.vassalize) {
    makeSubject(g, o.vassalize === a ? b : a, o.vassalize, o.kind ?? "vassal", o.autonomy ?? "moderate");
    return;
  }
  const months = o.truceMonths ?? rules.types.truce!.duration!.default_months!;
  newRecord(g, "truce", a, b, "mutual", { expires_on: addMonths(monthOf(g.date), months) });
}

/** DIPL-027: Hostile cools to Rival, the contested object left open. */
export function whitePeace(g: RelationGraph, a: string, b: string, truceMonths?: number): void {
  makePeace(g, a, b, truceMonths === undefined ? {} : { truceMonths });
  for (const [x, y] of [[a, b], [b, a]] as const) {
    if (stance(g, x, y) === "hostile") setStance(g, x, y, "rival", "Contested object left open by a white peace.");
  }
}

/** DIPL-028. */
export function extendTruce(g: RelationGraph, a: string, b: string, months: number): void {
  const tr = find(g, "truce", a, b)[0];
  if (!tr) throw new RuleError("extend_truce: no truce");
  tr.expires_on = addMonths(tr.expires_on ?? monthOf(g.date), months);
}

/** DIPL-029. */
export function breakTruce(g: RelationGraph, a: string, b: string): void {
  if (!has(g, "truce", a, b)) throw new RuleError("break_truce: no truce");
  removeRelation(g, "truce", a, b);
  setStance(g, b, a, "hostile");
  setStance(g, a, b, "hostile");
}

/** DIPL-031, DIPL-032. */
export function formAlliance(g: RelationGraph, a: string, b: string): void {
  checkRequires(g, "form_alliance", a, b);
  applyEnds(g, rules.actions.form_alliance!.ends ?? [], a, b);
  for (const [x, y] of [[a, b], [b, a]] as const) if (stance(g, x, y) === "friendly") clearPerspective(g, x, y);
  newRecord(g, "alliance", a, b, "mutual");
}

/** DIPL-033 (the relation part; diplomacy adds the penalty). */
export function breakAlliance(g: RelationGraph, a: string, b: string): void {
  if (!has(g, "alliance", a, b)) throw new RuleError("break_alliance: no alliance");
  removeRelation(g, "alliance", a, b);
}

/** DIPL-003, DIPL-034. */
export function makeSubject(g: RelationGraph, subject: string, ov: string, kind = "vassal", autonomy = "moderate"): RelationRecord {
  const cur0 = overlord(g, subject);
  if (cur0 !== null && cur0 !== ov) throw new RuleError(`make_subject: ${subject} already has overlord ${cur0}`);
  let cur: string | null = ov;
  while (cur) {
    if (cur === subject) throw new RuleError("make_subject: would create a cycle");
    cur = overlord(g, cur);
  }
  applyEnds(g, rules.actions.make_subject!.ends ?? [], subject, ov);
  for (const [x, y] of [[subject, ov], [ov, subject]] as const) if (stance(g, x, y) === "friendly") clearPerspective(g, x, y);
  const r = newRecord(g, "subject", subject, ov, "directed", { subject_kind: kind, autonomy });
  const antagonistic = [[subject, ov], [ov, subject]].some(([x, y]) => ["hostile", "rival"].includes(stance(g, x!, y!)));
  if (antagonistic) {
    r.note = "Subjected while antagonistic.";
    for (const x of g.relations) {
      if (samePair(x, subject, ov) && (x.type === "hostile" || x.type === "rival") && !x.note) x.note = "Antagonism carried into the subject relation.";
    }
  }
  return r;
}

/** DIPL-035. */
export function releaseSubject(g: RelationGraph, subject: string): string {
  const ov = overlord(g, subject);
  if (!ov) throw new RuleError("release_subject: not a subject");
  removeRelation(g, "subject", subject, ov);
  setStance(g, subject, ov, "friendly");
  setStance(g, ov, subject, "friendly");
  return ov;
}

/** DIPL-014: a rivalry needs a named contested object. */
export function setRival(g: RelationGraph, a: string, b: string, contested: string | undefined): void {
  if (!contested) throw new RuleError("set_rival: a rivalry needs a contested object");
  setStance(g, a, b, "rival", `Contested: ${contested}`);
}

/**
 * DIPL-036: ends friendship and sets Hostile. The perspective is OQ-DIPL-4;
 * this follows the newer diplomacy design (6.10): the insulted side's stance.
 */
export function insult(g: RelationGraph, a: string, b: string): void {
  // D-DIPL-4: the insulted side turns Hostile and any Friendly stance between them ends.
  if (stance(g, a, b) === "friendly") clearPerspective(g, a, b);
  setStance(g, b, a, "hostile");
}

/** DIPL-037: one step along Hostile → Rival → Neutral → Friendly. */
export function improveRelations(g: RelationGraph, a: string, b: string): void {
  const steps = rules.actions.improve_relations!.steps ?? [];
  const i = steps.indexOf(stance(g, a, b));
  if (i < 0 || i === steps.length - 1) return;
  const next = steps[i + 1]!;
  setStance(g, a, b, next, next === "rival" ? "Hostility cooled; the dispute remains." : undefined);
}

/** DIPL-038. */
export function countryDestroyed(g: RelationGraph, c: string): void {
  applyEnds(g, ["all"], c, "");
}

/**
 * DIPL-012: a gameplay effect that sets a relation directly: the newer relation
 * wins and ends the older ones it cannot coexist with.
 */
export function setRelation(g: RelationGraph, type: string, a: string, b: string): void {
  const forbidden = new Set(rules.compatibility.rules.filter((r) => r.result === "forbidden" && (r.a === type || r.b === type)).map((r) => (r.a === type ? r.b : r.a)));
  g.relations = g.relations.filter((r) => !(samePair(r, a, b) && (forbidden.has(r.type) || (layerOf(r.type) === "state" && layerOf(type) === "state"))));
  const dir = rules.types[type]!.direction === "directed" ? "directed" : "mutual";
  newRecord(g, type, a, b, dir);
}

/** DIPL-013: same-tick effects resolve by precedence; the first in the order wins. */
export function resolveSameTick(effects: readonly string[]): string {
  const order = rules.precedence.order;
  return [...effects].sort((x, y) => order.indexOf(x) - order.indexOf(y))[0]!;
}

/** Moves the calendar; truces whose term has passed end silently (DIPL-030). */
export function expireTruces(g: RelationGraph): RelationRecord[] {
  const now = monthOf(g.date);
  const ended = g.relations.filter((r) => r.type === "truce" && r.expires_on && monthOf(r.expires_on) <= now);
  g.relations = g.relations.filter((r) => !ended.includes(r));
  return ended;
}

/** Months a stored stance record has stood (from its start date). */
export function monthsStood(g: RelationGraph, r: RelationRecord): number {
  return r.start_date ? monthsBetween(r.start_date, g.date) : Infinity;
}

/** DIPL-041: a Rival stance may change only after its minimum time. */
export function rivalMayChange(g: RelationGraph, a: string, b: string): boolean {
  const r = stanceRecord(g, a, b);
  if (!r || r.type !== "rival") return true;
  return monthsStood(g, r) >= rules.types.rival!.duration!.min_months_before_change!;
}

/** DIPL-040: a stored Friendly stance unrefreshed for its decay time may decay. */
export function friendlyMayDecay(g: RelationGraph, a: string, b: string): boolean {
  const r = stanceRecord(g, a, b);
  return !!r && r.type === "friendly" && monthsStood(g, r) >= rules.types.friendly!.duration!.decay_months!;
}

/** DIPL-042: Hostile stances that have lasted their decay time become Rival. */
export function decayHostility(g: RelationGraph): void {
  const d = rules.types.hostile!.duration!;
  for (const r of [...g.relations]) {
    if (r.type !== "hostile" || r.locked || monthsStood(g, r) < d.decay_months!) continue;
    const pairs = r.direction === "mutual" ? [[r.source, r.target], [r.target, r.source]] : [[r.source, r.target]];
    for (const [x, y] of pairs) setStance(g, x!, y!, d.decays_to!, "Hostility decayed; the dispute remains.");
  }
}

/** DIPL-043: the AI must accept peace after this many months of exhaustion. */
export function aiMustAcceptPeace(exhaustedMonths: number): boolean {
  return exhaustedMonths >= rules.types.at_war!.duration!.war_exhaustion_peace_months!;
}

/** DIPL-045: monthly chance of a border-raid event while either side is Hostile. */
export function borderRaidChance(g: RelationGraph, a: string, b: string): number {
  return stance(g, a, b) === "hostile" || stance(g, b, a) === "hostile" ? rules.modifiers.hostile.border_raid_chance_per_month : 0;
}

/** Diplomatic facts never create or block relations (DIPL-015); they only feed reasons. */
export function addFact(g: RelationGraph, fact: string, a: string, b: string, extra: Partial<FactRecord> = {}): FactRecord {
  const dir = fact === "royal_marriage" || fact === "shared_ruler" ? "mutual" : fact === "trade_agreement" ? "mutual" : "directed";
  g.seq++;
  const f: FactRecord = { id: `gf${g.seq}_${fact}`, fact, source: a, target: b, direction: dir, start_date: monthOf(g.date), origin: "gameplay", ...extra };
  g.facts.push(f);
  return f;
}

export function removeFact(g: RelationGraph, fact: string, a: string, b: string, ordered = false): void {
  g.facts = g.facts.filter((f) => !(f.fact === fact && (ordered ? f.source === a && f.target === b : samePair(f, a, b))));
}

// ---------------------------------------------------------------- validator

export interface Report {
  errors: string[];
  warnings: string[];
  infos: string[];
}

export interface CheckOptions {
  historical?: boolean;
  referenceDate?: string;
}

/** Checks any list of relation records: the historical dataset or a game state (validate.py check_relations). */
export function checkRelations(relations: readonly Record<string, unknown>[], o: CheckOptions = {}): Report {
  const rep: Report = { errors: [], warnings: [], infos: [] };
  const err = (w: string, m: string) => rep.errors.push(`${w}: ${m}`);
  const historical = o.historical ?? false;
  const compat = new Map<string, string>();
  for (const r of rules.compatibility.rules) compat.set([r.a, r.b].sort().join("|"), r.result);
  const ids = new Map<string, number>();
  for (const r of relations) ids.set(String(r.id), (ids.get(String(r.id)) ?? 0) + 1);
  for (const [id, n] of ids) if (n > 1) err(id, `record id used ${n} times`);

  const byPair = new Map<string, Record<string, unknown>[]>();
  const stanceSlot = new Map<string, string>();
  const stateSlot = new Map<string, string>();
  const overlordOf = new Map<string, [string, string]>();
  const seenKeys = new Map<string, string>();
  const required = historical ? ["id", "type", "source", "target", "direction", "start_date", "origin", "explanation", "confidence", "source_ids"] : ["type", "source", "target", "direction"];

  for (const r of relations) {
    const rid = String(r.id ?? "<no id>");
    const t = String(r.type), s = String(r.source), g = String(r.target);
    for (const k of required) {
      const v = r[k];
      const missing = !(k in r) || v === "" || (Array.isArray(v) && v.length === 0);
      if (missing && !(k === "start_date" && k in r)) err(rid, `missing '${k}'`);
    }
    const td = rules.types[t];
    if (!td) {
      err(rid, `unknown relation type '${t}'`);
      continue;
    }
    if (!td.stored) {
      err(rid, `'${t}' is derived from '${td.derived_from}' and must not be stored; store the ${td.derived_from} record from the other side`);
      continue;
    }
    if (s === g) err(rid, "source and target are the same country");
    const allowed = { mutual: ["mutual"], directed: ["directed"], mutual_or_one_way: ["mutual", "one_way"] }[td.direction];
    if (!allowed.includes(String(r.direction))) err(rid, `direction '${String(r.direction)}' not allowed for ${t} (allowed: ${allowed.join(", ")})`);
    if (t === "subject") {
      if (!(String(r.subject_kind) in rules.subject_kinds)) err(rid, `subject_kind '${String(r.subject_kind)}' is not defined`);
      if (!rules.autonomy_levels.includes(String(r.autonomy))) err(rid, `autonomy '${String(r.autonomy)}' is not defined`);
    } else if ("subject_kind" in r || "autonomy" in r) err(rid, "subject_kind/autonomy only belong on subject records");

    if (historical) {
      if (!(String(r.confidence) in rules.confidence_levels)) err(rid, `confidence '${String(r.confidence)}' is not defined`);
      if (r.origin !== "historical_start") err(rid, "historical records must have origin 'historical_start'");
    } else if (!(String(r.origin) in rules.origin_values)) err(rid, `origin '${String(r.origin)}' is not defined`);

    for (const k of ["start_date", "expires_on"]) {
      const v = r[k];
      if (v !== undefined && v !== null && !DATE_RE.test(String(v))) err(rid, `${k} '${String(v)}' is not YYYY, YYYY-MM, YYYY-MM-DD or a decade like 1440s`);
    }
    const he = r.historical_end as { date?: string } | null | undefined;
    if (he !== undefined && he !== null && (typeof he !== "object" || !DATE_RE.test(String(he.date ?? "")))) err(rid, "historical_end must be {date, how}");
    const ref = o.referenceDate;
    if (ref) {
      const sd = r.start_date, ex = r.expires_on;
      if (typeof sd === "string" && DATE_RE.test(sd) && dateKey(sd) > ref) err(rid, `starts ${sd}, after the reference date ${ref}`);
      if (typeof ex === "string" && DATE_RE.test(ex) && dateKeyEnd(ex) < ref) err(rid, `expired ${ex}, before the reference date`);
      if (he && typeof he === "object" && DATE_RE.test(String(he.date ?? "")) && dateKeyEnd(String(he.date)) < ref) err(rid, `historically ended ${String(he.date)}, before the reference date`);
    }
    if (r.expires_on && t !== "truce") rep.warnings.push(`${rid}: expires_on is only enforced for truces`);
    if (t === "truce" && !r.expires_on && !r.expiration_condition) rep.infos.push(`${rid}: truce without a historical term; the configured default duration applies`);

    const pair = [s, g].sort().join("|");
    let key: string;
    if (t === "subject" || r.direction === "one_way") key = `${t}|${s}>${g}`;
    else key = `${t}|${pair}`;
    const dupKeys = [key];
    if (td.direction === "mutual_or_one_way") {
      if (r.direction === "mutual") dupKeys.push(`${t}|${pair}`, `${t}|${s}>${g}`, `${t}|${g}>${s}`);
      else dupKeys.push(`${t}|${pair}`);
    }
    for (const k of dupKeys) {
      const prev = seenKeys.get(k);
      if (prev !== undefined && prev !== rid) err(rid, `duplicates ${prev}`);
    }
    seenKeys.set(key, rid);
    byPair.set(pair, [...(byPair.get(pair) ?? []), r]);

    if (td.layer === "state") {
      if (stateSlot.has(pair)) err(rid, `pair already has a state relation (${stateSlot.get(pair)})`);
      stateSlot.set(pair, rid);
    } else if (td.layer === "stance") {
      const persp = r.direction === "mutual" ? [`${s}>${g}`, `${g}>${s}`] : [`${s}>${g}`];
      for (const p of persp) {
        if (stanceSlot.has(p)) err(rid, `${p.split(">")[0]} already has a stance towards ${p.split(">")[1]} (${stanceSlot.get(p)})`);
        stanceSlot.set(p, rid);
      }
    } else if (td.layer === "hierarchy") {
      const prev = overlordOf.get(s);
      if (prev) err(rid, `'${s}' already has overlord '${prev[0]}' (${prev[1]}); record extra tribute as a secondary_tribute fact`);
      else overlordOf.set(s, [g, rid]);
    }
  }

  for (const [subj, [ov, rid]] of overlordOf) {
    const chain = [subj];
    let cur = ov;
    while (overlordOf.has(cur)) {
      if (chain.includes(cur)) {
        err(rid, `subject cycle: ${[...chain, cur].join(" -> ")}`);
        break;
      }
      chain.push(cur);
      cur = overlordOf.get(cur)![0];
    }
  }

  for (const [pair, recs] of byPair) {
    for (let i = 0; i < recs.length; i++) {
      for (const b of recs.slice(i + 1)) {
        const a = recs[i]!;
        if (a.type === b.type) continue;
        const res = compat.get([String(a.type), String(b.type)].sort().join("|")) ?? "allowed";
        const where = `${String(a.id)} + ${String(b.id)}`;
        if (res === "forbidden") err(where, `${String(a.type)} and ${String(b.type)} cannot coexist between ${pair.replace("|", ", ")}`);
        else if (res === "redundant") rep.warnings.push(`${where}: ${String(a.type)} makes ${String(b.type)} redundant; store only the stronger relation`);
        else if (res === "allowed_with_note" && !(a.note || b.note)) err(where, `${String(a.type)} with ${String(b.type)} needs a note explaining why both hold`);
      }
    }
  }
  return rep;
}

/** Checks diplomatic fact records (validate.py check_facts, without the catalogue). */
export function checkFacts(facts: readonly Record<string, unknown>[]): Report {
  const rep: Report = { errors: [], warnings: [], infos: [] };
  const known = { ...rules.fact_types, ...rules.proposed_fact_types };
  const seen = new Set<string>();
  for (const f of facts) {
    const fid = String(f.id ?? "<no id>");
    const fact = String(f.fact);
    if (!(fact in known) || fact.startsWith("$")) rep.errors.push(`${fid}: unknown fact type '${fact}'`);
    if (fact in rules.types) rep.errors.push(`${fid}: a fact must not reuse a relation type name`);
    const key = f.direction === "mutual" ? `${fact}|${[String(f.source), String(f.target)].sort().join("|")}` : `${fact}|${String(f.source)}>${String(f.target)}`;
    if (seen.has(key)) rep.errors.push(`${fid}: duplicate fact`);
    seen.add(key);
    if (f.start_date !== undefined && f.start_date !== null && !DATE_RE.test(String(f.start_date))) rep.errors.push(`${fid}: bad start_date '${String(f.start_date)}'`);
  }
  return rep;
}

/** Validates a game state (gameplay mode). */
export function validateGraph(g: RelationGraph): Report {
  return checkRelations(g.relations);
}

export { compareDates };
