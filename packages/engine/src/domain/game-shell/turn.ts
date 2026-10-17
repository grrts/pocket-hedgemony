/**
 * The turn on screen (SHELL-069..082, INV-SHELL-8..11): End turn and its
 * badge, the turn in progress with orders frozen, a stop at every battle the
 * player fights (time-and-turns' day loop pauses the month and Carry on
 * resumes it), events one at a time in date order, and the turn report.
 */
import type { GameDate } from "@ph/rules";
import { carryOn as resumeMonth, nextMonth, playMonth, type Battle, type DayLoop } from "../time-and-turns/index.ts";
import { turnStrip } from "../map-presentation/index.ts";
import { badgeCount, openWarnings } from "./attention.ts";
import { pop, push, top, topId, type Frame, type Shell } from "./stack.ts";

export type TurnPhase = "orders" | "in progress" | "battle" | "events" | "report";

export interface PendingEvent {
  id: string;
  /** Day the event was raised, ISO (YYYY-MM-DD). */
  date: string;
  options: string[];
  /** Each option's effects, shown on tap or focus. */
  effects?: Record<string, string>;
}

export interface MonthOnScreen {
  /** The month's day loop from time-and-turns; it stops at player battles. */
  loop: DayLoop;
  events: PendingEvent[];
  /** Lines worth reporting; none means no turn report. */
  report: string[];
}

export interface TurnSession {
  phase: TurnPhase;
  /** Unanswered events in date order. */
  events: PendingEvent[];
  answered: { id: string; option: string }[];
  month: MonthOnScreen | null;
  battle: Battle | null;
  /** Battles of past turns, watchable again (SHELL-078). */
  fought: Battle[];
  report: string[];
}

export const newTurn = (): TurnSession => ({ phase: "orders", events: [], answered: [], month: null, battle: null, fought: [], report: [] });

const sessions = new WeakMap<Shell, TurnSession>();

/** The shell's turn session (one per player turn on screen). */
export function turnOf(sh: Shell): TurnSession {
  let t = sessions.get(sh);
  if (!t) sessions.set(sh, (t = newTurn()));
  return t;
}

/** Events raised for the player queue in date order (policy from events). */
export function raiseEvents(sh: Shell, events: PendingEvent[]): void {
  const t = turnOf(sh);
  t.events = [...t.events, ...events].sort((a, b) => a.date.localeCompare(b.date));
}

/** The End turn button: the hourglass with the Attention count, or the event scroll with the event count (SHELL-049, SHELL-070). */
export function endTurnButton(sh: Shell): { icon: "hourglass" | "event scroll"; count: number; turning: boolean; corner: "lower right" } {
  const t = turnOf(sh);
  const turning = t.phase !== "orders";
  if (t.events.length) return { icon: "event scroll", count: t.events.length, turning, corner: "lower right" };
  return { icon: "hourglass", count: badgeCount(sh.attention), turning, corner: "lower right" };
}

export type EndTurnOutcome =
  | { result: "event opened"; event: string }
  | { result: "question"; question: string; choices: string[] }
  | { result: "turn started" }
  | { result: "ignored" };

/** EndTurn: one tap; blocked by unanswered events; a question only where Settings asks (SHELL-069, SHELL-070, SHELL-088). */
export function pressEndTurn(sh: Shell): EndTurnOutcome {
  const t = turnOf(sh);
  if (t.phase !== "orders") return { result: "ignored" };
  const first = t.events[0];
  if (first) {
    openEvent(sh, first);
    return { result: "event opened", event: first.id };
  }
  const setting = sh.settings.confirmEndTurn;
  const lines = badgeCount(sh.attention);
  if (setting === "Always" || (setting === "When the Attention screen has lines" && lines > 0)) {
    const warnings = openWarnings(sh.attention);
    const choices = warnings > 0 ? ["Look", "End turn anyway"] : ["End turn", "Cancel"];
    const question = warnings > 0 ? `${warnings} warnings wait for you · Look · End turn anyway` : "End turn";
    push(sh, { id: "confirmation", subject: question, decideLater: true });
    return { result: "question", question, choices };
  }
  startTurn(sh);
  return { result: "turn started" };
}

/** Answers the End turn question: Look opens Attention; End turn anyway starts the turn (warnings never block). */
export function answerEndTurnQuestion(sh: Shell, choice: string): void {
  if (topId(sh) !== "confirmation") throw new Error("No End turn question open");
  pop(sh);
  if (choice === "Look") push(sh, { id: "attention" });
  else if (choice === "End turn anyway" || choice === "End turn") startTurn(sh);
}

/** The turn in progress: the turn overlay over the live map, orders frozen (SHELL-071, INV-SHELL-9). */
export function startTurn(sh: Shell): void {
  const t = turnOf(sh);
  t.phase = "in progress";
  push(sh, { id: "turn" });
  sh.events.push({ type: "EndTurnPressed" });
}

/** What the player may do on the map while the turn runs. */
export function mapAccepts(sh: Shell, input: "pan" | "zoom" | "order"): boolean {
  return input !== "order" || turnOf(sh).phase === "orders";
}

/** The parchment strip appears only for a turn running past 1.5 s (SHELL-072). */
export const longTurnStrip = (seconds: number) => turnStrip(seconds);

/** Runs the month from time-and-turns until a player battle or the month's end. */
export function runTurn(sh: Shell, month: MonthOnScreen): void {
  const t = turnOf(sh);
  t.month = month;
  const b = playMonth(month.loop);
  if (b) stopAtBattle(sh, b);
  else finishMonth(sh);
}

function stopAtBattle(sh: Shell, b: Battle): void {
  const t = turnOf(sh);
  t.phase = "battle";
  t.battle = b;
  sh.camera = { ...sh.camera, on: b.place };
  push(sh, { id: "battle", subject: b.place, battleCard: "before" });
}

/** The battle frame on top, if the turn is stopped at a battle. */
export const battleFrame = (sh: Shell): Frame | undefined => (topId(sh) === "battle" ? top(sh) : undefined);

/** ChangeStandingOrdersForBattle: only for this one battle. */
export function changeBattleOrders(sh: Shell, orders: string): void {
  const f = battleFrame(sh);
  if (!f || f.battleCard !== "before") throw new Error("No before-the-battle card");
  f.orders = orders;
  sh.events.push({ type: "BattleOrdersChanged", orders });
}

/** Fight plays bell by bell; Skip to result jumps to the result card at any moment (SHELL-075). */
export function fight(sh: Shell): void {
  const f = battleFrame(sh);
  if (!f) throw new Error("No battle");
  f.battleCard = "playing";
}

export function skipToResult(sh: Shell): void {
  const f = battleFrame(sh);
  if (!f) throw new Error("No battle");
  f.battleCard = "result";
}

/** Bells end: the battle reaches its result card. */
export function battleEnds(sh: Shell): void {
  skipToResult(sh);
}

/** The result card: who won, men lost, the one-line reason, Carry on. */
export function resultCard(sh: Shell): { result: unknown; offers: "Carry on" } {
  const t = turnOf(sh);
  return { result: t.battle?.result, offers: "Carry on" };
}

/** CarryOn: the turn resumes to the next player battle or the end of the month (SHELL-076). */
export function carryOn(sh: Shell): void {
  const t = turnOf(sh);
  const f = battleFrame(sh);
  if (!f || f.battleCard !== "result" || !t.month || !t.battle) throw new Error("No result card showing");
  t.fought.push(t.battle);
  sh.events.push({ type: "TurnResumed", battle: t.battle.id });
  pop(sh);
  t.battle = null;
  t.phase = "in progress";
  const next = resumeMonth(t.month.loop);
  if (next) stopAtBattle(sh, next);
  else finishMonth(sh);
}

function finishMonth(sh: Shell): void {
  const t = turnOf(sh);
  const month = t.month!;
  for (const b of month.loop.battles) if (!t.fought.includes(b)) t.fought.push(b);
  while (sh.stack.some((f) => f.id === "turn")) pop(sh);
  if (sh.campaign) sh.campaign.date = nextMonth(sh.campaign.date);
  t.report = month.report;
  raiseEvents(sh, month.events);
  if (t.events.length) {
    t.phase = "events";
    openEvent(sh, t.events[0]!);
  } else showReport(sh);
}

function openEvent(sh: Shell, e: PendingEvent): void {
  push(sh, { id: "event", subject: e.id, decideLater: true });
}

/** The event card on top: picture, text, two or three options, each showing its effects (SHELL-080). */
export function eventCard(sh: Shell): { id: string; options: string[]; effects: (option: string) => string } | null {
  const f = top(sh);
  if (f?.id !== "event") return null;
  const e = turnOf(sh).events.find((x) => x.id === f.subject)!;
  return { id: e.id, options: e.options, effects: (o) => e.effects?.[o] ?? "" };
}

/** AnswerEvent: the player chooses; the next event in date order opens, then the report. */
export function answerEvent(sh: Shell, option: string): void {
  const t = turnOf(sh);
  const f = top(sh);
  if (f?.id !== "event") throw new Error("No event open");
  t.events = t.events.filter((e) => e.id !== f.subject);
  t.answered.push({ id: f.subject!, option });
  sh.events.push({ type: "EventAnswered", event: f.subject, option });
  pop(sh);
  const next = t.events[0];
  if (next) openEvent(sh, next);
  else if (t.phase === "events") showReport(sh);
}

/** LookAtMap: the event shrinks into the End turn badge, still unanswered (SHELL-081). */
export function lookAtMap(sh: Shell): void {
  if (topId(sh) !== "event") throw new Error("No event open");
  pop(sh);
  turnOf(sh).phase = "orders";
}

function showReport(sh: Shell): void {
  const t = turnOf(sh);
  t.phase = "orders";
  if (t.report.length) push(sh, { id: "turn_report" });
}

/** A battle from the turn report or the Chronicle replays; Back returns where it was opened (SHELL-078, SHELL-090). */
export function replayBattle(sh: Shell, battle: string, from: string): Frame {
  const t = turnOf(sh);
  const b = t.fought.find((x) => x.place === battle || x.id === battle);
  if (!b) throw new Error(`No battle ${battle} to replay`);
  return push(sh, { id: "battle", subject: b.place, replay: true, openedFrom: from, battleCard: "playing" });
}

export const currentDate = (sh: Shell): GameDate | null => sh.campaign?.date ?? null;
