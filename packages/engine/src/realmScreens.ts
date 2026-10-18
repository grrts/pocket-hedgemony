import type { Snapshot } from "./protocol.ts";
import { STABILITY, type Stability, type StabilityPillar } from "./stability.ts";
import { TAX_RATES } from "./treasury.ts";

/**
 * The realm on screen, as pure models the client draws from (realm REALM-183
 * to REALM-186, REALM-198, REALM-203 to REALM-205; X-19): the top bar's
 * plaques, the General tab's Stability section, the Treasury tab and a
 * province's Tax line. Every decision the screens make (what shows, in which
 * order, what a tap opens, which button is marked) is taken here, so the
 * specs can check it without a browser; the client only turns it into HTML.
 */

/** The tabs of a country card. */
export type RealmTab = "general" | "treasury" | "food" | "diplomacy" | "military" | "mercenaries" | "officials" | "lords" | "provinces" | "learning";

/** What a tap opens: a tab of the country card (on one of its sections), the country card as it was left, or the news list. */
export type Opens = { card: "realm"; tab: RealmTab; section?: "stability" } | { card: "realm"; tab?: undefined } | { news: true } | null;

/**
 * Every plaque in the top bar is drawn the same height and in the same type,
 * and takes taps over a taller strip (REALM-205). The stylesheet's
 * `.hud .plaque` and `.hud button.plaque::after` rules carry these numbers.
 */
export const TOP_BAR_PLAQUE = {
  /** Height drawn, px. */
  drawn: 36,
  /** Height that takes a tap, at least, px (the bar's own height). */
  tap: 44,
  /** The one type every plaque is set in. */
  font: "600 20px/1 var(--body)",
} as const;

export type TopBarItem =
  | { key: "realm"; plaque: false; opens: Opens }
  | { key: "date"; plaque: true; opens: null }
  | { key: "gold"; plaque: true; opens: Opens; gold: number; perMonth: number; falling: boolean }
  | { key: "stability"; plaque: true; opens: Opens; step: number; words: string; heldBackBy: string[] }
  | { key: "war"; plaque: true; opens: Opens }
  | { key: "dispatches"; plaque: true; opens: Opens; count: number; urgent: boolean };

export type TopBarInput = Pick<Snapshot, "playerNation" | "nationTreasury" | "nationMonthlyIncome" | "stability" | "wars" | "calls" | "peaceOffers">;

/**
 * The top bar, in order: the realm's flag and name, the date, gold with its
 * change a month, stability, the war plaque while at war, and dispatches
 * (REALM-205). Gold opens the Treasury tab (REALM-185), stability the General
 * tab on its Stability section (REALM-203), war the Diplomacy tab. `unread` is
 * the news the player has not read yet.
 */
export function topBar(s: TopBarInput, unread: number, asks = 0): TopBarItem[] {
  const me = s.playerNation;
  const inc = s.nationMonthlyIncome[me]!;
  const atWar = s.wars.some((w) => w.attackers.includes(me) || w.defenders.includes(me));
  const items: TopBarItem[] = [
    { key: "realm", plaque: false, opens: { card: "realm" } },
    { key: "date", plaque: true, opens: null },
    { key: "gold", plaque: true, opens: { card: "realm", tab: "treasury" }, gold: s.nationTreasury[me]!, perMonth: inc, falling: inc < 0 },
  ];
  if (s.stability) items.push({ key: "stability", plaque: true, opens: { card: "realm", tab: "general", section: "stability" }, ...stabilityPlaque(s.stability) });
  if (atWar) items.push({ key: "war", plaque: true, opens: { card: "realm", tab: "diplomacy" } });
  items.push({ key: "dispatches", plaque: true, opens: { news: true }, count: unread + s.calls.length + s.peaceOffers.length + asks, urgent: s.calls.length > 0 || s.peaceOffers.length > 0 || asks > 0 });
  return items;
}

/** The stability plaque: the step in words (its index tints it: plain, amber, red cloth, blinking) and the pillars holding it back. */
export function stabilityPlaque(s: Stability): { step: number; words: string; heldBackBy: string[] } {
  return { step: s.step, words: STABILITY[s.step]!, heldBackBy: s.pillars.filter((p) => p.step === s.step && s.step > 0).map((p) => p.key) };
}

// ------------------------------------------------------------ the General tab's Stability section (REALM-204)

/** One line on what each stability step means, by step. */
export const STABILITY_NOTE = [
  "Lords, subjects, officials and provinces all hold.",
  "Something is slipping: look at the pillar marked Uneasy.",
  "A pillar is failing: lords or subjects turn away, posts stand empty or provinces rise.",
  "The realm is coming apart: revolt in the lords, subjects or provinces.",
] as const;

/** The tab that mends each pillar. */
export const PILLAR_TAB: Record<StabilityPillar["key"], RealmTab> = { lords: "lords", subjects: "diplomacy", officials: "officials", provinces: "provinces" };

const PILLAR_LABEL: Record<StabilityPillar["key"], string> = { lords: "Lords", subjects: "Subjects", officials: "Officials", provinces: "Provinces" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function loyaltyLine(c: Record<string, number>, none: string): string {
  const parts = (["Loyal", "Wavering", "Disloyal", "In revolt"] as const).filter((l) => c[l]).map((l) => `${c[l]} ${l.toLowerCase()}`);
  return parts.length ? parts.join(", ") : none;
}

/** A pillar's counts in words: lords and subjects by loyalty, officials as posts filled or empty, provinces by mood. */
export function pillarLine(p: StabilityPillar): string {
  const c = p.counts;
  if (p.key === "lords") return loyaltyLine(c, "No lords: all royal land");
  if (p.key === "subjects") return loyaltyLine(c, "No subjects");
  if (p.key === "officials") return c.empty ? `${plural(c.empty!, "royal post")} of ${c.posts} standing empty` : `All ${plural(c.posts!, "royal post")} filled`;
  if (c.rioting || c.plotting) return [c.plotting && `${c.plotting} plotting`, c.rioting && `${c.rioting} rioting`, c.grumbling && `${c.grumbling} grumbling`].filter(Boolean).join(", ");
  return c.grumbling ? `${c.grumbling} grumbling, the rest calm` : `All ${c.all} calm`;
}

export interface PillarRow {
  key: StabilityPillar["key"];
  label: string;
  line: string;
  step: number;
  words: string;
  /** The tab a tap opens: the one that mends this pillar. */
  opens: RealmTab;
}

export interface StabilitySectionView {
  step: number;
  words: string;
  note: string;
  pillars: PillarRow[];
}

/** The General tab's Stability section: the step, what it means and one row per pillar, each opening the tab that mends it. */
export function stabilitySection(s: Stability): StabilitySectionView {
  return {
    step: s.step,
    words: STABILITY[s.step]!,
    note: STABILITY_NOTE[s.step]!,
    pillars: s.pillars.map((p) => ({ key: p.key, label: PILLAR_LABEL[p.key], line: pillarLine(p), step: p.step, words: STABILITY[p.step]!, opens: PILLAR_TAB[p.key] })),
  };
}

// ------------------------------------------------------------ tax rates (REALM-183, REALM-184)

/** The rates as the buttons name them: None, Light, Normal, Heavy, Crushing. */
export const RATE_LABELS: readonly string[] = TAX_RATES.map((r) => r[0]!.toUpperCase() + r.slice(1));

export interface RateButton {
  /** Index into TAX_RATES, or -1 for the realm default. */
  rate: number;
  label: string;
  /** The chosen one. */
  on: boolean;
  /** What the button does, said without hover. */
  title: string;
}

/**
 * The row of rate buttons: for a province, Realm default and the five rates
 * (its own rate marked, or Realm default while it follows it); for the realm,
 * the five rates with the default marked.
 */
export function rateButtons(current: number, scope: "province" | "realm"): RateButton[] {
  const button = (rate: number, label: string): RateButton => ({
    rate,
    label,
    on: current === rate,
    title: rate < 0 ? "Follow the realm default" : `Tax ${scope === "realm" ? "every province that follows the default" : "this province"} ${label.toLowerCase()}`,
  });
  return [...(scope === "province" ? [button(-1, "Realm default")] : []), ...RATE_LABELS.map((l, k) => button(k, l))];
}

export interface TaxLineView {
  /** The rate it pays at (index into TAX_RATES) and its name. */
  rate: number;
  rateLabel: string;
  /** True while it follows the realm default rather than a rate of its own. */
  followsDefault: boolean;
  /** Gold it pays its holder a month. */
  goldPerMonth: number;
  buttons: RateButton[];
}

/** A province's Tax line on its Overview tab: its rate, whether it follows the realm default, its gold a month, and the rate buttons (REALM-183). */
export function taxLine(s: Pick<Snapshot, "provinceTax" | "taxDefault" | "provinceTaxGold">, p: number): TaxLineView {
  const own = s.provinceTax[p]!;
  const rate = own >= 0 ? own : s.taxDefault;
  return { rate, rateLabel: RATE_LABELS[rate]!, followsDefault: own < 0, goldPerMonth: s.provinceTaxGold[p]!, buttons: rateButtons(own, "province") };
}

// ------------------------------------------------------------ the Treasury tab (REALM-184, REALM-198)

const LEDGER_LABEL: Record<string, string> = { grain: "Grain sold", tax: "Tax", trade: "Trade", "army pay": "Army pay", officials: "Officials' wages", interest: "Debt interest", schools: "Schools", tribute: "Tribute", navy: "Ships and sailors" };

export interface LedgerRow {
  line: string;
  label: string;
  gold: number;
}

export interface TreasuryView {
  gold: number;
  /** Change a month: the sum of the ledger. */
  perMonth: number;
  /** How long the gold lasts: months while it falls, "empty" when it falls with none left, "grows" otherwise. */
  lasts: number | "empty" | "grows";
  income: number;
  spending: number;
  /** The month's ledger lines with gold, income first, then spending. */
  ledger: LedgerRow[];
  /** The realm tax default (index into TAX_RATES), how many of the player's provinces have a rate of their own, and the five rate buttons. */
  taxDefault: number;
  ownRates: number;
  rateButtons: RateButton[];
  debt: number;
  /** Interest a month on the debt. */
  interest: number;
  /** Most the realm may owe, and gold lenders would still give. */
  debtLimit: number;
  canBorrow: number;
  /** Share of the limit owed, 0 to 100. */
  owedPct: number;
  /** Interest a loan adds at once, %, and whether a loan now unsettles the lords. */
  loanPct: number;
  loanUnsettlesLords: boolean;
  /** Borrow buttons: the gold and what the realm will owe for it; disabled when lenders refuse. */
  borrow: { gold: number; owe: number; disabled: boolean }[];
  /** Repay buttons while in debt: 10 (when owing more) and all of it; disabled without the gold. */
  repay: { gold: number; all: boolean; disabled: boolean }[];
}

export type TreasuryInput = Pick<
  Snapshot,
  "playerNation" | "nationTreasury" | "ledger" | "provinceTax" | "provinceOwner" | "taxDefault" | "debt" | "debtLimit" | "canBorrow" | "loanDebtFactor" | "loanUnsettlesLords"
>;

/**
 * The Treasury tab of the player's country card, top to bottom: the purse
 * (gold, its change a month, how long it lasts), the month's ledger income
 * first, the realm tax default with its rate buttons, and the debt with its
 * interest, what lenders would still give, and borrow and repay buttons.
 */
export function treasuryView(s: TreasuryInput): TreasuryView {
  const me = s.playerNation;
  const gold = s.nationTreasury[me]!;
  const perMonth = s.ledger.reduce((t, l) => t + l.gold, 0);
  const row = (l: { line: string; gold: number }): LedgerRow => ({ line: l.line, label: LEDGER_LABEL[l.line] ?? l.line, gold: l.gold });
  const borrow = [10, 50].filter((g) => g < s.canBorrow).map((g) => ({ gold: g, owe: Math.round(g * s.loanDebtFactor), disabled: false }));
  const most = Math.floor(s.canBorrow);
  borrow.push({ gold: most, owe: Math.round(most * s.loanDebtFactor), disabled: s.canBorrow < 1 });
  return {
    gold,
    perMonth,
    lasts: perMonth < 0 && gold > 0 ? Math.max(1, Math.floor(gold / -perMonth)) : perMonth < 0 ? "empty" : "grows",
    income: s.ledger.reduce((t, l) => t + Math.max(0, l.gold), 0),
    spending: s.ledger.reduce((t, l) => t - Math.min(0, l.gold), 0),
    ledger: [...s.ledger.filter((l) => l.gold > 0).map(row), ...s.ledger.filter((l) => l.gold < 0).map(row)],
    taxDefault: s.taxDefault,
    ownRates: Array.from(s.provinceTax).filter((t, p) => t >= 0 && s.provinceOwner[p] === me).length,
    rateButtons: rateButtons(s.taxDefault, "realm"),
    debt: s.debt,
    interest: -(s.ledger.find((l) => l.line === "interest")?.gold ?? 0),
    debtLimit: s.debtLimit,
    canBorrow: s.canBorrow,
    owedPct: s.debtLimit > 0 ? Math.min(100, (s.debt / s.debtLimit) * 100) : s.debt > 0 ? 100 : 0,
    loanPct: Math.round((s.loanDebtFactor - 1) * 100),
    loanUnsettlesLords: s.loanUnsettlesLords,
    borrow,
    repay: s.debt > 0 ? [...(s.debt > 10 ? [{ gold: 10, all: false, disabled: gold < 10 }] : []), { gold: s.debt, all: true, disabled: gold < s.debt }] : [],
  };
}
