import * as wf from "./domain/warfare/index.ts";
import { sidesOf, strength, wallsOf, warBetween } from "./war.ts";
import { maxCeded, peaceShare } from "./peace.ts";
import type { World } from "./world.ts";

/**
 * The peace table on the live map (WAR-240 … WAR-251): what each province of
 * the giving side costs to demand, what the war lets the asking side spend,
 * and what may be asked at all. The counts are warfare's settlement module;
 * this file only reads them off the world, the same for player and AI.
 */

export interface SettlementTable {
  /** The realm that asks and the realm that gives (and pays any gold). */
  asker: number;
  giver: number;
  /** Peace between the two war leaders ends the whole war; otherwise it is a separate peace. */
  whole: boolean;
  askers: number[];
  givers: number[];
  capacity: wf.Capacity;
  /** The provinces that may be demanded, with their cost. */
  candidates: wf.Candidate[];
  /** Every province of the giving side the asking side holds, the capital included. */
  held: wf.Candidate[];
  limits: wf.Limits;
  /** The giving side can no longer reasonably fight on (WAR-245). */
  beaten: boolean;
}

/** The cost of demanding province p for the side `takers` (WAR-240). */
export function demandCostOf(world: World, p: number, takers: Set<number>): number {
  const owner = world.provinceOwner[p]!;
  let borders = false;
  for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]! && !borders; k++) borders = takers.has(world.provinceOwner[world.adjList[k]!]!);
  return wf.provinceCost({
    people: world.provincePopulation[p]!,
    wealth: world.provinceWealth[p]!,
    castle: wallsOf(world, p) !== null,
    coastal: !!world.rules.provinces[p]!.coastal,
    river: world.provinceRiver[p]! > 0,
    capital: owner >= 0 && world.rules.nations[owner]!.capital === world.provinceIds[p],
    bordersTaker: borders,
  });
}

/** What realm a may ask of realm b in their war, by the war's outcome so far (WAR-241, WAR-242), or null when they are not at war. */
export function settlementTable(world: World, a: number, b: number): SettlementTable | null {
  const war = warBetween(world, a, b);
  if (!war) return null;
  const leaders = [war.declarer, war.target].map((id) => world.nationIndex.get(id)!);
  const whole = leaders.includes(a) && leaders.includes(b);
  const { ours, theirs } = sidesOf(world, war, a);
  const askers = whole ? ours : [a];
  const givers = whole ? theirs : [b];
  const takers = new Set(askers);
  const giving = new Set(givers);
  let realmValue = 0;
  let landHeld = 0;
  const owned = new Map<number, number>();
  const held: wf.Candidate[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (!giving.has(o)) continue;
    owned.set(o, (owned.get(o) ?? 0) + 1);
    const cost = demandCostOf(world, p, takers);
    realmValue += cost;
    if (takers.has(world.provinceOccupier[p]!)) {
      landHeld += cost;
      held.push({ province: p, realm: o, cost });
    }
  }
  // One peace takes at most a share of each realm's provinces, and its capital only when it is the last (WAR-227).
  const mostPerRealm = new Map<number, number>();
  for (const o of owned.keys()) mostPerRealm.set(o, maxCeded(world, o).max);
  const candidates = held.filter((c) => world.rules.nations[c.realm]!.capital !== world.provinceIds[c.province] || owned.get(c.realm) === 1);
  const capital = world.provinceIndex.get(world.rules.nations[givers[0]!]!.capital);
  const attackerSide = war.attackers.includes(world.nationIds[a]!);
  const lost = war.menLost ?? { attackers: 0, defenders: 0 };
  const field = (s: number[]) => s.reduce((t, n) => t + strength(world, n), 0);
  const outcome: wf.WarOutcome = {
    realmValue,
    landHeld,
    capitalHeld: capital !== undefined && takers.has(world.provinceOccupier[capital]!),
    menLost: attackerSide ? { ours: lost.attackers, theirs: lost.defenders } : { ours: lost.defenders, theirs: lost.attackers },
    strength: { ours: field(askers), theirs: field(givers) },
    // The giving leader's peace voices (WAR-180, WAR-221).
    theirPeaceShare: peaceShare(world, b, war),
    surrendered: (war.surrendered ?? []).includes(world.nationIds[b]!),
  };
  return {
    asker: a,
    giver: b,
    whole,
    askers,
    givers,
    capacity: wf.capacityOf(outcome),
    candidates,
    held,
    limits: { mostPerRealm, maxGold: Math.max(0, Math.floor(world.nationTreasury[b]!)) },
    beaten: wf.beaten(outcome),
  };
}

/** The most the table buys, as the AI asks it (WAR-244). */
export const bestTerms = (t: SettlementTable): wf.Demand => wf.bestDemand(t.candidates, t.capacity.capacity, t.limits);

/** A battle's dead counted for the war it was fought in, by side (WAR-241). */
export function noteWarBattle(world: World, winner: number, loser: number, winnerLost: number, loserLost: number): void {
  const war = warBetween(world, winner, loser);
  if (!war) return;
  const lost = (war.menLost ??= { attackers: 0, defenders: 0 });
  const winnerAttacks = war.attackers.includes(world.nationIds[winner]!);
  lost.attackers += winnerAttacks ? winnerLost : loserLost;
  lost.defenders += winnerAttacks ? loserLost : winnerLost;
}

/** Marks realm n as surrendered in its war with the victor (WAR-245). */
export function markSurrender(world: World, n: number, victor: number): void {
  const war = warBetween(world, n, victor);
  if (!war) return;
  const id = world.nationIds[n]!;
  if (!(war.surrendered ??= []).includes(id)) war.surrendered.push(id);
}

/** The peace table as the player sees it, against one realm (WAR-248). */
export interface SettlementView {
  target: number;
  whole: boolean;
  capacity: number;
  realmValue: number;
  parts: { part: wf.CapacityPart; points: number }[];
  surrendered: boolean;
  /** Each province of theirs your side holds, its cost, and why not when it may not be asked. */
  provinces: { province: number; realm: number; cost: number; why?: string }[];
  mostPerRealm: { realm: number; most: number }[];
  maxGold: number;
  goldPerPoint: number;
  /** The most the capacity buys, as the AI would ask it: the table's starting choice. */
  best: wf.Demand;
}

/** The peace table against every realm the player is at war with. */
export function settlementsView(world: World): SettlementView[] {
  const me = world.player;
  if (me < 0) return [];
  const out: SettlementView[] = [];
  for (let n = 0; n < world.nationCount; n++) {
    if (n === me || world.nationGone[n]) continue;
    const t = settlementTable(world, me, n);
    if (!t) continue;
    const ok = new Set(t.candidates.map((c) => c.province));
    out.push({
      target: n,
      whole: t.whole,
      capacity: t.capacity.capacity,
      realmValue: t.capacity.realmValue,
      parts: t.capacity.parts,
      surrendered: t.capacity.surrendered,
      provinces: t.held.map((c) => ({ ...c, ...(ok.has(c.province) ? {} : { why: "their capital: only in the peace that takes their last province" }) })),
      mostPerRealm: [...t.limits.mostPerRealm].map(([realm, most]) => ({ realm, most })),
      maxGold: t.limits.maxGold,
      goldPerPoint: wf.W.settlement.gold_per_point,
      best: bestTerms(t),
    });
  }
  return out;
}
