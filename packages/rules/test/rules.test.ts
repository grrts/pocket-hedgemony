import { describe, expect, it } from "vitest";
import { loadDefaultRuleset, validateRuleset, RulesetError, START_DATE, START_ERAS, START_SCENARIO } from "../src/index.ts";
import research from "../data/domain/research.json" with { type: "json" };

describe("rules", () => {
  it("loads the bundled 1444 scenario", () => {
    const rules = loadDefaultRuleset();
    expect(rules.defines.startDate).toEqual({ year: 1444, month: 11, day: 11 });
    expect(rules.nations.length).toBeGreaterThan(100);
    expect(rules.provinces.length).toBeGreaterThan(3000);
    const fra = rules.nations.find((n) => n.id === "france")!;
    expect(rules.provinces.find((p) => p.id === fra.capital)!.owner).toBe("france");
    const seas = rules.provinces.filter((p) => p.terrain === "sea" || p.terrain === "ocean");
    expect(seas.length).toBeGreaterThan(1000);
    // The Black Sea reaches the Mediterranean through the Bosporus and Dardanelles.
    const byId = new Map(rules.provinces.map((p) => [p.id, p]));
    const reach = new Set([seas.find((p) => p.name.includes("Black Sea"))!.id]);
    for (const id of reach) for (const n of byId.get(id)!.neighbors) if (byId.get(n)!.terrain === "sea" || byId.get(n)!.terrain === "ocean") reach.add(n);
    expect([...reach].some((id) => byId.get(id)!.name.includes("Atlantic"))).toBe(true);
  });

  it("reads the start from the start scenario (X-25)", () => {
    expect(START_SCENARIO.id).toBe("1444");
    expect(loadDefaultRuleset().defines.startDate).toEqual(START_DATE);
    // The start falls in its era, and the eras before it come before it in the tree.
    const dates = research.era_dates as Record<string, number>;
    expect(dates[START_ERAS.start]).toBeLessThanOrEqual(START_DATE.year);
    for (const e of START_ERAS.before_start) expect(research.eras.indexOf(e)).toBeLessThan(research.eras.indexOf(START_ERAS.start));
  });

  it("rejects unknown owners and one-way borders", () => {
    const rules = structuredClone(loadDefaultRuleset());
    const [, b] = rules.provinces.filter((p) => !rules.provinces[0]!.neighbors.includes(p.id) && p !== rules.provinces[0]);
    rules.provinces[0]!.owner = "XXX";
    rules.provinces[0]!.neighbors.push(b!.id);
    try {
      validateRuleset(rules);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RulesetError);
      const problems = (e as RulesetError).problems.join("\n");
      expect(problems).toContain('unknown owner "XXX"');
      expect(problems).toContain(`border with ${b!.id} is one-way`);
    }
  });
});
