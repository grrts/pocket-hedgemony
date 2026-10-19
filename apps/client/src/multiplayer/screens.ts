import { icon } from "../art/ui.ts";
import type { OnlineGame, Seat } from "./lobby.ts";

/** What the screens need to name and draw a realm. */
export interface RealmLook {
  name: (id: string) => string;
  pennant: (id: string, scale?: number) => string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The Multiplayer dialog over the start screen: Pass and play on this device,
 * or an online game to host, join by its code, or come back to. No list of
 * every game: there may be thousands, and a friend's game is found by its code.
 */
export function menuHtml(
  look: RealmLook,
  o: { reach: "online" | "this browser" | null; canWrite: boolean | null; mine: { code: string; realm: string }[]; message: string | null; busy: boolean },
): string {
  const online =
    o.reach === null
      ? `<p class="mp-note">Looking for the shared table…</p>`
      : o.canWrite === false
        ? `<p class="mp-note mp-bad">You can open this page but not write to it, so you cannot sit at an online game. The page's owner can invite you by email as an Editor (the page must not also be shared by a public link).</p>`
        : `<p class="mp-note">${o.reach === "online" ? "Host a game and share its code, or type a friend's code." : "No shared table here: games reach only other tabs of this browser. Open the published game to play across devices."}</p>
    <button class="paper" data-mp="host" ${o.busy ? "disabled" : ""}>${icon("castle", 2)}<span><b>Host a game</b><small>choose your realm, then share the code</small></span></button>
    <form class="mp-join" data-mp-join-form>
      <label for="mp-code-input">Join a game</label>
      <input id="mp-code-input" name="code" class="paper" placeholder="CODE" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" required ${o.busy ? "disabled" : ""}>
      <button class="wax" type="submit" ${o.busy ? "disabled" : ""}>Join</button>
    </form>
    ${o.message ? `<p class="mp-note mp-bad" role="alert">${esc(o.message)}</p>` : ""}
    ${
      o.mine.length
        ? `<h3>Your games</h3><div class="mp-games">${o.mine
            .map(
              (g) =>
                `<button class="paper mp-game" data-mp-rejoin="${esc(g.code)}" data-realm="${esc(g.realm)}" ${o.busy ? "disabled" : ""}><span class="mp-code">${esc(g.code)}</span>${look.pennant(g.realm)}<span>${esc(look.name(g.realm))}<small>tap to continue</small></span></button>`,
            )
            .join("")}</div>`
        : ""
    }`;
  return `<div class="start-more mp-menu framed" role="dialog" aria-label="Multiplayer">
    <header><h2 class="ribbon">Multiplayer</h2><span class="panel-buttons"><button class="close" data-mp="close" aria-label="Close">${icon("close", 2)}</button></span></header>
    <p class="mp-note">Everyone plans the same week at once; when all are ready, the orders are carried out together and the week plays.</p>
    <button class="wax" data-mp="hotseat">${icon("crown", 2)}<span><b>Pass and play</b><small>2 to 4 realms on this device</small></span></button>
    <h3>Online</h3>
    ${online}
  </div>`;
}

/** The lobby card: the game's code, who sits where, and Start for the host. */
export function lobbyHtml(look: RealmLook, game: OnlineGame, seats: Seat[], me: string, closeButtons: string): string {
  const host = game.host === me;
  return `<header><h2 class="ribbon">Game ${esc(game.code)}</h2>${closeButtons}</header>
    <p class="mp-note">Share the code <b class="mp-code">${esc(game.code)}</b>: others open Multiplayer, type it under Join a game and choose a realm.</p>
    <ul class="mp-players">${seats
      .map((s) => `<li>${look.pennant(s.realm)}<b>${esc(look.name(s.realm))}</b><small>${s.realm === me ? "you" : s.realm === game.host ? "host" : "ready to start"}</small></li>`)
      .join("")}</ul>
    ${
      host
        ? `<button class="wax play" data-mp-start ${seats.length < 2 ? "disabled" : ""}>${icon("crown", 2)}${seats.length < 2 ? "Waiting for a second realm" : `Start with ${seats.length} realms`}</button>`
        : `<p class="mp-note">${icon("hourglass", 1)} Waiting for ${esc(look.name(game.host))} to start the game.</p>`
    }`;
}

/** Choosing the realms for Pass and play: the chosen ones in order, and Start. */
export function hotseatPickHtml(look: RealmLook, chosen: string[]): string {
  return `<div class="mp-chosen">${chosen.length ? chosen.map((r, k) => `<button class="paper" data-mp-unpick="${esc(r)}" title="Take ${esc(look.name(r))} out">${k + 1}. ${look.pennant(r)}${esc(look.name(r))}</button>`).join("") : `<p class="mp-note">Tap 2 to 4 realms below or on the map.</p>`}</div>
    <button class="wax play" data-mp-go ${chosen.length < 2 ? "disabled" : ""}>${icon("crown", 2)}${chosen.length < 2 ? "Choose at least two realms" : `Start with ${chosen.length} realms`}</button>`;
}

export interface PlayerRow {
  realm: string;
  state: "planning" | "ready" | "waiting" | "you" | "done";
  hash?: string;
}

/** The Players card: who plays, who is ready, whether the devices agree, the order orders go in. */
export function playersHtml(
  look: RealmLook,
  o: { mode: "hotseat" | "online"; code?: string; week: number; rows: PlayerRow[]; order: string[]; outOfStep: string | null; reach?: string },
  closeButtons: string,
): string {
  const word: Record<PlayerRow["state"], string> = { planning: "planning", ready: "ready", waiting: "still planning", you: "you: planning", done: "orders in" };
  return `<header><h2 class="ribbon">Players</h2>${closeButtons}</header>
    <p class="mp-note">${o.mode === "hotseat" ? "Pass and play on this device." : `Online game <b>${esc(o.code ?? "")}</b>${o.reach === "this browser" ? " (this browser's tabs only)" : ""}.`} Week ${o.week + 1}.</p>
    <ul class="mp-players">${o.rows.map((r) => `<li>${look.pennant(r.realm)}<b>${esc(look.name(r.realm))}</b><small class="mp-${r.state}">${word[r.state]}</small></li>`).join("")}</ul>
    <p class="mp-note">This week's orders are carried out in this order: ${o.order.map((r) => esc(look.name(r))).join(", then ")}. It turns each week.</p>
    <p class="mp-note ${o.outOfStep ? "mp-bad" : ""}">${o.outOfStep ? esc(o.outOfStep) : "All devices agree on the world."}</p>
    <button class="paper" data-mp-leave>${icon("back", 2)}Leave the game</button>`;
}
