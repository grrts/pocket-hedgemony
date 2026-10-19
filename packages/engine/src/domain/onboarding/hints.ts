import config from "../../../../rules/data/domain/onboarding.json" with { type: "json" };

/**
 * First-campaign hints (onboarding spec §5 "First-campaign hints", TUT-121 …
 * TUT-130, TUT-135, D-TUT-16, D-TUT-18): thirteen one-line hints, shown one
 * at a time, that point at the card or button for a first action and teach
 * the main systems a new player meets. Which are done is the player's, kept
 * between campaigns; the "Tutorial hints" setting shows or hides them.
 */

/** What ticks a hint off: a realm chosen, the turn ended, a card or map mode opened, or an order the game took (by its type). */
export type HintAction =
  | "realm chosen"
  | "province opened"
  | "realm opened"
  | "lens"
  | "turn ended"
  | "news opened"
  | "lords opened"
  | "treasury opened"
  | "move"
  | "setStudy"
  | "recruit"
  | "build"
  | "sendEnvoy";

export interface Hint {
  id: string;
  line: string;
  done: HintAction;
}

export const FIRST_HINTS: Hint[] = config.first_hints as Hint[];

export interface HintsState {
  /** The setting "Tutorial hints" (on by default, TUT-125). */
  on: boolean;
  /** Ids of hints done or dismissed (TUT-122, TUT-123). */
  done: string[];
}

export function newHints(on: boolean = config.settings.tutorial_hints.default): HintsState {
  return { on, done: [] };
}

/** Reads a kept state, dropping anything that is no longer a hint. */
export function loadHints(saved: unknown): HintsState {
  const s = (saved ?? {}) as Partial<HintsState>;
  const ids = new Set(FIRST_HINTS.map((h) => h.id));
  return { on: typeof s.on === "boolean" ? s.on : config.settings.tutorial_hints.default, done: Array.isArray(s.done) ? s.done.filter((id) => ids.has(id)) : [] };
}

/** The open hints, in order (TUT-121). */
export function openHints(state: HintsState): Hint[] {
  return FIRST_HINTS.filter((h) => !state.done.includes(h.id));
}

/** The one hint to show now, if any: none while the setting is off, while an event card is open or a turn plays, or once all are done (TUT-121, TUT-124 … TUT-126). */
export function currentHint(state: HintsState, moment: { eventOpen?: boolean; turnPlaying?: boolean } = {}): Hint | null {
  if (!state.on || moment.eventOpen || moment.turnPlaying) return null;
  return openHints(state)[0] ?? null;
}

/** The player did something: ticks off every open hint that action finishes, in any order (TUT-122). Returns the ids ticked. */
export function hintAction(state: HintsState, action: HintAction | string): string[] {
  const ticked = openHints(state).filter((h) => h.done === action).map((h) => h.id);
  state.done.push(...ticked);
  return ticked;
}

/** The player dismissed one hint: it is done without its action (TUT-123). */
export function dismissHint(state: HintsState, id: string): void {
  if (FIRST_HINTS.some((h) => h.id === id) && !state.done.includes(id)) state.done.push(id);
}

/** The setting turned on or off, keeping which are done (TUT-125). */
export function setHints(state: HintsState, on: boolean): void {
  state.on = on;
}

/** "Reset tutorial and hints": every hint opens again (TUT-125). */
export function resetHints(state: HintsState): void {
  state.done = [];
}

/** The overview: how many are done of all (TUT-129). */
export function hintsProgress(state: HintsState): { done: number; of: number; counter: string } {
  const of = FIRST_HINTS.length;
  const done = of - openHints(state).length;
  return { done, of, counter: `${Math.min(done + 1, of)} / ${of}` };
}
