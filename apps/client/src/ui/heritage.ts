import { effectInPlay, IN_PLAY, LEVEL_RANK, RISK_DIMENSIONS, type HeritageLine, type HeritageView, type RealmAssessment, type RealmStrengths } from "@ph/engine";
import { icon, type IconName } from "../art/ui.ts";

/**
 * A realm's national strengths on its card (national-strengths HER-080..085):
 * one Heritage line on the General tab, and the Heritage tab with what is in
 * play: the birthright (or dormant), each golden age's state and its years toward
 * a mark, the weakness, the player's three ambitions (hidden or hinted, with
 * warmth) and the legacies earned; each row opens on a tap to its full text,
 * its history note and what the game applies. Under them the catalogue's
 * assessments as five-step bars.
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

/** The General tab's one line, the overview at a glance (HER-070, HER-081): birthright, golden ages active, the three hidden ambitions and the weakness, opening the Heritage tab. */
export function heritageLine(s: RealmStrengths, v: HeritageView | null = null): string {
  const h = s.heritage;
  if (!h) return `<dt>Heritage</dt><dd><button class="paper" data-realm-open-tab="heritage">${s.assessments.length ? "Assessment only" : "Not recorded"}</button></dd>`;
  const awake = v ? v.heydays.filter((x) => x.state === "awake").length : 0;
  const bits = [
    v?.ask ? "<b>a choice waits</b>" : "",
    awake ? `${awake} golden age${awake === 1 ? "" : "s"} active` : "",
    !v?.sealed ? "" : v.ambitions ? `${v.ambitions.filter((a) => a.state === "stirred").length} of ${v.sealed} ambitions hinted` : `${v.sealed} ambitions hidden`,
    v?.legacies.length ? `${v.legacies.length} legac${v.legacies.length === 1 ? "y" : "ies"}` : "",
    h.burden && v?.burden?.state !== "shed" ? `weakness: ${esc(h.burden.name)}` : "",
  ].filter(Boolean);
  const dormant = v?.birthrights[0]?.dormant;
  return `<dt>Heritage</dt><dd><button class="paper heritage-line" data-realm-open-tab="heritage" title="Open the Heritage tab">${icon("crown", 1)}<span class="${dormant ? "dormant" : ""}">${esc(h.birthright.name)}</span>${bits.map((b) => `<small>${b}</small>`).join("")}</button></dd>`;
}

/** What the game applies of a line's levers now, in words (HER-085). */
function inPlay(line: HeritageLine): string {
  const live = [...new Set(line.effects.filter((e) => effectInPlay(e as Parameters<typeof effectInPlay>[0])).map((e) => IN_PLAY[e.lever]!))];
  const later = line.effects.length - line.effects.filter((e) => effectInPlay(e as Parameters<typeof effectInPlay>[0])).length;
  if (!line.effects.length) return "";
  return `<p class="in-play">${live.length ? `In the game now: ${esc(live.join(", "))}.` : "Nothing of it is in the game yet."}${live.length && later ? " The rest comes as the game grows." : ""}</p>`;
}

/** The style class of each kind of row, kept from the data's names. */
const KIND_CLASS: Record<string, string> = { "Golden age": "heyday", Weakness: "burden" };

function part(kind: string, line: HeritageLine, note = "", cls = ""): string {
  return `<details class="heritage-part ${KIND_CLASS[kind] ?? kind.toLowerCase()} ${cls}">
    <summary><span class="kind">${kind}</span><b>${esc(line.name)}</b>${note ? `<small>${note}</small>` : ""}</summary>
    <p>${esc(line.text)}</p>
    ${line.why ? `<p class="why-note">${esc(line.why)}</p>` : ""}
    ${cls.includes("off") ? "" : inPlay(line)}
  </details>`;
}

/** Years and months, as heritage counts them. */
function span(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} year${y === 1 ? "" : "s"}` : "", m ? `${m} month${m === 1 ? "" : "s"}` : ""].filter(Boolean).join(" ") || "not yet";
}

/** A golden age's state and its months toward a mark (25 years, HER-012). */
function heydayNote(ageName: string, st: HeritageView["heydays"][number] | undefined): { note: string; cls: string } {
  const toMark = 300;
  const meter = st && st.months > 0 && st.state !== "ended" ? ` <span class="meter" role="img" aria-label="${span(Math.min(st.months, toMark))} of 25 years toward its mark"><i style="width:${Math.min(100, (st.months / toMark) * 100).toFixed(0)}%"></i></span>` : "";
  switch (st?.state) {
    case "awake":
      return { note: `<span class="chip on">active</span> ${esc(ageName)}${meter}`, cls: "" };
    case "asleep":
      return { note: `<span class="chip">inactive</span> ${esc(ageName)}${meter}`, cls: "off" };
    case "ended":
      return { note: `<span class="chip">ended</span> ${st.months >= toMark ? "left its mark" : esc(ageName)}`, cls: "off" };
    default:
      return { note: `waits for the ${esc(ageName)}`, cls: "off" };
  }
}

const THEME: Record<string, [IconName, string]> = {
  land: ["map", "land"],
  sea: ["anchor", "sea"],
  trade: ["coin", "trade"],
  faith: ["hourglass", "faith"],
  crown: ["crown", "crown"],
  learning: ["scroll", "learning"],
  survival: ["castle", "survival"],
  wealth: ["coin", "wealth"],
};

const WARMTH: Record<string, number> = { cold: 1, warm: 2, hot: 3 };

/** The player's ambitions: three of them, hidden or hinted, and those fulfilled or lost (HER-016..024). */
function ambitionsSection(v: HeritageView, gold: number): string {
  const all = v.ambitions ?? [];
  const open = all.filter((a) => a.state === "sealed" || a.state === "stirred");
  const past = all.filter((a) => a.state === "done" || a.state === "lost");
  const counsel = v.counsel!;
  const seal = (a: (typeof all)[number]) => {
    const [ic, theme] = THEME[a.theme] ?? ["scroll", a.theme];
    const warmth = a.state === "stirred" && a.warmth && a.warmth !== "done"
      ? `<span class="warm-box"><span class="warmth ${a.warmth}" role="img" aria-label="${a.warmth}">${[1, 2, 3].map((k) => `<i class="${WARMTH[a.warmth!]! >= k ? "on" : ""}"></i>`).join("")}</span> <small>${a.warmth}</small></span>`
      : "";
    const ask = a.state === "sealed"
      ? counsel.nextYear === null
        ? `<button class="paper counsel" data-heritage-counsel="${esc(a.id)}" title="Pay to reveal this ambition: it shows its warmth and the legacy it promises"${gold < counsel.gold ? " disabled" : ""}>${icon("coin", 1)}Ask court · ${counsel.gold}</button>`
        : `<small class="later">court again in ${counsel.nextYear}</small>`
      : "";
    return `<li class="seal ${a.state}">
      <span class="theme" title="${theme}">${icon(ic, 2, theme)}</span>
      <span class="what"><i>“${esc(a.hint)}”</i>
        ${a.state === "stirred" ? `<small>Hinted · promises <b>${esc(a.legacy ?? "")}</b>${a.deadline ? ` · by ${a.deadline}` : ""}</small>` : `<small>Hidden</small>`}
      </span>
      ${warmth}${ask}
    </li>`;
  };
  return `<h3 class="sub">Ambitions</h3>
    <p class="hint">Hidden goals: only a riddle shows. An ambition is revealed when the world moves toward it, or when you pay the court to reveal it; warmth shows how near you are.</p>
    <ul class="seals">${open.map(seal).join("") || `<li class="hint">No ambitions left to draw.</li>`}</ul>
    ${past.length ? `<details class="heritage-part past"><summary><span class="kind">Past</span><b>${past.length} ambition${past.length === 1 ? "" : "s"} settled</b></summary><ul class="past-list">${past
      .map((a) => `<li>${a.state === "done" ? "Fulfilled" : "Lost"}: ${esc(a.plainGoal ?? "")}</li>`)
      .join("")}</ul></details>` : ""}`;
}

/** A choice heritage waits on, at the top of the tab (HER-013, HER-030). */
function askSection(ask: NonNullable<HeritageView["ask"]>): string {
  return `<div class="heritage-ask" role="group" aria-label="A choice waits">
    <p><b>${ask.kind === "sleep_heyday" ? "A third golden age would begin. Choose which one becomes inactive:" : "A sixth legacy is earned. Choose which one to let go:"}</b></p>
    <div class="choices">${ask.options.map((o) => `<button class="paper" data-heritage-choice="${esc(o.id)}">${esc(o.name)}</button>`).join("")}</div>
  </div>`;
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

/**
 * The Heritage tab: what the realm is good at, when its moment comes, what it
 * secretly wants, what it has achieved, what holds it back, and how the
 * catalogue sees it in 1444. `v` is the heritage in play (null before a
 * campaign); `gold` the player's treasury, for counsel.
 */
export function heritageTab(s: RealmStrengths, v: HeritageView | null = null, gold = 0): string {
  const h = s.heritage;
  const dormant = !!v?.birthrights[0]?.dormant;
  const burdenShed = v?.burden?.state === "shed";
  const parts = h
    ? `${v?.ask ? askSection(v.ask) : ""}
       ${part("Birthright", h.birthright, v ? (dormant ? `<span class="chip">dormant</span> its needs do not hold` : `<span class="chip on">in force</span>`) : "always on", dormant ? "off" : "")}
       ${h.heydays.map((d) => {
         const n = heydayNote(d.ageName, v?.heydays.find((x) => x.id === d.id));
         return part("Golden age", d, v ? n.note : esc(d.ageName), v ? n.cls : "");
       }).join("")}
       ${h.burden ? part("Weakness", h.burden, burdenShed ? `<span class="chip">overcome</span> now ${esc(v!.burden!.turned.name)}` : v ? `<span class="chip">held</span> until overcome` : "until overcome", burdenShed ? "off" : "") : ""}`
    : `<p class="hint">No heritage is recorded for this realm yet.</p>`;
  const ambitions = !v || !h ? "" : v.ambitions ? ambitionsSection(v, gold) : `<h3 class="sub">Ambitions</h3><p class="hint">${v.sealed ? `${v.sealed} ambitions, hidden: their court keeps them secret.` : "No ambitions left."}</p>`;
  const legacies = !v || !h ? "" : `<h3 class="sub">Legacies <small>${v.legacies.length} of 5</small></h3>${
    v.legacies.length
      ? v.legacies.map((l) => part(l.great ? "Great legacy" : "Legacy", l)).join("")
      : `<p class="hint">None yet: fulfil an ambition, keep a golden age active 25 years, or overcome the weakness.</p>`
  }`;
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
    ${ambitions}
    ${legacies}
    <h3 class="sub">In 1444</h3>
    <p class="hint">How the chronicles judge the realm at the start, and what each sets it off with; a question mark where they are unsure, and there the start varies more between campaigns.</p>
    <div class="assessment-groups">${standing}</div>`;
}
