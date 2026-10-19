import type { Ground, MarchDefines, Terrain } from "@ph/rules";
import { snowCover } from "./climate.ts";
import { realmConfig } from "./domain/realm/index.ts";
import { GROUNDS, groundOfCell, heightOfCell, riverOfCell, WATER, type TileGrid } from "./tiles.ts";

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
  /** On campaign (at war, or abroad) men eat double (REALM-054); left out, the army eats as it would at home. */
  campaigning?: boolean;
  /** Percent of the food its wagons hold: 50 without B01 *Wheel and carts* (RSCH-094); left out, all of it. */
  foodCarriedPct?: number;
}

export function groundOf(terrain: Terrain): Ground | null {
  return terrain === "sea" || terrain === "ocean" ? null : terrain;
}

/**
 * Rations an army eats in a month. A ration is one man's food for a month, so
 * a thousand rations are one unit of a province's store (feedback 83).
 */
export function monthlyRations(d: MarchDefines, a: MarchingArmy): number {
  const men = a.men * d.rationsPerSoldier * (a.campaigning ? realmConfig.food.campaign_eat : 1);
  return (men + a.horse * d.rationsPerHorse) * Math.max(0, 1 - a.logistics * d.logisticsRationCut);
}

/** Rations an army's wagons hold: its months carried of eating on campaign. */
export function wagonRations(d: MarchDefines, a: MarchingArmy): number {
  return monthlyRations(d, { ...a, campaigning: true }) * d.monthsCarried * ((a.foodCarriedPct ?? 100) / 100);
}

/**
 * Rations an army can take from a province's store in a month (feedback 83):
 * what its foragers find on that ground of the food above the reserve. At
 * home the locals keep a reserve for themselves; abroad nothing is kept back.
 */
export function refillRations(d: MarchDefines, ground: Ground | null, storeRations: number, reserveRations: number): number {
  return ground ? Math.max(0, storeRations - reserveRations) * d.foraging[ground] : 0;
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
/**
 * The fastest road over the provinces. `barred(p, q)`, when given, says the
 * army may not step from p to q (an enemy castle it can enter but not pass).
 */
export function planRoute(d: MarchDefines, map: MarchMap, from: number, to: number, a: MarchingArmy, barred?: (p: number, q: number) => boolean): Route | null {
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
      if (barred?.(p, q)) continue;
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

// ---------------------------------------------------------------- marching over tiles

/** What a march over tiles depends on: the grid, the map's projection and each province's sea-level temperature today. */
export interface TileMarch {
  /** Marching hours in each province against none (roads); absent = no roads. */
  roadHours?: Float32Array;
  d: MarchDefines;
  grid: TileGrid;
  /** Thousands of people per province, for the forage limit. */
  population: ArrayLike<number>;
  /** Sea-level temperature per province today, °C (snow on the higher tiles first). */
  temperature: ArrayLike<number>;
  /** East-west size of a tile on each row, against a north-south step (the map is equirectangular). */
  rowWidth: Float32Array;
}

/** East-west tile size by row: cos(latitude) on an equirectangular map. */
export function rowWidths(height: number, latTop: number, pxPerDeg: number): Float32Array {
  return Float32Array.from({ length: height }, (_, y) => Math.max(0.05, Math.cos(((latTop - (y + 0.5) / pxPerDeg) * Math.PI) / 180)));
}

const GROUND_OF = GROUNDS;

/** Hours a march takes across one tile of open ground, for this army (before snow and size). */
function tilePace(d: MarchDefines, a: MarchingArmy): number {
  const horseShare = a.men > 0 ? Math.min(1, a.horse / a.men) : 0;
  return (d.daysPerCrossing * 24) / d.tilesPerCrossing / (1 + d.horseSpeedBonus * horseShare);
}

/**
 * Hours to step from tile `from` onto its neighbour `to`: the ground's
 * crossing time spread over the tiles of a crossing, slower in snow and for a
 * column bigger than the province can feed, plus the river crossing when
 * stepping onto a river. Water can't be walked on.
 */
export function tileStepHours(m: TileMarch, from: number, to: number, a: MarchingArmy): number {
  const c = m.grid.cell[to]!;
  const g = groundOfCell(c);
  if (g === WATER) return Infinity;
  const { d, grid } = m;
  const ground = GROUND_OF[g]!;
  const p = grid.province[to]! - 1;
  if (grid.coarse) {
    const units = d.daysToCross[ground] + (a.men > forageLimitOf(d, ground, m.population[p]!) ? d.bigArmyExtraCrossings : 0);
    return tilePace(d, a) * d.tilesPerCrossing * units * (m.roadHours?.[p] ?? 1) + (riverOfCell(c) ? d.riverCrossingDays * 24 : 0);
  }
  const dx = (to % grid.width) - (from % grid.width);
  const dy = to - from - dx;
  const across = dx === 0 ? 1 : dy === 0 ? m.rowWidth[Math.floor(to / grid.width)]! : Math.hypot(1, m.rowWidth[Math.floor(to / grid.width)]!);
  let units = d.daysToCross[ground];
  if (a.men > forageLimitOf(d, ground, m.population[p]!)) units += d.bigArmyExtraCrossings;
  const snow = snowCover(m.temperature[p]! - 6.5 * heightOfCell(c));
  let hours = tilePace(d, a) * units * across * (1 + d.snowSlowdown * snow) * (m.roadHours?.[p] ?? 1);
  if (riverOfCell(c) && !riverOfCell(m.grid.cell[from]!)) hours += d.riverCrossingDays * 24;
  return hours;
}

function forageLimitOf(d: MarchDefines, g: Ground, population: number): number {
  return (population * 1000 * d.rationsStoredPerPerson * d.foraging[g]) / d.rationsPerSoldier;
}

export interface TilePath {
  /** Tiles after the start, in marching order. */
  tiles: Int32Array;
  /** Hours to reach each tile from the start. */
  hours: Float32Array;
}

/**
 * Fastest walk over tiles from one tile to another (A* on hours, eight ways
 * round), only through provinces marked in `allowed`; null when there is none.
 * `greed` above 1 settles for a nearly fastest walk, found much quicker.
 * The marked provinces are a corridor round a route the province planner
 * found, which keeps the search small enough to run as the player taps.
 */
export function planTilePath(m: TileMarch, from: number, to: number, allowed: Uint8Array, a: MarchingArmy, greed = 1): TilePath | null {
  const { grid } = m;
  const W = grid.width;
  if (from === to || grid.cell[to] === WATER) return null;
  // The search runs inside the box round the corridor, on arrays indexed by tile within it.
  let x0 = W;
  let y0 = grid.height;
  let x1 = -1;
  let y1 = -1;
  for (let p = 0; p < allowed.length; p++) {
    if (!allowed[p] || grid.bounds[p * 4 + 2]! < 0) continue;
    x0 = Math.min(x0, grid.bounds[p * 4]!);
    y0 = Math.min(y0, grid.bounds[p * 4 + 1]!);
    x1 = Math.max(x1, grid.bounds[p * 4 + 2]!);
    y1 = Math.max(y1, grid.bounds[p * 4 + 3]!);
  }
  const inBox = (t: number) => {
    const x = t % W;
    const y = (t - x) / W;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  };
  if (x1 < 0 || !inBox(from) || !inBox(to)) return null;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const s = scratch(bw * bh);
  const local = (t: number) => (Math.floor(t / W) - y0) * bw + (t % W) - x0;
  // The fastest a tile can be crossed, for the estimate: open ground, no snow.
  let cheapest = Infinity;
  for (const g of GROUND_OF) cheapest = Math.min(cheapest, m.d.daysToCross[g]);
  // Above 1, the estimate trades the very fastest way for a much quicker search.
  const minStep = tilePace(m.d, a) * cheapest * greed;
  const tx = to % W;
  const ty = Math.floor(to / W);
  const estimate = (x: number, y: number) => Math.max(Math.abs(x - tx) * m.rowWidth[y]!, Math.abs(y - ty)) * minStep;
  const heap = s.heap;
  heap.size = 0;
  s.g[local(from)] = 0;
  heapPush(heap, estimate(from % W, Math.floor(from / W)), from);
  let found = false;
  while (heap.size) {
    const t = heapPop(heap);
    const lt = local(t);
    if (s.closed[lt]) continue;
    s.closed[lt] = 1;
    if (t === to) {
      found = true;
      break;
    }
    const x = t % W;
    const y = (t - x) / W;
    const base = s.g[lt]!;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < y0 || ny > y1) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        if (nx < x0 || nx > x1) continue;
        const n = ny * W + nx;
        const ln = (ny - y0) * bw + nx - x0;
        if (s.closed[ln]) continue;
        const p = grid.province[n]! - 1;
        if (p < 0 || !allowed[p]) continue;
        const c = base + tileStepHours(m, t, n, a);
        if (c >= s.g[ln]!) continue;
        s.g[ln] = c;
        s.prev[ln] = t;
        heapPush(heap, c + estimate(nx, ny), n);
      }
    }
  }
  let result: TilePath | null = null;
  if (found) {
    const tiles: number[] = [];
    for (let t = to; t !== from; t = s.prev[local(t)]!) tiles.push(t);
    tiles.reverse();
    result = { tiles: Int32Array.from(tiles), hours: Float32Array.from(tiles, (t) => s.g[local(t)]!) };
  }
  s.g.fill(Infinity, 0, bw * bh);
  s.closed.fill(0, 0, bw * bh);
  return result;
}

/**
 * Shortest sail over water tiles from one tile to another (A* on distance,
 * eight ways round), only through tiles of the sea zones marked in `zones`;
 * null when there is none. Fleets sail a zone at a time, so the search spans
 * two zones (feedback 122). With `landCost`, it may cross land at that many
 * times the cost of water: a strait too narrow for the map's tiles.
 */
export function planSeaPath(grid: TileGrid, rowWidth: Float32Array, from: number, to: number, zones: Uint8Array, landCost = 0): Int32Array | null {
  const W = grid.width;
  if (from === to || grid.cell[to] !== WATER) return null;
  let x0 = W;
  let y0 = grid.height;
  let x1 = -1;
  let y1 = -1;
  const widen = (t: number) => {
    const x = t % W;
    const y = (t - x) / W;
    ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
  };
  for (let p = 0; p < zones.length; p++) {
    if (!zones[p] || grid.bounds[p * 4 + 2]! < 0) continue;
    widen(grid.bounds[p * 4 + 1]! * W + grid.bounds[p * 4]!);
    widen(grid.bounds[p * 4 + 3]! * W + grid.bounds[p * 4 + 2]!);
  }
  widen(from);
  widen(to);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const s = scratch(bw * bh);
  const local = (t: number) => (Math.floor(t / W) - y0) * bw + (t % W) - x0;
  const tx = to % W;
  const ty = Math.floor(to / W);
  const estimate = (x: number, y: number) => Math.max(Math.abs(x - tx) * rowWidth[y]!, Math.abs(y - ty));
  const heap = s.heap;
  heap.size = 0;
  s.g[local(from)] = 0;
  heapPush(heap, estimate(from % W, Math.floor(from / W)), from);
  let found = false;
  while (heap.size) {
    const t = heapPop(heap);
    const lt = local(t);
    if (s.closed[lt]) continue;
    s.closed[lt] = 1;
    if (t === to) {
      found = true;
      break;
    }
    const x = t % W;
    const y = (t - x) / W;
    const base = s.g[lt]!;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < y0 || ny > y1) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        if (nx < x0 || nx > x1) continue;
        const n = ny * W + nx;
        const ln = (ny - y0) * bw + nx - x0;
        if (s.closed[ln]) continue;
        const wet = grid.cell[n] === WATER;
        if (!wet && !landCost) continue;
        const z = grid.province[n]! - 1;
        if (wet && n !== to && (z < 0 || !zones[z])) continue;
        const c = base + (dx === 0 ? 1 : dy === 0 ? rowWidth[ny]! : Math.hypot(1, rowWidth[ny]!)) * (wet ? 1 : landCost);
        if (c >= s.g[ln]!) continue;
        s.g[ln] = c;
        s.prev[ln] = t;
        heapPush(heap, c + estimate(nx, ny), n);
      }
    }
  }
  let result: Int32Array | null = null;
  if (found) {
    const tiles: number[] = [];
    for (let t = to; t !== from; t = s.prev[local(t)]!) tiles.push(t);
    result = Int32Array.from(tiles.reverse());
  }
  s.g.fill(Infinity, 0, bw * bh);
  s.closed.fill(0, 0, bw * bh);
  return result;
}

interface Heap {
  cost: Float64Array;
  node: Int32Array;
  size: number;
}

function heapPush(h: Heap, cost: number, node: number): void {
  if (h.size === h.cost.length) {
    const c = new Float64Array(h.size * 2);
    c.set(h.cost);
    h.cost = c;
    const v = new Int32Array(h.size * 2);
    v.set(h.node);
    h.node = v;
  }
  let i = h.size++;
  while (i > 0) {
    const up = (i - 1) >> 1;
    if (h.cost[up]! <= cost) break;
    h.cost[i] = h.cost[up]!;
    h.node[i] = h.node[up]!;
    i = up;
  }
  h.cost[i] = cost;
  h.node[i] = node;
}

function heapPop(h: Heap): number {
  const top = h.node[0]!;
  const cost = h.cost[--h.size]!;
  const node = h.node[h.size]!;
  let i = 0;
  for (;;) {
    const l = i * 2 + 1;
    if (l >= h.size) break;
    const r = l + 1 < h.size && h.cost[l + 1]! < h.cost[l]! ? l + 1 : l;
    if (h.cost[r]! >= cost) break;
    h.cost[i] = h.cost[r]!;
    h.node[i] = h.node[r]!;
    i = r;
  }
  h.cost[i] = cost;
  h.node[i] = node;
  return top;
}

/** Search arrays kept between searches (cleared after each), grown to the largest box searched. */
let scratchArrays: { g: Float32Array; prev: Int32Array; closed: Uint8Array; heap: Heap } | null = null;
function scratch(n: number) {
  if (!scratchArrays || scratchArrays.g.length < n) {
    const size = Math.max(n, 1 << 16);
    scratchArrays = { g: new Float32Array(size).fill(Infinity), prev: new Int32Array(size), closed: new Uint8Array(size), heap: scratchArrays?.heap ?? { cost: new Float64Array(4096), node: new Int32Array(4096), size: 0 } };
  }
  return scratchArrays;
}

/** Marks the provinces of a route and their land neighbours: the corridor a tile path may use. */
export function corridor(map: MarchMap, provinces: readonly number[], into: Uint8Array): Uint8Array {
  into.fill(0);
  for (const p of provinces) {
    into[p] = 1;
    for (let k = map.adjStart[p]!, end = map.adjStart[p + 1]!; k < end; k++) if (map.ground[map.adjList[k]!]) into[map.adjList[k]!] = 1;
  }
  return into;
}
