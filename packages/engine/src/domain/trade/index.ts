import config from "../../../../rules/data/domain/trade.json" with { type: "json" };
import navalConfig from "../../../../rules/data/domain/naval.json" with { type: "json" };
import movementConfig from "../../../../rules/data/domain/troop-movement.json" with { type: "json" };
import type { Rng } from "../../rng.ts";

/**
 * Trade (TRADE): traders and trade ships carry a purse along routes between
 * cities, make every province they pass busier, collect on entering and
 * deposit in their own country's cities. Pure rules over plain data; the day
 * loop and the shared route planner live in troop-movement.
 */
export const tradeConfig = config;
export type TradeConfig = typeof config;

// ---------------------------------------------------------------- kinds

export type LandKind = keyof typeof config.land_traders;
export type SeaKind = keyof typeof config.sea_traders;
export type TraderKind = LandKind | SeaKind;

export function isLandKind(kind: string): kind is LandKind {
  return kind in config.land_traders;
}

export function isSeaKind(kind: string): kind is SeaKind {
  return kind in config.sea_traders;
}

/** The ship types the 1444 trade ship goes by in different seas. */
const shipAliases: Record<string, SeaKind> = { cog: "cog_junk_dhow", junk: "cog_junk_dhow", dhow: "cog_junk_dhow", merchantman: "fluyt", "merchant galley": "galley" };

/** A kind from its name in plain words ("pack caravan", "cog / junk / dhow", "galley"). */
export function kindOf(name: string): TraderKind {
  const key = name.trim().toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_");
  if (isLandKind(key) || isSeaKind(key)) return key;
  const alias = shipAliases[name.trim().toLowerCase()];
  if (alias) return alias;
  throw new Error(`Unknown trader kind: ${name}`);
}

export interface KindStats {
  hold: number;
  purse: number;
  upkeep: number;
  /** Land kinds only. */
  era?: number;
  found?: number;
  crew?: { class: string; count: number };
}

/** A trade ship's upkeep is its naval upkeep (D-TRADE-5): naval owns what a ship costs. */
export function shipUpkeep(kind: SeaKind): number {
  const row = (navalConfig.ships as Record<string, { upkeep: number }>)[config.sea_traders[kind].naval_type];
  if (!row) throw new Error(`no naval ship for ${kind}`);
  return row.upkeep;
}

/** Hold, purse, upkeep (and for land kinds era, founding gold and crew) of a kind. S2 adds to ships' hold. */
export function kindStats(kind: TraderKind, inventions: ReadonlySet<string> = new Set()): KindStats {
  if (isLandKind(kind)) {
    const k = config.land_traders[kind];
    return { hold: k.hold, purse: k.purse, upkeep: k.upkeep, era: k.era, found: k.found, crew: { ...k.crew } };
  }
  const k = config.sea_traders[kind];
  return { hold: k.hold + (inventions.has("S2") ? config.s2_hold_bonus : 0), purse: k.purse, upkeep: shipUpkeep(kind) };
}

/** Whether a ship type can be set to trade: naval gives it a hold and purse (the caravel has none, D-TRADE-5). */
export function shipCanTrade(shipType: string): boolean {
  try {
    return isSeaKind(kindOf(shipType));
  } catch {
    return false;
  }
}

export type Ground = string;

/** Days a land trader takes to cross a province an army crosses in `armyDays`. */
export function traderStepDays(kind: LandKind, armyDays: number, ground: Ground): number {
  const k = config.land_traders[kind];
  if ("desert_step_factor" in k && k.desert_grounds.includes(ground)) return armyDays * k.desert_step_factor;
  if ("step_factor" in k) return armyDays * k.step_factor;
  throw new Error(`${kind} moves by rail days`);
}

/**
 * Army days to cross a province on a road step, by troop-movement's road factors: B2 and later road
 * inventions make land traders faster exactly as they make armies faster (TRADE-101).
 */
export function armyDaysOnRoad(baseDays: number, road: "track" | "road" | "paved road" | "turnpike" | "railway"): number {
  return baseDays * movementConfig.roadFactor[road];
}

/** Traders move by the army step-day rules but never take march orders, guns or a column penalty. */
export const traderMovement = { marchOrders: false, columnPenalty: false, guns: false } as const;

/** A pass closed by snow is closed to every trader. */
export function mayUsePass(pass: { snowedIn: boolean }): boolean {
  return !pass.snowedIn;
}

export function mayFoundCamelCaravan(inventions: ReadonlySet<string>, homeGround: Ground): boolean {
  return inventions.has("T1") || config.land_traders.camel_caravan.desert_grounds.includes(homeGround);
}

/** Road steps as the buildings context lists them. */
export const roadSteps = ["none", "track", "road", "paved_road", "turnpike", "railway"] as const;
export type RoadStep = (typeof roadSteps)[number];

export function mayFoundWagonTrain(inventions: ReadonlySet<string>, homeRoad: RoadStep): boolean {
  return inventions.has("B9") && roadSteps.indexOf(homeRoad) >= roadSteps.indexOf("paved_road");
}

/** Wagon trains move only on land with at least a road. */
export function wagonMayEnter(road: RoadStep): boolean {
  return roadSteps.indexOf(road) >= roadSteps.indexOf("road");
}

/** A river barge needs a shore tile on a navigable river at home and stays on that river. */
export function mayFoundRiverBarge(home: { shoreRivers: readonly string[] }): boolean {
  return home.shoreRivers.length > 0;
}

export function bargeMayEnter(barge: { river: string }, province: { shoreRivers: readonly string[] }): boolean {
  return province.shoreRivers.includes(barge.river);
}

/** Rail freight runs a leg only between two provinces with a rail station. */
export function railLegOk(from: { railStation: boolean }, to: { railStation: boolean }): boolean {
  return from.railStation && to.railStation;
}

export interface SeaZone {
  id: string;
  enclosed: boolean;
  /** Port provinces on its coast. */
  ports: string[];
}

/** A trade ship enters port provinces only; a merchant galley keeps to enclosed seas. */
export function shipMayEnterProvince(province: { port: boolean; blockaded?: boolean }): boolean {
  return province.port && !province.blockaded;
}

export function shipMayEnterZone(kind: SeaKind, zone: SeaZone): boolean {
  return !("enclosed_seas_only" in config.sea_traders[kind]) || zone.enclosed;
}

/** A steamer's route needs a port with coal; other ships need none. */
export function shipRouteOk(kind: SeaKind, stops: readonly { coal?: boolean }[]): boolean {
  if (!("needs_coal_port" in config.sea_traders[kind])) return true;
  return stops.some((s) => s.coal);
}

// ---------------------------------------------------------------- trade value

const priceByWare = new Map<string, number>();
for (const tier of Object.values(config.value.price_per_load)) for (const w of tier.wares) priceByWare.set(w, tier.price);

/** Gold a load of a ware is worth, by its tier; silver falls after the event tree's silver flood (TRADE-028). */
export function pricePerLoad(ware: string, o: { silverFlood?: boolean } = {}): number {
  if (ware === "silver" && o.silverFlood) return config.value.silver_after_flood;
  const p = priceByWare.get(ware);
  if (p === undefined) throw new Error(`No price tier for ${ware}`);
  return p;
}

/** Food surplus for goods value: food made minus what the province's people eat that year, never below 0 (D-TRADE-19). */
export function foodSurplus(made: number, eaten: number): number {
  return Math.max(0, made - eaten);
}

/**
 * Price of a material bought for a building (X-6): its price per load, 25 % dearer where no trade route
 * touches the province.
 */
export function materialPrice(ware: string, touchedByTrade: boolean): number {
  return pricePerLoad(ware) * (touchedByTrade ? 1 : 1 + config.materials.no_route_markup);
}

export interface WareSource {
  ware: string;
  /** Loads a year. */
  loads: number;
  /** Burned and fallow tiles make nothing. */
  burned?: boolean;
  fallow?: boolean;
}

/**
 * Goods value: wares made this year times their price. Burned and fallow tiles
 * make nothing; food counts only as the surplus the province does not eat.
 */
export function goodsValue(made: readonly WareSource[], foodSurplus?: Readonly<Record<string, number>>): number {
  const loads = new Map<string, number>();
  for (const m of made) if (!m.burned && !m.fallow) loads.set(m.ware, (loads.get(m.ware) ?? 0) + m.loads);
  let total = 0;
  for (const [ware, n] of loads) {
    const counted = config.value.food_wares.includes(ware) ? Math.min(n, foodSurplus?.[ware] ?? 0) : n;
    total += counted * pricePerLoad(ware);
  }
  return total;
}

export type TraderMode = "land" | "sea";

/** The trade weight one building adds, for land or sea traders. Craft buildings add theirs each. */
export function buildingWeight(building: string, mode: TraderMode = "land"): number {
  const weights = config.value.building_weights as Record<string, { weight: number; applies_to?: string }>;
  const w = config.value.craft_buildings.includes(building) ? weights.craft_building : weights[building];
  if (!w) return 0;
  if (w.applies_to && w.applies_to !== mode) return 0;
  return w.weight;
}

export function buildingWeights(buildings: readonly string[], mode: TraderMode = "land"): number {
  return buildings.reduce((sum, b) => sum + buildingWeight(b, mode), 0);
}

/** Trade value in gold a month = goods value × (1 + building weights) / 12, times any world trade index modifier. */
export function tradeValue(goods: number, weights: number, worldIndex = 0): number {
  return ((goods * (1 + weights)) / config.value.months_per_year) * (1 + worldIndex);
}

// ---------------------------------------------------------------- ratio

/** One month's ratio gain before modifiers: 3 × traders passing × (1 − ratio/100). */
export function ratioGain(ratio: number, passing: number): number {
  return config.ratio.gain_per_trader * passing * (1 - ratio / config.ratio.max);
}

export function ratioDecay(ratio: number): number {
  return config.ratio.decay_share * ratio;
}

/** New ratio after a month: gain (times a gain factor) minus decay, kept in 0..100. */
export function nextRatio(ratio: number, passing: number, gainFactor = 1): number {
  return clamp(ratio + ratioGain(ratio, passing) * gainFactor - ratioDecay(ratio), 0, config.ratio.max);
}

export interface GainConditions {
  customsOfficer?: boolean;
  /** The province's road is a step better than every neighbour's (D-TRADE-9). */
  betterRoad?: boolean;
  peaceYears?: number;
  riots?: boolean;
  /** Share of homeless people, 0..1. */
  homelessShare?: number;
  enemyArmyOrSiege?: boolean;
  /** Other shares on ratio gain: event trade_access, heritage levers, buildings' "traders passing" percentages. */
  otherShares?: readonly number[];
}

/** Whether a province's road is a step better than every neighbour's (D-TRADE-9). */
export function betterRoadThanNeighbours(own: RoadStep, neighbours: readonly RoadStep[]): boolean {
  const best = Math.max(...neighbours.map((n) => roadSteps.indexOf(n)), -1);
  return roadSteps.indexOf(own) > best;
}

/**
 * The ratio gain factor: the modifiers add together into one share (customs +15 %, better road +10 %, peace
 * 10 years +10 %, riots −50 %, −5 % for every full 5 % of homeless over 5 %, and any other shares), never below
 * 0; an enemy army or siege gives no gain at all (TRADE-035..041, TRADE-118).
 */
export function ratioGainFactor(c: GainConditions): number {
  const m = config.ratio.modifiers;
  if (c.enemyArmyOrSiege) return 0;
  let share = 0;
  if (c.customsOfficer) share += m.customs_officer;
  if (c.betterRoad) share += m.better_road_than_neighbours;
  if ((c.peaceYears ?? 0) >= 10) share += m.peace_10_years;
  if (c.riots) share += m.riots;
  const homelessSteps = Math.max(0, Math.floor(((c.homelessShare ?? 0) * 100 - 5) / 5 + 1e-9));
  share += m.homeless_per_5pct_over_5pct * homelessSteps;
  for (const x of c.otherShares ?? []) share += x;
  return Math.max(0, 1 + share);
}

/** A ratio left untouched for n months, decayed lazily when next read (× 0.9ⁿ). */
export function lazyRatio(ratio: number, months: number): number {
  return ratio * (1 - config.ratio.decay_share) ** months;
}

/** Tax owed in a province rises 1 % for every 4 points of trade ratio. */
export function taxRaise(ratio: number): number {
  const t = config.effects.tax_per_ratio_points;
  return Math.floor(ratio / t.points) * t.tax;
}

/** Craft buildings appear by themselves only where the trade ratio is 30 % or more. */
export function craftsMayAppear(ratio: number): boolean {
  return ratio >= config.effects.crafts_appear_min_ratio;
}

/**
 * A building's input is supplied if made in the province, within reach, or in
 * any province on a trader's route passing through; otherwise it works at half.
 */
export function inputOutput(ware: string, source: { madeHere: boolean; inReach: readonly string[][]; passingRoutes: readonly string[][] }): number {
  if (source.madeHere) return 1;
  const has = (list: readonly string[][]) => list.some((wares) => wares.includes(ware));
  return has(source.inReach) || has(source.passingRoutes) ? 1 : config.effects.missing_input_output;
}

/** What a trader carries: gold in its purse, never food or other wares. */
export function traderCarries(ware: string): boolean {
  return ware === "gold";
}

// ---------------------------------------------------------------- the world as trade sees it

export type TownSize = "hamlet" | "village" | "market_town" | "town" | "city" | "great_city";
export type MarketStep = "weekly_market" | "yearly_fair" | "trading_house";

export interface ProvinceTrade {
  id: string;
  /** Owning country, or null for unclaimed land. */
  owner: string | null;
  /** A lord of the owner who holds the province. */
  lord?: string;
  size: TownSize;
  market: MarketStep | null;
  tradingPost?: boolean;
  /** Buildings with a trade weight (warehouse, caravanserai, counting house, bank, harbour, craft buildings). */
  buildings: string[];
  port?: boolean;
  blockaded?: boolean;
  value: number;
  ratio: number;
  /** Traders that stood in the province this month, counted once each. */
  passedBy: Set<string>;
  /** Trade ships sailing past in a sea lane this month (each counts half). */
  seaLanePassedBy: Set<string>;
  visits: number;
  quarantine?: boolean;
  occupiedBy?: string;
  enemyArmy?: boolean;
  siege?: boolean;
  rebels?: boolean;
  plague?: boolean;
  /** trade_access modifiers from events: share and the month they end. */
  accessModifiers: { share: number; until: number }[];
  /** Ratio gain conditions (TRADE-035..039, D-TRADE-9). */
  customsOfficer?: boolean;
  betterRoad?: boolean;
  peaceYears?: number;
  riots?: boolean;
  homelessShare?: number;
  /** Buildings' "+x % traders passing" (Djenné, Taj Mahal) as a share on ratio gain (D-TRADE-15). */
  gainShare?: number;
  /** A pilgrimage shrine: its pilgrims count as traders passing each month (D-TRADE-15). */
  pilgrimShrine?: boolean;
  /** Month a trader last passed, for "touched by a trade route" (X-6). */
  lastPassed?: number;
}

export interface CountryTrade {
  id: string;
  treasury: number;
  inventions: Set<string>;
  /** Overlord, for a subject. */
  overlord?: string;
  subjectKind?: "tributary" | "vassal" | "colony";
  knownSeaZones: Set<string>;
  partners: Set<string>;
  /** trade_power modifiers from events. */
  powerModifiers: { share: number; until: number }[];
  /** Trade income by kind this year. */
  income: { deposits: number; fees: number; tolls: number };
  /** Provinces its traders entered: their trade value and ratio are visible to it (D-TRADE-13). */
  seen: Set<string>;
  /** Heritage levers as trade reads them (X-6): shares on ratio gain and on deposits, extra starting traders. */
  levers?: { ratioGainShare?: number; depositShare?: number; extraTraders?: number };
}

export interface Lord {
  id: string;
  liege: string;
  wealth: number;
}

export interface Trader {
  id: string;
  name: string;
  kind: TraderKind;
  owner: string;
  /** Set for a lord's trader: it deposits into his wealth and the crown cannot steer it. */
  lord?: string;
  home: string;
  crew: { class: string; count: number };
  route: Route | null;
  purse: number;
  position: string;
  heading?: string;
  trading: boolean;
  unpaidMonths: number;
  carriesPlague?: boolean;
  captured?: boolean;
  river?: string;
  lastCollections: { province: string; gold: number; fee: number }[];
  lastDeposit?: { city: string; gold: number };
}

export interface TollPoint {
  id: string;
  owner: string;
  rate: "none" | "low" | "high";
}

export interface PeaceTerm {
  term: "open_the_roads";
  winner: string;
  loser: string;
  until: number;
}

export interface TradeWorld {
  /** Months since the start (only used for modifier durations). */
  month: number;
  provinces: Map<string, ProvinceTrade>;
  seaZones: Map<string, SeaZone>;
  countries: Map<string, CountryTrade>;
  lords: Map<string, Lord>;
  traders: Map<string, Trader>;
  wars: Set<string>;
  pacts: Set<string>;
  /** "by>target": `by` embargoes `target`. */
  embargoes: Set<string>;
  peaceTerms: PeaceTerm[];
  /** Hunting fleets by sea zone: their country, or null for pirates. */
  hunters: Map<string, { country: string | null }[]>;
  /** Own warships escorting by sea zone. */
  escorts: Map<string, Set<string>>;
  worldIndex: { share: number; until: number }[];
  /** Collections by hub over the last 12 months: hub → country → gold. */
  hubCollections: Map<string, Map<string, number>>;
  hubs: Map<string, { provinces: string[]; seaZones: string[] }>;
  report: string[];
  events: TradeEvent[];
  /** Trade ships sailing through each sea zone this month, and last month's counts for the lens (D-TRADE-16). */
  seaLanes: Map<string, Set<string>>;
  seaLanesLastMonth: Map<string, number>;
}

export type TradeEvent =
  | { type: "TraderCollected"; trader: string; province: string; gold: number; fee: number }
  | { type: "PurseDeposited"; trader: string; city: string; gold: number }
  | { type: "TollPaid"; trader: string; point: string; gold: number }
  | { type: "TraderCaptured"; trader: string; by: string | null; purse: number }
  | { type: "TraderRobbed"; trader: string; purse: number }
  | { type: "TradeShipLost"; trader: string; purse: number; refund: number }
  | { type: "TraderDismissed" | "TraderLost"; trader: string }
  | { type: "TradePartnerCounted"; country: string; partner: string }
  | { type: "RouteBroken"; trader: string; reason: string };

const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function createTradeWorld(): TradeWorld {
  return {
    month: 0,
    provinces: new Map(),
    seaZones: new Map(),
    countries: new Map(),
    lords: new Map(),
    traders: new Map(),
    wars: new Set(),
    pacts: new Set(),
    embargoes: new Set(),
    peaceTerms: [],
    hunters: new Map(),
    escorts: new Map(),
    worldIndex: [],
    hubCollections: new Map(),
    hubs: new Map(),
    report: [],
    events: [],
    seaLanes: new Map(),
    seaLanesLastMonth: new Map(),
  };
}

export function addCountry(w: TradeWorld, id: string, init: Partial<Omit<CountryTrade, "id">> = {}): CountryTrade {
  const c: CountryTrade = {
    id,
    treasury: 0,
    inventions: new Set(),
    knownSeaZones: new Set(),
    partners: new Set(),
    powerModifiers: [],
    income: { deposits: 0, fees: 0, tolls: 0 },
    seen: new Set(),
    ...init,
  };
  w.countries.set(id, c);
  return c;
}

export function country(w: TradeWorld, id: string): CountryTrade {
  return w.countries.get(id) ?? addCountry(w, id);
}

export function addProvince(w: TradeWorld, id: string, init: Partial<Omit<ProvinceTrade, "id">> = {}): ProvinceTrade {
  const p: ProvinceTrade = {
    id,
    owner: null,
    size: "village",
    market: null,
    buildings: [],
    value: 0,
    ratio: 0,
    passedBy: new Set(),
    seaLanePassedBy: new Set(),
    visits: 0,
    accessModifiers: [],
    ...init,
  };
  w.provinces.set(id, p);
  if (p.owner) country(w, p.owner);
  return p;
}

export function province(w: TradeWorld, id: string): ProvinceTrade {
  return w.provinces.get(id) ?? addProvince(w, id);
}

export function addTrader(w: TradeWorld, init: Partial<Trader> & Pick<Trader, "id" | "kind" | "owner" | "home">): Trader {
  const stats = kindStats(init.kind);
  const t: Trader = {
    name: init.id,
    crew: stats.crew ? { ...stats.crew } : { class: "sailors", count: 0 },
    route: null,
    purse: 0,
    position: init.home,
    trading: true,
    unpaidMonths: 0,
    lastCollections: [],
    ...init,
  };
  w.traders.set(t.id, t);
  country(w, t.owner);
  return t;
}

export function setWar(w: TradeWorld, a: string, b: string, war = true): void {
  if (war) w.wars.add(pair(a, b));
  else w.wars.delete(pair(a, b));
}

export function atWar(w: TradeWorld, a: string, b: string): boolean {
  return w.wars.has(pair(a, b));
}

export function setPact(w: TradeWorld, a: string, b: string): void {
  w.pacts.add(pair(a, b));
}

export function hasPact(w: TradeWorld, a: string, b: string): boolean {
  return w.pacts.has(pair(a, b));
}

export function embargo(w: TradeWorld, by: string, target: string): void {
  w.embargoes.add(`${by}>${target}`);
}

export function isEmbargoed(w: TradeWorld, by: string, target: string): boolean {
  return w.embargoes.has(`${by}>${target}`);
}

// ---------------------------------------------------------------- cities and routes

/** A city for trade: city or great-city size, or any settlement with a market or trading post. */
export function isTradeCity(p: Pick<ProvinceTrade, "size" | "market" | "tradingPost">): boolean {
  return config.value.city_size_is_city.includes(p.size) || p.market !== null || (config.value.trading_post_is_city && !!p.tradingPost);
}

/** Trader visits a month a province serves at full value: 2 without a market, 4, 8, 16 by market step; T6 adds 2. */
export function servedVisits(market: MarketStep | null, inventions: ReadonlySet<string> = new Set()): number {
  const base = market ? config.value.building_weights[market].serves : config.value.serves_without_market;
  return base + (inventions.has("T6") ? config.research.t6_extra_served_visits : 0);
}

/** Crowding factor for a visit: 1 while visits are within the served ones, then served ÷ visits so far. */
export function crowding(served: number, visitsSoFar: number): number {
  return visitsSoFar <= served ? 1 : served / visitsSoFar;
}

/** A route is walked there and back between its start and its end, or once, waiting at the end for orders (D-TRADE-21). */
export type RouteMode = "there_and_back" | "once";

export interface Route {
  stops: string[];
  mode: RouteMode;
  /** Index of the stop the trader heads for next. */
  next: number;
  /** +1 forward, −1 on the way back in there-and-back mode. */
  direction: 1 | -1;
  waiting: boolean;
  skipped: string[];
  detours: string[];
}

export type RouteCheck = { ok: true; route: Route } | { ok: false; reason: string };

/** Checks and builds a route: a start and an end, both cities, never the same; hubs are labels, never stops (D-TRADE-21). */
export function makeRoute(w: TradeWorld, stops: readonly string[], mode: RouteMode = config.route.default_mode as RouteMode): RouteCheck {
  if (stops.length < config.route.min_stops || stops.length > config.route.max_stops) return { ok: false, reason: "a route has a start and an end" };
  if (new Set(stops).size !== stops.length) return { ok: false, reason: "a route goes between two different cities" };
  if (mode !== "there_and_back" && mode !== "once") return { ok: false, reason: "no such route mode" };
  for (const s of stops) {
    if (w.hubs.has(s)) return { ok: false, reason: `${s} is a hub, not a city` };
    const p = w.provinces.get(s);
    if (p && !isTradeCity(p)) return { ok: false, reason: `${s} is not a city` };
  }
  return { ok: true, route: { stops: [...stops], mode, next: 0, direction: 1, waiting: false, skipped: [], detours: [] } };
}

/** Sets a trader's route. The crown cannot steer a lord's trader. */
export function setRoute(w: TradeWorld, issuer: string, traderId: string, stops: readonly string[], mode?: RouteMode): RouteCheck {
  const t = w.traders.get(traderId);
  if (!t) return { ok: false, reason: "no such trader" };
  if (t.lord ? issuer !== t.lord : issuer !== t.owner) return { ok: false, reason: "not yours to steer" };
  const r = makeRoute(w, stops, mode);
  if (r.ok) t.route = r.route;
  return r;
}

/** Copies another trader's route. */
export function copyRoute(w: TradeWorld, issuer: string, traderId: string, fromId: string): RouteCheck {
  const from = w.traders.get(fromId)?.route;
  if (!from) return { ok: false, reason: "nothing to copy" };
  return setRoute(w, issuer, traderId, from.stops, from.mode);
}

/** Where a trader heads next: its next stop, or its home city when it has no route. */
export function destination(t: Trader): string | null {
  if (!t.route) return t.home;
  if (t.route.waiting) return null;
  return t.route.stops[t.route.next] ?? null;
}

/** Called when a trader reaches the stop it was heading for: picks the next stop by the route's mode. */
export function advanceStop(t: Trader): void {
  const r = t.route;
  if (!r) return;
  const last = r.stops.length - 1;
  const atEnd = r.direction === 1 ? r.next >= last : r.next <= 0;
  if (!atEnd) {
    r.next += r.direction;
    return;
  }
  if (r.mode === "there_and_back") {
    r.direction = r.direction === 1 ? -1 : 1;
    r.next += r.direction;
  } else r.waiting = true;
}

/** How much quicker a way through busy land counts: 1 + busy weight × its people over the average, capped (D-TRADE-21). */
export function busyFactor(busy: number): number {
  return 1 + config.route.busy_weight * Math.min(Math.max(busy, 0), config.route.busy_cap);
}

export interface PathOption {
  provinces: string[];
  days: number;
  tolls: number;
  /** The people along the path over the world's average, 1 for average land (D-TRADE-21); average when not given. */
  busy?: number;
  /** Sea zones on the path (ships). */
  zones?: string[];
}

/**
 * Picks a path by the route planner's rule: fewest days with a toll counting
 * as 2 days, drawn toward the most populated land (the days divided by
 * 1 + busy weight × the people along it over the average, D-TRADE-21),
 * skipping forbidden provinces and zones where an enemy hunts when another
 * path exists.
 */
export function choosePath(options: readonly PathOption[], forbidden: (p: string) => boolean = () => false, dangerousZone: (z: string) => boolean = () => false): PathOption | null {
  const open = options.filter((o) => !o.provinces.some(forbidden));
  const safe = open.filter((o) => !(o.zones ?? []).some(dangerousZone));
  const pool = safe.length ? safe : open;
  let best: PathOption | null = null;
  let bestCost = Infinity;
  for (const o of pool) {
    const cost = (o.days + o.tolls * config.route.toll_counts_as_days) / busyFactor(o.busy ?? 1);
    if (cost < bestCost) [best, bestCost] = [o, cost];
  }
  return best;
}

/** Paths cached per city pair; an entry is cleared only when something on its path changes. */
export interface PathCache {
  get(from: string, to: string, plan: () => PathOption | null): PathOption | null;
  /** Something changed in a province or zone: clear every path through it. */
  changed(place: string): void;
  size(): number;
}

export function createPathCache(): PathCache {
  const cache = new Map<string, PathOption | null>();
  return {
    get(from, to, plan) {
      const key = `${from}>${to}`;
      if (!cache.has(key)) cache.set(key, plan());
      return cache.get(key) ?? null;
    },
    changed(place) {
      for (const [key, path] of cache) if (!path || path.provinces.includes(place) || (path.zones ?? []).includes(place)) cache.delete(key);
    },
    size: () => cache.size,
  };
}

export interface LegPlan {
  from: string;
  to: string;
  path: PathOption;
  detour: boolean;
}

export type RoutePlan = { legs: LegPlan[]; skipped: string[]; redStops: string[]; report: string[] } | { allClosed: true; goTo: string | null };

/**
 * Checks a route again after something changed. A closed stop is skipped and
 * shows red (the turn report says so once); a closed path takes another path as a
 * dashed detour, or skips the stop; with every stop closed the trader goes to the
 * nearest own city.
 */
export function checkRoute(
  w: TradeWorld,
  t: Trader,
  paths: (from: string, to: string) => PathOption[],
  nearestOwnCity: () => string | null,
): RoutePlan {
  if (!t.route) return { legs: [], skipped: [], redStops: [], report: [] };
  const stopOpen = (s: string) => mayEnter(w, t, s);
  const open = t.route.stops.filter(stopOpen);
  if (open.length === 0) return { allClosed: true, goTo: nearestOwnCity() };
  const redStops = t.route.stops.filter((s) => !stopOpen(s));
  const skipped = [...redStops];
  const report = redStops.map((s) => `${t.name}: ${s} is closed and skipped.`);
  const legs: LegPlan[] = [];
  let from = open[0]!;
  for (const to of open.slice(1)) {
    const options = paths(from, to);
    const best = choosePath(options, (p) => p !== from && p !== to && !mayEnter(w, t, p));
    if (!best) {
      skipped.push(to);
      continue;
    }
    legs.push({ from, to, path: best, detour: options[0] !== undefined && best !== options[0] });
    from = to;
  }
  return { legs, skipped, redStops, report };
}

// ---------------------------------------------------------------- who may go where

function isOwnLand(w: TradeWorld, t: Trader, owner: string): boolean {
  return owner === t.owner;
}

/** May a trader enter a province or sea zone. */
export function mayEnter(w: TradeWorld, t: Trader, place: string): boolean {
  const zone = w.seaZones.get(place);
  if (zone) return isSeaKind(t.kind) && country(w, t.owner).knownSeaZones.has(zone.id) && shipMayEnterZone(t.kind, zone);
  const p = w.provinces.get(place);
  if (!p) return false;
  if (p.quarantine) return false;
  if (isSeaKind(t.kind) && !shipMayEnterProvince({ port: !!p.port, blockaded: !!p.blockaded })) return false;
  if (p.occupiedBy && atWar(w, p.occupiedBy, t.owner)) return false;
  if (p.owner === null) return !isSeaKind(t.kind) || !!p.port;
  if (isOwnLand(w, t, p.owner)) return true;
  if (atWar(w, p.owner, t.owner)) return false;
  if (isEmbargoed(w, p.owner, t.owner)) return false;
  return true;
}

// ---------------------------------------------------------------- collecting and depositing

function activeShare(mods: readonly { share: number; until: number }[], month: number): number {
  return mods.filter((m) => m.until > month).reduce((s, m) => s + m.share, 0);
}

/** Collection multiplier of a country: T2 and any trade_power modifiers. */
export function collectFactor(w: TradeWorld, countryId: string): number {
  const c = country(w, countryId);
  return 1 + (c.inventions.has("T2") ? config.research.t2_collect_bonus : 0) + activeShare(c.powerModifiers, w.month);
}

/** Trade value of a province now, with any world trade index modifier. */
export function currentValue(w: TradeWorld, p: ProvinceTrade): number {
  return p.value * (1 + activeShare(w.worldIndex, w.month));
}

/** Gold one visit collects: trade value × ratio × hold × visit share × crowding. */
export function collectAmount(value: number, ratio: number, hold: number, crowdingFactor = 1): number {
  return value * (ratio / 100) * hold * config.collect.visit_share * crowdingFactor;
}

/** Market fee a trader pays the owner of a foreign province: 10 %, none at home or with a trade pact. */
export function marketFee(w: TradeWorld, traderCountry: string, owner: string | null, collected: number): number {
  if (!owner || owner === traderCountry) return 0;
  if (hasPact(w, owner, traderCountry)) return collected * config.collect.trade_pact_fee;
  return collected * config.collect.foreign_market_fee;
}

function owningCountryOfTrader(t: Trader): string {
  return t.owner;
}

/** The overlord's traders do not deposit in a subject's city; occupied own cities take no deposits. */
function depositTarget(w: TradeWorld, t: Trader, p: ProvinceTrade): { to: "own" } | { to: "abroad"; fee: number } | null {
  if (!isTradeCity(p) || p.owner === null) return null;
  if (p.occupiedBy && p.occupiedBy !== p.owner) return null;
  const mine = owningCountryOfTrader(t);
  if (p.owner === mine) return { to: "own" };
  const c = country(w, mine);
  if (c.inventions.has(config.deposit.needs_invention_for_abroad) && !atWar(w, p.owner, mine)) {
    const foreignDeposits = p.buildings.some((b) => (config.value.building_weights as Record<string, { foreign_deposits?: boolean }>)[b]?.foreign_deposits);
    if (foreignDeposits) return { to: "abroad", fee: config.deposit.bills_of_exchange_fee };
  }
  return null;
}

function countPartner(w: TradeWorld, a: string, b: string | null): void {
  if (!b || a === b) return;
  const c = country(w, a);
  if (!c.partners.has(b)) {
    c.partners.add(b);
    w.events.push({ type: "TradePartnerCounted", country: a, partner: b });
  }
}

export interface EnterResult {
  entered: boolean;
  collected: number;
  fee: number;
  deposited: number;
  metEnemy: boolean;
}

/**
 * A trader enters a province on the day loop: it counts as passing, collects
 * (if trading, there is room in the purse and the land is not unclaimed
 * without a trading post), pays the market fee, and deposits in its own city.
 */
export function enterProvince(w: TradeWorld, t: Trader, place: string): EnterResult {
  const result: EnterResult = { entered: false, collected: 0, fee: 0, deposited: 0, metEnemy: false };
  if (!mayEnter(w, t, place)) return result;
  const p = province(w, place);
  result.entered = true;
  t.position = place;
  if (p.rebels) {
    result.metEnemy = true;
    return result;
  }
  p.passedBy.add(t.id);
  p.lastPassed = w.month;
  country(w, t.owner).seen.add(place);
  if (p.plague) t.carriesPlague = true;
  const stats = kindStats(t.kind, country(w, t.owner).inventions);
  if (t.trading && (p.owner !== null || p.tradingPost)) {
    p.visits += 1;
    const factor = crowding(servedVisits(p.market, p.owner ? country(w, p.owner).inventions : new Set()), p.visits);
    const room = Math.max(0, stats.purse - t.purse);
    const gross = Math.min(room, collectAmount(currentValue(w, p), p.ratio, stats.hold, factor) * collectFactor(w, t.owner));
    if (gross > 0) {
      const fee = marketFee(w, t.owner, p.owner, gross);
      t.purse += gross - fee;
      if (p.owner && fee > 0) country(w, p.owner).income.fees += fee;
      result.collected = gross;
      result.fee = fee;
      t.lastCollections.unshift({ province: place, gold: gross, fee });
      t.lastCollections.length = Math.min(t.lastCollections.length, 5);
      w.events.push({ type: "TraderCollected", trader: t.id, province: place, gold: gross, fee });
      for (const [hub, def] of w.hubs) if (def.provinces.includes(place)) addHubCollection(w, hub, t.owner, gross);
      if (isTradeCity(p)) countPartner(w, t.owner, p.owner);
    }
  }
  result.deposited = deposit(w, t, p);
  if (destination(t) === place) advanceStop(t);
  return result;
}

/** Deposits the whole purse if the province is a city that takes this trader's deposits. */
export function deposit(w: TradeWorld, t: Trader, p: ProvinceTrade): number {
  if (t.purse <= 0) return 0;
  const target = depositTarget(w, t, p);
  if (!target) return 0;
  const gold = t.purse;
  let kept = gold;
  if (target.to === "abroad") {
    const fee = gold * target.fee;
    kept = gold - fee;
    country(w, p.owner!).income.fees += fee;
    country(w, p.owner!).treasury += fee;
    countPartner(w, t.owner, p.owner);
  }
  if (t.lord) {
    const lord = w.lords.get(t.lord);
    if (lord) lord.wealth += kept;
  } else {
    const c = country(w, t.owner);
    kept *= 1 + (c.levers?.depositShare ?? 0);
    c.treasury += kept;
    c.income.deposits += kept;
  }
  t.purse = 0;
  t.lastDeposit = { city: p.id, gold: kept };
  w.events.push({ type: "PurseDeposited", trader: t.id, city: p.id, gold: kept });
  w.report.push(`${t.name} brought ${fmt(kept)} gold to ${p.id}.`);
  return kept;
}

/** A trade ship sails through a sea zone: no collection at sea, but every port on its coast counts half a trader passing. */
export function sailThrough(w: TradeWorld, t: Trader, zoneId: string): { entered: boolean; captured: boolean } {
  if (!mayEnter(w, t, zoneId)) return { entered: false, captured: false };
  const zone = w.seaZones.get(zoneId)!;
  t.position = zoneId;
  const hunters = (w.hunters.get(zoneId) ?? []).filter((h) => h.country === null || atWar(w, h.country, t.owner));
  if (hunters.length && !w.escorts.get(zoneId)?.has(t.owner)) {
    capture(w, t, hunters[0]!.country);
    return { entered: true, captured: true };
  }
  for (const port of zone.ports) {
    const p = w.provinces.get(port);
    if (p && !p.blockaded) p.seaLanePassedBy.add(t.id);
  }
  const lane = w.seaLanes.get(zoneId) ?? new Set<string>();
  lane.add(t.id);
  w.seaLanes.set(zoneId, lane);
  return { entered: true, captured: false };
}

/** An escort beaten in a zone leaves own trade ships there unprotected. */
export function escortBeaten(w: TradeWorld, zone: string, countryId: string): void {
  w.escorts.get(zone)?.delete(countryId);
}

function capture(w: TradeWorld, t: Trader, by: string | null): void {
  w.events.push({ type: "TraderCaptured", trader: t.id, by, purse: t.purse });
  if (by) country(w, by).treasury += t.purse;
  t.purse = 0;
  t.captured = true;
  w.traders.delete(t.id);
}

/**
 * Traders passing a province this month: one per trader, half per ship sailing past in a sea lane, and a
 * pilgrimage shrine's pilgrims as one more (D-TRADE-15).
 */
export function tradersPassing(p: ProvinceTrade): number {
  const ships = [...p.seaLanePassedBy].filter((id) => !p.passedBy.has(id)).length;
  return p.passedBy.size + ships * config.ratio.sea_lane_trader_weight + (p.pilgrimShrine ? config.ratio.shrine_pilgrims_passing : 0);
}

/**
 * Ratio gain factor of a province: every modifier adds into one share (D-TRADE-9): customs, better road,
 * peace, riots, homeless, event trade_access, buildings' traders-passing shares and the owner's heritage
 * levers (X-6); no gain with an enemy army or siege.
 */
export function gainFactor(w: TradeWorld, p: ProvinceTrade): number {
  const lever = p.owner ? (w.countries.get(p.owner)?.levers?.ratioGainShare ?? 0) : 0;
  return ratioGainFactor({
    enemyArmyOrSiege: !!(p.enemyArmy || p.siege),
    customsOfficer: !!p.customsOfficer,
    betterRoad: !!p.betterRoad,
    peaceYears: p.peaceYears ?? 0,
    riots: !!p.riots,
    homelessShare: p.homelessShare ?? 0,
    otherShares: [activeShare(p.accessModifiers, w.month), p.gainShare ?? 0, lever],
  });
}

/** The busiest sea lanes of last month, by trade ships sailing through, for the world-zoom lens (D-TRADE-16). */
export function busiestSeaLanes(w: TradeWorld, n = 5): { zone: string; ships: number }[] {
  return [...w.seaLanesLastMonth].map(([zone, ships]) => ({ zone, ships })).sort((a, b) => b.ships - a.ships || a.zone.localeCompare(b.zone)).slice(0, n);
}

export interface RatioChange {
  province: string;
  gain: number;
  decay: number;
  ratio: number;
}

/** After the day loop of a month: update every province's ratio, then clear the month's counts. */
export function endOfMonth(w: TradeWorld): RatioChange[] {
  const changes: RatioChange[] = [];
  for (const p of w.provinces.values()) {
    if (p.quarantine) {
      p.ratio = config.ratio.modifiers.quarantine.set_ratio;
      changes.push({ province: p.id, gain: 0, decay: 0, ratio: p.ratio });
    } else {
      const gain = ratioGain(p.ratio, tradersPassing(p)) * gainFactor(w, p);
      const decay = ratioDecay(p.ratio);
      p.ratio = clamp(p.ratio + gain - decay, 0, config.ratio.max);
      changes.push({ province: p.id, gain, decay, ratio: p.ratio });
    }
    p.passedBy.clear();
    p.seaLanePassedBy.clear();
    p.visits = 0;
  }
  w.seaLanesLastMonth = new Map([...w.seaLanes].map(([z, set]) => [z, set.size]));
  w.seaLanes.clear();
  w.month += 1;
  return changes;
}

/** A province put under plague quarantine: ratio 0 and closed to traders while it lasts. */
export function quarantine(w: TradeWorld, provinceId: string, on = true): void {
  const p = province(w, provinceId);
  p.quarantine = on;
  if (on) p.ratio = config.ratio.modifiers.quarantine.set_ratio;
}

// ---------------------------------------------------------------- tolls

/** Gold a toll point takes from a trader passing it, after trade pacts, Open the roads and tributary waivers. */
export function tollFor(w: TradeWorld, t: Trader, point: TollPoint, year?: number): number {
  if (point.owner === t.owner) return 0;
  if (hasPact(w, point.owner, t.owner)) return 0;
  const c = country(w, t.owner);
  if (c.subjectKind === "tributary" && c.overlord === point.owner) return 0;
  if (year !== undefined && w.peaceTerms.some((pt) => pt.term === "open_the_roads" && pt.winner === t.owner && pt.loser === point.owner && year < pt.until)) return 0;
  const rate = (config.tolls as Record<string, number>)[point.rate];
  if (rate === undefined) throw new Error(`No toll number for rate ${point.rate}`);
  return rate;
}

/** A trader passes a toll point and pays from its purse; the owner earns it as trade income. */
export function payToll(w: TradeWorld, t: Trader, point: TollPoint, year?: number): number {
  const toll = Math.min(t.purse, tollFor(w, t, point, year));
  if (toll > 0) {
    t.purse -= toll;
    const owner = country(w, point.owner);
    owner.treasury += toll;
    owner.income.tolls += toll;
    w.events.push({ type: "TollPaid", trader: t.id, point: point.id, gold: toll });
  }
  return toll;
}

/** Records a peace term Open the roads, in force for 10 years. */
export function openTheRoads(w: TradeWorld, winner: string, loser: string, year: number): PeaceTerm {
  const term: PeaceTerm = { term: "open_the_roads", winner, loser, until: year + config.peace_terms.open_the_roads_years };
  w.peaceTerms.push(term);
  return term;
}

/** Trade income: deposits + market fees received + tolls received. */
export function tradeIncome(c: CountryTrade): number {
  return c.income.deposits + c.income.fees + c.income.tolls;
}

// ---------------------------------------------------------------- traders gained and lost

/** A ship of a type with a hold and purse set to Trade becomes a trade ship. */
export function setShipToTrade(w: TradeWorld, owner: string, id: string, shipType: string, port: string): Trader | null {
  let kind: TraderKind;
  try {
    kind = kindOf(shipType);
  } catch {
    return null;
  }
  if (!isSeaKind(kind)) return null;
  return addTrader(w, { id, kind, owner, home: port });
}

export type GainWay = "capture" | "gift" | "event";

/** A trader gained by capture in war (kept), a lord's gift, or an event changes owner to the country. */
export function gainTrader(w: TradeWorld, countryId: string, t: Trader, _way: GainWay, home: string): Trader {
  const gained: Trader = { ...t, owner: countryId, home, route: null, captured: false, trading: true, unpaidMonths: 0, lastCollections: [] };
  delete gained.lord;
  w.traders.delete(t.id);
  w.traders.set(gained.id, gained);
  return gained;
}

export function tradersOf(w: TradeWorld, countryId: string): Trader[] {
  return [...w.traders.values()].filter((t) => t.owner === countryId && !t.lord);
}

export interface JobSlots {
  building: string;
  class: string;
  slots: number;
  filled: number;
}

/**
 * Where a trader may be founded (D-TRADE-2): an own city with a market of any step (weekly market or better),
 * or a trading post once T8 is known.
 */
export function mayFoundIn(p: Pick<ProvinceTrade, "market" | "tradingPost">, inventions: ReadonlySet<string>): boolean {
  return p.market !== null || (!!p.tradingPost && inventions.has("T8"));
}

/**
 * Founds a land trader in a city: pays its founding gold and takes its crew from the home province's job
 * slots of the crew's class (market folk, or craftsmen for rail freight); refused if they are too few (D-TRADE-12).
 */
export function foundTrader(
  w: TradeWorld,
  countryId: string,
  id: string,
  kind: LandKind,
  city: string,
  slots: JobSlots[],
): { ok: true; trader: Trader } | { ok: false; reason: string } {
  const c = country(w, countryId);
  const p = province(w, city);
  if (p.owner !== countryId) return { ok: false, reason: "not an own city" };
  if (!mayFoundIn(p, c.inventions)) return { ok: false, reason: "no market" };
  const stats = kindStats(kind);
  if (c.treasury < stats.found!) return { ok: false, reason: "not enough gold" };
  const crew = stats.crew!;
  const pool = slots.filter((s) => s.class === crew.class);
  if (pool.reduce((n, s) => n + s.filled, 0) < crew.count) return { ok: false, reason: "not enough crew" };
  c.treasury -= stats.found!;
  let need = crew.count;
  for (const s of pool) {
    const take = Math.min(need, s.filled);
    s.filled -= take;
    need -= take;
  }
  return { ok: true, trader: addTrader(w, { id, kind, owner: countryId, home: city }) };
}

/** Overflows people into the emptiest job slots of their class first. */
export function overflowCrew(slots: JobSlots[], cls: string, count: number): number {
  let left = count;
  const pool = slots.filter((s) => s.class === cls);
  while (left > 0) {
    const emptiest = pool.filter((s) => s.filled < s.slots).sort((a, b) => b.slots - b.filled - (a.slots - a.filled))[0];
    if (!emptiest) break;
    const room = emptiest.slots - emptiest.filled;
    const second = pool.filter((s) => s !== emptiest && s.filled < s.slots).map((s) => s.slots - s.filled).sort((a, b) => b - a)[0] ?? 0;
    const put = Math.min(left, Math.max(1, room - second));
    emptiest.filled += put;
    left -= put;
  }
  return count - left;
}

/** Dismisses a trader: it is removed and its crew overflow into the emptiest slots of its home. */
export function dismissTrader(w: TradeWorld, traderId: string, homeSlots: JobSlots[]): number {
  const t = w.traders.get(traderId);
  if (!t) return 0;
  w.traders.delete(traderId);
  w.events.push({ type: "TraderDismissed", trader: traderId });
  return overflowCrew(homeSlots, t.crew.class, t.crew.count);
}

/**
 * Charges a trader's monthly upkeep (even with an empty purse and no route).
 * Unpaid, it counts a month; after 6 unpaid months the trader is lost and its crew leave.
 */
export function chargeUpkeep(w: TradeWorld, t: Trader, payer: { gold: number }): { paid: number; lost: boolean } {
  const upkeep = kindStats(t.kind).upkeep;
  if (payer.gold >= upkeep) {
    payer.gold -= upkeep;
    t.unpaidMonths = 0;
    return { paid: upkeep, lost: false };
  }
  t.unpaidMonths += 1;
  return { paid: 0, lost: checkUnpaid(w, t) };
}

/** Removes a trader or trade ship whose upkeep has gone unpaid for 6 months (D-TRADE-11). */
export function checkUnpaid(w: TradeWorld, t: Trader): boolean {
  if (t.unpaidMonths >= config.upkeep.unpaid_months_to_lose) {
    w.traders.delete(t.id);
    w.events.push({ type: "TraderLost", trader: t.id });
    return true;
  }
  return false;
}

/** A trade ship pressed into war stops trading and keeps its purse until it next reaches an own port. */
export function pressIntoWar(t: Trader): void {
  t.trading = false;
}

// ---------------------------------------------------------------- risks

/**
 * A trader meets an army at war with its owner: unless it can step back the way
 * it came that day, its purse goes to the army's owner and it is captured.
 */
export function meetArmy(w: TradeWorld, t: Trader, armyOwner: string, canStepBack: boolean): "stepped_back" | "captured" | "passed" {
  if (!atWar(w, armyOwner, t.owner)) return "passed";
  if (canStepBack) return "stepped_back";
  capture(w, t, armyOwner);
  return "captured";
}

/** What a trader does by default when it sees an enemy army ahead. */
export function onEnemyAhead(canGoRound: boolean): { waitDays: number; goRound: boolean } {
  return { waitDays: 1, goRound: canGoRound };
}

/** An army on Raid at war with the owner takes the purse; the trader escapes half the time. */
export function raidPasses(w: TradeWorld, t: Trader, raider: string, rng: Rng): { lost: number; escaped: boolean } {
  if (!atWar(w, raider, t.owner)) return { lost: 0, escaped: true };
  const lost = t.purse;
  country(w, raider).treasury += lost;
  t.purse = 0;
  const escaped = rng.next() < config.danger.raid_trader_escapes;
  if (!escaped) capture(w, t, raider);
  return { lost, escaped };
}

export interface BanditGround {
  riots?: boolean;
  rebels?: boolean;
  homelessShare?: number;
  caravanserai?: boolean;
  garrisonedCastle?: boolean;
}

/** Monthly chance a land trader's purse is stolen by bandits in a province. */
export function banditChance(g: BanditGround, ownerInventions: ReadonlySet<string>): number {
  if (g.caravanserai || g.garrisonedCastle) return 0;
  const when = config.danger.bandit_when;
  const trouble = (when.riots && g.riots) || (when.rebels && g.rebels) || (g.homelessShare ?? 0) > when.homeless_share_over;
  if (!trouble) return 0;
  return config.danger.bandit_chance_per_month * (ownerInventions.has("T1") ? config.danger.t1_bandit_chance_factor : 1);
}

/** A trade ship lost in a storm loses its purse; with T11 half of it is refunded. */
export function stormLoss(w: TradeWorld, t: Trader): number {
  const purse = t.purse;
  const refund = country(w, t.owner).inventions.has("T11") ? purse * config.danger.t11_lost_purse_refund : 0;
  country(w, t.owner).treasury += refund;
  t.purse = 0;
  w.traders.delete(t.id);
  w.events.push({ type: "TradeShipLost", trader: t.id, purse, refund });
  return refund;
}

/** When war starts, traders inside the enemy's land head at once for the nearest own or neutral city, and may be caught. */
export function onWarStarted(w: TradeWorld, a: string, b: string, nearestSafeCity: (t: Trader) => string | null): Trader[] {
  setWar(w, a, b);
  const moved: Trader[] = [];
  for (const t of w.traders.values()) {
    const here = w.provinces.get(t.position);
    if (!here?.owner) continue;
    if (atWar(w, here.owner, t.owner)) {
      const target = nearestSafeCity(t);
      if (target) t.heading = target;
      moved.push(t);
    }
  }
  return moved;
}

// ---------------------------------------------------------------- event-tree stats

/** trade_power: a country's traders collect that share more (or less) for the duration. */
export function applyTradePower(w: TradeWorld, countryId: string, share: number, months: number): void {
  country(w, countryId).powerModifiers.push({ share, until: w.month + months });
}

/** trade_access: a province's ratio gain changes by that share for the duration. */
export function applyTradeAccess(w: TradeWorld, provinceId: string, share: number, months: number): void {
  province(w, provinceId).accessModifiers.push({ share, until: w.month + months });
}

/** world_trade_index: every province's trade value changes by that share for the duration. */
export function applyWorldTradeIndex(w: TradeWorld, share: number, months: number): void {
  w.worldIndex.push({ share, until: w.month + months });
}

/** trade_index: trade income over the last 12 months as an index (100 = the reference, 100 gold a year by D-TRADE-17). */
export function tradeIndex(incomeLast12: number, reference: number = config.event_mapping.trade_index_reference_per_year): number {
  return (incomeLast12 / reference) * 100;
}

export function addHubCollection(w: TradeWorld, hub: string, countryId: string, gold: number): void {
  const m = w.hubCollections.get(hub) ?? new Map<string, number>();
  m.set(countryId, (m.get(countryId) ?? 0) + gold);
  w.hubCollections.set(hub, m);
}

/** trade_presence(who, hub, value): who's share of all collections in the hub's provinces is at least value. */
export function tradePresence(w: TradeWorld, who: string, hub: string, value: number): boolean {
  const m = w.hubCollections.get(hub);
  if (!m) return false;
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  return total > 0 && (m.get(who) ?? 0) / total >= value - 1e-9;
}

/** trade_route(from, to, open): the passage's sea zones become known to the country, or the link is marked closed. */
export function applyTradeRoute(w: TradeWorld, countryId: string, passageZones: readonly string[], open: boolean, closedLinks: Set<string>, link: string): void {
  if (open) for (const z of passageZones) country(w, countryId).knownSeaZones.add(z);
  else closedLinks.add(link);
}

/** trade_good is read as the wares made in a province. */
export function tradeGood(made: readonly WareSource[], ware: string): number {
  return made.filter((m) => m.ware === ware && !m.burned && !m.fallow).reduce((s, m) => s + m.loads, 0);
}

// ---------------------------------------------------------------- inventions

/** The trade effects of T and S inventions; T17 Container shipping is out of scope (era VIII). */
export const inventionEffects: Readonly<Record<string, string>> = {
  T1: "camel caravans can be founded; bandit chance halved",
  T2: "collections +10 %",
  T3: "deposit abroad with a counting house or bank",
  T5: "Indian Ocean storm losses halved",
  T6: "the yearly fair can be built and every market serves 2 more visits a month",
  T8: "overseas trading posts count as cities and can found traders",
  T9: "trade ships cost 25 % less",
  T11: "half a lost ship's purse refunded",
  T13: "every known province's trade value and ratio visible",
  S2: "trade ships' hold +0.5",
  S13: "steamer trade ships",
  B2: "land traders move faster, as armies do",
};

export function tradeEffectOf(invention: string): string | null {
  return inventionEffects[invention] ?? null;
}

// ---------------------------------------------------------------- start and the AI

export type TradeAccess = keyof typeof config.start.traders_by_trade_access;

/** Starting traders by catalogue trade_access, plus the heritage lever trader_count (X-6). */
export function startingTraderCount(access: string, extraTraders = 0): number {
  const key = access.trim().toLowerCase().replace(/ /g, "_");
  return ((config.start.traders_by_trade_access as Record<string, number>)[key] ?? 0) + extraTraders;
}

/** Coastal countries with ports start with trade ships; inland ones with caravans or barges. */
export function startingKinds(c: { ports: number; riverHome?: boolean }, count: number): TraderKind[] {
  const kind: TraderKind = c.ports > 0 ? "cog_junk_dhow" : c.riverHome ? "river_barge" : "pack_caravan";
  return Array.from({ length: count }, () => kind);
}

export interface StartingRoute {
  country: string;
  label?: string;
  stops: string[];
}

export function startingRoutes(countryId: string): StartingRoute[] {
  return (config.start.routes as StartingRoute[]).filter((r) => r.country === countryId);
}

/** Runs the starting traders for the warm-up months before the first turn, to set starting ratios. */
export function warmUp(w: TradeWorld, monthOfTraffic: (w: TradeWorld) => void, months = config.start.warmup_months): number {
  for (let i = 0; i < months; i++) {
    monthOfTraffic(w);
    endOfMonth(w);
  }
  return months;
}

/** The AI founds a trader when the best unused loop beats upkeep by its margin. */
export function aiShouldFound(expectedGoldPerMonth: number, upkeep: number, margin = config.ai.found_margin): boolean {
  return expectedGoldPerMonth >= upkeep * margin;
}

/** The AI dismisses a trader whose loop has lost money for a year. */
export function aiShouldDismiss(losingMonths: number): boolean {
  return losingMonths >= config.ai.dismiss_after_losing_months;
}

export const aiReach = { caravanProvinces: config.ai.caravan_reach_provinces, shipSeaZones: config.ai.ship_reach_sea_zones } as const;

// ---------------------------------------------------------------- screens and report

export interface TraderCard {
  kind: TraderKind;
  crew: string;
  route: string;
  loopDays: number | null;
  position: string;
  purse: string;
  lastCollections: Trader["lastCollections"];
  feesAndTolls: number;
  danger: string;
  upkeep: number;
}

/** The trader card: kind, crew, route and loop days, position, purse bar, last collections, fees and tolls, danger, upkeep. */
export function traderCard(t: Trader, extra: { loopDays?: number; progress?: string; danger?: string } = {}): TraderCard {
  const stats = kindStats(t.kind);
  return {
    kind: t.kind,
    crew: `${t.crew.count} ${t.crew.class.replace(/_/g, " ")}`,
    route: t.route ? t.route.stops.join(" ▸ ") : "none",
    loopDays: extra.loopDays ?? null,
    position: extra.progress ? `${t.position}, ${extra.progress}` : t.position,
    purse: `${fmt(t.purse)} / ${stats.purse}`,
    lastCollections: t.lastCollections,
    feesAndTolls: t.lastCollections.reduce((s, c) => s + c.fee, 0),
    danger: extra.danger ?? "low",
    upkeep: stats.upkeep,
  };
}

/** Trade lenses on the map. */
export const tradeLenses = ["Trade ratio", "Trade value", "Traders"] as const;

/** The turn's report lines (one week, X-18): one line for all deposits, and one per problem. */
export function turnReportLines(events: readonly TradeEvent[]): string[] {
  const deposits = events.filter((e) => e.type === "PurseDeposited").reduce((s, e) => s + (e.type === "PurseDeposited" ? e.gold : 0), 0);
  const lines: string[] = [];
  if (deposits > 0) lines.push(`Traders brought ${fmt(deposits)} gold this week`);
  for (const e of events) {
    if (e.type === "TraderRobbed") lines.push(`${e.trader} was robbed of ${fmt(e.purse)} gold`);
    else if (e.type === "TraderCaptured") lines.push(`${e.trader} was taken`);
    else if (e.type === "TradeShipLost") lines.push(`${e.trader} was lost at sea`);
    else if (e.type === "RouteBroken") lines.push(`${e.trader}: route broken (${e.reason})`);
  }
  return lines;
}

/** Bandits rob a trader. */
export function rob(w: TradeWorld, t: Trader): void {
  w.events.push({ type: "TraderRobbed", trader: t.id, purse: t.purse });
  t.purse = 0;
}

// ---------------------------------------------------------------- decided 17 October (D-TRADE-*)

/** T6 is needed to build a new yearly fair; fairs standing at the start stay (D-TRADE-3). */
export function mayBuildYearlyFair(inventions: ReadonlySet<string>): boolean {
  return !config.research.t6_unlocks_yearly_fair || inventions.has("T6");
}

/** Buying price factor of a trade ship: T9 makes it 25 % cheaper. */
export function tradeShipCostFactor(inventions: ReadonlySet<string>): number {
  return inventions.has("T9") ? config.research.t9_ship_cost_factor : 1;
}

/** Storm loss factor for a trade ship: halved in Indian Ocean zones with T5. */
export function tradeShipStormFactor(zone: string, inventions: ReadonlySet<string>): number {
  return inventions.has("T5") && config.research.t5_indian_ocean_zones.includes(zone) ? config.research.t5_indian_ocean_storm_factor : 1;
}

/** Steamer trade ships need S13. */
export function mayUseSteamers(inventions: ReadonlySet<string>): boolean {
  return inventions.has("S13");
}

/**
 * Whether a country sees a province's trade value and ratio (D-TRADE-13): its own provinces, every province
 * its traders entered, and with T13 every province it knows.
 */
export function seesTrade(w: TradeWorld, countryId: string, provinceId: string): boolean {
  const c = country(w, countryId);
  if (c.inventions.has("T13") && config.visibility.t13_sees_all) return true;
  return w.provinces.get(provinceId)?.owner === countryId || c.seen.has(provinceId);
}

/**
 * Whether a trade route touches a province (X-6): it is a stop of some trader's route, or a trader passed
 * it within the last 12 months.
 */
export function touchedByTrade(w: TradeWorld, provinceId: string): boolean {
  for (const t of w.traders.values()) if (t.route?.stops.includes(provinceId)) return true;
  const p = w.provinces.get(provinceId);
  return p?.lastPassed !== undefined && w.month - p.lastPassed < config.materials.route_memory_months;
}

/** The hubs of the trade config as named sets of provinces and sea zones (D-TRADE-17). */
export function configHubs(): Map<string, { provinces: string[]; seaZones: string[] }> {
  const out = new Map<string, { provinces: string[]; seaZones: string[] }>();
  for (const [id, h] of Object.entries(config.hubs)) if (typeof h === "object") out.set(id, { provinces: [...h.provinces], seaZones: [...h.sea_zones] });
  return out;
}

export interface PreviewLeg {
  from: string;
  to: string;
  days: number;
  /** Provinces entered on the leg, the stop at its end included. */
  provinces: string[];
  tolls: TollPoint[];
}

export interface RoutePreview {
  loopDays: number;
  collectedIn: number;
  best: string[];
  expectedPerMonth: number;
  tolls: { point: string; gold: number }[];
  danger: "none" | "low" | "high";
  banditsNear: string[];
  crowding: string[];
  red: string[];
}

/**
 * The route preview (TRADE-054, TRADE-055): loop days, provinces collected in per loop, the three best,
 * expected gold a month (planned collections at this month's ratios, minus fees and tolls, over the loop's
 * months, unseen provinces counting 0 by D-TRADE-13), tolls, danger with where bandits are, crowding at the
 * stops, and red marks for places the trader may not enter.
 */
export function routePreview(w: TradeWorld, t: Trader, legs: readonly PreviewLeg[], bandits: (province: string) => number = () => 0): RoutePreview {
  const stats = kindStats(t.kind, country(w, t.owner).inventions);
  const byProvince = new Map<string, number>();
  let net = 0;
  let entries = 0;
  const tolls: { point: string; gold: number }[] = [];
  const red = new Set<string>();
  for (const leg of legs) {
    for (const id of leg.provinces) {
      if (!mayEnter(w, t, id)) {
        red.add(id);
        continue;
      }
      const p = province(w, id);
      if (p.owner === null && !p.tradingPost) continue;
      entries += 1;
      const value = seesTrade(w, t.owner, id) ? currentValue(w, p) : 0;
      const ratio = seesTrade(w, t.owner, id) ? p.ratio : 0;
      const gross = collectAmount(value, ratio, stats.hold) * collectFactor(w, t.owner);
      const fee = marketFee(w, t.owner, p.owner, gross);
      byProvince.set(id, (byProvince.get(id) ?? 0) + gross);
      net += gross - fee;
    }
    for (const point of leg.tolls) {
      const gold = tollFor(w, t, point);
      tolls.push({ point: point.id, gold });
      net -= gold;
    }
  }
  const loopDays = legs.reduce((d, l) => d + l.days, 0);
  const best = [...byProvince].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([id]) => id);
  const places = [...new Set(legs.flatMap((l) => l.provinces))];
  const chances = places.map((id) => ({ id, chance: bandits(id) }));
  const worst = Math.max(0, ...chances.map((c) => c.chance));
  const d = config.screens.danger;
  const danger = worst <= d.none ? "none" : worst <= d.low ? "low" : "high";
  const stopsOnRoute = [...new Set(legs.map((l) => l.to))];
  const crowding = stopsOnRoute
    .map((id) => province(w, id))
    .filter((p) => p.visits > 0)
    .map((p) => `${p.id}: ${p.visits} of ${servedVisits(p.market, p.owner ? country(w, p.owner).inventions : new Set())} visits taken this month`);
  return {
    loopDays,
    collectedIn: entries,
    best,
    expectedPerMonth: net / (loopDays / 30),
    tolls,
    danger,
    banditsNear: chances.filter((c) => c.chance > 0).map((c) => c.id),
    crowding,
    red: [...red],
  };
}

/** Setting a route by taps (TRADE-096): the start, then the end, finished by tapping the end again; another city moves the end (D-TRADE-21). */
export function routeByTaps(taps: readonly string[]): { stops: string[]; finished: boolean; previews: number } {
  const stops: string[] = [];
  let previews = 0;
  for (const tap of taps) {
    if (stops.length && stops[stops.length - 1] === tap) {
      if (stops.length >= config.route.min_stops) return { stops, finished: true, previews };
      continue;
    }
    if (stops.length >= config.route.max_stops) stops[stops.length - 1] = tap;
    else stops.push(tap);
    previews += 1;
  }
  return { stops, finished: false, previews };
}

/** What the trade lens shows at each zoom (TRADE-093). */
export function tradeAtZoom(zoom: "world" | "region" | "local"): readonly string[] {
  return config.screens.zoom[zoom];
}

/** The kinds a country can found in a city from the Trade menu (TRADE-095). */
export function foundMenu(w: TradeWorld, countryId: string, city: string): LandKind[] {
  const p = province(w, city);
  const c = country(w, countryId);
  if (p.owner !== countryId || !mayFoundIn(p, c.inventions)) return [];
  return (Object.keys(config.land_traders) as LandKind[]).filter((k) => k === "pack_caravan" || (k === "camel_caravan" && c.inventions.has("T1")) || (k === "wagon_train" && c.inventions.has("B9")));
}

export interface TradeScreenRow {
  trader: string;
  kind: TraderKind;
  route: string;
  purse: number;
  lastDeposit: string;
  expected: number;
  problems: string[];
}

/** The Trade screen (TRADE-098): every trader and trade ship, sorted by expected gold a month. */
export function tradeScreen(w: TradeWorld, countryId: string, expected: (t: Trader) => number, problems: (t: Trader) => string[] = () => []): TradeScreenRow[] {
  return tradersOf(w, countryId)
    .map((t) => ({
      trader: t.name,
      kind: t.kind,
      route: t.route ? t.route.stops.join(" ▸ ") : "none",
      purse: t.purse,
      lastDeposit: t.lastDeposit ? `${fmt(t.lastDeposit.gold)} at ${t.lastDeposit.city}` : "none",
      expected: expected(t),
      problems: problems(t),
    }))
    .sort((a, b) => b.expected - a.expected || a.trader.localeCompare(b.trader));
}

/**
 * The AI at war (TRADE-116): traders whose route runs within 2 provinces of the front are pulled home, and
 * trade ships become transports when the realm is short of carriers.
 */
export function aiWarOrders(traders: readonly { id: string; ship: boolean; provincesFromFront: number }[], shortOfCarriers: boolean): { pulled: string[]; transports: string[] } {
  return {
    pulled: traders.filter((t) => !t.ship && t.provincesFromFront <= config.ai.near_front_provinces).map((t) => t.id),
    transports: shortOfCarriers ? traders.filter((t) => t.ship).map((t) => t.id) : [],
  };
}

/** The AI reroutes at once when a route breaks, and otherwise once a year (TRADE-115). */
export function aiRerouteDue(monthsSinceReroute: number, routeBroken: boolean): boolean {
  return routeBroken || monthsSinceReroute >= config.ai.reroute_every_months;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function fmt(x: number): string {
  return String(Math.round(x * 100) / 100);
}
