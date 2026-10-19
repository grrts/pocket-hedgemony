import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import { quarantineTaxFactor } from "./plague.ts";
import { controller, type News } from "./war.ts";
import { allNationPay, ungoverned } from "./recruit.ts";
import { emptyProvinceEffect } from "./domain/recruiting/index.ts";
import { interestPct, loanCap, realmConfig } from "./domain/realm/index.ts";
import { moodShare } from "./moods.ts";
import { throneShare } from "./throne.ts";
import { stabilityEffect } from "./stability.ts";
import { newLandUpkeep } from "./newlyTaken.ts";
import { taxCapped, taxRaised } from "./rebels.ts";
import { crownShare, inAnyWar, loyaltyStep } from "./lords.ts";
import { officialBonus } from "./officials.ts";
import { schoolUpkeepMonthly } from "./research.ts";
import { provinceUpkeep } from "./works.ts";
import { tradeLine, tradeTaxFactor } from "./trade.ts";
import { subjectPayments } from "./subjects.ts";
import { heritageFactor, heritageTaxReach } from "./heritage.ts";
import { navyCosts } from "./navy.ts";
import { governorWages } from "./colonies.ts";
import { W as WARFARE } from "./domain/warfare/index.ts";
import { empireDues, empireTax } from "./institutions.ts";
import { fursOf } from "./tribes.ts";

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
export const LEDGER = ["tax", "trade", "army pay", "officials", "interest", "works", "schools", "grain", "tribute", "navy", "furs", "new land"] as const;
export const LEDGER_LINES = LEDGER.length;
const TAX = 0;
const TRADE = 1;
const PAY = 2;
const WAGES = 3;
const INTEREST = 4;
const WORKS_UPKEEP = 5;
const SCHOOLS = 6;
const GRAIN = 7;
const TRIBUTE = 8;
const NAVY = 9;
const FURS = 10;
const NEW_LAND = 11;

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
  /** Monthly steps in a row each realm has been broke: gold below zero and nothing more to borrow (X-29). */
  nationBrokeMonths: Uint8Array;
  /** Year each realm last defaulted on its debts, -1 = never (X-29). */
  nationDefaultYear: Int16Array;
}

export function createTreasuryState(P: number, N: number): TreasuryState {
  return {
    provinceTax: new Int8Array(P).fill(-1),
    nationTaxDefault: new Uint8Array(N).fill(NORMAL_TAX),
    nationDebt: new Float64Array(N),
    nationLedger: new Float64Array(N * LEDGER_LINES),
    nationLoanMonth: new Int32Array(N).fill(-1e6),
    nationBrokeMonths: new Uint8Array(N),
    nationDefaultYear: new Int16Array(N).fill(-1),
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
/**
 * What of a province's tax and trade reaches the crown: a province whose official was commissioned
 * pays half (recruiting RECR-083, "Leave it"), rioting or plotting provinces pay half (PROV-162), and
 * a lord keeps his share (REALM-072), royal land far from the throne sends less (PROV-174), and a
 * Troubled or Crumbling realm collects less (X-29).
 */
export function crownTake(world: World, p: number): number {
  return (ungoverned(world, p) ? emptyProvinceEffect("Leave it").tax : 1) * moodShare(world, p) * crownShare(world, p) * throneShare(world, p) * stabilityEffect(world, world.provinceOwner[p]!).tax;
}

export function provinceTax(world: World, p: number, holder: number, share = crownTake(world, p)): number {
  const { economy } = world.rules.defines;
  // A tax collector brings more of it in (province officials table: +20 % reaching you).
  const collector = officialBonus(world, p, "Tax collector", "tax_reach");
  // Restricted faiths pay a quarter more on their share, Persecuted ones nothing (RELG-050, RELG-052); heritage may raise or lower what reaches the holder (tax_reach_pct, HER-078).
  // A busy province owes more: 1 % for every 4 points of its trade ratio (TRADE-088); a closed one pays half while its quarantine lasts (PROV-357).
  return world.provincePopulation[p]! * economy.goldPerThousandPeoplePerMonth * taxFactor(world, taxRateOf(world, p, holder)) * share * collector * world.provinceFaithTax[p]! * heritageTaxReach(world, p) * tradeTaxFactor(world, p) * quarantineTaxFactor(world, p);
}

/**
 * Tax a province sends whoever holds it this month: all of it to its owner, or, while it is
 * occupied, `warfare.occupation.tax_share` of what it would pay its owner to the occupier; the
 * rest is lost to the war (WAR-224, replacing the tax part of PROV-184).
 */
export function heldTax(world: World, p: number, share = crownTake(world, p)): number {
  const holder = controller(world, p);
  if (holder < 0) return 0;
  const owner = world.provinceOwner[p]!;
  if (holder === owner || owner < 0) return provinceTax(world, p, holder, share);
  return provinceTax(world, p, owner, share) * WARFARE.occupation.tax_share;
}

/** Monthly interest on a realm's debt (REALM-164: 10 % a year). */
export function monthlyInterest(world: World, n: number): number {
  return (world.nationDebt[n]! * interestPct(KNOWN) * heritageFactor(world, n, "loan_interest_pct")) / 100 / 12;
}

/**
 * Works out each realm's ledger for the month and its income (the sum of the
 * lines), and pays it into the treasury when a new month begins. With `only`,
 * just that realm's lines are worked out again (the player's, between months).
 */
export function runLedger(world: World, pay: boolean, only = -1): void {
  const L = world.nationLedger;
  const wage = world.rules.defines.economy.officialWagePerMonth;
  if (only >= 0) L.fill(0, only * LEDGER_LINES, (only + 1) * LEDGER_LINES);
  else L.fill(0);
  for (let p = 0; p < world.provinceCount; p++) {
    // The owner pays the official at his post, occupied or not.
    const owner = world.provinceOwner[p]!;
    if (only >= 0 && owner !== only && controller(world, p) !== only) continue;
    if (owner >= 0 && (only < 0 || owner === only)) {
      if (world.provinceOfficial[p]! >= 0) L[owner * LEDGER_LINES + WAGES] = L[owner * LEDGER_LINES + WAGES]! - wage * heritageFactor(world, owner, "official_wage_pct");
      // And the upkeep of its works (works).
      L[owner * LEDGER_LINES + WORKS_UPKEEP] = L[owner * LEDGER_LINES + WORKS_UPKEEP]! - provinceUpkeep(world, p);
      // And the garrisons and clerks that hold newly taken land (X-29).
      L[owner * LEDGER_LINES + NEW_LAND] = L[owner * LEDGER_LINES + NEW_LAND]! - newLandUpkeep(world, p);
    }
    // Whoever holds it collects the tax; an occupier only its share (WAR-224).
    const holder = controller(world, p);
    if (holder < 0 || (only >= 0 && holder !== only)) continue;
    L[holder * LEDGER_LINES + TAX] = L[holder * LEDGER_LINES + TAX]! + heldTax(world, p);
  }
  // Trade is what each realm's traders deposited last month, with market fees paid to it, less their upkeep (TRADE-064).
  for (let n = 0; n < world.nationCount; n++) if (only < 0 || n === only) L[n * LEDGER_LINES + TRADE] = tradeLine(world, n);
  // Each subject sends its overlord its kind's share, by tribute level and loyalty: a Vassal of its taxes, the rest of tax and trade (SUBJ-005).
  for (const [payer, receiver, share, taxOnly] of subjectPayments(world)) {
    if (only >= 0 && payer !== only && receiver !== only) continue;
    const gold = Math.max(0, L[payer * LEDGER_LINES + TAX]! + (taxOnly ? 0 : L[payer * LEDGER_LINES + TRADE]!)) * share;
    if (only < 0 || payer === only) L[payer * LEDGER_LINES + TRIBUTE] = L[payer * LEDGER_LINES + TRIBUTE]! - gold;
    if (only < 0 || receiver === only) L[receiver * LEDGER_LINES + TRIBUTE] = L[receiver * LEDGER_LINES + TRIBUTE]! + gold;
  }
  // After the Common Tax each member pays the Emperor its share of the month's tax, on the tribute line (INST-045).
  for (const [payer, receiver, share] of empireTax(world)) {
    if (only >= 0 && payer !== only && receiver !== only) continue;
    const gold = Math.max(0, L[payer * LEDGER_LINES + TAX]!) * share;
    if (only < 0 || payer === only) L[payer * LEDGER_LINES + TRIBUTE] = L[payer * LEDGER_LINES + TRIBUTE]! - gold;
    if (only < 0 || receiver === only) L[receiver * LEDGER_LINES + TRIBUTE] = L[receiver * LEDGER_LINES + TRIBUTE]! + gold;
  }
  const armyPay = allNationPay(world);
  const navy = navyCosts(world);
  const governors = governorWages(world);
  const furs = fursOf(world);
  for (let n = only >= 0 ? only : 0; n < (only >= 0 ? only + 1 : world.nationCount); n++) {
    L[n * LEDGER_LINES + PAY] = -armyPay[n]!;
    L[n * LEDGER_LINES + SCHOOLS] = -schoolUpkeepMonthly(world, n);
    L[n * LEDGER_LINES + NAVY] = -navy[n]!;
    // Colonial governors are officials: their wages join the officials' line (EXPL-025).
    L[n * LEDGER_LINES + WAGES] = L[n * LEDGER_LINES + WAGES]! - governors[n]!;
    // Grain sold to the treasury this month (REALM-026, castleFood.ts).
    L[n * LEDGER_LINES + GRAIN] = world.nationGrainGold[n]!;
    // The Emperor's dues from the members come in with the tribute (INST-032).
    L[n * LEDGER_LINES + TRIBUTE] = L[n * LEDGER_LINES + TRIBUTE]! + empireDues(world, n);
    // Furs and hides from the hunting grounds (TRIBE-014).
    L[n * LEDGER_LINES + FURS] = furs[n]!;
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
  // Lenders refuse a realm that defaulted for years after (X-29).
  if (lendersRefuse(world, n)) return 0;
  const year = 12 * (world.nationLedger[n * LEDGER_LINES + TAX]! + world.nationLedger[n * LEDGER_LINES + TRADE]!);
  return Math.max(0, loanCap(year, KNOWN) - world.nationDebt[n]!) / loanDebt(1);
}

/** Whether a loan now would unsettle the realm's lords: at most once in `debt.lords_waver_once_per_months` (REALM-189). */
export function loanUnsettlesLords(world: World, n: number): boolean {
  const month = world.date.year * 12 + world.date.month;
  return month - world.nationLoanMonth[n]! >= realmConfig.debt.lords_waver_once_per_months && world.lords.some((l) => l.nation === n && !l.gone);
}

/** Sets a province's rate (-1 = back to the default), or the realm's default when province is -1. */
export function setTax(world: World, n: number, province: number, rate: number, news: News[] = []): string | null {
  if (!Number.isInteger(rate) || rate < -1 || rate >= TAX_RATES.length) return "no such tax rate";
  if (province < 0 && rate < 0) return "the realm needs a default rate";
  if (province >= 0 && (province >= world.provinceCount || world.provinceOwner[province] !== n)) return "not your province";
  if (province >= 0) {
    const capped = taxCapped(world, province, rate);
    if (capped) return capped;
  }
  const was = province >= 0 ? taxRateOf(world, province, n) : world.nationTaxDefault[n]!;
  applyRate(world, n, province, rate, news);
  if ((province >= 0 ? taxRateOf(world, province, n) : rate) > was) taxRaised(world, n, province);
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
    world.lords.forEach((l, k) => l.nation === n && !l.gone && loyaltyStep(world, k, "crown_borrowed", news));
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
    if (isHuman(world, n) || world.nationGone[n]) continue;
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

// ------------------------------------------------------------ default (X-29)

const DEFAULT = realmConfig.debt.default;

/** Whether lenders still refuse realm n after its default. */
export function lendersRefuse(world: World, n: number): boolean {
  const y = world.nationDefaultYear[n]!;
  return y >= 0 && world.date.year - y < DEFAULT.lenders_refuse_years;
}

/** Whether realm n's default still weighs on its stability (Troubled), and the year that ends; null when not. */
export function defaultWeighs(world: World, n: number): number | null {
  const y = world.nationDefaultYear[n]!;
  return y >= 0 && world.date.year - y < DEFAULT.troubled_years ? y + DEFAULT.troubled_years : null;
}

/** Whether realm n is broke now: it owes lenders, its gold is below zero and they would not cover it. A realm that owes nothing has nothing to default on. */
export function isBroke(world: World, n: number): boolean {
  const gold = world.nationTreasury[n]!;
  return gold < 0 && world.nationDebt[n]! > 0 && canBorrow(world, n) < -gold;
}

/** Monthly steps a broke realm has left before it defaults, for the warning. */
export const monthsToDefault = (world: World, n: number): number => Math.max(0, DEFAULT.broke_months - world.nationBrokeMonths[n]!);

/**
 * The monthly debt check, after the AI has borrowed (X-29): a realm broke for
 * `debt.default.broke_months` monthly steps in a row defaults. Its debt is
 * gone and its gold set to nothing; each of its lords takes the crown
 * defaulted cause `lord_steps` times; it reads Troubled for `troubled_years`
 * and lenders refuse it for `lenders_refuse_years`. The player is warned at
 * each step before.
 */
export function monthlyDebts(world: World, news: News[]): void {
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n] || world.nationAsleep[n]) continue;
    if (!isBroke(world, n)) {
      world.nationBrokeMonths[n] = 0;
      continue;
    }
    world.nationBrokeMonths[n] = Math.min(255, world.nationBrokeMonths[n]! + 1);
    const left = monthsToDefault(world, n);
    if (left > 0) {
      if (isHuman(world, n)) news.push({ kind: "unrest", text: `The treasury is empty and lenders will give no more: unless gold comes in, the crown defaults on its debts in ${left === 1 ? "a month" : `${left} months`} (Treasury tab).`, nations: [n] });
      continue;
    }
    defaultOn(world, n, news);
  }
}

/** Realm n defaults on its debts. */
export function defaultOn(world: World, n: number, news: News[]): void {
  world.nationDebt[n] = 0;
  world.nationTreasury[n] = 0;
  world.nationBrokeMonths[n] = 0;
  world.nationDefaultYear[n] = world.date.year;
  // Each lord's provinces, counted once for all his steps (a great lord is known by them).
  const lands = new Map<number, number>();
  for (let p = 0; p < world.provinceCount; p++) {
    const l = world.provinceLord[p]!;
    if (l >= 0 && world.lords[l]!.nation === n) lands.set(l, (lands.get(l) ?? 0) + 1);
  }
  world.lords.forEach((l, k) => {
    if (l.nation !== n || l.gone) return;
    for (let i = 0; i < DEFAULT.lord_steps; i++) loyaltyStep(world, k, "crown_defaulted", news, lands.get(k) ?? 0);
  });
  sumLedger(world, n);
  const name = world.rules.nations[n]!.name;
  news.push({ kind: "unrest", text: isHuman(world, n) ? `The crown defaults on its debts. What it owed is gone, but the lords turn away, the realm is troubled until ${world.date.year + DEFAULT.troubled_years} and lenders refuse it until ${world.date.year + DEFAULT.lenders_refuse_years}.` : `${name} defaults on its debts.`, nations: [n] });
}

/** The player's road to default and after, for the Treasury tab (X-29). */
export function debtTrouble(world: World, n: number): { monthsLeft: number; refuseUntil: number; defaulted: number } {
  const broke = world.nationBrokeMonths[n]!;
  const y = world.nationDefaultYear[n]!;
  return { monthsLeft: broke > 0 ? Math.max(1, monthsToDefault(world, n)) : 0, refuseUntil: lendersRefuse(world, n) ? y + DEFAULT.lenders_refuse_years : -1, defaulted: y };
}

/** The rule's numbers, for the Treasury tab. */
export const DEFAULT_RULE = { brokeMonths: DEFAULT.broke_months, troubledYears: DEFAULT.troubled_years, refuseYears: DEFAULT.lenders_refuse_years } as const;
