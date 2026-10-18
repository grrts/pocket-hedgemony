import type { Ground, MarchDefines, Terrain } from "@ph/rules";
import defines from "../../../../rules/data/defines.json" with { type: "json" };
import config from "../../../../rules/data/domain/troop-movement.json" with { type: "json" };

/** The march block of defines.json, shared with march.ts (days per crossing, days to cross, horse, column). */
export const MARCH: MarchDefines = defines.march as MarchDefines;
/** The new troop-movement keys (design section 13). */
import { daysInMonth } from "../time-and-turns/index.ts";
export const MOVE = config;

export type Road = keyof typeof config.roadFactor;
export type Pace = keyof typeof config.orderFactor;
export type OnTheWay = "keep marching" | "halt when the enemy is seen" | "attack what we see";
export type Hemisphere = "north" | "south";
export type MoverKind = "army" | "fleet" | "trade ship" | "trader";
export type Stance = "attack" | "wait";

export interface Castle {
  owner: string;
  garrison: number;
  /** Food in store and the part kept for a siege (for Refill and go). */
  food?: number;
  siegeReserve?: number;
}

/** A land province or a sea zone: one node of the shared graph. */
export interface Place {
  id: string;
  terrain: Terrain;
  owner?: string | null;
  rebelHeld?: boolean;
  road?: Road;
  river?: "river" | "great river";
  bridge?: boolean;
  /** A named ford from config: a bridge in summer and autumn (D-MOVE-10). */
  ford?: boolean;
  /** Month index (year × 12 + month) until which a flood doubles its river days (D-MOVE-10). */
  floodUntil?: number;
  /** Latitude in degrees, north positive (X-17 frozen rivers). */
  latitude?: number;
  /** Dunes are the province's main tile type (D-MOVE-11). */
  dunes?: boolean;
  /** A mountain province with a historic road, from the config list of passes. */
  pass?: boolean;
  snowPeak?: boolean;
  glacier?: boolean;
  paddies?: boolean;
  hemisphere?: Hemisphere;
  climate?: string;
  castle?: Castle;
  /** Soldiers the province can feed for a month (warfare 6.3); unlimited when absent. */
  forageLimit?: number;
  /** A harbour on a shore tile: joins the province to its sea zone. */
  harbour?: boolean;
  wealth?: number;
}

export interface Commander {
  name: string;
  cunning: number;
  victories?: number;
}

export interface Step {
  to: string;
  /** Step days, with their fraction, fixed when the step starts. */
  days: number;
}

/** Anything that moves by the shared rules (design 11.1). */
export interface Mover {
  id: string;
  kind: MoverKind;
  owner: string;
  place: string;
  /** Places still to go through, in order. */
  route: string[];
  /** Days walked toward the next place; carried into the next month. */
  progress: number;
  step?: Step;
  /** The rest of a route kept after a stop, so one order resumes it. */
  greyed: string[];
  /** Days to stand before walking on (staggered starts, refilling, joining). */
  waitDays?: number;
  /** Fleet carrying it, when an army is cargo. */
  cargoOf?: string;
  /** Room for men aboard (fleets; naval sets it). */
  room?: number;
}

export interface Army extends Mover {
  kind: "army";
  men: number;
  horse: number;
  bombards?: number;
  /** Guns other than bombards and light field guns. */
  heavyGuns?: number;
  lightGuns?: number;
  camels?: boolean;
  wagons?: number;
  food?: number;
  companies?: number;
  commander?: Commander;
  captains?: string[];
  pace: Pace;
  onTheWay: OnTheWay;
  stance?: Stance;
  /** Standing order "retreat if outnumbered": the enemy-to-own ratio that makes it want to go (3 to 2 = 1.5). */
  retreatIfOutnumbered?: number;
  /** The route was given by the player (interception leaves it alone unless Attack on the way). */
  playerRoute?: boolean;
  cameFrom?: string;
  arrivedOn?: number;
  /** Retreating after a lost battle (6.2); `from` is the field it lost. */
  broken?: { refuge: string; fledMen: number; from?: string };
  besieging?: boolean;
  /** The place of the running battle it is in (X-1). */
  inBattle?: string;
  /** Ordered out of its battle; leaves at the start of the next round. */
  retreating?: boolean;
  follow?: { target: string; lastSeen?: string };
  joinOnArrival?: string;
  /** Reserve in days of food, and its full size. */
  reserve?: { days: number; full: number };
  red?: string;
  wintering?: boolean;
  hungry?: boolean;
  haltReason?: StopReason;
  refill?: { at: string; days: number };
  /** A front drawn with W14 Army divisions: its provinces and this army's stretch of it (8). */
  front?: { provinces: string[]; stretch: string[] };
}

export interface Strait {
  a: string;
  b: string;
  /** The sea zone of the strait. */
  zone: string;
}

/** Diplomacy as movement reads it: yes or no per realm pair. */
export interface Relations {
  wars: [string, string][];
  alliances: [string, string][];
  /** [grantor, grantee]. */
  passage: [string, string][];
  /** [overlord, subject]. */
  subjects: [string, string][];
  /** Subjects whose terms feed the overlord's army. */
  subjectFeeds?: string[];
  /** Realms that know W14 Army divisions. */
  armyDivisions?: string[];
  capitals?: Record<string, string>;
  newRegimentsGoTo?: Record<string, string>;
}

export type StopReason = "enemy" | "castle" | "border" | "snow" | "enemy seen" | "lost sight" | "strait closed" | string;

export interface EnterVerdict {
  ok: boolean;
  reason?: "needs ships" | "can't enter" | "snow" | "needs passage" | "guns" | "strait closed" | string;
  realm?: string;
}

/** A mover kind's own rules (11.1); naval and trade plug theirs into MoveWorld.rules. */
export interface MoverRules {
  stepDays(w: MoveWorld, m: Mover, from: string, to: string): number;
  mayEnter(w: MoveWorld, m: Mover, place: string): EnterVerdict;
  stopsAt(w: MoveWorld, m: Mover, place: string, day: number): StopReason | null;
}

export interface MoveWorld {
  /** The date the turn starts on; day 1 when absent (X-18: a turn is 7 days). */
  date: { year: number; month: number; day?: number };
  places: Record<string, Place>;
  /** One graph of land provinces and sea zones (adjStart/adjList in the engine). */
  neighbours: Record<string, string[]>;
  relations: Relations;
  movers: Mover[];
  straits?: Strait[];
  rules?: Partial<Record<Exclude<MoverKind, "army">, MoverRules>>;
  /** What a realm sees of an army (scouting is warfare's): shown men, null when unseen; real size when absent. */
  shown?: Record<string, Record<string, number | null>>;
  /** Armies a realm knows only as a rumour (D-MOVE-17): they count at their shown size but are never intercepted. */
  rumoured?: Record<string, string[]>;
  /** Battles being fought over time (X-1). */
  battles?: import("./day-loop.ts").RunningBattle[];
}

/** The month's real length, 28 to 31 days (X-3). */
export const monthLength = (w: Pick<MoveWorld, "date">): number => daysInMonth(w.date.year, w.date.month);

const pair = (list: [string, string][], a: string, b: string) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export const atWar = (w: MoveWorld, a: string, b: string): boolean => a !== b && pair(w.relations.wars, a, b);
export const allied = (w: MoveWorld, a: string, b: string): boolean => a !== b && pair(w.relations.alliances, a, b);
export const sameSide = (w: MoveWorld, a: string, b: string): boolean => a === b || allied(w, a, b);
export const grantsPassage = (w: MoveWorld, grantor: string, to: string): boolean =>
  w.relations.passage.some(([g, t]) => g === grantor && t === to);
export const isSubjectOf = (w: MoveWorld, subject: string, overlord: string): boolean =>
  w.relations.subjects.some(([o, s]) => o === overlord && s === subject);

/** A castle blocks its owner's enemies and its owner's allies' enemies (5.2). */
export function castleHostile(w: MoveWorld, castleOwner: string, realm: string): boolean {
  if (atWar(w, castleOwner, realm)) return true;
  return w.relations.alliances.some(([x, y]) => (x === castleOwner && atWar(w, y, realm)) || (y === castleOwner && atWar(w, x, realm)));
}

/** A hostile castle with a garrison stands here: it stops every army of `realm` (5.2). */
export function blockingCastle(w: MoveWorld, realm: string, place: string): boolean {
  const c = w.places[place]?.castle;
  return !!c && c.garrison > 0 && castleHostile(w, c.owner, realm);
}

export const isArmy = (m: Mover): m is Army => m.kind === "army";
export const armies = (w: MoveWorld): Army[] => w.movers.filter(isArmy);
export const placeOf = (w: MoveWorld, id: string): Place => {
  const p = w.places[id];
  if (!p) throw new Error(`no place ${id}`);
  return p;
};
export const isWater = (p: Place): boolean => p.terrain === "sea" || p.terrain === "ocean";
export const groundOfPlace = (p: Place): Ground | null => (isWater(p) ? null : (p.terrain as Ground));
export const moverById = (w: MoveWorld, id: string): Mover | undefined => w.movers.find((m) => m.id === id);
export function armyById(w: MoveWorld, id: string): Army {
  const m = moverById(w, id);
  if (!m || !isArmy(m)) throw new Error(`no army ${id}`);
  return m;
}

/** Armies that stand in a place (cargo excluded). */
export const armiesIn = (w: MoveWorld, place: string): Army[] => armies(w).filter((a) => a.place === place && !a.cargoOf);
export const hostileArmies = (w: MoveWorld, a: Army, place: string): Army[] => armiesIn(w, place).filter((b) => atWar(w, a.owner, b.owner));

/** Men of `army` as `realm` sees it, or null when it can't see it (rumours count at their shown size). */
export function shownMen(w: MoveWorld, realm: string, army: Army): number | null {
  if (army.owner === realm) return army.men;
  const v = w.shown?.[realm]?.[army.id];
  return v === undefined ? army.men : v;
}

/** An army made only of horse may Raid (9.1). */
export const horseOnly = (a: Army): boolean => a.men > 0 && a.horse >= a.men;

/** Neighbours in the graph, plus strait crossings for armies (4.4). */
export function neighboursOf(w: MoveWorld, m: Mover, place: string): string[] {
  const out = [...(w.neighbours[place] ?? [])];
  if (m.kind === "army")
    for (const s of w.straits ?? []) {
      if (s.a === place && !out.includes(s.b)) out.push(s.b);
      if (s.b === place && !out.includes(s.a)) out.push(s.a);
    }
  return out;
}

export const straitBetween = (w: MoveWorld, a: string, b: string): Strait | undefined =>
  (w.straits ?? []).find((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a));

/** A new army standing still, with the default route settings. */
export function newArmy(id: string, owner: string, place: string, men: number, horse = 0, extra: Partial<Army> = {}): Army {
  return { id, kind: "army", owner, place, route: [], progress: 0, greyed: [], men, horse, pace: "Normal", onTheWay: "keep marching", ...extra };
}
