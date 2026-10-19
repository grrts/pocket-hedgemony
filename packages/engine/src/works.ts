import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { controller } from "./war.ts";
import { START_YEAR } from "../../rules/src/start.ts";
import { inAnyWar } from "./lords.ts";
import { LEDGER, LEDGER_LINES } from "./treasury.ts";
import { buildingType, buildingsConfig, siteKind, townAtLeast, type TownSize } from "./domain/buildings/index.ts";
import { invention, startingKnowledgeFor } from "./domain/research/index.ts";
import { CHANGES, changeRows, changeTitle, changeUses, changing, type ChangeRow } from "./conversion.ts";
import { classFood, FOOD_CLASSES, jobSlots, precious, roughWaste, saltCoast, seamWare, tileCount, tilesOf, tileWares, USES, wearYearsOf, wornFields, type FoodClass, type UseName } from "./land.ts";
import { CLASS_COUNT, CLASS_NAMES } from "./living.ts";
import { yearlyFood } from "./food.ts";
import { provinceConfig } from "./domain/province/model.ts";
import { tradeConfig } from "./domain/trade/index.ts";
import { heritageFactor } from "./heritage.ts";
import { wallsFoodText } from "./castleSupply.ts";

const provinceMines = provinceConfig.mines;
const MINE_ANCHORS = new Set(Object.keys(provinceMines.anchors));
/** The trade towns the geography anchors name keep their market in 1444, however poor the province (SETUP-068). */
const MARKET_ANCHORS = new Set(buildingsConfig.anchors.filter((a) => a.building === "market" && a.from_year <= START_YEAR).map((a) => a.province));

/**
 * Works (milestone 4, first slice of the buildings context): the crown builds
 * farms, markets, castles, roads and the rest in its provinces. A work costs
 * gold, paid when its site opens, and months to raise; each province has one
 * land site and one town site at a time, and further orders wait in the
 * realm's queue. Built works cost upkeep each month and are neglected (half
 * their effect) while the treasury is empty.
 *
 * The buildings design runs on jobs and wares (BLD-002, BLD-005); until those
 * are simulated each work has a plain stand-in effect from defines.works on a
 * number the game already has (food, trade, recruits, walls, marching). The
 * gold, months, steps, unlocks and town sizes are the buildings data's.
 */

/** The works of this slice, as named in the buildings data. */
export const WORKS = ["farm", "ranch", "fishery", "lumber camp", "quarry", "market", "harbour", "drill yard", "road", "castle", "granary", "hunting lodge", "mine", "saltworks", "shipyard"] as const;
export type WorkName = (typeof WORKS)[number];
export const WORK_COUNT = WORKS.length;
export const workIndex = (name: string): number => (WORKS as readonly string[]).indexOf(name);

export const W = Object.fromEntries(WORKS.map((w, k) => [w, k])) as Record<WorkName, number>;

/** The highest step of each work this slice builds (later steps need inventions or wares not simulated yet). */
const TOP: Record<WorkName, number> = { farm: 3, ranch: 1, fishery: 1, "lumber camp": 1, quarry: 1, market: 3, harbour: 3, "drill yard": 2, road: 2, castle: 2, granary: 1, "hunting lodge": 1, mine: 1, saltworks: 1, shipyard: 3 };

export interface Site {
  nation: number;
  province: number;
  work: number;
  /** Step being built (1 = the first). */
  step: number;
  monthsLeft: number;
  months: number;
  /** Gold paid, half of which comes back if the site is given up. */
  gold: number;
}

export interface QueuedWork {
  nation: number;
  province: number;
  work: number;
  step: number;
}

export interface WorksState {
  /** Marching hours in each province against none (roads speed armies on), kept up to date as roads are built. */
  provinceRoadHours: Float32Array;
  /** Step built of each work in each province (WORK_COUNT per province), 0 = none. */
  provinceWorks: Uint8Array;
  /** Building sites open now. */
  sites: Site[];
  /** Works each realm has ordered that wait for a free site or the gold. */
  workQueue: QueuedWork[];
  /** 1 while a realm's works go unpaid: they give half (buildings 5.9). */
  nationNeglect: Uint8Array;
}

export function createWorksState(P: number, N: number): WorksState {
  return { provinceRoadHours: new Float32Array(P).fill(1), provinceWorks: new Uint8Array(P * WORK_COUNT), sites: [], workQueue: [], nationNeglect: new Uint8Array(N) };
}

export const worksAt = (world: World, p: number, work: number): number => world.provinceWorks[p * WORK_COUNT + work]!;

function stepOf(name: WorkName, step: number) {
  return buildingType(name).steps[step - 1]!;
}

/** Name of a work at a step ("weekly market", "stone castle"; the house-of-worship-style "step1" names fall back to the work's). */
export function workStepName(work: number, step: number): string {
  const name = WORKS[work]!;
  const s = stepOf(name, Math.max(1, step)).name;
  return /^step\d/.test(s) ? name : s;
}

const TOWN_SIZES: readonly TownSize[] = ["hamlet", "village", "market_town", "town", "city", "great_city"];

/** Steps of the province's people passed (defines.works.townPeople, thousands): 0 for a hamlet up to 5 for a great city. */
function peopleStep(world: World, p: number): number {
  const people = world.provincePopulation[p]!;
  let k = 0;
  for (const at of world.rules.defines.works.townPeople) if (people >= at) k++;
  return Math.min(k, TOWN_SIZES.length - 1);
}

/** A town's size from the province's people (BLD-149). */
export const townSize = (world: World, p: number): TownSize => TOWN_SIZES[peopleStep(world, p)]!;

/** Slots a province has for works, one kind for every work, more with more people (Leroy, D-BLD-23). */
export const slotsOf = (world: World, p: number): number => world.rules.defines.works.baseSlots + peopleStep(world, p);

/** Slots taken: every work standing, building or queued from scratch takes one; a higher step takes none more. */
export function slotsUsed(world: World, p: number, pend?: Pending): number {
  let used = 0;
  for (let k = 0; k < WORK_COUNT; k++) {
    // The granary is part of the castle and takes no slot (BLD-008); the shipyard is part of the harbour and takes none either (D-NAVY-33).
    if (k === W.granary || k === W.shipyard) continue;
    if (worksAt(world, p, k) > 0) used++;
    else if (pend ? pend.step[p * WORK_COUNT + k]! > 0 : world.sites.some((x) => x.province === p && x.work === k) || world.workQueue.some((x) => x.province === p && x.work === k)) used++;
  }
  return used;
}

/** Whether realm n knows an invention: what its research has learned, or its 1444 knowledge while the world is being seeded. */
const knownCache = new Map<string, Set<string>>();
export function knowsInvention(world: World, n: number, id: string): boolean {
  if (id === "start") return true;
  const learned = world.research[n];
  if (learned) return learned.known.has(id);
  const nation = world.nationIds[n]!;
  let known = knownCache.get(nation);
  if (!known) knownCache.set(nation, (known = startingKnowledgeFor(nation)));
  return known.has(id);
}

/** An invention's name as the player reads it ("Stone castles"), or its id when the tree doesn't have it. */
function inventionName(id: string): string {
  try {
    return invention(id).name;
  } catch {
    return `the invention ${id}`;
  }
}

/** Whether the province's land suits a work (its place in the buildings data). */
function placeFits(world: World, p: number, name: WorkName): boolean {
  const ground = world.provinceGround[p];
  const coastal = !!world.rules.provinces[p]!.coastal;
  switch (name) {
    // A land work stands in the province and works its tiles of one use (Leroy, D-PROV-25): it needs at least one.
    case "farm":
      return tilesOf(world, p, "fields") > 0;
    case "ranch":
      return tilesOf(world, p, "pasture") > 0;
    case "lumber camp":
    case "hunting lodge":
      return tilesOf(world, p, "woods") > 0;
    case "quarry":
      return tilesOf(world, p, "waste") > 0 && (ground === "hills" || ground === "mountains" || ground === "drylands" || ground === "desert");
    case "mine":
      return roughWaste(world, p);
    case "saltworks":
      return saltCoast(world, p);
    case "fishery":
    case "harbour":
    case "shipyard":
      return coastal;
    case "granary":
      return hasCastle(world, p);
    default:
      return true;
  }
}

/** The tiles a land work improves, as the player reads them. */
const LAND_USE: Partial<Record<WorkName, string>> = { farm: "fields", ranch: "pasture", "lumber camp": "woods", "hunting lodge": "woods", quarry: "rocky waste", mine: "rocky waste in hills or mountains" };

/** Cost of a work's step in a province: the data's gold scaled to this economy and its months, cheaper with timber or stone at hand. */
export function workCost(world: World, p: number, work: number, step: number): { gold: number; months: number } {
  const name = WORKS[work]!;
  const c = stepOf(name, step).cost;
  const d = world.rules.defines.works;
  let gold = (c.gold ?? 0) * d.goldScale;
  if (c.timber && worksAt(world, p, W["lumber camp"]) > 0) gold *= 1 - d.materialsAtHandSaving;
  if ((c.stone || c.bricks) && worksAt(world, p, W.quarry) > 0) gold *= 1 - d.materialsAtHandSaving;
  gold *= heritageFactor(world, world.provinceOwner[p]!, "building_cost_pct");
  return { gold: Math.round(gold * 10) / 10, months: c.months ?? 0 };
}

/** Upkeep a month of a built work at a step (the data's yearly upkeep, scaled). */
export function workUpkeep(world: World, work: number, step: number): number {
  if (step <= 0) return 0;
  return upkeepTable(world)[work * MAX_STEPS + step - 1]!;
}

/** Upkeep a month of every work at every step, worked out once per set of rules. */
const MAX_STEPS = 8;
const upkeeps = new WeakMap<object, Float64Array>();
function upkeepTable(world: World): Float64Array {
  let t = upkeeps.get(world.rules);
  if (t) return t;
  const d = world.rules.defines.works;
  t = new Float64Array(WORK_COUNT * MAX_STEPS);
  WORKS.forEach((name, k) => buildingType(name).steps.forEach((st, i) => (t![k * MAX_STEPS + i] = ((st.upkeep ?? d.defaultUpkeepPerYear) * d.goldScale) / 12)));
  upkeeps.set(world.rules, t);
  return t;
}

/** Works ordered in each province (sites and queue), worked out once for a pass over many provinces. */
export interface Pending {
  /** Highest step ordered of each work in each province (WORK_COUNT per province), 0 = none. */
  step: Uint8Array;
  /** 1 where a province's land (0) or town (1) site is taken, two per province. */
  busy: Uint8Array;
}

function pending(world: World): Pending {
  const step = new Uint8Array(world.provinceCount * WORK_COUNT);
  const busy = new Uint8Array(world.provinceCount * 2);
  for (const s of world.sites) {
    step[s.province * WORK_COUNT + s.work] = Math.max(step[s.province * WORK_COUNT + s.work]!, s.step);
    busy[s.province * 2 + SITE[s.work]!] = 1;
  }
  for (const q of world.workQueue) step[q.province * WORK_COUNT + q.work] = Math.max(step[q.province * WORK_COUNT + q.work]!, q.step);
  return { step, busy };
}

/** The site each work takes: 0 land, 1 town. */
const SITE = WORKS.map((w) => (siteKind(w) === "town" ? 1 : 0));

/** Why nation n can't order a work's next step in a province now, or null when it can. */
export function whyNot(world: World, n: number, p: number, work: number, pend?: Pending): string | null {
  const name = WORKS[work]!;
  if (world.provinceOwner[p] !== n) return "not your province";
  if (world.provinceWater[p]) return "no land to build on";
  if (!placeFits(world, p, name)) return name === "fishery" || name === "harbour" || name === "shipyard" ? "needs a coast" : name === "granary" ? "needs a castle" : name === "saltworks" ? "needs a shore that is dry or warm" : LAND_USE[name] ? `needs ${LAND_USE[name]} in the province` : `the land doesn't suit a ${name}`;
  // A shipyard's slipways run down into a harbour (buildings needs_building).
  if (name === "shipyard" && worksAt(world, p, W.harbour) === 0) return "needs a harbour first";
  if (name === "mine" && worksAt(world, p, work) === 0) {
    if (!seamWare(world, p)) return "no ore deposit has been found here";
    if (!timberInReach(world, p)) return "needs timber: a lumber camp here or next door";
  }
  const step = nextStep(world, p, work, pend);
  if (step > TOP[name]) return worksAt(world, p, work) >= buildingType(name).steps.length ? "built to the top" : "the next step needs what isn't here yet";
  const def = stepOf(name, step);
  if (!knowsInvention(world, n, def.unlocked_by)) return `needs ${inventionName(def.unlocked_by)}`;
  const needs = (def.needs ?? {}) as { min_town?: TownSize; charter?: string; any_of?: string[] };
  if (needs.min_town && !townAtLeast(townSize(world, p), needs.min_town)) return `needs a ${needs.min_town.replace("_", " ")} or bigger`;
  if (needs.charter) return `needs a ${needs.charter}`;
  if (needs.any_of?.includes("river") && !world.provinceRiver[p]) return "needs a river";
  if (step === 1 && name !== "shipyard" && slotsUsed(world, p, pend) >= slotsOf(world, p)) return `no free slot: all ${slotsOf(world, p)} are taken`;
  if (pend ? pend.step[p * WORK_COUNT + work]! > 0 : siteOf(world, p, work) || world.workQueue.some((q) => q.province === p && q.work === work)) return "already ordered";
  return null;
}

/** Step the next order of a work in a province builds: one above what stands, the site or queue counted. */
export function nextStep(world: World, p: number, work: number, pend?: Pending): number {
  let step = worksAt(world, p, work) + 1;
  if (pend) return Math.max(step, pend.step[p * WORK_COUNT + work]! + 1);
  for (const s of world.sites) if (s.province === p && s.work === work) step = Math.max(step, s.step + 1);
  for (const q of world.workQueue) if (q.province === p && q.work === work) step = Math.max(step, q.step + 1);
  return step;
}

export const siteOf = (world: World, p: number, work: number): Site | undefined => world.sites.find((s) => s.province === p && s.work === work);

/** The land or town site of a province is taken. */
function siteBusy(world: World, p: number, work: number): boolean {
  return world.sites.some((s) => s.province === p && SITE[s.work] === SITE[work]);
}

/**
 * Orders a work's next step: it starts at once when the province's site for
 * it is free, its queue is empty and the gold is there; else it goes to the
 * back of the province's queue, at most sites.queue_max deep (BLD-162, BLD-163).
 */
export function orderWork(world: World, n: number, p: number, work: number, news: News[] = [], pend?: Pending): string | null {
  if (!Number.isInteger(work) || work < 0 || work >= WORK_COUNT) return "no such work";
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount) return "no such province";
  const why = whyNot(world, n, p, work, pend);
  if (why) return why;
  const step = nextStep(world, p, work, pend);
  const queued = world.workQueue.filter((q) => q.province === p).length;
  if (!queued && !(pend ? pend.busy[p * 2 + SITE[work]!] : siteBusy(world, p, work)) && world.nationTreasury[n]! >= workCost(world, p, work, step).gold) {
    openSite(world, n, p, work, step, news);
    return null;
  }
  if (queued >= QUEUE_MAX) return `a province's queue holds ${QUEUE_MAX} works at most`;
  world.workQueue.push({ nation: n, province: p, work, step });
  return null;
}

const QUEUE_MAX = 10;

function openSite(world: World, n: number, p: number, work: number, step: number, _news: News[]): void {
  const { gold, months } = workCost(world, p, work, step);
  world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  world.sites.push({ nation: n, province: p, work, step, monthsLeft: months, months, gold });
}

/** Gives up a site (half its gold back) or takes an order off the queue, where nothing was paid (BLD-165). */
export function cancelWork(world: World, n: number, p: number, work: number): string | null {
  const q = world.workQueue.findIndex((x) => x.nation === n && x.province === p && x.work === work);
  if (q >= 0) {
    world.workQueue.splice(q, 1);
    return null;
  }
  const s = world.sites.findIndex((x) => x.nation === n && x.province === p && x.work === work);
  if (s < 0) return "nothing ordered there";
  world.nationTreasury[n] = world.nationTreasury[n]! + world.sites[s]!.gold * 0.5;
  world.sites.splice(s, 1);
  return null;
}

/** Moves a queued order one place earlier (-1) or later (+1) in its province's queue (BLD-165). */
export function moveQueued(world: World, n: number, p: number, work: number, by: number): string | null {
  const mine = world.workQueue.map((q, i) => (q.nation === n && q.province === p ? i : -1)).filter((i) => i >= 0);
  const at = mine.findIndex((i) => world.workQueue[i]!.work === work);
  if (at < 0) return "nothing queued there";
  const to = at + (by < 0 ? -1 : 1);
  if (to < 0 || to >= mine.length) return null;
  const a = mine[at]!;
  const b = mine[to]!;
  [world.workQueue[a], world.workQueue[b]] = [world.workQueue[b]!, world.workQueue[a]!];
  return null;
}

/**
 * Starts the oldest queued orders of each province that now have a free site
 * and the gold, paying for each as it starts; one that must wait keeps its
 * place, and one of a province its realm has lost is taken off (BLD-164).
 */
export function startQueued(world: World, news: News[]): void {
  for (let i = 0; i < world.workQueue.length; ) {
    const q = world.workQueue[i]!;
    if (world.provinceOwner[q.province] !== q.nation) {
      world.workQueue.splice(i, 1);
      news.push({ kind: "built", text: `${cap(workStepName(q.work, q.step))} in ${world.rules.provinces[q.province]!.name} is off the queue: the province is lost.`, nations: [q.nation], province: q.province });
      continue;
    }
    if (!siteBusy(world, q.province, q.work) && world.nationTreasury[q.nation]! >= workCost(world, q.province, q.work, q.step).gold) {
      world.workQueue.splice(i, 1);
      openSite(world, q.nation, q.province, q.work, q.step, news);
      continue;
    }
    i++;
  }
}

/**
 * The monthly works step: sites in provinces the realm holds go a month on
 * (an occupied one stands still) and finished ones become works; then the
 * queue starts what it can.
 */
export function monthlyWorks(world: World, news: News[]): void {
  const open: Site[] = [];
  for (const s of world.sites) {
    // A site in a province the realm has lost is gone.
    if (world.provinceOwner[s.province] !== s.nation) continue;
    if (controller(world, s.province) === s.nation) s.monthsLeft--;
    if (s.monthsLeft > 0) {
      open.push(s);
      continue;
    }
    finish(world, s.province, s.work, s.step);
    news.push({ kind: "built", text: `${cap(workStepName(s.work, s.step))} built in ${world.rules.provinces[s.province]!.name}.`, nations: [s.nation], province: s.province });
  }
  world.sites = open;
  if (world.workQueue.length) startQueued(world, news);
}

function finish(world: World, p: number, work: number, step: number): void {
  world.provinceWorks[p * WORK_COUNT + work] = Math.max(worksAt(world, p, work), step);
  if (work === W["drill yard"]) refreshRecruitCeiling(world, p);
  if (work === W.road) world.provinceRoadHours[p] = roadHours(world, p);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The mining year, each January (PROV-065, PROV-066): every mine standing
 * digs a year off its seam, and one that runs out closes; its miners stay as
 * people of the province and find other work or none.
 */
export function mineYear(world: World, news: News[]): void {
  for (let p = 0; p < world.provinceCount; p++) {
    if (worksAt(world, p, W.mine) === 0) continue;
    const ware = seamWare(world, p);
    const left = (world.provinceSeamYears[p] = Math.max(0, world.provinceSeamYears[p]! - 1));
    if (ware && left > 0) continue;
    world.provinceWorks[p * WORK_COUNT + W.mine] = 0;
    world.provinceSeam[p] = -1;
    const owner = world.provinceOwner[p]!;
    if (owner >= 0) news.push({ kind: "built", text: `The ${ware ?? ""} mine in ${world.rules.provinces[p]!.name} has run out and closed.`.replace("The  mine", "The mine"), nations: [owner], province: p });
  }
}

/** The most men a province can give: its people's share, more with a drill yard. */
export function refreshRecruitCeiling(world: World, p: number): void {
  world.provinceRecruitCeiling[p] = world.provincePopulation[p]! * world.rules.defines.levies.menPerThousandPeople * (1 + world.rules.defines.works.drillYardRecruits * worksAt(world, p, W["drill yard"]));
}

/** Monthly upkeep of a province's works, paid by its owner. */
export function provinceUpkeep(world: World, p: number): number {
  let gold = 0;
  for (let k = 0; k < WORK_COUNT; k++) {
    const step = world.provinceWorks[p * WORK_COUNT + k]!;
    if (step) gold += workUpkeep(world, k, step);
  }
  return gold;
}

/** Monthly upkeep of a realm's works, as this month's ledger has it. */
export const worksUpkeep = (world: World, n: number): number => -world.nationLedger[n * LEDGER_LINES + LEDGER.indexOf("works")]!;

/** A realm's works are neglected while its treasury is empty, and sound again once it is paid. */
export function judgeNeglect(world: World): void {
  for (let n = 0; n < world.nationCount; n++) world.nationNeglect[n] = world.nationTreasury[n]! < 0 ? 1 : 0;
}

/** How much of a work's effect it gives: all, or half while neglected. */
function share(world: World, p: number): number {
  const owner = world.provinceOwner[p]!;
  return owner >= 0 && world.nationNeglect[owner] ? 0.5 : 1;
}

/** Shafts are propped with timber (PROV-067): a lumber camp in the province or one next door of the same realm. */
export function timberInReach(world: World, p: number): boolean {
  if (worksAt(world, p, W["lumber camp"]) > 0) return true;
  const owner = world.provinceOwner[p]!;
  for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
    const q = world.adjList[k]!;
    if (world.provinceOwner[q] === owner && worksAt(world, q, W["lumber camp"]) > 0) return true;
  }
  return false;
}

/** Trade a mine adds, in camp-trade steps: one, three for silver or gold (feedback 87). */
/** Food a class brings in a year at a normal harvest, in thousands fed: on its tiles at the rate its building (farm, ranch, fishery) gives, the rest on bare land. */
export function worksFood(world: World, p: number, cls: "farmers" | "herders" | "seafolk" | "woodsmen"): number {
  const step = cls === "farmers" ? worksAt(world, p, W.farm) : cls === "herders" ? worksAt(world, p, W.ranch) : cls === "seafolk" ? worksAt(world, p, W.fishery) : worksAt(world, p, W["hunting lodge"]);
  return classFood(world, p, cls, step, share(world, p)) * world.provinceLandYield[p]!;
}

/** A market step's trade effect: its weight, the visits it serves, and that traders are founded there (TRADE-029, TRADE-048, D-TRADE-2). */
function marketEffect(step: number): string {
  const w = tradeConfig.value.building_weights[(["weekly_market", "yearly_fair", "trading_house"] as const)[Math.min(step, 3) - 1]!];
  return `Trade value +${Math.round(w.weight * 100)} %; ${w.serves} trader visits a month at full value; traders can be founded here`;
}

/** Hours of marching in a province against none: a track and a road speed armies on. */
export function roadHours(world: World, p: number): number {
  return 1 - world.rules.defines.works.roadSpeed * worksAt(world, p, W.road);
}

/** The province's castle: 1 an earthwork ring fort, 2 a stone castle. */
export const castleStep = (world: World, p: number): number => worksAt(world, p, W.castle);

/** A castle of any step stands in the province (a capital always has one): it is a hub of the realm's food (REALM-030). */
export const hasCastle = (world: World, p: number): boolean => worksAt(world, p, W.castle) > 0;

/** A granary stands at the province's castle: its store holds more and rots less (REALM-031). */
export const hasGranary = (world: World, p: number): boolean => worksAt(world, p, W.granary) > 0;

/**
 * Works standing in 1444 (BLD starting buildings): the map's castles and
 * forts and a stone castle in every capital; farms and ranches where the land
 * is worked, markets by wealth, harbours on rich coasts and tracks in the
 * richest provinces (buildings map_wealth, as a stand-in rule).
 */
export function seedWorks(world: World): void {
  const set = (p: number, w: WorkName, step: number) => (world.provinceWorks[p * WORK_COUNT + W[w]] = step);
  const capitals = new Set(world.rules.nations.filter((n) => !n.asleep).map((n) => world.provinceIndex.get(n.capital)));
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const def = world.rules.provinces[p]!;
    const wealth = def.wealth;
    // Walls first, then the rest while the province has slots for them.
    if (capitals.has(p) || def.castle === "castle") set(p, "castle", 2);
    else if (def.castle === "fort") set(p, "castle", 1);
    let free = slotsOf(world, p) - slotsUsed(world, p);
    const put = (w: WorkName, step: number, when: boolean) => {
      if (when && free > 0) {
        set(p, w, step);
        free--;
      }
    };
    // Food first: a farm, a ranch and a fishery where the land is worked, as the province's wealth allows (feedback 80).
    const target = world.provincePopulation[p]! * world.rules.defines.works.seedFoodShare;
    // A normal year's food, as the tundra grows no crops (feedback 82).
    const food = () => yearlyFood(world, p);
    put("farm", 1, wealth >= 3 && placeFits(world, p, "farm"));
    put("ranch", 1, wealth >= 3 && placeFits(world, p, "ranch"));
    put("fishery", 1, wealth >= 2 && placeFits(world, p, "fishery"));
    put("hunting lodge", 1, wealth >= 3 && tilesOf(world, p, "woods") >= 3);
    put("market", wealth >= 8 ? 2 : 1, wealth >= 4 || MARKET_ANCHORS.has(def.name));
    put("harbour", 1, wealth >= 5 && !!def.coastal);
    put("road", 1, wealth >= 6);
    put("lumber camp", 1, wealth >= 5 && placeFits(world, p, "lumber camp"));
    // The map's famous mines stand in 1444 (buildings anchors); elsewhere a rich province digs its seam.
    put("mine", 1, !!seamWare(world, p) && (MINE_ANCHORS.has(def.name) || (wealth >= 5 && placeFits(world, p, "mine"))));
    put("saltworks", 1, wealth >= 5 && placeFits(world, p, "saltworks"));
    // The people's own ways make up the rest, up to maxLandYield (D-PROV-25), so better farms are the way to feed more.
    world.provinceLandYield[p] = 1;
    const fed = food();
    if (fed > 0 && fed < target) world.provinceLandYield[p] = Math.min(world.rules.defines.works.maxLandYield, target / fed);
  }
  refreshWorks(world);
}

/** Puts what follows from the works standing (road hours, recruit ceilings) in place, after seeding or loading. */
export function refreshWorks(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    world.provinceRoadHours[p] = roadHours(world, p);
    if (worksAt(world, p, W["drill yard"]) > 0) refreshRecruitCeiling(world, p);
  }
}

/**
 * The AI's works (buildings BLD-146, BLD-147, simplified): each month each
 * realm not at war looks at one of its provinces in turn and orders the
 * first work that fits there of a market, a farm, a harbour, a road, walls
 * on a border and a drill yard, when it has fewer than ai.busy_sites sites
 * open and keeps a year of works upkeep (at least aiReserveGold) after the cost.
 */
export function aiWorks(world: World, news: News[]): void {
  const busy = new Int32Array(world.nationCount);
  for (const s of world.sites) busy[s.nation]!++;
  // Each realm's provinces, to take one in turn.
  const lands: number[][] = Array.from({ length: world.nationCount }, () => []);
  const pend = pending(world);
  // A realm with a harbour and no shipyard builds one first, in its biggest harbour, so it can muster sailors and build ships (D-NAVY-33).
  const yards = new Uint8Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (n < 0 || world.provinceWater[p]) continue;
    lands[n]!.push(p);
    if (worksAt(world, p, W.shipyard) > 0 || pend.step[p * WORK_COUNT + W.shipyard]! > 0) yards[n] = 1;
  }
  const month = world.date.year * 12 + world.date.month;
  const reserveMin = world.rules.defines.works.aiReserveGold;
  for (let n = 0; n < world.nationCount; n++) {
    const land = lands[n]!;
    if (n === world.player || world.nationGone[n] || !land.length || world.nationTreasury[n]! < reserveMin || inAnyWar(world, n)) continue;
    const reserve = Math.max(reserveMin, 12 * worksUpkeep(world, n));
    // The first shipyard comes before the other works, however busy the realm is.
    let y = -1;
    if (!yards[n]) for (const q of land) if (worksAt(world, q, W.harbour) > (y < 0 ? 0 : worksAt(world, y, W.harbour)) && !whyNot(world, n, q, W.shipyard, pend)) y = q;
    if (y >= 0 && world.nationTreasury[n]! - workCost(world, y, W.shipyard, 1).gold >= reserve) {
      orderWork(world, n, y, W.shipyard, news, pend);
      continue;
    }
    if (busy[n]! >= AI_BUSY_SITES) continue;
    const p = land[(month + n) % land.length]!;
    for (const name of AI_ORDER) {
      const work = W[name];
      if (name === "castle" && !borders(world, p, n)) continue;
      // Farms where the province does not feed itself.
      if ((name === "farm" || name === "hunting lodge") && yearlyFood(world, p) >= world.provincePopulation[p]! * world.rules.defines.works.seedFoodShare) continue;
      if (whyNot(world, n, p, work, pend)) continue;
      if (world.nationTreasury[n]! - workCost(world, p, work, nextStep(world, p, work, pend)).gold < reserve) continue;
      orderWork(world, n, p, work, news, pend);
      break;
    }
  }
}

/** Sites a realm of the AI keeps open at most (buildings ai.busy_sites). */
const AI_BUSY_SITES = 3;
const AI_ORDER: WorkName[] = ["market", "farm", "hunting lodge", "mine", "harbour", "road", "castle", "drill yard", "saltworks", "granary"];

function borders(world: World, p: number, n: number): boolean {
  for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
    const o = world.provinceOwner[world.adjList[k]!]!;
    if (o >= 0 && o !== n) return true;
  }
  return false;
}


const people = (thousands: number) => Math.round(thousands * 1000).toLocaleString("en-US");

/** What each work does in this slice, for the build sheet (stand-in effects, from defines.works). */
export function workEffect(world: World, work: number, step: number): string {
  const d = world.rules.defines.works;
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  switch (WORKS[work]!) {
    case "farm":
      return `Every fields tile: work for ${people(jobSlots("farm"))} farmers, who feed ${d.farmRates[step - 1] ?? 1.5} people each against 0.67 on bare land`;
    case "ranch":
      return `Every pasture tile: work for ${people(jobSlots("ranch"))} herders, who feed 1.33 each against 0.67 without it`;
    case "fishery":
      return `Every shore tile: work for ${people(jobSlots("fishery"))} seafolk, who feed 1.33 each against 0.67 without it`;
    case "hunting lodge":
      return `The woods: work for ${people(jobSlots("hunting lodge"))} hunters on every woods tile, who bring in half as much again; furs in the northern woods`;
    case "lumber camp":
      return `Works needing timber here cost ${pct(d.materialsAtHandSaving)} less; its timber is traded`;
    case "quarry":
      return `Works needing stone here cost ${pct(d.materialsAtHandSaving)} less; its stone is traded`;
    case "mine":
      return `Work for ${people(jobSlots("mine"))} miners digging the ore; its ore is traded, silver and gold dearest. The ore deposit runs out after its years of digging`;
    case "saltworks":
      return `Work for ${people(jobSlots("saltworks"))} salt makers; salt for the realm and for trade`;
    case "market":
      return marketEffect(step);
    case "shipyard": {
      const slips = stepOf("shipyard", step).slipways ?? 1;
      return `Sailors are mustered and ships built here, ${slips} at a time${step >= 3 ? ", ships of the line too" : step >= 2 ? ", carracks and galleons too" : ""}`;
    }
    case "harbour":
      return `Ships stop and trade here; its trade value +${pct(tradeConfig.value.building_weights.harbour.weight)} to ships`;
    case "drill yard":
      return `Recruits +${pct(d.drillYardRecruits * step)}`;
    case "road":
      return `Armies march ${pct(d.roadSpeed * step)} faster here, and traders with them`;
    case "granary": {
      const f = world.rules.defines.castleFood;
      return `The castle store holds ${f.granaryStoreMonths} months instead of ${f.castleStoreMonths}, and rots half as fast`;
    }
    case "castle": {
      const walls = step >= 2 ? "Stone walls: armies must besiege it, and enemies can't march past" : "Earthwork walls: a smaller garrison holds out against a siege";
      // The castle gathers the land's food in: enemy foragers find less, besiegers eat more (WAR-267).
      return `${walls}. ${wallsFoodText(step)}`;
    }
  }
}

/** A row of a province's build sheet: the next step of a work, what it costs and does, and why it can't be ordered (null when it can). */
export interface WorkRow {
  work: number;
  step: number;
  name: string;
  gold: number;
  months: number;
  upkeep: number;
  effect: string;
  why: string | null;
}

/** The build sheet of a province for nation n: every work whose land fits, with its next step. */
export function buildSheet(world: World, n: number, p: number, pend: Pending = pending(world)): WorkRow[] {
  const rows: WorkRow[] = [];
  for (let work = 0; work < WORK_COUNT; work++) {
    const name = WORKS[work]!;
    if (!placeFits(world, p, name)) continue;
    const step = Math.min(nextStep(world, p, work, pend), buildingType(name).steps.length);
    const { gold, months } = workCost(world, p, work, step);
    rows.push({ work, step, name: workStepName(work, step), gold, months, upkeep: workUpkeep(world, work, step), effect: workEffect(world, work, step), why: whyNot(world, n, p, work, pend) });
  }
  return rows;
}

/** The build sheets of every province of nation n, by province. */
export function buildSheets(world: World, n: number): Record<number, WorkRow[]> {
  const out: Record<number, WorkRow[]> = {};
  if (n < 0) return out;
  const pend = pending(world);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !world.provinceWater[p]) out[p] = buildSheet(world, n, p, pend);
  return out;
}

/** One tile of a province's Land tab: its use, the building working it, its people and what they make a year. */
export interface LandTileRow {
  use: UseName;
  /** The building working the province's tiles of this use ("three-field farm"), or null for bare land. */
  building: string | null;
  /** People working the tile, in thousands. */
  workers: number;
  /** People its food feeds a year at a normal harvest, in thousands. */
  feeds: number;
  /** A ware it gives a year, in loads. */
  ware: { name: string; amount: number } | null;
  /** Woods only: the game left (1 plenty, down to 0.3 where hunters crowd them), and whether this year's winter is hard (feedback 81). */
  game?: { left: number; hardWinter: boolean };
  /** Waste only: the seam under the province's rough ground and its years of digging left (feedback 87). */
  seam?: { ware: string; years: number };
  /** The changes a tile of this use offers (feedback 86): clear woods, to pasture, plough, drain, irrigate. */
  changes: ChangeRow[];
  /** The change under way on this tile, if any. */
  changing?: { title: string; to: UseName; monthsLeft: number; months: number };
  /** Fields only: worn by overwork, it gives half until it rests (PROV-034, PROV-035). */
  worn?: { restedYears: number; restYears: number };
  /** Fields only: years the fields have been farmed with more farmers than they hold, and the years that wears one. */
  overwork?: { years: number; wearsAt: number };
}

/** The work that works each tile use, and the class on it. */
const USE_WORK: Partial<Record<UseName, { work: WorkName; cls: FoodClass }>> = {
  fields: { work: "farm", cls: "farmers" },
  pasture: { work: "ranch", cls: "herders" },
  shore: { work: "fishery", cls: "seafolk" },
  woods: { work: "lumber camp", cls: "woodsmen" },
};

/**
 * A province's tiles for the Land tab (feedback 80, 87): each food class's
 * people and food shared evenly over its tiles, and the wares the
 * province's lumber camp, quarry and ranch make on them.
 */
export function landSheet(world: World, p: number): LandTileRow[] {
  const rows: LandTileRow[] = [];
  const n = tileCount(world, p);
  for (const use of USES) {
    const count = tilesOf(world, p, use);
    if (!count) continue;
    const uw = USE_WORK[use];
    const step = uw ? worksAt(world, p, W[uw.work]) : 0;
    const quarry = use === "waste" ? worksAt(world, p, W.quarry) : 0;
    const lodge = use === "woods" && worksAt(world, p, W["hunting lodge"]) > 0;
    const mine = use === "waste" && worksAt(world, p, W.mine) > 0;
    const salt = use === "shore" && worksAt(world, p, W.saltworks) > 0;
    const building = [uw && step > 0 ? workStepName(W[uw.work], step) : quarry > 0 ? "quarry" : "", lodge ? "hunting lodge" : "", mine ? "mine" : "", salt ? "saltworks" : ""].filter(Boolean).join(" and ") || null;
    const workers = uw ? world.provinceClasses[p * CLASS_COUNT + CLASS_NAMES.indexOf(uw.cls)]! : 0;
    const fed = uw ? worksFood(world, p, uw.cls) : 0;
    const wares = [uw?.work === "lumber camp" && step > 0 ? tileWares(world, p, "lumber camp") : use === "pasture" && step > 0 ? tileWares(world, p, "ranch") : quarry > 0 ? tileWares(world, p, "quarry") : null, lodge ? tileWares(world, p, "hunting lodge") : null, mine ? tileWares(world, p, "mine") : null, salt ? tileWares(world, p, "saltworks") : null].filter((w) => w !== null);
    // Timber and furs from a lumber camp and a lodge both in the north read as one ware line.
    const ware = wares.length ? { name: [...new Set(wares.flatMap((w) => w.ware.split(" and ")))].join(" and "), amount: wares.reduce((a, w) => a + w.amount, 0) } : null;
    const game = use === "woods" ? { left: world.provinceGame[p]!, hardWinter: world.provinceHardWinter[p] === 1 } : undefined;
    const ore = seamWare(world, p);
    const seam = use === "waste" && ore ? { ware: ore, years: Math.ceil(world.provinceSeamYears[p]!) } : undefined;
    const changes = changeRows(world, world.provinceOwner[p]!, p, use);
    // A change takes the last tile of its use, so it shows on the last of the use's row.
    const under = changing(world, p) && changeUses(CHANGES[world.provinceChange[p]!]!)[0] === use;
    // Worn fields are the last of the use's row and feed half what a sound one does.
    const worn = use === "fields" ? wornFields(world, p) : 0;
    const sound = fed / (count - worn * (1 - provinceConfig.worn.output));
    const overwork = use === "fields" && world.provinceOverwork[p]! > 0 ? { years: world.provinceOverwork[p]!, wearsAt: Math.round(wearYearsOf(world, p)) } : undefined;
    for (let i = 0; i < count; i++) {
      const isWorn = i >= count - worn;
      const row: LandTileRow = { use, building, workers: workers / count, feeds: isWorn ? sound * provinceConfig.worn.output : sound, ware, changes, ...(game ? { game } : {}), ...(seam ? { seam } : {}), ...(overwork ? { overwork } : {}) };
      if (isWorn) row.worn = { restedYears: world.provinceRested[p]!, restYears: provinceConfig.worn.recovery_years };
      if (under && i === count - 1) row.changing = { title: changeTitle(CHANGES[world.provinceChange[p]!]!), to: changeUses(CHANGES[world.provinceChange[p]!]!)[1], monthsLeft: world.provinceChangeLeft[p]!, months: world.provinceChangeMonths[p]! };
      rows.push(row);
    }
  }
  return rows.slice(0, n);
}

/** Land tabs of every province of realm n. */
export function landSheets(world: World, n: number): Record<number, LandTileRow[]> {
  const out: Record<number, LandTileRow[]> = {};
  if (n < 0) return out;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !world.provinceWater[p]) out[p] = landSheet(world, p);
  return out;
}
