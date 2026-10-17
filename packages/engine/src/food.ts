import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { CLASS_COUNT, CLASS_NAMES } from "./living.ts";
import { harvestMultiplier, type HarvestRoll } from "./domain/province/land.ts";
import { harvestMonth, rollRegionWeather, rotSeason } from "./domain/realm/index.ts";
import { officialBonus } from "./officials.ts";
import { worksFood } from "./works.ts";
import { atHarvest, FOOD_CLASSES, huntingYear } from "./land.ts";
import { shareFood } from "./castleFood.ts";

/**
 * Food (milestone 3): each province keeps a local store, counted in months of
 * eating. Herders, woodsmen and seafolk bring food in every month; the
 * farmers' food comes at the harvest, once a year (September in the north,
 * March in the south), better or worse with each region's weather. Everyone
 * eats every month, stores rot a little each season, and a province that runs
 * out starves: the unfed die, or flee to a neighbour with food.
 */

/** Harvest rolls, worst first (province: food.harvest_order). */
export const HARVESTS: readonly HarvestRoll[] = ["failed", "poor", "normal", "good", "bumper"];
const NORMAL = 2;

export interface FoodState {
  /** Food in each province's store, in thousands of people fed for a month. */
  provinceStore: Float32Array;
  /** Each province's last harvest (index into HARVESTS), -1 = none yet. */
  provinceHarvest: Int8Array;
  /** People who starved in each province this year, in thousands (shown on the card; cleared each January). */
  provinceStarved: Float32Array;
}

export function createFoodState(P: number): FoodState {
  return { provinceStore: new Float32Array(P), provinceHarvest: new Int8Array(P).fill(-1), provinceStarved: new Float32Array(P) };
}

/** Every land province starts with food to last until its first harvest, and a few months more. */
export function seedStores(world: World): void {
  const months = world.rules.defines.living.startingStoreMonths;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const toHarvest = (harvestMonth(world.provincePlace[p]!.lat) - world.date.month + 12) % 12;
    world.provinceStore[p] = world.provincePopulation[p]! * (toHarvest + months);
  }
}

/** People a province's food classes feed in a year, in thousands, at a harvest roll for the farmers (feedback 80: farms, ranches and fisheries give their workers the full rate, bare land less). */
export function yearlyFood(world: World, p: number, roll: HarvestRoll = "normal"): number {
  let food = 0;
  for (const c of FOOD_CLASSES) food += worksFood(world, p, c) * (atHarvest(c) ? harvestMultiplier(roll) : 1);
  return food;
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
  }

  // Harvests: each region rolls its weather once (bad one band worse, good one better).
  const weather = new Map<number, number>();
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p] || harvestMonth(world.provincePlace[p]!.lat) !== month) continue;
    const r = regionOf(world, p);
    if (!weather.has(r)) {
      const w = rollRegionWeather(world.rng);
      weather.set(r, w === "bad" ? -1 : w === "good" ? 1 : 0);
    }
    // Hostile armies in the province burn or eat the crop: one band worse.
    const war = world.provinceOccupier[p]! >= 0 || world.sieges.has(p) ? -1 : 0;
    // Inventions give harvest steps, each a band better (PROV-295).
    const steps = world.provinceOwner[p]! >= 0 ? world.researchHarvest[world.provinceOwner[p]!]! : 0;
    const roll = Math.max(0, Math.min(HARVESTS.length - 1, NORMAL + weather.get(r)! + war + steps));
    world.provinceHarvest[p] = roll;
    // A steward gets more out of the fields (province officials table: +10 % food).
    const steward = officialBonus(world, p, "Steward", "food");
    // Farms raise the harvest (works).
    store[p] = store[p]! + worksFood(world, p, "farmers") * harvestMultiplier(HARVESTS[roll]!) * 12 * steward;
  }

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
  const flee = 0.25;
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p] || store[p]! >= 0) continue;
    const unfed = Math.min(-store[p]!, world.provincePopulation[p]!);
    store[p] = 0;
    const people = world.provincePopulation[p]!;
    if (people <= 0) continue;
    const refuge = neighbourWithFood(world, p);
    const fled = refuge >= 0 ? unfed * flee : 0;
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
