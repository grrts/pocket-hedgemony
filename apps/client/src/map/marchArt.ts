import { ROUTE_STROKE, type Figure } from "@ph/engine/domain/map-presentation";
import { PALETTE } from "../art/palette.ts";
import { commanderSprite, type CommanderLook } from "../art/commanders.ts";
import { figureSprite, sprite, type FigureName, type SpriteName } from "../art/sprites.ts";

/**
 * The map's moving pieces, drawn as pixel art on the overlay: army tokens (the
 * commander on foot in the realm's colours, or a ship), the march route as a trail of
 * stones with a marker for each week's end, and battles playing out. Every
 * shape is whole art pixels of `u` CSS pixels, snapped to the screen grid.
 */

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

/** Men as a short count: "800", "4.5K", "12K". Tenths under ten thousand, so a change of a few hundred shows. */
export function menShort(men: number): string {
  if (men < 1000) return String(Math.round(men));
  const k = men / 1000;
  return k < 10 ? `${(Math.round(k * 10) / 10).toFixed(1).replace(/\.0$/, "")}K` : `${Math.round(k)}K`;
}

/** Parchment and ink of the panels, so the map's number tags read as part of the same UI. */
const TAG_PAPER = "#f8ecc8";
const TAG_INK = "#3a2414";
/** Height in art pixels of a number tag. */
const TAG_H = 11;
const TAG_FONT = '"Jersey 10", "Courier New", monospace';
const tagCache = new Map<string, HTMLCanvasElement>();
// Tags drawn before the font arrived used a fallback; redraw them.
globalThis.document?.fonts?.addEventListener("loadingdone", () => tagCache.clear());

/** Width in CSS pixels of a number tag for this text (feedback: counts were hard to read). */
export function plateWidth(text: string, u: number): number {
  // Without a page (the specs run in Node) the width is estimated from the font's usual glyph width.
  if (!globalThis.document) return (Math.ceil(text.length * 4.6) + 6) * u;
  return plateBitmap(text, u).width / tagDpr();
}

const tagDpr = () => Math.min(window.devicePixelRatio || 1, 2);

/**
 * A number tag: light parchment with an ink rim and cut corners, the number in the
 * UI's font in dark ink, with even parchment above and below it.
 * Drawn once per text and size, then reused.
 */
function plateBitmap(text: string, u: number): HTMLCanvasElement {
  const key = `${u}|${text}`;
  const hit = tagCache.get(key);
  if (hit) return hit;
  const dpr = tagDpr();
  const fontPx = Math.round(8 * u * 1.15);
  const font = `${fontPx}px ${TAG_FONT}`;
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d")!;
  c.font = font;
  const m = c.measureText(text);
  // Whole art pixels wide, with room either side of the number.
  const w = (Math.ceil(m.width / u) + 6) * u;
  const h = TAG_H * u;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  c.scale(dpr, dpr);
  c.fillStyle = PALETTE.ink;
  c.fillRect(u, 0, w - 2 * u, h);
  c.fillRect(0, u, w, h - 2 * u);
  c.fillStyle = TAG_PAPER;
  c.fillRect(u, u, w - 2 * u, h - 2 * u);
  c.font = font;
  c.fillStyle = TAG_INK;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  // Centre the ink of the glyphs, not the em box, so the parchment above and below is the same.
  const ascent = m.actualBoundingBoxAscent || fontPx * 0.6;
  const descent = m.actualBoundingBoxDescent || 0;
  c.fillText(text, w / 2, Math.round(h / 2 + (ascent - descent) / 2));
  tagCache.set(key, canvas);
  if (tagCache.size > 600) tagCache.delete(tagCache.keys().next().value!);
  return canvas;
}

/** A number tag, centred on x with its top at y. Returns its height. */
export function drawPlate(ctx: Ctx, text: string, x: number, y: number, u: number): number {
  const img = plateBitmap(text, u);
  const dpr = tagDpr();
  const w = img.width / dpr;
  const h = img.height / dpr;
  const left = Math.round(x - w / 2);
  const top = Math.round(y);
  ctx.drawImage(img, left, top, w, h);
  return h;
}

/** The small pixel digits of the siege row, 3 × 5 each. */
const GLYPHS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "##.", "..#", "##."],
  "6": [".##", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "##."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  ".": ["...", "...", "...", "...", ".#."],
  "-": ["...", "...", "###", "...", "..."],
  "+": ["...", ".#.", "###", ".#.", "..."],
};

/** Width in art pixels of a string in the pixel digits (a gap of one between glyphs). */
export function digitsWidth(text: string): number {
  return [...text].reduce((w, ch) => w + (ch === "." ? 1 : 3) + 1, -1);
}

/** Draws text in the pixel digits, its top-left at x, y. */
export function drawDigits(ctx: Ctx, text: string, x: number, y: number, u: number, color: string): void {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    if (!g) {
      cx += 2 * u;
      continue;
    }
    const narrow = ch === ".";
    for (let r = 0; r < 5; r++)
      for (let c = narrow ? 1 : 0; c < (narrow ? 2 : 3); c++) if (g[r]![c] === "#") ctx.fillRect(cx + (c - (narrow ? 1 : 0)) * u, y + r * u, u, u);
    cx += ((narrow ? 1 : 3) + 1) * u;
  }
}

// ---- flipped sprites (armies face where they march) ----
const flipped = new Map<string, HTMLCanvasElement>();
function facing(name: SpriteName, color: string, scale: number, dir: 1 | -1): HTMLCanvasElement {
  const img = sprite(name, color, scale);
  if (dir === 1) return img;
  const key = `${name}|${color}|${scale}`;
  let f = flipped.get(key);
  if (!f) {
    f = document.createElement("canvas");
    f.width = img.width;
    f.height = img.height;
    const c = f.getContext("2d")!;
    c.translate(img.width, 0);
    c.scale(-1, 1);
    c.drawImage(img, 0, 0);
    flipped.set(key, f);
  }
  return f;
}

/** A soft pixel shadow on the ground, centred on x, y. */
function groundShadow(ctx: Ctx, x: number, y: number, u: number, halfWidth: number): void {
  ctx.fillStyle = "rgb(26 28 44 / 0.35)";
  ctx.fillRect(Math.round(x - halfWidth * u), Math.round(y - u), Math.round(halfWidth * 2 * u), 2 * u);
  ctx.fillRect(Math.round(x - (halfWidth - 2) * u), Math.round(y - 2 * u), Math.round((halfWidth - 2) * 2 * u), 4 * u);
}

/** Pixel corner brackets round a box, pushed out by `grow` art pixels. */
export function brackets(ctx: Ctx, x: number, y: number, w: number, h: number, u: number, grow: number, color: string): void {
  const g = grow * u;
  const l = 3 * u;
  const x0 = Math.round(x - g);
  const y0 = Math.round(y - g);
  const x1 = Math.round(x + w + g);
  const y1 = Math.round(y + h + g);
  for (const [c, d] of [[PALETTE.ink, u], [color, 0]] as const) {
    ctx.fillStyle = c;
    // Ink first, one pixel larger all round, so the bracket reads on any ground.
    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
      ctx.fillRect(sx > 0 ? cx - d : cx - l - d, sy > 0 ? cy - d : cy - u - d, l + 2 * d, u + 2 * d);
      ctx.fillRect(sx > 0 ? cx - d : cx - u - d, sy > 0 ? cy - d : cy - l - d, u + 2 * d, l + 2 * d);
    }
  }
}

export interface TokenStyle {
  /** The tile's centre on screen: the figure stands on it. */
  x: number;
  y: number;
  u: number;
  color: string;
  men: number;
  naval?: boolean;
  /** Who leads the army, for the figure; without it, a rider in the realm's colour. */
  commander?: CommanderLook;
  /** The realm's flag, drawn on the men count's row before it (feedback 80). */
  flag?: HTMLCanvasElement;
  /** 1 faces east, -1 west. */
  dir: 1 | -1;
  moving: boolean;
  selected: boolean;
  /** Clock for the animation, ms. */
  t: number;
}

/**
 * CSS pixels per art pixel of an army's figure, its flag row and plate at a camera zoom: one size at
 * every zoom from Local in, so the figure never grows to cover its province (VIEW-085, feedback 57).
 */
export function armyFigureUnit(_zoom: number): number {
  return 2;
}

/** The commander's name shows under their army when it is selected, or once zoomed in close. */
export function armyNameShown(selected: boolean, zoom: number): boolean {
  return selected || zoom >= 8;
}

/** What stands for an army on the map: its commander on foot, a rider in the realm's colour without one, a ship at sea. */
export function tokenFigure(s: { naval?: boolean; commander?: unknown }): "commander on foot" | "rider" | "ship" {
  return s.naval ? "ship" : s.commander ? "commander on foot" : "rider";
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where each part of an army token goes, in CSS pixels. */
export interface TokenLayout {
  /** The figure's sprite. */
  figure: Box;
  /** The realm's flag, on the plate's row before it; null without a flag. */
  flag: Box | null;
  /** The men count's plate and its text. */
  plate: Box & { text: string };
  /** The tap box round figure, flag and plate. */
  tap: Box;
  /** The top centre of the commander's name, below everything else. */
  name: { x: number; y: number };
}

/**
 * Lays out an army token (VIEW-086): the figure's feet on the tile's centre (x, y), the men count on a
 * plate below, and the realm's flag before the plate on the same row, centred on it; the pair is centred
 * under the figure; the commander's name goes below them. Sizes are the sprites' in CSS pixels.
 */
export function tokenLayout(s: {
  x: number;
  y: number;
  u: number;
  men: number;
  figure: { w: number; h: number };
  flag?: { w: number; h: number } | undefined;
  bob?: number;
}): TokenLayout {
  const { u } = s;
  const img = s.figure;
  const x = Math.round(s.x - img.w / 2);
  // The sprite's last row is its feet (or keel): put them on the tile's centre.
  const y = Math.round(s.y - img.h + u + (s.bob ?? 0));
  const figure = { x, y, w: img.w, h: img.h };
  const text = menShort(s.men);
  const plateTop = Math.round(s.y + 2 * u);
  const plateW = plateWidth(text, u);
  const plateH = TAG_H * u;
  let flag: Box | null = null;
  let plate: Box & { text: string };
  let tap: Box;
  if (!s.flag) {
    plate = { x: Math.round(s.x - plateW / 2), y: plateTop, w: plateW, h: plateH, text };
    tap = { x, y, w: img.w, h: img.h + plateH + 2 * u };
  } else {
    const gap = u;
    const left = Math.round(s.x - (s.flag.w + gap + plateW) / 2);
    plate = { x: Math.round(left + s.flag.w + gap), y: plateTop, w: plateW, h: plateH, text };
    flag = { x: left, y: Math.round(s.y + 2 * u + (plateH - s.flag.h) / 2), w: s.flag.w, h: s.flag.h };
    const bx = Math.min(x, left);
    tap = { x: bx, y, w: Math.max(x + img.w, left + s.flag.w + gap + plateW) - bx, h: img.h + plateH + 2 * u };
  }
  return { figure, flag, plate, tap, name: { x: s.x, y: tap.y + tap.h + 2 } };
}

/** Draws an army token: the figure on its tile with its men on a plate below. Returns its layout; `tap` is its tap box. */
export function drawToken(ctx: Ctx, s: TokenStyle): TokenLayout {
  const { u } = s;
  // Two frames: legs (or waves) step while marching, the standard flutters at rest.
  const frame = Math.floor(s.t / (s.moving ? 160 : 520)) % 2;
  const name: SpriteName = s.naval ? (frame ? "ship1" : "ship0") : frame ? "rider1" : "rider0";
  const img =
    tokenFigure(s) === "commander on foot" ? commanderSprite(s.commander!, u, frame as 0 | 1, s.dir, s.moving) : facing(name, s.color, u, s.dir);
  const bob = s.moving && !s.naval ? (frame ? -u : 0) : s.naval && frame ? u : 0;
  const L = tokenLayout({ x: s.x, y: s.y, u, men: s.men, figure: { w: img.width, h: img.height }, flag: s.flag && { w: s.flag.width, h: s.flag.height }, bob });
  groundShadow(ctx, s.x, s.y + u, u, 6);
  if (s.selected) {
    const pulse = Math.floor(s.t / 260) % 2;
    brackets(ctx, L.figure.x, L.figure.y, img.width, img.height + 10 * u, u, 1 + pulse, PALETTE.gold);
  }
  ctx.drawImage(img, L.figure.x, L.figure.y);
  drawPlate(ctx, L.plate.text, L.plate.x + L.plate.w / 2, L.plate.y, u);
  if (s.flag && L.flag) ctx.drawImage(s.flag, L.flag.x, L.flag.y);
  return L;
}

export interface RouteStyle {
  /** Screen points from the army to the end of its march. */
  pts: Pt[];
  u: number;
  color: string;
  /** Where the army stands as each week ends, 1 first. */
  weeks: Pt[];
  /** Clock for the animation, ms. */
  t: number;
  /** Width of the view: a jump wider than half of it is the date line, not a segment. */
  viewWidth: number;
}

/**
 * The march route: a trail of square stones, a light dash over a dark outline so it reads on
 * snow, desert, sea and white realms alike (VIEW-075), flowing toward
 * the end; a numbered marker where each week ends; and the target tile
 * framed by brackets with a small standard planted dead centre.
 */
export function drawRoute(ctx: Ctx, r: RouteStyle): void {
  const { u, pts } = r;
  if (pts.length < 2) return;
  const step = 6 * u;
  // Stones move one step along every 600 ms, so the trail reads as going somewhere.
  let carry = step - ((r.t / 600) % 1) * step;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    if (Math.abs(bx - ax) > r.viewWidth / 2) continue;
    const len = Math.hypot(bx - ax, by - ay);
    let d = carry;
    for (; d < len; d += step) {
      const x = Math.round((ax + ((bx - ax) * d) / len) / u) * u;
      const y = Math.round((ay + ((by - ay) * d) / len) / u) * u;
      ctx.fillStyle = ROUTE_STROKE.outline;
      ctx.fillRect(x - 2 * u, y - u, 4 * u, 2 * u);
      ctx.fillRect(x - u, y - 2 * u, 2 * u, 4 * u);
      ctx.fillStyle = ROUTE_STROKE.dash;
      ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    }
    carry = d - len;
  }
  r.weeks.forEach(([x, y], i) => drawWeekMark(ctx, x, y, u, i + 1));
  const [ex, ey] = pts.at(-1)!;
  const pulse = Math.floor(r.t / 300) % 2;
  brackets(ctx, Math.round(ex - 4 * u), Math.round(ey - 4 * u), 8 * u, 8 * u, u, pulse, PALETTE.paper);
  drawStandard(ctx, ex, ey, u, r.color);
}

/** A numbered marker for where the army will be when a week ends. */
function drawWeekMark(ctx: Ctx, x: number, y: number, u: number, n: number): void {
  drawPlate(ctx, String(n), x, y - (TAG_H * u) / 2, u);
}

/** A small standard planted with the foot of its pole dead centre on x, y. */
function drawStandard(ctx: Ctx, x: number, y: number, u: number, color: string): void {
  const px = Math.round(x - u / 2);
  const top = Math.round(y - 11 * u);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(px - u, top - u, 3 * u, 12 * u);
  ctx.fillRect(px + u, top - u, 7 * u, 7 * u);
  ctx.fillStyle = "#5c3a26";
  ctx.fillRect(px, top, u, 11 * u);
  ctx.fillStyle = color;
  ctx.fillRect(px + u, top, 6 * u, 5 * u);
  ctx.fillStyle = "rgb(0 0 0 / 0.25)";
  ctx.fillRect(px + u, top + 4 * u, 6 * u, u);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(px, top - u, u, u);
}

/**
 * Where a march stands as each week ends: for each week, the index of the
 * last path tile reached by then (-1 while still on the starting tile).
 * The first week ends `firstHours` from now, the rest every `weekHours`.
 * The march's own end is left out: the target marker shows it.
 */
export function weekEnds(pathHours: ArrayLike<number>, firstHours: number, weekHours: number): number[] {
  const out: number[] = [];
  const total = pathHours.length ? pathHours[pathHours.length - 1]! : 0;
  let i = -1;
  for (let next = firstHours; next < total; next += weekHours) {
    while (i + 1 < pathHours.length && pathHours[i + 1]! <= next) i++;
    out.push(i);
  }
  return out;
}

// ---- battles ----
interface Floater {
  text: string;
  dx: number;
  born: number;
  color: string;
}
const lastMen = new Map<number, [number, number]>();
const floaters = new Map<number, Floater[]>();

export interface BattleStyle {
  id: number;
  x: number;
  y: number;
  u: number;
  attColor: string;
  defColor: string;
  attMen: number;
  defMen: number;
  attStart: number;
  defStart: number;
  /** Morale left per side, 0..1 (VIEW-077). */
  attMorale: number;
  defMorale: number;
  t: number;
  /** False draws only the plates, bars and losses: the living map draws the figures itself (VIEW-119). */
  figures?: boolean;
}

/**
 * A battle playing out on its tile: the two hosts lunge at each other, dust
 * and sparks fly, losses float up from each side as they happen, and a plate
 * above shows the men each side has left of those it brought.
 * Returns whether it is still animating something that needs every frame.
 */
export function drawBattle(ctx: Ctx, b: BattleStyle): boolean {
  const { u, x, y, t } = b;
  // Faded as the living map takes over, so every alpha here is a share of the one it was called with.
  const alpha = ctx.globalAlpha;
  const prev = lastMen.get(b.id);
  const list = floaters.get(b.id) ?? [];
  if (prev) {
    const lostA = prev[0] - b.attMen;
    const lostD = prev[1] - b.defMen;
    if (lostA >= 1) list.push({ text: `-${menShort(lostA)}`, dx: -10, born: t, color: b.attColor });
    if (lostD >= 1) list.push({ text: `-${menShort(lostD)}`, dx: 10, born: t, color: b.defColor });
  }
  lastMen.set(b.id, [b.attMen, b.defMen]);
  const frame = Math.floor(t / 140) % 4;
  const lunge = frame === 1 || frame === 2 ? u : 0;
  const att = facing(frame % 2 ? "rider1" : "rider0", b.attColor, u, 1);
  const def = facing(frame % 2 ? "rider0" : "rider1", b.defColor, u, -1);
  if (b.figures !== false) drawMelee(ctx, b, att, def, frame, lunge, alpha);
  // Each side's men left, over a bar of what it brought and a bar of its morale (VIEW-077).
  const top = Math.round(y - att.height - 15 * u);
  sideBar(ctx, x - 1 * u, top, u, b.attMen, b.attStart, b.attMorale, b.attColor, -1);
  sideBar(ctx, x + 1 * u, top, u, b.defMen, b.defStart, b.defMorale, b.defColor, 1);
  // Losses float up and fade.
  const alive = list.filter((f) => t - f.born < 1400);
  for (const f of alive) {
    const age = (t - f.born) / 1400;
    ctx.globalAlpha = alpha * (1 - age * age);
    drawPlate(ctx, f.text, x + f.dx * u, top - 10 * u - age * 14 * u, u);
  }
  ctx.globalAlpha = alpha;
  floaters.set(b.id, alive);
  return true;
}

/** The two hosts as riders lunging at each other, with dust and sparks. */
function drawMelee(ctx: Ctx, b: BattleStyle, att: HTMLCanvasElement, def: HTMLCanvasElement, frame: number, lunge: number, alpha: number): void {
  const { u, x, y, t } = b;
  groundShadow(ctx, x, y + u, u, 14);
  // Dust kicked up around the melee.
  for (let i = 0; i < 6; i++) {
    const seed = (i * 97 + Math.floor(t / 220) * 31) % 211;
    const dx = ((seed % 23) - 11) * u;
    const dy = (((seed >> 2) % 7) - 6) * u;
    ctx.fillStyle = i % 2 ? PALETTE.paper : PALETTE.sand;
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 2 * u, 2 * u);
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(att, Math.round(x - att.width + 3 * u + lunge), Math.round(y - att.height + u));
  ctx.drawImage(def, Math.round(x - 3 * u - lunge), Math.round(y - def.height + u));
  // Sparks where the blades meet.
  if (frame === 2) {
    ctx.fillStyle = PALETTE.sun;
    for (const [sx, sy] of [[0, -9], [-2, -11], [2, -12], [1, -7], [-1, -13]] as const) ctx.fillRect(Math.round(x + sx * u), Math.round(y + sy * u), u, u);
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(Math.round(x), Math.round(y - 10 * u), u, u);
  }
}

/**
 * One side's strength: its men on a plate in its colour, a bar under it emptying as men fall, and
 * a pale bar under that emptying as its morale goes. Grows away from x by `side`.
 */
function sideBar(ctx: Ctx, x: number, top: number, u: number, men: number, start: number, morale: number, color: string, side: -1 | 1): void {
  const w = 22 * u;
  const left = side < 0 ? Math.round(x - w) : Math.round(x);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(left, top + 9 * u, w, 7 * u);
  const bar = (row: number, share: number, fillColor: string) => {
    ctx.fillStyle = PALETTE.slate;
    ctx.fillRect(left + u, top + row * u, w - 2 * u, 2 * u);
    const fill = Math.round((w - 2 * u) * Math.max(0, Math.min(1, share)));
    ctx.fillStyle = fillColor;
    ctx.fillRect(side < 0 ? left + w - u - fill : left + u, top + row * u, fill, 2 * u);
  };
  bar(10, men / Math.max(1, start), color);
  bar(13, morale, PALETTE.paper);
  drawPlate(ctx, menShort(men), left + w / 2, top, u);
}

/** Forgets battles that are over, so their numbers don't linger. */
export function pruneBattles(live: Iterable<number>): void {
  const keep = new Set(live);
  for (const id of [...lastMen.keys()]) if (!keep.has(id)) (lastMen.delete(id), floaters.delete(id));
}

/** Small pictures for the siege plate's row, 5 × 5: a breach in the wall, a helmet for the garrison, a sack of food. */
const SIEGE_ICONS = {
  breach: ["##.##", "##.##", "#...#", "##.##", "#####"],
  garrison: [".###.", "#####", "#.#.#", "#...#", "#...#"],
  food: [".#.#.", "..#..", ".###.", "#####", ".###."],
} as const;

export interface SiegeMarkStyle {
  x: number;
  y: number;
  u: number;
  color: string;
  months: number;
  progress: number;
  breaches: number;
  garrison: number;
  /** Months of food left in the castle, or null while nobody eats from it. */
  foodMonths: number | null;
}

/**
 * A siege on the map (VIEW-078): the besieger's standard planted before the walls with one pip per
 * siege month held, the last filling as the month runs (and the months on a plate past five), and
 * a row under it of the breaches made, the garrison left and the months of food in the castle.
 */
export function drawSiegeMark(ctx: Ctx, s: SiegeMarkStyle): void {
  const { x, y, u, color, months, progress } = s;
  drawStandard(ctx, x - 6 * u, y, u, color);
  const pips = Math.min(months, 5) + 1;
  const w = pips * 4 * u + u;
  const left = Math.round(x - w / 2);
  const top = Math.round(y + 2 * u);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(left, top, w, 5 * u);
  for (let i = 0; i < pips; i++) {
    const px = left + u + i * 4 * u;
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(px, top + u, 3 * u, 3 * u);
    ctx.fillStyle = color;
    const share = i < pips - 1 ? 1 : progress;
    ctx.fillRect(px, top + u, Math.round(3 * u * share), 3 * u);
  }
  if (months > 5) drawPlate(ctx, String(months), x + w / 2 + 6 * u, top - 2 * u, u);
  // The row: each figure after its picture, on a paper strip rimmed in ink.
  const food = s.foodMonths === null ? "-" : s.foodMonths >= 10 ? String(Math.floor(s.foodMonths)) : (Math.floor(s.foodMonths * 10) / 10).toFixed(1).replace(/\.0$/, "");
  const items: [keyof typeof SIEGE_ICONS, string][] = [["breach", String(s.breaches)], ["garrison", menShort(s.garrison)], ["food", food]];
  const itemW = (text: string) => 5 + 1 + digitsWidth(text);
  const rowW = (items.reduce((t, [, text]) => t + itemW(text), 0) + 3 * (items.length - 1) + 4) * u;
  const rowL = Math.round(x - rowW / 2);
  const rowT = top + 6 * u;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(rowL + u, rowT, rowW - 2 * u, 9 * u);
  ctx.fillRect(rowL, rowT + u, rowW, 7 * u);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(rowL + u, rowT + u, rowW - 2 * u, 7 * u);
  let cx = rowL + 2 * u;
  for (const [name, text] of items) {
    const art = SIEGE_ICONS[name];
    ctx.fillStyle = name === "breach" ? PALETTE.blood : name === "food" ? PALETTE.clay : PALETTE.steel;
    art.forEach((row, ry) => {
      for (let rx = 0; rx < 5; rx++) if (row[rx] === "#") ctx.fillRect(cx + rx * u, rowT + 2 * u + ry * u, u, u);
    });
    drawDigits(ctx, text, cx + 6 * u, rowT + 2 * u, u, PALETTE.ink);
    cx += (itemW(text) + 3) * u;
  }
}

// ---- the living map's figures (VIEW-116..VIEW-120) ----

export interface FormationStyle {
  /** The screen point the formation stands on. */
  x: number;
  y: number;
  /** CSS pixels per art pixel: whole, so the figure art caches. */
  u: number;
  color: string;
  figures: readonly Figure[];
  /** The way the formation faces (dx, dy); the figures look east or west by its dx. */
  facing: readonly [number, number];
  /** Walking frame, the same for every figure, so they march in step. */
  frame: 0 | 1;
  /** Art pixels the front rank pushes forward, for a battle's clash. */
  lunge?: number;
}

const FIGURE_ART: Record<Figure["arm"], FigureName> = { foot: "foot0", horse: "horse0", guns: "guns0", wagons: "wagons0" };

/**
 * An army's figures where `formation` put them, feet on their spots, drawn
 * back to front so a block of men reads as one body, each over a pixel of
 * shadow. Returns the box round them all, in CSS pixels.
 */
export function drawFormation(ctx: Ctx, f: FormationStyle): Box {
  const { u } = f;
  const dir: 1 | -1 = f.facing[0] < 0 ? -1 : 1;
  const len = Math.hypot(f.facing[0], f.facing[1]) || 1;
  const fx = f.facing[0] / len, fy = f.facing[1] / len;
  // The front rank is the figures furthest forward.
  const front = Math.max(...f.figures.map((g) => g.x * fx + g.y * fy));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of [...f.figures].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const base = g.banner ? "banner0" : FIGURE_ART[g.arm];
    const name = (f.frame ? base.replace("0", "1") : base) as FigureName;
    const img = figureSprite(name, f.color, u, dir);
    const push = f.lunge && g.x * fx + g.y * fy >= front - 0.5 ? f.lunge : 0;
    const px = Math.round(f.x + (g.x + push * fx) * u - img.width / 2);
    const py = Math.round(f.y + (g.y + push * fy) * u - img.height + u);
    ctx.fillStyle = "rgb(26 28 44 / 0.35)";
    ctx.fillRect(px, py + img.height, img.width, u);
    ctx.drawImage(img, px, py);
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px + img.width);
    y1 = Math.max(y1, py + img.height + u);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A besiegers' camp: a few tents round the walls, `ring` art pixels out, seeded so they stay put. */
export function drawTents(ctx: Ctx, x: number, y: number, u: number, color: string, ring: number, seed: number): void {
  for (let i = 0; i < 3; i++) {
    const a = ((seed * 37 + i * 131) % 360) * (Math.PI / 180);
    const img = figureSprite("tent", color, u, 1);
    ctx.drawImage(img, Math.round(x + Math.cos(a) * ring * u - img.width / 2), Math.round(y + Math.sin(a) * ring * u - img.height));
  }
}

/** Sparks where two front ranks meet, on the clash frame. */
export function drawClash(ctx: Ctx, x: number, y: number, u: number): void {
  ctx.fillStyle = PALETTE.sun;
  for (const [sx, sy] of [[0, -5], [-1, -7], [1, -8], [0, -3]] as const) ctx.fillRect(Math.round(x + sx * u), Math.round(y + sy * u), u, u);
}
