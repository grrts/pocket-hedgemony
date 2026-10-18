import type { FallenEffect, RulerView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The ruler and the fallen on the General tab (realm REALM-240, REALM-241):
 * who rules, how old and how long, his two traits with what each does, the
 * heir or who would follow, a regent while a child rules; and the soldiers
 * lost in the last ten years with what they do to the realm. Plain lines of
 * the side panel: nothing needs hover.
 */

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Who follows a ruler with no heir, by the realm's law. */
function noHeir(v: RulerView): string {
  if (v.law === "election by lords") return "The lords will choose the next ruler";
  if (v.law === "strongest claimant") return "The strongest claimant will take the throne";
  return "No heir: a kinsman would follow, and the lords would dispute it";
}

export function rulerLines(v: RulerView): string {
  const heir = v.heir ? `${esc(v.heir.name)}, ${v.heir.age} <small>${v.heir.relation === "sibling" ? "of the house" : v.heir.daughter ? "daughter" : "son"}</small>` : `<small>${noHeir(v)}</small>`;
  return `<dt>Ruler</dt><dd class="ruler">${icon("crown", 1)}<b>${esc(v.label)}</b>, ${v.age} <small>${v.years} year${v.years === 1 ? "" : "s"} on the throne</small></dd>
    ${v.regent ? `<dt>Regent</dt><dd>${esc(v.regent)} <small>rules until the ruler is 16</small></dd>` : ""}
    <dt>Traits</dt><dd class="traits">${v.traits.map((t) => `<span><b>${esc(t.name)}</b> <small>${esc(t.note)}</small></span>`).join("")}</dd>
    <dt>Heir</dt><dd class="ruler">${heir}</dd>`;
}

export function fallenLine(f: FallenEffect): string {
  if (f.fallen < 1) return `<dt>Fallen <small>(10 yrs)</small></dt><dd>None</dd>`;
  const slow = Math.round((1 - f.refill) * 100);
  const peace = Math.round(f.peace * 100);
  const effects = [slow ? `recruits refill ${slow} % slower` : "", peace ? `peace voices +${peace} %` : ""].filter(Boolean).join(" · ");
  return `<dt>Fallen <small>(10 yrs)</small></dt><dd>${fmt(f.fallen)}${effects ? ` <small class="line">${effects}</small>` : ""}</dd>`;
}
