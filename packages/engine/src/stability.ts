import type { World } from "./world.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { startLoyalty1444, stepName, type Autonomy } from "./domain/subjects/index.ts";
import { moodIndex } from "./moods.ts";
import { realmConfig } from "./domain/realm/index.ts";

const cfg = realmConfig.stability;

/**
 * Stability (realm REALM-199 to REALM-202, F-75): not a stored number but a
 * reading of the realm's four pillars, lords, subjects, officials and
 * provinces. Each pillar takes one of four steps, and the realm stands as
 * steady as its weakest pillar.
 */

export type StabilityStep = "Steady" | "Uneasy" | "Troubled" | "Crumbling";
export const STABILITY = cfg.steps as readonly StabilityStep[];

export interface StabilityPillar {
  key: "lords" | "subjects" | "officials" | "provinces";
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

const AUTONOMY = ["very_low", "low", "moderate", "high", "very_high"];

const byLoyalty = (list: string[]) => Object.fromEntries(LOYALTY.map((l) => [l, list.filter((x) => x === l).length]));

/** A subject's loyalty: the 1444 rule from its autonomy and stance until the seasonal count is built (SUBJ-036). */
export function subjectLoyalty(world: World, subject: number): string {
  const g = world.diplomacy.graph;
  const x = world.nationIds[subject]!;
  const r = g.relations.find((q) => q.type === "subject" && q.source === x);
  if (!r) return "Loyal";
  const autonomy = (AUTONOMY.includes(String(r.autonomy)) ? r.autonomy : "moderate") as Autonomy;
  return stepName(startLoyalty1444(autonomy, dip.relations.stance(g, x, r.target) === "hostile"));
}

/** The realm's stability from its lords, subjects, officials and provinces (REALM-199). */
export function stabilityOf(world: World, n: number): Stability {
  const landed = new Set(world.provinceLord);
  const lords = byLoyalty(world.lords.filter((l, k) => l.nation === n && landed.has(k)).map((l) => l.loyalty));
  const g = world.diplomacy.graph;
  const subjectIds = new Set(dip.relations.subjectsOf(g, world.nationIds[n]!));
  const subjectList: string[] = [];
  world.nationIds.forEach((id, k) => subjectIds.has(id) && subjectList.push(subjectLoyalty(world, k)));
  const subjects = byLoyalty(subjectList);

  // Royal provinces each need an official at his post (REALM-064); a lord's are run by his own.
  let posts = 0;
  let empty = 0;
  let all = 0;
  const moods = [0, 0, 0, 0];
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n) continue;
    all++;
    moods[moodIndex(world, p)]!++;
    if (world.provinceLord[p]! >= 0) continue;
    posts++;
    if (world.provinceOfficial[p]! < 0) empty++;
  }
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
  ];
  return { step: Math.max(...pillars.map((q) => q.step)), pillars };
}
