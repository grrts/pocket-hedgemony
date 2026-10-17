/**
 * Revolutions (REVO, domain/revolutions/spec.md): the revolution card, its
 * signs and stages, stances, camps, regimes, decrees and locks, re-arming,
 * the aftermath abroad, the AI's part and the layer's build. A revolution is
 * an event of the event tree with a `revolution` block; it runs on the
 * events engine and raises tagged risings in the rebellions model.
 */
export * from "./model.ts";
export * from "./state.ts";
export * from "./revolution.ts";
export * from "./camps.ts";
export * from "./aftermath.ts";
export * from "./build.ts";
