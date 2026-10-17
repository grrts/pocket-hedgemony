import config from "../../../../rules/data/domain/audio.json" with { type: "json" };
import type { Rng } from "../../rng.ts";
import { isWinter } from "../time-and-turns/index.ts";
import { musicEra, type MusicEra, type Palette, type Ymd, type Zoom } from "./music.ts";

/**
 * Effects (audio spec §4, sound-effects README §3–§10): the catalogue, era
 * and region variants, the mixer's voices, priorities, cooldowns and
 * variation, the turn results player, where a sound sits, ducking and the
 * ambience bed. Pure functions; the synth that plays them is not here.
 */

const X = config.sfx;

// ---------------------------------------------------------------- the catalogue (AUD-070 … AUD-072)

export interface Sound {
  id: string;
  group: string;
  /** 1 highest … 5 lowest; null for ambience beds. */
  priority: number | null;
  voices: string[];
  /** 0 for loops. */
  lengthMs: number;
  when: string;
}

type Row = [number | null, string, number, string];
const ROWS = X.catalogue as unknown as Record<string, Row>;

export function sound(id: string): Sound {
  const row = ROWS[id];
  if (!row) throw new Error(`no sound ${id}`);
  const [priority, voices, lengthMs, when] = row;
  return { id, group: id.split("_")[0]!, priority, voices: voices.split("+"), lengthMs, when };
}

export const CATALOGUE: Sound[] = Object.keys(ROWS).map(sound);
export const isSound = (id: string): boolean => id in ROWS;

/** The catalogue as counted: aliases and the silent autosave are listed but not counted (AUD-070). */
export function catalogueCount(): { sounds: number; groups: Record<string, number>; listedNotCounted: string[] } {
  const groups: Record<string, number> = {};
  const cg = X.count_groups as Record<string, string>;
  for (const s of CATALOGUE) groups[cg[s.group]!] = (groups[cg[s.group]!] ?? 0) + 1;
  return { sounds: CATALOGUE.length, groups, listedNotCounted: [...Object.keys(X.aliases), ...X.silent] };
}

/** An alias points to another sound; the silent rows play nothing (AUD-070, AUD-072). */
export function resolve(id: string): string | null {
  if ((X.silent as string[]).includes(id)) return null;
  return (X.aliases as Record<string, string>)[id] ?? id;
}

/** The sound of a moment named in the catalogue's "When" column. */
export function momentSound(moment: keyof typeof X.moment_sounds): string | null {
  return resolve(X.moment_sounds[moment]);
}

/** Game events map to sounds through the `bindings` table (AUD-103). An event's `sfx:` tag overrides it (AUD-102). */
export function boundSound(event: string, sfxTag?: string): string | null {
  if (sfxTag) return resolve(sfxTag);
  const id = (X.bindings as Record<string, string>)[event];
  return id ? resolve(id) : null;
}

// ---------------------------------------------------------------- era and region (AUD-064 … AUD-069)

export type WarfareEra = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";
export const WARFARE_ERAS = X.era.warfare_eras as WarfareEra[];

/** Which way a sound changes over time (AUD-064 … AUD-066). */
export function timeBasis(id: string): "fixed" | "music_era" | "army_era" {
  if ((X.era.game_year_sounds as string[]).includes(id)) return "music_era";
  if ((X.era.army_sounds as string[]).some((p) => id.startsWith(p))) return "army_era";
  return "fixed";
}

/** The variant of a sound at a date: fixed sounds have one variant in every year (AUD-064). */
export function variantAt(id: string, date: Ymd, armyEra?: WarfareEra): string {
  const basis = timeBasis(id);
  if (basis === "fixed") return `${id}`;
  if (basis === "music_era") return `${id}@${musicEra(date)}`;
  if (!armyEra) throw new Error(`${id} follows the army's era`);
  return `${id}@${armyEra}`;
}

/** The turn chime's arrangement: the notes never change (AUD-013, AUD-065, AUD-068). */
export function turnChime(id: "turn_end" | "turn_ready", era: MusicEra): { notes: string[]; dutyDoubling: number | null; bell: boolean; arpeggioSteps: number; w2Swell: boolean } {
  const tc = X.turn_chimes as unknown as Record<string, { duty_doubling?: number; bell?: boolean; arpeggio_steps: number }> & { turn_end: string[]; turn_ready: string[] };
  const e = tc[era]!;
  return {
    notes: (tc[id] as string[]).slice(),
    dutyDoubling: era === "I" ? e.duty_doubling ?? null : null,
    bell: era === "I" ? !!e.bell : false,
    arpeggioSteps: e.arpeggio_steps,
    // The Era V W2 swell needs a music voice (OQ-AUD-1): not built.
    w2Swell: false,
  };
}

/** The shooting sound of an army's own warfare era (AUD-066); the first band in config order wins where two overlap. */
export function shootingSound(era: WarfareEra, kind?: keyof typeof X.era.military_bands): string {
  const bands = X.era.military_bands as Record<string, string[]>;
  if (kind) {
    if (!bands[kind]!.includes(era)) throw new Error(`${kind} is not sounded in era ${era}`);
    return `battle_shoot_${kind}`;
  }
  const k = Object.keys(bands).find((b) => bands[b]!.includes(era));
  if (!k) throw new Error(`no shooting sound in era ${era}`);
  return `battle_shoot_${k}`;
}

/** Every era variant a troop type may need exists: warfare eras I–VII only, music eras I–V (AUD-069). */
export function variantEras(): { warfare: string[]; music: string[] } {
  const w = new Set<string>();
  for (const eras of Object.values(X.era.military_bands)) eras.forEach((e) => w.add(e));
  return { warfare: WARFARE_ERAS.filter((e) => w.has(e)), music: config.music.eras.bands.map((b) => b.id) };
}

/** `army_march_loop` by the army's era (AUD-066); era VII's engine drone needs motor transport. */
export function marchLoop(era: WarfareEra, motorTransport = false): string | null {
  if (era === "VII" && !motorTransport) return null;
  return (X.marching as Record<string, string>)[era]!;
}

/** Sounds that take the player's palette and which part (AUD-067); battle sounds never do. */
export function paletteSound(id: string, palette: Palette): { palette: Palette; part: string } | null {
  if (!(X.palette_sounds as string[]).includes(id)) return null;
  const part = (X.palette_parts as Record<string, string>)[id];
  return part ? { palette, part } : null;
}

// ---------------------------------------------------------------- the mixer (AUD-057, AUD-058, AUD-085, AUD-086, AUD-091)

export interface Playing {
  id: string;
  priority: number;
  until: number;
}

export interface Mixer {
  /** The three effect voices S1–S3; the music's voices are another bank (AUD-058). */
  voices: (Playing | null)[];
  lastStart: Record<string, number>;
  /** A music stinger plays until this time. */
  stingerUntil?: number;
  /** The army food reserve when `army_hungry` last played, per army (AUD-075). */
  hunger: Record<string, number>;
  /** Last effects and why some were dropped (AUD-131). */
  log: { id: string; result: "played" | "dropped"; reason?: string }[];
}

export function newMixer(): Mixer {
  return { voices: X.bank.voices.map(() => null), lastStart: {}, hunger: {}, log: [] };
}

export function cooldownMs(id: string): number {
  const c = X.cooldown_ms as Record<string, number | string>;
  const v = c[id];
  return typeof v === "number" ? v : (c.default as number);
}

export interface PlayResult {
  played: boolean;
  reason?: "cooldown" | "no voice" | "stinger" | "silent" | "muted";
  stole?: string;
  gainDb: number;
}

/**
 * Starts a sound on the effects bank. The same id doesn't restart within its
 * cooldown; a busy bank gives up the voice of the lowest-priority sound only
 * when that is lower than the new one (AUD-085, AUD-086); under a stinger
 * priority 3–5 is dropped and 1–2 ducked by 4 dB (AUD-091).
 */
export function play(m: Mixer, rawId: string, now: number): PlayResult {
  const id = resolve(rawId);
  if (!id) return { played: false, reason: "silent", gainDb: 0 };
  const s = sound(id);
  const pri = s.priority ?? 5;
  const last = m.lastStart[id];
  if (last !== undefined && now - last < cooldownMs(id)) return drop(m, id, "cooldown");
  let gainDb = 0;
  if (m.stingerUntil !== undefined && now < m.stingerUntil) {
    const d = X.ducking.during_stinger;
    if (pri >= d.drop_priority_at_or_below) return drop(m, id, "stinger");
    gainDb = d.duck_others_db;
  }
  for (let i = 0; i < m.voices.length; i++) if (m.voices[i] && m.voices[i]!.until <= now) m.voices[i] = null;
  const need = Math.min(s.voices.length, m.voices.length);
  const free = m.voices.flatMap((v, i) => (v ? [] : [i]));
  const busy = m.voices.flatMap((v, i) => (v ? [i] : [])).sort((a, b) => m.voices[b]!.priority - m.voices[a]!.priority);
  const victims = busy.slice(0, Math.max(0, need - free.length));
  if (victims.some((i) => !(X.priority.steal_only_if_lower && m.voices[i]!.priority > pri))) return drop(m, id, "no voice");
  const stole = victims.length ? m.voices[victims[0]!]!.id : undefined;
  for (const i of [...free.slice(0, need), ...victims]) m.voices[i] = { id, priority: pri, until: now + (s.lengthMs || Infinity) };
  m.lastStart[id] = now;
  m.log.push({ id, result: "played" });
  return stole ? { played: true, stole, gainDb } : { played: true, gainDb };
}

function drop(m: Mixer, id: string, reason: NonNullable<PlayResult["reason"]>): PlayResult {
  m.log.push({ id, result: "dropped", reason });
  return { played: false, reason, gainDb: 0 };
}

/** Fills the bank with sounds of given priorities, for tests and the busy-turn button. */
export function busyWith(m: Mixer, playing: Playing[]): void {
  m.voices = m.voices.map((_, i) => playing[i] ?? null);
}

/** `army_hungry` repeats only when the reserve gets worse (AUD-075). */
export function armyHungry(m: Mixer, army: string, reserveDays: number, now: number): boolean {
  const before = m.hunger[army];
  if (before !== undefined && reserveDays >= before) return false;
  m.hunger[army] = reserveDays;
  return play(m, "army_hungry", now).played;
}

/** Repeating sounds vary by up to ±1 semitone with a new noise seed, except the never-vary list (AUD-087). */
export function variation(id: string, rng: Rng): { pitchSemitones: number; noiseSeed: number | null } {
  const v = X.variation;
  if ((v.never_vary as string[]).includes(id)) return { pitchSemitones: 0, noiseSeed: null };
  return { pitchSemitones: (rng.next() * 2 - 1) * v.pitch_semitones, noiseSeed: v.reseed_noise ? rng.nextU32() : null };
}

// ---------------------------------------------------------------- many at once (AUD-083, AUD-084, AUD-096)

export interface Result {
  id: string;
  /** Happened to the player's own armies, castles or ruler. */
  playerAsset?: boolean;
  inView?: boolean;
  notification?: boolean;
}

/**
 * The turn results player: at most 5 sounds, 150 ms apart, the player's own
 * first (highest priority first), then those in view; the rest show without
 * sound. Five or more notifications play `notify_batch` only.
 */
export function turnResults(results: Result[]): { plays: { id: string; atMs: number }[]; silent: Result[] } {
  const t = X.turn_results;
  const notes = results.filter((r) => r.notification);
  const others = results.filter((r) => !r.notification);
  const queue: Result[] = [];
  const pri = (r: Result) => sound(resolve(r.id) ?? r.id).priority ?? 5;
  const ach = others.filter((r) => r.id === "ui_achievement");
  const rest = others.filter((r) => r.id !== "ui_achievement");
  if (ach.length) queue.push(ach[0]!);
  queue.push(...rest.filter((r) => r.playerAsset).sort((a, b) => pri(a) - pri(b)));
  queue.push(...rest.filter((r) => !r.playerAsset && r.inView));
  if (notes.length >= t.batch_threshold) queue.push({ id: "notify_batch", notification: true });
  else queue.push(...notes);
  const chosen = queue.slice(0, t.max_sounds);
  return {
    plays: chosen.map((r, i) => ({ id: r.id, atMs: i * t.spacing_ms })),
    silent: results.filter((r) => !chosen.includes(r)),
  };
}

/** `turn_working` ticks every 500 ms from 600 ms after End turn until the turn is ready; never on fast turns (AUD-073). */
export function workingTicks(computeMs: number): number[] {
  const w = X.turn_working;
  const out: number[] = [];
  for (let t = w.start_after_ms; t < computeMs; t += w.tick_every_ms) out.push(t);
  return out;
}

// ---------------------------------------------------------------- where a sound sits (AUD-088, AUD-089, AUD-119)

/** Map sound categories heard at each zoom (AUD-089). */
export function heardAtZoom(zoom: Zoom, category: string): boolean {
  const z = X.zoom[zoom] as string[] | "all";
  return z === "all" || z.includes(category);
}

/**
 * A map sound's volume and pan from its screen position: x and y run −1 … 1
 * from the centre to the edge; beyond the edge it is muted. `notify_` sounds
 * are centred and never muted; mono turns pan off (AUD-088, AUD-119).
 */
export function placeSound(id: string, pos: { x: number; y: number }, o: { mono?: boolean } = {}): { volume: number; pan: number } {
  if (id.startsWith("notify_")) return { volume: 1, pan: 0 };
  const d = Math.max(Math.abs(pos.x), Math.abs(pos.y));
  if (d > 1) return { volume: 0, pan: 0 };
  const volume = 1 - d * (1 - X.distance.edge_volume);
  const pan = o.mono ? 0 : Math.max(-1, Math.min(1, pos.x)) * X.bank.max_pan;
  return { volume, pan };
}

// ---------------------------------------------------------------- ducking (AUD-091 … AUD-094)

/** An effect under a stinger: dropped (priority 3–5) or ducked 4 dB (1–2) (AUD-091). */
export function underStinger(priority: number): { dropped: boolean; db: number } {
  const d = X.ducking.during_stinger;
  return priority >= d.drop_priority_at_or_below ? { dropped: true, db: 0 } : { dropped: false, db: d.duck_others_db };
}

/** Effects duck music only when priority 1 and longer than 600 ms (AUD-092). */
export function ducksMusic(id: string): number {
  const s = sound(id);
  const r = X.ducking.effects_duck_music;
  return s.priority === r.priority && s.lengthMs >= r.min_length_ms ? r.db : 0;
}

/** The ambience bed ducks 6 dB under priority 1–2 effects and fades out over 2 s when a track starts (AUD-093). */
export function ambienceUnderEffect(priority: number): number {
  const a = X.ducking.ambience_under_effects;
  return priority <= a.priority_at_least ? a.db : 0;
}
export const ambienceFadeOnTrackStart = (): number => X.ducking.ambience_fade_on_track_start_s;

/** The loudness targets (AUD-095). */
export function loudness(): { uiTapBelowMusicDb: number; priority1PeakAboveDb: number; mixLufs: number } {
  const m = config.music.mix;
  return { uiTapBelowMusicDb: m.ui_tap_below_music_db, priority1PeakAboveDb: m.priority1_peak_above_music_db, mixLufs: m.target_loudness_lufs };
}

// ---------------------------------------------------------------- moments with special rules (AUD-074, AUD-076 … AUD-078)

/** `map_border_change`: rising for the player, falling against, silent between others (AUD-074). */
export function borderChange(gainer: string, loser: string, player: string): { id: string; notes: "rising" | "falling" } | null {
  if (gainer === player) return { id: "map_border_change", notes: "rising" };
  if (loser === player) return { id: "map_border_change", notes: "falling" };
  return null;
}

export interface Sector {
  name: string;
  /** Distance from the screen centre. */
  distance: number;
  sound: string;
}

/** One sound per bell step from the sector nearest the centre; others only while a voice is free (AUD-076). */
export function bellStep(m: Mixer, sectors: Sector[], now: number): string[] {
  const sorted = [...sectors].sort((a, b) => a.distance - b.distance);
  const out: string[] = [];
  sorted.forEach((s, i) => {
    if (i >= X.battle_screen.sounds_per_bell_step) {
      if (!X.battle_screen.extra_sectors_if_voice_free) return;
      for (let v = 0; v < m.voices.length; v++) if (m.voices[v] && m.voices[v]!.until <= now) m.voices[v] = null;
      if (!m.voices.includes(null)) return;
    }
    if (play(m, s.sound, now).played) out.push(`${s.name}:${s.sound}`);
  });
  return out;
}

/** Skipping ahead in a battle plays only these sounds, then the music stinger (AUD-077). */
export const battleSkipSounds = (): string[] => [...X.battle_screen.on_skip];

/** Harm never gets a rewarding sound (AUD-078, AUD-126). */
export function harmSounds(kind: keyof typeof X.harm): { effects: string[]; quiet: boolean; goldSound: null } {
  const effects = (X.harm[kind] as string[]).slice();
  return { effects, quiet: effects.every((e) => (X.harm.quiet as string[]).includes(e)), goldSound: null };
}

export const coinSounds = (): string[] => [...X.coin_sounds];

/** Several achievements in one turn play `ui_achievement` once (AUD-096). */
export function achievementsSound(count: number): string[] {
  return count > 0 ? ["ui_achievement"] : [];
}

// ---------------------------------------------------------------- ambience (AUD-079 … AUD-082)

export interface CameraGround {
  zoom: Zoom;
  ground?: string;
  bigSettlement?: boolean;
  warFront?: boolean;
}

/** The ambience bed under the camera; none at world zoom or when ambience is off (AUD-079, AUD-080). */
export function ambienceBed(on: boolean, cam: CameraGround, month?: number): { bed: string; windier: boolean } | null {
  const a = X.ambience;
  if (!on || !(a.zooms as string[]).includes(cam.zoom)) return null;
  let bed: string | undefined;
  if (cam.zoom === "local" && cam.warFront) bed = a.local_only["war front"];
  else if (cam.zoom === "local" && cam.bigSettlement) bed = a.local_only["big settlement"];
  else if (cam.ground) bed = (a.beds as Record<string, string>)[cam.ground];
  if (!bed) return null;
  // No weather beds: winter months only make the plain and forest beds windier (AUD-081).
  const windier = month !== undefined && isWinter("northern", month) && (a.windier_in_winter as string[]).includes(bed);
  return { bed, windier };
}

export const ambienceBeds = (): string[] => CATALOGUE.filter((s) => s.group === "amb").map((s) => s.id);

/** Ambience may fill the silences between peace tracks (AUD-082). */
export function ambienceHeard(on: boolean, music: "track" | "silence" | "off"): boolean {
  return on && music !== "track";
}

// ---------------------------------------------------------------- accessibility (AUD-116 … AUD-121)

/** Every sound's visual partner (AUD-116). */
export function visualPartner(id: string): string | null {
  return (X.partners as Record<string, string>)[id] ?? (id.startsWith("notify_") ? "toast" : null);
}

/** Captions for off-screen sounds, at the edge toward the source (AUD-117). */
export function caption(on: boolean, kind: keyof typeof config.captions.kinds, place: string, side: "left" | "right" | "top" | "bottom"): { text: string; icon: string; edge: string } | null {
  if (!on) return null;
  const k = config.captions.kinds[kind];
  return { text: k.text.replace("{place}", place), icon: k.icon, edge: side };
}

/** Reduced intensity: no echo, priority 1 sounds 4 dB softer, no machine-gun stutter (AUD-121). */
export function intensity(id: string, reduced: boolean): { gainDb: number; echoRemoved: boolean; stutter: boolean } {
  const s = sound(id);
  const r = X.reduced_intensity;
  if (!reduced) return { gainDb: 0, echoRemoved: false, stutter: id === "battle_shoot_mg" };
  return { gainDb: s.priority === 1 ? r.priority1_db : 0, echoRemoved: !r.echo, stutter: r.mg_stutter && id === "battle_shoot_mg" };
}
