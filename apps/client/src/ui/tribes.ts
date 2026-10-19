import type { TribesView } from "@ph/engine";
import { askButton, claimButton, colonyNote, groundLine, groundRow, leaveButton, rangeHeader, settlersRow, takeInButton, HUNT_KEY, type ButtonView } from "@ph/engine/domain/tribes";
import { icon } from "../art/ui.ts";

/**
 * Hunting grounds on screen (TRIBE-026 to TRIBE-030): the Hunting grounds tab
 * of a tribal realm's card and its line on the General tab, the ground line
 * and buttons on an unowned province's card, the grounds count and Ask for the
 * land rows on another tribe's card, and the fleet card's note over a ground.
 * The words come from the tribes context (screens.ts); this file lays them out
 * as 44-point rows and buttons in one column, every reason written under its
 * button. main.ts binds them with bindTribes().
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");

export type Mine = NonNullable<TribesView["mine"]>;

/** What the pieces need of the rest of the client: names, a realm's flag and link, the date. */
export interface TribesUi {
  province: (p: number) => string;
  realm: (n: number) => string;
  /** A realm's small flag, as an <img>. */
  pennant: (n: number) => string;
  /** A button opening a realm's card (its Diplomacy tab when asked). */
  realmLink: (n: number) => string;
  /** The player's realm index. */
  me: number;
  /** Months since year 0 of the date on show (year × 12 + month − 1). */
  now: number;
  /** The player may found colonies (ocean navigation), so may ask a tribe for its land. */
  colonial: boolean;
}

/** Which ground's Leave waits for a yes; kept between redraws. */
export const tribesUi = { leaving: -1 };

/** "the Creek", as the specs write a tribe. */
export const tribeOf = (ui: TribesUi, n: number) => `the ${ui.realm(n)}`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "1 June 1446" back to its month number, or null. */
function monthOf(text: string): number | null {
  const m = /(\w+) (\d+)$/.exec(text);
  if (!m) return null;
  const i = MONTHS.indexOf(m[1]!);
  return i < 0 ? null : Number(m[2]) * 12 + i;
}

/** A 44-point button with its reason written under it, never only in a hover title (TRIBE-030). */
function button(b: ButtonView, attrs: string, kind: "wax" | "paper" = "paper"): string {
  return `<span class="hunt-act"><button class="${kind}" ${attrs}${b.enabled ? "" : " disabled"} style="min-height:${b.minHeight}px">${esc(b.label)}</button>${b.note ? `<small class="why">${esc(b.note)}</small>` : ""}</span>`;
}

/** The claim under way: its province, a bar to its end and the date it ends. */
function claimBar(v: TribesView, m: Mine, ui: TribesUi, cancel: boolean): string {
  const c = m.claim!;
  const end = monthOf(c.ends);
  const left = end === null ? v.claimMonths : Math.max(0, end - ui.now);
  const done = Math.max(0, Math.min(1, 1 - left / v.claimMonths));
  return `<div class="hunt-claim">
    <p>${icon("map", 1)}Claiming <b>${esc(ui.province(c.province))}</b> · ends ${esc(c.ends)}</p>
    <div class="hold-bar hunt-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(done * 100)}" aria-label="Claim ${Math.round(done * 100)}%, ends ${esc(c.ends)}"><i style="width:${done * 100}%"></i><span>${left} ${left === 1 ? "month" : "months"} left</span></div>
    ${cancel ? `<div class="choices"><button class="paper" data-hunt-cancel>Cancel claim</button></div>` : ""}
  </div>`;
}

/** Leave this ground, or its confirm once tapped. */
function leaveHtml(p: number, ui: TribesUi): string {
  const b = leaveButton(ui.province(p));
  if (tribesUi.leaving !== p) return button(b, `data-hunt-leave="${p}"`);
  return `<div class="hunt-confirm framed-soft" role="alertdialog">
    <p>${esc(b.confirm!)}</p>
    <div class="choices"><button class="wax" data-hunt-leave-yes="${p}">Leave it</button><button class="paper" data-hunt-leave-no>Keep it</button></div>
  </div>`;
}

/** Another tribe's General tab: its grounds count (TRIBE-027). */
export function groundsCountLine(v: TribesView, r: number): string {
  const c = v.counts[r];
  if (!c || (!c.held && !c.size)) return "";
  return `<dt>Range</dt><dd>${esc(rangeHeader(c.held, c.size).text)}</dd>`;
}

/** TRIBE-027: the Hunting grounds tab: settlers, asks, the range and its bar, the claim, the grounds, then land to claim. */
export function huntTab(v: TribesView, ui: TribesUi): string {
  const m = v.mine;
  if (!m) return "";
  const head = rangeHeader(m.held, m.size);
  const settlers = m.settlers.length
    ? `<ul class="plain hunt-rows">${m.settlers
        .map((x) => {
          const r = settlersRow(ui.realm(x.founder), ui.province(x.province));
          return `<li class="hunt-settlers tone-${r.tone}">${icon("swords", 1)}<span>${esc(r.text)}</span><button class="wax" data-hunt-go="${x.province}">${icon("map", 1)}${r.button}</button></li>`;
        })
        .join("")}</ul>`
    : "";
  const asks = m.asks.length
    ? `<h3 class="sub">Asked for our land</h3><ul class="plain hunt-rows">${m.asks
        .map(
          (a) => `<li class="hunt-ask framed-soft">
          <p>${ui.realmLink(a.asker)} asks for <b>${esc(ui.province(a.province))}</b>, offering ${Math.round(a.gold)} gold.</p>
          <dl class="facts hunt-reasons">${a.count.reasons.map((x) => `<dt>${esc(x.name)}</dt><dd>${signed(x.number)}</dd>`).join("")}<dt><b>Total</b></dt><dd><b>${signed(a.count.total)}</b> · our people would say ${a.count.yes ? "yes" : "no"}</dd></dl>
          <div class="choices"><button class="wax" data-hunt-answer="${a.id}" data-yes="1">Yes, give it up</button><button class="paper" data-hunt-answer="${a.id}" data-yes="0">No</button></div>
          <small class="why">Yes: we take the gold and leave ${esc(ui.province(a.province))}; their colony there is founded in peace.</small>
        </li>`,
        )
        .join("")}</ul>`
    : "";
  const range = `<div class="hold-bar hunt-bar" role="meter" aria-valuemin="0" aria-valuemax="${m.size}" aria-valuenow="${m.held}" aria-label="${esc(head.text)}"><i style="width:${head.bar * 100}%"></i><span>${esc(head.text)}</span></div>
    <p class="hint">Furs and hides: ${(Math.round(m.fursPerMonth * 10) / 10).toString()} gold a month. A ground held ${v.takeInYears} years may be taken in as a province of ours.</p>`;
  const claim = m.claim ? claimBar(v, m, ui, true) : "";
  const grounds = m.grounds.length
    ? `<h3 class="sub">Our grounds</h3><ul class="plain hunt-rows">${m.grounds
        .map(
          (g) => `<li class="hunt-ground${g.takeInWhy === null ? " ready" : ""}">
          <button class="paper hunt-open" data-hunt-go="${g.province}">${icon("map", 1)}<span><b>${esc(ui.province(g.province))}</b>${g.takeInWhy === null ? ' <b class="ready-mark">ready to take in</b>' : ""}<small>${esc(groundRow(g))} · since ${esc(g.since)}${g.ownPeople ? " · our own people" : ""}</small></span></button>
          <div class="hunt-acts">${button(takeInButton(g.takeInWhy), `data-hunt-take="${g.province}"`, g.takeInWhy === null ? "wax" : "paper")}${leaveHtml(g.province, ui)}</div>
        </li>`,
        )
        .join("")}</ul>`
    : `<p class="hint">No hunting grounds yet: claim the empty land beside us.</p>`;
  // Land we may claim now, each with its Claim button; the rest after it, each row saying why not (no greyed button repeated down the list).
  const list = m.candidates.filter((c) => c.province !== m.claim?.province);
  const free = list.filter((c) => c.why === null);
  const shut = list.filter((c) => c.why !== null);
  // The rest grouped under the reason they can't be claimed now, written once.
  const groups = new Map<string, number[]>();
  for (const c of shut) groups.set(c.why!, [...(groups.get(c.why!) ?? []), c.province]);
  const candidates = list.length
    ? `<h3 class="sub">Land to claim</h3>
      ${free.length ? `<ul class="plain hunt-rows">${free
        .map(
          (c) => `<li class="hunt-ground">
          <button class="paper hunt-open" data-hunt-go="${c.province}">${icon("map", 1)}<span><b>${esc(ui.province(c.province))}</b><small>${esc(landLine(v, c.province, ui))}</small></span></button>
          <div class="hunt-acts">${button(claimButton(null), `data-hunt-claim="${c.province}"`, "wax")}</div>
        </li>`,
        )
        .join("")}</ul>` : ""}
      ${[...groups]
        .map(
          ([why, ps]) => `<p class="hint hunt-why">Not now: ${esc(why)}</p><ul class="plain hunt-rows">${ps
            .map((p) => `<li><button class="paper hunt-open" data-hunt-go="${p}">${icon("map", 1)}<span><b>${esc(ui.province(p))}</b><small>${esc(landLine(v, p, ui))}</small></span></button></li>`)
            .join("")}</ul>`,
        )
        .join("")}`
    : `<p class="hint">No empty land touches our land or our grounds.</p>`;
  return `<div class="hunt-tab">${settlers}${asks}${range}${claim}${grounds}${candidates}</div>`;
}

/** Whose land it is, in the tab's words. */
const landLine = (v: TribesView, p: number, ui: TribesUi) => {
  const t = v.ground[p]!;
  return groundLine(t >= 0 ? tribeOf(ui, t) : null);
};

/**
 * TRIBE-026: an unowned land province's card: whose ground it is under its
 * name, then, for a tribal player, Claim (or the claim under way) or Take them
 * in and Leave; for a colonial player on another tribe's ground, Ask for the land.
 */
export function groundSection(v: TribesView, p: number, ui: TribesUi): string {
  const t = v.ground[p]!;
  const m = v.mine;
  const parts: string[] = [];
  if (m) {
    const own = m.grounds.find((g) => g.province === p);
    if (own) {
      parts.push(`<p class="hint">${esc(groundRow(own))} · since ${esc(own.since)}</p>`);
      parts.push(`<div class="hunt-acts">${button(takeInButton(own.takeInWhy), `data-hunt-take="${p}"`, own.takeInWhy === null ? "wax" : "paper")}${leaveHtml(p, ui)}</div>`);
    } else if (m.claim?.province === p) {
      parts.push(claimBar(v, m, ui, true));
    } else {
      const c = m.candidates.find((x) => x.province === p);
      if (c) parts.push(`<div class="hunt-acts">${button(claimButton(c.why), `data-hunt-claim="${p}"`, c.why === null ? "wax" : "paper")}</div>`);
      else if (v.claiming[p]! >= 0) parts.push(`<p class="hint">${esc(tribeOf(ui, v.claiming[p]!))} are claiming it.</p>`);
    }
  } else if (v.claiming[p]! >= 0) {
    parts.push(`<p class="hint">${esc(tribeOf(ui, v.claiming[p]!))} are claiming it.</p>`);
  }
  if (t >= 0 && t !== ui.me) parts.push(askHtml(v, p, ui));
  return parts.length ? `<section class="hunt-card">${parts.join("")}</section>` : "";
}

/** TRIBE-026: the line under an unowned land province's name: whose ground it is, with the tribe's flag (a tap opens its card), or no one's. */
export function groundHead(v: TribesView, p: number, ui: TribesUi): string {
  const t = v.ground[p]!;
  return t >= 0
    ? `<button class="realm-link hunt-line" data-realm="${t}">${ui.pennant(t)}<b>${esc(groundLine(tribeOf(ui, t)))}</b></button>`
    : `<b>${esc(groundLine(null))}</b>`;
}

/** Ask for the land, for a colonial player on another realm's ground (TRIBE-023, TRIBE-026). */
function askHtml(v: TribesView, p: number, ui: TribesUi): string {
  if (v.given.includes(p)) return `<p class="hint">${icon("crown", 1)}Given to us: a colony founded here is founded in peace.</p>`;
  if (!ui.colonial) return "";
  const a = v.askWhy.find((x) => x.province === p);
  if (!a) return "";
  if (a.asked) return `<p class="hint">${icon("scroll", 1)}Our envoy has asked for it: they answer next month.</p>`;
  return `<div class="hunt-acts">${button(askButton(v.landPrice, a.why), `data-hunt-ask="${p}"`)}</div>`;
}

/** TRIBE-027: on another tribe's Diplomacy tab, for a colonial player: one row per ground with Ask for the land. */
export function askRows(v: TribesView, tribe: number, ui: TribesUi): string {
  const rows = v.askWhy.filter((a) => a.tribe === tribe);
  const c = v.counts[tribe];
  if (!rows.length || !ui.colonial) return "";
  return `<h3 class="sub">Their hunting grounds${c ? ` · ${c.held} of ${c.size}` : ""}</h3>
    <p class="hint">Settling a ground angers them; land they give up for gold is settled in peace.</p>
    <ul class="plain hunt-rows">${rows
      .map(
        (a) => `<li class="hunt-ground">
        <button class="paper hunt-open" data-hunt-go="${a.province}">${icon("map", 1)}<span><b>${esc(ui.province(a.province))}</b></span></button>
        <div class="hunt-acts">${v.given.includes(a.province) ? `<small class="why">Given to us</small>` : a.asked ? `<small class="why">Asked: they answer next month</small>` : button(askButton(v.landPrice, a.why), `data-hunt-ask="${a.province}"`)}</div>
      </li>`,
      )
      .join("")}</ul>`;
}

/** TRIBE-029: the fleet card's Colony section over a ground: the note and Ask for the land beside Found colony. */
export function colonyGround(v: TribesView, p: number, ui: TribesUi): string {
  const t = v.ground[p]!;
  if (t < 0 || t === ui.me) return "";
  if (v.given.includes(p)) return `<small class="why">Given to us: founded in peace</small>`;
  const a = v.askWhy.find((x) => x.province === p);
  return `<small class="why hunt-note">${esc(colonyNote(tribeOf(ui, t)))}</small>${a?.asked ? `<small class="why">Our envoy has asked for it.</small>` : a ? button(askButton(v.landPrice, a.why), `data-hunt-ask="${p}"`) : ""}`;
}

/** TRIBE-028: the map key's line for hunting grounds. */
export const huntKeyHtml = (amber: string) =>
  `<span><i class="swatch hunt-hatch"></i>${esc(HUNT_KEY.what)}: ${esc(HUNT_KEY.pattern)} in ${esc(HUNT_KEY.colour)}</span>
   <span><i class="swatch" style="background:${amber}"></i>Empty coast in range on a tribe's hunting ground: settling angers them</span>`;

/** The orders the pieces send, and where Go there goes. */
export interface TribesActions {
  send: (o: { type: "tribes"; action: string; province?: number; gold?: number; ask?: number; yes?: boolean }) => void;
  go: (p: number) => void;
  redraw: () => void;
  price: number;
}

/** Binds every tribes button under root. */
export function bindTribes(root: HTMLElement, a: TribesActions): void {
  const each = (sel: string, f: (b: HTMLElement) => void) => root.querySelectorAll<HTMLElement>(sel).forEach((b) => b.addEventListener("click", () => f(b)));
  each("[data-hunt-go]", (b) => a.go(Number(b.dataset.huntGo)));
  each("[data-hunt-claim]", (b) => a.send({ type: "tribes", action: "claim", province: Number(b.dataset.huntClaim) }));
  each("[data-hunt-cancel]", () => a.send({ type: "tribes", action: "cancelClaim" }));
  each("[data-hunt-take]", (b) => a.send({ type: "tribes", action: "takeIn", province: Number(b.dataset.huntTake) }));
  each("[data-hunt-leave]", (b) => {
    tribesUi.leaving = Number(b.dataset.huntLeave);
    a.redraw();
  });
  each("[data-hunt-leave-no]", () => {
    tribesUi.leaving = -1;
    a.redraw();
  });
  each("[data-hunt-leave-yes]", (b) => {
    tribesUi.leaving = -1;
    a.send({ type: "tribes", action: "leave", province: Number(b.dataset.huntLeaveYes) });
  });
  each("[data-hunt-ask]", (b) => a.send({ type: "tribes", action: "askLand", province: Number(b.dataset.huntAsk), gold: a.price }));
  each("[data-hunt-answer]", (b) => a.send({ type: "tribes", action: "answerLand", ask: Number(b.dataset.huntAnswer), yes: b.dataset.yes === "1" }));
}
