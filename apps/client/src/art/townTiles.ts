import { hexToRgb, PALETTE } from "./palette.ts";

/**
 * Living-map town art. Each town cell kind (livingMap.cellKinds in
 * map-presentation.json, skipping "none") gets a row of 16 × 16 tiles: one map
 * pixel in the living band, painted at twice the ground's art density so a
 * town pixel shows proper little houses, and the keep a small castle
 * (feedback 126). The map shader draws a tile over the terrain where a map
 * pixel carries that kind in its settlement byte; alpha 0 lets the terrain
 * show through (hamlets, outskirts, works).
 *
 * Painted by code like the terrain atlas in tiles.ts: a few colours from the
 * palette, seeded randomness, and small text stamps. Houses are seen from
 * above at a slight 3/4 angle: a ridge, tiled roof courses and a dark eave,
 * then the wall with its windows and door, a chimney on some, and on paved
 * ground a shadow to the south-east.
 */

export const TOWN_TILE = 16; // art pixels per map pixel in the town atlas (the ground has 8 in the living band, 16 at street level)
export const TOWN_VARIANTS = 4;
/** Rows in kind order from livingMap.cellKinds, skipping "none": hamlet, outskirts, core, keep, market, worship, docks, drill yard, works, ash, site, landmark (row = kind code - 1). */
export const TOWN_ROWS = 12;
/** Flag pixels on keeps (and landmarks) are painted in this exact colour so the shader can swap it for the realm colour. No other town pixel uses it. */
export const TOWN_FLAG = PALETTE.blood;

type RGB = readonly [number, number, number];
const N = TOWN_TILE;

/** Small seeded generator so the atlas is identical on every device (same as tiles.ts). */
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

/** A 16 × 16 picture with transparency (null). Unlike the terrain painter it clips instead of wrapping. */
class TownPainter {
  readonly px: (RGB | null)[];
  /** Pixels still showing the base ground (paving, earth), where shadows may fall. */
  readonly ground: boolean[];
  readonly rand: () => number;
  constructor(seed: number, base: string | null) {
    this.rand = rng(seed);
    this.px = new Array<RGB | null>(N * N).fill(base === null ? null : hexToRgb(base));
    this.ground = new Array<boolean>(N * N).fill(base !== null);
  }
  set(x: number, y: number, hex: string): void {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    this.px[y * N + x] = hexToRgb(hex);
    this.ground[y * N + x] = false;
  }
  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, hex);
  }
  /** Fills the whole tile with a ground colour that shadows can fall on. */
  fill(hex: string): void {
    this.px.fill(hexToRgb(hex));
    this.ground.fill(true);
  }
  /** Scatters single pixels over the opaque part of the tile (ground stays ground). */
  dither(hex: string, amount: number): void {
    for (let i = 0; i < N * N; i++) if (this.px[i] && this.rand() < amount) this.px[i] = hexToRgb(hex);
  }
  /** Darkens a ground pixel (a cast shadow); buildings and transparent pixels are left alone. */
  shade(x: number, y: number, hex: string): void {
    if (x < 0 || y < 0 || x >= N || y >= N || !this.ground[y * N + x]) return;
    this.px[y * N + x] = hexToRgb(hex);
    this.ground[y * N + x] = false;
  }
  /** Draws a text sprite; "." is left as it is, other characters look up `key`. */
  stamp(rows: readonly string[], x: number, y: number, key: Record<string, string>, mirror = false): void {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row[mirror ? row.length - 1 - dx : dx]!;
        if (ch !== ".") this.set(x + dx, y + dy, key[ch]!);
      }
    });
  }
  int(n: number): number {
    return Math.floor(this.rand() * n);
  }
  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)]!;
  }
}

// ---- colours (all from PALETTE or already used in tiles.ts) ----
interface Roof { l: string; b: string; d: string }
const TERRACOTTA: Roof = { l: "#ef7d57", b: "#c06a44", d: "#9a4a30" };
const CLAY: Roof = { l: "#e8a878", b: "#d9a066", d: "#9a6b45" };
const BRICK: Roof = { l: "#b0583a", b: "#9a4a30", d: "#5a2a1c" };
const SLATE: Roof = { l: "#566c86", b: "#4a4552", d: "#333c57" };
const THATCH: Roof = { l: "#e4cf86", b: "#d9c27a", d: "#a08850" };
/** Town roofs, weighted: mostly terracotta and clay, some brick and slate. */
const TOWN_ROOFS = [TERRACOTTA, TERRACOTTA, TERRACOTTA, CLAY, CLAY, BRICK, BRICK, SLATE] as const;
const VILLAGE_ROOFS = [THATCH, THATCH, TERRACOTTA, CLAY] as const;
/** House walls, each with its shaded east side. */
const WALLS = [["#f4f4f4", "#d8d0b0"], ["#eec39a", "#d9a066"], ["#d8d0b0", "#a8a2ad"]] as const;

const INK = "#1a1c2c";
const OUTLINE = "#4a4552";
const NIGHT = "#333c57";
const COBBLE = "#847e87";
const COBBLE_LIT = "#9a94a0";
const COBBLE_DARK = "#6f6a74";
const STONE = "#d8d0b0";
const STONE_SHADE = "#a8a2ad";
const STONE_LIT = "#b5aebb";
const STONE_DARK = "#77707e";
const EARTH = "#c9a676";
const EARTH_DARK = "#b7a084";
const SQUARE = "#d6b886";
const WOOD = "#8b5a3c";
const WOOD_DARK = "#5a3a2a";
const PLANK = "#d9a066";
const SKIN = "#eec39a";
const GOLD = "#ffcd75";
const WATER = "#3b6fb5";
const STEEL = "#9aa4b4";
const TREE: Record<string, string> = { l: "#73c25a", g: "#2f8a4a", d: "#1d5e38", t: WOOD_DARK };
const TREE_ART = [".lg.", "lggd", "lggd", ".dt."];
const BODIES = ["#566c86", "#ef7d57", "#257179", "#5d275d", INK, "#b0583a"] as const;

/**
 * A house seen from above at 3/4: a lit ridge, roof courses in two shades
 * with the east end in shadow, a dark eave, then the wall (2 or 3 rows) with
 * windows and a door. 4 to 9 wide, 5 to 8 tall. On paved ground it casts a
 * shadow one pixel to the east and south.
 */
function house(p: TownPainter, x: number, y: number, w: number, h: number, roof: Roof, wall: readonly [string, string], shadow: string | null = null): void {
  const wallRows = h >= 7 ? 3 : 2;
  const roofRows = h - wallRows;
  for (let r = 0; r < roofRows; r++) {
    for (let c = 0; c < w; c++) {
      let hex: string;
      if (r === roofRows - 1) hex = roof.d;
      else if (c === w - 1) hex = r === 0 ? roof.b : roof.d;
      else if (r === 0) hex = roof.l;
      else hex = r % 2 === 1 ? roof.b : roof.l;
      p.set(x + c, y + r, hex);
    }
  }
  // Tile joints: a few dark notches in the shaded courses.
  for (let r = 1; r < roofRows - 1; r += 2) for (let c = 1 + (r % 4 === 1 ? 0 : 1); c < w - 1; c += 3) p.set(x + c, y + r, roof.d);
  for (let r = roofRows; r < h; r++) for (let c = 0; c < w; c++) p.set(x + c, y + r, c === w - 1 ? wall[1] : wall[0]);
  // Door on the bottom two rows; windows either side on the top wall row.
  const door = x + 1 + p.int(Math.max(1, w - 3));
  p.set(door, y + h - 1, WOOD_DARK);
  p.set(door, y + h - 2, wallRows === 3 ? WOOD_DARK : INK);
  if (wallRows === 3) p.set(door, y + h - 3, wall[1]);
  const winRow = y + roofRows;
  for (let c = 1; c < w - 1; c += 2) if (x + c !== door && (wallRows === 3 || Math.abs(x + c - door) > 1)) p.set(x + c, winRow, NIGHT);
  // A chimney on some, standing on the back of the roof.
  if (roofRows >= 3 && p.rand() < 0.6) {
    const cx = x + 1 + p.int(w - 2);
    p.set(cx, y - 1, OUTLINE);
    p.set(cx, y, BRICK.d);
  }
  if (shadow !== null) {
    for (let r = 1; r <= h; r++) p.shade(x + w, y + r, shadow);
    for (let c = 1; c <= w; c++) p.shade(x + c, y + h, shadow);
  }
}

function townHouse(p: TownPainter, x: number, y: number, w: number, h: number): void {
  house(p, x, y, w, h, p.pick(TOWN_ROOFS), p.pick(WALLS), COBBLE_DARK);
}

function villageHouse(p: TownPainter, x: number, y: number, w = 6, h = 6): void {
  house(p, x, y, w, h, p.pick(VILLAGE_ROOFS), p.pick(WALLS));
}

/** A terrace: houses wall to wall, each its own roof, some a row taller. */
function terrace(p: TownPainter, x: number, y: number, widths: readonly number[], h: number): void {
  let cx = x;
  for (const w of widths) {
    const tall = p.rand() < 0.4 ? 1 : 0;
    townHouse(p, cx, y + 1 - tall, w, h - 1 + tall);
    cx += w;
  }
}

/** Strip fields: furrows a pixel apart, the crop changing every four lines. */
function field(p: TownPainter, x: number, y: number, w: number, h: number, vertical = false): void {
  const crops: [string, string][] = [
    ["#d9c27a", "#cbb26a"],
    ["#7cb84a", "#6eaa42"],
    ["#e4cf86", "#d6c078"],
    ["#5cae55", "#4b692f"],
  ];
  const first = p.int(crops.length);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const line = vertical ? dx : dy;
      const [a, b] = crops[(first + Math.floor(line / 4)) % crops.length]!;
      p.set(x + dx, y + dy, line % 2 === 0 ? a : b);
    }
  }
}

/** A dirt path two pixels wide through the listed cells (each the path's top-left pixel). */
function path(p: TownPainter, cells: readonly [number, number][]): void {
  for (const [x, y] of cells) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) p.set(x + dx, y + dy, (x + dx + y + dy) % 3 === 0 ? EARTH_DARK : EARTH);
  }
}
const row = (y: number, x0 = 0, x1 = N - 2): [number, number][] => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y]);
const column = (x: number, y0 = 0, y1 = N - 2): [number, number][] => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i]);

/** Cobbles: stones lit on top, joints dark, scattered. */
function cobbles(p: TownPainter): void {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + 2 * y) % 5 === 0 && p.rand() < 0.7) p.px[y * N + x] = hexToRgb(COBBLE_DARK);
  p.dither(COBBLE_LIT, 0.14);
}

function tree(p: TownPainter, x: number, y: number): void {
  p.stamp(TREE_ART, x, y, TREE);
}

/** A tiny person: head, body, legs. */
function person(p: TownPainter, x: number, y: number, body: string): void {
  p.set(x, y, SKIN);
  p.set(x, y + 1, body);
  p.set(x, y + 2, NIGHT);
}

/** A haystack. */
function hay(p: TownPainter, x: number, y: number): void {
  p.stamp([".ll.", "lllb", "lbbb", ".dd."], x, y, { l: THATCH.l, b: THATCH.b, d: THATCH.d });
}

type TownPaint = (p: TownPainter, v: number) => void;

// ---- the keep ----
const KEEP = [
  "oToTo..pff.oToTo",
  "oTTtomcpffcoTTto",
  "oTTtoWWpWWWoTTto",
  "oFFFowwKpkwoFFFo",
  "oFxFoyKKKkkoFxFo",
  "mWyyKKKKKkkkyyWm",
  "WWyyeeeeeeeeyyWW",
  "mWyyddddddDDyyWm",
  "WWbyddxddxdDybWW",
  "mWyyddddgddDyyWm",
  "WWyyddddgddDyyWW",
  "oToTomcmcmcoToTo",
  "oTTtoWWWWWWoTTto",
  "oFFFowOggOwoFFFo",
  "oFxFowgGGgwoFxFo",
  "oFFFowgGGgwoFFFo",
];
const KEEP_KEY: Record<string, string> = {
  o: OUTLINE, T: STONE, t: STONE_LIT, F: COBBLE_LIT, x: INK, m: STONE_LIT, c: OUTLINE, W: STONE_SHADE, w: STONE_DARK,
  O: STONE, g: INK, G: WOOD_DARK, y: EARTH, b: "#2f8a4a", K: "#566c86", k: NIGHT, e: INK, d: "#f4f4f4", D: STONE,
  p: INK, f: TOWN_FLAG,
};

const PAINT: TownPaint[] = [
  // 1 hamlet: one or two small houses on strip fields, mostly transparent.
  (p, v) => {
    if (v === 0) {
      villageHouse(p, 2, 2);
      tree(p, 10, 3);
      field(p, 1, 10, 13, 4);
    } else if (v === 1) {
      villageHouse(p, 1, 1);
      villageHouse(p, 9, 4, 5, 5);
      field(p, 3, 11, 10, 4, true);
    } else if (v === 2) {
      field(p, 0, 2, 6, 12, true);
      villageHouse(p, 8, 4, 7, 6);
      hay(p, 9, 11);
    } else {
      villageHouse(p, 6, 1, 7, 6);
      hay(p, 1, 3);
      field(p, 0, 9, 11, 5);
      tree(p, 12, 9);
    }
  },
  // 2 outskirts: scattered houses among strip fields and a path.
  (p, v) => {
    if (v === 0) {
      villageHouse(p, 0, 0);
      townHouse(p, 9, 0, 6, 6);
      path(p, row(7));
      field(p, 0, 10, 7, 6);
      townHouse(p, 9, 10, 6, 6);
    } else if (v === 1) {
      path(p, column(7));
      townHouse(p, 0, 1, 6, 6);
      villageHouse(p, 10, 0, 6, 6);
      field(p, 10, 8, 6, 8, true);
      field(p, 0, 10, 6, 6);
    } else if (v === 2) {
      field(p, 0, 0, 7, 16, true);
      path(p, column(8));
      townHouse(p, 10, 0, 6, 6);
      villageHouse(p, 10, 9, 6, 6);
    } else {
      field(p, 8, 0, 8, 6);
      townHouse(p, 0, 0, 6, 7);
      path(p, [[0, 12], [1, 12], [2, 11], [3, 11], [4, 10], [5, 10], [6, 9], [7, 9], [8, 8], [9, 8], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7]]);
      villageHouse(p, 8, 10, 6, 6);
      tree(p, 1, 14);
    }
  },
  // 3 core: packed houses and terraces on cobbles with narrow streets (fully opaque).
  (p, v) => {
    cobbles(p);
    if (v === 0) {
      terrace(p, 0, 0, [5, 5, 5], 7);
      terrace(p, 1, 8, [6, 8], 7);
      person(p, 15, 9, p.pick(BODIES));
    } else if (v === 1) {
      townHouse(p, 0, 1, 9, 6);
      townHouse(p, 10, 0, 5, 7);
      townHouse(p, 0, 9, 6, 7);
      tree(p, 7, 10);
      townHouse(p, 11, 9, 5, 6);
      person(p, 9, 7, p.pick(BODIES));
    } else if (v === 2) {
      terrace(p, 0, 0, [4, 5, 6], 7);
      townHouse(p, 1, 9, 6, 7);
      townHouse(p, 9, 9, 7, 6);
      person(p, 8, 10, p.pick(BODIES));
      person(p, 3, 7, p.pick(BODIES));
    } else {
      townHouse(p, 0, 1, 6, 8);
      terrace(p, 7, 0, [4, 5], 7);
      townHouse(p, 0, 11, 7, 5);
      townHouse(p, 9, 9, 6, 7);
      // A cart in the street.
      p.stamp(["pp", "ww"], 7, 9, { p: PLANK, w: WOOD_DARK });
    }
  },
  // 4 keep: a castle with four crenellated corner towers, a gatehouse, a slate-roofed donjon and the realm's flag.
  (p, v) => {
    cobbles(p);
    // Variant 3 has a red-tiled donjon.
    const key = v === 3 ? { ...KEEP_KEY, K: TERRACOTTA.l, k: TERRACOTTA.d, e: BRICK.d } : KEEP_KEY;
    p.stamp(KEEP, 0, 0, key, v === 1);
    if (v === 2) {
      // Pennants on the north towers, more green in the courtyard.
      p.stamp(["pf", "p."], 2, 0, { p: INK, f: TOWN_FLAG });
      p.stamp(["pf", "p."], 13, 0, { p: INK, f: TOWN_FLAG });
      for (const [x, y] of [[2, 5], [3, 7], [13, 6], [12, 9], [2, 10], [13, 10]] as const) p.set(x, y, "#2f8a4a");
    } else if (v === 3) {
      // A well in the courtyard.
      p.stamp(["rR", "bR"], 2, 9, { r: STONE_LIT, R: STONE_DARK, b: WATER });
    }
  },
  // 5 market: a paved square with striped stalls, a well and people.
  (p, v) => {
    p.fill(SQUARE);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x % 4 === 0 || y % 4 === 0) && p.rand() < 0.35) p.px[y * N + x] = hexToRgb(EARTH_DARK);
    p.dither(STONE, 0.08);
    const awnings: [string, string][] = [["#ef7d57", "#9a4a30"], ["#257179", "#164a3c"], [WATER, "#29366f"], [GOLD, "#d9a066"], ["#5d275d", "#3a1a3a"], ["#5cae55", "#2f8a4a"]];
    const stall = (x: number, y: number) => {
      const [a, d] = p.pick(awnings);
      const goods = p.pick([GOLD, "#7cb84a", PLANK, "#ef7d57", "#cbdbfc"]);
      p.stamp(["apapa", "apapa", "dPdPd", "wgcgw", "w...w"], x, y, { a, d, p: "#f4f4f4", P: STONE_SHADE, w: WOOD_DARK, c: goods, g: p.pick([PLANK, "#7cb84a", GOLD]) });
      for (let c = 1; c <= 5; c++) p.shade(x + c, y + 5, EARTH_DARK);
    };
    const well = (x: number, y: number) => {
      p.stamp([".ww.", "rwwR", "rbbR", "RRRR"], x, y, { w: WOOD, r: STONE_LIT, R: STONE_DARK, b: WATER });
      for (let c = 1; c <= 4; c++) p.shade(x + c, y + 4, EARTH_DARK);
    };
    if (v === 0) {
      stall(1, 1); stall(10, 1); stall(1, 9);
      well(10, 10);
      person(p, 7, 3, p.pick(BODIES)); person(p, 8, 11, p.pick(BODIES)); person(p, 5, 6, p.pick(BODIES));
    } else if (v === 1) {
      stall(1, 1); stall(8, 1);
      well(2, 10);
      stall(10, 9);
      person(p, 7, 8, p.pick(BODIES)); person(p, 14, 3, p.pick(BODIES));
      p.stamp(["cc", "CC"], 7, 12, { c: PLANK, C: "#9a6b45" });
    } else if (v === 2) {
      well(6, 1);
      stall(1, 9); stall(10, 9);
      person(p, 2, 3, p.pick(BODIES)); person(p, 12, 4, p.pick(BODIES)); person(p, 8, 9, p.pick(BODIES));
    } else {
      stall(0, 1); stall(6, 2); stall(11, 1);
      stall(1, 10);
      well(10, 10);
      person(p, 8, 9, p.pick(BODIES));
    }
  },
  // 6 worship: church with a spire, mosque with dome and minaret, East Asian temple, Indian domes.
  (p, v) => {
    cobbles(p);
    const art: [readonly string[], Record<string, string>][] = [
      [
        [
          "..y.............",
          ".yyy............",
          "..y.............",
          "..S.............",
          ".SSs............",
          ".SSs............",
          "SSSss.rrrrrrrrr.",
          "SSSss.rrrrrrrrrq",
          "ttttTqqqqqqqqqqq",
          "tbbtTrrrrrrrrrrq",
          "tbbtTqqqqqqqqqqq",
          "ttttTRRRRRRRRRRR",
          "txxtTwwxwwwxwwwW",
          "txxtTwwxwwwxwwwW",
          "ttttTwwwwddwwwwW",
          "ttttTwwwwddwwwwW",
        ],
        { y: GOLD, S: "#566c86", s: NIGHT, r: BRICK.l, q: BRICK.b, R: BRICK.d, t: "#f4f4f4", T: STONE, b: NIGHT, w: "#f4f4f4", W: STONE, x: "#29366f", d: WOOD_DARK },
      ],
      [
        [
          "......y......y..",
          "......y......t..",
          ".....LLM.....tT.",
          "...LLLLMMM...tT.",
          "..LLLLLMMMS..tT.",
          ".LLLLLLMMMSSgggg",
          ".LLLLLMMMMSS.tT.",
          "kkkkkkkkkkkkktT.",
          "wwwwwwwwwwwwWtT.",
          "wawwwawwwawwWtT.",
          "wawwwawwwawwWtT.",
          "wwwwwwwwwwwwWtT.",
          "wwwwwAAAwwwwWtT.",
          "wwwwAdddAwwwWtT.",
          "wwwwAdddAwwwWtT.",
          "WWWWWWWWWWWWWTT.",
        ],
        { y: GOLD, L: "#cbdbfc", M: "#94b0c2", S: "#566c86", g: STONE, k: STONE_SHADE, w: "#f4f4f4", W: STONE, t: "#f4f4f4", T: STONE, a: NIGHT, A: STONE_SHADE, d: INK },
      ],
      [
        [
          ".......yy.......",
          "......LLLL......",
          "l...LLLLLLLL...l",
          ".lLLLLLLLLLLLLl.",
          "..DDDDDDDDDDDD..",
          "..cwcccwwcccwc..",
          "..cwcccwwcccwc..",
          "l.LLLLLLLLLLLL.l",
          "lLLLLLLLLLLLLLLl",
          "DDDDDDDDDDDDDDDD",
          ".cwwwcwddwcwwwc.",
          ".cwwwcwddwcwwwc.",
          ".cwwwcwddwcwwwc.",
          "KKKKKKKKKKKKKKKK",
          "kkkkkkkkkkkkkkkk",
          ".....ssssss.....",
        ],
        { y: GOLD, l: "#4fa077", L: "#257179", D: "#164a3c", c: "#b0583a", w: "#eec39a", d: INK, K: STONE, k: STONE_SHADE, s: STONE },
      ],
      [
        [
          ".......y........",
          ".......y........",
          "......ppq.......",
          ".....pppqq......",
          "....pppppqq.....",
          ".y..pppppqq...y.",
          "pqq.pppppqq..pqq",
          "C.C.eeeeeeee.C.C",
          "wwwwwwwwwwwwwwwW",
          "wwwwwFFFFFFwwwwW",
          "waawwFddddFwaawW",
          "waawwFddddFwaawW",
          "wwwwwFddddFwwwwW",
          "wwwwwFddddFwwwwW",
          "WWWWWWWWWWWWWWWW",
          "kkkkkkkkkkkkkkkk",
        ],
        { y: GOLD, p: "#f4f4f4", q: "#cbdbfc", C: "#f4f4f4", e: STONE, w: "#f4f4f4", W: STONE, F: "#e8a878", a: NIGHT, d: NIGHT, k: STONE_SHADE },
      ],
    ];
    const [rows, key] = art[v]!;
    p.stamp(rows, 0, 0, key);
  },
  // 7 docks: a flagstone quay along the north half, harbour water to the south with a plank pier and moored boats.
  (p, v) => {
    const quay = v === 3 ? 6 : 8;
    for (let y = 0; y < quay; y++) {
      for (let x = 0; x < N; x++) {
        // Flagstones 4 × 2, the courses offset, with dark joints.
        const joint = y % 2 === 1 || (x + (y % 4 < 2 ? 0 : 2)) % 4 === 3;
        p.set(x, y, joint ? STONE_DARK : p.rand() < 0.2 ? STONE_LIT : STONE_SHADE);
      }
    }
    for (let x = 0; x < N; x++) p.set(x, quay, x % 4 === 1 ? INK : OUTLINE);
    // The harbour water below the quay edge, with a few ripples.
    for (let y = quay + 1; y < N; y++) for (let x = 0; x < N; x++) p.set(x, y, y === quay + 1 ? "#2b4f8f" : p.rand() < 0.08 ? "#73eff7" : (x + 3 * y) % 7 === 0 ? "#2b4f8f" : WATER);
    const pier = [3, 10, 1, 7][v]!;
    for (let y = quay + 1; y < N; y++) {
      p.set(pier - 1, y, WOOD_DARK);
      p.set(pier, y, y % 2 ? PLANK : "#e8a878");
      p.set(pier + 1, y, y % 2 ? "#e8a878" : PLANK);
      p.set(pier + 2, y, WOOD_DARK);
    }
    const boat = (x: number, y: number) =>
      p.stamp(["..m...", "..ms..", "..mss.", "hhhhhh", ".HHHH."], x, y, { m: WOOD_DARK, s: "#f4f4f4", h: WOOD, H: WOOD_DARK });
    const crates = (x: number, y: number) => p.stamp(["cCo", "CCO"], x, y, { c: PLANK, C: "#9a6b45", o: WOOD, O: WOOD_DARK });
    if (v === 0) { boat(8, 10); crates(1, 2); p.stamp(["ww"], 10, 3, { w: WOOD_DARK }); person(p, 7, 3, "#566c86"); }
    if (v === 1) { boat(2, 10); crates(12, 2); p.stamp(["o.o.o"], 2, 4, { o: WOOD_DARK }); }
    if (v === 2) { boat(8, 10); crates(9, 1); crates(12, 3); person(p, 4, 2, "#257179"); }
    if (v === 3) { p.stamp(["b", "b", "b"], 14, 1, { b: WOOD_DARK }); person(p, 3, 1, "#566c86"); boat(0, 9); boat(10, 10); }
  },
  // 8 drill yard: packed earth, a fence, a few drilling figures with pikes.
  (p, v) => {
    p.fill(EARTH);
    p.dither(EARTH_DARK, 0.18);
    p.dither(SQUARE, 0.1);
    for (let i = 0; i < N; i++) {
      const post = i % 3 === 0 ? WOOD_DARK : WOOD;
      p.set(i, 0, post);
      p.set(0, i, post);
      p.set(i, N - 1, post);
      p.set(N - 1, i, post);
    }
    const soldier = (x: number, y: number, pike = false) => {
      if (pike) { p.set(x + 1, y - 2, STEEL); p.set(x + 1, y - 1, WOOD); p.set(x + 1, y, WOOD); }
      p.set(x, y, SKIN);
      p.set(x, y - 1, STEEL);
      p.set(x, y + 1, "#566c86");
      p.set(x, y + 2, NIGHT);
      p.shade(x + 1, y + 2, EARTH_DARK);
    };
    if (v === 0) for (const x of [3, 6, 9, 12]) soldier(x, 4), soldier(x, 10);
    if (v === 1) {
      for (const x of [3, 5, 7]) for (const y of [4, 8]) soldier(x, y, true);
      // A straw target on its post.
      p.stamp([".tt.", "tbbt", ".tt.", ".w.."], 11, 7, { t: "#d9c27a", b: "#ef7d57", w: WOOD });
      soldier(12, 3);
    }
    if (v === 2) {
      soldier(3, 3); soldier(9, 6); soldier(5, 11);
      // A weapons rack.
      p.stamp(["s.s.s", "wwwww", "w...w"], 9, 1, { s: STEEL, w: WOOD });
    }
    if (v === 3) {
      for (const x of [3, 6]) for (const y of [4, 9]) soldier(x, y, true);
      soldier(11, 6);
      p.set(12, 4, GOLD);
      p.set(12, 5, GOLD);
    }
  },
  // 9 works: mine, quarry, lumber camp, windmill farmstead.
  (p, v) => {
    if (v === 0) {
      // A mine in the hillside: a timbered adit, rails, an ore cart and spoil.
      p.stamp(
        [
          "....oollloo.....",
          "...olllllsso....",
          "..ollllllllso...",
          ".olllwwwwlllso..",
          "ollllwkkwllllso.",
          "olllwkkkkwlllso.",
          "ollswkkkkwssss..",
          "....rkkkkr......",
          ".....tttt.......",
          ".....tttt.......",
          ".....tttt.......",
        ],
        0, 1,
        { o: OUTLINE, l: STONE_LIT, s: STONE_DARK, w: WOOD, k: INK, r: WOOD_DARK, t: WOOD_DARK },
      );
      p.stamp(["gcg.", "CCCC", ".o.o"], 9, 9, { g: "#9a94a0", c: "#566c86", C: WOOD, o: INK });
      p.stamp([".s.", "sSs"], 1, 11, { s: "#9a94a0", S: STONE_DARK });
    } else if (v === 1) {
      // A quarry: a stepped pit of cut stone, blocks waiting by the edge.
      p.stamp(
        [
          ".aaaaaaaaaaaaa..",
          "aAAAAAAAAAAAAAa.",
          "aBBBBBBBBBBBBBa.",
          "aBCCCCCCCCCCCBa.",
          "aBCEEEEEEEEECBa.",
          "aBCEDDDDDDDECBa.",
          "aBCEDDDDDDDECBa.",
          "aBCEEEEEEEEECBa.",
          "aBCCCCCCCCCCCBa.",
          ".aaaaaaaaaaaaa..",
        ],
        0, 0,
        { a: STONE_SHADE, A: STONE_DARK, B: COBBLE, C: COBBLE_DARK, E: OUTLINE, D: NIGHT },
      );
      p.stamp(["ss.ss", "SS.SS"], 2, 12, { s: STONE, S: STONE_SHADE });
      p.stamp(["ss", "SS"], 10, 12, { s: STONE, S: STONE_SHADE });
      person(p, 8, 11, "#566c86");
    } else if (v === 2) {
      // A lumber camp: stacked logs, a hut, stumps and the edge of the wood.
      tree(p, 0, 0);
      tree(p, 4, 1);
      tree(p, 1, 4);
      p.stamp(["..tt..", ".tttt.", "tttttt", "wwddww"], 9, 1, { t: THATCH.b, w: WOOD, d: INK });
      p.stamp(["oOoOoO", "WWWWWW", "oOoOoO", "WWWWWW"], 1, 10, { o: PLANK, O: "#e8a878", W: "#9a6b45" });
      p.stamp(["s.", ".s"], 11, 8, { s: PLANK });
      p.stamp(["xx"], 10, 12, { x: WOOD_DARK });
      person(p, 13, 10, "#5d275d");
    } else {
      // A windmill on its mound, a farmhouse and fields.
      p.stamp(
        [
          "f.....f",
          ".f...f.",
          "..f.f..",
          "...h...",
          "..f.f..",
          ".fwrwf.",
          "f.wrw.f",
          "..WWW..",
        ],
        0, 0,
        { f: "#f4f4f4", h: WOOD_DARK, r: BRICK.l, w: "#eec39a", W: STONE },
      );
      villageHouse(p, 9, 1, 6, 6);
      field(p, 0, 9, 16, 7);
    }
  },
  // 10 ash: burned rubble with half-collapsed walls, charred beams and embers.
  (p, v) => {
    p.fill(OUTLINE);
    p.dither(NIGHT, 0.25);
    p.dither(INK, 0.15);
    p.dither(COBBLE_DARK, 0.12);
    p.dither(COBBLE, 0.06);
    const walls = [
      ["ww.ww", "Wx.xW", "W...W"],
      ["w.www", "W...x", "W...."],
      ["wwww.", "WxxW.", "W..W."],
      ["ww..w", "Wx.WW", "W..W."],
    ];
    const key = { w: STONE_SHADE, W: STONE_DARK, x: NIGHT };
    p.stamp(walls[v]!, 1, 2, key);
    p.stamp(walls[(v + 2) % 4]!, 9, 8, key);
    p.stamp(["bb.b", ".bb."], 2 + p.int(5), 12, { b: WOOD_DARK });
    p.stamp(["bbb"], 9 + p.int(3), 3, { b: INK });
    const embers = ["#ef7d57", GOLD, "#fbf236", "#ef7d57", "#b0583a", GOLD];
    for (let i = 0; i < embers.length; i++) p.set(p.int(N), p.int(N), embers[i]!);
    // A wisp of smoke.
    p.stamp([".m", "m.", ".m"], 6 + p.int(4), 0, { m: STONE_SHADE });
  },
  // 11 site: scaffolding round a half-built house, timber and stone waiting.
  (p, v) => {
    cobbles(p);
    const key = { s: STONE, S: STONE_SHADE, f: WOOD, F: WOOD_DARK, p: PLANK, d: INK, k: "#566c86" };
    const sites = [
      [
        "f..f..f..f..f...",
        "ffffffffffffff..",
        "f..f..f..f..f...",
        "f.sssssssssf....",
        "fFSSSSSSSSSf....",
        "f.SSdSSSSSSf....",
        "fFSSdSSSSSSf....",
        "f.SSSSSSSSSf....",
        "................",
        "ppppp....ss.ss..",
        "ppppp....SS.SS..",
      ],
      [
        "...f..f..f..f..f",
        "...fffffffffffff",
        "...fsssssss.f..f",
        "...fSSSSSSSffff.",
        "...fSSSSdSSf..f.",
        "...fSSSSdSSf....",
        "...fSSSSSSSf....",
        "................",
        "................",
        "ss.ss....ppppppp",
        "SS.SS....ppppppp",
      ],
      [
        "ffffff..........",
        "fssssf..fffff...",
        "fSSSSf..fsssf...",
        "fSSSSffffSSSf...",
        "fSdSSf..fSdSf...",
        "fSdSSf..fSSSf...",
        "........k.......",
        "..pppp..........",
        "..pppp....ss....",
        "pppp......SS....",
      ],
      [
        "f..ff..f..ff..f.",
        "fffffffffffffff.",
        "f..sssssss....f.",
        "f.sSSSSSSSs...f.",
        "fsSSSdSSSSSs..f.",
        "fSSSSdSSSSSS..f.",
        "fSSSSSSSSSSS..f.",
        "................",
        "..........pppp..",
        "..ss......pppp..",
      ],
    ];
    p.stamp(sites[v]!, 0, 2, key);
    person(p, 13 - v, 10, "#566c86");
  },
  // 12 landmark: a large cathedral or palace (placeholder for hand-made landmarks).
  (p, v) => {
    cobbles(p);
    const art: [readonly string[], Record<string, string>][] = [
      // Cathedral: twin towers with spires either side of the nave's gable and rose window.
      [
        [
          "..y..........y..",
          ".yyy........yyy.",
          "..S....rR....S..",
          ".SSs..rrRR..SSs.",
          ".SSs.rrrRRR.SSs.",
          "SSSssrrrRRRSSSss",
          "ttttTeeeeeettttT",
          "tbbtTwwwwwWtbbtT",
          "ttttTwwoowWttttT",
          "txxtTwoyyoWtxxtT",
          "txxtTwwoowWtxxtT",
          "ttttTwwwwwWttttT",
          "ttttTwwAAwWttttT",
          "ttttTwAddAWttttT",
          "ttttTwAddAWttttT",
          "TTTTTWWWWWWTTTTT",
        ],
        { y: GOLD, S: "#566c86", s: NIGHT, r: BRICK.l, R: BRICK.d, e: "#5a2a1c", t: "#f4f4f4", T: STONE, b: NIGHT, w: "#f4f4f4", W: STONE, o: "#94b0c2", x: INK, A: STONE_SHADE, d: INK },
      ],
      // Palace with a central dome and the realm flag.
      [
        [
          ".......pff......",
          ".......pff......",
          ".......p........",
          "......LLM.......",
          ".....LLLMM......",
          "rrrrLLLLMMSrrrrR",
          "rrrrLLLMMMSrrrrR",
          "RRRReeeeeeeRRRRR",
          "wwwwwwwwwwwwwwwW",
          "wxwxwxwwwwxwxwxW",
          "wxwxwxwAAwxwxwxW",
          "wwwwwwAddAwwwwwW",
          "wxwxwxAddAwxwxwW",
          "wxwxwxAddAwxwxwW",
          "WWWWWWWWWWWWWWWW",
          "kkkkkkkkkkkkkkkk",
        ],
        { p: INK, f: TOWN_FLAG, L: GOLD, M: PLANK, S: "#9a6b45", e: "#9a6b45", r: TERRACOTTA.l, R: TERRACOTTA.d, w: "#f4f4f4", W: STONE, x: NIGHT, A: STONE_SHADE, d: INK, k: STONE_SHADE },
      ],
      // Basilica seen from above: a cross of roofs and a crossing dome.
      [
        [
          "......rrRR......",
          "......rrRR......",
          "......rrRR......",
          "......rrRR......",
          "......rrRR......",
          "rrrrrrLLMMrrrrrR",
          "rrrrrLLLMMSrrrrR",
          "RRRRRLLMMSSRRRRR",
          "wxwwwwSSSSwwwxwW",
          "WWWWWWrrRRWWWWWW",
          "......rrRR......",
          "......rrRR......",
          "......RRRR......",
          ".....wwwwwW.....",
          ".....wxddxW.....",
          ".....wwddwW.....",
        ],
        { r: BRICK.l, R: BRICK.d, L: "#cbdbfc", M: "#94b0c2", S: "#566c86", w: "#f4f4f4", W: STONE, x: NIGHT, d: INK },
      ],
      // Palace round a court with gilded corner pavilions and a fountain.
      [
        [
          ".y...........y..",
          "yyY.rrrrrrrr.yyY",
          "yyYrrrrrrrrrryyY",
          "YYYRRRRRRRRRRYYY",
          "wwWwxwwxwwxwwwwW",
          "rrRccccccccccrrR",
          "rrRcGGcccGGccrrR",
          "RRRccccbbccccRRR",
          "wwWcccbbbbcccwwW",
          "wxWccccbbccccwxW",
          "rrRcGGcccGGccrrR",
          "rrRccccccccccrrR",
          "RRRccccccccccRRR",
          "wwWrrrrrrrrrrwwW",
          "wxWRRRRddRRRRwxW",
          "WWWwwwwddwwwwWWW",
        ],
        { y: GOLD, Y: PLANK, r: TERRACOTTA.l, R: TERRACOTTA.d, w: "#f4f4f4", W: STONE, x: NIGHT, c: SQUARE, G: "#2f8a4a", b: WATER, d: INK },
      ],
    ];
    const [rows, key] = art[v]!;
    p.stamp(rows, 0, 0, key);
  },
];

/** Base fill per row: null starts transparent. */
const BASE: (string | null)[] = [null, null, COBBLE, COBBLE, null, COBBLE, null, null, null, null, COBBLE, COBBLE];

/** Builds the town atlas as RGBA bytes: TOWN_VARIANTS tiles across, TOWN_ROWS down, alpha 0 where terrain shows. */
export function buildTownAtlas(): { width: number; height: number; rgba: Uint8Array } {
  const width = N * TOWN_VARIANTS;
  const height = N * TOWN_ROWS;
  const rgba = new Uint8Array(width * height * 4);
  for (let row = 0; row < TOWN_ROWS; row++) {
    for (let v = 0; v < TOWN_VARIANTS; v++) {
      const p = new TownPainter(row * 97 + v * 13 + 7, BASE[row]!);
      PAINT[row]!(p, v);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const c = p.px[y * N + x];
          if (!c) continue;
          const o = ((row * N + y) * width + v * N + x) * 4;
          rgba[o] = c[0];
          rgba[o + 1] = c[1];
          rgba[o + 2] = c[2];
          rgba[o + 3] = 255;
        }
      }
    }
  }
  return { width, height, rgba };
}

let atlasCache: ReturnType<typeof buildTownAtlas> | null = null;

/** One town tile as a canvas, scaled up, for the style sheet. Transparent pixels stay clear. */
export function townTileCanvas(row: number, variant: number, scale: number): HTMLCanvasElement {
  const atlas = (atlasCache ??= buildTownAtlas());
  const c = document.createElement("canvas");
  c.width = c.height = N * scale;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const o = ((row * N + y) * atlas.width + variant * N + x) * 4;
      if (atlas.rgba[o + 3] === 0) continue;
      ctx.fillStyle = `rgb(${atlas.rgba[o]},${atlas.rgba[o + 1]},${atlas.rgba[o + 2]})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}
