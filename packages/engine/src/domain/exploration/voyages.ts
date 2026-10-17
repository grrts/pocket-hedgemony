/**
 * Voyages into the fog (design §3.2, §3.3): the drawn path and its preview,
 * leaving port with full supply, supply at sea and out of supply (naval 6.4),
 * *Turn back* and *Carry on*, docking on the way (naval 6.3).
 */
import { isWater, type MapGraph } from "../world-map/index.ts";
import { chartOnEntering, isCharted, type ChartedMap } from "./charts.ts";
import { explorationConfig as cfg, type LowSupply } from "./config.ts";

export interface VoyageShip {
  id: string;
  type: string;
  supply: number;
  maxSupply: number;
  crew: number;
  /** Colony stores in the hold, apart from supply. */
  stores: number;
}

/** A new ship of a type, docked with full supply. */
export function newShip(id: string, type: string, crew = 0): VoyageShip {
  const row = (cfg.naval.exploration_ships as Record<string, { supply: number }>)[type] ?? (cfg.naval.other_ships as Record<string, { supply: number }>)[type];
  if (!row) throw new Error(`unknown ship ${type}`);
  return { id, type, supply: row.supply, maxSupply: row.supply, crew, stores: 0 };
}

/** A port on the way, as the voyage sees it. */
export interface PortOnTheWay {
  name: string;
  /** The province the port is in. */
  province: string;
  /** naval 1.3 tier: great, port, small, landing. */
  tier: string;
}

export interface VoyagePreview {
  zones: number;
  uncharted: number;
  supply: number;
  maxSupply: number;
  out: number;
  back: number;
  short: number;
  ports: { name: string; mark: "uncharted" | "no dock" | null }[];
  choices: LowSupply[];
  defaultChoice: LowSupply;
}

/** A voyage is given only to ships in port; ships at sea must dock first (EXPL-066, D-EXPL-17). */
export function mayGiveVoyage(ships: readonly { inPort: boolean }[]): boolean {
  return ships.length > 0 && ships.every((s) => s.inPort);
}

/** Whether a port lets ships dock at all: canoe landings have no dock. */
export function portDockable(tier: string): boolean {
  return !cfg.naval.undockable_port_tiers.includes(tier);
}

/**
 * The preview of a drawn path (EXPL-017, EXPL-019): zones, how many are
 * uncharted, supply out and back with any shortfall (computed on full supply,
 * as a voyage leaves port full), ports on the way with uncharted or undockable
 * ones marked, and the low-supply choice.
 */
export function voyagePreview(ships: readonly VoyageShip[], path: readonly string[], m: ChartedMap, ports: readonly PortOnTheWay[]): VoyagePreview {
  const maxSupply = Math.min(...ships.map((s) => s.maxSupply));
  const out = path.length * cfg.naval.supply_per_zone;
  const back = out;
  return {
    zones: path.length,
    uncharted: path.filter((z) => !isCharted(m, z)).length,
    supply: maxSupply,
    maxSupply,
    out,
    back,
    short: Math.max(0, out + back - maxSupply),
    ports: ports.map((p) => ({ name: p.name, mark: !isCharted(m, p.province) ? "uncharted" : !portDockable(p.tier) ? "no dock" : null })),
    choices: cfg.low_supply_choices as LowSupply[],
    defaultChoice: cfg.default_low_supply as LowSupply,
  };
}

/** A voyage leaves port with full supply (EXPL-018, INV-EXPL-4). */
export function leavePort(ships: VoyageShip[]): void {
  for (const s of ships) s.supply = s.maxSupply;
}

/** Sails one zone: 1 supply, or with none left 1 in 10 of the crew lost (EXPL-019, EXPL-021). */
export function sailZone(ship: VoyageShip): { withoutSupply: boolean; crewLost: number } {
  if (ship.supply >= cfg.naval.supply_per_zone) {
    ship.supply -= cfg.naval.supply_per_zone;
    return { withoutSupply: false, crewLost: 0 };
  }
  ship.supply = 0;
  const lost = ship.crew * cfg.naval.out_of_supply_crew_loss;
  ship.crew -= lost;
  return { withoutSupply: true, crewLost: lost };
}

/** *Turn back*: turn when the supply left is just enough to reach the nearest dockable port (EXPL-020). */
export function shouldTurnBack(choice: LowSupply, supplyLeft: number, zonesToNearestPort: number): boolean {
  return choice === "Turn back" && supplyLeft <= zonesToNearestPort;
}

/** How a port of another country treats a docking ship (naval 6.3; EXPL-022). */
export type PortRelation = "realm" | "lord" | "subject" | "ally" | "peace" | "war" | "rival";

/** What resupply (and colony stores) cost there: food, gold, or no docking (null). */
export function dockingPays(relation: PortRelation): "food" | "gold" | null {
  return (cfg.naval.docking as Record<PortRelation, "food" | "gold" | null>)[relation];
}

/** Water zones next to a province. */
export function coastalZones(g: MapGraph, province: string): string[] {
  return (g.byId.get(province)?.neighbors ?? []).filter((n) => {
    const q = g.byId.get(n);
    return !!q && isWater(q);
  });
}

/** Zone steps over water from a zone to the nearest of some target zones, with the path; null when none. */
export function nearestZone(g: MapGraph, from: string, targets: ReadonlySet<string>, mayEnter: (zone: string) => boolean = () => true): { zones: number; path: string[] } | null {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  let found: string | null = null;
  while (queue.length) {
    const at = queue.shift()!;
    if (targets.has(at)) {
      found = at;
      break;
    }
    for (const n of g.byId.get(at)?.neighbors ?? []) {
      const q = g.byId.get(n);
      if (!q || !isWater(q) || prev.has(n) || !mayEnter(n)) continue;
      prev.set(n, at);
      queue.push(n);
    }
  }
  if (found === null) return null;
  const path: string[] = [];
  for (let at: string | null = found; at !== null; at = prev.get(at) ?? null) path.unshift(at);
  return { zones: path.length - 1, path: path.slice(1) };
}

export interface VoyageResult {
  /** Zones sailed in order. */
  sailed: string[];
  /** Places newly charted. */
  charted: string[];
  turnedBackAt: string | null;
  /** Where the voyage ended. */
  at: string;
  zonesWithoutSupply: number;
}

/**
 * Sails a voyage along its path, charting as it goes. With *Turn back* the
 * fleet turns when its supply is just enough for the nearest dockable port of
 * `homePorts` (provinces) and sails there.
 */
export function sailVoyage(
  g: MapGraph,
  m: ChartedMap,
  ships: VoyageShip[],
  from: string,
  path: readonly string[],
  choice: LowSupply,
  homePorts: readonly string[],
): VoyageResult {
  const portZones = new Set(homePorts.flatMap((p) => coastalZones(g, p)));
  const res: VoyageResult = { sailed: [], charted: [], turnedBackAt: null, at: from, zonesWithoutSupply: 0 };
  const enter = (zone: string) => {
    let without = false;
    for (const s of ships) without = sailZone(s).withoutSupply || without;
    if (without) res.zonesWithoutSupply++;
    res.sailed.push(zone);
    res.charted.push(...chartOnEntering(m, g, zone));
    res.at = zone;
  };
  for (const zone of path) {
    const left = Math.min(...ships.map((s) => s.supply));
    const home = nearestZone(g, res.at, portZones, (z) => isCharted(m, z));
    if (home && res.at !== from && shouldTurnBack(choice, left, home.zones)) {
      res.turnedBackAt = res.at;
      for (const z of home.path) enter(z);
      return res;
    }
    enter(zone);
  }
  return res;
}
