import type { SettlementView, Snapshot } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The peace table on an enemy's war card (WAR-248): what the war lets you
 * ask, where that comes from, each province of theirs you hold with its price
 * as a 44-point toggle, gold in steps, a bar of what is asked against what is
 * allowed, and the offer. The choice is a draft kept on the client until it is
 * sent; the engine checks it again by the same counts.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export interface PeaceDraft {
  provinces: number[];
  gold: number;
}

/** The draft starts as the most the war allows, as the AI would ask it. */
export const startDraft = (v: SettlementView): PeaceDraft => ({ provinces: [...v.best.provinces], gold: v.best.gold });

/** Points a draft asks: its provinces' prices and a point for every step of gold (WAR-242). */
export function draftCost(v: SettlementView, d: PeaceDraft): number {
  const cost = new Map(v.provinces.map((p) => [p.province, p.cost]));
  return d.provinces.reduce((t, p) => t + (cost.get(p) ?? 0), 0) + Math.ceil(d.gold / v.goldPerPoint);
}

/** Keeps a draft to what can still be asked: provinces still on the table and allowed, gold up to their treasury. */
export function fitDraft(v: SettlementView, d: PeaceDraft): PeaceDraft {
  const ok = new Set(v.provinces.filter((p) => !p.why).map((p) => p.province));
  return { provinces: d.provinces.filter((p) => ok.has(p)), gold: Math.min(d.gold, v.maxGold) };
}

/** Tapping a province adds it to the draft or takes it out; one over the realm's limit is refused. */
export function togglePick(v: SettlementView, d: PeaceDraft, p: number): PeaceDraft {
  if (d.provinces.includes(p)) return { ...d, provinces: d.provinces.filter((x) => x !== p) };
  const row = v.provinces.find((x) => x.province === p);
  if (!row || row.why) return d;
  const most = v.mostPerRealm.find((x) => x.realm === row.realm)?.most ?? 0;
  const from = d.provinces.filter((x) => v.provinces.find((y) => y.province === x)?.realm === row.realm).length;
  return from >= most ? d : { ...d, provinces: [...d.provinces, p] };
}

/** Gold goes up or down a step (what one point buys), between none and their treasury. */
export const stepGold = (v: SettlementView, d: PeaceDraft, by: number): PeaceDraft => ({ ...d, gold: Math.max(0, Math.min(v.maxGold, d.gold + by * v.goldPerPoint)) });

const PART_NAMES = {
  land_held: "Their land you hold",
  capital_held: "Their capital held",
  battles: "Battles won",
  armies: "Your armies' edge",
  will_to_fight: "Their wish for peace",
} as const;

export interface PeaceTableNames {
  province: (p: number) => string;
  realm: (n: number) => string;
  /** Provinces of yours their side holds, for the Give up choice. */
  lost: number;
}

/** The peace table (WAR-248). */
export function peaceTable(v: SettlementView, d: PeaceDraft, names: PeaceTableNames): string {
  const asked = draftCost(v, d);
  const over = asked - v.capacity;
  const realms = new Set(v.provinces.map((p) => p.realm));
  const picked = new Set(d.provinces);
  const fromRealm = (r: number) => d.provinces.filter((p) => v.provinces.find((x) => x.province === p)?.realm === r).length;
  const most = (r: number) => v.mostPerRealm.find((x) => x.realm === r)?.most ?? 0;
  const rows = v.provinces
    .map((p) => {
      const on = picked.has(p.province);
      const full = !on && fromRealm(p.realm) >= most(p.realm);
      const why = p.why ?? (full ? `one peace takes at most ${most(p.realm)} of ${names.realm(p.realm)}'s provinces` : realms.size > 1 ? names.realm(p.realm) : "");
      return `<button class="paper peace-pick${on ? " on" : ""}" data-peace-pick="${p.province}" aria-pressed="${on}"${p.why || full ? " disabled" : ""}>
        <span class="box" aria-hidden="true">${on ? "✓" : ""}</span>
        <span class="what">${esc(names.province(p.province))}${why ? `<small>${esc(why)}</small>` : ""}</span>
        <b class="num" title="Price">${p.cost}</b></button>`;
    })
    .join("");
  const fill = v.capacity > 0 ? Math.min(100, (asked / v.capacity) * 100) : asked > 0 ? 100 : 0;
  const verdict =
    !asked ? "Choose land or gold to ask for."
    : over > 0 ? `Over by <b>${over}</b>: they will offer what fits, or refuse.`
    : "Within what the war allows: they will sign.";
  const gold = v.maxGold >= v.goldPerPoint
    ? `<div class="peace-gold">
        <button class="paper" data-peace-gold="-1" aria-label="Less gold"${d.gold <= 0 ? " disabled" : ""}>−</button>
        <span>${icon("coin", 1)} <b>${d.gold}</b> gold <small>of their ${v.maxGold} · ${Math.ceil(d.gold / v.goldPerPoint)} to the price, 1 for each ${v.goldPerPoint}</small></span>
        <button class="paper" data-peace-gold="1" aria-label="More gold"${d.gold + v.goldPerPoint > v.maxGold ? " disabled" : ""}>+</button>
      </div>`
    : `<p class="hint">Their treasury is empty: no gold to ask.</p>`;
  return `<section class="peace-table">
    <h3 class="sub">Peace table</h3>
    ${v.surrendered ? `<p class="peace-surrender">${icon("crown", 1)} They have surrendered. Ask anything the table allows and they sign.</p>` : ""}
    <p class="hint">${v.whole ? "Peace with them ends the whole war." : "A separate peace: the rest of the war goes on."} Each province of theirs you hold has a price. The war lets you ask up to <b>${v.capacity}</b>; all their land is worth ${v.realmValue}.</p>
    <div class="peace-meter${over > 0 ? " over" : ""}" role="img" aria-label="Asked ${asked} of ${v.capacity}"><i style="width:${fill.toFixed(1)}%"></i></div>
    <p class="meter-caption">Asked <b>${asked}</b> of <b>${v.capacity}</b>. ${verdict}</p>
    <details class="peace-why"><summary>Where the ${v.capacity} comes from</summary>
      <ul>${v.parts.map((p) => `<li><span class="what">${PART_NAMES[p.part]}</span><b class="num">${Math.round(p.points)}</b></li>`).join("")}</ul>
      <p class="hint">Land, their capital and battles are what you have won; your armies' edge and their wish for peace make it weigh more. A realm that can fight no more surrenders, and then all of it may be asked.</p>
    </details>
    <h4 class="sub">Their land you hold</h4>
    ${rows ? `<div class="peace-picks">${rows}</div>` : `<p class="hint">You hold none of their land yet: take their castles first.</p>`}
    ${rows ? `<p class="hint">One peace takes at most a third of a realm's provinces, and its capital only with its last.</p>` : ""}
    ${gold}
    <div class="choices">
      <button class="wax" data-peace-offer${asked ? "" : " disabled"}>${icon("crown", 1)}Offer these terms</button>
      <button class="paper" data-peace-best>Ask the most the war allows</button>
      <button class="paper" data-peace="white">White peace</button>
      ${names.lost ? `<button class="paper" data-peace="give">Give up ${names.lost} province${names.lost === 1 ? "" : "s"}</button>` : ""}
    </div>
  </section>`;
}

/** "Leon, Toro and 50 gold". */
export function termsText(o: { provinces?: number[]; gold?: number }, name: (p: number) => string): string {
  const parts = [...(o.provinces ?? []).map((p) => esc(name(p))), ...((o.gold ?? 0) > 0 ? [`${o.gold} gold`] : [])];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "nothing");
}

/** What a peace offer to the player says, in one line (SHELL-092). */
export function offerLine(o: Snapshot["peaceOffers"][number], name: (p: number) => string): string {
  const what = termsText(o, name);
  if (o.surrender) return `has surrendered unconditionally. It will sign ${what}, or open its peace table and ask anything the rules allow`;
  if (o.counter) return `will not give all you asked, but offers ${what}`;
  if (o.terms === "give") return o.provinces ? `offers peace and gives you ${what}` : "offers peace and gives up the land you hold of theirs";
  if (o.terms === "take") return o.provinces ? `offers peace if you give it ${what}` : "asks for the land it holds of yours";
  return "offers a white peace: no land changes hands";
}
