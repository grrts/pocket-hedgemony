import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { storeMonths, yearlyFood } from "../src/food.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const capitalOf = (w: World, id: string) => w.provinceIndex.get(rules.nations[w.nationIndex.get(id)!]!.capital)!;

function untilDate(w: World, year: number, month: number): void {
  while (w.date.year < year || (w.date.year === year && w.date.month < month)) processTurn(w, [], -1);
}

describe("a living realm: food", () => {
  it("starts every province with food until its first harvest and some to spare, and it grows more than it eats in a normal year", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "castile");
    // November 1444: ten months to the September harvest, and four more.
    expect(storeMonths(w, p)).toBeCloseTo(14, 3);
    expect(yearlyFood(w, p)).toBeGreaterThan(w.provincePopulation[p]!);
  });

  it("brings the harvest in each September in the north, and stores rise after it", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "castile");
    untilDate(w, 1445, 9);
    expect(w.provinceHarvest[p]).toBe(-1);
    const before = storeMonths(w, p);
    untilDate(w, 1445, 10);
    expect(w.provinceHarvest[p]).toBeGreaterThanOrEqual(0);
    expect(storeMonths(w, p)).toBeGreaterThan(before);
  });

  it("starves a province with no food, and some of its people flee to a neighbour", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "castile");
    const people = w.provincePopulation[p]!;
    w.provinceStore[p] = 0;
    // No relief from the realm's other provinces: they have nothing to spare either.
    for (let q = 0; q < w.provinceCount; q++) if (q !== p && w.provinceOwner[q] === w.provinceOwner[p]) w.provinceStore[q] = 0;
    // Nor from its castles: their stores are empty too.
    w.castleStore.fill(0);
    untilDate(w, 1444, 12);
    processTurn(w, [], -1);
    expect(w.provinceStarved[p]).toBeGreaterThan(0);
    expect(w.provincePopulation[p]).toBeLessThan(people);
  });

  it("keeps the world fed: over three years famines touch few provinces", () => {
    const w = createWorld(rules, 3, tiles);
    let starved = 0;
    let land = 0;
    const peopleAtStart = w.provincePopulation.reduce((a, b) => a + b, 0);
    for (let y = 0; y < 3; y++) {
      untilDate(w, 1445 + y, 12);
      for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p]) (land++, w.provinceStarved[p]! > 0 && starved++);
    }
    expect(starved / land).toBeLessThan(0.1);
    expect(w.provincePopulation.reduce((a, b) => a + b, 0)).toBeGreaterThan(peopleAtStart);
  }, 120000);
});
