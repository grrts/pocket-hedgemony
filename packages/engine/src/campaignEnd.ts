import type { GameDate } from "@ph/rules";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { LEDGER, LEDGER_LINES } from "./treasury.ts";
import { averagedScore, chapterEnds, economyScore, growth, powerScore, realmConfig, startFloor, technologyScore } from "./domain/realm/index.ts";
import { outcomeOf, type RealmScores } from "./domain/game-shell/ending.ts";
import { eventsConfig } from "./domain/events/model.ts";
import { switchCountry } from "./domain/achievements/index.ts";
import * as nv from "./domain/naval/index.ts";

/**
 * How a campaign ends in play (SHELL-162 to SHELL-164): the three win scores
 * worked out at the start and each January (REALM-173), world domination
 * checked in the January turn, the end date, and the player's realm gone.
 * When one of them comes the clock stops and the end card says how it ended.
 *
 * Scores are judged fairly (X-28): each is the average of the realm's last 25
 * Januaries, measured as growth against the realm's own start, so a small
 * realm that grows can lead; and every 100 years a chapter closes with its
 * own standings, against each realm's score when the chapter began
 * (REALM-310 to REALM-314, SHELL-182 to SHELL-184).
 */

export const SCORE_NAMES = ["Economy", "Power", "Technology"] as const;
/** Parts kept per realm: yearly income, bank, the bank as counted, provinces (subjects' at half), army power, technology. */
const PARTS = 6;
const [INCOME, BANK, COUNTED, PROVINCES, ARMY, TECH] = [0, 1, 2, 3, 4, 5];
/** Januaries kept per realm for the average (REALM-311). */
const YEARS = realmConfig.win.average_years;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const chapterName = (n: number): string => ROMAN[n - 1] ?? String(n);
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

/** A chapter closed (REALM-313): how the player's realm did, and who led. */
export interface ChapterRecord {
  /** 1 for the first chapter. */
  n: number;
  from: number;
  to: number;
  /** The player's realm when it closed, -1 without one. */
  realm: number;
  /** The player's growth in each score over the chapter, and its rank among the realms standing. */
  growth: [number, number, number];
  ranks: [number, number, number];
  realms: number;
  /** The leaders of each score (ties share), and their growth. */
  leaders: [number[], number[], number[]];
  leaderGrowth: [number, number, number];
  /** The five leading realms by their chapter ranks together, then the player. */
  ledger: { nation: number; growth: [number, number, number]; ranks: [number, number, number] }[];
  /** The last chapter closes with the campaign. */
  last: boolean;
}

export interface CampaignEndState {
  /** The campaign's end date, ISO (the scenario's, 31 August 1939 by default; SHELL-100). */
  endDate: string;
  /** Year the campaign began, for years lasted. */
  startYear: number;
  /** PARTS per realm, as last worked out. */
  scoreParts: Float64Array;
  /** Each realm's last YEARS January scores, a ring of three per year (REALM-311). */
  history: Float64Array;
  /** Januaries scored per realm so far; the ring's next slot is this modulo YEARS. */
  historyLen: Int32Array;
  /** Each realm's averaged scores at the start of the campaign, or when it first stood, three per realm (REALM-312). */
  startScore: Float64Array;
  /** The floors under the starts, one per score. */
  startFloors: [number, number, number];
  /** The same at the start of the chapter that is running (REALM-313). */
  chapterScore: Float64Array;
  chapterFloors: [number, number, number];
  /** 1 once a realm has its start, 2 once it also has its chapter start. */
  started: Uint8Array;
  /** Year the running chapter began, and the years in a chapter (`win.chapter_years`; shorter only for a look at the card in development). */
  chapterFrom: number;
  chapterYears: number;
  chapters: ChapterRecord[];
  /** Rank (1 = first) of each realm in each score's growth, 0 for a realm that is gone; three per realm. */
  scoreRanks: Int16Array;
  /** When the scores were last worked out, ISO, and how many times they have been, so the view knows it is stale. */
  scoresDate: string;
  scoresRun: number;
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
    history: new Float64Array(N * YEARS * 3),
    historyLen: new Int32Array(N),
    startScore: new Float64Array(N * 3),
    startFloors: [1, 1, 1],
    chapterScore: new Float64Array(N * 3),
    chapterFloors: [1, 1, 1],
    started: new Uint8Array(N),
    chapterFrom: start.year,
    chapterYears: realmConfig.win.chapter_years,
    chapters: [],
    scoreRanks: new Int16Array(N * 3),
    scoresDate: "",
    scoresRun: 0,
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

/** At the start: each realm's size so far, and the scores, which are every realm's start (SHELL-162, REALM-312). */
export function seedCampaign(world: World): void {
  const { owned } = landCounts(world);
  world.campaign.nationLargest.set(owned);
  workOutScores(world, true);
}

/**
 * Works out every realm's three scores (REALM-151 to REALM-153); in a January
 * turn and at the start they are kept for the average (REALM-311), and a realm
 * scored for the first time takes them as its start (REALM-312). Ranks follow
 * growth since the start (REALM-156).
 */
export function workOutScores(world: World, january = false): void {
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
  const P = c.scoreParts;
  const lines = incomeLines();
  for (let n = 0; n < N; n++) {
    let monthly = 0;
    for (const k of lines) monthly += Math.max(0, world.nationLedger[n * LEDGER_LINES + k]!);
    const e = economyScore(monthly * 12, world.nationTreasury[n]!, world.nationDebt[n]!);
    const pw = powerScore({ provinces: owned[n]!, subjectProvinces: subjectLand[n]!, foot: foot[n]!, horse: horse[n]!, warships: warships[n]! });
    P[n * PARTS + INCOME] = e.income;
    P[n * PARTS + BANK] = e.bank;
    P[n * PARTS + COUNTED] = e.counted;
    P[n * PARTS + PROVINCES] = pw.provinces;
    P[n * PARTS + ARMY] = pw.army;
    P[n * PARTS + TECH] = world.research[n] ? technologyScore(world.research[n]!.known) : 0;
  }
  if (january) keepJanuary(world);
  rankAll(world, (n, k) => growthOf(world, n, k), c.scoreRanks);
  c.scoresDate = isoDay(world.date);
  c.scoresRun++;
}

/** Ranks every realm that stands by `v`, equal values sharing a place; a realm that is gone ranks 0. */
function rankAll(world: World, v: (n: number, k: number) => number, out: Int16Array): void {
  const N = world.nationCount;
  for (let k = 0; k < 3; k++) {
    const order: number[] = [];
    for (let n = 0; n < N; n++) if (!world.nationGone[n]) order.push(n);
    order.sort((x, y) => v(y, k) - v(x, k) || x - y);
    for (let i = 0; i < order.length; i++) out[order[i]! * 3 + k] = i > 0 && v(order[i]!, k) === v(order[i - 1]!, k) ? out[order[i - 1]! * 3 + k]! : i + 1;
    for (let n = 0; n < N; n++) if (world.nationGone[n]) out[n * 3 + k] = 0;
  }
}

/** This January's scores go into each standing realm's last YEARS; a realm scored for the first time takes them as its start, and as its chapter's. */
function keepJanuary(world: World): void {
  const c = world.campaign;
  const first = !c.started.some((x) => x > 0);
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n]) continue;
    const slot = (n * YEARS + (c.historyLen[n]! % YEARS)) * 3;
    // Kept as whole numbers, as they are shown and saved, so a loaded game judges exactly as before.
    for (let k = 0; k < 3; k++) c.history[slot + k] = Math.round(nowOf(world, n, k));
    c.historyLen[n]!++;
    if (c.started[n]! >= 2) continue;
    for (let k = 0; k < 3; k++) {
      if (!c.started[n]) c.startScore[n * 3 + k] = Math.round(averageOf(world, n, k));
      c.chapterScore[n * 3 + k] = Math.round(averageOf(world, n, k));
    }
    c.started[n] = 2;
  }
  // The first scores are every realm's start, and the floors come from them (REALM-312).
  if (first) {
    c.startFloors = floorsOf(world, c.startScore);
    c.chapterFloors = [...c.startFloors];
  }
}

function floorsOf(world: World, starts: Float64Array): [number, number, number] {
  const out: [number, number, number] = [1, 1, 1];
  for (let k = 0; k < 3; k++) {
    const v: number[] = [];
    for (let n = 0; n < world.nationCount; n++) if (!world.nationGone[n] && world.campaign.started[n]) v.push(starts[n * 3 + k]!);
    out[k] = startFloor(v);
  }
  return out;
}

/** A realm's score k (0 Economy, 1 Power, 2 Technology) as it stands now, before averaging. */
export function nowOf(world: World, n: number, k: number): number {
  const P = world.campaign.scoreParts;
  const b = n * PARTS;
  return k === 0 ? P[b + INCOME]! + P[b + COUNTED]! : k === 1 ? P[b + PROVINCES]! + P[b + ARMY]! : P[b + TECH]!;
}

/** The average of a realm's last Januaries in score k (REALM-311); before its first, its score now. */
export function averageOf(world: World, n: number, k: number): number {
  const c = world.campaign;
  const len = Math.min(c.historyLen[n]!, YEARS);
  if (!len) return nowOf(world, n, k);
  const kept: number[] = [];
  for (let i = 0; i < len; i++) kept.push(c.history[(n * YEARS + i) * 3 + k]!);
  return averagedScore(kept);
}

/** A realm's averaged score k, rounded as shown. */
export const scoreOf = (world: World, n: number, k: number): number => Math.round(averageOf(world, n, k));

/** Growth since the realm's start in score k, what wins at the end date (REALM-312). */
export const growthOf = (world: World, n: number, k: number): number => growth(averageOf(world, n, k), world.campaign.startScore[n * 3 + k]!, world.campaign.startFloors[k]!);

/** Growth since the running chapter began in score k (REALM-313). */
export const chapterGrowthOf = (world: World, n: number, k: number): number => growth(averageOf(world, n, k), world.campaign.chapterScore[n * 3 + k]!, world.campaign.chapterFloors[k]!);

const realmScores = (world: World, n: number): RealmScores => ({ realm: world.nationIds[n]!, Economy: growthOf(world, n, 0), Power: growthOf(world, n, 1), Technology: growthOf(world, n, 2) });

/** The five leading realms by their places together, then `me` if not among them. */
function leadingRows(world: World, ranks: Int16Array, me: number): number[] {
  const sum = (n: number) => ranks[n * 3]! + ranks[n * 3 + 1]! + ranks[n * 3 + 2]!;
  const alive: number[] = [];
  for (let n = 0; n < world.nationCount; n++) if (ranks[n * 3]! > 0) alive.push(n);
  alive.sort((x, y) => sum(x) - sum(y) || x - y);
  const rows = alive.slice(0, LEDGER_LEADERS);
  if (me >= 0 && !rows.includes(me) && ranks[me * 3]! > 0) rows.push(me);
  return rows;
}

const triple = <T>(f: (k: number) => T): [T, T, T] => [f(0), f(1), f(2)];

/**
 * A chapter closes (REALM-313): every standing realm's growth over it, the
 * leaders and the player's place are kept, and the next chapter starts from
 * every realm's average now.
 */
function closeChapter(world: World, to: number, last: boolean, news: News[]): void {
  const c = world.campaign;
  const N = world.nationCount;
  const ranks = new Int16Array(N * 3);
  const g = (n: number, k: number) => chapterGrowthOf(world, n, k);
  rankAll(world, g, ranks);
  const me = world.player;
  let realms = 0;
  for (let n = 0; n < N; n++) if (ranks[n * 3]! > 0) realms++;
  const leaders = triple((k) => {
    const out: number[] = [];
    for (let n = 0; n < N; n++) if (ranks[n * 3 + k] === 1) out.push(n);
    return out;
  });
  const record: ChapterRecord = {
    n: c.chapters.length + 1,
    from: c.chapterFrom,
    to,
    realm: me,
    growth: me >= 0 ? triple((k) => g(me, k)) : [0, 0, 0],
    ranks: me >= 0 ? triple((k) => ranks[me * 3 + k]!) : [0, 0, 0],
    realms,
    leaders,
    leaderGrowth: triple((k) => (leaders[k]!.length ? g(leaders[k]![0]!, k) : 0)),
    ledger: leadingRows(world, ranks, me).map((n) => ({ nation: n, growth: triple((k) => g(n, k)), ranks: triple((k) => ranks[n * 3 + k]!) })),
    last,
  };
  c.chapters.push(record);
  if (me >= 0 && !last) {
    const led = triple((k) => leaders[k]!.includes(me));
    const names = SCORE_NAMES.filter((_, k) => led[k]);
    news.push({ kind: "campaign", text: `Chapter ${chapterName(record.n)} closes (${record.from}–${to}). ${names.length ? `${world.rules.nations[me]!.name} led ${names.join(" and ")}.` : `${world.rules.nations[me]!.name} placed ${SCORE_NAMES.map((s, k) => `${ordinal(record.ranks[k]!)} in ${s}`).join(", ")}.`}`, nations: [me] });
  }
  if (last) return;
  for (let n = 0; n < N; n++) {
    if (world.nationGone[n] || !c.started[n]) continue;
    for (let k = 0; k < 3; k++) c.chapterScore[n * 3 + k] = Math.round(averageOf(world, n, k));
  }
  c.chapterFloors = floorsOf(world, c.chapterScore);
  c.chapterFrom = to;
}

const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

/** The realms that still exist, with their scores. */
function standing(world: World): RealmScores[] {
  const out: RealmScores[] = [];
  for (let n = 0; n < world.nationCount; n++) if (!world.nationGone[n] || n === world.player) out.push(realmScores(world, n));
  return out;
}

/** Each January (REALM-173): the scores, and the player's world domination (REALM-154, SHELL-129). */
export function yearlyScores(world: World, news: News[]): void {
  workOutScores(world, true);
  const c = world.campaign;
  // A chapter closes every 100 years, in the January turn (REALM-313).
  const y = world.date.year;
  if (y > c.chapterFrom && chapterEnds(c.startYear, Number(c.endDate.slice(0, 4)), c.chapterYears).includes(y)) closeChapter(world, y, false, news);
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

/** Each week: the highs, realms that have lost all their land, and the player's realm gone (SHELL-094, SHELL-164). */
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
  // The ranks it held at the last reckoning (SHELL-164).
  end(world, "game over", `${how} · ${world.date.year}`, outcomeOf(world.nationIds[me]!, standing(world), { atEndDate: false }).line, news);
}

/** Each day: the end date (SHELL-097, SHELL-100, SHELL-130). */
export function dailyEndCheck(world: World, news: News[]): void {
  const c = world.campaign;
  if (world.player < 0 || (c.ending && c.ending.kind !== "world domination") || isoDay(world.date) < c.endDate) return;
  workOutScores(world);
  // The last chapter closes with the campaign (REALM-313).
  closeChapter(world, world.date.year, true, news);
  const me = world.nationIds[world.player]!;
  const line = outcomeOf(me, standing(world), { atEndDate: true, earlierWins: c.dominationWon ? ["World domination"] : [] }).line;
  end(world, "end date", `The campaign ends · ${world.date.day ?? 1} ${MONTHS[world.date.month - 1]} ${world.date.year}`, line, news);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function end(world: World, kind: EndingKind, headline: string, outcome: string, news: News[]): void {
  world.campaign.ending = { kind, date: isoDay(world.date), headline, outcome, realm: world.player };
  news.push({ kind: "campaign", text: `${headline}. ${outcome}.`, nations: [world.player] });
}

/** True while the end card stands and the clock may not run (SHELL-164). */
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
  if (world.achievements) switchCountry(world.achievements.campaign, world.nationIds[n]!);
  return null;
}

// ---------------------------------------------------------------- what the UI shows

export interface ScoreBreakdown {
  income: number;
  bank: number;
  /** The bank as it counts: at most a year's income, debt in full (REALM-310). */
  counted: number;
  provinces: number;
  army: number;
  technology: number;
  /** The three scores as they stand now, before averaging. */
  now: [number, number, number];
  /** The averages of the last Januaries, what is judged (REALM-311). */
  scores: [number, number, number];
  /** Januaries in the average so far. */
  years: number;
  /** The start each is measured against, floored (REALM-312). */
  starts: [number, number, number];
  growth: [number, number, number];
  ranks: [number, number, number];
  /** The same over the running chapter (REALM-313). */
  chapterStarts: [number, number, number];
  chapterGrowth: [number, number, number];
  chapterRanks: [number, number, number];
}

export interface CampaignView {
  endDate: string;
  scoresDate: string;
  /** Every realm's Economy, Power and Technology, averaged over its last Januaries, three per realm. */
  scores: Int32Array;
  /** Every realm's growth in each since its start, three per realm; what is ranked and wins (REALM-312). */
  growth: Float32Array;
  /** Every realm's rank in each by growth, 0 when gone. */
  ranks: Int16Array;
  /** The running chapter, and the year it closes (REALM-313). */
  chapter: { n: number; from: number; to: number; last: boolean };
  /** The chapters closed so far, oldest first. */
  chapters: ChapterRecord[];
  /** Realms that still stand. */
  realms: number;
  /** The player's breakdown; null without a player. */
  mine: ScoreBreakdown | null;
  /** The five leading realms by their ranks together, then the player if not among them. */
  ledger: { nation: number; scores: [number, number, number]; growth: [number, number, number]; ranks: [number, number, number] }[];
  ending: (Ending & { highs: { largest: number; years: number; battlesWon: number }; choices: string[] }) | null;
  playedOn: boolean;
}

function breakdown(world: World, n: number, chapterRanks: Int16Array): ScoreBreakdown {
  const c = world.campaign;
  const P = c.scoreParts;
  const R = c.scoreRanks;
  const b = n * PARTS;
  const floored = (base: Float64Array, floors: readonly number[], k: number) => Math.round(Math.max(base[n * 3 + k]!, floors[k]!, 1));
  return {
    income: Math.round(P[b + INCOME]!),
    bank: Math.round(P[b + BANK]!),
    counted: Math.round(P[b + COUNTED]!),
    provinces: P[b + PROVINCES]!,
    army: Math.round(P[b + ARMY]! * 10) / 10,
    technology: Math.round(P[b + TECH]!),
    now: triple((k) => Math.round(nowOf(world, n, k))),
    scores: triple((k) => scoreOf(world, n, k)),
    years: Math.min(c.historyLen[n]!, YEARS),
    starts: triple((k) => floored(c.startScore, c.startFloors, k)),
    growth: triple((k) => growthOf(world, n, k)),
    ranks: triple((k) => R[n * 3 + k]!),
    chapterStarts: triple((k) => floored(c.chapterScore, c.chapterFloors, k)),
    chapterGrowth: triple((k) => chapterGrowthOf(world, n, k)),
    chapterRanks: triple((k) => chapterRanks[n * 3 + k]!),
  };
}

const CHOICES: Record<EndingKind, string[]> = {
  "end date": ["Look at the map", "New game"],
  "game over": ["Play on as another realm", "New game"],
  "world domination": ["Keep playing", "New game"],
};

/** The view changes only when the scores are worked out, the campaign ends or the player changes: snapshots reuse it in between. */
const viewCache = new WeakMap<World, { key: string; view: CampaignView }>();

export function campaignView(world: World): CampaignView {
  const c = world.campaign;
  const key = `${c.scoresDate}/${c.scoresRun}|${c.ending ? `${c.ending.kind}/${c.ending.date}/${c.ending.realm}` : ""}|${world.player}|${c.playedOn}|${c.endDate}|${c.chapters.length}`;
  const hit = viewCache.get(world);
  if (hit && hit.key === key) return hit.view;
  const view = buildView(world);
  viewCache.set(world, { key, view });
  return view;
}

function buildView(world: World): CampaignView {
  const c = world.campaign;
  const N = world.nationCount;
  const scores = new Int32Array(N * 3);
  const grown = new Float32Array(N * 3);
  const R = c.scoreRanks;
  let realms = 0;
  for (let n = 0; n < N; n++) {
    for (let k = 0; k < 3; k++) {
      scores[n * 3 + k] = scoreOf(world, n, k);
      grown[n * 3 + k] = growthOf(world, n, k);
    }
    if (R[n * 3]! > 0) realms++;
  }
  const me = c.ending ? c.ending.realm : world.player;
  const chapterRanks = new Int16Array(N * 3);
  rankAll(world, (n, k) => chapterGrowthOf(world, n, k), chapterRanks);
  const row = (n: number) => ({ nation: n, scores: triple((k) => scores[n * 3 + k]!), growth: triple((k) => growthOf(world, n, k)), ranks: triple((k) => R[n * 3 + k]!) });
  const endYear = Number(c.endDate.slice(0, 4));
  const next = chapterEnds(c.startYear, endYear, c.chapterYears).find((y) => y > c.chapterFrom) ?? endYear;
  return {
    endDate: c.endDate,
    scoresDate: c.scoresDate,
    scores,
    growth: grown,
    ranks: R.slice(),
    chapter: { n: c.chapters.filter((x) => !x.last).length + 1, from: c.chapterFrom, to: next, last: next === endYear },
    chapters: c.chapters.map((x) => ({ ...x, ledger: x.ledger.map((r) => ({ ...r })) })),
    realms,
    mine: me >= 0 ? breakdown(world, me, chapterRanks) : null,
    ledger: leadingRows(world, R, me).map(row),
    ending: c.ending
      ? { ...c.ending, highs: { largest: c.nationLargest[c.ending.realm]!, years: Math.max(0, Number(c.ending.date.slice(0, 4)) - c.startYear), battlesWon: c.nationBattlesWon[c.ending.realm]! }, choices: CHOICES[c.ending.kind] }
      : null,
    playedOn: c.playedOn,
  };
}

// ---------------------------------------------------------------- saves

/** A chapter as saved: realms by id. */
type SavedChapter = Omit<ChapterRecord, "realm" | "leaders" | "ledger"> & { realm: string | null; leaders: [string[], string[], string[]]; ledger: { nation: string; growth: [number, number, number]; ranks: [number, number, number] }[] };

export interface SavedCampaignEnd {
  endDate: string;
  startYear: number;
  /**
   * Scores by realm id (X-28): Januaries scored, the last ones oldest first (three a year), then the start and the
   * chapter's start, each left out (0) where it is the first January kept or the start, as it mostly is.
   */
  scores?: Record<string, [number, number[], number[] | 0, number[] | 0]>;
  startFloors?: [number, number, number];
  chapterFloors?: [number, number, number];
  chapterFrom?: number;
  chapters?: SavedChapter[];
  largest: number[];
  battlesWon: number[];
  ending: Ending | null;
  dominationWon: boolean;
  playedOn: boolean;
}

export function saveCampaignEnd(world: World): SavedCampaignEnd {
  const c = world.campaign;
  const id = (n: number) => world.nationIds[n]!;
  // Whole numbers: the scores are shown so, and a save carries every realm's.
  const r1 = (v: number) => Math.round(v);
  const scores: NonNullable<SavedCampaignEnd["scores"]> = {};
  for (let n = 0; n < world.nationCount; n++) {
    if (!c.started[n]) continue;
    const len = c.historyLen[n]!;
    const years: number[] = [];
    // Oldest first, so a load can play them back into the ring in order.
    for (let i = Math.max(0, len - YEARS); i < len; i++) for (let k = 0; k < 3; k++) years.push(r1(c.history[(n * YEARS + (i % YEARS)) * 3 + k]!));
    const start = [0, 1, 2].map((k) => r1(c.startScore[n * 3 + k]!));
    const chapter = [0, 1, 2].map((k) => r1(c.chapterScore[n * 3 + k]!));
    const same = (a: number[], b: number[]) => a.every((v, k) => v === b[k]);
    scores[id(n)] = [len, years, len <= YEARS && same(start, years.slice(0, 3)) ? 0 : start, same(chapter, start) ? 0 : chapter];
  }
  const chapters: SavedChapter[] = c.chapters.map((x) => ({ ...x, realm: x.realm >= 0 ? id(x.realm) : null, leaders: triple((k) => x.leaders[k]!.map(id)), ledger: x.ledger.map((r) => ({ ...r, nation: id(r.nation) })) }));
  return { endDate: c.endDate, startYear: c.startYear, scores, startFloors: c.startFloors, chapterFloors: c.chapterFloors, chapterFrom: c.chapterFrom, chapters, largest: [...c.nationLargest], battlesWon: [...c.nationBattlesWon], ending: c.ending, dominationWon: c.dominationWon, playedOn: c.playedOn };
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
    restoreScores(world, saved);
  }
  const { owned } = landCounts(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (owned[n]! > c.nationLargest[n]!) c.nationLargest[n] = owned[n]!;
    world.nationGone[n] = owned[n] === 0 && c.nationLargest[n]! > 0 ? 1 : 0;
  }
  // A save from before the fair score (X-28) starts the average, and every realm's start, from the world as it is.
  workOutScores(world, !saved?.scores);
}

function restoreScores(world: World, saved: SavedCampaignEnd): void {
  const c = world.campaign;
  if (!saved.scores) return;
  for (const [id, [len, years, start0, chapter0]] of Object.entries(saved.scores)) {
    const n = world.nationIndex.get(id);
    if (n === undefined) continue;
    const kept = years.length / 3;
    for (let i = 0; i < kept; i++) {
      const at = len - kept + i;
      for (let k = 0; k < 3; k++) c.history[(n * YEARS + (at % YEARS)) * 3 + k] = years[i * 3 + k]!;
    }
    c.historyLen[n] = len;
    const start = start0 || years.slice(0, 3);
    const chapter = chapter0 || start;
    for (let k = 0; k < 3; k++) {
      c.startScore[n * 3 + k] = start[k]!;
      c.chapterScore[n * 3 + k] = chapter[k]!;
    }
    c.started[n] = 2;
  }
  if (saved.startFloors) c.startFloors = [...saved.startFloors];
  if (saved.chapterFloors) c.chapterFloors = [...saved.chapterFloors];
  if (saved.chapterFrom !== undefined) c.chapterFrom = saved.chapterFrom;
  const nOf = (id: string | null) => (id === null ? -1 : (world.nationIndex.get(id) ?? -1));
  c.chapters = (saved.chapters ?? []).map((x) => ({ ...x, realm: nOf(x.realm), leaders: triple((k) => x.leaders[k]!.map(nOf).filter((n) => n >= 0)), ledger: x.ledger.map((r) => ({ ...r, nation: nOf(r.nation) })).filter((r) => r.nation >= 0) }));
}

