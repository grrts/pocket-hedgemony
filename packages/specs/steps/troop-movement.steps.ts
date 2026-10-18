import { expect } from "vitest";
import { loadDefaultRuleset, type Terrain } from "@ph/rules";
import { createEngineHost } from "@ph/engine";
import {
  MARCH,
  MOVE,
  type Army,

  type MoverRules,
  type MoveWorld,
  type MonthLog,
  type Place,
  type RoutePlan,
  applyOrder,
  playTurn,
  beginBattle,
  orderRetreat,
  setAiStandingOrders,
  armyById,
  armyMayEnter,
  breakArmy,
  confirmedBy,
  createMover,
  defaultMarchTogether,
  displayDays,
  drawFront,
  eatsFrom,
  ferryOpen,
  foodColour,
  forageShares,
  isWetSeason,
  joinArmies,
  landArmy,
  landRule,
  marchTogether,
  moverParts,
  newArmy,
  newRegimentsReady,
  noticesFor,
  offeredOrders,
  paceOf,
  planAcrossWater,
  planRoute,
  playDays,
  playMonth,
  previewRoute,
  rallyHere,
  roadFactor,
  routeFood,
  shipMayEnterBase,
  shownDayCounts,
  splitArmy,
  canForage,
  interceptTarget,
  roadOf,
  monthPlayback,
  newLog,
  riverKindOfRank,
  startFlood,
  stepBreakdown,
  withdrawCheck,
  withdrawTo,
  type BreakResult,
  type DayHooks,
  type MoveOrder,
  type Road,
} from "@ph/engine/domain/troop-movement";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("troop-movement");

// ---------- worlds ----------

type PlaceSpec = Omit<Place, "id">;

function mkWorld(places: Record<string, PlaceSpec>, edges: string[]): MoveWorld {
  const neighbours: Record<string, string[]> = {};
  for (const id of Object.keys(places)) neighbours[id] = [];
  for (const e of edges) {
    const [a, b] = e.split("-") as [string, string];
    neighbours[a]!.push(b);
    neighbours[b]!.push(a);
  }
  return {
    date: { year: 1450, month: 4 },
    places: Object.fromEntries(Object.entries(places).map(([id, p]) => [id, { id, ...p }])),
    neighbours,
    relations: { wars: [], alliances: [], passage: [], subjects: [] },
    movers: [],
  };
}

const land = (owner: string | null, terrain: Terrain = "farmland", more: Partial<PlaceSpec> = {}): PlaceSpec => ({ terrain, owner, ...more });

/** Champagne and Burgundy: Paris, Sens, Auxerre, Troyes (France); Langres (hills), Dijon, Beaune (Burgundy). */
function champagne(): MoveWorld {
  const w = mkWorld(
    {
      Paris: land("France"),
      Sens: land("France"),
      Auxerre: land("France"),
      Troyes: land("France"),
      Langres: land("Burgundy", "hills"),
      Dijon: land("Burgundy"),
      Beaune: land("Burgundy"),
    },
    ["Paris-Troyes", "Paris-Sens", "Sens-Troyes", "Sens-Auxerre", "Auxerre-Dijon", "Troyes-Langres", "Langres-Dijon", "Langres-Beaune", "Dijon-Beaune"],
  );
  w.relations.passage.push(["Burgundy", "France"]);
  return w;
}

const W = (s: Scenario): MoveWorld => (s.w ??= champagne());
const A = (s: Scenario, id: string): Army => armyById(W(s), id);
const war = (s: Scenario, a: string, b: string) => W(s).relations.wars.push([a, b]);
const removeEdge = (w: MoveWorld, a: string, b: string) => {
  w.neighbours[a] = (w.neighbours[a] ?? []).filter((x) => x !== b);
  w.neighbours[b] = (w.neighbours[b] ?? []).filter((x) => x !== a);
};
function put(s: Scenario, id: string, owner: string, place: string, men = 10000, extra: Partial<Army> = {}): Army {
  const a = newArmy(id, owner, place, men, 0, extra);
  W(s).movers.push(a);
  s.subject = id;
  return a;
}
/** Starts a step of a set number of days with some days already walked. */
function walking(a: Army, to: string, days: number, walked = 0, rest: string[] = []): void {
  a.route = [to, ...rest];
  a.step = { to, days };
  a.progress = walked;
}
const hooks = (s: Scenario): DayHooks => (s.hooks ??= {});
function schedule(s: Scenario, day: number, apply: (w: MoveWorld) => void): void {
  (hooks(s).scheduled ??= []).push({ day, apply });
}
function runPending(s: Scenario): void {
  for (const [realm, o] of (s.pending ?? []) as [string, MoveOrder][]) expect(applyOrder(W(s), realm, o).ok).toBe(true);
  s.pending = [];
}
const month = (s: Scenario): MonthLog => {
  runPending(s);
  return (s.log = playMonth(W(s), hooks(s)));
};
/** Plays day by day until the army stands in `place` (at most two months). */
function playUntil(s: Scenario, id: string, place: string): void {
  runPending(s);
  s.log ??= undefined;
  let log: MonthLog | undefined = s.log;
  for (let d = s.day ?? 1; d <= 60; d++) {
    log = playDays(W(s), d, d, hooks(s), log);
    s.day = d + 1;
    if (A(s, id).place === place) break;
  }
  s.log = log;
}
const close = (actual: number, expected: string) => {
  const dec = (expected.split(".")[1] ?? "").length;
  expect(Number(actual.toFixed(dec))).toBe(Number(expected));
};
const months: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};
const seasonMonth: Record<string, number> = { winter: 1, spring: 4, summer: 7, autumn: 10 };

// Stub rules standing in for naval's and trade's (they decide their own numbers).
function stubRules(days: (from: string, to: string) => number, may: (w: MoveWorld, p: string) => boolean, calls: { kind: string; day?: number; place?: string; armies?: string[] }[] = []): MoverRules {
  return {
    stepDays: (_w, _m, from, to) => {
      calls.push({ kind: "stepDays" });
      return days(from, to);
    },
    mayEnter: (w, _m, p) => {
      calls.push({ kind: "mayEnter" });
      return { ok: may(w, p) };
    },
    stopsAt: (w, m, place, day) => {
      calls.push({ kind: "stopsAt", day, place, armies: w.movers.filter((x) => x.kind === "army" && x.place === place && x.owner !== m.owner).map((x) => x.id) });
      return null;
    },
  };
}
const fleetRules = (calls?: { kind: string }[]) => stubRules(() => 1, (w, p) => shipMayEnterBase(w, p).ok, calls);

// ---------- common Givens ----------

Given(/^the country "(\w+)" is at war with the country "(\w+)"$/, (s, a: string, b: string) => {
  war(s, a, b);
});

Given(/^the config "march\.(\w+)" is (\d+)$/, (_s, key: string, n: string) => {
  expect((MARCH as unknown as Record<string, number>)[key]).toBe(Number(n));
});

Then(/^the army "(\w+)" stands in "(\w+)"$/, (s, id: string, place: string) => expect(A(s, id).place).toBe(place));
Then(/^it stands in "(\w+)"$/, (s, place: string) => expect(A(s, s.subject).place).toBe(place));

When("the weekly turns of the month are played", (s) => {
  if (s.monthPlayed) return;
  month(s);
});
When("the weekly turns of a whole month are played", (s) => {
  s.calls = { weekly: [] as [string, number][], sieges: [] as [number, string][], monthly: [] as string[] };
  const h = hooks(s);
  h.weekly = Object.fromEntries(["food", "hunger", "plunder", "raids"].map((k) => [k, (_w: MoveWorld, day: number) => s.calls.weekly.push([k, day])]));
  h.monthly = Object.fromEntries(["sieges", "sickness", "pay"].map((k) => [k, () => s.calls.monthly.push(k)]));
  s.log = newLog();
  runPending(s);
  playMonth(W(s), h, s.log);
});

// ---------- day loop ----------

When("a turn ends", (s) => {
  month(s);
});
When("a day of the month is played", (s) => {
  s.log = playDays(W(s), 1, 1);
});
Then("the steps run in this order:", (s, table: string[][]) => {
  const want = table.slice(1).map((r) => r[0]);
  expect(s.log.phases.filter((p: { day: number }) => p.day === 1).map((p: { phase: string }) => p.phase)).toEqual(want);
});

Given(/^the army "(\w+)" walks a step of ([\d.]+) days from "(\w+)" to "(\w+)"$/, (s, id: string, days: string, from: string, to: string) => {
  walking(put(s, id, "France", from), to, Number(days));
});
Given(/^the army "(\w+)" has walked (\d+) days of it$/, (s, id: string, n: string) => {
  A(s, id).progress = Number(n);
});
When("one more day is played", (s) => {
  s.log = playDays(W(s), 1, 1);
});

Given(/^the army "(\w+)" is one day from "(\w+)"$/, (s, id: string, to: string) => {
  walking(put(s, id, "France", "Troyes"), to, 6, 5);
});
When(/^the army "(\w+)" arrives in "(\w+)"$/, (s, id: string, place: string) => playUntil(s, id, place));
Then(/^the stop checks run for "(\w+)"$/, (s, place: string) => {
  expect(s.log.stopChecks).toContainEqual(expect.objectContaining({ army: s.subject, place }));
});

When(/^the French army "(\w+)" and the Burgundian army "(\w+)" stand in "(\w+)" at the end of day (\d+)$/, (s, a: string, b: string, place: string, day: string) => {
  const n = Number(day);
  walking(put(s, a, "France", "Troyes"), place, n);
  walking(put(s, b, "Burgundy", "Dijon"), place, n);
  s.log = playDays(W(s), 1, n);
});
Then(/^the battle rules start in "(\w+)" on day (\d+)$/, (s, place: string, day: string) => {
  expect(s.log.battles).toContainEqual(expect.objectContaining({ place, day: Number(day) }));
  expect(s.log.battles.filter((b: { day: number }) => b.day < Number(day))).toEqual([]);
});

Given(/^the army "(\w+)" is in a battle that lasts 3 days$/, (s, id: string) => {
  const a = put(s, id, "France", "Troyes");
  walking(a, "Langres", 7.5, 1);
  // A running battle of 3 days: 18 rounds of 4 hours (X-1).
  beginBattle(W(s), { place: "Troyes", day: 0, sides: [[id], ["X"]], caughtBroken: [] }, { rounds: 3 * MOVE.battleSteps.perDay });
});
When("those 3 days are played", (s) => {
  s.log = playDays(W(s), 1, 3);
});
Then(/^the army "(\w+)" adds no days to its step$/, (s, id: string) => expect(A(s, id).progress).toBe(1));

Then("army food, hunger, plunder and raids run at the end of each 7-day turn, on days 7, 14, 21 and 28", (s) => {
  for (const k of ["food", "hunger", "plunder", "raids"])
    expect(s.calls.weekly.filter(([x]: [string, number]) => x === k).map(([, d]: [string, number]) => d)).toEqual([7, 14, 21, 28]);
});
Then("sieges, sickness and pay run once, in the turn in which the month begins", (s) => {
  expect(s.calls.monthly).toEqual(["sieges", "sickness", "pay"]);
  expect(s.log.monthly).toEqual(["sieges", "sickness", "pay"]);
});

Given(/^the army "(\w+)" is walking from "(\w+)" to "(\w+)" with 3 days left$/, (s, id: string, from: string, to: string) => {
  walking(put(s, id, "France", from), to, 6, 3);
});
Then(/^it eats, is seen and can be attacked in "(\w+)"$/, (s, place: string) => {
  const w = W(s);
  const a = A(s, s.subject);
  expect(a.place).toBe(place);
  expect(eatsFrom(w, a)).toBe(landRule(w, a.owner, place).eats);
  // An enemy army in that province meets it there.
  war(s, "France", "Burgundy");
  put(s, "Foe", "Burgundy", place, 1000);
  const log = playDays(w, 1, 1);
  expect(log.battles).toContainEqual(expect.objectContaining({ place }));
});

Given(/^the French army "(\w+)" walks from "(\w+)" to "(\w+)" with (\d+) days left$/, (s, id: string, from: string, to: string, left: string) => {
  walking(put(s, id, "France", from), to, 7, 7 - Number(left));
});
Given(/^the Burgundian army "(\w+)" walks from "(\w+)" to "(\w+)" with (\d+) days left$/, (s, id: string, from: string, to: string, left: string) => {
  walking(put(s, id, "Burgundy", from), to, 7, 7 - Number(left));
});
When("they meet on the border", (s) => {
  s.log = playDays(W(s), 1, 1);
});
Then(/^the battle is fought in "(\w+)"$/, (s, place: string) => {
  expect(s.log.battles.map((b: { place: string }) => b.place)).toEqual([place]);
});

Given(/^the army "(\w+)" starts a mountain step of 9 days on day 3 of a turn$/, (s, id: string) => {
  const w = W(s);
  w.places["Alps"] = { id: "Alps", terrain: "mountains", owner: "France" };
  walking(put(s, id, "France", "Troyes"), "Alps", 9);
  s.log = playDays(w, 4, 7);
});
When("the next turn is played", (s) => {
  s.calls = { weekly: [] as [string, number][], monthly: [] as string[] };
  const h = hooks(s);
  h.weekly = { food: (_w: MoveWorld, day: number) => s.calls.weekly.push(["food", day]) };
  h.monthly = { pay: () => s.calls.monthly.push("pay") };
  s.log = playTurn(W(s), h);
});
Given(/^the date is (\d+) March 1451$/, (s, d: string) => {
  W(s).date = { year: 1451, month: 3, day: Number(d) };
});
Then("the weekly steps run once, at the end of the turn", (s) => expect(s.calls.weekly).toEqual([["food", 7]]));
Then("the monthly steps run, because April begins in this turn", (s) => expect(s.calls.monthly).toEqual(["pay"]));
Then("the next turn starts on 5 April 1451", (s) => expect(W(s).date).toEqual({ year: 1451, month: 4, day: 5 }));
Then(/^the army "(\w+)" arrives on day (\d+) of the next turn$/, (s, id: string, day: string) => {
  expect(s.log.entered.filter((e: { mover: string }) => e.mover === id).map((e: { day: number }) => e.day)).toEqual([Number(day)]);
});

// ---------- Dunois 1450 ----------

Given("the date is March 1450", (s) => {
  W(s).date = { year: 1450, month: 3 };
});
Given(/^"Jean de Dunois" with Cunning 4 leads 14200 men with 3200 horse and 8 bombards in "Paris"$/, (s) => {
  put(s, "Dunois", "France", "Paris", 14200, { horse: 3200, bombards: 8, commander: { name: "Jean de Dunois", cunning: 4 } });
  (s.pending ??= []).push(["France", { kind: "march to", army: "Dunois", to: "Dijon" }]);
});
Given(/^"Paris" and "Troyes" are French farmland, "Langres" is Burgundian hills, "Dijon" is Burgundian farmland$/, (s) => {
  const w = W(s);
  w.places = {
    Paris: { id: "Paris", ...land("France") },
    Troyes: { id: "Troyes", ...land("France") },
    // The worked example (12): Langres has a stone castle and 400 garrison.
    Langres: { id: "Langres", ...land("Burgundy", "hills", { castle: { owner: "Burgundy", garrison: 400 } }) },
    Dijon: { id: "Dijon", ...land("Burgundy") },
    Beaune: { id: "Beaune", ...land("Burgundy") },
  };
  w.neighbours = { Paris: ["Troyes"], Troyes: ["Paris", "Langres"], Langres: ["Troyes", "Dijon", "Beaune"], Dijon: ["Langres", "Beaune"], Beaune: ["Langres", "Dijon"] };
});
Given(/^"Troyes" is on the Seine with no bridge$/, (s) => {
  W(s).places["Troyes"]!.river = "river";
});
When(/^the step from "(\w+)" to "(\w+)" is planned$/, (s, from: string, to: string) => {
  s.days = stepBreakdown(W(s), A(s, "Dunois"), from, to).days;
});
Then(/^the step takes ([\d.]+) days$/, (s, days: string) => close(s.days, days));

Then(/^Dunois arrives at "(\w+)" on day (\d+) and besieges it$/, (s, place: string, day: string) => {
  expect(s.log.entered).toContainEqual(expect.objectContaining({ mover: "Dunois", place, day: Number(day) }));
  expect(A(s, "Dunois").greyed).toEqual(["Dijon"]);
  expect(offeredOrders(W(s), A(s, "Dunois"))).toContain("Besiege");
  expect(applyOrder(W(s), "France", { kind: "besiege", army: "Dunois" }).ok).toBe(true);
  expect(A(s, "Dunois").besieging).toBe(true);
});

Given(/^"the Bastard of Burgundy" with Cunning 2 leads 8000 men seen by France as a rumour of "about 6000 near Beaune"$/, (s) => {
  put(s, "Bastard", "Burgundy", "Beaune", 8000, { commander: { name: "the Bastard of Burgundy", cunning: 2 } });
  W(s).shown = { France: { Bastard: 6000 } };
});
Given(/^his standing order is "retreat if outnumbered" 3 to 2$/, (s) => {
  A(s, "Bastard").retreatIfOutnumbered = 3 / 2;
});
When(/^his army marches north and stands in "(\w+)" at the end of day (\d+)$/, (s, place: string, day: string) => {
  const w = W(s);
  const b = A(s, "Bastard");
  const walk = Math.ceil(stepBreakdown(w, b, b.place, place).days);
  b.route = [place];
  b.waitDays = Number(day) - walk;
  runPending(s);
  s.log = playDays(w, 1, Number(day));
  expect(b.place).toBe(place);
});
Then("he wants to withdraw because 14200 against 8000 is more than 3 to 2", (s) => {
  const c = withdrawCheck(W(s), A(s, "Bastard"), [A(s, "Dunois")]);
  expect(c.counted).toBe(14200);
  expect(c.wants).toBe(true);
});
Then("he must fight because his Cunning is lower than Dunois'", (s) => {
  expect(withdrawCheck(W(s), A(s, "Bastard"), [A(s, "Dunois")]).getsAway).toBe(false);
  expect(s.log.mustFight).toContainEqual(expect.objectContaining({ army: "Bastard", day: 22 }));
  expect(s.log.battles).toContainEqual(expect.objectContaining({ place: "Langres", day: 22 }));
});
Then(/^the garrison of "(\w+)" joins him from the walls$/, (s, place: string) => {
  const b = s.log.battles.find((x: { place: string }) => x.place === place);
  expect(b.garrisonJoins).toBe("Burgundy");
  expect(b.sides.find((side: string[]) => side.includes("Bastard"))).toBeDefined();
});
Then(/^Leroy gets one notice "(.+)"$/, (s, text: string) => {
  expect(noticesFor(W(s), "France", s.log).map((n) => n.text)).toEqual([text]);
});

Given(/^Dunois wins and the castle of "(\w+)" falls$/, (s, place: string) => {
  playUntil(s, "Dunois", place);
  expect(A(s, "Dunois").greyed).toEqual(["Dijon"]);
  W(s).places[place]!.castle = { owner: "France", garrison: 0 };
});
When("Leroy taps the grey leg", (s) => {
  s.result = applyOrder(W(s), "France", { kind: "resume", army: "Dunois" });
});
Then(/^the march to "(\w+)" resumes$/, (s, to: string) => {
  expect(s.result.ok).toBe(true);
  expect(A(s, "Dunois").route).toEqual([to]);
});

// ---------- food on the road ----------

Given(/^the army "(\w+)" plans a route abroad$/, (s, id: string) => {
  put(s, id, "France", "Langres");
  s.route = { path: ["Dijon"], arrive: [6] };
});
const shares: Record<string, number> = { "three quarters": 0.75, "a third": 1 / 3, nothing: 0 };
Given(/^on arrival at a province its reserve is (three quarters|a third|nothing) of full$/, (s, share: string) => {
  A(s, s.subject).reserve = { days: shares[share]! * 40 + 6, full: 40 };
});
Given(/^its reserve (covers|doesn't cover) the march$/, (s, covers: string) => {
  const food = routeFood(W(s), A(s, s.subject), s.route);
  expect(food.steps[0]!.reserve > 0).toBe(covers === "covers");
  s.food = food;
});
Then(/^that step of the route is (green|yellow|red)$/, (s, colour: string) => {
  expect(s.food.steps[0].colour).toBe(colour);
  expect(foodColour(s.food.steps[0].reserve / 40)).toBe(colour);
});

Given(/^the army "(\w+)" plans a route leaving its realm's land$/, (s, id: string) => {
  const names = ["Paris", "Troyes", "Langres", "Dijon", "Beaune", "Chalon"];
  s.w = mkWorld(
    Object.fromEntries(names.map((n, i) => [n, land(i < 2 ? "France" : "Burgundy")])),
    names.slice(1).map((n, i) => `${names[i]}-${n}`),
  );
  W(s).relations.passage.push(["Burgundy", "France"]);
  put(s, id, "France", "Paris", 10000, { reserve: { days: 30, full: 30 } });
  s.plan = planRoute(W(s), A(s, id), "Chalon");
  expect(s.plan.path).toEqual(names.slice(1));
});
Then("a flag marks the last province from which it can still get home before its reserve runs out", (s) => {
  const f = routeFood(W(s), A(s, s.subject), s.plan);
  expect(f.pointOfNoReturn).toBe("Beaune");
  // From Beaune the walk back to Troyes (18 days) fits in the reserve; from Chalon it doesn't.
  const at = (p: string) => f.steps.find((x) => x.place === p)!;
  expect(at("Beaune").reserve).toBeGreaterThanOrEqual(at("Beaune").arrive - at("Troyes").arrive);
  expect(at("Chalon").reserve).toBeLessThan(at("Chalon").arrive - at("Troyes").arrive);
});

Given(/^the army "(\w+)" has 40 percent of its reserve on a route past its own castle at "(\w+)"$/, (s, id: string, castle: string) => {
  const a = put(s, id, "France", "Paris", 10000, { reserve: { days: 12, full: 30 } });
  a.route = [castle, "Langres"];
  W(s).places[castle]!.castle = { owner: "France", garrison: 300, food: 1000, siegeReserve: 200 };
});
Given(/^"(\w+)" has the most food above its siege reserve of the realm's castles on the way$/, (s, castle: string) => {
  W(s).places["Paris"]!.castle = { owner: "France", garrison: 300, food: 300, siegeReserve: 200 };
  expect(W(s).places[castle]!.castle!.food).toBe(1000);
});
When(/^the player chooses "Refill and go"$/, (s) => {
  s.result = applyOrder(W(s), "France", { kind: "refill and go", army: s.subject });
});
Then(/^a stop at "(\w+)" is added to the route$/, (s, at: string) => {
  const a = A(s, s.subject);
  expect(a.refill?.at).toBe(at);
  expect(a.route).toContain(at);
});
Then(/^the army "(\w+)" waits (\d+) days there to refill$/, (s, id: string, days: string) => {
  expect(s.result.days).toBe(Number(days));
  playUntil(s, id, "Troyes");
  expect(A(s, id).waitDays).toBe(Number(days));
  expect(A(s, id).reserve!.days).toBe(30);
});

// ---------- meeting the enemy ----------

function meetingSetup(s: Scenario): void {
  if (s.met) return;
  s.met = true;
  war(s, "France", "Burgundy");
  put(s, "B", "Burgundy", "Langres", 8000, { commander: { name: "b", cunning: 0 } });
  put(s, "A", "France", "Troyes", 8000, { commander: { name: "a", cunning: 0 } });
  s.subject = "B";
}
Given(/^the army "B" has standing order "retreat if outnumbered" 3 to 2$/, (s) => {
  meetingSetup(s);
  A(s, "B").retreatIfOutnumbered = 1.5;
});
Given(/^the army "B" sees the army "A" at (\d+) men while it has (\d+) men$/, (s, shown: string, own: string) => {
  meetingSetup(s);
  A(s, "A").men = Number(shown);
  A(s, "B").men = Number(own);
});
Given(/^the commander of "B" has Cunning (\d+) and the commander of "A" has Cunning (\d+)$/, (s, b: string, a: string) => {
  A(s, "B").commander!.cunning = Number(b);
  A(s, "A").commander!.cunning = Number(a);
});
Given(/^the army "B" (is trapped|is not trapped)$/, (s, t: string) => {
  if (t === "is trapped") ["Dijon", "Beaune", "Troyes"].forEach((p, i) => put(s, `F${i}`, "France", p, 100));
});
When(/^both armies end a day in "(\w+)"$/, (s, place: string) => {
  walking(A(s, "A"), place, 1);
  if (A(s, "B").place !== place) walking(A(s, "B"), place, 1);
  s.log = playDays(W(s), 1, 1);
});
Then(/^the army "B" (must fight|withdraws|fights)$/, (s, r: string) => {
  const withdrew = s.log.withdrawals.some((x: { army: string }) => x.army === "B");
  const forced = s.log.mustFight.some((x: { army: string }) => x.army === "B");
  const fought = s.log.battles.some((b: { sides: string[][] }) => b.sides.flat().includes("B"));
  if (r === "withdraws") expect([withdrew, fought]).toEqual([true, false]);
  else expect([withdrew, forced, fought]).toEqual([false, r === "must fight", true]);
});

Given(/^the army "B" sees a rumour of "about (\d+)" while the real army has (\d+)$/, (s, shown: string, real: string) => {
  meetingSetup(s);
  A(s, "B").retreatIfOutnumbered = 1.5;
  A(s, "A").men = Number(real);
  W(s).shown = { Burgundy: { A: Number(shown) } };
});
When(/^"B" checks its standing order$/, (s) => {
  s.check = withdrawCheck(W(s), A(s, "B"), [A(s, "A")]);
});
Then(/^it counts (\d+) men$/, (s, n: string) => expect(s.check.counted).toBe(Number(n)));

Given(/^the army "B" came from "(\w+)"$/, (s, from: string) => {
  meetingSetup(s);
  A(s, "A").place = "Paris";
  const b = A(s, "B");
  b.place = from;
  walking(b, "Langres", 1);
  s.log = playDays(W(s), 1, 1);
  expect(b.place).toBe("Langres");
});
Given("the army \"B\" was standing still", (s) => {
  meetingSetup(s);
  put(s, "F0", "France", "Dijon", 100);
  s.subject = "B";
  s.fewest = "Beaune";
});
When(/^it withdraws from "(\w+)"$/, (s, place: string) => {
  expect(A(s, "B").place).toBe(place);
  s.to = withdrawTo(W(s), A(s, "B"), 1);
});
Then(/^it steps back to "(\w+)"$/, (s, to: string) => expect(s.to).toBe(to));
Then("it steps back to the neighbouring friendly province with the fewest enemies", (s) => expect(s.to).toBe(s.fewest));

Given(/^the army "B" breaks in battle$/, (s) => {
  put(s, "B", "Burgundy", "Langres", 8000, { wagons: 10, bombards: 2 });
});
Given(/^the winner (has|has not) held the field with horse$/, (s, has: string) => {
  s.breakResult = breakArmy(W(s), A(s, "B"), { winnerHeldFieldWithHorse: has === "has" });
});
Then(/^the army "B" drops half its wagons$/, (s) => expect(A(s, "B").wagons).toBe(5));
Then(/^it (drops|keeps) its guns$/, (s, d: string) => expect(A(s, "B").bombards).toBe(d === "drops" ? 0 : 2));

Given(/^the army "B" breaks in "(\w+)"$/, (s, place: string) => {
  war(s, "France", "Burgundy");
  put(s, "Winner", "France", place, 12000);
  put(s, "B", "Burgundy", place, 6000, { commander: { name: "b", cunning: 1 } });
});
Given(/^its side holds a castle in "(\w+)", 1 province away$/, (s, place: string) => {
  W(s).places[place]!.castle = { owner: "Burgundy", garrison: 300 };
});
When("it retreats", (s) => {
  s.breakResult = breakArmy(W(s), A(s, "B"), { fledMen: 500 });
});
Then(/^it marches to "(\w+)" by the fastest route on forced march$/, (s, to: string) => {
  const r: BreakResult = s.breakResult;
  expect(r).toEqual({ kind: "retreat", refuge: to, route: [to] });
  expect(A(s, "B").route).toEqual([to]);
  expect(paceOf(A(s, "B"))).toBe("Forced");
});
Then("it takes no orders and can't besiege on the way", (s) => {
  const w = W(s);
  expect(offeredOrders(w, A(s, "B"))).toEqual([]);
  expect(applyOrder(w, "Burgundy", { kind: "march to", army: "B", to: "Beaune" }).ok).toBe(false);
  expect(applyOrder(w, "Burgundy", { kind: "besiege", army: "B" }).ok).toBe(false);
});
Then(/^on reaching "(\w+)" it is an ordinary army again and fled men who come back join it$/, (s, place: string) => {
  playUntil(s, "B", place);
  expect(A(s, "B").broken).toBeUndefined();
  expect(A(s, "B").men).toBe(6500);
  expect(s.log.refuges).toContainEqual(expect.objectContaining({ army: "B", place }));
});

Given(/^the broken army "B" passes a castle of its own side on its retreat$/, (s) => {
  W(s).places["Dijon"]!.castle = { owner: "Burgundy", garrison: 300 };
  const b = put(s, "B", "Burgundy", "Langres", 6000, { broken: { refuge: "Beaune", fledMen: 0 } });
  b.route = ["Dijon", "Beaune"];
});
Then("it is not stopped there", (s) => {
  playUntil(s, "B", "Beaune");
  expect(s.log.entered).toContainEqual(expect.objectContaining({ mover: "B", place: "Dijon" }));
  expect(s.log.stops.filter((x: { army: string }) => x.army === "B")).toEqual([]);
  expect(A(s, "B").place).toBe("Beaune");
});

Given(/^the broken army "B" is retreating$/, (s) => {
  war(s, "France", "Burgundy");
  const b = put(s, "B", "Burgundy", "Langres", 6000, { broken: { refuge: "Dijon", fledMen: 0 }, retreatIfOutnumbered: 1.5, commander: { name: "b", cunning: 5 } });
  walking(b, "Dijon", 10);
});
When("an enemy army meets it", (s) => {
  walking(put(s, "A", "France", "Troyes", 12000), "Langres", 1);
  s.log = playDays(W(s), 1, 1);
});
Then("they fight at once", (s) => {
  expect(s.log.battles).toContainEqual(expect.objectContaining({ place: "Langres", day: 1 }));
});
Then(/^the army "B" can't withdraw and breaks again at the first lost sector$/, (s) => {
  expect(s.log.withdrawals).toEqual([]);
  expect(s.log.battles[0].caughtBroken).toEqual(["B"]);
});

Given(/^the army "B" breaks with no refuge within 3 provinces$/, (s) => {
  const w = W(s);
  for (const p of Object.values(w.places)) p.owner = "France";
  w.relations.capitals = { Burgundy: "Dijon" };
  war(s, "France", "Burgundy");
  put(s, "B", "Burgundy", "Paris", 6000, { commander: { name: "b", cunning: 0 } });
});
Given(/^its commander has Cunning (\d+)$/, (s, n: string) => {
  A(s, "B").commander!.cunning = Number(n);
});
Then("its men become the winner's prisoners", (s) => {
  s.breakResult ??= breakArmy(W(s), A(s, "B"));
  expect(s.breakResult).toMatchObject({ kind: "surrender", prisoners: 6000 });
});
Then(/^its commander (is captured|gets away alone to the capital)$/, (s, fate: string) => {
  if (fate === "is captured") expect(s.breakResult.commander).toBe("captured");
  else expect(s.breakResult).toMatchObject({ commander: "escaped", capital: "Dijon" });
});

Given(/^the army "A" has standing order "(attack|wait)" and (no player route|a player route|a player route with Attack on the way)$/, (s, order: string, route: string) => {
  war(s, "France", "Burgundy");
  W(s).places["Langres"]!.terrain = "farmland";
  const a = put(s, "A", "France", "Troyes", 8000, { stance: order as "attack" | "wait" });
  if (route !== "no player route") {
    a.route = ["Paris"];
    a.playerRoute = true;
  }
  if (route.endsWith("Attack on the way")) a.onTheWay = "attack what we see";
});
Given(/^an enemy army of (\d+) is seen in a neighbouring province with (\d+) days left on its step$/, (s, men: string, left: string) => {
  // One day is played before the standing orders run, leaving it with the days stated.
  walking(put(s, "E", "Burgundy", "Langres", Number(men)), "Dijon", 7, 7 - Number(left) - 1);
  s.subject = "A";
});
Given(/^the army "A" has (\d+) men and its step there takes (\d+) days$/, (s, men: string, days: string) => {
  const a = A(s, "A");
  a.men = Number(men);
  if (String(days) === "4") a.pace = "Forced";
  expect(displayDays(stepBreakdown(W(s), a, "Troyes", "Langres").days)).toBe(Number(days));
});
When("the day's standing orders run", (s) => {
  s.log = playDays(W(s), 1, 1);
});
Then(/^the army "A" (turns to march on it|keeps its route|keeps its place)$/, (s, r: string) => {
  const a = A(s, "A");
  if (r === "turns to march on it") {
    expect(a.route).toEqual(["Langres"]);
    expect(s.log.intercepts).toContainEqual(expect.objectContaining({ army: "A", target: "E" }));
  } else {
    expect(s.log.intercepts).toEqual([]);
    expect(a.route).toEqual(r === "keeps its route" ? ["Paris"] : []);
    expect(a.place).toBe("Troyes");
  }
});

Given(/^the army "A" follows the enemy army "B"$/, (s) => {
  war(s, "France", "Burgundy");
  put(s, "A", "France", "Troyes", 8000);
  put(s, "B", "Burgundy", "Langres", 3000);
  expect(applyOrder(W(s), "France", { kind: "follow", army: "A", target: "B" }).ok).toBe(true);
});
When(/^"B" disappears from sight after being last seen in "(\w+)"$/, (s, place: string) => {
  const b = A(s, "B");
  walking(b, place, 1, 0, ["Dijon"]);
  schedule(s, 2, (w) => {
    w.shown = { France: { B: null } };
  });
  s.subject = "A";
  month(s);
});
Then(/^the army "A" walks to "(\w+)" and stops there with a notice$/, (s, place: string) => {
  const a = A(s, "A");
  expect(a.place).toBe(place);
  expect(a.route).toEqual([]);
  expect(noticesFor(W(s), "France", s.log).map((n) => n.kind)).toContain("lost sight");
});

Given(/^the allied armies "(\w+)" with (\d+) men and "(\w+)" with (\d+) men stand in "(\w+)"$/, (s, a: string, am: string, c: string, cm: string, place: string) => {
  W(s).relations.alliances.push(["France", "Savoy"]);
  put(s, a, "France", place, Number(am));
  put(s, c, "Savoy", place, Number(cm));
  s.place = place;
});
Then("they don't fight or block each other", (s) => {
  const log = playDays(W(s), 1, 1);
  expect(log.battles).toEqual([]);
  expect(log.withdrawals).toEqual([]);
  // Neither stops the other: a third ally marching through goes on.
  walking(put(s, "X", "Savoy", "Paris", 100), s.place, 1, 0, ["Sens"]);
  const log2 = playDays(W(s), 2, 2);
  expect(log2.stops).toEqual([]);
  W(s).movers = W(s).movers.filter((m) => m.id !== "X");
});
Then(/^"(\w+)" gets three quarters of the forage of "(\w+)" and "(\w+)" one quarter$/, (s, a: string, place: string, c: string) => {
  expect(forageShares(W(s), place)).toEqual({ [a]: 0.75, [c]: 0.25 });
});

// ---------- movers ----------

Given(/^a mover of kind "(army|fleet|trade ship|trader)"$/, (s, kind: string) => {
  const w = W(s);
  w.places["Channel"] = { id: "Channel", terrain: "sea" };
  w.rules = { fleet: fleetRules(), "trade ship": fleetRules(), trader: stubRules(() => 6, () => true) };
  const place = kind === "army" || kind === "trader" ? "Troyes" : "Channel";
  const m = kind === "army" ? newArmy("M", "France", place, 1000) : createMover("M", kind as "fleet", "France", place);
  w.movers.push(m);
  s.mover = m;
});
Then("it has a place, a route, progress, a step-days rule, a may-enter rule and a stops-at rule", (s) => {
  const p = moverParts(W(s), s.mover);
  expect(typeof p.place).toBe("string");
  expect(Array.isArray(p.route)).toBe(true);
  expect(p.progress).toBe(0);
  for (const f of ["stepDays", "mayEnter", "stopsAt"] as const) expect(typeof p.rules[f]).toBe("function");
});
Then("its place is one land province or one sea zone", (s) => {
  expect(W(s).places[s.mover.place]).toBeDefined();
});

function seaWorld(s: Scenario): MoveWorld {
  s.w = mkWorld(
    {
      Lagos: land("Portugal", "farmland", { harbour: true }),
      Sagres: land("Portugal"),
      Lisbon: land("Portugal", "farmland", { harbour: true }),
      Evora: land("Portugal"),
      "Lagos Bay": { terrain: "sea" },
      Cape: { terrain: "sea" },
      Atlantic: { terrain: "ocean" },
      Madeira: land("Portugal", "farmland", { harbour: true }),
    },
    ["Lagos-Lagos Bay", "Sagres-Lagos Bay", "Lagos-Sagres", "Lagos Bay-Cape", "Cape-Lisbon", "Lisbon-Evora", "Lisbon-Atlantic", "Atlantic-Madeira", "Sagres-Evora"],
  );
  return s.w;
}

Given("land provinces and sea zones are one set of places with their neighbours", (s) => {
  seaWorld(s);
});
When("a fleet plans a route", (s) => {
  const w = W(s);
  s.calls = [];
  w.rules = { fleet: fleetRules(s.calls) };
  const f = createMover("F", "fleet", "Portugal", "Lagos Bay");
  w.movers.push(f);
  s.plan = planRoute(w, f, "Lisbon");
});
Then("the same planner is used with the fleet's step-days and may-enter rules", (s) => {
  expect(s.plan.path).toEqual(["Cape", "Lisbon"]);
  expect(s.calls.some((c: { kind: string }) => c.kind === "stepDays")).toBe(true);
  expect(s.calls.some((c: { kind: string }) => c.kind === "mayEnter")).toBe(true);
});

function straitWorld(s: Scenario): MoveWorld {
  if (s.w) return s.w;
  s.w = mkWorld(
    {
      Thrace: land("Byzantium", "farmland", { harbour: true }),
      Bithynia: land("Ottomans"),
      Bosporus: { terrain: "sea" },
      Aegean: { terrain: "sea" },
    },
    ["Thrace-Bosporus", "Bithynia-Bosporus", "Bosporus-Aegean"],
  );
  s.w.straits = [{ a: "Thrace", b: "Bithynia", zone: "Bosporus" }];
  s.w.rules = { fleet: fleetRules() };
  return s.w;
}
function fleetIntoStrait(s: Scenario, day: number): void {
  const w = straitWorld(s);
  war(s, "Byzantium", "Ottomans");
  const f = createMover("OF", "fleet", "Ottomans", "Aegean");
  f.route = ["Bosporus"];
  f.step = { to: "Bosporus", days: day };
  w.movers.push(f);
  put(s, "A", "Byzantium", "Thrace", 10000);
  s.log = playDays(w, 1, day);
  expect(s.log.entered).toContainEqual(expect.objectContaining({ mover: "OF", place: "Bosporus", day }));
}
Given(/^an enemy fleet arrives in a strait on day (\d+)$/, (s, day: string) => fleetIntoStrait(s, Number(day)));
Given(/^an enemy fleet enters the strait between "Thrace" and "Bithynia" on day (\d+)$/, (s, day: string) => fleetIntoStrait(s, Number(day)));
When(/^an army tries to cross (?:that strait )?by ferry on day (\d+)$/, (s, day: string) => {
  const w = W(s);
  s.ferry = ferryOpen(w, A(s, "A"), "Thrace", "Bithynia");
  A(s, "A").route = ["Bithynia"];
  s.log = playDays(w, Number(day), Number(day));
});
Then("the crossing is closed", (s) => {
  expect(s.ferry).toEqual({ ok: false, reason: "strait closed" });
  expect(A(s, "A").place).toBe("Thrace");
  expect(s.log.stops).toContainEqual(expect.objectContaining({ army: "A", reason: "strait closed" }));
});

Given(/^an enemy army stands in "(\w+)"$/, (s, place: string) => {
  war(s, "France", "Burgundy");
  put(s, "E", "Burgundy", place, 5000);
});
When(/^a trader walks into "(\w+)" on day (\d+)$/, (s, place: string, day: string) => {
  const w = W(s);
  s.calls = [];
  w.rules = { trader: stubRules(() => Number(day), () => true, s.calls) };
  const t = createMover("T", "trader", "France", "Paris");
  t.route = [place];
  w.movers.push(t);
  s.log = playDays(w, 1, Number(day));
});
Then(/^the trader's stops-at rule reacts to the army on day (\d+)$/, (s, day: string) => {
  expect(s.calls.filter((c: { kind: string }) => c.kind === "stopsAt")).toEqual([{ kind: "stopsAt", day: Number(day), place: "Troyes", armies: ["E"] }]);
});

Given(/^the province "Lagos" has a harbour on a shore tile$/, (s) => {
  seaWorld(s);
});
When(/^a (fleet|army not aboard) tries to step between "Lagos" and its sea zone$/, (s, who: string) => {
  const w = W(s);
  if (who === "fleet") s.may = [shipMayEnterBase(w, "Lagos").ok, shipMayEnterBase(w, "Lagos Bay").ok, shipMayEnterBase(w, "Sagres").ok];
  else {
    const a = put(s, "A", "Portugal", "Lagos", 1000);
    s.may = [armyMayEnter(w, a, "Lagos Bay").ok];
  }
});
Then("it may enter through the harbour", (s) => expect(s.may).toEqual([true, true, false]));
Then("it may not", (s) => expect(s.may).toEqual([false]));

Given(/^an army of (\d+) men in a port with enough of (its own|an ally's) ships$/, (s, men: string, owner: string) => {
  const w = seaWorld(s);
  w.rules = { fleet: fleetRules() };
  w.relations.alliances.push(["Portugal", "Castile"]);
  const f = createMover("F", "fleet", owner === "its own" ? "Portugal" : "Castile", "Lagos");
  f.room = Number(men);
  w.movers.push(f);
  put(s, "A", "Portugal", "Lagos", Number(men));
});
When("it boards", (s) => {
  s.result = applyOrder(W(s), "Portugal", { kind: "board ships", army: "A", fleet: "F" });
});
Then(/^boarding takes (\d+) days$/, (s, d: string) => expect(s.result).toEqual({ ok: true, days: Number(d) }));
Then("the army is cargo and moves with the fleet", (s) => {
  const f = W(s).movers.find((m) => m.id === "F")!;
  expect(A(s, "A").cargoOf).toBe("F");
  f.route = ["Lagos Bay"];
  playDays(W(s), 1, 1);
  expect(f.place).toBe("Lagos Bay");
  expect(A(s, "A").place).toBe("Lagos Bay");
});

Given(/^a fleet carrying 10000 men is in a sea zone next to (a port province|a coast with no port)$/, (s, coast: string) => {
  const w = seaWorld(s);
  w.rules = { fleet: fleetRules() };
  const f = createMover("F", "fleet", "Portugal", "Lagos Bay");
  w.movers.push(f);
  put(s, "A", "Portugal", "Lagos Bay", 10000, { cargoOf: "F" });
  s.coast = coast === "a port province" ? "Lagos" : "Sagres";
  // A hostile garrisoned castle on the coast shows the stop checks applying.
  war(s, "Portugal", "Castile");
  w.places[s.coast]!.castle = { owner: "Castile", garrison: 200 };
});
When("it lands the army", (s) => {
  s.landing = landArmy(W(s), A(s, "A"), s.coast);
});
Then(/^landing takes (\d+) days$/, (s, d: string) => expect(s.landing.days).toBe(Number(d)));
Then("the army is a mover again and the stop checks apply", (s) => {
  const a = A(s, "A");
  expect(a.cargoOf).toBeUndefined();
  expect(a.place).toBe(s.coast);
  expect(s.landing.stop).toBe("castle");
});

Given(/^the player drags the army "(\w+)" route across water$/, (s, id: string) => {
  const w = seaWorld(s);
  w.rules = { fleet: fleetRules() };
  put(s, id, "Portugal", "Evora", 5000);
  s.target = "Madeira";
});
Given(/^the player (has|has no) ships that can carry it$/, (s, has: string) => {
  if (has === "has no") return;
  const f = createMover("F", "fleet", "Portugal", "Lisbon");
  f.room = 6000;
  W(s).movers.push(f);
  s.fleet = f;
});
Then("the planner gives a combined route: march, board, sail, land, march on", (s) => {
  const r = planAcrossWater(W(s), A(s, s.subject), s.target, s.fleet);
  expect(r.legs.map((l) => l.kind)).toEqual(["march", "board", "sail", "land", "march on"]);
  expect(r.legs.map((l) => l.places)).toEqual([["Lisbon"], ["Lisbon"], ["Atlantic"], ["Madeira"], []]);
});
Then(/^the route stops at the coast with "needs ships"$/, (s) => {
  const r = planAcrossWater(W(s), A(s, s.subject), s.target, s.fleet);
  expect(r.message).toBe("needs ships");
  expect(r.legs).toEqual([{ kind: "march", places: ["Lisbon"] }]);
});

Given(/^the army "(\w+)" is aboard ships$/, (s, id: string) => {
  const w = seaWorld(s);
  w.rules = { fleet: fleetRules() };
  w.movers.push(createMover("F", "fleet", "Portugal", "Cape"));
  put(s, id, "Portugal", "Cape", 5000, { cargoOf: "F", reserve: { days: 60, full: 60 } });
});
When("a month of weekly turns passes", (s) => {
  month(s);
});
Then("it eats from its reserve, as abroad", (s) => {
  const a = A(s, s.subject);
  expect(eatsFrom(W(s), a)).toBe("reserve");
  expect(a.reserve!.days).toBe(30);
});

Given(/^the horse-only army "(\w+)" is on Raid$/, (s, id: string) => {
  war(s, "France", "Burgundy");
  put(s, id, "France", "Paris", 3000, { horse: 3000 });
  expect(applyOrder(W(s), "France", { kind: "raid", army: id, to: "Langres" }).ok).toBe(true);
  expect(A(s, id).pace).toBe("Raid");
});
When("it passes through a province with an enemy trader", (s) => {
  const w = W(s);
  w.rules = { trader: stubRules(() => 99, () => true) };
  const route = A(s, s.subject).route;
  expect(route).toContain("Troyes");
  w.movers.push(createMover("T", "trader", "Burgundy", "Troyes"));
  s.robbed = [];
  hooks(s).raidTrader = (_w, a, t) => s.robbed.push([a.id, t.id]);
  month(s);
});
Then("it can attack the trader, the amount set by the trade rules", (s) => {
  expect(s.log.raids).toContainEqual(expect.objectContaining({ army: s.subject, trader: "T", place: "Troyes" }));
  expect(s.robbed).toEqual([[s.subject, "T"]]);
});

Given(/^a road is built in "(\w+)"$/, (s, place: string) => {
  const w = W(s);
  w.places["Paris"]!.road = "road";
  const trader = (from: string, to: string) => 10 * roadFactor(w.places[from]!, w.places[to]!);
  w.rules = { trader: stubRules(trader, () => true) };
  s.before = trader("Paris", place);
  w.places[place]!.road = "road";
  s.after = trader("Paris", place);
  s.place = place;
});
Then(/^trader step days into "(\w+)" use the road factor too$/, (s) => {
  expect(s.before).toBe(10);
  expect(s.after).toBe(7.5);
  const a = put(s, "A", "France", "Paris", 10000);
  expect(stepBreakdown(W(s), a, "Paris", s.place).road).toBe(0.75);
});

// ---------- moving many armies ----------

Given(/^the army "A" needs 10 days to reach "(\w+)" and the army "B" needs 16$/, (s, to: string) => {
  s.w = mkWorld(
    { As: land("France"), Am: land("France"), Bs: land("France"), Bm: land("France", "hills", { river: "river" }), [to]: land("France") },
    ["As-Am", `Am-${to}`, "Bs-Bm", `Bm-${to}`],
  );
  put(s, "A", "France", "As", 10000, { commander: { name: "a", cunning: 4 } });
  put(s, "B", "France", "Bs", 10000);
  const total = (id: string) => planRoute(W(s), A(s, id), to).arrive.at(-1)!;
  close(total("A"), "10");
  close(total("B"), "16");
  s.to = to;
});
When(/^the player sends both to "(\w+)" with arrive together (on|off)$/, (s, to: string, on: string) => {
  s.together = marchTogether(W(s), ["A", "B"], to, on === "on");
  month(s);
});
const arrivals = (s: Scenario, id: string) => s.log.entered.filter((e: { mover: string; place: string }) => e.mover === id && e.place === s.to).map((e: { day: number }) => e.day);
Then(/^the army "A" starts 6 days later and both arrive on day 16$/, (s) => {
  expect(s.together.armies.map((a: { delay: number }) => a.delay)).toEqual([6, 0]);
  expect(s.together.meetDay).toBe(16);
  expect([arrivals(s, "A"), arrivals(s, "B")]).toEqual([[16], [16]]);
});
Then("both start at once and arrive on day 10 and day 16", (s) => {
  expect(s.together.armies.map((a: { delay: number }) => a.delay)).toEqual([0, 0]);
  expect([arrivals(s, "A"), arrivals(s, "B")]).toEqual([[10], [16]]);
});
When("the player selects several armies and gives them one destination", (s) => {
  s.opts = defaultMarchTogether();
});
Then("arrive together is on", (s) => expect(s.opts.arriveTogether).toBe(true));

Given(/^the armies "A", "B" and "C" are picked$/, (s) => {
  W(s).places["Sens"]!.terrain = "hills";
  put(s, "A", "France", "Paris", 4000);
  put(s, "B", "France", "Sens", 5000);
  put(s, "C", "France", "Langres", 3000, { horse: 3000 });
});
When(/^the player taps "Rally here" on "(\w+)"$/, (s, to: string) => {
  rallyHere(W(s), ["A", "B", "C"], to);
  s.to = to;
  month(s);
});
Then(/^each army marches to "(\w+)"$/, (s, to: string) => {
  for (const id of ["A", "B", "C"]) expect(s.log.entered).toContainEqual(expect.objectContaining({ mover: id, place: to }));
});
Then("they join on arrival in the order they come", (s) => {
  const order = s.log.entered.filter((e: { place: string }) => e.place === s.to).map((e: { mover: string }) => e.mover);
  expect(order).toEqual(["C", "A", "B"]);
  expect(s.log.joins.map((j: { host: string; joined: string }) => [j.host, j.joined])).toEqual([
    ["C", "A"],
    ["C", "B"],
  ]);
  expect(A(s, "C").men).toBe(12000);
});

Given(/^the realm has set "New regiments go to" "(\w+)" and the army "(\w+)" stands there$/, (s, to: string, id: string) => {
  W(s).relations.newRegimentsGoTo = { France: to };
  put(s, id, "France", to, 8000);
});
When("a levy gathers or a regiment finishes training", (s) => {
  expect(newRegimentsReady(W(s), newArmy("Levy", "France", "Paris", 2000))).toBe("Troyes");
  month(s);
});
Then(/^it marches to "(\w+)" on its own and joins the army "(\w+)"$/, (s, to: string, id: string) => {
  expect(s.log.joins).toContainEqual(expect.objectContaining({ host: id, joined: "Levy", place: to }));
  expect(A(s, id).men).toBe(10000);
});

Given(/^the country "(\w+)" (knows|does not know) invention "W14 Army divisions"$/, (s, realm: string, knows: string) => {
  if (knows === "knows") (W(s).relations.armyDivisions ??= []).push(realm);
  s.realm = realm;
});
When("the player draws a front of provinces and gives it armies", (s) => {
  put(s, "A", "France", "Troyes");
  s.front = drawFront(W(s), "France", ["Troyes", "Sens"], ["A"]);
});
Then("no front can be drawn", (s) => expect(s.front.ok).toBe(false));

// ---------- orders ----------

Given(/^the army "(\w+)" is an ordinary army$/, (s, id: string) => {
  put(s, id, "France", "Paris", 10000, { horse: 2000 });
});
Then(/^the order "([^"]+)" is (offered|not offered)$/, (s, order: string, offered: string) => {
  const list = offeredOrders(W(s), A(s, s.subject)) as string[];
  if (offered === "offered") expect(list).toContain(order);
  else expect(list).not.toContain(order);
});

Given(/^two routes from "(\w+)" to "(\w+)" of 19 and 24 days$/, (s, from: string, to: string) => {
  s.w = mkWorld(
    { [from]: land("France"), X: land("France"), Wr: land("France", "farmland", { river: "river" }), Y: land("France"), Z: land("France"), V: land("France"), [to]: land("France") },
    [`${from}-X`, "X-Wr", `Wr-${to}`, `${from}-Y`, "Y-Z", "Z-V", `V-${to}`],
  );
  put(s, "A", "France", from, 10000);
  const via = (p: string[]) => p.reduce((sum, q, i) => sum + stepBreakdown(W(s), A(s, "A"), i ? p[i - 1]! : from, q).days, 0);
  expect([via(["X", "Wr", to]), via(["Y", "Z", "V", to])]).toEqual([19, 24]);
});
When(/^the army "(\w+)" is ordered "March to" "(\w+)"$/, (s, id: string, to: string) => {
  s.result = applyOrder(W(s), "France", { kind: "march to", army: id, to });
});
Then(/^it takes the (\d+)-day route$/, (s, days: string) => {
  expect(s.result.ok).toBe(true);
  expect(s.result.plan.arrive.at(-1)).toBe(Number(days));
  expect(A(s, "A").route).toEqual(["X", "Wr", "Dijon"]);
});

When(/^the army "(\w+)" is ordered "March by" "(\w+)" to "(\w+)"$/, (s, id: string, via: string, to: string) => {
  put(s, id, "France", "Paris");
  s.result = applyOrder(W(s), "France", { kind: "march by", army: id, via: [via], to });
});
Then(/^its route passes through "(\w+)"$/, (s, via: string) => {
  expect(s.result.ok).toBe(true);
  expect(A(s, s.subject).route).toContain(via);
  expect(A(s, s.subject).route.at(-1)).toBe("Dijon");
});

Given(/^the army "(\w+)" is on a route to "(\w+)"$/, (s, id: string, to: string) => {
  put(s, id, "France", "Paris");
  expect(applyOrder(W(s), "France", { kind: "march by", army: id, via: ["Troyes"], to }).ok).toBe(true);
  s.destination = to;
});
When(/^it is ordered "Halt" in "(\w+)"$/, (s, place: string) => {
  playUntil(s, s.subject, place);
  expect(applyOrder(W(s), "France", { kind: "halt", army: s.subject }).ok).toBe(true);
  playDays(W(s), s.day, s.day + 5);
});
Then(/^the rest of its route is (kept, greyed|red from that step)$/, (s, how: string) => {
  const a = A(s, s.subject);
  if (how === "kept, greyed") {
    expect(a.route).toEqual([]);
    expect(a.greyed.at(-1)).toBe(s.destination);
  } else {
    expect(a.red).toBe("Langres");
    expect(s.log.stops.filter((x: { army: string }) => x.army === a.id)).toEqual([]);
  }
});

Given(/^the nearest own province with a castle is "(\w+)"$/, (s, place: string) => {
  const w = W(s);
  w.places[place]!.castle = { owner: "France", garrison: 300 };
  w.places["Paris"]!.castle = { owner: "France", garrison: 300 };
  put(s, "A", "France", "Langres");
  s.home = place;
});
When(/^the army "(\w+)" is ordered "Return home"$/, (s, id: string) => {
  s.result = applyOrder(W(s), "France", { kind: "return home", army: id });
});
Then(/^it takes the fastest route to "(\w+)"$/, (s, place: string) => {
  expect(s.result.ok).toBe(true);
  expect(A(s, "A").route).toEqual([place]);
});

When(/^the army "(\w+)" is ordered to follow the friendly army "(\w+)"$/, (s, id: string, target: string) => {
  put(s, target, "France", "Troyes", 3000);
  put(s, id, "France", "Paris", 5000);
  expect(applyOrder(W(s), "France", { kind: "follow", army: id, target }).ok).toBe(true);
  month(s);
});
Then(/^it follows "(\w+)" and joins it when they meet$/, (s, target: string) => {
  expect(s.log.joins).toContainEqual(expect.objectContaining({ host: target, joined: s.subject, place: "Troyes" }));
  expect(A(s, target).men).toBe(8000);
});

Given(/^the army "(\w+)" is (horse only|foot and horse)$/, (s, id: string, kind: string) => {
  put(s, id, "France", "Paris", 3000, { horse: kind === "horse only" ? 3000 : 1000 });
});

Given(/^the army "(\w+)" stands in a province with an enemy castle$/, (s, id: string) => {
  war(s, "France", "Burgundy");
  removeEdge(W(s), "Auxerre", "Dijon");
  W(s).places["Langres"]!.castle = { owner: "Burgundy", garrison: 400 };
  put(s, id, "France", "Langres", 10000, { cameFrom: "Troyes" });
});
When(/^it is ordered "Besiege"$/, (s) => {
  expect(applyOrder(W(s), "France", { kind: "besiege", army: s.subject }).ok).toBe(true);
});
Then("it can't march on until the castle falls", (s) => {
  const w = W(s);
  removeEdge(w, "Dijon", "Beaune");
  expect(applyOrder(w, "France", { kind: "march to", army: s.subject, to: "Dijon" }).ok).toBe(false);
  w.places["Langres"]!.castle = { owner: "France", garrison: 0 };
  expect(applyOrder(w, "France", { kind: "march to", army: s.subject, to: "Dijon" })).toMatchObject({ ok: true });
});

Given(/^the army "(\w+)" is (in a port with ships|at sea)$/, (s, id: string, where: string) => {
  const w = W(s);
  w.places["Paris"]!.harbour = true;
  w.places["Channel"] = { id: "Channel", terrain: "sea" };
  w.rules = { fleet: fleetRules() };
  w.movers.push(createMover("F", "fleet", "France", where === "at sea" ? "Channel" : "Paris"));
  put(s, id, "France", where === "at sea" ? "Channel" : "Paris", 5000, where === "at sea" ? { cargoOf: "F" } : {});
});

When(/^the army "(\w+)" is set to pace "(\w+)" and on the way "([^"]+)"$/, (s, id: string, pace: string, otw: string) => {
  put(s, id, "France", "Paris");
  expect(applyOrder(W(s), "France", { kind: "route settings", army: id, pace: pace as "Normal", onTheWay: otw as "keep marching" }).ok).toBe(true);
});
When("it is given a new route later", (s) => {
  expect(applyOrder(W(s), "France", { kind: "march to", army: s.subject, to: "Troyes" }).ok).toBe(true);
});
Then(/^it keeps pace "(\w+)" and on the way "([^"]+)"$/, (s, pace: string, otw: string) => {
  expect([A(s, s.subject).pace, A(s, s.subject).onTheWay]).toEqual([pace, otw]);
});

// ---------- rivers, passes, seasons and ground ----------

const ARMY = /^an army of (\d+) (foot|men|horse only)(?: with (\d+) horse| with (\d+ bombards?|bombards|only light field guns)| led by a commander with Cunning (\d+))?$/;
Given(ARMY, (s, n: string, kind: string, horse?: string, guns?: string, cunning?: string) => {
  const men = Number(n);
  const extra: Partial<Army> = {};
  if (kind === "horse only") extra.horse = men;
  if (horse) extra.horse = Number(horse);
  if (guns === "only light field guns") extra.lightGuns = 4;
  else if (guns) extra.bombards = Number(guns.split(" ")[0]) || 8;
  if (cunning) extra.commander = { name: "c", cunning: Number(cunning) };
  s.army = newArmy("A", "France", "From", men, extra.horse ?? 0, extra);
});
Given(/^the season is (summer|winter|autumn|spring)$/, (s, season: string) => {
  s.month = seasonMonth[season];
});
Given(/^its pace is "(\w+)"$/, (s, pace: string) => {
  s.army.pace = pace;
});
Given("the season is the wet season of the province's climate", (s) => {
  s.month = 7;
  s.climate = "monsoon Asia";
});
const GROUNDS = ["farmland", "grassland", "savanna", "drylands", "hills", "desert", "forest", "tundra", "mountains", "jungle", "marsh"];
function stepWorld(s: Scenario, from: string, to: string): MoveWorld {
  const spec = (name: string, role: string): PlaceSpec => ({
    ...(GROUNDS.includes(name) ? land("France", name as Terrain) : land("France")),
    ...(s.climate ? { climate: s.climate } : {}),
    ...(s.custom?.[role] ?? {}),
  });
  const w = mkWorld({ From: spec(from, "From"), To: spec(to, "To") }, ["From-To"]);
  w.date.month = s.month ?? 4;
  s.stepWorld = w;
  s.army.place = "From";
  w.movers.push(s.army);
  return w;
}
When(/^it steps from "(\w+)" into "(\w+)"$/, (s, from: string, to: string) => {
  const w = stepWorld(s, from, to);
  s.breakdown = stepBreakdown(w, s.army, "From", "To");
  s.days = s.breakdown.days;
});
When(/^an army of (\d+) foot steps from "(\w+)" (?:to|into) "(\w+)"$/, (s, men: string, from: string, to: string) => {
  s.army = newArmy("A", "France", "From", Number(men));
  const w = stepWorld(s, from, to);
  s.breakdown = stepBreakdown(w, s.army, "From", "To");
  s.days = s.breakdown.days;
});
When(/^it tries to step into "(\w+)" with no road$/, (s, to: string) => {
  const w = stepWorld(s, "farmland", to);
  s.breakdown = stepBreakdown(w, s.army, "From", "To");
  s.may = armyMayEnter(w, s.army, "To");
});
Then("the step is not allowed", (s) => {
  expect(s.breakdown.allowed).toBe(false);
  expect(s.may.ok).toBe(false);
});
Given(/^the province "From" has a (track|road|paved road|turnpike|railway) and the province "To" has a (track|road|paved road|turnpike|railway)$/, (s, a: string, b: string) => {
  s.custom = { From: { road: a as Road }, To: { road: b as Road } };
});
Given("both are farmland", (s) => {
  for (const k of ["From", "To"]) s.custom[k].terrain = "farmland";
});
Given(/^the province "To" is farmland with a forage limit of (\d+)$/, (s, n: string) => {
  s.custom = { To: { terrain: "farmland", forageLimit: Number(n) } };
});
Given(/^an army whose step takes ([\d.]+) days$/, (s, days: string) => {
  walking(put(s, "A", "France", "Paris"), "Troyes", Number(days));
  s.stepDays = Number(days);
});
Then(/^the step is shown as (\d+) days$/, (s, n: string) => expect(displayDays(s.stepDays)).toBe(Number(n)));
Then(/^the engine counts ([\d.]+) days$/, (s, days: string) => {
  const a = A(s, "A");
  expect(a.step!.days).toBe(Number(days));
  playDays(W(s), 1, 6);
  expect(a.place).toBe("Paris");
  playDays(W(s), 7, 7);
  expect(a.place).toBe("Troyes");
});

When(/^it enters a (river|great river) province (with no bridge|with a bridge)$/, (s, river: string, bridge: string) => {
  s.custom = { To: { river: river as "river", bridge: bridge === "with a bridge" } };
  const w = stepWorld(s, "farmland", "farmland");
  s.extra = stepBreakdown(w, s.army, "From", "To").river;
});
Then(/^the step gains (\d+) days?(?: for the river)?$/, (s, n: string) => expect(s.extra).toBe(Number(n)));
Given(/^an enemy army holds the bridge province "(\w+)"$/, (s, place: string) => {
  war(s, "France", "Burgundy");
  Object.assign(W(s).places[place]!, { river: "river", bridge: true });
  put(s, "E", "Burgundy", place, 3000);
});
When(/^an army of (\d+) men enters "(\w+)"$/, (s, men: string, place: string) => {
  const a = put(s, "A", "France", "Paris", Number(men));
  s.extra = stepBreakdown(W(s), a, "Paris", place).river;
});

Given(/^the snow-peak province "(\w+)" has no pass and no road and lies in the (north|south)$/, (s, id: string, hemi: string) => {
  s.w = mkWorld(
    { S: land("France"), [id]: land("France", "mountains", { snowPeak: true, hemisphere: hemi as "north" }), T: land("France"), R1: land("France", "mountains"), R2: land("France", "mountains") },
    [`S-${id}`, `${id}-T`, "S-R1", "R1-R2", "R2-T"],
  );
  put(s, "A", "France", "S");
  s.peak = id;
});
Given(/^the month is (January|February|March|April|May|June|July|August|September|October|November|December)$/, (s, m: string) => {
  s.month = months[m];
  if (s.w) W(s).date.month = months[m]!;
});
When(/^the planner routes through "(\w+)"$/, (s) => {
  s.plan = planRoute(W(s), A(s, "A"), "T");
});
Then(/^"(\w+)" is (closed|open)$/, (s, id: string, state: string) => {
  expect(s.plan.end).toBe("arrives");
  expect(s.plan.path.includes(id)).toBe(state === "open");
  expect(landRule(W(s), "France", id).ok).toBe(state === "open");
});

Given(/^a province of climate "([^"]+)"$/, (s, c: string) => {
  s.place = { id: "P", terrain: "marsh", climate: c };
});
Then(/^the province is (in|not in) its wet season$/, (s, state: string) => {
  expect(isWetSeason(s.place, s.month)).toBe(state === "in");
});

When(/^an army tries to march into (a sea zone|an ocean zone|a glacier)$/, (s, what: string) => {
  const w = W(s);
  w.places["Q"] = what === "a glacier" ? { id: "Q", terrain: "tundra", owner: null, glacier: true } : { id: "Q", terrain: what === "a sea zone" ? "sea" : "ocean" };
  w.neighbours["Paris"]!.push("Q");
  w.neighbours["Q"] = ["Paris"];
  const a = put(s, "A", "France", "Paris");
  s.may = armyMayEnter(w, a, "Q");
  s.plan = planRoute(w, a, "Q");
});
Then(/^it (needs ships|can't enter)$/, (s, r: string) => {
  expect(s.may).toMatchObject({ ok: false, reason: r });
  expect(s.plan.path).toEqual([]);
});

Given(/^"Thrace" and "Bithynia" are a strait crossing in config$/, (s) => {
  straitWorld(s);
  war(s, "Byzantium", "Ottomans");
  W(s).relations.alliances.push(["Byzantium", "Genoa"]);
  W(s).relations.passage.push(["Venice", "Byzantium"]);
});
Given(/^a harbour on one side is owned by (the army's realm|an ally|a realm that grants passage|a neutral with no passage)$/, (s, who: string) => {
  const owner = { "the army's realm": "Byzantium", "an ally": "Genoa", "a realm that grants passage": "Venice", "a neutral with no passage": "Neutral" }[who]!;
  W(s).places["Thrace"]!.owner = owner;
});
When(/^an army of (\d+) men crosses the strait without its own ships$/, (s, men: string) => {
  const a = put(s, "A", "Byzantium", "Thrace", Number(men));
  s.breakdown = stepBreakdown(W(s), a, "Thrace", "Bithynia");
});
Then(/^the crossing (?:takes (\d+) days|is not possible)$/, (s, days?: string) => {
  if (days) expect([s.breakdown.allowed, s.breakdown.ferry, s.breakdown.days]).toEqual([true, true, Number(days)]);
  else expect(s.breakdown.allowed).toBe(false);
});

// ---------- route preview and notices ----------

Given(/^the army "(\w+)" plans a route from "(\w+)" through "(\w+)" and "(\w+)" to "(\w+)"$/, (s, id: string, from: string, a: string, b: string, to: string) => {
  put(s, id, "France", from);
  s.path = [a, b, to];
});
Given(/^the steps take (\d+), (\d+) and (\d+) days$/, (s, x: string, y: string, z: string) => {
  const d = [x, y, z].map(Number);
  const plan: RoutePlan = { path: s.path, arrive: [d[0]!, d[0]! + d[1]!, d[0]! + d[1]! + d[2]!], greyed: [], end: "arrives" };
  s.preview = previewRoute(W(s), A(s, s.subject), plan);
});
Then(/^the preview shows day counts (\d+), (\d+) and (\d+) and a total of (\d+)$/, (s, a: string, b: string, c: string, t: string) => {
  expect(shownDayCounts(s.preview)).toEqual([a, b, c].map(Number));
  expect(s.preview.total).toBe(Number(t));
});
Then('turn marks lie between "Paris" and "Troyes", twice between "Troyes" and "Langres", and between "Langres" and "Dijon"', (s) => {
  expect(s.preview.turnMarks).toEqual([
    { turn: 1, after: "Paris", between: "Troyes" },
    { turn: 2, after: "Troyes", between: "Langres" },
    { turn: 3, after: "Troyes", between: "Langres" },
    { turn: 4, after: "Langres", between: "Dijon" },
  ]);
});

Given(/^a step of the route (enters a river province|crosses a snow pass|ends at a stopping castle|needs passage across a border|has an enemy army seen on it|changes days by season)$/, (s, c: string) => {
  const w = W(s);
  const a = put(s, "A", "France", "Paris");
  let to = "Troyes";
  if (c === "enters a river province") w.places["Troyes"]!.river = "river";
  if (c === "crosses a snow pass") Object.assign(w.places["Troyes"]!, { terrain: "mountains", snowPeak: true, pass: true });
  if (c === "ends at a stopping castle" || c === "has an enemy army seen on it") {
    war(s, "France", "Burgundy");
    removeEdge(w, "Auxerre", "Dijon");
    removeEdge(w, "Dijon", "Beaune");
    to = "Dijon";
    if (c === "ends at a stopping castle") w.places["Langres"]!.castle = { owner: "Burgundy", garrison: 400 };
    else put(s, "E", "Burgundy", "Langres", 6000);
  }
  if (c === "needs passage across a border") {
    w.relations.passage = [];
    to = "Dijon";
  }
  if (c === "changes days by season") {
    w.date.month = 1;
    w.places["Troyes"]!.terrain = "forest";
  }
  s.preview = previewRoute(w, a, planRoute(w, a, to));
});
Then(/^the step shows the icon "([^"]+)"$/, (s, icon: string) => {
  const icons = s.preview.steps.flatMap((x: { icons: string[] }) => x.icons);
  if (icon === "snowflake or rain") expect(icons.some((i: string) => i === "snowflake" || i === "rain")).toBe(true);
  else expect(icons).toContain(icon);
});

Given(/^the army "(\w+)" has a route of 20 days on pace "Normal"$/, (s, id: string) => {
  s.w = mkWorld({ P0: land("France"), P1: land("France", "farmland", { river: "river" }), P2: land("France", "farmland", { river: "river" }), P3: land("France") }, ["P0-P1", "P1-P2", "P2-P3"]);
  const a = put(s, id, "France", "P0");
  expect(applyOrder(W(s), "France", { kind: "march to", army: id, to: "P3" }).ok).toBe(true);
  s.preview = previewRoute(W(s), a, planRoute(W(s), a, "P3"));
  expect(s.preview.total).toBe(20);
});
When(/^the player sets pace "(\w+)" on the order pill$/, (s, pace: string) => {
  expect(applyOrder(W(s), "France", { kind: "route settings", army: s.subject, pace: pace as "Forced" }).ok).toBe(true);
  const a = A(s, s.subject);
  s.redrawn = previewRoute(W(s), a, planRoute(W(s), a, "P3"));
});
Then("the route and its days are redrawn at once", (s) => {
  close(s.redrawn.total, "14.06");
  expect(s.redrawn.steps.map((x: { to: string }) => x.to)).toEqual(["P1", "P2", "P3"]);
});

Given(/^the route was set by (tapping a province|dragging)$/, (s, how: string) => {
  s.setBy = how === "dragging" ? "drag" : "tap";
});
Then(/^it is confirmed (when the player taps March|on lift)$/, (s, when: string) => {
  expect(confirmedBy(s.setBy)).toBe(when === "on lift" ? "lift" : "March");
});

Given(/^during the turn (.+)$/, (s, event: string) => {
  const w = W(s);
  war(s, "France", "Burgundy");
  if (event === "an army stopped short of its destination at a castle") {
    // The route was given before the castle was garrisoned.
    put(s, "A", "France", "Troyes").route = ["Langres", "Dijon"];
    w.places["Langres"]!.castle = { owner: "Burgundy", garrison: 400 };
  } else if (event === "a battle was fought") {
    put(s, "A", "France", "Troyes").route = ["Langres"];
    put(s, "B", "Burgundy", "Langres", 5000);
  } else if (event === "an army's route turned red") {
    put(s, "A", "France", "Langres", 10000, { reserve: { days: 2, full: 30 } }).route = ["Dijon"];
  } else if (event === "an enemy army was first seen marching into the realm's land") {
    put(s, "B", "Burgundy", "Langres", 5000).route = ["Troyes"];
  } else if (event === "an army walked where it was told") {
    put(s, "A", "France", "Paris").route = ["Troyes"];
  } else throw new Error(event);
  month(s);
});
Then(/^the player (gets|does not get) a notice$/, (s, gets: string) => {
  expect(noticesFor(W(s), "France", s.log).length > 0).toBe(gets === "gets");
});

// ---------- splitting and joining ----------

When(/^the player splits the army "(\w+)" in two$/, (s, id: string) => {
  const a = put(s, id, "France", "Paris", 10000, { food: 1000, wagons: 20, companies: 10 });
  s.split = splitArmy(W(s), a, { newId: `${id}2`, armyDivisions: (W(s).relations.armyDivisions ?? []).includes("France") });
});
Then(/^the split takes (\d+) days$/, (s, n: string) => {
  expect(s.split.days).toBe(Number(n));
  expect([s.split.first.waitDays, s.split.second.waitDays]).toEqual([Number(n), Number(n)]);
});
Then("each half keeps its share of food, wagons and companies", (s) => {
  for (const h of [s.split.first, s.split.second]) expect([h.food, h.wagons, h.companies, h.men]).toEqual([500, 10, 5, 5000]);
});

Given(/^the army "(\w+)" is led by "([^"]+)"$/, (s, id: string, name: string) => {
  put(s, id, "France", "Paris", 10000, { commander: { name, cunning: 4 } });
});
When(/^the player splits it, keeping "([^"]+)" with the first half$/, (s, name: string) => {
  s.keep = name;
});
When(/^the second half has (a captain|a new commander|no captain or commander)$/, (s, who: string) => {
  const leader = who === "a captain" ? { name: "the captain", cunning: 1 } : who === "a new commander" ? { name: "the new commander", cunning: 2 } : null;
  s.split = splitArmy(W(s), A(s, s.subject), { newId: "A2", secondLeader: leader });
  expect(s.split.first.commander.name).toBe(s.keep);
});
Then(/^the second half is led by (the captain|the new commander|its senior company captain with Cunning 0)$/, (s, who: string) => {
  const c = s.split.second.commander;
  if (who.startsWith("its senior")) expect(c).toEqual({ name: "senior company captain", cunning: 0 });
  else expect(c.name).toBe(who);
});

Given(/^the armies "(\w+)" and "(\w+)" stand in "(\w+)"$/, (s, a: string, b: string, place: string) => {
  put(s, a, "France", place, 6000, { food: 600, wagons: 12 });
  put(s, b, "France", place, 4000, { food: 400, wagons: 8 });
});
Given(/^the commander of "(\w+)" has (\d+) victories and the commander of "(\w+)" has (\d+)$/, (s, a: string, va: string, b: string, vb: string) => {
  A(s, a).commander = { name: `commander of ${a}`, cunning: 2, victories: Number(va) };
  A(s, b).commander = { name: `commander of ${b}`, cunning: 2, victories: Number(vb) };
});
When("the player joins them", (s) => {
  // B's army takes A in: leadership still goes by victories.
  s.joined = joinArmies(W(s), A(s, "B"), A(s, "A"));
});
Then(/^the join takes (\d+) day$/, (s, n: string) => expect(s.joined.days).toBe(Number(n)));
Then("food and wagons add up", (s) => expect([s.joined.army.food, s.joined.army.wagons]).toEqual([1000, 20]));
Then(/^the commander of "(\w+)" leads and the commander of "(\w+)" becomes a captain if there is room$/, (s, a: string, b: string) => {
  expect(s.joined.army.commander.name).toBe(`commander of ${a}`);
  expect(s.joined.captain).toBe(`commander of ${b}`);
});

// ---------- what stops an army ----------

Given(/^the army "A" marches to "(\w+)" through "(\w+)"$/, (s, to: string, via: string) => {
  war(s, "France", "Burgundy");
  put(s, "A", "France", "Troyes").route = [via, to];
  s.destination = to;
});
Given(/^in "(\w+)" (an enemy army stands|an enemy castle with a garrison stands|a snow pass has closed|its food runs out)$/, (s, place: string, what: string) => {
  const w = W(s);
  if (what === "an enemy army stands") put(s, "E", "Burgundy", place, 3000);
  if (what === "an enemy castle with a garrison stands") w.places[place]!.castle = { owner: "Burgundy", garrison: 400 };
  if (what === "a snow pass has closed") {
    Object.assign(w.places[place]!, { terrain: "mountains", snowPeak: true });
    w.date.month = 11;
    schedule(s, 2, (x) => {
      x.date.month = 12;
    });
  }
  if (what === "its food runs out") {
    // Out of food and already most of the way there, so it reaches Langres before the weekly refill at home (D-MOVE-6).
    const a = A(s, "A");
    a.reserve = { days: 0, full: 30 };
    walking(a, a.route[0]!, 7.5, 5, a.route.slice(1));
  }
  s.subject = "A";
});
Then(/^the army "A" (stops|stops and winters there|marches on)$/, (s, r: string) => {
  const a = A(s, "A");
  const stops = s.log.stops.filter((x: { army: string; place: string }) => x.army === "A" && x.place === "Langres");
  if (r === "marches on") {
    expect(stops).toEqual([]);
    expect(a.route).toEqual(["Dijon"]);
  } else {
    expect(stops.length).toBe(1);
    expect(a.place).toBe("Langres");
    expect(!!a.wintering).toBe(r === "stops and winters there");
  }
});

When(/^the army "A" marches from "Paris" past "Troyes" through "(\w+)"$/, (s, via: string) => {
  put(s, "A", "France", "Paris");
  expect(applyOrder(W(s), "France", { kind: "march by", army: "A", via: [via], to: "Dijon" }).ok).toBe(true);
  expect(A(s, "A").route).not.toContain("Troyes");
  month(s);
});
Then(/^the army "A" is not stopped in "(\w+)"$/, (s, place: string) => {
  expect(s.log.entered).toContainEqual(expect.objectContaining({ mover: "A", place }));
  expect(s.log.stops.filter((x: { army: string }) => x.army === "A")).toEqual([]);
  expect(A(s, "A").place).toBe("Dijon");
});

Given(/^the army "A" stands in "(\w+)" with a hostile garrisoned castle$/, (s, place: string) => {
  war(s, "France", "Burgundy");
  const w = W(s);
  removeEdge(w, "Dijon", "Beaune");
  removeEdge(w, "Auxerre", "Dijon");
  w.places["Beaune"]!.owner = "France";
  w.places[place]!.castle = { owner: "Burgundy", garrison: 400 };
  put(s, "A", "France", place, 10000, { cameFrom: "Troyes" });
});
const castleMoves: Record<string, MoveOrder> = {
  "stay and besiege": { kind: "besiege", army: "A" },
  "go back to the province it came from": { kind: "march to", army: "A", to: "Troyes" },
  "go into a neighbouring province its side holds": { kind: "march to", army: "A", to: "Beaune" },
  'march on to "Dijon"': { kind: "march to", army: "A", to: "Dijon" },
};
When(/^the army "A" is ordered to (stay and besiege|go back to the province it came from|go into a neighbouring province its side holds|march on to "Dijon")$/, (s, move: string) => {
  s.result = applyOrder(W(s), "France", castleMoves[move]!);
});
Then(/^the order is (allowed|refused)$/, (s, r: string) => expect(s.result.ok).toBe(r === "allowed"));

Given(/^the army "A" besieges the castle of "(\w+)"$/, (s, place: string) => {
  war(s, "France", "Burgundy");
  W(s).places[place]!.castle = { owner: "Burgundy", garrison: 400 };
  put(s, "A", "France", place, 10000, { cameFrom: "Troyes" });
  expect(applyOrder(W(s), "France", { kind: "besiege", army: "A" }).ok).toBe(true);
});
When(/^the army "B" of the same side arrives in "(\w+)"$/, (s, place: string) => {
  put(s, "B", "France", "Troyes").route = [place, "Dijon"];
  playUntil(s, "B", place);
});
Then(/^the army "(\w+)" stops in "(\w+)" too$/, (s, id: string, place: string) => {
  expect(s.log.stops).toContainEqual(expect.objectContaining({ army: id, place, reason: "castle", short: true }));
  expect([A(s, id).route, A(s, id).greyed]).toEqual([[], ["Dijon"]]);
});

Given(/^the army "A" stopped in "(\w+)" with its route to "(\w+)" greyed$/, (s, place: string, to: string) => {
  war(s, "France", "Burgundy");
  removeEdge(W(s), "Dijon", "Beaune");
  removeEdge(W(s), "Auxerre", "Dijon");
  W(s).places[place]!.castle = { owner: "Burgundy", garrison: 400 };
  const a = put(s, "A", "France", place, 10000, { cameFrom: "Troyes" });
  a.greyed = [to];
  expect(applyOrder(W(s), "France", { kind: "resume", army: "A" }).ok).toBe(false);
});
When(/^the castle of "(\w+)" is taken$/, (s, place: string) => {
  W(s).places[place]!.castle = { owner: "France", garrison: 0 };
});
Then(/^one order resumes the march to "(\w+)"$/, (s, to: string) => {
  expect(applyOrder(W(s), "France", { kind: "resume", army: "A" }).ok).toBe(true);
  expect(A(s, "A").route).toEqual([to]);
});

Given(/^the province "(\w+)" has a castle (with no garrison, of its enemy|with a garrison, of its enemy's ally)$/, (s, place: string, c: string) => {
  const w = W(s);
  if (c.startsWith("with no garrison")) w.places[place]!.castle = { owner: "Burgundy", garrison: 0 };
  else {
    w.relations.alliances.push(["Savoy", "Burgundy"]);
    w.places[place]!.castle = { owner: "Savoy", garrison: 300 };
  }
});
When(/^an army of a realm at war with (the castle's owner|the castle owner's ally) enters "(\w+)"$/, (s, _w: string, place: string) => {
  war(s, "France", "Burgundy");
  put(s, "A", "France", "Troyes").route = [place, "Dijon"];
  playUntil(s, "A", place);
});
Then(/^the army (is not stopped|stops)$/, (s, r: string) => {
  const stops = s.log.stops.filter((x: { army: string }) => x.army === "A");
  expect(stops.length).toBe(r === "stops" ? 1 : 0);
});

Given(/^the province "(\w+)" has a hostile garrisoned castle on the way to "(\w+)"$/, (s, place: string) => {
  war(s, "France", "Burgundy");
  removeEdge(W(s), "Auxerre", "Dijon");
  removeEdge(W(s), "Dijon", "Beaune");
  W(s).places[place]!.castle = { owner: "Burgundy", garrison: 400 };
  put(s, "A", "France", "Troyes");
});
When(/^the player plans a route to "(\w+)"$/, (s, to: string) => {
  s.plan = planRoute(W(s), A(s, "A"), to);
});
Then(/^the route ends at "(\w+)" with "([^"]+)"$/, (s, place: string, msg: string) => {
  expect(s.plan.path.at(-1)).toBe(place);
  expect(s.plan.message).toBe(msg);
});
Then(/^the leg to "(\w+)" is drawn in grey$/, (s, to: string) => expect(s.plan.greyed).toEqual([to]));

const LANDS: Record<string, (s: Scenario) => string> = {
  "its own land": () => "Troyes",
  "a subject's land": (s) => {
    W(s).relations.subjects.push(["France", "Lorraine"]);
    W(s).places["Langres"]!.owner = "Lorraine";
    return "Langres";
  },
  "an enemy's land at war with it": (s) => {
    W(s).relations.passage = [];
    war(s, "France", "Burgundy");
    return "Langres";
  },
  "a rebel-held province": (s) => {
    W(s).relations.passage = [];
    W(s).places["Langres"]!.rebelHeld = true;
    return "Langres";
  },
  "an ally's land": (s) => {
    W(s).relations.passage = [];
    W(s).relations.alliances.push(["France", "Burgundy"]);
    return "Langres";
  },
  "land of a realm granting passage": () => "Langres",
  "land nobody owns": (s) => {
    W(s).places["Langres"]!.owner = null;
    return "Langres";
  },
};
const EATS: Record<string, string> = {
  "the locals, refilling": "locals",
  "the reserve, unless the subject's terms feed it": "reserve unless terms",
  "the reserve, then plunder": "reserve then plunder",
  "the reserve": "reserve",
};
When(/^the army "A" plans a route into (its own land|a subject's land|an enemy's land at war with it|a rebel-held province|an ally's land|land of a realm granting passage|land nobody owns)$/, (s, what: string) => {
  const to = LANDS[what]!(s);
  const a = put(s, "A", "France", to === "Troyes" ? "Paris" : "Troyes");
  s.verdict = landRule(W(s), "France", to);
  s.plan = planRoute(W(s), a, to);
});
Then(/^it (may|may not) enter$/, (s, may: string) => {
  expect(s.verdict.ok).toBe(may === "may");
  expect(s.plan.end).toBe(may === "may" ? "arrives" : "needs passage");
});
Then(/^it eats from (the locals, refilling|the reserve, unless the subject's terms feed it|the reserve, then plunder|the reserve)$/, (s, eats: string) => {
  expect(s.verdict.eats).toBe(EATS[eats]);
});

Given(/^the army "A" marches through land of a realm that grants passage$/, (s) => {
  put(s, "A", "France", "Troyes").route = ["Langres", "Dijon", "Beaune"];
});
When(/^the passage is withdrawn on day (\d+)$/, (s, day: string) => {
  schedule(s, Number(day), (w) => {
    w.relations.passage = [];
  });
  month(s);
});
Then(/^the army "A" stops at the border on day (\d+)$/, (s, day: string) => {
  expect(s.log.stops.filter((x: { army: string }) => x.army === "A")).toEqual([expect.objectContaining({ reason: "border", day: Number(day) })]);
});

Given(/^the army "A" is in a snow pass on the last day of November in the north$/, (s) => {
  const w = W(s);
  w.places["Peak"] = { id: "Peak", terrain: "mountains", owner: "France", snowPeak: true, hemisphere: "north" };
  w.neighbours["Peak"] = ["Troyes"];
  w.neighbours["Troyes"]!.push("Peak");
  w.date.month = 11;
  walking(put(s, "A", "France", "Peak"), "Troyes", 10);
});
When("the pass closes", (s) => {
  W(s).date.month = 12;
  s.log = playDays(W(s), 1, 1);
});
Then("the army \"A\" stops and winters there, hungry", (s) => {
  const a = A(s, "A");
  expect(s.log.stops).toContainEqual(expect.objectContaining({ army: "A", place: "Peak", reason: "snow" }));
  expect([a.place, a.wintering, a.hungry]).toEqual(["Peak", true, true]);
  playDays(W(s), 2, 20);
  expect(a.place).toBe("Peak");
});

Given(/^the army "A" is set to "halt when the enemy is seen" on a route through "(\w+)" and "(\w+)"$/, (s, a: string, b: string) => {
  war(s, "France", "Burgundy");
  put(s, "A", "France", "Paris", 10000, { onTheWay: "halt when the enemy is seen" }).route = [a, b, "Dijon"];
});
When(/^an enemy army is seen in "(\w+)"$/, (s, place: string) => {
  put(s, "E", "Burgundy", place, 4000);
  month(s);
});
Then(/^the army "(\w+)" stops in "(\w+)"$/, (s, id: string, place: string) => {
  expect(A(s, id).place).toBe(place);
  expect(A(s, id).route).toEqual([]);
  expect(s.log.stops).toContainEqual(expect.objectContaining({ army: id, place, reason: "enemy seen" }));
});

Given(/^the reserve of the army "A" runs out on the step into "(\w+)"$/, (s, place: string) => {
  // Most of the way there already, so it reaches the province before the weekly refill at home (D-MOVE-6).
  walking(put(s, "A", "France", "Troyes", 10000, { reserve: { days: 0, full: 30 } }), place, 7.5, 5, ["Dijon"]);
});
Then("the army \"A\" keeps marching", (s) => {
  expect(s.log.stops.filter((x: { army: string }) => x.army === "A")).toEqual([]);
  expect(A(s, "A").place).toBe("Dijon");
});
Then(/^its route is red from "(\w+)"$/, (s, place: string) => expect(A(s, "A").red).toBe(place));
Then("the player gets one notice", (s) => {
  expect(noticesFor(W(s), "France", s.log).map((n) => n.kind)).toEqual(["route red"]);
});




// ---------- decided questions (D-MOVE-*) ----------

// X-2: the order of movers in a day.
Given('the trader "T1", the fleet "F1" and the armies "B" and "A" are on the move', (s) => {
  const w = W(s);
  w.rules = { fleet: stubRules(() => 1, () => true), trader: stubRules(() => 1, () => true) };
  const go = (m: ReturnType<typeof createMover>) => {
    m.route = ["Sens"];
    w.movers.push(m);
  };
  go(createMover("T1", "trader", "France", "Paris"));
  go(createMover("F1", "fleet", "France", "Paris"));
  walking(put(s, "B", "France", "Paris"), "Sens", 1);
  walking(put(s, "A", "France", "Paris"), "Sens", 1);
});
Then('they step in the order "A", "B", "F1", "T1"', (s) => {
  expect(s.log.entered.map((e: { mover: string }) => e.mover)).toEqual(["A", "B", "F1", "T1"]);
});

// D-MOVE-19: Dunois' route preview.
Given('"Langres" has a stone castle with 400 garrison', (s) => {
  expect(W(s).places["Langres"]!.castle).toEqual({ owner: "Burgundy", garrison: 400 });
});
Given('every other road to "Dijon" runs through Burgundian castles', (s) => {
  W(s).places["Beaune"]!.castle = { owner: "Burgundy", garrison: 200 };
});
Given("Dunois carries a reserve of 30 days", (s) => {
  A(s, "Dunois").reserve = { days: 30, full: 30 };
});
When("Leroy drags the army's banner to \"Dijon\"", (s) => {
  s.pending = [];
  s.plan = planRoute(W(s), A(s, "Dunois"), "Dijon");
  s.preview = previewRoute(W(s), A(s, "Dunois"), s.plan);
});
Then('the leg to "Dijon" stays drawn in grey', (s) => {
  expect(s.plan.greyed).toEqual(["Dijon"]);
  expect(s.preview.steps.filter((x: { greyed: boolean }) => x.greyed).map((x: { to: string }) => x.to)).toEqual(["Dijon"]);
});
Then('the food line is green to "Troyes" and yellow at "Langres"', (s) => {
  expect(s.preview.food.map((f: { place: string; colour: string }) => [f.place, f.colour])).toEqual([
    ["Troyes", "green"],
    ["Langres", "yellow"],
  ]);
});

// D-MOVE-6: refilling at home at the weekly food step.
Given('the army "A" has 10 of its 30 days of reserve left in "Paris"', (s) => {
  put(s, "A", "France", "Paris", 10000, { reserve: { days: 10, full: 30 } });
});
Given('the army "A" marches from "Paris" through "Troyes", both French, toward "Langres"', (s) => {
  (s.pending ??= []).push(["France", { kind: "march by", army: "A", via: ["Troyes"], to: "Langres" }]);
});
Then('on day 7 its reserve refills to 30 days in "Troyes" without stopping', (s) => {
  expect(s.log.refills).toContainEqual({ army: "A", place: "Troyes", day: 7 });
  expect(s.log.stops.filter((x: { army: string }) => x.army === "A")).toEqual([]);
});
Then('it arrives in "Langres" on day 14', (s) => {
  expect(s.log.entered.filter((e: { mover: string }) => e.mover === "A").map((e: { place: string; day: number }) => [e.place, e.day])).toEqual([
    ["Troyes", 6],
    ["Langres", 14],
  ]);
});

// D-MOVE-12: a raid stays a week in each province.
Given('the horse-only army "A" of 10000 horse raids from "Troyes" through "Langres" to "Dijon"', (s) => {
  put(s, "A", "France", "Troyes", 10000, { horse: 10000 });
  (s.pending ??= []).push(["France", { kind: "raid", army: "A", to: "Dijon" }]);
});
Then('it enters "Langres" on day 4 and "Dijon" on day 14', (s) => {
  expect(s.log.entered.filter((e: { mover: string }) => e.mover === "A").map((e: { place: string; day: number }) => [e.place, e.day])).toEqual([
    ["Langres", 4],
    ["Dijon", 14],
  ]);
});
Then('it stays 7 days in "Langres" before riding on', (s) => {
  // Replay: on days 5 to 11 it stands in Langres without walking; from day 12 it walks the 3.35-day step on.
  const w = champagne();
  w.relations.wars.push(["France", "Burgundy"]);
  const a = newArmy("A", "France", "Troyes", 10000, 10000);
  w.movers.push(a);
  expect(applyOrder(w, "France", { kind: "raid", army: "A", to: "Dijon" }).ok).toBe(true);
  playDays(w, 1, 4);
  const carried = a.progress;
  playDays(w, 5, 11);
  expect([a.place, a.progress, a.waitDays]).toEqual(["Langres", carried, 0]);
  playDays(w, 12, 12);
  expect(a.progress).toBeCloseTo(carried + 1, 9);
});

// D-MOVE-5: March to where it stands is a Halt.
When('the army "A" is ordered "March to" the province it stands in', (s) => {
  playUntil(s, "A", "Troyes");
  expect(applyOrder(W(s), "France", { kind: "march to", army: "A", to: "Troyes" }).ok).toBe(true);
  playDays(W(s), s.day, s.day + 5);
  expect(A(s, "A").place).toBe("Troyes");
});

// D-MOVE-10: fords, floods and great rivers.
Given(/^the river province "Tortosa" \(not a great river\) has the ford "Ebro at Tortosa" in the (north|south)$/, (s, hemi: string) => {
  W(s).places["Tortosa"] = { id: "Tortosa", ...land("Aragon"), river: "river", ford: true, hemisphere: hemi as "north" | "south" };
});
Given(/^a flood starts on the river province "(\w+)" in April$/, (s, place: string) => {
  const w = W(s);
  w.places[place]!.river = "river";
  w.date.month = 4;
  startFlood(w, place);
});
Given(/^a river of Natural Earth scale rank (\d+)$/, (s, rank: string) => {
  s.rank = Number(rank);
});
Then(/^it is (a great river|a river)$/, (s, kind: string) => {
  expect(riverKindOfRank(s.rank)).toBe(kind === "a great river" ? "great river" : "river");
});

// D-MOVE-11: dunes.
Given('the desert province "Erg" has dunes as its main tile type next to the desert province "Oasis"', (s) => {
  s.w = mkWorld({ Oasis: land("France", "desert"), Erg: land("France", "desert", { dunes: true }) }, ["Oasis-Erg"]);
});
Given('an army of 10000 foot with 4 bombards and no camels stands in "Oasis"', (s) => {
  put(s, "A", "France", "Oasis", 10000, { bombards: 4 });
});
When('it plans a step into "Erg"', (s) => {
  s.breakdown = stepBreakdown(W(s), A(s, "A"), "Oasis", "Erg");
  s.may = armyMayEnter(W(s), A(s, "A"), "Erg");
});
Then("the step is not allowed for its guns", (s) => {
  expect([s.breakdown.allowed, s.breakdown.reason]).toEqual([false, "guns"]);
  expect(s.may).toEqual({ ok: false, reason: "guns" });
});
Then("the same army without guns takes 15 days for the step", (s) => {
  const a = { ...A(s, "A"), bombards: 0 };
  expect(stepBreakdown(W(s), a, "Oasis", "Erg").days).toBeCloseTo(15, 9);
});
Then('the same army with camels may take its guns into "Erg"', (s) => {
  const a = { ...A(s, "A"), camels: true };
  expect(armyMayEnter(W(s), a, "Erg").ok).toBe(true);
  expect(stepBreakdown(W(s), a, "Oasis", "Erg").allowed).toBe(true);
});
Then('no army can forage in "Erg"', (s) => {
  expect(canForage(W(s).places["Erg"]!)).toBe(false);
  expect(canForage(W(s).places["Oasis"]!)).toBe(true);
});

// D-MOVE-7: no passage, no entry.
Then('no order can march the army "A" into "Savoy"', (s) => {
  const w = W(s);
  expect(armyMayEnter(w, A(s, "A"), "Savoy").ok).toBe(false);
  for (const o of [
    { kind: "march to", army: "A", to: "Savoy" },
    { kind: "march by", army: "A", via: ["Savoy"], to: "Savoy" },
  ] as MoveOrder[]) {
    applyOrder(w, "France", o);
    expect(A(s, "A").route).not.toContain("Savoy");
  }
});

// X-1: watching the month.
Given('the player\'s army "A" of "France" will meet the enemy army "B" in "Langres" on day 1', (s) => {
  war(s, "France", "Burgundy");
  put(s, "A", "France", "Langres");
  put(s, "B", "Burgundy", "Langres", 5000);
  hooks(s).player = "France";
  // Warfare's battle rules stand-in: 6 rounds, then the side without "A" or "C" is destroyed, so each battle is fought once.
  hooks(s).battle = () => ({ rounds: 6 });
  hooks(s).round = (w, b) => {
    if (b.roundsFought < 6) return;
    const losers = b.sides.find((ids) => !ids.some((id) => ["A", "C"].includes(id)))!;
    w.movers = w.movers.filter((m) => !losers.includes(m.id));
    return { ended: true };
  };
});
Given('the AI armies "C" of "Burgundy" and "D" of "Savoy" will fight in "Dijon" on day 1', (s) => {
  war(s, "Burgundy", "Savoy");
  put(s, "C", "Burgundy", "Dijon", 5000);
  put(s, "D", "Savoy", "Dijon", 5000);
});
Given('a castle of "Burgundy" will stop the French army "E" in "Beaune"', (s) => {
  const w = W(s);
  w.neighbours["Auxerre"]!.push("Beaune");
  w.neighbours["Beaune"]!.push("Auxerre");
  w.places["Beaune"]!.castle = { owner: "Burgundy", garrison: 300 };
  walking(put(s, "E", "France", "Auxerre"), "Beaune", 2, 0, ["Dijon"]);
});
Then("the turn plays at about one second per 10 days with a skip button", (s) => {
  s.playback = monthPlayback(W(s), "France", s.log);
  expect([s.playback.secondsPer10Days, s.playback.skip]).toEqual([1, true]);
});
Then('the battle in "Dijon" flashes crossed swords and pauses half a second without slowing the turn', (s) => {
  expect(s.playback.flashes).toEqual([{ day: 1, place: "Dijon", pauseSeconds: 0.5 }]);
  for (const st of s.playback.battleSteps) expect(st.places).not.toContain("Dijon");
});
Then('day 1 slows to six 4-hour steps while the battle in "Langres" runs', (s) => {
  expect(s.playback.battleSteps).toEqual([1, 2, 3, 4, 5, 6].map((step) => ({ day: 1, step, places: ["Langres"] })));
});
Then("at each step the player can change standing orders, order a retreat or switch battle, and there is no Skip to result", (s) => {
  expect(s.playback.choices).toEqual(["change standing orders", "retreat", "switch battle"]);
});
Then('the castle of "Beaune" rings red', (s) => {
  expect(s.playback.redRings.map((r: { place: string }) => r.place)).toEqual(["Beaune"]);
});

// D-MOVE-17: a rumour is never intercepted.
Given(/^an enemy army of (\d+) is known only as a rumour in a neighbouring province with (\d+) days left on its step$/, (s, men: string, left: string) => {
  walking(put(s, "E", "Burgundy", "Langres", Number(men)), "Dijon", 7, 7 - Number(left) - 1);
  W(s).rumoured = { France: ["E"] };
  s.subject = "A";
});

// A front with W14 (MOVE-075).
Then("the armies spread along it, intercept within their stretch and retreat along the front", (s) => {
  const w = W(s);
  war(s, "France", "Burgundy");
  w.places["Paris"]!.castle = { owner: "France", garrison: 300 };
  put(s, "B2", "France", "Paris");
  const f = drawFront(w, "France", ["Troyes", "Sens", "Auxerre"], ["A", "B2"]);
  if (!f.ok) throw new Error(f.reason);
  expect(f.front.stretches).toEqual({ A: ["Troyes"], B2: ["Sens", "Auxerre"] });
  expect(A(s, "B2").route.at(-1)).toBe("Sens");
  // Interception only within its stretch.
  const b = A(s, "B2");
  b.place = "Sens";
  b.route = [];
  b.stance = "attack";
  put(s, "E1", "Burgundy", "Troyes", 3000);
  expect(interceptTarget(w, b)).toBeNull();
  put(s, "E2", "Burgundy", "Auxerre", 3000);
  expect(interceptTarget(w, b)?.id).toBe("E2");
  // Retreat along the front rather than to the castle at Paris.
  w.movers = w.movers.filter((m) => m.id !== "E1" && m.id !== "E2");
  const r = breakArmy(w, b);
  expect(r.kind === "retreat" && ["Troyes", "Auxerre"].includes(r.refuge)).toBe(true);
});

// A pass counts as a road (MOVE-029).
Given('the mountain province "Brenner" is a pass in config and has no road built', (s) => {
  expect(MOVE.passes).toContain("Brenner");
  s.custom = { From: { road: "track" }, To: { terrain: "mountains", pass: true, road: "track" } };
});
Then("the road factor is 0.75", (s) => {
  const brenner = s.stepWorld.places["To"];
  expect(roadOf(brenner)).toBe("road");
  expect(MOVE.roadFactor[roadOf(brenner)]).toBe(0.75);
  expect(s.breakdown.allowed).toBe(true);
});

// D-MOVE-7: a realm that grants no passage is closed.
Given('the realm "Savoy" is at peace with "France" and grants no passage', (s) => {
  const w = W(s);
  w.places["Savoy"] = { id: "Savoy", ...land("Savoy", "hills") };
  w.places["Bresse"] = { id: "Bresse", ...land(null) };
  for (const [a, b] of [["Troyes", "Savoy"], ["Savoy", "Bresse"]] as const) {
    w.neighbours[a]!.push(b);
    (w.neighbours[b] ??= []).push(a);
  }
  expect(w.relations.passage.some(([g]) => g === "Savoy")).toBe(false);
});
When('the army "A" of "France" plans a route whose only way runs through "Savoy"', (s) => {
  s.plan = planRoute(W(s), put(s, "A", "France", "Troyes"), "Bresse");
});
Then('the planner says "needs passage from Savoy"', (s) => {
  expect([s.plan.end, s.plan.message]).toEqual(["needs passage", "needs passage from Savoy"]);
});

When("the turn ends", (s) => {
  month(s);
});

// MOVE-085, MOVE-086, D-WAR-14: the AI sends the same order data; its standing orders come from its personality.
/** Burgundy's risk tolerance in the 1444 catalogue reading used here: medium. */
const AI_RISK = { Burgundy: "medium" } as const;
Given("the AI country {string} moves an army", (s, realm: "Burgundy") => {
  const a = put(s, "Bastard", realm, "Dijon", 8000);
  setAiStandingOrders(a, AI_RISK[realm]);
  s.aiOrder = { kind: "march to", army: "Bastard", to: "Beaune" } satisfies MoveOrder;
  s.aiResult = applyOrder(W(s), realm, s.aiOrder);
});
Then("it sends the same order data a player would", (s) => {
  expect(s.aiResult.ok).toBe(true);
  const p = put(s, "Dunois", "France", "Troyes", 8000);
  expect(applyOrder(W(s), "France", { ...s.aiOrder, army: p.id, to: "Paris" }).ok).toBe(true);
  expect(Object.keys(s.aiOrder).sort()).toEqual(["army", "kind", "to"]);
});
Then("its standing orders are set by its personality", (s) => {
  expect(A(s, "Bastard").stance).toBe("attack");
  expect(A(s, "Bastard").retreatIfOutnumbered).toBe(1.5);
});

// X-17, MOVE-117: frozen rivers.
Given(/^the river province "Narva" \(not a great river\) lies at latitude (\d+)$/, (s, lat: string) => {
  W(s).places["Narva"] = { id: "Narva", ...land("Sweden"), river: "river", latitude: Number(lat) };
});

// X-3, MOVE-120: the month's real length.
Given(/^the date is (February|April|March) (14[5-9][1-9]|1[5-9]\d\d)$/, (s, m: string, y: string) => {
  W(s).date = { year: Number(y), month: months[m]! };
});
Then("the day loop runs {int} days", (s, n: number) => expect(s.log.days).toHaveLength(n));

// X-1, MOVE-118, MOVE-119: battles fought over time in 4-hour rounds.
const COMMANDER = (name: string, cunning: number): NonNullable<Army["commander"]> => ({ name, cunning });
Given(/^the player's army "A" of "France" and the enemy army "B" fight in "Langres" in a battle of (\d+) rounds from day 1$/, (s, n: string) => {
  war(s, "France", "Burgundy");
  put(s, "A", "France", "Langres", 10000, { commander: COMMANDER("Dunois", 3) });
  put(s, "B", "Burgundy", "Langres", 8000, { commander: COMMANDER("the Bastard", 1) });
  hooks(s).player = "France";
  // Warfare's stand-in: the battle lasts the rounds given and Burgundy's side breaks.
  hooks(s).battle = () => ({ rounds: Number(n), loser: 1 });
});
Given(/^the AI armies "C" of "Burgundy" and "D" of "Savoy" fight in "Dijon" in a battle of (\d+) rounds from day 1$/, (s, n: string) => {
  war(s, "Burgundy", "Savoy");
  put(s, "C", "Burgundy", "Dijon", 5000);
  put(s, "D", "Savoy", "Dijon", 5000);
  hooks(s).player = "France";
  hooks(s).battle = () => ({ rounds: Number(n), loser: 1 });
});
Given(/^the (French|Burgundian) army "(\w+)" has 0\.5 days left on its step into "(\w+)" after day 1$/, (s, who: string, id: string, place: string) => {
  const from = place === "Langres" ? "Troyes" : "Beaune";
  walking(put(s, id, who === "French" ? "France" : "Burgundy", from, 3000), place, 7, 5.5);
});
Given(/^the player orders "(\w+)" to retreat on day (\d+) at step (\d+)$/, (s, id: string, d: string, st: string) => {
  hooks(s).playerStep = (w, day, step) => {
    if (day === Number(d) && step === Number(st)) orderRetreat(w, id);
  };
});
When(/^days 1 to (\d+) are played$/, (s, last: string) => {
  runPending(s);
  s.log = playDays(W(s), 1, Number(last), hooks(s));
});
Then("days 1 and 2 are played in six 4-hour steps and day 3 is not", (s) => {
  const steps = s.log.steps as { day: number; step: number }[];
  expect(steps).toEqual([1, 2].flatMap((day) => [1, 2, 3, 4, 5, 6].map((step) => ({ day, step }))));
});
Then("no day is played in 4-hour steps", (s) => expect(s.log.steps).toEqual([]));
Then(/^the army "(\w+)" joins the battle in "(\w+)" on day (\d+) at step (\d+)$/, (s, id: string, place: string, d: string, st: string) => {
  expect(s.log.joinedBattles).toContainEqual({ army: id, place, day: Number(d), step: Number(st) });
});
Then(/^the army "(\w+)" joins the battle in "(\w+)" at the start of day (\d+)$/, (s, id: string, place: string, d: string) => {
  expect(s.log.joinedBattles).toContainEqual({ army: id, place, day: Number(d), step: 0 });
});
Then(/^the battle in "(\w+)" ends on day (\d+) after (\d+) rounds$/, (s, place: string, d: string, n: string) => {
  const e = (s.log.battleEnds as { place: string; day: number; rounds: number }[]).find((x) => x.place === place);
  expect([e?.day, e?.rounds]).toEqual([Number(d), Number(n)]);
});
Then(/^"(\w+)" withdraws from "(\w+)" on day (\d+) at step (\d+)$/, (s, id: string, place: string, d: string, st: string) => {
  const r = (s.log.retreats as { army: string; from: string; to: string | null; day: number; step: number }[]).find((x) => x.army === id);
  expect(r).toMatchObject({ from: place, day: Number(d), step: Number(st) });
  expect(r?.to).not.toBeNull();
  expect(A(s, id).place).not.toBe(place);
});

// MOVE-129: the engine reports the land the player's armies may not enter, for the map's red borders.
Given("a new game on the real map as the realm {string}", (s, realm: string) => {
  const rules = loadDefaultRuleset();
  const nation = rules.nations.find((n) => n.name === realm)!;
  const host = createEngineHost(loadDefaultRuleset);
  const reply = host({ id: 1, type: "newGame", seed: 1, playerNation: nation.id });
  expect(reply.response.type).toBe("snapshot");
  s.snap = (reply.response as { snapshot: unknown }).snapshot;
  s.rules = rules;
});
Then("the engine reports which provinces the realm's armies may not enter", (s) => {
  expect(s.snap.provinceClosed).toBeInstanceOf(Uint8Array);
  expect(s.snap.provinceClosed.length).toBe(s.snap.provinceOwner.length);
});
Then("the realm's own land and the sea are never marked closed", (s) => {
  const { provinceClosed: closed, provinceOwner: owner, playerNation: me } = s.snap;
  const water = new Set(s.rules.provinces.flatMap((p: { terrain: string }, i: number) => (p.terrain === "sea" || p.terrain === "ocean" ? [i] : [])));
  for (let p = 0; p < closed.length; p++) {
    if (owner[p] === me || water.has(p)) expect(closed[p], `province ${p}`).toBe(0);
  }
});
Then("the land of a realm at peace with it that grants no passage is marked closed", (s) => {
  const { provinceClosed: closed, provinceOwner: owner, playerNation: me, relations } = s.snap;
  const tied = new Set<number>(relations.map((r: { nation: number }) => r.nation));
  const stranger = [...new Set<number>(owner)].find((n) => n >= 0 && n !== me && !tied.has(n));
  expect(stranger).toBeDefined();
  const theirs = [...owner.keys()].filter((p) => owner[p] === stranger);
  expect(theirs.length).toBeGreaterThan(0);
  for (const p of theirs) expect(closed[p], `province ${p}`).toBe(1);
});
