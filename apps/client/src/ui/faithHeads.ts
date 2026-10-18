import type { FaithHeadsView, HeadCard } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Heads of the faith on screen (RELG-135 to RELG-138): the Head of the faith
 * card under the faith cards on the Peoples tab, with the conclave's rows and
 * its one action; the badge on every realm's Faith line; the censure a war
 * would bring, before Declare war; and the seats on the Faiths map mode.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

type Names = (n: number) => string;

/** The Head of the faith card. `mine` is the player's own faith: its buttons work; read-only otherwise (the map's seats). */
export function headCardHtml(c: HeadCard | null, name: Names, mine: boolean): string {
  if (!c) return "";
  const head = `<h3 class="sub">Head of the faith</h3>`;
  if (c.leadership !== "head") return `${head}<div class="faith-head framed-soft"><p>${esc(c.line)}</p></div>`;
  const who = (n: number | undefined) => (n === undefined || n < 0 ? "none" : esc(name(n)));
  const action = c.action
    ? `<div class="choices"><button class="wax" data-head-action="${c.action.kind}"${!mine || c.action.why ? ` disabled aria-disabled="true"` : ""}>${icon("crown", 1)}${esc(c.action.label)}</button></div>${c.action.why ? `<p class="hint">${esc(c.action.why)}.</p>` : ""}`
    : "";
  return `${head}<div class="faith-head framed-soft">
    <p><b>${esc(c.title!)}</b> <small>${c.way === "chosen" ? "chosen by a conclave" : c.way === "claimed" ? "a claim held with the seat" : "named by the seat's ruler"}</small></p>
    <dl class="facts">
      <dt>Seat</dt><dd>${esc(c.seat!)} <small>held by ${who(c.holder)}</small></dd>
      <dt>${c.way === "claimed" ? "Caliph" : "Patron"}</dt><dd>${who(c.patron)}</dd>
    </dl>
    <div class="head-lists">
      <div><p><b>The patron gets</b></p><ul>${c.gets.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
      <div><p><b>The patron owes</b></p><ul>${c.owes.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
    </div>
    ${c.conclave ? conclaveHtml(c.conclave, name, mine) : ""}
    ${action}
  </div>`;
}

/** The conclave: the top three by votes, then the player's, and gold in steps (RELG-136); at most four rows so a Tall screen shows them. */
function conclaveHtml(cv: NonNullable<HeadCard["conclave"]>, name: Names, mine: boolean): string {
  const rows = cv.rows
    .map((r) => `<li><b>${esc(name(r.n))}</b> ${r.votes} votes <small>${r.cardinals} cardinal${r.cardinals === 1 ? "" : "s"} · ${r.goldVotes} gold vote${r.goldVotes === 1 ? "" : "s"}</small></li>`)
    .join("");
  const m = cv.mine;
  const gold =
    m && mine
      ? `<p>You have ${m.cardinals} cardinal${m.cardinals === 1 ? "" : "s"} and have sent ${fmt(m.gold)} <small>(${fmt((m.gold / m.step) * m.stepGold)} gold)</small>. Each ${m.step} buys a vote, up to one per cardinal.</p>
    <div class="choices conclave-gold">
      <button class="paper" data-conclave-gold="-${m.step}"${m.canLess ? ` disabled title="${esc(m.canLess)}"` : ""} aria-label="Send ${m.step} less">−</button>
      <span>${m.step} <small>(${fmt(m.stepGold)} gold)</small></span>
      <button class="paper" data-conclave-gold="${m.step}"${m.canMore ? ` disabled title="${esc(m.canMore)}"` : ""} aria-label="Send ${m.step} more">+</button>
    </div>${m.canMore && m.canMore !== "No conclave sits" ? `<p class="hint">${esc(m.canMore)}.</p>` : ""}`
      : "";
  return `<div class="conclave">
    <p><b>A conclave sits</b> <small>${cv.monthsLeft} month${cv.monthsLeft === 1 ? "" : "s"} left · Rome casts ${cv.rome}</small></p>
    <ol class="conclave-rows">${rows || "<li>No crown has cardinals yet.</li>"}</ol>
    ${gold}
    <p class="hint">The realm with the most votes is the Pope's patron. If Rome wins or ties, an Italian Pope has no patron.</p>
  </div>`;
}

/** The badge after the Faith line on a realm's General tab (RELG-138). */
export function faithBadgeHtml(b: FaithHeadsView["badges"][number]): string {
  return b ? ` <span class="badge${b.warn ? " down" : ""}">${esc(b.text)}</span>` : "";
}

/** Before Declare war: what the head's censure would cost (RELG-137). */
export function censureWarningHtml(c: FaithHeadsView["censure"][number] | undefined): string {
  if (!c) return "";
  const head = c.head.charAt(0).toUpperCase() + c.head.slice(1);
  return `<div class="censure-warn framed-soft">
    <p class="warn">${icon("swords", 1)}${esc(head)} will censure this war.</p>
    <ul>
      <li><em>${esc(c.wrong)}</em> ${c.weight} with ${c.realms} realm${c.realms === 1 ? "" : "s"} of your faith, while the war lasts and fading over ${c.fadeYears} years after the peace</li>
      <li>${c.lords ? `Your ${c.lords} lord${c.lords === 1 ? "" : "s"} waver one step` : "You have no lords to waver"}</li>
      <li>Every one of those realms holds the <em>Punish</em> aim against you</li>
    </ul>
    <p class="hint">A peace that gives back everything you took ends it at once.</p>
  </div>`;
}

/** The Faiths map mode's key: a button per seat that opens its head's card. */
export function seatKeyHtml(v: FaithHeadsView | undefined): string {
  if (!v?.seats.length) return "";
  return `<div class="seat-keys">${v.seats
    .filter((s) => s.province >= 0)
    .map((s) => `<button class="paper" data-head-view="${s.head}">${icon("seat", 1)}${esc(s.name)} <small>${esc(s.seat)}</small></button>`)
    .join("")}</div>`;
}
