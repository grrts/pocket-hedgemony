import { advance, STEPS_PER_TURN, type Order, type Snapshot, type World } from "@ph/engine";
import { dayKey } from "./campaign.ts";
import { simConfig, type SimConfig } from "./config.ts";
import { badValueFindings, errorFinding, type Finding } from "./findings.ts";
import { playThroughHost } from "./host.ts";
import { applyLever, type Lever } from "./levers.ts";
import { checkFinite } from "./measure.ts";
import { createRecorder, type Path, type Recording } from "./metrics.ts";
import { createStrategy, type StrategyName } from "./strategies.ts";
import { newWorld, rulesFor, type MapKind } from "./world.ts";

export interface ProbeOptions {
  strategy: StrategyName;
  /** The probe realm by id; Court plays an AI-only world, which serves every probe realm of its seed. */
  realm: string;
  seed: number;
  years: number;
  map: MapKind;
  config?: SimConfig;
  /** One lever scaled for this run (a sweep). */
  lever?: Lever | null;
}

/** One balance run (BAL-001): a probe realm played by one strategy, every other realm by the AI, measured each January. */
export interface ProbeResult {
  kind: "probe";
  strategy: StrategyName;
  /** The probe realm ("" for a Court run: an AI-only world). */
  realm: string;
  seed: number;
  map: MapKind;
  years: number;
  lever: Lever | null;
  weeks: number;
  seconds: number;
  ordersSent: number;
  /** Orders the probe sent, by type. */
  orders: Record<string, number>;
  /** Orders the game refused the probe, by type, with the first reason. */
  rejected: Record<string, { count: number; reason: string }>;
  /** Broken findings: the run threw or a number went bad (BAL-006). */
  findings: Finding[];
  recording: Recording;
}

/** Which path an order's gold goes to, from config (return_paths.*.orders). */
function pathOf(config: SimConfig, type: string): Path | null {
  for (const [path, pc] of Object.entries(config.balance.return_paths)) if (typeof pc === "object" && (pc as { orders: string[] }).orders.includes(type)) return path as Path;
  return null;
}

/**
 * Plays one balance run. A scripted strategy plays the probe through the
 * engine host (newGame, act, advance) exactly as the bot does, deciding from
 * the snapshot; Court plays an AI-only world as the AI-only campaigns do. An
 * engine error or a bad number ends the run and is recorded with its date,
 * seed and error; the metrics up to then are kept.
 */
export function runProbe(o: ProbeOptions): ProbeResult {
  const config = o.config ?? simConfig();
  const t0 = performance.now();
  const base = rulesFor(o.map);
  const lever = o.lever ?? null;
  const applied = lever ? applyLever(base, lever) : { rules: base, restore: () => {} };
  const rules = applied.rules;
  if (o.strategy !== "court" && !rules.nations.some((n) => n.id === o.realm)) {
    applied.restore();
    throw new Error(`unknown realm ${o.realm}`);
  }
  const findings: Finding[] = [];
  const oneOff: Record<string, Record<Path, number>> = {};
  const label = `${o.strategy}${o.realm ? `-${o.realm}` : ""}-seed${o.seed}${lever ? `-${lever.path}x${lever.factor}` : ""}`;
  let weeks = 0;
  let ordersSent = 0;
  let rejected: ProbeResult["rejected"] = {};
  const orders: Record<string, number> = {};
  let recording: Recording | null = null;
  let year = 0;
  try {
    if (o.strategy === "court") {
      const world = newWorld(o.map, o.seed, rules);
      year = world.date.year;
      const stop = endOf(world.date, o.years);
      const rec = createRecorder(label, world, config.balance);
      try {
        while (dayKey(world.date) < stop) {
          advance(world, STEPS_PER_TURN - world.step);
          weeks++;
          year = world.date.year;
          rec.week();
          if (weeks % 4 === 0 && bad(world, findings)) break;
        }
      } catch (e) {
        findings.push(errorFinding(e, year, o.realm || undefined));
      }
      recording = rec.finish();
    } else {
      const play = playThroughHost(rules, o.map, o.seed, o.realm);
      const me = play.s.playerNation;
      const strategy = createStrategy(o.strategy, rules, config, o.seed * 7919 + me);
      const spent = (oneOff[o.realm] = { war: 0, works: 0, learning: 0, diplomacy: 0 });
      const rec = createRecorder(label, play.world(), config.balance, oneOff);
      let s: Snapshot = play.s;
      year = s.date.year;
      const stop = endOf(s.date, o.years);
      const act = (order: Order) => {
        const before = s.nationTreasury[me]!;
        orders[order.type] = (orders[order.type] ?? 0) + 1;
        s = play.act(order);
        const path = pathOf(config, order.type);
        const paid = before - s.nationTreasury[me]!;
        if (path && paid > 0 && !s.rejectedOrders.length) spent[path] += paid;
      };
      try {
        while (dayKey(s.date) < stop) {
          for (const order of strategy.decide(s)) act(order);
          s = play.week();
          weeks++;
          year = s.date.year;
          rec.week();
          if (weeks % 4 === 0 && bad(play.world() as World, findings)) break;
        }
      } catch (e) {
        findings.push(errorFinding(e, year, o.realm));
      }
      ordersSent = play.ordersSent;
      rejected = play.rejected;
      recording = rec.finish();
    }
  } catch (e) {
    findings.push(errorFinding(e, year, o.realm || undefined));
  } finally {
    applied.restore();
  }
  for (const f of findings) f.text = `${f.text} (seed ${o.seed}, ${o.strategy}${o.realm ? ` as ${o.realm}` : ""}${lever ? `, ${lever.path} × ${lever.factor}` : ""})`;
  return {
    kind: "probe",
    strategy: o.strategy,
    realm: o.strategy === "court" ? "" : o.realm,
    seed: o.seed,
    map: o.map,
    years: o.years,
    lever,
    weeks,
    seconds: (performance.now() - t0) / 1000,
    ordersSent,
    orders,
    rejected,
    findings,
    recording: recording ?? { scales: { economy: 1, power: 1, technology: 1, subjectsPower: 1 }, realms: [], world: [], wars: [], returns: {} },
  };
}

/** The day a run of `years` years from `date` stops, as a dayKey (a fraction plays whole months: tests play a quarter). */
function endOf(date: { year: number; month: number; day?: number }, years: number): number {
  const months = date.year * 12 + (date.month - 1) + Math.round(years * 12);
  return dayKey({ year: Math.floor(months / 12), month: (months % 12) + 1, day: date.day ?? 1 });
}

function bad(w: World, findings: Finding[]): boolean {
  const b = checkFinite(w);
  if (!b.length) return false;
  findings.push(...badValueFindings(b, w.date.year));
  return true;
}
