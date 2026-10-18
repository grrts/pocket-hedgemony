import type { Ruleset } from "@ph/rules";
import * as dip from "@ph/engine/domain/diplomacy";
import type { BalanceConfig, SimConfig } from "./config.ts";
import { pct, type Finding } from "./findings.ts";
import type { Lever } from "./levers.ts";
import { scoreGrowth, type RealmYear } from "./metrics.ts";
import type { ProbeOptions, ProbeResult } from "./probe.ts";
import { STRATEGIES, STRATEGY_LABEL, type StrategyName } from "./strategies.ts";
import type { MapKind } from "./world.ts";

/**
 * The balance model's checker and sweeper (BAL-013 to BAL-024): turns a run
 * set's recordings into each strategy's results, evaluates the checks with
 * their thresholds from config.json (balance.checks) and compares lever
 * sweeps with the base set. Every check is a plain function of a few numbers,
 * so its verdict logic can be tested on hand-built samples.
 */

export type Band = "large" | "medium" | "small";
export const BANDS: readonly Band[] = ["large", "medium", "small"];

export interface ProbeRealm {
  realm: string;
  band: Band;
  /** Settled provinces in 1444. */
  settled: number;
}

/** Every run of one report (INV-BAL-1: same rules data and build; a sweep's sets differ in one lever). */
export interface RunSet {
  map: MapKind;
  years: number;
  seeds: number[];
  probes: ProbeRealm[];
  strategies: StrategyName[];
  lever: Lever | null;
  runs: ProbeResult[];
}

/** One probe realm, seed and strategy: how its scores moved and what each path returned. */
export interface Outcome {
  realm: string;
  band: Band;
  seed: number;
  strategy: StrategyName;
  growth: number;
  start: RealmYear;
  end: RealmYear | undefined;
  rows: RealmYear[];
  run: ProbeResult;
}

/**
 * Probe realms by size band (BAL-007). On the real map, the configured lists;
 * on a made-up world, the largest, middle and smallest realms by settled
 * provinces. Realms named on the command line keep their configured band, or
 * take the band of their third of the ranking by settled provinces.
 */
export function pickProbes(rules: Ruleset, map: MapKind, c: BalanceConfig, named?: readonly string[]): ProbeRealm[] {
  const settled = new Map<string, number>(rules.nations.map((n) => [n.id, 0]));
  for (const p of rules.provinces) if (p.owner && p.population > 0 && settled.has(p.owner)) settled.set(p.owner, settled.get(p.owner)! + 1);
  const ranked = [...settled].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const bandOf = (id: string): Band => {
    const i = ranked.findIndex(([r]) => r === id);
    return i < ranked.length / 3 ? "large" : i < (2 * ranked.length) / 3 ? "medium" : "small";
  };
  const probe = (realm: string, band: Band): ProbeRealm => {
    if (!settled.has(realm)) throw new Error(`unknown realm ${realm}; realms are ids such as ${ranked.slice(0, 3).map(([r]) => r).join(", ")}`);
    return { realm, band, settled: settled.get(realm)! };
  };
  // A realm named on the command line keeps its configured band, if it has one.
  const configured = (r: string) => (map === "real" ? BANDS.find((b) => (c.probes as Record<Band, string[]>)[b].includes(r)) : undefined);
  if (named?.length) return named.map((r) => probe(r, configured(r) ?? bandOf(r)));
  if (map === "real") return BANDS.flatMap((b) => (c.probes as Record<Band, string[]>)[b].map((r) => probe(r, b)));
  const k = c.synthetic_probes_per_band;
  const mid = Math.max(0, Math.floor(ranked.length / 2 - k / 2));
  return [...ranked.slice(0, k).map(([r]) => probe(r, "large")), ...ranked.slice(mid, mid + k).map(([r]) => probe(r, "medium")), ...ranked.slice(-k).map(([r]) => probe(r, "small"))];
}

export interface RunSetPlan {
  map: MapKind;
  years: number;
  seeds: number[];
  probes: ProbeRealm[];
  strategies: StrategyName[];
}

/** The runs of a set (BAL-003): every seed for every probe realm and strategy, the same seeds for all; one AI-only Court run per seed serves every probe realm. */
export function planRunSet(plan: RunSetPlan, config: SimConfig, lever: Lever | null = null): ProbeOptions[] {
  const out: ProbeOptions[] = [];
  for (const seed of plan.seeds)
    for (const strategy of plan.strategies) {
      if (strategy === "court") out.push({ strategy, realm: "", seed, years: plan.years, map: plan.map, config, lever });
      else for (const p of plan.probes) out.push({ strategy, realm: p.realm, seed, years: plan.years, map: plan.map, config, lever });
    }
  return out;
}

/** The runs of one set, from all results (a sweep's sets are told apart by their lever). */
export function assembleRunSet(plan: RunSetPlan, results: readonly ProbeResult[], lever: Lever | null = null): RunSet {
  const same = (l: Lever | null) => (l === null ? lever === null : !!lever && l.path === lever.path && l.factor === lever.factor);
  const runs = results.filter((r) => same(r.lever)).sort((a, b) => a.seed - b.seed || STRATEGIES.indexOf(a.strategy) - STRATEGIES.indexOf(b.strategy) || a.realm.localeCompare(b.realm));
  return { ...plan, lever, runs };
}

/** Each probe realm's result under each strategy and seed. A Court run is the AI-only world of its seed, read for every probe realm. */
export function outcomes(set: RunSet): Outcome[] {
  const out: Outcome[] = [];
  for (const run of set.runs) {
    const probes = run.strategy === "court" ? set.probes : set.probes.filter((p) => p.realm === run.realm);
    for (const p of probes) {
      const rows = run.recording.realms.filter((r) => r.realm === p.realm);
      const start = rows[0];
      if (!start) continue;
      const end = rows[rows.length - 1]!;
      // A realm with no row in the last year lost all its land.
      const gone = run.recording.world.length > 0 && end.year < run.recording.world[run.recording.world.length - 1]!.year;
      out.push({ realm: p.realm, band: p.band, seed: run.seed, strategy: run.strategy, growth: gone ? 0 : scoreGrowth(start, end, run.recording.scales), start, end: gone ? undefined : end, rows, run });
    }
  }
  return out;
}

// ---------------------------------------------------------------- verdicts

export type Verdict = "pass" | "warn" | "fail" | "skip";
const WORSE: Verdict[] = ["skip", "pass", "warn", "fail"];
export const worst = (...vs: Verdict[]): Verdict => vs.reduce((a, b) => (WORSE.indexOf(b) > WORSE.indexOf(a) ? b : a), "skip");

/** A number that must stay at or under `max`: warn within a fifth of it (BAL §5.4). */
export const atMost = (value: number, max: number, within = 0.2): Verdict => (value > max ? "fail" : value > max * (1 - within) ? "warn" : "pass");
/** A number that must reach `min`: warn within a fifth above it. */
export const atLeast = (value: number, min: number, within = 0.2): Verdict => (value < min ? "fail" : value < min * (1 + within) ? "warn" : "pass");
/** A number that must lie in [lo, hi]: warn within a fifth of the range of either edge. */
export const between = (value: number, lo: number, hi: number, within = 0.2): Verdict => (value < lo || value > hi ? "fail" : value < lo + (hi - lo) * within || value > hi - (hi - lo) * within ? "warn" : "pass");

export interface CheckResult {
  id: string;
  name: string;
  verdict: Verdict;
  /** The number the verdict turns on, and how it reads. */
  value: number | null;
  shown: string;
  /** The line, as it reads. */
  line: string;
  /** One plain sentence. */
  text: string;
  /** War-price checks (BAL-014 to BAL-017) lead At a glance (BAL-026). */
  warPrice: boolean;
  /** The sweep target that measures what this check reads, for naming its lever. */
  target: string;
}

type Cc = BalanceConfig["checks"];
const skip = (id: string, name: string, line: string, why: string, warPrice: boolean, target: string): CheckResult => ({ id, name, verdict: "skip", value: null, shown: "–", line, text: why, warPrice, target });
const x2 = (v: number) => `${v.toFixed(2)}×`;

/** BAL-013: no strategy ranks first, on the sum of its three score ranks, in more than dominance_share of the (probe realm, seed) pairs. */
export function checkDominance(firsts: Partial<Record<StrategyName, number>>, pairs: number, c: Cc): CheckResult {
  const name = "No strategy dominates";
  const line = `≤ ${pct(c.dominance_share)}`;
  if (!pairs) return skip("BAL-013", name, line, "No pair of probe realm and seed was played by two strategies.", false, "score_growth");
  const [top, n] = Object.entries(firsts).sort((a, b) => b[1]! - a[1]!)[0] ?? ["", 0];
  const share = n! / pairs;
  const v = atMost(share, c.dominance_share, c.warn_within);
  return { id: "BAL-013", name, verdict: v, value: share, shown: pct(share), line, text: `${STRATEGY_LABEL[top as StrategyName] ?? top} ranks first in ${n} of ${pairs} pairs (${pct(share)}).`, warPrice: false, target: "score_growth" };
}

/** BAL-014, one band: the Conqueror's mean score growth against the better of Builder and Diplomat, and the Diplomat's against the Conqueror's. */
export interface BandGrowth {
  band: Band;
  conqueror: number | null;
  builder: number | null;
  diplomat: number | null;
}

export function checkWarPath(bands: readonly BandGrowth[], c: Cc): CheckResult {
  const name = "War is not the best path";
  const line = `edge ≤ ${pct(c.war_edge)}, Diplomat ≥ ${pct(c.diplomacy_floor)}`;
  let verdict: Verdict = "skip";
  let worstEdge: { band: Band; edge: number } | null = null;
  let worstFloor: { band: Band; floor: number } | null = null;
  for (const b of bands) {
    if (b.conqueror === null) continue;
    const others = [b.builder, b.diplomat].filter((x): x is number => x !== null);
    if (others.length) {
      const edge = b.conqueror / Math.max(1, Math.max(...others)) - 1;
      verdict = worst(verdict, atMost(edge, c.war_edge, c.warn_within));
      if (!worstEdge || edge > worstEdge.edge) worstEdge = { band: b.band, edge };
    }
    if (b.diplomat !== null) {
      const floor = b.diplomat / Math.max(1, b.conqueror);
      verdict = worst(verdict, atLeast(floor, c.diplomacy_floor, c.warn_within));
      if (!worstFloor || floor < worstFloor.floor) worstFloor = { band: b.band, floor };
    }
  }
  if (verdict === "skip") return skip("BAL-014", name, line, "No size band has Conqueror runs beside Builder or Diplomat runs.", true, "conqueror_growth");
  const parts = [worstEdge ? `the Conqueror grows ${pct(worstEdge.edge)} more than the best peaceful strategy in the ${worstEdge.band} band` : "", worstFloor ? `the Diplomat reaches ${pct(worstFloor.floor)} of the Conqueror's growth in the ${worstFloor.band} band` : ""].filter(Boolean);
  const text = parts.join("; ").replace(/^./, (ch) => ch.toUpperCase()) + ".";
  return { id: "BAL-014", name, verdict, value: worstEdge?.edge ?? null, shown: worstEdge ? pct(worstEdge.edge) : "–", line, text, warPrice: true, target: "conqueror_growth" };
}

/** BAL-015: in Conqueror runs, war's return on gold against the best other path; and what occupied land yields its occupier against its owner (WAR-224). */
export function checkWarPaid(war: number | null, bestOther: number | null, occupationYield: number | null, c: Cc): CheckResult {
  const name = "War is paid for";
  const line = `edge ≤ ${pct(c.war_return_edge)}, occupation < 1×`;
  if (war === null && occupationYield === null) return skip("BAL-015", name, line, "No Conqueror run spent gold on war or held enemy land.", true, "war_return");
  let verdict: Verdict = "skip";
  let edge: number | null = null;
  const parts: string[] = [];
  if (war !== null) {
    if (bestOther !== null && bestOther > 0) {
      edge = war / bestOther - 1;
      verdict = worst(verdict, atMost(edge, c.war_return_edge, c.warn_within));
      parts.push(`War returns ${war.toFixed(2)} per 100 gold against ${bestOther.toFixed(2)} for the best other path (${pct(edge)} more)`);
    } else if (war > 0) {
      verdict = "fail";
      parts.push(`War returns ${war.toFixed(2)} per 100 gold while no other path gained anything`);
    } else parts.push(`War returns ${war.toFixed(2)} per 100 gold`);
  }
  if (occupationYield !== null) {
    verdict = worst(verdict, occupationYield >= 1 ? "fail" : occupationYield >= 1 - c.warn_within ? "warn" : "pass");
    parts.push(`occupied land yields its occupier ${x2(occupationYield)} what its owner would collect`);
  }
  return { id: "BAL-015", name, verdict: verdict === "skip" ? "pass" : verdict, value: edge, shown: edge === null ? (occupationYield === null ? "–" : x2(occupationYield)) : pct(edge), line, text: parts.join("; ") + ".", warPrice: true, target: "war_return" };
}

/** BAL-016: of the Conqueror runs whose Lands taken passed the league threshold, those where a league formed within the window, and the neighbours' lowest mean standing there. */
export function checkConquestAnswered(passed: number, answered: number, coldEnough: number, c: Cc): CheckResult {
  const name = "Conquest is answered";
  const line = `≥ ${pct(c.league_share)}, standing < ${c.standing_below}`;
  if (!passed) return skip("BAL-016", name, line, "No Conqueror run took enough land to pass the era's league threshold.", true, "league_share");
  const share = answered / passed;
  const v = worst(atLeast(share, c.league_share, c.warn_within), coldEnough < passed ? "fail" : "pass");
  return { id: "BAL-016", name, verdict: v, value: share, shown: pct(share), line, text: `A league formed within ${c.league_within_years} years in ${answered} of ${passed} runs that passed the threshold (${pct(share)}); neighbours turned colder than ${c.standing_below} in ${coldEnough}.`, warPrice: true, target: "league_share" };
}

/** BAL-017, one run: wars that lasted past the long-war mark, those ended by an obliged peace and those by the exhaustion peace. */
export interface RunWars {
  long: number;
  obliged: number;
  exhaustion: number;
}

export function checkWarsEnd(runs: readonly RunWars[], c: Cc): CheckResult {
  const name = "Wars end";
  const line = `obliged ≥ ${pct(c.voices_share)}, exhaustion ≤ ${pct(c.exhaustion_share)}`;
  const counted = runs.filter((r) => r.long > 0);
  if (!counted.length) return skip("BAL-017", name, line, `No war lasted over ${c.long_war_months} months.`, true, "obliged_share");
  const obliged = Math.min(...counted.map((r) => r.obliged / r.long));
  const exhaustion = Math.max(...counted.map((r) => r.exhaustion / r.long));
  const v = worst(atLeast(obliged, c.voices_share, c.warn_within), atMost(exhaustion, c.exhaustion_share, c.warn_within));
  return { id: "BAL-017", name, verdict: v, value: obliged, shown: pct(obliged), line, text: `In the worst run ${pct(obliged)} of long wars ended by an obliged peace; in the worst ${pct(exhaustion)} ran to the exhaustion peace.`, warPrice: true, target: "obliged_share" };
}

/** BAL-018: the top size decile's growth in share of settled land over the median realm's, worst run; and seeds where an AI realm held over max_share_1544 by 1544 (null when no run reached 1544). */
export function checkSnowball(ratio: number | null, over1544: { seeds: number; over: number } | null, c: Cc): CheckResult {
  const name = "No snowball";
  const line = `≤ ${x2(c.snowball_edge)}; ≤ ${pct(c.max_share_1544)} by 1544`;
  if (ratio === null) return skip("BAL-018", name, line, "No run recorded the realms' land.", false, "largest_share");
  let v = atMost(ratio, c.snowball_edge, c.warn_within);
  let tail = " (1544 not reached)";
  if (over1544 && over1544.seeds) {
    v = worst(v, atMost(over1544.over / over1544.seeds, c.max_share_seeds, c.warn_within));
    tail = `; an AI realm held over ${pct(c.max_share_1544)} of settled land by 1544 in ${over1544.over} of ${over1544.seeds} seeds`;
  }
  return { id: "BAL-018", name, verdict: v, value: ratio, shown: x2(ratio), line, text: `The largest tenth of realms grew their share of settled land ${x2(ratio)} as fast as the median realm${tail}.`, warPrice: false, target: "largest_share" };
}

/** BAL-019: realms alive in 1544 as a share of 1444 (null when no run reached 1544). */
export function checkPace(alive1444: number | null, alive1544: number | null, c: Cc): CheckResult {
  const name = "Believable pace";
  const [lo, hi] = c.alive_1544 as [number, number];
  const line = `${pct(lo)} to ${pct(hi)}`;
  if (!alive1444 || alive1544 === null) return skip("BAL-019", name, line, "No run reached 1544.", false, "realms_alive");
  const share = alive1544 / alive1444;
  return { id: "BAL-019", name, verdict: between(share, lo, hi, c.warn_within), value: share, shown: pct(share), line, text: `${Math.round(alive1544)} of ${alive1444} realms are alive in 1544 (${pct(share)}).`, warPrice: false, target: "realms_alive" };
}

/** BAL-020: the small band's best strategy's mean growth against the large band's best. */
export function checkSmallPlayable(small: number | null, large: number | null, c: Cc): CheckResult {
  const name = "Every path is open to every size";
  const line = `≥ ${pct(c.small_floor)}`;
  if (small === null || large === null) return skip("BAL-020", name, line, "The run set has no small or no large probe realm.", false, "score_growth");
  const share = small / Math.max(1, large);
  return { id: "BAL-020", name, verdict: atLeast(share, c.small_floor, c.warn_within), value: share, shown: pct(share), line, text: `The small band's best strategy grows ${pct(share)} as much as the large band's best.`, warPrice: false, target: "score_growth" };
}

/** BAL-021: realm-runs that went bankrupt (debt over two years' income) at peace with no rebels. */
export function checkCollapse(bankrupt: number, realmRuns: number, c: Cc): CheckResult {
  const name = "No collapse without cause";
  const line = `≤ ${pct(c.bankrupt_share)}`;
  if (!realmRuns) return skip("BAL-021", name, line, "No realm was recorded.", false, "score_growth");
  const share = bankrupt / realmRuns;
  return { id: "BAL-021", name, verdict: atMost(share, c.bankrupt_share, c.warn_within), value: share, shown: pct(share), line, text: `${bankrupt} of ${realmRuns} realm-runs went bankrupt at peace with no rebels (${pct(share)}).`, warPrice: false, target: "score_growth" };
}

// ---------------------------------------------------------------- gathering

const mean = (xs: readonly number[]): number | null => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : null);
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1]! : 0;
};

/** The strategy ranking first on the sum of its three score ranks, for each (probe realm, seed) pair played by two strategies or more. */
export function firstsByPair(os: readonly Outcome[]): Map<string, StrategyName> {
  const pairs = new Map<string, Outcome[]>();
  for (const o of os) {
    const k = `${o.realm}|${o.seed}`;
    if (!pairs.has(k)) pairs.set(k, []);
    pairs.get(k)!.push(o);
  }
  const out = new Map<string, StrategyName>();
  for (const [k, group] of pairs) {
    if (group.length < 2) continue;
    const score = (o: Outcome, s: "economy" | "power" | "technology") => o.end?.[s] ?? -Infinity;
    const rank = (o: Outcome, s: "economy" | "power" | "technology") => 1 + group.filter((g) => score(g, s) > score(o, s)).length;
    const sums = group.map((o) => ({ o, sum: rank(o, "economy") + rank(o, "power") + rank(o, "technology") }));
    sums.sort((a, b) => a.sum - b.sum || STRATEGIES.indexOf(a.o.strategy) - STRATEGIES.indexOf(b.o.strategy));
    out.set(k, sums[0]!.o.strategy);
  }
  return out;
}

export function bandGrowth(os: readonly Outcome[]): BandGrowth[] {
  return BANDS.map((band) => {
    const g = (s: StrategyName) => mean(os.filter((o) => o.band === band && o.strategy === s).map((o) => o.growth));
    return { band, conqueror: g("conqueror"), builder: g("builder"), diplomat: g("diplomat") };
  });
}

const coolMin = (word: string): number => dip.config.ledger.standing_words.find((w) => w.word.toLowerCase() === word.toLowerCase())?.min ?? -29;

/** All checks over a run set (BAL-013 to BAL-021). */
export function runChecks(set: RunSet, c: BalanceConfig): CheckResult[] {
  const cc = c.checks;
  const os = outcomes(set);
  const conq = os.filter((o) => o.strategy === "conqueror");
  const out: CheckResult[] = [];

  const firsts = firstsByPair(os);
  const count: Partial<Record<StrategyName, number>> = {};
  for (const s of firsts.values()) count[s] = (count[s] ?? 0) + 1;
  out.push(checkDominance(count, firsts.size, cc));

  out.push(checkWarPath(bandGrowth(os), cc));

  const ret = (o: Outcome, p: "war" | "works" | "learning" | "diplomacy") => o.run.recording.returns[o.realm]?.per100[p] ?? null;
  const warR = conq.map((o) => ret(o, "war")).filter((x): x is number => x !== null);
  const others = (["works", "learning", "diplomacy"] as const).map((p) => mean(conq.map((o) => ret(o, p)).filter((x): x is number => x !== null))).filter((x): x is number => x !== null);
  const yields = conq.flatMap((o) => o.run.recording.world.map((w) => w.occupationYield)).filter((x): x is number => x !== null);
  out.push(checkWarPaid(mean(warR), others.length ? Math.max(...others) : null, mean(yields), cc));

  let passed = 0;
  let answered = 0;
  let cold = 0;
  for (const o of conq) {
    const world = o.run.recording.world;
    const at = o.rows.find((r) => r.landsTaken >= (world.find((w) => w.year === r.year)?.leagueThreshold ?? Infinity));
    if (!at) continue;
    passed++;
    const window = o.rows.filter((r) => r.year >= at.year && r.year <= at.year + cc.league_within_years);
    if (window.some((r) => r.leaguesAgainst > 0)) answered++;
    const lows = window.map((r) => r.neighbourStanding).filter((x): x is number => x !== null);
    if (lows.length && Math.min(...lows) < coolMin(cc.standing_below)) cold++;
  }
  out.push(checkConquestAnswered(passed, answered, cold, cc));

  out.push(checkWarsEnd(set.runs.map((r) => runWars(r, cc.long_war_months)), cc));

  const base = set.runs.filter((r) => r.strategy === "court").length ? set.runs.filter((r) => r.strategy === "court") : set.runs;
  const ratios = base.map((r) => snowballRatio(r.recording.realms)).filter((x): x is number => x !== null);
  const probeIds = new Set(set.probes.map((p) => p.realm));
  const reached = base.filter((r) => r.recording.world.some((w) => w.year === 1544));
  const over = reached.filter((r) => r.recording.realms.some((x) => x.year === 1544 && !probeIds.has(x.realm) && x.settled / Math.max(1, settledIn(r.recording.realms, 1544)) > cc.max_share_1544)).length;
  out.push(checkSnowball(ratios.length ? Math.max(...ratios) : null, reached.length ? { seeds: reached.length, over } : null, cc));

  const alive44 = mean(reached.map((r) => r.recording.world[0]!.realmsAlive));
  const alive1544 = mean(reached.map((r) => r.recording.world.find((w) => w.year === 1544)!.realmsAlive));
  out.push(checkPace(alive44, alive1544, cc));

  const bestOf = (band: Band) => {
    const ms = set.strategies.map((s) => mean(os.filter((o) => o.band === band && o.strategy === s).map((o) => o.growth))).filter((x): x is number => x !== null);
    return ms.length ? Math.max(...ms) : null;
  };
  out.push(checkSmallPlayable(bestOf("small"), bestOf("large"), cc));

  let bankrupt = 0;
  let realmRuns = 0;
  for (const r of set.runs) {
    const byRealm = new Map<string, RealmYear[]>();
    for (const x of r.recording.realms) (byRealm.get(x.realm) ?? byRealm.set(x.realm, []).get(x.realm)!).push(x);
    for (const rows of byRealm.values()) {
      realmRuns++;
      if (rows.slice(1).some((x) => isBankrupt(x, cc.bankrupt_years_of_income) && !x.atWar && x.rebelsRisen === 0)) bankrupt++;
    }
  }
  out.push(checkCollapse(bankrupt, realmRuns, cc));
  return out;
}

/** Debt over `years` years' income (any debt with no income). */
export const isBankrupt = (r: Pick<RealmYear, "debt" | "income">, years: number) => r.debt > 0 && (r.income <= 0 || r.debt > years * r.income);

export function runWars(r: ProbeResult, longMonths: number): RunWars {
  const long = r.recording.wars.filter((w) => w.months > longMonths);
  return { long: long.length, obliged: long.filter((w) => w.how === "obliged").length, exhaustion: long.filter((w) => w.how === "exhaustion").length };
}

const settledIn = (rows: readonly RealmYear[], year: number) => rows.filter((r) => r.year === year).reduce((t, r) => t + r.settled, 0);

/** The top tenth of realms by 1444 land: their growth in share of settled land over the median realm's (gone realms count 0). */
export function snowballRatio(rows: readonly RealmYear[]): number | null {
  if (!rows.length) return null;
  const y0 = rows[0]!.year;
  const y1 = rows[rows.length - 1]!.year;
  const t0 = settledIn(rows, y0);
  const t1 = settledIn(rows, y1);
  if (!t0 || !t1) return null;
  const start = rows.filter((r) => r.year === y0 && r.settled > 0).sort((a, b) => b.settled - a.settled);
  const end = new Map(rows.filter((r) => r.year === y1).map((r) => [r.realm, r.settled / t1]));
  const growth = (r: RealmYear) => (end.get(r.realm) ?? 0) / (r.settled / t0);
  const top = start.slice(0, Math.max(1, Math.round(start.length / 10)));
  const topGrowth = top.reduce((t, r) => t + (end.get(r.realm) ?? 0), 0) / top.reduce((t, r) => t + r.settled / t0, 0);
  return topGrowth / Math.max(0.01, median(start.map(growth)));
}

/** Balance findings from failed checks, notes from warnings (BAL-025). */
export function checkFindings(checks: readonly CheckResult[], year: number, levers: Record<string, LeverHint>): Finding[] {
  return checks
    .filter((c) => c.verdict === "fail" || c.verdict === "warn")
    .map((c) => ({ severity: c.verdict === "fail" ? "balance" : "note", kind: c.id, year, text: `${c.id} ${c.name}: ${c.text}${c.verdict === "fail" && levers[c.id] ? ` Likely lever: ${levers[c.id]!.lever} (${levers[c.id]!.from}).` : ""}` }));
}

// ---------------------------------------------------------------- sweeps

export const TARGETS = ["score_growth", "conqueror_growth", "war_return", "obliged_share", "league_share", "realms_alive", "largest_share", "wars_started"] as const;
export type Target = (typeof TARGETS)[number];

/** A sweep target measured over a run set (null when the set has nothing to measure it by). */
export function targetValue(set: RunSet, target: string, c: BalanceConfig): number | null {
  const os = outcomes(set);
  const last = set.runs.map((r) => r.recording.world[r.recording.world.length - 1]).filter((w) => !!w);
  switch (target as Target) {
    case "score_growth":
      return mean(os.map((o) => o.growth));
    case "conqueror_growth":
      return mean(os.filter((o) => o.strategy === "conqueror").map((o) => o.growth));
    case "war_return":
      return mean(os.filter((o) => o.strategy === "conqueror").map((o) => o.run.recording.returns[o.realm]?.per100.war ?? null).filter((x): x is number => x !== null));
    case "obliged_share": {
      const w = set.runs.map((r) => runWars(r, c.checks.long_war_months));
      const long = w.reduce((t, x) => t + x.long, 0);
      return long ? w.reduce((t, x) => t + x.obliged, 0) / long : null;
    }
    case "league_share":
      return runChecks(set, c).find((x) => x.id === "BAL-016")!.value;
    case "realms_alive":
      return mean(last.map((w) => w.realmsAlive));
    case "largest_share":
      return mean(last.map((w) => w.largestShare));
    case "wars_started":
      return mean(set.runs.map((r) => r.recording.world.slice(1).reduce((t, w) => t + w.warsStarted, 0) / Math.max(1, r.recording.world.length - 1)));
    default:
      return null;
  }
}

/** The target a lever is measured by: its own entry, else the longest configured prefix, else the default. */
export function targetOf(lever: string, targets: Record<string, string>): string {
  let best = "";
  for (const k of Object.keys(targets)) if (k !== "default" && (lever === k || lever.startsWith(`${k}.`)) && k.length > best.length) best = k;
  return best ? targets[best]! : (targets.default ?? "score_growth");
}

export interface LeverRun {
  lever: string;
  factor: number;
  target: string;
  base: number | null;
  value: number | null;
  /** |value − base| / |base|; null when either is missing. */
  change: number | null;
  /** Share of (probe realm, seed) pairs whose first strategy differs from the base set's. */
  rankingChange: number | null;
}

export interface LeverFlag {
  lever: string;
  kind: "dead" | "sensitive" | "missing";
  target: string;
  text: string;
  /** The largest change of its target over the factors. */
  change: number | null;
}

export function leverRun(base: RunSet, swept: RunSet, c: BalanceConfig): LeverRun {
  const lever = swept.lever!;
  const target = targetOf(lever.path, c.sweep.targets as Record<string, string>);
  const b = targetValue(base, target, c);
  const v = targetValue(swept, target, c);
  const change = b === null || v === null ? null : b === v ? 0 : Math.abs(v - b) / Math.max(Math.abs(b), 1e-9);
  const before = firstsByPair(outcomes(base));
  const after = firstsByPair(outcomes(swept));
  const keys = [...before.keys()].filter((k) => after.has(k));
  const rankingChange = keys.length ? keys.filter((k) => before.get(k) !== after.get(k)).length / keys.length : null;
  return { lever: lever.path, factor: lever.factor, target, base: b, value: v, change, rankingChange };
}

/** BAL-023, BAL-024: a lever is dead when no factor moves its target by `dead`, sensitive when a factor changes the first strategy in more than `sensitive` of the pairs. */
export function flagLevers(runs: readonly LeverRun[], c: BalanceConfig["sweep"]): LeverFlag[] {
  const out: LeverFlag[] = [];
  const by = new Map<string, LeverRun[]>();
  for (const r of runs) (by.get(r.lever) ?? by.set(r.lever, []).get(r.lever)!).push(r);
  for (const [lever, rs] of by) {
    const target = rs[0]!.target;
    const changes = rs.map((r) => r.change).filter((x): x is number => x !== null);
    const most = changes.length ? Math.max(...changes) : null;
    if (most !== null && most < c.dead) out.push({ lever, kind: "dead", target, change: most, text: `${lever}: at × ${rs.map((r) => r.factor).join(" and × ")} its target (${target.replace(/_/g, " ")}) moves ${rs.map((r) => (r.change === null ? "–" : pct(r.change))).join(" and ")} (line: ${pct(c.dead)}).` });
    const swing = Math.max(...rs.map((r) => r.rankingChange ?? 0));
    if (swing > c.sensitive) out.push({ lever, kind: "sensitive", target, change: most, text: `${lever}: a factor changes which strategy ranks first in ${pct(swing)} of the pairs (line: ${pct(c.sensitive)}).` });
  }
  return out;
}

export interface LeverHint {
  lever: string;
  from: "the sweep" | "config";
}

/** The lever most likely to fix each check (BAL-026): the swept lever moving its target most, sensitive ones first, else the configured one. */
export function leverHints(checks: readonly CheckResult[], runs: readonly LeverRun[], flags: readonly LeverFlag[], configured: Record<string, string>): Record<string, LeverHint> {
  const out: Record<string, LeverHint> = {};
  const sensitive = new Set(flags.filter((f) => f.kind === "sensitive").map((f) => f.lever));
  for (const ch of checks) {
    const moving = runs.filter((r) => r.target === ch.target && r.change !== null && r.change > 0).sort((a, b) => Number(sensitive.has(b.lever)) - Number(sensitive.has(a.lever)) || b.change! - a.change!)[0];
    if (moving) out[ch.id] = { lever: moving.lever, from: "the sweep" };
    else if (configured[ch.id]) out[ch.id] = { lever: configured[ch.id]!, from: "config" };
  }
  return out;
}
