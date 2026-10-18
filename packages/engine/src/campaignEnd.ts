import type { GameDate } from "@ph/rules";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { LEDGER, LEDGER_LINES } from "./treasury.ts";
import { economyScore, powerScore, realmConfig, technologyScore } from "./domain/realm/index.ts";
import { outcomeOf, type RealmScores } from "./domain/game-shell/ending.ts";
import { eventsConfig } from "./domain/events/model.ts";
import * as nv from "./domain/naval/index.ts";

/**
 * How a campaign ends in play (SHELL-149 to SHELL-151): the three win scores
 * worked out at the start and each January (REALM-173), world domination
 * checked in the January turn, the end date, and the player's realm gone.
 * When one of them comes the clock stops and the end card says how it ended.
 */

export const SCORE_NAMES = ["Economy", "Power", "Technology"] as const;
/** Parts kept per realm: yearly income, bank, provinces (subjects' at half), army power, technology. */
const PARTS = 5;
const [INCOME, BANK, PROVINCES, ARMY, TECH] = [0, 1, 2, 3, 4];
/** Realms in the ledger besides the player (D-SHELL-22). */
const LEDGER_LEADERS = 5;
/** Ledger lines that make yearly income: taxes (the lords' share in them), trade and tribute (REALM-151); read when first needed, as treasury.ts loads after this module. */
const incomeLines = (): number[] => (["tax", "trade", "tribute"] as const).map((l) => LEDGER.indexOf(l));

export type EndingKind = "end date" | "game over" | "world domination";

export interface Ending {
  kind: EndingKind;
  /** Day it came, ISO. */
  date: string;
  /** What happened, with the year ("Burgundy was annexed by France · 1477"). */
  headline: string;
  /** The SHELL-130 outcome: the wins, or the ranks in each score. */
  outcome: string;
  /** Realm the end card speaks of (the player's when it came). */
  realm: number;
}

export interface CampaignEndState {
  /** The campaign's end date, ISO (the scenario's, 31 August 1939 by default; SHELL-100). */
  endDate: string;
  /** Year the campaign began, for years lasted. */
  startYear: number;
  /** PARTS per realm, as last worked out. */
  scoreParts: Float64Array;
  /** Rank (1 = first) of each realm in each score, 0 for a realm that is gone; three per realm. */
  scoreRanks: Int16Array;
  /** When the scores were last worked out, ISO. */
  scoresDate: string;
  /** Highs: most land provinces each realm has held, and battles it has won (SHELL-094). */
  nationLargest: Int32Array;
  nationBattlesWon: Int32Array;
  /** Land provinces the player held at the last weekly look, to name who took them. */
  playerLands: number[];
  ending: Ending | null;
  /** Kept playing after a world domination win, toward the end date (SHELL-129). */
  dominationWon: boolean;
  /** The player played on as another realm: achievements end for this campaign (SHELL-096). */
  playedOn: boolean;
}

export function createCampaignEndState(N: number, start: GameDate): CampaignEndState {
  return {
    endDate: eventsConfig.campaign.end_date,
    startYear: start.year,
    scoreParts: new Float64Array(N * PARTS),
    scoreRanks: new Int16Array(N * 3),
    scoresDate: "",
    nationLargest: new Int32Array(N),
    nationBattlesWon: new Int32Array(N),
    playerLands: [],
    ending: null,
    dominationWon: false,
    playedOn: false,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: GameDate): string => `${d.year}-${pad(d.month)}-${pad(d.day ?? 1)}`;

/** Land provinces each realm owns (and the world's settled land: land with people). */
function landCounts(world: World): { owned: Int32Array; settled: number; settledOwned: Int32Array } {
  const owned = new Int32Array(world.nationCount);
  const settledOwned = new Int32Array(world.nationCount);
  let settled = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const o = world.provinceOwner[p]!;
    const people = world.provincePopulation[p]! > 0;
    if (people) settled++;
    if (o < 0) continue;
    owned[o]!++;
    if (people) settledOwned[o]!++;
  }
  return { owned, settled, settledOwned };
}

/** Each realm's overlord, by index (-1 none). */
function overlords(world: World): Int32Array {
  const out = new Int32Array(world.nationCount).fill(-1);
  for (const r of world.diplomacy.graph.relations) {
    if (r.type !== "subject") continue;
    const s = world.nationIndex.get(r.source);
    const o = world.nationIndex.get(r.target);
    if (s !== undefined && o !== undefined) out[s] = o;
  }
  return out;
}

/** The player takes up a realm: its lands are noted, to name who takes them (SHELL-094). */
export function setPlayer(world: World, n: number): void {
  world.player = n;
  world.campaign.playerLands = [];
  for (let p = 0; p < world.provinceCount; p++) if (!world.provinceWater[p] && world.provinceOwner[p] === n) world.campaign.playerLands.push(p);
}

/** At the start: each realm's size so far, and the scores (SHELL-149). */
export function seedCampaign(world: World): void {
  const { owned } = landCounts(world);
  world.campaign.nationLargest.set(owned);
  workOutScores(world);
}

/** Works out every realm's three scores and its ranks (REALM-151 to REALM-153, REALM-156). */
export function workOutScores(world: World): void {
  const c = world.campaign;
  const N = world.nationCount;
  const { owned } = landCounts(world);
  const over = overlords(world);
  const subjectLand = new Float64Array(N);
  for (let n = 0; n < N; n++) if (over[n]! >= 0) subjectLand[over[n]!] = subjectLand[over[n]!]! + owned[n]!;
  const foot = new Float64Array(N);
  const horse = new Float64Array(N);
  const a = world.armies;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.owner[i]! < 0) continue;
    const o = a.owner[i]!;
    horse[o] = horse[o]! + a.horse[i]!;
    foot[o] = foot[o]! + a.men[i]! - a.horse[i]!;
  }
  const warships = new Float64Array(N);
  for (const f of world.navy.fleets) for (const s of f.ships) if (f.owner >= 0 && nv.isWarship(s.type)) warships[f.owner]!++;
  const commanders = new Float64Array(N);
  for (let k = 0; k < world.commanderOwner.length; k++) if (world.commanderOwner[k]! >= 0) commanders[world.commanderOwner[k]!]!++;
  const P = c.scoreParts;
  const lines = incomeLines();
  for (let n = 0; n < N; n++) {
    let monthly = 0;
    for (const k of lines) monthly += Math.max(0, world.nationLedger[n * LEDGER_LINES + k]!);
    const e = economyScore(monthly * 12, world.nationTreasury[n]!, world.nationDebt[n]!);
    const pw = powerScore({ provinces: owned[n]!, subjectProvinces: subjectLand[n]!, foot: foot[n]!, horse: horse[n]!, warships: warships[n]!, commanders: commanders[n]! });
    P[n * PARTS + INCOME] = e.income;
    P[n * PARTS + BANK] = e.bank;
    P[n * PARTS + PROVINCES] = pw.provinces;
    P[n * PARTS + ARMY] = pw.army;
    P[n * PARTS + TECH] = world.research[n] ? technologyScore(world.research[n]!.known) : 0;
  }
  for (let k = 0; k < 3; k++) {
    const order: number[] = [];
    for (let n = 0; n < N; n++) if (!world.nationGone[n]) order.push(n);
    const v = (n: number) => scoreOf(world, n, k);
    order.sort((x, y) => v(y) - v(x));
    // Equal scores share a place.
    for (let i = 0; i < order.length; i++) c.scoreRanks[order[i]! * 3 + k] = i > 0 && v(order[i]!) === v(order[i - 1]!) ? c.scoreRanks[order[i - 1]! * 3 + k]! : i + 1;
    for (let n = 0; n < N; n++) if (world.nationGone[n]) c.scoreRanks[n * 3 + k] = 0;
  }
  c.scoresDate = isoDay(world.date);
}

/** A realm's score k (0 Economy, 1 Power, 2 Technology), rounded as shown. */
export function scoreOf(world: World, n: number, k: number): number {
  const P = world.campaign.scoreParts;
  const b = n * PARTS;
  return Math.round(k === 0 ? P[b + INCOME]! + P[b + BANK]! : k === 1 ? P[b + PROVINCES]! + P[b + ARMY]! : P[b + TECH]!);
}

const realmScores = (world: World, n: number): RealmScores => ({ realm: world.nationIds[n]!, Economy: scoreOf(world, n, 0), Power: scoreOf(world, n, 1), Technology: scoreOf(world, n, 2) });

/** The realms that still exist, with their scores. */
function standing(world: World): RealmScores[] {
  const out: RealmScores[] = [];
  for (let n = 0; n < world.nationCount; n++) if (!world.nationGone[n] || n === world.player) out.push(realmScores(world, n));
  return out;
}

/** Each January (REALM-173): the scores, and the player's world domination (REALM-154, SHELL-129). */
export function yearlyScores(world: World, news: News[]): void {
  workOutScores(world);
  const c = world.campaign;
  const me = world.player;
  if (me < 0 || c.ending || c.dominationWon) return;
  const { settled, settledOwned } = landCounts(world);
  const over = overlords(world);
  let held = settledOwned[me]!;
  for (let n = 0; n < world.nationCount; n++) if (over[n] === me) held += settledOwned[n]!;
  if (settled > 0 && held >= settled * realmConfig.win.domination_share) {
    c.dominationWon = true;
    end(world, "world domination", `World domination · ${world.date.year}`, outcomeOf(world.nationIds[me]!, standing(world), { atEndDate: false, earlierWins: ["World domination"] }).line, news);
  }
}

/** Each week: the highs, realms that have lost all their land, and the player's realm gone (SHELL-094, SHELL-151). */
export function weeklyEndCheck(world: World, news: News[]): void {
  const c = world.campaign;
  const { owned } = landCounts(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (owned[n]! > c.nationLargest[n]!) c.nationLargest[n] = owned[n]!;
    if (!world.nationGone[n] && owned[n] === 0 && c.nationLargest[n]! > 0) world.nationGone[n] = 1;
    else if (world.nationGone[n] && owned[n]! > 0) world.nationGone[n] = 0;
  }
  const me = world.player;
  if (me < 0 || c.ending) return;
  if (!world.nationGone[me]) {
    c.playerLands = [];
    for (let p = 0; p < world.provinceCount; p++) if (!world.provinceWater[p] && world.provinceOwner[p] === me) c.playerLands.push(p);
    return;
  }
  // Who took the last lands: the realms holding them now, most first.
  const took = new Map<number, number>();
  for (const p of c.playerLands) {
    const o = world.provinceOwner[p]!;
    if (o >= 0 && o !== me) took.set(o, (took.get(o) ?? 0) + 1);
  }
  const takers = [...took].sort((x, y) => y[1] - x[1]).map(([n]) => world.rules.nations[n]!.name);
  const realm = world.rules.nations[me]!.name;
  const how = takers.length === 0 ? `${realm} has fallen` : takers.length === 1 ? `${realm} was annexed by ${takers[0]}` : `${realm} was divided between ${takers.slice(0, -1).join(", ")} and ${takers[takers.length - 1]}`;
  // The ranks it held at the last reckoning (SHELL-151).
  end(world, "game over", `${how} · ${world.date.year}`, outcomeOf(world.nationIds[me]!, standing(world), { atEndDate: false }).line, news);
}

/** Each day: the end date (SHELL-097, SHELL-100, SHELL-130). */
export function dailyEndCheck(world: World, news: News[]): void {
  const c = world.campaign;
  if (world.player < 0 || (c.ending && c.ending.kind !== "world domination") || isoDay(world.date) < c.endDate) return;
  workOutScores(world);
  const me = world.nationIds[world.player]!;
  const line = outcomeOf(me, standing(world), { atEndDate: true, earlierWins: c.dominationWon ? ["World domination"] : [] }).line;
  end(world, "end date", `The campaign ends · ${world.date.day ?? 1} ${MONTHS[world.date.month - 1]} ${world.date.year}`, line, news);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function end(world: World, kind: EndingKind, headline: string, outcome: string, news: News[]): void {
  world.campaign.ending = { kind, date: isoDay(world.date), headline, outcome, realm: world.player };
  news.push({ kind: "campaign", text: `${headline}. ${outcome}.`, nations: [world.player] });
}

/** True while the end card stands and the clock may not run (SHELL-151). */
export const clockStopped = (world: World): boolean => !!world.campaign.ending;

/** A battle won counts toward the realm's highs. */
export function battleWon(world: World, n: number): void {
  if (n >= 0) world.campaign.nationBattlesWon[n]!++;
}

/** Keep playing after a world domination win, on to the end date (SHELL-129). */
export function keepPlaying(world: World): string | null {
  const c = world.campaign;
  if (c.ending?.kind !== "world domination") return "there is no world domination win to play on from";
  c.ending = null;
  return null;
}

/** Play on as another realm after game over: any realm still on the map; achievements end (SHELL-095, SHELL-096). */
export function playOn(world: World, n: number): string | null {
  const c = world.campaign;
  if (c.ending?.kind !== "game over") return "you can play on as another realm only after game over";
  if (n < 0 || n >= world.nationCount || world.nationGone[n]) return "that realm is no longer on the map";
  setPlayer(world, n);
  c.ending = null;
  c.playedOn = true;
  return null;
}

// ---------------------------------------------------------------- what the UI shows

export interface ScoreBreakdown {
  income: number;
  bank: number;
  provinces: number;
  army: number;
  technology: number;
  scores: [number, number, number];
  ranks: [number, number, number];
}

export interface CampaignView {
  endDate: string;
  scoresDate: string;
  /** Every realm's Economy, Power and Technology, three per realm. */
  scores: Int32Array;
  /** Every realm's rank in each, 0 when gone. */
  ranks: Int16Array;
  /** Realms that still stand. */
  realms: number;
  /** The player's breakdown; null without a player. */
  mine: ScoreBreakdown | null;
  /** The five leading realms by their ranks together, then the player if not among them. */
  ledger: { nation: number; scores: [number, number, number]; ranks: [number, number, number] }[];
  ending: (Ending & { highs: { largest: number; years: number; battlesWon: number }; choices: string[] }) | null;
  playedOn: boolean;
}

function breakdown(world: World, n: number): ScoreBreakdown {
  const P = world.campaign.scoreParts;
  const R = world.campaign.scoreRanks;
  const b = n * PARTS;
  return {
    income: Math.round(P[b + INCOME]!),
    bank: Math.round(P[b + BANK]!),
    provinces: P[b + PROVINCES]!,
    army: Math.round(P[b + ARMY]! * 10) / 10,
    technology: Math.round(P[b + TECH]!),
    scores: [scoreOf(world, n, 0), scoreOf(world, n, 1), scoreOf(world, n, 2)],
    ranks: [R[n * 3]!, R[n * 3 + 1]!, R[n * 3 + 2]!],
  };
}

const CHOICES: Record<EndingKind, string[]> = {
  "end date": ["Look at the map", "New game"],
  "game over": ["Play on as another realm", "New game"],
  "world domination": ["Keep playing", "New game"],
};

export function campaignView(world: World): CampaignView {
  const c = world.campaign;
  const N = world.nationCount;
  const scores = new Int32Array(N * 3);
  let realms = 0;
  for (let n = 0; n < N; n++) {
    for (let k = 0; k < 3; k++) scores[n * 3 + k] = scoreOf(world, n, k);
    if (!world.nationGone[n]) realms++;
  }
  const R = c.scoreRanks;
  const sum = (n: number) => R[n * 3]! + R[n * 3 + 1]! + R[n * 3 + 2]!;
  const alive: number[] = [];
  for (let n = 0; n < N; n++) if (R[n * 3]! > 0) alive.push(n);
  alive.sort((x, y) => sum(x) - sum(y) || x - y);
  const rows = alive.slice(0, LEDGER_LEADERS);
  const me = c.ending ? c.ending.realm : world.player;
  if (me >= 0 && !rows.includes(me)) rows.push(me);
  const row = (n: number) => ({ nation: n, scores: [scores[n * 3]!, scores[n * 3 + 1]!, scores[n * 3 + 2]!] as [number, number, number], ranks: [R[n * 3]!, R[n * 3 + 1]!, R[n * 3 + 2]!] as [number, number, number] });
  return {
    endDate: c.endDate,
    scoresDate: c.scoresDate,
    scores,
    ranks: R.slice(),
    realms,
    mine: me >= 0 ? breakdown(world, me) : null,
    ledger: rows.map(row),
    ending: c.ending
      ? { ...c.ending, highs: { largest: c.nationLargest[c.ending.realm]!, years: Math.max(0, Number(c.ending.date.slice(0, 4)) - c.startYear), battlesWon: c.nationBattlesWon[c.ending.realm]! }, choices: CHOICES[c.ending.kind] }
      : null,
    playedOn: c.playedOn,
  };
}

// ---------------------------------------------------------------- saves

export interface SavedCampaignEnd {
  endDate: string;
  startYear: number;
  largest: number[];
  battlesWon: number[];
  ending: Ending | null;
  dominationWon: boolean;
  playedOn: boolean;
}

export function saveCampaignEnd(world: World): SavedCampaignEnd {
  const c = world.campaign;
  return { endDate: c.endDate, startYear: c.startYear, largest: [...c.nationLargest], battlesWon: [...c.nationBattlesWon], ending: c.ending, dominationWon: c.dominationWon, playedOn: c.playedOn };
}

/** A save from before campaign end keeps the defaults; scores are worked out again from the world. */
export function restoreCampaignEnd(world: World, saved: SavedCampaignEnd | undefined, mapN: (old: number) => number): void {
  const c = world.campaign;
  if (saved) {
    c.endDate = saved.endDate;
    c.startYear = saved.startYear;
    saved.largest.forEach((v, old) => {
      const n = mapN(old);
      if (n >= 0) c.nationLargest[n] = v;
    });
    saved.battlesWon.forEach((v, old) => {
      const n = mapN(old);
      if (n >= 0) c.nationBattlesWon[n] = v;
    });
    c.ending = saved.ending ? { ...saved.ending, realm: mapN(saved.ending.realm) } : null;
    c.dominationWon = saved.dominationWon;
    c.playedOn = saved.playedOn;
  }
  const { owned } = landCounts(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (owned[n]! > c.nationLargest[n]!) c.nationLargest[n] = owned[n]!;
    world.nationGone[n] = owned[n] === 0 && c.nationLargest[n]! > 0 ? 1 : 0;
  }
  workOutScores(world);
}

