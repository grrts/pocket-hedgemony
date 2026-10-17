import type { Snapshot } from "@ph/engine";
import type { Ruleset } from "@ph/rules";
import { icon } from "../art/ui.ts";

/**
 * Research on screen (research RSCH-084 to RSCH-090): the Learning tab of the
 * player's country card holds everything about research and schools, and the
 * General tab carries one line with the study and its progress that opens it.
 */

type Research = NonNullable<Snapshot["research"]>;
type Option = Research["options"][number];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const years = (sy: number) => (sy < 10 ? sy.toFixed(1) : fmt(sy));
const ERA_NAMES: Record<string, string> = { I: "I", II: "II", III: "III", IV: "IV", V: "V", VI: "VI", VII: "VII", VIII: "VIII" };

/** "about 7 months", "about 3 years", or "never at this pace". */
export function paceText(months: number | null): string {
  if (months === null) return "no progress at this pace";
  if (months <= 24) return `about ${months} month${months === 1 ? "" : "s"}`;
  return `about ${Math.round(months / 12)} years`;
}

const pct = (r: Research) => (r.study ? Math.min(100, (r.study.progress / r.study.cost) * 100) : 0);

/** The General tab's line: the study, how far along and the scholars, opening the Learning tab (RSCH-088). */
export function learningLine(r: Research): string {
  const what = r.study ? `Studying <b>${esc(r.study.name)}</b> · ${Math.floor(pct(r))} % · scholars ${fmt(r.scholars)}` : `<b>Nothing studied</b> · choose what to study`;
  return `<dt>Learning</dt><dd><button class="paper learning-line${r.study ? "" : " idle"}" data-realm-open-tab="learning" title="Open the Learning tab">${icon("scroll", 1)}<span>${what}</span></button></dd>`;
}

/** Another realm's research on its country card: what it knows and studies (RSCH-088). */
export function realmLearningLine(x: Snapshot["realmResearch"][number] | undefined): string {
  if (!x) return "";
  return `<dt>Learning</dt><dd>${fmt(x.known)} inventions known${x.study ? ` · studying ${esc(x.study)} (${x.pct} %)` : ""}</dd>`;
}

function studyBlock(r: Research): string {
  if (!r.study) {
    return `<div class="study-card idle"><p><b>Nothing is being studied.</b> Your scholars wait. Choose an invention below: the cheapest are at the top of each era.</p></div>`;
  }
  const s = r.study;
  const p = pct(r);
  return `<div class="study-card">
      <p class="study-name"><b>${esc(s.name)}</b> <small>Era ${ERA_NAMES[s.era]}</small></p>
      <p class="study-does">${esc(s.unlocks)}</p>
      <div class="study-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(p)}" aria-label="${esc(s.name)}: ${Math.floor(p)} %"><i style="width:${p.toFixed(1)}%"></i></div>
      <p class="meter-caption">${years(s.progress)} of ${years(s.cost)} scholar-years · <b>${paceText(s.months)}</b> left at this pace</p>
    </div>`;
}

function schoolsBlock(rules: Ruleset, r: Research, gold: number, open: ReadonlySet<string>): string {
  const full = r.seats > 0 && r.seatsWanted >= r.seats;
  const stepper = r.seats > 0 ? `<div class="stepper" role="group" aria-label="Seats to fill">
        <button class="paper" data-seats="${Math.max(0, r.seatsWanted - 5)}" ${r.seatsWanted <= 0 ? "disabled" : ""} aria-label="Five fewer students">−5</button>
        <button class="paper" data-seats="${Math.max(0, r.seatsWanted - 1)}" ${r.seatsWanted <= 0 ? "disabled" : ""} aria-label="One fewer student">−1</button>
        <output><b>${fmt(r.students)}</b> of ${fmt(r.seats)} seats</output>
        <button class="paper" data-seats="${Math.min(r.seats, r.seatsWanted + 1)}" ${full ? "disabled" : ""} aria-label="One more student">+1</button>
        <button class="paper" data-seats="${Math.min(r.seats, r.seatsWanted + 5)}" ${full ? "disabled" : ""} aria-label="Five more students">+5</button>
      </div>` : `<p class="hint">You have no open school yet.</p>`;
  const schools = r.schools.map((x) => `<li><button class="paper" data-show-province="${x.province}">${esc(rules.provinces[x.province]?.name ?? "?")}</button><span>${esc(x.type)} · ${fmt(x.students)} of ${fmt(x.seats)} students${x.open ? "" : " · closed"}</span></li>`);
  const founding = r.founding.map((x) => `<li><button class="paper" data-show-province="${x.province}">${esc(rules.provinces[x.province]?.name ?? "?")}</button><span>${esc(x.type)} · opens in ${x.monthsLeft} month${x.monthsLeft === 1 ? "" : "s"}</span></li>`);
  const f = r.found;
  const afford = gold >= f.gold;
  const found = !f.type
    ? `<p class="hint">Learn <b>Temple and monastery schools</b> or <b>Madrasa networks</b> to found schools.</p>`
    : `<details class="found-school" data-keep="found"${open.has("found") ? " open" : ""}>
        <summary>${icon("castle", 1)}Found a ${esc(f.type)} · ${fmt(f.gold)} gold · ${f.months} months</summary>
        ${!afford ? `<p class="hint">You have ${fmt(gold)} gold: not enough.</p>` : ""}
        ${f.provinces.length ? `<p class="hint">In one of your towns without a school. It opens after ${f.months} months and costs upkeep each year.</p><div class="choices found-in">${f.provinces
          .map((p) => `<button class="paper" data-found-school="${p}" ${afford ? "" : "disabled"}>${esc(rules.provinces[p]!.name)}</button>`)
          .join("")}</div>` : `<p class="hint">Every town of yours has a school or one being built.</p>`}
      </details>`;
  return `<h3 class="sub">Scholars and students</h3>
    <dl class="facts learn-facts">
      <dt>Scholars</dt><dd>${fmt(r.scholars)} <small>each gives 1 scholar-year a year</small></dd>
      <dt>Students</dt><dd>${fmt(r.students)} <small>0.2 a year each; scholars after 5 years</small></dd>
      <dt>Pace</dt><dd>${years(r.perYear)} scholar-years a year</dd>
      <dt>Recruits</dt><dd>${fmt(r.recruits)} <small>men the army can still call</small></dd>
    </dl>
    ${r.stopped ? `<p class="warn">Research has stopped: the students were called to arms. Fill seats again to start it.</p>` : ""}
    <p class="hint">Each student is a man the army can't raise. Set how many seats to fill:</p>
    ${stepper}
    <button class="paper wide" data-call-students ${r.students ? "" : "disabled"}>${icon("swords", 1)}Call students to arms<small>${r.students ? `${fmt(r.students)} men back to the recruits; research stops` : "no students"}</small></button>
    <h3 class="sub">Schools · ${r.schools.length}${r.upkeep ? ` · ${r.upkeep.toFixed(1)} gold a year` : ""}</h3>
    <ul class="school-list">${[...schools, ...founding].join("")}</ul>
    ${found}`;
}

function optionRow(o: Option, current: string | null, switching: boolean): string {
  const on = o.id === current;
  const note = [`${years(o.cost)} scholar-years`, paceText(o.months), o.partners ? `${o.partners} neighbour${o.partners === 1 ? " knows" : "s know"} it` : "", o.ahead ? "ahead of its time: costs double" : ""].filter(Boolean).join(" · ");
  return `<li class="invention${on ? " on" : ""}">
      ${on ? `<span class="inv-state">Studying</span>` : `<button class="wax" data-study="${o.id}" ${switching ? 'title="Switching drops the progress on the current study"' : ""}>${switching ? "Switch" : "Study"}</button>`}
      <span class="inv-text"><b>${esc(o.name)}</b><span class="inv-does">${esc(o.unlocks)}</span><small>${note}</small></span>
    </li>`;
}

/** The Learning tab: the study, scholars, students and seats, schools, then what can be studied by era and what is known (RSCH-084 to RSCH-087). */
export function learningTab(rules: Ruleset, r: Research, gold: number, open: ReadonlySet<string> = new Set()): string {
  const current = r.study?.id ?? null;
  const switching = !!r.study && r.study.progress > 0;
  const byEra = new Map<string, Option[]>();
  for (const o of r.options) byEra.set(o.era, [...(byEra.get(o.era) ?? []), o]);
  // The current study stays in the list, marked, so it reads like the others.
  if (r.study && !r.options.some((o) => o.id === current)) byEra.set(r.study.era, [r.study, ...(byEra.get(r.study.era) ?? [])]);
  const eraTitle = (e: string) => `Era ${ERA_NAMES[e]} · from ${r.eraStarts[e]}${e === r.era ? " · now" : ""}`;
  const knownByEra = new Map<string, Research["known"]>();
  for (const k of r.known) knownByEra.set(k.era, [...(knownByEra.get(k.era) ?? []), k]);
  return `${studyBlock(r)}
    ${schoolsBlock(rules, r, gold, open)}
    <h3 class="sub">What you can study now · ${r.options.length}</h3>
    ${switching ? `<p class="hint">Choosing another study drops the ${years(r.study!.progress)} scholar-years spent on ${esc(r.study!.name)}.</p>` : ""}
    ${[...byEra].map(([era, list]) => `<h4 class="era">${eraTitle(era)}</h4><ul class="inventions">${list.map((o) => optionRow(o, current, switching)).join("")}</ul>`).join("") || `<p class="hint">Nothing can be studied now.</p>`}
    <details class="known-list" data-keep="known"${open.has("known") ? " open" : ""}>
      <summary>What you know · ${r.known.length}${r.harvestSteps ? ` · harvests ${r.harvestSteps} step${r.harvestSteps === 1 ? "" : "s"} better` : ""}</summary>
      ${[...knownByEra].map(([era, list]) => `<h4 class="era">Era ${ERA_NAMES[era]}</h4><ul class="known">${list.map((k) => `<li><b>${esc(k.name)}</b><span>${esc(k.unlocks)}</span></li>`).join("")}</ul>`).join("")}
    </details>`;
}
