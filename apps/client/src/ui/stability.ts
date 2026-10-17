import { STABILITY, type Stability, type StabilityPillar } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Stability on screen (realm REALM-203 to REALM-205, F-75): a plaque in the
 * top bar shows the realm's step, and the General tab of the player's country
 * card shows its four pillars, each opening the tab that can mend it.
 */

const NOTE = [
  "Lords, subjects, officials and provinces all hold.",
  "Something is slipping: look at the pillar marked Uneasy.",
  "A pillar is failing: lords or subjects turn away, posts stand empty or provinces rise.",
  "The realm is coming apart: revolt in the lords, subjects or provinces.",
];

/** The top bar's plaque: the step in words, tinted by how bad it is; tapping opens the General tab. */
export function stabilityPlaque(s: Stability, me: number): string {
  const weakest = s.pillars.filter((p) => p.step === s.step && s.step > 0).map((p) => p.key);
  const why = weakest.length ? `, held back by ${weakest.join(" and ")}` : "";
  return `<button class="plaque stability step-${s.step}" data-realm="${me}" data-realm-open="general" data-stability title="Stability: ${STABILITY[s.step]}${why}. Opens the realm's pillars">${icon("crown", 1)}<span>${STABILITY[s.step]}</span></button>`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function loyaltyLine(c: Record<string, number>, none: string): string {
  const parts = (["Loyal", "Wavering", "Disloyal", "In revolt"] as const).filter((l) => c[l]).map((l) => `${c[l]} ${l.toLowerCase()}`);
  return parts.length ? parts.join(", ") : none;
}

/** What each pillar shows, and the tab that opens from it. */
function pillarRow(p: StabilityPillar): string {
  const c = p.counts;
  const [label, line, tab] =
    p.key === "lords" ? ["Lords", loyaltyLine(c, "No lords: all royal land"), "lords"]
    : p.key === "subjects" ? ["Subjects", loyaltyLine(c, "No subjects"), "diplomacy"]
    : p.key === "officials" ? ["Officials", c.empty ? `${plural(c.empty!, "royal post")} of ${c.posts} standing empty` : `All ${plural(c.posts!, "royal post")} filled`, "officials"]
    : ["Provinces", c.rioting || c.plotting ? [c.plotting && `${c.plotting} plotting`, c.rioting && `${c.rioting} rioting`, c.grumbling && `${c.grumbling} grumbling`].filter(Boolean).join(", ") : c.grumbling ? `${c.grumbling} grumbling, the rest calm` : `All ${c.all} calm`, "provinces"];
  return `<button class="paper pillar step-${p.step}" data-realm-open-tab="${tab}"><b>${label}</b><span>${line}</span><em>${STABILITY[p.step]}</em></button>`;
}

/** The General tab's Stability section: the step, what it means and the four pillars. */
export function stabilitySection(s: Stability): string {
  return `<h3 class="sub">Stability: ${STABILITY[s.step]}</h3>
    <p class="hint">${NOTE[s.step]} Tap a pillar to see what to mend.</p>
    <div class="pillars">${s.pillars.map(pillarRow).join("")}</div>`;
}
