import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as E from "@ph/engine";
import { inRegion } from "@ph/engine/domain/events";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("events");

/**
 * Founding events (EVT-077 to EVT-080) on a whole 1444 world: the tree's
 * create_country effect as the bridge lands it, on a copy of one world.
 */

const rules = loadDefaultRuleset();
let base: E.World | null = null;
type S = Scenario;

function world(s: S): E.World {
  if (!s.fdWorld) {
    base ??= E.createWorld(rules, 1);
    s.fdWorld = copyWorld(base);
    s.fdNews = [] as E.News[];
    s.fdSpares = E.spareSleepers(s.fdWorld).length;
  }
  return s.fdWorld;
}
function realm(s: S, name: string): number {
  const n = world(s).rules.nations.findIndex((d) => d.name === name);
  if (n < 0) throw new Error(`no realm called ${name}`);
  return n;
}
function province(s: S, name: string): number {
  const p = rules.provinces.findIndex((d) => d.name === name);
  if (p < 0) throw new Error(`no province called ${name}`);
  return p;
}
const found = (s: S, id: string, values: Record<string, unknown>) => {
  const w = world(s);
  s.fdBefore = Int16Array.from(w.provinceOwner);
  E.foundByEvent(w, id, { entity: id, ...values }, s.fdNews);
};

Given("a new campaign starts on 11 November 1444", (s) => expect(world(s).date).toMatchObject({ year: 1444, month: 11 }));
When(/^an event founds "([^"]+)" from "([^"]+)" and "([^"]+)"$/, (s, id: string, a: string, b: string) => found(s, id, { from: [a, b] }));
When(/^an event founds "([^"]+)" on "([^"]+)" from "([^"]+)"$/, (s, id: string, where: string, from: string) => found(s, id, { where, from: [from] }));
When(/^an event founds "([^"]+)" on "([^"]+)" as a subject of "([^"]+)"$/, (s, id: string, where: string, over: string) => found(s, id, { where, subject_of: over }));
When(/^an event founds "([^"]+)" on "([^"]+)"$/, (s, id: string, where: string) => found(s, id, { where }));

Then(/^"([^"]+)" holds every province "([^"]+)" and "([^"]+)" held$/, (s, name: string, a: string, b: string) => {
  const w = world(s);
  const n = realm(s, name);
  const from = [realm(s, a), realm(s, b)];
  let count = 0;
  s.fdBefore.forEach((o: number, p: number) => {
    if (!from.includes(o)) return;
    count++;
    expect(w.provinceOwner[p]).toBe(n);
  });
  expect(count).toBeGreaterThan(0);
});
Then("a dispatch reads {string}", (s, text: string) => expect((s.fdNews as E.News[]).some((x) => x.kind === "founded" && x.text === `${text}.`)).toBe(true));
Then("{string} holds {string}", (s, name: string, p: string) => expect(world(s).provinceOwner[province(s, p)]).toBe(realm(s, name)));
Then("{string} no longer holds {string}", (s, name: string, p: string) => expect(world(s).provinceOwner[province(s, p)]).not.toBe(realm(s, name)));
Then(/^"([^"]+)" and "([^"]+)" hold a truce$/, (s, a: string, b: string) => expect(E.relationState(world(s), realm(s, a), realm(s, b)).state).toBe("truce"));
Then("{string} is the overlord of {string}", (s, o: string, name: string) => expect(E.relationState(world(s), realm(s, name), realm(s, o)).state).toBe("subject"));
Then("a realm called {string} holds {string}", (s, name: string, p: string) => {
  const w = world(s);
  const n = realm(s, name);
  expect(w.rules.nations[n]!.spare).toBe(true);
  expect(w.provinceOwner[province(s, p)]).toBe(n);
  s.fdRealm = n;
});
Then("the event tree knows it as {string}", (s, id: string) => expect(E.treeView(world(s), s.fdRealm).id).toBe(id));
Then("no realm wakes", (s) => {
  const w = world(s);
  expect(E.spareSleepers(w).length).toBe(s.fdSpares);
  expect(Array.from(w.provinceOwner)).toEqual(Array.from(s.fdBefore));
});
Then(/^"([^"]+)" lies in "([^"]+)"(?: and in "([^"]+)")?$/, (s, name: string, a: string, b?: string) => {
  const region = E.treeView(world(s), realm(s, name)).region;
  expect(inRegion(region, a)).toBe(true);
  if (b) expect(inRegion(region, b)).toBe(true);
});
Then("the event tree knows {string} as {string}", (s, name: string, id: string) => expect(E.treeView(world(s), realm(s, name)).id).toBe(id));
