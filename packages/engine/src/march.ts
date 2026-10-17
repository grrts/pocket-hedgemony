import type { Ground, MarchDefines, Terrain } from "@ph/rules";

/**
 * Marching and feeding armies, after the warfare design (sections 5 and 6).
 * Kept free of World so the UI can plan the same routes the engine will walk.
 */
export interface MarchMap {
  adjStart: Int32Array;
  adjList: Int32Array;
  /** Province ground, or null for sea and ocean zones. */
  ground: (Ground | null)[];
  /** Thousands of people per province. */
  population: ArrayLike<number>;
  /** 1 where a river runs through the province. */
  river: ArrayLike<number>;
}

export interface MarchingArmy {
  men: number;
  horse: number;
  /** Commander's logistics points, 0 without a commander. */
  logistics: number;
}

export function groundOf(terrain: Terrain): Ground | null {
  return terrain === "sea" || terrain === "ocean" ? null : terrain;
}

/** Rations an army eats in a month. */
export function monthlyRations(d: MarchDefines, a: MarchingArmy): number {
  return (a.men * d.rationsPerSoldier + a.horse * d.rationsPerHorse) * Math.max(0, 1 - a.logistics * d.logisticsRationCut);
}

/** Rations the province can spare an army in a month: its store times how much of it foragers find. */
export function forageRations(d: MarchDefines, map: MarchMap, p: number): number {
  const g = map.ground[p];
  return g ? map.population[p]! * 1000 * d.rationsStoredPerPerson * d.foraging[g] : 0;
}

/** Soldiers a province can feed for a month (warfare design 6.3). */
export function forageLimit(d: MarchDefines, map: MarchMap, p: number): number {
  return forageRations(d, map, p) / d.rationsPerSoldier;
}

/**
 * Days to march from one province into its neighbour: half the crossing of
 * each ground, slower for a column bigger than the land ahead can feed,
 * faster the larger the share of horse, plus a day to cross a river.
 */
export function stepDays(d: MarchDefines, map: MarchMap, from: number, to: number, a: MarchingArmy): number {
  const gf = map.ground[from];
  const gt = map.ground[to];
  if (!gf || !gt) return Infinity;
  let crossings = (d.daysToCross[gf] + d.daysToCross[gt]) / 2;
  if (a.men > forageLimit(d, map, to)) crossings += d.bigArmyExtraCrossings;
  const horseShare = a.men > 0 ? Math.min(1, a.horse / a.men) : 0;
  return (crossings * d.daysPerCrossing) / (1 + d.horseSpeedBonus * horseShare) + (map.river[to] ? d.riverCrossingDays : 0);
}

export interface Route {
  /** Provinces after the start, in marching order. */
  path: number[];
  /** Days to reach each province on the path, counted from the start. */
  arrive: number[];
}

/**
 * Fastest land route (Dijkstra on days); null when the target can't be reached on foot.
 * Called while the player drags an army, so costs are precomputed per province
 * and the heap lives in typed arrays: see the route budget in docs/performance.md.
 */
export function planRoute(d: MarchDefines, map: MarchMap, from: number, to: number, a: MarchingArmy): Route | null {
  if (from === to || !map.ground[from] || !map.ground[to]) return null;
  const n = map.ground.length;
  // stepDays(p, q) = (half[p] + enter[q]) * pace + river[q], split per province.
  const pace = d.daysPerCrossing / (1 + d.horseSpeedBonus * (a.men > 0 ? Math.min(1, a.horse / a.men) : 0));
  const half = new Float64Array(n);
  const enter = new Float64Array(n).fill(Infinity);
  for (let p = 0; p < n; p++) {
    const g = map.ground[p];
    if (!g) continue;
    half[p] = (d.daysToCross[g] / 2) * pace;
    enter[p] = half[p]! + (a.men > forageLimit(d, map, p) ? d.bigArmyExtraCrossings * pace : 0) + (map.river[p] ? d.riverCrossingDays : 0);
  }
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  // Binary heap of (cost, province); a province may sit in it more than once.
  let cap = 1024;
  let hCost = new Float64Array(cap);
  let hNode = new Int32Array(cap);
  let size = 0;
  const push = (cost: number, p: number) => {
    if (size === cap) {
      cap *= 2;
      const c = new Float64Array(cap);
      c.set(hCost);
      hCost = c;
      const v = new Int32Array(cap);
      v.set(hNode);
      hNode = v;
    }
    let i = size++;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (hCost[up]! <= cost) break;
      hCost[i] = hCost[up]!;
      hNode[i] = hNode[up]!;
      i = up;
    }
    hCost[i] = cost;
    hNode[i] = p;
  };
  const pop = () => {
    const top = hNode[0]!;
    const cost = hCost[--size]!;
    const node = hNode[size]!;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      if (l >= size) break;
      const m = l + 1 < size && hCost[l + 1]! < hCost[l]! ? l + 1 : l;
      if (hCost[m]! >= cost) break;
      hCost[i] = hCost[m]!;
      hNode[i] = hNode[m]!;
      i = m;
    }
    hCost[i] = cost;
    hNode[i] = node;
    return top;
  };
  dist[from] = 0;
  push(0, from);
  const done = new Uint8Array(n);
  while (size) {
    const p = pop();
    if (done[p]) continue;
    done[p] = 1;
    if (p === to) break;
    const base = dist[p]! + half[p]!;
    for (let k = map.adjStart[p]!, end = map.adjStart[p + 1]!; k < end; k++) {
      const q = map.adjList[k]!;
      const c = base + enter[q]!;
      if (c < dist[q]!) {
        dist[q] = c;
        prev[q] = p;
        push(c, q);
      }
    }
  }
  if (!Number.isFinite(dist[to]!)) return null;
  const path: number[] = [];
  for (let p = to; p !== from; p = prev[p]!) path.push(p);
  path.reverse();
  return { path, arrive: path.map((p) => dist[p]!) };
}
