import { expect } from "vitest";
import { loadDefaultRuleset, type GameDate, type Ruleset } from "@ph/rules";
import { hashWorld, processTurn, Rng, type Order, type World } from "@ph/engine";
import {
  AGES,
  worldDateOf,
  acceptsInput,
  ageByName,
  ageRunning,
  agesRunning,
  answerArrives,
  autosaveDue,
  bestAtTheEnd,
  BATTLE_CONTROLS,
  addDays,
  calendarDayOf,
  answerTurn,
  isoOf,
  playTurn,
  startTurn,
  step as playStep,
  isTurnDone,
  playTurnsTo,
  turnSpan,
  type CalendarDay,
  daysInMonth,
  followBattle,
  retreat,
  runningBattles,
  STEPS_PER_DAY,
  changeBattleOrders,
  checkDomination,
  ENGINE_PHASES,
  eraOf,
  ageWindow,
  harvestMonths,
  hemisphereOf,
  inDayOrder,
  MONTHLY_CONTEXT_ORDER,
  orderedQueue,
  playbackSeconds,
  replayFromNotice,
  resumeKilledTurn,
  seasonOf,
  START_DAY,
  TURN_STAGES,
  warmUp,
  type Score,
  cadenceOf,
  CADENCES,
  campaignOf,
  changeSetting,
  copyWorld,
  createDayLoop,
  dayOfMonth,
  DEFAULT_END_DATE,
  dueInMonth,
  endTurn,
  endTurnQuestion,
  formatMonthYear,
  giveOrder,
  inScope,
  isWetSeason,
  isWinter,
  moversIn,
  newCampaign,
  nextMonth,
  orderShape,
  parseMonthYear,
  playDay,
  playDays,
  playMonth,
  POOL_ROLL_INTERVAL_MONTHS,
  requestSave,
  rollPoolEvents,
  runTurnPlan,
  scheduleBattle,
  snowPassClosed,
  turnPresentation,
  type Battle,
  type Campaign,
  type Content,
  type DayLoop,
  type DayRules,
  type Hemisphere,
  type Mover,
  type SystemStep,
  type TurnPlan,
  type WetClimate,
} from "@ph/engine/domain/time-and-turns";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("time-and-turns");

const rules: Ruleset = loadDefaultRuleset();
const DAYS = rules.defines.march.daysPerMonth;
const START_CALENDAR: CalendarDay = { year: 1444, month: 11, day: 11 };

/** Places the designs' examples name, on the built map (Paris is France's capital). */
const ALIASES: Record<string, string> = { Troyes: "Aube", Langres: "Haute-Marne", Dijon: "Côte-d'Or" };

function placeIndex(world: World, name: string): number {
  if (name === "Paris") return world.provinceIndex.get(rules.nations.find((n) => n.id === "france")!.capital)!;
  const target = ALIASES[name] ?? name;
  const p = rules.provinces.findIndex((x) => x.name === target);
  if (p < 0) throw new Error(`no province ${name}`);
  return p;
}

const nationOf = (world: World, name: string) => world.nationIndex.get(name.toLowerCase())!;

function armyOf(world: World, nation: number): number {
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === nation) return i;
  throw new Error("no army");
}

function landNeighbour(world: World, p: number): number {
  for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) if (!world.provinceWater[world.adjList[k]!]) return world.adjList[k]!;
  throw new Error("no land neighbour");
}

function campaign(s: Scenario): Campaign {
  if (!s.campaign) s.campaign = newCampaign(rules, s.seed ?? 1444, s.options ?? {});
  return s.campaign;
}

const france = (s: Scenario) => nationOf(campaign(s).world, "france");

function counter(s: Scenario, name: string): SystemStep {
  s.count ??= {};
  s.count[name] = 0;
  return { name, run: () => s.count[name]++ };
}

/** Plays out the month in the loop; battles never stop it (X-1). */
function playOut(s: Scenario, loop: DayLoop): void {
  s.stops ??= [];
  // The turns that cover a month (X-18): whole 7-day turns until its last day is played.
  playTurnsTo(loop, loop.start ? daysInMonth(loop.start.year, loop.start.month) : loop.daysPerMonth);
  s.turnsPlayed = Math.ceil(loop.day / 7);
}

function defaultLoop(s: Scenario): DayLoop {
  if (!s.loop) {
    const mover = (id: string, kind: string): Mover => ({ id, kind, side: id, at: `${id} start`, route: ["far away"], stepDays: [1000], progress: 0 });
    s.loop = createDayLoop([mover("an army", "army"), mover("a fleet", "fleet"), mover("a trader", "trader")], { hostile: (a, b) => a.side !== b.side }, DAYS);
  }
  return s.loop;
}

/** The turn: orders and the engine's phases, the day loop, the scenario's systems, checks, achievements last. */
function processTheTurn(s: Scenario): void {
  const c = campaign(s);
  const date = { ...c.world.date };
  const acting = s.acting ?? france(s);
  const plan: TurnPlan = {
    date,
    dayLoop: () => playOut(s, defaultLoop(s)),
    systems: [{ name: "engine phases", run: () => (s.result = endTurn(c, acting)) }, ...(s.systems ?? [])],
    checks: s.checks ?? [],
    achievements: s.achievements ?? [],
  };
  s.turnLog = runTurnPlan(plan);
  s.processed = true;
}

/** Plays out the month with every monthly step of the cadence table counted, and the weekly steps noted by day. */
function playTheMonth(s: Scenario): void {
  const loop = defaultLoop(s);
  s.weekDays = {} as Record<string, number[]>;
  for (const c of CADENCES.filter((x) => x.cadence === "weekly")) {
    s.weekDays[c.step] = [];
    loop.weeklySteps[c.step] = () => s.weekDays[c.step].push(loop.day);
  }
  const monthly = CADENCES.filter((c) => c.cadence === "monthly").map((c) => counter(s, c.step));
  s.turnLog = runTurnPlan({ date: s.date ?? { year: 1444, month: 11 }, dayLoop: () => playOut(s, loop), systems: [...monthly, ...(s.systems ?? [])] });
}

const indexOf = (s: Scenario, name: string) => (s.turnLog as { name: string }[]).findIndex((e) => e.name === name);

// ---------------------------------------------------------------------------
// Calendar and campaign span

Given("the date is {string}", (s, text: string) => {
  const d = parseMonthYear(text);
  if (s.processed) {
    expect(formatMonthYear(campaign(s).world.date)).toBe(formatMonthYear(d));
    return;
  }
  s.date = d;
  campaign(s).world.date = d;
});

Given("the turn counter is {int}", (s, n: number) => {
  if (s.processed) expect(campaign(s).world.turn).toBe(n);
  else {
    campaign(s).world.turn = n;
    campaign(s).turns = n;
  }
});

When("the turn is processed", (s) => processTheTurn(s));

Given("the config value {string} is {int}", (s, key: string, value: number) => {
  if (key === "march.daysPerMonth") expect(rules.defines.march.daysPerMonth).toBe(value);
  else if (key === "playback.secondsPer10Days") expect(playbackSeconds(10)).toBe(value);
  else if (key === "playback.secondsPerBattleStep") expect(playbackSeconds(0, 1)).toBe(value);
  else if (key === "selection.pool_roll_interval_months") {
    expect(POOL_ROLL_INTERVAL_MONTHS).toBe(value);
    s.pool = [
      { id: "a_pool_event", meanYears: 20, eligible: true },
      { id: "another_pool_event", meanYears: 5, eligible: true },
      { id: "an_ineligible_event", meanYears: 10, eligible: false },
    ];
    s.rolls = [] as [string, number][];
    s.systems = [{ name: "pool events roll", run: () => rollPoolEvents(s.pool, campaign(s).world.turn, (e: { id: string; meanYears: number }) => s.rolls.push([e.id, e.meanYears])) }];
  } else throw new Error(`unknown config value ${key}`);
});

Given(/^the config value "([^"]+)" is (\d+\.\d+)$/, (_s, key: string, value: string) => {
  if (key === "playback.secondsPerBattleStep") expect(playbackSeconds(0, 1)).toBe(Number(value));
  else throw new Error(`unknown config value ${key}`);
});

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function parseDay(text: string): CalendarDay {
  const [d, m, y] = text.split(" ");
  return { year: Number(y), month: MONTH_NAMES.indexOf(m!) + 1, day: Number(d) };
}

Given("the day is {string}", (s, text: string) => {
  const c = campaign(s);
  const d = parseDay(text);
  if (s.processed) {
    expect(c.calendar).toEqual(d);
    expect(c.world.date).toMatchObject({ year: d.year, month: d.month });
    return;
  }
  c.calendar = d;
  c.world.date = worldDateOf(d);
  s.date = { year: d.year, month: d.month };
});

When(/^the length of (\w+ \d+) is looked up$/, (s, text: string) => {
  const d = parseMonthYear(text);
  s.length = daysInMonth(d.year, d.month);
});
Then("it has {int} days", (s, n: number) => expect(s.length).toBe(n));

Given(/^a day loop that starts on (\d+ \w+ \d+)$/, (s, text: string) => {
  s.loop = createDayLoop([], {}, parseDay(text));
  s.weekRuns = [] as number[];
  s.loop.weeklySteps["weekly"] = () => s.weekRuns.push(s.loop.day);
});
When("one turn is played", (s) => {
  playTurn(s.loop);
});
Then(/^the day loop runs (\d+) days, to (\d+ \w+ \d+)$/, (s, n: string, text: string) => {
  const loop: DayLoop = s.loop;
  expect(loop.day).toBe(Number(n));
  expect(calendarDayOf(loop)).toEqual(parseDay(text));
});
Then("the weekly steps run once, after the 7th day", (s) => {
  expect(s.weekRuns).toEqual([7]);
  const log = (s.loop as DayLoop).log;
  expect(log.findIndex((e) => "weekStep" in e)).toBe(log.length - 1);
});

Given(/^the turn starts on (\d+ \w+ \d+)$/, (s, text: string) => {
  s.first = parseDay(text);
});
When("the turn's span is worked out", (s) => {
  s.span = turnSpan(s.first);
});
Then(/^monthly steps (do not run|run for \w+ \d+), seasonal steps (do|do not) and yearly steps (do|do not)$/, (s, monthly: string, seasonal: string, yearly: string) => {
  const sp = s.span;
  const month = monthly.startsWith("run for ") ? monthly.slice(8) : undefined;
  expect(sp.monthBegins).toEqual(month ? parseMonthYear(month) : null);
  expect(sp.seasonBegins).toBe(seasonal === "do");
  expect(sp.yearBegins).toBe(yearly === "do");
  // The plan runs a monthly step only in such a turn.
  const log = runTurnPlan({ date: s.first, span: sp, systems: [counter(s, "births, deaths and overflow")] });
  expect(log.length).toBe(monthly === "do not run" ? 0 : 1);
});
Then(/^the turn covers (\d+) days, to (\d+ \w+ \d+)$/, (s, n: string, text: string) => {
  expect(s.span.days).toBe(Number(n));
  expect(s.span.last).toEqual(parseDay(text));
});
Then("it is the last turn", (s) => expect(s.span.final).toBe(true));

Then("the day loop runs {int} days", (s, n: number) => {
  const loop: DayLoop = s.loop;
  expect(loop.day).toBe(n);
  expect(loop.log.filter((e) => "phase" in e && e.phase === "move" && !("kind" in e && e.kind)).length).toBe(n);
});

Given("a new campaign is set up with the end date {string}", (s, chosen: string) => {
  s.options = chosen === "default" ? {} : { endDate: chosen };
});

Given("a new campaign is set up with difficulty {string} and events {string}", (s, difficulty: string, events: string) => {
  s.options = { difficulty, events };
});

When("the campaign is started", (s) => {
  campaign(s);
});

When("a new campaign is started", (s) => {
  campaign(s);
  s.processed = true;
});

When("the tutorial {string} is started", (s, name: string) => {
  s.options = { tutorial: name };
  campaign(s);
  s.processed = true;
});

Then("the start day is {int}", (_s, day: number) => {
  expect(START_DAY).toBe(day);
});

Given("the campaign end date is {string}", (s, date: string) => {
  if (s.campaign) expect(s.campaign.rules.endDate).toBe(date);
  else s.options = { ...s.options, endDate: date };
});

Then("the campaign ends", (s) => {
  expect(s.result.ended).toBe(true);
  expect(s.result.campaignEnded).not.toBeNull();
  expect(campaign(s).phase).toBe("ended");
});

Then("the final wrap-up events are shown", (s) => {
  expect(campaign(s).ended!.finale[0]).toBe("final wrap-up events");
});

Then("the closing sequence and the final result follow", (s) => {
  expect(campaign(s).ended!.finale.slice(1)).toEqual(["closing sequence", "final result"]);
});

Then("no further turn can be processed", (s) => {
  const c = campaign(s);
  const before = hashWorld(c.world);
  expect(endTurn(c, france(s))).toEqual({ ended: false, reason: "campaign over" });
  expect(hashWorld(c.world)).toBe(before);
});

const CONTENT: Record<string, Content> = {
  "Era VIII (1960 onward)": { kind: "era", id: "VIII", begins: "1960-01-01" },
  "the 1939 to 1960 part of Era VII": { kind: "era", id: "VII after 31 August 1939", begins: "1939-09-01" },
  "the Second World War events": { kind: "events", id: "second_world_war", begins: "1939-09-01" },
};

Given("the content {string}", (s, name: string) => {
  const age = AGES.find((a) => name.toLowerCase().includes(a.name.toLowerCase()));
  s.content = CONTENT[name] ?? (age ? { kind: "age", id: age.id, begins: `${age.window[0]}-01-01` } : undefined);
  if (!s.content) throw new Error(`unknown content ${name}`);
});

When("the campaign content is assembled", (s) => {
  if (!s.content) return;
  s.inScope = inScope(s.content, DEFAULT_END_DATE);
});

Then("it is not part of the game", (s) => expect(s.inScope).toBe(false));

// ---------------------------------------------------------------------------
// Orders and End turn

Given("the country {string} is played by the player", (s, name: string) => {
  s.player = name;
});

Given("the country {string} is run by the AI", (s, name: string) => {
  s.ai = name;
});

When("each gives a move order for one of its armies", (s) => {
  const base = campaign(s).world;
  s.runs = [s.player, s.ai].map((name: string) => {
    const c = campaignOf(copyWorld(base));
    const n = nationOf(c.world, name);
    const army = armyOf(c.world, n);
    const order: Order = { type: "move", army, to: landNeighbour(c.world, c.world.armies.location[army]!) };
    giveOrder(c, n, order);
    return { c, n, army, order, from: c.world.armies.location[army]! };
  });
});

Then("both orders have the same shape {string}", (s, shape: string) => {
  for (const r of s.runs) expect(orderShape(r.order)).toBe(shape);
  expect(Object.keys(s.runs[0].order)).toEqual(Object.keys(s.runs[1].order));
});

Then("both are applied by the same End turn pipeline", (s) => {
  for (const r of s.runs) {
    const result = endTurn(r.c, r.n);
    expect(result.ended).toBe(true);
    if (result.ended) expect(result.report.rejectedOrders).toEqual([]);
    expect(r.c.world.armies.marched[r.army]![0]).toBe(r.from);
  }
});

Given("the army of {string} stands in {string}", (s, commander: string, place: string) => {
  const w = campaign(s).world;
  const ci = w.commanderIds.findIndex((_, i) => rules.nations.flatMap((n) => n.commanders)[i]!.name === commander);
  const a = w.armies;
  let slot = -1;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.commander[i] === ci) slot = i;
  expect(slot).toBeGreaterThanOrEqual(0);
  a.location[slot] = placeIndex(w, place);
  s.army = slot;
  s.armyNation = a.owner[slot];
});

When("the player orders it to march to {string}", (s, place: string) => {
  const c = campaign(s);
  s.accepted = giveOrder(c, s.armyNation, { type: "move", army: s.army, to: placeIndex(c.world, place) });
});

Then("the army still stands in {string}", (s, place: string) => {
  const w = campaign(s).world;
  expect(w.armies.location[s.army]).toBe(placeIndex(w, place));
  expect(w.armies.route[s.army]).toEqual([]);
});

Then("the order waits in the queue until End turn", (s) => {
  const c = campaign(s);
  expect(s.accepted).toBe(true);
  expect(c.queue).toHaveLength(1);
  expect(c.queue[0]!.order).toMatchObject({ type: "move", army: s.army });
});

Given("the player has queued a move order for an army in {string} to {string}", (s, from: string, to: string) => {
  const c = campaign(s);
  const n = france(s);
  const army = armyOf(c.world, n);
  c.world.armies.location[army] = placeIndex(c.world, from);
  s.army = army;
  s.from = placeIndex(c.world, from);
  s.before = { treasury: c.world.nationTreasury[n]!, levies: c.world.nationLevies[n]! };
  giveOrder(c, n, { type: "move", army, to: placeIndex(c.world, to) });
});

When("End turn is given", (s) => {
  const c = campaign(s);
  s.result = endTurn(c, france(s), (cc) => (s.journal = cc.journal));
  if (s.presentLoop) {
    playMonth(s.presentLoop);
    s.reached = (s.presentLoop as DayLoop).battles.filter((b) => s.presentLoop.rules.isPlayerBattle?.(b));
    s.presentation = turnPresentation(s.reached.map((x: Battle) => ({ day: x.day, id: x.id })), s.events ?? []);
  }
});

Then("the order is applied first", (s) => {
  const w = campaign(s).world;
  expect(s.result.report.rejectedOrders).toEqual([]);
  // The march of this same turn already follows the order's route from where it was given.
  expect(w.armies.marched[s.army]![0]).toBe(s.from);
  expect(w.armies.marched[s.army]!.length).toBeGreaterThan(1);
});

Then("then the marches run, and the economy and the levies run because a new month begins in the turn", (s) => {
  const w = campaign(s).world;
  const n = france(s);
  expect(w.armies.location[s.army]).not.toBe(s.from);
  expect(w.nationTreasury[n]).toBeCloseTo(s.before.treasury + w.nationMonthlyIncome[n]!);
  expect(w.nationLevies[n]).toBeLessThanOrEqual(w.nationMaxLevies[n]!);
});

Given("the player has queued a move order that is invalid because {string}", (s, cause: string) => {
  const c = campaign(s);
  const w = c.world;
  const n = france(s);
  const own = armyOf(w, n);
  const orders: Record<string, Order> = {
    "the army does not exist": { type: "move", army: 99999, to: 0 },
    "the army belongs to another country": { type: "move", army: armyOf(w, nationOf(w, "burgundy")), to: w.armies.location[own]! },
    "the destination is a sea zone": { type: "move", army: own, to: w.provinceIndex.get("sea540")! },
    "no land route reaches the destination": { type: "move", army: own, to: w.provinceIndex.get(rules.nations.find((x) => x.id === "ireland")!.capital)! },
  };
  s.order = orders[cause];
  if (!s.order) throw new Error(`unknown cause ${cause}`);
  s.dateBefore = { ...w.date };
  giveOrder(c, n, s.order);
});

Then("the order is rejected with the reason {string}", (s, reason: string) => {
  expect(s.result.report.rejectedOrders).toEqual([{ order: s.order, reason }]);
});

Then("the reason appears in the turn report", (s) => {
  expect(s.result.report.rejectedOrders.map((r: { reason: string }) => r.reason)).toHaveLength(1);
});

Then("the rest of the turn is processed", (s) => {
  expect(campaign(s).calendar).toEqual(addDays(START_CALENDAR, 7));
});

Given("the player has queued two move orders for the same army in one turn", (s) => {
  const c = campaign(s);
  const n = france(s);
  const army = armyOf(c.world, n);
  const at = c.world.armies.location[army]!;
  s.orders = [{ type: "move", army, to: landNeighbour(c.world, at) }, { type: "move", army, to: at }];
  for (const o of s.orders) giveOrder(c, n, o);
});

Then("the first order is applied", (s) => {
  expect(s.result.report.rejectedOrders.map((r: { order: Order }) => r.order)).not.toContain(s.orders[0]);
});

Then("the second is rejected with the reason {string}", (s, reason: string) => {
  expect(s.result.report.rejectedOrders).toEqual([{ order: s.orders[1], reason }]);
});

Given("End turn has been given", (s) => {
  s.endTurnGiven = true;
});

Given("the turn is being processed", (s) => {
  s.running = true;
});

When("the player tries to give an order", (s) => {
  const c = campaign(s);
  const n = france(s);
  const army = armyOf(c.world, n);
  endTurn(c, n, (cc) => {
    s.accepted = giveOrder(cc, n, { type: "move", army, to: landNeighbour(cc.world, cc.world.armies.location[army]!) });
    s.pan = acceptsInput(cc, "pan");
    s.zoom = acceptsInput(cc, "zoom");
  });
});

Then("the order is not accepted", (s) => {
  expect(s.accepted).toBe(false);
  expect(campaign(s).queue).toEqual([]);
});

Then("the map can still be panned and zoomed", (s) => {
  expect(s.pan).toBe(true);
  expect(s.zoom).toBe(true);
});

Given("the event {string} is unanswered", (s, event: string) => {
  campaign(s).unansweredEvents.push(event);
});

Given("the End turn confirmation setting is {string}", (s, setting: string) => {
  s.confirmation = setting;
});

Given("there are {int} open warnings and no unanswered events", (s, n: number) => {
  s.warnings = n;
  expect(campaign(s).unansweredEvents).toEqual([]);
});

When("the player gives End turn", (s) => {
  const c = campaign(s);
  s.dateBefore = { ...c.world.date };
  s.question = endTurnQuestion(s.confirmation ?? "off", s.warnings ?? 0);
  if (!s.question) s.result = endTurn(c, france(s));
});

Then("the turn does not end", (s) => {
  expect(s.result.ended).toBe(false);
  expect(campaign(s).world.date).toEqual(s.dateBefore);
});

Then("the first unanswered event opens", (s) => {
  expect(s.result.opened).toBe(campaign(s).unansweredEvents[0]);
});

Then("nothing answers the event for the player", (s) => {
  expect(campaign(s).unansweredEvents).toHaveLength(1);
});

Then(/^the game asks first and names "(.+)", and the turn ends on "(.+)"$/, (s, text: string, choice: string) => {
  expect(s.question).not.toBeNull();
  expect(s.question.question).toBe(text);
  expect(s.question.choices).toContain(choice);
  expect(s.question.proceed).toBe(choice);
  const r = endTurn(campaign(s), france(s));
  expect(r.ended).toBe(true);
});

Then("the turn ends at once", (s) => {
  expect(s.question).toBeNull();
  expect(s.result.ended).toBe(true);
});

/** France's army under Dunois in Langres; Burgundy's arrives on `day`: a battle the player fights. */
function playerBattleLoop(world: World, day: number, rng: () => number): DayLoop {
  const rulesOf: DayRules = {
    hostile: (a, b) => a.side !== b.side && a.kind === "army" && b.kind === "army",
    // One battle between the two in this example; what follows a battle is warfare's.
    onMeet: (a, b, l) => (l.battles.length || l.scheduled.length ? null : { sides: [a.side, b.side], movers: [a.id, b.id], days: 3 }),
    // The result depends on the standing orders the player sets on the card.
    resolveBattle: (b) => ({ roll: rng(), orders: b.orders ?? "as before" }),
    isPlayerBattle: (b) => b.sides.includes("France"),
  };
  void world;
  return createDayLoop(
    [
      { id: "Jean de Dunois", kind: "army", side: "France", at: "Langres", route: [], stepDays: [], progress: 0 },
      { id: "the Bastard of Burgundy", kind: "army", side: "Burgundy", at: "Beaune", route: ["Langres"], stepDays: [day - 1], progress: 0 },
    ],
    rulesOf,
    DAYS,
  );
}

Given("the player's army fights one battle this turn", (s) => {
  const w = campaign(s).world;
  s.presentLoop = playerBattleLoop(w, 5, () => w.rng.next());
});

Given("two events fire this turn", (s) => {
  s.events = [
    { day: 20, id: "the second event" },
    { day: 5, id: "the first event" },
  ];
});

Then("the turn in progress is shown first", (s) => expect(s.presentation[0]).toBe("turn in progress"));

Then("the battle is shown when the turn reaches it", (s) => {
  expect(s.reached).toHaveLength(1);
  expect(dayOfMonth(s.presentLoop, s.reached[0].day)).toBe(5);
  expect(s.presentation[1]).toBe(`battle:${s.reached[0].id}`);
});

Then("the events are shown one at a time in date order", (s) => {
  expect(s.presentation.slice(2, 4)).toEqual(["event:the first event", "event:the second event"]);
});

Then("the turn report is shown last", (s) => expect(s.presentation.at(-1)).toBe("turn report"));

// ---------------------------------------------------------------------------
// The day loop

When("a day of the day loop runs", (s) => {
  const seen: string[] = [];
  s.seen = seen;
  const loop = createDayLoop(
    [
      { id: "marcher", kind: "army", side: "France", at: "Paris", route: ["Troyes"], stepDays: [10], progress: 0 },
      { id: "arriver", kind: "army", side: "France", at: "Troyes", route: ["Langres"], stepDays: [3], progress: 3 },
      { id: "foe", kind: "army", side: "Burgundy", at: "Dijon", route: [], stepDays: [], progress: 0 },
      { id: "friend", kind: "army", side: "France", at: "Dijon", route: [], stepDays: [], progress: 0 },
    ],
    {
      stopsAt: (m) => (seen.push(`stop check:${m.id}:${s.loop.log.length}`), false),
      hostile: (a, b) => a.side !== b.side,
      standingOrders: () => void seen.push(`standing orders:${s.loop.log.length}`),
    },
    DAYS,
  );
  s.loop = loop;
  playDay(loop);
});

const phaseAt = (loop: DayLoop, phase: string) => loop.log.findIndex((e) => "phase" in e && e.phase === phase && !("kind" in e && e.kind));

Then("every marching mover first adds one day to its step", (s) => {
  const loop: DayLoop = s.loop;
  expect(loop.movers.find((m) => m.id === "marcher")!.progress).toBe(1);
  expect(phaseAt(loop, "move")).toBe(0);
});

Then("then every mover that arrived checks what stops it", (s) => {
  const loop: DayLoop = s.loop;
  expect(s.seen.filter((x: string) => x.startsWith("stop check"))).toHaveLength(1);
  expect(s.seen[0]).toMatch(/^stop check:arriver:/);
  expect(Number(s.seen[0].split(":")[2])).toBeGreaterThan(phaseAt(loop, "stopChecks"));
  expect(phaseAt(loop, "stopChecks")).toBeGreaterThan(phaseAt(loop, "move"));
});

Then("then hostile armies in the same province make contact", (s) => {
  const loop: DayLoop = s.loop;
  const met = loop.log.findIndex((e) => "met" in e);
  expect(loop.log[met]).toMatchObject({ met: ["foe", "friend"], at: "Dijon" });
  expect(met).toBeGreaterThan(phaseAt(loop, "contact"));
  expect(phaseAt(loop, "contact")).toBeGreaterThan(phaseAt(loop, "stopChecks"));
});

Then("then running battles fight their rounds", (s) => {
  const loop: DayLoop = s.loop;
  const at = phaseAt(loop, "battles");
  expect(at).toBeGreaterThan(loop.log.findIndex((e) => "met" in e));
});

Then("then standing orders are applied", (s) => {
  const loop: DayLoop = s.loop;
  const at = phaseAt(loop, "standingOrders");
  expect(at).toBeGreaterThan(phaseAt(loop, "battles"));
  expect(s.seen.at(-1)).toBe(`standing orders:${at + 1}`);
});

Given("an enemy fleet arrives in the strait {string} on day {int}", (s, strait: string, day: number) => {
  s.strait = strait;
  s.loop = createDayLoop([{ id: "enemy fleet", kind: "fleet", side: "Venice", at: "Black Sea", route: [strait], stepDays: [day - 1], progress: 0 }], {}, DAYS);
});

Given("an army is due to cross the strait {string} on day {int}", (s, strait: string, day: number) => {
  const loop: DayLoop = s.loop;
  loop.movers.push({ id: "the army", kind: "army", side: "Ottomans", at: "Thrace", route: ["Bithynia"], stepDays: [day - 1], progress: 0 });
  // Troop-movement 4.4: an enemy fleet in the strait closes a strait crossing.
  const crossing: Record<string, string> = { "Thrace|Bithynia": strait };
  loop.rules = {
    mayEnter: (m, to, l) => {
      const via = crossing[`${m.at}|${to}`];
      return !(m.kind === "army" && via && l.movers.some((f) => f.kind === "fleet" && f.at === via && f.side !== m.side));
    },
  };
});

When("the turn is played out", (s) => playTheMonth(s));
When("the day loop runs", (s) => playTheMonth(s));

Then("the strait is closed to the army on day {int}", (s, day: number) => {
  const loop: DayLoop = s.loop;
  expect(loop.log.find((e) => "arrived" in e && e.arrived === "enemy fleet")).toMatchObject({ day: day - 1, at: s.strait });
  expect(loop.log.find((e) => "blocked" in e && e.blocked === "the army")).toMatchObject({ day, at: "Thrace", to: "Bithynia" });
  expect(loop.movers.find((m) => m.id === "the army")!.at).toBe("Thrace");
});

Given("a trader walks into a province on day {int}", (s, day: number) => {
  s.loop = createDayLoop([{ id: "a trader", kind: "trader", side: "Venice", at: "Bar", route: ["Champagne"], stepDays: [day - 1], progress: 0 }], { hostile: (a, b) => a.side !== b.side }, DAYS);
});

Given("an enemy army stands in that province on day {int}", (s, _day: number) => {
  s.loop.movers.push({ id: "an enemy army", kind: "army", side: "Burgundy", at: "Champagne", route: [], stepDays: [], progress: 0 });
});

Then("the trader meets the army in that province on day {int}", (s, day: number) => {
  const loop: DayLoop = s.loop;
  const met = loop.log.filter((e) => "met" in e);
  expect(met[0]).toMatchObject({ day, at: "Champagne" });
  expect((met[0] as { met: string[] }).met.sort()).toEqual(["a trader", "an enemy army"]);
});

Then(/^"(.+)" runs once a (day|turn|month)$/, (s, step: string, every: string) => {
  const c = cadenceOf(step)!;
  expect(c).toBeDefined();
  if (every === "turn") {
    expect(c.cadence).toBe("weekly");
    expect(s.weekDays[c.step]).toEqual([7, 14, 21, 28, 35]);
  } else if (every === "day") {
    expect(c.cadence).toBe("daily");
    const loop: DayLoop = s.loop;
    expect(loop.day).toBeGreaterThanOrEqual(DAYS);
    for (let d = 1; d <= loop.day; d++) {
      const n = loop.log.filter((e) => e.day === d && "phase" in e && e.phase === c.phase && (c.kind ? "kind" in e && e.kind === c.kind : !("kind" in e && e.kind))).length;
      expect(n).toBe(1);
    }
  } else {
    expect(c.cadence).toBe("monthly");
    expect(s.count[c.step]).toBe(1);
  }
});

Given("an army starts a mountain step of {int} days on day {int} of a turn", (s, days: number, day: number) => {
  const loop = createDayLoop([{ id: "army", kind: "army", side: "France", at: "Savoie", route: ["Valais"], stepDays: [days], progress: 0 }], {}, DAYS);
  // Days before the step starts pass with the army standing.
  loop.day = day - 1;
  s.loop = loop;
});

When("the turn ends", (s) => {
  playTurn(s.loop, 7 - s.loop.day);
});

Then("the army still stands in the province it left with {int} days of progress", (s, progress: number) => {
  const m: Mover = s.loop.movers[0];
  expect(m.at).toBe("Savoie");
  expect(m.progress).toBe(progress);
});

Then("it arrives on day {int} of the next turn", (s, day: number) => {
  const loop: DayLoop = s.loop;
  playTurn(loop);
  const arrived = loop.log.find((e) => "arrived" in e)!;
  expect(arrived.day).toBe(7 + day);
});

Given("a battle starts on day {int} and lasts {int} days", (s, day: number, days: number) => {
  const loop = createDayLoop(
    [
      { id: "A", kind: "army", side: "France", at: "Langres", route: ["Dijon"], stepDays: [1000], progress: 0 },
      { id: "B", kind: "army", side: "Burgundy", at: "Langres", route: ["Troyes"], stepDays: [1000], progress: 0 },
    ],
    {},
    DAYS,
  );
  scheduleBattle(loop, { id: "battle", day, place: "Langres", sides: ["France", "Burgundy"], movers: ["A", "B"], days });
  s.progress = {} as Record<number, number[]>;
  loop.dailySteps["record progress"] = () => (s.progress[loop.day] = loop.movers.map((m) => m.progress));
  s.loop = loop;
  s.battleDay = day;
});

Then("the armies in it don't move until day {int}", (s, free: number) => {
  const p: Record<number, number[]> = s.progress;
  expect(p[free - 1]).toEqual(p[s.battleDay]);
  expect(p[free]!.map((x, i) => x - p[free - 1]![i]!)).toEqual([1, 1]);
});

Given("an army walking from {string} to {string} with {int} days to walk", (s, from: string, to: string, days: number) => {
  s.loop = createDayLoop(
    [
      { id: "army", kind: "army", side: "France", at: from, route: [to], stepDays: [days], progress: 0 },
      { id: "scouts", kind: "army", side: "Burgundy", at: from, route: [], stepDays: [], progress: 0 },
    ],
    { hostile: (a, b) => a.side !== b.side },
    DAYS,
  );
});

When("{int} days have passed", (s, days: number) => playDays(s.loop, days));

Then("the army stands in {string}", (s, place: string) => {
  expect(s.loop.movers[0].at).toBe(place);
  expect(moversIn(s.loop, place).map((m) => m.id)).toContain("army");
});

Then("it can be seen and attacked in {string}", (s, place: string) => {
  const loop: DayLoop = s.loop;
  expect(loop.log.some((e) => "met" in e && e.day === loop.day && e.at === place && e.met.includes("army"))).toBe(true);
});

// ---------------------------------------------------------------------------
// Battles inside the month

Given("battles happen on day {int} in {string} and on day {int} in {string}", (s, d1: number, p1: string, d2: number, p2: string) => {
  const order: string[] = [];
  s.resolved = order;
  const loop = createDayLoop([], { resolveBattle: (b) => (order.push(b.id), `result of ${b.id}`) }, DAYS);
  scheduleBattle(loop, { id: `day ${d2}`, day: d2, place: p2, sides: ["France", "Burgundy"], movers: [], days: 1 });
  scheduleBattle(loop, { id: `day ${d1}`, day: d1, place: p1, sides: ["France", "Burgundy"], movers: [], days: 1 });
  s.loop = loop;
});

Then("the battle of day {int} is resolved before the battle of day {int}", (s, a: number, b: number) => {
  expect(s.resolved).toEqual([`day ${a}`, `day ${b}`]);
  const loop: DayLoop = s.loop;
  expect(loop.log.find((e) => "battleResolved" in e && e.battleResolved === `day ${a}`)!.day).toBe(a);
});

Then("each result is ready before it is shown", (s) => {
  const loop: DayLoop = s.loop;
  expect(indexOf(s, "day loop")).toBeGreaterThanOrEqual(0);
  for (const b of loop.battles) expect(b.result).toBe(`result of ${b.id}`);
  const shown = turnPresentation(loop.battles.map((b) => ({ day: b.day, id: b.id })), []);
  expect(shown.filter((x) => x.startsWith("battle:"))).toEqual(loop.battles.map((b) => `battle:${b.id}`));
});

Given("the countries {string} and {string} fight a battle on day {int}", (s, a: string, b: string, day: number) => {
  const loop = createDayLoop([], { resolveBattle: () => "fought", isPlayerBattle: (x) => x.sides.includes(s.player) }, DAYS);
  scheduleBattle(loop, { id: `${a} against ${b}`, day, place: "Navarre", sides: [a, b], movers: [], days: 2 });
  s.loop = loop;
});

Given("the player is {string}", (s, name: string) => {
  s.player = name;
});

Then("no day is split into 4-hour steps", (s) => {
  const loop: DayLoop = s.loop;
  expect(s.stops).toEqual([]);
  expect(loop.log.some((e) => "steppedDay" in e)).toBe(false);
});

Then("the battle fights {int} rounds each day, as long as a player battle would", (s, n: number) => {
  const loop: DayLoop = s.loop;
  const b = loop.battles[0]!;
  expect(n).toBe(STEPS_PER_DAY);
  expect(b.rounds).toBe(b.days * STEPS_PER_DAY);
  expect(b.endedAt!.day - b.day + 1).toBe(b.days);
  expect(b.result).toBe("fought");
});

Given("the app was killed while the battle ran", (s) => {
  const c = campaign(s);
  s.preTurn = copyWorld(c.world);
  s.makeLoop = (w: World) => playerBattleLoop(w, s.battleDay, () => w.rng.next());
  const loop: DayLoop = s.makeLoop(c.world);
  playTurnsTo(loop, DAYS);
  const b = loop.battles[0]!;
  s.first = { day: b.day, place: b.place, result: b.result };
  // The running world is lost with the app; only the pre-turn save remains.
  s.campaign = null;
});

When("the campaign is resumed from the pre-turn save with the same orders", (s) => {
  const world = copyWorld(s.preTurn);
  const loop: DayLoop = s.makeLoop(world);
  playTurnsTo(loop, DAYS);
  s.again = loop.battles[0];
});

Then("the battle in {string} begins on day {int} again", (s, place: string, day: number) => {
  expect(s.again.place).toBe(place);
  expect(s.again.day).toBe(s.first.day);
  expect(((s.again.day - 1) % DAYS) + 1).toBe(day);
});

Then("the battle has the same result", (s) => {
  expect(s.again.result).toEqual(s.first.result);
});

// ---------------------------------------------------------------------------
// Cadences and stated ordering

Given("the context {string} has a monthly step {string}", (s, context: string, step: string) => {
  s.expectContext = context;
  s.systems = [...(s.systems ?? []), counter(s, step)];
});

Then("{string} of the context {string} runs once", (s, step: string, context: string) => {
  const c = cadenceOf(step)!;
  expect(c.context).toBe(context);
  expect(c.cadence).toBe("monthly");
  expect(s.count[step]).toBe(1);
});

When("{int} years have passed", (s, years: number) => {
  s.years = years;
});

Then("the culture checks for the court going native, new tongues abroad and merges run once every {int} years", (s, every: number) => {
  const step = cadenceOf("culture checks for the court going native, new tongues abroad and merges")!;
  expect(step.cadence).toBe("five-yearly");
  // The January turn of every year divisible by five (D-TIME-6).
  const runs: GameDate[] = [];
  let d: GameDate = s.date;
  for (let m = 0; m < 12 * s.years; m++, d = nextMonth(d)) if (dueInMonth("five-yearly", d)) runs.push(d);
  expect(runs).toHaveLength(s.years / every);
  for (const r of runs) expect(r).toMatchObject({ month: 1 });
  expect(runs[0]!.year % every).toBe(0);
});

Then("each eligible pool event rolls once against its mean years", (s) => {
  expect(s.rolls).toEqual([
    ["a_pool_event", 20],
    ["another_pool_event", 5],
  ]);
});

Given("the campaign is an ironman campaign", (s) => {
  s.options = { ironman: true };
  const c = campaign(s);
  s.systems = [counter(s, "births, deaths and overflow")];
  s.achievements = [{ name: "achievement tests", run: () => (s.read = { date: { ...c.world.date }, treasury: c.world.nationTreasury.slice(), turn: c.world.turn }) }];
});

Then("achievement tests run after every other system of the turn", (s) => {
  const log: { name: string }[] = s.turnLog;
  expect(log.at(-1)!.name).toBe("achievement tests");
  expect(log.map((e) => e.name)).toEqual(expect.arrayContaining(["day loop", "engine phases", "births, deaths and overflow"]));
});

Then("they read the turn's final values", (s) => {
  const w = campaign(s).world;
  expect(s.read.date).toEqual(w.date);
  expect(s.read.turn).toBe(w.turn);
  expect(Array.from(s.read.treasury)).toEqual(Array.from(w.nationTreasury));
});

Given("a province's local store will reach zero before the next harvest after this turn", (s) => {
  s.store = { rations: 30 };
  s.systems = [{ name: "the province eats from its local store", run: () => (s.store.rations = 0) }];
  s.checks = [{ name: "attention and tutorial checks", run: () => (s.seen = s.store.rations) }];
});

Then("the attention check sees the store as it is after the turn's simulation", (s) => {
  expect(s.seen).toBe(0);
  expect(indexOf(s, "attention and tutorial checks")).toBeGreaterThan(indexOf(s, "the province eats from its local store"));
});

Given("{int} traders walked through a province during the turn", (s, n: number) => {
  const movers: Mover[] = Array.from({ length: n }, (_, i) => ({ id: `trader ${i + 1}`, kind: "trader", side: "Venice", at: "Brie", route: ["Champagne", "Lorraine"], stepDays: [5 + i, 5], progress: 0 }));
  s.loop = createDayLoop(movers, {}, DAYS);
  s.systems = [
    {
      name: "trade ratio gain and decay",
      run: () => (s.walkers = new Set((s.loop as DayLoop).log.flatMap((e) => ("arrived" in e && e.at === "Champagne" ? [e.arrived] : []))).size),
    },
  ];
});

Then("the trade ratio of that province is updated after the day loop has finished", (s) => {
  expect(indexOf(s, "trade ratio gain and decay")).toBeGreaterThan(indexOf(s, "day loop"));
  expect(s.walkers).toBe(2);
  expect(s.loop.day).toBeGreaterThanOrEqual(DAYS);
});

Given("a loom house is finished this month in a province with homeless people", (s) => {
  s.province = { homeless: 40, freeSlots: 0, placed: 0 };
  const p = s.province;
  // Given in the wrong order on purpose: the stated constraint must reorder them.
  s.systems = [
    { name: "births, deaths and overflow", run: () => ((p.placed = Math.min(p.homeless, p.freeSlots)), (p.homeless -= p.placed)) },
    { name: "building upkeep and construction sites", run: () => (p.freeSlots += 25) },
  ];
});

Then("the month's overflow is placed before the buildings step opens the loom house's slots", (s) => {
  expect(indexOf(s, "births, deaths and overflow")).toBeLessThan(indexOf(s, "building upkeep and construction sites"));
  expect(s.province.placed).toBe(0);
  expect(s.province.freeSlots).toBe(25);
});

Then("the loom house's slots are filled by the next month's overflow", (s) => {
  const p = s.province;
  runTurnPlan({ date: nextMonth(s.date ?? campaign(s).world.date), systems: [{ name: "births, deaths and overflow", run: () => ((p.placed = Math.min(p.homeless, p.freeSlots)), (p.homeless -= p.placed)) }] });
  expect(p.placed).toBe(25);
  expect(p.homeless).toBe(15);
});

Given("a province with French and Flemish speakers", (s) => {
  s.order = [] as string[];
  s.systems = [
    { name: "culture drift", run: () => s.order.push("culture drift") },
    { name: "births, deaths and overflow", run: () => s.order.push("births and deaths") },
  ];
});

Given("a province with a Catholic and a Protestant community", (s) => {
  s.systems = [counter(s, "faith mix"), counter(s, "culture drift")];
});

When("the January turn is processed", (s) => {
  s.date = { year: 1445, month: 1 };
  campaign(s).world.date = s.date;
  processTheTurn(s);
});

Then("births and deaths of that month run before culture drift", (s) => {
  expect(s.order).toEqual(["births and deaths", "culture drift"]);
});

Then("the faith mix updates once, after culture drift", (s) => {
  expect(s.count["faith mix"]).toBe(1);
  expect(indexOf(s, "faith mix")).toBeGreaterThan(indexOf(s, "culture drift"));
  expect(s.turnLog.find((e: { name: string }) => e.name === "faith mix").stage).toBe("yearly steps");
});

Given("the country {string} asks {string} for an alliance in the turn starting {string}", (s, from: string, to: string, when: string) => {
  s.sent = parseDay(when);
  s.proposal = { from, to };
  const c = campaign(s);
  c.calendar = s.sent;
  c.world.date = { year: s.sent.year, month: s.sent.month };
});

Then("the answer arrives in the turn starting {string}", (s, when: string) => {
  const d = parseDay(when);
  expect(answerTurn(s.sent)).toEqual(d);
  expect(campaign(s).calendar).toEqual(d);
});

Given("a province in the {word} hemisphere", (s, h: string) => {
  s.hemisphere = h as Hemisphere;
});

Given("the month is {string}", (s, month: string) => {
  s.month = parseMonthYear(`${month} 1500`).month;
});

When("the season calendar is read", () => {});

Then(/^it is (not )?winter there$/, (s, not: string | undefined) => {
  expect(isWinter(s.hemisphere, s.month)).toBe(!not);
});

Given("a snow-peak province with no pass and no road in the {word} hemisphere", (s, h: string) => {
  s.hemisphere = h as Hemisphere;
  s.snowPeak = { pass: false, road: false };
});

Then(/^it is (closed|open)$/, (s, state: string) => {
  expect(snowPassClosed(s.hemisphere, s.month, s.snowPeak)).toBe(state === "closed");
});

const CLIMATES: Record<string, WetClimate> = { "monsoon Asia": "monsoon_asia", "the Sahel": "sahel_and_savanna", "the Amazon": "amazon" };

Given("a province in {string}", (s, climate: string) => {
  s.climate = CLIMATES[climate];
  if (!s.climate) throw new Error(`unknown climate ${climate}`);
});

Then(/^it is (not )?the wet season$/, (s, not: string | undefined) => {
  expect(isWetSeason(s.climate, s.month)).toBe(!not);
});

Given("the autosave interval is {string}", (s, interval: string) => {
  s.autosave = interval;
});

When("the turns of a year are played", (s) => {
  let d: GameDate = { year: 1445, month: 1 };
  s.autosaves = [] as GameDate[];
  s.ranIn = [] as number[];
  for (let t = 0; t < 12; t++, d = nextMonth(d)) {
    if (s.autosave && autosaveDue(s.autosave, d)) s.autosaves.push(d);
    if (s.step) {
      const log = runTurnPlan({ date: d, systems: [{ name: s.step, run: () => {} }] });
      if (log.length) s.ranIn.push(d.month);
    }
  }
});

Given(/^the step "(.+)" is (seasonal|yearly)$/, (s, step: string, cadence: string) => {
  const c = cadenceOf(step)!;
  expect(c).toBeDefined();
  expect(c.cadence).toBe(cadence);
  s.step = step;
});

const monthNumbers = (text: string) => text.split(/, | and /).map((m) => parseMonthYear(`${m} 1500`).month);

Then(/^"(.+)" runs in the turns of (.+)$/, (s, step: string, months: string) => {
  expect(s.step).toBe(step);
  expect(s.ranIn).toEqual(monthNumbers(months));
});

Then(/^"(.+)" runs only in the January turn$/, (s, step: string) => {
  expect(s.step).toBe(step);
  expect(s.ranIn).toEqual([1]);
});

Then(/^"(.+)" runs once at the end of every turn and on no other day$/, (s, step: string) => {
  expect(cadenceOf(step)!.cadence).toBe("weekly");
  expect(s.weekDays[step]).toEqual(Array.from({ length: s.turnsPlayed }, (_, i) => (i + 1) * 7));
});

Given(/^a province with (farms|rice paddies) in the (northern|southern) hemisphere$/, (s, fields: string, h: string) => {
  s.hemisphere = h as Hemisphere;
  s.paddies = fields === "rice paddies";
  s.step = "harvest";
});

Then(/^its harvest is rolled in (.+)$/, (s, months: string) => {
  // The world's harvest step runs in the turn; each province harvests in its own months.
  const own = harvestMonths(s.hemisphere, s.paddies);
  expect(s.ranIn.filter((m: number) => own.includes(m))).toEqual(monthNumbers(months));
});

Given("a province at latitude {float}", (s, latitude: number) => {
  s.hemisphere = hemisphereOf(latitude);
});

Then("the season there is {word}", (s, season: string) => {
  expect(seasonOf(s.hemisphere, s.month)).toBe(season);
});

Then("the rotating autosave is written at the start of the January turn", (s) => {
  expect(s.autosaves.map((d: GameDate) => d.month)).toEqual([1]);
});

// ---------------------------------------------------------------------------
// Determinism

Given("two copies of the same world with the same Rng state", (s) => {
  const w = campaign(s).world;
  s.worlds = [w, copyWorld(w)];
  expect(Array.from(s.worlds[1].rng.state)).toEqual(Array.from(w.rng.state));
});

Given("two copies of the same world", (s) => {
  const w = campaign(s).world;
  s.worlds = [w, copyWorld(w)];
  s.settings = [{}, {}];
});

const OUTSIDE: Record<string, [string, unknown]> = {
  "the music track changed": ["musicTrack", "The Siege of Belgrade"],
  "the battery saver setting is on": ["batterySaver", "on"],
  "the colour vision setting changed": ["colourVision", "deuteranopia"],
  "the interface scale changed": ["interfaceScale", 150],
};

Given("on one copy {string}", (s, change: string) => {
  const [key, value] = OUTSIDE[change]!;
  expect(changeSetting(s.settings[1], key, value)).toBe(true);
});

When("the same orders are processed on both", (s) => {
  for (const w of s.worlds as World[]) {
    const n = nationOf(w, "france");
    const army = armyOf(w, n);
    w.rng.next();
    processTurn(w, [{ type: "move", army, to: landNeighbour(w, w.armies.location[army]!) }], n);
  }
});

Then("both worlds have the same world hash", (s) => {
  expect(hashWorld(s.worlds[0])).toBe(hashWorld(s.worlds[1]));
});

/** xoshiro128** and splitmix32 written again with BigInt, as an independent reference. */
function referenceSequence(seed: number, n: number): number[] {
  const M = 0xffffffffn;
  const rotl = (x: bigint, k: bigint) => ((x << k) | (x >> (32n - k))) & M;
  const st: bigint[] = [];
  let x = BigInt(seed >>> 0);
  for (let i = 0; i < 4; i++) {
    x = (x + 0x9e3779b9n) & M;
    let z = x;
    z = ((z ^ (z >> 16n)) * 0x85ebca6bn) & M;
    z = ((z ^ (z >> 13n)) * 0xc2b2ae35n) & M;
    st.push((z ^ (z >> 16n)) & M);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let [s0, s1, s2, s3] = st as [bigint, bigint, bigint, bigint];
    out.push(Number((rotl((s1 * 5n) & M, 7n) * 9n) & M));
    const t = (s1 << 9n) & M;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11n);
    st.splice(0, 4, s0, s1, s2, s3);
  }
  return out;
}

Given("the Rng is seeded with {int} on {string}", (s, seed: number, platform: string) => {
  s.platform = platform;
  s.rng = new Rng(seed);
});

When("{int} numbers are drawn", (s, n: number) => {
  s.drawn = Array.from({ length: n }, () => s.rng.nextU32());
});

Then("the sequence equals the reference sequence for seed {int}", (s, seed: number) => {
  expect(s.drawn).toEqual(referenceSequence(seed, s.drawn.length));
});

Given("a new campaign with the seed {int}", (s, seed: number) => {
  s.seed = seed;
});

When("the Rng is seeded", (s) => {
  s.rng = campaign(s).world.rng;
});

Then("its state is four unsigned 32-bit words spread from the seed with splitmix32", (s) => {
  const st: Uint32Array = s.rng.state;
  expect(st).toBeInstanceOf(Uint32Array);
  expect(st.length).toBe(4);
  const fresh = new Rng(s.seed);
  expect(Array.from(st)).toEqual(Array.from(fresh.state));
  expect(fresh.nextU32()).toBe(referenceSequence(s.seed, 1)[0]);
});

Given("a campaign saved at a turn boundary with its Rng state", (s) => {
  const c = campaign(s);
  c.world.rng.next();
  s.saved = requestSave(c);
  expect(Array.from(s.saved.rng.state)).toEqual(Array.from(c.world.rng.state));
});

When("the save is loaded and the next turn is processed with the same orders", (s) => {
  const run = (w: World) => {
    const c = campaignOf(w);
    const n = nationOf(w, "france");
    const army = armyOf(w, n);
    giveOrder(c, n, { type: "move", army, to: landNeighbour(w, w.armies.location[army]!) });
    endTurn(c, n);
    return { hash: hashWorld(w), next: w.rng.nextU32() };
  };
  s.loaded = run(copyWorld(s.saved));
  s.unsaved = run(campaign(s).world);
});

Then("the result equals the result of processing that turn without saving", (s) => {
  expect(s.loaded).toEqual(s.unsaved);
});

Then("difficulty and events are saved in the campaign", (s) => {
  const c = campaign(s);
  expect(c.rules).toMatchObject({ difficulty: "normal", events: "historical" });
  expect(Object.isFrozen(c.rules)).toBe(true);
});

Then("they can't be changed from Settings", (s) => {
  const settings: Record<string, unknown> = {};
  expect(changeSetting(settings, "difficulty", "hard")).toBe(false);
  expect(changeSetting(settings, "events", "free")).toBe(false);
  expect(campaign(s).rules.difficulty).toBe("normal");
});

When("a save is requested", (s) => {
  const c = campaign(s);
  s.boundaryHash = hashWorld(c.world);
  endTurn(c, france(s), (cc) => {
    // Halfway through: something has already changed in the running world.
    cc.world.nationTreasury[0] = cc.world.nationTreasury[0]! + 999;
    s.saved = requestSave(cc);
  });
});

Then("nothing halfway through the turn is saved", (s) => {
  expect(hashWorld(s.saved)).toBe(s.boundaryHash);
});

Then("the last turn-boundary save stays valid", (s) => {
  const c = campaignOf(copyWorld(s.saved));
  expect(endTurn(c, france(s)).ended).toBe(true);
  expect(c.world.turn).toBe(s.saved.turn + 1);
});

Given("a campaign saved in {string} under the old rules", (s, when: string) => {
  const c = campaign(s);
  c.world.date = parseMonthYear(when);
  s.saved = requestSave(c);
});

When("it is loaded with changed rules", (s) => {
  const e = rules.defines.economy;
  s.changed = { ...rules, defines: { ...rules.defines, economy: { ...e, goldPerWealthPerMonth: e.goldPerWealthPerMonth * 2 } } };
  s.loaded = copyWorld(s.saved, s.changed);
  s.loadedHash = hashWorld(s.loaded);
});

Then("the turn of {string} is processed under the changed rules", (s, when: string) => {
  expect(s.loaded.date).toMatchObject(parseMonthYear(when));
  const old = copyWorld(s.saved);
  const n = nationOf(old, "france");
  processTurn(s.loaded, [], n);
  processTurn(old, [], n);
  expect(s.loaded.rules).toBe(s.changed);
  expect(s.loaded.nationMonthlyIncome[n]).toBeGreaterThan(old.nationMonthlyIncome[n]!);
});

Then("the save loads without damage", (s) => {
  expect(s.loadedHash).toBe(hashWorld(s.saved));
});

// ---------------------------------------------------------------------------
// Ages on the calendar

Given(/^the age "(.+)" has not (started|ended) by its conditions$/, (s, name: string) => {
  s.age = ageByName(name);
  s.conditions = {};
});

When("the date reaches the year {int}", (s, year: number) => {
  s.year = year;
});

Then(/^the age "(.+)" (starts|ends)$/, (s, name: string, change: string) => {
  const age = ageByName(name);
  expect(age).toBe(s.age);
  const before = ageRunning(age, s.year - 1, s.conditions);
  const after = ageRunning(age, s.year, s.conditions);
  expect([before, after]).toEqual(change === "starts" ? [false, true] : [true, false]);
});

Then("the ages {string} and {string} are both running", (s, a: string, b: string) => {
  const running = agesRunning(campaign(s).world.date.year).map((x) => x.name);
  expect(running).toEqual(expect.arrayContaining([a, b]));
});

// ---------------------------------------------------------------------------
// Decided rules: the turn order (X-2), battles (X-1), victory (X-12), the 1939 cut (X-14)

Given("the country {string} owns or holds as subjects {int} of the world's {int} settled land provinces", (s, name: string, held: number, settled: number) => {
  const c = campaign(s);
  const date = { ...c.world.date };
  s.systems = [...(s.systems ?? []), { name: "world domination check", run: () => checkDomination(c, name, held, settled, date) }];
});

Then("{string} wins by world domination in {string}", (s, name: string, when: string) => {
  expect(campaign(s).wins).toEqual([{ nation: name, way: "world domination", date: parseMonthYear(when) }]);
});

Then("no win is declared", (s) => expect(campaign(s).wins).toEqual([]));

Then("the campaign does not end", (s) => {
  expect(s.result.ended).toBe(true);
  expect(s.result.campaignEnded).toBeNull();
  expect(campaign(s).phase).toBe("between turns");
});

Then("the next turn can be processed", (s) => {
  expect(endTurn(campaign(s), france(s)).ended).toBe(true);
});

Given("the final scores are:", (s, table: string[][]) => {
  const [head, ...rows] = table;
  s.scores = Object.fromEntries(rows.map((r) => [r[0]!, Object.fromEntries(head!.slice(1).map((k, i) => [k, Number(r[i + 1])]))]));
});

Then("{string} wins in {string}", (s, name: string, score: string) => {
  expect(campaign(s).ended?.reason).toBe("end date");
  expect(bestAtTheEnd(s.scores)[score as Score]).toEqual([name]);
});

Then("{string} and {string} share the win in {string}", (s, a: string, b: string, score: string) => {
  expect(bestAtTheEnd(s.scores)[score as Score]).toEqual([a, b]);
});

When("the era is read from the calendar", (s) => {
  s.era = eraOf(s.date);
});

Then("the era is {string}", (s, era: string) => expect(s.era).toBe(era));

Given("the age {string} has a window to {int} and a forced end in {int}", (s, name: string, to: number, end: number) => {
  s.age = ageByName(name);
  expect(s.age.window[1]).toBe(to);
  expect(s.age.forceEnd).toBe(end);
});

Then("the age {string} runs until the end date in {int}", (s, name: string, year: number) => {
  const age = ageByName(name);
  expect(ageWindow(age, DEFAULT_END_DATE)[1]).toBe(year);
  expect(ageRunning(age, year)).toBe(true);
  expect(Number(DEFAULT_END_DATE.slice(0, 4))).toBe(year);
});

Then("the age {string} is not running, although its window opened in {int}", (s, name: string, opened: number) => {
  const age = ageByName(name);
  expect(age.window[0]).toBe(opened);
  const year = s.date.year;
  expect(ageRunning(age, year)).toBe(false);
  expect(ageRunning(age, year, { startedByConditions: true })).toBe(false);
  expect(agesRunning(year).map((a) => a.name)).not.toContain(name);
});

// Battles on the before-the-battle card (X-1)

Given("the player's army under {string} stands in {string}", (s, commander: string, place: string) => {
  s.dunois = { commander, place };
});

Given("the army of {string} reaches {string} on day {int}", (s, _commander: string, place: string, day: number) => {
  const w = campaign(s).world;
  s.battleDay = day;
  s.stopLoop = playerBattleLoop(w, day, () => w.rng.next());
  expect(place).toBe(s.dunois.place);
});

Given("the player's army under {string} reaches {string} on day {int}", (s, commander: string, _place: string, day: number) => {
  (s.stopLoop as DayLoop).movers.push({ id: commander, kind: "army", side: "France", at: "Chaumont", route: ["Langres"], stepDays: [day - 1], progress: 0 });
});

When("the turn is played", (s) => {
  playTurnsTo(s.stopLoop, DAYS);
});

Then("the battle in {string} begins on day {int}", (s, place: string, day: number) => {
  const b = (s.stopLoop as DayLoop).battles[0]!;
  expect(b.place).toBe(place);
  expect(dayOfMonth(s.stopLoop, b.day)).toBe(day);
});

Then("while it runs each day is played in {int} steps of 4 hours", (s, n: number) => {
  const loop: DayLoop = s.stopLoop;
  const b = loop.battles[0]!;
  expect(n).toBe(STEPS_PER_DAY);
  // The days after the first, while it runs, are split into steps.
  for (let d = b.day + 1; d <= b.endedAt!.day; d++) {
    expect(loop.log.some((e) => e.day === d && "steppedDay" in e)).toBe(true);
    expect(loop.log.filter((e) => e.day === d && "round" in e && e.round === b.id).length).toBe(n);
  }
  expect(b.rounds).toBe(b.days * n);
});

Then("the turns do not stop and play on to their last day", (s) => {
  const loop: DayLoop = s.stopLoop;
  expect(loop.stoppedAt).toBeNull();
  expect(loop.day % 7).toBe(0);
  expect(loop.day).toBeGreaterThanOrEqual(loop.daysPerMonth);
});

Then("{string} joins the battle in {string} on day {int}", (s, commander: string, place: string, day: number) => {
  const loop: DayLoop = s.stopLoop;
  const b = loop.battles.find((x) => x.place === place)!;
  expect(b.movers).toContain(commander);
  expect(loop.log.find((e) => "joined" in e && e.joined === commander)).toMatchObject({ day, battle: b.id });
});

function runningPlayerBattle(s: Scenario, places: string[]): DayLoop {
  const w = campaign(s).world;
  const loop = createDayLoop(
    places.flatMap((p) => [
      { id: `France at ${p}`, kind: "army", side: "France", at: p, route: [], stepDays: [], progress: 0 },
      { id: `Burgundy at ${p}`, kind: "army", side: "Burgundy", at: p, route: [], stepDays: [], progress: 0 },
    ]),
    {
      hostile: (a, b) => a.side !== b.side,
      onMeet: (a, b) => ({ sides: [a.side, b.side], movers: [a.id, b.id], days: 3 }),
      resolveBattle: (b) => ({ roll: w.rng.next(), orders: b.orders ?? "as before", ended: b.ended }),
      isPlayerBattle: (b) => b.sides.includes("France"),
    },
    DAYS,
  );
  playDay(loop);
  expect(runningBattles(loop)).toHaveLength(places.length);
  return loop;
}

Given("the player's battle in {string} is running", (s, place: string) => {
  s.stopLoop = runningPlayerBattle(s, [place]);
});

Given("the player's battles in {string} and {string} are running", (s, a: string, b: string) => {
  s.stopLoop = runningPlayerBattle(s, [a, b]);
});

When("the player sets the standing orders {string}", (s, orders: string) => {
  const loop: DayLoop = s.stopLoop;
  changeBattleOrders(loop, orders);
  playMonth(loop);
});

Then("the battle's later rounds are fought with the standing orders {string}", (s, orders: string) => {
  const b = (s.stopLoop as DayLoop).battles[0]!;
  expect(b.orders).toBe(orders);
  expect(b.result).toMatchObject({ orders });
});

When("the player orders a retreat at the {int}rd step", (s, step: number) => {
  const loop: DayLoop = s.stopLoop;
  loop.rules.onPlayerStep = (l, running) => {
    const now = l.log.filter((e) => "round" in e && e.day === l.day && e.round === running[0]!.id).length;
    if (l.day === 2 && now === step) retreat(l, running[0]!.id);
  };
  playMonth(loop);
  s.step = step;
});

Then("the battle ends at that step with a retreat", (s) => {
  const b = (s.stopLoop as DayLoop).battles[0]!;
  expect(b.ended).toBe("retreat");
  expect(b.endedAt).toEqual({ day: 2, step: s.step });
  expect(b.result).toMatchObject({ ended: "retreat" });
});

Then("the controls offer only {string}, {string} and {string}", (_s, a: string, b: string, c: string) => {
  expect([...BATTLE_CONTROLS]).toEqual([a, b, c]);
  expect(BATTLE_CONTROLS as readonly string[]).not.toContain("Skip to result");
});

When("the player switches to the battle in {string}", (s, place: string) => {
  const loop: DayLoop = s.stopLoop;
  const b = runningBattles(loop).find((x) => x.place === place)!;
  s.roundsBefore = runningBattles(loop).map((x) => x.rounds);
  followBattle(loop, b.id);
  s.followedAfterSwitch = loop.following;
  playDay(loop);
});

Then("the battle in {string} is followed", (s, place: string) => {
  const loop: DayLoop = s.stopLoop;
  expect(s.followedAfterSwitch).toBe(loop.battles.find((x) => x.place === place)!.id);
  expect(loop.following).toBe(s.followedAfterSwitch);
});

Then("both battles keep fighting a round each step", (s) => {
  const loop: DayLoop = s.stopLoop;
  expect(loop.battles.map((x) => x.rounds)).toEqual(s.roundsBefore.map((r: number) => r + STEPS_PER_DAY));
});

Then("the battle can be replayed from its notice with the same result", (s) => {
  const loop: DayLoop = s.loop;
  const b = loop.battles[0]!;
  expect(replayFromNotice(loop, b.id)).toEqual({ battle: b, result: "fought" });
});

Then("{int} whole days play back in {int} second(s)", (_s, days: number, seconds: number) => {
  expect(playbackSeconds(days)).toBeCloseTo(seconds);
});

Then("a day split into {int} steps plays back in {int} seconds", (_s, n: number, seconds: number) => {
  expect(playbackSeconds(0, n)).toBeCloseTo(seconds);
});

// Same-day order (X-2)

Then("the army crosses the strait on day {int} before the fleet arrives", (s, day: number) => {
  const loop: DayLoop = s.loop;
  const army = loop.log.findIndex((e) => "arrived" in e && e.arrived === "the army");
  const fleet = loop.log.findIndex((e) => "arrived" in e && e.arrived === "enemy fleet");
  expect(loop.log[army]).toMatchObject({ day, at: "Bithynia" });
  expect(loop.log[fleet]).toMatchObject({ day, at: s.strait });
  expect(army).toBeLessThan(fleet);
  expect(loop.log.some((e) => "blocked" in e)).toBe(false);
});

Given(/^the armies (\d+), (\d+) and (\d+) all arrive in "(.+)" on day (\d+)$/, (s, a: string, b: string, c: string, place: string, day: string) => {
  s.loop = createDayLoop(
    [a, b, c].map((id) => ({ id, kind: "army", side: "France", at: "Haute-Saône", route: [place], stepDays: [Number(day) - 1], progress: 0 })),
    {},
    DAYS,
  );
});

Then(/^they arrive in the order (\d+), (\d+), (\d+)$/, (s, ...ids: string[]) => {
  const loop: DayLoop = s.loop;
  expect(loop.log.flatMap((e) => ("arrived" in e ? [e.arrived] : []))).toEqual(ids.slice(0, 3));
  expect(inDayOrder(loop.movers).map((m) => m.id)).toEqual(ids.slice(0, 3));
});

// Orders of several nations (X-2)

Given("orders are queued in this order:", (s, table: string[][]) => {
  const c = campaign(s);
  const w = c.world;
  s.labels = new Map<Order, string>();
  for (const [country, label] of table.slice(1)) {
    const n = nationOf(w, country!);
    const army = armyOf(w, n);
    const order: Order = { type: "move", army, to: landNeighbour(w, w.armies.location[army]!) };
    giveOrder(c, n, order);
    s.labels.set(order, label!);
    s.nationOfLabel = { ...s.nationOfLabel, [label!]: n };
  }
});

Then("the orders are taken in the order 2, 4, then the AI realms' orders by ascending nation index, each realm's in the order given", (s) => {
  const taken = (s.journal as { order: Order }[]).map((q) => s.labels.get(q.order));
  const n: Record<string, number> = s.nationOfLabel;
  const ai = ["1", "3", "5"].sort((a, b) => n[a]! - n[b]! || Number(a) - Number(b));
  expect(taken).toEqual(["2", "4", ...ai]);
  expect(orderedQueue([], 0)).toEqual([]);
});

// The turn's stages (X-2)

Given("a turn of {string} with a step in every stage", (s, when: string) => {
  const step = (name: string): SystemStep => ({ name, run: () => {} });
  s.plan = {
    date: parseMonthYear(when),
    applyOrders: () => {},
    dayLoop: () => {},
    systems: [step("harvest"), step("famine check in every province"), step("births, deaths and overflow")],
    events: [step("an event")],
    checks: [step("attention and tutorial checks")],
    achievements: [step("achievement tests")],
    autosave: () => {},
    advanceDate: () => {},
  } satisfies TurnPlan;
});

Given("a monthly step of each of these contexts, given in this order:", (s, table: string[][]) => {
  s.systems = table.slice(1).map(([context]) => {
    const c = CADENCES.find((x) => x.context === context && x.cadence === "monthly");
    if (!c) throw new Error(`no monthly step of ${context}`);
    return { name: c.step, run: () => {} };
  });
});

When("the turn plan is run", (s) => {
  s.turnLog = runTurnPlan(s.plan ?? { date: { year: 1445, month: 4 }, systems: s.systems });
});

Then("the stages run in this order:", (s, table: string[][]) => {
  const stages = (s.turnLog as { stage: string }[]).map((e) => e.stage).filter((x, i, a) => x !== a[i - 1]);
  expect(stages).toEqual(table.slice(1).map((r) => r[0]));
  expect(stages).toEqual(TURN_STAGES);
});

Then("the monthly steps run in this order of contexts:", (s, table: string[][]) => {
  const contexts = (s.turnLog as { name: string }[]).map((e) => cadenceOf(e.name)!.context);
  expect(contexts).toEqual(table.slice(1).map((r) => r[0]));
  expect(contexts).toEqual(MONTHLY_CONTEXT_ORDER.filter((c) => contexts.includes(c)));
});

Given("a world with armies, provinces and nations", (s) => {
  const c = campaign(s);
  const n = france(s);
  const army = armyOf(c.world, n);
  s.army = army;
  s.from = c.world.armies.location[army]!;
  s.dateBefore = { ...c.world.date };
  s.before = { treasury: c.world.nationTreasury[n]! };
  giveOrder(c, n, { type: "move", army, to: landNeighbour(c.world, s.from) });
});

When("a turn is processed", (s) => {
  s.result = endTurn(campaign(s), france(s));
});

Then("the phases run in this order:", (s, table: string[][]) => {
  const rows = table.slice(1);
  for (const [phase, stage] of rows) expect(ENGINE_PHASES[phase!]).toBe(stage);
  const at = rows.map(([, stage]) => TURN_STAGES.indexOf(stage as (typeof TURN_STAGES)[number]));
  expect(at.every((x, i) => x >= 0 && (i === 0 || x >= at[i - 1]!))).toBe(true);
  const w = campaign(s).world;
  expect(s.result.report.rejectedOrders).toEqual([]);
  expect(w.armies.marched[s.army]![0]).toBe(s.from);
  expect(w.nationTreasury[france(s)]).toBeCloseTo(s.before.treasury + w.nationMonthlyIncome[france(s)]!);
  expect(campaign(s).calendar).toEqual(addDays(START_CALENDAR, 7));
});

// Setup and warm-up (D-TIME-11)

When("{int} months of warm-up run before the first turn", (s, months: number) => {
  const c = campaign(s);
  s.rngBefore = new Rng(0);
  s.rngBefore.state.set(c.world.rng.state);
  s.drawn = [] as number[];
  warmUp(c, months, (rng) => s.drawn.push(rng.nextU32()));
});

Then("the date is still {string} and the turn counter is {int}", (s, when: string, turn: number) => {
  const w = campaign(s).world;
  expect(w.date).toMatchObject(parseMonthYear(when));
  expect(w.turn).toBe(turn);
});

Then("the warm-up drew its numbers from the campaign's Rng", (s) => {
  const ref: Rng = s.rngBefore;
  expect(s.drawn).toEqual(s.drawn.map(() => ref.nextU32()));
  expect(Array.from(campaign(s).world.rng.state)).toEqual(Array.from(ref.state));
});

// A killed turn (D-TIME-7)

Given("End turn was given with {int} queued orders", (s, count: number) => {
  const c = campaign(s);
  const w = c.world;
  const n = france(s);
  const armies: number[] = [];
  for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i] && w.armies.owner[i] === n) armies.push(i);
  for (let k = 0; k < count; k++) {
    const army = armies[k % armies.length]!;
    giveOrder(c, n, { type: "move", army, to: landNeighbour(w, w.armies.location[army]!) });
  }
  const twin = campaignOf(copyWorld(w));
  twin.queue = c.queue.map((q) => ({ ...q }));
  endTurn(twin, n);
  s.uninterrupted = hashWorld(twin.world);
});

Given("the app was killed while the turn was processed", (s) => {
  const c = campaign(s);
  endTurn(c, france(s), (cc) => {
    s.killed = { boundary: copyWorld(cc.boundary), journal: cc.journal!.map((q) => ({ ...q })) };
  });
  // Everything the running turn did is lost with the app.
  s.campaign = null;
});

When("the campaign is resumed", (s) => {
  s.resumed = resumeKilledTurn(s.killed.boundary, s.killed.journal, {}, nationOf(s.killed.boundary, "france"));
});

Then("the turn is processed again from the last turn-boundary save with the same {int} orders", (s, count: number) => {
  expect(s.killed.journal).toHaveLength(count);
  expect(s.resumed.result.ended).toBe(true);
  expect(s.resumed.campaign.world.turn).toBe(s.killed.boundary.turn + 1);
});

Then("the resulting world hash is the same as an uninterrupted turn", (s) => {
  expect(hashWorld(s.resumed.campaign.world)).toBe(s.uninterrupted);
});

// Step by step (TIME-075)

When("the next turn is begun step by step", (s) => {
  s.cursor = startTurn(s.stopLoop);
  s.stepsPlayed = [] as unknown[];
});

Then("each step plays one 4-hour step of the day while the battle runs", (s) => {
  const loop: DayLoop = s.stopLoop;
  const before = loop.battles[0]!.rounds;
  const played = playStep(s.cursor);
  expect(played).toEqual({ kind: "4-hour step", day: 2, step: 1 });
  expect(loop.battles[0]!.rounds).toBe(before + 1);
  s.roundsAfter = loop.battles[0]!.rounds;
});

Then("nothing more is played until the next step is asked for", (s) => {
  const loop: DayLoop = s.stopLoop;
  expect(loop.battles[0]!.rounds).toBe(s.roundsAfter);
  expect(isTurnDone(s.cursor)).toBe(false);
});

Then("the turn is done after its 7 days and the weekly steps", (s) => {
  const loop: DayLoop = s.stopLoop;
  let n = 0;
  while (!isTurnDone(s.cursor)) {
    s.stepsPlayed.push(playStep(s.cursor));
    n++;
  }
  expect(loop.day).toBe(8);
  expect(s.stepsPlayed.at(-1)).toMatchObject({ kind: "weekly steps" });
  expect(n).toBeGreaterThan(7);
});
