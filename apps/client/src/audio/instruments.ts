import type { Palette } from "@ph/engine/domain/audio";
import type { WaveName } from "./chip.ts";

/**
 * The sampled instruments the music plays on (D-AUD-16): notes of the Fluid R3
 * GM soundfont (Frank Wen, CC BY 3.0), cut by `tools/music-samples` into one
 * short MP3 per instrument under `public/music/`. Each pack holds one note
 * every `step` semitones from `low` to `high`, each in a slot of `slot`
 * seconds; a note between two samples plays the nearest one, retuned.
 */

export interface InstrumentDef {
  /** MIDI notes of the lowest and highest sample. */
  low: number;
  high: number;
  /** Semitones between samples. */
  step: number;
  /** Seconds each sample keeps. */
  slot: number;
  /** Held notes longer than the sample loop its middle (bowed, blown and sung instruments). */
  sustain?: boolean;
}

const blown = (low: number, high: number): InstrumentDef => ({ low, high, step: 4, slot: 2.5, sustain: true });
const plucked = (low: number, high: number): InstrumentDef => ({ low, high, step: 4, slot: 2 });

export const INSTRUMENTS = {
  recorder: blown(60, 96),
  flute: blown(60, 96),
  pan_flute: blown(60, 92),
  ocarina: blown(60, 92),
  shakuhachi: blown(56, 92),
  oboe: blown(58, 90),
  shanai: blown(60, 92),
  violin: blown(56, 96),
  fiddle: blown(56, 96),
  trumpet: blown(56, 88),
  french_horn: blown(44, 80),
  cello: { ...blown(36, 72), step: 3 },
  string_ensemble_1: { ...blown(40, 84), slot: 3 },
  choir_aahs: { ...blown(48, 80), slot: 3 },
  acoustic_guitar_nylon: plucked(40, 88),
  dulcimer: plucked(48, 92),
  koto: plucked(48, 92),
  shamisen: plucked(48, 88),
  sitar: plucked(48, 88),
  orchestral_harp: plucked(40, 96),
  kalimba: plucked(56, 92),
  marimba: plucked(48, 92),
  banjo: plucked(48, 88),
  harpsichord: plucked(40, 92),
  taiko_drum: { low: 36, high: 48, step: 12, slot: 1.5 },
  timpani: { low: 36, high: 48, step: 12, slot: 2 },
  woodblock: { low: 60, high: 72, step: 12, slot: 0.6 },
} as const satisfies Record<string, InstrumentDef>;

export type Instrument = keyof typeof INSTRUMENTS;

/** The MIDI notes a pack holds, in order. */
export function sampleNotes(name: Instrument): number[] {
  const d: InstrumentDef = INSTRUMENTS[name];
  const notes: number[] = [];
  for (let n = d.low; n <= d.high; n += d.step) notes.push(n);
  return notes;
}

/** A palette's band (D-AUD-16): who plays the tune, the answer, the regional voice, the bass, the held chords, and the tune in war. */
export interface Band {
  lead: Instrument;
  answer: Instrument;
  regional: Instrument;
  bass: Instrument;
  pad: Instrument;
  war: Instrument;
}

const strings = { bass: "cello", pad: "string_ensemble_1" } as const;

/** Each palette's period instruments, nearest the soundfont holds (lute as nylon guitar, qanun as koto, balafon as marimba, mbira as kalimba). */
export const BANDS: Record<Palette, Band> = {
  europe_west: { lead: "recorder", answer: "flute", regional: "acoustic_guitar_nylon", ...strings, war: "trumpet" },
  europe_east: { lead: "violin", answer: "recorder", regional: "dulcimer", ...strings, war: "trumpet" },
  mena: { lead: "oboe", answer: "flute", regional: "koto", ...strings, war: "shanai" },
  steppe: { lead: "fiddle", answer: "flute", regional: "shamisen", ...strings, war: "shanai" },
  south_asia: { lead: "flute", answer: "oboe", regional: "sitar", ...strings, war: "shanai" },
  east_asia: { lead: "shakuhachi", answer: "flute", regional: "koto", ...strings, war: "shakuhachi" },
  southeast_asia: { lead: "flute", answer: "recorder", regional: "marimba", ...strings, war: "shanai" },
  west_africa: { lead: "orchestral_harp", answer: "flute", regional: "marimba", ...strings, war: "shanai" },
  africa_east_south: { lead: "flute", answer: "recorder", regional: "kalimba", ...strings, war: "french_horn" },
  americas: { lead: "pan_flute", answer: "ocarina", regional: "marimba", ...strings, war: "french_horn" },
  oceania: { lead: "flute", answer: "pan_flute", regional: "marimba", ...strings, war: "french_horn" },
  atlantic_creole: { lead: "fiddle", answer: "flute", regional: "banjo", ...strings, war: "trumpet" },
};

/** The instrument a part's own timbre asks for, over the palette's regional voice. */
export const WAVE_INSTRUMENT: Record<WaveName, Instrument> = {
  lute: "acoustic_guitar_nylon",
  horn: "french_horn",
  reed: "oboe",
  bell: "dulcimer",
  bowed: "violin",
  wood: "marimba",
  organ: "harpsichord",
  flute: "flute",
};

/** Drums that have a sampled skin; the snare and crash stay synthesized (the soundfont has no kit). */
export const DRUM_INSTRUMENT: Partial<Record<string, { inst: Instrument; note: number }>> = {
  kick: { inst: "taiko_drum", note: 36 },
  boom: { inst: "timpani", note: 36 },
  rim: { inst: "woodblock", note: 72 },
  tick: { inst: "woodblock", note: 72 },
};
