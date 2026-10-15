// Art test page: every visual building block of the game on one page, for review.
import { loadDefaultRuleset } from "@ph/rules";
import { PALETTE, TERRAIN_COLORS, TERRAINS } from "./art/palette.ts";
import { sprite, SPRITES, type SpriteName } from "./art/sprites.ts";
import { SEA_ROW, SHALLOW_ROW, tileCanvas, VARIANTS } from "./art/tiles.ts";
import { icon, ICONS, installUiArt, pennantUrl, UI_COLORS, type IconName } from "./art/ui.ts";

installUiArt();
const rules = loadDefaultRuleset();
const root = document.querySelector<HTMLElement>("#sheet")!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const nation = (id: string) => rules.nations.find((n) => n.id === id)!;
const pennant = (color: string, scale = 2) => `<img class="px-icon" src="${pennantUrl(color, scale)}" alt="">`;

const figure = (el: HTMLElement | string, caption: string) => {
  const f = document.createElement("figure");
  if (typeof el === "string") f.innerHTML = el;
  else f.append(el);
  f.insertAdjacentHTML("beforeend", `<figcaption>${esc(caption)}</figcaption>`);
  return f;
};

function section(title: string, intro: string): HTMLElement {
  const s = document.createElement("section");
  s.className = "framed sheet-section";
  s.innerHTML = `<h2 class="ribbon">${esc(title)}</h2><p>${intro}</p>`;
  root.append(s);
  const body = document.createElement("div");
  s.append(body);
  return body;
}

const water = rules.provinces.filter((p) => p.terrain === "sea" || p.terrain === "ocean");
const land = rules.provinces.length - water.length;

root.innerHTML = `
  <header class="sheet-title">
    <h1>${icon("crown", 4)} Pocket Hegemony</h1>
    <p>Art test page: parchment and wood. <a href="./">Open the game</a></p>
  </header>`;

// Interface
{
  const france = nation("france");
  const dunois = france.commanders[0]!;
  const body = section(
    "Interface",
    "Carved wood frames with brass corners hold parchment. Titles sit on cloth ribbons in a blackletter pixel face; everything else uses a rounded pixel face. Buttons are wooden plates, paper cards, or red wax for the one action that matters most. Every piece is pixel art drawn in code and scaled by whole steps.",
  );
  body.innerHTML = `
    <h3>Top bar</h3>
    <header class="hud demo-hud">
      <div class="realm">${pennant(france.color, 3)}<b>${esc(france.name)}</b></div>
      <span class="plaque">${icon("scroll", 2)}April 1444</span>
      <div class="stats">
        <span class="plaque">${icon("coin", 2)}64 <small>+4.2</small></span>
        <span class="plaque">${icon("swords", 2)}38k</span>
        <button class="wax end-turn">${icon("hourglass", 2)}End turn</button>
      </div>
    </header>
    <h3>Buttons</h3>
    <div class="row">
      <button>Move</button>
      <button class="paper">${pennant(nation("england").color)}England</button>
      <button class="wax">${icon("crown", 2)}Rule France</button>
      <button class="icon-only">${icon("map", 3)}</button>
      <button class="icon-only">${icon("castle", 3)}</button>
      <button disabled>Working…</button>
    </div>
    <h3>Panel</h3>
    <section class="panel framed demo-panel">
      <header><h2 class="ribbon">Île-de-France</h2><button class="close wax" aria-label="Close">${icon("close", 2)}</button></header>
      <p class="owner">${pennant(france.color)}<b>France</b> · farmland</p>
      <dl class="facts"><dt>People</dt><dd>412,000</dd><dt>Wealth</dt><dd>${icon("coin", 1).repeat(6)}</dd></dl>
      <div class="army">
        <img class="portrait" src="${sprite("commander", france.color, 3).toDataURL()}" alt="">
        <span class="who"><b>${esc(dunois.name)}</b><br><small>might ${dunois.might} · cunning ${dunois.cunning} · logistics ${dunois.logistics}</small><br>5,000 men of France</span>
        <button>Move</button>
      </div>
    </section>
    <h3>Icons</h3>
    <div class="row icons"></div>`;
  const icons = body.querySelector<HTMLElement>(".icons")!;
  for (const name of Object.keys(ICONS) as IconName[]) icons.append(figure(icon(name, 4), name));
}

// Map tiles
{
  const body = section(
    "Close-zoom map",
    `Zoom in and every map pixel becomes 8 × 8 art pixels. Each terrain has ${VARIANTS} hand-made 16 × 16 tiles, picked at random per spot; mountains are one 32 × 32 range split over four tiles and mirrored at random. The terrain under each pixel comes from real geography (mountain ranges, deserts, wetlands), broken up with woods, and with fields where 1444 Europe and Asia were most crowded. Under a realm, the tiles are washed in its colour with a stronger band along its borders.`,
  );
  const rows: [string, number][] = [...TERRAINS.map((t, i) => [t, i] as [string, number]), ["coastal sea", SHALLOW_ROW], ["open ocean", SEA_ROW]];
  for (const [name, row] of rows) {
    const r = document.createElement("div");
    r.className = "row tiles";
    for (let v = 0; v < VARIANTS; v++) r.append(figure(tileCanvas(row, v, 4), v === 0 ? name : ""));
    body.append(r);
  }
}

// Seas
section(
  "Sea zones",
  `The oceans are split into ${water.length.toLocaleString()} sea zones next to ${land.toLocaleString()} land provinces. Coastal zones are about 150 km across and open-ocean zones about 300 km, the same in kilometres everywhere on the globe, so the number of zones a fleet crosses measures how long a voyage takes. Zones carry real sea names (North Sea, Bay of Biscay); big oceans add coordinates (North Atlantic Ocean 40°N 30°W). Narrow straits such as the Bosporus and the Øresund are joined even where the pixel grid closes them. Armies cannot enter water until ships exist.`,
);

// Sprites
{
  const body = section("Sprites", "Drawn pixel by pixel in src/art/sprites.ts. Banners and roofs take the owner's colour. They grow by whole steps as you zoom so pixels never blur.");
  const colors = ["france", "england", "ottomans", "ming"].map(nation);
  for (const name of Object.keys(SPRITES) as SpriteName[]) {
    const row = document.createElement("div");
    row.className = "row";
    for (const scale of [2, 3, 4]) row.append(figure(sprite(name, colors[0]!.color, scale), `${name} ${scale}×`));
    for (const n of colors.slice(1)) row.append(figure(sprite(name, n.color, 3), n.name));
    body.append(row);
  }
}

// Palette
{
  const body = section("Colours", "Interface, map and terrain colours.");
  body.className = "grid";
  const all: [string, string][] = [
    ...Object.entries(UI_COLORS),
    ...Object.entries(PALETTE),
    ...TERRAINS.map((t) => [t, TERRAIN_COLORS[t]] as [string, string]),
  ];
  for (const [name, hex] of all) body.insertAdjacentHTML("beforeend", `<div class="chip"><div class="sw" style="background:${hex}"></div>${name}<br>${hex}</div>`);
}

// Nations
{
  const body = section("Realm colours", `${rules.nations.length} realms in 1444. Neighbours never share a colour.`);
  body.className = "grid";
  const size = new Map<string, number>();
  for (const p of rules.provinces) if (p.owner) size.set(p.owner, (size.get(p.owner) ?? 0) + 1);
  const top = [...rules.nations].sort((a, b) => (size.get(b.id) ?? 0) - (size.get(a.id) ?? 0)).slice(0, 24);
  for (const n of top) body.insertAdjacentHTML("beforeend", `<div class="chip">${pennant(n.color, 3)} ${esc(n.name)}<br>${size.get(n.id)} provinces</div>`);
}
