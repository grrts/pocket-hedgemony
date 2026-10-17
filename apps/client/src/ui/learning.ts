import type { Snapshot } from "@ph/engine";
import type { Ruleset } from "@ph/rules";
import { eraIndex, outOfScope, tree, type Era, type Invention } from "@ph/engine/domain/research";
import { icon } from "../art/ui.ts";

/**
 * Research on screen (research RSCH-084 to RSCH-090). The Learning tab of the
 * player's country card opens on an overview (the study, its progress and the
 * realm's pace) above two parts: the Tree, where the invention tree is drawn
 * bough by bough and only the inventions whose needs are known can be
 * studied, and Schools, which holds the seats, the schools and founding one.
 * The General tab carries one line with the study that opens the tab.
 */

type Research = NonNullable<Snapshot["research"]>;
type Option = Research["options"][number];

/** What the player left open in the Learning tab, kept across redraws. */
export interface LearningUi {
  part: "tree" | "schools";
  /** The bough shown in the tree (R1 to R4), or "" for the bough of the study. */
  bough: string;
  /** The invention tapped in the tree, or null for the current study. */
  pick: string | null;
  /** Folds the player opened. */
  open: Set<string>;
  /** Where each bough's tree was scrolled to. */
  scroll: Map<string, { left: number; top: number }>;
}

export const newLearningUi = (): LearningUi => ({ part: "tree", bough: "", pick: null, open: new Set(), scroll: new Map() });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const years = (sy: number) => (sy < 10 ? sy.toFixed(1) : fmt(sy));
const nice = (name: string) => {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** "about 7 months", "about 3 years", or "never at this pace". */
export function paceText(months: number | null): string {
  if (months === null) return "no progress at this pace";
  if (months <= 24) return `about ${months} month${months === 1 ? "" : "s"}`;
  return `about ${Math.round(months / 12)} years`;
}

const pct = (r: Research) => (r.study ? Math.min(100, (r.study.progress / r.study.cost) * 100) : 0);

/** The General tab's line: the study, how far along and the scholars, opening the Learning tab (RSCH-088). */
export function learningLine(r: Research): string {
  const what = r.study ? `Studying <b>${esc(nice(r.study.name))}</b> · ${Math.floor(pct(r))} % · scholars ${fmt(r.scholars)}` : `<b>Nothing studied</b> · choose what to study`;
  return `<dt>Learning</dt><dd><button class="paper learning-line${r.study ? "" : " idle"}" data-realm-open-tab="learning" title="Open the Learning tab">${icon("scroll", 1)}<span>${what}</span></button></dd>`;
}

/** Another realm's research on its country card: what it knows and studies (RSCH-088). */
export function realmLearningLine(x: Snapshot["realmResearch"][number] | undefined): string {
  if (!x) return "";
  return `<dt>Learning</dt><dd>${fmt(x.known)} inventions known${x.study ? ` · studying ${esc(nice(x.study))} (${x.pct} %)` : ""}</dd>`;
}

// ---------------------------------------------------------------- the tree's layout

/**
 * One bough drawn as a tree, read left to right: the bough, then each era's
 * columns in turn. An invention sits one column right of its parent (an era
 * gets as many columns as its longest chain within the era needs), on its
 * parent's row or the first free row below.
 */
export interface BoughLayout {
  id: string;
  name: string;
  /** Column (0 the bough) and row of each invention in the bough. */
  at: Map<string, { col: number; row: number }>;
  rows: number;
  cols: number;
  /** The columns each era takes in this bough. */
  eras: { era: Era; col: number; width: number }[];
  /** Lines from a parent to its child, and from an "also needs" in the same bough (dashed). */
  edges: { from: string; to: string; also: boolean }[];
}

let layouts: BoughLayout[] | undefined;

/** The four boughs laid out once; inventions never studied (Era VIII, L23, L24) are left out (RSCH-045). */
export function boughLayouts(): BoughLayout[] {
  if (layouts) return layouts;
  const t = tree();
  const inPlay = [...t.inventions.values()].filter((i) => !outOfScope(i));
  const order = (a: Invention, b: Invention) => eraIndex(a.era) - eraIndex(b.era) || a.id.localeCompare(b.id, "en", { numeric: true });
  layouts = t.boughs.map((b) => {
    const mine = inPlay.filter((i) => i.bough === b.id);
    // How far down a chain of the same era an invention sits: 0 when its parent is of an earlier era.
    const depth = new Map<string, number>();
    const depthOf = (i: Invention): number => {
      if (depth.has(i.id)) return depth.get(i.id)!;
      const p = t.inventions.get(i.parent);
      const d = p && p.era === i.era ? depthOf(p) + 1 : 0;
      depth.set(i.id, d);
      return d;
    };
    const width = new Map<Era, number>();
    for (const i of mine) width.set(i.era, Math.max(width.get(i.era) ?? 0, depthOf(i) + 1));
    const eras: BoughLayout["eras"] = [];
    let cols = 1;
    for (const era of [...width.keys()].sort((x, y) => eraIndex(x) - eraIndex(y))) {
      eras.push({ era, col: cols, width: width.get(era)! });
      cols += width.get(era)!;
    }
    const firstCol = new Map(eras.map((e) => [e.era, e.col]));
    const children = new Map<string, Invention[]>();
    for (const i of mine) children.set(i.parent, [...(children.get(i.parent) ?? []), i]);
    const at = new Map<string, { col: number; row: number }>([[b.id, { col: 0, row: 0 }]]);
    const next: number[] = [];
    const walk = (id: string, row: number) => {
      for (const c of (children.get(id) ?? []).sort(order)) {
        const col = firstCol.get(c.era)! + depthOf(c);
        const r = Math.max(row, next[col] ?? 0);
        next[col] = r + 1;
        at.set(c.id, { col, row: r });
        walk(c.id, r);
      }
    };
    walk(b.id, 0);
    const edges: BoughLayout["edges"] = [];
    for (const id of at.keys()) {
      const inv = t.inventions.get(id);
      if (!inv) continue;
      edges.push({ from: inv.parent, to: id, also: false });
      for (const need of [...inv.or_parents, ...inv.also_needs]) if (at.has(need)) edges.push({ from: need, to: id, also: true });
    }
    return { id: b.id, name: b.name, at, rows: Math.max(1, ...next.filter((x) => x !== undefined)), cols, eras, edges };
  });
  return layouts;
}

// Sizes of the drawn tree in CSS pixels: nodes are 44 tall to be tapped.
const NODE_W = 152;
const NODE_H = 44;
const COL_W = NODE_W + 28;
const ROW_H = NODE_H + 10;
const HEAD_H = 30;
const PAD = 8;
const nodeX = (col: number) => PAD + col * COL_W;
const nodeY = (row: number) => HEAD_H + PAD + row * ROW_H;

type State = "known" | "studying" | "open" | "locked";

/** Where each invention stands for the player: known, being studied, open to study, or locked behind its needs. */
function states(r: Research): Map<string, State> {
  const out = new Map<string, State>();
  for (const k of r.known) out.set(k.id, "known");
  for (const o of r.options) out.set(o.id, "open");
  if (r.study) out.set(r.study.id, "studying");
  return out;
}

const stateOf = (st: Map<string, State>, id: string): State => (id.startsWith("R") && !tree().inventions.has(id) ? "known" : st.get(id) ?? "locked");

/** What still stands between the player and an invention: the parent (or its alternatives), the extra needs, a contact. */
function missing(inv: Invention, st: Map<string, State>): { parents: string[]; needs: string[]; contact: boolean } {
  const parentOk = [inv.parent, ...inv.or_parents].some((x) => stateOf(st, x) === "known");
  return {
    parents: parentOk ? [] : [inv.parent, ...inv.or_parents],
    needs: inv.also_needs.filter((x) => stateOf(st, x) !== "known"),
    contact: !!inv.contact && parentOk && inv.also_needs.every((x) => stateOf(st, x) === "known"),
  };
}

const nameOf = (id: string): string => {
  const t = tree();
  return nice(t.inventions.get(id)?.name ?? t.boughs.find((b) => b.id === id)?.name ?? t.root.name);
};

/** The bough the tab shows: the player's choice, else the study's, else the one with the most to study. */
function shownBough(r: Research, ui: LearningUi): string {
  if (ui.bough) return ui.bough;
  const t = tree();
  const id = ui.pick ?? r.study?.id;
  if (id) return t.inventions.get(id)?.bough ?? "R1";
  const open = new Map<string, number>();
  for (const o of r.options) {
    const b = t.inventions.get(o.id)!.bough;
    open.set(b, (open.get(b) ?? 0) + 1);
  }
  return [...open].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "R1";
}

function treeSvg(lay: BoughLayout, st: Map<string, State>, focus: string | null): string {
  const w = nodeX(lay.cols) + PAD;
  const h = nodeY(lay.rows) + PAD;
  const lines = lay.edges
    .map((e) => {
      const a = lay.at.get(e.from)!;
      const b = lay.at.get(e.to)!;
      const x1 = nodeX(a.col) + NODE_W;
      const y1 = nodeY(a.row) + NODE_H / 2;
      const x2 = nodeX(b.col);
      const y2 = nodeY(b.row) + NODE_H / 2;
      const xm = x2 - 12;
      const lit = stateOf(st, e.from) === "known";
      const near = focus !== null && (e.to === focus || e.from === focus);
      return `<path d="M${x1} ${y1}H${xm}V${y2}H${x2}" class="${e.also ? "also" : "grow"}${lit ? " lit" : ""}${near ? " near" : ""}"/>`;
    })
    .join("");
  return `<svg class="tree-lines" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${lines}</svg>`;
}

const STATE_LABEL: Record<State, string> = { known: "known", studying: "being studied", open: "can be studied", locked: "locked" };

function treeNodes(lay: BoughLayout, r: Research, st: Map<string, State>, focus: string | null): string {
  const out: string[] = [];
  for (const [id, { col, row }] of lay.at) {
    const s = stateOf(st, id);
    const mark = s === "known" ? "✓" : s === "studying" ? `${Math.floor(pct(r))}%` : s === "open" ? "◆" : "";
    out.push(
      `<button class="tnode ${s}${id === focus ? " focus" : ""}${col === 0 ? " bough" : ""}" style="left:${nodeX(col)}px;top:${nodeY(row)}px" data-pick="${id}" aria-label="${esc(nameOf(id))}, ${STATE_LABEL[s]}"><span>${esc(nameOf(id))}</span>${mark ? `<i>${mark}</i>` : ""}</button>`,
    );
  }
  return out.join("");
}

function eraHeads(lay: BoughLayout, r: Research): string {
  const w = nodeX(lay.cols) + PAD;
  const span = (col: number, width: number) => `left:${nodeX(col) - 14}px;width:${width * COL_W}px`;
  const bands = lay.eras.map((e, k) => (k % 2 ? `<i class="era-band" style="${span(e.col, e.width)};height:${nodeY(lay.rows) + PAD}px"></i>` : "")).join("");
  const heads = [`<b style="left:${nodeX(0)}px">Bough</b>`, ...lay.eras.map((e) => `<b style="${span(e.col, e.width)};padding-left:14px"${e.era === r.era ? ' class="now"' : ""}>Era ${e.era} · ${r.eraStarts[e.era]}${e.era === r.era ? " · now" : ""}</b>`)].join("");
  return `${bands}<div class="tree-eras" style="width:${w}px">${heads}</div>`;
}

/** The sheet for the tapped invention: what it does, what it needs, and its one action, Study, only when it can be studied (RSCH-033). */
function pickSheet(r: Research, st: Map<string, State>, id: string | null): string {
  if (!id) return `<div class="pick-sheet hint-sheet"><p>${icon("scroll", 1)} <b>Tap an invention</b> to see what it does and what it needs. You can study the ones marked ◆: everything they grow from is known.</p></div>`;
  const t = tree();
  const inv = t.inventions.get(id);
  if (!inv) return `<div class="pick-sheet"><p class="pick-name"><b>${esc(nameOf(id))}</b></p><p class="hint">${id === t.root.id ? "The root of the tree, known by everyone." : "A bough of the tree, known by every realm from the start. Everything to its right grows from it."}</p></div>`;
  const s = stateOf(st, id);
  const opt: Option | undefined = r.options.find((o) => o.id === id) ?? (r.study?.id === id ? r.study : undefined);
  const need = (x: string) => `<button class="paper need ${stateOf(st, x) === "known" ? "met" : "unmet"}" data-pick="${x}">${stateOf(st, x) === "known" ? "✓" : "✗"} ${esc(nameOf(x))}</button>`;
  const parents = [inv.parent, ...inv.or_parents];
  const needs = `<div class="needs"><span>Grows from</span>${parents.map(need).join(`<small>or</small>`)}${inv.also_needs.length ? `<span>Also needs</span>${inv.also_needs.map(need).join("")}` : ""}${inv.contact ? `<span>Opens after</span><small class="contact">contact with lands that know it</small>` : ""}</div>`;
  let action = "";
  if (s === "known") action = `<p class="state known">✓ Known</p>`;
  else if (s === "studying" && r.study) {
    action = `<div class="study-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(pct(r))}"><i style="width:${pct(r).toFixed(1)}%"></i></div><p class="state">Being studied · ${years(r.study.progress)} of ${years(r.study.cost)} scholar-years · ${paceText(r.study.months)} left</p>`;
  } else if (s === "open" && opt) {
    const switching = !!r.study && r.study.progress > 0;
    const note = [`${years(opt.cost)} scholar-years`, paceText(opt.months), opt.partners ? `${opt.partners} neighbour${opt.partners === 1 ? " knows" : "s know"} it: cheaper` : "", opt.ahead ? "ahead of its time: costs double for each era ahead" : ""].filter(Boolean).join(" · ");
    action = `<p class="state">${note}</p>${switching ? `<p class="warn">Switching drops the ${years(r.study!.progress)} scholar-years spent on ${esc(nice(r.study!.name))}.</p>` : ""}<button class="wax wide-btn" data-study="${id}">${icon("scroll", 1)}${switching ? "Switch to this study" : "Study this"}</button>`;
  } else {
    const m = missing(inv, st);
    const what = [...m.parents.length ? [`${m.parents.map((x) => nameOf(x)).join(" or ")}`] : [], ...m.needs.map(nameOf)];
    action = `<p class="state locked">🔒 ${what.length ? `Learn ${esc(what.join(", then "))} first.` : m.contact ? "Opens after contact with lands that know it." : "Can't be studied now."}</p>`;
  }
  return `<div class="pick-sheet ${s}">
      <p class="pick-name"><b>${esc(nameOf(id))}</b> <small>Era ${inv.era}</small></p>
      <p class="pick-does">${esc(inv.unlocks)}</p>
      ${needs}
      ${action}
    </div>`;
}

function treePart(r: Research, ui: LearningUi): string {
  const st = states(r);
  const lays = boughLayouts();
  const shown = shownBough(r, ui);
  const lay = lays.find((l) => l.id === shown) ?? lays[0]!;
  const focus = ui.pick ?? r.study?.id ?? null;
  const counts = (l: BoughLayout) => {
    let known = 0;
    let open = 0;
    for (const id of l.at.keys()) {
      if (!tree().inventions.has(id)) continue;
      const s = stateOf(st, id);
      if (s === "known") known++;
      else if (s === "open" || s === "studying") open++;
    }
    return { known, open, all: l.at.size - 1 };
  };
  const boughTabs = lays
    .map((l) => {
      const c = counts(l);
      return `<button class="tab${l.id === lay.id ? " on" : ""}" data-bough="${l.id}"><b>${esc(l.name)}</b><small>${c.known} of ${c.all} known${c.open ? ` · ${c.open} ◆` : ""}</small></button>`;
    })
    .join("");
  return `<nav class="tabs small boughs" aria-label="Boughs of the tree">${boughTabs}</nav>
    <div class="tree-part"><div class="tree-wrap">
      ${pickSheet(r, st, focus)}
      <div class="tree-view" data-tree="${lay.id}" tabindex="0" aria-label="${esc(lay.name)}: the inventions of this bough">
        <div class="tree-canvas" style="width:${nodeX(lay.cols) + PAD}px;height:${nodeY(lay.rows) + PAD}px">
          ${eraHeads(lay, r)}
          ${treeSvg(lay, st, focus)}
          ${treeNodes(lay, r, st, focus)}
        </div>
      </div>
    </div></div>
    <p class="tree-key"><span class="k known">✓ known</span><span class="k open">◆ can study</span><span class="k studying">studying</span><span class="k locked">locked</span></p>`;
}

// ---------------------------------------------------------------- schools

function schoolsPart(rules: Ruleset, r: Research, gold: number, open: ReadonlySet<string>): string {
  const step = 5;
  const stepper = r.seats > 0
    ? `<div class="stepper" role="group" aria-label="Students to keep">
        <button class="paper" data-seats="${Math.max(0, r.seatsWanted - step)}" ${r.seatsWanted <= 0 ? "disabled" : ""} aria-label="Five fewer students">−${step}</button>
        <output><b>${fmt(r.students)}</b> of ${fmt(r.seats)} seats filled</output>
        <button class="paper" data-seats="${Math.min(r.seats, r.seatsWanted + step)}" ${r.seatsWanted >= r.seats ? "disabled" : ""} aria-label="Five more students">+${step}</button>
      </div>`
    : `<p class="hint">You have no open school yet.</p>`;
  const schools = r.schools.map((x) => `<li><button class="paper" data-show-province="${x.province}">${esc(rules.provinces[x.province]?.name ?? "?")}</button><span>${esc(x.type)} · ${fmt(x.students)} of ${fmt(x.seats)} students${x.open ? "" : " · closed"}</span></li>`);
  const founding = r.founding.map((x) => `<li><button class="paper" data-show-province="${x.province}">${esc(rules.provinces[x.province]?.name ?? "?")}</button><span>${esc(x.type)} · opens in ${x.monthsLeft} month${x.monthsLeft === 1 ? "" : "s"}</span></li>`);
  const f = r.found;
  const afford = gold >= f.gold;
  const found = !f.type
    ? `<p class="hint">Learn <b>Temple and monastery schools</b> or <b>Madrasa networks</b> to found schools.</p>`
    : `<details class="found-school" data-keep="found"${open.has("found") ? " open" : ""}>
        <summary>${icon("castle", 1)}Found a ${esc(f.type)} · ${fmt(f.gold)} gold · ${f.months} months</summary>
        ${!afford ? `<p class="hint">You have ${fmt(gold)} gold: not enough.</p>` : ""}
        ${f.provinces.length ? `<p class="hint">Pick one of your towns without a school. It opens after ${f.months} months and costs upkeep each year.</p><div class="choices found-in">${f.provinces
          .map((p) => `<button class="paper" data-found-school="${p}" ${afford ? "" : "disabled"}>${esc(rules.provinces[p]!.name)}</button>`)
          .join("")}</div>` : `<p class="hint">Every town of yours has a school or one being built.</p>`}
      </details>`;
  return `<h3 class="sub">Students</h3>
    <p class="hint">Students come from your recruits: each is a man the army can't raise. After 5 years they graduate as scholars. ${fmt(r.recruits)} recruits are left.</p>
    ${r.stopped ? `<p class="warn">Research has stopped: the students were called to arms. Fill seats again to start it.</p>` : ""}
    ${stepper}
    ${r.students ? `<details class="found-school arms" data-keep="arms"${open.has("arms") ? " open" : ""}>
        <summary>${icon("swords", 1)}In need of soldiers?</summary>
        <p class="hint">Calling the students to arms sends ${fmt(r.students)} men back to the recruits at once. Research stops, and they never become scholars.</p>
        <button class="paper" data-call-students>${icon("swords", 1)}Call students to arms</button>
      </details>` : ""}
    <h3 class="sub">Schools · ${r.schools.length}${r.upkeep ? ` · ${r.upkeep.toFixed(1)} gold a year` : ""}</h3>
    <ul class="school-list">${[...schools, ...founding].join("")}</ul>
    ${found}`;
}

// ---------------------------------------------------------------- the tab

/** The overview: what is studied and how far, the pace, and how much of the tree is known (RSCH-084). */
function overview(r: Research): string {
  const inPlay = boughLayouts().reduce((n, l) => n + l.at.size - 1, 0);
  const pace = `${fmt(r.scholars)} scholars · ${fmt(r.students)} students · <b>${years(r.perYear)}</b> scholar-years a year`;
  const known = `${r.known.length} of ${inPlay} inventions known · Era ${r.era} now`;
  if (!r.study) {
    return `<div class="study-card idle">
        <p><b>Nothing is being studied.</b> ${r.options.length ? "Choose an invention marked ◆ in the tree below." : "Nothing can be studied now."}</p>
        <p class="meter-caption">${pace} · ${known}</p>
      </div>`;
  }
  const s = r.study;
  const p = pct(r);
  return `<div class="study-card">
      <p class="study-name">${icon("scroll", 1)}Studying <b>${esc(nice(s.name))}</b> <small>Era ${s.era}</small></p>
      <div class="study-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(p)}" aria-label="${esc(nice(s.name))}: ${Math.floor(p)} %"><i style="width:${p.toFixed(1)}%"></i></div>
      <p class="meter-caption">${years(s.progress)} of ${years(s.cost)} scholar-years · <b>${paceText(s.months)}</b> left<br>${pace} · ${known}</p>
      ${r.stopped ? `<p class="warn">Research has stopped: the students were called to arms.</p>` : ""}
    </div>`;
}

/** The Learning tab: the overview, then the Tree or the Schools (RSCH-084 to RSCH-087). */
export function learningTab(rules: Ruleset, r: Research, gold: number, ui: LearningUi = newLearningUi()): string {
  const part = (key: LearningUi["part"], label: string) => `<button class="tab${ui.part === key ? " on" : ""}" data-learn-part="${key}">${label}</button>`;
  return `${overview(r)}
    <nav class="tabs small">${part("tree", `Tree${r.options.length ? ` · ${r.options.length} to study` : ""}`)}${part("schools", `Schools · ${r.schools.length + r.founding.length}`)}</nav>
    ${ui.part === "tree" ? treePart(r, ui) : schoolsPart(rules, r, gold, ui.open)}`;
}

/** Where the tree should scroll to show an invention: its node a little in from the top left. */
export function scrollFor(bough: string, id: string | null): { left: number; top: number } | null {
  const lay = boughLayouts().find((l) => l.id === bough);
  const at = id ? lay?.at.get(id) : undefined;
  if (!at) return null;
  return { left: Math.max(0, nodeX(at.col - 1)), top: at.row <= 3 ? 0 : nodeY(at.row) - HEAD_H - PAD - ROW_H };
}

/** The first invention in a bough the player can study, to scroll to when the bough opens. */
export function firstOpen(r: Research, bough: string): string | null {
  const lay = boughLayouts().find((l) => l.id === bough);
  if (!lay) return null;
  if (r.study && lay.at.has(r.study.id)) return r.study.id;
  let best: { id: string; col: number; row: number } | null = null;
  for (const o of r.options) {
    const at = lay.at.get(o.id);
    if (at && (!best || at.col < best.col || (at.col === best.col && at.row < best.row))) best = { id: o.id, ...at };
  }
  return best?.id ?? null;
}

/** The bough the tab is showing now (for the caller keeping the scroll). */
export function learningBough(r: Research, ui: LearningUi): string {
  return shownBough(r, ui);
}

