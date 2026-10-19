import type { World } from "./world.ts";
import { addBorders, cedeProvince, type News } from "./war.ts";
import { setPlayer } from "./campaignEnd.ts";
import { formOf, setForm } from "./government.ts";
import { wakeRuler } from "./rulers.ts";
import { wakePeoples } from "./peoples.ts";
import { wakeResearch } from "./research.ts";
import { recount } from "./recruit.ts";
import { syncCountries } from "./statecraft.ts";
import { makeSubject } from "./subjects.ts";
import { ownCopy } from "./rulesCopy.ts";
import * as dip from "./domain/diplomacy/index.ts";
import type * as subj from "./domain/subjects/index.ts";

/**
 * Sleeping realms (SETUP-080 to SETUP-091, X-24): realms history founds after
 * 1444 are in the nation list from the start, gone and asleep, so every array
 * and every client already has a place for them. Waking one gives it land, a
 * ruler, a government, peoples, learning, gold and levies, and from then on it
 * is an ordinary realm.
 */

const rel = dip.relations;

/** How a realm wakes: on named land, formed from realms (a union), broken away from one, or as a subject. */
export interface Waking {
  /** The provinces it wakes on (SETUP-084); else its home land. */
  provinces?: number[];
  /** Realms it is formed from (a union, SETUP-085): their land, subjects and allies become its own and they are gone. */
  from?: number[];
  /** The realm it breaks away from (SETUP-086): the two hold a truce, and only that realm's land is taken. */
  breakFrom?: number;
  /** Its overlord (SETUP-087), with the kind of tie (a vassal unless named). */
  subjectOf?: number;
  kind?: subj.Kind;
  /** A spare's name and colour (SETUP-088); a listed sleeper keeps its own. */
  name?: string;
  color?: string;
  /** The event tree's id for a spare, so the events know it once it wakes (SETUP-088). */
  tree?: string;
}

/** What a woken realm is called, coloured and ruled from, where it differs from the data: saves keep it (SETUP-091). */
export interface WokenRealm {
  id: string;
  name: string;
  color: string;
  capital: string;
  /** The event tree's id for a woken spare. */
  tree?: string;
}

/** Colours a spare takes when it wakes, the first none of its neighbours has (SETUP-088). */
const SPARE_COLOURS = ["#a35d8f", "#4f8f8a", "#c27c3a", "#6b7fc4", "#8fae4a", "#b8574f", "#5b9bd5", "#d1a54b", "#7d5ba6", "#4b9e6b", "#c46a8a", "#8a7350"];

const asleep = (world: World, n: number) => world.nationAsleep[n] === 1;

/** The spare sleepers still asleep, first first (SETUP-081). */
export function spareSleepers(world: World): number[] {
  const out: number[] = [];
  for (let n = 0; n < world.nationCount; n++) if (world.rules.nations[n]!.spare && asleep(world, n)) out.push(n);
  return out;
}

/** Records a woken realm's name, colour and capital, for saves and the client (SETUP-091). */
function noteWoken(world: World, n: number): void {
  const d = world.rules.nations[n]!;
  world.woken = [...world.woken.filter((w) => w.id !== d.id), { id: d.id, name: d.name, color: d.color, capital: d.capital, ...(d.spare && d.tree?.length ? { tree: d.tree[0]! } : {}) }];
}

/** Puts back saved names, colours and capitals and who still sleeps (SETUP-091). */
export function restoreSleeping(world: World, saved: { asleep: string[]; woken: WokenRealm[] } | undefined): void {
  if (!saved) return;
  const sleeping = new Set(saved.asleep);
  for (let n = 0; n < world.nationCount; n++) {
    if (!world.rules.nations[n]!.asleep) continue;
    world.nationAsleep[n] = sleeping.has(world.nationIds[n]!) ? 1 : 0;
  }
  if (!saved.woken.length) return;
  world.rules = ownCopy(world.rules);
  for (const w of saved.woken) {
    const n = world.nationIndex.get(w.id);
    if (n === undefined) continue;
    Object.assign(world.rules.nations[n]!, { name: w.name, color: w.color, capital: w.capital, ...(w.tree ? { tree: [w.tree] } : {}) });
  }
  world.woken = saved.woken.filter((w) => world.nationIndex.has(w.id));
}

/** Who sleeps and what woke, as a save keeps it (SETUP-091). */
export function saveSleeping(world: World): { asleep: string[]; woken: WokenRealm[] } {
  const asleepIds: string[] = [];
  for (let n = 0; n < world.nationCount; n++) if (asleep(world, n)) asleepIds.push(world.nationIds[n]!);
  return { asleep: asleepIds, woken: world.woken };
}

/** The land a waking gives (SETUP-084): the from-realms' land, else the named provinces, else the home land; never the overlord's. */
function landOf(world: World, n: number, w: Waking): number[] {
  const out: number[] = [];
  if (w.from?.length) {
    const from = new Set(w.from);
    for (let p = 0; p < world.provinceCount; p++) if (!world.provinceWater[p] && from.has(world.provinceOwner[p]!)) out.push(p);
    return out;
  }
  const named = w.provinces ?? homeOf(world, n);
  for (const p of named) {
    if (p < 0 || world.provinceWater[p]) continue;
    const o = world.provinceOwner[p]!;
    if (o === n || (w.subjectOf !== undefined && o === w.subjectOf)) continue;
    if (w.breakFrom !== undefined && o !== w.breakFrom) continue;
    out.push(p);
  }
  return out;
}

/** A realm's home land: the data's for a sleeper, the 1444 land for a map realm founded anew (SETUP-084, SETUP-089). */
function homeOf(world: World, n: number): number[] {
  const d = world.rules.nations[n]!;
  if (d.home) return d.home.map((id) => world.provinceIndex.get(id) ?? -1);
  const out: number[] = [];
  world.rules.provinces.forEach((p, k) => p.owner === d.id && out.push(k));
  return out;
}

/** The realm a woken realm takes after (its government, ruler's line and learning): the one it takes most land from. */
function donorOf(world: World, land: number[]): number {
  const count = new Map<number, number>();
  for (const p of land) {
    const o = world.provinceOwner[p]!;
    if (o >= 0) count.set(o, (count.get(o) ?? 0) + 1);
  }
  let best = -1;
  for (const [o, c] of count) if (best < 0 || c > count.get(best)! || (c === count.get(best)! && o < best)) best = o;
  return best;
}

/** A spare's colour: the first of the spare colours none of its land's neighbours has (SETUP-088). */
function spareColour(world: World, land: number[]): string {
  const near = new Set<string>();
  for (const p of land) {
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const o = world.provinceOwner[world.adjList[k]!]!;
      if (o >= 0) near.add(world.rules.nations[o]!.color.toLowerCase());
    }
  }
  return SPARE_COLOURS.find((c) => !near.has(c)) ?? SPARE_COLOURS[0]!;
}

/** A union's realms end in the formed one: their subjects, allies and wars become its own (SETUP-085). */
function foldIn(world: World, n: number, from: number[]): void {
  const id = world.nationIds[n]!;
  const ids = new Set(from.map((f) => world.nationIds[f]!));
  const g = world.diplomacy.graph;
  const kept: typeof g.relations = [];
  const seen = new Set<string>();
  for (const r of g.relations) {
    const source = ids.has(r.source) ? id : r.source;
    const target = ids.has(r.target) ? id : r.target;
    // Ties between the realms of the union end with them.
    if (source === target) continue;
    const key = `${r.type}|${source}|${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(source === r.source && target === r.target ? r : { ...r, source, target });
    const bond = r.bond as { subject: string; overlord: string } | undefined;
    if (bond && (ids.has(bond.subject) || ids.has(bond.overlord))) kept[kept.length - 1]!.bond = { ...bond, subject: source, overlord: target };
  }
  g.relations = kept;
  for (const w of world.diplomacy.wars) {
    const swap = (side: string[]) => [...new Set(side.map((x) => (ids.has(x) ? id : x)))];
    w.attackers = swap(w.attackers);
    w.defenders = swap(w.defenders);
    if (ids.has(w.declarer)) w.declarer = id;
    if (ids.has(w.target)) w.target = id;
  }
  world.diplomacy.wars = world.diplomacy.wars.filter((w) => !w.attackers.some((x) => w.defenders.includes(x)));
  // Their armies, commanders, lords and gold serve the formed realm.
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && from.includes(a.owner[i]!)) a.owner[i] = n;
  for (let c = 0; c < world.commanderOwner.length; c++) if (from.includes(world.commanderOwner[c]!)) world.commanderOwner[c] = n;
  for (const l of world.lords) if (from.includes(l.nation)) l.nation = n;
  for (const f of from) {
    world.nationTreasury[n] = world.nationTreasury[n]! + world.nationTreasury[f]!;
    world.nationTreasury[f] = 0;
  }
}

/**
 * Wakes a sleeping realm, or a gone map realm founded anew (SETUP-083 to
 * SETUP-090). Returns false and changes nothing when there is no land to give.
 */
export function wakeRealm(world: World, n: number, w: Waking, news: News[]): boolean {
  if (!world.nationGone[n] && !asleep(world, n)) return false;
  const land = landOf(world, n, w);
  if (!land.length) return false;
  world.rules = ownCopy(world.rules);
  const def = world.rules.nations[n]!;
  const from = w.from?.length ? w.from : [];
  const donor = from.length ? [...from].sort((x, y) => land.filter((p) => world.provinceOwner[p] === y).length - land.filter((p) => world.provinceOwner[p] === x).length || x - y)[0]! : donorOf(world, land);
  const playerFolds = world.player >= 0 && from.includes(world.player);
  if (def.spare) {
    if (w.name) def.name = w.name;
    else def.name = world.rules.provinces[land[0]!]!.name;
    def.color = w.color ?? spareColour(world, land);
    if (w.tree) def.tree = [w.tree];
  }
  // Its capital: the data's when it holds it, else the largest from-realm's, else its first province (SETUP-083).
  const landSet = new Set(land);
  const own = world.provinceIndex.get(def.capital);
  const donorCapital = donor >= 0 ? world.provinceIndex.get(world.rules.nations[donor]!.capital) : undefined;
  def.capital = world.provinceIds[own !== undefined && landSet.has(own) ? own : donorCapital !== undefined && landSet.has(donorCapital) ? donorCapital : land[0]!]!;

  world.nationAsleep[n] = 0;
  world.nationGone[n] = 0;
  const quiet: News[] = [];
  if (from.length) {
    foldIn(world, n, from);
    // A union keeps its lords, sieges and armies where they stand: only the owner changes.
    for (const p of land) world.provinceOwner[p] = n;
    addBorders(world, n);
    for (const f of from) {
      world.nationGone[f] = 1;
      rel.countryDestroyed(world.diplomacy.graph, world.nationIds[f]!);
    }
  } else {
    // Land handed over without a war (DIPL-113), without a dispatch for each province.
    for (const p of land) cedeProvince(world, p, n, quiet);
    if (w.breakFrom !== undefined && !world.nationGone[w.breakFrom]) rel.newRecord(world.diplomacy.graph, "truce", world.nationIds[n]!, world.nationIds[w.breakFrom]!, "mutual", { expires_on: dip.addMonths(dip.monthOf(world.diplomacy.graph.date), dip.truceMonthsAfterPeace({ landOrSubject: true })) });
    world.nationTreasury[n] = world.rules.defines.economy.startingTreasury;
  }
  // "X is no more" for a realm emptied by a breakaway is news the player hears (the realm took no turn of its own).
  for (const x of quiet) if (x.kind === "destroyed") news.push(x);

  // Government, ruler, peoples and learning after the realm it takes most land from (SETUP-083).
  setForm(world, n, donor >= 0 ? formOf(world, donor) : "chiefdom");
  world.nationCustomOfficials[n] = 0;
  world.nationCustomLords[n] = 0;
  if (from.length && donor >= 0) world.rulers[n] = { ...world.rulers[donor]! };
  else wakeRuler(world, n);
  wakePeoples(world, n, world.provinceIndex.get(def.capital)!, donor);
  wakeResearch(world, n, donor);
  if (w.subjectOf !== undefined && !world.nationGone[w.subjectOf]) makeSubject(world, n, w.subjectOf, w.kind ?? "vassal");
  recount(world);
  for (const p of land) world.provinceRecruits[p] = Math.min(world.provinceRecruits[p]!, world.provinceRecruitCeiling[p]!);
  syncCountries(world);
  noteWoken(world, n);

  if (playerFolds) {
    setPlayer(world, n);
    news.push({ kind: "founded", text: `Your realm is now ${def.name}.`, nations: [n], province: world.provinceIndex.get(def.capital)!, major: true });
  }
  const fromWords = from.length ? ` from ${listOf(from.map((f) => world.rules.nations[f]!.name))}` : w.breakFrom !== undefined ? `, breaking away from ${world.rules.nations[w.breakFrom]!.name}` : "";
  news.push({ kind: "founded", text: `${def.name} is founded${fromWords}.`, nations: [n, ...from, ...(w.breakFrom !== undefined ? [w.breakFrom] : [])], province: world.provinceIndex.get(def.capital)!, major: true });
  return true;
}

const listOf = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
