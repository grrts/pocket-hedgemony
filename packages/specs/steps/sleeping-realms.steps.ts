import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as E from "@ph/engine";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { worldChunks, restoreWorld } from "@ph/engine/domain/saves";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("scenario-setup");

/**
 * Sleeping realms (SETUP-080 to SETUP-092, X-24) on a whole 1444 world: a
 * copy of one built once, so each scenario wakes realms on its own map.
 */

const rules = loadDefaultRuleset();
let base: E.World | null = null;
type S = Scenario;

function world(s: S): E.World {
  if (!s.srWorld) {
    base ??= E.createWorld(rules, 1);
    s.srWorld = copyWorld(base);
    s.srNews = [] as E.News[];
  }
  return s.srWorld;
}
const news = (s: S): E.News[] => s.srNews;

/** A realm by the name the world calls it now (a woken spare takes its own). */
function realm(s: S, name: string): number {
  const w = world(s);
  const n = w.rules.nations.findIndex((d) => d.name === name);
  if (n < 0) throw new Error(`no realm called ${name}`);
  return n;
}
function province(s: S, name: string): number {
  const p = world(s).rules.provinces.findIndex((d) => d.name === name);
  if (p < 0) throw new Error(`no province called ${name}`);
  return p;
}
const landOf = (w: E.World, n: number) => [...w.provinceOwner.keys()].filter((p) => w.provinceOwner[p] === n && !w.provinceWater[p]);
const spares = (w: E.World) => E.spareSleepers(w).length;
function wake(s: S, name: string, how: E.Waking): void {
  s.srWoke = E.wakeRealm(world(s), realm(s, name), how, news(s));
}

Given("a new campaign starts on 11 November 1444", (s) => {
  expect(world(s).date).toMatchObject({ year: 1444, month: 11, day: 11 });
});
Given("the player rules {string}", (s, name: string) => E.setPlayer(world(s), realm(s, name)));

Then("{string} is a sleeping realm", (s, name: string) => {
  const w = world(s);
  const n = realm(s, name);
  expect(w.nationAsleep[n]).toBe(1);
  // Asleep is gone to every system, with no "is no more" (SETUP-082).
  expect(w.nationGone[n]).toBe(1);
  expect(news(s).some((x) => x.kind === "destroyed" && x.nations.includes(n))).toBe(false);
});
Then("it holds no land, armies or relations", (s) => {
  const w = world(s);
  const n = realm(s, "Spain");
  expect(landOf(w, n)).toEqual([]);
  for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i]) expect(w.armies.owner[i]).not.toBe(n);
  expect(w.diplomacy.graph.relations.filter((r) => r.source === "spain" || r.target === "spain")).toEqual([]);
  expect(w.nationTreasury[n]).toBe(0);
});
Then("it is not in the realm picker", (s) => {
  // The picker lists the realms on the map: a sleeper is marked asleep in the build's list (SETUP-082).
  const d = rules.nations.find((x) => x.id === "spain")!;
  expect(d.asleep).toBe(true);
  expect(rules.nations.filter((x) => !x.asleep).some((x) => x.id === "spain")).toBe(false);
});
Then("there are {int} spare sleeping realms", (s, count: number) => expect(spares(world(s))).toBe(count));

When("{string} wakes on the province {string}", (s, name: string, p: string) => wake(s, name, { provinces: [province(s, p)] }));
When("{string} wakes on its home land", (s, name: string) => wake(s, name, {}));
When("{string} wakes on no province", (s, name: string) => wake(s, name, { provinces: [] }));
When(/^"([^"]+)" wakes formed from "([^"]+)" and "([^"]+)"$/, (s, name: string, a: string, b: string) => {
  const w = world(s);
  s.srFrom = [realm(s, a), realm(s, b)].map((n) => ({ n, land: landOf(w, n) }));
  wake(s, name, { from: s.srFrom.map((f: { n: number }) => f.n) });
});
When("{string} breaks away from {string} on its home land", (s, name: string, from: string) => {
  const w = world(s);
  s.srBefore = landOf(w, realm(s, from));
  wake(s, name, { breakFrom: realm(s, from) });
});
When("{string} wakes on its home land as a subject of {string}", (s, name: string, o: string) => wake(s, name, { subjectOf: realm(s, o) }));
When("a spare sleeper wakes as {string} on the province {string}", (s, name: string, p: string) => {
  const w = world(s);
  const n = E.spareSleepers(w)[0]!;
  s.srWoke = E.wakeRealm(w, n, { provinces: [province(s, p)], name }, news(s));
});
Given("{string} is gone", (s, name: string) => {
  const w = world(s);
  const n = realm(s, name);
  const to = realm(s, "France");
  for (const p of landOf(w, n)) E.cedeProvince(w, p, to, news(s));
  expect(w.nationGone[n]).toBe(1);
});
When("the game is saved and loaded", (s) => {
  s.srWorld = restoreWorld(new Map(worldChunks(world(s), { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}).world;
});

Then("{string} holds {string} as its capital", (s, name: string, p: string) => {
  const w = world(s);
  const n = realm(s, name);
  expect(w.provinceOwner[province(s, p)]).toBe(n);
  expect(w.rules.nations[n]!.capital).toBe(w.provinceIds[province(s, p)]);
});
Then("{string} holds {string}", (s, name: string, p: string) => expect(world(s).provinceOwner[province(s, p)]).toBe(realm(s, name)));
Then("a realm called {string} holds {string}", (s, name: string, p: string) => {
  const w = world(s);
  const n = realm(s, name);
  expect(w.rules.nations[n]!.spare).toBe(true);
  expect(w.provinceOwner[province(s, p)]).toBe(n);
  // A woken spare's name never reaches the build's list.
  expect(rules.nations[n]!.name).not.toBe(name);
});
Then("it has a ruler, a form of government, gold and levies", (s) => {
  const w = world(s);
  const n = realm(s, "Dutch Republic");
  expect(w.rulers[n]!.name).not.toBe("");
  expect(E.formOf(w, n)).toBeTruthy();
  expect(w.nationTreasury[n]).toBeGreaterThan(0);
  expect(w.nationMaxLevies[n]).toBeGreaterThan(0);
  expect(w.nationAsleep[n]).toBe(0);
  expect(w.nationGone[n]).toBe(0);
});
Then("it stands at neutral with every realm", (s) => {
  const w = world(s);
  const ties = w.diplomacy.graph.relations.filter((r) => r.source === "dutch_republic" || r.target === "dutch_republic");
  expect(ties.filter((r) => r.type !== "border")).toEqual([]);
});
Then(/^every province of "([^"]+)" and "([^"]+)" belongs to "([^"]+)"$/, (s, _a: string, _b: string, name: string) => {
  const w = world(s);
  const n = realm(s, name);
  for (const f of s.srFrom as { land: number[] }[]) for (const p of f.land) expect(w.provinceOwner[p]).toBe(n);
});
Then(/^"([^"]+)" and "([^"]+)" are gone$/, (s, a: string, b: string) => {
  const w = world(s);
  for (const n of [realm(s, a), realm(s, b)]) {
    expect(w.nationGone[n]).toBe(1);
    expect(landOf(w, n)).toEqual([]);
  }
});
Then("the player plays {string}", (s, name: string) => expect(world(s).player).toBe(realm(s, name)));
Then("a dispatch says {string}", (s, text: string) => expect(news(s).some((x) => x.text === `${text}.`)).toBe(true));
Then("{string} keeps every other province", (s, name: string) => {
  const w = world(s);
  const n = realm(s, name);
  const t = realm(s, "Transylvania");
  for (const p of s.srBefore as number[]) expect([n, t]).toContain(w.provinceOwner[p]);
  expect(landOf(w, n).length).toBeGreaterThan(0);
  expect(landOf(w, t).length).toBeGreaterThan(0);
});
Then(/^"([^"]+)" and "([^"]+)" hold a truce$/, (s, a: string, b: string) => expect(E.relationState(world(s), realm(s, a), realm(s, b)).state).toBe("truce"));
Then("{string} is the overlord of {string}", (s, o: string, name: string) => expect(E.relationState(world(s), realm(s, name), realm(s, o)).state).toBe("subject"));
Then("{string} holds land again", (s, name: string) => {
  const w = world(s);
  const n = realm(s, name);
  expect(landOf(w, n).length).toBeGreaterThan(0);
  expect(w.nationGone[n]).toBe(0);
});
Then("a major dispatch reads {string}", (s, text: string) => {
  const x = news(s).find((y) => y.kind === "founded" && y.text === `${text}.`);
  expect(x?.major).toBe(true);
  s.srCard = x;
});
Then("it centres the map on {string}", (s, name: string) => {
  const w = world(s);
  expect(s.srCard.province).toBe(w.provinceIndex.get(w.rules.nations[realm(s, name)]!.capital));
});
