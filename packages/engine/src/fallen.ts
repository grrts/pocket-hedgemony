import type { World } from "./world.ts";
import { realmConfig } from "./domain/realm/index.ts";

/**
 * The fallen of the last ten years (realm REALM-096, REALM-168, REALM-238):
 * each realm counts its soldiers killed in battles and sieges by month, in a
 * ring of the window's months, so an entry drops out whole once it is ten
 * years old. Many dead push the realm's voices toward peace (peaceShare in
 * war.ts) and slow its recruits' refill (recruit.ts), both read against the
 * realm's recruit ceiling.
 */

const F = realmConfig.fallen;
/** Months in the window: 10 years (windows.fallen). */
export const FALLEN_MONTHS = realmConfig.windows.fallen * 12;

export interface FallenState {
  /** Soldiers killed per realm per month of the window (nation * FALLEN_MONTHS + month % FALLEN_MONTHS). */
  fallenMonths: Float64Array;
  /** The month (year * 12 + month - 1) the ring was last moved to. */
  fallenAt: number;
}

export function createFallenState(N: number): FallenState {
  return { fallenMonths: new Float64Array(N * FALLEN_MONTHS), fallenAt: 0 };
}

const monthIndex = (world: World) => world.date.year * 12 + world.date.month - 1;

/** Moves the ring on to this month, clearing the months that dropped out of the window. */
function moveTo(world: World): number {
  const now = monthIndex(world);
  if (now !== world.fallenAt) {
    const steps = Math.min(FALLEN_MONTHS, Math.max(0, now - world.fallenAt));
    for (let k = 1; k <= steps; k++) {
      const slot = (world.fallenAt + k) % FALLEN_MONTHS;
      for (let n = 0; n < world.nationCount; n++) world.fallenMonths[n * FALLEN_MONTHS + slot] = 0;
    }
    world.fallenAt = now;
  }
  return now % FALLEN_MONTHS;
}

/** Soldiers of realm n killed in a battle or a siege now. */
export function addFallen(world: World, n: number, men: number): void {
  if (n < 0 || !(men > 0)) return;
  const slot = moveTo(world);
  world.fallenMonths[n * FALLEN_MONTHS + slot] = world.fallenMonths[n * FALLEN_MONTHS + slot]! + men;
}

/** Realm n's fallen in the last ten years. */
export function fallenOf(world: World, n: number): number {
  if (n < 0) return 0;
  moveTo(world);
  let t = 0;
  for (let k = 0; k < FALLEN_MONTHS; k++) t += world.fallenMonths[n * FALLEN_MONTHS + k]!;
  return t;
}

/** The fallen against the realm's recruit ceiling: what both effects read. */
function burden(world: World, n: number): number {
  let ceiling = 0;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) ceiling += world.provinceRecruitCeiling[p]!;
  return ceiling > 0 ? fallenOf(world, n) / ceiling : 0;
}

/** What the fallen do to a realm: the share of its voices they add for peace, and its recruits' refill pace (1 = unchanged). */
export interface FallenEffect {
  fallen: number;
  peace: number;
  refill: number;
}

export function fallenEffect(world: World, n: number): FallenEffect {
  const b = burden(world, n);
  return { fallen: fallenOf(world, n), peace: Math.min(F.peace_share_cap, b * F.peace_share_per_ceiling), refill: Math.max(F.refill_floor, 1 - b * F.refill_slow_per_ceiling) };
}

/** The refill pace of every realm, worked out once for the monthly recruits step. */
export function refillPaces(world: World): Float64Array {
  const ceiling = new Float64Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0) ceiling[o] = ceiling[o]! + world.provinceRecruitCeiling[p]!;
  }
  return Float64Array.from(ceiling, (c, n) => (c > 0 ? Math.max(F.refill_floor, 1 - (fallenOf(world, n) / c) * F.refill_slow_per_ceiling) : 1));
}

export interface SavedFallen {
  at: number;
  /** Months with dead, by realm id: [slot, men] pairs. */
  months: Record<string, [number, number][]>;
}

export function saveFallen(world: World): SavedFallen {
  const months: SavedFallen["months"] = {};
  for (let n = 0; n < world.nationCount; n++) {
    const rows: [number, number][] = [];
    for (let k = 0; k < FALLEN_MONTHS; k++) if (world.fallenMonths[n * FALLEN_MONTHS + k]! > 0) rows.push([k, world.fallenMonths[n * FALLEN_MONTHS + k]!]);
    if (rows.length) months[world.nationIds[n]!] = rows;
  }
  return { at: world.fallenAt, months };
}

/** The fallen by realm id; a save from before them counts none. */
export function restoreFallen(world: World, saved: SavedFallen | undefined): void {
  if (!saved) return;
  world.fallenMonths.fill(0);
  world.fallenAt = saved.at;
  for (const [id, rows] of Object.entries(saved.months)) {
    const n = world.nationIndex.get(id);
    if (n !== undefined) for (const [k, men] of rows) world.fallenMonths[n * FALLEN_MONTHS + k] = men;
  }
}
