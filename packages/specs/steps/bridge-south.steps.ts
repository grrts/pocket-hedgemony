import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as G from "@ph/engine";
import * as E from "@ph/engine/domain/events";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { createGameEvents } from "../../engine/src/events.ts";
import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };
import south from "../../rules/data/domain/events-bridge-south.json" with { type: "json" };
import places from "../../rules/data/domain/events-places.json" with { type: "json" };
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("events");

/**
 * The bridge events of 1378 to 1444 for Asia, Africa and the Americas
 * (EVT-095 to EVT-099): the data checked as a whole, and a few chains run on
 * the event tree's own world, with the campaign's events and these merged as
 * a 1378 start merges them.
 */

type S = Scenario;
const bridge = south as unknown as { events: Record<string, E.EventDef>; localization: Record<string, string> };
const tree = campaign as unknown as { events: Record<string, E.EventDef>; ages: E.AgeDef[]; periods: E.PeriodDef[]; localization: Record<string, string> };
const merged = (): Record<string, E.EventDef> => E.clone({ ...tree.events, ...bridge.events });

function st(s: S): E.EventState {
  return (s.bsState ??= E.newState(E.emptyWorld(1378), { events: merged(), ages: tree.ages, periods: tree.periods }));
}
/** A realm that stands, with the tree's starting statistics and a steady court. */
function stand(s: S, id: string): E.CountryState {
  const c = E.country(st(s).world, id);
  c.exists = true;
  c.stats = { ...places.start.country, stability: 1, legitimacy: 60, army_strength: 20, ...c.stats };
  return c;
}
/** The roles an event binds to its historical realms. */
const historicalRoles = (ev: E.EventDef): Record<string, string[]> => Object.fromEntries(Object.entries(ev.roles).map(([k, r]) => [k, [...r.historical]]));

Given("the southern bridge events", (s) => void st(s));
Given("the southern bridge events in {int}", (s, year: number) => {
  st(s).world.year = year;
});
Given("{string} stands", (s, id: string) => void stand(s, id));
Given("{string} stands with {string} {int} and borders {string}", (s, id: string, stat: string, value: number, other: string) => {
  const c = stand(s, id);
  c.stats[stat] = value;
  c.borders = [...(c.borders ?? []), other];
  stand(s, other);
});
Given("{string} is a tributary of {string}", (s, sub: string, over: string) => {
  stand(s, sub).relations = [{ other: over, type: "subject" }];
  stand(s, over).relations = [{ other: sub, type: "overlord" }];
});
When("{string} ends with the option {string}", (s, id: string, option: string) => {
  const ev = st(s).events[id]!;
  E.answer(st(s), ev, historicalRoles(ev), option);
});
Then("the bridge event {string} can fire", (s, id: string) => {
  expect(E.eligible(st(s), st(s).events[id]!).length).toBeGreaterThan(0);
});
Then("the bridge event {string} cannot fire", (s, id: string) => {
  expect(E.eligible(st(s), st(s).events[id]!)).toEqual([]);
});
Then("{string} now stands", (s, id: string) => {
  expect(E.exists(st(s).world, id)).toBe(true);
});

Then("every southern bridge event passes the event tree's build checks", () => {
  const all = Object.values(merged());
  const ids = new Set(Object.keys(bridge.events));
  const report = E.validate({ events: all, ages: tree.ages, periods: tree.periods.map((p) => ({ ...p, window: p.window })) });
  const ours = report.errors.filter((e) => [...ids].some((id) => e.includes(`event ${id}`) || e.includes(` ${id} `)));
  expect(ours).toEqual([]);
});
Then("every option of every southern bridge event applies without error", () => {
  for (const ev of Object.values(bridge.events)) {
    for (const o of ev.options) {
      const state = E.newState(E.emptyWorld(1400), { events: merged(), ages: tree.ages, periods: tree.periods });
      const roles = historicalRoles(ev);
      for (const ids of Object.values(roles)) for (const id of ids) Object.assign(E.country(state.world, id), { exists: true, stats: { ...places.start.country, stability: 1, legitimacy: 60 } });
      expect(() => E.answer(state, state.events[ev.id]!, roles, o.id), `${ev.id}.${o.id}`).not.toThrow();
    }
  }
});
Then("no southern bridge event is mandatory", () => {
  for (const ev of Object.values(bridge.events)) expect(ev.availability.mode, ev.id).not.toBe("mandatory");
});
Then("every southern bridge event belongs to the Age of Schism and Conquerors", () => {
  for (const ev of Object.values(bridge.events)) expect(ev.ages, ev.id).toContain("age_of_schism_and_conquerors");
});
Then("every southern bridge event has a name, a summary and a name for each option", () => {
  const loc = { ...tree.localization, ...bridge.localization };
  for (const ev of Object.values(bridge.events)) {
    expect(loc[`event.${ev.id}.name`], ev.id).toBeTruthy();
    expect(loc[`event.${ev.id}.desc`], ev.id).toBeTruthy();
    for (const o of ev.options) expect(loc[`event.${ev.id}.option.${o.id}`], `${ev.id}.${o.id}`).toBeTruthy();
  }
});
Then("the event {string} opens in {int} and requires the event {string}", (s, id: string, year: number, needs: string) => {
  const ev = st(s).events[id]!;
  expect(ev.availability.earliest).toBe(year);
  expect(JSON.stringify(ev.requires)).toContain(`"${needs}"`);
});

// ---------------------------------------------------------------- the game's own load (EVT-095)

const rules = loadDefaultRuleset();
let base: G.World | null = null;
Given("a game whose campaign starts in {int}", (s, year: number) => {
  base ??= G.createWorld(rules, 1);
  const w = copyWorld(base);
  w.date = { ...w.date, year };
  s.bsGame = createGameEvents(w);
});
Then("{string} has already happened with the option {string}", (s, id: string, option: string) => {
  expect(s.bsGame.state.world.history.find((h: E.Occurrence) => h.event === id)?.option).toBe(option);
});
Then("{string} has not happened yet", (s, id: string) => {
  expect(s.bsGame.state.world.history.some((h: E.Occurrence) => h.event === id)).toBe(false);
});
Then("its events include {string}", (s, id: string) => {
  expect(s.bsGame.state.events[id]).toBeDefined();
});
Then("its event {string} opens in {int}", (s, id: string, year: number) => {
  expect(s.bsGame.state.events[id].availability.earliest).toBe(year);
});
