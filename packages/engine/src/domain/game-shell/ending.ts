/**
 * How a campaign ends and what interrupts it (SHELL-094..107): game over and
 * play on, the end date's wrap-up, closing sequence and final result, leaving
 * and coming back, a turn interrupted, and the one failure screen.
 */
import { SHELL, openStartScreen, push, replaceAll, topId, type Frame, type Shell } from "./stack.ts";
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

export type GameOverCause = "annexed" | "every province lost";

/** The only ways a realm stops existing; there is no successor rule (SHELL-094, D-SHELL-17). */
export const GAME_OVER_CAUSES: readonly GameOverCause[] = ["annexed", "every province lost"];

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
export function gameOverChoice(sh: Shell, choice: string, realmsOnMap: readonly string[] = []): { news: "read only" } | { pick: string[] } | { mainMenu: true } {
  if (topId(sh) !== "game_over") throw new Error("Game over is not showing");
  switch (choice) {
    case "Look back":
      push(sh, { id: "turn_report", subject: "read only" });
      return { news: "read only" };
    case "Play on as another realm":
      return { pick: realmsOnMap.filter((r) => r !== sh.campaign?.realm) };
    case "Main menu":
      openStartScreen(sh, sh.campaign?.realm);
      sh.campaign = null;
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

/** Campaign end: the wrap-up events as normal event cards, then the closing sequence, then the final result (SHELL-097); at the end date, or at once on a world domination win (SHELL-129). */
export function startCampaignEnd(sh: Shell, wrapUps: PendingEvent[], why: "end date" | "world domination" = "end date"): void {
  if (why === "end date") markEndDate(sh);
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

// ---------------------------------------------------------------------------
// Winning (SHELL-098, SHELL-129, SHELL-130; X-12, D-SHELL-1)

export type Score = "Economy" | "Power" | "Technology";
export const SCORES = SHELL.scores as Score[];

/** One realm's three scores, as realm §12 works them out each January. */
export interface RealmScores {
  realm: string;
  Economy: number;
  Power: number;
  Technology: number;
}

/** World domination: owning or holding as subjects at least half of the world's settled land provinces. */
export function dominationReached(held: number, settledLandProvinces: number): boolean {
  return settledLandProvinces > 0 && held / settledLandProvinces >= SHELL.dominationShare;
}

/** Checked only in the January turn; a player reaching it wins at once and campaign end starts (SHELL-129). */
export function checkDomination(sh: Shell, month: number, held: number, settledLandProvinces: number): boolean {
  const c = sh.campaign;
  if (!c || month !== SHELL.dominationCheckMonth || c.wins?.includes("World domination")) return false;
  if (!dominationReached(held, settledLandProvinces)) return false;
  c.wins = [...(c.wins ?? []), "World domination"];
  sh.events.push({ type: "VictoryReached", realm: c.realm, win: "World domination" });
  return true;
}

/** The leaders of each score; ties share the win, and no margin is needed (SHELL-130). */
export function scoreWinners(scores: readonly RealmScores[]): Record<Score, string[]> {
  const out = {} as Record<Score, string[]>;
  for (const k of SCORES) {
    const best = Math.max(...scores.map((s) => s[k]));
    out[k] = scores.filter((s) => s[k] === best).map((s) => s.realm);
  }
  return out;
}

/** A realm's place in one score, 1 for the leader; equal scores share a place. */
export const rankIn = (scores: readonly RealmScores[], realm: string, k: Score): number => {
  const mine = scores.find((s) => s.realm === realm);
  if (!mine) throw new Error(`No scores for ${realm}`);
  return 1 + scores.filter((s) => s[k] > mine[k]).length;
};

export interface Outcome {
  /** The player's wins: "World domination" and each score led. */
  wins: string[];
  /** Every winner of each score at the end date. */
  winners: Record<Score, string[]> | null;
  /** With no win, the player's rank in each score. */
  ranks: Record<Score, number> | null;
  line: string;
}

/** The final outcome: the player's wins, or with none the player's rank in each score (SHELL-099, SHELL-130). */
export function outcomeOf(player: string, scores: readonly RealmScores[], o: { atEndDate: boolean; earlierWins?: string[] }): Outcome {
  const winners = o.atEndDate ? scoreWinners(scores) : null;
  const wins = [...(o.earlierWins ?? []), ...(winners ? SCORES.filter((k) => winners[k].includes(player)) : [])];
  if (wins.length) {
    const shared = winners ? SCORES.filter((k) => wins.includes(k) && winners[k].length > 1) : [];
    return { wins, winners, ranks: null, line: `Victory: ${wins.join(", ")}${shared.length ? ` (shared: ${shared.join(", ")})` : ""}` };
  }
  const ranks = Object.fromEntries(SCORES.map((k) => [k, rankIn(scores, player, k)])) as Record<Score, number>;
  return { wins, winners, ranks, line: `No victory · ${SCORES.map((k) => `${k} ${ordinal(ranks[k])}`).join(" · ")}` };
}

const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

/** The ledger comparison: the player and the leading realms by their three scores (SHELL-099, D-SHELL-22). */
export function ledger(player: string, scores: readonly RealmScores[]): RealmScores[] {
  const total = (s: RealmScores): number => SCORES.reduce((a, k) => a + rankIn(scores, s.realm, k), 0);
  const leaders = [...scores].sort((a, b) => total(a) - total(b) || a.realm.localeCompare(b.realm)).slice(0, SHELL.ledgerLeaders);
  const me = scores.find((s) => s.realm === player);
  return me && !leaders.includes(me) ? [...leaders, me] : leaders;
}

export interface FinalResult {
  ledger: string[];
  outcome: string;
  achievements: string[];
  /** In a campaign that is not ironman, this line stands where the list would be (D-SHELL-21). */
  achievementsLine: string | null;
  choices: string[];
}

/** The final result: ledger comparison, outcome, achievements earned; Main menu or Credits, and Keep playing after a domination win before the end date (SHELL-099, SHELL-129). */
export function finalResult(sh: Shell, o: { ledger: string[]; outcome: string; achievements: string[] }): FinalResult {
  replaceAll(sh, { id: "final_result" });
  const c = sh.campaign;
  const ironman = c?.ironman ?? true;
  const keep = !!c && !!c.wins?.includes("World domination") && !reachedEnd.has(sh);
  return {
    ...o,
    achievements: ironman ? o.achievements : [],
    achievementsLine: ironman ? null : SHELL.strings.noAchievementsOutsideIronman,
    choices: [...(keep ? ["Keep playing"] : []), ...SHELL.finalResultChoices],
  };
}

const reachedEnd = new WeakSet<Shell>();

/** The end date has been reached: the campaign is over for good (SHELL-100). */
export function markEndDate(sh: Shell): void {
  reachedEnd.add(sh);
}

export function finalResultChoice(sh: Shell, choice: string): void {
  if (topId(sh) !== "final_result") throw new Error("The final result is not showing");
  if (choice === "Keep playing") {
    if (reachedEnd.has(sh) || !sh.campaign?.wins?.includes("World domination")) throw new Error("Keep playing comes only after a world domination win");
    ending.delete(sh);
    sh.events.push({ type: "KeptPlaying" });
    replaceAll(sh, { id: "map" });
  } else if (choice === "Credits") push(sh, { id: "credits", openedFrom: "final_result" });
  else if (choice === "Main menu") {
    openStartScreen(sh, sh.campaign?.realm);
    sh.campaign = null;
  } else throw new Error(`No final result choice ${choice}`);
}

/** There is no playing past the end date (SHELL-100). */
export const canPlayOnPastEnd = (sh: Shell): boolean => !ending.has(sh) && !reachedEnd.has(sh);

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

/** The app goes to the background: write the orders journal if anything changed, suspend sound; a running turn pauses with it (SHELL-101, SHELL-104, D-SHELL-5). */
export function appBackgrounded(sh: Shell): Backgrounded {
  const changed = sh.campaign?.changedSinceSave === true;
  sh.events.push({ type: "AppBackgrounded" });
  if (changed) {
    sh.events.push({ type: "SaveRequested", reason: "background", what: "orders journal" });
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

/** The world before the turn: the Resume save and the orders journal closed at End turn (SHELL-073, D-SHELL-5). */
export const PRE_TURN = "the Resume save and the orders journal" as const;

/** A killed app with a turn running restarts from the Resume save and the orders journal (SHELL-104, SHELL-079). */
export const saveAfterKillDuringTurn = (): typeof PRE_TURN => PRE_TURN;

export type Failure = "the engine worker crashes" | "a save won't read";

/** The one failure screen: what failed in plain words, Restore, Main menu, and Send a report where approved; never a stack trace (SHELL-107). */
export function failureScreen(sh: Shell, what: Failure, reporterApproved: boolean): { says: string; options: string[]; stackTrace: false } {
  replaceAll(sh, { id: "error", subject: what });
  const options = SHELL.failureOptions.filter((o) => o !== "Send a report" || reporterApproved);
  return { says: plainWords(what), options, stackTrace: false };
}

/** The failure as the player would say it: no codes, no paths. */
const plainWords = (what: Failure): string => `${what[0]!.toUpperCase()}${what.slice(1)}.`;

/** Restore the last save from X1: the Resume save and its orders journal (D-SHELL-5). */
export function restoreLastSave(sh: Shell): void {
  if (topId(sh) !== "error") throw new Error("The failure screen is not showing");
  sh.events.push({ type: "CampaignLoadRequested", save: "Resume save" });
  replaceAll(sh, { id: "loading", subject: "Resume save" });
}

