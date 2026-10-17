import config from "../../../../rules/data/domain/settings.json" with { type: "json" };

/**
 * The settings model (settings-design §1–§4, §9): the catalogue read from
 * settings.yaml, device profiles and their defaults, the player's values, the
 * rows each platform shows, driven rows and aliases, the two settings files
 * and how they are read, migrated and stored. Pure: storage is injected and
 * nothing here can reach the simulation (SET-006).
 */

export type SettingsConfig = typeof config;
export const settingsConfig: SettingsConfig = config;
export const DESIGN = config.design;
export const STRINGS: Record<string, string> = config.strings_en;

export type Profile = "phone" | "tablet" | "desktop" | "steam_deck" | "big_screen";
export const PROFILES: readonly Profile[] = ["phone", "tablet", "desktop", "steam_deck", "big_screen"];
export type Platform = "desktop" | "mobile" | "web";
export type SettingType = "choice" | "toggle" | "slider" | "binding" | "action";
export type Applies = "live" | "view" | "restart";
export type Group = "device" | "personal";
export type Option = string | number;
export type Value = Option | boolean | Record<string, unknown>;

/** One entry of settings.yaml, with the file's defaults filled in. */
export interface SettingDef {
  id: string;
  section: string;
  type: SettingType;
  options?: Option[] | string;
  default?: Value;
  default_by_profile?: Partial<Record<Profile, Value>>;
  platforms: Platform[];
  hide_on?: string[];
  only_on?: string[];
  applies: Applies;
  /** Absent on an alias: it has no group of its own (INV-SET-3). */
  sync?: Group;
  sets_when_on?: Record<string, Value>;
  sets_when?: Record<string, Record<string, Value>>;
  hide_when?: string;
  shown_when?: string;
  enabled_when?: string;
  only_if?: string;
  alias_of?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  not_on_profiles?: Profile[];
  confirm_revert?: boolean;
  default_if_nintendo?: Value;
  auto_on_when?: string;
  confirm?: boolean;
  slots_per_action?: number;
  [extra: string]: unknown;
}

export interface Catalogue {
  sections: string[];
  constants: { battery_auto_threshold: number; display_revert_seconds: number; interface_scale_auto_min_layout: number[] };
  settings: SettingDef[];
  byId: Map<string, SettingDef>;
}

/** Builds the catalogue from settings.yaml's data, in the file's order (SET-001). */
export function buildCatalogue(raw: unknown): Catalogue {
  const src = raw as { defaults: Partial<SettingDef>; sections: string[]; constants: Catalogue["constants"]; settings: Partial<SettingDef>[] };
  if (!src || !Array.isArray(src.settings) || !Array.isArray(src.sections)) throw new Error("settings.yaml does not load");
  const settings = src.settings.map((s) => {
    const def = { ...s, section: s.section ?? String(s.id).split(".")[0]! } as SettingDef;
    if (!def.alias_of) {
      def.platforms ??= [...(src.defaults.platforms ?? ["desktop", "mobile", "web"])];
      def.applies ??= src.defaults.applies ?? "live";
      def.sync ??= src.defaults.sync ?? "personal";
    } else def.platforms ??= [];
    return def;
  });
  return { sections: [...src.sections], constants: src.constants, settings, byId: new Map(settings.map((s) => [s.id, s])) };
}

export const CATALOGUE = buildCatalogue(config.catalogue);

/** The real setting behind an alias (SET-060). */
export function resolve(cat: Catalogue, id: string): SettingDef {
  const def = cat.byId.get(id);
  if (!def) throw new Error(`no setting ${id}`);
  return def.alias_of ? resolve(cat, def.alias_of) : def;
}

export function optionsOf(def: SettingDef, languages: readonly string[] = []): Option[] {
  if (def.options === "from_string_tables") return [...languages];
  return Array.isArray(def.options) ? def.options : [];
}

// ---------------------------------------------------------------- validity and labels

/** Whether a value is one this setting can take (INV-SET-4). */
export function isValid(def: SettingDef, v: unknown, languages: readonly string[] = []): boolean {
  switch (def.type) {
    case "toggle":
      return typeof v === "boolean";
    case "choice":
      return def.options === "from_string_tables" ? typeof v === "string" && (languages.length === 0 || languages.includes(v)) : optionsOf(def).some((o) => o === v);
    case "slider":
      return typeof v === "number" && v >= def.min! && v <= def.max! && Number.isInteger((v - def.min!) / def.step!);
    case "binding":
      return typeof v === "object" && v !== null && !Array.isArray(v);
    case "action":
      return false;
  }
}

/** The English text of a value, from the string table. */
export function label(cat: Catalogue, id: string, v: Value): string {
  const def = resolve(cat, id);
  if (def.type === "toggle") return v ? STRINGS["settings.toggle.on"]! : STRINGS["settings.toggle.off"]!;
  if (def.type === "slider") return def.unit === "percent" || def.section === "audio" ? `${v} %` : String(v);
  return STRINGS[`settings.${def.id}.option.${String(v)}`] ?? String(v);
}

/** The value an English text names: the full label, the label before its bracket, or the option id. */
export function parseValue(cat: Catalogue, id: string, text: string): Value {
  const def = resolve(cat, id);
  const t = text.trim();
  if (def.type === "toggle") {
    if (/^on$/i.test(t)) return true;
    if (/^off$/i.test(t)) return false;
    throw new Error(`${id}: not a toggle value: ${text}`);
  }
  if (def.type === "slider") return Number.parseFloat(t);
  for (const o of optionsOf(def)) {
    const l = label(cat, def.id, o);
    if (l === t || l.split(" (")[0] === t || String(o) === t || l.replace(/ %$/, "") === t.replace(/ %$/, "")) return o;
  }
  if (def.options === "from_string_tables") return t;
  throw new Error(`${id}: no option ${text}`);
}

/** The setting a row's English name stands for, in the given section if the name appears twice. */
export function idByName(cat: Catalogue, name: string, section?: string): string {
  const hits = cat.settings.filter((s) => STRINGS[`settings.${s.id}.name`] === name);
  const inSection = section ? hits.filter((s) => s.section === section) : hits;
  const pick = (inSection.length ? inSection : hits).find((s) => !s.alias_of) ?? (inSection.length ? inSection : hits)[0];
  if (!pick) throw new Error(`no setting named ${name}`);
  return pick.id;
}

export function nameOf(id: string): string {
  return STRINGS[`settings.${id}.name`] ?? id;
}

// ---------------------------------------------------------------- device profiles

export interface LaunchFacts {
  runtime: "capacitor" | "electron" | "web";
  /** The screen's short side, CSS px (Capacitor). */
  shortSide?: number;
  steamDeck?: boolean;
  bigPicture?: boolean;
  steamMachine?: boolean;
  tvDisplay?: boolean;
}

/** ProfileDetector (SET-017). */
export function detectProfile(f: LaunchFacts): Profile {
  if (f.runtime === "capacitor") return (f.shortSide ?? 0) < DESIGN.profile_detection.tablet_short_side_css_px ? "phone" : "tablet";
  if (f.steamDeck) return "steam_deck";
  if (f.bigPicture || f.steamMachine || f.tvDisplay) return "big_screen";
  return "desktop";
}

/** "n/a": the row has no value on this profile (settings-design §3.1). */
export const NA = "n/a" as const;

/** A setting's default on a profile (DefaultResolver). */
export function profileDefault(cat: Catalogue, id: string, profile: Profile, facts: { nintendoLayout?: boolean; systemLanguage?: string; languages?: readonly string[] } = {}): Value | typeof NA {
  const def = resolve(cat, id);
  if (def.not_on_profiles?.includes(profile)) return NA;
  if (def.id === "graphics.profile") return profile;
  if (def.default_if_nintendo !== undefined && facts.nintendoLayout) return def.default_if_nintendo;
  if (def.default === "system_or_en") {
    const langs = facts.languages ?? [];
    return facts.systemLanguage && langs.includes(facts.systemLanguage) ? facts.systemLanguage : "English";
  }
  const byProfile = def.default_by_profile?.[profile];
  if (byProfile !== undefined) return byProfile;
  return def.default ?? NA;
}

// ---------------------------------------------------------------- the player's settings

/** Where the game runs, for which rows show. */
export interface Env {
  platform: Platform;
  steam?: boolean;
  touch?: boolean;
  /** The platform reports controller motion. */
  motion?: boolean;
  signedIn?: boolean;
  ironman?: boolean;
  /** The free mobile tier with its ad. */
  freeTierAd?: boolean;
}

export interface SettingsState {
  cat: Catalogue;
  profile: Profile;
  /** Values the player (or a driving row) changed; everything else is the profile default. */
  values: Record<string, Value>;
  /** Rows set by another row: id → the driving setting (SET-124). */
  drivenBy: Record<string, string>;
  facts: { nintendoLayout?: boolean; systemLanguage?: string; languages?: string[] };
  /** Prompts and focus outlines, added when a controller connects (SET-019). */
  controllerPrompts: boolean;
}

export function newSettings(profile: Profile, cat: Catalogue = CATALOGUE, facts: SettingsState["facts"] = {}): SettingsState {
  return { cat, profile, values: {}, drivenBy: {}, facts, controllerPrompts: false };
}

/** The value in use: the player's own, else the profile default. */
export function valueOf(st: SettingsState, id: string): Value | typeof NA {
  const def = resolve(st.cat, id);
  if (def.id in st.values) return st.values[def.id]!;
  return profileDefault(st.cat, def.id, st.profile, st.facts);
}

/** The changed dot: the value differs from the profile default (SET-014). */
export function isChanged(st: SettingsState, id: string): boolean {
  const def = resolve(st.cat, id);
  return def.id in st.values && st.values[def.id] !== profileDefault(st.cat, def.id, st.profile, st.facts);
}

export interface SettingChanged {
  id: string;
  value: Value | typeof NA;
  group: Group | undefined;
}

/** The group a setting is stored in (SET-023). */
export function groupOf(cat: Catalogue, id: string): Group {
  return resolve(cat, id).sync!;
}

function emit(st: SettingsState, id: string): SettingChanged {
  return { id, value: valueOf(st, id), group: st.cat.byId.get(id)?.sync };
}

/** Rows that react to others, after any change. */
function settle(st: SettingsState, changed: string, out: SettingChanged[]): void {
  // Captions turn on by themselves when Master or every bus is silent (SET-057).
  if (changed.startsWith("audio.") && changed !== "audio.captions" && soundSilenced(st) && valueOf(st, "audio.captions") !== true) {
    st.values["audio.captions"] = true;
    out.push(emit(st, "audio.captions"));
  }
}

/** Master at 0, or every bus at 0 or off. */
export function soundSilenced(st: SettingsState): boolean {
  if (valueOf(st, "audio.master") === 0) return true;
  const music = valueOf(st, "audio.music") === false || valueOf(st, "audio.music_volume") === 0;
  const effects = valueOf(st, "audio.effects_volume") === 0;
  const ambience = valueOf(st, "audio.ambience") === false || valueOf(st, "audio.ambience_volume") === 0;
  return music && effects && ambience;
}

/** Drives or releases the rows a setting sets (`sets_when_on`, `sets_when`). */
export function applyDriver(st: SettingsState, driverId: string, active: boolean, out: SettingChanged[] = []): SettingChanged[] {
  const def = resolve(st.cat, driverId);
  const sets: Record<string, Value> = { ...(def.sets_when_on ?? {}) };
  if (def.sets_when) {
    const cur = String(valueOf(st, def.id));
    Object.assign(sets, def.sets_when[cur] ?? {});
  }
  for (const [id, v] of Object.entries(def.sets_when_on ?? {}).concat(Object.entries(Object.values(def.sets_when ?? {}).reduce((a, b) => ({ ...a, ...b }), {})))) {
    if (!st.cat.byId.has(id)) continue; // not a setting (engine.worker_budget, OQ-SET-1)
    const want = active && id in sets;
    if (want) {
      // "Reduced or lower": a driver never raises a row above the value it sets.
      const cur = valueOf(st, id);
      const def2 = resolve(st.cat, id);
      const opts = optionsOf(def2);
      if (def.id === "accessibility.reduced_motion" && opts.indexOf(cur as Option) > opts.indexOf(v as Option)) continue;
      st.values[id] = sets[id]!;
      st.drivenBy[id] = def.id;
      out.push(emit(st, id));
    } else if (st.drivenBy[id] === def.id) {
      delete st.values[id];
      delete st.drivenBy[id];
      out.push(emit(st, id));
    }
  }
  return out;
}

/** ChangeSetting: stores the value if valid and applies it at once; returns the SettingChanged events. */
export function setValue(st: SettingsState, id: string, v: Value): SettingChanged[] {
  const def = resolve(st.cat, id);
  if (!isValid(def, v, st.facts.languages)) throw new Error(`${def.id}: ${String(v)} is not one of its values`);
  if (def.id === "graphics.profile") return changeProfile(st, v as Profile);
  st.values[def.id] = v;
  delete st.drivenBy[def.id];
  const out = [emit(st, def.id)];
  if (def.sets_when_on || def.sets_when) applyDriver(st, def.id, v === true || v === "on" || def.sets_when !== undefined, out);
  settle(st, def.id, out);
  return out;
}

/** "Set by Battery saver" on a driven row, or undefined. */
export function setBy(st: SettingsState, id: string): string | undefined {
  const by = st.drivenBy[resolve(st.cat, id).id];
  return by ? (STRINGS["settings.set_by"] ?? "Set by {setting}").replace("{setting}", nameOf(by)) : undefined;
}

/** ResetRow: back to the profile default (SET-015). */
export function resetRow(st: SettingsState, id: string): SettingChanged[] {
  const def = resolve(st.cat, id);
  delete st.values[def.id];
  delete st.drivenBy[def.id];
  return [emit(st, def.id)];
}

export function resetSection(st: SettingsState, section: string): SettingChanged[] {
  return st.cat.settings.filter((s) => s.section === section && !s.alias_of && s.type !== "action").flatMap((s) => resetRow(st, s.id));
}

export function resetAll(st: SettingsState): SettingChanged[] {
  return st.cat.settings.filter((s) => !s.alias_of && s.type !== "action").flatMap((s) => resetRow(st, s.id));
}

/** ChangeDeviceProfile: every default the player has not changed comes from the new profile (SET-018). */
export function changeProfile(st: SettingsState, profile: Profile): SettingChanged[] {
  st.profile = profile;
  return [{ id: "graphics.profile", value: profile, group: "device" }];
}

/** A controller connected: prompts and outlines, never a profile switch (SET-019). */
export function controllerConnected(st: SettingsState, layout: { nintendo?: boolean } = {}): void {
  st.controllerPrompts = true;
  if (layout.nintendo) st.facts.nintendoLayout = true;
}

// ---------------------------------------------------------------- rows on screen

/** Whether a row shows for this platform, profile and campaign (SET-035, SET-063, SET-087, SET-091 …). */
export function rowShown(st: SettingsState, id: string, env: Env): boolean {
  const own = st.cat.byId.get(id);
  if (!own) return false;
  const def = resolve(st.cat, id);
  if (!def.platforms.includes(env.platform)) return false;
  if (def.hide_on?.includes("steam") && env.steam) return false;
  if (def.only_on?.includes("steam") && !env.steam) return false;
  if (def.hide_when === "ironman" && env.ironman) return false;
  if (def.shown_when === "signed_in" && !env.signedIn) return false;
  if (def.only_if === "free_tier_ad" && !env.freeTierAd) return false;
  if (def.not_on_profiles?.includes(st.profile)) return false;
  if (DESIGN.touch_rows.includes(def.id) && !(env.touch ?? DESIGN.profile_touch[st.profile])) return false;
  if (def.id === "controls.gyro_cursor" && !env.motion) return false;
  return true;
}

/** The rows of a section, in the file's order. */
export function sectionRows(st: SettingsState, section: string, env: Env): string[] {
  return st.cat.settings.filter((s) => s.section === section && rowShown(st, s.id, env)).map((s) => s.id);
}

/** A row that shows but cannot be used yet, such as Ambience volume while Ambience is off (SET-053). */
export function rowEnabled(st: SettingsState, id: string): boolean {
  const def = resolve(st.cat, id);
  return def.enabled_when ? valueOf(st, def.enabled_when) === true : true;
}

// ---------------------------------------------------------------- the two files

export interface SettingsStore {
  read(name: string): string | undefined;
  write(name: string, text: string): void;
}

export const FILE_VERSION = DESIGN.file_version;

/** A step between settings file versions that renames or converts keys (SET-029). */
export interface SettingsMigration {
  from: number;
  to: number;
  run: (values: Record<string, unknown>) => Record<string, unknown>;
}

export const SETTINGS_MIGRATIONS: readonly SettingsMigration[] = [];

/** Writes the two small JSON files, each with its version (SET-024). Settings never go into a save (SET-030). */
export function saveSettings(st: SettingsState, store: SettingsStore): void {
  const files: Record<Group, Record<string, Value>> = { device: {}, personal: {} };
  for (const [id, v] of Object.entries(st.values)) files[groupOf(st.cat, id)][id] = v;
  store.write(DESIGN.files.device, JSON.stringify({ version: FILE_VERSION, profile: st.profile, values: files.device }));
  store.write(DESIGN.files.personal, JSON.stringify({ version: FILE_VERSION, values: files.personal }));
}

export interface ReadReport {
  dropped: string[];
  invalid: string[];
  broken: string[];
  migrated: string[];
}

/**
 * Reads the two files: unknown keys are dropped, invalid values fall back to
 * the profile default, a broken file is ignored, and older versions are
 * migrated first. Never throws (SET-028, INV-SET-6).
 */
export function readSettings(store: SettingsStore, profile: Profile, cat: Catalogue = CATALOGUE, migrations: readonly SettingsMigration[] = SETTINGS_MIGRATIONS, facts: SettingsState["facts"] = {}): { state: SettingsState; report: ReadReport } {
  const report: ReadReport = { dropped: [], invalid: [], broken: [], migrated: [] };
  let prof = profile;
  const values: Record<string, Value> = {};
  for (const name of [DESIGN.files.device, DESIGN.files.personal]) {
    const text = store.read(name);
    if (text === undefined) continue;
    let parsed: { version?: number; profile?: string; values?: Record<string, unknown> };
    try {
      parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    } catch {
      report.broken.push(name);
      continue;
    }
    let vals: Record<string, unknown> = { ...(parsed.values ?? {}) };
    for (let v = parsed.version ?? FILE_VERSION; v < FILE_VERSION; v++) {
      const step = migrations.find((m) => m.from === v);
      if (!step) break;
      vals = step.run(vals);
      report.migrated.push(`${name} ${v} → ${v + 1}`);
    }
    if (parsed.profile && (PROFILES as readonly string[]).includes(parsed.profile)) prof = parsed.profile as Profile;
    for (const [id, v] of Object.entries(vals)) {
      const def = cat.byId.get(id);
      if (!def || def.alias_of) {
        report.dropped.push(id);
        continue;
      }
      if (!isValid(def, v, facts.languages)) {
        report.invalid.push(id);
        continue;
      }
      values[id] = v as Value;
    }
  }
  const state = newSettings(prof, cat, facts);
  state.values = values;
  return { state, report };
}

/** Where the files live on each platform (SET-027). */
export function storageLocation(platform: "steam" | "desktop" | "ios" | "android" | "web"): string {
  return DESIGN.storage_by_platform[platform];
}

/** The store's free backup of the settings while signed out (SET-026); null on the web. */
export function settingsBackup(platform: "steam" | "ios" | "android" | "web"): { method: string; files: string[]; live_sync: boolean } | null {
  return (DESIGN.store_backup_by_platform as Record<string, { method: string; files: string[]; live_sync: boolean } | null>)[platform] ?? null;
}

// ---------------------------------------------------------------- the schema test

/**
 * The schema test (SET-127): settings.yaml loads, every default is one of its
 * options (or within min–max), and every name and description key exists in
 * English. Returns the problems; empty means it passes.
 */
export function schemaProblems(source: string | unknown, strings: Record<string, string> = STRINGS): string[] {
  let raw: unknown = source;
  if (typeof source === "string") {
    try {
      raw = JSON.parse(source);
    } catch {
      return ["settings.yaml does not load"];
    }
  }
  let cat: Catalogue;
  try {
    cat = buildCatalogue(raw);
  } catch {
    return ["settings.yaml does not load"];
  }
  const problems: string[] = [];
  for (const def of cat.settings) {
    for (const key of [`settings.${def.id}.name`, `settings.${def.id}.desc`]) if (!(key in strings)) problems.push(`missing English string ${key}`);
    if (def.alias_of || def.type === "action" || def.type === "binding") continue;
    const special = ["detected", "system_or_en", "ask"];
    const defaults = [def.default, ...Object.values(def.default_by_profile ?? {}), ...(def.default_if_nintendo !== undefined ? [def.default_if_nintendo] : [])];
    for (const d of defaults) {
      if (d === undefined || special.includes(String(d))) continue;
      if (!isValid(def, d)) problems.push(`${def.id}: default ${String(d)} is not one of its options`);
    }
  }
  return problems;
}
