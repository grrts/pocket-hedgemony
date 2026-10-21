import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld } from "../src/index.ts";
import { monthlyStability, stabilityEffect, stabilityOf, STABILITY } from "../src/stability.ts";
import { crownTake } from "../src/treasury.ts";
import { stabilityCost } from "../src/realmScreens.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

describe("what low stability costs (X-29)", () => {
  it("reads every realm in one pass as stabilityOf does", () => {
    const w = createWorld(rules, 1, tiles);
    monthlyStability(w);
    for (const id of ["castile", "france", "england", "lithuania", "ottomans"]) {
      const n = w.nationIndex.get(id)!;
      expect(w.nationStability[n]).toBe(stabilityOf(w, n).step);
    }
  });

  it("a Crumbling realm collects a quarter less tax; a Steady one all of it", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.nationIndex.get("castile")!;
    const p = w.provinceIndex.get(rules.nations[n]!.capital)!;
    w.nationStability[n] = 0;
    const steady = crownTake(w, p);
    const lord = w.lords.findIndex((l, k) => l.nation === n && Array.from(w.provinceLord).includes(k));
    w.lords[lord]!.loyalty = "In revolt";
    monthlyStability(w);
    expect(STABILITY[w.nationStability[n]!]).toBe("Crumbling");
    expect(stabilityEffect(w, n)).toEqual({ tax: 0.75, recruits: 0.75, rising: 2 });
    expect(crownTake(w, p)).toBeCloseTo(steady * 0.75);
  });

  it("says what each step costs", () => {
    expect(stabilityCost(0)).toBe("No cost yet; at Troubled the crown would get 10 % less tax and 10 % fewer recruits, and plotting provinces rise 50 % more often.");
    expect(stabilityCost(3)).toBe("The crown gets 25 % less tax and 25 % fewer recruits, and plotting provinces rise twice as often.");
  });
});
