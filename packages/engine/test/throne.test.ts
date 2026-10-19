import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { grievancesOf } from "../src/moods.ts";
import { crownTake } from "../src/treasury.ts";
import { farFromThrone, monthlyThrone, seatOf, shareAtDays, throneShare, THRONE } from "../src/throne.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

function nextMonth(w: World): void {
  const m = w.date.month;
  while (w.date.month === m) processTurn(w, [], w.player);
  processTurn(w, [], w.player);
}

const royalFar = (w: World, n: number) => Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === n && farFromThrone(w, p));

describe("far from the throne (PROV-173, PROV-174, X-28)", () => {
  it("counts days to the capital over the realm's land: the capital 0, its neighbours a few days", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = w.nationIndex.get("castile")!;
    const capital = seatOf(w, castile);
    expect(w.provinceDaysToCapital[capital]).toBe(0);
    const next = Array.from(w.adjList.subarray(w.adjStart[capital]!, w.adjStart[capital + 1]!)).find((q) => w.provinceOwner[q] === castile)!;
    expect(w.provinceDaysToCapital[next]).toBeGreaterThan(0);
    expect(w.provinceDaysToCapital[next]).toBeLessThanOrEqual(THRONE.days);
  });

  it("cuts a tenth for every 10 days past a month, down to half", () => {
    expect(shareAtDays(THRONE.days)).toBe(1);
    expect(shareAtDays(THRONE.days + 10)).toBeCloseTo(0.9);
    expect(shareAtDays(THRONE.days + 30)).toBeCloseTo(0.7);
    expect(shareAtDays(THRONE.farCap)).toBeCloseTo(0.5);
    expect(shareAtDays(255)).toBeCloseTo(0.5);
  });

  it("gives far royal land the grievance and less tax; granted to a lord it is run from his seat", () => {
    const w = createWorld(rules, 1, tiles);
    const lith = w.nationIndex.get("lithuania")!;
    const far = royalFar(w, lith);
    expect(far.length).toBeGreaterThan(0);
    const p = far[0]!;
    nextMonth(w);
    expect(grievancesOf(w, p)).toContain("Far from the throne");
    expect(throneShare(w, p)).toBeLessThan(1);
    const before = crownTake(w, p);
    const lord = w.lords.findIndex((l) => l.nation === lith && !l.gone);
    w.provinceLord[p] = lord;
    expect(farFromThrone(w, p)).toBe(false);
    expect(throneShare(w, p)).toBe(1);
    nextMonth(w);
    expect(grievancesOf(w, p)).not.toContain("Far from the throne");
    expect(before).toBeGreaterThan(0);
  });

  it("works the days out again when land changes hands", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = w.nationIndex.get("castile")!;
    const portugal = w.nationIndex.get("portugal")!;
    const lisbon = seatOf(w, portugal);
    expect(w.provinceDaysToCapital[lisbon]).toBe(0);
    w.provinceOwner[lisbon] = castile;
    monthlyThrone(w);
    expect(w.provinceDaysToCapital[lisbon]).toBeGreaterThan(0);
    // Portugal's court moves to its largest province left.
    expect(seatOf(w, portugal)).not.toBe(lisbon);
  });
});
