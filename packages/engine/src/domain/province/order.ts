import { burnedTiles } from "./land.ts";
import { CLASSES, provinceConfig, tileSlots, totalPeople, townsfolk, workplaces, type ClassName, type Official, type PlagueStep, type Province, type ProvinceConfig, type TaxRate } from "./model.ts";
import { homelessGrievanceWeight, troubleShare } from "./people.ts";
import { heavyTaxesWeight, officialEffect, taxRateOf } from "./rule.ts";
import type { Rng } from "../../rng.ts";

/** Order, health, colonies and the country card (province stats §12, §13, §15, §17). */

// ---------------------------------------------------------------- grievances

export interface GrievanceContext {
  realmDefault?: TaxRate;
}

/** Weight of each grievance the province has now (PROV-230). Counts-as-two grievances weigh 2. */
export function evaluateGrievances(p: Province, ctx: GrievanceContext = {}, cfg: ProvinceConfig = provinceConfig): Record<string, number> {
  const g = cfg.grievances;
  const had = new Set(p.grievances.map((x) => x.name));
  const out: Record<string, number> = {};
  const add = (name: string, weight = 1) => {
    if (weight > 0) out[name] = weight;
  };
  if (!p.charters.includes("tax cap")) add("Heavy taxes", heavyTaxesWeight(taxRateOf(p, ctx.realmDefault ?? "normal", cfg), cfg));
  const hungryEnds = p.storeMonths > g.hungry.ends_above_months && p.storeAboveMonths >= cfg.months_per_season;
  if (p.storeMonths < g.hungry.starts_below_months || (had.has("Hungry") && !hungryEnds)) add("Hungry");
  add("Homeless", homelessGrievanceWeight(troubleShare(p, cfg), cfg));
  if (p.armyMonths > g.soldiers_quartered_seasons * cfg.months_per_season && !p.charters.includes("no quartering")) add("Soldiers quartered");
  if (burnedTiles(p) > 0) add("Burned homes");
  if (p.recruitPool > 0) {
    const share = p.recruits / p.recruitPool;
    if (share < cfg.recruits.conscription_below || (had.has("Conscription") && share < cfg.recruits.conscription_ends_at)) add("Conscription");
  }
  if (p.holderTongue && p.homeland.length > 0 && !p.homeland.includes(p.holderTongue)) add("Foreign rule");
  if (p.rulerFaith && (p.faith[p.rulerFaith] ?? 0) < 0.5 && Object.keys(p.faith).length > 0 && !p.charters.includes("faith tolerance")) add("Wrong faith");
  if (p.official === null && (p.governedBy === "no one" || p.governedBy === "lord") && !p.charters.includes("town law")) add("Ungoverned");
  if (p.lord && p.lordTraits.some((t) => g.harsh_lord_traits.includes(t) || t.startsWith("hostile to"))) add("Harsh lord");
  const fade = p.official?.type === "judge" ? (officialEffect("judge", p.official.yearsServed, cfg).broken_charter_fade as number) : 1;
  if (p.brokenCharters.some((b) => b.years * fade < cfg.charters.broken_years)) add("Broken charter");
  if (p.daysToCapital > cfg.far_from_throne.days) add("Far from the throne");
  if (p.plague === "outbreak") add("Plague");
  if (p.bloodshedYears !== null && p.bloodshedYears < g.bloodshed_years) add("Bloodshed");
  if (p.requisitionedMonthsAgo !== null && p.requisitionedMonthsAgo < g.requisitioned_seasons * cfg.months_per_season) add("Requisitioned");
  if (p.neighbourRebels.length > 0) add("Neighbour in revolt");
  return out;
}

/** Re-evaluates and stores the named grievances, keeping their start months (GrievanceStarted / GrievanceEnded). */
export function updateGrievances(p: Province, ctx: GrievanceContext = {}, cfg: ProvinceConfig = provinceConfig): { started: string[]; ended: string[] } {
  const now = evaluateGrievances(p, ctx, cfg);
  const before = new Set(p.grievances.map((x) => x.name));
  const started = Object.keys(now).filter((n) => !before.has(n));
  const ended = [...before].filter((n) => !(n in now));
  p.grievances = [...p.grievances.filter((x) => x.name in now), ...started.map((name) => ({ name, months: 0 }))];
  return { started, ended };
}

export function grievanceCount(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  return Object.values(evaluateGrievances(p, {}, cfg)).reduce((a, b) => a + b, 0);
}

export type Mood = "calm" | "grumbling" | "riots" | "rebels";

/** Calm, grumbling, riots or rebels from the grievance count (PROV-231). */
export function mood(count: number, cfg: ProvinceConfig = provinceConfig): Mood {
  const l = cfg.grievances.levels;
  if (count >= l.rebels) return "rebels";
  if (count >= l.riots) return "riots";
  if (count >= l.grumbling) return "grumbling";
  return "calm";
}

export interface MoodEffects {
  growthSlows: boolean;
  scholarsAndCraftsmenLeave: boolean;
  taxFactor: number;
  recruitsFactor: number;
  tradersAvoid: boolean;
  lordWavers: boolean;
}

/** What each mood does to the province (PROV-231). */
export function moodEffects(m: Mood, cfg: ProvinceConfig = provinceConfig): MoodEffects {
  const riot = m === "riots" || m === "rebels";
  return {
    growthSlows: m !== "calm",
    scholarsAndCraftsmenLeave: m !== "calm",
    taxFactor: riot ? cfg.tax.riots_factor : 1,
    recruitsFactor: riot ? cfg.tax.riots_factor : 1,
    tradersAvoid: riot,
    lordWavers: riot,
  };
}

/** Rebels in a province: from a disloyal lord raising his retinue, a pretender landing or foreign gold (PROV-233). */
export function raiseRebels(p: Province, source: "disloyal lord" | "pretender" | "foreign gold" | "grievances"): void {
  p.rebels = { source };
}

/** Rebels melt away when beaten, their demand granted, the grievances fixed, or the leader killed or bribed (PROV-233). */
export function rebelsMeltAway(p: Province): void {
  p.rebels = null;
}

/** Rebel armies fight as this warfare kind (PROV-234). */
export const REBEL_KIND = "Rebel band";

/** Provinces counting toward In revolt: riots or rebels (PROV-235). */
export function inRevolt(provinces: { mood: Mood; rebels: boolean }[]): number {
  return provinces.filter((p) => p.rebels || p.mood === "riots" || p.mood === "rebels").length;
}

// ---------------------------------------------------------------- health

const PLAGUE = provinceConfig.plague.steps as PlagueStep[];

/** Plague can reach a province along these links (PROV-240). Quarantine closes the trade links. */
export function plagueCanSpread(link: string, quarantined = false, cfg: ProvinceConfig = provinceConfig): boolean {
  if (!cfg.plague.links.includes(link)) return false;
  return !(quarantined && (link === "road" || link === "river" || link === "sea route"));
}

/** Crowded towns catch plague first: provinces in the order they catch it, most townsfolk first (PROV-240). */
export function plagueCatchOrder<T extends { id: string; townsfolk: number }>(provinces: T[]): T[] {
  return [...provinces].sort((a, b) => b.townsfolk - a.townsfolk);
}

/** Moves plague one step: rumour → outbreak (lasting a season or two) → burning out → none (PROV-240, PROV-241). */
export function plagueSeason(p: Province, rng: Rng, cfg: ProvinceConfig = provinceConfig): PlagueStep {
  if (p.plague === "rumour") {
    p.plague = "outbreak";
    const [lo, hi] = cfg.plague.outbreak_seasons as [number, number];
    p.plagueSeasonsLeft = lo + rng.int(hi - lo + 1);
  } else if (p.plague === "outbreak") {
    p.plagueSeasonsLeft--;
    if (p.plagueSeasonsLeft <= 0) p.plague = "burning out";
  } else if (p.plague === "burning out") p.plague = "none";
  return p.plague;
}

export function plagueStepIndex(s: PlagueStep): number {
  return PLAGUE.indexOf(s);
}

/** Quarantine (PROV-241): trade with the province stops and plague spreads more slowly. */
export function quarantine(p: Province, on: boolean): { tradeStops: boolean; slowerSpread: boolean } {
  p.quarantined = on;
  return { tradeStops: on, slowerSpread: on };
}

/** Plague deaths fall on townsfolk first, then countryfolk (PROV-242). Returns the dead by class. */
export function plagueKill(p: Province, dead: number, cfg: ProvinceConfig = provinceConfig): Record<string, number> {
  const out: Record<string, number> = {};
  const order: ClassName[] = [...(cfg.classes.town as ClassName[]), ...CLASSES.filter((c) => !(cfg.classes.town as string[]).includes(c))];
  let left = dead;
  for (const c of order) {
    if (left <= 0) break;
    const n = Math.min(left, p.people[c]);
    p.people[c] -= n;
    left -= n;
    if (n > 0) out[c] = n;
  }
  return out;
}

/** Smoke comes from factories and coal mines from era V (PROV-244). */
export function hasSmoke(p: Province, eraIndex: number, coalMines: number, cfg: ProvinceConfig = provinceConfig): boolean {
  const from = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].indexOf(cfg.smoke.from_era) + 1;
  const factories = p.town.filter((b) => b === "factory").length;
  return eraIndex >= from && factories + coalMines > 0;
}

export function smokeEffects(smoke: boolean): { townsfolkSick: boolean; tilesWear: boolean; feedsClimateStats: boolean } {
  return { townsfolkSick: smoke, tilesWear: smoke, feedsClimateStats: smoke };
}

// ---------------------------------------------------------------- colonies

/** Free tiles: those the local people do not work (PROV-251). */
export function freeTiles(p: Province): number[] {
  return p.tiles.flatMap((t, i) => (t.local ? [] : [i]));
}

/** Founds a colony in an unowned province on its free tiles only (PROV-250, PROV-251). */
export function foundColony(p: Province, owner: string): number[] | null {
  if (p.owner !== null) return null;
  p.owner = owner;
  p.settlement = "settlement";
  return freeTiles(p);
}

/** A settlement is lost to the local people, disease, abandonment or another power (PROV-252). */
export function loseSettlement(p: Province, toPower: string | null = null): void {
  p.settlement = "none";
  p.settlers = 0;
  p.owner = toPower;
}

/** A trading post is a market that draws traders without taking any tile (PROV-253). */
export function foundTradingPost(p: Province): void {
  p.settlement = "trading post";
}

export function tradingPostWorks(p: Province): { market: boolean; tilesTaken: number } {
  return { market: p.settlement === "trading post", tilesTaken: 0 };
}

/** Settlers live on the free tiles and the buildings on them; when those are full the colony stops growing (PROV-254). */
export function colonyRoom(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  return freeTiles(p).reduce((n, i) => n + (tileSlots(p.tiles[i]!, cfg)?.slots ?? 0), 0);
}

export function colonyCanGrow(p: Province, cfg: ProvinceConfig = provinceConfig): boolean {
  return p.settlers < colonyRoom(p, cfg);
}

export function loseSettlers(p: Province, n: number): void {
  p.settlers = Math.max(0, p.settlers - n);
}

// ---------------------------------------------------------------- the country card

/** Recruits on the country card: royal provinces only; lords' recruits feed their retinues (PROV-260). */
export function countryRecruits(provinces: Province[]): number {
  return provinces.filter((p) => p.governedBy !== "lord" && p.governedBy !== "occupied").reduce((n, p) => n + p.recruits, 0);
}

/** Officials on the country card: the realm's own officials; lords' are counted on their own cards (PROV-195, PROV-260). */
export function countryOfficials(officials: { employer: string }[]): number {
  return officials.filter((o) => o.employer === "ruler").length;
}

// ---------------------------------------------------------------- stats, card, event map

export type Unit = "tiles" | "buildings" | "workers" | "people" | "men" | "gold" | "days" | "months" | "grievances" | "share";

/** The province's stats as counts with their units (PROV-001): there are no abstract meters (PROV-004). */
export function provinceStats(p: Province): Record<string, { value: number; unit: Unit }> {
  return {
    tiles: { value: p.tiles.length, unit: "tiles" },
    burnedTiles: { value: burnedTiles(p), unit: "tiles" },
    buildings: { value: p.tiles.filter((t) => t.building).length + p.town.length, unit: "buildings" },
    workers: { value: workplaces(p).reduce((n, w) => n + w.workers, 0), unit: "workers" },
    people: { value: totalPeople(p), unit: "people" },
    townsfolk: { value: townsfolk(p), unit: "people" },
    homeless: { value: p.people.homeless, unit: "people" },
    refugees: { value: p.refugees.reduce((n, r) => n + r.count, 0), unit: "people" },
    recruits: { value: p.recruits, unit: "men" },
    garrison: { value: p.garrison, unit: "men" },
    daysToCapital: { value: p.daysToCapital, unit: "days" },
    foodStore: { value: p.storeMonths, unit: "months" },
    grievances: { value: grievanceCount(p), unit: "grievances" },
  };
}

/** The meters the design forbids (PROV-004). */
export const FORBIDDEN_METERS = ["development", "base tax", "autonomy", "core", "unrest", "devastation"];

/** The province card's lines, each with its gain and lose list where the design gives one (PROV-002, PROV-292). */
export function provinceCard(cfg: ProvinceConfig = provinceConfig): { lines: string[]; detail(line: string): { gain: string[]; lose: string[] } | null } {
  const gl = cfg.card.gain_lose as Record<string, { gain: string[]; lose: string[] }>;
  return { lines: cfg.card.lines, detail: (line) => gl[line.toLowerCase()] ?? null };
}

/** What an event-tree province stat reads in this game (PROV-270). */
export function eventStatMeaning(stat: string, cfg: ProvinceConfig = provinceConfig): string | null {
  return (cfg.event_map as Record<string, string>)[stat] ?? null;
}

// ---------------------------------------------------------------- the realm's officials

/** Hires an official of a chosen type into the ruler's service (PROV-194). */
export function hireOfficial(roster: Official[], type: string, id = `official-${roster.length + 1}`): Official {
  const o: Official = { id, type, yearsServed: 0, employer: "ruler" };
  roster.push(o);
  return o;
}

/** An official leaves the realm: death, dismissal, unpaid wages, killed, hired away (PROV-194). */
export function loseOfficial(roster: Official[], id: string): void {
  const i = roster.findIndex((o) => o.id === id);
  if (i >= 0) roster.splice(i, 1);
}

// ---------------------------------------------------------------- starting values

export interface StartingInputs {
  population: number;
  wealth: number;
  terrain: string;
  coastal: boolean;
}

/** Once the starting buildings are placed, wealth stops being a live stat (PROV-283): only the province remains. */
export function placeStartingBuildings(p: Province, inputs: StartingInputs, buildings: string[]): { province: Province; live: string[] } {
  void inputs.wealth;
  p.town.push(...buildings);
  return { province: p, live: Object.keys(p) };
}
