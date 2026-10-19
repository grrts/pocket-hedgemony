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
  Loyal: "gives half his lands' tax and brings all his men when called to war",
  Wavering: "gives half his tax, brings half his men and leaves after 6 months; a step from disloyal",
  Disloyal: "gives nothing and won't come to war",
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
export function lordsTab(rules: Ruleset, lords: LordView[], lands: Map<number, LordLands>, royal: number, all: number, t: Titles = DEFAULT_TITLES, retinues: Map<number, RetinueRow> = new Map()): string {
  const sorted = [...lords].sort((a, b) => LOYALTY_ORDER.indexOf(a.loyalty) - LOYALTY_ORDER.indexOf(b.loyalty) || b.lands - a.lands);
  const share = all ? Math.round(((all - royal) / all) * 100) : 0;
  const counts = LOYALTY_ORDER.map((l) => [l, lords.filter((x) => x.loyalty === l).length] as const).filter(([, c]) => c > 0);
  const rows = sorted
    .map((l) => {
      const ll = lands.get(l.k)!;
      return `<button class="paper lord-row" data-lord-open="${l.k}">
        ${lordPortrait(rules, l, 2)}
        <span class="lord-who"><b>${esc(l.name)}</b><small>House ${esc(l.house)} · ${l.lands} province${l.lands === 1 ? "" : "s"} · ${fmt(ll.people * 1000)} people</small></span>
        <span class="lord-state">${loyaltyBadge(l.loyalty)}<small>${gold2(ll.crownGold)} gold a month${retinues.has(l.k) ? ` · ${RETINUE_SHORT[retinues.get(l.k)!.state]}` : ""}</small></span>
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
  o: { lit: boolean; gift: number; treasury: number; mine: boolean; holdings: ProvinceRow[]; grants: ProvinceRow[]; allGrants: boolean; court?: string; retinue?: string },
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
    ${o.retinue ?? ""}
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

/** A lord's retinue as the snapshot gives it (WAR-252 to WAR-262). */
export interface RetinueRow {
  lord: number;
  state: "ready" | "gathering" | "in the field" | "refuses" | "no men";
  wouldBring: number;
  atHome: number;
  cap: number;
  gathering?: { men: number; days: number };
  /** Index into the snapshot's armies, -1 when not in the field. */
  army: number;
  seat: number;
  refusal: string | null;
  /** Months in the field before a wavering lord goes home, or null: he stays to the end. */
  leavesAfter: number | null;
}

const weeks = (d: number) => {
  const w = Math.max(1, Math.ceil(d / 7));
  return `${w} week${w === 1 ? "" : "s"}`;
};

/** A retinue's state in words (WAR-260): never colour alone. */
export function retinueWords(r: RetinueRow, place: (p: number) => string, armyMen: (k: number) => number, armyAt: (k: number) => number): string {
  switch (r.state) {
    case "ready":
      return `ready: would bring ${fmt(r.wouldBring)} men`;
    case "gathering":
      return `gathering: ${fmt(r.gathering?.men ?? 0)} men at ${esc(place(r.seat))} in ${weeks(r.gathering?.days ?? 0)}`;
    case "in the field":
      return `in the field: ${fmt(armyMen(r.army))} men at ${esc(place(armyAt(r.army)))}`;
    case "refuses":
      return "refuses to come";
    case "no men":
      return "no men to send";
  }
}

/** Short state for the Lords tab row (WAR-261). */
export const RETINUE_SHORT: Record<RetinueRow["state"], string> = { ready: "men ready", gathering: "men gathering", "in the field": "in the field", refuses: "won't come", "no men": "no men" };

/**
 * The Army tab's Lords' men section (WAR-259 to WAR-262): one line summing the
 * lords' men, the Call the lords button (greyed, with the reason in words, at
 * peace), and a row per lord with his loyalty, state and Command.
 */
export function lordsMenSection(
  rules: Ruleset,
  rows: RetinueRow[],
  lords: LordView[],
  o: { atWar: boolean; place: (p: number) => string; armyMen: (k: number) => number; armyAt: (k: number) => number; armyId: (k: number) => number },
  t: Titles = DEFAULT_TITLES,
): string {
  if (!rows.length) return "";
  const sum = (st: RetinueRow["state"], men: (r: RetinueRow) => number) => {
    const of = rows.filter((r) => r.state === st);
    return { n: of.length, men: of.reduce((x, r) => x + men(r), 0) };
  };
  const ready = sum("ready", (r) => r.wouldBring);
  const gathering = sum("gathering", (r) => r.gathering?.men ?? 0);
  const field = sum("in the field", (r) => o.armyMen(r.army));
  const refusing = sum("refuses", () => 0);
  const parts = [
    ready.n ? `${ready.n} ready with ${fmt(ready.men)} men` : "",
    gathering.n ? `${gathering.n} gathering ${fmt(gathering.men)} men` : "",
    field.n ? `${field.n} in the field with ${fmt(field.men)}` : "",
    refusing.n ? `${refusing.n} refusing to come` : "",
  ].filter(Boolean);
  const callable = rows.some((r) => r.refusal === null);
  const why = !o.atWar ? `${cap(t.lords)} are called only at war.` : !callable ? `No ${t.lord} can be called now: each is out already, has no men or refuses.` : "";
  const byLord = new Map(lords.map((l) => [l.k, l]));
  const sorted = [...rows].sort((a, b) => LOYALTY_ORDER.indexOf(byLord.get(b.lord)!.loyalty) - LOYALTY_ORDER.indexOf(byLord.get(a.lord)!.loyalty) || b.wouldBring - a.wouldBring);
  return `<h3 class="sub">${esc(cap(t.lords))}' men</h3>
    <p class="retinue-sum">${parts.length ? parts.join(" · ") : `No ${esc(t.lord)} has men to send.`}</p>
    <button class="wax wide" data-call-lords ${o.atWar && callable ? "" : "disabled"}>Call the ${esc(t.lords)}</button>
    ${why ? `<p class="hint">${esc(why)}</p>` : `<p class="hint">Each comes by his loyalty: a loyal ${esc(t.lord)} brings all his men and stays to the end, a wavering one brings half, later, and leaves after some months, a disloyal one stays home. They cost you nothing and lead only their own men.</p>`}
    <div class="lord-list">${sorted
      .map((r) => {
        const l = byLord.get(r.lord)!;
        const button = r.state === "in the field" ? `<button class="paper small" data-command="${o.armyId(r.army)}">Command</button>` : `<button class="paper small" data-lord-open="${l.k}">Open</button>`;
        return `<div class="army retinue-row">${lordPortrait(rules, l, 2)}
          <span class="who"><b>${esc(l.name)}</b><br>${loyaltyBadge(l.loyalty)} <small>${retinueWords(r, o.place, o.armyMen, o.armyAt)}</small></span>
          <span class="army-buttons">${button}</span></div>`;
      })
      .join("")}</div>`;
}

/** The Retinue block on a lord's own screen (WAR-259, WAR-260): his men, and Call him, Command or Send him home. */
export function retinueBlock(l: LordView, r: RetinueRow, o: { atWar: boolean; place: (p: number) => string; armyMen: (k: number) => number; armyAt: (k: number) => number; armyId: (k: number) => number }): string {
  const buttons =
    r.state === "in the field"
      ? `<button class="paper" data-command="${o.armyId(r.army)}">Command</button><button class="paper" data-send-home="${o.armyId(r.army)}">Send him home</button>`
      : r.state === "gathering"
        ? ""
        : `<button class="wax" data-call-lord="${l.k}" ${r.refusal ? "disabled" : ""}>Call him · ${fmt(r.wouldBring)} men</button>`;
  return `<h3 class="sub">Retinue</h3>
    <dl class="facts">
      <dt>Now</dt><dd>${retinueWords(r, o.place, o.armyMen, o.armyAt)}</dd>
      <dt>At most</dt><dd>${fmt(r.cap)} men from his lands; ${fmt(r.atHome)} at home now</dd>
    </dl>
    ${buttons ? `<div class="choices">${buttons}</div>` : ""}
    ${r.refusal && r.state !== "in the field" && r.state !== "gathering" ? `<p class="hint">${esc(r.refusal.charAt(0).toUpperCase() + r.refusal.slice(1))}.</p>` : ""}`;
}
