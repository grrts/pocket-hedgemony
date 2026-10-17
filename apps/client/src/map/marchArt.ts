import { PALETTE } from "../art/palette.ts";
import { sprite, type SpriteName } from "../art/sprites.ts";

/**
 * The map's moving pieces, drawn as pixel art on the overlay: army tokens (a
 * rider under the realm's standard, or a ship), the march route as a trail of
 * stones with a marker for each week's end, and battles playing out. Every
 * shape is whole art pixels of `u` CSS pixels, snapped to the screen grid.
 */

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

// ---- a 3×5 pixel font for numbers on the map ----
const GLYPHS: Record<string, string[]> = {
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

/** Width in art pixels of a string in the map's number font (a gap of one between glyphs). */
export function digitsWidth(text: string): number {
  return [...text].reduce((w, ch) => w + (ch === "." ? 1 : 3) + 1, -1);
}

/** Draws text in the number font, its top-left at x, y. */
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

/** Men as a short count: "800", "4.5K", "12K". Tenths under ten thousand, so a change of a few hundred shows. */
export function menShort(men: number): string {
  if (men < 1000) return String(Math.round(men));
  const k = men / 1000;
  return k < 10 ? `${(Math.round(k * 10) / 10).toFixed(1).replace(/\.0$/, "")}K` : `${Math.round(k)}K`;
}

/** A plate in a realm's colour with ink rim and a number on it, centred on x with its top at y. Returns its height. */
export function drawPlate(ctx: Ctx, text: string, x: number, y: number, u: number, color: string, textColor: string = PALETTE.paper): number {
  const w = (digitsWidth(text) + 4) * u;
  const h = 9 * u;
  const left = Math.round(x - w / 2);
  const top = Math.round(y);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(left + u, top, w - 2 * u, h);
  ctx.fillRect(left, top + u, w, h - 2 * u);
  ctx.fillStyle = color;
  ctx.fillRect(left + u, top + u, w - 2 * u, h - 2 * u);
  // A dark lip along the bottom for depth.
  ctx.fillStyle = "rgb(0 0 0 / 0.28)";
  ctx.fillRect(left + u, top + h - 3 * u, w - 2 * u, u);
  // Ink under the numbers so they read on light realm colours too.
  drawDigits(ctx, text, left + 2 * u + u, top + 2 * u, u, PALETTE.ink);
  drawDigits(ctx, text, left + 2 * u, top + 2 * u, u, textColor);
  return h;
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
function brackets(ctx: Ctx, x: number, y: number, w: number, h: number, u: number, grow: number, color: string): void {
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
  /** 1 faces east, -1 west. */
  dir: 1 | -1;
  moving: boolean;
  selected: boolean;
  /** Clock for the animation, ms. */
  t: number;
}

/** Draws an army token: the figure on its tile with its men on a plate below. Returns its tap box. */
export function drawToken(ctx: Ctx, s: TokenStyle): { x: number; y: number; w: number; h: number } {
  const { u } = s;
  // Two frames: legs (or waves) step while marching, the standard flutters at rest.
  const frame = Math.floor(s.t / (s.moving ? 160 : 520)) % 2;
  const name: SpriteName = s.naval ? (frame ? "ship1" : "ship0") : frame ? "rider1" : "rider0";
  const img = facing(name, s.color, u, s.dir);
  const bob = s.moving && !s.naval ? (frame ? -u : 0) : s.naval && frame ? u : 0;
  const x = Math.round(s.x - img.width / 2);
  // The sprite's last row is its feet (or keel): put them on the tile's centre.
  const y = Math.round(s.y - img.height + u + bob);
  groundShadow(ctx, s.x, s.y + u, u, 6);
  if (s.selected) {
    const pulse = Math.floor(s.t / 260) % 2;
    brackets(ctx, x, y, img.width, img.height + 10 * u, u, 1 + pulse, PALETTE.gold);
  }
  ctx.drawImage(img, x, y);
  const plateH = drawPlate(ctx, menShort(s.men), s.x, s.y + 2 * u, u, s.color);
  return { x, y, w: img.width, h: img.height + plateH + 2 * u };
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
 * The march route: a trail of square stones, ink round paper, flowing toward
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
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 2 * u, y - u, 4 * u, 2 * u);
      ctx.fillRect(x - u, y - 2 * u, 2 * u, 4 * u);
      ctx.fillStyle = PALETTE.paper;
      ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    }
    carry = d - len;
  }
  r.weeks.forEach(([x, y], i) => drawWeekMark(ctx, x, y, u, i + 1, r.color));
  const [ex, ey] = pts.at(-1)!;
  const pulse = Math.floor(r.t / 300) % 2;
  brackets(ctx, Math.round(ex - 4 * u), Math.round(ey - 4 * u), 8 * u, 8 * u, u, pulse, PALETTE.paper);
  drawStandard(ctx, ex, ey, u, r.color);
}

/** A numbered marker for where the army will be when a week ends. */
function drawWeekMark(ctx: Ctx, x: number, y: number, u: number, n: number, color: string): void {
  const text = String(n);
  const w = (digitsWidth(text) + 4) * u;
  const h = 9 * u;
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h / 2);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(left + u, top, w - 2 * u, h);
  ctx.fillRect(left, top + u, w, h - 2 * u);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(left + u, top + u, w - 2 * u, h - 2 * u);
  ctx.fillStyle = color;
  ctx.fillRect(left + u, top + h - 3 * u, w - 2 * u, u);
  drawDigits(ctx, text, left + 2 * u, top + 2 * u, u, PALETTE.ink);
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
  t: number;
}

/**
 * A battle playing out on its tile: the two hosts lunge at each other, dust
 * and sparks fly, losses float up from each side as they happen, and a plate
 * above shows the men each side has left of those it brought.
 * Returns whether it is still animating something that needs every frame.
 */
export function drawBattle(ctx: Ctx, b: BattleStyle): boolean {
  const { u, x, y, t } = b;
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
  groundShadow(ctx, x, y + u, u, 14);
  // Dust kicked up around the melee.
  for (let i = 0; i < 6; i++) {
    const seed = (i * 97 + Math.floor(t / 220) * 31) % 211;
    const dx = ((seed % 23) - 11) * u;
    const dy = (((seed >> 2) % 7) - 6) * u;
    ctx.fillStyle = i % 2 ? PALETTE.paper : PALETTE.sand;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 2 * u, 2 * u);
  }
  ctx.globalAlpha = 1;
  const att = facing(frame % 2 ? "rider1" : "rider0", b.attColor, u, 1);
  const def = facing(frame % 2 ? "rider0" : "rider1", b.defColor, u, -1);
  ctx.drawImage(att, Math.round(x - att.width + 3 * u + lunge), Math.round(y - att.height + u));
  ctx.drawImage(def, Math.round(x - 3 * u - lunge), Math.round(y - def.height + u));
  // Sparks where the blades meet.
  if (frame === 2) {
    ctx.fillStyle = PALETTE.sun;
    for (const [sx, sy] of [[0, -9], [-2, -11], [2, -12], [1, -7], [-1, -13]] as const) ctx.fillRect(Math.round(x + sx * u), Math.round(y + sy * u), u, u);
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(Math.round(x), Math.round(y - 10 * u), u, u);
  }
  // Each side's men left, over a bar of what it brought.
  const top = Math.round(y - att.height - 12 * u);
  sideBar(ctx, x - 1 * u, top, u, b.attMen, b.attStart, b.attColor, -1);
  sideBar(ctx, x + 1 * u, top, u, b.defMen, b.defStart, b.defColor, 1);
  // Losses float up and fade.
  const alive = list.filter((f) => t - f.born < 1400);
  for (const f of alive) {
    const age = (t - f.born) / 1400;
    ctx.globalAlpha = 1 - age * age;
    drawPlate(ctx, f.text, x + f.dx * u, top - 10 * u - age * 14 * u, u, PALETTE.blood);
  }
  ctx.globalAlpha = 1;
  floaters.set(b.id, alive);
  return true;
}

/** One side's strength: its men on a plate in its colour, the bar under it emptying as men fall. Grows away from x by `side`. */
function sideBar(ctx: Ctx, x: number, top: number, u: number, men: number, start: number, color: string, side: -1 | 1): void {
  const w = 22 * u;
  const left = side < 0 ? Math.round(x - w) : Math.round(x);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(left, top + 9 * u, w, 4 * u);
  ctx.fillStyle = PALETTE.slate;
  ctx.fillRect(left + u, top + 10 * u, w - 2 * u, 2 * u);
  const share = Math.max(0, Math.min(1, men / Math.max(1, start)));
  const fill = Math.round((w - 2 * u) * share);
  ctx.fillStyle = color;
  ctx.fillRect(side < 0 ? left + w - u - fill : left + u, top + 10 * u, fill, 2 * u);
  drawPlate(ctx, menShort(men), left + w / 2, top, u, color);
}

/** Forgets battles that are over, so their numbers don't linger. */
export function pruneBattles(live: Iterable<number>): void {
  const keep = new Set(live);
  for (const id of [...lastMen.keys()]) if (!keep.has(id)) (lastMen.delete(id), floaters.delete(id));
}

/**
 * A siege on the map: the besieger's standard planted before the walls with
 * the months held on a plate, and one pip per siege month under it, the last
 * filling as the month runs.
 */
export function drawSiegeMark(ctx: Ctx, x: number, y: number, u: number, color: string, months: number, progress: number): void {
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
  if (months > 5) drawPlate(ctx, String(months), x + w / 2 + 6 * u, top - 2 * u, u, color);
}
