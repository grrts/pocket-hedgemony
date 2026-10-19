import { lowpassState, SR, type Env, type WaveName } from "./chip.ts";
import { drumHit, hall, pad, softBass, softPulse, softWave, type Drum } from "./voices.ts";
import type { Palette } from "@ph/engine/domain/audio";
import { BANDS, DRUM_INSTRUMENT, WAVE_INSTRUMENT, type Instrument } from "./instruments.ts";
import { NO_KIT, sampledHit, sampledNote, tailOf, type Kit } from "./samples.ts";

/**
 * The first music for the PH-5 chip (music-design §3, §4), pulled forward for
 * playtesting before the MML track build (AUD-097) exists. Tracks are written
 * in scale degrees, so each palette's tuning table, root and wavetable give
 * the same peace tune its own voice (music-design §3.3); every track quotes
 * the Hegemony motif 1-5-4-5-8 somewhere. The palette tables are first
 * drafts awaiting a musician's review (AUD-123).
 */

/** Cents of scale degrees 1 to 7. */
type Table = readonly [number, number, number, number, number, number, number];

const MODES = {
  major: [0, 200, 400, 500, 700, 900, 1100],
  minor: [0, 200, 300, 500, 700, 800, 1000],
  dorian: [0, 200, 300, 500, 700, 900, 1000],
} as const satisfies Record<string, Table>;
type Mode = keyof typeof MODES;

export interface PaletteVoice {
  /** MIDI note of degree 1 in the middle octave. */
  root: number;
  table: Table;
  wave: WaveName;
  /** Tempo of peace tunes against the written one. */
  tempo: number;
  name: string;
}

/**
 * Each palette's voice (music-design §3.3): its tuning, home key and timbre.
 * Pentatonic traditions fold the missing degrees onto their neighbours, so a
 * tune written in seven degrees still plays in five.
 */
export const PALETTE_VOICES: Record<Palette, PaletteVoice> = {
  europe_west: { root: 62, table: MODES.dorian, wave: "lute", tempo: 1, name: "Western Europe" },
  europe_east: { root: 64, table: MODES.minor, wave: "bowed", tempo: 0.95, name: "Eastern Europe" },
  // Maqam rast: neutral third and seventh.
  mena: { root: 62, table: [0, 200, 350, 500, 700, 900, 1050], wave: "reed", tempo: 0.95, name: "Middle East and North Africa" },
  steppe: { root: 60, table: [0, 200, 500, 500, 700, 1000, 1000], wave: "bowed", tempo: 1.05, name: "the Steppe" },
  // Khamaj: a flat seventh over the drone.
  south_asia: { root: 61, table: [0, 200, 400, 500, 700, 900, 1000], wave: "reed", tempo: 0.9, name: "South Asia" },
  east_asia: { root: 63, table: [0, 200, 400, 500, 700, 900, 900], wave: "bell", tempo: 0.9, name: "East Asia" },
  // Slendro, roughly five equal steps.
  southeast_asia: { root: 62, table: [0, 240, 480, 480, 720, 960, 960], wave: "bell", tempo: 0.95, name: "Southeast Asia" },
  west_africa: { root: 60, table: [0, 200, 400, 500, 700, 900, 1000], wave: "wood", tempo: 1.1, name: "West Africa" },
  africa_east_south: { root: 62, table: MODES.major, wave: "wood", tempo: 1.05, name: "East and Southern Africa" },
  americas: { root: 62, table: [0, 300, 300, 500, 700, 1000, 1000], wave: "flute", tempo: 0.95, name: "the Americas" },
  oceania: { root: 60, table: MODES.major, wave: "flute", tempo: 0.95, name: "Oceania" },
  atlantic_creole: { root: 60, table: MODES.major, wave: "organ", tempo: 1.1, name: "the Atlantic" },
};

/** P1 and P2 lead and answer, T is the bass, W the regional wavetable, S the pad that holds the chords (D-AUD-14). */
type Voice = "P1" | "P2" | "T" | "W" | "S";

interface Part {
  v: Voice;
  seq: string;
  /** Octave of degree 1 against the root (0 = the root's octave). */
  oct?: number;
  /** Beat it starts on. */
  at?: number;
  layer?: number;
  gate?: number;
  /** The instrument that plays it, over the palette's band. */
  inst?: Instrument;
  o?: Env & { duty?: number; vol?: number; vibrato?: boolean; wave?: WaveName };
}

interface Drums {
  seq: string;
  at?: number;
  layer?: number;
}

export interface TrackDef {
  bpm: number;
  /** Beats in a bar, for changing tracks on the bar line. */
  bar: number;
  /** Length in beats; loops repeat from the top. */
  beats: number;
  /** Fixed mode and root; without them the palette's tuning plays it. */
  mode?: Mode;
  root?: number;
  layers?: number;
  stinger?: boolean;
  parts: Part[];
  drums?: Drums[];
  name: string;
}

// ---------------------------------------------------------------- note text

/** Hz of a degree token like `5`, `8`, `#7,` (sharp, an octave down) or `b2'`. */
export function degreeHz(token: string, table: Table, root: number, oct: number): number {
  const m = /^([#b]?)(\d+)([,']*)$/.exec(token);
  if (!m) throw new Error(`bad note ${token}`);
  const n = Number(m[2]);
  const marks = [...m[3]!].reduce((a, c) => a + (c === "'" ? 1 : -1), 0);
  const idx = (n - 1) % 7;
  const octs = Math.floor((n - 1) / 7) + marks + oct;
  const cents = table[idx]! + (m[1] === "#" ? 100 : m[1] === "b" ? -100 : 0) + 1200 * octs;
  return 440 * 2 ** ((root - 69) / 12) * 2 ** (cents / 1200);
}

/** Beats a note line lasts. */
export function lineBeats(seq: string): number {
  return seq.split(/\s+/).filter(Boolean).reduce((a, t) => a + Number(t.split(":")[1]), 0);
}

const rep = (s: string, n: number) => Array(n).fill(s).join(" ");

/** Eighth-note arpeggios over chords like `1-3-5` (root, third, fifth, third). */
function arp(chords: string[], beat = 0.5, perBar = 4): string {
  return chords
    .flatMap((c) => {
      const t = c.split("-");
      return Array.from({ length: perBar / beat }, (_, i) => `${t[[0, 1, 2, 1][i % 4]!]}:${beat}`);
    })
    .join(" ");
}

/** A triad on a root degree: `4` gives `4-6-8`. */
const triad = (r: number) => `${r}-${r + 2}-${r + 4}`;

// ---------------------------------------------------------------- the tracks

/**
 * The tunes are written harmony first (D-AUD-15): each bar has a chord, the
 * tune lands on one of its notes on the beat, the bass walks the chord roots
 * and the regional voice breaks the chord. Peace tunes keep to chords on
 * degrees 1, 3, 4 and 5, which stay consonant in every palette's tuning.
 */

/** A pad chord on a root degree, voiced low enough to sit under the tune. */
const padChord = (r: number) => (r >= 5 ? [r, r + 2, r + 4].map((x) => `${x},`).join("-") : triad(r));
/** Held chords for the pad: a chord on each root, lasting a bar. */
const padLine = (roots: number[], beats: number) => roots.map((r) => `${padChord(r)}:${beats}`).join(" ");
/** The fifth below a root degree, for the bass's second step. */
const fifthBelow = (r: number) => `${r + 4},`;
/** Broken chords on the regional voice: root, fifth, third, fifth. */
const broken = (roots: number[], beat: number, perBar: number) =>
  roots.map((r) => Array.from({ length: perBar / beat }, (_, i) => `${[r, r + 4, r + 2, r + 4][i % 4]}:${beat}`).join(" ")).join(" ");

const TITLE_ROOTS = [1, 7, 4, 1, 3, 7, 4, 5];
const TITLE_MELODY =
  "1:1 5:.5 4:.5 5:1 8:1 9:1.5 8:.5 7:2 6:1 5:.5 4:.5 6:1 8:1 5:2 3:1 2:1 " +
  "3:1 5:.5 6:.5 7:2 9:1 8:.5 7:.5 4:2 4:1 6:1 8:1 6:1 9:1 7:1 5:2";

/** The early peace tune in 3/4: a pastoral A (with the motif) and a dance B. */
const PASTORAL_ROOTS = [1, 1, 4, 1, 1, 5, 1, 5, 3, 4, 1, 5, 1, 4, 5, 1];
const PASTORAL =
  "1:1 5:.5 4:.5 5:1 8:2 7:1 6:1.5 5:.5 4:1 5:3 3:1 4:.5 5:.5 3:1 2:2 7,:1 1:1 3:1 5:1 7,:1 2:1 5:1 " +
  "3:1.5 5:.5 7:1 8:2 6:1 5:1.5 4:.5 3:1 2:3 1:1 5:.5 4:.5 5:1 8:1 6:1 4:1 5:1 4:.5 3:.5 2:1 1:3";
const DANCE_ROOTS = [1, 4, 5, 1, 1, 4, 5, 5, 4, 1, 4, 5, 3, 4, 5, 1];
const DANCE =
  "5:1 3:.5 4:.5 5:1 6:1 4:.5 5:.5 6:1 7:1 5:.5 6:.5 7:1 8:2 5:1 3:1 5:.5 3:.5 1:1 6:1 4:.5 6:.5 8:1 7:1.5 6:.5 5:1 5:3 " +
  "8:1 6:.5 8:.5 6:1 5:1 3:.5 5:.5 8:1 6:1.5 5:.5 4:1 5:1 4:.5 3:.5 2:1 3:1 5:.5 7:.5 5:1 4:1 6:.5 8:.5 6:1 5:1.5 4:.5 2:1 1:3";

/** The late peace tune, a march in 4/4. */
const MARCH_ROOTS = [1, 5, 4, 5, 1, 4, 5, 1, 4, 1, 4, 5, 3, 4, 5, 1];
const MARCH =
  "1:1 5:.5 4:.5 5:1 8:1 7:1.5 6:.5 5:2 6:1 4:.5 5:.5 6:1 8:1 7:2 5:2 " +
  "8:1 7:.5 6:.5 5:1 3:1 4:1 6:1 8:1.5 6:.5 5:1 4:.5 3:.5 2:2 1:3 r:1 " +
  "6:1 8:1 6:1 4:1 5:1.5 3:.5 1:2 4:1 6:.5 8:.5 6:1 8:1 5:1 7:1 9:2 " +
  "10:1.5 9:.5 8:1 7:1 8:1.5 6:.5 4:1 6:1 5:1 4:.5 3:.5 2:1 7,:1 1:4";

const PROSPERITY_ROOTS = [1, 4, 6, 5, 1, 4, 5, 1];
const DIPLOMACY_ROOTS = [1, 6, 4, 5, 1, 3, 4, 1];

const WAR_CHORDS = ["1-3-5", "6,-1-3", "7,-2-4", "5,-#7,-2"];
const WAR_BASS = rep([["1", "5,"], ["6,", "3,"], ["7,", "4,"], ["5,", "2,"]].map(([r, f]) => `${rep(`${r}:.5`, 6)} ${f}:.5 ${r}:.5`).join(" "), 2);
const WAR_BAR = "kick:1 snare:1 kick:.5 kick:.5 snare:1";
const WAR_FILL = "kick:1 snare:1 kick:1 snare:.25 snare:.25 snare:.25 snare:.25";
const SIEGE_CHORDS = ["1-3-5", "1-3-5", "4,-6,-1", "5,-#7,-2", "1-3-5", "6,-1-3", "4,-6,-1", "5,-#7,-2"];

export const TRACKS: Record<string, TrackDef> = {
  title: {
    name: "Title theme",
    bpm: 84,
    bar: 4,
    beats: 32,
    mode: "dorian",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: TITLE_MELODY, o: { duty: 0.25, vol: 0.8, vibrato: true, decay: 0.6, sustain: 0.7 } },
      { v: "W", seq: broken(TITLE_ROOTS, 1, 4), o: { vol: 0.35, decay: 0.3, sustain: 0.15 } },
      { v: "T", oct: -1, seq: TITLE_ROOTS.map((r) => `${r}:2 ${fifthBelow(r)}:2`).join(" ") },
      { v: "S", seq: padLine(TITLE_ROOTS, 4), inst: "choir_aahs", o: { vol: 0.25 } },
    ],
    drums: [{ seq: "boom:4 r:12 boom:4 r:12" }],
  },
  peace_early: {
    name: "Peace",
    bpm: 96,
    bar: 3,
    beats: 96,
    parts: [
      { v: "P1", oct: 1, seq: PASTORAL, o: { duty: 0.5, vol: 0.7, vibrato: true, decay: 0.5, sustain: 0.6 } },
      { v: "W", seq: PASTORAL_ROOTS.map((r) => `${r}:1 ${r + 4}:1 ${r + 2}:1`).join(" "), o: { vol: 0.4, decay: 0.25, sustain: 0.1 } },
      { v: "T", oct: -1, seq: PASTORAL_ROOTS.map((r) => `${r}:3`).join(" ") },
      { v: "S", seq: padLine(PASTORAL_ROOTS, 3), o: { vol: 0.25 } },
      { v: "P1", oct: 1, at: 48, seq: DANCE, o: { duty: 0.25, vol: 0.7, vibrato: true, decay: 0.4, sustain: 0.55 } },
      { v: "W", at: 48, seq: broken(DANCE_ROOTS, 0.5, 3), o: { vol: 0.35, decay: 0.15, sustain: 0.1 } },
      { v: "T", oct: -1, at: 48, seq: DANCE_ROOTS.map((r) => `${r}:2 ${fifthBelow(r)}:1`).join(" ") },
      { v: "S", at: 48, seq: padLine(DANCE_ROOTS, 3), o: { vol: 0.2 } },
    ],
    drums: [
      { seq: rep("boom:3 r:3", 8) },
      { at: 48, seq: [...Array(15).fill("boom:1 rim:1 rim:1"), "boom:3"].join(" ") },
    ],
  },
  peace_late: {
    name: "Peace",
    bpm: 108,
    bar: 4,
    beats: 64,
    parts: [
      { v: "P1", oct: 1, seq: MARCH, o: { duty: 0.5, vol: 0.75, vibrato: true, decay: 0.45, sustain: 0.6 } },
      { v: "W", seq: broken(MARCH_ROOTS.slice(0, 8), 1, 4), o: { vol: 0.35, decay: 0.25, sustain: 0.15 } },
      { v: "W", at: 32, seq: MARCH_ROOTS.slice(8).map((r) => `${r + 2}:2 ${r + 4}:2`).join(" "), o: { wave: "horn", vol: 0.35, decay: 0.8, sustain: 0.7 } },
      { v: "T", oct: -1, seq: MARCH_ROOTS.map((r) => `${r}:2 ${fifthBelow(r)}:2`).join(" "), gate: 0.85 },
      { v: "S", seq: padLine(MARCH_ROOTS, 4), o: { vol: 0.25 } },
    ],
    drums: [{ seq: rep("kick:1 r:1 rim:1 r:1", 7) + " kick:1 r:1 snare:1 snare:1 " + rep("kick:1 r:1 rim:1 r:1", 7) + " kick:1 snare:.5 snare:.5 boom:2" }],
  },
  prosperity: {
    name: "Prosperity",
    bpm: 112,
    bar: 4,
    beats: 32,
    mode: "major",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: "1:1 5:.5 4:.5 5:1 8:1 8:1 6:.5 7:.5 8:2 6:1 5:.5 4:.5 3:1 6:1 5:2 2:2 5:1 6:.5 7:.5 8:1 10:1 11:1.5 10:.5 8:1 6:1 7:1 6:.5 5:.5 9:1 7:1 8:3 r:1", o: { duty: 0.25, vol: 0.8, vibrato: true, decay: 0.4, sustain: 0.6 } },
      { v: "W", seq: arp(PROSPERITY_ROOTS.map(triad)), o: { vol: 0.3, decay: 0.12, sustain: 0.1 } },
      { v: "T", oct: -1, seq: PROSPERITY_ROOTS.map((r) => `${r}:1 ${r + 4}:1 ${r}:1 ${r + 4}:1`).join(" "), gate: 0.7 },
      { v: "S", seq: padLine(PROSPERITY_ROOTS, 4), o: { vol: 0.25 } },
    ],
    drums: [{ seq: rep("kick:1 tick:1 rim:1 tick:1", 7) + " kick:1 rim:1 snare:1 snare:1" }],
  },
  diplomacy: {
    name: "Diplomacy",
    bpm: 92,
    bar: 4,
    beats: 32,
    mode: "major",
    root: 60,
    parts: [
      { v: "W", oct: 1, seq: "5:1.5 4:.5 3:1 2:1 3:2 1:2 4:1 5:.5 6:.5 8:1 6:1 7,:1 2:1 5:2 1:1 5:.5 4:.5 5:1 8:1 7:2 5:1 3:1 6:1.5 5:.5 4:1 2:1 1:4", o: { wave: "organ", vol: 0.5, decay: 0.5, sustain: 0.45 } },
      { v: "P2", seq: arp(DIPLOMACY_ROOTS.map(padChord), 1), o: { duty: 0.5, vol: 0.3, decay: 0.3, sustain: 0.2 } },
      { v: "T", oct: -1, seq: DIPLOMACY_ROOTS.map((r) => `${r >= 5 ? `${r},` : r}:4`).join(" ") },
      { v: "S", seq: padLine(DIPLOMACY_ROOTS, 4), o: { vol: 0.25 } },
    ],
  },
  war_mobilize: {
    name: "Mobilizing",
    bpm: 120,
    bar: 4,
    beats: 32,
    mode: "minor",
    root: 62,
    layers: 2,
    parts: [
      { v: "T", oct: -1, seq: rep("1:.5 1:.5 5,:.5 1:.5", 16), gate: 0.7 },
      { v: "P1", oct: 1, layer: 2, seq: "1:.5 1:.25 1:.25 5:1 r:2 1:.5 5:.5 8:2 r:1 5:.5 5:.25 5:.25 8:1 r:2 8:.5 7:.5 5:3 1:.5 1:.25 1:.25 5:1 4:1 5:1 8:4 r:4 5:1 4:.5 5:.5 8:2", o: { duty: 0.5, vol: 0.85, decay: 0.3, sustain: 0.6 } },
      { v: "W", layer: 2, seq: rep("1:2 5,:2", 8), o: { wave: "horn", vol: 0.4, decay: 0.6, sustain: 0.6 } },
    ],
    drums: [{ seq: rep("snare:.5 snare:.5 kick:1 snare:.5 snare:.5 kick:1", 8) }],
  },
  war_campaign: {
    name: "Campaign",
    bpm: 112,
    bar: 4,
    beats: 32,
    mode: "minor",
    root: 62,
    layers: 3,
    parts: [
      { v: "T", oct: -1, seq: WAR_BASS, gate: 0.8 },
      { v: "P2", layer: 2, seq: arp([...WAR_CHORDS, ...WAR_CHORDS]), o: { duty: 0.25, vol: 0.6, decay: 0.1, sustain: 0.35 } },
      { v: "S", layer: 2, seq: [...WAR_CHORDS, ...WAR_CHORDS].map((c) => `${c}:4`).join(" "), o: { vol: 0.28 } },
      { v: "P1", oct: 1, layer: 3, seq: "1:1.5 5:.5 4:.5 5:.5 8:1 8:1 7:.5 6:.5 3:2 4:1 5:.5 6:.5 7:1 2:1 5:2 2:1 #7,:1 1:1 3:1 5:1 8:1 10:1.5 9:.5 8:1 6:1 7:1 6:.5 5:.5 4:1 2:1 5:4", o: { duty: 0.5, vol: 0.9, vibrato: true, decay: 0.5, sustain: 0.7 } },
      { v: "W", layer: 3, seq: [...WAR_CHORDS, ...WAR_CHORDS].map((c) => c.split("-")).map((t) => `${t[1]}:2 ${t[2]}:2`).join(" "), o: { wave: "horn", vol: 0.5, decay: 0.8, sustain: 0.7 } },
    ],
    drums: [
      { seq: [WAR_BAR, WAR_BAR, WAR_BAR, WAR_FILL, WAR_BAR, WAR_BAR, WAR_BAR, WAR_FILL].join(" ") },
      { layer: 3, seq: rep("r:.5 tick:.5 r:.5 tick:.5", 16) },
    ],
  },
  war_siege: {
    // Rewritten chord first (feedback 118): the old bass ground a minor second
    // (1 against b2) under a horn drone, which beat like a vibrating noise.
    name: "Siege",
    bpm: 76,
    bar: 4,
    beats: 32,
    mode: "minor",
    root: 62,
    layers: 2,
    parts: [
      { v: "T", oct: -1, seq: SIEGE_CHORDS.map((c) => `${c.split("-")[0]}:2 ${c.split("-")[0]}:2`).join(" "), gate: 0.6 },
      { v: "S", seq: SIEGE_CHORDS.map((c) => `${c}:4`).join(" "), o: { vol: 0.26 } },
      { v: "P1", oct: 1, layer: 2, seq: "1:2 5:1 4:1 5:2 8:2 6:2 4:1 1:1 5:2 2:2 3:3 1:1 1:2 3:1 6,:1 4:2 6:2 5:4", o: { duty: 0.25, vol: 0.6, vibrato: true, decay: 1, sustain: 0.6 } },
      { v: "W", layer: 2, seq: SIEGE_CHORDS.map((c) => c.split("-")).map((t) => `${t[1]}:2 ${t[2]}:2`).join(" "), o: { wave: "horn", vol: 0.3, decay: 0.8, sustain: 0.5 } },
    ],
    drums: [{ seq: rep("boom:2 r:1 tick:1", 8) }],
  },
  war_losing: {
    name: "The war goes badly",
    bpm: 72,
    bar: 4,
    beats: 32,
    mode: "minor",
    root: 62,
    layers: 2,
    parts: [
      { v: "T", oct: -1, seq: rep("1:4 6,:4 4,:4 5,:4", 2) },
      { v: "S", seq: rep("1-3-5:4 6,-1-3:4 4,-6,-1:4 5,-#7,-2:4", 2), o: { vol: 0.28 } },
      { v: "P1", oct: 1, layer: 2, seq: "5:2 4:1 3:1 3:2 1:1 6,:1 4:2 6,:1 1:1 2:2 #7,:2 1:1 5:1 4:1 5:1 8:2 6:2 6:1.5 5:.5 4:2 5:2 #7,:2", o: { duty: 0.5, vol: 0.7, vibrato: true, decay: 0.9, sustain: 0.7 } },
      { v: "P2", layer: 2, seq: arp(["1-3-5", "6,-1-3", "4,-6,-1", "5,-#7,-2", "1-3-5", "6,-1-3", "4,-6,-1", "5,-#7,-2"], 1), o: { duty: 0.25, vol: 0.35, decay: 0.3, sustain: 0.3 } },
    ],
    drums: [{ seq: rep("boom:4", 7) + " boom:1 snare:.25 snare:.25 snare:.25 snare:.25 boom:2" }],
  },
  unrest: {
    name: "Unrest",
    bpm: 104,
    bar: 4,
    beats: 32,
    mode: "minor",
    root: 64,
    layers: 2,
    parts: [
      { v: "T", oct: -1, seq: rep("1:.75 1:.25 r:.5 3:.5 1:.5 b2:.5 1:1", 8), gate: 0.7 },
      { v: "P2", layer: 2, oct: 1, seq: rep("5:.25 6:.25 5:.25 6:.25 5:1 r:1 3:.5 4:.5", 4) + " " + rep("5:.25 6:.25 5:.25 6:.25 8:1 r:1 7:.5 5:.5", 4), o: { duty: 0.25, vol: 0.5, decay: 0.15, sustain: 0.3 } },
      { v: "P1", layer: 2, oct: 1, at: 16, seq: "1:1 5:.5 4:.5 5:1 8:1 7:2 5:2 4:1 3:1 2:1 7,:1 1:4", o: { duty: 0.5, vol: 0.7, decay: 0.4, sustain: 0.5 } },
    ],
    drums: [{ seq: rep("rim:.5 r:.5 snare:.5 r:.5 kick:1 rim:.5 r:.5", 8) }],
  },
  crisis: {
    name: "Crisis",
    bpm: 66,
    bar: 4,
    beats: 32,
    mode: "minor",
    root: 62,
    parts: [
      { v: "T", oct: -1, seq: "1:8 1:8 b2:8 1:8" },
      { v: "S", seq: "1-3-5:8 1-3-5:8 b2-4-6:8 1-3-5:8", o: { vol: 0.22 } },
      { v: "P1", oct: 1, seq: "1:1 5:1 4:1 5:1 8:4 7:2 5:2 3:4 6:2 4:2 b2:4 3:2 2:2 1:4", o: { duty: 0.25, vol: 0.6, vibrato: true, decay: 1.2, sustain: 0.6 } },
      { v: "W", seq: rep("1:2 r:2", 4) + " " + rep("b2:2 r:2", 2) + " " + rep("1:2 r:2", 2), o: { wave: "bell", vol: 0.35, decay: 0.6, sustain: 0.1 } },
    ],
    drums: [{ seq: rep("boom:4", 8) }],
  },
  // ---- stingers (music-design §4.4): short, over the track, never a state.
  war_declared: {
    name: "War declared",
    stinger: true,
    bpm: 112,
    bar: 4,
    beats: 5,
    mode: "minor",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: "5:.5 5:.5 6:.5 5:2.5", o: { duty: 0.5, vol: 0.9, vibrato: true } },
      { v: "P2", seq: "8:.5 8:.5 9:.5 #7:2.5", o: { duty: 0.25, vol: 0.7 } },
      { v: "T", oct: -2, seq: "5:4" },
    ],
    drums: [{ seq: "kick:.5 kick:.5 kick:.5 " + rep("snare:.25", 10) }],
  },
  battle_won: {
    name: "Battle won",
    stinger: true,
    bpm: 112,
    bar: 4,
    beats: 5,
    mode: "major",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: "1:.5 5:.25 4:.25 5:.5 8:2.5", o: { duty: 0.5, vol: 0.95, vibrato: true, decay: 1, sustain: 0.8 } },
      { v: "P2", seq: "3:.5 8:.25 7:.25 8:.5 10:2.5", o: { duty: 0.25, vol: 0.7, decay: 1, sustain: 0.7 } },
      { v: "W", seq: "5:1 5:3", o: { wave: "horn", vol: 0.5, decay: 1, sustain: 0.7 } },
      { v: "T", oct: -1, seq: "1:.5 5,:.5 1:3" },
    ],
    drums: [{ seq: "snare:.25 snare:.25 snare:.25 snare:.25 crash:3" }],
  },
  battle_lost: {
    name: "Battle lost",
    stinger: true,
    bpm: 90,
    bar: 4,
    beats: 5,
    mode: "minor",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: "5:.5 4:.5 3:.5 2:.5 1:2", o: { duty: 0.5, vol: 0.8, vibrato: true, decay: 1, sustain: 0.6 } },
      { v: "P2", seq: "3:1 2:1 7,:2", o: { duty: 0.25, vol: 0.5, decay: 1, sustain: 0.6 } },
      { v: "T", oct: -1, seq: "4,:2 5,:1 1:2" },
    ],
    drums: [{ seq: "boom:2 boom:2" }],
  },
  war_won: {
    name: "War won",
    stinger: true,
    bpm: 100,
    bar: 4,
    beats: 8,
    mode: "major",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: "5,:.5 1:.5 3:.5 5:.5 1:1 5:.5 4:.5 5:1 8:3", o: { duty: 0.5, vol: 0.95, vibrato: true, decay: 1, sustain: 0.8 } },
      { v: "P2", seq: "3:.5 5:.5 8:.5 10:.5 5:1 8:1 7:1 10:3", o: { duty: 0.25, vol: 0.65, decay: 1, sustain: 0.7 } },
      { v: "W", seq: "1:2 4:1 5:1 1:4", o: { wave: "horn", vol: 0.5, decay: 1.5, sustain: 0.8 } },
      { v: "T", oct: -1, seq: "1:2 4,:1 5,:1 1:4" },
    ],
    drums: [{ seq: "snare:.25 snare:.25 snare:.25 snare:.25 kick:1 snare:1 kick:1 crash:4" }],
  },
  war_lost: {
    name: "War lost",
    stinger: true,
    bpm: 72,
    bar: 4,
    beats: 8,
    mode: "minor",
    root: 62,
    parts: [
      { v: "P1", oct: 1, seq: "8:1 7:.5 5:.5 4:1 3:1 2:1 1:.5 7,:.5 1:2", o: { duty: 0.5, vol: 0.75, vibrato: true, decay: 1.2, sustain: 0.6 } },
      { v: "T", oct: -1, seq: "1:2 6,:2 4,:2 1:2" },
    ],
    drums: [{ seq: "boom:4 boom:4" }],
  },
};

/** Tracks of the full list (music-design §4) we haven't written yet play the nearest one we have. */
const STAND_INS: Record<string, string> = {
  nation_select: "title",
  credits: "title",
  load_resume: "peace",
  campaign_end: "war_won",
  game_over: "war_lost",
  exploration: "peace",
  revolution: "unrest",
  world_war: "war_campaign",
  war_naval: "war_campaign",
  era_1: "peace",
  era_2: "peace",
  era_3: "peace",
  era_4: "peace",
  era_5: "peace",
};

/** The written track that plays for a track id of the director: palette peace tracks share one tune in each half of the eras. */
export function writtenTrack(id: string): string | null {
  if (TRACKS[id]) return id;
  if (id.startsWith("peace_")) return id.endsWith("_late") ? "peace_late" : "peace_early";
  const stand = STAND_INS[id];
  if (stand === "peace") return "peace_early";
  return stand ?? null;
}

// ---------------------------------------------------------------- rendering

const GAIN: Record<Voice | "N", number> = { P1: 0.3, P2: 0.15, T: 0.5, W: 0.3, S: 0.2, N: 0.32 };
const PAN: Record<Voice | "N", number> = { P1: -0.15, P2: 0.3, T: 0, W: 0.2, S: -0.05, N: 0 };
/** Level of each voice on the sampled instruments, against the chip's levels in GAIN (D-AUD-16). */
const SAMPLED: Record<Voice | "N", number> = { P1: 0.75, P2: 0.6, T: 0.3, W: 1, S: 0.8, N: 0.4 };
/** How much of the hall is heard against the dry voices. */
const HALL = 0.3;

export interface Rendered {
  /** Stereo samples of each layer (layer 1 first), all the same length. */
  layers: [Float32Array, Float32Array][];
  seconds: number;
  barSeconds: number;
  stinger: boolean;
}

/** Lets the page breathe between parts while a track is synthesized. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Synthesizes a track for a palette. Loops are cut to their exact length so
 * they repeat seamlessly; stingers keep a second of tail.
 */
export async function renderTrack(id: string, palette: Palette, breathe_ = breathe, kit: Kit = NO_KIT): Promise<Rendered> {
  // Gives the page a frame whenever about 6 ms of work has piled up.
  let since = performance.now();
  const slice = async () => {
    if (performance.now() - since < 6) return;
    await breathe_();
    since = performance.now();
  };
  const def = TRACKS[id];
  if (!def) throw new Error(`no track ${id}`);
  const pv = PALETTE_VOICES[palette];
  const table = def.mode ? MODES[def.mode] : pv.table;
  const root = def.root ?? pv.root;
  const bpm = def.mode ? def.bpm : def.bpm * pv.tempo;
  const spb = 60 / bpm;
  const seconds = def.beats * spb;
  const length = Math.ceil((seconds + (def.stinger ? 1.2 : 0)) * SR);
  const layerCount = def.layers ?? 1;
  const voices = Array.from({ length: layerCount }, () => ({ P1: new Float32Array(length), P2: new Float32Array(length), T: new Float32Array(length), W: new Float32Array(length), S: new Float32Array(length), N: new Float32Array(length) }));
  // A loop's tail wraps round to its start, so notes ringing over the end aren't cut.
  const wrap = !def.stinger;
  const band = trackBand(id, palette);
  for (const part of def.parts) {
    const sampled = kit.get(partInstrument(part, band));
    const out = voices[(part.layer ?? 1) - 1]![part.v];
    let b = part.at ?? 0;
    for (const tok of part.seq.split(/\s+/).filter(Boolean)) {
      const [note, d] = tok.split(":");
      const beats = Number(d);
      if (note !== "r") {
        const n = Math.floor(beats * spb * (part.gate ?? (part.v === "S" ? 1 : 0.92)) * SR);
        const s = Math.floor(b * spb * SR);
        const o = { ...part.o, ...(part.v === "W" && !part.o?.wave ? { wave: pv.wave } : {}) };
        // A chord like 1-3-5 sounds each of its notes, less any that would rub against a lower one in this tuning.
        for (const f of chordHz(note!, table, root, part.oct ?? 0)) {
          if (sampled) {
            const vol = SAMPLED[part.v] * (part.o?.vol ?? 1);
            writeWrapped(out, s, n + tailOf(sampled), wrap, (dst, at) => sampledNote(dst, at, n, f, sampled, vol));
            continue;
          }
          const write = (dst: Float32Array, at: number) =>
            part.v === "T" ? softBass(dst, at, n, f) : part.v === "W" ? softWave(dst, at, n, f, o) : part.v === "S" ? pad(dst, at, n, f, o) : softPulse(dst, at, n, f, o);
          writeWrapped(out, s, n, wrap, write);
        }
        await slice();
      }
      b += beats;
    }
  }
  for (const d of def.drums ?? []) {
    const out = voices[(d.layer ?? 1) - 1]!.N;
    let b = d.at ?? 0;
    for (const tok of d.seq.split(/\s+/).filter(Boolean)) {
      const [k, beats] = tok.split(":");
      if (k !== "r") {
        const s = Math.floor(b * spb * SR);
        const skin = DRUM_INSTRUMENT[k!];
        const sampled = skin && kit.get(skin.inst);
        if (skin && sampled) {
          const len = sampled.notes[0]!.length;
          writeWrapped(out, s, len, wrap, (dst, at) => sampledHit(dst, at, sampled, skin.note, SAMPLED.N));
          await slice();
          b += Number(beats);
          continue;
        }
        const hit = drumHit(k as Drum);
        writeWrapped(out, s, hit.length, wrap, (dst, at) => {
          for (let i = 0; i < hit.length && at + i < dst.length; i++) dst[at + i]! += hit[i]!;
        });
        await slice();
      }
      b += Number(beats);
    }
  }
  await slice();
  // Mixing works through the samples in blocks, so no step holds the page for long.
  const blocks = async (fn: (a: number, b: number) => void) => {
    for (let a = 0; a < length; a += 32768) {
      fn(a, Math.min(length, a + 32768));
      await slice();
    }
  };
  const layers: [Float32Array, Float32Array][] = [];
  for (const v of voices) {
    const L = new Float32Array(length);
    const R = new Float32Array(length);
    for (const k of ["P1", "P2", "T", "W", "S", "N"] as const) {
      const g = GAIN[k];
      const l = g * (1 - PAN[k]);
      const r = g * (1 + PAN[k]);
      const src = v[k];
      await blocks((a, b) => {
        for (let i = a; i < b; i++) {
          L[i]! += src[i]! * l;
          R[i]! += src[i]! * r;
        }
      });
    }
    const lpL = lowpassState(6000);
    const lpR = lowpassState(6000);
    await blocks((a, b) => (lpL(L, a, b), lpR(R, a, b)));
    // The hall: a loop is fed through once first so its end rings into its start.
    const room = hall();
    if (wrap) await blocks((a, b) => {
      for (let i = a; i < b; i++) room.step((L[i]! + R[i]!) * 0.5);
    });
    await blocks((a, b) => {
      for (let i = a; i < b; i++) {
        room.step((L[i]! + R[i]!) * 0.5);
        L[i]! += room.l * HALL;
        R[i]! += room.r * HALL;
      }
    });
    layers.push([L, R]);
  }
  // One level for the whole track, all layers playing.
  let peak = 1e-6;
  await blocks((a, b) => {
    for (let i = a; i < b; i++) {
      let l = 0;
      let r = 0;
      for (const [L, R] of layers) (l += L[i]!), (r += R[i]!);
      peak = Math.max(peak, Math.abs(l), Math.abs(r));
    }
  });
  const scale = 0.89 / peak;
  for (const [L, R] of layers) await blocks((a, b) => {
    for (let i = a; i < b; i++) (L[i]! *= scale), (R[i]! *= scale);
  });
  return { layers, seconds: wrap ? length / SR : seconds, barSeconds: def.bar * spb, stinger: !!def.stinger };
}

/** The band a track plays on: the palette's, with the war lead on war tracks and battle stingers. */
function trackBand(id: string, palette: Palette) {
  const band = BANDS[palette];
  return /^(war_|battle_)/.test(id) ? { ...band, lead: band.war } : band;
}

/** The instrument of a part: its own, else its voice's place in the band, a timbre the part asks for standing in for the regional voice. */
function partInstrument(part: Part, band: (typeof BANDS)[Palette]): Instrument {
  if (part.inst) return part.inst;
  if (part.v === "P1") return band.lead;
  if (part.v === "P2") return band.answer;
  if (part.v === "T") return band.bass;
  if (part.v === "S") return band.pad;
  return part.o?.wave ? WAVE_INSTRUMENT[part.o.wave] : band.regional;
}

/** Every instrument a palette's music can ask for, to load before its first track. */
export function paletteInstruments(palette: Palette): Instrument[] {
  const war = trackBand("war_", palette);
  const names = new Set<Instrument>([...Object.values(BANDS[palette]), war.lead]);
  for (const t of Object.values(TRACKS)) for (const p of t.parts) names.add(partInstrument(p, BANDS[palette]));
  for (const d of Object.values(DRUM_INSTRUMENT)) if (d) names.add(d.inst);
  return [...names];
}

/**
 * The notes of a chord token. Folded pentatonic and neutral tunings can turn
 * a triad into a cluster, so a note within a semitone (or a tritone) of one
 * already kept is dropped.
 */
export function chordHz(note: string, table: Table, root: number, oct: number): number[] {
  const kept: number[] = [];
  for (const one of note.split("-")) {
    const f = degreeHz(one, table, root, oct);
    const rubs = kept.some((g) => {
      const c = ((Math.round(1200 * Math.log2(f / g)) % 1200) + 1200) % 1200;
      return (c > 50 && c < 160) || c > 1040 || (c > 550 && c < 650);
    });
    if (!rubs) kept.push(f);
  }
  return kept;
}

/** Writes a note; in a loop, the part past the end lands at the start. */
function writeWrapped(out: Float32Array, s: number, n: number, wrap: boolean, write: (dst: Float32Array, at: number) => void): void {
  if (!wrap || s + n <= out.length) return write(out, s);
  const tmp = new Float32Array(n);
  write(tmp, 0);
  for (let i = 0; i < n; i++) out[(s + i) % out.length]! += tmp[i]!;
}
