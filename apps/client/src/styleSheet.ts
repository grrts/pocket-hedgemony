// Art test page: every visual building block of the game on one page, for review.
import { loadDefaultRuleset } from "@ph/rules";
import { DEPTH_COLORS, PALETTE, TERRAIN_CATEGORIES, TERRAIN_COLORS, TERRAINS } from "./art/palette.ts";
import { sprite, SPRITES, type SpriteName } from "./art/sprites.ts";
import { BIG_ROWS, SEA_ROW, SHALLOW_ROW, tileCanvas, VARIANTS } from "./art/tiles.ts";
import { portrait, type Look } from "./art/portraits.ts";
import { icon, ICONS, installUiArt, flagUrl, UI_COLORS, type IconName } from "./art/ui.ts";

installUiArt();
const rules = loadDefaultRuleset();
const root = document.querySelector<HTMLElement>("#sheet")!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const nation = (id: string) => rules.nations.find((n) => n.id === id)!;
const pennant = (color: string, scale = 2) => `<img class="px-icon" src="${flagUrl(color, scale)}" alt="">`;

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
    "Carved wood frames with brass corners hold parchment. Titles sit on cloth ribbons in a bold pixel face; the blackletter face is kept for the game's name only. Buttons are wooden plates, paper cards, or red wax for the one action that matters most. On a phone the map comes first: a thin top bar, a province overview that fills the screen (the left third on desktop) and folds away behind a tool button, and a one-tap End turn button in the corner showing how many orders are waiting. Every piece is pixel art drawn in code and scaled by whole steps.",
  );
  body.innerHTML = `
    <h3>Top bar</h3>
    <header class="hud demo-hud">
      <div class="realm">${pennant(france.color, 2)}<b>${esc(france.name)}</b></div>
      <span class="plaque">18 Nov 1444</span>
      <span class="plaque">${icon("coin", 1)}64 <small>+4.2</small></span>
      <span class="plaque">${icon("swords", 1)}38k</span>
    </header>
    <h3>End turn button</h3>
    <div class="row demo-actions">
      <button class="wax fab">${icon("hourglass", 3)}<span class="badge">2</span></button>
    </div>
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
      <header><h2 class="ribbon">Île-de-France</h2><span class="panel-buttons"><button class="fold" aria-label="Fold away">${icon("collapse", 2)}</button><button class="close wax" aria-label="Close">${icon("close", 2)}</button></span></header>
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
    "Map terrain",
    `${TERRAINS.length} tile types drawn from real data, grouped by landscape; docs/terrain.md says where each comes from and what it does in play. The Köppen-Geiger climate map (Beck et al. 2018) decides the climate zone (rainforest, savanna, steppe, desert, Mediterranean, taiga, tundra, ice), and Natural Earth's mountain ranges are filled edge to edge with mountains whose look follows the climate: snowy peaks in alpine and polar climates and on the high core of big ranges, grey rock below, red rock in deserts, green slopes in the tropics. Woods (broadleaf in the temperate south, pine in the north) and fields break the land up, with rice paddies in monsoon Asia. Zoomed out, each map pixel takes its tile type's colour with hill shading; at middle zoom every map pixel becomes 4 × 4 art pixels, and close in 8 × 8 from these hand-made 16 × 16 tiles. Under a realm the land is washed in its colour at every zoom, with an ink border and a bright band of the realm's colour inside it. The sea is shaded by real depth in five bands, dithered into each other.`,
  );
  // Each tile type as a 2 × 2 block of its four tiles: the ranges then show
  // their whole 32 × 32 picture, the rest four variants side by side.
  const block = (row: number) => {
    const c = document.createElement("canvas");
    c.width = c.height = 16 * 2 * 3;
    const ctx = c.getContext("2d")!;
    for (let v = 0; v < VARIANTS; v++) ctx.drawImage(tileCanvas(row, v, 3), (v & 1) * 48, (v >> 1) * 48);
    return c;
  };
  const groups: [string, [string, number][]][] = [
    ...Object.entries(TERRAIN_CATEGORIES).map(([cat, list]) => [cat, list.map((t) => [t, TERRAINS.indexOf(t)])] as [string, [string, number][]]),
    ["Water", [["coastal sea", SHALLOW_ROW], ["open ocean", SEA_ROW]]],
  ];
  for (const [cat, list] of groups) {
    body.insertAdjacentHTML("beforeend", `<h3>${esc(cat)}</h3>`);
    const r = document.createElement("div");
    r.className = "row tiles";
    for (const [name, row] of list) r.append(figure(block(row), BIG_ROWS.includes(row) ? `${name} (one range)` : name));
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
  const body = section("Sprites", "Drawn pixel by pixel in src/art/sprites.ts with an ink outline added around each. Banners, roofs and caparisons take the owner's colour in three shades. They grow by whole steps as you zoom so pixels never blur.");
  const colors = ["france", "england", "ottomans", "ming"].map(nation);
  for (const name of Object.keys(SPRITES) as SpriteName[]) {
    const row = document.createElement("div");
    row.className = "row";
    for (const scale of [2, 3, 4]) row.append(figure(sprite(name, colors[0]!.color, scale), `${name} ${scale}×`));
    for (const n of colors.slice(1)) row.append(figure(sprite(name, n.color, 3), n.name));
    body.append(row);
  }
}

// Portraits
{
  const body = section(
    "Portraits",
    "Commanders and officials get a face from their name: skin, hair, beard and headwear picked by a hash of it, dress by where their realm lies, and the realm's colour in the clothes and backdrop. The same person always looks the same.",
  );
  const looks: [Look, string, string][] = [
    ["europe", "castile", "Álvaro de Luna"], ["levant", "ottomans", "Zaganos Pasha"], ["steppe", "great_horde", "Ahmad Khan"], ["eastAsia", "ming", "Yu Qian"],
    ["southAsia", "vijayanagar", "Deva Raya Nayaka"], ["africa", "mali", "Mansa Uli"], ["americas", "aztecs", "Tlacaelel"],
  ];
  for (const kind of ["commander", "official"] as const) {
    const row = document.createElement("div");
    row.className = "row";
    for (const [look, id, name] of looks)
      for (const k of [0, 1]) row.append(figure(portrait({ name: `${name}${k ? " II" : ""}`, color: nation(id).color, kind, look }, 3), `${kind} · ${look}`));
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
    ...DEPTH_COLORS.map((c, i) => [`sea ${["shelf", "slope", "deep", "abyss", "trench"][i]}`, c] as [string, string]),
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
