import { SR, WAVES, type Env, type WaveName } from "./chip.ts";

/**
 * The music's voices (D-AUD-14, playtest feedback 79: "it sounds like noise
 * mostly"). They keep the chip's roles (P1, P2 pulse, T bass, W wavetable, N
 * drums) but play them soft: band-limited waves with their upper harmonics
 * rolled off, smooth envelopes instead of 16 volume steps, tuned drums
 * instead of raw noise, and a pad for sustained chords. The effects stay on
 * the chip (chip.ts) unchanged.
 */

const N = 2048;
const TAU = 2 * Math.PI;

/** One cycle of a wave from harmonic amplitudes (index 0 is the fundamental). */
function additive(amps: number[]): Float32Array {
  const t = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    let v = 0;
    for (let k = 0; k < amps.length; k++) v += amps[k]! * Math.sin((TAU * (k + 1) * i) / N);
    t[i] = v;
  }
  let peak = 1e-6;
  for (const v of t) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i <= N; i++) t[i]! /= peak;
  return t;
}

/** Gentle roll-off of harmonic k (1-based), so no voice buzzes. */
const soft = (k: number) => 1 / (1 + (k / 3) ** 2);

/** A pulse wave of a duty, made of its first eight harmonics, softened. */
const pulseTables = new Map<number, Float32Array>();
function pulseTable(duty: number): Float32Array {
  let t = pulseTables.get(duty);
  if (!t) pulseTables.set(duty, (t = additive(Array.from({ length: 8 }, (_, i) => (Math.sin(Math.PI * (i + 1) * duty) / (i + 1)) * soft(i + 1)))));
  return t;
}

/** The bass: a round triangle (fundamental and a little of the third harmonic). */
const BASS = additive([1, 0, 1 / 12]);

/** The pad: a warm, slow-breathing string sound for held chords. */
const PAD = additive([1, 0.35, 0.18, 0.08, 0.04]);

/** A regional wavetable smoothed: the chip's 32 steps joined by lines. */
const smoothWaves = new Map<WaveName, Float32Array>();
function waveTable(name: WaveName): Float32Array {
  let t = smoothWaves.get(name);
  if (!t) {
    const w = WAVES[name];
    t = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const x = ((i % N) / N) * 32;
      const a = Math.floor(x);
      const f = x - a;
      t[i] = w[a % 32]! * (1 - f) + w[(a + 1) % 32]! * f;
    }
    // Two passes of a three-point average take the corners off.
    for (let pass = 0; pass < 2; pass++) {
      const c = t.slice();
      for (let i = 0; i <= N; i++) t[i] = (c[(i - 1 + N) % N]! + 2 * c[i % N]! + c[(i + 1) % N]!) / 4;
    }
    smoothWaves.set(name, t);
  }
  return t;
}

/** The lead's delayed vibrato, a little wider and slower than the chip's. */
function freqAt(f: number, i: number, n: number, vibrato: boolean): number {
  if (!vibrato || n < SR * 0.35) return f;
  const t = i / SR;
  const depth = Math.min(1, Math.max(0, (t - 0.3) / 0.3)) * 0.006;
  return f * (1 + depth * Math.sin(TAU * 4.8 * t));
}

function play(out: Float32Array, s: number, n: number, f: number, table: Float32Array, vol: number, e: Env, vibrato = false): void {
  const attack = Math.max(e.attack ?? 0.012, 0.004) * SR;
  const sustain = e.sustain ?? 0.6;
  const fall = Math.exp(-1 / ((e.decay ?? 0.25) * SR));
  const r = Math.min(n, Math.floor((e.release ?? 0.06) * SR));
  const wobble = vibrato && n >= SR * 0.35;
  const step = (f / SR) * N;
  let p = 0;
  let d = 1;
  const end = Math.min(n, out.length - s);
  for (let i = 0; i < end; i++) {
    p += wobble ? (freqAt(f, i, n, true) / SR) * N : step;
    if (p >= N) p -= N;
    const a = p | 0;
    const x = table[a]! + (table[a + 1]! - table[a]!) * (p - a);
    let v = (i < attack ? i / attack : 1) * (sustain + (1 - sustain) * d) * vol;
    if (i >= n - r) v *= (n - i) / r;
    d *= fall;
    out[s + i]! += x * v;
  }
}

export interface PulseOpts extends Env {
  duty?: number;
  vol?: number;
  vibrato?: boolean;
}

export function softPulse(out: Float32Array, s: number, n: number, f: number, o: PulseOpts = {}): void {
  play(out, s, n, f, pulseTable(o.duty ?? 0.5), o.vol ?? 0.5, o, !!o.vibrato);
}

export function softBass(out: Float32Array, s: number, n: number, f: number, o: { vol?: number } = {}): void {
  play(out, s, n, f, BASS, o.vol ?? 0.55, { attack: 0.01, decay: 0.6, sustain: 0.75, release: 0.05 });
}

export function softWave(out: Float32Array, s: number, n: number, f: number, o: Env & { wave?: WaveName; vol?: number } = {}): void {
  play(out, s, n, f, waveTable(o.wave ?? "lute"), o.vol ?? 0.45, o);
}

export function pad(out: Float32Array, s: number, n: number, f: number, o: Env & { vol?: number } = {}): void {
  play(out, s, n, f, PAD, o.vol ?? 0.3, { attack: 0.35, decay: 2, sustain: 0.8, release: 0.5, ...o }, true);
}

// ---------------------------------------------------------------- drums

/** The music's percussion: tuned skins and wood, and only a whisper of noise. */
export type Drum = "kick" | "boom" | "snare" | "tick" | "crash" | "rim";

/** A deterministic white-noise source, so every render is the same. */
function noise(length: number): Float32Array {
  let x = 0x2545f491;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = ((x >>> 0) / 0xffffffff) * 2 - 1;
  }
  return out;
}

/** A skin: a sine falling from one pitch to another, with a soft knock of filtered noise. */
function skin(seconds: number, from: number, to: number, fall: number, decay: number, knock: number, knockHz: number): Float32Array {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  const nz = noise(n);
  const a = Math.exp((-TAU * knockHz) / SR);
  let lp = 0;
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += (to + (from - to) * Math.exp(-t / fall)) / SR;
    lp = (1 - a) * nz[i]! + a * lp;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / decay);
    out[i] = (Math.sin(TAU * p) + knock * lp * 3) * env;
  }
  return out;
}

/** Breath of noise through a band: a brush, a shaker or a soft cymbal. */
function breath(seconds: number, lowHz: number, highHz: number, attack: number, decay: number): Float32Array {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  const nz = noise(n);
  const a = Math.exp((-TAU * highHz) / SR);
  const b = Math.exp((-TAU * lowHz) / SR);
  let lp = 0;
  let lo = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp = (1 - a) * nz[i]! + a * lp;
    lo = (1 - b) * lp + b * lo;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    out[i] = (lp - lo) * env * 2.5;
  }
  return out;
}

const MAKERS: Record<Drum, [() => Float32Array, number]> = {
  kick: [() => skin(0.35, 110, 48, 0.03, 0.12, 0.1, 900), 0.8],
  boom: [() => skin(0.8, 95, 62, 0.06, 0.28, 0.08, 700), 0.65],
  snare: [() => breath(0.3, 500, 3500, 0.003, 0.07), 0.3],
  tick: [() => breath(0.08, 2500, 7000, 0.002, 0.018), 0.12],
  crash: [() => breath(2.2, 1500, 6000, 0.03, 0.7), 0.16],
  rim: [() => skin(0.12, 820, 760, 0.01, 0.03, 0, 1000), 0.25],
};

const hits = new Map<Drum, Float32Array>();
/** A drum hit's samples, made once. */
export function drumHit(k: Drum): Float32Array {
  let h = hits.get(k);
  if (!h) {
    const [make, vol] = MAKERS[k];
    h = make();
    for (let i = 0; i < h.length; i++) h[i]! *= vol;
    hits.set(k, h);
  }
  return h;
}

// ---------------------------------------------------------------- the room

/**
 * A small hall (a few combs and all-passes, Schroeder's way). Feed it one
 * mono sample at a time; it leaves the left and right echoes in `l` and `r`.
 * A loop is fed through once first, so the tail of its end rings into its
 * start and the loop still repeats without a seam.
 */
export function hall(): { l: number; r: number; step(x: number): void } {
  const make = (offset: number) => {
    const combs = [1116, 1188, 1277, 1356].map((d) => ({ buf: new Float32Array(Math.floor(((d + offset) * SR) / 44100)), i: 0, lp: 0 }));
    const aps = [556, 441].map((d) => ({ buf: new Float32Array(Math.floor(((d + offset) * SR) / 44100)), i: 0 }));
    return (x: number) => {
      let y = 0;
      for (const c of combs) {
        const out = c.buf[c.i]!;
        c.lp = out * 0.6 + c.lp * 0.4;
        c.buf[c.i] = x + c.lp * 0.78;
        c.i = (c.i + 1) % c.buf.length;
        y += out;
      }
      y *= 0.25;
      for (const a of aps) {
        const b = a.buf[a.i]!;
        const v = y + b * 0.5;
        a.buf[a.i] = v;
        a.i = (a.i + 1) % a.buf.length;
        y = b - v * 0.5;
      }
      return y;
    };
  };
  const left = make(0);
  const right = make(23);
  const room = {
    l: 0,
    r: 0,
    step(x: number) {
      room.l = left(x);
      room.r = right(x);
    },
  };
  return room;
}
