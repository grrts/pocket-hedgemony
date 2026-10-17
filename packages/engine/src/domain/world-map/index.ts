import type { ProvinceDef, Ruleset } from "@ph/rules";
import config from "../../../../rules/data/domain/world-map.json" with { type: "json" };

/**
 * World map (domain/world-map/spec.md): the pixel grid, places and their
 * graph, tile types folded onto the 11 grounds, rivers, depth, regions and
 * credits. The map is build data: these are the rules the map generator
 * (tools/mapgen) follows, stated as pure functions, plus readers over the
 * built places. Nothing here changes during a campaign.
 */

// ---------------------------------------------------------------------------
// Grid

export const GRID = config.grid;

/** Pixel column and row of a longitude and latitude. */
export function pixelOf(lon: number, lat: number): { x: number; y: number } {
  return { x: Math.floor((lon + 180) * GRID.pxPerDeg), y: Math.floor((GRID.latTop - lat) * GRID.pxPerDeg) };
}

/** Longitude and latitude of a pixel's centre. */
export function lonLatOf(x: number, y: number): { lon: number; lat: number } {
  return { lon: (x + 0.5) / GRID.pxPerDeg - 180, lat: GRID.latTop - (y + 0.5) / GRID.pxPerDeg };
}

/** The grid a map of this width and height spans at the configured scale (MAP-001). */
export function gridOf(map: { width: number; height: number; pxPerDeg: number; latTop: number }): { width: number; height: number; pxPerDeg: number; latTop: number; latBottom: number } {
  return { width: map.width, height: map.height, pxPerDeg: map.pxPerDeg, latTop: map.latTop, latBottom: map.latTop - map.height / map.pxPerDeg };
}

const inBox = (lon: number, lat: number, b: number[]) => lon >= b[0]! && lat >= b[1]! && lon <= b[2]! && lat <= b[3]!;

/** Target province size in pixels where a piece lies; the first density zone that holds it wins (MAP-003). */
export function targetSize(lon: number, lat: number): number {
  for (const zone of config.cutting.density) if (inBox(lon, lat, zone.bbox)) return zone.target;
  return config.cutting.defaultTarget;
}

/** Pieces smaller than mergeBelow merge into a neighbour; larger than splitAbove are split (MAP-002). */
export function cutThresholds(lon: number, lat: number): { target: number; mergeBelow: number; splitAbove: number } {
  const target = targetSize(lon, lat);
  return { target, mergeBelow: target * config.cutting.minFactor, splitAbove: target * config.cutting.maxFactor };
}

export function densityZone(name: string): { name: string; bbox: number[]; target: number } | undefined {
  return config.cutting.density.find((z) => z.name === name);
}

/**
 * Cuts admin regions into pieces: lake pixels belong to no piece, and each
 * connected part of a region (an exclave, an island) is a piece of its own
 * (MAP-005). `region` is the admin region per pixel (-1 none), `lake` 1 where
 * a large lake lies. Returns the piece per pixel (-1 none), 4-connected.
 */
export function cutPieces(width: number, height: number, region: Int32Array, lake: Uint8Array): Int32Array {
  const src = Int32Array.from(region, (r, p) => (lake[p] ? -1 : r));
  const piece = new Int32Array(src.length).fill(-1);
  let next = 0;
  const stack: number[] = [];
  for (let s = 0; s < src.length; s++) {
    if (src[s]! < 0 || piece[s]! >= 0) continue;
    piece[s] = next;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p - x) / width;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (piece[q]! < 0 && src[q] === src[p]) {
          piece[q] = next;
          stack.push(q);
        }
      }
    }
    next++;
  }
  return piece;
}

// ---------------------------------------------------------------------------
// Places and the graph

export type PlaceKind = "province" | "sea" | "ocean";

export interface MapGraph {
  places: ProvinceDef[];
  byId: Map<string, ProvinceDef>;
}

/** One graph of land provinces and sea zones (MAP-036). */
export function mapGraph(rules: Pick<Ruleset, "provinces">): MapGraph {
  return { places: rules.provinces, byId: new Map(rules.provinces.map((p) => [p.id, p])) };
}

export function kindOf(p: ProvinceDef): PlaceKind {
  return p.terrain === "sea" ? "sea" : p.terrain === "ocean" ? "ocean" : "province";
}

export function isWater(p: ProvinceDef): boolean {
  return kindOf(p) !== "province";
}

export function neighboursOf(g: MapGraph, id: string): string[] {
  return g.byId.get(id)?.neighbors ?? [];
}

export function areNeighbours(g: MapGraph, a: string, b: string): boolean {
  return neighboursOf(g, a).includes(b);
}

/** Pairs where a place lists another that does not list it back (MAP-038). */
export function asymmetricNeighbours(g: MapGraph): [string, string][] {
  const out: [string, string][] = [];
  for (const p of g.places) for (const n of p.neighbors) if (!areNeighbours(g, n, p.id)) out.push([p.id, n]);
  return out;
}

export function landProvinces(g: MapGraph): ProvinceDef[] {
  return g.places.filter((p) => !isWater(p));
}

export function seaZones(g: MapGraph): ProvinceDef[] {
  return g.places.filter(isWater);
}

/** A province touching a sea zone is coastal (MAP-037). */
export function touchesSea(g: MapGraph, p: ProvinceDef): boolean {
  return p.neighbors.some((n) => {
    const q = g.byId.get(n);
    return !!q && isWater(q);
  });
}

// ---------------------------------------------------------------------------
// Sea zones

export interface Strait {
  name: string;
  /** A point (longitude, latitude) in the water on each side. */
  a: number[];
  b: number[];
}

/** Straits that join seas the pixel grid closes (MAP-013). */
export const STRAITS = config.straits as Strait[];

/**
 * About how many km a sea zone of a kind spans at a latitude (MAP-010): seeds
 * sit `spacing` pixels apart north–south, and east–west the spacing widens
 * with latitude so the distance in km stays the same.
 */
export function seaZoneAcrossKm(kind: "sea" | "ocean", lat: number): { northSouth: number; eastWest: number } {
  const s = config.seas;
  const spacing = kind === "sea" ? s.coastSpacing : s.oceanSpacing;
  const kmPerPx = config.kmPerDegree / GRID.pxPerDeg;
  const cos = Math.cos((lat * Math.PI) / 180);
  const eastWestPx = spacing / Math.max(s.minCos, cos);
  return { northSouth: spacing * kmPerPx, eastWest: eastWestPx * kmPerPx * cos };
}

/** The place a province image holds at a pixel: images store index + 1, black for none. */
export function placeIndexAt(rgb: Uint8Array, width: number, x: number, y: number): number {
  const i = (y * width + (((x % width) + width) % width)) * 3;
  return ((rgb[i]! << 16) | (rgb[i + 1]! << 8) | rgb[i + 2]!) - 1;
}

/** The nearest place of a kind to a point, searching rings of pixels outward (as the generator joins straits). */
export function placeNear(rgb: Uint8Array, width: number, height: number, lon: number, lat: number, accept: (index: number) => boolean, radius = 12): number {
  const { x: cx, y: cy } = pixelOf(lon, lat);
  for (let r = 0; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || cy + dy < 0 || cy + dy >= height) continue;
        const idx = placeIndexAt(rgb, width, cx + dx, cy + dy);
        if (idx >= 0 && accept(idx)) return idx;
      }
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Terrain

export type Ground = "grassland" | "farmland" | "savanna" | "drylands" | "desert" | "hills" | "mountains" | "forest" | "jungle" | "marsh" | "tundra";

export interface TileType {
  type: string;
  category: string;
  ground: Ground;
  startingTiles: string;
}

/** The 22 tile types, in the order the terrain image numbers them (MAP-016). */
export const TILE_TYPES = config.tileTypes as TileType[];

export function tileType(type: string): TileType {
  const t = TILE_TYPES.find((x) => x.type === type);
  if (!t) throw new Error(`no tile type ${type}`);
  return t;
}

/** The ground a tile type plays as (MAP-017). */
export function groundOfTile(type: string): Ground {
  return tileType(type).ground;
}

/** The land tile uses a tile type suggests (MAP-027). */
export function startingTiles(type: string): string {
  return tileType(type).startingTiles;
}

/** Base tile type from the Köppen-Geiger class (MAP-018, step 1; tools/mapgen/terrain.ts). */
export function climateType(k: string, lat: number): string {
  if (k === "Af" || k === "Am") return "jungle";
  if (k === "Aw" || k === "As") return "savanna";
  if (k === "BWh") return "desert";
  if (k === "BWk") return "colddesert";
  if (k === "BSh") return "drylands";
  if (k === "BSk") return "steppe";
  if (k === "EF") return "glacier";
  if (k === "ET") return "tundra";
  if (k.startsWith("D") && (k.endsWith("c") || k.endsWith("d"))) return "forest";
  if (k === "Cfc" || k === "Cwc" || k === "Csc") return "forest";
  if (k === "Csa" || k === "Csb") return "mediterranean";
  if (k) return "grassland";
  const a = Math.abs(lat);
  return a > 66 ? "tundra" : a > 55 ? "forest" : a < 10 ? "jungle" : "grassland";
}

const tropical = (k: string) => k.startsWith("A");
const dry = (k: string) => k.startsWith("B");
const alpineOrPolar = (k: string) => k === "ET" || k === "EF";

/**
 * The mountain type of a range from its climate (MAP-019): badlands in desert
 * climates, highlands in tropical ones, snow peaks in alpine and polar
 * climates, in the high core of large ranges and north of 50°, grey-rock
 * mountains elsewhere.
 */
export function rangeType(k: string, lat: number, highCore = false): string {
  if (dry(k)) return "badlands";
  if (tropical(k)) return "highlands";
  if (alpineOrPolar(k) || highCore || Math.abs(lat) >= config.ranges.snowLatitude) return "snowpeaks";
  return "mountains";
}

export const HILL_RIM = config.ranges.hillRimPixels;

/**
 * A range pixel `depth` pixels in from the range's edge (0 on the edge): a rim
 * of hills `rim` pixels wide (1 to 3), the range's own type inside (MAP-018).
 */
export function rangePixel(k: string, lat: number, depth: number, rim: number, highCore = false): string {
  if (rim < HILL_RIM.min || rim > HILL_RIM.max) throw new Error(`a hill rim is ${HILL_RIM.min} to ${HILL_RIM.max} pixels wide`);
  return depth < rim ? "hills" : rangeType(k, lat, highCore);
}

/** Wetlands are swamp in the tropics, marsh elsewhere (MAP-020). */
export function wetlandType(k: string): string {
  return tropical(k) ? "swamp" : "marsh";
}

/** Fields are rice paddies in monsoon Asia and farmland elsewhere (MAP-021). */
export function fieldType(lon: number, lat: number, k: string): string {
  const a = config.paddyLand;
  return lon > a.lonMin && lon < a.lonMax && lat > a.latMin && lat < a.latMax && a.climates.includes(k) ? "paddies" : "farmland";
}

/** Config lowlands (the Po valley) are never hills or mountains (MAP-024). */
export function isForcedLowland(lon: number, lat: number): boolean {
  return config.lowlands.some((l) => inBox(lon, lat, l.bbox));
}

export function lowland(name: string): { name: string; bbox: number[] } | undefined {
  return config.lowlands.find((l) => l.name === name);
}

export interface PixelInput {
  lon: number;
  lat: number;
  /** Köppen-Geiger class ("" when unknown). */
  koppen: string;
  /** Inside a Natural Earth mountain range outline. */
  range?: { depth: number; rim: number; highCore?: boolean };
  wetland?: boolean;
  /** Blurred forest cover, 0–1. */
  cover?: number;
}

/**
 * The tile type that sets a pixel's ground, in the order the designs give:
 * climate, then mountain ranges (unless forced lowland), then wetlands; thickly
 * wooded temperate grassland is forest (MAP-018, MAP-022).
 */
export function pixelType(o: PixelInput): string {
  let t = climateType(o.koppen, o.lat);
  if (isForcedLowland(o.lon, o.lat)) t = "grassland";
  else if (o.wetland && t !== "glacier") t = wetlandType(o.koppen);
  else if (o.range) t = rangePixel(o.koppen, o.lat, o.range.depth, o.range.rim, o.range.highCore);
  if (t === "grassland" && (o.cover ?? 0) >= config.groundRule.forestCover) t = "forest";
  return t;
}

/** Share of land under fields from the 1444 settlement density where a province lies. */
export function fieldShare(lon: number, lat: number): number {
  const s = config.settlement;
  const zone = s.zones.find((z) => inBox(lon, lat, z.bbox));
  return Math.min(s.maxFieldShare, (zone?.density ?? s.defaultDensity) / s.densityForFullFields);
}

export function settlementZone(name: string): { name: string; bbox: number[]; density: number } | undefined {
  return config.settlement.zones.find((z) => z.name.includes(name));
}

/**
 * One ground per province by the province ground rule (MAP-022, MAP-025):
 * mountains when more than half is mountain, hills when a quarter or more is
 * hills or mountain, otherwise the most common ground; grassland where 1444
 * was crowded enough to be mostly under the plough is farmland (MAP-023).
 */
export function provinceGround(counts: Partial<Record<Ground, number>>, share = 0): Ground {
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const mountains = (counts.mountains ?? 0) / total;
  const hills = (counts.hills ?? 0) / total;
  const r = config.groundRule;
  if (mountains > r.mountainShare) return "mountains";
  if (mountains + hills >= r.hillShare) return "hills";
  let best: Ground = "grassland";
  let most = -1;
  for (const [g, n] of Object.entries(counts) as [Ground, number][]) {
    if (g === "mountains" || g === "hills") continue;
    if (n > most) [best, most] = [g, n];
  }
  if (best === "grassland" && share >= config.settlement.farmlandFieldShare) return "farmland";
  return best;
}

/** Ground counts of a province from its pixels' tile types. */
export function groundCounts(types: string[]): Partial<Record<Ground, number>> {
  const out: Partial<Record<Ground, number>> = {};
  for (const t of types) {
    const g = groundOfTile(t);
    out[g] = (out[g] ?? 0) + 1;
  }
  return out;
}

/** Depth band 0–4 of a water depth in metres: under 200 m, 1 km, 3 km, 5 km, deeper (MAP-026). */
export function depthBand(metres: number): number {
  const bands = config.depthBandsMeters;
  const i = bands.findIndex((limit) => metres < limit);
  return i < 0 ? bands.length : i;
}

/**
 * One pixel of the terrain image (MAP-045): red the tile type on land; green
 * 1 + the depth band on water, 0 on land (or 64 + river size where a river
 * runs); blue the river's links.
 */
export function terrainPixel(p: { water: true; depth: number } | { water: false; type: string; river?: { size: number; links: number } }): [number, number, number] {
  if (p.water) return [0, depthBand(p.depth) + 1, 0];
  const r = TILE_TYPES.findIndex((t) => t.type === p.type);
  if (r < 0) throw new Error(`no tile type ${p.type}`);
  return p.river ? [r, config.rivers.landRiverGreenBase + p.river.size, p.river.links] : [r, 0, 0];
}

// ---------------------------------------------------------------------------
// Rivers

/** River size by Natural Earth scale rank: 2 for great rivers (0–4), 1 to rank 8, none beyond (MAP-029, MAP-030). */
export function riverSize(rank: number): number {
  const r = config.rivers;
  if (rank > r.maxRank) return 0;
  return rank <= r.greatMaxRank ? r.greatSize : r.otherSize;
}

/** Neighbour directions in the bit order of a river pixel's links. */
export const RIVER_DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;

export interface RiverPixel {
  x: number;
  y: number;
  size: number;
  /** One bit per neighbour the river flows to (RIVER_DIRS order). */
  links: number;
}

/** Traces a river along an 8-connected path of pixels: size per pixel and links both ways (MAP-029). */
export function traceRiver(path: [number, number][], rank: number): RiverPixel[] {
  const size = riverSize(rank);
  if (!size) return [];
  const out = new Map<string, RiverPixel>();
  const at = (x: number, y: number) => {
    const key = `${x},${y}`;
    let p = out.get(key);
    if (!p) out.set(key, (p = { x, y, size, links: 0 }));
    p.size = Math.max(p.size, size);
    return p;
  };
  path.forEach(([x, y], i) => {
    at(x, y);
    const prev = path[i - 1];
    if (!prev) return;
    const k = RIVER_DIRS.findIndex(([dx, dy]) => dx === x - prev[0] && dy === y - prev[1]);
    if (k < 0) throw new Error("river paths are 8-connected");
    at(prev[0], prev[1]).links |= 1 << k;
    at(x, y).links |= 1 << ((k + 4) % 8);
  });
  return [...out.values()];
}

/** The pixel a link bit points at. */
export function linkedPixels(p: RiverPixel): [number, number][] {
  return RIVER_DIRS.flatMap(([dx, dy], k) => (p.links & (1 << k) ? [[p.x + dx, p.y + dy] as [number, number]] : []));
}

/** A province with three or more river pixels is a river province (MAP-031). */
export function isRiverProvince(riverPixels: number): boolean {
  return riverPixels >= config.rivers.riverProvincePixels;
}

// ---------------------------------------------------------------------------
// Roads as geography

export type RoadStep = "track" | "road" | "paved road" | "turnpike" | "railway";
export const ROAD_STEPS = config.roadSteps as RoadStep[];

/** One road step per province, for the whole province (MAP-034). Buildings change it; the map only holds it. */
export type RoadMap = Map<string, RoadStep>;

export function setRoad(roads: RoadMap, province: string, step: string): void {
  if (!ROAD_STEPS.includes(step as RoadStep)) throw new Error(`not a road step: ${step}`);
  roads.set(province, step as RoadStep);
}

export function roadOf(roads: RoadMap, province: string): RoadStep | undefined {
  return roads.get(province);
}

// ---------------------------------------------------------------------------
// Regions and credits

export interface Region {
  id: string;
  name: string;
  parent: string | null;
  macro: boolean;
}

export interface Area {
  id: string;
  name: string;
  region: string;
}

export const REGIONS = config.regions as Region[];
export const AREAS = config.areas as Area[];

/** The event tree's macro-regions (MAP-039). */
export function macroRegions(): Region[] {
  return REGIONS.filter((r) => r.macro);
}

/** A macro-region by its name (the part before any bracketed gloss). */
export function macroRegion(name: string): Region | undefined {
  return macroRegions().find((r) => r.name.replace(/\s*\(.*\)$/, "") === name);
}

/** Sub-regions under a region, at any depth. */
export function subRegions(id: string): Region[] {
  const kids = REGIONS.filter((r) => r.parent === id);
  return kids.flatMap((k) => [k, ...subRegions(k.id)]);
}

/** Areas in a region or any of its sub-regions. */
export function areasIn(id: string): Area[] {
  const ids = new Set([id, ...subRegions(id).map((r) => r.id)]);
  return AREAS.filter((a) => ids.has(a.region));
}

/** The map's data sources and their licences (MAP-044). */
export const CREDITS = config.credits as { source: string; licence: string }[];
