import { FAITH_POLICIES, faithLine, peoplesDataOf, TONGUE_POLICIES, tongueLine, type PeoplesSnapshot, type PeoplesView, type TongueRow } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Tongues and faiths in the panels (CULT-080 to CULT-085, RELG-116 to
 * RELG-118): the province overview's Tongue and Faith lines, each tapped open
 * to show this year's drift or pulls and why; the Peoples tab of the player's
 * realm card with Tongue %, Faith %, the Tongue policy, a row per tongue
 * (folded by family) and a row per faith with its policy; and the General
 * tab's two lines that open it.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number) => `${Math.round(x * 100)}%`;
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

/** Which line of the province overview is open, kept between renders. */
export const beliefUi = { open: null as "tongue" | "faith" | null, families: new Set<string>() };

const RELATION_NOTE: Record<string, string> = {
  kin: "same language: your court's own language",
  cousin: "related: a language of the same family",
  stranger: "foreign: a language of another family",
  trading: "a trading people: never foreign",
};
/** How close a language is to the court's, in the words the player reads. */
const RELATION_LABEL: Record<string, string> = { kin: "Same language", cousin: "Related", stranger: "Foreign", trading: "Trading people" };
const dot = (r: string) => `<i class="tongue-dot ${r}" title="${esc(RELATION_NOTE[r] ?? r)}"></i>`;

const POLICY_LABEL: Record<string, string> = { let_be: "Let be", teach: "Teach", impose: "Impose", established: "Established", tolerated: "Tolerated", restricted: "Restricted", persecuted: "Persecuted" };
const POLICY_NOTE: Record<string, string> = {
  let_be: "Drift toward your language at half speed; schools cost no more.",
  teach: "Drift at the base speed; schools teaching your language cost 10% more.",
  impose: "Drift at twice the speed, but Banned language wherever most people speak a foreign language.",
  tolerated: "Its houses stand and its clergy may build; normal tax.",
  restricted: "It pays a quarter more tax and builds no new houses; your faith pulls harder where it lives; Wrong faith where it is the majority.",
  persecuted: "Its houses close and it pays no tax; your faith pulls twice as hard; Persecuted (counts as two) wherever it is a tenth or more.",
};

let cached: { from: PeoplesSnapshot; data: ReturnType<typeof peoplesDataOf> } | null = null;
/** The snapshot's arrays as the culture and religion rules read them (worked out once per snapshot). */
export function beliefData(s: PeoplesSnapshot): ReturnType<typeof peoplesDataOf> {
  if (cached?.from !== s) cached = { from: s, data: peoplesDataOf(s) };
  return cached.data;
}

/** The province overview's Tongue and Faith lines, the open one with its reasons below. */
export function beliefFacts(s: PeoplesSnapshot, p: number): string {
  const d = beliefData(s);
  const t = tongueLine(d, p);
  const f = faithLine(d, p);
  if (!t && !f) return "";
  let out = "";
  if (t) {
    const open = beliefUi.open === "tongue";
    out += `<dt>Language</dt><dd><button class="paper belief-line${open ? " on" : ""}" data-belief="tongue" aria-expanded="${open}" title="Tap for this year's drift">${t.rows.map((r) => `${dot(r.relation)}${esc(r.name)} ${pct(r.share)}`).join(" · ")}</button></dd>`;
    if (open) {
      const groups = t.groups.length
        ? t.groups.map((g) => `<li>${esc(g.name)}: ${(g.rate * 100).toFixed(2)}% a year${g.reasons.length ? ` <small>(${esc(g.reasons.join(", "))})</small>` : ""}</li>`).join("")
        : "<li>Everyone here already speaks it.</li>";
      out += `<dd class="belief-more">Drifting toward <b>${esc(t.pullName)}</b>: ${esc(t.why)}.<ul>${groups}</ul>${t.rows.some((r) => r.homeland) ? `<small>Homeland of the ${esc(t.rows.find((r) => r.homeland)!.name)}.</small>` : ""}</dd>`;
    }
  }
  if (f) {
    const open = beliefUi.open === "faith";
    const arrow = (tr: string) => (tr === "rising" ? " ↑" : tr === "falling" ? " ↓" : "");
    out += `<dt>Faith</dt><dd><button class="paper belief-line${open ? " on" : ""}" data-belief="faith" aria-expanded="${open}" title="Tap for this year's pulls">${f.rows.map((r) => `${esc(f.names[r.faith]!)} ${pct(r.share)}${arrow(r.trend)}`).join(" · ")}</button></dd>`;
    if (open) {
      const rows = f.rows
        .map((r) => {
          const pulls = r.pulls.length ? r.pulls.map((x) => `${esc(cap1(x.source.replace(/ step \d+$/, "")))} +${+x.amount.toFixed(2)}`).join(", ") : "no pull";
          const state = r.community === "state faith" ? "the state faith" : r.community === "below a community" ? "too few for a community" : `${r.community} community`;
          return `<li><b>${esc(f.names[r.faith]!)}</b> · ${esc(POLICY_LABEL[r.policy]!)} · ${esc(state)}${r.grievance ? ` · <em>${esc(r.grievance)}</em>` : ""}<br><small>Pull: ${pulls}</small></li>`;
        })
        .join("");
      const move = f.toward && f.pointsPerYear > 0.005 ? `Moving ${f.pointsPerYear.toFixed(2)} points a year toward ${esc(f.names[f.toward]!)}.` : "The mix holds steady.";
      out += `<dd class="belief-more">${move}<ul>${rows}</ul></dd>`;
    }
  }
  return out;
}

/** The General tab's two lines: court tongue and Tongue %, state faith and Faith %; on the player's card they open the Peoples tab. */
export function beliefLines(v: PeoplesView, mine: boolean, low: { faith: boolean; tongue: boolean; under: number } | null = null): string {
  const tongue = `${esc(v.courtName)} <small>${pct(v.tonguePercent)} of people · ${v.tongues.length} language${v.tongues.length === 1 ? "" : "s"}</small>`;
  const faith = `${esc(v.stateFaithName)} <small>${pct(v.faithPercent)} of people · ${v.faiths.length - 1} more faith${v.faiths.length === 2 ? "" : "s"}</small>`;
  if (!mine) return `<dt>Language</dt><dd>${tongue}</dd><dt>Faith</dt><dd>${faith}</dd>`;
  const grieved = v.tongues.some((t) => t.grieved > 0) || v.faiths.some((f) => f.grieved > 0);
  // Under the bar, the line says what a low share stirs (REALM-238).
  const lowTongue = low?.tongue ? `<em class="warn">Under ${low.under} %: separatists rise more often, officials learn their posts slower</em>` : "";
  const lowFaith = low?.faith ? `<em class="warn">Under ${low.under} %: faith risings come more often, lords of other faiths waver</em>` : "";
  return `<dt>Language</dt><dd><button class="paper${low?.tongue ? " over" : ""}" data-realm-open-tab="peoples" title="Open the Peoples tab">${icon("scroll", 1)}${tongue}</button>${lowTongue}</dd>
    <dt>Faith</dt><dd><button class="paper${grieved || low?.faith ? " over" : ""}" data-realm-open-tab="peoples" title="Open the Peoples tab">${icon("crown", 1)}${faith}</button>${lowFaith}</dd>`;
}

/** Where a tongue or faith lives: "in 34 provinces, most in 5". */
const spread = (provinces: number, majority: number) => `in ${provinces} province${provinces === 1 ? "" : "s"}${majority > 0 ? `, most in ${majority}` : ""}`;

function tongueRow(t: TongueRow, people: number): string {
  const grief = t.grieved ? ` · <em>${t.grieved} aggrieved</em>` : "";
  return `<li>${dot(t.relation)}<b>${esc(t.name)}</b> ${pct(people > 0 ? t.people / people : 0)} <small>${fmt(t.people)} people · ${RELATION_LABEL[t.relation] ?? cap1(t.relation)} · ${spread(t.provinces, t.majority)}${grief}</small></li>`;
}

/** The Peoples tab of the player's realm card: tongues and faiths, and the policies that steer them. */
export function peoplesTab(v: PeoplesView): string {
  const families = new Map<string, TongueRow[]>();
  for (const t of v.tongues) families.set(t.family, [...(families.get(t.family) ?? []), t]);
  const tongues = [...families]
    .map(([fam, rows]) => {
      const people = rows.reduce((a, r) => a + r.people, 0);
      const open = beliefUi.families.has(fam) || rows.some((r) => r.relation === "kin");
      return `<details class="family framed-soft" data-family="${esc(fam)}"${open ? " open" : ""}><summary><b>${esc(cap1(fam))}</b> <small>${pct(v.people > 0 ? people / v.people : 0)} · ${rows.length} language${rows.length === 1 ? "" : "s"}</small></summary><ul>${rows.map((r) => tongueRow(r, v.people)).join("")}</ul></details>`;
    })
    .join("");
  const tonguePolicy = TONGUE_POLICIES.map((pol) => {
    const locked = pol === "impose" && !v.mayImpose;
    return `<button class="paper${v.tonguePolicy === pol ? " on" : ""}" aria-pressed="${v.tonguePolicy === pol}" data-tongue-policy="${pol}"${locked ? ` disabled title="Needs Printing or a chancery tradition"` : ""}>${POLICY_LABEL[pol]}</button>`;
  }).join("");
  const faiths = v.faiths
    .map((f) => {
      const share = v.people > 0 ? f.people / v.people : 0;
      const head = `<p><b>${esc(f.name)}</b> ${pct(share)} <small>${fmt(f.people)} people · ${spread(f.provinces, f.majority)}${f.grieved ? ` · <em>${f.grieved} aggrieved</em>` : ""}</small></p>`;
      if (f.policy === "established") return `<li class="faith-row framed-soft">${head}<p class="hint">Established: the state faith.</p></li>`;
      const shown = f.pending ?? f.policy;
      const buttons = FAITH_POLICIES.map((pol) => `<button class="paper${shown === pol ? " on" : ""}" aria-pressed="${shown === pol}" data-faith="${esc(f.faith)}" data-faith-policy="${pol}">${POLICY_LABEL[pol]}</button>`).join("");
      const pending = f.pending ? `<p class="hint">${POLICY_LABEL[f.policy]} until New Year, then ${POLICY_LABEL[f.pending]}. Tap ${POLICY_LABEL[f.policy]} to keep it.</p>` : "";
      return `<li class="faith-row framed-soft">${head}<div class="choices policy-choices">${buttons}</div>${pending}<p class="hint">${POLICY_NOTE[shown]}</p></li>`;
    })
    .join("");
  return `<h3 class="sub">Languages</h3>
    <dl class="facts">
      <dt>Court</dt><dd>${esc(v.courtName)}</dd>
      <dt>Language %</dt><dd>${pct(v.tonguePercent)} <small>the same language, and half of the related ones</small></dd>
    </dl>
    <p class="hint">${dot("kin")}same language ${dot("cousin")}related ${dot("stranger")}foreign ${dot("trading")}trading people. Each New Year a little of every province drifts toward the language that pulls it: yours where it has been held 20 years and is governed.</p>
    <div class="families">${tongues}</div>
    <h3 class="sub">Language policy</h3>
    <div class="choices policy-choices">${tonguePolicy}</div>
    <p class="hint">${POLICY_NOTE[v.tonguePolicy]}</p>
    <h3 class="sub">Faiths</h3>
    <dl class="facts">
      <dt>State faith</dt><dd>${esc(v.stateFaithName)}</dd>
      <dt>Faith %</dt><dd>${pct(v.faithPercent)}</dd>
    </dl>
    <p class="hint">Each New Year faiths move a little toward what pulls them: houses of worship, your capital, your policies. A change of policy takes effect at New Year.</p>
    <ul class="faith-rows">${faiths}</ul>`;
}
