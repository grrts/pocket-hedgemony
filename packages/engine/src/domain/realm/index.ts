import config from "../../../../rules/data/domain/realm.json" with { type: "json" };
import { effectsOf, eraCost, invention, tree } from "../research/index.ts";

const effects = (id: string) => tree().inventions.get(id)?.effects;

/**
 * Realm (domain/realm/spec.md): the country as a whole. Its card, treasury,
 * food network of castles, people and land, named lords, ruler and family,
 * standing abroad and win scores. Every stat is a count with the causes that
 * gain and lose it (REALM-001). Pure rules on plain data; no dice here except
 * through a passed-in Rng.
 */

export const realmConfig = config;

// ---------------------------------------------------------------- counted stats

export type Stat = keyof typeof config.stats;

/** +1 when the cause gains the stat, −1 when it loses it; throws for a cause the design does not list (REALM-001). */
export function directionOf(stat: Stat, cause: string): 1 | -1 {
  const s = config.stats[stat];
  if (s.gain.includes(cause)) return 1;
  if (s.lose.includes(cause)) return -1;
  throw new Error(`${stat} is not changed by ${cause}`);
}

/** Applies one cause to a count; `amount` comes from the context that owns the cause. Counts never go below zero. */
export function applyCause(value: number, stat: Stat, cause: string, amount: number): number {
  return Math.max(0, value + directionOf(stat, cause) * Math.abs(amount));
}

/** How a stat is gained and how it is lost, as the card lists it. */
export function gainsAndLosses(stat: Stat): { gain: string[]; lose: string[] } {
  return config.stats[stat];
}

// ---------------------------------------------------------------- dates and windows

export interface Day {
  year: number;
  month?: number;
  day?: number;
}

const dayKey = (d: Day): number => d.year * 10000 + (d.month ?? 1) * 100 + (d.day ?? 1);

export interface Dated {
  date: Day;
  count: number;
  kind?: string;
}

/** Sum of entries inside the last `years` years: Fallen 10, Oaths broken 30, Lands taken 20 (INV-REALM-5). */
export function withinWindow(entries: readonly Dated[], today: Day, window: keyof typeof config.windows): number {
  const years = config.windows[window];
  const from = dayKey({ ...today, year: today.year - years });
  return entries.filter((e) => dayKey(e.date) >= from && dayKey(e.date) <= dayKey(today)).reduce((n, e) => n + e.count, 0);
}

// ---------------------------------------------------------------- treasury

export interface Loan {
  lender: string;
  amount: number;
  /** Yearly interest in percent, set by the lender (OQ-REALM-13: no rates given). */
  interestPct: number;
}

export interface Treasury {
  gold: number;
  loans: Loan[];
  oaths: Dated[];
}

export function debt(t: Treasury): number {
  return t.loans.reduce((n, l) => n + l.amount, 0);
}

/** Taking a loan: gold up, debt owed to the lender (REALM-011). */
export function takeLoan(t: Treasury, lender: string, amount: number, interestPct: number): Loan {
  const loan = { lender, amount, interestPct };
  t.loans.push(loan);
  t.gold = applyCause(t.gold, "gold", "loan", amount);
  return loan;
}

/** Each year every loan costs its interest (REALM-012). Returns the gold paid. */
export function payInterest(t: Treasury): number {
  const due = t.loans.reduce((n, l) => n + (l.amount * l.interestPct) / 100, 0);
  t.gold -= due;
  return due;
}

/** Repaying lowers the debt; a loan repaid in full is gone (REALM-011). */
export function repay(t: Treasury, lender: string, amount: number): void {
  const loan = t.loans.find((l) => l.lender === lender);
  if (!loan) throw new Error(`no debt to ${lender}`);
  const paid = Math.min(amount, loan.amount, t.gold);
  loan.amount -= paid;
  t.gold = applyCause(t.gold, "gold", "repayment", paid);
  t.loans = t.loans.filter((l) => l.amount > 0);
}

/** The lender dying or being conquered ends the debt (REALM-011). */
export function lenderGone(t: Treasury, lender: string, cause: "lender_died" | "lender_conquered"): void {
  directionOf("debt", cause);
  t.loans = t.loans.filter((l) => l.lender !== lender);
}

/** Default wipes the debt and counts an oath broken (REALM-013). */
export function defaultOnDebt(t: Treasury, lender: string, date: Day): void {
  t.loans = t.loans.filter((l) => l.lender !== lender);
  t.oaths.push({ date, count: 1, kind: "debt_default" });
}

export type TaxRate = "light" | "normal" | "heavy" | "crushing";

/** A revolt forces a province's tax one step down (REALM-015). */
export function forceTaxDown(rate: TaxRate): TaxRate {
  const steps = config.tax_rates as TaxRate[];
  return steps[Math.max(0, steps.indexOf(rate) - 1)]!;
}

// ---------------------------------------------------------------- harvests and stores

export type Harvest = "failed" | "poor" | "normal" | "good" | "bumper";
const HARVESTS = config.harvest_steps as Harvest[];

/** A cause makes a harvest one step better or worse (REALM-021). */
export function harvestAfter(h: Harvest, cause: string): Harvest {
  const i = HARVESTS.indexOf(h) + directionOf("harvest", cause);
  return HARVESTS[Math.min(HARVESTS.length - 1, Math.max(0, i))]!;
}

/** With F9 *Maize, potato and cassava* a failed harvest becomes poor (REALM-057). */
export function withNewCrops(h: Harvest, known: ReadonlySet<string>): Harvest {
  for (const id of known) {
    const turn = effects(id)?.failed_harvest_becomes;
    if (turn && h === "failed") return turn as Harvest;
  }
  return h;
}

/** Irrigated rice land with working canals harvests twice a year (REALM-057, research F2). */
export function harvestsPerYear(p: { irrigatedRice: boolean; canalsWrecked: boolean }, known: ReadonlySet<string>): number {
  if (!p.irrigatedRice || p.canalsWrecked) return 1;
  for (const id of known) {
    const n = effects(id)?.harvests_per_year_irrigated_rice;
    if (n) return n;
  }
  return 1;
}

/** Weather is rolled once per region: every province of the region shares it (REALM-050). */
export function regionWeather(harvests: Record<string, Harvest>, regionOf: Record<string, string>, weather: Record<string, "bad" | "normal">): Record<string, Harvest> {
  const out: Record<string, Harvest> = {};
  for (const [p, h] of Object.entries(harvests)) out[p] = weather[regionOf[p]!] === "bad" ? harvestAfter(h, "weather") : h;
  return out;
}

/** A local store in months of food; a month of eating takes one month; at zero the province starves (REALM-022, REALM-023). */
export function eatMonth(store: { months: number; delivered?: number }): { months: number; starves: boolean } {
  const months = Math.max(0, store.months + (store.delivered ?? 0) - 1);
  return { months, starves: months <= 0 };
}

/** Herds move with their owners: a siege takes the castle store, never the herds (REALM-024). */
export function besiegedStores(p: { castleStore: number; herds: number }): { castleStoreBesieged: number; herdsBesieged: number } {
  return { castleStoreBesieged: p.castleStore, herdsBesieged: 0 };
}

/** What people, soldiers and horses eat, in men at home: campaigners eat double, a horse like three men (REALM-054). */
export function eatersInMen(e: { atHome?: number; onCampaign?: number; horses?: number }): number {
  return (e.atHome ?? 0) + (e.onCampaign ?? 0) * config.food.campaign_eat + (e.horses ?? 0) * config.food.horse_eats;
}

// ---------------------------------------------------------------- food policy

export type SpreadName = keyof typeof config.food.spread_patterns;
export type ShareRule = "By people" | "Frontier first" | "Capital first" | "Equal" | "Custom";

export interface FoodPolicy {
  collection: number;
  castleShares: ShareRule;
  spread: SpreadName;
  siegeReserve: number;
  armyRefill: string;
  famineRule: keyof typeof config.food.famine_rule_options;
  surplus: string;
}

export interface FoodPolicyScreen {
  realm: FoodPolicy;
  overrides: Record<string, Partial<FoodPolicy>>;
  /** Custom castle shares in percent, once accepted. */
  custom?: Record<string, number>;
}

/**
 * A Food policy screen filled from a preset (REALM-049). The design gives no
 * starting collection or reserve, so a screen always starts from a preset;
 * the famine rule starts Off and the surplus is kept, the first options listed.
 */
export function foodPolicyFromPreset(name: PresetName): FoodPolicyScreen {
  const screen: FoodPolicyScreen = {
    realm: { famineRule: "Off", surplus: config.food.surplus_default } as FoodPolicy,
    overrides: {},
  };
  applyPreset(screen, name);
  return screen;
}

function checkSetting<K extends keyof FoodPolicy>(key: K, value: FoodPolicy[K]): void {
  const f = config.food;
  const allowed: Record<keyof FoodPolicy, readonly unknown[]> = {
    collection: f.collection_options,
    castleShares: f.castle_share_rules,
    spread: Object.keys(f.spread_patterns),
    siegeReserve: f.siege_reserve_options,
    armyRefill: f.army_refill_options,
    famineRule: Object.keys(f.famine_rule_options),
    surplus: f.surplus_options,
  };
  if (!allowed[key].includes(value)) throw new Error(`${String(value)} is not a ${key} option`);
}

/** Sets a realm-wide default (REALM-040). */
export function setFoodPolicy<K extends keyof FoodPolicy>(screen: FoodPolicyScreen, key: K, value: FoodPolicy[K]): void {
  checkSetting(key, value);
  screen.realm[key] = value;
}

/** Gives one castle its own value; it replaces the default for that castle only (INV-REALM-3). */
export function overrideCastle<K extends keyof FoodPolicy>(screen: FoodPolicyScreen, castle: string, key: K, value: FoodPolicy[K]): void {
  checkSetting(key, value);
  (screen.overrides[castle] ??= {})[key] = value;
}

/** The policy one castle follows. */
export function castlePolicy(screen: FoodPolicyScreen, castle: string): FoodPolicy {
  return { ...screen.realm, ...screen.overrides[castle] };
}

export type PresetName = keyof typeof config.food.presets;

/** A preset fills the whole screen at once (REALM-049). */
export function applyPreset(screen: FoodPolicyScreen, name: PresetName): void {
  const p = config.food.presets[name] as Partial<FoodPolicy>;
  screen.realm = { ...screen.realm, ...p };
}

/** Custom castle shares are accepted only when they sum to 100 % (INV-REALM-4). */
export function setCustomShares(screen: FoodPolicyScreen, shares: Record<string, number>): boolean {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 1e-9) return false;
  screen.custom = { ...shares };
  screen.realm.castleShares = "Custom";
  return true;
}

/** The collection share of a surplus goes to the castle; the rest stays local (REALM-041). */
export function collect(surplus: number, collectionPct: number): { sent: number; kept: number } {
  const sent = (surplus * collectionPct) / 100;
  return { sent, kept: surplus - sent };
}

/** A lord's castle follows the policy by loyalty: loyal all of it, wavering half, disloyal none (REALM-048). */
export function lordCollection(collectionPct: number, loyalty: Loyalty): number {
  return collectionPct * (config.food.lords_castles as Record<Loyalty, number>)[loyalty];
}

/**
 * Divides collected food between castles by the castle-share rule (REALM-042).
 * "Frontier first" and "Capital first" say only that the frontier or the capital
 * gets more; how much more is not given, so they are refused here.
 */
export function castleShares(rule: ShareRule, castles: { id: string; people: number }[], custom?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  if (rule === "Equal") castles.forEach((c) => (out[c.id] = 1 / castles.length));
  else if (rule === "By people") {
    const total = castles.reduce((n, c) => n + c.people, 0);
    castles.forEach((c) => (out[c.id] = c.people / total));
  } else if (rule === "Custom") {
    if (!custom) throw new Error("custom shares not set");
    castles.forEach((c) => (out[c.id] = (custom[c.id] ?? 0) / 100));
  } else throw new Error(`${rule}: how much more is not given`);
  return out;
}

/** The spread pattern in percent: own province, next ring, ring beyond (REALM-043). */
export function spreadPattern(name: SpreadName): [number, number, number] {
  return config.food.spread_patterns[name] as [number, number, number];
}

/** Food a castle can hand out after its siege reserve (REALM-044, REALM-053). */
export function spreadable(storeMonths: number, reserveMonths: number): number {
  return Math.max(0, storeMonths - reserveMonths);
}

/**
 * Hands food out by rings (REALM-043, REALM-053). A besieged castle hands out
 * nothing (REALM-055); an enemy between the castle and its outer ring stops the
 * food past him (REALM-056), and that share stays in the castle.
 */
export function spreadFood(amount: number, pattern: SpreadName, opts: { besieged?: boolean; outerRingCut?: boolean } = {}): { own: number; next: number; beyond: number; kept: number } {
  if (opts.besieged) return { own: 0, next: 0, beyond: 0, kept: amount };
  const [own, next, beyond] = spreadPattern(pattern).map((pct) => (amount * pct) / 100) as [number, number, number];
  if (opts.outerRingCut) return { own, next, beyond: 0, kept: beyond };
  return { own, next, beyond, kept: 0 };
}

/** The famine rule: a province below it is fed first, ignoring the spread pattern (REALM-046). */
export function fedFirst(storeMonths: number, rule: FoodPolicy["famineRule"]): boolean {
  const threshold = config.food.famine_rule_options[rule];
  return threshold !== null && storeMonths < threshold;
}

/** Where food above the granary size goes, by the surplus rule (REALM-047). */
export function surplusGoes(rule: string): "rots" | "sold" | "capital_castle" | "subjects_or_allies" {
  const map: Record<string, "rots" | "sold" | "capital_castle" | "subjects_or_allies"> = {
    Keep: "rots",
    "Sell on the market": "sold",
    "Send to the capital castle": "capital_castle",
    "Send to subjects or allies": "subjects_or_allies",
  };
  const out = map[rule];
  if (!out) throw new Error(`unknown surplus rule ${rule}`);
  return out;
}

/** How an army refills its food reserve at home under the army refill rule (REALM-045). */
export function armyRefillSource(rule: string, lordsLand: boolean): "locals" | "castle_then_locals" | "none" {
  if (rule === "No refill in lords' lands") return lordsLand ? "none" : "locals";
  if (rule === "Castles hand out first") return "castle_then_locals";
  return "locals";
}

// ---------------------------------------------------------------- the year of food

export interface FoodProvince {
  id: string;
  /** People in thousands; they eat `people` food a month. */
  people: number;
  /** The year's harvest in food. */
  harvest: number;
  /** Local store in food. */
  store: number;
  /** Distance in provinces to each castle. */
  castleDistance: Record<string, number>;
}

export interface FoodCastle {
  id: string;
  province: string;
  store: number;
  /** Rings of provinces the castle can feed. */
  reach: number;
  besieged?: boolean;
  outerRingCut?: boolean;
}

/** The nearest castle whose reach covers the province, or null (REALM-033, REALM-051). */
export function nearestCastleInReach(p: Pick<FoodProvince, "castleDistance">, castles: readonly FoodCastle[]): string | null {
  let best: FoodCastle | null = null;
  for (const c of castles) {
    const d = p.castleDistance[c.id];
    if (d === undefined || d > c.reach) continue;
    if (!best || d < p.castleDistance[best.id]!) best = c;
  }
  return best?.id ?? null;
}

export interface FoodYearReport {
  collected: Record<string, number>;
  delivered: Record<string, number>;
  eaten: Record<string, number>;
  starving: string[];
}

/**
 * One year of food (REALM-020, §3.4): harvest into each province, the
 * collection share of its surplus to its nearest castle in reach, each castle
 * keeps its siege reserve (in months of its own province's eating) and spreads
 * the rest by rings, then a year of eating. Exchanges between castles are left
 * out: the transfer loss is not given (OQ-REALM-11).
 */
export function runFoodYear(provinces: FoodProvince[], castles: FoodCastle[], policy: FoodPolicyScreen): FoodYearReport {
  const months = config.food.months_per_year;
  const report: FoodYearReport = { collected: {}, delivered: {}, eaten: {}, starving: [] };
  const byId = new Map(provinces.map((p) => [p.id, p]));
  for (const p of provinces) {
    const surplus = Math.max(0, p.harvest - p.people * months);
    const castle = nearestCastleInReach(p, castles);
    const pol = castle ? castlePolicy(policy, castle) : policy.realm;
    const { sent } = castle ? collect(surplus, pol.collection) : { sent: 0 };
    p.store += p.harvest - sent;
    if (castle) {
      const c = castles.find((x) => x.id === castle)!;
      c.store += sent;
      report.collected[castle] = (report.collected[castle] ?? 0) + sent;
    }
  }
  for (const c of castles) {
    const pol = castlePolicy(policy, c.id);
    const own = byId.get(c.province);
    const monthSize = own?.people ?? 0;
    const out = spreadable(c.store, pol.siegeReserve * monthSize);
    const ring = (n: number) => provinces.filter((p) => p.castleDistance[c.id] === n && n <= c.reach);
    const rings = [own ? [own] : [], ring(1), ring(2)];
    const parts = spreadFood(out, pol.spread, { ...(c.besieged ? { besieged: true } : {}), ...(c.outerRingCut ? { outerRingCut: true } : {}) });
    const shares = [parts.own, parts.next, parts.beyond];
    let given = 0;
    rings.forEach((members, i) => {
      if (!members.length) return;
      const each = shares[i]! / members.length;
      for (const m of members) {
        m.store += each;
        report.delivered[m.id] = (report.delivered[m.id] ?? 0) + each;
        given += each;
      }
    });
    c.store -= given;
  }
  for (const p of provinces) {
    const need = p.people * months;
    const eaten = Math.min(need, p.store);
    p.store -= eaten;
    report.eaten[p.id] = eaten;
    if (eaten < need) report.starving.push(p.id);
  }
  return report;
}

/**
 * Famine in a province (REALM-058): people die, survivors flee, a revolt
 * becomes likely, and the lord of that land turns disloyal. How many die is
 * not given, so the result names what happens.
 */
export function famine(province: string, lord: Lord | undefined): { province: string; peopleDie: true; survivorsFlee: ["neighbours", "abroad"]; revoltLikely: true } {
  if (lord && lord.provinces.includes(province)) lord.loyalty = "Disloyal";
  return { province, peopleDie: true, survivorsFlee: ["neighbours", "abroad"], revoltLikely: true };
}

/** The event tree's `food_security` reads the same stores the realm keeps (REALM-058, REALM-140). */
export function foodSecurity(p: { localStore: number; castleStore?: number; harvest?: Harvest; herds?: number }): { localStore: number; castleStore: number; harvest: Harvest | undefined; herds: number } {
  return { localStore: p.localStore, castleStore: p.castleStore ?? 0, harvest: p.harvest, herds: p.herds ?? 0 };
}

/** Soldiers cost gold every month and eat grain (REALM-090). The pay rate is the military define. */
export function soldiersMonth(soldiers: number, payPerThousandMen: number, onCampaign = false): { gold: number; grainInMen: number } {
  return { gold: (soldiers / 1000) * payPerThousandMen, grainInMen: onCampaign ? eatersInMen({ onCampaign: soldiers }) : eatersInMen({ atHome: soldiers }) };
}

/** Horses cap how many horsemen a country fields (REALM-092). */
export function horsemenCap(horses: number, wanted: number): number {
  return Math.min(horses, wanted);
}

/** Burning your own fields leaves nothing to forage there (REALM-059). */
export function forageAfterBurning(forage: number, burned: boolean): number {
  return burned ? 0 : forage;
}

// ---------------------------------------------------------------- lords

export type Loyalty = "Loyal" | "Wavering" | "Disloyal" | "In revolt";
const LOYALTY = config.loyalty.steps as Loyalty[];

export interface Lord {
  name: string;
  house: string;
  age?: number;
  provinces: string[];
  retinue: number;
  wealth: number;
  traits: string[];
  want?: string;
  loyalty: Loyalty;
  /** Sons in order of birth; daughters inherit only where there are no sons. */
  sons: string[];
  daughters?: string[];
  label?: string;
  weak?: boolean;
}

/** One loyalty cause moves a lord one step (REALM-088, REALM-089). */
export function loyaltyCause(lord: Lord, cause: string): Loyalty {
  let dir: number;
  if (config.loyalty.up.includes(cause)) dir = -1;
  else if (config.loyalty.down.includes(cause)) dir = 1;
  else throw new Error(`loyalty is not changed by ${cause}`);
  const i = LOYALTY.indexOf(lord.loyalty);
  // Falling stops at Disloyal: going into revolt is a rising (rebellions), not a loyalty step.
  const disloyal = LOYALTY.indexOf("Disloyal");
  const next = dir < 0 ? Math.max(0, i - 1) : i >= disloyal ? i : i + 1;
  lord.loyalty = LOYALTY[next]!;
  return lord.loyalty;
}

export const loyaltyRank = (l: Loyalty): number => LOYALTY.indexOf(l);

/** The lord's label by society; the card is the same (REALM-071). */
export function lordLabel(society: string): string {
  const label = (config.lords.labels as Record<string, string>)[society];
  if (!label) throw new Error(`unknown society ${society}`);
  return label;
}

/** The lord card fields (REALM-070). */
export function lordCard(lord: Lord): { lands: number; retinue: number; wealth: number; traits: string[]; want: string | undefined; loyalty: Loyalty; heir: string | undefined } {
  return { lands: lord.provinces.length, retinue: lord.retinue, wealth: lord.wealth, traits: lord.traits, want: lord.want, loyalty: lord.loyalty, heir: lord.sons[0] ?? lord.daughters?.[0] };
}

/** Only a loyal lord brings his retinue when called (REALM-073). */
export function callRetinue(lord: Lord): number {
  return lord.loyalty === "Loyal" ? lord.retinue : 0;
}

export interface Realm {
  country: string;
  treasury: Treasury;
  provinces: Set<string>;
  royal: Set<string>;
  /** Royal provinces with an official running them. */
  officials: Set<string>;
  lords: Lord[];
  /** How a lord's land passes (REALM-113). */
  landLaw: "to one heir" | "split among the sons";
}

export function newRealm(country: string, gold = 0): Realm {
  return { country, treasury: { gold, loans: [], oaths: [] }, provinces: new Set(), royal: new Set(), officials: new Set(), lords: [], landLaw: "to one heir" };
}

export function lordOf(realm: Realm, province: string): Lord | undefined {
  return realm.lords.find((l) => l.provinces.includes(province));
}

/** A province needs a royal official when it is royal and no lord holds it (REALM-062, REALM-075). */
export function needsOfficial(realm: Realm, province: string): boolean {
  return realm.royal.has(province) && !lordOf(realm, province);
}

/**
 * What a province sends the ruler (REALM-064, REALM-072): a royal province with
 * an official sends all its taxes and recruits and the official costs wages;
 * without one it sends half; a lord's province sends half its taxes and its
 * recruits form his retinue, and the lord costs nothing.
 */
export function provinceYield(realm: Realm, province: string, tax: number, recruits: number): { tax: number; recruits: number; retinue: number; wagesDue: boolean } {
  const lord = lordOf(realm, province);
  if (lord) return { tax: tax * config.lords.tax_share, recruits: 0, retinue: recruits, wagesDue: false };
  if (realm.officials.has(province)) return { tax, recruits, retinue: 0, wagesDue: true };
  const share = config.officials.no_official_share;
  return { tax: tax * share, recruits: recruits * share, retinue: 0, wagesDue: false };
}

/** How a holder can be removed: an official at will, a lord only by force, a trial or his line dying out (REALM-072). */
export function removableBy(kind: "official" | "lord"): string[] {
  return kind === "official" ? ["dismissal"] : ["force", "trial", "line_dies_out"];
}

/** A lord lends from his wealth: the country owes him (REALM-074). */
export function lordLends(realm: Realm, lord: Lord, amount: number, interestPct: number): Loan {
  lord.wealth -= amount;
  return takeLoan(realm.treasury, lord.name, amount, interestPct);
}

/** A lord arms a rising with his gold (REALM-074). */
export function lordFundsRevolt(lord: Lord, amount: number): { lord: string; gold: number } {
  const gold = Math.min(amount, lord.wealth);
  lord.wealth -= gold;
  return { lord: lord.name, gold };
}

function takeFromRoyal(realm: Realm, provinces: string[]): void {
  for (const p of provinces) {
    if (!realm.royal.has(p)) throw new Error(`${p} is not a royal province`);
    realm.royal.delete(p);
    realm.officials.delete(p);
  }
}

/** Granting a fief makes a new loyal lord whose provinces need no official (REALM-075). */
export function grantFief(realm: Realm, provinces: string[], person: string): Lord {
  takeFromRoyal(realm, provinces);
  const lord: Lord = { name: person, house: person, provinces: [...provinces], retinue: 0, wealth: 0, traits: [], loyalty: "Loyal", sons: [] };
  realm.lords.push(lord);
  return lord;
}

/** Keeping a defeated local ruler: a disloyal lord, no officials needed, the people calm (REALM-076). */
export function keepLocalRuler(realm: Realm, province: string, ruler: string): { lord: Lord; peopleCalm: true } {
  realm.provinces.add(province);
  realm.royal.delete(province);
  realm.officials.delete(province);
  const lord: Lord = { name: ruler, house: ruler, provinces: [province], retinue: 0, wealth: 0, traits: [], loyalty: "Disloyal", sons: [] };
  realm.lords.push(lord);
  return { lord, peopleCalm: true };
}

/** Selling a title: gold now, a weak but loyal lord (REALM-077). The price is the buyer's offer. */
export function sellTitle(realm: Realm, province: string, buyer: string, price: number): Lord {
  takeFromRoyal(realm, [province]);
  realm.treasury.gold = applyCause(realm.treasury.gold, "gold", "titles_sold", price);
  const lord: Lord = { name: buyer, house: buyer, provinces: [province], retinue: 0, wealth: 0, traits: [], loyalty: "Loyal", sons: [], weak: true };
  realm.lords.push(lord);
  return lord;
}

/** A house brought in by marriage, or a defecting lord, joins as a lord with his land (REALM-078, REALM-080). */
export function lordJoins(realm: Realm, lord: Lord): void {
  for (const p of lord.provinces) realm.provinces.add(p);
  realm.lords.push(lord);
}

/** A disloyal lord defects from one realm to another with his provinces (REALM-080, REALM-086). */
export function defect(from: Realm, to: Realm, name: string): Lord {
  const lord = from.lords.find((l) => l.name === name);
  if (!lord) throw new Error(`no lord ${name}`);
  if (lord.loyalty !== "Disloyal") throw new Error("only a disloyal lord defects");
  from.lords = from.lords.filter((l) => l !== lord);
  for (const p of lord.provinces) from.provinces.delete(p);
  lordJoins(to, lord);
  return lord;
}

/**
 * A lord dies (REALM-079, REALM-082, REALM-107, REALM-113): with no heir his
 * line dies out and the land is royal again, needing officials; otherwise the
 * land law gives it to the eldest son or splits it among the sons; with no
 * sons a daughter inherits.
 */
export function lordDies(realm: Realm, name: string): Lord[] {
  const lord = realm.lords.find((l) => l.name === name);
  if (!lord) throw new Error(`no lord ${name}`);
  realm.lords = realm.lords.filter((l) => l !== lord);
  const heirs = lord.sons.length ? lord.sons : (lord.daughters ?? []).slice(0, 1);
  if (!heirs.length) {
    for (const p of lord.provinces) realm.royal.add(p);
    return [];
  }
  const takers = realm.landLaw === "split among the sons" && lord.sons.length ? lord.sons : [heirs[0]!];
  const out = takers.map((h) => ({ ...lord, name: h, provinces: [] as string[], sons: [], daughters: [] }));
  lord.provinces.forEach((p, i) => out[i % out.length]!.provinces.push(p));
  realm.lords.push(...out);
  return out;
}

/** Seizing a lord's land by decree: the land is royal, other lords waver, he may rebel (REALM-083). */
export function seizeLand(realm: Realm, name: string): { mayRebel: true } {
  const lord = realm.lords.find((l) => l.name === name);
  if (!lord) throw new Error(`no lord ${name}`);
  for (const p of lord.provinces) realm.royal.add(p);
  lord.provinces = [];
  loyaltyCause(lord, "land_seized_from_him");
  realm.lords = realm.lords.filter((l) => l !== lord);
  for (const other of realm.lords) loyaltyCause(other, "land_seized_from_another");
  return { mayRebel: true };
}

/** Trying and executing a disloyal lord removes him; all lords of his house turn disloyal (REALM-084). */
export function trial(realm: Realm, name: string): void {
  const lord = realm.lords.find((l) => l.name === name);
  if (!lord || lord.loyalty !== "Disloyal") throw new Error("only a disloyal lord is tried");
  realm.lords = realm.lords.filter((l) => l !== lord);
  for (const p of lord.provinces) realm.royal.add(p);
  for (const l of realm.lords) if (l.house === lord.house) l.loyalty = "Disloyal";
}

/** Defeating a lord's revolt: his land returns to the ruler, or to a loyal claimant (REALM-085). */
export function defeatRevolt(realm: Realm, name: string, claimant?: string): Lord | undefined {
  const lord = realm.lords.find((l) => l.name === name);
  if (!lord || lord.loyalty !== "In revolt") throw new Error(`${name} is not in revolt`);
  realm.lords = realm.lords.filter((l) => l !== lord);
  if (!claimant) {
    for (const p of lord.provinces) realm.royal.add(p);
    return undefined;
  }
  const heir: Lord = { name: claimant, house: lord.house, provinces: lord.provinces, retinue: 0, wealth: 0, traits: [], loyalty: "Loyal", sons: [] };
  realm.lords.push(heir);
  return heir;
}

/** Two lords' houses joined by marriage become one bigger lord (REALM-087). */
export function mergeHouses(realm: Realm, a: string, b: string): Lord {
  const la = realm.lords.find((l) => l.name === a);
  const lb = realm.lords.find((l) => l.name === b);
  if (!la || !lb) throw new Error("both lords must be lords of the realm");
  la.provinces = [...la.provinces, ...lb.provinces];
  la.retinue += lb.retinue;
  la.wealth += lb.wealth;
  realm.lords = realm.lords.filter((l) => l !== lb);
  return la;
}

// ---------------------------------------------------------------- ruler and family

export type ThroneLaw = "eldest son" | "eldest child" | "eldest of the house" | "strongest claimant" | "election by lords";

export interface Person {
  name: string;
  sex: "m" | "f";
  age: number;
  /** Relation to the ruler: child, sibling or the wider house; lords for claimants. */
  relation?: "child" | "sibling" | "house" | "lord";
  claim?: number;
  votes?: number;
}

export interface Ruler {
  name: string;
  age: number;
  years: number;
  heirs: Person[];
  traits: string[];
}

/** A year: the ruler ages and reigns a year longer (REALM-100, REALM-101). */
export function rulerYear(r: Ruler): void {
  r.age++;
  r.years++;
}

/**
 * Who takes the throne under an inheritance law (REALM-113). Candidates come
 * eldest first. With no heir the realm falls into a succession war among the
 * lords (REALM-103).
 */
export function successor(law: ThroneLaw, candidates: readonly Person[]): Person | "succession war" {
  const byAge = [...candidates].sort((a, b) => b.age - a.age);
  let pick: Person | undefined;
  if (law === "eldest son") pick = byAge.find((p) => p.relation === "child" && p.sex === "m");
  else if (law === "eldest child") pick = byAge.find((p) => p.relation === "child");
  else if (law === "eldest of the house") pick = byAge.find((p) => p.relation === "sibling") ?? byAge.find((p) => p.relation === "house");
  else if (law === "strongest claimant") pick = [...candidates].filter((p) => p.relation === "lord").sort((a, b) => (b.claim ?? 0) - (a.claim ?? 0))[0];
  else pick = [...candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))[0];
  return pick ?? "succession war";
}

/** A new ruler starts with 0 years on the throne, and each lord loses a step for the new ruler (REALM-101, REALM-089). */
export function crown(realm: Realm, ruler: Ruler, heir: Person): Ruler {
  for (const lord of realm.lords) loyaltyCause(lord, "new_ruler");
  ruler.name = heir.name;
  ruler.age = heir.age;
  ruler.years = 0;
  ruler.heirs = ruler.heirs.filter((h) => h.name !== heir.name);
  return ruler;
}

/** Who can be regent for a child ruler: the queen mother wherever there is one, or a lord (REALM-100, REALM-108). */
export function regentCandidates(realm: Realm, queenMother?: string): string[] {
  return [...(queenMother ? [queenMother] : []), ...realm.lords.map((l) => l.name)];
}

/**
 * Real people first (REALM-110): a person who held the role in 1444 or appears
 * in an event is placed as she was; only generated characters use the
 * women-in-roles chances.
 */
export function characterFor<T>(historical: T | undefined, generate: () => T): { person: T; generated: boolean } {
  return historical !== undefined ? { person: historical, generated: false } : { person: generate(), generated: true };
}

export interface Marriage {
  houses: [string, string];
  living: boolean;
  goodwill: boolean;
}

/** A marriage between houses is a living tie with goodwill (REALM-105). */
export function marry(a: string, b: string): Marriage {
  return { houses: [a, b], living: true, goodwill: true };
}

/** Death, a divorce event or war between the houses ends a marriage tie (REALM-105). */
export function endMarriage(m: Marriage, cause: "death" | "divorce" | "war"): void {
  void cause;
  m.living = false;
}

/** A living marriage tie with the strongest claim lets a realm pass to the ruler (REALM-105). */
export function mayInheritRealm(m: Marriage, strongestClaim: boolean): boolean {
  return m.living && strongestClaim;
}

// ---------------------------------------------------------------- abroad

export interface Standing {
  allies: Set<string>;
  enemies: Set<string>;
  /** Rival countries and the named thing each competes for. */
  rivals: Map<string, string>;
}

export function newStanding(): Standing {
  return { allies: new Set(), enemies: new Set(), rivals: new Map() };
}

/** Going to war calls every ally in (REALM-120). */
export function goToWar(s: Standing, enemy: string): string[] {
  s.enemies.add(enemy);
  s.allies.delete(enemy);
  return [...s.allies];
}

/** Making peace ends the enmity (REALM-121). */
export function makePeace(s: Standing, enemy: string): void {
  s.enemies.delete(enemy);
}

/** A contested claim makes a rival over a named thing; settling it ends that rivalry (REALM-122). */
export function contestClaim(s: Standing, rival: string, thing: string): void {
  s.rivals.set(rival, thing);
}
export function settleClaim(s: Standing, thing: string): void {
  for (const [r, t] of s.rivals) if (t === thing) s.rivals.delete(r);
}

/** The AI targets rivals, and wars against a rival please the lords (REALM-122). */
export function aiTargets(s: Standing): string[] {
  return [...s.rivals.keys()];
}
export function warPleasesLords(s: Standing, enemy: string): boolean {
  return s.rivals.has(enemy);
}

/** A subject pays tribute in gold or grain, and sends troops (REALM-123). */
export function payTribute(overlord: { gold: number; grain: number; troops: number }, tribute: { gold?: number; grain?: number; troops: number }): void {
  overlord.gold = applyCause(overlord.gold, "gold", "tribute", tribute.gold ?? 0);
  overlord.grain += tribute.grain ?? 0;
  overlord.troops += tribute.troops;
}

// ---------------------------------------------------------------- AI

export type Personality = "opportunist" | "isolationist" | "hegemon seeker";

/** What an AI personality does with the counts it reads, the same counts the player sees (REALM-141, REALM-142). */
export function aiPlan(personality: Personality, neighbour: { name: string; waveringLords: number; soldiersDropped: boolean }): string[] {
  if (personality === "opportunist") return neighbour.waveringLords > 0 || neighbour.soldiersDropped ? [`consider attacking ${neighbour.name}`] : [];
  if (personality === "isolationist") return ["fill schools", "avoid war"];
  return ["keep recruits for the army"];
}

// ---------------------------------------------------------------- scores

/** Economy: yearly income plus the bank, gold minus debt (REALM-151). */
export function economyScore(income: number, gold: number, debtOwed: number): { income: number; bank: number; score: number } {
  const bank = gold - debtOwed;
  return { income, bank, score: income + bank };
}

/** Technology: inventions known, each weighted by its era cost (REALM-153). */
export function technologyScore(known: Iterable<string>): number {
  let n = 0;
  for (const id of known) {
    try {
      n += eraCost(invention(id).era);
    } catch {
      // the root and the boughs are not inventions of an era
    }
  }
  return n;
}

/** Ranks (1 = first) of each country in a score (REALM-156). */
export function ranks(scores: Record<string, number>): Record<string, number> {
  const order = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(order.map(([c], i) => [c, i + 1]));
}

/**
 * Score victory by lead (REALM-155): leading second place by the margin in
 * every one of the last `score_years` yearly scores.
 */
export function winsByLead(yearly: readonly Record<string, number>[], country: string): boolean {
  const years = config.win.score_years;
  if (yearly.length < years) return false;
  return yearly.slice(-years).every((s) => {
    const mine = s[country] ?? 0;
    const second = Math.max(...Object.entries(s).filter(([c]) => c !== country).map(([, v]) => v));
    return mine >= second * (1 + config.win.score_margin);
  });
}

// ---------------------------------------------------------------- the card

export interface CardInput {
  country: string;
  ruler: { title: string; name: string; age: number; years: number; heirs: number };
  gold: number;
  peopleThousands: number;
  soldiers: number;
  recruits: number;
  food: { castles: number; fed: number; provinces: number; hungry: number };
  horses: number;
  ships: { war: number; trade: number };
  castles: number;
  officials: number;
  royalProvinces: number;
  lords: Loyalty[];
  schools: { count: number; students: number; scholars: number; study?: string; progressPct?: number };
  faithPct: number;
  tonguePct: number;
  inRevolt: number;
  allies: number;
  enemies: number;
  oathsBroken: number;
  fallen: number;
  ranks?: { economy: number; power: number; technology: number };
}

const grouped = (n: number): string => Math.round(n).toLocaleString("en-US");
const ordinal = (n: number): string => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

/** The country card (REALM-005, REALM-156): one line per count, each with the stat whose gains and losses it opens. */
export function countryCard(c: CardInput): { text: string; stat: Stat | "schools" }[] {
  const people = c.peopleThousands >= 1000 ? `${Number((c.peopleThousands / 1000).toFixed(1))} m` : `${grouped(c.peopleThousands)} k`;
  const count = (l: Loyalty) => c.lords.filter((x) => x === l).length;
  const lines: { text: string; stat: Stat | "schools" }[] = [
    { text: `${c.ruler.title} ${c.ruler.name}, ${c.ruler.age} · ${c.ruler.years} years on throne · ${c.ruler.heirs} heirs`, stat: "heirs" },
    { text: `Gold ${grouped(c.gold)}`, stat: "gold" },
    { text: `Food ${c.food.castles} castles feeding ${c.food.fed} of ${c.food.provinces} provinces · ${c.food.hungry} hungry`, stat: "local_store" },
    { text: `People ${people}`, stat: "people" },
    { text: `Soldiers ${grouped(c.soldiers)} (+${grouped(c.recruits)} recruits)`, stat: "soldiers" },
    { text: `Horses ${grouped(c.horses)}`, stat: "horses" },
    { text: `Ships ${c.ships.war} war / ${c.ships.trade} trade`, stat: "ships" },
    { text: `Castles ${c.castles}`, stat: "castles" },
    { text: `Officials ${c.officials} for ${c.royalProvinces} royal provinces`, stat: "officials" },
    { text: `Lords ${c.lords.length} named: ${count("Loyal")} loyal, ${count("Wavering")} wavering, ${count("Disloyal")} disloyal`, stat: "lords" },
    { text: `Schools ${c.schools.count} (${grouped(c.schools.students)} students, ${grouped(c.schools.scholars)} scholars) · studying: ${c.schools.study ?? "nothing"} ${c.schools.progressPct ?? 0} %`, stat: "schools" },
    { text: `Faith ${c.faithPct} %`, stat: "faith" },
    { text: `Tongue ${c.tonguePct} %`, stat: "tongue" },
    { text: `In revolt ${c.inRevolt}`, stat: "in_revolt" },
    { text: `Allies ${c.allies}`, stat: "allies" },
    { text: `Enemies ${c.enemies}`, stat: "enemies" },
    { text: `Oaths broken ${c.oathsBroken}`, stat: "oaths_broken" },
    { text: `Fallen (10 yrs) ${grouped(c.fallen)}`, stat: "fallen" },
  ];
  if (c.ranks) {
    lines.push({ text: `Economy ${ordinal(c.ranks.economy)}`, stat: "gold" });
    lines.push({ text: `Power ${ordinal(c.ranks.power)}`, stat: "provinces" });
    lines.push({ text: `Technology ${ordinal(c.ranks.technology)}`, stat: "schools" });
  }
  return lines;
}

/** Re-exported so callers can check an invention's realm effects (e.g. officials per province). */
export { effectsOf };
