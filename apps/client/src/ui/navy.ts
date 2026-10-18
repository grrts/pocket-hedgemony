import type { FleetView, NavyView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Ships and ports (naval spec, "How the player uses it"): the Port tab of a
 * coastal province (sailors, the shipyard's ships to order, hulls on the
 * slipways), the fleet card (its ships, its leader and his post, the army
 * aboard, Sail, the blockade it holds), and the realm's Navy tab, the overview
 * of every fleet, port, sea battle and blockade.
 * HTML only; main.ts binds the buttons by their data attributes.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en");
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

type Port = NavyView["ports"][number];
type MyFleet = NavyView["mine"][number];
type Blockade = NavyView["blockades"][number];

const HARBOUR = ["no harbour", "a landing", "a harbour", "a great harbour", "a great harbour"];
const YARD = ["no shipyard", "a shipyard", "a shipyard", "a great shipyard", "an arsenal"];

/** Gold, with a decimal while it is small. */
const gold = (n: number) => (n < 10 ? String(Math.round(n * 10) / 10) : fmt(n));

/** A fleet's name: its leader's, with the post he holds ("Commodore Vasco's fleet", NAVY-137), else what it is. */
export function fleetTitle(f: FleetView, leaderName: (c: number) => string, none = "Fleet without a leader"): string {
  return f.admiral >= 0 ? `${cap1(f.post)} ${leaderName(f.admiral)}'s fleet` : f.explorers ? "Explorers" : none;
}

/** The ports a blockade closes, in a few words: "the port of Seville", or "3 ports of Castile" (NAVY-147). */
export function closedPorts(ports: number[], realm: string, name: (p: number) => string): string {
  return ports.length === 1 ? `the port of ${esc(name(ports[0]!))}` : `${ports.length} ports of ${esc(realm)}`;
}

/** Where a fleet is and what it is doing, in a few words. */
export function fleetStatus(f: FleetView, name: (p: number) => string): string {
  if (f.battle) return `fighting at ${esc(name(f.at))}`;
  if (f.fleeing) return `running for port from ${esc(name(f.at))}`;
  if (f.route.length) return `sailing to ${esc(name(f.landAt >= 0 ? f.landAt : f.route.at(-1)!))}${f.days ? `, ${f.days} days` : ""}`;
  return `at ${esc(name(f.at))}`;
}

/** The Port tab: harbour and shipyard, sailors to muster, ships to order and hulls building. */
export function portTab(port: Port, o: { gold: number; musterGoldEach: number; fleetsHere: FleetView[]; admiralName: (c: number) => string; blockadedBy?: string | undefined }): string {
  const ready = port.sailors;
  const muster = (n: number) => {
    const g = Math.round(n * o.musterGoldEach * 100) / 100;
    const why = n > port.callable ? "not enough men to call here" : g > o.gold ? "not enough gold" : "";
    return `<button class="paper" data-port-muster="${n}" ${why ? `disabled title="${why}"` : ""}>Muster ${fmt(n)} · ${g} gold</button>`;
  };
  const ships = port.ships
    .map(
      (s) => `<tr${s.why ? ' class="dim"' : ""}><th>${esc(cap1(s.type))}<br><small>fights ${s.fights} · carries ${fmt(s.carries)}</small></th>
        <td>${s.gold} gold<br><small>${s.crew} crew · ${s.months} mo</small></td>
        <td>${s.why ? `<small>${esc(s.why)}</small>` : `<button class="wax small" data-port-buy="${esc(s.type)}">Order</button>`}</td></tr>`,
    )
    .join("");
  return `
    <dl class="facts">
      <dt>Port</dt><dd>${icon("anchor", 1)} ${HARBOUR[port.harbour] ?? "a harbour"}, ${YARD[port.shipyard] ?? "no shipyard"}</dd>
      ${port.blockaded ? `<dt>Blockade</dt><dd><b>Blockaded${o.blockadedBy ? ` by ${esc(o.blockadedBy)}` : ""}</b><br><small>No trade gains here while their ships lie off the coast.</small></dd>` : ""}
      <dt>Berths</dt><dd>${port.berthsUsed} of ${port.berths} taken · ${plural(port.slipways, "slipway")}</dd>
      <dt>Sailors</dt><dd>${fmt(ready)} ready in port${port.mustering ? `, ${fmt(port.mustering)} on their way` : ""} · ${fmt(port.callable)} more can be called</dd>
    </dl>
    <h3 class="sub">Muster sailors</h3>
    <p class="hint">Sailors come from the levy pool and are ready in two weeks. Each ship needs its crew waiting here before it is ordered.</p>
    <div class="choices">${[30, 100, 300].map(muster).join("")}</div>
    ${port.building.length ? `<h3 class="sub">On the slipways</h3><ul class="plain">${port.building.map((b) => `<li>${icon("hourglass", 1)} ${esc(cap1(b.type))}: ${plural(b.monthsLeft, "month")} left of ${b.months}</li>`).join("")}</ul>` : ""}
    <h3 class="sub">Order a ship</h3>
    <table class="troops ships">${ships}</table>
    ${o.fleetsHere.length ? `<h3 class="sub">In port</h3><div class="choices">${o.fleetsHere.map((f) => fleetButton(f, o.admiralName)).join("")}</div>` : ""}`;
}

/** A button that opens a fleet's card. */
export function fleetButton(f: FleetView, admiralName: (c: number) => string): string {
  return `<button class="paper" data-fleet-open="${f.id}">${icon("anchor", 1)}${esc(fleetTitle(f, admiralName))} · ${plural(f.ships, "ship")}${f.men ? ` · ${fmt(f.men)} men aboard` : ""}</button>`;
}

/** The fleet card: where it is and the blockade it holds, Sail, its leader and his post, the army aboard and every ship. */
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
    /** The posts a leader may hold (NAVY-137), the realm whose ports the fleet closes, and the player's prize money last month. */
    posts: NavyView["posts"];
    realmName: (n: number) => string;
    blockade?: Blockade | undefined;
    prize: number;
  },
): string {
  const sail = f.admiral < 0 && f.needsAdmiral
    ? `<p class="hint">A fleet needs a leader to sail. Put a commander at its head below.</p>`
    : `<div class="army-buttons"><button class="wax" data-fleet-sail="${f.id}">${o.choosing ? "Pick a sea or shore" : f.battle ? "Sail away" : "Sail"}</button></div>
       <p class="hint">Tap Sail, then a sea zone, a port to put into${f.army >= 0 ? " or a shore to land the army on" : ""}.</p>`;
  return `
    <dl class="facts">
      <dt>Where</dt><dd><button class="paper capital" data-look="${f.at}">${icon("map", 1)}${esc(o.name(f.at))}</button>${f.battle || f.fleeing || f.route.length ? `<br><small>${fleetStatus(f, o.name)}</small>` : ` <small>${o.inPort ? "in port" : "at sea"}</small>`}</dd>
      ${f.blockading.length ? `<dt>Blockade</dt><dd>Blockading ${closedPorts(f.blockading, o.blockade ? o.realmName(o.blockade.against) : "the enemy", o.name)}<br><small>Their trade ships can't pass; ${o.blockade && o.blockade.prize > 0 ? `about ${gold(o.blockade.prize)} gold a month in prizes` : "prize money comes in each month"}.</small></dd>` : ""}
      <dt>Strength</dt><dd>${fmt(f.strength)} · ${plural(f.ships, "ship")}</dd>
      <dt>Room</dt><dd>${fmt(mine.room)} men${f.army >= 0 ? `, ${fmt(f.men)} aboard` : ""}</dd>
      <dt>Cost</dt><dd>${mine.cost.toFixed(2)} gold a month</dd>
    </dl>
    ${sail}
    ${o.explore ?? ""}
    ${leaderSection(f, o)}
    <h3 class="sub">Army aboard</h3>
    ${f.army >= 0
      ? `<p>${fmt(f.men)} men${f.landAt >= 0 ? `, to land at ${esc(o.name(f.landAt))}` : ""}.</p>${o.inPort ? `<div class="choices"><button class="paper" data-fleet-unload>Put them ashore here</button></div>` : ""}`
      : o.inPort && o.armiesHere.length
        ? `<div class="choices">${o.armiesHere.map((a) => `<button class="paper" data-fleet-board="${a.id}" ${a.room > mine.room ? `disabled title="needs room for ${fmt(a.room)}"` : ""}>Take aboard ${esc(a.name)}'s army · ${fmt(a.men)} men</button>`).join("")}</div>`
        : `<p class="hint">${o.inPort ? "No army of yours stands in this port." : "Armies board in port."}</p>`}
    <h3 class="sub">Ships</h3>
    <table class="troops ships">${mine.ships
      .map(
        (s) => `<tr><th>${esc(cap1(s.type))}<br><small>${esc(s.hull)} · ${s.age} yr</small></th>
          <td>${s.crew} of ${s.crewNeed} crew<br><small>supply ${s.supply} of ${s.supplyMax} mo</small></td>
          <td>${mine.ships.length > 1 ? `<button class="paper small" data-fleet-split="${s.id}">Part off</button>` : ""}</td></tr>`,
      )
      .join("")}</table>
    ${o.fleetsHere.length ? `<h3 class="sub">Join another fleet here</h3><div class="choices">${o.fleetsHere.map((x) => `<button class="paper" data-fleet-merge="${x.id}">Into ${esc(fleetTitle(x, o.admiralName, "the fleet without a leader"))}</button>`).join("")}</div>` : ""}
    ${o.inPort && f.army < 0 ? `<div class="choices"><button class="paper" data-fleet-disband>Lay up the ships and pay off the crews</button></div>` : ""}`;
}

/**
 * The leader section: who leads and the post he holds, three buttons on one
 * row, the chosen one pressed in, with one line on what it does (NAVY-147);
 * then handing over or appointing a commander.
 */
function leaderSection(f: FleetView, o: { admiralName: (c: number) => string; idle: { id: number; name: string; skills: string }[]; posts: NavyView["posts"]; me: number }): string {
  const post = o.posts.find((p) => p.key === f.post);
  return `
    <h3 class="sub">Leader</h3>
    ${f.admiral >= 0
      ? `<p>${esc(o.admiralName(f.admiral))}, ${esc((post?.name ?? f.post).toLowerCase())} of the fleet.</p>
        <div class="fleet-posts" role="group" aria-label="Post">${o.posts.map((p) => `<button class="paper${p.key === f.post ? " on" : ""}" data-fleet-post="${p.key}" aria-pressed="${p.key === f.post}">${esc(p.name)}</button>`).join("")}</div>
        ${post ? `<p class="hint">${esc(post.does)}</p>` : ""}`
      : ""}
    <div class="choices">
      ${o.idle.slice(0, 3).map((c) => `<button class="paper" data-fleet-admiral="${c.id}" title="${esc(c.skills)}">${f.admiral >= 0 ? "Hand over to" : "Appoint"} ${esc(c.name)}</button>`).join("")}
      ${f.admiral >= 0 ? `<button class="paper" data-fleet-admiral="-1">Send ${esc(o.admiralName(f.admiral))} back to court</button>` : ""}
      ${!f.needsAdmiral && f.admiral < 0 ? `<p class="hint">Explorers sail without one; a leader takes them in hand if war finds them.</p>` : ""}
      ${!o.idle.length && f.admiral < 0 && f.needsAdmiral ? `<p class="hint">No commander waits at court. Commission an official as one first.</p><button class="paper" data-realm="${o.me}" data-realm-open="officials">Officials</button>` : ""}
    </div>`;
}

/** The realm's Navy tab: the overview of every fleet, port, sea battle and blockade, and what it all costs. */
export function navyTab(v: NavyView, me: number, o: { name: (p: number) => string; admiralName: (c: number) => string; realmName: (n: number) => string }): string {
  const fleets = v.fleets.filter((f) => f.owner === me);
  const ships = fleets.reduce((t, f) => t + f.ships, 0);
  const sailors = v.ports.reduce((t, p) => t + p.sailors + p.mustering, 0);
  const building = v.ports.reduce((t, p) => t + p.building.length, 0);
  const battles = v.battles.filter((b) => b.mine);
  // Blockades held and suffered, each looked at from its zone (NAVY-148).
  const held = v.blockades.filter((b) => b.owner === me);
  const suffered = v.blockades.filter((b) => b.against === me);
  const portList = (ports: number[]) => ports.map((p) => esc(o.name(p))).join(", ");
  return `
    <dl class="facts">
      <dt>Ships</dt><dd>${icon("anchor", 1)} ${plural(ships, "ship")} in ${plural(fleets.length, "fleet")}${building ? ` · ${building} building` : ""}</dd>
      <dt>Sailors</dt><dd>${fmt(sailors)} in port or on their way</dd>
      <dt>Cost</dt><dd>${v.cost.toFixed(2)} gold a month</dd>
    </dl>
    ${battles.length ? `<h3 class="sub">Sea battles</h3><ul class="plain">${battles.map((b) => `<li>${icon("swords", 1)} <button class="paper capital" data-look="${b.zone}">${esc(o.name(b.zone))}</button> round ${b.round}: ${fmt(b.strength[0])} against ${fmt(b.strength[1])}</li>`).join("")}</ul>` : ""}
    ${held.length || suffered.length || v.prize > 0
      ? `<h3 class="sub">Blockades</h3>
        ${v.prize > 0 ? `<p>Prize money last month: ${gold(v.prize)} gold</p>` : ""}
        ${held.length || suffered.length
          ? `<ul class="plain blockades">${[
              ...held.map((b) => `<li>${icon("anchor", 1)} <button class="paper capital" data-look="${b.zone}">${esc(o.name(b.zone))}</button> You close ${closedPorts(b.ports, o.realmName(b.against), o.name)}${b.ports.length > 1 ? `: ${portList(b.ports)}` : ""}</li>`),
              ...suffered.map((b) => `<li>${icon("swords", 1)} <button class="paper capital" data-look="${b.zone}">${esc(o.name(b.zone))}</button> ${esc(o.realmName(b.owner))} closes ${b.ports.length === 1 ? "your port of" : "your ports"} ${portList(b.ports)}</li>`),
            ].join("")}</ul>`
          : `<p class="hint">No blockade now.</p>`}`
      : ""}
    <h3 class="sub">Fleets</h3>
    ${fleets.length
      ? `<div class="fleet-list">${fleets.map((f) => `<div class="fleet-row">${fleetButton(f, o.admiralName)}<small>${fleetStatus(f, o.name)}</small></div>`).join("")}</div>`
      : `<p class="hint">No ships yet. Open a port below, muster sailors there and order a ship.</p>`}
    <h3 class="sub">Ports</h3>
    ${v.ports.length
      ? `<table class="troops ports">${v.ports
          .map((p) => `<tr><th><button class="paper capital" data-port-open="${p.province}">${icon("anchor", 1)}${esc(o.name(p.province))}</button></th><td>${YARD[p.shipyard] ?? ""}<br><small>${fmt(p.sailors)} sailors${p.building.length ? ` · ${p.building.length} building` : ""}${p.blockaded ? " · blockaded" : ""}</small></td></tr>`)
          .join("")}</table>`
      : `<p class="hint">Your realm has no port. Build a harbour in a coastal province.</p>`}`;
}
