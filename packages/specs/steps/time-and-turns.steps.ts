import { expect } from "vitest";
import { loadDefaultRuleset, type GameDate, type Ruleset } from "@ph/rules";
import { hashWorld, processTurn, Rng, type Order, type World } from "@ph/engine";
import {
  AGES,
  acceptsInput,
  ageByName,
  ageRunning,
  agesRunning,
  answerArrives,
  autosaveDue,
  cadenceOf,
  CADENCES,
  campaignOf,
  carryOn,
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
  type StepCalendar,
  type SystemStep,
  type TurnPlan,
  type WetClimate,
} from "@ph/engine/domain/time-and-turns";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("time-and-turns");

const rules: Ruleset = loadDefaultRuleset();
const DAYS = rules.defines.march.daysPerMonth;

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

/** Plays out the month in the loop, carrying on past every stop and noting where it stopped. */
function playOut(s: Scenario, loop: DayLoop): void {
  s.stops ??= [];
  let b = playMonth(loop);
  while (b) {
    s.stops.push(b);
    b = carryOn(loop);
  }
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
  if (s.calendar) plan.calendar = s.calendar as StepCalendar;
  s.turnLog = runTurnPlan(plan);
  s.processed = true;
}

/** Plays out the month with every monthly step of the cadence table counted. */
function playTheMonth(s: Scenario): void {
  const loop = defaultLoop(s);
  const monthly = CADENCES.filter((c) => c.cadence === "monthly").map((c) => counter(s, c.step));
  s.turnLog = runTurnPlan({ date: s.date ?? { year: 1444, month: 3 }, dayLoop: () => playOut(s, loop), systems: [...monthly, ...(s.systems ?? [])] });
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
  else campaign(s).world.turn = n;
});

When("the turn is processed", (s) => processTheTurn(s));

Given("the config value {string} is {int}", (s, key: string, value: number) => {
  if (key === "march.daysPerMonth") expect(rules.defines.march.daysPerMonth).toBe(value);
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
  s.result = endTurn(c, france(s));
  if (s.presentLoop) {
    s.reached = [] as Battle[];
    let b = playMonth(s.presentLoop);
    while (b) {
      s.reached.push(b);
      b = carryOn(s.presentLoop);
    }
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

Then("then the marches, the economy and the levies run", (s) => {
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
  expect(campaign(s).world.date).toEqual(nextMonth(s.dateBefore));
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
    onMeet: (a, b, l) => (l.battles.length || l.scheduled.length ? null : { sides: [a.side, b.side], movers: [a.id, b.id], days: 1 }),
    resolveBattle: () => rng(),
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

Given("the player's army fights one battle this month", (s) => {
  const w = campaign(s).world;
  s.presentLoop = playerBattleLoop(w, 14, () => w.rng.next());
});

Given("two events fire this month", (s) => {
  s.events = [
    { day: 20, id: "the second event" },
    { day: 5, id: "the first event" },
  ];
});

Then("the turn in progress is shown first", (s) => expect(s.presentation[0]).toBe("turn in progress"));

Then("the battle is shown when the month reaches it", (s) => {
  expect(s.reached).toHaveLength(1);
  expect(dayOfMonth(s.presentLoop, s.reached[0].day)).toBe(14);
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

Then("then standing orders are applied", (s) => {
  const loop: DayLoop = s.loop;
  const at = phaseAt(loop, "standingOrders");
  expect(at).toBeGreaterThan(loop.log.findIndex((e) => "met" in e));
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

When("the month is played out", (s) => playTheMonth(s));
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

Then(/^"(.+)" runs once a (day|month)$/, (s, step: string, every: string) => {
  const c = cadenceOf(step)!;
  expect(c).toBeDefined();
  if (every === "day") {
    expect(c.cadence).toBe("daily");
    const loop: DayLoop = s.loop;
    expect(loop.day).toBe(DAYS);
    for (let d = 1; d <= DAYS; d++) {
      const n = loop.log.filter((e) => e.day === d && "phase" in e && e.phase === c.phase && (c.kind ? "kind" in e && e.kind === c.kind : !("kind" in e && e.kind))).length;
      expect(n).toBe(1);
    }
  } else {
    expect(c.cadence).toBe("monthly");
    expect(s.count[c.step]).toBe(1);
  }
});

Given("an army starts a mountain step of {int} days on day {int}", (s, days: number, day: number) => {
  const loop = createDayLoop([{ id: "army", kind: "army", side: "France", at: "Savoie", route: ["Valais"], stepDays: [days], progress: 0 }], {}, DAYS);
  // Days before the step starts pass with the army standing.
  loop.day = day - 1;
  s.loop = loop;
});

When("the month ends", (s) => {
  playMonth(s.loop);
});

Then("the army still stands in the province it left with {int} days of progress", (s, progress: number) => {
  const m: Mover = s.loop.movers[0];
  expect(m.at).toBe("Savoie");
  expect(m.progress).toBe(progress);
});

Then("it arrives on day {int} of the next month", (s, day: number) => {
  const loop: DayLoop = s.loop;
  playMonth(loop);
  const arrived = loop.log.find((e) => "arrived" in e)!;
  expect(arrived.day).toBe(DAYS + day);
  expect(dayOfMonth(loop, arrived.day)).toBe(day);
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
  // Results are shown in the turn report, after the day loop; each was worked out on its own day.
  expect(indexOf(s, "day loop")).toBeGreaterThanOrEqual(0);
  for (const b of loop.battles) expect(b.result).toBe(`result of ${b.id}`);
  const shown = turnPresentation(loop.battles.map((b) => ({ day: b.day, id: b.id })), []);
  expect(shown.filter((x) => x.startsWith("battle:"))).toEqual(loop.battles.map((b) => `battle:${b.id}`));
});

Given("the countries {string} and {string} fight a battle on day {int}", (s, a: string, b: string, day: number) => {
  const loop = createDayLoop([], { resolveBattle: () => "fought", isPlayerBattle: (x) => x.sides.includes(s.player) }, DAYS);
  scheduleBattle(loop, { id: `${a} against ${b}`, day, place: "Navarre", sides: [a, b], movers: [], days: 1 });
  s.loop = loop;
});

Given("the player is {string}", (s, name: string) => {
  s.player = name;
});

Then("the turn does not stop for that battle", (s) => {
  expect(s.stops).toEqual([]);
  expect(s.loop.battles[0].result).toBe("fought");
});

Given("the turn stopped at the player's battle in {string} on day {int}", (s, place: string, day: number) => {
  const c = campaign(s);
  s.preTurn = copyWorld(c.world);
  s.makeLoop = (w: World) => playerBattleLoop(w, day, () => w.rng.next());
  const loop: DayLoop = s.makeLoop(c.world);
  const b = playMonth(loop)!;
  expect(b).not.toBeNull();
  expect(b.place).toBe(place);
  expect(dayOfMonth(loop, b.day)).toBe(day);
  s.first = { day: b.day, place: b.place, result: b.result };
});

Given("the app was killed before the player carried on", (s) => {
  // The running world is lost with the app; only the pre-turn save remains.
  s.campaign = null;
});

When("the campaign is resumed from the pre-turn save with the same orders", (s) => {
  const world = copyWorld(s.preTurn);
  const loop: DayLoop = s.makeLoop(world);
  s.again = playMonth(loop);
});

Then("the month reaches the battle in {string} on day {int} again", (s, place: string, day: number) => {
  expect(s.again.place).toBe(place);
  expect(s.again.day).toBe(s.first.day);
  expect(((s.again.day - 1) % DAYS) + 1).toBe(day);
});

Then("the battle has the same result", (s) => {
  expect(s.again.result).toBe(s.first.result);
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
  // Which month ends a year is open (OQ-TIME-6): the rule holds for every choice.
  for (let yearEndMonth = 1; yearEndMonth <= 12; yearEndMonth++) {
    for (let from = s.date.year; from < s.date.year + every; from++) {
      let d: GameDate = s.date;
      let runs = 0;
      for (let m = 0; m < 12 * s.years; m++, d = nextMonth(d)) if (dueInMonth("five-yearly", d, { yearEndMonth, fiveYearlyFrom: from })) runs++;
      expect(runs).toBe(s.years / every);
    }
  }
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

Given("{int} traders walked through a province during the month", (s, n: number) => {
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
  expect(s.loop.day).toBe(DAYS);
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

Then("the loom house's slots open before the month's overflow is placed", (s) => {
  expect(indexOf(s, "building upkeep and construction sites")).toBeLessThan(indexOf(s, "births, deaths and overflow"));
  expect(s.province.placed).toBe(25);
});

Given("a province with French and Flemish speakers", (s) => {
  s.order = [] as string[];
  s.systems = [
    { name: "culture drift", run: () => s.order.push("culture drift") },
    { name: "births, deaths and overflow", run: () => s.order.push("births and deaths") },
  ];
});

Given("a province with a Catholic and a Protestant community", (s) => {
  s.systems = [counter(s, "faith mix"), counter(s, "culture drift"), counter(s, "traders and trade balance")];
});

When("a year ends", (s) => {
  const c = campaign(s);
  s.calendar = { yearEndMonth: c.world.date.month };
  processTheTurn(s);
});

Then("births and deaths of that month run before culture drift", (s) => {
  expect(s.order).toEqual(["births and deaths", "culture drift"]);
});

Then("the faith mix updates in the same step as traders and trade balance", (s) => {
  const log: { name: string; group: number }[] = s.turnLog;
  const faith = log.find((e) => e.name === "faith mix")!;
  const traders = log.find((e) => e.name === "traders and trade balance")!;
  expect(faith.group).toBe(traders.group);
  expect(Math.abs(log.indexOf(faith) - log.indexOf(traders))).toBe(1);
  expect(s.count["faith mix"]).toBe(1);
});

Given("the country {string} asks {string} for an alliance in {string}", (s, from: string, to: string, when: string) => {
  s.sent = parseMonthYear(when);
  s.proposal = { from, to };
  campaign(s).world.date = s.sent;
});

Then("the answer arrives in the turn of {string}", (s, when: string) => {
  const d = parseMonthYear(when);
  expect(answerArrives(s.sent)).toEqual(d);
  expect(campaign(s).world.date).toEqual(d);
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
  let d: GameDate = { ...rules.defines.startDate };
  s.autosaves = [] as GameDate[];
  for (let t = 0; t < 12; t++, d = nextMonth(d)) if (autosaveDue(s.autosave, d)) s.autosaves.push(d);
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
  expect(s.loaded.date).toEqual(parseMonthYear(when));
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
