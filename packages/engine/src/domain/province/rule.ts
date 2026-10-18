import { knows, provinceConfig, type CastleStep, type Loyalty, type Official, type Province, type ProvinceConfig, type RoadStep, type TaxRate, type TollRate } from "./model.ts";

/** Who rules the province and what it pays: tax, tolls, roads, governance, officials, lords, charters, defence (§7.2–§11). */

// ---------------------------------------------------------------- tax and tolls

const RATES = provinceConfig.tax.rates as TaxRate[];

function rateIndex(r: TaxRate): number {
  return RATES.indexOf(r);
}

function hasCharter(p: Province, kind: string): boolean {
  return p.charters.includes(kind);
}

/** The province's rate: its own, else the realm default, never above light under a tax cap charter (PROV-160, PROV-166). */
export function taxRateOf(p: Province, realmDefault: TaxRate, cfg: ProvinceConfig = provinceConfig): TaxRate {
  const rate = p.taxRate ?? realmDefault;
  const cap = cfg.tax.cap_charter_max as TaxRate;
  return hasCharter(p, "tax cap") && rateIndex(rate) > rateIndex(cap) ? cap : rate;
}

export interface TaxRateResult {
  rate: TaxRate;
  /** The province's lord wavers under a heavy or crushing demand (PROV-165). */
  lordWavers: boolean;
  /** The rate went up: a new burden, a spark for rebellions. */
  raised: boolean;
}

/** Sets a province's rate (PROV-160); a tax cap charter keeps it at light or below (PROV-166). */
export function setTaxRate(p: Province, rate: TaxRate, realmDefault: TaxRate = "normal", cfg: ProvinceConfig = provinceConfig): TaxRateResult {
  const before = taxRateOf(p, realmDefault, cfg);
  p.taxRate = rate;
  const after = taxRateOf(p, realmDefault, cfg);
  return {
    rate: after,
    lordWavers: p.governedBy === "lord" && rateIndex(after) >= rateIndex("heavy"),
    raised: rateIndex(after) > rateIndex(before),
  };
}

/** Weight of the *Heavy taxes* grievance: heavy one, crushing two (PROV-167). */
export function heavyTaxesWeight(rate: TaxRate, cfg: ProvinceConfig = provinceConfig): number {
  return (cfg.tax.heavy_weight as Record<string, number>)[rate] ?? 0;
}

/** Rebels forcing their demand bring the rate back down to the highest rate without *Heavy taxes* (PROV-166). */
export function forceTaxDown(p: Province, realmDefault: TaxRate = "normal", cfg: ProvinceConfig = provinceConfig): TaxRate {
  const rate = taxRateOf(p, realmDefault, cfg);
  const top = [...RATES].reverse().find((r) => heavyTaxesWeight(r, cfg) === 0)!;
  if (rateIndex(rate) > rateIndex(top)) p.taxRate = top;
  return taxRateOf(p, realmDefault, cfg);
}

/** Tax owed in a year from what the province owes at its rate: riots halve it (PROV-162). */
export function taxOwed(goldAtRate: number, riots: boolean, cfg: ProvinceConfig = provinceConfig): number {
  return riots ? goldAtRate * cfg.tax.riots_factor : goldAtRate;
}

/** A lord keeps half of what is collected in his province either way (PROV-165). */
export function lordKeeps(collected: number, cfg: ProvinceConfig = provinceConfig): number {
  return collected * cfg.tax.lord_share;
}

export interface TaxPresetTarget {
  province: Province;
  border: boolean;
  town: boolean;
}

/** Fills in every province's rate from a Tax screen preset at once (PROV-164). */
export function applyTaxPreset(targets: TaxPresetTarget[], preset: string, cfg: ProvinceConfig = provinceConfig): void {
  const rule = (cfg.tax.presets as Record<string, Record<string, string>>)[preset];
  if (!rule) throw new Error(`unknown tax preset ${preset}`);
  for (const t of targets) {
    const rate = rule.all ?? (rule.border ? (t.border ? rule.border : rule.heartland) : t.town ? rule.towns : rule.countryside);
    t.province.taxRate = rate as TaxRate;
  }
}

/** Sets the toll on a toll point; a free-trade charter keeps it at none (PROV-150). */
export function setToll(p: Province, point: string, rate: TollRate): TollRate {
  p.tolls[point] = hasCharter(p, "free trade") ? "none" : rate;
  return p.tolls[point]!;
}

// ---------------------------------------------------------------- roads and travel

const ROADS = provinceConfig.roads.steps as RoadStep[];

/** Builds the road one step up, if the invention for that step is known (PROV-170). Cost is gold × the ground's build cost. */
export function buildRoad(p: Province, to: RoadStep, knownSteps: RoadStep[]): boolean {
  if (ROADS.indexOf(to) !== ROADS.indexOf(p.road) + 1 || !knownSteps.includes(to)) return false;
  p.road = to;
  return true;
}

/** Neglect, fighting or floods drop the road one step (PROV-171). */
export function roadFalls(p: Province): void {
  p.road = ROADS[Math.max(0, ROADS.indexOf(p.road) - 1)]!;
}

/** Digging a canal (*Grand canals* or *Canal locks*) makes it a river province (PROV-172). */
export function digCanal(p: Province, cfg: ProvinceConfig = provinceConfig): boolean {
  if (!cfg.roads.canal_inventions.some((i) => knows(p, i))) return false;
  p.canal = true;
  return true;
}

export function wreckCanal(p: Province): void {
  p.canal = false;
}

/** River provinces count one ring closer for castle food spread (PROV-172). */
export function isRiverProvince(p: Province): boolean {
  return p.river || p.canal;
}

/** Days to the capital or the nearest seat, by the fastest route (PROV-173). */
export function daysToCapital(capitalDays: number, seatDays: number[] = []): number {
  return Math.min(capitalDays, ...seatDays);
}

// ---------------------------------------------------------------- governance

export interface GovernanceGives {
  tax: "full" | "half" | "none";
  recruits: "full" | "half" | "retinue" | "none";
  officialEffect: boolean;
  ungoverned: boolean;
}

/** What the province gives by who governs it (PROV-181, PROV-182, PROV-184). */
export function governanceGives(p: Province): GovernanceGives {
  switch (p.governedBy) {
    case "official":
      return { tax: "full", recruits: "full", officialEffect: true, ungoverned: false };
    case "lord":
      return { tax: "half", recruits: "retinue", officialEffect: p.official !== null, ungoverned: p.official === null };
    case "no one":
      return { tax: "half", recruits: "half", officialEffect: false, ungoverned: true };
    case "subject ruler":
      return { tax: "none", recruits: "none", officialEffect: false, ungoverned: false };
    case "occupied":
      return { tax: "none", recruits: "none", officialEffect: false, ungoverned: false };
  }
}

/** Sets who governs a province from its holder (PROV-181). */
export function governance(p: Province): Province["governedBy"] {
  if (p.occupiedBy) return "occupied";
  if (p.subjectOf) return "subject ruler";
  if (p.lord) return "lord";
  return p.official ? "official" : "no one";
}

export function refreshGovernance(p: Province): void {
  p.governedBy = governance(p);
}

/** Changes the owner by conquest, cession, a lord defecting or a colony (PROV-180). */
export function changeOwner(p: Province, to: string): void {
  p.owner = to;
  p.yearsHeld = 0;
  p.occupiedBy = null;
  p.occupiedMonths = 0;
}

/** An enemy taking the castle, or holding a province without one for a season, occupies it (PROV-184). */
export function occupy(p: Province, by: string, how: { tookCastle?: boolean; monthsHeld?: number }, cfg: ProvinceConfig = provinceConfig): boolean {
  const occupied = p.castle !== "none" ? how.tookCastle === true : (how.monthsHeld ?? 0) >= cfg.months_per_season;
  if (!occupied) return false;
  p.occupiedBy = by;
  p.occupiedMonths = 0;
  if (p.castle !== "none") p.castleHolder = by;
  refreshGovernance(p);
  return true;
}

/** Peace or retaking ends the occupation (PROV-184). */
export function liberate(p: Province): void {
  p.occupiedBy = null;
  p.occupiedMonths = 0;
  p.castleHolder = p.owner;
  refreshGovernance(p);
}

/** Who gets the province's tax, recruits, food and trade. */
export function incomeGoesTo(p: Province): string | null {
  return p.occupiedBy ?? p.owner;
}

/** A lord's line dying out returns the province to royal; it then needs an official (PROV-183). */
export function lordLineDiesOut(p: Province): void {
  p.lord = null;
  p.lordTraits = [];
  p.official = null;
  refreshGovernance(p);
}

/** Homeland: gained by a people who make up most of the province for 100 years, lost by one gone for 100 years (PROV-186). */
export function updateHomeland(p: Province, people: string, yearsAsMajority: number, yearsGone: number, cfg: ProvinceConfig = provinceConfig): void {
  if (yearsAsMajority >= cfg.homeland.years && !p.homeland.includes(people)) p.homeland.push(people);
  if (yearsGone >= cfg.homeland.years) p.homeland = p.homeland.filter((h) => h !== people);
}

/** Pretenders who still hold a right: the old ruler for 50 years after losing it; none after death without heirs, renouncing or marrying in (PROV-188). */
export function livePretenders(p: Province, cfg: ProvinceConfig = provinceConfig): string[] {
  return p.pretenders
    .filter((x) => x.heirs && !x.renounced && !x.marriedIn)
    .filter((x) => x.lostYearsAgo === null || x.lostYearsAgo <= cfg.pretender.years)
    .map((x) => x.name);
}

// ---------------------------------------------------------------- officials

/** Share of his effect an official gives: half in his first year, rising to full after 5 years (PROV-192). */
export function officialEffectShare(yearsServed: number, cfg: ProvinceConfig = provinceConfig): number {
  const first = cfg.officials.first_year_share;
  const full = cfg.officials.full_effect_years;
  if (yearsServed < 1) return first;
  if (yearsServed >= full) return 1;
  return first + ((1 - first) * (yearsServed - 1)) / (full - 1);
}

export type OfficialEffect = Record<string, number | boolean>;

/** The effect of an official's type where he runs a province, scaled by years served (PROV-190). */
export function officialEffect(type: string, yearsServed: number, cfg: ProvinceConfig = provinceConfig): OfficialEffect {
  const base = (cfg.officials.effects as Record<string, OfficialEffect>)[type];
  if (!base) throw new Error(`unknown official type ${type}`);
  const share = officialEffectShare(yearsServed, cfg);
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, typeof v === "number" && share < 1 ? scale(k, v, share) : v]));
}

/** Multipliers (×2, ×½) scale toward 1; additive bonuses scale toward 0. */
function scale(key: string, v: number, share: number): number {
  const multiplier = ["store_rot", "build_time", "burned_rebuild", "faith_shift", "tongue_shift", "walls_repair", "castle_store_rot", "broken_charter_fade"].includes(key);
  if (key === "riots_extra_grievances" || key === "graduate_sooner_years") return v;
  return multiplier ? 1 + (v - 1) * share : v * share;
}

/** Assigns an official to run a province: one official, one province; a seat needs its own (PROV-191). */
export function assignOfficial(p: Province, o: Official, toSeat = false): boolean {
  if (toSeat) {
    if (!p.town.includes("seat") || p.seatOfficial) return false;
    p.seatOfficial = o;
    return true;
  }
  if (p.official) return false;
  p.official = { ...o, yearsServed: 0 };
  refreshGovernance(p);
  return true;
}

/** Whether a seat in the province still lacks its own official. */
export function seatNeedsOfficial(p: Province): boolean {
  return p.town.includes("seat") && p.seatOfficial === null && !p.charters.includes("town law");
}

/** Moving an official starts him again at half (PROV-192). */
export function moveOfficial(from: Province, to: Province): Official | null {
  const o = from.official;
  if (!o || to.official) return null;
  from.official = null;
  refreshGovernance(from);
  to.official = { ...o, yearsServed: 0 };
  refreshGovernance(to);
  return to.official;
}

/** Why the crown can't move or commission the official of a province, or null: a lord's official serves him (PROV-303, PROV-202). */
export function servesTheLord(p: Province): string | null {
  return p.lord !== null || (p.official !== null && p.official.employer !== "ruler") ? "he serves the lord, not the crown" : null;
}

/**
 * Moves the official of `from` to `to` (PROV-303): the two swap posts, or he
 * takes the empty post and leaves his own empty. Whoever moves keeps his name
 * and type and starts again at half (PROV-192). Returns why not, or null.
 */
export function moveOrSwapOfficial(from: Province, to: Province): string | null {
  const why = servesTheLord(from) ?? servesTheLord(to);
  if (why) return why;
  if (!from.official) return "the post stands empty";
  const there = to.official;
  to.official = { ...from.official, yearsServed: 0 };
  from.official = there ? { ...there, yearsServed: 0 } : null;
  refreshGovernance(from);
  refreshGovernance(to);
  return null;
}

/** Gold up front to hire an official: a foreign specialist costs more (PROV-333, PROV-334). */
export function hirePrice(foreign: boolean, cfg: ProvinceConfig = provinceConfig): number {
  return cfg.officials.hire.gold * (foreign ? cfg.officials.hire.foreign_multiplier : 1);
}

/**
 * Why an official of `type` can't be hired into province p's post, or null
 * (PROV-333 to 335): the post must be an empty royal one, and a native hire
 * needs the type serving in another royal post of the realm (`serving`).
 */
export function cannotHire(p: Province, type: string, foreign: boolean, serving: readonly string[], gold: number, cfg: ProvinceConfig = provinceConfig): string | null {
  if (!(cfg.officials.types as string[]).includes(type) || type === "colonial governor") return "no such type";
  if (p.lord !== null) return "he serves the lord, not the crown";
  if (p.official) return "the post is filled";
  if (!foreign && !serving.includes(type)) return "no one at home knows the trade";
  if (gold < hirePrice(foreign, cfg)) return "not enough gold";
  return null;
}

/** Hires an official into province p's empty post (PROV-333): he starts at half. Returns the gold paid. */
export function hireIntoPost(p: Province, o: Official, foreign: boolean, cfg: ProvinceConfig = provinceConfig): number {
  p.official = { ...o, yearsServed: 0 };
  refreshGovernance(p);
  return hirePrice(foreign, cfg);
}

/** A colonial governor holding a governor slot does not count against the officials cap (PROV-193). */
export function countsAgainstCap(o: Official, holdsGovernorSlot: boolean): boolean {
  return !(o.type === "colonial governor" && holdsGovernorSlot);
}

/** Once his colony is founded, the colonial governor becomes its ordinary official. */
export function governorFoundsColony(o: Official, colony: Province): Official {
  const official = { ...o, type: "colonial governor", yearsServed: 0 };
  colony.official = official;
  refreshGovernance(colony);
  return official;
}

/** Official types a school trains (PROV-194). */
export function schoolTrains(school: string, cfg: ProvinceConfig = provinceConfig): string[] {
  return (cfg.officials.school_trains as Record<string, string[]>)[school] ?? [];
}

// ---------------------------------------------------------------- lords

export interface Lord {
  name: string;
  provinces: string[];
  loyalty: Loyalty;
  traits: string[];
  courtier: boolean;
  /** Provinces he claims as a pretender after fleeing abroad. */
  pretenderTo: string[];
  abroad: boolean;
  /** Officials lent to him by the ruler. */
  lent: string[];
}

export function newLord(name: string, provinces: string[], loyalty: Loyalty = "Loyal", traits: string[] = []): Lord {
  return { name, provinces: [...provinces], loyalty, traits, courtier: false, pretenderTo: [], abroad: false, lent: [] };
}

export function isLord(l: Lord): boolean {
  return l.provinces.length > 0;
}

/**
 * A lord loses a province (PROV-200, PROV-201). With none left he stops being a lord:
 * seized by force he flees abroad as a pretender to it, otherwise he stays at court.
 */
export function lordLosesProvince(l: Lord, province: string, how: "seized" | "conquered" | "given away"): void {
  l.provinces = l.provinces.filter((x) => x !== province);
  if (l.provinces.length > 0) return;
  if (how === "seized") {
    l.abroad = true;
    l.pretenderTo.push(province);
  } else l.courtier = true;
}

/** A courtier granted land is a lord again (PROV-201). */
export function grantLand(l: Lord, province: string): void {
  l.provinces.push(province);
  l.courtier = false;
}

const LOYALTY = provinceConfig.loyalty as Loyalty[];

/** One step up the loyalty ladder, unless in revolt (PROV-206). */
export function loyaltyUp(l: Lord): Loyalty {
  if (l.loyalty === "In revolt") return l.loyalty;
  l.loyalty = LOYALTY[Math.min(LOYALTY.length - 1, LOYALTY.indexOf(l.loyalty) + 1)]!;
  return l.loyalty;
}

/** A loyal lord wavers (riots, a heavy tax demand). */
export function waver(l: Lord): Loyalty {
  if (l.loyalty === "Loyal") l.loyalty = "Wavering";
  return l.loyalty;
}

/** Lending an official: the ruler keeps paying his wage, the lord's loyalty is won, he works for the lord until recalled (PROV-204). */
export function lendOfficial(l: Lord, o: Official): { wagePaidBy: string; loyaltyWon: boolean } {
  o.employer = l.name;
  l.lent.push(o.id);
  return { wagePaidBy: "ruler", loyaltyWon: true };
}

export function recallOfficial(l: Lord, o: Official): void {
  l.lent = l.lent.filter((x) => x !== o.id);
  o.employer = "ruler";
}

/** What a lord favours building, by his traits (PROV-205). */
export function lordFavours(trait: string, cfg: ProvinceConfig = provinceConfig): string[] {
  return (cfg.buildings.lord_traits as Record<string, string[]>)[trait] ?? [];
}

export interface BuildingOwner {
  building: string;
  province: string;
  owner: string;
}

/** Paying for a building in a lord's province: it is his, and his loyalty rises a step unless he is in revolt (PROV-206). */
export function payForLordBuilding(l: Lord, building: string, province: string): BuildingOwner {
  loyaltyUp(l);
  return { building, province, owner: l.name };
}

/** When a lord's land comes back to the ruler, its buildings come with it (PROV-207). */
export function landComesBack(buildings: BuildingOwner[], lord: string, ruler: string): void {
  for (const b of buildings) if (b.owner === lord) b.owner = ruler;
}

// ---------------------------------------------------------------- charters

export interface CharterEffect {
  marketCanGrowToFair?: boolean;
  maxTaxRate?: TaxRate;
  townRunsTown?: boolean;
  noOfficialNeeded?: boolean;
  noSeizures?: boolean;
  noWinterQuarters?: boolean;
  minorityFaithOpen?: boolean;
  endsWrongFaith?: boolean;
  clergyLordsWaver?: boolean;
  noTolls?: boolean;
  merchantRunsMine?: boolean;
  ownerOutputShare?: number;
  fasterDigging?: boolean;
  newSeams?: boolean;
  costsGold?: boolean;
  costsTax?: boolean;
}

/** What each charter gives and costs (PROV-210, PROV-214, PROV-215). */
export function charterEffect(kind: string, cfg: ProvinceConfig = provinceConfig): CharterEffect {
  switch (kind) {
    case "market charter":
      return { marketCanGrowToFair: true, costsGold: true };
    case "tax cap":
      return { maxTaxRate: cfg.tax.cap_charter_max as TaxRate, costsTax: true };
    case "town law":
      return { townRunsTown: true, noOfficialNeeded: true, noSeizures: true };
    case "no quartering":
      return { noWinterQuarters: true };
    case "faith tolerance":
      return { minorityFaithOpen: true, endsWrongFaith: true, clergyLordsWaver: true };
    case "free trade":
      return { noTolls: true };
    case "mining right":
      return { merchantRunsMine: true, ownerOutputShare: cfg.charters.mining_right_share, fasterDigging: true, newSeams: true };
    default:
      throw new Error(`unknown charter ${kind}`);
  }
}

/** Grants a charter, by the ruler, on a town's or lord's demand, or forced by rebels (PROV-211). */
export function grantCharter(p: Province, kind: string): void {
  charterEffect(kind);
  if (!p.charters.includes(kind)) p.charters.push(kind);
  if (kind === "free trade") for (const point of Object.keys(p.tolls)) p.tolls[point] = "none";
  if (kind === "tax cap" && p.taxRate && RATES.indexOf(p.taxRate) > RATES.indexOf("light")) p.taxRate = "light";
}

/** Revoking leaves *Broken charter* for 20 years, and every lord notices (PROV-212). */
export function revokeCharter(p: Province, kind: string): { lordsNotice: boolean } {
  if (!p.charters.includes(kind)) return { lordsNotice: false };
  p.charters = p.charters.filter((c) => c !== kind);
  p.brokenCharters.push({ kind, years: 0 });
  return { lordsNotice: true };
}

/** A conqueror keeps or revokes the charters he finds (PROV-213). */
export function conquerCharters(p: Province, conqueror: string, keep: boolean): void {
  changeOwner(p, conqueror);
  if (!keep) for (const c of [...p.charters]) revokeCharter(p, c);
}

/** Seizing property under town law breaks the charter (PROV-214). */
export function seizeProperty(p: Province): { brokeCharter: boolean } {
  if (!p.charters.includes("town law")) return { brokeCharter: false };
  revokeCharter(p, "town law");
  return { brokeCharter: true };
}

// ---------------------------------------------------------------- defence

const CASTLES = provinceConfig.castle.steps as CastleStep[];

/** Builds or upgrades the castle one step, if research allows that step (PROV-220). */
export function upgradeCastle(p: Province, to: CastleStep, cfg: ProvinceConfig = provinceConfig): boolean {
  const unlock = (cfg.buildings.castle_steps as Record<string, string | null>)[to];
  if (CASTLES.indexOf(to) <= CASTLES.indexOf(p.castle) || !unlock || !knows(p, unlock)) return false;
  p.castle = to;
  p.castleYearsUnkept = 0;
  return true;
}

/** A year without upkeep; after 10 the castle drops a step (PROV-220). */
export function castleYearUnkept(p: Province, cfg: ProvinceConfig = provinceConfig): void {
  p.castleYearsUnkept++;
  if (p.castleYearsUnkept >= cfg.castle.neglect_years) {
    p.castle = CASTLES[Math.max(0, CASTLES.indexOf(p.castle) - 1)]!;
    p.castleYearsUnkept = 0;
  }
}

/** Destroyed in a siege or demolished in a peace (PROV-220). */
export function castleLost(p: Province): void {
  p.castle = "none";
  p.breaches = 0;
  p.garrison = 0;
}

/** On hills or mountains the castle is far harder to take (PROV-221). */
export function castleHardToTake(p: Province, cfg: ProvinceConfig = provinceConfig): boolean {
  return p.castle !== "none" && cfg.castle_hard_grounds.includes(p.ground);
}

/** A castle on a shore tile can be supplied by sea (PROV-221). */
export function suppliedBySea(castleOnShore: boolean): boolean {
  return castleOnShore;
}

/** Siege guns, mining and earthquakes open breaches, up to 3 (PROV-222). */
export function breach(p: Province, cfg: ProvinceConfig = provinceConfig): void {
  p.breaches = Math.min(cfg.walls.max_breaches, p.breaches + 1);
}

/** Gold and months repair one breach (PROV-222). */
export function repairBreach(p: Province): void {
  p.breaches = Math.max(0, p.breaches - 1);
}

/** A castle with no garrison falls at once when an enemy enters (PROV-223). */
export function castleFallsAtOnce(p: Province): boolean {
  return p.castle !== "none" && p.garrison <= 0;
}
