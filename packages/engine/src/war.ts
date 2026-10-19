import { lordsLoseWar } from "./lords.ts";
import { battleDeath } from "./people.ts";
import { armyDead, garrisonDead } from "./fallen.ts";
import { castleStep } from "./works.ts";
import { markBattle } from "./moods.ts";
import type { Ground } from "@ph/rules";
import { independencePeace, subjectAnswersCall, tablesTurned, turnTables } from "./subjects.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as wf from "./domain/warfare/index.ts";
import navalData from "../../rules/data/domain/naval.json" with { type: "json" };
import { planRoute } from "./march.ts";
import { GROUNDS } from "./tiles.ts";
import { halt, marchTo, routeBars } from "./turn.ts";
import { marchMap, NO_PATH, type World } from "./world.ts";
import { battleWon } from "./campaignEnd.ts";
import { retinueScatters, retinuesWon } from "./retinues.ts";
import { aiRecruits, ARMS, canCall, commanderBattle, KIND, KIND_NAMES, menByArm, sendHome } from "./recruit.ts";
import { withoutOf } from "./research.ts";
import { officialBonus, provinceTaken } from "./officials.ts";
import { noteBattle, notePeace, noteSiege } from "./achievements.ts";
import { demandableProvinces, makeDemand, whyNotDemand } from "./statecraft.ts";
import { heritageFactor } from "./heritage.ts";
import { lostBattle } from "./rebels.ts";
import { bestTerms, markSurrender, noteWarBattle, settlementTable } from "./settlement.ts";
import { priceContext, priceOfWar, whyAiWontDeclare } from "./priceOfWar.ts";
import { grabbedLand } from "./conquest.ts";
import { goalPlacesHeldBy, goalPulls } from "./goals.ts";
import goalsConfig from "../../rules/data/domain/events.json" with { type: "json" };
import { cededProvinces, fittingAim, landTakenWithoutAim, monthlyRefusals, noteWarVictory, peaceVoices, refusedPeace, truceBroken, type GameWar } from "./peace.ts";
import { aiAnswersDefence, defenceCalls, dissolveEmpire, whyNotDissolveTerm } from "./institutions.ts";

/**
 * Milestone 1, war and conquest: wires the diplomacy context (who is at war,
 * declarations, calls to arms, truces) and the warfare context (battles,
 * sieges, occupation, peace) into the weekly turn. The domain functions keep
 * the rules; this file only maps the engine's typed arrays onto them.
 */

const rel = dip.relations;

/** Something that happened this turn that a player may want to read. */
export interface News {
  kind: "war" | "joined" | "call" | "peace" | "battle" | "siege" | "occupied" | "freed" | "raised" | "refused" | "destroyed" | "famine" | "unrest" | "invention" | "built" | "envoy" | "reform" | "rebels" | "event" | "heritage" | "voyage" | "colony" | "crown" | "revolution" | "trade" | "ruler" | "campaign" | "founded" | "tribe" | "plague";
  text: string;
  /** Nations it is about, by index. */
  nations: number[];
  province?: number;
  /** A battle or siege that has just begun: the player is told at once, over the map. */
  begins?: true;
  /** A major historical event: every realm hears of it. */
  major?: true;
}

export interface SiegeState {
  /** Nation leading the siege. */
  by: number;
  siege: wf.Siege;
  /** Days since the siege began; a siege month passes every SIEGE_MONTH_DAYS. */
  days: number;
}

/** Days in a siege month (four weeks). */
export const SIEGE_MONTH_DAYS = 28;

/** Walls by the province's castle (works: the map's castles and forts, and those built since); every capital has a stone castle. */
export function wallsOf(world: World, p: number): string | null {
  const owner = world.provinceOwner[p]!;
  if (owner >= 0 && world.rules.nations[owner]!.capital === world.provinceIds[p]) return "stone castle";
  const step = castleStep(world, p);
  return step >= 2 ? "stone castle" : step === 1 ? "earthwork ring fort" : null;
}

export function maxGarrison(world: World, p: number): number {
  const w = wallsOf(world, p);
  if (!w) return 0;
  const owner = world.provinceOwner[p]!;
  const g = world.rules.defines.war.garrison;
  // Heritage may man the walls more strongly (garrison_pct).
  const heritage = heritageFactor(world, owner, "garrison_pct");
  if (owner >= 0 && world.rules.nations[owner]!.capital === world.provinceIds[p]) return g.capital * heritage;
  return (w === "stone castle" ? g.castle : g.fort) * heritage;
}

/** The 1444 relations between the map's realms (the dataset also lists realms the map folds into others). */
export function createWarState(world: World): dip.Diplomacy {
  const d = dip.createFromDataset(isoDate(world));
  // A sleeping realm has no ties in 1444 (SETUP-082).
  const onMap = (id: string) => world.nationIndex.has(id) && !world.nationAsleep[world.nationIndex.get(id)!];
  d.graph.relations = d.graph.relations.filter((r) => onMap(r.source) && onMap(r.target));
  d.graph.facts = d.graph.facts.filter((f) => onMap(f.source) && onMap(f.target));
  // Wars already under way in November 1444 become wars the game can end.
  for (const r of d.graph.relations.filter((x) => x.type === "at_war")) {
    d.seq++;
    d.wars.push({ id: `war${d.seq}`, attackers: [r.source], defenders: [r.target], aim: "no_aim", declarer: r.source, target: r.target, start: dip.monthOf(d.date), startedBy: r.source });
  }
  // Royal marriages of 1444 count as marriages between the houses (DIPL-106).
  for (const f of d.graph.facts) if (f.fact === "royal_marriage" && !d.marriages.some((m) => dip.pairKey(m.a, m.b) === dip.pairKey(f.source, f.target))) d.marriages.push({ a: f.source, b: f.target });
  for (let p = 0; p < world.provinceCount; p++) {
    const a = world.provinceOwner[p]!;
    if (a < 0) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const b = world.provinceOwner[world.adjList[k]!]!;
      if (b >= 0 && b !== a && !dip.borders(d, world.nationIds[a]!, world.nationIds[b]!)) dip.setBorder(d, world.nationIds[a]!, world.nationIds[b]!);
    }
  }
  return d;
}

export function isoDate(world: World): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${world.date.year}-${pad(world.date.month)}-${pad(world.date.day ?? 1)}`;
}

export function syncDate(world: World): void {
  world.diplomacy.date = world.diplomacy.graph.date = isoDate(world);
}

export function atWar(world: World, a: number, b: number): boolean {
  return a !== b && rel.has(world.diplomacy.graph, "at_war", world.nationIds[a]!, world.nationIds[b]!);
}

/** Enemies of each nation, by index, for the phases that test many pairs; worked out again when the wars change. */
const enemyCache = new WeakMap<World, { key: string; table: Set<number>[] }>();
function enemyTable(world: World): Set<number>[] {
  const g = world.diplomacy.graph;
  const key = `${g.relations.length}|${world.diplomacy.wars.length}|${world.diplomacy.seq}|${world.day}`;
  const hit = enemyCache.get(world);
  if (hit && hit.key === key) return hit.table;
  const table = buildEnemyTable(world);
  enemyCache.set(world, { key, table });
  return table;
}

function buildEnemyTable(world: World): Set<number>[] {
  const t = world.nationIds.map(() => new Set<number>());
  for (const r of world.diplomacy.graph.relations) {
    if (r.type !== "at_war") continue;
    const a = world.nationIndex.get(r.source);
    const b = world.nationIndex.get(r.target);
    if (a === undefined || b === undefined) continue;
    t[a]!.add(b);
    t[b]!.add(a);
  }
  return t;
}

/** Who holds a province now: its occupier, else its owner. */
export const controller = (world: World, p: number): number => (world.provinceOccupier[p]! >= 0 ? world.provinceOccupier[p]! : world.provinceOwner[p]!);

/** The nation's relation to each other nation, as the client shows it. */
export function relationState(world: World, a: number, b: number): { state: "war" | "truce" | "alliance" | "subject" | "overlord" | null; until?: string } {
  const g = world.diplomacy.graph;
  const x = world.nationIds[a]!;
  const y = world.nationIds[b]!;
  if (rel.has(g, "at_war", x, y)) return { state: "war" };
  if (rel.overlord(g, x) === y) return { state: "subject" };
  if (rel.overlord(g, y) === x) return { state: "overlord" };
  if (rel.has(g, "alliance", x, y)) return { state: "alliance" };
  const truce = rel.find(g, "truce", x, y)[0];
  if (truce) return { state: "truce", ...(truce.expires_on ? { until: truce.expires_on } : {}) };
  return { state: null };
}

// ---------------------------------------------------------------- declaring war and calls

/** How a war is declared: its aim (else the best the declarer holds, else "no aim"), and whether to break a truce first (WAR-179). */
export interface DeclareOptions {
  aim?: string;
  /** The province a Take land aim names. */
  province?: string;
  breakTruce?: boolean;
}

/**
 * Declares war with the aim given, else the best fitting aim the declarer holds
 * (a Take land aim first), else the always-held "no aim"; breaking a truce
 * first makes every lord waver (WAR-179, WAR-222). AI allies answer their
 * calls at once (DIPL-148).
 */
export function declareWar(world: World, a: number, b: number, news: News[], o: DeclareOptions = {}): string | null {
  if (a === b) return "a realm cannot fight itself";
  if (world.provinceOwner.indexOf(b) < 0) return "that realm holds no land";
  const d = world.diplomacy;
  const [x, y] = [world.nationIds[a]!, world.nationIds[b]!];
  const truce = rel.has(d.graph, "truce", x, y);
  if (truce && !o.breakTruce) return `a truce holds with ${name(world, b)}: break it to declare war`;
  const aim = o.aim ? dip.warAimsOf(d, x, y).find((h) => h.aim === o.aim && (!o.province || h.province === o.province)) : defaultAim(world, a, b);
  if (!aim) return `you hold no aim ${o.aim} against ${name(world, b)}`;
  let war: dip.War;
  try {
    if (truce) {
      // Undone if the declaration itself is refused, so a refused war breaks no truce.
      const before = structuredClone(d);
      dip.breakTruce(d, x, y);
      try {
        war = declareWithAim(d, x, y, aim.aim);
      } catch (e) {
        Object.assign(d, before);
        throw e;
      }
      truceBroken(world, a, news);
    } else war = declareWithAim(d, x, y, aim.aim);
  } catch (e) {
    return e instanceof Error ? e.message.replace(/^declare_war: /, "") : String(e);
  }
  if (aim.province) (war as GameWar).aimProvince = aim.province;
  news.push({ kind: "war", text: `${name(world, a)} declares war on ${name(world, b)}.`, nations: [a, b] });
  for (const id of [...war.attackers, ...war.defenders]) {
    const n = world.nationIndex.get(id)!;
    if (n !== a && n !== b) news.push({ kind: "joined", text: `${name(world, n)} joins the war on the side of ${name(world, war.attackers.includes(id) ? a : b)}.`, nations: [n, a, b] });
  }
  // A war on a member of the Empire calls the Emperor to defend it (INST-030).
  if (world.empire) defenceCalls(world, world.empire, news);
  answerAiCalls(world, news);
  return null;
}

/** Fitting aims a declaration picks when none is named, best first; a raid is only ever named (it ends by itself, WAR-186). */
const AIM_ORDER = ["take_land", "seat_pretender", "break_subject", "free_people", "defend_faith", "punish", "tribute"];

/** The aim a declaration of a on b takes when none is named: the best fitting aim a holds, else "no aim". */
export function defaultAim(world: World, a: number, b: number): { aim: string; province?: string } | undefined {
  const held = dip.warAimsOf(world.diplomacy, world.nationIds[a]!, world.nationIds[b]!);
  return AIM_ORDER.map((k) => held.find((h) => h.aim === k)).find((h) => h) ?? held.find((h) => h.aim === "no_aim");
}

/** A regency may fight only some wars: an aim it may not use falls back to no aim. */
function declareWithAim(d: dip.Diplomacy, x: string, y: string, aim: string): dip.War {
  try {
    return dip.declareWar(d, x, y, { aim });
  } catch (e) {
    if (aim === "no_aim" || !(e instanceof Error) || !/regency/.test(e.message)) throw e;
    return dip.declareWar(d, x, y, { aim: "no_aim" });
  }
}

/** AI realms answer calls to arms: defensive calls yes, offensive ones when they are at peace and not much weaker than the enemy. */
export function answerAiCalls(world: World, news: News[]): void {
  const d = world.diplomacy;
  for (const call of d.calls.filter((c) => !c.answer)) {
    const n = world.nationIndex.get(call.called)!;
    if (n === world.player) continue;
    const enemy = world.nationIndex.get(call.against)!;
    // A subject answers its overlord by its loyalty and kind (SUBJ-028, SUBJ-038).
    const yes = call.via === "subject" ? subjectAnswersCall(world, n) : call.via === "empire" ? aiAnswersDefence(world, call) : call.kind === "defensive" || (!dip.warOf(d, call.called) && strength(world, n) * 2 >= strength(world, enemy));
    answerCall(world, call, yes, news);
  }
}

export function answerCall(world: World, call: dip.Call, yes: boolean, news: News[]): void {
  const d = world.diplomacy;
  if (!d.wars.some((w) => w.id === call.war)) {
    call.answer = "no";
    return;
  }
  dip.answerCall(d, call, yes);
  const n = world.nationIndex.get(call.called)!;
  const caller = world.nationIndex.get(call.caller)!;
  // A league call is the member's own (DIPL-160): it answers for the league, not for a caller.
  if (call.via === "league") {
    const x = world.nationIndex.get(call.against)!;
    news.push(
      yes
        ? { kind: "joined", text: `${name(world, n)} joins the war against ${name(world, x)} with the league.`, nations: [n, x] }
        : { kind: "refused", text: `${name(world, n)} stays out of the league's war and leaves the league against ${name(world, x)}.`, nations: [n, x] },
    );
    return;
  }
  news.push(
    yes
      ? { kind: "joined", text: `${name(world, n)} answers ${name(world, caller)}'s call to arms against ${name(world, world.nationIndex.get(call.against)!)}.`, nations: [n, caller] }
      : { kind: "refused", text: `${name(world, n)} refuses ${name(world, caller)}'s call to arms.`, nations: [n, caller] },
  );
}

/** Men in the field plus levies and the lords' men at home: how strong a realm looks to others. */
export function strength(world: World, n: number): number {
  let men = canCall(world, n) + world.nationLordsMen[n]!;
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n) men += a.men[i]!;
  return men;
}

const name = (world: World, n: number) => world.rules.nations[n]!.name;
const provinceName = (world: World, p: number) => world.rules.provinces[p]!.name;

// ---------------------------------------------------------------- battles

/** A battlefield row by the province's ground (the province context's tiles are not simulated yet). */
export function battleRow(g: Ground): string[] {
  switch (g) {
    case "forest":
    case "jungle":
      return ["Woods", "Fields", "Woods", "Woods", "Fields", "Woods"];
    case "hills":
    case "mountains":
      return ["Waste", "Pasture", "Waste", "Fields", "Waste"];
    case "marsh":
      return ["Marsh", "Fields", "Marsh", "Marsh"];
    case "desert":
    case "drylands":
    case "tundra":
      return ["Waste", "Waste", "Pasture", "Waste", "Waste"];
    default:
      return ["Pasture", "Fields", "Fields", "Town", "Fields", "Fields", "Pasture"];
  }
}

/**
 * One side's armies as a warfare army: companies by arm, kind and drill, led by
 * the best commander among them (returned too, by index, or -1).
 */
export function battleArmy(world: World, slots: number[], id: string): [wf.Army, number] {
  const a = world.armies;
  const size = wf.W.company_size.max;
  const companies: wf.Company[] = [];
  let best = -1;
  for (const s of slots) {
    const by = menByArm(world, s);
    const kind = KIND_NAMES[a.kind[s]!]! as wf.Company["kind"];
    ARMS.forEach((arm, k) => {
      for (let left = Math.round(by[k]!); left > 0; left -= size) {
        const m = Math.min(size, left);
        companies.push(wf.newCompany({ kind, arm, men: m, arms: wf.armsNeeded(arm, m), drill: a.drill[s]! }));
      }
    });
    const c = a.commander[s]!;
    if (c >= 0 && (best < 0 || world.commanders[c]!.might > world.commanders[best]!.might)) best = c;
  }
  return [wf.newArmy(id, id, companies, best >= 0 ? { commander: world.commanders[best]! } : {}), best];
}

/** An army's break point: the share of its men it can lose before it breaks, by its companies' drill (WAR-120). */
export function armyBreak(world: World, slot: number): number {
  return wf.armyBreakPoint(battleArmy(world, [slot], "")[0].companies);
}

/** A battle fought over time, a round each 4-hour step, between two sides' armies (by slot). */
export interface Battle {
  id: number;
  /** Where it is fought: the defenders' tile, and its province. */
  tile: number;
  province: number;
  attackers: number[];
  defenders: number[];
  /** Men each side brought (with any who joined), and how many each will have lost by the end. */
  attStart: number;
  defStart: number;
  attLoss: number;
  defLoss: number;
  /** Losses dealt so far. */
  attDealt: number;
  defDealt: number;
  rounds: number;
  round: number;
  /** The worked-out result: the winning side, the reason and the two sides' leading commanders. */
  attackerWins: boolean;
  reason: string;
  attLead: number;
  defLead: number;
  /** Share of each side's losses that are dead (killed, and wounded who die): the rest are taken or flee home. The fallen count it (REALM-096). */
  attDead?: number;
  defDead?: number;
}

/** How far, in tiles, an army looks for enemies to fight: its commander's cunning over a base, within bounds. */
export function engageRange(world: World, slot: number): number {
  const w = world.rules.defines.war;
  const c = world.armies.commander[slot]!;
  if (world.tiles.coarse) return 0;
  return c < 0 ? w.engageMin : Math.max(w.engageMin, Math.min(w.engageMax, w.engageBase + world.commanders[c]!.cunning));
}

/** Tiles between two tiles, counting the map's east-west squeeze. */
export function tileDistance(world: World, s: number, t: number): number {
  const W = world.tiles.width;
  const sx = s % W;
  const tx = t % W;
  const sy = (s - sx) / W;
  const ty = (t - tx) / W;
  const dx = Math.abs(sx - tx) * world.rowWidth[(sy + ty) >> 1]!;
  return Math.hypot(dx, sy - ty);
}

/**
 * Armies of realms at war that come within reach of each other start a
 * battle: the one whose commander found the other attacks. An army that
 * comes within reach of a battle where its enemies fight joins it (TIME-028).
 * Falling-back armies slip past.
 */
export function engage(world: World, news: News[]): void {
  const a = world.armies;
  const enemies = enemyTable(world);
  if (enemies.every((e) => !e.size)) return;
  const W = world.tiles.width;
  const CELL = 16;
  const cols = Math.ceil(W / CELL);
  const cells = new Map<number, number[]>();
  const cellOf = (t: number) => Math.floor((t % W) / CELL) + Math.floor(t / W / CELL) * cols;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.retreating[i] || !enemies[a.owner[i]!]!.size) continue;
    const k = cellOf(a.tile[i]!);
    const list = cells.get(k);
    if (list) list.push(i);
    else cells.set(k, [i]);
  }
  const near = (t: number, range: number, visit: (j: number) => void) => {
    const x = Math.floor((t % W) / CELL);
    const y = Math.floor(t / W / CELL);
    const r = Math.ceil(range / (CELL * 0.3));
    for (let dy = -Math.min(r, 1); dy <= Math.min(r, 1); dy++) {
      for (let dx = -r; dx <= r; dx++) for (const j of cells.get(((x + dx + cols) % cols) + (y + dy) * cols) ?? []) visit(j);
    }
  };
  // Join running battles first, then start new ones.
  for (const b of world.battles) {
    const sideOwners = [b.attackers.map((s) => a.owner[s]!), b.defenders.map((s) => a.owner[s]!)];
    near(b.tile, world.rules.defines.war.engageMax, (j) => {
      if (a.battle[j]! >= 0 || a.retreating[j]) return;
      const n = a.owner[j]!;
      const foeOfAtt = sideOwners[0]!.some((o) => enemies[n]!.has(o));
      const foeOfDef = sideOwners[1]!.some((o) => enemies[n]!.has(o));
      if (foeOfAtt === foeOfDef || a.commander[j]! < 0 || a.location[j] !== b.province || tileDistance(world, a.tile[j]!, b.tile) > engageRange(world, j)) return;
      joinBattle(world, b, j, foeOfAtt ? "defenders" : "attackers");
    });
    joinGarrisons(world, b, enemies);
  }
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.battle[i]! >= 0 || a.retreating[i] || a.commander[i]! < 0) continue;
    const n = a.owner[i]!;
    if (!enemies[n]!.size) continue;
    const range = engageRange(world, i);
    let foe = -1;
    let best = Infinity;
    near(a.tile[i]!, range, (j) => {
      // Only armies in the same province meet, however close they pass (playtest feedback).
      if (j === i || a.battle[j]! >= 0 || a.retreating[j] || a.location[j] !== a.location[i] || !enemies[n]!.has(a.owner[j]!)) return;
      const d = tileDistance(world, a.tile[i]!, a.tile[j]!);
      if (d <= range && d < best) ((best = d), (foe = j));
    });
    if (foe >= 0) joinGarrisons(world, startBattle(world, [i], [foe], news), enemies);
  }
}

/** Garrison troops fight in any battle in their own province, wherever in it they stand (RECR-107). */
function joinGarrisons(world: World, b: Battle, enemies: Set<number>[]): void {
  const a = world.armies;
  const sideOwners = [b.attackers.map((s) => a.owner[s]!), b.defenders.map((s) => a.owner[s]!)];
  for (let j = 0; j < a.count; j++) {
    if (!a.alive[j] || a.commander[j]! >= 0 || a.battle[j]! >= 0 || a.location[j] !== b.province || !enemies[a.owner[j]!]!.size) continue;
    const n = a.owner[j]!;
    const foeOfAtt = sideOwners[0]!.some((o) => enemies[n]!.has(o));
    const foeOfDef = sideOwners[1]!.some((o) => enemies[n]!.has(o));
    if (foeOfAtt !== foeOfDef) joinBattle(world, b, j, foeOfAtt ? "defenders" : "attackers");
  }
}

function startBattle(world: World, att: number[], def: number[], news: News[]): Battle {
  const a = world.armies;
  const tile = a.tile[def[0]!]!;
  const b: Battle = {
    id: ++world.battleSeq,
    tile,
    province: world.tiles.province[tile]! - 1,
    attackers: [],
    defenders: [],
    attStart: 0,
    defStart: 0,
    attLoss: 0,
    defLoss: 0,
    attDealt: 0,
    defDealt: 0,
    rounds: 1,
    round: 0,
    attackerWins: false,
    reason: "",
    attLead: -1,
    defLead: -1,
  };
  world.battles.push(b);
  markBattle(world, b.province);
  for (const s of att) joinBattle(world, b, s, "attackers", false);
  for (const s of def) joinBattle(world, b, s, "defenders", false);
  resolve(world, b);
  const an = name(world, a.owner[att[0]!]!);
  const dn = name(world, a.owner[def[0]!]!);
  news.push({ kind: "battle", text: `Battle at ${provinceName(world, b.province)}: ${an} (${fmt(b.attStart)}) attacks ${dn} (${fmt(b.defStart)}).`, nations: [a.owner[att[0]!]!, a.owner[def[0]!]!], province: b.province, begins: true });
  return b;
}

/** An army joins a side of a battle: it stops marching and its men count from the next round. */
function joinBattle(world: World, b: Battle, s: number, side: "attackers" | "defenders", rework = true): void {
  const a = world.armies;
  b[side].push(s);
  a.battle[s] = b.id;
  a.route[s] = [];
  a.path[s] = NO_PATH;
  a.pathAt[s] = 0;
  a.progress[s] = 0;
  if (side === "attackers") b.attStart += a.men[s]!;
  else b.defStart += a.men[s]!;
  if (rework) resolve(world, b);
}

/**
 * Works out a battle's result with the warfare context, from the men each side
 * has now; the rounds left then deal the losses out a step at a time. A
 * battle lasts a round for every so many men in it, at least one.
 */
function resolve(world: World, b: Battle): void {
  const a = world.armies;
  const att = b.attackers.filter((s) => a.alive[s]);
  const def = b.defenders.filter((s) => a.alive[s]);
  if (!att.length || !def.length) return;
  const era = wf.eraOfYear(world.date.year);
  const c = world.tiles.cell[b.tile]!;
  const ground = (GROUNDS[c & 15] ?? world.provinceGround[b.province] ?? "grassland") as Ground;
  const attOwner = a.owner[att[0]!]!;
  const defOwner = a.owner[def[0]!]!;
  // The resolver names sides in its reason line, so they go by the realms' names.
  const an = name(world, attOwner);
  const dn = name(world, defOwner);
  const [attArmy, attLead] = battleArmy(world, att, an);
  const [defArmy, defLead] = battleArmy(world, def, dn);
  const r = wf.fightBattle({
    // Without C01 *Iron smelting* a realm's regiments fight 20 % weaker (RSCH-094).
    attacker: { country: an, army: attArmy, known: new Set(), homeland: world.provinceOwner[b.province] === attOwner, strengthPct: withoutOf(world, attOwner).strengthPct },
    defender: { country: dn, army: defArmy, known: new Set(), homeland: world.provinceOwner[b.province] === defOwner, strengthPct: withoutOf(world, defOwner).strengthPct },
    sectors: wf.battlefield(battleRow(ground), { ground, era }),
    ground,
    era,
  });
  const attMen = sum(att, a.men);
  const defMen = sum(def, a.men);
  const lostOf = (side: string, men: number) => {
    const l = r.losses[side]!;
    const held = r.winner === side;
    const w = wf.woundedAfter(l.wounded, held);
    const f = wf.fledAfter(l.fled, held);
    return Math.min(men, Math.round(l.killed + w.die + w.prisoners + f.home));
  };
  const deadOf = (side: string) => {
    const l = r.losses[side]!;
    const w = wf.woundedAfter(l.wounded, r.winner === side);
    const all = l.killed + w.die + w.prisoners + wf.fledAfter(l.fled, r.winner === side).home;
    return all > 0 ? (l.killed + w.die) / all : 1;
  };
  b.attDead = deadOf(an);
  b.defDead = deadOf(dn);
  // What is still to be lost is what this result costs on top of what has been dealt.
  b.attLoss = b.attDealt + lostOf(an, attMen);
  b.defLoss = b.defDealt + lostOf(dn, defMen);
  b.attackerWins = r.winner === an;
  b.reason = r.reason;
  b.attLead = attLead;
  b.defLead = defLead;
  b.rounds = b.round + Math.max(1, Math.ceil((attMen + defMen) / world.rules.defines.war.menPerBattleRound));
}

/** A round of every battle: each side loses its share of the result's losses; the last round ends it. */
export function fightRound(world: World, news: News[]): void {
  if (!world.battles.length) return;
  const a = world.armies;
  const enemies = enemyTable(world);
  for (const b of [...world.battles]) {
    b.attackers = b.attackers.filter((s) => a.alive[s]);
    b.defenders = b.defenders.filter((s) => a.alive[s]);
    if (!b.attackers.length || !b.defenders.length) {
      endBattle(world, b);
      continue;
    }
    b.round++;
    const share = Math.min(1, b.round / b.rounds);
    const attNow = Math.round(b.attLoss * share) - b.attDealt;
    const defNow = Math.round(b.defLoss * share) - b.defDealt;
    shareLosses(world, b.attackers, attNow, b.attDead ?? 1);
    shareLosses(world, b.defenders, defNow, b.defDead ?? 1);
    b.attDealt += attNow;
    b.defDealt += defNow;
    if (b.round < b.rounds) continue;
    const winSlots = b.attackerWins ? b.attackers : b.defenders;
    const loseSlots = b.attackerWins ? b.defenders : b.attackers;
    const winner = a.owner[winSlots[0]!]!;
    const loser = a.owner[loseSlots[0]!]!;
    const winStart = b.attackerWins ? b.attStart : b.defStart;
    const loseStart = b.attackerWins ? b.defStart : b.attStart;
    commanderBattle(world, b.attackerWins ? b.attLead : b.defLead, true, winStart < loseStart);
    battleWon(world, winner);
    retinuesWon(world, winSlots, news);
    commanderBattle(world, b.attackerWins ? b.defLead : b.attLead, false, false);
    // The losing commander may fall (WAR-062): people.ts says what follows.
    battleDeath(world, b.attackerWins ? b.defLead : b.attLead, news);
    endBattle(world, b);
    noteBattle(world, winner, loser, winStart, loseStart, b.province);
    noteWarBattle(world, winner, loser, b.attackerWins ? b.attDealt : b.defDealt, b.attackerWins ? b.defDealt : b.attDealt);
    noteWarVictory(world, winner, loser);
    for (const s of loseSlots) fallBack(world, s, enemies, news);
    lostBattle(world, loser, b.province);
    news.push({
      kind: "battle",
      text: `Battle of ${provinceName(world, b.province)}: ${name(world, winner)} (${fmt(winStart)}) beat ${name(world, loser)} (${fmt(loseStart)}). ${capitalise(b.reason)}. Losses ${fmt(b.attackerWins ? b.attDealt : b.defDealt)} and ${fmt(b.attackerWins ? b.defDealt : b.attDealt)}.`,
      nations: [...new Set([...winSlots, ...loseSlots].map((s) => a.owner[s]!))],
      province: b.province,
    });
  }
}

function endBattle(world: World, b: Battle): void {
  for (const s of [...b.attackers, ...b.defenders]) if (world.armies.battle[s] === b.id) world.armies.battle[s] = -1;
  world.battles = world.battles.filter((x) => x !== b);
}

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const months = (m: number) => `${m} month${m === 1 ? "" : "s"}`;
const sum = (slots: number[], arr: Int32Array) => slots.reduce((t, s) => t + arr[s]!, 0);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Each army of a side loses its share of `lost` men; `dead` of them count among its realm's fallen (REALM-096) and leave its home's people (WAR-226). */
function shareLosses(world: World, slots: number[], lost: number, dead: number): void {
  const a = world.armies;
  const total = sum(slots, a.men);
  if (total <= 0) return;
  for (const s of slots) {
    const share = a.men[s]! / total;
    const cut = Math.min(a.men[s]!, Math.round(lost * share));
    armyDead(world, s, cut * dead);
    const horseCut = a.men[s]! > 0 ? Math.round((cut * a.horse[s]!) / a.men[s]!) : 0;
    a.men[s] = Math.max(0, a.men[s]! - cut);
    a.horse[s] = Math.max(0, Math.min(a.men[s]!, a.horse[s]! - horseCut));
  }
}

/**
 * The beaten army falls back to the nearest province its realm holds with no
 * enemy in it, or scatters. It marches there and can't be caught or ordered
 * on the way.
 */
function fallBack(world: World, s: number, enemies: Set<number>[], news: News[]): void {
  const a = world.armies;
  const owner = a.owner[s]!;
  halt(world, s);
  if (a.men[s]! < world.rules.defines.war.disperseBelow) {
    disperse(world, s, `The remnant of ${name(world, owner)}'s army scatters.`, news);
    return;
  }
  const enemyAt = new Set<number>();
  for (let i = 0; i < a.count; i++) if (a.alive[i] && enemies[owner]!.has(a.owner[i]!)) enemyAt.add(a.location[i]!);
  const target = nearest(world, a.location[s]!, (p) => controller(world, p) === owner && !enemyAt.has(p) && p !== a.location[s], 12);
  if (target < 0 || marchTo(world, s, target)) {
    disperse(world, s, `${name(world, owner)}'s beaten army has nowhere to go and scatters.`, news);
    return;
  }
  a.retreating[s] = 1;
}

function disperse(world: World, s: number, text: string, news: News[]): void {
  const a = world.armies;
  // Half the men who survive find their way home to the pools; hired men just leave.
  if (a.kind[s] === KIND.retinue) retinueScatters(world, s, a.men[s]! * 0.5);
  else if (a.kind[s] !== KIND.hired) sendHome(world, a.owner[s]!, a.men[s]! * 0.5);
  a.alive[s] = 0;
  halt(world, s);
  news.push({ kind: "battle", text, nations: [a.owner[s]!], province: a.location[s]! });
}

/** Breadth-first search over land: the nearest province (other than none) that passes the test, within some steps. */
export function nearest(world: World, from: number, test: (p: number) => boolean, maxSteps: number): number {
  const seen = new Map<number, number>([[from, 0]]);
  const queue = [from];
  for (let h = 0; h < queue.length; h++) {
    const p = queue[h]!;
    if (test(p)) return p;
    const d = seen.get(p)!;
    if (d >= maxSteps) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const n = world.adjList[k]!;
      if (world.provinceWater[n] || seen.has(n)) continue;
      seen.set(n, d + 1);
      queue.push(n);
    }
  }
  return -1;
}

// ---------------------------------------------------------------- sieges and occupation

/**
 * Each day, an army standing still in a province held by a realm it is at
 * war with, with no defender there, besieges its walls (WAR-160 … WAR-170) or,
 * where there are none, holds it until it is occupied (hold_months, in days).
 */
export function runOccupation(world: World, newMonth: boolean, news: News[]): void {
  const a = world.armies;
  const enemies = enemyTable(world);
  const present = new Map<number, number[]>();
  for (let i = 0; i < a.count; i++) {
    // Armies marching through or fighting a battle don't hold the land.
    if (!a.alive[i] || a.battle[i]! >= 0 || a.retreating[i] || a.pathAt[i]! < a.path[i]!.length) continue;
    const list = present.get(a.location[i]!) ?? [];
    list.push(i);
    present.set(a.location[i]!, list);
  }
  const holdDays = world.rules.defines.war.holdWeeks * 7;
  // The provinces with an army standing in them, marked so the rest (most of
  // the map, every day) are passed over without a lookup.
  const armed = new Uint8Array(world.provinceCount);
  for (const p of present.keys()) armed[p] = 1;
  const water = world.provinceWater;
  const owners = world.provinceOwner;
  const holds = world.provinceHold;
  const sieges = world.sieges;
  // Off the 1st of the month only provinces with an army, a siege or a hold change, so only they are visited, in order.
  let visit: number[] | null = null;
  if (!newMonth) {
    const marked = [...present.keys(), ...sieges.keys()];
    for (let p = 0; p < world.provinceCount; p++) if (holds[p]) marked.push(p);
    visit = [...new Set(marked)].sort((x, y) => x - y);
  }
  for (let k = 0, end = visit ? visit.length : world.provinceCount; k < end; k++) {
    const p = visit ? visit[k]! : k;
    if (water[p] || owners[p]! < 0) continue;
    const owner = owners[p]!;
    // No army there: nothing is held or besieged, and the walls fill again (most provinces, most days).
    if (!armed[p]) {
      holds[p] = 0;
      if (sieges.size && sieges.delete(p)) news.push({ kind: "siege", text: `The siege of ${provinceName(world, p)} is lifted.`, nations: [owner], province: p });
      if (newMonth && world.provinceOccupier[p]! < 0) refillGarrison(world, p);
      continue;
    }
    const slots = present.get(p)!;
    const ctl = controller(world, p);
    // The rightful owner (or a partner at war with the occupier) frees occupied land; anyone at war with the holder takes it.
    const hostile = slots.filter((s) => enemies[ctl]!.has(a.owner[s]!));
    const defended = slots.some((s) => a.owner[s] === ctl || (!enemies[ctl]!.has(a.owner[s]!) && hostile.some((h) => enemies[a.owner[s]!]!.has(a.owner[h]!))));
    if (!hostile.length || defended) {
      world.provinceHold[p] = 0;
      if (world.sieges.delete(p) && !hostile.length) news.push({ kind: "siege", text: `The siege of ${provinceName(world, p)} is lifted.`, nations: [owner], province: p });
      if (newMonth && world.provinceOccupier[p]! < 0) refillGarrison(world, p);
      continue;
    }
    // The first realm to besiege or hold a province is the one that takes it (Leroy, F-45); the
    // strongest only when several arrive on the same day or the first one leaves.
    const strongest = a.owner[hostile.reduce((b, s) => (a.men[s]! > a.men[b]! ? s : b), hostile[0]!)]!;
    const here = (n: number) => n >= 0 && hostile.some((s) => a.owner[s] === n);
    const besiegers = sum(hostile, a.men);
    const walls = world.provinceOccupier[p]! < 0 ? wallsOf(world, p) : null;
    if (walls && world.provinceGarrison[p]! > 0) {
      let st = world.sieges.get(p);
      if (st && !here(st.by)) st.by = strongest;
      const leader = st ? st.by : strongest;
      if (!st) {
        const garrison = world.provinceGarrison[p]!;
        st = { by: leader, days: 0, siege: wf.newSiege(walls, { ground: world.provinceGround[p] ?? "farmland", garrison, store: garrison * world.rules.defines.war.castleStoreMonths, townsfolk: 0 }) };
        world.sieges.set(p, st);
        news.push({ kind: "siege", text: `${name(world, leader)} lays siege to ${provinceName(world, p)} (${walls}, ${fmt(garrison)} men inside).`, nations: [leader, owner], province: p, begins: true });
      }
      st.siege.besiegers = besiegers;
      st.days++;
      if (st.days % SIEGE_MONTH_DAYS === 0) {
        // A siege that is not closed lets food in (WAR-161).
        const store = st.siege.store;
        const inside = st.siege.garrison;
        wf.siegeMonth(st.siege);
        if (!wf.isClosed(st.siege)) st.siege.store = store;
        // The garrison's dead of the siege month are its realm's fallen, and its province's people (WAR-226).
        garrisonDead(world, ctl, p, inside - st.siege.garrison);
        world.provinceGarrison[p] = st.siege.garrison;
        // A warden's garrison fights a storm as if a quarter stronger (province officials table).
        const warden = officialBonus(world, p, "Warden", "garrison");
        const foodMonths = wf.foodMonths(st.siege);
        if (st.siege.garrison < 1 || wf.aiAcceptsHonours({ breaches: st.siege.breaches, foodMonths, reliefDays: null, cruel: false })) {
          wf.endSiege(st.siege, st.siege.starving ? "surrender" : "honours of war");
          noteSiege(world, leader, "terms", p);
          occupy(world, p, leader, `${provinceName(world, p)} surrenders to ${name(world, leader)} after ${months(st.siege.months)}.`, news);
        } else if (wf.stormable(st.siege).can && besiegers >= st.siege.garrison * warden * world.rules.defines.war.stormRatio) {
          const terms = wf.storm(st.siege);
          shareLosses(world, hostile, Math.round(st.siege.garrison * warden * terms.stormerLosses * (1 + terms.walls)), 1);
          wf.endSiege(st.siege, "storm");
          noteSiege(world, leader, "stormed", p);
          occupy(world, p, leader, `${name(world, leader)} storms ${provinceName(world, p)} after ${months(st.siege.months)}.`, news);
        }
      }
      continue;
    }
    if (world.provinceHold[p] === 0 || !here(world.provinceHoldBy[p]!)) world.provinceHoldBy[p] = strongest;
    const leader = world.provinceHoldBy[p]!;
    world.provinceHold[p] = world.provinceHold[p]! + 1;
    if (world.provinceHold[p]! >= holdDays) {
      const freed = world.provinceOccupier[p]! >= 0 && (leader === owner || !enemies[owner]!.has(leader));
      if (freed) {
        world.provinceOccupier[p] = -1;
        world.provinceHold[p] = 0;
        world.provinceGarrison[p] = 0;
        news.push({ kind: "freed", text: `${name(world, leader)} frees ${provinceName(world, p)}.`, nations: [leader, owner], province: p });
      } else {
        occupy(world, p, leader, `${name(world, leader)} occupies ${provinceName(world, p)}.`, news);
      }
    }
  }
}

/** A month's refill of a held province's garrison, up to what its walls hold. */
function refillGarrison(world: World, p: number): void {
  const max = maxGarrison(world, p);
  world.provinceGarrison[p] = Math.min(max, world.provinceGarrison[p]! + max * world.rules.defines.war.garrisonRecoveryPerMonth);
}

function occupy(world: World, p: number, by: number, text: string, news: News[]): void {
  world.sieges.delete(p);
  world.provinceHold[p] = 0;
  world.provinceGarrison[p] = 0;
  world.provinceOccupier[p] = by === world.provinceOwner[p] ? -1 : by;
  news.push({ kind: "occupied", text, nations: [by, world.provinceOwner[p]!], province: p });
}

// ---------------------------------------------------------------- peace

/**
 * "dissolve" is the peace term *Dissolve the Empire* a non-member who beat the Emperor may take from era IV (INST-051);
 * "master": a subject that won its independence makes its old overlord its own subject (SUBJ-135).
 */
export type PeaceTerms = "take" | "white" | "give" | "dissolve" | "master";

/** A realm's peace voices are counted from its lords, royal provinces and capital (WAR-180, WAR-221): peace.ts. */
export { peaceShare, peaceVoices } from "./peace.ts";

export function sidesOf(world: World, war: dip.War, n: number): { ours: number[]; theirs: number[] } {
  const idx = (ids: string[]) => ids.map((id) => world.nationIndex.get(id)!);
  const att = idx(war.attackers);
  const def = idx(war.defenders);
  return att.includes(n) ? { ours: att, theirs: def } : { ours: def, theirs: att };
}

/** The war that has a and b on opposite sides. */
export function warBetween(world: World, a: number, b: number): dip.War | undefined {
  const x = world.nationIds[a]!;
  const y = world.nationIds[b]!;
  return world.diplomacy.wars.find((w) => (w.attackers.includes(x) && w.defenders.includes(y)) || (w.attackers.includes(y) && w.defenders.includes(x)));
}

/**
 * a offers b peace. Between the two war leaders the whole war ends; otherwise
 * the two make a separate peace. "take" asks b for `demand` (by default the
 * most the war lets a ask, WAR-244), "give" hands b the demanded land and gold
 * of a's (by default all a peace may cede of what b's side holds), and "white"
 * gives back all occupied land. The AI answers a demand by the settlement
 * counts (WAR-243): it signs, counters with what fits, or refuses.
 * One peace cedes at most a third of each loser's provinces and a capital
 * only with its last (WAR-227); `picks` and `gold` name the terms chosen at the
 * peace table, and none means the most the war allows.
 */
export function offerPeace(world: World, a: number, b: number, terms: PeaceTerms, news: News[], aiAsks = false, picks: readonly number[] = [], gold = 0): string | null {
  const demand: wf.Demand | undefined = picks.length || gold > 0 ? { provinces: [...picks], gold } : undefined;
  const war = warBetween(world, a, b);
  if (!war) return "you are not at war with them";
  const leaders = [war.declarer, war.target].map((id) => world.nationIndex.get(id)!);
  const whole = leaders.includes(a) && leaders.includes(b);
  if (terms === "master") {
    // Turning the tables (SUBJ-135): the voices are the rule's own, so the old overlord has no say.
    const t = tablesTurned(world, war, a, b);
    if (!whole || !t.kind) return whole ? t.why : "only between the war's leaders";
    makePeace(world, war, true, a, b, [], news);
    turnTables(world, a, b, t.kind, news);
    return null;
  }
  if (terms === "dissolve") {
    const why = whyNotDissolveTerm(world, a, b);
    if (why) return why;
  }
  if (terms === "white" || terms === "dissolve") {
    if (!aiAsks && b !== world.player) {
      const { ours, theirs } = sidesOf(world, war, a);
      const voices = peaceVoices(world, b, war);
      const months = dip.monthsBetween(war.start, dip.monthOf(world.diplomacy.date));
      const exhausted = rel.aiMustAcceptPeace(months) && occupiedBy(world, whole ? ours : [a], whole ? theirs : [b]).length === 0;
      if (!(voices.obliged || exhausted)) {
        // An obliged ruler who refuses pays for it, the AI as the player (WAR-221).
        if (voices.obliged) refusedPeace(world, b, war, news);
        news.push({ kind: "refused", text: `${name(world, b)} refuses a white peace.`, nations: [a, b] });
        return null;
      }
    }
    makePeace(world, war, whole, a, b, [], news);
    if (terms === "dissolve") dissolveEmpire(world, "peace_term", news);
    return null;
  }
  // The side that takes asks; the other gives (and pays any gold).
  const taker = terms === "take" ? a : b;
  const giver = terms === "take" ? b : a;
  const table = settlementTable(world, taker, giver)!;
  const asked = demand ?? (terms === "give" ? wf.bestDemand(table.candidates, Infinity, { ...table.limits, maxGold: 0 }) : bestTerms(table));
  const why = wf.whyNotTerms(asked, table.candidates, table.limits);
  if (why) return why;
  if (terms === "take" && !aiAsks && b !== world.player) {
    const reply = wf.answerDemand(asked, table.candidates, table.capacity, table.limits);
    const cost = wf.demandCost(asked, table.candidates);
    // An obliged ruler who will not sign the demand pays for it, the AI as the player (WAR-221).
    if (reply.answer !== "accept" && peaceVoices(world, b, war).obliged) refusedPeace(world, b, war, news);
    if (reply.answer === "reject") {
      news.push({ kind: "refused", text: `${name(world, b)} refuses peace: the war lets you ask ${table.capacity.capacity} and you asked ${cost}.`, nations: [a, b] });
      return null;
    }
    if (reply.answer === "counter") {
      if (a !== world.player) return settle(world, war, whole, b, a, reply.counter, news);
      world.peaceOffers.push({ id: world.turn * 100 + world.peaceOffers.length, from: b, terms: "give", ...reply.counter, counter: true });
      news.push({ kind: "peace", text: `${name(world, b)} will not give all you asked (${cost} of ${table.capacity.capacity}); it offers ${termsText(world, reply.counter)} instead.`, nations: [a, b] });
      return null;
    }
  }
  return settle(world, war, whole, giver, taker, asked, news);
}

/** "Leon and 40 gold", "100 gold". */
function termsText(world: World, d: wf.Demand): string {
  const parts = [...d.provinces.map((p) => provinceName(world, p)), ...(d.gold > 0 ? [`${d.gold} gold`] : [])];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "nothing");
}

/** The giver hands over the demanded provinces (held by the taker's side) and gold, and the peace is signed. */
function settle(world: World, war: dip.War, whole: boolean, giver: number, taker: number, d: wf.Demand, news: News[]): null {
  const gold = Math.min(d.gold, Math.max(0, world.nationTreasury[giver]!));
  world.nationTreasury[giver]! -= gold;
  world.nationTreasury[taker]! += gold;
  makePeace(world, war, whole, taker, giver, d.provinces, news, gold > 0 ? { from: giver, to: taker, amount: gold } : undefined);
  return null;
}

export function occupiedBy(world: World, owners: number[], occupiers: number[]): number[] {
  const o = new Set(owners);
  const by = new Set(occupiers);
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (o.has(world.provinceOwner[p]!) && by.has(world.provinceOccupier[p]!)) out.push(p);
  return out;
}

function makePeace(world: World, war: dip.War, whole: boolean, a: number, b: number, ceded: number[], news: News[], gold?: { from: number; to: number; amount: number }): void {
  const d = world.diplomacy;
  const truceMonths = dip.truceMonthsAfterPeace({ landOrSubject: ceded.length > 0, white: ceded.length === 0 });
  const involved = whole ? [...war.attackers, ...war.defenders].map((id) => world.nationIndex.get(id)!) : [a, b];
  notePeace(world, war, a, b, ceded);
  const attackers = new Set(war.attackers);
  // Realms that give up land lost the war in their lords' eyes.
  const cededFrom = new Set(ceded.map((p) => world.provinceOwner[p]!));
  for (const n of cededFrom) lordsLoseWar(world, n, news);
  for (const p of ceded) {
    world.provinceOwner[p] = world.provinceOccupier[p]!;
    world.provinceLord[p] = -1;
    provinceTaken(world, p, news);
  }
  // Every other occupation between the realms making peace ends.
  const set = new Set(involved);
  for (let p = 0; p < world.provinceCount; p++) {
    if (set.has(world.provinceOwner[p]!) && set.has(world.provinceOccupier[p]!)) world.provinceOccupier[p] = -1;
    if (world.provinceOccupier[p] === world.provinceOwner[p]) world.provinceOccupier[p] = -1;
    const st = world.sieges.get(p);
    if (st && set.has(st.by) && set.has(world.provinceOwner[p]!)) world.sieges.delete(p);
  }
  if (whole) {
    dip.endWar(d, war, { truceMonths });
    // An independence war's peace decides whether the subject stays free (SUBJ-078, SUBJ-079).
    independencePeace(world, war, cededFrom, news);
  }
  else {
    rel.makePeace(d.graph, world.nationIds[a]!, world.nationIds[b]!, { truceMonths });
    // The one who is not a war leader leaves the war.
    const leaving = [world.nationIds[a]!, world.nationIds[b]!].filter((id) => id !== war.declarer && id !== war.target);
    for (const id of leaving) {
      const gw = war as GameWar;
      if (gw.refused) gw.refused = gw.refused.filter((x) => x !== id);
      for (const enemy of [...war.attackers, ...war.defenders]) if (enemy !== id && rel.has(d.graph, "at_war", id, enemy)) rel.makePeace(d.graph, id, enemy, { truceMonths });
      war.attackers = war.attackers.filter((x) => x !== id);
      war.defenders = war.defenders.filter((x) => x !== id);
    }
  }
  const paid = gold ? `, and ${name(world, gold.from)} pays ${Math.round(gold.amount)} gold` : "";
  if (ceded.length) {
    const gained = new Map<number, string[]>();
    for (const p of ceded) gained.set(world.provinceOwner[p]!, [...(gained.get(world.provinceOwner[p]!) ?? []), provinceName(world, p)]);
    dip.provincesTaken(d, world.nationIds[[...gained.keys()][0]!]!, world.nationIds[a === [...gained.keys()][0] ? b : a]!, ceded.map((p) => world.provinceIds[p]!));
    for (const [n, list] of gained) {
      addBorders(world, n);
      // Land taken in a war with no fitting aim: the taker's lords who aren't Warlike waver (WAR-178, WAR-222).
      if (!fittingAim(war) && attackers.has(world.nationIds[n]!)) landTakenWithoutAim(world, n, list.length, news);
    }
    // Neighbours remember land grabbed near them (DIPL-222).
    grabbedLand(world, ceded, cededFrom, true);
    news.push({ kind: "peace", text: `Peace between ${name(world, a)} and ${name(world, b)}: ${[...gained].map(([n, list]) => `${name(world, n)} takes ${list.join(", ")}`).join("; ")}${paid}. Truce for ${truceMonths / 12} years.`, nations: involved, province: ceded[0]! });
  } else if (gold) {
    news.push({ kind: "peace", text: `Peace between ${name(world, a)} and ${name(world, b)}: ${name(world, gold.from)} pays ${name(world, gold.to)} ${Math.round(gold.amount)} gold. Truce for ${truceMonths / 12} years.`, nations: involved });
  } else {
    news.push({ kind: "peace", text: `White peace between ${name(world, a)} and ${name(world, b)}. Truce for ${truceMonths / 12} years.`, nations: involved });
  }
  checkDestroyed(world, news);
}

/** A province handed over without a war (a demand given in, DIPL-113): the new owner holds it, its lord and any siege are gone. */
export function cedeProvince(world: World, p: number, to: number, news: News[]): void {
  const from = world.provinceOwner[p]!;
  if (from < 0 || from === to) return;
  world.provinceOwner[p] = to;
  world.provinceLord[p] = -1;
  provinceTaken(world, p, news);
  world.provinceOccupier[p] = -1;
  world.provinceHold[p] = 0;
  world.sieges.delete(p);
  dip.provincesTaken(world.diplomacy, world.nationIds[to]!, world.nationIds[from]!, [world.provinceIds[p]!]);
  addBorders(world, to);
  news.push({ kind: "envoy", text: `${name(world, from)} hands ${provinceName(world, p)} to ${name(world, to)}.`, nations: [from, to], province: p });
  checkDestroyed(world, news);
}

export function addBorders(world: World, n: number): void {
  const d = world.diplomacy;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const b = world.provinceOwner[world.adjList[k]!]!;
      if (b >= 0 && b !== n && !dip.borders(d, world.nationIds[n]!, world.nationIds[b]!)) dip.setBorder(d, world.nationIds[n]!, world.nationIds[b]!);
    }
  }
}

/** A realm left with no land is gone: its armies disband and its wars end (DIPL country destroyed). */
export function checkDestroyed(world: World, news: News[]): void {
  const holds = new Uint8Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0) holds[world.provinceOwner[p]!] = 1;
  for (let n = 0; n < world.nationCount; n++) {
    if (holds[n] || world.nationGone[n]) continue;
    world.nationGone[n] = 1;
    const id = world.nationIds[n]!;
    const a = world.armies;
    for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n) a.alive[i] = 0;
    rel.countryDestroyed(world.diplomacy.graph, id);
    for (const w of [...world.diplomacy.wars]) {
      w.attackers = w.attackers.filter((x) => x !== id);
      w.defenders = w.defenders.filter((x) => x !== id);
      // A war it led has no one left to make the peace: it ends.
      if (w.declarer === id || w.target === id) dip.endWar(world.diplomacy, w);
    }
    world.diplomacy.wars = world.diplomacy.wars.filter((w) => w.attackers.length && w.defenders.length);
    for (let p = 0; p < world.provinceCount; p++) if (world.provinceOccupier[p] === n) world.provinceOccupier[p] = -1;
    news.push({ kind: "destroyed", text: `${name(world, n)} is no more.`, nations: [n] });
  }
}

/** Peace an AI war leader offers the player: `terms` as the AI would send them (offerPeace's a = from), with the land and gold named. */
export interface PeaceOffer {
  id: number;
  from: number;
  terms: PeaceTerms;
  provinces?: number[];
  gold?: number;
  /** What the AI will give instead of a demand that asked too much (WAR-243). */
  counter?: boolean;
  /** The AI has surrendered: the player may ask anything the rules allow (WAR-246). */
  surrender?: boolean;
}

/**
 * Once a month the AI leader of a war against the player may offer peace
 * (feedback 10), by the counts it uses between AI realms: when it is beaten it
 * surrenders (WAR-245); when it is losing, it offers what the war lets the
 * player ask; when the player's people want peace and it holds the player's
 * land, it asks what the war lets it ask; after a long war, or when its own
 * people want peace, a white peace. An offer waits until the
 * player answers it or the war ends (SHELL-141): a later month may change
 * its terms, never add a second offer from the same realm.
 */
function aiOffersPeace(world: World, war: dip.War, ai: number, news: News[]): void {
  const player = world.player;
  // One offer a realm: a later month brings its terms up to date (SHELL-141).
  const add = (o: Omit<PeaceOffer, "id" | "from">, text: string) => {
    const waiting = world.peaceOffers.find((x) => x.from === ai);
    if (waiting && waiting.terms === o.terms && (waiting.gold ?? 0) === (o.gold ?? 0) && String(waiting.provinces ?? []) === String(o.provinces ?? [])) return;
    if (waiting) {
      delete waiting.provinces;
      delete waiting.gold;
      delete waiting.counter;
      delete waiting.surrender;
      Object.assign(waiting, o);
    } else world.peaceOffers.push({ id: world.turn * 100 + world.peaceOffers.length, from: ai, ...o });
    news.push({ kind: "peace", text, nations: [ai, player] });
  };
  const theirs = settlementTable(world, player, ai)!;
  if (!(war.surrendered ?? []).includes(world.nationIds[ai]!) && theirs.beaten) {
    markSurrender(world, ai, player);
    news.push({ kind: "peace", text: `${name(world, ai)} can fight no more and surrenders unconditionally: you may ask anything the peace table allows.`, nations: [ai, player] });
  }
  if ((war.surrendered ?? []).includes(world.nationIds[ai]!)) {
    const best = bestTerms(settlementTable(world, player, ai)!);
    add({ terms: "give", ...best, surrender: true }, `${name(world, ai)} has surrendered and will sign your terms: ${termsText(world, best)}, or whatever else the peace table allows.`);
    return;
  }
  const sa = sidesOf(world, war, ai);
  const aiObliged = peaceVoices(world, ai, war).obliged;
  const playerObliged = peaceVoices(world, world.player, war).obliged;
  const months = dip.monthsBetween(war.start, dip.monthOf(world.diplomacy.date));
  const lost = occupiedBy(world, sa.ours, sa.theirs).length;
  const won = occupiedBy(world, sa.theirs, sa.ours).length;
  if (aiObliged && lost) {
    const give = bestTerms(theirs);
    if (give.provinces.length || give.gold > 0) return add({ terms: "give", ...give }, `${name(world, ai)} offers peace and gives you ${termsText(world, give)}.`);
  }
  if (playerObliged && won) {
    const take = bestTerms(settlementTable(world, ai, player)!);
    if (take.provinces.length || take.gold > 0) return add({ terms: "take", ...take }, `${name(world, ai)} offers peace if you give it ${termsText(world, take)}.`);
  }
  if (aiObliged || rel.aiMustAcceptPeace(months)) add({ terms: "white" }, `${name(world, ai)} offers peace with no land changing hands.`);
}

/** The player takes or turns down a peace offer. */
export function answerPeace(world: World, id: number, yes: boolean, news: News[]): string | null {
  const offer = world.peaceOffers.find((o) => o.id === id);
  if (!offer) return "that offer has lapsed";
  world.peaceOffers = world.peaceOffers.filter((o) => o !== offer);
  if (!warBetween(world, offer.from, world.player)) return "you are no longer at war with them";
  if (yes) return offerPeace(world, offer.from, world.player, offer.terms, news, true, offer.provinces ?? [], offer.gold ?? 0);
  // Turning down a peace the realm's voices oblige it to take costs lords and levies each season (WAR-181).
  refusedPeace(world, world.player, warBetween(world, offer.from, world.player)!, news);
  news.push({ kind: "refused", text: `You turn down ${name(world, offer.from)}'s offer of peace.`, nations: [offer.from, world.player] });
  return null;
}

/**
 * AI wars end by the same counts (WAR-183, WAR-243 … WAR-245): a beaten leader
 * surrenders and signs the victor's fullest terms; a leader whose people want
 * peace signs what the war lets the other ask; long wars end white. Truces run
 * out (DIPL-031).
 */
export function monthlyDiplomacy(world: World, news: News[]): void {
  const d = world.diplomacy;
  rel.expireTruces(d.graph);
  d.calls = d.calls.filter((c) => d.wars.some((w) => w.id === c.war));
  // An offer waits for the player's answer while its war lasts (playtest feedback).
  world.peaceOffers = world.peaceOffers.filter((o) => warBetween(world, o.from, world.player));
  monthlyRefusals(world, news);
  // AI wars end by the same counts: the losing leader gives up what it has lost, or both tire of it.
  for (const war of [...d.wars]) {
    const att = world.nationIndex.get(war.declarer)!;
    const def = world.nationIndex.get(war.target)!;
    if (!d.wars.includes(war)) continue;
    if (att === world.player || def === world.player) {
      aiOffersPeace(world, war, att === world.player ? def : att, news);
      continue;
    }
    for (const loser of [def, att]) {
      const victor = loser === def ? att : def;
      const gaveUp = (war.surrendered ?? []).includes(world.nationIds[loser]!);
      if (!gaveUp && !settlementTable(world, victor, loser)!.beaten) continue;
      if (!gaveUp) {
        markSurrender(world, loser, victor);
        news.push({ kind: "peace", text: `${name(world, loser)} can fight no more and surrenders unconditionally to ${name(world, victor)}.`, nations: [loser, victor] });
      }
      offerPeace(world, victor, loser, "take", news, true);
      break;
    }
    if (!d.wars.includes(war)) continue;
    // Each leader by its own peace voices (WAR-183, WAR-221): an obliged leader gives up what the enemy occupies.
    const sa = sidesOf(world, war, att);
    const defObliged = peaceVoices(world, def, war).obliged;
    const attObliged = peaceVoices(world, att, war).obliged;
    const months = dip.monthsBetween(war.start, dip.monthOf(d.date));
    if (defObliged && occupiedBy(world, sa.theirs, sa.ours).length && !offerPeace(world, att, def, "take", news, true)) continue;
    if (attObliged && occupiedBy(world, sa.ours, sa.theirs).length && !offerPeace(world, def, att, "take", news, true)) continue;
    if (rel.aiMustAcceptPeace(months) || (attObliged && defObliged)) offerPeace(world, att, def, "white", news, true);
  }
}

// ---------------------------------------------------------------- AI

/**
 * Once a month a realm at peace may start a war on a neighbour it has no
 * truce, alliance or subject tie with (rare, set in defines), only when it has
 * counted the price (WAR-228): its side beats the target's with everyone
 * called against it, it holds a war chest, its people don't want peace and it
 * isn't too notorious.
 */
export function aiDeclarations(world: World, news: News[]): void {
  const d = world.diplomacy;
  const chance = world.rules.defines.war.aiDeclareChancePerMonth;
  const G = goalsConfig.goals;
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || world.nationGone[n] || dip.warOf(d, world.nationIds[n]!)) continue;
    // A realm's goals make it look for a war more often (EVT-105).
    const pulls = goalPulls(world, n);
    const neighbours = () => dip.neighbours(d, world.nationIds[n]!).map((id) => world.nationIndex.get(id)!);
    let near = pulls?.size ? neighbours() : null;
    const most = near ? Math.max(0, ...near.map((t) => pulls!.get(t) ?? 0)) : 0;
    if (world.rng.next() >= chance * (1 + G.war_chance_per_pull * most)) continue;
    near ??= neighbours();
    const ctx = priceContext(world, n);
    const targets = near.filter((t) => t !== undefined && !world.nationGone[t] && relationState(world, n, t).state === null && !whyAiWontDeclare(world, n, t, priceOfWar(world, n, t, ctx)));
    if (!targets.length) continue;
    const t = most > 0 ? weightedPick(world, targets, (x) => 1 + G.target_weight_per_pull * (pulls!.get(x) ?? 0)) : targets[world.rng.int(targets.length)]!;
    if (demandFirst(world, n, t)) continue;
    // A Take land aim on a place one of its goals names is the war's aim (EVT-105).
    const place = goalPlacesHeldBy(world, n, t).map((p) => world.provinceIds[p]!).find((p) => dip.warAimsOf(d, world.nationIds[n]!, world.nationIds[t]!).some((h) => h.aim === "take_land" && h.province === p));
    declareWar(world, n, t, news, place ? { aim: "take_land", province: place } : {});
  }
}

/** One of the items, each as likely as its weight. */
function weightedPick(world: World, items: number[], weight: (x: number) => number): number {
  const total = items.reduce((s, x) => s + weight(x), 0);
  let r = world.rng.next() * total;
  for (const x of items) if ((r -= weight(x)) < 0) return x;
  return items.at(-1)!;
}

/**
 * Before an AI declares war it tries a fitting demand first (DIPL-180): tribute, else a border
 * province that is not their capital. It goes to war only once a demand was refused, and waits
 * while one is on its way. The player answers theirs on an answer card (DIPL-213).
 */
function demandFirst(world: World, n: number, t: number): boolean {
  const d = world.diplomacy;
  const a = world.nationIds[n]!;
  const b = world.nationIds[t]!;
  if (d.envoys.some((e) => e.country === a && e.target === b && e.action === "demand" && (e.status === "road" || e.status === "court"))) return true;
  if (d.refusedDemands.some((x) => x.asker === a && x.asked === b)) return false;
  if (!whyNotDemand(world, n, t, "pay_tribute")) return !makeDemand(world, n, t, "pay_tribute");
  const capital = world.provinceIndex.get(world.rules.nations[t]!.capital);
  // A place one of its goals names is asked for first (EVT-105).
  const can = demandableProvinces(world, n, t).filter((x) => x !== capital);
  const p = goalPlacesHeldBy(world, n, t).find((x) => can.includes(x)) ?? can[0];
  if (p !== undefined && !whyNotDemand(world, n, t, "hand_over_province", p)) return !makeDemand(world, n, t, "hand_over_province", p);
  return false;
}

/** AI realms at war raise levies they can pay for; at peace they send levies home before their pay begins. */
export function aiRaise(world: World, news: News[]): void {
  aiRecruits(world, news, (n) => !!dip.warOf(world.diplomacy, world.nationIds[n]!));
}

/**
 * AI armies at war, each week: retake their own occupied land, attack an enemy
 * army they outnumber, besiege the nearest enemy province, or fall back home
 * when a much stronger army is near.
 */
export function aiMarches(world: World): void {
  const a = world.armies;
  const enemies = enemyTable(world);
  const armiesAt = new Map<number, number[]>();
  for (let i = 0; i < a.count; i++) if (a.alive[i]) armiesAt.set(a.location[i]!, [...(armiesAt.get(a.location[i]!) ?? []), i]);
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const n = a.owner[i]!;
    if (n === world.player || !enemies[n]!.size || a.commander[i]! < 0 || a.battle[i]! >= 0 || a.retreating[i]) continue;
    if (a.route[i]!.length && world.rng.int(4) !== 0) continue;
    const here = a.location[i]!;
    const foes = enemies[n]!;
    const men = a.men[i]!;
    // Men of realms at war with n, standing in a province.
    const threat = (p: number) => {
      let t = 0;
      for (const j of armiesAt.get(p) ?? []) if (foes.has(a.owner[j]!)) t += a.men[j]!;
      return t;
    };
    const danger = nearest(world, here, (p) => threat(p) > men * 1.5, 2);
    let target: number;
    if (danger >= 0) target = nearest(world, here, (p) => p !== here && controller(world, p) === n && threat(p) === 0 && nearest(world, p, (q) => threat(q) > men * 1.5, 1) < 0, 10);
    else
      target = nearest(
        world,
        here,
        (p) => (world.provinceOwner[p] === n && world.provinceOccupier[p]! >= 0) || (threat(p) > 0 && threat(p) < men * 0.9) || (foes.has(controller(world, p)) && threat(p) === 0),
        30,
      );
    if (target < 0 || target === here) {
      halt(world, i);
      continue;
    }
    // Already on its way there: the route it walks stands (planning one is most of this step's cost).
    const walking = a.route[i]!;
    if (walking.length && walking[walking.length - 1] === target) continue;
    const route = planRoute(world.rules.defines.march, marchMap(world), here, target, { men, horse: a.horse[i]!, logistics: 0 }, routeBars(world, i));
    if (route) {
      // Walked a province at a time: each stretch is planned over the tiles as the army gets there.
      a.route[i] = route.path;
      a.path[i] = NO_PATH;
      a.pathAt[i] = 0;
    }
  }
}
