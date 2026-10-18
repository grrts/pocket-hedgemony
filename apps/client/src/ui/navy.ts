import type { FleetView, NavyView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Ships and ports (naval spec, "How the player uses it"): the Port tab of a
 * coastal province (sailors, the shipyard's ships to order, hulls on the
 * slipways), the fleet card (its ships, admiral, the army aboard, Sail), and
 * the realm's Navy tab, the overview of every fleet, port and sea battle.
 * HTML only; main.ts binds the buttons by their data attributes.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en");
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

type Port = NavyView["ports"][number];
type MyFleet = NavyView["mine"][number];

const HARBOUR = ["no harbour", "a landing", "a harbour", "a great harbour", "a great harbour"];
const YARD = ["no shipyard", "a shipyard", "a shipyard", "a great shipyard", "an arsenal"];

/** Where a fleet is and what it is doing, in a few words. */
export function fleetStatus(f: FleetView, name: (p: number) => string): string {
  if (f.battle) return `fighting at ${esc(name(f.at))}`;
  if (f.fleeing) return `running for port from ${esc(name(f.at))}`;
  if (f.route.length) return `sailing to ${esc(name(f.landAt >= 0 ? f.landAt : f.route.at(-1)!))}${f.days ? `, ${f.days} days` : ""}`;
  return `at ${esc(name(f.at))}`;
}

/** Days or weeks until something comes in, as a queue row says it. */
const inDays = (d: number) => (d <= 1 ? "tomorrow" : d < 14 ? `in ${d} days` : `in ${Math.round(d / 7)} weeks`);

/**
 * The Port tab (naval spec, How the player uses it; D-NAVY-33): harbour and
 * shipyard, then, at a shipyard, the sailors' muster queue and the ship queue,
 * each with its button and a × on its last row, and the ships the yard builds
 * on the upgrade path. A port without a shipyard says to build one.
 */
export function portTab(port: Port, o: { gold: number; musterGoldEach: number; queues: NavyView["queues"]; fleetsHere: FleetView[]; admiralName: (c: number) => string }): string {
  const q = o.queues;
  const inPort = o.fleetsHere.length ? `<h3 class="sub">In port</h3><div class="choices">${o.fleetsHere.map((f) => fleetButton(f, o.admiralName)).join("")}</div>` : "";
  const facts = `
    <dl class="facts">
      <dt>Port</dt><dd>${icon("anchor", 1)} ${HARBOUR[port.harbour] ?? "a harbour"}, ${YARD[port.shipyard] ?? "no shipyard"}${port.blockaded ? " · <b>blockaded</b>" : ""}</dd>
      <dt>Berths</dt><dd>${port.berthsUsed} of ${port.berths} taken${port.shipyard ? ` · ${plural(port.slipways, "slipway")}` : ""}</dd>
      ${port.shipyard ? `<dt>Sailors</dt><dd>${fmt(port.sailors)} ready in port · ${fmt(port.callable)} more can be called</dd>` : ""}
    </dl>`;
  if (!port.shipyard)
    return `${facts}
    <h3 class="sub">Shipyard</h3>
    <p class="hint">Sailors are mustered and ships built only at a shipyard. Build one here: it stands with the harbour and takes no slot of its own.</p>
    <div class="choices"><button class="paper" data-tab="build">${icon("hammer", 1)}Build a shipyard</button></div>
    ${inPort}`;
  // The sailors' queue: one row a batch, the first gathering, the rest waiting their turn.
  const batches = port.musterQueue.length;
  const musterWhy = (n: number) => (batches + Math.ceil(n / q.musterBatch) > q.musterQueueMax ? "The queue is full" : n > port.callable ? "Not enough men to call here" : n * o.musterGoldEach > o.gold ? "Not enough gold" : "");
  const musterButton = (n: number, label: string) => {
    const g = Math.round(n * o.musterGoldEach * 100) / 100;
    const why = musterWhy(n);
    return `<button class="paper" data-port-muster="${n}" ${why ? `disabled title="${why}"` : ""}>${label} · ${g} gold</button>`;
  };
  const crew = Math.min(port.crewShort, (q.musterQueueMax - batches) * q.musterBatch);
  const musterRows = port.musterQueue
    .map((m, i) => `<li class="${i === 0 ? "now" : ""}">${icon("hourglass", 1)}<span class="what"><b>${fmt(m.sailors)} sailors</b> <small>${i === 0 ? "gathering" : "waiting"}</small></span><span class="when">${inDays(m.days)}</span>${i === batches - 1 ? `<button class="paper small" data-port-unmuster title="Cancel: the bounty comes back">×</button>` : ""}</li>`)
    .join("");
  // The ship queue: hulls on the slipways first, then the ships waiting their turn.
  const waiting = port.queue.length;
  const shipRows = [
    ...port.building.map((b) => `<li class="now">${icon("hammer", 1)}<span class="what"><b>${esc(cap1(b.type))}</b> <small>on the slipway</small></span><span class="when">${plural(b.monthsLeft, "month")}</span></li>`),
    ...port.queue.map((x, i) => `<li>${icon("hourglass", 1)}<span class="what"><b>${esc(cap1(x.type))}</b> <small>${esc(x.waiting)}</small></span>${i === waiting - 1 ? `<button class="paper small" data-port-unorder title="Cancel: its ${x.gold} gold comes back">×</button>` : ""}</li>`),
  ].join("");
  const ships = port.ships
    .map(
      (x) => `<tr${x.why ? ' class="dim"' : ""}><th>${esc(cap1(x.type))}<br><small>fights ${x.fights} · carries ${fmt(x.carries)}</small></th>
        <td>${x.gold} gold<br><small>${x.crew} crew · ${x.months} mo</small></td>
        <td>${x.why ? `<small>${esc(x.why)}</small>` : `<button class="wax small" data-port-buy="${esc(x.type)}">Order</button>`}</td></tr>`,
    )
    .join("");
  return `${facts}
    <h3 class="sub">Sailors</h3>
    <p class="hint">Sailors come from the levy pool, ${fmt(q.musterBatch)} at a time, each batch two weeks after the one before. A ship waits in the queue until its crew is in port.</p>
    <div class="choices">${musterButton(q.musterBatch, `Muster ${fmt(q.musterBatch)} sailors`)}${crew > 0 ? musterButton(crew, `Muster ${fmt(crew)} for the waiting ships`) : ""}</div>
    <div class="queue-head"><span>On their way</span><span>${batches} / ${q.musterQueueMax}</span></div>
    ${batches ? `<ol class="queue">${musterRows}</ol>` : `<p class="hint">No sailors are on their way here.</p>`}
    <h3 class="sub">Ships</h3>
    <div class="queue-head"><span>${port.building.length} of ${plural(port.slipways, "slipway")} busy</span><span>${waiting} / ${q.shipQueueMax} waiting</span></div>
    ${shipRows ? `<ol class="queue">${shipRows}</ol>` : `<p class="hint">Nothing is being built here.</p>`}
    <h3 class="sub">Order a ship</h3>
    ${ships ? `<table class="troops ships">${ships}</table>` : `<p class="hint">This yard builds no ship for you yet.</p>`}
    ${port.later.length ? `<p class="hint">Next: ${port.later.map((x) => `${esc(cap1(x.type))} (${esc(x.why)})`).join(", ")}. A newer ship replaces the one before it here.</p>` : ""}
    ${inPort}`;
}

/** A button that opens a fleet's card. */
export function fleetButton(f: FleetView, admiralName: (c: number) => string): string {
  return `<button class="paper" data-fleet-open="${f.id}">${icon("anchor", 1)}${f.admiral >= 0 ? `${esc(admiralName(f.admiral))}'s fleet` : f.explorers ? "Explorers" : "Fleet without an admiral"} · ${plural(f.ships, "ship")}${f.men ? ` · ${fmt(f.men)} men aboard` : ""}</button>`;
}

/** The fleet card: where it is, Sail, its admiral, the army aboard and every ship. */
export function fleetCard(
  f: FleetView,
  mine: MyFleet,
  o: {
    name: (p: number) => string;
    admiralName: (c: number) => string;
    idle: { id: number; name: string; skills: string }[];
    armiesHere: { id: number; name: string; men: number; room: number }[];
    fleetsHere: FleetView[];
    choosing: boolean;
    inPort: boolean;
    me: number;
    /** The Explore and Colony sections of a fleet of explorers (ui/explore.ts), under Sail. */
    explore?: string;
  },
): string {
  const sail = f.admiral < 0 && f.needsAdmiral
    ? `<p class="hint">A fleet needs an admiral to sail. Put a commander at its head below.</p>`
    : `<div class="army-buttons"><button class="wax" data-fleet-sail="${f.id}">${o.choosing ? "Pick a sea or shore" : f.battle ? "Sail away" : "Sail"}</button></div>
       <p class="hint">Tap Sail, then a sea zone, a port to put into${f.army >= 0 ? " or a shore to land the army on" : ""}.</p>`;
  return `
    <dl class="facts">
      <dt>Where</dt><dd><button class="paper capital" data-look="${f.at}">${icon("map", 1)}${esc(o.name(f.at))}</button>${f.battle || f.fleeing || f.route.length ? `<br><small>${fleetStatus(f, o.name)}</small>` : ` <small>${o.inPort ? "in port" : "at sea"}</small>`}</dd>
      <dt>Admiral</dt><dd>${f.admiral >= 0 ? esc(o.admiralName(f.admiral)) : "none"}</dd>
      <dt>Strength</dt><dd>${fmt(f.strength)} · ${plural(f.ships, "ship")}</dd>
      <dt>Room</dt><dd>${fmt(mine.room)} men${f.army >= 0 ? `, ${fmt(f.men)} aboard` : ""}</dd>
      <dt>Cost</dt><dd>${mine.cost.toFixed(2)} gold a month</dd>
    </dl>
    ${sail}
    ${o.explore ?? ""}
    <h3 class="sub">Army aboard</h3>
    ${f.army >= 0
      ? `<p>${fmt(f.men)} men${f.landAt >= 0 ? `, to land at ${esc(o.name(f.landAt))}` : ""}.</p>${o.inPort ? `<div class="choices"><button class="paper" data-fleet-unload>Put them ashore here</button></div>` : ""}`
      : o.inPort && o.armiesHere.length
        ? `<div class="choices">${o.armiesHere.map((a) => `<button class="paper" data-fleet-board="${a.id}" ${a.room > mine.room ? `disabled title="needs room for ${fmt(a.room)}"` : ""}>Take aboard ${esc(a.name)}'s army · ${fmt(a.men)} men</button>`).join("")}</div>`
        : `<p class="hint">${o.inPort ? "No army of yours stands in this port." : "Armies board in port."}</p>`}
    <h3 class="sub">Admiral</h3>
    <div class="choices">
      ${o.idle.slice(0, 3).map((c) => `<button class="paper" data-fleet-admiral="${c.id}" title="${esc(c.skills)}">${f.admiral >= 0 ? "Hand over to" : "Appoint"} ${esc(c.name)}</button>`).join("")}
      ${f.admiral >= 0 ? `<button class="paper" data-fleet-admiral="-1">Send ${esc(o.admiralName(f.admiral))} back to court</button>` : ""}
      ${!f.needsAdmiral && f.admiral < 0 ? `<p class="hint">Explorers sail without one; an admiral leads them if war finds them.</p>` : ""}
      ${!o.idle.length && f.admiral < 0 && f.needsAdmiral ? `<p class="hint">No commander waits at court. Commission an official as one first.</p><button class="paper" data-realm="${o.me}" data-realm-open="officials">Officials</button>` : ""}
    </div>
    <h3 class="sub">Ships</h3>
    <table class="troops ships">${mine.ships
      .map(
        (s) => `<tr><th>${esc(cap1(s.type))}<br><small>${esc(s.hull)} · ${s.age} yr</small></th>
          <td>${s.crew} of ${s.crewNeed} crew<br><small>supply ${s.supply} of ${s.supplyMax} mo</small></td>
          <td>${mine.ships.length > 1 ? `<button class="paper small" data-fleet-split="${s.id}">Part off</button>` : ""}</td></tr>`,
      )
      .join("")}</table>
    ${o.fleetsHere.length ? `<h3 class="sub">Join another fleet here</h3><div class="choices">${o.fleetsHere.map((x) => `<button class="paper" data-fleet-merge="${x.id}">Into ${x.admiral >= 0 ? `${esc(o.admiralName(x.admiral))}'s fleet` : "the fleet without an admiral"}</button>`).join("")}</div>` : ""}
    ${o.inPort && f.army < 0 ? `<div class="choices"><button class="paper" data-fleet-disband>Lay up the ships and pay off the crews</button></div>` : ""}`;
}

/** The realm's Navy tab: the overview of every fleet, port and sea battle, and what it all costs. */
export function navyTab(v: NavyView, me: number, o: { name: (p: number) => string; admiralName: (c: number) => string }): string {
  const fleets = v.fleets.filter((f) => f.owner === me);
  const ships = fleets.reduce((t, f) => t + f.ships, 0);
  const sailors = v.ports.reduce((t, p) => t + p.sailors + p.mustering, 0);
  const building = v.ports.reduce((t, p) => t + p.building.length, 0);
  const waiting = v.ports.reduce((t, p) => t + p.queue.length, 0);
  const battles = v.battles.filter((b) => b.mine);
  return `
    <dl class="facts">
      <dt>Ships</dt><dd>${icon("anchor", 1)} ${plural(ships, "ship")} in ${plural(fleets.length, "fleet")}${building ? ` · ${building} building` : ""}${waiting ? ` · ${waiting} waiting` : ""}</dd>
      <dt>Sailors</dt><dd>${fmt(sailors)} in port or on their way</dd>
      <dt>Cost</dt><dd>${v.cost.toFixed(2)} gold a month</dd>
    </dl>
    ${battles.length ? `<h3 class="sub">Sea battles</h3><ul class="plain">${battles.map((b) => `<li>${icon("swords", 1)} <button class="paper capital" data-look="${b.zone}">${esc(o.name(b.zone))}</button> round ${b.round}: ${fmt(b.strength[0])} against ${fmt(b.strength[1])}</li>`).join("")}</ul>` : ""}
    <h3 class="sub">Fleets</h3>
    ${fleets.length
      ? `<div class="fleet-list">${fleets.map((f) => `<div class="fleet-row">${fleetButton(f, o.admiralName)}<small>${fleetStatus(f, o.name)}</small></div>`).join("")}</div>`
      : `<p class="hint">No ships yet. Open a port with a shipyard below, order a ship and muster its crew.</p>`}
    <h3 class="sub">Ports</h3>
    ${v.ports.length
      ? `<table class="troops ports">${v.ports
          .map((p) => `<tr><th><button class="paper capital" data-port-open="${p.province}">${icon("anchor", 1)}${esc(o.name(p.province))}</button></th><td>${cap1(YARD[p.shipyard] ?? "")}<br><small>${fmt(p.sailors)} sailors${p.musterQueue.length ? ` · ${fmt(p.mustering)} coming` : ""}${p.building.length ? ` · ${p.building.length} building` : ""}${p.queue.length ? ` · ${p.queue.length} waiting` : ""}${p.blockaded ? " · blockaded" : ""}</small></td></tr>`)
          .join("")}</table>`
      : `<p class="hint">Your realm has no port. Build a harbour in a coastal province.</p>`}`;
}
