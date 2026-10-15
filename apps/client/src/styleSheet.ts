// Art style sheet: every visual building block of the game on one page, for review.
import { loadDefaultRuleset } from "@ph/rules";
import { hexToRgb, PALETTE, TERRAIN_COLORS, TERRAINS } from "./art/palette.ts";
import { sprite, SPRITES, type SpriteName } from "./art/sprites.ts";

const rules = loadDefaultRuleset();
const root = document.querySelector<HTMLElement>("#sheet")!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Same hash as the map shader, so the terrain samples match the game exactly. */
function hash(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h & 0xffff) / 65535;
}

function terrainShade(t: number, x: number, y: number): number {
  const h = hash(x, y);
  if (t === 3) return (y % 3 === 0 && (x + Math.floor(y / 3)) % 4 === 0) || h > 0.86 ? 0.72 : 1;
  if (t === 6 || t === 9) return (x + y) % 3 === 0 && h > 0.4 ? 0.8 : 1;
  if (t === 2) return y % 4 === 0 && h > 0.5 ? 0.86 : 1;
  if (t === 7 || t === 4) return h > 0.92 ? 0.85 : 1;
  if (t === 5) return y % 2 === 0 && h > 0.7 ? 0.84 : 1;
  return h > 0.95 ? 0.9 : 1;
}

function terrainTile(t: number, fill: [number, number, number], political: boolean, scale = 4, size = 24): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size * scale;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = political ? 1 + (terrainShade(t, x, y) - 1) * 0.6 : terrainShade(t, x, y);
      ctx.fillStyle = `rgb(${fill.map((v) => Math.round(v * s)).join(",")})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

function seaTile(scale = 4, size = 24): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size * scale;
  const ctx = c.getContext("2d")!;
  const coast = hexToRgb(PALETTE.sea).map((v, i) => Math.round(v * 0.65 + hexToRgb(PALETTE.foam)[i]! * 0.35));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const land = x + y * 0.4 > 18;
      const nearLand = !land && x + 1 + y * 0.4 > 18;
      ctx.fillStyle = land ? PALETTE.grass : nearLand ? `rgb(${coast.join(",")})` : hash(x, y) > 0.93 ? PALETTE.sea : PALETTE.deepSea;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

const figure = (el: HTMLElement, caption: string) => {
  const f = document.createElement("figure");
  f.append(el);
  f.insertAdjacentHTML("beforeend", `<figcaption>${esc(caption)}</figcaption>`);
  return f;
};

function section(title: string, intro: string): HTMLElement {
  root.insertAdjacentHTML("beforeend", `<h2>${esc(title)}</h2><p>${intro}</p>`);
  const body = document.createElement("div");
  root.append(body);
  return body;
}

root.innerHTML = `
  <h1>POCKET HEGEMONY · ART STYLE</h1>
  <p>Everything on screen is built from the pieces below: one 32-colour palette, map pixels drawn as hard square blocks,
  hand-drawn sprites at whole-number scales, and chunky framed panels. <a href="./">Open the game</a>.</p>`;

// Palette
{
  const body = section("Palette", "Interface, sea and terrain colours. Nation colours come from the same family.");
  body.className = "grid";
  for (const [name, hex] of Object.entries(PALETTE)) {
    body.insertAdjacentHTML("beforeend", `<div class="chip"><div class="sw" style="background:${hex}"></div>${name}<br>${hex}</div>`);
  }
}

// Nations
{
  const body = section("Nation colours", `${rules.nations.length} nations in 1444. Neighbours never share a colour; the big powers have fixed ones.`);
  body.className = "grid";
  const size = new Map<string, number>();
  for (const p of rules.provinces) if (p.owner) size.set(p.owner, (size.get(p.owner) ?? 0) + 1);
  const top = [...rules.nations].sort((a, b) => (size.get(b.id) ?? 0) - (size.get(a.id) ?? 0)).slice(0, 24);
  for (const n of top) {
    body.insertAdjacentHTML("beforeend", `<div class="chip"><div class="sw" style="background:${n.color}"></div>${esc(n.name)}<br>${size.get(n.id)} provinces</div>`);
  }
}

// Terrain
{
  const body = section(
    "Terrain",
    "Each map pixel gets a fixed pattern of darker pixels by terrain. Top row: terrain map mode. Bottom row: the same terrain under a nation's colour (political mode), where the pattern is softer.",
  );
  const row1 = document.createElement("div");
  const row2 = document.createElement("div");
  row1.className = row2.className = "row";
  const france = hexToRgb(rules.nations.find((n) => n.id === "FRA")!.color);
  TERRAINS.forEach((t, i) => {
    row1.append(figure(terrainTile(i, hexToRgb(TERRAIN_COLORS[t]), false), t));
    row2.append(figure(terrainTile(i, france, true), t));
  });
  row1.append(figure(seaTile(), "sea and coast"));
  body.append(row1, row2);
}

// Sprites
{
  const body = section(
    "Sprites",
    "Drawn pixel by pixel in src/art/sprites.ts. Banners and roofs take the owner's colour. They grow by whole steps (1×, 2×, 3×, 4×) as you zoom so pixels never blur.",
  );
  const colors = ["FRA", "ENG", "TUR", "MNG"].map((id) => rules.nations.find((n) => n.id === id)!);
  for (const name of Object.keys(SPRITES) as SpriteName[]) {
    const row = document.createElement("div");
    row.className = "row";
    for (const scale of [1, 2, 3, 4]) row.append(figure(sprite(name, colors[0]!.color, scale), `${name} ${scale}×`));
    for (const n of colors.slice(1)) row.append(figure(sprite(name, n.color, 3), n.name));
    body.append(row);
  }
}

// Zoom levels
section(
  "Zoom levels",
  `The map is ${rules.map!.width.toLocaleString()} × ${rules.map!.height.toLocaleString()} pixels with ${rules.provinces.length.toLocaleString()} provinces.
  <br>· <b>World</b>: nation colours and big nation names.
  <br>· <b>Region</b> (pinch in once): capitals appear as castles.
  <br>· <b>Theatre</b>: armies appear, led by their commander sprite.
  <br>· <b>Local</b>: every province has a town, commanders show their name and army size, province borders are drawn.
  <br>· <b>Close</b>: province names. Tap a province for its details and the commanders stationed there.`,
);

// UI
{
  const body = section("Interface", "Hard-edged frames with a light inner line and a solid drop shadow, in a monospace bold font. Touch targets are at least 44 pixels.");
  body.innerHTML = `
    <div class="row">
      <button>Move</button>
      <button class="end-turn" style="margin-left:0">End turn ▶</button>
      <button class="icon">🗺</button>
      <button disabled>Busy…</button>
    </div>
    <section class="panel demo-panel">
      <h2>Île-de-France</h2>
      <p class="owner"><span class="swatch" style="background:${rules.nations.find((n) => n.id === "FRA")!.color}"></span>France · farmland · coast</p>
      <p class="dev">Tax 9 · Production 8 · Manpower 9</p>
      <div class="army"><span><b>Jean de Dunois</b> <small>fire 2 · shock 3 · maneuver 3</small><br>5,000 men of France</span><button>Move</button></div>
    </section>`;
}
