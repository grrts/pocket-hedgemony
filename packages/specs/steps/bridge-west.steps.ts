import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as E from "@ph/engine";
import { gate } from "@ph/engine/domain/events";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { steps, type Scenario } from "../src/registry.ts";
import west from "../../rules/data/domain/events-bridge-west.json" with { type: "json" };
import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };

const { Given, When, Then } = steps("events");

/**
 * The West's bridge events (EVT-085 to EVT-089) on today's map, played from a
 * 1444 start or set back to the 1378 start day until the 1378 map is joined.
 */

const rules = loadDefaultRuleset();
let base: E.World | null = null;
type S = Scenario;
const OWN = Object.keys(west.events).filter((id) => !(id in campaign.events));

function at(s: S, year: number, month: number): E.World {
  base ??= E.createWorld(rules, 1);
  const w = copyWorld(base);
  w.date = { ...w.date, year, month };
  w.events = E.createGameEvents(w);
  s.bwWorld = w;
  s.bwNews = [] as E.News[];
  return w;
}
const world = (s: S): E.World => s.bwWorld;
const nation = (w: E.World, id: string) => w.nationIndex.get(id)!;
const history = (s: S) => world(s).events!.state.world.history;
function month(s: S): void {
  const w = world(s);
  w.date = w.date.month === 12 ? { ...w.date, year: w.date.year + 1, month: 1 } : { ...w.date, month: w.date.month + 1 };
  E.monthlyEvents(w, s.bwNews);
}

Given("a campaign starts on today's map in 1444", (s) => void at(s, 1444, 11));
Given("a campaign starts on today's map on 20 September 1378", (s) => void at(s, 1378, 9));

Then("the tree counts {string} as history with the choice {string}", (s, id: string, option: string) =>
  expect(history(s).find((h) => h.event === id)?.option).toBe(option),
);
Then("the tree counts {string} as history", (s, id: string) => expect(history(s).some((h) => h.event === id)).toBe(true));
Then("the tree counts no event of the West as history", (s) => expect(history(s).filter((h) => OWN.includes(h.event))).toEqual([]));
Then("no event of the West fires in the first year", (s) => {
  const before = history(s).length;
  for (let m = 0; m < 12; m++) month(s);
  expect(history(s).slice(before).filter((h) => OWN.includes(h.event))).toEqual([]);
});
Then("the period {string} is under way", (s, id: string) => expect(world(s).events!.state.world.periods).toContain(id));

When("the months play until five realms have chosen their Pope", (s) => {
  for (let m = 0; m < 120 && history(s).filter((h) => h.event === "schism_obedience").length < 5; m++) month(s);
});
Then("the tree has recorded {string}", (s, id: string) => expect(history(s).some((h) => h.event === id)).toBe(true));
Then("no realm chose its Pope twice", (s) => {
  const realms = history(s).filter((h) => h.event === "schism_obedience").map((h) => h.roles.realm![0]);
  expect(realms.length).toBeGreaterThanOrEqual(5);
  expect(new Set(realms).size).toBe(realms.length);
});

When("the ruler of {string} is a child with a regent", (s, id: string) => {
  const r = world(s).rulers[nation(world(s), id)]!;
  r.age = 11;
  r.regent = "the king's uncles";
});
Then("the tree sees the flag {string} on {string}", (s, flag: string, id: string) =>
  expect(E.eventConditionHolds(world(s), { flag: { who: id, id: flag } })).toBe(true),
);
Then("the tree sees {string} of the faith {string}", (s, id: string, faith: string) =>
  expect(E.eventConditionHolds(world(s), { religion: { who: id, is: faith } })).toBe(true),
);
Then("the tree sees the flag {string} on the Emperor's realm", (s, flag: string) =>
  expect(E.eventConditionHolds(world(s), { flag: { who: world(s).empire!.holder!, id: flag } })).toBe(true),
);

Given(/^it is 1420, "([^"]+)" is at war with "([^"]+)" and holds Normandy, and the princes feud$/, (s, a: string, b: string) => {
  const w = world(s);
  w.date = { ...w.date, year: 1420, month: 1 };
  expect(E.declareWar(w, nation(w, a), nation(w, b), [], { breakTruce: true })).toBeNull();
  for (const id of west.places["area:normandy"]) w.provinceOccupier[w.provinceIndex.get(id)!] = nation(w, a);
  E.applyEventEffects(w, [{ set_flag: { on: b, id: "princes_feud", years: 0 } }], []);
});
Given("the player plays {string}", (s, id: string) => {
  world(s).player = nation(world(s), id);
});
When("the Treaty of Troyes comes to the player and they choose {string}", (s, option: string) => {
  const w = world(s);
  for (let m = 0; m < 60 && !E.eventCards(w, w.player).some((c) => c.event === "treaty_of_troyes"); m++) month(s);
  expect(E.answerEvent(w, w.player, "treaty_of_troyes", option, s.bwNews)).toBeNull();
});
Then("{string} passes to {string}", (s, province: string, id: string) => {
  const w = world(s);
  const p = rules.provinces.findIndex((d) => d.name === province);
  expect(w.provinceOwner[p]).toBe(nation(w, id));
});

Then("{string} waits for {string} or {string}", (s, id: string, a: string, b: string) => {
  const st = world(s).events!.state;
  const ev = st.events[id]!;
  expect(JSON.stringify(ev.requires)).toContain(a);
  expect(JSON.stringify(ev.requires)).toContain(b);
  st.world.year = 1430;
  expect(gate(st, ev)).toBe("requires");
});
