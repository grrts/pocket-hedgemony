import config from "../../../../rules/data/domain/audio.json" with { type: "json" };
import type { Rng } from "../../rng.ts";

/**
 * Music (audio spec §4, music README §3–§5): eras, palettes, the track list
 * and the music director. Pure functions over plain data; the director runs on
 * the client's main thread from turn results and UI state and never feeds back
 * into the engine (AUD-036).
 */

export type AudioConfig = typeof config;
export const audioConfig: AudioConfig = config;
const M = config.music;

// ---------------------------------------------------------------- eras (AUD-014 … AUD-017)

export type MusicEra = "I" | "II" | "III" | "IV" | "V";
export const MUSIC_ERAS = M.eras.bands.map((b) => b.id) as MusicEra[];

export interface Ymd {
  year: number;
  month: number;
  day?: number;
}

export function parseIso(date: string): Ymd {
  const [y, m, d] = date.split("-").map(Number);
  return { year: y!, month: m ?? 1, day: d ?? 1 };
}

const ymdKey = (d: Ymd) => d.year * 10000 + d.month * 100 + (d.day ?? 1);

/** Era bands may come from a patched config (AUD-015). */
export interface EraBands {
  bands: { id: string; from: number; extra_voice?: string }[];
  campaign_end: string;
  basis?: string;
}

/**
 * The music era of a date (AUD-014). The basis is the calendar; the
 * technology basis stays in config, off (AUD-016), so `techEra` is only read
 * when the config says "technology". After the campaign end there is no era.
 */
export function musicEra(date: Ymd | string, opts: { bands?: EraBands; techEra?: MusicEra } = {}): MusicEra | null {
  const d = typeof date === "string" ? parseIso(date) : date;
  const eras = opts.bands ?? M.eras;
  if (ymdKey(d) > ymdKey(parseIso(eras.campaign_end))) return null;
  if (eras.basis === "technology" && opts.techEra) return opts.techEra;
  let era: string | null = null;
  for (const b of eras.bands) if (d.year >= b.from) era = b.id;
  return era as MusicEra | null;
}

export const eraIndex = (e: MusicEra): number => MUSIC_ERAS.indexOf(e);

/** Music voices allowed at once (AUD-004, AUD-005): five, six with W2 from Era V. */
export function voiceBudget(era: MusicEra): { voices: number; w2: boolean } {
  const band = M.eras.bands.find((b) => b.id === era)!;
  const w2 = "extra_voice" in band && band.extra_voice === config.chip.extra_voice;
  return { voices: config.chip.music_voices.length + (w2 ? 1 : 0), w2 };
}

/** The age stinger id for an age; none for ages after the campaign end (AUD-017, AUD-033). */
export function ageStinger(ageId: string): string | null {
  if (M.eras.ages_after_campaign.includes(ageId)) return null;
  const ages = Object.values(M.eras.ages_opening).flat();
  return ages.includes(ageId) ? `age_${ageId}` : null;
}

// ---------------------------------------------------------------- palettes (AUD-018 … AUD-021)

export type Palette = keyof typeof M.palettes;
export const PALETTES = Object.keys(M.palettes) as Palette[];

/**
 * The palette of a primary culture group (AUD-018); turkic splits by the
 * capital's longitude (AUD-019). Colonial blends are not designed (OQ-AUD-11).
 */
export function paletteOf(group: string, capitalLongitude?: number): Palette | null {
  const split = (M.palette_split as Record<string, { west_of_longitude: number; west: string; otherwise: string }>)[group];
  if (split) {
    if (capitalLongitude === undefined) return null;
    return (capitalLongitude < split.west_of_longitude ? split.west : split.otherwise) as Palette;
  }
  for (const p of PALETTES) if ((M.palettes[p] as string[]).includes(group)) return p;
  return null;
}

// ---------------------------------------------------------------- track list (AUD-022 … AUD-035)

export type TrackKind = "loop" | "stinger";
export interface Track {
  id: string;
  kind: TrackKind;
  family: "interface" | "peace" | "era_theme" | "situation" | "war" | "stinger";
  /** Peace tracks: the eras they are written for; other eras use arrangement variants. */
  writtenFor?: MusicEra[];
  layers?: number;
  palette?: Palette;
}

export function peaceTrackId(palette: Palette, era: MusicEra): string {
  const half = (M.peace_variants.early as string[]).includes(era) ? "early" : "late";
  return `peace_${(M.peace_track_names as Record<Palette, string>)[palette]}_${half}`;
}

/** The first-release track list: 47 loops and 21 stingers (AUD-035). */
export function trackList(): Track[] {
  const t: Track[] = [];
  const layers = config.tracks.layers as Record<string, number>;
  const withLayers = (x: Track): Track => (layers[x.id] ? { ...x, layers: layers[x.id]! } : x);
  for (const id of config.tracks.interface) t.push({ id, kind: "loop", family: "interface" });
  for (const p of PALETTES)
    for (const half of ["early", "late"] as const)
      t.push({ id: `peace_${(M.peace_track_names as Record<Palette, string>)[p]}_${half}`, kind: "loop", family: "peace", palette: p, writtenFor: M.peace_variants[half] as MusicEra[] });
  for (const id of config.tracks.era_themes) t.push({ id, kind: "loop", family: "era_theme" });
  for (const id of config.tracks.situations) t.push(withLayers({ id, kind: "loop", family: "situation" }));
  for (const id of config.tracks.war) t.push(withLayers({ id, kind: "loop", family: "war" }));
  for (const age of Object.values(M.eras.ages_opening).flat()) t.push({ id: `age_${age}`, kind: "stinger", family: "stinger" });
  for (const id of config.tracks.stingers) t.push({ id, kind: "stinger", family: "stinger" });
  return t;
}

/** A palette peace track picked in an era, with the era arrangement it plays in (AUD-026, AUD-052). */
export function peaceTrack(palette: Palette, era: MusicEra): { track: string; variant: MusicEra } {
  return { track: peaceTrackId(palette, era), variant: era };
}

/** The era theme, the same for every nation (AUD-027). */
export const eraTheme = (era: MusicEra): string => `era_${eraIndex(era) + 1}`;

/** War percussion by era; the lead follows the palette (AUD-032). */
export const warPercussion = (era: MusicEra): string => (M.war_percussion as Record<MusicEra, string>)[era];

/** What the screen list says the music does on a screen (AUD-023, AUD-039). */
export function screenMusic(screen: string): string {
  const v = (config.screens as Record<string, string>)[screen];
  if (!v) throw new Error(`screen not in the screen list: ${screen}`);
  return v;
}

/** `nation_select` keeps its notes and swaps the W wavetable and tuning to the highlighted nation's palette (AUD-024). */
export function nationSelectVoicing(palette: Palette): { notes: "same"; wavetable: Palette; tuning: Palette } {
  return { notes: "same", wavetable: palette, tuning: palette };
}

/** Coming back to the app: `load_resume`'s 6 s intro, then the normal pick (AUD-025). */
export function resumeMusic(): { track: string; introSeconds: number; then: "normal pick" } {
  return { track: "load_resume", introSeconds: M.lengths.load_resume_intro_seconds, then: "normal pick" };
}

// ---------------------------------------------------------------- the director's inputs (AUD-037)

export interface MusicFacts {
  era: MusicEra;
  screen?: string;
  realmBookTab?: string;
  atWar?: boolean;
  warScore?: number;
  capitalOccupied?: boolean;
  greatPowersAtWarShare?: number;
  navalBattleShareLast5?: number;
  siegeActive?: boolean;
  fieldBattlesLast3?: number;
  turnsSinceDeclaration?: number;
  battlesFought?: number;
  /** Periods with music tags, e.g. { tag: "revolution", touchesPlayer: true }. */
  periods?: { tag: string; touchesPlayer: boolean }[];
  /** Tags of active event chains (`crisis` for disaster, plague, famine, succession). */
  eventChains?: string[];
  unrestProvinceShare?: number;
  stability?: number;
  treasuryTrend?: "rising" | "steady" | "falling";
  yearsAtPeace?: number;
  explorersActive?: boolean;
  cameraOver?: string;
  /** Layer inputs. */
  armyNearEnemy?: number;
  battleThisTurn?: boolean;
  rebelsInField?: boolean;
}

export type MusicState = string;

const S = M.states;
const eraAtLeast = (e: MusicEra, min: string) => eraIndex(e) >= eraIndex(min as MusicEra);

/** Does a state's threshold hold (AUD-040)? */
export function stateHolds(state: MusicState, f: MusicFacts, states = S): boolean {
  const war = !!f.atWar;
  switch (state) {
    case "war_losing":
      return war && ((f.warScore !== undefined && f.warScore < states.war_losing.war_score_below) || (states.war_losing.or_capital_occupied && !!f.capitalOccupied));
    case "world_war":
      return war && (f.greatPowersAtWarShare ?? 0) >= states.world_war.great_powers_at_war_share && eraAtLeast(f.era, states.world_war.min_era);
    case "war_naval":
      return war && (f.navalBattleShareLast5 ?? 0) >= states.war_naval.naval_battle_share_last_5_turns;
    case "war_siege":
      return war && !!f.siegeActive === states.war_siege.siege_active && (f.fieldBattlesLast3 ?? 0) <= states.war_siege.field_battles_last_3_turns;
    case "war_mobilize":
      return war && (f.turnsSinceDeclaration ?? Infinity) <= states.war_mobilize.turns_since_declaration_max && (f.battlesFought ?? 0) <= states.war_mobilize.battles_fought;
    case "war_campaign":
      // The main war theme: at war once mobilizing is over.
      return war && !stateHolds("war_mobilize", f, states);
    case "revolution":
      return (f.periods ?? []).some((p) => p.tag === states.revolution.period_tag && p.touchesPlayer === states.revolution.touches_player) && eraAtLeast(f.era, states.revolution.min_era);
    case "crisis":
      return (f.eventChains ?? []).includes(states.crisis.event_chain_tag);
    case "unrest":
      return (f.unrestProvinceShare ?? 0) >= states.unrest.unrest_province_share || (f.stability !== undefined && f.stability < states.unrest.or_stability_below);
    case "diplomacy":
      return f.screen === "realm_book" && f.realmBookTab === "Abroad";
    case "prosperity":
      return !war && (f.stability ?? -Infinity) >= states.prosperity.stability_at_least && f.treasuryTrend === states.prosperity.treasury_trend && (f.yearsAtPeace ?? 0) >= states.prosperity.years_at_peace;
    case "exploration":
      return !!f.explorersActive === states.exploration.explorers_active && f.cameraOver === states.exploration.camera_over;
    case "peace":
      return true;
  }
  return false;
}

/** The level of a state in the priority stack (0 = screen rules, highest). */
export function stackLevel(state: MusicState): number {
  const i = M.stack.findIndex((level) => level.includes(state));
  return i < 0 ? 0 : i;
}

/**
 * The one music state: the highest rule of the priority stack that holds
 * (AUD-038). Screens marked "unchanged" keep the current state (AUD-039).
 */
export function evaluateState(f: MusicFacts, current: MusicState = "peace"): { state: MusicState; reason: string } {
  if (f.screen) {
    const rule = screenMusic(f.screen);
    // The realm book keeps the state, except its Abroad tab, which is a screen mood (stack level 5).
    const mood = f.screen === "realm_book" && stateHolds("diplomacy", f);
    if (rule === "unchanged" && !mood) return { state: current, reason: `screen ${f.screen} keeps the state` };
    if (rule === "none") return { state: "none", reason: `screen ${f.screen} has no music` };
    if (rule === "war") return { state: activeWarState(f) ?? "war_campaign", reason: "battle screen plays the war tracks" };
    if (rule !== "game" && !mood) return { state: rule, reason: `screen ${f.screen}` };
  }
  for (const level of M.stack.slice(1)) for (const s of level) if (stateHolds(s, f)) return { state: s, reason: `${s} holds` };
  return { state: "peace", reason: "peace rotation" };
}

function activeWarState(f: MusicFacts): MusicState | null {
  for (const s of M.stack[2]!) if (stateHolds(s, f)) return s;
  return null;
}

/** Layers of a layered track (AUD-029, AUD-031, AUD-056). */
export function layersFor(track: string, f: MusicFacts, view: { zoomMix?: boolean; zoom?: Zoom; overBattleProvince?: boolean } = {}): number[] {
  if (track === "unrest") return f.rebelsInField ? [1, 2] : [1];
  if (track !== "war_campaign") return [1];
  const w = M.war_layers.war_campaign;
  const near = f.armyNearEnemy !== undefined && f.armyNearEnemy <= w.layer2_when.player_army_within_provinces_of_enemy;
  const layers = [1];
  if (near) layers.push(2);
  const forced = !!view.zoomMix && M.zoom_mix.local.battle_province_forces_layer3 && view.zoom === "local" && !!view.overBattleProvince && !!f.atWar;
  if ((near && f.battleThisTurn === w.layer3_when.battle_this_turn) || forced) layers.push(3);
  return layers;
}

// ---------------------------------------------------------------- transitions (AUD-041 … AUD-047)

export interface Transition {
  boundary: "bar" | "phrase";
  maxWaitBars?: number;
  crossfadeBars: number;
  direction: "up" | "down" | "same";
}

/** Where a change waits: war and crisis at the next bar line, peace at the next phrase end (AUD-043). */
export function transitionTo(from: MusicState, to: MusicState): Transition {
  const t = M.transitions;
  const dir = from === to ? "same" : stackLevel(to) < stackLevel(from) ? "up" : "down";
  const boundary = to === "peace" ? "phrase" : "bar";
  return boundary === "phrase"
    ? { boundary, maxWaitBars: t.max_phrase_wait_bars, crossfadeBars: t.crossfade_bars, direction: dir }
    : { boundary, crossfadeBars: t.crossfade_bars, direction: dir };
}

export type Zoom = "world" | "regional" | "local";

export interface Director {
  state: MusicState;
  track: string | null;
  layers: number[];
  /** Seconds since the session started at which the state was entered. */
  enteredAt: number;
  reason: string;
  palette: Palette;
  era: MusicEra;
  lastTracks: string[];
  /** A change decided but held back by the minimum time in state. */
  pending?: { state: MusicState; reason: string };
  /** Music bus ducking right now, in dB. */
  duckDb: number;
  /** Camera dwell for "you hear where you look". */
  camera?: { palette: Palette; zoom: Zoom; seconds: number };
  /** Palette asked for by a culture change; applies at the next track (AUD-021). */
  nextPalette?: Palette;
}

export type Cue =
  | { kind: "stinger"; id: string; palette?: Palette; duckDb?: number; form?: "sombre" }
  | { kind: "silence"; seconds: number }
  | { kind: "track"; id: string; from: "intro" | "next bar"; variant?: MusicEra; loops?: number; full?: boolean };

export function newDirector(palette: Palette, era: MusicEra, state: MusicState = "peace", now = 0): Director {
  return { state, track: null, layers: [1], enteredAt: now, reason: "start", palette, era, lastTracks: [], duckDb: 0 };
}

export type Trigger = "turn_end" | "screen_change" | "mid_turn";

/** The stinger for a war or crisis that ends (AUD-045). */
export interface Ending {
  peace?: "gain" | "loss";
}

/**
 * The director decides only at turn end or on a screen change (AUD-042);
 * holds a state at least 45 s (AUD-044); going down plays the stinger, then
 * 3–6 s of silence, then the new state from its intro (AUD-045); going up cuts
 * in at the next bar (AUD-046).
 */
export function decide(d: Director, trigger: Trigger, f: MusicFacts, now: number, rng: Rng, ending: Ending = {}): Cue[] {
  if (trigger === "mid_turn") return [];
  const cues: Cue[] = [];
  const target = evaluateState(f, d.state);
  const wasWar = stackLevel(d.state) <= 2 && d.state.startsWith("war");
  if (wasWar && !f.atWar && ending.peace) cues.push({ kind: "stinger", id: ending.peace === "gain" ? "war_won" : "war_lost" });
  if (target.state === d.state) {
    delete d.pending;
    return cues;
  }
  if (now - d.enteredAt < M.transitions.min_seconds_in_state) {
    d.pending = target;
    return cues;
  }
  return [...cues, ...enter(d, target.state, target.reason, now, rng, cues.length > 0)];
}

/** Applies a held-back change once the minimum time in state has passed. */
export function tick(d: Director, now: number, rng: Rng): Cue[] {
  if (!d.pending || now - d.enteredAt < M.transitions.min_seconds_in_state) return [];
  const p = d.pending;
  delete d.pending;
  return enter(d, p.state, p.reason, now, rng, false);
}

function enter(d: Director, state: MusicState, reason: string, now: number, rng: Rng, stingerPlayed: boolean): Cue[] {
  const tr = transitionTo(d.state, state);
  const cues: Cue[] = [];
  if (tr.direction === "down") {
    const [lo, hi] = M.transitions.silence_after_stinger_seconds as [number, number];
    if (stingerPlayed) cues.push({ kind: "silence", seconds: lo + rng.next() * (hi - lo) });
    cues.push({ kind: "track", id: trackOfState(state, d), from: "intro" });
  } else {
    cues.push({ kind: "track", id: trackOfState(state, d), from: "next bar" });
  }
  d.state = state;
  d.reason = reason;
  d.enteredAt = now;
  d.track = cues[cues.length - 1]!.kind === "track" ? (cues[cues.length - 1] as { id: string }).id : d.track;
  return cues;
}

function trackOfState(state: MusicState, d: Director): string {
  if (state === "peace") return peaceTrackId(d.palette, d.era);
  if (state === "prosperity") return "prosperity";
  return state;
}

/** A stinger over the music ducks it by 6 dB; it is never a state (AUD-041). */
export function playStinger(d: Director, id: string, palette?: Palette): Cue {
  d.duckDb = M.transitions.stinger_duck_db;
  return palette ? { kind: "stinger", id, palette, duckDb: d.duckDb } : { kind: "stinger", id, duckDb: d.duckDb };
}

export function stingerEnded(d: Director): void {
  d.duckDb = 0;
}

/** An event popup plays its stinger and ducks the music, without changing state (AUD-047, AUD-102, AUD-125). */
export function eventOpened(d: Director, e: { music?: string; narrativeOnly?: boolean }): Cue | null {
  if (e.narrativeOnly) return { ...(playStinger(d, "event_major") as Extract<Cue, { kind: "stinger" }>), form: "sombre" };
  if (!e.music) return null;
  if (e.music === "crisis" || e.music === "revolution") return null;
  return playStinger(d, e.music);
}

/** What an event's `music:` tag means (AUD-102): a stinger, or a chain tag the state rules count. */
export function musicTag(tag: string): { stinger?: string; chain?: string } {
  if (tag === "crisis" || tag === "revolution") return { chain: tag };
  return { stinger: tag };
}

// ---------------------------------------------------------------- peace rotation (AUD-048 … AUD-054)

export type Source = "own_palette" | "era_theme" | "camera_palette" | "neighbour_palette";

export interface RotationContext {
  variety?: "own_palette" | "all_palettes";
  neighbours?: Palette[];
  /** Rotation config, patched without code (AUD-101). */
  rotation?: typeof M.rotation;
}

/** "You hear where you look": camera dwell counts only at regional zoom or closer (AUD-048, AUD-049). */
export function lookAt(d: Director, palette: Palette, zoom: Zoom, seconds: number): void {
  if (d.camera && d.camera.palette === palette && d.camera.zoom === zoom) d.camera.seconds += seconds;
  else d.camera = { palette, zoom, seconds };
}

const zoomRank = (z: Zoom) => ["world", "regional", "local"].indexOf(z);

/** The candidate sources of the next peace pick with their weights. */
export function peaceSources(d: Director, ctx: RotationContext = {}): { source: Source; track: string; weight: number }[] {
  const rot = ctx.rotation ?? M.rotation;
  const palette = d.nextPalette ?? d.palette;
  const out: { source: Source; track: string; weight: number }[] = [];
  out.push({ source: "own_palette", track: peaceTrackId(palette, d.era), weight: rot.weights.own_palette });
  if (ctx.variety === "own_palette") return out;
  out.push({ source: "era_theme", track: eraTheme(d.era), weight: rot.weights.era_theme });
  const cam = d.camera;
  if (cam && cam.seconds >= rot.camera_dwell_seconds && zoomRank(cam.zoom) >= zoomRank(rot.camera_min_zoom as Zoom) && cam.palette !== palette)
    out.push({ source: "camera_palette", track: peaceTrackId(cam.palette, d.era), weight: rot.weights.camera_palette });
  const n = (ctx.neighbours ?? []).find((p) => p !== palette);
  if (n) out.push({ source: "neighbour_palette", track: peaceTrackId(n, d.era), weight: rot.weights.neighbour_palette });
  return out;
}

/**
 * Picks the next peace track: never one of the last three (AUD-050), its era
 * variant chosen as it starts (AUD-052), 1–2 loops then 10–40 s of silence
 * (AUD-051). An era change first plays the age stinger, then the era theme in
 * full (AUD-053). A culture change applies here, never mid-track (AUD-021).
 */
export function nextPeaceTrack(d: Director, era: MusicEra, rng: Rng, ctx: RotationContext & { ageStinger?: string } = {}): Cue[] {
  const rot = ctx.rotation ?? M.rotation;
  if (d.nextPalette) {
    d.palette = d.nextPalette;
    delete d.nextPalette;
  }
  if (era !== d.era) {
    d.era = era;
    if (rot.era_change_plays_theme) {
      const theme = eraTheme(era);
      remember(d, theme, rot.no_repeat_last);
      d.track = theme;
      const cues: Cue[] = [];
      if (ctx.ageStinger) cues.push({ kind: "stinger", id: ctx.ageStinger });
      cues.push({ kind: "track", id: theme, from: "intro", variant: era, full: true });
      return cues;
    }
  }
  const recent = d.lastTracks.slice(-rot.no_repeat_last);
  const options = peaceSources(d, ctx).filter((o) => !recent.includes(o.track));
  if (!options.length) throw new Error("no peace track left outside the last three");
  const total = options.reduce((a, o) => a + o.weight, 0);
  let r = rng.next() * total;
  let pick = options[options.length - 1]!;
  for (const o of options) {
    if (r < o.weight) {
      pick = o;
      break;
    }
    r -= o.weight;
  }
  const [l0, l1] = rot.loops_per_track as [number, number];
  const [s0, s1] = rot.silence_between_seconds as [number, number];
  const loops = l0 + rng.int(l1 - l0 + 1);
  const silence = s0 + rng.next() * (s1 - s0);
  remember(d, pick.track, rot.no_repeat_last);
  d.track = pick.track;
  return [
    { kind: "track", id: pick.track, from: "intro", variant: era, loops },
    { kind: "silence", seconds: silence },
  ];
}

function remember(d: Director, track: string, keep: number): void {
  d.lastTracks.push(track);
  if (d.lastTracks.length > keep) d.lastTracks.splice(0, d.lastTracks.length - keep);
}

/** A change of primary culture: the current track plays on, the next comes from the new palette (AUD-021). */
export function cultureChanged(d: Director, group: string, capitalLongitude?: number): void {
  const p = paletteOf(group, capitalLongitude);
  if (p) d.nextPalette = p;
}

// ---------------------------------------------------------------- zoom mix (AUD-055, AUD-056)

export function zoomMix(on: boolean, zoom: Zoom): { percussionDb: number; leadDb: number } {
  if (!on || !M.zoom_mix.enabled || zoom !== "local") return { percussionDb: 0, leadDb: 0 };
  return { percussionDb: M.zoom_mix.local.percussion_db, leadDb: M.zoom_mix.local.lead_db };
}

// ---------------------------------------------------------------- the war declaration stinger (AUD-034)

/** `war_declared` plays in the attacker's palette when a rival declares on the player. */
export function warDeclaredStinger(playerPalette: Palette, attackerPalette: Palette | null): { id: string; palette: Palette } {
  return { id: "war_declared", palette: attackerPalette ?? playerPalette };
}

// ---------------------------------------------------------------- moment ownership (AUD-071, AUD-090)

export type Moment = keyof typeof config.moments;

/** Who owns a moment: the music's stinger and the effects that lead into it. */
export function momentAudio(
  moment: Moment,
  o: { won?: boolean; gain?: boolean; died?: boolean; ageId?: string; onScreen?: boolean; tone?: "good" | "bad" | "major" } = {},
): { music: string | null; effects: string[]; effectsFirst: boolean } {
  const m = config.moments[moment] as { music: string; effects: string[]; effects_before_music?: boolean; effects_if_died?: string[]; effects_when_on_screen?: string[] };
  let music: string | null = m.music;
  if (moment === "battle_result") music = o.won ? "battle_won" : "battle_lost";
  if (moment === "peace_signed") music = o.gain ? "war_won" : "war_lost";
  if (moment === "age_begins") music = o.ageId ? ageStinger(o.ageId) : "age_<id>";
  if (moment === "event_popup") music = `event_${o.tone ?? "major"}`;
  let effects = [...m.effects];
  if (o.died && m.effects_if_died) effects = [...m.effects_if_died, ...effects];
  if (o.onScreen && m.effects_when_on_screen) effects = [...effects, ...m.effects_when_on_screen];
  return { music, effects, effectsFirst: !!m.effects_before_music || (!!o.died && !!m.effects_if_died) };
}
