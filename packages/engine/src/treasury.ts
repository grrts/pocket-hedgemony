import type { World } from "./world.ts";
import { controller, type News } from "./war.ts";
import { nationPay, ungoverned } from "./recruit.ts";
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
}

export function createTreasuryState(P: number, N: number): TreasuryState {
  return {
    provinceTax: new Int8Array(P).fill(-1),
    nationTaxDefault: new Uint8Array(N).fill(NORMAL_TAX),
    nationDebt: new Float64Array(N),
    nationLedger: new Float64Array(N * LEDGER_LINES),
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
  const income = world.nationMonthlyIncome;
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
  for (let n = 0; n < world.nationCount; n++) {
    L[n * LEDGER_LINES + PAY] = -nationPay(world, n);
    L[n * LEDGER_LINES + INTEREST] = -monthlyInterest(world, n);
    let sum = 0;
    for (let k = 0; k < LEDGER_LINES; k++) sum += L[n * LEDGER_LINES + k]!;
    income[n] = sum;
  }
  if (!pay) return;
  for (let n = 0; n < world.nationCount; n++) world.nationTreasury[n] = world.nationTreasury[n]! + income[n]!;
}

/** Gold a realm could borrow now: up to a year's tax and trade (REALM-164), less what it owes. */
export function canBorrow(world: World, n: number): number {
  const year = 12 * (world.nationLedger[n * LEDGER_LINES + TAX]! + world.nationLedger[n * LEDGER_LINES + TRADE]!);
  return Math.max(0, loanCap(year, KNOWN) - world.nationDebt[n]!);
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

export function takeLoan(world: World, n: number, gold: number): string | null {
  if (!(gold > 0)) return "borrow some gold";
  if (gold > canBorrow(world, n) + 1e-9) return `lenders give at most ${canBorrow(world, n).toFixed(1)} gold more`;
  world.nationDebt[n] = world.nationDebt[n]! + gold;
  world.nationTreasury[n] = world.nationTreasury[n]! + gold;
  runLedger(world, false);
  return null;
}

export function repayLoan(world: World, n: number, gold: number): string | null {
  const amount = Math.min(gold, world.nationDebt[n]!);
  if (!(amount > 0)) return "nothing owed";
  if (amount > world.nationTreasury[n]!) return "not enough gold";
  world.nationDebt[n] = world.nationDebt[n]! - amount;
  world.nationTreasury[n] = world.nationTreasury[n]! - amount;
  runLedger(world, false);
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
      if (want > 0) takeLoan(world, n, want);
    } else if (world.nationDebt[n]! > 0) {
      const upkeep = 12 * (nationPay(world, n) - world.nationLedger[n * LEDGER_LINES + WAGES]!) * ai.repay_when_gold_above_years_upkeep;
      if (gold > upkeep) repayLoan(world, n, Math.min(world.nationDebt[n]!, gold - upkeep));
    }
  }
}
