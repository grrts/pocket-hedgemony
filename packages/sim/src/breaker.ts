import { createEngineHost, STEPS_PER_TURN, type EngineRequest, type Order, type Snapshot } from "@ph/engine";
import { createBot } from "./bot.ts";
import { dayKey } from "./campaign.ts";
import { simConfig, type SimConfig } from "./config.ts";
import { badValueFindings, errorFinding, pct, type Finding } from "./findings.ts";
import { checkFinite, sample, viewOfSnapshot, type RealmSample, type WorldSample } from "./measure.ts";
import { mapImagesFor, rulesFor, type MapKind } from "./world.ts";

export interface BreakerOptions {
  /** The realm the bot plays, by id (as in the scenario's nations). */
  realm: string;
  seed: number;
  years: number;
  map: MapKind;
  sampleMonths?: number;
  config?: SimConfig;
  /** The same realm's end in an AI-only campaign of the same seed and length, to measure the bot against. */
  baseline?: RealmSample | null;
}

/** An engine request without its id (each kind on its own, so its fields stay known). */
type Request = EngineRequest extends infer R ? (R extends EngineRequest ? Omit<R, "id"> : never) : never;

/** One realm played by the bot: its samples, its orders the game turned down, and what it found. */
export interface BreakerResult {
  kind: "breaker";
  realm: string;
  seed: number;
  map: MapKind;
  years: number;
  weeks: number;
  seconds: number;
  /** The bot's realm at each sample (null once it is gone). */
  realmSamples: { year: number; month: number; realm: RealmSample | null }[];
  /** The whole world at the last sample. */
  end: WorldSample | null;
  baseline: RealmSample | null;
  /** Orders the game refused, by order type, with the first reason given: the bot tried what the screens let a player try. */
  rejected: Record<string, { count: number; reason: string }>;
  ordersSent: number;
  weeksAtWar: number;
  findings: Finding[];
}

/**
 * Plays one realm with the bot for a number of years, through the engine host
 * the game's screens talk to (newGame, act, advance), so every order is checked
 * exactly as a player's is. After each week the snapshot is checked for bad
 * numbers; every few months the bot's round-trip probes are run; at the end
 * the realm is measured against the same realm left to the AI.
 */
export function runBreaker(o: BreakerOptions): BreakerResult {
  const config = o.config ?? simConfig();
  const every = o.sampleMonths ?? config.run.sample_months;
  const checks = config.breaker_checks;
  const t0 = performance.now();
  const rules = rulesFor(o.map);
  const host = createEngineHost(() => rules);
  const land = Uint8Array.from(rules.provinces, (p) => (p.terrain === "sea" || p.terrain === "ocean" ? 0 : 1));
  const nationIds = rules.nations.map((n) => n.id);
  const me = nationIds.indexOf(o.realm);
  if (me < 0) throw new Error(`unknown realm ${o.realm}`);
  const findings: Finding[] = [];
  const rejected: BreakerResult["rejected"] = {};
  const realmSamples: BreakerResult["realmSamples"] = [];
  let ordersSent = 0;
  let weeks = 0;
  let weeksAtWar = 0;
  let end: WorldSample | null = null;

  let id = 0;
  const send = (req: Request): Snapshot => {
    const r = host({ ...req, id: ++id } as EngineRequest).response;
    if (r.type === "error") throw new Error(r.message);
    if (r.type !== "snapshot") throw new Error(`unexpected ${r.type}`);
    return r.snapshot;
  };
  const map = mapImagesFor(o.map);
  let s = send({ type: "newGame", seed: o.seed, playerNation: o.realm, ...(map ? { map } : {}) });
  const bot = createBot(rules, config.bot, o.seed * 7919 + me);
  const startYear = s.date.year;
  const stop = dayKey({ ...s.date, year: startYear + o.years });
  let lastSampled = -1;

  const act = (order: Order): Snapshot => {
    ordersSent++;
    const next = send({ type: "act", order });
    for (const r of next.rejectedOrders) {
      const e = (rejected[r.order.type] ??= { count: 0, reason: r.reason });
      e.count++;
    }
    return next;
  };
  const worth = (x: Snapshot) => x.nationTreasury[me]! - x.debt;
  const take = (x: Snapshot) => {
    end = sample(viewOfSnapshot(x, nationIds, land));
    realmSamples.push({ year: end.year, month: end.month, realm: end.realms[o.realm] ?? null });
  };

  take(s);
  try {
    while (dayKey(s.date) < stop) {
      for (const probe of bot.probes(s)) {
        const before = worth(s);
        s = act(probe.orders[0]);
        if (s.rejectedOrders.length) continue;
        s = act(probe.orders[1]);
        const gain = worth(s) - before;
        if (gain > checks.gold_from_round_trip) findings.push({ severity: "broken", kind: "gold_from_nothing", year: s.date.year, realm: o.realm, text: `"${probe.name}" leaves the realm ${gain.toFixed(2)} gold richer.` });
      }
      for (const order of bot.decide(s)) s = act(order);
      s = send({ type: "advance", steps: STEPS_PER_TURN });
      weeks++;
      if (s.wars.some((w) => w.attackers.includes(me) || w.defenders.includes(me))) weeksAtWar++;
      const bad = checkFinite(s);
      if (bad.length) {
        findings.push(...badValueFindings(bad, s.date.year, o.realm));
        break;
      }
      const month = (s.date.year - startYear) * 12 + s.date.month;
      if (month !== lastSampled && month % every === 0) {
        lastSampled = month;
        take(s);
        if (!end!.realms[o.realm]) break;
      }
    }
  } catch (e) {
    findings.push(errorFinding(e, s.date.year, o.realm));
  }
  take(s);
  findings.push(...breakerFindings(o.realm, end, weeksAtWar, o.baseline ?? null, checks));
  return { kind: "breaker", realm: o.realm, seed: o.seed, map: o.map, years: o.years, weeks, seconds: (performance.now() - t0) / 1000, realmSamples, end, baseline: o.baseline ?? null, rejected, ordersSent, weeksAtWar, findings };
}

/** The checks on how the bot's realm ended, against the same realm left to the AI. */
export function breakerFindings(realm: string, end: WorldSample | null, weeksAtWar: number, baseline: RealmSample | null, c: SimConfig["breaker_checks"]): Finding[] {
  const out: Finding[] = [];
  const last = end?.realms[realm];
  const year = end?.year ?? 0;
  if (!last) {
    out.push({ severity: "note", kind: "bot_lost", year, realm, text: `The bot lost ${realm}: it holds no land by ${year}${baseline ? `, while the AI kept ${baseline.provinces} provinces` : ""}.` });
    return out;
  }
  if (baseline && baseline.provinces > 0 && last.provinces / baseline.provinces > c.provinces_vs_ai)
    out.push({ severity: "balance", kind: "snowball", year, realm, text: `The bot ends with ${last.provinces} provinces, ${(last.provinces / baseline.provinces).toFixed(1)}× what the AI held with ${realm} (line: ${c.provinces_vs_ai}×).` });
  if (baseline && baseline.income > 0 && last.income / baseline.income > c.income_vs_ai)
    out.push({ severity: "balance", kind: "income", year, realm, text: `The bot's income is ${last.income} a month, ${(last.income / baseline.income).toFixed(1)}× the AI's with ${realm} (line: ${c.income_vs_ai}×).` });
  if (last.income > 0 && last.treasury / (last.income * 12) > c.years_of_income_hoarded)
    out.push({ severity: "balance", kind: "hoarding", year, realm, text: `The bot sits on ${Math.round(last.treasury / (last.income * 12))} years of income: it found nothing worth spending on (line: ${c.years_of_income_hoarded}).` });
  if (end && end.largest.realm === realm && end.largest.share > c.largest_realm_share)
    out.push({ severity: "balance", kind: "world_power", year, realm, text: `The bot holds ${pct(end.largest.share)} of all land (line: ${pct(c.largest_realm_share)}).` });
  if (!weeksAtWar) out.push({ severity: "note", kind: "never_at_war", year, realm, text: `The bot never went to war: no neighbour was weak enough, or the game refused every declaration.` });
  return out;
}
