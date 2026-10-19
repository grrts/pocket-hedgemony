import type { CampaignView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The win scores and the end of the campaign on screen (SHELL-162 to SHELL-164):
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

/** Growth as shown: ×1.84 (REALM-312). */
export const times = (g: number): string => `×${g.toFixed(2)}`;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const roman = (n: number) => ROMAN[n - 1] ?? String(n);

/** The General tab's Score line: each score's growth since the start with a rank; on the player's card a button to the Score tab. */
export function scoreLine(v: CampaignView, r: number, mine: boolean): string {
  const rank = (k: number) => v.ranks[r * 3 + k]!;
  if (!rank(0)) return `<dt>Score</dt><dd>No longer on the map</dd>`;
  const parts = SCORES.map((s, k) => `<span>${s} ${times(v.growth[r * 3 + k]!)} · <b>${ordinal(rank(k))}</b></span>`).join(" ");
  return `<dt>Score</dt><dd class="score-line">${mine ? `<button class="paper" data-realm-open-tab="score" title="How each score is made">${icon("crown", 1)}${parts}</button>` : parts}</dd>`;
}

/** The player's breakdown: how each score is made now, its average, its growth since the start and over this chapter, each with its place. */
function breakdown(v: CampaignView): string {
  const m = v.mine;
  if (!m) return "";
  const row = (k: number, made: string) => `<div class="score-part"><b>${SCORES[k]}</b><span class="total">${times(m.growth[k]!)} · ${ordinal(m.ranks[k]!)}</span>
    <span class="made">${made}</span><em>of ${v.realms}</em>
    <span class="made">Average ${fmt(m.scores[k]!)} over ${m.years} year${m.years === 1 ? "" : "s"}, against ${fmt(m.starts[k]!)} at the start</span>
    <span class="made chapter">This chapter ${times(m.chapterGrowth[k]!)} · ${ordinal(m.chapterRanks[k]!)}, against ${fmt(m.chapterStarts[k]!)}</span></div>`;
  const bank = m.bank === m.counted ? `${m.bank < 0 ? "−" : "+"} ${fmt(Math.abs(m.bank))} in the bank` : `+ ${fmt(m.counted)} of ${fmt(m.bank)} in the bank (up to a year's income)`;
  return `<div class="score-parts">
    ${row(0, `Now ${fmt(m.now[0])}: ${fmt(m.income)} income a year ${bank}`)}
    ${row(1, `Now ${fmt(m.now[1])}: ${m.provinces % 1 ? m.provinces.toFixed(1) : m.provinces} provinces + ${m.army.toFixed(1)} army power (men under arms and warships)`)}
    ${row(2, `Now ${fmt(m.now[2])}: inventions known, weighted by era`)}
  </div>`;
}

/** A ledger of realms with their growth and place in each score (SHELL-099). */
function ledgerTable(rows: { nation: number; growth: readonly number[]; ranks: readonly number[] }[], me: number, name: (n: number) => string): string {
  return `<table class="troops score-ledger"><thead><tr><th>Realm</th>${["Econ.", "Power", "Tech."].map((s) => `<th class="num">${s}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr${r.nation === me ? ` class="mine"` : ""}><td><button class="paper realm-link" data-realm="${r.nation}">${esc(name(r.nation))}</button></td>${r.growth.map((g, k) => `<td class="num">${times(g)}<small>${ordinal(r.ranks[k]!)}</small></td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

/** The ledger: the five leading realms and the player, by growth since the start. */
const ledger = (v: CampaignView, me: number, name: (n: number) => string): string => ledgerTable(v.ledger, me, name);

/** The chapters closed so far, each a button that opens its card again (SHELL-184). */
function chapterList(v: CampaignView): string {
  if (!v.chapters.length) return "";
  return `<div class="chapter-list">${v.chapters
    .map((c, i) => {
      const led = SCORES.filter((_, k) => c.leaders[k]!.includes(c.realm));
      return `<button class="paper" data-chapter="${i}"><b>Chapter ${roman(c.n)} · ${c.from}–${c.to}</b><span>${led.length ? `${icon("crown", 1)} Led ${led.join(", ")}` : SCORES.map((s, k) => `${s} ${ordinal(c.ranks[k]!)}`).join(" · ")}</span></button>`;
    })
    .join("")}</div>`;
}

/** The player's Score tab (SHELL-163, SHELL-184). */
export function scoreTab(v: CampaignView, me: number, name: (n: number) => string): string {
  const ch = v.chapter;
  return `<h3 class="sub">Score</h3>
    <p class="hint">Each score is the average of the last 25 Januaries, judged as growth against your realm's own start, so a small realm that grows can lead. Worked out ${v.scoresDate ? `on ${isoText(v.scoresDate)}` : "at the start"} and each January. On ${isoText(v.endDate)} the realm that has grown most in each score wins it; ties share the win.</p>
    <p class="chapter-due">${icon("scroll", 1)}<b>Chapter ${roman(ch.n)} · ${ch.from}–${ch.to}</b>${ch.last ? "closes with the campaign" : `closes in January ${ch.to}`}</p>
    ${breakdown(v)}
    <h3 class="sub">The leading realms</h3>
    ${ledger(v, me, name)}
    ${v.chapters.length ? `<h3 class="sub">Chapters</h3>${chapterList(v)}` : ""}`;
}

/** The chapter card (SHELL-183): how the realm did over the hundred years, who led each score, the ledger, and Play on. */
export function chapterCard(v: CampaignView, i: number, name: (n: number) => string): string {
  const c = v.chapters[i]!;
  const me = c.realm;
  const led = SCORES.filter((_, k) => c.leaders[k]!.includes(me));
  const verdict = me < 0 ? "" : led.length ? `${esc(name(me))} led ${led.length > 1 ? `${led.slice(0, -1).join(", ")} and ${led.at(-1)}` : led[0]}` : `${esc(name(me))}'s best: ${SCORES[[0, 1, 2].sort((a, b) => c.ranks[a]! - c.ranks[b]!)[0]!]} ${ordinal(Math.min(...c.ranks))} of ${c.realms}`;
  const rows = SCORES.map((s, k) => {
    const leaders = c.leaders[k]!.map(name).map(esc).join(", ");
    return `<div class="score-part"><b>${s}</b><span class="total">${me < 0 ? "" : `${times(c.growth[k]!)} · ${ordinal(c.ranks[k]!)}`}</span><span class="made">Led by ${leaders || "no one"}, ${times(c.leaderGrowth[k]!)}</span><em>${me < 0 ? "" : `of ${c.realms}`}</em></div>`;
  }).join("");
  return `<div class="end-card chapter-card">
    <p class="end-headline">${c.from}–${c.to}</p>
    ${verdict ? `<p class="end-outcome${led.length ? " won" : ""}">${icon(led.length ? "crown" : "scroll", 2)}<b>${verdict}</b></p>` : ""}
    <p class="hint">Growth since the chapter began, from each score's 25-year average.</p>
    <div class="score-parts">${rows}</div>
    <h3 class="sub">The leading realms</h3>
    ${ledgerTable(c.ledger, me, name)}
    <div class="end-choices">${c.last ? "" : `<button class="wax" data-chapter-close="play">Play on<small>Chapter ${roman(c.n + 1)} begins</small></button>`}<button class="paper" data-chapter-close="score">Score</button></div>
  </div>`;
}

const CHOICE: Record<string, { key: string; note?: string; wax?: true }> = {
  "Look at the map": { key: "look" },
  "New game": { key: "new" },
  "Keep playing": { key: "keep", wax: true, note: "On to the end date" },
  "Play on as another realm": { key: "play-on", wax: true, note: "Achievements end for this campaign" },
};

/** The end card (SHELL-164): how it ended, the outcome, the breakdown and ledger, the highs, and two choices. */
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
    ${v.chapters.length ? `<h3 class="sub">Chapters</h3>${chapterList(v)}` : ""}
    <div class="end-choices">${e.choices
      .map((c) => {
        const ch = CHOICE[c]!;
        return `<button class="${ch.wax ? "wax" : "paper"}" data-end="${ch.key}">${esc(c)}${ch.note ? `<small>${esc(ch.note)}</small>` : ""}</button>`;
      })
      .join("")}</div>
  </div>`;
}
