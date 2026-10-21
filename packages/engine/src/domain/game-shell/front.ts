/**
 * Before the campaign (SHELL-004, SHELL-008..044): boot, first-run questions,
 * title, main menu and More, the free tier's ad and ribbon, new campaign in
 * three steps, Load, and the loading screen with its tips and real steps.
 */
import type { GameDate } from "@ph/rules";
import { agesRunning, formatMonthYear } from "../time-and-turns/index.ts";
import { SHELL, campaignLabel, enterCampaign, hasQuit, isFreeTier, openStartScreen, pop, push, replaceAll, top, topId, type Edition, type Frame, type Platform, type Shell } from "./stack.ts";
import { START_YEAR } from "../../../../rules/src/start.ts";

// ---------------------------------------------------------------------------
// Boot and first run (SHELL-008..015)

export interface BootScreen {
  logo: string;
  hourglass: string;
  studioLogos: boolean;
  video: boolean;
  waitsFor: string[];
}

export const bootScreen = (): BootScreen => ({ ...SHELL.boot, waitsFor: [...SHELL.boot.waitsFor] });

/** The native launch screen on iOS and Android shows the boot logo (SHELL-009). */
export function nativeLaunchScreen(platform: Platform): string | null {
  return platform === "iOS" || platform === "Android" ? SHELL.boot.logo : null;
}

/** Boot stays at least 0.6 s, otherwise as long as loading takes (SHELL-010). */
export const bootSeconds = (loadSeconds: number): number => Math.max(SHELL.bootMinSeconds, loadSeconds);

export type LoadFailure = "missing file" | "worker and fallback failed";

/** Profile facts kept between runs. */
export interface Profile {
  firstRunDone: boolean;
  tutorialFinished: boolean;
  purchased: boolean;
  sessions: number;
  language: string | null;
}

export const newProfile = (): Profile => ({ firstRunDone: false, tutorialFinished: false, purchased: false, sessions: 0, language: null });

export interface Device {
  language: string;
  store: string;
  /** What this store's build collects. */
  collects: string[];
  online: boolean;
}

export interface FirstRunCard {
  question: "language" | "consent";
  choices: number;
}

/** The first-run cards: language only if the device's is not one the game has; consent only where something needs it (SHELL-012..014). */
export function firstRunCards(device: Device, gameLanguages: readonly string[]): FirstRunCard[] {
  const cards: FirstRunCard[] = [];
  if (!gameLanguages.includes(device.language)) cards.push({ question: "language", choices: 1 });
  if (device.collects.some((c) => SHELL.consentItems.includes(c))) cards.push({ question: "consent", choices: 1 });
  return cards;
}

export interface Start {
  shell: Shell;
  profile: Profile;
  bootSeconds: number;
  cards: FirstRunCard[];
  /** Every screen shown from boot onward; none asks for an account. */
  path: string[];
}

/** Cold start: boot, then the failure screen, the first-run cards (first run only) or the title (SHELL-008, SHELL-011, SHELL-012). */
export function coldStart(sh: Shell, profile: Profile, device: Device, o: { loadSeconds: number; failure?: LoadFailure | null; gameLanguages: readonly string[] }): Start {
  replaceAll(sh, { id: "boot" });
  const p = { ...profile, sessions: profile.sessions + 1 };
  const out: Start = { shell: sh, profile: p, bootSeconds: bootSeconds(o.loadSeconds), cards: [], path: ["boot"] };
  if (o.failure) {
    replaceAll(sh, { id: "error", subject: o.failure });
    out.path.push("error");
    return out;
  }
  if (!p.firstRunDone) {
    out.cards = firstRunCards(device, o.gameLanguages);
    p.language = o.gameLanguages.includes(device.language) ? device.language : null;
    if (out.cards.length) {
      replaceAll(sh, { id: "first_run", subject: out.cards[0]!.question });
      out.path.push("first_run");
      return out;
    }
    p.firstRunDone = true;
  }
  openStartScreen(sh);
  out.path.push("title");
  return out;
}

/** AnswerFirstRunQuestion: the next card, then the title; first-run questions never come back. */
export function answerFirstRun(start: Start, answer: string): void {
  const card = start.cards.shift();
  if (!card) throw new Error("No first-run card");
  if (card.question === "language") start.profile.language = answer;
  start.shell.events.push({ type: "FirstRunAnswered", question: card.question, value: answer });
  if (start.cards.length) {
    replaceAll(start.shell, { id: "first_run", subject: start.cards[0]!.question });
    return;
  }
  start.profile.firstRunDone = true;
  openStartScreen(start.shell);
  start.path.push("title");
}

/** Every screen the shell can show; none is an account sign-in, and no step needs a connection (SHELL-015). */
export function needsSignIn(path: readonly string[]): boolean {
  return path.some((p) => /sign.?in|account/i.test(p));
}

// ---------------------------------------------------------------------------
// The start screen (SHELL-149..158; the title and main menu as one screen, SHELL-020..029 where they still hold)

export interface CampaignSummary {
  realm: string;
  date: GameDate;
  /** Borders from the newest save's header. */
  borders: string;
}

export interface StartBackground {
  renderer: "map";
  zoom: string;
  pan: "slow";
  over: string;
  bordersFrom: string;
  input: false;
  simulation: false;
}

/**
 * The start screen around its column: the real map at region zoom panning over
 * the realm of the latest save's summary, or one of the start regions; the icon
 * row, the version and, in the free tier, the Full game ribbon (SHELL-150, SHELL-154, SHELL-156).
 */
export function startScreen(o: { platform: Platform; edition: Edition; summary: CampaignSummary | null; start?: number }): { background: StartBackground; icons: string[]; version: "lower right"; ribbon: boolean } {
  const regions = SHELL.start.regions;
  const over = o.summary ? o.summary.realm : regions[(o.start ?? 0) % regions.length]!;
  const background: StartBackground = { renderer: "map", zoom: SHELL.start.zoom, pan: "slow", over, bordersFrom: o.summary ? "the latest save's summary" : String(START_YEAR), input: false, simulation: false };
  return { background, icons: startIcons(o.platform), version: "lower right", ribbon: isFreeTier(o.edition) };
}

/** The icon row under the column, each with its name; Quit only where an app can quit (SHELL-154). */
export const startIcons = (platform: Platform): string[] => SHELL.start.icons.filter((e) => e !== "Quit" || hasQuit(platform));

/** While Battery saver is on, the background keeps panning at its lower frame rate (SHELL-151). */
export const startBackgroundMoves = (_batterySaver: boolean): true => true;

export type StartInput = "touch" | "click" | "key press" | "controller button";

/**
 * The first touch, click, key or button anywhere on the start screen: the
 * title track may start, since browsers and phones allow sound only after one
 * (SHELL-149). The menu is already shown, so nothing else changes.
 */
export function firstStartInput(sh: Shell, _input: StartInput): void {
  if (topId(sh) === "title") push(sh, { id: "main_menu" });
  if (topId(sh) !== "main_menu") throw new Error("The start screen is not showing");
  if (!sh.events.some((e) => e.type === "TitleDismissed")) sh.events.push({ type: "TitleDismissed" });
}

export interface MenuContext {
  campaign: CampaignSummary | null;
  saves: number;
  tutorialFinished: boolean;
  platform: Platform;
  edition: Edition;
}

export interface MenuEntry {
  label: string;
  target: string;
  style: "large wax-red" | "paper";
  detail?: string;
  banner?: string;
}

/**
 * The column of ways into a campaign: Play (large and wax-red, first focus,
 * with the campaign's banner and "France · May 1503" while one is in
 * progress), then New campaign, Load and Tutorial when they apply (SHELL-152, SHELL-153).
 */
export function startColumn(m: MenuContext): MenuEntry[] {
  const play: MenuEntry = m.campaign
    ? { label: "Play", target: "loading", style: "large wax-red", detail: campaignLabel(m.campaign.realm, m.campaign.date), banner: m.campaign.realm }
    : { label: "Play", target: "new_campaign", style: "large wax-red" };
  const out: MenuEntry[] = [play];
  if (m.campaign) out.push({ label: "New campaign", target: "new_campaign", style: "paper" });
  if (m.saves > 0) out.push({ label: "Load", target: "load", style: "paper" });
  if (!m.tutorialFinished) out.push({ label: "Tutorial", target: "tutorial", style: "paper" });
  return out;
}

/** Focus starts on Play, whatever the state (SHELL-152). */
export const startFocus = (_m: MenuContext): string => "Play";

/** Wiki opens the web wiki in the system browser; the game stays on the start screen as it was (SHELL-155). */
export function openWiki(sh: Shell): { url: string } {
  const url = SHELL.start.wikiUrl;
  sh.events.push({ type: "WikiOpened", url });
  return { url };
}

/** More: Settings, Achievements, Almanac, Unlock (Buy the full game in the Steam demo), Credits, then Tutorial once finished (SHELL-023, SHELL-024). */
export function moreMenu(edition: Edition, tutorialFinished: boolean): string[] {
  const out = SHELL.moreMenu.map((e) => (e === "Unlock" && edition === "Steam demo" ? "Buy the full game" : e));
  if (tutorialFinished) out.push("Tutorial");
  return out;
}

/** No edition shows an ad, on any screen (SHELL-028, D-SHELL-16). */
export function adCard(_o: { edition: Edition; screen: string }): null {
  return null;
}

// ---------------------------------------------------------------------------
// The first-launch question (SHELL-131, D-SHELL-3)

export type FirstLaunchChoice = keyof typeof SHELL.firstLaunchChoices;
export const FIRST_LAUNCH_CHOICES = Object.keys(SHELL.firstLaunchChoices) as FirstLaunchChoice[];

/** Asked once, after the first Tap to start when no campaign exists, before the main menu. */
export function firstLaunchQuestion(o: { asked: boolean; campaignExists: boolean }): { question: string; choices: FirstLaunchChoice[]; focus: FirstLaunchChoice } | null {
  if (o.asked || o.campaignExists) return null;
  return { question: SHELL.strings.firstLaunch, choices: [...FIRST_LAUNCH_CHOICES], focus: FIRST_LAUNCH_CHOICES[0]! };
}

/** AnswerFirstLaunch: chapter 0 of the tutorial, or New campaign with or without guided first turns. */
export function answerFirstLaunch(sh: Shell, choice: FirstLaunchChoice): { opens: string; guidedTurns: boolean } {
  const c = SHELL.firstLaunchChoices[choice];
  if (!c) throw new Error(`No first-launch choice ${choice}`);
  sh.events.push({ type: "FirstLaunchAnswered", choice });
  if (c.opens === "new_campaign") push(sh, { id: "new_campaign", step: 1 });
  return { opens: c.opens, guidedTurns: c.guidedTurns };
}

/** The Full game ribbon in the free tier leads to Unlock; never a pop-up (SHELL-029). */
export function fullGameRibbon(edition: Edition): { label: "Full game"; opens: "unlock"; popUp: false } | null {
  return isFreeTier(edition) ? { label: "Full game", opens: "unlock", popUp: false } : null;
}

/** ContinueCampaign: Loading with the newest save, then the map (SHELL-004, SHELL-020). */
export function continueCampaign(sh: Shell, summary: CampaignSummary, saveId = "newest"): void {
  replaceAll(sh, { id: "loading", subject: saveId });
  sh.events.push({ type: "CampaignLoadRequested", save: saveId });
  sh.pendingLoad = summary;
}

/** Loading has finished: straight to the map of the loaded realm (SHELL-043). */
export function loadingFinished(sh: Shell): void {
  const s = sh.pendingLoad;
  if (topId(sh) !== "loading" || !s) throw new Error("Nothing is loading");
  enterCampaign(sh, { realm: s.realm, date: s.date });
  delete sh.pendingLoad;
}

// ---------------------------------------------------------------------------
// New campaign (SHELL-030..037)

export interface NewCampaign {
  step: 1 | 2 | 3;
  realm: string | null;
  lastTapped: string | null;
  options: string[] | null;
  lastOptions: string[];
  suggested: string[];
  highlighted: string | null;
}

export const STEPS = SHELL.newCampaignSteps;
export const stepStrip = (): string => STEPS.join(" · ");

/** Opens new campaign on step 1 with the map at world zoom (SHELL-030, SHELL-031). */
export function openNewCampaign(sh: Shell, o: { suggested: string[]; lastOptions: string[] }): NewCampaign {
  push(sh, { id: "new_campaign", step: 1 });
  sh.camera = { ...sh.camera, level: "World" };
  return { step: 1, realm: null, lastTapped: null, options: null, lastOptions: o.lastOptions, suggested: o.suggested, highlighted: null };
}

export const realmLocked = (edition: Edition, realm: string): boolean => isFreeTier(edition) && !SHELL.freeRealms.includes(realm);

/** Tapping a realm shows its card with strengths; a locked realm shows a padlock and a button to Unlock (SHELL-031, SHELL-032). */
export function tapRealm(sh: Shell, nc: NewCampaign, realm: string): { realm: string; strengths: "at a glance"; padlock: boolean; unlockButton: boolean } {
  nc.realm = realm;
  nc.lastTapped = realm;
  nc.highlighted = realm;
  sh.events.push({ type: "RealmHighlighted", realm });
  const locked = realmLocked(sh.edition, realm);
  return { realm, strengths: "at a glance", padlock: locked, unlockButton: locked };
}

/** The new campaign track's lead voice follows the highlighted realm (SHELL-037). */
export const leadVoice = (nc: NewCampaign): string | null => nc.highlighted;

export function nextStep(sh: Shell, nc: NewCampaign): void {
  if (nc.step === 1 && !nc.realm) throw new Error("Choose a realm first");
  if (nc.step === 1 && realmLocked(sh.edition, nc.realm!)) throw new Error("The realm is locked");
  nc.step = Math.min(3, nc.step + 1) as 1 | 2 | 3;
  syncStep(sh, nc);
}

/** Back on new campaign: one step back, and from step 1 to the main menu without asking (SHELL-030, SHELL-036). */
export function newCampaignBack(sh: Shell, nc: NewCampaign): "previous step" | "main menu" {
  if (nc.step > 1) {
    nc.step = (nc.step - 1) as 1 | 2;
    syncStep(sh, nc);
    return "previous step";
  }
  pop(sh);
  return "main menu";
}

function syncStep(sh: Shell, nc: NewCampaign): void {
  const f = top(sh);
  if (f?.id === "new_campaign") f.step = nc.step;
}

/** Step 2: the options and their presets (SHELL-033). */
export const campaignOptions = (): string[] => [...SHELL.campaignOptions];

/** The end dates offered: 31 August of each year from the earliest (provisional 1494) to 1939, 1939 by default (SHELL-033, D-SHELL-14). */
export function endDateChoices(): { dates: string[]; default: string } {
  const last = Number(SHELL.campaignEndDateDefault.slice(0, 4));
  const dates: string[] = [];
  for (let y = SHELL.endDateEarliestYear; y <= last; y++) dates.push(`${y}-08-31`);
  return { dates, default: SHELL.campaignEndDateDefault };
}

export const isValidEndDate = (date: string): boolean => endDateChoices().dates.includes(date);

/** A preset fills the whole step: one value for every option. */
export function applyPreset(nc: NewCampaign, preset: Record<string, string>): string[] {
  const missing = SHELL.campaignOptions.filter((o) => !(o in preset));
  if (missing.length) throw new Error(`A preset must set every option; missing ${missing.join(", ")}`);
  nc.options = SHELL.campaignOptions.map((o) => preset[o]!);
  return nc.options;
}

/** Step 3: the summary card and one big Begin button (SHELL-034). */
export function beginStep(nc: NewCampaign, realm: { banner: string; ruler: string; capital: string; startDate: string }): { summary: Record<string, string | string[]>; button: "Begin" } {
  if (nc.step !== 3 || !nc.realm) throw new Error("Not on the Begin step");
  return { summary: { banner: realm.banner, ruler: realm.ruler, capital: realm.capital, "start date": realm.startDate, options: nc.options ?? nc.lastOptions }, button: "Begin" };
}

/** Quick start: Begin with the last options and the last realm tapped, or the first suggested (SHELL-035). */
export function quickStart(sh: Shell, nc: NewCampaign): void {
  nc.realm = nc.lastTapped ?? nc.suggested[0] ?? null;
  nc.options = [...nc.lastOptions];
  nc.step = 3;
  syncStep(sh, nc);
}

// ---------------------------------------------------------------------------
// Load and loading (SHELL-038..044)

/** LoadSave: no question from the main menu; from the game menu only with unsaved turns (SHELL-039, SHELL-040). */
export function pickLoad(sh: Shell, saveId: string): { question: string } | { loading: true } {
  const f = top(sh);
  if (f?.id !== "load") throw new Error("The Load screen is not open");
  const c = sh.campaign;
  if (f.openedFrom === "game_menu" && c && c.unsavedTurns > 0) {
    push(sh, { id: "confirmation", subject: "unsaved turns", decideLater: true });
    return { question: SHELL.strings.leaveUnsaved.replace("{date}", formatMonthYear(c.date)) };
  }
  replaceAll(sh, { id: "loading", subject: saveId });
  sh.events.push({ type: "CampaignLoadRequested", save: saveId });
  return { loading: true };
}

export interface Tip {
  text: string;
  era?: string;
  region?: string;
  newPlayer?: boolean;
}

/** Tips that fit the realm and date: era from the ages running that year, region of the realm (SHELL-041). */
export function fittingTips(tips: readonly Tip[], o: { year: number; region: string; newPlayer: boolean }): Tip[] {
  const eras = new Set(agesRunning(o.year).map((a) => a.id));
  return tips.filter((t) => (!t.era || eras.has(t.era)) && (!t.region || t.region === o.region) && (t.newPlayer === undefined || t.newPlayer === o.newPlayer));
}

export interface LoadingScreen {
  tips: Tip[];
  index: number;
  steps: string[];
  done: number;
}

export function openLoading(tips: readonly Tip[], o: { year: number; region: string; newPlayer: boolean }): LoadingScreen {
  return { tips: fittingTips(tips, o), index: 0, steps: [...SHELL.loadingSteps], done: 0 };
}

export const currentTip = (l: LoadingScreen): Tip | undefined => l.tips[l.index];

/** Tapping, or left and right, shows another tip. */
export function otherTip(l: LoadingScreen, dir: "left" | "right" | "tap"): Tip | undefined {
  const n = l.tips.length;
  if (n) l.index = (l.index + (dir === "left" ? n - 1 : 1)) % n;
  return currentTip(l);
}

/** The bar follows the real loading steps, not a timer (SHELL-042). */
export function stepDone(l: LoadingScreen): { step: string; share: number } {
  l.done = Math.min(l.steps.length, l.done + 1);
  return { step: l.steps[l.done - 1]!, share: l.done / l.steps.length };
}

/** After loading, the map opens without a tap once the tip has had 2 s (SHELL-043). */
export const mapOpensAfter = (tipShownSeconds: number): number => Math.max(0, SHELL.tipMinSeconds - tipShownSeconds);

// ---------------------------------------------------------------------------
// The unlock flow (SHELL-105, SHELL-106)

export interface UnlockFlow {
  from: Frame;
  realm: string | null;
}

export function openUnlock(sh: Shell, o: { realm?: string; online: boolean }): { flow: UnlockFlow | null; message: string | null } {
  if (!o.online) return { flow: null, message: SHELL.strings.noConnection };
  const from = top(sh)!;
  push(sh, { id: "unlock", openedFrom: from.id });
  return { flow: { from, realm: o.realm ?? null }, message: null };
}

/** The Unlock screen: one purchase, the full game, unlocking every realm; Buy, and Restore purchases on phones (SHELL-135). */
export function unlockScreen(platform: Platform): { purchase: string; unlocks: string; price: string; buttons: string[] } {
  const phone = platform === "iOS" || platform === "Android";
  return { purchase: SHELL.unlock.purchase, unlocks: SHELL.unlock.unlocks, price: SHELL.unlock.price, buttons: [...SHELL.unlock.buttons, ...(phone ? SHELL.unlock.phoneButtons : [])] };
}

/** The unlock flow returns where it was opened; success unlocks every realm and removes the Full game ribbon; failure adds no message of its own. */
export function purchaseResult(sh: Shell, flow: UnlockFlow, outcome: "succeeds" | "is cancelled" | "fails", profile: Profile): { at: string; chosen: string | null; message: null } {
  if (topId(sh) === "unlock") pop(sh);
  if (outcome === "succeeds") {
    profile.purchased = true;
    sh.edition = "full game";
  }
  return { at: top(sh)!.id, chosen: flow.realm, message: null };
}

// ---------------------------------------------------------------------------
// The Load list (SHELL-038, D-SHELL-4)

export interface SaveSummary {
  id: string;
  banner: string;
  realm: string;
  date: GameDate;
  /** Real date and time saved, ISO. */
  savedAt: string;
  kind: "manual" | "autosave" | "ironman";
}

export interface LoadRow {
  id: string;
  banner: string;
  realm: string;
  date: string;
  savedAt: string;
  mark: "autosave" | "ironman" | null;
}

/** One flat list, newest first, not grouped by campaign. */
export function loadList(saves: readonly SaveSummary[]): LoadRow[] {
  return [...saves]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map((s) => ({ id: s.id, banner: s.banner, realm: s.realm, date: formatMonthYear(s.date), savedAt: s.savedAt, mark: s.kind === "manual" ? null : s.kind }));
}

/** Tapping a save shows its card with Load and Delete. */
export const saveCard = (_row: LoadRow): string[] => ["Load", "Delete"];
