import { describe, expect, it } from "vitest";

// The 1378 start behind the dev switch (rules/src/start.ts), chosen when @ph/rules loads.
process.env.PH_START = "1378";
const { loadDefaultRuleset, startGoals } = await import("@ph/rules");
const { loadMapTiles } = await import("../src/node/mapTiles.ts");
const { createWorld } = await import("../src/index.ts");
const { realmOf } = await import("../src/goals.ts");

describe("the 1378 goals bind to the 1378 world (EVT-100)", () => {
  it("every goal's realm and every realm it aims at is a 1378 realm", () => {
    const rules = loadDefaultRuleset();
    const w = createWorld(rules, 1, loadMapTiles(rules));
    expect(startGoals.length).toBeGreaterThan(500);
    const unbound = startGoals.flatMap((g) => [
      ...(realmOf(w, g.realm) === undefined ? [`realm ${g.realm}`] : []),
      ...[g.aim, g.alternative].flatMap((a) => (a && a.kind !== "take" && a.kind !== "hold" && realmOf(w, a.target) === undefined ? [`${g.realm} target ${a.target}`] : [])),
      ...[g.aim, g.alternative].flatMap((a) => (a && (a.kind === "take" || a.kind === "hold") && a.target && realmOf(w, a.target) === undefined ? [`${g.realm} target ${a.target}`] : [])),
    ]);
    expect(unbound).toEqual([]);
  });
});
