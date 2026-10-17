import { NOISE_LONG, NOISE_SHORT, SR } from "./chip.ts";

/**
 * Sound effects on the chip's effects bank (sound-effects §3): S1 pulse, S2
 * noise and S3 stepped triangle, stepped 60 times a second with 16 volume
 * steps. Ported from the design's demo (sound-effects/examples/render_sfx.py);
 * ids are the catalogue's (rules/data/domain/audio.json `sfx.catalogue`).
 */

const TICK = Math.floor(SR / 60);

const steps = (v: number) => Math.round(Math.min(15, Math.max(0, v))) / 15;
const lin = (a: number, b: number, k: number, n: number) => (n <= 1 ? a : a + ((b - a) * k) / (n - 1));
const geo = (a: number, b: number, k: number, n: number) => (n <= 1 ? a : a * (b / a) ** (k / (n - 1)));

function note(n: string): number {
  const names: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const m = 12 * (Number(n.at(-1)) + 1) + names[n[0]!]! + (n.includes("#") ? 1 : n[1] === "b" ? -1 : 0);
  return 440 * 2 ** ((m - 69) / 12);
}

function pulse(f: number, ticks: number, duty = 0.5, vFrom = 12, vTo = 0, fTo = f): Float32Array {
  const out = new Float32Array(ticks * TICK);
  let p = 0;
  for (let i = 0; i < out.length; i++) {
    const k = Math.floor(i / TICK);
    p = (p + lin(f, fTo, k, ticks) / SR) % 1;
    out[i] = (p < duty ? 1 : -1) * steps(lin(vFrom, vTo, k, ticks)) * 0.35;
  }
  return out;
}

function tri(f: number, ticks: number, vFrom = 15, vTo = 0, fTo = f): Float32Array {
  const out = new Float32Array(ticks * TICK);
  let p = 0;
  for (let i = 0; i < out.length; i++) {
    const k = Math.floor(i / TICK);
    p = (p + lin(f, fTo, k, ticks) / SR) % 1;
    out[i] = (Math.min(15, Math.floor(Math.abs(p * 2 - 1) * 16)) / 7.5 - 1) * steps(lin(vFrom, vTo, k, ticks)) * 0.5;
  }
  return out;
}

/** Noise clocked at hz (its brightness), stepped per tick. */
function noise(hz: number, ticks: number, vFrom = 15, vTo = 0, hzTo = hz, short = false): Float32Array {
  const src = short ? NOISE_SHORT : NOISE_LONG;
  const out = new Float32Array(ticks * TICK);
  let pos = Math.floor(Math.random() * src.length);
  for (let i = 0; i < out.length; i++) {
    const k = Math.floor(i / TICK);
    pos += geo(hz, hzTo, k, ticks) / SR;
    out[i] = src[Math.floor(pos) % src.length]! * steps(lin(vFrom, vTo, k, ticks)) * 0.3;
  }
  return out;
}

/** Parts at their start tick, mixed. */
function seq(...parts: [number, Float32Array][]): Float32Array {
  const end = Math.max(...parts.map(([s, x]) => s * TICK + x.length));
  const out = new Float32Array(end);
  for (const [s, x] of parts) for (let i = 0; i < x.length; i++) out[s * TICK + i]! += x[i]!;
  return out;
}

function echo(x: Float32Array, ms: number, gain = 0.35): Float32Array {
  const d = Math.floor((SR * ms) / 1000);
  const out = new Float32Array(x.length + d);
  out.set(x);
  for (let i = 0; i < x.length; i++) out[d + i]! += x[i]! * gain;
  return out;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const sortedTimes = (count: number, span: number) => Array.from({ length: count }, () => rand(0, span)).sort((a, b) => a - b);

const MOTIF: Record<number, string> = { 1: "C5", 5: "G5", 4: "F5", 8: "C6" };
function chime(degrees: number[], lens: number[], up = 1): Float32Array {
  const parts: [number, Float32Array][] = [];
  let t = 0;
  degrees.forEach((d, i) => {
    const f = note(MOTIF[d]!) * up;
    parts.push([t, pulse(f, lens[i]! + 4, 0.125, 9, 0)], [t, tri(f / 2, lens[i]! + 6, 13, 0)]);
    t += lens[i]!;
  });
  return seq(...parts);
}

const knock = (f: number, v = 14) => tri(f, 4, v, 0, f * 0.7);
const drumStep = (v = 13) => seq([0, noise(1600, 3, v * 0.7, 0)], [0, tri(150, 3, v, 0, 90)]);

const SOUNDS: Record<string, () => Float32Array> = {
  ui_tap: () => pulse(note("G6"), 3, 0.5, 10, 3),
  ui_tap_soft: () => pulse(note("G6"), 2, 0.125, 6, 2),
  ui_back: () => seq([0, pulse(note("C6"), 2, 0.5, 10, 6)], [2, pulse(note("G5"), 2, 0.5, 9, 0)]),
  ui_confirm: () => seq([0, pulse(note("C6"), 3, 0.5, 12, 9)], [3, pulse(note("G6"), 5, 0.5, 12, 0)]),
  ui_error: () => seq([0, pulse(note("E3"), 4, 0.75, 12, 9)], [4, pulse(note("F3"), 5, 0.75, 12, 0)], [0, noise(3000, 2, 6, 0)]),
  ui_toggle_on: () => pulse(note("C6"), 3, 0.25, 10, 2, note("C7")),
  ui_toggle_off: () => pulse(note("C7"), 3, 0.25, 10, 2, note("C6")),
  turn_end: () => chime([1, 5], [10, 12]),
  turn_ready: () => chime([4, 5, 8], [5, 5, 18]),
  // A new year: the whole motif, an octave up.
  turn_month_new_year: () => chime([1, 5, 4, 5, 8], [6, 4, 4, 6, 18], 1),
  econ_income: () => seq([0, pulse(note("B5"), 3, 0.25, 11, 10)], [3, pulse(note("E6"), 7, 0.25, 12, 0)]),
  econ_spend: () => seq([0, pulse(note("E6"), 3, 0.25, 11, 9)], [3, pulse(note("C6"), 5, 0.25, 10, 0)]),
  econ_build_done: () => seq([0, knock(330)], [0, noise(5000, 2, 6, 0)], [7, tri(note("E5"), 22, 12, 0)], [7, pulse(note("E6"), 14, 0.125, 5, 0)]),
  map_select_province: () => knock(260, 12),
  army_select: () => seq([0, drumStep()], [6, drumStep(11)]),
  army_order_move: () => seq([0, drumStep(10)], [6, drumStep(11)], [11, drumStep(12)], [15, drumStep(14)]),
  army_levy_call: () => seq([0, drumStep(9)], [8, drumStep(9)], [16, drumStep(12)], [20, drumStep(12)], [24, drumStep(14)]),
  battle_bell: () => seq([0, tri(note("A4"), 24, 14, 0)], [0, pulse(note("A5") * 1.5, 10, 0.125, 5, 0)]),
  battle_start: () => {
    // The bell, then horses breaking into a charge.
    const gaps = [7, 6, 5, 5, 4, 4, 3, 3, 3];
    const parts: [number, Float32Array][] = [[0, tri(note("A4"), 24, 14, 0)], [0, pulse(note("A5") * 1.5, 10, 0.125, 5, 0)]];
    let t = 18;
    for (const g of gaps) parts.push([t, seq([0, noise(1200, 2, 10, 0)], [0, tri(220, 2, 10, 0)])]), (t += g);
    parts.push([t, noise(2000, 16, 15, 0, 400)], [t, tri(140, 8, 14, 0, 70)]);
    return seq(...parts);
  },
  battle_shoot_bow: () => seq(...sortedTimes(14, 12).map((t): [number, Float32Array] => [Math.floor(t), noise(rand(5000, 9000), 3, rand(4, 8), 0)]), [14, noise(2500, 10, 4, 0)]),
  battle_shoot_matchlock: () => seq(...sortedTimes(9, 24).map((t): [number, Float32Array] => [Math.floor(t), noise(rand(2500, 3500), 6, 14, 0, 600)]), [4, noise(6000, 24, 3, 0)]),
  battle_shoot_volley: () => seq([0, noise(3600, 2, 15, 13)], [2, noise(1800, 4, 12, 9)], [6, noise(900, 18, 9, 0)], [0, tri(110, 6, 12, 0, 60)]),
  battle_gun: () => echo(seq([0, noise(2400, 28, 15, 0, 300)], [0, tri(180, 10, 15, 0, 60)]), 120),
  battle_rout: () => seq(...sortedTimes(12, 30).map((t): [number, Float32Array] => [Math.floor(t), drumStep(rand(5, 11))]), [20, pulse(note("A4"), 26, 0.5, 10, 0, note("D4"))]),
  siege_begin: () => seq([0, knock(180)], [10, knock(160)], [20, knock(180)], [0, noise(1400, 6, 5, 0)]),
  siege_breach: () => seq([0, noise(2000, 50, 15, 0, 200)], [6, knock(140)], [18, knock(110)], [32, knock(90)], [0, tri(120, 12, 15, 0, 50)]),
  siege_fall: () => seq([0, noise(2000, 30, 12, 0, 300)], [4, knock(140)], [16, knock(100)], [26, tri(note("D4"), 30, 12, 0)]),
  // Harm gets no rising or rewarding sound (AUD-126): one low bell.
  realm_famine: () => tri(note("D3"), 40, 11, 0),
  realm_unrest: () => seq(...[0, 7, 11, 18, 22].map((t): [number, Float32Array] => [t, drumStep(8)]), [10, tri(note("E3"), 24, 10, 0)]),
  ui_achievement: () => chime([1, 5, 4, 5, 8], [7, 4, 4, 7, 20], 2),
};

export const SFX_IDS = Object.keys(SOUNDS);
export const hasSound = (id: string): boolean => id in SOUNDS;

/** Synthesizes a sound, mono at SR. Each call varies a little (sound-effects §4.3) where the sound has random parts. */
export function renderSound(id: string): Float32Array {
  const fn = SOUNDS[id];
  if (!fn) throw new Error(`no sound ${id}`);
  return fn();
}
