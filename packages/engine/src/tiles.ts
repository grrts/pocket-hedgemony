import type { Ground, Ruleset } from "@ph/rules";

/**
 * The map's tiles: one per pixel of the province image (about 7 km), each
 * with its province and what it is like to march over. Armies stand on a
 * tile and walk from tile to tile, so a march follows the land itself: round
 * the mountains, along the valleys, slower through forest, marsh and snow.
 */
export interface TileGrid {
  width: number;
  height: number;
  /** Province index + 1 per tile: the land province, or on water the sea zone (0 for water in no zone). Land is told by the cell, not by this. */
  province: Uint16Array;
  /** Per tile: the ground (index in GROUNDS, low 4 bits), a river (bit 4) and its height class (HEIGHT_KM, top 3 bits). */
  cell: Uint8Array;
  /** A tile near each province's centre, inside the province (a sea zone's own water for a zone; -1 when it has no tiles). */
  centre: Int32Array;
  /** Each province's box of tiles: min x, min y, max x, max y (empty when it has no tiles). */
  bounds: Int32Array;
  /** One tile per province with no shape to it (pointTileGrid): armies march a province a step. */
  coarse?: boolean;
}

/** What the map tiles are drawn as, in the order tools/mapgen writes them (DETAIL_TERRAINS). */
export const TILE_TERRAINS = [
  "grassland", "farmland", "hills", "mountains", "drylands", "marsh", "forest", "desert", "tundra", "jungle",
  "savanna", "glacier", "badlands", "highlands",
  "snowpeaks", "broadleaf", "mediterranean", "steppe", "dunes", "colddesert", "swamp", "paddies",
] as const;

/** The grounds the simulation counts with, as numbered in a tile's cell. */
export const GROUNDS: readonly Ground[] = ["grassland", "farmland", "hills", "mountains", "drylands", "marsh", "forest", "desert", "tundra", "jungle", "savanna"];

/** The ground each tile terrain counts as (as tools/mapgen's PROVINCE_TERRAIN). */
const TERRAIN_GROUND: Record<(typeof TILE_TERRAINS)[number], Ground> = {
  grassland: "grassland", farmland: "farmland", hills: "hills", mountains: "mountains", drylands: "drylands",
  marsh: "marsh", forest: "forest", desert: "desert", tundra: "tundra", jungle: "jungle", savanna: "savanna",
  glacier: "tundra", badlands: "mountains", highlands: "mountains", snowpeaks: "mountains", broadleaf: "forest",
  mediterranean: "grassland", steppe: "grassland", dunes: "desert", colddesert: "desert", swamp: "marsh", paddies: "farmland",
};

/** Rough height of a tile, by class, in km: snow lies higher up first (as the map's renderer draws it). */
export const HEIGHT_KM = [0.1, 0.5, 0.7, 1.3, 2.1, 3.0, 3.6] as const;
const TERRAIN_HEIGHT: Partial<Record<(typeof TILE_TERRAINS)[number], number>> = { hills: 1, badlands: 2, highlands: 3, mountains: 4, glacier: 5, snowpeaks: 6 };

export const WATER = 15;
const isSea = (terrain: string | undefined): boolean => terrain === "sea" || terrain === "ocean";
export const groundOfCell = (c: number): number => c & 15;
export const riverOfCell = (c: number): boolean => (c & 16) !== 0;
export const heightOfCell = (c: number): number => HEIGHT_KM[c >> 5]!;

/**
 * Builds the grid from the generated map images: province id + 1 per pixel
 * (0 = water), and the terrain image's three bytes per pixel (R terrain
 * index; G water depth band + 1, or 64 + river size on land).
 */
/**
 * The map's land as the living map reads it (VIEW-106): a tile's province
 * and cell by accessor, so a client can read them straight from the images it
 * already holds instead of keeping a second copy of the whole map.
 */
export interface LandGrid {
  width: number;
  height: number;
  /** Province index + 1 of a tile: a sea zone's on its water, 0 for other water (lakes included). */
  provinceAt(t: number): number;
  /** The tile's cell byte, as TileGrid.cell. */
  cellAt(t: number): number;
  centre: ArrayLike<number>;
  bounds: ArrayLike<number>;
}

/** A tile grid read as a LandGrid. */
export const landGrid = (g: TileGrid): LandGrid => ({ width: g.width, height: g.height, provinceAt: (t) => g.province[t]!, cellAt: (t) => g.cell[t]!, centre: g.centre, bounds: g.bounds });

/** The cell byte of a tile from the terrain image's R (terrain index) and G (depth band + 1, or 64 + river size), or WATER. */
export function terrainCell(r: number, g: number): number {
  if (!(g === 0 || g >= 64)) return WATER;
  const name = TILE_TERRAINS[r] ?? "grassland";
  return GROUNDS.indexOf(TERRAIN_GROUND[name]) | (g >= 64 ? 16 : 0) | ((TERRAIN_HEIGHT[name] ?? 0) << 5);
}

/**
 * A LandGrid over the generated map images without copying them: province
 * index + 1 per tile by accessor (0 = water), and the terrain image's bytes.
 * Centres and bounds are worked out in one pass, as tileGridFromImages does.
 */
export function landGridFromImages(rules: Ruleset, width: number, height: number, provincePlusOneAt: (t: number) => number, terrain: ArrayLike<number>, terrainStride = 3): LandGrid {
  const scan = new LandGridScan(rules, width, height, provincePlusOneAt, terrain, terrainStride);
  scan.scan(height);
  return scan.grid();
}

/**
 * landGridFromImages a few rows at a time, so a client can spread the one
 * pass over the whole map (centres and bounds) across frames instead of
 * stalling one. Gives the same grid as landGridFromImages once done.
 */
export class LandGridScan {
  private row = 0;
  private readonly centre: Int32Array;
  private readonly bestD: Float64Array;
  private readonly bounds: Int32Array;
  private readonly cx: Float64Array;
  private readonly cy: Float64Array;
  private readonly provinceAt: (t: number) => number;
  private readonly width: number;
  private readonly height: number;
  private readonly terrain: ArrayLike<number>;
  private readonly stride: number;

  constructor(rules: Ruleset, width: number, height: number, provincePlusOneAt: (t: number) => number, terrain: ArrayLike<number>, stride = 3) {
    this.width = width;
    this.height = height;
    this.terrain = terrain;
    this.stride = stride;
    const P = rules.provinces.length;
    this.centre = new Int32Array(P).fill(-1);
    this.bestD = new Float64Array(P).fill(Infinity);
    this.bounds = new Int32Array(P * 4);
    for (let p = 0; p < P; p++) this.bounds.set([width, height, -1, -1], p * 4);
    this.cx = Float64Array.from(rules.provinces, (p) => p.x ?? NaN);
    this.cy = Float64Array.from(rules.provinces, (p) => p.y ?? NaN);
    this.provinceAt = (t) => {
      const p = provincePlusOneAt(t);
      const g = terrain[t * stride + 1]!;
      if (p > 0 && (g === 0 || g >= 64)) return p;
      // Water keeps its sea zone, as tileGridFromImages gives it (feedback 122).
      return p > 0 && isSea(rules.provinces[p - 1]?.terrain) ? p : 0;
    };
  }

  get done(): boolean {
    return this.row >= this.height;
  }

  /** Scans up to `rows` more rows of the map; true once the whole map is scanned. */
  scan(rows: number): boolean {
    const { width, centre, bestD, bounds: b, cx, cy, provinceAt } = this;
    const end = Math.min(this.height, this.row + rows);
    for (let y = this.row; y < end; y++) {
      for (let x = 0, t = y * width; x < width; x++, t++) {
        const p = provinceAt(t) - 1;
        if (p < 0) continue;
        const d = Number.isNaN(cx[p]!) ? 0 : (x - cx[p]!) ** 2 + (y - cy[p]!) ** 2;
        if (d < bestD[p]!) ((bestD[p] = d), (centre[p] = t));
        const k = p * 4;
        if (x < b[k]!) b[k] = x;
        if (y < b[k + 1]!) b[k + 1] = y;
        if (x > b[k + 2]!) b[k + 2] = x;
        if (y > b[k + 3]!) b[k + 3] = y;
      }
    }
    this.row = end;
    return this.done;
  }

  /** The grid, once the whole map is scanned. */
  grid(): LandGrid {
    if (!this.done) throw new Error("LandGridScan: the map is not scanned yet");
    const { terrain, stride } = this;
    return {
      width: this.width,
      height: this.height,
      provinceAt: this.provinceAt,
      cellAt: (t) => terrainCell(terrain[t * stride]!, terrain[t * stride + 1]!),
      centre: this.centre,
      bounds: this.bounds,
    };
  }
}

export function tileGridFromImages(rules: Ruleset, width: number, height: number, provincePlusOne: ArrayLike<number>, terrain: ArrayLike<number>, terrainStride = 3): TileGrid {
  const n = width * height;
  const province = new Uint16Array(n);
  const cell = new Uint8Array(n);
  const groundIndex = new Map(GROUNDS.map((g, i) => [g, i]));
  for (let t = 0; t < n; t++) {
    const p = provincePlusOne[t]!;
    const r = terrain[t * terrainStride]!;
    const g = terrain[t * terrainStride + 1]!;
    const land = p > 0 && (g === 0 || g >= 64);
    if (!land) {
      // Water keeps its sea zone, so fleets sail tile by tile (feedback 122).
      province[t] = p > 0 && isSea(rules.provinces[p - 1]?.terrain) ? p : 0;
      cell[t] = WATER;
      continue;
    }
    province[t] = p;
    const name = TILE_TERRAINS[r] ?? "grassland";
    cell[t] = groundIndex.get(TERRAIN_GROUND[name])! | (g >= 64 ? 16 : 0) | ((TERRAIN_HEIGHT[name] ?? 0) << 5);
  }
  return { width, height, province, cell, centre: findCentres(rules, width, height, province), bounds: findBounds(rules.provinces.length, width, height, province) };
}

/**
 * A grid for a world laid out as a square of square provinces, `side` tiles
 * each, in province order (the synthetic worlds), all of one ground.
 */
export function blockTileGrid(rules: Ruleset, columns: number, side: number): TileGrid {
  const rows = Math.ceil(rules.provinces.length / columns);
  const width = columns * side;
  const height = rows * side;
  const province = new Uint16Array(width * height);
  const cell = new Uint8Array(width * height).fill(WATER);
  const groundIndex = new Map(GROUNDS.map((g, i) => [g, i]));
  rules.provinces.forEach((p, i) => {
    const x0 = (i % columns) * side;
    const y0 = Math.floor(i / columns) * side;
    const g = groundIndex.get(p.terrain as Ground);
    for (let y = y0; y < y0 + side; y++) {
      for (let x = x0; x < x0 + side; x++) {
        // A sea zone is a block of water tiles of its own.
        if (g === undefined && !isSea(p.terrain)) continue;
        province[y * width + x] = i + 1;
        if (g !== undefined) cell[y * width + x] = g | (p.river ? 16 : 0);
      }
    }
  });
  const centre = Int32Array.from(rules.provinces, (p, i) => (GROUNDS.includes(p.terrain as Ground) || isSea(p.terrain) ? (Math.floor(i / columns) * side + (side >> 1)) * width + (i % columns) * side + (side >> 1) : -1));
  return { width, height, province, cell, centre, bounds: findBounds(rules.provinces.length, width, height, province) };
}

/**
 * A stand-in grid with one tile per province, for engines without the map
 * images (a start-up probe, rule checks): armies step from province centre
 * to province centre, a whole crossing a step, and fight only in one province.
 */
export function pointTileGrid(rules: Ruleset): TileGrid {
  return { ...blockTileGrid(rules, Math.ceil(Math.sqrt(rules.provinces.length)), 1), coarse: true };
}

/** The tile of each province nearest its centre point (or its first tile when it has no centre). */
function findCentres(rules: Ruleset, width: number, height: number, province: Uint16Array): Int32Array {
  const P = rules.provinces.length;
  const best = new Int32Array(P).fill(-1);
  const bestD = new Float64Array(P).fill(Infinity);
  const cx = Float64Array.from(rules.provinces, (p) => p.x ?? NaN);
  const cy = Float64Array.from(rules.provinces, (p) => p.y ?? NaN);
  for (let y = 0, t = 0; y < height; y++) {
    for (let x = 0; x < width; x++, t++) {
      const p = province[t]! - 1;
      if (p < 0) continue;
      const d = Number.isNaN(cx[p]!) ? 0 : (x - cx[p]!) ** 2 + (y - cy[p]!) ** 2;
      if (d < bestD[p]!) {
        bestD[p] = d;
        best[p] = t;
      }
    }
  }
  return best;
}

function findBounds(P: number, width: number, height: number, province: Uint16Array): Int32Array {
  const b = new Int32Array(P * 4);
  for (let p = 0; p < P; p++) b.set([width, height, -1, -1], p * 4);
  for (let y = 0, t = 0; y < height; y++) {
    for (let x = 0; x < width; x++, t++) {
      const p = province[t]! - 1;
      if (p < 0) continue;
      const k = p * 4;
      if (x < b[k]!) b[k] = x;
      if (y < b[k + 1]!) b[k + 1] = y;
      if (x > b[k + 2]!) b[k + 2] = x;
      if (y > b[k + 3]!) b[k + 3] = y;
    }
  }
  return b;
}
