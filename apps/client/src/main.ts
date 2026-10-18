import {
  addDays,
  DAYS_PER_TURN,
  forageLimit,
  groundOf,
  LENS_RELATIONS,
  type LensRelation,
  placeClimate,
  provinceClimate,
  seasonName,
  STEPS_PER_DAY,
  type MapTiles,
  type MarchMap,
  type News,
  type FleetView,
  type Order,
  type PeaceTerms,
  type PlaceClimate,
  type Snapshot,
  realmStrengths,
  WORKS,
  peoplesView,
  FAITH_IDS,
  NO_FAITH,
  NO_TONGUE,
  SLOTS,
  TONGUE_FAMILY,
  faithName,
  type ExplorationView,
} from "@ph/engine";
import type { GameDate } from "@ph/rules";
import { askCard, courtLordHtml, myHouse, mySubjects, myStatecraft, realmStatecraft, subjectCard } from "./ui/statecraft.ts";
import { rebelsUi, risingCard, risingsLine, risingsOverview, verdictCard, type Attacker } from "./ui/rebels.ts";
import { heritageLine, heritageTab } from "./ui/heritage.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { hexToRgb, PALETTE, TERRAINS } from "./art/palette.ts";
import { sprite, spriteUrl } from "./art/sprites.ts";
import { icon, iconUrl, installUiArt, flagCanvas, flagUrl, UI_COLORS, type FlagOf } from "./art/ui.ts";
import { apparentAge, eraOfYear } from "./art/commanders.ts";
import { lookOfCulture, setPortraitYear } from "./art/portraits.ts";
import { EngineClient } from "./engineClient.ts";
import { hideLoading, loadingStage, painted, showLoading } from "./loading.ts";
import { stabilityPlaque, stabilitySection } from "./ui/stability.ts";
import { lockRevolutionButtons, revolutionCardHtml, revolutionSection } from "./ui/revolution.ts";
import { governmentLine, governmentTab, governmentUi } from "./ui/government.ts";
import { isShipKind, provinceTradeLine, routeBar, stopBit, tradeLine, tradeTab, tradeUi, type Routing } from "./ui/trade.ts";
import { beliefData, beliefFacts, beliefLines, beliefUi, peoplesTab } from "./ui/belief.ts";
import { firstOpen, learningBough, learningLine, learningTab, newLearningUi, realmLearningLine, scrollFor } from "./ui/learning.ts";
import { provinceWorks } from "./ui/works.ts";
import { provinceLand } from "./ui/land.ts";
import { castleFoodLine, castlesOpen, foodLine, foodTab } from "./ui/food.ts";
import { commanderPortrait, officialCard, officialOf, officialScreen, officialsTab, paintSiege, siegeView, type SiegeInfo } from "./ui/people.ts";
import { governanceCard, LOYALTY_ORDER, lordScreen, lordsTab, type LordLands, type LordView, type ProvinceRow } from "./ui/lords.ts";
import { loadMapImage, type MapImage } from "./map/loadMap.ts";
import { provinceThumb } from "./map/provinceThumb.ts";
import { drawBattle, drawRoute, drawSiegeMark, drawToken, pruneBattles, weekEnds } from "./map/marchArt.ts";
import { MapView, type OverlayContext } from "./map/mapView.ts";
import { seasonBytes } from "./map/renderer.ts";
import { detectRuntime, type Diagnostics } from "./platform.ts";
import { sound } from "./audio/sound.ts";
import { eventCardHtml, waitingEventsHtml } from "./ui/events.ts";
import { fleetButton, fleetCard, navyTab, portTab } from "./ui/navy.ts";
import { colonyCard, coloniesTab, colonySection, exploreSection, voyageBar } from "./ui/explore.ts";
import { achievementName, achievementsCard, loadProfile, saveProfile, takeAchievements, toastHtml, unseen, type Filter as AchFilter } from "./ui/achievements.ts";
import { Hints, type HintTarget } from "./ui/hints.ts";
import type { Hint } from "@ph/engine/domain/onboarding";
import { provinceLevy } from "@ph/engine/domain/recruiting";
import { musicFacts, newFactMemory, playerPalette, playerWars, remember, type FactMemory } from "./audio/facts.ts";
import { Rng } from "@ph/engine";
import { autosaveDue, continueTarget, longDate, newCampaign, newManualSave, savesConfig, type Campaign, type Platform as SavePlatform } from "@ph/engine/domain/saves";
import { SaveStore, type StoredSave } from "./saves/store.ts";
import { autosaveEvery, autosavesKept, battleStepMs, dayMs, mapPower, onPrefs, setPref, textZoom } from "./settings/prefs.ts";
import { openSettingsAt, renderSettings, setHintsRows } from "./ui/settingsScreen.ts";

const rules = loadDefaultRuleset();
// ?engine=main-thread forces the fallback path, for testing it.
const forceMainThread = new URLSearchParams(location.search).get("engine") === "main-thread";
/** ?month=1..12 (and &day=) draws the map's seasons for that date, for reviewing the art. */
const previewMonth = Number(new URLSearchParams(location.search).get("month")) || 0;
const previewDay = Number(new URLSearchParams(location.search).get("day")) || 15;
const engine = new EngineClient({ forceMainThread });

const diagnostics: Diagnostics = {
  runtime: detectRuntime(),
  origin: location.origin,
  cores: navigator.hardwareConcurrency ?? 1,
  crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
  engineMode: null,
  engineRoundTripMs: null,
  engineError: null,
};
// Read by the wrapper smoke tests.
(globalThis as { __phDiagnostics?: Diagnostics }).__phDiagnostics = diagnostics;

const FEATURED = ["france", "england", "castile", "portugal", "ottomans", "byzantium", "austria", "muscovy", "ming", "aztecs", "inca", "mali"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "11 November 1444", or "11 Nov 1444" short. */
const dateText = (d: GameDate, short = false) => `${d.day ?? 1} ${short ? MONTHS[d.month - 1]!.slice(0, 3) : MONTHS[d.month - 1]} ${d.year}`;

const provinces = rules.provinces;
const nations = rules.nations;
const provinceIndex = new Map(provinces.map((p, i) => [p.id, i]));
const nationIndex = new Map(nations.map((n, i) => [n.id, i]));
const nationRgb = nations.map((n) => hexToRgb(n.color));
const unownedRgb = hexToRgb(PALETTE.unowned);
/** Rebels' colour: land they hold is hatched in it, their bands carry it (REBL-066). */
const REBEL_COLOR = "#2b1d1a";
const rebelRgb = hexToRgb(REBEL_COLOR);
/** A commander by index, as the engine last reported him. */
const cmdOf = (c: number) => snapshot!.commanders[c]!;
const neighborIdx = provinces.map((p) => p.neighbors.map((id) => provinceIndex.get(id)!));
// The same, flat, for walks over the whole map each turn.
const neighborStart = new Int32Array(provinces.length + 1);
neighborIdx.forEach((n, i) => (neighborStart[i + 1] = neighborStart[i]! + n.length));
const neighborList = Int32Array.from(neighborIdx.flat());
const terrainIdx = Int8Array.from(provinces, (p) => TERRAINS.indexOf(p.terrain as (typeof TERRAINS)[number]));
const isWater = provinces.map((p) => p.terrain === "sea" || p.terrain === "ocean");
const march = rules.defines.march;
const marchGraph: MarchMap = (() => {
  const adjStart = new Int32Array(provinces.length + 1);
  neighborIdx.forEach((n, i) => (adjStart[i + 1] = adjStart[i]! + n.length));
  return {
    adjStart,
    adjList: Int32Array.from(neighborIdx.flat()),
    ground: provinces.map((p) => groundOf(p.terrain)),
    population: Float32Array.from(provinces, (p) => p.population),
    river: Uint8Array.from(provinces, (p) => (p.river ? 1 : 0)),
  };
})();

// ---- state ----
let snapshot: Snapshot | null = null;
/** The campaign being played (domain/saves), or null on the start screen. */
let campaign: Campaign | null = null;
/** The engine has the map's tiles (sent with the first new game or load). */
let mapSent = false;
/** When play time was last counted (performance.now), for the campaign's play time. */
let playClock = 0;
/** An order acted since the Resume save was written. */
let changedSinceResume = false;
/** Every save on the device, newest first, as last read. */
let savesList: StoredSave[] = [];
let owners: Int16Array = Int16Array.from(provinces, (p) => (p.owner ? nationIndex.get(p.owner)! : -1));
let occupiers: Int16Array = new Int16Array(provinces.length).fill(-1);
/** The dispatches log: what concerned the player, newest first, kept from turn to turn (feedback 72). */
let dispatches: { date: GameDate; news: News }[] = [];
/** How many dispatches the log keeps; the oldest drop off. */
const DISPATCHES_KEPT = 400;
/** Dispatches about the player's own realm since the log was last opened. */
let unread = 0;
/** The log shows only what concerns the player's realm. */
let dispatchesMine = false;
/** Calls to arms and peace offers the player was already alerted to. */
const alerted = new Set<string>();
/** The dispatches are open in the panel. */
let newsView = false;
let selectedProvince = -1;
/** Armies chosen to march (army ids): a tap on the land sends them all (feedback 21). */
const selected = new Set<number>();
/** When the latest snapshot arrived (performance.now): armies walk its trail from there. */
let stepStart = 0;
/** How long the latest step is shown for, in ms: armies walk their trail over it. */
let stepMs = 0;
/** Where each army was drawn when the latest snapshot arrived, by army id, for walking on from there. */
let drawnAt = new Map<number, [number, number]>();
/**
 * End turn plays the week a day at a time (TIME-076), and a 4-hour step at a
 * time while the player fights, at the speeds set in Settings → Gameplay
 * (SET-131, SET-065). A 4-hour step takes 500 ms at 1×, and 1200 ms while the
 * player watches the battle, so its rounds can be followed (feedback 73).
 */
const BATTLE_STEP_MS = 500;
const WATCH_STEP_MS = 1200;
let playing = false;
let paused = false;
/** Resumes a paused playback. */
let resume: (() => void) | null = null;
/** An order is on its way to the engine. */
let acting = false;
/** The map images, for the engine's tiles (sent with a new game). */
let mapImage: MapImage | null = null;
/** The panel is folded away behind a tool button so the map gets the screen. */
let panelCollapsed = false;
/** Nation whose country overview is open, or -1. */
let realmView = -1;
/** The army whose commander's screen is open (army id), or -1. */
let armyView = -1;
/** Which tab of a country's overview is open (feedback 12). */
let realmTab: "general" | "government" | "peoples" | "heritage" | "treasury" | "trade" | "food" | "diplomacy" | "military" | "mercenaries" | "officials" | "lords" | "provinces" | "learning" | "navy" | "colonies" = "general";
/** What the player left open in the Learning tab (Tree or Schools, the bough, the tapped invention, folds, scroll), kept across redraws. */
const learningUi = newLearningUi();
/** The study the player was last told to choose for (known count), so the alert comes once each time. */
let askedStudy = -1;
/** Province whose official's screen is open, or -1. */
let officialView = -1;
/** Lord whose screen is open (index into the snapshot's lords), or -1 (feedback 67). */
let lordView = -1;
/** Lord whose lands are lit up on the map, or -1. */
let litLord = -1;
/** The province overview's list of lords to grant it to is open. */
let grantOpen = false;
/** The lord's screen lists every royal province to grant, not just the nearest. */
let grantAll = false;
/** Which tab of the province overview is open. */
let provinceTab: "overview" | "people" | "garrison" | "land" | "build" | "port" = "overview";
/** The player's fleet whose card is open (its id), and the fleet waiting for a tap on where to sail (-1 = none). */
let fleetView = -1;
let sailing = -1;
/** A course being drawn for a fleet of explorers (EXPL-069): its zones, where each leg ends (for Undo), and the low-supply choice. */
let exploring: { fleet: number; path: number[]; legs: number[]; carryOn: boolean } | null = null;
/** The tile tapped on the Land tab, or -1. */
let landTile = -1;
/** Map lens: how provinces are coloured. */
type Lens = "realms" | "terrain" | "people" | "wealth" | "walls" | "food" | "lords" | "diplomacy" | "subjects" | "tongues" | "faiths" | "charts" | "trade";
let lens: Lens = "realms";
/** The trader route being drawn on the map, or null when the map is not in route mode (TRADE-142). */
let routing: Routing | null = null;
/** Parchment over lands the player's realm doesn't know yet (a toggle while it's judged). */
let fogOn = true;
/** Provinces the player has charted (bit p of byte p >> 3, EXPL-010), or null before a realm is chosen. */
let known: Uint8Array | null = null;

// ---- DOM ----
installUiArt();
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `
  <div class="map" id="map"></div>
  <header class="hud" id="hud"></header>
  <div class="tools">
    <button class="icon-only" id="mode" title="Map lens" aria-expanded="false">${icon("map", 3, "Map lens")}</button>
    <button class="icon-only" id="home" title="Go to your capital">${icon("castle", 3, "Capital")}</button>
    <button class="icon-only" id="armies" title="Your commanders" aria-expanded="false" hidden>${icon("swords", 3, "Commanders")}</button>
    <button class="icon-only" id="sound" title="Sound and music" aria-expanded="false">${icon("speaker", 3, "Sound")}</button>
    <button class="icon-only" id="trophy" title="Achievements">${icon("trophy", 3, "Achievements")}<span class="dot" hidden></span></button>
    <button class="icon-only" id="settings" title="Settings">${icon("cog", 3, "Settings")}</button>
  </div>
  <button class="ach-toast framed" id="ach-toast" hidden></button>
  <div class="lens-menu sound-menu framed" id="sound-menu" hidden></div>
  <div class="lens-menu framed" id="lenses" hidden></div>
  <div class="lens-menu army-list framed" id="army-list" hidden></div>
  <button class="wax open-panel" id="reopen" title="Open the overview" hidden></button>
  <section class="panel framed" id="panel" hidden></section>
  <div class="alerts" id="alerts" aria-live="polite"></div>
  <div class="battle-watch framed" id="battle-watch" hidden></div>
  <div class="voyage-bar framed" id="voyage-bar" hidden></div>
  <div class="overlay" id="overlay" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  <section class="event-card framed" id="event-card" role="dialog" aria-labelledby="event-title" hidden></section>
  <div class="revolution-sheet" id="revolution-card" hidden></div>
  <div class="rotate" role="alert"><div class="framed">${icon("map", 4)}<p><b>Turn your phone sideways</b><br>Pocket Hegemony plays in landscape.</p></div></div>
  <button class="wax fab end-turn" id="fab" title="End turn" data-sfx="none" hidden>${icon("hourglass", 3, "End turn")}<span class="badge" hidden></span></button>`;
const hud = document.querySelector<HTMLElement>("#hud")!;
const panel = document.querySelector<HTMLElement>("#panel")!;
const fab = document.querySelector<HTMLButtonElement>("#fab")!;
const reopen = document.querySelector<HTMLButtonElement>("#reopen")!;
const armyList = document.querySelector<HTMLElement>("#army-list")!;
const armyButton = document.querySelector<HTMLButtonElement>("#armies")!;
const alerts = document.querySelector<HTMLElement>("#alerts")!;
const battleWatch = document.querySelector<HTMLElement>("#battle-watch")!;
const voyageBarEl = document.querySelector<HTMLElement>("#voyage-bar")!;
const eventCard = document.querySelector<HTMLElement>("#event-card")!;
const revolutionCard = document.querySelector<HTMLElement>("#revolution-card")!;
/** The waiting event's card is folded into End turn while the player looks at the map (SHELL-081). */
let eventFolded = false;
/** The week was paused because an event came for the player: it plays on once none waits. */
let pausedForEvent = false;
/** Events the player has been shown, so a new one opens its card once. */
const eventsSeen = new Set<string>();
/** The battle the player is watching (its province), and how it ended once it has. */
let watching: { province: number; result?: string } | null = null;
const soundButton = document.querySelector<HTMLButtonElement>("#sound")!;
const trophyButton = document.querySelector<HTMLButtonElement>("#trophy")!;
const achToast = document.querySelector<HTMLButtonElement>("#ach-toast")!;
/** Achievements (domain/achievements "How the player uses it"): the profile on the device, and the card's state. */
const achProfile = loadProfile();
let achView = false;
let achFilter: AchFilter = "all";
let achChosen: string | null = null;
/** Unlocks marked new on the card while it is open. */
let achNew = new Set<string>();
/** Unlocks waiting for their toast. */
const achToasts: { id: string; date: string; province?: number }[] = [];
const soundMenu = document.querySelector<HTMLElement>("#sound-menu")!;
const settingsButton = document.querySelector<HTMLButtonElement>("#settings")!;
/** First-campaign hints (onboarding TUT-121 … TUT-130). */
const hints = new Hints();
/** The commander list is put away. */
let armyListClosed = true;
armyButton.addEventListener("click", () => {
  armyListClosed = !armyListClosed;
  lensMenu.hidden = true;
  soundMenu.hidden = true;
  armyButton.setAttribute("aria-expanded", String(!armyListClosed));
  renderArmyList();
});
fab.addEventListener("click", () => void endTurn());
// Space ends the turn, and pauses or resumes it while it plays (feedback 27).
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || (e.target as HTMLElement).closest("input, textarea, select")) return;
  e.preventDefault();
  if (!e.repeat) void endTurn();
});
// A focused button would also take the Space as a click.
document.addEventListener("keyup", (e) => {
  if (e.code === "Space" && !(e.target as HTMLElement).closest("input, textarea, select")) e.preventDefault();
});
// Phones play in landscape. Browsers only allow the lock in some cases
// (an installed app, fullscreen); otherwise the rotate notice asks for it.
void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => {});
// Country overview: any [data-realm] button opens it, wherever it sits.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-realm]");
  if (!b) return;
  realmView = Number(b.dataset.realm);
  officialView = -1;
  lordView = -1;
  realmTab = (b.dataset.realmOpen as typeof realmTab | undefined) ?? "general";
  newsView = false;
  panelCollapsed = false;
  renderPanel();
});
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest("[data-news]")) return;
  newsView = true;
  realmView = -1;
  panelCollapsed = false;
  unread = 0;
  clearAlerts();
  renderHud();
  renderPanel();
});
// An official's screen opens from their card or the Officials tab (feedback 40).
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-official]");
  if (!b) return;
  officialView = Number(b.dataset.official);
  movesAll = false;
  panel.scrollTop = 0;
  realmView = -1;
  lordView = -1;
  newsView = false;
  panelCollapsed = false;
  renderPanel();
});
// Commissioning an official as a commander, from their screen.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-commission]");
  if (!b || b.disabled) return;
  const province = Number(b.dataset.commission);
  void act({ type: "commission", province }).then(() => {
    if (!snapshot || snapshot.rejectedOrders.length) return;
    officialView = -1;
    newsView = false;
    realmView = snapshot.playerNation;
    realmTab = "military";
    renderPanel();
  });
});
// A province button in the people screens shows it on the map and opens its overview.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-show-province]");
  if (!b) return;
  const i = Number(b.dataset.showProvince);
  officialView = -1;
  lordView = -1;
  grantOpen = false;
  panel.scrollTop = 0;
  realmView = -1;
  newsView = false;
  selectedProvince = i;
  provinceTab = "overview";
  view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, 4));
  restyleProvinces();
  renderPanel();
});
trophyButton.addEventListener("click", () => openAchievements());
// Opening anything else in the panel puts the Achievements card away.
document.addEventListener(
  "click",
  (e) => {
    if ((e.target as HTMLElement).closest("[data-realm], [data-news], [data-official], [data-show-province], [data-go-province], .go-there")) achView = false;
  },
  { capture: true },
);
achToast.addEventListener("click", () => {
  const id = achToast.dataset.id;
  achToast.hidden = true;
  if (id) openAchievements(id);
});

/** Opens the Achievements card, at one achievement when given (ACH-076, ACH-079); what was new is marked once, then counts as seen. */
function openAchievements(at: string | null = null): void {
  if (achView && at === null && !panel.hidden) {
    achView = false;
    renderPanel();
    return;
  }
  achView = true;
  achChosen = at;
  if (at) achFilter = "all";
  achNew = new Set(Object.keys(achProfile.unlocked).filter((id) => !achProfile.seen.includes(id)));
  achProfile.seen = Object.keys(achProfile.unlocked);
  saveProfile(achProfile);
  renderTrophy();
  officialView = -1;
  lordView = -1;
  armyView = -1;
  fleetView = -1;
  newsView = false;
  realmView = -1;
  panelCollapsed = false;
  lensMenu.hidden = true;
  soundMenu.hidden = true;
  renderPanel();
  if (at) panel.querySelector("#ach-detail")?.scrollIntoView({ block: "nearest" });
}

/** The trophy button carries a dot while an unlock has not been looked at (ACH-078). */
function renderTrophy(): void {
  const n = unseen(achProfile);
  trophyButton.querySelector<HTMLElement>(".dot")!.hidden = n === 0;
  trophyButton.title = n ? `Achievements: ${n} new` : "Achievements";
}

function renderAchievements(): void {
  const keep = panel.scrollTop;
  const card = achievementsCard({ ...achProfile, seen: achProfile.seen.filter((id) => !achNew.has(id)) }, snapshot, achFilter, achChosen, closeButton());
  panel.innerHTML = card;
  panel.scrollTop = keep;
  panel.querySelector(".close")!.addEventListener("click", () => {
    achView = false;
    renderPanel();
  });
  showPanel(true, snapshot ? "scroll" : "crown");
  panel.querySelectorAll<HTMLButtonElement>("[data-ach]").forEach((b) =>
    b.addEventListener("click", () => {
      achChosen = achChosen === b.dataset.ach ? null : b.dataset.ach!;
      renderAchievements();
      panel.querySelector("#ach-detail")?.scrollIntoView({ block: "nearest" });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-ach-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      achFilter = b.dataset.achFilter as AchFilter;
      renderAchievements();
    }),
  );
}

/** New unlocks from a snapshot: into the profile at once, a line in the dispatches and a toast each (ACH-051, ACH-074, ACH-079). */
function hearAchievements(s: Snapshot): void {
  const fresh = takeAchievements(achProfile, s, nations[s.playerNation]!.id);
  if (!fresh.length) return;
  for (const u of fresh) {
    dispatches.unshift({ date: { ...s.date }, news: { kind: "event", text: `Achievement earned: ${achievementName(u.id)}.`, nations: [s.playerNation], ...(u.province === undefined ? {} : { province: u.province }) } });
    if (achProfile.toasts) achToasts.push(u);
  }
  renderTrophy();
  if (achView) renderAchievements();
  showToast();
}

let toastTimer: ReturnType<typeof setTimeout> | 0 = 0;
/** One toast at a time, 3 seconds each, held while an event card or the battle watch is open (ACH-069, ACH-070). */
function showToast(): void {
  if (toastTimer || !achToasts.length) return;
  if (!eventCard.hidden || !battleWatch.hidden) {
    toastTimer = setTimeout(() => {
      toastTimer = 0;
      showToast();
    }, 500);
    return;
  }
  const u = achToasts.shift()!;
  achToast.innerHTML = toastHtml(u);
  achToast.dataset.id = u.id;
  achToast.setAttribute("aria-label", `Achievement earned: ${achievementName(u.id)}. Opens the Achievements card`);
  achToast.hidden = false;
  sound.sfx("ui_achievement");
  toastTimer = setTimeout(() => {
    achToast.hidden = true;
    toastTimer = setTimeout(() => {
      toastTimer = 0;
      showToast();
    }, 300);
  }, 3000);
}

reopen.addEventListener("click", () => {
  panelCollapsed = false;
  renderPanel();
});

// ---- sound ----
// Every button answers a tap with a click; closing goes back down (sound-effects §5.1).
document.addEventListener(
  "click",
  (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b || b.disabled || b.dataset.sfx === "none") return;
    sound.sfx(b.dataset.sfx ?? (b.matches(".close, [data-back], .fold") ? "ui_back" : "ui_tap"));
  },
  { capture: true },
);
soundButton.addEventListener("click", () => {
  soundMenu.hidden = !soundMenu.hidden;
  lensMenu.hidden = true;
  armyListClosed = true;
  renderArmyList();
  soundButton.setAttribute("aria-expanded", String(!soundMenu.hidden));
  renderSoundMenu();
});
sound.onChange = () => {
  renderSoundButton();
// Read by scripts/sound-shots.mjs.
(globalThis as { __phSound?: typeof sound }).__phSound = sound;
  if (!soundMenu.hidden) renderNowPlaying();
};

/** The sound button shows when music is off at a glance. */
function renderSoundButton(): void {
  const off = !sound.settings.musicOn || sound.settings.master === 0;
  soundButton.innerHTML = icon(off ? "mute" : "speaker", 3, off ? "Sound (music off)" : "Sound");
}

/** The Sound card's controls are the Audio rows of Settings (SET-132). */
const SOUND_PREF: Record<string, string> = { master: "audio.master", music: "audio.music_volume", effects: "audio.effects_volume", musicOn: "audio.music", uiSounds: "audio.interface_sounds" };

/** The Sound menu (domain/audio "How the player uses it"): what plays and why, and the volumes, in one card. */
function renderSoundMenu(): void {
  if (soundMenu.hidden) return;
  const st = sound.settings;
  const pct = (v: number) => Math.round(v * 100);
  const toggle = (key: "musicOn" | "uiSounds") =>
    `<button class="paper toggle${st[key] ? " on" : ""}" data-toggle="${key}" data-sfx="none" aria-pressed="${st[key]}">${st[key] ? "On" : "Off"}</button>`;
  const slider = (key: "master" | "music" | "effects", label: string, off = false, after = `<output>${pct(st[key])}%</output>`) =>
    `<label class="sound-row${off ? " off" : ""}"><span>${label}</span><input type="range" min="0" max="100" step="5" value="${pct(st[key])}" data-vol="${key}" aria-label="${label} volume"${off ? " disabled" : ""}>${after}</label>`;
  soundMenu.innerHTML = `
    <h3 class="sub">Sound</h3>
    <p class="now-playing"></p>
    ${slider("master", "Volume")}
    <div class="sound-row${st.musicOn ? "" : " off"}"><span>Music</span><input type="range" min="0" max="100" step="5" value="${pct(st.music)}" data-vol="music" aria-label="Music volume"${st.musicOn ? "" : " disabled"}>${toggle("musicOn")}</div>
    ${slider("effects", "Effects")}
    <div class="sound-row"><span>Buttons</span><small>A click on every tap</small>${toggle("uiSounds")}</div>
    <button class="paper all-sound" data-shell="settings" data-settings-section="audio">${icon("cog", 1)} All sound settings</button>`;
  renderNowPlaying();
  soundMenu.querySelectorAll<HTMLInputElement>("[data-vol]").forEach((input) =>
    input.addEventListener("input", () => {
      setPref(SOUND_PREF[input.dataset.vol!]!, Number(input.value));
      const out = input.nextElementSibling;
      if (out?.tagName === "OUTPUT") out.textContent = `${input.value}%`;
    }),
  );
  soundMenu.querySelectorAll<HTMLInputElement>("[data-vol]").forEach((input) => input.addEventListener("change", () => sound.sfx(input.dataset.vol === "music" ? "ui_tap_soft" : "ui_tap")));
  soundMenu.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const key = b.dataset.toggle as "musicOn" | "uiSounds";
      const on = !sound.settings[key];
      setPref(SOUND_PREF[key]!, on);
      sound.sfx(on ? "ui_toggle_on" : "ui_toggle_off");
      renderSoundMenu();
    }),
  );
}

function renderNowPlaying(): void {
  const el = soundMenu.querySelector<HTMLElement>(".now-playing");
  if (!el) return;
  const np = sound.nowPlaying();
  el.innerHTML = !sound.running
    ? "Tap anywhere to start the sound."
    : np
      ? `<b>Now playing: ${esc(np.name)}</b><small>${esc(np.why)}</small>`
      : "Music is off.";
}
renderSoundButton();
renderTrophy();

// ---- settings ----
// The cog opens the Settings screen straight from the map; Back returns to the map (SET-132).
settingsButton.addEventListener("click", () => openShell("settings", true));
hints.onChange = () => {
  if (shell.view === "settings") renderShell();
};
setHintsRows({
  on: () => hints.state.on,
  progress: () => hints.progress(),
  setOn: (on) => hints.setOn(on),
  reset: () => {
    hints.reset();
    if (!hints.state.on) hints.setOn(true);
    // Mid-campaign the realm is already chosen.
    if (snapshot) hints.did("realm chosen");
  },
  toasts: () => achProfile.toasts,
  setToasts: (on) => {
    achProfile.toasts = on;
    saveProfile(achProfile);
  },
});

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

let view: MapView;

async function boot(): Promise<void> {
  loadingStage("Charting coasts and rivers…", 0.3);
  const image = (mapImage = await loadMapImage(rules.map!, provinces.length));
  loadingStage("Raising the realms…", 0.75);
  await painted();
  view = new MapView(document.querySelector("#map")!, image, provinces.length, { onTap, drawOverlay });
  view.setPower(mapPower());
  // Read by the performance checks (scripts/perf.mjs).
  (globalThis as { __phMap?: MapView }).__phMap = view;
  restyleProvinces();
  // Start over Europe, zoomed so countries are readable on a phone.
  const paris = provinces[provinceIndex.get(nations[nationIndex.get("france")!]!.capital)!]!;
  view.lookAt(paris.x!, paris.y!, 1.4);
  // ?view=x,y,zoom opens the map at a spot, for screenshots and bug reports.
  const at = new URLSearchParams(location.search).get("view")?.split(",").map(Number);
  if (at?.length === 3 && at.every(Number.isFinite)) view.lookAt(at[0]!, at[1]!, at[2]!);
  const modeButton = document.querySelector<HTMLButtonElement>("#mode")!;
  modeButton.addEventListener("click", () => {
    lensMenu.hidden = !lensMenu.hidden;
    armyListClosed = true;
    soundMenu.hidden = true;
    renderArmyList();
    modeButton.setAttribute("aria-expanded", String(!lensMenu.hidden));
    renderLensMenu();
  });
  document.querySelector("#home")!.addEventListener("click", () => {
    const n = snapshot ? snapshot.playerNation : nationIndex.get("france")!;
    const cap = provinces[provinceIndex.get(nations[n]!.capital)!]!;
    view.lookAt(cap.x!, cap.y!, Math.max(view.camera.zoom, 3));
  });
  renderHud();
  renderPanel();
  hideLoading();
  sound.title();
  hints.mount({ target: hintTarget, moment: () => ({ eventOpen: !eventCard.hidden || !overlay.hidden || !revolutionCard.hidden, turnPlaying: playing }), sfx: (id) => sound.sfx(id) });
}

// ---- map styling ----
const LENSES: { id: Lens; name: string; note: string }[] = [
  { id: "realms", name: "Realms", note: "who holds the land" },
  { id: "terrain", name: "Terrain", note: "the bare land" },
  { id: "people", name: "People", note: "how many live there" },
  { id: "wealth", name: "Wealth", note: "trade, crafts and land" },
  { id: "walls", name: "Walls", note: "castles and forts" },
  { id: "food", name: "Food", note: "men on campaign the store can feed" },
  { id: "lords", name: "Lords", note: "who holds your land" },
  { id: "diplomacy", name: "Diplomacy", note: "friend or foe, envoys on the road" },
  { id: "subjects", name: "Subjects", note: "your subjects by loyalty, and your overlord" },
  { id: "tongues", name: "Tongues", note: "the family of the tongue most speak" },
  { id: "faiths", name: "Faiths", note: "the faith most hold; hatched where mixed" },
  { id: "trade", name: "Trade", note: "trade ratio, your traders' loops" },
  { id: "charts", name: "Charts", note: "what you have charted, and empty coasts to settle" },
];
/** The trade lens's ramp by trade ratio, quiet to busy (TRADE-143); provinces the player doesn't see are parchment. */
const TRADE_RAMP = ["#efe39a", "#e0b443", "#c7742a", "#3f8f6e", "#1f5a5e"].map(hexToRgb);
const TRADE_UNSEEN_RGB = hexToRgb(UI_COLORS.parchment);
/** A colour per tongue family and per faith for their lenses (CULT-085, RELG-118): fixed hues, so a family or faith keeps its colour all campaign. */
const familyRgb = (key: string): number[] => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return hslRgb((h % 360) / 360, 0.45 + ((h >> 9) % 3) * 0.1, 0.42 + ((h >> 11) % 3) * 0.08);
};
const FAITH_HEX: Record<string, string> = {
  catholic: "#c9a227", protestant: "#3b5fb0", anglican: "#7a5bb0", hussite: "#b0703b", orthodox: "#8f2f3a", oriental_christian: "#b04a6a",
  sunni: "#2f7a44", shia: "#5aa864", ibadi: "#86b85a", hindu: "#d6782e", sikh: "#e0a040", jain: "#e8c890",
  theravada: "#e0b030", mahayana: "#d4c050", vajrayana: "#b8862a", shinto: "#c84040", confucian_ritual: "#a83e3e", daoist: "#5a8a8a",
  jewish: "#4a6ad0", indigenous_american: "#8a6040", african_traditional: "#7a5030", pacific_traditional: "#3a8aa0", siberian_steppe_traditional: "#8a8a60", asian_traditional: "#6a7a50", secular: "#9a9a9a",
};
const faithRgb = (f: string) => (FAITH_HEX[f] ? hexToRgb(FAITH_HEX[f]!) : familyRgb(f));
/** The diplomacy lens's colours (DIPL-183), by LENS_RELATIONS; "own" is the realm's own colour. */
const RELATION_HEX: Record<LensRelation, string> = {
  own: "",
  ally: "#3b5fb0",
  pledged: "#8fb6e8",
  close: "#3f8f46",
  warm: "#a8d27a",
  neutral: "#b9b3a4",
  cold: "#e08a35",
  hostile: "#b8323a",
  war: "#b8323a",
};
const RELATION_RGB = Object.fromEntries(Object.entries(RELATION_HEX).map(([k, v]) => [k, v ? hexToRgb(v) : []])) as unknown as Record<LensRelation, number[]>;
/** The subjects lens's colours (SUBJ-095): the player's subjects by loyalty, and its own overlord. */
const LOYALTY_HEX = { loyal: "#3f8f46", wavering: "#d8a03a", disloyal: "#b8323a" } as const;
const LOYALTY_RGB = Object.fromEntries(Object.entries(LOYALTY_HEX).map(([k, v]) => [k, hexToRgb(v)])) as unknown as Record<keyof typeof LOYALTY_HEX, number[]>;
const OVERLORD_HEX = "#7a4fa0";
const OVERLORD_RGB = hexToRgb(OVERLORD_HEX);
const loyaltyKey = (l: string): keyof typeof LOYALTY_HEX => (/disloyal/i.test(l) ? "disloyal" : /waver/i.test(l) ? "wavering" : "loyal");
/** The key under the lens buttons: what each colour means. */
const RELATION_KEY: [LensRelation, string][] = [
  ["own", "You and your subjects"],
  ["ally", "Allies"],
  ["pledged", "Pledged"],
  ["close", "Close"],
  ["warm", "Warm"],
  ["neutral", "Cool, or no dealings"],
  ["cold", "Cold or Rival"],
  ["hostile", "Hostile or Bitter"],
  ["war", "At war (hatched)"],
];
/** The player's relation to realm n under the diplomacy lens, or null when it isn't known. */
const relationTo = (n: number): LensRelation | null => {
  const r = snapshot?.diplomacyLens?.relation[n];
  return r === undefined || r < 0 ? null : LENS_RELATIONS[r]!;
};
const ROYAL_RGB = hexToRgb("#e9c35a");
/** A colour per lord for the Lords lens: hues spread by the golden angle, kept clear of the crown's gold. */
function lordRgb(k: number): number[] {
  return hslRgb((80 + ((k * 137.508) % 260)) / 360, 0.5, k % 2 ? 0.42 : 0.55);
}
/** An HSL colour (each 0..1) as RGB bytes. */
function hslRgb(h: number, sat: number, l: number): number[] {
  const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
  const p = 2 * l - q;
  const ch = (t: number) => {
    t = (t + 1) % 1;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(v * 255);
  };
  return [ch(h + 1 / 3), ch(h), ch(h - 1 / 3)];
}
const RAMP = ["#f3e3b5", "#e8c172", "#d68a3c", "#b14a2e", "#6e1f2c"].map(hexToRgb);
const WALL_RGB = { none: hexToRgb("#efe2bf"), fort: hexToRgb("#d08a2e"), castle: hexToRgb("#3c4a8e") };
const FOOD_RAMP = ["#a8323e", "#d08a48", "#e9d79a", "#8cb85a", "#3f7a44"].map(hexToRgb);
const ramp = (colors: number[][], t: number) => colors[Math.max(0, Math.min(colors.length - 1, Math.floor(t * colors.length)))]!;
const lensMenu = document.querySelector<HTMLElement>("#lenses")!;

/** Turns a lens on: the renderer's mode, the provinces' colours and the menu. */
function setLens(l: Lens): void {
  lens = l;
  view.renderer.mode = lens === "realms" ? "political" : lens === "terrain" ? "terrain" : "lens";
  restyleProvinces();
  renderLensMenu();
}

function renderLensMenu(): void {
  lensMenu.innerHTML = `
    <h3 class="sub">Map lens</h3>
    ${LENSES.map((l) => `<button class="paper lens${l.id === lens ? " on" : ""}" data-lens="${l.id}"><b>${l.name}</b><small>${l.note}</small></button>`).join("")}
    ${lens === "diplomacy" ? diplomacyKey() : lens === "subjects" ? subjectsKey() : lens === "tongues" || lens === "faiths" ? beliefKey() : lens === "charts" ? chartsKey() : lens === "trade" ? tradeKey() : ""}
    <label class="fog-toggle"><input type="checkbox" id="fog" ${fogOn ? "checked" : ""}> Parchment over unknown lands</label>`;
  lensMenu.querySelectorAll<HTMLButtonElement>("[data-lens]").forEach((b) =>
    b.addEventListener("click", () => {
      setLens(b.dataset.lens as Lens);
      // The key sits under the buttons; bring it into view on a short screen.
      lensMenu.querySelector(".lens-key")?.scrollIntoView({ block: "nearest" });
    }),
  );
  lensMenu.querySelector<HTMLInputElement>("#fog")!.addEventListener("change", (e) => {
    fogOn = (e.target as HTMLInputElement).checked;
    restyleProvinces();
  });
}

/** The Charts lens's key (EXPL-073). */
function chartsKey(): string {
  const ex = snapshot?.exploration;
  const sw = (rgb: number[]) => `<i class="swatch" style="background:rgb(${rgb.join(",")})"></i>`;
  return `<div class="lens-key">
    <span>${sw(SITE_RGB[1]!)}Empty coast inside your colonial range${ex?.colonial ? ` (${ex.range} zones)` : ""}</span>
    <span>${sw(SITE_RGB[2]!)}Empty land beyond it, or inland</span>
    <span>${sw(SITE_RGB[3]!)}A colony being founded</span>
    <span><i class="swatch parchment"></i>Not charted yet: send explorers</span>
    ${ex && !ex.colonial ? "<p>Colonies open with ocean navigation.</p>" : "<p>Tap an empty coast for what it takes to settle it.</p>"}
  </div>`;
}
/** Colours of empty land under the Charts lens: in range, beyond it, being settled. */
const SITE_RGB = [[0, 0, 0], hexToRgb("#5fd35a"), hexToRgb("#b7d9a2"), hexToRgb("#f2c14e")];

/** The diplomacy lens's key: a swatch for each relation, and what a tap does. */
function subjectsKey(): string {
  const me = snapshot ? nations[snapshot.playerNation] : undefined;
  const sw = (c: string) => `<i class="swatch" style="background:${c}"></i>`;
  const sv = snapshot?.statecraft?.subjects;
  return `<div class="lens-key">
    <span>${sw(me?.color ?? PALETTE.gold)}Your realm</span>
    <span>${sw(LOYALTY_HEX.loyal)}Loyal subject</span>
    <span>${sw(LOYALTY_HEX.wavering)}Wavering subject</span>
    <span>${sw(LOYALTY_HEX.disloyal)}Disloyal subject</span>
    <span>${sw(OVERLORD_HEX)}Your overlord</span>
    <p>${sv ? `Reach used ${sv.used} of ${sv.reach}.` : ""} A dotted line runs from a courting realm to the subject it courts. Tap a subject for its Diplomacy tab.</p>
  </div>`;
}

function diplomacyKey(): string {
  const me = snapshot ? nations[snapshot.playerNation] : undefined;
  const swatch = (r: LensRelation) => `<i class="swatch${r === "war" ? " hatched" : ""}" style="background:${r === "own" ? (me?.color ?? PALETTE.gold) : RELATION_HEX[r]}"></i>`;
  return `<div class="lens-key">
    ${RELATION_KEY.map(([r, text]) => `<span>${swatch(r)}${text}</span>`).join("")}
    <span><i class="swatch league"></i>League against you</span>
    <p>Zoom in to see your envoys riding and a sword over realms you hold a war aim on. Tap a realm for its Diplomacy tab.</p>
  </div>`;
}

/** The trade lens's key: the ratio ramp, parchment for what isn't seen, and what zooming in shows. */
function tradeKey(): string {
  const hex = (c: number[]) => `rgb(${c.join(",")})`;
  const steps = ["0 to 19 %", "20 to 39 %", "40 to 59 %", "60 to 79 %", "80 % and over"];
  return `<div class="lens-key">
    ${TRADE_RAMP.map((c, i) => `<span><i class="swatch" style="background:${hex(c)}"></i>${steps[i]}</span>`).join("")}
    <span><i class="swatch" style="background:${hex(TRADE_UNSEEN_RGB)}"></i>Not seen</span>
    <p>Trade ratio: how busy each province's trade is. Zoom in to see your traders' loops with their purses, and a coin on each trade city.</p>
  </div>`;
}

/** The Tongue and Faith lenses' key: the families or faiths that cover the most of the map, largest first. */
function beliefKey(): string {
  if (!snapshot) return `<div class="lens-key"><p>Choose a realm to see tongues and faiths.</p></div>`;
  const count = new Map<string, number>();
  const pe = snapshot.peoples;
  for (let i = 0; i < provinces.length; i++) {
    const k = lens === "tongues" ? (pe.provinceTongue[i * SLOTS] !== NO_TONGUE ? TONGUE_FAMILY[pe.provinceTongue[i * SLOTS]!]! : "") : pe.provinceFaith[i * SLOTS] !== NO_FAITH ? FAITH_IDS[pe.provinceFaith[i * SLOTS]!]! : "";
    if (k) count.set(k, (count.get(k) ?? 0) + 1);
  }
  const rows = [...count].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const rgb = (k: string) => `rgb(${(lens === "tongues" ? familyRgb(k) : faithRgb(k)).join(",")})`;
  const label = (k: string) => (lens === "tongues" ? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ") : faithName(k));
  return `<div class="lens-key">
    ${rows.map(([k]) => `<span><i class="swatch" style="background:${rgb(k)}"></i>${esc(label(k))}</span>`).join("")}
    ${lens === "faiths" ? `<span><i class="swatch hatched" style="background:#b9b3a4"></i>A second faith holds 30% or more</span>` : ""}
    <p>Tap a province for its ${lens === "tongues" ? "Tongue" : "Faith"} line.</p>
  </div>`;
}

/** Colour for a province under the current lens. */
function lensColor(i: number): number[] {
  const o = owners[i]!;
  const p = provinces[i]!;
  switch (lens) {
    case "people":
      return ramp(RAMP, (Math.log10(Math.max(1, p.population)) - 0.7) / 2.3);
    case "wealth":
      return ramp(RAMP, (p.wealth - 1) / 10);
    case "walls":
      return WALL_RGB[wallsAt(i) ?? "none"];
    case "food":
      return ramp(FOOD_RAMP, Math.log10(Math.max(1, landFeeds(i))) / 5);
    case "lords": {
      // The player's realm: royal land in gold, each lord's land in his own colour; other realms faded.
      if (!snapshot || o !== snapshot.playerNation) return o >= 0 ? nationRgb[o]!.map((v) => Math.round(v * 0.35 + 150)) : unownedRgb;
      const l = snapshot.provinceLord[i]!;
      return l >= 0 ? lordRgb(l) : ROYAL_RGB;
    }
    case "tongues": {
      const t = snapshot?.peoples.provinceTongue[i * SLOTS] ?? NO_TONGUE;
      return t === NO_TONGUE ? unownedRgb : familyRgb(TONGUE_FAMILY[t]!);
    }
    case "faiths": {
      const f = snapshot?.peoples.provinceFaith[i * SLOTS] ?? NO_FAITH;
      return f === NO_FAITH ? unownedRgb : faithRgb(FAITH_IDS[f]!);
    }
    case "subjects": {
      if (o < 0) return unownedRgb;
      if (o === snapshot?.playerNation) return nationRgb[o]!;
      const sv = snapshot?.statecraft?.subjects;
      const mine = sv?.subjects.find((x) => x.subject === o);
      if (mine) return LOYALTY_RGB[loyaltyKey(mine.loyalty)];
      return sv?.overlord?.overlord === o ? OVERLORD_RGB : RELATION_RGB.neutral;
    }
    case "charts": {
      // Held land faded in its holder's colour; empty land by whether it can be settled (EXPL-073).
      const site = snapshot?.exploration.sites[i] ?? 0;
      if (o < 0) return site ? SITE_RGB[site]! : unownedRgb;
      return nationRgb[o]!.map((v) => Math.round(v * 0.45 + 130));
    }
    case "diplomacy": {
      const r = o >= 0 ? relationTo(o) : null;
      if (!r) return o >= 0 ? RELATION_RGB.neutral : unownedRgb;
      // The player's subjects share the player's own colour.
      return r === "own" ? nationRgb[snapshot!.playerNation]! : RELATION_RGB[r];
    }
    case "trade":
      if (!snapshot) return ramp(TRADE_RAMP, 0);
      return snapshot.provinceTradeSeen[i] ? ramp(TRADE_RAMP, snapshot.provinceTradeRatio[i]! / 100) : TRADE_UNSEEN_RGB;
    default:
      return o >= 0 ? nationRgb[o]! : unownedRgb;
  }
}

/** Charted by the player: the parchment lifts from it (EXPL-015); under the Charts lens the parchment shows whatever the fog switch says. */
const isKnown = (i: number) => (!fogOn && lens !== "charts") || !known || (known[i >> 3]! & (1 << (i & 7))) !== 0;

/** Latitude and longitude of a province's centre. */
const latOf = (p: { y?: number }) => rules.map!.latTop - (p.y ?? 0) / rules.map!.pxPerDeg;
const lonOf = (p: { x?: number }) => (p.x ?? 0) / rules.map!.pxPerDeg - 180;
/** The date the map's seasons were last worked out for, and each province's fixed climate. */
let seasonKey = "";
let places: PlaceClimate[] | null = null;
// Next week's seasons, worked out while the player looks at this one, so
// ending a turn only has to copy them (docs/performance.md: one frame).
let nextSeason: { key: string; data: Uint8Array } | null = null;
/** The date the week on show started (seasons stay put while it plays). */
let weekStart: GameDate | null = null;
const dateKey = (d: GameDate) => `${d.year}-${d.month}-${d.day ?? 1}`;
/** Each province's season on a date, packed as the map's season texture holds it. */
function seasonsFor(date: GameDate): Uint8Array {
  places ??= provinces.map((p) => placeClimate(lonOf(p), latOf(p), !!p.coastal, p.terrain ?? ""));
  const out = new Uint8Array(provinces.length * 4);
  for (let i = 0; i < provinces.length; i++) {
    const c = provinceClimate(places[i]!, date);
    seasonBytes(out, i, c.temperature, c.autumn, c.spring, c.wet);
  }
  return out;
}

function restyleProvinces(): void {
  known = snapshot?.exploration.charted ?? null;
  for (let i = 0; i < provinces.length; i++) {
    const o = owners[i]!;
    const occ = occupiers[i]!;
    // Occupied land is hatched in the occupier's colour; borders stay the owner's.
    const rebels = !!snapshot?.provinceRebels[i];
    const hatched = ((occ >= 0 || rebels) && lens === "realms") || (lens === "diplomacy" && o >= 0 && relationTo(o) === "war") || (lens === "faiths" && (snapshot?.peoples.provinceFaithShare[i * SLOTS + 1] ?? 0) >= 0.3);
    const lord = snapshot ? snapshot.provinceLord[i]! : -1;
    const lit = litLord >= 0 && lord === litLord;
    // Under the trade lens, land whose trade the player doesn't see is parchment too (TRADE-143).
    const unseen = !isKnown(i) || (lens === "trade" && !!snapshot && !isWater[i] && !snapshot.provinceTradeSeen[i]);
    const flags = (i === selectedProvince ? 1 : 0) | (lit ? 2 : 0) | (unseen ? 4 : 0) | (hatched ? 8 : 0);
    // While armies are chosen to march, land they may not enter gets red borders (feedback 76).
    // Under the diplomacy lens, a league against the player gets the same red border (DIPL-183).
    const closed = (selected.size > 0 && !!snapshot?.provinceClosed[i]) || (lens === "diplomacy" && o >= 0 && snapshot?.diplomacyLens?.league[o] === 1);
    // While a lord's lands are lit, the rest of the land fades to grey so they stand out.
    view.renderer.setProvinceStyle(i, isWater[i] ? unownedRgb : hatched && lens === "realms" ? (rebels ? rebelRgb : nationRgb[occ]!) : lensColor(i), o, terrainIdx[i]!, flags, isWater[i], lord, litLord >= 0 && !lit, closed);
  }
  // Seasons move on a week a turn, so they are only worked out when a week starts.
  const date = previewMonth ? { year: 1444, month: previewMonth, day: previewDay } : (weekStart ?? rules.defines.startDate);
  const key = dateKey(date);
  if (key !== seasonKey) {
    seasonKey = key;
    const s = nextSeason?.key === key ? nextSeason.data : seasonsFor(date);
    view.renderer.setProvinceSeasons(s);
    if (!previewMonth) {
      const next = addDays(date, DAYS_PER_TURN);
      setTimeout(() => (nextSeason = { key: dateKey(next), data: seasonsFor(next) }), 50);
    }
  }
  view.renderer.uploadProvinceStyles();
  view.invalidate();
}

// ---- overlay: nation names, cities, armies ----
let nationLabels = computeNationLabels();

function computeNationLabels() {
  const acc = nations.map(() => ({ x: 0, y: 0, n: 0, ref: -1, owned: [] as number[] }));
  provinces.forEach((p, i) => {
    const o = owners[i]!;
    if (o < 0) return;
    const a = acc[o]!;
    a.owned.push(i);
    if (a.ref < 0) a.ref = p.x!;
    // Unwrap around the first province so nations across the date line average correctly.
    let x = p.x!;
    if (x - a.ref > rules.map!.width / 2) x -= rules.map!.width;
    if (a.ref - x > rules.map!.width / 2) x += rules.map!.width;
    a.x += x;
    a.y += p.y!;
    a.n++;
  });
  return acc.map((a) => {
    if (!a.n) return null;
    const cx = a.x / a.n;
    const cy = a.y / a.n;
    // Snap to the nearest owned province so the label sits on the nation itself.
    let best = -1;
    let bestD = Infinity;
    for (const j of a.owned) {
      const p = provinces[j]!;
      const d = (p.x! - cx) ** 2 + (p.y! - cy) ** 2;
      if (d < bestD) ((bestD = d), (best = j));
    }
    return { x: provinces[best]!.x!, y: provinces[best]!.y!, size: Math.sqrt(a.n) };
  });
}

function drawOverlay(o: OverlayContext): void {
  const { ctx, zoom } = o;
  const onScreen = (sx: number, sy: number, pad = 40) => sx > -pad && sy > -pad && sx < o.width + pad && sy < o.height + pad;
  const spriteScale = zoom >= 8 ? 4 : zoom >= 4 ? 3 : zoom >= 2 ? 2 : 1;

  // One settlement per province, sized by its people, with its walls:
  // a stone tower for a castle, a palisade for a fort. Capitals come after.
  if (zoom >= 3) {
    const sc = Math.max(1, spriteScale - 2);
    provinces.forEach((p, i) => {
      const own = owners[i]!;
      if (own < 0 || nations[own]!.capital === p.id || !isKnown(i)) return;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) return;
      const color = nations[own]!.color;
      const img = sprite(settlementOf(p.population), color, sc);
      const x = Math.round(sx - img.width / 2);
      const y = Math.round(sy - img.height / 2);
      const walls = wallsAt(i);
      if (walls === "castle") {
        const t = sprite("tower", color, sc);
        ctx.drawImage(t, x - t.width + 3 * sc, y + img.height - t.height);
      }
      ctx.drawImage(img, x, y);
      if (walls === "fort") {
        const f = sprite("palisade", color, sc);
        const w = Math.min(f.width, img.width + 2 * sc);
        ctx.drawImage(f, 0, 0, w, f.height, x - sc, y + img.height - f.height + 2 * sc, w, f.height);
      }
    });
  }
  if (zoom >= 1.1) {
    nations.forEach((n, i) => {
      const p = provinces[provinceIndex.get(n.capital)!]!;
      if (owners[provinceIndex.get(n.capital)!] !== i || !isKnown(provinceIndex.get(n.capital)!)) return;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) return;
      const img = sprite("capital", n.color, Math.max(1, spriteScale - 1));
      ctx.drawImage(img, Math.round(sx - img.width / 2), Math.round(sy - img.height / 2));
    });
  }

  // Nation names when zoomed out.
  if (zoom < 3.5) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    nationLabels.forEach((l, i) => {
      if (!l || !isKnown(provinceIndex.get(nations[i]!.capital)!)) return;
      const px = Math.round(Math.min(28, l.size * zoom * 4.5));
      if (px < 9) return;
      const [sx, sy] = o.toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 200)) return;
      pixelText(ctx, nations[i]!.name.toUpperCase(), sx, sy - (zoom >= 1.1 ? px : 0), px);
    });
  }

  // Close up, only each realm's capital is named, so you can see whose seat it is; other names are in the province's overview (feedback 22).
  if (zoom >= 3) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    nations.forEach((n, i) => {
      const c = provinceIndex.get(n.capital)!;
      if (owners[c] !== i || !isKnown(c)) return;
      const [sx, sy] = o.toScreen(provinces[c]!.x!, provinces[c]!.y!);
      if (onScreen(sx, sy)) pixelText(ctx, provinces[c]!.name, sx, sy + 7 * spriteScale, 12);
    });
  }

  // The player's building sites: a hammer over each, striking, so the works can be found on the map (feedback 91).
  if (snapshot && zoom >= 2 && hammerImage.complete) {
    const sc = Math.max(1, spriteScale - 1);
    const now = performance.now();
    let shown = false;
    for (const site of snapshot.sites) {
      const p = provinces[site.province]!;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) continue;
      shown = true;
      // Swung about the end of its handle: a slow lift, then a quick blow.
      ctx.save();
      ctx.translate(Math.round(sx + 11 * sc), Math.round(sy - 4 * sc));
      ctx.rotate(hammerSwing(now + site.province * 137));
      ctx.drawImage(hammerImage, -5 * sc, -10 * sc, 10 * sc, 10 * sc);
      ctx.restore();
    }
    // About ten frames a second is enough for the swing, and spares the battery.
    if (shown && !hammerTick) hammerTick = setTimeout(() => ((hammerTick = 0), view.invalidate()), 100);
  }

  // Sieges under way: how long the walls have held, and how far into the next siege month.
  if (snapshot && zoom >= 2) {
    for (const st of snapshot.sieges) {
      if (!isKnown(st.province)) continue;
      const p = provinces[st.province]!;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) continue;
      drawSiegeMark(ctx, sx, sy - 10 * tokenUnit(zoom), tokenUnit(zoom), nations[st.by]!.color, st.months, st.progress);
    }
    for (const r of snapshot.rebels.risings) {
      if (!r.siege || !isKnown(r.siege.province)) continue;
      const p = provinces[r.siege.province]!;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (onScreen(sx, sy)) drawSiegeMark(ctx, sx, sy - 10 * tokenUnit(zoom), tokenUnit(zoom), REBEL_COLOR, r.siege.months, r.siege.progress);
    }
  }

  // The diplomacy lens, zoomed in to regional: envoys riding their dotted roads, and a sword over each realm the player holds a war aim on (DIPL-184).
  const dl = lens === "diplomacy" ? snapshot?.diplomacyLens : null;
  if (dl && zoom >= REGIONAL_ZOOM) {
    const u = tokenUnit(zoom);
    for (const n of dl.aims) {
      const l = nationLabels[n];
      if (relationTo(n) === "own") continue;
      if (!l || !isKnown(provinceIndex.get(nations[n]!.capital)!)) continue;
      const [sx, sy] = o.toScreen(l.x, l.y);
      if (onScreen(sx, sy)) swords(ctx, sx, sy, 3 * spriteScale);
    }
    const color = nations[snapshot!.playerNation]!.color;
    for (const e of dl.envoys) {
      const a = o.toScreen(provinces[e.from]!.x!, provinces[e.from]!.y!);
      const b = o.toScreen(provinces[e.to]!.x!, provinces[e.to]!.y!);
      drawEnvoy(ctx, a, b, e.progress, u, color, `${e.daysLeft} ${e.daysLeft === 1 ? "day" : "days"}`, onScreen);
    }
  }

  // The trade lens, zoomed in to regional: a coin on each trade city, the player's traders' loops dotted in its colour with
  // each trader where it stands and its purse, and the route being drawn (TRADE-142, TRADE-143). Only what is on screen is drawn.
  const tv = lens === "trade" ? snapshot?.trade : null;
  if (tv && zoom >= REGIONAL_ZOOM) {
    const s = snapshot!;
    const u = tokenUnit(zoom);
    const color = nations[s.playerNation]!.color;
    const coinImage = coinImages[u >= 3 ? 1 : 0]!;
    if (coinImage.complete)
      for (let i = 0; i < provinces.length; i++) {
        // Coins on the cities whose trade the player sees; while a route is drawn, on every city it could tap.
        if (!s.provinceTradeCity[i] || !isKnown(i) || (!routing && !s.provinceTradeSeen[i])) continue;
        const [sx, sy] = o.toScreen(provinces[i]!.x!, provinces[i]!.y!);
        if (onScreen(sx, sy, 16)) ctx.drawImage(coinImage, Math.round(sx + 3 * u), Math.round(sy - 7 * u));
      }
    const at = (p: number) => o.toScreen(provinces[p]!.x!, provinces[p]!.y!);
    const loop = (path: readonly number[], fill: string) => {
      if (path.length < 2) return;
      for (let k = 0; k < path.length; k++) dottedLine(ctx, at(path[k]!), at(path[(k + 1) % path.length]!), u, fill, o.width, o.height);
    };
    for (const t of tv.traders) loop(t.path, color);
    const draft = routing && tv.draft?.trader === routing.trader ? tv.draft : null;
    if (draft) loop(draft.path, PALETTE.gold);
    for (const t of tv.traders) {
      const [sx, sy] = at(t.at);
      if (!onScreen(sx, sy)) continue;
      const img = sprite(isShipKind(t.kind) ? "cog" : "caravan", color, u);
      const x = Math.round(sx - img.width / 2);
      const y = Math.round(sy - img.height - 2 * u);
      ctx.drawImage(img, x, y);
      // Its purse: a gold bar under it, filling as it collects.
      const w = img.width;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x, y + img.height, w, 3 * u);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(x + u, y + img.height + u, Math.round((w - 2 * u) * Math.min(1, t.purseMax > 0 ? t.purse / t.purseMax : 0)), u);
    }
    // The stops chosen so far, numbered in order.
    if (routing) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      routing.stops.forEach((p, k) => {
        const [sx, sy] = at(p);
        if (!onScreen(sx, sy)) return;
        const r = 6 * u;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(Math.round(sx - r / 2 - u), Math.round(sy - r / 2 - u), r + 2 * u, r + 2 * u);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(Math.round(sx - r / 2), Math.round(sy - r / 2), r, r);
        pixelText(ctx, String(k + 1), sx, sy - r, 12);
      });
    }
  }

  // The subjects lens: a dotted line from each courting realm's capital to the subject it courts, yours and those you know of (DIPL-220, SUBJ-095).
  const sc = lens === "subjects" ? snapshot?.statecraft : null;
  if (sc) {
    const cap = (n: number) => provinceIndex.get(nations[n]!.capital);
    const lines: [number, number][] = [
      ...(sc.courting?.mine ?? []).filter((c) => c.lord === null).map((c): [number, number] => [snapshot!.playerNation, c.target]),
      ...(sc.subjects?.subjects ?? []).flatMap((r) => r.courtedBy.map((n): [number, number] => [n, r.subject])),
    ];
    ctx.save();
    ctx.setLineDash([4 * spriteScale, 4 * spriteScale]);
    ctx.lineWidth = 2 * spriteScale;
    for (const [from, to] of lines) {
      const pa = cap(from), pb = cap(to);
      if (pa === undefined || pb === undefined) continue;
      const [ax, ay] = o.toScreen(provinces[pa]!.x!, provinces[pa]!.y!);
      const [bx, by] = o.toScreen(provinces[pb]!.x!, provinces[pb]!.y!);
      ctx.strokeStyle = nations[from]!.color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Battles: the two hosts fighting it out on their tile; zoomed out, crossed swords mark where.
  let animating = false;
  if (snapshot && zoom >= 1.6) {
    const now = performance.now();
    for (const b of snapshot.battles) {
      if (!isKnown(b.province)) continue;
      const [sx, sy] = o.toScreen(...tileXY(b.tile));
      if (!onScreen(sx, sy, 80)) continue;
      if (zoom < ARMY_ZOOM) swords(ctx, sx, sy, 3 * spriteScale);
      else
        animating = drawBattle(ctx, {
          id: b.id, x: sx, y: sy, u: tokenUnit(zoom), t: now,
          attColor: nations[b.attacker]!.color, defColor: nations[b.defender]!.color,
          attMen: b.attMen, defMen: b.defMen, attStart: b.attStart, defStart: b.defStart,
        }) || animating;
    }
    pruneBattles(snapshot.battles.map((b) => b.id));
    for (const b of snapshot.navy.battles) {
      if (!isKnown(b.zone)) continue;
      const [sx, sy] = o.toScreen(provinces[b.zone]!.x!, provinces[b.zone]!.y!);
      if (onScreen(sx, sy)) swords(ctx, sx, sy - 18 * tokenUnit(zoom), 3 * spriteScale);
    }
  }

  // Armies and their commanders, once zoomed in past the realm names (feedback 31).
  // Troops without a commander stay off the map, in their province's garrison (RECR-107).
  if (snapshot && zoom >= ARMY_ZOOM) {
    const s = snapshot;
    const u = tokenUnit(zoom);
    const now = performance.now();
    const inBattle = new Set(s.battles.map((b) => b.tile));
    const aboard = new Set(s.navy.aboard);
    // The player's marches first, so the tokens stand on their lines.
    for (let k = 0; k < s.armies.id.length; k++) {
      const path = s.armies.path[k]!;
      if (s.armies.owner[k] !== s.playerNation || !path.length) continue;
      const pts = [o.toScreen(...armyPosition(k))];
      for (const t of path) pts.push(o.toScreen(...tileXY(t)));
      // Where the army will stand as each week ends: this week's end, then every week after.
      const elapsed = weekStart ? hoursBetween(weekStart, s.date) + s.hour : 0;
      const week = DAYS_PER_TURN * 24;
      const marks = weekEnds(s.armies.pathHours[k]!, week - (elapsed % week), week).map((i) => pts[i + 1]!);
      drawRoute(ctx, { pts, u, color: nations[s.playerNation]!.color, weeks: marks, t: now, viewWidth: o.width });
      const hours = s.armies.etaHours[k]!;
      if (hours > 0) {
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const [bx, by] = pts.at(-1)!;
        pixelText(ctx, hoursText(hours), bx, by - 13 * u, 10);
      }
    }
    const stackCount = new Map<number, number>();
    armyHitBoxes = [];
    for (let k = 0; k < s.armies.id.length; k++) {
      const cmd = s.armies.commander[k]!;
      if (cmd < 0 || !isKnown(s.armies.location[k]!) || aboard.has(s.armies.id[k]!)) continue;
      const tile = s.armies.tile[k]!;
      // Fighting armies are drawn in their battle.
      if (s.armies.battle[k]! >= 0 && inBattle.has(tile)) continue;
      const nth = stackCount.get(tile) ?? 0;
      stackCount.set(tile, nth + 1);
      const [px, py] = armyPosition(k);
      let [sx, sy] = o.toScreen(px, py);
      // The first army on a tile stands dead centre; others fan out behind it.
      sx += nth * 8 * u;
      sy -= nth * 3 * u;
      if (!onScreen(sx, sy)) continue;
      const id = s.armies.id[k]!;
      const moving = performance.now() - stepStart < stepMs && s.armies.trail[k]!.length > 0;
      const realm = nations[s.armies.owner[k]!]!;
      const name = cmdOf(cmd).name;
      // The commander in their realm's colours, kit of the era and age (feedback 56), at one size at every zoom (feedback 57).
      const box = drawToken(ctx, {
        x: sx, y: sy, u: 2, color: realm.color, men: s.armies.men[k]!,
        dir: armyFacing(k), moving, selected: selected.has(id), t: now, flag: flagCanvas(realm, 1),
        commander: { name, nation: realm.id, color: realm.color, look: lookOfCulture(rules.names?.nations[realm.id]), era: eraOfYear(s.date.year), age: apparentAge(name, s.date.year) },
      });
      armyHitBoxes.push({ id, ...box });
      animating ||= moving;
      if (selected.has(id) || zoom >= 8) {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        pixelText(ctx, name, sx, box.y + box.h + 2, 10);
      }
    }
    drawColonies(o, ctx, u, onScreen);
    animating = drawFleets(o, ctx, u, now, onScreen) || animating;
  }
  // Rebel bands where they stand, in the rebels' colour with no flag (REBL-066); a tap on the province opens their card.
  if (snapshot && zoom >= ARMY_ZOOM) {
    const now = performance.now();
    for (const r of snapshot.rebels.risings) {
      if (!isKnown(r.location)) continue;
      const [sx, sy] = o.toScreen(...tileXY(r.tile));
      if (!onScreen(sx, sy)) continue;
      drawToken(ctx, { x: sx - 6 * tokenUnit(zoom), y: sy, u: 2, color: REBEL_COLOR, men: r.men, dir: -1, moving: r.target >= 0, selected: false, t: now });
      animating ||= r.target >= 0;
    }
  }
  if (animating) view.invalidate();
  if (performance.now() - stepStart < stepMs) view.invalidate();
}

/** The diplomacy lens shows only colours at world zoom; envoys and war aims from here in (DIPL-184). */
const REGIONAL_ZOOM = 2;

/** An envoy on the road: a dotted line from court to court, the rider where he is now, and the days still to ride. */
function drawEnvoy(ctx: CanvasRenderingContext2D, a: number[], b: number[], progress: number, u: number, color: string, label: string, onScreen: (x: number, y: number, pad?: number) => boolean): void {
  const [ax, ay] = a as [number, number];
  const [bx, by] = b as [number, number];
  const len = Math.hypot(bx - ax, by - ay);
  const step = 5 * u;
  for (let d = step / 2; d < len; d += step) {
    const x = Math.round(ax + ((bx - ax) * d) / len);
    const y = Math.round(ay + ((by - ay) * d) / len);
    if (!onScreen(x, y)) continue;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(x - u / 2, y - u / 2, u, u);
  }
  const rx = ax + (bx - ax) * progress;
  const ry = ay + (by - ay) * progress;
  if (!onScreen(rx, ry)) return;
  const img = sprite("envoy", color, u);
  ctx.save();
  ctx.translate(Math.round(rx), Math.round(ry - img.height / 2));
  // The rider faces the way he rides.
  if (bx < ax) ctx.scale(-1, 1);
  ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
  ctx.restore();
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  pixelText(ctx, label, rx, ry - img.height - 2, 10);
}

/** A dotted line between two points on screen, ink dots filled with a colour; skipped when it is off screen or wraps the map. */
function dottedLine(ctx: CanvasRenderingContext2D, a: number[], b: number[], u: number, fill: string, w: number, h: number): void {
  const [ax, ay] = a as [number, number];
  const [bx, by] = b as [number, number];
  if ((ax < 0 && bx < 0) || (ay < 0 && by < 0) || (ax > w && bx > w) || (ay > h && by > h)) return;
  const len = Math.hypot(bx - ax, by - ay);
  if (len > w * 2) return;
  const step = 5 * u;
  for (let d = step / 2; d < len; d += step) {
    const x = Math.round(ax + ((bx - ax) * d) / len);
    const y = Math.round(ay + ((by - ay) * d) / len);
    if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    ctx.fillStyle = fill;
    ctx.fillRect(x - u / 2, y - u / 2, u, u);
  }
}

/** Armies show once the realm names are gone (feedback 31). */
const ARMY_ZOOM = 3.5;
/** CSS pixels per art pixel of the army tokens, routes and battles. */
const tokenUnit = (zoom: number) => (zoom >= 12 ? 3 : 2);

/** Whole hours from one date to a later one (within a few weeks). */
function hoursBetween(from: GameDate, to: GameDate): number {
  const key = dateKey(to);
  for (let d = 0; d < 60; d++) if (dateKey(addDays(from, d)) === key) return d * 24;
  return 0;
}

/** The way each army last faced (by id), so it keeps facing that way when it halts. */
const facingOf = new Map<number, 1 | -1>();
/** East (1) or west (-1): the way army slot k marches, toward the next tile of its path. */
function armyFacing(k: number): 1 | -1 {
  const s = snapshot!;
  const id = s.armies.id[k]!;
  const w = s.tileWidth;
  const at = s.armies.tile[k]!;
  const trail = s.armies.trail[k]!;
  const next = s.armies.path[k]![0] ?? -1;
  const from = trail.length > 1 ? trail.at(-2)! : -1;
  let dx = next >= 0 ? (next % w) - (at % w) : from >= 0 ? (at % w) - (from % w) : 0;
  if (Math.abs(dx) > w / 2) dx = -dx;
  const dir = dx > 0 ? 1 : dx < 0 ? -1 : (facingOf.get(id) ?? 1);
  facingOf.set(id, dir);
  return dir;
}

/** A map point at the middle of a tile (tiles are the map image's pixels). */
function tileXY(t: number): [number, number] {
  const w = snapshot!.tileWidth;
  return [(t % w) + 0.5, Math.floor(t / w) + 0.5];
}

/** Where to draw army slot k: walking the tiles of the latest step, over the time that step is shown. */
function armyPosition(k: number): [number, number] {
  const s = snapshot!;
  if (s.tileWidth !== rules.map!.width) {
    // A world without the map's tiles: armies stand at their province's centre.
    const p = provinces[s.armies.location[k]!]!;
    return [p.x!, p.y!];
  }
  const end = tileXY(s.armies.tile[k]!);
  const from = drawnAt.get(s.armies.id[k]!);
  const trail = s.armies.trail[k]!;
  const t = stepMs ? (performance.now() - stepStart) / stepMs : 1;
  if (!from || !trail.length || t >= 1) return end;
  const pts = [from, ...trail.map(tileXY)];
  const f = t * (pts.length - 1);
  const i = Math.floor(f);
  const [ax, ay] = pts[i]!;
  let [bx, by] = pts[i + 1]!;
  // Take the short way round across the date line.
  if (bx - ax > rules.map!.width / 2) bx -= rules.map!.width;
  if (ax - bx > rules.map!.width / 2) bx += rules.map!.width;
  return [ax + (bx - ax) * (f - i), ay + (by - ay) * (f - i)];
}

/** Two crossed swords, r pixels from the middle to each tip. */
function swords(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.lineCap = "round";
  for (const [color, width] of [[PALETTE.ink, 5], [PALETTE.paper, 2]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const d of [-1, 1]) {
      // Blade, then the cross guard near the hilt.
      ctx.moveTo(x - d * r, y - r);
      ctx.lineTo(x + d * r, y + r);
      ctx.moveTo(x + d * r * 0.35, y + r * 0.85);
      ctx.lineTo(x + d * r * 0.85, y + r * 0.35);
    }
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

let armyHitBoxes: { id: number; x: number; y: number; w: number; h: number }[] = [];
let fleetHitBoxes: { id: number; mine: boolean; x: number; y: number; w: number; h: number }[] = [];

/** Where a fleet is drawn: in its sea zone, or in a port just off the coast toward the sea. */
function fleetXY(f: FleetView): [number, number] {
  const p = provinces[f.at]!;
  const sea = isWater[f.at] ? undefined : neighborIdx[f.at]!.find((q) => isWater[q]);
  if (sea === undefined) return [p.x!, p.y!];
  const z = provinces[sea]!;
  return [p.x! + (z.x! - p.x!) * 0.4, p.y! + (z.y! - p.y!) * 0.4];
}

/** Every known fleet as a ship in its realm's colours with its ship count, and the player's voyages as routes; true while one sails. */
function drawFleets(o: OverlayContext, ctx: CanvasRenderingContext2D, u: number, now: number, onScreen: (x: number, y: number, pad?: number) => boolean): boolean {
  const s = snapshot!;
  let moving = false;
  for (const f of s.navy.fleets) {
    if (f.owner !== s.playerNation || !f.route.length) continue;
    const pts = [o.toScreen(...fleetXY(f)), ...f.route.map((q) => o.toScreen(provinces[q]!.x!, provinces[q]!.y!))];
    drawRoute(ctx, { pts, u, color: nations[s.playerNation]!.color, weeks: [], t: now, viewWidth: o.width });
  }
  // The course being drawn for explorers, in gold over the sea (EXPL-069).
  const draft = exploring && s.navy.fleets.find((f) => f.id === exploring!.fleet);
  if (draft && exploring!.path.length) {
    const pts = [o.toScreen(...fleetXY(draft)), ...exploring!.path.map((q) => o.toScreen(provinces[q]!.x!, provinces[q]!.y!))];
    drawRoute(ctx, { pts, u, color: PALETTE.gold, weeks: [], t: now, viewWidth: o.width });
  }
  fleetHitBoxes = [];
  const stack = new Map<number, number>();
  for (const f of s.navy.fleets) {
    if (!f.ships || !isKnown(f.at)) continue;
    const nth = stack.get(f.at) ?? 0;
    stack.set(f.at, nth + 1);
    let [sx, sy] = o.toScreen(...fleetXY(f));
    sx += nth * 8 * u;
    sy -= nth * 3 * u;
    if (!onScreen(sx, sy)) continue;
    const realm = nations[f.owner]!;
    const box = drawToken(ctx, { x: sx, y: sy, u: 2, color: realm.color, men: f.ships, naval: true, flag: flagCanvas(realm, 1), dir: 1, moving: f.route.length > 0, selected: fleetView === f.id || sailing === f.id, t: now });
    fleetHitBoxes.push({ id: f.id, mine: f.owner === s.playerNation, ...box });
    moving ||= f.route.length > 0;
  }
  return moving;
}

/** Colonies being founded: a small flag of the founder over a ring that fills as the colony grows (EXPL-052, EXPL-073). */
function drawColonies(o: OverlayContext, ctx: CanvasRenderingContext2D, u: number, onScreen: (x: number, y: number, pad?: number) => boolean): void {
  const s = snapshot;
  if (!s) return;
  for (const c of s.exploration.colonies) {
    if (!isKnown(c.province)) continue;
    const p = provinces[c.province]!;
    const [x, y] = o.toScreen(p.x!, p.y!);
    if (!onScreen(x, y)) continue;
    const r = 6 * u;
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = PALETTE.ink;
    ctx.fillStyle = "rgba(20, 14, 8, 0.55)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = nations[c.owner]!.color;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * c.progress) / s.exploration.progressFounded);
    ctx.stroke();
    const flag = flagCanvas(nations[c.owner]!, 1);
    ctx.drawImage(flag, Math.round(x - flag.width / 2), Math.round(y - r - flag.height - u), flag.width, flag.height);
  }
}

/** Settlement drawn for a province by its people (thousands). */
function settlementOf(population: number): "village" | "town" | "city" {
  return population >= 200 ? "city" : population >= 25 ? "town" : "village";
}

const SETTLEMENT_NAMES = { village: "Village", town: "Town", city: "City" };
const WALL_NAMES = { castle: "Stone castle", fort: "Earthwork ring fort" };

/** The hammer's angle at a time, in radians (its head points left, so lifting it back turns it clockwise): lifted over 0.6 s, brought down in 0.15 s past upright onto the work, resting 0.25 s. */
function hammerSwing(t: number): number {
  const f = (t % 1000) / 1000;
  return f < 0.6 ? 0.7 * (f / 0.6) - 0.25 * (1 - f / 0.6) : f < 0.75 ? 0.7 - 0.95 * ((f - 0.6) / 0.15) : -0.25;
}
let hammerTick: ReturnType<typeof setTimeout> | 0 = 0;

/** The hammer marking a building site on the map. */
const hammerImage = Object.assign(new Image(), { src: iconUrl("hammer", 1) });
/** The coin over each trade city under the trade lens, at one and two art pixels a pixel. */
const coinImages = [1, 2].map((scale) => Object.assign(new Image(), { src: iconUrl("coin", scale) }));

/** A province's walls: its castle as the works stand now (the map's before a game starts), a stone castle in every capital. */
function wallsAt(p: number): "castle" | "fort" | null {
  const owner = nations[owners[p]!];
  if (owner && owner.capital === provinces[p]!.id) return "castle";
  if (!snapshot) return provinces[p]!.castle ?? null;
  const step = snapshot.provinceWorks[p * snapshot.works.length + CASTLE]!;
  return step >= 2 ? "castle" : step === 1 ? "fort" : null;
}
const CASTLE = WORKS.indexOf("castle");

/**
 * Draws a label with a thick ink outline and a drop shadow, so it reads over
 * busy terrain. Outlined text is slow to draw, so each label is drawn once
 * into a small bitmap and reused; ctx.textAlign must be "center", and
 * ctx.textBaseline picks which edge sits at y.
 */
function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, water = false): void {
  const label = labelBitmap(text, size, water);
  const baseline = ctx.textBaseline;
  const top = baseline === "top" ? y - label.pad : baseline === "bottom" ? y - label.h + label.pad : y - label.h / 2;
  ctx.drawImage(label.canvas, Math.round(x - label.w / 2), Math.round(top), label.w, label.h);
}

interface LabelBitmap {
  canvas: HTMLCanvasElement;
  /** Size in CSS pixels. */
  w: number;
  h: number;
  /** Outline and shadow room around the letters. */
  pad: number;
}
const labelCache = new Map<string, LabelBitmap>();
// Labels drawn before the pixel font arrived used a fallback; redraw them.
document.fonts?.addEventListener("loadingdone", () => {
  labelCache.clear();
  view?.invalidate();
});
/** Most labels on screen at once, with room to pan; older ones are dropped. */
const LABEL_CACHE_SIZE = 800;

function labelBitmap(text: string, size: number, water: boolean): LabelBitmap {
  const key = `${size}|${water ? 1 : 0}|${text}`;
  const hit = labelCache.get(key);
  if (hit) {
    // Refresh its place so the most recently drawn labels are kept.
    labelCache.delete(key);
    labelCache.set(key, hit);
    return hit;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Jersey 10 draws small on its em: 1.3 times the size matches the old face's letters.
  const fontPx = Math.round((size + 2) * 1.3);
  const font = `${fontPx}px "Jersey 10", "Courier New", monospace`;
  const line = Math.max(3, Math.round(size / 3.5));
  const shadow = Math.max(1, Math.round(size / 9));
  const pad = Math.ceil(line / 2) + shadow + 1;
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d")!;
  c.font = font;
  const w = Math.ceil(c.measureText(text).width) + pad * 2;
  const h = Math.ceil(fontPx * 1.05) + pad * 2;
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  c.scale(dpr, dpr);
  c.font = font;
  c.textAlign = "center";
  c.textBaseline = "top";
  c.lineWidth = line;
  c.lineJoin = "round";
  c.strokeStyle = PALETTE.ink;
  const cx = Math.round(w / 2);
  c.strokeText(text, cx + shadow, pad + shadow);
  c.strokeText(text, cx, pad);
  c.fillStyle = water ? PALETTE.mist : PALETTE.paper;
  c.fillText(text, cx, pad);
  const label = { canvas, w, h, pad };
  labelCache.set(key, label);
  if (labelCache.size > LABEL_CACHE_SIZE) labelCache.delete(labelCache.keys().next().value!);
  return label;
}

// ---- input ----
function onTap(sx: number, sy: number, province: number): void {
  // While a route is drawn, a tap picks its next stop (TRADE-142).
  if (routing) return routeTap(province);
  officialView = -1;
  achView = false;
  // Drawing a course: each tap on the sea adds a leg; the bar over the map says what it takes (EXPL-069).
  if (exploring && snapshot) {
    if (province >= 0 && isWater[province]) addLeg(province);
    return;
  }
  // Armies sit on top of provinces, so check them first, with some room around each for fingers.
  const PAD = 8;
  const hit = armyHitBoxes.find((b) => sx >= b.x - PAD && sx <= b.x + b.w + PAD && sy >= b.y - PAD && sy <= b.y + b.h + PAD);
  const fleetHit = fleetHitBoxes.find((b) => b.mine && sx >= b.x - PAD && sx <= b.x + b.w + PAD && sy >= b.y - PAD && sy <= b.y + b.h + PAD);
  if (fleetHit && !hit && snapshot) {
    // A fleet tapped is chosen to sail; tapped again, its card opens.
    if (sailing === fleetHit.id) openFleet(fleetHit.id);
    else pickFleet(fleetHit.id);
    return;
  }
  if (sailing >= 0 && snapshot && province >= 0 && (isWater[province] || neighborIdx[province]!.some((q) => isWater[q]))) {
    // A sea zone, a port or a shore: the fleet sets sail at once (an army aboard lands on a shore).
    const fleet = sailing;
    sailing = -1;
    sound.sfx("army_order_move");
    void act({ type: "navy", do: "sail", fleet, to: province });
    return;
  }
  sailing = -1;
  fleetView = -1;
  if (hit && snapshot && snapshot.armies.owner[armySlot(hit.id)] === snapshot.playerNation) {
    // With armies chosen, another one joins them (or leaves, tapped again); else it is the one chosen.
    if (selected.size && !selected.has(hit.id)) selected.add(hit.id);
    else if (selected.size > 1) selected.delete(hit.id);
    else return sound.sfx("army_select"), pickArmy(hit.id);
    selectionChanged();
    return;
  } else if (selected.size && snapshot && province >= 0 && !isWater[province]) {
    // Any land is a target: the armies set off at once, over the fastest tiles to the spot tapped.
    const armies = [...selected];
    sound.sfx("army_order_move");
    const [mx, my] = view.toMap(sx, sy);
    const tile = snapshot.tileWidth === rules.map!.width ? Math.floor(my) * snapshot.tileWidth + Math.floor(mx) : undefined;
    selected.clear();
    selectedProvince = province;
    // Keep the map in view after giving an order; the panel waits behind its button.
    panelCollapsed = true;
    armyView = -1;
    realmView = -1;
    newsView = false;
    renderArmyList();
    restyleProvinces();
    void (async () => {
      for (const army of armies) await act({ type: "move", army, to: province, ...(tile !== undefined ? { tile } : {}) });
    })();
    return;
  } else {
    // A tap only selects; the overview opens from the button in the lower left.
    // Uncharted land can't be looked at yet.
    selected.clear();
    renderArmyList();
    if (province !== selectedProvince) provinceTab = "overview";
    if (province >= 0 && isKnown(province)) sound.sfx("map_select_province");
    selectedProvince = province >= 0 && isKnown(province) ? province : -1;
  }
  armyView = -1;
  realmView = -1;
  newsView = false;
  // Under the diplomacy lens a tap opens the realm's Diplomacy tab: what they think of you, and your envoys (DIPL-185, DIPL-209).
  if ((lens === "diplomacy" || lens === "subjects") && selectedProvince >= 0 && owners[selectedProvince]! >= 0) {
    realmView = owners[selectedProvince]!;
    realmTab = "diplomacy";
    officialView = -1;
    lordView = -1;
    panelCollapsed = false;
  }
  restyleProvinces();
  renderPanel();
  renderActions();
}

/** Chooses a fleet to sail and folds the panel away, as an army is picked; its card waits behind the panel button. */
function pickFleet(id: number): void {
  selected.clear();
  sailing = id;
  fleetView = id;
  armyView = -1;
  realmView = -1;
  officialView = -1;
  lordView = -1;
  newsView = false;
  panelCollapsed = true;
  sound.sfx("army_select");
  restyleProvinces();
  renderPanel();
  renderArmyList();
}

/** Starts drawing a course for a fleet of explorers in port: the panel folds away and the voyage bar shows (EXPL-069). */
function startExplore(id: number): void {
  exploring = { fleet: id, path: [], legs: [], carryOn: false };
  sailing = -1;
  fleetView = id;
  panelCollapsed = true;
  renderPanel();
  renderVoyageBar();
}

/** The quickest way, in zones, from where the course ends to a tapped zone, over the sea the fleet may enter. */
function legTo(from: number, to: number, reach: number): number[] | null {
  const ex = snapshot!.exploration;
  const may = (q: number) => isWater[q] && (!ex.ocean[q] || reach === 255 || (reach >= 0 && ex.coastDist[q]! <= reach));
  if (!may(to)) return null;
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    if (p === to) {
      const path: number[] = [];
      for (let x = to; x !== from; x = prev.get(x)!) path.push(x);
      return path.reverse();
    }
    for (const q of neighborIdx[p]!) if (!prev.has(q) && may(q)) (prev.set(q, p), queue.push(q));
  }
  return null;
}

function addLeg(zone: number): void {
  const x = exploring!;
  const f = snapshot!.navy.fleets.find((y) => y.id === x.fleet);
  const reach = snapshot!.exploration.fleets.find((y) => y.id === x.fleet)?.oceanReach ?? -1;
  if (!f) return cancelExplore();
  const leg = legTo(x.path.at(-1) ?? f.at, zone, reach);
  if (!leg || !leg.length) {
    alertPlayer(`${provinces[zone]!.name} is out of these ships' reach: open ocean needs ${reach < 0 ? "the compass and sea charts" : "ocean navigation"} this far out.`, "scroll");
    return;
  }
  sound.sfx("army_order_move");
  x.legs.push(x.path.length);
  x.path.push(...leg);
  renderVoyageBar();
  view.invalidate();
}

function cancelExplore(): void {
  exploring = null;
  voyageBarEl.hidden = true;
  reopen.hidden = false;
  view.invalidate();
  renderPanel();
}

/** The voyage bar over the map while a course is drawn (EXPL-069, EXPL-074). */
function renderVoyageBar(): void {
  const x = exploring;
  if (!x || !snapshot) {
    voyageBarEl.hidden = true;
    return;
  }
  const ex = snapshot.exploration;
  const bits = ex.charted;
  const uncharted = x.path.filter((q) => !(bits[q >> 3]! & (1 << (q & 7)))).length;
  const supply = Math.min(...(snapshot.navy.mine.find((m) => m.id === x.fleet)?.ships.map((sh) => sh.supplyMax) ?? [0]));
  voyageBarEl.innerHTML = voyageBar({ zones: x.path.length, uncharted, supply, carryOn: x.carryOn });
  voyageBarEl.hidden = false;
  reopen.hidden = true;
  voyageBarEl.querySelectorAll<HTMLButtonElement>("[data-voyage-low]").forEach((b) =>
    b.addEventListener("click", () => {
      x.carryOn = b.dataset.voyageLow === "on";
      renderVoyageBar();
    }),
  );
  voyageBarEl.querySelector("[data-voyage-undo]")?.addEventListener("click", () => {
    x.path.length = x.legs.pop() ?? 0;
    renderVoyageBar();
    view.invalidate();
  });
  voyageBarEl.querySelector("[data-voyage-cancel]")?.addEventListener("click", () => {
    panelCollapsed = false;
    cancelExplore();
  });
  voyageBarEl.querySelector("[data-voyage-go]")?.addEventListener("click", () => {
    const { fleet, path, carryOn } = x;
    void act({ type: "explore", do: "voyage", fleet, path, carryOn }).then(() => {
      if (snapshot?.rejectedOrders.length) return;
      exploring = null;
      voyageBarEl.hidden = true;
      sound.sfx("army_order_move");
      renderPanel();
      view.invalidate();
    });
  });
}

/** A fleet's name on a button: its admiral's, else what it is. */
function fleetLabel(id: number): string {
  const f = snapshot?.navy.fleets.find((x) => x.id === id);
  return !f ? "a lost fleet" : f.admiral >= 0 ? `${cmdOf(f.admiral).name}'s fleet` : f.explorers ? "the explorers" : "the fleet";
}

/** Opens a fleet's card. */
function openFleet(id: number): void {
  fleetView = id;
  sailing = -1;
  armyView = -1;
  realmView = -1;
  officialView = -1;
  lordView = -1;
  newsView = false;
  panelCollapsed = false;
  renderPanel();
}

/** Picks an army to move and folds the panel away; the map stays where it is (feedback 6). */
function pickArmy(id: number): void {
  if (!snapshot) return;
  // An army aboard ships moves with its fleet.
  const ship = snapshot.navy.fleets.find((f) => f.army === id && f.owner === snapshot!.playerNation);
  if (ship) return openFleet(ship.id);
  selected.clear();
  selected.add(id);
  selectedProvince = snapshot.armies.location[armySlot(id)]!;
  realmView = -1;
  panelCollapsed = true;
  selectionChanged();
}

function selectionChanged(): void {
  restyleProvinces();
  renderPanel();
  renderArmyList();
}

/** The player's commanders in a list to pick from, any number at once (feedback 21). */
function renderArmyList(): void {
  armyList.hidden = armyListClosed || !snapshot;
  armyButton.hidden = !snapshot;
  if (armyList.hidden) return;
  const s = snapshot!;
  const mine = [...s.armies.id.keys()].filter((k) => s.armies.owner[k] === s.playerNation && s.armies.commander[k]! >= 0);
  armyList.innerHTML = `
    <h3 class="sub">Your commanders</h3>
    ${mine.length ? mine
      .map((k) => {
        const id = s.armies.id[k]!;
        return `<button class="paper lens${selected.has(id) ? " on" : ""}" data-pick="${id}"><b>${esc(cmdOf(s.armies.commander[k]!).name)}</b><small>${fmt(s.armies.men[k]! / 1000)}k at ${esc(provinces[s.armies.location[k]!]!.name)}${marchLine(k)}</small></button>`;
      })
      .join("") : `<p class="hint">No commander leads an army yet.</p>`}
    <p class="hint">${selected.size ? `${selected.size} chosen: tap the map to send ${selected.size > 1 ? "them all" : "it"} there.` : "Choose one or more, then tap the map."}</p>
    ${selected.size ? `<button class="paper" data-pick-none>Clear the choice</button>` : ""}`;
  armyList.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = Number(b.dataset.pick);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      panelCollapsed = true;
      selectionChanged();
    }),
  );
  armyList.querySelector("[data-pick-none]")?.addEventListener("click", () => {
    selected.clear();
    selectionChanged();
  });
}

const duration = (days: number) => (days < 14 ? `${days} day${days === 1 ? "" : "s"}` : `${Math.round(days / 7)} weeks`);
const hoursText = (hours: number) => (hours < 24 ? `${Math.ceil(hours)} hours` : duration(Math.ceil(hours / 24)));

/**
 * Men on campaign a province's store could feed for a month, by what foragers
 * find on its ground (feedback 83); before a game starts, the map's guess.
 */
function landFeeds(p: number): number {
  const s = snapshot;
  const g = marchGraph.ground[p];
  if (!g) return 0;
  if (!s) return forageLimit(march, marchGraph, p);
  return (s.provinceFoodMonths[p]! * s.provincePeople[p]! * 1000 * march.foraging[g]) / (march.rationsPerSoldier * 2);
}

/** Food in the wagons, whether the army eats as on campaign, and what the store where it stands can give it (feedback 83). */
function supplyLine(k: number): string {
  const s = snapshot!;
  const need = s.armies.rations[k]!;
  const months = need > 0 ? s.armies.food[k]! / need : 0;
  const refill = s.armies.refill[k]!;
  const here = s.armies.location[k]!;
  const enemy = owners[here]! >= 0 && s.wars.some((w) => (w.attackers.includes(s.playerNation) && w.defenders.includes(owners[here]!)) || (w.defenders.includes(s.playerNation) && w.attackers.includes(owners[here]!)));
  const land = refill <= 0
    ? enemy ? "foragers find nothing here" : `the locals here have nothing to spare above their ${march.homeReserveMonths} months`
    : `${enemy ? "foragers can take" : "the locals can give"} ${fmt(refill)} rations a month here${refill < need ? ", less than it eats" : ""}`;
  return `Food for ${months.toFixed(1)} months${s.armies.campaigning[k] ? " · on campaign, men eat double" : ""} · ${land}`;
}

function marchLine(k: number): string {
  const a = snapshot!.armies;
  if (a.battle[k]! >= 0) return " · in battle";
  if (a.retreating[k]) return " · falling back";
  const route = a.route[k]!;
  if (!route.length && !a.path[k]!.length) return "";
  const to = route.length ? route.at(-1)! : a.location[k]!;
  return ` · marching to ${esc(provinces[to]!.name)}${a.etaHours[k]! > 0 ? `, ${hoursText(a.etaHours[k]!)}` : ""}`;
}

function armySlot(id: number): number {
  return snapshot ? snapshot.armies.id.indexOf(id) : -1;
}

// ---- HUD and panels ----
const pennant = (nation: FlagOf, scale = 2) => `<img class="px-icon flag" src="${flagUrl(nation, scale)}" alt="">`;

function renderHud(): void {
  if (!snapshot) {
    hud.innerHTML = `
      <div class="realm title">${icon("crown", 2)}<b>Pocket Hegemony</b></div>
      <span class="subtitle">Autumn 1444 · choose a realm</span>`;
    return;
  }
  const s = snapshot;
  const me = s.playerNation;
  const n = nations[me]!;
  const inc = s.nationMonthlyIncome[me]!;
  hud.innerHTML = `
    <button class="icon-only game-menu" data-shell="menu" title="Game menu" aria-label="Game menu">${icon("menu", 2)}</button>
    <button class="realm" data-realm="${me}" title="Your realm">${pennant(n, 2)}<b>${esc(n.name)}</b></button>
    <span class="plaque turn-label" title="${dateText(s.date)}, ${seasonName(latOf(provinces[provinceIndex.get(n.capital)!]!), s.date.month).toLowerCase()}: one turn is a week">${dateText(s.date, true)}${s.battles.some((b) => b.player) ? ` <small>${String(s.hour).padStart(2, "0")}:00</small>` : ""}</span>
    <button class="plaque" data-realm="${me}" data-realm-open="treasury" title="Treasury: gold, and change per month. Opens the ledger">${icon("coin", 1)}${fmt(s.nationTreasury[me]!)} <small class="${inc < 0 ? "down" : ""}">${inc >= 0 ? "+" : ""}${inc.toFixed(1)}</small></button>
    ${s.stability ? stabilityPlaque(s.stability, me, s.revolution) : ""}
    ${myWars().length ? `<button class="plaque at-war" data-realm="${me}" data-realm-open="diplomacy" title="Your wars">${icon("swords", 1)}At war</button>` : ""}
    <button class="plaque dispatches${s.calls.length || s.peaceOffers.length || asksOf(s).length ? " urgent" : ""}" data-news title="Dispatches: everything that happened, newest first">${icon("scroll", 1)}${unread + s.calls.length + s.peaceOffers.length + asksOf(s).length || ""}</button>`;
}

/** Wars the player fights, with the player's side first. */
function myWars(): { id: string; ours: number[]; theirs: number[]; start: string }[] {
  if (!snapshot) return [];
  const me = snapshot.playerNation;
  return snapshot.wars
    .filter((w) => w.attackers.includes(me) || w.defenders.includes(me))
    .map((w) => (w.attackers.includes(me) ? { id: w.id, ours: w.attackers, theirs: w.defenders, start: w.start } : { id: w.id, ours: w.defenders, theirs: w.attackers, start: w.start }));
}

const relationOf = (n: number) => snapshot?.relations.find((r) => r.nation === n) ?? null;
/** "1450-03" → "March 1450". */
const monthText = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${m ? MONTHS[m - 1] + " " : ""}${y}`;
};
const realmButton = (n: number, tab?: "diplomacy") => `<button class="realm-link" data-realm="${n}"${tab ? ` data-realm-open="${tab}"` : ""}>${pennant(nations[n]!)}<b>${esc(nations[n]!.name)}</b></button>`;

/** Sends an order that acts at once (war, peace, levies), then shows what came of it. */
async function act(order: Order): Promise<void> {
  if (acting || !snapshot) return;
  acting = true;
  takeSnapshot(await engine.send({ type: "act", order }), 0);
  acting = false;
  changedSinceResume = true;
  applySnapshot();
  hearSnapshot();
  // War and peace change the music at once, not at the turn's end.
  if (snapshot.news.some((x) => (x.kind === "war" || x.kind === "peace") && x.nations.includes(snapshot!.playerNation))) musicDecides();
  // What came of it goes in the log; a refusal is also said over the map, where the order was given.
  logNews(snapshot);
  for (const r of snapshot.rejectedOrders) alertPlayer(`Not done: ${r.reason}.`, "scroll");
  // An order the game took ticks off its first-campaign hint; a refused one ticks nothing (TUT-122).
  if (!snapshot.rejectedOrders.length) hints.did(order.type);
  restyleProvinces();
  renderHud();
  renderPanel();
  renderActions();
}

/** Takes in a fresh snapshot; armies walk its trail over the next `ms` from where they are drawn now. */
function takeSnapshot(next: Snapshot, ms: number): void {
  const at = new Map<number, [number, number]>();
  if (snapshot) for (let k = 0; k < snapshot.armies.id.length; k++) at.set(snapshot.armies.id[k]!, armyPosition(k));
  snapshot = next;
  setPortraitYear(next.date.year);
  hearAchievements(next);
  drawnAt = at;
  stepStart = performance.now();
  stepMs = ms;
}

/** Takes in a fresh snapshot's map state. */
function applySnapshot(): void {
  owners = snapshot!.provinceOwner;
  occupiers = snapshot!.provinceOccupier;
  nationLabels = computeNationLabels();
  renderLitChip();
  renderRouteBar();
}

const NEWS_ICON: Record<News["kind"], "swords" | "castle" | "crown" | "scroll"> = {
  war: "swords", joined: "swords", call: "swords", battle: "swords", peace: "crown", siege: "castle", occupied: "castle", freed: "castle", raised: "swords", refused: "scroll", destroyed: "crown", famine: "scroll", unrest: "scroll",
  invention: "scroll", built: "castle", envoy: "scroll", event: "scroll", reform: "crown", rebels: "swords", heritage: "crown", voyage: "scroll", colony: "crown", crown: "crown", revolution: "crown", trade: "scroll",
};

/**
 * Takes a snapshot's news into the dispatches log, newest first, without
 * opening it (feedback 72). A battle or siege of the player's that has just
 * begun, and a new call to arms or peace offer, are said over the map instead.
 */
function logNews(s: Snapshot): void {
  const me = s.playerNation;
  const news = [...s.rejectedOrders.map((r): News => ({ kind: "refused", text: `Not done: ${r.reason}.`, nations: [me] })), ...s.news];
  dispatches = [...news.reverse().map((n) => ({ date: { ...s.date }, news: n })), ...dispatches].slice(0, DISPATCHES_KEPT);
  unread += news.filter((x) => x.nations.includes(me) && x.kind !== "raised").length;
  for (const x of news) {
    // A work of the player's finished: said over the map, with Go there.
    if (x.kind === "built" && x.nations.includes(me) && x.province !== undefined) alertPlayer(x.text, "castle", { province: x.province });
    if (!x.begins || x.province === undefined || !x.nations.includes(me)) continue;
    if (x.kind !== "battle") {
      alertPlayer(x.text, "castle", { province: x.province });
      continue;
    }
    // A sea battle of the player's: said over the map, with Go there (it is fought out round by round, the week plays on).
    if (isWater[x.province]) {
      alertPlayer(x.text, "swords", { province: x.province });
      continue;
    }
    // A battle over as soon as it began (one side swept away) is only in the log.
    if (!s.battles.some((b) => b.province === x.province)) continue;
    // The week waits at a battle of the player's until they go and watch it, or play on (feedback 73).
    alertPlayer(`A battle has begun at ${provinces[x.province]!.name}. The week waits.`, "swords", { province: x.province, battle: true });
    if (playing && !paused && watching?.province !== x.province) {
      paused = true;
      renderActions();
    }
  }
  // A battle's alert goes once the battle is over.
  alerts.querySelectorAll<HTMLElement>("[data-battle]").forEach((el) => {
    if (!s.battles.some((b) => b.province === Number(el.dataset.battle))) el.remove();
  });
  // The battle being watched has ended: its last dispatch says how.
  if (watching && !watching.result && !s.battles.some((b) => b.province === watching!.province)) {
    watching.result = news.find((x) => x.kind === "battle" && !x.begins && x.province === watching!.province)?.text ?? "The battle is over.";
  }
  renderBattleWatch();
  // Learning: an invention learned, or nothing being studied, opens the Learning tab (RSCH-089).
  for (const x of news) if (x.kind === "invention" && x.nations.includes(me)) alertPlayer(x.text, "scroll", x.province === undefined ? { tab: "learning" } : { province: x.province });
  // A seal cracks, an ambition is settled, a heyday wakes or a choice waits: one quiet line that opens the Heritage tab (HER-071).
  for (const x of news) if (x.kind === "heritage" && x.nations.includes(me)) alertPlayer(x.text, "crown", { tab: "heritage" });
  // A crown inherited, a claim gained or lapsed, crowns merged: one line that opens the Diplomacy tab, where Your house lists them (SUBJ-130).
  for (const x of news) if (x.kind === "crown" && x.nations.includes(me)) alertPlayer(x.text, "crown", { tab: "diplomacy" });
  askForStudy(s, news.some((x) => x.kind === "invention" && /Learned/.test(x.text)));
  for (const c of s.calls) {
    if (alerted.has(`call ${c.id}`)) continue;
    alerted.add(`call ${c.id}`);
    alertPlayer(`${nations[c.caller]!.name} calls you to arms against ${nations[c.against]!.name}.`, "swords", { answer: true });
  }
  for (const o of s.peaceOffers) {
    if (alerted.has(`peace ${o.id}`)) continue;
    alerted.add(`peace ${o.id}`);
    alertPlayer(`${nations[o.from]!.name} offers peace.`, "crown", { answer: true });
  }
  for (const v of s.rebels.verdicts) {
    if (alerted.has(`verdict ${v.id}`)) continue;
    alerted.add(`verdict ${v.id}`);
    alertPlayer(`The rebels of ${provinces[v.province]!.name} are beaten: choose their fate.`, "crown", { province: v.province });
  }
  for (const a of asksOf(s)) {
    if (alerted.has(`ask ${a.id}`)) continue;
    alerted.add(`ask ${a.id}`);
    alertPlayer(`${nations[a.from]!.name}'s envoy waits for your answer.`, "scroll", { answer: true });
  }
  // A new event for the player opens its card, and the week waits for the answer (EVT-044, EVT-076).
  const fresh = s.events.filter((c) => !eventsSeen.has(c.event));
  for (const c of fresh) eventsSeen.add(c.event);
  if (fresh.length) {
    eventFolded = false;
    if (playing && !paused) {
      paused = true;
      pausedForEvent = true;
    }
  }
  renderEventCard();
  // A revolution breaking out covers the map, and the week waits for the answer (REVO-091).
  if (s.revolution?.outbreak && playing && !paused) {
    paused = true;
    pausedForEvent = true;
  }
  renderRevolutionCard();
}

/** The player's revolution's choice card while it waits on a stance (REVO-091): it cannot be folded away. */
function renderRevolutionCard(): void {
  const v = snapshot?.revolution;
  revolutionCard.hidden = !v?.outbreak;
  if (!v?.outbreak) return;
  revolutionCard.innerHTML = revolutionCardHtml(v, nations[snapshot!.playerNation]!.name);
  revolutionCard.querySelectorAll<HTMLButtonElement>("[data-revolution-stance]").forEach((b) =>
    b.addEventListener("click", async () => {
      await act({ type: "answerRevolution", stance: b.dataset.revolutionStance as "lead" | "bend" | "fight" });
      renderRevolutionCard();
      if (!snapshot?.revolution?.outbreak && !snapshot?.events.length && pausedForEvent && playing && paused) {
        pausedForEvent = false;
        paused = false;
        resume?.();
        renderActions();
      }
    }),
  );
}

/** The oldest event waiting for the player, as a card over the map, unless folded into End turn. */
function renderEventCard(): void {
  const cards = snapshot?.events ?? [];
  const card = cards[0];
  eventCard.hidden = !card || eventFolded;
  if (!card || eventFolded) return;
  eventCard.innerHTML = eventCardHtml(card, cards.length);
  eventCard.querySelector("[data-event-fold]")!.addEventListener("click", () => {
    eventFolded = true;
    renderEventCard();
    renderActions();
  });
  eventCard.querySelectorAll<HTMLButtonElement>("[data-event-option]").forEach((b) =>
    b.addEventListener("click", async () => {
      await act({ type: "answerEvent", event: b.dataset.event!, option: b.dataset.eventOption! });
      renderEventCard();
      // The week paused for the event plays on once nothing waits.
      if (!snapshot?.events.length && pausedForEvent && playing && paused) {
        pausedForEvent = false;
        paused = false;
        resume?.();
        renderActions();
      }
    }),
  );
}

/** Opens the oldest waiting event's card (End turn while one waits, Answer in the dispatches). */
function openEventCard(): void {
  eventFolded = false;
  renderEventCard();
  renderActions();
}

/** While nothing is studied, one alert asks the player to choose (once for each thing learned); `told` when a Learned alert already said so. */
function askForStudy(s: Snapshot, told = false): void {
  const r = s.research;
  if (!r || r.study || !r.options.length || askedStudy === r.known.length) return;
  askedStudy = r.known.length;
  if (!told) alertPlayer("Choose what your scholars study.", "scroll", { tab: "learning" });
}

/** Alerts shown at once, at most this many; the oldest gives way. */
const ALERTS_SHOWN = 3;
/** How long an alert stays, in ms; everything it says is also in the log. */
const ALERT_MS = 12000;

/** A short alert over the map, with Go there (to a province) or Answer (opens the dispatches). */
function alertPlayer(text: string, what: "swords" | "castle" | "crown" | "scroll", to: { province?: number; answer?: true; battle?: true; tab?: "learning" | "heritage" | "diplomacy" } = {}): void {
  if ([...alerts.children].some((el) => el.querySelector("span")?.textContent === text)) return;
  const el = document.createElement("div");
  el.className = "alert framed";
  el.setAttribute("role", "status");
  if (to.battle) el.dataset.battle = String(to.province);
  el.innerHTML = `${icon(what, 2)}<span>${esc(text)}</span>${
    to.battle ? `<button class="wax go-there">${icon("swords", 1)}Watch</button>` : to.tab && snapshot ? `<button class="wax go-there" data-realm="${snapshot.playerNation}" data-realm-open="${to.tab}">Open</button>` : to.province !== undefined ? `<button class="wax go-there">${icon("map", 1)}Go there</button>` : to.answer ? `<button class="wax go-there">Answer</button>` : ""
  }<button class="paper dismiss" aria-label="Dismiss">${icon("close", 1)}</button>`;
  const remove = () => el.remove();
  el.querySelector(".dismiss")!.addEventListener("click", remove);
  el.querySelector(".go-there")?.addEventListener("click", () => {
    remove();
    if (to.battle && to.province !== undefined) watchBattle(to.province);
    else if (to.tab) return; // its [data-realm] button opens the tab
    else if (to.province !== undefined) goThere(to.province);
    else {
      newsView = true;
      realmView = -1;
      officialView = -1;
      panelCollapsed = false;
      unread = 0;
      clearAlerts();
      renderHud();
      renderPanel();
    }
  });
  alerts.append(el);
  // The oldest alert gives way, but never one for a battle the week waits on.
  while (alerts.children.length > ALERTS_SHOWN) ([...alerts.children].find((x) => !(x as HTMLElement).dataset.battle) ?? alerts.firstElementChild!).remove();
  // A battle's alert stays while the week waits on it.
  if (!to.battle) setTimeout(remove, ALERT_MS);
}

/** Clears the alerts the log now shows, keeping those for a battle the week waits on. */
function clearAlerts(): void {
  alerts.querySelectorAll<HTMLElement>(".alert:not([data-battle])").forEach((el) => el.remove());
}

/** Goes to a battle of the player's, shows its progress over the map and plays the week on at a pace to follow it. */
function watchBattle(province: number): void {
  watching = { province };
  goThere(province, ARMY_ZOOM + 1);
  renderBattleWatch();
  if (playing && paused) {
    paused = false;
    resume?.();
    renderActions();
  }
}

/** The battle being watched: both hosts, men left of men at the start, and the round; then how it ended. */
function renderBattleWatch(): void {
  const b = watching && snapshot?.battles.find((x) => x.province === watching!.province);
  battleWatch.hidden = !watching;
  if (!watching) return;
  const side = (n: number, men: number, start: number) => `<div class="side">${pennant(nations[n]!)}<b>${esc(nations[n]!.name)}</b>
    <span class="bar"><i style="width:${start ? Math.max(0, Math.min(100, (men / start) * 100)) : 0}%;background:${nations[n]!.color}"></i></span><span class="men">${fmt(men)}</span></div>`;
  battleWatch.innerHTML = `
    <header><b>${icon("swords", 1)} Battle of ${esc(provinces[watching.province]!.name)}</b>${b ? `<small>Round ${Math.min(b.round + 1, b.rounds)} of ${b.rounds}</small>` : ""}
      <button class="paper dismiss" aria-label="Stop watching">${icon("close", 1)}</button></header>
    ${b ? side(b.attacker, b.attMen, b.attStart) + side(b.defender, b.defMen, b.defStart) : `<p>${esc(watching.result ?? "The battle is over.")}</p>`}`;
  battleWatch.querySelector(".dismiss")!.addEventListener("click", () => {
    watching = null;
    renderBattleWatch();
  });
}

/** Centres the map on a province and selects it; on a phone its card waits folded so the map stays in view. */
function goThere(i: number, zoom = 4): void {
  officialView = -1;
  realmView = -1;
  armyView = -1;
  newsView = false;
  selectedProvince = i;
  provinceTab = "overview";
  panelCollapsed = !matchMedia("(min-width: 900px) and (min-height: 600px)").matches;
  view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, zoom));
  restyleProvinces();
  renderPanel();
}

/** The dispatches: calls to arms and offers to answer, then the log of everything that happened, newest first. */
function renderNews(): void {
  const s = snapshot!;
  const me = s.playerNation;
  const mine = (x: News) => x.nations.includes(me);
  const items = dispatchesMine ? dispatches.filter((x) => mine(x.news)) : dispatches;
  // One heading per day, newest day first.
  const days: { date: GameDate; news: News[] }[] = [];
  for (const x of items) {
    const last = days.at(-1);
    if (last && dateKey(last.date) === dateKey(x.date)) last.news.push(x.news);
    else days.push({ date: x.date, news: [x.news] });
  }
  panel.innerHTML = `
    <header><h2 class="ribbon">Dispatches</h2>${closeButton()}</header>
    <nav class="tabs"><button class="tab${dispatchesMine ? "" : " on"}" data-news-mine="0">Everything</button><button class="tab${dispatchesMine ? " on" : ""}" data-news-mine="1">Your realm</button></nav>
    ${waitingEventsHtml(s.events)}
    ${asksHtml()}
    ${s.peaceOffers.map(offerHtml).join("")}
    ${s.calls
      .map(
        (c) => `<div class="call framed-soft">
          <p>${icon("swords", 2)} ${realmButton(c.caller)} calls you to arms against ${realmButton(c.against)}${c.kind === "defensive" ? " (a defensive call: refusing breaks the alliance)" : ""}.</p>
          <div class="choices"><button class="wax" data-call="${c.id}" data-yes="1">Join the war</button><button class="paper" data-call="${c.id}" data-yes="0">Refuse</button></div>
        </div>`,
      )
      .join("")}
    ${days
      .map(
        (d) => `<h3 class="sub news-day">${dateText(d.date)}</h3><ul class="news">${d.news
          .map((x) => `<li class="${mine(x) ? "mine" : ""}">${icon(NEWS_ICON[x.kind], 1)}<span>${esc(x.text)}</span>${x.province !== undefined ? `<button class="paper go" data-go-province="${x.province}" title="Show on the map" aria-label="Show on the map">${icon("map", 1)}</button>` : ""}</li>`)
          .join("")}</ul>`,
      )
      .join("")}
    ${days.length ? "" : `<p class="hint">Nothing of note yet.</p>`}`;
  bindClose();
  showPanel(true);
  bindOffers();
  panel.querySelectorAll<HTMLButtonElement>("[data-event-open]").forEach((b) => b.addEventListener("click", openEventCard));
  panel.querySelectorAll<HTMLButtonElement>("[data-call]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "answerCall", call: b.dataset.call!, yes: b.dataset.yes === "1" })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-go-province]").forEach((b) => b.addEventListener("click", () => goThere(Number(b.dataset.goProvince))));
  panel.querySelectorAll<HTMLButtonElement>("[data-news-mine]").forEach((b) =>
    b.addEventListener("click", () => {
      dispatchesMine = b.dataset.newsMine === "1";
      renderNews();
    }),
  );
}

/** The End turn button in the corner; while the week plays, it pauses and resumes. */
function renderActions(): void {
  fab.hidden = !snapshot;
  fab.classList.toggle("playing", playing);
  fab.classList.toggle("paused", paused);
  const waiting = snapshot?.events.length ?? 0;
  const badge = fab.querySelector<HTMLElement>(".badge")!;
  badge.hidden = !waiting;
  badge.textContent = String(waiting);
  // While events wait, End turn shows their scroll and count (SHELL-070).
  const want = waiting ? "scroll" : "hourglass";
  if ((fab.dataset.icon ?? "hourglass") !== want) {
    fab.querySelector("img")!.outerHTML = icon(want, 3, waiting ? "Answer the event" : "End turn");
    fab.dataset.icon = want;
  }
  fab.classList.toggle("events", waiting > 0);
  if (!snapshot) return;
  fab.title = waiting
    ? `${waiting === 1 ? "An event waits" : `${waiting} events wait`} for your answer (Space opens it)`
    : playing
      ? paused
        ? "Play on (Space)"
        : "Pause (Space)"
      : `End turn (Space): on to ${dateText(addDays(snapshot.date, DAYS_PER_TURN))}`;
  renderArmyList();
}

function closeButton(): string {
  return `<span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button><button class="close wax" aria-label="Close">${icon("close", 2)}</button></span>`;
}

/** Shows or hides the panel, leaving a tool button to bring a folded panel back. */
function showPanel(open: boolean, reopenIcon: "scroll" | "crown" = "scroll"): void {
  // The open panel and the commander list would cover each other.
  if (open && !panelCollapsed && !armyListClosed) {
    armyListClosed = true;
    armyList.hidden = true;
  }
  panel.classList.toggle("chooser", reopenIcon === "crown");
  panel.hidden = !open || panelCollapsed;
  // While a course is drawn the voyage bar stands in for the folded card (EXPL-074).
  reopen.hidden = !open || !panelCollapsed || !!exploring;
  const what =
    reopenIcon === "crown" ? "Choose a realm" : newsView ? "Dispatches" : fleetView >= 0 ? (sailing >= 0 ? "Fleet: tap where to sail" : "Fleet") : realmView >= 0 ? nations[realmView]!.name : selectedProvince >= 0 ? provinces[selectedProvince]!.name : "";
  reopen.innerHTML = `${icon(reopenIcon, 3)}<span>${esc(what)}</span>`;
  reopen.title = `Open the overview: ${what}`;
  panel.querySelector(".fold")?.addEventListener("click", () => {
    panelCollapsed = true;
    showPanel(true, reopenIcon);
  });
}

/** Which card the panel shows; a different one opens at its top, with its close button in view. */
let panelShows = "";

function renderPanel(): void {
  // Opening any other card, or closing the fleet's, drops a course being drawn.
  if (exploring && (fleetView !== exploring.fleet || realmView >= 0 || newsView)) {
    exploring = null;
    voyageBarEl.hidden = true;
    view.invalidate();
  }
  renderPanelCard();
  // Whatever the card, the buttons a revolution's regime locks say so (REVO-092).
  lockRevolutionButtons(panel, snapshot?.revolution);
}

function renderPanelCard(): void {
  const shows = `${achView}/${newsView}/${realmView}/${realmTab}/${officialView}/${lordView}/${armyView}/${fleetView}/${selectedProvince}/${provinceTab}`;
  if (shows !== panelShows) {
    panelShows = shows;
    panel.scrollTop = 0;
  }
  if (achView) {
    renderAchievements();
    return;
  }
  if (newsView && snapshot) {
    renderNews();
    return;
  }
  if (realmView >= 0) {
    renderRealm(realmView);
    return;
  }
  if (officialView >= 0 && snapshot) {
    renderOfficial(officialView);
    return;
  }
  if (lordView >= 0 && snapshot) {
    renderLord(lordView);
    return;
  }
  if (armyView >= 0 && snapshot && armySlot(armyView) >= 0) {
    renderArmy(armyView);
    return;
  }
  armyView = -1;
  if (fleetView >= 0 && snapshot && snapshot.navy.fleets.some((f) => f.id === fleetView && f.owner === snapshot!.playerNation)) {
    renderFleet(fleetView);
    return;
  }
  fleetView = -1;
  sailing = -1;
  if (!snapshot && selectedProvince < 0) {
    panel.innerHTML = `
      <header><h2 class="ribbon">Choose your realm</h2><span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button></span></header>
      ${startActions()}
      <div class="nations">${FEATURED.filter((id) => nationIndex.has(id))
        .map((id) => {
          const n = nations[nationIndex.get(id)!]!;
          return `<button class="paper nation" data-nation="${n.id}">${pennant(n)}${esc(n.name)}</button>`;
        })
        .join("")}</div>
      <p class="hint">Or tap any realm on the map: ${nations.length} to choose from. <a href="./style.html">Art test page</a></p>
      <button class="paper ach-open" data-ach-open>${icon("trophy", 2)}Achievements<small>${Object.keys(achProfile.unlocked).length} earned · every campaign can earn them</small></button>
      <p class="diag" id="diag">${diagnosticsLine()}</p>`;
    bindNationButtons();
    panel.querySelector("[data-ach-open]")!.addEventListener("click", () => openAchievements());
    showPanel(true, "crown");
    return;
  }
  if (selectedProvince < 0) {
    showPanel(false);
    return;
  }
  const p = provinces[selectedProvince]!;
  if (isWater[selectedProvince]) {
    const coasts = neighborIdx[selectedProvince]!.filter((n) => !isWater[n]).length;
    panel.innerHTML = `
      <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
      <p class="owner">${icon("anchor", 2)}<b>${p.terrain === "ocean" ? "Open ocean" : "Coastal sea"}</b> · ships only</p>
      <dl class="facts">
        <dt>Coasts</dt><dd>${coasts ? `${coasts} province${coasts > 1 ? "s" : ""}` : "none"}</dd>
        <dt>Sea lanes</dt><dd>${neighborIdx[selectedProvince]!.length - coasts} zones</dd>
      </dl>
      ${seaZoneFleets(selectedProvince)}`;
    bindClose();
    bindNavyLinks();
    showPanel(true);
    return;
  }
  const own = owners[selectedProvince]!;
  const owner = own >= 0 ? nations[own]! : null;
  const mineHere = !!snapshot && own === snapshot.playerNation;
  if (!mineHere) provinceTab = "overview";
  if (provinceTab === "garrison") {
    renderGarrison(selectedProvince);
    return;
  }
  if (provinceTab === "people") {
    renderPeople(selectedProvince);
    return;
  }
  if (provinceTab === "build") {
    renderWorks(selectedProvince);
    return;
  }
  if (provinceTab === "port" && snapshot?.navy.ports.some((x) => x.province === selectedProvince)) {
    renderPort(selectedProvince);
    return;
  }
  if (provinceTab === "land") {
    renderLand(selectedProvince);
    return;
  }
  const armiesHere = snapshot ? [...snapshot.armies.id.keys()].filter((k) => snapshot!.armies.location[k] === selectedProvince && snapshot!.armies.commander[k]! >= 0) : [];
  const official = snapshot && own >= 0 ? officialOf(snapshot, selectedProvince, own) : undefined;
  const siege = siegeInfo(selectedProvince);
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${mineHere ? provinceTabs() : ""}
    <p class="owner">${owner ? `<button class="realm-link" data-realm="${own}" title="Open ${esc(owner.name)}">${pennant(owner, 3)}<b>${esc(owner.name)}</b></button>` : "<b>Unclaimed land</b>"}</p>
    <p class="province-kind">${esc(provinceKind(p, !!owner && owner.capital === p.id))}</p>
    ${snapshot ? settleSection(selectedProvince) : ""}
    ${snapshot ? rebelsHere(selectedProvince) : ""}
    ${snapshot && own >= 0 && official !== undefined ? governanceSection(selectedProvince, own, mineHere, official) : ""}
    ${siege ? siegeView(rules, siege) : ""}
    <dl class="facts">
      <dt>People</dt><dd>${fmt((snapshot ? snapshot.provincePeople[selectedProvince]! : p.population) * 1000)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1).repeat(p.wealth)}</dd>
      ${snapshot ? provinceTradeLine(snapshot, selectedProvince) : ""}
      ${snapshot ? foodFacts(selectedProvince) : ""}
      ${snapshot && own >= 0 ? moodFacts(selectedProvince) : ""}
      ${snapshot ? beliefFacts(snapshot.peoples, selectedProvince) : ""}
      <dt>Walls</dt><dd>${wallsAt(selectedProvince) ? WALL_NAMES[wallsAt(selectedProvince)!] : "None"}</dd>
      ${occupiers[selectedProvince]! >= 0 ? `<dt>Occupied</dt><dd>by ${esc(nations[occupiers[selectedProvince]!]!.name)}</dd>` : ""}
      ${mineHere ? taxLine(selectedProvince) : ""}
    </dl>
    ${mineHere ? rateButtons(snapshot!.provinceTax[selectedProvince]!, "province") : ""}
    ${armiesHere.length ? `<h3 class="sub">Armies</h3>` : ""}
    ${armiesHere
      .map((k) => {
        const s = snapshot!;
        const id = s.armies.id[k]!;
        const cmd = s.armies.commander[k]!;
        const mine = s.armies.owner[k] === s.playerNation;
        const c = cmd >= 0 ? cmdOf(cmd) : null;
        return `<div class="army">
          ${c ? commanderPortrait(rules, c.name, s.armies.owner[k]!) : `<img class="portrait" src="${spriteUrl("soldier", nations[s.armies.owner[k]!]!.color, 3)}" alt="">`}
          <span class="who">${c ? `<b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small>` : "<b>Army</b>"}<br>
          ${fmt(s.armies.men[k]!)} men of ${esc(nations[s.armies.owner[k]!]!.name)}, ${fmt(s.armies.horse[k]!)} on horse${mine ? `<br><small>${supplyLine(k)}${marchLine(k)}</small>` : ""}</span>
          ${mine ? `<span class="army-buttons"><button data-army="${id}">${selected.has(id) ? "Pick a target" : "Move"}</button><button class="paper small" data-command="${id}" title="The commander's screen: troops, food, pay, training">Command</button></span>` : ""}
        </div>`;
      })
      .join("")}
    ${!snapshot && owner ? `<button class="wax play" data-nation="${owner.id}">${icon("crown", 2)}Rule ${esc(owner.name)}</button>` : ""}`;
  bindClose();
  showPanel(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-army]").forEach((b) =>
    b.addEventListener("click", () => pickArmy(Number(b.dataset.army))),
  );
  bindCommand();
  bindProvinceTabs();
  bindNationButtons();
  bindRebels();
  bindTax(selectedProvince);
  panel.querySelectorAll<HTMLButtonElement>("[data-belief]").forEach((b) =>
    b.addEventListener("click", () => {
      const which = b.dataset.belief as "tongue" | "faith";
      beliefUi.open = beliefUi.open === which ? null : which;
      renderPanel();
    }),
  );
  bindLords();
  panel.querySelector("[data-realm-open-food]")?.addEventListener("click", () => {
    realmView = snapshot!.playerNation;
    realmTab = "food";
    renderPanel();
  });
  panel.querySelector("[data-colony-abandon]")?.addEventListener("click", () => void actHere({ type: "explore", do: "abandon", province: selectedProvince }));
  if (siege) animateSiege(siege);
}

/** The province's Colony section (EXPL-071): a colony being founded here, a colony founded, or what it takes to settle empty land. */
function settleSection(p: number): string {
  const s = snapshot!;
  const ex = s.exploration;
  const me = s.playerNation;
  const c = ex.colonies.find((x) => x.province === p);
  if (c) {
    const shipBeside = s.navy.fleets.some((f) => f.owner === me && isWater[f.at] && neighborIdx[p]!.includes(f.at));
    return colonyCard(c, ex, { mine: c.owner === me, owner: nations[c.owner]!.name, shipBeside });
  }
  if (ex.founded.includes(p) && owners[p] === me) return `<p class="hint">${icon("crown", 1)}A colony of yours, founded by your settlers.</p>`;
  if (owners[p]! >= 0 || isWater[p]) return "";
  const why = !provinces[p]!.coastal ? "It has no coast: colonies are founded from the sea."
    : ex.sites[p] === 1 ? "Empty land inside your colonial range: sail a caravel with a colonial governor beside it to found a colony."
    : ex.colonial ? "Empty land beyond your colonial range."
    : "Empty land. Colonies open with ocean navigation.";
  return `<p class="hint">${icon("map", 1)}${why}</p>`;
}

/** What kind of province p is, after the realm that rules it (feedback 78): its seat and land, then river and coast. */
function provinceKind(p: (typeof provinces)[number], capital: boolean): string {
  const seat = capital ? "Capital city" : SETTLEMENT_NAMES[settlementOf(p.population)];
  return [`${seat} in ${p.terrain}`, p.river ? "river" : "", p.coastal ? "coast" : ""].filter(Boolean).join(" · ");
}

/** The beaten risings of p waiting on the player, then the rebellion card of the rising holding it (REBL-063, REBL-065). */
function rebelsHere(p: number): string {
  const s = snapshot!;
  const name = (q: number) => provinces[q]!.name;
  const verdicts = s.rebels.verdicts.filter((v) => v.province === p).map((v) => verdictCard(v, name)).join("");
  const r = s.provinceRebels[p] ? s.rebels.risings.find((x) => x.id === s.provinceRebels[p]) : undefined;
  if (!r) return verdicts;
  const mine = r.owner === s.playerNation;
  return verdicts + risingCard(r, name, mine, mine ? attackerFor(r.location) : null);
}

/** The player's nearest army that can march on rebels in province p: with a commander, not fighting or falling back. */
function attackerFor(p: number): Attacker | null {
  const s = snapshot!;
  const to = provinces[p]!;
  let best: Attacker | null = null;
  let dist = Infinity;
  for (let k = 0; k < s.armies.id.length; k++) {
    if (s.armies.owner[k] !== s.playerNation || s.armies.commander[k]! < 0 || s.armies.battle[k]! >= 0) continue;
    const at = provinces[s.armies.location[k]!]!;
    const d = Math.hypot(at.x! - to.x!, at.y! - to.y!) - s.armies.men[k]! / 1e6;
    if (d < dist) ((dist = d), (best = { army: s.armies.id[k]!, name: cmdOf(s.armies.commander[k]!).name, men: s.armies.men[k]! }));
  }
  return best;
}

/** The rebellion card's buttons: the answers (granting asks once more), attack, wait, and the verdicts. */
function bindRebels(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-rebels-ask]").forEach((b) =>
    b.addEventListener("click", () => {
      rebelsUi.confirm = b.dataset.rebelsAsk!;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-rebels-cancel]").forEach((b) =>
    b.addEventListener("click", () => {
      rebelsUi.confirm = null;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-rebels-answer]").forEach((b) =>
    b.addEventListener("click", () => {
      const [rising, answer] = b.dataset.rebelsAnswer!.split(":");
      rebelsUi.confirm = null;
      void actHere({ type: "answerRebels", rising: Number(rising), answer: answer as "grant" | "talk" | "bribe" });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-rebels-verdict]").forEach((b) =>
    b.addEventListener("click", () => {
      rebelsUi.confirm = null;
      void actHere({ type: "treatRebels", rising: Number(b.dataset.rebelsVerdict), treatment: b.dataset.treatment as "Pardon" | "Punish the leaders" | "Massacre" });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-rebels-attack]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "move", army: Number(b.dataset.rebelsAttack), to: Number(b.dataset.rebelsTo) })),
  );
  // Waiting is no order: the card folds away and the clock plays on.
  panel.querySelector("[data-rebels-wait]")?.addEventListener("click", () => showPanel(false));
}

/** The siege of province p as the siege view shows it, or null when there is none. */
function siegeInfo(p: number): SiegeInfo | null {
  const s = snapshot;
  const st = s?.sieges.find((x) => x.province === p);
  if (!s || !st) return null;
  const besiegers = [...s.armies.id.keys()]
    .filter((k) => s.armies.location[k] === p && s.armies.owner[k] === st.by && s.armies.commander[k]! >= 0)
    .map((k) => ({ name: cmdOf(s.armies.commander[k]!).name, men: s.armies.men[k]! }));
  const pr = provinces[p]!;
  const holder = owners[p]!;
  const isCapital = holder >= 0 && nations[holder]!.capital === pr.id;
  return { ...st, besiegers, holder, walls: isCapital ? "castle" : wallsAt(p) };
}

/** Keeps the siege view's picture moving while it is on screen. */
function animateSiege(st: SiegeInfo): void {
  const canvas = panel.querySelector<HTMLCanvasElement>(`canvas[data-siege="${st.province}"]`);
  if (!canvas) return;
  const step = (t: number) => {
    if (!canvas.isConnected) return;
    paintSiege(canvas, rules, st, t);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** An official's screen: who they are, the post, and commissioning them as a commander. */
/** How well a province suits an official's type, highest first, and the fact that shows it. */
function moveFit(post: string, p: number): [number, string] {
  const s = snapshot!;
  const pr = provinces[p]!;
  switch (post) {
    case "Tax collector":
      return [s.provinceTaxGold[p]!, `${gold2(s.provinceTaxGold[p]!)} gold tax a month`];
    case "Customs officer":
      return [pr.wealth, `wealth ${pr.wealth}`];
    case "Steward":
      return [-s.provinceFoodMonths[p]!, `${s.provinceFoodMonths[p]!.toFixed(1)} months of food`];
    case "Muster master":
      return [s.provinceRecruits[p]!, `${fmt(s.provinceRecruits[p]!)} men to call`];
    case "Judge":
      return [s.provinceMood[p]! * 10 + (s.provinceGrievances[p] ? 1 : 0), ["calm", "grumbling", "rioting", "plotting"][s.provinceMood[p]!]!];
    case "Warden": {
      const border = neighborIdx[p]!.some((q) => owners[q]! >= 0 && owners[q] !== owners[p]);
      const walls = wallsAt(p);
      return [(walls ? 2 : 0) + (border ? 1 : 0), `${walls ? WALL_NAMES[walls].toLowerCase() : "no walls"}${border ? ", on the border" : ""}`];
    }
    default:
      return [s.provincePeople[p]!, `${fmt(Math.round(s.provincePeople[p]! * 1000))} people`];
  }
}

/** The official's screen shows every province to move him to, not just the best few. */
let movesAll = false;

/** An official's screen: who they are, their effect, moving them to another province, and commissioning them as a commander. */
function renderOfficial(pi: number): void {
  const s = snapshot!;
  const o = officialOf(s, pi, owners[pi]!);
  // A lord's official serves the lord: his screen (and its commission) is not the crown's (feedback 62).
  if (!o || owners[pi] !== s.playerNation || s.provinceLord[pi]! >= 0) {
    officialView = -1;
    renderPanel();
    return;
  }
  const me = s.playerNation;
  const options: { p: number; score: number; fit: string }[] = [];
  for (let p = 0; p < owners.length; p++) {
    if (p === pi || owners[p] !== me || s.provinceLord[p]! >= 0) continue;
    const [score, fit] = moveFit(o.post, p);
    options.push({ p, score, fit });
  }
  options.sort((a, b) => b.score - a.score || a.p - b.p);
  const moves = (movesAll ? options : options.slice(0, 6)).map(({ p, fit }) => ({
    province: p,
    thumb: mapImage ? provinceThumb(mapImage, provinces.length, p, nations[me]!.color) : "",
    other: officialOf(s, p, me),
    fit,
  }));
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(o.name)}</h2>${closeButton()}</header>
    ${officialScreen(rules, o, me, rules.defines.recruit.commanderGold, s.nationTreasury[me]!, moves, movesAll || options.length <= 6)}
    <button class="back" data-back>${icon("scroll", 2)}Back to the officials</button>`;
  bindClose();
  showPanel(true);
  panel.querySelector("[data-moves-all]")?.addEventListener("click", () => {
    movesAll = true;
    renderPanel();
  });
  // After a move, his screen follows him to his new post.
  panel.querySelectorAll<HTMLButtonElement>("[data-swap]").forEach((b) =>
    b.addEventListener("click", () => {
      const to = Number(b.dataset.swapTo);
      void act({ type: "swapOfficials", a: Number(b.dataset.swap), b: to }).then(() => {
        if (!snapshot || snapshot.rejectedOrders.length) return;
        officialView = to;
        newsView = false;
        movesAll = false;
        panel.scrollTop = 0;
        renderPanel();
      });
    }),
  );
  panel.querySelector("[data-back]")?.addEventListener("click", () => {
    officialView = -1;
    realmView = s.playerNation;
    realmTab = "officials";
    renderPanel();
  });
}

/** Tabs of the overview of one of the player's provinces. */
function provinceTabs(): string {
  const tab = (key: typeof provinceTab, label: string) => `<button class="tab${provinceTab === key ? " on" : ""}" data-tab="${key}">${label}</button>`;
  const building = snapshot?.sites.some((x) => x.province === selectedProvince) ? ` ${icon("hourglass", 1)}` : "";
  const port = snapshot?.navy.ports.find((x) => x.province === selectedProvince);
  const hulls = port?.building.length ? ` ${icon("hourglass", 1)}` : "";
  return `<nav class="tabs">${tab("overview", "Overview")}${tab("people", "People")}${tab("garrison", "Garrison")}${tab("land", "Land")}${tab("build", `Build${building}`)}${port ? tab("port", `Port${hulls}`) : ""}</nav>`;
}

/** Food lines of a province's overview: months stored, the last harvest and anyone who starved this year. */
function foodFacts(pi: number): string {
  const s = snapshot!;
  const months = s.provinceFoodMonths[pi]!;
  const starved = Math.round(s.provinceStarved[pi]! * 1000);
  const warn = months < 1 ? " · hungry" : months < 3 ? " · running low" : "";
  // Armies standing here refill from this store (feedback 83).
  let eaten = 0;
  let men = 0;
  s.armies.location.forEach((loc, k) => {
    if (loc !== pi) return;
    eaten += s.armies.rations[k]!;
    men += s.armies.men[k]!;
  });
  const people = s.provincePeople[pi]! * 1000;
  return `<dt>Food</dt><dd>${months.toFixed(1)} months stored${warn}</dd>
      <dt>Harvest</dt><dd>${harvestText(pi)}</dd>
      ${men > 0 && people > 0 ? `<dt>Armies</dt><dd>${fmt(men)} men here eat ${(eaten / people).toFixed(1)} months of this store a month</dd>` : ""}
      ${castleFoodLine(s, pi, (p) => provinces[p]!.name)}
      ${starved > 0 ? `<dt>Starved</dt><dd>${fmt(starved)} this year</dd>` : ""}`;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A province's last harvest and why (feedback 82): the roll, the weather its
 * region had as its climate reads it, and when it harvests, twice a year on
 * rice land and never in the tundra.
 */
function harvestText(pi: number): string {
  const s = snapshot!;
  const months = s.provinceHarvestMonths[pi]!;
  if (!months.length) return "none · the tundra grows no crops";
  const h = s.provinceHarvest[pi]!;
  const w = s.provinceWeather[pi]!;
  const why = w < 0 ? ` · ${s.badWeather[s.provinceClimate[pi]!]!} in the region` : w > 0 ? " · good weather in the region" : "";
  const when = months.map((m) => MONTH_NAMES[m - 1]!).join(" and ");
  return `${h >= 0 ? `${s.harvests[h]!}${why}` : "not in yet"} · <small>${months.length > 1 ? `two harvests a year, in ${when}` : `comes in each ${when}`}</small>`;
}

/** The snapshot's lords as the panels show them. */
const lordViews = (): LordView[] => snapshot!.lords.map((l, k) => ({ ...l, k }));

/** Every lord's lands: provinces, people and the gold that reaches the crown. */
function lordLands(): Map<number, LordLands> {
  const s = snapshot!;
  const out = new Map<number, LordLands>(s.lords.map((_, k) => [k, { provinces: [], people: 0, crownGold: 0 }]));
  for (let p = 0; p < owners.length; p++) {
    const l = s.provinceLord[p]!;
    if (l < 0) continue;
    const ll = out.get(l)!;
    ll.provinces.push(p);
    ll.people += s.provincePeople[p]!;
    ll.crownGold += s.provinceTaxGold[p]!;
  }
  return out;
}

const MOOD_LABEL = ["Calm", "Grumbling", "Rioting", "Plotting"];

/** A province as a row in the lord's screen: its picture and a short note. */
function provinceRow(p: number, note: string): ProvinceRow {
  const o = owners[p]!;
  return { province: p, name: provinces[p]!.name, thumb: mapImage ? provinceThumb(mapImage, provinces.length, p, o >= 0 ? nations[o]!.color : PALETTE.unowned) : "", note };
}

/** The governance card at the top of a province's overview: its lord (or royal land) and its official. */
function governanceSection(pi: number, own: number, mine: boolean, official: ReturnType<typeof officialOf>): string {
  const s = snapshot!;
  const l = s.provinceLord[pi]!;
  const lord = l >= 0 ? lordViews()[l]! : null;
  const isCapital = nations[own]!.capital === provinces[pi]!.id;
  // Lords of the realm who could take it as a fief: those holding land next to it first.
  const near = new Set<number>();
  for (const q of neighborIdx[pi]!) if (owners[q] === own && s.provinceLord[q]! >= 0) near.add(s.provinceLord[q]!);
  const takers = lord || !mine ? [] : lordViews()
    .filter((t) => t.nation === own && t.lands > 0)
    .sort((a, b) => Number(near.has(b.k)) - Number(near.has(a.k)) || LOYALTY_ORDER.indexOf(a.loyalty) - LOYALTY_ORDER.indexOf(b.loyalty));
  // A lord's official serves him: no button to the screen that would commission him (feedback 62).
  const officialHtml = lord && official
    ? officialCard(rules, official, own, false, true)
    : officialCard(rules, official, own, mine);
  return governanceCard(rules, { lord, mine, isCapital, province: pi, official: officialHtml, grantOpen, takers });
}

/** A lord's screen (feedback 67): who he is, his lands and lighting them on the map, gifts, seizing and granting. */
function renderLord(k: number): void {
  const s = snapshot!;
  const l = lordViews()[k];
  if (!l) {
    lordView = -1;
    renderPanel();
    return;
  }
  const lands = lordLands().get(k)!;
  const mine = l.nation === s.playerNation;
  // Royal provinces to grant, nearest to his lands first (steps over the realm's own land).
  const dist = new Map<number, number>(lands.provinces.map((p) => [p, 0]));
  const queue = [...lands.provinces];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    for (const q of neighborIdx[p]!) if (owners[q] === l.nation && !dist.has(q)) (dist.set(q, dist.get(p)! + 1), queue.push(q));
  }
  const royal: number[] = [];
  for (let p = 0; p < owners.length; p++) if (owners[p] === l.nation && s.provinceLord[p]! < 0 && nations[l.nation]!.capital !== provinces[p]!.id) royal.push(p);
  royal.sort((a, b) => (dist.get(a) ?? 999) - (dist.get(b) ?? 999) || a - b);
  const grants = (grantAll ? royal : royal.slice(0, 6)).map((p) => provinceRow(p, `${dist.get(p) === 1 ? "next to his lands" : dist.has(p) ? `${dist.get(p)} provinces away` : "across the sea"} · ${gold2(s.provinceTaxGold[p]!)} gold a month`));
  const holdings = lands.provinces.map((p) => provinceRow(p, `${MOOD_LABEL[s.provinceMood[p]!]} · ${fmt(Math.round(s.provincePeople[p]! * 1000))} people`));
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(l.name)}</h2>${closeButton()}</header>
    ${lordScreen(rules, l, lands, { lit: litLord === k, gift: s.giftGold, treasury: s.nationTreasury[s.playerNation]!, mine, holdings, grants, allGrants: grantAll || royal.length <= 6, court: mine ? "" : courtLordHtml(s.statecraft, k, l.nation) })}`;
  bindClose();
  showPanel(true);
  bindLords();
  panel.querySelector("[data-grant-all]")?.addEventListener("click", () => {
    grantAll = true;
    renderPanel();
  });
  panel.querySelector("[data-back-lords]")?.addEventListener("click", () => {
    lordView = -1;
    realmView = l.nation;
    realmTab = "lords";
    renderPanel();
  });
}

/** Lights a lord's lands on the map and frames them, or puts them out again. */
function lightLord(k: number): void {
  litLord = litLord === k ? -1 : k;
  if (litLord >= 0) {
    const lands = lordLands().get(k)!.provinces;
    if (lands.length) {
      const xs = lands.map((p) => provinces[p]!.x!);
      const ys = lands.map((p) => provinces[p]!.y!);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      // Close enough to see the provinces, far enough to take in all of them.
      const fit = Math.min(app.clientWidth / Math.max(40, (x1 - x0) * 1.6), app.clientHeight / Math.max(40, (y1 - y0) * 1.6));
      const zoom = Math.max(2.5, Math.min(8, fit));
      // A side panel covers the map's left: centre his lands in the part that shows.
      const wide = matchMedia("(min-width: 900px) and (min-height: 600px)").matches;
      view.lookAt((x0 + x1) / 2 - (wide ? panel.offsetWidth / 2 / zoom : 0), (y0 + y1) / 2, zoom);
    }
    // On a phone the panel covers the map: fold it away; the chip over the map opens the lord again.
    if (!matchMedia("(min-width: 900px) and (min-height: 600px)").matches) panelCollapsed = true;
  }
  restyleProvinces();
  renderLitChip();
  renderPanel();
}

/** The chip over the map while a lord's lands are lit: whose they are, and a button to stop. */
const litChip = document.createElement("div");
litChip.className = "lit-chip plaque";
litChip.hidden = true;
app.append(litChip);
function renderLitChip(): void {
  const l = litLord >= 0 && snapshot ? snapshot.lords[litLord] : null;
  litChip.hidden = !l;
  if (!l) return;
  litChip.innerHTML = `<button class="lit-open" data-lord-open="${litLord}">Lands of <b>${esc(l.name)}</b></button><button class="paper small" data-lord-light="${litLord}" aria-label="Stop showing his lands">✕</button>`;
}
litChip.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-lord-light], [data-lord-open]");
  if (!b) return;
  if (b.dataset.lordLight !== undefined) lightLord(Number(b.dataset.lordLight));
  else openLord(Number(b.dataset.lordOpen));
});

function openLord(k: number): void {
  panel.scrollTop = 0;
  lordView = k;
  grantAll = false;
  realmView = -1;
  officialView = -1;
  newsView = false;
  panelCollapsed = false;
  renderPanel();
}

/** The Lords tab of realm r: its lords with what their lands give, and how much is royal land. */
function realmLords(r: number): string {
  const s = snapshot!;
  let royal = 0;
  let all = 0;
  for (let p = 0; p < owners.length; p++) if (owners[p] === r) (all++, s.provinceLord[p]! < 0 && royal++);
  return lordsTab(rules, lordViews().filter((l) => l.nation === r && l.lands > 0), lordLands(), royal, all);
}

/** Sort orders of the Provinces overview. */
let provinceSort: "trouble" | "people" | "food" | "tax" | "short" = "trouble";

/**
 * The realm's provinces at a glance (milestone 3 overview, richer for
 * feedback 63): each row a picture of the province, its mood, who governs it,
 * people, food and tax, troubled ones first, with counts of the hungry and
 * the restless on top. Tapping a row opens the province; the map button
 * shows it on the map with the panel folded away.
 */
function provincesTab(r: number): string {
  const s = snapshot!;
  const list: number[] = [];
  for (let p = 0; p < owners.length; p++) if (owners[p] === r) list.push(p);
  const trouble = (p: number) => (s.provinceRebels[p] ? 100 : 0) + s.provinceMood[p]! * 10 + (s.provinceFoodMonths[p]! < 1 ? 15 : s.provinceFoodMonths[p]! < 3 ? 5 : 0) + (s.provinceGrievances[p]! ? 1 : 0);
  const by = {
    trouble: (a: number, b: number) => trouble(b) - trouble(a),
    people: (a: number, b: number) => s.provincePeople[b]! - s.provincePeople[a]!,
    food: (a: number, b: number) => s.provinceFoodMonths[a]! - s.provinceFoodMonths[b]!,
    tax: (a: number, b: number) => s.provinceTaxGold[b]! - s.provinceTaxGold[a]!,
    short: (a: number, b: number) => landShare(a) - landShare(b),
  }[provinceSort];
  list.sort((a, b) => by(a, b) || a - b);
  const people = list.reduce((t, p) => t + s.provincePeople[p]!, 0);
  const tax = list.reduce((t, p) => t + s.provinceTaxGold[p]!, 0);
  const hungry = list.filter((p) => s.provinceFoodMonths[p]! < 1).length;
  const low = list.filter((p) => s.provinceFoodMonths[p]! >= 1 && s.provinceFoodMonths[p]! < 3).length;
  const restless = list.filter((p) => s.provinceMood[p]! >= 2).length;
  const grumbling = list.filter((p) => s.provinceMood[p]! === 1).length;
  // The last harvests at a glance (feedback 82).
  const harvested = list.filter((p) => s.provinceHarvest[p]! >= 0);
  const band = (lo: number, hi: number) => harvested.filter((p) => s.provinceHarvest[p]! >= lo && s.provinceHarvest[p]! <= hi).length;
  const [bad, fair, rich] = [band(0, 1), band(2, 2), band(3, 4)];
  const harvests = harvested.length ? `<p>Last harvests: ${rich ? `${rich} good or bumper, ` : ""}${fair} normal${bad ? `, <b>${bad} poor or failed</b>` : ""}.</p>` : "";
  const color = nations[r]!.color;
  // Short of food (feedback 86): only the provinces whose land feeds under all their people in a normal year; the counts above stay the realm's.
  const shown = provinceSort === "short" ? list.filter((p) => landShare(p) < 1) : list;
  const rows = shown
    .map((p) => {
      const months = s.provinceFoodMonths[p]!;
      const l = s.provinceLord[p]!;
      const post = s.provinceOfficial[p];
      const bad = s.provinceMood[p]! >= 2 || months < 1 || s.provinceRebels[p]! > 0;
      const gov = l >= 0 ? `Lord ${esc(s.lords[l]!.house)}` : post ? `Royal · ${esc(post.toLowerCase())}` : "Royal · <b>no official</b>";
      const fix = provinceSort === "short" ? `<small>Land feeds ${Math.round(landShare(p) * 100)} % · ${esc(foodFix(p))}</small>` : "";
      return `<div class="province-row${bad ? " bad" : ""}">
        <button class="place" ${provinceSort === "short" ? `data-open-land="${p}"` : `data-open-province="${p}"`} title="Open ${esc(provinces[p]!.name)}">
          <img class="thumb" src="${mapImage ? provinceThumb(mapImage, provinces.length, p, color) : ""}" alt="" width="48" height="48">
          <span class="place-name"><b>${esc(provinces[p]!.name)}</b><small>${s.provinceRebels[p] ? "<b>Held by rebels</b>" : MOOD_LABEL[s.provinceMood[p]!]} · ${gov}</small>${fix}</span>
          <span class="place-stats"><small>${fmt(Math.round(s.provincePeople[p]! * 1000))} people</small><small>${months.toFixed(1)} months food${s.provinceHarvest[p]! >= 0 && s.provinceHarvest[p]! <= 1 ? ` · ${s.harvests[s.provinceHarvest[p]!]!} harvest` : ""}</small><small>${gold2(s.provinceTaxGold[p]!)} gold</small></span>
        </button>
        <button class="paper small map-go" data-map-province="${p}" title="Show ${esc(provinces[p]!.name)} on the map" aria-label="Show on the map">${icon("scroll", 1)}Map</button>
      </div>`;
    })
    .join("");
  const sortButton = (key: typeof provinceSort, label: string) => `<button class="tab${provinceSort === key ? " on" : ""}" data-province-sort="${key}">${label}</button>`;
  return `<p><b>${fmt(Math.round(people * 1000))}</b> people in ${list.length} provinces paying <b>${gold2(tax)}</b> gold a month. ${hungry ? `<b>${hungry} hungry</b>, ` : ""}${low ? `${low} low on food, ` : ""}${restless ? `<b>${restless} rioting or plotting</b>, ` : ""}${grumbling ? `${grumbling} grumbling.` : hungry || low || restless ? "the rest content." : "All fed and calm."}</p>
    ${harvests}
    ${r === s.playerNation ? risingsOverview(s.rebels, r, (q) => provinces[q]!.name) : ""}
    <nav class="tabs small">${sortButton("trouble", "Trouble first")}${sortButton("people", "Most people")}${sortButton("food", "Least food")}${sortButton("tax", "Most tax")}${sortButton("short", "Short of food")}</nav>
    ${provinceSort === "short" && !shown.length ? `<p class="hint">Every province's land feeds its people in a normal year.</p>` : ""}
    <div class="province-list">${rows}</div>`;
}

/** The share of its people a province's land feeds in a normal year (its Land tab's first line). */
function landShare(p: number): number {
  const tiles = snapshot?.landSheets[p] ?? [];
  const people = snapshot?.provincePeople[p] ?? 0;
  return people > 0 ? tiles.reduce((a, t) => a + t.feeds, 0) / people : 1;
}

/** What would feed a short province, as its Land tab offers it: a farm, a better farm, clearing woods, or bringing food in. */
function foodFix(p: number): string {
  const s = snapshot!;
  const tiles = s.landSheets[p] ?? [];
  const farm = (s.buildSheets[p] ?? []).find((r) => r.work === s.works.indexOf("farm"));
  if (s.provinceLord[p]! >= 0) return "its lord decides on his land";
  if (farm && farm.why === null) return farm.step > 1 ? `improve the farm to a ${farm.name}` : "build a farm";
  const clear = tiles.find((t) => t.changes.some((c) => c.why === null && c.to === "fields"));
  if (clear) return clear.changes.find((c) => c.why === null && c.to === "fields")!.title.toLowerCase();
  return "bring food in from a castle";
}

/** Opens province i's overview and centres the map on it; folded, the panel leaves the map clear. */
function goToProvince(i: number, fold: boolean): void {
  realmView = -1;
  lordView = -1;
  officialView = -1;
  selectedProvince = i;
  provinceTab = "overview";
  grantOpen = false;
  panel.scrollTop = 0;
  if (fold) panelCollapsed = true;
  view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, 4));
  restyleProvinces();
  renderPanel();
}

function bindLords(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-province-sort]").forEach((b) =>
    b.addEventListener("click", () => {
      provinceSort = b.dataset.provinceSort as typeof provinceSort;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLElement>("[data-open-province]").forEach((row) => row.addEventListener("click", () => goToProvince(Number(row.dataset.openProvince), false)));
  panel.querySelectorAll<HTMLElement>("[data-open-land]").forEach((row) =>
    row.addEventListener("click", () => {
      goToProvince(Number(row.dataset.openLand), false);
      provinceTab = "land";
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLElement>("[data-map-province]").forEach((b) => b.addEventListener("click", () => goToProvince(Number(b.dataset.mapProvince), true)));
  panel.querySelectorAll<HTMLButtonElement>("[data-lord-open]").forEach((b) => b.addEventListener("click", () => openLord(Number(b.dataset.lordOpen))));
  panel.querySelectorAll<HTMLButtonElement>("[data-lord-light]").forEach((b) => b.addEventListener("click", () => lightLord(Number(b.dataset.lordLight))));
  panel.querySelector<HTMLButtonElement>("[data-grant-open]")?.addEventListener("click", () => {
    grantOpen = !grantOpen;
    renderPanel();
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-gift]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "gift", lord: Number(b.dataset.gift) })));
  // Court a foreign lord, or call the envoy home (DIPL-220).
  panel.querySelectorAll<HTMLButtonElement>("[data-court-lord]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "court", target: Number(b.dataset.realm), lord: Number(b.dataset.courtLord), ...(b.dataset.recall ? { recall: true } : {}) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-seize]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "seizeFief", province: Number(b.dataset.seize) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-grant]").forEach((b) =>
    b.addEventListener("click", () => {
      grantOpen = false;
      void actHere({ type: "grantFief", province: Number(b.dataset.grant), lord: Number(b.dataset.lord) });
    }),
  );
}

/** What eases each grievance, for the mood line. */
const GRIEVANCE_FIX: Record<string, string> = {
  Hungry: "ends above three months of food",
  Conscription: "ends when half the recruits are back",
  "Soldiers quartered": "ends when the armies move on",
  Ungoverned: "ends when the official returns to his post",
  "Foreign rule": "a homeland of a stranger tongue taken since 1444; ends with a lord of its tongue",
  "Banned tongue": "your Tongue policy is Impose and most here are strangers; ends with Teach or Let be (Peoples tab)",
  "Wrong faith": "a third or more keep a faith without a house, or a Restricted majority; ends when it is served (Peoples tab)",
  Persecuted: "a Persecuted faith lives here; counts as two; ends when it is Tolerated or Restricted again (Peoples tab)",
  Bloodshed: "a battle was fought here; it fades after 20 years",
  "Heavy taxes": "ends when the tax is normal or lighter; crushing counts twice",
  "Grasping officials": "the realm has more officials than its cap; ends when it is back within (Government tab)",
};

/** A province's mood and its grievances, with what each needs to end. */
function moodFacts(pi: number): string {
  const s = snapshot!;
  const mood = s.moods[s.provinceMood[pi]!]!;
  const g = s.provinceGrievances[pi]!;
  const names = s.grievanceNames.filter((_, k) => g & (1 << k));
  const held = s.provinceRebels[pi]! > 0;
  const chance = s.rebels.chance[pi]!;
  const effect = held ? " · held by rebels: nothing reaches you" : mood === "rioting" || mood === "plotting" ? ` · half tax and recruits${chance > 0 ? ` · ${Math.round(chance * 100)} in 100 a month to rise` : mood === "rioting" ? " · a new burden here starts a rising" : ""}` : "";
  return `<dt>Mood</dt><dd><b>${held ? "Risen" : mood[0]!.toUpperCase() + mood.slice(1)}</b>${effect}</dd>
      ${names.length ? `<dt>Grievances</dt><dd>${names.map((n) => `<span title="${esc(GRIEVANCE_FIX[n] ?? "")}">${esc(n)}</span>`).join(", ")}</dd>` : ""}`;
}

/** What each class does, for the People tab. */
const CLASS_NOTE: Record<string, string> = {
  farmers: "Work the fields and grow most of the food",
  herders: "Keep herds on pasture",
  woodsmen: "Fell timber and hunt in the woods",
  miners: "Dig ore and stone",
  seafolk: "Fish and crew ships",
  craftsmen: "Make wares in town",
  "market folk": "Trade in the town's market",
  clergy: "Keep the churches; give no recruits",
  clerks: "Keep accounts and run offices",
  scholars: "Study and teach; give no recruits",
  homeless: "No work and no home",
};
const TOWN_CLASSES = new Set(["craftsmen", "market folk", "clergy", "clerks", "scholars"]);

/** A province's people by class: who they are, how many, and town against countryside. */
function renderPeople(pi: number): void {
  const s = snapshot!;
  const p = provinces[pi]!;
  const C = s.classNames.length;
  const row = s.provinceClasses.subarray(pi * C, (pi + 1) * C);
  const total = s.provincePeople[pi]!;
  let town = 0;
  s.classNames.forEach((c, k) => TOWN_CLASSES.has(c) && (town += row[k]!));
  const share = (x: number) => (total > 0 ? Math.round((x / total) * 100) : 0);
  const lines = s.classNames
    .map((c, k) => ({ c, n: row[k]! }))
    .filter((x) => x.n * 1000 >= 1)
    .sort((a, b) => b.n - a.n)
    .map(({ c, n }) => `<tr title="${esc(CLASS_NOTE[c] ?? "")}"><td><b>${esc(c[0]!.toUpperCase() + c.slice(1))}</b></td><td class="num">${fmt(Math.round(n * 1000))}</td><td class="bar"><span style="width:${share(n)}%"></span></td><td class="num"><small>${share(n)} %</small></td></tr>`)
    .join("");
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${provinceTabs()}
    <p><b>${fmt(Math.round(total * 1000))}</b> people: ${fmt(Math.round(town * 1000))} in town (${share(town)} %), ${fmt(Math.round((total - town) * 1000))} in the countryside.</p>
    <table class="troops classes"><tbody>${lines}</tbody></table>
    <p class="hint">Each class is born and dies at its own rate, every month. War in the province adds deaths.</p>`;
  bindClose();
  showPanel(true);
  bindProvinceTabs();
}

/** The province's Build tab: what is being built and queued, what can be ordered, and what stands (milestone 4). */
function renderWorks(pi: number): void {
  const p = provinces[pi]!;
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${provinceTabs()}
    ${provinceWorks(snapshot!, pi)}`;
  bindClose();
  showPanel(true);
  bindProvinceTabs();
  panel.querySelectorAll<HTMLButtonElement>("[data-build]").forEach((b) =>
    b.addEventListener("click", async () => {
      await act({ type: "build", province: pi, work: Number(b.dataset.build) });
      if (snapshot && !snapshot.rejectedOrders.length) sound.sfx("econ_spend");
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-move-work]").forEach((b) => b.addEventListener("click", () => void act({ type: "moveBuild", province: pi, work: Number(b.dataset.moveWork), by: Number(b.dataset.by) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-cancel-work]").forEach((b) => b.addEventListener("click", () => void act({ type: "cancelBuild", province: pi, work: Number(b.dataset.cancelWork) })));
}

/** The province's Land tab: its tiles, and the sheet of the one tapped (feedback 80, 87). */
function renderLand(pi: number): void {
  const p = provinces[pi]!;
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${provinceTabs()}
    ${provinceLand(snapshot!, pi, landTile)}`;
  bindClose();
  showPanel(true);
  bindProvinceTabs();
  panel.querySelectorAll<HTMLButtonElement>("[data-land-tile]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.landTile);
      landTile = landTile === i ? -1 : i;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-build]").forEach((b) =>
    b.addEventListener("click", async () => {
      await act({ type: "build", province: pi, work: Number(b.dataset.build) });
      if (snapshot && !snapshot.rejectedOrders.length) sound.sfx("econ_spend");
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-change-tile]").forEach((b) =>
    b.addEventListener("click", async () => {
      await act({ type: "changeTile", province: pi, change: b.dataset.changeTile! });
      if (snapshot && !snapshot.rejectedOrders.length) sound.sfx("econ_spend");
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-stop-change]").forEach((b) => b.addEventListener("click", () => act({ type: "stopChange", province: pi })));
}

function bindProvinceTabs(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      provinceTab = b.dataset.tab as typeof provinceTab;
      landTile = -1;
      renderPanel();
    }),
  );
}

function bindCommand(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-command]").forEach((b) =>
    b.addEventListener("click", () => {
      armyView = Number(b.dataset.command);
      newsView = false;
      realmView = -1;
      panelCollapsed = false;
      renderPanel();
    }),
  );
}

/** Acts, then stays on the same screen (the province or the commander's), unless the order was refused. */
async function actHere(order: Order): Promise<void> {
  await act(order);
  if (!snapshot || snapshot.rejectedOrders.length) return;
  newsView = false;
  renderPanel();
}

const ARM_LABEL: Record<string, string> = {
  "levy foot": "Levy foot",
  "armoured foot": "Armoured foot",
  pikes: "Pikes",
  archers: "Archers",
  "light horse": "Light horse",
  "knights and lancers": "Knights and lancers",
};
const armText = (by: number[]) =>
  snapshot!.arms
    .map((a, i) => [a, by[i]!] as const)
    .filter(([, m]) => m > 0)
    .map(([a, m]) => `${fmt(m)} ${ARM_LABEL[a]!.toLowerCase()}`)
    .join(", ");
const weeks = (w: number) => `${w} week${w === 1 ? "" : "s"}`;
/** Days as the queue says them: "in 9 days", "tomorrow" (or bare, "14 days"). */
const days = (d: number, inWord = true) => (inWord && d <= 1 ? "tomorrow" : `${inWord ? "in " : ""}${Math.max(1, Math.round(d))} day${Math.round(d) === 1 ? "" : "s"}`);

/** Commanders of the player waiting at court, best first. */
function idleCommanders(): number[] {
  const s = snapshot!;
  return s.commanders
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.owner === s.playerNation && c.army < 0 && c.fleet < 0)
    .sort((x, y) => y.c.might + y.c.cunning + y.c.logistics - (x.c.might + x.c.cunning + x.c.logistics))
    .map(({ i }) => i);
}

const skills = (c: Snapshot["commanders"][number]) => `might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}`;

/**
 * A province's Garrison tab (PROV-302, RECR-116..120): men who can be called
 * there a thousand at a time, the queue still gathering with the days left,
 * troops waiting without a commander by arm and drill, and the commanders
 * standing here who can pick them up.
 */
function renderGarrison(pi: number): void {
  const s = snapshot!;
  const me = s.playerNation;
  const p = provinces[pi]!;
  const left = Math.floor(s.provinceRecruits[pi]!);
  const ceiling = p.population * rules.defines.levies.menPerThousandPeople;
  const unit = provinceLevy(left, 1).men;
  const levyMoney = 20 * rules.defines.recruit.goldScale;
  const g = s.garrisons.find((x) => x.province === pi) ?? { troops: [], gathering: [], commanders: [] };
  const idle = idleCommanders();
  const capLeft = Math.max(0, s.nationTroopCap[me]! - s.nationCapUsed[me]!);
  const queued = g.gathering.length;
  const queuedMen = g.gathering.reduce((t, x) => t + x.men, 0);
  const max = rules.defines.recruit.queueMax;
  const gd = s.gatherDays;
  const why =
    queued >= max ? `The queue is full: at most ${max} thousands wait here`
    : left < unit ? "Fewer than a thousand men left to call: the pool refills a quarter of the way each year"
    : capLeft < unit ? "Over your troop cap"
    : levyMoney > s.nationTreasury[me]! ? "Not enough gold"
    : "";
  const allIn = queued ? g.gathering[queued - 1]!.daysLeft + gd : gd;
  // Each queued thousand, oldest first: the first is gathering, the rest wait their turn.
  const rows = g.gathering
    .map((x, i) => `<li class="${i === 0 ? "now" : ""}">${icon("hourglass", 1)}<span class="what"><b>${fmt(x.men)} men</b> <small>${x.state}</small></span><span class="when">${days(x.daysLeft)}</span>${i === queued - 1 ? `<button class="paper small" data-cancel-recruit title="Cancel: the levy money and the men come back" aria-label="Cancel the last thousand">×</button>` : ""}</li>`)
    .join("");
  const here = g.commanders;
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${provinceTabs()}
    <div class="garrison">
    <h3 class="sub">Recruit</h3>
    <p>${fmt(left)} of ${fmt(ceiling)} men here can be called. Each thousand takes ${days(gd, false)} to gather, one after another.</p>
    <div class="choices"><button class="paper" data-recruit="1" ${why ? "disabled" : ""}>Recruit ${fmt(unit)} men · ${levyMoney.toFixed(2)} gold<small>${why ? `${why}.` : `${provinceLevy(left, 1).percent} % of the men who can be called · all in ${days(allIn, false)}`}</small></button></div>
    <div class="queue-head"><span>Queue${queuedMen ? ` · ${fmt(queuedMen)} men` : ""}</span><span>${queued} / ${max}</span></div>
    ${queued ? `<ol class="queue">${rows}</ol>` : `<p class="hint">Nobody is gathering here.</p>`}
    <h3 class="sub">Troops without a commander</h3>
    ${g.troops.length
      ? g.troops
          .map((t) => {
            const join = here.filter((c) => s.armies.kind[armySlot(c.army)] === t.kind);
            return `<div class="army">
              <img class="portrait" src="${spriteUrl("soldier", nations[me]!.color, 3)}" alt="">
              <span class="who"><b>${fmt(t.men)} men</b><br><small>${armText(t.byArm)}</small><br><small>drill ${t.drill.toFixed(1)}</small></span>
              <span class="army-buttons">
                ${join
                  .map((c) => {
                    const name = esc(cmdOf(c.commander).name);
                    return `${t.men > unit ? `<button class="small" data-pickup="${c.army}" data-men="${unit}">${name} takes ${fmt(unit)}</button>` : ""}<button class="small" data-pickup="${c.army}">${name} takes ${t.men > unit ? "all" : fmt(t.men)}</button>`;
                  })
                  .join("")}
                ${idle.slice(0, 3).map((c) => `<button class="paper small" data-lead="${t.army}" data-by="${c}" title="${skills(cmdOf(c))}">Lead: ${esc(cmdOf(c).name)}</button>`).join("")}
                <button class="paper small" data-disband="${t.army}">Send home</button>
              </span>
            </div>`;
          })
          .join("")
      : `<p class="hint">None. Men you call here wait in the garrison until a commander leads them or picks them up.</p>`}
    ${g.troops.length ? `<p class="hint">${here.length ? `Commanders here: ${here.map((c) => esc(cmdOf(c.commander).name)).join(", ")}.` : idle.length ? "No commander stands here: one from court can lead them." : "No commander is free: commission an official from the Officials tab."}</p>` : ""}
    </div>`;
  bindClose();
  bindProvinceTabs();
  showPanel(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-recruit]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "recruit", province: pi, thousands: Number(b.dataset.recruit) })),
  );
  panel.querySelector<HTMLButtonElement>("[data-cancel-recruit]")?.addEventListener("click", () => void actHere({ type: "cancelRecruit", province: pi }));
  panel.querySelectorAll<HTMLButtonElement>("[data-pickup]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "pickUp", army: Number(b.dataset.pickup), ...(b.dataset.men ? { men: Number(b.dataset.men) } : {}) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-lead]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "appoint", army: Number(b.dataset.lead), commander: Number(b.dataset.by) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-disband]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "disband", army: Number(b.dataset.disband) })));
}

/**
 * The commander's screen: who leads, the army's troops by arm with what can be
 * done with them (train, split off, send home), its food, pay and time out.
 */
/** The fleets in a sea zone, and its sea battle, on the sea zone's card. */
function seaZoneFleets(zone: number): string {
  if (!snapshot) return "";
  const me = snapshot.playerNation;
  const here = snapshot.navy.fleets.filter((f) => f.at === zone && f.ships);
  const battle = snapshot.navy.battles.find((b) => b.zone === zone);
  return `${battle ? `<p>${icon("swords", 1)} A sea battle, round ${battle.round}: ${fmt(battle.strength[0])} against ${fmt(battle.strength[1])}.</p>` : ""}
    ${here.length ? `<h3 class="sub">Fleets here</h3><div class="choices">${here
      .map((f) => (f.owner === me ? fleetButton(f, (c) => cmdOf(c).name) : `<p>${pennant(nations[f.owner]!)} ${esc(nations[f.owner]!.name)}: ${f.ships} ship${f.ships === 1 ? "" : "s"}, strength ${fmt(f.strength)}</p>`))
      .join("")}</div>` : ""}`;
}

/** Fleet and port buttons in any card: open a fleet, a port's tab, or look at a place. */
function bindNavyLinks(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-fleet-open]").forEach((b) => b.addEventListener("click", () => openFleet(Number(b.dataset.fleetOpen))));
  panel.querySelectorAll<HTMLButtonElement>("[data-port-open]").forEach((b) =>
    b.addEventListener("click", () => {
      realmView = -1;
      fleetView = -1;
      selectedProvince = Number(b.dataset.portOpen);
      provinceTab = "port";
      restyleProvinces();
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-look]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = provinces[Number(b.dataset.look)]!;
      panelCollapsed = true;
      view.lookAt(p.x!, p.y!, Math.max(view.camera.zoom, ARMY_ZOOM));
      renderPanel();
    }),
  );
}

/** A coastal province's Port tab: muster sailors, order ships, the hulls building and the fleets in port. */
function renderPort(pi: number): void {
  const s = snapshot!;
  const port = s.navy.ports.find((x) => x.province === pi)!;
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(provinces[pi]!.name)}</h2>${closeButton()}</header>
    ${provinceTabs()}
    ${portTab(port, { gold: s.nationTreasury[s.playerNation]!, musterGoldEach: s.navy.musterGoldEach, fleetsHere: s.navy.fleets.filter((f) => f.owner === s.playerNation && f.at === pi), admiralName: (c) => cmdOf(c).name })}`;
  bindClose();
  showPanel(true);
  bindProvinceTabs();
  bindNavyLinks();
  panel.querySelectorAll<HTMLButtonElement>("[data-port-muster]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "navy", do: "muster", province: pi, sailors: Number(b.dataset.portMuster) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-port-buy]").forEach((b) =>
    b.addEventListener("click", async () => {
      await act({ type: "navy", do: "buy", province: pi, ship: b.dataset.portBuy! });
      if (snapshot && !snapshot.rejectedOrders.length) sound.sfx("econ_spend");
    }),
  );
}

/** A fleet's card: Sail, its admiral, the army aboard and its ships (naval spec, How the player uses it). */
function renderFleet(id: number): void {
  const s = snapshot!;
  const me = s.playerNation;
  const v = s.navy;
  const f = v.fleets.find((x) => x.id === id)!;
  const mine = v.mine.find((x) => x.id === id)!;
  const inPort = !isWater[f.at];
  const aboard = new Set(v.aboard);
  const armiesHere = inPort
    ? [...s.armies.id.keys()]
        .filter((k) => s.armies.owner[k] === me && s.armies.location[k] === f.at && s.armies.commander[k]! >= 0 && s.armies.battle[k]! < 0 && !aboard.has(s.armies.id[k]!))
        .map((k) => ({ id: s.armies.id[k]!, name: cmdOf(s.armies.commander[k]!).name, men: s.armies.men[k]!, room: s.armies.men[k]! + s.armies.horse[k]! * 3 }))
    : [];
  const name = f.admiral >= 0 ? `${cmdOf(f.admiral).name}'s fleet` : f.explorers ? "Explorers" : "Fleet";
  const ex = s.exploration;
  const pname = (p: number) => provinces[p]!.name;
  let explore = "";
  if (f.explorers) {
    // The coasts beside the fleet that are not the player's, and why each can't be settled (EXPL-070).
    const coasts = inPort
      ? []
      : neighborIdx[f.at]!.filter((q) => !isWater[q] && owners[q] !== me).map((q) => ({
          province: q,
          why:
            owners[q]! >= 0 ? `${nations[owners[q]!]!.name} holds it: only war or a treaty takes it`
            : ex.sites[q] === 3 ? "a colony is already being founded there"
            : ex.sites[q] === 2 ? (ex.colonial ? "beyond your colonial range" : "colonies open with ocean navigation")
            : null,
        }));
    const near = new Set(neighborIdx[f.at]!);
    const colonyHere = inPort ? null : (ex.colonies.find((c) => c.owner === me && near.has(c.province)) ?? null);
    const stores = mine.ships.reduce((t, sh) => t + sh.stores, 0);
    const storesMax = mine.ships.reduce((t, sh) => t + sh.storesMax, 0);
    explore =
      exploreSection(f, ex, { inPort, drawing: exploring?.fleet === id, name: pname }) +
      colonySection(f, ex, {
        inPort,
        portOfMine: inPort && owners[f.at] === me,
        gold: s.nationTreasury[me]!,
        stores,
        storesMax,
        coasts,
        colonyHere,
        waiting: ex.governors.filter((g) => g.port === f.at && g.fleet < 0 && g.colony < 0),
        name: pname,
      });
  }
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(name)}</h2>${closeButton()}</header>
    ${fleetCard(f, mine, {
      name: (p) => provinces[p]!.name,
      admiralName: (c) => cmdOf(c).name,
      idle: idleCommanders().map((c) => ({ id: c, name: cmdOf(c).name, skills: skills(cmdOf(c)) })),
      armiesHere,
      fleetsHere: v.fleets.filter((x) => x.owner === me && x.at === f.at && x.id !== id && !x.battle),
      choosing: sailing === id,
      inPort,
      me,
      explore,
    })}`;
  bindClose();
  showPanel(true);
  bindNavyLinks();
  const order = (o: Record<string, unknown>, after?: () => void) =>
    void act({ type: "navy", fleet: id, ...o } as Order).then(() => {
      if (snapshot?.rejectedOrders.length) return;
      after?.();
      newsView = false;
      renderPanel();
    });
  panel.querySelector("[data-fleet-sail]")?.addEventListener("click", () => {
    sailing = id;
    panelCollapsed = true;
    renderPanel();
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-fleet-admiral]").forEach((b) => b.addEventListener("click", () => order({ do: "admiral", commander: Number(b.dataset.fleetAdmiral) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-fleet-board]").forEach((b) => b.addEventListener("click", () => order({ do: "board", army: Number(b.dataset.fleetBoard) })));
  panel.querySelector("[data-fleet-unload]")?.addEventListener("click", () => order({ do: "unload" }));
  panel.querySelectorAll<HTMLButtonElement>("[data-fleet-split]").forEach((b) => b.addEventListener("click", () => order({ do: "split", ship: Number(b.dataset.fleetSplit) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-fleet-merge]").forEach((b) => {
    const into = Number(b.dataset.fleetMerge);
    b.addEventListener("click", () => order({ do: "merge", into }, () => (fleetView = into)));
  });
  panel.querySelector("[data-fleet-disband]")?.addEventListener("click", () => order({ do: "disband" }, () => (fleetView = -1)));
  // Explore and Colony (EXPL-069, EXPL-070).
  const colony = (o: Record<string, unknown>) =>
    void act({ type: "explore", fleet: id, ...o } as Order).then(() => {
      if (snapshot?.rejectedOrders.length) return;
      newsView = false;
      renderPanel();
    });
  panel.querySelector("[data-explore]")?.addEventListener("click", () => startExplore(id));
  panel.querySelector("[data-colony-hire]")?.addEventListener("click", () => colony({ do: "hire" }));
  panel.querySelectorAll<HTMLButtonElement>("[data-colony-embark]").forEach((b) => b.addEventListener("click", () => colony({ do: "embark", governor: Number(b.dataset.colonyEmbark) })));
  panel.querySelector("[data-colony-load]")?.addEventListener("click", () => colony({ do: "load" }));
  panel.querySelector("[data-colony-unload]")?.addEventListener("click", () => colony({ do: "unload" }));
  panel.querySelectorAll<HTMLButtonElement>("[data-colony-found]").forEach((b) => b.addEventListener("click", () => colony({ do: "found", province: Number(b.dataset.colonyFound) })));
}

/** Thousands of levy foot the commander screen's Train buttons send (RECR-109). */
let trainPick = 1;

function renderArmy(id: number): void {
  const s = snapshot!;
  const me = s.playerNation;
  const k = armySlot(id);
  const c = cmdOf(s.armies.commander[k]!);
  const by = s.armies.byArm[k]!;
  const hired = s.armies.kind[k] === 1;
  const monthsOut = s.armies.monthsOut[k]!;
  const rations = s.armies.rations[k]!;
  const food = s.armies.food[k]!;
  const here = s.armies.location[k]!;
  const atHome = canTrainAt(here);
  const training = s.armies.training[k];
  const others = [...s.armies.id.keys()].filter((j) => j !== k && s.armies.owner[j] === me && s.armies.location[j] === here && s.armies.kind[j] === s.armies.kind[k] && s.armies.commander[j]! >= 0);
  const garrison = [...s.armies.id.keys()].filter((j) => s.armies.owner[j] === me && s.armies.location[j] === here && s.armies.commander[j]! < 0 && s.armies.kind[j] === s.armies.kind[k]);
  const idle = idleCommanders();
  const shipsHere = isWater[here] ? [] : s.navy.fleets.filter((f) => f.owner === me && f.at === here && f.army < 0 && !f.battle);
  const levyFoot = by[0]!;
  // Arms the realm's inventions allow (warfare arms' unlock); the rest wait on research.
  const armsKnown = s.research?.arms ?? rules.defines.recruit.armsAtStart;
  const trainable = rules.defines.recruit.armsAtStart.filter((a) => a !== "levy foot" && armsKnown.includes(a));
  const armsNotKnown = rules.defines.recruit.armsAtStart.filter((a) => a !== "levy foot" && !armsKnown.includes(a));
  const ARM_COST: Record<string, { months: number; gold: number }> = {
    "armoured foot": { months: 2, gold: 80 }, pikes: { months: 3, gold: 60 }, archers: { months: 4, gold: 60 }, "light horse": { months: 3, gold: 100 }, "knights and lancers": { months: 9, gold: 300 },
  };
  // The player picks how many thousand to train (RECR-109); the rest stay levy foot.
  const trainThousands = Math.max(1, Math.min(trainPick, Math.floor(levyFoot / 1000)));
  const trainMen = levyFoot >= 1000 ? trainThousands * 1000 : Math.floor(levyFoot);
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(c.name)}</h2>${closeButton()}</header>
    <div class="army">
      ${commanderPortrait(rules, c.name, me)}
      <span class="who"><b>${esc(c.name)}</b>${c.origin ? ` <small>(${esc(c.origin.toLowerCase())})</small>` : ""}<br><small>${skills(c)}</small><br><small>${c.victories} victor${c.victories === 1 ? "y" : "ies"}, ${c.defeats} defeat${c.defeats === 1 ? "" : "s"}</small></span>
      <span class="army-buttons"><button data-army="${id}">${selected.has(id) ? "Pick a target" : "Move"}</button></span>
    </div>
    <dl class="facts">
      <dt>Where</dt><dd><button class="paper capital" data-go="${here}">${icon("map", 1)}${esc(provinces[here]!.name)}</button>${marchLine(k)}</dd>
      <dt>Men</dt><dd>${fmt(s.armies.men[k]!)}, ${fmt(s.armies.horse[k]!)} on horse · ${hired ? "a mercenary company" : "levies"}</dd>
      <dt>Drill</dt><dd>${(s.armies.drill[k]! / 10).toFixed(1)} months trained together</dd>
      <dt>Breaks</dt><dd>after losing ${Math.round(s.armies.breakPoint[k]! * 100)}% of its men</dd>
      <dt>Pay</dt><dd>${s.armies.pay[k]!.toFixed(2)} gold a month${!hired && monthsOut <= 3 ? ` (free for ${3 - monthsOut} more month${3 - monthsOut === 1 ? "" : "s"})` : ""}</dd>
      <dt>Food</dt><dd>${fmt(rations / RATION_MONTH_DAYS)} rations a day, ${fmt(rations)} a month · ${fmt(food)} in the wagons (${rations > 0 ? (food / rations).toFixed(1) : "–"} months)<br><small>${supplyLine(k)}</small></dd>
    </dl>
    <h3 class="sub">Troops</h3>
    <table class="troops">
      ${s.arms
        .map((a, i) => [a, by[i]!, i] as const)
        .filter(([, m]) => m > 0)
        .map(([a, m]) => {
          const n = Math.min(1000, Math.floor(m));
          return `<tr><th>${ARM_LABEL[a]}</th><td>${fmt(m)}</td><td class="army-buttons">
            <button class="paper small" data-split="${a}" data-men="${n}" title="Leave them here as the province's garrison${idle.length ? ", or under a commander at court" : ""}">Split ${fmt(n)}</button>
            ${hired ? "" : `<button class="paper small" data-dismiss="${a}" data-men="${n}">Send ${fmt(n)} home</button>`}
          </td></tr>`;
        })
        .join("")}
    </table>
    ${hired ? "" : `<h3 class="sub">Train</h3>
    ${training
      ? `<p>${icon("hourglass", 1)} ${fmt(training.men)} levy foot training as ${esc(training.arm)}: ${training.months} month${training.months === 1 ? "" : "s"} left${atHome ? "" : " (held: the army must stand at a castle or drill yard of your own)"}.</p>`
      : trainMen >= 1 && !atHome
        ? `<p class="hint">Men train only at a castle or drill yard of your own. March the army to one (your capital has a castle) to train its levy foot.</p>`
      : trainMen >= 1
        ? `<p class="hint">Turn levy foot into another arm. Training goes on while the army stands at a castle or drill yard of your own, and holds while it is away.</p>
          ${levyFoot >= 2000 ? `<div class="stepper" role="group" aria-label="Levy foot to train"><button class="paper" data-train-less ${trainThousands <= 1 ? "disabled" : ""} aria-label="Fewer">−</button><output>${fmt(trainMen)} of ${fmt(Math.floor(levyFoot))}</output><button class="paper" data-train-more ${trainThousands * 1000 + 1000 > levyFoot ? "disabled" : ""} aria-label="More">+</button></div>` : ""}
          <div class="choices">${trainable
            .map((a) => {
              const cost = ARM_COST[a]!;
              const g = (cost.gold * trainMen * rules.defines.recruit.goldScale) / 1000;
              return `<button class="paper" data-train="${a}" ${g > s.nationTreasury[me]! ? "disabled" : ""}>${ARM_LABEL[a]} · ${cost.months} mo · ${g.toFixed(2)} gold</button>`;
            })
            .join("")}</div>${armsNotKnown.length ? `<p class="hint">Not known yet: ${armsNotKnown.map((a) => esc(ARM_LABEL[a] ?? a)).join(", ")}. <button class="paper" data-realm="${me}" data-realm-open="learning">Learning</button></p>` : ""}`
        : `<p class="hint">No levy foot left to train.</p>`}`}
    ${(() => {
      const waiting = garrison.reduce((t, j) => t + s.armies.men[j]!, 0);
      return garrison.length
        ? `<h3 class="sub">Garrison here</h3><div class="choices">${waiting > 1000 ? `<button class="paper" data-pickup="${id}" data-men="1000">Take in ${fmt(1000)}</button>` : ""}<button class="wax" data-pickup="${id}">Take in ${waiting > 1000 ? "all " : ""}${fmt(waiting)} men</button></div>`
        : "";
    })()}
    ${shipsHere.length ? `<h3 class="sub">Board ships</h3><div class="choices">${shipsHere.map((f) => `<button class="paper" data-board-fleet="${f.id}">${icon("anchor", 1)}Board ${f.admiral >= 0 ? `${esc(cmdOf(f.admiral).name)}'s fleet` : "the fleet without an admiral"} · room for ${fmt(s.navy.mine.find((m) => m.id === f.id)?.room ?? 0)}</button>`).join("")}</div>` : ""}
    ${others.length ? `<h3 class="sub">Join another army here</h3><div class="choices">${others.map((j) => `<button class="paper" data-merge="${s.armies.id[j]!}">Into ${esc(cmdOf(s.armies.commander[j]!).name)}'s army</button>`).join("")}</div>` : ""}
    ${hired ? "" : `<h3 class="sub">Command</h3>
    <div class="choices">
      ${idle.slice(0, 3).map((x) => `<button class="paper" data-hand="${x}" title="${skills(cmdOf(x))}">Hand over to ${esc(cmdOf(x).name)}</button>`).join("")}
      <button class="paper" data-leave>Leave the men as ${esc(provinces[here]!.name)}'s garrison</button>
    </div>`}
    <div class="choices"><button class="paper" data-disband="${id}">${hired ? "Pay off the company" : "Send the whole army home"}</button></div>`;
  bindClose();
  showPanel(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-army]").forEach((b) => b.addEventListener("click", () => pickArmy(Number(b.dataset.army))));
  panel.querySelector("[data-go]")?.addEventListener("click", () => {
    view.lookAt(provinces[here]!.x!, provinces[here]!.y!, Math.max(view.camera.zoom, 4));
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-split]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "split", army: id, arm: b.dataset.split!, men: Number(b.dataset.men) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-dismiss]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "dismiss", army: id, arm: b.dataset.dismiss!, men: Number(b.dataset.men) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-train]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "train", army: id, arm: b.dataset.train!, men: trainMen })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-pickup]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "pickUp", army: id, ...(b.dataset.men ? { men: Number(b.dataset.men) } : {}) })),
  );
  panel.querySelector("[data-train-less]")?.addEventListener("click", () => {
    trainPick = trainThousands - 1;
    renderPanel();
  });
  panel.querySelector("[data-train-more]")?.addEventListener("click", () => {
    trainPick = trainThousands + 1;
    renderPanel();
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-board-fleet]").forEach((b) =>
    b.addEventListener("click", () => {
      const fleet = Number(b.dataset.boardFleet);
      void act({ type: "navy", do: "board", fleet, army: id }).then(() => {
        if (!snapshot?.rejectedOrders.length) openFleet(fleet);
      });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-merge]").forEach((b) =>
    b.addEventListener("click", () => {
      const into = Number(b.dataset.merge);
      void act({ type: "merge", army: id, into }).then(() => {
        if (snapshot?.rejectedOrders.length) return;
        armyView = into;
        newsView = false;
        renderPanel();
      });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-hand]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "appoint", army: id, commander: Number(b.dataset.hand) })));
  panel.querySelector("[data-leave]")?.addEventListener("click", () => {
    void act({ type: "appoint", army: id, commander: -1 }).then(() => {
      if (snapshot?.rejectedOrders.length) return;
      armyView = -1;
      selectedProvince = here;
      provinceTab = "garrison";
      newsView = false;
      renderPanel();
    });
  });
  panel.querySelector("[data-disband]")?.addEventListener("click", () => {
    void act({ type: "disband", army: id }).then(() => {
      armyView = -1;
      newsView = false;
      renderPanel();
    });
  });
}

/** Country overview: the realm's lands, people, purse and commanders. */
/** Days in a month of rations, as the engine feeds armies. */
const RATION_MONTH_DAYS = 30;

/** Where the player's armies may train: a held province of the realm with a stone castle, capitals included (RECR-109). */
/** A castle or drill yard of the player's own, not besieged: the engine's list (RECR-109). */
function canTrainAt(p: number): boolean {
  return snapshot!.trainingGrounds.includes(p);
}

/** No company is hired while the capital is besieged or held by the enemy (WAR-210). */
function capitalBesieged(): boolean {
  const s = snapshot!;
  const cap = provinceIndex.get(nations[s.playerNation]!.capital);
  return cap !== undefined && (occupiers[cap]! >= 0 || s.sieges.some((x) => x.province === cap));
}

/** War and peace with another realm, from its overview. */
function relationsSection(r: number): string {
  const s = snapshot!;
  const me = s.playerNation;
  const rel = relationOf(r);
  const war = myWars().find((w) => w.theirs.includes(r));
  if (war) {
    // Land each side holds of the other's, for the peace terms.
    const ours = new Set(war.ours);
    const theirs = new Set(war.theirs);
    let taken = 0;
    let lost = 0;
    for (let i = 0; i < provinces.length; i++) {
      if (theirs.has(owners[i]!) && ours.has(occupiers[i]!)) taken++;
      if (ours.has(owners[i]!) && theirs.has(occupiers[i]!)) lost++;
    }
    const leaders = s.wars.find((w) => w.id === war.id)!;
    const whole = [leaders.attackers[0], leaders.defenders[0]].includes(me) && [leaders.attackers[0], leaders.defenders[0]].includes(r);
    return `<h3 class="sub">At war</h3>
      <p>Since ${monthText(war.start)}. With you: ${war.ours.map((n) => esc(nations[n]!.name)).join(", ")}. Against you: ${war.theirs.map((n) => esc(nations[n]!.name)).join(", ")}.</p>
      <p class="hint">${whole ? "Peace with them ends the whole war." : "A separate peace: the rest of the war goes on."} Your side holds ${taken} of their provinces; they hold ${lost} of yours.</p>
      <div class="choices">
        <button class="wax" data-peace="take" ${taken ? "" : "disabled"}>${icon("crown", 1)}Peace: take ${taken} province${taken === 1 ? "" : "s"}</button>
        <button class="paper" data-peace="white">White peace</button>
        ${lost ? `<button class="paper" data-peace="give">Give up ${lost} province${lost === 1 ? "" : "s"}</button>` : ""}
      </div>
      ${realmStatecraft(s.statecraft, r, false, true)}`;
  }
  const line =
    rel?.state === "truce" ? `A truce holds${rel.until ? ` until ${monthText(rel.until)}` : ""}: no war before then.`
    : rel?.state === "alliance" ? "Your ally: they answer your calls to arms."
    : rel?.state === "subject" ? "Your overlord: see your own Diplomacy tab for what you owe it."
    : rel?.state === "overlord" ? "Your subject."
    : "No ties between you. Declaring war calls their allies to arms against you, and yours to your side.";
  return `<h3 class="sub">Relations</h3><p>${line}</p>
    ${rel?.state === "overlord" ? subjectCard(s.statecraft, r, (n) => realmButton(n, "diplomacy")) : ""}
    ${realmStatecraft(s.statecraft, r, rel?.state === "alliance", false)}
    ${rel ? "" : `<h3 class="sub">War</h3><div class="choices"><button class="wax" data-declare="${r}">${icon("swords", 1)}Declare war</button></div>`}`;
}

/** Peace offered to the player, with the choice to take it. */
function offerHtml(o: Snapshot["peaceOffers"][number]): string {
  const what = o.terms === "give" ? "it gives up the land you hold of theirs" : o.terms === "take" ? "it asks for the land it holds of yours" : "a white peace, no land changes hands";
  return `<div class="call framed-soft">
    <p>${icon("crown", 2)} ${realmButton(o.from, "diplomacy")} offers peace: ${what}. The offer stands until the month is out.</p>
    <div class="choices"><button class="wax" data-offer="${o.id}" data-yes="1">Make peace</button><button class="paper" data-offer="${o.id}" data-yes="0">Fight on</button></div>
  </div>`;
}

function offersFrom(r: number): string {
  return asksHtml(r) + snapshot!.peaceOffers.filter((o) => o.from === r).map(offerHtml).join("");
}

/** Envoys waiting at the player's court for an answer (DIPL-214). */
const asksOf = (s: Snapshot) => s.statecraft?.asks ?? [];

/** The answer cards of envoys at your court, all of them or one realm's. */
function asksHtml(from?: number): string {
  return asksOf(snapshot!)
    .filter((a) => from === undefined || a.from === from)
    .map((a) => askCard(a, (n) => realmButton(n, "diplomacy")))
    .join("");
}

function bindOffers(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-offer]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "answerPeace", offer: Number(b.dataset.offer), yes: b.dataset.yes === "1" })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-ask]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "answerAsk", ask: b.dataset.ask!, yes: b.dataset.yes === "1" })),
  );
}

/** The player's own diplomacy: offers waiting, wars, and standing with other realms. */
function myDiplomacySection(): string {
  const s = snapshot!;
  const ties = s.relations.filter((x) => x.state !== "war");
  const STATE = { truce: "Truce", alliance: "Ally", subject: "Your overlord", overlord: "Your subject", war: "At war" } as const;
  return `${asksHtml()}${s.peaceOffers.map(offerHtml).join("")}
    <h3 class="sub">Wars</h3>
    ${myWars().length ? myWars()
      .map((w) => `<p>${icon("swords", 1)} Against ${w.theirs.map((n) => realmButton(n, "diplomacy")).join(" ")} <small>since ${monthText(w.start)}</small></p>`)
      .join("") : `<p class="hint">At peace with the world.</p>`}
    <p class="hint">Open a realm to send it an envoy, declare war on it or offer it peace.</p>
    ${mySubjects(s.statecraft, (n) => realmButton(n, "diplomacy"))}
    ${myHouse(s.statecraft, (n) => realmButton(n, "diplomacy"))}
    ${myStatecraft(s.statecraft, (n) => realmButton(n, "diplomacy"))}
    ${ties.length ? `<h3 class="sub">Ties</h3>${ties
      .map((x) => `<p>${realmButton(x.nation, "diplomacy")} <small>${STATE[x.state]}${x.until ? ` until ${monthText(x.until)}` : ""}</small></p>`)
      .join("")}` : ""}`;
}

/** The player's troops, commanders and mercenaries, from their realm's overview. */
function warRoomSection(): string {
  const s = snapshot!;
  const me = s.playerNation;
  const gathering = s.musters.reduce((t, m) => t + m.men, 0);
  const mine = s.commanders.map((c, i) => ({ c, i })).filter(({ c }) => c.owner === me);
  return `<h3 class="sub">Troops</h3>
    <p>${fmt(s.nationCapUsed[me]!)} men under arms or gathering, of a troop cap of ${fmt(s.nationTroopCap[me]!)}. Pay: ${s.pay.toFixed(1)} gold a month.</p>
    <p class="hint">Call men up from a province's Garrison tab, a thousand at a time.${gathering ? ` ${fmt(gathering)} men are gathering now.` : ""} Over the cap, pay doubles and levies desert.</p>
    ${s.musters.length ? `<div class="queue-head"><span>Recruiting</span><span>${fmt(gathering)} men</span></div>
    <ol class="queue">${s.musters
      .map((m) => `<li><button class="paper small" data-garrison="${m.province}">${esc(provinces[m.province]!.name)}</button><span class="what"><small>${Math.ceil(m.men / 1000)} / ${rules.defines.recruit.queueMax} queued</small></span><span class="when">all ${days(m.daysAll)}</span></li>`)
      .join("")}</ol>` : ""}
    <h3 class="sub">Commanders</h3>
    ${mine
      .map(({ c, i }) => {
        const k = c.army;
        const where = k >= 0 ? `leads ${fmt(s.armies.men[k]!)} men at ${esc(provinces[s.armies.location[k]!]!.name)}` : "waits at court";
        return `<div class="army">${commanderPortrait(rules, c.name, me)}<span class="who"><b>${esc(c.name)}</b><br><small>${skills(c)} · ${c.victories} won, ${c.defeats} lost</small><br><small>${where}</small></span>
          <span class="army-buttons">${k >= 0 ? `<button class="paper small" data-command="${s.armies.id[k]!}">Command</button>` : c.home >= 0 ? `<button class="paper small" data-release="${i}" title="Back to his post in ${esc(provinces[c.home]!.name)}">Release</button>` : ""}</span></div>`;
      })
      .join("")}
    <p class="hint">New commanders are commissioned from a province's official, in its Garrison tab.</p>
    ${mercenaryLine()}`;
}

/** One line in the Military tab that sums up the free companies and opens their tab. */
function mercenaryLine(): string {
  const s = snapshot!;
  const serving = hiredArmies().length;
  const parts = [serving ? `${serving} in service` : "", s.mercs.length ? `${s.mercs.length} on the way` : "", `${s.freeCompanies.length} for hire`].filter(Boolean);
  return `<h3 class="sub">Mercenaries</h3><p><button class="paper" data-realm-open-tab="mercenaries">${icon("coin", 1)}Free companies: ${parts.join(", ")}</button></p>`;
}

const hiredArmies = () => {
  const s = snapshot!;
  return [...s.armies.id.keys()].filter((k) => s.armies.owner[k] === s.playerNation && s.armies.kind[k] === 1);
};

/** A company's arms as a bar and a line of text, largest first. */
function companyMix(c: { men: number; byArm: Record<string, number> }): string {
  const arms = Object.entries(c.byArm).sort((a, b) => b[1] - a[1]);
  return `<div class="mix" role="img" aria-label="${arms.map(([a, m]) => `${ARM_LABEL[a] ?? a} ${fmt(m)}`).join(", ")}">${arms
    .map(([a, m]) => `<span class="arm-${ARMS_ORDER.indexOf(a)}" style="flex-grow:${m}"></span>`)
    .join("")}</div><small>${arms.map(([a, m]) => `${ARM_LABEL[a] ?? a} ${fmt(m)}`).join(" · ")}</small>`;
}
const ARMS_ORDER = Object.keys(ARM_LABEL);

/**
 * The Mercenaries tab (feedback 52, 53): companies serving the realm, those on
 * the way, and those for hire, one card each, apart from the realm's own levies.
 */
function mercenarySection(): string {
  const s = snapshot!;
  const me = s.playerNation;
  const serving = hiredArmies();
  const besieged = capitalBesieged();
  const pay = serving.reduce((t, k) => t + s.armies.pay[k]!, 0);
  const card = (inner: string, extra = "") => `<li class="company${extra}">${inner}</li>`;
  return `<p>${serving.length ? `${serving.length} compan${serving.length === 1 ? "y" : "ies"} in service, ${fmt(serving.reduce((t, k) => t + s.armies.men[k]!, 0))} men, ${pay.toFixed(1)} gold a month.` : `No company in your service yet${s.mercs.length ? `; ${s.mercs.length} on the way` : ""}.`}</p>
    <p class="hint">Free companies come with their own captain and march to your capital. They cost three times a levy's pay; the first month is paid on hiring.</p>
    ${serving.length || s.mercs.length ? `<div class="queue-head"><span>Your companies</span><span>${fmt(serving.reduce((t, k) => t + s.armies.men[k]!, 0) + s.mercs.reduce((t, m) => t + m.men, 0))} men</span></div>
    <ol class="companies">${serving
      .map((k) => {
        const c = s.commanders[s.armies.commander[k]!];
        return card(`<div class="company-head"><b>${esc(c?.name ?? "A free company")}</b><small>${fmt(s.armies.men[k]!)} men at ${esc(provinces[s.armies.location[k]!]!.name)}</small></div>
          <small>${armText(s.armies.byArm[k]!)} · ${s.armies.pay[k]!.toFixed(1)} gold a month</small>
          <div class="company-foot"><span></span><button class="paper" data-command="${s.armies.id[k]!}">Command</button></div>`);
      })
      .join("")}${s.mercs
      .map((m) => card(`<div class="company-head"><b>${esc(m.name)}</b><small>${icon("hourglass", 1)} at your capital in ${weeks(m.weeksLeft)}</small></div>
          ${companyMix(m)}<small>${fmt(m.men)} men${m.captain ? ` under Captain ${esc(m.captain)}` : ""}</small>`, " coming"))
      .join("")}</ol>` : ""}
    <div class="queue-head"><span>For hire</span><span>${s.freeCompanies.length} compan${s.freeCompanies.length === 1 ? "y" : "ies"}</span></div>
    ${besieged ? `<p class="hint">${icon("castle", 1)} Your capital is under siege: no company will come until it is free.</p>` : ""}
    ${s.freeCompanies.length ? `<ol class="companies">${s.freeCompanies
      .map((c) => {
        const short = c.pay > s.nationTreasury[me]!;
        return card(`<div class="company-head"><b>${esc(c.name)}</b><small>${esc(c.group)}</small></div>
          ${companyMix(c)}
          <div class="company-foot"><span><b>${fmt(c.men)} men</b> under Captain ${esc(c.captain)}<br><small>at your capital in ${weeks(c.weeks)} · ${c.pay.toFixed(1)} gold a month</small></span>
          <button class="wax" data-hire="${c.id}" ${besieged || short ? "disabled" : ""} ${short ? 'title="Not enough gold"' : ""}>Hire</button></div>`);
      })
      .join("")}</ol>` : `<p class="hint">No company is near enough to come to your capital this month.</p>`}`;
}

// ---- Tax and the treasury (milestone 3) ----

const RATE_LABEL = ["None", "Light", "Normal", "Heavy", "Crushing"];
const gold2 = (g: number) => (Math.abs(g) < 10 ? g.toFixed(2) : g.toFixed(1));

/** A province's Tax line: its rate, whether it follows the realm default, and the gold it pays a month. */
function taxLine(p: number): string {
  const s = snapshot!;
  const own = s.provinceTax[p]!;
  const rate = own >= 0 ? own : s.taxDefault;
  return `<dt>Tax</dt><dd>${RATE_LABEL[rate]} (${own >= 0 ? "own rate" : "realm default"}) · ${gold2(s.provinceTaxGold[p]!)} gold a month</dd>`;
}

/**
 * The row of rate buttons: for a province, Realm default and the five rates
 * (its own rate marked, or Realm default while it follows it); for the realm,
 * the five rates with the default marked.
 */
function rateButtons(current: number, scope: "province" | "realm"): string {
  const button = (rate: number, label: string) =>
    `<button class="paper${current === rate ? " on" : ""}" aria-pressed="${current === rate}" data-tax="${rate}" title="${rate < 0 ? "Follow the realm default" : `Tax ${scope === "realm" ? "every province that follows the default" : "this province"} ${label.toLowerCase()}`}">${label}</button>`;
  return `<div class="choices tax-rates">${scope === "province" ? button(-1, "Realm default") : ""}${RATE_LABEL.map((l, k) => button(k, l)).join("")}</div>`;
}

/** Binds the rate buttons (province -1: the realm default) and the borrow and repay buttons. */
function bindTax(province: number): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-tax]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "setTax", province, rate: Number(b.dataset.tax) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-borrow]").forEach((b) => b.addEventListener("click", () => void actInTreasury({ type: "borrow", gold: Number(b.dataset.borrow) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-repay]").forEach((b) => b.addEventListener("click", () => void actInTreasury({ type: "repay", gold: Number(b.dataset.repay) })));
}

/**
 * The Food tab's buttons: a setting for the realm or one castle, a preset;
 * the tab stays open on its new state, and a castle's folded settings stay
 * as the player left them.
 */
function bindFood(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-food-key]").forEach((b) =>
    b.addEventListener("click", () => void actInTreasury({ type: "setFood", castle: Number(b.dataset.foodCastle), key: b.dataset.foodKey!, value: JSON.parse(b.dataset.foodValue!) as string | number | null })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-food-preset]").forEach((b) => b.addEventListener("click", () => void actInTreasury({ type: "foodPreset", name: b.dataset.foodPreset! })));
  panel.querySelectorAll<HTMLDetailsElement>("details[data-castle]").forEach((d) =>
    d.addEventListener("toggle", () => {
      const c = Number(d.dataset.castle);
      if (d.open) castlesOpen.add(c);
      else castlesOpen.delete(c);
    }),
  );
}

/** Borrowing and repaying keep the Treasury tab open: what a loan did to the lords goes to the news, and the tab shows the new debt. */
async function actInTreasury(order: Order): Promise<void> {
  const realm = realmView;
  await act(order);
  if (!snapshot || snapshot.rejectedOrders.length) return;
  realmView = realm;
  newsView = false;
  renderPanel();
}

const LEDGER_LABEL: Record<string, string> = { grain: "Grain sold", tax: "Tax", trade: "Trade", "army pay": "Army pay", officials: "Officials' wages", interest: "Debt interest", schools: "Schools", tribute: "Tribute", navy: "Ships and sailors" };

/**
 * The Treasury tab: the purse (gold, its change a month and how long it
 * lasts), the month's ledger as bars of gold in and out, the realm tax
 * default, and the debt as a meter against what lenders allow, with what a
 * loan costs said before the borrow buttons (REALM-184, REALM-198).
 */
function treasurySection(): string {
  const s = snapshot!;
  const me = s.playerNation;
  const gold = s.nationTreasury[me]!;
  const net = s.ledger.reduce((t, l) => t + l.gold, 0);
  const own = Array.from(s.provinceTax).filter((t, p) => t >= 0 && owners[p] === me).length;
  const interest = -(s.ledger.find((l) => l.line === "interest")?.gold ?? 0);
  const borrow = [10, 50].filter((g) => g < s.canBorrow);
  const signed = (g: number) => (Math.abs(g) < 0.005 ? "0" : `${g > 0 ? "+" : "−"}${gold2(Math.abs(g))}`);
  const income = s.ledger.reduce((t, l) => t + Math.max(0, l.gold), 0);
  const spending = s.ledger.reduce((t, l) => t - Math.min(0, l.gold), 0);
  const largest = Math.max(income, spending, 0.01);
  const lasts = net < 0 && gold > 0 ? `Gold runs out in about <b>${Math.max(1, Math.floor(gold / -net))} month${Math.floor(gold / -net) === 1 ? "" : "s"}</b>.` : net < 0 ? "<b>The treasury is empty.</b>" : "The treasury grows.";
  const bar = (label: string, g: number) => `<li class="${g < 0 ? "out" : "in"}"><span class="what">${label}</span><span class="bar"><i style="width:${Math.max(2, (Math.abs(g) / largest) * 100).toFixed(1)}%"></i></span><b class="num">${signed(g)}</b></li>`;
  const owed = s.debtLimit > 0 ? Math.min(100, (s.debt / s.debtLimit) * 100) : s.debt > 0 ? 100 : 0;
  const pct = Math.round((s.loanDebtFactor - 1) * 100);
  const cost = (g: number) => `you owe ${fmt(Math.round(g * s.loanDebtFactor))}`;
  return `
    <div class="purse">
      <span class="purse-coin">${icon("coin", 4)}</span>
      <div>
        <div class="purse-gold"><b>${fmt(gold)}</b> gold</div>
        <div class="purse-net ${net < 0 ? "down" : "up"}">${signed(net)} a month</div>
        <div class="purse-note">${lasts}</div>
      </div>
    </div>
    <h3 class="sub">This month</h3>
    <div class="flow" role="img" aria-label="Gold in ${gold2(income)}, gold out ${gold2(spending)} a month">
      <span class="in" style="flex:${income.toFixed(3)}">In ${gold2(income)}</span><span class="out" style="flex:${spending.toFixed(3)}">Out ${gold2(spending)}</span>
    </div>
    <ul class="ledger-bars">
      ${s.ledger.filter((l) => l.gold > 0).map((l) => bar(LEDGER_LABEL[l.line] ?? l.line, l.gold)).join("")}
      ${s.ledger.filter((l) => l.gold < 0).map((l) => bar(LEDGER_LABEL[l.line] ?? l.line, l.gold)).join("")}
      <li class="total ${net < 0 ? "out" : "in"}"><span class="what">Change a month</span><span class="bar"></span><b class="num">${signed(net)}</b></li>
    </ul>
    <h3 class="sub">Realm tax</h3>
    <p>Provinces pay at <b>${RATE_LABEL[s.taxDefault]!.toLowerCase()}</b> unless you set their own rate on their card${own ? ` (${own} province${own === 1 ? " has" : "s have"} one)` : ""}.</p>
    ${rateButtons(s.taxDefault, "realm")}
    <h3 class="sub">Debt</h3>
    <div class="debt-meter" role="img" aria-label="Owed ${fmt(s.debt)} of ${fmt(s.debtLimit)} gold lenders allow"><i style="width:${owed.toFixed(1)}%"></i></div>
    <p class="meter-caption">${s.debt > 0 ? `You owe <b>${fmt(s.debt)} gold</b>, costing ${gold2(interest)} gold a month in interest.` : "You owe nothing."} Lenders let you owe up to ${fmt(s.debtLimit)} gold, a year's tax and trade.</p>
    <p class="loan-cost">A loan adds the gold <b>plus ${pct} % interest</b> to the debt at once${s.loanUnsettlesLords ? ", and <b>your lords think less of you</b>: each falls a step in loyalty (once a year)" : ""}.</p>
    <div class="choices loans">
      ${borrow.map((g) => `<button class="paper" data-borrow="${g}">Borrow ${g}<small>${cost(g)}</small></button>`).join("")}
      <button class="paper" data-borrow="${Math.floor(s.canBorrow)}" ${s.canBorrow < 1 ? "disabled" : ""}>Borrow ${fmt(Math.floor(s.canBorrow))}<small>${s.canBorrow < 1 ? "lenders refuse" : cost(Math.floor(s.canBorrow))}</small></button>
    </div>
    ${s.debt > 0 ? `<div class="choices loans">
      ${s.debt > 10 ? `<button class="paper" data-repay="10" ${gold < 10 ? "disabled" : ""}>Repay 10</button>` : ""}
      <button class="paper" data-repay="${s.debt}" ${gold < s.debt ? 'disabled title="Not enough gold"' : ""}>Repay all ${fmt(s.debt)}</button>
    </div>` : ""}`;
}

function renderRealm(r: number): void {
  const n = nations[r]!;
  const s = snapshot;
  const own: number[] = [];
  owners.forEach((o, i) => o === r && own.push(i));
  const people = own.reduce((t, i) => t + provinces[i]!.population, 0) * 1000;
  const wealth = own.reduce((t, i) => t + provinces[i]!.wealth, 0);
  const lands = new Map<string, number>();
  for (const i of own) lands.set(provinces[i]!.terrain, (lands.get(provinces[i]!.terrain) ?? 0) + 1);
  const topLands = [...lands].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const neighbours = new Set<number>();
  for (const i of own) for (const j of neighborIdx[i]!) if (owners[j]! >= 0 && owners[j] !== r) neighbours.add(owners[j]!);
  const capIdx = provinceIndex.get(n.capital)!;
  const armies = s ? [...s.armies.id.keys()].filter((k) => s.armies.owner[k] === r) : [];
  const men = armies.reduce((t, k) => t + s!.armies.men[k]!, 0);
  const inc = s ? s.nationMonthlyIncome[r]! : 0;
  const back = selectedProvince >= 0 && owners[selectedProvince] === r ? provinces[selectedProvince]! : null;
  const mine = !!s && s.playerNation === r;
  if ((!s && realmTab !== "heritage") || (s && (realmTab === "government" || realmTab === "peoples" || realmTab === "treasury" || realmTab === "trade" || realmTab === "food" || realmTab === "military" || realmTab === "mercenaries" || realmTab === "officials" || realmTab === "lords" || realmTab === "provinces" || realmTab === "learning" || realmTab === "navy" || realmTab === "colonies") && !mine)) realmTab = "general";
  const strengths = realmStrengths(n.id);
  const peoples = s ? peoplesView(beliefData(s.peoples), r, s.provincePeople) : null;
  const tab = (key: typeof realmTab, label: string) => `<button class="tab${realmTab === key ? " on" : ""}" data-realm-tab="${key}">${label}</button>`;
  const general = `
    <div class="realm-card">
      <img class="banner" src="${flagUrl(n, 6)}" alt="">
      <p>${s && s.playerNation === r ? "<b>Your realm</b>" : "<b>Realm</b>"} · ${own.length} province${own.length === 1 ? "" : "s"}<br>
      Capital <button class="paper capital" data-go="${capIdx}">${icon("castle", 1)}${esc(provinces[capIdx]!.name)}</button></p>
    </div>
    ${mine && s?.stability ? stabilitySection(s.stability) : ""}
    ${mine && s?.revolution ? revolutionSection(s.revolution) : ""}
    <dl class="facts">
      <dt>People</dt><dd>${fmt(people)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1)} ${wealth} across its lands</dd>
      ${s ? `<dt>Treasury</dt><dd>${mine ? `<button class="paper" data-realm-open-tab="treasury" title="Open the ledger">${icon("coin", 1)}${fmt(s.nationTreasury[r]!)} gold <small>${inc >= 0 ? "+" : ""}${inc.toFixed(1)} a month</small></button>` : `${fmt(s.nationTreasury[r]!)} gold <small>${inc >= 0 ? "+" : ""}${inc.toFixed(1)} a month</small>`}</dd>
      ${mine && s.trade ? tradeLine(s.trade) : ""}
      ${mine ? risingsLine(s.rebels, r) : ""}
      ${mine && s.government ? governmentLine(s.government) : `<dt>Government</dt><dd>${esc(s.realmForms[r] ?? "")}</dd>`}
      ${peoples ? beliefLines(peoples, mine) : ""}
      <dt>Recruits</dt><dd>${fmt(s.nationLevies[r]!)} men who can be called</dd>
      <dt>Armies</dt><dd>${armies.length} in the field, ${fmt(men)} men</dd>
      ${mine && s.research ? learningLine(s.research) : realmLearningLine(s.realmResearch[r])}
      ${mine ? foodLine(s, own) : ""}` : ""}
      <dt>Lands</dt><dd>${topLands.map(([t, c]) => `${t} ${c}`).join(" · ")}</dd>
      ${heritageLine(strengths, s?.heritage[r] ?? null)}
    </dl>
    ${mine ? "" : (() => {
      const list = s ? s.commanders.filter((c) => c.owner === r) : n.commanders;
      return list.length ? `<h3 class="sub">Commanders</h3>${list
        .map((c) => `<div class="army">${commanderPortrait(rules, c.name, r)}<span class="who"><b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small></span></div>`)
        .join("")}` : "";
    })()}
    ${neighbours.size ? `<h3 class="sub">Neighbours</h3><div class="nations">${[...neighbours]
      .map((j) => `<button class="paper nation" data-realm="${j}">${pennant(nations[j]!)}${esc(nations[j]!.name)}</button>`)
      .join("")}</div>` : ""}
    ${!s ? `<button class="wax play" data-nation="${n.id}">${icon("crown", 2)}Rule ${esc(n.name)}</button>` : ""}`;
  const content =
    realmTab === "heritage" ? heritageTab(strengths, s?.heritage[r] ?? null, s ? s.nationTreasury[r]! : 0)
    : realmTab === "diplomacy" ? `<div class="diplomacy-tab">${mine ? myDiplomacySection() : offersFrom(r) + relationsSection(r)}</div>`
    : realmTab === "government" && s?.government ? governmentTab(s.government, s.revolution)
    : realmTab === "peoples" && peoples ? peoplesTab(peoples)
    : realmTab === "treasury" ? treasurySection()
    : realmTab === "trade" && s?.trade ? tradeTab(s.trade, s, (p) => provinces[p]!.name)
    : realmTab === "food" ? foodTab(s!, (p) => provinces[p]!.name, (p) => (mapImage ? provinceThumb(mapImage, provinces.length, p, n.color) : ""), own)
    : realmTab === "military" ? warRoomSection()
    : realmTab === "navy" ? navyTab(s!.navy, r, { name: (p) => provinces[p]!.name, admiralName: (c) => cmdOf(c).name })
    : realmTab === "colonies" ? coloniesTab(s!.exploration, { name: (p) => provinces[p]!.name, fleetName: fleetLabel, inRange: s!.exploration.sites.reduce((t, x) => t + (x === 1 ? 1 : 0), 0) })
    : realmTab === "mercenaries" ? mercenarySection()
    : realmTab === "lords" ? realmLords(r)
    : realmTab === "provinces" ? provincesTab(r)
    : realmTab === "learning" && s?.research ? learningTab(rules, s.research, s.nationTreasury[r]!, learningUi)
    : realmTab === "officials" ? officialsTab(rules, own.filter((i) => s!.provinceLord[i]! < 0).map((i) => ({ province: i, official: officialOf(s!, i, r) })), r, own.filter((i) => s!.provinceLord[i]! >= 0).length)
    : general;
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(n.name)}</h2>${closeButton()}</header>
    ${s ? `<nav class="tabs">${tab("general", "General")}${mine ? tab("government", "Government") + tab("peoples", "Peoples") : ""}${tab("heritage", "Heritage")}${mine ? tab("treasury", "Treasury") + tab("trade", "Trade") + tab("food", "Food") + tab("provinces", "Provinces") + tab("learning", "Learning") : ""}${tab("diplomacy", "Diplomacy")}${mine ? tab("military", "Military") + tab("navy", "Navy") + tab("colonies", "Colonies") + tab("officials", "Officials") + tab("lords", "Lords") + tab("mercenaries", "Mercenaries") : ""}</nav>` : `<nav class="tabs">${tab("general", "General")}${tab("heritage", "Heritage")}</nav>`}
    ${content}
    ${back ? `<button class="back" data-back>${icon("scroll", 2)}Back to ${esc(back.name)}</button>` : ""}`;
  bindClose();
  showPanel(true);
  bindNavyLinks();
  panel.querySelectorAll("[data-show-charts]").forEach((b) => b.addEventListener("click", () => setLens("charts")));
  panel.querySelector("[data-go]")?.addEventListener("click", () => {
    realmView = -1;
    selectedProvince = capIdx;
    panelCollapsed = true;
    const c = provinces[capIdx]!;
    view.lookAt(c.x!, c.y!, Math.max(view.camera.zoom, 4));
    restyleProvinces();
    renderPanel();
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-peace]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "offerPeace", target: r, terms: b.dataset.peace as PeaceTerms })),
  );
  panel.querySelector<HTMLButtonElement>("[data-declare]")?.addEventListener("click", () => void act({ type: "declareWar", target: r }));
  panel.querySelectorAll<HTMLButtonElement>("[data-envoy]").forEach((b) => b.addEventListener("click", () => void act({ type: "sendEnvoy", target: r, action: b.dataset.envoy! })));
  panel.querySelector<HTMLButtonElement>("[data-rise]")?.addEventListener("click", () => void act({ type: "riseUp" }));
  panel.querySelectorAll<HTMLButtonElement>("[data-court-subject]").forEach((b) => b.addEventListener("click", () => void act({ type: "court", target: Number(b.dataset.courtSubject), ...(b.dataset.recall ? { recall: true } : {}) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-subject-act]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "subjectAction", subject: r, action: b.dataset.subjectAct as "tribute" | "gift" | "loosen" | "release" | "resident" | "recall" | "hostage" | "send_heir_home" | "tighten" | "fold_in" | "merge", ...(b.dataset.level ? { level: b.dataset.level } : {}) })),
  );
  panel.querySelector<HTMLButtonElement>("[data-break-alliance]")?.addEventListener("click", () => void act({ type: "breakAlliance", target: r }));
  panel.querySelectorAll<HTMLButtonElement>("[data-demand]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "makeDemand", target: r, kind: b.dataset.demand!, ...(b.dataset.province ? { province: Number(b.dataset.province) } : {}) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-hire]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "hire", company: Number(b.dataset.hire) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-release]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "release", commander: Number(b.dataset.release) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-garrison]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.garrison);
      realmView = -1;
      selectedProvince = i;
      provinceTab = "garrison";
      view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, 4));
      restyleProvinces();
      renderPanel();
    }),
  );
  bindLords();
  panel.querySelectorAll<HTMLElement>("[data-open-build]").forEach((b) =>
    b.addEventListener("click", () => {
      goToProvince(Number(b.dataset.openBuild), false);
      provinceTab = "build";
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-heritage-counsel]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "heritageCounsel", ambition: b.dataset.heritageCounsel! })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-heritage-choice]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "heritageChoice", id: b.dataset.heritageChoice! })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-realm-open-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      realmTab = b.dataset.realmOpenTab as typeof realmTab;
      renderPanel();
    }),
  );
  // On a phone the tab row scrolls sideways: keep the open tab in view.
  const onTab = panel.querySelector<HTMLElement>(".tabs .tab.on");
  if (onTab) onTab.parentElement!.scrollLeft = onTab.offsetLeft - onTab.parentElement!.offsetLeft + onTab.offsetWidth / 2 - onTab.parentElement!.clientWidth / 2;
  panel.querySelectorAll<HTMLButtonElement>("[data-realm-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      realmTab = b.dataset.realmTab as typeof realmTab;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-reform-ask]").forEach((b) =>
    b.addEventListener("click", () => {
      governmentUi.confirm = b.dataset.reformAsk!;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-tongue-policy]").forEach((b) => b.addEventListener("click", () => void actInTreasury({ type: "tonguePolicy", policy: b.dataset.tonguePolicy! })));
  panel.querySelectorAll<HTMLButtonElement>("[data-faith-policy]").forEach((b) => b.addEventListener("click", () => void actInTreasury({ type: "faithPolicy", faith: b.dataset.faith!, policy: b.dataset.faithPolicy! })));
  panel.querySelectorAll<HTMLDetailsElement>("details[data-family]").forEach((d) =>
    d.addEventListener("toggle", () => {
      if (d.open) beliefUi.families.add(d.dataset.family!);
      else beliefUi.families.delete(d.dataset.family!);
    }),
  );
  panel.querySelector<HTMLButtonElement>("[data-reform-cancel]")?.addEventListener("click", () => {
    governmentUi.confirm = null;
    renderPanel();
  });
  panel.querySelector<HTMLButtonElement>("[data-reform]")?.addEventListener("click", (e) => {
    governmentUi.confirm = null;
    void act({ type: "reform", to: (e.currentTarget as HTMLButtonElement).dataset.reform! });
  });
  bindTrade();
  bindOffers();
  bindCommand();
  bindTax(-1);
  bindFood();
  bindLearning();
  panel.querySelector("[data-back]")?.addEventListener("click", () => {
    realmView = -1;
    renderPanel();
  });
  bindNationButtons();
}

// ---- trade: the Trade tab's buttons and the route drawn on the map (TRADE-141, TRADE-142) ----

/** The route bar along the bottom of the map, inside the safe areas. */
const routeBarEl = document.createElement("div");
routeBarEl.className = "route-bar framed";
routeBarEl.hidden = true;
app.append(routeBarEl);

function renderRouteBar(): void {
  // A trader lost while its route was drawn ends the drawing.
  if (routing && snapshot?.trade && !snapshot.trade.traders.some((t) => t.id === routing!.trader)) routing = null;
  routeBarEl.hidden = !routing;
  if (routing) routeBarEl.innerHTML = routeBar(routing, snapshot?.trade ?? null, (p) => provinces[p]!.name);
}

/** On a phone a card folds away so the map stays in view; on a desktop it stays beside the map. */
const foldOnPhone = () => !matchMedia("(min-width: 900px) and (min-height: 600px)").matches;

function bindTrade(): void {
  const id = (b: HTMLElement, key: string) => Number(b.dataset[key]);
  panel.querySelectorAll<HTMLButtonElement>("[data-trader-route]").forEach((b) => b.addEventListener("click", () => startRoute(id(b, "traderRoute"))));
  panel.querySelectorAll<HTMLButtonElement>("[data-trader-show]").forEach((b) => b.addEventListener("click", () => showTrader(id(b, "traderShow"))));
  panel.querySelectorAll<HTMLButtonElement>("[data-trader-ask]").forEach((b) =>
    b.addEventListener("click", () => {
      tradeUi.dismiss = id(b, "traderAsk");
      renderPanel();
    }),
  );
  panel.querySelector<HTMLButtonElement>("[data-trader-keep]")?.addEventListener("click", () => {
    tradeUi.dismiss = -1;
    renderPanel();
  });
  panel.querySelector<HTMLButtonElement>("[data-trader-dismiss]")?.addEventListener("click", (e) => {
    tradeUi.dismiss = -1;
    void act({ type: "dismissTrader", trader: id(e.currentTarget as HTMLElement, "traderDismiss") });
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-found-city]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "foundTrader", city: id(b, "foundCity"), kind: b.dataset.foundKind as Routing["kind"] })),
  );
  panel.querySelector<HTMLButtonElement>("[data-found-all]")?.addEventListener("click", () => {
    tradeUi.allCities = !tradeUi.allCities;
    renderPanel();
  });
}

/** Show on a trader card: the map centres on the trader, zoomed in to regional, under the trade lens. */
function showTrader(id: number): void {
  const t = snapshot?.trade?.traders.find((x) => x.id === id);
  if (!t) return;
  panelCollapsed = foldOnPhone();
  setLens("trade");
  view.lookAt(provinces[t.at]!.x!, provinces[t.at]!.y!, Math.max(view.camera.zoom, 3));
  renderPanel();
}

/** Route on a trader card: the card closes, the trade lens comes on and the route bar waits for taps on the map. */
function startRoute(id: number): void {
  const t = snapshot?.trade?.traders.find((x) => x.id === id);
  if (!t) return;
  routing = { trader: id, kind: t.kind, stops: [], mode: t.mode, note: null };
  realmView = -1;
  selectedProvince = -1;
  officialView = -1;
  lordView = -1;
  armyView = -1;
  newsView = false;
  selected.clear();
  lensMenu.hidden = true;
  armyListClosed = true;
  renderArmyList();
  setLens("trade");
  view.lookAt(provinces[t.home]!.x!, provinces[t.home]!.y!, Math.max(view.camera.zoom, 3));
  renderPanel();
  renderRouteBar();
  // An old draft, of this trader or another, is cleared.
  void sendDraft();
}

/** A tap on the map while a route is drawn: a trade stop is added, the last stop again confirms, anything else says why not. */
function routeTap(p: number): void {
  const r = routing!;
  if (p < 0 || !snapshot) return;
  const name = provinces[p]!.name;
  const ship = isShipKind(r.kind);
  if (!isKnown(p)) r.note = "you don't know that land yet";
  else if (isWater[p]) r.note = ship ? "tap a port, not the sea" : "tap a city, not the sea";
  else if (!(snapshot.provinceTradeCity[p]! & stopBit(r.kind))) r.note = ship ? `${name} has no harbour` : `${name} is not a city or a market town`;
  else if (r.stops.at(-1) === p) {
    if (r.stops.length >= 2) return void confirmRoute();
    r.note = "tap another city";
  } else if (r.stops.length >= 8) r.note = "a route has at most 8 stops";
  else {
    r.stops.push(p);
    r.note = null;
    sound.sfx("map_select_province");
    void sendDraft();
  }
  renderRouteBar();
  view.invalidate();
}

/** Sends the stops so far for the preview; a tap made while the engine was busy is sent once it is free. */
async function sendDraft(): Promise<void> {
  if (!routing) return;
  // The mode goes with the stops, so the preview is of what Confirm will set.
  const key = (r: Routing) => `${r.stops.join()}/${r.mode}`;
  const want = key(routing);
  await act({ type: "draftTradeRoute", trader: routing.trader, stops: routing.stops.slice(), mode: routing.mode });
  if (routing && key(routing) !== want && !acting) await act({ type: "draftTradeRoute", trader: routing.trader, stops: routing.stops.slice(), mode: routing.mode });
  renderRouteBar();
}

/** Leaves route mode; the realm card waits on the Trade tab, folded on a phone so the new loop stays in view. */
function leaveRoute(): void {
  routing = null;
  renderRouteBar();
  if (snapshot) {
    realmView = snapshot.playerNation;
    realmTab = "trade";
    panelCollapsed = foldOnPhone();
  }
  renderPanel();
  view.invalidate();
}

async function confirmRoute(): Promise<void> {
  const r = routing;
  if (!r || r.stops.length < 2 || acting) return;
  await act({ type: "setTradeRoute", trader: r.trader, stops: r.stops.slice(), mode: r.mode });
  const refused = snapshot?.rejectedOrders[0];
  if (refused) {
    r.note = refused.reason;
    renderRouteBar();
    return;
  }
  leaveRoute();
}

routeBarEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  const r = routing;
  if (!b || b.disabled || !r) return;
  if (b.dataset.routeMode) {
    r.mode = b.dataset.routeMode as Routing["mode"];
    renderRouteBar();
    if (r.stops.length) void sendDraft();
  } else if (b.dataset.routeUndo !== undefined) {
    r.stops.pop();
    r.note = null;
    renderRouteBar();
    view.invalidate();
    void sendDraft();
  } else if (b.dataset.routeCancel !== undefined) {
    void act({ type: "draftTradeRoute", trader: r.trader, stops: [] });
    leaveRoute();
  } else if (b.dataset.routeConfirm !== undefined) void confirmRoute();
});

/** The Learning tab's buttons: Tree or Schools, the boughs, tapping an invention, study, seats, students to arms, found a school; its folds and the tree's scroll stay as the player left them. */
function bindLearning(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-learn-part]").forEach((b) =>
    b.addEventListener("click", () => {
      learningUi.part = b.dataset.learnPart as typeof learningUi.part;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-bough]").forEach((b) =>
    b.addEventListener("click", () => {
      learningUi.bough = b.dataset.bough!;
      learningUi.pick = null;
      renderPanel();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.pick!;
      const fromSheet = !!b.closest(".pick-sheet");
      learningUi.pick = id;
      if (fromSheet) {
        // A need tapped in the sheet: show it in its own bough, scrolled into view.
        const bough = learningBough(snapshot!.research!, { ...learningUi, bough: "" });
        learningUi.bough = bough;
        const at = scrollFor(bough, id);
        if (at) learningUi.scroll.set(bough, at);
      }
      renderPanel();
      panel.querySelector(".pick-sheet")?.scrollIntoView({ block: "nearest" });
    }),
  );
  const treeView = panel.querySelector<HTMLElement>(".tree-view");
  if (treeView && snapshot?.research) {
    const bough = treeView.dataset.tree!;
    const at = learningUi.scroll.get(bough) ?? scrollFor(bough, learningUi.pick ?? firstOpen(snapshot.research, bough));
    if (at) {
      treeView.scrollLeft = at.left;
      treeView.scrollTop = at.top;
    }
    treeView.addEventListener("scroll", () => learningUi.scroll.set(bough, { left: treeView.scrollLeft, top: treeView.scrollTop }), { passive: true });
  }
  panel.querySelectorAll<HTMLButtonElement>("[data-study]").forEach((b) =>
    b.addEventListener("click", () => {
      learningUi.pick = null;
      void actInTreasury({ type: "setStudy", invention: b.dataset.study! });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-seats]").forEach((b) => b.addEventListener("click", () => void actInTreasury({ type: "setSeats", n: Number(b.dataset.seats) })));
  panel.querySelector<HTMLButtonElement>("[data-call-students]")?.addEventListener("click", () => {
    learningUi.open.delete("arms");
    void actInTreasury({ type: "callStudentsToArms" });
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-found-school]").forEach((b) =>
    b.addEventListener("click", () => {
      learningUi.open.delete("found");
      void actInTreasury({ type: "foundSchool", province: Number(b.dataset.foundSchool) });
    }),
  );
  panel.querySelectorAll<HTMLDetailsElement>("details[data-keep]").forEach((d) =>
    d.addEventListener("toggle", () => (d.open ? learningUi.open.add(d.dataset.keep!) : learningUi.open.delete(d.dataset.keep!))),
  );
}

function bindClose(): void {
  panel.querySelector(".close")!.addEventListener("click", () => {
    // Every view's state is cleared: renderPanel shows the first one still set.
    officialView = -1;
    lordView = -1;
    armyView = -1;
    fleetView = -1;
    sailing = -1;
    grantOpen = false;
    newsView = false;
    realmView = -1;
    achView = false;
    selectedProvince = -1;
    selected.clear();
    restyleProvinces();
    renderPanel();
  });
}

function bindNationButtons(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-nation]").forEach((b) => b.addEventListener("click", () => void startGame(b.dataset.nation!)));
}

// ---- first-campaign hints ----

/** Opens one of the player's provinces on a tab, as tapping it and the tab would. */
function openProvinceTab(i: number, tab: typeof provinceTab): void {
  officialView = -1;
  lordView = -1;
  realmView = -1;
  armyView = -1;
  fleetView = -1;
  newsView = false;
  selected.clear();
  selectedProvince = i;
  provinceTab = tab;
  panelCollapsed = false;
  view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, 4));
  restyleProvinces();
  renderPanel();
  renderArmyList();
}

/** The realm the player borders most, for the envoy hint's Show me. */
function nearestNeighbour(): number {
  const s = snapshot!;
  const count = new Map<number, number>();
  for (let p = 0; p < owners.length; p++) {
    if (owners[p] !== s.playerNation) continue;
    for (const q of neighborIdx[p]!) {
      const o = owners[q]!;
      if (o >= 0 && o !== s.playerNation) count.set(o, (count.get(o) ?? 0) + 1);
    }
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? s.relations.find((r) => r.nation !== s.playerNation)?.nation ?? -1;
}

/** Where each first-campaign hint points as the screen stands now (TUT-127): the button or card to tap, and Show me when it is not on screen. */
function hintTarget(h: Hint): HintTarget {
  const s = snapshot;
  const open = !panel.hidden;
  const capital = s ? provinceIndex.get(nations[s.playerNation]!.capital)! : -1;
  const provinceOpen = open && !!s && realmView < 0 && officialView < 0 && lordView < 0 && armyView < 0 && fleetView < 0 && !newsView && selectedProvince >= 0 && owners[selectedProvince] === s.playerNation;
  switch (h.id) {
    case "realm":
      if (s) return {};
      if (panelCollapsed) return { el: reopen };
      return {
        el: panel.querySelector(".play") ?? panel.querySelector(".nation"),
        show: () => {
          realmView = -1;
          selectedProvince = -1;
          renderPanel();
        },
      };
    case "move": {
      if (!s) return {};
      if (selected.size) return { line: "Now tap the land to march to: the army sets off at once." };
      if (!armyList.hidden) return { el: armyList.querySelector("[data-pick]") };
      const openList = () => {
        panelCollapsed = true;
        renderPanel();
        armyListClosed = false;
        lensMenu.hidden = true;
        soundMenu.hidden = true;
            armyButton.setAttribute("aria-expanded", "true");
        renderArmyList();
      };
      return { el: (open && panel.querySelector("[data-army]")) || armyButton, show: openList };
    }
    case "end_turn":
      return { el: fab };
    case "recruit":
    case "build": {
      if (!s || capital < 0) return {};
      const tab = h.id === "recruit" ? "garrison" : "build";
      const button = h.id === "recruit" ? "[data-recruit]" : "[data-build]";
      const show = () => openProvinceTab(provinceOpen ? selectedProvince : capital, tab);
      if (provinceOpen && provinceTab === tab) return { el: panel.querySelector(`${button}:not([disabled])`) ?? panel.querySelector(button), show };
      if (provinceOpen) return { el: panel.querySelector(`[data-tab="${tab}"]`), show };
      return { show };
    }
    case "envoy": {
      if (!s) return {};
      const show = () => {
        const n = realmView >= 0 && realmView !== s.playerNation ? realmView : nearestNeighbour();
        if (n < 0) return;
        realmView = n;
        realmTab = "diplomacy";
        officialView = -1;
        lordView = -1;
        newsView = false;
        panelCollapsed = false;
        renderPanel();
      };
      if (open && realmView >= 0 && realmView !== s.playerNation) return { el: realmTab === "diplomacy" ? panel.querySelector("[data-envoy]") : panel.querySelector('[data-realm-tab="diplomacy"]'), show };
      return { show };
    }
  }
  return {};
}

async function startGame(nation: string): Promise<void> {
  const name = nations[nationIndex.get(nation)!]!.name;
  showLoading(`Gathering the court of ${name}…`, 0.15);
  await painted();
  loadingStage(`Mustering the armies of ${name}…`, 0.6);
  const snap = await engine.send({ type: "newGame", seed: Date.now() >>> 0, playerNation: nation, ...(mapImage ? { map: mapTiles(mapImage) } : {}) });
  mapSent = true;
  // One new game is one campaign (SAVE-012).
  campaign = newCampaign(new Rng(Date.now() >>> 0), { playerNation: nation, nationName: name });
  enterGame(snap);
}

/** Puts a new or loaded game on screen, from a clean slate. */
function enterGame(snap: Snapshot): void {
  snapshot = null;
  takeSnapshot(snap, 0);
  const nation = nations[snap.playerNation]!.id;
  playClock = performance.now();
  changedSinceResume = false;
  clearTimeout(afterTurnTimer);
  savesOwedFrom = null;
  realmView = -1;
  officialView = -1;
  lordView = -1;
  armyView = -1;
  newsView = false;
  grantOpen = false;
  selected.clear();
  weekStart = snapshot!.date;
  dispatches = [];
  unread = 0;
  alerted.clear();
  alerts.replaceChildren();
  watching = null;
  renderBattleWatch();
  applySnapshot();
  const cap = provinceIndex.get(nations[nationIndex.get(nation)!]!.capital)!;
  factMem = newFactMemory(snapshot!.date.year);
  remember(factMem, snapshot!);
  heldBefore = provincesHeld();
  sound.startGame(playerPalette(rules.names?.nations[nation], lonOf(provinces[cap]!)), factsNow());
  selectedProvince = cap;
  panelCollapsed = true;
  view.lookAt(provinces[cap]!.x!, provinces[cap]!.y!, 4);
  restyleProvinces();
  renderHud();
  renderPanel();
  renderActions();
  hideLoading();
  askedStudy = -1;
  askForStudy(snapshot!);
  hints.did("realm chosen");
}

/** The map images as the engine takes them, so armies march over the map's own tiles. */
function mapTiles(image: MapImage): MapTiles {
  // A plain loop: Uint16Array.from with a map function takes a second over the map's 12 million tiles.
  const province = new Uint16Array(image.ids.length);
  for (let i = 0; i < province.length; i++) province[i] = image.ids[i]! + 1;
  return { width: image.width, height: image.height, province, terrain: image.terrain };
}

/** What the music director remembers of this campaign, and the player's provinces before the last step (for how a peace ended). */
let factMem: FactMemory | null = null;
let heldBefore = 0;
let ending: "gain" | "loss" | "white" | undefined;

function provincesHeld(): number {
  let n = 0;
  for (let p = 0; p < owners.length; p++) if (owners[p] === snapshot!.playerNation) n++;
  return n;
}

function factsNow() {
  const me = snapshot!.playerNation;
  return musicFacts(snapshot!, provinceIndex.get(nations[me]!.capital) ?? -1, factMem!);
}

/** The director's turn-end decision (AUD-042), with how the last war ended for its stinger. */
function musicDecides(): void {
  if (!snapshot || !factMem) return;
  sound.turnEnded(factsNow(), ending ? { peace: ending } : {});
  if (!playerWars(snapshot).length) ending = undefined;
}

/** Shots in the player's battle, by the century's arms (sound-effects §4.1). */
function shotSound(year: number): string {
  if (year < 1500) return "battle_shoot_bow";
  if (Math.random() < 0.25) return "battle_gun";
  return year < 1650 ? "battle_shoot_matchlock" : "battle_shoot_volley";
}

/**
 * The sounds of a fresh snapshot's news for the player (AUD-103 bindings): one
 * stinger at most, the most telling, and each effect once.
 */
function hearSnapshot(): void {
  const s = snapshot!;
  const me = s.playerNation;
  if (factMem) remember(factMem, s);
  const held = provincesHeld();
  const effects = new Set<string>();
  let stinger: string | null = null;
  const rank = ["war_declared", "battle_lost", "battle_won"];
  const sting = (id: string) => (stinger = stinger === null || rank.indexOf(id) < rank.indexOf(stinger) ? id : stinger);
  if (s.rejectedOrders.length) effects.add("ui_error");
  for (const x of s.news) {
    if (!x.nations.includes(me)) continue;
    if (x.kind === "war") sting("war_declared");
    else if (x.kind === "battle") {
      // A battle's end names the winner first.
      if (x.text.includes(" beat ")) sting(x.nations[0] === me ? "battle_won" : "battle_lost");
      else effects.add("battle_start");
    } else if (x.kind === "siege" && x.text.includes("lays siege")) effects.add("siege_begin");
    else if (x.kind === "occupied") effects.add("siege_fall");
    else if (x.kind === "freed") effects.add("ui_confirm");
    else if (x.kind === "famine") effects.add("realm_famine");
    else if (x.kind === "unrest") effects.add("realm_unrest");
    else if (x.kind === "raised") effects.add("army_levy_call");
    else if (x.kind === "built" && x.nations.includes(snapshot!.playerNation)) effects.add("econ_build_done");
    else if (x.kind === "peace" && /^(White peace|Peace between)/.test(x.text)) ending = held > heldBefore ? "gain" : held < heldBefore ? "loss" : "white";
  }
  heldBefore = held;
  if (stinger) sound.stinger(stinger);
  // A stinger marks its moment; effects only lead in to it (AUD-090).
  for (const id of effects) if (!stinger || !id.startsWith("battle_")) sound.sfx(id);
}

/**
 * End turn: the week plays a day at a time, and a 4-hour step at a time while
 * the player's men fight, so marches, battles and sieges are seen as they go
 * (TIME-076). Ending the turn again while it plays pauses it, and again goes on.
 */
async function endTurn(): Promise<void> {
  if (!snapshot) return;
  // While an event waits, End turn opens it instead (EVT-044, SHELL-070).
  if (snapshot.events.length) {
    openEventCard();
    return;
  }
  // So does a revolution waiting on the player's stance (REVO-091).
  if (snapshot.revolution?.outbreak) {
    renderRevolutionCard();
    return;
  }
  if (playing) {
    paused = !paused;
    if (!paused) resume?.();
    renderActions();
    return;
  }
  playing = true;
  paused = false;
  // Saves still waiting for a quiet moment wait for the end of this week instead.
  clearTimeout(afterTurnTimer);
  selected.clear();
  sound.sfx("turn_end");
  hints.did("turn ended");
  if (factMem) factMem.battleThisTurn = false;
  renderActions();
  const turn = snapshot.turn;
  while (snapshot.turn === turn) {
    if (paused) {
      await new Promise<void>((r) => (resume = r));
      continue;
    }
    const battle = snapshot.battles.some((b) => b.player);
    const ms = battle ? (watching && !watching.result ? (WATCH_STEP_MS * battleStepMs()) / BATTLE_STEP_MS : battleStepMs()) : dayMs();
    const t0 = performance.now();
    // The steps run in the engine worker; the map stays live meanwhile.
    performance.mark("turn-sent");
    const next = await engine.send({ type: "advance", steps: battle ? 1 : STEPS_PER_DAY - snapshot.hour / (24 / STEPS_PER_DAY) });
    performance.mark("turn-arrived");
    takeSnapshot(next, ms);
    applySnapshot();
    hearSnapshot();
    if (battle) sound.sfx(shotSound(next.date.year), 0.7);
    logNews(next);
    restyleProvinces();
    renderHud();
    if (!panel.hidden) renderPanel();
    renderActions();
    // Budgets in docs/performance.md, checked by scripts/perf.mjs: each step's answer, and taking it in.
    performance.measure("turn-wait", "turn-sent", "turn-arrived");
    performance.measure("turn-apply", "turn-arrived");
    await new Promise((r) => setTimeout(r, Math.max(0, ms - (performance.now() - t0))));
  }
  playing = false;
  paused = false;
  sound.sfx(weekStart && snapshot.date.year > weekStart.year ? "turn_month_new_year" : "turn_ready");
  const began = weekStart;
  weekStart = snapshot.date;
  // The saves wait for a quiet moment, so pressing End turn again never waits on them.
  savesOwedFrom ??= began;
  afterTurnTimer = window.setTimeout(() => {
    afterTurnTimer = 0;
    const from = savesOwedFrom;
    savesOwedFrom = null;
    void savesAfterTurn(from);
  }, SAVE_DELAY_MS);
  musicDecides();
  restyleProvinces();
  renderHud();
  renderPanel();
  renderActions();
  renderDiagnostics();
}

function renderDiagnostics(): void {
  const el = document.querySelector("#diag");
  if (el) el.innerHTML = diagnosticsLine();
}

function diagnosticsLine(): string {
  const d = diagnostics;
  const engineLine = d.engineError
    ? `engine failed: ${esc(d.engineError)}`
    : d.engineRoundTripMs === null
      ? "engine starting…"
      : d.engineMode === "worker"
        ? `engine in background worker`
        : `engine on main thread`;
  return `${d.runtime} · ${engineLine}${snapshot ? ` · last turn ${snapshot.computeMs.toFixed(1)} ms` : ""}`;
}

// Prove a worker loads and runs a turn in this runtime, using a throwaway
// worker so it can't touch the player's game.
async function selfTest(): Promise<void> {
  const probe = new EngineClient({ forceMainThread });
  const t0 = performance.now();
  try {
    await probe.send({ type: "newGame", seed: 1, playerNation: nations[0]!.id });
    await probe.send({ type: "endTurn", orders: [] });
    diagnostics.engineRoundTripMs = performance.now() - t0;
  } catch (e) {
    diagnostics.engineError = e instanceof Error ? e.message : String(e);
  }
  diagnostics.engineMode = probe.mode;
  probe.terminate();
  renderDiagnostics();
}


// ---- saves, the game menu and Settings (domain/saves, domain/settings "How the player uses it") ----
const saveStore = new SaveStore();
const overlay = document.querySelector<HTMLElement>("#overlay")!;
const toast = document.querySelector<HTMLElement>("#toast")!;
const runtimeNow = detectRuntime();
const savePlatform: SavePlatform = runtimeNow === "capacitor-ios" ? "ios" : runtimeNow === "capacitor-android" ? "android" : runtimeNow === "electron" ? "desktop" : "web";
/** The device's name as saves carry it (Continue says "from …" for another device's save). */
const DEVICE = { ios: "iPhone", android: "Android", desktop: "Desktop", web: "Browser" }[savePlatform];
const GAME_VERSION = "0.1.0";
const SM = savesConfig.messages;

type ShellView = "menu" | "save" | "load" | "settings";
/** What the overlay shows, where it was opened from, and the card's own open line or question. */
const shell: { view: ShellView | null; fromStart: boolean; open: string; confirm: string; busy: boolean; note: string; name: string } = { view: null, fromStart: false, open: "", confirm: "", busy: false, note: "", name: "" };

const nationNameOf = (id: string) => nations[nationIndex.get(id) ?? -1]?.name ?? id;
const flagOfId = (id: string) => nations[nationIndex.get(id) ?? -1];

/** Weeks played since the campaign's newest save or autosave, for "Leave … unsaved?" (SHELL-040). */
function unsavedWeeks(): number {
  if (!snapshot || !campaign) return 0;
  const last = savesList.find((e) => e.header.campaignId === campaign!.campaignId && (e.header.kind === "manual" || e.header.kind === "autosave"));
  return Math.max(0, snapshot.turn - (last?.header.turn ?? 0));
}

async function refreshSaves(): Promise<void> {
  savesList = await saveStore.list();
}

/** The start screen's Continue, Load and Settings (SAVE-105, SAVE-014). */
function startActions(): string {
  const cont = continueTarget(savesList, DEVICE, nationNameOf);
  return `<div class="start-actions">
    ${cont ? `<button class="wax continue" data-continue="${esc(cont.entry.path)}">${icon("hourglass", 2)}<span>${esc(cont.label)}</span></button>` : ""}
    <span class="start-row">
      <button class="paper" data-shell="load"${savesList.length ? "" : " disabled"}>${icon("scroll", 1)} Load</button>
      <button class="paper" data-shell="settings">${icon("cog", 1)} Settings</button>
    </span>
  </div>`;
}

/** Seconds played in this campaign so far, counted while the page is shown. */
function playSeconds(): number {
  if (!campaign) return 0;
  const now = performance.now();
  if (document.visibilityState === "visible") campaign.playSeconds += Math.round((now - playClock) / 1000);
  playClock = now;
  return campaign.playSeconds;
}

let saving: Promise<unknown> = Promise.resolve();

/**
 * Writes a save of the game as it stands (a turn boundary, SAVE-001): the
 * engine worker makes the bytes and says what they replace, and the store
 * keeps them in one transaction. Saves run one after another.
 */
function writeGameSave(kind: "manual" | "autosave" | "resume", opts: { name?: string; replace?: string } = {}): Promise<StoredSave | { error: string }> {
  const run = async (): Promise<StoredSave | { error: string }> => {
    if (!campaign || !snapshot) return { error: "No campaign is being played." };
    const c = { ...campaign, playSeconds: playSeconds() };
    const listing = (await saveStore.list()).filter((e) => e.header.campaignId === c.campaignId && e.header.kind === kind).map((e) => ({ path: e.path, head: e.head }));
    const r = await engine.request({ type: "save", kind, campaign: c, listing, device: DEVICE, platform: savePlatform, gameVersion: GAME_VERSION, now: Date.now(), ...(kind === "autosave" ? { keep: autosavesKept() } : {}), ...opts });
    if (r.type !== "saved") return { error: "The game could not be saved." };
    try {
      const entry = await saveStore.commit(r.path, r.bytes, r.removed);
      await refreshSaves();
      if (kind === "resume") changedSinceResume = false;
      return entry;
    } catch (e) {
      // The old saves stay as they were (SAVE-023).
      if (e instanceof DOMException && e.name === "QuotaExceededError") return { error: SM.no_space };
      throw e;
    }
  };
  const p = saving.then(run, run);
  saving = p.catch(() => {});
  return p;
}

/** How long after the week has played its saves are written, unless another week starts first. */
const SAVE_DELAY_MS = 1500;
let afterTurnTimer = 0;
/** The start of the first week whose saves are still owed, so an autosave due in a skipped moment is still written. */
let savesOwedFrom: GameDate | null = null;

/** After End turn: the autosave when a month on the interval began (SAVE-008), then the Resume save (SAVE-007). */
async function savesAfterTurn(began: GameDate | null): Promise<void> {
  if (!snapshot || !campaign) return;
  const d = snapshot.date;
  const monthBegins = began && (began.month !== d.month || began.year !== d.year) ? d.month : null;
  if (autosaveDue(autosaveEvery(), monthBegins, campaign.ironman)) await writeGameSave("autosave", { name: `Auto · ${longDate({ y: d.year, m: d.month })}` });
  await writeGameSave("resume");
}

// The Resume save follows the app being put away, when orders were given since (SAVE-007).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") playClock = performance.now();
  // The time played up to now counts before the app is put away.
  else if (campaign) campaign.playSeconds += Math.round((performance.now() - playClock) / 1000);
  if (document.visibilityState !== "hidden" || !campaign || !snapshot || playing) return;
  if (savesOwedFrom) {
    clearTimeout(afterTurnTimer);
    const from = savesOwedFrom;
    savesOwedFrom = null;
    void savesAfterTurn(from);
  } else if (changedSinceResume) void writeGameSave("resume");
});

function sayDone(text: string): void {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(setTimeout(() => (toast.hidden = true), 2000));
}

function openShell(view: ShellView, fromStart = !snapshot): void {
  shell.view = view;
  shell.fromStart = fromStart;
  shell.open = "";
  shell.confirm = "";
  shell.note = "";
  if (view === "save" && snapshot && campaign) shell.name = `${campaign.nationName}, ${longDate({ y: snapshot.date.year, m: snapshot.date.month })}`;
  lensMenu.hidden = true;
  soundMenu.hidden = true;
  renderShell();
}

function closeShell(): void {
  shell.view = null;
  overlay.hidden = true;
  overlay.replaceChildren();
  if (!snapshot) renderPanel();
}

/** Back from a card goes to the game menu it was opened from, or closes (SHELL-067). */
function backFromCard(): void {
  if (shell.fromStart || !snapshot) closeShell();
  else openShell("menu", false);
}

function renderShell(): void {
  if (!shell.view) return;
  overlay.hidden = false;
  if (shell.view === "settings") {
    renderSettings(overlay, backFromCard);
    return;
  }
  overlay.innerHTML = shell.view === "menu" ? gameMenuHtml() : shell.view === "save" ? saveCardHtml() : loadCardHtml();
  overlay.querySelector(".close")?.addEventListener("click", shell.view === "menu" ? closeShell : backFromCard);
  if (shell.view === "save") bindSaveCard();
  if (shell.view === "load") bindLoadCard();
}

const back = () => `<span class="panel-buttons"><button class="close" aria-label="${shell.fromStart || shell.view === "menu" ? "Close" : "Back to the game menu"}">${icon("close", 2)}</button></span>`;

/** The game menu (SHELL-064, SHELL-065, SAVE-105). */
function gameMenuHtml(): string {
  const s = snapshot!;
  const n = nations[s.playerNation]!;
  return `<div class="shell-card game-menu framed" role="dialog" aria-label="Game menu">
    <header><h2 class="ribbon">${pennant(n)} ${esc(n.name)}</h2>${back()}</header>
    <p class="menu-date">${dateText(s.date)} · week ${s.turn + 1}${unsavedWeeks() ? ` · ${unsavedWeeks()} week${unsavedWeeks() > 1 ? "s" : ""} since your last save` : ""}</p>
    <div class="menu-list">
      <button class="wax" data-shell="map">${icon("map", 2)} Return to the map</button>
      <button class="paper" data-shell="save">${icon("scroll", 2)} Save</button>
      <button class="paper" data-shell="load">${icon("scroll", 2)} Load</button>
      <button class="paper" data-shell="settings">${icon("cog", 2)} Settings</button>
      <button class="paper" data-shell="exit">${icon("castle", 2)} Exit to main menu</button>
    </div>
  </div>`;
}

const savedAgo = (ms: number) => {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** One save as a line: its map crop, banner, name, in-game date and when it was saved. */
function saveLine(e: StoredSave, mark = ""): string {
  const h = e.header;
  const n = flagOfId(h.playerNation);
  return `<span class="save-thumb"><img src="data:image/png;base64,${h.thumbnail}" alt=""></span>
    <span class="save-text"><b>${n ? pennant(n, 1) : ""}${esc(h.name)}</b><small>${mark ? `<em class="mark">${esc(mark)}</em> · ` : ""}${esc(nationNameOf(h.playerNation))} · ${esc(longDate(h.date))} · saved ${esc(savedAgo(h.savedAt))}</small></span>`;
}

/** The Save card (SAVE-106). */
function saveCardHtml(): string {
  const mine = savesList.filter((e) => campaign && e.header.campaignId === campaign.campaignId && e.header.kind === "manual");
  const answer = campaign && snapshot ? newManualSave(savesList, campaign, { y: snapshot.date.year, m: snapshot.date.month }) : { action: "not allowed" as const };
  const full = answer.action === "choose a save to replace";
  const max = savesConfig.kinds.manual.max_per_campaign;
  return `<div class="shell-card saves framed" role="dialog" aria-label="Save">
    <header><h2 class="ribbon">Save</h2>${back()}</header>
    ${playing ? `<p class="hint">Saving waits until the week has played.</p>` : ""}
    ${shell.note ? `<p class="note">${esc(shell.note)}</p>` : ""}
    ${
      full
        ? `<p class="hint">Every save slot is used: pick a save below to replace.</p>`
        : `<form class="new-save"><label><span>${esc(SM.new_save)}</span><input name="name" maxlength="60" value="${esc(shell.name)}" aria-label="Name of the save" autocomplete="off"></label><button class="wax" type="submit"${playing || shell.busy ? " disabled" : ""}>Save</button></form>`
    }
    <h3 class="sub">This campaign's saves · ${mine.length} of ${max}</h3>
    ${mine.length ? "" : `<p class="hint">None yet. Autosaves and where you left off are kept too, under Load.</p>`}
    <ul class="save-list">${mine
      .map(
        (e) => `<li class="save-row">${saveLine(e)}<span class="save-act">${
          shell.confirm === e.path
            ? `<b>${esc(SM.replace)}</b><button class="wax" data-replace="${esc(e.path)}"${playing || shell.busy ? " disabled" : ""}>Yes</button><button class="paper" data-cancel>No</button>`
            : `<button class="paper" data-ask-replace="${esc(e.path)}"${playing || shell.busy ? " disabled" : ""}>Save over</button>`
        }</span></li>`,
      )
      .join("")}</ul>
  </div>`;
}

function bindSaveCard(): void {
  const form = overlay.querySelector<HTMLFormElement>(".new-save");
  const input = form?.querySelector<HTMLInputElement>("input");
  input?.addEventListener("input", () => (shell.name = input.value));
  const save = async (replace?: string) => {
    shell.busy = true;
    renderShell();
    const name = shell.name.trim() || undefined;
    const r = await writeGameSave("manual", { ...(name ? { name } : {}), ...(replace ? { replace } : {}) });
    shell.busy = false;
    shell.confirm = "";
    if ("error" in r) {
      shell.note = r.error;
      renderShell();
      return;
    }
    // "Saved." over the map, never a dialog (SAVE-022).
    closeShell();
    sayDone(SM.saved);
  };
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void save();
  });
  overlay.querySelectorAll<HTMLButtonElement>("[data-ask-replace]").forEach((b) =>
    b.addEventListener("click", () => {
      shell.confirm = b.dataset.askReplace!;
      renderShell();
    }),
  );
  overlay.querySelectorAll<HTMLButtonElement>("[data-replace]").forEach((b) => b.addEventListener("click", () => void save(b.dataset.replace!)));
  overlay.querySelector("[data-cancel]")?.addEventListener("click", () => {
    shell.confirm = "";
    renderShell();
  });
}

/** The Load card's lines: each campaign's Resume save first, then every other save, newest first (SAVE-107, D-SAVE-17). */
function loadLines(): { entry: StoredSave; mark: string }[] {
  const seen = new Set<string>();
  const resumes: StoredSave[] = [];
  for (const e of savesList) {
    if (e.header.kind !== "resume" || seen.has(e.header.campaignId)) continue;
    seen.add(e.header.campaignId);
    resumes.push(e);
  }
  return [...resumes.map((entry) => ({ entry, mark: "Where you left off" })), ...savesList.filter((e) => e.header.kind === "manual" || e.header.kind === "autosave").map((entry) => ({ entry, mark: entry.header.kind === "autosave" ? "Auto" : "" }))];
}

/** The Load card (SAVE-107). */
function loadCardHtml(): string {
  const lines = loadLines();
  return `<div class="shell-card saves framed" role="dialog" aria-label="Load">
    <header><h2 class="ribbon">Load</h2>${back()}</header>
    ${shell.note ? `<p class="note">${esc(shell.note)}</p>` : ""}
    ${lines.length ? "" : `<p class="hint">No saves yet. The game keeps where you left off after every week.</p>`}
    <ul class="save-list">${lines
      .map(({ entry: e, mark }) => {
        const open = shell.open === e.path;
        const acts = !open
          ? ""
          : shell.confirm === `delete ${e.path}`
            ? `<span class="save-act"><b>Delete this save?</b><button class="wax" data-delete="${esc(e.path)}">Delete</button><button class="paper" data-cancel>Keep</button></span>`
            : shell.confirm === `leave ${e.path}`
              ? `<span class="save-act ask"><b>Leave ${esc(snapshot ? dateText(snapshot.date) : "")} unsaved?</b><button class="wax" data-save-first="${esc(e.path)}">Save first</button><button class="paper" data-leave="${esc(e.path)}">Leave</button><button class="paper" data-cancel>Cancel</button></span>`
              : shell.confirm === `modified ${e.path}`
                ? `<span class="save-act ask"><b>This save does not match its check and may have been edited.</b><button class="wax" data-accept="${esc(e.path)}">Open anyway</button><button class="paper" data-cancel>Cancel</button></span>`
                : `<span class="save-act"><button class="wax" data-load="${esc(e.path)}"${shell.busy ? " disabled" : ""}>Load</button>${e.header.kind === "resume" ? "" : `<button class="paper" data-ask-delete="${esc(e.path)}">Delete</button>`}</span>`;
        return `<li class="save-row${open ? " open" : ""}"><button class="save-pick" data-pick="${esc(e.path)}" aria-expanded="${open}">${saveLine(e, mark)}</button>${acts}</li>`;
      })
      .join("")}</ul>
  </div>`;
}

function bindLoadCard(): void {
  const on = (sel: string, fn: (path: string) => void) => overlay.querySelectorAll<HTMLButtonElement>(sel).forEach((b) => b.addEventListener("click", () => fn(Object.values(b.dataset)[0]!)));
  on("[data-pick]", (path) => {
    shell.open = shell.open === path ? "" : path;
    shell.confirm = "";
    renderShell();
  });
  on("[data-ask-delete]", (path) => {
    shell.confirm = `delete ${path}`;
    renderShell();
  });
  on("[data-delete]", (path) => {
    void saveStore.remove(path).then(async () => {
      await refreshSaves();
      shell.open = "";
      shell.confirm = "";
      renderShell();
    });
  });
  on("[data-load]", (path) => {
    const e = savesList.find((x) => x.path === path);
    // Going back within this campaign leaves the weeks since the last save behind (SHELL-040).
    if (snapshot && campaign && e && e.header.campaignId === campaign.campaignId && unsavedWeeks() > 0 && e.header.kind !== "resume") {
      shell.confirm = `leave ${path}`;
      renderShell();
      return;
    }
    void loadSave(path);
  });
  on("[data-leave]", (path) => void loadSave(path, false, false));
  on("[data-save-first]", (path) =>
    void writeGameSave("manual").then((r) => {
      if ("error" in r) {
        shell.note = r.error;
        renderShell();
      } else void loadSave(path, false, false);
    }),
  );
  on("[data-accept]", (path) => void loadSave(path, true));
  overlay.querySelector("[data-cancel]")?.addEventListener("click", () => {
    shell.confirm = "";
    renderShell();
  });
}

/**
 * Opens a save (SHELL-039): the campaign being played keeps where it was left
 * first; the engine checks and opens the file and the map shows it.
 */
async function loadSave(path: string, acceptModified = false, keepCurrent = true): Promise<void> {
  const bytes = await saveStore.read(path);
  const e = savesList.find((x) => x.path === path);
  if (!bytes || !e) {
    shell.note = "This save is damaged.";
    renderShell();
    return;
  }
  if (keepCurrent && campaign && snapshot && changedSinceResume) await writeGameSave("resume");
  shell.busy = true;
  showLoading(`Opening ${e.header.name}…`, 0.2);
  await painted();
  loadingStage(`Waking the court of ${nationNameOf(e.header.playerNation)}…`, 0.6);
  const r = await engine.request({ type: "load", bytes, ...(acceptModified ? { acceptModified: true } : {}), ...(!mapSent && mapImage ? { map: mapTiles(mapImage) } : {}) });
  shell.busy = false;
  if (r.type !== "snapshot") {
    hideLoading();
    shell.note = r.type === "refused" && r.canAccept ? "" : r.type === "refused" || r.type === "error" ? r.message : "The save did not open.";
    shell.confirm = r.type === "refused" && r.canAccept ? `modified ${path}` : "";
    renderShell();
    return;
  }
  mapSent = true;
  const h = e.header;
  campaign = { campaignId: h.campaignId, playerNation: h.playerNation, nationName: nationNameOf(h.playerNation), ironman: h.ironman, options: h.options, modified: h.modified || acceptModified, playSeconds: h.playSeconds };
  closeShell();
  enterGame(r.snapshot);
  // Loading an earlier point makes it where the player left off.
  if (h.kind !== "resume") void writeGameSave("resume");
}

/** Exit to main menu: where the player left off is kept, and the start screen offers Continue (SAVE-109). */
async function exitToMenu(): Promise<void> {
  if (playing) return;
  showLoading("Keeping your place…", 0.5);
  await painted();
  await writeGameSave("resume");
  location.reload();
}

document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-shell]");
  if (!b || (b as HTMLButtonElement).disabled) return;
  const v = b.dataset.shell!;
  if (v === "map") closeShell();
  else if (v === "exit") void exitToMenu();
  else {
    if (v === "settings" && b.dataset.settingsSection) openSettingsAt(b.dataset.settingsSection);
    openShell(v as ShellView, shell.view === null ? !snapshot : shell.fromStart);
  }
});
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-continue]");
  if (!b) return;
  void loadSave(b.dataset.continue!, false, false);
});
// Esc opens the game menu, and closes whatever the overlay shows (SHELL-064).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || (e.target as HTMLElement).closest("input, textarea, select")) return;
  if (shell.view) {
    if (shell.view === "menu") closeShell();
    else backFromCard();
  } else if (snapshot) openShell("menu", false);
});
// Tapping the dimmed map beside a card closes it.
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) (shell.view === "menu" ? closeShell : backFromCard)();
});

/** Settings apply at once (SET-003): text size, the map's battery knobs, and the cards that show them. */
function applyPrefs(): void {
  document.documentElement.style.setProperty("--text-zoom", String(textZoom()));
  view?.setPower(mapPower());
  if (!soundMenu.hidden) renderSoundMenu();
  renderSoundButton();
}
onPrefs(applyPrefs);
applyPrefs();
void refreshSaves().then(() => {
  if (!snapshot) renderPanel();
});

// Hooks for the scripted play-throughs (scripts/war-shots.mjs).
Object.assign(globalThis, {
  __phNation: (id: string) => nationIndex.get(id),
  __phTurn: () => snapshot?.turn ?? -1,
  /** The player's ports and fleets, and an order for the navy (scripts/navy-shots.mjs). */
  __phNavy: () => snapshot?.navy ?? null,
  __phNavyOrder: (o: Record<string, unknown>) => act({ type: "navy", ...o } as Order).then(() => snapshot?.rejectedOrders.map((r) => r.reason) ?? []),
  /** The player's charts, governors and colonies (scripts/explore-shots.mjs). */
  __phExploration: () => (snapshot ? { ...snapshot.exploration, charted: undefined, sites: undefined, coastDist: undefined, ocean: undefined } : null),
  /** The exploration cards' builders, to show states a short play-through can't reach (a governor aboard, a colony growing). */
  __phExploreUi: { colonySection, colonyCard, coloniesTab },
  /** A sea zone k zones out from port p that a fleet with this ocean reach may enter, the farthest found first. */
  __phSeaOut: (p: number, k: number, reach = -1) => {
    const ex = snapshot!.exploration;
    const may = (q: number) => isWater[q] && (!ex.ocean[q] || reach === 255 || (reach >= 0 && ex.coastDist[q]! <= reach));
    const dist = new Map<number, number>([[p, 0]]);
    const queue = [p];
    let best = -1;
    for (let i = 0; i < queue.length; i++) {
      const x = queue[i]!;
      if (dist.get(x)! >= k) continue;
      for (const q of neighborIdx[x]!) if (!dist.has(q) && may(q)) (dist.set(q, dist.get(x)! + 1), queue.push(q), (best = q));
    }
    return best;
  },
  /** Commissions the first official of the player's who serves the crown (not a lord) as a commander. */
  __phCommission: async () => {
    if (!snapshot) return null;
    const me = snapshot.playerNation;
    const p = provinces.findIndex((_, i) => owners[i] === me && snapshot!.provinceLord[i]! < 0 && officialOf(snapshot!, i, me) && i !== provinceIndex.get(nations[me]!.capital));
    if (p < 0) return null;
    await act({ type: "commission", province: p });
    return snapshot.rejectedOrders.map((r) => r.reason);
  },
  /** A coastal sea zone two zones out from a port. */
  __phSeaNear: (p: number) => {
    const first = neighborIdx[p]!.find((q) => isWater[q]);
    return first === undefined ? -1 : (neighborIdx[first]!.find((q) => isWater[q] && !neighborIdx[q]!.includes(p)) ?? first);
  },
  /** Province index by id, and its map point. */
  __phProvince: (id: string) => provinceIndex.get(id),
  __phPoint: (p: number) => [provinces[p]!.x!, provinces[p]!.y!],
  /** Id of the player's capital province. */
  __phCapital: () => (snapshot ? nations[snapshot.playerNation]!.capital : null),
  /** Opens a province's card by id. */
  __phOpenProvince: (id: string) => {
    const i = provinceIndex.get(id);
    if (i !== undefined) goToProvince(i, false);
    return i;
  },
  /** Sends every army of the player with a commander toward a realm's capital, unless it is already on its way. */
  __phMarchOn: async (id: string) => {
    if (!snapshot) return;
    const to = provinceIndex.get(nations[nationIndex.get(id)!]!.capital)!;
    const idle = [...snapshot.armies.id.keys()].filter((k) => {
      const a = snapshot!.armies;
      return a.owner[k] === snapshot!.playerNation && a.commander[k]! >= 0 && a.route[k]!.at(-1) !== to && a.location[k] !== to;
    });
    for (const army of idle.map((k) => snapshot!.armies.id[k]!)) await act({ type: "move", army, to });
  },
  /** Sends one of the player's envoys to a realm by id, on a mission (ENVOY_ACTIONS). */
  __phEnvoy: (id: string, action = "courtesy_visit") => act({ type: "sendEnvoy", target: nationIndex.get(id)!, action }),
  /** Id of the province the player's first army with a commander stands in. */
  __phArmyProvince: () => {
    if (!snapshot) return null;
    const mine = [...snapshot.armies.id.keys()].filter((j) => snapshot!.armies.owner[j] === snapshot!.playerNation);
    const k = mine.find((j) => snapshot!.armies.commander[j]! >= 0) ?? mine[0];
    return k === undefined ? null : provinces[snapshot.armies.location[k]!]!.id;
  },
  /** Where a province's centre is on screen, by id (CSS pixels in the map). */
  __phScreenOf: (id: string) => {
    const p = provinces[provinceIndex.get(id)!]!;
    return view.toScreen(p.x!, p.y!);
  },
  /** The player's busiest trade cities by id, and the provinces of its first trader's loop. */
  __phTradeCities: () => (snapshot?.trade ? snapshot.trade.centres.map((c) => provinces[c.province]!.id) : []),
  __phTraderPath: () => (snapshot?.trade?.traders[0]?.path ?? []).map((p) => provinces[p]!.id),
  /** Centres the map on a province by id, at a zoom. */
  __phLookAt: (id: string, zoom: number) => {
    const p = provinces[provinceIndex.get(id)!]!;
    view.lookAt(p.x!, p.y!, zoom);
  },
  /** Opens a province's overview by id. */
  __phSelect: (id: string) => {
    selected.clear();
    selectedProvince = provinceIndex.get(id)!;
    provinceTab = "overview";
    armyView = -1;
    realmView = -1;
    newsView = false;
    panelCollapsed = false;
    renderPanel();
  },
  /** Sends the player's first army with a commander to a province by id. */
  __phMoveTo: async (id: string) => {
    if (!snapshot) return;
    const k = [...snapshot.armies.id.keys()].find((j) => snapshot!.armies.owner[j] === snapshot!.playerNation && snapshot!.armies.commander[j]! >= 0);
    if (k !== undefined) await act({ type: "move", army: snapshot.armies.id[k]!, to: provinceIndex.get(id)! });
  },
  /** Sends every army of the player with a commander onto the first army of a realm, to bring on a battle. */
  __phAttack: async (id: string) => {
    if (!snapshot) return;
    const a = snapshot.armies;
    const foe = [...a.id.keys()].find((j) => a.owner[j] === nationIndex.get(id));
    if (foe === undefined) return;
    const mine = [...a.id.keys()].filter((j) => a.owner[j] === snapshot!.playerNation && a.commander[j]! >= 0);
    for (const k of mine) await act({ type: "move", army: a.id[k]!, to: a.location[foe]! });
  },
  /** Centres the map on the player's first army with a commander, at a zoom, and selects it. */
  __phLookAtArmy: (zoom = 6) => {
    if (!snapshot) return;
    const k = [...snapshot.armies.id.keys()].find((j) => snapshot!.armies.owner[j] === snapshot!.playerNation && snapshot!.armies.commander[j]! >= 0);
    if (k === undefined) return;
    selected.clear();
    selected.add(snapshot.armies.id[k]!);
    view.lookAt(...armyPosition(k), zoom);
  },
  /** Centres the map on the first battle, if any. */
  __phLookAtBattle: (zoom = 8) => {
    const b = snapshot?.battles[0];
    if (b) view.lookAt(...tileXY(b.tile), zoom);
    return !!b;
  },
  /** Centres the map on the first siege and returns its province's id, or null. */
  __phLookAtSiege: () => {
    const st = snapshot?.sieges[0];
    if (!st) return null;
    const p = provinces[st.province]!;
    view.lookAt(p.x!, p.y!, 8);
    return p.id;
  },
  __phLookAtWar: () => {
    const p = snapshot?.sieges[0]?.province ?? occupiers.findIndex((o) => o >= 0);
    if (p >= 0) view.lookAt(provinces[p]!.x!, provinces[p]!.y!, 4);
  },
});

renderDiagnostics();
void selfTest();
boot().catch((e) => {
  hideLoading();
  app.innerHTML = `<p class="fatal">Could not draw the map: ${esc(e instanceof Error ? e.message : String(e))}</p>`;
});
