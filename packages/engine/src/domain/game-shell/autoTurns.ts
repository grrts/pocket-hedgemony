/**
 * Auto turns (SHELL-159..161, X-22): in a single-player campaign the weeks
 * start by themselves one after another. Pausing finishes the current week:
 * a tap while a week plays lets it play to its end, then the orders phase
 * opens. Auto turns only decide when End turn is pressed, never what a week
 * does (X-15).
 */

import { SHELL } from "./stack.ts";

export type AutoState = "off" | "on" | "stopping";

/** Why Auto turns stop at the end of the week (SHELL-161); "player" when the player stopped them. */
export type AutoStop =
  | "player"
  | "event"
  | "battle"
  | "siege"
  | "war"
  | "call"
  | "peace"
  | "envoy"
  | "rebels"
  | "study"
  | "arrived"
  | "revolution"
  | "new lands"
  | "chapter";

export interface AutoTurns {
  state: AutoState;
  /** The first reason Auto turns are stopping or stopped for, or null. */
  stop: AutoStop | null;
}

/** Auto turns are off whenever a campaign is started or loaded (SHELL-159). */
export const newAutoTurns = (): AutoTurns => ({ state: "off", stop: null });

/** Auto turns are offered only with one player (SHELL-159). */
export const autoTurnsOffered = (players: number): boolean => players === 1;

/**
 * SwitchAutoTurns, the Auto button: off turns them on (and the caller starts
 * a week if none plays); on while a week plays stops them at its end;
 * stopping turns them back on (SHELL-159, SHELL-160).
 */
export function switchAuto(a: AutoTurns, playing: boolean): { startWeek: boolean } {
  if (a.state === "on") {
    if (playing) stopAuto(a, "player");
    else a.state = "off";
    return { startWeek: false };
  }
  a.state = "on";
  a.stop = null;
  return { startWeek: !playing };
}

/** End turn or Space while a week plays: with Auto turns on it stops them at the end of the week instead of pausing (SHELL-160). */
export function endTurnInAuto(a: AutoTurns): "stops at the end of the week" | "pause" {
  if (a.state === "off") return "pause";
  if (a.state === "on") stopAuto(a, "player");
  return "stops at the end of the week";
}

/** Something needs the player: Auto turns stop at the end of this week, keeping the first reason (SHELL-161). */
export function stopAuto(a: AutoTurns, why: AutoStop): void {
  if (a.state !== "on") return;
  a.state = "stopping";
  a.stop = why;
}

/**
 * A week has played and its saves are written: with Auto turns still on and
 * nothing blocking End turn the next week starts; otherwise they go off and
 * the orders phase opens (SHELL-159, SHELL-161).
 */
export function weekPlayed(a: AutoTurns, blocked: AutoStop | null): "next week" | "orders" {
  if (a.state === "on" && !blocked) return "next week";
  if (a.state === "on") a.stop = blocked;
  a.state = "off";
  return "orders";
}

/** The label End turn and Auto carry while Auto turns stop at the end of the week (SHELL-160). */
export const AUTO_STOPPING = "Stops at the end of this week";

/** What End turn says because of Auto turns, or null when it says what it always does. */
export const endTurnLabel = (a: AutoTurns): string | null => (a.state === "stopping" ? AUTO_STOPPING : null);

/** What is near the player's realm on the day about to play (SHELL-190, F-156). */
export interface Nearness {
  /** One of the player's battles or sieges is under way. */
  fighting: boolean;
  /** An army of a realm at war with the player stands in or beside the player's land. */
  enemyNear: boolean;
  /** Something on the Overview's Coming up is due this month (SHELL-188). */
  dueThisMonth: boolean;
}

/** Whether a week on Auto is quiet: nothing near (SHELL-190). */
export const quiet = (n: Nearness): boolean => !n.fighting && !n.enemyNear && !n.dueThisMonth;

/**
 * How long a day of a week takes on screen (SHELL-190): with Auto turns on and
 * nothing near, a day plays `autoTurns.quiet_speed` times as fast as Turn
 * playback speed asks; as soon as something is near it plays at that speed
 * again. Never what the day does (X-15).
 */
export function autoDayMs(a: AutoTurns, dayMs: number, n: Nearness): number {
  return a.state === "on" && quiet(n) ? dayMs / SHELL.autoTurns.quiet_speed : dayMs;
}

/** The Auto button's word: "Auto ×3" while a week on Auto plays fast, else "Auto" (SHELL-190). */
export const autoLabel = (a: AutoTurns, n: Nearness | null): string => (a.state === "on" && n && quiet(n) ? `Auto ×${SHELL.autoTurns.quiet_speed}` : "Auto");
