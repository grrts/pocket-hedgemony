import * as dip from "../diplomacy/index.ts";
import { addHold, institutionsConfig, isMember, seatOf, type Empire, type Realms } from "./empire.ts";

/**
 * The Diet and the imperial reforms (INST-040 to INST-051): the Emperor calls
 * the Diet on the next reform of the ladder, the members vote by the reasons
 * count with the electors twice, and each passed reform binds every member,
 * the Emperor too (INST-034). Then the faith settlements and the Empire's end.
 * Pure like empire.ts; the engine feeds it the world.
 */

const E = institutionsConfig.empire;
const D = E.diet;

export type ReformId = "public_peace" | "imperial_court" | "circles" | "common_tax" | "imperial_army" | "hereditary_crown" | "one_realm";
export const REFORMS = E.reforms as { id: ReformId; name: string; base: number; effect: string }[];
export const reformName = (id: string) => REFORMS.find((r) => r.id === id)?.name ?? id;

/** A Diet sitting on one reform (INST-040, INST-041). */
export interface Diet {
  reform: ReformId;
  called: string;
  /** Month the votes are counted. */
  ends: string;
  /** The player's own vote, if cast; silence counts as no (INST-083). */
  playerVote?: "yes" | "no";
}

/** A ruling of the Imperial Court (INST-043) waiting on the losing side, or kept. */
export interface Ruling {
  id: string;
  plaintiff: string;
  defendant: string;
  province: string;
  /** For the plaintiff (the province moves) or against (nothing moves). */
  forPlaintiff: boolean;
  date: string;
  /** Month by which the defendant must hand the province over; silence hands it over. */
  answerOn: string;
  answer?: "yes" | "no";
}

/** The reform fields of the Empire; a save from before slice 2 gets them empty. */
export interface Reforms {
  reforms: ReformId[];
  diet: Diet | null;
  /** Month of the last Diet, "" when none has sat. */
  lastDiet: string;
  /** Breakers of the Peace and until when the members hold their aim on them (INST-042). */
  breakers: { realm: string; since: string; until: string }[];
  rulings: Ruling[];
  /** Imperial contingents raised for a war (INST-046): the army slot and the war. */
  contingents: { war: string; army: number; men: number }[];
  /** Years in a row the hold has stood at 0 at the count (INST-051). */
  zeroYears: number;
  /** The seat added after Westphalia went to this realm (INST-050), or "" when not yet. */
  eighthSeat: string;
}

export type ReformedEmpire = Empire & Reforms;

export function withReforms(e: Empire): ReformedEmpire {
  const r = e as ReformedEmpire;
  r.reforms ??= [];
  r.diet ??= null;
  r.lastDiet ??= "";
  r.breakers ??= [];
  r.rulings ??= [];
  r.contingents ??= [];
  r.zeroYears ??= 0;
  r.eighthSeat ??= "";
  return r;
}

export const passed = (e: Empire, id: ReformId) => !e.ended && ((e as ReformedEmpire).reforms ?? []).includes(id);

/** The next reform of the ladder, or null when all have passed (INST-040: in order). */
export function nextReform(e: ReformedEmpire): ReformId | null {
  return REFORMS.find((r) => !e.reforms.includes(r.id))?.id ?? null;
}

/** INST-040, INST-048: why the Emperor can't call the Diet now, or null. */
export function whyNotCallDiet(e: ReformedEmpire, date: string): string | null {
  if (e.ended || !e.holder) return "there is no Emperor";
  if (e.diet) return "the Diet already sits";
  const next = nextReform(e);
  if (!next) return "every reform has passed";
  if (e.hold < D.min_hold) return `needs hold ${D.min_hold} (it is ${e.hold})`;
  if (next === "one_realm" && e.hold < E.one_realm_hold) return `One Realm needs hold ${E.one_realm_hold} (it is ${e.hold})`;
  if (e.lastDiet && dip.monthsBetween(e.lastDiet, dip.monthOf(date)) < D.years_between * 12) {
    const left = D.years_between * 12 - dip.monthsBetween(e.lastDiet, dip.monthOf(date));
    return `the last Diet sat too recently (${Math.ceil(left / 12)} more year${Math.ceil(left / 12) === 1 ? "" : "s"})`;
  }
  return null;
}

export function callDiet(e: ReformedEmpire, date: string): Diet | null {
  if (whyNotCallDiet(e, date)) return null;
  const month = dip.monthOf(date);
  e.diet = { reform: nextReform(e)!, called: month, ends: dip.addMonths(month, D.months) };
  return e.diet;
}

/** What a member's Diet vote reads of the world besides standing (INST-041). */
export interface DietFacts {
  /** Members with a non-member holding imperial land next to them. */
  outsiderNext: (id: string) => boolean;
}

/** INST-041: a member's reasons to vote yes on a reform; the sum above 0 is a yes. */
export function dietReasons(d: dip.Diplomacy, e: ReformedEmpire, member: string, reform: ReformId, r: Realms, f: DietFacts): dip.Reason[] {
  const R = D.reasons;
  const rows: dip.Reason[] = [];
  const emperor = e.holder!;
  if (member === emperor) return [{ name: "Our own reform", number: 100 }];
  const base = REFORMS.find((x) => x.id === reform)!.base;
  rows.push({ name: `The reform: ${reformName(reform)}`, number: base });
  rows.push({ name: "The Empire's hold", number: Math.round(e.hold / R.hold_divisor) });
  const s = dip.standing(d, member, emperor);
  if (s) rows.push({ name: "Our standing toward the Emperor", number: Math.round(s / R.standing_divisor) });
  if (r.faith(member) && r.faith(member) === r.faith(emperor)) rows.push({ name: "Same faith", number: R.same_faith });
  if (f.outsiderNext(member)) rows.push({ name: "Outsiders hold imperial land next to us", number: R.outsider_next });
  const ours = r.soldiers(member), theirs = r.soldiers(emperor);
  if (ours > 0 && theirs > 0) {
    // A small member wants the Empire's shelter; one as strong as the Emperor fears his reach.
    const n = theirs >= ours ? Math.min(R.size_max, Math.floor(theirs / ours) * R.size_per_multiple) : -Math.min(R.size_max, Math.floor(ours / theirs) * R.size_per_multiple);
    if (n) rows.push({ name: n > 0 ? "We are small beside the Emperor" : "We are strong beside the Emperor", number: n });
  }
  return rows.filter((x) => x.number);
}

export const dietYes = (rows: dip.Reason[]) => rows.reduce((t, x) => t + x.number, 0) > 0;

/** INST-041: the votes, electors twice. `own` is the player's vote (silence counts as no). */
export function dietTally(d: dip.Diplomacy, e: ReformedEmpire, reform: ReformId, r: Realms, f: DietFacts, own?: { realm: string; vote: "yes" | "no" | undefined }): { yes: number; no: number; votes: Record<string, "yes" | "no"> } {
  const votes: Record<string, "yes" | "no"> = {};
  for (const m of e.members) votes[m] = own && own.realm === m ? (own.vote ?? "no") : dietYes(dietReasons(d, e, m, reform, r, f)) ? "yes" : "no";
  return { ...weigh(e, votes), votes };
}

/** The votes counted, an elector's twice (INST-041). */
export function weigh(e: Empire, votes: Record<string, "yes" | "no">): { yes: number; no: number } {
  let yes = 0, no = 0;
  for (const [m, v] of Object.entries(votes)) {
    const w = seatOf(e, m) ? D.elector_weight : 1;
    if (v === "yes") yes += w;
    else no += w;
  }
  return { yes, no };
}

/** INST-041: over half the votes pass it; passing spends 30 hold and failing 10. */
export function endDiet(e: ReformedEmpire, t: { yes: number; no: number }, date: string): { reform: ReformId; passed: boolean } | null {
  if (!e.diet) return null;
  const reform = e.diet.reform;
  const ok = t.yes * 2 > t.yes + t.no;
  if (ok) {
    e.reforms.push(reform);
    addHold(e, `The Diet passed the ${reformName(reform)}`, -D.pass_cost);
  } else addHold(e, `The Diet refused the ${reformName(reform)}`, -D.fail_cost);
  e.diet = null;
  e.lastDiet = dip.monthOf(date);
  return { reform, passed: ok };
}

// ---------------------------------------------------------------- what the reforms do

/** INST-042: a member that declares war on another member after the Public Peace. */
export function breakerOfPeace(e: ReformedEmpire, war: { declarer: string; target: string }): string | null {
  if (!passed(e, "public_peace")) return null;
  return isMember(e, war.declarer) && isMember(e, war.target) ? war.declarer : null;
}

export function markBreaker(e: ReformedEmpire, realm: string, date: string): void {
  const month = dip.monthOf(date);
  e.breakers = e.breakers.filter((b) => b.realm !== realm);
  e.breakers.push({ realm, since: month, until: dip.addMonths(month, E.breaker.aim_years * 12) });
}

export const isBreaker = (e: ReformedEmpire, realm: string, date: string) => e.breakers.some((b) => b.realm === realm && dip.monthOf(date) < b.until);

/** INST-043: the reasons the court weighs, for the plaintiff above 0. */
export function courtReasons(d: dip.Diplomacy, e: ReformedEmpire, plaintiff: string, defendant: string, aimSource: string): dip.Reason[] {
  const C = E.court;
  const rows: dip.Reason[] = [{ name: "The court's caution", number: C.base }, { name: `A war aim: ${aimSource}`, number: C.aim }];
  const emperor = e.holder;
  if (emperor) {
    const sp = plaintiff === emperor ? 100 : dip.standing(d, plaintiff, emperor);
    const sd = defendant === emperor ? 100 : dip.standing(d, defendant, emperor);
    const n = Math.round((sp - sd) / C.standing_divisor);
    if (n) rows.push({ name: n > 0 ? "The plaintiff stands better with the Emperor" : "The defendant stands better with the Emperor", number: n });
  }
  rows.push({ name: "The Empire's hold", number: Math.round(e.hold / C.hold_divisor) });
  return rows.filter((x) => x.number);
}

/** INST-043: why a member can't take its aim on another member's province to court, or null. */
export function whyNotCourt(e: ReformedEmpire, plaintiff: string, defendant: string): string | null {
  if (!passed(e, "imperial_court")) return "the Imperial Court has not passed";
  if (!isMember(e, plaintiff)) return "only members go to the court";
  if (!isMember(e, defendant)) return "they are not a member";
  if (plaintiff === defendant) return "not against yourself";
  if (e.rulings.some((x) => !x.answer && x.forPlaintiff && x.plaintiff === plaintiff && x.defendant === defendant)) return "a ruling already waits on them";
  return null;
}

export function rule(e: ReformedEmpire, o: { plaintiff: string; defendant: string; province: string; forPlaintiff: boolean; date: string }): Ruling {
  const month = dip.monthOf(o.date);
  const r: Ruling = { id: `ruling_${month}_${o.plaintiff}_${o.province}`, plaintiff: o.plaintiff, defendant: o.defendant, province: o.province, forPlaintiff: o.forPlaintiff, date: month, answerOn: dip.addMonths(month, E.court.answer_months) };
  if (!o.forPlaintiff) r.answer = "yes";
  e.rulings = [...e.rulings.filter((x) => x.answer === undefined || dip.monthsBetween(x.date, month) < 12), r];
  return r;
}

/** INST-044: the circle a member sits in, and its fellows. */
export function circleOf(id: string): string | null {
  for (const [name, members] of Object.entries(E.circles)) if (Array.isArray(members) && members.includes(id)) return name;
  return null;
}

export function circleFellows(e: ReformedEmpire, member: string): string[] {
  if (!passed(e, "circles")) return [];
  const c = circleOf(member);
  if (!c) return [];
  return ((E.circles as unknown as Record<string, string[]>)[c] ?? []).filter((m) => m !== member && isMember(e, m));
}

/** INST-045: what a member pays the Emperor this month of its tax, after the Common Tax. */
export const commonTax = (e: Empire, tax: number) => (passed(e, "common_tax") ? Math.max(0, tax) * E.common_tax : 0);

/** INST-046: the men a member sends to the Emperor's contingent. */
export const contingentMen = (soldiers: number) => Math.floor(soldiers * E.contingent);

// ---------------------------------------------------------------- the faith settlements and the end (INST-050, INST-051)

/** INST-050: the eighth seat goes to the largest member without one. */
export function westphaliaSeat(e: ReformedEmpire, sizeOf: (id: string) => number, nameOf: (id: string) => string = (id) => id): string | null {
  if (e.ended || e.eighthSeat) return null;
  const best = e.members.filter((m) => !seatOf(e, m) && m !== e.holder).sort((a, b) => sizeOf(b) - sizeOf(a) || a.localeCompare(b))[0] ?? e.members.filter((m) => !seatOf(e, m))[0];
  if (!best) return null;
  e.eighthSeat = best;
  e.seats.push({ name: nameOf(best), realm: best, church: false });
  return best;
}

/** INST-051: another year the hold stood at 0 (its value before the count), or not; dissolved after five in a row. */
export function zeroCount(e: ReformedEmpire, holdBefore: number): boolean {
  e.zeroYears = holdBefore <= 0 ? e.zeroYears + 1 : 0;
  return e.zeroYears >= E.dissolve_years_at_zero;
}

export function dissolve(e: ReformedEmpire, date: string, how: string): void {
  if (e.ended) return;
  e.ended = { date: dip.monthOf(date), how };
  e.diet = null;
  e.election = null;
  e.defence = [];
  e.breakers = [];
}

/** INST-051: whether a non-member that beats the Emperor may take the peace term *Dissolve the Empire*. */
export function whyNotDissolveTerm(d: dip.Diplomacy, e: Empire, winner: string): string | null {
  if (e.ended || !e.holder) return "there is no Empire";
  if (isMember(e, winner)) return "a member can't dissolve the Empire";
  if (!dip.eraAtLeast(d, E.dissolve_min_era)) return `only from era ${E.dissolve_min_era}`;
  return null;
}
