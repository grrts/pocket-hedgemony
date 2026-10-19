import type { RebelsView, RisingView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Rebellions on the province card and the realm's Provinces tab (REBL-063,
 * REBL-065 to REBL-067): a province rebels hold opens with the rebellion
 * card, what the rising is, what it holds and wants, how close it is to
 * winning, and the five answers as 44-point buttons; a beaten rising asks for
 * its verdict in the same place. The Provinces tab lists every rising and
 * verdict at the top, and the General tab carries one line that opens it.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The answer waiting for a second tap ("id:answer"); the player's choice, kept between renders. */
export const rebelsUi = { confirm: null as string | null };

/** An army of the player's that can march on the rebels: its slot id, commander and men. */
export interface Attacker {
  army: number;
  name: string;
  men: number;
}

const TIER_NOTE: Record<string, string> = {
  Rising: "one province",
  Rebellion: "it besieges castles beyond its land",
  "Great revolt": "by the capital: a civil war",
};

/** The rebellion card of the rising holding a province (REBL-063). */
export function risingCard(r: RisingView, name: (p: number) => string, mine: boolean, attacker: Attacker | null): string {
  const holds = r.provinces.map(name).join(", ");
  const castles = r.castles.length ? ` · ${r.castles.length === 1 ? "the castle" : "the castles"} of ${r.castles.map(name).join(", ")}` : "";
  const held = Math.min(100, Math.round((r.monthsHeld / r.monthsToWin) * 100));
  const siege = r.siege
    ? `<dt>Siege</dt><dd>The castle of ${esc(name(r.siege.province))}, month ${r.siege.months + 1} · ${fmt(r.siege.garrison)} men inside</dd>`
    : r.target >= 0 ? `<dt>Marching</dt><dd>On ${esc(name(r.target))}</dd>` : "";
  const spread = r.spreadTo.length ? `may spread to ${r.spreadTo.slice(0, 4).map(name).map(esc).join(", ")}${r.spreadTo.length > 4 ? ` and ${r.spreadTo.length - 4} more` : ""}` : "no restless neighbour to spread to";
  return `<section class="rising framed-soft" data-rising="${r.id}">
    <h3 class="sub">${icon("swords", 1)}${esc(r.tier)} in ${esc(name(r.provinces[0]!))}</h3>
    <p class="hint">${esc(cap1(r.reason))} · ${esc(TIER_NOTE[r.tier] ?? r.tier)}</p>
    <dl class="facts">
      <dt>Cause</dt><dd>${esc(r.grievance)} <small>${esc(r.cause.toLowerCase())} rising</small></dd>
      <dt>Demand</dt><dd><b>${esc(cap1(r.demand))}</b></dd>
      <dt>Leader</dt><dd>${r.leader ? `${esc(cap1(r.leader))} <small>${esc(r.leaderNote)}</small>` : `<small>${esc(r.leaderNote)}</small>`}</dd>
      <dt>Men</dt><dd>${fmt(r.men)} <small>${esc(r.joiners)}</small></dd>
      <dt>Arms</dt><dd>${esc(cap1(r.arms))} <small>fight as ×${r.armsFactor}</small></dd>
      <dt>Holds</dt><dd>${esc(holds)}${esc(castles)} <small>no tax or recruits reach you</small></dd>
      <dt>Food</dt><dd>${r.food.toFixed(1)} months where they stand</dd>
      ${siege}
      <dt>Spread</dt><dd>${plural(r.provinces.length, "province")} · ${spread}</dd>
      <dt>They win</dt><dd><span class="progress danger"><i style="width:${held}%"></i></span><small>held ${r.monthsHeld} of ${r.monthsToWin} months; beaten in battle, they scatter</small></dd>
    </dl>
    ${mine ? `<div class="answers">${r.answers.map((a) => answerButton(r, a)).join("")}
      ${attacker ? `<button class="wax" data-rebels-attack="${attacker.army}" data-rebels-to="${r.location}"><b>${icon("swords", 1)}Attack</b><small>send ${esc(attacker.name)} · ${fmt(attacker.men)} men</small></button>` : `<button class="paper" disabled><b>Attack</b><small>no army free: raise one</small></button>`}
      <button class="paper" data-rebels-wait><b>Wait</b><small>they shrink without food or arms</small></button>
    </div>` : ""}
  </section>`;
}

function answerButton(r: RisingView, a: RisingView["answers"][number]): string {
  const cost = a.gold ? ` · ${a.gold} gold` : "";
  if (a.why) return `<button class="paper" disabled><b>${esc(a.label)}${cost}</b><small>${esc(cap1(a.why))}</small></button>`;
  const key = `${r.id}:${a.answer}`;
  // Granting changes their land for good: a second tap says so.
  if (a.answer === "grant" && rebelsUi.confirm !== key) return `<button class="wax" data-rebels-ask="${key}"><b>${icon("crown", 1)}${esc(a.label)}</b><small>${esc(a.note)}</small></button>`;
  if (a.answer === "grant")
    return `<div class="confirm-row"><button class="wax" data-rebels-answer="${key}"><b>${icon("crown", 1)}Grant: ${esc(a.note)}</b></button><button class="paper" data-rebels-cancel>Cancel</button></div>`;
  return `<button class="paper" data-rebels-answer="${key}"><b>${esc(a.label)}${cost}</b><small>${esc(a.note)}</small></button>`;
}

const VERDICTS = [
  { t: "Pardon", note: "they go back to their work; they may rise again" },
  { t: "Punish the leaders", note: "no rising of this cause there for 10 years" },
  { t: "Massacre", note: "no rising there for 20 years, but Bloodshed on all their people and their lords waver" },
] as const;

/** A beaten rising waiting for its verdict (REBL-050). */
export function verdictCard(v: RebelsView["verdicts"][number], name: (p: number) => string): string {
  const key = `v${v.id}`;
  const buttons = VERDICTS.map(({ t, note }) => {
    if (t === "Massacre" && rebelsUi.confirm !== key) return `<button class="paper" data-rebels-ask="${key}"><b>${t}</b><small>${note}</small></button>`;
    if (t === "Massacre") return `<div class="confirm-row"><button class="wax" data-rebels-verdict="${v.id}" data-treatment="Massacre">Massacre them</button><button class="paper" data-rebels-cancel>Cancel</button></div>`;
    return `<button class="${t === "Pardon" ? "wax" : "paper"}" data-rebels-verdict="${v.id}" data-treatment="${t}"><b>${t}</b><small>${note}</small></button>`;
  }).join("");
  return `<section class="rising framed-soft">
    <h3 class="sub">${icon("crown", 1)}The rebels of ${esc(name(v.province))} are beaten</h3>
    <p>${v.leader ? `${esc(cap1(v.leader))} is taken. ` : ""}A third of them died, a third fled abroad and ${fmt(v.homeless)} went home with nothing. What becomes of them?</p>
    <div class="answers">${buttons}</div>
  </section>`;
}

/** The Provinces tab's Risings block: every rising and verdict of the realm at a glance. */
export function risingsOverview(v: RebelsView, me: number, name: (p: number) => string): string {
  const mine = v.risings.filter((r) => r.owner === me);
  if (!mine.length && !v.verdicts.length) return "";
  const rows = mine.map(
    (r) => `<button class="paper rising-row" data-open-province="${r.provinces[0]}">${icon("swords", 1)}<span><b>${esc(r.tier)} in ${esc(name(r.provinces[0]!))}</b><small>${esc(r.grievance)} · ${fmt(r.men)} men · ${plural(r.provinces.length, "province")} · held ${r.monthsHeld} of ${r.monthsToWin} months</small></span></button>`,
  );
  const verdicts = v.verdicts.map(
    (x) => `<button class="wax rising-row" data-open-province="${x.province}">${icon("crown", 1)}<span><b>Beaten rebels of ${esc(name(x.province))}</b><small>choose their fate</small></span></button>`,
  );
  return `<h3 class="sub">Uprisings</h3><div class="risings">${[...verdicts, ...rows].join("")}</div>`;
}

