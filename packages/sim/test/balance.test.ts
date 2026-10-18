import { beforeAll, describe, expect, it } from "vitest";
import warfare from "../../rules/data/domain/warfare.json" with { type: "json" };
import {
  assembleRunSet,
  atLeast,
  atMost,
  between,
  checkCollapse,
  checkConquestAnswered,
  checkDominance,
  checkFindings,
  checkPace,
  checkSmallPlayable,
  checkSnowball,
  checkWarPaid,
  checkWarPath,
  checkWarsEnd,
  flagLevers,
  isBankrupt,
  leverHints,
  leverRun,
  pickProbes,
  planRunSet,
  runChecks,
  targetOf,
  type LeverRun,
  type RunSet,
  type RunSetPlan,
} from "../src/balance.ts";
import { metricsCsv, strategyReport, worldCsv } from "../src/balanceReport.ts";
import { simConfig } from "../src/config.ts";
import { applyLever, leverExists, scaled, sweepLevers } from "../src/levers.ts";
import { runProbe, type ProbeResult } from "../src/probe.ts";
import { createRecorder } from "../src/metrics.ts";
import { advance, hashWorld, STEPS_PER_TURN } from "@ph/engine";
import { newWorld, rulesFor } from "../src/world.ts";

// The balance model's tools on a small made-up world, a year at most: these
// check the tools, they are not balance runs (those start only when Leroy asks).
const config = simConfig();
const cc = config.balance.checks;

describe("probe strategies", () => {
  const runs: Record<string, ProbeResult> = {};
  beforeAll(() => {
    for (const strategy of ["conqueror", "builder", "diplomat", "court"] as const) runs[strategy] = runProbe({ strategy, realm: "N2", seed: 1, years: 0.25, map: "synthetic", config });
  });

  it("plays each strategy for a season without breaking anything, recording the start and January", () => {
    for (const [name, r] of Object.entries(runs)) {
      expect(r.findings.filter((f) => f.severity === "broken"), name).toEqual([]);
      expect(r.weeks).toBeGreaterThanOrEqual(12);
      expect(r.recording.world.map((w) => w.year)).toEqual([1444, 1445]);
      expect(r.recording.realms.filter((x) => x.year === 1444)).toHaveLength(40);
    }
  });

  it("sends only orders through the engine host, as a player would, and the game takes most of them", () => {
    for (const name of ["conqueror", "builder", "diplomat"]) {
      const r = runs[name]!;
      expect(r.ordersSent, name).toBeGreaterThan(5);
      const refused = Object.values(r.rejected).reduce((t, x) => t + x.count, 0);
      expect(refused, name).toBeLessThan(r.ordersSent / 2);
    }
    expect(runs.court!.ordersSent).toBe(0);
  });

  it("plays each strategy its own way", () => {
    expect(runs.conqueror!.orders.declareWar).toBeGreaterThan(0);
    expect(runs.builder!.orders.declareWar).toBeUndefined();
    expect(runs.builder!.orders.build).toBeGreaterThan(0);
    expect(runs.diplomat!.orders.sendEnvoy).toBeGreaterThan(0);
    expect(runs.diplomat!.orders.build).toBeUndefined();
  });

  it("records the realm metrics, leaving empty what the engine does not keep yet", () => {
    const row = runs.conqueror!.recording.realms.find((x) => x.realm === "N2" && x.year === 1445)!;
    expect(row.provinces).toBeGreaterThan(0);
    expect(row.economy).toBeTypeOf("number");
    expect(row.ledger).toHaveProperty("army pay");
    expect(row.lostHunger).toBeNull();
    expect(Object.keys(runs.conqueror!.recording.returns.N2!.per100)).toEqual(["war", "works", "learning", "diplomacy"]);
    expect(runs.conqueror!.recording.returns.N2!.spent.war).toBeGreaterThan(0);
  });

  it("gives the same metrics for the same seed, rules data, probe and strategy", () => {
    const again = runProbe({ strategy: "conqueror", realm: "N2", seed: 1, years: 0.25, map: "synthetic", config });
    expect(again.recording.realms).toEqual(runs.conqueror!.recording.realms);
    expect(again.recording.world).toEqual(runs.conqueror!.recording.world);
  });

  it("refuses a realm the scenario does not have", () => {
    expect(() => runProbe({ strategy: "builder", realm: "atlantis", seed: 1, years: 1, map: "synthetic" })).toThrow(/unknown realm/);
  });

  it("only reads the world it measures: the same weeks with and without the recorder end in the same world", () => {
    const play = (record: boolean) => {
      const w = newWorld("synthetic", 4);
      const rec = record ? createRecorder("t", w, config.balance) : null;
      for (let k = 0; k < 10; k++) {
        advance(w, STEPS_PER_TURN - w.step);
        rec?.week();
      }
      return hashWorld(w);
    };
    expect(play(true)).toBe(play(false));
  });
});

describe("probe realms", () => {
  it("picks the largest, middle and smallest realms of a made-up world, and bands named ones", () => {
    const rules = rulesFor("synthetic");
    const probes = pickProbes(rules, "synthetic", config.balance);
    expect(probes.map((p) => p.band)).toEqual(["large", "medium", "small"]);
    expect(probes[0]!.settled).toBeGreaterThanOrEqual(probes[2]!.settled);
    expect(pickProbes(rules, "synthetic", config.balance, ["N2"])).toHaveLength(1);
    expect(() => pickProbes(rules, "synthetic", config.balance, ["atlantis"])).toThrow(/unknown realm/);
  });

  it("plans the same seeds for every strategy, one AI-only Court run per seed", () => {
    const plan: RunSetPlan = { map: "synthetic", years: 1, seeds: [1, 2], probes: [{ realm: "N1", band: "large", settled: 10 }, { realm: "N2", band: "small", settled: 9 }], strategies: ["conqueror", "court"] };
    const jobs = planRunSet(plan, config);
    expect(jobs).toHaveLength(6);
    expect(jobs.filter((j) => j.strategy === "court").map((j) => j.realm)).toEqual(["", ""]);
    expect(new Set(jobs.filter((j) => j.strategy === "conqueror").map((j) => j.seed))).toEqual(new Set([1, 2]));
  });
});

describe("checks", () => {
  it("passes, warns within a fifth of the line, and fails", () => {
    expect(atMost(0.1, 0.25)).toBe("pass");
    expect(atMost(0.22, 0.25)).toBe("warn");
    expect(atMost(0.4, 0.25)).toBe("fail");
    expect(atLeast(0.9, 0.7)).toBe("pass");
    expect(atLeast(0.8, 0.7)).toBe("warn");
    expect(atLeast(0.6, 0.7)).toBe("fail");
    expect(between(0.7, 0.5, 0.9)).toBe("pass");
    expect(between(0.52, 0.5, 0.9)).toBe("warn");
    expect(between(0.38, 0.5, 0.9)).toBe("fail");
  });

  it("BAL-013: a strategy first in 35 of 48 pairs dominates", () => {
    const r = checkDominance({ conqueror: 35, builder: 13 }, 48, cc);
    expect(r.verdict).toBe("fail");
    expect(r.shown).toBe("73%");
  });

  it("BAL-014: the Conqueror's edge over the best peaceful strategy", () => {
    const v = (conqueror: number) => checkWarPath([{ band: "medium", conqueror, builder: 100, diplomat: 100 }], { ...cc, diplomacy_floor: 0 }).verdict;
    expect(v(110)).toBe("pass");
    expect(v(122)).toBe("warn");
    expect(v(140)).toBe("fail");
    expect(checkWarPath([{ band: "large", conqueror: 100, builder: 100, diplomat: 60 }], cc).verdict).toBe("fail");
    expect(checkWarPath([{ band: "large", conqueror: null, builder: 100, diplomat: 100 }], cc).verdict).toBe("skip");
  });

  it("BAL-015: war returning 9 per 100 gold against 5 for works fails, and so does occupation paying in full", () => {
    const r = checkWarPaid(9, 5, null, cc);
    expect(r.verdict).toBe("fail");
    expect(r.shown).toBe("80%");
    expect(checkWarPaid(5, 5, 0.5, cc).verdict).toBe("pass");
    expect(checkWarPaid(5, 5, 1, cc).verdict).toBe("fail");
  });

  it("BAL-016: a league in 3 of 8 runs past the threshold is too few", () => {
    const r = checkConquestAnswered(8, 3, 8, cc);
    expect(r.verdict).toBe("fail");
    expect(r.shown).toBe("38%");
    expect(checkConquestAnswered(4, 4, 3, cc).verdict).toBe("fail");
    expect(checkConquestAnswered(4, 4, 4, cc).verdict).toBe("pass");
    expect(checkConquestAnswered(0, 0, 0, cc).verdict).toBe("skip");
  });

  it("BAL-017: 1 obliged peace and 4 exhaustion peaces in 20 long wars fail", () => {
    expect(checkWarsEnd([{ long: 20, obliged: 1, exhaustion: 4 }], cc).verdict).toBe("fail");
    expect(checkWarsEnd([{ long: 20, obliged: 10, exhaustion: 0 }], cc).verdict).toBe("pass");
    expect(checkWarsEnd([{ long: 0, obliged: 0, exhaustion: 0 }], cc).verdict).toBe("skip");
  });

  it("BAL-018 to BAL-021 on hand-built numbers", () => {
    expect(checkSnowball(2, null, cc).verdict).toBe("fail");
    expect(checkSnowball(1, { seeds: 8, over: 2 }, cc).verdict).toBe("fail");
    expect(checkSnowball(1, { seeds: 8, over: 0 }, cc).verdict).toBe("pass");
    const pace = checkPace(400, 150, cc);
    expect([pace.verdict, pace.shown]).toEqual(["fail", "38%"]);
    expect(checkPace(400, null, cc).verdict).toBe("skip");
    const small = checkSmallPlayable(60, 100, cc);
    expect([small.verdict, small.shown]).toEqual(["fail", "60%"]);
    expect(checkCollapse(3, 100, cc).verdict).toBe("pass");
    expect(checkCollapse(10, 100, cc).verdict).toBe("fail");
    expect(isBankrupt({ debt: 300, income: 100 }, 2)).toBe(true);
    expect(isBankrupt({ debt: 150, income: 100 }, 2)).toBe(false);
  });

  it("turns failed checks into Balance findings naming the lever", () => {
    const failed = checkWarPaid(9, 5, null, cc);
    const fs = checkFindings([failed, checkCollapse(0, 10, cc)], 1494, { "BAL-015": { lever: "warfare.occupation.tax_share", from: "config" } });
    expect(fs).toHaveLength(1);
    expect(fs[0]!.severity).toBe("balance");
    expect(fs[0]!.text).toContain("warfare.occupation.tax_share");
  });
});

describe("lever sweeps", () => {
  it("scales the numbers under a lever, keeping whole numbers whole", () => {
    expect(scaled({ a: 3, b: 0.5, c: [2, 1], $comment: "x" }, 0.5)).toEqual({ a: 2, b: 0.25, c: [1, 1], $comment: "x" });
    expect(sweepLevers("provisional")).toContain("warfare.troop_cap");
    expect(sweepLevers(["a.b"])).toEqual(["a.b"]);
    expect(leverExists("warfare.troop_cap")).toBe(true);
    expect(leverExists("warfare.occupation.tax_share")).toBe(true);
    expect(leverExists("warfare.no_such_lever")).toBe(false);
    expect(targetOf("warfare.peace.long_war_years", config.balance.sweep.targets)).toBe("obliged_share");
    expect(targetOf("diplomacy.leagues.threshold_by_era", config.balance.sweep.targets)).toBe("league_share");
    expect(targetOf("realm.debt", config.balance.sweep.targets)).toBe("score_growth");
  });

  it("changes one lever for a run and puts the rules data back", () => {
    const rules = rulesFor("synthetic");
    const before = structuredClone(warfare.troop_cap);
    const d = applyLever(rules, { path: "defines.war.aiDeclareChancePerMonth", factor: 2 });
    expect(d.rules.defines.war.aiDeclareChancePerMonth).toBe(rules.defines.war.aiDeclareChancePerMonth * 2);
    const w = applyLever(rules, { path: "warfare.troop_cap", factor: 2 });
    expect(warfare.troop_cap.without).toBe(before.without * 2);
    w.restore();
    expect(warfare.troop_cap).toEqual(before);
  });

  it("flags a dead lever and a sensitive one", () => {
    const run = (lever: string, factor: number, change: number, rankingChange: number): LeverRun => ({ lever, factor, target: "obliged_share", base: 0.2, value: 0.2, change, rankingChange });
    const flags = flagLevers([run("warfare.peace.long_war_years", 0.5, 0.01, 0), run("warfare.peace.long_war_years", 2, 0.005, 0), run("warfare.troop_cap", 2, 0.3, 0.3)], config.balance.sweep);
    expect(flags.map((f) => `${f.lever} ${f.kind}`)).toEqual(["warfare.peace.long_war_years dead", "warfare.troop_cap sensitive"]);
  });

  describe("a sweep on a tiny run set", () => {
    const plan: RunSetPlan = { map: "synthetic", years: 0.25, seeds: [1], probes: [{ realm: "N2", band: "medium", settled: 10 }], strategies: ["conqueror", "court"] };
    let base: RunSet;
    let swept: RunSet;
    beforeAll(() => {
      const lever = { path: "warfare.troop_cap", factor: 2 };
      const results = [...planRunSet(plan, config), ...planRunSet(plan, config, lever)].map(runProbe);
      base = assembleRunSet(plan, results);
      swept = assembleRunSet(plan, results, lever);
    });

    it("plays the set again with one lever changed and measures its target", () => {
      expect(base.runs).toHaveLength(2);
      expect(swept.runs.every((r) => r.lever?.path === "warfare.troop_cap")).toBe(true);
      const r = leverRun(base, swept, config.balance);
      expect(r.target).toBe("conqueror_growth");
      expect(r.base).not.toBeNull();
      expect(r.rankingChange).not.toBeNull();
    });

    it("writes the report with the war-price checks first, and the CSV files", () => {
      const checks = runChecks(base, config.balance);
      expect(checks.map((c) => c.id)).toEqual(["BAL-013", "BAL-014", "BAL-015", "BAL-016", "BAL-017", "BAL-018", "BAL-019", "BAL-020", "BAL-021"]);
      const runs = [leverRun(base, swept, config.balance)];
      const hints = leverHints(checks, runs, [], config.balance.check_levers as Record<string, string>);
      const md = strategyReport("Test", base, checks, hints, checkFindings(checks, 1445, hints), { runs, flags: [], missing: ["warfare.occupation.tax_share"] });
      const glance = md.slice(md.indexOf("## At a glance"), md.indexOf("## Strategy comparison"));
      const order = ["BAL-014", "BAL-015", "BAL-016", "BAL-017", "BAL-013"].map((id) => glance.indexOf(`(${id})`));
      expect(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1]!))).toBe(true);
      expect(md).toContain("### Checks");
      expect(md).toContain("warfare.occupation.tax_share");
      for (const line of md.split("\n").filter((l) => l.startsWith("|"))) expect(line.split("|").length - 2).toBeLessThanOrEqual(5);
      const csv = metricsCsv([base]).trim().split("\n");
      expect(csv[0]!.startsWith("realm,run,year,")).toBe(true);
      expect(csv).toHaveLength(1 + base.runs.reduce((t, r) => t + r.recording.realms.length, 0));
      const world = worldCsv([base]).trim().split("\n");
      expect(world).toHaveLength(1 + base.runs.reduce((t, r) => t + r.recording.world.length, 0));
      expect(csv[1]!.split(",")).toHaveLength(csv[0]!.split(",").length);
    });
  });
});
