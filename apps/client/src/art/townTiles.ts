import { hexToRgb, PALETTE } from "./palette.ts";

/**
 * Living-map town art. Each town cell kind (livingMap.cellKinds in
 * map-presentation.json, skipping "none") gets a row of 8 × 8 tiles: one map
 * pixel in the living band. The map shader draws a tile over the terrain where
 * a map pixel carries that kind in its settlement byte; alpha 0 lets the
 * terrain show through (hamlets, outskirts, docks, works).
 *
 * Painted by code like the terrain atlas in tiles.ts: a few colours from the
 * palette, seeded randomness, and small text stamps. Houses are seen from
 * above at a slight 3/4 angle: a lit roof row, a dark eave row, then the wall
 * with its door.
 */

export const TOWN_TILE = 8; // art pixels per map pixel in the living band
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

/** An 8 × 8 picture with transparency (null). Unlike the terrain painter it clips instead of wrapping. */
class TownPainter {
  readonly px: (RGB | null)[];
  readonly rand: () => number;
  constructor(seed: number, base: string | null) {
    this.rand = rng(seed);
    this.px = new Array<RGB | null>(N * N).fill(base === null ? null : hexToRgb(base));
  }
  set(x: number, y: number, hex: string): void {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    this.px[y * N + x] = hexToRgb(hex);
  }
  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, hex);
  }
  /** Scatters single pixels over the opaque part of the tile. */
  dither(hex: string, amount: number): void {
    for (let i = 0; i < N * N; i++) if (this.px[i] && this.rand() < amount) this.px[i] = hexToRgb(hex);
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
const WALLS = ["#f4f4f4", "#eec39a", "#d8d0b0"] as const;

const INK = "#1a1c2c";
const OUTLINE = "#4a4552";
const COBBLE = "#847e87";
const COBBLE_LIT = "#9a94a0";
const COBBLE_DARK = "#6f6a74";
const STONE = "#d8d0b0";
const STONE_SHADE = "#a8a2ad";
const EARTH = "#c9a676";
const EARTH_DARK = "#b7a084";
const WOOD = "#8b5a3c";
const WOOD_DARK = "#5a3a2a";
const PLANK = "#d9a066";
const SKIN = "#eec39a";
const GOLD = "#ffcd75";
const WATER = "#3b6fb5";
const HEDGE = "#3f6f2e";
const TREE: Record<string, string> = { l: "#73c25a", g: "#2f8a4a", d: "#1d5e38" };

/** A house: lit roof, dark eave, then the wall with a door. 3 × 3 to 4 × 4. */
function house(p: TownPainter, x: number, y: number, w: number, h: number, roof: Roof, wall: string): void {
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      let hex: string;
      if (r === h - 1) hex = wall;
      else if (r === h - 2) hex = roof.d;
      else hex = c === w - 1 && w > 2 ? roof.b : r === 0 ? roof.l : roof.b;
      p.set(x + c, y + r, hex);
    }
  }
  const door = w >= 4 ? x + 1 + p.int(2) : x + p.int(w);
  p.set(door, y + h - 1, INK);
  if (w >= 4) p.set(door === x + 1 ? x + 3 : x, y + h - 1, WOOD_DARK);
}

function townHouse(p: TownPainter, x: number, y: number, w: number, h: number): void {
  house(p, x, y, w, h, p.pick(TOWN_ROOFS), p.pick(WALLS));
}

function villageHouse(p: TownPainter, x: number, y: number, w = 3, h = 3): void {
  house(p, x, y, w, h, p.pick(VILLAGE_ROOFS), p.pick(WALLS));
}

/** Strip fields: rows (or columns) of wheat and green crops, a stripe each line. */
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
      const [a, b] = crops[(first + Math.floor(line / 2)) % crops.length]!;
      p.set(x + dx, y + dy, line % 2 === 0 ? a : b);
    }
  }
}

function path(p: TownPainter, cells: readonly [number, number][]): void {
  for (const [x, y] of cells) p.set(x, y, (x + y) % 3 === 0 ? EARTH_DARK : EARTH);
}

function cobbles(p: TownPainter): void {
  p.dither(COBBLE_LIT, 0.16);
  p.dither(COBBLE_DARK, 0.12);
}

/** A tiny person: head over a body. */
function person(p: TownPainter, x: number, y: number, body: string): void {
  p.set(x, y, SKIN);
  p.set(x, y + 1, body);
}

type TownPaint = (p: TownPainter, v: number) => void;

const PAINT: TownPaint[] = [
  // 1 hamlet: one or two small houses on a strip of field, mostly transparent.
  (p, v) => {
    if (v === 0) {
      villageHouse(p, 1, 1);
      field(p, 1, 5, 6, 2);
      p.stamp([".lg.", "lggd"], 4, 2, TREE);
    } else if (v === 1) {
      villageHouse(p, 0, 0);
      villageHouse(p, 4, 1, 3, 3);
      field(p, 2, 5, 5, 3, true);
    } else if (v === 2) {
      field(p, 0, 1, 3, 6, true);
      villageHouse(p, 4, 2, 4, 3);
    } else {
      villageHouse(p, 3, 0, 4, 3);
      p.stamp(["gb", "ww"], 0, 2, { g: THATCH.b, b: THATCH.d, w: WOOD });
      field(p, 0, 4, 6, 3);
    }
  },
  // 2 outskirts: scattered houses among strip fields and a path.
  (p, v) => {
    if (v === 0) {
      villageHouse(p, 0, 0);
      townHouse(p, 4, 0, 3, 3);
      path(p, [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3]]);
      field(p, 0, 4, 4, 4);
      townHouse(p, 5, 5, 3, 3);
    } else if (v === 1) {
      path(p, [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]]);
      townHouse(p, 0, 1, 3, 3);
      villageHouse(p, 4, 0, 4, 3);
      field(p, 4, 4, 4, 4, true);
      field(p, 0, 5, 3, 3);
    } else if (v === 2) {
      field(p, 0, 0, 4, 8, true);
      path(p, [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7]]);
      townHouse(p, 5, 0, 3, 3);
      villageHouse(p, 5, 4, 3, 3);
    } else {
      field(p, 4, 0, 4, 3);
      townHouse(p, 0, 0, 3, 3);
      path(p, [[0, 6], [1, 6], [2, 5], [3, 5], [4, 4], [5, 4], [6, 4], [7, 3]]);
      villageHouse(p, 4, 5, 3, 3);
      p.stamp([".lg.", "lggd"], 0, 4, TREE);
    }
  },
  // 3 core: packed houses on cobbles with narrow streets (fully opaque).
  (p, v) => {
    cobbles(p);
    if (v === 0) {
      townHouse(p, 0, 0, 3, 3);
      townHouse(p, 4, 0, 3, 3);
      townHouse(p, 0, 4, 3, 3);
      townHouse(p, 4, 4, 3, 3);
    } else if (v === 1) {
      townHouse(p, 0, 0, 4, 3);
      townHouse(p, 5, 0, 3, 3);
      townHouse(p, 0, 4, 3, 4);
      p.stamp([".lg", "lgd"], 4, 4, TREE);
      townHouse(p, 5, 5, 3, 3);
    } else if (v === 2) {
      townHouse(p, 0, 0, 4, 3);
      townHouse(p, 4, 0, 3, 3);
      townHouse(p, 1, 4, 3, 4);
      townHouse(p, 5, 4, 3, 3);
      person(p, 4, 5, "#566c86");
    } else {
      townHouse(p, 0, 0, 3, 4);
      townHouse(p, 4, 1, 4, 3);
      townHouse(p, 0, 5, 3, 3);
      townHouse(p, 4, 5, 3, 3);
      person(p, 3, 1, "#ef7d57");
    }
  },
  // 4 keep: a fortress with four capped corner towers, a donjon and the realm's flag.
  (p, v) => {
    cobbles(p);
    const key = {
      K: "#566c86", k: "#333c57", w: "#f4f4f4", W: STONE_SHADE, s: STONE, c: "#d6b886",
      D: "#566c86", d: STONE_SHADE, g: INK, p: INK, f: TOWN_FLAG, b: WATER, G: "#2f8a4a",
    };
    const keeps = [
      ["KKwwwwKK", "KkWWWWKk", "scpffccW", "scDDDccW", "scdgdccW", "KKwwwwKK", "KkWggWKk"],
      ["KKwwwwKK", "KkWWWWKk", "sccpffcW", "sccDDDcW", "sGcdgdcW", "KKwwwwKK", "KkWggWKk"],
      ["KKwpfwKK", "KkWpWWKk", "scDDDDcW", "scDDDDcW", "scddgdcW", "KKwwwwKK", "KkWggWKk"],
      ["pff.....", "pKwwwwKK", "KkWWWWKk", "scDDDccW", "scdgdcbW", "KKwwwwKK", "KkWggWKk"],
    ];
    const rows = keeps[v]!;
    p.stamp(rows, 0, 0, key, v === 1);
    if (v === 3) p.set(0, 2, INK);
    // A cast shadow along the foot of the south wall.
    for (let x = 0; x < N; x++) if (p.rand() < 0.6) p.set(x, 7, COBBLE_DARK);
  },
  // 5 market: a square with striped stalls, a well and people.
  (p, v) => {
    p.px.fill(hexToRgb("#d6b886"));
    p.dither(STONE, 0.1);
    p.dither(EARTH_DARK, 0.05);
    const awnings = ["#ef7d57", "#257179", WATER, GOLD, "#5d275d", "#5cae55"];
    const stall = (x: number, y: number) => {
      const c = p.pick(awnings);
      p.stamp(["apa", "pap", "wcw"], x, y, { a: c, p: "#f4f4f4", w: WOOD_DARK, c: p.pick([GOLD, "#7cb84a", PLANK]) });
    };
    const well = (x: number, y: number) => p.stamp(["rrr", "rbR", "RRR"], x, y, { r: COBBLE_LIT, R: COBBLE_DARK, b: WATER });
    const bodies = ["#566c86", "#ef7d57", "#257179", "#5d275d", INK];
    if (v === 0) {
      stall(0, 0); stall(5, 0); stall(0, 5);
      well(4, 4);
      person(p, 3, 1, p.pick(bodies));
    } else if (v === 1) {
      stall(0, 0); stall(4, 0);
      well(0, 4);
      stall(5, 5);
      person(p, 4, 4, p.pick(bodies));
    } else if (v === 2) {
      well(3, 0);
      stall(0, 4); stall(5, 4);
      person(p, 1, 1, p.pick(bodies)); person(p, 4, 5, p.pick(bodies));
    } else {
      stall(0, 0); stall(4, 1);
      stall(0, 5);
      well(4, 5);
      person(p, 3, 4, p.pick(bodies));
    }
  },
  // 6 worship: church with spire, mosque dome and minaret, East Asian temple, Indian dome.
  (p, v) => {
    cobbles(p);
    const art: [readonly string[], Record<string, string>][] = [
      [
        ["......y.", "......S.", ".....SSs", "rrrrrtts", "rrrrrtxT", "RRRRRttT", "wxwxwtdT", "........"],
        { r: BRICK.l, R: BRICK.d, w: "#f4f4f4", x: INK, S: "#566c86", s: "#333c57", t: "#f4f4f4", T: STONE, d: INK, y: GOLD },
      ],
      [
        ["......y.", "..LL..t.", ".LLMM.T.", "LLMMMST.", "wwwwwwt.", "wxwdwxt.", "WWWWWWT.", "........"],
        { L: "#cbdbfc", M: "#94b0c2", S: "#566c86", w: "#f4f4f4", W: STONE, x: INK, d: INK, t: "#f4f4f4", T: STONE, y: GOLD },
      ],
      [
        ["...yy...", "l.LLLL.l", "lLLLLLLl", ".DDDDDD.", ".cwccwc.", "lLLLLLLl", "DDDDDDDD", ".cwddwc."],
        { y: GOLD, l: "#4fa077", L: "#257179", D: "#164a3c", c: "#b0583a", w: "#eec39a", d: INK },
      ],
      [
        ["...yy...", "..pppq..", ".ppppqq.", ".ppppqq.", "y.ppqq.y", "pqwwwwpq", "wwxwwxww", "WWWddWWW"],
        { y: GOLD, p: "#f4f4f4", q: "#cbdbfc", w: "#f4f4f4", W: STONE, x: INK, d: INK },
      ],
    ];
    const [rows, key] = art[v]!;
    p.stamp(rows, 0, 0, key);
  },
  // 7 docks: a quay along the north half, a pier into the water (south) and a boat.
  (p, v) => {
    const quayRows = v === 3 ? 3 : 4;
    p.rect(0, 0, N, quayRows, STONE_SHADE);
    for (let i = 0; i < N * quayRows; i++) if (p.rand() < 0.25) p.set(i % N, Math.floor(i / N), COBBLE_LIT);
    p.rect(0, quayRows, N, 1, COBBLE_DARK);
    const pier = [2, 5, 1, 4][v]!;
    for (let y = quayRows; y < N; y++) {
      p.set(pier, y, y % 2 ? WOOD : PLANK);
      p.set(pier + 1, y, y % 2 ? WOOD_DARK : WOOD);
    }
    const boat = (x: number, y: number) => p.stamp([".s..", "hhhh", ".HH."], x, y, { s: "#f4f4f4", h: WOOD, H: WOOD_DARK });
    if (v === 0) { boat(4, 5); p.stamp(["cc", "CC"], 0, 1, { c: PLANK, C: "#9a6b45" }); }
    if (v === 1) { boat(1, 5); p.stamp(["o.o"], 3, 2, { o: WOOD_DARK }); }
    if (v === 2) { boat(4, 5); p.stamp(["cco", "CC."], 4, 1, { c: PLANK, C: "#9a6b45", o: WOOD_DARK }); }
    if (v === 3) { p.stamp(["b", "b"], 7, 0, { b: WOOD_DARK }); person(p, 2, 1, "#566c86"); boat(0, 5); }
  },
  // 8 drill yard: packed earth, a fence, a few drilling figures.
  (p, v) => {
    p.px.fill(hexToRgb(EARTH));
    p.dither(EARTH_DARK, 0.2);
    p.dither("#d6b886", 0.12);
    for (let i = 0; i < N; i++) {
      const post = i % 2 === 0 ? WOOD_DARK : WOOD;
      p.set(i, 0, post);
      p.set(0, i, post);
      p.set(i, N - 1, post);
      p.set(N - 1, i, post);
    }
    const soldier = (x: number, y: number) => {
      p.set(x, y, SKIN);
      p.set(x, y + 1, "#566c86");
    };
    const pike = (x: number, y: number) => {
      p.set(x, y - 1, "#9aa4b4");
      soldier(x, y);
    };
    if (v === 0) for (const x of [2, 4, 6]) soldier(x, 3), soldier(x, 6);
    if (v === 1) { for (const x of [2, 3, 4]) pike(x, 3); p.stamp(["t", "w"], 6, 5, { t: "#d9c27a", w: WOOD }); soldier(6, 2); }
    if (v === 2) { soldier(2, 2); soldier(5, 4); soldier(3, 6); p.stamp(["rrr"], 4, 1, { r: WOOD }); p.set(4, 2, "#9aa4b4"); }
    if (v === 3) { for (const x of [2, 4]) for (const y of [2, 5]) pike(x, y); soldier(6, 4); p.set(6, 3, GOLD); }
  },
  // 9 works: mine, quarry, lumber camp, windmill farmstead.
  (p, v) => {
    if (v === 0) {
      p.stamp(
        ["..ollo..", ".olllss.", "ollkkkso", "olkkkkso", "..rrrr..", "..rrrr.."],
        0, 1,
        { o: OUTLINE, l: "#b5aebb", s: "#77707e", k: INK, r: WOOD_DARK },
      );
      p.stamp(["cc", "CC"], 5, 5, { c: "#9a94a0", C: WOOD });
      p.set(1, 6, "#9a94a0");
    } else if (v === 1) {
      p.stamp(
        [".aaaaaa.", "aAAAAAAa", "aBBBBBBa", "aBCCCCBa", "aBCDDCBa", "aBCCCCBa", ".aaaaaa."],
        0, 0,
        { a: STONE_SHADE, A: "#77707e", B: COBBLE, C: COBBLE_DARK, D: OUTLINE },
      );
      p.stamp(["ss"], 5, 7, { s: STONE });
      p.set(3, 4, STONE);
    } else if (v === 2) {
      p.stamp(["oOoO", "WWWW", "oOoO"], 0, 4, { o: PLANK, O: "#e8a878", W: "#9a6b45" });
      p.stamp([".tt", "ttt", "wdw"], 4, 0, { t: THATCH.b, w: WOOD, d: INK });
      p.stamp(["s"], 6, 5, { s: PLANK });
      p.stamp([".lg.", "lggd", ".dd."], 0, 0, { l: "#4fa077", g: "#257a5c", d: "#164a3c" });
      p.set(6, 6, WOOD_DARK);
    } else {
      p.stamp(
        ["f...f", ".f.f.", "..h..", ".frf.", "f.w.f", "..W.."],
        0, 0,
        { f: "#f4f4f4", h: WOOD_DARK, r: BRICK.l, w: "#eec39a", W: STONE },
      );
      p.set(2, 4, "#eec39a");
      field(p, 0, 6, 8, 2);
      field(p, 5, 1, 3, 5, true);
    }
  },
  // 10 ash: burned rubble with half-collapsed walls and embers.
  (p, v) => {
    p.px.fill(hexToRgb(OUTLINE));
    p.dither("#333c57", 0.25);
    p.dither(INK, 0.15);
    p.dither(COBBLE_DARK, 0.12);
    p.dither(COBBLE, 0.06);
    const walls = [
      ["ww.w", "W..W"],
      ["w.ww", "W..."],
      ["www", "W.W"],
      ["w..w", "W.WW"],
    ];
    const key = { w: STONE_SHADE, W: "#77707e" };
    p.stamp(walls[v]!, 0, 1, key);
    p.stamp(walls[(v + 2) % 4]!, 4, 4, key);
    p.stamp(["bb."], 1 + p.int(3), 6, { b: WOOD_DARK });
    const embers = ["#ef7d57", GOLD, "#fbf236", "#ef7d57"];
    for (let i = 0; i < 4; i++) p.set(p.int(N), p.int(N), embers[i]!);
  },
  // 11 site: scaffolding around a half-built house.
  (p, v) => {
    cobbles(p);
    const key = { s: STONE, S: STONE_SHADE, f: WOOD, F: WOOD_DARK, p: PLANK, d: INK };
    const sites = [
      ["f.f.f.f.", "fffffff.", "f.f.f.f.", "fsssssf.", "fSSSSSf.", "fSdSSSf.", "pp......"],
      [".f.f.f.f", ".fffffff", ".fsssf.f", ".fSSSfff", ".fSSdf.f", ".fSSSf..", "....pppp"],
      ["ffff....", "fssf.ff.", "fSSf.fs.", "fSSffff.", "fSdf.fS.", "....pp..", "ppp....."],
      ["f.ff.f..", "fffffff.", "f.sss.f.", "fsSSSsf.", "fSSdSSf.", "fSSSSSf.", ".....ppp"],
    ];
    p.stamp(sites[v]!, 0, 1, key);
  },
  // 12 landmark: a large cathedral or palace (placeholder for hand-made landmarks).
  (p, v) => {
    cobbles(p);
    const art: [readonly string[], Record<string, string>][] = [
      // Cathedral: twin towers with spires over a long nave.
      [
        [".y....y.", ".S....S.", "SSs..SSs", "ttTrrttT", "txTrrtxT", "ttTRRttT", "twwwwwwT", "twxddxwT"],
        { y: GOLD, S: "#566c86", s: "#333c57", t: "#f4f4f4", T: STONE, r: BRICK.l, R: BRICK.d, w: "#f4f4f4", x: INK, d: INK },
      ],
      // Palace with a central dome and the realm flag.
      [
        ["...pf...", "...LL...", "..LLMS..", "rrLMMSrr", "RRwwwwRR", "wwwxxwww", "wxwddwxw", "WWWWWWWW"],
        { p: INK, f: TOWN_FLAG, L: GOLD, M: PLANK, S: "#9a6b45", r: TERRACOTTA.l, R: TERRACOTTA.d, w: "#f4f4f4", W: STONE, x: INK, d: INK },
      ],
      // Basilica seen from above: a cross of roofs and a crossing dome.
      [
        ["..rrRr..", "..rrRr..", "rrrLLrRr", "RRRLMRRR", "wwwMSwww", "..rrRr..", "..wwww..", "..wddw.."],
        { r: BRICK.l, R: BRICK.d, L: "#cbdbfc", M: "#94b0c2", S: "#566c86", w: "#f4f4f4", d: INK },
      ],
      // Palace around a court with gilded corner pavilions.
      [
        ["yyrrrryy", "YYRRRRYY", "wwccccww", "rrcbbcrr", "RRccccRR", "wwccccww", "yyrddryy", "YYwddwYY"],
        { y: GOLD, Y: PLANK, r: TERRACOTTA.l, R: TERRACOTTA.d, w: "#f4f4f4", c: "#d6b886", b: "#2f8a4a", d: INK },
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
