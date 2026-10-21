import { config, type ByFear, type FearWord } from "./rules.ts";
import { borders, country, neighbours, type Diplomacy } from "./model.ts";
import { has, overlord } from "./relations.ts";

/**
 * Arms and fear (DIPL-231 to DIPL-234, Leroy 19 Oct): a realm measures each
 * neighbour's strength against its own side's and keeps a standing army sized
 * against its neighbours and its fear. Pure rules; the engine's arms.ts feeds
 * them the world's numbers.
 */

export const AF = config.arms_and_fear;

/** Fear levels, calm first. */
export const FEAR_WORDS: readonly FearWord[] = ["calm", "wary", "threatened"];

/** A realm's fear of a neighbour whose strength is `ratio` times its own side's (DIPL-231). */
export function fearOf(ratio: number): FearWord {
  if (ratio >= AF.fear.threatened_ratio) return "threatened";
  if (ratio >= AF.fear.wary_ratio) return "wary";
  return "calm";
}

/** A realm's own side: its strength and `ally_weight` of each friend's (allies, overlord, subjects). */
export function ownSide(own: number, friends: readonly number[]): number {
  return own + AF.fear.ally_weight * friends.reduce((t, x) => t + x, 0);
}

export interface StandingInput {
  /** The realm's troop cap, in men. */
  cap: number;
  /** The largest force under arms of a neighbour it does not count as a friend, in men. */
  largestNeighbour: number;
  /** Its gold a month. */
  income: number;
  /** A levy's pay a month per 1,000 men, once its pay has begun. */
  levyPer1000: number;
  fear: FearWord;
}

/**
 * The men an AI realm keeps under arms at peace (DIPL-232): the larger of a
 * share of its troop cap and a share of its largest unfriendly neighbour's
 * force, times its fear's multiplier; never over its fear's share of the cap
 * nor what its fear's share of its income pays at a levy's pay.
 */
export function standingTarget(i: StandingInput): number {
  const S = AF.standing;
  const want = Math.max(S.share_of_cap * i.cap, S.match_neighbour * i.largestNeighbour) * S.multiplier[i.fear];
  const pays = i.levyPer1000 > 0 ? ((Math.max(0, i.income) * S.pay_share_of_income[i.fear]) / i.levyPer1000) * 1000 : 0;
  return Math.max(0, Math.min(want, S.max_share_of_cap[i.fear] * i.cap, pays));
}

/** The worse of two fears. */
export const worseFear = (a: FearWord, b: FearWord): FearWord => (FEAR_WORDS.indexOf(a) >= FEAR_WORDS.indexOf(b) ? a : b);

export type { ByFear, FearWord };

/** The worst fear a realm holds this month (DIPL-231), calm without any. */
export function fearLevel(fears: readonly { level: FearWord }[] | undefined): FearWord {
  let worst: FearWord = "calm";
  for (const f of fears ?? []) worst = worseFear(worst, f.level);
  return worst;
}

// ---------------------------------------------------------------- acting on fear (F-166, DIPL-238 to DIPL-243)

/**
 * *We fear the same realm* (DIPL-238): when both the asker and the asked fear
 * one realm, the asked counts `allies.same_fear` at its own fear of it (more
 * when it is Threatened). The realm counted is the one that gives most, the
 * most feared first on a tie. Null when they fear no realm in common.
 */
export function sameFear(asker: readonly { of: string }[] | undefined, asked: readonly { of: string; level: FearWord }[] | undefined): { of: string; number: number } | null {
  if (!asker?.length || !asked?.length) return null;
  let best: { of: string; number: number } | null = null;
  for (const f of asked) {
    if (!asker.some((x) => x.of === f.of)) continue;
    const number = AF.allies.same_fear[f.level];
    if (number > 0 && (!best || number > best.number)) best = { of: f.of, number };
  }
  return best;
}

/** How often, in months, an AI realm weighs its envoys (DIPL-239): every `allies.envoy_every_months` when Threatened, else `usual`. */
export function envoyEveryMonths(fear: FearWord, usual: number): number {
  return fear === "threatened" ? Math.min(usual, Math.max(1, AF.allies.envoy_every_months)) : usual;
}

/**
 * Partners against a common fear (DIPL-239): the realms beside the realm `c`
 * is Threatened of most (`near` gives a realm's neighbours, the map's by
 * default) that fear it too, `c`'s allies, overlord and subjects aside, the
 * strongest first (ties by id), at most `allies.partners`. They need not
 * border `c`.
 */
export function fearPartners(d: Diplomacy, c: string, near: (x: string) => Iterable<string> = (x) => neighbours(d, x)): string[] {
  const worst = country(d, c).fears?.find((f) => f.level === "threatened");
  if (!worst) return [];
  const out: string[] = [];
  for (const k of near(worst.of)) {
    if (k === c || !country(d, k).fears?.some((f) => f.of === worst.of)) continue;
    if (has(d.graph, "alliance", c, k) || overlord(d.graph, k) === c || overlord(d.graph, c) === k) continue;
    out.push(k);
  }
  return out.sort((p, q) => country(d, q).soldiers - country(d, p).soldiers || p.localeCompare(q)).slice(0, AF.allies.partners);
}

/**
 * The news of DIPL-244: two realms that ally out of fear of `me`, when both
 * fear it and one of them borders it (`bordersMe`, the map's by default).
 */
export function alliedOutOfFear(d: Diplomacy, a: string, b: string, me: string, bordersMe: (x: string) => boolean = (x) => borders(d, x, me)): boolean {
  const fears = (x: string) => !!country(d, x).fears?.some((f) => f.of === me);
  return a !== me && b !== me && fears(a) && fears(b) && (bordersMe(a) || bordersMe(b));
}

/** The castle step an AI realm wants on its border with the realm it fears most (DIPL-240); 0 when calm. */
export function defenceCastleStep(fear: FearWord): number {
  return AF.defences.castle_step[fear];
}

/** Whether an invention is a warfare or fortification invention (DIPL-241): warfare by its id, fortification by the castle steps it unlocks. */
export function armsInvention(id: string, fortification: ReadonlySet<string>): boolean {
  return id.startsWith(AF.technology.warfare_prefix) || fortification.has(id);
}

/** What an AI realm weighs an invention's study cost by when it chooses its next study (DIPL-241). */
export function studyCostWeight(id: string, fear: FearWord, fortification: ReadonlySet<string>): number {
  return armsInvention(id, fortification) ? AF.technology.cost_weight[fear] : 1;
}

/**
 * The strength ratio an AI realm's side needs over its target's before it
 * declares (DIPL-242, DIPL-243): the warfare `base`, times
 * `opportunity.at_war_ratio_factor` when the target is already at war with
 * another realm, and `opportunity.gamble_ratio_factor` in a month it gambles;
 * never under `opportunity.min_ratio` (nor over the base).
 */
export function declareRatio(base: number, targetAtWar: boolean, gamble: boolean): number {
  const O = AF.opportunity;
  const r = base * (targetAtWar ? O.at_war_ratio_factor : 1) * (gamble ? O.gamble_ratio_factor : 1);
  return Math.min(base, Math.max(O.min_ratio, r));
}
