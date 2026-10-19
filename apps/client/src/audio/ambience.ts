import { SR } from "./chip.ts";

/**
 * The ambience beds under the map (AUD-079, D-AUD-17): wind, surf, birds,
 * insects, frogs, a town's murmur and bells, a distant war. Each bed is
 * synthesized in the page as a 12-second stereo loop, its end crossfaded into
 * its start so it repeats without a seam, from a fixed seed so it sounds the
 * same every visit.
 */

export const AMBIENCE_SECONDS = 12;
const FOLD = 1;
const TAU = 2 * Math.PI;

/** A small seeded generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Bus = { L: Float32Array; R: Float32Array; rand: () => number; n: number };

/** A slow random curve between 0 and 1 that comes back to where it started after the loop. */
function drift(rand: () => number, n: number, everySeconds: number): (i: number) => number {
  const loop = AMBIENCE_SECONDS * SR;
  const k = Math.max(2, Math.round(AMBIENCE_SECONDS / everySeconds));
  const pts = Array.from({ length: k }, () => rand());
  return (i) => {
    const x = ((i % loop) / loop) * k;
    const a = Math.floor(x);
    const t = (1 - Math.cos((x - a) * Math.PI)) / 2;
    return pts[a % k]! * (1 - t) + pts[(a + 1) % k]! * t;
  };
}

/** A band of noise whose centre and level move: wind, surf, the murmur of a crowd. */
function noiseBand(b: Bus, o: { low: number; high: number; level: (i: number) => number; centre: (i: number) => number; q: number; spread?: number }): void {
  // A state-variable band-pass, per channel, its centre re-tuned every 32 samples.
  for (const [ch, out] of [[0, b.L], [1, b.R]] as const) {
    let lo = 0;
    let bp = 0;
    let f = 0;
    const damp = 1 / o.q;
    for (let i = 0; i < b.n; i++) {
      if ((i & 31) === 0) {
        const hz = o.low + (o.high - o.low) * o.centre(i + ch * (o.spread ?? 0) * SR);
        f = 2 * Math.sin((Math.PI * Math.min(hz, SR / 6)) / SR);
      }
      const x = b.rand() * 2 - 1;
      const hi = x - lo - damp * bp;
      bp += f * hi;
      lo += f * bp;
      out[i]! += bp * o.level(i);
    }
  }
}

/** Adds a mono sound at `at` seconds, panned. */
function place(b: Bus, at: number, sound: Float32Array, pan: number, vol: number): void {
  const s = Math.floor(at * SR);
  const l = vol * (1 - Math.max(0, pan));
  const r = vol * (1 + Math.min(0, pan));
  for (let i = 0; i < sound.length && s + i < b.n; i++) {
    b.L[s + i]! += sound[i]! * l;
    b.R[s + i]! += sound[i]! * r;
  }
}

/** A bird's call: a few quick gliding whistles. */
function chirp(rand: () => number, base: number): Float32Array {
  const notes = 2 + Math.floor(rand() * 4);
  const len = 0.07 + rand() * 0.08;
  const gap = 0.04 + rand() * 0.06;
  const out = new Float32Array(Math.ceil(notes * (len + gap) * SR));
  const rise = rand() < 0.5;
  for (let k = 0; k < notes; k++) {
    const f0 = base * (0.9 + rand() * 0.25);
    const f1 = f0 * (rise ? 1.35 : 0.7);
    let p = 0;
    const s = Math.floor(k * (len + gap) * SR);
    const m = Math.floor(len * SR);
    for (let i = 0; i < m; i++) {
      const t = i / m;
      p += (f0 + (f1 - f0) * t) / SR;
      out[s + i] = Math.sin(TAU * p) * Math.sin(Math.PI * t) ** 2 + 0.2 * Math.sin(2 * TAU * p) * Math.sin(Math.PI * t);
    }
  }
  return out;
}

/** A frog: a short purring croak. */
function croak(rand: () => number): Float32Array {
  const f = 150 + rand() * 160;
  const rate = 18 + rand() * 14;
  const out = new Float32Array(Math.floor((0.25 + rand() * 0.25) * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.sin((Math.PI * i) / out.length);
    const purr = 0.5 + 0.5 * Math.sin(TAU * rate * t);
    out[i] = (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * 2 * f * t) + 0.2 * Math.sin(TAU * 3 * f * t)) * purr * purr * env;
  }
  return out;
}

/** A bell: inharmonic partials ringing down. */
function bell(f: number, seconds: number): Float32Array {
  const parts: [number, number, number][] = [[0.5, 0.6, 1.4], [1, 1, 1], [1.19, 0.5, 0.7], [1.5, 0.4, 0.6], [2, 0.35, 0.45], [2.74, 0.2, 0.3]];
  const out = new Float32Array(Math.floor(seconds * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a, d] of parts) v += a * Math.sin(TAU * f * m * t) * Math.exp(-t / (d * seconds * 0.4));
    out[i] = v * Math.min(1, t / 0.003) * 0.4;
  }
  return out;
}

/** A struck thing: a low thump (a far gun or drum), or a ring of metal on metal. */
function strike(rand: () => number, kind: "thump" | "clang"): Float32Array {
  const out = new Float32Array(Math.floor((kind === "thump" ? 1.2 : 0.4) * SR));
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (kind === "thump") {
      lp = lp * 0.995 + (rand() * 2 - 1) * 0.005;
      out[i] = (Math.sin(TAU * (45 + 30 * Math.exp(-t / 0.05)) * t) * 0.8 + lp * 6) * Math.exp(-t / 0.35);
    } else {
      out[i] = (Math.sin(TAU * 1830 * t) + 0.7 * Math.sin(TAU * 2710 * t) + 0.5 * Math.sin(TAU * 4170 * t)) * Math.exp(-t / 0.08) * 0.5;
    }
  }
  return out;
}

/** Calls spread over the loop: `count` of them at random times, never in the fold. */
function scatter(b: Bus, count: number, make: () => Float32Array, vol: number, spread = 0.8): void {
  for (let k = 0; k < count; k++) place(b, b.rand() * (AMBIENCE_SECONDS - 0.5), make(), (b.rand() * 2 - 1) * spread, vol * (0.5 + b.rand() * 0.5));
}

const wind = (b: Bus, o: { level: number; low: number; high: number; gust: number; q?: number }) => {
  const g = drift(b.rand, b.n, o.gust);
  const c = drift(b.rand, b.n, o.gust * 0.7);
  noiseBand(b, { low: o.low, high: o.high, q: o.q ?? 1.2, spread: 0.6, centre: c, level: (i) => o.level * (0.35 + 0.65 * g(i)) });
};

/** Surf: the wash rises and falls with the swell; the open ocean's swells are longer and lower. */
const surf = (b: Bus, period: number, low: number, high: number, level: number) => {
  const loop = AMBIENCE_SECONDS * SR;
  const swell = (i: number) => 0.5 - 0.5 * Math.cos((TAU * (i % loop)) / (period * SR));
  noiseBand(b, { low, high, q: 0.8, spread: 0.4, centre: (i) => 0.2 + 0.8 * swell(i) ** 2, level: (i) => level * (0.15 + swell(i) ** 1.5) });
};

const BEDS: Record<string, (b: Bus, windier: boolean) => void> = {
  amb_sea_coast: (b) => {
    surf(b, 6, 300, 3200, 1);
    surf(b, 4, 900, 4500, 0.35);
    scatter(b, 2, () => chirp(b.rand, 1900), 0.2);
  },
  amb_sea_ocean: (b) => {
    surf(b, 12, 120, 900, 1.1);
    wind(b, { level: 0.5, low: 500, high: 1800, gust: 3 });
  },
  amb_wind_plain: (b, windier) => {
    wind(b, { level: windier ? 1.2 : 0.8, low: windier ? 400 : 250, high: windier ? 2400 : 1500, gust: 2.5 });
    if (!windier) scatter(b, 3, () => chirp(b.rand, 3200), 0.35);
  },
  amb_forest: (b, windier) => {
    wind(b, { level: windier ? 0.6 : 0.3, low: 400, high: 1600, gust: 3, q: 0.9 });
    scatter(b, windier ? 2 : 7, () => chirp(b.rand, 2400 + b.rand() * 1800), 0.6);
  },
  amb_jungle: (b) => {
    // Cicadas: a high buzz throbbing in slow waves.
    const swell = drift(b.rand, b.n, 2);
    noiseBand(b, { low: 4200, high: 5200, q: 6, centre: () => 0.5, level: (i) => 0.5 * (0.4 + 0.6 * swell(i)) * (0.6 + 0.4 * Math.sin((TAU * 38 * i) / SR)) });
    noiseBand(b, { low: 150, high: 500, q: 0.7, centre: () => 0.5, level: () => 0.25 });
    scatter(b, 8, () => chirp(b.rand, 1400 + b.rand() * 2000), 0.22);
  },
  amb_desert: (b) => {
    wind(b, { level: 0.6, low: 1500, high: 4500, gust: 2, q: 1.6 });
    wind(b, { level: 0.35, low: 150, high: 400, gust: 4 });
  },
  amb_mountain: (b) => {
    wind(b, { level: 0.9, low: 180, high: 700, gust: 3, q: 3 });
    scatter(b, 1, () => chirp(b.rand, 2200), 0.15, 0.4);
  },
  amb_marsh: (b) => {
    noiseBand(b, { low: 3500, high: 4500, q: 5, centre: () => 0.5, level: () => 0.12 });
    wind(b, { level: 0.25, low: 300, high: 900, gust: 3 });
    scatter(b, 12, () => croak(b.rand), 0.28);
  },
  amb_town: (b) => {
    // A crowd's murmur: bands of voice-like noise rising and falling a few times a second.
    for (let k = 0; k < 3; k++) {
      const talk = drift(b.rand, b.n, 0.25 + b.rand() * 0.2);
      noiseBand(b, { low: 300 + k * 250, high: 900 + k * 300, q: 2, centre: drift(b.rand, b.n, 0.3), level: (i) => 0.35 * talk(i) ** 2 });
    }
    scatter(b, 3, () => strike(b.rand, "clang"), 0.18);
    place(b, 1 + b.rand() * 2, bell(392, 4), -0.3, 0.25);
    place(b, 6 + b.rand() * 2, bell(392, 4), -0.3, 0.2);
    scatter(b, 2, () => chirp(b.rand, 3000), 0.1);
  },
  amb_war_front: (b) => {
    wind(b, { level: 0.45, low: 250, high: 1000, gust: 3 });
    scatter(b, 5, () => strike(b.rand, "thump"), 0.6, 0.6);
    scatter(b, 6, () => strike(b.rand, "clang"), 0.12);
  },
};

export const AMBIENCE_BEDS = Object.keys(BEDS);

/** Synthesizes a bed as a seamless stereo loop of AMBIENCE_SECONDS, levelled to one loudness. */
export function renderBed(id: string, windier = false): [Float32Array, Float32Array] {
  const make = BEDS[id];
  if (!make) throw new Error(`no ambience bed ${id}`);
  const n = (AMBIENCE_SECONDS + FOLD) * SR;
  const seed = [...id].reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), windier ? 7 : 1);
  const b: Bus = { L: new Float32Array(n), R: new Float32Array(n), rand: rng(seed), n };
  make(b, windier);
  // Nothing hisses: a gentle low-pass over the whole bed, except the cicadas' own band.
  if (id !== "amb_jungle") for (const ch of [b.L, b.R]) for (let pass = 0; pass < 2; pass++) {
    const a = Math.exp((-TAU * 5000) / SR);
    let y = 0;
    for (let i = 0; i < n; i++) ch[i] = y = (1 - a) * ch[i]! + a * y;
  }
  const loop = AMBIENCE_SECONDS * SR;
  const fold = FOLD * SR;
  const out: [Float32Array, Float32Array] = [new Float32Array(loop), new Float32Array(loop)];
  let sum = 0;
  for (const [k, src] of [b.L, b.R].entries()) {
    const dst = out[k]!;
    for (let i = 0; i < loop; i++) {
      // The second past the end fades in under the start, so the loop has no seam.
      const w = i < fold ? i / fold : 1;
      dst[i] = src[i]! * w + (i < fold ? src[loop + i]! * (1 - w) : 0);
      sum += dst[i]! * dst[i]!;
    }
  }
  const scale = 0.12 / (Math.sqrt(sum / (2 * loop)) || 1);
  for (const ch of out) for (let i = 0; i < loop; i++) ch[i] = Math.max(-1, Math.min(1, ch[i]! * scale));
  return out;
}
