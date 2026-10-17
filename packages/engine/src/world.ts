import type { GameDate, Ground, Ruleset } from "@ph/rules";
import { groundOf, monthlyRations, type MarchMap } from "./march.ts";
import { Rng } from "./rng.ts";
import type { Diplomacy } from "./domain/diplomacy/index.ts";
import { createWarState, maxGarrison, type SiegeState } from "./war.ts";
import { newCommander, type Commander } from "./domain/warfare/index.ts";
import { ARMS, armIndex, createRecruitState, recount, FOOT_ARMS, HORSE_ARMS, KIND, OFFICIALS, type Mercenary, type Muster } from "./recruit.ts";

/**
 * Simulation state stored as parallel typed arrays (one array per field,
 * indexed by province, nation or army). This keeps thousands of provinces
 * cache-friendly to iterate every turn and lets whole arrays be copied or
 * transferred to the UI thread without serialising objects.
 */
export interface World {
  rules: Ruleset;
  turn: number;
  date: GameDate;
  rng: Rng;

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
  /** Weeks a hostile army has held a province without walls. */
  provinceHold: Uint8Array;
  /** Men behind each province's walls. */
  provinceGarrison: Float32Array;
  sieges: Map<number, SiegeState>;
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
  /** Official of each province (index into OFFICIALS), -1 = his post stands empty. */
  provinceOfficial: Int8Array;
  /** Province each commander was commissioned from, -1 = none. */
  commanderHome: number[];
}

export interface ArmyPool {
  count: number; // high-water mark; slots below it may be dead
  alive: Uint8Array;
  owner: Int16Array;
  location: Int32Array;
  men: Int32Array;
  commander: Int32Array; // -1 = none
  /** Men on horseback, counted within men. */
  horse: Int32Array;
  /** Rations in the army's wagons. */
  food: Float64Array;
  /** Days already marched toward the next province on the route. */
  progress: Float32Array;
  movedThisTurn: Uint8Array;
  /** Provinces still to march through, in order. */
  route: number[][];
  /** Provinces walked last turn, starting where the army set out (for drawing the march). */
  marched: number[][];
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
    men: new Int32Array(capacity),
    commander: new Int32Array(capacity).fill(-1),
    horse: new Int32Array(capacity),
    food: new Float64Array(capacity),
    progress: new Float32Array(capacity),
    movedThisTurn: new Uint8Array(capacity),
    route: Array.from({ length: capacity }, () => []),
    marched: Array.from({ length: capacity }, () => []),
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
  pool.men[slot] = men;
  pool.commander[slot] = commander;
  pool.horse[slot] = horse;
  pool.progress[slot] = 0;
  pool.movedThisTurn[slot] = 0;
  pool.route[slot] = [];
  pool.marched[slot] = [];
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
  next.men.set(old.men);
  next.commander.set(old.commander);
  next.horse.set(old.horse);
  next.food.set(old.food);
  next.progress.set(old.progress);
  next.movedThisTurn.set(old.movedThisTurn);
  old.route.forEach((r, i) => (next.route[i] = r));
  old.marched.forEach((r, i) => (next.marched[i] = r));
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

export function createWorld(rules: Ruleset, seed: number): World {
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

  const world: World = {
    rules,
    turn: 0,
    date: { ...rules.defines.startDate },
    rng: new Rng(seed),
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
    provinceGarrison: new Float32Array(P),
    sieges: new Map(),
    nationGone: new Uint8Array(N),
    ...createRecruitState(P, N),
  };
  world.diplomacy = createWarState(world);
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

  // Every nation starts with one army in its capital, led by its first commander: levies already
  // called, half of the foot armoured men-at-arms, the horse light horse.
  rules.nations.forEach((n, i) => {
    const firstCommander = commanderOwnerList.indexOf(i);
    const men = 5000;
    const slot = spawnArmy(world, i, provinceIndex.get(n.capital)!, men, firstCommander, Math.round(men * rules.defines.march.startingHorseShare), { kind: KIND.levy, drill: 1.5 });
    world.armies.mix[slot * ARMS.length + armIndex("levy foot")] = 0.5;
    world.armies.mix[slot * ARMS.length + armIndex("armoured foot")] = 0.5;
  });

  return world;
}

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
