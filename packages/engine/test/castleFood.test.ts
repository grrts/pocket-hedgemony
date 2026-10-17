import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { castleCap, mapNetwork, shareFood } from "../src/castleFood.ts";
import { WORK_COUNT, workIndex } from "../src/works.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const capitalOf = (w: World, id: string) => w.provinceIndex.get(rules.nations[w.nationIndex.get(id)!]!.capital)!;
/** A province of the capital's realm next to the capital that the capital's castle feeds. */
const fedNeighbour = (w: World, c: number) => {
  for (let k = w.adjStart[c]!; k < w.adjStart[c + 1]!; k++) if (w.provinceCastle[w.adjList[k]!] === c) return w.adjList[k]!;
  return -1;
};

describe("castles share food (feedback 84, 85)", () => {
  it("gives each province to its nearest castle, and an enemy on the road cuts it off", () => {
    const w = createWorld(rules, 1, tiles);
    const c = capitalOf(w, "castile");
    expect(w.provinceCastle[c]).toBe(c);
    const q = fedNeighbour(w, c);
    expect(q).toBeGreaterThanOrEqual(0);
    w.provinceOccupier[q] = w.nationIndex.get("portugal")!;
    mapNetwork(w);
    expect(w.provinceCastle[q]).toBe(-1);
    expect(w.castleCut[c]).toBe(1);
  });

  it("collects a share of the surplus at the harvest and feeds a hungry province first", () => {
    const w = createWorld(rules, 1, tiles);
    const c = capitalOf(w, "castile");
    const q = fedNeighbour(w, c);
    w.date = { year: 1445, month: 9, day: 1 };
    w.castleStore[c] = 0;
    w.provinceStore[c] = w.provincePopulation[c]! * 16;
    shareFood(w);
    expect(w.castleStore[c]).toBeGreaterThan(0);
    // The famine rule: a province under a month is fed from the store over the reserve.
    w.date = { year: 1445, month: 10, day: 1 };
    w.castleStore[c] = w.provincePopulation[c]! * 6;
    w.provinceStore[q] = 0;
    shareFood(w);
    expect(w.provinceStore[q]).toBeGreaterThan(0);
  });

  it("caps the stores: food over them spoils, or is sold for gold under the Sell rule", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.nationIndex.get("castile")!;
    w.player = n;
    const c = capitalOf(w, "castile");
    w.date = { year: 1445, month: 10, day: 1 };
    w.castleStore[c] = castleCap(w, c) + 100;
    shareFood(w);
    expect(w.castleStore[c]).toBeLessThanOrEqual(castleCap(w, c));
    expect(w.nationFoodSpoiled[n]).toBeGreaterThan(0);
    expect(applyNow(w, { type: "setFood", castle: -1, key: "surplus", value: "Sell to the treasury" }, n).rejectedOrders).toEqual([]);
    w.castleStore[c] = castleCap(w, c) + 100;
    shareFood(w);
    expect(w.nationGrainGold[n]).toBeGreaterThan(0);
  });

  it("a granary makes a castle's store bigger", () => {
    const w = createWorld(rules, 1, tiles);
    const c = capitalOf(w, "castile");
    const before = castleCap(w, c);
    w.provinceWorks[c * WORK_COUNT + workIndex("granary")] = 1;
    expect(castleCap(w, c)).toBeGreaterThan(before);
  });

  it("takes presets and a castle's own values, and refuses what isn't a choice", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.nationIndex.get("castile")!;
    const c = capitalOf(w, "castile");
    expect(applyNow(w, { type: "foodPreset", name: "War footing" }, n).rejectedOrders).toEqual([]);
    expect(w.foodPolicy[n]!.realm.collection).toBe(75);
    expect(applyNow(w, { type: "setFood", castle: c, key: "siegeReserve", value: 12 }, n).rejectedOrders).toEqual([]);
    expect(w.foodPolicy[n]!.overrides[w.provinceIds[c]!]!.siegeReserve).toBe(12);
    expect(applyNow(w, { type: "setFood", castle: c, key: "siegeReserve", value: null }, n).rejectedOrders).toEqual([]);
    expect(w.foodPolicy[n]!.overrides[w.provinceIds[c]!]).toBeUndefined();
    expect(applyNow(w, { type: "setFood", castle: -1, key: "collection", value: 40 }, n).rejectedOrders.length).toBe(1);
    processTurn(w, [], n);
  });
});
