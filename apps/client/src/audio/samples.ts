import { SR } from "./chip.ts";
import { INSTRUMENTS, sampleNotes, type Instrument, type InstrumentDef } from "./instruments.ts";

/**
 * Plays notes on the sampled instruments (D-AUD-16). A pack is decoded once
 * into one note per slot; a note picks the nearest sample and reads it
 * faster or slower to reach its pitch, so the palettes' own tunings (maqam,
 * slendro) play true. Held notes of bowed, blown and sung instruments loop
 * the middle of their sample with a short crossfade.
 */

export interface Sampled {
  def: InstrumentDef;
  /** MIDI note and Hz of each sample. */
  midi: number[];
  hz: number[];
  /** Mono samples at SR, one per note, each starting at its note's onset. */
  notes: Float32Array[];
}

/** Cuts a decoded pack into its notes, finding each note's onset (the MP3 encoder adds a little silence at the start). */
export function cutPack(name: Instrument, data: Float32Array): Sampled {
  const def: InstrumentDef = INSTRUMENTS[name];
  const slot = Math.round(def.slot * SR);
  const midi = sampleNotes(name);
  const notes = midi.map((_, k) => {
    const from = k * slot;
    let peak = 1e-6;
    for (let i = from; i < Math.min(data.length, from + slot); i++) peak = Math.max(peak, Math.abs(data[i]!));
    let onset = from;
    const limit = Math.min(data.length - 1, from + Math.round(0.25 * SR));
    while (onset < limit && Math.abs(data[onset]!) < peak * 0.01) onset++;
    return data.slice(onset, Math.min(data.length, from + slot + (onset - from)));
  });
  return { def, midi, hz: midi.map((m) => 440 * 2 ** ((m - 69) / 12)), notes };
}

/** Seconds a plucked or struck note keeps ringing after its written end. */
const RING = 0.35;
/** Seconds a held note takes to stop. */
const RELEASE = 0.08;
const ATTACK = 0.004;

/** Samples a note writes past its written length (how long it rings). */
export const tailOf = (s: Sampled) => Math.round((s.def.sustain ? RELEASE : RING) * SR);

/** Writes one note of `n` samples at `f` Hz into `out` from sample `s`, with its tail after. */
export function sampledNote(out: Float32Array, at: number, n: number, f: number, inst: Sampled, vol: number): void {
  let k = 0;
  for (let i = 1; i < inst.hz.length; i++) if (Math.abs(Math.log(f / inst.hz[i]!)) < Math.abs(Math.log(f / inst.hz[k]!))) k = i;
  const x = inst.notes[k]!;
  const rate = f / inst.hz[k]!;
  const tail = tailOf(inst);
  const total = n + tail;
  // The loop of a held note: the middle of the sample, crossfaded over 0.1 s.
  const loopStart = Math.round(x.length * 0.35);
  const loopEnd = Math.round(x.length * 0.85);
  const span = loopEnd - loopStart;
  const xf = Math.min(Math.round(0.1 * SR), span >> 1);
  const read = (p: number) => {
    const i = Math.floor(p);
    if (i < 0 || i + 1 >= x.length) return 0;
    const t = p - i;
    return x[i]! * (1 - t) + x[i + 1]! * t;
  };
  const attack = ATTACK * SR;
  for (let i = 0; i < total && at + i < out.length; i++) {
    let p = i * rate;
    let v: number;
    if (inst.def.sustain && p >= loopEnd - xf) {
      if (p >= loopEnd) p = loopStart + ((p - loopStart) % span);
      const w = p >= loopEnd - xf ? (p - (loopEnd - xf)) / xf : 0;
      v = read(p) * (1 - w) + read(p - span) * w;
    } else {
      if (p >= x.length - 1) break;
      v = read(p);
    }
    const env = (i < attack ? i / attack : 1) * (i < n ? 1 : 1 - (i - n) / tail);
    out[at + i]! += v * vol * env;
  }
}

/** Writes a drum sample at its own pitch. */
export function sampledHit(out: Float32Array, at: number, inst: Sampled, note: number, vol: number): void {
  const x = inst.notes[Math.max(0, inst.midi.indexOf(note))]!;
  for (let i = 0; i < x.length && at + i < out.length; i++) out[at + i]! += x[i]! * vol;
}

/** The instruments a track can use, loaded or not. */
export interface Kit {
  get(name: Instrument): Sampled | undefined;
}

export const NO_KIT: Kit = { get: () => undefined };

/**
 * The game's instrument store: each pack is fetched from `music/` beside the
 * page and decoded once. A pack that can't be fetched or decoded stays
 * missing, and its parts play on the chip voices (AUD-111 fallback).
 */
export class InstrumentStore implements Kit {
  private loaded = new Map<Instrument, Sampled>();
  private pending = new Map<Instrument, Promise<void>>();

  get(name: Instrument): Sampled | undefined {
    return this.loaded.get(name);
  }

  load(names: Iterable<Instrument>): Promise<void> {
    return Promise.all([...new Set(names)].map((n) => this.one(n))).then(() => undefined);
  }

  private one(name: Instrument): Promise<void> {
    let p = this.pending.get(name);
    if (!p) {
      p = fetch(new URL(`music/${name}.mp3`, document.baseURI))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then(decodeMono)
        .then((data) => void this.loaded.set(name, cutPack(name, data)))
        .catch((e: unknown) => console.warn(`instrument ${name} not loaded: ${String(e)}`));
      this.pending.set(name, p);
    }
    return p;
  }
}

/** Decodes an MP3 to mono floats at the music's rate. */
async function decodeMono(bytes: ArrayBuffer): Promise<Float32Array> {
  const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) throw new Error("no OfflineAudioContext");
  const ctx = new Offline(1, 1, SR);
  const buf = await new Promise<AudioBuffer>((resolve, reject) => {
    // Safari 15 knows only the callback form.
    const p = ctx.decodeAudioData(bytes, resolve, reject) as Promise<AudioBuffer> | undefined;
    p?.then(resolve, reject);
  });
  return buf.getChannelData(0).slice();
}
