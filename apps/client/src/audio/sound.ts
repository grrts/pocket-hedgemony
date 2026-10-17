import { Rng } from "@ph/engine";
import { decide, defaultSettings, evaluateState, layersFor, newDirector, peaceTrackId, playStinger, stingerEnded, tick, type AudioSettings, type Cue, type Director, type Ending, type MusicFacts, type Palette } from "@ph/engine/domain/audio";
import { SR } from "./chip.ts";
import { PALETTE_VOICES, renderTrack, TRACKS, writtenTrack, type Rendered } from "./tracks.ts";
import { hasSound, renderSound } from "./sfx.ts";

/**
 * The game's sound: the music director (domain/audio, AUD-036 on) choosing
 * what plays, the chip's tracks and effects synthesized in the page, and the
 * player's sound settings kept on this device (settings: Device group).
 * Audio starts on the first tap (AUD-107) and goes quiet while the game is
 * hidden (AUD-109).
 */

export type SoundSettings = Pick<AudioSettings, "master" | "music" | "effects" | "musicOn" | "uiSounds">;

const STORE = "ph-sound";

function loadSettings(): SoundSettings {
  const d = defaultSettings();
  const base: SoundSettings = { master: d.master, music: d.music, effects: d.effects, musicOn: d.musicOn, uiSounds: d.uiSounds };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<SoundSettings> | null;
    return saved ? { ...base, ...saved } : base;
  } catch {
    return base;
  }
}

interface Playing {
  key: string;
  start: number;
  rendered: Rendered;
  out: GainNode;
  layers: GainNode[];
  sources: AudioBufferSourceNode[];
}

/** Effects of the interface (tapped panels), silenced by the Interface sounds switch (SET-052). */
const UI_SOUND = /^ui_/;

export class Sound {
  settings = loadSettings();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private duck!: GainNode;
  private fxGain!: GainNode;
  private cache = new Map<string, Promise<Rendered>>();
  private playing: Playing | null = null;
  private director: Director | null = null;
  private facts: MusicFacts | null = null;
  /** What should be heard: the title before a game, else the director's track. */
  private wanted: string | null = null;
  private palette: Palette = "europe_west";
  private token = 0;
  private rng = new Rng(1444);
  private lastPlayed = new Map<string, number>();
  private stingerUntil = 0;
  private started = performance.now();
  /** Called when what is playing changes, for the Sound menu. */
  onChange: () => void = () => {};

  constructor() {
    const unlock = () => this.unlock();
    // The first tap or key starts audio (browsers allow it only from a gesture).
    for (const e of ["pointerdown", "keydown", "touchend"]) addEventListener(e, unlock, { capture: true, passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
    setInterval(() => this.heartbeat(), 1000);
  }

  private now(): number {
    return (performance.now() - this.started) / 1000;
  }

  private unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended" && !document.hidden) void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx({ latencyHint: "interactive" }));
    this.master = ctx.createGain();
    this.musicGain = ctx.createGain();
    this.duck = ctx.createGain();
    this.fxGain = ctx.createGain();
    this.duck.connect(this.musicGain).connect(this.master);
    this.fxGain.connect(this.master);
    this.master.connect(ctx.destination);
    this.applyVolumes();
    void ctx.resume();
    if (this.wanted) void this.play(this.wanted, "intro");
  }

  /** True once the browser lets the game make sound. */
  get running(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  set(change: Partial<SoundSettings>): void {
    const wasOn = this.settings.musicOn;
    this.settings = { ...this.settings, ...change };
    try {
      localStorage.setItem(STORE, JSON.stringify(this.settings));
    } catch {
      // Private windows may refuse storage; the settings still hold for this visit.
    }
    this.applyVolumes();
    if (wasOn !== this.settings.musicOn) {
      // Music off stops the music entirely (AUD-114); on again picks up what the director wants.
      if (!this.settings.musicOn) this.stopMusic(0.5);
      else if (this.wanted) void this.play(this.wanted, "intro");
    }
    this.onChange();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.settings;
    this.master.gain.setTargetAtTime(s.master, t, 0.05);
    this.musicGain.gain.setTargetAtTime(s.musicOn ? s.music : 0, t, 0.05);
    this.fxGain.gain.setTargetAtTime(s.effects, t, 0.05);
  }

  // ---------------------------------------------------------------- music

  /** The title screens: the title theme (music-design §4.1). */
  title(): void {
    this.director = null;
    this.wanted = "title";
    void this.play("title", "intro");
  }

  /** A campaign starts: the director takes over from the state the world is in. */
  startGame(palette: Palette, facts: MusicFacts): void {
    this.palette = palette;
    this.facts = facts;
    const target = evaluateState(facts);
    this.director = newDirector(palette, facts.era, target.state, this.now());
    this.director.reason = target.reason;
    const id = target.state === "peace" ? peaceTrackId(palette, facts.era) : target.state;
    this.director.track = id;
    this.wanted = id;
    void this.play(id, "intro");
    this.onChange();
  }

  /** The director decides at the end of a turn (AUD-042), or after an order that changed the war. */
  turnEnded(facts: MusicFacts, ending: Ending = {}): void {
    if (!this.director) return;
    this.facts = facts;
    this.director.era = facts.era;
    this.run(decide(this.director, "turn_end", facts, this.now(), this.rng, ending));
    this.updateLayers();
    this.onChange();
  }

  /** A stinger over the music (music-design §4.4): it ducks the track and is never a state. */
  stinger(id: string): void {
    if (!this.director || !TRACKS[id]) return;
    this.run([playStinger(this.director, id)]);
  }

  private heartbeat(): void {
    if (!this.director) return;
    const cues = tick(this.director, this.now(), this.rng);
    if (cues.length) {
      this.run(cues);
      this.onChange();
    }
  }

  private run(cues: Cue[]): void {
    let silence = 0;
    for (const c of cues) {
      if (c.kind === "silence") silence = c.seconds;
      else if (c.kind === "stinger") void this.playStingerTrack(c.id);
      else {
        this.wanted = c.id;
        void this.play(c.id, c.from, silence);
      }
    }
  }

  private updateLayers(): void {
    const p = this.playing;
    if (!p || !this.ctx || !this.director || !this.facts) return;
    const want = layersFor(this.director.track ?? "", this.facts);
    this.director.layers = want;
    const t = this.ctx.currentTime;
    // Layers come and go over a bar (music.yaml war_layers.layer_fade_bars).
    p.layers.forEach((g, i) => g.gain.setTargetAtTime(i === 0 || want.includes(i + 1) ? 1 : 0, t, p.rendered.barSeconds / 3));
  }

  private keyOf(id: string): string | null {
    const written = writtenTrack(id);
    if (!written) return null;
    return TRACKS[written]!.mode ? written : `${written}@${this.palette}`;
  }

  private rendered(key: string): Promise<Rendered> {
    let hit = this.cache.get(key);
    if (!hit) {
      const [written, palette] = key.split("@");
      hit = renderTrack(written!, (palette ?? this.palette) as Palette);
      this.cache.set(key, hit);
    }
    return hit;
  }

  /** Starts a track, on the next bar line of the one playing or after a silence from its start (AUD-043, AUD-045, AUD-046). */
  private async play(id: string, from: "intro" | "next bar", silence = 0): Promise<void> {
    const key = this.keyOf(id);
    if (!key || !this.ctx || !this.settings.musicOn) return;
    if (this.playing?.key === key) return this.updateLayers();
    const token = ++this.token;
    const rendered = await this.rendered(key);
    const ctx = this.ctx;
    if (token !== this.token || !this.settings.musicOn) return;
    const now = ctx.currentTime;
    const old = this.playing;
    let when = now + 0.08 + silence;
    let fade = 0.02;
    if (old && from === "next bar") {
      const bar = old.rendered.barSeconds;
      when = Math.max(now + 0.08, old.start + Math.ceil((now + 0.08 - old.start) / bar) * bar);
      fade = rendered.barSeconds;
    }
    if (old) {
      const end = from === "next bar" ? when + fade : now + 1.5;
      old.out.gain.setValueAtTime(old.out.gain.value, from === "next bar" ? when : now);
      old.out.gain.linearRampToValueAtTime(0, end);
      old.sources.forEach((s) => s.stop(end + 0.05));
    }
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.setValueAtTime(0, when);
    out.gain.linearRampToValueAtTime(1, when + fade);
    out.connect(this.duck);
    const want = this.director && this.facts ? layersFor(this.director.track ?? "", this.facts) : [1];
    const layers: GainNode[] = [];
    const sources: AudioBufferSourceNode[] = [];
    rendered.layers.forEach(([L, R], i) => {
      const buf = ctx.createBuffer(2, L.length, SR);
      buf.copyToChannel(L as Float32Array<ArrayBuffer>, 0);
      buf.copyToChannel(R as Float32Array<ArrayBuffer>, 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = i === 0 || want.includes(i + 1) ? 1 : 0;
      src.connect(g).connect(out);
      src.start(when);
      layers.push(g);
      sources.push(src);
    });
    this.playing = { key, start: when, rendered, out, layers, sources };
    this.onChange();
    // Have the war tracks ready before they are needed.
    this.warmUp();
  }

  private stopMusic(fade: number): void {
    const p = this.playing;
    if (!p || !this.ctx) return;
    const t = this.ctx.currentTime;
    p.out.gain.setTargetAtTime(0, t, fade / 3);
    p.sources.forEach((s) => s.stop(t + fade + 0.1));
    this.playing = null;
    this.token++;
  }

  private async playStingerTrack(id: string): Promise<void> {
    if (!this.ctx || !this.settings.musicOn || !TRACKS[id]) return;
    const r = await this.rendered(id);
    const ctx = this.ctx;
    const [L, R] = r.layers[0]!;
    const buf = ctx.createBuffer(2, L.length, SR);
    buf.copyToChannel(L as Float32Array<ArrayBuffer>, 0);
    buf.copyToChannel(R as Float32Array<ArrayBuffer>, 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.musicGain);
    const t = ctx.currentTime + 0.03;
    src.start(t);
    // The track dips 6 dB under the stinger (AUD-041).
    this.duck.gain.setTargetAtTime(0.5, t, 0.05);
    this.duck.gain.setTargetAtTime(1, t + buf.duration, 0.4);
    this.stingerUntil = t + buf.duration;
    src.onended = () => this.director && stingerEnded(this.director);
  }

  private warmed = false;
  /** Synthesizes the war tracks and stingers in the background, one at a time. */
  private warmUp(): void {
    if (this.warmed || !this.director) return;
    this.warmed = true;
    const ids = ["war_declared", "battle_won", "battle_lost", "war_mobilize", "war_campaign", "war_siege", "war_won", "war_lost", "war_losing", "unrest", "prosperity", "crisis", "peace_late"];
    void ids.reduce<Promise<unknown>>((p, id) => p.then(() => new Promise((r) => setTimeout(r, 400))).then(() => this.rendered(this.keyOf(id)!)), Promise.resolve());
  }

  /** What plays now, for the Sound menu: the track's name and why the director chose it. */
  nowPlaying(): { name: string; why: string } | null {
    if (!this.settings.musicOn) return null;
    const id = this.wanted;
    if (!id) return null;
    const written = writtenTrack(id);
    if (!written) return null;
    const def = TRACKS[written]!;
    const name = def.mode ? def.name : `${def.name} of ${PALETTE_VOICES[this.palette].name}`;
    return { name, why: this.director ? whyText(this.director.state) : "The title theme" };
  }

  // ---------------------------------------------------------------- effects

  /** Plays an effect now (AUD-113: interface sounds start at once). */
  sfx(id: string, volume = 1): void {
    if (!this.ctx || this.ctx.state !== "running" || !hasSound(id)) return;
    if (UI_SOUND.test(id) && !this.settings.uiSounds) return;
    const t = this.ctx.currentTime;
    // The same sound again within 80 ms would only smear (sound-effects §7).
    if (t - (this.lastPlayed.get(id) ?? -1) < 0.08) return;
    this.lastPlayed.set(id, t);
    const data = renderSound(id);
    const buf = this.ctx.createBuffer(1, data.length, SR);
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    // Under a stinger, effects step back 4 dB (AUD-091).
    g.gain.value = volume * (t < this.stingerUntil ? 0.63 : 1);
    src.connect(g).connect(this.fxGain);
    src.start(t);
  }
}

const WHY: Record<string, string> = {
  peace: "Your realm is at peace",
  prosperity: "Loyal lords, a growing treasury and years of peace",
  war_mobilize: "War has been declared: the armies gather",
  war_campaign: "Your realm is at war",
  war_siege: "A siege is under way and the field is quiet",
  war_losing: "The war goes badly: your capital is in enemy hands",
  war_naval: "Your realm is at war at sea",
  world_war: "The great powers are at war",
  unrest: "Provinces of yours are plotting a rising",
  crisis: "Your realm is in crisis",
  diplomacy: "Talking abroad",
};
const whyText = (state: string) => WHY[state] ?? state.replace(/_/g, " ");

export const sound = new Sound();
