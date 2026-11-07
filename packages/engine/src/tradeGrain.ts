import type { World } from "./world.ts";
import type { GameTrader } from "./trade.ts";
import { atWar } from "./war.ts";
import { isHuman } from "./humans.ts";
import { tradeConfig as config } from "./domain/trade/index.ts";
import { grainPrice } from "./domain/realm/index.ts";

/**
 * Traders carry grain (feedback 85, TRADE-162 to TRADE-167, D-TRADE-24):
 * every trader has a grain hold beside its purse. Entering a province its
 * realm's owner holds, it sells grain to a store running low, then buys from
 * a store with plenty, at the one fixed grain price; between a realm's own
 * provinces no gold moves. An army at war with the trader's realm seizes its
 * purse and grain, and a blockade takes a ship's, so a land that lives on
 * bought grain goes hungry when war cuts its roads or ports.
 */

const GR = config.game.grain;

/** Grain a trader of this hold carries at most, in thousands of people fed for a month (TRADE-162). */
export const grainHold = (hold: number): number => hold * GR.hold_per_hold;

/** Gold for one unit of grain: the realm's one price (REALM-026, TRADE-164). */
const price = (world: World) => grainPrice() * world.rules.defines.castleFood.grainGoldScale;

/** Grain a province would take now: what brings its store up to the low mark (0 when it has enough). */
export function grainWanted(world: World, q: number): number {
  return Math.max(0, world.provincePopulation[q]! * GR.unload_below_months - world.provinceStore[q]!);
}

/** Grain a province would sell now: its store over the plenty mark. */
export function grainSpare(world: World, q: number): number {
  return Math.max(0, world.provinceStore[q]! - world.provincePopulation[q]! * GR.load_above_months);
}

/** Whether grain may change hands in q: land its owner holds (TRADE-163). */
function trades(world: World, q: number): boolean {
  return !world.provinceWater[q] && world.provinceOwner[q]! >= 0 && world.provinceOccupier[q]! < 0;
}

/** Grain gold between two realms this month: `from` pays `to` (TRADE-164). */
function pay(world: World, from: number, to: number, food: number): void {
  if (from === to || from < 0 || to < 0 || food <= 0) return;
  const gold = food * price(world);
  world.nationGrainTradeNow[from] = world.nationGrainTradeNow[from]! - gold;
  world.nationGrainTradeNow[to] = world.nationGrainTradeNow[to]! + gold;
}

/** Adds food from province q to province-and-amount pairs. */
function add(list: number[], q: number, food: number): void {
  for (let i = 0; i < list.length; i += 2)
    if (list[i] === q) {
      list[i + 1] = list[i + 1]! + food;
      return;
    }
  list.push(q, food);
}

/** A trader entering q sells grain where the store runs low, then buys where it has plenty (TRADE-163, TRADE-164, TRADE-166). */
export function tradeGrainAt(world: World, t: GameTrader, q: number, hold: number): void {
  if (!trades(world, q)) return;
  const owner = world.provinceOwner[q]!;
  const mine = isHuman(world, t.owner);
  const sell = Math.min(t.grain, grainWanted(world, q));
  if (sell > 0) {
    t.grain -= sell;
    world.provinceStore[q] = world.provinceStore[q]! + sell;
    world.provinceGrain[q * 2] = world.provinceGrain[q * 2]! + sell;
    pay(world, owner, t.owner, sell);
    if (mine) add(t.grainSold, q, sell);
    return;
  }
  const buy = Math.min(hold - t.grain, grainSpare(world, q));
  if (buy > 0) {
    t.grain += buy;
    world.provinceStore[q] = world.provinceStore[q]! - buy;
    world.provinceGrain[q * 2 + 1] = world.provinceGrain[q * 2 + 1]! + buy;
    pay(world, t.owner, owner, buy);
    if (mine) add(t.grainBought, q, buy);
  }
}

/** Each province's armies' realms, worked out once a day while any realm is at war; null in peace. */
const armyCache = new WeakMap<World, { day: number; at: Map<number, number[]> | null }>();
function armiesByProvince(world: World): Map<number, number[]> | null {
  const hit = armyCache.get(world);
  if (hit && hit.day === world.day) return hit.at;
  let at: Map<number, number[]> | null = null;
  if (world.diplomacy.wars.length) {
    at = new Map();
    const a = world.armies;
    for (let i = 0; i < a.count; i++) {
      if (!a.alive[i]) continue;
      const p = a.location[i]!;
      if (p < 0) continue;
      const list = at.get(p);
      if (list) list.includes(a.owner[i]!) || list.push(a.owner[i]!);
      else at.set(p, [a.owner[i]!]);
    }
  }
  armyCache.set(world, { day: world.day, at });
  return at;
}

/** The realm of an army at war with realm n standing in q, or -1 (TRADE-165). */
export function raiderAt(world: World, n: number, q: number): number {
  const owners = armiesByProvince(world)?.get(q);
  if (owners) for (const o of owners) if (o !== n && atWar(world, n, o)) return o;
  return -1;
}

/** Provinces on a way that would sell grain now and those that would buy it now, each in the order walked, at most `max` (TRADE-167). */
export function grainWay(world: World, path: readonly number[], max = 3): { sell: number[]; buy: number[] } {
  const sell: number[] = [];
  const buy: number[] = [];
  for (const q of path) {
    if (!trades(world, q)) continue;
    if (grainSpare(world, q) > 0) sell.includes(q) || sell.length >= max || sell.push(q);
    else if (grainWanted(world, q) > 0) buy.includes(q) || buy.length >= max || buy.push(q);
  }
  return { sell, buy };
}

/** The month turns: this month's grain counts become last month's, and the grain gold joins each realm's Grain line (TRADE-164, TRADE-166). */
export function closeGrainMonth(world: World, ledger: boolean): void {
  world.provinceGrainLast.set(world.provinceGrain);
  world.provinceGrain.fill(0);
  if (ledger) for (let n = 0; n < world.nationCount; n++) world.nationGrainGold[n] = world.nationGrainGold[n]! + world.nationGrainTradeNow[n]!;
  world.nationGrainTradeNow.fill(0);
}
