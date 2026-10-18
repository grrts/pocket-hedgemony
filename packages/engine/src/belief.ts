import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as cult from "./domain/culture/index.ts";
import * as relg from "./domain/religion/index.ts";
import { realmConfig } from "./domain/realm/index.ts";
import { loyaltyStep } from "./lords.ts";
import { traitPct } from "./rulers.ts";
import * as gov from "./domain/government/index.ts";
import { formOf } from "./government.ts";
import { FAITH_IDS, NO_FAITH as NONE_F, NO_TONGUE as NONE_T, SLOTS, TONGUE_IDS } from "./peoples.ts";

/**
 * Faith and tongue shares at work (realm REALM-065, REALM-066, REALM-238):
 * each month the realm's Faith % and Tongue % are read from its provinces as
 * the Peoples tab reads them. Under `belief.low_percent`, faith risings (or
 * separatist ones, the Homeland cause) start more often; a low faith makes
 * the lords seated among another faith waver each January (in a theocracy,
 * every lord: its bishops and abbots), and a low tongue makes officials'
 * effect grow more slowly (PROV-192).
 */

const B = realmConfig.belief;

export interface BeliefState {
  /** Each realm's Faith % and Tongue %, read each month; -1 before the first reading or with no people. */
  nationFaithPercent: Float32Array;
  nationTonguePercent: Float32Array;
}

export function createBeliefState(N: number): BeliefState {
  return { nationFaithPercent: new Float32Array(N).fill(-1), nationTonguePercent: new Float32Array(N).fill(-1) };
}

/** Reads every realm's Faith % (state faith and faiths layered with it) and Tongue % (kin, cousins half) in one pass. */
export function readBeliefShares(world: World): void {
  const N = world.nationCount;
  const byTongue: Record<string, number>[] = Array.from({ length: N }, () => ({}));
  const byFaith: Record<string, number>[] = Array.from({ length: N }, () => ({}));
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0 || world.provinceWater[p]) continue;
    const people = world.provincePopulation[p]!;
    for (let k = 0; k < SLOTS; k++) {
      const t = world.provinceTongue[p * SLOTS + k]!;
      if (t !== NONE_T) byTongue[o]![TONGUE_IDS[t]!] = (byTongue[o]![TONGUE_IDS[t]!] ?? 0) + people * world.provinceTongueShare[p * SLOTS + k]!;
      const f = world.provinceFaith[p * SLOTS + k]!;
      if (f !== NONE_F) byFaith[o]![FAITH_IDS[f]!] = (byFaith[o]![FAITH_IDS[f]!] ?? 0) + people * world.provinceFaithShare[p * SLOTS + k]!;
    }
  }
  for (let n = 0; n < N; n++) {
    const court = world.nationCourt[n]!;
    const sf = world.nationStateFaith[n]!;
    world.nationTonguePercent[n] = court === NONE_T || !Object.keys(byTongue[n]!).length ? -1 : 100 * cult.tonguePercent(TONGUE_IDS[court]!, byTongue[n]!);
    world.nationFaithPercent[n] = sf === NONE_F || !Object.keys(byFaith[n]!).length ? -1 : 100 * relg.faithPercent(FAITH_IDS[sf]!, byFaith[n]!);
  }
}

/** A realm's Faith % is low: faith risings come more often and lords of other faiths waver. */
export const lowFaith = (world: World, n: number) => n >= 0 && world.nationFaithPercent[n]! >= 0 && world.nationFaithPercent[n]! < B.low_percent;
/** A realm's Tongue % is low: separatists rise more often and officials work more slowly. */
export const lowTongue = (world: World, n: number) => n >= 0 && world.nationTonguePercent[n]! >= 0 && world.nationTonguePercent[n]! < B.low_percent;

/** How much more often a rising of this cause starts in realm n (rebellions' Faith and Homeland causes), with a Pious ruler's faith bonus. */
export function beliefRevoltFactor(world: World, n: number, cause: string): number {
  if (cause === "Faith") return (lowFaith(world, n) ? B.revolt_factor : 1) * Math.max(0, 1 + traitPct(world, n, "faith_revolts_pct") / 100);
  if (cause === "Homeland") return lowTongue(world, n) ? B.revolt_factor : 1;
  return 1;
}

/** The pace an official's years served count at in province p: slower in a realm of a low Tongue % (PROV-192). */
export function officialPace(world: World, p: number): number {
  return lowTongue(world, world.provinceOwner[p]!) ? B.official_slow : 1;
}

/** Lords of realm n who waver for its low faith: in a theocracy every lord (its bishops and abbots), else those seated where another faith holds the most people. */
function wavering(world: World, n: number): number[] {
  const clergy = gov.form(formOf(world, n)).family === "faith";
  const sf = world.nationStateFaith[n]!;
  const out = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) {
    const l = world.provinceLord[p]!;
    if (l < 0 || world.provinceOwner[p] !== n) continue;
    if (clergy || world.provinceFaith[p * SLOTS]! !== sf) out.add(l);
  }
  return [...out];
}

/** The monthly step: shares read; each January the lords of low-faith realms seated among another faith waver (REALM-065). */
export function monthlyBelief(world: World, news: News[]): void {
  readBeliefShares(world);
  if (world.date.month !== 1) return;
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n] || !lowFaith(world, n)) continue;
    for (const l of wavering(world, n)) if (world.lords[l]!.loyalty === "Loyal") loyaltyStep(world, l, "faith_not_shared", news);
  }
}
