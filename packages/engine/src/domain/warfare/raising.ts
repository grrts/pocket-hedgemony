import type { Lord } from "../realm/index.ts";
import { disband, payThisMonth } from "./companies.ts";
import { W, knows, newCompany, type Army, type Company, type Known } from "./model.ts";

/**
 * Raising and keeping an army (spec §5.5): levies from recruiting, the lords'
 * summons, free companies, pay, rations and disbanding.
 */

/** When and where a levy gathers: the province's castle or town after 2 weeks; days along railways with W18 (WAR-037). */
export function levyGathering(opts: { known?: Known; railway?: boolean } = {}): { days: number | null; inDays: boolean } {
  if (knows(opts.known, "W18") && opts.railway) return { days: null, inDays: true };
  return { days: W.levy_gather_days, inDays: false };
}

/** Levies from recruiting arrive as levy-kind companies of levy foot at drill 0 (WAR-037). */
export function receiveLevy(men: number, gatherAt: string, home?: string): { company: Company; at: string; afterDays: number } {
  const company = newCompany({ kind: "levy", arm: "levy foot", men, ...(home === undefined ? {} : { home }) });
  return { company, at: gatherAt, afterDays: W.levy_gather_days };
}

export interface LordAnswer {
  men: number;
  days: number | null;
  mayCaptain: boolean;
  /** Months until he goes home; null = stays to the end of the war. */
  goesHomeAfter: number | null;
  refuses: boolean;
  angrier: boolean;
  rebelArmy: boolean;
}

/** A lord answers the summons by loyalty; a lord whose Want is the war aim comes and stays (WAR-038, WAR-039). */
export function callLord(lord: Pick<Lord, "loyalty" | "retinue" | "want">, opts: { warAim?: string; calledBefore?: boolean } = {}): LordAnswer {
  const L = W.lords;
  const wants = lord.want !== undefined && opts.warAim !== undefined && lord.want === opts.warAim;
  const none = { men: 0, days: null, mayCaptain: false, goesHomeAfter: null, refuses: false, angrier: false, rebelArmy: false };
  switch (lord.loyalty) {
    case "Loyal":
      return { ...none, men: lord.retinue, days: L.loyal_days, mayCaptain: true };
    case "Wavering":
      return { ...none, men: lord.retinue * L.wavering_share, days: L.wavering_days, goesHomeAfter: wants ? null : L.wavering_stay_months };
    case "Disloyal":
      return { ...none, refuses: true, angrier: opts.calledBefore === true };
    case "In revolt":
      return { ...none, rebelArmy: true };
  }
}

/** A wavering lord may take his retinue home mid-war; his lands occupied send him home to defend them (WAR-018, WAR-040). */
export function lordLeaves(army: Army, lord: string, why: { wavering?: boolean; landsOccupied?: boolean }): Company[] {
  if (!why.wavering && !why.landsOccupied) return [];
  const gone = army.companies.filter((c) => c.kind === "retinue" && c.lord === lord);
  army.companies = army.companies.filter((c) => !gone.includes(c));
  return gone;
}

/** The free-company groups found in a region (WAR-041). */
export const freeCompanyGroups = (region: string): { group: string; people: string }[] =>
  W.free_companies.filter((f) => f.regions.includes(region)).map((f) => ({ group: f.group, people: f.people }));

export interface Contract {
  company: Company;
  captain: string;
  people: string;
  months: number;
  upFront: number;
  monthlyPay: number;
}

/** Signing a contract: the free company joins for gold up front plus monthly pay, using no recruits (WAR-042). */
export function hire(army: Army, treasury: { gold: number }, c: Contract): { recruitsTaken: number; paid: number } {
  const company = { ...c.company, kind: "hired company" as const };
  army.companies.push(company);
  c.company = company;
  treasury.gold -= c.upFront;
  return { recruitsTaken: 0, paid: c.upFront };
}

/** A hired company leaves when its contract ends, its pay is owed two months, or an enemy outbids (WAR-043). */
export function hireEnds(c: Contract, state: { monthsServed: number; owed?: number; enemyOffer?: number }): boolean {
  return state.monthsServed >= c.months || (state.owed ?? 0) >= W.hired.loot_owed || (state.enemyOffer ?? 0) > c.monthlyPay;
}

/** The treasury pays every company except retinues and levies in their first 3 months (WAR-044). */
export const treasuryPays = (c: Company): boolean => payThisMonth(c).treasury;

/** Rations an army eats in a month: 2 a soldier on campaign (2.5 in winter), 3 a horse, 1 a prisoner, cut 5 % per Logistics (WAR-045, WAR-071, WAR-086). */
export function monthRations(a: { soldiers: number; horses?: number; prisoners?: number; logistics?: number; winter?: boolean }): number {
  const R = W.rations;
  const raw = a.soldiers * (a.winter ? R.winter_field : R.soldier_campaign) + (a.horses ?? 0) * R.horse + (a.prisoners ?? 0) * R.prisoner;
  return raw * (1 - W.logistics.food_cut * (a.logistics ?? 0));
}

/** Rations eaten at the weekly step at the end of each turn: a week's share of the month's (WAR-045, X-18). */
export const weekRations = (a: Parameters<typeof monthRations>[0]): number => (monthRations(a) * W.days_per_week) / W.days_per_month;

/** Where an army's food comes from: the province at home, its reserve abroad (WAR-045). */
export const foodSource = (atHome: boolean): "the province it stands in" | "its food reserve" => (atHome ? "the province it stands in" : "its food reserve");

/** Disbanded men go to their home province's recruit pool, arms to the store; with no slot free, they come home as homeless (WAR-046, WAR-048). */
export function disbandHome(c: Company, store: { arms: number }, home: { recruitPool: number; homeless: number; slotsFree: number }): void {
  const d = disband(c);
  store.arms += d.arms;
  const toPool = Math.min(d.men, Math.max(0, home.slotsFree));
  home.recruitPool += toPool;
  home.homeless += d.men - toPool;
  home.slotsFree -= toPool;
}
