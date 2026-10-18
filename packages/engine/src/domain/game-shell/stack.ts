/**
 * The screen stack (SHELL aggregate ScreenStack, CardStack): the screen list,
 * Back on every screen (INV-SHELL-1), the map always at the bottom during a
 * campaign (INV-SHELL-2), cards stacked over the map, the Realm book, the game
 * menu and the small in-campaign screens. Every command is a plain function on
 * a Shell value; nothing here touches the simulation.
 */
import config from "../../../../rules/data/domain/game-shell.json" with { type: "json" };
import type { GameDate } from "@ph/rules";
import { formatMonthYear } from "../time-and-turns/index.ts";
import { classifyShape, layoutFor, tapTargetMin, topBarMaxPlaques, type Rect, type Shape, type Window } from "../map-presentation/index.ts";
import { newAttention, type AttentionList } from "./attention.ts";

export const SHELL = config;

// ---------------------------------------------------------------------------
// The screen list (SHELL-124)

export type ScreenId = keyof typeof config.screens;
export type OtherScreenId = keyof typeof config.otherScreens;
export type FrameId = ScreenId | OtherScreenId;
export type ScreenKind = "Full" | "Same screen" | "Overlay" | "Sheet" | "Modal" | "Home" | "Pop-over";

export interface ScreenDef {
  id: FrameId;
  name: string;
  kind: ScreenKind;
  firstFocus: string;
  back: string;
  music: string;
}

export const SCREEN_IDS = Object.keys(config.screens) as ScreenId[];

export function isScreenId(id: string): id is ScreenId {
  return Object.hasOwn(config.screens, id);
}

/** A screen's catalogue row: kind, first focus, Back target, music (SHELL-124). */
export function screen(id: FrameId): ScreenDef {
  const row = (config.screens as Record<string, Omit<ScreenDef, "id">>)[id] ?? (config.otherScreens as Record<string, Omit<ScreenDef, "id">>)[id];
  if (!row) throw new Error(`Unknown screen: ${id}`);
  return { id, ...row, kind: row.kind as ScreenKind };
}

/** The four in-campaign layers of screen-flow §4.1 (SHELL-045). */
export type Layer = "map" | "card" | "full screen" | "modal" | "overlay";

export function layerOf(id: FrameId): Layer {
  switch (screen(id).kind) {
    case "Home":
      return "map";
    case "Sheet":
      return "card";
    case "Modal":
      return "modal";
    case "Overlay":
    case "Pop-over":
      return "overlay";
    default:
      return "full screen";
  }
}

/** Named tracks a screen starts; "unchanged" keeps what plays. */
function trackOf(id: FrameId, current: string | null): string | null {
  const m = screen(id).music;
  if (m === "none") return null;
  if (m.startsWith("unchanged") || m === "stinger only") return current;
  return m;
}

// ---------------------------------------------------------------------------
// The shell value

export type Platform = "Android" | "iOS" | "desktop" | "Steam" | "Steam Deck" | "Steam Machine" | "web";
export type Edition = "full game" | "Steam demo" | "free mobile";

export const isPhonePlatform = (p: Platform): boolean => p === "Android" || p === "iOS";
/** Desktop and Steam have a Quit; phones never do (SHELL-025, SHELL-065). */
export const hasQuit = (p: Platform): boolean => p === "desktop" || p === "Steam" || p === "Steam Deck" || p === "Steam Machine";
/** The free tier: the free mobile download and the Steam demo. */
export const isFreeTier = (e: Edition): boolean => e !== "full game";

export interface CardRef {
  kind: string;
  name: string;
  /** Lines folded out inside the card (gain-and-lose lists). */
  foldOuts?: string[];
}

export interface Frame {
  id: FrameId;
  /** A card's stack, oldest first (CardStack). */
  cards?: CardRef[];
  /** A card folded back to its name tab. */
  folded?: boolean;
  /** Realm book tab and scroll position. */
  tab?: string;
  scroll?: number;
  /** A book screen or modal subject: "Levy", an event id, a question. */
  subject?: string;
  /** Where the screen was opened from, for "where opened" Back targets. */
  openedFrom?: string;
  /** Back returns to this frame (Show on map from the book or Attention). */
  returnTo?: Frame;
  /** A modal Back may put off ("decide later"). */
  decideLater?: boolean;
  /** A battle replayed from the turn report or the Chronicle, not stopped in a turn. */
  replay?: boolean;
  /** The battle view: running (4-hour steps, X-1) or result. */
  battleCard?: "running" | "result";
  /** The standing orders for this one battle, changeable at any step. */
  orders?: string;
  /** New campaign step (1–3). */
  step?: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  /** What the camera is on, by name ("Troyes", "the castle of Orléans"). */
  on?: string;
  level?: "World" | "Region" | "Local";
}

export interface CampaignOnScreen {
  realm: string;
  date: GameDate;
  /** Day of the month the next turn starts on; turns are one week (X-18). */
  day?: number;
  ironman: boolean;
  unsavedTurns: number;
  endDate: string;
  canEarnAchievements: boolean;
  /** Orders or answers given since the last save. */
  changedSinceSave: boolean;
  options: string[];
  /** Wins so far ("World domination" before the end date, X-12). */
  wins?: string[];
}

export type DomainEvent = { type: string; [k: string]: unknown };

export interface Shell {
  platform: Platform;
  edition: Edition;
  window: Window;
  shape: Shape;
  stack: Frame[];
  track: string | null;
  camera: Camera;
  /** The thing selected on the map, shown on the name tab. */
  selection: CardRef | null;
  campaign: CampaignOnScreen | null;
  attention: AttentionList;
  /** The last Realm book tab used (SHELL-059). */
  lastTab: string;
  /** Set once the app is left (Back on the Android title). */
  leftApp: boolean;
  /** Settings the shell reads. */
  settings: { confirmEndTurn: "Off" | "When the Attention screen has lines" | "Always" };
  events: DomainEvent[];
  /** The summary of the save being loaded. */
  pendingLoad?: { realm: string; date: GameDate; borders?: string };
}

const DEFAULT_WINDOWS: Record<Platform, Window> = {
  Android: { width: 844, height: 390, device: "phone" },
  iOS: { width: 844, height: 390, device: "phone" },
  desktop: { width: 1600, height: 900, device: "desktop" },
  Steam: { width: 1600, height: 900, device: "desktop" },
  "Steam Deck": { width: 1280, height: 800, device: "Steam Deck" },
  "Steam Machine": { width: 1920, height: 1080, device: "Steam Machine", tvOutput: true },
  web: { width: 1600, height: 900, device: "desktop" },
};

export function newShell(o: { platform?: Platform; edition?: Edition; window?: Window } = {}): Shell {
  const platform = o.platform ?? "desktop";
  const window = o.window ?? DEFAULT_WINDOWS[platform];
  return {
    platform,
    edition: o.edition ?? "full game",
    window,
    shape: classifyShape(window),
    stack: [],
    track: null,
    camera: { x: 0, y: 0, zoom: 1, level: "World" },
    selection: null,
    campaign: null,
    attention: newAttention(),
    lastTab: "Realm",
    leftApp: false,
    settings: { confirmEndTurn: "Off" },
    events: [],
  };
}

export const top = (sh: Shell): Frame | undefined => sh.stack[sh.stack.length - 1];
export const topId = (sh: Shell): FrameId | undefined => top(sh)?.id;

/** Puts a screen on the stack and starts its music (ScreenOpened). */
export function push(sh: Shell, f: Frame): Frame {
  sh.stack.push(f);
  sh.track = trackOf(f.id, sh.track);
  sh.events.push({ type: "ScreenOpened", id: f.id, ...(f.tab ? { tab: f.tab } : {}) });
  return f;
}

/** Removes the top screen (ScreenClosed); the screen below takes its music back. */
export function pop(sh: Shell): Frame | undefined {
  const f = sh.stack.pop();
  if (f) sh.events.push({ type: "ScreenClosed", id: f.id });
  const below = top(sh);
  if (below) sh.track = trackOf(below.id, sh.track);
  return f;
}

/** Replaces the whole stack with one screen (loading, the map, the main menu). */
export function replaceAll(sh: Shell, f: Frame): void {
  while (sh.stack.length) pop(sh);
  push(sh, f);
}

// ---------------------------------------------------------------------------
// Back (INV-SHELL-1, SHELL-002, SHELL-045, SHELL-090, SHELL-118)

export type BackResult =
  | "popped"
  | "game menu opened"
  | "tap to start"
  | "left the app"
  | "previous step"
  | "put off"
  | "stays open"
  | "back to the map"
  | "card below"
  | "returned"
  | "nothing";

/** The one Back command: pops the top screen, except where the screen list says otherwise. */
export function back(sh: Shell): BackResult {
  const f = top(sh);
  if (!f) return "nothing";
  switch (f.id) {
    case "boot":
    case "first_run":
    case "loading":
    case "turn":
    case "game_over":
    case "campaign_end":
      return "nothing";
    case "title":
      if (sh.platform === "Android") {
        sh.leftApp = true;
        return "left the app";
      }
      return "nothing";
    case "main_menu":
      pop(sh);
      return "tap to start";
    case "new_campaign":
      if ((f.step ?? 1) > 1) {
        f.step = (f.step ?? 1) - 1;
        return "previous step";
      }
      pop(sh);
      return "popped";
    case "map":
      openGameMenu(sh);
      return "game menu opened";
    case "card": {
      const cards = f.cards ?? [];
      if (cards.length > 1) {
        cards.pop();
        return "card below";
      }
      pop(sh);
      if (f.returnTo) {
        push(sh, f.returnTo);
        return "returned";
      }
      return "popped";
    }
    case "battle":
      if (!f.replay) {
        // The battles keep running in 4-hour steps; the switcher on the map reopens the view (X-1).
        pop(sh);
        return "back to the map";
      }
      pop(sh);
      return "popped";
    case "siege": {
      const at = f.subject;
      pop(sh);
      if (at) sh.camera = { ...sh.camera, on: at, level: "Local" };
      return "popped";
    }
    case "event":
    case "peace":
    case "game_menu":
    case "confirmation":
      if (f.decideLater === false) return "stays open";
      pop(sh);
      return f.id === "event" || (f.id === "peace" && f.openedFrom === "an incoming offer") ? "put off" : "popped";
    case "final_result":
    case "error":
      replaceAll(sh, { id: "main_menu" });
      return "popped";
    default:
      pop(sh);
      return "popped";
  }
}

/** Back presses from the top of the stack down to the map with nothing open (INV-SHELL-3, SHELL-003). */
export function backPressesToMap(sh: Shell): number {
  const copy: Shell = { ...sh, stack: sh.stack.map((f) => ({ ...f, ...(f.cards ? { cards: [...f.cards] } : {}) })), events: [] };
  let n = 0;
  while (topId(copy) !== "map") {
    const r = back(copy);
    n++;
    if (r === "nothing" || r === "stays open" || n > 20) return Infinity;
  }
  return n;
}

/** The screen the player sees under a modal is dimmed; modals take all input (INV-SHELL-4). */
export function acceptsInput(sh: Shell, frame: Frame): boolean {
  const t = top(sh);
  if (!t || t === frame) return true;
  return layerOf(t.id) !== "modal";
}

export const mapDimmed = (sh: Shell): boolean => sh.stack[0]?.id === "map" && layerOf(topId(sh) ?? "map") === "modal";

// ---------------------------------------------------------------------------
// The map, cards and the name tab (SHELL-001, SHELL-045..058)

/** Loads a campaign onto the map: the map is the bottom of the stack from then on (INV-SHELL-2). */
export function enterCampaign(sh: Shell, c: Partial<CampaignOnScreen> & { realm: string; date: GameDate }): void {
  sh.campaign = {
    ironman: false,
    unsavedTurns: 0,
    endDate: config.campaignEndDateDefault,
    canEarnAchievements: true,
    changedSinceSave: false,
    options: [],
    ...c,
  };
  replaceAll(sh, { id: "map" });
  sh.selection = null;
}

export const mapLoaded = (sh: Shell): boolean => sh.stack[0]?.id === "map";

/** SelectOnMap: a tap only selects and shows the name tab; a second tap or the tab opens the card (SHELL-056). */
export function tapOnMap(sh: Shell, thing: CardRef): "selected" | "card opened" {
  const card = cardFrame(sh);
  if (sh.selection?.name === thing.name && !card) {
    openCard(sh, thing);
    return "card opened";
  }
  if (card) closeCards(sh);
  sh.selection = { ...thing };
  sh.events.push({ type: "MapSelectionChanged", selection: thing.name });
  return "selected";
}

/** Tapping the name tab opens the selected thing's card, or unfolds a folded card (SHELL-056, SHELL-057). */
export function tapNameTab(sh: Shell): void {
  const f = cardFrame(sh);
  if (f?.folded) {
    f.folded = false;
    return;
  }
  if (sh.selection) openCard(sh, sh.selection);
}

export const cardFrame = (sh: Shell): Frame | undefined => sh.stack.find((f) => f.id === "card");

/** OpenCard: a card over the map, or stacked on the open card (SHELL-046). */
export function openCard(sh: Shell, card: CardRef): Frame {
  const f = cardFrame(sh);
  sh.selection = { kind: card.kind, name: card.name };
  if (f && topId(sh) === "card") {
    f.cards!.push({ ...card });
    f.folded = false;
    return f;
  }
  return push(sh, { id: "card", cards: [{ ...card }] });
}

/** The card on top of the card stack. */
export const topCard = (sh: Shell): CardRef | undefined => cardFrame(sh)?.cards?.at(-1);

/** "Back to <name>" names the card below (INV-SHELL-7). */
export function backToLabel(sh: Shell): string | null {
  const cards = cardFrame(sh)?.cards ?? [];
  const below = cards[cards.length - 2];
  return below ? `Back to ${below.name}` : null;
}

/** Tapping empty map clears the card stack (INV-SHELL-6). */
export function tapEmptyMap(sh: Shell): void {
  if (topId(sh) === "turn_report") {
    pop(sh);
    return;
  }
  closeCards(sh);
  sh.selection = null;
}

function closeCards(sh: Shell): void {
  while (sh.stack.some((f) => f.id === "card")) {
    const f = top(sh)!;
    pop(sh);
    if (f.id === "card") break;
  }
}

/** FoldAwayCard: the card shrinks to its name tab (SHELL-057). */
export function foldAway(sh: Shell): void {
  const f = cardFrame(sh);
  if (f) f.folded = true;
}

/** A gain-and-lose list folds out inside the card, never as a new screen (SHELL-058). */
export function foldOut(sh: Shell, line: string): void {
  const c = topCard(sh);
  if (!c) throw new Error("No card open");
  (c.foldOuts ??= []).push(line);
}

/** What the screen shows of an open card: the card, or only its name tab when folded. */
export function cardView(sh: Shell): { card: CardRef; folded: boolean } | null {
  const f = cardFrame(sh);
  const c = f?.cards?.at(-1);
  return f && c ? { card: c, folded: f.folded === true } : null;
}

/** Opens a full screen or sheet over whatever is open (siege, realm book, attention, …). */
export function openScreen(sh: Shell, id: FrameId, extra: Partial<Frame> = {}): Frame {
  if (id === "card") return openCard(sh, { kind: "province", name: extra.subject ?? "Champagne" });
  if (id === "realm_book") return openRealmBook(sh, extra.tab);
  return push(sh, { id, ...extra });
}

/** The top bar: realm name and banner, date, gold and its change, levies; a phone holds five plaques (SHELL-047). */
export function topBar(sh: Shell, extraPlaques: string[] = []): { shown: string[]; movedToCountryCard: string[] } {
  const all = [...config.topBar, ...extraPlaques];
  const max = sh.shape === "Short wide" ? topBarMaxPlaques() : Infinity;
  return { shown: all.slice(0, max), movedToCountryCard: all.slice(max) };
}

export const toolColumn = (): string[] => [...config.toolColumn];

/** Continue's label: "France · May 1503". */
export const campaignLabel = (realm: string, date: GameDate, day?: number): string => `${realm} · ${day ? dayDate(date, day) : formatMonthYear(date)}`;

/** The date with its day, as the top bar shows it each weekly turn: "11 November 1444" (X-18). */
export const dayDate = (date: GameDate, day: number): string => `${day} ${formatMonthYear(date)}`;

/** How a card is laid out for the current shape (SHELL-053..055). */
export const cardLayout = (sh: Shell) => layoutFor(sh.shape).card;

// ---------------------------------------------------------------------------
// The Realm book (SHELL-059..063)

export const REALM_BOOK_TABS = Object.keys(config.realmBook);

export function tabHolds(tab: string): string[] {
  const t = (config.realmBook as Record<string, string[]>)[tab];
  if (!t) throw new Error(`No Realm book tab ${tab}`);
  return t;
}

/** A new system adds a section inside a tab, never a seventh tab (SHELL-060). */
export function addBookSection(tabs: Record<string, string[]>, tab: string, section: string): Record<string, string[]> {
  if (!tabs[tab]) {
    if (Object.keys(tabs).length >= config.realmBookMaxTabs) throw new Error("The Realm book holds six tabs at most");
  }
  return { ...tabs, [tab]: [...(tabs[tab] ?? []), section] };
}

/** OpenRealmBook: on the tab the player last used (SHELL-059). */
export function openRealmBook(sh: Shell, tab?: string): Frame {
  const t = tab ?? sh.lastTab;
  tabHolds(t);
  sh.lastTab = t;
  return push(sh, { id: "realm_book", tab: t, scroll: 0 });
}

export function switchTab(sh: Shell, tab: string): void {
  const f = top(sh);
  if (f?.id !== "realm_book") throw new Error("The Realm book is not open");
  tabHolds(tab);
  f.tab = tab;
  f.scroll = 0;
  sh.lastTab = tab;
}

/** ShowOnMap: the book or Attention closes, the camera moves, the card opens; Back returns to the same place (SHELL-062, SHELL-086). */
export function showOnMap(sh: Shell, thing: CardRef): void {
  const from = top(sh);
  if (!from || (from.id !== "realm_book" && from.id !== "attention")) throw new Error("Show on map needs the Realm book or Attention");
  pop(sh);
  sh.camera = { ...sh.camera, on: thing.name };
  const card = openCard(sh, thing);
  card.returnTo = { ...from };
}

/** A book screen opened from a card is stacked on the card; Back returns to it (SHELL-063). */
export function openBookScreenFromCard(sh: Shell, name: string): Frame {
  if (topId(sh) !== "card") throw new Error("No card open");
  return push(sh, { id: "book_screen", subject: name, openedFrom: topCard(sh)?.name ?? "card" });
}

// ---------------------------------------------------------------------------
// The game menu (SHELL-064..068)

/** OpenGameMenu: a modal over the dimmed map; a menu, not a pause (nothing runs until End turn). */
export function openGameMenu(sh: Shell): Frame {
  return push(sh, { id: "game_menu", decideLater: true });
}

export interface GameMenuContext {
  /** The tutorial is running: its three lines follow Return to the map (SHELL-132). */
  tutorial?: boolean;
  /** The campaign can still earn achievements; once not, the entry says so (SHELL-132). */
  canEarnAchievements?: boolean;
}

/** The game menu's entries: Quit only on desktop and Steam; ironman reads "Save and quit" and has no Load (SHELL-065, SHELL-066, SHELL-132). */
export function gameMenuEntries(platform: Platform, ironman: boolean, o: GameMenuContext = {}): string[] {
  const out = config.gameMenu
    .filter((e) => e !== "Quit" || hasQuit(platform))
    .filter((e) => e !== "Load" || !ironman)
    .map((e) => (e === "Save" && ironman ? "Save and quit" : e))
    .map((e) => (e === "Achievements" && o.canEarnAchievements === false ? config.strings.achievementsOff : e));
  if (o.tutorial) out.splice(1, 0, ...config.tutorialMenuLines);
  return out;
}

export type LeaveResult = { asked: string } | { left: true; saved: boolean };

/** Exit to main menu or Quit: asks only with unsaved turns; ironman saves and leaves without asking (SHELL-068). */
export function leaveCampaign(sh: Shell, how: "Exit to main menu" | "Quit"): LeaveResult {
  const c = sh.campaign;
  if (!c) throw new Error("No campaign loaded");
  if (c.ironman) {
    sh.events.push({ type: "SaveRequested", reason: "ironman exit" });
    finishLeaving(sh, how);
    return { left: true, saved: true };
  }
  if (c.unsavedTurns > 0) {
    push(sh, { id: "confirmation", subject: "unsaved turns", decideLater: true });
    return { asked: `Leave ${formatMonthYear(c.date)} unsaved? · Save first · Leave · Cancel` };
  }
  finishLeaving(sh, how);
  return { left: true, saved: false };
}

function finishLeaving(sh: Shell, how: "Exit to main menu" | "Quit"): void {
  sh.events.push({ type: "CampaignLeft" });
  sh.campaign = null;
  if (how === "Quit") {
    sh.leftApp = true;
    sh.stack = [];
  } else replaceAll(sh, { id: "main_menu" });
}

/** Picks an entry on the game menu. */
export function pickGameMenu(sh: Shell, entry: string): LeaveResult | Frame | null {
  if (topId(sh) !== "game_menu") throw new Error("The game menu is not open");
  switch (entry) {
    case "Return to the map":
      pop(sh);
      return null;
    case "Settings":
      return push(sh, { id: "settings", openedFrom: "game_menu" });
    case "Load":
      if (sh.campaign?.ironman) throw new Error("Ironman has no Load");
      return push(sh, { id: "load", openedFrom: "game_menu" });
    case "Almanac":
      return push(sh, { id: "almanac", openedFrom: "game_menu" });
    case "Achievements":
      return push(sh, { id: "achievements", openedFrom: "game_menu" });
    case "Exit to main menu":
    case "Quit":
      return leaveCampaign(sh, entry);
    default:
      throw new Error(`No game menu entry ${entry}`);
  }
}

// ---------------------------------------------------------------------------
// Other in-campaign screens (SHELL-091..093)

/** The siege view: a full screen from the castle at local zoom or its card; Back goes to the map at the castle. */
export function openSiege(sh: Shell, castle: string): Frame {
  return push(sh, { id: "siege", subject: castle });
}

/** The peace table: a modal returning where it was opened; an incoming offer can only be answered or put off one turn. */
export function openPeace(sh: Shell, from: string): Frame {
  return push(sh, { id: "peace", openedFrom: from, decideLater: true });
}

export function peaceOptions(f: Frame): string[] {
  return f.openedFrom === "an incoming offer" ? ["answer", "put off one turn"] : ["answer", "close"];
}

/** The lens picker: a small pop-over from the tool column back to the map. */
export function openLensPicker(sh: Shell): Frame {
  return push(sh, { id: "lens_picker", openedFrom: "tool column" });
}

/** A confirmation for a destructive action only; cancelling leaves the screen below unchanged. */
export function confirmDestructive(sh: Shell, action: string): Frame {
  return push(sh, { id: "confirmation", subject: action, decideLater: true });
}

export const shapeOf = (sh: Shell): Shape => sh.shape;

// ---------------------------------------------------------------------------
// Main hand (SHELL-116, SHELL-133)

export type HudCorner = "upper left" | "upper right" | "lower left" | "lower right";

/** End turn and the game menu button stay at opposite corners; Main hand Left mirrors both. */
export function hudCorners(mainHand: "Right" | "Left"): { endTurn: HudCorner; gameMenu: HudCorner } {
  return mainHand === "Left" ? { endTurn: "lower left", gameMenu: "upper right" } : { endTurn: "lower right", gameMenu: "upper left" };
}

export function areOpposite(a: HudCorner, b: HudCorner): boolean {
  const [av, ah] = a.split(" ");
  const [bv, bh] = b.split(" ");
  return av !== bv && ah !== bh;
}

// ---------------------------------------------------------------------------
// Panels with a button that loses something (SHELL-115)

/** Buttons that end the turn or lose something. */
export const RISKY_BUTTONS = ["End turn", "Delete save", "Exit to main menu"];

/** The buttons of a panel: the game menu, or a save's card on the Load screen. */
export function panelButtons(panel: "game_menu" | "save card", platform: Platform = "desktop"): string[] {
  return panel === "save card" ? ["Load", "Delete save"] : gameMenuEntries(platform, false);
}

/**
 * Lays a panel out as a centred column of tap targets: risky buttons go last, below a
 * spacer of one tap target, so none sits next to a frequent button or at the screen edge.
 */
export function panelLayout(buttons: readonly string[], window: { width: number; height: number }): Rect[] {
  const s = tapTargetMin();
  const gap = 12;
  const w = Math.min(320, window.width - 4 * s);
  const x = Math.round((window.width - w) / 2);
  const safe = buttons.filter((b) => !RISKY_BUTTONS.includes(b));
  const risky = buttons.filter((b) => RISKY_BUTTONS.includes(b));
  const rows = safe.length + risky.length;
  const height = rows * s + (rows - 1) * gap + (risky.length ? s : 0);
  let y = Math.max(s, Math.round((window.height - height) / 2));
  const out: Rect[] = [];
  for (const name of safe) {
    out.push({ name, x, y, w, h: s, frequent: true });
    y += s + gap;
  }
  if (risky.length) y += s;
  for (const name of risky) {
    out.push({ name, x, y, w, h: s, risky: true });
    y += s + gap;
  }
  return out;
}
