import type { World } from "./world.ts";
import { atWar, controller } from "./war.ts";
import { castleStep } from "./works.ts";
import { reachOf } from "./castleFood.ts";
import { W as WARFARE } from "./domain/warfare/index.ts";
import { realmConfig } from "./domain/realm/index.ts";

/**
 * Castles starve besiegers (Leroy, 19 Oct; WAR-263 to WAR-269): a castle its
 * owner still holds has gathered the land's food behind its walls, so enemy
 * foragers find less in its province, and a share of that less in the
 * provinces it reaches by road; and an army besieging a castle eats more,
 * from camp fevers and sallies against its foragers. Numbers are
 * `warfare.castle_supply` (provisional).
 *
 * Each look is a short walk out from one province, at most the farthest
 * reach a road gives (a handful of rings), so feeding an army stays O(1).
 */

const C = WARFARE.castle_supply;
/** The farthest any castle reaches, in rings (REALM-032). */
const MAX_REACH = Math.max(...Object.values(realmConfig.food_year.reach_by_road as Record<string, number>));

/** The castle step the walls count as: the works' step, and a capital's stone castle (step 2) where it has less. */
export function wallStep(world: World, p: number): number {
  const step = castleStep(world, p);
  const owner = world.provinceOwner[p]!;
  return step < 2 && owner >= 0 && world.rules.nations[owner]!.capital === world.provinceIds[p] ? 2 : step;
}

/** Share of the land's food a castle of a step gathers in its own province (0 without walls). */
export function castleCutOfStep(step: number): number {
  return step > 0 ? C.forage_cut_by_step[Math.min(step, C.forage_cut_by_step.length) - 1]! : 0;
}

/** How much more an army besieging walls of a step eats (1 without walls). */
export function besiegerEatOfStep(step: number): number {
  return step > 0 ? C.besieger_eat_by_step[Math.min(step, C.besieger_eat_by_step.length) - 1]! : 1;
}

/** A castle that gathers the food of a province in: whose castle, and the share foragers lose there. */
export interface CastleCut {
  /** The castle's province, -1 = none. */
  castle: number;
  /** Share of what foragers would find that the castle keeps from them, 0 to 1. */
  share: number;
}

const NONE: CastleCut = { castle: -1, share: 0 };

/**
 * The castle that keeps the most of a province's food from enemy foragers
 * (WAR-263, WAR-264): its owner's castles that the owner still holds, in the
 * province itself (the full cut by step) or within their reach over the
 * owner's land (`reach_share` of it). The nearest castle wins a tie.
 */
export function castleCutAt(world: World, p: number): CastleCut {
  const owner = world.provinceOwner[p]!;
  if (owner < 0 || world.provinceWater[p]) return NONE;
  let best = NONE;
  const held = (q: number) => controller(world, q) === owner;
  const here = wallStep(world, p);
  if (here > 0 && held(p)) best = { castle: p, share: castleCutOfStep(here) };
  // Ring by ring over the owner's land, as far as the farthest reach.
  const seen = new Set<number>([p]);
  let frontier = [p];
  for (let r = 1; r <= MAX_REACH && frontier.length; r++) {
    const next: number[] = [];
    for (const q of frontier) {
      for (let k = world.adjStart[q]!, end = world.adjStart[q + 1]!; k < end; k++) {
        const x = world.adjList[k]!;
        if (seen.has(x) || world.provinceWater[x] || world.provinceOwner[x] !== owner) continue;
        seen.add(x);
        next.push(x);
        const step = wallStep(world, x);
        if (step <= 0 || !held(x) || reachOf(world, x) < r) continue;
        const share = castleCutOfStep(step) * C.reach_share;
        if (share > best.share) best = { castle: x, share };
      }
    }
    frontier = next;
  }
  return best;
}

/**
 * How much more an army eats while it besieges a castle (WAR-265): it stands
 * in a province under siege, at war with the realm that holds the walls.
 * 1 for every other army.
 */
export function besiegerEat(world: World, slot: number): number {
  const p = world.armies.location[slot]!;
  if (!world.sieges.size || p < 0 || !world.sieges.has(p)) return 1;
  const holder = controller(world, p);
  return holder >= 0 && atWar(world, world.armies.owner[slot]!, holder) ? besiegerEatOfStep(wallStep(world, p)) : 1;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

/**
 * Why an army runs short because of the enemy's castles, in words for its
 * food line (WAR-266): the castle keeping food from its foragers where it
 * stands, given as `cut` (forageCut in turn.ts, which knows enemy land), and
 * the extra eating while it besieges. Empty when neither applies.
 */
export function supplyNotes(world: World, slot: number, cut: CastleCut): string[] {
  const notes: string[] = [];
  if (cut.castle >= 0 && cut.share > 0) {
    const where = cut.castle === world.armies.location[slot] ? "" : " nearby";
    notes.push(`foragers find ${pct(cut.share)} less: ${world.rules.provinces[cut.castle]!.name}'s castle${where} has gathered the food in`);
  }
  const eat = besiegerEat(world, slot);
  if (eat > 1) notes.push(`besieging: men eat ${pct(eat - 1)} more from camp fevers and sallies`);
  return notes;
}

/** What walls of a step do to the enemy's food, for the castle's build row and a province's Walls line (WAR-267). */
export function wallsFoodText(step: number): string {
  const cut = castleCutOfStep(step);
  return `It gathers the food in: enemy foragers find ${pct(cut)} less here and ${pct(cut * C.reach_share)} less in the land it reaches, and besiegers eat ${pct(besiegerEatOfStep(step) - 1)} more`;
}
