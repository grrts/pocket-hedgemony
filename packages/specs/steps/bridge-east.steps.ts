import { expect } from "vitest";
import { steps, type Scenario, type Table } from "../src/registry.ts";
import * as E from "@ph/engine/domain/events";
import east from "../../rules/data/domain/events-bridge-east.json" with { type: "json" };
import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };
import mapped from "../../rules/data/domain/events-places.json" with { type: "json" };

// The East's bridge events of 1378 to 1444 (EVT-090 … EVT-094, D-EVT-21).

const { Given, When, Then } = steps("events");

const events = east.events as unknown as Record<string, E.EventDef>;
const redated = east.redated as Record<string, { earliest: number }>;
const campaignEvents = campaign.events as unknown as Record<string, E.EventDef>;
/** The East's own events, without the campaign events it copies with an earlier year. */
const own = (): E.EventDef[] => Object.values(events).filter((e) => !(e.id in redated));

/** The scenario's event state over the East's events. */
function st(s: Scenario): E.EventState {
  return (s.eastState ??= E.newState(E.emptyWorld(1378, 9), { events: E.clone(events), ages: campaign.ages as unknown as E.AgeDef[], periods: campaign.periods as unknown as E.PeriodDef[] }));
}
const realm = (s: Scenario, id: string): E.CountryState => {
  const c = E.country(st(s).world, id);
  c.borders ??= [];
  c.enemies ??= [];
  return c;
};

Given("the East bridge events", (s: Scenario) => {
  expect(own().length).toBeGreaterThan(30);
  s.east = true;
});

Then("every East bridge event belongs to the age {string}", (_s: Scenario, age: string) => {
  for (const e of Object.values(events)) expect(e.ages, e.id).toContain(age);
});

Then("no East bridge event is mandatory", () => {
  for (const e of Object.values(events)) expect(e.availability.mode, e.id).not.toBe("mandatory");
});

Then("most East bridge events are approximate", () => {
  const approximate = own().filter((e) => e.availability.mode === "approximate").length;
  expect(approximate / own().length).toBeGreaterThan(0.5);
});

Then("the East bridge events include", (_s: Scenario, table: Table) => {
  for (const [id] of table) expect(events[id!], id).toBeDefined();
});

When("the East bridge events are built with the campaign's events", (s: Scenario) => {
  const merged = { ...campaignEvents, ...events };
  s.report = E.validate({ events: Object.values(merged), ages: campaign.ages as unknown as E.AgeDef[], periods: campaign.periods as unknown as E.PeriodDef[] });
});

Then("the build reports no error for an East bridge event", (s: Scenario) => {
  const ids = Object.keys(events);
  const mine = (s.report as E.BuildReport).errors.filter((err) => ids.some((id) => err.includes(`event ${id}:`) || err.includes(`event ${id}.`) || err.includes(` ${id} `)));
  expect(mine).toEqual([]);
});

Then("the East bridge events name no map id that the tree knows by another id", () => {
  const renamed = Object.keys(mapped.aliases);
  const text = JSON.stringify(own());
  for (const id of renamed) expect(text.includes(`"${id}"`), id).toBe(false);
});

Then("every place an East bridge event names is mapped to provinces", () => {
  const known = new Set([...Object.keys(mapped.places), ...Object.keys(east.places)]);
  const named = new Set(JSON.stringify(own()).match(/"(province|area):[a-z_]+"/g)?.map((m) => m.slice(1, -1)) ?? []);
  for (const p of named) expect(known.has(p), p).toBe(true);
  for (const [p, ids] of Object.entries(east.places)) expect(ids.length, p).toBeGreaterThan(0);
});

Then("the East copy of {string} opens in {int}", (_s: Scenario, id: string, year: number) => {
  expect(events[id], id).toBeDefined();
  expect(campaignEvents[id]!.availability.earliest).toBe(1444);
  expect(events[id]!.availability.earliest).toBe(year);
  expect(redated[id]!.earliest).toBe(year);
  _s.copied = id;
});

Then("apart from its age and its earliest year it is the campaign's event", (s: Scenario) => {
  const strip = (e: E.EventDef) => ({ ...e, ages: e.ages.filter((a) => a !== "age_of_schism_and_conquerors"), availability: { ...e.availability, earliest: 0 } });
  expect(strip(events[s.copied]!)).toEqual(strip(campaignEvents[s.copied]!));
});

Given("the year is {int} in the East", (s: Scenario, year: number) => {
  st(s).world.year = year;
});

Given("{string} borders {string} in the East", (s: Scenario, a: string, b: string) => {
  realm(s, a).borders!.push(b);
  realm(s, b).borders!.push(a);
});

When("{string} and {string} go to war in the East", (s: Scenario, a: string, b: string) => {
  realm(s, a).enemies!.push(b);
  realm(s, b).enemies!.push(a);
});

When("{string} holds {string} in the East", (s: Scenario, who: string, where: string) => {
  E.place(st(s).world, where).owner = who;
});

Then("the East event {string} cannot fire", (s: Scenario, id: string) => {
  expect(E.eligible(st(s), st(s).events[id]!)).toEqual([]);
});

Then("the East event {string} can fire for {string} as {string}", (s: Scenario, id: string, who: string, role: string) => {
  const ways = E.eligible(st(s), st(s).events[id]!);
  expect(ways.some((r) => (r[role] ?? []).includes(who)), JSON.stringify(ways)).toBe(true);
});

Then("every East bridge event has a name and a summary in the localization", () => {
  const loc = east.localization as Record<string, string>;
  for (const e of own()) {
    expect(loc[`event.${e.id}.name`], e.id).toBeTruthy();
    expect(loc[`event.${e.id}.desc`], e.id).toBeTruthy();
  }
});

Then("every option of an East bridge event has a label", () => {
  const loc = east.localization as Record<string, string>;
  for (const e of own()) for (const o of e.options) expect(loc[`event.${e.id}.option.${o.id}`], `${e.id}.${o.id}`).toBeTruthy();
});

Then("every East bridge event has two or three options, one of them historical", () => {
  for (const e of own()) {
    expect(e.options.length, e.id).toBeGreaterThanOrEqual(2);
    expect(e.options.length, e.id).toBeLessThanOrEqual(3);
    expect(e.options.filter((o) => o.historical).length, e.id).toBe(1);
  }
});
