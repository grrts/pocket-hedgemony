import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };
import bridge from "../../rules/data/domain/events-places.json" with { type: "json" };
import * as evt from "./domain/events/index.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { Rng } from "./rng.ts";
import { stabilityOf } from "./stability.ts";
import { cedeProvince, controller, type News } from "./war.ts";
import type { World } from "./world.ts";
import { noteChoice } from "./achievements.ts";
import { traitLean } from "./rulers.ts";

/**
 * Milestone 6, history (first slice): the 1444 event tree fires in the game.
 * The events library keeps the rules (ages, periods, eligibility, pool rolls,
 * the AI's choice, effects); this file is the bridge (D-EVT-17). Each month it
 * shows the tree the game as the tree's own world (realms under their tree
 * ids, the mapped places, wars, alliances, borders, gold and men), runs the
 * month, lets the AI answer its events and decisions at once, and lands what
 * the game already simulates: land changing hands, annexation, gold and debt.
 * The player's events wait on a card until answered (EVT-044).
 */

type Campaign = Pick<evt.Tree, "ages" | "periods" | "events" | "modifiers" | "localization"> & { entities: Record<string, string> };
const data = campaign as unknown as Campaign;

/** Statistics the game reads live; an event's change to one is kept as an adjustment on top. */
const ADJUSTED = new Set(["legitimacy", "stability", "tech_state", "tech_economy", "tech_military"]);
const TECH = ["tech_state", "tech_economy", "tech_military"] as const;

export interface GameEvents {
  state: evt.EventState;
  /** Its own dice, so events never shift the rest of the turn's rolls. */
  rng: Rng;
  /** Tree id of each realm, and the realm of each tree id. */
  treeId: string[];
  nationOf: Map<string, number>;
  /** Tree places and the map provinces they cover. */
  places: [string, number[]][];
  /** Relations set by events that the game does not keep itself (rivalry, guarantee …), re-added at each sync. */
  eventRelations: { who: string; other: string; type: string }[];
  /** Event changes to legitimacy, stability and the tech tracks, by tree id. */
  adjust: Record<string, Record<string, number>>;
  /** Stability read this month, by realm (read only when a condition asks). */
  stability: Map<number, number>;
  /** Inventions each realm knew in 1444: the tech tracks rise by one for each learned since. */
  knownAtStart: number[];
}

const provinceKey = (p: string) => `g:${p}`;

/** The events of the tree, the bridge's aliases and places, set up for a new game. */
export function createGameEvents(world: World): GameEvents {
  const tree = evt.emptyWorld(world.date.year, world.date.month);
  const aliases = bridge.aliases as Record<string, string>;
  const treeId = world.nationIds.map((id) => aliases[id] ?? id);
  const nationOf = new Map(treeId.map((id, n) => [id, n]));
  const places = Object.entries(bridge.places as Record<string, string[]>)
    .map(([key, ids]): [string, number[]] => [key, ids.map((id) => world.provinceIndex.get(id) ?? -1).filter((p) => p >= 0)])
    .filter(([, ps]) => ps.length > 0);
  for (const key of bridge.start.places) Object.assign(evt.place(tree, key).stats, bridge.start.place);
  for (const [key, ps] of places) {
    const pl = evt.place(tree, key);
    Object.assign(pl.stats, bridge.start.place);
    pl.provinces = ps.map((p) => provinceKey(world.provinceIds[p]!));
  }
  for (const id of treeId) evt.country(tree, id).stats = { ...bridge.start.country };
  const state = evt.newState(tree, { events: evt.campaignEvents(data.events), ages: data.ages, periods: data.periods });
  state.conditions = {};
  leanByTraits(world, state, nationOf);
  evt.startCampaign(state, world.date.year);
  const knownAtStart = world.nationIds.map((_, n) => world.research[n]?.known.size ?? 0);
  const g: GameEvents = { state, rng: new Rng(world.weatherSeed ^ 0x5eed), treeId, nationOf, places, eventRelations: [], adjust: {}, stability: new Map(), knownAtStart };
  state.conditions.stat = (p, w, ctx) => evt.resolve(p.who, ctx).some((id) => evt.compare(statOf(world, g, id, String(p.stat)), String(p.op), p.value as number | string));
  // Opinion is the standing one court holds of another (D-EVT-4, diplomacy's ledger), read only when asked.
  state.conditions.opinion = (p, _w, ctx) =>
    evt.resolve(p.who, ctx).some((a) => evt.resolve(p.other, ctx).some((b) => evt.compare(opinionOf(world, g, a, b), String(p.op), Number(p.value))));
  sync(world, g);
  evt.yearlyAgeCheck(state, world.date.year);
  evt.periodCheck(state, world.date.year);
  // One dry look at every event while the campaign loads, so the first month of play is no slower than the rest.
  const bound = { ...state.bound };
  for (const ev of Object.values(state.events)) evt.eligible(state, ev);
  state.bound = bound;
  return g;
}

/** The chooser's ruler's traits lean the AI's pick (REALM-104). */
function leanByTraits(world: World, state: evt.EventState, nationOf: Map<string, number>): void {
  state.lean = (chooser, o) => {
    const n = nationOf.get(chooser);
    return n === undefined ? 1 : traitLean(world, n, o.effects);
  };
}

/** A tree statistic, with legitimacy and stability read from the realm (D-EVT-4, D-EVT-17). */
function statOf(world: World, g: GameEvents, id: string, stat: string): number | string | undefined {
  const w = g.state.world;
  const n = g.nationOf.get(id);
  if (n !== undefined && stat === "stability") {
    let s = g.stability.get(n);
    if (s === undefined) g.stability.set(n, (s = STABILITY_SCALE[stabilityOf(world, n).step] ?? 0));
    return s + (g.adjust[id]?.stability ?? 0);
  }
  return (w.countries[id] ?? w.places[id])?.stats[stat];
}

/** What one court thinks of another: the diplomacy ledger's standing between realms, else what events set. */
function opinionOf(world: World, g: GameEvents, a: string, b: string): number {
  const x = g.nationOf.get(a);
  const y = g.nationOf.get(b);
  if (x !== undefined && y !== undefined) return dip.standing(world.diplomacy, world.nationIds[x]!, world.nationIds[y]!);
  return g.state.world.countries[a]?.opinions?.[b] ?? 0;
}

/** Stability steps (Steady … Crumbling) on the tree's −3..+3 scale (provisional, D-EVT-17). */
const STABILITY_SCALE = [1, 0, -1, -3];

/** Shows the tree the game as it stands: realms, wars and ties, borders, the mapped places, gold and men. */
function sync(world: World, g: GameEvents): void {
  const w = g.state.world;
  const d = world.diplomacy;
  w.year = world.date.year;
  w.month = world.date.month;
  g.stability.clear();
  const soldiers = new Float64Array(world.nationCount);
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i]! >= 0) soldiers[a.owner[i]!]! += a.men[i]!;
  // legitimacy is the share of loyal lords; integration_strain the share of provinces with a grievance (D-EVT-4).
  const lords = new Float64Array(world.nationCount);
  const loyal = new Float64Array(world.nationCount);
  for (const l of world.lords) {
    if (l.nation < 0) continue;
    lords[l.nation]!++;
    if (l.loyalty === "Loyal") loyal[l.nation]!++;
  }
  const held = new Float64Array(world.nationCount);
  const aggrieved = new Float64Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0) continue;
    held[o]!++;
    if (world.provinceGrievances[p]) aggrieved[o]!++;
  }
  for (let n = 0; n < world.nationCount; n++) {
    const id = g.treeId[n]!;
    const c = evt.country(w, id);
    c.exists = !world.nationGone[n];
    c.human = n === world.player;
    c.enemies = [];
    c.relations = g.eventRelations.filter((r) => r.who === id).map((r) => ({ other: r.other, type: r.type }));
    c.borders = dip.neighbours(d, world.nationIds[n]!).map((x) => g.treeId[world.nationIndex.get(x) ?? -1] ?? x);
    c.stats.treasury = world.nationTreasury[n]!;
    c.stats.debt = world.nationDebt[n]!;
    c.stats.army_strength = soldiers[n]! / 1000;
    c.stats.legitimacy = (lords[n] ? (100 * loyal[n]!) / lords[n]! : 100) + (g.adjust[id]?.legitimacy ?? 0);
    c.stats.integration_strain = held[n] ? (100 * aggrieved[n]!) / held[n]! : 0;
    const learned = Math.max(0, (world.research[n]?.known.size ?? 0) - (g.knownAtStart[n] ?? 0));
    for (const t of TECH) c.stats[t] = bridge.start.country[t] + learned + (g.adjust[id]?.[t] ?? 0);
  }
  const tree = (id: string) => g.treeId[world.nationIndex.get(id) ?? -1];
  for (const r of d.graph.relations) {
    const x = tree(r.source);
    const y = tree(r.target);
    if (!x || !y) continue;
    const cx = evt.country(w, x);
    const cy = evt.country(w, y);
    if (r.type === "at_war") {
      cx.enemies!.push(y);
      cy.enemies!.push(x);
    } else if (r.type === "subject") {
      cx.relations!.push({ other: y, type: "subject" });
      cy.relations!.push({ other: x, type: "overlord" });
    } else {
      cx.relations!.push({ other: y, type: r.type });
      cy.relations!.push({ other: x, type: r.type });
    }
  }
  for (const [, ps] of g.places) {
    for (const p of ps) {
      const pl = evt.place(w, provinceKey(world.provinceIds[p]!));
      const o = world.provinceOwner[p]!;
      const c = controller(world, p);
      if (o >= 0) pl.owner = g.treeId[o]!;
      else delete pl.owner;
      if (c >= 0) pl.controller = g.treeId[c]!;
      else delete pl.controller;
    }
  }
}

/**
 * The events' month (spec 9), last in the month's work: the tree runs its
 * month, the AI answers what it is asked, and the effects the game simulates land.
 */
export function monthlyEvents(world: World, news: News[]): void {
  const g = (world.events ??= createGameEvents(world));
  sync(world, g);
  const s = g.state;
  const from = s.log.length;
  evt.processMonth(s, g.rng);
  // The AI takes up a decision as soon as it is offered (spec 12): it picks by the same weights.
  for (const p of [...s.pending]) {
    if (p.controller && s.world.countries[p.controller]?.human) continue;
    const ev = s.events[p.event]!;
    evt.answer(s, ev, p.roles, evt.chooseForAi(s, ev, p.roles, g.rng).id);
  }
  land(world, g, s.log.slice(from), news);
}

/** The player answers an event or decision waiting for them (AnswerEvent). */
export function answerEvent(world: World, nation: number, event: string, option: string, news: News[]): string | null {
  const g = world.events;
  if (!g) return "no event waits for an answer";
  const s = g.state;
  const p = s.pending.find((x) => x.event === event && x.controller === g.treeId[nation]);
  if (!p) return "no such event waits for you";
  const ev = s.events[event]!;
  if (!evt.visibleOptions(s, ev, p.roles).some((o) => o.id === option)) return "that choice is not open to you";
  sync(world, g);
  const from = s.log.length;
  evt.answer(s, ev, p.roles, option);
  land(world, g, s.log.slice(from), news);
  return null;
}

const label = (key: string, fallback: string): string => data.localization[key] ?? fallback;
const humanize = (id: string): string => id.replace(/^(province|area|region):/, "").replace(/_/g, " ");
export const eventTitle = (id: string): string => label(`event.${id}.name`, humanize(id));
export const optionName = (event: string, option: string): string => label(`event.${event}.option.${option}`, humanize(option));

/** The name of a tree id: a realm's own name, an entity's, or the id in words. */
function nameOf(world: World, g: GameEvents, id: string): string {
  const n = g.nationOf.get(id);
  if (n !== undefined) return world.rules.nations[n]!.name;
  return data.entities[id] ?? humanize(id);
}

/** Realms of the game bound to an event's roles. */
function involved(g: GameEvents, roles: Record<string, string[]>): number[] {
  return [...new Set(Object.values(roles).flat().flatMap((id) => (g.nationOf.has(id) ? [g.nationOf.get(id)!] : [])))];
}

/** Lands the effects the game simulates and tells of what fired (EventFired, OptionChosen, EffectApplied). */
function land(world: World, g: GameEvents, log: evt.DomainEvent[], news: News[]): void {
  const s = g.state;
  let fired: { event: string; roles: Record<string, string[]> } | null = null;
  for (const e of log) {
    if (e.type === "EventFired") {
      fired = { event: String(e.event), roles: e.roles as Record<string, string[]> };
      const nations = involved(g, fired.roles);
      const ev = s.events[fired.event]!;
      const forPlayer = s.pending.some((p) => p.event === fired!.event && p.controller === g.treeId[world.player]);
      if (forPlayer) news.push({ kind: "event", text: `${eventTitle(ev.id)}: your answer is awaited.`, nations, ...(ev.importance === "major" ? { major: true as const } : {}) });
    } else if (e.type === "DecisionOffered" && e.controller === g.treeId[world.player]) {
      news.push({ kind: "event", text: `${eventTitle(String(e.event))}: a decision is open to you.`, nations: [world.player] });
    } else if (e.type === "OptionChosen") {
      const ev = s.events[String(e.event)]!;
      const roles = fired?.event === ev.id ? fired.roles : ([...s.world.history].reverse().find((h) => h.event === ev.id)?.roles ?? {});
      const nations = involved(g, roles);
      if (!nations.length) continue;
      const chooser = evt.controllerOf(ev, roles);
      const who = chooser ? nameOf(world, g, chooser) : "Fortune";
      noteChoice(world, chooser ? g.nationOf.get(chooser) : undefined, ev, String(e.option));
      news.push({ kind: "event", text: `${eventTitle(ev.id)}: ${who} chooses “${optionName(ev.id, String(e.option))}”.`, nations, ...(ev.importance === "major" ? { major: true as const } : {}) });
    } else if (e.type === "EffectApplied") landEffect(world, g, e, news);
  }
}

function landEffect(world: World, g: GameEvents, e: evt.DomainEvent, news: News[]): void {
  const v = e.values as Record<string, unknown>;
  const target = e.target as string | undefined;
  const n = target === undefined ? undefined : g.nationOf.get(target);
  switch (e.effect) {
    case "transfer": {
      const p = world.provinceIndex.get(String(target).replace(/^g:/, ""));
      const to = g.nationOf.get(String(v.to));
      if (p !== undefined && to !== undefined) cedeProvince(world, p, to, news);
      return;
    }
    case "annex": {
      const who = g.nationOf.get(String(v.who));
      if (n === undefined || who === undefined) return;
      const quiet: News[] = [];
      for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) cedeProvince(world, p, who, quiet);
      news.push({ kind: "destroyed", text: `${world.rules.nations[who]!.name} annexes ${world.rules.nations[n]!.name}.`, nations: [who, n] });
      return;
    }
    case "stat": {
      if (n === undefined || v.routed) return;
      const stat = String(v.stat);
      const delta = Number(v.after) - Number(v.before);
      const gold = typeof v.change === "number" ? v.change * world.rules.defines.works.goldScale : delta;
      if (stat === "treasury") world.nationTreasury[n]! += gold;
      else if (stat === "debt") world.nationDebt[n] = Math.max(0, world.nationDebt[n]! + gold);
      else if (ADJUSTED.has(stat)) {
        const adj = (g.adjust[target!] ??= {});
        adj[stat] = (adj[stat] ?? 0) + delta;
      }
      return;
    }
    case "relation":
    case "vassalize": {
      const other = String(v.other ?? v.who);
      const type = e.effect === "vassalize" ? "subject" : String(v.type);
      g.eventRelations = g.eventRelations.filter((r) => !(r.who === target && r.other === other && r.type === type));
      if (v.set !== false) g.eventRelations.push({ who: target!, other, type });
      return;
    }
  }
}

// ---------------------------------------------------------------- the event card

export interface EventCard {
  event: string;
  title: string;
  /** What happened in history, from the tree's summary. */
  text: string;
  /** Year it happened in history, if dated. */
  year: number | null;
  major: boolean;
  /** "fired": it happened and needs an answer; "offered": a decision the realm may take. */
  kind: "fired" | "offered";
  /** What happens whatever is chosen. */
  always: string[];
  options: { id: string; name: string; historical: boolean; effects: string[] }[];
}

/** The events waiting for a realm's answer, oldest first (EVT-044). */
export function eventCards(world: World, n: number): EventCard[] {
  const g = world.events;
  if (!g || n < 0) return [];
  const s = g.state;
  const me = g.treeId[n];
  return s.pending
    .filter((p) => p.controller === me)
    .sort((a, b) => a.at - b.at)
    .map((p) => {
      const ev = s.events[p.event]!;
      const say = (list: evt.Effect[] | undefined, when = "") => (list ?? []).flatMap((x) => describe(world, g, x, p.roles, n, when) ?? []);
      const tiers = (t: evt.Effects) => [...say(t.immediate), ...say(t.long_term), ...say(t.ongoing, "While it lasts: "), ...say(t.delayed, "Later: ")];
      const date = ev.history ? Number(evt.historyStart(ev.history.date).slice(0, 4)) : NaN;
      return {
        event: ev.id,
        title: eventTitle(ev.id),
        text: label(`event.${ev.id}.desc`, ""),
        year: Number.isFinite(date) ? date : null,
        major: ev.importance === "major",
        kind: p.kind,
        always: tiers(ev.effects),
        options: evt.visibleOptions(s, ev, p.roles).map((o) => ({ id: o.id, name: optionName(ev.id, o.id), historical: o.historical === true, effects: tiers(o.effects) })),
      };
    });
}

const STAT_WORDS: Record<string, string> = { treasury: "gold", war_weariness: "war weariness", admin_capacity: "administration", tech_state: "statecraft", tech_economy: "economy", tech_military: "military skill", naval_reach: "naval reach", army_strength: "army", navy_strength: "navy", disease_burden: "disease", food_security: "food", trade_access: "trade" };

/** One effect in words for the card, or null for the tree's own bookkeeping (flags, periods, unlocks). */
function describe(world: World, g: GameEvents, e: evt.Effect, roles: Record<string, string[]>, me: number, when: string): string | null {
  const [type, p] = evt.effectType(e);
  // An effect on a role no realm fills lands on no one, so it is not shown.
  let nobody = false;
  const who = (t: unknown): string => {
    const ids = typeof t === "string" && t.startsWith("$") ? roles[t.slice(1)] : Array.isArray(t) ? t.flatMap((x) => (typeof x === "string" && x.startsWith("$") ? (roles[x.slice(1)] ?? []) : [String(x)])) : [String(t)];
    if (!ids?.length) {
      nobody = true;
      return "";
    }
    const names = ids.map((id) => (g.nationOf.get(id) === me ? "you" : nameOf(world, g, id)));
    return names.length > 3 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]!;
  };
  const place = (k: unknown) => data.entities[String(k)] ?? humanize(String(k)).replace(/\b\w/g, (c) => c.toUpperCase());
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const sign = (c: unknown) => (typeof c === "number" && c > 0 ? `+${c}` : String(c));
  const maybe = e.if === undefined ? "" : " (in some cases)";
  let text: string | null = null;
  switch (type) {
    case "stat":
      text = `${cap(String(p.on).startsWith("$") || g.nationOf.has(String(p.on)) ? who(p.on) : place(p.on))}: ${Object.entries(p.changes as Record<string, unknown>).map(([k, c]) => `${STAT_WORDS[k] ?? humanize(k)} ${sign(c)}`).join(", ")}`;
      break;
    case "modifier": {
      const def = data.modifiers.find((m) => m.id === p.id);
      const years = p.years === undefined ? def?.years : Number(p.years);
      text = `${cap(String(p.on).startsWith("$") || g.nationOf.has(String(p.on)) ? who(p.on) : place(p.on))}: ${humanize(String(p.id))}${years ? ` for ${years} years` : ""}`;
      break;
    }
    case "transfer":
      text = `${cap(place(p.where))} passes to ${who(p.to)}`;
      break;
    case "annex":
      text = `${cap(who(p.who))} ${who(p.who) === "you" ? "annex" : "annexes"} ${who(p.target)}`;
      break;
    case "vassalize":
      text = `${cap(who(p.target))} ${who(p.target) === "you" ? "become" : "becomes"} a subject of ${who(p.who)}`;
      break;
    case "release":
      text = `${cap(who(p.target))} ${who(p.target) === "you" ? "are" : "is"} released by ${who(p.who)}`;
      break;
    case "create_country":
      text = `${nameOf(world, g, String(p.entity))} is founded`;
      break;
    case "war":
      text = `War: ${who(p.attackers)} against ${who(p.defenders)}`;
      break;
    case "peace":
      text = "Peace is made";
      break;
    case "casus_belli":
      text = `${cap(who(p.who))} gain${who(p.who) === "you" ? "" : "s"} a reason for war against ${who(p.against)}`;
      break;
    case "relation":
      text = `${cap(who(p.who))} and ${who(p.other)}: ${humanize(String(p.type))}${p.set === false ? " ends" : ""}`;
      break;
    case "rebels":
      text = `Rebels rise in ${place(String(p.on).startsWith("$") ? who(p.on) : p.on)}`;
      break;
    case "spread":
      text = `${cap(humanize(String(p.id)))} spreads in ${place(p.where)}`;
      break;
    case "population":
      text = `People of ${place(p.on)}: ${String(p.change)}`;
      break;
    case "move_population":
      text = `${cap(humanize(String(p.group)))} are moved to ${place(p.to)}`;
      break;
    case "colony":
      text = `${cap(who(p.who))}: a colony in ${place(p.where)}`;
      break;
    case "government":
    case "religion":
      text = `${cap(who(p.on))}: ${type} becomes ${humanize(String(p.set))}`;
      break;
    case "trade_route":
      text = `Trade route ${place(p.from_hub ?? p.from)} to ${place(p.to_hub ?? p.to)} ${p.open === false ? "closes" : "opens"}`;
      break;
  }
  return text === null || nobody ? null : `${when}${text}${maybe}`;
}

// ---------------------------------------------------------------- saves

/** What a save keeps of the event tree: its world and clock, the dice and the bridge's own records (not the data). */
export type SavedEvents = Omit<evt.EventState, "rules" | "events" | "ages" | "periods" | "log" | "conditions" | "effects" | "mayRefire" | "lean"> & {
  rng: number[];
  eventRelations: GameEvents["eventRelations"];
  /** The game's own adjustments ("adjust" would read as map adjacency to the save checks). */
  shifts: GameEvents["adjust"];
};

export function saveEvents(world: World): SavedEvents | undefined {
  const g = world.events;
  if (!g) return undefined;
  const { rules: _r, events: _e, ages: _a, periods: _p, log: _l, conditions: _c, effects: _f, mayRefire: _m, lean: _n, ...kept } = g.state;
  return { ...kept, rng: [...g.rng.state], eventRelations: g.eventRelations, shifts: g.adjust };
}

/** Puts a saved event tree back on a restored world; a save from before events keeps the fresh 1444 tree. */
export function restoreEvents(world: World, saved: SavedEvents): void {
  const g = createGameEvents(world);
  const { rng, eventRelations, shifts, ...state } = saved;
  Object.assign(g.state, state);
  g.rng = new Rng(Uint32Array.from(rng));
  g.eventRelations = eventRelations;
  g.adjust = shifts;
  world.events = g;
}
