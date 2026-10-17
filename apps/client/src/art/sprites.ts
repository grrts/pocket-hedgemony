import { PALETTE } from "./palette.ts";

/**
 * Hand-drawn pixel sprites as text so they're easy to edit in a diff.
 * Each character is one pixel: "." is transparent, other letters map to
 * the colours below; "N", "L" and "n" are the owning nation's colour, a
 * lighter and a darker shade of it. An ink outline is added around every
 * sprite when it is drawn, so the art only needs its inner lines.
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
  b: "#8b5a3c", // wood, leather, horse
  a: "#b07a4e", // horse in light
  H: "#4a2e1e", // horse in shade, hooves
  z: "#2b2130", // eyes
  t: "#5c3a26", // dark wood: poles, hooves
  h: "#4a2e1e", // hair
  f: "#f2c09c", // skin
  F: "#c98f6c", // skin in shade
  c: "#d8ccb0", // stone, plaster
  e: "#a39478", // stone in shade
  E: "#6e6252", // ground shadow
  m: "#2b2130", // doorways, arrow slits
};

export const SPRITES = {
  /** Capital city: a keep flying the realm's banner behind a gatehouse wall. */
  capital: [
    ".........t.........",
    ".........tNNN......",
    ".........tLNNn.....",
    ".........tNNn......",
    ".........t.........",
    ".......c.c.e.......",
    "c.c.e..ccwce..c.c.e",
    "cccce..ccmce..cccce",
    "ccmce..cccce..ccmce",
    "ccmce.ckckckc.ccmce",
    "ccccekcNcccNckcccce",
    "ccecekcncecnckcccce",
    "ceccekcckkkcckcecce",
    "ccccekckmsmkckccece",
    "ecccEkckmsmkckeccee",
    "eeeeEkekmsmkekeeeee",
    "EEEEEEEEEEEEEEEEEEE",
  ],
  /** Ordinary town: a timber-framed house under a roof in the realm's colour. */
  town: [
    "......k...t..",
    ".....kLk..t..",
    "....kLNnk.t..",
    "...kLNNNnkt..",
    "..kLNNNNNnk..",
    ".kLNNNNNNNnk.",
    "kLNNNNNNNNNnk",
    ".kbbbbbbbbbk.",
    ".kcwwcbcccek.",
    ".kcggcbcmmek.",
    ".kccccbcmmek.",
    ".keeeebemmek.",
    "EEEEEEEEEEEEE",
  ],
  /** Village: a single cottage with a smoke-pole, roofed in the realm's colour. */
  village: [
    "....k....",
    "...kLk.t.",
    "..kLNnkt.",
    ".kLNNNnk.",
    "kLNNNNNnk",
    ".kbbbbbk.",
    ".kcwbmck.",
    ".kecbmek.",
    "EEEEEEEEE",
  ],
  /** City: a church spire among houses roofed in the realm's colour. */
  city: [
    "..........y..........",
    ".........kck.........",
    ".........kck.........",
    "........kcwck........",
    "...k....kcmck.....k..",
    "..kLk...kcmck....kLk.",
    ".kLNnk.kNNNNnk..kLNnk",
    "kLNNNnkLNNNNNnkkLNNNn",
    ".kbbbkkcccccccekkbbbk",
    ".kcwck.cwcmmcwe.kcwck",
    ".kcmck.cccmmcce.kcmck",
    ".kemek.eccmmcee.kemek",
    "EEEEEEEEEEEEEEEEEEEEE",
  ],
  /** Castle: a stone tower standing beside the settlement. */
  tower: [
    "c.c.e",
    "cccce",
    "ccmce",
    "ccmce",
    "cccce",
    "ccece",
    "cecce",
    "ccmce",
    "ecmee",
    "EEEEE",
  ],
  /** Fort: an earthwork ring with a palisade of stakes in front of the settlement. */
  palisade: [
    "t.t.t.t.t.t.t.t.t.t.t",
    "ttttttttttttttttttttt",
    "tbtbtbtbtbtbtbtbtbtbt",
    "ooooooooooooooooooooo",
  ],
  /** Commander: a knight on a barded horse, lance pennant, plume and caparison in the realm's colour. */
  commander: [
    "..y........NL.........",
    "..tNNNNN..Nn..........",
    "..tLLLN..ggg..........",
    "..tnnnnngssd..........",
    "..t......ffd..........",
    "..t......Ffs.....Hb...",
    "..t....sLNNNns...aab..",
    "..t....gLyyynd..hbbzbb",
    "..tfssssLNyNn...hbbyHb",
    "..t.f...LNLNn..hbbbbbH",
    "..t.....LNNNn.hbbb..bb",
    "..t.aaaatttttaaabb....",
    "..thbLLLLLssLLLbb.....",
    "..tHbNyNNyssyNNb......",
    "..t.bNNyNNsdNyNb......",
    ".ht.bnnnnndnnnnb......",
    ".ht.HnHnHnHnHnHH......",
    "..h..bH.bH...bH.bH....",
    ".....bH.bH...bH.bH....",
    ".....ba.bb...ba.bb....",
    ".....bb.bb...bb.bb....",
    ".....HH.HH...HH.HH....",
  ],
  /** Plain army without a named commander: a helmeted spearman. */
  soldier: [
    "....s.....",
    "...sgs....",
    "..sgggs.k.",
    "..sffFs.s.",
    "...ffF..s.",
    "..NNLNNfs.",
    ".NNLNNNNs.",
    ".fNLNNNns.",
    "..bbybbbs.",
    "..NNNNNn..",
    "..ss.ss...",
    "..ss.ss...",
    ".bbb.bbb..",
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

function shade(hex: string, ch: "n" | "L"): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(ch === "n" ? v * 0.62 : v + (255 - v) * 0.35);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** The sprite with a one-pixel ink outline around everything that isn't ink already. */
function outlined(rows: readonly string[]): string[] {
  const w = rows[0]!.length + 2;
  const grid = [".".repeat(w), ...rows.map((r) => `.${r}.`), ".".repeat(w)];
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < grid.length && !".k".includes(grid[y]![x]!);
  return grid.map((row, y) =>
    [...row].map((ch, x) => (ch === "." && (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) ? "k" : ch)).join(""),
  );
}

/** Renders a sprite at an integer scale, tinted with a nation colour. Cached. */
export function sprite(name: SpriteName, nationColor: string, scale: number): HTMLCanvasElement {
  const key = `${name}|${nationColor}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = outlined(SPRITES[name]);
  const canvas = document.createElement("canvas");
  canvas.width = rows[0]!.length * scale;
  canvas.height = rows.length * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      ctx.fillStyle = ch === "N" ? nationColor : ch === "n" || ch === "L" ? shade(nationColor, ch) : KEY[ch]!;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  cache.set(key, canvas);
  return canvas;
}

const urlCache = new Map<string, string>();
/** The sprite as a data URL for an <img>, cached: encoding a PNG takes far longer than drawing it. */
export function spriteUrl(name: SpriteName, nationColor: string, scale: number): string {
  const key = `${name}|${nationColor}|${scale}`;
  let url = urlCache.get(key);
  if (!url) urlCache.set(key, (url = sprite(name, nationColor, scale).toDataURL()));
  return url;
}
