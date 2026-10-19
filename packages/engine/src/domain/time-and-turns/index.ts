import type { GameDate, Ruleset } from "@ph/rules";
import config from "../../../../rules/data/domain/time-and-turns.json" with { type: "json" };
import { hashWorld } from "../../hash.ts";
import { Rng } from "../../rng.ts";
import { processTurn, type Order, type TurnReport } from "../../turn.ts";
import { createWorld, type World } from "../../world.ts";

/**
 * Time and turns (domain/time-and-turns/spec.md): the calendar, the campaign
 * clock and its End turn pipeline, the day loop every mover shares, cadences
 * and the turn order of DECISIONS X-2, seasons (X-4), and ages and eras on
 * the calendar cut at the end date (X-14).
 */

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

// ---------------------------------------------------------------------------
// Calendar

/** The month after a date: December rolls over to January of the next year. */
export function nextMonth(d: GameDate): GameDate {
  return d.month === 12 ? { year: d.year + 1, month: 1 } : { year: d.year, month: d.month + 1 };
}

export function compareDates(a: GameDate, b: GameDate): number {
  return a.year - b.year || a.month - b.month;
}

/** "May 1492" → { year: 1492, month: 5 }. */
export function parseMonthYear(text: string): GameDate {
  const m = text.trim().match(/^([A-Za-z]+)\s+(\d{3,4})$/);
  const month = m ? MONTHS.findIndex((n) => n.toLowerCase() === m[1]!.toLowerCase()) + 1 : 0;
  if (!m || month < 1) throw new Error(`not a month and year: ${text}`);
  return { year: Number(m[2]), month };
}

export function formatMonthYear(d: GameDate): string {
  return `${MONTHS[d.month - 1]} ${d.year}`;
}

/** A calendar day as an ISO date (YYYY-MM-DD). */
export type IsoDate = string;

/** First day of a month as an ISO date. */
export function firstDay(d: GameDate): IsoDate {
  return `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-01`;
}

// ---------------------------------------------------------------------------
// Campaign clock and the End turn pipeline

/** Rules chosen at new game and saved with the campaign; never settings (TIME-038). */
export interface CampaignRules {
  endDate: IsoDate;
  difficulty?: string;
  events?: string;
  [rule: string]: string | boolean | undefined;
}

export const CAMPAIGN_RULE_KEYS: readonly string[] = config.campaignRules;
export const DEFAULT_END_DATE: IsoDate = config.endDate;

export function isCampaignRule(key: string): boolean {
  return CAMPAIGN_RULE_KEYS.includes(key);
}

/**
 * Settings live outside the campaign and never reach the turn processor
 * (TIME-037). A setting that names a campaign rule is refused (TIME-038).
 */
export function changeSetting(settings: Record<string, unknown>, key: string, value: unknown): boolean {
  if (isCampaignRule(key)) return false;
  settings[key] = value;
  return true;
}

export type ClockPhase = "between turns" | "running" | "ended";

export interface QueuedOrder {
  nation: number;
  order: Order;
}

export interface CampaignEnd {
  date: GameDate;
  reason: "end date" | "victory";
  /** What follows, in order (TIME-007). */
  finale: readonly string[];
}

/** A win declared during the campaign (X-12). */
export interface CampaignWin {
  nation: string;
  way: "world domination" | "best at the end";
  date: GameDate;
}

export interface Campaign {
  world: World;
  rules: Readonly<CampaignRules>;
  phase: ClockPhase;
  /** Orders given during the month, applied only at End turn (TIME-012). */
  queue: QueuedOrder[];
  /** The last turn-boundary copy of the world: the only state a save can represent (TIME-040). */
  boundary: World;
  /** Events the player has not answered; they block End turn (TIME-017). */
  unansweredEvents: string[];
  ended: CampaignEnd | null;
  /** Wins declared so far; a domination win does not end the campaign (D-TIME-10). */
  wins: CampaignWin[];
  /** The orders of the turn being processed, kept until it ends so a killed turn can run again (D-TIME-7). */
  journal: QueuedOrder[] | null;
  /** The first day of the next turn (X-18). */
  calendar: CalendarDay;
  /** Weekly turns played (X-18). */
  turns: number;
}

export const FINALE = ["final wrap-up events", "closing sequence", "final result"] as const;

/** The first day of every campaign, the tutorial included: 11 November 1444 (X-5, D-TIME-1). */
export const START_DATE: GameDate = { year: config.startDate.year, month: config.startDate.month };
export const START_DAY: number = config.startDate.day;

/** NewGame: the clock on 11 November 1444, turn 0, the Rng seeded (TIME-005, TIME-006). */
export function newCampaign(rules: Ruleset, seed: number, options: Partial<CampaignRules> = {}): Campaign {
  const world = createWorld(rules, seed);
  world.date = worldDateOf(START_CALENDAR_DAY);
  world.turn = 0;
  return campaignOf(world, options);
}

/** Wraps an existing world (for example a loaded one) in a campaign clock. */
export function campaignOf(world: World, options: Partial<CampaignRules> = {}): Campaign {
  const campaignRules = Object.freeze({ ...options, endDate: options.endDate ?? DEFAULT_END_DATE }) as Readonly<CampaignRules>;
  const day = (world.date as { day?: number }).day;
  const calendar: CalendarDay =
    day !== undefined ? { year: world.date.year, month: world.date.month, day }
    : world.date.year === START_DATE.year && world.date.month === START_DATE.month ? { ...START_CALENDAR_DAY }
    : { year: world.date.year, month: world.date.month, day: 1 };
  return { world, rules: campaignRules, phase: "between turns", queue: [], boundary: copyWorld(world), unansweredEvents: [], ended: null, wins: [], journal: null, calendar, turns: world.turn };
}

/**
 * Setup and warm-up (for example trade's months of traders before the first
 * turn) draw from the campaign's one Rng and move neither the date nor the
 * turn counter (D-TIME-11).
 */
/** The world's date for a calendar day: year and month, plus the day for an engine core whose GameDate carries one (X-3, X-18). */
export function worldDateOf(d: CalendarDay): GameDate {
  return Object.assign({ year: d.year, month: d.month }, { day: d.day });
}

export function warmUp(c: Campaign, months: number, step: (rng: Rng, month: number) => void): void {
  const date = { ...c.world.date };
  const turn = c.world.turn;
  for (let m = 0; m < months; m++) step(c.world.rng, m);
  c.world.date = date;
  c.world.turn = turn;
  c.boundary = copyWorld(c.world);
}

/**
 * The order the queued orders are applied in: the player's first, then each
 * AI realm's in ascending nation index; a nation's own orders keep the order
 * they were given in (X-2, D-TIME-12).
 */
export function orderedQueue(queue: readonly QueuedOrder[], player: number): QueuedOrder[] {
  const rank = (n: number) => (n === player ? -1 : n);
  return queue.map((q, i) => ({ q, i })).sort((a, b) => rank(a.q.nation) - rank(b.q.nation) || a.i - b.i).map((x) => x.q);
}

export type Input = "order" | "pan" | "zoom";

/** While a turn runs, orders are frozen but the map can still be panned and zoomed (TIME-016). */
export function acceptsInput(c: Campaign, input: Input): boolean {
  if (input === "pan" || input === "zoom") return true;
  return c.phase === "between turns";
}

/** Queues an order for End turn; nothing in the world changes yet (TIME-012). */
export function giveOrder(c: Campaign, nation: number, order: Order): boolean {
  if (!acceptsInput(c, "order")) return false;
  c.queue.push({ nation, order });
  return true;
}

export type EndTurnResult =
  | { ended: true; report: TurnReport; campaignEnded: CampaignEnd | null }
  | { ended: false; reason: "unanswered event"; opened: string }
  | { ended: false; reason: "campaign over" };

/**
 * End turn for one acting nation: refused while an event is unanswered
 * (nothing answers it for the player) or after the end date; otherwise the
 * queued orders are applied and the turn processed. `during` runs while the
 * turn is in progress, for anything that tries to act meanwhile.
 */
export function endTurn(c: Campaign, nation: number, during?: (c: Campaign) => void): EndTurnResult {
  if (c.ended) return { ended: false, reason: "campaign over" };
  const first = c.unansweredEvents[0];
  if (first !== undefined) return { ended: false, reason: "unanswered event", opened: first };

  c.boundary = copyWorld(c.world);
  c.phase = "running";
  c.journal = orderedQueue(c.queue, nation);
  const orders = c.journal.filter((q) => q.nation === nation).map((q) => q.order);
  c.queue = c.queue.filter((q) => q.nation !== nation);
  during?.(c);
  const span = turnSpan(c.calendar, c.rules.endDate);
  // The clock keeps the real date: 7 days a turn (X-18). An older engine core plays a whole
  // month per call; either way the world's date is set to the turn's next day afterwards.
  const report = processTurn(c.world, orders, nation);
  c.calendar = span.next;
  c.turns += 1;
  c.world.date = worldDateOf(span.next);
  c.world.turn = c.turns;
  c.phase = "between turns";
  c.journal = null;
  c.boundary = copyWorld(c.world);

  if (span.final || isoOf(c.calendar) > c.rules.endDate) endCampaign(c, "end date");
  return { ended: true, report, campaignEnded: c.ended };
}

/** EndCampaign: no more turns; the wrap-up, closing sequence and final result follow (TIME-007, TIME-008). */
export function endCampaign(c: Campaign, reason: CampaignEnd["reason"]): CampaignEnd {
  c.ended = { date: { ...c.world.date }, reason, finale: FINALE };
  c.phase = "ended";
  return c.ended;
}

/**
 * A turn killed while it ran is processed again from the last turn-boundary
 * save with the same orders, giving the same result; a turn merely
 * backgrounded pauses with the app and carries on (D-TIME-7).
 */
export function resumeKilledTurn(boundary: World, journal: readonly QueuedOrder[], options: Partial<CampaignRules>, nation: number): { campaign: Campaign; result: EndTurnResult } {
  const c = campaignOf(copyWorld(boundary), options);
  c.queue = journal.map((q) => ({ ...q }));
  return { campaign: c, result: endTurn(c, nation) };
}

/** World domination is checked in every January turn (X-12, D-TIME-10). */
export function dominationCheckDue(date: GameDate): boolean {
  return date.month === config.victory.checkMonth;
}

/** Owning or holding as subjects half of the world's settled land provinces. */
export function dominationReached(held: number, settled: number): boolean {
  return settled > 0 && held >= settled * config.victory.dominationShare;
}

/**
 * The January check: reaching domination wins at once, and the campaign goes
 * on, so the player may keep playing to the end date (X-12).
 */
export function checkDomination(c: Campaign, nation: string, held: number, settled: number, date: GameDate = c.world.date): CampaignWin | null {
  if (!dominationCheckDue(date) || !dominationReached(held, settled)) return null;
  if (c.wins.some((w) => w.nation === nation && w.way === "world domination")) return null;
  const win: CampaignWin = { nation, way: "world domination", date: { ...date } };
  c.wins.push(win);
  return win;
}

export type Score = "Economy" | "Power" | "Technology";
export const SCORES = config.victory.scores as Score[];

/**
 * Best at the end: judged only when the campaign ends, each score won by the
 * realm that leads it, with no margin; ties share the win (X-12). Realm owns
 * how scores are worked out.
 */
export function bestAtTheEnd(scores: Record<string, Record<Score, number>>): Record<Score, string[]> {
  const out = {} as Record<Score, string[]>;
  for (const k of SCORES) {
    const top = Math.max(...Object.values(scores).map((r) => r[k]));
    out[k] = Object.keys(scores).filter((n) => scores[n]![k] === top);
  }
  return out;
}

/** A save asked for at any moment holds the last turn boundary, never a half-run turn (TIME-040). */
export function requestSave(c: Campaign): World {
  return copyWorld(c.phase === "running" ? c.boundary : c.world);
}

/** The End turn question, when the confirmation setting is on and warnings are open (TIME-018). */
export function endTurnQuestion(setting: "on" | "off", warnings: number): { question: string; choices: readonly string[]; proceed: string } | null {
  if (setting === "off" || warnings === 0) return null;
  const q = config.endTurnConfirmation;
  return { question: q.question.replace("{n}", String(warnings)), choices: q.choices, proceed: q.proceed };
}

/** The shape of an order, the same for player and AI (TIME-011). */
export function orderShape(order: Order): string {
  switch (order.type) {
    case "move":
      return "move army to province";
    case "declareWar":
      return "declare war on country";
    case "offerPeace":
      return "offer peace to country";
    case "answerCall":
      return "answer call to arms";
    case "answerPeace":
      return "answer peace offer";
    case "recruit":
      return "recruit in province";
    case "cancelRecruit":
      return "cancel recruits in province";
    case "pickUp":
      return "pick up recruits";
    case "commission":
      return "commission official as commander";
    case "release":
      return "release commander";
    case "train":
      return "train troops";
    case "dismiss":
      return "send troops home";
    case "split":
      return "split army";
    case "hire":
      return "hire company";
    case "merge":
      return "merge armies";
    case "appoint":
      return "appoint commander";
    case "disband":
      return "disband army";
    case "setTax":
      return "set tax rate";
    case "borrow":
      return "take a loan";
    case "repay":
      return "repay a loan";
    case "gift":
      return "give a lord gold";
    case "grantFief":
      return "grant a fief";
    case "seizeFief":
      return "seize a fief";
    case "swapOfficials":
      return "move an official to another province";
    case "hireOfficial":
      return "hire an official";
    case "settleLand":
      return "keep new land as royal land";
    case "answerRevolution":
      return "answer the revolution";
    case "setStudy":
      return "choose what to study";
    case "queueStudy":
      return "add to the study queue";
    case "queuePath":
      return "queue the path to an invention";
    case "unqueueStudy":
      return "take a study off the queue";
    case "moveQueuedStudy":
      return "move a queued study";
    case "setSeats":
      return "set school seats to fill";
    case "callStudentsToArms":
      return "call students to arms";
    case "foundSchool":
      return "found a school in province";
    case "build":
      return "build in province";
    case "cancelBuild":
      return "cancel a work in province";
    case "changeTile":
      return "change a tile's use in province";
    case "stopChange":
      return "stop a tile change in province";
    case "sendEnvoy":
      return "send an envoy";
    case "breakAlliance":
      return "break an alliance";
    case "makeDemand":
      return "make a demand";
    case "heritageCounsel":
      return "ask the court about an ambition";
    case "heritageChoice":
      return "choose a golden age or legacy";
    case "answerEvent":
      return "answer an event";
    case "answerAsk":
      return "answer an envoy";
    case "subjectAction":
      return "act on a subject";
    case "riseUp":
      return "rise against an overlord";
    case "subjectChoice":
      return "a subject's choice toward its overlord";
    case "court":
      return "court a foreign lord or subject";
    case "moveBuild":
      return "move a work in the province's queue";
    case "setFood":
      return "set the food policy";
    case "foodPreset":
      return "fill the food policy from a preset";
    case "reform":
      return "reform the government";
    case "foundTrader":
      return "found a trader";
    case "setTradeRoute":
      return "set a trader's route";
    case "draftTradeRoute":
      return "draw a trader's route";
    case "dismissTrader":
      return "dismiss a trader";
    case "answerRevolution":
      return "answer a revolution";
    case "answerRebels":
      return "answer a rising";
    case "answerRevolution":
      return "answer the revolution";
    case "treatRebels":
      return "judge beaten rebels";
    case "answerRevolution":
      return "answer a revolution";
    case "navy":
      return `navy: ${order.do}`;
    case "explore":
      return `explore: ${order.do}`;
    case "tonguePolicy":
      return "set the Language policy";
    case "faithPolicy":
      return "set a Faith policy";
    case "conclaveGold":
      return "send gold to the conclave";
    case "claimCaliphate":
      return "claim the caliphate";
    case "raiseOwnPatriarch":
      return "raise our own patriarch";
    case "answerRevolution":
      return "answer the revolution";
    case "empire":
      return "act in the Empire";
    case "tribes":
      return "act on a hunting ground";
    case "keepPlaying":
      return "keep playing after a win";
    case "playOn":
      return "play on as another realm";
  }
}

/**
 * A copy of the world at a turn boundary: every simulation array copied, the
 * Rng carried on from the same state. The rules may be swapped, as when a
 * save is loaded under a balance change (TIME-036, TIME-042).
 */
export function copyWorld(world: World, rules: Ruleset = world.rules): World {
  const copy = (v: unknown): unknown => {
    if (ArrayBuffer.isView(v)) return (v as unknown as { slice(): unknown }).slice();
    if (v instanceof Rng) return new Rng(v.state);
    if (v instanceof Map) return new Map(v);
    if (v instanceof Set) return new Set(v);
    if (Array.isArray(v)) return v.map(copy);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)]));
    return v;
  };
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(world)) out[k] = k === "rules" ? rules : copy(v);
  return out as unknown as World;
}

export { hashWorld };

// ---------------------------------------------------------------------------
// The day loop

export type DayPhase = "move" | "stopChecks" | "contact" | "battles" | "standingOrders";
export const DAY_PHASES = config.dayPhases as DayPhase[];

/** Anything with a place, a route and progress: armies, fleets, trade ships, traders (TIME-022). */
export interface Mover {
  id: string;
  kind: string;
  side: string;
  at: string;
  /** Places still to go through, in order. */
  route: string[];
  /** Days for each step of the route. */
  stepDays: number[];
  /** Days already walked toward route[0]; carries over between months (TIME-024). */
  progress: number;
}

export type BattleEnd = "beaten" | "retreat";

export interface Battle {
  id: string;
  /** Day of the loop (1-based, counted across months) the battle starts. */
  day: number;
  place: string;
  /** Sides (mover sides or country names) fighting. */
  sides: string[];
  /** Mover ids in the battle; armies that march in later join it (X-1). */
  movers: string[];
  /** Days it lasts when nobody retreats and warfare names no loser sooner: six rounds a day (X-1). */
  days: number;
  /** Rounds fought so far, one per 4-hour step. */
  rounds: number;
  /** How it ended; unset while it runs. */
  ended?: BattleEnd;
  /** Day and 4-hour step (1–6) it ended. */
  endedAt?: { day: number; step: number };
  result?: unknown;
  /** Standing orders the player set while it ran (X-1). */
  orders?: string;
}

export type LogEntry =
  | { day: number; phase: DayPhase; kind?: string; step?: number }
  | { day: number; arrived: string; at: string; step?: number }
  | { day: number; blocked: string; at: string; to: string }
  | { day: number; stopped: string; at: string }
  | { day: number; met: [string, string]; at: string }
  | { day: number; battleStarted: string }
  | { day: number; joined: string; battle: string }
  | { day: number; round: string; step: number }
  | { day: number; battleResolved: string; step: number; ended: BattleEnd }
  | { day: number; steppedDay: true }
  | { day: number; dayStep: string }
  | { day: number; weekStep: string };

/** The rules each mover kind plugs into the shared loop (troop-movement 11.1). */
export interface DayRules {
  mayEnter?: (m: Mover, place: string, loop: DayLoop) => boolean;
  stopsAt?: (m: Mover, place: string, loop: DayLoop) => boolean;
  hostile?: (a: Mover, b: Mover) => boolean;
  /** A meeting may start a battle (warfare decides whether and how long). */
  onMeet?: (a: Mover, b: Mover, loop: DayLoop) => Omit<Battle, "id" | "day" | "place" | "rounds"> | null;
  standingOrders?: (loop: DayLoop) => void;
  /** Fights one round; returns true when a side is beaten (warfare owns how). */
  fightRound?: (b: Battle, loop: DayLoop) => boolean;
  /** Works out the result when a battle ends (warfare owns how). */
  resolveBattle?: (b: Battle, loop: DayLoop) => unknown;
  /** True for a battle the player's army or fleet is in; only those slow the day (X-1). */
  isPlayerBattle?: (b: Battle) => boolean;
  /** Called after each 4-hour step of a slowed day: the player may change orders, retreat or switch battles. */
  onPlayerStep?: (loop: DayLoop, running: Battle[]) => void;
}

export interface DayLoop {
  movers: Mover[];
  rules: DayRules;
  /** Days in a month for a loop that does not follow the calendar (tests); 0 when it does. */
  daysPerMonth: number;
  /** The calendar day of loop day 1, when the loop follows the calendar (X-3). */
  start: CalendarDay | null;
  /** The last loop day that may be played: the campaign's end date (X-18). */
  lastDay: number;
  /** Days played so far, counted across months. */
  day: number;
  /** Battles waiting for their day (set up by hand). */
  scheduled: Battle[];
  /** Every battle begun, running or ended, in the order it began. */
  battles: Battle[];
  log: LogEntry[];
  /** Always null: battles no longer stop the turn (X-1). Kept for callers that still read it. */
  stoppedAt: Battle | null;
  /** The player battle the player follows, when several run (X-1). */
  following: string | null;
  /** Steps of other contexts run once a day, after the day's phases. */
  dailySteps: Record<string, () => void>;
  /** Weekly steps (army food and hunger, plunder, raids, plague): once, at the end of every turn (X-18). */
  weeklySteps: Record<string, () => void>;
  /** Last loop day of the turn being played (the name is kept for older callers). */
  monthEnd: number;
}

/** Steps a day splits into while a player battle runs: six of 4 hours (X-1). */
export const STEPS_PER_DAY: number = config.battleStepsPerDay;

/** Gregorian leap year, applied to every year with no 1582 switch (X-3). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The real length of a month, 28 to 31 days (X-3). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** A day of the calendar. */
export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

/** Days in a turn: one week (X-18). */
export const TURN_DAYS: number = config.turnDays;

/** The first day of every campaign: 11 November 1444 (X-5). */
export const START_CALENDAR_DAY: CalendarDay = { ...config.startDate };

export function addDays(d: CalendarDay, n: number): CalendarDay {
  let { year, month, day } = d;
  day += n;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) [month, year] = [1, year + 1];
  }
  while (day < 1) {
    month -= 1;
    if (month < 1) [month, year] = [12, year - 1];
    day += daysInMonth(year, month);
  }
  return { year, month, day };
}

export function isoOf(d: CalendarDay): IsoDate {
  return `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function calendarDayOfIso(iso: IsoDate): CalendarDay {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
}

/** What a turn covers and which steps fall due at its end (X-18). */
export interface TurnSpan {
  first: CalendarDay;
  last: CalendarDay;
  /** The first day of the next turn. */
  next: CalendarDay;
  days: number;
  /** The month that begins in this turn, if one does: monthly steps run for it. */
  monthBegins: GameDate | null;
  /** A season begins in this turn (X-4): seasonal steps run. */
  seasonBegins: boolean;
  /** 1 January falls in this turn: yearly steps run. */
  yearBegins: boolean;
  /** The turn ends on the end date: the last turn, which may be shorter. */
  final: boolean;
}

/**
 * The turn that starts on `first`: 7 days, or fewer when the end date comes
 * first; monthly, seasonal and yearly steps fall due in the turn in which a
 * new month, season or year begins (X-18).
 */
export function turnSpan(first: CalendarDay, endDate: IsoDate = DEFAULT_END_DATE): TurnSpan {
  let last = addDays(first, TURN_DAYS - 1);
  const final = isoOf(last) >= endDate;
  if (final) last = calendarDayOfIso(endDate);
  let days = 0;
  let monthBegins: GameDate | null = null;
  for (let d = first; isoOf(d) <= isoOf(last); d = addDays(d, 1)) {
    days++;
    if (d.day === 1) monthBegins = { year: d.year, month: d.month };
  }
  return {
    first,
    last,
    next: addDays(last, 1),
    days,
    monthBegins,
    seasonBegins: monthBegins !== null && SEASON_START_MONTHS_LIST.includes(monthBegins.month),
    yearBegins: monthBegins !== null && monthBegins.month === 1,
    final,
  };
}

const SEASON_START_MONTHS_LIST: readonly number[] = config.seasons.startMonths;

/**
 * A day loop. Given a calendar day (or a month, from its 1st), it follows
 * the real calendar (X-3); given a number, every month has that many days
 * (for tests). Days are counted from 1 across turns.
 */
export function createDayLoop(movers: Mover[], rules: DayRules = {}, from: CalendarDay | GameDate | number = START_CALENDAR_DAY): DayLoop {
  const start = typeof from === "number" ? null : { year: from.year, month: from.month, day: "day" in from ? from.day : 1 };
  return { movers, rules, daysPerMonth: start ? 0 : (from as number), start, lastDay: Infinity, day: 0, scheduled: [], battles: [], log: [], stoppedAt: null, following: null, dailySteps: {}, weeklySteps: {}, monthEnd: 0 };
}

/** The calendar day of a loop day, for a loop that follows the calendar. */
export function calendarDayOf(loop: DayLoop, day = loop.day): CalendarDay | null {
  return loop.start ? addDays(loop.start, day - 1) : null;
}

/** The day of the month of a loop day. */
export function dayOfMonth(loop: DayLoop, day = loop.day): number {
  const c = calendarDayOf(loop, day);
  if (c) return c.day;
  return ((day - 1) % loop.daysPerMonth) + 1;
}

export function moversIn(loop: DayLoop, place: string): Mover[] {
  return loop.movers.filter((m) => m.at === place);
}

const KIND_RANK = new Map<string, number>(config.moverKindOrder.flatMap((kinds, i) => kinds.map((k) => [k, i] as [string, number])));

/** Ascending id: numbers by value, other ids as text. */
function compareIds(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (a !== "" && b !== "" && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Movers in day order: armies, then fleets, then traders, then exploration ships, each in ascending id (X-2, D-TIME-13). */
export function inDayOrder(movers: readonly Mover[]): Mover[] {
  const rank = (m: Mover) => KIND_RANK.get(m.kind) ?? KIND_RANK.size;
  return [...movers].sort((a, b) => rank(a) - rank(b) || compareIds(a.id, b.id));
}

export function scheduleBattle(loop: DayLoop, battle: Omit<Battle, "rounds"> & { rounds?: number }): void {
  loop.scheduled.push({ ...battle, rounds: battle.rounds ?? 0 });
  loop.scheduled.sort((a, b) => a.day - b.day);
}

/** Battles still being fought. */
export function runningBattles(loop: DayLoop): Battle[] {
  return loop.battles.filter((b) => !b.ended);
}

/** Running battles the player's armies or fleets are in (X-1). */
export function runningPlayerBattles(loop: DayLoop): Battle[] {
  return runningBattles(loop).filter((b) => loop.rules.isPlayerBattle?.(b) ?? false);
}

/** True while a player battle runs, so days are played in six 4-hour steps (X-1). */
export function daySlowed(loop: DayLoop): boolean {
  return runningPlayerBattles(loop).length > 0;
}

function inBattle(loop: DayLoop, id: string): boolean {
  return runningBattles(loop).some((b) => b.movers.includes(id));
}

/** Moves every free mover by a share of a day; returns who arrived somewhere. */
function moveAll(loop: DayLoop, day: number, share: number, step?: number): Mover[] {
  const r = loop.rules;
  const kinds = new Set<string>();
  const arrived: Mover[] = [];
  for (const m of inDayOrder(loop.movers)) {
    if (inBattle(loop, m.id) || !m.route.length) continue;
    kinds.add(m.kind);
    let blocked = false;
    while (m.route.length && m.progress + 1e-9 >= m.stepDays[0]!) {
      const to = m.route[0]!;
      if (r.mayEnter && !r.mayEnter(m, to, loop)) {
        loop.log.push({ day, blocked: m.id, at: m.at, to });
        blocked = true;
        break;
      }
      m.progress -= m.stepDays[0]!;
      m.route.shift();
      m.stepDays.shift();
      m.at = to;
      if (!arrived.includes(m)) arrived.push(m);
      loop.log.push(step ? { day, arrived: m.id, at: to, step } : { day, arrived: m.id, at: to });
    }
    if (!m.route.length) m.progress = 0;
    else if (!blocked) m.progress += share;
  }
  for (const kind of kinds) loop.log.push(step ? { day, phase: "move", kind, step } : { day, phase: "move", kind });
  return arrived;
}

/** Stop checks for arrivals, then contact: hostile movers meet, a meeting may start a battle; movers at a running battle of their side join it. */
function stopAndContact(loop: DayLoop, day: number, arrived: Mover[]): void {
  const r = loop.rules;
  loop.log.push({ day, phase: "stopChecks" });
  for (const m of arrived) {
    if (r.stopsAt?.(m, m.at, loop)) {
      m.route = [];
      m.stepDays = [];
      m.progress = 0;
      loop.log.push({ day, stopped: m.id, at: m.at });
    }
  }
  loop.log.push({ day, phase: "contact" });
  joinBattles(loop, day);
  const movers = inDayOrder(loop.movers);
  for (let i = 0; i < movers.length; i++) {
    for (let j = i + 1; j < movers.length; j++) {
      const a = movers[i]!;
      const b = movers[j]!;
      if (a.at !== b.at || inBattle(loop, a.id) || inBattle(loop, b.id) || !r.hostile?.(a, b)) continue;
      loop.log.push({ day, met: [a.id, b.id], at: a.at });
      const started = r.onMeet?.(a, b, loop);
      if (started) beginBattle(loop, { ...started, id: `battle-${loop.battles.length + loop.scheduled.length + 1}`, day, place: a.at, rounds: 0 });
    }
  }
  while (loop.scheduled.length && loop.scheduled[0]!.day <= day) beginBattle(loop, loop.scheduled.shift()!);
}

function beginBattle(loop: DayLoop, b: Battle): void {
  loop.battles.push(b);
  loop.log.push({ day: loop.day, battleStarted: b.id });
}

/** Armies of a battle's sides standing in its place, free and still, join it (X-1). */
function joinBattles(loop: DayLoop, day: number): void {
  for (const b of runningBattles(loop)) {
    for (const m of inDayOrder(loop.movers)) {
      if (m.at !== b.place || b.movers.includes(m.id) || !b.sides.includes(m.side) || inBattle(loop, m.id)) continue;
      b.movers.push(m.id);
      m.route = [];
      m.stepDays = [];
      m.progress = 0;
      loop.log.push({ day, joined: m.id, battle: b.id });
    }
  }
}

/** One round of a battle; it ends when warfare names a loser or its rounds run out. */
function fightRound(loop: DayLoop, b: Battle, day: number, step: number): void {
  if (b.ended) return;
  b.rounds += 1;
  loop.log.push({ day, round: b.id, step });
  const beaten = loop.rules.fightRound?.(b, loop) ?? false;
  if (beaten || b.rounds >= b.days * STEPS_PER_DAY) endBattle(loop, b, "beaten", day, step);
}

function endBattle(loop: DayLoop, b: Battle, how: BattleEnd, day: number, step: number): void {
  b.ended = how;
  b.endedAt = { day, step };
  b.result = loop.rules.resolveBattle?.(b, loop);
  loop.log.push({ day, battleResolved: b.id, step, ended: how });
  if (loop.following === b.id) loop.following = runningPlayerBattles(loop)[0]?.id ?? null;
}

/** One 4-hour step of a slowed day: free movers go a sixth of a day, then a round of every running battle (X-1). */
function playSubStep(loop: DayLoop, day: number, step: number): void {
  loop.log.push({ day, phase: "move", step });
  const arrived = moveAll(loop, day, 1 / STEPS_PER_DAY, step);
  stopAndContact(loop, day, arrived);
  loop.log.push({ day, phase: "battles", step });
  for (const b of runningBattles(loop)) fightRound(loop, b, day, step);
  playerStep(loop);
}

function playerStep(loop: DayLoop): void {
  const running = runningPlayerBattles(loop);
  if (!running.length) return;
  if (!loop.following || !running.some((b) => b.id === loop.following)) loop.following = running[0]!.id;
  loop.rules.onPlayerStep?.(loop, running);
}

/** A whole day: move, stop checks, contact, then six rounds of every running battle at once. */
function playWholeDay(loop: DayLoop, day: number): void {
  loop.log.push({ day, phase: "move" });
  const arrived = moveAll(loop, day, 1);
  stopAndContact(loop, day, arrived);
  loop.log.push({ day, phase: "battles" });
  for (let step = 1; step <= STEPS_PER_DAY; step++) {
    for (const b of runningBattles(loop)) fightRound(loop, b, day, step);
    playerStep(loop);
  }
}

/**
 * Plays one day (TIME-021, X-1, X-2, X-3). A whole day: move, stop checks,
 * contact, then six rounds of every running battle at once. While a player
 * battle runs, the day is six 4-hour steps instead, each moving every free
 * mover a sixth of a day and fighting one round of every running battle.
 * Then standing orders and daily steps.
 */
export function playDay(loop: DayLoop): void {
  const c = startTurn(loop, 1, false);
  while (!isTurnDone(c)) step(c);
}

/** Where a turn being played step by step stands (for the game shell, X-1). */
export interface TurnCursor {
  loop: DayLoop;
  /** Last loop day of the turn. */
  endDay: number;
  /** The 4-hour step reached in a slowed day (1–6), 0 between days. */
  subStep: number;
  /** Run the weekly steps when the turn's days are done. */
  weekly: boolean;
  done: boolean;
}

/** What one call of `step` played. */
export type StepPlayed = { kind: "day"; day: number } | { kind: "4-hour step"; day: number; step: number } | { kind: "weekly steps"; day: number };

/** Begins a turn to be played one step at a time: a day, or a 4-hour step while a player battle runs (X-1). */
export function startTurn(loop: DayLoop, days: number = TURN_DAYS, weekly = true): TurnCursor {
  const endDay = Math.min(loop.day + days, loop.lastDay);
  loop.monthEnd = endDay;
  return { loop, endDay, subStep: 0, weekly, done: false };
}

/** Plays the next step of the turn: a whole day, one 4-hour step of a slowed day, or at the end the weekly steps. */
export function step(c: TurnCursor): StepPlayed {
  const loop = c.loop;
  if (c.done) throw new Error("the turn is done");
  if (c.subStep > 0) {
    // Inside a slowed day.
    c.subStep += 1;
    const day = loop.day;
    playSubStep(loop, day, c.subStep);
    if (c.subStep === STEPS_PER_DAY) {
      c.subStep = 0;
      finishDay(loop, day);
    }
    return { kind: "4-hour step", day, step: c.subStep || STEPS_PER_DAY };
  }
  if (loop.day < c.endDay) {
    const day = ++loop.day;
    if (daySlowed(loop)) {
      loop.log.push({ day, steppedDay: true });
      c.subStep = 1;
      playSubStep(loop, day, 1);
      return { kind: "4-hour step", day, step: 1 };
    }
    playWholeDay(loop, day);
    finishDay(loop, day);
    if (!c.weekly && loop.day >= c.endDay) c.done = true;
    return { kind: "day", day };
  }
  for (const [name, run] of Object.entries(loop.weeklySteps)) {
    run();
    loop.log.push({ day: loop.day, weekStep: name });
  }
  c.done = true;
  return { kind: "weekly steps", day: loop.day };
}

/** True when the turn's days and its weekly steps are played. */
export function isTurnDone(c: TurnCursor): boolean {
  if (!c.done && !c.weekly && c.subStep === 0 && c.loop.day >= c.endDay) c.done = true;
  return c.done;
}

/** Standing orders, then the other contexts' daily steps. */
function finishDay(loop: DayLoop, day: number): void {
  loop.log.push({ day, phase: "standingOrders" });
  loop.rules.standingOrders?.(loop);
  for (const [name, run] of Object.entries(loop.dailySteps)) {
    run();
    loop.log.push({ day, dayStep: name });
  }
}

/**
 * Plays one turn: its 7 days (fewer if the end date comes first), then the
 * weekly steps once (X-18). Battles never stop it (X-1); returns null.
 */
export function playTurn(loop: DayLoop, days: number = TURN_DAYS): Battle | null {
  const c = startTurn(loop, days);
  while (!isTurnDone(c)) step(c);
  return null;
}

/** Older name for playTurn: plays one turn of 7 days (X-18). */
export const playMonth = (loop: DayLoop): Battle | null => playTurn(loop);

/** Plays whole turns until loop day `day` is reached (for a stretch longer than a turn). */
export function playTurnsTo(loop: DayLoop, day: number): void {
  while (loop.day < day) playTurn(loop);
}

/** What the player can do while one of their battles runs, at any 4-hour step (X-1). There is no skip. */
export const BATTLE_CONTROLS = ["change standing orders", "retreat", "switch battle"] as const;

function playerBattle(loop: DayLoop, id?: string): Battle {
  const want = id ?? loop.following;
  const b = runningPlayerBattles(loop).find((x) => x.id === want) ?? (id ? undefined : runningPlayerBattles(loop)[0]);
  if (!b) throw new Error("no player battle is running");
  return b;
}

/** The player changes a running battle's standing orders; later rounds use them (X-1). */
export function changeBattleOrders(loop: DayLoop, orders: string, id?: string): Battle {
  const b = playerBattle(loop, id);
  b.orders = orders;
  return b;
}

/** The player orders a retreat: the battle ends at this step (X-1). */
export function retreat(loop: DayLoop, id?: string): Battle {
  const b = playerBattle(loop, id);
  const day = loop.day;
  const step = loop.log.reduce((n, e) => ("round" in e && e.day === day ? Math.max(n, e.step) : n), 0) || 1;
  endBattle(loop, b, "retreat", day, step);
  return b;
}

/** The player switches to follow another running battle of theirs (X-1). */
export function followBattle(loop: DayLoop, id: string): Battle {
  const b = playerBattle(loop, id);
  loop.following = b.id;
  return b;
}

/** Any battle of the month, fought or not by the player, can be replayed from its notice (X-1). */
export function replayFromNotice(loop: DayLoop, id: string): { battle: Battle; result: unknown } {
  const b = loop.battles.find((x) => x.id === id);
  if (!b) throw new Error(`no battle ${id}`);
  return { battle: b, result: b.result };
}

/** Month playback: about 1 s per 10 whole days; each 4-hour step of a slowed day takes its own time (X-1, D-TIME-15). */
export function playbackSeconds(days: number, slowedSteps = 0): number {
  return (days / 10) * config.playback.secondsPer10Days + slowedSteps * config.playback.secondsPerBattleStep;
}

/** Kept for callers of the old stop: nothing is stopped, so it plays on to the month's end. */
export function carryOn(loop: DayLoop): Battle | null {
  return playMonth(loop);
}

/** Plays a number of days. */
export function playDays(loop: DayLoop, days: number): void {
  for (let i = 0; i < days; i++) playDay(loop);
}

// ---------------------------------------------------------------------------
// Cadences and the stated ordering constraints

export type Cadence = "daily" | "weekly" | "monthly" | "seasonal" | "harvest" | "yearly" | "five-yearly";

export interface CadenceEntry {
  step: string;
  context: string;
  cadence: Cadence;
  phase?: DayPhase;
  kind?: string;
  aka?: string[];
  afterDayLoop?: boolean;
}

export const CADENCES = config.cadences as CadenceEntry[];

export function cadenceOf(step: string): CadenceEntry | undefined {
  return CADENCES.find((c) => c.step === step || c.aka?.includes(step));
}

/** Seasonal steps run in the first month of each season: March, June, September and December (X-4). */
export const SEASON_START_MONTHS: readonly number[] = config.seasons.startMonths;
/** Yearly steps run in the January turn (X-4). */
export const YEARLY_MONTH: number = config.yearlyMonth;

/**
 * Whether a step on this cadence runs in the turn that plays the given month
 * (D-TIME-5, D-TIME-6). Daily and weekly steps run inside the day loop; the
 * harvest step runs in March and September (each province in its own month,
 * see `harvestMonths`); five-yearly
 * steps run in the January turn of every year divisible by five.
 */
export function dueInMonth(cadence: Cadence, date: GameDate): boolean {
  switch (cadence) {
    case "monthly":
      return true;
    case "seasonal":
      return SEASON_START_MONTHS.includes(date.month);
    case "harvest":
      // The world's harvest step runs in both hemispheres' harvest months; each province harvests in its own.
      return Object.values(config.seasons.harvestMonth).includes(date.month);
    case "yearly":
      return date.month === YEARLY_MONTH;
    case "five-yearly":
      return date.month === YEARLY_MONTH && date.year % config.fiveYearlyEvery === 0;
    case "daily":
    case "weekly":
      return false;
  }
}

export interface SystemStep {
  name: string;
  run: () => void;
}

/** The stages of a turn, in order (X-2). */
export type TurnStage =
  | "apply orders"
  | "day loop"
  | "monthly steps"
  | "seasonal steps"
  | "yearly steps"
  | "events"
  | "checks"
  | "achievements"
  | "autosave"
  | "advance the date";
export const TURN_STAGES = config.turnStages as TurnStage[];
/** Where the engine's own phases (turn.ts) sit in the turn order (D-TIME-14). */
export const ENGINE_PHASES = config.enginePhases as Record<string, TurnStage>;
/** The order of the monthly steps by context (X-2); warfare, naval and exploration close the day loop first. */
export const MONTHLY_CONTEXT_ORDER: readonly string[] = config.monthlyContextOrder;

export interface TurnPlan {
  /** The month whose monthly steps run: the month that begins in this turn. */
  date: GameDate;
  /** The turn's span (X-18); without it the plan is a turn in which `date` begins. */
  span?: TurnSpan;
  /** 1. Applies the queued orders: the player's, then each AI realm's by nation index (X-2). */
  applyOrders?: () => void;
  /** 2. Plays the month's days (TIME-020). */
  dayLoop?: () => void;
  /** 3–5. The turn's own systems; each runs when its cadence is due, in the context order of X-2. */
  systems: SystemStep[];
  /** 6. Events, then the national strengths tick (X-2). */
  events?: SystemStep[];
  strengths?: SystemStep[];
  /** Attention and tutorial checks: after the turn's simulation (TIME-051). */
  checks?: SystemStep[];
  /** 7. Achievement tests: last of the turn's systems (TIME-050). */
  achievements?: SystemStep[];
  /** 8. Autosave. */
  autosave?: () => void;
  /** 9. The date moves on 7 days (X-18). */
  advanceDate?: () => void;
}

export interface TurnLogEntry {
  name: string;
  stage: TurnStage;
  /** Running count of steps, kept for callers that compare positions. */
  group: number;
}

function stageOf(step: { name: string }): TurnStage {
  const c = cadenceOf(step.name)?.cadence;
  if (c === "seasonal") return "seasonal steps";
  if (c === "yearly" || c === "five-yearly" || c === "harvest") return "yearly steps";
  return "monthly steps";
}

function contextRank(step: { name: string }): number {
  const c = cadenceOf(step.name);
  if (!c) return -1;
  const i = MONTHLY_CONTEXT_ORDER.indexOf(c.context);
  return i < 0 ? MONTHLY_CONTEXT_ORDER.length : i;
}

/**
 * The due systems in turn order: monthly, then seasonal, then yearly steps
 * (X-2), each stage in the context order province, buildings, recruiting,
 * realm, research, trade, subjects, government, diplomacy, culture,
 * religion, rebellions, revolutions. Steps of the same context, and steps
 * no cadence names, keep the caller's order.
 */
export function orderSteps<T extends { name: string }>(steps: T[]): T[] {
  return steps
    .map((s, i) => ({ s, i, stage: TURN_STAGES.indexOf(stageOf(s)), rank: contextRank(s) }))
    .sort((a, b) => a.stage - b.stage || a.rank - b.rank || a.i - b.i)
    .map((x) => x.s);
}

/** Runs one turn in the order of X-2: orders, day loop, monthly, seasonal and yearly steps, events, checks, achievements, autosave, the date. */
export function runTurnPlan(plan: TurnPlan): TurnLogEntry[] {
  const log: TurnLogEntry[] = [];
  const run = (name: string, stage: TurnStage, fn: () => void) => {
    fn();
    log.push({ name, stage, group: log.length + 1 });
  };
  if (plan.applyOrders) run("apply orders", "apply orders", plan.applyOrders);
  if (plan.dayLoop) run("day loop", "day loop", plan.dayLoop);
  const month = plan.span ? plan.span.monthBegins : plan.date;
  const due = plan.systems.filter((s) => {
    const c = cadenceOf(s.name);
    if (!c) return true;
    return month !== null && dueInMonth(c.cadence, month);
  });
  for (const s of orderSteps(due)) run(s.name, stageOf(s), s.run);
  for (const s of plan.events ?? []) run(s.name, "events", s.run);
  for (const s of plan.strengths ?? []) run(s.name, "events", s.run);
  for (const s of plan.checks ?? []) run(s.name, "checks", s.run);
  for (const s of plan.achievements ?? []) run(s.name, "achievements", s.run);
  if (plan.autosave) run("autosave", "autosave", plan.autosave);
  if (plan.advanceDate) run("advance the date", "advance the date", plan.advanceDate);
  return log;
}

/** Pool events roll once every `selection.pool_roll_interval_months` months (TIME-049). */
export const POOL_ROLL_INTERVAL_MONTHS = config.selection.poolRollIntervalMonths;

export function poolRollDue(turn: number, interval = POOL_ROLL_INTERVAL_MONTHS): boolean {
  return turn % interval === 0;
}

/** Each eligible pool event rolls once against its mean years in a turn its roll is due. */
export function rollPoolEvents<E extends { id: string; meanYears: number; eligible: boolean }>(events: E[], turn: number, roll: (e: E) => void, interval = POOL_ROLL_INTERVAL_MONTHS): void {
  if (!poolRollDue(turn, interval)) return;
  for (const e of events) if (e.eligible) roll(e);
}

/** A diplomatic answer arrives in the turn after the proposal (TIME-057). */
export function answerArrives(sent: GameDate): GameDate {
  return nextMonth(sent);
}

/** Within a turn: the turn in progress, battles as reached, events in date order, the report last (TIME-019). */
export function turnPresentation(battles: { day: number; id: string }[], events: { day: number; id: string }[]): string[] {
  const out = ["turn in progress"];
  for (const b of [...battles].sort((a, c) => a.day - c.day)) out.push(`battle:${b.id}`);
  for (const e of [...events].sort((a, c) => a.day - c.day)) out.push(`event:${e.id}`);
  out.push("turn report");
  return out;
}

/** Whether the rotating autosave is written at the start of the turn that plays this month (TIME-062). */
export function autosaveDue(interval: string, date: GameDate): boolean {
  const rule = (config.autosave as Record<string, { everyMonth?: boolean; month?: number; never?: boolean }>)[interval];
  if (!rule) throw new Error(`autosave interval not designed here: ${interval}`);
  if (rule.never) return false;
  if (rule.everyMonth) return true;
  return date.month === rule.month;
}

// ---------------------------------------------------------------------------
// Seasons

export type Hemisphere = "northern" | "southern";

/** A province south of the equator is in the southern hemisphere (X-4). */
export function hemisphereOf(latitude: number): Hemisphere {
  return latitude < 0 ? "southern" : "northern";
}

export type Season = "spring" | "summer" | "autumn" | "winter";

/** The season a month falls in: north spring March to May …; the south the other way round (X-4). */
export function seasonOf(h: Hemisphere, month: number): Season {
  const start = [...SEASON_START_MONTHS].reverse().find((m) => m <= month) ?? SEASON_START_MONTHS.at(-1)!;
  return (config.seasons.names[h] as Record<string, Season>)[String(start)]!;
}

/** The months a province's harvest is rolled: September in the north, March in the south; rice paddies in both (D-TIME-5). */
export function harvestMonths(h: Hemisphere, paddies = false): number[] {
  return paddies ? [...config.seasons.paddyHarvestMonths] : [config.seasons.harvestMonth[h]];
}

export function isWinter(h: Hemisphere, month: number): boolean {
  return config.seasons.winter[h].includes(month);
}

/** A snow-peak province with no pass and no road is closed in its snow months (TIME-059). */
export function snowPassClosed(h: Hemisphere, month: number, o: { pass: boolean; road: boolean }): boolean {
  if (o.pass || o.road) return false;
  return config.seasons.snowPassClosed[h].includes(month);
}

export type WetClimate = keyof typeof config.seasons.wetSeason;

export function isWetSeason(climate: WetClimate, month: number): boolean {
  return config.seasons.wetSeason[climate].includes(month);
}

// ---------------------------------------------------------------------------
// Ages and the campaign span

export interface Age {
  id: string;
  name: string;
  window: (number | null)[];
  forceStart: number | null;
  forceEnd: number | null;
}

export const AGES = config.ages as Age[];

export function ageByName(name: string): Age {
  const age = AGES.find((a) => a.name === name || a.id === name);
  if (!age) throw new Error(`no age ${name}`);
  return age;
}

/** What the age's own conditions have done so far (the event tree evaluates them). */
export interface AgeConditions {
  startedByConditions?: boolean;
  endedByConditions?: boolean;
}

/** Ages whose start rests on an event after the end date; they never start (X-14). */
export const AGES_NEVER_STARTING: readonly string[] = config.ageStartsOnPostEndEvent;

/** An age's window, cut at the end date (X-14). */
export function ageWindow(age: Age, endDate: IsoDate = DEFAULT_END_DATE): [number, number | null] {
  const endYear = Number(endDate.slice(0, 4));
  const [from, to] = [age.window[0] ?? null, age.window[1] ?? null];
  return [from ?? 0, to === null || to > endYear ? endYear : to];
}

/** An age runs once started (by its conditions or its forced date) and until ended (likewise) (TIME-063). */
export function ageRunning(age: Age, year: number, c: AgeConditions = {}): boolean {
  if (AGES_NEVER_STARTING.includes(age.id) || config.outOfScope.ages.includes(age.id)) return false;
  const started = !!c.startedByConditions || (age.forceStart !== null && year >= age.forceStart);
  const ended = !!c.endedByConditions || (age.forceEnd !== null && year >= age.forceEnd);
  return started && !ended;
}

export function agesRunning(year: number): Age[] {
  return AGES.filter((a) => ageRunning(a, year));
}

export type Era = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";

/** Eras follow the calendar: I 1444–1500 … VII 1914 to the end date (X-14, D-TIME-9). */
export function eraOf(date: GameDate): Era {
  let era: Era = "I";
  for (const e of config.eras) if (date.year >= e.from) era = e.era as Era;
  return era;
}

/** A piece of content: an era, an age, an event family, with the date it begins. */
export interface Content {
  kind: "era" | "age" | "events";
  id: string;
  begins: IsoDate;
}

/** Nothing after 31 August 1939 is part of the game (TIME-009). */
export function inScope(content: Content, endDate: IsoDate = DEFAULT_END_DATE): boolean {
  if (content.kind === "age" && config.outOfScope.ages.includes(content.id)) return false;
  if (content.kind === "events" && config.outOfScope.events.includes(content.id)) return false;
  return content.begins <= endDate;
}

export { Rng };

/** A diplomatic answer arrives in the turn after the proposal is sent: 7 days on (TIME-057, X-18). */
export function answerTurn(sent: CalendarDay): CalendarDay {
  return addDays(sent, TURN_DAYS);
}
