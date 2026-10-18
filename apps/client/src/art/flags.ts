/**
 * National flags (feedback 55): each realm's own flag, the one a player knows
 * it by (France's blue, white and red, England's red cross), drawn as a small
 * pixel cloth with no pole. A flag is a few layers painted in order on a
 * 15 × 9 cloth: bands, crosses, a canton, an emblem. Realms without a flag
 * here get a plain cloth in their map colour.
 */

import { NATION_FLAGS } from "./nationFlags.ts";

/** Flag colours by letter, from the game's palette. */
export const FLAG_COLORS = {
  R: "#b13e53", // red
  r: "#7a2438", // dark red, crimson
  O: "#ef7d57", // orange
  Y: "#ffcd75", // gold, yellow
  W: "#f4f4f4", // white
  K: "#1a1c2c", // black
  B: "#3b5dc9", // blue
  b: "#29366f", // dark blue
  S: "#41a6f6", // sky blue
  G: "#38b764", // green
  g: "#257179", // dark green
  P: "#5d275d", // purple
  N: "#8b5a3c", // brown
  A: "#94b0c2", // grey, silver
} as const;
export type FlagColor = keyof typeof FLAG_COLORS;

export const FLAG_W = 15;
export const FLAG_H = 9;

/** Small pictures for the middle of a flag, 5 wide; "#" is the emblem's colour, "o" its second colour. */
const EMBLEMS = {
  crescent: [".##..", "#....", "#..#.", "#....", ".##.."],
  crescentStar: [".##..", "#....", "#..o.", "#....", ".##.."],
  star: ["..#..", "#####", ".###.", ".#.#.", "#...#"],
  cross: ["..#..", "#####", "..#..", "..#..", "..#.."],
  greekCross: ["..#..", "..#..", "#####", "..#..", "..#.."],
  eagle: ["#.#.#", "#####", ".###.", "..#..", ".#.#."],
  doubleEagle: ["#...#", "##o##", ".###.", "..#..", ".#.#."],
  lion: [".##..", ".#o#.", "..##.", ".###.", "#..##"],
  fleur: ["..#..", ".###.", "#.#.#", "#####", "..#.."],
  sun: ["#.#.#", ".###.", "##o##", ".###.", "#.#.#"],
  disc: [".###.", "#####", "#####", "#####", ".###."],
  ring: [".###.", "#...#", "#...#", "#...#", ".###."],
  crown: ["#.#.#", "#####", "#o#o#", "#####", "....."],
  keys: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  tower: ["#.#.#", "#####", "##.##", "##.##", "#####"],
  wheel: [".#.#.", "#.#.#", ".###.", "#.#.#", ".#.#."],
  dragon: ["##...", ".##.#", "..###", ".##..", "##..."],
  lotus: ["..#..", ".#.#.", "#.#.#", ".###.", "#####"],
  sword: ["....#", "...#.", "#.#..", ".#...", "#.#.."],
  tree: ["..#..", ".###.", "#####", "..#..", ".###."],
  bow: ["#....", ".#..#", "..##.", ".#..#", "#...."],
  feather: ["...##", "..##.", ".##..", "##...", "#...."],
  diamond: ["..#..", ".###.", "#####", ".###.", "..#.."],
  mountain: [".....", "..#..", ".###.", "#####", "....."],
} as const;
export type Emblem = keyof typeof EMBLEMS;

/**
 * One layer of a flag:
 * - `h` and `v`: equal bands, top to bottom or hoist to fly;
 * - `cross`: a centred cross; `nordic`: a cross toward the hoist, with an optional inner cross;
 * - `saltire`: a diagonal cross; `bend`: one diagonal from the top of the hoist;
 * - `quarter`: the top-hoist and bottom-fly quarters; `canton`: the top-hoist corner;
 * - `hoist`: a triangle from the hoist; `stripe`: a band at the hoist a third wide;
 * - `border`: a rim; `chequy`: a chequerboard;
 * - `emblem`: a small picture, in the middle or ("hoist") toward the hoist, with an optional second colour.
 */
export type Layer =
  | ["h" | "v", ...FlagColor[]]
  | ["cross" | "saltire" | "bend" | "canton" | "hoist" | "stripe" | "border", FlagColor]
  | ["nordic", FlagColor, FlagColor?]
  | ["quarter" | "chequy", FlagColor, FlagColor]
  | ["emblem", Emblem, FlagColor, ("middle" | "hoist")?, FlagColor?];

/** The flag's cloth as rows of colours, FLAG_W × FLAG_H, or null when the realm has no flag of its own. */
export function flagGrid(id: string): string[][] | null {
  const layers = NATION_FLAGS[id];
  if (!layers) return null;
  const g: string[][] = Array.from({ length: FLAG_H }, () => Array<string>(FLAG_W).fill(FLAG_COLORS.W));
  const set = (x: number, y: number, c: FlagColor) => {
    if (x >= 0 && y >= 0 && x < FLAG_W && y < FLAG_H) g[y]![x] = FLAG_COLORS[c];
  };
  const fill = (test: (x: number, y: number) => boolean, c: FlagColor) => {
    for (let y = 0; y < FLAG_H; y++) for (let x = 0; x < FLAG_W; x++) if (test(x, y)) set(x, y, c);
  };
  for (const layer of layers) {
    switch (layer[0]) {
      case "h": {
        const bands = layer.slice(1) as FlagColor[];
        fill(() => true, bands[0]!);
        for (let y = 0; y < FLAG_H; y++) {
          const c = bands[Math.min(bands.length - 1, Math.floor(((y + 0.5) * bands.length) / FLAG_H))]!;
          for (let x = 0; x < FLAG_W; x++) set(x, y, c);
        }
        break;
      }
      case "v": {
        const bands = layer.slice(1) as FlagColor[];
        for (let x = 0; x < FLAG_W; x++) {
          const c = bands[Math.min(bands.length - 1, Math.floor(((x + 0.5) * bands.length) / FLAG_W))]!;
          for (let y = 0; y < FLAG_H; y++) set(x, y, c);
        }
        break;
      }
      case "cross":
        fill((x, y) => (x >= 6 && x <= 8) || (y >= 3 && y <= 5), layer[1]);
        break;
      case "nordic":
        fill((x, y) => (x >= 3 && x <= 5) || (y >= 3 && y <= 5), layer[1]);
        if (layer[2]) fill((x, y) => x === 4 || y === 4, layer[2]);
        break;
      case "saltire":
        fill((x, y) => Math.abs(x * (FLAG_H - 1) - y * (FLAG_W - 1)) < 13 || Math.abs(x * (FLAG_H - 1) - (FLAG_H - 1 - y) * (FLAG_W - 1)) < 13, layer[1]);
        break;
      case "bend":
        fill((x, y) => Math.abs(x * (FLAG_H - 1) - y * (FLAG_W - 1)) < 15, layer[1]);
        break;
      case "canton":
        fill((x, y) => x < 6 && y < 4, layer[1]);
        break;
      case "hoist":
        fill((x, y) => x <= Math.min(y, FLAG_H - 1 - y) + 1, layer[1]);
        break;
      case "stripe":
        fill((x) => x < 5, layer[1]);
        break;
      case "border":
        fill((x, y) => x === 0 || y === 0 || x === FLAG_W - 1 || y === FLAG_H - 1, layer[1]);
        break;
      case "quarter":
        fill((x, y) => (x < 7) === (y < 4), layer[1]);
        fill((x, y) => (x < 7) !== (y < 4), layer[2]);
        break;
      case "chequy":
        fill((x, y) => ((x >> 1) + (y >> 1)) % 2 === 0, layer[1]);
        fill((x, y) => ((x >> 1) + (y >> 1)) % 2 === 1, layer[2]);
        break;
      case "emblem": {
        const [, name, c, where, second] = layer;
        const art = EMBLEMS[name];
        const ox = where === "hoist" ? 2 : 5;
        const oy = 2;
        art.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            if (row[x] === "#") set(ox + x, oy + y, c);
            else if (row[x] === "o") set(ox + x, oy + y, second ?? c);
          }
        });
        break;
      }
    }
  }
  return g;
}

/** The size in CSS pixels of a flag drawn as a waving cloth at a scale: its rim, and a pixel of wave. */
export function flagCanvasSize(scale = 1): { w: number; h: number } {
  return { w: (FLAG_W + 2) * scale, h: (FLAG_H + 3) * scale };
}

/** The flag's two main colours (the most common cloth colours), for coats, plumes and standards. */
export function flagColors(id: string, fallback: string): [string, string] {
  const g = flagGrid(id);
  if (!g) return [fallback, FLAG_COLORS.W];
  const count = new Map<string, number>();
  for (const row of g) for (const c of row) count.set(c, (count.get(c) ?? 0) + 1);
  const [first, second] = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  return [first!, second ?? first!];
}
