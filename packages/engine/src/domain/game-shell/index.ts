/**
 * Game shell (SHELL): the screen flow as a pure state machine. Screens are the
 * domain here: the screen stack and Back, the map and its cards, the Realm
 * book, the game menu, the turn on screen, the Attention list, how a campaign
 * ends, interruptions, layout rules by window shape (from map-presentation)
 * and navigation by input. See domain/game-shell/spec.md; numbers come from
 * packages/rules/data/domain/game-shell.json.
 */
export * from "./stack.ts";
export * from "./attention.ts";
export * from "./turn.ts";
export * from "./front.ts";
export * from "./ending.ts";
export * from "./input.ts";
export * from "./desk.ts";
export { classifyShape, layoutFor, mapHud, checkTouchRules, cornerOf, oppositeCorners, portraitNotice, type Shape, type Window } from "../map-presentation/index.ts";
export * from "./autoTurns.ts";
