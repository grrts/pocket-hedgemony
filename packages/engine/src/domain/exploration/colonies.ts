/**
 * Colonial governors (design §4.2) and founding a colony (design §5): where a
 * colony may be founded, going ashore and the local aggression roll, the
 * monthly progress and colony food, founded, lost and abandoned.
 */
import type { Rng } from "../../rng.ts";
import { isWater, type MapGraph } from "../world-map/index.ts";
import { isCharted, type ChartedMap } from "./charts.ts";
import { AGGRESSION, explorationConfig as cfg, type AggressionLevel } from "./config.ts";
import { governorSlots, hasColonialUnlock, inColonialRange } from "./unlock.ts";

// ---------------------------------------------------------------------------
// Colonial governors

export type GovernorWhere =
  | { kind: "port"; port: string }
  | { kind: "aboard"; ship: string }
  | { kind: "ashore"; province: string }
  | { kind: "travelling_home"; ship: string };

export interface ColonialGovernor {
  id: string;
  name: string;
  where: GovernorWhere;
  alive: boolean;
  /** Years of age: he is a person who ages and can die (EXPL-025). */
  age: number;
}

export interface ColonialOffice {
  country: string;
  /** Governors holding a slot. */
  governors: ColonialGovernor[];
}

export function newOffice(country: string): ColonialOffice {
  return { country, governors: [] };
}

/** Slots used: every governor holding a slot (INV-EXPL-5). */
export function slotsUsed(o: ColonialOffice): number {
  return o.governors.length;
}

export type HireRefusal = "no_colonial_unlock" | "no_free_slot";

/** What a colonial governor costs: gold once when hired and a yearly wage (EXPL-025, D-EXPL-6; provisional). */
export function governorCost(): { gold: number; wagePerYear: number } {
  return { gold: cfg.governor_hire_gold, wagePerYear: cfg.governor_wage_per_year };
}

/**
 * Hires a colonial governor who waits in a port of the country (EXPL-024,
 * EXPL-027, EXPL-030); he is paid for as `governorCost` says (D-EXPL-6).
 */
export function hireGovernor(o: ColonialOffice, knows: ReadonlySet<string>, port: string, id: string, name = id): { ok: true; governor: ColonialGovernor } | { ok: false; reason: HireRefusal } {
  if (!hasColonialUnlock(knows)) return { ok: false, reason: "no_colonial_unlock" };
  if (slotsUsed(o) >= governorSlots(knows)) return { ok: false, reason: "no_free_slot" };
  const governor: ColonialGovernor = { id, name, where: { kind: "port", port }, alive: true, age: cfg.governor_age_when_hired };
  o.governors.push(governor);
  return { ok: true, governor };
}

function release(o: ColonialOffice, id: string): ColonialGovernor {
  const i = o.governors.findIndex((g) => g.id === id);
  if (i < 0) throw new Error(`no colonial governor ${id}`);
  return o.governors.splice(i, 1)[0]!;
}

/** Dismissal frees the slot; not while he is ashore founding (EXPL-028). */
export function dismissGovernor(o: ColonialOffice, id: string): boolean {
  const g = o.governors.find((x) => x.id === id);
  if (!g || g.where.kind === "ashore") return false;
  release(o, id);
  return true;
}

/** A year passes: every colonial governor is a year older (EXPL-025). */
export function governorsAge(o: ColonialOffice): void {
  for (const g of o.governors) g.age += 1;
}

/** He dies of old age: his slot frees (EXPL-028). A colony he was founding is lost with him (D-EXPL-10): see `governorDies`. */
export function governorDiesOfAge(o: ColonialOffice, id: string): ColonialGovernor {
  const g = release(o, id);
  g.alive = false;
  return g;
}

/**
 * A colonial governor dies, of old age or at sea when his ship sinks: his slot
 * frees, and a colony he was founding is lost as at progress 0 (EXPL-059, D-EXPL-10).
 */
export function governorDies(o: ColonialOffice, id: string, colony?: Colony): { governor: ColonialGovernor; event?: FoundingEvent } {
  if (colony && colony.governor === id) {
    const lost = colonyLost(o, colony);
    return { governor: lost.governor, event: lost.event };
  }
  return { governor: governorDiesOfAge(o, id) };
}

/**
 * The province gets an owner other than the founder while the colony is being
 * founded: the colony is lost as at progress 0 (EXPL-060, D-EXPL-11).
 */
export function provinceTakenDuringFounding(o: ColonialOffice, c: Colony, newOwner: string): { event: FoundingEvent } | null {
  if (newOwner === c.owner) return null;
  return { event: colonyLost(o, c).event };
}

/**
 * The places colonial range is measured from (EXPL-032, EXPL-065, D-EXPL-5): the
 * country's own ports (lords' included, canoe landings counted), its subjects'
 * ports and its founded colonies; never a colony still being founded.
 */
export function rangeAnchors(o: { ownPorts: readonly string[]; subjectPorts?: readonly string[]; foundedColonies?: readonly string[]; coloniesBeingFounded?: readonly string[] }): string[] {
  return [...o.ownPorts, ...(o.subjectPorts ?? []), ...(o.foundedColonies ?? [])];
}

/** Any ship in his port may take him aboard; it carries no stores for him (EXPL-030). */
export function embarkGovernor(o: ColonialOffice, id: string, ship: { id: string; at: string }): boolean {
  const g = o.governors.find((x) => x.id === id);
  if (!g || g.where.kind !== "port" || g.where.port !== ship.at) return false;
  g.where = { kind: "aboard", ship: ship.id };
  return true;
}

/** Colony stores a ship type can carry: only exploration ships have them (EXPL-044). */
export function storesCapacity(type: string): number {
  return (cfg.colony_stores as Record<string, number>)[type] ?? 0;
}

/** A governor home in a port of his country frees his slot after abandoning (EXPL-049). */
export function governorHome(o: ColonialOffice, id: string, port: string): void {
  const g = o.governors.find((x) => x.id === id);
  if (!g || g.where.kind !== "travelling_home") return;
  release(o, id);
  g.where = { kind: "port", port };
}

// ---------------------------------------------------------------------------
// Where a colony may be founded (EXPL-034, EXPL-035)

export interface ColonySite {
  province: string;
  coastal: boolean;
  owner: string | null;
  /** Tiles nobody works. */
  freeTiles: number;
  /** Zones from the province's coastal zone to the nearest port or colony of the founder. */
  zonesToNearest: number;
  /** Country already founding a colony there, if any. */
  beingFoundedBy: string | null;
}

export type FoundRefusal = "uncharted" | "not_coastal" | "owned" | "no_free_tile" | "out_of_range" | "being_founded";

export function colonisable(site: ColonySite, founder: { id: string; chart: ChartedMap; range: number }): { ok: true } | { ok: false; reason: FoundRefusal } {
  if (!isCharted(founder.chart, site.province)) return { ok: false, reason: "uncharted" };
  if (!site.coastal) return { ok: false, reason: "not_coastal" };
  if (site.owner !== null) return { ok: false, reason: "owned" };
  if (site.freeTiles < 1) return { ok: false, reason: "no_free_tile" };
  if (!inColonialRange(site.zonesToNearest, founder.range)) return { ok: false, reason: "out_of_range" };
  if (site.beingFoundedBy !== null && site.beingFoundedBy !== founder.id) return { ok: false, reason: "being_founded" };
  return { ok: true };
}

/** Land owned by a country, tribal countries included, is taken only by war or treaty (EXPL-035). */
export function howTaken(owner: string | null): "colony" | "war_or_treaty" {
  return owner === null ? "colony" : "war_or_treaty";
}

/** Tiles a colony takes: only the free ones; the people's tiles stay theirs (EXPL-036, INV-EXPL-10). */
export function colonyTiles(freeTiles: number, peoplesTiles: number): { colony: number; peoples: number } {
  return { colony: freeTiles, peoples: peoplesTiles };
}

/** Zones from a province's coastal zones to the nearest port or colony (EXPL-032, EXPL-033). */
export function zonesToNearest(g: MapGraph, province: string, portsAndColonies: readonly string[]): number | null {
  const water = (id: string) => (g.byId.get(id)?.neighbors ?? []).filter((n) => {
    const q = g.byId.get(n);
    return !!q && isWater(q);
  });
  const targets = new Set(portsAndColonies.flatMap(water));
  const start = water(province);
  const dist = new Map<string, number>(start.map((z) => [z, 0]));
  const queue = [...start];
  while (queue.length) {
    const at = queue.shift()!;
    if (targets.has(at)) return dist.get(at)!;
    for (const n of g.byId.get(at)?.neighbors ?? []) {
      const q = g.byId.get(n);
      if (!q || !isWater(q) || dist.has(n)) continue;
      dist.set(n, dist.get(at)! + 1);
      queue.push(n);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Local aggression (EXPL-038 … EXPL-040)

/** Places counted for the locals: land neighbours, and coasts across one sea zone (EXPL-038). */
export function aggressionNeighbours(g: MapGraph, province: string): string[] {
  const out = new Set<string>();
  for (const n of g.byId.get(province)?.neighbors ?? []) {
    const q = g.byId.get(n);
    if (!q) continue;
    if (!isWater(q)) out.add(n);
    else for (const m of q.neighbors) {
      const r = g.byId.get(m);
      if (r && !isWater(r) && m !== province) out.add(m);
    }
  }
  return [...out];
}

/** Whether anyone lives in the province or a counted neighbour. */
export function peopleAround(g: MapGraph, province: string, peopleIn: (id: string) => number): boolean {
  return [province, ...aggressionNeighbours(g, province)].some((id) => peopleIn(id) > 0);
}

export function aggressionRow(level: AggressionLevel) {
  const row = AGGRESSION.find((a) => a.level === level);
  if (!row) throw new Error(`unknown aggression ${level}`);
  return row;
}

/** Rolls local aggression once: Peaceful with no people around, else by the chances (EXPL-039, EXPL-040). */
export function rollAggression(rng: Rng, people: boolean): AggressionLevel {
  if (!people) return "Peaceful";
  let r = rng.int(100);
  for (const a of AGGRESSION) {
    if (r < a.chance_pct) return a.level;
    r -= a.chance_pct;
  }
  return AGGRESSION[AGGRESSION.length - 1]!.level;
}

/** The locals' pressure roll runs from 0 to twice the level's average (EXPL-042). */
export function pressureMax(level: AggressionLevel): number {
  return aggressionRow(level).average_loss * cfg.pressure_roll_max_factor;
}

/** The locals' pressure this month: a whole number from 0 to the maximum, each equally likely (EXPL-063, D-EXPL-14). */
export function rollPressure(rng: Rng, level: AggressionLevel): number {
  return rng.int(pressureMax(level) + 1);
}

/** Average months from going ashore to 100 progress, and the colony food that needs (design table). */
export function averageFounding(level: AggressionLevel): { loss: number; gain: number; months: number; food: number } {
  const loss = aggressionRow(level).average_loss;
  const gain = cfg.progress_gain - loss;
  const months = Math.ceil((cfg.progress_founded - cfg.progress_start) / gain);
  return { loss, gain, months, food: months * cfg.food_per_month };
}

// ---------------------------------------------------------------------------
// The colony being founded

export interface Colony {
  province: string;
  owner: string;
  governor: string;
  progress: number;
  aggression: AggressionLevel;
  food: number;
}

export type FoundingEvent =
  | { type: "ColonyFoundingStarted"; province: string; country: string; governor: string }
  | { type: "LocalAggressionRolled"; province: string; level: AggressionLevel }
  | { type: "ColonyFoodUnloaded"; province: string; rations: number }
  | { type: "ColonyFounded"; province: string; country: string; governor: string; leftOverFood: number }
  | { type: "ColonyLost"; province: string; country: string }
  | { type: "ColonyAbandoned"; province: string; country: string };

/**
 * *Found colony*: the governor aboard goes ashore, progress starts at 10 and
 * local aggression is rolled at once (EXPL-037, EXPL-038).
 */
export function goAshore(o: ColonialOffice, governorId: string, province: string, aggression: AggressionLevel): { colony: Colony; events: FoundingEvent[] } {
  const g = o.governors.find((x) => x.id === governorId);
  if (!g || (g.where.kind !== "aboard" && g.where.kind !== "travelling_home")) throw new Error(`${governorId} is not aboard a ship`);
  g.where = { kind: "ashore", province };
  const colony: Colony = { province, owner: o.country, governor: g.id, progress: cfg.progress_start, aggression, food: 0 };
  return {
    colony,
    events: [
      { type: "ColonyFoundingStarted", province, country: o.country, governor: g.id },
      { type: "LocalAggressionRolled", province, level: aggression },
    ],
  };
}

/** *Unload stores*: a ship in the colony's zone moves its stores into colony food in one day, no port needed (EXPL-046). */
export function unloadStores(c: Colony, ship: { stores: number }): { days: number; event: FoundingEvent } {
  const rations = ship.stores;
  c.food += rations;
  ship.stores = 0;
  return { days: cfg.unload_days, event: { type: "ColonyFoodUnloaded", province: c.province, rations } };
}

/** Loads colony stores on an exploration ship docked where it may resupply, paid as resupply is (EXPL-044, EXPL-045). */
export function loadStores(ship: { type: string; stores: number }, rations: number, pays: "food" | "gold" | null): { ok: true; loaded: number; paidIn: "food" | "gold" } | { ok: false } {
  const cap = storesCapacity(ship.type);
  if (pays === null || cap === 0) return { ok: false };
  const loaded = Math.min(rations, cap - ship.stores);
  ship.stores += loaded;
  return { ok: true, loaded, paidIn: pays };
}

/** The days of a month change nothing in a colony being founded; it updates with the province (EXPL-056). */
export function colonyDay(_c: Colony): void {}

/**
 * The monthly update (EXPL-041 … EXPL-043): +5 progress, minus the locals'
 * pressure, eat 20 rations or lose 10 more progress with none left. Returns
 * whether it was founded (100) or lost (0) this month.
 */
export function colonyMonth(c: Colony, pressure: number): "founded" | "lost" | null {
  c.progress += cfg.progress_gain - pressure;
  if (c.food >= cfg.food_per_month) c.food -= cfg.food_per_month;
  else {
    c.food = 0;
    c.progress -= cfg.no_food_progress_loss;
  }
  if (c.progress >= cfg.progress_founded) {
    c.progress = cfg.progress_founded;
    return "founded";
  }
  if (c.progress <= cfg.progress_lost) {
    c.progress = cfg.progress_lost;
    return "lost";
  }
  return null;
}

/** The province a colony becomes, as exploration hands it to province (EXPL-047, EXPL-050). */
export interface FoundedProvince {
  id: string;
  owner: string;
  settlement: string;
  store: number;
  /** The governor, now its ordinary official, counted against the officials cap. */
  official: { id: string; governorSlot: false };
}

/** Progress 100: the province becomes the country's; the governor stays as its official and frees his slot (EXPL-047). */
export function colonyFounded(o: ColonialOffice, c: Colony): { province: FoundedProvince; event: FoundingEvent } {
  release(o, c.governor);
  const food = c.food;
  c.food = 0;
  return {
    province: { id: c.province, owner: c.owner, settlement: cfg.founded_settlement, store: food, official: { id: c.governor, governorSlot: false } },
    event: { type: "ColonyFounded", province: c.province, country: c.owner, governor: c.governor, leftOverFood: food },
  };
}

/** Progress 0: the governor dies, the food is lost, the slot frees and the land stays unowned (EXPL-048). */
export function colonyLost(o: ColonialOffice, c: Colony): { governor: ColonialGovernor; owner: null; event: FoundingEvent } {
  const g = release(o, c.governor);
  g.alive = false;
  c.food = 0;
  return { governor: g, owner: null, event: { type: "ColonyLost", province: c.province, country: c.owner } };
}

/**
 * *Abandon*: a ship of the founder in the colony's zone takes the governor
 * back aboard; his slot stays used until he is home (EXPL-049). The colony food
 * left ashore is lost, and the governor may go ashore elsewhere at once with
 * *Found colony* (EXPL-061, D-EXPL-12).
 */
export function abandonColony(o: ColonialOffice, c: Colony, shipInZone: { id: string } | null): { ok: true; event: FoundingEvent } | { ok: false; reason: "no_ship_in_zone" } {
  if (!shipInZone) return { ok: false, reason: "no_ship_in_zone" };
  const g = o.governors.find((x) => x.id === c.governor);
  if (!g) throw new Error(`no colonial governor ${c.governor}`);
  g.where = { kind: "travelling_home", ship: shipInZone.id };
  c.food = 0;
  return { ok: true, event: { type: "ColonyAbandoned", province: c.province, country: c.owner } };
}

/**
 * `colonial_presence` as the event tree counts it (EXPL-051, D-EXPL-8): one per
 * founded colony, plus the trading posts the country holds; a colony still
 * being founded does not count.
 */
export function colonialPresence(events: readonly FoundingEvent[], country: string, tradingPostsHeld = 0): number {
  return events.filter((e) => e.type === "ColonyFounded" && e.country === country).length + tradingPostsHeld;
}
