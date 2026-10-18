// Balance runs from the command line (feedback 130). Nothing here runs on its
// own: CI only tests the tools on a few weeks of a made-up world.
//
//   pnpm --filter @ph/sim campaign [--years 50] [--seeds 1,2,3] [--map real|synthetic] [--jobs 4] [--out DIR]
//   pnpm --filter @ph/sim breaker  (--realms france,castile | --all) [--years 50] [--seed 1] [--map real] [--jobs 4] [--out DIR]
//
// Each run writes report.md (read this first), summary.json and one JSON
// file per campaign or realm into DIR (default packages/sim/out/<time>-<command>).
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { BreakerResult } from "./breaker.ts";
import type { CampaignResult } from "./campaign.ts";
import { simConfig } from "./config.ts";
import { runJobs, type Job } from "./jobs.ts";
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
  },
});

const config = simConfig();
const years = Number(a.years ?? config.run.years);
const map = (a.map ?? config.run.map) as MapKind;
const threads = Number(a.jobs ?? Math.max(1, Math.min(4, availableParallelism() - 1)));
if (map !== "real" && map !== "synthetic") fail(`--map is real or synthetic, not ${map}`);
if (!(years > 0)) fail("--years must be a number above 0");

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const out = a.out ?? join(new URL("..", import.meta.url).pathname, "out", `${stamp}-${command}`);

if (command === "campaign") await campaigns();
else if (command === "breaker") await breakers();
else fail("usage: cli.ts campaign|breaker [options]; see the top of src/cli.ts");

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

function progress(r: CampaignResult | BreakerResult, left: number): void {
  const what = r.kind === "campaign" ? `campaign seed ${r.seed}` : `bot as ${r.realm}`;
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
