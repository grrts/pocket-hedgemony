import type { RegimeView, RevolutionView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Revolutions on screen (REVO-090 to REVO-093): a mark on the top bar's
 * Stability plaque while the realm's card is amber or red, the Revolution
 * block under the pillars on the General tab, the full-screen choice card
 * when it breaks out, and the regime card on the Government tab. Buttons a
 * regime locks elsewhere say so (see `REVOLUTION_LOCKS`).
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The note on everything a regime locks. */
export const LOCKED_NOTE = "Locked by the revolution";

/** The buttons each lock disables wherever they are drawn (REVO-092). */
export const REVOLUTION_LOCKS: Record<string, string> = {
  crushing_taxes: '[data-tax="4"]',
  grant_fief: "[data-grant], [data-grant-open]",
  seize_land: "[data-seize]",
  hire_companies: "[data-hire]",
  massacre: '[data-rebels-ask^="v"], [data-treatment="Massacre"]',
};

/** The tab of the player's card each sign opens, by the view's tab name. */
const TAB_LABEL: Record<string, string> = { provinces: "Provinces", food: "Food", lords: "Lords", treasury: "Treasury" };
const tabOf = (tab: string) => (tab in TAB_LABEL ? tab : "provinces");

const litSigns = (v: RevolutionView) => v.signs.filter((s) => s.lit);
/** "1 in 12" for a monthly chance. */
const oneIn = (chance: number) => `about 1 in ${Math.max(1, Math.round(1 / chance))}`;

/** The plaque's mark and what its label says, while the card is amber or red (REVO-090); null otherwise. */
export function revolutionMark(v: RevolutionView | null | undefined): { badge: string; label: string; colour: "amber" | "red" } | null {
  if (!v || (v.colour !== "amber" && v.colour !== "red")) return null;
  const signs = litSigns(v).map((s) => s.label).join("; ");
  const label = v.colour === "red" ? `Revolution may break out any month: ${signs}` : `Revolution brewing: ${signs}`;
  return { badge: `<span class="revo-mark ${v.colour}" aria-hidden="true">!</span>`, label, colour: v.colour };
}

const STAGE: Record<RevolutionView["stage"], string> = { Quiet: "Quiet", Brewing: "Brewing", Ready: "Ready to break out", Stopped: "Stopped, not solved" };

/** The General tab's Revolution block (REVO-090): one quiet line while nothing is lit. */
export function revolutionSection(v: RevolutionView): string {
  if (v.lit === 0 && !v.regime && !v.stopped) return `<p class="hint revo-quiet">${icon("crown", 1)}No sign of revolution.</p>`;
  const full = Math.min(100, Math.round((v.lit / Math.max(1, v.need)) * 100));
  const signs = v.signs
    .map(
      (s) => `<button class="paper revo-sign${s.lit ? " lit" : ""}" data-realm-open-tab="${tabOf(s.tab)}" title="${esc(s.ease)}: opens the ${TAB_LABEL[tabOf(s.tab)]} tab">
        <i aria-hidden="true">${s.lit ? "●" : "○"}</i><span><b>${esc(s.label)}</b>${s.lit ? `<small>${esc(s.ease)}</small>` : ""}</span><em>${TAB_LABEL[tabOf(s.tab)]}</em>
      </button>`,
    )
    .join("");
  const lines = [
    `<li class="${v.spark.lit ? "lit" : ""}"><b>Spark</b> ${esc(v.spark.label)} · ×${v.spark.mult} the chance${v.spark.lit ? " · <em>lit</em>" : ""}</li>`,
    v.stage === "Ready" && v.chance > 0 ? `<li class="lit"><b>May break out any month</b>, ${oneIn(v.chance)}</li>` : "",
    v.stopped ? `<li><b>Stopped, not solved</b> ${v.stopped.until ? `until ${esc(v.stopped.until)}` : `until fewer than ${v.need} signs are lit`}</li>` : "",
    v.regime ? `<li><b>Regime</b> <button class="paper" data-realm-open-tab="government">${icon("crown", 1)}${esc(v.regime.name)}</button></li>` : "",
  ].join("");
  return `<section class="revolution framed-soft ${v.colour}">
    <h3 class="sub">Revolution: ${esc(STAGE[v.stage])}</h3>
    <p><b>${esc(v.name)}</b> <small>${esc(v.idea)}</small></p>
    <div class="revo-bar"><span class="progress ${v.colour}"><i style="width:${full}%"></i></span><b>${v.lit} of ${v.need} signs</b></div>
    <div class="revo-signs">${signs}</div>
    <ul class="revo-lines">${lines}</ul>
    <details class="revo-fold"><summary>What happens if it breaks out</summary>${stancesList(v)}</details>
  </section>`;
}

function stancesList(v: RevolutionView): string {
  return `<dl class="revo-stances">${v.stances.map((s) => `<dt>${esc(s.label)}</dt><dd><ul>${s.does.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></dd>`).join("")}</dl>`;
}

/** The full-screen choice card while an outbreak waits on the player (REVO-091); it cannot be folded away. */
export function revolutionCardHtml(v: RevolutionView, realm: string): string {
  const signs = litSigns(v);
  return `<div class="revolution-card framed" role="dialog" aria-modal="true" aria-labelledby="revolution-title">
    <header>
      <h2 class="ribbon" id="revolution-title">Revolution in ${esc(realm)}</h2>
      <small>${esc(v.name)} · the week waits for your answer</small>
    </header>
    <div class="revolution-body">
      <div class="revolution-story">
        <p>${esc(v.idea)}</p>
        ${signs.length ? `<h3 class="sub">What lit it</h3><ul class="event-effects">${signs.map((s) => `<li>${esc(s.label)}</li>`).join("")}${v.spark.lit ? `<li>${esc(v.spark.label)}</li>` : ""}</ul>` : ""}
      </div>
      <div class="revolution-stances">
        <h3 class="sub">Your answer</h3>
        ${v.stances
          .map(
            (s) => `<button class="paper stance" data-revolution-stance="${s.stance}">
              <span class="name">${esc(s.label)}</span>
              <span class="does">${s.does.map((d) => `<span>${esc(d)}</span>`).join("")}</span>
            </button>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

/** The Government tab's regime card under the form (REVO-092), or only the ruler line while no regime holds. */
export function regimeCard(v: RevolutionView | null | undefined): string {
  if (!v) return "";
  const r: RegimeView | null = v.regime;
  if (!r) return `<dl class="facts"><dt>Ruler</dt><dd>${esc(v.ruler)}</dd></dl>`;
  return `<section class="regime framed-soft">
    <h3 class="sub">${icon("crown", 1)}${esc(r.name)}</h3>
    ${r.loop ? `<p class="hint">${esc(r.loop)}</p>` : ""}
    <dl class="facts">
      <dt>Since</dt><dd>${esc(r.since)}</dd>
      <dt>Ruler</dt><dd>${esc(r.ruler)}</dd>
      ${r.formBefore ? `<dt>Before</dt><dd>Form before the revolution: ${esc(r.formBefore)}</dd>` : ""}
    </dl>
    ${r.locks.length ? `<ul class="regime-locks">${r.locks.map((l) => `<li aria-disabled="true"><b>${esc(l.label)}</b><small>${LOCKED_NOTE}</small></li>`).join("")}</ul>` : ""}
  </section>`;
}

/** Disables every button the regime locks inside `root`, each saying why (REVO-092). */
export function lockRevolutionButtons(root: HTMLElement, v: RevolutionView | null | undefined): void {
  for (const l of v?.regime?.locks ?? []) {
    const sel = REVOLUTION_LOCKS[l.action];
    if (!sel) continue;
    root.querySelectorAll<HTMLButtonElement>(sel).forEach((b) => {
      if (b.classList.contains("revo-locked")) return;
      b.disabled = true;
      b.classList.add("revo-locked");
      b.title = `${l.label}: ${LOCKED_NOTE.toLowerCase()}`;
      b.insertAdjacentHTML("beforeend", `<small class="locked-note">${LOCKED_NOTE}</small>`);
    });
  }
}
