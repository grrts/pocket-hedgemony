import type { FoodView, Snapshot } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The Food tab of the player's country card (feedback 84, 85; realm "How the
 * player uses it: the Food tab"): how the realm is fed at a glance, the
 * presets, one row of choices per setting, and every castle with its store,
 * what it feeds and whether war has cut it off. A castle's own settings sit
 * on its province's Overview (feedback 112); its row here opens it.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en");
const monthsText = (m: number) => `${m} month${m === 1 ? "" : "s"}`;

/** Labels the player reads for the realm data's choices. */
const SURPLUS_LABEL: Record<string, string> = { Keep: "Keep (it spoils)", "Sell to the treasury": "Sell to the treasury", "Send to the capital castle": "Send to the capital" };
const FAMINE_LABEL: Record<string, string> = { Off: "Off", "1 month": "Below 1 month", "3 months": "Below 3 months" };
const SPREAD_LABEL: Record<string, string> = { Tight: "Tight", "50/30/20": "Even", Wide: "Wide" };

type Choice = { value: string | number; label: string; note?: string };

/** One row of choice buttons; the chosen one stays pressed. `castle` -1 is the realm; a castle row starts with "Realm" (follow the realm again). */
function choiceRow(key: string, choices: Choice[], current: string | number | undefined, castle = -1): string {
  const button = (c: Choice | null) => {
    const on = c === null ? current === undefined : current === c.value;
    const value = c === null ? "null" : JSON.stringify(c.value);
    return `<button class="paper${on ? " on" : ""}" aria-pressed="${on}" data-food-key="${key}" data-food-value='${esc(value)}' data-food-castle="${castle}">${c === null ? "Realm" : esc(c.label)}${c?.note ? `<small>${esc(c.note)}</small>` : ""}</button>`;
  };
  return `<div class="choices food-choices">${castle >= 0 ? button(null) : ""}${choices.map(button).join("")}</div>`;
}

const collectionChoices = (f: FoodView): Choice[] => f.choices.collection.map((v) => ({ value: v, label: `${v} %` }));
const reserveChoices = (f: FoodView): Choice[] => f.choices.siegeReserve.map((v) => ({ value: v, label: v ? `${v} mo` : "None" }));

/** Whether the realm's settings are just what a preset sets. */
function presetOn(f: FoodView, name: string): boolean {
  const p = f.presets[name]!;
  const keys = ["collection", "spread", "siegeReserve"] as const;
  return keys.every((k) => p[k] === f.realm[k]) && (p.surplus ?? "Keep") === f.realm.surplus;
}

function presetNote(p: FoodView["presets"][string]): string {
  return `${p.collection} % · ${SPREAD_LABEL[p.spread!] ?? p.spread} · ${p.siegeReserve} mo${p.surplus && p.surplus !== "Keep" ? " · sells" : ""}`;
}

/** A castle's store as a bar against what it holds, with the siege reserve marked. */
function storeBar(c: FoodView["castles"][number], reserve: number): string {
  const pct = c.capMonths > 0 ? Math.min(100, (c.storeMonths / c.capMonths) * 100) : 0;
  const mark = c.capMonths > 0 ? Math.min(100, (reserve / c.capMonths) * 100) : 0;
  return `<span class="store-bar" role="img" aria-label="${c.storeMonths.toFixed(1)} of ${c.capMonths} months stored"><i style="width:${pct.toFixed(1)}%"></i>${reserve > 0 ? `<b style="left:${mark.toFixed(1)}%"></b>` : ""}</span>`;
}

export function foodTab(s: Snapshot, name: (p: number) => string, thumb: (p: number) => string, held: number[]): string {
  const f = s.food;
  if (!f) return "";
  const hungry = held.filter((p) => s.provinceFoodMonths[p]! < 1).length;
  const low = held.filter((p) => s.provinceFoodMonths[p]! >= 1 && s.provinceFoodMonths[p]! < 3).length;
  const fed = held.length - f.outside.length;
  const reach = Math.max(1, ...f.castles.map((c) => c.reach));
  const noGranary = f.castles.filter((c) => !c.granary);
  const smallest = f.castleCapMonths;
  const spoiled = f.spoiledThisYear > 0.5;

  const glance = `
    <div class="food-glance">
      <div class="${hungry ? "bad" : ""}"><b>${hungry}</b><small>hungry</small></div>
      <div class="${low ? "warn" : ""}"><b>${low}</b><small>running low</small></div>
      <div><b>${fed}<small>/${held.length}</small></b><small>fed by castles</small></div>
    </div>
    <p>This year ${f.soldThisYear > 0.5 ? `you sold food for <b>${f.goldThisYear.toFixed(1)} gold</b>` : "you sold no food"}${spoiled ? ` and food that would feed <b>${fmt((f.spoiledThisYear / 12) * 1000)} people for a year spoiled</b>` : ""}.${spoiled && f.realm.surplus === "Keep" ? " Sell the surplus to turn it into gold." : ""}</p>`;

  const presets = Object.keys(f.presets)
    .map((p) => `<button class="paper${presetOn(f, p) ? " on" : ""}" aria-pressed="${presetOn(f, p)}" data-food-preset="${esc(p)}">${esc(p)}<small>${esc(presetNote(f.presets[p]!))}</small></button>`)
    .join("");

  const spreadChoices: Choice[] = Object.entries(f.choices.spread).map(([k, v]) => ({ value: k, label: SPREAD_LABEL[k] ?? k, note: v.join(" · ") }));
  const famineChoices: Choice[] = f.choices.famineRule.map((k) => ({ value: k, label: FAMINE_LABEL[k] ?? k }));
  const surplusChoices: Choice[] = f.choices.surplus.map((k) => ({ value: k, label: SURPLUS_LABEL[k] ?? k }));

  const order = (c: FoodView["castles"][number]) => (c.besieged ? 0 : c.cut ? 1 : 2) * 1000 + c.storeMonths;
  const castles = [...f.castles].sort((a, b) => order(a) - order(b) || a.province - b.province);
  const castleRows = castles
    .map((c) => {
      const reserve = c.own.siegeReserve ?? f.realm.siegeReserve;
      const tags = [c.besieged ? `<span class="tag bad">Besieged</span>` : "", c.cut ? `<span class="tag bad">Roads cut</span>` : "", c.granary ? `<span class="tag">Granary</span>` : "", Object.keys(c.own).length ? `<span class="tag">Own policy</span>` : ""].join("");
      return `<div class="province-row castle-row${c.besieged || c.cut ? " bad" : ""}">
        <button class="place" data-open-province="${c.province}" title="Open ${esc(name(c.province))} and its own settings">
          <img class="thumb" src="${thumb(c.province)}" alt="" width="48" height="48">
          <span class="place-name"><b>${esc(name(c.province))}</b><small>Feeds ${c.provinces} province${c.provinces === 1 ? "" : "s"} · reach ${c.reach} ring${c.reach === 1 ? "" : "s"}</small>${tags ? `<span class="tags">${tags}</span>` : ""}</span>
          <span class="place-stats"><small>${c.storeMonths.toFixed(1)} of ${c.capMonths} months</small>${storeBar(c, reserve)}</span>
        </button>
      </div>`;
    })
    .join("");

  const outside = f.outside.length
    ? `<h3 class="sub">Outside every castle's reach</h3>
      <p class="hint">${f.outside.length} province${f.outside.length === 1 ? " lives" : "s live"} on ${f.outside.length === 1 ? "its" : "their"} own harvest. A castle or a road nearby brings ${f.outside.length === 1 ? "it" : "them"} in.</p>
      <div class="nations">${f.outside
        .slice(0, 12)
        .map((p) => `<button class="paper nation" data-open-province="${p}">${esc(name(p))}</button>`)
        .join("")}${f.outside.length > 12 ? `<span class="hint">and ${f.outside.length - 12} more</span>` : ""}</div>`
    : "";

  return `
    ${glance}
    <h3 class="sub">Presets</h3>
    <div class="choices food-presets">${presets}</div>
    <h3 class="sub">Collection</h3>
    <p class="hint">The share of each province's surplus over a year's eating that goes to its castle at the harvest.</p>
    ${choiceRow("collection", collectionChoices(f), f.realm.collection)}
    <h3 class="sub">Sharing out</h3>
    <p class="hint">How a castle hands out what it holds over its reserve, in percent: its own province · the next ring · the ring beyond.${reach < 2 ? " Your castles reach one ring until a road is built at them: the ring beyond's share stays in the castle." : ""}</p>
    ${choiceRow("spread", spreadChoices, f.realm.spread)}
    <h3 class="sub">Siege reserve</h3>
    <p class="hint">Months of food each castle keeps and never hands out, for a siege.${noGranary.length && f.realm.siegeReserve > smallest ? ` <b>${noGranary.length} castle${noGranary.length === 1 ? "" : "s"} without a granary hold only ${smallest} months.</b>` : ""}</p>
    ${choiceRow("siegeReserve", reserveChoices(f), f.realm.siegeReserve)}
    <h3 class="sub">Famine relief</h3>
    <p class="hint">A province with less food than this is fed first from its castle's store over the reserve.</p>
    ${choiceRow("famineRule", famineChoices, f.realm.famineRule)}
    <h3 class="sub">Surplus</h3>
    <p class="hint">What happens to food that doesn't fit: a province holds ${monthsText(f.localCapMonths)} at most, a castle ${monthsText(smallest)}, or ${monthsText(f.granaryCapMonths)} with a granary.</p>
    ${choiceRow("surplus", surplusChoices, f.realm.surplus)}
    <h3 class="sub">Castles</h3>
    <p class="hint">Enemy armies on your land cut the roads: food doesn't pass them, and a besieged castle feeds only its own province. Tap a castle to open its province and give it its own collection and siege reserve.</p>
    <div class="province-list">${castleRows || `<p class="hint">You hold no castle.</p>`}</div>
    ${outside}`;
}

/**
 * A castle's own food settings on its province's Overview (feedback 112):
 * its collection and siege reserve, each with Realm to follow the realm
 * again, and Build a granary here, which opens the Build tab. Only for the
 * player's own castle; empty elsewhere.
 */
export function castleFoodSettings(s: Snapshot, p: number): string {
  const f = s.food;
  const c = s.provinceOwner[p] === s.playerNation ? f?.castles.find((x) => x.province === p) : undefined;
  if (!f || !c) return "";
  return `<section class="castle-own">
      <h3 class="sub">Castle food${Object.keys(c.own).length ? ` <span class="tag">Own policy</span>` : ""}</h3>
      <p class="hint">Collection here: the share of the surplus of the provinces it feeds that comes to this castle at the harvest.</p>
      ${choiceRow("collection", collectionChoices(f), c.own.collection, c.province)}
      <p class="hint">Siege reserve here${c.granary ? "" : ` (holds ${c.capMonths} months without a granary)`}</p>
      ${choiceRow("siegeReserve", reserveChoices(f), c.own.siegeReserve, c.province)}
      ${c.granary ? "" : `<button class="paper wide" data-tab="build">${icon("hammer", 1)}Build a granary here</button>`}
      <button class="paper wide" data-realm-open-food title="Open the Food tab">${icon("castle", 1)}Realm defaults on the Food tab</button>
    </section>`;
}

/** The General tab's Food line: hungry and low counts, opening the Food tab. */
export function foodLine(s: Snapshot, held: number[]): string {
  const hungry = held.filter((p) => s.provinceFoodMonths[p]! < 1).length;
  const low = held.filter((p) => s.provinceFoodMonths[p]! >= 1 && s.provinceFoodMonths[p]! < 3).length;
  const text = hungry || low ? `${hungry ? `<b>${hungry} hungry</b>` : ""}${hungry && low ? ", " : ""}${low ? `${low} running low` : ""}` : "All provinces fed";
  return `<dt>Food</dt><dd><button class="paper" data-realm-open-tab="food" title="Open the Food tab">${icon("castle", 1)}${text}</button></dd>`;
}

/** The castle line of a province's overview: its castle store, or the castle that feeds it, or none in reach. */
export function castleFoodLine(s: Snapshot, p: number, name: (p: number) => string): string {
  const c = s.provinceCastle[p]!;
  const mine = s.provinceOwner[p] === s.playerNation;
  const castle = mine ? s.food?.castles.find((x) => x.province === p) : undefined;
  const open = (text: string) => (mine ? `<button class="paper" data-realm-open-food title="Open the Food tab">${text}</button>` : text);
  if (castle) {
    const tags = [castle.granary ? "granary" : "no granary", castle.besieged ? "besieged" : "", castle.cut ? "roads cut" : ""].filter(Boolean).join(" · ");
    return `<dt>Castle store</dt><dd>${open(`${castle.storeMonths.toFixed(1)} of ${castle.capMonths} months <small>${tags}</small>`)}</dd>`;
  }
  if (c >= 0 && c !== p) return `<dt>Fed by</dt><dd>${open(`${icon("castle", 1)}${esc(name(c))} <small>${s.provinceRing[p] === 1 ? "next ring" : "ring beyond"}</small>`)}</dd>`;
  if (s.provinceOwner[p]! >= 0) return `<dt>Fed by</dt><dd>${open("No castle in reach: its own harvest")}</dd>`;
  return "";
}
