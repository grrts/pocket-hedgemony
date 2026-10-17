/**
 * Troop movement (MOVE): the day loop of a month, step days, what stops an army, whose land it may
 * enter, meeting the enemy, food on the road, many armies, orders, the route preview and notices,
 * and the mover interface shared with naval and trade. See domain/troop-movement/spec.md.
 * Reuses march.ts's step days for the crossing and horse part; march.ts itself is unchanged.
 */
export * from "./model.ts";
export * from "./army-rules.ts";
export * from "./planner.ts";
export * from "./army-ops.ts";
export * from "./day-loop.ts";
export { foodColour, forageShares, routeFood, refillAndGo, type FoodColour, type FoodStep } from "./food.ts";
export * from "./preview.ts";
export * from "./orders.ts";
export * from "./many.ts";
export * from "./movers.ts";
