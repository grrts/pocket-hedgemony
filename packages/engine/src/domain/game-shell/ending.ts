/**
 * How a campaign ends and what interrupts it (SHELL-094..107): game over and
 * play on, the end date's wrap-up, closing sequence and final result, leaving
 * and coming back, a turn interrupted, and the one failure screen.
 */
import { SHELL, push, replaceAll, topId, type Frame, type Shell } from "./stack.ts";
import { raiseEvents, turnOf, type PendingEvent } from "./turn.ts";

// ---------------------------------------------------------------------------
// Game over (SHELL-094..096)

export interface RealmHighs {
  largestSize: number;
  yearsLasted: number;
  battlesWon: number;
}

export interface GameOverCard {
  line: string;
  highs: RealmHighs;
  choices: string[];
}

/** The realm no longer exists: the map zooms out over the old borders, game_over plays, a card says how in one line (SHELL-094). */
export function gameOver(sh: Shell, cause: { line: string; year: number }, highs: RealmHighs): GameOverCard {
  const c = sh.campaign;
  if (!c) throw new Error("No campaign loaded");
  sh.camera = { ...sh.camera, level: "World", on: `the old borders of ${c.realm}` };
  replaceAll(sh, { id: "game_over" });
  return { line: `${cause.line} · ${cause.year}`, highs, choices: [...SHELL.gameOverChoices] };
}

/** "Play on as another realm" warns before it is pressed (SHELL-096). */
export const playOnButton = (): { label: string; says: string } => ({ label: "Play on as another realm", says: SHELL.strings.playOnWarning });

/** A choice on the game over card (SHELL-095). */
export function gameOverChoice(sh: Shell, choice: string, realmsOnMap: readonly string[] = []): { chronicle: "read only" } | { pick: string[] } | { mainMenu: true } {
  if (topId(sh) !== "game_over") throw new Error("Game over is not showing");
  switch (choice) {
    case "Look back":
      push(sh, { id: "realm_book", tab: "Chronicle", subject: "read only" });
      return { chronicle: "read only" };
    case "Play on as another realm":
      return { pick: realmsOnMap.filter((r) => r !== sh.campaign?.realm) };
    case "Main menu":
      sh.campaign = null;
      replaceAll(sh, { id: "main_menu" });
      return { mainMenu: true };
    default:
      throw new Error(`No game over choice ${choice}`);
  }
}

/** PlayOnAsAnotherRealm: any campaign, ironman included; achievements end; not undoable (SHELL-096). */
export function playOn(sh: Shell, realm: string): { undoable: false } {
  const c = sh.campaign;
  if (!c) throw new Error("No campaign loaded");
  c.realm = realm;
  c.canEarnAchievements = false;
  sh.events.push({ type: "PlayedOnAsAnotherRealm", realm });
  replaceAll(sh, { id: "map" });
  return { undoable: false };
}

// ---------------------------------------------------------------------------
// Campaign end (SHELL-097, SHELL-099, SHELL-100)

export interface ClosingSequence {
  zoom: "World";
  /** The player's borders by era, stepped through in order. */
  eras: string[];
  track: string;
}

/** The end date is reached when the date passes the one chosen at the start. */
export function endDateReached(sh: Shell, isoDay: string): boolean {
  return !!sh.campaign && isoDay >= sh.campaign.endDate;
}

/** Campaign end: the wrap-up events as normal event cards, then the closing sequence, then the final result (SHELL-097). */
export function startCampaignEnd(sh: Shell, wrapUps: PendingEvent[]): void {
  const t = turnOf(sh);
  t.phase = "events";
  t.report = [];
  ending.add(sh);
  raiseEvents(sh, wrapUps);
  const first = t.events[0];
  if (first) push(sh, { id: "event", subject: first.id, decideLater: true });
}

const ending = new WeakSet<Shell>();

/** After the last wrap-up event: the closing sequence over the player's borders by era. */
export function closingSequence(sh: Shell, eras: string[]): ClosingSequence {
  if (!ending.has(sh) || turnOf(sh).events.length) throw new Error("Wrap-up events are still waiting");
  replaceAll(sh, { id: "campaign_end" });
  sh.camera = { ...sh.camera, level: "World" };
  return { zoom: "World", eras, track: sh.track ?? "" };
}

/** The final result: ledger comparison, final outcome, achievements earned; Main menu or Credits (SHELL-099). */
export function finalResult(sh: Shell, o: { ledger: string[]; outcome: string; achievements: string[] }): { ledger: string[]; outcome: string; achievements: string[]; choices: string[] } {
  replaceAll(sh, { id: "final_result" });
  return { ...o, choices: [...SHELL.finalResultChoices] };
}

export function finalResultChoice(sh: Shell, choice: string): void {
  if (topId(sh) !== "final_result") throw new Error("The final result is not showing");
  if (choice === "Credits") push(sh, { id: "credits", openedFrom: "final_result" });
  else if (choice === "Main menu") {
    sh.campaign = null;
    replaceAll(sh, { id: "main_menu" });
  } else throw new Error(`No final result choice ${choice}`);
}

/** There is no playing past the end date (SHELL-100). */
export const canPlayOnPastEnd = (sh: Shell): boolean => !ending.has(sh);

// ---------------------------------------------------------------------------
// Interruptions (SHELL-101..107)

export interface Backgrounded {
  saved: boolean;
  soundSuspended: true;
  /** The screen stack as it was, to come back to. */
  stack: Frame[];
  camera: Shell["camera"];
  workerPaused: boolean;
}

/** The app goes to the background: save if anything changed, suspend sound; a running turn pauses with it (SHELL-101, SHELL-104). */
export function appBackgrounded(sh: Shell): Backgrounded {
  const changed = sh.campaign?.changedSinceSave === true;
  sh.events.push({ type: "AppBackgrounded" });
  if (changed) {
    sh.events.push({ type: "SaveRequested", reason: "background" });
    sh.campaign!.changedSinceSave = false;
  }
  const running = turnOf(sh).phase === "in progress";
  return { saved: changed, soundSuspended: true, stack: sh.stack.map((f) => ({ ...f })), camera: { ...sh.camera }, workerPaused: running };
}

/** The app comes back while in memory (or a Steam Deck resumes): the same screen, scroll and camera, no title, load_resume (SHELL-102). */
export function appResumed(sh: Shell, was: Backgrounded): { titleShown: false; track: string; turnCarriesOn: boolean } {
  sh.stack = was.stack.map((f) => ({ ...f }));
  sh.camera = { ...was.camera };
  sh.track = "load_resume";
  sh.events.push({ type: "AppResumed" });
  return { titleShown: false, track: "load_resume", turnCarriesOn: was.workerPaused };
}

/** After the system killed the app, the next start is cold; Continue points at the background save and the map says so (SHELL-103). */
export function pickedUpStrip(): string {
  return SHELL.strings.pickedUp;
}

/** A killed app with a turn running restarts from the pre-turn save (SHELL-104, SHELL-079). */
export const saveAfterKillDuringTurn = (): "pre-turn save" => "pre-turn save";

export type Failure = "the engine worker crashes" | "a save won't read";

/** The one failure screen: what failed in plain words, Restore, Main menu, and Send a report where approved; never a stack trace (SHELL-107). */
export function failureScreen(sh: Shell, what: Failure, reporterApproved: boolean): { says: string; options: string[]; stackTrace: false } {
  replaceAll(sh, { id: "error", subject: what });
  const options = SHELL.failureOptions.filter((o) => o !== "Send a report" || reporterApproved);
  return { says: plainWords(what), options, stackTrace: false };
}

/** The failure as the player would say it: no codes, no paths. */
const plainWords = (what: Failure): string => `${what[0]!.toUpperCase()}${what.slice(1)}.`;

/** Restore the last autosave from X1: a load request (saves owns which save). */
export function restoreLastAutosave(sh: Shell): void {
  if (topId(sh) !== "error") throw new Error("The failure screen is not showing");
  sh.events.push({ type: "CampaignLoadRequested", save: "last autosave" });
  replaceAll(sh, { id: "loading", subject: "last autosave" });
}

