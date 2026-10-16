import type { Order, Snapshot } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";
import { hexToRgb, PALETTE, TERRAINS } from "./art/palette.ts";
import { sprite } from "./art/sprites.ts";
import { icon, installUiArt, pennantUrl } from "./art/ui.ts";
import { EngineClient } from "./engineClient.ts";
import { loadMapImage } from "./map/loadMap.ts";
import { MapView, type OverlayContext } from "./map/mapView.ts";
import { detectRuntime, type Diagnostics } from "./platform.ts";

const rules = loadDefaultRuleset();
// ?engine=main-thread forces the fallback path, for testing it.
const forceMainThread = new URLSearchParams(location.search).get("engine") === "main-thread";
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

const provinces = rules.provinces;
const nations = rules.nations;
const provinceIndex = new Map(provinces.map((p, i) => [p.id, i]));
const nationIndex = new Map(nations.map((n, i) => [n.id, i]));
const nationRgb = nations.map((n) => hexToRgb(n.color));
const unownedRgb = hexToRgb(PALETTE.unowned);
const commanders = nations.flatMap((n) => n.commanders);
const neighborIdx = provinces.map((p) => p.neighbors.map((id) => provinceIndex.get(id)!));
const isWater = provinces.map((p) => p.terrain === "sea" || p.terrain === "ocean");

// ---- state ----
let snapshot: Snapshot | null = null;
let owners: Int16Array = Int16Array.from(provinces, (p) => (p.owner ? nationIndex.get(p.owner)! : -1));
let selectedProvince = -1;
let selectedArmy = -1; // army id
let pendingOrders: Order[] = [];
let busy = false;
/** The panel is folded away behind a tool button so the map gets the screen. */
let panelCollapsed = false;
let actionsOpen = false;

// ---- DOM ----
installUiArt();
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `
  <div class="map" id="map"><div class="loading">Drawing the world…</div></div>
  <header class="hud" id="hud"></header>
  <div class="tools">
    <button class="icon-only" id="mode" title="Switch map mode">${icon("map", 3, "Map mode")}</button>
    <button class="icon-only" id="home" title="Go to your capital">${icon("castle", 3, "Capital")}</button>
    <button class="icon-only" id="reopen" title="Show the panel" hidden></button>
  </div>
  <section class="panel framed" id="panel" hidden></section>
  <section class="actions framed" id="actions" hidden>
    <div id="action-body"></div>
    <p class="diag" id="diag"></p>
  </section>
  <button class="wax fab" id="fab" title="Actions" aria-expanded="false" hidden>${icon("hourglass", 3, "Actions")}<span class="badge" hidden></span></button>`;
const hud = document.querySelector<HTMLElement>("#hud")!;
const panel = document.querySelector<HTMLElement>("#panel")!;
const diag = document.querySelector<HTMLElement>("#diag")!;
const actions = document.querySelector<HTMLElement>("#actions")!;
const fab = document.querySelector<HTMLButtonElement>("#fab")!;
const reopen = document.querySelector<HTMLButtonElement>("#reopen")!;
fab.addEventListener("click", () => {
  actionsOpen = !actionsOpen;
  renderActions();
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
  restyleProvinces();
  // Start over Europe, zoomed so countries are readable on a phone.
  const paris = provinces[provinceIndex.get(nations[nationIndex.get("france")!]!.capital)!]!;
  view.lookAt(paris.x!, paris.y!, 1.4);
  // ?view=x,y,zoom opens the map at a spot, for screenshots and bug reports.
  const at = new URLSearchParams(location.search).get("view")?.split(",").map(Number);
  if (at?.length === 3 && at.every(Number.isFinite)) view.lookAt(at[0]!, at[1]!, at[2]!);
  document.querySelector("#mode")!.addEventListener("click", () => {
    view.renderer.mode = view.renderer.mode === "political" ? "terrain" : "political";
    view.invalidate();
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
function restyleProvinces(): void {
  const targets = new Set<number>();
  if (selectedArmy >= 0 && snapshot) {
    const k = armySlot(selectedArmy);
    if (k >= 0) for (const n of neighborIdx[snapshot.armies.location[k]!]!) if (!isWater[n]) targets.add(n);
  }
  for (let i = 0; i < provinces.length; i++) {
    const o = owners[i]!;
    const flags = (i === selectedProvince ? 1 : 0) | (targets.has(i) ? 2 : 0);
    view.renderer.setProvinceStyle(i, o >= 0 ? nationRgb[o]! : unownedRgb, o, TERRAINS.indexOf(provinces[i]!.terrain as (typeof TERRAINS)[number]), flags, isWater[i]);
  }
  view.renderer.uploadProvinceStyles();
  view.invalidate();
}

// ---- overlay: nation names, cities, armies ----
const nationLabels = computeNationLabels();

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

  // Towns, then capitals.
  if (zoom >= 3) {
    provinces.forEach((p, i) => {
      const own = owners[i]!;
      if (own < 0 || nations[own]!.capital === p.id) return;
      const [sx, sy] = o.toScreen(p.x!, p.y!);
      if (!onScreen(sx, sy)) return;
      const img = sprite("town", nations[own]!.color, Math.max(1, spriteScale - 2));
      ctx.drawImage(img, Math.round(sx - img.width / 2), Math.round(sy - img.height / 2));
    });
  }
  if (zoom >= 1.1) {
    nations.forEach((n, i) => {
      const p = provinces[provinceIndex.get(n.capital)!]!;
      if (owners[provinceIndex.get(n.capital)!] !== i) return;
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
      if (!l) return;
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
      if (onScreen(sx, sy)) pixelText(ctx, p.name, sx, isWater[i] ? sy : sy + 7 * spriteScale, 12, isWater[i]);
    });
  }

  // Armies and their commanders.
  if (snapshot && zoom >= 1.6) {
    const s = snapshot;
    const stackCount = new Map<number, number>();
    armyHitBoxes = [];
    for (let k = 0; k < s.armies.id.length; k++) {
      const loc = s.armies.location[k]!;
      const p = provinces[loc]!;
      const nth = stackCount.get(loc) ?? 0;
      stackCount.set(loc, nth + 1);
      let [sx, sy] = o.toScreen(p.x!, p.y!);
      sx += 10 * spriteScale + nth * 6 * spriteScale;
      if (!onScreen(sx, sy)) continue;
      const owner = s.armies.owner[k]!;
      const cmd = s.armies.commander[k]!;
      const img = sprite(cmd >= 0 ? "commander" : "soldier", nations[owner]!.color, Math.max(1, spriteScale - 1));
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
    // Move orders as arrows.
    ctx.strokeStyle = PALETTE.paper;
    ctx.lineWidth = Math.max(2, spriteScale);
    for (const ord of pendingOrders) {
      const k = armySlot(ord.army);
      if (k < 0) continue;
      const from = provinces[s.armies.location[k]!]!;
      const to = provinces[ord.to]!;
      const [ax, ay] = o.toScreen(from.x!, from.y!);
      const [bx, by] = o.toScreen(to.x!, to.y!);
      ctx.setLineDash([4 * spriteScale, 3 * spriteScale]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      const flag = sprite("flag", nations[s.playerNation]!.color, spriteScale);
      ctx.drawImage(flag, Math.round(bx), Math.round(by - flag.height));
    }
  }
}

let armyHitBoxes: { id: number; x: number; y: number; w: number; h: number }[] = [];

function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, water = false): void {
  ctx.font = `600 ${size + 2}px "Pixelify Sans", "Courier New", monospace`;
  // A thick ink outline plus a drop shadow, so labels read over busy terrain.
  ctx.lineWidth = Math.max(3, Math.round(size / 3.5));
  ctx.lineJoin = "round";
  ctx.strokeStyle = PALETTE.ink;
  const shadow = Math.max(1, Math.round(size / 9));
  ctx.strokeText(text, Math.round(x) + shadow, Math.round(y) + shadow);
  ctx.strokeText(text, Math.round(x), Math.round(y));
  ctx.fillStyle = water ? PALETTE.mist : PALETTE.paper;
  ctx.fillText(text, Math.round(x), Math.round(y));
}

// ---- input ----
function onTap(sx: number, sy: number, province: number): void {
  // Armies sit on top of provinces, so check them first.
  const hit = armyHitBoxes.find((b) => sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h);
  if (hit && snapshot && snapshot.armies.owner[armySlot(hit.id)] === snapshot.playerNation) {
    selectedArmy = hit.id;
    selectedProvince = snapshot.armies.location[armySlot(hit.id)]!;
  } else if (selectedArmy >= 0 && snapshot && province >= 0 && !isWater[province] && neighborIdx[snapshot.armies.location[armySlot(selectedArmy)]!]!.includes(province)) {
    pendingOrders = pendingOrders.filter((o) => o.army !== selectedArmy);
    pendingOrders.push({ type: "move", army: selectedArmy, to: province });
    selectedArmy = -1;
    selectedProvince = province;
  } else {
    selectedArmy = -1;
    selectedProvince = province;
  }
  panelCollapsed = false;
  actionsOpen = false;
  restyleProvinces();
  renderPanel();
  renderActions();
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
      <span class="subtitle">Spring 1444 · choose a realm</span>`;
    return;
  }
  const s = snapshot;
  const me = s.playerNation;
  const n = nations[me]!;
  const inc = s.nationMonthlyIncome[me]!;
  hud.innerHTML = `
    <div class="realm">${pennant(n.color, 2)}<b>${esc(n.name)}</b></div>
    <span class="plaque turn-label" title="Date">${MONTHS[s.date.month - 1]} ${s.date.year}</span>
    <span class="plaque" title="Treasury: gold, and change per month">${icon("coin", 1)}${fmt(s.nationTreasury[me]!)} <small class="${inc < 0 ? "down" : ""}">${inc >= 0 ? "+" : ""}${inc.toFixed(1)}</small></span>
    <span class="plaque" title="Levies: men ready to raise">${icon("swords", 1)}${fmt(s.nationLevies[me]! / 1000)}k</span>`;
}

/** The action button and its sheet: End turn, the orders waiting, and engine diagnostics. */
function renderActions(): void {
  fab.hidden = !snapshot;
  actions.hidden = !snapshot || !actionsOpen;
  fab.setAttribute("aria-expanded", String(actionsOpen));
  fab.classList.toggle("open", actionsOpen);
  const badge = fab.querySelector<HTMLElement>(".badge")!;
  badge.hidden = pendingOrders.length === 0;
  badge.textContent = String(pendingOrders.length);
  if (!snapshot) return;
  const next = new Date(Date.UTC(snapshot.date.year, snapshot.date.month, 1));
  const orders = pendingOrders.length;
  document.querySelector("#action-body")!.innerHTML = `
    <p class="orders">${orders ? `${orders} arm${orders > 1 ? "ies" : "y"} marching this month` : "No orders given this month"}</p>
    <button class="wax end-turn" ${busy ? "disabled" : ""}>${icon("hourglass", 2)}${busy ? "Working…" : `End turn · to ${MONTHS[next.getUTCMonth()]} ${next.getUTCFullYear()}`}</button>`;
  actions.querySelector(".end-turn")!.addEventListener("click", () => void endTurn());
}

function closeButton(): string {
  return `<span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button><button class="close wax" aria-label="Close">${icon("close", 2)}</button></span>`;
}

/** Shows or hides the panel, leaving a tool button to bring a folded panel back. */
function showPanel(open: boolean, reopenIcon: "scroll" | "crown" = "scroll"): void {
  panel.hidden = !open || panelCollapsed;
  reopen.hidden = !open || !panelCollapsed;
  reopen.innerHTML = icon(reopenIcon, 3, "Show the panel");
  panel.querySelector(".fold")?.addEventListener("click", () => {
    panelCollapsed = true;
    showPanel(true, reopenIcon);
  });
}

function renderPanel(): void {
  if (!snapshot && selectedProvince < 0) {
    panel.innerHTML = `
      <header><h2 class="ribbon">Choose your realm</h2><span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button></span></header>
      <div class="nations">${FEATURED.filter((id) => nationIndex.has(id))
        .map((id) => {
          const n = nations[nationIndex.get(id)!]!;
          return `<button class="paper nation" data-nation="${n.id}">${pennant(n.color)}${esc(n.name)}</button>`;
        })
        .join("")}</div>
      <p class="hint">Or tap any realm on the map: ${nations.length} to choose from. <a href="./style.html">Art test page</a></p>`;
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
    <p class="owner">${owner ? `${pennant(owner.color)}<b>${esc(owner.name)}</b>` : "<b>Unclaimed land</b>"} · ${p.terrain}${p.coastal ? " · coast" : ""}</p>
    <dl class="facts">
      <dt>People</dt><dd>${fmt(p.population * 1000)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1).repeat(p.wealth)}</dd>
    </dl>
    ${armiesHere
      .map((k) => {
        const s = snapshot!;
        const id = s.armies.id[k]!;
        const cmd = s.armies.commander[k]!;
        const mine = s.armies.owner[k] === s.playerNation;
        const c = cmd >= 0 ? commanders[cmd]! : null;
        const order = pendingOrders.find((o) => o.army === id);
        const portrait = sprite(c ? "commander" : "soldier", nations[s.armies.owner[k]!]!.color, 3).toDataURL();
        return `<div class="army">
          <img class="portrait" src="${portrait}" alt="">
          <span class="who">${c ? `<b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small>` : "<b>Army</b>"}<br>
          ${fmt(s.armies.men[k]!)} men of ${esc(nations[s.armies.owner[k]!]!.name)}${order ? ` · marching to ${esc(provinces[order.to]!.name)}` : ""}</span>
          ${mine ? `<button data-army="${id}">${selectedArmy === id ? "Pick a target" : "Move"}</button>` : ""}
        </div>`;
      })
      .join("")}
    ${!snapshot && owner ? `<button class="wax play" data-nation="${owner.id}">${icon("crown", 2)}Rule ${esc(owner.name)}</button>` : ""}`;
  bindClose();
  showPanel(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-army]").forEach((b) =>
    b.addEventListener("click", () => {
      selectedArmy = Number(b.dataset.army);
      restyleProvinces();
      renderPanel();
    }),
  );
  bindNationButtons();
}

function bindClose(): void {
  panel.querySelector(".close")!.addEventListener("click", () => {
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
  owners = snapshot.provinceOwner;
  const cap = provinceIndex.get(nations[nationIndex.get(nation)!]!.capital)!;
  selectedProvince = cap;
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
  snapshot = await engine.send({ type: "endTurn", orders: pendingOrders });
  owners = snapshot.provinceOwner;
  pendingOrders = [];
  selectedArmy = -1;
  busy = false;
  actionsOpen = false;
  restyleProvinces();
  renderHud();
  renderPanel();
  renderActions();
  renderDiagnostics();
}

function renderDiagnostics(): void {
  const d = diagnostics;
  const engineLine = d.engineError
    ? `engine failed: ${esc(d.engineError)}`
    : d.engineRoundTripMs === null
      ? "engine starting…"
      : d.engineMode === "worker"
        ? `engine in background worker`
        : `engine on main thread`;
  diag.innerHTML = `${d.runtime} · ${engineLine}${snapshot ? ` · last turn ${snapshot.computeMs.toFixed(1)} ms` : ""}`;
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

renderDiagnostics();
void selfTest();
boot().catch((e) => {
  app.innerHTML = `<p class="fatal">Could not draw the map: ${esc(e instanceof Error ? e.message : String(e))}</p>`;
});
