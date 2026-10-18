import { LEVEL_RANK, RISK_DIMENSIONS, type HeritageLine, type RealmAssessment, type RealmStrengths } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * A realm's national strengths on its card (national-strengths HER-080..083):
 * one Heritage line on the General tab, and the Heritage tab with the
 * birthright, heydays and burden (each opens on a tap to its history note)
 * and the catalogue's assessments as five-step bars.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The assessments in three groups, in plain words. */
const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Strength",
    rows: [
      ["economic_strength", "Economy"],
      ["manpower_potential", "Manpower"],
      ["military_capability", "Army"],
      ["naval_capability", "Navy"],
      ["trade_access", "Trade"],
      ["diplomatic_influence", "Standing abroad"],
    ],
  },
  {
    title: "Government",
    rows: [
      ["administrative_capacity", "Reach of rule"],
      ["fiscal_resilience", "Finances"],
      ["political_stability", "Stability"],
      ["institutional_development", "Institutions"],
      ["territorial_cohesion", "Cohesion"],
      ["long_term_potential", "Prospects"],
    ],
  },
  {
    title: "Dangers",
    rows: [
      ["unrest_risk", "Unrest"],
      ["external_threat_exposure", "Threat from outside"],
    ],
  },
];

/** The starting number each assessment sets, under its bar (REALM-230, REALM-232). */
const SETS: Record<string, string> = {
  economic_strength: "starting gold",
  fiscal_resilience: "starting debt",
  manpower_potential: "levies at the start",
  administrative_capacity: "officials at their posts",
  diplomatic_influence: "envoys at court",
};

const LEVEL_WORD: Record<string, string> = { very_low: "very low", low: "low", moderate: "moderate", high: "high", very_high: "very high", unknown: "unknown" };

/** The General tab's one line: birthright and burden, opening the Heritage tab. */
export function heritageLine(s: RealmStrengths): string {
  const h = s.heritage;
  if (!h) return `<dt>Heritage</dt><dd><button class="paper" data-realm-open-tab="heritage">${s.assessments.length ? "Assessment only" : "Not recorded"}</button></dd>`;
  return `<dt>Heritage</dt><dd><button class="paper heritage-line" data-realm-open-tab="heritage" title="Open the Heritage tab">${icon("crown", 1)}${esc(h.birthright.name)}${h.burden ? `<small>burden: ${esc(h.burden.name)}</small>` : ""}</button></dd>`;
}

function part(kind: string, line: HeritageLine, note = ""): string {
  return `<details class="heritage-part ${kind.toLowerCase()}">
    <summary><span class="kind">${kind}</span><b>${esc(line.name)}</b>${note ? `<small>${esc(note)}</small>` : ""}</summary>
    <p>${esc(line.text)}</p>
    ${line.why ? `<p class="why-note">${esc(line.why)}</p>` : ""}
  </details>`;
}

function bar(a: RealmAssessment, label: string): string {
  const rank = LEVEL_RANK[a.level];
  const risk = RISK_DIMENSIONS.includes(a.dimension);
  const word = LEVEL_WORD[a.level]!;
  const unsure = a.confidence === "low" ? " (uncertain)" : "";
  return `<li class="${risk ? "risk" : ""}" aria-label="${label}: ${word}${unsure}">
    <span class="what">${label}${SETS[a.dimension] ? `<small class="sets">${SETS[a.dimension]}</small>` : ""}</span>
    <span class="steps" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<i class="${rank > i ? "on" : ""}"></i>`).join("")}</span>
    <small>${word}${unsure ? "?" : ""}</small>
  </li>`;
}

/** The Heritage tab: what the realm is good at, when its moment comes, what holds it back, and how the catalogue sees it in 1444. */
export function heritageTab(s: RealmStrengths): string {
  const h = s.heritage;
  const parts = h
    ? `${part("Birthright", h.birthright, "always on")}
       ${h.heydays.map((d) => part("Heyday", d, d.ageName)).join("")}
       ${h.burden ? part("Burden", h.burden, "until shed") : ""}`
    : `<p class="hint">No heritage is recorded for this realm yet.</p>`;
  const byDim = new Map(s.assessments.map((a) => [a.dimension, a]));
  const standing = s.assessments.length
    ? GROUPS.map(
        (g) => `<section><h4 class="sub">${g.title}</h4><ul class="assessments">${g.rows
          .map(([dim, label]) => bar(byDim.get(dim)!, label))
          .join("")}</ul></section>`,
      ).join("")
    : `<p class="hint">The chronicles say little of this realm in 1444.</p>`;
  return `<h3 class="sub">Heritage</h3>
    <div class="heritage">${parts}</div>
    <h3 class="sub">In 1444</h3>
    <p class="hint">How the chronicles judge the realm at the start, and what each sets it off with; a question mark where they are unsure, and there the start varies more between campaigns.</p>
    <div class="assessment-groups">${standing}</div>`;
}
