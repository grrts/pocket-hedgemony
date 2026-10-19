import type { World } from "./world.ts";
import { closedTo } from "./shogunate.ts";
import { atWar, type News } from "./war.ts";
import { tradeConfig as config } from "./domain/trade/index.ts";
import navalConfig from "../../rules/data/domain/naval.json" with { type: "json" };
import { CLASS_COUNT, classIndex } from "./living.ts";
import { tileWares, seamWare, tilesOf } from "./land.ts";
import { roadHours, townSize, workIndex, worksAt } from "./works.ts";
import { yearlyFood } from "./food.ts";
import { officialBonus } from "./officials.ts";
import { moodIndex } from "./moods.ts";
import { knows, withoutOf } from "./research.ts";
import { realmAssessment } from "./realmStrengths.ts";
import { planTilePath } from "./march.ts";

/**
 * Trade in the game (TRADE-129 to TRADE-146, D-TRADE-20): every province's
 * goods give it a trade value; traders walk loops between trade cities, make
 * each province they pass busier (its trade ratio), collect as they enter and
 * deposit in their own realm's cities. What they deposit, the market fees
 * paid to a realm and its traders' upkeep make the ledger's Trade line.
 * Runs once a month; the rules' numbers are the trade context's, the slice's
 * stand-ins are in trade.json's `game` block.
 */

const G = config.game;

/** The kinds a realm can found in this slice: caravans and barges by land, the 1444 trade ship by sea. */
export const TRADER_KINDS = ["pack_caravan", "camel_caravan", "river_barge", "cog_junk_dhow"] as const;
export type GameTraderKind = (typeof TRADER_KINDS)[number];
const KIND_NAME: Record<GameTraderKind, string> = { pack_caravan: "Pack caravan", camel_caravan: "Camel caravan", river_barge: "River barge", cog_junk_dhow: "Cog" };
export const traderKindName = (k: GameTraderKind): string => KIND_NAME[k];
const isShip = (k: GameTraderKind) => k === "cog_junk_dhow";
const COG = navalConfig.ships.cog;

export interface GameTrader {
  id: number;
  kind: GameTraderKind;
  owner: number;
  home: number;
  /** Where its route starts and where it goes, walked there and back (D-TRADE-21); empty while it has no route (it waits at home). */
  stops: number[];
  purse: number;
  /** Index into its path of the province it stands in. */
  at: number;
  /** Days walked toward the next province. */
  days: number;
  /** Gold deposited last month and this month so far, the last deposit and where. */
  lastMonth: number;
  thisMonth: number;
  lastDeposit: number;
  lastDepositCity: number;
  /** Months its upkeep went unpaid in a row. */
  unpaid: number;
  /** The province whose way was found shut, or -1. */
  blocked: number;
  /** Whether the player chose its route (the AI leaves it) or the game chose it. */
  chosen: boolean;
  /** Its loop as planned, province by province; empty until planned again. */
  path: number[];
  /** Provinces it was counted as passing this month (once each, TRADE-033); cleared when the month turns. */
  marked: number[];
  /** Where its gold came from on this trip there and back and on the last whole one: province and gold kept, in pairs; and the market fees paid (TRADE-146). */
  src: number[];
  srcLast: number[];
  fees: number;
  feesLast: number;
}

/** A trader's collection or deposit, for the map to show as it happens (TRADE-152). */
export interface TradeFeedItem {
  trader: number;
  province: number;
  gold: number;
  deposit: boolean;
}

export interface TradeState {
  traders: GameTrader[];
  traderSeq: number;
  /** Each province's trade ratio, 0 to 100. */
  provinceTradeRatio: Float32Array;
  /** Traders passing this month (ships in a lane count half in its ports), and visits for crowding. */
  provincePassing: Float32Array;
  provinceVisits: Uint16Array;
  /** Traders that passed last month, for the screens, and last month's visits, for the estimate's crowding (TRADE-147). */
  provincePassed: Float32Array;
  provinceVisitsLast: Uint16Array;
  /** Goods value a year (gold, before the trade scale) and the land and sea building weights, worked out each January. */
  provinceGoodsValue: Float32Array;
  provinceWeight: Float32Array;
  provinceGoods: { ware: string; loads: number; gold: number }[][];
  /** Bit 1: a city land traders may stop at (city size or a market); bit 2: a port ships may stop at. Worked out each January. */
  provinceTradeCity: Uint8Array;
  /** Last month's deposits, market fees received and traders' upkeep, by realm: 3 per realm. */
  nationTrade: Float64Array;
  /** This month's deposits and market fees so far, by realm: 2 per realm; last month's when the month turns. */
  nationTradeNow: Float64Array;
  /** The player's route being drawn, with its preview; never saved. */
  tradeDraft: { trader: number; stops: number[] } | null;
  /** The player's traders' collections and deposits since the map last looked; never saved. */
  tradeFeed: TradeFeedItem[];
}

export function createTradeState(P: number, N: number): TradeState {
  return {
    traders: [],
    traderSeq: 0,
    provinceTradeRatio: new Float32Array(P),
    provincePassing: new Float32Array(P),
    provinceVisits: new Uint16Array(P),
    provincePassed: new Float32Array(P),
    provinceVisitsLast: new Uint16Array(P),
    provinceGoodsValue: new Float32Array(P),
    provinceWeight: new Float32Array(P),
    provinceGoods: Array.from({ length: P }, () => []),
    provinceTradeCity: new Uint8Array(P),
    nationTrade: new Float64Array(N * 3),
    nationTradeNow: new Float64Array(N * 2),
    tradeDraft: null,
    tradeFeed: [],
  };
}

/** A commodore lying off a port of his realm speeds its trade (NAVY-154). */
const COMMODORE_GAIN = navalConfig.admiralPosts.commodore.tradeGain;

/** Whether a trade ship of realm n may pass sea zone z: not while an enemy blockades it, unless a commodore of n's lies there (NAVY-157; the navy works the blockades out). */
function tradeShipMayPass(world: World, n: number, z: number): boolean {
  const b = world.navy.blockade[z]!;
  return !b || !atWar(world, n, b - 1) || (world.navy.escorts.get(z)?.includes(n) ?? false);
}

/** A trade ship stopped by a blockade in zone z: its purse is the blockading realm's prize (NAVY-157). */
function seizePurse(world: World, z: number, purse: number): void {
  const b = world.navy.blockade[z]!;
  const v = world.navy;
  if (!b || purse <= 0) return;
  world.nationTreasury[b - 1] = world.nationTreasury[b - 1]! + purse;
  if (v.seized.length !== world.nationCount) v.seized = new Float64Array(world.nationCount);
  v.seized[b - 1] = v.seized[b - 1]! + purse;
}

// ---------------------------------------------------------------- goods and value

// Works by index, looked up on first use (works.ts imports this module's neighbours).
let WK: Record<"market" | "harbour" | "lumber camp" | "ranch" | "quarry" | "hunting lodge" | "mine" | "saltworks", number> | null = null;
const wk = () => (WK ??= Object.fromEntries(["market", "harbour", "lumber camp", "ranch", "quarry", "hunting lodge", "mine", "saltworks"].map((n) => [n, workIndex(n)])) as NonNullable<typeof WK>);
const MARKET_STEPS = ["weekly_market", "yearly_fair", "trading_house"] as const;
const CRAFTSMEN = classIndex("craftsmen");
const MARKET_FOLK = classIndex("market folk");
const SEAFOLK = classIndex("seafolk");

const priceOf = new Map<string, number>();
for (const tier of Object.values(config.value.price_per_load)) for (const w of tier.wares) priceOf.set(w, tier.price);
/** Gold a load is worth by its tier; the slice's crafts are finished goods, wares with no tier staples (TRADE-027). */
export function warePrice(ware: string): number {
  if (ware === "crafts") return config.value.price_per_load.finished.price;
  return priceOf.get(ware) ?? config.value.price_per_load.staples.price;
}

const marketStep = (world: World, p: number) => worksAt(world, p, wk()["market"]);
export const isPort = (world: World, p: number): boolean => worksAt(world, p, wk()["harbour"]) > 0;

/** The wares a province makes in a year, by ware, in loads: its works' wares, its food surplus and its craftsmen's crafts (TRADE-129). */
export function provinceWares(world: World, p: number): { ware: string; loads: number }[] {
  if (world.provinceWater[p]) return [];
  const loads = new Map<string, number>();
  const add = (w: { ware: string; amount: number } | null) => {
    if (!w || w.amount <= 0) return;
    const parts = w.ware.split(" and ");
    for (const part of parts) loads.set(part, (loads.get(part) ?? 0) + w.amount / parts.length);
  };
  if (worksAt(world, p, wk()["lumber camp"]) > 0 && tilesOf(world, p, "woods") > 0) add(tileWares(world, p, "lumber camp"));
  if (worksAt(world, p, wk()["ranch"]) > 0 && tilesOf(world, p, "pasture") > 0) add(tileWares(world, p, "ranch"));
  if (worksAt(world, p, wk()["quarry"]) > 0) add(tileWares(world, p, "quarry"));
  if (worksAt(world, p, wk()["hunting lodge"]) > 0) add(tileWares(world, p, "hunting lodge"));
  if (worksAt(world, p, wk()["mine"]) > 0 && seamWare(world, p)) add(tileWares(world, p, "mine"));
  if (worksAt(world, p, wk()["saltworks"]) > 0) add(tileWares(world, p, "saltworks"));
  // Only the food the province does not eat is traded (D-TRADE-19).
  const surplus = Math.max(0, yearlyFood(world, p) - world.provincePopulation[p]!);
  if (surplus > 0) add({ ware: "grain", amount: surplus * G.food_loads_per_thousand_fed });
  // Craftsmen make crafts until the craft buildings make their own wares (D-TRADE-20).
  add({ ware: "crafts", amount: world.provinceClasses[p * CLASS_COUNT + CRAFTSMEN]! * G.crafts_loads_per_thousand });
  return [...loads].map(([ware, l]) => ({ ware, loads: l })).sort((a, b) => b.loads * warePrice(b.ware) - a.loads * warePrice(a.ware));
}

/** The weights of a province's works: its market step, and its harbour for ships (TRADE-029); halved while its realm neglects its works. */
function weights(world: World, p: number, ship: boolean): number {
  const m = marketStep(world, p);
  const bw = config.value.building_weights;
  const owner = world.provinceOwner[p]!;
  return ((m > 0 ? bw[MARKET_STEPS[Math.min(m, 3) - 1]!].weight : 0) + (ship && isPort(world, p) ? bw.harbour.weight : 0)) * (owner >= 0 && world.nationNeglect[owner] ? 0.5 : 1);
}

/** Works out every province's goods, value and whether it is a trade city (each January, and at the start). */
export function refreshTradeValues(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) if (!world.provinceWater[p]) refreshProvince(world, p);
  laneCache.delete(world);
  refreshBusy(world);
}

/**
 * What a land province's days count for in the route planner: its days divided by 1 + busy weight × its
 * people over the world's average, capped, so routes go through the most populated land (D-TRADE-21).
 * Worked out each January with the values, and kept until the next.
 */
const busyCache = new WeakMap<World, Float32Array>();
function refreshBusy(world: World): Float32Array {
  const P = world.provinceCount;
  let people = 0, land = 0;
  for (let p = 0; p < P; p++) if (!world.provinceWater[p]) ((people += world.provincePopulation[p]!), land++);
  const mean = land && people > 0 ? people / land : 1;
  const f = new Float32Array(P);
  for (let p = 0; p < P; p++) f[p] = world.provinceWater[p] ? 1 : 1 / (1 + config.route.busy_weight * Math.min(world.provincePopulation[p]! / mean, config.route.busy_cap));
  busyCache.set(world, f);
  legCache.delete(world);
  return f;
}
const busyOf = (world: World) => busyCache.get(world) ?? refreshBusy(world);

function refreshProvince(world: World, p: number): void {
  const goods = countGoods(world, p);
  world.provinceGoods[p] = goods;
  world.provinceGoodsValue[p] = goods.reduce((sum, g) => sum + g.value, 0);
  world.provinceWeight[p] = weights(world, p, false);
  const size = townSize(world, p);
  const city = (config.value.city_size_is_city as string[]).includes(size) || marketStep(world, p) > 0;
  world.provinceTradeCity[p] = (city ? 1 : 0) | (isPort(world, p) ? 2 : 0);
}

/** A province's goods now, with each ware's worth a year (`value`) and gold a month. */
function countGoods(world: World, p: number): { ware: string; loads: number; gold: number; value: number }[] {
  return provinceWares(world, p).map((w) => {
    const value = w.loads * warePrice(w.ware);
    return { ware: w.ware, loads: w.loads, gold: tradeValueOf(value, 0), value };
  });
}

/** What a province trades, for the screens; after a load it is counted when first asked for. */
export function goodsOf(world: World, p: number): { ware: string; loads: number; gold: number }[] {
  if (world.provinceWater[p]) return [];
  return (world.provinceGoods[p] ??= countGoods(world, p));
}

/** Gold a month from goods worth `goodsYear` a year with these weights (TRADE-025). */
const tradeValueOf = (goodsYear: number, w: number) => ((goodsYear * (1 + w)) / config.value.months_per_year) * G.value_scale;

/** A province's trade value in gold a month, to land traders or, with its harbour, to ships. */
export function tradeValueAt(world: World, p: number, ship = false): number {
  if (world.provinceWater[p]) return 0;
  return tradeValueOf(world.provinceGoodsValue[p]!, ship ? weights(world, p, true) : world.provinceWeight[p]!);
}

/** Whether traders may stop in a province: a city, or a settlement with a market (TRADE-049); ships stop only at ports. */
export function isTradeStop(world: World, p: number, kind: GameTraderKind): boolean {
  return (world.provinceTradeCity[p]! & (isShip(kind) ? 2 : 1)) !== 0;
}

/** Visits a month a province serves at full value: 2 without a market, 4, 8, 16 by its market step (TRADE-048). */
function served(world: World, p: number): number {
  const m = marketStep(world, p);
  return m > 0 ? config.value.building_weights[MARKET_STEPS[Math.min(m, 3) - 1]!].serves : config.value.serves_without_market;
}

// ---------------------------------------------------------------- kinds and movement

export interface KindRow {
  kind: GameTraderKind;
  name: string;
  /** Gold to found it and its upkeep a month, at the treasury's gold. */
  gold: number;
  upkeep: number;
  hold: number;
  purse: number;
  /** Crew taken from the home province: market folk, or seafolk for a ship. */
  crew: number;
  crewClass: string;
}

const goldScale = (world: World) => world.rules.defines.works.goldScale;

export function kindRow(world: World, kind: GameTraderKind): KindRow {
  if (isShip(kind)) {
    const s = config.sea_traders.cog_junk_dhow;
    return { kind, name: KIND_NAME[kind], gold: COG.gold * goldScale(world), upkeep: COG.upkeep * goldScale(world), hold: s.hold, purse: s.purse * G.purse_scale, crew: COG.crew, crewClass: "seafolk" };
  }
  const k = config.land_traders[kind];
  return { kind, name: KIND_NAME[kind], gold: k.found * goldScale(world), upkeep: k.upkeep * goldScale(world), hold: k.hold, purse: k.purse * G.purse_scale, crew: k.crew.count, crewClass: "market folk" };
}

const DESERT = config.land_traders.camel_caravan.desert_grounds as string[];

/** Days a trader of this kind takes to enter province q, or Infinity where it can't go (TRADE-014 to TRADE-021). */
function stepDays(world: World, kind: GameTraderKind, q: number): number {
  const def = world.rules.provinces[q]!;
  if (isShip(kind)) {
    if (world.provinceWater[q]) return def.terrain === "ocean" ? COG.stepDays.ocean : COG.stepDays.sea;
    return isPort(world, q) ? 1 : Infinity;
  }
  if (world.provinceWater[q]) return Infinity;
  if (kind === "river_barge" && !world.provinceRiver[q]) return Infinity;
  const m = world.rules.defines.march;
  const ground = world.provinceGround[q] ?? "grassland";
  const base = (m.daysToCross[ground as keyof typeof m.daysToCross] ?? 1) * m.daysPerCrossing * roadHours(world, q);
  const factor = kind === "camel_caravan" && DESERT.includes(ground) ? config.land_traders.camel_caravan.desert_step_factor : config.land_traders[kind].step_factor;
  return base * factor;
}

/** Whether realm n's traders may enter q: not the land of a realm at war with it, nor land its enemies hold (TRADE-066, TRADE-067). */
export function traderMayEnter(world: World, n: number, q: number): boolean {
  // The closed country: foreign traders stop only at the shogun's one port (INST-068).
  if (closedTo(world, n, q)) return false;
  // An enemy blockade shuts the sea to a realm's trade ships, unless its commodore escorts them (NAVY-157).
  if (world.provinceWater[q]) return tradeShipMayPass(world, n, q);
  const o = world.provinceOwner[q]!;
  if (o >= 0 && o !== n && atWar(world, n, o)) return false;
  const occ = world.provinceOccupier[q]!;
  return !(occ >= 0 && occ !== n && atWar(world, n, occ));
}

// A small binary heap over (days, province) for the route planner.
class Heap {
  d: number[] = [];
  p: number[] = [];
  push(d: number, p: number): void {
    const a = this.d, b = this.p;
    let i = a.length;
    a.push(d);
    b.push(p);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (a[up]! <= d) break;
      a[i] = a[up]!;
      b[i] = b[up]!;
      i = up;
    }
    a[i] = d;
    b[i] = p;
  }
  pop(): number {
    const a = this.d, b = this.p;
    const top = b[0]!;
    const ld = a.pop()!, lp = b.pop()!;
    if (a.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= a.length) break;
        if (c + 1 < a.length && a[c + 1]! < a[c]!) c++;
        if (a[c]! >= ld) break;
        a[i] = a[c]!;
        b[i] = b[c]!;
        i = c;
      }
      a[i] = ld;
      b[i] = lp;
    }
    return top;
  }
  get size(): number {
    return this.d.length;
  }
}

/** The planner's working arrays, shared by every search (one search at a time; read a result before the next). */
let dist = new Float64Array(0);
let prev = new Int32Array(0);
let seenAt = new Int32Array(0);
let enterAt = new Int32Array(0);
let search = 0;
let ownerAt = new Int32Array(0);
let daysAt = new Float64Array(0);

interface Reach {
  /** Provinces reached, in the order they were settled. */
  reached: number[];
  stamp: number;
}

/**
 * The way from `from` for a trader of this kind and realm by the shared planner's rule (TRADE-052): fewest
 * days, a land province's days counting less the more people live there (D-TRADE-21), out to `maxDays`
 * of walking, stopping early once `to` is reached. Ships pass through sea zones only: a port is entered, never crossed.
 */
function plan(world: World, n: number, kind: GameTraderKind, from: number, maxDays: number, to = -1): Reach {
  const P = world.provinceCount;
  if (dist.length < P) ((dist = new Float64Array(P)), (prev = new Int32Array(P)), (seenAt = new Int32Array(P)), (enterAt = new Int32Array(P)), (daysAt = new Float64Array(P)));
  const busy = busyOf(world);
  if (ownerAt.length < world.nationCount) ownerAt = new Int32Array(world.nationCount);
  const stamp = ++search;
  // enterAt: 2×stamp = may enter, 2×stamp+1 = may not, looked up once a search.
  const reached: number[] = [];
  dist[from] = 0;
  daysAt[from] = 0;
  prev[from] = -1;
  seenAt[from] = stamp;
  const heap = new Heap();
  heap.push(0, from);
  const ship = isShip(kind);
  while (heap.size) {
    const d = heap.d[0]!;
    const p = heap.pop();
    if (d > dist[p]!) continue;
    reached.push(p);
    if (p === to) break;
    if (ship && p !== from && !world.provinceWater[p]) continue;
    for (let e = world.adjStart[p]!; e < world.adjStart[p + 1]!; e++) {
      const q = world.adjList[e]!;
      const step = stepDays(world, kind, q);
      const nd = d + step * busy[q]!;
      const days = daysAt[p]! + step;
      if (days > maxDays || (seenAt[q] === stamp && nd >= dist[q]!)) continue;
      if (enterAt[q] !== 2 * stamp && enterAt[q] !== 2 * stamp + 1) enterAt[q] = 2 * stamp + (mayEnterIn(world, n, q, stamp) ? 0 : 1);
      if (enterAt[q] !== 2 * stamp) continue;
      seenAt[q] = stamp;
      dist[q] = nd;
      daysAt[q] = days;
      prev[q] = p;
      heap.push(nd, q);
    }
  }
  return { reached, stamp };
}

/** traderMayEnter, with each realm's war with n looked up once a search (ownerAt: 2×stamp at peace, 2×stamp+1 at war). */
function mayEnterIn(world: World, n: number, q: number, stamp: number): boolean {
  if (world.provinceWater[q]) return tradeShipMayPass(world, n, q);
  const hostile = (o: number) => {
    if (o < 0 || o === n) return false;
    if (ownerAt[o] !== 2 * stamp && ownerAt[o] !== 2 * stamp + 1) ownerAt[o] = 2 * stamp + (atWar(world, n, o) ? 1 : 0);
    return ownerAt[o] === 2 * stamp + 1;
  };
  return !hostile(world.provinceOwner[q]!) && !hostile(world.provinceOccupier[q]!);
}

/** The way from a search's start to `to`, read before the next search. */
function pathTo(r: Reach, to: number): number[] | null {
  if (r.stamp !== search) throw new Error("a route search was read after another began");
  if (seenAt[to] !== r.stamp) return null;
  const out: number[] = [];
  for (let p = to; p !== -1; p = prev[p]!) out.push(p);
  return out.reverse();
}

/** Legs planned, by realm, kind and stops: many traders share them (cleared when a war begins or ends, and each January). */
const legCache = new WeakMap<World, { wars: string; legs: Map<string, number[] | null> }>();
function leg(world: World, n: number, kind: GameTraderKind, a: number, b: number): number[] | null {
  const g = world.diplomacy;
  const wars = `${g.graph.relations.length}|${g.wars.length}|${g.seq}`;
  let c = legCache.get(world);
  if (!c || c.wars !== wars) legCache.set(world, (c = { wars, legs: new Map() }));
  const m = c.legs;
  const key = `${n} ${kind} ${a} ${b}`;
  let l = m.get(key);
  if (l === undefined) m.set(key, (l = pathTo(plan(world, n, kind, a, LEG_DAYS, b), b)));
  return l;
}

const LEG_DAYS = G.leg_max_days;

/** The provinces a route walks there and back, from its start round to just before it again; null if a leg can't be walked. */
export function loopPath(world: World, n: number, kind: GameTraderKind, stops: readonly number[], cached = true): number[] | null {
  const order = [...stops, ...stops.slice(1, -1).reverse()];
  const path: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const a = order[i]!, b = order[(i + 1) % order.length]!;
    if (a === b) continue;
    const way = cached ? leg(world, n, kind, a, b) : pathTo(plan(world, n, kind, a, LEG_DAYS, b), b);
    if (!way) return null;
    for (let k = 0; k < way.length - 1; k++) path.push(way[k]!);
  }
  return path.length ? path : null;
}

// ---------------------------------------------------------------- the month

/** Each sea zone's ports, where a ship sailing the lane counts half a trader passing (TRADE-034). */
const laneCache = new WeakMap<World, Map<number, number[]>>();
function lanePorts(world: World, z: number): number[] {
  let m = laneCache.get(world);
  if (!m) laneCache.set(world, (m = new Map()));
  let ports = m.get(z);
  if (!ports) {
    ports = [];
    for (let e = world.adjStart[z]!; e < world.adjStart[z + 1]!; e++) {
      const q = world.adjList[e]!;
      if (!world.provinceWater[q] && isPort(world, q)) ports.push(q);
    }
    m.set(z, ports);
  }
  return ports;
}

/** A trader's loop, planned when first needed and again when its route or the wars change; kept with it, and in the save. */
function pathOf(world: World, t: GameTrader): number[] {
  if (!t.path.length) {
    t.path = t.stops.length >= 2 ? (loopPath(world, t.owner, t.kind, t.stops) ?? [t.home]) : [t.home];
    if (t.at >= t.path.length) t.at = 0;
  }
  return t.path;
}

/** A trader's loop for the screens, planned without keeping it, so looking never changes the game. */
function peekPath(world: World, t: GameTrader): number[] {
  return t.path.length ? t.path : t.stops.length >= 2 ? (loopPath(world, t.owner, t.kind, t.stops, false) ?? [t.home]) : [t.home];
}

/** Whether the trader can deposit in q: a trade city of its own realm that its realm holds (TRADE-060, TRADE-063). */
function depositsAt(world: World, t: GameTrader, q: number): boolean {
  if (world.provinceOwner[q] !== t.owner || world.provinceTradeCity[q] === 0) return false;
  const occ = world.provinceOccupier[q]!;
  return occ < 0 || occ === t.owner;
}

/**
 * A trader's days on the road, walked a day at a time as armies march: it enters province after province,
 * collecting, paying fees and depositing (TRADE-033, TRADE-043 to TRADE-048, TRADE-060, TRADE-132).
 */
function walk(world: World, t: GameTrader, collect: boolean, days: number): void {
  const path = pathOf(world, t);
  const row = kindRow(world, t.kind);
  const ship = isShip(t.kind);
  // Each province counts the trader once a month, however often it passes (TRADE-033).
  const mark = (q: number, weight: number) => {
    if (t.marked.includes(q)) return;
    t.marked.push(q);
    world.provincePassing[q] = world.provincePassing[q]! + weight;
  };
  mark(path[t.at]!, 1);
  if (path.length < 2) return;
  let budget = days + t.days;
  for (;;) {
    const next = (t.at + 1) % path.length;
    const q = path[next]!;
    const cost = stepDays(world, t.kind, q);
    if (cost === Infinity || !traderMayEnter(world, t.owner, q)) {
      // A ship a blockade stops loses its purse to the blockading realm (NAVY-157).
      if (ship && world.provinceWater[q] && cost !== Infinity) {
        if (collect) seizePurse(world, q, t.purse);
        t.purse = 0;
      }
      // The way is shut: plan the loop again next month.
      t.path = [];
      t.blocked = q;
      t.days = 0;
      return;
    }
    if (budget < cost) break;
    budget -= cost;
    t.at = next;
    // Back where it set out: a whole trip there and back is done, and where its gold came from starts afresh.
    if (next === 0 && collect) {
      t.srcLast = t.src;
      t.feesLast = t.fees;
      t.src = [];
      t.fees = 0;
    }
    if (world.provinceWater[q]) {
      for (const port of lanePorts(world, q)) mark(port, config.ratio.sea_lane_trader_weight);
      continue;
    }
    mark(q, 1);
    world.provinceVisits[q] = world.provinceVisits[q]! + 1;
    if (collect && t.purse < row.purse) {
      const value = tradeValueAt(world, q, ship);
      const crowd = Math.min(1, served(world, q) / world.provinceVisits[q]!);
      let gold = value * (world.provinceTradeRatio[q]! / 100) * row.hold * config.collect.visit_share * crowd;
      const owner = world.provinceOwner[q]!;
      // Unclaimed land pays nothing (TRADE-068), nor does occupied land, to its owner or its occupier: its trade is lost to the war (WAR-224); a foreign owner takes its market fee (TRADE-047).
      if (owner < 0 || world.provinceOccupier[q]! >= 0) gold = 0;
      else if (owner !== t.owner) {
        const fee = gold * config.collect.foreign_market_fee;
        world.nationTradeNow[owner * 2 + 1] = world.nationTradeNow[owner * 2 + 1]! + fee;
        if (t.owner === world.player) t.fees += fee;
        gold -= fee;
      }
      const took = Math.min(row.purse - t.purse, gold);
      t.purse += took;
      // Only the player's traders keep where their gold came from: no screen shows another realm's, and saves stay small.
      if (took > 0 && t.owner === world.player) {
        addSource(t.src, q, took);
        feed(world, { trader: t.id, province: q, gold: took, deposit: false });
      }
    }
    if (depositsAt(world, t, q) && t.purse > 0) {
      if (collect) {
        world.nationTradeNow[t.owner * 2] = world.nationTradeNow[t.owner * 2]! + t.purse;
        t.thisMonth += t.purse;
        t.lastDeposit = t.purse;
        t.lastDepositCity = q;
        if (t.owner === world.player) feed(world, { trader: t.id, province: q, gold: t.purse, deposit: true });
      }
      t.purse = 0;
    }
  }
  t.days = budget;
  if (t.blocked >= 0 && t.path.length) t.blocked = -1;
}

/** Adds gold from province q to a trader's sources (province and gold in pairs). */
function addSource(src: number[], q: number, gold: number): void {
  for (let i = 0; i < src.length; i += 2)
    if (src[i] === q) {
      src[i + 1] = src[i + 1]! + gold;
      return;
    }
  src.push(q, gold);
}

/** Keeps a collection or deposit for the map; the oldest go once the map has not looked for a while. */
function feed(world: World, item: TradeFeedItem): void {
  world.tradeFeed.push(item);
  if (world.tradeFeed.length > G.feed_max) world.tradeFeed.splice(0, world.tradeFeed.length - G.feed_max);
}

/** Each province's ratio after the month: gain from traders passing, with its modifiers added, less a tenth (TRADE-031, TRADE-118). */
function updateRatios(world: World): void {
  const r = world.provinceTradeRatio;
  for (let p = 0; p < world.provinceCount; p++) {
    const passing = world.provincePassing[p]!;
    const ratio = r[p]!;
    let gain = 0;
    if (passing > 0) {
      const enemy = world.provinceOccupier[p]! >= 0 || world.sieges.has(p) || world.navy.blockade[p]! > 0;
      // A customs officer +15 %, riots −50 %, a commodore lying off the port +25 % (TRADE-035, TRADE-038, NAVY-154); an enemy, a siege or a blockade stops the gain (TRADE-041, TRADE-042).
      const share = enemy ? 0 : Math.max(0, officialBonus(world, p, "Customs officer", "trade_ratio_gain") + (moodIndex(world, p) >= 2 ? config.ratio.modifiers.riots : 0) + (world.navy.guarded[p] ? COMMODORE_GAIN : 0));
      gain = config.ratio.gain_per_trader * passing * (1 - ratio / config.ratio.max) * share;
    }
    // A province closed against plague trades nothing while the quarantine lasts (TRADE-040, PROV-357).
    r[p] = world.provinceQuarantine[p] ? config.ratio.modifiers.quarantine.set_ratio : Math.max(0, Math.min(config.ratio.max, ratio + gain - ratio * config.ratio.decay_share));
    world.provincePassed[p] = passing;
    world.provinceVisitsLast[p] = world.provinceVisits[p]!;
  }
  world.provincePassing.fill(0);
  world.provinceVisits.fill(0);
}

/** Every trader walks one day on, as the armies march (TRADE-132). */
export function tradeDay(world: World): void {
  for (const t of world.traders) walk(world, t, true, 1);
}

/**
 * The month turns for trade: what traders deposited and realms took in fees becomes last month's,
 * ratios move with the traders that passed, and every trader starts counting provinces afresh.
 */
function closeMonth(world: World): void {
  for (let n = 0; n < world.nationCount; n++) {
    world.nationTrade[n * 3] = world.nationTradeNow[n * 2]!;
    world.nationTrade[n * 3 + 1] = world.nationTradeNow[n * 2 + 1]!;
    world.nationTrade[n * 3 + 2] = 0;
  }
  world.nationTradeNow.fill(0);
  for (const t of world.traders) {
    t.lastMonth = t.thisMonth;
    t.thisMonth = 0;
    t.marked = [];
  }
  updateRatios(world);
}

/** A whole month of trade for every trader at once, with or without gold (the warm-up runs without), then the month turns. */
export function tradeMonth(world: World, collect: boolean): void {
  for (const t of world.traders) walk(world, t, collect, world.rules.defines.march.daysPerMonth);
  closeMonth(world);
}

/**
 * The month for trade, on its first day: traders walk the month just past, ratios move, upkeep is
 * charged, and last month's deposits, fees and upkeep become the Trade line the ledger pays.
 * Each January the goods are counted again and the AI looks at its routes.
 */
export function monthlyTrade(world: World, news: News[]): void {
  legCache.delete(world);
  closeMonth(world);
  const lost: GameTrader[] = [];
  for (const t of world.traders) {
    const up = kindRow(world, t.kind).upkeep;
    world.nationTrade[t.owner * 3 + 2] = world.nationTrade[t.owner * 3 + 2]! + up;
    // Six months unpaid and the trader is lost (TRADE-007, D-TRADE-11).
    t.unpaid = world.nationTreasury[t.owner]! < 0 ? t.unpaid + 1 : 0;
    if (t.unpaid >= config.upkeep.unpaid_months_to_lose) lost.push(t);
  }
  for (const t of lost) {
    removeTrader(world, t);
    if (t.owner === world.player) news.push({ kind: "trade", text: `Unpaid for six months, the ${KIND_NAME[t.kind].toLowerCase()} of ${world.rules.provinces[t.home]!.name} has been given up.`, nations: [t.owner], province: t.home });
  }
  if (world.date.month === 1) refreshTradeValues(world);
  aiTrade(world);
}

/** The Trade line of realm n's ledger: last month's deposits and market fees, less its traders' upkeep (TRADE-064). */
export function tradeLine(world: World, n: number): number {
  return world.nationTrade[n * 3]! + world.nationTrade[n * 3 + 1]! - world.nationTrade[n * 3 + 2]!;
}

/** Tax a province owes rises 1 % for every 4 points of its trade ratio (TRADE-088). */
export function tradeTaxFactor(world: World, p: number): number {
  const e = config.effects.tax_per_ratio_points;
  return 1 + Math.floor(world.provinceTradeRatio[p]! / e.points) * e.tax;
}

// ---------------------------------------------------------------- planning a route

export interface RouteEstimate {
  loopDays: number;
  /** Provinces collected in over one loop, the best of them, and gold a month after market fees. */
  collectIn: number;
  best: { province: number; gold: number }[];
  expected: number;
  fees: number;
  deposits: number;
}

/** The share of full value a visit gets on average where a month brings `visits` and the province serves `served` in full (TRADE-048). */
function crowding(served: number, visits: number): number {
  return visits <= served ? 1 : (served * (1 + Math.log(visits / served))) / visits;
}

/**
 * What a loop brings, walked as a trader walks it (TRADE-055, TRADE-147): from its start, collecting in each
 * province it enters at this month's ratios, crowded by last month's visits (its own old loop's taken away
 * and this one's added), less market fees, while its purse has room, and depositing in each city of its own;
 * the second time round is the loop as walked, divided by the loop's months. `floor` counts ratios below it
 * as the floor (the AI's guess at what its own trader will make of a quiet road); `self` is the loop the
 * trader walks now, whose visits are already in last month's.
 */
export function estimateLoop(world: World, n: number, kind: GameTraderKind, path: readonly number[], floor = 0, self: readonly number[] = []): RouteEstimate {
  const row = kindRow(world, kind);
  const ship = isShip(kind);
  const L = path.length;
  const dpm = world.rules.defines.march.daysPerMonth;
  const step = new Float64Array(L);
  let days = 0;
  for (let i = 0; i < L; i++) days += step[i] = stepDays(world, kind, path[(i + 1) % L]!);
  const months = Math.max(days, 1) / dpm;
  // Visits a month each loop makes in a province.
  const visitsOf = (loop: readonly number[], loopDays: number) => {
    const m = new Map<number, number>();
    for (const q of loop) m.set(q, (m.get(q) ?? 0) + dpm / Math.max(loopDays, 1));
    return m;
  };
  const mine = visitsOf(path, days);
  let selfDays = 0;
  for (let i = 0; i < self.length; i++) selfDays += stepDays(world, kind, self[(i + 1) % self.length]!);
  const before = visitsOf(self, selfDays);
  const gold = new Float64Array(L), fee = new Float64Array(L), dep = new Uint8Array(L);
  let collectIn = 0, deposits = 0;
  for (let i = 0; i < L; i++) {
    const q = path[(i + 1) % L]!;
    if (world.provinceWater[q]) continue;
    const owner = world.provinceOwner[q]!;
    const occupied = world.provinceOccupier[q]! >= 0;
    if (owner === n && world.provinceTradeCity[q]! > 0 && !occupied) ((dep[i] = 1), deposits++);
    // Unclaimed and occupied land pay nothing, as on the road (walk).
    if (owner < 0 || occupied) continue;
    const visits = Math.max(0, world.provinceVisitsLast[q]! - (before.get(q) ?? 0)) + mine.get(q)!;
    let g = tradeValueAt(world, q, ship) * (Math.max(floor, world.provinceTradeRatio[q]!) / 100) * row.hold * config.collect.visit_share * crowding(served(world, q), visits);
    if (g <= 0) continue;
    collectIn++;
    if (owner !== n) {
      fee[i] = g * config.collect.foreign_market_fee;
      g -= fee[i]!;
    }
    gold[i] = g;
  }
  // Twice round: the first fills the purse from empty, the second is the loop as it is walked.
  let purse = 0, kept = 0, fees = 0;
  const per = new Map<number, number>();
  for (let round = 0; round < 2; round++)
    for (let i = 0; i < L; i++) {
      if (gold[i]! > 0 && purse < row.purse) {
        const took = Math.min(row.purse - purse, gold[i]!);
        purse += took;
        if (round) {
          fees += fee[i]!;
          const q = path[(i + 1) % L]!;
          per.set(q, (per.get(q) ?? 0) + took);
        }
      }
      if (dep[i]) {
        if (round) kept += purse;
        purse = 0;
      }
    }
  const best = [...per].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([province, gold]) => ({ province, gold: gold / months }));
  return { loopDays: Math.round(days), collectIn, best, expected: kept / months, fees: fees / months, deposits };
}

/** Why a route can't be set, or null: a start and an end, two different trade stops (TRADE-049, TRADE-050, D-TRADE-21). */
export function routeProblem(world: World, n: number, kind: GameTraderKind, stops: readonly number[]): string | null {
  if (stops.length < config.route.min_stops || stops.length > config.route.max_stops) return "a route has a start and an end";
  if (new Set(stops).size !== stops.length) return "pick two different cities";
  for (const s of stops) {
    if (!Number.isInteger(s) || s < 0 || s >= world.provinceCount) return "no such province";
    const name = world.rules.provinces[s]!.name;
    if (!isTradeStop(world, s, kind)) return isShip(kind) ? `${name} has no harbour` : `${name} is not a city or a market town`;
    if (!traderMayEnter(world, n, s)) return `your traders can't enter ${name}`;
  }
  return null;
}

/** A route a trader could take from a city: where it goes, its loop, and what it brings. */
export interface RouteOption {
  stops: number[];
  path: number[];
  estimate: RouteEstimate;
}

/**
 * The routes a trader of this kind could take from `from`: to each of the likeliest cities within reach (those
 * with the most to trade), there and back along the planned way, best first (TRADE-113, TRADE-148). `floor` and
 * `self` are estimateLoop's.
 */
export function routeOptions(world: World, n: number, kind: GameTraderKind, from: number, floor = 0, self: readonly number[] = []): RouteOption[] {
  const ship = isShip(kind);
  // Reach is the land's in a pack caravan's days: a quicker kind goes no further in provinces.
  const reach = ship ? G.ai_reach_days_sea : (G.ai_reach_days_land * (kind === "pack_caravan" ? 1 : config.land_traders[kind].step_factor)) / config.land_traders.pack_caravan.step_factor;
  const around = plan(world, n, kind, from, reach);
  const ways = around.reached
    .filter((c) => c !== from && isTradeStop(world, c, kind))
    .sort((a, b) => tradeValueAt(world, b, ship) - tradeValueAt(world, a, ship))
    .slice(0, G.ai_candidates * 3)
    .map((c) => ({ c, way: pathTo(around, c)! }));
  return ways
    .map(({ c, way }) => {
      const path = [...way, ...way.slice(1, -1).reverse()];
      return { stops: [from, c], path, estimate: estimateLoop(world, n, kind, path, floor, self) };
    })
    .filter((o) => o.estimate.expected > 0)
    .sort((x, y) => y.estimate.expected - x.estimate.expected);
}

/**
 * The best route the AI finds for a trader from `home`: the city within reach whose way there and back, through the
 * most populated land, brings the most gold; a city another of the realm's traders already runs to counts half (TRADE-113, D-TRADE-21).
 */
export function bestRoute(world: World, n: number, kind: GameTraderKind, home: number, taken: ReadonlySet<number> = new Set(), self: readonly number[] = []): number[] | null {
  let best: { c: number; s: number } | null = null;
  for (const o of routeOptions(world, n, kind, home, G.ai_ratio_floor, self)) {
    const s = o.estimate.expected * (taken.has(o.stops[1]!) ? 0.5 : 1);
    if (!best || s > best.s) best = { c: o.stops[1]!, s };
  }
  return best ? [home, best.c] : null;
}

/** Better routes for a trader, from where its route starts and from its home, cached for the month (TRADE-148). */
const suggestCache = new WeakMap<World, Map<number, { key: string; list: RouteSuggestion[] }>>();

export interface RouteSuggestion {
  stops: number[];
  expected: number;
  loopDays: number;
  /** Gold a month more than its route now. */
  gain: number;
}

export function suggestRoutes(world: World, t: GameTrader, now: number): RouteSuggestion[] {
  const g = world.diplomacy;
  const key = `${world.date.year * 12 + world.date.month}|${g.wars.length}|${g.seq}|${t.stops.join()}|${t.home}|${now.toFixed(3)}`;
  let m = suggestCache.get(world);
  if (!m) suggestCache.set(world, (m = new Map()));
  const hit = m.get(t.id);
  if (hit?.key === key) return hit.list;
  const self = peekPath(world, t);
  const froms = [...new Set([t.stops[0] ?? t.home, t.home])];
  const seen = new Set([t.stops.join()]);
  const list: RouteSuggestion[] = [];
  const S = G.suggest;
  for (const o of froms.flatMap((f) => routeOptions(world, t.owner, t.kind, f, 0, self)).sort((x, y) => y.estimate.expected - x.estimate.expected)) {
    const k = o.stops.join(), back = [...o.stops].reverse().join();
    if (seen.has(k) || seen.has(back)) continue;
    seen.add(k);
    const gain = o.estimate.expected - now;
    if (gain < S.min_gain || gain < now * S.min_gain_share) break;
    list.push({ stops: o.stops, expected: o.estimate.expected, loopDays: o.estimate.loopDays, gain });
    if (list.length >= S.count) break;
  }
  m.set(t.id, { key, list });
  return list;
}

// ---------------------------------------------------------------- founding and orders

/** Why realm n can't found this kind in `city`, or null (TRADE-003, TRADE-016, TRADE-017, D-TRADE-2, D-TRADE-12). */
export function foundProblem(world: World, n: number, city: number, kind: GameTraderKind): string | null {
  if (!TRADER_KINDS.includes(kind)) return "no such trader";
  if (city < 0 || city >= world.provinceCount || world.provinceOwner[city] !== n) return "not your city";
  if (world.provinceOccupier[city]! >= 0) return "the city is occupied";
  const row = kindRow(world, kind);
  if (isShip(kind)) {
    if (!isPort(world, city)) return "needs a harbour";
  } else if (marketStep(world, city) === 0) return "needs a market";
  // Without F03 *Riding and pack animals* a realm sends no camel caravans (RSCH-094).
  if (kind === "camel_caravan" && withoutOf(world, n).noCaravans) return "needs Riding and pack animals";
  if (kind === "camel_caravan" && !DESERT.includes(world.provinceGround[city] ?? "") && !knows(world, n, "T1")) return "needs desert or drylands, or Caravanserai networks";
  if (kind === "river_barge" && !world.provinceRiver[city]) return "needs a river";
  const cls = isShip(kind) ? SEAFOLK : MARKET_FOLK;
  if (world.provinceClasses[city * CLASS_COUNT + cls]! * 1000 < row.crew) return `needs ${row.crew} ${row.crewClass}`;
  if (world.nationTreasury[n]! < row.gold) return `needs ${Math.ceil(row.gold * 10) / 10} gold`;
  return null;
}

function addTrader(world: World, n: number, home: number, kind: GameTraderKind, stops: number[]): GameTrader {
  const t: GameTrader = { id: ++world.traderSeq, kind, owner: n, home, stops, purse: 0, at: 0, days: 0, lastMonth: 0, thisMonth: 0, lastDeposit: 0, lastDepositCity: -1, unpaid: 0, blocked: -1, chosen: false, path: [], marked: [], src: [], srcLast: [], fees: 0, feesLast: 0 };
  world.traders.push(t);
  return t;
}

/** Founds a trader in an own city: its gold paid, its crew leaving the city, the best route chosen for it to start on (TRADE-003). */
export function foundTrader(world: World, n: number, city: number, kind: GameTraderKind, stops?: number[]): string | null {
  const why = foundProblem(world, n, city, kind);
  if (why) return why;
  const row = kindRow(world, kind);
  world.nationTreasury[n] = world.nationTreasury[n]! - row.gold;
  const cls = isShip(kind) ? SEAFOLK : MARKET_FOLK;
  world.provinceClasses[city * CLASS_COUNT + cls] = world.provinceClasses[city * CLASS_COUNT + cls]! - row.crew / 1000;
  world.provincePopulation[city] = world.provincePopulation[city]! - row.crew / 1000;
  const taken = new Set<number>();
  for (const o of world.traders) if (o.owner === n) o.stops.forEach((x) => taken.add(x));
  addTrader(world, n, city, kind, stops ?? bestRoute(world, n, kind, city, taken) ?? []);
  return null;
}

/** Sets a trader's route: where it starts and where it goes, walked there and back along the planner's way (TRADE-050, TRADE-051, D-TRADE-21). */
export function setTradeRoute(world: World, n: number, id: number, stops: number[]): string | null {
  const t = world.traders.find((x) => x.id === id);
  if (!t || t.owner !== n) return "not your trader";
  const why = routeProblem(world, n, t.kind, stops);
  if (why) return why;
  if (!loopPath(world, n, t.kind, stops)) return "no way between those cities";
  // It walks from wherever it stands to its first stop.
  const here = pathOf(world, t)[t.at] ?? t.home;
  t.stops = stops.slice();
  t.chosen = true;
  t.blocked = -1;
  t.path = [];
  const path = pathOf(world, t);
  const at = path.indexOf(here);
  t.at = at >= 0 ? at : 0;
  t.days = 0;
  // A new route starts a new trip: where its gold comes from is counted afresh.
  t.src = [];
  t.srcLast = [];
  t.fees = 0;
  t.feesLast = 0;
  if (world.tradeDraft?.trader === id) world.tradeDraft = null;
  return null;
}

/** Keeps the player's route being drawn, for its preview (TRADE-054, TRADE-096); empty stops clear it. */
export function draftTradeRoute(world: World, n: number, id: number, stops: number[]): string | null {
  if (!stops.length) return ((world.tradeDraft = null), null);
  const t = world.traders.find((x) => x.id === id);
  if (!t || t.owner !== n) return "not your trader";
  world.tradeDraft = { trader: id, stops: stops.slice(0, config.route.max_stops) };
  return null;
}

function removeTrader(world: World, t: GameTrader): void {
  world.traders.splice(world.traders.indexOf(t), 1);
  t.path = [];
  if (world.tradeDraft?.trader === t.id) world.tradeDraft = null;
}

/** Dismisses a trader: its crew go back to its home city (TRADE-006). */
export function dismissTrader(world: World, n: number, id: number): string | null {
  const t = world.traders.find((x) => x.id === id);
  if (!t || t.owner !== n) return "not your trader";
  const row = kindRow(world, t.kind);
  const cls = isShip(t.kind) ? SEAFOLK : MARKET_FOLK;
  if (world.provinceOwner[t.home] === n) {
    world.provinceClasses[t.home * CLASS_COUNT + cls] = world.provinceClasses[t.home * CLASS_COUNT + cls]! + row.crew / 1000;
    world.provincePopulation[t.home] = world.provincePopulation[t.home]! + row.crew / 1000;
  }
  removeTrader(world, t);
  return null;
}

// ---------------------------------------------------------------- the AI and the start

/**
 * Once a year the AI sets each trader on its best route, and founds one more where a route beats upkeep by its
 * margin (TRADE-113 to TRADE-115); a twelfth of the traders and realms each month, so no month carries it all.
 */
function aiTrade(world: World): void {
  const turn = world.date.month - 1;
  const count = new Int32Array(world.nationCount);
  for (const t of world.traders) count[t.owner]!++;
  for (const t of world.traders) {
    if (t.owner === world.player || t.id % 12 !== turn) continue;
    // A loop that pays well enough is kept; the AI looks for another when it pays little or is broken.
    const row = kindRow(world, t.kind);
    const self = pathOf(world, t);
    if (t.blocked < 0 && t.stops.length >= 2 && estimateLoop(world, t.owner, t.kind, self, 0, self).expected >= row.upkeep * G.ai_keep_route_over_upkeep) continue;
    const taken = new Set<number>();
    for (const o of world.traders) if (o.owner === t.owner && o !== t) o.stops.forEach((x) => taken.add(x));
    const stops = bestRoute(world, t.owner, t.kind, t.home, taken, self);
    if (stops && stops.join() !== t.stops.join()) {
      t.stops = stops;
      t.path = [];
      t.at = 0;
    }
  }
  for (let n = 0; n < world.nationCount; n++) {
    // A realm the catalogue gives no trade access founds none in this slice (D-TRADE-20).
    const start = startCount(world, n);
    if (n % 12 !== turn || n === world.player || world.nationGone[n] || start === 0 || count[n]! >= G.ai_max_traders_per_start * start + 1) continue;
    const home = homes(world, n)[0];
    if (home === undefined) continue;
    const kind = kindFor(world, n, home, count[n]!);
    const row = kindRow(world, kind);
    if (world.nationTreasury[n]! < row.gold * G.ai_found_reserve || foundProblem(world, n, home, kind)) continue;
    const taken = new Set<number>();
    for (const o of world.traders) if (o.owner === n) o.stops.forEach((x) => taken.add(x));
    const stops = bestRoute(world, n, kind, home, taken);
    if (!stops) continue;
    const path = loopPath(world, n, kind, stops);
    if (!path || estimateLoop(world, n, kind, path).expected < row.upkeep * config.ai.found_margin) continue;
    if (!foundProblem(world, n, home, kind)) foundTrader(world, n, home, kind, stops);
  }
}

/** Traders a realm starts with, by its catalogue trade access (TRADE-110). */
export function startCount(world: World, n: number): number {
  const level = realmAssessment(world.nationIds[n]!, "trade_access") as keyof typeof config.start.traders_by_trade_access;
  return config.start.traders_by_trade_access[level] ?? 0;
}

/** A realm's trade cities that can found traders, its capital first, then by goods. */
function homes(world: World, n: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.provinceTradeCity[p]! > 0 && (marketStep(world, p) > 0 || isPort(world, p))) out.push(p);
  const cap = world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1;
  return out.sort((a, b) => (b === cap ? 1 : 0) - (a === cap ? 1 : 0) || world.provinceGoodsValue[b]! - world.provinceGoodsValue[a]!);
}

/** The kind realm n's i-th trader from this home is: a ship from every other port, a camel caravan from the desert (a pack caravan without F03, RSCH-094), a barge on a river (TRADE-111). */
function kindFor(world: World, n: number, home: number, i: number): GameTraderKind {
  if (isPort(world, home) && (i % 2 === 1 || marketStep(world, home) === 0)) return "cog_junk_dhow";
  if (DESERT.includes(world.provinceGround[home] ?? "") && !withoutOf(world, n).noCaravans) return "camel_caravan";
  if (world.provinceRiver[home] && i % 3 === 2) return "river_barge";
  return "pack_caravan";
}

const byName = (world: World) => {
  const m = new Map<string, number>();
  world.rules.provinces.forEach((p, i) => {
    if (!world.provinceWater[i] && !m.has(p.name.toLowerCase())) m.set(p.name.toLowerCase(), i);
  });
  return m;
};

/**
 * The 1444 start: each realm's starting traders from its trade access, on the hand-made routes where their
 * cities are on the map and otherwise on the AI's best routes, then two years of their walking to set the
 * starting ratios (TRADE-110 to TRADE-112).
 */
export function seedTrade(world: World): void {
  refreshTradeValues(world);
  const names = byName(world);
  const nationByName = new Map(world.rules.nations.map((x, i) => [x.name.toLowerCase(), i]));
  const used = new Int32Array(world.nationCount);
  for (const r of config.start.routes) {
    const n = nationByName.get(r.country.toLowerCase());
    if (n === undefined || used[n]! >= startCount(world, n)) continue;
    const stops = r.stops.map((s) => names.get(s.toLowerCase()) ?? -1);
    if (stops.some((s) => s < 0) || world.provinceOwner[stops[0]!] !== n) continue;
    const ship = "label" in r && /galley|dhow|junk|cog/.test(r.label ?? "") ? true : !("label" in r) || !/caravan/.test(r.label ?? "");
    // A realm without F03 walks a camel route with a pack caravan (RSCH-094).
    const kind: GameTraderKind = ship ? "cog_junk_dhow" : /camel/.test(r.label ?? "") && !withoutOf(world, n).noCaravans ? "camel_caravan" : "pack_caravan";
    if (routeProblem(world, n, kind, stops) || !loopPath(world, n, kind, stops)) continue;
    addTrader(world, n, stops[0]!, kind, stops).chosen = true;
    used[n]!++;
  }
  for (let n = 0; n < world.nationCount; n++) {
    const h = homes(world, n);
    const taken = new Set<number>();
    for (const t of world.traders) if (t.owner === n) t.stops.forEach((s) => taken.add(s));
    // Each trader from the next of the realm's best cities that has a loop to walk; none where none has.
    let tries = 0;
    for (let i = used[n]!; i < startCount(world, n) && tries < h.length * 2; tries++) {
      const home = h[tries % Math.min(h.length, 4)]!;
      const kind = kindFor(world, n, home, i);
      const stops = bestRoute(world, n, kind, home, taken);
      if (!stops) continue;
      stops.forEach((s) => taken.add(s));
      addTrader(world, n, home, kind, stops);
      i++;
    }
  }
  for (let m = 1; m < config.start.warmup_months; m++) tradeMonth(world, false);
  // The warm-up's last month counts, so the ledger opens with a month of trade in it.
  for (const t of world.traders) t.purse = 0;
  tradeMonth(world, true);
  for (const t of world.traders) world.nationTrade[t.owner * 3 + 2] = world.nationTrade[t.owner * 3 + 2]! + kindRow(world, t.kind).upkeep;
}

// ---------------------------------------------------------------- what the player sees

export interface TraderView {
  id: number;
  kind: GameTraderKind;
  name: string;
  home: number;
  stops: number[];
  purse: number;
  purseMax: number;
  /** The province it stands in, and its loop for the map (provinces in order). */
  at: number;
  path: number[];
  pathAt: number;
  /** Gold a month its loop brings at this month's ratios, and its upkeep. */
  expected: number;
  upkeep: number;
  loopDays: number;
  /** Gold it deposited last month, its last deposit and where. */
  lastMonth: number;
  lastDeposit: number;
  lastDepositCity: number;
  problem: string | null;
  /** The stop it walks toward and the days left to it, the next province and the days left to that (TRADE-146). */
  heading: number;
  headingDays: number;
  next: number;
  nextDays: number;
  /** Where its gold came from on its last whole trip there and back (this one's so far until then), gold kept, best first; and the market fees it paid. */
  sources: { province: number; gold: number }[];
  sourcesTrip: "last" | "this";
  fees: number;
  /** Better routes, best first (TRADE-148). */
  better: RouteSuggestion[];
}

export interface FoundOption {
  city: number;
  kinds: { kind: GameTraderKind; name: string; gold: number; upkeep: number; why: string | null }[];
}

export interface TradeView {
  /** Last month: deposits, market fees received, traders' upkeep, and the Trade line they make. */
  deposits: number;
  fees: number;
  upkeep: number;
  net: number;
  traders: TraderView[];
  /** Own cities that can found traders, with each kind and why not. */
  found: FoundOption[];
  /** The realm's busiest trade cities: value, ratio and traders passing. */
  centres: { province: number; value: number; ratio: number; passing: number }[];
  /** The route being drawn: its stops, whether it can be set, and its preview; with where it starts chosen, the cities it could go to and what each brings (TRADE-149). */
  draft: ({ trader: number; stops: number[]; why: string | null; path: number[]; options: { city: number; expected: number; loopDays: number }[] } & RouteEstimate) | null;
  /** This month so far: gold deposited and market fees taken; gold carried in the traders' purses (TRADE-150). */
  depositsNow: number;
  feesNow: number;
  onRoad: number;
  /** Where the realm's trade gold comes from: each province's gold a month over its traders' last trips, best first, and their total and the market fees paid a month (TRADE-150). */
  sources: { province: number; gold: number }[];
  sourcesTotal: number;
  sourcesFees: number;
}

/** Gold-and-province pairs as a list, best first. */
const pairs = (src: readonly number[]) => {
  const out: { province: number; gold: number }[] = [];
  for (let i = 0; i < src.length; i += 2) out.push({ province: src[i]!, gold: src[i + 1]! });
  return out.sort((a, b) => b.gold - a.gold);
};

/** Days a trader has left to walk to path index `to` from where it stands. */
function daysTo(world: World, t: GameTrader, path: readonly number[], to: number): number {
  let d = -t.days;
  for (let i = t.at; i !== to; i = (i + 1) % path.length) d += stepDays(world, t.kind, path[(i + 1) % path.length]!);
  return Math.max(0, Math.round(d));
}

/** Options a route being drawn offers from where it starts, cached while the month and the start stay (TRADE-149). */
const optionCache = new WeakMap<World, { key: string; list: { city: number; expected: number; loopDays: number }[] }>();
function draftOptions(world: World, t: GameTrader, from: number): { city: number; expected: number; loopDays: number }[] {
  const key = `${world.date.year * 12 + world.date.month}|${world.diplomacy.seq}|${t.id}|${from}`;
  const hit = optionCache.get(world);
  if (hit?.key === key) return hit.list;
  const list = routeOptions(world, t.owner, t.kind, from, 0, peekPath(world, t))
    .slice(0, G.suggest.draft_options)
    .map((o) => ({ city: o.stops[1]!, expected: o.estimate.expected, loopDays: o.estimate.loopDays }));
  optionCache.set(world, { key, list });
  return list;
}

export function tradeView(world: World, n: number): TradeView {
  const dpm = world.rules.defines.march.daysPerMonth;
  const realmSrc = new Map<number, number>();
  let realmFees = 0, onRoad = 0;
  const traders = world.traders
    .filter((t) => t.owner === n)
    .map((t): TraderView => {
      const path = peekPath(world, t);
      const row = kindRow(world, t.kind);
      const est = estimateLoop(world, n, t.kind, path, 0, path);
      const at = Math.min(t.at, path.length - 1);
      const turn = t.stops.length >= 2 ? path.indexOf(t.stops[1]!) : -1;
      const toward = turn < 0 ? 0 : at < turn ? turn : 0;
      const last = t.srcLast.length > 0;
      const sources = pairs(last ? t.srcLast : t.src);
      const fees = last ? t.feesLast : t.fees;
      // The realm's sources are each trader's last trip as gold a month, or this one so far while it is on its first.
      if (sources.length && est.loopDays > 0) {
        const months = Math.max(est.loopDays, 1) / dpm;
        for (const x of sources) realmSrc.set(x.province, (realmSrc.get(x.province) ?? 0) + x.gold / months);
        realmFees += fees / months;
      }
      onRoad += t.purse;
      return {
        id: t.id, kind: t.kind, name: row.name, home: t.home, stops: t.stops.slice(), purse: t.purse, purseMax: row.purse,
        at: path[at] ?? t.home, path: path.slice(), pathAt: at, expected: est.expected, upkeep: row.upkeep, loopDays: est.loopDays,
        lastMonth: t.lastMonth, lastDeposit: t.lastDeposit, lastDepositCity: t.lastDepositCity,
        problem: t.blocked >= 0 ? `the way to ${world.rules.provinces[t.blocked]!.name} is closed` : (t.stops.length < 2 ? "no route: it waits at home" : est.deposits === 0 ? "no city of yours on its route to deposit in" : null),
        heading: path.length > 1 ? path[toward]! : t.home,
        headingDays: path.length > 1 ? daysTo(world, t, path, toward) : 0,
        next: path.length > 1 ? path[(at + 1) % path.length]! : t.home,
        nextDays: path.length > 1 ? daysTo(world, t, path, (at + 1) % path.length) : 0,
        sources, sourcesTrip: last ? "last" : "this", fees,
        // A trader with no route or a shut way is offered any route that pays.
        better: suggestRoutes(world, t, t.stops.length < 2 || t.blocked >= 0 ? 0 : est.expected),
      };
    })
    .sort((a, b) => b.expected - a.expected);
  const found: FoundOption[] = [];
  const centres: TradeView["centres"] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceTradeCity[p] === 0) continue;
    centres.push({ province: p, value: tradeValueAt(world, p), ratio: world.provinceTradeRatio[p]!, passing: world.provincePassed[p]! });
    if (marketStep(world, p) === 0 && !isPort(world, p)) continue;
    found.push({ city: p, kinds: TRADER_KINDS.map((kind) => ({ kind, name: KIND_NAME[kind], gold: kindRow(world, kind).gold, upkeep: kindRow(world, kind).upkeep, why: foundProblem(world, n, p, kind) })) });
  }
  centres.sort((a, b) => b.value * (b.ratio + 1) - a.value * (a.ratio + 1));
  found.sort((a, b) => tradeValueAt(world, b.city) - tradeValueAt(world, a.city));
  let draft: TradeView["draft"] = null;
  const d = world.tradeDraft;
  const dt = d && world.traders.find((t) => t.id === d.trader && t.owner === n);
  if (d && dt) {
    const why = d.stops.length >= 2 ? routeProblem(world, n, dt.kind, d.stops) : null;
    const path = !why && d.stops.length >= 2 ? loopPath(world, n, dt.kind, d.stops, false) : null;
    const est = path ? estimateLoop(world, n, dt.kind, path, 0, peekPath(world, dt)) : { loopDays: 0, collectIn: 0, best: [], expected: 0, fees: 0, deposits: 0 };
    const options = d.stops.length >= 1 && isTradeStop(world, d.stops[0]!, dt.kind) ? draftOptions(world, dt, d.stops[0]!) : [];
    draft = { trader: d.trader, stops: d.stops.slice(), why: why ?? (d.stops.length >= 2 && !path ? "no way between those cities" : null), path: path ?? [], options, ...est };
  }
  const sources = [...realmSrc].map(([province, gold]) => ({ province, gold })).sort((a, b) => b.gold - a.gold);
  return {
    deposits: world.nationTrade[n * 3]!, fees: world.nationTrade[n * 3 + 1]!, upkeep: world.nationTrade[n * 3 + 2]!, net: tradeLine(world, n), traders, found, centres: centres.slice(0, 8), draft,
    depositsNow: world.nationTradeNow[n * 2]!, feesNow: world.nationTradeNow[n * 2 + 1]!, onRoad,
    sources: sources.slice(0, 8), sourcesTotal: sources.reduce((a, x) => a + x.gold, 0), sourcesFees: realmFees,
  };
}

/** What every realm's map may show of trade: provinces it sees (its own and those on its traders' loops, D-TRADE-13). */
export function tradeSeen(world: World, n: number): Uint8Array {
  const seen = new Uint8Array(world.provinceCount);
  if (n < 0) return seen;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) seen[p] = 1;
  for (const t of world.traders) if (t.owner === n) for (const p of peekPath(world, t)) seen[p] = 1;
  return seen;
}

/** A trader as the map draws it: the leg it walks and how far along, from the daily walk (VIEW-132). */
export interface TraderWalk {
  id: number;
  owner: number;
  medium: "land" | "river" | "sea";
  /** The province it stands in and the next on its loop (the same while it waits at home). */
  from: number;
  to: number;
  /** Share of the way to the next province walked, 0 to 1. */
  progress: number;
  /** The tiles of the leg over land, from the centre of one province to the next, as an army walks it; empty at sea. */
  tiles: Int32Array;
  /** Whether it is the realm's own trader, whose card a tap opens. */
  mine: boolean;
}

/** The pace a trader's leg is drawn at: a small company, no commander. */
const LEG_COMPANY = { men: 1, horse: 0, logistics: 0 };
const NO_TILES = new Int32Array(0);
const legTilesCache = new WeakMap<World, Map<number, Int32Array>>();

/** The tiles of a land leg between two provinces' centres, as an army walks it province by province; cached, since the map does not change. */
function legTiles(world: World, a: number, b: number): Int32Array {
  if (a === b || world.provinceWater[a] || world.provinceWater[b]) return NO_TILES;
  let m = legTilesCache.get(world);
  if (!m) legTilesCache.set(world, (m = new Map()));
  const key = a * world.provinceCount + b;
  let tiles = m.get(key);
  if (!tiles) {
    const g = world.tiles;
    const from = g.centre[a]!, to = g.centre[b]!;
    if (from < 0 || to < 0) tiles = NO_TILES;
    else if (g.coarse) tiles = Int32Array.of(from, to);
    else {
      const allowed = new Uint8Array(world.provinceCount);
      allowed[a] = 1;
      allowed[b] = 1;
      const march = { d: world.rules.defines.march, grid: g, population: world.provincePopulation, temperature: world.provinceTemperature, rowWidth: world.rowWidth, roadHours: world.provinceRoadHours };
      const walk = planTilePath(march, from, to, allowed, LEG_COMPANY, 1.6);
      tiles = walk ? Int32Array.from([from, ...walk.tiles]) : Int32Array.of(from, to);
    }
    m.set(key, tiles);
  }
  return tiles;
}

/**
 * Where realm n may see traders walk on the map: every trader on a leg that enters a province whose trade
 * the realm sees (D-TRADE-13), its own first, at most `max`; with no realm, every trader. Read from the daily
 * walk, so a trader is drawn where the game has it. Planned without keeping, so looking never changes the game.
 */
export function traderWalks(world: World, n: number, max: number, seen: Uint8Array | null = n >= 0 ? tradeSeen(world, n) : null): TraderWalk[] {
  const out: TraderWalk[] = [];
  const order = n >= 0 ? [...world.traders.filter((t) => t.owner === n), ...world.traders.filter((t) => t.owner !== n)] : world.traders;
  for (const t of order) {
    if (out.length >= max) break;
    const path = peekPath(world, t);
    const at = Math.min(t.at, path.length - 1);
    const from = path[at]!;
    const to = path.length > 1 ? path[(at + 1) % path.length]! : from;
    if (seen && !seen[from] && !seen[to]) continue;
    const cost = to === from ? Infinity : stepDays(world, t.kind, to);
    const progress = Number.isFinite(cost) && cost > 0 ? Math.min(1, t.days / cost) : 0;
    const medium = isShip(t.kind) ? "sea" : t.kind === "river_barge" ? "river" : "land";
    out.push({ id: t.id, owner: t.owner, medium, from, to, progress, tiles: medium === "sea" ? NO_TILES : legTiles(world, from, to), mine: t.owner === n });
  }
  return out;
}

// ---------------------------------------------------------------- saves

/** A trader as saved: its kind by number, so no build text reaches the save. */
export type SavedTrader = Omit<GameTrader, "kind" | "marked" | "src" | "srcLast" | "fees" | "feesLast"> & { kind: number; marked?: number[]; src?: number[]; srcLast?: number[]; fees?: number; feesLast?: number };

export interface SavedTrade {
  traders: SavedTrader[];
  traderSeq: number;
  /** This month's deposits and fees so far, by realm (2 per realm); absent in saves from before traders walked daily. */
  now?: number[];
}

/** By province: trade ratio, goods value a year, weight and trade stop as counted last January, and this month's traders passing and visits so far. */
export function tradeProvinceArrays(world: World): Record<string, Float32Array | Uint8Array | Int32Array> {
  return { tradeRatio: world.provinceTradeRatio, tradeGoods: world.provinceGoodsValue, tradeWeight: world.provinceWeight, tradeCity: world.provinceTradeCity, tradePassing: world.provincePassing, tradeVisits: Int32Array.from(world.provinceVisits), tradeVisitsLast: Uint8Array.from(world.provinceVisitsLast, (v) => Math.min(255, v)) };
}

export function saveTrade(world: World): SavedTrade {
  return {
    traders: world.traders.map((t) => ({ ...t, kind: TRADER_KINDS.indexOf(t.kind), stops: t.stops.slice(), path: t.path.slice(), marked: t.marked.slice(), src: t.src.slice(), srcLast: t.srcLast.slice() })),
    traderSeq: world.traderSeq,
    now: Array.from(world.nationTradeNow),
  };
}

/**
 * Brings trade back from a save: `prov` holds the province arrays by old index, `last` each old
 * realm's deposits, fees and upkeep of last month.
 */
export function restoreTrade(world: World, s: SavedTrade, prov: Partial<Record<string, ArrayLike<number>>>, last: ArrayLike<number> | undefined, mapN: (old: number) => number, mapP: (old: number) => number): void {
  // The numbers trade runs on are last January's, as saved; the goods for the screens are counted when asked for.
  world.provinceGoods = new Array(world.provinceCount);
  world.provinceTradeRatio.fill(0);
  const filled = new Uint8Array(world.provinceCount);
  const { tradeRatio: ratio, tradeGoods: goods, tradeWeight: weight, tradeCity: city, tradePassing: passing, tradeVisits: visits, tradeVisitsLast: visitsLast } = prov;
  world.provincePassing.fill(0);
  world.provinceVisits.fill(0);
  world.provinceVisitsLast.fill(0);
  world.tradeFeed = [];
  if (ratio) for (let old = 0; old < ratio.length; old++) {
    const p = mapP(old);
    if (p < 0) continue;
    world.provinceTradeRatio[p] = ratio[old]!;
    if (goods) world.provinceGoodsValue[p] = goods[old]!;
    if (weight) world.provinceWeight[p] = weight[old]!;
    if (city) world.provinceTradeCity[p] = city[old]!;
    if (passing) world.provincePassing[p] = passing[old]!;
    if (visits) world.provinceVisits[p] = visits[old]!;
    if (visitsLast) world.provinceVisitsLast[p] = visitsLast[old]!;
    filled[p] = 1;
  }
  // A province the save did not know is counted now.
  for (let p = 0; p < world.provinceCount; p++) if (!filled[p] && !world.provinceWater[p]) refreshProvince(world, p);
  world.nationTrade.fill(0);
  if (last) for (let old = 0; old * 3 < last.length; old++) {
    const n = mapN(old);
    if (n >= 0) for (let k = 0; k < 3; k++) world.nationTrade[n * 3 + k] = last[old * 3 + k]!;
  }
  world.nationTradeNow.fill(0);
  if (s.now) for (let old = 0; old * 2 < s.now.length; old++) {
    const n = mapN(old);
    if (n >= 0) for (let k = 0; k < 2; k++) world.nationTradeNow[n * 2 + k] = s.now[old * 2 + k]!;
  }
  world.traders = [];
  for (const t of s.traders) {
    const owner = mapN(t.owner);
    const home = mapP(t.home);
    if (owner < 0 || home < 0) continue;
    const stops = t.stops.map(mapP);
    const path = (t.path ?? []).map(mapP);
    const ok = stops.every((x) => x >= 0) && path.every((x) => x >= 0);
    const kind = TRADER_KINDS[t.kind];
    if (!kind) continue;
    world.traders.push({ ...t, kind, blocked: t.blocked >= 0 ? mapP(t.blocked) : -1, owner, home, stops: ok ? stops : [], path: ok ? path : [], at: ok ? t.at : 0, marked: (t.marked ?? []).map(mapP).filter((q) => q >= 0), src: srcOf(t.src, mapP), srcLast: srcOf(t.srcLast, mapP), fees: t.fees ?? 0, feesLast: t.feesLast ?? 0, lastDepositCity: t.lastDepositCity >= 0 ? mapP(t.lastDepositCity) : -1 });
  }
  world.traderSeq = s.traderSeq;
}

/** Saved sources with their provinces mapped; a pair whose province is gone is dropped. */
function srcOf(src: readonly number[] | undefined, mapP: (old: number) => number): number[] {
  const out: number[] = [];
  if (src) for (let i = 0; i + 1 < src.length; i += 2) {
    const p = mapP(src[i]!);
    if (p >= 0) out.push(p, src[i + 1]!);
  }
  return out;
}

/** Numbers for the world's hash: ratios and every trader. */
export function tradeHashData(world: World): Float64Array {
  return new Float64Array(world.traders.flatMap((t) => [t.id, TRADER_KINDS.indexOf(t.kind), t.owner, t.home, t.at, t.days, t.purse, ...t.stops]));
}
