import type { LandTileRow, Snapshot } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The province's Land tab (feedback 80, 87; PROV-010, PROV-011): its tiles
 * as a grid of 44-point squares coloured by use, the province's food against
 * its people at the top, and a sheet under the grid for the tile tapped:
 * what it is, who works it, what it gives, and the building that would work
 * it better, with its Build button or why not.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const people = (thousands: number) => Math.round(thousands * 1000).toLocaleString("en-US");

/** What each use is called on the tab, and the work that improves it. */
const USE_TEXT: Record<string, { name: string; works: string[]; about: string }> = {
  fields: { name: "Fields", works: ["farm"], about: "Farmers grow grain here. A farm gives them work at the full rate; without one they work bare land at 0.67." },
  pasture: { name: "Pasture", works: ["ranch"], about: "Herders keep flocks here. A ranch gives them work at 1.33 and wool; without one they herd at 0.67." },
  woods: { name: "Woods", works: ["hunting lodge", "lumber camp"], about: "Woodsmen hunt and gather here, best in the northern woods. Too many hunters thin the game; a hard winter cuts the catch. A hunting lodge brings in half as much again (and furs in the north); a lumber camp cuts timber, so works needing it cost less." },
  marsh: { name: "Marsh", works: [], about: "Wet land: little grows. Draining it (an invention) turns it to fields." },
  waste: { name: "Waste", works: ["mine", "quarry"], about: "Rock, scrub or sand. In hills and mountains it may hold an ore deposit of iron, copper, tin, silver, gold or rock salt: a mine digs it until it runs out, and needs timber from a lumber camp here or next door. A quarry on rocky ground cuts stone, so works needing it cost less." },
  shore: { name: "Shore", works: ["fishery", "saltworks"], about: "Seafolk fish here. A fishery gives them work at 1.33; without one they fish at 0.67. On a dry or warm coast, saltworks make salt from the sea." },
  town: { name: "Town", works: [], about: "The town's buildings stand here, one to a slot: the Build tab orders them." },
};

/** The Land tab. `chosen` is the tile tapped, or -1. */
export function provinceLand(s: Snapshot, p: number, chosen: number): string {
  const tiles = s.landSheets[p] ?? [];
  const fed = tiles.reduce((a, t) => a + t.feeds, 0);
  const needs = s.provincePeople[p]!;
  const pct = needs > 0 ? Math.round((fed / needs) * 100) : 100;
  const grid = tiles
    .map(
      (t, i) => `<button class="land-tile use-${t.use}${i === chosen ? " on" : ""}" data-land-tile="${i}" aria-pressed="${i === chosen}" title="${esc(USE_TEXT[t.use]!.name)}">
        <b>${esc(USE_TEXT[t.use]!.name)}</b>${t.changing ? `<small>→ ${esc(USE_TEXT[t.changing.to]!.name)}</small>` : t.building ? `<small>${esc(t.building)}</small>` : ""}</button>`,
    )
    .join("");
  return `
    <p class="${pct < 100 ? "warn" : ""}">${icon("scroll", 1)} The land feeds <b>${people(fed)}</b> of ${people(needs)} people in a normal year (<b>${pct} %</b>).</p>
    <div class="land-grid" role="group" aria-label="Tiles">${grid}</div>
    ${chosen >= 0 && tiles[chosen] ? tileSheet(s, p, tiles[chosen]!) : `<p class="hint">Tap a tile to see who works it and what would work it better.</p>`}`;
}

function tileSheet(s: Snapshot, p: number, t: LandTileRow): string {
  const text = USE_TEXT[t.use]!;
  const facts = [
    t.workers > 0 ? `<dt>Working it</dt><dd>${people(t.workers)}</dd>` : "",
    t.feeds > 0 ? `<dt>Feeds</dt><dd>${people(t.feeds)} a year</dd>` : "",
    t.game ? `<dt>Game</dt><dd>${t.game.left > 0.85 ? "plenty" : t.game.left > 0.55 ? "thinning: too many hunters" : "scarce: too many hunters"}${t.game.hardWinter ? "; a hard winter this year" : ""}</dd>` : "",
    t.seam ? `<dt>Ore deposit</dt><dd>${esc(t.seam.ware)}, ${t.seam.years} years of digging left</dd>` : t.use === "waste" ? `<dt>Ore deposit</dt><dd>none found</dd>` : "",
    t.ware ? `<dt>Gives</dt><dd>${t.ware.amount.toFixed(1)} loads of ${esc(t.ware.name)} a year</dd>` : "",
    `<dt>Worked by</dt><dd>${t.building ? esc(cap(t.building)) : "no building: bare land"}</dd>`,
  ].join("");
  // One action per building that works this use: its Build or Improve button, or why it can't be built.
  const action = text.works
    .map((name) => {
      const work = s.works.indexOf(name);
      const row = work >= 0 ? (s.buildSheets[p] ?? []).find((r) => r.work === work) : undefined;
      if (!row || row.why === "built to the top") return "";
      return row.why === null
        ? `<button class="wax" data-build="${row.work}">${row.step > 1 ? "Improve" : "Build"}: ${esc(cap(row.name))}</button><p class="hint">${esc(row.effect)}</p>`
        : `<p class="hint">${esc(cap(row.name))}: ${esc(row.why)}.</p>`;
    })
    .join("");
  return `<div class="land-sheet">
    <h3 class="sub">${esc(text.name)}</h3>
    <p>${esc(text.about)}</p>
    <dl class="facts">${facts}</dl>
    ${action}
    ${changeBlock(t)}
  </div>`;
}

const years = (months: number) => (months % 12 === 0 ? `${months / 12} year${months === 12 ? "" : "s"}` : `${months} months`);

/** The tile's change under way with a bar and Stop, or the one to three changes it offers (feedback 86). */
function changeBlock(t: LandTileRow): string {
  if (t.changing) {
    const done = t.changing.months - t.changing.monthsLeft;
    const pct = Math.round((done / t.changing.months) * 100);
    return `<h3 class="sub">Changing</h3>
      <p>${esc(t.changing.title)}: <b>${esc(USE_TEXT[t.changing.to]!.name)}</b> in ${years(t.changing.monthsLeft)}.</p>
      <span class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></span>
      <button class="paper" data-stop-change>Stop (half the gold back)</button>`;
  }
  if (!t.changes.length) return "";
  const rows = t.changes
    .map((c) =>
      c.why === null
        ? `<button class="paper land-change" data-change-tile="${esc(c.change)}"><b>${esc(c.title)}</b><small>to ${esc(USE_TEXT[c.to]!.name.toLowerCase())} · ${c.gold.toFixed(1)} gold · ${years(c.months)}</small></button>`
        : `<p class="hint">${esc(c.title)}: ${esc(c.why)}.</p>`,
    )
    .join("");
  return `<h3 class="sub">Change its use</h3>${rows}<p class="hint">One change at a time in a province. The ground stays what it is.</p>`;
}
