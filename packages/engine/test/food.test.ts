import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, spawnArmy, type World } from "../src/index.ts";
import { climateOf, harvestMonthsOf, storeMonths, yearlyFood } from "../src/food.ts";
import { monthlyRations } from "../src/march.ts";
import { rollBaseHarvest, weatherFor } from "../src/domain/realm/index.ts";
import { Rng } from "../src/rng.ts";
import { CLASS_COUNT, CLASS_NAMES } from "../src/living.ts";

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
    // A month without food is a third of a season: a third of the unfed are lost, the rest go hungry.
    expect(w.provincePopulation[p]).toBeGreaterThan(people * 0.6);
  });

  it("lets a year's famine take at most a fifth of a province, however long its food fails (feedback 93)", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "castile");
    untilDate(w, 1445, 1);
    const people = w.provincePopulation[p]!;
    const realm = [...Array(w.provinceCount).keys()].filter((q) => w.provinceOwner[q] === w.provinceOwner[p]);
    let worst = 0;
    while (w.date.year < 1447) {
      // Two years with nothing in the store, the realm's or the castles': the harvests fail and nobody can help.
      for (const q of realm) w.provinceStore[q] = 0;
      w.castleStore.fill(0);
      processTurn(w, [], -1);
      worst = Math.max(worst, w.provinceStarved[p]! / (w.provincePopulation[p]! + w.provinceStarved[p]!));
    }
    expect(worst).toBeGreaterThan(0.1);
    expect(worst).toBeLessThanOrEqual(0.2001);
    // Two hard years together cost less than half the province, the refugees included.
    expect(w.provincePopulation[p]).toBeGreaterThan(people * 0.5);
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

  it("rolls each province's own harvest: mostly normal, sometimes poor, good or bumper (feedback 82)", () => {
    const rng = new Rng(5);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const h = rollBaseHarvest(rng);
      counts[h] = (counts[h] ?? 0) + 1;
    }
    expect(counts.poor! / 20000).toBeCloseTo(0.1, 1);
    expect(counts.normal! / 20000).toBeCloseTo(0.7, 1);
    expect(counts.bumper! / 20000).toBeGreaterThan(0.03);
    expect(counts.failed).toBeUndefined();
  });

  it("reads the region's weather by climate: drylands see drought more often (feedback 82)", () => {
    const bad = (c: "temperate" | "dry" | "monsoon") => Array.from({ length: 1000 }, (_, i) => weatherFor(i / 1000, c)).filter((x) => x === "bad").length;
    expect(bad("temperate")).toBe(167);
    expect(bad("dry")).toBe(250);
    expect(bad("monsoon")).toBe(200);
    // One roll for the region: if the temperate land suffers, the dry land does too.
    expect(weatherFor(0.1, "temperate")).toBe("bad");
    expect(weatherFor(0.1, "dry")).toBe("bad");
  });

  it("brings no harvest in the tundra, two on rice land whose people know wet-rice terracing, one elsewhere (feedback 82)", () => {
    const w = createWorld(rules, 1, tiles);
    const land = [...Array(w.provinceCount).keys()].filter((p) => !w.provinceWater[p]);
    const tundra = land.find((p) => climateOf(w, p) === "tundra")!;
    expect(harvestMonthsOf(w, tundra)).toEqual([]);
    // Its farmers grow nothing: the year's food is the same without them.
    const fed = yearlyFood(w, tundra);
    w.provinceClasses[tundra * CLASS_COUNT + CLASS_NAMES.indexOf("farmers")] = 0;
    expect(yearlyFood(w, tundra)).toBeCloseTo(fed, 6);
    expect(harvestMonthsOf(w, capitalOf(w, "castile"))).toEqual([9]);
    expect(land.some((p) => harvestMonthsOf(w, p).length === 2)).toBe(true);
    expect(land.filter((p) => harvestMonthsOf(w, p).length === 2).every((p) => climateOf(w, p) === "monsoon")).toBe(true);
  });

  it("feeds soldiers on campaign double and a horse like three men (feedback 83)", () => {
    const d = rules.defines.march;
    expect(monthlyRations(d, { men: 1000, horse: 200, logistics: 0 })).toBe(1600);
    expect(monthlyRations(d, { men: 1000, horse: 200, logistics: 0, campaigning: true })).toBe(2600);
  });

  it("refills an army from the store where it stands: enemy land is stripped, friendly locals keep a reserve (feedback 83)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = w.nationIndex.get("castile")!;
    const foe = w.nationIndex.get("portugal")!;
    applyNow(w, { type: "declareWar", target: foe }, me);
    const enemyLand = [...Array(w.provinceCount).keys()].find((p) => w.provinceOwner[p] === foe && w.provinceStore[p]! > 0)!;
    const home = capitalOf(w, "castile");
    const raider = spawnArmy(w, me, enemyLand, 2000);
    const homeArmy = spawnArmy(w, me, home, 20000);
    // The home province holds less than its reserve: its locals give nothing.
    w.provinceStore[home] = w.provincePopulation[home]! * 1;
    w.armies.food[raider] = 0;
    w.armies.food[homeArmy] = 30000;
    const enemyStore = w.provinceStore[enemyLand]!;
    w.date = { ...w.date, day: 2 };
    processTurn(w, [], -1);
    expect(w.armies.food[raider]).toBeGreaterThan(0);
    expect(w.provinceStore[enemyLand]).toBeLessThan(enemyStore);
    expect(w.armies.food[homeArmy]).toBeLessThan(30000);
    expect(w.provinceStore[home]).toBeCloseTo(w.provincePopulation[home]!, 3);
  }, 60000);
});
