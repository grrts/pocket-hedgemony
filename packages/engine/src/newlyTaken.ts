import type { World } from "./world.ts";
import { provinceConfig } from "./domain/province/model.ts";

/**
 * Newly taken land (X-29): for `newly_taken.years` after a province is taken
 * from another realm, by a peace or handed over, it holds *Newly taken* (one
 * grievance) and costs its holder `newly_taken.upkeep_share_of_tax` of its tax
 * at the normal rate again each month, on the ledger's New land line: the
 * garrisons and clerks that hold it.
 */

const C = provinceConfig.newly_taken;

export interface NewlyTakenState {
  /** Year each province was last taken from another realm, -1 = held since the start. */
  provinceTakenYear: Int16Array;
}

export function createNewlyTakenState(P: number): NewlyTakenState {
  return { provinceTakenYear: new Int16Array(P).fill(-1) };
}

/** Notes that a province was just taken from another realm (a peace or a demand). */
export function markTaken(world: World, p: number): void {
  world.provinceTakenYear[p] = world.date.year;
}

/** Whether a province is still newly taken. */
export function newlyTaken(world: World, p: number): boolean {
  const y = world.provinceTakenYear[p]!;
  return y >= 0 && world.provinceOwner[p]! >= 0 && world.date.year - y < C.years;
}

/** The year its newly taken years end, for the province card. */
export const takenUntil = (year: number): number => year + C.years;

/** Gold a month that holding a newly taken province costs its owner: a share of its tax at the normal rate. */
export function newLandUpkeep(world: World, p: number): number {
  if (world.provinceTakenYear[p]! < 0 || !newlyTaken(world, p)) return 0;
  const e = world.rules.defines.economy;
  return world.provincePopulation[p]! * e.goldPerThousandPeoplePerMonth * e.taxRateFactor[2]! * C.upkeep_share_of_tax;
}
