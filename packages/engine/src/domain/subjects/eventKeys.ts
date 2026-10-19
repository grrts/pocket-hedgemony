/**
 * The event-tree keys the subjects context reads and writes (SUBJ-097,
 * D-SUBJ-16): `vassalize`, `release`, `relation subject | overlord |
 * personal_union`, `subject_count` (by reach weights only if the event asks),
 * and the keys adopted here, `subject_loyalty`, `add_subject_reason`,
 * `remove_subject_reason` and `change_subject_kind`. Each works on bonds kept
 * by subject id (a subject has one overlord); the events context and the game
 * call these. Numbers come from packages/rules/data/domain/subjects.json.
 */
import config from "../../../../rules/data/domain/subjects.json" with { type: "json" };
import {
  STEPS,
  addEventReason,
  kindFromName,
  loosen,
  mapRelationKind,
  newBond,
  reachWeight,
  release,
  removeReason,
  stepFromName,
  subjectFromEvent,
  tighterKind,
  type ActionResult,
  type Kind,
  type ReasonId,
  type Step,
  type SubjectBond,
  type TimedReason,
} from "./index.ts";

/** Bonds by subject id. */
export type Bonds = Map<string, SubjectBond> | Record<string, SubjectBond>;

function get(bonds: Bonds, subject: string): SubjectBond | undefined {
  return bonds instanceof Map ? bonds.get(subject) : bonds[subject];
}
function put(bonds: Bonds, b: SubjectBond): void {
  if (bonds instanceof Map) bonds.set(b.subject, b);
  else bonds[b.subject] = b;
}
function drop(bonds: Bonds, subject: string): void {
  if (bonds instanceof Map) bonds.delete(subject);
  else delete bonds[subject];
}
function all(bonds: Bonds): SubjectBond[] {
  return bonds instanceof Map ? [...bonds.values()] : Object.values(bonds);
}

/** The bond of `target` under `who`, or undefined when it is not who's subject. */
export function bondUnder(bonds: Bonds, who: string, target: string): SubjectBond | undefined {
  const b = get(bonds, target);
  return b && b.overlord === who ? b : undefined;
}

/** `vassalize who target type`: target becomes a subject of who, of the kind the type maps onto (SUBJ-015, SUBJ-090). */
export function vassalizeByEvent(bonds: Bonds, who: string, target: string, type: string, now: number): SubjectBond {
  const b = subjectFromEvent({ key: "vassalize", type }, target, who, now);
  put(bonds, b);
  return b;
}

/** `release who target`: the tie ends, the subject goes free and Friendly (SUBJ-046); null when target was not who's subject. */
export function releaseByEvent(bonds: Bonds, who: string, target: string): ReturnType<typeof release> | null {
  const b = bondUnder(bonds, who, target);
  if (!b) return null;
  drop(bonds, target);
  return release(b);
}

export type SubjectRelation = "subject" | "overlord" | "personal_union";

/**
 * `relation type subject`: whether `a` stands in the relation to `b`, and the
 * bond's kind. subject: a is b's subject; overlord: a is b's overlord;
 * personal_union: a Union either way (SUBJ-097).
 */
export function relationByEvent(bonds: Bonds, a: string, b: string, type: SubjectRelation): { holds: boolean; kind?: Kind } {
  const bond =
    type === "subject" ? bondUnder(bonds, b, a)
    : type === "overlord" ? bondUnder(bonds, a, b)
    : [bondUnder(bonds, b, a), bondUnder(bonds, a, b)].find((x) => x?.kind === "union");
  return bond ? { holds: true, kind: bond.kind } : { holds: false };
}

/** How many subjects of its own a realm holds. */
function ownSubjects(list: readonly SubjectBond[], who: string): number {
  return list.filter((b) => b.overlord === who).length;
}

/**
 * `subject_count`: the direct subjects of who, a head count, or by their reach
 * weights when the event says `by_reach: true` (SUBJ-057, SUBJ-059, SUBJ-097).
 */
export function subjectCountByEvent(bonds: Bonds | readonly SubjectBond[], who: string, byReach = false): number {
  const list = Array.isArray(bonds) ? (bonds as readonly SubjectBond[]) : all(bonds as Bonds);
  const mine = list.filter((b) => b.overlord === who);
  if (!byReach) return mine.length;
  return mine.reduce((n, b) => n + reachWeight(b, ownSubjects(list, b.subject)), 0);
}

/** A loyalty step as a rank: the higher, the more loyal (Loyal highest, In revolt 0). */
export function loyaltyRank(step: Step): number {
  return STEPS.length - 1 - STEPS.indexOf(step);
}

/**
 * `subject_loyalty who target op step`: tests target's loyalty to who against
 * a step, more loyal being higher (`>= wavering` is Loyal or Wavering); false
 * when target is not who's subject (SUBJ-097).
 */
export function subjectLoyaltyHolds(bond: SubjectBond | undefined, op: string, step: string): boolean {
  if (!bond) return false;
  const a = loyaltyRank(bond.loyalty);
  const b = loyaltyRank(stepFromName(step));
  switch (op) {
    case "==":
      return a === b;
    case "!=":
      return a !== b;
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

/** Whether a reason id is one of the config's reasons. */
export function isReasonId(id: string): id is ReasonId {
  return id in config.reasons;
}

/**
 * `add_subject_reason target reason months`: a reason from config by id, its
 * arrow from config, for the months the event gives (else the reason's own
 * months, else until removed) (SUBJ-035, SUBJ-097).
 */
export function addSubjectReasonByEvent(bond: SubjectBond, reason: string, months: number | undefined, now: number): TimedReason {
  if (!isReasonId(reason)) throw new Error(`Unknown subject reason: ${reason}`);
  const r = config.reasons[reason] as { arrow: number; months?: number };
  const m = months ?? r.months;
  return addEventReason(bond, { id: reason, arrow: r.arrow, ...(m === undefined ? {} : { months: m }) }, now);
}

/** `remove_subject_reason target reason`: removes a reason by id; true when one was there (SUBJ-035, SUBJ-097). */
export function removeSubjectReasonByEvent(bond: SubjectBond, reason: string): boolean {
  const had = bond.reasons.some((r) => r.id === reason);
  removeReason(bond, reason);
  return had;
}

/**
 * `change_subject_kind who target kind`: the kind is tightened (config
 * `tighten.order`, at once: the event stands in for the envoy) or loosened
 * (config `loosen.order`, with its *Loosened* reason). `kind` is the new kind,
 * or the word `tighten` / `loosen`. Any other change is refused (D-SUBJ-15).
 */
export function changeSubjectKindByEvent(bond: SubjectBond, kind: string, now: number): ActionResult & { from?: Kind; to?: Kind } {
  const from = bond.kind;
  const tighter = tighterKind(from);
  const looser = (config.loosen.order as Partial<Record<Kind, string>>)[from] as Kind | undefined;
  const want = kind === "tighten" ? tighter : kind === "loosen" ? looser : kindFromName(kind);
  if (want === undefined) return { ok: false, missing: `${from} cannot be ${kind === "tighten" ? "tightened" : "loosened"}` };
  if (want === from) return { ok: false, missing: `already ${from}` };
  if (want === tighter) {
    bond.kind = want;
    delete bond.tighten;
    return { ok: true, from, to: want };
  }
  if (want === looser) {
    const r = loosen(bond, now);
    return r.ok ? { ok: true, from, to: bond.kind } : r;
  }
  return { ok: false, missing: `${from} cannot become ${want}` };
}

/** A bond for a subject the tree knows only as a `subject` relation: read as a Vassal, as the relations data maps `vassal` (SUBJ-014). */
export function bondFromRelation(subject: string, overlord: string, now: number): SubjectBond {
  const m = mapRelationKind("vassal", false);
  return newBond({ subject, overlord, kind: "lord" in m ? "vassal" : m.kind, ties: "lord" in m ? [] : m.ties }, now);
}
