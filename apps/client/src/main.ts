import { addDays, DAYS_PER_TURN, forageLimit, groundOf, planRoute, type MarchMap, type MoveOrder, type News, type Order, type PeaceTerms, type Route, type Snapshot } from "@ph/engine";
import type { GameDate } from "@ph/rules";
import { placeClimate, provinceClimate, seasonName, type PlaceClimate } from "./map/seasons.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { hexToRgb, PALETTE, TERRAINS } from "./art/palette.ts";
import { sprite, spriteUrl } from "./art/sprites.ts";
import { icon, installUiArt, pennantUrl } from "./art/ui.ts";
import { EngineClient } from "./engineClient.ts";
import { loadMapImage } from "./map/loadMap.ts";
import { MapView, type OverlayContext } from "./map/mapView.ts";
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
const commanders = nations.flatMap((n) => n.commanders);
const neighborIdx = provinces.map((p) => p.neighbors.map((id) => provinceIndex.get(id)!));
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
let selectedArmy = -1; // army id
let pendingOrders: MoveOrder[] = [];
/** The planned route for each pending order, by army id. */
const plannedRoutes = new Map<number, Route>();
/** When the last turn's marches started animating (performance.now), or 0. */
let marchAnimStart = 0;
/** Steps in the longest march of the last turn. */
let marchLongest = 0;
const MARCH_STEP_MS = 450;
let busy = false;
/** The panel is folded away behind a tool button so the map gets the screen. */
let panelCollapsed = false;
/** Nation whose country overview is open, or -1. */
let realmView = -1;
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
  <div class="map" id="map"><div class="loading">Drawing the world…</div></div>
  <header class="hud" id="hud"></header>
  <div class="tools">
    <button class="icon-only" id="mode" title="Map lens" aria-expanded="false">${icon("map", 3, "Map lens")}</button>
    <button class="icon-only" id="home" title="Go to your capital">${icon("castle", 3, "Capital")}</button>
  </div>
  <div class="lens-menu framed" id="lenses" hidden></div>
  <button class="wax open-panel" id="reopen" title="Open the overview" hidden></button>
  <section class="panel framed" id="panel" hidden></section>
  <div class="rotate" role="alert"><div class="framed">${icon("map", 4)}<p><b>Turn your phone sideways</b><br>Pocket Hegemony plays in landscape.</p></div></div>
  <button class="wax fab end-turn" id="fab" title="End turn" hidden>${icon("hourglass", 3, "End turn")}<span class="badge" hidden></span></button>`;
const hud = document.querySelector<HTMLElement>("#hud")!;
const panel = document.querySelector<HTMLElement>("#panel")!;
const fab = document.querySelector<HTMLButtonElement>("#fab")!;
const reopen = document.querySelector<HTMLButtonElement>("#reopen")!;
fab.addEventListener("click", () => void endTurn());
// Phones play in landscape. Browsers only allow the lock in some cases
// (an installed app, fullscreen); otherwise the rotate notice asks for it.
void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => {});
// Country overview: any [data-realm] button opens it, wherever it sits.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-realm]");
  if (!b) return;
  realmView = Number(b.dataset.realm);
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
reopen.addEventListener("click", () => {
  panelCollapsed = false;
  renderPanel();
});

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

let view: MapView;

async function boot(): Promise<void> {
  const image = await loadMapImage(rules.map!, provinces.length);
  document.querySelector(".loading")?.remove();
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
  const dist = new Int16Array(provinces.length).fill(-1);
  const queue: number[] = [];
  owners.forEach((o, i) => o === snapshot!.playerNation && (dist[i] = 0, queue.push(i)));
  snapshot.armies.location.forEach((loc, k) => {
    if (snapshot!.armies.owner[k] === snapshot!.playerNation && dist[loc]! < 0) ((dist[loc] = 0), queue.push(loc));
  });
  for (let h = 0; h < queue.length; h++) {
    const p = queue[h]!;
    if (dist[p]! >= KNOWN_REACH) continue;
    for (const n of neighborIdx[p]!) if (dist[n]! < 0) ((dist[n] = dist[p]! + 1), queue.push(n));
  }
  return Uint8Array.from(dist, (d) => (d >= 0 ? 1 : 0));
}
const isKnown = (i: number) => !fogOn || !known || known[i] === 1;

/** Latitude and longitude of a province's centre. */
const latOf = (p: { y?: number }) => rules.map!.latTop - (p.y ?? 0) / rules.map!.pxPerDeg;
const lonOf = (p: { x?: number }) => (p.x ?? 0) / rules.map!.pxPerDeg - 180;
/** The date the map's seasons were last worked out for, and each province's fixed climate. */
let seasonKey = "";
let places: PlaceClimate[] | null = null;

function restyleProvinces(): void {
  known = computeKnown();
  const targets = new Set<number>();
  // Light up the route of the army being ordered.
  if (selectedArmy >= 0) for (const p of plannedRoutes.get(selectedArmy)?.path ?? []) targets.add(p);
  for (let i = 0; i < provinces.length; i++) {
    const o = owners[i]!;
    const occ = occupiers[i]!;
    // Occupied land is hatched in the occupier's colour; borders stay the owner's.
    const hatched = occ >= 0 && lens === "realms";
    const flags = (i === selectedProvince ? 1 : 0) | (targets.has(i) ? 2 : 0) | (isKnown(i) ? 0 : 4) | (hatched ? 8 : 0);
    view.renderer.setProvinceStyle(i, isWater[i] ? unownedRgb : hatched ? nationRgb[occ]! : lensColor(i), o, TERRAINS.indexOf(provinces[i]!.terrain as (typeof TERRAINS)[number]), flags, isWater[i]);
  }
  // Seasons move on a week a turn, so they are only worked out when the date changes.
  const date = previewMonth ? { year: 1444, month: previewMonth, day: previewDay } : (snapshot?.date ?? rules.defines.startDate);
  const key = `${date.year}-${date.month}-${date.day ?? 1}`;
  if (key !== seasonKey) {
    seasonKey = key;
    places ??= provinces.map((p) => placeClimate(lonOf(p), latOf(p), !!p.coastal, p.terrain ?? ""));
    for (let i = 0; i < provinces.length; i++) {
      if (isWater[i]) continue; // seas keep no seasons yet
      const c = provinceClimate(places[i]!, date);
      view.renderer.setProvinceSeason(i, c.temperature, c.autumn, c.spring, c.wet);
    }
  }
  view.renderer.uploadProvinceStyles();
  view.invalidate();
}

// ---- overlay: nation names, cities, armies ----
let nationLabels = computeNationLabels();

function computeNationLabels() {
  const acc = nations.map(() => ({ x: 0, y: 0, n: 0, ref: -1 }));
  provinces.forEach((p, i) => {
    const o = owners[i]!;
    if (o < 0) return;
    const a = acc[o]!;
    if (a.ref < 0) a.ref = p.x!;
    // Unwrap around the first province so nations across the date line average correctly.
    let x = p.x!;
    if (x - a.ref > rules.map!.width / 2) x -= rules.map!.width;
    if (a.ref - x > rules.map!.width / 2) x += rules.map!.width;
    a.x += x;
    a.y += p.y!;
    a.n++;
  });
  return acc.map((a, i) => {
    if (!a.n) return null;
    const cx = a.x / a.n;
    const cy = a.y / a.n;
    // Snap to the nearest owned province so the label sits on the nation itself.
    let best = -1;
    let bestD = Infinity;
    provinces.forEach((p, j) => {
      if (owners[j] !== i) return;
      const d = (p.x! - cx) ** 2 + (p.y! - cy) ** 2;
      if (d < bestD) ((bestD = d), (best = j));
    });
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

  // Province names when close.
  if (zoom >= 6) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    provinces.forEach((p, i) => {
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (onScreen(sx, sy) && isKnown(i)) pixelText(ctx, p.name, sx, isWater[i] ? sy : sy + 7 * spriteScale, 12, isWater[i]);
    });
  }

  // Sieges under way: a tower and how long the walls have held.
  if (snapshot && zoom >= 2) {
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const st of snapshot.sieges) {
      if (!isKnown(st.province)) continue;
      const p = provinces[st.province]!;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) continue;
      pixelText(ctx, st.months ? `Siege · ${st.months} mo` : "Siege", sx, sy - 8 * spriteScale, 10);
    }
  }

  // Armies and their commanders.
  if (snapshot && zoom >= 1.6) {
    const s = snapshot;
    const stackCount = new Map<number, number>();
    armyHitBoxes = [];
    for (let k = 0; k < s.armies.id.length; k++) {
      const loc = s.armies.location[k]!;
      if (!isKnown(loc)) continue;
      const nth = stackCount.get(loc) ?? 0;
      stackCount.set(loc, nth + 1);
      let [sx, sy] = o.toScreen(...marchPosition(k));
      sx += 10 * spriteScale + nth * 6 * spriteScale;
      if (!onScreen(sx, sy)) continue;
      const owner = s.armies.owner[k]!;
      const cmd = s.armies.commander[k]!;
      const img = sprite(cmd >= 0 ? "commander" : "soldier", nations[owner]!.color, Math.max(1, spriteScale - (cmd >= 0 ? 2 : 1)));
      const x = Math.round(sx - img.width / 2);
      const y = Math.round(sy - img.height + 2 * spriteScale);
      if (s.armies.id[k] === selectedArmy) {
        ctx.fillStyle = PALETTE.paper;
        ctx.fillRect(x - spriteScale, y + img.height - spriteScale, img.width + 2 * spriteScale, 2 * spriteScale);
      }
      ctx.drawImage(img, x, y);
      armyHitBoxes.push({ id: s.armies.id[k]!, x, y, w: img.width, h: img.height });
      if (zoom >= 3) {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = `${cmd >= 0 ? commanders[cmd]!.name : "Army"} · ${fmt(s.armies.men[k]! / 1000)}k`;
        pixelText(ctx, label, sx, y + img.height + 2, 10);
      }
    }
    // Routes: pending orders, and marches still under way from earlier turns.
    ctx.lineWidth = Math.max(2, spriteScale);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let k = 0; k < s.armies.id.length; k++) {
      if (s.armies.owner[k] !== s.playerNation) continue;
      const id = s.armies.id[k]!;
      const planned = plannedRoutes.get(id);
      const path = planned ? planned.path : marchAnimStart ? [] : s.armies.route[k]!;
      if (!path.length) continue;
      const pts = [s.armies.location[k]!, ...path].map((p) => o.toScreen(provinces[p]!.x!, provinces[p]!.y!));
      ctx.strokeStyle = planned ? PALETTE.paper : PALETTE.mist;
      ctx.setLineDash([4 * spriteScale, 3 * spriteScale]);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.setLineDash([]);
      // A dot where each turn's march ends.
      const left = daysLeft(k);
      if (planned) {
        ctx.fillStyle = PALETTE.paper;
        planned.arrive.forEach((d, i) => {
          if (Math.floor(d / DAYS_PER_TURN) > Math.floor((planned.arrive[i - 1] ?? 0) / DAYS_PER_TURN) && i < planned.arrive.length - 1) {
            const [x, y] = pts[i + 1]!;
            ctx.fillRect(Math.round(x) - spriteScale, Math.round(y) - spriteScale, 2 * spriteScale + 1, 2 * spriteScale + 1);
          }
        });
      }
      const [bx, by] = pts.at(-1)!;
      const flag = sprite("flag", nations[s.playerNation]!.color, spriteScale);
      ctx.drawImage(flag, Math.round(bx), Math.round(by - flag.height));
      if (left && zoom >= 2) pixelText(ctx, duration(left.days), bx + flag.width / 2, by - flag.height - 2, 10);
    }
  }
  if (marchAnimStart) view.invalidate();
}

/** Where to draw army slot k: walking its last march for a moment after the turn ends. */
function marchPosition(k: number): [number, number] {
  const s = snapshot!;
  const walked = s.armies.marched[k]!;
  const at = provinces[s.armies.location[k]!]!;
  if (!marchAnimStart || walked.length < 2) return [at.x!, at.y!];
  const t = (performance.now() - marchAnimStart) / MARCH_STEP_MS;
  if (t >= marchLongest) {
    marchAnimStart = 0;
    return [at.x!, at.y!];
  }
  const step = Math.min(walked.length - 1, t);
  const i = Math.min(walked.length - 2, Math.floor(step));
  const f = step - i;
  const a = provinces[walked[i]!]!;
  const b = provinces[walked[i + 1]!]!;
  let bx = b.x!;
  // Take the short way round across the date line.
  if (bx - a.x! > rules.map!.width / 2) bx -= rules.map!.width;
  if (a.x! - bx > rules.map!.width / 2) bx += rules.map!.width;
  return [a.x! + (bx - a.x!) * f, a.y! + (b.y! - a.y!) * f];
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
  const font = `600 ${size + 2}px "Pixelify Sans", "Courier New", monospace`;
  const line = Math.max(3, Math.round(size / 3.5));
  const shadow = Math.max(1, Math.round(size / 9));
  const pad = Math.ceil(line / 2) + shadow + 1;
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d")!;
  c.font = font;
  const w = Math.ceil(c.measureText(text).width) + pad * 2;
  const h = Math.ceil((size + 2) * 1.25) + pad * 2;
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
  // Armies sit on top of provinces, so check them first.
  const hit = armyHitBoxes.find((b) => sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h);
  if (hit && snapshot && snapshot.armies.owner[armySlot(hit.id)] === snapshot.playerNation) {
    pickArmy(hit.id);
    return;
  } else if (selectedArmy >= 0 && snapshot && province >= 0 && !isWater[province]) {
    // Any land province is a target; the army takes the fastest road there.
    const k = armySlot(selectedArmy);
    const here = snapshot.armies.location[k]!;
    pendingOrders = pendingOrders.filter((o) => o.army !== selectedArmy);
    plannedRoutes.delete(selectedArmy);
    const route = province === here ? null : planRoute(march, marchGraph, here, province, armyStats(k));
    // Tapping the army's own province halts it.
    if (route || province === here) pendingOrders.push({ type: "move", army: selectedArmy, to: province });
    if (route) plannedRoutes.set(selectedArmy, route);
    etaCache.delete(selectedArmy);
    selectedArmy = -1;
    selectedProvince = province;
    // Keep the map in view after giving an order; the panel waits behind its button.
    panelCollapsed = true;
  } else {
    // A tap only selects; the overview opens from the button in the lower left.
    // Uncharted land can't be looked at yet.
    selectedArmy = -1;
    selectedProvince = province >= 0 && isKnown(province) ? province : -1;
  }
  realmView = -1;
  newsView = false;
  restyleProvinces();
  renderPanel();
  renderActions();
}

/** Picks an army to move: folds the panel away and centres the map on it. */
function pickArmy(id: number): void {
  if (!snapshot) return;
  const loc = snapshot.armies.location[armySlot(id)]!;
  selectedArmy = id;
  selectedProvince = loc;
  realmView = -1;
  panelCollapsed = true;
  view.lookAt(provinces[loc]!.x!, provinces[loc]!.y!, Math.max(view.camera.zoom, 5));
  restyleProvinces();
  renderPanel();
}

function armyStats(k: number) {
  const s = snapshot!;
  const c = s.armies.commander[k]!;
  return { men: s.armies.men[k]!, horse: s.armies.horse[k]!, logistics: c >= 0 ? commanders[c]!.logistics : 0 };
}

/** Route lengths, by army id, until the next order or turn (planning a route is too slow to repeat every frame). */
const etaCache = new Map<number, { to: number; days: number } | null>();

/** Days still to march for army slot k, from its pending order or its standing route. */
function daysLeft(k: number): { to: number; days: number } | null {
  const id = snapshot!.armies.id[k]!;
  if (!etaCache.has(id)) etaCache.set(id, computeDaysLeft(k));
  return etaCache.get(id)!;
}

function computeDaysLeft(k: number): { to: number; days: number } | null {
  const s = snapshot!;
  const planned = plannedRoutes.get(s.armies.id[k]!);
  if (planned) return { to: planned.path.at(-1)!, days: Math.ceil(planned.arrive.at(-1)!) };
  const route = s.armies.route[k]!;
  if (!route.length) return null;
  const r = planRoute(march, marchGraph, s.armies.location[k]!, route.at(-1)!, armyStats(k));
  return r ? { to: route.at(-1)!, days: Math.max(0, Math.ceil(r.arrive.at(-1)! - s.armies.progress[k]!)) } : null;
}

const duration = (days: number) => (days < 14 ? `${days} day${days === 1 ? "" : "s"}` : `${Math.round(days / 7)} weeks`);

/** Food in the wagons, and whether the land here can feed the army. */
function supplyLine(k: number): string {
  const s = snapshot!;
  const st = armyStats(k);
  const need = (st.men * march.rationsPerSoldier + st.horse * march.rationsPerHorse) * Math.max(0, 1 - st.logistics * march.logisticsRationCut);
  const months = need > 0 ? s.armies.food[k]! / need : 0;
  const limit = forageLimit(march, marchGraph, s.armies.location[k]!);
  return `Food for ${months.toFixed(1)} months · the land here feeds ${fmt(limit)} men`;
}

function marchLine(k: number, order: MoveOrder | undefined): string {
  if (order && !plannedRoutes.has(order.army)) return " · halting";
  const left = daysLeft(k);
  return left ? ` · marching to ${esc(provinces[left.to]!.name)}, ${duration(left.days)}` : "";
}

function armySlot(id: number): number {
  return snapshot ? snapshot.armies.id.indexOf(id) : -1;
}

// ---- HUD and panels ----
const pennant = (color: string, scale = 2) => `<img class="px-icon" src="${pennantUrl(color, scale)}" alt="">`;

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
    <span class="plaque turn-label" title="${dateText(s.date)}, ${seasonName(latOf(provinces[provinceIndex.get(n.capital)!]!), s.date.month).toLowerCase()}: one turn is a week">${dateText(s.date, true)}</span>
    <span class="plaque" title="Treasury: gold, and change per month">${icon("coin", 1)}${fmt(s.nationTreasury[me]!)} <small class="${inc < 0 ? "down" : ""}">${inc >= 0 ? "+" : ""}${inc.toFixed(1)}</small></span>
    <span class="plaque" title="Levies: men ready to raise">${icon("swords", 1)}${fmt(s.nationLevies[me]! / 1000)}k</span>
    ${myWars().length ? `<button class="plaque at-war" data-realm="${me}" title="Your wars">${icon("swords", 1)}At war</button>` : ""}
    <button class="plaque dispatches${s.calls.length ? " urgent" : ""}" data-news title="Dispatches: what happened this turn">${icon("scroll", 1)}${dispatches.length + s.calls.length}</button>`;
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
const realmButton = (n: number) => `<button class="realm-link" data-realm="${n}">${pennant(nations[n]!.color)}<b>${esc(nations[n]!.name)}</b></button>`;

/** Sends an order that acts at once (war, peace, levies), then shows what came of it. */
async function act(order: Order): Promise<void> {
  if (busy || !snapshot) return;
  busy = true;
  snapshot = await engine.send({ type: "act", order });
  busy = false;
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
    war: "swords", joined: "swords", call: "swords", battle: "swords", peace: "crown", siege: "castle", occupied: "castle", freed: "castle", raised: "swords", refused: "scroll", destroyed: "crown",
  };
  const mine = (x: News) => x.nations.includes(me);
  const items = [...dispatches.filter(mine), ...dispatches.filter((x) => !mine(x))];
  panel.innerHTML = `
    <header><h2 class="ribbon">Dispatches</h2>${closeButton()}</header>
    <p class="hint">${dateText(s.date)}</p>
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
      .join("")}</ul>` : s.calls.length ? "" : `<p class="hint">Nothing of note this week.</p>`}`;
  bindClose();
  showPanel(true);
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

/** The End turn button in the corner, with a count of the orders waiting. */
function renderActions(): void {
  fab.hidden = !snapshot;
  fab.disabled = busy;
  const badge = fab.querySelector<HTMLElement>(".badge")!;
  badge.hidden = pendingOrders.length === 0;
  badge.textContent = String(pendingOrders.length);
  if (!snapshot) return;
  const next = addDays(snapshot.date, DAYS_PER_TURN);
  const orders = pendingOrders.length;
  fab.title = `End turn: on to ${dateText(next)}${orders ? `, ${orders} arm${orders > 1 ? "ies" : "y"} marching` : ""}`;
}

function closeButton(): string {
  return `<span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button><button class="close wax" aria-label="Close">${icon("close", 2)}</button></span>`;
}

/** Shows or hides the panel, leaving a tool button to bring a folded panel back. */
function showPanel(open: boolean, reopenIcon: "scroll" | "crown" = "scroll"): void {
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
  const armiesHere = snapshot ? [...snapshot.armies.id.keys()].filter((k) => snapshot!.armies.location[k] === selectedProvince) : [];
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(p.name)}</h2>${closeButton()}</header>
    <p class="owner">${owner ? `<button class="realm-link" data-realm="${own}" title="Open ${esc(owner.name)}">${pennant(owner.color, 3)}<b>${esc(owner.name)}</b></button>` : "<b>Unclaimed land</b>"} · ${p.terrain}${p.river ? " · river" : ""}${p.coastal ? " · coast" : ""}</p>
    <dl class="facts">
      <dt>People</dt><dd>${fmt(p.population * 1000)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1).repeat(p.wealth)}</dd>
      <dt>Seat</dt><dd>${owner && owner.capital === p.id ? "Capital city" : SETTLEMENT_NAMES[settlementOf(p.population)]}</dd>
      <dt>Walls</dt><dd>${owner && owner.capital === p.id ? WALL_NAMES.castle : p.castle ? WALL_NAMES[p.castle] : "None"}</dd>
      ${occupiers[selectedProvince]! >= 0 ? `<dt>Occupied</dt><dd>by ${esc(nations[occupiers[selectedProvince]!]!.name)}</dd>` : ""}
      ${siegeLine(selectedProvince)}
    </dl>
    ${armiesHere
      .map((k) => {
        const s = snapshot!;
        const id = s.armies.id[k]!;
        const cmd = s.armies.commander[k]!;
        const mine = s.armies.owner[k] === s.playerNation;
        const c = cmd >= 0 ? commanders[cmd]! : null;
        const order = pendingOrders.find((o) => o.army === id);
        const portrait = spriteUrl(c ? "commander" : "soldier", nations[s.armies.owner[k]!]!.color, c ? 2 : 3);
        return `<div class="army">
          <img class="portrait" src="${portrait}" alt="">
          <span class="who">${c ? `<b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small>` : "<b>Army</b>"}<br>
          ${fmt(s.armies.men[k]!)} men of ${esc(nations[s.armies.owner[k]!]!.name)}, ${fmt(s.armies.horse[k]!)} on horse${mine ? `<br><small>${supplyLine(k)}${marchLine(k, order)}</small>` : ""}</span>
          ${mine ? `<span class="army-buttons"><button data-army="${id}">${selectedArmy === id ? "Pick a target" : "Move"}</button><button class="paper small" data-disband="${id}" title="Send the men home to the levies">Disband</button></span>` : ""}
        </div>`;
      })
      .join("")}
    ${!snapshot && owner ? `<button class="wax play" data-nation="${owner.id}">${icon("crown", 2)}Rule ${esc(owner.name)}</button>` : ""}`;
  bindClose();
  showPanel(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-army]").forEach((b) =>
    b.addEventListener("click", () => pickArmy(Number(b.dataset.army))),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-disband]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = Number(b.dataset.disband);
      pendingOrders = pendingOrders.filter((o) => o.army !== id);
      plannedRoutes.delete(id);
      void act({ type: "disband", army: id }).then(() => {
        newsView = false;
        renderPanel();
      });
    }),
  );
  bindNationButtons();
}

/** Country overview: the realm's lands, people, purse and commanders. */
function siegeLine(p: number): string {
  const st = snapshot?.sieges.find((x) => x.province === p);
  if (!st) return "";
  return `<dt>Siege</dt><dd>by ${esc(nations[st.by]!.name)}, ${st.months} month${st.months === 1 ? "" : "s"}, ${st.breaches} breach${st.breaches === 1 ? "" : "es"}, ${fmt(st.garrison)} men inside</dd>`;
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

/** The player's own wars and levies, from their realm's overview. */
function warRoomSection(): string {
  const s = snapshot!;
  const me = s.playerNation;
  const cost = rules.defines.war.raiseGoldPerThousand;
  const levies = s.nationLevies[me]!;
  const sizes = [...new Set([5000, 10000, Math.floor(levies / 1000) * 1000])].filter((m) => m >= 1000 && m <= levies).sort((a, b) => a - b);
  return `${myWars().length ? `<h3 class="sub">Wars</h3>${myWars()
      .map((w) => `<p>${icon("swords", 1)} Against ${w.theirs.map(realmButton).join(" ")} <small>since ${monthText(w.start)}</small></p>`)
      .join("")}` : ""}
    <h3 class="sub">Raise levies</h3>
    <p class="hint">${fmt(levies)} men ready. They gather at your capital for ${cost} gold a thousand.</p>
    <div class="choices">${sizes.length ? sizes.map((m) => `<button class="paper" data-raise="${m}" ${(m / 1000) * cost > s.nationTreasury[me]! ? "disabled" : ""}>${fmt(m)} men · ${fmt((m / 1000) * cost)} gold</button>`).join("") : `<span class="hint">Not enough men yet.</span>`}</div>`;
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
  panel.innerHTML = `
    <header><h2 class="ribbon">${esc(n.name)}</h2>${closeButton()}</header>
    <div class="realm-card">
      <img class="banner" src="${pennantUrl(n.color, 6)}" alt="">
      <p>${s && s.playerNation === r ? "<b>Your realm</b>" : "<b>Realm</b>"} · ${own.length} province${own.length === 1 ? "" : "s"}<br>
      Capital <button class="paper capital" data-go="${capIdx}">${icon("castle", 1)}${esc(provinces[capIdx]!.name)}</button></p>
    </div>
    ${s && s.playerNation !== r ? relationsSection(r) : ""}
    <dl class="facts">
      <dt>People</dt><dd>${fmt(people)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1)} ${wealth} across its lands</dd>
      ${s ? `<dt>Treasury</dt><dd>${fmt(s.nationTreasury[r]!)} gold <small>${inc >= 0 ? "+" : ""}${inc.toFixed(1)} a month</small></dd>
      <dt>Levies</dt><dd>${fmt(s.nationLevies[r]!)} men ready</dd>
      <dt>Armies</dt><dd>${armies.length} in the field, ${fmt(men)} men</dd>` : ""}
      <dt>Lands</dt><dd>${topLands.map(([t, c]) => `${t} ${c}`).join(" · ")}</dd>
    </dl>
    ${s && s.playerNation === r ? warRoomSection() : ""}
    ${n.commanders.length ? `<h3 class="sub">Commanders</h3>${n.commanders
      .map((c) => `<div class="army"><img class="portrait" src="${spriteUrl("commander", n.color, 2)}" alt=""><span class="who"><b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small></span></div>`)
      .join("")}` : ""}
    ${neighbours.size ? `<h3 class="sub">Neighbours</h3><div class="nations">${[...neighbours]
      .map((j) => `<button class="paper nation" data-realm="${j}">${pennant(nations[j]!.color)}${esc(nations[j]!.name)}</button>`)
      .join("")}</div>` : ""}
    ${back ? `<button class="back" data-back>${icon("scroll", 2)}Back to ${esc(back.name)}</button>` : ""}
    ${!s ? `<button class="wax play" data-nation="${n.id}">${icon("crown", 2)}Rule ${esc(n.name)}</button>` : ""}`;
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
  panel.querySelectorAll<HTMLButtonElement>("[data-raise]").forEach((b) =>
    b.addEventListener("click", () => void act({ type: "raiseLevies", men: Number(b.dataset.raise) })),
  );
  panel.querySelector("[data-back]")?.addEventListener("click", () => {
    realmView = -1;
    renderPanel();
  });
  bindNationButtons();
}

function bindClose(): void {
  panel.querySelector(".close")!.addEventListener("click", () => {
    newsView = false;
    realmView = -1;
    selectedProvince = -1;
    selectedArmy = -1;
    restyleProvinces();
    renderPanel();
  });
}

function bindNationButtons(): void {
  panel.querySelectorAll<HTMLButtonElement>("[data-nation]").forEach((b) => b.addEventListener("click", () => void startGame(b.dataset.nation!)));
}

async function startGame(nation: string): Promise<void> {
  snapshot = await engine.send({ type: "newGame", seed: Date.now() >>> 0, playerNation: nation });
  etaCache.clear();
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
}

async function endTurn(): Promise<void> {
  if (busy || !snapshot) return;
  busy = true;
  renderActions();
  // The turn runs in the engine worker; the map stays live meanwhile.
  performance.mark("turn-sent");
  snapshot = await engine.send({ type: "endTurn", orders: pendingOrders });
  performance.mark("turn-arrived");
  applySnapshot();
  dispatches = [...snapshot.rejectedOrders.map((r): News => ({ kind: "refused", text: `Not done: ${r.reason}.`, nations: [snapshot!.playerNation] })), ...snapshot.news];
  // Open the dispatches when something happened to the player's own realm, or a call waits.
  if (snapshot.calls.length || dispatches.some((x) => x.nations.includes(snapshot!.playerNation) && x.kind !== "raised")) {
    newsView = true;
    realmView = -1;
    panelCollapsed = false;
  }
  pendingOrders = [];
  plannedRoutes.clear();
  etaCache.clear();
  selectedArmy = -1;
  busy = false;
  marchLongest = Math.max(0, ...snapshot.armies.marched.map((m) => m.length - 1));
  if (marchLongest > 0) marchAnimStart = performance.now();
  restyleProvinces();
  renderHud();
  renderPanel();
  renderActions();
  renderDiagnostics();
  // Budgets in docs/performance.md, checked by scripts/perf.mjs.
  performance.measure("turn-wait", "turn-sent", "turn-arrived");
  performance.measure("turn-apply", "turn-arrived");
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
  /** Sends every idle army of the player toward a realm's capital. */
  __phMarchOn: (id: string) => {
    if (!snapshot) return;
    const to = provinceIndex.get(nations[nationIndex.get(id)!]!.capital)!;
    snapshot.armies.id.forEach((army, k) => {
      if (snapshot!.armies.owner[k] !== snapshot!.playerNation || snapshot!.armies.route[k]!.length || snapshot!.armies.location[k] === to) return;
      const route = planRoute(march, marchGraph, snapshot!.armies.location[k]!, to, armyStats(k));
      if (!route) return;
      pendingOrders = pendingOrders.filter((o) => o.army !== army);
      pendingOrders.push({ type: "move", army, to });
      plannedRoutes.set(army, route);
    });
  },
  __phLookAtWar: () => {
    const p = snapshot?.sieges[0]?.province ?? occupiers.findIndex((o) => o >= 0);
    if (p >= 0) view.lookAt(provinces[p]!.x!, provinces[p]!.y!, 4);
  },
});

renderDiagnostics();
void selfTest();
boot().catch((e) => {
  app.innerHTML = `<p class="fatal">Could not draw the map: ${esc(e instanceof Error ? e.message : String(e))}</p>`;
});
