import type { World } from "./world.ts";
import { realmConfig } from "./domain/realm/index.ts";
import { takePeople } from "./living.ts";

/**
 * The fallen of the last ten years (realm REALM-096, REALM-168, REALM-237):
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
  /** Each realm's sum over the ring, kept as months are added and dropped. */
  fallenTotal: Float64Array;
}

export function createFallenState(N: number): FallenState {
  return { fallenMonths: new Float64Array(N * FALLEN_MONTHS), fallenAt: 0, fallenTotal: new Float64Array(N) };
}

const monthIndex = (world: World) => world.date.year * 12 + world.date.month - 1;

/** Moves the ring on to this month, clearing the months that dropped out of the window. */
function moveTo(world: World): number {
  const now = monthIndex(world);
  if (now !== world.fallenAt) {
    const steps = Math.min(FALLEN_MONTHS, Math.max(0, now - world.fallenAt));
    for (let k = 1; k <= steps; k++) {
      const slot = (world.fallenAt + k) % FALLEN_MONTHS;
      for (let n = 0; n < world.nationCount; n++) {
        const i = n * FALLEN_MONTHS + slot;
        if (world.fallenMonths[i]) (world.fallenTotal[n] = Math.max(0, world.fallenTotal[n]! - world.fallenMonths[i]!)), (world.fallenMonths[i] = 0);
      }
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
  world.fallenTotal[n] = world.fallenTotal[n]! + men;
}

/**
 * Men of an army dead in a battle, a siege or a storm, or of hunger: they count among their realm's
 * fallen and are taken from the people of the province they were levied from (WAR-226); a hired
 * company's men are nobody's people here.
 */
export function armyDead(world: World, slot: number, men: number): void {
  if (!(men > 0)) return;
  addFallen(world, world.armies.owner[slot]!, men);
  const home = world.armies.home[slot]!;
  if (home >= 0) takePeople(world, home, men);
}

/** A castle garrison's dead: its realm's fallen, taken from the people of the garrison's own province (WAR-226). */
export function garrisonDead(world: World, n: number, p: number, men: number): void {
  if (!(men > 0)) return;
  addFallen(world, n, men);
  takePeople(world, p, men);
}

/** Realm n's fallen in the last ten years. */
export function fallenOf(world: World, n: number): number {
  if (n < 0) return 0;
  moveTo(world);
  return world.fallenTotal[n]!;
}

/** The fallen against the realm's recruit ceiling: what both effects read. */
function burden(world: World, n: number): number {
  if (!(fallenOf(world, n) > 0)) return 0;
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
  moveTo(world);
  const paces = new Float64Array(world.nationCount).fill(1);
  if (!world.fallenTotal.some((t) => t > 0)) return paces;
  const ceiling = new Float64Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0) ceiling[o] = ceiling[o]! + world.provinceRecruitCeiling[p]!;
  }
  for (let n = 0; n < world.nationCount; n++) if (ceiling[n]! > 0 && world.fallenTotal[n]! > 0) paces[n] = Math.max(F.refill_floor, 1 - (world.fallenTotal[n]! / ceiling[n]!) * F.refill_slow_per_ceiling);
  return paces;
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
  world.fallenTotal.fill(0);
  world.fallenAt = saved.at;
  for (const [id, rows] of Object.entries(saved.months)) {
    const n = world.nationIndex.get(id);
    if (n !== undefined) for (const [k, men] of rows) (world.fallenMonths[n * FALLEN_MONTHS + k] = men), (world.fallenTotal[n] = world.fallenTotal[n]! + men);
  }
}
