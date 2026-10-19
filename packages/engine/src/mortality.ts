import { realmConfig } from "./domain/realm/index.ts";

/**
 * One age table for every person the game names (REALM-270): the chance a
 * year that someone of this age dies, times his kind's `death_mult`. Kept on
 * its own so rulers.ts and people.ts both read it without importing each other.
 */

export const PEOPLE = realmConfig.people;
export type PersonKind = keyof typeof PEOPLE.kinds;

/** The yearly chance a person of this age and kind dies (`people.death_per_year`, `people.kinds.<kind>.death_mult`). */
export function deathChance(age: number, kind: PersonKind = "ruler"): number {
  const table = PEOPLE.death_per_year;
  const base = table.find(([under]) => age < under!)?.[1] ?? table[table.length - 1]![1]!;
  return base * PEOPLE.kinds[kind].death_mult;
}

/** A whole number in [lo, hi] from a hash, so ages drawn for the same person always agree. */
export const ageFrom = (hash: number, [lo, hi]: readonly number[]): number => lo! + (hash % (hi! - lo! + 1));
