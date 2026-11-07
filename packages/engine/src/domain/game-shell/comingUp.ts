/**
 * The Overview's "Coming up" strip (SHELL-188, SHELL-189, F-154): what will
 * happen to the realm soon without the player doing anything, soonest first,
 * so a week on Auto never hides a truce running out or a lord about to rise.
 * Pure: the client passes what it read from the snapshot.
 */
import { SHELL } from "./stack.ts";

export type ComingKind = "lord" | "truce" | "work" | "study" | "ambition" | "heir" | "regency";

export interface ComingInput {
  /** Truces with their realm and whole months left. */
  truces: { realm: string; nation: number; months: number }[];
  /** Building sites with whole months left. */
  works: { work: string; province: string; provinceIndex: number; months: number }[];
  /** The study and months left at today's pace (null when research does not move). */
  study: { name: string; months: number | null } | null;
  /** The heir and their age; the ruler's age and whether a regent rules for them. */
  heir: { name: string; age: number } | null;
  ruler: { age: number; regent: boolean } | null;
  /** Open ambitions the realm is near (HER-021). */
  ambitions: { name: string; near: boolean }[];
  /** The realm's lords who are not Loyal. */
  lords: { name: string; lord: number; loyalty: string }[];
}

export interface ComingItem {
  kind: ComingKind;
  text: string;
  /** Months to go, for the order; 0 for what may happen any day. */
  months: number;
  /** Where a tap goes: a page of the Realm book, a province's Build tab, a realm's Diplomacy tab or a lord's screen. */
  open: { page: string } | { build: number } | { realm: number } | { lord: number };
}

const R = SHELL.comingUp;

const inMonths = (m: number) => (m <= 0 ? "this month" : m === 1 ? "next month" : `in ${m} months`);

/** The strip's items, soonest first and at most `max` of them; empty when nothing is coming (SHELL-188). */
export function comingUp(v: ComingInput): ComingItem[] {
  const out: ComingItem[] = [];
  const soon = (m: number) => m <= R.horizon_months;
  for (const l of v.lords) if (l.loyalty === "Disloyal") out.push({ kind: "lord", text: `${l.name} may rise against you`, months: 0, open: { lord: l.lord } });
  for (const t of v.truces) if (soon(t.months)) out.push({ kind: "truce", text: `Truce with ${t.realm} ends ${inMonths(t.months)}`, months: t.months, open: { realm: t.nation } });
  for (const w of v.works) if (soon(w.months)) out.push({ kind: "work", text: `${w.work} in ${w.province} done ${inMonths(w.months)}`, months: w.months, open: { build: w.provinceIndex } });
  if (v.study?.months != null && soon(v.study.months)) out.push({ kind: "study", text: `${v.study.name} learned ${inMonths(v.study.months)}`, months: v.study.months, open: { page: "Research" } });
  // Ambitions within reach are one item, so they never crowd out what has a date.
  const near = v.ambitions.filter((a) => a.near);
  if (near.length) out.push({ kind: "ambition", text: near.length === 1 ? `Ambition within reach: ${near[0]!.name}` : `${near.length} ambitions within reach`, months: R.horizon_months, open: { page: "Heritage" } });
  const ofAge = R.of_age;
  if (v.ruler?.regent && v.ruler.age === ofAge - 1) out.push({ kind: "regency", text: "The ruler comes of age within a year", months: 12, open: { page: "Government" } });
  if (v.heir && v.heir.age === ofAge - 1) out.push({ kind: "heir", text: `${v.heir.name} comes of age within a year`, months: 12, open: { page: "Government" } });
  const order = R.order as readonly ComingKind[];
  return out.sort((a, b) => a.months - b.months || order.indexOf(a.kind) - order.indexOf(b.kind)).slice(0, R.max);
}
