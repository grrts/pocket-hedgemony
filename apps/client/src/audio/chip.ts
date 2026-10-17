/**
 * The PH-5 sound chip (music-design §2, sound-effects §3): pulse, 4-bit
 * stepped triangle, 32-sample 4-bit wavetable and LFSR noise, with 16 volume
 * steps. Sounds are synthesized from note data into sample buffers; nothing is
 * recorded. These are the same voices as the design's demo renders
 * (music-design/examples/render_demo.py, sound-effects/examples/render_sfx.py).
 */

/** Samples per second we synthesize at: the 9 kHz low-pass leaves nothing above 11 kHz to keep. */
export const SR = 22050;

export interface Env {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
}

/** The chip's volume envelope at sample i of n, in 16 steps (render_demo.py `envelope`). */
function envAt(i: number, n: number, vol: number, e: Env): number {
  const attack = e.attack ?? 0.004;
  const decay = e.decay ?? 0.25;
  const sustain = e.sustain ?? 0.6;
  const release = e.release ?? 0.03;
  const t = i / SR;
  let v = Math.min(1, t / attack) * (sustain + (1 - sustain) * Math.exp(-t / decay));
  const r = Math.min(n, Math.floor(release * SR));
  if (i >= n - r) v *= (n - i) / r;
  return Math.round(v * vol * 15) / 15;
}

/** Frequency at sample i, with the lead's delayed vibrato (about 12 cents at 5.5 Hz). */
function freqAt(f: number, i: number, n: number, vibrato: boolean): number {
  if (!vibrato || n < SR * 0.35) return f;
  const t = i / SR;
  const depth = Math.min(1, Math.max(0, (t - 0.25) / 0.2)) * 0.007;
  return f * (1 + depth * Math.sin(2 * Math.PI * 5.5 * t));
}

export interface PulseOpts extends Env {
  duty?: number;
  vol?: number;
  vibrato?: boolean;
}

export function pulse(out: Float32Array, s: number, n: number, f: number, o: PulseOpts = {}): void {
  const duty = o.duty ?? 0.5;
  const vol = o.vol ?? 0.5;
  let p = 0;
  for (let i = 0; i < n && s + i < out.length; i++) {
    p = (p + freqAt(f, i, n, !!o.vibrato) / SR) % 1;
    out[s + i]! += (p < duty ? 1 : -1) * envAt(i, n, vol, o);
  }
}

/** The bass: a 4-bit stepped triangle with no volume control, only on and off. */
export function triangle(out: Float32Array, s: number, n: number, f: number, o: { vol?: number } = {}): void {
  const vol = o.vol ?? 0.55;
  const r = Math.min(n, Math.floor(0.01 * SR));
  let p = 0;
  for (let i = 0; i < n && s + i < out.length; i++) {
    p = (p + f / SR) % 1;
    const step = Math.min(15, Math.floor(Math.abs(p * 2 - 1) * 16));
    let v = (step / 7.5 - 1) * vol;
    if (i >= n - r) v *= (n - i) / r;
    out[s + i]! += v;
  }
}

/** A 32-sample, 4-bit wavetable from a waveform over one cycle. */
export function table(fn: (x: number) => number): Float32Array {
  const w = Array.from({ length: 32 }, (_, i) => fn(i / 32));
  const lo = Math.min(...w);
  const hi = Math.max(...w);
  return Float32Array.from(w, (v) => Math.round(((v - lo) / (hi - lo)) * 15) / 7.5 - 1);
}

const TAU = 2 * Math.PI;
const sin = Math.sin;

/** The regional timbres the W voice swaps between (music-design §2). */
export const WAVES = {
  lute: table((x) => sin(TAU * x) + 0.6 * sin(2 * TAU * x) + 0.35 * Math.sign(sin(3 * TAU * x))),
  horn: table((x) => sin(TAU * x) + 0.5 * sin(2 * TAU * x + 1) + 0.25 * sin(3 * TAU * x)),
  reed: table((x) => sin(TAU * x) + 0.8 * sin(3 * TAU * x) + 0.5 * sin(5 * TAU * x)),
  bell: table((x) => sin(TAU * x) + 0.7 * sin(2.76 * TAU * x) + 0.4 * sin(5.4 * TAU * x)),
  bowed: table((x) => (x < 0.5 ? x * 2 : 2 - x * 2) * 2 - 1 + 0.3 * sin(2 * TAU * x)),
  wood: table((x) => sin(TAU * x) + 0.45 * sin(4 * TAU * x) + 0.2 * sin(6 * TAU * x)),
  organ: table((x) => sin(TAU * x) + 0.5 * sin(2 * TAU * x) + 0.33 * sin(4 * TAU * x)),
  flute: table((x) => sin(TAU * x) + 0.15 * sin(2 * TAU * x)),
} as const;
export type WaveName = keyof typeof WAVES;

export function wavetable(out: Float32Array, s: number, n: number, f: number, o: Env & { wave?: WaveName; vol?: number } = {}): void {
  const w = WAVES[o.wave ?? "lute"];
  const vol = o.vol ?? 0.45;
  let p = 0;
  for (let i = 0; i < n && s + i < out.length; i++) {
    p = (p + (f * 32) / SR) % 32;
    out[s + i]! += w[Math.floor(p)]! * envAt(i, n, vol, o);
  }
}

/** The 15-bit LFSR noise in its long and short (metallic) modes. */
function lfsr(short: boolean, length: number): Float32Array {
  const taps = short ? 6 : 1;
  let reg = 0x7fff;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const bit = (reg ^ (reg >> taps)) & 1;
    reg = (reg >> 1) | (bit << 14);
    out[i] = reg & 1 ? 1 : -1;
  }
  return out;
}
export const NOISE_LONG = lfsr(false, 32767);
export const NOISE_SHORT = lfsr(true, 93);

/** Drum hits on the noise voice: clock Hz (brightness), short mode, volume, decay seconds. */
export const DRUMS = {
  kick: [1800, false, 0.7, 0.06],
  boom: [2500, false, 0.45, 0.18],
  snare: [9000, false, 0.5, 0.09],
  tick: [16000, false, 0.22, 0.025],
  crash: [14000, false, 0.38, 0.9],
  rim: [6000, true, 0.25, 0.03],
} as const;
export type Drum = keyof typeof DRUMS;

export function drum(out: Float32Array, s: number, kind: Drum, vol = 1): void {
  const [clock, short, v, dec] = DRUMS[kind];
  const seq = short ? NOISE_SHORT : NOISE_LONG;
  const n = Math.floor(dec * 6 * SR);
  for (let i = 0; i < n && s + i < out.length; i++) {
    const env = Math.round(v * vol * Math.exp(-i / SR / dec) * 15) / 15;
    out[s + i]! += seq[Math.floor((i * clock) / SR) % seq.length]! * env;
  }
}

/** A gentle one-pole low-pass, in place over a range of samples at a time (the chip's 9 kHz edge on pulse waves). */
export function lowpassState(hz = 9000): (x: Float32Array, from: number, to: number) => void {
  const a = Math.exp((-2 * Math.PI * hz) / SR);
  let acc = 0;
  return (x, from, to) => {
    for (let i = from; i < to; i++) x[i] = acc = (1 - a) * x[i]! + a * acc;
  };
}
