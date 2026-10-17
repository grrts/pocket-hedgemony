import { rulesFor } from "./army-rules.ts";
import { type Army, type Mover, type MoverKind, type MoverRules, type MoveWorld, isWater, placeOf } from "./model.ts";
import { planRoute } from "./planner.ts";

/** A mover standing still in one place, with no route (11.1). */
export function createMover(id: string, kind: MoverKind, owner: string, place: string): Mover {
  return { id, kind, owner, place, route: [], progress: 0, greyed: [] };
}

/** Everything a mover has (11.1): its own fields plus its kind's step-days, may-enter and stops-at rules. */
export function moverParts(w: MoveWorld, m: Mover): { place: string; route: string[]; progress: number; rules: MoverRules } {
  return { place: m.place, route: m.route, progress: m.progress, rules: rulesFor(w, m) };
}

export type WaterLeg = { kind: "march" | "board" | "sail" | "land" | "march on"; places: string[] };

/**
 * A route across water (11.3): with ships that can carry the army, march to the coast, board, sail,
 * land and march on; without, the route stops at the coast with "needs ships".
 */
export function planAcrossWater(w: MoveWorld, a: Army, to: string, ships?: Mover): { legs: WaterLeg[]; message?: string } {
  const plan = planRoute(w, a, to);
  if (plan.end !== "needs ships") return { legs: [{ kind: "march", places: plan.path }] };
  if (!ships || (ships.room ?? 0) < a.men) return { legs: [{ kind: "march", places: plan.path }], message: "needs ships" };
  const sea = plan.greyed.findIndex((p) => !isWater(placeOf(w, p)));
  const sail = plan.greyed.slice(0, sea < 0 ? undefined : sea);
  const after = sea < 0 ? [] : plan.greyed.slice(sea);
  const coast = plan.path[plan.path.length - 1] ?? a.place;
  return {
    legs: [
      { kind: "march", places: plan.path },
      { kind: "board", places: [coast] },
      { kind: "sail", places: sail },
      { kind: "land", places: after.slice(0, 1) },
      { kind: "march on", places: after.slice(1) },
    ],
  };
}
