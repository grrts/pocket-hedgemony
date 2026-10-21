import { mix } from "./names.ts";
import type { World } from "./world.ts";
import type { Ground } from "@ph/rules";
import { CLASS_COUNT, CLASS_NAMES } from "./living.ts";
import { GROUNDS, groundOfCell, WATER } from "./tiles.ts";
import { buildingOutput, groundStartMix, peopleOutput, shareOut } from "./domain/province/land.ts";
import { knownSet } from "./research.ts";
import { CLASSES, provinceConfig } from "./domain/province/model.ts";

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
  /** Game in each province's woods, 1 = plenty, down to the floor where hunters crowd them (feedback 81). */
  provinceGame: Float32Array;
  /** 1 in a province whose region has a hard winter this year: its hunters bring in less (feedback 81). */
  provinceHardWinter: Uint8Array;
  /** The ware of each province's seam (an index into SEAM_WARES), -1 where it has none (feedback 87, PROV-065). */
  provinceSeam: Int8Array;
  /** Years of digging left in each province's seam. */
  provinceSeamYears: Float32Array;
  /** Fields tiles worn by overwork in each province: they give half until they rest (PROV-034, PROV-035). */
  provinceWorn: Uint8Array;
  /** Years in a row each province's fields have been farmed with more farmers than they hold. */
  provinceOverwork: Uint8Array;
  /** Years in a row each province's worn fields have rested, unneeded. */
  provinceRested: Uint8Array;
}

export function createLandState(P: number): LandState {
  return { provinceTiles: new Uint8Array(P * MAX_TILES), provinceLandYield: new Float32Array(P).fill(1), provinceGame: new Float32Array(P).fill(1), provinceHardWinter: new Uint8Array(P), provinceSeam: new Int8Array(P).fill(-1), provinceSeamYears: new Float32Array(P), provinceWorn: new Uint8Array(P), provinceOverwork: new Uint8Array(P), provinceRested: new Uint8Array(P) };
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

/** How a square of each ground is shared between the tile uses (the province config's ground.start_mix, a stand-in for the map's own fields and pastures, D-PROV-25). */
const groundUses = (g: Ground): [UseName, number][] => Object.entries(groundStartMix(g)).map(([use, w]) => [use as UseName, w]);

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
    // Count each province's squares by ground first (twelve million squares), then share them out by use.
    const G = GROUNDS.length;
    const byGround = new Uint32Array(P * G);
    for (let t = 0; t < grid.province.length; t++) {
      const id = grid.province[t]!;
      if (!id) continue;
      const g = groundOfCell(grid.cell[t]!);
      if (g === WATER || g >= G) continue;
      byGround[(id - 1) * G + g]!++;
    }
    const weights = GROUNDS.map((name) => groundUses(name).map(([use, w]) => [U[use], w] as const));
    for (let p = 0; p < P; p++)
      for (let g = 0; g < G; g++) {
        const n = byGround[p * G + g]!;
        if (!n) continue;
        squares[p]! += n;
        for (const [u, w] of weights[g]!) mix[p * USES.length + u]! += w * n;
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
    if (squares[p] === 0) for (const [use, w] of groundUses(ground)) mix[p * USES.length + U[use]] = w;
    const scale = squares[p]! > 0 && hi > lo ? Math.min(1, Math.max(0, (Math.log(squares[p]!) - lo) / (hi - lo))) : 0.4;
    const count = Math.round(4 + (MAX_TILES - 4) * scale);
    const shore = world.rules.provinces[p]!.coastal ? Math.min(3, 1 + Math.floor(world.provinceClasses[p * CLASS_COUNT + seafolk]! / 6)) : 0;
    const land = Math.max(1, count - 1 - shore);
    const uses = shareOut(mix.subarray(p * USES.length, (p + 1) * USES.length), land, U.fields);
    let i = p * MAX_TILES;
    const put = (u: number, n: number) => {
      for (let k = 0; k < n; k++) world.provinceTiles[i++] = u + 1;
    };
    put(U.town, 1);
    uses.forEach((n, u) => put(u, n));
    put(U.shore, shore);
  }
  // Game starts where the 1444 hunting has left it, so nothing crashes in the first years.
  for (let p = 0; p < P; p++) if (!world.provinceWater[p]) world.provinceGame[p] = gameTarget(world, p);
  seedSeams(world);
}

// ---------------------------------------------------------------- food and wares

/**
 * Thousands of people in a building's job slots (province buildings.land …
 * slots), times the slot scale: the map's provinces hold more people than the
 * design's (median 46,000, a tenth over 300,000), so a tile holds more (D-PROV-25).
 */
let slotScale = 1;
const slotsK = new Map<string, number>();
const slots = (name: string): number => {
  let k = slotsK.get(name);
  if (k === undefined) slotsK.set(name, (k = ((provinceConfig.buildings.land as Record<string, { slots: number }>)[name]?.slots ?? 0) / 1000));
  return k * slotScale;
};
const perWorker = (name: string): number => (provinceConfig.buildings.land as Record<string, { food_per_worker?: number }>)[name]?.food_per_worker ?? 0;
const BARE = provinceConfig.food.bare_per_worker;

/** What a class of the land works on: its building, the bare activity, and whether its food waits for the harvest. */
const FOOD_WORK = {
  farmers: { building: "farm", activity: "farming", harvest: true },
  herders: { building: "ranch", activity: "herding", harvest: false },
  seafolk: { building: "fishery", activity: "fishing", harvest: false },
  woodsmen: { building: "hunting lodge", activity: "hunting and gathering", harvest: false },
} as const;
export type FoodClass = keyof typeof FOOD_WORK;
export const FOOD_CLASSES = Object.keys(FOOD_WORK) as FoodClass[];

/** The tile use each food class works. */
const CLASS_USE: Record<FoodClass, UseName> = { farmers: "fields", herders: "pasture", seafolk: "shore", woodsmen: "woods" };
/** Each food class's place in a province's classes. */
const CLASS_AT: Record<FoodClass, number> = { farmers: CLASSES.indexOf("farmers"), herders: CLASSES.indexOf("herders"), seafolk: CLASSES.indexOf("seafolk"), woodsmen: CLASSES.indexOf("woodsmen") };

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
  const workers = world.provinceClasses[p * CLASS_COUNT + CLASS_AT[cls]]!;
  const ground = world.provinceGround[p] ?? "grassland";
  const bareRate = BARE * peopleOutput(ground, work.activity);
  if (cls === "woodsmen") return huntingFood(world, p, workers, bareRate, step > 0 ? share : 0);
  const tiles = tilesOf(world, p, CLASS_USE[cls]);
  const room = tiles * slots(work.building);
  // Farmers fill the sound fields first; those on worn fields bring in half (PROV-034, wornFields).
  const onWorn = cls === "farmers" ? Math.max(0, Math.min(workers, room) - (room - Math.min(world.provinceWorn[p]!, tiles) * slots(work.building))) : 0;
  const wornLoss = 1 - WORN.output;
  if (!work.building || step <= 0) return (workers - onWorn * wornLoss) * bareRate;
  const inside = Math.min(workers, room);
  const rate = (cls === "farmers" ? world.rules.defines.works.farmRates[step - 1] ?? perWorker("farm") : perWorker(work.building)) * buildingOutput(ground, work.building);
  // Unpaid buildings give half: the rest of their workers count as on bare land.
  const inRate = rate * share + bareRate * (1 - share);
  return (workers - inside) * bareRate + (inside - onWorn * wornLoss) * inRate;
}

// ---------------------------------------------------------------- worn fields (PROV-034, PROV-035)

const WORN = provinceConfig.worn;

/** Worn fields tiles of a province, never more than its fields. */
export const wornFields = (world: World, p: number): number => Math.min(world.provinceWorn[p]!, tilesOf(world, p, "fields"));

/** Years of overwork before a province's fields wear: 30, half as long again for each rotation invention its owner knows (D-PROV-31). */
export function wearYearsOf(world: World, p: number): number {
  const owner = world.provinceOwner[p]!;
  const known = owner >= 0 ? knownSet(world, owner) : null;
  return WORN.overwork_years * WORN.rotation_stretch ** (known ? WORN.rotation_inventions.filter((id) => known.has(id)).length : 0);
}

/**
 * The wearing year, each January (PROV-034, PROV-035, D-PROV-31): fields farmed with more
 * farmers than they hold, year after year, wear one tile at a time; a worn tile the sound
 * fields can spare rests, and after 5 years of rest it is sound again.
 */
export function wearYear(world: World): void {
  const farmers = CLASS_NAMES.indexOf("farmers");
  const perTile = slots("farm");
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const fields = tilesOf(world, p, "fields");
    const worn = wornFields(world, p);
    world.provinceWorn[p] = worn;
    const people = world.provinceClasses[p * CLASS_COUNT + farmers]!;
    if (fields > 0 && people > fields * perTile) {
      world.provinceRested[p] = 0;
      world.provinceOverwork[p] = Math.min(255, world.provinceOverwork[p]! + 1);
      if (world.provinceOverwork[p]! >= wearYearsOf(world, p) && worn < fields) {
        world.provinceWorn[p] = worn + 1;
        world.provinceOverwork[p] = 0;
      }
      continue;
    }
    world.provinceOverwork[p] = 0;
    if (worn > 0 && people <= (fields - worn) * perTile) {
      world.provinceRested[p]!++;
      if (world.provinceRested[p]! >= WORN.recovery_years) {
        world.provinceWorn[p] = worn - 1;
        world.provinceRested[p] = 0;
      }
    } else world.provinceRested[p] = 0;
  }
}

// ---------------------------------------------------------------- fever land (PROV-243)

const FEVER = provinceConfig.fever_land;
export const FEVER_STEPS = FEVER.steps as readonly string[];

/**
 * A province's fever land, 0 (none) to 3 (deadly), as the province context sets it
 * (D-PROV-32): its ground, a step more in the tropics, a step more for every two marsh tiles,
 * a step less for each of quinine and sanitation its owner knows.
 */
export function feverOf(world: World, p: number): number {
  if (world.provinceWater[p]) return 0;
  const ground = world.provinceGround[p] ?? "grassland";
  const tropics = Math.abs(world.provincePlace[p]?.lat ?? 45) <= FEVER.tropics_lat ? FEVER.tropics_steps : 0;
  const at = Math.min(FEVER_STEPS.length - 1, ((FEVER.by_ground as Record<string, number>)[ground] ?? 0) + tropics + Math.floor(tilesOf(world, p, "marsh") / FEVER.marsh_tiles_per_step));
  if (at <= 0) return 0;
  const owner = world.provinceOwner[p]!;
  const known = owner >= 0 ? knownSet(world, owner) : null;
  return Math.max(0, at - (known ? FEVER.lowered_by.filter((id) => known.has(id)).length : 0));
}

/** The extra yearly death rate of fever land: in full for people born elsewhere, a tenth for locals (PROV-102). Warfare reads it for armies. */
export function feverDeathRateOf(world: World, p: number, bornHere: boolean): number {
  const rate = (FEVER.deaths_born_elsewhere as Record<string, number>)[FEVER_STEPS[feverOf(world, p)]!] ?? 0;
  return bornHere ? rate * FEVER.local_share : rate;
}

// ---------------------------------------------------------------- hunting (feedback 81)

const HUNT = provinceConfig.food.hunting;

/** Hunters the province's woods hold at full yield, in thousands: the woods tiles' slots. */
export const huntingRoom = (world: World, p: number): number => tilesOf(world, p, "woods") * slots("hunting lodge");

/** How rich the ground's game is: boreal woods and tundra most, thin woods least. */
function gameYield(world: World, p: number): number {
  const ground = world.provinceGround[p] ?? "grassland";
  const by = HUNT.game_yield as Record<string, number>;
  if (ground === "forest" && (world.provincePlace[p]?.lat ?? 45) >= HUNT.boreal_lat) return HUNT.boreal_yield;
  return by[ground] ?? by.base!;
}

/** Hunters over the woods' room per hunter that fits. */
function crowding(world: World, p: number): number {
  const room = huntingRoom(world, p);
  const hunters = world.provinceClasses[p * CLASS_COUNT + CLASS_NAMES.indexOf("woodsmen")]!;
  return room > 0 ? Math.max(0, hunters / room - 1) : 0;
}

/** The game the hunting leaves in the woods over the years: plenty until the hunters crowd them, then less. */
export function gameTarget(world: World, p: number): number {
  return Math.max(HUNT.game_floor, 1 - HUNT.thinning_per_crowding * crowding(world, p));
}

/**
 * Food the hunters bring in a year (feedback 81): those the woods hold hunt
 * at the bare rate × how rich the game is there × how much is left, half as
 * much again with a hunting lodge; the rest scrape a living beyond the woods
 * at half the bare rate. A hard winter cuts it all.
 */
function huntingFood(world: World, p: number, hunters: number, bareRate: number, lodge: number): number {
  const inside = Math.min(hunters, huntingRoom(world, p));
  const lodgeRate = perWorker("hunting lodge") / BARE;
  const rate = bareRate * gameYield(world, p) * world.provinceGame[p]! * (1 + (lodgeRate - 1) * lodge);
  const winter = world.provinceHardWinter[p] ? HUNT.hard_winter.catch : 1;
  return (inside * rate + (hunters - inside) * bareRate * HUNT.beyond_woods) * winter;
}

/**
 * The hunting year, each January (feedback 81): game moves a step toward what
 * the hunting leaves, and each region rolls for a hard winter, more often in
 * the north. The roll comes from the game's weather seed, the year and the
 * region, not from `world.rng`, so it never shifts the rest of the turn. `region` gives a province's weather region.
 */
export function huntingYear(world: World, region: (p: number) => number): void {
  const hw = HUNT.hard_winter;
  const winters = new Map<number, boolean>();
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const g = world.provinceGame[p]!;
    world.provinceGame[p] = g + (gameTarget(world, p) - g) * HUNT.regrow_per_year;
    const lat = Math.abs(world.provincePlace[p]?.lat ?? 45);
    const oneIn = lat >= hw.north_lat || world.provinceGround[p] === "tundra" ? hw.north_one_in : lat >= hw.mid_lat ? hw.mid_one_in : 0;
    if (!oneIn) {
      world.provinceHardWinter[p] = 0;
      continue;
    }
    const r = region(p) * 8 + oneIn;
    if (!winters.has(r)) winters.set(r, mix(mix(world.weatherSeed, world.date.year), r) % oneIn === 0);
    world.provinceHardWinter[p] = winters.get(r) ? 1 : 0;
  }
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
    case "hunting lodge":
      return lat >= HUNT.boreal_lat || ground === "tundra" ? { ware: "furs", amount: slots("hunting lodge") * gameYield(world, p) * world.provinceGame[p]! * 0.5 } : null;
    case "quarry":
      return { ware: "stone", amount: slots("mine") * buildingOutput(ground, "mine") };
    case "mine": {
      const ware = seamWare(world, p);
      return ware ? { ware, amount: slots("mine") * buildingOutput(ground, "mine") * (precious(ware) ? 0.1 : 1) } : null;
    }
    case "saltworks":
      return { ware: "salt", amount: slots("saltworks") * 2 };
    case "ranch":
      return { ware: ground === "grassland" || ground === "savanna" || ground === "drylands" ? "wool and hides" : "wool", amount: slots("ranch") * buildingOutput(ground, "ranch") * 0.5 };
    default:
      return null;
  }
}

// ---------------------------------------------------------------- mines and salt (feedback 87)

const MINES = provinceConfig.mines;

/** The wares a seam can hold. */
export const SEAM_WARES = ["iron", "copper", "tin", "silver", "gold", "salt"] as const;
export type SeamWare = (typeof SEAM_WARES)[number];

/** Rough waste can hold a seam: hills and mountains with a waste tile (PROV-065). */
export const roughWaste = (world: World, p: number): boolean => (world.provinceGround[p] === "hills" || world.provinceGround[p] === "mountains") && tilesOf(world, p, "waste") > 0;

/**
 * Seams in 1444: the map's famous mines (Kutná Hora's silver, Falun's copper),
 * and elsewhere on rough waste a fixed roll per province, so every game has
 * the same geology and the roll never touches the turn's dice.
 */
function seedSeams(world: World): void {
  const weights = SEAM_WARES.map((w) => (MINES.ware_weights as Record<string, number>)[w] ?? 0);
  const total = weights.reduce((a, b) => a + b, 0);
  const anchors = MINES.anchors as Record<string, { ware: SeamWare; years: number }>;
  for (let p = 0; p < world.provinceCount; p++) {
    world.provinceSeam[p] = -1;
    world.provinceSeamYears[p] = 0;
    if (world.provinceWater[p]) continue;
    const anchor = anchors[world.rules.provinces[p]!.name];
    if (anchor) {
      // The mine's shafts and spoil take a tile: the last one that isn't the town turns to waste.
      if (tilesOf(world, p, "waste") === 0) {
        for (let i = p * MAX_TILES + MAX_TILES - 1; i >= p * MAX_TILES; i--) {
          const use = world.provinceTiles[i]!;
          if (use === 0 || use === U.town + 1) continue;
          world.provinceTiles[i] = U.waste + 1;
          break;
        }
      }
      world.provinceSeam[p] = SEAM_WARES.indexOf(anchor.ware);
      world.provinceSeamYears[p] = anchor.years;
      continue;
    }
    if (!roughWaste(world, p)) continue;
    const id = world.provinceIds[p]!;
    let h = 0;
    for (let i = 0; i < id.length; i++) h = mix(h, id.charCodeAt(i));
    if ((mix(h, 1) % 1000) / 1000 >= MINES.seam_chance) continue;
    let pick = mix(h, 2) % total;
    let k = 0;
    while (pick >= weights[k]!) pick -= weights[k++]!;
    world.provinceSeam[p] = k;
    world.provinceSeamYears[p] = MINES.years_min + (mix(h, 3) % (MINES.years_max - MINES.years_min + 1));
  }
}

/** The ware of a province's seam, or null. */
export const seamWare = (world: World, p: number): SeamWare | null => (world.provinceSeam[p]! >= 0 ? SEAM_WARES[world.provinceSeam[p]!]! : null);

/** Salt pans need a dry or warm coast (the buildings data's dry_or_warm_coast). */
export function saltCoast(world: World, p: number): boolean {
  if (tilesOf(world, p, "shore") === 0) return false;
  const ground = world.provinceGround[p] ?? "grassland";
  return (MINES.salt_grounds as string[]).includes(ground) || Math.abs(world.provincePlace[p]?.lat ?? 45) < MINES.salt_lat_below;
}

/** Whether a ware is silver or gold, worth the most in trade. */
export const precious = (ware: string | null): boolean => !!ware && (MINES.precious as string[]).includes(ware);
