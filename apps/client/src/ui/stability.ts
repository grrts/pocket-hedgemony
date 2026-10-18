import { stabilityPlaque as plaqueModel, stabilitySection as sectionModel, type Stability } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Stability on screen (realm REALM-203 to REALM-205, F-75): a plaque in the
 * top bar shows the realm's step, and the General tab of the player's country
 * card shows its four pillars, each opening the tab that can mend it. What
 * shows and what a tap opens comes from the engine's models (realmScreens.ts).
 */

/** The top bar's plaque: the step in words, tinted by how bad it is; tapping opens the General tab. */
export function stabilityPlaque(s: Stability, me: number): string {
  const m = plaqueModel(s);
  const why = m.heldBackBy.length ? `, held back by ${m.heldBackBy.join(" and ")}` : "";
  return `<button class="plaque stability step-${m.step}" data-realm="${me}" data-realm-open="general" data-stability title="Stability: ${m.words}${why}. Opens the realm's pillars">${icon("crown", 1)}<span>${m.words}</span></button>`;
}

/** The General tab's Stability section: the step, what it means and the four pillars. */
export function stabilitySection(s: Stability): string {
  const m = sectionModel(s);
  return `<h3 class="sub">Stability: ${m.words}</h3>
    <p class="hint">${m.note} Tap a pillar to see what to mend.</p>
    <div class="pillars">${m.pillars.map((p) => `<button class="paper pillar step-${p.step}" data-realm-open-tab="${p.opens}"><b>${p.label}</b><span>${p.line}</span><em>${p.words}</em></button>`).join("")}</div>`;
}
