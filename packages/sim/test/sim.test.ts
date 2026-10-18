import { describe, expect, it } from "vitest";
import { runAiCampaign } from "../src/campaign.ts";
import { runBreaker } from "../src/breaker.ts";
import { simConfig } from "../src/config.ts";
import { campaignFindings } from "../src/findings.ts";
import { checkFinite, type WorldSample } from "../src/measure.ts";
import { markdownReport } from "../src/report.ts";
import { newWorld } from "../src/world.ts";

// Every test plays a small made-up world for a year at most: these check the
// tools, they are not balance runs (those start only when Leroy asks).
describe("AI-only campaign", () => {
  it("plays a year with no player, sampling the world", () => {
    const r = runAiCampaign({ seed: 3, years: 1, map: "synthetic", sampleMonths: 3 });
    expect(r.weeks).toBeGreaterThanOrEqual(52);
    expect(r.samples.length).toBeGreaterThanOrEqual(4);
    expect(r.samples[0]!.realmsAlive).toBe(40);
    expect(r.findings.filter((f) => f.severity === "broken")).toEqual([]);
  });

  it("is the same campaign every time for the same seed", () => {
    const a = runAiCampaign({ seed: 5, years: 1, map: "synthetic" });
    const b = runAiCampaign({ seed: 5, years: 1, map: "synthetic" });
    expect(b.samples.at(-1)).toEqual(a.samples.at(-1));
  });
});

describe("the bot as a realm", () => {
  it("plays a realm through the engine host's orders without breaking anything", () => {
    const r = runBreaker({ realm: "N2", seed: 1, years: 1, map: "synthetic" });
    expect(r.weeks).toBeGreaterThanOrEqual(52);
    expect(r.ordersSent).toBeGreaterThan(10);
    expect(r.realmSamples[0]!.realm!.provinces).toBeGreaterThan(0);
    expect(r.findings.filter((f) => f.severity === "broken")).toEqual([]);
  });

  it("refuses a realm the scenario does not have", () => {
    expect(() => runBreaker({ realm: "atlantis", seed: 1, years: 1, map: "synthetic" })).toThrow(/unknown realm/);
  });

  it("measures the bot against the AI's own result with the realm", () => {
    const baseline = { provinces: 2, treasury: 10, income: 1, levies: 0, men: 0, atWar: false };
    const r = runBreaker({ realm: "N2", seed: 1, years: 1, map: "synthetic", baseline, config: simConfig({ breaker_checks: { provinces_vs_ai: 1.5 } }) });
    expect(r.findings.some((f) => f.kind === "snowball")).toBe(true);
  });
});

describe("checks", () => {
  it("finds numbers gone wrong in a world", () => {
    const w = newWorld("synthetic", 1);
    expect(checkFinite(w)).toEqual([]);
    w.nationTreasury[4] = Number.NaN;
    w.provincePopulation[7] = -1;
    const bad = checkFinite(w).map((b) => `${b.path}[${b.index}]`);
    expect(bad).toContain("nationTreasury[4]");
    expect(bad).toContain("provincePopulation[7]");
  });

  it("flags a realm holding too much of the world and a world long at peace", () => {
    const at = (year: number, share: number, wars: number): WorldSample => ({
      year, month: 1, landProvinces: 100, realmsAlive: 10, wars, realmsAtWar: wars ? 2 : 0, largest: { realm: "big", share },
      medianTreasury: 10, medianIncome: 1, menUnderArms: 0, levies: 100, realms: {},
    });
    const samples = Array.from({ length: 20 }, (_, i) => at(1444 + i, i > 10 ? 0.3 : 0.1, 0));
    const kinds = campaignFindings(samples, simConfig().campaign_checks).map((f) => f.kind);
    expect(kinds).toContain("snowball");
    expect(kinds).toContain("stagnation");
  });

  it("writes a report that leads with what needs a look", () => {
    const c = runAiCampaign({ seed: 1, years: 1, map: "synthetic" });
    c.findings.push({ severity: "broken", kind: "bad_number", year: 1445, text: "nationTreasury[4] is NaN." });
    const md = markdownReport("Test", [c], []);
    expect(md.indexOf("## At a glance")).toBeLessThan(md.indexOf("## AI-only campaign"));
    expect(md).toContain("nationTreasury[4] is NaN.");
  });
});
