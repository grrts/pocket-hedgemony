/**
 * The charted map (design §3.1): one bit per land province and sea zone per
 * country (EXPL-055), grown by exploration ships, armies and fleets, never
 * shrunk (INV-EXPL-1), with the parchment over the rest.
 */
import type { ProvinceDef } from "@ph/rules";
import { isWater, type MapGraph } from "../world-map/index.ts";
import { explorationConfig as cfg } from "./config.ts";

export interface ChartedMap {
  /** Place id → bit index; the same for every country on one map. */
  index: ReadonlyMap<string, number>;
  bits: Uint8Array;
}

/** A bit index over every place of a map. */
export function placeIndex(g: MapGraph): Map<string, number> {
  return new Map(g.places.map((p, i) => [p.id, i]));
}

/** An empty charted map: everything under the parchment. */
export function newChartedMap(index: ReadonlyMap<string, number>): ChartedMap {
  return { index, bits: new Uint8Array(Math.ceil(index.size / 8)) };
}

export function isCharted(m: ChartedMap, id: string): boolean {
  const i = m.index.get(id);
  return i !== undefined && (m.bits[i >> 3]! & (1 << (i & 7))) !== 0;
}

/** Charts a place. There is no way to uncharted it (EXPL-014). */
export function chart(m: ChartedMap, id: string): boolean {
  const i = m.index.get(id);
  if (i === undefined) throw new Error(`unknown place ${id}`);
  const was = isCharted(m, id);
  m.bits[i >> 3]! |= 1 << (i & 7);
  return !was;
}

/** Under the parchment: what the country has not charted (EXPL-015). */
export function underParchment(m: ChartedMap, id: string): boolean {
  return !isCharted(m, id);
}

export function chartedCount(m: ChartedMap): number {
  let n = 0;
  for (const b of m.bits) for (let x = b; x; x &= x - 1) n++;
  return n;
}

const placeOf = (g: MapGraph, id: string): ProvinceDef => {
  const p = g.byId.get(id);
  if (!p) throw new Error(`unknown place ${id}`);
  return p;
};

/** Land steps from a country's lands: 0 for its own provinces, counted over land borders. */
export function landSteps(g: MapGraph, owner: string, max: number): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier = g.places.filter((p) => p.owner === owner && !isWater(p)).map((p) => p.id);
  for (const id of frontier) dist.set(id, 0);
  for (let d = 1; d <= max && frontier.length; d++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const n of placeOf(g, id).neighbors) {
        const q = g.byId.get(n);
        if (!q || isWater(q) || dist.has(n)) continue;
        dist.set(n, d);
        next.push(n);
      }
    frontier = next;
  }
  return dist;
}

/**
 * The start: every province within `reach` steps of the country's lands, plus
 * every sea zone touching them (EXPL-011, INV-EXPL-2). Steps are counted over
 * land borders (OQ-EXPL-16).
 */
export function startChartedMap(g: MapGraph, owner: string, index: ReadonlyMap<string, number> = placeIndex(g), reach: number = cfg.start_charted_reach): ChartedMap {
  const m = newChartedMap(index);
  for (const id of landSteps(g, owner, reach).keys()) {
    chart(m, id);
    for (const n of placeOf(g, id).neighbors) {
      const q = g.byId.get(n);
      if (q && isWater(q)) chart(m, n);
    }
  }
  return m;
}

/** An exploration ship enters a zone: chart it and every zone and coastal province next to it (EXPL-012). */
export function chartOnEntering(m: ChartedMap, g: MapGraph, zone: string): string[] {
  const out: string[] = [];
  if (chart(m, zone)) out.push(zone);
  for (const n of placeOf(g, zone).neighbors) {
    const q = g.byId.get(n);
    if (!q) continue;
    if (isWater(q) || q.coastal !== false) if (chart(m, n)) out.push(n);
  }
  return out;
}

/** An army or any fleet stands somewhere: chart it and what is next to it (EXPL-013). */
export function chartAround(m: ChartedMap, g: MapGraph, at: string): string[] {
  const out: string[] = [];
  if (chart(m, at)) out.push(at);
  for (const n of placeOf(g, at).neighbors) if (g.byId.has(n) && chart(m, n)) out.push(n);
  return out;
}

/** What a newly charted land shows: its terrain, its owner if any and its ports, nothing else (EXPL-023). */
export function newlyChartedView(p: ProvinceDef, ports: readonly string[]): { terrain: string; owner: string | null; ports: string[] } {
  return { terrain: p.terrain, owner: p.owner, ports: [...ports] };
}

// ---------------------------------------------------------------------------
// Routes for fleets (EXPL-016)

/** Only a fleet of nothing but exploration ships may enter an uncharted zone (INV-EXPL-3). */
export function mayEnterUncharted(ships: readonly string[]): boolean {
  return ships.length > 0 && ships.every((s) => Object.hasOwn(cfg.naval.exploration_ships, s));
}

/**
 * Shortest route of water places from one zone to another. Fleets that are not
 * all exploration ships keep to charted zones. Null when there is none.
 */
export function planFleetRoute(g: MapGraph, m: ChartedMap, ships: readonly string[], from: string, to: string): string[] | null {
  const free = mayEnterUncharted(ships);
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (at === to) break;
    for (const n of placeOf(g, at).neighbors) {
      const q = g.byId.get(n);
      if (!q || !isWater(q) || prev.has(n)) continue;
      if (!free && !isCharted(m, n)) continue;
      prev.set(n, at);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let at: string | null = to; at !== null; at = prev.get(at) ?? null) path.unshift(at);
  return path;
}
