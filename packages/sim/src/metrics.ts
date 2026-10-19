import { LEDGER, LEDGER_LINES, peaceShare, provinceTax, stabilityOf, type World } from "@ph/engine";
import * as dip from "@ph/engine/domain/diplomacy";
import { economyScore, powerScore, realmConfig, technologyScore } from "@ph/engine/domain/realm";
import warfare from "../../rules/data/domain/warfare.json" with { type: "json" };
import { monthIndex } from "./bot.ts";
import type { BalanceConfig } from "./config.ts";

/**
 * The balance model's recorder (BAL-010 to BAL-012): reads the world after
 * every week to follow wars, owners and risings, adds up each month's ledger,
 * and writes one row per realm and one for the world each January.
 *
 * It only reads. A probe strategy never sees any of this (it decides from the
 * snapshot, INV-BAL-3); the recorder is the measuring side of a run.
 *
 * Numbers the engine does not keep yet are recorded as null (left empty in
 * the CSV), so the engine work can fill them in:
 * - soldiers lost to hunger, sickness and desertion (only those killed in
 *   battles and sieges are counted, by the fallen ring, REALM-096);
 * - which provinces changed owner by a demand rather than by other means
 *   with no war (the diplomacy events are cleared each week): "demand" counts
 *   every change between two realms neither at war nor bound as overlord and
 *   subject, so it includes risings and inheritance;
 * - how a war ended is worked out from outside: obliged when, the week
 *   before, either side's peace voices were over half (peaceShare); exhaustion
 *   when it lasted the war-exhaustion months with no land changing hands.
 */

/** One realm in one January (BAL-010). */
export interface RealmYear {
  run: string;
  realm: string;
  year: number;
  /** Land provinces owned, those with people (settled), and those its subjects own. */
  provinces: number;
  settled: number;
  subjectProvinces: number;
  /** Thousands. */
  people: number;
  economy: number;
  power: number;
  technology: number;
  /** The part of Power that comes from subjects' provinces (the diplomacy path's yardstick). */
  subjectsPower: number;
  treasury: number;
  debt: number;
  /** Net income over the months since the last row (a year, after the first). */
  income: number;
  /** Gold by ledger line over the same months (+ in, − out). */
  ledger: Record<string, number>;
  soldiers: number;
  lostBattle: number;
  lostHunger: number | null;
  lostSickness: number | null;
  lostDesertion: number | null;
  warsDeclared: number;
  warsJoined: number;
  warsWon: number;
  warsLost: number;
  landsTaken: number;
  notoriety: number;
  leaguesAgainst: number;
  leagueSoldiers: number;
  /** Mean standing of the realms owning land next to it toward it; null with no neighbour. */
  neighbourStanding: number | null;
  /** The stability pillar standing lowest (lords, subjects, officials, provinces), and its step's index. */
  weakestPillar: string | null;
  weakestStep: number | null;
  rebelsRisen: number;
  inventions: number;
  /** Any week at war since the last row. */
  atWar: boolean;
}

/** The world in one January (BAL-011). */
export interface WorldYear {
  run: string;
  year: number;
  realmsAlive: number;
  largestRealm: string;
  /** The largest realm's share of settled land (0 to 1). */
  largestShare: number;
  changedByWar: number;
  changedByDemand: number;
  changedByDiplomacy: number;
  warsStarted: number;
  warsEnded: number;
  endedLand: number;
  endedWhite: number;
  endedObliged: number;
  endedExhaustion: number;
  /** Mean months of the wars that ended since the last row, null if none. */
  meanWarMonths: number | null;
  leagues: number;
  /** Lands taken at which a league may form in this era (DIPL-157). */
  leagueThreshold: number;
  /** Tax an occupier collects from occupied land over what the owner would collect from it (WAR-224: under 1); null with no occupation. */
  occupationYield: number | null;
}

export type WarEnd = "land" | "white" | "obliged" | "exhaustion";

/** A war that ended in the run. */
export interface EndedWar {
  start: string;
  endYear: number;
  months: number;
  how: WarEnd;
  attackers: string[];
  defenders: string[];
}

export type Path = "war" | "works" | "learning" | "diplomacy";
export const PATHS: readonly Path[] = ["war", "works", "learning", "diplomacy"];

/** Gold spent on each path over the run, and score gained per 100 gold of it (BAL-012); null where nothing was spent. */
export interface ReturnOnGold {
  spent: Record<Path, number>;
  /** Percent of the path's score at the start gained per 100 gold spent. */
  per100: Record<Path, number | null>;
}

/** What one unit of each score is measured against, so a realm starting at 0 (Technology in 1444) does not divide by nothing: a tenth of the world's mean start (or end, when every realm starts at 0). */
export type Score = "economy" | "power" | "technology" | "subjectsPower";
export type Scales = Record<Score, number>;
const SCORES: readonly Score[] = ["economy", "power", "technology", "subjectsPower"];

export interface Recording {
  /** The world's scales, for score growth across runs of the same world. */
  scales: Scales;
  realms: RealmYear[];
  world: WorldYear[];
  wars: EndedWar[];
  returns: Record<string, ReturnOnGold>;
}

interface Tracked {
  start: string;
  attackers: Set<string>;
  defenders: Set<string>;
  /** Highest peace-voice share of either side last week (wars past the long-war mark only). */
  voices: number;
}

const PEACE_HALF = warfare.peace.half;
const EXHAUSTION_MONTHS: number = (dip.config as unknown as { relations: { types: Record<string, { duration?: { war_exhaustion_peace_months?: number } }> } }).relations?.types?.at_war?.duration?.war_exhaustion_peace_months ?? 60;

export interface Recorder {
  /** After every week. */
  week(): void;
  /** At the end of the run: the rows, the wars and the return on gold. */
  finish(): Recording;
}

/**
 * Starts recording `w` (its first row is taken at once). `oneOff` holds gold
 * the probe's own orders took at once, by realm and path (probe strategies
 * only: an AI realm's one-off spending is not seen).
 */
export function createRecorder(run: string, w: Readonly<World>, c: BalanceConfig, oneOff: Record<string, Record<Path, number>> = {}): Recorder {
  const N = w.nationCount;
  const ids = w.nationIds;
  const d = () => w.diplomacy;
  const realms: RealmYear[] = [];
  const years: WorldYear[] = [];
  const wars: EndedWar[] = [];
  // Flows since the last row.
  let ledger = new Float64Array(N * LEDGER_LINES);
  let income = new Float64Array(N);
  let flow = newFlow(N);
  let occupied = { took: 0, own: 0 };
  let lastMonth = monthOf(w);
  const prevOwner = Int16Array.from(w.provinceOwner);
  const tracked = new Map<string, Tracked>();
  const seenBands = new Set<number>();
  for (const b of w.bands) seenBands.add(b.id);
  for (const war of d().wars) tracked.set(war.id, track(war));
  let enemies = enemyPairs();
  let bonds = overlords();
  let fallenSeen = Float64Array.from(w.fallenTotal);
  const first = new Map<string, RealmYear>();

  row(true);

  function track(war: dip.War): Tracked {
    return { start: war.start, attackers: new Set(war.attackers), defenders: new Set(war.defenders), voices: 0 };
  }

  function enemyPairs(): Set<string> {
    const out = new Set<string>();
    for (const war of d().wars) for (const a of war.attackers) for (const b of war.defenders) out.add(pair(a, b));
    return out;
  }

  function overlords(): Map<string, string> {
    const out = new Map<string, string>();
    for (const id of ids) {
      const o = dip.relations.overlord(d().graph, id);
      if (o) out.set(id, o);
    }
    return out;
  }

  function week(): void {
    const now = monthOf(w);
    // Soldiers killed this week (the fallen ring only grows within a month; a month dropping out lowers it).
    for (let n = 0; n < N; n++) {
      const t = w.fallenTotal[n]!;
      if (t > fallenSeen[n]!) flow.lost[n]! += t - fallenSeen[n]!;
      fallenSeen[n] = t;
    }
    // Owners that changed hands, by what lay between old and new owner last week.
    for (let p = 0; p < w.provinceCount; p++) {
      const o = w.provinceOwner[p]!;
      const was = prevOwner[p]!;
      if (o === was) continue;
      prevOwner[p] = o;
      if (w.provinceWater[p] || was < 0 || o < 0) continue;
      const a = ids[was]!;
      const b = ids[o]!;
      if (enemies.has(pair(a, b))) flow.byWar++;
      else if (bonds.get(a) === b || bonds.get(b) === a) flow.byDiplomacy++;
      else flow.byDemand++;
      flow.moved.push({ from: a, to: b });
    }
    // Wars begun, joined and ended.
    const live = new Set<string>();
    for (const war of d().wars) {
      live.add(war.id);
      let t = tracked.get(war.id);
      if (!t) {
        t = track(war);
        tracked.set(war.id, t);
        flow.warsStarted++;
        bump(flow.declared, war.declarer);
        for (const x of [...war.attackers, ...war.defenders]) if (x !== war.declarer && x !== war.target) bump(flow.joined, x);
      } else {
        for (const x of war.attackers) if (!t.attackers.has(x)) (t.attackers.add(x), bump(flow.joined, x));
        for (const x of war.defenders) if (!t.defenders.has(x)) (t.defenders.add(x), bump(flow.joined, x));
      }
      for (const x of [...war.attackers, ...war.defenders]) {
        const n = w.nationIndex.get(x);
        if (n !== undefined) flow.atWar[n] = 1;
      }
    }
    for (const [id, t] of tracked) {
      if (live.has(id)) continue;
      tracked.delete(id);
      const length = monthIndex(dip.monthOf(d().date)) - monthIndex(t.start);
      const toA = flow.moved.filter((m) => t.attackers.has(m.to) && t.defenders.has(m.from)).length;
      const toD = flow.moved.filter((m) => t.defenders.has(m.to) && t.attackers.has(m.from)).length;
      const how: WarEnd = t.voices > PEACE_HALF ? "obliged" : toA + toD > 0 ? "land" : length >= EXHAUSTION_MONTHS ? "exhaustion" : "white";
      wars.push({ start: t.start, endYear: w.date.year, months: length, how, attackers: [...t.attackers], defenders: [...t.defenders] });
      flow.ended.push(wars[wars.length - 1]!);
      const [winners, losers] = toA > toD ? [t.attackers, t.defenders] : toD > toA ? [t.defenders, t.attackers] : [null, null];
      if (winners && losers) {
        for (const x of winners) bump(flow.won, x);
        for (const x of losers) bump(flow.lost_, x);
      }
    }
    flow.moved = [];
    // Peace voices of wars that have lasted past the long-war mark, for telling an obliged peace.
    for (const war of d().wars) {
      const t = tracked.get(war.id)!;
      if (monthIndex(dip.monthOf(d().date)) - monthIndex(t.start) < c.checks.long_war_months - 1) continue;
      const att = w.nationIndex.get(war.declarer);
      const def = w.nationIndex.get(war.target);
      if (att === undefined || def === undefined) continue;
      t.voices = Math.max(peaceShare(w as World, att, war), peaceShare(w as World, def, war));
    }
    // Risings.
    for (const b of w.bands) {
      if (seenBands.has(b.id)) continue;
      seenBands.add(b.id);
      if (b.owner >= 0) flow.risen[b.owner]!++;
    }
    enemies = enemyPairs();
    bonds = overlords();
    // A new month: add up the month's ledger and income, and what occupation pays.
    if (now !== lastMonth) {
      lastMonth = now;
      for (let i = 0; i < ledger.length; i++) ledger[i]! += w.nationLedger[i]!;
      for (let n = 0; n < N; n++) income[n]! += w.nationMonthlyIncome[n]!;
      for (let p = 0; p < w.provinceCount; p++) {
        const occ = w.provinceOccupier[p]!;
        const own = w.provinceOwner[p]!;
        if (occ < 0 || own < 0 || occ === own) continue;
        occupied.took += provinceTax(w as World, p, occ);
        occupied.own += provinceTax(w as World, p, own);
      }
      if (w.date.month === 1) row(false);
    }
  }

  /** The rows for now: every realm with land, and the world. */
  function row(start: boolean): void {
    const year = w.date.year;
    const P = w.provinceCount;
    const owned = new Int32Array(N);
    const settled = new Int32Array(N);
    const people = new Float64Array(N);
    let settledAll = 0;
    for (let p = 0; p < P; p++) {
      if (w.provinceWater[p]) continue;
      const o = w.provinceOwner[p]!;
      const has = w.provincePopulation[p]! > 0;
      if (has) settledAll++;
      if (o < 0) continue;
      owned[o]!++;
      people[o]! += w.provincePopulation[p]!;
      if (has) settled[o]!++;
    }
    const subjectProvinces = new Int32Array(N);
    for (const [sub, over] of bonds) {
      const s = w.nationIndex.get(sub);
      const o = w.nationIndex.get(over);
      if (s !== undefined && o !== undefined) subjectProvinces[o]! += owned[s]!;
    }
    const soldiers = new Float64Array(N);
    const horse = new Float64Array(N);
    const a = w.armies;
    for (let i = 0; i < a.count; i++) {
      if (!a.alive[i] || a.owner[i]! < 0) continue;
      soldiers[a.owner[i]!]! += a.men[i]!;
      horse[a.owner[i]!]! += a.horse[i]!;
    }
    const ships = new Int32Array(N);
    for (const f of w.navy.fleets) if (f.owner >= 0 && !f.hire) ships[f.owner]! += f.ships.length;
    const neighbours = Array.from({ length: N }, () => new Set<number>());
    for (let p = 0; p < P; p++) {
      const o = w.provinceOwner[p]!;
      if (o < 0) continue;
      for (let k = w.adjStart[p]!; k < w.adjStart[p + 1]!; k++) {
        const q = w.provinceOwner[w.adjList[k]!]!;
        if (q >= 0 && q !== o && !w.provinceWater[w.adjList[k]!]) neighbours[o]!.add(q);
      }
    }
    const dd = d();
    let largest = { realm: "", share: 0 };
    let alive = 0;
    for (let n = 0; n < N; n++) {
      if (!owned[n]) continue;
      alive++;
      const id = ids[n]!;
      if (settledAll && settled[n]! / settledAll > largest.share) largest = { realm: id, share: settled[n]! / settledAll };
      const yearIncome = start ? 12 * w.nationMonthlyIncome[n]! : income[n]!;
      const debt = w.nationDebt[n]!;
      const power = powerScore({ provinces: owned[n]!, subjectProvinces: subjectProvinces[n]!, foot: soldiers[n]! - horse[n]!, horse: horse[n]!, guns: 0, warships: ships[n]! });
      const known = w.research[n]?.known ?? new Set<string>();
      const country = dd.countries[id];
      const near = [...neighbours[n]!].map((m) => dip.standing(dd, ids[m]!, id));
      const stab = stabilityOf(w as World, n);
      const weakest = [...stab.pillars].sort((x, y) => y.step - x.step)[0];
      const leagues = dd.leagues.filter((l) => l.target === id);
      const lines: Record<string, number> = {};
      LEDGER.forEach((line, k) => (lines[line] = round(start ? 0 : ledger[n * LEDGER_LINES + k]!)));
      const r: RealmYear = {
        run,
        realm: id,
        year,
        provinces: owned[n]!,
        settled: settled[n]!,
        subjectProvinces: subjectProvinces[n]!,
        people: round(people[n]!),
        economy: round(economyScore(yearIncome, w.nationTreasury[n]!, debt).score),
        power: round(power.score),
        technology: technologyScore(known),
        subjectsPower: round(subjectProvinces[n]! * realmConfig.win.subject_province_weight),
        treasury: round(w.nationTreasury[n]!),
        debt: round(debt),
        income: round(start ? 0 : income[n]!),
        ledger: lines,
        soldiers: soldiers[n]!,
        lostBattle: round(flow.lost[n]!),
        lostHunger: null,
        lostSickness: null,
        lostDesertion: null,
        warsDeclared: flow.declared.get(id) ?? 0,
        warsJoined: flow.joined.get(id) ?? 0,
        warsWon: flow.won.get(id) ?? 0,
        warsLost: flow.lost_.get(id) ?? 0,
        landsTaken: country?.landsTaken ?? 0,
        notoriety: country ? dip.notoriety(dd, id) : 0,
        leaguesAgainst: leagues.length,
        leagueSoldiers: round(leagues.reduce((t, l) => t + l.members.reduce((u, m) => u + (dd.countries[m]?.soldiers ?? 0), 0), 0)),
        neighbourStanding: near.length ? round(near.reduce((t, x) => t + x, 0) / near.length) : null,
        weakestPillar: weakest?.key ?? null,
        weakestStep: weakest?.step ?? null,
        rebelsRisen: flow.risen[n]!,
        inventions: known.size,
        atWar: !!flow.atWar[n],
      };
      realms.push(r);
      if (!first.has(id)) first.set(id, r);
    }
    const ended = flow.ended;
    years.push({
      run,
      year,
      realmsAlive: alive,
      largestRealm: largest.realm,
      largestShare: round(largest.share, 4),
      changedByWar: flow.byWar,
      changedByDemand: flow.byDemand,
      changedByDiplomacy: flow.byDiplomacy,
      warsStarted: flow.warsStarted,
      warsEnded: ended.length,
      endedLand: ended.filter((x) => x.how === "land").length,
      endedWhite: ended.filter((x) => x.how === "white").length,
      endedObliged: ended.filter((x) => x.how === "obliged").length,
      endedExhaustion: ended.filter((x) => x.how === "exhaustion").length,
      meanWarMonths: ended.length ? round(ended.reduce((t, x) => t + x.months, 0) / ended.length) : null,
      leagues: dd.leagues.length,
      leagueThreshold: dip.leagueThreshold(dd),
      occupationYield: occupied.own > 0 ? round(occupied.took / occupied.own, 4) : null,
    });
    ledger = new Float64Array(N * LEDGER_LINES);
    income = new Float64Array(N);
    flow = newFlow(N);
    occupied = { took: 0, own: 0 };
  }

  function finish(): Recording {
    // Rows are Januaries only (and the start): the months after the last January are not a row of their own.
    const last = new Map<string, RealmYear>();
    for (const r of realms) last.set(r.realm, r);
    const scales = scoreScales([...first.values()], [...last.values()]);
    const returns: Record<string, ReturnOnGold> = {};
    for (const [id, a] of first) {
      const b = last.get(id)!;
      const rows = realms.filter((r) => r.realm === id);
      returns[id] = returnOnGold(a, b, rows, c.return_paths, scales, oneOff[id]);
    }
    return { scales, realms, world: years, wars, returns };
  }

  return { week, finish };
}

type PathConfig = BalanceConfig["return_paths"];

/** BAL-012: per path, gold spent (ledger lines paid out over the rows, plus one-off order gold) and the path's score gained, as a percent of its start, per 100 gold. */
export function returnOnGold(start: RealmYear, end: RealmYear, rows: readonly RealmYear[], paths: PathConfig, scales: Scales, oneOff?: Record<Path, number>): ReturnOnGold {
  const spent = {} as Record<Path, number>;
  const per100 = {} as Record<Path, number | null>;
  for (const path of PATHS) {
    const pc = paths[path];
    let gold = oneOff?.[path] ?? 0;
    for (const r of rows) for (const line of pc.lines) gold += Math.max(0, -(r.ledger[line] ?? 0));
    spent[path] = round(gold);
    const k: Score = pc.score === "subjects" ? "subjectsPower" : (pc.score as Score);
    const gain = relativeGain(start[k], end[k], scales[k]);
    per100[path] = gold >= 1 ? round((gain / gold) * 100, 4) : null;
  }
  return { spent, per100 };
}

/** Change of a score as a percent of the realm's start, measured against at least the world's scale. */
export const relativeGain = (start: number, end: number, scale: number) => ((end - start) / Math.max(Math.abs(start), scale, 1)) * 100;

/** A tenth of the world's mean of each score at the start (at the end when it starts at 0 everywhere). */
export function scoreScales(start: readonly Pick<RealmYear, Score>[], end: readonly Pick<RealmYear, Score>[]): Scales {
  const mean = (rows: readonly Pick<RealmYear, Score>[], k: Score) => (rows.length ? rows.reduce((t, r) => t + Math.abs(r[k]), 0) / rows.length : 0);
  const out = {} as Scales;
  for (const k of SCORES) out[k] = round(Math.max(1, 0.1 * (mean(start, k) || mean(end, k))));
  return out;
}

/** A realm's score growth over a run, as an index (100 = held its own): the mean of its Economy, Power and Technology changes, each relative to its start (D-BAL-1). */
export function scoreGrowth(start: Pick<RealmYear, Score> | undefined, end: Pick<RealmYear, Score> | undefined, scales: Scales): number {
  if (!start || !end) return 0;
  return round(100 + (relativeGain(start.economy, end.economy, scales.economy) + relativeGain(start.power, end.power, scales.power) + relativeGain(start.technology, end.technology, scales.technology)) / 3);
}

function newFlow(N: number) {
  return {
    lost: new Float64Array(N),
    risen: new Int32Array(N),
    atWar: new Uint8Array(N),
    declared: new Map<string, number>(),
    joined: new Map<string, number>(),
    won: new Map<string, number>(),
    lost_: new Map<string, number>(),
    byWar: 0,
    byDemand: 0,
    byDiplomacy: 0,
    warsStarted: 0,
    ended: [] as EndedWar[],
    moved: [] as { from: string; to: string }[],
  };
}

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const monthOf = (w: Readonly<World>) => w.date.year * 12 + w.date.month;
const round = (x: number, places = 2) => Math.round(x * 10 ** places) / 10 ** places;
