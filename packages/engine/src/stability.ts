import type { World } from "./world.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { stepName } from "./domain/subjects/index.ts";
import { bondOf } from "./subjects.ts";
import { moodIndex } from "./moods.ts";
import { realmConfig } from "./domain/realm/index.ts";

const cfg = realmConfig.stability;

/**
 * Stability (realm REALM-199 to REALM-202, F-75): not a stored number but a
 * reading of the realm's pillars, lords, subjects, officials and
 * provinces, and since X-28 its treasury. Each pillar takes one of four steps, and the realm stands as
 * steady as its weakest pillar.
 */

export type StabilityStep = "Steady" | "Uneasy" | "Troubled" | "Crumbling";
export const STABILITY = cfg.steps as readonly StabilityStep[];

export interface StabilityPillar {
  key: "lords" | "subjects" | "officials" | "provinces" | "treasury";
  /** Index into STABILITY. */
  step: number;
  /** Counts the pillar's line is made of, e.g. lords by loyalty or provinces by mood. */
  counts: Record<string, number>;
}

export interface Stability {
  /** Index into STABILITY: the weakest pillar's step. */
  step: number;
  pillars: StabilityPillar[];
}

const LOYALTY = ["Loyal", "Wavering", "Disloyal", "In revolt"];

/** Lords or subjects by loyalty: In revolt crumbling, Disloyal troubled, under half Loyal uneasy (REALM-200). */
function loyaltyStep(c: Record<string, number>): number {
  const all = LOYALTY.reduce((t, l) => t + c[l]!, 0);
  if (c["In revolt"]) return 3;
  if (c["Disloyal"]) return 2;
  return all && c["Loyal"]! < all * cfg.loyal_share_for_steady ? 1 : 0;
}

const byLoyalty = (list: string[]) => Object.fromEntries(LOYALTY.map((l) => [l, list.filter((x) => x === l).length]));

/** A subject's loyalty from its bond, counted each season (SUBJ-030). */
export function subjectLoyalty(world: World, subject: number): string {
  const b = bondOf(world, subject);
  return b ? stepName(b.loyalty) : "Loyal";
}

/** What a realm's officials and provinces pillars are read from (REALM-201, REALM-202). */
interface LandCounts {
  posts: number;
  empty: number;
  all: number;
  /** Provinces by mood: calm, grumbling, rioting, plotting. */
  moods: number[];
}

const DEFAULT = realmConfig.debt.default;

/**
 * The treasury pillar (X-28): Troubled for `debt.default.troubled_years` after a default, Uneasy
 * while the realm is broke and heading for one, else Steady. Counts: the default's year (-1 none),
 * the year it stops weighing, and the monthly steps left before a default (0 when not broke).
 */
function treasuryPillar(world: World, n: number): StabilityPillar {
  const y = world.nationDefaultYear[n]!;
  const weighs = y >= 0 && world.date.year - y < DEFAULT.troubled_years;
  const broke = world.nationBrokeMonths[n]!;
  const left = broke > 0 ? Math.max(1, DEFAULT.broke_months - broke) : 0;
  return { key: "treasury", step: weighs ? 2 : broke > 0 ? 1 : 0, counts: { defaulted: weighs ? y : -1, until: weighs ? y + DEFAULT.troubled_years : -1, monthsLeft: left } };
}

/** The pillars from the counts, and the realm's step: its weakest pillar (REALM-199). */
function reading(lords: Record<string, number>, subjects: Record<string, number>, c: LandCounts, treasury: StabilityPillar): Stability {
  const { posts, empty, all, moods } = c;
  // Empty posts: none steady, up to a quarter uneasy, up to half troubled, more crumbling (REALM-201).
  const e = cfg.empty_posts_share;
  const officialsStep = !empty ? 0 : empty <= posts * e.uneasy_up_to ? 1 : empty <= posts * e.troubled_up_to ? 2 : 3;
  // Rioting or plotting: none steady, any rioting uneasy, any plotting or a tenth troubled, a quarter crumbling (REALM-202).
  const restless = moods[2]! + moods[3]!;
  const r = cfg.restless_share;
  const provincesStep = !restless ? 0 : restless >= all * r.crumbling_from ? 3 : moods[3]! || restless >= all * r.troubled_from ? 2 : 1;

  const pillars: StabilityPillar[] = [
    { key: "lords", step: loyaltyStep(lords), counts: lords },
    { key: "subjects", step: loyaltyStep(subjects), counts: subjects },
    { key: "officials", step: officialsStep, counts: { posts, empty } },
    { key: "provinces", step: provincesStep, counts: { all, calm: moods[0]!, grumbling: moods[1]!, rioting: moods[2]!, plotting: moods[3]! } },
    treasury,
  ];
  return { step: Math.max(...pillars.map((q) => q.step)), pillars };
}

function subjectsByLoyalty(world: World, n: number): Record<string, number> {
  const subjectIds = new Set(dip.relations.subjectsOf(world.diplomacy.graph, world.nationIds[n]!));
  const subjectList: string[] = [];
  if (subjectIds.size) world.nationIds.forEach((id, k) => subjectIds.has(id) && subjectList.push(subjectLoyalty(world, k)));
  return byLoyalty(subjectList);
}

/** The realm's stability from its lords, subjects, officials and provinces (REALM-199). */
export function stabilityOf(world: World, n: number): Stability {
  const landed = new Set(world.provinceLord);
  const lords = byLoyalty(world.lords.filter((l, k) => l.nation === n && landed.has(k)).map((l) => l.loyalty));
  // Royal provinces each need an official at his post (REALM-064); a lord's are run by his own.
  const c: LandCounts = { posts: 0, empty: 0, all: 0, moods: [0, 0, 0, 0] };
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n) continue;
    c.all++;
    c.moods[moodIndex(world, p)]!++;
    if (world.provinceLord[p]! >= 0) continue;
    c.posts++;
    if (world.provinceOfficial[p]! < 0) c.empty++;
  }
  return reading(lords, subjectsByLoyalty(world, n), c, treasuryPillar(world, n));
}

// ------------------------------------------------------------ what stability costs (X-28)

export interface StabilityState {
  /** Each realm's stability step (index into STABILITY), read in the monthly step; derived, so not saved. */
  nationStability: Uint8Array;
}

export function createStabilityState(N: number): StabilityState {
  return { nationStability: new Uint8Array(N) };
}

/** What a step costs: the share of tax and recruits the realm still collects, and how much likelier its plotting provinces rise (`stability.effects`). */
export interface StabilityEffect {
  tax: number;
  recruits: number;
  rising: number;
}

export const STABILITY_EFFECTS: readonly StabilityEffect[] = STABILITY.map((step) => (cfg.effects as unknown as Record<string, StabilityEffect>)[step] ?? { tax: 1, recruits: 1, rising: 1 });

/** The effect of realm n's stability as last read; none for no realm. */
export function stabilityEffect(world: World, n: number): StabilityEffect {
  return STABILITY_EFFECTS[n >= 0 ? world.nationStability[n]! : 0]!;
}

/** A loyalty pillar's step from its counts by LOYALTY (REALM-200), as loyaltyStep reads it. */
function loyaltyStepOf(c: Int32Array, at: number): number {
  if (c[at + 3]) return 3;
  if (c[at + 2]) return 2;
  const all = c[at]! + c[at + 1]! + c[at + 2]! + c[at + 3]!;
  return all && c[at]! < all * cfg.loyal_share_for_steady ? 1 : 0;
}

/**
 * Reads every realm's stability step in one pass over the provinces, lords and realms (the
 * monthly step, after the moods), with the same steps as stabilityOf but counts in typed arrays.
 */
export function monthlyStability(world: World): void {
  const N = world.nationCount;
  // Per realm: royal posts, empty posts, provinces, rioting, plotting.
  const land = new Int32Array(N * 5);
  const landed = new Uint8Array(world.lords.length);
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (n < 0) continue;
    land[n * 5 + 2]!++;
    // No grievances is calm: most provinces, most of the time.
    if (world.provinceGrievances[p]) {
      const m = moodIndex(world, p);
      if (m >= 2) land[n * 5 + m + 1]!++;
    }
    const l = world.provinceLord[p]!;
    if (l >= 0) {
      landed[l] = 1;
      continue;
    }
    land[n * 5]!++;
    if (world.provinceOfficial[p]! < 0) land[n * 5 + 1]!++;
  }
  const lords = new Int32Array(N * 4);
  world.lords.forEach((l, k) => {
    if (landed[k] && l.nation >= 0 && l.nation < N) lords[l.nation * 4 + Math.max(0, LOYALTY.indexOf(l.loyalty))]!++;
  });
  // Subjects by overlord, in one pass over the realms.
  const subjects = new Int32Array(N * 4);
  for (let k = 0; k < N; k++) {
    const o = dip.relations.overlord(world.diplomacy.graph, world.nationIds[k]!);
    const n = o === null ? undefined : world.nationIndex.get(o);
    if (n !== undefined) subjects[n * 4 + Math.max(0, LOYALTY.indexOf(subjectLoyalty(world, k)))]!++;
  }
  const e = cfg.empty_posts_share;
  const r = cfg.restless_share;
  for (let n = 0; n < N; n++) {
    const posts = land[n * 5]!;
    const empty = land[n * 5 + 1]!;
    const all = land[n * 5 + 2]!;
    const rioting = land[n * 5 + 3]!;
    const plotting = land[n * 5 + 4]!;
    if (!all) {
      world.nationStability[n] = 0;
      continue;
    }
    const officialsStep = !empty ? 0 : empty <= posts * e.uneasy_up_to ? 1 : empty <= posts * e.troubled_up_to ? 2 : 3;
    const restless = rioting + plotting;
    const provincesStep = !restless ? 0 : restless >= all * r.crumbling_from ? 3 : plotting || restless >= all * r.troubled_from ? 2 : 1;
    const y = world.nationDefaultYear[n]!;
    const treasuryStep = y >= 0 && world.date.year - y < DEFAULT.troubled_years ? 2 : world.nationBrokeMonths[n]! > 0 ? 1 : 0;
    world.nationStability[n] = Math.max(loyaltyStepOf(lords, n * 4), loyaltyStepOf(subjects, n * 4), officialsStep, provincesStep, treasuryStep);
  }
}
