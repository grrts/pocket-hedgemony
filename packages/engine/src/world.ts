import type { GameDate, Ground, Ruleset } from "@ph/rules";
import { groundOf, monthlyRations, rowWidths, type MarchMap, type TileMarch } from "./march.ts";
import { placeClimate, provinceClimate, type PlaceClimate } from "./climate.ts";
import { pointTileGrid, type TileGrid } from "./tiles.ts";
import { Rng } from "./rng.ts";
import type { Diplomacy } from "./domain/diplomacy/index.ts";
import { createWarState, maxGarrison, type Battle, type PeaceOffer, type SiegeState } from "./war.ts";
import { newCommander, type Commander } from "./domain/warfare/index.ts";
import { createLivingState, seedClasses, type LivingState } from "./living.ts";
import { ARMS, armIndex, createRecruitState, recount, FOOT_ARMS, HORSE_ARMS, KIND, OFFICIALS, type FreeCompany, type Mercenary, type Muster, refreshFreeCompanies } from "./recruit.ts";

/**
 * Simulation state stored as parallel typed arrays (one array per field,
 * indexed by province, nation or army). This keeps thousands of provinces
 * cache-friendly to iterate every turn and lets whole arrays be copied or
 * transferred to the UI thread without serialising objects.
 */
export interface World extends LivingState {
  rules: Ruleset;
  /** Weeks played. */
  turn: number;
  date: GameDate;
  /** 4-hour step of the day, 0 to 5 (STEPS_PER_DAY). */
  step: number;
  /** Days played. */
  day: number;
  rng: Rng;

  /** The map's tiles, which armies stand and march on. */
  tiles: TileGrid;
  /** East-west size of a tile on each row of the map. */
  rowWidth: Float32Array;
  /** What each province's weather depends on, and its sea-level temperature today (°C). */
  provincePlace: PlaceClimate[];
  provinceTemperature: Float32Array;

  provinceCount: number;
  provinceIds: string[];
  provinceIndex: Map<string, number>;
  provinceOwner: Int16Array; // nation index, -1 = unowned
  provincePopulation: Float32Array; // thousands of people
  provinceWealth: Float32Array;
  /** 1 for sea and ocean zones, which only ships can enter. */
  provinceWater: Uint8Array;
  /** Land ground per province, null for sea and ocean zones. */
  provinceGround: (Ground | null)[];
  provinceRiver: Uint8Array;
  /** Borders in compressed sparse row form: neighbors of p are adjList[adjStart[p] .. adjStart[p+1]). */
  adjStart: Int32Array;
  adjList: Int32Array;

  nationCount: number;
  nationIds: string[];
  nationIndex: Map<string, number>;
  nationTreasury: Float64Array;
  nationLevies: Float64Array;
  nationMaxLevies: Float64Array;
  nationMonthlyIncome: Float64Array;

  commanderIds: string[];
  commanderOwner: Int16Array;
  commanderLogistics: Int8Array;
  /** Each commander as the warfare context sees him: skills, victories and defeats grow with his battles. */
  commanders: Commander[];

  armies: ArmyPool;

  /** The nation the player rules, or -1; the AI leaves it alone. */
  player: number;
  /** Who is at war, allied, under truce or subject: the diplomacy context's state. */
  diplomacy: Diplomacy;
  /** Nation occupying each province in a war, -1 = none. */
  provinceOccupier: Int16Array;
  /** Days a hostile army has held a province without walls. */
  provinceHold: Uint8Array;
  /** Realm that began holding each province (the first to arrive takes it, Leroy F-45), -1 = none. */
  provinceHoldBy: Int16Array;
  /** Men behind each province's walls. */
  provinceGarrison: Float32Array;
  sieges: Map<number, SiegeState>;
  /** Battles being fought, round by round. */
  battles: Battle[];
  battleSeq: number;
  /** Peace the AI offers the player, waiting for an answer until the next month. */
  peaceOffers: PeaceOffer[];
  /** 1 once a nation has lost all its land. */
  nationGone: Uint8Array;

  /** Men who can be called in each province now (recruiting: Recruits here), and the most there can be. */
  provinceRecruits: Float32Array;
  provinceRecruitCeiling: Float32Array;
  /** Troop cap per nation (warfare WAR-029) and the men counting toward it. */
  nationTroopCap: Float64Array;
  nationCapUsed: Float64Array;
  /** Men called up in provinces, gathering a thousand at a time. */
  musters: Muster[];
  /** Mercenary companies on their way. */
  mercs: Mercenary[];
  /** Free companies for hire, shared by every realm that can reach them. */
  freeCompanies: FreeCompany[];
  /** Number of the last free company drawn. */
  freeCompanySeq: number;
  /** Official of each province (index into OFFICIALS), -1 = his post stands empty. */
  provinceOfficial: Int8Array;
  /** Province each commander was commissioned from, -1 = none. */
  commanderHome: number[];
}

export interface ArmyPool {
  count: number; // high-water mark; slots below it may be dead
  alive: Uint8Array;
  owner: Int16Array;
  /** Province the army stands in (the province of its tile). */
  location: Int32Array;
  /** Tile the army stands on. */
  tile: Int32Array;
  men: Int32Array;
  commander: Int32Array; // -1 = none
  /** Men on horseback, counted within men. */
  horse: Int32Array;
  /** Rations in the army's wagons. */
  food: Float64Array;
  /** Provinces still to march through, in order. */
  route: number[][];
  /** Tiles planned ahead, walked from pathAt on (a route is walked a province at a time when it isn't planned through). */
  path: Int32Array[];
  pathAt: Int32Array;
  /** Hours already walked toward the next tile. */
  progress: Float32Array;
  /** Tiles stepped onto since the UI last looked, for drawing the march. */
  trail: number[][];
  /** 1 while a beaten army falls back: it can't be caught or given orders until it gets there. */
  retreating: Uint8Array;
  /** Battle the army is fighting in (its id), or -1. */
  battle: Int32Array;
  /** The province the army last marched in from (-1 = none): the way back past an enemy castle. */
  cameFrom: Int32Array;
  /** Company kind: levy or hired (see KIND). */
  kind: Uint8Array;
  /** Months since the men were raised (a levy's pay begins in the fourth). */
  monthsOut: Uint16Array;
  /** Months drilled together (0 untrained, 3 trained). */
  drill: Float32Array;
  /** Shares of the foot by arm (FOOT_ARMS) and of the horse by arm (HORSE_ARMS), ARMS.length per army. */
  mix: Float32Array;
  /** Arm being trained (index into ARMS, -1 = none), men in training and months left. */
  trainArm: Int8Array;
  trainMen: Int32Array;
  trainLeft: Float32Array;
}

/** How an army's men split by arm and what kind of company they are. */
export interface ArmyMake {
  kind?: number;
  /** Tile to stand on, in the province (else its centre). */
  tile?: number;
  drill?: number;
  /** Arm of the foot and of the horse. */
  foot?: string;
  horseArm?: string;
}

export function createArmyPool(capacity: number): ArmyPool {
  return {
    count: 0,
    alive: new Uint8Array(capacity),
    owner: new Int16Array(capacity),
    location: new Int32Array(capacity),
    tile: new Int32Array(capacity),
    men: new Int32Array(capacity),
    commander: new Int32Array(capacity).fill(-1),
    horse: new Int32Array(capacity),
    food: new Float64Array(capacity),
    route: Array.from({ length: capacity }, () => []),
    path: Array.from({ length: capacity }, () => NO_PATH),
    pathAt: new Int32Array(capacity),
    progress: new Float32Array(capacity),
    trail: Array.from({ length: capacity }, () => []),
    retreating: new Uint8Array(capacity),
    battle: new Int32Array(capacity).fill(-1),
    cameFrom: new Int32Array(capacity).fill(-1),
    kind: new Uint8Array(capacity),
    monthsOut: new Uint16Array(capacity),
    drill: new Float32Array(capacity),
    mix: defaultMix(capacity),
    trainArm: new Int8Array(capacity).fill(-1),
    trainMen: new Int32Array(capacity),
    trainLeft: new Float32Array(capacity),
  };
}

export const NO_PATH = new Int32Array(0);

function defaultMix(capacity: number): Float32Array {
  const mix = new Float32Array(capacity * ARMS.length);
  for (let i = 0; i < capacity; i++) {
    mix[i * ARMS.length + armIndex(FOOT_ARMS[0])] = 1;
    mix[i * ARMS.length + armIndex(HORSE_ARMS[0])] = 1;
  }
  return mix;
}

export function spawnArmy(world: World, owner: number, location: number, men: number, commander = -1, horse = 0, make: ArmyMake = {}): number {
  let pool = world.armies;
  let slot = -1;
  for (let i = 0; i < pool.count; i++) {
    if (!pool.alive[i]) {
      slot = i;
      break;
    }
  }
  if (slot === -1) {
    if (pool.count === pool.alive.length) pool = world.armies = growArmyPool(pool);
    slot = pool.count++;
  }
  pool.alive[slot] = 1;
  pool.owner[slot] = owner;
  pool.location[slot] = location;
  pool.tile[slot] = make.tile ?? world.tiles.centre[location]!;
  pool.men[slot] = men;
  pool.commander[slot] = commander;
  pool.horse[slot] = horse;
  pool.route[slot] = [];
  pool.path[slot] = NO_PATH;
  pool.pathAt[slot] = 0;
  pool.progress[slot] = 0;
  pool.trail[slot] = [];
  pool.retreating[slot] = 0;
  pool.battle[slot] = -1;
  pool.cameFrom[slot] = -1;
  pool.kind[slot] = make.kind ?? KIND.levy;
  pool.monthsOut[slot] = 0;
  pool.drill[slot] = make.drill ?? 0;
  const base = slot * ARMS.length;
  pool.mix.fill(0, base, base + ARMS.length);
  pool.mix[base + armIndex(make.foot ?? FOOT_ARMS[0])] = 1;
  pool.mix[base + armIndex(make.horseArm ?? HORSE_ARMS[0])] = 1;
  pool.trainArm[slot] = -1;
  pool.trainMen[slot] = 0;
  pool.trainLeft[slot] = 0;
  // Wagons start full.
  const d = world.rules.defines.march;
  const logistics = commander >= 0 ? world.commanderLogistics[commander]! : 0;
  pool.food[slot] = monthlyRations(d, { men, horse, logistics }) * d.monthsCarried;
  return slot;
}

function growArmyPool(old: ArmyPool): ArmyPool {
  const next = createArmyPool(old.alive.length * 2);
  next.count = old.count;
  next.alive.set(old.alive);
  next.owner.set(old.owner);
  next.location.set(old.location);
  next.tile.set(old.tile);
  next.men.set(old.men);
  next.commander.set(old.commander);
  next.horse.set(old.horse);
  next.food.set(old.food);
  old.route.forEach((r, i) => (next.route[i] = r));
  old.path.forEach((r, i) => (next.path[i] = r));
  next.pathAt.set(old.pathAt);
  next.progress.set(old.progress);
  old.trail.forEach((r, i) => (next.trail[i] = r));
  next.retreating.set(old.retreating);
  next.battle.set(old.battle);
  next.kind.set(old.kind);
  next.monthsOut.set(old.monthsOut);
  next.drill.set(old.drill);
  next.mix.set(old.mix);
  next.trainArm.set(old.trainArm);
  next.trainMen.set(old.trainMen);
  next.trainLeft.set(old.trainLeft);
  next.cameFrom.set(old.cameFrom);
  return next;
}

/**
 * A new campaign. `tiles` is the map's tile grid (tileGridFromImages); without
 * one the world gets a stand-in with one tile per province, where armies
 * can't march (enough for a probe that only runs a turn).
 */
export function createWorld(rules: Ruleset, seed: number, tiles: TileGrid = pointTileGrid(rules)): World {
  const provinceIds = rules.provinces.map((p) => p.id);
  const provinceIndex = new Map(provinceIds.map((id, i) => [id, i]));
  const nationIds = rules.nations.map((n) => n.id);
  const nationIndex = new Map(nationIds.map((id, i) => [id, i]));
  const P = provinceIds.length;
  const N = nationIds.length;

  const provinceOwner = new Int16Array(P);
  const provincePopulation = new Float32Array(P);
  const provinceWealth = new Float32Array(P);
  const provinceWater = Uint8Array.from(rules.provinces, (p) => (p.terrain === "sea" || p.terrain === "ocean" ? 1 : 0));
  const adjStart = new Int32Array(P + 1);
  let edges = 0;
  rules.provinces.forEach((p, i) => {
    provinceOwner[i] = p.owner === null ? -1 : nationIndex.get(p.owner)!;
    provincePopulation[i] = p.population;
    provinceWealth[i] = p.wealth;
    adjStart[i] = edges;
    edges += p.neighbors.length;
  });
  adjStart[P] = edges;
  const adjList = new Int32Array(edges);
  rules.provinces.forEach((p, i) => {
    p.neighbors.forEach((nb, k) => (adjList[adjStart[i]! + k] = provinceIndex.get(nb)!));
  });

  const commanderIds: string[] = [];
  const commanderOwnerList: number[] = [];
  const commanderLogisticsList: number[] = [];
  const commanders: Commander[] = [];
  rules.nations.forEach((n, i) => {
    for (const c of n.commanders) {
      commanderIds.push(c.id);
      commanderOwnerList.push(i);
      commanderLogisticsList.push(c.logistics);
      commanders.push(newCommander(c.name, { country: n.id, might: c.might, cunning: c.cunning, logistics: c.logistics }));
    }
  });

  const map = rules.map;
  const lonLat = (x: number | undefined, y: number | undefined): [number, number] =>
    map ? [(x ?? 0) / map.pxPerDeg - 180, map.latTop - (y ?? 0) / map.pxPerDeg] : [0, 45];
  const provincePlace = rules.provinces.map((p) => placeClimate(...lonLat(p.x, p.y), !!p.coastal, p.terrain));
  const world: World = {
    rules,
    turn: 0,
    date: { ...rules.defines.startDate },
    step: 0,
    day: 0,
    rng: new Rng(seed),
    tiles,
    rowWidth: map && map.height === tiles.height ? rowWidths(tiles.height, map.latTop, map.pxPerDeg) : new Float32Array(tiles.height).fill(1),
    provincePlace,
    provinceTemperature: new Float32Array(P),
    provinceCount: P,
    provinceIds,
    provinceIndex,
    provinceOwner,
    provincePopulation,
    provinceWealth,
    provinceWater,
    provinceGround: rules.provinces.map((p) => groundOf(p.terrain)),
    provinceRiver: Uint8Array.from(rules.provinces, (p) => (p.river ? 1 : 0)),
    adjStart,
    adjList,
    nationCount: N,
    nationIds,
    nationIndex,
    nationTreasury: new Float64Array(N).fill(rules.defines.economy.startingTreasury),
    nationLevies: new Float64Array(N),
    nationMaxLevies: new Float64Array(N),
    nationMonthlyIncome: new Float64Array(N),
    commanderIds,
    commanderOwner: Int16Array.from(commanderOwnerList),
    commanderLogistics: Int8Array.from(commanderLogisticsList),
    commanders,
    armies: createArmyPool(Math.max(16, N * 2)),
    player: -1,
    diplomacy: null!,
    provinceOccupier: new Int16Array(P).fill(-1),
    provinceHold: new Uint8Array(P),
    provinceHoldBy: new Int16Array(P).fill(-1),
    provinceGarrison: new Float32Array(P),
    sieges: new Map(),
    battles: [],
    battleSeq: 0,
    peaceOffers: [],
    nationGone: new Uint8Array(N),
    ...createRecruitState(P, N),
    ...createLivingState(P),
  };
  world.diplomacy = createWarState(world);
  seedClasses(world);
  updateWeather(world);
  for (let p = 0; p < P; p++) world.provinceGarrison[p] = maxGarrison(world, p);

  for (let p = 0; p < P; p++) {
    if (provinceWater[p]) continue;
    world.provinceRecruitCeiling[p] = provincePopulation[p]! * rules.defines.levies.menPerThousandPeople;
    world.provinceRecruits[p] = world.provinceRecruitCeiling[p]!;
    // Every province of a realm starts with an official, of a type dealt out in turn.
    if (provinceOwner[p]! >= 0) world.provinceOfficial[p] = p % OFFICIALS.length;
  }
  world.commanderHome = commanderIds.map(() => -1);
  recount(world);

  // Every nation starts with the men it had under arms in 1444 (a quarter of its troop cap where
  // the data has no figure), within its cap: one army in the capital led by its first commander,
  // the rest as the capital's garrison troops. Levies already called, half of the foot armoured
  // men-at-arms, the horse light horse.
  rules.nations.forEach((n, i) => {
    const firstCommander = commanderOwnerList.indexOf(i);
    const cap = world.nationTroopCap[i]!;
    const total = Math.max(1000, Math.min(Math.floor(cap / 1000) * 1000, n.army ?? Math.round(cap / 4000) * 1000));
    const field = Math.min(total, START_ARMY_MAX);
    const capital = provinceIndex.get(n.capital)!;
    for (const [men, commander] of [[field, firstCommander], [total - field, -1]] as const) {
      if (men <= 0) continue;
      const slot = spawnArmy(world, i, capital, men, commander, Math.round(men * rules.defines.march.startingHorseShare), { kind: KIND.levy, drill: 1.5 });
      world.armies.mix[slot * ARMS.length + armIndex("levy foot")] = 0.5;
      world.armies.mix[slot * ARMS.length + armIndex("armoured foot")] = 0.5;
    }
  });
  recount(world);
  refreshFreeCompanies(world);

  return world;
}

/** The most men one army starts with; a realm's other men start as its capital's garrison troops. */
const START_ARMY_MAX = 30000;

export function areNeighbors(world: World, a: number, b: number): boolean {
  for (let k = world.adjStart[a]!, end = world.adjStart[a + 1]!; k < end; k++) {
    if (world.adjList[k] === b) return true;
  }
  return false;
}

/** The world's province graph as the march planner sees it. */
export function marchMap(world: World): MarchMap {
  return { adjStart: world.adjStart, adjList: world.adjList, ground: world.provinceGround, population: world.provincePopulation, river: world.provinceRiver };
}

/** Each province's sea-level temperature for today (the snow on its tiles slows marches). */
export function updateWeather(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) if (!world.provinceWater[p]) world.provinceTemperature[p] = provinceClimate(world.provincePlace[p]!, world.date).temperature;
}

/** The world's tiles as a march over them sees them today. */
export function tileMarch(world: World): TileMarch {
  return { d: world.rules.defines.march, grid: world.tiles, population: world.provincePopulation, temperature: world.provinceTemperature, rowWidth: world.rowWidth };
}
