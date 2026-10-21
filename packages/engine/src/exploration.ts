import * as nv from "./domain/naval/index.ts";
import * as ex from "./domain/exploration/index.ts";
import { catalogueRecord, hasRecord } from "./domain/scenario-setup/catalogue.ts";
import type { World } from "./world.ts";
import { knows } from "./research.ts";

/**
 * What each realm has charted, and who may explore (domain/exploration/spec.md):
 * one bit per province and sea zone per realm, grown by its ships and armies
 * and never shrunk, and the exploration unlock from research and the age
 * gate. The voyages, governors and colonies built on it are in colonies.ts.
 */

const CFG = ex.explorationConfig;

export interface Voyage {
  fleet: number;
  /** *Carry on* past the point of no return, else *Turn back* (EXPL-020, EXPL-021). */
  carryOn: boolean;
  turnedBack: boolean;
  /** Places charted on the way. */
  charted: number;
}

export interface ColonialGovernor {
  id: number;
  owner: number;
  name: string;
  age: number;
  /** The port he waits in, -1 when aboard or ashore. */
  port: number;
  /** The fleet he is aboard (its id), -1 = none. */
  fleet: number;
  /** The colony he is founding (its province), -1 = none. */
  colony: number;
  /** Taken back aboard from an abandoned colony: his slot frees when he is home (EXPL-049). */
  homeward: boolean;
}

export interface ColonyFounding {
  province: number;
  owner: number;
  governor: number;
  progress: number;
  aggression: ex.AggressionLevel;
  /** Colony food, in rations. */
  food: number;
  /** Progress made last month, for the card's "a month" figure. */
  lastChange: number;
  /** Founded on land a tribe gave up: with the consent of the local people (TRIBE-024). */
  consent?: boolean;
}

export interface ExplorationState {
  /** Charted bits, realm by realm: `stride` bytes each. */
  charted: Uint8Array;
  stride: number;
  /** Each realm's macro region for the age gate. */
  region: string[];
  voyages: Voyage[];
  governors: ColonialGovernor[];
  colonies: ColonyFounding[];
  /** The realm that founded each province as its colony, -1 = none. */
  founded: Int16Array;
  seq: number;
  /** Where each fleet last charted from (fleet id → province), so a fleet lying still charts nothing more. */
  lastAt: Map<number, number>;
}

export function createExplorationState(P: number, N: number): ExplorationState {
  const stride = Math.ceil(P / 8);
  return { charted: new Uint8Array(stride * N), stride, region: [], voyages: [], governors: [], colonies: [], founded: new Int16Array(P).fill(-1), seq: 0, lastAt: new Map() };
}

// ---------------------------------------------------------------- the charted map

export const isCharted = (world: World, n: number, p: number): boolean => n < 0 || (world.explore.charted[n * world.explore.stride + (p >> 3)]! & (1 << (p & 7))) !== 0;

/** Charts a place for realm n; true when it was new (EXPL-014: there is no way back). */
export function chart(world: World, n: number, p: number): boolean {
  const k = n * world.explore.stride + (p >> 3);
  const bit = 1 << (p & 7);
  const c = world.explore.charted;
  if (c[k]! & bit) return false;
  c[k] = c[k]! | bit;
  return true;
}

/** A ship or an army stands at p: chart it and every place next to it (EXPL-012, EXPL-013). Returns how many were new. */
export function chartAround(world: World, n: number, p: number): number {
  let added = chart(world, n, p) ? 1 : 0;
  for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) if (chart(world, n, world.adjList[k]!)) added++;
  return added;
}

/** The realm's charted map as bits over provinces (a copy, for the player's map). */
export function chartedBits(world: World, n: number): Uint8Array {
  const s = world.explore.stride;
  return n < 0 ? new Uint8Array(s).fill(255) : world.explore.charted.slice(n * s, (n + 1) * s);
}

/**
 * The 1444 charts (EXPL-011): every province within 6 land steps of a realm's
 * lands, and every sea zone touching them.
 */
export function seedCharts(world: World): void {
  const P = world.provinceCount;
  const dist = new Int16Array(P);
  const queue = new Int32Array(P);
  const reach = CFG.start_charted_reach;
  const lands: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < P; p++) if (world.provinceOwner[p]! >= 0 && !world.provinceWater[p]) lands[world.provinceOwner[p]!]!.push(p);
  for (let n = 0; n < world.nationCount; n++) {
    dist.fill(-1);
    let tail = 0;
    for (const p of lands[n]!) ((dist[p] = 0), (queue[tail++] = p));
    for (let h = 0; h < tail; h++) {
      const p = queue[h]!;
      chart(world, n, p);
      for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
        const q = world.adjList[k]!;
        if (world.provinceWater[q]) chart(world, n, q);
        else if (dist[q]! < 0 && dist[p]! < reach) ((dist[q] = dist[p]! + 1), (queue[tail++] = q));
      }
    }
  }
}

/** Each step: every fleet that came to a new place charts around it (EXPL-012, EXPL-013); its voyage counts what it found. */
export function chartFleets(world: World): void {
  const e = world.explore;
  for (const f of world.navy.fleets) {
    if (e.lastAt.get(f.id) === f.at) continue;
    e.lastAt.set(f.id, f.at);
    let added = chartAround(world, f.owner, f.at);
    // A viceroy's fleet charts a ring of zones further (NAVY-154).
    const rings = f.admiral >= 0 ? (nv.postRow(f.post).chartRings ?? 1) : 1;
    if (rings > 1) for (let k = world.adjStart[f.at]!; k < world.adjStart[f.at + 1]!; k++) if (world.provinceWater[world.adjList[k]!]) added += chartAround(world, f.owner, world.adjList[k]!);
    if (added) {
      const v = e.voyages.find((x) => x.fleet === f.id);
      if (v) v.charted += added;
    }
  }
  if (e.lastAt.size > world.navy.fleets.length * 2 + 16) for (const id of [...e.lastAt.keys()]) if (!world.navy.fleets.some((f) => f.id === id)) e.lastAt.delete(id);
}

/** Each day: every army charts what is next to it (EXPL-013). */
export function chartArmies(world: World): void {
  const a = world.armies;
  // Charting never comes undone (EXPL-014), so an army still where its realm last charted from charts nothing new, as a fleet lying still.
  let last = chartedFrom.get(world);
  if (!last || last.length !== a.alive.length) chartedFrom.set(world, (last = new Float64Array(a.alive.length).fill(-1)));
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const at = a.owner[i]! * world.provinceCount + a.location[i]!;
    if (last[i] === at) continue;
    last[i] = at;
    chartAround(world, a.owner[i]!, a.location[i]!);
  }
}
/** Where each army slot last charted from, as realm × provinces + province; not saved, so a loaded game charts once again. */
const chartedFrom = new WeakMap<World, Float64Array>();

// ---------------------------------------------------------------- the exploration unlock

/** Each realm's macro region (EXPL-075): the event tree's 1444 polity list, else the catalogue's region group. */
export function seedRegions(world: World): void {
  const groups = Object.entries(CFG.game.catalogue_regions);
  world.explore.region = world.nationIds.map((id) => {
    const polity = ex.polityRegion(id);
    if (polity) return polity;
    if (!hasRecord(id)) return CFG.game.fallback_region;
    const group = catalogueRecord(id).region;
    return groups.find(([prefix]) => group.startsWith(prefix))?.[1] ?? CFG.game.fallback_region;
  });
}

/**
 * Whether the age that opens exploration in a region has begun (EXPL-002, EXPL-004):
 * the event tree's own age when it runs, which starts by its conditions (EXPL-076),
 * else the age's forced start year.
 */
export function ageGateOpen(region: string, year: number, world?: World): boolean {
  const age = ex.gateAgeFor(region);
  if (!age) return false;
  const s = world?.events?.state;
  if (s) return s.world.ages.includes(age) || s.agesEnded.includes(age);
  const start = ex.regionData.ages[age]?.force_start;
  return start !== null && start !== undefined && year >= start;
}

/** Outrigger voyaging or Carrack and caravel known, and the age begun in the realm's region (EXPL-001, D-EXPL-4). */
export function explorationUnlocked(world: World, n: number): boolean {
  if (n < 0) return false;
  return CFG.unlock_inventions.some((i) => knows(world, n, i)) && ageGateOpen(world.explore.region[n] ?? CFG.game.fallback_region, world.date.year, world);
}

/** Why realm n may not have exploration ships yet, or null. */
export function whyNoExploration(world: World, n: number): string | null {
  if (explorationUnlocked(world, n)) return null;
  if (!CFG.unlock_inventions.some((i) => knows(world, n, i))) return null;
  return "the Age of Exploration has not reached your lands";
}

/** Research a realm knows, as the exploration library reads it. */
export function knownSet(world: World, n: number): Set<string> {
  const out = new Set<string>();
  for (const id of [CFG.colonial_unlock_invention, CFG.s3_invention, "S4", "S1", "T8", "T9"]) if (knows(world, n, id)) out.add(id);
  return out;
}
