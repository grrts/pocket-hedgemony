import {
  applyBatteryReport,
  autosaveInterval,
  batterySaverActive,
  battleStepSeconds,
  daySeconds,
  detectProfile,
  readSettings,
  saveSettings,
  setValue,
  resetRow,
  resetSection,
  valueOf,
  type BatteryReport,
  type SettingsState,
  type SettingsStore,
  type Value,
} from "@ph/engine/domain/settings";
import { sound } from "../audio/sound.ts";
import { detectRuntime } from "../platform.ts";

/**
 * The player's settings in the client (domain/settings): read from the two
 * small files in localStorage at launch, written on every change, applied at
 * once (SET-003). Settings never go into a save (SET-030).
 */

const store: SettingsStore = {
  read: (name) => {
    try {
      return localStorage.getItem(`ph.${name}`) ?? undefined;
    } catch {
      return undefined;
    }
  },
  write: (name, text) => {
    try {
      localStorage.setItem(`ph.${name}`, text);
    } catch {
      // Private windows may refuse storage; the settings still hold for this visit.
    }
  },
};

const runtime = detectRuntime();
const profile = detectProfile({ runtime: runtime.startsWith("capacitor") ? "capacitor" : runtime === "electron" ? "electron" : "web", shortSide: Math.min(screen.width, screen.height) });
const firstLaunch = store.read("settings-device.json") === undefined;
export const prefs: SettingsState = readSettings(store, profile).state;

/** Where the game runs, for which rows show (SET-035 …). */
export const env = { platform: runtime === "web" ? ("web" as const) : runtime === "electron" ? ("desktop" as const) : ("mobile" as const), touch: matchMedia("(pointer: coarse)").matches };

// The Sound card's choices from before Settings existed carry over once.
if (firstLaunch) {
  const s = sound.settings;
  prefs.values["audio.master"] = Math.round(s.master * 20) * 5;
  prefs.values["audio.music_volume"] = Math.round(s.music * 20) * 5;
  prefs.values["audio.effects_volume"] = Math.round(s.effects * 20) * 5;
  prefs.values["audio.music"] = s.musicOn;
  prefs.values["audio.interface_sounds"] = s.uiSounds;
  saveSettings(prefs, store);
}

type Listener = (ids: string[]) => void;
const listeners: Listener[] = [];

/** Calls back with the ids that changed, after every change. */
export function onPrefs(fn: Listener): void {
  listeners.push(fn);
}

export const pref = (id: string): Value => valueOf(prefs, id) as Value;

function changed(ids: string[]): void {
  saveSettings(prefs, store);
  applySound();
  for (const fn of listeners) fn(ids);
}

export function setPref(id: string, v: Value): void {
  changed(setValue(prefs, id, v).map((c) => c.id));
}

export function resetPref(id: string): void {
  changed(resetRow(prefs, id).map((c) => c.id));
}

/** Reset this section (SET-015). */
export function resetPrefSection(section: string): void {
  changed(resetSection(prefs, section).map((c) => c.id));
}

/** The Audio rows drive the sound engine; the Sound card changes the same rows. */
function applySound(): void {
  sound.set({
    master: Number(pref("audio.master")) / 100,
    music: Number(pref("audio.music_volume")) / 100,
    effects: Number(pref("audio.effects_volume")) / 100,
    musicOn: pref("audio.music") === true,
    uiSounds: pref("audio.interface_sounds") === true,
  });
}
applySound();

// ---- battery saver ----
let battery: BatteryReport = {};
/** Auto follows the battery where the browser reports one (SET-040, D-SET-21). */
void (navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void }> })
  .getBattery?.()
  .then((b) => {
    const read = () => {
      battery = { battery: { level: b.level, charging: b.charging } };
      const ids = applyBatteryReport(prefs, battery).map((c) => c.id);
      if (ids.length) changed(ids);
    };
    b.addEventListener("levelchange", read);
    b.addEventListener("chargingchange", read);
    read();
  })
  .catch(() => {});

export const batteryOn = () => batterySaverActive(prefs, battery);

// ---- what the rows do ----
/** One day's playback after End turn, ms (SET-131). */
export const dayMs = () => daySeconds(prefs) * 1000;
/** One 4-hour step of a running battle, ms (SET-065). */
export const battleStepMs = () => battleStepSeconds(prefs) * 1000;
export const autosaveEvery = () => autosaveInterval(prefs);
export const autosavesKept = () => Number(pref("gameplay.autosaves_kept")) as 1 | 3 | 5;

/** How the map draws: frames a second at most, ms between idle animation frames (0 = none), and the overlay's pixel ratio cap. */
export function mapPower(): { maxFps: number; animMs: number; dprCap: number } {
  const cap = pref("graphics.frame_cap");
  const anim = pref("graphics.animations");
  const sharp = pref("graphics.sharpness");
  return {
    maxFps: cap === "display" ? 1000 : Number(cap),
    animMs: anim === "full" ? 200 : anim === "reduced" ? 1000 : 0,
    dprCap: sharp === "battery" ? 1 : sharp === "balanced" ? 1.5 : 2,
  };
}

/** Body text 17, 20 or 24 px as a zoom on the interface text (SET-098, SET-137). */
export function textZoom(): number {
  return ({ normal: 1, large: 20 / 17, larger: 24 / 17 } as Record<string, number>)[String(pref("accessibility.text_size"))] ?? 1;
}
