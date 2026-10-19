import { describe, expect, it } from "vitest";

// The dev switch (rules/src/start.ts): PH_START=1378 makes the 1378 scenario the
// start. Set before the first import, since the start is chosen when the module loads.
process.env.PH_START = "1378";
const rules = await import("../src/index.ts");

describe("the 1378 start behind the dev switch (X-25)", () => {
  it("starts on 20 September 1378 with the 1378 world", () => {
    expect(rules.START_ID).toBe("1378");
    expect(rules.START_DATE).toEqual({ year: 1378, month: 9, day: 20 });
    expect(rules.START_SCENARIO.name).toBe("Autumn 1378");
  });

  it("loads a valid ruleset whose capitals each lie in their own realm", () => {
    const r = rules.loadDefaultRuleset();
    const owner = new Map(r.provinces.map((p) => [p.id, p.owner]));
    const awake = r.nations.filter((n) => !n.asleep);
    expect(awake.length).toBeGreaterThan(300);
    for (const n of awake) expect(owner.get(n.capital), n.id).toBe(n.id);
    expect(r.map?.provinceImage).toBe("map/1378/provinces.png");
  });

  it("names a ruler for every realm on the map", () => {
    const r = rules.loadDefaultRuleset();
    for (const n of r.nations.filter((x) => !x.asleep)) expect(n.id in rules.startRulers.rulers, n.id).toBe(true);
  });

  it("places sleeping realms and ports on provinces of the 1378 map", () => {
    const r = rules.loadDefaultRuleset();
    const ids = new Set(r.provinces.map((p) => p.id));
    for (const s of rules.startWorld.sleeping.realms) {
      expect(ids.has(s.capital), `${s.id} capital`).toBe(true);
      for (const h of s.home) expect(ids.has(h), `${s.id} home ${h}`).toBe(true);
    }
    for (const t of rules.startPorts.towns) expect(ids.has(t.province), t.name).toBe(true);
  });
});
