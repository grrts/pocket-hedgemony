import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { CLASS_COUNT, CLASS_NAMES } from "./living.ts";
import { harvestMultiplier, type HarvestRoll } from "./domain/province/land.ts";
import { harvestClimate, harvestMonth, harvestMonthsAt, rollBaseHarvest, rotSeason, weatherFor, type HarvestClimate } from "./domain/realm/index.ts";
import { knownSet } from "./research.ts";
import { officialBonus } from "./officials.ts";
import { worksFood } from "./works.ts";
import { atHarvest, FOOD_CLASSES, huntingYear, wearYear } from "./land.ts";
import { shareFood } from "./castleFood.ts";
import { provinceConfig } from "./domain/province/model.ts";
import { heritageSteps } from "./heritage.ts";

/** The most of a province a year's famine takes (feedback 93). */
const FAMINE_YEAR_SHARE = provinceConfig.famine.year_share;

/**
 * Food (milestone 3): each province keeps a local store, counted in months of
 * eating. Herders, woodsmen and seafolk bring food in every month; the
 * farmers' food comes at the harvest, once a year (September in the north,
 * March in the south), twice in rice lands and never in the tundra
 * (feedback 82). Each province rolls its own harvest, then its region's
 * weather, read by its climate, and war move it a band at a time. Armies
 * refill their wagons from the store where they stand (feedback 83). Everyone
 * eats every month, stores rot a little each season, and a province that runs
 * out starves: the unfed die, or flee to a neighbour with food.
 */

/** Harvest rolls, worst first (province: food.harvest_order). */
export const HARVESTS: readonly HarvestRoll[] = ["failed", "poor", "normal", "good", "bumper"];
/** Harvest climates, in the order the snapshot numbers them. */
export const CLIMATES: readonly HarvestClimate[] = ["temperate", "dry", "monsoon", "tundra"];

export interface FoodState {
  /** Food in each province's store, in thousands of people fed for a month. */
  provinceStore: Float32Array;
  /** Each province's last harvest (index into HARVESTS), -1 = none yet. */
  provinceHarvest: Int8Array;
  /** The weather of that harvest: -1 bad, 0 normal, 1 good. */
  provinceWeather: Int8Array;
  /** People who starved in each province this year, in thousands (shown on the card; cleared each January). */
  provinceStarved: Float32Array;
}

export function createFoodState(P: number): FoodState {
  return { provinceStore: new Float32Array(P), provinceHarvest: new Int8Array(P).fill(-1), provinceWeather: new Int8Array(P), provinceStarved: new Float32Array(P) };
}

/**
 * Every land province starts with food to last until its first harvest, and a few months more.
 * The harvest comes in on the 1st, so a start in the harvest month itself (20 September 1378)
 * waits a whole year for the next one.
 */
export function seedStores(world: World): void {
  const months = world.rules.defines.living.startingStoreMonths;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const toHarvest = ((harvestMonth(world.provincePlace[p]!.lat) - world.date.month - 1 + 12) % 12) + 1;
    world.provinceStore[p] = world.provincePopulation[p]! * (toHarvest + months);
  }
}

/** People a province's food classes feed in a year, in thousands, at a harvest roll for the farmers (feedback 80: farms, ranches and fisheries give their workers the full rate, bare land less; feedback 82: no crops in the tundra). */
export function yearlyFood(world: World, p: number, roll: HarvestRoll = "normal"): number {
  const crops = climateOf(world, p) !== "tundra";
  let food = 0;
  for (const c of FOOD_CLASSES) if (crops || !atHarvest(c)) food += worksFood(world, p, c) * (atHarvest(c) ? harvestMultiplier(roll) : 1);
  return food;
}

/** Where a normal year's food is short (the province grows less than it eats) and where it is tight (a poor harvest brings famine; D-PROV-36). */
export const FOOD_BALANCE: { short: number; tight: number } = provinceConfig.food.balance;

/** A province's longitude, from its place on the map (0 without a map). */
function lonOf(world: World, p: number): number {
  const map = world.rules.map;
  return map ? (world.rules.provinces[p]!.x ?? 0) / map.pxPerDeg - 180 : 0;
}

/** Each province's harvest climate, worked out once per world (it never changes). */
const climateCache = new WeakMap<World, Int8Array>();
function climates(world: World): Int8Array {
  let c = climateCache.get(world);
  if (!c) {
    c = Int8Array.from(world.rules.provinces, (def, p) => CLIMATES.indexOf(harvestClimate(def.terrain, lonOf(world, p), world.provincePlace[p]!.lat, world.provincePlace[p]!.wet === "monsoon_asia")));
    climateCache.set(world, c);
  }
  return c;
}

/** A province's harvest climate. */
export function climateOf(world: World, p: number): HarvestClimate {
  return CLIMATES[climates(world)[p]!]!;
}

/** Each province's harvest climate (index into CLIMATES), for the snapshot. */
export function provinceClimates(world: World): Int8Array {
  return climates(world);
}

/** The months a province brings in a harvest: none in the tundra, both seasons on rice land whose owner knows wet-rice terracing (REALM-208). */
export function harvestMonthsOf(world: World, p: number): number[] {
  const owner = world.provinceOwner[p]!;
  return harvestMonthsAt(world.rules.provinces[p]!.terrain, lonOf(world, p), world.provincePlace[p]!.lat, owner >= 0 ? knownSet(world, owner) : new Set());
}

/** Months of eating in a province's store. */
export function storeMonths(world: World, p: number): number {
  const people = world.provincePopulation[p]!;
  return people > 0 ? world.provinceStore[p]! / people : 0;
}

/** The weather region of a province: a cell of about ten degrees (realm REALM-167: each region rolls once per harvest). */
function regionOf(world: World, p: number): number {
  const def = world.rules.provinces[p]!;
  const width = world.rules.map?.width ?? 3600;
  const lat = world.provincePlace[p]!.lat;
  return Math.floor((lat + 90) / 10) * 64 + Math.min(63, Math.max(0, Math.floor(((def.x ?? 0) / width) * 36)));
}

/** One dispatch per realm for the harvests that failed this harvest month, naming them (REALM-220). */
export function reportFailedHarvests(world: World, failed: readonly number[], news: News[]): void {
  const byOwner = new Map<number, number[]>();
  for (const p of failed) byOwner.set(world.provinceOwner[p]!, [...(byOwner.get(world.provinceOwner[p]!) ?? []), p]);
  for (const [owner, ps] of byOwner) {
    const names = ps.slice(0, 3).map((p) => world.rules.provinces[p]!.name);
    const list = names.length > 1 && ps.length <= 3 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join(", ");
    news.push({ kind: "famine", text: `The harvest failed in ${list}${ps.length > 3 ? ` and ${ps.length - 3} more` : ""}`, nations: [owner], province: ps[0]! });
  }
}

/**
 * The monthly food step: harvests where this is the harvest month, the
 * month's catch and herds, eating, seasonal rot, then famine and relief.
 */
export function monthlyFood(world: World, news: News[]): void {
  const month = world.date.month;
  const store = world.provinceStore;
  const P = world.provinceCount;
  if (month === 1) {
    world.provinceStarved.fill(0);
    // The hunting year: game regrows or thins, and the north rolls its winters (feedback 81).
    huntingYear(world, (p) => regionOf(world, p));
    // The wearing year: overworked fields wear, rested ones recover (PROV-034, PROV-035).
    wearYear(world);
  }

  // Harvests: each province rolls its own, then its region's weather (rolled once, read by each climate) and war move it a band.
  const regionRoll = new Map<number, number>();
  const failed: number[] = [];
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p]) continue;
    const months = harvestMonthsOf(world, p);
    if (!months.includes(month)) continue;
    const r = regionOf(world, p);
    if (!regionRoll.has(r)) regionRoll.set(r, world.rng.next());
    const w = weatherFor(regionRoll.get(r)!, climateOf(world, p));
    const weather = w === "bad" ? -1 : w === "good" ? 1 : 0;
    // Hostile armies in the province burn or eat the crop: one band worse.
    const war = world.provinceOccupier[p]! >= 0 || world.sieges.has(p) ? -1 : 0;
    // Inventions give harvest steps, each a band better (PROV-295).
    // Heritage adds its own (harvest_steps).
    const steps = world.provinceOwner[p]! >= 0 ? world.researchHarvest[world.provinceOwner[p]!]! + heritageSteps(world, world.provinceOwner[p]!, "harvest_steps") : 0;
    const base = HARVESTS.indexOf(rollBaseHarvest(world.rng));
    const roll = Math.max(0, Math.min(HARVESTS.length - 1, base + weather + war + steps));
    world.provinceHarvest[p] = roll;
    world.provinceWeather[p] = weather;
    if (roll === 0 && world.provinceOwner[p]! >= 0) failed.push(p);
    // A steward gets more out of the fields (province officials table: +10 % food).
    const steward = officialBonus(world, p, "Steward", "food");
    // Farms raise the harvest (works). Two harvests a year bring half the year's food each.
    store[p] = store[p]! + worksFood(world, p, "farmers") * harvestMultiplier(HARVESTS[roll]!) * (12 / months.length) * steward;
  }
  reportFailedHarvests(world, failed, news);

  const season = month % 3 === 0;
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p]) continue;
    // Herds, hunting and the catch: a year's food for F thousand people is F thousand fed a month, every month.
    let other = 0;
    for (const c of FOOD_CLASSES) if (!atHarvest(c)) other += worksFood(world, p, c);
    store[p] = store[p]! + other - world.provincePopulation[p]!;
    if (season && store[p]! > 0) store[p] = rotSeason(store[p]!, false);
  }

  // Castles collect, hand out and feed the hungry first; stores over their caps go by the surplus rule (castleFood.ts).
  shareFood(world);

  // Relief: a hungry province draws on neighbours of the same realm with food to spare.
  const relief = world.rules.defines.living.reliefAboveMonths;
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p] || store[p]! >= 0) continue;
    const owner = world.provinceOwner[p]!;
    for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end && store[p]! < 0; k++) {
      const q = world.adjList[k]!;
      if (world.provinceOwner[q] !== owner || owner < 0) continue;
      const spare = store[q]! - world.provincePopulation[q]! * relief;
      if (spare <= 0) continue;
      const give = Math.min(spare, -store[p]!);
      store[q] = store[q]! - give;
      store[p] = store[p]! + give;
    }
  }

  // Famine: the unfed leave the classes by size; a quarter flee to a neighbour with food (province PROV-104 to PROV-106).
  // The rule counts a season's unfed; a month without food is a third of one, so a third of the month's unfed are lost and the rest go hungry.
  const flee = 0.25;
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p] || store[p]! >= 0) continue;
    const people = world.provincePopulation[p]!;
    const store0 = store[p]!;
    // A year's famine takes at most a fifth of the people the province had in January; past that the unfed go hungry (feedback 93).
    const room = Math.max(0, (people + world.provinceStarved[p]!) * FAMINE_YEAR_SHARE - world.provinceStarved[p]!);
    store[p] = 0;
    if (people <= 0 || room <= 0) continue;
    const refuge = neighbourWithFood(world, p);
    const fleeing = refuge >= 0 ? flee : 0;
    const unfed = Math.min(-store0 / 3, people / 3, room / (1 - fleeing));
    const fled = unfed * fleeing;
    const keep = 1 - unfed / people;
    let total = 0;
    for (let c = 0; c < CLASS_COUNT; c++) {
      const i = p * CLASS_COUNT + c;
      world.provinceClasses[i] = world.provinceClasses[i]! * keep;
      total += world.provinceClasses[i]!;
    }
    world.provincePopulation[p] = total;
    world.provinceStarved[p] = world.provinceStarved[p]! + unfed - fled;
    if (fled > 0) {
      // Refugees arrive with nothing: they are the homeless of the province that takes them in.
      const h = refuge * CLASS_COUNT + CLASS_NAMES.indexOf("homeless");
      world.provinceClasses[h] = world.provinceClasses[h]! + fled;
      world.provincePopulation[refuge] = world.provincePopulation[refuge]! + fled;
    }
    const owner = world.provinceOwner[p]!;
    if (unfed >= 1 && owner >= 0) news.push({ kind: "famine", text: `Famine in ${world.rules.provinces[p]!.name}: ${Math.round((unfed - fled) * 1000).toLocaleString("en")} starved${fled > 0 ? `, ${Math.round(fled * 1000).toLocaleString("en")} fled` : ""}`, nations: [owner], province: p });
  }
}

/** A neighbour with more than a season of food stored, or -1. */
function neighbourWithFood(world: World, p: number): number {
  for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
    const q = world.adjList[k]!;
    if (!world.provinceWater[q] && storeMonths(world, q) > 3) return q;
  }
  return -1;
}
