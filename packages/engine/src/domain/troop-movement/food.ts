import { eatsFrom, landRule } from "./army-rules.ts";
import { MOVE, type Army, type MoveWorld, armiesIn, placeOf } from "./model.ts";
import type { RoutePlan } from "./planner.ts";

export type FoodColour = "green" | "yellow" | "red";

/** Green while the reserve covers the march, yellow once it is under half, red where it is empty (7). */
export function foodColour(reserveShare: number): FoodColour {
  if (reserveShare <= 0) return "red";
  return reserveShare < MOVE.foodYellowUnder ? "yellow" : "green";
}

/** Share of a province's forage limit each army gets: by men, among every army standing there (6.5). */
export function forageShares(w: MoveWorld, place: string): Record<string, number> {
  const here = armiesIn(w, place);
  const total = here.reduce((s, a) => s + a.men, 0);
  return Object.fromEntries(here.map((a) => [a.id, total ? a.men / total : 0]));
}

export interface FoodStep {
  place: string;
  arrive: number;
  /** Reserve on arrival, in days of food. */
  reserve: number;
  colour: FoodColour;
}

/**
 * The reserve on arrival at each province of a route (7): an army eats where it stands while it walks;
 * at home the locals feed it and refill the reserve, up to what the forage limit left by the armies
 * already there covers; abroad it eats its reserve.
 */
export function routeFood(w: MoveWorld, a: Army, plan: Pick<RoutePlan, "path" | "arrive">): { steps: FoodStep[]; pointOfNoReturn?: string } {
  const full = a.reserve?.full ?? 0;
  let reserve = a.reserve?.days ?? full;
  let at = a.place;
  let prevDay = 0;
  const steps: FoodStep[] = [];
  plan.path.forEach((place, i) => {
    const day = plan.arrive[i]!;
    const d = day - prevDay;
    if (landRule(w, a.owner, at).eats === "locals") {
      const p = placeOf(w, at);
      const others = armiesIn(w, at).filter((b) => b !== a).reduce((s, b) => s + b.men, 0);
      const fed = p.forageLimit === undefined ? 1 : Math.max(0, Math.min(1, (p.forageLimit - others) / a.men));
      reserve = fed >= 1 ? full : reserve - d * (1 - fed);
    } else reserve -= d;
    reserve = Math.max(0, reserve);
    steps.push({ place, arrive: day, reserve, colour: foodColour(full ? reserve / full : 0) });
    at = place;
    prevDay = day;
  });
  // Point of no return: the last province abroad from which the walk back home still fits in the reserve.
  const home = (p: string) => landRule(w, a.owner, p).eats === "locals";
  let lastHome = home(a.place) ? -1 : undefined;
  let lastHomeDay = 0;
  let flag: string | undefined;
  steps.forEach((s, i) => {
    if (home(s.place)) {
      lastHome = i;
      lastHomeDay = s.arrive;
    } else if (lastHome !== undefined && s.reserve >= s.arrive - lastHomeDay) flag = s.place;
  });
  return flag === undefined ? { steps } : { steps, pointOfNoReturn: flag };
}

/**
 * Refill and go (7): a stop at the realm's castle on the route with most food above its siege reserve,
 * else the richest own province on it; the army waits a day per 10 % of the reserve refilled.
 */
export function refillAndGo(w: MoveWorld, a: Army): { at: string; days: number } | null {
  const own = [a.place, ...a.route].filter((p) => placeOf(w, p).owner === a.owner);
  const castles = own.filter((p) => placeOf(w, p).castle?.owner === a.owner);
  const spare = (p: string) => {
    const c = placeOf(w, p).castle!;
    return (c.food ?? 0) - (c.siegeReserve ?? 0);
  };
  const at = castles.length
    ? castles.reduce((b, p) => (spare(p) > spare(b) ? p : b))
    : own.length
      ? own.reduce((b, p) => ((placeOf(w, p).wealth ?? 0) > (placeOf(w, b).wealth ?? 0) ? p : b))
      : undefined;
  if (at === undefined || !a.reserve) return null;
  const missing = 1 - a.reserve.days / a.reserve.full;
  const days = Math.ceil(Math.round(missing * 1000) / 100) * MOVE.refillDaysPer10Pct;
  a.refill = { at, days };
  return { at, days };
}

export { eatsFrom };
