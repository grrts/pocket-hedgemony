import type { GovernmentView, NextFormView, RevolutionView } from "@ph/engine";
import { icon } from "../art/ui.ts";
import { regimeCard } from "./revolution.ts";
import { START_YEAR } from "@ph/rules/start";

/**
 * Government on the realm card (GOV-064 to GOV-066): the Government tab of
 * the player's own card shows the form, both caps as "x of y" with their
 * parts and what going over does, the laws the form sets, and the forms it
 * can become, each with its needs and a Reform button that asks once more
 * before it pays. The General tab carries one line that opens the tab.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FAMILY: Record<string, string> = {
  house: "Rule by a house",
  citizens: "Rule by citizens",
  faith: "Rule by faith",
  kin: "Rule by kin",
  warriors: "Rule by warriors",
  modern: "Modern rule",
};

/** The reform waiting for a second tap, by form id; the player's choice, kept between renders. */
export const governmentUi = { confirm: null as string | null };

const PART: Record<string, string> = { form: "Form", custom: `Custom since ${START_YEAR}` };

/** One cap: "x of y", a bar, its parts, and what going over it does. */
function capBlock(label: string, used: number, cap: GovernmentView["officials"]["cap"], over: string, tab: string): string {
  const full = cap.total > 0 ? Math.min(100, Math.round((used / cap.total) * 100)) : used > 0 ? 100 : 0;
  const parts = cap.parts.map((p) => `${PART[p.source] ?? p.source} ${p.value}`).join(" · ");
  const isOver = used > cap.total;
  return `<button class="paper cap${isOver ? " over" : ""}" data-realm-open-tab="${tab}">
      <b>${label} ${used} of ${cap.total}</b>
      <span class="progress"><i style="width:${full}%"></i></span>
      <small>${esc(parts)}</small>
      ${isOver ? `<em>${esc(over)}</em>` : ""}
    </button>`;
}

const subjectsLaw = (r: number | null) =>
  r === null ? "None: this form holds no subjects" : r === 0 ? "Leaves your subject limit as it is" : r > 0 ? `Raises your subject limit by ${r}` : `Lowers your subject limit by ${-r}`;

/** A horde's edge and its end, opening the first invention its riders fade against in the tree (GOV-077). */
function ridersLaw(r: GovernmentView["riders"]): string {
  if (!r?.length) return "";
  const list = r.map((x) => `${esc(x.label)} (${esc(x.id)})`);
  const named = list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0];
  return `<dt>Your riders</dt><dd><button class="paper law-line" data-realm-open-tab="learning" data-learn-pick="${esc(r[0]!.id)}">Strong until your enemies field ${named}</button></dd>`;
}

/** One form the realm can become: what changes, what it needs and the button (or why not). */
function nextCard(v: GovernmentView, x: NextFormView): string {
  const offNow = v.officials.cap.parts.find((p) => p.source === "form")?.value ?? 0;
  const lordsNow = v.lords.cap.parts.find((p) => p.source === "form")?.value ?? 0;
  const reachNow = v.laws.subjectReach;
  const reach = reachNow !== null && x.subjectReach !== null && x.subjectReach !== reachNow ? ` · Subject reach ${signed(x.subjectReach - reachNow)}` : "";
  const change = `Officials ${signed(x.officials - offNow)} · Lords ${signed(x.lords - lordsNow)}${reach}`;
  // A reform keeps every invention (INV-RSCH-1); the card names those that help in the new form, opening them in the tree (GOV-077, GOV-078).
  const helped = x.helpedBy.length
    ? `<button class="paper law-line" data-realm-open-tab="learning" data-learn-pick="${esc(x.helpedBy[0]!.id)}">Keeps every invention you know. Helps once settled: ${x.helpedBy.map((h) => `${esc(h.id)} ${esc(h.name)}`).join(", ")}</button>`
    : "";
  const needs = x.needs.length
    ? `<ul class="needs">${x.needs.map((n) => `<li class="${n.met ? "met" : "unmet"}">${n.met ? "✓" : "✗"} ${esc(n.label)}</li>`).join("")}</ul>`
    : "";
  let action: string;
  if (x.way === "revolution") action = `<p class="hint">Comes only by revolution or event.</p>`;
  else if (x.way === "condition") action = `<p class="hint">Comes by itself when this happens; it can't be ordered.</p>`;
  else if (governmentUi.confirm === x.id && !x.whyNot)
    action = `<p>Pay ${x.gold} gold${x.lordsSlip ? ` and ${x.lordsSlip} lord${x.lordsSlip === 1 ? "" : "s"} lose${x.lordsSlip === 1 ? "s" : ""} a loyalty step` : ""}?</p>
      <div class="confirm-row"><button class="wax" data-reform="${x.id}">${icon("crown", 2)}Reform</button><button class="paper" data-reform-cancel>Cancel</button></div>`;
  // A missing need is already marked ✗ above; only another reason (gold) is written out.
  else if (x.whyNot) action = `<button class="paper" disabled>Reform · ${x.gold} gold</button>${x.whyNot.startsWith("needs ") ? "" : `<p class="hint">${esc(cap1(x.whyNot))}.</p>`}`;
  else action = `<button class="wax" data-reform-ask="${x.id}">${icon("crown", 2)}Reform · ${x.gold} gold</button>`;
  const cost = x.way === "reform" ? `<small>${x.gold} gold${x.lordsSlip ? ` · ${x.lordsSlip} lord${x.lordsSlip === 1 ? "" : "s"} lose${x.lordsSlip === 1 ? "s" : ""} a step` : " · no lord minds"}</small>` : "";
  return `<div class="next-form framed-soft">
      <p><b>${esc(x.name)}</b> <small>${esc(FAMILY[x.family] ?? x.family)}</small><br><small>${change}</small></p>
      ${helped}${needs}${cost}${action}
    </div>`;
}

/** The Government tab of the player's own card; under the form, the regime a revolution set and the ruler (REVO-092). */
export function governmentTab(v: GovernmentView, revo?: RevolutionView | null): string {
  const lordsOver = v.lords.used - v.lords.cap.total;
  const officialsOver = v.officials.used - v.officials.cap.total;
  const officials = capBlock("Officials", v.officials.used, v.officials.cap, `${officialsOver} over: the newest ${officialsOver === 1 ? "official's province has" : `${officialsOver} officials' provinces have`} Grasping officials`, "officials");
  const lords = capBlock("Lords", v.lords.used, v.lords.cap, `At New Year ${lordsOver} lord${lordsOver === 1 ? "" : "s"} will lose a loyalty step`, "lords");
  return `<h3 class="sub">${esc(v.form)}</h3>
    <p class="hint">${esc(FAMILY[v.family] ?? v.family)}. The form sets how many officials and lords you can hold, and the laws below. Tap a cap to see its people.</p>
    ${regimeCard(revo)}
    <div class="caps">${officials}${lords}</div>
    <h3 class="sub">Laws of the realm</h3>
    <dl class="facts">
      <dt>Succession</dt><dd>${esc(cap1(v.laws.succession))}</dd>
      <dt>Colonies</dt><dd>${v.laws.colonialRange ? `Up to ${v.laws.colonialRange} sea zones from your ports` : "None"}</dd>
      <dt>Subjects</dt><dd>${subjectsLaw(v.laws.subjectReach)}</dd>${ridersLaw(v.riders)}
    </dl>
    <h3 class="sub">Reform</h3>
    ${v.next.length ? `<p class="hint">A reform changes the form for good: it costs gold, and some lords dislike it.</p><div class="next-forms">${v.next.map((x) => nextCard(v, x)).join("")}</div>` : `<p class="hint">This form has no next form.</p>`}`;
}

/** The General tab's line: form and both caps, opening the Government tab. */
export function governmentLine(v: GovernmentView): string {
  const over = v.officials.used > v.officials.cap.total || v.lords.used > v.lords.cap.total;
  return `<dt>Government</dt><dd><button class="paper${over ? " over" : ""}" data-realm-open-tab="government" title="Open the Government tab">${icon("crown", 1)}${esc(v.form)} <small>officials ${v.officials.used}/${v.officials.cap.total} · lords ${v.lords.used}/${v.lords.cap.total}</small></button></dd>`;
}
