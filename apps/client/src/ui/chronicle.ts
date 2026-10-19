import { startGoals, type GoalDef } from "@ph/rules";
import type { ChronicleRow, ChronicleView, GoalView } from "@ph/engine";
import { fold } from "./fold.ts";

/**
 * The Chronicle (EVT-097): the News's History tab, with the turning points
 * ahead and whether each is on course, bent or gone, and those that happened;
 * and every realm's aims (EVT-098), on another realm's card and as hints for
 * the player's own realm at the foot of the History tab.
 */

export interface ChronicleUi {
  /** A realm as a button that opens its card. */
  realm: (n: number) => string;
  esc: (s: string) => string;
  /** The player's realm, or -1. */
  me: number;
}

const STATE: Record<ChronicleRow["state"], { word: string; mark: string }> = {
  on_course: { word: "On course", mark: "●" },
  bent: { word: "Bent", mark: "◐" },
  gone: { word: "Gone", mark: "○" },
  happened: { word: "Happened", mark: "✔" },
};

const goalOf = (k: number, defs: readonly GoalDef[]): GoalDef | undefined => defs[k];

/** "1378–1390", "from 1378". */
export const windowText = (w: GoalDef["window"]) => (w[1] === null ? `from ${w[0]}` : w[0] === w[1] ? `${w[0]}` : `${w[0]}–${w[1]}`);

function goalLine(g: GoalDef, ui: ChronicleUi): string {
  return `<b>${ui.esc(g.goal)}</b> <span class="why">Why: ${ui.esc(g.reason)}</span>`;
}

function rowHtml(r: ChronicleRow, ui: ChronicleUi, defs: readonly GoalDef[]): string {
  const s = STATE[r.state];
  const when = r.happened ? `${r.happened.year}${r.happened.timing === "as in history" ? ", as in history" : `, ${r.happened.timing} (history ${r.year})`}` : `history ${r.year}`;
  const title = `<span class="chron-mark ${r.state}" aria-hidden="true">${s.mark}</span>${ui.esc(r.name)}`;
  const why = r.bent === "overdue" ? " · overdue" : r.bent === "goals gone" ? " · those heading there went another way" : "";
  const summary = `${r.happened ? "" : `${s.word} · `}${when}${why}`;
  if (!r.heading.length) return `<div class="chron-row ${r.state}"><b>${title}</b><small>${summary}</small></div>`;
  const body = `<ul class="chron-heading">${r.heading.map((h) => `<li>${ui.realm(h.realm)} ${goalOf(h.goal, defs) ? goalLine(goalOf(h.goal, defs)!, ui) : ""}</li>`).join("")}</ul>`;
  return fold(`chron:${r.key}`, title, `${summary} · ${r.heading.length} heading there`, body).replace('class="inst-fold"', `class="inst-fold chron-row ${r.state}"`);
}

/** The History tab of the News (EVT-097). */
export function chronicleHtml(view: ChronicleView, goals: readonly GoalView[], ui: ChronicleUi, defs: readonly GoalDef[] = startGoals): string {
  const c = view.counts;
  const mine = goals.filter((g) => g.realm === ui.me && goalOf(g.goal, defs));
  return `
    <div class="chronicle">
      <p class="chron-counts"><span>${STATE.on_course.mark} On course ${c.on_course}</span><span>${STATE.bent.mark} Bent ${c.bent}</span><span>${STATE.gone.mark} Gone ${c.gone}</span></p>
      <p class="hint">History is a guide, not a script: realms chase the goals they had, and the world can go its own way.</p>
      <h3 class="sub">Ahead</h3>
      ${view.ahead.length ? view.ahead.map((r) => rowHtml(r, ui, defs)).join("") : `<p class="hint">No turning point of history is near.</p>`}
      <h3 class="sub">Happened</h3>
      ${view.happened.length ? view.happened.map((r) => rowHtml(r, ui, defs)).join("") : `<p class="hint">None yet.</p>`}
      ${mine.length ? fold("chron:mine", "History's plan for your realm", `${mine.length} hint${mine.length === 1 ? "" : "s"}, nothing enforces them`, aimsList(mine, ui, defs)) : ""}
    </div>`;
}

function aimsList(goals: readonly GoalView[], ui: ChronicleUi, defs: readonly GoalDef[]): string {
  return `<ul class="aims">${goals
    .map((g) => {
      const d = goalOf(g.goal, defs)!;
      const what = g.swapped && d.deviation ? `<b>${ui.esc(d.deviation)}</b>, going its own way` : goalLine(d, ui);
      return `<li>${what}<small>${windowText(d.window)}${g.target >= 0 ? ` · ${ui.realm(g.target)}` : ""}</small></li>`;
    })
    .join("")}</ul>`;
}

/** The Aims fold on another realm's General tab (EVT-098); nothing when it has no live goal. */
export function aimsFoldHtml(realm: number, goals: readonly GoalView[], ui: ChronicleUi, defs: readonly GoalDef[] = startGoals): string {
  const its = goals.filter((g) => g.realm === realm && goalOf(g.goal, defs));
  if (!its.length) return "";
  return fold(`aims:${realm}`, `Aims · ${its.length}`, ui.esc(goalOf(its[0]!.goal, defs)!.goal), aimsList(its, ui, defs));
}
