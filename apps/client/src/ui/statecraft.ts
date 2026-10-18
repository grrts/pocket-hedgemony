import type { StatecraftView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Statecraft on the realm card's Diplomacy tab (milestone 5, DIPL-197 to
 * DIPL-202): for another realm, what it thinks of you and why, and the
 * envoys you can send it, each a 44-point button with what it does or why
 * not; for your own realm, your envoys abroad and the answers that came
 * back, each with the reasons the court counted behind a tap.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthText = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${m ? MONTHS[m - 1] + " " : ""}${y}`;
};
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The missions in the engine's ENVOY_ACTIONS order: the button and what it does. */
const MISSIONS: { action: string; label: string; does: (v: StatecraftView) => string }[] = [
  { action: "propose_alliance", label: "Propose an alliance", does: () => "Allies answer each other's calls to arms. They say yes only if their reasons add up above nothing." },
  { action: "arrange_marriage", label: "Arrange a marriage", does: () => "Married houses think better of each other (+15), and a marriage can bring a claim when a ruler dies without an heir." },
  { action: "courtesy_visit", label: "Courtesy visit", does: () => "Always welcome: +15 standing with them, fading over 5 years." },
  { action: "send_gift", label: "Send a gift", does: (v) => `${v.giftGold} gold: +30 standing with them, fading over 10 years.` },
];

export const missionName = (action: string): string =>
  ({ propose_alliance: "propose an alliance", arrange_marriage: "arrange a marriage", courtesy_visit: "pay a courtesy visit", send_gift: "bring a gift" })[action] ?? action.replace(/_/g, " ");

/** The reasons a court counted, as a tap-to-open list (DIPL-081, the Why? letter). */
function reasonsHtml(l: StatecraftView["letters"][number]): string {
  if (!l.reasons.length) return "";
  return `<details class="why"><summary>Why?</summary><dl class="facts">${l.reasons.map((r) => `<dt>${esc(r.name)}</dt><dd>${signed(r.number)}</dd>`).join("")}${l.total !== undefined ? `<dt><b>All told</b></dt><dd><b>${signed(l.total)}</b></dd>` : ""}</dl></details>`;
}

/** Another realm's statecraft: standing and its reasons, an envoy on the way, the last answer, and the missions to send. */
export function realmStatecraft(v: StatecraftView | null, r: number, allied: boolean, atWar: boolean): string {
  const realm = v?.realms[r];
  if (!v || !realm) return "";
  const envoy = v.envoys.find((e) => e.target === r);
  const letter = v.letters.find((l) => l.from === r);
  const standing = `<h3 class="sub">What they think of you</h3>
    <p><b>${esc(realm.word)}</b> (${signed(realm.standing)})${realm.married ? " · your houses are married" : ""}</p>
    ${realm.lines.length ? `<dl class="facts">${realm.lines.map((x) => `<dt>${esc(x.name)}</dt><dd>${signed(x.weight)}</dd>`).join("")}</dl>` : `<p class="hint">You have had no dealings with them yet.</p>`}`;
  const away = envoy
    ? `<p>${icon("scroll", 1)} Your envoy ${envoy.status === "road" ? `rides to ${missionName(envoy.action)}; he reaches their court in ${monthText(envoy.arrival)}` : envoy.status === "court" ? `is at their court to ${missionName(envoy.action)}` : "is on his way home"}.</p>`
    : "";
  const last = letter ? `<div class="call framed-soft"><p>${icon("scroll", 1)} ${esc(letter.text)} <small>(${monthText(letter.month)})</small></p>${reasonsHtml(letter)}</div>` : "";
  const missions = atWar
    ? `<p class="hint">No envoys go to a court you are at war with, except to make peace.</p>`
    : `<h3 class="sub">Send an envoy</h3>
    <p class="hint">${v.free} of your ${v.seats} envoy${v.seats === 1 ? "" : "s"} free. An envoy rides to their court, stays a month, and their answer reaches you a month after.</p>
    <div class="missions">${MISSIONS.map((m, k) => {
      const why = realm.why[k] ?? null;
      return why === null
        ? `<button class="wax" data-envoy="${m.action}">${icon("scroll", 2)}${m.label}</button><p class="hint">${esc(m.does(v))}</p>`
        : `<button class="paper" disabled>${m.label}</button><p class="hint">${esc(why.charAt(0).toUpperCase() + why.slice(1))}.</p>`;
    }).join("")}</div>
    ${allied ? `<button class="paper" data-break-alliance="${r}">End the alliance</button><p class="hint">An oath broken: they will remember it (−40, fading over 20 years), and other courts trust you less.</p>` : ""}`;
  return `${standing}${away}${last}${missions}`;
}

/** Your own statecraft: envoys abroad and the answers of the last two years. */
export function myStatecraft(v: StatecraftView | null, realmButton: (n: number) => string): string {
  if (!v) return "";
  return `<h3 class="sub">Envoys</h3>
    <p>${v.free} of ${v.seats} free. <span class="hint">More come with more than 10 provinces and with inventions.</span></p>
    ${v.envoys.length ? v.envoys.map((e) => `<p>${icon("scroll", 1)} ${realmButton(e.target)} <small>${e.status === "road" ? `to ${missionName(e.action)}, there in ${monthText(e.arrival)}` : e.status === "court" ? `at court, to ${missionName(e.action)}` : `coming home${e.home ? ` in ${monthText(e.home)}` : ""}`}</small></p>`).join("") : `<p class="hint">Open another realm to send an envoy there.</p>`}
    ${v.letters.length ? `<h3 class="sub">Answers</h3>${v.letters.slice(0, 8).map((l) => `<div class="letter"><p>${esc(l.text)} <small>(${monthText(l.month)})</small></p>${reasonsHtml(l)}</div>`).join("")}` : ""}`;
}
