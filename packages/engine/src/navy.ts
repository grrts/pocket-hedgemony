import warfareData from "../../rules/data/domain/warfare.json" with { type: "json" };
import * as nv from "./domain/naval/index.ts";
import type { World } from "./world.ts";
import { atWar, controller, relationState, type News } from "./war.ts";
import { knows } from "./research.ts";
import * as rs from "./domain/research/index.ts";
import { slotsOf, slotsUsed, WORK_COUNT, workIndex, worksAt } from "./works.ts";
import { classesOf } from "./living.ts";
import { armyOf, idleCommanders } from "./recruit.ts";
import { halt, mayMarchInto } from "./turn.ts";
import { isCharted, whyNoExploration } from "./exploration.ts";
import { noteMoment } from "./achievements.ts";

/**
 * Ports, sailors, ships and fleets in play (domain/naval/spec.md), on the
 * rules of the naval library. Ports are provinces with a harbour; their
 * people are mustered as sailors, who wait in port until a ship is bought
 * for them. Fleets sail the sea zones of the province graph a step of the
 * clock at a time, fight enemy fleets they meet, round by round, and carry
 * an army from a port to a shore.
 */

const C = nv.navalConfig;
const G = C.game;
const SHIPS = warfareData.ships as unknown as Record<string, { fights: number; carries: number }>;
/** The harbour among the works (looked up when first needed: works.ts loads after this module). */
let HARBOUR = -1;
const harbourWork = (): number => (HARBOUR >= 0 ? HARBOUR : (HARBOUR = workIndex("harbour")));
const HULLS = C.hullSteps;
const WRECKED = HULLS.length - 1;
const LEAKING = HULLS.indexOf("leaking");

/** Ships a port can be asked for, in the order the port card lists them. Small craft wait on fishing. */
export const SHIP_TYPES = ["cog", "junk", "dhow", "caravel", "voyaging canoe", "galley", "war canoe fleet", "carrack", "fluyt", "armed carrack", "galleon", "turtle ship", "ship of the line", "steamer"] as const;
const TRADE_SHIPS = new Set(["cog", "junk", "dhow"]);

export interface NavyShip {
  id: number;
  type: string;
  /** Sailors aboard. */
  crew: number;
  /** Hull step: index into naval hullSteps (0 sound … 3 wrecked). */
  hull: number;
  /** Zones it can still sail before it must dock. */
  supply: number;
  /** Hits taken in the battle being fought. */
  damage: number;
  /** Months since its hull last wore a step. */
  wear: number;
  /** Years since launch. */
  age: number;
  /** Port its crew was mustered at. */
  home: number;
  /** Colony stores in the hold, apart from its supply (exploration ships only, EXPL-044). */
  stores?: number;
}

export interface NavyFleet {
  id: number;
  owner: number;
  /** Province it is in: a sea zone, or a port it lies in. */
  at: number;
  /** Provinces still to sail through, the last a port to put into or a zone to wait in. */
  route: number[];
  /** Hours sailed toward the next province. */
  progress: number;
  /** Commander leading it, -1 = none. */
  admiral: number;
  ships: NavyShip[];
  /** Army aboard (its slot), -1 = none. */
  army: number;
  /** Shore to land the army on when the voyage ends, -1 = none. */
  landAt: number;
  /** Hours of landing left, while the army goes ashore. */
  landing: number;
  /** Sea battle it is fighting (its id), -1 = none. */
  battle: number;
  /** Beaten and running for port: it can't be caught until it docks. */
  fleeing: boolean;
  /** A hired fleet's contract (F-115, hiredFleets.ts); absent for the realm's own ships. */
  hire?: FleetHire;
}

/** What a hired fleet is and who is paid for it: a free fleet, or a realm's own fleet lent out. */
export interface FleetHire {
  name: string;
  /** The free fleet's group, or the lending realm's name. */
  group: string;
  /** The realm that lent it, -1 for a free fleet. */
  from: number;
  /** Gold a month, paid by the hirer (to the lender, for a lent fleet). */
  pay: number;
  /** Its own captain, the fleet's admiral, who leaves with it. */
  captain: number;
  /** Dismissed or unpaid: it goes once its army is ashore and its battle over. */
  leaving?: boolean;
}

/** A free fleet waiting for a contract where it gathered (F-115). */
export interface FreeFleet {
  id: number;
  group: string;
  name: string;
  captain: string;
  /** Its captain's Might, Cunning and Logistics. */
  skills: [number, number, number];
  /** The sea zone it gathered in. */
  at: number;
  /** Its ships by type, one entry a ship. */
  ships: string[];
}

export interface NavyHull {
  province: number;
  owner: number;
  type: string;
  monthsLeft: number;
  months: number;
  crew: number;
  /** Building on a slipway, else on the harbour's beach. */
  slipway: boolean;
}

export interface SeaBattle {
  id: number;
  zone: number;
  /** Fleet ids on each side. */
  sides: [number[], number[]];
  /** Each side's strength when it began. */
  start: [number, number];
  /** Ships each side has lost. */
  lost: [number, number];
  round: number;
  /** Realm leading each side. */
  leaders: [number, number];
}

export interface NavyState {
  /** Shipyard step per province (0 none, 4 the Arsenal). */
  shipyard: Int8Array;
  /** Sailors waiting in each port. */
  sailors: Float32Array;
  /** Sailors from each province serving anywhere (in port, building, aboard), mustering included. */
  away: Float32Array;
  /** Months the sailors in each port have waited. */
  waited: Uint8Array;
  musters: { province: number; owner: number; sailors: number; day: number }[];
  hulls: NavyHull[];
  fleets: NavyFleet[];
  battles: SeaBattle[];
  seq: number;
  /** Per sea zone: zones to the nearest coast (0 beside land), 255 = far. */
  coastDist: Uint8Array;
  /** 1 for open-ocean zones. */
  ocean: Uint8Array;
  /** 1 for zones that freeze in winter (NAVY-125), 1 for zones of the monsoon seas (NAVY-092). */
  frozen: Uint8Array;
  monsoon: Uint8Array;
  /** Free fleets for hire (F-115), shared by every realm that can reach them. */
  forHire: FreeFleet[];
  hireSeq: number;
}

export function createNavyState(P: number): NavyState {
  return {
    shipyard: new Int8Array(P),
    sailors: new Float32Array(P),
    away: new Float32Array(P),
    waited: new Uint8Array(P),
    musters: [],
    hulls: [],
    fleets: [],
    battles: [],
    seq: 0,
    coastDist: new Uint8Array(P).fill(255),
    ocean: new Uint8Array(P),
    frozen: new Uint8Array(P),
    monsoon: new Uint8Array(P),
    forHire: [],
    hireSeq: 0,
  };
}

// ---------------------------------------------------------------- the 1444 ports

/**
 * The sea as the fleets see it, and the ports of 1444 (NAVY-013, NAVY-014):
 * each placed province gets at least its starting harbour, and its shipyard.
 */
export function seedNavy(world: World): void {
  const v = world.navy;
  const P = world.provinceCount;
  const frozenNames = C.frozenSeas.zones;
  const monsoonNames = C.monsoon.seas;
  const queue: number[] = [];
  for (let p = 0; p < P; p++) {
    if (!world.provinceWater[p]) continue;
    const def = world.rules.provinces[p]!;
    v.ocean[p] = def.terrain === "ocean" ? 1 : 0;
    v.frozen[p] = frozenNames.some((n) => def.name.startsWith(n)) ? 1 : 0;
    v.monsoon[p] = monsoonNames.some((n) => def.name.startsWith(n)) ? 1 : 0;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      if (!world.provinceWater[world.adjList[k]!]) {
        v.coastDist[p] = 0;
        queue.push(p);
        break;
      }
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const q = world.adjList[k]!;
      if (world.provinceWater[q] && v.coastDist[q] === 255) {
        v.coastDist[q] = Math.min(254, v.coastDist[p]! + 1);
        queue.push(q);
      }
    }
  }
  const knowsS4 = (holder: string) => {
    const n = world.nationIndex.get(holder);
    return n !== undefined && knows(world, n, C.startShipyard.invention);
  };
  for (const row of nv.startPortsTable(knowsS4)) {
    const p = world.provinceIndex.get(row.province);
    if (p === undefined || world.provinceWater[p] || !world.rules.provinces[p]!.coastal) continue;
    const k = p * WORK_COUNT + harbourWork();
    // A new harbour needs a free slot, as any work; a harbour standing is raised to its 1444 step.
    if (!world.provinceWorks[k] && slotsUsed(world, p) >= slotsOf(world, p)) continue;
    world.provinceWorks[k] = Math.max(world.provinceWorks[k]!, row.harbour);
    v.shipyard[p] = row.shipyard;
  }
}

// ---------------------------------------------------------------- ports and sailors

export const harbourStep = (world: World, p: number): number => (world.provinceWater[p] || !world.rules.provinces[p]!.coastal ? 0 : worksAt(world, p, harbourWork()));
export const isPort = (world: World, p: number): boolean => harbourStep(world, p) > 0;
export const berthsOf = (world: World, p: number): number => nv.berths({ harbourStep: harbourStep(world, p), shoreTile: true });
/** Slipways working. Timber is bought in until trade carries wares, so a yard without a lumber camp near still works (D-NAVY-32). */
export const slipwaysOf = (world: World, p: number): number => nv.slipways({ shipyardStep: world.navy.shipyard[p]! });

/** Sailors a muster can still call in a port province (NAVY-025, NAVY-027): its callable men less those already away, within its levy pool. */
export function callable(world: World, p: number): number {
  let sum = 0;
  for (const [c, k] of Object.entries(classesOf(world, p))) sum += k * 1000 * C.fightingAgeShare * nv.musterShare(c);
  return Math.max(0, Math.floor(Math.min(sum - world.navy.away[p]!, world.provinceRecruits[p]!)));
}

/** Gold of a ship's price, in the treasury's gold. */
export const shipGold = (type: string): number => Math.round(nv.shipRow(type).gold * G.goldScale * 10) / 10;
export const musterGold = (sailors: number): number => Math.round(sailors * C.muster.bountyPerSailor * G.wageScale * 100) / 100;
export const fightsOf = (type: string): number => SHIPS[type]?.fights ?? 0;
export const carriesOf = (type: string): number => SHIPS[type]?.carries ?? 0;

/** The trade ship of the sea a port lies on (NAVY-049): the junk in East and Southeast Asia, the dhow on the Indian Ocean and Red Sea, the cog elsewhere. */
export function localTradeShip(world: World, p: number): string {
  const m = world.rules.map;
  const def = world.rules.provinces[p]!;
  if (!m || def.x === undefined || def.y === undefined) return "cog";
  const lon = def.x / m.pxPerDeg - 180;
  const lat = m.latTop - def.y / m.pxPerDeg;
  if (lon >= 95 && lat > -15) return "junk";
  if (lon >= 32 && lon < 95 && lat < 32) return "dhow";
  return "cog";
}

/** Why realm n can't order a ship of this type in port p now, or null (NAVY-042..048). */
export function whyNotShip(world: World, n: number, p: number, type: string): string | null {
  if (TRADE_SHIPS.has(type) && type !== localTradeShip(world, p)) return `this sea builds the ${localTradeShip(world, p)}`;
  const row = nv.shipRow(type);
  if (row.unlock && !knows(world, n, row.unlock)) return `needs ${inventionName(world, row.unlock)}`;
  if (row.family === "exploration") {
    const why = whyNoExploration(world, n);
    if (why) return why;
  }
  const where = buildPlace(world, p, type);
  if (where === "no shipyard") return typeof row.builtAt === "number" ? `needs a shipyard of step ${row.builtAt}` : "needs a shipyard";
  if (where === "busy") return "every slipway is busy";
  if (world.navy.sailors[p]! < row.crew) return `needs ${row.crew} sailors in port`;
  if (world.nationTreasury[n]! < shipGold(type)) return "not enough gold";
  return null;
}

const inventionName = (_world: World, id: string): string => rs.invention(id).name.replace(/_/g, " ");

/** Where a hull of this type would be built in port p: a slipway, the harbour's beach, or why not. */
function buildPlace(world: World, p: number, type: string): "slipway" | "beach" | "no shipyard" | "busy" {
  const row = nv.shipRow(type);
  const v = world.navy;
  const onSlips = v.hulls.reduce((k, h) => k + (h.province === p && h.slipway ? 1 : 0), 0);
  const onBeach = v.hulls.some((h) => h.province === p && !h.slipway);
  const slips = slipwaysOf(world, p);
  if (typeof row.builtAt === "number") {
    if (!slips || !nv.shipyardAllows(v.shipyard[p]!, type)) return "no shipyard";
    return onSlips < slips ? "slipway" : "busy";
  }
  // Hulls that need no slipway: on a free slipway at the table's months, else one at a time on the harbour (NAVY-048).
  if (onSlips < slips) return "slipway";
  return onBeach ? "busy" : "beach";
}

// ---------------------------------------------------------------- ships and fleets

export const newShip = (world: World, type: string, crew: number, home: number): NavyShip => ({ id: ++world.navy.seq, type, crew, hull: 0, supply: nv.fullSupply(type), damage: 0, wear: 0, age: 0, home });

export const crewNeed = (s: NavyShip): number => nv.shipRow(s.type).crew;
const crewShare = (s: NavyShip): number => Math.min(1, s.crew / Math.max(1, crewNeed(s)));

/** What a ship fights with now: its strength by its crew share, half without supply, less on a leaking or wrecked hull (NAVY-063, NAVY-088). */
export function shipStrength(s: NavyShip): number {
  return fightsOf(s.type) * crewShare(s) * (s.supply <= 0 ? C.outOfSupply.strengthCap : 1) * (s.hull >= LEAKING ? 0.5 : 1);
}

export const fleetStrength = (f: NavyFleet): number => f.ships.reduce((t, s) => t + shipStrength(s), 0);
/** Men a fleet can carry: each horse takes the room of 4 (NAVY-096). */
export const fleetRoom = (f: NavyFleet): number => f.ships.reduce((t, s) => t + carriesOf(s.type) * (s.hull < WRECKED ? 1 : 0), 0);
export const armyRoom = (world: World, slot: number): number => world.armies.men[slot]! + world.armies.horse[slot]! * (C.room.horse - 1);
export const fleetById = (world: World, id: number): NavyFleet | undefined => world.navy.fleets.find((f) => f.id === id);

/** A fleet of nothing but exploration ships: the only fleets that sail into uncharted zones (INV-EXPL-3). */
export const allExplorers = (f: Pick<NavyFleet, "ships">): boolean => f.ships.length > 0 && f.ships.every((s) => nv.shipRow(s.type).family === "exploration");

/** Warships or a fleet carrying an army need an admiral to leave port; trade ships sail without (NAVY-065, NAVY-066). */
export const needsAdmiral = (f: NavyFleet): boolean => f.army >= 0 || f.ships.some((s) => nv.isWarship(s.type));

/** The fleet of realm n lying in port p without an admiral, which a new ship joins; exploration ships keep a fleet of their own, so they may explore (EXPL-069). */
function portFleet(world: World, n: number, p: number, type: string): NavyFleet {
  const v = world.navy;
  const explorer = nv.shipRow(type).family === "exploration";
  const f = v.fleets.find((x) => x.owner === n && x.at === p && x.admiral < 0 && x.army < 0 && !x.route.length && x.battle < 0 && allExplorers(x) === explorer);
  if (f) return f;
  const made: NavyFleet = { id: ++v.seq, owner: n, at: p, route: [], progress: 0, admiral: -1, ships: [], army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false };
  v.fleets.push(made);
  return made;
}

/** The rules of who may sail where for a fleet (NAVY-091, NAVY-092): coasts, the ocean near them with the compass, any ocean with ocean navigation. */
export interface SeaReach {
  galley: boolean;
  /** Only voyaging canoes: they cross open ocean from the start (EXPL-008). */
  canoe: boolean;
  near: boolean;
  far: boolean;
  monsoon: boolean;
  frozen: boolean;
}

export function reachOf(world: World, f: Pick<NavyFleet, "owner" | "ships">): SeaReach {
  const n = f.owner;
  const types = f.ships.map((s) => s.type);
  return {
    galley: types.some((t) => nv.shipRow(t).galley || nv.shipRow(t).stepDays.ocean === null),
    canoe: types.length > 0 && types.every((t) => t === "voyaging canoe"),
    near: knows(world, n, C.seaInventions.compass),
    far: knows(world, n, C.seaInventions.ocean),
    monsoon: types.length > 0 && types.every((t) => C.monsoon.ships.includes(t)) && knows(world, n, C.monsoon.needs),
    frozen: C.frozenSeas.months.includes(world.date.month),
  };
}

export function mayEnterZone(world: World, r: SeaReach, q: number): boolean {
  const v = world.navy;
  if (!world.provinceWater[q]) return false;
  if (r.frozen && v.frozen[q]) return false;
  if (!v.ocean[q]) return true;
  if (r.galley) return false;
  return r.canoe || r.far || (r.near && v.coastDist[q]! <= C.oceanReachWithS1) || (r.monsoon && !!v.monsoon[q]);
}

/** Who may put into port p: its own realm and partners take food, realms at peace pay gold, enemies none (NAVY-081). */
export function dockRight(world: World, n: number, p: number): "food" | "gold" | null {
  if (!isPort(world, p)) return null;
  const holder = controller(world, p);
  if (holder < 0) return null;
  if (holder === n) return "food";
  const tie = relationState(world, n, holder).state;
  if (tie === "war") return null;
  return tie === "alliance" || tie === "subject" || tie === "overlord" ? "food" : "gold";
}

/** Days the fleet takes to cross zone q: its slowest ship's, longer for a leaking hull or short crew, shorter by its admiral's Cunning (NAVY-062, NAVY-063, NAVY-070, INV-NAVY-7). */
export function zoneDays(world: World, f: NavyFleet, q: number): number {
  const water = world.navy.ocean[q] ? "ocean" : "sea";
  let days = 0;
  for (const s of f.ships) {
    const base = nv.shipRow(s.type).stepDays[water] ?? Infinity;
    days = Math.max(days, (base * (s.hull >= LEAKING ? C.leakingDaysMultiplier : 1)) / Math.max(C.minCrewToSail, crewShare(s)));
  }
  const cunning = f.admiral >= 0 ? world.commanders[f.admiral]!.cunning : 0;
  return days * Math.max(0.5, 1 - C.admiral.cunningDays * cunning);
}

/**
 * The quickest voyage from where the fleet is to any province `goal` accepts,
 * over the zones it may enter (a port only as the last step). Dijkstra on days.
 */
export function planVoyage(world: World, f: NavyFleet, goal: (p: number) => boolean, opts: { knownWaters?: boolean } = {}): { path: number[]; days: number } | null {
  const r = reachOf(world, f);
  // Only exploration ships sail into the parchment; other fleets keep to charted zones (EXPL-016), except hired crews coming in by waters they know (F-115).
  const blind = !opts.knownWaters && !allExplorers(f);
  const dist = new Map<number, number>([[f.at, 0]]);
  const prev = new Map<number, number>();
  const done = new Set<number>();
  // A binary heap of [days, province].
  const heap: [number, number][] = [];
  const push = (c: number, p: number) => {
    heap.push([c, p]);
    for (let i = heap.length - 1; i > 0; ) {
      const up = (i - 1) >> 1;
      if (heap[up]![0] <= c) break;
      [heap[up], heap[i]] = [heap[i]!, heap[up]!];
      i = up;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        if (l >= heap.length) break;
        const m = l + 1 < heap.length && heap[l + 1]![0] < heap[l]![0] ? l + 1 : l;
        if (heap[m]![0] >= heap[i]![0]) break;
        [heap[m], heap[i]] = [heap[i]!, heap[m]!];
        i = m;
      }
    }
    return top;
  };
  push(0, f.at);
  while (heap.length) {
    const [d, p] = pop();
    if (done.has(p)) continue;
    done.add(p);
    if (p !== f.at && goal(p)) {
      const path: number[] = [];
      for (let x = p; x !== f.at; x = prev.get(x)!) path.push(x);
      return { path: path.reverse(), days: d };
    }
    // Ports are ends of a voyage, never passed through.
    if (p !== f.at && !world.provinceWater[p]) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const q = world.adjList[k]!;
      if (done.has(q) || (blind && !isCharted(world, f.owner, q))) continue;
      let cost: number;
      if (world.provinceWater[q]) {
        if (!mayEnterZone(world, r, q)) continue;
        cost = zoneDays(world, f, q);
      } else {
        if (!goal(q)) continue;
        cost = G.dockDays;
      }
      const c = d + cost;
      if (c < (dist.get(q) ?? Infinity)) {
        dist.set(q, c);
        prev.set(q, p);
        push(c, q);
      }
    }
  }
  return null;
}

/** Days left on a fleet's voyage. */
export function voyageDays(world: World, f: NavyFleet): number {
  let d = 0;
  for (const q of f.route) d += world.provinceWater[q] ? zoneDays(world, f, q) : G.dockDays;
  return Math.max(0, d - f.progress / 24) + (f.landing > 0 ? f.landing / 24 : 0);
}

// ---------------------------------------------------------------- orders

export type NavyOrder =
  /** Muster sailors in a port of the realm's (NAVY-024). */
  | { type: "navy"; do: "muster"; province: number; sailors: number }
  /** Order a ship in a port, its crew from the sailors waiting there (NAVY-042). */
  | { type: "navy"; do: "buy"; province: number; ship: string }
  /** Sail to a sea zone, a port to put into, or a shore to land the army aboard on; in battle, sail away from it. */
  | { type: "navy"; do: "sail"; fleet: number; to: number }
  /** Take an army standing in the fleet's port aboard; put it ashore in the port the fleet lies in. */
  | { type: "navy"; do: "board"; fleet: number; army: number }
  | { type: "navy"; do: "unload"; fleet: number }
  /** Put a commander at the head of the fleet as its admiral (-1 sends him back to court). */
  | { type: "navy"; do: "admiral"; fleet: number; commander: number }
  /** Join another fleet in the same place; part one ship off as a fleet of its own. */
  | { type: "navy"; do: "merge"; fleet: number; into: number }
  | { type: "navy"; do: "split"; fleet: number; ship: number }
  /** Break the fleet up in port: its crews go back to the sailors waiting there. */
  | { type: "navy"; do: "disband"; fleet: number };

export function navyOrder(world: World, o: NavyOrder, n: number, news: News[]): string | null {
  switch (o.do) {
    case "muster":
      return muster(world, n, o.province, o.sailors);
    case "buy":
      return buyShip(world, n, o.province, o.ship, news);
    case "sail":
      return sailFleet(world, n, o.fleet, o.to);
    case "board":
      return board(world, n, o.fleet, o.army);
    case "unload": {
      const f = fleetById(world, o.fleet);
      if (!f || f.owner !== n) return "no such fleet of yours";
      if (f.army < 0) return "no army aboard";
      if (world.provinceWater[f.at]) return "the fleet is at sea: send it to a shore to land the army";
      return land(world, f, f.at) ? null : "the army may not go ashore here";
    }
    case "admiral":
      return setAdmiral(world, n, o.fleet, o.commander);
    case "merge":
      return merge(world, n, o.fleet, o.into);
    case "split":
      return split(world, n, o.fleet, o.ship);
    case "disband":
      return disband(world, n, o.fleet);
  }
}

export function muster(world: World, n: number, p: number, count: number): string | null {
  if (p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  if (!isPort(world, p)) return "sailors are mustered only in a port: build a harbour first";
  if (world.provinceOccupier[p]! >= 0) return "the enemy holds the port";
  count = Math.floor(count);
  if (count < 1) return "muster at least one sailor";
  if (count > callable(world, p)) return "not that many men here can go to sea";
  const gold = musterGold(count);
  if (world.nationTreasury[n]! < gold) return "not enough gold for the bounty";
  const v = world.navy;
  world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  world.provinceRecruits[p] = Math.max(0, world.provinceRecruits[p]! - count);
  v.away[p] = v.away[p]! + count;
  v.musters.push({ province: p, owner: n, sailors: count, day: world.day + C.muster.days });
  return null;
}

export function buyShip(world: World, n: number, p: number, type: string, news: News[] = []): string | null {
  if (p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  if (!isPort(world, p)) return "ships are bought only in a port";
  if (world.provinceOccupier[p]! >= 0) return "the enemy holds the port";
  if (!(SHIP_TYPES as readonly string[]).includes(type)) return "no such ship";
  const why = whyNotShip(world, n, p, type);
  if (why) return why;
  const row = nv.shipRow(type);
  const where = buildPlace(world, p, type);
  const months = Math.ceil(row.months * (where === "beach" ? C.harbourBuildMonthsMultiplier : 1));
  world.nationTreasury[n] = world.nationTreasury[n]! - shipGold(type);
  world.navy.sailors[p] = world.navy.sailors[p]! - row.crew;
  world.navy.hulls.push({ province: p, owner: n, type, monthsLeft: months, months, crew: row.crew, slipway: where === "slipway" });
  if (n === world.player) news.push({ kind: "built", text: `A ${type} is laid down at ${provinceName(world, p)}: ${months} months to launch.`, nations: [n], province: p });
  return null;
}

function sailFleet(world: World, n: number, id: number, to: number): string | null {
  const f = fleetById(world, id);
  if (!f || f.owner !== n) return "no such fleet of yours";
  if (to < 0 || to >= world.provinceCount) return "no such place";
  if (f.landing > 0) return "the army is going ashore";
  if (needsAdmiral(f) && f.admiral < 0) return "warships and troop ships need an admiral to sail: give the fleet one";
  if (f.ships.some((s) => crewShare(s) < C.minCrewToSail)) return "a ship has less than a quarter of its crew";
  if (to === f.at && f.battle < 0) {
    f.route = [];
    f.progress = 0;
    f.landAt = -1;
    return null;
  }
  let plan: { path: number[]; days: number } | null;
  let landAt = -1;
  if (world.provinceWater[to]) plan = planVoyage(world, f, (p) => p === to);
  // With an army aboard, a port that isn't a friend's is a shore to land on.
  else if (dockRight(world, n, to) === "food" || (dockRight(world, n, to) && f.army < 0)) plan = planVoyage(world, f, (p) => p === to);
  else if (f.army >= 0) {
    if (!world.rules.provinces[to]!.coastal) return "the army can only be landed on a coast";
    if (!mayMarchInto(world, n, to)) return "you have no right to land there: you need war or passage";
    const shore = new Set<number>();
    for (let k = world.adjStart[to]!; k < world.adjStart[to + 1]!; k++) if (world.provinceWater[world.adjList[k]!]) shore.add(world.adjList[k]!);
    plan = shore.has(f.at) ? { path: [], days: 0 } : planVoyage(world, f, (p) => shore.has(p));
    landAt = to;
  } else return isPort(world, to) ? "you may not put into that port: it is an enemy's" : "no port of yours or a friend's there: tap a port or the sea";
  if (!plan) return "no way there by sea for these ships (their research, galleys or ice)";
  if (f.battle >= 0) leaveBattle(world, f);
  f.route = plan.path;
  f.progress = 0;
  f.landAt = landAt;
  f.fleeing = false;
  return null;
}

function board(world: World, n: number, id: number, slot: number): string | null {
  const f = fleetById(world, id);
  const a = world.armies;
  if (!f || f.owner !== n) return "no such fleet of yours";
  if (slot < 0 || slot >= a.count || !a.alive[slot] || a.owner[slot] !== n) return "no such army of yours";
  if (world.provinceWater[f.at] || a.location[slot] !== f.at) return "the army must stand in the port the fleet lies in";
  if (f.army >= 0) return "the fleet already carries an army";
  if (a.battle[slot]! >= 0 || a.retreating[slot]) return "the army can't board now";
  if (armyRoom(world, slot) > fleetRoom(f)) return `not enough room: the ships carry ${fleetRoom(f).toLocaleString("en-US")} men, the army needs ${Math.round(armyRoom(world, slot)).toLocaleString("en-US")} (a horse takes the room of ${C.room.horse})`;
  halt(world, slot);
  f.army = slot;
  a.retreating[slot] = 1;
  return null;
}

/** The army aboard goes ashore in province p, where its fleet lies or beside it. */
function land(world: World, f: NavyFleet, p: number): boolean {
  const a = world.armies;
  const slot = f.army;
  if (slot < 0 || !a.alive[slot]) {
    f.army = -1;
    return false;
  }
  if (!mayMarchInto(world, f.owner, p)) return false;
  a.location[slot] = p;
  a.tile[slot] = world.tiles.centre[p]!;
  a.retreating[slot] = 0;
  a.cameFrom[slot] = -1;
  halt(world, slot);
  f.army = -1;
  f.landAt = -1;
  f.landing = 0;
  return true;
}

function setAdmiral(world: World, n: number, id: number, c: number): string | null {
  const f = fleetById(world, id);
  if (!f || f.owner !== n) return "no such fleet of yours";
  if (f.hire) return "a hired fleet keeps its own captain";
  if (c < 0) {
    if (world.provinceWater[f.at] && needsAdmiral(f)) return "a fleet at sea keeps its admiral until it is in port";
    f.admiral = -1;
    return null;
  }
  if (c >= world.commanderIds.length || world.commanderOwner[c] !== n) return "no such commander of yours";
  if (armyOf(world, c) >= 0) return "that commander leads an army";
  if (world.navy.fleets.some((x) => x.admiral === c && x !== f)) return "that commander already leads a fleet";
  f.admiral = c;
  return null;
}

function merge(world: World, n: number, id: number, into: number): string | null {
  const f = fleetById(world, id);
  const g = fleetById(world, into);
  if (!f || !g || f === g || f.owner !== n || g.owner !== n) return "no such fleet of yours";
  if (f.hire || g.hire) return "a hired fleet sails on its own, under its own captain";
  if (f.at !== g.at || f.battle >= 0 || g.battle >= 0 || f.landing > 0 || g.landing > 0) return "the fleets must lie in the same place, out of battle";
  if (f.army >= 0 && g.army >= 0) return "both fleets carry an army";
  g.ships.push(...f.ships);
  if (g.army < 0) g.army = f.army;
  if (g.admiral < 0) g.admiral = f.admiral;
  world.navy.fleets.splice(world.navy.fleets.indexOf(f), 1);
  return null;
}

function split(world: World, n: number, id: number, shipId: number): string | null {
  const f = fleetById(world, id);
  if (!f || f.owner !== n) return "no such fleet of yours";
  const k = f.ships.findIndex((s) => s.id === shipId);
  if (k < 0) return "no such ship in the fleet";
  if (f.hire) return "a hired fleet keeps its ships together";
  if (f.ships.length < 2) return "the fleet has only that ship";
  if (f.battle >= 0) return "the fleet is fighting";
  if (f.army >= 0 && armyRoom(world, f.army) > fleetRoom({ ...f, ships: f.ships.filter((_, i) => i !== k) })) return "the army aboard needs that ship's room";
  const [ship] = f.ships.splice(k, 1);
  const v = world.navy;
  v.fleets.push({ id: ++v.seq, owner: n, at: f.at, route: [], progress: 0, admiral: -1, ships: [ship!], army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false });
  return null;
}

function disband(world: World, n: number, id: number): string | null {
  const f = fleetById(world, id);
  if (!f || f.owner !== n) return "no such fleet of yours";
  if (f.hire) return "a hired fleet is dismissed, not laid up";
  if (world.provinceWater[f.at]) return "a fleet is broken up only in port";
  if (f.army >= 0 && !land(world, f, f.at)) return "the army aboard may not go ashore here";
  const v = world.navy;
  const own = world.provinceOwner[f.at] === n;
  for (const s of f.ships) payOff(world, s, own ? f.at : -1);
  v.fleets.splice(v.fleets.indexOf(f), 1);
  return null;
}

/** A crew leaves its ship: into the sailors waiting in port p, or home (p = -1). */
function payOff(world: World, s: NavyShip, p: number): void {
  const v = world.navy;
  if (s.home >= 0) v.away[s.home] = Math.max(0, v.away[s.home]! - s.crew);
  if (p >= 0) {
    v.sailors[p] = v.sailors[p]! + s.crew;
    v.away[p] = v.away[p]! + s.crew;
  }
}

// ---------------------------------------------------------------- each step

/** A step of the clock (4 hours): musters come in, fleets sail and land, and sea battles fight a round (X-1, X-2: fleets after armies). */
export function stepNavy(world: World, hours: number, news: News[]): void {
  const v = world.navy;
  if (world.step === 0 && v.musters.length) {
    v.musters = v.musters.filter((m) => {
      if (m.day > world.day) return true;
      if (world.provinceOwner[m.province] === m.owner) v.sailors[m.province] = v.sailors[m.province]! + m.sailors;
      else v.away[m.province] = Math.max(0, v.away[m.province]! - m.sailors);
      return false;
    });
  }
  if (!v.fleets.length) return;
  const a = world.armies;
  for (const f of v.fleets) {
    // An admiral given an army by the AI's levy leaves the fleet.
    if (f.admiral >= 0 && world.step === 0 && armyOf(world, f.admiral) >= 0) f.admiral = -1;
    if (f.battle < 0) sailStep(world, f, hours);
    if (f.army >= 0) {
      if (!a.alive[f.army] || a.owner[f.army] !== f.owner) f.army = -1;
      else {
        // The army aboard goes where its ships go, out of reach of battles on land.
        a.location[f.army] = f.at;
        a.retreating[f.army] = 1;
      }
    }
  }
  seaBattles(world, news);
}

function sailStep(world: World, f: NavyFleet, hours: number): void {
  if (f.landing > 0) {
    f.landing -= hours;
    if (f.landing <= 0 && !land(world, f, f.landAt)) {
      f.landing = 0;
      f.landAt = -1;
    }
    return;
  }
  if (!f.route.length) {
    f.progress = 0;
    return;
  }
  f.progress += hours;
  const r = reachOf(world, f);
  while (f.route.length) {
    const next = f.route[0]!;
    const water = !!world.provinceWater[next];
    if (water ? !mayEnterZone(world, r, next) : !dockRight(world, f.owner, next)) {
      f.route = [];
      break;
    }
    const need = (water ? zoneDays(world, f, next) : G.dockDays) * 24;
    if (f.progress < need) break;
    f.progress -= need;
    f.route.shift();
    f.at = next;
    if (water) useSupply(f);
    else {
      dock(world, f);
      f.route = [];
    }
  }
  if (f.route.length) return;
  f.progress = 0;
  f.fleeing = false;
  if (f.landAt >= 0 && f.army >= 0) f.landing = Math.max(1, (world.armies.men[f.army]! / G.menLandedPerDay) * 24);
}

/** A zone sailed uses a zone of supply; ships without any lose a tenth of their crew (NAVY-085, NAVY-088). */
function useSupply(f: NavyFleet): void {
  for (const s of f.ships) {
    if (s.supply > 0) s.supply--;
    else s.crew = Math.floor(s.crew * (1 - C.outOfSupply.crewLossPerZone));
  }
}

/** Putting into port: every ship takes on full supply, the port's food in a friendly port, gold in a neutral one; an army aboard goes ashore (NAVY-082, NAVY-083). */
function dock(world: World, f: NavyFleet): void {
  resupply(world, f);
  if (f.army >= 0) land(world, f, f.at);
}

/** Every ship of a fleet in port takes on full supply, paid in the port's food or in gold (NAVY-082, EXPL-018). */
export function resupply(world: World, f: NavyFleet): void {
  const p = f.at;
  const pays = dockRight(world, f.owner, p);
  let rations = 0;
  let gold = 0;
  for (const s of f.ships) {
    const zones = nv.fullSupply(s.type) - s.supply;
    if (zones <= 0) continue;
    rations += zones * s.crew * C.resupplyFoodPerZone;
    gold += zones * s.crew * C.resupplyGoldPerZone * G.wageScale;
    s.supply = nv.fullSupply(s.type);
  }
  if (pays === "food") world.provinceStore[p] = world.provinceStore[p]! - rations / 1000;
  else if (pays === "gold") {
    const holder = controller(world, p);
    world.nationTreasury[f.owner] = world.nationTreasury[f.owner]! - gold;
    if (holder >= 0) world.nationTreasury[holder] = world.nationTreasury[holder]! + gold;
  }
}

// ---------------------------------------------------------------- sea battles

/** Fleets of realms at war that meet in a zone fight; each running battle fights a round (X-1, NAVY-098, NAVY-118). */
function seaBattles(world: World, news: News[]): void {
  const v = world.navy;
  if (!world.diplomacy.wars.length && !v.battles.length) return;
  const byZone = new Map<number, NavyFleet[]>();
  for (const f of v.fleets) {
    if (!world.provinceWater[f.at] || f.fleeing || !f.ships.length) continue;
    const list = byZone.get(f.at);
    if (list) list.push(f);
    else byZone.set(f.at, [f]);
  }
  for (const [zone, list] of byZone) {
    if (list.length < 2) continue;
    const battle = v.battles.find((b) => b.zone === zone);
    if (battle) {
      for (const f of list) {
        if (f.battle >= 0) continue;
        const side = battle.sides.findIndex((ids) => ids.some((id) => atWar(world, f.owner, fleetById(world, id)!.owner)));
        if (side < 0) continue;
        const other = (1 - side) as 0 | 1;
        battle.sides[other].push(f.id);
        battle.start[other] += fleetStrength(f);
        f.battle = battle.id;
      }
      continue;
    }
    const first = list.find((f) => list.some((g) => atWar(world, f.owner, g.owner)));
    if (!first) continue;
    const foes = list.filter((g) => atWar(world, first.owner, g.owner));
    const friends = list.filter((g) => !atWar(world, first.owner, g.owner) && foes.some((e) => atWar(world, g.owner, e.owner)));
    const b: SeaBattle = { id: ++v.seq, zone, sides: [friends.map((f) => f.id), foes.map((f) => f.id)], start: [0, 0], lost: [0, 0], round: 0, leaders: [first.owner, foes[0]!.owner] };
    friends.forEach((f) => ((f.battle = b.id), (b.start[0] += fleetStrength(f))));
    foes.forEach((f) => ((f.battle = b.id), (b.start[1] += fleetStrength(f))));
    v.battles.push(b);
    const players = [...friends, ...foes].some((f) => f.owner === world.player);
    news.push({ kind: "battle", text: `A sea battle begins in the ${zoneName(world, zone)}: ${nationName(world, b.leaders[0])} against ${nationName(world, b.leaders[1])}.`, nations: [b.leaders[0], b.leaders[1]], province: zone, ...(players ? { begins: true as const } : {}) });
  }
  for (const b of [...v.battles]) fightSeaRound(world, b, news);
}

function sideFleets(world: World, b: SeaBattle, s: 0 | 1): NavyFleet[] {
  return b.sides[s].map((id) => fleetById(world, id)).filter((f): f is NavyFleet => !!f && f.battle === b.id);
}

function fightSeaRound(world: World, b: SeaBattle, news: News[]): void {
  const sides = [sideFleets(world, b, 0), sideFleets(world, b, 1)] as const;
  const ocean = !!world.navy.ocean[b.zone];
  const hits = [0, 1].map((s) =>
    sides[s]!.reduce((t, f) => {
      const might = f.admiral >= 0 ? world.commanders[f.admiral]!.might : 0;
      // Galleys are half as strong on the open ocean; shooting ships ×1.5 in the first round of each day (warfare 11.2).
      const own = f.ships.reduce((x, sh) => x + shipStrength(sh) * (ocean && nv.shipRow(sh.type).galley ? 0.5 : 1) * (world.step === 0 && nv.shipRow(sh.type).shoots ? 1.5 : 1), 0);
      return t + own * (1 + C.admiral.mightHits * might);
    }, 0) * G.roundHits * (1 + G.roundSpread * (world.rng.next() * 2 - 1)),
  );
  for (const s of [0, 1] as const) takeHits(world, b, sides[1 - s]!, hits[s]!, 1 - s);
  b.round++;
  const now = [0, 1].map((s) => sides[s]!.reduce((t, f) => t + fleetStrength(f), 0));
  const broken = [0, 1].map((s) => now[s]! <= b.start[s]! * G.breakShare || now[s]! <= 0);
  if (!broken[0] && !broken[1] && b.round < G.maxRounds) return;
  // The side left weaker for its start is beaten and runs for port; the other holds the sea.
  const loser: 0 | 1 = broken[0] && !broken[1] ? 0 : broken[1] && !broken[0] ? 1 : now[0]! / Math.max(1, b.start[0]!) < now[1]! / Math.max(1, b.start[1]!) ? 0 : 1;
  endSeaBattle(world, b, loser, news);
}

/** Hits land on the line's first ships, the strongest, each taking hits up to its strength and then sinking (D-NAVY-6). */
function takeHits(world: World, b: SeaBattle, fleets: readonly NavyFleet[], hits: number, side: number): void {
  const line: [NavyFleet, NavyShip][] = [];
  for (const f of fleets) for (const s of f.ships) line.push([f, s]);
  line.sort((x, y) => fightsOf(y[1].type) - fightsOf(x[1].type) || x[1].id - y[1].id);
  for (const [, s] of line) {
    if (hits <= 0) break;
    const room = Math.max(1, fightsOf(s.type)) - s.damage;
    const h = Math.min(room, hits);
    s.damage += h;
    hits -= h;
  }
  for (const f of fleets) {
    const room = fleetRoom(f);
    const sunk = f.ships.filter((s) => s.damage >= Math.max(1, fightsOf(s.type)));
    if (!sunk.length) continue;
    f.ships = f.ships.filter((s) => !sunk.includes(s));
    b.lost[side as 0 | 1] += sunk.length;
    for (const s of sunk) if (s.home >= 0) world.navy.away[s.home] = Math.max(0, world.navy.away[s.home]! - s.crew);
    // Soldiers aboard a lost ship drown or are taken (warfare 11.2).
    if (f.army >= 0 && world.armies.alive[f.army]) {
      const left = room > 0 ? fleetRoom(f) / room : 0;
      const a = world.armies;
      a.men[f.army] = Math.floor(a.men[f.army]! * left);
      a.horse[f.army] = Math.floor(a.horse[f.army]! * left);
      if (a.men[f.army]! < 1) {
        a.alive[f.army] = 0;
        f.army = -1;
      }
    }
  }
}

function endSeaBattle(world: World, b: SeaBattle, loser: 0 | 1, news: News[]): void {
  const v = world.navy;
  const winner = (1 - loser) as 0 | 1;
  for (const s of [0, 1] as const) {
    for (const f of sideFleets(world, b, s)) {
      f.battle = -1;
      for (const sh of f.ships) {
        if (sh.damage > 0) sh.hull = Math.min(WRECKED, sh.hull + C.battleHullStepsLost);
        sh.damage = 0;
      }
      if (f.admiral >= 0) {
        const c = world.commanders[f.admiral]!;
        if (s === winner) c.victories++;
        else c.defeats++;
      }
      if (s === loser && f.ships.length) runForPort(world, f);
    }
  }
  v.battles.splice(v.battles.indexOf(b), 1);
  for (const s of [0, 1] as const) noteMoment(world, b.leaders[s], "sea_battle_end", { player_won: s === winner }, b.zone);
  dropEmpty(world);
  const who = (s: 0 | 1) => nationName(world, b.leaders[s]);
  news.push({
    kind: "battle",
    text: `The sea battle in the ${zoneName(world, b.zone)} is over: ${who(winner)} holds the sea. ${who(0)} lost ${b.lost[0]} ship${b.lost[0] === 1 ? "" : "s"}, ${who(1)} ${b.lost[1]}.`,
    nations: [b.leaders[0], b.leaders[1]],
    province: b.zone,
  });
}

/** A fleet leaves the battle it is in (a retreat ordered at any step, X-1). */
function leaveBattle(world: World, f: NavyFleet): void {
  const b = world.navy.battles.find((x) => x.id === f.battle);
  f.battle = -1;
  f.fleeing = true;
  for (const s of f.ships) {
    if (s.damage > 0) s.hull = Math.min(WRECKED, s.hull + C.battleHullStepsLost);
    s.damage = 0;
  }
  if (!b) return;
  const side = b.sides[0].includes(f.id) ? 0 : 1;
  if (!sideFleets(world, b, side).length) endSeaBattle(world, b, side, []);
}

/** A beaten fleet makes for the nearest port of its own or a friend's. */
function runForPort(world: World, f: NavyFleet): void {
  f.fleeing = true;
  f.landAt = -1;
  const plan = planVoyage(world, f, (p) => dockRight(world, f.owner, p) === "food");
  f.route = plan ? plan.path : [];
  f.progress = 0;
}

function dropEmpty(world: World): void {
  const v = world.navy;
  v.fleets = v.fleets.filter((f) => {
    if (f.ships.length) return true;
    if (f.army >= 0 && world.armies.alive[f.army]) world.armies.alive[f.army] = 0;
    // A hired fleet's captain goes with its last ship (F-115).
    if (f.hire && f.hire.captain >= 0) world.commanderOwner[f.hire.captain] = -1;
    return false;
  });
}

// ---------------------------------------------------------------- each month

/** The month's naval steps (naval §9): hulls launched, sailors fed and drifting home, hulls wearing and refitting, ships ageing, and the AI's ships. */
export function monthlyNavy(world: World, news: News[]): void {
  const v = world.navy;
  // Launch finished hulls into the port's fleet.
  v.hulls = v.hulls.filter((h) => {
    if (--h.monthsLeft > 0) return true;
    if (world.provinceOwner[h.province] !== h.owner) return false;
    portFleet(world, h.owner, h.province, h.type).ships.push(newShip(world, h.type, h.crew, h.province));
    if (h.owner === world.player) news.push({ kind: "built", text: `A ${h.type} is launched at ${provinceName(world, h.province)}.`, nations: [h.owner], province: h.province });
    return false;
  });
  // Sailors in port eat from the province store; after 6 months with no ship building for them, a tenth drift home (NAVY-029, NAVY-030).
  for (let p = 0; p < world.provinceCount; p++) {
    const s = v.sailors[p]!;
    if (s <= 0) continue;
    world.provinceStore[p] = world.provinceStore[p]! - (s * C.rationInPort) / 1000;
    v.waited[p] = Math.min(255, v.waited[p]! + 1);
    if (v.waited[p]! > C.driftHome.afterMonths && !v.hulls.some((h) => h.province === p)) {
      const gone = Math.ceil(s * C.driftHome.share);
      v.sailors[p] = s - gone;
      v.away[p] = Math.max(0, v.away[p]! - gone);
    }
  }
  const january = world.date.month === 1;
  for (const f of v.fleets) {
    const atSea = !!world.provinceWater[f.at];
    // Refit in a berth at harbour 2, or at any shipyard; twice as fast with a shipyard (NAVY-061, NAVY-084).
    const refit = !atSea && dockRight(world, f.owner, f.at) === "food" && nv.mayRefit({ harbourStep: harbourStep(world, f.at), shipyardStep: v.shipyard[f.at]!, inBerth: true });
    for (const s of f.ships) {
      if (!atSea) world.provinceStore[f.at] = world.provinceStore[f.at]! - (s.crew * C.rationInPort) / 1000;
      if (refit && s.hull > 0 && s.hull < WRECKED) s.hull = Math.max(0, s.hull - (v.shipyard[f.at]! > 0 ? 2 : 1));
      // A hull wears a step every 6 months at sea and every 3 years in port (NAVY-060, NAVY-076).
      s.wear++;
      if (s.wear >= (atSea ? C.rotMonths["at sea"] : C.rotMonths["in port"])) {
        s.wear = 0;
        s.hull = Math.min(WRECKED, s.hull + 1);
      }
      if (january) s.age++;
    }
  }
  aiNavy(world, news);
}

/** Gold each realm pays its ships and sailors a month (NAVY-076, NAVY-029): upkeep, and wages at sea, in port and waiting. */
export function navyCosts(world: World): Float64Array {
  const v = world.navy;
  const cost = new Float64Array(world.nationCount);
  for (const f of v.fleets) {
    // A hired fleet costs its contract instead, paid to the realm that lent it (F-115).
    if (f.hire) {
      cost[f.owner] = cost[f.owner]! + f.hire.pay;
      if (f.hire.from >= 0) cost[f.hire.from] = cost[f.hire.from]! - f.hire.pay;
      continue;
    }
    const wage = world.provinceWater[f.at] ? C.wageAtSea : C.wageInPort;
    let t = 0;
    for (const s of f.ships) t += nv.shipRow(s.type).upkeep * G.goldScale + s.crew * wage * G.wageScale;
    cost[f.owner] = cost[f.owner]! + t;
  }
  for (const h of v.hulls) cost[h.owner] = cost[h.owner]! + h.crew * C.wageInPort * G.wageScale;
  for (let p = 0; p < world.provinceCount; p++) {
    const s = v.sailors[p]!;
    const o = world.provinceOwner[p]!;
    if (s > 0 && o >= 0) cost[o] = cost[o]! + s * C.wageInPort * G.wageScale;
  }
  return cost;
}

// ---------------------------------------------------------------- the AI

/**
 * The AI's ships, once a month: a realm with ports keeps a few ships (one for
 * every two ports, at most four), mustering their crews first; a fleet with
 * no admiral takes an idle commander; at war, a fleet hunts enemy fleets it
 * outnumbers near by, and at peace a fleet at sea goes home (naval §11).
 */
function aiNavy(world: World, news: News[]): void {
  const v = world.navy;
  const ai = G.ai;
  const ports: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0 && o !== world.player && world.provinceOccupier[p]! < 0 && isPort(world, p)) ports[o]!.push(p);
  }
  const ships = new Int32Array(world.nationCount);
  for (const f of v.fleets) ships[f.owner] = ships[f.owner]! + f.ships.length;
  for (const h of v.hulls) ships[h.owner] = ships[h.owner]! + 1;
  for (let n = 0; n < world.nationCount; n++) {
    const mine = ports[n]!;
    if (!mine.length || world.nationGone[n] || ships[n]! >= Math.min(ai.maxShips, Math.ceil(mine.length / ai.portsPerShip))) continue;
    // The port with the best yard, then the biggest harbour.
    const port = mine.reduce((b, p) => (v.shipyard[p]! * 4 + harbourStep(world, p) > v.shipyard[b]! * 4 + harbourStep(world, b) ? p : b), mine[0]!);
    const type = aiShip(world, n, port);
    if (world.nationTreasury[n]! < ai.reserveGold + shipGold(type)) continue;
    const crew = nv.shipRow(type).crew;
    if (v.sailors[port]! >= crew) buyShip(world, n, port, type, news);
    else if (!v.musters.some((m) => m.province === port)) {
      const want = Math.ceil(crew - v.sailors[port]!);
      if (callable(world, port) >= want) muster(world, n, port, want);
    }
  }
  const idle = new Map<number, number[]>();
  for (const f of v.fleets) {
    // Exploration ships are the exploration AI's (colonies.ts).
    if (f.owner === world.player || f.battle >= 0 || !f.ships.length || allExplorers(f)) continue;
    if (f.admiral < 0) {
      if (!idle.has(f.owner)) idle.set(f.owner, idleCommanders(world, f.owner).filter((c) => !v.fleets.some((x) => x.admiral === c)));
      const c = idle.get(f.owner)!.shift();
      if (c !== undefined) f.admiral = c;
    }
    if (f.route.length || f.army >= 0) continue;
    const enemy = world.diplomacy.wars.length ? huntTarget(world, f) : -1;
    if (enemy >= 0 && f.admiral >= 0) {
      const plan = planVoyage(world, f, (p) => p === enemy);
      if (plan) f.route = plan.path;
    } else if (world.provinceWater[f.at]) runForPort(world, f);
  }
}

/** The ship an AI realm builds in its port: the strongest warship it can, else its sea's trade ship. */
export function aiShip(world: World, n: number, p: number): string {
  let best = localTradeShip(world, p);
  for (const t of SHIP_TYPES) {
    if (!nv.isWarship(t)) continue;
    const row = nv.shipRow(t);
    if (row.unlock && !knows(world, n, row.unlock)) continue;
    const where = buildPlace(world, p, t);
    if (where !== "slipway" && where !== "beach") continue;
    if (fightsOf(t) > fightsOf(best)) best = t;
  }
  return best;
}

/** A zone near by with an enemy fleet this fleet outnumbers, or -1. */
function huntTarget(world: World, f: NavyFleet): number {
  const v = world.navy;
  const mine = fleetStrength(f);
  const foes = new Map<number, number>();
  for (const g of v.fleets) if (world.provinceWater[g.at] && atWar(world, f.owner, g.owner)) foes.set(g.at, (foes.get(g.at) ?? 0) + fleetStrength(g));
  if (!foes.size) return -1;
  const r = reachOf(world, f);
  const seen = new Map<number, number>([[f.at, 0]]);
  const queue = [f.at];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    const d = seen.get(p)!;
    const foe = foes.get(p);
    if (foe !== undefined && mine > foe * G.ai.huntEdge) return p;
    if (d >= G.ai.huntZones) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const q = world.adjList[k]!;
      if (seen.has(q) || !mayEnterZone(world, r, q)) continue;
      seen.set(q, d + 1);
      queue.push(q);
    }
  }
  return -1;
}

// ---------------------------------------------------------------- what the player sees

export interface FleetView {
  id: number;
  owner: number;
  at: number;
  route: number[];
  ships: number;
  strength: number;
  admiral: number;
  /** Army aboard (its id), -1 = none, and its men. */
  army: number;
  men: number;
  landAt: number;
  battle: boolean;
  fleeing: boolean;
  days: number;
  /** Nothing but exploration ships: it may explore (EXPL-069). */
  explorers: boolean;
  /** It needs an admiral to sail (warships or an army aboard). */
  needsAdmiral: boolean;
  /** A hired fleet's name, who offers it (-1 a free fleet) and its pay a month; null for the realm's own (F-115). */
  hired: { name: string; group: string; from: number; pay: number; leaving: boolean } | null;
}

export interface NavyView {
  /** Every fleet, for the map; the player's in full in `mine`. */
  fleets: FleetView[];
  mine: {
    id: number;
    room: number;
    cost: number;
    ships: { id: number; type: string; crew: number; crewNeed: number; hull: string; supply: number; supplyMax: number; fights: number; carries: number; age: number; stores: number; storesMax: number }[];
  }[];
  ports: {
    province: number;
    harbour: number;
    shipyard: number;
    berths: number;
    berthsUsed: number;
    slipways: number;
    sailors: number;
    callable: number;
    mustering: number;
    blockaded: boolean;
    building: { type: string; monthsLeft: number; months: number }[];
    ships: { type: string; gold: number; crew: number; months: number; fights: number; carries: number; family: string; why: string | null }[];
  }[];
  battles: { zone: number; leaders: [number, number]; strength: [number, number]; start: [number, number]; lost: [number, number]; round: number; mine: boolean }[];
  /** Gold the player's ships and sailors cost a month. */
  cost: number;
  musterGoldEach: number;
  /** Armies aboard a fleet (their ids), which stand off the map. */
  aboard: number[];
}

export function navyView(world: World, n: number): NavyView {
  const v = world.navy;
  const fleets: FleetView[] = v.fleets.map((f) => ({
    id: f.id,
    owner: f.owner,
    at: f.at,
    route: f.route.slice(),
    ships: f.ships.length,
    strength: Math.round(fleetStrength(f)),
    admiral: f.admiral,
    army: f.army,
    men: f.army >= 0 ? world.armies.men[f.army]! : 0,
    landAt: f.landAt,
    battle: f.battle >= 0,
    fleeing: f.fleeing,
    days: f.owner === n ? Math.round(voyageDays(world, f) * 10) / 10 : 0,
    explorers: allExplorers(f),
    needsAdmiral: needsAdmiral(f),
    hired: f.hire ? { name: f.hire.name, group: f.hire.group, from: f.hire.from, pay: Math.round(f.hire.pay * 100) / 100, leaving: !!f.hire.leaving } : null,
  }));
  const costs = navyCosts(world);
  const mine = v.fleets
    .filter((f) => f.owner === n)
    .map((f) => {
      const wage = world.provinceWater[f.at] ? C.wageAtSea : C.wageInPort;
      return {
        id: f.id,
        room: fleetRoom(f),
        cost: f.hire ? f.hire.pay : f.ships.reduce((t, s) => t + nv.shipRow(s.type).upkeep * G.goldScale + s.crew * wage * G.wageScale, 0),
        ships: f.ships.map((s) => ({ id: s.id, type: s.type, crew: s.crew, crewNeed: crewNeed(s), hull: HULLS[s.hull]!, supply: s.supply, supplyMax: nv.fullSupply(s.type), fights: fightsOf(s.type), carries: carriesOf(s.type), age: s.age, stores: s.stores ?? 0, storesMax: nv.shipRow(s.type).colonyStores ?? 0 })),
      };
    });
  const ports: NavyView["ports"] = [];
  if (n >= 0) {
    for (let p = 0; p < world.provinceCount; p++) {
      if (world.provinceOwner[p] !== n || !isPort(world, p)) continue;
      const used = v.fleets.reduce((t, f) => t + (f.at === p ? f.ships.reduce((x, s) => x + nv.berthsTaken(s.type), 0) : 0), 0);
      ports.push({
        province: p,
        harbour: harbourStep(world, p),
        shipyard: v.shipyard[p]!,
        berths: berthsOf(world, p),
        berthsUsed: used,
        slipways: slipwaysOf(world, p),
        sailors: Math.floor(v.sailors[p]!),
        callable: callable(world, p),
        mustering: v.musters.reduce((t, m) => t + (m.province === p ? m.sailors : 0), 0),
        blockaded: blockaded(world, p),
        building: v.hulls.filter((h) => h.province === p).map((h) => ({ type: h.type, monthsLeft: h.monthsLeft, months: h.months })),
        ships: SHIP_TYPES.filter((t) => !TRADE_SHIPS.has(t) || t === localTradeShip(world, p)).map((t) => {
          const row = nv.shipRow(t);
          return { type: t, gold: shipGold(t), crew: row.crew, months: row.months, fights: fightsOf(t), carries: carriesOf(t), family: row.family, why: whyNotShip(world, n, p, t) };
        }),
      });
    }
  }
  const aboard = v.fleets.filter((f) => f.army >= 0).map((f) => f.army);
  const battles = v.battles.map((b) => {
    const strength = [0, 1].map((s) => sideFleets(world, b, s as 0 | 1).reduce((t, f) => t + fleetStrength(f), 0)) as [number, number];
    const mineHere = [...b.sides[0], ...b.sides[1]].some((id) => fleetById(world, id)?.owner === n);
    return { zone: b.zone, leaders: b.leaders, strength: strength.map(Math.round) as [number, number], start: b.start.map(Math.round) as [number, number], lost: b.lost, round: b.round, mine: mineHere };
  });
  return { fleets, mine, ports, battles, cost: n >= 0 ? costs[n]! : 0, musterGoldEach: C.muster.bountyPerSailor * G.wageScale, aboard };
}

/** An enemy fleet lies in a sea zone beside the port (NAVY-106). */
export function blockaded(world: World, p: number): boolean {
  const owner = world.provinceOwner[p]!;
  if (owner < 0) return false;
  for (const f of world.navy.fleets) {
    if (!world.provinceWater[f.at] || !atWar(world, owner, f.owner)) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) if (world.adjList[k] === f.at) return true;
  }
  return false;
}

const provinceName = (world: World, p: number) => world.rules.provinces[p]!.name;
const zoneName = (world: World, p: number) => world.rules.provinces[p]!.name;
const nationName = (world: World, n: number) => world.rules.nations[n]?.name ?? "someone";

// ---------------------------------------------------------------- saves

/** The navy as a save holds it: provinces by id, realms by index, the same fleets and hulls. */
export interface SavedNavy {
  ports: Record<string, { shipyard: number; sailors: number; away: number; waited: number }>;
  musters: NavyState["musters"];
  hulls: NavyHull[];
  fleets: NavyFleet[];
  battles: SeaBattle[];
  seq: number;
  forHire?: FreeFleet[];
  hireSeq?: number;
}

export function saveNavy(world: World): SavedNavy {
  const v = world.navy;
  const ports: SavedNavy["ports"] = {};
  for (let p = 0; p < world.provinceCount; p++) {
    if (v.shipyard[p] || v.sailors[p] || v.away[p]) ports[world.provinceIds[p]!] = { shipyard: v.shipyard[p]!, sailors: v.sailors[p]!, away: v.away[p]!, waited: v.waited[p]! };
  }
  return { ports, musters: v.musters, hulls: v.hulls, fleets: v.fleets, battles: v.battles, seq: v.seq, forHire: v.forHire, hireSeq: v.hireSeq };
}

/** Puts a saved navy back, its provinces and realms mapped to this build's; what has no place in it is dropped. */
export function restoreNavy(world: World, saved: SavedNavy, mapN: (old: number) => number, mapP: (old: number) => number, mapC: (old: number) => number): void {
  const v = world.navy;
  v.shipyard.fill(0);
  for (const [id, x] of Object.entries(saved.ports)) {
    const p = world.provinceIndex.get(id);
    if (p === undefined) continue;
    v.shipyard[p] = x.shipyard;
    v.sailors[p] = x.sailors;
    v.away[p] = x.away;
    v.waited[p] = x.waited;
  }
  v.musters = saved.musters.map((m) => ({ ...m, owner: mapN(m.owner), province: mapP(m.province) })).filter((m) => m.owner >= 0 && m.province >= 0);
  v.hulls = saved.hulls.map((h) => ({ ...h, owner: mapN(h.owner), province: mapP(h.province) })).filter((h) => h.owner >= 0 && h.province >= 0);
  v.fleets = saved.fleets
    .map((f) => ({ ...f, owner: mapN(f.owner), at: mapP(f.at), route: f.route.map(mapP), landAt: f.landAt < 0 ? -1 : mapP(f.landAt), admiral: f.admiral < 0 ? -1 : mapC(f.admiral), ships: f.ships.map((s) => ({ ...s, home: s.home < 0 ? -1 : mapP(s.home) })), ...(f.hire ? { hire: { ...f.hire, from: f.hire.from < 0 ? -1 : mapN(f.hire.from), captain: f.hire.captain < 0 ? -1 : mapC(f.hire.captain) } } : {}) }))
    .filter((f) => f.owner >= 0 && f.at >= 0 && !f.route.includes(-1));
  v.battles = saved.battles.map((b) => ({ ...b, zone: mapP(b.zone), leaders: [mapN(b.leaders[0]), mapN(b.leaders[1])] as [number, number] }));
  v.seq = saved.seq;
  v.forHire = (saved.forHire ?? []).map((x) => ({ ...x, at: mapP(x.at) })).filter((x) => x.at >= 0);
  v.hireSeq = saved.hireSeq ?? 0;
}
