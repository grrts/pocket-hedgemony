import { catalogueIdOf, catalogueRecord, hasRecord, type WaysToGrow, waysToGrowLine } from "@ph/engine/domain/scenario-setup";

/**
 * The realm picker before a game starts (scenario-setup SETUP-053, SETUP-072
 * to SETUP-075). The "Choose your realm" sheet has one Region select: with
 * Suggested chosen it lists the suggested realms, one per part of the world
 * and one per part of Africa; with a region chosen the map frames the
 * region's realms and the sheet lists every one of them by name, A to Z, one
 * 44-point row each (pennant, name, start standing, size), so a realm of one
 * province is never only a speck to hit. A row opens the realm's card, which
 * carries the realm at a glance and the one line Ways to grow, then Rule.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export interface RegionChoice {
  id: string;
  name: string;
  /** How many realms start there. */
  count: number;
}

/** The Region select: Suggested realms first, then every region that has realms, each with its count. */
export function regionSelectHtml(regions: readonly RegionChoice[], chosen: string, total: number): string {
  const opt = (id: string, label: string) => `<option value="${esc(id)}"${id === chosen ? " selected" : ""}>${esc(label)}</option>`;
  return `<label class="pick-region"><span>Region</span><select data-pick-region aria-label="Show the realms of a region">
    ${opt("", `Suggested realms (${total} in all)`)}
    ${regions.filter((r) => r.count > 0).map((r) => opt(r.id, `${r.name} (${r.count})`)).join("")}
  </select></label>`;
}

export interface PickRow {
  /** The realm's index, as [data-realm] opens it. */
  index: number;
  name: string;
  provinces: number;
  standing: string;
  pennant: string;
}

/** Rows sorted by name, A to Z (SETUP-072), the way a player looks for a realm they have in mind. */
export function sortRows(rows: readonly PickRow[]): PickRow[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/** Every realm of the region, one 44-point row each; a row opens that realm's card. */
export function regionListHtml(region: string, rows: readonly PickRow[]): string {
  return `<p class="hint pick-count">${rows.length} realm${rows.length === 1 ? "" : "s"} in ${esc(region)}, A to Z. Tap one to see its card.</p>
    <ul class="pick-list">${sortRows(rows)
      .map(
        (r) => `<li><button class="paper pick-row" data-realm="${r.index}" data-pick-realm="${r.index}">${r.pennant}<span class="nation-name">${esc(r.name)}<small class="starts">${r.provinces} province${r.provinces === 1 ? "" : "s"} · ${esc(r.standing)}</small></span></button></li>`,
      )
      .join("")}</ul>`;
}

/** The assessments read as strengths at a glance, in plain words (the Strength group of the Heritage tab). */
const STRENGTHS: [string, string][] = [
  ["economic_strength", "economy"],
  ["manpower_potential", "manpower"],
  ["military_capability", "army"],
  ["naval_capability", "navy"],
  ["trade_access", "trade"],
  ["diplomatic_influence", "standing abroad"],
];

/** What a realm starts strong in, from its catalogue record's assessments (high or very high), or null. */
export function strongIn(mapId: string): string[] | null {
  const record = catalogueIdOf(mapId);
  if (!record || !hasRecord(record)) return null;
  const a = catalogueRecord(record).assessments;
  return STRENGTHS.filter(([d]) => a[d]?.level === "high" || a[d]?.level === "very_high").map(([, w]) => w);
}

/** The strengths in words for a card: the list, "nothing marked", or "not recorded" without a record. */
export function strongInWords(mapId: string): string {
  return strongWords(strongIn(mapId));
}

function strongWords(strong: string[] | null): string {
  return strong === null ? "not recorded" : strong.length ? strong.join(", ") : "nothing marked";
}

export interface PickerCard {
  form: string;
  provinces: number;
  people: string;
  strong: string[] | null;
  ways: WaysToGrow;
}

/** The realm at a glance on its picker card (SETUP-073): form, size, people, strengths and Ways to grow. */
export function pickerCardHtml(c: PickerCard): string {
  const strong = strongWords(c.strong);
  return `<dl class="facts pick-facts">
      <dt>Government</dt><dd>${esc(c.form)}</dd>
      <dt>Provinces</dt><dd>${c.provinces}</dd>
      <dt>People</dt><dd>${esc(c.people)}</dd>
      <dt>Strong in</dt><dd>${esc(strong)}</dd>
    </dl>
    ${waysToGrowHtml(c.ways)}`;
}

/** The one line Ways to grow, read from the start (SETUP-073). */
export function waysToGrowHtml(w: WaysToGrow): string {
  return `<p class="ways-to-grow"><b>Ways to grow:</b> ${esc(waysToGrowLine(w))}</p>`;
}
