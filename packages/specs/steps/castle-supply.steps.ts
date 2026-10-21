import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as G from "@ph/engine";
import { besiegerEat, castleCutAt, supplyNotes } from "../../engine/src/castleSupply.ts";
import { armyRations } from "../../engine/src/recruit.ts";
import { monthlyRations } from "../../engine/src/march.ts";
import { campaigning } from "../../engine/src/turn.ts";
import { workEffect } from "../../engine/src/works.ts";
import { atWar, runOccupation, type News } from "../../engine/src/war.ts";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("warfare");

/**
 * Castles starve besiegers (WAR-263 to WAR-269, Leroy 19 Oct), played on a
 * whole 1444 campaign: Castile at war with Portugal, every Portuguese castle
 * pulled down and its capital held by Castile unless a scenario besieges it, so
 * only the castles a scenario names count.
 */

const RULES = loadDefaultRuleset();
const CASTLE = G.WORKS.indexOf("castle");
type S = Scenario;

const nation = (w: G.World, id: string) => w.nationIndex.get(id.toLowerCase())!;
const capital = (w: G.World, n: number) => w.provinceIndex.get(RULES.nations[n]!.capital)!;
const setCastle = (w: G.World, p: number, step: number) => (w.provinceWorks[p * G.WORKS.length + CASTLE] = step);
function neighbours(w: G.World, p: number): number[] {
  const out: number[] = [];
  for (let k = w.adjStart[p]!; k < w.adjStart[p + 1]!; k++) out.push(w.adjList[k]!);
  return out;
}
/** The campaign the scenario's first Given made. */
function world(s: S): G.World {
  if (!s.cw) throw new Error("no campaign: the scenario starts with Castile at war with Portugal");
  return s.cw;
}

Given('the country "Castile" is at war with the country "Portugal"', (s) => {
  const w = G.createWorld(RULES, 7);
  const me = nation(w, "castile");
  const foe = nation(w, "portugal");
  expect(G.applyNow(w, { type: "declareWar", target: foe }, me).rejectedOrders).toEqual([]);
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === foe) setCastle(w, p, 0);
  w.provinceOccupier[capital(w, foe)] = me;
  s.cw = w;
  s.me = me;
  s.foe = foe;
});

Given("a Castilian army forages in a Portuguese province with food", (s) => {
  const w = world(s);
  const cap = capital(w, s.foe);
  const own = (q: number) => q !== cap && w.provinceOwner[q] === s.foe && !w.provinceWater[q];
  s.where = [...Array(w.provinceCount).keys()].find((q) => own(q) && w.provinceStore[q]! > 0 && neighbours(w, q).some(own))!;
  s.next = neighbours(w, s.where).find(own)!;
  s.army = G.spawnArmy(w, s.me, s.where, 5000);
  s.open = G.refillHere(w, s.army);
  expect(s.open).toBeGreaterThan(0);
});

Given("a Portuguese army and an army of a realm at peace with Portugal stand in that province", (s) => {
  const w = world(s);
  const other = [...Array(w.nationCount).keys()].find((k) => k !== s.foe && !atWar(w, k, s.foe))!;
  s.others = [G.spawnArmy(w, s.foe, s.where, 5000), G.spawnArmy(w, other, s.where, 5000)];
  s.othersOpen = s.others.map((a: number) => G.refillHere(w, a));
});

When(/^Portugal holds a castle of step (\d) in (that|the neighbouring Portuguese) province$/, (s, step: string, which: string) => {
  setCastle(world(s), which === "that" ? s.where : s.next, Number(step));
});

When("Castile occupies that province", (s) => {
  world(s).provinceOccupier[s.where] = s.me;
});

Then(/^the Castilian foragers find ([\d.]+) % less there$/, (s, cut: string) => {
  const w = world(s);
  expect(castleCutAt(w, s.where).share).toBeCloseTo(Number(cut) / 100, 9);
  expect(G.refillHere(w, s.army)).toBeCloseTo(s.open * (1 - Number(cut) / 100), 6);
});

Then("the Portuguese army and the army at peace find as much as without the castle", (s) => {
  const w = world(s);
  expect(s.others.map((a: number) => G.refillHere(w, a))).toEqual(s.othersOpen);
});

Given("a Castilian army besieges a Portuguese stone castle", (s) => {
  const w = world(s);
  // Portugal's capital: its walls are a stone castle, back in Portugal's hands for this siege.
  const p = capital(w, s.foe);
  w.provinceOccupier[p] = -1;
  for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === s.foe) w.armies.alive[i] = 0;
  w.provinceGarrison[p] = 500;
  s.besieger = G.spawnArmy(w, s.me, p, 10000);
  const news: News[] = [];
  runOccupation(w, false, news);
  expect(w.sieges.has(p)).toBe(true);
  s.besieged = p;
});

Then(/^the besiegers eat ([\d.]+) times their rations$/, (s, x: string) => {
  expect(besiegerEat(world(s), s.besieger)).toBeCloseTo(Number(x), 9);
});

Then(/^a Castilian army of the same size on open Portuguese land eats ([\d.]+) times its rations$/, (s, x: string) => {
  const w = world(s);
  const open = [...Array(w.provinceCount).keys()].find((q) => w.provinceOwner[q] === s.foe && q !== s.besieged && !w.provinceWater[q])!;
  const army = G.spawnArmy(w, s.me, open, 10000);
  expect(besiegerEat(w, army)).toBeCloseTo(Number(x), 9);
  expect(armyRations(w, s.besieger)).toBeCloseTo(armyRations(w, army) * besiegerEat(w, s.besieger), 6);
});

When("the player opens the army's commander screen", (s) => {
  const w = world(s);
  w.player = s.me;
  s.notes = supplyNotes(w, s.besieger, G.forageCut(w, s.besieger));
});

Then(/^its food line says "([^"]+)"$/, (s, text: string) => {
  expect(s.notes).toContain(text);
});

Then(/^it says "([^"]+)"$/, (s, text: string) => {
  expect(s.notes).toContain(text);
});

Then("its months of food count the extra eating", (s) => {
  const w = world(s);
  const a = w.armies;
  const plain = monthlyRations(RULES.defines.march, { men: a.men[s.besieger]!, horse: a.horse[s.besieger]!, logistics: 0, campaigning: campaigning(w, s.besieger) });
  expect(armyRations(w, s.besieger)).toBeCloseTo(plain * besiegerEat(w, s.besieger), 6);
});

Given('the player\'s country "Portugal" can build a stone castle in a province', (s) => {
  s.pw = G.createWorld(RULES, 7);
  s.pw.player = nation(s.pw, "portugal");
});

When("the player opens that province's build sheet", (s) => {
  s.row = workEffect(s.pw, CASTLE, 2);
});

Then(/^the castle row says enemy foragers find (\d+) % less there and (\d+) % less in the land it reaches$/, (s, here: string, reach: string) => {
  expect(s.row).toContain(`enemy foragers find ${here} % less here and ${reach} % less in the land it reaches`);
});

Then(/^it says besiegers eat (\d+) % more$/, (s, more: string) => {
  expect(s.row).toContain(`besiegers eat ${more} % more`);
});
