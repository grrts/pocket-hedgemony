import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTES } from "@ph/engine/domain/audio";
import { SR } from "./chip.ts";
import { INSTRUMENTS, sampleNotes, type Instrument } from "./instruments.ts";
import { cutPack, sampledNote } from "./samples.ts";
import { paletteInstruments, renderTrack } from "./tracks.ts";

/** A made-up pack: each slot a sine at its note's pitch, after a little encoder silence. */
function sinePack(name: Instrument, lead = 300): Float32Array {
  const slot = Math.round(INSTRUMENTS[name].slot * SR);
  const notes = sampleNotes(name);
  const data = new Float32Array(slot * notes.length + lead);
  notes.forEach((m, k) => {
    const hz = 440 * 2 ** ((m - 69) / 12);
    for (let i = 0; i < slot - lead; i++) data[lead + k * slot + i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / SR);
  });
  return data;
}

/** Hz of a signal by counting upward zero crossings. */
function pitch(x: Float32Array, from: number, to: number): number {
  let n = 0;
  for (let i = from + 1; i < to; i++) if (x[i - 1]! < 0 && x[i]! >= 0) n++;
  return (n * SR) / (to - from);
}

const now = () => Promise.resolve();

describe("sampled instruments (D-AUD-16)", () => {
  it("ships a pack for every instrument a palette's band can ask for", () => {
    for (const p of PALETTES) for (const name of paletteInstruments(p)) expect(existsSync(new URL(`../../public/music/${name}.mp3`, import.meta.url)), name).toBe(true);
  });

  it("starts each note on its onset, past the encoder's silence", () => {
    const s = cutPack("recorder", sinePack("recorder"));
    expect(s.notes).toHaveLength(sampleNotes("recorder").length);
    for (const n of s.notes) expect(Math.max(...n.slice(0, 4).map(Math.abs))).toBeGreaterThan(0.004);
    expect(Math.max(...s.notes[0]!.slice(0, 40).map(Math.abs))).toBeGreaterThan(0.1);
  });

  it("retunes the nearest sample to any pitch, a maqam neutral third included", () => {
    const s = cutPack("recorder", sinePack("recorder"));
    for (const hz of [330, 369.99 * 2 ** (-50 / 1200), 523.25]) {
      const out = new Float32Array(SR);
      sampledNote(out, 0, SR / 2, hz, s, 1);
      expect(pitch(out, 0, SR / 4) / hz).toBeCloseTo(1, 1);
    }
  });

  it("holds a bowed or blown note past its sample's end and then lets it go", () => {
    const s = cutPack("cello", sinePack("cello"));
    const n = 6 * SR;
    const out = new Float32Array(n + SR);
    sampledNote(out, 0, n, 110, s, 1);
    expect(out.every(Number.isFinite)).toBe(true);
    const rms = (a: number, b: number) => Math.sqrt(out.slice(a, b).reduce((t, v) => t + v * v, 0) / (b - a));
    expect(rms(5 * SR, 5.5 * SR)).toBeGreaterThan(0.1);
    expect(rms(n + SR / 2, n + SR)).toBe(0);
  });

  it("renders every palette's peace on its band", async () => {
    const packs = new Map<Instrument, ReturnType<typeof cutPack>>();
    const kit = { get: (name: Instrument) => packs.get(name) ?? (packs.set(name, cutPack(name, sinePack(name))), packs.get(name)) };
    for (const p of PALETTES) {
      const r = await renderTrack("peace_early", p, now, kit);
      for (const [L, R] of r.layers) expect(L.every(Number.isFinite) && R.every(Number.isFinite)).toBe(true);
    }
  }, 60_000);
});
