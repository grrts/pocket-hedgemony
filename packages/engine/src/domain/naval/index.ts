import config from "../../../../rules/data/domain/naval.json" with { type: "json" };
import { startPorts as ports1444 } from "../../../../rules/src/start.ts";
import { workingShare } from "../province/index.ts";
import { yearsServedBonus, type CommanderSkills } from "../recruiting/index.ts";
import {
  type EnterVerdict,
  type Mover,
  type MoverRules,
  type MoveWorld,
  type MonthLog,
  atWar,
  createMover,
  isWater,
  placeOf,
  planRoute,
  playDays,
  shipMayEnterBase,
  type RoutePlan,
} from "../troop-movement/index.ts";

/**
 * Naval (domain/naval/spec.md): ports, sailors, buying ships, fleets and hulls, admirals, keeping ships,
 * sailing (fleets are troop-movement movers with naval's step-days and may-enter rules), and crews,
 * prizes and pirates at sea. Pure rules on plain data; numbers from naval.json.
 */

export const navalConfig = config;
export type NavalConfig = typeof config;
export const PORTS_1444 = ports1444;

type Known = readonly string[];
const round = (n: number, places = 6): number => Math.round(n * 10 ** places) / 10 ** places;

// ---------------------------------------------------------------- ship types

export type ShipType = keyof typeof config.ships;
export type Family = "trade" | "military" | "exploration" | "small craft";
export interface ShipRow {
  family: string;
  unlock: string | null;
  builtAt: string | number;
  crew: number;
  gold: number;
  timber: number;
  iron?: number;
  months: number;
  upkeep: number;
  hold?: number;
  purse?: number;
  colonyStores?: number;
  galley?: boolean;
  shoots?: boolean;
  steam?: boolean;
  needsExplorationUnlock?: boolean;
  oceanNeeds?: string;
  stepDays: { sea: number; ocean: number | null };
}

export function shipRow(type: string): ShipRow {
  const r = (config.ships as Record<string, ShipRow>)[type];
  if (!r) throw new Error(`no ship type ${type}`);
  return r;
}

/** Supply a ship carries: trade 15, military 15, galleys 6, exploration 60 (NAVY-046, INV-NAVY-9). */
export function fullSupply(type: string): number {
  const r = shipRow(type);
  if (r.galley) return config.supplyByFamily.galley;
  const s = (config.supplyByFamily as Record<string, number>)[r.family];
  if (s === undefined) throw new Error(`D-NAVY-19: no supply for ${r.family}`);
  return s;
}

/** The 1444 trade ship follows the sea: cog, junk or dhow (NAVY-049). */
export function tradeShipFor(sea: string): string {
  const t = (config.tradeShipBySea as Record<string, string>)[sea];
  if (!t) throw new Error(`no trade ship for ${sea}`);
  return t;
}

// ---------------------------------------------------------------- ports (NAVY-001..021)

export interface Hull {
  type: string;
  owner: string;
  crew: number;
  monthsLeft: number;
  on: "slipway" | "harbour" | "waiting";
}

export type ShipState = "at sea" | "in port" | "laid up";
export type HullStep = "sound" | "worn" | "leaking" | "wrecked";
export type Berthing = "berth" | "anchorage" | "drawn up";

export interface Ship {
  id: string;
  type: string;
  owner: string;
  crew: number;
  hull: HullStep;
  supply: number;
  age: number;
  state: ShipState;
  /** Months since the hull last lost a step (rot). */
  monthsSinceStep: number;
  laidUpMonths?: number;
  berth?: Berthing;
  colonyStores?: number;
  setToTrade?: boolean;
  /** Fights at no more than half strength until it docks (NAVY-088). */
  outOfSupply?: boolean;
}

export interface Port {
  province: string;
  owner: string;
  shoreTile: boolean;
  harbourStep: number;
  shipyardStep: number;
  /** Share of the harbour's slots filled (fallow below half). */
  harbourFill?: number;
  shipyardFill?: number;
  shipyardBurned?: boolean;
  timberInReach?: boolean;
  sailorsInPort: number;
  /** Months the sailors in port have waited. */
  waitedMonths?: number;
  hulls: Hull[];
  ships: Ship[];
  lighthouse?: boolean;
  navalBase?: boolean;
  blockaded?: boolean;
  /** Seafolk present: small craft and canoes are built on any shore with them. */
  seafolk?: number;
}

export function newPort(province: string, owner: string, harbourStep: number, shipyardStep = 0, more: Partial<Port> = {}): Port {
  return { province, owner, shoreTile: true, harbourStep, shipyardStep, sailorsInPort: 0, hulls: [], ships: [], ...more };
}

/** A port is a province with a harbour on a shore tile (NAVY-001, INV-NAVY-1). */
export const isPort = (p: Pick<Port, "harbourStep" | "shoreTile">): boolean => p.shoreTile && p.harbourStep > 0;

/** What a coastal province allows at sea: a port or a plain shore (NAVY-002, NAVY-003). */
export function seaUses(p: Pick<Port, "harbourStep" | "shoreTile" | "seafolk">): {
  kind: "port" | "plain shore" | "inland";
  muster: boolean;
  buyShips: boolean;
  berth: boolean;
  crew: boolean;
  smallCraft: boolean;
  fishFromBeach: boolean;
  armyLands: boolean;
} {
  if (!p.shoreTile) return { kind: "inland", muster: false, buyShips: false, berth: false, crew: false, smallCraft: false, fishFromBeach: false, armyLands: false };
  const port = isPort(p);
  return { kind: port ? "port" : "plain shore", muster: port, buyShips: port, berth: port, crew: port, smallCraft: port || (p.seafolk ?? 0) > 0, fishFromBeach: !port && (p.seafolk ?? 0) > 0, armyLands: true };
}

/** Berths by harbour step, halved while the harbour is fallow (NAVY-004, NAVY-018). */
export function berths(p: Pick<Port, "harbourStep" | "harbourFill" | "shoreTile">): number {
  if (!isPort(p)) return 0;
  const n = (config.berthsByHarbourStep as Record<string, number>)[String(Math.min(3, p.harbourStep))] ?? 0;
  return p.harbourFill !== undefined && workingShare(p.harbourFill, 1).fallow ? n / 2 : n;
}

/** Slipways by shipyard step; none while burned, without timber in reach, or under half filled (NAVY-005, NAVY-019, NAVY-040). */
export function slipways(p: Pick<Port, "shipyardStep" | "shipyardBurned" | "timberInReach" | "shipyardFill">): number {
  if (p.shipyardStep <= 0 || p.shipyardBurned || p.timberInReach === false) return 0;
  if (p.shipyardFill !== undefined && workingShare(p.shipyardFill, 1).fallow) return 0;
  return (config.slipwaysByShipyardStep as Record<string, number>)[String(p.shipyardStep)] ?? 0;
}

/** What a harbour step allows: mustering, buying, resupply; from 2 refit and foreign crews; from 3 coaling (NAVY-006). */
export function harbourAllows(step: number): string[] {
  return (config.harbourAllows as Record<string, string[]>)[String(Math.min(3, step))] ?? [];
}

/** The shipyard step a hull needs to be built at; the Arsenal builds as a naval dockyard (NAVY-007, INV-NAVY-5). */
export function shipyardAllows(step: number, type: string): boolean {
  const at = shipRow(type).builtAt;
  const eff = step >= config.arsenalStep ? config.arsenalBuildsAsStep : step;
  if (typeof at === "number") return eff >= at;
  return true;
}

/** Berths a ship takes: one, two for a ship of the line or larger, none drawn up (NAVY-010, NAVY-011, INV-NAVY-2). */
export const berthsTaken = (type: string, drawnUp = false): number => (drawnUp && canDrawUp(type) ? 0 : config.largeShips.includes(type) ? config.berthsPerLargeShip : 1);
export const canDrawUp = (type: string): boolean => config.drawnUp.includes(type);

/** Free berths in a port. */
export function freeBerths(p: Port): number {
  const used = p.ships.filter((s) => s.berth === "berth").reduce((n, s) => n + berthsTaken(s.type), 0);
  return berths(p) - used;
}

/** A ship puts into a port: a berth if one is free, drawn up if it may be, else the anchorage (NAVY-010, NAVY-011, NAVY-080). */
export function putIn(p: Port, s: Ship, drawUp = false): Berthing {
  s.berth = drawUp && canDrawUp(s.type) ? "drawn up" : freeBerths(p) >= berthsTaken(s.type) ? "berth" : "anchorage";
  if (s.state === "at sea") s.state = "in port";
  if (!p.ships.includes(s)) p.ships.push(s);
  return s.berth;
}

/** At the anchorage a ship resupplies but does not refit, rots and faces storms as at sea; drawn up rots at the anchorage rate (NAVY-011, NAVY-080). */
export function anchorageRules(b: Berthing): { resupply: boolean; refit: boolean; rotsAs: "at sea" | "in port"; storms: boolean } {
  if (b === "berth") return { resupply: true, refit: true, rotsAs: "in port", storms: false };
  return { resupply: true, refit: false, rotsAs: "at sea", storms: b === "anchorage" };
}

/** A harbour burned in a raid or sacked falls a step (NAVY-018). */
export function burnHarbour(p: Port): void {
  p.harbourStep = Math.max(0, p.harbourStep - 1);
}

/** A realm builds a harbour on its own shore tile: the province becomes a port (NAVY-017). */
export function buildHarbour(p: Port, realm: string): boolean {
  if (p.owner !== realm || !p.shoreTile) return false;
  p.harbourStep = Math.max(1, p.harbourStep);
  return true;
}

// ---------------------------------------------------------------- the 1444 ports (NAVY-012..016)

export type Tier = keyof typeof config.tierRank;
export interface Town {
  name: string;
  holder: string;
  tier: string;
  shipyard: boolean;
  province?: string | null;
  province_name?: string;
}

/** Places towns into provinces: each province takes the highest tier among its towns and a shipyard if any had one (NAVY-012, NAVY-016). */
export function placePorts(towns: readonly Town[]): { provinces: Record<string, { tier: string; shipyard: boolean; towns: string[]; holder: string; name?: string }>; notPlaced: string[] } {
  const provinces: Record<string, { tier: string; shipyard: boolean; towns: string[]; holder: string; name?: string }> = {};
  const notPlaced: string[] = [];
  const rank = config.tierRank as Record<string, number>;
  for (const t of towns) {
    if (!t.province) {
      notPlaced.push(t.name);
      continue;
    }
    const p = (provinces[t.province] ??= { tier: t.tier, shipyard: false, towns: [], holder: t.holder, ...(t.province_name ? { name: t.province_name } : {}) });
    if ((rank[t.tier] ?? -1) > (rank[p.tier] ?? -1)) {
      p.tier = t.tier;
      p.holder = t.holder;
    }
    p.shipyard ||= t.shipyard;
    p.towns.push(t.name);
  }
  return { provinces, notPlaced };
}

/** Every 1444 town from the data, placed or not. */
export function towns1444(): Town[] {
  return [...ports1444.towns, ...ports1444.not_placed.map((t) => ({ ...t, province: null }))];
}

/**
 * Starting harbour and shipyard of a 1444 port province (NAVY-013, NAVY-014): great and port harbour 2
 * (port 1 when the town is too small), small 1, canoe landing none; a shipyard 1, or 2 where the holder
 * knows S4; Venice the Arsenal.
 */
export function startPort(o: { tier: string; shipyard: boolean; holderKnows: Known; townTooSmall?: boolean; towns?: readonly string[] }): { harbour: number; shipyard: number; extraSeafolk: number; smallCraft: number; smallCraftOnly: boolean } {
  let harbour = (config.startHarbourByTier as Record<string, number>)[o.tier] ?? 0;
  if (o.tier === "port" && o.townTooSmall) harbour = config.smallTownHarbour;
  let shipyard = 0;
  if (o.towns?.includes(config.arsenalTown)) shipyard = config.arsenalStep;
  else if (o.shipyard && harbour > 0) shipyard = o.holderKnows.includes(config.startShipyard.invention) ? config.startShipyard.withInvention : config.startShipyard.marked;
  const landing = o.tier === "landing";
  return { harbour, shipyard, extraSeafolk: landing ? config.canoeLanding.extraSeafolk : 0, smallCraft: landing ? config.canoeLanding.smallCraft : 0, smallCraftOnly: landing };
}

/** The start ports table: every placed province with a harbour (NAVY-015). */
export function startPortsTable(knowsS4: (holder: string) => boolean): { province: string; harbour: number; shipyard: number; ports: string[] }[] {
  const { provinces } = placePorts(towns1444());
  const out: { province: string; harbour: number; shipyard: number; ports: string[] }[] = [];
  for (const [id, p] of Object.entries(provinces)) {
    const s = startPort({ tier: p.tier, shipyard: p.shipyard, holderKnows: knowsS4(p.holder) ? [config.startShipyard.invention] : [], towns: p.towns });
    if (s.harbour > 0) out.push({ province: id, harbour: s.harbour, shipyard: s.shipyard, ports: p.towns });
  }
  return out;
}

// ---------------------------------------------------------------- sailors (NAVY-022..041)

/** Share of a class's fighting-age men a muster may call: seafolk 2 in 3, homeless 1 in 3, others 1 in 20 (NAVY-025). */
export function musterShare(cls: string): number {
  const s = config.musterShare as Record<string, number>;
  return s[cls] ?? s["other"]!;
}

/** Men of each class who can be called to sea (NAVY-025). */
export function callableToSea(peopleByClass: Readonly<Record<string, number>>, alreadyAway = 0): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [cls, n] of Object.entries(peopleByClass)) out[cls] = n * config.fightingAgeShare * musterShare(cls);
  if (alreadyAway > 0) {
    const total = Object.values(out).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(out)) out[k] = Math.max(0, out[k]! - (alreadyAway * out[k]!) / Math.max(1, total));
  }
  return out;
}

export interface SailorGroup {
  home: string;
  count: number;
  byClass: Record<string, number>;
}

export interface SeaProvince {
  id: string;
  people: Record<string, number>;
  /** Empty slots per class left by men away. */
  emptySlots?: Record<string, number>;
  sailorsAway?: number;
  fishSlots?: number;
}

/**
 * Musters sailors one by one from a port province (NAVY-022..026): every callable class gives by its share,
 * whole men by largest remainder, never seafolk first (D-NAVY-29, X-7). Each leaves his class and his slot empty.
 */
export function musterSailors(p: SeaProvince, count: number, port: Port): SailorGroup {
  if (!isPort(port)) throw new Error("only a port musters sailors");
  if (port.shipyardStep <= 0) throw new Error("only a port with a shipyard musters sailors");
  const callable = callableToSea(p.people);
  const total = Object.values(callable).reduce((a, b) => a + b, 0);
  if (count > total + 1e-9) throw new Error(`only ${Math.floor(total)} can be called`);
  const byClass = byShare(callable, count);
  for (const [cls, n] of Object.entries(byClass)) {
    p.people[cls] = (p.people[cls] ?? 0) - n;
    (p.emptySlots ??= {})[cls] = (p.emptySlots[cls] ?? 0) + n;
  }
  p.sailorsAway = (p.sailorsAway ?? 0) + count;
  port.sailorsInPort += count;
  return { home: p.id, count, byClass };
}

/** Splits a whole count over classes by their share, by largest remainder (D-NAVY-29). */
export function byShare(pool: Readonly<Record<string, number>>, count: number): Record<string, number> {
  const total = Object.values(pool).reduce((a, b) => a + b, 0);
  const entries = Object.entries(pool).filter(([, v]) => v > 0);
  if (total <= 0) return {};
  const exact = entries.map(([cls, v]) => ({ cls, x: (count * v) / total }));
  const out: Record<string, number> = {};
  for (const e of exact) out[e.cls] = Math.floor(e.x + 1e-9);
  let left = count - Object.values(out).reduce((a, b) => a + b, 0);
  for (const e of [...exact].sort((a, b) => b.x - Math.floor(b.x + 1e-9) - (a.x - Math.floor(a.x + 1e-9)))) {
    if (left <= 0) break;
    out[e.cls]! += 1;
    left -= 1;
  }
  for (const k of Object.keys(out)) if (out[k] === 0) delete out[k];
  return out;
}

/** Gold bounty for a muster: 0.05 gold a sailor, rounded (D-NAVY-14). */
export const musterBounty = (sailors: number): number => Math.round(sailors * config.muster.bountyPerSailor);

/** Days until a muster is ready in port (D-NAVY-14). */
export const musterDays = (): number => config.muster.days;

/** Share of a province's fish lost while seafolk are at sea: seafolk away ÷ the fishing third of its seafolk (D-NAVY-14). */
export const fishLostShare = (seafolkAway: number, seafolk: number): number =>
  Math.min(1, seafolkAway / Math.max(1, seafolk * config.muster.fishingShareOfSeafolk));

/** A ship that took hits in a battle and stays afloat loses one hull step; hits equal to its strength sink it (D-NAVY-6). */
export function battleHull(h: HullStep, hits: number, strength: number): HullStep | "sinks" {
  if (hits >= strength) return "sinks";
  return hits > 0 ? worse(h, config.battleHullStepsLost) : h;
}

/** Seafolk a sea-power AI keeps at sea: a quarter of those it can call (D-NAVY-25). */
export const seaPowerAtSea = (callableSeafolk: number): number => Math.floor(callableSeafolk * config.ai.seaPowerSeafolkAtSea);

/** Commission cost and pay of an admiral: 10 gold, his wage ×3 while at sea (D-NAVY-15). */
export const admiralPay = (wage: number, atSea: boolean): { commission: number; wage: number } => ({
  commission: config.admiralCommission.gold,
  wage: wage * (atSea ? config.admiralCommission.wageAtSeaMultiplier : 1),
});

/** May junks and dhows sail an ocean zone of their own monsoon seas: with T5 known (D-NAVY-20). */
export const monsoonOcean = (type: string, zone: string, known: Known): boolean =>
  config.monsoon.ships.includes(type) && config.monsoon.seas.includes(zone) && known.includes(config.monsoon.needs);

/** The base province of a pirate coast (D-NAVY-23). */
export const pirateBase = (coast: string): string => (config.pirates.bases as Record<string, string>)[coast] ?? "";

/** A port may hire foreign sailors of a realm whose trade ships call there, up to 100 a year (D-NAVY-22). */
export const mayHireForeignSailors = (theirShipsCall: boolean, hiredThisYear: number, more: number): boolean =>
  theirShipsCall && hiredThisYear + more <= config.foreignCrewsPerPortPerYear;

/** Docking in a subject's or lord's port: food from that province's store, nothing owed (D-NAVY-28). */
export function dockInSubjectPort(store: { food: number }, rations: number): { taken: number; owed: 0 } {
  const taken = Math.min(store.food, rations);
  store.food -= taken;
  return { taken, owed: 0 };
}

/** Burning a pirate base ends its fleet until trade brings it back (NAVY-104). */
export function burnPirateBase(p: PirateFleet, province: string): boolean {
  if (province !== pirateBase(p.coast)) return false;
  p.ended = true;
  p.ships = 0;
  return true;
}

/** Trade brings an ended pirate fleet back with its starting ships at the end of an unhunted season (NAVY-104, D-NAVY-23). */
export function piratesReturn(p: PirateFleet, tradePassed: boolean, hunted: boolean): void {
  if (p.ended && tradePassed && !hunted) {
    p.ended = false;
    p.ships = config.pirates.startShips;
  }
}

/** Provinces that can be picked for a muster from the country card: only those with a harbour (NAVY-024). */
export const musterPicks = (ports: readonly (Pick<Port, "province" | "harbourStep" | "shoreTile">)[]): string[] => ports.filter(isPort).map((p) => p.province);

/** The levy pool shows the sailors already gone, who cannot be levied (NAVY-027). */
export const levyPoolWithSailors = (pool: number, sailorsAway: number): { pool: number; sailorsGone: number } => ({ pool: Math.max(0, pool - sailorsAway), sailorsGone: sailorsAway });

/** A month of sailors waiting in port: 1 ration and 0.1 gold each (foreign or abroad twice), none at a naval base (NAVY-029, NAVY-031). */
export function sailorsInPortMonth(n: number, o: { foreign?: boolean } = {}): { rations: number; wages: number } {
  return { rations: n * config.rationInPort, wages: round(n * config.wageInPort * (o.foreign ? config.foreignWageMultiplier : 1)) };
}

/** Sailors who drift home this month: 1 in 10 once they have waited more than 6 months with no ship building for them (NAVY-030). */
export const driftHome = (n: number, waitedMonths: number, shipBuilding: boolean): number =>
  !shipBuilding && waitedMonths > config.driftHome.afterMonths ? Math.round(n * config.driftHome.share) : 0;

/** A loyal lord with a port musters his own sailors by the same rules; they and his ships stay his, and he brings them when called (NAVY-032). */
export function lordSailors(lord: string, loyal: boolean): { mayMuster: boolean; owner: string; bringsShipsWhenCalled: boolean } {
  return { mayMuster: loyal, owner: lord, bringsShipsWhenCalled: loyal };
}

/** Hiring a foreign crew needs harbour 2 and that people's ships calling there (NAVY-031). */
export const mayHireForeignCrew = (harbourStep: number, theirShipsCall: boolean): boolean => theirShipsCall && harbourStep >= config.foreignCrewsFromHarbourStep;

/** Foreign sailors unpaid leave (NAVY-031). */
export const foreignCrewLeaves = (paid: boolean): boolean => !paid;

/** Prisoners taken into service: 1 in 4 desert at the first port friendly to them (NAVY-033). */
export const prizeCrewDeserters = (n: number): number => Math.round(n * config.prizeCrewDesertion);

/** Pressing after S9: no bounty, *Pressed* for a year (NAVY-034). */
export function pressSailors(known: Known): { ok: true; bounty: 0; grievance: string; years: number } | { ok: false } {
  if (!known.includes(config.pressing.invention)) return { ok: false };
  return { ok: true, bounty: 0, grievance: config.pressing.grievance, years: config.pressing.years };
}

/** How sailors move between ports: by road at levy pace eating on the way, or aboard as passengers (NAVY-035). */
export function moveSailors(way: "by road" | "aboard"): { pace: string; eats: boolean; countsAsMenCarried: boolean } {
  return way === "by road" ? { pace: "levy marching pace", eats: true, countsAsMenCarried: false } : { pace: "the ship's", eats: false, countsAsMenCarried: true };
}

/** A crew paid off walks home: into the emptiest slots of its province, homeless where others filled them (NAVY-036). */
export function payOff(n: number, emptySlots: number): { slots: number; homeless: number } {
  const slots = Math.min(n, Math.max(0, emptySlots));
  return { slots, homeless: n - slots };
}

/** A province whose men served 2 years at sea: +10 % fish and +10 % traders by sea for 10 years (NAVY-037). */
export function seaSkilled(yearsServed: number, year: number): { fish: number; traders: number; until: number } | null {
  const c = config.skilledService;
  return yearsServed >= c.years ? { fish: c.fishBonus, traders: c.tradersBonus, until: year + c.lastsYears } : null;
}

/** A fifth of in-port wages spent in the port as trade (NAVY-038). */
export const wagesSpentAshore = (wages: number): number => wages * config.wagesSpentAshore;

/** A fishery under half filled is fallow and gives no fish (NAVY-039). */
export function fisheryFish(workers: number, slots: number, fish: number): { fallow: boolean; fish: number } {
  const { fallow, share } = workingShare(workers, slots);
  return { fallow, fish: fallow ? 0 : fish * share };
}

/** More than a tenth of seafolk lost at sea in 5 years: fewer births for 10 years and *Lost at sea* for 2 (NAVY-041). */
export function widowsPort(lostIn5Years: number, seafolk: number, year: number): { birthsUntil: number; grievance: string; grievanceUntil: number } | null {
  const w = config.widows;
  return lostIn5Years > seafolk * w.share ? { birthsUntil: year + w.birthsYears, grievance: w.grievance, grievanceUntil: year + w.grievanceYears } : null;
}

// ---------------------------------------------------------------- buying ships (NAVY-042..057)

export interface Buyer {
  name: string;
  known: Known;
  gold: number;
  timber: number;
  explorationUnlock?: boolean;
}

/** Is a ship type unlocked: its S-bough invention, and the exploration unlock for exploration ships (NAVY-045). */
export function unlocked(type: string, b: Pick<Buyer, "known" | "explorationUnlock">): boolean {
  const r = shipRow(type);
  if (r.unlock && !b.known.includes(r.unlock)) return false;
  if (r.needsExplorationUnlock && !b.explorationUnlock) return false;
  return true;
}

export type OrderResult = { ok: true; hull: Hull; gold: number; timber: number } | { ok: false; reason: string };

/**
 * Orders a ship in a port (NAVY-042, NAVY-045, NAVY-051, NAVY-053, NAVY-147, NAVY-149; D-NAVY-33): type
 * unlocked, a shipyard of the step it needs, room in the port's ship queue, gold and timber paid at once. The
 * hull goes on a free slipway with its whole crew when both are there, else it waits in the queue. A blockaded
 * port still builds.
 */
export function orderShip(port: Port, type: string, b: Buyer, o: { abroad?: boolean } = {}): OrderResult {
  const r = shipRow(type);
  if (!unlocked(type, b)) return { ok: false, reason: "not unlocked" };
  // Small craft are the fishery's boats, launched from any shore with seafolk (NAVY-054).
  if (r.family === "small craft") {
    if (!isPort(port) && !(port.seafolk ?? 0)) return { ok: false, reason: "no seafolk" };
    if (port.sailorsInPort < r.crew) return { ok: false, reason: `needs a crew of ${r.crew}` };
    if (b.gold < r.gold || b.timber < r.timber) return { ok: false, reason: "not enough gold or timber" };
    b.gold -= r.gold;
    b.timber -= r.timber;
    port.sailorsInPort -= r.crew;
    const craft: Hull = { type, owner: b.name, crew: r.crew, monthsLeft: r.months, on: "harbour" };
    port.hulls.push(craft);
    return { ok: true, hull: craft, gold: r.gold, timber: r.timber };
  }
  if (!isPort(port)) return { ok: false, reason: "not a port" };
  if (port.shipyardStep <= 0) return { ok: false, reason: "needs a shipyard" };
  if (!shipyardAllows(port.shipyardStep, type)) return { ok: false, reason: `needs shipyard step ${r.builtAt}` };
  if (port.hulls.filter((h) => h.on === "waiting").length >= config.game.queues.shipQueueMax) return { ok: false, reason: "the queue is full" };
  const gold = r.gold * (o.abroad ? config.abroadPriceMultiplier : 1);
  if (b.gold < gold || b.timber < r.timber) return { ok: false, reason: "not enough gold or timber" };
  b.gold -= gold;
  b.timber -= r.timber;
  const hull: Hull = { type, owner: b.name, crew: 0, monthsLeft: r.months, on: "waiting" };
  port.hulls.push(hull);
  layDownWaiting(port);
  return { ok: true, hull, gold, timber: r.timber };
}

/** The first ship waiting in a port's queue goes on a free slipway once its whole crew is in port; those behind it wait their turn (NAVY-149). */
export function layDownWaiting(port: Port): void {
  for (const h of port.hulls) {
    if (h.on !== "waiting") continue;
    const crew = shipRow(h.type).crew;
    if (port.hulls.filter((x) => x.on === "slipway").length >= slipways(port) || port.sailorsInPort < crew) return;
    port.sailorsInPort -= crew;
    h.crew = crew;
    h.on = "slipway";
  }
}

/** The newest type further along a type's upgrade path that `buildable` allows, or null: then the type is no longer offered (NAVY-150). */
export function replacedBy(type: string, buildable: (t: string) => boolean): string | null {
  const path = config.upgrades as unknown as Record<string, string | undefined>;
  let found: string | null = null;
  for (let t = path[type]; t; t = path[t]) if (buildable(t)) found = t;
  return found;
}

/** The batches a muster of `count` sailors joins the port's queue as, each ready muster.days after the one before; null when the queue can't hold them (NAVY-148). */
export function musterBatches(count: number, queued: readonly { day: number }[], today: number): { sailors: number; day: number }[] | null {
  const q = config.game.queues;
  const out: { sailors: number; day: number }[] = [];
  let day = queued.reduce((d, m) => Math.max(d, m.day), today);
  for (let left = count; left > 0; left -= q.musterBatch) out.push({ sailors: Math.min(q.musterBatch, left), day: (day += config.muster.days) });
  return queued.length + out.length > q.musterQueueMax ? null : out;
}

/** Buying a hull abroad: a great port with a shipyard of a realm at peace that agrees, your crew waiting there; 1.5 times the gold (NAVY-053). */
export function orderShipAbroad(port: Port & { tier?: string }, type: string, b: Buyer, o: { atPeace: boolean; ownerAgrees: boolean }): OrderResult {
  if (port.tier !== "great" || port.shipyardStep <= 0) return { ok: false, reason: "not a great port with a shipyard" };
  if (!o.atPeace || !o.ownerAgrees) return { ok: false, reason: "no sale" };
  // The buyer's crew must already wait there: a hull abroad never waits for one.
  if (port.sailorsInPort < shipRow(type).crew) return { ok: false, reason: `needs a crew of ${shipRow(type).crew}` };
  return orderShip(port, type, b, { abroad: true });
}

/** Ships that shoot need their guns (cast or bought as for gun crews) and powder for each voyage (NAVY-050). */
export const shootingNeeds = (type: string): string[] => (shipRow(type).shoots ? ["guns", "powder each voyage"] : []);

/** A month of building: hulls on the slipways advance; finished ships launch and the queue's next ship takes the freed slipway (NAVY-149). */
export function advanceHulls(port: Port, mkId: (h: Hull) => string): Ship[] {
  const launched: Ship[] = [];
  for (const h of port.hulls) if (h.on === "slipway") h.monthsLeft = round(h.monthsLeft - 1);
  for (const h of [...port.hulls]) {
    if (h.on !== "slipway" || h.monthsLeft > 0) continue;
    port.hulls.splice(port.hulls.indexOf(h), 1);
    const s = newShip(mkId(h), h.type, h.owner, h.crew);
    s.state = "in port";
    putIn(port, s);
    launched.push(s);
  }
  layDownWaiting(port);
  return launched;
}

/** A new ship, sound, full supply, age 0. */
export function newShip(id: string, type: string, owner: string, crew = shipRow(type).crew, more: Partial<Ship> = {}): Ship {
  const r = shipRow(type);
  const supply = r.family === "small craft" ? 0 : fullSupply(type);
  return { id, type, owner, crew, hull: "sound", supply, age: 0, state: "at sea", monthsSinceStep: 0, ...(r.colonyStores !== undefined ? { colonyStores: 0 } : {}), ...more };
}

/** Small craft: 6 sailors each, 10 men or a load each, coastal only (ocean with S3), the fishery's boats (NAVY-054, NAVY-056). */
export function smallCraft(count: number, known: Known = []): { sailors: number; carriesMen: number; carriesLoads: number; ocean: boolean; fisheryBoats: boolean; fights: boolean } {
  const c = config.smallCraft;
  return { sailors: count * c.crew, carriesMen: count * c.carriesMen, carriesLoads: count * c.carriesLoads, ocean: known.includes(config.seaInventions.outrigger), fisheryBoats: true, fights: false };
}

/** When an enemy takes a port: unsailed ships in it and the hulls on its slipways become the occupier's (NAVY-052, NAVY-107). */
export function takePort(port: Port, taker: string): { ships: Ship[]; hulls: Hull[] } {
  const ships = port.ships.filter((s) => s.state !== "at sea");
  for (const s of ships) s.owner = taker;
  for (const h of port.hulls) h.owner = taker;
  port.owner = taker;
  return { ships, hulls: [...port.hulls] };
}

/** Other ways to get ships (NAVY-057). */
export function otherShips(way: "capture" | "lord" | "privateer" | "event"): string {
  return {
    capture: "the captured ship",
    lord: "the lord's ships until his service ends",
    privateer: "a ship, crew and commander for a season",
    event: "the ships the event names",
  }[way];
}

// ---------------------------------------------------------------- fleets and hulls (NAVY-058..064)

export interface Admiral {
  name: string;
  might: number;
  cunning: number;
  logistics: number;
  trait?: string;
  style?: string;
  stormFreeYears?: number;
  victories?: number;
}

export interface Fleet {
  id: string;
  owner: string;
  ships: Ship[];
  admiral?: Admiral;
  viceAdmirals: string[];
  /** Zones sailed (for Logistics 3+'s every tenth zone free). */
  zonesSailed: number;
  lord?: string;
}

export const newFleet = (id: string, owner: string, ships: Ship[], admiral?: Admiral): Fleet => ({ id, owner, ships, viceAdmirals: [], zonesSailed: 0, ...(admiral ? { admiral } : {}) });

/** The fleet card: admiral, ships, crew of crew numbers, each ship's crew, hull, supply and age (NAVY-058, NAVY-059). */
export function fleetCard(f: Fleet): { admiral: string | null; ships: number; crew: number; crewNeeded: number; perShip: { crew: number; hull: HullStep; supply: number; age: number }[] } {
  return {
    admiral: f.admiral?.name ?? null,
    ships: f.ships.length,
    crew: f.ships.reduce((n, s) => n + s.crew, 0),
    crewNeeded: f.ships.reduce((n, s) => n + shipRow(s.type).crew, 0),
    perShip: f.ships.map((s) => ({ crew: s.crew, hull: s.hull, supply: s.supply, age: s.age })),
  };
}

const HULLS = config.hullSteps as HullStep[];
/** A hull one step worse. */
export const worse = (h: HullStep, steps = 1): HullStep => HULLS[Math.min(HULLS.length - 1, HULLS.indexOf(h) + steps)]!;

/** Months between hull steps by where the ship is (NAVY-060, NAVY-076, NAVY-080). */
export function rotMonths(s: Ship): number {
  const r = config.rotMonths;
  if (s.state === "laid up") return r["laid up"];
  if (s.state === "at sea" || s.berth === "anchorage" || s.berth === "drawn up") return r.anchorage;
  return r["in port"];
}

/** A month of wear: a hull step when its rot time is up; a ship laid up 10 years is wrecked (NAVY-060, NAVY-077). */
export function monthOfWear(s: Ship): void {
  s.monthsSinceStep += 1;
  if (s.state === "laid up") s.laidUpMonths = (s.laidUpMonths ?? 0) + 1;
  if (s.monthsSinceStep >= rotMonths(s)) {
    s.hull = worse(s.hull);
    s.monthsSinceStep = 0;
  }
  if ((s.laidUpMonths ?? 0) >= config.laidUpWreckYears * 12) s.hull = "wrecked";
}

/** A year: every ship ages by one (NAVY-059). */
export const yearOfAge = (s: Ship): void => {
  s.age += 1;
};

/** Where a ship may refit: a berth at harbour 2 or better, or any shipyard (NAVY-061, NAVY-084). */
export const mayRefit = (o: { harbourStep: number; shipyardStep: number; inBerth: boolean }): boolean => o.shipyardStep > 0 || (o.inBerth && o.harbourStep >= config.refitFromHarbourStep);

/** Months to refit to sound: worn 1, leaking 3, half with a shipyard (NAVY-061). */
export function refitMonths(h: HullStep, shipyard: boolean): number {
  const base = h === "worn" ? config.refitMonths.worn : h === "leaking" ? config.refitMonths.leaking : h === "sound" ? 0 : Infinity;
  return base * (shipyard ? config.refitMonths.shipyardFactor : 1);
}

/** Refit cost: the upkeep in friendly ports, 1.5 times elsewhere (NAVY-084). */
export const refitCost = (upkeep: number, friendly: boolean): number => upkeep * (friendly ? 1 : config.refitCostForeignMultiplier);

/** What a hull step means at sea (NAVY-062). */
export function hullAtSea(h: HullStep): { daysFactor: number; mayOnlyLimpToPort: boolean; onStorm: HullStep | "sinks" } {
  if (h === "sound" || h === "worn") return { daysFactor: 1, mayOnlyLimpToPort: false, onStorm: h };
  if (h === "leaking") return { daysFactor: config.leakingDaysMultiplier, mayOnlyLimpToPort: false, onStorm: "wrecked" };
  return { daysFactor: config.leakingDaysMultiplier, mayOnlyLimpToPort: true, onStorm: "sinks" };
}

/** Share of its crew number aboard. */
export const crewShare = (s: Pick<Ship, "type" | "crew">): number => Math.min(1, s.crew / shipRow(s.type).crew);

/** A ship's fighting strength share: its crew share, at most half when out of supply (NAVY-063, NAVY-088, NAVY-098). */
export const fightingShare = (s: Ship): number => Math.min(crewShare(s), s.outOfSupply || s.supply <= 0 ? config.outOfSupply.strengthCap : 1);

/** A ship below a quarter of its crew cannot leave port (NAVY-064, INV-NAVY-11). */
export const mayLeavePort = (s: Pick<Ship, "type" | "crew" | "state">): boolean => s.state !== "laid up" && crewShare(s) >= config.minCrewToSail;

// ---------------------------------------------------------------- admirals (NAVY-065..075)

export const isWarship = (type: string): boolean => {
  const r = shipRow(type);
  return r.family === "military";
};

/** May a fleet sail: warships or troop carriers need an admiral, trade ships none; crews at least a quarter (NAVY-064..066, INV-NAVY-6). */
export function maySail(f: Fleet, o: { carryingArmy?: boolean } = {}): { ok: boolean; reason?: string } {
  const needsAdmiral = f.ships.some((s) => isWarship(s.type)) || (!!o.carryingArmy && f.ships.length > 0);
  if (needsAdmiral && !f.admiral) return { ok: false, reason: "no admiral" };
  const short = f.ships.find((s) => !mayLeavePort(s));
  if (short) return { ok: false, reason: "crew under a quarter" };
  return { ok: true };
}

/** Ships with no admiral still defend their port in a sea battle in the port's own zone (NAVY-065). */
export const defendsPort = (s: Ship, battleZone: string, portZone: string): boolean => s.state !== "laid up" && battleZone === portZone;

/** Starting skills and trait of an admiral by official type, years served in a port province counting double (NAVY-073; the years steps are recruiting 7.1's). */
export function commissionAdmiral(name: string, type: string, o: { yearsServed?: number; inPortProvince?: boolean; seaStyle?: string } = {}): { admiral: Admiral; traitOffered: string; countedYears: number } {
  if (config.admiralCommission.notCommissioned.includes(type)) throw new Error(`a ${type} cannot be commissioned as admiral (D-NAVY-24)`);
  const row = (config.admiralsByOfficial as Record<string, { might: number; cunning: number; logistics: number; trait: string }>)[type];
  if (!row) throw new Error(`no admiral row for ${type}`);
  const years = (o.yearsServed ?? 0) * (o.inPortProvince ? config.admiral.portYearsMultiplier : 1);
  const s: CommanderSkills = yearsServedBonus({ might: row.might, cunning: row.cunning, logistics: row.logistics }, years);
  const admiral: Admiral = { name, ...s, ...(o.seaStyle !== undefined ? { style: o.seaStyle } : {}) };
  return { admiral, traitOffered: row.trait, countedYears: years };
}

/** Up to two vice-admirals in a large fleet (NAVY-068). */
export function nameViceAdmirals(f: Fleet, names: readonly string[]): boolean {
  if (names.length > config.admiral.viceAdmiralsMax) return false;
  f.viceAdmirals = [...names];
  return true;
}

/** Sea-skill effects (NAVY-069..071). */
export const admiralEffects = (a: Pick<Admiral, "might" | "cunning" | "logistics">) => ({
  hits: a.might * config.admiral.mightHits,
  boarding: a.might * config.admiral.mightBoarding,
  daysCut: a.cunning * config.admiral.cunningDays,
  sightZones: a.cunning > 0 ? config.admiral.cunningSightZones : 0,
  stormCut: a.logistics * config.admiral.logisticsStorm,
  everyTenthZoneFree: a.logistics >= config.admiral.supplyFreeFromLogistics,
});

/** A year at sea counted: storm-free years add up, a ship lost to a storm starts the count again (NAVY-072). */
export function admiralYearAtSea(a: Admiral, lostToStorm: boolean): void {
  a.stormFreeYears = lostToStorm ? 0 : (a.stormFreeYears ?? 0) + 1;
}

/** The year ends: 3 storm-free years at sea teach +1 Logistics (NAVY-072). */
export function admiralYearEnds(a: Admiral): void {
  if ((a.stormFreeYears ?? 0) >= config.admiral.logisticsGainYears) {
    a.logistics += 1;
    a.stormFreeYears = 0;
  }
}

/** A sea victory counts as a victory for the warfare rules (NAVY-072). */
export const seaVictory = (a: Admiral): void => {
  a.victories = (a.victories ?? 0) + 1;
};

/** Who else may lead a fleet, and the catch (NAVY-075). */
export function otherFleetLeader(leader: "the ruler" | "an heir" | "a proud lord" | "a lord" | "a hired privateer" | "an elder" | "a chief"): string {
  return {
    "the ruler": "if he is lost at sea or captured the country faces a succession crisis",
    "an heir": "if he is lost at sea or captured the country faces a succession crisis",
    "a proud lord": "he will not sail under an official admiral",
    "a lord": "he leads his own ships, or the realm's if he is loyal",
    "a hired privateer": "he leaves when unpaid and may raid neutral shipping and drag his employer into a war",
    "an elder": "the fleet is led as by any lord",
    "a chief": "the fleet is led as by any lord",
  }[leader];
}

// ---------------------------------------------------------------- keeping ships (NAVY-076..088)

/** A month of a ship's costs by state: wages, upkeep and rations from the port's province (NAVY-009, NAVY-076). */
export function shipMonth(s: Pick<Ship, "type" | "crew" | "state">, o: { navalBase?: boolean } = {}): { wages: number; upkeep: number; rations: number } {
  const up = shipRow(s.type).upkeep;
  if (s.state === "laid up") return { wages: 0, upkeep: round(up * config.laidUpUpkeepShare), rations: 0 };
  if (s.state === "at sea") return { wages: round(s.crew * config.wageAtSea), upkeep: up, rations: 0 };
  return { wages: o.navalBase ? 0 : round(s.crew * config.wageInPort), upkeep: up, rations: s.crew * config.rationInPort };
}

/** Lays a ship up: its crew is released and walks home (NAVY-078, INV-NAVY-10). */
export function layUp(s: Ship): number {
  const crew = s.crew;
  s.crew = 0;
  s.state = "laid up";
  s.laidUpMonths = 0;
  s.monthsSinceStep = 0;
  return crew;
}

/** Fits a laid-up ship out: its crew must wait as sailors in that port; ready after a month (NAVY-079). */
export function fitOut(s: Ship, port: Port): { ok: true; months: number } | { ok: false; reason: string } {
  const need = shipRow(s.type).crew;
  if (port.sailorsInPort < need) return { ok: false, reason: `needs ${need} sailors in port` };
  port.sailorsInPort -= need;
  s.crew = need;
  s.state = "in port";
  delete s.laidUpMonths;
  return { ok: true, months: config.fitOutMonths };
}

export type Relation = "the realm" | "a lord" | "a subject" | "an ally" | "at peace" | "a rival" | "at war";

/** Docking rights: own, lords', subjects', allies' ports for food; others at peace and not rivals for gold; none at war or rival (NAVY-081). */
export function dockingRight(r: Relation): "food" | "gold" | null {
  if (r === "the realm" || r === "a lord" || r === "a subject" || r === "an ally") return "food";
  if (r === "at peace") return "gold";
  return null;
}

/**
 * Resupply in one day, as far as the province's food goes (NAVY-082, NAVY-083): crew ÷ 10 rations per zone in
 * friendly ports, crew ÷ 100 gold to the port's country per zone in neutral ones.
 */
export function resupply(s: Ship, pay: "food" | "gold", food = Infinity): { zones: number; rations: number; gold: number; days: number } {
  const want = fullSupply(s.type) - s.supply;
  if (pay === "gold") {
    s.supply += want;
    delete s.outOfSupply;
    return { zones: want, rations: 0, gold: round(want * s.crew * config.resupplyGoldPerZone), days: 1 };
  }
  const per = s.crew * config.resupplyFoodPerZone;
  const zones = per > 0 ? Math.min(want, Math.floor(food / per + 1e-9)) : want;
  s.supply += zones;
  if (zones > 0) delete s.outOfSupply;
  return { zones, rations: round(zones * per), gold: 0, days: 1 };
}

/** Colony stores load at the resupply cost and stay apart from supply (NAVY-087). */
export function loadColonyStores(s: Ship, rations: number, pay: "food" | "gold"): { paid: string; amount: number } {
  const cap = shipRow(s.type).colonyStores ?? 0;
  const n = Math.min(cap - (s.colonyStores ?? 0), rations);
  s.colonyStores = (s.colonyStores ?? 0) + n;
  return pay === "food" ? { paid: "food from the province", amount: n } : { paid: "gold to the port's country", amount: n * config.resupplyGoldPerZone };
}

/**
 * Supply used for one zone sailed (NAVY-085, NAVY-088): 1 a zone (Logistics 3+ sails every tenth zone free);
 * with none left a tenth of the crew is lost and the ship fights at half strength until it docks.
 */
export function useSupply(f: Fleet, zones = 1): void {
  const free = !!f.admiral && admiralEffects(f.admiral).everyTenthZoneFree;
  for (let i = 0; i < zones; i++) {
    f.zonesSailed += 1;
    if (free && f.zonesSailed % config.admiral.supplyFreeEveryZones === 0) continue;
    for (const s of f.ships) {
      if (s.supply > 0) s.supply -= 1;
      else {
        s.crew = Math.round(s.crew * (1 - config.outOfSupply.crewLossPerZone));
        s.outOfSupply = true;
      }
    }
  }
}

/** Holding one zone (blockading, hunting, waiting) uses 1 supply every step-days (NAVY-085). */
export function holdZone(f: Fleet, days: number, stepDays: number): void {
  useSupply(f, Math.floor(days / stepDays + 1e-9));
}

// ---------------------------------------------------------------- sailing (NAVY-089..097)

export type Wind = "with" | "against" | "none";

/** What naval knows of the sea for the movers (fleets) it plugs into troop-movement. */
export interface Sea {
  fleets: Record<string, Fleet>;
  /** Inventions each realm knows. */
  known: Record<string, Known>;
  /** Ocean zones' distance in zones from a coast. */
  coastDistance?: Record<string, number>;
  frozen?: string[];
  /** Zones each realm has not charted. */
  uncharted?: Record<string, string[]>;
  /** The month's wind for a fleet's course through a zone. */
  wind?: Record<string, Wind>;
  /** Fleets carrying an army aboard small craft. */
  armyAboard?: string[];
}

const waterOf = (w: MoveWorld, id: string): "sea" | "ocean" => (placeOf(w, id).terrain === "ocean" ? "ocean" : "sea");

/** Days for one ship to cross a zone, before the admiral and the wind (NAVY-062, NAVY-063, NAVY-090). */
export function shipStepDays(s: Ship, water: "sea" | "ocean"): number {
  const d = shipRow(s.type).stepDays[water];
  if (d === null) return Infinity;
  return d * hullAtSea(s.hull).daysFactor / crewShare(s);
}

/** Days a fleet needs for one zone: the slowest ship, the wind (not for steamships), the admiral's Cunning (NAVY-070, NAVY-090, NAVY-093, INV-NAVY-7). */
export function fleetStepDays(f: Fleet, water: "sea" | "ocean", wind: Wind = "none"): number {
  let days = 0;
  for (const s of f.ships) {
    const w = shipRow(s.type).steam ? 1 : config.windMultiplier[wind];
    days = Math.max(days, shipStepDays(s, water) * w);
  }
  return round(days * (1 - admiralEffects(f.admiral ?? { might: 0, cunning: 0, logistics: 0 }).daysCut));
}

const enemyWarFleetIn = (w: MoveWorld, sea: Sea, owner: string, zone: string): boolean =>
  w.movers.some((m) => m.kind === "fleet" && m.place === zone && atWar(w, m.owner, owner) && (sea.fleets[m.id]?.ships ?? []).some((s) => isWarship(s.type)));

/** May a fleet enter a place (NAVY-055, NAVY-086, NAVY-089, NAVY-091, NAVY-092, NAVY-095, NAVY-097, INV-NAVY-8). */
export function fleetMayEnter(w: MoveWorld, sea: Sea, f: Fleet, place: string): EnterVerdict {
  const p = placeOf(w, place);
  if (!isWater(p)) return shipMayEnterBase(w, place);
  if (sea.frozen?.includes(place)) return { ok: false, reason: "ice" };
  if ((sea.uncharted?.[f.owner] ?? []).includes(place) && !f.ships.every((s) => shipRow(s.type).family === "exploration")) return { ok: false, reason: "uncharted" };
  const small = f.ships.some((s) => shipRow(s.type).family === "small craft") || (sea.armyAboard ?? []).includes(f.id);
  if (small && enemyWarFleetIn(w, sea, f.owner, place)) return { ok: false, reason: "enemy war fleet" };
  if (p.terrain === "ocean") {
    const known = sea.known[f.owner] ?? [];
    for (const s of f.ships) {
      const r = shipRow(s.type);
      if (r.stepDays.ocean === null) return { ok: false, reason: "galleys stay off the ocean" };
      if (monsoonOcean(s.type, place, known)) continue;
      if ((sea.armyAboard ?? []).includes(f.id) && small) return { ok: false, reason: "coastal only" };
      if (r.oceanNeeds) {
        if (!known.includes(r.oceanNeeds)) return { ok: false, reason: "coastal only" };
        continue;
      }
      if (known.includes(config.seaInventions.ocean)) continue;
      if (known.includes(config.seaInventions.compass) && (sea.coastDistance?.[place] ?? Infinity) <= config.oceanReachWithS1) continue;
      return { ok: false, reason: "ocean closed" };
    }
  }
  return { ok: true };
}

/** Naval's mover rules for fleets, plugged into the shared planner and day loop (NAVY-089, NAVY-114). */
export function fleetRules(sea: Sea): MoverRules {
  const fleetOf = (m: Mover): Fleet => {
    const f = sea.fleets[m.id];
    if (!f) throw new Error(`no fleet ${m.id}`);
    return f;
  };
  return {
    stepDays: (w, m, _from, to) => fleetStepDays(fleetOf(m), waterOf(w, to), sea.wind?.[to] ?? "none"),
    mayEnter: (w, m, place) => fleetMayEnter(w, sea, fleetOf(m), place),
    stopsAt: () => null,
  };
}

/** A fleet as a mover in the shared world. */
export function fleetMover(f: Fleet, place: string): Mover {
  return createMover(f.id, "fleet", f.owner, place);
}

/** Plans a fleet's route with the shared planner and its own rules. */
export function planVoyage(w: MoveWorld, sea: Sea, f: Fleet, to: string): RoutePlan {
  w.rules = { ...(w.rules ?? {}), fleet: fleetRules(sea) };
  const m = w.movers.find((x) => x.id === f.id);
  if (!m) throw new Error(`fleet ${f.id} is not on the map`);
  return planRoute(w, m, to);
}

/**
 * Sails a fleet along a planned route in the day loop for `days` days, using supply per zone entered (NAVY-085, NAVY-089).
 */
export function sail(w: MoveWorld, sea: Sea, f: Fleet, to: string, days: number): { plan: RoutePlan; log: MonthLog } {
  const plan = planVoyage(w, sea, f, to);
  const m = w.movers.find((x) => x.id === f.id)!;
  if (plan.end !== "arrives") return { plan, log: playDays(w, 1, 0) };
  const ok = maySail(f, { carryingArmy: (sea.armyAboard ?? []).includes(f.id) });
  if (!ok.ok) throw new Error(ok.reason);
  m.route = [...plan.path];
  for (const s of f.ships) s.state = "at sea";
  const log = playDays(w, 1, days);
  for (const e of log.entered) if (e.mover === f.id && isWater(placeOf(w, e.place))) useSupply(f, 1);
  return { plan, log };
}

/** Is a sea zone frozen this month: the northern zones of config, December to March (X-17, provisional until world-map's lookup). */
export const isFrozen = (zone: string, month: number): boolean => config.frozenSeas.months.includes(month) && config.frozenSeas.zones.includes(zone);

/** The frozen zones of a month, for `Sea.frozen` and the planner (X-17, NAVY-125). */
export const frozenZones = (month: number): string[] => (config.frozenSeas.months.includes(month) ? [...config.frozenSeas.zones] : []);

/** A port on a frozen zone can neither launch nor take in ships that month (X-17, NAVY-125). */
export const portIceBound = (portZone: string, month: number): boolean => isFrozen(portZone, month);

/** A fleet caught in a zone that freezes is iced into the nearest port (NAVY-095). */
export function iceIn(w: MoveWorld, sea: Sea, f: Fleet): string | null {
  const m = w.movers.find((x) => x.id === f.id);
  if (!m || !sea.frozen?.includes(m.place)) return null;
  const seen = new Set([m.place]);
  let frontier = [m.place];
  while (frontier.length) {
    const next: string[] = [];
    for (const p of frontier)
      for (const q of w.neighbours[p] ?? []) {
        if (seen.has(q)) continue;
        seen.add(q);
        if (!isWater(placeOf(w, q)) && placeOf(w, q).harbour) {
          m.place = q;
          m.route = [];
          return q;
        }
        if (isWater(placeOf(w, q))) next.push(q);
      }
    frontier = next;
  }
  return null;
}

/** Storm-loss factor: −10 % per Logistics point, halved by a lighthouse in the zone (NAVY-008, NAVY-071, NAVY-094); the base loss is warfare's. */
export const stormLossFactor = (o: { logistics?: number; lighthouse?: boolean } = {}): number =>
  Math.max(0, 1 - (o.logistics ?? 0) * config.admiral.logisticsStorm) * (o.lighthouse ? config.lighthouseStormFactor : 1);

/** The room an army takes aboard: a man 1, a horse 4, a gun 20, its food reserve as loads (NAVY-096). */
export const armyRoom = (men: number, horses: number, guns: number): { men: number; foodAsLoads: true } => ({ men: men + horses * config.room.horse + guns * config.room.gun, foodAsLoads: true });

/** May a fleet dock at a place: a port with a harbour, and a docking right (NAVY-081). */
export function mayDock(port: Pick<Port, "harbourStep" | "shoreTile"> | null, r: Relation): { ok: boolean; pays?: "food" | "gold"; reason?: string } {
  if (!port || !isPort(port)) return { ok: false, reason: "no port" };
  const pays = dockingRight(r);
  return pays ? { ok: true, pays } : { ok: false, reason: "no docking right" };
}

// ---------------------------------------------------------------- at sea against an enemy (NAVY-098..107)

/** Boarding: a Close order or a galley ramming; soldiers fight by the land bell rules on one sector; the ship is taken if its defenders break (NAVY-099). */
export const boarding = (trigger: "close order" | "galley rams") => ({ trigger, sectors: 1, rules: "land bell", takenIf: "defenders break" });

/** A taken or struck ship is the winner's with a prize crew of at least a quarter of its crew, else burned (NAVY-100). */
export function putPrizeCrew(s: Ship, crew: number, winner: string): "captured" | "burned" {
  if (crew + 1e-9 < prizeCrewNeeded(shipRow(s.type).crew)) {
    s.hull = "wrecked";
    return "burned";
  }
  s.owner = winner;
  s.crew = crew;
  return "captured";
}

/** Prize crew needed: a quarter of the ship's crew (NAVY-100). */
export const prizeCrewNeeded = (crew: number): number => crew * config.prizeCrewShare;

/** Of a sunk ship's crew a third survive as prisoners or swim ashore, the rest drown (NAVY-101). */
export function sunkCrew(crew: number): { survivors: number; drowned: number } {
  const survivors = Math.round(crew * config.sunkSurvivorsShare);
  return { survivors, drowned: crew - survivors };
}

export interface PirateFleet {
  coast: string;
  ships: number;
  homeZones: string[];
  owner: string | null;
  ended?: boolean;
}

/** A pirate fleet for a pirate coast in config (NAVY-102). */
export function pirateFleet(coast: string, ships: number, homeZones: string[]): PirateFleet {
  if (!(coast in config.pirateCoasts)) throw new Error(`no pirate coast ${coast}`);
  return { coast, ships, homeZones, owner: null };
}

/** Zones a pirate fleet hunts: its home zones and one zone beyond (NAVY-102). */
export function pirateHunt(p: PirateFleet, neighbours: Readonly<Record<string, string[]>>): string[] {
  const out = new Set(p.homeZones);
  let frontier = [...p.homeZones];
  for (let i = 0; i < config.pirateReach; i++) {
    const next: string[] = [];
    for (const z of frontier) for (const q of neighbours[z] ?? []) if (!out.has(q)) (out.add(q), next.push(q));
    frontier = next;
  }
  return [...out];
}

/** A season ends: a pirate fleet grows by a ship where trade passed and no warship hunted (NAVY-103). */
export function pirateSeason(p: PirateFleet, tradePassed: boolean, hunted: boolean): void {
  if (tradePassed && !hunted && !p.ended) p.ships += config.pirateGrowthPerSeason;
}

/** Ships taken or sunk leave a pirate fleet (NAVY-103). */
export const piratesLost = (p: PirateFleet, n: number): void => {
  p.ships = Math.max(0, p.ships - n);
};

/** A pirate people that is a catalogue record may be hired or belong to a lord (NAVY-105). */
export function hirePirates(p: PirateFleet, by: string): boolean {
  const c = (config.pirateCoasts as Record<string, { catalogueRecord: boolean }>)[p.coast];
  if (!c?.catalogueRecord) return false;
  p.owner = by;
  return true;
}

/** An enemy fleet in a port's zone blocks the port: it still musters and builds, but nothing leaves without a battle (NAVY-051, NAVY-106). */
export function blockade(w: MoveWorld, port: Port, portZone: string): boolean {
  port.blockaded = w.movers.some((m) => m.kind === "fleet" && m.place === portZone && atWar(w, m.owner, port.owner));
  return port.blockaded;
}
export const leaveBlockadedPort = (port: Port): "sails" | "needs a sea battle" => (port.blockaded ? "needs a sea battle" : "sails");

// ---------------------------------------------------------------- AI and the phone (NAVY-109..116)

/** A sea power AI: warships when a rival's fleet grows, else trade ships first (NAVY-109). */
export const seaPowerBuys = (rivalFleetGrew: boolean): "warships" | "trade ships first" => (rivalFleetGrew ? "warships" : "trade ships first");

/** A land power AI lays its ships up in peace and fits them out when a war starts across water (NAVY-110). */
export const landPowerShips = (atWarAcrossWater: boolean): "lay up" | "fit out" => (atWarAcrossWater ? "fit out" : "lay up");

/** The AI keeps a customs officer in each great port it holds (NAVY-111). */
export function aiPortOfficials(ports: readonly { province: string; tier: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of ports) if (p.tier === "great") out[p.province] = "customs officer";
  return out;
}

/** No fleet AI more than 10 zones from the player's realm and ports in peace: the voyage resolves as a day count (NAVY-113). */
export const runsFleetAi = (zonesFromPlayer: number, atWarWithPlayer: boolean): boolean => atWarWithPlayer || zonesFromPlayer <= config.ai.fleetAiRadiusZones;

/** A cache of sea paths per (ship class, research step, month), dropped when research or a port changes (NAVY-114). */
export function pathCache<T>() {
  const paths = new Map<string, T>();
  let computed = 0;
  return {
    get(shipClass: string, researchStep: string, month: number, compute: () => T): T {
      const k = `${shipClass}|${researchStep}|${month}`;
      if (!paths.has(k)) {
        paths.set(k, compute());
        computed += 1;
      }
      return paths.get(k)!;
    },
    /** Research learned or a port changed: every path is recomputed on next use. */
    invalidate(): void {
      paths.clear();
    },
    get computed(): number {
      return computed;
    },
  };
}

/** The monthly update of a port: wages and food of sailors in port and crewed ships, drift home, hulls, wear (NAVY-115). */
export function portMonth(port: Port, o: { shipBuilding?: boolean; mkId?: (h: Hull) => string } = {}): { rations: number; wages: number; drifted: number; launched: Ship[] } {
  const sailors = sailorsInPortMonth(port.sailorsInPort);
  let rations = sailors.rations;
  let wages = sailors.wages;
  port.waitedMonths = (port.waitedMonths ?? 0) + 1;
  const drifted = driftHome(port.sailorsInPort, port.waitedMonths, o.shipBuilding ?? port.hulls.length > 0);
  port.sailorsInPort -= drifted;
  for (const s of port.ships) {
    const c = shipMonth(s, { navalBase: !!port.navalBase });
    rations += c.rations;
    wages += c.wages;
    monthOfWear(s);
  }
  const launched = advanceHulls(port, o.mkId ?? ((h) => `${h.type}-${port.province}`));
  return { rations, wages: round(wages), drifted, launched };
}

/** A sea battle is fought on at most 3 sectors (NAVY-116). */
export const seaBattleSectors = (wanted: number): number => Math.min(wanted, config.seaBattleMaxSectors);

// ---------------------------------------------------------------- fleets at sea (NAVY-147..)

/** A fleet leader's post (feedback 124): admiral for war, commodore for trade, viceroy for exploration and colonies. */
export type Post = "admiral" | "commodore" | "viceroy";
export const POSTS: readonly Post[] = ["admiral", "commodore", "viceroy"];
export interface PostRow {
  name: string;
  does: string;
  mightShare: number;
  tradeGain?: number;
  prizeFactor?: number;
  chartRings?: number;
  colonyStart?: number;
}
export const postRow = (post: Post): PostRow => (config.admiralPosts as unknown as Record<Post, PostRow>)[post];
export const isPost = (x: unknown): x is Post => typeof x === "string" && (POSTS as readonly string[]).includes(x);

/** The post that fits a fleet when a leader is appointed: trade ships only a commodore, exploration ships only a viceroy, else an admiral (NAVY-153). */
export function fittingPost(types: readonly string[]): Post {
  if (types.length && types.every((t) => shipRow(t).family === "trade")) return "commodore";
  if (types.length && types.every((t) => shipRow(t).family === "exploration")) return "viceroy";
  return "admiral";
}

/** The Might a leader brings to a sea battle: in full as admiral, a share in other posts (NAVY-152). */
export const battleMight = (might: number, post: Post): number => might * postRow(post).mightShare;

/** Tiles within which a fleet meets an enemy fleet in its own zone: base plus a tile per point of its leader's Cunning, at most max (NAVY-150). */
export function seaEngageTiles(cunning: number | null): number {
  const e = config.seaEngage;
  return Math.min(e.max, e.base + (cunning === null ? 0 : Math.max(0, cunning) * e.perCunning));
}

/** Whether a fleet blockades: its realm at war, a warship and a leader aboard, lying still at sea (NAVY-155). */
export function blockades(f: { atWar: boolean; atSea: boolean; types: readonly string[]; hasLeader: boolean; sailing: boolean; inBattle: boolean; fleeing: boolean; landing: boolean }): boolean {
  return f.atWar && f.atSea && f.hasLeader && !f.sailing && !f.inBattle && !f.fleeing && !f.landing && f.types.some(isWarship);
}

/** A month's prize money from a port a blockade closes: a share of its sea trade value at its trade ratio, more under a commodore (NAVY-158). */
export function blockadePrize(seaValuePerMonth: number, tradeRatio: number, post: Post): number {
  return seaValuePerMonth * (Math.max(0, Math.min(100, tradeRatio)) / 100) * config.blockade.prizeShare * (postRow(post).prizeFactor ?? 1);
}

/** Whether a blocked realm's trade ship may pass a zone a blockade holds: only with a commodore of its own lying there (NAVY-157). */
export const tradeShipPasses = (blockaded: boolean, ownCommodoreThere: boolean): boolean => !blockaded || ownCommodoreThere;

/** People of a blockaded port that count toward its side's wish for peace, as a share of occupied land (NAVY-159). */
export const blockadePeaceWeight = (): number => config.blockade.peaceWeight;
