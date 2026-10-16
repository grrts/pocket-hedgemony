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

/** Fastest land route (Dijkstra on days); null when the target can't be reached on foot. */
export function planRoute(d: MarchDefines, map: MarchMap, from: number, to: number, a: MarchingArmy): Route | null {
  if (from === to || !map.ground[to]) return null;
  const n = map.ground.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [];
  const push = (cost: number, p: number) => {
    heap.push([cost, p]);
    for (let i = heap.length - 1; i > 0; ) {
      const up = (i - 1) >> 1;
      if (heap[up]![0] <= heap[i]![0]) break;
      [heap[up], heap[i]] = [heap[i]!, heap[up]!];
      i = up;
    }
  };
  const pop = () => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i]!, heap[m]!];
        i = m;
      }
    }
    return top;
  };
  dist[from] = 0;
  push(0, from);
  while (heap.length) {
    const [cost, p] = pop();
    if (cost > dist[p]!) continue;
    if (p === to) break;
    for (let k = map.adjStart[p]!, end = map.adjStart[p + 1]!; k < end; k++) {
      const q = map.adjList[k]!;
      const c = cost + stepDays(d, map, p, q, a);
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
