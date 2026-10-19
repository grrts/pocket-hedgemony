// Balance runs from the command line (feedback 130). Nothing here runs on its
// own: CI only tests the tools on a few weeks of a made-up world.
//
//   pnpm --filter @ph/sim campaign [--years 50] [--seeds 1,2,3] [--map real|synthetic] [--jobs 4] [--out DIR]
//   pnpm --filter @ph/sim breaker  (--realms france,castile | --all) [--years 50] [--seed 1] [--map real] [--jobs 4] [--out DIR]
//   pnpm --filter @ph/sim history [--years 70] [--seeds 1,2,3] [--jobs 4] [--out DIR]   (the history check, BAL-031)
//   pnpm --filter @ph/sim strategies [--years 50] [--seeds 1,2,3] [--probes france,mali] [--strategies conqueror,builder,diplomat,court]
//                                    [--sweep [--levers a.b,c.d | provisional]] [--map real|synthetic] [--jobs 4] [--out DIR]
//
// Each run writes report.md (read this first), summary.json and one JSON
// file per campaign, realm or balance run into DIR (default packages/sim/out/<time>-<command>).
// The strategy runs (the balance model, domain/balance) add metrics.csv and
// world.csv and exit with code 1 when a check fails or a run broke (BAL-027).
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { BreakerResult } from "./breaker.ts";
import type { CampaignResult } from "./campaign.ts";
import { simConfig } from "./config.ts";
import { assembleRunSet, checkFindings, flagLevers, leverHints, leverRun, pickProbes, planRunSet, runChecks, type ProbeRealm, type RunSetPlan } from "./balance.ts";
import { metricsCsv, strategyReport, worldCsv, type SweepSummary } from "./balanceReport.ts";
import type { Finding } from "./findings.ts";
import { runJobs, type Job, type JobResult } from "./jobs.ts";
import { leverExists, sweepLevers, type Lever } from "./levers.ts";
import type { ProbeResult } from "./probe.ts";
import { STRATEGIES, type StrategyName } from "./strategies.ts";
import { historyReport, type HistoryResult } from "./history.ts";
import { markdownReport } from "./report.ts";
import { rulesFor, type MapKind } from "./world.ts";

const [command, ...rest] = process.argv.slice(2);
const { values: a } = parseArgs({
  args: rest,
  options: {
    years: { type: "string" },
    seeds: { type: "string" },
    seed: { type: "string" },
    map: { type: "string" },
    jobs: { type: "string" },
    out: { type: "string" },
    realms: { type: "string" },
    all: { type: "boolean" },
    "no-baseline": { type: "boolean" },
    probes: { type: "string" },
    strategies: { type: "string" },
    sweep: { type: "boolean" },
    levers: { type: "string" },
  },
});

const config = simConfig();
const years = Number(a.years ?? (command === "strategies" ? config.balance.years : config.run.years));
const map = (a.map ?? config.run.map) as MapKind;
const threads = Number(a.jobs ?? Math.max(1, Math.min(4, availableParallelism() - 1)));
if (map !== "real" && map !== "synthetic") fail(`--map is real or synthetic, not ${map}`);
if (!(years > 0)) fail("--years must be a number above 0");

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const out = a.out ?? join(new URL("..", import.meta.url).pathname, "out", `${stamp}-${command}`);

if (command === "campaign") await campaigns();
else if (command === "breaker") await breakers();
else if (command === "strategies") await strategies();
else if (command === "history") await history();
else fail("usage: cli.ts campaign|breaker|strategies|history [options]; see the top of src/cli.ts");

/** The history check (BAL-031 to BAL-034): never fails on history, since realms are meant to go their own way. */
async function history(): Promise<void> {
  const seeds = (a.seeds ?? config.run.seeds.join(",")).split(",").map(Number);
  const jobs: Job[] = seeds.map((seed) => ({ kind: "history", options: { seed, years, map } }));
  console.log(`${jobs.length} history run(s) of ${years} years on the ${map} map, ${threads} at a time → ${out}`);
  const results = ((await runJobs(jobs, threads, progress)) as HistoryResult[]).sort((x, y) => x.seed - y.seed);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "history.json"), JSON.stringify(results, null, 1));
  writeFileSync(join(out, "history.md"), historyReport(results));
  console.log(`Report: ${join(out, "history.md")}`);
}

async function campaigns(): Promise<void> {
  const seeds = (a.seeds ?? config.run.seeds.join(",")).split(",").map(Number);
  const jobs: Job[] = seeds.map((seed) => ({ kind: "campaign", options: { seed, years, map, config } }));
  console.log(`${jobs.length} AI-only campaign(s) of ${years} years on the ${map} map, ${threads} at a time → ${out}`);
  const results = (await runJobs(jobs, threads, progress)) as CampaignResult[];
  write(`AI-only campaigns, ${years} years`, results.sort((x, y) => x.seed - y.seed), []);
}

async function breakers(): Promise<void> {
  const seed = Number(a.seed ?? config.run.seeds[0]);
  const ids = rulesFor(map).nations.map((n) => n.id);
  const realms = a.all ? ids : (a.realms ?? "").split(",").filter(Boolean);
  if (!realms.length) fail("name the realms with --realms a,b or play them all with --all");
  for (const r of realms) if (!ids.includes(r)) fail(`unknown realm ${r}; realms are ids such as ${ids.slice(0, 3).join(", ")}`);
  let baseline: CampaignResult | null = null;
  if (!a["no-baseline"]) {
    console.log(`The AI's own campaign first (seed ${seed}, ${years} years), to measure the bot against.`);
    baseline = ((await runJobs([{ kind: "campaign", options: { seed, years, map, config } }], 1, progress)) as CampaignResult[])[0] ?? null;
  }
  const end = baseline?.samples[baseline.samples.length - 1];
  const jobs: Job[] = realms.map((realm) => ({ kind: "breaker", options: { realm, seed, years, map, config, baseline: end?.realms[realm] ?? null } }));
  console.log(`${jobs.length} bot run(s) of ${years} years on the ${map} map, ${threads} at a time → ${out}`);
  const results = (await runJobs(jobs, threads, progress)) as BreakerResult[];
  write(`The bot against the game, ${years} years`, baseline ? [baseline] : [], results);
}

async function strategies(): Promise<void> {
  const bc = config.balance;
  const seeds = (a.seeds ?? bc.seeds.join(",")).split(",").map(Number);
  const names = (a.strategies ?? bc.strategies.join(",")).split(",").filter(Boolean) as StrategyName[];
  for (const s of names) if (!STRATEGIES.includes(s)) fail(`unknown strategy ${s}; strategies are ${STRATEGIES.join(", ")}`);
  const rules = rulesFor(map);
  let probes: ProbeRealm[] = [];
  try {
    probes = pickProbes(rules, map, bc, a.probes ? a.probes.split(",").filter(Boolean) : undefined);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  const plan: RunSetPlan = { map, years, seeds, probes, strategies: names };
  const jobs: Job[] = planRunSet(plan, config).map((options) => ({ kind: "probe", options }));
  const levers: Lever[] = [];
  const missing: string[] = [];
  if (a.sweep) {
    for (const path of sweepLevers(a.levers ?? (bc.sweep.levers as string | string[]))) {
      if (!leverExists(path, rules)) missing.push(path);
      else for (const factor of bc.sweep.factors) levers.push({ path, factor });
    }
    for (const lever of levers) jobs.push(...planRunSet(plan, config, lever).map((options): Job => ({ kind: "probe", options })));
  }
  console.log(`${jobs.length} balance run(s) of ${years} years on the ${map} map (probes ${probes.map((p) => `${p.realm} ${p.band}`).join(", ")}${levers.length ? `; ${levers.length / bc.sweep.factors.length} lever(s) swept` : ""}), ${threads} at a time → ${out}`);
  const results = (await runJobs(jobs, threads, progress)) as ProbeResult[];
  const base = assembleRunSet(plan, results);
  const checks = runChecks(base, bc);
  let sweep: SweepSummary | null = null;
  if (a.sweep) {
    const runs = levers.map((l) => leverRun(base, assembleRunSet(plan, results, l), bc));
    sweep = { runs, flags: flagLevers(runs, bc.sweep), missing };
  }
  const hints = leverHints(checks, sweep?.runs ?? [], sweep?.flags ?? [], bc.check_levers as Record<string, string>);
  const endYear = Math.max(...base.runs.map((r) => r.recording.world.at(-1)?.year ?? 0));
  const findings: Finding[] = [...results.flatMap((r) => r.findings), ...checkFindings(checks, endYear, hints), ...(sweep?.flags ?? []).filter((f) => f.kind !== "missing").map((f): Finding => ({ severity: "note", kind: `lever_${f.kind}`, year: endYear, text: f.text }))];
  mkdirSync(out, { recursive: true });
  for (const r of base.runs) {
    const { recording, ...rest } = r;
    const probeIds = new Set(r.strategy === "court" ? probes.map((p) => p.realm) : [r.realm]);
    writeFileSync(join(out, `run-${r.strategy}${r.realm ? `-${r.realm}` : ""}-seed-${r.seed}.json`), JSON.stringify({ ...rest, recording: { ...recording, realms: recording.realms.filter((x) => probeIds.has(x.realm)), returns: Object.fromEntries(Object.entries(recording.returns).filter(([k]) => probeIds.has(k))) } }));
  }
  writeFileSync(join(out, "metrics.csv"), metricsCsv([base]));
  writeFileSync(join(out, "world.csv"), worldCsv([base]));
  const title = `Strategy runs, ${years} years`;
  writeFileSync(join(out, "summary.json"), JSON.stringify({ title, map, years, seeds, probes, strategies: names, checks, levers: sweep, hints, findings }, null, 2));
  writeFileSync(join(out, "report.md"), strategyReport(title, base, checks, hints, findings, sweep));
  console.log(`Report: ${join(out, "report.md")}`);
  const failed = checks.filter((c) => c.verdict === "fail").map((c) => c.id);
  const broken = findings.filter((f) => f.severity === "broken").length;
  if (failed.length || broken) {
    console.log(`${failed.length ? `Failed: ${failed.join(", ")}` : ""}${failed.length && broken ? "; " : ""}${broken ? `${broken} broken run finding(s)` : ""}.`);
    process.exitCode = 1;
  }
}

function progress(r: JobResult, left: number): void {
  if (r.kind === "history") {
    console.log(`  history seed ${r.seed}: to ${r.endYear} in ${Math.round(r.seconds)} s, ${r.checkpoints.length} checkpoint(s)${r.error ? `, stopped: ${r.error}` : ""}; ${left} left`);
    return;
  }
  const what = r.kind === "campaign" ? `campaign seed ${r.seed}` : r.kind === "breaker" ? `bot as ${r.realm}` : `${r.strategy}${r.realm ? ` as ${r.realm}` : ""} seed ${r.seed}${r.lever ? ` (${r.lever.path} × ${r.lever.factor})` : ""}`;
  const broken = r.findings.filter((f) => f.severity === "broken").length;
  console.log(`  ${what}: ${r.weeks} weeks in ${Math.round(r.seconds)} s, ${r.findings.length} finding(s)${broken ? `, ${broken} broken` : ""}; ${left} left`);
}

function write(title: string, cs: CampaignResult[], bs: BreakerResult[]): void {
  mkdirSync(out, { recursive: true });
  for (const c of cs) writeFileSync(join(out, `campaign-seed-${c.seed}.json`), JSON.stringify(c));
  for (const b of bs) writeFileSync(join(out, `bot-${b.realm}.json`), JSON.stringify(b));
  const findings = [...cs.flatMap((c) => c.findings), ...bs.flatMap((b) => b.findings)];
  writeFileSync(join(out, "summary.json"), JSON.stringify({ title, map, years, campaigns: cs.map((c) => c.seed), realms: bs.map((b) => b.realm), findings }, null, 2));
  writeFileSync(join(out, "report.md"), markdownReport(title, cs, bs));
  console.log(`Report: ${join(out, "report.md")}`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
