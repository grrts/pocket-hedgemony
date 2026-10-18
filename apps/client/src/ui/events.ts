import type { EventCard } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The event card (milestone 6, EVT-076, SHELL-080): one event at a time over
 * the map, oldest first. The year it happened in history and what happened
 * then, what comes whatever is chosen, and each option as a 44-point button
 * with its effects in words, the historical one marked. Look at the map folds
 * it into the End turn button until the player comes back to it.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const list = (lines: string[]) => (lines.length ? `<ul class="event-effects">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : "");

export function eventCardHtml(card: EventCard, waiting: number): string {
  const history = card.year ? `In history, ${card.year}` : "In history";
  return `
    <header>
      <div>
        <h2 class="ribbon" id="event-title">${esc(card.title)}</h2>
        <small>${card.kind === "offered" ? "A decision for you" : card.major ? "A great event" : "An event"}${waiting > 1 ? ` · ${waiting - 1} more waiting` : ""}</small>
      </div>
      <button class="paper fold" data-event-fold title="Look at the map" aria-label="Look at the map">${icon("map", 2)}</button>
    </header>
    <div class="event-body">
      <div class="event-story">
        ${card.text ? `<p><b>${esc(history)}:</b> ${esc(card.text)}</p>` : ""}
        ${card.always.length ? `<h3 class="sub">Whatever you choose</h3>${list(card.always)}` : ""}
      </div>
      <div class="event-options">
        <h3 class="sub">${card.kind === "offered" ? "Will you?" : "Your choice"}</h3>
        ${card.options
          .map(
            (o) => `<button class="${o.historical ? "wax" : "paper"} event-option" data-event-option="${esc(o.id)}" data-event="${esc(card.event)}">
              <span class="name">${esc(o.name)}${o.historical ? ` <small>As in history</small>` : ""}</span>
              ${o.effects.length ? `<span class="does">${o.effects.map(esc).join(" · ")}</span>` : ""}
            </button>`,
          )
          .join("")}
      </div>
    </div>`;
}

/** The waiting events at the top of the dispatches, each with Answer (EVT-076). */
export function waitingEventsHtml(cards: EventCard[]): string {
  return cards
    .map(
      (c) => `<div class="call framed-soft">
        <p>${icon("scroll", 2)} <span><b>${esc(c.title)}</b>: ${c.kind === "offered" ? "a decision is open to you" : "your answer is awaited"}.</span></p>
        <div class="choices"><button class="wax" data-event-open="${esc(c.event)}">Answer</button></div>
      </div>`,
    )
    .join("");
}
