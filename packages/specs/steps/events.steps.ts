import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { Rng } from "@ph/engine";
import * as E from "@ph/engine/domain/events";

const { Given, When, Then } = steps("events");

// ---------------------------------------------------------------- helpers

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** The scenario's event state over a copy of the sample tree. */
function st(s: Scenario): E.EventState {
  return (s.es ??= E.newState(E.emptyWorld(), { events: E.clone(E.tree.events), ages: E.tree.ages, periods: E.tree.periods }));
}
function w(s: Scenario): E.World {
  return st(s).world;
}
function rng(s: Scenario): Rng {
  return (s.rng ??= new Rng(7));
}
function ev(s: Scenario, id?: string): E.EventDef {
  const key = id ?? s.event;
  const e = st(s).events[key];
  expect(e, `event ${key}`).toBeDefined();
  return e!;
}
/** A minimal valid event for fixtures. */
function fixture(id: string, over: Partial<E.EventDef> = {}): E.EventDef {
  return {
    id,
    ages: [],
    periods: [],
    regions: [],
    roles: { realm: { historical: ["A"], select: "fixed", as: ["initiator"] } },
    availability: { earliest: 1444, latest: 1939, mode: "reference", repeat: "one_time" },
    trigger: { all: [] },
    selection: { mode: "immediate" },
    options: [
      { id: "yes", chooser: null, historical: true, ai: { base: 50 }, effects: {} },
      { id: "no", chooser: null, ai: { base: 50 }, effects: {} },
    ],
    effects: {},
    ...over,
  };
}
function add(s: Scenario, e: E.EventDef): E.EventDef {
  st(s).events[e.id] = e;
  s.event = e.id;
  return e;
}
function setYear(s: Scenario, year: number, month = 1): void {
  w(s).year = year;
  w(s).month = month;
}
function happened(s: Scenario, id: string, yearsAgo = 1, option?: string, roles: Record<string, string[]> = {}): void {
  w(s).history.push({ event: id, year: w(s).year - yearsAgo, month: w(s).month, roles, ...(option ? { option } : {}) });
}
/** Roles for an event: what the scenario bound, else the historical holders. */
function roles(s: Scenario, e: E.EventDef): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [n, r] of Object.entries(e.roles)) out[n] = s.roles?.[n] ?? [...r.historical];
  return out;
}
function act(s: Scenario): void {
  s.acted = true;
}
function c(s: Scenario, id: string): E.CountryState {
  return E.country(w(s), id);
}
/** France as the 1789 trigger of french_revolution wants it. */
function franceReady(s: Scenario): void {
  const f = c(s, "France");
  f.government = "monarchy";
  f.stats = { ...f.stats, debt: 2100, stability: -1, legitimacy: 35 };
  f.ideologies = { liberalism: 0.3 };
}

/** Parses "type key value key value … [op number]" into a condition or effect leaf. */
const ID_FIRST = new Set(["event", "event_active", "period_active", "age_active", "war_ongoing", "start_period", "end_period"]);
function parseLeaf(text: string): Record<string, unknown> {
  const [type, ...rest] = text.trim().split(/\s+/);
  if (ID_FIRST.has(type!) && rest.length === 1) return { [type!]: rest[0] };
  const p: Record<string, unknown> = {};
  if (ID_FIRST.has(type!)) p.id = rest.shift();
  const loose: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i]!;
    if (["<", "<=", ">", ">=", "=="].includes(t)) {
      p.op = t;
      p.value = Number(rest[++i]);
    } else if (/^[a-z_]+$/.test(t) && i + 1 < rest.length && !["open"].includes(t)) {
      const v = rest[++i]!;
      p[t] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    } else loose.push(t);
  }
  if (!Object.keys(p).length && loose.length === 1) return { [type!]: loose[0] };
  if (loose.length) p._loose = loose;
  return { [type!]: p };
}
function parseCondition(text: string): E.Condition {
  return parseLeaf(text);
}

// ---------------------------------------------------------------- dates and turns

Given(/^the date is (?:(\d+) (\w+) )?(\d{4})$/, (s, day: string | null, month: string | null, year: string) => {
  setYear(s, Number(year), month ? MONTHS.indexOf(month.toLowerCase()) + 1 : 1);
  s.day = day ? Number(day) : 1;
});
Given("the campaign end date is {int} {word} {int}", (s, day: number, month: string, year: number) => {
  st(s).rules.endDate = `${year}-${String(MONTHS.indexOf(month.toLowerCase()) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  expect(st(s).rules.endDate).toBe(E.eventsConfig.campaign.end_date);
});
When("the month is processed", (s) => {
  for (const fn of s.before ?? []) fn();
  E.processMonth(st(s), rng(s));
  act(s);
});
Then("the campaign ends", (s) => {
  expect(st(s).ended).toBe(true);
  expect(st(s).log.some((l) => l.type === "CampaignEnded")).toBe(true);
});
Then("no event fires after that date", (s) => {
  const e = add(s, fixture("after_the_end"));
  E.nextMonth(w(s));
  E.processMonth(st(s), rng(s));
  expect(w(s).history.some((h) => h.event === e.id)).toBe(false);
  expect(E.gate(st(s), e)).toBe("campaign over");
});

// ---------------------------------------------------------------- campaign scope

Given("the event {string}", (s, id: string) => {
  s.event = id;
});
When("the out-of-scope list is applied", (s) => {
  s.outOfScope = E.outOfScope(E.tree.index[s.event]!.date);
  s.allOut = Object.entries(E.tree.index).filter(([, e]) => E.outOfScope(e.date)).map(([k]) => k);
});
Then("the event {string} can still fire in a campaign", (s, id: string) => {
  expect(s.outOfScope).toBe(false);
  expect(s.allOut).not.toContain(id);
  // the cut keeps exactly the 59 post-1939 events of the data out (EVT-002)
  expect(s.allOut).toHaveLength(59);
});

// ---------------------------------------------------------------- ages and periods

Given("the start condition of the age {string} has never held", (s, age: string) => {
  s.age = age;
  s.holds = (() => false) as E.Holds;
  s.checked = E.eventsConfig.campaign.start_year - 1;
});
function runYearsTo(s: Scenario, year: number): void {
  for (let y = (s.checked ?? year - 1) + 1; y <= year; y++) {
    setYear(s, y);
    E.yearlyAgeCheck(st(s), y, s.holds);
  }
  s.checked = year;
}
When("the date reaches {int}", (s, year: number) => {
  runYearsTo(s, year);
  act(s);
});
When("the date reaches {int} and its end condition has never held", (s, year: number) => {
  runYearsTo(s, year);
});
Given("the age {string} is active", (s, age: string) => {
  if (s.acted) return expect(w(s).ages).toContain(age);
  w(s).ages.push(age);
});
Then("the age {string} is no longer active", (s, age: string) => {
  expect(w(s).ages).not.toContain(age);
  expect(st(s).agesEnded).toContain(age);
});
Given("the event {string} has happened", (s, id: string) => {
  happened(s, id, 3);
});
Given("the event {string} has somehow happened", (s, id: string) => {
  happened(s, id, 1);
});
When("the yearly age check runs", (s) => {
  E.yearlyAgeCheck(st(s), w(s).year, s.holds);
  act(s);
});
Then("the age {string} is not active, because its window opens in {int}", (s, age: string, year: number) => {
  expect(w(s).ages).not.toContain(age);
  expect(E.ageDef(age).window.earliest_start).toBe(year);
});
Then("the ages {string} and {string} are both active", (s, a: string, b: string) => {
  expect(w(s).ages).toEqual(expect.arrayContaining([a, b]));
});
Given("the age {string} lists the region {string} and not {string}", (s, age: string, yes: string, no: string) => {
  expect(E.ageDef(age).regions).toContain(yes);
  expect(E.ageDef(age).regions).not.toContain(no);
});
When("exploration asks whether the age has begun in {string}", (s, region: string) => {
  s.answer = E.ageBegunIn(st(s), s.age ?? "age_of_exploration", region);
  // and where it lists the region the answer is yes
  s.control = E.ageBegunIn(st(s), "age_of_exploration", "europe");
});
Then("the answer is no", (s) => {
  expect(s.answer).toBe(false);
  expect(s.control).toBe(true);
});
Given("the period {string} starts as initial", (s, id: string) => {
  expect(E.periodDef(id).start).toBe("initial");
});
When("the campaign starts in {int}", (s, year: number) => {
  setYear(s, year);
  E.startCampaign(st(s), year);
  act(s);
});
Then("the period {string} is active", (s, id: string) => {
  expect(w(s).periods).toContain(id);
});
When("the event {string} happens", (s, id: string) => {
  setYear(s, 1566);
  const e = E.eventDef(id);
  w(s).history.push({ event: id, year: w(s).year, month: 1, roles: roles(s, e) });
  E.applyEffects(e.effects.immediate, w(s), { roles: roles(s, e) });
  E.periodCheck(st(s), w(s).year);
});
Given("the period {string} ends", (s, id: string) => {
  if (s.acted) {
    expect(w(s).periods).not.toContain(id);
    return;
  }
  // a period ending (cancel_if scenario): its end is an effect
  E.applyEffects([{ end_period: id }], w(s), { roles: {} });
  E.tick(st(s));
  act(s);
});
Given("the start condition of a period never holds inside its window", (s) => {
  const p = E.clone(E.periodDef("p_atlantic_revolutions"));
  st(s).periods = [p];
  s.period = p.id;
  s.holds = ((_c, kind) => kind === "end") as E.Holds;
});
When("its window closes", (s) => {
  const p = E.periodDef(s.period);
  for (let y = p.window[0]; y <= p.window[1] + 1; y++) E.periodCheck(st(s), y, s.holds);
});
Then("the period never became active", (s) => {
  expect(st(s).periodsEverActive).not.toContain(s.period);
  expect(w(s).periods).not.toContain(s.period);
});
Given("the event {string} lists the period {string}", (s, id: string, period: string) => {
  expect(E.tree.index[id]!.periods).toContain(period);
});
When("the event tree is built", (s) => {
  s.membership = E.membership(E.tree.index);
  s.layers = E.splitLayers(Object.values(E.tree.events), { ages: E.tree.ages, periods: E.tree.periods, modifiers: E.tree.modifiers, localization: E.tree.localization });
  const events: E.EventDef[] = s.buildEvents ?? [];
  s.report = E.validate({ events, ...(s.enums ? { enums: s.enums } : {}), ...(s.entities ? { entities: s.entities } : {}), ...(s.buildPeriods ? { periods: s.buildPeriods, ages: E.tree.ages } : {}), ...(s.effectTypes ? { effectTypes: s.effectTypes } : {}) });
});
Then("the period {string} lists the event {string}", (s, period: string, id: string) => {
  expect(s.membership.periods[period]).toContain(id);
});
Given("the event {string} has the effect {string}", (s, id: string, effect: string) => {
  s.event = id;
  const leaf = parseLeaf(effect);
  expect(E.eventDef(id).effects.immediate).toContainEqual(leaf);
});
When("the event fires", (s) => {
  const e = ev(s);
  s.fired = E.fire(st(s), e, roles(s, e), rng(s));
  act(s);
});
Then("the condition {string} is true", (s, text: string) => {
  expect(E.holds(parseCondition(text), w(s))).toBe(true);
});

// ---------------------------------------------------------------- principles

Given("the event {string} has the history date {}", (s, id: string, date: string) => {
  s.event = id;
  expect(E.historyStart(E.tree.index[id]!.date)).toBe(date);
});
Given("the trigger of {string} does not hold for any country in {int}", (s, id: string, year: number) => {
  s.event = id;
  setYear(s, year);
  const f = c(s, "France");
  f.government = "monarchy";
  f.stats = { debt: 500, stability: 1, legitimacy: 80 };
  for (const [cid] of Object.entries(w(s).countries)) expect(E.holds(E.eventDef(id).trigger, w(s), { roles: { realm: [cid] } })).toBe(false);
});
When("the year {int} is processed", (s, year: number) => {
  setYear(s, year);
  for (let m = 0; m < 12; m++) {
    E.processMonth(st(s), rng(s));
    E.nextMonth(w(s));
  }
});
Then("the event {string} does not fire", (s, id: string) => {
  expect(w(s).history.some((h) => h.event === id)).toBe(false);
});
Given("the role {string} of {string} selects any monarchy with debt of {int} or more", (s, role: string, id: string, debt: number) => {
  s.event = id;
  const sel = E.eventDef(id).roles[role]!.select;
  expect(sel).not.toBe("fixed");
  expect(JSON.stringify(sel)).toContain('"is":"monarchy"');
  expect(JSON.stringify(sel)).toContain(`"stat":"debt","op":">=","value":${debt}`);
});
Given("the country {string} is a monarchy with debt of {int}", (s, id: string, debt: number) => {
  c(s, id).government = "monarchy";
  c(s, id).stats.debt = debt;
});
When("the event becomes eligible", (s) => {
  const e = ev(s);
  s.candidates = Object.fromEntries(Object.keys(e.roles).map((r) => [r, E.roleCandidates(st(s), e, r)]));
  if (e.selection.mode === "decision") s.offer = E.offer(st(s), e, roles(s, e));
  act(s);
});
Then("{string} can be bound to the role {string}", (s, who: string, role: string) => {
  expect(s.candidates[role]).toContain(who);
});
Then("the historical holder {string} is reference only", (s, who: string) => {
  const role = Object.entries(ev(s).roles).find(([, r]) => r.historical.includes(who));
  expect(role, `a role listing ${who}`).toBeDefined();
  expect(s.candidates[role![0]]).not.toContain(who);
});
Given("the role {string} of {string} is fixed to {string}", (s, role: string, id: string, who: string) => {
  s.event = id;
  const r = E.eventDef(id).roles[role]!;
  expect(r.select).toBe("fixed");
  expect(r.historical).toEqual([who]);
});
Then("the role {string} is bound to {string}", (s, role: string, who: string) => {
  expect(s.candidates[role]).toEqual([who]);
});
Given("the event {string} is marked narrative only", (s, id: string) => {
  s.event = id;
  expect(E.tree.index[id]!.depiction).toBe("narrative_only");
  expect(ev(s).depiction).toBe("narrative_only");
});
When("its options are listed", (s) => {
  s.options = ev(s).options;
  act(s);
});
Then("no option gives the perpetrator a positive stat or prestige payoff", (s) => {
  expect(E.perpetratorPayoffs(ev(s))).toEqual([]);
});
Then("its effects act on the named people through population effects", (s) => {
  const e = ev(s);
  const people = Object.values(e.roles).filter((r) => r.as.includes("victim")).flatMap((r) => r.historical);
  const groups = [e.effects, ...e.options.map((o) => o.effects)]
    .flatMap((b) => Object.values(b).flat() as E.Effect[])
    .map((x) => E.effectType(x))
    .filter(([t]) => t === "population" || t === "move_population")
    .map(([, p]) => String(p.group));
  expect(groups.length).toBeGreaterThan(0);
  expect(groups.some((g) => people.includes(g))).toBe(true);
});

const TERMS_IN_MODEL = (term: string): boolean => {
  const stats = E.eventsConfig.statistics as Record<string, Record<string, unknown>>;
  const fields = E.eventsConfig.schema_fields as unknown as Record<string, string[]>;
  return Object.values(stats).some((x) => term in x) || Object.values(fields).some((f) => f.includes(term)) || JSON.stringify(stats).includes(`"${term}`) || (E.eventsConfig.statistics.country.innovations !== undefined && term === "innovations");
};
const CONCEPTS: Record<string, string> = {
  "a province's wealth": "prosperity",
  "spreading techniques": "innovations",
  "trade centres": "trade_hubs",
  "expected waiting time": "mean_years",
  "reputation for aggression": "notoriety",
  "strain of holding conquests": "integration_strain",
};
When("the event tree names {string}", (s, concept: string) => {
  s.term = CONCEPTS[concept];
});
Then("it uses the term {string}", (s, term: string) => {
  expect(s.term).toBe(term);
  expect(TERMS_IN_MODEL(term)).toBe(true);
});
Given("the event {string} carries the music tag {string}", (s, id: string, tag: string) => {
  ev(s, id).music = tag;
  s.event = id;
  franceReady(s);
  s.roles = { realm: ["France"] };
});
Then("the soundtrack receives the tag {string}", (s, tag: string) => {
  const fired = st(s).log.find((l) => l.type === "EventFired" && l.event === s.event);
  expect(fired?.music).toBe(tag);
});
Given("a scripted event is marked tutorial only", (s) => {
  add(s, fixture("tutorial_script", { tutorial_only: true }));
});
Given("a real campaign is running", (s) => {
  st(s).rules.tutorial = false;
});
When("eligibility is evaluated", (s) => {
  for (const fn of s.before ?? []) fn();
  s.elig = E.eligible(st(s), ev(s));
  s.reason = E.gate(st(s), ev(s));
  act(s);
});
Then("the scripted event never fires", (s) => {
  expect(s.elig).toEqual([]);
  expect(s.reason).toBe("tutorial");
  E.processMonth(st(s), rng(s));
  expect(w(s).history).toEqual([]);
});

// ---------------------------------------------------------------- eligibility

Given("the event {string} is available from {int} to {int}", (s, id: string, from: number, to: number) => {
  s.event = id;
  expect(E.eventDef(id).availability).toMatchObject({ earliest: from, latest: to });
});
Given("the trigger of {string} holds for {string}", (s, id: string, who: string) => {
  franceReady(s);
  expect(E.holds(E.eventDef(id).trigger, w(s), { roles: { realm: [who] } })).toBe(true);
});
Then(/^the event "([^"]+)" is (eligible|not eligible)$/, (s, id: string, state: string) => {
  const list = E.eligible(st(s), ev(s, id));
  expect(list.length > 0).toBe(state === "eligible");
  if (s.expectReason) expect(E.gate(st(s), ev(s, id))).toBe(s.expectReason);
});
Then(/^the event is (eligible|not eligible)$/, (s, state: string) => {
  expect((s.elig as unknown[]).length > 0).toBe(state === "eligible");
});
Given("an event with repeat {string}", (s, repeat: string) => {
  add(s, fixture("repeating", { availability: { earliest: 1444, latest: 1939, mode: "reference", repeat: repeat as E.Availability["repeat"] }, execution: { cooldown_years: 10 } }));
  if (repeat === "process") {
    for (const id of ["A", "B"]) c(s, id).government = "monarchy";
    ev(s).roles = { realm: { historical: ["A"], select: { condition: { government: { who: "this", is: "monarchy" } } }, as: ["affected"] } };
  } else c(s, "A");
  setYear(s, 1500);
});
When("it has fired once", (s) => {
  const first = E.eligible(st(s), ev(s))[0]!;
  E.fire(st(s), ev(s), first, rng(s));
  s.first = first;
});
Then("it never fires again", (s) => {
  expect(E.eligible(st(s), ev(s))).toEqual([]);
  setYear(s, 1600);
  expect(E.eligible(st(s), ev(s))).toEqual([]);
});
Then("it may fire again after its cooldown years", (s) => {
  expect(E.eligible(st(s), ev(s))).toEqual([]);
  setYear(s, 1500 + 10);
  expect(E.eligible(st(s), ev(s)).length).toBe(1);
});
Then("it may fire for other countries as the diffusion spreads", (s) => {
  const again = E.eligible(st(s), ev(s));
  expect(again.map((r) => r.realm)).toEqual([["B"]]);
  expect(s.first.realm).toEqual(["A"]);
});
Given("the event {string} is recurring with a cooldown of {int} years", (s, id: string, years: number) => {
  s.event = id;
  const e = E.eventDef(id);
  expect(e.availability.repeat).toBe("recurring");
  expect(e.execution?.cooldown_years).toBe(years);
  E.place(w(s), "area:bengal").owner = "eic";
  E.place(w(s), "area:bengal").stats.colonial_status = "colony";
  E.place(w(s), "area:bengal").stats.food_security = 0.6;
  c(s, "eic");
});
Given("it fired in {int}", (s, year: number) => {
  w(s).history.push({ event: s.event, year, month: 1, roles: { ruler: ["eic"] } });
});
When("the food security of {string} falls below {float} in {int}", (s, area: string, v: number, year: number) => {
  E.place(w(s), area).stats.food_security = v - 0.05;
  s.lastFall = { area, v };
  setYear(s, year);
});
When("the same happens in {int}", (s, year: number) => {
  setYear(s, year);
});
Then("the event {string} cannot fire yet", (s, id: string) => {
  expect(E.eligible(st(s), ev(s, id))).toEqual([]);
  expect(E.repeatBlocks(st(s), ev(s, id), { ruler: ["eic"] })).toBe("cooldown");
});
Then("the event {string} can fire again", (s, id: string) => {
  expect(E.eligible(st(s), ev(s, id)).length).toBeGreaterThan(0);
});
function requiresOf(text: string): E.Condition {
  const ev = (x: string) => ({ event: x.trim() });
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^all of (.+)$/))) return { all: m[1]!.split(/,| and /).map(ev) };
  if ((m = text.match(/^any of (.+)$/))) return { any: m[1]!.split(/,| or /).map(ev) };
  if ((m = text.match(/^not (.+)$/))) return { not: ev(m[1]!) };
  if ((m = text.match(/^at least (\d+) of (.+)$/))) return { at_least: { n: Number(m[1]), of: m[2]!.split(/,| and /).map(ev) } };
  throw new Error(`requires? ${text}`);
}
Given("an event requires {string}", (s, text: string) => {
  add(s, fixture("chained", { requires: requiresOf(text) }));
  setYear(s, 1600);
});
Given("the events that happened are {string}", (s, list: string) => {
  for (const id of list.split(",")) happened(s, id.trim());
});
Given("the event {string} requires {string} with the outcome {string}", (s, id: string, req: string, outcome: string) => {
  s.event = id;
  expect(E.eventDef(id).requires).toEqual({ event: { id: req, outcome } });
  setYear(s, 1795);
  s.expectReason = "requires";
});
Given("{string} ended with the outcome {string}", (s, id: string, outcome: string) => {
  happened(s, id, 4, outcome, { realm: ["France"] });
});
Given("the event {string} lists {string} as optional with weight {float}", (s, id: string, opt: string, weight: number) => {
  s.event = id;
  expect(E.eventDef(id).optional).toContainEqual({ event: opt, weight });
  franceReady(s);
  setYear(s, 1789);
  s.roles = { realm: ["France"] };
});
Given("{string} has happened", (s, id: string) => {
  happened(s, id, 3);
});
When("the pool roll for {string} is made", (s, id: string) => {
  s.event = id;
  s.chance = E.poolChance(st(s), ev(s), roles(s, ev(s)));
});
Then("its weight is multiplied by {float}", (s, x: number) => {
  expect(s.chance.optional).toBeCloseTo(x);
  expect(s.chance.chance).toBeCloseTo(s.chance.base * x);
});
Then("{string} was not needed for it to be eligible", (s, id: string) => {
  expect(E.eligible(st(s), ev(s)).length).toBe(1);
  w(s).history = w(s).history.filter((h) => h.event !== id);
  expect(E.eligible(st(s), ev(s)).length).toBe(1);
});
Given("the events {string} and {string} are exclusive with each other", (s, a: string, b: string) => {
  add(s, fixture(a, { exclusive_with: [b] }));
  add(s, fixture(b, { exclusive_with: [a] }));
  c(s, "A");
  setYear(s, 1600);
  expect(E.eligible(st(s), ev(s, b)).length).toBe(1);
});
When("{string} fires", (s, id: string) => {
  E.fire(st(s), ev(s, id), roles(s, ev(s, id)), rng(s));
});
Then("{string} cannot fire", (s, id: string) => {
  expect(E.eligible(st(s), ev(s, id))).toEqual([]);
  expect(E.gate(st(s), ev(s, id))).toBe("exclusive");
});
Given("the event {string} is invalidated if {string} is not a monarchy", (s, id: string, who: string) => {
  s.event = id;
  expect(E.eventDef(id).invalidated_if).toEqual({ not: { government: { who: "$realm", is: "monarchy" } } });
  franceReady(s);
  setYear(s, 1789);
  expect(E.eligible(st(s), ev(s)).map((r) => r.realm)).toEqual([[who]]);
});
When("{string} becomes a republic by another path", (s, who: string) => {
  c(s, who).government = "republic";
  E.eligible(st(s), ev(s));
});
Then("the event {string} is removed for good", (s, id: string) => {
  expect(st(s).invalidated[id]).toBeDefined();
  c(s, "France").government = "monarchy";
  expect(E.eligible(st(s), ev(s, id))).toEqual([]);
  expect(E.gate(st(s), ev(s, id))).toBe("invalidated");
});
Then("a branch removed because its entity vanished can re-open when a later event creates that entity again", (s) => {
  const e = ev(s, "samori_toure_resistance");
  c(s, "wassoulou_empire").exists = false;
  E.checkInvalidation(st(s), e);
  expect(st(s).invalidated[e.id]).toEqual({ vanished: "wassoulou_empire" });
  const later = add(s, fixture("rebuild", { options: [{ id: "yes", chooser: null, historical: true, ai: { base: 1 }, effects: { immediate: [{ create_country: { entity: "wassoulou_empire" } }] } }, { id: "no", chooser: null, ai: { base: 0 }, effects: {} }] }));
  E.answer(st(s), later, {}, "yes");
  expect(st(s).invalidated[e.id]).toBeUndefined();
});
Given(/^the trigger of "([^"]+)" is all of: (.+)$/, (s, id: string) => {
  s.event = id;
  const t = E.eventDef(id).trigger as { all: E.Condition[] };
  expect(t.all).toHaveLength(4);
  expect(t.all[3]).toHaveProperty("any");
  expect(JSON.stringify(t)).toContain("laki_eruption");
});
Given("{string} is a monarchy with debt {int}, liberalism {float}, stability {int} and legitimacy {int}", (s, who: string, debt: number, lib: number, stab: number, leg: number) => {
  const f = c(s, who);
  f.government = "monarchy";
  f.stats = { debt, stability: stab, legitimacy: leg };
  f.ideologies = { liberalism: lib };
});
When("the trigger is evaluated with {string} bound to {string}", (s, role: string, who: string) => {
  s.result = E.holds(ev(s).trigger, w(s), { roles: { [role.replace("$", "")]: [who] } });
});
Then(/^it is (true|false)$/, (s, v: string) => {
  expect(s.result).toBe(v === "true");
});
Given("an event's trigger uses the condition type {string}", (s, type: string) => {
  s.buildEvents = [fixture("moody", { trigger: { [type]: { who: "$realm" } } })];
});
Given(/^the build reports (no error|an error)$/, (s, what: string) => {
  if (what === "no error") expect(s.report.errors).toEqual([]);
  else expect(s.report.errors.length).toBeGreaterThan(0);
});
Given("an event's selection weights use {string}", (s, type: string) => {
  s.buildEvents = [fixture("weights", { selection: { mode: "pool", mean_years: 3, modifiers: [{ if: { [type]: { who: "$realm" } }, mult: 2 }] } })];
});
Then("the build reports that {string} is not a declared condition type", (s, type: string) => {
  expect(s.report.errors.join("\n")).toContain(`undeclared condition type ${type}`);
  expect(E.DECLARED_CONDITIONS).not.toContain(type);
});
Given("the event {string} fired {int} years ago with the outcome {string} for {string}", (s, id: string, years: number, outcome: string, who: string) => {
  setYear(s, 1800);
  happened(s, id, years, outcome, { realm: [who] });
});
When("the condition {string} is evaluated", (s, text: string) => {
  s.result = E.holds(parseCondition(text), w(s));
});

// ---------------------------------------------------------------- selection and pacing

Given("an event with the selection mode {string}", (s, mode: string) => {
  add(s, fixture("instant", { selection: { mode: mode as E.SelectionDef["mode"] }, trigger: { flag: { who: "global", id: "ready" } } }));
  c(s, "A");
  setYear(s, 1600, 3);
});
When("it becomes eligible", (s) => {
  w(s).flags.push({ on: "global", id: "ready" });
  E.processMonth(st(s), rng(s));
});
Then("it fires the same month", (s) => {
  expect(w(s).history.find((h) => h.event === s.event)).toMatchObject({ year: 1600, month: 3 });
});
Given("the event {string} is eligible with the selection mode {string} and a mean wait of {int} years", (s, id: string, mode: string, years: number) => {
  s.event = id;
  expect(E.eventDef(id).selection).toMatchObject({ mode, mean_years: years });
  franceReady(s);
  setYear(s, 1789);
  s.roles = { realm: ["France"] };
  expect(E.eligible(st(s), ev(s)).length).toBe(1);
});
Given("its selection modifiers multiply its chance by {int}", (s, x: number) => {
  ev(s).selection.modifiers = [{ if: { government: { who: "$realm", is: "monarchy" } }, mult: x }];
});
Given("a follow-up boost of {float} is active on it", (s, b: number) => {
  const at = E.now(w(s));
  st(s).boosts.push({ event: s.event, from: "earlier", start: at - 12, end: at + 12, boost: b });
});
When("the month's pool roll is made", (s) => {
  s.chance = E.poolChance(st(s), ev(s), roles(s, ev(s)));
  E.processMonth(st(s), rng(s));
});
Then("its chance comes from a mean wait of {int} years multiplied by {int} and by {float}", (s, years: number, a: number, b: number) => {
  expect(s.chance.base).toBeCloseTo(1 / (years * 12));
  expect(s.chance.chance).toBeCloseTo(E.baseChance(years) * a * b);
});
Given("the event {string} has the selection mode {string}", (s, id: string, mode: string) => {
  s.event = id;
  expect(E.eventDef(id).selection.mode).toBe(mode);
});
Given("the role {string} is bound to the country {string}", (s, role: string, who: string) => {
  (s.roles ??= {})[role] = [who];
  c(s, who);
});
Then("the event is offered to the controller of {string}", (s, who: string) => {
  expect(s.offer).toMatchObject({ kind: "offered", controller: who });
  expect(st(s).pending).toContainEqual(s.offer);
});
Given("the country {string} has had {int} pool events this year", (s, who: string, n: number) => {
  setYear(s, 1600, 6);
  st(s).poolFired[`${who}:1600`] = n;
  c(s, who).government = "monarchy";
});
Given("a third pool event for {string} wins its roll", (s, who: string) => {
  add(s, fixture("third_pool_event", { selection: { mode: "pool", mean_years: 1 / 120 }, roles: { realm: { historical: [who], select: { condition: { government: { who: "this", is: "monarchy" } } }, as: ["affected"] } } }));
  expect(E.poolChance(st(s), ev(s), { realm: [who] }).chance).toBe(1);
});
Then("the third event does not fire for {string} this year", (s, who: string) => {
  expect(w(s).history.some((h) => h.event === s.event)).toBe(false);
  expect(E.underPacingCap(st(s), who)).toBe(false);
  st(s).poolFired[`${who}:1600`] = 1;
  E.processMonth(st(s), rng(s));
  expect(w(s).history.some((h) => h.event === s.event)).toBe(true);
});
Given("the event {string} fired in {int} with the follow-up {string} delay {int} to {int} years and boost {float}", (s, id: string, year: number, fu: string, a: number, b: number, boost: number) => {
  const e = ev(s, id);
  expect(e.follow_ups).toContainEqual({ event: fu, delay: [a, b], boost });
  s.event = fu;
  E.addFollowUps(st(s), e, E.monthIndex(year));
});
When("the weight of {string} is computed in {int}", (s, id: string, year: number) => {
  s.boost = E.followUpBoost(st(s), id, E.monthIndex(year));
  s.boostYear = year;
});
Then(/^the boost is (.+)$/, (s, what: string) => {
  if (what.startsWith("none")) return expect(s.boost).toBe(1);
  if (what.startsWith("fading")) {
    expect(s.boost).toBeGreaterThan(1);
    expect(s.boost).toBeLessThan(3);
    // 5 of the 10 fading years have passed since the window closed in 1794
    return expect(s.boost).toBeCloseTo(1 + 2 * (1 - (s.boostYear - 1794) / 10));
  }
  expect(s.boost).toBeCloseTo(Number(what));
});
Given("three follow-ups boost the same event by {float} each", (s, b: number) => {
  add(s, fixture("boosted", { selection: { mode: "pool", mean_years: 2 } }));
  setYear(s, 1700);
  const at = E.now(w(s));
  for (const from of ["x", "y", "z"]) st(s).boosts.push({ event: "boosted", from, start: at - 12, end: at + 12, boost: b });
});
Given("the event's trigger does not hold", (s) => {
  ev(s).trigger = { flag: { who: "global", id: "never_set" } };
  c(s, "A");
});
Then("the boost counts at most {float}", (s, cap: number) => {
  expect(s.chance.boost).toBe(cap);
});
Then("the event does not fire", (s) => {
  expect(w(s).history.some((h) => h.event === s.event)).toBe(false);
});
Given("the game rule alternate history is {string}", (s, mode: string) => {
  st(s).rules.mode = mode as E.AlternateHistoryMode;
});
When("selection weights are computed", (s) => {
  const at = 1000;
  s.weighed = {
    boost: E.boostAt({ event: "x", from: "y", start: at - 1, end: at + 1, boost: 2 }, at, st(s).rules.mode) / 2,
    historical: E.aiWeight(st(s), { id: "h", chooser: null, historical: true, ai: { base: 10 }, effects: {} }, {}) / 10,
    wait: E.baseChance(4) / E.poolChance(st(s), fixture("w", { selection: { mode: "pool", mean_years: 4 } }), {}).base,
  };
});
Then("follow-up boosts are multiplied by {float}", (s, x: number) => {
  expect(s.weighed.boost).toBeCloseTo(x);
});
Then("historical options are multiplied by {float}", (s, x: number) => {
  expect(s.weighed.historical).toBeCloseTo(x);
});
Then("mean waits are multiplied by {float}", (s, x: number) => {
  expect(s.weighed.wait).toBeCloseTo(x);
});
Given("an option marked historical has an AI weight of {int}", (s, base: number) => {
  s.option = { id: "history", chooser: "$realm", historical: true, ai: { base }, effects: {} } satisfies E.OptionDef;
});
When("the AI weighs its options", (s) => {
  s.weight = E.aiWeight(st(s), s.option, { realm: ["A"] }, { chooser: "A", ...(s.other ? { other: s.other } : {}) });
});
Then("the historical option's weight is {int}", (s, n: number) => {
  expect(s.weight).toBeCloseTo(n);
});

// ---------------------------------------------------------------- options and choice

Then("it has the options {string}, {string} and {string}", (s, a: string, b: string, cc: string) => {
  expect((s.options as E.OptionDef[]).map((o) => o.id)).toEqual([a, b, cc]);
  expect(E.validate({ events: [ev(s)] }).errors).toEqual([]);
});
Then("only {string} is marked historical", (s, id: string) => {
  expect((s.options as E.OptionDef[]).filter((o) => o.historical).map((o) => o.id)).toEqual([id]);
});
Given("the event {string} fires with {string} bound to the player's country {string}", (s, id: string, role: string, who: string) => {
  s.event = id;
  franceReady(s);
  c(s, who).human = true;
  s.roles = { [role.replace("$", "")]: [who] };
  s.fired = E.fire(st(s), ev(s), roles(s, ev(s)), rng(s));
});
When("the options are offered", (s) => {
  s.shown = E.visibleOptions(st(s), ev(s), roles(s, ev(s)));
});
Then("the player chooses the option", (s) => {
  expect(s.fired.queued).toBe(true);
  expect(st(s).pending).toContainEqual(expect.objectContaining({ event: s.event, controller: "France", kind: "fired" }));
  expect(w(s).history.find((h) => h.event === s.event)?.option).toBeUndefined();
  expect(s.shown.length).toBe(3);
});
Given("the event {string} has the options {string} with weight {int} and {string} with weight {int} and no chooser", (s, id: string, a: string, wa: number, b: string, wb: number) => {
  s.event = id;
  const e = ev(s);
  expect(e.options.map((o) => [o.id, o.ai.base, o.chooser])).toEqual([
    [a, wa, null],
    [b, wb, null],
  ]);
});
Then("the option is picked by a roll weighted {int} to {int} before any factors", (s, a: number, b: number) => {
  const e = ev(s);
  const r = roles(s, e);
  const weights = e.options.map((o) => E.aiWeight(st(s), o, r));
  expect(weights).toEqual([a, b]);
  expect(s.fired.option).toBeDefined();
  expect(E.pickWeighted(e.options, weights, (a - 1) / (a + b)).id).toBe(e.options[0]!.id);
  expect(E.pickWeighted(e.options, weights, (a + 1) / (a + b)).id).toBe(e.options[1]!.id);
});
Given("an option of an event has an allowed condition that is false for the chooser", (s) => {
  const e = add(s, fixture("gated"));
  e.options.push({ id: "gated_option", chooser: "$realm", allowed: { flag: { who: "$realm", id: "may_do_it" } }, ai: { base: 10 }, effects: {} });
  s.roles = { realm: ["A"] };
  c(s, "A");
});
Then("that option is not shown", (s) => {
  expect((s.shown as E.OptionDef[]).map((o) => o.id)).toEqual(["yes", "no"]);
});
Given("an AI option has base weight {int} and the factor {string} with multiplier {int}", (s, base: number, factor: string, mult: number) => {
  s.option = { id: "o", chooser: "$realm", ai: { base, factors: [{ factor, mult }] }, effects: {} } satisfies E.OptionDef;
  c(s, "A").stats = { army_strength: 100, treasury: 500, expenses: 100, great_power_score: 10 };
  for (let i = 1; i <= 10; i++) c(s, `P${i}`).stats = { great_power_score: 20 + i };
});
Given(/^for the chooser (.+)$/, (s, situation: string) => {
  const a = c(s, "A");
  switch (situation) {
    case "the country is at war":
      a.enemies = ["B"];
      break;
    case "the country is at peace":
      a.enemies = [];
      break;
    case "the treasury is below one year of expenses":
      a.stats.treasury = 50;
      break;
    case "more than half its provinces have 4 or more grievances":
    case "half its provinces have 4 or more grievances": {
      const plotting = situation.startsWith("more") ? 3 : 2;
      for (let i = 1; i <= 4; i++) {
        E.place(w(s), `province:a${i}`).owner = "A";
        E.place(w(s), `province:a${i}`).stats.grievances = i <= plotting ? 4 : 1;
      }
      break;
    }
    case "the other party shares the state religion":
      a.religion = "catholic";
      c(s, "B").religion = "catholic";
      s.other = "B";
      break;
    case "the other party is a rival":
      a.relations = [{ other: "B", type: "rivalry" }];
      s.other = "B";
      break;
    case "the country ranks in the top 8 by great power score":
      a.stats.great_power_score = 25;
      break;
    case "a hostile neighbour has more than 1.5 times its army strength":
      a.borders = ["B"];
      a.relations = [{ other: "B", type: "rivalry" }];
      c(s, "B").stats.army_strength = 160;
      break;
    default:
      throw new Error(`situation? ${situation}`);
  }
});
Then("the option's weight is {int}", (s, n: number) => {
  expect(s.weight).toBe(n);
});
Given("the event {string} has the event effect {string} on {string}", (s, id: string, effect: string, on: string) => {
  s.event = id;
  const [stat, change] = effect.split(" ");
  expect(E.eventDef(id).effects.immediate).toContainEqual({ on, stat: { [stat!]: Number(change) } });
});
When("{string} picks {string}", (s, who: string, option: string) => {
  c(s, who).stats = { debt: 3000, stability: 0 };
  s.roles = { realm: [who] };
  s.applied = E.answer(st(s), ev(s), roles(s, ev(s)), option);
});
Then("{string} gets {string} from the event and {string} from the option", (s, who: string, a: string, b: string) => {
  const stats = (s.applied as E.Applied[]).filter((x) => x.type === "stat" && x.target === who && x.values.stat === "stability").map((x) => Number(x.values.change));
  expect(stats).toEqual([Number(a.split(" ")[1]), Number(b.split(" ")[1])]);
  expect(c(s, who).stats.stability).toBe(-1);
});

// ---------------------------------------------------------------- effects and execution

Given("an option has a {string} effect", (s, tier: string) => {
  const effect: E.Effect = tier === "delayed" ? { after_years: 2, on: "global", stat: { global_tension: 1 } } : { on: "global", stat: { global_tension: 1 } };
  const e = add(s, fixture("tiered", { execution: { duration_years: 3 } }));
  e.options[0]!.effects = { [tier]: [effect] };
  s.tier = tier;
  E.place(w(s), "global").stats.global_tension = 0;
  setYear(s, 1700);
});
When("the option is chosen", (s) => {
  const e = ev(s);
  s.applied = E.answer(st(s), e, roles(s, e), s.optionId ?? e.options[0]!.id);
});
Then(/^the effect applies (.+)$/, (s, when: string) => {
  const tension = () => Number(E.place(w(s), "global").stats.global_tension);
  const months = (n: number) => {
    for (let i = 0; i < n; i++) {
      E.nextMonth(w(s));
      E.tick(st(s));
    }
  };
  if (when === "at once" || when === "as a permanent structural change") {
    expect(tension()).toBe(1);
    months(48);
    expect(tension()).toBe(1);
  } else if (when === "after its years") {
    expect(tension()).toBe(0);
    months(23);
    expect(tension()).toBe(0);
    months(1);
    expect(tension()).toBe(1);
  } else if (when === "each month while the event runs") {
    expect(tension()).toBe(1);
    months(2);
    expect(tension()).toBe(3);
    months(40);
    const after = tension();
    months(5);
    expect(tension()).toBe(after);
    expect(w(s).running).toEqual([]);
  } else throw new Error(when);
});
Given("the option {string} of {string} starts a war and annexes {string} after {int} year if its war weariness is {int} or more", (s, option: string, id: string, target: string, years: number, ww: number) => {
  s.event = id;
  s.optionId = option;
  const o = ev(s).options.find((x) => x.id === option)!;
  expect(E.effectTypes(o.effects.immediate)).toEqual(["war"]);
  expect(o.effects.delayed).toEqual([{ after_years: years, annex: { who: "$invader", target }, if: { stat: { who: target, stat: "war_weariness", op: ">=", value: ww } } }]);
  s.roles = { invader: ["britain"], kingdom: [target] };
  setYear(s, 1879);
  c(s, "britain");
  c(s, target);
  s.target = target;
});
Then("the war starts at once", (s) => {
  expect(w(s).wars.war_anglo_zulu?.ongoing).toBe(true);
  expect(c(s, "britain").enemies).toContain(s.target);
});
Then("{int} year later {string} is annexed if its war weariness is {int} or more", (s, years: number, target: string, ww: number) => {
  const copy = E.clone(st(s));
  c(s, target).stats.war_weariness = ww;
  E.place(w(s), "province:ulundi").owner = target;
  for (let i = 0; i < years * 12; i++) {
    E.nextMonth(w(s));
    E.tick(st(s));
  }
  expect(c(s, target).exists).toBe(false);
  expect(E.place(w(s), "province:ulundi").owner).toBe("britain");
  // below the bar the kingdom stands
  E.country(copy.world, target).stats.war_weariness = ww - 1;
  for (let i = 0; i < years * 12; i++) {
    E.nextMonth(copy.world);
    E.tick(copy);
  }
  expect(E.country(copy.world, target).exists).not.toBe(false);
});
Given("the event {string} runs for {int} years while {string} exists", (s, id: string, years: number, who: string) => {
  s.event = id;
  expect(ev(s).execution).toEqual({ duration_years: years, maintain: { exists: who } });
  c(s, who).exists = true;
  setYear(s, 1882);
  s.roles = { empire: [who], colonizer: ["France"] };
  E.answer(st(s), ev(s), roles(s, ev(s)), "mobile_resistance");
  expect(w(s).running.map((r) => r.event)).toEqual([id]);
  // an ongoing effect to watch while it runs
  ev(s).effects.ongoing = [{ on: "global", stat: { global_tension: 1 } }];
});
When("{string} ceases to exist in its fifth year", (s, who: string) => {
  for (let i = 0; i < 48; i++) {
    E.nextMonth(w(s));
    E.tick(st(s));
  }
  expect(w(s).running.length).toBe(1);
  c(s, who).exists = false;
  E.nextMonth(w(s));
  s.tickApplied = E.tick(st(s));
});
Then("the event ends", (s) => {
  expect(w(s).running).toEqual([]);
  expect(st(s).log).toContainEqual(expect.objectContaining({ type: "EventCancelled", event: s.event, reason: "maintain failed" }));
});
Then("its ongoing effects stop", (s) => {
  const before = E.place(w(s), "global").stats.global_tension;
  expect(before).toBe(48);
  E.nextMonth(w(s));
  E.tick(st(s));
  expect(E.place(w(s), "global").stats.global_tension).toBe(before);
});
Given("a running event is cancelled if the period {string} is not active", (s, period: string) => {
  const e = add(s, fixture("slave_trade_process", { execution: { duration_years: 10, cancel_if: { not: { period_active: period } } } }));
  w(s).periods.push(period);
  setYear(s, 1700);
  E.answer(st(s), e, roles(s, e), "yes");
  E.tick(st(s));
  expect(w(s).running.length).toBe(1);
});
Then("the event is aborted", (s) => {
  expect(w(s).running).toEqual([]);
  expect(st(s).log).toContainEqual(expect.objectContaining({ type: "EventCancelled", reason: "cancelled" }));
});
Given("the event {string} is running", (s, id: string) => {
  w(s).running.push({ event: id, roles: {}, start: 0, end: E.monthIndex(1900) });
});

const EFFECT_WORLD: Record<string, (s: Scenario) => void> = {
  transfer: (s) => {
    E.place(w(s), "area:punjab").provinces = ["province:lahore", "province:multan"];
    E.place(w(s), "province:lahore").owner = "durrani";
    E.place(w(s), "province:multan").owner = "durrani";
    c(s, "durrani");
    c(s, "marathas");
    s.roles = { invader: ["durrani"] };
  },
  create_country: (s) => c(s, "britain"),
  annex: (s) => {
    c(s, "britain");
    c(s, "boer_republics");
    E.place(w(s), "province:transvaal").owner = "boer_republics";
  },
  vassalize: (s) => {
    c(s, "x");
    c(s, "y");
  },
  spread: (s) => {
    E.place(w(s), "region:europe").ideologies = { liberalism: 0.2 };
  },
  population: (s) => {
    E.place(w(s), "region:caribbean").groups = { taino: 100 };
  },
  set_flag: (s) => c(s, "x"),
  trade_route: () => {},
  colony: (s) => c(s, "x"),
};
When("an event applies the effect {string}", (s, text: string) => {
  const leaf = parseLeaf(text);
  const [type, p] = Object.entries(leaf)[0]! as [string, Record<string, unknown>];
  if (type === "spread") {
    p.amount = Number((p._loose as string[])[0]);
    delete p._loose;
  }
  if (type === "trade_route") {
    p.from_hub = p.from;
    p.to_hub = p.to;
    delete p.from;
    delete p.to;
    p.open = ((p._loose as string[]) ?? []).includes("open");
    delete p._loose;
  }
  setYear(s, 1800);
  EFFECT_WORLD[type]?.(s);
  s.applied = E.applyEffect({ [type]: p }, w(s), { roles: s.roles ?? {} });
});
Then("ownership of the provinces in the area moves", (s) => {
  expect(["province:lahore", "province:multan"].map((k) => E.place(w(s), k).owner)).toEqual(["marathas", "marathas"]);
});
Then("the polity is created as a subject", (s) => {
  expect(c(s, "south_africa").exists).toBe(true);
  expect(E.holds({ relation: { who: "south_africa", other: "britain", type: "subject" } }, w(s))).toBe(true);
});
Then("the target ceases to exist", (s) => {
  expect(E.exists(w(s), "boer_republics")).toBe(false);
  expect(E.place(w(s), "province:transvaal").owner).toBe("britain");
});
Then("a subject relation is created", (s) => {
  expect(E.holds({ relation: { who: "y", other: "x", type: "subject" } }, w(s))).toBe(true);
  expect(E.holds({ subject_count: { who: "x", op: "==", value: 1 } }, w(s))).toBe(true);
});
Then("liberalism support in Europe rises by {float}", (s, x: number) => {
  expect(E.place(w(s), "region:europe").ideologies!.liberalism).toBeCloseTo(0.2 + x);
});
Then("the Taino population falls by {int} percent", (s, pct: number) => {
  expect(E.place(w(s), "region:caribbean").groups!.taino).toBeCloseTo(100 - pct);
});
Then("the flag is set for {int} years", (s, years: number) => {
  expect(E.holds({ flag: { who: "x", id: "y" } }, w(s))).toBe(true);
  w(s).year += years;
  E.tick(st(s));
  expect(E.holds({ flag: { who: "x", id: "y" } }, w(s))).toBe(false);
});
Then("the trade link opens", (s) => {
  expect(w(s).tradeRoutes).toContainEqual({ from: "lisbon", to: "malabar", open: true });
});
Then("colonial control is established", (s) => {
  expect(w(s).colonies).toContainEqual({ who: "x", where: "y", type: "trading_post" });
  expect(E.holds({ colonial_presence: { who: "x", where: "y", op: ">=", value: 1 } }, w(s))).toBe(true);
});
Given("the country {string} has debt {int} and stability {int}", (s, who: string, debt: number, stab: number) => {
  c(s, who).stats = { debt, stability: stab };
});
When("the effect {string} applies", (s, text: string) => {
  const m = text.match(/^stat on (\S+) (\w+) (\S+)$/);
  if (m) E.applyEffect({ on: m[1], stat: { [m[2]!]: m[3] } }, w(s), { roles: {} });
  else s.applied = E.applyEffect(parseLeaf(text), w(s), { roles: {} });
});
Then(/^"([^"]+)" has (\w+) (-?[\d.]+)$/, (s, who: string, stat: string, v: string) => {
  expect(c(s, who).stats[stat]).toBeCloseTo(Number(v));
});
Given("the event {string} starts the war {string}", (s, id: string, war: string) => {
  s.event = id;
  const o = ev(s).options.find((x) => (x.effects.immediate ?? []).some((e) => E.effectType(e)[0] === "war" && (e.war as { id: string }).id === war))!;
  expect(o).toBeDefined();
  setYear(s, 1792);
  s.roles = { revolutionary_state: ["France"], monarchies: ["Austria", "Prussia"] };
  E.answer(st(s), ev(s), roles(s, ev(s)), o.id);
});
When("the condition {string} is evaluated during the war", (s, text: string) => {
  s.result = E.holds(parseCondition(text), w(s));
  expect(E.holds({ at_war: { who: "France", other: "Austria" } }, w(s))).toBe(true);
});
Given("a sibling design adds the effect type {string} to the vocabulary", (s, type: string) => {
  s.newType = type;
  const e = fixture("faith_event");
  e.options[0]!.effects = { immediate: [{ [type]: { where: "region:europe", id: "protestant" } }] };
  s.newEvent = e;
  expect(E.validate({ events: [e] }).errors.join()).toContain(`undeclared effect type ${type}`);
});
When("the engine supports it", (s) => {
  st(s).effects = { [s.newType]: (p, world, _ctx, out) => out.push({ type: s.newType, target: String(p.where), values: { id: p.id, at: world.year } }) };
  add(s, s.newEvent);
});
Then("only one new evaluator is added", (s) => {
  expect(Object.keys(st(s).effects!)).toEqual([s.newType]);
  const applied = E.answer(st(s), ev(s), {}, "yes");
  expect(applied.map((a) => a.type)).toContain(s.newType);
});
Then("events, balance and modifiers stay data only", (s) => {
  expect(E.validate({ events: [s.newEvent], effectTypes: [s.newType] }).errors).toEqual([]);
});

// ---------------------------------------------------------------- modifiers

Given("a modifier of magnitude {int} lasting {int} years with decay {string}", (s, m: number, years: number, decay: string) => {
  s.mod = { value: m, years, decay };
});
When("{int} years have passed", (s, n: number) => {
  s.magnitude = E.magnitude(s.mod.value, { decay: s.mod.decay }, s.mod.years, n);
});
Then("its magnitude is {int}", (s, n: number) => {
  expect(s.magnitude).toBeCloseTo(n);
});
Given("the modifier {string} lasts {int} years", (s, id: string, years: number) => {
  s.def = E.modifierDef(id);
  expect(s.def.years).toBe(years);
});
When("it is applied", (s) => {
  s.mods = E.applyModifier([], s.def, "zulu_kingdom", E.monthIndex(1816));
});
Then("it never expires", (s) => {
  expect(E.expired(s.mods[0], E.monthIndex(1939, 8))).toBe(false);
  expect(E.decayFactor(s.def, 0, 300)).toBe(1);
});
Given("a modifier with stacking {string} is already on a country", (s, stacking: string) => {
  s.def = { id: "m", scope: "country", changes: { stability: -1 }, years: 10, decay: "none", stacking: stacking as "none" | "refresh" | "stack" } satisfies E.ModifierDef;
  s.mods = E.applyModifier([], s.def, "A", 0);
});
When("it is applied {int} more times", (s, n: number) => {
  for (let i = 1; i <= n; i++) s.mods = E.applyModifier(s.mods, s.def, "A", i * 12);
  s.last = n * 12;
});
Then(/^the country has (one copy, unchanged|one copy with its duration restarted|two copies|three copies, the most allowed)$/, (s, what: string) => {
  const m = s.mods as E.ModifierInstance[];
  expect(m).toHaveLength(1);
  if (what === "one copy, unchanged") expect(m[0]).toMatchObject({ start: 0, stacks: 1 });
  if (what === "one copy with its duration restarted") expect(m[0]).toMatchObject({ start: s.last, stacks: 1 });
  if (what === "two copies") expect(m[0]!.stacks).toBe(2);
  if (what === "three copies, the most allowed") expect(m[0]!.stacks).toBe(E.balance.modifier_rules.max_stacks);
});
Given("a modifier names no stacking rule", (s) => {
  s.def = { id: "plain", scope: "country", changes: { stability: -1 }, years: 10 } satisfies E.ModifierDef;
});
When("it is applied twice", (s) => {
  s.mods = E.applyModifier([], s.def, "A", 0);
  s.mods = E.applyModifier(s.mods, s.def, "A", 30);
});
Then("the second application restarts its duration", (s) => {
  expect(E.stackingOf(s.def)).toBe("refresh");
  expect(s.mods).toEqual([{ id: "plain", target: "A", start: 30, years: 10, stacks: 1 }]);
});
Given("a modifier with the change {string} is active", (s, text: string) => {
  const [stat, value] = text.split(":").map((x) => x.trim());
  s.change = { stat, value: value!.endsWith("%") ? value : Number(value) };
});
When("a year passes", (s) => {
  const start: Record<string, number> = { stability: 0, prestige: 10, income: 100, population: 1000, population_growth: 1000 };
  s.start = start[s.change.stat];
  s.year = E.yearOfChange(s.change.stat, s.change.value, s.start, s.start);
  s.year2 = E.yearOfChange(s.change.stat, s.change.value, s.year.value, s.start);
});
Then("stability is 1 lower while the modifier is active", (s) => {
  expect(s.year.value).toBe(s.start - 1);
  expect(s.year2.value).toBe(s.start - 1);
});
Then("prestige rises by 5 each year", (s) => {
  expect(s.year.value).toBe(s.start + 5);
  expect(s.year2.value).toBe(s.start + 10);
});
Then("income is scaled down by 15 percent", (s) => {
  expect(s.year.value).toBeCloseTo(85);
  expect(s.year2.value).toBeCloseTo(85);
});
Then("5 percent of the population is removed that year", (s) => {
  expect(s.year.value).toBeCloseTo(950);
});
Then("the yearly growth rate changes by 1", (s) => {
  expect(s.year.growthRate).toBe(1);
  expect(s.year.value).toBe(s.start);
});
Given("a region-scoped modifier is applied to the country {string}", (s, who: string) => {
  s.def = E.modifierDef("famine");
  expect(s.def.scope).toBe("region");
  for (const p of ["province:paris", "province:lyon"]) E.place(w(s), p).owner = who;
  E.place(w(s), "province:london").owner = "England";
  s.who = who;
});
When("it takes effect", (s) => {
  E.applyEffect({ on: s.who, modifier: "famine" }, w(s), { roles: {} });
});
Then("every province of {string} has the modifier", (s, who: string) => {
  expect(w(s).modifiers.map((m) => m.target).sort()).toEqual(["province:lyon", "province:paris"]);
  expect(Object.entries(w(s).places).filter(([, p]) => p.owner === who).length).toBe(2);
});

// ---------------------------------------------------------------- statistics

Given("{string} is a derived province statistic", (s, stat: string) => {
  expect(E.eventsConfig.statistics.province[stat as "food_security"].kind).toBe("derived");
  s.stat = stat;
});
When("an event wants to lower food security in {string}", (s, area: string) => {
  E.place(w(s), area).stats.food_security = 0.5;
  E.place(w(s), area).stats.devastation = 0;
  s.area = area;
  try {
    E.applyEffect({ on: area, stat: { food_security: -0.2 } }, w(s), { roles: {} });
  } catch (e) {
    s.err = (e as Error).message;
  }
});
Then("it changes an input such as devastation or applies a modifier the formula reads", (s) => {
  expect(s.err).toContain("change its inputs or apply a modifier");
  E.applyEffect({ on: s.area, stat: { devastation: 30 } }, w(s), { roles: {} });
  expect(E.place(w(s), s.area).stats.devastation).toBe(30);
  E.applyEffect({ on: s.area, modifier: "famine" }, w(s), { roles: {} });
  expect(w(s).modifiers.map((m) => m.id)).toContain("famine");
});
Then("it does not write {string} directly", (s, stat: string) => {
  expect(E.place(w(s), s.area).stats[stat]).toBe(0.5);
});
When("the statistic {string} is read", (s, stat: string) => {
  s.range = E.statRange(stat);
});
Then("its range is {string}", (s, text: string) => {
  const [a, b] = text.split(" to ").map((x) => Number(x.replace("+", "")));
  expect(s.range).toEqual([a, b]);
});

// ---------------------------------------------------------------- data validation

Given("a trigger reads the flag {string}", (s, flag: string) => {
  s.flag = flag;
  s.buildEvents = [fixture("flag_reader", { trigger: { flag: { who: "$realm", id: flag } } })];
});
Given(/^(it is a declared system flag set by the engine|no effect sets it and it is not declared)$/, (s, what: string) => {
  const declared = E.eventsConfig.system_flags.includes(s.flag);
  expect(declared).toBe(what.startsWith("it is"));
});
Given("the religion list has no {string}", (s, religion: string) => {
  expect(E.eventsConfig.enums.religions).not.toContain(religion);
  const e = fixture("new_faith", { trigger: { religion: { who: "$realm", is: religion } } });
  s.faithEvent = e;
  expect(E.validate({ events: [e] }).errors.join()).toContain(`unknown religion ${religion}`);
});
When("{string} is added to the religions in enums", (s, religion: string) => {
  s.enums = { ...(E.clone(E.eventsConfig.enums) as Record<string, string[]>) };
  s.enums.religions = [...s.enums.religions, religion];
});
Then("events can use {string} without any engine change", (s, religion: string) => {
  expect(E.validate({ events: [s.faithEvent], enums: s.enums }).errors).toEqual([]);
  c(s, "A").religion = religion;
  expect(E.holds(s.faithEvent.trigger, w(s), { roles: { realm: ["A"] } })).toBe(true);
});
Given("a trigger names the entity {string} for a role in {int}", (s, entity: string, year: number) => {
  s.buildEvents = [fixture("malacca", { roles: { rerouted: { historical: [entity], select: "fixed", as: ["affected"] } }, history: { date: year }, options: [{ id: "a", chooser: "$rerouted", historical: true, ai: { base: 1 }, effects: {} }, { id: "b", chooser: "$rerouted", ai: { base: 1 }, effects: {} }] })];
});
Given("{string} exists from {int}", (s, entity: string, year: number) => {
  s.entities = { [entity]: [[year, null]] };
});
Then("the build reports an anachronism warning", (s) => {
  expect(s.report.errors).toEqual([]);
  expect(s.report.warnings.join()).toContain("anachronism");
});
Then(/^it writes the layers (.+)$/, (s, list: string) => {
  const names = list.split(/, | and /);
  expect(Object.keys(s.layers)).toEqual(names);
  expect(names).toEqual(E.eventsConfig.layers);
});
When("the event card for {string} is shown", (s, id: string) => {
  s.cardName = E.eventName(E.tree.localization, id);
  s.cardId = id;
});
Then("its name {string} comes from the localization layer by its id", (s, name: string) => {
  expect(s.cardName).toBe(name);
  expect(E.tree.localization[`event.${s.cardId}.name`]).toBe(name);
});
const DEFECTS: Record<string, () => { events: E.EventDef[]; periods?: E.PeriodDef[] }> = {
  "an event references an undeclared role": () => ({ events: [fixture("d1", { trigger: { stat: { who: "$ghost", stat: "debt", op: ">", value: 1 } } })] }),
  "an event has two options marked historical": () => {
    const e = fixture("d2");
    e.options[1]!.historical = true;
    return { events: [e] };
  },
  "a narrative-only event has an option that raises the perpetrator's prestige": () => {
    const e = fixture("d3", { depiction: "narrative_only" });
    e.options[0]!.effects = { immediate: [{ on: "$realm", stat: { prestige: 10 } }] };
    return { events: [e] };
  },
  "two events require each other as mandatory prerequisites": () => ({ events: [fixture("d4a", { requires: { event: "d4b" } }), fixture("d4b", { requires: { event: "d4a" } })] }),
  "an event's earliest reachable date is after its latest date": () => ({
    events: [fixture("d5a", { availability: { earliest: 1700, latest: 1800, mode: "reference", repeat: "one_time" } }), fixture("d5b", { requires: { event: "d5a" }, availability: { earliest: 1500, latest: 1600, mode: "reference", repeat: "one_time" } })],
  }),
  "two exclusive events are both mandatory prerequisites of a third": () => ({
    events: [fixture("d6a", { exclusive_with: ["d6b"] }), fixture("d6b", { exclusive_with: ["d6a"] }), fixture("d6c", { requires: { all: [{ event: "d6a" }, { event: "d6b" }] } })],
  }),
  "a period lies inside none of its ages": () => ({
    events: [],
    periods: [{ id: "p_wrong", name: "Wrong", kind: "war", ages: ["age_of_exploration"], regions: [], window: [1800, 1850], start: "initial", end: { date: { min: 1850 } } }],
  }),
};
for (const [defect, make] of Object.entries(DEFECTS)) {
  Given(defect, (s) => {
    const d = make();
    s.buildEvents = d.events;
    if (d.periods) s.buildPeriods = d.periods;
    // without the defect the same build is clean
    if (!d.periods) expect(E.validate({ events: [fixture("clean"), fixture("clean2", { requires: { event: "clean" } })] }).errors).toEqual([]);
  });
}
Given("the age {string} lists the region {string}", (s, age: string, region: string) => {
  expect(E.ageDef(age).regions).toContain(region);
  s.age = age;
  s.region = region;
});
Given("only {int} event touches the Caribbean in that age", (s, n: number) => {
  expect(Object.values(E.tree.index).filter((e) => e.ages.includes(s.age) && e.regions.includes("caribbean")).length).toBe(n);
});
When("the coverage report is built", (s) => {
  s.gaps = E.coverageGaps(E.tree.index, E.tree.ages);
  if (s.slots) s.agency = E.agencyShare(s.slots.parts, s.slots.total);
});
Then("it flags {string}", (s, line: string) => {
  expect(s.gaps).toContain(line);
});
Given("the Caribbean holds {int} initiator, {int} beneficiary and {int} resister slots out of {int}", (s, i: number, b: number, r: number, total: number) => {
  s.slots = { parts: { initiator: i, beneficiary: b, resister: r }, total };
});
Then("its active share is {int} percent", (s, pct: number) => {
  expect(Math.round(s.agency.share * 100)).toBe(pct);
  expect(s.agency.flagged).toBe(false);
});
Given("a source has verified false", (s) => {
  s.sources = [
    { id: "a", verified: true },
    { id: "b", verified: false },
  ] satisfies E.Source[];
});
When("the sources are listed for review", (s) => {
  s.review = E.sourcesForReview(s.sources);
});
Then("the source is marked for a historian to check before release", (s) => {
  expect(s.review.map((x: E.Source) => x.id)).toEqual(["b"]);
});

// ---------------------------------------------------------------- decided questions (spec 13)

// D-EVT-1: the campaign drops post-1939 events and never starts later ages
Given(/^the event "([^"]+)" starts in history on (\S+)$/, (s, id: string, date: string) => {
  s.event = id;
  expect(E.historyStart(E.tree.index[id]!.date).startsWith(date)).toBe(true);
});
When("a campaign loads its events", (s) => {
  s.campaign = E.campaignEvents(E.tree.events);
  s.dropped = Object.entries(E.tree.index)
    .filter(([, e]) => E.outOfScope(e.date))
    .map(([k]) => k);
});
Then("the event {string} is dropped and never fires", (s, id: string) => {
  expect(s.dropped).toContain(id);
  expect(s.dropped).toHaveLength(59);
  expect(Object.keys(s.campaign)).not.toContain(id);
  const def = E.tree.events[id];
  if (def) {
    // even handed the full tree, the engine refuses it as out of scope
    const full = E.newState(E.emptyWorld(1950), { events: E.clone(E.tree.events) });
    expect(E.gate(full, full.events[id]!)).toBe("out of scope");
  }
});
Given("the start condition of the age {string} holds", (s, age: string) => {
  s.age = age;
  E.ageDef(age);
  s.holds = (() => true) as E.Holds;
});
Then("the age {string} does not start", (s, age: string) => {
  expect(w(s).ages).not.toContain(age);
  expect(st(s).log.some((l) => l.type === "AgeStarted" && l.age === age)).toBe(false);
});
Given("the end condition of the age {string} names the event {string}", (s, age: string, id: string) => {
  s.age = age;
  s.named = id;
  expect(JSON.stringify(E.ageDef(age).end)).toContain(`"${id}"`);
});
Then("that part of the end condition never holds", (s) => {
  expect(Object.keys(s.campaign)).not.toContain(s.named);
  const es = E.newState(E.emptyWorld(1939, 8), { events: s.campaign, ages: E.tree.ages, periods: E.tree.periods });
  E.place(es.world, "global").stats.global_tension = 90;
  expect(E.holds(E.ageDef(s.age).end, es.world)).toBe(false);
  s.es = es;
});
Then("the age {string} is cut at the end date", (s, age: string) => {
  w(s).ages = [age];
  E.processMonth(st(s), rng(s));
  expect(st(s).ended).toBe(true);
  expect(w(s).ages).toEqual([]);
  expect(st(s).log).toContainEqual(expect.objectContaining({ type: "AgeEnded", age, cut: true }));
});

// D-EVT-5: a rebels effect is a spark; its men come from the recruit pool
Given("the province {string} has a recruit pool of {int}", (s, id: string, n: number) => {
  E.place(w(s), id).stats.recruit_pool = n;
});
Then("a rising of {int} men starts in {string}", (s, men: number, id: string) => {
  expect(w(s).rebels.at(-1)).toMatchObject({ on: id, men });
});
Then("the recruit pool of {string} is {int}", (s, id: string, n: number) => {
  expect(E.place(w(s), id).stats.recruit_pool).toBe(n);
});
Given("a rising of the type {string} is under way in {string}", (s, type: string, who: string) => {
  expect(E.eventsConfig.enums.rebel_types).toContain(type);
  c(s, who).rebels = [type];
});

// D-EVT-11: rising tiers (EVT-068)
Given("{string} answered a revolution event whose option has the rising_won effect {string} and the rising_crushed effect {string}", (s, who: string, won: string, crushed: string) => {
  const eff = (t: string): E.Effect[] => {
    const [stat, v] = t.split(" ");
    return [{ on: "$realm", stat: { [stat!]: v } }];
  };
  const e = add(s, fixture("rev", { roles: { realm: { historical: [who], select: "fixed", as: ["initiator"] } } }));
  e.options[0]!.effects = { rising_won: eff(won), rising_crushed: eff(crushed) };
  w(s).history.push({ event: "rev", year: w(s).year, month: 1, roles: { realm: [who] }, option: e.options[0]!.id });
});
Given("the stability of {string} is {int}", (s, who: string, n: number) => {
  c(s, who).stats.stability = n;
});
When("the rising tagged with that event is {word}", (s, outcome: string) => {
  E.risingEnded(st(s), "rev", outcome === "won");
});

// D-EVT-4: the mapping
Given("an event applies {string} to the province {string}", (s, effect: string, prov: string) => {
  const [stat, change] = effect.split(" ");
  s.landing = E.landStat(stat!, change!);
  s.prov = prov;
});
When("the effect lands", (s) => {
  act(s);
});
const LANDINGS: Record<string, [string, number]> = {
  "two new buildings that fit the province": ["fitting_buildings", 2],
  "30 percent of its tiles are burned": ["burned_tiles_pct", 30],
  "one named grievance from the event": ["named_grievance", 1],
  "its castle goes one step up": ["castle_steps", 1],
  "its road goes one step up": ["road_steps", 1],
  "one factory": ["factories", 1],
  "a plague outbreak": ["plague_outbreak", 1],
};
Then(new RegExp(`^(${Object.keys(LANDINGS).join("|")})$`), (s, phrase: string) => {
  const [landsAs, amount] = LANDINGS[phrase]!;
  expect(s.landing).toEqual({ owner: "province", landsAs, amount });
});
Given("the country {string} has no notoriety of its own in the event tree", (s, who: string) => {
  c(s, who).stats = {};
});
When("an event applies {string} to {string}", (s, effect: string, who: string) => {
  const [stat, change] = effect.split(" ");
  s.stat = stat;
  s.applied = E.applyEffect({ on: who, stat: { [stat!]: change } }, w(s), { roles: {} });
});
Then(/^the change is handed to diplomacy as (a notorious deed|an oath broken)$/, (s, what: string) => {
  expect(s.applied[0]).toMatchObject({ type: "stat", values: { stat: s.stat, routed: "diplomacy" } });
  expect(E.landStat(s.stat, "+1")).toMatchObject({ owner: "diplomacy", landsAs: what === "a notorious deed" ? "notorious_deed" : "oath_broken" });
});
Then("the event tree stores no {string} for {string}", (s, stat: string, who: string) => {
  expect(c(s, who).stats[stat]).toBeUndefined();
});
When("an event tries to change {string}", (s, stat: string) => {
  s.errs = [];
  try {
    E.landStat(stat, "+10");
  } catch (e) {
    s.errs.push((e as Error).message);
  }
  try {
    E.applyEffect({ on: "A", stat: { [stat]: 10 } }, w(s), { roles: {} });
  } catch (e) {
    s.errs.push((e as Error).message);
  }
});
Then("the change is refused because events only read it", (s) => {
  expect(s.errs).toHaveLength(2);
  expect(s.errs[0]).toContain("events only read it");
});

// D-EVT-8: only an AI's decision lapses
function offeredLongAgo(s: Scenario, human: boolean): void {
  setYear(s, 1610, 3);
  const e = add(s, fixture("choice", { selection: { mode: "decision", mean_years: 5 } }));
  e.options = e.options.map((o) => ({ ...o, chooser: "$realm" }));
  c(s, "A").human = human;
  st(s).pending.push({ event: e.id, roles: { realm: ["A"] }, controller: "A", kind: "offered", at: E.now(w(s)) - 120 });
}
Given("a decision event was offered to an AI country 10 years ago and left unanswered", (s) => {
  offeredLongAgo(s, false);
});
Given("a decision event was offered to the player's country {int} years ago and is still waiting", (s, years: number) => {
  expect(years).toBe(E.balance.selection.decision_expiry_years);
  offeredLongAgo(s, true);
});
Given("the event is still eligible", (s) => {
  expect(E.eligible(st(s), ev(s)).length).toBe(1);
});
Then("the decision lapses", (s) => {
  expect(st(s).log).toContainEqual(expect.objectContaining({ type: "DecisionLapsed", event: s.event }));
  expect(st(s).pending.some((p) => p.event === s.event && p.kind === "offered")).toBe(false);
});
Then("the event re-enters the pool", (s) => {
  expect(E.selectionMode(st(s), ev(s))).toBe("pool");
});
Then("the decision is still waiting for the player", (s) => {
  expect(st(s).pending.some((p) => p.event === s.event && p.controller === "A")).toBe(true);
  expect(st(s).log.some((l) => l.type === "DecisionLapsed")).toBe(false);
});

// D-EVT-9: the new game's events choice
Given("the new game's events choice is {string}", (s, choice: string) => {
  s.choice = choice;
});
Given("a new game whose events choice is left alone", (s) => {
  s.choice = undefined;
});
When("the campaign's game rules are set", (s) => {
  s.mode = s.choice === undefined ? E.defaultRules().mode : E.rulesForChoice(s.choice);
});
Then("the alternate history mode is {string}", (s, mode: string) => {
  expect(s.mode).toBe(mode);
});

// EVT-044: nothing answers an event for the player
Given("an event waits for the player's answer", (s) => {
  setYear(s, 1600, 1);
  c(s, "France").human = true;
  for (const id of ["first_ask", "second_ask"]) {
    const e = add(s, fixture(id, { roles: { realm: { historical: ["France"], select: "fixed", as: ["initiator"] } } }));
    e.options = e.options.map((o) => ({ ...o, chooser: "$realm" }));
    E.fire(st(s), e, { realm: ["France"] }, rng(s));
    E.nextMonth(w(s));
  }
});
When("the player tries to end the turn", (s) => {
  s.blocked = E.unansweredFor(st(s), "France");
});
Then("the turn does not end", (s) => {
  expect(s.blocked).toBeDefined();
});
Then("the first unanswered event opens", (s) => {
  expect(s.blocked.event).toBe("first_ask");
});

// D-EVT-7: two to four options
Given("an event offers {int} options", (s, n: number) => {
  const options: E.OptionDef[] = Array.from({ length: n }, (_, i) => ({ id: `o${i}`, chooser: null, ...(i === 0 ? { historical: true } : {}), ai: { base: 10 }, effects: {} }));
  s.buildEvents = [fixture("many", { options })];
});

// EVT-019: how strongly the date binds
Given("an event with the availability mode {string}", (s, mode: string) => {
  add(s, fixture("dated", { availability: { earliest: 1550, latest: 1650, mode: mode as E.Availability["mode"], repeat: "one_time" }, selection: { mode: "pool", mean_years: 200 }, history: { date: 1600 } }));
  s.mode = mode;
});
When("it is eligible inside its window", (s) => {
  s.factors = [1550, 1595, 1600, 1610, 1649].map((y) => E.dateFactor(ev(s), y));
});
Then("it fires in the window if its trigger holds", (s) => {
  expect(s.factors).toEqual([1, 1, 1, 1, 1]);
  setYear(s, 1650, 6);
  c(s, "A");
  E.processMonth(st(s), rng(s));
  expect(w(s).history.some((h) => h.event === s.event)).toBe(true);
});
Then("its chance is weighted toward the historical date", (s) => {
  const [y1550, y1595, y1600, y1610, y1649] = s.factors as number[];
  expect(y1600).toBeGreaterThan(y1595!);
  expect(y1595).toBeGreaterThan(y1610!);
  expect([y1550, y1649]).toEqual([1, 1]);
});
Then("the date is only a guide", (s) => {
  expect(s.factors).toEqual([1, 1, 1, 1, 1]);
  expect(E.dateFactor(ev(s), 1650)).toBe(1);
});
Given("the event {string} has the availability mode {string} and the history year {int}", (s, id: string, mode: string, year: number) => {
  s.event = id;
  expect(E.eventDef(id).availability.mode).toBe(mode);
  expect(E.historyStart(E.eventDef(id).history!.date).slice(0, 4)).toBe(String(year));
});
When("its pool chance is weighed in {int}", (s, year: number) => {
  s.factor = E.dateFactor(E.eventDef(s.event), year);
});
Then("its date factor is {float}", (s, f: number) => {
  expect(s.factor).toBeCloseTo(f);
});

// EVT-006: resisters choose their own options
Given("the event {string} binds {string} as resister and initiator", (s, id: string, who: string) => {
  const e = ev(s, id);
  s.event = id;
  const role = Object.entries(e.roles).find(([, r]) => r.historical.includes(who));
  expect(role?.[1].as).toEqual(expect.arrayContaining(["resister", "initiator"]));
  s.role = role![0];
  s.who = who;
  // the kingdom answers for itself: its options carry its role as chooser
  e.options = e.options.map((o) => ({ ...o, chooser: `$${s.role}` }));
  c(s, who).human = true;
});
Then("the controller of {string} chooses the options whose chooser is that role", (s, who: string) => {
  expect(s.fired).toEqual({ queued: true });
  expect(st(s).pending.at(-1)).toMatchObject({ event: s.event, controller: who });
  for (const o of ev(s).options) expect(E.chooserOf(o, roles(s, ev(s)))).toBe(who);
});

// EVT-008: enslaved people are never a trade good
Given("a province with plantations in the Caribbean", (s) => {
  s.prov = "area:caribbean";
  E.place(w(s), "area:west_africa").groups = { west_africans: 10000 };
});
When("its trade good is set", (s) => {
  const unit = E.eventsConfig.statistics.province.trade_good.unit;
  s.goods = unit.slice(unit.indexOf("(") + 1, unit.indexOf(")")).split(",").map((x) => x.trim());
});
Then("enslaved people are not a trade good", (s) => {
  expect((s.goods as string[]).some((g) => /slav|people/.test(g))).toBe(false);
  // the raided source societies' land never gains production from it
  expect(E.modifierDef("slave_trade_raiding").changes.resource_output).toBeUndefined();
});
Then("enslavement is applied as forced population movement with costs on the source societies", (s) => {
  E.applyEffect({ move_population: { group: "west_africans", from: "area:west_africa", to: s.prov, amount: "10%" } }, w(s), { roles: {} });
  expect(E.place(w(s), "area:west_africa").groups!.west_africans).toBe(9000);
  const raid = E.modifierDef("slave_trade_raiding").changes;
  expect(Number(raid.devastation)).toBeGreaterThan(0);
  expect(String(raid.population)).toMatch(/^-/);
});

// EVT-009: disputed numbers lower confidence
Given("the death toll of {string} is disputed between {int} and {int} million", (s, id: string, a: number, b: number) => {
  s.event = id;
  expect(E.eventDef(id).history?.disputes).toContain(`${a}-${b} million`);
});
When("its history block is shown", (s) => {
  s.hist = E.eventDef(s.event).history;
});
Then("the dispute is shown with the confidence {string}", (s, conf: string) => {
  expect(s.hist.confidence).toBe(conf);
  expect(s.hist.disputes).toBeTruthy();
});
Then("the population loss in its effects is a design value", (s) => {
  const losses = E.eventDef(s.event).options.flatMap((o) => o.effects.immediate ?? []).filter((e) => typeof e.stat === "object" && "population" in (e.stat as object));
  expect(losses.length).toBeGreaterThan(0);
  // the loss is a fixed share in the effect, not read from the history block
  for (const l of losses) expect(String((l.stat as Record<string, unknown>).population)).toMatch(/^-\d+%$/);
});

// EVT-054: derived values are recomputed every tick
Given("the province {string} has its devastation raised by an event", (s, id: string) => {
  const key = `province:${id.toLowerCase()}`;
  s.prov = key;
  E.place(w(s), key).stats = { prosperity: 10, infrastructure: 1, control: 100, devastation: 0 };
  E.deriveAll(w(s));
  expect(E.place(w(s), key).stats.local_supply).toBe(12);
  E.applyEffect({ on: key, stat: { devastation: 30 } }, w(s), { roles: {} });
});
When("the next tick runs", (s) => {
  E.tick(st(s));
});
Then("its derived local supply and resource output are recomputed from the new devastation", (s) => {
  const p = E.place(w(s), s.prov).stats;
  expect(p.local_supply).toBeCloseTo(12 * 0.7);
  expect(p.resource_output).toBeCloseTo(10 * 0.7);
});
