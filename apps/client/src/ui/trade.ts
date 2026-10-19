import type { GameTraderKind, Snapshot, TradeView, TraderView } from "@ph/engine";
import { icon } from "../art/ui.ts";
import { fold } from "./fold.ts";

/**
 * Trade on the realm card and the map (TRADE-141 to TRADE-145): the Trade tab
 * of the player's own card shows last month's Trade line, one card per trader
 * (its route, purse, what it brings, what is wrong, and Route, Show and
 * Dismiss, which asks once more), the cities that can found a trader with a
 * button per kind, and the busiest trade cities. The General tab carries one
 * line that opens the tab; the province card a Trade line; the map the route
 * bar while a route is drawn.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
/** Gold as the ledger writes it: whole above 10, one place above 1, two below. */
const gold = (g: number) => (Math.abs(g) >= 10 ? Math.round(g).toLocaleString("en") : Math.abs(g) >= 1 ? g.toFixed(1) : g.toFixed(2));
const signed = (g: number) => (Math.abs(g) < 0.005 ? "0" : `${g > 0 ? "+" : "−"}${gold(Math.abs(g))}`);
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Whether a kind sails: a cog stops only at ports (bit 2 of provinceTradeCity), the rest at land stops (bit 1). */
export const isShipKind = (k: GameTraderKind) => k === "cog_junk_dhow";
export const stopBit = (k: GameTraderKind) => (isShipKind(k) ? 2 : 1);

/** What the player left open in the Trade tab: the trader waiting for a second Dismiss, and all cities to found in. */
export const tradeUi = { dismiss: -1, allCities: false };

/** Cities shown under Found a trader before "More cities". */
const FOUND_SHOWN = 4;

/** A trader's route: "Paris → Lyon and back" (D-TRADE-21). */
export function stopsText(stops: readonly number[], name: (p: number) => string): string {
  if (stops.length < 2) return "No route";
  return `${stops.map((p) => esc(name(p))).join(" → ")} and back`;
}

/** One trader: kind and home, its stops, purse, what it brings and deposited, what is wrong, and its three buttons. */
function traderCard(t: TraderView, name: (p: number) => string): string {
  const full = t.purseMax > 0 ? Math.min(100, (t.purse / t.purseMax) * 100) : 0;
  const asking = tradeUi.dismiss === t.id;
  const buttons = asking
    ? `<p>Dismiss it? Its crew go home to ${esc(name(t.home))}.</p>
      <div class="confirm-row"><button class="wax" data-trader-dismiss="${t.id}">Dismiss</button><button class="paper" data-trader-keep>Keep it</button></div>`
    : `<div class="trader-buttons">
        <button class="paper" data-trader-route="${t.id}">${icon("scroll", 1)}Route</button>
        <button class="paper" data-trader-open="${t.id}">${icon("map", 1)}Open</button>
        <button class="paper" data-trader-ask="${t.id}">${icon("close", 1)}Dismiss</button>
      </div>`;
  return `<div class="trader framed-soft${t.problem ? " bad" : ""}">
      <p class="trader-head"><button class="link" data-trader-open="${t.id}"><b>${esc(t.name)}</b></button> <small>of ${esc(name(t.home))}</small>${t.better.length ? ` <small class="better-mark" title="A better route is open">★ better route</small>` : ""}</p>
      <p class="trader-stops">${stopsText(t.stops, name)}${t.stops.length >= 2 ? ` <small>· ${t.loopDays} days there and back</small>` : ""}</p>
      <span class="progress purse-bar" role="img" aria-label="Purse ${gold(t.purse)} of ${gold(t.purseMax)} gold"><i style="width:${full.toFixed(1)}%"></i></span>
      <p class="trader-gold"><small>Purse ${gold(t.purse)} of ${gold(t.purseMax)}</small><br>
        About <b>${signed(t.expected)}</b> a month, upkeep ${gold(t.upkeep)} · last month deposited <b>${gold(t.lastMonth)}</b></p>
      ${t.problem ? `<p class="trader-why">${esc(cap1(t.problem))}.</p>` : ""}
      ${buttons}
    </div>`;
}

/** The Trade tab of the player's own card (TRADE-141). */
export function tradeTab(v: TradeView, s: Snapshot, name: (p: number) => string): string {
  const last = `<dl class="facts trade-last">
      <dt>Deposits</dt><dd>${signed(v.deposits)}</dd>
      <dt>Market fees</dt><dd>${signed(v.fees)}</dd>
      <dt>Upkeep</dt><dd>${signed(-v.upkeep)}</dd>
      <dt>Trade line</dt><dd class="${v.net < 0 ? "down" : "up"}">${icon("coin", 1)}${signed(v.net)} gold a month</dd>
    </dl>`;
  const traders = v.traders.length
    ? `<div class="traders">${v.traders.map((t) => traderCard(t, name)).join("")}</div>`
    : `<p class="hint">You have no traders. Found one below: it goes between two trade cities through the busiest land and brings their gold home.</p>`;
  const cities = tradeUi.allCities ? v.found : v.found.slice(0, FOUND_SHOWN);
  const found = v.found.length
    ? `${cities
        .map(
          (f) => `<div class="found-city">
          <p class="found-name">${icon("castle", 1)}<b>${esc(name(f.city))}</b></p>
          <div class="found-kinds">${f.kinds
            .map(
              (k) => `<button class="paper" data-found-city="${f.city}" data-found-kind="${k.kind}"${k.why ? " disabled" : ""}>
                <b>${esc(k.name)}</b><small>${gold(k.gold)} gold · ${gold(k.upkeep)} a month</small>${k.why ? `<small class="why">${esc(cap1(k.why))}</small>` : ""}
              </button>`,
            )
            .join("")}</div>
        </div>`,
        )
        .join("")}
      ${v.found.length > FOUND_SHOWN ? `<button class="paper more" data-found-all>${tradeUi.allCities ? "Fewer cities" : `All ${v.found.length} cities`}</button>` : ""}`
    : `<p class="hint">None of your cities has a market or a harbour to found a trader in.</p>`;
  const busiest = v.centres.length
    ? `<div class="trade-cities">${v.centres
        .map(
          (c) => `<button class="paper trade-city" data-show-province="${c.province}">
          <b>${esc(name(c.province))}</b>
          <span>${icon("coin", 1)}${gold(c.value)} a month</span>
          <span class="ratio"><i style="width:${Math.min(100, c.ratio)}%"></i></span>
          <small>${Math.round(c.ratio)} % · ${plural(Math.round(c.passing), "trader")} passed${s.provinceTradeCity[c.province]! & 2 ? " · port" : ""}</small>
        </button>`,
        )
        .join("")}</div>`
    : `<p class="hint">You hold no trade city yet.</p>`;
  const strongest = v.centres[0];
  return `<h3 class="sub">Last month</h3>${last}
    <h3 class="sub">Traders</h3>${traders}
    ${fold("trade-found", "Found a trader", v.found.length ? `${plural(v.found.length, "city", "cities")} can found one` : "No city can found one", `<p class="hint">Its crew leave the city; it starts on the best route from there.</p>${found}`, !v.traders.length)}
    ${fold("trade-cities", "Busiest cities", strongest ? `${esc(name(strongest.province))} ${gold(strongest.value)} a month` : "None yet", `<p class="hint">Value a month and trade ratio: traders passing raise the ratio, and the ratio raises tax.</p>${busiest}`)}`;
}

/** The province card's Trade line (TRADE-143): value, ratio, traders passing and top goods; "not seen" where the player can't see. */
export function provinceTradeLine(s: Snapshot, p: number): string {
  if (!s.provinceTradeSeen[p]) return `<dt>Trade</dt><dd><small>not seen</small></dd>`;
  const value = s.provinceTradeValue[p]!;
  const goods = (s.provinceGoods[p] ?? []).slice(0, 3).map((g) => g.ware);
  const stop = s.provinceTradeCity[p]!;
  const kind = stop & 1 ? (stop & 2 ? "trade city, port" : "trade city") : stop & 2 ? "port" : "";
  return `<dt>Trade</dt><dd class="trade-line">${icon("coin", 1)}${gold(value)} a month · ${s.provinceTradeRatio[p]} % · ${plural(s.provinceTradePassing[p]!, "trader")} passed${
    kind ? ` <small>(${kind})</small>` : ""
  }${goods.length ? `<br><small>${esc(goods.join(", "))}</small>` : ""}</dd>`;
}

/** The route being drawn on the map (TRADE-142): which trader, where it starts and where it goes so far, and why a tap was not taken. */
export interface Routing {
  trader: number;
  kind: GameTraderKind;
  stops: number[];
  note: string | null;
}

/** The bar along the bottom of the map while a route is drawn: what to tap, the two ends, the preview, the reason, and the buttons. */
export function routeBar(r: Routing, v: TradeView | null, name: (p: number) => string): string {
  const t = v?.traders.find((x) => x.id === r.trader);
  const d = v?.draft && v.draft.trader === r.trader && v.draft.stops.join() === r.stops.join() ? v.draft : null;
  const place = isShipKind(r.kind) ? "port" : "city";
  const chips = r.stops.map((p, i) => `<span class="chip">${i ? "To" : "From"} ${esc(name(p))}</span>`).join("");
  let preview = "";
  if (r.stops.length < 2) {
    preview = `<span class="soft">${r.stops.length ? `Tap the ${place} it goes to, or a pick:` : `Tap the ${place} it starts from.`}</span>`;
    // The best cities from where it starts, as buttons, so a small city needs no exact tap (TRADE-155).
    const picks = r.stops.length === 1 && d ? d.options.slice(0, 3) : [];
    if (picks.length)
      preview += `<span class="route-picks">${picks
        .map((o) => `<button class="paper" data-route-pick="${o.city}"><b>${esc(name(o.city))}</b><small>${signed(o.expected - (t?.upkeep ?? 0))} a month · ${o.loopDays} days</small></button>`)
        .join("")}</span>`;
  }
  else if (d && !d.why)
    preview = `${d.loopDays} days there and back · collects in ${plural(d.collectIn, "province")} · about <b>${signed(d.expected)}</b> a month${d.fees > 0.005 ? ` after ${gold(d.fees)} fees` : ""}${
      d.best.length ? ` <small class="best">· best ${d.best.map((b) => `${esc(name(b.province))} ${gold(b.gold)}`).join(", ")}</small>` : ""
    }`;
  else if (!d) preview = `<span class="soft">Working it out…</span>`;
  const why = r.note ?? d?.why ?? null;
  const ok = r.stops.length >= 2 && !!d && !d.why;
  return `<p class="route-what"><b>${t ? esc(t.name) : "Trader"}${t ? ` of ${esc(name(t.home))}` : ""}</b> · Tap where it starts, then where it goes; it finds the way through the busiest land</p>
    <div class="route-stops">${chips}<span class="route-preview">${preview}</span></div>
    ${why ? `<p class="route-why">${esc(cap1(why))}.</p>` : ""}
    <div class="route-buttons">
      <button class="paper" data-route-undo${r.stops.length ? "" : " disabled"}>Undo</button>
      <button class="paper" data-route-cancel>Cancel</button>
      <button class="wax" data-route-confirm${ok ? "" : " disabled"}>Confirm</button>
    </div>`;
}

/** What a trader is doing now, in a few words: "Walking to Lyon, 3 days" or "Waiting in Paris" (TRADE-153). */
export function nowText(t: TraderView, name: (p: number) => string): string {
  if (t.path.length < 2) return `Waiting in ${esc(name(t.at))}`;
  const days = t.headingDays;
  const verb = isShipKind(t.kind) ? "Sailing" : t.kind === "river_barge" ? "Poling" : "Walking";
  return `${verb} to ${esc(name(t.heading))}, ${days <= 0 ? "arriving today" : plural(days, "day")}`;
}

/**
 * A trader's own card (TRADE-153): what it is doing now with its purse, its route and what it brings after upkeep,
 * better routes with Use, where its gold comes from, last month, what is wrong, and its buttons.
 */
export function traderCardHtml(t: TraderView, name: (p: number) => string, foreign: (p: number) => boolean): string {
  const full = t.purseMax > 0 ? Math.min(100, (t.purse / t.purseMax) * 100) : 0;
  const net = t.expected - t.upkeep;
  const asking = tradeUi.dismiss === t.id;
  const route =
    t.stops.length >= 2
      ? `<p class="route-ends"><b>${esc(name(t.stops[0]!))} → ${esc(name(t.stops[1]!))}</b> and back</p>
        <p><small>${t.loopDays} days there and back</small> · about <b class="${net < 0 ? "down" : "up"}">${signed(net)}</b> a month after ${gold(t.upkeep)} upkeep</p>`
      : `<p class="hint">No route: it waits at home. Pick one below or set a new route.</p>`;
  const better = t.better.length
    ? `<ul class="better">${t.better
        .map(
          (b, i) => `<li><span><b>${esc(name(b.stops[0]!))} → ${esc(name(b.stops[1]!))}</b><small>${b.loopDays} days there and back · about ${signed(b.expected - t.upkeep)} a month, <b class="up">${signed(b.gain)} more</b></small></span>
          <button class="${i ? "paper" : "wax"}" data-trader-use="${t.id}" data-use-from="${b.stops[0]}" data-use-to="${b.stops[1]}">Use</button></li>`,
        )
        .join("")}</ul>`
    : `<p class="hint">${t.stops.length >= 2 ? "This is its best route from its start and its home." : "No route from its home pays yet."}</p>`;
  const top = t.sources[0]?.gold ?? 0;
  const sources = t.sources.length
    ? `<div class="sources">${t.sources
        .slice(0, 6)
        .map(
          (x) => `<div class="source-row"><button class="link" data-show-province="${x.province}">${esc(name(x.province))}${foreign(x.province) ? ` <small class="foreign">abroad</small>` : ""}</button>
          <span class="src-bar"><i style="width:${top > 0 ? ((x.gold / top) * 100).toFixed(0) : 0}%"></i></span><b>${gold(x.gold)}</b></div>`,
        )
        .join("")}</div>
      <p><small>${t.sourcesTrip === "last" ? "On its last trip there and back" : "On this trip so far"}${t.fees > 0.005 ? `, after ${gold(t.fees)} in market fees` : ""}.</small></p>`
    : `<p class="hint">It has not collected yet on this route.</p>`;
  const buttons = asking
    ? `<p>Dismiss it? Its crew go home to ${esc(name(t.home))}.</p>
      <div class="confirm-row"><button class="wax" data-trader-dismiss="${t.id}">Dismiss</button><button class="paper" data-trader-keep>Keep it</button></div>`
    : `<div class="trader-buttons">
        ${t.stops.length >= 2 ? `<button class="paper" data-trader-dest="${t.id}">${icon("scroll", 1)}Change destination</button>` : ""}
        <button class="paper" data-trader-route="${t.id}">${icon("scroll", 1)}New route</button>
        <button class="paper" data-trader-show="${t.id}">${icon("map", 1)}Find</button>
        <button class="paper" data-trader-ask="${t.id}">${icon("close", 1)}Dismiss</button>
      </div>`;
  return `<div class="trader-card">
    <p class="trader-head"><small>Home: ${esc(name(t.home))}</small></p>
    <h3 class="sub">Now</h3>
    <p>${nowText(t, name)}</p>
    <span class="progress purse-bar" role="img" aria-label="Purse ${gold(t.purse)} of ${gold(t.purseMax)} gold"><i style="width:${full.toFixed(1)}%"></i></span>
    <p><small>Carrying ${gold(t.purse)} of ${gold(t.purseMax)} gold; it banks it in your next city on its way.</small></p>
    ${t.problem ? `<p class="trader-why">${esc(cap1(t.problem))}.</p>` : ""}
    <h3 class="sub">Route</h3>
    ${route}
    <h3 class="sub">${t.better.length ? "Better routes" : "Its best route"}</h3>
    ${better}
    <h3 class="sub">Where its gold comes from</h3>
    ${sources}
    <h3 class="sub">Last month</h3>
    <p>Banked <b>${gold(t.lastMonth)}</b> gold${t.lastDepositCity >= 0 ? ` · last ${gold(t.lastDeposit)} in ${esc(name(t.lastDepositCity))}` : ""}</p>
    ${buttons}
  </div>`;
}
