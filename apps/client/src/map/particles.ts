import { PALETTE } from "../art/palette.ts";
import type { MomentKind } from "@ph/engine/domain/map-presentation";

/**
 * The map's particles (VIEW-140..VIEW-150): one pool of squares in whole art
 * pixels, anchored to a map point and offset in art pixels, so they stay on
 * their town while the map pans and take the pieces' size at each zoom. The
 * pool is typed arrays with a fixed cap: nothing is allocated per particle,
 * and when it is full the oldest particle gives its slot to the newest.
 */

/** How a particle moves and looks. */
export const Shape = { Confetti: 0, Dust: 1, Spark: 2, Smoke: 3, Ember: 4, Mote: 5, Snow: 6, Bird: 7 } as const;
export type Shape = (typeof Shape)[keyof typeof Shape];

/** Art pixels per second squared, pulling confetti and embers down. */
const GRAVITY = 60;
/** The wind smoke drifts with, art pixels per second. */
const WIND = 5;

export type Random = () => number;

export class ParticleField {
  readonly cap: number;
  private ax: Float32Array;
  private ay: Float32Array;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private shape: Uint8Array;
  private colour: Uint8Array;
  private seed: Float32Array;
  private live = 0;
  /** The next slot to take when every slot is in use: the oldest particle. */
  private next = 0;
  private colours: string[] = [];
  private colourIndex = new Map<string, number>();
  private random: Random;

  constructor(cap: number, random: Random = Math.random) {
    this.cap = cap;
    this.random = random;
    this.ax = new Float32Array(cap);
    this.ay = new Float32Array(cap);
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.shape = new Uint8Array(cap);
    this.colour = new Uint8Array(cap);
    this.seed = new Float32Array(cap);
  }

  /** Particles alive now. */
  get count(): number {
    return this.live;
  }

  /** Alive particles of one shape, for the looping emitters' own caps. */
  countOf(shape: Shape): number {
    let n = 0;
    for (let i = 0; i < this.live; i++) if (this.shape[i] === shape) n++;
    return n;
  }

  clear(): void {
    this.live = 0;
    this.next = 0;
  }

  private colourOf(c: string): number {
    let i = this.colourIndex.get(c);
    if (i === undefined) {
      // A realm's colour or a palette colour; the table never needs more than a few dozen.
      if (this.colours.length >= 255) (this.colours.length = 0), this.colourIndex.clear();
      i = this.colours.length;
      this.colours.push(c);
      this.colourIndex.set(c, i);
    }
    return i;
  }

  /** Adds one particle at map point (mx, my), offset (ox, oy) art pixels, moving (vx, vy) art pixels a second. */
  add(shape: Shape, mx: number, my: number, ox: number, oy: number, vx: number, vy: number, life: number, colour: string): void {
    let i: number;
    if (this.live < this.cap) i = this.live++;
    else {
      i = this.next;
      this.next = (this.next + 1) % this.cap;
    }
    this.ax[i] = mx;
    this.ay[i] = my;
    this.x[i] = ox;
    this.y[i] = oy;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.age[i] = 0;
    this.life[i] = life;
    this.shape[i] = shape;
    this.colour[i] = this.colourOf(colour);
    this.seed[i] = this.random();
  }

  /** A one-shot moment of `n` particles over `seconds` at a map point (VIEW-140..VIEW-144). */
  moment(kind: MomentKind, mx: number, my: number, n: number, seconds: number, colour: string): void {
    const r = this.random;
    const spread = (k: number) => (r() * 2 - 1) * k;
    switch (kind) {
      case "flip": {
        // Confetti in the new holder's colour, thrown up and falling, and a ring of dust on the ground.
        const ring = Math.min(8, Math.floor(n / 3));
        for (let k = 0; k < n - ring; k++) this.add(Shape.Confetti, mx, my, spread(2), -2, spread(24), -30 - r() * 20, seconds * (0.7 + r() * 0.3), k % 3 === 0 ? PALETTE.paper : colour);
        for (let k = 0; k < ring; k++) {
          const a = (k / ring) * Math.PI * 2;
          this.add(Shape.Dust, mx, my, Math.cos(a) * 3, Math.sin(a) * 1.5 + 2, Math.cos(a) * 14, Math.sin(a) * 5, seconds * 0.6, PALETTE.sand);
        }
        break;
      }
      case "built": {
        // Dust puffs at the town, then gold sparkles rising from it.
        const dust = Math.floor(n / 2);
        for (let k = 0; k < dust; k++) this.add(Shape.Dust, mx, my, spread(4), 1 + spread(1), spread(12), -2 - r() * 4, seconds * (0.4 + r() * 0.2), k % 2 ? PALETTE.sand : PALETTE.clay);
        for (let k = dust; k < n; k++) this.add(Shape.Spark, mx, my, spread(5), -2 - r() * 4, spread(4), -10 - r() * 10, seconds * (0.7 + r() * 0.3), k % 3 ? PALETTE.gold : PALETTE.sun);
        break;
      }
      case "rising": {
        // Dark smoke and red embers.
        const embers = Math.floor(n / 3);
        for (let k = 0; k < n - embers; k++) this.add(Shape.Smoke, mx, my, spread(3), -2 - r() * 3, spread(3), -8 - r() * 6, seconds * (0.7 + r() * 0.3), k % 2 ? PALETTE.slate : PALETTE.ink);
        for (let k = 0; k < embers; k++) this.add(Shape.Ember, mx, my, spread(3), -3, spread(14), -30 - r() * 20, seconds * (0.3 + r() * 0.2), k % 2 ? PALETTE.rust : PALETTE.blood);
        break;
      }
      case "glory":
        // A gold shower falling over the capital.
        for (let k = 0; k < n; k++) this.add(Shape.Spark, mx, my, spread(9), -14 - r() * 6, spread(3), 8 + r() * 8, seconds * (0.6 + r() * 0.4), k % 3 ? PALETTE.gold : PALETTE.paper);
        break;
      case "plague":
        // Pale motes drifting up.
        for (let k = 0; k < n; k++) this.add(Shape.Mote, mx, my, spread(6), spread(2), 0, -4 - r() * 4, seconds * (0.6 + r() * 0.4), k % 2 ? PALETTE.leaf : PALETTE.mist);
        break;
    }
  }

  /** Moves every particle on by `dt` seconds, and drops the ones whose life is over. */
  step(dt: number): void {
    for (let i = 0; i < this.live; i++) {
      this.age[i]! += dt;
      if (this.age[i]! >= this.life[i]!) {
        this.remove(i);
        i--;
        continue;
      }
      const s = this.shape[i] as Shape;
      if (s === Shape.Confetti || s === Shape.Ember) this.vy[i]! += GRAVITY * dt;
      else if (s === Shape.Dust) (this.vx[i]! *= 1 - Math.min(1, 3 * dt)), (this.vy[i]! *= 1 - Math.min(1, 3 * dt));
      else if (s === Shape.Smoke) this.vx[i]! += (WIND - this.vx[i]!) * Math.min(1, dt);
      this.x[i]! += this.vx[i]! * dt;
      this.y[i]! += this.vy[i]! * dt;
    }
  }

  /** Keeps the pool packed: the last particle takes the dropped one's slot. */
  private remove(i: number): void {
    const j = --this.live;
    if (this.next > this.live) this.next = 0;
    if (i === j) return;
    this.ax[i] = this.ax[j]!;
    this.ay[i] = this.ay[j]!;
    this.x[i] = this.x[j]!;
    this.y[i] = this.y[j]!;
    this.vx[i] = this.vx[j]!;
    this.vy[i] = this.vy[j]!;
    this.age[i] = this.age[j]!;
    this.life[i] = this.life[j]!;
    this.shape[i] = this.shape[j]!;
    this.colour[i] = this.colour[j]!;
    this.seed[i] = this.seed[j]!;
  }

  /**
   * Draws every particle as squares of `u` CSS pixels, from where `toScreen`
   * puts its map point; fading takes four steps of alpha, never a ramp.
   */
  draw(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => [number, number], u: number, width: number, height: number): void {
    if (!this.live) return;
    let fill = -1;
    let alpha = 1;
    ctx.globalAlpha = 1;
    for (let i = 0; i < this.live; i++) {
      const [sx, sy] = toScreen(this.ax[i]!, this.ay[i]!);
      const s = this.shape[i] as Shape;
      const t = this.age[i]! / this.life[i]!;
      const seed = this.seed[i]!;
      let ox = this.x[i]!;
      // Motes and snow sway as they go.
      if (s === Shape.Mote || s === Shape.Snow) ox += Math.sin(this.age[i]! * 3 + seed * 6.28) * 1.5;
      const px = Math.round(sx + ox * u);
      const py = Math.round(sy + this.y[i]! * u);
      if (px < -8 * u || py < -8 * u || px > width + 8 * u || py > height + 8 * u) continue;
      // Sparks and confetti twinkle: off for a tenth of a second now and then.
      if ((s === Shape.Spark || s === Shape.Confetti) && Math.floor(this.age[i]! * 10 + seed * 10) % 4 === 3) continue;
      const a = t < 0.5 ? 1 : t < 0.7 ? 0.75 : t < 0.85 ? 0.5 : 0.25;
      if (a !== alpha) ctx.globalAlpha = alpha = a;
      if (this.colour[i] !== fill) ctx.fillStyle = this.colours[(fill = this.colour[i]!)]!;
      switch (s) {
        case Shape.Smoke: {
          // Puffs grow as they rise: 1, 2, then 3 art pixels.
          const k = (1 + Math.min(2, Math.floor(t * 3))) * u;
          ctx.fillRect(px - Math.floor(k / 2), py - Math.floor(k / 2), k, k);
          break;
        }
        case Shape.Dust: {
          const k = (t < 0.5 ? 2 : 1) * u;
          ctx.fillRect(px, py, k, k);
          break;
        }
        case Shape.Confetti:
          // A flake turning over: tall, then wide.
          if (Math.floor(this.age[i]! * 8 + seed * 8) % 2) ctx.fillRect(px, py, u, 2 * u);
          else ctx.fillRect(px, py, 2 * u, u);
          break;
        case Shape.Spark:
          // A plus at its brightest, a dot as it fades.
          ctx.fillRect(px, py, u, u);
          if (t < 0.5) ctx.fillRect(px - u, py, 3 * u, u), ctx.fillRect(px, py - u, u, 3 * u);
          break;
        case Shape.Bird:
          // Wings up, then down.
          if (Math.floor(this.age[i]! * 6 + seed * 6) % 2) ctx.fillRect(px - u, py - u, u, u), ctx.fillRect(px + u, py - u, u, u), ctx.fillRect(px, py, u, u);
          else ctx.fillRect(px - u, py, 3 * u, u);
          break;
        default:
          ctx.fillRect(px, py, u, u);
      }
    }
    ctx.globalAlpha = 1;
  }
}
