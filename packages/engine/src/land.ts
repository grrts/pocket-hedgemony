import type { World } from "./world.ts";
import type { Ground } from "@ph/rules";
import { CLASS_COUNT, CLASS_NAMES } from "./living.ts";
import { GROUNDS, groundOfCell, WATER } from "./tiles.ts";
import { buildingOutput, peopleOutput } from "./domain/province/land.ts";
import { provinceConfig } from "./domain/province/model.ts";

/**
 * Land (feedback 80 and 87; province PROV-010, PROV-011, PROV-068, PROV-080,
 * PROV-081): each province is a row of 4 to 16 tiles, its count from the
 * province's size on the map and its uses from the map's ground under it,
 * with one Town tile and 1 to 3 Shore tiles on a coast. Buildings stand in
 * the province and work its tiles of one use (Leroy, 17 Oct): a farm all its
 * fields, a ranch its pasture, a fishery its shore. Each such tile holds the
 * building's job slots; people fill them by class, and the rest work the bare
 * land at the lower yield.
 */

export const USES = ["fields", "pasture", "woods", "marsh", "waste", "shore", "town"] as const;
export type UseName = (typeof USES)[number];
const U = Object.fromEntries(USES.map((u, i) => [u, i])) as Record<UseName, number>;

/** Most tiles a province has (PROV-010). */
export const MAX_TILES = 16;

export interface LandState {
  /** Each province's tiles: a use (index into USES) + 1, 0 past its last tile; MAX_TILES per province. */
  provinceTiles: Uint8Array;
  /**
   * How much the province's own ways of working the land (terraces, ditches,
   * herding on the move) add to its food, set in 1444 so its people about feed
   * themselves on the land they hold (D-PROV-25), fixed after.
   */
  provinceLandYield: Float32Array;
}

export function createLandState(P: number): LandState {
  return { provinceTiles: new Uint8Array(P * MAX_TILES), provinceLandYield: new Float32Array(P).fill(1) };
}

/** Tiles of a use in a province. */
export function tilesOf(world: World, p: number, use: UseName): number {
  let n = 0;
  const want = U[use] + 1;
  for (let i = p * MAX_TILES, end = i + MAX_TILES; i < end; i++) if (world.provinceTiles[i] === want) n++;
  return n;
}

/** Tile count of a province. */
export function tileCount(world: World, p: number): number {
  let n = 0;
  for (let i = p * MAX_TILES, end = i + MAX_TILES; i < end && world.provinceTiles[i]; i++) n++;
  return n;
}

/** The use of a province's tile i, or null past its last. */
export function tileUse(world: World, p: number, i: number): UseName | null {
  const v = world.provinceTiles[p * MAX_TILES + i]!;
  return v ? USES[v - 1]! : null;
}

// ---------------------------------------------------------------- 1444

/** How a square of each ground is shared between the tile uses (a stand-in for the map's own fields and pastures, D-PROV-25). */
const GROUND_USES: Record<Ground, Partial<Record<UseName, number>>> = {
  farmland: { fields: 0.8, pasture: 0.1, woods: 0.1 },
  grassland: { fields: 0.45, pasture: 0.4, woods: 0.15 },
  savanna: { pasture: 0.6, fields: 0.25, waste: 0.15 },
  drylands: { pasture: 0.4, waste: 0.35, fields: 0.25 },
  desert: { waste: 0.8, pasture: 0.15, fields: 0.05 },
  hills: { pasture: 0.35, fields: 0.3, woods: 0.15, waste: 0.2 },
  mountains: { waste: 0.5, pasture: 0.3, woods: 0.15, fields: 0.05 },
  forest: { woods: 0.6, fields: 0.25, pasture: 0.15 },
  jungle: { woods: 0.7, fields: 0.2, marsh: 0.1 },
  marsh: { marsh: 0.6, fields: 0.25, pasture: 0.15 },
  tundra: { waste: 0.5, woods: 0.35, pasture: 0.15 },
};

/**
 * Lays out every province's tiles from the map (PROV-010, PROV-011,
 * PROV-018, PROV-019): the count from its size (the smallest province 4,
 * the largest 16, on a log scale between), one Town tile, Shore tiles on a
 * coast (more with more seafolk), and the rest shared out by the ground under
 * it, largest share first.
 */
export function seedLand(world: World): void {
  slotScale = world.rules.defines.works.slotScale;
  const P = world.provinceCount;
  const grid = world.tiles;
  const squares = new Float64Array(P);
  const mix = new Float64Array(P * USES.length);
  if (!grid.coarse) {
    for (let t = 0; t < grid.province.length; t++) {
      const id = grid.province[t]!;
      const g = groundOfCell(grid.cell[t]!);
      if (!id || g === WATER) continue;
      const p = id - 1;
      squares[p]!++;
      for (const [use, w] of Object.entries(GROUND_USES[GROUNDS[g]!]!)) mix[p * USES.length + U[use as UseName]]! += w!;
    }
  }
  // The size scale: from a small province (5th percentile) to a large one (95th), on a log scale.
  const sizes = Array.from(squares).filter((s, p) => s > 0 && !world.provinceWater[p]).sort((a, b) => a - b);
  const lo = Math.log(Math.max(1, sizes[Math.floor(sizes.length * 0.05)] ?? 1));
  const hi = Math.log(Math.max(2, sizes[Math.floor(sizes.length * 0.95)] ?? 2));
  const seafolk = CLASS_NAMES.indexOf("seafolk");
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p]) continue;
    const ground = world.provinceGround[p] ?? "grassland";
    if (squares[p] === 0) for (const [use, w] of Object.entries(GROUND_USES[ground])) mix[p * USES.length + U[use as UseName]] = w!;
    const scale = squares[p]! > 0 && hi > lo ? Math.min(1, Math.max(0, (Math.log(squares[p]!) - lo) / (hi - lo))) : 0.4;
    const count = Math.round(4 + (MAX_TILES - 4) * scale);
    const shore = world.rules.provinces[p]!.coastal ? Math.min(3, 1 + Math.floor(world.provinceClasses[p * CLASS_COUNT + seafolk]! / 6)) : 0;
    const land = Math.max(1, count - 1 - shore);
    const uses = shareOut(mix.subarray(p * USES.length, (p + 1) * USES.length), land);
    let i = p * MAX_TILES;
    const put = (u: number, n: number) => {
      for (let k = 0; k < n; k++) world.provinceTiles[i++] = u + 1;
    };
    put(U.town, 1);
    uses.forEach((n, u) => put(u, n));
    put(U.shore, shore);
  }
}

/** Shares n tiles out by weight, largest remainder first. */
function shareOut(weights: ArrayLike<number>, n: number): number[] {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i]!;
  if (total <= 0) return Array.from(weights, (_, i) => (i === U.fields ? n : 0));
  const exact = Array.from(weights, (w) => (w / total) * n);
  const out = exact.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i]!++;
    left--;
  }
  return out;
}

// ---------------------------------------------------------------- food and wares

/**
 * Thousands of people in a building's job slots (province buildings.land …
 * slots), times the slot scale: the map's provinces hold more people than the
 * design's (median 46,000, a tenth over 300,000), so a tile holds more (D-PROV-25).
 */
let slotScale = 1;
const slots = (name: string): number => (((provinceConfig.buildings.land as Record<string, { slots: number }>)[name]?.slots ?? 0) / 1000) * slotScale;
const perWorker = (name: string): number => (provinceConfig.buildings.land as Record<string, { food_per_worker?: number }>)[name]?.food_per_worker ?? 0;
const BARE = provinceConfig.food.bare_per_worker;

/** What a class of the land works on: its building, the bare activity, and whether its food waits for the harvest. */
const FOOD_WORK = {
  farmers: { building: "farm", activity: "farming", harvest: true },
  herders: { building: "ranch", activity: "herding", harvest: false },
  seafolk: { building: "fishery", activity: "fishing", harvest: false },
  woodsmen: { building: "", activity: "hunting and gathering", harvest: false },
} as const;
export type FoodClass = keyof typeof FOOD_WORK;
export const FOOD_CLASSES = Object.keys(FOOD_WORK) as FoodClass[];

/** The tile use each food class works. */
const CLASS_USE: Record<FoodClass, UseName> = { farmers: "fields", herders: "pasture", seafolk: "shore", woodsmen: "woods" };

/**
 * People a food class feeds in a year, in thousands, at a normal harvest
 * (PROV-080, PROV-081, feedback 80). The province's tiles of the class's use
 * hold its building's job slots each; with the building standing in the
 * province (a farm for the fields), the workers in those slots feed at its
 * rate (a farm's by its step) and the ground's building output. Everyone else
 * works bare land at 0.67 × the ground's people output. `share` is the
 * building's effect (half while unpaid).
 */
export function classFood(world: World, p: number, cls: FoodClass, step: number, share = 1): number {
  const work = FOOD_WORK[cls];
  const workers = world.provinceClasses[p * CLASS_COUNT + CLASS_NAMES.indexOf(cls)]!;
  const ground = world.provinceGround[p] ?? "grassland";
  const bareRate = BARE * peopleOutput(ground, work.activity);
  if (!work.building || step <= 0) return workers * bareRate;
  const inside = Math.min(workers, tilesOf(world, p, CLASS_USE[cls]) * slots(work.building));
  const rate = (cls === "farmers" ? world.rules.defines.works.farmRates[step - 1] ?? perWorker("farm") : perWorker(work.building)) * buildingOutput(ground, work.building);
  // Unpaid buildings give half: the rest of their workers count as on bare land.
  return (workers - inside) * bareRate + inside * (rate * share + bareRate * (1 - share));
}

/** Whether a class's food comes at the harvest (farmers) or month by month. */
export const atHarvest = (cls: FoodClass): boolean => FOOD_WORK[cls].harvest;

/** The building a food class works in, if any. */
export const buildingOf = (cls: FoodClass): string => FOOD_WORK[cls].building;

/** Job slots of a building, in thousands. */
export const jobSlots = slots;

/** Wares a land building makes in a year (PROV-090, feedback 87): its workers × the ground's building output, by ware. */
export function tileWares(world: World, p: number, building: string): { ware: string; amount: number } | null {
  const ground = world.provinceGround[p] ?? "grassland";
  const lat = world.provincePlace[p]?.lat ?? 45;
  switch (building) {
    case "lumber camp":
      return { ware: lat >= 55 || ground === "tundra" ? "timber and furs" : "timber", amount: slots("lumber camp") * buildingOutput(ground, "lumber camp") };
    case "quarry":
      return { ware: "stone", amount: slots("mine") * buildingOutput(ground, "mine") };
    case "ranch":
      return { ware: ground === "grassland" || ground === "savanna" || ground === "drylands" ? "wool and hides" : "wool", amount: slots("ranch") * buildingOutput(ground, "ranch") * 0.5 };
    default:
      return null;
  }
}
