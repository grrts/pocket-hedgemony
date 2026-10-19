import type { World } from "./world.ts";
import { provinceConfig } from "./domain/province/model.ts";

/**
 * Far from the throne (PROV-173, PROV-174, X-28): each province's days to its
 * realm's capital, over the realm's own land and the sea. A royal province
 * more than `far_from_throne.days` away has the grievance and sends the crown
 * less tax and fewer recruits, the further the less; a lord's province is run
 * from his own seat and is never far.
 */

const F = provinceConfig.far_from_throne;
/** Days at which the cut is at its most: further, or out of reach over the realm's land and the sea, reads this. */
export const FAR_CAP = Math.min(255, Math.ceil(F.days + (10 * (1 - F.least_share)) / F.cut_per_10_days));

export interface ThroneState {
  /** Days from each province to its owner's capital, at most FAR_CAP. */
  provinceDaysToCapital: Uint8Array;
  /** A key per realm of the land it held when its days were last worked out; derived, so not saved (empty = work them all out). */
  throneKeys: Uint32Array;
}

export function createThroneState(P: number): ThroneState {
  return { provinceDaysToCapital: new Uint8Array(P), throneKeys: new Uint32Array(0) };
}

/** A realm's seat of rule: its capital while it holds it, else its most populous province (the court moves); -1 with no land. */
export function seatOf(world: World, n: number): number {
  const c = world.provinceIndex.get(world.rules.nations[n]!.capital);
  if (c !== undefined && world.provinceOwner[c] === n) return c;
  let best = -1;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !world.provinceWater[p] && (best < 0 || world.provincePopulation[p]! > world.provincePopulation[best]!)) best = p;
  return best;
}

// Scratch for the walk, sized to the map on first use: a province's days are this walk's while its stamp is.
let dist = new Float32Array(0);
let stamp = new Int32Array(0);
let walk = 0;
let heap = new Int32Array(0);
let heapKey = new Float32Array(0);

/** Days to enter province q from p: the march's crossing of both grounds and a river, or a sea zone's days. */
function stepDays(world: World, p: number, q: number): number {
  if (world.provinceWater[q] || world.provinceWater[p]) return F.sea_zone_days;
  const d = world.rules.defines.march;
  const gp = world.provinceGround[p];
  const gq = world.provinceGround[q];
  if (!gp || !gq) return Infinity;
  return ((d.daysToCross[gp] + d.daysToCross[gq]) / 2) * d.daysPerCrossing + (world.provinceRiver[q] ? d.riverCrossingDays : 0);
}

function push(p: number, k: number, size: number): void {
  if (size >= heap.length) {
    const h = new Int32Array(heap.length * 2 + 64);
    h.set(heap);
    heap = h;
    const hk = new Float32Array(h.length);
    hk.set(heapKey);
    heapKey = hk;
  }
  let i = size;
  while (i > 0) {
    const up = (i - 1) >> 1;
    if (heapKey[up]! <= k) break;
    heap[i] = heap[up]!;
    heapKey[i] = heapKey[up]!;
    i = up;
  }
  heap[i] = p;
  heapKey[i] = k;
}

/** Removes the heap's top; size is the size before. */
function popTop(size: number): void {
  const p = heap[size - 1]!;
  const k = heapKey[size - 1]!;
  const n = size - 1;
  let i = 0;
  for (;;) {
    let c = 2 * i + 1;
    if (c >= n) break;
    if (c + 1 < n && heapKey[c + 1]! < heapKey[c]!) c++;
    if (heapKey[c]! >= k) break;
    heap[i] = heap[c]!;
    heapKey[i] = heapKey[c]!;
    i = c;
  }
  heap[i] = p;
  heapKey[i] = k;
}

/**
 * Days from realm n's seat to each of its provinces (Dijkstra over its own land and every sea zone),
 * written into provinceDaysToCapital. The walk stops at FAR_CAP days, where the cut is at its most;
 * the realm's provinces must already read FAR_CAP (allThroneDays sets them).
 */
function walkFrom(world: World, n: number): void {
  const seat = seatOf(world, n);
  if (seat < 0) return;
  const out = world.provinceDaysToCapital;
  walk++;
  dist[seat] = 0;
  stamp[seat] = walk;
  let size = 0;
  push(seat, 0, size++);
  while (size > 0) {
    const k = heapKey[0]!;
    const p = heap[0]!;
    popTop(size--);
    if (k > dist[p]!) continue;
    if (world.provinceOwner[p] === n) out[p] = Math.round(k);
    for (let e = world.adjStart[p]!, end = world.adjStart[p + 1]!; e < end; e++) {
      const q = world.adjList[e]!;
      if (!world.provinceWater[q] && world.provinceOwner[q] !== n) continue;
      const nd = k + stepDays(world, p, q);
      if (nd >= FAR_CAP || (stamp[q] === walk && nd >= dist[q]!)) continue;
      stamp[q] = walk;
      dist[q] = nd;
      push(q, nd, size++);
    }
  }
}

/** Days from every owned province to its realm's seat (on load, and the first time). */
export function allThroneDays(world: World): void {
  const P = world.provinceCount;
  if (dist.length < P) ((dist = new Float32Array(P)), (stamp = new Int32Array(P)), (walk = 0));
  const out = world.provinceDaysToCapital;
  const landed = new Uint8Array(world.nationCount);
  for (let p = 0; p < P; p++) {
    const o = world.provinceOwner[p]!;
    out[p] = o >= 0 ? FAR_CAP : 0;
    if (o >= 0) landed[o] = 1;
  }
  for (let n = 0; n < world.nationCount; n++) if (landed[n]) walkFrom(world, n);
}

/**
 * Works the days out again for each realm whose land has changed since the last time (the monthly
 * step): a key per realm of the provinces it holds says which; the rest keep theirs.
 */
export function monthlyThrone(world: World): void {
  const N = world.nationCount;
  const P = world.provinceCount;
  const keys = new Uint32Array(N);
  for (let p = 0; p < P; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0) keys[o] = (keys[o]! + Math.imul(p + 1, 2654435761)) >>> 0;
  }
  const old = world.throneKeys;
  world.throneKeys = keys;
  if (old.length !== N) return allThroneDays(world);
  const changed = new Uint8Array(N);
  let any = false;
  for (let n = 0; n < N; n++) if (keys[n] !== old[n]) ((changed[n] = 1), (any = true));
  if (!any) return;
  if (dist.length < P) ((dist = new Float32Array(P)), (stamp = new Int32Array(P)), (walk = 0));
  const out = world.provinceDaysToCapital;
  for (let p = 0; p < P; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0) out[p] = 0;
    else if (changed[o]) out[p] = FAR_CAP;
  }
  for (let n = 0; n < N; n++) if (changed[n]) walkFrom(world, n);
}

/** Whether a province has Far from the throne: royal land further from the capital than `far_from_throne.days` (PROV-174, X-28). */
export function farFromThrone(world: World, p: number): boolean {
  return world.provinceOwner[p]! >= 0 && world.provinceLord[p]! < 0 && world.provinceDaysToCapital[p]! > F.days;
}

/** Share of its tax and recruits a province sends the crown for its distance: 1 near, `cut_per_10_days` less each 10 days beyond, at least `least_share`. */
export function throneShare(world: World, p: number): number {
  return farFromThrone(world, p) ? shareAtDays(world.provinceDaysToCapital[p]!) : 1;
}

/** The share at so many days from the capital, for royal land (the client's province card reads it too). */
export function shareAtDays(days: number): number {
  return days <= F.days ? 1 : Math.max(F.least_share, 1 - ((days - F.days) / 10) * F.cut_per_10_days);
}

/** The rule's numbers, for the province card. */
export const THRONE = { days: F.days, farCap: FAR_CAP } as const;
