import { PALETTE } from "./palette.ts";

/**
 * Hand-drawn pixel sprites as text so they're easy to edit in a diff.
 * Each character is one pixel: "." is transparent, other letters map to
 * palette colours below; "N" and "n" are the owning nation's colour and a
 * darker shade of it.
 */
const KEY: Record<string, string> = {
  k: PALETTE.ink,
  w: PALETTE.paper,
  g: PALETTE.mist,
  s: PALETTE.steel,
  d: PALETTE.slate,
  y: PALETTE.gold,
  o: PALETTE.clay,
  r: PALETTE.blood,
  b: "#8b5a3c", // wood / leather
  f: "#f2c09c", // skin
};

export const SPRITES = {
  /** Capital city: a walled keep. */
  capital: [
    "..k.k.k.k..",
    "..kwkwkwk..",
    "..kwwwwwk..",
    "k.kwgkgwk.k",
    "kwkwgkgwkwk",
    "kwwwwwwwwwk",
    "kwgwwkwwgwk",
    "kwwwkkkwwwk",
    "kkkkkkkkkkk",
  ],
  /** Ordinary town. */
  town: [
    "...k...",
    "..kNk..",
    ".kNNNk.",
    "kwwwwwk",
    "kwkwkwk",
    "kwwkwwk",
    "kkkkkkk",
  ],
  /** Commander on foot with a banner in the nation's colour. */
  commander: [
    "....kk......",
    "...kNNk.....",
    "...kNnk.....",
    "...kk.......",
    "..k.ky......",
    "..kkyyk.....",
    "..kfffk.....",
    "..kfkfk.....",
    "..kkffk.....",
    ".kNNNNNk....",
    "kNnNyNnNk...",
    "kfkNNNkfk...",
    "kk.kssk.kk..",
    "...kssk.....",
    "...kbkbk....",
    "...kk.kk....",
  ],
  /** Plain army without a named commander. */
  soldier: [
    "....k.....",
    "...kgk....",
    "..kfffk...",
    "..kfkfk...",
    "..kkffk.k.",
    ".kNNNNNkgk",
    "kNnNNNnNkk",
    "kfkNNNkfk.",
    "kk.kssk.k.",
    "...kssk...",
    "...kbkbk..",
    "...kk.kk..",
  ],
  /** Move order arrow head. */
  flag: [
    "kk....",
    "kNNNk.",
    "kNnNNk",
    "kNNNk.",
    "kk....",
    "k.....",
    "k.....",
  ],
} as const;

export type SpriteName = keyof typeof SPRITES;

const cache = new Map<string, HTMLCanvasElement>();

function darker(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.62);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Renders a sprite at an integer scale, tinted with a nation colour. Cached. */
export function sprite(name: SpriteName, nationColor: string, scale: number): HTMLCanvasElement {
  const key = `${name}|${nationColor}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = SPRITES[name];
  const canvas = document.createElement("canvas");
  canvas.width = rows[0]!.length * scale;
  canvas.height = rows.length * scale;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      ctx.fillStyle = ch === "N" ? nationColor : ch === "n" ? darker(nationColor) : KEY[ch]!;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  cache.set(key, canvas);
  return canvas;
}
