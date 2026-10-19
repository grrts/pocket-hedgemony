import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { mix } from "./names.ts";
import { Rng } from "./rng.ts";
import { lordLands, loyaltyStep } from "./lords.ts";
import { personDies } from "./people.ts";
import { assassinationChance, assassinationConfig, type Loyalty } from "./domain/realm/index.ts";

/**
 * Sending an assassin after a lord (REALM-280 to REALM-285): its cost and
 * odds, and the deed. The death itself goes through the shared death hook.
 */

/** Gold an assassin costs, paid whether or not he succeeds (REALM-280). */
export function assassinationGold(): number {
  return assassinationConfig.gold;
}

/** The chance an assassin sent after this lord succeeds (REALM-281): great lords are better guarded. */
export function assassinChance(world: World, lord: number): number {
  return assassinationChance({ provinces: lordLands(world, lord).map(String) });
}

/** Why the realm can't send an assassin after this lord, or null. */
export function whyNotAssassinate(world: World, n: number, lord: number): string | null {
  const l = world.lords[lord];
  if (!l || l.gone || l.nation !== n || lordLands(world, lord).length === 0) return "not your lord";
  if (world.nationTreasury[n]! < assassinationGold()) return `needs ${assassinationGold()} gold`;
  return null;
}

/**
 * Sends an assassin after one of the realm's lords (REALM-280 to REALM-283).
 * The gold is spent either way. If he succeeds, the lord dies through the
 * shared death hook (personDies, cause "assassinated"), which hands his lands
 * to his heir or a kinsman, or back to the crown when his line ends; an heir
 * starts at the data's heir loyalty, the rest of his house turns disloyal,
 * and every other lord of the realm falls a step. If he is caught, the lord
 * turns disloyal and every other lord still falls a step: either way the
 * realm's lords know whose knife it was. `roll` in [0, 1) replaces the
 * seeded draw (tests).
 */
export function assassinate(world: World, n: number, lord: number, news: News[], roll?: number): string | null {
  const why = whyNotAssassinate(world, n, lord);
  if (why) return why;
  const a = assassinationConfig;
  const l = world.lords[lord]!;
  const chance = assassinChance(world, lord);
  world.nationTreasury[n] = world.nationTreasury[n]! - a.gold;
  const r = roll ?? new Rng(mix(world.weatherSeed ^ 0xa55a5, lord * 7919 + world.day)).next();
  const others = (steps: number, cause: string) => {
    for (let i = 0; i < steps; i++) world.lords.forEach((o, k) => k !== lord && o.nation === n && !o.gone && lordLands(world, k).length > 0 && loyaltyStep(world, k, cause, news));
  };
  const dead = l.name;
  if (r < chance) {
    others(a.others_steps, "lord_assassinated");
    if (a.house_turns_disloyal) world.lords.forEach((o, k) => k !== lord && o.nation === n && !o.gone && o.house === l.house && lordLands(world, k).length > 0 && (o.loyalty = "Disloyal"));
    personDies(world, { kind: "lord", lord }, "assassinated", news);
    // An heir who takes the lands knows how his father died.
    if (!l.gone) (l.loyalty = a.heir_loyalty as Loyalty), (l.upCredit = 0), delete l.want;
    news.push({ kind: "unrest", text: `${dead} died by an assassin's hand. Your other lords trust you less`, nations: [n] });
  } else {
    l.loyalty = a.target_on_failure as Loyalty;
    l.upCredit = 0;
    others(a.others_steps_on_failure, "assassin_caught");
    news.push({ kind: "unrest", text: `The assassin sent after ${dead} was caught; he is ${l.loyalty.toLowerCase()} now, and your other lords trust you less`, nations: [n] });
  }
  return null;
}
