/**
 * The turn on screen (SHELL-069..082, INV-SHELL-8..11): End turn and its
 * badge, the turn in progress with orders frozen, 4-hour battle steps while a
 * battle the player fights runs (X-1) (time-and-turns' day loop pauses the month and Carry on
 * resumes it), events one at a time in date order, and the turn report.
 */
import type { GameDate } from "@ph/rules";
import { daysInMonth, nextMonth, playDay, type Battle, type DayLoop } from "../time-and-turns/index.ts";
import { turnStrip } from "../map-presentation/index.ts";
import { badgeCount, openWarnings } from "./attention.ts";
import { pop, push, SHELL, top, topId, type Frame, type Shell } from "./stack.ts";
import { logDispatches, newTurnOnDesk, receivePeaceOffer, type PeaceOfferOnScreen } from "./desk.ts";

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
  /** Peace offered to the player by AI realms at war with them (SHELL-141). */
  offers?: PeaceOfferOnScreen[];
}

export interface TurnSession {
  phase: TurnPhase;
  /** Unanswered events in date order. */
  events: PendingEvent[];
  answered: { id: string; option: string }[];
  month: MonthOnScreen | null;
  /** The battle shown in the battle view. */
  battle: Battle | null;
  /** Player battles running in 4-hour steps (X-1). */
  running: BattleRun[];
  /** Hours passed in battle steps this turn. */
  hoursPassed: number;
  /** Loop day the weekly turn ends on (X-18). */
  turnEnd: number;
  /** Battles of past turns, watchable again (SHELL-078). */
  fought: Battle[];
  report: string[];
}

export const newTurn = (): TurnSession => ({ phase: "orders", events: [], answered: [], month: null, battle: null, running: [], hoursPassed: 0, turnEnd: 0, fought: [], report: [] });

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
  newTurnOnDesk(sh);
  push(sh, { id: "turn" });
  // The orders journal is closed with this turn's orders: with the Resume save it is the world before the turn (SHELL-073, D-SHELL-5).
  sh.events.push({ type: "OrdersJournalClosed" });
  sh.events.push({ type: "EndTurnPressed" });
}

/** What the player may do on the map while the turn runs. */
export function mapAccepts(sh: Shell, input: "pan" | "zoom" | "order"): boolean {
  return input !== "order" || turnOf(sh).phase === "orders";
}

/** The parchment strip appears only for a turn running past 1.5 s (SHELL-072). */
export const longTurnStrip = (seconds: number) => turnStrip(seconds);

/**
 * Runs the month from time-and-turns day by day. On the day a player battle
 * begins, the battle view opens on it (and on any other player battle that
 * began that day); time then passes in 4-hour steps while they run (X-1).
 */
export function runTurn(sh: Shell, month: MonthOnScreen): void {
  const t = turnOf(sh);
  t.month = month;
  // A turn is one week: the day loop plays 7 days (X-18).
  t.turnEnd = month.loop.day + SHELL.turn.days;
  playUntilBattle(sh);
}

function playUntilBattle(sh: Shell): void {
  const t = turnOf(sh);
  const loop = t.month!.loop;
  const isPlayer = loop.rules.isPlayerBattle ?? (() => false);
  do {
    const before = loop.battles.length;
    playDay(loop);
    const begun = loop.battles.slice(before).filter(isPlayer);
    if (begun.length) return stopAtBattle(sh, begun[0]!, begun);
  } while (loop.day < t.turnEnd);
  finishMonth(sh);
}

/**
 * A player battle running in 4-hour steps (X-1): six steps a day for the days
 * it lasts. It ends when its steps run out (one side beaten) or the player
 * orders a retreat. The result cannot be skipped.
 */
export interface BattleRun {
  battle: Battle;
  step: number;
  steps: number;
  outcome: null | "ended" | "retreated";
}

const STEPS = SHELL.battleSteps;

function runOf(t: TurnSession, b: Battle): BattleRun {
  return { battle: b, step: 0, steps: Math.max(1, b.days) * STEPS.stepsPerDay, outcome: null };
}

/** A player battle began: the map flies there and the battle view opens; every player battle begun that day runs beside it (SHELL-074, SHELL-136). */
function stopAtBattle(sh: Shell, b: Battle, begun: Battle[]): void {
  const t = turnOf(sh);
  t.phase = "battle";
  for (const x of begun) if (!t.running.some((r) => r.battle.id === x.id)) t.running.push(runOf(t, x));
  t.battle = b;
  sh.camera = { ...sh.camera, on: b.place };
  if (topId(sh) === "battle") top(sh)!.subject = b.place;
  else push(sh, { id: "battle", subject: b.place, battleCard: "running" });
}

/** The battle frame on top, if the battle view is open. */
export const battleFrame = (sh: Shell): Frame | undefined => (topId(sh) === "battle" ? top(sh) : undefined);

function shownRun(sh: Shell): BattleRun {
  const t = turnOf(sh);
  const r = t.running.find((x) => x.battle === t.battle);
  if (!r) throw new Error("No player battle running");
  return r;
}

/** ChangeStandingOrdersForBattle: at any step of the battle shown, for this one battle (X-1). */
export function changeBattleOrders(sh: Shell, orders: string): void {
  const r = shownRun(sh);
  if (r.outcome) throw new Error("That battle has ended");
  r.battle.orders = orders;
  const f = battleFrame(sh);
  if (f) f.orders = orders;
  sh.events.push({ type: "BattleOrdersChanged", battle: r.battle.id, orders });
}

/** Retreat: the battle shown (or the one named) ends with a retreat at this step (X-1, SHELL-075). */
export function retreat(sh: Shell, battleId?: string): void {
  const t = turnOf(sh);
  const r = battleId ? t.running.find((x) => x.battle.id === battleId) : shownRun(sh);
  if (!r || r.outcome) throw new Error("No running battle to retreat from");
  r.outcome = "retreated";
  sh.events.push({ type: "BattleRetreatOrdered", battle: r.battle.id, step: r.step });
  settleIfAllDone(sh);
}

/** One 4-hour step: one round of every running player battle (X-1). */
export function stepBattles(sh: Shell): void {
  const t = turnOf(sh);
  for (const r of t.running) {
    if (r.outcome) continue;
    r.step++;
    if (r.step >= r.steps) r.outcome = "ended";
  }
  t.hoursPassed += STEPS.hoursPerStep;
  settleIfAllDone(sh);
}

function settleIfAllDone(sh: Shell): void {
  const t = turnOf(sh);
  if (t.running.length && t.running.every((r) => r.outcome)) {
    const f = sh.stack.find((x) => x.id === "battle" && !x.replay);
    if (f) f.battleCard = "result";
    else push(sh, { id: "battle", subject: t.battle?.place ?? "", battleCard: "result" });
  }
}

/** Steps until the battle shown has ended (its rounds run out). */
export function battleEnds(sh: Shell): void {
  const r = shownRun(sh);
  while (!r.outcome) stepBattles(sh);
}

/** The battle view: the battle shown, its progress, Standing orders and Retreat, and the switcher when more than one runs; no skip (SHELL-074, SHELL-075). */
export function battleView(sh: Shell): { place: string; step: number; steps: number; hours: number; orders: string | undefined; buttons: string[]; switcher: ReturnType<typeof battleSwitcher> | null; skip: false } {
  const r = shownRun(sh);
  const t = turnOf(sh);
  return {
    place: r.battle.place,
    step: r.step,
    steps: r.steps,
    hours: r.step * STEPS.hoursPerStep,
    orders: r.battle.orders,
    buttons: r.outcome ? [] : [...SHELL.battleViewButtons],
    switcher: t.running.length > 1 ? battleSwitcher(sh) : null,
    skip: false,
  };
}

/** The battle switcher: each running player battle with its progress (X-1, SHELL-136). */
export function battleSwitcher(sh: Shell): { id: string; place: string; progress: string; share: number; outcome: BattleRun["outcome"]; shown: boolean }[] {
  const t = turnOf(sh);
  return t.running.map((r) => ({ id: r.battle.id, place: r.battle.place, progress: `${r.step} / ${r.steps}`, share: r.step / r.steps, outcome: r.outcome, shown: r.battle === t.battle }));
}

/** Switch the view to another running battle; the map flies there (SHELL-136). */
export function switchBattle(sh: Shell, battleId: string): void {
  const t = turnOf(sh);
  const r = t.running.find((x) => x.battle.id === battleId);
  if (!r) throw new Error(`No running battle ${battleId}`);
  t.battle = r.battle;
  sh.camera = { ...sh.camera, on: r.battle.place };
  const f = battleFrame(sh);
  if (f) f.subject = r.battle.place;
  else push(sh, { id: "battle", subject: r.battle.place, battleCard: "running" });
}

/** The result card once every running battle has ended: each result, Carry on. */
export function resultCard(sh: Shell): { results: { place: string; outcome: BattleRun["outcome"]; result: unknown }[]; offers: "Carry on" } {
  const t = turnOf(sh);
  return { results: t.running.map((r) => ({ place: r.battle.place, outcome: r.outcome, result: r.battle.result })), offers: "Carry on" };
}

/** CarryOn: every player battle has ended; the day loop goes back to whole days until the next player battle or the month's end (SHELL-076). */
export function carryOn(sh: Shell): void {
  const t = turnOf(sh);
  const f = battleFrame(sh);
  if (!f || f.battleCard !== "result" || !t.month || !t.running.length) throw new Error("No result card showing");
  for (const r of t.running) if (!t.fought.includes(r.battle)) t.fought.push(r.battle);
  sh.events.push({ type: "TurnResumed", battles: t.running.map((r) => r.battle.id) });
  pop(sh);
  t.running = [];
  t.battle = null;
  t.phase = "in progress";
  playUntilBattle(sh);
}

function finishMonth(sh: Shell): void {
  const t = turnOf(sh);
  const month = t.month!;
  for (const b of month.loop.battles) if (!t.fought.includes(b)) t.fought.push(b);
  while (sh.stack.some((f) => f.id === "turn")) pop(sh);
  if (sh.campaign) advanceWeek(sh);
  t.report = [...month.report];
  for (const o of month.offers ?? []) receivePeaceOffer(sh, o);
  raiseEvents(sh, month.events);
  if (t.events.length) {
    t.phase = "events";
    openEvent(sh, t.events[0]!);
  } else showReport(sh);
}

/** The date moves on by one week; a new month begins when the days run past its end (X-18). */
function advanceWeek(sh: Shell): void {
  const c = sh.campaign!;
  let day = (c.day ?? 1) + SHELL.turn.days;
  const dim = daysInMonth(c.date.year, c.date.month);
  if (day > dim) {
    day -= dim;
    c.date = nextMonth(c.date);
  }
  c.day = day;
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

/** The week's report goes into the Dispatches log, newest first, and never opens by itself (SHELL-147 replaces SHELL-082's slide-in). */
function showReport(sh: Shell): void {
  const t = turnOf(sh);
  t.phase = "orders";
  const c = sh.campaign;
  const day = c ? `${c.date.year}-${String(c.date.month).padStart(2, "0")}-${String(c.day ?? 1).padStart(2, "0")}` : "";
  logDispatches(sh, t.report.map((text) => ({ day, text, mine: true })));
}

/** A battle from the News replays; Back returns where it was opened (SHELL-078, SHELL-090). */
export function replayBattle(sh: Shell, battle: string, from: string): Frame {
  const t = turnOf(sh);
  const b = t.fought.find((x) => x.place === battle || x.id === battle);
  if (!b) throw new Error(`No battle ${battle} to replay`);
  return push(sh, { id: "battle", subject: b.place, replay: true, openedFrom: from, battleCard: "running" });
}

export const currentDate = (sh: Shell): GameDate | null => sh.campaign?.date ?? null;

/** The battle view offers Standing orders and Retreat; nothing skips the result (X-1, SHELL-074). */
export const battleViewButtons = (): string[] => [...SHELL.battleViewButtons];

/** The day the battle shown began on. */
export const stoppedOnDay = (sh: Shell): number | null => turnOf(sh).battle?.day ?? null;
