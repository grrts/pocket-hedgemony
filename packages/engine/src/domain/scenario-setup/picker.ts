/**
 * The realm picker (SETUP-053, SETUP-072 to SETUP-074): which region of the
 * world a realm starts in, for the picker's region filter, and the realm
 * card's one line **Ways to grow**, read from the start. Pure functions over
 * the event tree's macro regions, the catalogue and the map's anchors; the
 * client draws them before a game starts.
 */
import provinceConfig from "../../../../rules/data/domain/province.json" with { type: "json" };
import buildingsConfig from "../../../../rules/data/domain/buildings.json" with { type: "json" };
import { START_YEAR, startPorts as ports1444 } from "../../../../rules/src/start.ts";
import { explorationConfig, polityRegion, regionData } from "../exploration/index.ts";
import { catalogueRecord, hasRecord } from "./catalogue.ts";
import { catalogueIdOf } from "./start.ts";

// ---------------------------------------------------------------- regions (SETUP-072)

/** The picker's region names, in the event tree's macro-region order (west to east, then the Americas). */
const REGION_NAMES: Record<string, string> = {
  europe: "Europe",
  middle_east: "Middle East",
  north_africa: "North Africa",
  sub_saharan_africa: "Sub-Saharan Africa",
  south_asia: "South Asia",
  central_asia: "Central and North Asia",
  east_asia: "East Asia",
  southeast_asia: "Southeast Asia",
  oceania: "Oceania",
  north_america: "North America",
  central_america: "Mesoamerica and Central America",
  caribbean: "Caribbean",
  south_america: "South America",
};

export interface PickerRegion {
  id: string;
  name: string;
}

/** Every macro region the picker can filter by, in order. */
export const PICKER_REGIONS: readonly PickerRegion[] = regionData.macro_regions.map((id) => ({ id, name: REGION_NAMES[id] ?? id }));

/** A region's name in the picker. */
export function pickerRegionName(id: string): string {
  return REGION_NAMES[id] ?? id;
}

/**
 * The map realms that have neither a catalogue record nor a place in the event
 * tree's polity list (D-SETUP-1: the map keeps its own data for them), placed
 * by where their capital lies.
 */
const UNMATCHED: Record<string, string> = {
  ireland: "europe",
  modena: "europe",
  pomerania: "europe",
  albania: "europe",
  hejaz: "middle_east",
  yemen: "middle_east",
  oman: "middle_east",
  tunis: "north_africa",
  orissa: "south_asia",
  mongols: "central_asia",
  tibet: "east_asia",
  jurchens: "east_asia",
  japan: "east_asia",
  khmer: "southeast_asia",
  pegu: "southeast_asia",
  huron: "north_america",
  creek: "north_america",
  pueblo: "north_america",
  zapotec: "central_america",
  maya: "central_america",
};

/**
 * The macro region a map realm's own data places it in, or null: the event
 * tree's 1444 polity list (by the map id, then by its catalogue record's id),
 * else the region group of its catalogue record (EXPL-075), else where the
 * capital of a realm without a record lies.
 */
export function recordRegion(mapId: string): string | null {
  const record = catalogueIdOf(mapId);
  const polity = polityRegion(mapId) ?? (record ? polityRegion(record) : null);
  if (polity) return polity;
  if (!record || !hasRecord(record)) return UNMATCHED[mapId] ?? null;
  const group = catalogueRecord(record).region;
  return Object.entries(explorationConfig.game.catalogue_regions).find(([prefix]) => group.startsWith(prefix))?.[1] ?? null;
}

/**
 * Each realm's region in the picker (SETUP-072): its own data's region, else
 * the region of the realm whose capital lies nearest its capital (a realm
 * added to the map with no record and no entry above). Capitals are map
 * points; the map wraps east to west over `width`.
 */
export function pickerRegions(realms: readonly { id: string; x: number; y: number }[], width = Infinity): string[] {
  const own = realms.map((r) => recordRegion(r.id));
  return realms.map((r, i) => {
    if (own[i]) return own[i]!;
    let best = -1;
    let bestD = Infinity;
    realms.forEach((o, j) => {
      if (!own[j]) return;
      const dx = Math.min(Math.abs(o.x - r.x), width - Math.abs(o.x - r.x));
      const d = dx * dx + (o.y - r.y) ** 2;
      if (d < bestD) [best, bestD] = [j, d];
    });
    return best >= 0 ? own[best]! : explorationConfig.game.fallback_region;
  });
}

// ---------------------------------------------------------------- ways to grow (SETUP-073)

/** Where the start's trade sits, by province index: gold fields, other mines, trade towns, ports. */
export interface StartTrade {
  gold: ReadonlySet<number>;
  mines: ReadonlySet<number>;
  towns: ReadonlySet<number>;
  ports: ReadonlySet<number>;
}

const sameName = (a: string, b: string) => a.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() === b.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * The 1444 trade of the map from its anchors: the mine anchors (gold fields
 * apart), the market anchors standing in 1444 (trade and caravan towns,
 * SETUP-032, SETUP-068), and the 1444 port list's towns with a harbour
 * (great, port, small; a canoe landing is not a port, SETUP-036).
 */
export function startTrade(provinces: readonly { id: string; name: string }[]): StartTrade {
  const byId = new Map(provinces.map((p, i) => [p.id, i]));
  const byName = (name: string) => provinces.findIndex((p) => sameName(p.name, name));
  const gold = new Set<number>();
  const mines = new Set<number>();
  for (const [name, a] of Object.entries(provinceConfig.mines.anchors as Record<string, { ware: string }>)) {
    const i = byName(name);
    if (i >= 0) (a.ware === "gold" ? gold : mines).add(i);
  }
  const towns = new Set<number>();
  const portTowns = ports1444.towns as { name: string; tier: string; province: string | null }[];
  for (const a of buildingsConfig.anchors as { province: string; building: string; from_year: number; by_event?: boolean }[]) {
    if (a.building !== "market" || a.from_year > START_YEAR || a.by_event) continue;
    let i = byName(a.province);
    if (i < 0) i = byId.get(portTowns.find((t) => sameName(t.name, a.province))?.province ?? "") ?? -1;
    if (i >= 0) towns.add(i);
  }
  const ports = new Set<number>();
  for (const t of portTowns) {
    const i = t.province ? byId.get(t.province) : undefined;
    if (i !== undefined && t.tier !== "landing") ports.add(i);
  }
  return { gold, mines, towns, ports };
}

export interface GrowthMap {
  /** Each province's owner (a realm index), -1 for land no realm owns. */
  owners: ArrayLike<number>;
  /** Each province's neighbours, by index. */
  neighbors: readonly (readonly number[])[];
  /** Sea and ocean zones. */
  water: readonly boolean[];
  trade: StartTrade;
}

export interface WaysToGrow {
  /** Realms next to it by land with fewer provinces: tributaries it could make (subjects). */
  smallerNeighbours: number;
  /** Land no realm owns that borders it: room to settle (EXPL, SETUP-065). */
  freeProvinces: number;
  goldFields: number;
  mines: number;
  tradeTowns: number;
  ports: number;
}

/** How realm `r` can grow from its start (SETUP-073): smaller neighbours, free land beside it, its trade. */
export function waysToGrow(map: GrowthMap, r: number): WaysToGrow {
  const size = new Map<number, number>();
  const own: number[] = [];
  for (let i = 0; i < map.owners.length; i++) {
    const o = map.owners[i]!;
    if (o >= 0) size.set(o, (size.get(o) ?? 0) + 1);
    if (o === r) own.push(i);
  }
  const mine = own.length;
  const neighbours = new Set<number>();
  const free = new Set<number>();
  for (const i of own)
    for (const j of map.neighbors[i] ?? []) {
      if (map.water[j]) continue;
      const o = map.owners[j]!;
      if (o < 0) free.add(j);
      else if (o !== r) neighbours.add(o);
    }
  const count = (s: ReadonlySet<number>) => own.filter((i) => s.has(i)).length;
  return {
    smallerNeighbours: [...neighbours].filter((o) => size.get(o)! < mine).length,
    freeProvinces: free.size,
    goldFields: count(map.trade.gold),
    mines: count(map.trade.mines),
    tradeTowns: count(map.trade.towns),
    ports: count(map.trade.ports),
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The card's line after "Ways to grow:", the parts that are there, or "none at the start". */
export function waysToGrowLine(w: WaysToGrow): string {
  const parts = [
    w.smallerNeighbours ? plural(w.smallerNeighbours, "smaller neighbour") : "",
    w.freeProvinces ? plural(w.freeProvinces, "free province") : "",
    w.goldFields ? plural(w.goldFields, "gold field") : "",
    w.mines ? plural(w.mines, "mine") : "",
    w.tradeTowns ? plural(w.tradeTowns, "trade town") : "",
    w.ports ? plural(w.ports, "port") : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "none at the start";
}
