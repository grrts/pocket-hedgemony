import type { CampaignView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The win scores and the end of the campaign on screen (SHELL-149 to SHELL-151):
 * a Score line on every realm's General tab, the player's Score tab with the
 * breakdown and the ledger, and the end card that opens when the campaign ends.
 */

const SCORES = ["Economy", "Power", "Technology"] as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${({ "&": "amp", "<": "lt", ">": "gt", '"': "quot" })[c]};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
export const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
const isoText = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m! - 1]} ${y}`;
};

/** The General tab's Score line: three scores with a rank each; on the player's card a button to the Score tab. */
export function scoreLine(v: CampaignView, r: number, mine: boolean): string {
  const rank = (k: number) => v.ranks[r * 3 + k]!;
  if (!rank(0)) return `<dt>Score</dt><dd>No longer on the map</dd>`;
  const parts = SCORES.map((s, k) => `<span>${s} ${fmt(v.scores[r * 3 + k]!)} · <b>${ordinal(rank(k))}</b></span>`).join(" ");
  return `<dt>Score</dt><dd class="score-line">${mine ? `<button class="paper" data-realm-open-tab="score" title="How each score is made">${icon("crown", 1)}${parts}</button>` : parts}</dd>`;
}

/** The player's breakdown, each score with how it is made and its rank. */
function breakdown(v: CampaignView): string {
  const m = v.mine;
  if (!m) return "";
  const row = (k: number, made: string) => `<div class="score-part"><b>${SCORES[k]}</b><span class="made">${made}</span><span class="total">${fmt(m.scores[k]!)}</span><em>${ordinal(m.ranks[k]!)} of ${v.realms}</em></div>`;
  return `<div class="score-parts">
    ${row(0, `${fmt(m.income)} income a year ${m.bank < 0 ? "−" : "+"} ${fmt(Math.abs(m.bank))} in the bank`)}
    ${row(1, `${m.provinces % 1 ? m.provinces.toFixed(1) : m.provinces} provinces + ${m.army.toFixed(1)} army power`)}
    ${row(2, `inventions known, weighted by era`)}
  </div>`;
}

/** The ledger: the five leading realms and the player, their three scores with ranks (SHELL-099). */
function ledger(v: CampaignView, me: number, name: (n: number) => string): string {
  return `<table class="troops score-ledger"><thead><tr><th>Realm</th>${SCORES.map((s) => `<th class="num">${["Econ.", "Power", "Tech."][SCORES.indexOf(s)]}</th>`).join("")}</tr></thead><tbody>${v.ledger
    .map((r) => `<tr${r.nation === me ? ` class="mine"` : ""}><td><button class="paper realm-link" data-realm="${r.nation}">${esc(name(r.nation))}</button></td>${r.scores.map((s, k) => `<td class="num">${fmt(s)}<small>${ordinal(r.ranks[k]!)}</small></td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

/** The player's Score tab (SHELL-150). */
export function scoreTab(v: CampaignView, me: number, name: (n: number) => string): string {
  return `<h3 class="sub">Score</h3>
    <p class="hint">Worked out ${v.scoresDate ? `on ${isoText(v.scoresDate)}` : "at the start"} and each January. On ${isoText(v.endDate)} the realm leading each score wins it; ties share the win.</p>
    ${breakdown(v)}
    <h3 class="sub">The leading realms</h3>
    ${ledger(v, me, name)}`;
}

const CHOICE: Record<string, { key: string; note?: string; wax?: true }> = {
  "Look at the map": { key: "look" },
  "New game": { key: "new" },
  "Keep playing": { key: "keep", wax: true, note: "On to the end date" },
  "Play on as another realm": { key: "play-on", wax: true, note: "Achievements end for this campaign" },
};

/** The end card (SHELL-151): how it ended, the outcome, the breakdown and ledger, the highs, and two choices. */
export function endCard(v: CampaignView, name: (n: number) => string): string {
  const e = v.ending!;
  const won = e.outcome.startsWith("Victory");
  return `<div class="end-card">
    <p class="end-headline">${esc(e.headline)}</p>
    <p class="end-outcome${won ? " won" : ""}">${icon(won ? "crown" : "scroll", 2)}<b>${esc(e.outcome)}</b></p>
    <dl class="facts end-highs">
      <dt>Largest size</dt><dd>${fmt(e.highs.largest)} province${e.highs.largest === 1 ? "" : "s"}</dd>
      <dt>Years lasted</dt><dd>${e.highs.years}</dd>
      <dt>Battles won</dt><dd>${fmt(e.highs.battlesWon)}</dd>
    </dl>
    ${breakdown(v)}
    <h3 class="sub">The leading realms</h3>
    ${ledger(v, e.realm, name)}
    <div class="end-choices">${e.choices
      .map((c) => {
        const ch = CHOICE[c]!;
        return `<button class="${ch.wax ? "wax" : "paper"}" data-end="${ch.key}">${esc(c)}${ch.note ? `<small>${esc(ch.note)}</small>` : ""}</button>`;
      })
      .join("")}</div>
  </div>`;
}
