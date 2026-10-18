import type { Ruleset } from "@ph/rules";
import { portrait } from "../art/portraits.ts";
import type { Titles } from "@ph/engine";
import { lookOf } from "./people.ts";
import { DEFAULT_TITLES, an, cap } from "./titles.ts";

/**
 * Lords in the panels (feedback 60, 64, 65, 67, 70): portraits, the Lords
 * tab as a list of rows that open a lord's own screen, the lord's screen with
 * his lands, a button that lights them up on the map, gifts, seizing and
 * granting fiefs, and the governance card at the top of a province.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const gold2 = (g: number) => (Math.abs(g) < 10 ? g.toFixed(2) : g.toFixed(1));

export interface LordView {
  /** Index into the snapshot's lords. */
  k: number;
  name: string;
  house: string;
  nation: number;
  loyalty: string;
  lands: number;
}

/** What each loyalty step means for the crown. */
export const LOYALTY_NOTE: Record<string, string> = {
  Loyal: "gives half his lands' tax and recruits",
  Wavering: "gives half, but a step from disloyal",
  Disloyal: "gives nothing",
  "In revolt": "has risen against you",
};

/** Worst first, for sorting. */
export const LOYALTY_ORDER = ["In revolt", "Disloyal", "Wavering", "Loyal"];

export function lordPortrait(rules: Ruleset, lord: { name: string; nation: number }, scale = 3): string {
  return portrait({ name: lord.name, color: rules.nations[lord.nation]!.color, kind: "lord", look: lookOf(rules, lord.nation), nation: rules.nations[lord.nation]!.id }, scale);
}

/** A coloured tag for a loyalty step. */
export function loyaltyBadge(loyalty: string): string {
  return `<span class="loyalty loyalty-${loyalty.toLowerCase().replace(/\s+/g, "-")}">${esc(loyalty)}</span>`;
}

/** What a lord's lands add up to: people, the gold that reaches the crown and the provinces themselves. */
export interface LordLands {
  provinces: number[];
  people: number;
  crownGold: number;
}

/**
 * The realm's Lords tab: royal land against the lords' share on top, then a
 * row per lord (portrait, house, loyalty, lands and what he gives), the
 * troublesome first. A row opens the lord's screen.
 */
export function lordsTab(rules: Ruleset, lords: LordView[], lands: Map<number, LordLands>, royal: number, all: number, t: Titles = DEFAULT_TITLES): string {
  const sorted = [...lords].sort((a, b) => LOYALTY_ORDER.indexOf(a.loyalty) - LOYALTY_ORDER.indexOf(b.loyalty) || b.lands - a.lands);
  const share = all ? Math.round(((all - royal) / all) * 100) : 0;
  const counts = LOYALTY_ORDER.map((l) => [l, lords.filter((x) => x.loyalty === l).length] as const).filter(([, c]) => c > 0);
  const rows = sorted
    .map((l) => {
      const ll = lands.get(l.k)!;
      return `<button class="paper lord-row" data-lord-open="${l.k}">
        ${lordPortrait(rules, l, 2)}
        <span class="lord-who"><b>${esc(l.name)}</b><small>House ${esc(l.house)} · ${l.lands} province${l.lands === 1 ? "" : "s"} · ${fmt(ll.people * 1000)} people</small></span>
        <span class="lord-state">${loyaltyBadge(l.loyalty)}<small>${gold2(ll.crownGold)} gold a month</small></span>
      </button>`;
    })
    .join("");
  return `<div class="share-bar" title="Royal land against the ${esc(t.lords)}' land">
      <i style="width:${100 - share}%"></i>
    </div>
    <p><b>${royal}</b> of ${all} provinces are royal land and give you all their tax. ${lords.length ? `<b>${lords.length}</b> ${esc(lords.length === 1 ? `${t.lord} holds` : `${t.lords} hold`)} the other ${all - royal}: ${counts.map(([l, c]) => `${c} ${l.toLowerCase()}`).join(", ")}.` : ""}</p>
    ${lords.length ? `<div class="lord-list">${rows}</div>` : `<p class="hint">No ${esc(t.lords)}: every province is royal land.</p>`}
    <p class="hint">Open ${esc(an(t.lord))} to see his lands on the map, send a gift, seize land or grant him a province. Gifts, fiefs and quiet years raise loyalty; lost wars and seized land lower it.</p>`;
}

export interface ProvinceRow {
  province: number;
  name: string;
  /** Small picture of the province, a data URL. */
  thumb: string;
  note: string;
}

/**
 * A lord's own screen: who he is and how loyal, what his lands give, a
 * button that lights them up on the map, a gift, his lands (each opens its
 * province, with Seize), and royal provinces to grant him, nearest first.
 */
export function lordScreen(
  rules: Ruleset,
  l: LordView,
  ll: LordLands,
  o: { lit: boolean; gift: number; treasury: number; mine: boolean; holdings: ProvinceRow[]; grants: ProvinceRow[]; allGrants: boolean; court?: string },
  t: Titles = DEFAULT_TITLES,
): string {
  const row = (r: ProvinceRow, button: string) => `<div class="place-row">
      <button class="place" data-show-province="${r.province}" title="Show ${esc(r.name)} on the map">
        <img class="thumb" src="${r.thumb}" alt="" width="48" height="48"><span><b>${esc(r.name)}</b><small>${esc(r.note)}</small></span>
      </button>${button}</div>`;
  return `<div class="person-card">${lordPortrait(rules, l, 5)}
      <div><p><b>${esc(l.name)}</b></p><p>House ${esc(l.house)}</p><p>${loyaltyBadge(l.loyalty)}</p><p class="hint">He ${esc(LOYALTY_NOTE[l.loyalty] ?? "")}.</p></div>
    </div>
    <div class="choices">
      <button class="wax" data-lord-light="${l.k}" aria-pressed="${o.lit}">${o.lit ? "Stop showing his lands" : "Show his lands on the map"}</button>
      ${o.mine && l.loyalty !== "Loyal" ? `<button class="paper" data-gift="${l.k}" ${o.treasury < o.gift ? "disabled" : ""} title="A gift of gold raises his loyalty a step">Gift · ${o.gift} gold</button>` : ""}
    </div>
    ${o.court ?? ""}
    <dl class="facts">
      <dt>Lands</dt><dd>${ll.provinces.length} province${ll.provinces.length === 1 ? "" : "s"}, ${fmt(ll.people * 1000)} people</dd>
      <dt>To you</dt><dd>${gold2(ll.crownGold)} gold a month${l.loyalty === "Loyal" || l.loyalty === "Wavering" ? " (half of their tax)" : ""}</dd>
      <dt>${esc(cap(t.officials))}</dt><dd>His own run his lands; you can't commission them.</dd>
    </dl>
    <h3 class="sub">His lands · ${ll.provinces.length}</h3>
    <div class="place-list">${o.holdings.map((r) => row(r, o.mine ? `<button class="paper small" data-seize="${r.province}" title="Take it back as royal land: he loses a step, and every other ${esc(t.lord)} notices">Seize</button>` : "")).join("")}</div>
    ${o.mine ? `<h3 class="sub">Grant a province</h3>
      ${o.grants.length ? `<p class="hint">A fief raises his loyalty a step; the crown then gets half its tax. Nearest to his lands first.</p>
      <div class="place-list">${o.grants.map((r) => row(r, `<button class="paper small" data-grant="${r.province}" data-lord="${l.k}" title="Grant ${esc(r.name)} to ${esc(l.name)}">Grant</button>`)).join("")}</div>
      ${o.allGrants ? "" : `<button class="paper small more" data-grant-all>Show all royal provinces</button>`}` : `<p class="hint">No royal province to grant: the capital stays royal.</p>`}` : ""}
    <button class="back" data-back-lords>Back to the ${esc(t.lords)}</button>`;
}

/**
 * Who governs a province, first on its overview (feedback 60): the lord who
 * holds it (or royal land, with lords to grant it to) and its official.
 */
export function governanceCard(
  rules: Ruleset,
  o: { lord: LordView | null; mine: boolean; isCapital: boolean; province: number; official: string; grantOpen: boolean; takers: LordView[] },
  t: Titles = DEFAULT_TITLES,
): string {
  const lordRow = o.lord
    ? `<div class="army person">${lordPortrait(rules, o.lord, 3)}
        <span class="who"><b>${esc(o.lord.name)}</b><br><small>${esc(cap(t.lord))} · House ${esc(o.lord.house)}</small><br>${loyaltyBadge(o.lord.loyalty)}</span>
        <span class="army-buttons"><button class="paper small" data-lord-open="${o.lord.k}">${esc(cap(t.lord))}</button>${o.mine ? `<button class="paper small" data-seize="${o.province}" title="Take it back as royal land: he loses a step, and every other ${esc(t.lord)} notices">Seize</button>` : ""}</span>
      </div>
      ${o.mine ? `<p class="hint">He runs his land: his own ${esc(t.official)}, his tiles and his men. You set its tax (heavy taxes cost his loyalty), and a building you pay for here becomes his, a gift that wins a step of loyalty. Seize it to run it yourself.</p>` : ""}`
    : `<div class="army person royal"><span class="crest">♛</span>
        <span class="who"><b>Royal land</b><br><small>Not granted to any ${esc(t.lord)}. ${o.isCapital ? "The capital stays royal." : o.mine ? "All its tax and recruits reach you." : "Its tax and recruits go to the crown."}</small></span>
        ${o.mine && !o.isCapital && o.takers.length ? `<span class="army-buttons"><button class="paper small" data-grant-open aria-expanded="${o.grantOpen}">Grant as fief</button></span>` : ""}
      </div>
      ${o.grantOpen ? `<div class="grant-pick">${o.takers
        .map((t) => `<button class="paper person-tile" data-grant="${o.province}" data-lord="${t.k}">${lordPortrait(rules, t, 2)}<span><b>${esc(t.name)}</b><small>${esc(t.loyalty)} · ${t.lands} province${t.lands === 1 ? "" : "s"}</small></span></button>`)
        .join("")}</div>` : ""}`;
  return `<section class="governance"><h3 class="sub">Governed by</h3>${lordRow}${o.official}</section>`;
}
