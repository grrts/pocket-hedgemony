import type { World } from "./world.ts";
import { controller, type News } from "./war.ts";
import { allNationPay, ungoverned } from "./recruit.ts";
import { emptyProvinceEffect } from "./domain/recruiting/index.ts";
import { interestPct, loanCap, realmConfig } from "./domain/realm/index.ts";
import { moodShare } from "./moods.ts";
import { crownShare, inAnyWar, loyaltyStep } from "./lords.ts";
import { officialBonus } from "./officials.ts";

/**
 * Tax rates and the treasury ledger (milestone 3): each province pays at its
 * own rate or the realm's default, and the treasury keeps a monthly ledger of
 * where the gold comes from and goes, with loans at interest.
 */

/** The tax steps, lightest first (REALM-174). */
export const TAX_RATES = ["none", "light", "normal", "heavy", "crushing"] as const;
export type TaxRateName = (typeof TAX_RATES)[number];
export const NORMAL_TAX = 2;
const HEAVY_TAX = 3;

/** Lines of the ledger, in the order the snapshot sends them. */
export const LEDGER = ["tax", "trade", "army pay", "officials", "interest"] as const;
export const LEDGER_LINES = LEDGER.length;
const TAX = 0;
const TRADE = 1;
const PAY = 2;
const WAGES = 3;
const INTEREST = 4;

/** Nothing invented yet: interest and loan caps are the realm context's for a realm without banks. */
const KNOWN: ReadonlySet<string> = new Set();

export interface TreasuryState {
  /** Each province's own tax rate (index into TAX_RATES), -1 = the realm default. */
  provinceTax: Int8Array;
  /** Each realm's default tax rate. */
  nationTaxDefault: Uint8Array;
  /** Gold each realm owes its lenders. */
  nationDebt: Float64Array;
  /** This month's ledger: LEDGER_LINES per realm, gold in (+) and out (−). */
  nationLedger: Float64Array;
  /** Month (year × 12 + month) of each realm's last loan that unsettled its lords, or a long time ago. */
  nationLoanMonth: Int32Array;
}

export function createTreasuryState(P: number, N: number): TreasuryState {
  return {
    provinceTax: new Int8Array(P).fill(-1),
    nationTaxDefault: new Uint8Array(N).fill(NORMAL_TAX),
    nationDebt: new Float64Array(N),
    nationLedger: new Float64Array(N * LEDGER_LINES),
    nationLoanMonth: new Int32Array(N).fill(-1e6),
  };
}

/** The rate a province pays at (its own, else its holder's default). */
export function taxRateOf(world: World, p: number, holder: number): number {
  const own = world.provinceTax[p]!;
  return own >= 0 ? own : holder >= 0 ? world.nationTaxDefault[holder]! : NORMAL_TAX;
}

/** Gold at a rate against gold at normal (defines.economy.taxRateFactor: none nothing, light half, heavy half again, crushing double). */
export function taxFactor(world: World, rate: number): number {
  return world.rules.defines.economy.taxRateFactor[rate]!;
}

/** Tax a province pays its holder in a month. */
export function provinceTax(world: World, p: number, holder: number): number {
  const { economy } = world.rules.defines;
  // A province whose official was commissioned pays half (recruiting RECR-083, "Leave it").
  // Rioting or plotting provinces pay half (PROV-162); a lord keeps his share (REALM-072).
  const share = (ungoverned(world, p) ? emptyProvinceEffect("Leave it").tax : 1) * moodShare(world, p) * crownShare(world, p);
  // A tax collector brings more of it in (province officials table: +20 % reaching you).
  const collector = officialBonus(world, p, "Tax collector", "tax_reach");
  return world.provincePopulation[p]! * economy.goldPerThousandPeoplePerMonth * taxFactor(world, taxRateOf(world, p, holder)) * share * collector;
}

/** Trade and market gold a province gives its holder in a month (not taxed by rate). */
export function provinceTrade(world: World, p: number): number {
  const share = (ungoverned(world, p) ? emptyProvinceEffect("Leave it").tax : 1) * moodShare(world, p) * crownShare(world, p);
  // A customs officer raises what trade brings (province officials table: +15 %).
  const customs = officialBonus(world, p, "Customs officer", "trade_ratio_gain");
  return world.provinceWealth[p]! * world.rules.defines.economy.goldPerWealthPerMonth * share * customs;
}

/** Monthly interest on a realm's debt (REALM-164: 10 % a year). */
export function monthlyInterest(world: World, n: number): number {
  return (world.nationDebt[n]! * interestPct(KNOWN)) / 100 / 12;
}

/**
 * Works out each realm's ledger for the month and its income (the sum of the
 * lines), and pays it into the treasury when a new month begins.
 */
export function runLedger(world: World, pay: boolean): void {
  const L = world.nationLedger;
  const wage = world.rules.defines.economy.officialWagePerMonth;
  L.fill(0);
  for (let p = 0; p < world.provinceCount; p++) {
    // The owner pays the official at his post, occupied or not.
    const owner = world.provinceOwner[p]!;
    if (owner >= 0 && world.provinceOfficial[p]! >= 0) L[owner * LEDGER_LINES + WAGES] = L[owner * LEDGER_LINES + WAGES]! - wage;
    // An occupier collects the tax (WAR occupation: tax, recruits, food, trade).
    const holder = controller(world, p);
    if (holder < 0) continue;
    L[holder * LEDGER_LINES + TAX] = L[holder * LEDGER_LINES + TAX]! + provinceTax(world, p, holder);
    L[holder * LEDGER_LINES + TRADE] = L[holder * LEDGER_LINES + TRADE]! + provinceTrade(world, p);
  }
  const armyPay = allNationPay(world);
  for (let n = 0; n < world.nationCount; n++) {
    L[n * LEDGER_LINES + PAY] = -armyPay[n]!;
    sumLedger(world, n);
  }
  if (!pay) return;
  for (let n = 0; n < world.nationCount; n++) world.nationTreasury[n] = world.nationTreasury[n]! + world.nationMonthlyIncome[n]!;
}

/** Debt a loan of this much gold adds: the gold plus its interest, all at once (REALM-188). */
export function loanDebt(gold: number): number {
  return gold * (1 + (interestPct(KNOWN) * realmConfig.debt.interest_added_at_once_years) / 100);
}

/** Puts a realm's interest line up to date and sums its ledger into its income. */
function sumLedger(world: World, n: number): void {
  const L = world.nationLedger;
  L[n * LEDGER_LINES + INTEREST] = -monthlyInterest(world, n);
  let sum = 0;
  for (let k = 0; k < LEDGER_LINES; k++) sum += L[n * LEDGER_LINES + k]!;
  world.nationMonthlyIncome[n] = sum;
}

/** Gold a realm could borrow now: lenders let it owe up to a year's tax and trade (REALM-164), so what it owes and the new loan's interest come off. */
export function canBorrow(world: World, n: number): number {
  const year = 12 * (world.nationLedger[n * LEDGER_LINES + TAX]! + world.nationLedger[n * LEDGER_LINES + TRADE]!);
  return Math.max(0, loanCap(year, KNOWN) - world.nationDebt[n]!) / loanDebt(1);
}

/** Whether a loan now would unsettle the realm's lords: at most once in `debt.lords_waver_once_per_months` (REALM-189). */
export function loanUnsettlesLords(world: World, n: number): boolean {
  const month = world.date.year * 12 + world.date.month;
  return month - world.nationLoanMonth[n]! >= realmConfig.debt.lords_waver_once_per_months && world.lords.some((l) => l.nation === n);
}

/** Sets a province's rate (-1 = back to the default), or the realm's default when province is -1. */
export function setTax(world: World, n: number, province: number, rate: number, news: News[] = []): string | null {
  if (!Number.isInteger(rate) || rate < -1 || rate >= TAX_RATES.length) return "no such tax rate";
  if (province < 0 && rate < 0) return "the realm needs a default rate";
  if (province >= 0 && (province >= world.provinceCount || world.provinceOwner[province] !== n)) return "not your province";
  applyRate(world, n, province, rate, news);
  // The ledger shows the new sums at once.
  runLedger(world, false);
  return null;
}

/**
 * Puts a rate in place. A lord whose land it raises to heavy or crushing
 * takes the heavy-taxes cause once (REALM-015, PROV-165).
 */
function applyRate(world: World, n: number, province: number, rate: number, news: News[]): void {
  const touched = province >= 0 ? [province] : [];
  if (province < 0) for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.provinceTax[p]! < 0 && world.provinceLord[p]! >= 0) touched.push(p);
  const before = touched.map((p) => taxRateOf(world, p, n));
  if (province < 0) world.nationTaxDefault[n] = rate;
  else world.provinceTax[province] = rate;
  const stirred = new Set<number>();
  touched.forEach((p, k) => {
    const now = taxRateOf(world, p, n);
    if (world.provinceLord[p]! >= 0 && now > before[k]! && now >= HEAVY_TAX) stirred.add(world.provinceLord[p]!);
  });
  for (const lord of stirred) loyaltyStep(world, lord, "heavy_taxes", news);
}

/**
 * Takes a loan: the gold comes at once, and so does the debt, the gold plus
 * its interest (REALM-188). A crown that borrows looks weak to its lords:
 * each of them takes the *crown borrowed* loyalty cause, at most once a year
 * (REALM-189).
 */
export function takeLoan(world: World, n: number, gold: number, news: News[] = []): string | null {
  if (!(gold > 0)) return "borrow some gold";
  if (gold > canBorrow(world, n) + 1e-9) return `lenders give at most ${canBorrow(world, n).toFixed(1)} gold more`;
  if (loanUnsettlesLords(world, n)) {
    world.nationLoanMonth[n] = world.date.year * 12 + world.date.month;
    world.lords.forEach((l, k) => l.nation === n && loyaltyStep(world, k, "crown_borrowed", news));
  }
  world.nationDebt[n] = world.nationDebt[n]! + loanDebt(gold);
  world.nationTreasury[n] = world.nationTreasury[n]! + gold;
  // Only the interest line changes.
  sumLedger(world, n);
  return null;
}

export function repayLoan(world: World, n: number, gold: number): string | null {
  const amount = Math.min(gold, world.nationDebt[n]!);
  if (!(amount > 0)) return "nothing owed";
  if (amount > world.nationTreasury[n]!) return "not enough gold";
  world.nationDebt[n] = world.nationDebt[n]! - amount;
  world.nationTreasury[n] = world.nationTreasury[n]! - amount;
  sumLedger(world, n);
  return null;
}

/**
 * The AI's monthly treasury (REALM-171): normal tax at peace and heavy at war,
 * a loan only when its gold is below zero, and repaying once it holds a
 * year's upkeep.
 */
export function aiTreasury(world: World, news: News[]): void {
  const ai = realmConfig.ai;
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || world.nationGone[n]) continue;
    const rate = TAX_RATES.indexOf((inAnyWar(world, n) ? ai.tax_at_war : ai.tax_at_peace) as TaxRateName);
    if (rate !== world.nationTaxDefault[n]) applyRate(world, n, -1, rate, news);
    const gold = world.nationTreasury[n]!;
    if (gold < ai.loan_when_gold_below) {
      const want = Math.min(canBorrow(world, n), -gold + 1);
      if (want > 0) takeLoan(world, n, want, news);
    } else if (world.nationDebt[n]! > 0) {
      const upkeep = -12 * (world.nationLedger[n * LEDGER_LINES + PAY]! + world.nationLedger[n * LEDGER_LINES + WAGES]!) * ai.repay_when_gold_above_years_upkeep;
      if (gold > upkeep) repayLoan(world, n, Math.min(world.nationDebt[n]!, gold - upkeep));
    }
  }
}
