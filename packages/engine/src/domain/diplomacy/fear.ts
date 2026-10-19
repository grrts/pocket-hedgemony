import { config, type ByFear, type FearWord } from "./rules.ts";

/**
 * Arms and fear (DIPL-228 to DIPL-231, Leroy 19 Oct): a realm measures each
 * neighbour's strength against its own side's and keeps a standing army sized
 * against its neighbours and its fear. Pure rules; the engine's arms.ts feeds
 * them the world's numbers.
 */

export const AF = config.arms_and_fear;

/** Fear levels, calm first. */
export const FEAR_WORDS: readonly FearWord[] = ["calm", "wary", "threatened"];

/** A realm's fear of a neighbour whose strength is `ratio` times its own side's (DIPL-228). */
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
 * The men an AI realm keeps under arms at peace (DIPL-229): the larger of a
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

/** The worst fear a realm holds this month (DIPL-228), calm without any. */
export function fearLevel(fears: readonly { level: FearWord }[] | undefined): FearWord {
  let worst: FearWord = "calm";
  for (const f of fears ?? []) worst = worseFear(worst, f.level);
  return worst;
}
