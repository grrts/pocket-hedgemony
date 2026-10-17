import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { ungoverned } from "./recruit.ts";
import { moodOf, riseChance, type DecidedMood } from "./domain/province/decided.ts";
import { provinceConfig } from "./domain/province/model.ts";
import { storeMonths } from "./food.ts";
import { OFFICIALS } from "./recruit.ts";

/**
 * Moods (milestone 3): each province holds grievances, and their count sets
 * its mood (province context PROV-230 to PROV-236): calm, grumbling at 2,
 * rioting at 3 (half tax and half recruits; a judge holds riots off one more)
 * and plotting at 4. Grievances start and end with what happens there.
 */

/** The grievances this game tracks so far, one bit each (province §5.22). */
export const GRIEVANCES = ["Hungry", "Conscription", "Soldiers quartered", "Ungoverned", "Foreign rule", "Bloodshed"] as const;
export type GrievanceName = (typeof GRIEVANCES)[number];
const bit = (g: GrievanceName) => 1 << GRIEVANCES.indexOf(g);

export const MOODS: readonly DecidedMood[] = ["calm", "grumbling", "rioting", "plotting"];

export interface MoodState {
  /** Grievances each province holds now (bits of GRIEVANCES). */
  provinceGrievances: Uint16Array;
  /** Months in a row an army has stood in each province (Soldiers quartered after a season). */
  provinceArmyMonths: Uint8Array;
  /** Year of the last battle fought in each province, -1 = none (Bloodshed lasts 20 years). */
  provinceBattleYear: Int16Array;
}

export function createMoodState(P: number): MoodState {
  return { provinceGrievances: new Uint16Array(P), provinceArmyMonths: new Uint8Array(P), provinceBattleYear: new Int16Array(P).fill(-1) };
}

/** Grievance names a province holds. */
export function grievancesOf(world: World, p: number): GrievanceName[] {
  const g = world.provinceGrievances[p]!;
  return GRIEVANCES.filter((_, k) => g & (1 << k));
}

export function grievanceCount(world: World, p: number): number {
  let g = world.provinceGrievances[p]!;
  let n = 0;
  for (; g; g &= g - 1) n++;
  return n;
}

const JUDGE = OFFICIALS.indexOf("Judge");

/** A province's mood (index into MOODS) from its grievances; a judge in his post raises the riot bar by one. */
export function moodIndex(world: World, p: number): number {
  return MOODS.indexOf(moodOf(grievanceCount(world, p), world.provinceOfficial[p] === JUDGE).mood);
}

/** Tax and recruits a rioting or plotting province still gives: half (province PROV-162, PROV-231). */
export function moodShare(world: World, p: number): number {
  return moodIndex(world, p) >= 2 ? provinceConfig.tax.riots_factor : 1;
}

/** Culture of a realm (its name book), or the realm itself when the book has none. */
function cultureKey(world: World, nationId: string): string {
  return world.rules.names?.nations[nationId] ?? nationId;
}

/** Notes a battle in a province, for Bloodshed. */
export function markBattle(world: World, p: number): void {
  if (p >= 0) world.provinceBattleYear[p] = world.date.year;
}

/**
 * The monthly grievance step (province §9, step 6): each grievance starts or
 * ends, then the mood follows. Hunger starts below a month of food and ends
 * above three; conscription starts below a quarter of the recruit pool and
 * ends at half.
 */
export function monthlyMoods(world: World, news: News[]): void {
  const g = provinceConfig.grievances;
  const rc = provinceConfig.recruits;
  const quartered = g.soldiers_quartered_seasons * provinceConfig.months_per_season;
  const here = new Uint8Array(world.provinceCount);
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i]) here[a.location[i]!] = 1;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const owner = world.provinceOwner[p]!;
    world.provinceArmyMonths[p] = here[p] ? Math.min(255, world.provinceArmyMonths[p]! + 1) : 0;
    if (owner < 0) {
      world.provinceGrievances[p] = 0;
      continue;
    }
    const had = world.provinceGrievances[p]!;
    const has = (x: GrievanceName) => (had & bit(x)) !== 0;
    let now = 0;
    const months = storeMonths(world, p);
    if (months < g.hungry.starts_below_months || (has("Hungry") && months <= g.hungry.ends_above_months)) now |= bit("Hungry");
    const ceiling = world.provinceRecruitCeiling[p]!;
    const share = ceiling > 0 ? world.provinceRecruits[p]! / ceiling : 1;
    if (share < rc.conscription_below || (has("Conscription") && share < rc.conscription_ends_at)) now |= bit("Conscription");
    if (world.provinceArmyMonths[p]! > quartered) now |= bit("Soldiers quartered");
    if (ungoverned(world, p)) now |= bit("Ungoverned");
    const first = world.rules.provinces[p]!.owner;
    if (first && cultureKey(world, first) !== cultureKey(world, world.nationIds[owner]!)) now |= bit("Foreign rule");
    const battle = world.provinceBattleYear[p]!;
    if (battle >= 0 && world.date.year - battle < g.bloodshed_years) now |= bit("Bloodshed");
    const before = MOODS.indexOf(moodOf(grievanceCount(world, p), world.provinceOfficial[p] === JUDGE).mood);
    world.provinceGrievances[p] = now;
    const after = moodIndex(world, p);
    if (owner === world.player && after >= 2 && after > before) {
      const name = world.rules.provinces[p]!.name;
      news.push({ kind: "unrest", text: after === 3 ? `${name} is plotting a rising: ${grievancesOf(world, p).join(", ").toLowerCase()}` : `Riots in ${name}: ${grievancesOf(world, p).join(", ").toLowerCase()}`, nations: [owner], province: p });
    }
  }
}

/** Monthly chance a plotting province would rise (shown on the card; rebels rising is the rebellions milestone). */
export function risingChance(world: World, p: number): number {
  return riseChance(grievanceCount(world, p));
}
