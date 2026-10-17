import type { Snapshot } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Works on screen (milestone 4, buildings BLD "How the player uses it"): a
 * province's Works tab shows what stands, what is being built and what can be
 * ordered there; the Works tab of the realm card is the overview of every
 * site and the queue; the General tab's line opens it.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const gold = (g: number) => (g < 10 ? g.toFixed(1) : Math.round(g).toString());
const months = (m: number) => `${m} month${m === 1 ? "" : "s"}`;

/** Name of work k at a step. */
const stepName = (s: Snapshot, k: number, step: number) => s.workSteps[k]![Math.max(0, step - 1)]!.name;

/** A build-sheet row's upkeep a month, when it has one. */
function upkeepNote(row: { upkeep: number }): string {
  return row.upkeep > 0 ? ` · ${row.upkeep.toFixed(2)} a month` : "";
}

function progress(done: number, all: number): string {
  const pct = all > 0 ? Math.round((done / all) * 100) : 100;
  return `<span class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></span>`;
}

/** The province's Build tab: being built, waiting, standing, and the build sheet. */
export function provinceWorks(s: Snapshot, p: number): string {
  const W = s.works.length;
  const sites = s.sites.filter((x) => x.province === p);
  const queue = s.workQueue.filter((x) => x.province === p);
  const standing = s.works.flatMap((_, k) => (s.provinceWorks[p * W + k]! > 0 ? [k] : []));
  const sheet = s.buildSheets[p] ?? [];
  const treasury = s.nationTreasury[s.playerNation]!;
  const siteRows = sites
    .map(
      (x) => `<div class="work-row building">
        <span class="work-name"><b>${esc(cap(stepName(s, x.work, x.step)))}</b><small>${icon("hourglass", 1)} ${months(x.monthsLeft)} left of ${x.months}</small>${progress(x.months - x.monthsLeft, x.months)}</span>
        <button class="paper small" data-cancel-work="${x.work}" title="Give up the site: half its gold comes back">Stop</button>
      </div>`,
    )
    .join("");
  const queueRows = queue
    .map(
      (x, i) => `<div class="work-row waiting">
        <span class="work-name"><b>${i + 1}. ${esc(cap(stepName(s, x.work, x.step)))}</b><small>Queued · ${gold(x.gold)} gold when it starts</small></span>
        <span class="queue-buttons">
          <button class="paper small square" data-move-work="${x.work}" data-by="-1" aria-label="Earlier" ${i === 0 ? "disabled" : ""}>▲</button>
          <button class="paper small square" data-move-work="${x.work}" data-by="1" aria-label="Later" ${i === queue.length - 1 ? "disabled" : ""}>▼</button>
          <button class="paper small" data-cancel-work="${x.work}" title="Take it off the queue; nothing was paid">Drop</button>
        </span>
      </div>`,
    )
    .join("");
  const standingList = standing
    .map((k) => {
      const step = s.provinceWorks[p * W + k]!;
      return `<li><b>${esc(cap(stepName(s, k, step)))}</b><small>${esc(s.workSteps[k]![step - 1]!.effect)}</small></li>`;
    })
    .join("");
  const sheetRows = sheet
    .filter((r) => r.why !== "built to the top")
    .map((r) => {
      const short = r.why === null && r.gold > treasury;
      return `<div class="work-row${r.why ? " off" : ""}">
        <span class="work-name"><b>${esc(cap(r.name))}</b><small>${esc(r.effect)}</small><small class="cost">${icon("coin", 1)} ${gold(r.gold)} · ${icon("hourglass", 1)} ${months(r.months)}${upkeepNote(r)}</small>${r.why ? `<small class="why">${esc(cap(r.why))}</small>` : ""}</span>
        ${r.why ? "" : `<button class="wax small" data-build="${r.work}" title="${short ? "Not enough gold now: it waits in the queue" : "Start building"}">${short ? "Queue" : "Build"}</button>`}
      </div>`;
    })
    .join("");
  const slots = s.buildSlots[p];
  return `
    ${slots ? `<p class="slots">Slots <b>${slots.used} of ${slots.total}</b> taken · ${esc(cap(slots.town))} of ${Math.round(s.provincePeople[p]! * 1000).toLocaleString("en-US")} people. More people bring more slots; a higher step takes none.</p>` : ""}
    ${s.worksNeglected ? `<p class="warn">${icon("coin", 1)} The treasury is empty: your works give only half until their upkeep is paid.</p>` : ""}
    ${siteRows || queueRows ? `<h3 class="sub">Being built</h3><div class="work-sheet">${siteRows}${queueRows}</div>` : ""}
    <h3 class="sub">Build</h3>
    <div class="work-sheet">${sheetRows}</div>
    <h3 class="sub">Standing</h3>
    ${standingList ? `<ul class="works-standing">${standingList}</ul>` : `<p class="hint">Nothing built here yet.</p>`}
    <p class="hint">Every work takes one slot. A province raises one work on its land and one in its town at a time; more wait in its queue and start, oldest first, when a site is free and the gold is there. The gold goes when the site opens.</p>`;
}

/** The General tab's line: sites and queue, opening the realm's Works tab. */
export function worksLine(s: Snapshot): string {
  const building = s.sites.length;
  const waiting = s.workQueue.length;
  const text = building || waiting ? `${building} being built${waiting ? `, ${waiting} waiting` : ""}` : "nothing being built";
  return `<dt>Works</dt><dd><button class="paper" data-realm-open-tab="works" title="Open the works">${icon("castle", 1)}${text}</button></dd>`;
}

/**
 * The realm's Works tab: the upkeep, every province with a site or a queue
 * (its counts and the next work to finish), and what stands across the
 * realm. Each row opens that province's Build tab (BLD-168).
 */
export function realmWorks(s: Snapshot, name: (p: number) => string, thumb: (p: number) => string, held: number[]): string {
  const W = s.works.length;
  const upkeep = -(s.ledger.find((l) => l.line === "works")?.gold ?? 0);
  const row = (p: number, title: string, note: string, extra = "") => `<div class="province-row">
      <button class="place" data-open-build="${p}" title="Open the Build tab of ${esc(name(p))}">
        <img class="thumb" src="${thumb(p)}" alt="" width="48" height="48">
        <span class="place-name"><b>${esc(title)}</b><small>${esc(name(p))} · ${note}</small>${extra}</span>
      </button>
    </div>`;
  const busy = [...new Set([...s.sites.map((x) => x.province), ...s.workQueue.map((x) => x.province)])];
  const next = (p: number) => s.sites.filter((x) => x.province === p).sort((a, b) => a.monthsLeft - b.monthsLeft)[0];
  busy.sort((a, b) => (next(a)?.monthsLeft ?? 999) - (next(b)?.monthsLeft ?? 999));
  const sites = busy
    .map((p) => {
      const n = next(p);
      const building = s.sites.filter((x) => x.province === p).length;
      const queued = s.workQueue.filter((x) => x.province === p).length;
      const counts = [building ? `${building} being built` : "", queued ? `${queued} queued` : ""].filter(Boolean).join(", ");
      return n
        ? row(p, `${cap(stepName(s, n.work, n.step))} in ${months(n.monthsLeft)}`, counts, progress(n.months - n.monthsLeft, n.months))
        : row(p, name(p), `${counts}: waiting for the gold`);
    })
    .join("");
  const counts = s.works
    .map((w, k) => {
      let n = 0;
      for (const p of held) if (s.provinceWorks[p * W + k]! > 0) n++;
      return n ? `<li>${esc(cap(w))} <b>${n}</b></li>` : "";
    })
    .join("");
  return `
    <p>${icon("coin", 1)} Works cost <b>${upkeep.toFixed(1)}</b> gold a month in upkeep.${s.worksNeglected ? " <b>Unpaid: they give only half.</b>" : ""}</p>
    <h3 class="sub">Being built</h3>
    ${sites ? `<div class="province-list">${sites}</div>` : `<p class="hint">Nothing is being built. Tap a province, then its Build tab.</p>`}
    <h3 class="sub">Standing in your provinces</h3>
    ${counts ? `<ul class="works-counts">${counts}</ul>` : `<p class="hint">Nothing built yet.</p>`}`;
}
