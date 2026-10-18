import config from "../../../../rules/data/domain/recruiting.json" with { type: "json" };
import { workingShare } from "../province/index.ts";
import { fastest, type MoveWorld, newArmy } from "../troop-movement/index.ts";
import type { Rng } from "../../rng.ts";

/**
 * Recruiting (domain/recruiting/spec.md): who can be called, the levy and what it costs, the recruit
 * pool, training levies into regiments, standing regiments and retinues, what soldiers bring home,
 * and commanders commissioned from officials. Pure rules on plain data; numbers from recruiting.json.
 */

export const recruitingConfig = config;
export type RecruitingConfig = typeof config;

/** Inventions a realm knows, by id ("W12", "W15", "W18" …). */
export type Known = ReadonlySet<string> | readonly string[];
const knows = (k: Known | undefined, id: string): boolean => !!k && (Array.isArray(k) ? (k as readonly string[]).includes(id) : (k as ReadonlySet<string>).has(id));

const round = (n: number, places = 6): number => Math.round(n * 10 ** places) / 10 ** places;

// ---------------------------------------------------------------- who can be called (RECR-001..007)

export type CallClass = keyof typeof config.callShares;
export const CALL_CLASSES = Object.keys(config.callShares) as CallClass[];

/** Fighting-age men: about a quarter of the people (RECR-001). */
export function fightingAgeMen(people: number, cfg: RecruitingConfig = config): number {
  return people * cfg.fightingAgeShare;
}

/** A class's call share of its fighting-age men; half as much again with W15 Mass conscription (RECR-002, RECR-006). */
export function callShare(cls: string, known?: Known, cfg: RecruitingConfig = config): number {
  const base = (cfg.callShares as Record<string, number>)[cls];
  if (base === undefined) throw new Error(`no call share for class ${cls}`);
  return knows(known, cfg.massConscription.invention) ? base * cfg.massConscription.callShareMultiplier : base;
}

/** Men a class can give: its people × fighting-age share × call share; clergy and scholars give none (RECR-002, RECR-007). */
export function callableOfClass(people: number, cls: string, known?: Known, cfg: RecruitingConfig = config): number {
  return fightingAgeMen(people, cfg) * callShare(cls, known, cfg);
}

/** The ceiling: the sum over classes of fighting-age men × call share (RECR-003, INV-RECR-2). */
export function ceiling(peopleByClass: Readonly<Record<string, number>>, known?: Known, cfg: RecruitingConfig = config): number {
  let n = 0;
  for (const [cls, people] of Object.entries(peopleByClass)) n += callableOfClass(people, cls, known, cfg);
  return n;
}

/** Recruits here never pass the ceiling and never go below zero (RECR-004, INV-RECR-1, INV-RECR-3). */
export function holdAtCeiling(recruits: number, ceil: number): number {
  return Math.max(0, Math.min(recruits, ceil));
}

/** Every levied man arrives as levy foot, whatever his class (RECR-005, INV-RECR-6). */
export const LEVY_ARM = "levy foot";

// ---------------------------------------------------------------- the levy (RECR-008..018)

/** One province's men who can be called now, by class (its pool), and veterans among them. */
export interface PoolSource {
  id: string;
  /** Recruits here by class. */
  byClass: Record<string, number>;
  veterans?: number;
}

export interface LevyDraw {
  men: number;
  /** Share of every pool taken (the same everywhere: INV-RECR-5). */
  share: number;
  byProvince: Record<string, Record<string, number>>;
  byClass: Record<string, number>;
  veterans: number;
  veteransByProvince: Record<string, number>;
}

const poolOf = (p: PoolSource): number => Object.values(p.byClass).reduce((a, b) => a + b, 0);

/**
 * A levy takes from every class by its share of the men who can be called, and from every province of a
 * region by its share of the region's men; veterans come along by their share of the pool (RECR-010..012).
 */
export function drawLevy(sources: readonly PoolSource[], men: number): LevyDraw {
  const total = sources.reduce((n, p) => n + poolOf(p), 0);
  if (men > total + 1e-9) throw new Error(`only ${total} men can be called`);
  const share = total > 0 ? men / total : 0;
  const out: LevyDraw = { men, share, byProvince: {}, byClass: {}, veterans: 0, veteransByProvince: {} };
  for (const p of sources) {
    const taken: Record<string, number> = {};
    for (const [cls, n] of Object.entries(p.byClass)) {
      taken[cls] = n * share;
      out.byClass[cls] = (out.byClass[cls] ?? 0) + n * share;
    }
    out.byProvince[p.id] = taken;
    const v = (p.veterans ?? 0) * share;
    out.veteransByProvince[p.id] = v;
    out.veterans += v;
  }
  return out;
}

/** Takes a drawn levy out of the pools; returns each province's pool left as a share of what it had. */
export function applyLevy(sources: PoolSource[], draw: LevyDraw): Record<string, number> {
  const left: Record<string, number> = {};
  for (const p of sources) {
    const before = poolOf(p);
    const taken = draw.byProvince[p.id] ?? {};
    for (const cls of Object.keys(p.byClass)) p.byClass[cls] = Math.max(0, p.byClass[cls]! - (taken[cls] ?? 0));
    p.veterans = Math.max(0, (p.veterans ?? 0) - (draw.veteransByProvince[p.id] ?? 0));
    left[p.id] = before > 0 ? poolOf(p) / before : 0;
  }
  return left;
}

export type Season = "sowing" | "harvest" | "other";

/** Lost harvest: twice the share of farmers taken in a sowing season, × 1.5 at harvest, nothing otherwise (RECR-034). */
export function harvestLoss(farmerShareTaken: number, season: Season, cfg: RecruitingConfig = config): number {
  if (season === "other") return 0;
  const k = cfg.harvestLoss.farmerShareMultiplier * (season === "harvest" ? cfg.harvestLoss.harvestMultiplier : 1);
  return farmerShareTaken * k;
}

/** Sowing and harvest months per climate: north, south and rice lands (RECR-035, RECR-037, D-RECR-14). */
export type SeasonCalendar = Record<string, { sowing: number[]; harvest: number[] }>;

export function seasonOf(month: number, climate: string, calendar: SeasonCalendar = config.seasonMonthsByClimate as SeasonCalendar): Season {
  const c = calendar[climate];
  if (!c) throw new Error(`no season months for climate ${climate}`);
  if (c.harvest.includes(month)) return "harvest";
  if (c.sowing.includes(month)) return "sowing";
  return "other";
}

/** The levy screen shows a warning in a sowing or harvest month (RECR-038). */
export const harvestWarning = (season: Season): boolean => season !== "other";

/** Levy money up front: 20 gold per 1,000 men (RECR-015). */
export const levyMoney = (men: number, cfg: RecruitingConfig = config): number => (men / 1000) * cfg.levyMoneyPer1000;

/** Food eaten while gathering: 1 ration a man a month for the 2 weeks of gathering, from the local store (RECR-016). */
export const gatheringFood = (men: number, cfg: RecruitingConfig = config): number => men * cfg.rations.gathering * cfg.gathering.months;

/** Gold a month for a levy: nothing for the first 3 months, 0.15 a man from the 4th (RECR-017). */
export function levyPay(men: number, monthsServed: number, cfg: RecruitingConfig = config): number {
  return monthsServed > cfg.freeMonths ? men * cfg.levyPay : 0;
}

/**
 * The levy of one province (RECR-104, RECR-105): there is no region or country levy. Men are called
 * in whole thousands (`levyUnit`), shown as a percent of the men who can be called there.
 */
export function provinceLevy(callable: number, thousands: number, cfg: RecruitingConfig = config): { men: number; thousands: number; percent: number } {
  const k = Math.max(0, Math.round(thousands));
  const men = k * cfg.levyUnit;
  return { men, thousands: k, percent: callable > 0 ? Math.round((men / callable) * 100) : 100 };
}

/** Days until a levy has gathered: 2 weeks; 3 days with W18 Railway mobilization (RECR-013, RECR-014, D-RECR-12). */
export function gatheringDays(known?: Known, cfg: RecruitingConfig = config): number {
  return knows(known, cfg.railwayMobilizationInvention) ? cfg.gathering.railwayDays : cfg.gathering.days;
}

/**
 * Where a levy gathers: as one army in the drawn province that gives the most men (ties: the first id in
 * order), then on to the realm's "New regiments go to" rally point if one is set (RECR-103, D-RECR-15).
 */
export function musterPlace(draw: LevyDraw, rallyPoint?: string): { gathersAt: string; thenMarchesTo?: string } {
  let best: { id: string; men: number } | null = null;
  for (const id of Object.keys(draw.byProvince).sort()) {
    const men = Object.values(draw.byProvince[id]!).reduce((a, b) => a + b, 0);
    if (!best || men > best.men + 1e-9) best = { id, men };
  }
  if (!best) throw new Error("a levy draws from at least one province");
  return rallyPoint !== undefined && rallyPoint !== best.id ? { gathersAt: best.id, thenMarchesTo: rallyPoint } : { gathersAt: best.id };
}

export interface Levy {
  id: string;
  owner: string;
  men: number;
  arm: string;
  kind: "levy";
  gatheredOnDay: number;
  monthsServed: number;
  canMarch: boolean;
  canFight: boolean;
}

/** The men of a levy once gathered: levy foot who can march and fight at once (RECR-005, RECR-013). */
export function gatherLevy(id: string, owner: string, men: number, known?: Known): Levy {
  return { id, owner, men, arm: LEVY_ARM, kind: "levy", gatheredOnDay: gatheringDays(known), monthsServed: 0, canMarch: true, canFight: true };
}

export interface LevyCostLine {
  label: string;
  value: string | number;
  gain: string[];
  lose: string[];
}

export interface LevyScreen {
  goldNow: number;
  foodNow: number;
  freeMonths: number;
  payPerMonth: number;
  harvestLoss: number;
  poolLeft: number;
  readyInDays: number;
  readyAt: string;
  arm: string;
  harvestWarning: boolean;
  lines: LevyCostLine[];
}

/**
 * The levy screen: one slider for men and the costs, one calculation when tapped (RECR-008, RECR-009, RECR-100).
 * Every cost line carries its gain and lose list.
 */
export function levyScreen(sources: readonly PoolSource[], men: number, o: { season: Season; farmers: number; gatherAt: string; known?: Known }): LevyScreen {
  const draw = drawLevy(sources, men);
  const farmerShare = o.farmers > 0 ? (draw.byClass["farmers"] ?? 0) / o.farmers : 0;
  const loss = harvestLoss(farmerShare, o.season);
  const gold = levyMoney(men);
  const food = gatheringFood(men);
  const pay = men * config.levyPay;
  const left = 1 - draw.share;
  const days = gatheringDays(o.known);
  return {
    goldNow: gold,
    foodNow: food,
    freeMonths: config.freeMonths,
    payPerMonth: pay,
    harvestLoss: loss,
    poolLeft: left,
    readyInDays: days,
    readyAt: o.gatherAt,
    arm: LEVY_ARM,
    harvestWarning: harvestWarning(o.season),
    lines: [
      { label: "Gold now", value: gold, gain: ["treasury"], lose: ["levy money: 20 gold per 1,000 men"] },
      { label: "Food now", value: food, gain: ["local stores"], lose: ["gathering: 1 ration a man a month"] },
      { label: "Pay", value: pay, gain: ["3 free months"], lose: ["0.15 gold a man a month from the 4th month"] },
      { label: "Harvest", value: -loss, gain: ["winter levy"], lose: ["farmers taken in sowing or harvest"] },
      { label: "Pool left", value: left, gain: ["yearly refill", "men coming home"], lose: ["this levy"] },
      { label: "Ready in", value: days, gain: ["W18 Railway mobilization"], lose: ["gathering"] },
    ],
  };
}

/** A building below half its slots goes fallow: no tax and no wares (RECR-018; province's rule). */
export function buildingAfterLevy(workers: number, slots: number): { fallow: boolean; paysTax: boolean; makesWares: boolean } {
  const { fallow } = workingShare(workers, slots);
  return { fallow, paysTax: !fallow, makesWares: !fallow };
}

// ---------------------------------------------------------------- the pool (RECR-019..030)

/** Per-province recruitment counts (ProvinceRecruitment). */
export interface ProvincePool {
  ceiling: number;
  recruits: number;
  fallen: number;
  veterans: number;
  /** Births cut, as a share, with the year it ends. */
  birthsCuts?: { share: number; until: number }[];
}

/** Refill rate a year: a quarter of the gap, a third with a muster master (RECR-019, D-RECR-3). */
export const refillRate = (musterMaster = false, cfg: RecruitingConfig = config): number => (musterMaster ? cfg.refillPerYear.musterMaster : cfg.refillPerYear.base);

/** Yearly refill: a quarter of the gap to the ceiling, a third with a muster master (RECR-019). */
export function refill(p: ProvincePool, years = 1, rate = config.refillPerYear.base): void {
  p.recruits = holdAtCeiling(p.recruits + (p.ceiling - p.recruits) * rate * years, p.ceiling);
}

export const POOL_GAINS = ["disbanded men coming home"] as const;
export const POOL_LOSSES = ["a levy", "students enrolling", "famine", "plague", "men dying in war", "rebels drawing from it"] as const;

/** Applies one cause to Recruits here, held between 0 and the ceiling (RECR-020, RECR-021). */
export function poolCause(p: ProvincePool, cause: string, men: number): void {
  if ((POOL_GAINS as readonly string[]).includes(cause)) p.recruits = holdAtCeiling(p.recruits + men, p.ceiling);
  else if ((POOL_LOSSES as readonly string[]).includes(cause)) p.recruits = holdAtCeiling(p.recruits - men, p.ceiling);
  else throw new Error(`recruits here are not changed by ${cause}`);
}

/** Conscription threshold as a share of the ceiling (RECR-023..025); with W15 the tenth applies even with fallen (D-RECR-10). */
export function conscriptionThreshold(o: { fallen?: boolean; massConscription?: boolean }, cfg: RecruitingConfig = config): number {
  if (o.massConscription) return cfg.conscription.massConscription;
  if (o.fallen) return cfg.conscription.withFallen;
  return cfg.conscription.base;
}

/** A levy that leaves Recruits here below the threshold share of the ceiling gives Conscription (RECR-023, D-RECR-10). */
export function givesConscription(left: number, ceil: number, o: { fallen?: boolean; massConscription?: boolean } = {}): boolean {
  return left < ceil * conscriptionThreshold(o);
}

/** A soldier levied here died: Fallen from here rises and births are cut 0.2 % per 1 % of people fallen for 10 years (RECR-026, RECR-027). */
export function soldiersFell(p: ProvincePool, men: number, people: number, year: number, cfg: RecruitingConfig = config): number {
  p.fallen += men;
  const cut = ((men / people) * 100 * cfg.birthsCutPerFallenPercent) / 100;
  (p.birthsCuts ??= []).push({ share: cut, until: year + cfg.birthsCutYears });
  return cut;
}

/** Births cut in a given year from the fallen. */
export const birthsCutIn = (p: ProvincePool, year: number): number => (p.birthsCuts ?? []).filter((c) => c.until > year).reduce((n, c) => n + c.share, 0);

/** Disbanded men who were trained or stood in a battle come home as Veterans here (RECR-028). */
export function veteransHome(p: ProvincePool, men: number): void {
  p.veterans += men;
}

/** Veterans leaving as settlers or dying (RECR-029). */
export function veteransLeave(p: ProvincePool, men: number): void {
  p.veterans = Math.max(0, p.veterans - men);
}

/**
 * The yearly step, run in the turn in which 1 January falls (RECR-100, D-RECR-11): refill, a tenth of the fallen fades, a
 * tenth of the veterans are lost to old age (RECR-019, RECR-026, RECR-029).
 */
export function yearPasses(p: ProvincePool, o: { musterMaster?: boolean } = {}, cfg: RecruitingConfig = config): void {
  refill(p, 1, refillRate(!!o.musterMaster, cfg));
  p.fallen *= 1 - cfg.fallenFadePerYear;
  p.veterans *= 1 - cfg.veteransFadePerYear;
}

/** While a province riots only half its Recruits here can be called; the ceiling is untouched (RECR-022, D-RECR-24). */
export const callableNow = (p: ProvincePool, rioting: boolean, cfg: RecruitingConfig = config): number => (rioting ? p.recruits * cfg.riotCallableShare : p.recruits);

/** Births cut by the share of fighting-age men away (RECR-030). */
export const birthsCutForMenAway = (shareAway: number): number => shareAway;

// ---------------------------------------------------------------- food (RECR-031..033)

export type Where = "at home" | "in training camp" | "on campaign" | "gathering";

/** Rations a month: 1 at home, 1.5 in camp, 2 on campaign; 3 a horse (RECR-031, RECR-032). */
export function rations(men: number, where: Where, horses = 0, cfg: RecruitingConfig = config): number {
  const per = { "at home": cfg.rations.home, "in training camp": cfg.rations.camp, "on campaign": cfg.rations.campaign, gathering: cfg.rations.gathering }[where];
  return men * per + horses * cfg.rations.horse;
}

/** The reserve filled before marching abroad: reserve months × 2 rations a man (3 a horse) (RECR-033). */
export const reserveFill = (men: number, horses: number, months: number): number => rations(men, "on campaign", horses) * months;

/** Takes food from the castle store first, then the province (RECR-031, RECR-033). */
export function takeFood(need: number, stores: { castle: number; province: number }): { fromCastle: number; fromProvince: number; short: number } {
  const fromCastle = Math.min(need, stores.castle);
  const fromProvince = Math.min(need - fromCastle, stores.province);
  stores.castle -= fromCastle;
  stores.province -= fromProvince;
  return { fromCastle, fromProvince, short: need - fromCastle - fromProvince };
}

/** What an army costs in food against the same men fed at home (worked example: 11,500 − 5,000). */
export const foodAgainstHome = (men: number, horses: number): number => rations(men, "on campaign", horses) - rations(men, "at home");

/** Food cut by a commander's Logistics: 5 % a point (worked example §8). */
export const logisticsFoodCut = (logistics: number, cfg: RecruitingConfig = config): number => logistics * cfg.logisticsFoodCutPerPoint;

// ---------------------------------------------------------------- training (RECR-039..054)

export type TrainingPlace = keyof typeof config.trainingRoom;

/** Training room of a province: castle room plus drill yard (or barracks) room (RECR-040, RECR-041). */
export function trainingRoom(places: readonly string[], cfg: RecruitingConfig = config): number {
  let n = 0;
  for (const p of places) {
    const r = (cfg.trainingRoom as Record<string, number>)[p];
    if (r === undefined) throw new Error(`${p} is not a training place`);
    n += r;
  }
  return n;
}

/** Only a castle or a drill yard (or its barracks step) trains (RECR-039). */
export const canTrain = (places: readonly string[]): boolean => places.some((p) => p in config.trainingRoom);

/** Where levies in a town with no training place go: the nearest place that can train, by the shared planner (RECR-042). */
export function nearestTrainingPlace(w: MoveWorld, owner: string, from: string, trainingAt: readonly string[]): string | null {
  if (trainingAt.includes(from)) return from;
  const probe = newArmy("probe", owner, from, 1);
  let best: { place: string; days: number } | null = null;
  for (const t of trainingAt) {
    const r = fastest(w, probe, t);
    if (!r) continue;
    const days = r.arrive[r.arrive.length - 1] ?? 0;
    if (!best || days < best.days) best = { place: t, days };
  }
  return best?.place ?? null;
}

export type ArmName = keyof typeof config.arms;

export interface TrainingCost {
  months: number;
  gold: number;
  needs: Record<string, number>;
  /** Needs the table names without a number (gun crews: the guns, horses or oxen for them). */
  also: string[];
  drill: number;
}

const ARM = (arm: string) => {
  const a = (config.arms as Record<string, { months: number; gold: number; needs: Record<string, number>; also?: string[] }>)[arm];
  if (!a) throw new Error(`no arm ${arm}`);
  return a;
};

/**
 * Months, gold and needs of a training order for `men` levies (RECR-045..048): veterans in half the time,
 * a Marshal 25 % faster and drill 4, retraining at half months and half gold.
 */
export function trainingCost(arm: string, men: number, o: { veteranShare?: number; marshal?: boolean; retrain?: boolean } = {}, cfg: RecruitingConfig = config): TrainingCost {
  const a = ARM(arm);
  let months = a.months * (1 - (1 - cfg.veteranTimeFactor) * (o.veteranShare ?? 0));
  let gold = (a.gold * men) / 1000;
  if (o.retrain) {
    months *= cfg.retrain.months;
    gold *= cfg.retrain.gold;
  }
  if (o.marshal) months *= 1 - cfg.marshal.trainingSpeedUp;
  const needs: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.needs)) needs[k] = (v * men) / 1000;
  return { months: round(months), gold: round(gold), needs, also: a.also ?? [], drill: o.marshal ? cfg.marshal.drill : cfg.trained.drill };
}

/** Food of a training order: 1.5 rations a man and 3 a horse a month, for its months (RECR-031). */
export const trainingFood = (men: number, horses: number, months: number): number => rations(men, "in training camp", horses) * months;

/** Months of pay owed before a trained levy fights: training past the 3 free months (RECR-054). */
export const payMonthsOwed = (months: number, cfg: RecruitingConfig = config): number => Math.max(0, months - cfg.freeMonths);

export interface TrainingOrder {
  id: string;
  place: string;
  arm: string;
  men: number;
  monthsLeft: number;
  monthsDone: number;
  stopped?: boolean;
  marshal?: boolean;
  kind: string;
}

export interface Regiment {
  id: string;
  arm: string;
  men: number;
  kind: string;
  drill: number;
  scars?: boolean;
  signedOn?: boolean;
  /** Months out since raised, for going home (RECR-053). */
  monthsOut?: number;
  paidDouble?: boolean;
  home?: string;
}

/** Gives a training order; refused for an arm not unlocked or with no room (RECR-043, RECR-044, INV-RECR-4, INV-RECR-7). */
export function orderTraining(
  o: { id: string; place: string; arm: string; men: number; kind?: string; unlocked: readonly string[]; room: number; inTraining?: number; marshal?: boolean; veteranShare?: number },
): { ok: true; order: TrainingOrder; cost: TrainingCost } | { ok: false; reason: string } {
  if (!o.unlocked.includes(o.arm)) return { ok: false, reason: "arm not unlocked" };
  if ((o.inTraining ?? 0) + o.men > o.room) return { ok: false, reason: "no training room" };
  const cost = trainingCost(o.arm, o.men, { veteranShare: o.veteranShare ?? 0, marshal: !!o.marshal });
  return { ok: true, cost, order: { id: o.id, place: o.place, arm: o.arm, men: o.men, monthsLeft: cost.months, monthsDone: 0, kind: o.kind ?? "levy", ...(o.marshal ? { marshal: true } : {}) } };
}

/** A month of training: months tick down unless the place is under siege (RECR-050, RECR-100). */
export function tickTraining(order: TrainingOrder, besieged = false): Regiment | null {
  if (besieged) {
    order.stopped = true;
    return null;
  }
  order.stopped = false;
  order.monthsLeft = round(Math.max(0, order.monthsLeft - 1));
  order.monthsDone += 1;
  return order.monthsLeft <= 0 ? finishTraining(order) : null;
}

/** A finished regiment: its arm, drill 3 (4 under a Marshal), its kind unchanged (RECR-051, INV-RECR-9). */
export function finishTraining(order: TrainingOrder): Regiment {
  return { id: order.id, arm: order.arm, men: order.men, kind: order.kind, drill: order.marshal ? config.marshal.drill : config.trained.drill };
}

/** Called out of training: the men go as levy foot and the months spent are lost (RECR-049, INV-RECR-8). */
export function callOutOfTraining(order: TrainingOrder): { arm: string; men: number; monthsLost: number } {
  const lost = order.monthsDone;
  order.monthsDone = 0;
  return { arm: LEVY_ARM, men: order.men, monthsLost: lost };
}

/** Retraining keeps drill and scars (RECR-048). */
export function retrain(r: Regiment, arm: string): { regiment: Regiment; cost: TrainingCost } {
  const cost = trainingCost(arm, r.men, { retrain: true });
  return { regiment: { ...r, arm }, cost };
}

/** Drill and break point of a company: untrained 0 and 25 %; trained 3 (4 under a Marshal) and 30 % plus troop level (RECR-051, RECR-052). */
export function drillAndBreak(state: "untrained" | "trained" | "trained under a Marshal", troopLevel = 0): { drill: number; breakPoint: number } {
  if (state === "untrained") return { drill: config.untrained.drill, breakPoint: config.untrained.breakPoint };
  return { drill: state === "trained" ? config.trained.drill : config.marshal.drill, breakPoint: config.trained.breakPoint + troopLevel };
}

/** Pay group of an arm (RECR-102, D-RECR-9). */
export function payGroupOf(arm: string): string {
  const g = (config.payGroupOfArm as Record<string, string>)[arm];
  if (!g) throw new Error(`no pay group for ${arm}`);
  return g;
}

/** Gold a month for a trained regiment: pay by arm (RECR-051); standing regiments 1.5 times (RECR-055). */
export function regimentPay(group: string, men: number, standing = false, cfg: RecruitingConfig = config): number {
  let pay: number;
  if (group === "levy") pay = men * cfg.levyPay;
  else if (group === "gun crews") pay = (men / cfg.gunCrew.men) * cfg.gunCrew.payPerCrew;
  else {
    const per = (cfg.payByGroup as Record<string, number>)[group];
    if (per === undefined) throw new Error(`no pay group ${group}`);
    pay = men * per;
  }
  return round(standing ? pay * cfg.standingPayMultiplier : pay);
}

/** Men of a levy-kind regiment going home this month: after 6 months out, 5 % a month unless paid double (RECR-053). */
export function goingHome(r: Regiment, cfg: RecruitingConfig = config): number {
  if (r.kind !== "levy" || r.signedOn || r.paidDouble || (r.monthsOut ?? 0) <= cfg.goesHome.afterMonths) return 0;
  return r.men * cfg.goesHome.sharePerMonth;
}

// ---------------------------------------------------------------- standing regiments and retinues (RECR-055..059)

/** Signs a trained regiment on: needs W12; stays under arms in peace, keeps drill and scars, paid 1.5 times (RECR-055, RECR-056). */
export function signOn(r: Regiment, known: Known): { ok: true; regiment: Regiment } | { ok: false; reason: string } {
  if (!knows(known, config.standingRegimentsInvention)) return { ok: false, reason: "needs W12 Standing regiments" };
  if (r.arm === LEVY_ARM && r.drill === 0) return { ok: false, reason: "not trained" };
  return { ok: true, regiment: { ...r, signedOn: true } };
}

/** A standing regiment in peace housed in a barracks with room gives no Soldiers quartered; otherwise it is quartered on the people (RECR-057). */
export const soldiersQuartered = (inPeace: boolean, barracksRoom: number, men: number): boolean => !(inPeace && barracksRoom >= men);

/** What a lord trains, by his traits (RECR-059). */
export function lordTrains(traits: readonly string[]): string[] | null {
  for (const t of traits) {
    const arms = (config.lordTraining as Record<string, string[]>)[t];
    if (arms) return arms;
  }
  return null;
}

/** A lord's levy and training: the same rules, from his lands, paid from his wealth, at his castles (RECR-058). */
export function lordLevy(lord: { name: string; wealth: number; lands: PoolSource[]; castles: string[] }, men: number): { draw: LevyDraw; paidBy: string; gold: number; trainsAt: string[] } {
  const draw = drawLevy(lord.lands, men);
  const gold = levyMoney(men);
  lord.wealth -= gold;
  return { draw, paidBy: lord.name, gold, trainsAt: lord.castles };
}

// ---------------------------------------------------------------- what recruiting gives back and takes (RECR-060..068)

/** Mouths a province feeds while some of its men serve abroad (RECR-061). */
export const mouthsAtHome = (people: number, menAbroad: number): number => people - menAbroad;

/** A fifth of the pay spent in the province where soldiers train, stand or are quartered: trade and tax owed (RECR-062). */
export function paySpentAtHome(pay: number, cfg: RecruitingConfig = config): { trade: number; taxOwed: number } {
  const n = pay * cfg.paySpentAtHome;
  return { trade: n, taxOwed: n };
}

/** Disbanded men sent as soldier settlers (RECR-063). */
export function soldierSettlers(men: number, year: number, cfg: RecruitingConfig = config): { clearingFactor: number; become: string; men: number; extraRiotGrievances: number; until: number } {
  return { clearingFactor: cfg.settlers.clearingFactor, become: cfg.settlers.becomes, men, extraRiotGrievances: cfg.settlers.extraRiotGrievances, until: year + cfg.settlers.years };
}

/** A tenth of an army's loot goes home with its men, raising local store and tax owed for a year (RECR-064). */
export const lootHome = (loot: number, cfg: RecruitingConfig = config): { gold: number; years: number } => ({ gold: loot * cfg.lootHome.share, years: cfg.lootHome.years });

/** The loot sent home is split among the home provinces by the men each gave (D-RECR-20). */
export function lootHomeSplit(loot: number, menFrom: Readonly<Record<string, number>>, cfg: RecruitingConfig = config): Record<string, number> {
  const total = Object.values(menFrom).reduce((a, b) => a + b, 0);
  const gold = lootHome(loot, cfg).gold;
  return Object.fromEntries(Object.entries(menFrom).map(([p, m]) => [p, total > 0 ? (gold * m) / total : 0]));
}

/** Disbanded men go back into the emptiest slots; those with no free slot become homeless (RECR-065). */
export function comingHome(men: number, freeSlots: number): { slots: number; homeless: number } {
  const slots = Math.min(men, Math.max(0, freeSlots));
  return { slots, homeless: men - slots };
}

/** When an army disbands its arms always go back to the store; the player is not asked (RECR-066, X-7). */
export function disbandArms(): { armsToStore: true; askPlayer: false } {
  return { armsToStore: true, askPlayer: false };
}

/** Plague rumours brought home: 1 in 4 of the provinces disbanded into, when within 3 months of a plague campaign (RECR-067). */
export function sicknessHome(provinces: readonly string[], monthsSincePlague: number, rng: Rng, cfg: RecruitingConfig = config): string[] {
  if (monthsSincePlague > cfg.sicknessHome.withinMonths) return [];
  const n = Math.floor(provinces.length / cfg.sicknessHome.oneIn);
  const pool = [...provinces];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(rng.int(pool.length), 1)[0]!);
  return out;
}

/** Levy takes homeless men by their share: fewer homeless means less theft and begging and the state may end (RECR-060). */
export function streetsCleared(homeless: number, taken: number, people: number, homelessStateShare: number): { homeless: number; troubleFalls: boolean; homelessStateCanEnd: boolean } {
  const left = Math.max(0, homeless - taken);
  return { homeless: left, troubleFalls: taken > 0, homelessStateCanEnd: left / Math.max(1, people - taken) < homelessStateShare };
}

/** Students called to arms stop their research (RECR-068). */
export const studentsResearch = (studentsCalled: boolean): "stops" | "goes on" => (studentsCalled ? "stops" : "goes on");

// ---------------------------------------------------------------- commanders from officials (RECR-069..087)

export type OfficialType = keyof typeof config.officialToCommander;

export interface CommanderSkills {
  might: number;
  cunning: number;
  logistics: number;
}

type TypeRow = { might?: number; cunning?: number; logistics?: number; traits: string[]; faithfulArmyOnly?: boolean };
const typeRow = (t: string): TypeRow => {
  const r = (config.officialToCommander as Record<string, TypeRow>)[t];
  if (!r) throw new Error(`no official type ${t}`);
  return r;
};

/**
 * Raises the type's highest skill by 1 at each years-served step (5 and 10); the skill never passes 5 (RECR-071).
 * On a tie the bonus goes to Logistics, then Cunning, then Might (D-RECR-17).
 */
export function yearsServedBonus(base: CommanderSkills, years: number, steps: readonly number[] = config.yearsServedBonus.atYears, max = config.yearsServedBonus.max): CommanderSkills {
  const bonus = steps.filter((y) => years >= y).length;
  if (!bonus) return { ...base };
  const keys = ["logistics", "cunning", "might"] as const;
  const top = Math.max(...keys.map((k) => base[k]));
  const best = keys.find((k) => base[k] === top)!;
  return { ...base, [best]: Math.min(max, top + bonus) };
}

export interface Commission {
  official: string;
  type: string;
  role: "commander" | "captain";
  skills?: CommanderSkills;
  traitOffered: string[];
  trait?: string;
  styles: string[];
  yearsServed: number;
  province?: string;
  choice?: EmptyProvinceChoice;
  victories: number;
  wage: number;
  staff: number;
  staffHorses: number;
}

/**
 * Commissions an official as commander or captain (RECR-069..073, RECR-079..081): skills and trait offer by
 * type, years served added, the realm's current style (a Marshal any style seen in battle), 10 gold once,
 * field wage ×3 or ×2, a staff of 100 or 50.
 */
export function commission(o: {
  official: string;
  type: string;
  role?: "commander" | "captain";
  yearsServed?: number;
  wage?: number;
  province?: string;
  armyFaithShare?: number;
  rolledTrait?: string;
  currentStyle?: string;
  seenStyles?: readonly string[];
}, cfg: RecruitingConfig = config): { commission: Commission; cost: number } {
  const row = typeRow(o.type);
  const role = o.role ?? "commander";
  const years = o.yearsServed ?? 0;
  const skills = row.might === undefined ? undefined : yearsServedBonus({ might: row.might, cunning: row.cunning!, logistics: row.logistics! }, years);
  let offered = row.traits;
  if (row.faithfulArmyOnly) offered = (o.armyFaithShare ?? 1) > 0.5 ? row.traits : [];
  const styles = o.currentStyle === undefined ? [] : o.type === "Marshal" ? [...new Set([o.currentStyle, ...(o.seenStyles ?? [])])] : [o.currentStyle];
  const c: Commission = {
    official: o.official,
    type: o.type,
    role,
    traitOffered: offered,
    styles,
    yearsServed: years,
    victories: 0,
    wage: (o.wage ?? 0) * cfg.fieldWageMultiplier[role],
    staff: cfg.staff[role],
    staffHorses: role === "commander" ? cfg.staff.commanderHorses : cfg.staff.captainHorses,
  };
  if (skills) c.skills = skills;
  if (o.rolledTrait !== undefined) c.trait = o.rolledTrait;
  if (o.province !== undefined) c.province = o.province;
  return { commission: c, cost: cfg.commissionCost };
}

/** The player picks the offered trait or keeps the rolled one (RECR-072). */
export function pickTrait(c: Commission, pick: "offered" | "rolled", offered?: string): void {
  if (pick === "offered") {
    const t = offered ?? c.traitOffered[0];
    if (t === undefined || !(c.traitOffered.includes(t) || c.traitOffered.includes("Any"))) throw new Error("trait not offered");
    c.trait = t;
  }
}

/** Staff food a month, from the army's reserve: 2 rations a head, 3 a staff horse (RECR-081). */
export const staffFood = (staff: number, horses: number, cfg: RecruitingConfig = config): number => staff * cfg.staff.rations + horses * cfg.staff.horseRations;

export type EmptyProvinceChoice = keyof typeof config.emptyProvince;

/** The choices for the province left; a deputy needs 20 clerks, the lord next door must be loyal (RECR-082, RECR-085, RECR-086). */
export function emptyProvinceChoices(clerks: number, loyalLordNextDoor = true, cfg: RecruitingConfig = config): EmptyProvinceChoice[] {
  return (Object.keys(cfg.emptyProvince) as EmptyProvinceChoice[]).filter(
    (c) => !(c === "Name a deputy" && clerks < cfg.deputy.clerksNeeded) && !(c === "Ask the lord next door" && !loyalLordNextDoor),
  );
}

export interface EmptyProvinceEffect {
  tax: number;
  recruits: number;
  state?: string;
  typeEffect: number;
  costPerMonth: number;
  movedOfficialEffect?: number;
  otherProvinceEmpty?: boolean;
  recruitsTo?: string;
  taxToLord?: number;
  lordLoyaltySteps?: number;
  lordMayAskFief?: boolean;
}

/** What the province left gets under each choice (RECR-083..086). */
export function emptyProvinceEffect(choice: EmptyProvinceChoice, cfg: RecruitingConfig = config): EmptyProvinceEffect {
  const e = cfg.emptyProvince;
  switch (choice) {
    case "Leave it":
      return { tax: e["Leave it"].tax, recruits: e["Leave it"].recruits, state: e["Leave it"].state, typeEffect: 0, costPerMonth: 0 };
    case "Move another official in":
      return { tax: 1, recruits: 1, typeEffect: e["Move another official in"].movedEffect, movedOfficialEffect: e["Move another official in"].movedEffect, otherProvinceEmpty: true, costPerMonth: 0 };
    case "Name a deputy":
      return { tax: e["Name a deputy"].tax, recruits: e["Name a deputy"].recruits, typeEffect: e["Name a deputy"].typeEffect, costPerMonth: cfg.deputy.goldPerMonth };
    case "Ask the lord next door":
      return {
        tax: 1 - e["Ask the lord next door"].taxToLord,
        recruits: 0,
        typeEffect: 0,
        costPerMonth: 0,
        recruitsTo: "lord's retinue",
        taxToLord: e["Ask the lord next door"].taxToLord,
        lordLoyaltySteps: e["Ask the lord next door"].loyaltySteps,
        lordMayAskFief: true,
      };
  }
}

/** Released to a province: years served restart at half unless back to the province left and a deputy ran it (RECR-087). */
export function release(c: Commission, to: string, cfg: RecruitingConfig = config): { province: string; yearsServed: number; fullEffectAtOnce: boolean } {
  const kept = to === c.province && c.choice === "Name a deputy";
  return { province: to, yearsServed: kept ? c.yearsServed : c.yearsServed * cfg.releaseYearsFactor, fullEffectAtOnce: kept };
}

/** A Marshal: from an academy, hired at three times an official's price, or raised from a captain of 3 won battles (RECR-075). */
export function marshalFrom(how: "academy" | "hire" | "captain", o: { officialPrice?: number; wonBattles?: number; offerOpen?: boolean } = {}, cfg: RecruitingConfig = config): { ok: boolean; price: number } {
  if (how === "hire") return { ok: true, price: (o.officialPrice ?? 0) * cfg.marshal.hireMultiplier };
  if (how === "captain") return { ok: (o.wonBattles ?? 0) >= cfg.marshal.wonBattlesForOffer && o.offerOpen !== false, price: 0 };
  return { ok: true, price: 0 };
}

/** A Marshal's wage: twice an official's, war or peace (RECR-077). */
export const marshalWage = (officialWage: number, cfg: RecruitingConfig = config): number => officialWage * cfg.marshal.wageMultiplier;

/** An idle Marshal: 10 years in a province with no war lose 1 from the best skill (RECR-078). */
export const idleMarshal = (bestSkill: number, yearsWithoutWar: number, cfg: RecruitingConfig = config): number =>
  yearsWithoutWar >= cfg.marshal.idleYears ? Math.max(0, bestSkill - cfg.marshal.idleSkillLoss) : bestSkill;

// ---------------------------------------------------------------- effects of official commanders (RECR-088..096)

/** An official commander never refuses, never goes home mid-war, never defects with land, and brings no retinue (RECR-088, RECR-093). */
export const officialConduct = { refusesCommand: false, goesHomeMidWar: false, defectsWithLand: false, retinue: 0 } as const;

/**
 * A battle won under an official commander: every lord's loyalty rises one step (up to Loyal, never out of
 * revolt) and the ruler's Victories rise by one; no single lord grows from it (RECR-089, D-RECR-20).
 */
export function officialVictory<L extends { loyalty: string }>(lords: L[], realm: { victories: number }, cfg: RecruitingConfig = config): void {
  const steps = ["Loyal", "Wavering", "Disloyal"];
  for (const l of lords) {
    const i = steps.indexOf(l.loyalty);
    if (i > 0) l.loyalty = steps[Math.max(0, i - cfg.officialVictory.lordLoyaltySteps)]!;
  }
  realm.victories += cfg.officialVictory.rulerVictories;
}

/**
 * Generals who grow too big (RECR-095, D-RECR-16): any commander with 8 victories who led the same regiments
 * 5 years becomes "their man"; a commissioned official with 6 victories asks for land.
 */
export function tooBig(o: { victories: number; yearsWithSameRegiments: number; official: boolean }, cfg: RecruitingConfig = config): "their man" | "asks for land" | null {
  if (o.victories >= cfg.theirMan.victories && o.yearsWithSameRegiments >= cfg.theirMan.years) return "their man";
  if (o.official && o.victories >= cfg.landRequestVictories) return "asks for land";
  return null;
}

/** The answer to a land request: refused, the official becomes Ambitious; granted, a lord with his old soldiers as retinue (RECR-095). */
export function answerLandRequest(answer: "refuse land" | "grant land", soldiers: number): { trait: "Ambitious" } | { becomes: "lord"; retinue: number } {
  return answer === "refuse land" ? { trait: "Ambitious" } : { becomes: "lord", retinue: soldiers };
}

/** Effect an official gives on return: 1.5 times with 3 or more victories, for as long as they hold that post (RECR-090, D-RECR-20). */
export const returnEffect = (victories: number, cfg: RecruitingConfig = config): number => (victories >= cfg.returnBonus.victories ? cfg.returnBonus.factor : 1);

/** Does a lord bring his retinue to an army commanded by an official? A Proud lord refuses unless the war aim is his Want (RECR-092). */
export const lordBringsRetinue = (o: { proud: boolean; officialCommands: boolean; aimIsHisWant: boolean }): boolean => !(o.proud && o.officialCommands && !o.aimIsHisWant);

/** A Proud lord serving as captain under an official wavers a step each season (RECR-091). */
export const proudCaptainWavers = (proud: boolean, underOfficial: boolean): number => (proud && underOfficial ? 1 : 0);

/** An official commander killed or captured: the realm loses a commander and an official; ransom brings both back (RECR-094). */
export function officialLost(roster: { commanders: number; officials: number }): { ransom: () => void } {
  roster.commanders -= 1;
  roster.officials -= 1;
  return {
    ransom: () => {
      roster.commanders += 1;
      roster.officials += 1;
    },
  };
}

/** Who else may lead a royal army (RECR-096). */
export function otherLeader(leader: "the ruler" | "an heir" | "a lord" | "a hired captain" | "an exile"): string {
  return {
    "the ruler": "the ruler leads",
    "an heir": "the heir leads",
    "a lord": "the lord can lead only his own retinue as a captain",
    "a hired captain": "the captain comes with his free company",
    "an exile": "the exile becomes an official of the closest type and can be commissioned",
  }[leader];
}

// ---------------------------------------------------------------- AI (RECR-097..099)

/** What an AI personality does when it raises an army (RECR-097). */
export function aiRaises(personality: string): { levy: string; trains: string; hires: boolean } {
  const p = (config.ai.personalities as Record<string, { levy: string; trains: string; hires?: boolean }>)[personality];
  if (!p) throw new Error(`no AI personality ${personality}`);
  return { levy: p.levy, trains: p.trains, hires: !!p.hires };
}

/** The AI avoids levying in harvest months unless an enemy army is in its land (RECR-098). */
export const aiMayLevy = (season: Season, enemyInLand: boolean): boolean => season !== "harvest" || enemyInLand;

/** Which official the AI commissions: stewards and wardens first, tax collectors kept in their seats (RECR-099). */
export function aiPicksCommander(officials: readonly { id: string; type: string }[]): string | null {
  for (const t of config.ai.commissionFirst) {
    const o = officials.find((x) => x.type === t);
    if (o) return o.id;
  }
  const o = officials.find((x) => !config.ai.keepInSeat.includes(x.type));
  return o?.id ?? null;
}

// ---------------------------------------------------------------- monthly update (RECR-100)

/**
 * A month (RECR-100): training ticks down; in January the yearly step (refill, fallen and veterans
 * fading) runs once (D-RECR-11).
 */
export function monthPasses(p: ProvincePool, orders: TrainingOrder[], o: { besieged?: boolean; month?: number; musterMaster?: boolean } = {}, cfg: RecruitingConfig = config): Regiment[] {
  const done: Regiment[] = [];
  for (const order of orders) {
    const r = tickTraining(order, !!o.besieged);
    if (r) done.push(r);
  }
  if (o.month === cfg.yearlyMonth) yearPasses(p, { musterMaster: !!o.musterMaster }, cfg);
  return done;
}

/** Pay months a levy owes: the 3 free months count from the day it has gathered (RECR-101, D-RECR-8). */
export const paidMonths = (monthsSinceGathered: number, cfg: RecruitingConfig = config): number => Math.max(0, monthsSinceGathered - cfg.freeMonths);

/** Pastoral lands: herd growth falls by twice the share of herders taken in the spring move (RECR-036, D-RECR-14). */
export function herdGrowthLoss(herderShareTaken: number, month: number, hemisphere: "north" | "south", cfg: RecruitingConfig = config): number {
  return cfg.pastoral.springMove[hemisphere].includes(month) ? herderShareTaken * cfg.pastoral.herdShareMultiplier : 0;
}
