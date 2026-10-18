import * as nv from "./domain/naval/index.ts";
import * as wf from "./domain/warfare/index.ts";
import * as rel from "./domain/diplomacy/relations.ts";
import type { World } from "./world.ts";
import { atWar, type News } from "./war.ts";
import { inAnyWar } from "./lords.ts";
import { addCommander } from "./recruit.ts";
import { personName, mix } from "./names.ts";
import { Rng } from "./rng.ts";
import { realmStrengths } from "./realmStrengths.ts";
import { allExplorers, blockaded, carriesOf, dockRight, fightsOf, fleetStrength, isPort, newShip, planVoyage, type FreeFleet, type NavyFleet } from "./navy.ts";

/**
 * Fleets for hire (F-115, naval spec "Hired fleets"): free fleets of the
 * age's groups gather in the seas they sailed, as free companies do on land,
 * and sea powers at peace lend an idle fleet of their own for gold. A hired
 * fleet sails to the hirer's nearest port under its own captain, costs its
 * contract every month, and leaves when dismissed or unpaid; a lent fleet
 * goes home when its realm goes to war.
 */

const C = nv.navalConfig;
const G = C.game;
const H = C.hiredFleets;

export type HireOrder =
  /** Hire a free fleet (its id) or a realm's lent fleet (that fleet's id). */
  | { type: "navy"; do: "hire"; free?: number; lent?: number }
  /** End a hired fleet's contract: it sails off, or home to the realm that lent it. */
  | { type: "navy"; do: "dismiss"; fleet: number };

/** A fleet a realm can hire now: where it lies, the port it would sail to and the days, and its pay. */
export interface FleetOffer {
  /** The free fleet's id, or -1. */
  free: number;
  /** The lent fleet's id, or -1. */
  lent: number;
  /** The lending realm, -1 for a free fleet. */
  from: number;
  group: string;
  name: string;
  captain: string;
  skills: { might: number; cunning: number; logistics: number };
  at: number;
  ships: string[];
  fights: number;
  carries: number;
  crew: number;
  port: number;
  days: number;
  path: number[];
  pay: number;
}

/** Gold a month for these ships under contract: their upkeep and their crews' wages at sea, times the multiplier. */
export function fleetPay(ships: readonly string[], multiplier: number): number {
  const base = ships.reduce((t, type) => t + nv.shipRow(type).upkeep * G.goldScale + nv.shipRow(type).crew * C.wageAtSea * G.wageScale, 0);
  return Math.round(base * multiplier * 100) / 100;
}

const levelOf = (world: World, n: number): string | null => {
  const a = realmStrengths(world.nationIds[n]!).assessments;
  if (!a.length) return null;
  const l = a.find((x) => x.dimension === "naval_capability")?.level;
  return !l || l === "unknown" ? "moderate" : l;
};

/** The zones each group gathers in: sea (not ocean) zones beside a coast, whose name starts with one of its seas. */
const zoneCache = new WeakMap<World, Map<string, number[]>>();
function gatherZones(world: World, group: (typeof H.groups)[number]): number[] {
  let m = zoneCache.get(world);
  if (!m) zoneCache.set(world, (m = new Map()));
  let z = m.get(group.group);
  if (!z) {
    z = [];
    for (let p = 0; p < world.provinceCount; p++) {
      if (!world.provinceWater[p] || world.navy.ocean[p] || world.navy.coastDist[p] !== 0) continue;
      const name = world.rules.provinces[p]!.name;
      if (group.seas.some((s) => name.startsWith(s))) z.push(p);
    }
    m.set(group.group, z);
  }
  return z;
}

/** A new free fleet of one of the age's groups, its ships drawn within the group's ranges. */
function newFreeFleet(world: World, rng: Rng): FreeFleet | null {
  const v = world.navy;
  const taken = new Set([...v.forHire.map((x) => x.name), ...v.fleets.filter((f) => f.hire && f.hire.from < 0).map((f) => f.hire!.name)]);
  const groups = H.groups.filter((g) => gatherZones(world, g).length && g.names.some((x) => !taken.has(x)));
  if (!groups.length) return null;
  const pick = <T,>(xs: readonly T[]): T => xs[rng.int(xs.length)]!;
  const g = pick(groups);
  const ships: string[] = [];
  for (const [type, range] of Object.entries(g.ships as Record<string, number[]>)) {
    const count = range[0]! + rng.int(range[1]! - range[0]! + 1);
    for (let i = 0; i < count; i++) ships.push(type);
  }
  if (!ships.length) ships.push(Object.keys(g.ships)[0]!);
  const skill = () => 1 + rng.int(H.captainSkillMax);
  return { id: ++v.hireSeq, group: g.group, name: pick(g.names.filter((x) => !taken.has(x))), captain: pick(g.captains), skills: [skill(), skill(), skill()], at: pick(gatherZones(world, g)), ships };
}

/** Each month some free fleets move on and new ones gather, until the age's number are for hire. */
export function refreshFreeFleets(world: World): void {
  const v = world.navy;
  const rng = new Rng(mix(world.weatherSeed ^ 0x5eaf1ee7, v.hireSeq * 7919 + world.day));
  v.forHire = v.forHire.filter(() => rng.next() >= H.moveOnChance);
  while (v.forHire.length < H.forHire) {
    const f = newFreeFleet(world, rng);
    if (!f) break;
    v.forHire.push(f);
  }
}

/** A fleet of these ships for realm n lying at `at`, to plan a voyage with. */
function probe(n: number, at: number, ships: readonly string[]): NavyFleet {
  return {
    id: -1, owner: n, at, route: [], progress: 0, admiral: -1, army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false,
    ships: ships.map((type) => ({ id: 0, type, crew: nv.shipRow(type).crew, hull: 0, supply: nv.fullSupply(type), damage: 0, wear: 0, age: 0, home: -1 })),
  };
}

/** A port of realm n a hired fleet can put into: its own, held, not blockaded. */
const homePort = (world: World, n: number, p: number): boolean =>
  world.provinceOwner[p] === n && world.provinceOccupier[p]! < 0 && isPort(world, p) && !blockaded(world, p);

/** The quickest voyage from `at` to a port of realm n, within reach, or null. */
function voyageHome(world: World, n: number, at: number, ships: readonly string[]): { port: number; days: number; path: number[] } | null {
  const plan = planVoyage(world, probe(n, at, ships), (p) => homePort(world, n, p), { knownWaters: true });
  if (!plan || plan.days > H.reachDays) return null;
  return { port: plan.path.at(-1)!, days: Math.round(plan.days), path: plan.path };
}

/** The realm's best warship fleet idle in one of its own ports, which it may lend: none while it fights or is out of the sea powers. */
function lendable(world: World, lender: number, hirer: number): NavyFleet | null {
  if (lender === hirer || world.nationGone[lender] || lender === world.player) return null;
  const level = levelOf(world, lender);
  if (!level || !H.lenderLevels.includes(level)) return null;
  if (inAnyWar(world, lender) || atWar(world, lender, hirer)) return null;
  const g = world.diplomacy.graph;
  const a = world.nationIds[lender]!;
  const b = world.nationIds[hirer]!;
  if (["rival", "hostile"].includes(rel.stance(g, a, b)) || ["rival", "hostile"].includes(rel.stance(g, b, a))) return null;
  let best: NavyFleet | null = null;
  for (const f of world.navy.fleets) {
    if (f.owner !== lender || f.hire || f.route.length || f.battle >= 0 || f.army >= 0 || allExplorers(f)) continue;
    if (world.provinceWater[f.at] || world.provinceOwner[f.at] !== lender) continue;
    if (f.ships.filter((s) => nv.isWarship(s.type)).length < H.lenderMinWarships) continue;
    if (!best || fleetStrength(f) > fleetStrength(best)) best = f;
  }
  return best;
}

/** A lent fleet's captain: one of the lender's people, the same for the same fleet. */
function lentCaptain(world: World, lender: number, f: NavyFleet): { name: string; skills: FleetOffer["skills"] } {
  const rng = new Rng(mix(world.weatherSeed ^ 0x1e9d, f.id * 31 + lender));
  const capital = world.rules.provinces[world.provinceIndex.get(world.rules.nations[lender]!.capital)!]?.name ?? "";
  const skill = () => 1 + rng.int(H.captainSkillMax);
  return { name: personName(world.rules, lender, rng.int(1 << 30), capital), skills: { might: skill(), cunning: skill(), logistics: skill() } };
}

const sum = (ships: readonly string[], f: (t: string) => number) => ships.reduce((t, x) => t + f(x), 0);

function offer(world: World, o: Omit<FleetOffer, "fights" | "carries" | "crew" | "port" | "days" | "path">, n: number): FleetOffer | null {
  const trip = voyageHome(world, n, o.at, o.ships);
  if (!trip) return null;
  return { ...o, fights: sum(o.ships, fightsOf), carries: sum(o.ships, carriesOf), crew: sum(o.ships, (t) => nv.shipRow(t).crew), ...trip };
}

/** Every fleet realm n can hire now, free fleets first, cheapest first within each. */
const offerCache = new WeakMap<World, { key: string; offers: FleetOffer[] }>();
export function fleetOffers(world: World, n: number): FleetOffer[] {
  if (n < 0 || world.nationGone[n]) return [];
  const v = world.navy;
  const key = `${n}|${world.day}|${world.step}|${v.hireSeq}|${v.seq}|${v.fleets.length}|${v.forHire.length}|${world.diplomacy.wars.length}`;
  const hit = offerCache.get(world);
  if (hit && hit.key === key) return hit.offers;
  const out: FleetOffer[] = [];
  let anyPort = false;
  for (let p = 0; p < world.provinceCount && !anyPort; p++) anyPort = homePort(world, n, p);
  if (anyPort) {
    for (const x of v.forHire) {
      const o = offer(world, { free: x.id, lent: -1, from: -1, group: x.group, name: x.name, captain: x.captain, skills: { might: x.skills[0], cunning: x.skills[1], logistics: x.skills[2] }, at: x.at, ships: x.ships, pay: fleetPay(x.ships, H.payMultiplier) }, n);
      if (o) out.push(o);
    }
    for (let l = 0; l < world.nationCount; l++) {
      const f = lendable(world, l, n);
      if (!f) continue;
      const ships = f.ships.map((s) => s.type);
      const c = lentCaptain(world, l, f);
      const name = world.rules.nations[l]!.name;
      const o = offer(world, { free: -1, lent: f.id, from: l, group: name, name: `The ${name} fleet`, captain: c.name, skills: c.skills, at: f.at, ships, pay: fleetPay(ships, H.lentPayMultiplier) }, n);
      if (o) out.push(o);
    }
  }
  out.sort((a, b) => Number(a.from >= 0) - Number(b.from >= 0) || a.pay - b.pay);
  offerCache.set(world, { key, offers: out });
  return out;
}

/** Why realm n can't hire this offer now, or null. */
export function whyNotHire(world: World, n: number, o: FleetOffer): string | null {
  if (world.nationTreasury[n]! < o.pay) return "not enough gold for the first month";
  return null;
}

export function hiredFleetOrder(world: World, o: HireOrder, n: number, news: News[]): string | null {
  return o.do === "hire" ? hireFleet(world, n, o, news) : dismissFleet(world, n, o.fleet, news);
}

/**
 * Hire a fleet: its first month's pay now (to the lender, for a lent fleet);
 * it becomes the realm's where it lies, under its own captain, and sails for
 * the realm's nearest port (F-115).
 */
export function hireFleet(world: World, n: number, o: { free?: number; lent?: number }, news: News[]): string | null {
  const offers = fleetOffers(world, n);
  const x = o.free !== undefined ? offers.find((y) => y.free === o.free) : o.lent !== undefined ? offers.find((y) => y.lent === o.lent) : undefined;
  if (!x) return "that fleet is not for hire to you";
  const why = whyNotHire(world, n, x);
  if (why) return why;
  const v = world.navy;
  world.nationTreasury[n] = world.nationTreasury[n]! - x.pay;
  const captain = addCommander(world, n, wf.newCommander(x.captain, { ...x.skills, origin: "a hired captain" }));
  let f: NavyFleet;
  if (x.free >= 0) {
    v.forHire = v.forHire.filter((y) => y.id !== x.free);
    const rng = new Rng(mix(world.weatherSeed ^ 0x0a6e, x.free));
    f = { id: ++v.seq, owner: n, at: x.at, route: [], progress: 0, admiral: -1, ships: x.ships.map((t) => ({ ...newShip(world, t, nv.shipRow(t).crew, -1), age: rng.int(16) })), army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false };
    v.fleets.push(f);
  } else {
    f = v.fleets.find((y) => y.id === x.lent)!;
    f.owner = n;
    world.nationTreasury[x.from] = world.nationTreasury[x.from]! + x.pay;
  }
  f.admiral = captain;
  f.hire = { name: x.name, group: x.group, from: x.from, pay: x.pay, captain };
  f.route = x.path.slice();
  f.progress = 0;
  f.landAt = -1;
  f.fleeing = false;
  offerCache.delete(world);
  if (n === world.player || x.from === world.player) {
    news.push({ kind: "raised", text: `${x.name} (${x.ships.length} ship${x.ships.length === 1 ? "" : "s"} under ${x.captain}) is hired for ${x.pay.toFixed(1)} gold a month; it reaches ${world.rules.provinces[x.port]!.name} in ${x.days} days.`, nations: x.from >= 0 ? [n, x.from] : [n], province: x.port });
  }
  return null;
}

export function dismissFleet(world: World, n: number, id: number, news: News[]): string | null {
  const f = world.navy.fleets.find((x) => x.id === id);
  if (!f || f.owner !== n || !f.hire) return "no such hired fleet of yours";
  if (f.army >= 0) return "put the army aboard ashore first";
  if (f.battle >= 0) return "not while it fights";
  release(world, f, news, "dismissed");
  return null;
}

/** A hired fleet's contract ends: its captain leaves; a free fleet sails off the map, a lent one goes home to its realm. */
function release(world: World, f: NavyFleet, news: News[], why: "dismissed" | "unpaid" | "called home"): void {
  const v = world.navy;
  const h = f.hire!;
  const hirer = f.owner;
  if (h.captain >= 0) world.commanderOwner[h.captain] = -1;
  const lender = h.from >= 0 && !world.nationGone[h.from] ? h.from : -1;
  delete f.hire;
  f.admiral = -1;
  f.landAt = -1;
  f.fleeing = false;
  f.progress = 0;
  f.route = [];
  if (lender < 0) {
    v.fleets.splice(v.fleets.indexOf(f), 1);
  } else {
    f.owner = lender;
    const plan = planVoyage(world, f, (p) => dockRight(world, lender, p) === "food", { knownWaters: true });
    if (plan) f.route = plan.path;
    else {
      // No way home by sea: it is back in the lender's best port at once.
      let port = -1;
      for (let p = 0; p < world.provinceCount && port < 0; p++) if (homePort(world, lender, p)) port = p;
      if (port >= 0) f.at = port;
      else v.fleets.splice(v.fleets.indexOf(f), 1);
    }
  }
  offerCache.delete(world);
  if (hirer === world.player || lender === world.player) {
    const text = why === "unpaid" ? `${h.name} leaves your service: the treasury can't pay it.` : why === "called home" ? `${h.name} is called home by ${h.group}.` : `${h.name} is dismissed and sails off.`;
    news.push({ kind: "refused", text, nations: lender >= 0 ? [hirer, lender] : [hirer] });
  }
}

/**
 * The month's contracts, after the treasury has closed: unpaid fleets leave,
 * lent fleets whose realm goes to war (or to war with the hirer) go home,
 * free fleets move on and gather, and AI realms at war hire.
 */
export function monthlyHiredFleets(world: World, news: News[]): void {
  for (const f of world.navy.fleets.slice()) {
    if (!f.hire) continue;
    const h = f.hire;
    const unpaid = world.nationTreasury[f.owner]! < 0;
    const called = h.from >= 0 && (world.nationGone[h.from] || atWar(world, f.owner, h.from) || inAnyWar(world, h.from));
    if (!unpaid && !called) continue;
    // It goes once its army is ashore and its battle is over.
    if (f.army >= 0 || f.battle >= 0) {
      h.leaving = true;
      continue;
    }
    release(world, f, news, unpaid ? "unpaid" : "called home");
  }
  refreshFreeFleets(world);
  aiHire(world, news);
}

/** At war and outgunned at sea, an AI realm with a port hires the cheapest free fleet that can reach it, keeping a reserve; one at a time. */
function aiHire(world: World, news: News[]): void {
  if (!world.navy.forHire.length || !world.diplomacy.wars.length) return;
  const strength = new Float64Array(world.nationCount);
  const hired = new Uint8Array(world.nationCount);
  for (const f of world.navy.fleets) {
    strength[f.owner] = strength[f.owner]! + fleetStrength(f);
    if (f.hire) hired[f.owner] = 1;
  }
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || world.nationGone[n] || hired[n] || !inAnyWar(world, n)) continue;
    let enemy = 0;
    for (let e = 0; e < world.nationCount; e++) if (strength[e]! > enemy && atWar(world, n, e)) enemy = strength[e]!;
    if (enemy <= strength[n]!) continue;
    const pick = fleetOffers(world, n).find((o) => o.from < 0 && world.nationTreasury[n]! >= G.ai.reserveGold + o.pay * H.aiReserveMonths);
    if (pick) hireFleet(world, n, { free: pick.free }, news);
  }
}

// ---------------------------------------------------------------- the view

export interface FleetOfferView {
  free: number;
  lent: number;
  from: number;
  group: string;
  name: string;
  captain: string;
  skills: { might: number; cunning: number; logistics: number };
  at: number;
  ships: { type: string; count: number }[];
  fights: number;
  carries: number;
  crew: number;
  port: number;
  days: number;
  pay: number;
  why: string | null;
}

/** The player's offers, for the Hire a fleet screen. */
export function fleetOffersView(world: World, n: number): FleetOfferView[] {
  return fleetOffers(world, n).map((o) => {
    const ships = new Map<string, number>();
    for (const t of o.ships) ships.set(t, (ships.get(t) ?? 0) + 1);
    return { free: o.free, lent: o.lent, from: o.from, group: o.group, name: o.name, captain: o.captain, skills: o.skills, at: o.at, ships: [...ships].map(([type, count]) => ({ type, count })), fights: o.fights, carries: o.carries, crew: o.crew, port: o.port, days: o.days, pay: o.pay, why: whyNotHire(world, n, o) };
  });
}
