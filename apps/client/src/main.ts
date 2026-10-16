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
/** Nation whose country overview is open, or -1. */
let realmView = -1;

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
    pickArmy(hit.id);
    return;
  } else if (selectedArmy >= 0 && snapshot && province >= 0 && !isWater[province] && neighborIdx[snapshot.armies.location[armySlot(selectedArmy)]!]!.includes(province)) {
    pendingOrders = pendingOrders.filter((o) => o.army !== selectedArmy);
    pendingOrders.push({ type: "move", army: selectedArmy, to: province });
    selectedArmy = -1;
    selectedProvince = province;
    // Keep the map in view after giving an order; the panel waits behind its button.
    panelCollapsed = true;
  } else {
    selectedArmy = -1;
    selectedProvince = province;
    panelCollapsed = false;
  }
  realmView = -1;
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
    <button class="realm" data-realm="${me}" title="Your realm">${pennant(n.color, 2)}<b>${esc(n.name)}</b></button>
    <span class="plaque turn-label" title="Date">${MONTHS[s.date.month - 1]} ${s.date.year}</span>
    <span class="plaque" title="Treasury: gold, and change per month">${icon("coin", 1)}${fmt(s.nationTreasury[me]!)} <small class="${inc < 0 ? "down" : ""}">${inc >= 0 ? "+" : ""}${inc.toFixed(1)}</small></span>
    <span class="plaque" title="Levies: men ready to raise">${icon("swords", 1)}${fmt(s.nationLevies[me]! / 1000)}k</span>`;
}

/** The End turn button in the corner, with a count of the orders waiting. */
function renderActions(): void {
  fab.hidden = !snapshot;
  fab.disabled = busy;
  const badge = fab.querySelector<HTMLElement>(".badge")!;
  badge.hidden = pendingOrders.length === 0;
  badge.textContent = String(pendingOrders.length);
  if (!snapshot) return;
  const next = new Date(Date.UTC(snapshot.date.year, snapshot.date.month, 1));
  const orders = pendingOrders.length;
  fab.title = `End turn: on to ${MONTHS[next.getUTCMonth()]} ${next.getUTCFullYear()}${orders ? `, ${orders} arm${orders > 1 ? "ies" : "y"} marching` : ""}`;
}

function closeButton(): string {
  return `<span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button><button class="close wax" aria-label="Close">${icon("close", 2)}</button></span>`;
}

/** Shows or hides the panel, leaving a tool button to bring a folded panel back. */
function showPanel(open: boolean, reopenIcon: "scroll" | "crown" = "scroll"): void {
  panel.classList.toggle("chooser", reopenIcon === "crown");
  panel.hidden = !open || panelCollapsed;
  reopen.hidden = !open || !panelCollapsed;
  reopen.innerHTML = icon(reopenIcon, 3, "Show the panel");
  panel.querySelector(".fold")?.addEventListener("click", () => {
    panelCollapsed = true;
    showPanel(true, reopenIcon);
  });
}

function renderPanel(): void {
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
    <p class="owner">${owner ? `<button class="realm-link" data-realm="${own}" title="Open ${esc(owner.name)}">${pennant(owner.color, 3)}<b>${esc(owner.name)}</b></button>` : "<b>Unclaimed land</b>"} · ${p.terrain}${p.coastal ? " · coast" : ""}</p>
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
    b.addEventListener("click", () => pickArmy(Number(b.dataset.army))),
  );
  bindNationButtons();
}

/** Country overview: the realm's lands, people, purse and commanders. */
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
    <dl class="facts">
      <dt>People</dt><dd>${fmt(people)}</dd>
      <dt>Wealth</dt><dd>${icon("coin", 1)} ${wealth} across its lands</dd>
      ${s ? `<dt>Treasury</dt><dd>${fmt(s.nationTreasury[r]!)} gold <small>${inc >= 0 ? "+" : ""}${inc.toFixed(1)} a month</small></dd>
      <dt>Levies</dt><dd>${fmt(s.nationLevies[r]!)} men ready</dd>
      <dt>Armies</dt><dd>${armies.length} in the field, ${fmt(men)} men</dd>` : ""}
      <dt>Lands</dt><dd>${topLands.map(([t, c]) => `${t} ${c}`).join(" · ")}</dd>
    </dl>
    ${n.commanders.length ? `<h3 class="sub">Commanders</h3>${n.commanders
      .map((c) => `<div class="army"><img class="portrait" src="${sprite("commander", n.color, 2).toDataURL()}" alt=""><span class="who"><b>${esc(c.name)}</b><br><small>might ${c.might} · cunning ${c.cunning} · logistics ${c.logistics}</small></span></div>`)
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
  panel.querySelector("[data-back]")?.addEventListener("click", () => {
    realmView = -1;
    renderPanel();
  });
  bindNationButtons();
}

function bindClose(): void {
  panel.querySelector(".close")!.addEventListener("click", () => {
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
  owners = snapshot.provinceOwner;
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
  snapshot = await engine.send({ type: "endTurn", orders: pendingOrders });
  owners = snapshot.provinceOwner;
  pendingOrders = [];
  selectedArmy = -1;
  busy = false;
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

renderDiagnostics();
void selfTest();
boot().catch((e) => {
  app.innerHTML = `<p class="fatal">Could not draw the map: ${esc(e instanceof Error ? e.message : String(e))}</p>`;
});
