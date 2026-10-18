import type { ExplorationView, FleetView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Exploration and colonies (exploration spec, "How the player uses it",
 * EXPL-069 … EXPL-074): the Explore and Colony sections of the fleet card,
 * the voyage bar over the map while a course is drawn, the Colony section of a
 * province being settled, and the realm's Colonies tab. HTML only; main.ts
 * binds the buttons by their data attributes.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en");
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

type Colony = ExplorationView["colonies"][number];
type Governor = ExplorationView["governors"][number];

const MOOD: Record<string, string> = { Peaceful: "peaceful", Wary: "wary", Hostile: "hostile", Fierce: "fierce" };

/** A reason a button can't be used, written under it (no hover on a phone, EXPL-074). */
const why = (text: string) => `<small class="why">${esc(text)}</small>`;

/** The fleet card's Explore section: the order, or why not, and the voyage under way. */
export function exploreSection(f: FleetView, ex: ExplorationView, o: { inPort: boolean; drawing: boolean; name: (p: number) => string }): string {
  if (!f.explorers) return "";
  const v = ex.voyages.find((x) => x.fleet === f.id);
  const voyage = v
    ? `<p>${icon("map", 1)} On a voyage${v.turnedBack ? ", turned back short of supply" : ""}: ${plural(v.charted, "new place")} charted so far · ${v.carryOn ? "Carry on" : "Turn back"} when supply runs low.</p>`
    : "";
  const button = o.inPort
    ? `<div class="army-buttons"><button class="wax" data-explore="${f.id}">${o.drawing ? "Drawing a course…" : "Explore"}</button></div>
       <p class="hint">Tap Explore, then sea zones on the map, under the parchment or not: each tap adds a leg. The bar shows the supply out and back.</p>`
    : `<p class="hint">Put into port to explore again: a voyage leaves port with full supply. Sail takes the fleet home.</p>`;
  return `<h3 class="sub">Explore</h3>${voyage}${f.route.length && v ? "" : button}`;
}

/** The fleet card's Colony section: the governor aboard, hiring one, stores, and the coasts beside it to settle (EXPL-070). */
export function colonySection(
  f: FleetView,
  ex: ExplorationView,
  o: { inPort: boolean; portOfMine: boolean; gold: number; stores: number; storesMax: number; coasts: { province: number; why: string | null }[]; colonyHere: Colony | null; waiting: Governor[]; name: (p: number) => string },
): string {
  if (!f.explorers) return "";
  const gov = ex.governors.find((g) => g.fleet === f.id);
  const parts: string[] = [];
  if (!ex.colonial) {
    parts.push(`<p class="hint">Colonies open with ocean navigation (or outrigger voyaging). Until then a fleet can only chart the world.</p>`);
  } else if (gov) {
    parts.push(`<p>${icon("crown", 1)} <b>${esc(gov.name)}</b>, colonial governor, aged ${gov.age}${gov.homeward ? ", coming home" : ""}, is aboard.</p>`);
  } else if (o.inPort && o.portOfMine) {
    const full = ex.used >= ex.slots;
    const poor = o.gold < ex.hireGold;
    parts.push(`<div class="choices"><button class="paper" data-colony-hire ${full || poor ? "disabled" : ""}>Hire a colonial governor · ${ex.hireGold} gold</button>${full ? why(`All ${ex.slots} colonial governor slots are taken.`) : poor ? why("Not enough gold.") : `<small class="why">He comes aboard at once and is paid ${ex.wagePerYear} gold a year.</small>`}</div>`);
    for (const g of o.waiting) parts.push(`<div class="choices"><button class="paper" data-colony-embark="${g.id}">Take ${esc(g.name)} aboard</button></div>`);
  } else {
    parts.push(`<p class="hint">No governor aboard. Hire one in a port of yours.</p>`);
  }
  if (o.storesMax) {
    const load = ex.fleets.find((x) => x.id === f.id)?.load;
    const line = `<p>Colony stores: ${fmt(o.stores)} of ${fmt(o.storesMax)} rations in the hold.</p>`;
    if (o.inPort && load && load.rations > 0) {
      const cost = load.pays === "gold" ? `${load.gold} gold` : load.pays === "food" ? "from the port's store" : "";
      parts.push(`${line}<div class="choices"><button class="paper" data-colony-load ${load.pays ? "" : "disabled"}>Load ${fmt(load.rations)} rations · ${cost || "not sold here"}</button>${load.pays ? "" : why("This port won't sell to you.")}</div>`);
    } else parts.push(line);
  }
  if (o.colonyHere && o.stores > 0) parts.push(`<div class="choices"><button class="paper" data-colony-unload>Unload ${fmt(o.stores)} rations into ${esc(o.name(o.colonyHere.province))}</button></div>`);
  if (gov && !o.inPort && o.coasts.length) {
    parts.push(
      `<div class="choices">${o.coasts
        .map((c) => `<span class="choice"><button class="wax" data-colony-found="${c.province}" ${c.why ? "disabled" : ""}>Found a colony in ${esc(o.name(c.province))}</button>${c.why ? why(c.why) : ""}</span>`)
        .join("")}</div>`,
    );
  } else if (gov && !o.inPort) parts.push(`<p class="hint">Sail beside an empty coast to settle it.</p>`);
  return `<h3 class="sub">Colony</h3>${parts.join("")}`;
}

/** The bar over the map while a course is drawn (EXPL-069, EXPL-074): zones, uncharted, supply out and back, the low-supply switch. */
export function voyageBar(d: { zones: number; uncharted: number; supply: number; carryOn: boolean }): string {
  const need = d.zones * 2;
  const short = Math.max(0, need - d.supply);
  const summary = d.zones
    ? `<b>${plural(d.zones, "zone")}</b>, ${d.uncharted} uncharted · supply ${need} of ${d.supply} out and back${short ? ` · <b class="warn">${short} short</b>` : ""}`
    : "<b>Tap the sea</b> to draw a course; each tap adds a leg.";
  return `
    <p class="summary">${summary}</p>
    <div class="controls">
    <div class="switch" role="radiogroup" aria-label="When supply runs low">
      <button class="paper${d.carryOn ? "" : " on"}" data-voyage-low="back" role="radio" aria-checked="${!d.carryOn}">Turn back</button>
      <button class="paper${d.carryOn ? " on" : ""}" data-voyage-low="on" role="radio" aria-checked="${d.carryOn}">Carry on</button>
    </div>
    <div class="actions">
      <button class="paper" data-voyage-undo ${d.zones ? "" : "disabled"}>Undo</button>
      <button class="paper" data-voyage-cancel>Cancel</button>
      <button class="wax" data-voyage-go ${d.zones ? "" : "disabled"}>Set sail</button>
    </div>
    </div>`;
}

/** A progress bar of a colony being founded. */
const bar = (c: Colony, done: number) => `<span class="progress colony-progress"><i style="width:${Math.max(0, Math.min(100, (c.progress / done) * 100))}%"></i></span>`;

/** The Colony section of a province being settled (EXPL-071). */
export function colonyCard(c: Colony, ex: ExplorationView, o: { mine: boolean; owner: string; shipBeside: boolean }): string {
  const short = c.monthsOfFood < c.monthsLeft;
  return `
    <section class="colony-card">
      <h3 class="sub">${icon("crown", 1)} Colony ${o.mine ? "of yours" : `of ${esc(o.owner)}`} being founded</h3>
      ${bar(c, ex.progressFounded)}
      <dl class="facts">
        <dt>Progress</dt><dd>${c.progress} of ${ex.progressFounded} · about +${c.average} a month${c.lastChange ? ` (last month ${c.lastChange > 0 ? "+" : ""}${c.lastChange})` : ""}</dd>
        ${o.mine ? `<dt>Governor</dt><dd>${esc(c.governor)}</dd>` : ""}
        <dt>Locals</dt><dd>${MOOD[c.aggression] ?? c.aggression} · take 0 to ${c.pressureMax} a month</dd>
        ${o.mine ? `<dt>Food</dt><dd>${fmt(c.food)} rations · ${plural(c.monthsOfFood, "month")}${short ? ` <b class="warn">runs out before it is founded (about ${plural(c.monthsLeft, "month")} to go)</b>` : ""}</dd>` : ""}
      </dl>
      ${o.mine ? `<div class="choices"><button class="paper" data-colony-abandon="${c.province}" ${o.shipBeside ? "" : "disabled"}>Abandon the colony</button>${o.shipBeside ? why("The governor comes back aboard; the food ashore is lost.") : why("A ship of yours must lie in the sea beside it.")}</div>` : ""}
    </section>`;
}

/** The realm's Colonies tab: governors, colonies being founded and founded, and the empty coasts in range (EXPL-072). */
export function coloniesTab(ex: ExplorationView, o: { name: (p: number) => string; fleetName: (id: number) => string; inRange: number }): string {
  if (!ex.colonial) {
    return `
      <dl class="facts"><dt>Colonies</dt><dd>Not yet</dd></dl>
      <p class="hint">Colonial governors open with ocean navigation (or outrigger voyaging). ${ex.unlocked ? "Your caravels can already chart the world: give one a voyage from its fleet card." : ex.why ? `Exploration ships wait: ${esc(ex.why)}.` : "Exploration ships come with Carrack and caravel."}</p>
      <div class="choices"><button class="paper" data-show-charts>${icon("map", 1)}Show the Charts lens</button></div>`;
  }
  const mine = ex.colonies.filter((c) => c.owner >= 0 && ex.governors.some((g) => g.colony === c.province));
  const where = (g: Governor) =>
    g.colony >= 0
      ? `<button class="paper capital" data-look="${g.colony}">${icon("map", 1)}ashore at ${esc(o.name(g.colony))}</button>`
      : g.fleet >= 0
        ? `<button class="paper capital" data-fleet-open="${g.fleet}">${icon("anchor", 1)}aboard ${esc(o.fleetName(g.fleet))}${g.homeward ? ", coming home" : ""}</button>`
        : `<button class="paper capital" data-look="${g.port}">${icon("anchor", 1)}waiting at ${esc(o.name(g.port))}</button>`;
  return `
    <dl class="facts">
      <dt>Governors</dt><dd>Colonial governors ${ex.used} of ${ex.slots} · range ${plural(ex.range, "zone")}</dd>
      <dt>Wages</dt><dd>${ex.wagePerYear} gold a year each, in the officials' line</dd>
    </dl>
    <h3 class="sub">Colonial governors</h3>
    ${ex.governors.length ? `<ul class="plain colony-list">${ex.governors.map((g) => `<li><b>${esc(g.name)}</b>, ${g.age} · ${where(g)}</li>`).join("")}</ul>` : `<p class="hint">None yet. Hire one from the fleet card of a caravel in a port of yours.</p>`}
    <h3 class="sub">Being founded</h3>
    ${mine.length
      ? `<ul class="plain colony-list">${mine
          .map((c) => `<li><button class="paper capital" data-look="${c.province}">${icon("map", 1)}${esc(o.name(c.province))}</button> ${c.progress} of ${ex.progressFounded}${bar(c, ex.progressFounded)}<small>${MOOD[c.aggression]} locals · food for ${plural(c.monthsOfFood, "month")}${c.monthsOfFood < c.monthsLeft ? ` <b class="warn">short</b>` : ""}</small></li>`)
          .join("")}</ul>`
      : `<p class="hint">No colony is being founded.</p>`}
    ${ex.founded.length ? `<h3 class="sub">Founded</h3><div class="choices">${ex.founded.map((p) => `<button class="paper capital" data-look="${p}">${icon("castle", 1)}${esc(o.name(p))}</button>`).join("")}</div>` : ""}
    <h3 class="sub">Empty coasts</h3>
    <p>${o.inRange ? `${plural(o.inRange, "empty coast")} charted inside your range.` : "No empty coast you have charted lies inside your range: explore further."}</p>
    <div class="choices"><button class="paper" data-show-charts>${icon("map", 1)}Show on the Charts lens</button></div>`;
}
