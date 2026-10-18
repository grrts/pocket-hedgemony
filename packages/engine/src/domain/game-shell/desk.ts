/**
 * The player's desk over the map (SHELL-138..148, playtest feedback): the
 * Dispatches log kept from week to week, short alerts over the map with Go
 * there, Answer or Watch, the week waiting at a battle of the player's and the
 * battle strip, AI peace offers waiting for an answer, the country card's tabs,
 * picking commanders, Space for End turn, and the layout checks every subject,
 * overview and screen must pass (SHELL-144..146). The client reads the same
 * numbers and rules from here.
 */
import { checkTouchRules, layoutFor, TAP_GAP, tapTargetMin, visibleMapArea, type Insets, type Rect, type Shape, type TouchRuleBreak } from "../map-presentation/index.ts";
import { post, visibleLines, type AttentionList } from "./attention.ts";
import { pressEndTurn, turnOf, type EndTurnOutcome } from "./turn.ts";
import { layerOf, openCard, panelLayout, push, SCREEN_IDS, SHELL, topId, type CardRef, type FrameId, type Shell } from "./stack.ts";

export const DESK = SHELL.desk;
/** How slowly the week plays while the player watches a battle: one 4-hour step every 1.2 s (SHELL-148, provisional). */
export const WATCH_STEP_MS: number = DESK.watchStepMs;
/** One 4-hour step while the week plays without watching. */
export const BATTLE_STEP_MS: number = DESK.battleStepMs;

// ---------------------------------------------------------------------------
// The Dispatches log (SHELL-147)

export interface Dispatch {
  /** The day it happened, ISO (YYYY-MM-DD). */
  day: string;
  text: string;
  /** It concerns the player's realm. */
  mine: boolean;
  province?: string;
}

export interface PeaceOfferOnScreen {
  id: string;
  from: string;
  terms: "take" | "white" | "give";
}

export type AlertButton = "Go there" | "Answer" | "Watch";

export interface Alert {
  text: string;
  /** A battle's alert offers Watch and Go there; a siege's Go there; an offer or a call Answer. */
  buttons: AlertButton[];
  province?: string;
  /** A battle's alert stays while the week waits on it; the rest go after `alertSeconds`. */
  stays: boolean;
}

export interface WatchedBattle {
  place: string;
  sides: { realm: string; men: number; start: number }[];
  round: number;
  rounds: number;
  /** How it ended, once it has. */
  result?: string;
}

export interface Desk {
  /** Newest first, at most `dispatchesKept`. */
  log: Dispatch[];
  /** Dispatches about the player's realm since the log was last opened. */
  unread: number;
  offers: PeaceOfferOnScreen[];
  /** Offers put off until the next turn (SHELL-092). */
  putOff: Set<string>;
  calls: string[];
  alerts: Alert[];
  /** The week waits at a battle of the player's (SHELL-148). */
  paused: boolean;
  /** The battle the player watches, and how fast the week plays meanwhile. */
  watching: WatchedBattle | null;
  stepMs: number;
  /** The Dispatches show only what concerns the player's realm. */
  onlyMine: boolean;
}

const desks = new WeakMap<Shell, Desk>();

export function deskOf(sh: Shell): Desk {
  let d = desks.get(sh);
  if (!d) desks.set(sh, (d = { log: [], unread: 0, offers: [], putOff: new Set(), calls: [], alerts: [], paused: false, watching: null, stepMs: BATTLE_STEP_MS, onlyMine: false }));
  return d;
}

/** A week's news goes into the log, newest first; nothing opens by itself (SHELL-147). */
export function logDispatches(sh: Shell, news: readonly Dispatch[]): void {
  const d = deskOf(sh);
  const fresh = [...news].sort((a, b) => b.day.localeCompare(a.day));
  d.log = [...fresh, ...d.log].slice(0, DESK.dispatchesKept);
  d.unread += fresh.filter((x) => x.mine).length;
}

/** What waits for an answer and is not put off. */
const waitingOffers = (d: Desk) => d.offers.filter((o) => !d.putOff.has(o.id));

/** The Dispatches button in the top bar: new dispatches about the realm plus calls and offers waiting; it blinks while one waits. */
export function dispatchesButton(sh: Shell): { count: number; blinks: boolean; place: "top bar" } {
  const d = deskOf(sh);
  const waiting = d.calls.length + waitingOffers(d).length;
  return { count: d.unread + waiting, blinks: waiting > 0, place: "top bar" };
}

/** Taps the Dispatches button: the log opens as a card, its count clears. */
export function openDispatches(sh: Shell): void {
  const d = deskOf(sh);
  d.unread = 0;
  d.alerts = d.alerts.filter((a) => a.stays);
  if (topId(sh) !== "turn_report") push(sh, { id: "turn_report", subject: "Dispatches" });
}

/** The log as the card shows it: Waiting for you first, then a heading per day, newest day first. */
export function dispatchesView(sh: Shell): { waiting: string[]; days: { day: string; lines: string[] }[] } {
  const d = deskOf(sh);
  const days: { day: string; lines: string[] }[] = [];
  for (const x of d.onlyMine ? d.log.filter((y) => y.mine) : d.log) {
    const last = days.at(-1);
    if (last?.day === x.day) last.lines.push(x.text);
    else days.push({ day: x.day, lines: [x.text] });
  }
  return { waiting: [...d.calls, ...d.offers.map((o) => `${o.from} offers peace`)], days };
}

/** An alert over the map, under the top bar; the oldest gives way past three, never one the week waits on. */
export function alertOverMap(sh: Shell, a: Alert): void {
  const d = deskOf(sh);
  if (d.alerts.some((x) => x.text === a.text)) return;
  d.alerts.push(a);
  while (d.alerts.length > DESK.alertsShown) {
    const i = d.alerts.findIndex((x) => !x.stays);
    d.alerts.splice(i < 0 ? 0 : i, 1);
  }
}

export type Beginning = { kind: "battle" | "siege"; province: string; at?: "sea" };

/**
 * A battle or siege of the player's begins while the week plays (SHELL-147,
 * SHELL-148): a siege, or a battle at sea, is said over the map with Go there;
 * a battle on land pauses the week with Watch until it ends.
 */
export function begins(sh: Shell, b: Beginning): Alert {
  const d = deskOf(sh);
  if (b.kind === "battle" && b.at !== "sea") {
    const a: Alert = { text: `A battle has begun at ${b.province}. The week waits.`, buttons: ["Watch", "Go there"], province: b.province, stays: true };
    alertOverMap(sh, a);
    if (!d.watching) d.paused = true;
    return a;
  }
  const a: Alert = { text: b.kind === "siege" ? `A siege has begun at ${b.province}.` : `A battle at sea has begun at ${b.province}.`, buttons: ["Go there"], province: b.province, stays: false };
  alertOverMap(sh, a);
  return a;
}

/**
 * Go there centres the map on the province and selects it (a battle's alert
 * stays while the week waits); Answer opens the Dispatches; Watch goes to the
 * battle and plays on slowly.
 */
export function tapAlert(sh: Shell, a: Alert, button: AlertButton, battle?: WatchedBattle): void {
  const d = deskOf(sh);
  if (!a.buttons.includes(button)) throw new Error(`The alert has no ${button}`);
  if (!a.stays) d.alerts = d.alerts.filter((x) => x !== a);
  if (button === "Answer") return openDispatches(sh);
  sh.camera = { ...sh.camera, on: a.province!, level: "Local" };
  if (button === "Go there") {
    sh.selection = { kind: "province", name: a.province! };
    return;
  }
  d.watching = battle ?? { place: a.province!, sides: [], round: 0, rounds: 0 };
  d.paused = false;
  d.stepMs = WATCH_STEP_MS;
}

/** End turn while the week waits at a battle: it plays on at the usual pace without watching. */
export function playOnWithoutWatching(sh: Shell): void {
  const d = deskOf(sh);
  d.paused = false;
  d.stepMs = BATTLE_STEP_MS;
}

/** One round of the watched battle: the men each side has left. */
export function watchRound(sh: Shell, men: readonly number[]): void {
  const w = deskOf(sh).watching;
  if (!w || w.result) throw new Error("No battle is being watched");
  w.round = Math.min(w.rounds, w.round + 1);
  men.forEach((m, k) => (w.sides[k]!.men = m));
}

/** The watched battle ends: the strip says how, its alert goes and the week plays at the usual pace again. */
export function watchedBattleEnds(sh: Shell, result: string): void {
  const d = deskOf(sh);
  if (!d.watching) throw new Error("No battle is being watched");
  d.watching.result = result;
  d.alerts = d.alerts.filter((a) => !(a.stays && a.province === d.watching!.place));
  d.stepMs = BATTLE_STEP_MS;
}

/** The battle strip over the map: both realms, men left of men at the start, the round of the rounds; then how it ended. */
export function battleStrip(sh: Shell): { sides: string[]; round: string; result?: string; place: "along the bottom between the overview button and End turn" } | null {
  const w = deskOf(sh).watching;
  if (!w) return null;
  return {
    sides: w.sides.map((x) => `${x.realm} ${x.men} of ${x.start}`),
    round: `round ${w.round} of ${w.rounds}`,
    ...(w.result ? { result: w.result } : {}),
    place: "along the bottom between the overview button and End turn",
  };
}

// ---------------------------------------------------------------------------
// AI peace offers (SHELL-141, DIPL-195)

/** An AI realm's peace offer reaches the player at the turn's end: turn report, Waiting for you, an alert with Answer. */
export function receivePeaceOffer(sh: Shell, o: PeaceOfferOnScreen): void {
  const d = deskOf(sh);
  d.offers = [...d.offers.filter((x) => x.from !== o.from), o];
  post(sh.attention, { id: `peace ${o.id}`, kind: "a peace offer", target: { kind: "realm", name: o.from }, urgency: 2 });
  turnOf(sh).report.push(`${o.from} offers peace`);
  alertOverMap(sh, { text: `${o.from} offers peace.`, buttons: ["Answer"], stays: false });
}

function dropAttention(list: AttentionList, id: string): void {
  list.lines = list.lines.filter((l) => l.id !== id);
}

/** The player makes peace or fights on: the offer and its marks go. */
export function answerPeaceOffer(sh: Shell, id: string, _yes: boolean): void {
  const d = deskOf(sh);
  d.offers = d.offers.filter((o) => o.id !== id);
  d.putOff.delete(id);
  dropAttention(sh.attention, `peace ${id}`);
  sh.events.push({ type: "PeaceOfferAnswered", offer: id, yes: _yes });
}

/** Later: the offer still waits in the Dispatches, but marks nothing until the next turn (SHELL-092). */
export function putOffPeaceOffer(sh: Shell, id: string): void {
  const d = deskOf(sh);
  if (!d.offers.some((o) => o.id === id)) throw new Error(`No peace offer ${id}`);
  d.putOff.add(id);
}

/** A new turn: offers put off wait to be answered again. */
export function newTurnOnDesk(sh: Shell): void {
  deskOf(sh).putOff.clear();
}

/** Lines in Waiting for you, from the Attention list. */
export const waitingForYou = (sh: Shell): string[] => visibleLines(sh.attention).filter((l) => l.group === "Waiting for you").map((l) => l.sentence);

// ---------------------------------------------------------------------------
// The country card (SHELL-139, SHELL-140, DIPL-196, REALM-176)

export const COUNTRY_CARD_TABS: readonly string[] = DESK.countryCardTabs;
export type CountryTab = (typeof DESK.countryCardTabs)[number];

/** Opens a realm's country card: it opens on General. */
export function openCountryCard(sh: Shell, realm: string): CardRef {
  const card: CardRef & { tab: string } = { kind: "realm", name: realm, tab: COUNTRY_CARD_TABS[0]! };
  openCard(sh, card);
  return card;
}

/** The tab row in order; a dot marks Diplomacy while an offer from that realm waits (or any offer, on the player's own card). */
export function countryCardTabs(sh: Shell, realm: string): { name: string; marked: boolean }[] {
  const own = sh.campaign?.realm === realm;
  const waits = waitingOffers(deskOf(sh)).some((o) => own || o.from === realm);
  return COUNTRY_CARD_TABS.map((name) => ({ name, marked: name === "Diplomacy" && waits }));
}

/** What a tab of the country card holds. */
export function countryTabHolds(tab: string): string[] {
  const held = (DESK.tabHolds as Record<string, string[]>)[tab];
  if (!held) throw new Error(`No country card tab ${tab}`);
  return held;
}

/** The tab of the country card that holds an action or figure. */
export function homeOf(item: string): string | null {
  return COUNTRY_CARD_TABS.find((t) => countryTabHolds(t).includes(item)) ?? null;
}

// ---------------------------------------------------------------------------
// Picking commanders (SHELL-138, SHELL-142)

/** Selecting an army, on the map or in the Army list: the camera never moves or zooms. */
export function selectArmy(sh: Shell, army: string): void {
  sh.selection = { kind: "army", name: army };
  sh.events.push({ type: "MapSelectionChanged", selection: army });
}

/** The box a banner takes taps in: at least a tap target around its centre, in points. */
export function bannerTapBox(banner: { x: number; y: number; w: number; h: number }, min = tapTargetMin()): { x: number; y: number; w: number; h: number } {
  const w = Math.max(banner.w, min);
  const h = Math.max(banner.h, min);
  return { x: banner.x + banner.w / 2 - w / 2, y: banner.y + banner.h / 2 - h / 2, w, h };
}

/** The banner a tap picks: of those whose box holds the point, the one whose centre is nearest. */
export function bannerAt<T extends { x: number; y: number; w: number; h: number }>(banners: readonly T[], px: number, py: number, min = tapTargetMin()): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const b of banners) {
    const box = bannerTapBox(b, min);
    if (px < box.x || px > box.x + box.w || py < box.y || py > box.y + box.h) continue;
    const dist = (b.x + b.w / 2 - px) ** 2 + (b.y + b.h / 2 - py) ** 2;
    if (dist < bestD) {
      best = b;
      bestD = dist;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Space (SHELL-143)

/** Whether a key press on the map ends the turn: Space does, unless a text field has focus. */
export const keyEndsTurn = (code: string, textFieldFocused: boolean): boolean => (DESK.keys as Record<string, string>)[code] === "End turn" && !textFieldFocused;

/** A key pressed on the map: Space is a tap on End turn (the confirmation setting and unanswered events still apply). */
export function pressKey(sh: Shell, code: string, textFieldFocused = false): EndTurnOutcome | "typed" | "nothing" {
  if (textFieldFocused) return code === "Space" ? "typed" : "nothing";
  if (topId(sh) !== "map" || !keyEndsTurn(code, false)) return "nothing";
  return pressEndTurn(sh);
}

// ---------------------------------------------------------------------------
// Layout checks (SHELL-144..146)

/** Every action and figure of a subject sits on its one home, and on no unrelated panel (SHELL-144). */
export function homeCheck(subject: string): { home: string; items: string[]; elsewhere: { item: string; tab: string }[] } {
  const home = (DESK.subjects as Record<string, string>)[subject];
  if (!home) throw new Error(`No home named for ${subject}`);
  const items = countryTabHolds(home);
  const elsewhere = COUNTRY_CARD_TABS.filter((t) => t !== home).flatMap((t) => countryTabHolds(t).filter((i) => items.includes(i)).map((item) => ({ item, tab: t })));
  return { home, items, elsewhere };
}

export type Tracked = keyof typeof DESK.overviews;

/** The overview of a thing the player keeps track of: what it shows at a glance and what one tap opens (SHELL-145). */
export function overviewOf(thing: Tracked): { overview: string; shows: string[]; opens: string; taps: 1 } {
  const o = DESK.overviews[thing];
  return { overview: o.overview, shows: [...o.shows], opens: o.opens, taps: 1 };
}

/** The phone's safe area in landscape: the notch on either side and the home indicator below. */
export const PHONE_SAFE_AREA: Insets = DESK.phoneSafeArea;

/** The in-campaign screens and cards: everything over the map. */
export const IN_CAMPAIGN_SCREENS: FrameId[] = SCREEN_IDS.filter((id) => !["boot", "first_run", "title", "main_menu", "new_campaign", "loading", "load", "map", "error", "unlock", "final_result", "game_over", "campaign_end"].includes(id));

/**
 * Lays out a screen or card for a window: its frame inside the safe area, its
 * close button, a row of tabs and its buttons, all tap targets; and the map
 * left visible beside it, where its layer allows (cards and pop-overs).
 */
export function screenLayout(id: FrameId, win: { width: number; height: number }, shape: Shape, safe: Insets = PHONE_SAFE_AREA): { frame: Rect; targets: Rect[]; mapBeside: { x: number; y: number; w: number; h: number } | null } {
  const s = tapTargetMin();
  const inner = { x: safe.left, y: safe.top, w: win.width - safe.left - safe.right, h: win.height - safe.top - safe.bottom };
  const layer = layerOf(id);
  let frame: Rect;
  let mapBeside: { x: number; y: number; w: number; h: number } | null = null;
  if (layer === "card") {
    const c = layoutFor(shape).card;
    const v = visibleMapArea(shape, win.width, win.height);
    if (c.kind === "bottom sheet") frame = { name: id, x: inner.x, y: Math.max(inner.y, v.h), w: inner.w, h: inner.y + inner.h - Math.max(inner.y, v.h) };
    else frame = { name: id, x: inner.x, y: inner.y, w: Math.max(4 * s, v.x - inner.x), h: inner.h };
    mapBeside = c.kind === "bottom sheet" ? { x: 0, y: 0, w: win.width, h: frame.y } : { x: frame.x + frame.w, y: 0, w: win.width - frame.x - frame.w, h: win.height };
  } else if (layer === "overlay") {
    const w = Math.min(320, inner.w);
    frame = { name: id, x: inner.x + inner.w - w, y: inner.y, w, h: Math.min(inner.h, 5 * s) };
    mapBeside = { x: 0, y: 0, w: frame.x, h: win.height };
  } else frame = { name: id, ...inner };
  const close: Rect = { name: "Close", x: frame.x + frame.w - s, y: frame.y, w: s, h: s, frequent: true };
  // The tab row: as wide as fits beside the close button, a gap between tabs; tabs past the edge scroll in.
  const n = COUNTRY_CARD_TABS.length;
  const tabW = Math.max(s, Math.floor((frame.w - s - n * TAP_GAP) / n));
  const tabs: Rect[] = COUNTRY_CARD_TABS.map((t, k) => ({ name: `tab ${t}`, x: frame.x + k * (tabW + TAP_GAP), y: frame.y, w: tabW, h: s, frequent: true })).filter((r) => r.x + r.w + TAP_GAP <= close.x);
  const body = panelLayout(["Choice", "Other choice"], { width: frame.w, height: frame.h - s }).map((r) => ({ ...r, x: r.x + frame.x, y: r.y + frame.y + s }));
  return { frame, targets: [close, ...tabs, ...body], mapBeside };
}

/** The touch rules a screen breaks on a window (none when it fits): size, gaps and the safe area (SHELL-146). */
export function fitsWindow(id: FrameId, win: { width: number; height: number }, shape: Shape, safe: Insets = PHONE_SAFE_AREA): TouchRuleBreak[] {
  const l = screenLayout(id, win, shape, safe);
  const breaks = checkTouchRules(l.targets, { width: win.width, height: win.height, safe });
  if (l.frame.x < safe.left || l.frame.y < safe.top || l.frame.x + l.frame.w > win.width - safe.right || l.frame.y + l.frame.h > win.height - safe.bottom) breaks.push({ rule: "safe area", names: [id] });
  return breaks;
}
