import type { World } from "./world.ts";
import { atWar, controller } from "./war.ts";
import { hasCastle, hasGranary, worksAt, workIndex } from "./works.ts";
import { buildingType } from "./domain/buildings/index.ts";
import {
  castlePolicy,
  foodPolicyFromPreset,
  grainPrice,
  harvestMonth,
  lordCollection,
  overrideCastle,
  applyPreset,
  realmConfig,
  rotSeason,
  setFoodPolicy,
  spreadable,
  spreadFood,
  surplusGoes,
  type FoodPolicy,
  type FoodPolicyScreen,
  type PresetName,
} from "./domain/realm/index.ts";

/**
 * Castles share food (feedback 84 and 85, realm §3.2 to §3.5): every castle
 * is a hub of its realm's food. At the harvest a share of each province's
 * surplus goes to the nearest castle in reach; the castle keeps its siege
 * reserve and hands the rest back out by rings; a hungry province is fed
 * first under the famine rule. Enemy armies on the land cut the roads, and a
 * besieged castle feeds only its own province. Stores are capped (a granary
 * makes a castle's bigger), and what doesn't fit is kept to spoil, sold to
 * the treasury or sent to the capital castle by the surplus rule.
 *
 * Exchanges between castles (castle shares, REALM-042) and army refill
 * (REALM-045) wait for the armies-eat-the-land work; each castle keeps what
 * it collects.
 */

export interface CastleFoodState {
  /** Food in each castle's store, in thousands of people fed for a month; 0 where no castle stands. */
  castleStore: Float32Array;
  /** The castle (its province) feeding each province, -1 = none in reach (REALM-033); worked out each month. */
  provinceCastle: Int32Array;
  /** Rings from that castle: 0 its own province, 1 the next ring, 2 the ring beyond. */
  provinceRing: Int8Array;
  /** 1 for a castle whose roads an enemy cuts: he holds or stands on land within its reach (REALM-056). */
  castleCut: Uint8Array;
  /** Each realm's Food policy (REALM-040): its default and castles' own values, keyed by province id. */
  foodPolicy: FoodPolicyScreen[];
  /** Gold from grain sold this month, by realm (the ledger's Grain line, REALM-026). */
  nationGrainGold: Float64Array;
  /** Food sold and food spoiled this year, by realm (cleared each January). */
  nationFoodSold: Float64Array;
  nationFoodSpoiled: Float64Array;
}

/** The settings the game plays so far; castle shares and army refill wait for the armies-eat-the-land work. */
export const FOOD_SETTINGS = ["collection", "spread", "siegeReserve", "famineRule", "surplus"] as const;
export type FoodSetting = (typeof FOOD_SETTINGS)[number];
/** Surplus rules in play: subjects and allies wait for the subjects context. */
export const SURPLUS_RULES = realmConfig.food.surplus_options.filter((r) => surplusGoes(r) !== "subjects_or_allies");

/** A realm's first Food policy: the *Feed the people* preset, with hungry provinces fed first below a month (default chosen so castles help from the start). */
export function startingFoodPolicy(): FoodPolicyScreen {
  const screen = foodPolicyFromPreset("Feed the people");
  setFoodPolicy(screen, "famineRule", "1 month");
  return screen;
}

export function createCastleFoodState(P: number, N: number): CastleFoodState {
  return {
    castleStore: new Float32Array(P),
    provinceCastle: new Int32Array(P).fill(-1),
    provinceRing: new Int8Array(P).fill(-1),
    castleCut: new Uint8Array(P),
    foodPolicy: Array.from({ length: N }, startingFoodPolicy),
    nationGrainGold: new Float64Array(N),
    nationFoodSold: new Float64Array(N),
    nationFoodSpoiled: new Float64Array(N),
  };
}

/** Each castle starts with its siege reserve in store. */
export function seedCastleStores(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (world.provinceWater[p] || n < 0 || !hasCastle(world, p)) continue;
    world.castleStore[p] = Math.min(castleCap(world, p), policyAt(world, p).siegeReserve * world.provincePopulation[p]!);
  }
  mapNetwork(world);
}

/** The policy a castle follows: its realm's, with any value of its own. */
export function policyAt(world: World, castle: number): FoodPolicy {
  return castlePolicy(world.foodPolicy[world.provinceOwner[castle]!]!, world.provinceIds[castle]!);
}

/** Food a castle's store holds at most: months of its own province's eating, more with a granary (REALM-031). */
export function castleCap(world: World, c: number): number {
  const f = world.rules.defines.castleFood;
  return (hasGranary(world, c) ? f.granaryStoreMonths : f.castleStoreMonths) * world.provincePopulation[c]!;
}

/** Road step names, worst first ("none", "track", "road" …); worked out on first use, as works.ts and this file import each other. */
let roadSteps: string[] | null = null;

/** Rings of provinces a castle reaches, by the road at the castle: 1 with none or a track, 2 with a road (REALM-032, D-REALM-11). */
export function reachOf(world: World, c: number): number {
  roadSteps ??= ["none", ...buildingType("road").steps.map((s) => s.name)];
  const reach = realmConfig.food_year.reach_by_road as Record<string, number>;
  return reach[roadSteps[worksAt(world, c, workIndex("road"))]!] ?? 1;
}

/** Land an enemy stands on: occupied, besieged, or with an army at war with its owner on it. */
function hostileGround(world: World): Uint8Array {
  const out = new Uint8Array(world.provinceCount);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOccupier[p]! >= 0 || world.sieges.has(p)) out[p] = 1;
  const a = world.armies;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const p = a.location[i]!;
    const owner = world.provinceOwner[p]!;
    if (p >= 0 && owner >= 0 && atWar(world, a.owner[i]!, owner)) out[p] = 1;
  }
  return out;
}

/**
 * Which castle feeds each province: ring by ring out from every castle over
 * its own realm's land, the nearest castle first, as far as its reach. A
 * province an enemy stands on takes no food and lets none pass, and marks
 * the castle's roads cut (REALM-032, REALM-033, REALM-056); a besieged
 * castle feeds only its own province (REALM-055).
 */
export function mapNetwork(world: World): void {
  const castleOf = world.provinceCastle.fill(-1);
  const ring = world.provinceRing.fill(-1);
  world.castleCut.fill(0);
  const blocked = hostileGround(world);
  let frontier: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (world.provinceWater[p] || n < 0 || !hasCastle(world, p) || controller(world, p) !== n) continue;
    castleOf[p] = p;
    ring[p] = 0;
    frontier.push(p);
  }
  const reach = new Map(frontier.map((c) => [c, reachOf(world, c)]));
  for (let r = 1; frontier.length; r++) {
    const next: number[] = [];
    for (const q of frontier) {
      const c = castleOf[q]!;
      if (blocked[q] || r > reach.get(c)!) continue;
      const n = world.provinceOwner[c]!;
      for (let k = world.adjStart[q]!, end = world.adjStart[q + 1]!; k < end; k++) {
        const x = world.adjList[k]!;
        if (world.provinceWater[x] || world.provinceOwner[x] !== n || castleOf[x]! >= 0) continue;
        if (blocked[x]) {
          world.castleCut[c] = 1;
          continue;
        }
        castleOf[x] = c;
        ring[x] = r;
        next.push(x);
      }
    }
    frontier = next;
  }
}

/** Share of the collection a province gives: all of it on royal land, by its lord's loyalty on his (REALM-048). */
function lordShare(world: World, p: number): number {
  const k = world.provinceLord[p]!;
  return k >= 0 ? lordCollection(1, world.lords[k]!.loyalty) : 1;
}

/** The surplus rule's way with food that doesn't fit (REALM-047): kept to spoil, sold to the treasury, or to the capital castle. */
function disposeSurplus(world: World, n: number, rule: string, food: number, from: number): void {
  const goes = surplusGoes(rule);
  if (goes === "sold") {
    world.nationGrainGold[n] = world.nationGrainGold[n]! + food * grainPrice() * world.rules.defines.castleFood.grainGoldScale;
    world.nationFoodSold[n] = world.nationFoodSold[n]! + food;
    return;
  }
  if (goes === "capital_castle") {
    const cap = world.provinceIndex.get(world.rules.nations[n]!.capital);
    if (cap !== undefined && cap !== from && world.provinceCastle[cap] === cap && world.provinceOwner[cap] === n && !world.sieges.has(cap)) {
      world.castleStore[cap] = world.castleStore[cap]! + food * (1 - realmConfig.food_year.transfer_loss_per_province);
      return;
    }
  }
  world.nationFoodSpoiled[n] = world.nationFoodSpoiled[n]! + food;
}

/**
 * The castles' month, after the province stores have eaten and before
 * relief and famine: collection where the harvest came in, castles handing
 * out at their own harvest, the famine rule, then caps and the surplus rule,
 * and the castle stores' seasonal rot.
 */
export function shareFood(world: World): void {
  const month = world.date.month;
  const f = world.rules.defines.castleFood;
  const loss = realmConfig.food_year.transfer_loss_per_province;
  const store = world.provinceStore;
  const cs = world.castleStore;
  const people = world.provincePopulation;
  const P = world.provinceCount;
  if (month === 1) {
    world.nationFoodSold.fill(0);
    world.nationFoodSpoiled.fill(0);
  }
  world.nationGrainGold.fill(0);
  // A castle lost or taken loses its store to the taker (REALM-030).
  for (let p = 0; p < P; p++) if (cs[p]! > 0 && (world.provinceOwner[p]! < 0 || !hasCastle(world, p) || controller(world, p) !== world.provinceOwner[p])) cs[p] = 0;
  mapNetwork(world);
  const castleOf = world.provinceCastle;
  const ring = world.provinceRing;
  const harvested = (p: number) => harvestMonth(world.provincePlace[p]!.lat) === month;

  // Collection: the share of each harvest's surplus over a year's eating goes to the castle, less a little each ring on the road (REALM-041, REALM-051).
  for (let p = 0; p < P; p++) {
    const c = castleOf[p]!;
    if (c < 0 || !harvested(p) || world.sieges.has(c)) continue;
    const surplus = store[p]! - people[p]! * f.keepMonths;
    const pct = policyAt(world, c).collection * lordShare(world, p);
    if (surplus <= 0 || pct <= 0) continue;
    const sent = (surplus * pct) / 100;
    store[p] = store[p]! - sent;
    cs[c] = cs[c]! + sent * (1 - loss * ring[p]!);
  }

  // Handing out at the castle's harvest: the store over the siege reserve, by the spread pattern, to each ring by its people (REALM-043, REALM-053).
  const rings = new Map<number, number[][]>();
  for (let p = 0; p < P; p++) {
    const c = castleOf[p]!;
    if (c < 0) continue;
    let r = rings.get(c);
    if (!r) rings.set(c, (r = [[], [], []]));
    if (ring[p]! <= 2) r[ring[p]!]!.push(p);
  }
  for (const [c, members] of rings) {
    if (!harvested(c) || world.sieges.has(c)) continue;
    const pol = policyAt(world, c);
    const out = spreadable(cs[c]!, pol.siegeReserve * people[c]!);
    if (out <= 0) continue;
    const parts = spreadFood(out, pol.spread);
    [parts.own, parts.next, parts.beyond].forEach((share, i) => {
      const list = members[i]!;
      const total = list.reduce((t, m) => t + people[m]!, 0);
      if (!total) return;
      const arrives = 1 - loss * i;
      for (const m of list) {
        const room = Math.max(0, f.localStoreCapMonths * people[m]! - store[m]!);
        const give = Math.min((share * people[m]!) / total, room / arrives);
        store[m] = store[m]! + give * arrives;
        cs[c] = cs[c]! - give;
      }
    });
  }

  // The famine rule: a province below it is fed first from its castle's store over the reserve; a besieged castle feeds its own people from all it holds (REALM-046, REALM-055).
  const threshold = realmConfig.food.famine_rule_options as Record<string, number | null>;
  for (let p = 0; p < P; p++) {
    const c = castleOf[p]!;
    if (c < 0 || people[p]! <= 0) continue;
    const besieged = world.sieges.has(c);
    if (besieged && p !== c) continue;
    const pol = policyAt(world, c);
    const below = besieged ? 1 : threshold[pol.famineRule];
    if (below === null || below === undefined || store[p]! >= below * people[p]!) continue;
    const arrives = 1 - loss * ring[p]!;
    const avail = besieged ? cs[c]! : spreadable(cs[c]!, pol.siegeReserve * people[c]!);
    const give = Math.min(avail, (below * people[p]! - store[p]!) / arrives);
    if (give <= 0) continue;
    store[p] = store[p]! + give * arrives;
    cs[c] = cs[c]! - give;
  }

  // Caps: food over a province's own cap and over a castle's store goes by the surplus rule (REALM-047), the capital castle's last.
  for (let p = 0; p < P; p++) {
    const n = world.provinceOwner[p]!;
    if (world.provinceWater[p] || n < 0) continue;
    const over = store[p]! - f.localStoreCapMonths * people[p]!;
    if (over <= 0) continue;
    store[p] = store[p]! - over;
    const c = castleOf[p]!;
    disposeSurplus(world, n, c >= 0 ? policyAt(world, c).surplus : world.foodPolicy[n]!.realm.surplus, over, p);
  }
  const capitals = new Set(world.rules.nations.map((x) => world.provinceIndex.get(x.capital)));
  const castles = [...rings.keys()].sort((a, b) => Number(capitals.has(a)) - Number(capitals.has(b)));
  for (const c of castles) {
    const over = cs[c]! - castleCap(world, c);
    if (over <= 0) continue;
    cs[c] = cs[c]! - over;
    disposeSurplus(world, world.provinceOwner[c]!, policyAt(world, c).surplus, over, c);
  }
  if (month % 3 === 0) for (const c of castles) cs[c] = rotSeason(cs[c]!, hasGranary(world, c));
}

/**
 * Sets one Food policy setting for the realm (castle -1) or one castle's own
 * value; a castle's value of null follows the realm again (REALM-040).
 */
export function setFood(world: World, n: number, castle: number, key: string, value: string | number | null): string | null {
  if (!(FOOD_SETTINGS as readonly string[]).includes(key)) return "no such food setting";
  const screen = world.foodPolicy[n]!;
  const k = key as FoodSetting;
  if (k === "surplus" && value !== null && !SURPLUS_RULES.includes(value as string)) return "food can't be sent there yet";
  if (castle >= 0) {
    if (castle >= world.provinceCount || world.provinceOwner[castle] !== n || !hasCastle(world, castle)) return "not a castle of yours";
    const id = world.provinceIds[castle]!;
    if (value === null) {
      const own = screen.overrides[id];
      if (own) {
        delete own[k];
        if (!Object.keys(own).length) delete screen.overrides[id];
      }
      return null;
    }
    try {
      overrideCastle(screen, id, k, value as never);
    } catch {
      return "no such choice";
    }
    return null;
  }
  if (value === null) return "the realm needs a value";
  try {
    setFoodPolicy(screen, k, value as never);
  } catch {
    return "no such choice";
  }
  return null;
}

/** A preset fills the whole screen at once: the realm's settings, and castles follow it again (REALM-049). */
export function setFoodPreset(world: World, n: number, name: string): string | null {
  if (!(name in realmConfig.food.presets)) return "no such preset";
  const screen = world.foodPolicy[n]!;
  applyPreset(screen, name as PresetName);
  screen.overrides = {};
  return null;
}

/** Numbers for the world hash: every castle store and each realm's policy. */
export function castleFoodHashData(world: World): Float64Array {
  const f = realmConfig.food;
  const code = (p: Partial<FoodPolicy>) => [p.collection ?? -1, p.siegeReserve ?? -1, p.spread ? Object.keys(f.spread_patterns).indexOf(p.spread) : -1, p.famineRule ? Object.keys(f.famine_rule_options).indexOf(p.famineRule) : -1, p.surplus ? f.surplus_options.indexOf(p.surplus) : -1];
  const out: number[] = [...world.castleStore];
  for (const s of world.foodPolicy) {
    out.push(...code(s.realm));
    for (const id of Object.keys(s.overrides).sort()) out.push(world.provinceIndex.get(id) ?? -1, ...code(s.overrides[id]!));
  }
  return Float64Array.from(out);
}

/** A castle as the Food tab shows it. */
export interface CastleView {
  province: number;
  /** Months of its own province's eating in store, and the most it holds. */
  storeMonths: number;
  capMonths: number;
  granary: boolean;
  /** Rings it reaches, and the provinces and people (thousands) it feeds, its own included. */
  reach: number;
  provinces: number;
  people: number;
  besieged: boolean;
  /** An enemy on its roads stops food past him (REALM-056). */
  cut: boolean;
  /** Settings this castle has of its own. */
  own: Partial<FoodPolicy>;
}

/** The player's Food tab: the policy, each row's choices, the presets, the castles and the year's sold and spoiled food. */
export interface FoodView {
  realm: FoodPolicy;
  choices: { collection: number[]; spread: Record<string, number[]>; siegeReserve: number[]; famineRule: string[]; surplus: string[] };
  presets: Record<string, Partial<FoodPolicy>>;
  castles: CastleView[];
  /** The realm's land provinces outside every castle's reach, living on their own harvest (REALM-033). */
  outside: number[];
  /** Months of eating a province's own store holds at most. */
  localCapMonths: number;
  /** Months of its own province's eating a castle store holds without a granary, and with one. */
  castleCapMonths: number;
  granaryCapMonths: number;
  /** Food sold this year and the gold it brought, food spoiled this year, and the gold a food sells for. */
  soldThisYear: number;
  goldThisYear: number;
  spoiledThisYear: number;
  grainGold: number;
}

export function foodView(world: World, n: number): FoodView {
  mapNetwork(world);
  const f = realmConfig.food;
  const screen = world.foodPolicy[n]!;
  const price = grainPrice() * world.rules.defines.castleFood.grainGoldScale;
  const fed = new Map<number, { provinces: number; people: number }>();
  const outside: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceWater[p]) continue;
    const c = world.provinceCastle[p]!;
    if (c < 0) {
      outside.push(p);
      continue;
    }
    const x = fed.get(c) ?? { provinces: 0, people: 0 };
    x.provinces++;
    x.people += world.provincePopulation[p]!;
    fed.set(c, x);
  }
  const castles: CastleView[] = [];
  for (let c = 0; c < world.provinceCount; c++) {
    if (world.provinceOwner[c] !== n || world.provinceWater[c] || !hasCastle(world, c)) continue;
    const people = world.provincePopulation[c]!;
    castles.push({
      province: c,
      storeMonths: people > 0 ? world.castleStore[c]! / people : 0,
      capMonths: people > 0 ? castleCap(world, c) / people : 0,
      granary: hasGranary(world, c),
      reach: reachOf(world, c),
      provinces: fed.get(c)?.provinces ?? 0,
      people: fed.get(c)?.people ?? 0,
      besieged: world.sieges.has(c),
      cut: !!world.castleCut[c],
      own: { ...screen.overrides[world.provinceIds[c]!] },
    });
  }
  return {
    realm: { ...screen.realm },
    choices: { collection: [...f.collection_options], spread: { ...f.spread_patterns }, siegeReserve: [...f.siege_reserve_options], famineRule: Object.keys(f.famine_rule_options), surplus: [...SURPLUS_RULES] },
    presets: f.presets as Record<string, Partial<FoodPolicy>>,
    castles,
    outside,
    localCapMonths: world.rules.defines.castleFood.localStoreCapMonths,
    castleCapMonths: world.rules.defines.castleFood.castleStoreMonths,
    granaryCapMonths: world.rules.defines.castleFood.granaryStoreMonths,
    soldThisYear: world.nationFoodSold[n]!,
    goldThisYear: world.nationFoodSold[n]! * price,
    spoiledThisYear: world.nationFoodSpoiled[n]!,
    grainGold: price,
  };
}
