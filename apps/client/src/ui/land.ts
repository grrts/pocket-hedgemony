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
const USE_TEXT: Record<string, { name: string; work: string | null; about: string }> = {
  fields: { name: "Fields", work: "farm", about: "Farmers grow grain here. A farm gives them work at the full rate; without one they work bare land at 0.67." },
  pasture: { name: "Pasture", work: "ranch", about: "Herders keep flocks here. A ranch gives them work at 1.33 and wool; without one they herd at 0.67." },
  woods: { name: "Woods", work: "lumber camp", about: "Woodsmen hunt and gather here at 0.67. A lumber camp cuts timber, so works needing it cost less." },
  marsh: { name: "Marsh", work: null, about: "Wet land: little grows. Draining it (an invention) turns it to fields." },
  waste: { name: "Waste", work: "quarry", about: "Rock, scrub or sand. A quarry on rocky ground cuts stone, so works needing it cost less." },
  shore: { name: "Shore", work: "fishery", about: "Seafolk fish here. A fishery gives them work at 1.33; without one they fish at 0.67." },
  town: { name: "Town", work: null, about: "The town's buildings stand here, one to a slot: the Build tab orders them." },
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
        <b>${esc(USE_TEXT[t.use]!.name)}</b>${t.building ? `<small>${esc(t.building)}</small>` : ""}</button>`,
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
    t.ware ? `<dt>Gives</dt><dd>${t.ware.amount.toFixed(1)} loads of ${esc(t.ware.name)} a year</dd>` : "",
    `<dt>Worked by</dt><dd>${t.building ? esc(cap(t.building)) : "no building: bare land"}</dd>`,
  ].join("");
  const work = text.work ? s.works.indexOf(text.work) : -1;
  const row = work >= 0 ? (s.buildSheets[p] ?? []).find((r) => r.work === work) : undefined;
  const action = row
    ? row.why === null
      ? `<button class="wax" data-build="${row.work}">${t.building ? "Improve" : "Build"}: ${esc(cap(row.name))}</button><p class="hint">${esc(row.effect)}</p>`
      : row.why === "built to the top"
        ? ""
        : `<p class="hint">${esc(cap(row.name))}: ${esc(row.why)}.</p>`
    : "";
  return `<div class="land-sheet">
    <h3 class="sub">${esc(text.name)}</h3>
    <p>${esc(text.about)}</p>
    <dl class="facts">${facts}</dl>
    ${action}
  </div>`;
}
