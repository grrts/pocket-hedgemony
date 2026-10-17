import {
  addDays,
  DAYS_PER_TURN,
  forageLimit,
  groundOf,
  placeClimate,
  provinceClimate,
  seasonName,
  STEPS_PER_DAY,
  type MapTiles,
  type MarchMap,
  type News,
  type Order,
  type PeaceTerms,
  type PlaceClimate,
  type Snapshot,
} from "@ph/engine";
import type { GameDate } from "@ph/rules";
import { loadDefaultRuleset } from "@ph/rules";
import { hexToRgb, PALETTE, TERRAINS } from "./art/palette.ts";
import { sprite, spriteUrl } from "./art/sprites.ts";
import { icon, installUiArt, flagUrl } from "./art/ui.ts";
import { EngineClient } from "./engineClient.ts";
import { hideLoading, loadingStage, painted, showLoading } from "./loading.ts";
import { commanderPortrait, officialCard, officialOf, officialScreen, officialsTab, paintSiege, siegeView, type SiegeInfo } from "./ui/people.ts";
import { loadMapImage, type MapImage } from "./map/loadMap.ts";
import { drawBattle, drawRoute, drawSiegeMark, drawToken, pruneBattles, weekEnds } from "./map/marchArt.ts";
import { MapView, type OverlayContext } from "./map/mapView.ts";
import { seasonBytes } from "./map/renderer.ts";
import { detectRuntime, type Diagnostics } from "./platform.ts";

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
let owners: Int16Array = Int16Array.from(provinces, (p) => (p.owner ? nationIndex.get(p.owner)! : -1));
let occupiers: Int16Array = new Int16Array(provinces.length).fill(-1);
/** Dispatches: what happened last turn (or from the last order) that concerns the player. */
let dispatches: News[] = [];
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
/** End turn plays the week a day at a time (TIME-076), and a 4-hour step at a time while the player fights. */
const DAY_MS = 300;
const BATTLE_STEP_MS = 500;
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
let realmTab: "general" | "treasury" | "diplomacy" | "military" | "mercenaries" | "officials" = "general";
/** Province whose official's screen is open, or -1. */
let officialView = -1;
/** Which tab of the province overview is open. */
let provinceTab: "overview" | "people" | "garrison" = "overview";
/** Map lens: how provinces are coloured. */
type Lens = "realms" | "terrain" | "people" | "wealth" | "walls" | "food";
let lens: Lens = "realms";
/** Parchment over lands the player's realm doesn't know yet (a toggle while it's judged). */
let fogOn = true;
/** Provinces the player knows, or null before a realm is chosen. */
let known: Uint8Array | null = null;
/** How far, in provinces, a realm knows the world around its lands and armies. */
const KNOWN_REACH = 6;

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
  </div>
  <div class="lens-menu framed" id="lenses" hidden></div>
  <div class="lens-menu army-list framed" id="army-list" hidden></div>
  <button class="wax open-panel" id="reopen" title="Open the overview" hidden></button>
  <section class="panel framed" id="panel" hidden></section>
  <div class="rotate" role="alert"><div class="framed">${icon("map", 4)}<p><b>Turn your phone sideways</b><br>Pocket Hegemony plays in landscape.</p></div></div>
  <button class="wax fab end-turn" id="fab" title="End turn" hidden>${icon("hourglass", 3, "End turn")}<span class="badge" hidden></span></button>`;
const hud = document.querySelector<HTMLElement>("#hud")!;
const panel = document.querySelector<HTMLElement>("#panel")!;
const fab = document.querySelector<HTMLButtonElement>("#fab")!;
const reopen = document.querySelector<HTMLButtonElement>("#reopen")!;
const armyList = document.querySelector<HTMLElement>("#army-list")!;
const armyButton = document.querySelector<HTMLButtonElement>("#armies")!;
/** The commander list is put away. */
let armyListClosed = true;
armyButton.addEventListener("click", () => {
  armyListClosed = !armyListClosed;
  lensMenu.hidden = true;
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
  renderPanel();
});
// An official's screen opens from their card or the Officials tab (feedback 40).
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-official]");
  if (!b) return;
  officialView = Number(b.dataset.official);
  realmView = -1;
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
  realmView = -1;
  newsView = false;
  selectedProvince = i;
  provinceTab = "overview";
  view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, 4));
  restyleProvinces();
  renderPanel();
});
reopen.addEventListener("click", () => {
  panelCollapsed = false;
  renderPanel();
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
}

// ---- map styling ----
const LENSES: { id: Lens; name: string; note: string }[] = [
  { id: "realms", name: "Realms", note: "who holds the land" },
  { id: "terrain", name: "Terrain", note: "the bare land" },
  { id: "people", name: "People", note: "how many live there" },
  { id: "wealth", name: "Wealth", note: "trade, crafts and land" },
  { id: "walls", name: "Walls", note: "castles and forts" },
  { id: "food", name: "Food", note: "men the land can feed" },
];
const RAMP = ["#f3e3b5", "#e8c172", "#d68a3c", "#b14a2e", "#6e1f2c"].map(hexToRgb);
const WALL_RGB = { none: hexToRgb("#efe2bf"), fort: hexToRgb("#d08a2e"), castle: hexToRgb("#3c4a8e") };
const FOOD_RAMP = ["#a8323e", "#d08a48", "#e9d79a", "#8cb85a", "#3f7a44"].map(hexToRgb);
const ramp = (colors: number[][], t: number) => colors[Math.max(0, Math.min(colors.length - 1, Math.floor(t * colors.length)))]!;
const lensMenu = document.querySelector<HTMLElement>("#lenses")!;

function renderLensMenu(): void {
  lensMenu.innerHTML = `
    <h3 class="sub">Map lens</h3>
    ${LENSES.map((l) => `<button class="paper lens${l.id === lens ? " on" : ""}" data-lens="${l.id}"><b>${l.name}</b><small>${l.note}</small></button>`).join("")}
    <label class="fog-toggle"><input type="checkbox" id="fog" ${fogOn ? "checked" : ""}> Parchment over unknown lands</label>`;
  lensMenu.querySelectorAll<HTMLButtonElement>("[data-lens]").forEach((b) =>
    b.addEventListener("click", () => {
      lens = b.dataset.lens as Lens;
      view.renderer.mode = lens === "realms" ? "political" : lens === "terrain" ? "terrain" : "lens";
      restyleProvinces();
      renderLensMenu();
    }),
  );
  lensMenu.querySelector<HTMLInputElement>("#fog")!.addEventListener("change", (e) => {
    fogOn = (e.target as HTMLInputElement).checked;
    restyleProvinces();
  });
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
      return WALL_RGB[p.castle ?? "none"];
    case "food":
      return ramp(FOOD_RAMP, Math.log10(Math.max(1, forageLimit(march, marchGraph, i))) / 5);
    default:
      return o >= 0 ? nationRgb[o]! : unownedRgb;
  }
}

/** Provinces within KNOWN_REACH steps (over land or sea) of the player's lands and armies. */
function computeKnown(): Uint8Array | null {
  if (!snapshot) return null;
  const me = snapshot.playerNation;
  const dist = new Int16Array(provinces.length).fill(-1);
  const queue = new Int32Array(provinces.length);
  let tail = 0;
  for (let i = 0; i < provinces.length; i++) if (owners[i] === me) ((dist[i] = 0), (queue[tail++] = i));
  const { location, owner } = snapshot.armies;
  for (let k = 0; k < location.length; k++) if (owner[k] === me && dist[location[k]!]! < 0) ((dist[location[k]!] = 0), (queue[tail++] = location[k]!));
  for (let h = 0; h < tail; h++) {
    const p = queue[h]!;
    if (dist[p]! >= KNOWN_REACH) continue;
    for (let e = neighborStart[p]!; e < neighborStart[p + 1]!; e++) {
      const n = neighborList[e]!;
      if (dist[n]! < 0) ((dist[n] = dist[p]! + 1), (queue[tail++] = n));
    }
  }
  const out = new Uint8Array(provinces.length);
  for (let i = 0; i < out.length; i++) out[i] = dist[i]! >= 0 ? 1 : 0;
  return out;
}
const isKnown = (i: number) => !fogOn || !known || known[i] === 1;

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
  known = computeKnown();
  for (let i = 0; i < provinces.length; i++) {
    const o = owners[i]!;
    const occ = occupiers[i]!;
    // Occupied land is hatched in the occupier's colour; borders stay the owner's.
    const hatched = occ >= 0 && lens === "realms";
    const flags = (i === selectedProvince ? 1 : 0) | (isKnown(i) ? 0 : 4) | (hatched ? 8 : 0);
    view.renderer.setProvinceStyle(i, isWater[i] ? unownedRgb : hatched ? nationRgb[occ]! : lensColor(i), o, terrainIdx[i]!, flags, isWater[i]);
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
      if (p.castle === "castle") {
        const t = sprite("tower", color, sc);
        ctx.drawImage(t, x - t.width + 3 * sc, y + img.height - t.height);
      }
      ctx.drawImage(img, x, y);
      if (p.castle === "fort") {
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

  // Sieges under way: how long the walls have held, and how far into the next siege month.
  if (snapshot && zoom >= 2) {
    for (const st of snapshot.sieges) {
      if (!isKnown(st.province)) continue;
      const p = provinces[st.province]!;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) continue;
      drawSiegeMark(ctx, sx, sy - 10 * tokenUnit(zoom), tokenUnit(zoom), nations[st.by]!.color, st.months, st.progress);
    }
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
  }

  // Armies and their commanders, once zoomed in past the realm names (feedback 31).
  // Troops without a commander stay off the map, in their province's garrison (RECR-107).
  if (snapshot && zoom >= ARMY_ZOOM) {
    const s = snapshot;
    const u = tokenUnit(zoom);
    const now = performance.now();
    const inBattle = new Set(s.battles.map((b) => b.tile));
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
      if (cmd < 0 || !isKnown(s.armies.location[k]!)) continue;
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
      const box = drawToken(ctx, {
        x: sx, y: sy, u, color: nations[s.armies.owner[k]!]!.color, men: s.armies.men[k]!,
        dir: armyFacing(k), moving, selected: selected.has(id), t: now,
      });
      armyHitBoxes.push({ id, ...box });
      animating ||= moving;
      if (selected.has(id) || zoom >= 8) {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        pixelText(ctx, cmdOf(cmd).name, sx, box.y + box.h + 2, 10);
      }
    }
  }
  if (animating) view.invalidate();
  if (performance.now() - stepStart < stepMs) view.invalidate();
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

/** Settlement drawn for a province by its people (thousands). */
function settlementOf(population: number): "village" | "town" | "city" {
  return population >= 200 ? "city" : population >= 25 ? "town" : "village";
}

const SETTLEMENT_NAMES = { village: "Village", town: "Town", city: "City" };
const WALL_NAMES = { castle: "Stone castle", fort: "Earthwork ring fort" };

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
  officialView = -1;
  // Armies sit on top of provinces, so check them first, with some room around each for fingers.
  const PAD = 8;
  const hit = armyHitBoxes.find((b) => sx >= b.x - PAD && sx <= b.x + b.w + PAD && sy >= b.y - PAD && sy <= b.y + b.h + PAD);
  if (hit && snapshot && snapshot.armies.owner[armySlot(hit.id)] === snapshot.playerNation) {
    // With armies chosen, another one joins them (or leaves, tapped again); else it is the one chosen.
    if (selected.size && !selected.has(hit.id)) selected.add(hit.id);
    else if (selected.size > 1) selected.delete(hit.id);
    else return pickArmy(hit.id);
    selectionChanged();
    return;
  } else if (selected.size && snapshot && province >= 0 && !isWater[province]) {
    // Any land is a target: the armies set off at once, over the fastest tiles to the spot tapped.
    const armies = [...selected];
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
    selectedProvince = province >= 0 && isKnown(province) ? province : -1;
  }
  armyView = -1;
  realmView = -1;
  newsView = false;
  restyleProvinces();
  renderPanel();
  renderActions();
}

/** Picks an army to move and folds the panel away; the map stays where it is (feedback 6). */
function pickArmy(id: number): void {
  if (!snapshot) return;
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

function armyStats(k: number) {
  const s = snapshot!;
  const c = s.armies.commander[k]!;
  return { men: s.armies.men[k]!, horse: s.armies.horse[k]!, logistics: c >= 0 ? cmdOf(c).logistics : 0 };
}

const duration = (days: number) => (days < 14 ? `${days} day${days === 1 ? "" : "s"}` : `${Math.round(days / 7)} weeks`);
const hoursText = (hours: number) => (hours < 24 ? `${Math.ceil(hours)} hours` : duration(Math.ceil(hours / 24)));

/** Food in the wagons, and whether the land here can feed the army. */
function supplyLine(k: number): string {
  const s = snapshot!;
  const st = armyStats(k);
  const need = (st.men * march.rationsPerSoldier + st.horse * march.rationsPerHorse) * Math.max(0, 1 - st.logistics * march.logisticsRationCut);
  const months = need > 0 ? s.armies.food[k]! / need : 0;
  const limit = forageLimit(march, marchGraph, s.armies.location[k]!);
  return `Food for ${months.toFixed(1)} months · the land here feeds ${fmt(limit)} men`;
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
const pennant = (color: string, scale = 2) => `<img class="px-icon" src="${flagUrl(color, scale)}" alt="">`;

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
    <button class="realm" data-realm="${me}" title="Your realm">${pennant(n.color, 2)}<b>${esc(n.name)}</b></button>
    <span class="plaque turn-label" title="${dateText(s.date)}, ${seasonName(latOf(provinces[provinceIndex.get(n.capital)!]!), s.date.month).toLowerCase()}: one turn is a week">${dateText(s.date, true)}${s.battles.some((b) => b.player) ? ` <small>${String(s.hour).padStart(2, "0")}:00</small>` : ""}</span>
    <button class="plaque" data-realm="${me}" data-realm-open="treasury" title="Treasury: gold, and change per month. Opens the ledger">${icon("coin", 1)}${fmt(s.nationTreasury[me]!)} <small class="${inc < 0 ? "down" : ""}">${inc >= 0 ? "+" : ""}${inc.toFixed(1)}</small></button>
    <span class="plaque" title="Troops against your troop cap (men under arms and gathering)">${icon("swords", 1)}${fmt(s.nationCapUsed[me]! / 1000)}k<small>/${fmt(s.nationTroopCap[me]! / 1000)}k</small></span>
    ${myWars().length ? `<button class="plaque at-war" data-realm="${me}" data-realm-open="diplomacy" title="Your wars">${icon("swords", 1)}At war</button>` : ""}
    <button class="plaque dispatches${s.calls.length || s.peaceOffers.length ? " urgent" : ""}" data-news title="Dispatches: what happened this turn">${icon("scroll", 1)}${dispatches.length + s.calls.length + s.peaceOffers.length}</button>`;
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
const realmButton = (n: number, tab?: "diplomacy") => `<button class="realm-link" data-realm="${n}"${tab ? ` data-realm-open="${tab}"` : ""}>${pennant(nations[n]!.color)}<b>${esc(nations[n]!.name)}</b></button>`;

/** Sends an order that acts at once (war, peace, levies), then shows what came of it. */
async function act(order: Order): Promise<void> {
  if (acting || !snapshot) return;
  acting = true;
  takeSnapshot(await engine.send({ type: "act", order }), 0);
  acting = false;
  applySnapshot();
  if (snapshot.rejectedOrders.length || snapshot.news.length) {
    dispatches = [
      ...snapshot.rejectedOrders.map((r): News => ({ kind: "refused", text: `Not done: ${r.reason}.`, nations: [snapshot!.playerNation] })),
      ...snapshot.news,
      ...dispatches,
    ];
    newsView = true;
    realmView = -1;
    panelCollapsed = false;
  }
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
  drawnAt = at;
  stepStart = performance.now();
  stepMs = ms;
}

/** Takes in a fresh snapshot's map state. */
function applySnapshot(): void {
  owners = snapshot!.provinceOwner;
  occupiers = snapshot!.provinceOccupier;
  nationLabels = computeNationLabels();
}

/** The dispatches: news of the turn, and calls to arms to answer. */
function renderNews(): void {
  const s = snapshot!;
  const me = s.playerNation;
  const NEWS_ICON: Record<News["kind"], "swords" | "castle" | "crown" | "scroll"> = {
    war: "swords", joined: "swords", call: "swords", battle: "swords", peace: "crown", siege: "castle", occupied: "castle", freed: "castle", raised: "swords", refused: "scroll", destroyed: "crown", famine: "scroll",
  };
  const mine = (x: News) => x.nations.includes(me);
  const items = [...dispatches.filter(mine), ...dispatches.filter((x) => !mine(x))];
  panel.innerHTML = `
    <header><h2 class="ribbon">Dispatches</h2>${closeButton()}</header>
    <p class="hint">${dateText(s.date)}</p>
    ${s.peaceOffers.map(offerHtml).join("")}
    ${s.calls
      .map(
        (c) => `<div class="call framed-soft">
          <p>${icon("swords", 2)} ${realmButton(c.caller)} calls you to arms against ${realmButton(c.against)}${c.kind === "defensive" ? " (a defensive call: refusing breaks the alliance)" : ""}.</p>
          <div class="choices"><button class="wax" data-call="${c.id}" data-yes="1">Join the war</button><button class="paper" data-call="${c.id}" data-yes="0">Refuse</button></div>
        </div>`,
      )
      .join("")}
    ${items.length ? `<ul class="news">${items
      .map((x) => `<li class="${mine(x) ? "mine" : ""}">${icon(NEWS_ICON[x.kind], 1)}<span>${esc(x.text)}</span>${x.province !== undefined ? `<button class="paper go" data-go-province="${x.province}" title="Show on the map">${icon("map", 1)}</button>` : ""}</li>`)
      .join("")}</ul>` : s.calls.length || s.peaceOffers.length ? "" : `<p class="hint">Nothing of note this week.</p>`}`;
  bindClose();
  showPanel(true);
  bindOffers();
  panel.querySelectorAll<HTMLButtonElement>("[data-call]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "answerCall", call: b.dataset.call!, yes: b.dataset.yes === "1" })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-go-province]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.goProvince);
      newsView = false;
      selectedProvince = i;
      panelCollapsed = true;
      view.lookAt(provinces[i]!.x!, provinces[i]!.y!, Math.max(view.camera.zoom, 4));
      restyleProvinces();
      renderPanel();
    }),
  );
}

/** The End turn button in the corner; while the week plays, it pauses and resumes. */
function renderActions(): void {
  fab.hidden = !snapshot;
  fab.classList.toggle("playing", playing);
  fab.classList.toggle("paused", paused);
  fab.querySelector<HTMLElement>(".badge")!.hidden = true;
  if (!snapshot) return;
  fab.title = playing ? (paused ? "Play on (Space)" : "Pause (Space)") : `End turn (Space): on to ${dateText(addDays(snapshot.date, DAYS_PER_TURN))}`;
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
  reopen.hidden = !open || !panelCollapsed;
  const what =
    reopenIcon === "crown" ? "Choose a realm" : newsView ? "Dispatches" : realmView >= 0 ? nations[realmView]!.name : selectedProvince >= 0 ? provinces[selectedProvince]!.name : "";
  reopen.innerHTML = `${icon(reopenIcon, 3)}<span>${esc(what)}</span>`;
  reopen.title = `Open the overview: ${what}`;
  panel.querySelector(".fold")?.addEventListener("click", () => {
    panelCollapsed = true;
    showPanel(true, reopenIcon);
  });
}

function renderPanel(): void {
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
  if (armyView >= 0 && snapshot && armySlot(armyView) >= 0) {
    renderArmy(armyView);
    return;
  }
  armyView = -1;
  if (!snapshot && selectedProvince < 0) {
    panel.innerHTML = `
      <header><h2 class="ribbon">Choose your realm</h2><span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button></span></header>
      <div class="nations">${FEATURED.filter((id) => nationIndex.has(id))
        .map((id) => {
          const n = nations[nationIndex.get(id)!]!;
          return `<button class="paper nation" data-nation="${n.id}">${pennant(n.color)}${esc(n.name)}</button>`;
        })
        .join("")}</div>
      <p class="hint">Or tap any realm on the map: ${nations.length} to choose from. <a href="./style.html">Art test page</a></p>
      <p class="diag" id="diag">${diagnosticsLine()}</p>`;
    bindNationButtons();
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
      </dl>`;
    bindClose();
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
  const armiesHere = snapshot ? [...snapshot.armies.id.keys()].filter((k) => snapshot!.armies.location[k] === selectedProvince && snapshot!.armies.commander[k]! >= 0) : [];
  const official = snapshot && own >= 0 ? officialOf(rules, selectedProvince, own, snapshot.provinceOfficial[selectedProvince]) : undefined;
  const siege = siegeInfo(selectedProvince);
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${mineHere ? provinceTabs() : ""}
    ${siege ? siegeView(rules, siege) : ""}
    <p class="owner">${owner ? `<button class="realm-link" data-realm="${own}" title="Open ${esc(owner.name)}">${pennant(owner.color, 3)}<b>${esc(owner.name)}</b></button>` : "<b>Unclaimed land</b>"} · ${p.terrain}${p.river ? " · river" : ""}${p.coastal ? " · coast" : ""}</p>
    <dl class="facts">
      <dt>People</dt><dd>${fmt((snapshot ? snapshot.provincePeople[selectedProvince]! : p.population) * 1000)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1).repeat(p.wealth)}</dd>
      ${snapshot ? foodFacts(selectedProvince) : ""}
      <dt>Seat</dt><dd>${owner && owner.capital === p.id ? "Capital city" : SETTLEMENT_NAMES[settlementOf(p.population)]}</dd>
      <dt>Walls</dt><dd>${owner && owner.capital === p.id ? WALL_NAMES.castle : p.castle ? WALL_NAMES[p.castle] : "None"}</dd>
      ${occupiers[selectedProvince]! >= 0 ? `<dt>Occupied</dt><dd>by ${esc(nations[occupiers[selectedProvince]!]!.name)}</dd>` : ""}
      ${mineHere ? taxLine(selectedProvince) : ""}
    </dl>
    ${mineHere ? rateButtons(snapshot!.provinceTax[selectedProvince]!, "province") : ""}
    ${official !== undefined ? `<h3 class="sub">Official</h3>${officialCard(rules, official, own, mineHere)}` : ""}
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
  bindTax(selectedProvince);
  if (siege) animateSiege(siege);
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
  return { ...st, besiegers, holder, walls: isCapital ? "castle" : (pr.castle ?? null) };
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
function renderOfficial(pi: number): void {
  const s = snapshot!;
  const o = officialOf(rules, pi, owners[pi]!, s.provinceOfficial[pi]);
  if (!o || owners[pi] !== s.playerNation) {
    officialView = -1;
    renderPanel();
    return;
  }
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(o.name)}</h2>${closeButton()}</header>
    ${officialScreen(rules, o, s.playerNation, rules.defines.recruit.commanderGold, s.nationTreasury[s.playerNation]!)}
    <button class="back" data-back>${icon("scroll", 2)}Back to the officials</button>`;
  bindClose();
  showPanel(true);
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
  return `<nav class="tabs">${tab("overview", "Overview")}${tab("people", "People")}${tab("garrison", "Garrison")}</nav>`;
}

/** Food lines of a province's overview: months stored, the last harvest and anyone who starved this year. */
function foodFacts(pi: number): string {
  const s = snapshot!;
  const months = s.provinceFoodMonths[pi]!;
  const h = s.provinceHarvest[pi]!;
  const starved = Math.round(s.provinceStarved[pi]! * 1000);
  const warn = months < 1 ? " · hungry" : months < 3 ? " · running low" : "";
  return `<dt>Food</dt><dd>${months.toFixed(1)} months stored${warn}</dd>
      <dt>Harvest</dt><dd>${h >= 0 ? s.harvests[h]! : "not in yet"}</dd>
      ${starved > 0 ? `<dt>Starved</dt><dd>${fmt(starved)} this year</dd>` : ""}`;
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

function bindProvinceTabs(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      provinceTab = b.dataset.tab as typeof provinceTab;
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

/** Commanders of the player waiting at court, best first. */
function idleCommanders(): number[] {
  const s = snapshot!;
  return s.commanders
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.owner === s.playerNation && c.army < 0)
    .sort((x, y) => y.c.might + y.c.cunning + y.c.logistics - (x.c.might + x.c.cunning + x.c.logistics))
    .map(({ i }) => i);
}

const skills = (c: Snapshot["commanders"][number]) => `might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}`;

/**
 * A province's garrison: men who can be called there, a thousand at a time,
 * those still gathering, troops waiting without a commander, and its official.
 */
function renderGarrison(pi: number): void {
  const s = snapshot!;
  const me = s.playerNation;
  const p = provinces[pi]!;
  const left = Math.floor(s.provinceRecruits[pi]!);
  const ceiling = p.population * rules.defines.levies.menPerThousandPeople;
  const levyMoney = 20 * rules.defines.recruit.goldScale;
  const gather = s.musters.find((m) => m.province === pi);
  const troops = [...s.armies.id.keys()].filter((k) => s.armies.location[k] === pi && s.armies.owner[k] === me && s.armies.commander[k]! < 0);
  const led = [...s.armies.id.keys()].filter((k) => s.armies.location[k] === pi && s.armies.owner[k] === me && s.armies.commander[k]! >= 0 && s.armies.kind[k] === 0);
  const idle = idleCommanders();
  const official = s.provinceOfficial[pi];
  const capLeft = Math.max(0, s.nationTroopCap[me]! - s.nationCapUsed[me]!);
  const queued = gather ? Math.ceil(gather.men / 1000) : 0;
  const max = rules.defines.recruit.queueMax;
  const gw = rules.defines.recruit.gatherWeeks;
  const why =
    queued >= max ? `The queue is full: at most ${max} thousands wait here`
    : left < 1000 ? "Fewer than a thousand men left to call: the pool refills a quarter of the way each year"
    : capLeft < 1000 ? "Over your troop cap"
    : levyMoney > s.nationTreasury[me]! ? "Not enough gold"
    : "";
  // Each queued thousand, oldest first: the first is gathering, the rest wait their turn.
  const rows = Array.from({ length: queued }, (_, i) => {
    const men = i === queued - 1 ? gather!.men - (queued - 1) * 1000 : 1000;
    const ready = gather!.weeksLeft + i * gw;
    return `<li class="${i === 0 ? "now" : ""}">${icon("hourglass", 1)}<span class="what"><b>${fmt(men)} men</b> <small>${i === 0 ? "gathering" : "waiting"}</small></span><span class="when">${ready <= 1 ? "next week" : `in ${weeks(ready)}`}</span>${i === queued - 1 ? `<button class="paper small" data-cancel-recruit title="Cancel: the levy money comes back">×</button>` : ""}</li>`;
  }).join("");
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    ${provinceTabs()}
    <h3 class="sub">Recruit</h3>
    <p>${fmt(left)} of ${fmt(ceiling)} men here can be called. Each thousand takes ${weeks(gw)} to gather, one after another.</p>
    <div class="choices"><button class="paper" data-recruit="1" ${why ? "disabled" : ""} title="${why || `Gathered in ${weeks(queued ? gather!.weeksAll + gw : gw)}`}">Recruit ${fmt(1000)} men · ${levyMoney.toFixed(2)} gold</button></div>
    ${why ? `<p class="hint">${why}.</p>` : ""}
    <div class="queue-head"><span>Queue</span><span>${queued} / ${max}</span></div>
    ${queued ? `<ol class="queue">${rows}</ol>` : `<p class="hint">Nobody is gathering here.</p>`}
    <h3 class="sub">Troops without a commander</h3>
    ${troops.length
      ? troops
          .map((k) => {
            const id = s.armies.id[k]!;
            return `<div class="army">
              <img class="portrait" src="${spriteUrl("soldier", nations[me]!.color, 3)}" alt="">
              <span class="who"><b>${fmt(s.armies.men[k]!)} men</b><br><small>${armText(s.armies.byArm[k]!)}</small></span>
              <span class="army-buttons">
                ${led.map((j) => `<button class="small" data-pickup="${s.armies.id[j]!}">Join ${esc(cmdOf(s.armies.commander[j]!).name)}</button>`).join("")}
                ${idle.slice(0, 3).map((c) => `<button class="paper small" data-lead="${id}" data-by="${c}" title="${skills(cmdOf(c))}">Lead: ${esc(cmdOf(c).name)}</button>`).join("")}
                <button class="paper small" data-disband="${id}">Send home</button>
              </span>
            </div>`;
          })
          .join("")
      : `<p class="hint">None. Men you call here wait in the garrison until a commander leads them or picks them up.</p>`}
    ${troops.length && !idle.length && !led.length ? `<p class="hint">No commander is free: commission an official, below or in another province.</p>` : ""}`;
  bindClose();
  bindProvinceTabs();
  showPanel(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-recruit]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "recruit", province: pi, thousands: Number(b.dataset.recruit) })),
  );
  panel.querySelector<HTMLButtonElement>("[data-cancel-recruit]")?.addEventListener("click", () => void actHere({ type: "cancelRecruit", province: pi }));
  panel.querySelectorAll<HTMLButtonElement>("[data-pickup]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "pickUp", army: Number(b.dataset.pickup) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-lead]").forEach((b) =>
    b.addEventListener("click", () => void actHere({ type: "appoint", army: Number(b.dataset.lead), commander: Number(b.dataset.by) })),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-disband]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "disband", army: Number(b.dataset.disband) })));
}

/**
 * The commander's screen: who leads, the army's troops by arm with what can be
 * done with them (train, split off, send home), its food, pay and time out.
 */
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
  const levyFoot = by[0]!;
  const trainable = rules.defines.recruit.armsAtStart.filter((a) => a !== "levy foot");
  const ARM_COST: Record<string, { months: number; gold: number }> = {
    "armoured foot": { months: 2, gold: 80 }, pikes: { months: 3, gold: 60 }, archers: { months: 4, gold: 60 }, "light horse": { months: 3, gold: 100 }, "knights and lancers": { months: 9, gold: 300 },
  };
  const trainMen = Math.min(1000, Math.floor(levyFoot));
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
      ? `<p>${icon("hourglass", 1)} ${fmt(training.men)} levy foot training as ${esc(training.arm)}: ${training.months} month${training.months === 1 ? "" : "s"} left${atHome ? "" : " (held: the army must stand at a castle of your own)"}.</p>`
      : trainMen >= 1 && !atHome
        ? `<p class="hint">Men train only at a castle of your own. March the army to one (your capital has one) to train its levy foot.</p>`
      : trainMen >= 1
        ? `<p class="hint">Turn ${fmt(trainMen)} levy foot into another arm. Training goes on while the army stands at a castle of your own, and stops while it is away.</p>
          <div class="choices">${trainable
            .map((a) => {
              const cost = ARM_COST[a]!;
              const g = (cost.gold * trainMen * rules.defines.recruit.goldScale) / 1000;
              return `<button class="paper" data-train="${a}" ${g > s.nationTreasury[me]! ? "disabled" : ""}>${ARM_LABEL[a]} · ${cost.months} mo · ${g.toFixed(2)} gold</button>`;
            })
            .join("")}</div>`
        : `<p class="hint">No levy foot left to train.</p>`}`}
    ${garrison.length ? `<div class="choices"><button class="wax" data-pickup="${id}">Take in the garrison here: ${fmt(garrison.reduce((t, j) => t + s.armies.men[j]!, 0))} men</button></div>` : ""}
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
  panel.querySelector("[data-pickup]")?.addEventListener("click", () => void actHere({ type: "pickUp", army: id }));
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
function canTrainAt(p: number): boolean {
  const me = snapshot!.playerNation;
  const owner = nations[owners[p]!];
  const castle = provinces[p]!.castle === "castle" || (owner !== undefined && owner.capital === provinces[p]!.id);
  return owners[p] === me && occupiers[p]! < 0 && castle && !snapshot!.sieges.some((x) => x.province === p);
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
        <button class="wax" data-peace="take" ${taken ? "" : "disabled"}>${icon("crown", 2)}Peace: take ${taken} province${taken === 1 ? "" : "s"}</button>
        <button class="paper" data-peace="white">White peace</button>
        ${lost ? `<button class="paper" data-peace="give">Give up ${lost} province${lost === 1 ? "" : "s"}</button>` : ""}
      </div>`;
  }
  const line =
    rel?.state === "truce" ? `A truce holds${rel.until ? ` until ${monthText(rel.until)}` : ""}: no war before then.`
    : rel?.state === "alliance" ? "Your ally: they answer your calls to arms."
    : rel?.state === "subject" ? "Your overlord."
    : rel?.state === "overlord" ? "Your subject: they join your wars."
    : "No ties between you. Declaring war calls their allies to arms against you, and yours to your side.";
  return `<h3 class="sub">Relations</h3><p>${line}</p>
    ${rel ? "" : `<div class="choices"><button class="wax" data-declare="${r}">${icon("swords", 2)}Declare war</button></div>`}`;
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
  return snapshot!.peaceOffers.filter((o) => o.from === r).map(offerHtml).join("");
}

function bindOffers(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-offer]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "answerPeace", offer: Number(b.dataset.offer), yes: b.dataset.yes === "1" })),
  );
}

/** The player's own diplomacy: offers waiting, wars, and standing with other realms. */
function myDiplomacySection(): string {
  const s = snapshot!;
  const ties = s.relations.filter((x) => x.state !== "war");
  const STATE = { truce: "Truce", alliance: "Ally", subject: "Your overlord", overlord: "Your subject", war: "At war" } as const;
  return `${s.peaceOffers.map(offerHtml).join("")}
    <h3 class="sub">Wars</h3>
    ${myWars().length ? myWars()
      .map((w) => `<p>${icon("swords", 1)} Against ${w.theirs.map((n) => realmButton(n, "diplomacy")).join(" ")} <small>since ${monthText(w.start)}</small></p>`)
      .join("") : `<p class="hint">At peace with the world.</p>`}
    <p class="hint">Open a realm to declare war on it or offer it peace.</p>
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
      .map((m) => `<li><button class="paper small" data-garrison="${m.province}">${esc(provinces[m.province]!.name)}</button><span class="what"><small>${Math.ceil(m.men / 1000)} / ${rules.defines.recruit.queueMax} queued</small></span><span class="when">all in ${weeks(m.weeksAll)}</span></li>`)
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
  panel.querySelectorAll<HTMLButtonElement>("[data-borrow]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "borrow", gold: Number(b.dataset.borrow) })));
  panel.querySelectorAll<HTMLButtonElement>("[data-repay]").forEach((b) => b.addEventListener("click", () => void actHere({ type: "repay", gold: Number(b.dataset.repay) })));
}

const LEDGER_LABEL: Record<string, string> = { tax: "Tax", trade: "Trade", "army pay": "Army pay", officials: "Officials' wages", interest: "Debt interest" };

/** The Treasury tab: gold, the month's ledger, the realm tax default, and debt with borrowing and repaying. */
function treasurySection(): string {
  const s = snapshot!;
  const me = s.playerNation;
  const gold = s.nationTreasury[me]!;
  const net = s.ledger.reduce((t, l) => t + l.gold, 0);
  const own = Array.from(s.provinceTax).filter((t, p) => t >= 0 && owners[p] === me).length;
  const interest = -(s.ledger.find((l) => l.line === "interest")?.gold ?? 0);
  const borrow = [10, 50].filter((g) => g < s.canBorrow);
  const signed = (g: number) => (Math.abs(g) < 0.005 ? "0" : `${g > 0 ? "+" : "−"}${gold2(Math.abs(g))}`);
  return `
    <p><b>${fmt(gold)} gold</b> in the treasury, <b class="${net < 0 ? "down" : ""}">${signed(net)}</b> a month.</p>
    <h3 class="sub">This month</h3>
    <table class="troops ledger"><tbody>
      ${s.ledger.map((l) => `<tr><td>${LEDGER_LABEL[l.line] ?? l.line}</td><td class="num${l.gold < 0 ? " down" : ""}">${signed(l.gold)}</td></tr>`).join("")}
      <tr class="total"><td><b>Change a month</b></td><td class="num${net < 0 ? " down" : ""}"><b>${signed(net)}</b></td></tr>
    </tbody></table>
    <h3 class="sub">Realm tax</h3>
    <p>Provinces pay at <b>${RATE_LABEL[s.taxDefault]!.toLowerCase()}</b> unless you set their own rate on their card${own ? ` (${own} province${own === 1 ? " has" : "s have"} one)` : ""}.</p>
    ${rateButtons(s.taxDefault, "realm")}
    <h3 class="sub">Debt</h3>
    <p>${s.debt > 0 ? `You owe <b>${fmt(s.debt)} gold</b> at 10 % a year: ${gold2(interest)} gold a month.` : "You owe nothing."} Lenders would give up to <b>${fmt(Math.floor(s.canBorrow))} gold</b> more: a year's tax and trade, less what you owe.</p>
    <div class="choices">
      ${borrow.map((g) => `<button class="paper" data-borrow="${g}">Borrow ${g}</button>`).join("")}
      <button class="paper" data-borrow="${Math.floor(s.canBorrow)}" ${s.canBorrow < 1 ? "disabled" : ""}>Borrow ${fmt(Math.floor(s.canBorrow))}</button>
    </div>
    ${s.debt > 0 ? `<div class="choices">
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
  if (!s || ((realmTab === "treasury" || realmTab === "military" || realmTab === "mercenaries" || realmTab === "officials") && !mine)) realmTab = "general";
  const tab = (key: typeof realmTab, label: string) => `<button class="tab${realmTab === key ? " on" : ""}" data-realm-tab="${key}">${label}</button>`;
  const general = `
    <div class="realm-card">
      <img class="banner" src="${flagUrl(n.color, 6)}" alt="">
      <p>${s && s.playerNation === r ? "<b>Your realm</b>" : "<b>Realm</b>"} · ${own.length} province${own.length === 1 ? "" : "s"}<br>
      Capital <button class="paper capital" data-go="${capIdx}">${icon("castle", 1)}${esc(provinces[capIdx]!.name)}</button></p>
    </div>
    <dl class="facts">
      <dt>People</dt><dd>${fmt(people)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1)} ${wealth} across its lands</dd>
      ${s ? `<dt>Treasury</dt><dd>${mine ? `<button class="paper" data-realm-open-tab="treasury" title="Open the ledger">${icon("coin", 1)}${fmt(s.nationTreasury[r]!)} gold <small>${inc >= 0 ? "+" : ""}${inc.toFixed(1)} a month</small></button>` : `${fmt(s.nationTreasury[r]!)} gold <small>${inc >= 0 ? "+" : ""}${inc.toFixed(1)} a month</small>`}</dd>
      <dt>Recruits</dt><dd>${fmt(s.nationLevies[r]!)} men who can be called</dd>
      <dt>Armies</dt><dd>${armies.length} in the field, ${fmt(men)} men</dd>` : ""}
      <dt>Lands</dt><dd>${topLands.map(([t, c]) => `${t} ${c}`).join(" · ")}</dd>
    </dl>
    ${mine ? "" : (() => {
      const list = s ? s.commanders.filter((c) => c.owner === r) : n.commanders;
      return list.length ? `<h3 class="sub">Commanders</h3>${list
        .map((c) => `<div class="army">${commanderPortrait(rules, c.name, r)}<span class="who"><b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small></span></div>`)
        .join("")}` : "";
    })()}
    ${neighbours.size ? `<h3 class="sub">Neighbours</h3><div class="nations">${[...neighbours]
      .map((j) => `<button class="paper nation" data-realm="${j}">${pennant(nations[j]!.color)}${esc(nations[j]!.name)}</button>`)
      .join("")}</div>` : ""}
    ${!s ? `<button class="wax play" data-nation="${n.id}">${icon("crown", 2)}Rule ${esc(n.name)}</button>` : ""}`;
  const content =
    realmTab === "diplomacy" ? (mine ? myDiplomacySection() : offersFrom(r) + relationsSection(r))
    : realmTab === "treasury" ? treasurySection()
    : realmTab === "military" ? warRoomSection()
    : realmTab === "mercenaries" ? mercenarySection()
    : realmTab === "officials" ? officialsTab(rules, own.map((i) => ({ province: i, official: officialOf(rules, i, r, s!.provinceOfficial[i]) })), r)
    : general;
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(n.name)}</h2>${closeButton()}</header>
    ${s ? `<nav class="tabs">${tab("general", "General")}${mine ? tab("treasury", "Treasury") : ""}${tab("diplomacy", "Diplomacy")}${mine ? tab("military", "Military") + tab("officials", "Officials") + tab("mercenaries", "Mercenaries") : ""}</nav>` : ""}
    ${content}
    ${back ? `<button class="back" data-back>${icon("scroll", 2)}Back to ${esc(back.name)}</button>` : ""}`;
  bindClose();
  showPanel(true);
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
  bindOffers();
  bindCommand();
  bindTax(-1);
  panel.querySelector("[data-back]")?.addEventListener("click", () => {
    realmView = -1;
    renderPanel();
  });
  bindNationButtons();
}

function bindClose(): void {
  panel.querySelector(".close")!.addEventListener("click", () => {
    officialView = -1;
    newsView = false;
    realmView = -1;
    selectedProvince = -1;
    selected.clear();
    restyleProvinces();
    renderPanel();
  });
}

function bindNationButtons(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-nation]").forEach((b) => b.addEventListener("click", () => void startGame(b.dataset.nation!)));
}

async function startGame(nation: string): Promise<void> {
  showLoading(`Gathering the court of ${nations[nationIndex.get(nation)!]!.name}…`, 0.15);
  await painted();
  loadingStage(`Mustering the armies of ${nations[nationIndex.get(nation)!]!.name}…`, 0.6);
  takeSnapshot(await engine.send({ type: "newGame", seed: Date.now() >>> 0, playerNation: nation, ...(mapImage ? { map: mapTiles(mapImage) } : {}) }), 0);
  weekStart = snapshot!.date;
  dispatches = [];
  applySnapshot();
  const cap = provinceIndex.get(nations[nationIndex.get(nation)!]!.capital)!;
  selectedProvince = cap;
  panelCollapsed = true;
  view.lookAt(provinces[cap]!.x!, provinces[cap]!.y!, 4);
  restyleProvinces();
  renderHud();
  renderPanel();
  renderActions();
  hideLoading();
}

/** The map images as the engine takes them, so armies march over the map's own tiles. */
function mapTiles(image: MapImage): MapTiles {
  // A plain loop: Uint16Array.from with a map function takes a second over the map's 12 million tiles.
  const province = new Uint16Array(image.ids.length);
  for (let i = 0; i < province.length; i++) province[i] = image.ids[i]! + 1;
  return { width: image.width, height: image.height, province, terrain: image.terrain };
}

/**
 * End turn: the week plays a day at a time, and a 4-hour step at a time while
 * the player's men fight, so marches, battles and sieges are seen as they go
 * (TIME-076). Ending the turn again while it plays pauses it, and again goes on.
 */
async function endTurn(): Promise<void> {
  if (!snapshot) return;
  if (playing) {
    paused = !paused;
    if (!paused) resume?.();
    renderActions();
    return;
  }
  playing = true;
  paused = false;
  selected.clear();
  dispatches = [];
  renderActions();
  const turn = snapshot.turn;
  while (snapshot.turn === turn) {
    if (paused) {
      await new Promise<void>((r) => (resume = r));
      continue;
    }
    const battle = snapshot.battles.some((b) => b.player);
    const ms = battle ? BATTLE_STEP_MS : DAY_MS;
    const t0 = performance.now();
    // The steps run in the engine worker; the map stays live meanwhile.
    performance.mark("turn-sent");
    const next = await engine.send({ type: "advance", steps: battle ? 1 : STEPS_PER_DAY - snapshot.hour / (24 / STEPS_PER_DAY) });
    performance.mark("turn-arrived");
    takeSnapshot(next, ms);
    applySnapshot();
    dispatches.push(...next.rejectedOrders.map((r): News => ({ kind: "refused", text: `Not done: ${r.reason}.`, nations: [next.playerNation] })), ...next.news);
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
  weekStart = snapshot.date;
  // Open the dispatches when something happened to the player's own realm, or a call waits.
  if (snapshot.calls.length || snapshot.peaceOffers.length || dispatches.some((x) => x.nations.includes(snapshot!.playerNation) && x.kind !== "raised")) {
    newsView = true;
    realmView = -1;
    panelCollapsed = false;
  }
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

// Hooks for the scripted play-throughs (scripts/war-shots.mjs).
Object.assign(globalThis, {
  __phNation: (id: string) => nationIndex.get(id),
  __phTurn: () => snapshot?.turn ?? -1,
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
  /** Opens a province's overview by id. */
  __phSelect: (id: string) => {
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
