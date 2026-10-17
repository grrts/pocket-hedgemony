import type { GameDate, Ruleset } from "@ph/rules";
import config from "../../../../rules/data/domain/time-and-turns.json" with { type: "json" };
import { hashWorld } from "../../hash.ts";
import { Rng } from "../../rng.ts";
import { processTurn, type Order, type TurnReport } from "../../turn.ts";
import { createWorld, type World } from "../../world.ts";

/**
 * Time and turns (domain/time-and-turns/spec.md): the calendar, the campaign
 * clock and its End turn pipeline, the day loop every mover shares, cadences
 * and the ordering constraints the designs state, seasons, and ages on the
 * calendar. The global order of systems inside a turn is not designed
 * (OQ-TIME-2): only the stated constraints are enforced here.
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
}

export const FINALE = ["final wrap-up events", "closing sequence", "final result"] as const;

/** NewGame: the clock at the configured start date, turn 0, the Rng seeded (TIME-005, TIME-006). */
export function newCampaign(rules: Ruleset, seed: number, options: Partial<CampaignRules> = {}): Campaign {
  const world = createWorld(rules, seed);
  const campaignRules = Object.freeze({ ...options, endDate: options.endDate ?? DEFAULT_END_DATE }) as Readonly<CampaignRules>;
  return { world, rules: campaignRules, phase: "between turns", queue: [], boundary: copyWorld(world), unansweredEvents: [], ended: null };
}

/** Wraps an existing world (for example a loaded one) in a campaign clock. */
export function campaignOf(world: World, options: Partial<CampaignRules> = {}): Campaign {
  const campaignRules = Object.freeze({ ...options, endDate: options.endDate ?? DEFAULT_END_DATE }) as Readonly<CampaignRules>;
  return { world, rules: campaignRules, phase: "between turns", queue: [], boundary: copyWorld(world), unansweredEvents: [], ended: null };
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
  const orders = c.queue.filter((q) => q.nation === nation).map((q) => q.order);
  c.queue = c.queue.filter((q) => q.nation !== nation);
  during?.(c);
  const report = processTurn(c.world, orders, nation);
  c.phase = "between turns";
  c.boundary = copyWorld(c.world);

  if (firstDay(c.world.date) > c.rules.endDate) endCampaign(c, "end date");
  return { ended: true, report, campaignEnded: c.ended };
}

/** EndCampaign: no more turns; the wrap-up, closing sequence and final result follow (TIME-007, TIME-008). */
export function endCampaign(c: Campaign, reason: CampaignEnd["reason"]): CampaignEnd {
  c.ended = { date: { ...c.world.date }, reason, finale: FINALE };
  c.phase = "ended";
  return c.ended;
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

export type DayPhase = "move" | "stopChecks" | "contact" | "standingOrders";
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

export interface Battle {
  id: string;
  /** Day of the loop (1-based, counted across months) the battle starts. */
  day: number;
  place: string;
  /** Sides (mover sides or country names) fighting. */
  sides: string[];
  /** Mover ids held in the battle while it lasts (TIME-025). */
  movers: string[];
  /** Days it lasts, 1 to 3 (warfare 7.1). */
  days: number;
  result?: unknown;
}

export type LogEntry =
  | { day: number; phase: DayPhase; kind?: string }
  | { day: number; arrived: string; at: string }
  | { day: number; blocked: string; at: string; to: string }
  | { day: number; stopped: string; at: string }
  | { day: number; met: [string, string]; at: string }
  | { day: number; battleResolved: string }
  | { day: number; playerBattleReached: string }
  | { day: number; dayStep: string };

/** The rules each mover kind plugs into the shared loop (troop-movement 11.1). */
export interface DayRules {
  mayEnter?: (m: Mover, place: string, loop: DayLoop) => boolean;
  stopsAt?: (m: Mover, place: string, loop: DayLoop) => boolean;
  hostile?: (a: Mover, b: Mover) => boolean;
  /** A meeting may start a battle (warfare decides whether and how long). */
  onMeet?: (a: Mover, b: Mover, loop: DayLoop) => Omit<Battle, "id" | "day" | "place"> | null;
  standingOrders?: (loop: DayLoop) => void;
  /** Works out a battle when its turn comes (warfare owns how). */
  resolveBattle?: (b: Battle, loop: DayLoop) => unknown;
  /** True for a battle the player fights in; only those stop the month (TIME-028, TIME-029). */
  isPlayerBattle?: (b: Battle) => boolean;
}

export interface DayLoop {
  movers: Mover[];
  rules: DayRules;
  /** Days per month (config `march.daysPerMonth`). */
  daysPerMonth: number;
  /** Days played so far, counted across months. */
  day: number;
  /** Battles waiting for their day, then fought in the order they happen. */
  scheduled: Battle[];
  battles: Battle[];
  /** Day through which each mover is held by a battle. */
  heldThrough: Map<string, number>;
  log: LogEntry[];
  /** Set while the month is stopped at a player battle. */
  stoppedAt: Battle | null;
  /** Steps of other contexts run once a day, after the four phases. */
  dailySteps: Record<string, () => void>;
  /** Last day of the month being played. */
  monthEnd: number;
}

export function createDayLoop(movers: Mover[], rules: DayRules = {}, daysPerMonth = 30): DayLoop {
  return { movers, rules, daysPerMonth, day: 0, scheduled: [], battles: [], heldThrough: new Map(), log: [], stoppedAt: null, dailySteps: {}, monthEnd: 0 };
}

/** The day of the month (1–daysPerMonth) for a loop day. */
export function dayOfMonth(loop: DayLoop, day = loop.day): number {
  return ((day - 1) % loop.daysPerMonth) + 1;
}

export function moversIn(loop: DayLoop, place: string): Mover[] {
  return loop.movers.filter((m) => m.at === place);
}

export function scheduleBattle(loop: DayLoop, battle: Battle): void {
  loop.scheduled.push(battle);
  loop.scheduled.sort((a, b) => a.day - b.day);
}

/** Plays one day: move, stop checks, contact, standing orders, in that order (TIME-021). */
export function playDay(loop: DayLoop): void {
  const day = ++loop.day;
  const r = loop.rules;

  // 1. Move: a mover whose walked days cover its step arrives; then it adds a day.
  loop.log.push({ day, phase: "move" });
  const kinds = new Set<string>();
  const arrived: Mover[] = [];
  for (const m of loop.movers) {
    if ((loop.heldThrough.get(m.id) ?? 0) >= day || !m.route.length) continue;
    kinds.add(m.kind);
    let blocked = false;
    while (m.route.length && m.progress >= m.stepDays[0]!) {
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
      loop.log.push({ day, arrived: m.id, at: to });
    }
    if (!m.route.length) m.progress = 0;
    else if (!blocked) m.progress += 1;
  }
  for (const kind of kinds) loop.log.push({ day, phase: "move", kind });

  // 2. Stop checks for every mover that arrived somewhere.
  loop.log.push({ day, phase: "stopChecks" });
  for (const m of arrived) {
    if (r.stopsAt?.(m, m.at, loop)) {
      m.route = [];
      m.stepDays = [];
      m.progress = 0;
      loop.log.push({ day, stopped: m.id, at: m.at });
    }
  }

  // 3. Contact: hostile movers in the same place meet; a meeting may start a battle.
  loop.log.push({ day, phase: "contact" });
  for (let i = 0; i < loop.movers.length; i++) {
    for (let j = i + 1; j < loop.movers.length; j++) {
      const a = loop.movers[i]!;
      const b = loop.movers[j]!;
      if (a.at !== b.at || !r.hostile?.(a, b)) continue;
      loop.log.push({ day, met: [a.id, b.id], at: a.at });
      const started = r.onMeet?.(a, b, loop);
      if (started) scheduleBattle(loop, { ...started, id: `battle-${loop.battles.length + loop.scheduled.length + 1}`, day, place: a.at });
    }
  }
  fightBattlesOf(loop, day);

  // 4. Standing orders.
  loop.log.push({ day, phase: "standingOrders" });
  r.standingOrders?.(loop);
  for (const [name, run] of Object.entries(loop.dailySteps)) {
    run();
    loop.log.push({ day, dayStep: name });
  }
}

/** Battles of a day, one at a time in the order they happen, each resolved before it is shown (TIME-027, TIME-031). */
function fightBattlesOf(loop: DayLoop, day: number): void {
  while (loop.scheduled.length && loop.scheduled[0]!.day <= day) {
    const b = loop.scheduled.shift()!;
    b.result = loop.rules.resolveBattle?.(b, loop);
    loop.battles.push(b);
    for (const id of b.movers) loop.heldThrough.set(id, b.day + b.days - 1);
    loop.log.push({ day, battleResolved: b.id });
    if (loop.rules.isPlayerBattle?.(b)) {
      loop.log.push({ day, playerBattleReached: b.id });
      loop.stoppedAt = b;
      return;
    }
  }
}

/**
 * Plays days until the month ends or the month reaches a player battle.
 * Returns the battle it stopped at, or null at the end of the month.
 */
export function playMonth(loop: DayLoop): Battle | null {
  if (loop.stoppedAt) return loop.stoppedAt;
  if (loop.monthEnd <= loop.day) loop.monthEnd = loop.day + loop.daysPerMonth - (loop.day % loop.daysPerMonth);
  return playToMonthEnd(loop);
}

function playToMonthEnd(loop: DayLoop): Battle | null {
  while (loop.day < loop.monthEnd) {
    playDay(loop);
    if (loop.stoppedAt) return loop.stoppedAt;
  }
  return null;
}

/** CarryOn: the player has seen the battle; the rest of that day's battles, then the month, resume. */
export function carryOn(loop: DayLoop): Battle | null {
  loop.stoppedAt = null;
  fightBattlesOf(loop, loop.day);
  if (loop.stoppedAt) return loop.stoppedAt;
  return playToMonthEnd(loop);
}

/** Plays a number of days, ignoring stops (for reading where movers stand mid-month). */
export function playDays(loop: DayLoop, days: number): void {
  for (let i = 0; i < days; i++) {
    playDay(loop);
    loop.stoppedAt = null;
  }
}

// ---------------------------------------------------------------------------
// Cadences and the stated ordering constraints

export type Cadence = "daily" | "weekly" | "monthly" | "seasonal" | "yearly" | "five-yearly";

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

/**
 * The calendar a turn runs on. Which month ends a season or the year is not
 * designed (OQ-TIME-5, OQ-TIME-6), so the caller names it; without it,
 * seasonal, yearly and five-yearly steps are not scheduled.
 */
export interface StepCalendar {
  seasonEndMonths?: number[];
  yearEndMonth?: number;
  /** A year whose year end runs the five-yearly steps; every fifth year after it too. */
  fiveYearlyFrom?: number;
}

/** Whether a step on this cadence runs in the turn that plays the given month. Weekly steps wait on OQ-TIME-4. */
export function dueInMonth(cadence: Cadence, date: GameDate, cal: StepCalendar = {}): boolean {
  switch (cadence) {
    case "monthly":
      return true;
    case "seasonal":
      return !!cal.seasonEndMonths?.includes(date.month);
    case "yearly":
      return cal.yearEndMonth === date.month;
    case "five-yearly":
      return cal.yearEndMonth === date.month && cal.fiveYearlyFrom !== undefined && date.year >= cal.fiveYearlyFrom && (date.year - cal.fiveYearlyFrom) % 5 === 0;
    case "daily":
    case "weekly":
      return false;
  }
}

/** The "A must run before B" constraints the designs state (TIME-053, TIME-054). */
export const MUST_RUN_BEFORE = config.mustRunBefore.map((c) => [c.first, c.then] as const);
/** Steps the designs say run as one (TIME-055). */
export const SAME_STEP = config.sameStep;

export interface SystemStep {
  name: string;
  run: () => void;
}

export interface TurnPlan {
  date: GameDate;
  calendar?: StepCalendar;
  /** Applies the queued orders; runs first (TIME-013). */
  applyOrders?: () => void;
  /** Plays the month's days (TIME-020). */
  dayLoop?: () => void;
  /** The turn's own systems, in the order the caller gives (the global order is OQ-TIME-2). */
  systems: SystemStep[];
  /** Attention and tutorial checks: after the turn's simulation (TIME-051). */
  checks?: SystemStep[];
  /** Achievement tests: last of all (TIME-050). */
  achievements?: SystemStep[];
}

export interface TurnLogEntry {
  name: string;
  /** Steps run as one share a group (TIME-055). */
  group: number;
}

/**
 * Runs one turn's steps: orders, the day loop, the due systems (steps that
 * must follow the day loop do), then checks, then achievement tests. Systems
 * are kept in the caller's order except where a stated constraint moves one.
 */
export function runTurnPlan(plan: TurnPlan): TurnLogEntry[] {
  const log: TurnLogEntry[] = [];
  let group = 0;
  const run = (name: string, fn: () => void, g = ++group) => {
    fn();
    log.push({ name, group: g });
  };
  if (plan.applyOrders) run("apply orders", plan.applyOrders);
  const due = plan.systems.filter((s) => {
    const c = cadenceOf(s.name);
    return !c || dueInMonth(c.cadence, plan.date, plan.calendar);
  });
  const ordered = orderSteps(due);
  // The day loop plays out the month before the monthly steps, so steps the
  // designs tie to it (the trade ratio, TIME-052) see the finished month.
  if (plan.dayLoop) run("day loop", plan.dayLoop);
  const groupOf = new Map<string, number>();
  for (const s of ordered) {
    const same = SAME_STEP.find((g) => g.includes(s.name));
    const shared = same?.map((n) => groupOf.get(n)).find((g) => g !== undefined);
    const g = shared ?? ++group;
    if (same) for (const n of same) groupOf.set(n, g);
    run(s.name, s.run, g);
  }
  for (const s of plan.checks ?? []) run(s.name, s.run);
  for (const s of plan.achievements ?? []) run(s.name, s.run);
  return log;
}

/** Stable order: the caller's order, moved only as the stated constraints and same-step groups require. */
export function orderSteps<T extends { name: string }>(steps: T[]): T[] {
  const out: T[] = [];
  const left = [...steps];
  const names = new Set(steps.map((s) => s.name));
  while (left.length) {
    const i = left.findIndex((s) => MUST_RUN_BEFORE.every(([first, then]) => then !== s.name || !names.has(first) || out.some((o) => o.name === first)));
    const [next] = left.splice(i < 0 ? 0 : i, 1);
    out.push(next!);
    // Steps the designs run as one follow straight after.
    const same = SAME_STEP.find((g) => g.includes(next!.name));
    if (same) {
      for (let k = left.length - 1; k >= 0; k--) {
        if (same.includes(left[k]!.name)) out.push(...left.splice(k, 1));
      }
    }
  }
  return out;
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
  const rule = (config.autosave as Record<string, { everyTurn?: boolean; month?: number; never?: boolean }>)[interval];
  if (!rule) throw new Error(`autosave interval not designed here: ${interval}`);
  if (rule.never) return false;
  if (rule.everyTurn) return true;
  return date.month === rule.month;
}

// ---------------------------------------------------------------------------
// Seasons

export type Hemisphere = "northern" | "southern";

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

/** An age runs once started (by its conditions or its forced date) and until ended (likewise) (TIME-063). */
export function ageRunning(age: Age, year: number, c: AgeConditions = {}): boolean {
  const started = !!c.startedByConditions || (age.forceStart !== null && year >= age.forceStart);
  const ended = !!c.endedByConditions || (age.forceEnd !== null && year >= age.forceEnd);
  return started && !ended;
}

export function agesRunning(year: number): Age[] {
  return AGES.filter((a) => ageRunning(a, year));
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
