import { CATALOGUE, DESIGN, NA, STRINGS, applyDriver, isChanged, label, resetRow, setBy, nameOf, optionsOf, resolve, rowShown, sectionRows, setValue, valueOf, type Env, type Option, type Profile, type SettingDef, type SettingChanged, type SettingsState, type Value } from "./model.ts";

/**
 * What the settings do once set (settings-design §2, §5, §6): the numbers and
 * choices the client, audio and map read from them. Pure functions of the
 * settings state and the facts a caller passes in.
 */

const num = (v: Value | typeof NA): number => (typeof v === "number" ? v : Number.NaN);

// ---------------------------------------------------------------- scale and text

/** The interface scale in use as a factor; Auto needs the screen (SET-022). */
export function interfaceScale(st: SettingsState, screen?: { width: number; height: number }): number {
  const v = valueOf(st, "graphics.interface_scale");
  if (v === "auto") return autoInterfaceScale(st, screen ?? { width: 0, height: 0 }) / 100;
  return num(v) / 100;
}

/**
 * Auto scale: the largest step at which the 640 × 360 CSS-px safe layout,
 * measured landscape, still fits; short side to short side, as phones are
 * landscape only (D-SET-15).
 */
export function autoInterfaceScale(st: SettingsState, screen: { width: number; height: number }): number {
  const [a, b] = st.cat.constants.interface_scale_auto_min_layout as [number, number];
  const needShort = Math.min(a, b);
  const needLong = Math.max(a, b);
  const short = Math.min(screen.width, screen.height);
  const long = Math.max(screen.width, screen.height);
  const steps = optionsOf(resolve(st.cat, "graphics.interface_scale")).filter((o): o is number => typeof o === "number");
  const fits = steps.filter((s) => needShort * (s / 100) <= short && needLong * (s / 100) <= long);
  return fits.length ? Math.max(...fits) : Math.min(...steps);
}

/** Body text before interface scale (SET-098). */
export function baseBodyPx(st: SettingsState): number {
  const def = resolve(st.cat, "accessibility.text_size") as SettingDef & { body_px: Record<string, number> };
  return def.body_px[String(valueOf(st, "accessibility.text_size"))]!;
}

/** Body text in CSS px after interface scale (SET-021, SET-116). */
export function bodyTextPx(st: SettingsState, screen?: { width: number; height: number }): number {
  return baseBodyPx(st) * interfaceScale(st, screen);
}

/** Panels keep their width when text grows: they reflow and cards grow taller (SET-098). */
export function panelLayout(st: SettingsState, baseWidth: number, textChars: number, charsPerLineAt17: number): { width: number; lines: number } {
  const px = baseBodyPx(st);
  const perLine = Math.max(1, Math.floor((charsPerLineAt17 * 17) / px));
  return { width: baseWidth * interfaceScale(st), lines: Math.ceil(textChars / perLine) };
}

/** The readability question on the Big screen moves Text size one step (SET-010). */
export function answerReadability(st: SettingsState, answer: string): SettingChanged[] {
  const opts = optionsOf(resolve(st.cat, "accessibility.text_size"));
  const i = opts.indexOf(valueOf(st, "accessibility.text_size") as Option);
  const [smaller, , bigger] = DESIGN.readability_answers;
  const j = answer === smaller ? i - 1 : answer === bigger ? i + 1 : i;
  if (j === i || j < 0 || j >= opts.length) return [];
  return setValue(st, "accessibility.text_size", opts[j]!);
}

// ---------------------------------------------------------------- display

/** The game shell's layout for a profile (SET-021). */
export function layoutFor(profile: Profile): "far" | "normal" {
  return profile === DESIGN.far_layout_profile ? "far" : "normal";
}

/** The rectangle inside the screen margins, in px (SET-021, SET-044). */
export function safeRect(st: SettingsState, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const m = valueOf(st, "graphics.screen_margins");
  const pct = typeof m === "number" ? m / 100 : 0;
  const dx = width * pct;
  const dy = height * pct;
  return { x: dx, y: dy, width: width - 2 * dx, height: height - 2 * dy };
}

/** The calibration screen is offered once, on the profiles the file names (SET-020, SET-044). */
export function calibrationOffered(st: SettingsState, alreadyOffered: boolean): boolean {
  const def = resolve(st.cat, "graphics.screen_margins") as SettingDef & { offer_calibration_on?: string[] };
  return !alreadyOffered && (def.offer_calibration_on ?? []).includes(st.profile);
}

/** The calibration screen's four corner marks, pulled in to a margin (CalibrateMargins). */
export interface Calibration {
  marks: ["top-left", "top-right", "bottom-left", "bottom-right"];
  percent: number;
}
export function openCalibration(st: SettingsState): Calibration {
  const m = valueOf(st, "graphics.screen_margins");
  return { marks: ["top-left", "top-right", "bottom-left", "bottom-right"], percent: typeof m === "number" ? m : 0 };
}
export function pullCalibration(st: SettingsState, cal: Calibration, percent: number): SettingChanged[] {
  const def = resolve(st.cat, "graphics.screen_margins");
  cal.percent = Math.max(def.min!, Math.min(def.max!, Math.round(percent / def.step!) * def.step!));
  return setValue(st, "graphics.screen_margins", cal.percent);
}

/** A Display mode change waiting for "Keep this display?" (SET-003, SET-035). */
export interface DisplayChange {
  question: string;
  previous: Value;
  revertAt: number;
  state: "asking" | "kept" | "reverted";
}

export function changeDisplayMode(st: SettingsState, value: Value, nowSeconds: number): DisplayChange {
  const previous = valueOf(st, "graphics.display_mode") as Value;
  setValue(st, "graphics.display_mode", value);
  return { question: STRINGS["settings.display_keep"]!, previous, revertAt: nowSeconds + st.cat.constants.display_revert_seconds, state: "asking" };
}
export function confirmDisplayMode(change: DisplayChange): void {
  if (change.state === "asking") change.state = "kept";
}
/** Time passes; without a confirmation the old mode comes back. */
export function tickDisplayMode(st: SettingsState, change: DisplayChange, nowSeconds: number): void {
  if (change.state === "asking" && nowSeconds >= change.revertAt) {
    setValue(st, "graphics.display_mode", change.previous);
    change.state = "reverted";
  }
}

/** How the window looks in a display mode (SET-035). */
export function windowFor(st: SettingsState): { borderless: boolean; resolution: string; resolutionList: boolean } {
  if (valueOf(st, "graphics.display_mode") === "fullscreen") {
    const f = DESIGN.display_mode_fullscreen;
    return { borderless: f.borderless, resolution: f.resolution, resolutionList: f.resolution_list };
  }
  return { borderless: false, resolution: "window", resolutionList: false };
}

/** Pixel scaling: Crisp snaps art to whole multiples of its size, Smooth fills the space (SET-037). */
export function fitArt(st: SettingsState, artPx: number, spacePx: number): { drawnPx: number; multiple: number; marginPx: number } {
  const exact = spacePx / artPx;
  const multiple = valueOf(st, "graphics.pixel_scaling") === "crisp" ? Math.max(1, Math.floor(exact)) : exact;
  const drawnPx = artPx * multiple;
  return { drawnPx, multiple, marginPx: spacePx - drawnPx };
}

/** Screen pixels per CSS pixel on the map (SET-038). */
export function mapPixelRatio(st: SettingsState, devicePixelRatio: number): number {
  const cap = (DESIGN.sharpness_max_ratio as Record<string, number>)[String(valueOf(st, "graphics.sharpness"))]!;
  return Math.min(devicePixelRatio, cap);
}

/** The map's pixel art is sampled nearest-neighbour at every Sharpness, so it stays sharp (SET-038). */
export function mapSampling(_st: SettingsState): "nearest" {
  return "nearest";
}

/** The map redraws only when something moves, whatever the cap (SET-039). */
export function mapRedraws(_st: SettingsState, somethingMoved: boolean): boolean {
  return somethingMoved;
}

/** What the map draws at a Map detail (SET-041). */
export function mapDetail(st: SettingsState): { close_in_tiles: string; surf: boolean; forest_blending: boolean; still_water: boolean } {
  return (DESIGN.map_detail as Record<string, { close_in_tiles: string; surf: boolean; forest_blending: boolean; still_water: boolean }>)[String(valueOf(st, "graphics.map_detail"))]!;
}

/** What moves at an Animations level, after Reduced motion (SET-042, SET-102). */
export function animationLevel(st: SettingsState, osReducedMotion = false): "full" | "reduced" | "off" {
  const v = valueOf(st, "graphics.animations") as "full" | "reduced" | "off";
  if (reducedMotionActive(st, osReducedMotion) && v === "full") return "reduced";
  return v;
}
export function animations(st: SettingsState, osReducedMotion = false): { moving: string[]; battleResult: "played" | "reduced" | "still frames" } {
  const level = animationLevel(st, osReducedMotion);
  if (level === "full") return { moving: [...DESIGN.animations.full], battleResult: "played" };
  if (level === "reduced") return { moving: [], battleResult: "reduced" };
  return { moving: [], battleResult: "still frames" };
}

/** The phone stays awake during the AI turn when this is On (SET-043). */
export function keepScreenAwake(st: SettingsState, env: Env, aiTurnRunning: boolean): boolean {
  return env.platform === "mobile" && aiTurnRunning && valueOf(st, "graphics.keep_awake") === true;
}

/** What the performance line shows (SET-045). */
export function performanceLine(st: SettingsState): string[] {
  const v = String(valueOf(st, "graphics.performance_line"));
  const lines = DESIGN.performance_line as Record<string, string[]>;
  return v === "full" ? [...lines.fps!, ...lines.full!] : [...(lines[v] ?? [])];
}

// ---------------------------------------------------------------- battery saver

/** What a device reports about battery saving (SET-040). */
export interface BatteryReport {
  iosLowPowerMode?: boolean;
  androidBatterySaver?: boolean;
  steamDeck?: { onBattery: boolean; level: number };
}

/** Whether the device reports battery saving: Steam Deck counts below the threshold on battery. */
export function deviceSavesBattery(st: SettingsState, r: BatteryReport): boolean {
  if (r.iosLowPowerMode || r.androidBatterySaver) return true;
  return !!r.steamDeck && r.steamDeck.onBattery && r.steamDeck.level < st.cat.constants.battery_auto_threshold;
}

/** Whether Battery saver's values are in force. */
export function batterySaverActive(st: SettingsState, r: BatteryReport = {}): boolean {
  const v = valueOf(st, "graphics.battery_saver");
  return v === "on" || (v === "auto" && deviceSavesBattery(st, r));
}

/** ApplyBatteryAuto: with Auto, follows the device's report (SET-040). */
export function applyBatteryReport(st: SettingsState, r: BatteryReport): SettingChanged[] {
  if (valueOf(st, "graphics.battery_saver") !== "auto") return [];
  return applyDriver(st, "graphics.battery_saver", deviceSavesBattery(st, r));
}

/** The four performance knobs in use (SET-121). */
export function performanceKnobs(st: SettingsState): { sharpness: Value; frame_cap: Value; map_detail: Value; animations: Value } {
  return {
    sharpness: valueOf(st, "graphics.sharpness") as Value,
    frame_cap: valueOf(st, "graphics.frame_cap") as Value,
    map_detail: valueOf(st, "graphics.map_detail") as Value,
    animations: valueOf(st, "graphics.animations") as Value,
  };
}

// ---------------------------------------------------------------- audio

export type Bus = "music" | "effects" | "ambience";

/** The bus a sound plays on (SET-046). */
export function busOf(sound: string): Bus | undefined {
  for (const [bus, sounds] of Object.entries(DESIGN.buses)) if ((sounds as string[]).includes(sound)) return bus as Bus;
  return undefined;
}

/** A sound's gain, 0–1: Master times its bus, silenced by Music off, Ambience off or Interface sounds off (SET-046, SET-049, SET-052, SET-053). */
export function gainOf(st: SettingsState, sound: string): number {
  const bus = busOf(sound);
  if (!bus) throw new Error(`no bus plays ${sound}`);
  const master = num(valueOf(st, "audio.master")) / 100;
  if (bus === "music") return valueOf(st, "audio.music") === false ? 0 : (master * num(valueOf(st, "audio.music_volume"))) / 100;
  if (bus === "ambience") return valueOf(st, "audio.ambience") === false ? 0 : (master * num(valueOf(st, "audio.ambience_volume"))) / 100;
  if (DESIGN.interface_sounds.includes(sound) && valueOf(st, "audio.interface_sounds") === false) return 0;
  return (master * num(valueOf(st, "audio.effects_volume"))) / 100;
}

/** Music Off fully suspends the synth (SET-049). */
export function musicSynthSuspended(st: SettingsState): boolean {
  return valueOf(st, "audio.music") === false;
}

/** The caption for an off-screen sound, when captions are on (SET-057). */
export function caption(st: SettingsState, sound: { kind: string; place: string; onScreen: boolean }): string | undefined {
  if (valueOf(st, "audio.captions") !== true || sound.onScreen) return undefined;
  return `${sound.kind} at ${sound.place}`;
}

/** How a sound of a priority plays (SET-058). */
export function soundShaping(st: SettingsState, priority: number): { softerDb: number; echo: boolean; sharpAttacks: boolean } {
  if (valueOf(st, "audio.reduced_intensity") !== true) return { softerDb: 0, echo: true, sharpAttacks: true };
  const r = DESIGN.reduced_intensity;
  return { softerDb: priority === 1 ? r.priority_1_softer_db : 0, echo: r.echo, sharpAttacks: r.sharp_attacks };
}

/** Whether the game is heard while in the background; mobile always goes silent (SET-055). */
export function audibleInBackground(st: SettingsState, env: Env): boolean {
  if (env.platform === "mobile") return false;
  return valueOf(st, "audio.play_in_background") === true;
}

/**
 * At launch with other audio playing: with "Let other apps' audio play" On the
 * game music starts muted and effects play over it, in iOS's ambient audio
 * session; Off takes the audio over (SET-056, SET-120). `launchValue` is the
 * value the game started with, as the row applies on restart.
 */
export function launchAudio(launchValue: boolean, otherAudioPlaying: boolean): { musicMuted: boolean; effectsPlay: boolean; takesOver: boolean; iosSession: string; respectsSilentSwitch: boolean } {
  if (launchValue) return { musicMuted: otherAudioPlaying, effectsPlay: true, takesOver: false, iosSession: DESIGN.ios_audio_session, respectsSilentSwitch: true };
  return { musicMuted: false, effectsPlay: true, takesOver: true, iosSession: "playback", respectsSilentSwitch: false };
}

/** The value a row has in this run: restart rows keep the value the game started with (SET-056). */
export function effectiveValue(st: SettingsState, id: string, atLaunch: Record<string, Value>): Value | typeof NA {
  const def = resolve(st.cat, id);
  if (def.applies === "restart" && def.id in atLaunch) return atLaunch[def.id]!;
  return valueOf(st, id);
}

// ---------------------------------------------------------------- gameplay

/** The autosave interval the saves context runs with (SET-061; saves §2.3). */
export function autosaveInterval(st: SettingsState): 1 | 6 | 12 | "off" {
  const v = valueOf(st, "gameplay.autosave");
  return ({ every_month: 1, every_6_months: 6, every_12_months: 12, off: "off" } as const)[v as "every_month" | "every_6_months" | "every_12_months" | "off"];
}

/** One bell's playback time in seconds at the chosen speed (SET-065). */
export function bellSeconds(st: SettingsState): [number, number] {
  const speed = num(valueOf(st, "gameplay.battle_speed"));
  const [a, b] = DESIGN.bell_seconds_at_1x as [number, number];
  return [a / speed, b / speed];
}

/** Whether the turn report opens when a turn ends (SET-066). */
export function turnReportOpens(st: SettingsState, somethingImportant: boolean): boolean {
  const v = valueOf(st, "gameplay.turn_report");
  return v === "every_turn" || (v === "important" && somethingImportant);
}

/** What the camera does when an event card opens (SET-067, SET-102). */
export function cameraOnEvent(st: SettingsState, osReducedMotion = false): "glide" | "cut" | "stay" {
  if (valueOf(st, "gameplay.jump_to_events") !== true) return "stay";
  return reducedMotionActive(st, osReducedMotion) ? "cut" : "glide";
}

export type TooltipInput = "mouse" | "touch" | "controller";

/** When a tooltip shows, in seconds after the input starts, or undefined when tooltips are off (SET-068, SET-069). */
export function tooltipShowsAfter(st: SettingsState, input: TooltipInput): number | undefined {
  if (valueOf(st, "gameplay.tooltips") !== true) return undefined;
  if (input === "controller") return 0;
  if (input === "touch") return longPressSeconds(st);
  return (DESIGN.tooltip_delay_seconds as Record<string, number>)[String(valueOf(st, "gameplay.tooltip_delay"))]!;
}

/** A number's tooltip: its total, or the full breakdown with Detailed tooltips (SET-070). */
export function numberTooltip(st: SettingsState, total: number, parts: readonly { amount: number; source: string }[]): string {
  if (valueOf(st, "gameplay.detailed_tooltips") !== true) return String(total);
  return parts.map((p) => `${p.amount < 0 ? "−" : "+"}${Math.abs(p.amount)} from ${p.source}`).join(", ");
}

/** Whether an earned achievement shows its toast; it unlocks either way (SET-072). */
export function achievementToast(st: SettingsState): boolean {
  return valueOf(st, "gameplay.achievement_toasts") === true;
}

/** A place's name: Historical uses the name list by owner when one exists, else today's name (SET-073, D-SET-17: no list exists, so today's name). */
export function placeName(st: SettingsState, todayName: string, owner: string, historical?: (owner: string) => string | undefined): string {
  if (valueOf(st, "gameplay.place_names") !== "historical" || !historical) return todayName;
  return historical(owner) ?? todayName;
}

/** A game date in the chosen Date format; "follows the language" is the long English form (SET-074). */
export function formatDate(st: SettingsState, y: number, m: number, d: number): string {
  const v = String(valueOf(st, "gameplay.date_format"));
  const months = DESIGN.month_names;
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (v) {
    case "short":
      return `${d} ${months[m - 1]!.slice(0, 3)} ${y}`;
    case "dotted":
      return `${pad(d)}.${pad(m)}.${y}`;
    case "iso":
      return `${y}-${pad(m)}-${pad(d)}`;
    default:
      return `${d} ${months[m - 1]} ${y}`;
  }
}

/** A number in the chosen Number format; "follows the language" uses English's 1,000.5 (SET-107). */
export function formatNumber(st: SettingsState, n: number): string {
  const v = String(valueOf(st, "language.number_format"));
  const [group, point] = (DESIGN.number_formats as Record<string, string[]>)[v === "language" ? "comma_point" : v]!;
  const [int, frac] = String(Math.abs(n)).split(".");
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, group!);
  return `${n < 0 ? "−" : ""}${grouped}${frac ? point + frac : ""}`;
}

// ---------------------------------------------------------------- controls

export function longPressSeconds(st: SettingsState): number {
  return (DESIGN.long_press_seconds as Record<string, number>)[String(valueOf(st, "controls.long_press"))]!;
}

/** Keys bound to each action (SET-080, SET-081). */
export function keyBindings(st: SettingsState): Record<string, string[]> {
  return valueOf(st, "controls.keys") as Record<string, string[]>;
}

/** An action's English name. */
export function actionName(action: string): string {
  return STRINGS[`settings.action.${action}`] ?? action;
}

/** The result of RebindKey: bound, or a question when another action has the key (SET-080). */
export type Rebind = { bound: true } | { bound: false; question: string; other: string };

export function rebindKey(st: SettingsState, action: string, key: string, slot: number, swap = false): Rebind {
  const def = resolve(st.cat, "controls.keys");
  const slots = def.slots_per_action ?? 2;
  if (slot < 0 || slot >= slots) throw new Error(`an action holds at most ${slots} keys`);
  const keys: Record<string, string[]> = Object.fromEntries(Object.entries(keyBindings(st)).map(([a, k]) => [a, [...k]]));
  const other = Object.keys(keys).find((a) => a !== action && keys[a]!.includes(key));
  if (other && !swap) return { bound: false, question: STRINGS["settings.key_conflict"]!.replace("{action}", actionName(other)), other };
  const mine = keys[action] ?? [];
  const replaced = mine[slot];
  mine[slot] = key;
  keys[action] = mine.filter((k) => k !== undefined).slice(0, slots);
  if (other) {
    const theirs = keys[other]!.filter((k) => k !== key);
    if (replaced !== undefined) theirs.push(replaced);
    keys[other] = theirs.slice(0, slots);
  }
  setValue(st, "controls.keys", keys);
  return { bound: true };
}

/**
 * Whether a press of the End turn key (or any hold action) does its action:
 * a hold of 0.5 s with Hold actions On, a double press with it Off (SET-082, SET-104).
 */
export function holdActionDone(st: SettingsState, press: { holdSeconds?: number; presses?: number }): boolean {
  if (valueOf(st, "accessibility.hold_actions") === true) return (press.holdSeconds ?? 0) >= DESIGN.end_turn_key_hold_seconds;
  return (press.presses ?? 0) >= 2;
}

/** How the action menu opens (SET-104). */
export function actionMenuOpensBy(st: SettingsState): "a hold" | "a double press" {
  return valueOf(st, "accessibility.hold_actions") === true ? "a hold" : "a double press";
}

export type Controller = "xbox" | "playstation" | "nintendo" | "steam_controller" | "steam_deck";

/** Which glyphs prompts use (SET-083): on Steam they come from Steam Input and the player's own bindings. */
export function promptGlyphs(st: SettingsState, lastUsed: Controller, onSteam: boolean): { set: string; fromSteamInput: boolean } {
  const v = String(valueOf(st, "controls.prompts"));
  if (onSteam && v === "auto") return { set: lastUsed, fromSteamInput: true };
  return { set: v === "auto" ? lastUsed : v, fromSteamInput: false };
}

/** What a face button does in a menu with the chosen Confirm button (SET-084). */
export function menuButton(st: SettingsState, button: "A" | "B"): "confirm" | "back" {
  const right = valueOf(st, "controls.confirm_button") === "right";
  if (button === "A") return right ? "back" : "confirm";
  return right ? "confirm" : "back";
}

/** Controller rebinding: Steam's own panel on Steam, else the in-game list (SET-091). */
export function controllerRebinding(st: SettingsState, env: Env): string {
  if (rowShown(st, "controls.open_steam_bindings", env)) return nameOf("controls.open_steam_bindings");
  return rowShown(st, "controls.pad", env) ? "the in-game rebind list" : "none";
}

/** Focus outlines: with a controller, and always on the Big screen (SET-019, SET-117). */
export function focusOutlines(st: SettingsState): boolean {
  return st.controllerPrompts || st.profile === "big_screen";
}

/** Naming a save on the Deck calls Steam's floating keyboard (SET-116). */
export function textInputFor(profile: Profile): string {
  return profile === "steam_deck" ? DESIGN.deck_text_input : "on-screen keyboard";
}

/** The Android back gesture (SET-119). */
export function androidBack(state: { panelsOpen: number; pauseMenuOpen: boolean }): string {
  const [closePanel, openPause, askQuit] = DESIGN.android_back;
  if (state.panelsOpen > 0) return closePanel!;
  if (!state.pauseMenuOpen) return openPause!;
  return askQuit!;
}

// ---------------------------------------------------------------- accessibility

/** The colour plan of a Colour vision mode (SET-095, SET-096). */
export function colourPlan(st: SettingsState): { assignment: string; ramp: string; greys_with_patterns: boolean; palette_size: number } {
  const plan = (DESIGN.colour_vision as Record<string, { assignment: string; ramp: string; greys_with_patterns: boolean }>)[String(valueOf(st, "accessibility.colour_vision"))]!;
  return { ...plan, palette_size: DESIGN.palette_size };
}

/** The fill patterns lenses use when Patterns on lenses is On (SET-096). */
export function lensPatterns(st: SettingsState): string[] {
  return valueOf(st, "accessibility.lens_patterns") === true ? [...DESIGN.lens_patterns] : [];
}

export function borderLook(st: SettingsState): string {
  return (DESIGN.borders as Record<string, string>)[String(valueOf(st, "accessibility.borders"))]!;
}

export function fonts(st: SettingsState): { body: string; titles: string } {
  const f = (DESIGN.fonts as Record<string, { body: string; titles: string }>)[String(valueOf(st, "accessibility.font"))]!;
  return { body: f.body, titles: f.titles };
}

export function panelLook(st: SettingsState): { background: string; outlines: string; text_over_patterns: boolean } {
  if (valueOf(st, "accessibility.high_contrast_panels") === true) return { ...DESIGN.high_contrast_panels };
  return { background: "parchment", outlines: "normal", text_over_patterns: true };
}

/** The smallest tap target in points (SET-101). */
export function tapTargetPoints(st: SettingsState): number {
  const def = resolve(st.cat, "accessibility.touch_targets") as SettingDef & { points: Record<string, number> };
  const v = valueOf(st, "accessibility.touch_targets");
  return def.points[v === NA ? "normal" : String(v)]!;
}

/** Reduced motion in force: On, or Follow system while the OS asks for it (SET-102). */
export function reducedMotionActive(st: SettingsState, osAsks: boolean): boolean {
  const v = valueOf(st, "accessibility.reduced_motion");
  return v === "on" || (v === "system" && osAsks);
}

/** Applies the OS's reduced-motion report: drives Animations to Reduced or lower (SET-102). */
export function applyOsReducedMotion(st: SettingsState, osAsks: boolean): SettingChanged[] {
  if (valueOf(st, "accessibility.reduced_motion") !== "system") return [];
  return applyDriver(st, "accessibility.reduced_motion", osAsks);
}

export function motionLook(st: SettingsState, osAsks: boolean): { camera: "cut" | "glide"; screenShake: boolean; animations: string } {
  if (reducedMotionActive(st, osAsks)) return { camera: "cut", screenShake: false, animations: animationLevel(st, osAsks) };
  return { camera: "glide", screenShake: true, animations: animationLevel(st, osAsks) };
}

/** Effects removed by No flashes (SET-103). */
export function flashesRemoved(st: SettingsState): string[] {
  return valueOf(st, "accessibility.no_flashes") === true ? [...DESIGN.no_flashes_removes] : [];
}

// ---------------------------------------------------------------- language

export interface LanguageInfo {
  name: string;
  latin: boolean;
  /** The localisation design has a font for its script. */
  hasFont: boolean;
}

/** The Language list: Latin scripts, and other scripts only once a font exists (SET-108). */
export function languageList(languages: readonly LanguageInfo[]): string[] {
  return languages.filter((l) => l.latin || l.hasFont).map((l) => l.name);
}

/** When a language change shows (SET-106). */
export function languageChange(): { interfaceText: "at once"; eventAndCatalogueText: "next panel open" } {
  return { interfaceText: "at once", eventAndCatalogueText: "next panel open" };
}

// ---------------------------------------------------------------- the Settings screen

export type Window = "landscape" | "tall";

/** A Settings screen, open over the map or the title (SET-003, SET-011 – SET-016). */
export interface SettingsScreen {
  st: SettingsState;
  env: Env;
  layout: "split" | "list-first";
  sections: string[];
  section: number;
  row: number;
  /** In the tall layout, a section's rows are open full screen. */
  sectionOpen: boolean;
  buttons: string[];
  closed: boolean;
  longDescription?: string;
}

/** The sections shown, in the file's order. */
export function sectionLabels(st: SettingsState): string[] {
  return st.cat.sections.map((s) => STRINGS[`settings.section.${s}`] ?? s);
}

export function openSettings(st: SettingsState, env: Env, window: Window = "landscape"): SettingsScreen {
  const sections = st.cat.sections.filter((s) => sectionRows(st, s, env).length > 0);
  const layout = window === "landscape" ? "split" : "list-first";
  return { st, env, layout, sections, section: 0, row: 0, sectionOpen: layout === "split", buttons: ["Back"], closed: false };
}

/** The rows of the open section, in order; each section ends with its reset action. */
export function screenRows(scr: SettingsScreen): string[] {
  return [...sectionRows(scr.st, scr.sections[scr.section]!, scr.env), `reset:${scr.sections[scr.section]}`];
}

export function focusedRow(scr: SettingsScreen): string {
  return screenRows(scr)[scr.row]!;
}

/** Opens a section; in the tall layout it fills the screen and Back returns to the list. */
export function openSection(scr: SettingsScreen, section: string): void {
  const i = scr.sections.indexOf(section);
  if (i < 0) throw new Error(`no section ${section}`);
  scr.section = i;
  scr.row = 0;
  scr.sectionOpen = true;
}

export function back(scr: SettingsScreen): void {
  if (scr.layout === "list-first" && scr.sectionOpen) scr.sectionOpen = false;
  else scr.closed = true;
}

/** One step of a slider or choice, as the d-pad or arrow keys move it (SET-004, SET-016). */
export function stepValue(st: SettingsState, id: string, dir: 1 | -1): SettingChanged[] {
  const def = resolve(st.cat, id);
  const cur = valueOf(st, id);
  if (def.type === "slider") return setValue(st, id, Math.max(def.min!, Math.min(def.max!, num(cur) + dir * def.step!)));
  if (def.type === "toggle") return setValue(st, id, !cur);
  const opts = optionsOf(def, st.facts.languages);
  const i = Math.max(0, Math.min(opts.length - 1, opts.indexOf(cur as Option) + dir));
  return setValue(st, id, opts[i]!);
}

/** A tap or click at a position along a slider, 0 at its left end and 1 at its right (SET-004). */
export function tapSlider(st: SettingsState, id: string, position: number): SettingChanged[] {
  const def = resolve(st.cat, id);
  const raw = def.min! + position * (def.max! - def.min!);
  return setValue(st, id, Math.max(def.min!, Math.min(def.max!, def.min! + Math.round((raw - def.min!) / def.step!) * def.step!)));
}

/** A controller button on the Settings screen (SET-016). */
export function pressButton(scr: SettingsScreen, button: string): string {
  const verb = (DESIGN.controller_navigation as Record<string, string>)[button];
  if (!verb) throw new Error(`no Settings action for ${button}`);
  const rows = screenRows(scr);
  const id = rows[scr.row]!;
  switch (button) {
    case "LB":
      scr.section = (scr.section - 1 + scr.sections.length) % scr.sections.length;
      scr.row = 0;
      break;
    case "RB":
      scr.section = (scr.section + 1) % scr.sections.length;
      scr.row = 0;
      break;
    case "d-pad up":
      scr.row = Math.max(0, scr.row - 1);
      break;
    case "d-pad down":
      scr.row = Math.min(rows.length - 1, scr.row + 1);
      break;
    case "d-pad left":
    case "d-pad right":
      if (!id.startsWith("reset:") && resolve(scr.st.cat, id).type !== "action") stepValue(scr.st, id, button === "d-pad right" ? 1 : -1);
      break;
    case "A":
      if (!id.startsWith("reset:") && ["choice", "toggle", "slider"].includes(resolve(scr.st.cat, id).type)) stepValue(scr.st, id, 1);
      break;
    case "B":
      back(scr);
      break;
    case "X":
      if (!id.startsWith("reset:")) resetFocused(scr);
      break;
    case "Y":
      scr.longDescription = STRINGS[`settings.${resolve(scr.st.cat, id.startsWith("reset:") ? rows[0]! : id).id}.desc`] ?? "";
      break;
  }
  return verb;
}

function resetFocused(scr: SettingsScreen): void {
  resetRow(scr.st, focusedRow(scr));
}

/** What a row shows: its name, value and the changed dot (SET-014), and "Set by …" on a driven row (SET-124). */
export function rowView(st: SettingsState, id: string): { name: string; value: string; changedDot: boolean; setBy?: string } {
  const def = resolve(st.cat, id);
  const v = valueOf(st, id);
  const value = def.type === "action" || def.type === "binding" ? "" : v === NA ? NA : label(st.cat, def.id, v);
  const base = { name: nameOf(id), value, changedDot: isChanged(st, id) };
  const by = setBy(st, id);
  return by ? { ...base, setBy: by } : base;
}

/** Where Settings opens from (SET-007, SET-009): the title's Settings button and the game menu, which Esc and Menu open. */
export function openPauseMenu(input: string): { pauseMenu: boolean; offers: string[] } {
  const opens = input === "Esc" || input === "Escape" || input === "Menu button" || input === "Menu";
  return { pauseMenu: opens, offers: opens ? ["Settings"] : [] };
}

/** The read-only list of campaign rules (SET-006, SET-032). */
export function campaignRulesView(rules: Record<string, string>): { rows: { rule: string; value: string; editable: false }[] } {
  return { rows: DESIGN.campaign_rules.map((r) => ({ rule: r, value: rules[r] ?? "", editable: false as const })) };
}

/** The Account row: Sign in / Create account, or the email and Sign out (SET-109). */
export function accountRow(env: Env, email?: string): { offers: string[]; email?: string } {
  if (!env.signedIn) return { offers: ["Sign in / Create account"] };
  return email ? { offers: ["Sign out"], email } : { offers: ["Sign out"] };
}

/** The sign-in flow, the same from Settings and from the Load screen's "Sign in to sync" (SET-109). */
export function signInFlow(_from: "settings" | "load screen"): string {
  return actionOf("account.sign_in").opens;
}

/** The rows the Privacy section shows for an edition (SET-114). */
export function privacyRows(st: SettingsState, env: Env): string[] {
  return sectionRows(st, "privacy", env).map(nameOf);
}

/** What About shows (SET-115). */
export function aboutView(version: string, build: string): string[] {
  return [`Version ${version} (build ${build})`];
}

/** What an action row does (SET-071, SET-113, SET-115). */
export function actionOf(id: string): { opens: string; confirm: boolean } {
  const opens: Record<string, string> = {
    "about.restore_purchases": "the store screen's restore flow",
    "about.credits": "the credits",
    "about.reset_all": "reset all settings",
    "about.copy_diagnostics": "the clipboard",
    "account.sign_in": "the sign-in flow",
    "account.delete": "delete account and saves",
    "gameplay.reset_tutorial_hints": "tutorial hints reset",
    "controls.open_steam_bindings": "ShowBindingPanel",
  };
  const def = CATALOGUE.byId.get(id);
  return { opens: opens[id] ?? id, confirm: def?.confirm === true };
}

/** Copy diagnostics: the diagnostics line and the settings, as put on the clipboard (SET-115). */
export function copyDiagnostics(st: SettingsState, diagnosticsLine: string): string {
  return `${diagnosticsLine}\n${JSON.stringify({ profile: st.profile, values: st.values })}`;
}

// ---------------------------------------------------------------- decided rules (D-SET-*, X-1, X-17)

/** One 4-hour battle step's playback time at the chosen speed; battles never stop the turn (SET-065, X-1). */
export function battleStepSeconds(st: SettingsState): number {
  return (DESIGN.battle_step_seconds_at_1x as number) / num(valueOf(st, "gameplay.battle_speed"));
}

/** The pad binding of an action in a set: a button name, or a button held for some seconds (SET-092, D-SET-3). */
export function padBinding(set: "map" | "menu" | "battle", action: string): string | { button: string; hold_seconds: number } | string[] | undefined {
  const pad = resolve(CATALOGUE, "controls.pad") as SettingDef & { action_sets: Record<string, Record<string, string | string[] | { button: string; hold_seconds: number }>> };
  return pad.action_sets[set]?.[action];
}

/** Steam Input: six action sets plus the Text layer, official configurations and glyphs (SET-094, D-SET-5). */
export function steamInput(): { action_sets: string[]; text_layer: string; official_configurations: string[]; glyphs: string } {
  return DESIGN.steam_input as { action_sets: string[]; text_layer: string; official_configurations: string[]; glyphs: string };
}

/** Where the action bar, End turn and the game menu button sit for a main hand (SET-075, D-SET-16). */
export function mainHandLayout(st: SettingsState): { action_bar: string; end_turn: string; game_menu: string } {
  return (DESIGN.main_hand_layout as Record<string, { action_bar: string; end_turn: string; game_menu: string }>)[String(valueOf(st, "controls.main_hand"))]!;
}

/** How a colour vision mode keeps the season palettes apart; seasons cannot be turned off (SET-130, X-17). */
export function seasonPaletteMeans(st: SettingsState): string {
  return (DESIGN.season_palette_means as Record<string, string>)[String(valueOf(st, "accessibility.colour_vision"))]!;
}

/** What End turn does: unanswered events always open the first one; otherwise the question follows Confirm End turn and names only warnings (SET-064, D-SET-2). */
export function endTurnPress(st: SettingsState, attentionLines: number, unansweredEvents: number): { opens: "the first unanswered event" } | { asks: true; names: number } | { ends: true } {
  if (unansweredEvents > 0) return { opens: "the first unanswered event" };
  const v = String(valueOf(st, "gameplay.confirm_end_turn"));
  if (v === "always" || (v === "when_attention" && attentionLines > 0)) return { asks: true, names: attentionLines };
  return { ends: true };
}

/** The first-launch questions, each only when needed: language when the system's is not supported, consent when the privacy design requires it, readability on the Big screen (SET-010, D-SET-9). */
export function firstLaunchQuestions(profile: Profile, f: { languageSupported: boolean; consentRequired: boolean }): string[] {
  const q = DESIGN.first_launch_questions as { language: string; consent: string; readability: string };
  const out: string[] = [];
  if (!f.languageSupported) out.push(q.language);
  if (f.consentRequired) out.push(q.consent);
  if (profile === "big_screen") out.push(q.readability);
  return out;
}

/** One device's personal settings with the time each was last changed (SET-025, D-SET-13). */
export interface PersonalFile {
  values: Record<string, Value>;
  changedAt: Record<string, number>;
}

/** Sync of `settings-personal.json`: the newest change wins, setting by setting (D-SET-13). */
export function syncPersonal(files: readonly PersonalFile[]): PersonalFile {
  const out: PersonalFile = { values: {}, changedAt: {} };
  for (const f of files) {
    for (const [id, at] of Object.entries(f.changedAt)) {
      if (out.changedAt[id] === undefined || at > out.changedAt[id]!) {
        out.changedAt[id] = at;
        out.values[id] = f.values[id]!;
      }
    }
  }
  return out;
}

/** A march order by mouse: with Right-click gives orders on, left-click the army then right-click the province; tap the army then the province always works, with no confirm (SET-078, D-SET-8). */
export function marchOrderBy(st: SettingsState, clicks: readonly ("left" | "right")[]): boolean {
  if (clicks.length !== 2) return false;
  if (clicks[1] === "right") return valueOf(st, "controls.right_click_orders") === true;
  return clicks[0] === "left" && clicks[1] === "left";
}
