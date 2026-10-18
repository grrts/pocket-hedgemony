import type { Rng } from "../../rng.ts";
import { revolutionsConfig } from "./model.ts";
import { flags, hasFlag, type RevoState, type Stage } from "./state.ts";

/**
 * Funding a revolution abroad (REVO-060 … REVO-064, D-REVO-1, X-10): one
 * *Fund rebels* action owned by diplomacy, with revolutions §7.1's numbers.
 */

export interface Funding {
  funder: string;
  target: string;
  revolution: string;
  active: boolean;
  /** Gold paid so far. */
  paid: number;
  caught: boolean;
}

const FB = () => revolutionsConfig.foreign_backing;
const FLAG = () => revolutionsConfig.reference.foreign_backing.flag;

/** Only a Brewing or Ready card, seen through a diplomat, can be funded (REVO-060). */
export function canFundRevolution(stage: Stage, hasDiplomat: boolean): boolean {
  return hasDiplomat && (FB().fundable_stages as string[]).includes(stage);
}

/** Starts funding: sets `revolution_funded` on the target (REVO-062). */
export function fundRevolution(r: RevoState, funder: string, target: string, revolution: string): Funding {
  if (!hasFlag(r, target, FLAG())) flags(r, target).push(FLAG());
  return { funder, target, revolution, active: true, paid: 0, caught: false };
}

/** Gold a month: 1 % of the target's yearly income (REVO-061). */
export function fundingMonthlyCost(targetYearlyIncome: number): number {
  return Math.round(targetYearlyIncome * FB().cost_share_of_yearly_income);
}

/** The monthly chance of being caught: 3 %, more at peace and with officials in most provinces (REVO-063). */
export function caughtChance(o: { atPeace?: boolean; officialsShare?: number } = {}): number {
  let c = FB().catch_chance;
  if (o.atPeace) c += FB().catch_at_peace_add;
  if ((o.officialsShare ?? 0) >= FB().catch_officials_share) c += FB().catch_officials_add;
  return c;
}

/** Being caught ends the funding, clears the flag and gives the target an opinion reason and a war reason (REVO-064). */
export function catchFunding(r: RevoState, f: Funding): void {
  f.active = false;
  f.caught = true;
  const list = flags(r, f.target);
  const i = list.indexOf(FLAG());
  if (i >= 0) list.splice(i, 1);
  r.opinions.push({ from: f.target, to: f.funder, value: 0, reason: "Funded a revolution against us" });
  r.opinions.push({ from: f.target, to: f.funder, value: 0, reason: "caught_funding_rebels" });
  r.log.push({ type: "FundingCaught", revolution: f.revolution, funder: f.funder, target: f.target });
}

/** One month of funding: pay, then roll to be caught. */
export function fundingMonth(r: RevoState, f: Funding, targetYearlyIncome: number, rng: Rng, chance = caughtChance()): void {
  if (!f.active) return;
  f.paid += fundingMonthlyCost(targetYearlyIncome);
  if (rng.next() < chance) catchFunding(r, f);
}
