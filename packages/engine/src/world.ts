import type { GameDate, Ruleset } from "@ph/rules";
import { Rng } from "./rng.ts";

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

  armies: ArmyPool;
}

export interface ArmyPool {
  count: number; // high-water mark; slots below it may be dead
  alive: Uint8Array;
  owner: Int16Array;
  location: Int32Array;
  men: Int32Array;
  commander: Int32Array; // -1 = none
  movedThisTurn: Uint8Array;
}

export function createArmyPool(capacity: number): ArmyPool {
  return {
    count: 0,
    alive: new Uint8Array(capacity),
    owner: new Int16Array(capacity),
    location: new Int32Array(capacity),
    men: new Int32Array(capacity),
    commander: new Int32Array(capacity).fill(-1),
    movedThisTurn: new Uint8Array(capacity),
  };
}

export function spawnArmy(world: World, owner: number, location: number, men: number, commander = -1): number {
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
  pool.movedThisTurn[slot] = 0;
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
  next.movedThisTurn.set(old.movedThisTurn);
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
  rules.nations.forEach((n, i) => {
    for (const c of n.commanders) {
      commanderIds.push(c.id);
      commanderOwnerList.push(i);
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
    armies: createArmyPool(Math.max(16, N * 2)),
  };

  recomputeMaxLevies(world);
  world.nationLevies.set(world.nationMaxLevies);

  // Every nation starts with one army in its capital, led by its first commander.
  rules.nations.forEach((n, i) => {
    const firstCommander = commanderOwnerList.indexOf(i);
    spawnArmy(world, i, provinceIndex.get(n.capital)!, 5000, firstCommander);
  });

  return world;
}

export function recomputeMaxLevies(world: World): void {
  const max = world.nationMaxLevies;
  const perThousand = world.rules.defines.levies.menPerThousandPeople;
  max.fill(0);
  for (let p = 0; p < world.provinceCount; p++) {
    const owner = world.provinceOwner[p]!;
    if (owner >= 0) max[owner] = max[owner]! + world.provincePopulation[p]! * perThousand;
  }
}

export function areNeighbors(world: World, a: number, b: number): boolean {
  for (let k = world.adjStart[a]!, end = world.adjStart[a + 1]!; k < end; k++) {
    if (world.adjList[k] === b) return true;
  }
  return false;
}
