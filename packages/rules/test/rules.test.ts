import { describe, expect, it } from "vitest";
import { loadDefaultRuleset, validateRuleset, RulesetError } from "../src/index.ts";

describe("rules", () => {
  it("loads the bundled 1444 scenario", () => {
    const rules = loadDefaultRuleset();
    expect(rules.defines.startDate).toEqual({ year: 1444, month: 11 });
    expect(rules.nations.length).toBeGreaterThan(100);
    expect(rules.provinces.length).toBeGreaterThan(3000);
    const fra = rules.nations.find((n) => n.id === "FRA")!;
    expect(rules.provinces.find((p) => p.id === fra.capital)!.owner).toBe("FRA");
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
