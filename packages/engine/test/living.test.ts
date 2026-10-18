import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, monthBeginning, processTurn, type World } from "../src/index.ts";
import { CLASS_COUNT, classPeople } from "../src/living.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { hashWorld } from "../src/hash.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const province = (w: World, id: string) => w.provinceIndex.get(id)!;
const sum = (w: World, p: number) => w.provinceClasses.subarray(p * CLASS_COUNT, (p + 1) * CLASS_COUNT).reduce((a, b) => a + b, 0);

function months(w: World, count: number): void {
  for (let seen = 0; seen < count; ) {
    if (monthBeginning(w.date) !== null) seen++;
    processTurn(w, [], -1);
  }
}

describe("a living realm: people by class", () => {
  it("splits each province's people into classes by its ground, coast and wealth", () => {
    const w = createWorld(rules, 1, tiles);
    const toledo = province(w, rules.nations[w.nationIndex.get("castile")!]!.capital);
    expect(sum(w, toledo)).toBeCloseTo(w.provincePopulation[toledo]!, 3);
    expect(classPeople(w, toledo, "farmers")).toBeGreaterThan(classPeople(w, toledo, "craftsmen"));
    expect(classPeople(w, toledo, "homeless")).toBeGreaterThan(0);
    const coast = rules.provinces.findIndex((p) => p.coastal && p.owner && p.terrain !== "sea");
    expect(classPeople(w, coast, "seafolk")).toBeGreaterThan(0);
  });

  it("has births and deaths each month, so farmers grow and the homeless shrink", () => {
    const w = createWorld(rules, 1, tiles);
    const p = province(w, rules.nations[w.nationIndex.get("castile")!]!.capital);
    const farmers = classPeople(w, p, "farmers");
    const homeless = classPeople(w, p, "homeless");
    months(w, 12);
    expect(classPeople(w, p, "farmers") / farmers).toBeCloseTo(1.01, 2);
    expect(classPeople(w, p, "homeless")).toBeLessThan(homeless);
    expect(w.provincePopulation[p]).toBeCloseTo(sum(w, p), 3);
  });

  it("keeps people by class in a save", () => {
    const w = createWorld(rules, 1, tiles);
    months(w, 2);
    const chunks = worldChunks(w, { playerNation: "castile", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(Array.from(back.provinceClasses)).toEqual(Array.from(w.provinceClasses));
    expect(hashWorld(back)).toBe(hashWorld(w));
  });
});
