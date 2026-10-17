import config from "../../../../rules/data/domain/audio.json" with { type: "json" };
import { voiceBudget, type Director, type MusicEra } from "./music.ts";
import { CATALOGUE, type Mixer } from "./effects.ts";

/**
 * The PH-5 chip's rules as build checks, platform behaviour, audio settings
 * and the diagnostics line (audio spec §4–§5: AUD-003 … AUD-010, AUD-057 …
 * AUD-063, AUD-097 … AUD-115, AUD-131). No Web Audio here: these are the
 * decisions the client's synth layer follows.
 */

const C = config.chip;
const X = config.sfx;

// ---------------------------------------------------------------- tracks as the build sees them

export type Degree = string;

export interface VoiceSource {
  voice: string;
  /** Steps of the voice; more than one degree in a step is a chord on one voice. */
  steps: Degree[][];
  /** A sample of a real instrument instead of the chip's waveforms. */
  sample?: boolean;
  wavetable?: string;
}

export interface TrackSource {
  id: string;
  era: MusicEra;
  voices: VoiceSource[];
  loopSeconds: number;
  introSeconds?: number;
  kind?: "loop" | "stinger";
  reverb?: boolean;
  echoMs?: number;
}

/** Does a line of degrees quote the motif 1 – 5 – 4 – 5 – 1↑ (AUD-011)? */
export function quotesMotif(line: Degree[]): boolean {
  const m = config.motif.degrees;
  for (let i = 0; i + m.length <= line.length; i++) if (m.every((d, j) => line[i + j] === d)) return true;
  return false;
}

/** The build's checks on one compiled track (AUD-006, AUD-008, AUD-011, AUD-022, AUD-098). */
export function checkTrack(t: TrackSource): string[] {
  const errors: string[] = [];
  const budget = voiceBudget(t.era);
  if (t.voices.length > budget.voices) errors.push(`uses ${t.voices.length} voices, budget ${budget.voices}`);
  const allowed = [...C.music_voices, ...(budget.w2 ? [C.extra_voice] : [])];
  for (const v of t.voices) {
    if (!allowed.includes(v.voice)) errors.push(`voice ${v.voice} not on the chip in era ${t.era}`);
    if (v.sample) errors.push(`${v.voice} uses a sample`);
    if (v.steps.some((s) => s.length > 1)) errors.push(`${v.voice} plays a chord on one voice`);
  }
  if (t.reverb) errors.push("reverb tail");
  if (t.echoMs !== undefined && (t.echoMs < C.echo_ms[0]! || t.echoMs > C.echo_ms[1]!)) errors.push(`echo of ${t.echoMs} ms`);
  const L = config.music.lengths;
  if ((t.kind ?? "loop") === "loop") {
    if (t.loopSeconds < L.loop_seconds[0]! || t.loopSeconds > L.loop_seconds[1]!) errors.push(`loop of ${t.loopSeconds} s`);
    if (t.introSeconds !== undefined && (t.introSeconds < L.intro_seconds[0]! || t.introSeconds > L.intro_seconds[1]!)) errors.push(`intro of ${t.introSeconds} s`);
  } else if (t.loopSeconds < L.stinger_seconds[0]! || t.loopSeconds > L.stinger_seconds[1]!) errors.push(`stinger of ${t.loopSeconds} s`);
  if (!t.voices.some((v) => quotesMotif(v.steps.map((s) => s[0] ?? "r")))) errors.push("never quotes the motif");
  return errors;
}

/** Every id a director names must exist (AUD-098, AUD-100). */
export function missingIds(named: string[], built: string[]): string[] {
  return named.filter((id) => !built.includes(id));
}

// ---------------------------------------------------------------- sounds as the build sees them

export interface SoundSource {
  id: string;
  voices: string[];
  lengthMs: number;
  /** Era variants written, e.g. ["IV", "V"]. */
  eras?: string[];
  /** The notification or animation named with it (AUD-116). */
  partner?: string;
}

/** The build's checks on one sound (AUD-100). `needsEras` are the eras a troop type needs. */
export function checkSound(s: SoundSource, needsEras: string[] = []): string[] {
  const errors: string[] = [];
  if (s.voices.length > X.bank.voices.length) errors.push(`uses ${s.voices.length} voices`);
  if (s.lengthMs >= X.bank.max_length_ms && !s.id.startsWith("amb_")) errors.push(`lasts ${s.lengthMs} ms`);
  if (s.id.startsWith("ui_") && s.lengthMs <= X.bank.ui_min_length_ms) errors.push(`ui sound of ${s.lengthMs} ms`);
  const missing = needsEras.filter((e) => !(s.eras ?? []).includes(e));
  if (missing.length) errors.push(`lacks era variants ${missing.join(", ")}`);
  if (!s.partner) errors.push("no notification or animation named with it");
  return errors;
}

/** A sound as a 60 Hz tick program (AUD-059), from the written examples. */
export function tickProgram(id: keyof typeof X.sound_examples): { tickHz: number; voices: Record<string, { ticks: Record<string, unknown>[]; duty?: number; wave?: string }> } {
  const ex = X.sound_examples[id] as Record<string, unknown>;
  const voices: Record<string, { ticks: Record<string, unknown>[]; duty?: number; wave?: string }> = {};
  for (const v of X.bank.voices) if (ex[v]) voices[v] = ex[v] as { ticks: Record<string, unknown>[] };
  return { tickHz: X.bank.tick_hz, voices };
}

/** What a tick may set on each effect voice (AUD-057, AUD-059, AUD-060). */
export function tickControls(voice: string): string[] {
  if (voice === "S1") return ["pitch", "volume", "duty"];
  if (voice === "S2") return ["noise pitch", "volume", "noise mode"];
  if (voice === "S3") return ["pitch", "volume", "wavetable"];
  throw new Error(`${voice} is not an effect voice`);
}

/** S3 may take the triangle or any of the music's wavetables (AUD-060). */
export function s3MayUse(wave: string, musicWavetables: string[]): boolean {
  return wave === "triangle" || wave === "palette_lead" || musicWavetables.includes(wave);
}

// ---------------------------------------------------------------- the chip's sound (AUD-007, AUD-009, AUD-010)

/** A tuning table: cents per scale degree, stored per track (AUD-007). */
export type TuningTable = number[];

/** Frequency of a degree from its cents, with no 12-tone rounding. */
export function degreeHz(root: number, table: TuningTable, degree: number): number {
  const cents = table[degree - 1];
  if (cents === undefined) throw new Error(`no degree ${degree}`);
  return root * 2 ** (cents / 1200);
}

/** The 4-bit stepped triangle keeps its 16 levels (AUD-009). */
export function triangleLevel(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  return Math.min(C.triangle_steps - 1, Math.floor(Math.abs(p * 2 - 1) * C.triangle_steps));
}

/** Bass lines sit an octave above a console's (AUD-009). */
export const phoneBassOctave = (consoleOctave: number): number => consoleOctave + C.bass_octave_up;

/** The master and effects buses (AUD-010, AUD-061). */
export function buses(): { master: { lowpassHz: number }; music: { volume: number; lowpassHz: number; maxPan: number }; effects: { volume: number; lowpassHz: number; maxPan: number } } {
  const mix = config.music.mix;
  return {
    master: { lowpassHz: mix.master_lowpass_hz },
    music: { volume: X.buses.music, lowpassHz: mix.master_lowpass_hz, maxPan: mix.max_pan },
    effects: { volume: X.buses.effects, lowpassHz: X.bank.lowpass_hz, maxPan: X.bank.max_pan },
  };
}

/** Effects run on their own three voices beside the music's (AUD-057, AUD-058). */
export function voiceBanks(era: MusicEra): { music: string[]; effects: string[] } {
  return { music: [...C.music_voices, ...(voiceBudget(era).w2 ? [C.extra_voice] : [])], effects: [...C.effect_voices] };
}

/** Every catalogue sound is a chip program, nothing recorded (AUD-003). */
export function allSynthesized(): boolean {
  const ok = new Set([...C.effect_voices, "noise", "wave"]);
  return CATALOGUE.every((s) => s.voices.every((v) => ok.has(v)));
}

// ---------------------------------------------------------------- platform (AUD-104 … AUD-113)

export function synthPath(workletStarts: boolean): { path: "AudioWorklet"; lookaheadMs: number } | { path: "OscillatorNode"; parts: string[] } {
  return workletStarts ? { path: "AudioWorklet", lookaheadMs: C.lookahead_ms } : { path: "OscillatorNode", parts: ["PeriodicWave", "looping noise buffer"] };
}

const isPhone = (platform: string) => config.platform.phone_platforms.includes(platform);

/** The first sounds: the mobile splash is silent; desktop and Steam play `frame_logo`; "Tap to start" plays `frame_start` (AUD-107, AUD-108). */
export function coldStart(platform: string): { splash: string | null; tapToStart: string } {
  const p = config.platform.first_tap;
  return { splash: isPhone(platform) ? p.mobile.splash : p.desktop.splash, tapToStart: p.tap_to_start };
}

/** Interface sounds go straight to the worklet; map and battle sounds through the scheduler (AUD-113). */
export function soundPath(id: string): { path: "direct" | "scheduled"; latencyMs: number } {
  if (id.startsWith("ui_")) return { path: X.latency.ui_path as "direct", latencyMs: (C.audio_block_samples / C.sample_rate) * 1000 };
  return { path: X.latency.map_path as "scheduled", latencyMs: C.lookahead_ms };
}

export interface AppAudio {
  context: "running" | "suspended";
  away: string[];
}

export const newAppAudio = (): AppAudio => ({ context: "running", away: [] });

/** Background suspends the AudioContext (AUD-109). */
export function toBackground(a: AppAudio): void {
  a.context = "suspended";
}

/** A notification while away is kept and plays no sound on return (AUD-110). */
export function notifyWhileAway(a: AppAudio, id: string): boolean {
  if (a.context === "suspended") {
    a.away.push(id);
    return false;
  }
  return true;
}

/** Return: the context resumes with `load_resume`; notifications from while away stay silent. */
export function toForeground(a: AppAudio): { plays: string[]; silent: string[] } {
  a.context = "running";
  const silent = a.away;
  a.away = [];
  return { plays: ["load_resume"], silent };
}

/** Haptics: phones only, on by default, working with sound off (AUD-112). */
export function haptic(id: string, device: { phone: boolean; hapticsOn?: boolean }): string | null {
  if (!device.phone || device.hapticsOn === false) return null;
  return (X.haptics as Record<string, string>)[id] ?? null;
}

// ---------------------------------------------------------------- settings (AUD-114, AUD-115, AUD-118)

export interface AudioSettings {
  master: number;
  music: number;
  effects: number;
  ambience: number;
  musicOn: boolean;
  uiSounds: boolean;
  ambienceOn: boolean;
  haptics: boolean;
  mono: boolean;
  captions: "auto" | "on" | "off";
  reducedIntensity: boolean;
}

export function defaultSettings(): AudioSettings {
  const b = X.buses;
  return {
    master: b.master,
    music: b.music,
    effects: b.effects,
    ambience: b.ambience,
    musicOn: true,
    uiSounds: b.ui_sounds,
    ambienceOn: b.ambience_on,
    haptics: b.haptics,
    mono: b.mono,
    captions: b.captions as "auto",
    reducedIntensity: b.reduced_intensity,
  };
}

/** Captions are off by default and turn on by themselves when sound is off (AUD-118). */
export function captionsOn(s: AudioSettings): boolean {
  if (s.captions !== "auto") return s.captions === "on";
  const allOff = (!s.musicOn || s.music === 0) && s.effects === 0 && (!s.ambienceOn || s.ambience === 0);
  return s.master === 0 || allOff;
}

/** Music off suspends the synth's music fully (AUD-114). */
export const musicSuspended = (s: AudioSettings): boolean => !s.musicOn;

// ---------------------------------------------------------------- diagnostics (AUD-131)

export function diagnostics(d: Director, m: Mixer): { state: string; track: string | null; layers: number[]; why: string; effects: Mixer["log"] } {
  return { state: d.state, track: d.track, layers: d.layers, why: d.reason, effects: m.log.slice(-5) };
}

