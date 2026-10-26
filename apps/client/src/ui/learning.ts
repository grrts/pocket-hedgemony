import type { Snapshot } from "@ph/engine";
import type { Ruleset } from "@ph/rules";
import { eraIndex, eraName, isPast, newProgramme, outOfScope, pathTo, standing, startingProgramme, tree, TREE_ERAS, type Invention, type Programme, type TreeEra } from "@ph/engine/domain/research";
import { icon } from "../art/ui.ts";

/**
 * Research on screen (research RSCH-084 to RSCH-090, RSCH-100 to RSCH-111, RSCH-116 to RSCH-118).
 * Research is its own screen over the map, opened from the top bar's research
 * plaque, the General tab's line or an alert. It has three parts: Next (what
 * is studied, the queue and the inventions that can be started, best first),
 * Tree (the one invention tree drawn as one picture, the four branches as
 * bands and the eras as column groups, with the picked invention's sheet
 * beside it or sliding up from the bottom; two zoom levels, Close up and
 * Whole tree) and Schools.
 */

type Research = NonNullable<Snapshot["research"]>;
type Option = Research["options"][number];

/** What the player left open in the Research tab, kept across redraws. */
export interface LearningUi {
  part: "next" | "tree" | "schools";
  /** Close up (named nodes) or Whole tree (the whole tree fits the frame, RSCH-101). */
  zoom: "close" | "whole";
  /** The invention tapped, or null for the current study. */
  pick: string | null;
  /** Folds the player opened. */
  open: Set<string>;
  /** Where the Close up tree was scrolled to. */
  scroll: { left: number; top: number } | null;
  /** After the next draw, bring this invention, or this place of the whole tree (fractions), into the middle of the frame. */
  center: string | { fx: number; fy: number } | null;
  /** The sheet was just opened: in Tall it slides up once. */
  slide: boolean;
}

export const newLearningUi = (): LearningUi => ({ part: "next", zoom: "close", pick: null, open: new Set(), scroll: null, center: null, slide: false });

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

/** Months for so many scholar-years at a pace, null when research does not move. */
const monthsFor = (sy: number, pace: number): number | null => (pace > 0 ? Math.max(1, Math.ceil((sy / pace) * 12)) : null);

const pct = (r: Research) => (r.study ? Math.min(100, (r.study.progress / r.study.cost) * 100) : 0);

/** The standing in a few words for the Research screen's header: "Abreast of the times", "Behind by 2 eras" (RSCH-103). */
export function standingShort(behind: number): string {
  return behind ? `Behind by ${behind} era${behind === 1 ? "" : "s"}` : "Abreast of the times";
}

/** What is studied and how far it has come, for the Realm overview's tile (SHELL-170). */
export function studyNow(r: Research): { name: string; pct: number } | null {
  return r.study ? { name: nice(r.study.name), pct: pct(r) } : null;
}

/** "Era I · abreast of the times", "Ancient · behind the times by 2 eras" (RSCH-103, RSCH-104). */
function standingText(era: string, behind: number): string {
  return `${esc(eraName(era as TreeEra))} · ${behind ? `behind the times by ${behind} era${behind === 1 ? "" : "s"}` : "abreast of the times"}`;
}

/** Another realm's research on its country card: its standing, what it knows that the player doesn't, and its study (RSCH-088, RSCH-104). */
export function realmLearningLine(x: Snapshot["realmResearch"][number] | undefined): string {
  if (!x) return "";
  // "N ahead of you · N behind you" (GOV-078); what it knows ahead it makes cheaper for you as a neighbour (RSCH-104).
  const ahead = x.ahead ? `${fmt(x.ahead)} ahead of you, cheaper for you as its neighbour` : "none ahead of you";
  const behind = x.behindYou ? ` · ${fmt(x.behindYou)} behind you` : "";
  return `<dt>Research</dt><dd>${standingText(x.standing, x.behind)}<br><small>${fmt(x.known)} inventions known · ${ahead}${behind}${x.study ? ` · studying ${esc(nice(x.study))} (${x.pct} %)` : ""}</small></dd>`;
}

/** A realm's standing at the 1444 start, for the nation picker: "Starts in Ancient", "Starts in Era I" (RSCH-105). */
export function startStanding(nation: string): string {
  return `Starts in ${eraName(standing(startingProgramme(nation).known))}`;
}

// ---------------------------------------------------------------- the tree's layout

/**
 * The one tree as one picture (RSCH-100), read left to right: the root, the
 * four branches, then each era's columns in turn, the same for every band.
 * An era gets as many columns as its longest chain within the era needs in
 * any branch; an invention sits one column right of its parent, on its
 * parent's row or the first free row below, inside its own branch's band.
 */
export interface TreeLayout {
  /** Column (0 the root, 1 the branches) and row of everything drawn. */
  at: Map<string, { col: number; row: number }>;
  rows: number;
  cols: number;
  /** The columns each era takes. */
  eras: { era: TreeEra; col: number; width: number }[];
  /** Each branch's band: its first row and how many rows it takes. */
  bands: { id: string; name: string; row: number; rows: number }[];
  /** Lines from a parent to its child, and from an alternative parent or an "also needs" (drawn only for the picked invention). */
  edges: { from: string; to: string; also: boolean }[];
}

let layout: TreeLayout | undefined;

/** The tree laid out once; inventions never studied (Era VIII, L23, L24) are left out (RSCH-045). */
export function treeLayout(): TreeLayout {
  if (layout) return layout;
  const t = tree();
  const inPlay = [...t.inventions.values()].filter((i) => !outOfScope(i));
  const order = (a: Invention, b: Invention) => eraIndex(a.era) - eraIndex(b.era) || a.id.localeCompare(b.id, "en", { numeric: true });
  // How far down a chain of the same era an invention sits: 0 when its parent is of an earlier era.
  const depth = new Map<string, number>();
  const depthOf = (i: Invention): number => {
    if (depth.has(i.id)) return depth.get(i.id)!;
    const p = t.inventions.get(i.parent);
    const d = p && p.era === i.era ? depthOf(p) + 1 : 0;
    depth.set(i.id, d);
    return d;
  };
  const width = new Map<TreeEra, number>();
  for (const i of inPlay) width.set(i.era, Math.max(width.get(i.era) ?? 0, depthOf(i) + 1));
  const eras: TreeLayout["eras"] = [];
  let cols = 2;
  for (const era of TREE_ERAS.filter((e) => width.has(e))) {
    eras.push({ era, col: cols, width: width.get(era)! });
    cols += width.get(era)!;
  }
  const firstCol = new Map(eras.map((e) => [e.era, e.col]));
  const children = new Map<string, Invention[]>();
  for (const i of inPlay) children.set(i.parent, [...(children.get(i.parent) ?? []), i]);
  const at = new Map<string, { col: number; row: number }>();
  const bands: TreeLayout["bands"] = [];
  let top = 0;
  for (const b of t.boughs) {
    // Rows taken in each column of this band, counted from the band's top.
    const next: number[] = [];
    const walk = (id: string, row: number) => {
      for (const c of (children.get(id) ?? []).sort(order)) {
        const col = firstCol.get(c.era)! + depthOf(c);
        const r = Math.max(row, next[col] ?? 0);
        next[col] = r + 1;
        at.set(c.id, { col, row: top + r });
        walk(c.id, r);
      }
    };
    walk(b.id, 0);
    at.set(b.id, { col: 1, row: top });
    const rows = Math.max(1, ...next.filter((x) => x !== undefined));
    bands.push({ id: b.id, name: b.name, row: top, rows });
    top += rows;
  }
  at.set(t.root.id, { col: 0, row: Math.floor((top - 1) / 2) });
  const edges: TreeLayout["edges"] = t.boughs.map((b) => ({ from: t.root.id, to: b.id, also: false }));
  for (const id of at.keys()) {
    const inv = t.inventions.get(id);
    if (!inv) continue;
    edges.push({ from: inv.parent, to: id, also: false });
    for (const need of [...inv.or_parents, ...inv.also_needs]) if (at.has(need)) edges.push({ from: need, to: id, also: true });
  }
  layout = { at, rows: top, cols, eras, bands, edges };
  return layout;
}

// Sizes of the Close up tree in CSS pixels: nodes are 44 tall to be tapped. The pinned
// branch column (--lw) is added in CSS: wide with the names, a strip of letters in Tall.
const NODE_W = 152;
const NODE_H = 44;
const COL_W = NODE_W + 24;
const ROW_H = NODE_H + 8;
const HEAD_H = 30;
const PAD = 8;
const nodeX = (col: number) => PAD + col * COL_W;
const nodeY = (row: number) => HEAD_H + PAD + row * ROW_H;
const at = (px: number) => `calc(var(--lw) + ${px}px)`;

type State = "known" | "studying" | "queued" | "open" | "locked";

/** Where each invention stands for the player: known, being studied, queued, open to study, or locked behind its needs. */
function states(r: Research): Map<string, State> {
  const out = new Map<string, State>();
  for (const k of r.known) out.set(k.id, "known");
  for (const o of r.options) out.set(o.id, "open");
  for (const q of r.queue) out.set(q.id, "queued");
  if (r.study) out.set(r.study.id, "studying");
  return out;
}

const stateOf = (st: Map<string, State>, id: string): State => (!tree().inventions.has(id) ? "known" : st.get(id) ?? "locked");

const nameOf = (id: string): string => {
  const t = tree();
  return nice(t.inventions.get(id)?.name ?? t.boughs.find((b) => b.id === id)?.name ?? t.root.name);
};

/** The realm's programme rebuilt from the snapshot, for working out paths in the tree (RSCH-109). */
function programmeOf(r: Research): Programme {
  const p = newProgramme("player");
  for (const k of r.known) p.known.add(k.id);
  p.studies = r.study ? [{ id: r.study.id, progress: r.study.progress }] : [];
  p.queue = r.queue.map((q) => q.id);
  p.contacts = new Set(r.contacts);
  if (r.group) p.group = r.group;
  return p;
}

/** The steps still missing to an invention, in an order that can be studied, ending with it; null when a step waits on a contact. */
export function missingPath(r: Research, id: string): string[] | null {
  const got = pathTo(programmeOf(r), id);
  return got.ok ? got.path : null;
}

/** The invention the sheet and the tree are about: the one tapped, else the current study. */
const focusOf = (r: Research, ui: LearningUi) => ui.pick ?? r.study?.id ?? null;

/** What the picked invention's path lights up in the tree: the steps still missing and the invention itself (RSCH-110). */
function lit(r: Research, st: Map<string, State>, focus: string | null): Set<string> {
  if (!focus || !tree().inventions.has(focus)) return new Set();
  const s = stateOf(st, focus);
  if (s === "known" || s === "studying" || s === "queued") return new Set([focus]);
  return new Set([...(missingPath(r, focus) ?? []), focus]);
}

/** Era headings along the top, pinned while the tree scrolls; the era of today is marked Now (RSCH-100). */
function eraHeads(lay: TreeLayout, r: Research, w: number, h: number): string {
  const span = (col: number, width: number) => `left:${at(nodeX(col) - 12)};width:${width * COL_W}px`;
  const shade = lay.eras.map((e, k) => (k % 2 ? `<i class="era-shade" style="${span(e.col, e.width)};height:${h}px"></i>` : "")).join("");
  const heads = lay.eras
    .map((e) => {
      const now = e.era === r.era;
      const year = e.era === "A" ? "" : ` · ${r.eraStarts[e.era] ?? ""}`;
      return `<b style="${span(e.col, e.width)}"${now ? ' class="now"' : ""}><span>${esc(eraName(e.era))}${year}${now ? " · Now" : ""}</span></b>`;
    })
    .join("");
  return `${shade}<div class="tree-eras" style="width:${at(w)}"><span class="corner">Branch</span>${heads}</div>`;
}

/** The branch names pinned at the left edge: in Tall a coloured strip with the first letter (RSCH-106). */
function bandColumn(lay: TreeLayout, h: number): string {
  const labels = lay.bands
    .map((b, k) => `<div class="band-name b${k + 1}" style="top:${nodeY(b.row) - 4 - HEAD_H}px;height:${b.rows * ROW_H}px"><span><b class="full">${esc(b.name)}</b><b class="letter" aria-hidden="true">${esc(b.name.charAt(0))}</b></span></div>`)
    .join("");
  const tint = lay.bands.map((b, k) => `<i class="band-tint b${k + 1}" style="top:${nodeY(b.row) - 4}px;height:${b.rows * ROW_H}px"></i>`).join("");
  return `<div class="tree-bands" style="height:${h - HEAD_H}px">${labels}</div>${tint}`;
}

/** The lines: every parent line, and the "also needs" lines only for the picked invention and its path, highlighted (RSCH-100, RSCH-110). */
function lines(lay: TreeLayout, st: Map<string, State>, focus: string | null, path: Set<string>, w: number, h: number): string {
  const out: string[] = [];
  for (const e of lay.edges) {
    const onPath = path.has(e.to) && (path.has(e.from) || stateOf(st, e.from) !== "locked");
    if (e.also && e.to !== focus && !onPath) continue;
    const a = lay.at.get(e.from)!;
    const b = lay.at.get(e.to)!;
    const x1 = nodeX(a.col) + NODE_W;
    const y1 = nodeY(a.row) + NODE_H / 2;
    const x2 = nodeX(b.col);
    const y2 = nodeY(b.row) + NODE_H / 2;
    const xm = x2 - 12;
    const cls = [e.also ? "also" : "grow", stateOf(st, e.from) === "known" ? "lit" : "", onPath || e.to === focus ? "path" : ""].filter(Boolean).join(" ");
    out.push(`<path d="M${x1} ${y1}H${xm}V${y2}H${x2}" class="${cls}"/>`);
  }
  // The highlighted lines go on top.
  out.sort((x, y) => Number(x.includes("path")) - Number(y.includes("path")));
  return `<svg class="tree-lines" style="left:var(--lw)" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${out.join("")}</svg>`;
}

const STATE_LABEL: Record<State, string> = { known: "known", studying: "being studied", queued: "queued", open: "can be studied", locked: "locked" };

function nodes(lay: TreeLayout, r: Research, st: Map<string, State>, focus: string | null, path: Set<string>): string {
  const place = new Map(r.queue.map((q, k) => [q.id, k + 1]));
  const out: string[] = [];
  for (const [id, { col, row }] of lay.at) {
    const s = stateOf(st, id);
    const n = place.get(id);
    const mark = s === "known" ? "✓" : s === "studying" ? `${Math.floor(pct(r))}%` : s === "open" ? "◆" : "";
    const cls = ["tnode", s, id === focus ? "focus" : "", path.has(id) && id !== focus ? "path" : "", col === 1 ? "bough" : "", col === 0 ? "root" : ""].filter(Boolean).join(" ");
    out.push(
      `<button class="${cls}" style="left:${at(nodeX(col))};top:${nodeY(row)}px" data-inv="${id}" aria-label="${esc(nameOf(id))}, ${n ? `queued ${n}` : STATE_LABEL[s]}"><span>${esc(nameOf(id))}</span>${n ? `<i class="qn">${n}</i>` : mark ? `<i>${mark}</i>` : ""}</button>`,
    );
  }
  return out.join("");
}

/** Close up: named 44 px nodes in a frame that drags both ways (RSCH-101). */
function closeUp(lay: TreeLayout, r: Research, st: Map<string, State>, focus: string | null, path: Set<string>): string {
  const w = nodeX(lay.cols) + PAD;
  const h = nodeY(lay.rows) + PAD;
  return `<div class="tree-view near" data-tree tabindex="0" aria-label="The invention tree, close up: drag to move, pinch for the whole tree">
      <div class="tree-canvas" style="width:${at(w)};height:${h}px">
        ${eraHeads(lay, r, w, h)}
        ${bandColumn(lay, h)}
        ${lines(lay, st, focus, path, w, h)}
        ${nodes(lay, r, st, focus, path)}
      </div>
    </div>`;
}

/** Whole tree: the full tree fits the frame, each invention a dot in its state's colour; tapping a place opens Close up there (RSCH-101). */
function wholeTree(lay: TreeLayout, r: Research, st: Map<string, State>, focus: string | null, path: Set<string>): string {
  const x = (col: number) => ((col + 0.5) / lay.cols) * 100;
  const y = (row: number) => ((row + 0.5) / lay.rows) * 100;
  const segs = lay.edges
    .filter((e) => !e.also || path.has(e.to))
    .map((e) => {
      const a = lay.at.get(e.from)!;
      const b = lay.at.get(e.to)!;
      return `<path d="M${a.col + 0.5} ${a.row + 0.5}H${b.col}V${b.row + 0.5}H${b.col + 0.5}"${path.has(e.to) ? ' class="path"' : ""}/>`;
    })
    .join("");
  const dots = [...lay.at]
    .map(([id, p]) => `<i class="dot ${stateOf(st, id)}${path.has(id) ? " path" : ""}${id === focus ? " focus" : ""}" style="left:${x(p.col).toFixed(2)}%;top:${y(p.row).toFixed(2)}%"></i>`)
    .join("");
  const eras = lay.eras.map((e) => `<b style="left:${((e.col / lay.cols) * 100).toFixed(2)}%;width:${((e.width / lay.cols) * 100).toFixed(2)}%"${e.era === r.era ? ' class="now"' : ""}>${esc(e.era === "A" ? "Anc" : e.era === "M" ? "Med" : e.era)}${e.era === r.era ? " · Now" : ""}</b>`).join("");
  const bands = lay.bands
    .map((b, k) => `<div class="band-name b${k + 1}" style="top:${((b.row / lay.rows) * 100).toFixed(2)}%;height:${((b.rows / lay.rows) * 100).toFixed(2)}%"><span><b class="full">${esc(b.name)}</b><b class="letter" aria-hidden="true">${esc(b.name.charAt(0))}</b></span></div>`)
    .join("");
  const tints = lay.bands.map((b, k) => `<i class="band-tint b${k + 1}" style="top:${((b.row / lay.rows) * 100).toFixed(2)}%;height:${((b.rows / lay.rows) * 100).toFixed(2)}%"></i>`).join("");
  return `<div class="tree-view whole" data-tree aria-label="The whole invention tree: tap a place to see it close up">
      <div class="whole-eras">${eras}</div>
      <div class="whole-bands">${bands}</div>
      <div class="whole-plot" data-whole role="button" tabindex="0" aria-label="Tap a place to see it close up">
        ${tints}
        <svg viewBox="0 0 ${lay.cols} ${lay.rows}" preserveAspectRatio="none" aria-hidden="true">${segs}</svg>
        ${dots}
      </div>
    </div>`;
}

// ---------------------------------------------------------------- the sheet

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The single action that fits an invention not known: Study now, Add to queue or Queue the path (RSCH-109), and the explicit Switch to this study (RSCH-086). */
function action(r: Research, st: Map<string, State>, id: string): string {
  const s = stateOf(st, id);
  const opt: Option | undefined = r.options.find((o) => o.id === id);
  const cost = opt?.cost ?? r.costs[id] ?? 0;
  const months = opt?.months ?? monthsFor(cost, r.pace);
  const room = r.queueLength - r.queue.length;
  const note = [`${years(cost)} scholar-years`, paceText(months), opt?.partners ? `${opt.partners} neighbour${opt.partners === 1 ? " knows" : "s know"} it: cheaper` : "", opt?.ahead ? "ahead of its time: costs double for each era ahead" : ""].filter(Boolean).join(" · ");
  if (s === "studying" && r.study) {
    return `<div class="study-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(pct(r))}"><i style="width:${pct(r).toFixed(1)}%"></i></div><p class="state">Being studied · ${years(r.study.progress)} of ${years(r.study.cost)} scholar-years · ${paceText(r.study.months)} left</p>`;
  }
  if (s === "queued") {
    const k = r.queue.findIndex((q) => q.id === id);
    const q = r.queue[k]!;
    return `<p class="state">In the queue, place ${k + 1} of ${r.queue.length} · ${years(q.cost)} scholar-years · ${paceText(q.months)}${q.waiting ? " · waits for its needs" : ""}</p>${queueButtons(r, id, k, true)}`;
  }
  if (s === "open" && !r.study) {
    return `<p class="state">${note}</p><button class="wax wide-btn" data-study="${id}">${icon("scroll", 1)}Study now</button>`;
  }
  const path = missingPath(r, id);
  if (!path) return `<p class="state locked">🔒 Opens after contact with lands that know it.</p>`;
  // Replacing the current study stays its own, explicit button (RSCH-086, RSCH-109).
  const switching = s === "open" && r.study ? `<div class="switch">${r.study.progress > 0 ? `<p class="warn">Switching drops the ${years(r.study.progress)} scholar-years spent on ${esc(nice(r.study.name))}.</p>` : ""}<button class="paper wide-btn" data-study="${id}">Switch to this study</button></div>` : "";
  if (path.length <= 1) {
    const add = room > 0 ? `<button class="wax wide-btn" data-queue-study="${id}">${icon("scroll", 1)}Add to queue</button>` : `<p class="warn">The queue is full: it holds ${r.queueLength}. Remove one first.</p>`;
    return `<p class="state">${note}</p>${add}${switching}`;
  }
  // Queue the path: every missing step, in order, with the total before the tap.
  const total = path.reduce((t, x) => t + (r.costs[x] ?? 0), 0);
  const steps = path.map((x, k) => `<li><button class="paper need${k === path.length - 1 ? " last" : ""}" data-inv="${x}">${esc(nameOf(x))}<small>${years(r.costs[x] ?? 0)}</small></button></li>`).join("");
  const after = r.study || r.queue.length ? " after what is studied and queued now" : "";
  const fits = path.length <= room;
  return `<p class="state locked">🔒 Needs ${path.length - 1} step${path.length === 2 ? "" : "s"} first.</p>
    <ol class="path-steps">${steps}</ol>
    <p class="state">${path.length} studies · ${years(total)} scholar-years · ${paceText(monthsFor(total, r.pace))}${after}</p>
    ${fits ? `<button class="wax wide-btn" data-queue-path="${id}">${icon("scroll", 1)}Queue the path · ${path.length} studies</button>` : `<p class="warn">The path is ${path.length} studies; the queue holds ${r.queueLength} and has room for ${room}. Queue part of it, or remove some first.</p>`}`;
}

/** ◀ ▶ to move a queued invention, ✕ to take it out (RSCH-110). */
function queueButtons(r: Research, id: string, k: number, words = false): string {
  return `<span class="q-moves" role="group" aria-label="Move ${esc(nameOf(id))} in the queue">
      <button class="paper" data-move="${id}" data-by="-1" ${k === 0 ? "disabled" : ""} aria-label="One place earlier">◀</button>
      <button class="paper" data-move="${id}" data-by="1" ${k === r.queue.length - 1 ? "disabled" : ""} aria-label="One place later">▶</button>
      <button class="paper" data-unqueue="${id}" aria-label="Remove from the queue">✕${words ? " Remove" : ""}</button>
    </span>`;
}

/** The sheet for the picked invention (or the current study): what it does, what it needs, and its one action. */
function sheet(r: Research, st: Map<string, State>, ui: LearningUi): string {
  const id = focusOf(r, ui);
  const shut = ui.pick ? `<button class="paper sheet-close" data-sheet-close aria-label="Close the sheet">✕</button>` : "";
  const cls = `pick-sheet${ui.pick ? " picked" : ""}${ui.pick && ui.slide ? " slide" : ""}`;
  if (!id) return `<aside class="${cls} hint-sheet">${shut}<p>${icon("scroll", 1)} <b>Nothing is being studied.</b> ${r.options.length ? "Tap an invention marked ◆ to study it, or any other to queue the path to it." : "Nothing can be studied now."}</p></aside>`;
  const t = tree();
  const inv = t.inventions.get(id);
  if (!inv) return `<aside class="${cls}">${shut}<p class="pick-name"><b>${esc(nameOf(id))}</b></p><p class="hint">${id === t.root.id ? "The root of the tree, known by everyone." : "A branch of the tree, known by every realm from the start. Everything in its band grows from it."}</p></aside>`;
  const s = stateOf(st, id);
  const need = (x: string) => {
    const ns = stateOf(st, x);
    return `<button class="paper need ${ns === "known" ? "met" : ns === "studying" || ns === "queued" ? "planned" : "unmet"}" data-inv="${x}">${ns === "known" ? "✓" : ns === "studying" || ns === "queued" ? "…" : "✗"} ${esc(nameOf(x))}</button>`;
  };
  const parents = [inv.parent, ...inv.or_parents];
  const needs = `<div class="needs"><span>Grows from</span>${parents.map(need).join(`<small>or</small>`)}${inv.also_needs.length ? `<span>Also needs</span>${inv.also_needs.map(need).join("")}` : ""}${inv.contact ? `<span>Opens after</span><small class="contact">contact with lands that know it</small>` : ""}</div>`;
  const branch = t.boughs.find((b) => b.id === inv.bough)?.name ?? "";
  const past = isPast(inv) ? `<p class="pick-without">${inv.without ? `<b>Without it:</b> ${esc(inv.without)}.` : "A past invention: it only opens later ones."}</p>` : "";
  return `<aside class="${cls} ${s}">
      ${shut}
      <p class="pick-name"><b>${esc(nameOf(id))}</b> <small>${esc(eraName(inv.era))} · ${esc(branch)}</small></p>
      <p class="pick-does">${esc(cap(inv.unlocks))}</p>
      ${past}
      ${needs}
      ${s === "known" ? `<p class="state known">✓ Known</p>` : action(r, st, id)}
    </aside>`;
}

// ---------------------------------------------------------------- the jumps

/** The inventions that can be studied and are not studied or queued already: the ◆ of the tree. */
const openIds = (r: Research) => r.options.map((o) => o.id).filter((id) => id !== r.study?.id && !r.queue.some((q) => q.id === id));

/** Jump targets in the order the tree reads, left to right then down. */
function byPlace(ids: string[]): string[] {
  const lay = treeLayout();
  return ids.filter((id) => lay.at.has(id)).sort((a, b) => lay.at.get(a)!.col - lay.at.get(b)!.col || lay.at.get(a)!.row - lay.at.get(b)!.row);
}

/** Where a jump chip goes: the study, the next invention that can be studied, or the next past one to catch up (RSCH-102). */
export function jumpTarget(r: Research, kind: string, from: string | null): string | null {
  if (kind === "study") return r.study?.id ?? null;
  const t = tree();
  const open = byPlace(openIds(r));
  const list = kind === "open" ? open : open.filter((id) => isPast(t.inventions.get(id)!)).concat(byPlace(r.pastMissing).filter((id) => !open.includes(id) && id !== r.study?.id));
  if (!list.length) return null;
  return list[(list.indexOf(from ?? "") + 1) % list.length]!;
}

function jumps(r: Research, ui: LearningUi): string {
  const past = r.pastMissing.length;
  const open = openIds(r).length;
  return `<div class="tree-jumps">
      ${r.study ? `<button class="paper jump" data-jump="study">${icon("scroll", 1)}My study</button>` : ""}
      ${open ? `<button class="paper jump open" data-jump="open">Can study ◆ ${open}</button>` : ""}
      ${past ? `<button class="paper jump catch" data-jump="catch">Catch up ${past}</button>` : ""}
      <button class="paper jump zoom" data-zoom>${ui.zoom === "close" ? "Whole tree" : "Close up"}</button>
    </div>`;
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

// ---------------------------------------------------------------- the Next part

/** The inventions to offer in Next, best first: past ones to catch up, then the cheapest (RSCH-116). */
export function nextPicks(r: Research): { option: Option; catchUp: boolean; cheapest: boolean }[] {
  const t = tree();
  const ids = new Set(openIds(r));
  const open = r.options.filter((o) => ids.has(o.id));
  const catchUp = (o: Option) => isPast(t.inventions.get(o.id)!);
  const low = Math.min(...open.filter((o) => !catchUp(o)).map((o) => o.cost));
  return open
    .map((option) => ({ option, catchUp: catchUp(option), cheapest: false }))
    .sort((a, b) => Number(b.catchUp) - Number(a.catchUp) || a.option.cost - b.option.cost || a.option.name.localeCompare(b.option.name))
    .map((x, k, all) => ({ ...x, cheapest: !x.catchUp && x.option.cost === low && all.findIndex((y) => !y.catchUp && y.option.cost === low) === k }));
}

/** What an invention does, in its own one line. */
const doesOf = (id: string) => cap(tree().inventions.get(id)?.unlocks ?? "");

/** "4 years", "7 months": the time an invention takes at the realm's pace. */
const timeText = (months: number | null) => (months === null ? "no progress" : months <= 24 ? `${months} month${months === 1 ? "" : "s"}` : `${Math.round(months / 12)} years`);

/** Next: the study with its bar, the queue in order, and the inventions that can be started, best first (RSCH-116). */
function nextPart(r: Research): string {
  const now = r.study
    ? `<button class="paper next-now" data-learn-pick="${r.study.id}" aria-label="Studying ${esc(nice(r.study.name))}, ${Math.floor(pct(r))} %: show it in the tree">
        <b class="next-name">${esc(nice(r.study.name))}</b>
        <span class="next-does">${esc(doesOf(r.study.id))}</span>
        <span class="study-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(pct(r))}"><i style="width:${pct(r).toFixed(1)}%"></i></span>
        <span class="next-meta"><span>${Math.floor(pct(r))} %</span><span>${timeText(r.study.months)} left</span></span>
      </button>`
    : `<p class="next-now idle"><b>Nothing is being studied.</b> Pick one to start.</p>`;
  const rows = r.queue
    .map(
      (q, k) => `<li class="next-q${q.waiting ? " waiting" : ""}">
        <button class="paper q-name" data-learn-pick="${q.id}"><i class="qn">${k + 1}</i><span>${esc(nice(q.name))}</span><small>${q.waiting ? "waits" : timeText(q.months)}</small></button>
        <button class="paper" data-move="${q.id}" data-by="-1" ${k === 0 ? "disabled" : ""} aria-label="Study ${esc(nice(q.name))} one place earlier">▲</button>
        <button class="paper q-out" data-unqueue="${q.id}" aria-label="Remove ${esc(nice(q.name))} from the queue">✕</button>
      </li>`,
    )
    .join("");
  const room = r.queueLength - r.queue.length;
  const queue = `<p class="next-label">Queue · ${r.queue.length} of ${r.queueLength}</p>
    ${r.queue.length ? `<ol class="next-queue">${rows}</ol>` : `<p class="next-empty">Empty. Tap ＋ on an invention and it follows by itself.</p>`}`;
  const picks = nextPicks(r);
  const cards = picks
    .map(({ option: o, catchUp, cheapest }) => {
      const tags = [catchUp ? `<b class="tag catch">Catch up</b>` : "", cheapest ? `<b class="tag cheap">Cheapest</b>` : "", o.partners ? `<b class="tag known-by">Neighbours know it</b>` : "", o.ahead ? `<b class="tag ahead">Ahead of its time</b>` : ""].join("");
      const act = !r.study
        ? `<button class="wax next-act" data-study="${o.id}" aria-label="Study ${esc(nice(o.name))} now">Study</button>`
        : room > 0
          ? `<button class="paper next-act add" data-queue-study="${o.id}" aria-label="Add ${esc(nice(o.name))} to the queue">＋</button>`
          : `<button class="paper next-act" disabled aria-label="The queue is full">Full</button>`;
      return `<li class="next-card${catchUp || cheapest ? " best" : ""}">
          <button class="paper next-pick" data-learn-pick="${o.id}">
            <b class="next-name">${esc(nice(o.name))}</b>
            <span class="next-does">${esc(doesOf(o.id))}</span>
            <span class="next-tags">${tags}<span>${timeText(o.months)}</span></span>
          </button>
          ${act}
        </li>`;
    })
    .join("");
  return `<div class="next-part">
      <div class="next-left">
        <p class="next-label">Studying now</p>
        ${now}
        ${queue}
      </div>
      <div class="next-right">
        <p class="next-label">You can start · best first</p>
        ${picks.length ? `<ul class="next-cards">${cards}</ul>` : `<p class="next-empty">Nothing can be started now: everything in reach is studied or queued.</p>`}
        <button class="paper next-more" data-learn-part="tree">${icon("scroll", 1)}Further ahead? Plan it in the Tree</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- the screen

/** The line every part starts with: the standing, the era and the pace (RSCH-103, RSCH-116); the parts themselves are the Realm book's pages row. */
function screenHead(r: Research): string {
  const missing = r.pastMissing.length;
  const stand = `${esc(standingShort(r.behind))}${missing ? ` · ${missing} to catch up` : ""}`;
  const standing = missing ? `<button class="paper learn-stand behind" data-jump="catch" title="Show the first past invention in the tree">${stand}</button>` : `<span class="learn-stand">${stand}</span>`;
  return `<p class="learn-standing">${standing}<small>${esc(eraName(r.era as TreeEra))} · ${fmt(r.scholars)} scholars · ${years(r.perYear || r.pace)} scholar-years a year</small></p>`;
}

/** The Research screen: Next, Tree or Schools under one header (RSCH-107, RSCH-116). */
export function learningTab(rules: Ruleset, r: Research, gold: number, ui: LearningUi = newLearningUi()): string {
  const head = `${screenHead(r)}${r.stopped ? `<p class="warn">Research has stopped: the students were called to arms. Fill seats again in Schools.</p>` : ""}`;
  if (ui.part === "schools") return `<div class="learn-screen schools-part">${head}${schoolsPart(rules, r, gold, ui.open)}</div>`;
  if (ui.part === "next") return `<div class="learn-screen next">${head}${nextPart(r)}</div>`;
  const st = states(r);
  const lay = treeLayout();
  const focus = focusOf(r, ui);
  const path = lit(r, st, focus);
  const slide = ui.slide;
  ui.slide = false;
  return `<div class="learn-screen tree-part">
      ${head}
      ${jumps(r, ui)}
      <div class="tree-wrap${ui.pick ? " picked" : ""}">
        <div class="tree-col">
          ${ui.zoom === "close" ? closeUp(lay, r, st, focus, path) : wholeTree(lay, r, st, focus, path)}
          <p class="tree-key"><span class="k known">✓ known</span><span class="k open">◆ can study</span><span class="k studying">studying</span><span class="k queued">1 queued</span><span class="k locked">locked</span><span class="k path">path</span></p>
        </div>
        ${sheet(r, st, { ...ui, slide })}
      </div>
    </div>`;
}

/** Where the Close up canvas has an invention, in px from its top left past the branch column. */
export function nodeAt(id: string): { x: number; y: number; w: number; h: number } | null {
  const p = treeLayout().at.get(id);
  return p ? { x: nodeX(p.col), y: nodeY(p.row), w: NODE_W, h: NODE_H } : null;
}

/** The point of the Close up canvas (past the branch column) at a place of the whole tree, given as fractions of its width and height. */
export function closeUpPoint(fx: number, fy: number): { x: number; y: number } {
  const lay = treeLayout();
  return { x: PAD + fx * lay.cols * COL_W, y: HEAD_H + PAD + fy * lay.rows * ROW_H };
}

/** The first invention to show when the tree opens with nothing to centre: the study, else the first one to study. */
export function firstShown(r: Research): string | null {
  return r.study?.id ?? jumpTarget(r, "open", null);
}
