import { hexToRgb, TERRAINS } from "./palette.ts";

/**
 * Close-zoom terrain art. Every terrain gets a row of 16×16 pixel tiles in a
 * small atlas texture; the map shader draws one tile across each 2×2 block of
 * map pixels once you zoom in far enough, so a province turns from a flat
 * colour into fields, forests and mountains.
 *
 * Tiles are painted by code (base colour, dithering, then hand-drawn stamps)
 * so they stay editable as text and the atlas costs nothing to download.
 */

export const TILE = 16;
export const VARIANTS = 4;
/** Atlas rows: one per terrain (same order as TERRAINS), then open sea and shallow sea. */
export const SEA_ROW = TERRAINS.length;
export const SHALLOW_ROW = TERRAINS.length + 1;
export const ATLAS_ROWS = TERRAINS.length + 2;

type RGB = readonly [number, number, number];

/** Small seeded generator so the atlas is identical on every device. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Painter {
  readonly px: RGB[];
  readonly rand: () => number;
  readonly size: number;
  constructor(seed: number, base: string, size = TILE) {
    this.size = size;
    this.rand = rng(seed);
    this.px = new Array<RGB>(size * size).fill(hexToRgb(base));
  }
  set(x: number, y: number, hex: string): void {
    const n = this.size;
    const wx = ((x % n) + n) % n;
    const wy = ((y % n) + n) % n;
    this.px[wy * n + wx] = hexToRgb(hex);
  }
  /** Scatters single pixels of a colour over a fraction of the tile. */
  dither(hex: string, amount: number): void {
    const n = this.size;
    for (let i = 0; i < n * n; i++) if (this.rand() < amount) this.set(i % n, Math.floor(i / n), hex);
  }
  /** A mountain: lit west face, shaded east face, a cap, dark outline. */
  peak(cx: number, baseY: number, halfW: number, height: number, c: PeakColors = GREY_PEAK): void {
    const top = baseY - height;
    for (let y = top; y <= baseY; y++) {
      const t = (y - top) / height;
      const w = Math.round(halfW * t);
      const snow = t < (c.capLine ?? 0.38) + this.rand() * 0.08;
      for (let dx = -w; dx <= w; dx++) {
        const edge = Math.abs(dx) === w || y === baseY;
        const lit = dx < 0 || (dx === 0 && y % 2 === 0);
        const capped = snow && c.cap !== null;
        this.set(cx + dx, y, edge ? c.outline : capped ? (lit ? c.cap! : c.capShade!) : lit ? c.lit : c.shade);
      }
      // A ridge line running down the lit face, and strata on desert rock.
      if (!snow && t > 0.5 && w > 3) this.set(cx - Math.round(w / 2), y, c.ridge);
      if (c.strata && y % 3 === 0 && w > 1) for (let dx = -w + 1; dx < w; dx++) if (dx % 2 === 0) this.set(cx + dx, y, c.strata);
    }
  }
  /** Draws a text sprite; "." is transparent, other characters look up `key`. */
  stamp(rows: readonly string[], x: number, y: number, key: Record<string, string>): void {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row[dx]!;
        if (ch !== ".") this.set(x + dx, y + dy, key[ch]!);
      }
    });
  }
  /** Places `count` copies of a stamp at random spots, keeping them apart. */
  scatter(rows: readonly string[], count: number, key: Record<string, string>, spacing = 4): void {
    const placed: [number, number][] = [];
    for (let tries = 0; placed.length < count && tries < 200; tries++) {
      const x = Math.floor(this.rand() * this.size);
      const y = Math.floor(this.rand() * this.size);
      if (placed.some(([px, py]) => Math.abs(px - x) < spacing && Math.abs(py - y) < spacing)) continue;
      placed.push([x, y]);
    }
    placed.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => this.stamp(rows, x, y, key));
  }
}

interface PeakColors {
  outline: string;
  lit: string;
  shade: string;
  ridge: string;
  cap: string | null;
  capShade: string | null;
  strata?: string;
  /** How far down the peak the snow reaches, 0-1. */
  capLine?: number;
}
/** Temperate and alpine ranges: grey rock, snow caps. */
const GREY_PEAK: PeakColors = { outline: "#4a4552", lit: "#b5aebb", shade: "#77707e", ridge: "#9a94a0", cap: "#f4f4f4", capShade: "#cbdbfc" };
/** High alpine and polar ranges: snow most of the way down. */
const SNOW_PEAK: PeakColors = { outline: "#3e4a62", lit: "#9aa4b4", shade: "#5e6878", ridge: "#c4ccd8", cap: "#ffffff", capShade: "#b8c8e8", capLine: 0.72 };
/** Desert ranges (Atlas, Zagros, the dry Andes): red and ochre rock, banded. */
const RED_PEAK: PeakColors = { outline: "#5a2a1c", lit: "#d8885a", shade: "#9a4a30", ridge: "#e8a878", cap: null, capShade: null, strata: "#c06a44" };
/** Tropical ranges: green, forested slopes, no snow. */
const GREEN_PEAK: PeakColors = { outline: "#1d3a24", lit: "#6aa45a", shade: "#356a3e", ridge: "#86bc6a", cap: "#9ac87a", capShade: "#5e9050" };

// ---- stamps ----
const TUFT = ["d.d", ".d."];
const FLOWER = [".f.", "fcf", ".d."];
const PINE = ["..l..", ".lgl.", ".ggg.", "lgggd", "gggdd", ".gdd.", "..t.."];
const BUSH = [".lg.", "lggd", ".dd."];
const BROADLEAF = [".llg..", "llggg.", "lggggd", "ggggdd", ".gddd.", "..tt.."];
const PALM = ["l.l.l", ".lgl.", "l.t.l", "..t..", "..t.."];
const HUMP = ["..llll..", ".lgggggd", "lggggggd", "ggggggdd"];
const REEDS = ["y.y", "d.d", "dyd", "d.d"];
const POOL = [".www.", "wwwww", ".www."];
const ROCKS = ["r.", "rd"];
const SNOW = [".ww.", "wwww", ".ww."];
const WAVE = [".ww.", "w..w"];
const SPARK = ["f"];
const ACACIA = [".llggg.", "lggggdd", "..t.t..", "...t...", "...t..."];
const CREVASSE = ["d...", ".dd.", "...d"];
const OLIVE = [".lg.", "lggd", ".gd.", ".t.."];
const CYPRESS = [".g.", "lgd", "lgd", "lgd", ".t."];
const OAK = ["..lgg..", ".llggd.", "lgggggd", "lggggdd", ".gdddd.", "...t...", "...t..."];
const STONES = ["s.", ".s"];
const MANGROVE = [".lgg.", "lgggd", ".ddd.", "t.t.t"];
const MESA = ["..llllll..", ".lllllldd.", ".sssssssd.", "lllllllddd", "ssssssssdd"];

type Paint = (p: Painter) => void;

/**
 * A range of overlapping peaks covering the whole 32 × 32 picture (it wraps,
 * so neighbouring blocks join up): no gaps of flat ground inside a range.
 */
function rangeOf(p: Painter, c: PeakColors): void {
  const peaks: [number, number, number, number][] = [
    [5, 9, 7, 10], [19, 12, 9, 13], [30, 6, 6, 9], [12, 21, 8, 11], [27, 22, 8, 12],
    [4, 30, 8, 11], [19, 32, 9, 12], [31, 31, 6, 8],
  ];
  for (const [x, y, w, h] of peaks) p.peak(x + Math.floor(p.rand() * 3) - 1, y, w, h + Math.floor(p.rand() * 3) - 1, c);
}

const PAINT: Record<(typeof TERRAINS)[number] | "sea" | "shallow", Paint> = {
  grassland: (p) => {
    p.dither("#47b864", 0.18);
    p.dither("#2f9a52", 0.1);
    p.scatter(TUFT, 5, { d: "#257a42" }, 4);
    if (p.rand() < 0.7) p.scatter(FLOWER, 1 + Math.floor(p.rand() * 2), { f: p.rand() < 0.5 ? "#fbf236" : "#f4f4f4", c: "#ef7d57", d: "#257a42" }, 6);
    if (p.rand() < 0.5) p.scatter(BUSH, 1, { l: "#73c25a", g: "#2f8a4a", d: "#1d5e38" });
  },
  farmland: (p) => {
    const crops: [string, string][] = [
      ["#d9c27a", "#cbb26a"], // wheat
      ["#7cb84a", "#6eaa42"], // young crops
      ["#9a6b45", "#8a5f3d"], // ploughed earth
      ["#e4cf86", "#d6c078"], // barley
      ["#5cae55", "#52a24c"], // meadow
    ];
    const cut = 5 + Math.floor(p.rand() * 6);
    const split = 5 + Math.floor(p.rand() * 6);
    const patches = [
      { x0: 0, x1: cut, y0: 0, y1: TILE },
      { x0: cut, x1: TILE, y0: 0, y1: split },
      { x0: cut, x1: TILE, y0: split, y1: TILE },
    ];
    for (const patch of patches) {
      const [base, row] = crops[Math.floor(p.rand() * crops.length)]!;
      const vertical = p.rand() < 0.5;
      for (let y = patch.y0; y < patch.y1; y++) {
        for (let x = patch.x0; x < patch.x1; x++) p.set(x, y, (vertical ? x : y) % 2 === 0 ? row : base);
      }
    }
    // Hedgerows along the tile's top and left edges and between the patches.
    for (let i = 0; i < TILE; i++) {
      p.set(i, 0, "#3f6f2e");
      p.set(0, i, "#3f6f2e");
      p.set(cut, i, "#3f6f2e");
      if (i >= cut) p.set(i, split, "#3f6f2e");
    }
    p.scatter(["t"], 3, { t: "#2a5225" }, 5);
    if (p.rand() < 0.35) p.stamp([".r.", "rrr", "wbw"], cut + 2 + Math.floor(p.rand() * 4), 2 + Math.floor(p.rand() * 3), { r: "#b13e53", w: "#f4f4f4", b: "#8b5a3c" });
  },
  hills: (p) => {
    p.dither("#a8b45a", 0.15);
    p.dither("#7d8f45", 0.1);
    p.scatter(HUMP, 3, { l: "#c8cf7a", g: "#94a24e", d: "#6a7838" }, 6);
    p.scatter(TUFT, 2, { d: "#5f6e33" }, 4);
  },
  // Mountains are one 32×32 picture split over the four variants (see BIG_ROWS),
  // so a range of peaks spans 4 × 4 map pixels instead of repeating every two.
  mountains: (p) => {
    p.dither("#6f6a74", 0.25);
    p.dither("#9a94a0", 0.12);
    p.scatter(ROCKS, 8, { r: "#9a94a0", d: "#4a4552" }, 5);
    rangeOf(p, GREY_PEAK);
  },
  snowpeaks: (p) => {
    p.dither("#ffffff", 0.3);
    p.dither("#b8c8e8", 0.18);
    p.scatter(ROCKS, 5, { r: "#9aa4b4", d: "#5e6878" }, 6);
    rangeOf(p, SNOW_PEAK);
  },
  drylands: (p) => {
    p.dither("#e2c79a", 0.15);
    p.dither("#c9a676", 0.12);
    p.scatter(TUFT, 4, { d: "#a08850" }, 5);
    p.scatter(ROCKS, 1, { r: "#b7a084", d: "#8a7054" });
    if (p.rand() < 0.4) p.scatter(BUSH, 1, { l: "#a3a86a", g: "#7a8a4a", d: "#5a6a3a" });
  },
  marsh: (p) => {
    p.dither("#6b8a52", 0.15);
    p.dither("#4e6a3e", 0.12);
    p.scatter(POOL, 2, { w: "#3b6fb5" }, 7);
    p.scatter(REEDS, 4, { y: "#d9c27a", d: "#3a5530" }, 4);
  },
  forest: (p) => {
    p.dither("#1d5444", 0.25);
    p.dither("#2b6a50", 0.15);
    p.scatter(PINE, 6, { l: "#4fa077", g: "#257a5c", d: "#164a3c", t: "#5a3a2a" }, 4);
  },
  desert: (p) => {
    p.dither("#ecc888", 0.15);
    // Dunes: a light crest with shade under it.
    for (let k = 0; k < 2; k++) {
      const y0 = 3 + k * 7 + Math.floor(p.rand() * 3);
      const phase = p.rand() * 6.28;
      for (let x = 0; x < TILE; x++) {
        const y = y0 + Math.round(Math.sin(x / 2.5 + phase) * 1.4);
        p.set(x, y, "#f6dca6");
        p.set(x, y + 1, "#c79a5a");
        if (x % 3 === 0) p.set(x, y + 2, "#d4a868");
      }
    }
    if (p.rand() < 0.25) p.scatter(ROCKS, 1, { r: "#c49a5a", d: "#9a7040" });
  },
  tundra: (p) => {
    p.dither("#8a9ea8", 0.18);
    p.dither("#b0c0c8", 0.12);
    p.scatter(SNOW, 3, { w: "#e4ecfc" }, 5);
    p.scatter(TUFT, 3, { d: "#5e7268" }, 4);
    p.scatter(ROCKS, 1, { r: "#a8a2ad", d: "#5a5560" });
  },
  jungle: (p) => {
    p.dither("#1f5a2e", 0.3);
    p.scatter(BROADLEAF, 4, { l: "#7ccf5a", g: "#3f9a45", d: "#1d5a2a", t: "#5a3a2a" }, 5);
    if (p.rand() < 0.6) p.scatter(PALM, 1, { l: "#8ad866", g: "#3f9a45", t: "#7a5a3a" });
  },
  savanna: (p) => {
    p.dither("#d4c060", 0.18);
    p.dither("#a89a3a", 0.12);
    p.scatter(TUFT, 4, { d: "#8a7a2a" }, 4);
    if (p.rand() < 0.75) p.scatter(ACACIA, 1 + Math.floor(p.rand() * 2), { l: "#7aa04a", g: "#557a32", d: "#3a5a24", t: "#5a3a2a" }, 8);
  },
  glacier: (p) => {
    p.dither("#ffffff", 0.2);
    p.dither("#d4e0f4", 0.15);
    p.scatter(CREVASSE, 3, { d: "#9ab0d8" }, 6);
  },
  badlands: (p) => {
    p.dither("#9a4a30", 0.18);
    p.dither("#c8784a", 0.12);
    p.scatter(ROCKS, 6, { r: "#d8885a", d: "#5a2a1c" }, 6);
    rangeOf(p, RED_PEAK);
    p.stamp(MESA, 18, 2, { l: "#e0905e", s: "#b0603c", d: "#7a3a24" });
  },
  highlands: (p) => {
    p.dither("#2e6a3a", 0.25);
    p.dither("#4a8a4a", 0.12);
    p.scatter(BROADLEAF, 6, { l: "#7ccf5a", g: "#3f9a45", d: "#1d5a2a", t: "#5a3a2a" }, 7);
    rangeOf(p, GREEN_PEAK);
  },
  broadleaf: (p) => {
    p.dither("#2e5a26", 0.3);
    p.dither("#4a7a32", 0.12);
    const autumn = p.rand() < 0.3;
    p.scatter(OAK, 5, { l: autumn ? "#d8a040" : "#7ab84a", g: autumn ? "#b0682c" : "#3f8a3a", d: autumn ? "#7a4020" : "#245a28", t: "#5a3a2a" }, 6);
    p.scatter(BUSH, 2, { l: "#73c25a", g: "#2f8a4a", d: "#1d5e38" }, 5);
  },
  mediterranean: (p) => {
    p.dither("#bcb46a", 0.18);
    p.dither("#8a8a4a", 0.12);
    p.scatter(OLIVE, 4, { l: "#b4c49a", g: "#7a9070", d: "#4a5a44", t: "#6a4a32" }, 5);
    if (p.rand() < 0.6) p.scatter(CYPRESS, 1 + Math.floor(p.rand() * 2), { l: "#4a7a40", g: "#2a5a30", d: "#1a3a22", t: "#5a3a2a" }, 6);
    p.scatter(STONES, 2, { s: "#d8d0b0" }, 5);
  },
  steppe: (p) => {
    p.dither("#d4d08a", 0.2);
    p.dither("#a8a85a", 0.14);
    // Wind-combed grass: short streaks across the tile.
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(p.rand() * TILE);
      const y = Math.floor(p.rand() * TILE);
      for (let k = 0; k < 4; k++) p.set(x + k, y, k % 2 ? "#9a9a4a" : "#e0dc9a");
    }
    p.scatter(TUFT, 4, { d: "#8a8a3a" }, 4);
  },
  dunes: (p) => {
    p.dither("#f0bc6a", 0.15);
    // Tall crescent dunes: bright windward slope, deep shadow behind the crest.
    for (let k = 0; k < 3; k++) {
      const y0 = 2 + k * 5 + Math.floor(p.rand() * 2);
      const phase = p.rand() * 6.28;
      for (let x = 0; x < TILE; x++) {
        const y = y0 + Math.round(Math.sin(x / 2.6 + phase) * 1.8);
        p.set(x, y - 1, "#fad89a");
        p.set(x, y, "#ffe8b4");
        p.set(x, y + 1, "#b8783a");
        p.set(x, y + 2, "#d09048");
      }
    }
  },
  colddesert: (p) => {
    p.dither("#bcae96", 0.2);
    p.dither("#8a7e6a", 0.16);
    p.scatter(STONES, 6, { s: "#6a604e" }, 3);
    p.scatter(ROCKS, 2, { r: "#c8bca4", d: "#5a5040" }, 6);
    p.scatter(TUFT, 2, { d: "#7a7a4a" }, 6);
    if (p.rand() < 0.4) p.scatter(SNOW, 1, { w: "#e8ecf4" });
  },
  swamp: (p) => {
    p.dither("#2e4a30", 0.3);
    p.scatter(POOL, 3, { w: "#2e5a6a" }, 6);
    p.scatter(MANGROVE, 3, { l: "#6aa84a", g: "#2f7a3a", d: "#1a4a2a", t: "#4a3a2a" }, 6);
    p.scatter(REEDS, 2, { y: "#a8b46a", d: "#2a4a2a" }, 4);
  },
  paddies: (p) => {
    // Flooded terraces: green rice in water, earth dikes between them.
    const rows = [0, 5 + Math.floor(p.rand() * 2), 11];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const dike = rows.includes(y) || (x === 7 && y > rows[1]!) || (x === 10 && y < rows[1]!);
        const wet = (x * 7 + y * 3) % 5 === 0;
        p.set(x, y, dike ? "#8a6a3a" : wet ? "#5a9ab8" : (x + y) % 2 ? "#6ec060" : "#8ad070");
      }
    }
    p.scatter(SPARK, 2, { f: "#b4e8f4" }, 5);
  },
  sea: (p) => {
    p.dither("#1f3462", 0.12);
    p.scatter(WAVE, 2, { w: "#2f5596" }, 7);
  },
  shallow: (p) => {
    p.dither("#3463a6", 0.15);
    p.scatter(WAVE, 2, { w: "#5a8fd0" }, 6);
    p.scatter(SPARK, 1, { f: "#73eff7" });
  },
};

const BASE: Record<keyof typeof PAINT, string> = {
  grassland: "#3ea85a",
  farmland: "#d9c27a",
  hills: "#94a24e",
  mountains: "#847e87",
  drylands: "#d6b886",
  marsh: "#5e7a4a",
  forest: "#21604a",
  desert: "#e0b878",
  tundra: "#9badb7",
  jungle: "#2a6b36",
  savanna: "#c2b04a",
  glacier: "#e8f0fc",
  badlands: "#b0583a",
  highlands: "#3f7a44",
  snowpeaks: "#dfe6f2",
  broadleaf: "#2e5a26",
  mediterranean: "#a8a45a",
  steppe: "#c4c278",
  dunes: "#eab060",
  colddesert: "#a89a84",
  swamp: "#3e5a3a",
  paddies: "#6ec060",
  sea: "#243a6b",
  shallow: "#2b5a9c",
};

/** Base colours of the two water rows, so the map can shift them by depth. */
export const WATER_BASE = { sea: BASE.sea, shallow: BASE.shallow };

/** Average colour of each atlas row, for the flat far-zoom map so it matches the close-up art. */
export function rowColors(atlas: { width: number; rgba: Uint8Array }): number[] {
  const out: number[] = [];
  for (let row = 0; row < ATLAS_ROWS; row++) {
    const sum = [0, 0, 0];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < atlas.width; x++) {
        const o = ((row * TILE + y) * atlas.width + x) * 4;
        for (let k = 0; k < 3; k++) sum[k]! += atlas.rgba[o + k]!;
      }
    }
    for (let k = 0; k < 3; k++) out.push(sum[k]! / (TILE * atlas.width) / 255);
  }
  return out;
}

/**
 * Rows drawn as one 32×32 picture whose quarters fill the four variants; the
 * shader picks the quarter by position (and mirrors some) instead of at random.
 */
export const BIG_ROWS = ["mountains", "badlands", "highlands", "snowpeaks"].map((t) => TERRAINS.indexOf(t as (typeof TERRAINS)[number]));

/** Builds the atlas as RGBA bytes: VARIANTS tiles across, ATLAS_ROWS down. */
export function buildTileAtlas(): { width: number; height: number; rgba: Uint8Array } {
  const width = TILE * VARIANTS;
  const height = TILE * ATLAS_ROWS;
  const rgba = new Uint8Array(width * height * 4);
  const rows = [...TERRAINS, "sea", "shallow"] as const;
  rows.forEach((name, row) => {
    const big = BIG_ROWS.includes(row) ? new Painter(row * 97 + 1, BASE[name], TILE * 2) : null;
    if (big) PAINT[name](big);
    for (let v = 0; v < VARIANTS; v++) {
      const p = big ?? new Painter(row * 97 + v * 13 + 1, BASE[name]);
      if (!big) PAINT[name](p);
      const ox = big ? (v & 1) * TILE : 0;
      const oy = big ? (v >> 1) * TILE : 0;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const o = ((row * TILE + y) * width + v * TILE + x) * 4;
          const c = p.px[(oy + y) * p.size + ox + x]!;
          rgba[o] = c[0];
          rgba[o + 1] = c[1];
          rgba[o + 2] = c[2];
          rgba[o + 3] = 255;
        }
      }
    }
  });
  return { width, height, rgba };
}

let atlasCache: ReturnType<typeof buildTileAtlas> | null = null;

/** One tile as a canvas, scaled up, for the style sheet. */
export function tileCanvas(row: number, variant: number, scale: number): HTMLCanvasElement {
  const atlas = (atlasCache ??= buildTileAtlas());
  const c = document.createElement("canvas");
  c.width = c.height = TILE * scale;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const o = ((row * TILE + y) * atlas.width + variant * TILE + x) * 4;
      ctx.fillStyle = `rgb(${atlas.rgba[o]},${atlas.rgba[o + 1]},${atlas.rgba[o + 2]})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

/**
 * The same atlas at half size (8 × 8 tiles), for middle zoom where a map
 * pixel is only a few screen pixels: each 2 × 2 block keeps its most common
 * colour, so trees and peaks stay crisp instead of blurring.
 */
export function buildMiniAtlas(): { width: number; height: number; rgba: Uint8Array } {
  const full = (atlasCache ??= buildTileAtlas());
  const width = full.width / 2;
  const height = full.height / 2;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const votes = new Map<number, number>();
      let best = 0;
      let bestN = 0;
      for (let k = 0; k < 4; k++) {
        const o = ((y * 2 + (k >> 1)) * full.width + x * 2 + (k & 1)) * 4;
        const c = (full.rgba[o]! << 16) | (full.rgba[o + 1]! << 8) | full.rgba[o + 2]!;
        const n = (votes.get(c) ?? 0) + 1;
        votes.set(c, n);
        if (n > bestN) ((best = c), (bestN = n));
      }
      const o = (y * width + x) * 4;
      rgba[o] = best >> 16;
      rgba[o + 1] = (best >> 8) & 255;
      rgba[o + 2] = best & 255;
      rgba[o + 3] = 255;
    }
  }
  return { width, height, rgba };
}
