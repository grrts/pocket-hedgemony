import { describe, expect, it } from "vitest";
import chronicle from "../../rules/data/domain/chronicle.json" with { type: "json" };
import { bindPlaces, CHECKPOINTS, compare, historyReport, KEY_PLACES, runHistory, sameRealm } from "../src/history.ts";
import { newWorld } from "../src/world.ts";

describe("the history check (BAL-031 to BAL-034)", () => {
  // The 1444 map itself scores 82 %: the realms too small for the map and a few places bound to a neighbouring province.
  it("the 1444 start matches its own checkpoint within its tolerance", () => {
    const w = newWorld("real", 1);
    const cp = CHECKPOINTS.find((c) => c.date === "1444-11-11")!;
    const r = compare(w, cp, bindPlaces(w));
    expect(r.keyPlaces.counted).toBeGreaterThan(100);
    expect(r.within).toBe(true);
    expect(r.greatPowers.among).toBeGreaterThan(0);
  });

  it("counts a place held under an alias as matching", () => {
    expect(sameRealm("england", "great_britain")).toBe(true);
    expect(sameRealm("england", "france")).toBe(false);
  });

  it("lists 146 key places and nine checkpoints, and the Chronicle's turning points agree with them", () => {
    expect(KEY_PLACES).toHaveLength(146);
    expect(CHECKPOINTS.map((c) => c.date.slice(0, 4))).toEqual(["1378", "1405", "1420", "1444", "1500", "1600", "1715", "1815", "1914"]);
    const keys = new Set(CHECKPOINTS.flatMap((c) => (c.since_previous?.events ?? []).map((e) => e.key)));
    expect(new Set(chronicle.turning_points.map((t) => t.key))).toEqual(keys);
  });

  it("never fails the command on history: a run that reaches no checkpoint says so", () => {
    const r = runHistory({ seed: 1, years: 0.02, map: "synthetic" });
    expect(r.checkpoints).toEqual([]);
    expect(historyReport([r])).toContain("No run reached a checkpoint");
  });
});
