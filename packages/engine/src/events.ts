import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };
import bridge from "../../rules/data/domain/events-places.json" with { type: "json" };
import rules from "../../rules/data/domain/events.json" with { type: "json" };
import geography from "../../rules/data/domain/exploration-regions.json" with { type: "json" };
import west from "../../rules/data/domain/events-bridge-west.json" with { type: "json" };
import * as evt from "./domain/events/index.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as subj from "./domain/subjects/index.ts";
import { bondOf, bondsChanged, makeSubject, monthNow, subjectTies } from "./subjects.ts";
import { Rng } from "./rng.ts";
import { stabilityOf } from "./stability.ts";
import { cedeProvince, controller, type News } from "./war.ts";
import { spareSleepers, wakeRealm, type Waking } from "./sleeping.ts";
import type { World } from "./world.ts";
import { noteChoice } from "./achievements.ts";
import { traitLean } from "./rulers.ts";
import { faithOf, headEventChosen, isHeadPatron, setHeadPatron } from "./faithHeads.ts";
import { spark } from "./rebels.ts";

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
/** A region's bridge events of 1378 to 1444, with the places, names and words they bring (EVT-085). */
type Bridge = { events: Record<string, evt.EventDef>; places: Record<string, string[]>; entities: Record<string, string>; localization: Record<string, string> };
const BRIDGES = [west] as unknown as Bridge[];
const base = campaign as unknown as Campaign;
const data: Campaign = {
  ...base,
  events: Object.assign({}, base.events, ...BRIDGES.map((b) => b.events)),
  entities: Object.assign({}, base.entities, ...BRIDGES.map((b) => b.entities)),
  localization: Object.assign({}, base.localization, ...BRIDGES.map((b) => b.localization)),
};
/** The bridge events' ids, which a later start counts as history (EVT-087). */
const BRIDGE_EVENTS = new Set(BRIDGES.flatMap((b) => Object.keys(b.events)).filter((id) => !(id in base.events)));
const PLACES: Record<string, string[]> = Object.assign({}, bridge.places, ...BRIDGES.map((b) => b.places));

/** Statistics the game reads live; an event's change to one is kept as an adjustment on top. */
const ADJUSTED = new Set(["legitimacy", "stability", "tech_state", "tech_economy", "tech_military"]);
const TECH = ["tech_state", "tech_economy", "tech_military"] as const;
/** Tree innovations and the research inventions that bring them (D-EVT-19). */
const INNOVATIONS = Object.entries(rules.innovations_from_research).filter(([k]) => k !== "$comment") as [string, string][];

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
  /** Each map realm's region for `where` limits (D-EVT-17): the tree's own, else its nearest neighbour's. */
  regions: (string | undefined)[];
}

/**
 * Regions of the map's realms: the tree's polity regions where it knows the
 * realm, else the region of the nearest capital it knows (a stand-in until
 * every map realm has one, D-EVT-17).
 */
function realmRegions(world: World, treeId: string[]): (string | undefined)[] {
  const polities = geography.polities_1444 as Record<string, string>;
  const at = (n: number) => world.rules.provinces[world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1];
  const known = treeId.map((id, n) => (world.rules.nations[n]!.asleep ? undefined : polities[id]));
  return known.map((r, n) => {
    if (r || world.rules.nations[n]!.asleep) return r;
    const me = at(n);
    if (!me) return undefined;
    let best: string | undefined;
    let dist = Infinity;
    known.forEach((k, m) => {
      const p = at(m);
      if (!k || !p) return;
      const d = Math.hypot((p.x ?? 0) - (me.x ?? 0), (p.y ?? 0) - (me.y ?? 0));
      if (d < dist) [dist, best] = [d, k];
    });
    return best;
  });
}

/** A realm's region now: its own, or for a woken realm that of whoever held its capital in 1444. */
function regionOf(world: World, g: GameEvents, n: number): string | undefined {
  if (!world.rules.nations[n]!.asleep) return g.regions[n];
  const cap = world.rules.provinces[world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1];
  const was = cap?.owner ? world.nationIndex.get(cap.owner) : undefined;
  return was === undefined ? undefined : g.regions[was];
}

const provinceKey = (p: string) => `g:${p}`;

/** The events of the tree, the bridge's aliases and places, set up for a new game. */
export function createGameEvents(world: World): GameEvents {
  const tree = evt.emptyWorld(world.date.year, world.date.month);
  const aliases = bridge.aliases as Record<string, string>;
  // A sleeping realm is known to the tree by its own id; a woken spare by the one it took (SETUP-088).
  const treeId = world.nationIds.map((id, n) => world.rules.nations[n]!.tree?.[0] ?? aliases[id] ?? id);
  const nationOf = new Map(treeId.map((id, n) => [id, n]));
  const places = Object.entries(PLACES)
    .map(([key, ids]): [string, number[]] => [key, ids.map((id) => world.provinceIndex.get(id) ?? -1).filter((p) => p >= 0)])
    .filter(([, ps]) => ps.length > 0);
  for (const key of bridge.start.places) Object.assign(evt.place(tree, key).stats, bridge.start.place);
  for (const [key, ps] of places) {
    const pl = evt.place(tree, key);
    Object.assign(pl.stats, bridge.start.place);
    pl.provinces = ps.map((p) => provinceKey(world.provinceIds[p]!));
  }
  for (const id of treeId) evt.country(tree, id).stats = { ...bridge.start.country };
  // A sleeping realm is not yet in the world (SETUP-082).
  treeId.forEach((id, n) => world.nationAsleep[n] && (evt.country(tree, id).exists = false));
  const state = evt.newState(tree, { events: evt.campaignEvents(data.events), ages: data.ages, periods: data.periods });
  pastBridgeEvents(state, world.date.year, world.date.month);
  state.conditions = {};
  leanByTraits(world, state, nationOf);
  evt.startCampaign(state, world.date.year);
  const knownAtStart = world.nationIds.map((_, n) => world.research[n]?.known.size ?? 0);
  const g: GameEvents = { state, rng: new Rng(world.weatherSeed ^ 0x5eed), treeId, nationOf, places, eventRelations: [], adjust: {}, stability: new Map(), knownAtStart, regions: realmRegions(world, treeId) };
  state.conditions.stat = (p, w, ctx) => evt.resolve(p.who, ctx).some((id) => evt.compare(statOf(world, g, id, String(p.stat)), String(p.op), p.value as number | string));
  // Opinion is the standing one court holds of another (D-EVT-4, diplomacy's ledger), read only when asked.
  state.conditions.opinion = (p, _w, ctx) =>
    evt.resolve(p.who, ctx).some((a) => evt.resolve(p.other, ctx).some((b) => evt.compare(opinionOf(world, g, a, b), String(p.op), Number(p.value))));
  subjectConditions(world, g);
  // Whether a realm is a head's patron (RELG-154).
  state.conditions.faith_head_patron = (p, _w, ctx) => evt.resolve(p.who, ctx).some((id) => isHeadPatron(world, String(p.head), g.nationOf.get(id) ?? -1));
  sync(world, g);
  evt.yearlyAgeCheck(state, world.date.year);
  evt.periodCheck(state, world.date.year);
  // One dry look at every event while the campaign loads, so the first month of play is no slower than the rest.
  const bound = { ...state.bound };
  for (const ev of Object.values(state.events)) evt.eligible(state, ev);
  state.bound = bound;
  return g;
}

/**
 * A campaign that starts after a bridge event's history date has that history
 * already (EVT-087): the event counts as having happened, with its historical
 * option and holders, so the later events that need it can follow. Its effects
 * are not applied again: the start's own data already shows them.
 */
function pastBridgeEvents(state: evt.EventState, year: number, month: number): void {
  const start = evt.monthIndex(year, month);
  for (const id of BRIDGE_EVENTS) {
    const ev = state.events[id];
    if (!ev?.history) continue;
    const d = ev.history.date;
    const [y, m] = String(Array.isArray(d) ? d[0] : d).split("-").map(Number);
    // A date of a year alone is under way all that year.
    if (!Number.isFinite(y) || (m ? evt.monthIndex(y!, m) : evt.monthIndex(y! + 1, 1)) > start) continue;
    const option = ev.options.find((o) => o.historical)?.id;
    const roles = Object.fromEntries(Object.entries(ev.roles).map(([r, d]) => [r, [...d.historical]]));
    state.world.history.push({ event: id, year: y!, month: m || 1, roles, ...(option ? { option } : {}) });
  }
}

/** The game's own bond of the realm `subject` under `overlord` (tree ids), if both are realms and the tie stands. */
function realBond(world: World, g: GameEvents, overlord: string, subject: string): subj.SubjectBond | undefined {
  const s = g.nationOf.get(subject);
  const o = g.nationOf.get(overlord);
  if (s === undefined || o === undefined) return undefined;
  const b = bondOf(world, s);
  return b && b.overlord === world.nationIds[o] ? b : undefined;
}

/**
 * The subject keys read the game's own bonds (SUBJ-097): `subject_loyalty`
 * tests the bond's loyalty, `subject_count by_reach` weighs the realm's
 * subjects by kind, and `relation … kind` reads the bond's kind. Ids that are
 * not realms of the game keep the tree's own reading.
 */
function subjectConditions(world: World, g: GameEvents): void {
  const c = g.state.conditions!;
  const tree = evt.CONDITIONS;
  c.subject_loyalty = (p, w, ctx) =>
    evt.resolve(p.who, ctx).some((who) =>
      evt.resolve(p.target, ctx).some((t) =>
        g.nationOf.has(who) && g.nationOf.has(t) ? subj.subjectLoyaltyHolds(realBond(world, g, who, t), String(p.op), String(p.step)) : tree.subject_loyalty!({ ...p, who, target: t }, w, ctx),
      ),
    );
  c.subject_count = (p, w, ctx) => {
    if (p.by_reach !== true) return tree.subject_count!(p, w, ctx);
    return evt.resolve(p.who, ctx).some((id) => {
      const n = g.nationOf.get(id);
      if (n === undefined) return tree.subject_count!({ ...p, who: id }, w, ctx);
      const bonds = subjectTies(world).map((t) => t.bond);
      return evt.compare(subj.subjectCountByEvent(bonds, world.nationIds[n]!, true), String(p.op), Number(p.value));
    });
  };
  c.relation = (p, w, ctx) => {
    if (p.kind === undefined) return tree.relation!(p, w, ctx);
    const type = String(p.type);
    return evt.resolve(p.who, ctx).some((a) =>
      evt.resolve(p.other, ctx).some((b) => {
        if (!g.nationOf.has(a) || !g.nationOf.has(b)) return tree.relation!({ ...p, who: a, other: b }, w, ctx);
        const bond = type === "subject" ? realBond(world, g, b, a) : type === "overlord" ? realBond(world, g, a, b) : type === "personal_union" ? [realBond(world, g, b, a), realBond(world, g, a, b)].find((x) => x?.kind === "union") : undefined;
        return bond?.kind === p.kind;
      }),
    );
  };
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
  // the game's subject bonds are the truth: the tree's own copies live only for the month's effects
  delete w.subjects;
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
  // A sleeping realm has no ties to show (SETUP-082).
  const tree = (id: string) => {
    const n = world.nationIndex.get(id) ?? -1;
    return world.nationAsleep[n] ? undefined : g.treeId[n];
  };
  for (let n = 0; n < world.nationCount; n++) {
    // A sleeping realm is the tree's own until it wakes (SETUP-082).
    if (world.nationAsleep[n]) continue;
    const id = g.treeId[n]!;
    const c = evt.country(w, id);
    c.exists = !world.nationGone[n];
    const region = regionOf(world, g, n);
    if (region) c.region = region;
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
    // The innovations it has adopted include the inventions it knows (D-EVT-19).
    const known = world.research[n]?.known;
    if (known) for (const [inn, inv] of INNOVATIONS) if (known.has(inv) && !(c.innovations ??= []).includes(inn)) c.innovations.push(inn);
    // The great powers are the realms with the most provinces (D-AUD-2), so the score is the count (D-EVT-19).
    c.stats.great_power_score = held[n]!;
    // Its state faith as the tree first meets it; an event's change to it is the tree's own after (EVT-086).
    if (c.religion === undefined && faithOf(world, n)) c.religion = faithOf(world, n);
    // Its ruler: age, years on the throne (0 in a new ruler's first year), and a regent ruling for a child (EVT-086).
    const ruler = world.rulers[n];
    if (ruler) {
      c.stats.ruler_age = ruler.age;
      c.stats.ruler_years = ruler.years;
    }
    c.flags = ruler?.regent ? ["regency"] : [];
  }
  // The Emperor and the members of the Empire (EVT-086).
  const e = world.empire;
  if (e && !e.ended) {
    for (const m of e.members) {
      const id = tree(m);
      if (id) (evt.country(w, id).flags ??= []).push("empire_member");
    }
    const holder = e.holder ? tree(e.holder) : undefined;
    if (holder) (evt.country(w, holder).flags ??= []).push("emperor");
  }
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

/** Fires an event of the tree now, with its first binding of roles, if it has not fired (INST-065: `onin_war` at the break). */
export function fireEventNow(world: World, id: string, news: News[]): void {
  const g = (world.events ??= createGameEvents(world));
  sync(world, g);
  const s = g.state;
  const ev = s.events[id];
  if (!ev || s.world.history.some((h) => h.event === id)) return;
  const roles = evt.bindings(s, ev)[0] ?? {};
  const from = s.log.length;
  evt.fire(s, ev, roles, g.rng);
  land(world, g, s.log.slice(from), news);
}

/** Applies effects as an event's chosen option would, and lands them on the game (scripted history, tests). */
export function applyEventEffects(world: World, effects: evt.Effect[], news: News[], roles: Record<string, string[]> = {}): void {
  const g = (world.events ??= createGameEvents(world));
  sync(world, g);
  const s = g.state;
  const applied = evt.applyEffects(effects, s.world, { roles, ...(s.conditions ? { conditions: s.conditions } : {}), ...(s.effects ? { effects: s.effects } : {}) });
  land(world, g, applied.map((a) => ({ type: "EffectApplied", effect: a.type, target: a.target, values: a.values })), news);
}

/** Whether a condition holds for the game as it stands (scripted history, tests). */
export function eventConditionHolds(world: World, condition: evt.Condition, roles: Record<string, string[]> = {}): boolean {
  const g = (world.events ??= createGameEvents(world));
  sync(world, g);
  return evt.holds(condition, g.state.world, { roles, ...(g.state.conditions ? { conditions: g.state.conditions } : {}) });
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
      // Altan Khan's chooser is the first Dalai Lama's patron (RELG-154).
      if (chooser) headEventChosen(world, ev.id, g.nationOf.get(chooser) ?? -1, news);
      news.push({ kind: "event", text: `${eventTitle(ev.id)}: ${who} chooses “${optionName(ev.id, String(e.option))}”.`, nations, ...(ev.importance === "major" ? { major: true as const } : {}) });
    } else if (e.type === "EffectApplied") landEffect(world, g, e, news);
  }
  delete s.world.subjects;
}

/** Envoys the overlord keeps at a subject's court, recalled when the tie ends or the kind changes (as subjects.ts does on release). */
function recallSubjectEnvoys(world: World, b: subj.SubjectBond, actions: readonly string[]): void {
  const d = world.diplomacy;
  d.envoys = d.envoys.filter((e) => !(e.country === b.overlord && e.target === b.subject && actions.includes(e.action) && e.status === "resident"));
}

/** The rebellions spark an event's rising stands for, by the tree's rebel type (EVT-088). */
const REBEL_SPARKS: Record<string, string> = { peasant: "the tax rate of the province is raised", religious: "a preacher of a new faith arrives", noble: "a pretender lands with men" };

const KIND_WORDS: Record<subj.Kind, string> = { vassal: "a vassal", tributary: "a tributary", union: "a union", march: "a march", colony: "a colony", protectorate: "a protectorate" };

/**
 * An event founds a realm (SETUP-083 to SETUP-090): its sleeping realm wakes,
 * or a gone map realm wakes again, or the first spare takes the name for one
 * the list does not hold. With no `where`, the realms it is made from form it
 * (a union); with one, it takes that place's land, only from those realms when
 * it names them. A place the map does not know falls back to its home land;
 * with no land at all it stays asleep.
 */
/** A `create_country` effect as the tree hands it to the game, for the specs (EVT-077). */
export function foundByEvent(world: World, id: string, values: Record<string, unknown>, news: News[]): void {
  foundRealm(world, world.events!, id, values, news);
}

/** What the tree reads of a realm: its tree id and its region (EVT-078, EVT-079). */
export function treeView(world: World, n: number): { id: string; region: string | undefined } {
  return { id: world.events!.treeId[n]!, region: regionOf(world, world.events!, n) };
}

function foundRealm(world: World, g: GameEvents, id: string, v: Record<string, unknown>, news: News[]): void {
  let n = g.nationOf.get(id);
  if (n !== undefined && !world.nationGone[n]) return;
  const from = ((v.from as string[] | undefined) ?? []).flatMap((x) => {
    const f = g.nationOf.get(x);
    return f !== undefined && f !== n && !world.nationGone[f] ? [f] : [];
  });
  const over = v.subject_of === undefined ? undefined : g.nationOf.get(String(v.subject_of));
  const where = v.where === undefined ? undefined : g.places.find(([k]) => k === String(v.where))?.[1];
  const waking: Waking = {};
  if (v.where === undefined && from.length) waking.from = from;
  else if (where) {
    waking.provinces = from.length ? where.filter((p) => from.includes(world.provinceOwner[p]!)) : where;
    const held = from.map((f) => waking.provinces!.filter((p) => world.provinceOwner[p] === f).length);
    if (from.length) waking.breakFrom = from[held.indexOf(Math.max(...held))]!;
  } else if (n === undefined) return;
  if (over !== undefined && !world.nationGone[over]) waking.subjectOf = over;
  if (n === undefined) {
    // A realm the list does not hold takes the first spare, named for it (SETUP-088); with none left, nothing wakes.
    n = spareSleepers(world)[0];
    if (n === undefined) return;
    waking.name = nameOf(world, g, id).replace(/\b\w/g, (c) => c.toUpperCase());
    waking.tree = id;
  }
  if (!wakeRealm(world, n, waking, news)) return;
  g.treeId[n] = id;
  g.nationOf.set(id, n);
}

function landEffect(world: World, g: GameEvents, e: evt.DomainEvent, news: News[]): void {
  const v = e.values as Record<string, unknown>;
  const target = e.target as string | undefined;
  const n = target === undefined ? undefined : g.nationOf.get(target);
  switch (e.effect) {
    case "create_country":
      foundRealm(world, g, target!, v, news);
      return;
    case "faith_head_patron": {
      const who = g.nationOf.get(String(v.who ?? target));
      if (who !== undefined) setHeadPatron(world, String(v.head), who);
      return;
    }
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
    case "vassalize": {
      // an event makes a subject of the mapped kind (SUBJ-015, SUBJ-097); the game keeps the tie and its bond
      const o = g.nationOf.get(String(v.who));
      if (n !== undefined && o !== undefined) {
        if (world.nationGone[n] || world.nationGone[o]) return;
        const kind = (v.subjectKind as subj.Kind | undefined) ?? subj.kindFromEventType(String(v.kind ?? "vassal")).kind;
        const cur = bondOf(world, n);
        if (cur) return; // a subject has one overlord: the event cannot take it from another
        try {
          makeSubject(world, n, o, kind);
        } catch {
          return; // a tie the diplomacy rules refuse (a cycle of overlords)
        }
        const b = bondOf(world, n);
        if (b && v.stage) b.stage = v.stage as subj.ColonyStage;
        bondsChanged(world);
        news.push({ kind: "event", text: `${world.rules.nations[n]!.name} becomes ${KIND_WORDS[kind]} of ${world.rules.nations[o]!.name}.`, nations: [n, o] });
        return;
      }
      const other = String(v.who);
      g.eventRelations = g.eventRelations.filter((r) => !(r.who === target && r.other === other && r.type === "subject"));
      g.eventRelations.push({ who: target!, other, type: "subject" });
      return;
    }
    case "release": {
      const who = String(v.who);
      g.eventRelations = g.eventRelations.filter((r) => !(r.who === target && r.other === who && r.type === "subject") && !(r.who === who && r.other === target && r.type === "overlord"));
      const b = realBond(world, g, who, target!);
      if (!b) return;
      recallSubjectEnvoys(world, b, ["subject_resident", "subject_tighten", "subject_fold_in"]);
      dip.relations.releaseSubject(world.diplomacy.graph, b.subject);
      bondsChanged(world);
      const o = g.nationOf.get(who)!;
      news.push({ kind: "event", text: `${world.rules.nations[n!]!.name} is released by ${world.rules.nations[o]!.name} and goes free as a friend.`, nations: [n!, o] });
      return;
    }
    case "change_subject_kind": {
      const b = realBond(world, g, String(v.who), target!);
      if (!b) return;
      const r = subj.changeSubjectKindByEvent(b, String(v.kind), monthNow(world));
      if (!r.ok) return;
      recallSubjectEnvoys(world, b, ["subject_tighten", "subject_fold_in"]);
      const rec = world.diplomacy.graph.relations.find((x) => x.type === "subject" && x.source === b.subject);
      if (rec) rec.subject_kind = b.kind;
      bondsChanged(world);
      const o = g.nationOf.get(String(v.who))!;
      news.push({ kind: "event", text: `${world.rules.nations[n!]!.name} is now ${KIND_WORDS[b.kind]} of ${world.rules.nations[o]!.name}.`, nations: [n!, o] });
      return;
    }
    case "add_subject_reason":
    case "remove_subject_reason": {
      // a reason on the subject's loyalty, by id, for the months given (SUBJ-035, SUBJ-097)
      if (n === undefined) return;
      const b = bondOf(world, n);
      if (!b) return;
      if (e.effect === "add_subject_reason") subj.addSubjectReasonByEvent(b, String(v.reason), v.months === undefined ? undefined : Number(v.months), monthNow(world));
      else subj.removeSubjectReasonByEvent(b, String(v.reason));
      bondsChanged(world);
      return;
    }
    case "rebels": {
      // The event is a spark (EVT-048, EVT-088): every aggrieved province of the realm or the place may rise.
      const what = REBEL_SPARKS[String(v.type)] ?? REBEL_SPARKS.noble!;
      const ps = n !== undefined ? [...Array(world.provinceCount).keys()].filter((p) => world.provinceOwner[p] === n) : (g.places.find(([k]) => k === target)?.[1] ?? []);
      for (const p of ps) if (world.provinceGrievances[p]) spark(world, p, what);
      return;
    }
    case "relation": {
      const other = String(v.other);
      const type = String(v.type);
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
    case "change_subject_kind":
      text = `${cap(who(p.target))}: the tie to ${who(p.who)} is ${p.kind === "tighten" ? "tightened" : p.kind === "loosen" ? "loosened" : `now ${humanize(String(p.kind))}`}`;
      break;
    case "add_subject_reason":
    case "remove_subject_reason": {
      const label = subj.reasonLabel(String(p.reason));
      text = type === "remove_subject_reason" ? `${cap(who(p.target))}: “${label}” no longer weighs on loyalty` : `${cap(who(p.target))}: loyalty reason “${label}”${p.months === undefined ? "" : ` for ${Number(p.months)} months`}`;
      break;
    }
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
