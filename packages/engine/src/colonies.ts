import { isHuman } from "./humans.ts";
import * as ex from "./domain/exploration/index.ts";
import * as nv from "./domain/naval/index.ts";
import { catalogueRecord, hasRecord } from "./domain/scenario-setup/catalogue.ts";
import type { World } from "./world.ts";
import { addBorders, type News } from "./war.ts";
import { formOf } from "./government.ts";
import { relationState } from "./war.ts";
import { mix, personName } from "./names.ts";
import { OFFICIALS } from "./officials.ts";
import { aiWaitsToFound, colonyStarts } from "./tribes.ts";
import { noteMoment } from "./achievements.ts";
import {
  chartAround,
  chartArmies,
  chartFleets,
  chartedBits,
  explorationUnlocked,
  isCharted,
  knownSet,
  whyNoExploration,
  type ColonialGovernor,
  type ColonyFounding,
} from "./exploration.ts";
import { allExplorers, buyShip, callable, dockRight, fleetById, isPort, mayEnterZone, muster, planVoyage, reachOf, resupply, setCourse, shipGold, whyNotShip, type NavyFleet } from "./navy.ts";

/**
 * Voyages into the fog, colonial governors and colonies being founded, as the
 * game plays them (domain/exploration/spec.md, first slice EXPL-069 …
 * EXPL-075), on the rules of the exploration library and the navy's fleets.
 */

const CFG = ex.explorationConfig;
const NC = nv.navalConfig;
const AI = CFG.game.ai;

export type ExploreOrder =
  /** Sail a fleet of exploration ships along a path of sea zones, into the parchment if wished (EXPL-017). */
  | { type: "explore"; do: "voyage"; fleet: number; path: number[]; carryOn?: boolean }
  /** Hire a colonial governor in the port the fleet lies in; he comes aboard at once (EXPL-025, EXPL-030). */
  | { type: "explore"; do: "hire"; fleet: number }
  /** Take aboard a governor waiting in the fleet's port (EXPL-030). */
  | { type: "explore"; do: "embark"; fleet: number; governor: number }
  /** Fill the exploration ships' holds with colony stores in port (EXPL-045). */
  | { type: "explore"; do: "load"; fleet: number }
  /** Put the holds' stores ashore in the colony beside the fleet (EXPL-046). */
  | { type: "explore"; do: "unload"; fleet: number }
  /** The governor aboard goes ashore and starts a colony (EXPL-037). */
  | { type: "explore"; do: "found"; fleet: number; province: number }
  /** Take the governor back aboard a ship beside the colony (EXPL-049). */
  | { type: "explore"; do: "abandon"; province: number }
  | { type: "explore"; do: "dismiss"; governor: number };

export function exploreOrder(world: World, o: ExploreOrder, n: number, news: News[]): string | null {
  switch (o.do) {
    case "voyage":
      return giveVoyage(world, n, o.fleet, o.path, !!o.carryOn);
    case "hire":
      return hireGovernor(world, n, o.fleet, news);
    case "embark":
      return embark(world, n, o.fleet, o.governor);
    case "load":
      return loadStores(world, n, o.fleet);
    case "unload":
      return unloadStores(world, n, o.fleet, news);
    case "found":
      return foundColony(world, n, o.fleet, o.province, news);
    case "abandon":
      return abandon(world, n, o.province, news);
    case "dismiss": {
      const e = world.explore;
      const g = e.governors.find((x) => x.id === o.governor && x.owner === n);
      if (!g) return "no such governor of yours";
      if (g.colony >= 0) return "he is ashore founding a colony: abandon it first";
      e.governors.splice(e.governors.indexOf(g), 1);
      return null;
    }
  }
}

const own = (world: World, n: number, id: number): NavyFleet | null => {
  const f = fleetById(world, id);
  return f && f.owner === n ? f : null;
};
const name = (world: World, p: number) => world.rules.provinces[p]!.name;
const neighbours = (world: World, p: number): number[] => Array.from(world.adjList.subarray(world.adjStart[p]!, world.adjStart[p + 1]!));
const besides = (world: World, a: number, b: number) => neighbours(world, a).includes(b);

// ---------------------------------------------------------------- voyages

/** Gives a voyage: a path of zones from the fleet's port, each next to the last (EXPL-017, EXPL-018, EXPL-066). */
export function giveVoyage(world: World, n: number, id: number, path: readonly number[], carryOn: boolean): string | null {
  const f = own(world, n, id);
  if (!f) return "no such fleet of yours";
  if (!allExplorers(f)) return "only a fleet of nothing but exploration ships may explore";
  if (world.provinceWater[f.at]) return "put into port first: a voyage leaves port with full supply";
  if (f.battle >= 0 || f.landing > 0) return "the fleet is busy";
  if (!path.length) return "draw a course first";
  const r = reachOf(world, f);
  let at = f.at;
  for (const q of path) {
    if (q < 0 || q >= world.provinceCount || !world.provinceWater[q] || !besides(world, at, q)) return "the course must run zone by zone over the sea";
    if (!mayEnterZone(world, r, q)) return `these ships can't sail into the ${name(world, q)} (open ocean needs the right research, and ice closes the north in winter)`;
    at = q;
  }
  if (f.ships.some((s) => s.crew < nv.shipRow(s.type).crew * NC.minCrewToSail)) return "a ship has less than a quarter of its crew";
  resupply(world, f);
  setCourse(f, path.slice());
  f.landAt = -1;
  f.fleeing = false;
  const e = world.explore;
  e.voyages = e.voyages.filter((v) => v.fleet !== id);
  e.voyages.push({ fleet: id, carryOn, turnedBack: false, charted: 0 });
  return null;
}

/** Zones a fleet must still enter to reach a port it may put into, over charted water (-1 = none in reach). */
function zonesToPort(world: World, f: NavyFleet, limit: number): number {
  const r = reachOf(world, f);
  const seen = new Map<number, number>([[f.at, 0]]);
  const queue = [f.at];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    const d = seen.get(p)!;
    for (const q of neighbours(world, p)) {
      if (!world.provinceWater[q]) {
        if (dockRight(world, f.owner, q)) return d;
        continue;
      }
      if (seen.has(q) || d >= limit || !isCharted(world, f.owner, q) || !mayEnterZone(world, r, q)) continue;
      seen.set(q, d + 1);
      queue.push(q);
    }
  }
  return -1;
}

/**
 * Each step after the fleets sail: a voyage set to *Turn back* turns for the
 * nearest port it may put into once its supply is just enough to get there
 * (EXPL-020); a voyage at its end is over, and the player hears what it found.
 */
export function stepVoyages(world: World, news: News[]): void {
  chartFleets(world);
  const e = world.explore;
  if (!e.voyages.length) return;
  e.voyages = e.voyages.filter((v) => {
    const f = fleetById(world, v.fleet);
    if (!f) return false;
    if (!f.route.length) {
      if (isHuman(world, f.owner)) {
        const where = world.provinceWater[f.at] ? `in the ${name(world, f.at)}` : `at ${name(world, f.at)}`;
        news.push({ kind: "voyage", text: `${v.turnedBack ? "Short of supply, your explorers came back" : "Your explorers' voyage ends"} ${where}: ${v.charted} new place${v.charted === 1 ? "" : "s"} charted.`, nations: [f.owner], province: f.at });
      }
      return false;
    }
    if (v.carryOn || v.turnedBack || !world.provinceWater[f.at] || f.progress > 0) return true;
    const left = Math.min(...f.ships.map((s) => s.supply));
    const home = zonesToPort(world, f, left + 1);
    if (home >= 0 && left <= home) {
      const plan = planVoyage(world, f, (p) => !world.provinceWater[p] && dockRight(world, f.owner, p) !== null);
      if (plan) {
        setCourse(f, plan.path);
        v.turnedBack = true;
      }
    }
    return true;
  });
}

// ---------------------------------------------------------------- colonial governors

/** Colonial governor slots, range and the unlock, from research and the government form (EXPL-026, EXPL-031). */
export function colonialOffice(world: World, n: number): { unlocked: boolean; slots: number; used: number; range: number } {
  const knows = knownSet(world, n);
  const used = world.explore.governors.reduce((t, g) => t + (g.owner === n ? 1 : 0), 0);
  return { unlocked: ex.hasColonialUnlock(knows), slots: ex.governorSlots(knows), used, range: ex.colonialRange(formOf(world, n), knows) };
}

function hireGovernor(world: World, n: number, id: number, news: News[]): string | null {
  const f = own(world, n, id);
  if (!f) return "no such fleet of yours";
  if (world.provinceWater[f.at] || world.provinceOwner[f.at] !== n || !isPort(world, f.at)) return "a colonial governor is hired in a port of yours";
  const o = colonialOffice(world, n);
  if (!o.unlocked) return "needs ocean navigation (or outrigger voyaging) to hire colonial governors";
  if (o.used >= o.slots) return `no free colonial governor slot (${o.used} of ${o.slots})`;
  if (world.explore.governors.some((g) => g.fleet === id)) return "a governor is already aboard";
  if (world.nationTreasury[n]! < CFG.governor_hire_gold) return "not enough gold";
  world.nationTreasury[n] = world.nationTreasury[n]! - CFG.governor_hire_gold;
  const e = world.explore;
  const g: ColonialGovernor = { id: ++e.seq, owner: n, name: personName(world.rules, n, mix(f.at, e.seq + 1), name(world, f.at)), age: CFG.governor_age_when_hired, port: -1, fleet: id, colony: -1, homeward: false };
  e.governors.push(g);
  if (isHuman(world, n)) news.push({ kind: "colony", text: `${g.name} takes the post of colonial governor and goes aboard at ${name(world, f.at)}.`, nations: [n], province: f.at });
  return null;
}

function embark(world: World, n: number, id: number, governor: number): string | null {
  const f = own(world, n, id);
  const g = world.explore.governors.find((x) => x.id === governor && x.owner === n);
  if (!f || !g) return "no such fleet or governor of yours";
  if (g.port < 0 || g.port !== f.at) return "he waits in another port";
  if (world.explore.governors.some((x) => x.fleet === id)) return "a governor is already aboard";
  g.port = -1;
  g.fleet = id;
  return null;
}

// ---------------------------------------------------------------- colony stores

/** Gold a ration of colony stores costs in a neutral port, at resupply's price (EXPL-045). */
const storesGold = (rations: number): number => (rations * NC.resupplyGoldPerZone * NC.game.wageScale) / NC.resupplyFoodPerZone;

/** What filling the holds would load and cost in the fleet's port: rations, and gold or the port's food. */
export function storesToLoad(world: World, f: NavyFleet): { rations: number; pays: "food" | "gold" | null; gold: number } {
  const rations = f.ships.reduce((t, s) => t + Math.max(0, (nv.shipRow(s.type).colonyStores ?? 0) - (s.stores ?? 0)), 0);
  const pays = world.provinceWater[f.at] ? null : dockRight(world, f.owner, f.at);
  return { rations, pays, gold: pays === "gold" ? Math.round(storesGold(rations) * 100) / 100 : 0 };
}

function loadStores(world: World, n: number, id: number): string | null {
  const f = own(world, n, id);
  if (!f) return "no such fleet of yours";
  const { rations, pays, gold } = storesToLoad(world, f);
  if (!pays) return world.provinceWater[f.at] ? "stores are loaded in port" : "this port won't sell to you";
  if (rations <= 0) return "the holds are full";
  if (pays === "food" && world.provinceStore[f.at]! * 1000 < rations) return "the port's store hasn't the food to spare";
  if (pays === "gold" && world.nationTreasury[n]! < gold) return "not enough gold";
  if (pays === "food") world.provinceStore[f.at] = world.provinceStore[f.at]! - rations / 1000;
  else world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  for (const s of f.ships) {
    const cap = nv.shipRow(s.type).colonyStores;
    if (cap !== undefined) s.stores = cap;
  }
  return null;
}

function unloadStores(world: World, n: number, id: number, news: News[]): string | null {
  const f = own(world, n, id);
  if (!f) return "no such fleet of yours";
  const c = world.explore.colonies.find((x) => x.owner === n && besides(world, f.at, x.province));
  if (!c || !world.provinceWater[f.at]) return "no colony of yours is being founded beside the fleet";
  const rations = f.ships.reduce((t, s) => t + (s.stores ?? 0), 0);
  if (!rations) return "the holds are empty";
  for (const s of f.ships) s.stores = 0;
  c.food += rations;
  if (isHuman(world, n)) news.push({ kind: "colony", text: `${rations} rations go ashore at ${name(world, c.province)}.`, nations: [n], province: c.province });
  return null;
}

// ---------------------------------------------------------------- founding

/** Water zones within the realm's colonial range: zones from its ports, its subjects' ports and its founded colonies (EXPL-032, EXPL-065). */
export function rangeZones(world: World, n: number, range: number): Int16Array {
  const P = world.provinceCount;
  const dist = new Int16Array(P).fill(-1);
  if (range <= 0 && range !== 0) return dist;
  const queue: number[] = [];
  for (let p = 0; p < P; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0 || world.provinceWater[p]) continue;
    const anchor = (o === n && (isPort(world, p) || world.explore.founded[p] === n)) || (o !== n && isPort(world, p) && relationState(world, n, o).state === "overlord");
    if (!anchor) continue;
    for (const q of neighbours(world, p)) if (world.provinceWater[q] && dist[q]! < 0) ((dist[q] = 0), queue.push(q));
  }
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    if (dist[p]! >= range) continue;
    for (const q of neighbours(world, p)) if (world.provinceWater[q] && dist[q]! < 0) ((dist[q] = dist[p]! + 1), queue.push(q));
  }
  return dist;
}

/** Why realm n may not found a colony in province p, or null (EXPL-034, EXPL-035). `zones` from rangeZones. */
export function whyNotColony(world: World, n: number, p: number, zones: Int16Array): string | null {
  if (world.provinceWater[p]) return "that is the sea";
  if (!isCharted(world, n, p)) return "you have not charted it";
  if (!world.rules.provinces[p]!.coastal) return "it has no coast";
  const o = world.provinceOwner[p]!;
  if (o >= 0) return `${world.rules.nations[o]!.name} holds it: only war or a treaty takes it`;
  const c = world.explore.colonies.find((x) => x.province === p);
  if (c) return c.owner === n ? "your colony is already being founded here" : `${world.rules.nations[c.owner]!.name} is already settling it`;
  if (!neighbours(world, p).some((q) => world.provinceWater[q] && zones[q]! >= 0)) return "beyond your colonial range";
  return null;
}

/** People live in the province or next to it, a coast across one sea zone counted (EXPL-038, EXPL-040). */
function peopleAround(world: World, p: number): boolean {
  if (world.provincePopulation[p]! > 0) return true;
  for (const q of neighbours(world, p)) {
    if (!world.provinceWater[q]) {
      if (world.provincePopulation[q]! > 0) return true;
    } else for (const r of neighbours(world, q)) if (r !== p && !world.provinceWater[r] && world.provincePopulation[r]! > 0) return true;
  }
  return false;
}

function foundColony(world: World, n: number, id: number, p: number, news: News[]): string | null {
  const f = own(world, n, id);
  if (!f) return "no such fleet of yours";
  if (p < 0 || p >= world.provinceCount) return "no such place";
  const g = world.explore.governors.find((x) => x.fleet === id);
  if (!g) return "no colonial governor aboard";
  if (!world.provinceWater[f.at] || !besides(world, f.at, p)) return "the fleet must lie in the sea beside that coast";
  const o = colonialOffice(world, n);
  const why = whyNotColony(world, n, p, rangeZones(world, n, o.range));
  if (why) return why;
  // On a tribe's hunting ground the locals are fiercer and the tribe angry; on land it gave up, Peaceful (TRIBE-021 to TRIBE-024).
  const { aggression, consent } = colonyStarts(world, n, p, ex.rollAggression(world.rng, peopleAround(world, p)), news);
  g.fleet = -1;
  g.colony = p;
  g.homeward = false;
  // A colony a viceroy's fleet founds starts ahead (NAVY-154).
  const ahead = f.admiral >= 0 ? (nv.postRow(f.post).colonyStart ?? 0) : 0;
  world.explore.colonies.push({ province: p, owner: n, governor: g.id, progress: CFG.progress_start + ahead, aggression, food: 0, lastChange: 0, ...(consent ? { consent } : {}) });
  if (isHuman(world, n)) news.push({ kind: "colony", text: `${g.name} goes ashore at ${name(world, p)} and starts a colony. The locals are ${aggression.toLowerCase()}.`, nations: [n], province: p });
  return null;
}

function abandon(world: World, n: number, p: number, news: News[]): string | null {
  const e = world.explore;
  const c = e.colonies.find((x) => x.province === p && x.owner === n);
  if (!c) return "no colony of yours is being founded there";
  const ship = world.navy.fleets.find((f) => f.owner === n && world.provinceWater[f.at] && besides(world, f.at, p) && !e.governors.some((g) => g.fleet === f.id));
  if (!ship) return "a ship of yours must lie in the sea beside it to take the governor off";
  const g = e.governors.find((x) => x.id === c.governor)!;
  g.colony = -1;
  g.fleet = ship.id;
  g.homeward = true;
  e.colonies.splice(e.colonies.indexOf(c), 1);
  if (isHuman(world, n)) news.push({ kind: "colony", text: `${g.name} gives up the colony at ${name(world, p)} and comes back aboard. The food ashore is lost.`, nations: [n], province: p });
  return null;
}

/** Progress 100: the province becomes the founder's, the governor its official, the food its store (EXPL-047, EXPL-050, EXPL-075). */
function founded(world: World, c: ColonyFounding, news: News[]): void {
  const e = world.explore;
  const p = c.province;
  const n = c.owner;
  const gi = e.governors.findIndex((g) => g.id === c.governor);
  const g = gi >= 0 ? e.governors.splice(gi, 1)[0]! : null;
  world.provinceOwner[p] = n;
  world.provinceLord[p] = -1;
  world.provinceOccupier[p] = -1;
  world.provinceHold[p] = 0;
  world.provinceStore[p] = world.provinceStore[p]! + c.food / 1000;
  world.provinceOfficial[p] = OFFICIALS.indexOf("Warden");
  world.provinceOfficialSeed[p] = p;
  world.provinceOfficialSince[p] = world.day;
  world.provinceOfficialFrom[p] = -1;
  world.provinceOfficialAge[p] = 0;
  e.founded[p] = n;
  chartAround(world, n, p);
  addBorders(world, n);
  // Treaty on the Shore: founded with the consent of the local people (ACH colony_by_treaty).
  noteMoment(world, n, "colony_founded", { founded_with_consent_of_local_people: !!c.consent }, p);
  news.push({ kind: "colony", text: `The colony at ${name(world, p)} is founded: it is ${world.rules.nations[n]!.name}'s now${g ? `, and ${g.name} hands it to its first warden` : ""}.`, nations: [n], province: p });
}

/** Progress 0, its governor dead or the land taken: the colony is lost and its governor dies (EXPL-048, EXPL-059, EXPL-060). */
function lost(world: World, c: ColonyFounding, why: string, news: News[]): void {
  const e = world.explore;
  e.governors = e.governors.filter((g) => g.id !== c.governor);
  if (isHuman(world, c.owner)) news.push({ kind: "colony", text: `The colony at ${name(world, c.province)} is lost: ${why}.`, nations: [c.owner], province: c.province });
}

// ---------------------------------------------------------------- each day and month

/** Each day: armies chart around them; governors whose ship is gone wait in its port or died with it; a governor home again frees his slot. */
export function dailyExploration(world: World): void {
  chartArmies(world);
  const e = world.explore;
  if (!e.governors.length) return;
  e.governors = e.governors.filter((g) => {
    if (g.fleet < 0) return true;
    const f = fleetById(world, g.fleet);
    if (!f) {
      // The fleet was laid up in port: he waits there. At sea it sank with him (EXPL-059).
      const last = e.lastAt.get(g.fleet) ?? -1;
      if (last >= 0 && !world.provinceWater[last] && world.provinceOwner[last] === g.owner) {
        g.port = last;
        g.fleet = -1;
        g.homeward = false;
        return true;
      }
      return false;
    }
    // Home in a port of his realm after giving up a colony: his slot frees (EXPL-049).
    return !(g.homeward && !world.provinceWater[f.at] && world.provinceOwner[f.at] === g.owner);
  });
}

/** The month (EXPL-041 … EXPL-048): each colony being founded gains, loses to the locals and eats (governors age with everyone, people.ts). */
export function monthlyColonies(world: World, news: News[]): void {
  const e = world.explore;
  e.colonies = e.colonies.filter((c) => {
    if (world.provinceOwner[c.province]! >= 0) return lost(world, c, "another realm holds the land", news), false;
    if (!e.governors.some((g) => g.id === c.governor)) return lost(world, c, "its governor is dead", news), false;
    const before = c.progress;
    const hungry = c.food < CFG.food_per_month;
    // The library's monthly step reads and writes only progress and food.
    const end = ex.colonyMonth(c as unknown as ex.Colony, ex.rollPressure(world.rng, c.aggression));
    c.lastChange = c.progress - before;
    if (end === "founded") return founded(world, c, news), false;
    if (end === "lost") return lost(world, c, hungry ? "its people starved" : "the locals drove the settlers off", news), false;
    return true;
  });
  aiExploration(world, news);
}

/** Colonial governors' wages a month, per realm (EXPL-025): for the officials' line of the ledger. */
export function governorWages(world: World): Float64Array {
  const out = new Float64Array(world.nationCount);
  for (const g of world.explore.governors) out[g.owner] = out[g.owner]! + CFG.governor_wage_per_year / 12;
  return out;
}

// ---------------------------------------------------------------- the AI

let seaMinded: Uint8Array | null = null;
/** Realms whose catalogue personality favours expansion by sea (EXPL-053); land powers never explore (EXPL-054). */
function seaMindedRealms(world: World): Uint8Array {
  if (seaMinded && seaMinded.length === world.nationCount) return seaMinded;
  seaMinded = Uint8Array.from(world.nationIds, (id) => (hasRecord(id) && ex.favoursSea(catalogueRecord(id).expansionModes) ? 1 : 0));
  return seaMinded;
}

/**
 * A course past the edge of the fleet's charts (EXPL-053): to the uncharted
 * zone farthest out within `most` zones, so one voyage lifts a long strip of
 * the parchment; *Turn back* brings it home in time.
 */
function courseIntoFog(world: World, f: NavyFleet, most: number): number[] | null {
  const r = reachOf(world, f);
  const prev = new Map<number, number>([[f.at, -1]]);
  const depth = new Map<number, number>([[f.at, 0]]);
  const queue = [f.at];
  let goal = -1;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    if (p !== f.at && !isCharted(world, f.owner, p) && (goal < 0 || depth.get(p)! > depth.get(goal)!)) goal = p;
    if (depth.get(p)! >= most) continue;
    for (const q of neighbours(world, p)) {
      if (prev.has(q) || !world.provinceWater[q] || !mayEnterZone(world, r, q)) continue;
      prev.set(q, p);
      depth.set(q, depth.get(p)! + 1);
      queue.push(q);
    }
  }
  if (goal < 0) return null;
  const path: number[] = [];
  for (let x = goal; x !== f.at; x = prev.get(x)!) path.push(x);
  return path.reverse();
}

/**
 * The exploration AI, once a month (EXPL-053, EXPL-062, D-EXPL-20): a
 * sea-minded realm with the unlock keeps a caravel; in port it takes a
 * governor and stores aboard when it may found a colony and sails for the
 * nearest empty coast in range, carries food to a colony that needs it, or
 * explores the edge of its charts; beside a target at sea it founds or unloads;
 * otherwise it sails home.
 */
function aiExploration(world: World, news: News[]): void {
  const sea = seaMindedRealms(world);
  const e = world.explore;
  for (let n = 0; n < world.nationCount; n++) {
    if (!sea[n] || isHuman(world, n) || world.nationGone[n] || !explorationUnlocked(world, n)) continue;
    const fleets = world.navy.fleets.filter((f) => f.owner === n && allExplorers(f));
    const building = world.navy.hulls.filter((h) => h.owner === n && nv.shipRow(h.type).family === "exploration").length;
    if (fleets.length + building < AI.explorers) aiBuyExplorer(world, n, news);
    const office = colonialOffice(world, n);
    const zones = office.unlocked ? rangeZones(world, n, office.range) : null;
    for (const f of fleets) {
      if (f.route.length || f.battle >= 0 || f.ships.some((s) => s.crew < nv.shipRow(s.type).crew * NC.minCrewToSail)) continue;
      const gov = e.governors.find((g) => g.fleet === f.id);
      const stores = f.ships.reduce((t, s) => t + (s.stores ?? 0), 0);
      if (world.provinceWater[f.at]) {
        // Beside an empty coast with a governor aboard: found, and put the stores ashore.
        // A tribe's hunting ground waits for the answer to an ask for the land (TRIBE-033).
        const site = gov && zones ? neighbours(world, f.at).find((p) => !whyNotColony(world, n, p, zones) && !aiWaitsToFound(world, n, p, news)) : undefined;
        if (site !== undefined && !foundColony(world, n, f.id, site, news)) unloadStores(world, n, f.id, news);
        else if (stores && e.colonies.some((c) => c.owner === n && besides(world, f.at, c.province))) unloadStores(world, n, f.id, news);
        aiHome(world, f);
        continue;
      }
      if (world.provinceOwner[f.at] !== n) {
        aiHome(world, f);
        continue;
      }
      const hungry = e.colonies.find((c) => c.owner === n && c.food < aiFoodNeed(c));
      const site = zones && office.used < office.slots ? aiColonySite(world, n, zones) : -1;
      // Before sailing for a tribe's hunting ground the AI asks for the land, and sails once answered (TRIBE-033).
      const target = site >= 0 && aiWaitsToFound(world, n, site, news) ? -1 : site;
      if (hungry || target >= 0) {
        if (!gov && !hungry && hireGovernor(world, n, f.id, news)) continue;
        loadStores(world, n, f.id);
        const to = hungry ? hungry.province : target;
        resupply(world, f);
        const plan = planVoyage(world, f, (p) => !!world.provinceWater[p] && besides(world, p, to));
        if (plan) setCourse(f, plan.path);
        continue;
      }
      const course = courseIntoFog(world, f, AI.most_zones_out);
      if (course) giveVoyage(world, n, f.id, course, false);
    }
  }
}

/** Sails an explorer home to a port of its own realm. */
function aiHome(world: World, f: NavyFleet): void {
  const home = planVoyage(world, f, (p) => !world.provinceWater[p] && world.provinceOwner[p] === f.owner && isPort(world, p));
  if (home) setCourse(f, home.path);
}

/** Food a colony still needs, with the AI's margin: its level's months to go × 20 rations × 1.25 (EXPL-062). */
function aiFoodNeed(c: ColonyFounding): number {
  const avg = ex.averageFounding(c.aggression);
  const months = Math.ceil((CFG.progress_founded - c.progress) / Math.max(1, avg.gain));
  return Math.ceil(months * CFG.food_per_month * CFG.ai.stores_margin);
}

/** The nearest empty coast in range, counted in zones from the realm's ports (EXPL-053). */
function aiColonySite(world: World, n: number, zones: Int16Array): number {
  let best = -1;
  let bestD = Infinity;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p] || world.provinceOwner[p]! >= 0 || !world.rules.provinces[p]!.coastal) continue;
    let d = Infinity;
    for (const q of neighbours(world, p)) if (world.provinceWater[q] && zones[q]! >= 0) d = Math.min(d, zones[q]!);
    if (d < bestD && !whyNotColony(world, n, p, zones)) ((best = p), (bestD = d));
  }
  return best;
}

/** A caravel ordered in the realm's best port, its crew mustered first (as the naval AI does). */
function aiBuyExplorer(world: World, n: number, news: News[]): void {
  const v = world.navy;
  const crew = nv.shipRow(AI.ship).crew;
  // A port where the caravel could be laid down now but for its crew, the one with most sailors waiting.
  let port = -1;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceOccupier[p]! >= 0 || !isPort(world, p)) continue;
    const why = whyNotShip(world, n, p, AI.ship);
    if (why && !why.startsWith(`needs ${crew} sailors`) && why !== "not enough gold") continue;
    if (port < 0 || v.sailors[p]! > v.sailors[port]!) port = p;
  }
  if (port < 0 || world.nationTreasury[n]! < AI.reserve_gold + shipGold(AI.ship)) return;
  if (v.sailors[port]! >= crew) buyShip(world, n, port, AI.ship, news);
  else if (!v.musters.some((m) => m.province === port)) {
    const want = Math.ceil(crew - v.sailors[port]!);
    if (callable(world, port) >= want) muster(world, n, port, want);
  }
}

// ---------------------------------------------------------------- what the player sees

export interface ExplorationView {
  /** The player's charted map: bit p of byte p >> 3. */
  charted: Uint8Array;
  /** May build exploration ships, else why not (null when research is what's missing: the port says which). */
  unlocked: boolean;
  why: string | null;
  colonial: boolean;
  slots: number;
  used: number;
  range: number;
  hireGold: number;
  wagePerYear: number;
  /** Per province: 0 not empty land, 1 an empty coast in range, 2 empty land beyond it or inland, 3 being settled. */
  sites: Uint8Array;
  governors: { id: number; name: string; age: number; port: number; fleet: number; colony: number; homeward: boolean }[];
  /** Colonies being founded, every realm's (for the map), the player's in full. */
  colonies: { province: number; owner: number; progress: number; aggression: string; food: number; monthsOfFood: number; average: number; pressureMax: number; lastChange: number; governor: string; monthsLeft: number }[];
  /** Provinces the player founded as colonies. */
  founded: number[];
  voyages: { fleet: number; carryOn: boolean; turnedBack: boolean; charted: number }[];
  /** For drawing a course: each zone's distance from a coast (255 far) and 1 for open ocean; static. */
  coastDist: Uint8Array;
  ocean: Uint8Array;
  /** Per explorer fleet of the player's: how far from a coast it may sail on the ocean (-1 none, 255 anywhere), and stores to load here. */
  fleets: { id: number; oceanReach: number; frozen: boolean; load: { rations: number; pays: "food" | "gold" | null; gold: number } }[];
  progressFounded: number;
  foodPerMonth: number;
}

export function explorationView(world: World, n: number): ExplorationView {
  const e = world.explore;
  const P = world.provinceCount;
  const office = n >= 0 ? colonialOffice(world, n) : { unlocked: false, slots: 0, used: 0, range: 0 };
  const zones = n >= 0 && office.unlocked ? rangeZones(world, n, office.range) : new Int16Array(P).fill(-1);
  const sites = new Uint8Array(P);
  for (let p = 0; p < P; p++) {
    if (world.provinceWater[p] || world.provinceOwner[p]! >= 0) continue;
    sites[p] = e.colonies.some((c) => c.province === p) ? 3 : n >= 0 && office.unlocked && !whyNotColony(world, n, p, zones) ? 1 : 2;
  }
  const fleets = world.navy.fleets
    .filter((f) => f.owner === n && allExplorers(f))
    .map((f) => {
      const r = reachOf(world, f);
      return { id: f.id, oceanReach: r.galley ? -1 : r.canoe || r.far ? 255 : r.near ? NC.oceanReachWithS1 : -1, frozen: r.frozen, load: storesToLoad(world, f) };
    });
  return {
    charted: chartedBits(world, n),
    unlocked: explorationUnlocked(world, n),
    why: n >= 0 ? whyNoExploration(world, n) : null,
    colonial: office.unlocked,
    slots: office.slots,
    used: office.used,
    range: office.range,
    hireGold: CFG.governor_hire_gold,
    wagePerYear: CFG.governor_wage_per_year,
    sites,
    governors: e.governors.filter((g) => g.owner === n).map((g) => ({ id: g.id, name: g.name, age: g.age, port: g.port, fleet: g.fleet, colony: g.colony, homeward: g.homeward })),
    colonies: e.colonies
      .filter((c) => c.owner === n || isCharted(world, n, c.province))
      .map((c) => {
        const avg = ex.averageFounding(c.aggression);
        return {
          province: c.province,
          owner: c.owner,
          progress: c.progress,
          aggression: c.aggression,
          food: c.food,
          monthsOfFood: Math.floor(c.food / CFG.food_per_month),
          average: avg.gain,
          pressureMax: ex.pressureMax(c.aggression),
          lastChange: c.lastChange,
          governor: e.governors.find((g) => g.id === c.governor)?.name ?? "",
          monthsLeft: Math.ceil((CFG.progress_founded - c.progress) / Math.max(1, avg.gain)),
        };
      }),
    founded: Array.from(e.founded.keys()).filter((p) => e.founded[p] === n && world.provinceOwner[p] === n),
    voyages: e.voyages.filter((v) => fleetById(world, v.fleet)?.owner === n).map((v) => ({ ...v })),
    coastDist: world.navy.coastDist,
    ocean: world.navy.ocean,
    fleets,
    progressFounded: CFG.progress_founded,
    foodPerMonth: CFG.food_per_month,
  };
}

// ---------------------------------------------------------------- saves

export interface SavedExploration {
  /** Charted bits per realm, base64, over the save's provinces. */
  charted: string[];
  voyages: World["explore"]["voyages"];
  governors: ColonialGovernor[];
  colonies: ColonyFounding[];
  founded: Record<string, number>;
  seq: number;
}

const toB64 = (b: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function saveExploration(world: World): SavedExploration {
  const e = world.explore;
  const founded: Record<string, number> = {};
  e.founded.forEach((n, p) => n >= 0 && (founded[world.provinceIds[p]!] = n));
  return { charted: world.nationIds.map((_, n) => toB64(chartedBits(world, n))), voyages: e.voyages, governors: e.governors, colonies: e.colonies, founded, seq: e.seq };
}

/** Puts saved charts and colonies back, provinces and realms mapped to this build's. */
export function restoreExploration(world: World, saved: SavedExploration, mapN: (old: number) => number, mapP: (old: number) => number): void {
  const e = world.explore;
  saved.charted.forEach((b64, old) => {
    const n = mapN(old);
    if (n < 0) return;
    const bits = fromB64(b64);
    for (let i = 0; i < bits.length * 8; i++) {
      if (!(bits[i >> 3]! & (1 << (i & 7)))) continue;
      const p = mapP(i);
      if (p >= 0) {
        const k = n * e.stride + (p >> 3);
        e.charted[k] = e.charted[k]! | (1 << (p & 7));
      }
    }
  });
  e.voyages = saved.voyages;
  e.governors = saved.governors
    .map((g) => ({ ...g, owner: mapN(g.owner), port: g.port < 0 ? -1 : mapP(g.port), colony: g.colony < 0 ? -1 : mapP(g.colony) }))
    .filter((g) => g.owner >= 0);
  e.colonies = saved.colonies.map((c) => ({ ...c, owner: mapN(c.owner), province: mapP(c.province) })).filter((c) => c.owner >= 0 && c.province >= 0);
  e.founded.fill(-1);
  for (const [id, n] of Object.entries(saved.founded)) {
    const p = world.provinceIndex.get(id);
    if (p !== undefined && mapN(n) >= 0) e.founded[p] = mapN(n);
  }
  e.seq = saved.seq;
}
