import { W } from "./model.ts";

/**
 * Peace settlement scoring (spec §5.25, WAR-240 … WAR-251; Leroy X-22). Every
 * province has a demand cost; the way the war has gone gives the winning side
 * a capacity in the same points. Demands that fit are signed, and the AI
 * answers with the same counts the player sees: accept, counter with what fits,
 * or refuse. Plain numbers in, plain numbers out: deterministic, same for all.
 */

const S = W.settlement;

// ---------------------------------------------------------------- demand cost (WAR-240)

export interface ProvinceFacts {
  /** Thousands of people. */
  people: number;
  wealth: number;
  castle: boolean;
  coastal: boolean;
  river: boolean;
  /** The capital of the realm that owns it. */
  capital: boolean;
  /** It touches land of the side that asks for it. */
  bordersTaker: boolean;
}

/** What a province costs to demand: its people and wealth, a castle, coast and river, a capital, and more when it does not border the taker (WAR-240). */
export function provinceCost(f: ProvinceFacts): number {
  const c = S.province_cost;
  let cost = c.base + Math.sqrt(Math.max(0, f.people)) * c.per_sqrt_thousand_people + f.wealth * c.per_wealth;
  if (f.castle) cost += c.castle;
  if (f.coastal) cost += c.coastal;
  if (f.river) cost += c.river;
  if (f.capital) cost *= c.capital_multiplier;
  if (!f.bordersTaker) cost *= c.not_bordering_multiplier;
  return Math.max(1, Math.round(cost));
}

// ---------------------------------------------------------------- capacity (WAR-241)

/** The way the war has gone, seen from the side that asks. */
export interface WarOutcome {
  /** Demand cost of all the land of the side that would give. */
  realmValue: number;
  /** Demand cost of that land the asking side holds. */
  landHeld: number;
  /** The giving leader's capital is held by the asking side. */
  capitalHeld: boolean;
  /** Men each side has lost in this war's battles. */
  menLost: { ours: number; theirs: number };
  /** Men in the field and levies at home, each side. */
  strength: { ours: number; theirs: number };
  /** The share of the giving side's voices that say peace (WAR-180). */
  theirPeaceShare: number;
  /** The giving side has surrendered (WAR-245). */
  surrendered?: boolean;
}

export type CapacityPart = "land_held" | "capital_held" | "battles" | "armies" | "will_to_fight";

export interface Capacity {
  /** Each part's points, in a fixed order, so the screen can say where the capacity comes from. */
  parts: { part: CapacityPart; points: number }[];
  /** Points the asking side may spend on demands. */
  capacity: number;
  realmValue: number;
  surrendered: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Each part as a share from 0 to 1 (WAR-241). Battles count the dead each side lost, against what the giving side still has. */
export function capacityShares(o: WarOutcome): Record<CapacityPart, number> {
  const bled = o.menLost.theirs + o.strength.theirs;
  return {
    land_held: o.realmValue > 0 ? clamp01(o.landHeld / o.realmValue) : 0,
    capital_held: o.capitalHeld ? 1 : 0,
    battles: bled > 0 ? clamp01((o.menLost.theirs - o.menLost.ours) / bled) : 0,
    armies: o.strength.ours > 0 ? clamp01(1 - o.strength.theirs / o.strength.ours) : 0,
    will_to_fight: clamp01(o.theirPeaceShare),
  };
}

/** What the war has won: land held, the capital and battles. Armies and the will to fight only weigh what was won (WAR-241). */
const WON: CapacityPart[] = ["land_held", "capital_held", "battles"];

/**
 * The capacity (WAR-241): the realm's value times what was won (each part's
 * share times its weight), raised by the asking side's edge in armies and the
 * giving side's will to make peace; never more than the whole realm. Nothing
 * won, nothing to ask. A surrender opens the whole realm (WAR-246).
 */
export function capacityOf(o: WarOutcome): Capacity {
  const shares = capacityShares(o);
  const w = S.capacity_weights;
  const won = WON.reduce((t, p) => t + w[p] * shares[p], 0);
  const press = 1 + w.armies * shares.armies + w.will_to_fight * shares.will_to_fight;
  const tenth = (x: number) => Math.floor(x * 10) / 10;
  const parts = (Object.keys(w) as CapacityPart[]).map((part) => ({
    part,
    points: tenth(o.realmValue * (WON.includes(part) ? w[part] * shares[part] : won * w[part] * shares[part])),
  }));
  const sum = Math.floor(o.realmValue * won * press);
  const surrendered = o.surrendered === true;
  return { parts, capacity: surrendered ? o.realmValue : Math.min(o.realmValue, sum), realmValue: o.realmValue, surrendered };
}

// ---------------------------------------------------------------- demands (WAR-242 … WAR-244)

/** A province that may be demanded: one the asking side holds (WAR-184), with its cost and the realm that owns it. */
export interface Candidate {
  province: number;
  realm: number;
  cost: number;
}

export interface Demand {
  provinces: number[];
  gold: number;
}

export interface Limits {
  /** The most provinces each giving realm may cede in one peace (WAR-227). */
  mostPerRealm: Map<number, number>;
  /** The most gold the payer has (WAR-184). */
  maxGold: number;
}

/** Points a sum of gold costs: one point for every `gold_per_point`, rounded up. */
export const goldCost = (gold: number): number => Math.ceil(Math.max(0, gold) / S.gold_per_point);
/** Gold that a number of points buys. */
export const goldFor = (points: number): number => Math.max(0, Math.floor(points)) * S.gold_per_point;

/** The cost of a demand: its provinces plus its gold (WAR-242). */
export function demandCost(d: Demand, candidates: Candidate[]): number {
  const cost = new Map(candidates.map((c) => [c.province, c.cost]));
  return d.provinces.reduce((t, p) => t + (cost.get(p) ?? 0), 0) + goldCost(d.gold);
}

/** Why a demand may not be asked at all, whatever the capacity (WAR-242): a province not on the table, too many from one realm, more gold than they have. */
export function whyNotTerms(d: Demand, candidates: Candidate[], limits: Limits): string | null {
  const byProvince = new Map(candidates.map((c) => [c.province, c]));
  const count = new Map<number, number>();
  if (new Set(d.provinces).size !== d.provinces.length) return "a province is named twice";
  for (const p of d.provinces) {
    const c = byProvince.get(p);
    if (!c) return "you may only ask for land your side holds";
    count.set(c.realm, (count.get(c.realm) ?? 0) + 1);
  }
  for (const [realm, n] of count) if (n > (limits.mostPerRealm.get(realm) ?? 0)) return `one peace may take at most ${limits.mostPerRealm.get(realm) ?? 0} of their provinces`;
  if (d.gold < 0 || d.gold > limits.maxGold) return "they have not that much gold";
  if (!d.provinces.length && d.gold <= 0) return "ask for at least one province or some gold";
  return null;
}

/**
 * The most a capacity buys, as the AI would choose it (WAR-244): the dearest
 * provinces first that still fit, at most the limit from each realm, ties by
 * province; whatever is left buys gold up to what they have.
 */
export function bestDemand(candidates: Candidate[], capacity: number, limits: Limits, among?: number[]): Demand {
  const only = among ? new Set(among) : null;
  const sorted = candidates.filter((c) => !only || only.has(c.province)).sort((a, b) => b.cost - a.cost || a.province - b.province);
  const taken = new Map<number, number>();
  const provinces: number[] = [];
  let left = capacity;
  for (const c of sorted) {
    if (c.cost > left || (taken.get(c.realm) ?? 0) >= (limits.mostPerRealm.get(c.realm) ?? 0)) continue;
    provinces.push(c.province);
    taken.set(c.realm, (taken.get(c.realm) ?? 0) + 1);
    left -= c.cost;
  }
  return { provinces, gold: Math.min(limits.maxGold, goldFor(left)) };
}

export type Answer = { answer: "accept" } | { answer: "counter"; counter: Demand } | { answer: "reject" };

/**
 * How the giving side answers a demand (WAR-243): it signs what fits the
 * capacity; when it does not fit, it offers the most of the asked provinces
 * that fit, and as much of the asked gold as is left; when nothing fits, it
 * refuses.
 */
export function answerDemand(d: Demand, candidates: Candidate[], capacity: Capacity, limits: Limits): Answer {
  if (demandCost(d, candidates) <= capacity.capacity) return { answer: "accept" };
  const fit = bestDemand(candidates, capacity.capacity, { ...limits, maxGold: 0 }, d.provinces);
  const left = capacity.capacity - demandCost(fit, candidates);
  const counter = { provinces: fit.provinces, gold: Math.min(d.gold, goldFor(left)) };
  return counter.provinces.length || counter.gold > 0 ? { answer: "counter", counter } : { answer: "reject" };
}

// ---------------------------------------------------------------- surrender (WAR-245)

/**
 * A side is beaten when it can no longer reasonably fight on: most of its
 * voices say peace, its strength is a small part of the enemy's, and the enemy
 * holds its capital or much of its land (WAR-245).
 */
export function beaten(o: WarOutcome): boolean {
  const s = S.surrender;
  const weak = o.strength.theirs <= o.strength.ours * s.army_ratio;
  const land = o.capitalHeld || (o.realmValue > 0 && o.landHeld / o.realmValue >= s.land_share);
  return o.theirPeaceShare >= s.peace_share && weak && land;
}
