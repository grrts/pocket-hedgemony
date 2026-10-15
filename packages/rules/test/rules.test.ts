import { describe, expect, it } from "vitest";
import { loadDefaultRuleset, validateRuleset, RulesetError } from "../src/index.ts";

describe("rules", () => {
  it("loads the bundled 1444 scenario", () => {
    const rules = loadDefaultRuleset();
    expect(rules.defines.startDate).toEqual({ year: 1444, month: 11 });
    expect(rules.nations.length).toBeGreaterThan(5);
  });

  it("rejects unknown owners and one-way borders", () => {
    const rules = structuredClone(loadDefaultRuleset());
    rules.provinces[0]!.owner = "XXX";
    rules.provinces[0]!.neighbors.push("paris");
    try {
      validateRuleset(rules);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RulesetError);
      const problems = (e as RulesetError).problems.join("\n");
      expect(problems).toContain('unknown owner "XXX"');
      expect(problems).toContain("border with paris is one-way");
    }
  });
});
