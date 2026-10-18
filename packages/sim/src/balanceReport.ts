import { LEDGER } from "@ph/engine";
import { BANDS, outcomes, type CheckResult, type LeverFlag, type LeverHint, type LeverRun, type RunSet, type Verdict } from "./balance.ts";
import { pct, type Finding } from "./findings.ts";
import { PATHS, type RealmYear, type WorldYear } from "./metrics.ts";
import { STRATEGY_LABEL, type StrategyName } from "./strategies.ts";

/** What a sweep found, for the report. */
export interface SweepSummary {
  runs: LeverRun[];
  flags: LeverFlag[];
  /** Levers named that the rules data does not have yet. */
  missing: string[];
}

const MARK: Record<Verdict, string> = { pass: "Pass", warn: "Warn", fail: "**Fail**", skip: "Not measured" };

/**
 * The strategy runs' report (BAL-025, BAL-026), read first on a phone: At a
 * glance opens with the war-price checks and one sentence per failure naming
 * the lever most likely to fix it; then the strategy comparison with every
 * check's verdict, value and line, the flagged levers and the largest gaps.
 * Tables keep to five narrow columns so they fit a phone held either way.
 */
export function strategyReport(title: string, set: RunSet, checks: readonly CheckResult[], hints: Record<string, LeverHint>, findings: readonly Finding[], sweep: SweepSummary | null): string {
  const L: string[] = [`# ${title}`, ""];
  const scripted = set.runs.filter((r) => r.strategy !== "court").length;
  const court = set.runs.length - scripted;
  L.push(`${set.runs.length} balance runs of ${set.years} years: ${set.probes.length} probe realm${set.probes.length === 1 ? "" : "s"} × ${set.strategies.map((s) => STRATEGY_LABEL[s]).join(", ")} × seeds ${set.seeds.join(", ")} (${scripted} scripted, ${court} AI-only for Court)${set.map === "synthetic" ? ", on a small made-up world (not the real map)" : ""}.${sweep ? ` A lever sweep added ${sweep.runs.length} run sets.` : ""}`, "");

  L.push("## At a glance", "");
  const ordered = [...checks.filter((c) => c.warPrice), ...checks.filter((c) => !c.warPrice)];
  L.push("War-price checks first (BAL-014 to BAL-017), then the others.", "");
  for (const c of ordered) {
    const hint = c.verdict === "fail" && hints[c.id] ? ` Likely lever: \`${hints[c.id]!.lever}\` (${hints[c.id]!.from}).` : "";
    L.push(`- ${MARK[c.verdict]}: ${c.name} (${c.id}). ${c.text}${hint}`);
  }
  L.push("");
  const broken = findings.filter((f) => f.severity === "broken");
  if (broken.length) {
    L.push(`**Broken: ${broken.length}** (the run stopped; its metrics up to then are kept)`, "");
    for (const f of broken.slice(0, 20)) L.push(`- ${f.year}: ${f.text}`);
    if (broken.length > 20) L.push(`- …and ${broken.length - 20} more in summary.json.`);
    L.push("");
  }

  L.push("## Strategy comparison", "", "### Checks", "");
  L.push("| Check | Verdict | Value | Line |", "|---|---|---|---|");
  for (const c of ordered) L.push(`| ${c.id} ${c.name} | ${MARK[c.verdict]} | ${c.shown} | ${c.line} |`);
  L.push("");

  const os = outcomes(set);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : null);
  const cell = (x: number | null, f = (v: number) => String(Math.round(v))) => (x === null ? "–" : f(x));
  const strategies = set.strategies;
  L.push("### Score growth by size band", "", "Mean of the Economy, Power and Technology changes over the run, 100 = held its own (D-BAL-1).", "");
  L.push(`| Band | ${strategies.map((s) => STRATEGY_LABEL[s]).join(" | ")} |`, `|---|${strategies.map(() => "---").join("|")}|`);
  const growth = (band: string, s: StrategyName) => mean(os.filter((o) => o.band === band && o.strategy === s).map((o) => o.growth));
  for (const b of BANDS) if (set.probes.some((p) => p.band === b)) L.push(`| ${b} | ${strategies.map((s) => cell(growth(b, s))).join(" | ")} |`);
  L.push("");

  const gaps: { band: string; a: StrategyName; b: StrategyName; gap: number }[] = [];
  for (const band of BANDS)
    for (const a of strategies)
      for (const b of strategies) {
        const ga = growth(band, a);
        const gb = growth(band, b);
        if (a !== b && ga !== null && gb !== null && ga > gb) gaps.push({ band, a, b, gap: ga - gb });
      }
  gaps.sort((x, y) => y.gap - x.gap);
  if (gaps.length) {
    L.push("### Largest gaps", "");
    for (const g of gaps.slice(0, 3)) L.push(`- ${g.band}: ${STRATEGY_LABEL[g.a]} grows ${Math.round(g.gap)} points more than ${STRATEGY_LABEL[g.b]}.`);
    L.push("");
  }

  L.push("### Return on gold", "", "Percent of the path's score gained per 100 gold spent on it (war: Power, works: Economy, learning: Technology, diplomacy: subjects' Power), mean over the probe realms' runs. Court counts ledger spending only.", "");
  L.push(`| Strategy | ${PATHS.map((p) => p[0]!.toUpperCase() + p.slice(1)).join(" | ")} |`, `|---|${PATHS.map(() => "---").join("|")}|`);
  for (const s of strategies) {
    const ret = (p: (typeof PATHS)[number]) => mean(os.filter((o) => o.strategy === s).map((o) => o.run.recording.returns[o.realm]?.per100[p] ?? null).filter((x): x is number => x !== null));
    L.push(`| ${STRATEGY_LABEL[s]} | ${PATHS.map((p) => cell(ret(p), (v) => v.toFixed(1))).join(" | ")} |`);
  }
  L.push("");

  L.push("### Probe realms at the end", "", "Mean over the seeds; provinces from the start in brackets.", "");
  L.push("| Realm | Strategy | Provinces | Growth | Wars won/lost |", "|---|---|---|---|---|");
  for (const p of set.probes)
    for (const s of strategies) {
      const mine = os.filter((o) => o.realm === p.realm && o.strategy === s);
      if (!mine.length) continue;
      const prov = mean(mine.map((o) => o.end?.provinces ?? 0));
      const won = mine.reduce((t, o) => t + o.rows.reduce((u, r) => u + r.warsWon, 0), 0);
      const lost = mine.reduce((t, o) => t + o.rows.reduce((u, r) => u + r.warsLost, 0), 0);
      L.push(`| ${p.realm} (${p.band}) | ${STRATEGY_LABEL[s]} | ${cell(prov)} (${p.settled}) | ${cell(mean(mine.map((o) => o.growth)))} | ${won}/${lost} |`);
    }
  L.push("");

  if (sweep) {
    L.push("### Levers", "");
    if (!sweep.flags.length) L.push("No lever was flagged dead or sensitive.", "");
    else {
      L.push("| Lever | Flag | Target | Change |", "|---|---|---|---|");
      for (const f of sweep.flags) L.push(`| \`${f.lever}\` | ${f.kind} | ${f.target.replace(/_/g, " ")} | ${f.change === null ? "–" : pct(f.change)} |`);
      L.push("");
    }
    if (sweep.missing.length) L.push(`Not in the rules data yet, so not swept: ${sweep.missing.map((m) => `\`${m}\``).join(", ")}.`, "");
  }

  const world = set.runs.find((r) => r.strategy === "court")?.recording.world ?? set.runs[0]?.recording.world ?? [];
  if (world.length) {
    L.push("### The world (Court, first seed)", "");
    L.push("| Year | Realms | Largest | Wars begun/ended | Leagues |", "|---|---|---|---|---|");
    const step = Math.max(1, Math.round(world.length / 10));
    for (const [i, w] of world.entries()) if (i % step === 0 || i === world.length - 1) L.push(`| ${w.year} | ${w.realmsAlive} | ${w.largestRealm} ${pct(w.largestShare)} | ${w.warsStarted}/${w.warsEnded} | ${w.leagues} |`);
    L.push("");
  }

  const refused = new Map<string, { count: number; reason: string }>();
  for (const r of set.runs) for (const [type, x] of Object.entries(r.rejected)) {
    const e = refused.get(type) ?? { count: 0, reason: x.reason };
    e.count += x.count;
    refused.set(type, e);
  }
  if (refused.size) {
    L.push("### Orders the game refused the probes", "", "Not faults by themselves: a script tries what a player could tap.", "");
    L.push("| Order | Times | First reason given |", "|---|---|---|");
    for (const [type, x] of [...refused].sort((a, b) => b[1].count - a[1].count)) L.push(`| ${type} | ${x.count} | ${x.reason} |`);
    L.push("");
  }
  L.push("`metrics.csv` (a row per realm, run and year) and `world.csv` (a row per run and year) hold every number behind these tables; an empty cell is a number the engine does not keep yet.", "");
  return L.join("\n");
}

// ---------------------------------------------------------------- CSV

const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "1" : "0";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const REALM_COLUMNS: (keyof RealmYear)[] = ["provinces", "settled", "subjectProvinces", "people", "economy", "power", "technology", "subjectsPower", "treasury", "debt", "income", "soldiers", "lostBattle", "lostHunger", "lostSickness", "lostDesertion", "warsDeclared", "warsJoined", "warsWon", "warsLost", "landsTaken", "notoriety", "leaguesAgainst", "leagueSoldiers", "neighbourStanding", "weakestPillar", "weakestStep", "rebelsRisen", "inventions", "atWar"];

const runColumns = (r: RunSet["runs"][number]) => [r.strategy, r.realm, r.seed, r.lever?.path ?? "", r.lever?.factor ?? ""];

/** metrics.csv: one row per realm, run and year (BAL-025); empty cells are numbers the engine does not keep yet. */
export function metricsCsv(sets: readonly RunSet[]): string {
  const head = ["realm", "run", "year", "strategy", "probe", "seed", "lever", "factor", ...REALM_COLUMNS, ...LEDGER.map((l) => `ledger_${l.replace(/ /g, "_")}`)];
  const out = [head.join(",")];
  for (const set of sets)
    for (const r of set.runs)
      for (const x of r.recording.realms) out.push([x.realm, x.run, x.year, ...runColumns(r), ...REALM_COLUMNS.map((k) => x[k]), ...LEDGER.map((l) => x.ledger[l])].map(csvCell).join(","));
  return out.join("\n") + "\n";
}

const WORLD_COLUMNS: (keyof WorldYear)[] = ["realmsAlive", "largestRealm", "largestShare", "changedByWar", "changedByDemand", "changedByDiplomacy", "warsStarted", "warsEnded", "endedLand", "endedWhite", "endedObliged", "endedExhaustion", "meanWarMonths", "leagues", "leagueThreshold", "occupationYield"];

/** world.csv: one row per run and year. */
export function worldCsv(sets: readonly RunSet[]): string {
  const out = [["run", "year", "strategy", "probe", "seed", "lever", "factor", ...WORLD_COLUMNS].join(",")];
  for (const set of sets) for (const r of set.runs) for (const w of r.recording.world) out.push([w.run, w.year, ...runColumns(r), ...WORLD_COLUMNS.map((k) => w[k])].map(csvCell).join(","));
  return out.join("\n") + "\n";
}
