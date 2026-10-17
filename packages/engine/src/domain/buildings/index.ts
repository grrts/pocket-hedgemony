import raw from "../../../../rules/data/domain/buildings.json" with { type: "json" };
import type { Rng } from "../../rng.ts";

/**
 * Buildings (BLD): what stands on a province's tiles, town slots and ring
 * works; how it is built (gold up front, materials, crews, months), kept
 * (monthly upkeep, condition), upgraded, converted, damaged and lost, and who
 * owns it. Pure rules over plain data; numbers come from buildings.json.
 */

// ---------------------------------------------------------------- config

export type Material = "timber" | "stone" | "bricks" | "earth" | "iron" | "steel" | "concrete";

export interface StepCost {
  gold: number | null;
  months: number | null;
  crew?: number;
  timber?: number;
  stone?: number;
  bricks?: number;
  iron?: number;
  steel?: number;
  concrete?: number;
}

export interface StepDef {
  name: string;
  jobs?: number;
  cost: StepCost;
  upkeep?: number;
  unlocked_by: string;
  needs?: Record<string, unknown>;
  flags?: string[];
  makes?: Record<string, number>;
  eats?: Record<string, number>;
  berths?: number;
  slipways?: number;
  training_room?: number;
  officials?: number;
  lords?: number;
  seats?: number | Record<string, number>;
  student_seats_with_L1?: number;
  no_soldiers_quartered?: boolean;
  effect?: string;
}

export interface BuildingType {
  id: string;
  place: string[];
  class: string | null;
  limit: "per_place" | "per_province" | "per_faith_per_town" | "per_realm";
  group: string | null;
  steps: StepDef[];
  aliases?: string[];
  craft?: boolean;
  converts_to?: string[];
  crops?: string[];
  food_crop?: string;
  years_to_bear?: number;
  forced_labour_bonus?: boolean;
  owner_default?: string;
  faith_effect?: "pulls" | "calms";
  never_on_build_sheet?: boolean;
  pilgrims_count_as_traders?: boolean;
  outside_town?: boolean;
  makes_clergy?: boolean;
  grain_at_farm_rate?: boolean;
  makes_smoke?: boolean;
  products?: string[];
  effects?: string[];
  enables?: string[];
  coins?: string[];
  shelters_homeless?: number;
  town_death_rate_slower?: number;
  town_plague_deaths_factor?: number;
  town_size_bonus?: number;
  next_zone_storm_loss_factor?: number;
  days_to_capital?: number;
  adds_river?: boolean;
  stops_floods_to_marsh?: boolean;
  drain_marsh_with?: string;
  port?: boolean;
  raises_sailors?: boolean;
  needs_building?: string;
  stores_keep?: boolean;
  loot_first?: boolean;
  jobs_text?: string;
}

export interface Landmark {
  id: string;
  province: string;
  present_1444: boolean;
  founded_by_event?: number;
  building: string;
  step: number;
  condition?: Condition;
  converts_by_event?: number;
  asks_gifts_while_built?: boolean;
  restoring_is_decision?: boolean;
  slipways?: number;
  material?: string;
}

export interface BuildingsConfig {
  materials: Record<Material, { made_by: string; price: number; far_price_multiplier?: number; far_after_rings?: number; counts_as?: string; grounds?: string[]; upkeep_multiplier?: number; from_era?: number }>;
  ground_multiplier: Record<string, number>;
  town_slots: Record<TownSize | "capital_extra", number>;
  town_sizes: TownSize[];
  sites: {
    per_province: { land: number; town: number };
    master_of_works: { extra_sites: number; months_multiplier: number };
    half_crew_months_multiplier: number;
    cancel_refund: number;
    stop_months_by_climate: Record<string, number[]>;
  };
  condition: {
    neglected_output: number;
    damaged_output: number;
    years_neglected_to_lose_step: number;
    repair_cost_share: number;
    rebuild_cost_share: number;
    demolish_material_refund: number;
    neglect_recovery_months: number;
  };
  damage: { plunder_share: number; plunder_share_with_walls: number; earthquake_share: number; fire_buildings: [number, number] };
  village_works: { chance_per_year: number; needs: { years_at_peace: number; food_store_months_over: number }; builds: Record<string, string>; owner: string };
  crafts_appearing: { builds: string[]; raw: Record<string, string>; owners: string[] };
  upkeep_groups: Record<string, [number, number] | string>;
  arsenal: { spoil_share_without: number };
  ai: { reserve_years_of_upkeep: number; homeless_share_trigger: number; food_months_trigger: number };
  advice: { max_lines: number };
  loyalty_steps: string[];
  owners_may_build: Record<string, string[]>;
  company_output_share: number;
  lord_traits: Record<string, string[]>;
  clergy_order: string[];
  town_order: string[];
  company_order: string[];
  ai_personality: Record<string, string[]>;
  map_wealth: Record<string, { built_tile_share: number; buildings?: string[]; town_step?: number }>;
  templates: Record<string, { type: string; name: string; faith?: string }[]>;
  variants: Record<string, Record<string, string>>;
  landmarks: Landmark[];
  anchors: { id: string; province: string; building: string; from_year: number; by_event?: boolean }[];
  inventions: Record<string, string>;
  buildings: BuildingType[];
}

export const buildingsConfig = raw as unknown as BuildingsConfig;
const cfg = buildingsConfig;

const typeById = new Map<string, BuildingType>();
for (const b of cfg.buildings) {
  typeById.set(b.id, b);
  for (const a of b.aliases ?? []) typeById.set(a, b);
}

/** A building type by its id or another name for it. */
export function buildingType(id: string): BuildingType {
  const t = typeById.get(id);
  if (!t) throw new Error(`Unknown building ${id}`);
  return t;
}

/** Finds a building type and step by a step's name ("stone castle", "yearly fair") or a type id (step 1). */
export function findStep(name: string): { type: BuildingType; step: number } {
  const t = typeById.get(name);
  if (t) return { type: t, step: 1 };
  for (const b of cfg.buildings) {
    const i = b.steps.findIndex((s) => s.name === name);
    if (i >= 0) return { type: b, step: i + 1 };
  }
  throw new Error(`Unknown building or step ${name}`);
}

export function stepDef(type: string, step: number): StepDef {
  const s = buildingType(type).steps[step - 1];
  if (!s) throw new Error(`${type} has no step ${step}`);
  return s;
}

export function topStep(type: string): number {
  return buildingType(type).steps.length;
}

// ---------------------------------------------------------------- places and slots

export type TownSize = "hamlet" | "village" | "market_town" | "town" | "city" | "great_city";
export type TileUse = "fields" | "pasture" | "woods" | "marsh" | "waste" | "hills" | "mountains";
export type Condition = "sound" | "neglected" | "damaged" | "ruined";
/** "crown", "clergy", "town", "commons", "lord:<id>" or "company:<id>". */
export type Owner = string;

/** Town slots of a town size, one more in the capital (held for the palace). */
export function townSlots(size: TownSize, capital = false): number {
  return cfg.town_slots[size] + (capital ? cfg.town_slots.capital_extra : 0);
}

export function townAtLeast(size: TownSize, min: TownSize): boolean {
  return cfg.town_sizes.indexOf(size) >= cfg.town_sizes.indexOf(min);
}

/** What kind of place a building type stands on. */
export type PlaceKind = "land" | "shore" | "castle" | "town" | "capital_extra" | "ring" | "outside" | "part_of_castle" | "holy_place";

export function placeKind(type: string): PlaceKind {
  const p = buildingType(type).place;
  if (p.includes("town")) return "town";
  for (const k of ["shore", "castle", "capital_extra", "ring", "outside", "part_of_castle", "holy_place"] as const) if (p.includes(k)) return k;
  return "land";
}

/** Sites count as land or town sites (ring works and outside buildings count as land). */
export function siteKind(type: string): "land" | "town" {
  const k = placeKind(type);
  return k === "town" || k === "capital_extra" ? "town" : "land";
}

export interface Building {
  id: number;
  type: string;
  /** "tile:5", "shore:1", "castle", "town:3", "capital_extra", "ring:road", "outside:observatory". */
  place: string;
  step: number;
  owner: Owner;
  filled: number;
  condition: Condition;
  yearsNeglected: number;
  paidMonthsSinceNeglect: number;
  /** Seasons a damaged building still makes nothing (its first season). */
  idleSeasons: number;
  crop?: string;
  pendingCrop?: { crop: string; seasons: number };
  faith?: string;
  product?: string;
  /** Neglected because the town shrank below it. */
  shrinkNeglect?: boolean;
  builtYear?: number;
  /** Order of building, to find the newest. */
  order: number;
  landmark?: string;
  /** A regional or faith name (church, mosque, bazaar). */
  name?: string;
  /** Materials it was actually built with, when known. */
  builtWith?: Partial<Record<Material, number>>;
  upkeepPayer?: Owner;
  seam?: number;
}

export interface Tile {
  use: TileUse;
  ground?: string;
  burned?: boolean;
}

export interface Province {
  id: string;
  country: string;
  lord?: string;
  townSize: TownSize;
  capital: boolean;
  ground: string;
  climate?: string;
  tiles: Tile[];
  shoreTiles: number;
  homeless: number;
  classes: Record<string, number>;
  buildings: Building[];
  charters: Set<string>;
  officials: Set<string>;
  enemyArmy?: boolean;
  occupiedBy?: string;
  rebels?: boolean;
  yearsAtPeace: number;
  foodMonths: number;
  faithShares: Record<string, number>;
  holyPlace?: boolean;
  makes: Set<string>;
  neighbours: string[];
  /** Neighbours joined by a road or a river (reach goes further along them). */
  roadOrRiver: string[];
  quarryDistance?: number;
  grievances: string[];
  plague?: boolean;
  floodPlain?: boolean;
}

export interface Site {
  id: number;
  province: string;
  place: string;
  type: string;
  step: number;
  owner: Owner;
  kind: "land" | "town";
  monthsTotal: number;
  monthsDone: number;
  crewNeeded: number;
  crew: number;
  crewHomeless: number;
  crewFromClasses: Record<string, number>;
  gold: number;
  materials: Partial<Record<Material, number>>;
  materialsUsed: Partial<Record<Material, number>>;
  upgrade: boolean;
  stopped: string[];
  faith?: string;
}

export interface Lord {
  id: string;
  wealth: number;
  loyalty: string;
  trait?: string;
}

export interface Realm {
  country: string;
  treasury: number;
  inventions: Set<string>;
  capital: string;
  era: number;
  year: number;
  month: number;
  provinces: Map<string, Province>;
  sites: Site[];
  lords: Map<string, Lord>;
  purses: Map<Owner, number>;
  report: string[];
  advice: Advice[];
  nextId: number;
  armsStore?: number;
}

export function createRealm(country: string, init: Partial<Realm> = {}): Realm {
  return {
    country,
    treasury: 0,
    inventions: new Set(),
    capital: "",
    era: 1,
    year: 1444,
    month: 11,
    provinces: new Map(),
    sites: [],
    lords: new Map(),
    purses: new Map(),
    report: [],
    advice: [],
    nextId: 1,
    ...init,
  };
}

export function addProvince(r: Realm, id: string, init: Partial<Province> = {}): Province {
  const p: Province = {
    id,
    country: r.country,
    townSize: "town",
    capital: false,
    ground: "farmland",
    tiles: [],
    shoreTiles: 0,
    homeless: 0,
    classes: {},
    buildings: [],
    charters: new Set(),
    officials: new Set(),
    yearsAtPeace: 10,
    foodMonths: 6,
    faithShares: {},
    makes: new Set(),
    neighbours: [],
    roadOrRiver: [],
    grievances: [],
    ...init,
  };
  if (p.capital) r.capital = id;
  r.provinces.set(id, p);
  return p;
}

export function prov(r: Realm, id: string): Province {
  const p = r.provinces.get(id);
  if (!p) throw new Error(`No province ${id}`);
  return p;
}

/** Puts a finished building straight on the map (start of the game, events, tests). */
export function placeBuilding(r: Realm, provinceId: string, type: string, place: string, init: Partial<Building> = {}): Building {
  const p = prov(r, provinceId);
  const t = buildingType(type);
  const step = init.step ?? 1;
  const b: Building = {
    id: r.nextId++,
    type: t.id,
    place,
    step,
    owner: t.owner_default ?? "crown",
    filled: 0,
    condition: "sound",
    yearsNeglected: 0,
    paidMonthsSinceNeglect: 0,
    idleSeasons: 0,
    order: r.nextId,
    ...init,
  };
  p.buildings.push(b);
  return b;
}

/** The first free place of a kind in a province, or null. */
export function freePlace(r: Realm, provinceId: string, type: string): string | null {
  const p = prov(r, provinceId);
  const t = buildingType(type);
  const kind = placeKind(type);
  const taken = (place: string) => p.buildings.some((b) => b.place === place) || r.sites.some((s) => s.province === p.id && s.place === place);
  if (kind === "town") {
    for (let i = 1; i <= townSlots(p.townSize); i++) if (!taken(`town:${i}`)) return `town:${i}`;
    return null;
  }
  if (kind === "land") {
    const i = p.tiles.findIndex((tile, i) => t.place.includes(tile.use) && !taken(`tile:${i + 1}`));
    return i >= 0 ? `tile:${i + 1}` : null;
  }
  if (kind === "shore") {
    for (let i = 1; i <= p.shoreTiles; i++) if (!taken(`shore:${i}`)) return `shore:${i}`;
    return null;
  }
  if (kind === "castle") return taken("castle") ? null : "castle";
  if (kind === "capital_extra") return p.capital && !taken("capital_extra") ? "capital_extra" : null;
  if (kind === "ring") return taken(`ring:${t.id}`) ? null : `ring:${t.id}`;
  if (kind === "outside") return `outside:${t.id}`;
  if (kind === "part_of_castle") return "castle:granary";
  return null;
}

export type Check = { ok: true } | { ok: false; reason: string };

function needsMet(r: Realm, p: Province, needs: Record<string, unknown> | undefined): string | null {
  if (!needs) return null;
  for (const [k, v] of Object.entries(needs)) {
    if (k === "min_town" && !townAtLeast(p.townSize, v as TownSize)) return `needs a ${String(v).replace("_", " ")} or bigger`;
    if (k === "charter" && !p.charters.has(v as string)) return `needs a ${String(v)}`;
    if (k === "official_in_province" && p.officials.size === 0) return "needs an official in the province";
    if (k === "building_in_province" && !p.buildings.some((b) => b.type === v && b.condition !== "ruined")) return `needs a ${String(v)}`;
    if (k === "building_in_province_any" && !(v as string[]).some((t) => p.buildings.some((b) => b.type === t))) return `needs a ${(v as string[]).join(" or ")}`;
    if (k === "building_step") {
      const [t, s] = v as [string, number];
      if (!p.buildings.some((b) => b.type === t && b.step >= s)) return `needs a ${t} at step ${s}`;
    }
    if (k === "ring_work" && !p.buildings.some((b) => b.type === v)) return `needs a ${String(v)}`;
    if (k === "any_of") {
      const opts = v as unknown[];
      const okOne = opts.some((o) => {
        if (typeof o === "string") return p.makes.has(o) || p.charters.has(o);
        const [key, val] = Object.entries(o as Record<string, unknown>)[0]!;
        if (key === "faith_share_at_least") return Object.values(p.faithShares).some((x) => x >= (val as number) - 1e-9);
        if (key === "charter") return p.charters.has(val as string);
        return false;
      });
      if (!okOne) return "needs are not met";
    }
  }
  return null;
}

/** Why a step can't be built here yet (a missing invention, town size, charter or building), or null. */
export function missingFor(r: Realm, provinceId: string, type: string, step = 1): string | null {
  const s = stepDef(type, step);
  if (s.unlocked_by !== "start" && !r.inventions.has(s.unlocked_by)) return `needs ${cfg.inventions[s.unlocked_by] ?? s.unlocked_by}`;
  return needsMet(r, prov(r, provinceId), s.needs);
}

function limitReached(r: Realm, p: Province, type: string, faith?: string): string | null {
  const t = buildingType(type);
  const standing = (q: Province) => [...q.buildings.filter((b) => b.type === t.id), ...r.sites.filter((s) => s.province === q.id && s.type === t.id && !s.upgrade)];
  if (t.limit === "per_province" && standing(p).length > 0) return `one ${t.id} per province`;
  if (t.limit === "per_faith_per_town" && p.buildings.some((b) => b.type === t.id && b.faith === faith)) return `one ${t.id} per faith per town`;
  if (t.limit === "per_realm") {
    if (p.id !== r.capital) return `the ${t.id} stands in the capital`;
    if ([...r.provinces.values()].some((q) => standing(q).length > 0)) return `one ${t.id} per realm`;
  }
  return null;
}

/** May this type be built on this place: place fits and is free, no other site on it, limits, needs and unlocks met. */
export function canBuild(r: Realm, provinceId: string, type: string, place?: string, opts: { faith?: string } = {}): Check {
  const p = prov(r, provinceId);
  const t = buildingType(type);
  if (t.never_on_build_sheet) return { ok: false, reason: "not built from the build sheet" };
  const at = place ?? freePlace(r, provinceId, type);
  if (!at) return { ok: false, reason: "no free place" };
  if (r.sites.some((s) => s.province === p.id && s.place === at)) return { ok: false, reason: "a site is already running there" };
  if (p.buildings.some((b) => b.place === at)) return { ok: false, reason: "the place is taken" };
  if (!fits(p, t, at)) return { ok: false, reason: `a ${t.id} does not fit there` };
  const limit = limitReached(r, p, type, opts.faith);
  if (limit) return { ok: false, reason: limit };
  if (placeKind(type) === "part_of_castle" && !p.buildings.some((b) => b.type === "castle")) return { ok: false, reason: "needs a castle" };
  const missing = missingFor(r, provinceId, type, 1);
  if (missing) return { ok: false, reason: missing };
  return { ok: true };
}

function fits(p: Province, t: BuildingType, place: string): boolean {
  const [kind, idx] = place.split(":");
  const k = placeKind(t.id);
  if (kind === "tile") return k === "land" && t.place.includes(p.tiles[Number(idx) - 1]?.use ?? "");
  if (kind === "town") return k === "town" && Number(idx) <= townSlots(p.townSize);
  if (kind === "capital_extra") return t.id === "palace" && p.capital;
  if (kind === "shore") return k === "shore";
  if (kind === "castle") return idx === "granary" ? k === "part_of_castle" : k === "castle";
  if (kind === "ring") return k === "ring" && idx === t.id;
  if (kind === "outside") return k === "outside" || !!t.outside_town;
  return false;
}

/** Town slots in use (ring works, outside buildings and the castle's granary take none). */
export function townSlotsUsed(p: Province): number {
  return p.buildings.filter((b) => b.place.startsWith("town:")).length;
}

// ---------------------------------------------------------------- the build sheet

export interface SheetRow {
  type: string;
  step: number;
  jobs: string;
  cost: string;
  grey: boolean;
  missing: string | null;
}

export function formatCost(c: StepCost, mult = 1): string {
  const parts = [`${fmt((c.gold ?? 0) * mult)} g`];
  for (const m of ["timber", "stone", "bricks", "iron", "steel", "concrete"] as const) if (c[m]) parts.push(`${c[m]} ${m}`);
  parts.push(`${fmt((c.months ?? 0) * mult)} mo`);
  return parts.join(" · ");
}

export function formatJobs(type: string, step = 1): string {
  const t = buildingType(type);
  if (t.jobs_text && step === 1) return t.jobs_text;
  const s = stepDef(type, step);
  return s.jobs === undefined ? "" : `${s.jobs.toLocaleString("en-US")} ${(t.class ?? "").replace(/_/g, " ")}`;
}

/** The build sheet for a place: every fitting building, its cost multiplied by the ground, greyed with what it misses. */
export function buildSheet(r: Realm, provinceId: string, place?: string): SheetRow[] {
  const p = prov(r, provinceId);
  const rows: SheetRow[] = [];
  for (const t of cfg.buildings) {
    if (t.never_on_build_sheet) continue;
    if (place && !fits(p, t, place)) continue;
    const missing = missingFor(r, provinceId, t.id, 1);
    rows.push({ type: t.id, step: 1, jobs: formatJobs(t.id), cost: formatCost(stepDef(t.id, 1).cost, groundMultiplier(p.ground)), grey: missing !== null, missing });
  }
  return rows;
}

/** The upgrade list of a building: its next steps, greyed with what they miss. */
export function upgradeList(r: Realm, provinceId: string, b: Building): SheetRow[] {
  const t = buildingType(b.type);
  return t.steps.slice(b.step).map((s, i) => {
    const step = b.step + i + 1;
    const missing = missingFor(r, provinceId, b.type, step);
    return { type: s.name, step, jobs: formatJobs(b.type, step), cost: formatCost(s.cost), grey: missing !== null, missing };
  });
}

// ---------------------------------------------------------------- costs and materials

export function groundMultiplier(ground: string): number {
  return cfg.ground_multiplier[ground] ?? 1;
}

export interface Cost {
  gold: number;
  months: number;
  crew: number;
  materials: Partial<Record<Material, number>>;
}

/** A step's cost on a ground: gold and months multiplied, materials not; a master of works halves the months. */
export function costOf(type: string, step: number, ground = "farmland", masterOfWorks = false): Cost {
  const c = stepDef(type, step).cost;
  const g = groundMultiplier(ground);
  const materials: Partial<Record<Material, number>> = {};
  for (const m of ["timber", "stone", "bricks", "iron", "steel", "concrete"] as const) if (c[m]) materials[m] = c[m];
  return {
    gold: (c.gold ?? 0) * g,
    months: (c.months ?? 0) * g * (masterOfWorks ? cfg.sites.master_of_works.months_multiplier : 1),
    crew: c.crew ?? 0,
    materials,
  };
}

/** May a material be used yet: iron from era IV, steel and concrete from era VI. */
export function materialAvailable(m: Material, era: number): boolean {
  return era >= (cfg.materials[m].from_era ?? 1);
}

/** Bricks stand in for stone one for one; earth too, in drylands, desert and savanna. */
export function mayStandIn(m: Material, forMaterial: Material, ground?: string): boolean {
  const def = cfg.materials[m];
  if (def.counts_as !== forMaterial) return false;
  return !def.grounds || (ground !== undefined && def.grounds.includes(ground));
}

/** Upkeep multiplier of a building built in earth (×2). */
export function earthUpkeepMultiplier(): number {
  return cfg.materials.earth.upkeep_multiplier ?? 1;
}

/** Price of loads bought at the market; stone more than 3 provinces from any quarry costs twice. */
export function buyPrice(m: Material, loads: number, quarryDistance = 0): number {
  const def = cfg.materials[m];
  const far = def.far_after_rings !== undefined && quarryDistance > def.far_after_rings ? (def.far_price_multiplier ?? 1) : 1;
  return loads * def.price * far;
}

export type Source = { from: "own"; province: string } | { from: "reach"; province: string; along: "ring" | "road" } | { from: "market"; gold: number };

/**
 * Where a site's material comes from: the province's own wares, then a realm
 * province in reach (one ring away, or further along roads and rivers), then the market.
 */
export function sourceMaterial(r: Realm, provinceId: string, m: Material, loads: number): Source {
  const p = prov(r, provinceId);
  if (p.makes.has(m)) return { from: "own", province: p.id };
  for (const n of p.neighbours) {
    const q = r.provinces.get(n);
    if (q && q.country === r.country && q.makes.has(m)) return { from: "reach", province: n, along: "ring" };
  }
  const seen = new Set([p.id]);
  const queue = [...p.roadOrRiver];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const q = r.provinces.get(id);
    if (!q || q.country !== r.country) continue;
    if (q.makes.has(m)) return { from: "reach", province: id, along: "road" };
    queue.push(...q.roadOrRiver);
  }
  return { from: "market", gold: buyPrice(m, loads, p.quarryDistance ?? 0) };
}

// ---------------------------------------------------------------- owners' purses

export function purse(r: Realm, owner: Owner): number {
  if (owner === "crown") return r.treasury;
  if (owner.startsWith("lord:")) return r.lords.get(owner.slice(5))?.wealth ?? 0;
  return r.purses.get(owner) ?? 0;
}

export function pay(r: Realm, owner: Owner, gold: number): boolean {
  if (purse(r, owner) < gold - 1e-9) return false;
  addGold(r, owner, -gold);
  return true;
}

export function addGold(r: Realm, owner: Owner, gold: number): void {
  if (owner === "crown") r.treasury += gold;
  else if (owner.startsWith("lord:")) {
    const l = r.lords.get(owner.slice(5));
    if (l) l.wealth += gold;
  } else r.purses.set(owner, (r.purses.get(owner) ?? 0) + gold);
}

// ---------------------------------------------------------------- sites

/** How many land and town sites an owner may run at once in a province. */
export function siteCapacity(p: Province): { land: number; town: number } {
  const extra = p.officials.has("master of works") ? cfg.sites.master_of_works.extra_sites : 0;
  return { land: cfg.sites.per_province.land + extra, town: cfg.sites.per_province.town + extra };
}

function siteOwnerGroup(owner: Owner): string {
  return owner.startsWith("lord:") ? owner : "crown";
}

export type StartResult = { ok: true; site: Site } | { ok: false; reason: string };

/**
 * Starts a site: the owner pays the gold up front, the crew is taken from the
 * homeless first and then from every class by its share, and materials wait to be sourced.
 */
export function startSite(r: Realm, provinceId: string, type: string, opts: { place?: string; owner?: Owner; step?: number; faith?: string; payer?: Owner; costShare?: number } = {}): StartResult {
  const p = prov(r, provinceId);
  const step = opts.step ?? 1;
  const upgrade = step > 1 && p.buildings.some((b) => b.type === buildingType(type).id && b.step === step - 1);
  const place = opts.place ?? (upgrade ? p.buildings.find((b) => b.type === buildingType(type).id && b.step === step - 1)!.place : freePlace(r, provinceId, type));
  if (!place) return { ok: false, reason: "no free place" };
  if (r.sites.some((s) => s.province === p.id && s.place === place)) return { ok: false, reason: "one site per place" };
  if (!upgrade && step === 1) {
    const check = canBuild(r, provinceId, type, place, opts.faith !== undefined ? { faith: opts.faith } : {});
    if (!check.ok) return check;
  } else {
    const missing = missingFor(r, provinceId, type, step);
    if (missing) return { ok: false, reason: missing };
  }
  const owner = opts.owner ?? "crown";
  const kind = siteKind(type);
  const group = siteOwnerGroup(owner);
  const running = r.sites.filter((s) => s.province === p.id && s.kind === kind && siteOwnerGroup(s.owner) === group).length;
  if (running >= siteCapacity(p)[kind]) return { ok: false, reason: `no free ${kind} site in ${p.id}` };
  const cost = costOf(type, step, p.ground, p.officials.has("master of works"));
  const share = opts.costShare ?? 1;
  const payer = opts.payer ?? owner;
  if (!pay(r, payer, cost.gold * share)) return { ok: false, reason: "not enough gold" };
  const site: Site = {
    id: r.nextId++,
    province: p.id,
    place,
    type: buildingType(type).id,
    step,
    owner,
    kind,
    monthsTotal: cost.months * share,
    monthsDone: 0,
    crewNeeded: cost.crew,
    crew: 0,
    crewHomeless: 0,
    crewFromClasses: {},
    gold: cost.gold * share,
    materials: Object.fromEntries(Object.entries(cost.materials).map(([m, n]) => [m, n * share])),
    materialsUsed: {},
    upgrade,
    stopped: [],
  };
  if (opts.faith !== undefined) site.faith = opts.faith;
  takeCrew(p, site);
  r.sites.push(site);
  return { ok: true, site };
}

/** Takes a site's crew: the homeless first, then every class by its share; their slots stay empty while they build. */
export function takeCrew(p: Province, site: Site): void {
  const fromHomeless = Math.min(p.homeless, site.crewNeeded);
  p.homeless -= fromHomeless;
  site.crewHomeless = fromHomeless;
  let rest = site.crewNeeded - fromHomeless;
  const total = Object.values(p.classes).reduce((a, b) => a + b, 0);
  if (rest > 0 && total > 0) {
    const take = Math.min(rest, total);
    for (const [cls, n] of Object.entries(p.classes)) {
      const t = Math.round((take * n) / total);
      site.crewFromClasses[cls] = t;
      p.classes[cls] = n - t;
    }
    rest -= Object.values(site.crewFromClasses).reduce((a, b) => a + b, 0);
  }
  site.crew = site.crewNeeded - Math.max(0, rest);
}

/** Homeless the province counts toward the homeless trouble (crews at work don't count). */
export function homelessForTrouble(p: Province): number {
  return p.homeless;
}

/** Months a site takes at its crew: twice with half the crew; stopped with none. */
export function siteMonths(monthsTotal: number, crew: number, crewNeeded: number): number | "stopped" {
  if (crewNeeded === 0) return monthsTotal;
  if (crew <= 0) return "stopped";
  return monthsTotal * (crewNeeded / crew);
}

/** Why a site is stopped this month: no crew, the season, an enemy army or occupation. */
export function stopReasons(r: Realm, site: Site, month = r.month): string[] {
  const p = prov(r, site.province);
  const reasons: string[] = [];
  if (site.crew <= 0) reasons.push("no crew");
  if (site.kind === "land" && p.climate && (cfg.sites.stop_months_by_climate[p.climate] ?? []).includes(month)) reasons.push("season");
  if (p.enemyArmy) reasons.push("enemy army");
  if (p.occupiedBy) reasons.push("occupied");
  return reasons;
}

/** Advances every site a month; finished ones become buildings (job slots open before overflow runs). */
export function advanceSites(r: Realm, month = r.month): Building[] {
  const done: Building[] = [];
  for (const site of [...r.sites]) {
    site.stopped = stopReasons(r, site, month);
    if (site.stopped.length) continue;
    site.monthsDone += site.crewNeeded ? site.crew / site.crewNeeded : 1;
    if (site.monthsDone >= site.monthsTotal - 1e-9) done.push(completeSite(r, site).building);
  }
  return done;
}

/** The occupier may loot a stopped site's materials. */
export function lootSite(r: Realm, site: Site, by: string): Partial<Record<Material, number>> {
  const p = prov(r, site.province);
  if (p.occupiedBy !== by) return {};
  const loot = { ...site.materials };
  site.materials = {};
  return loot;
}

/** A sacked town loses its town site. */
export function sackTown(r: Realm, provinceId: string): void {
  r.sites = r.sites.filter((s) => !(s.province === provinceId && s.kind === "town"));
  for (const b of prov(r, provinceId).buildings) if (b.place.startsWith("town:")) fallStep(r, provinceId, b);
}

/** Cancels a site: half the gold and the materials not yet used come back; the crew goes home. */
export function cancelSite(r: Realm, site: Site): { gold: number; materials: Partial<Record<Material, number>> } {
  const gold = site.gold * cfg.sites.cancel_refund;
  const materials: Partial<Record<Material, number>> = {};
  for (const [m, n] of Object.entries(site.materials) as [Material, number][]) materials[m] = n - (site.materialsUsed[m] ?? 0);
  addGold(r, site.owner, gold);
  returnCrew(prov(r, site.province), site, 0);
  r.sites = r.sites.filter((s) => s !== site);
  return { gold, materials };
}

function returnCrew(p: Province, site: Site, intoSlots: number): void {
  p.homeless += site.crewHomeless - intoSlots;
  for (const [cls, n] of Object.entries(site.crewFromClasses)) p.classes[cls] = (p.classes[cls] ?? 0) + n;
}

/**
 * Finishes a site: the building stands (or goes up a step); homeless crew move
 * into its job slots if they fit the class, the rest go back to being homeless,
 * and crew from other classes return to their slots.
 */
export function completeSite(r: Realm, site: Site): { building: Building; toSlots: number; toHomeless: number } {
  const p = prov(r, site.province);
  r.sites = r.sites.filter((s) => s !== site);
  let b = p.buildings.find((x) => x.place === site.place);
  if (b && site.upgrade) b.step = site.step;
  else if (b && b.condition === "ruined") b.condition = "sound";
  else b = placeBuilding(r, p.id, site.type, site.place, { step: site.step, owner: site.owner, builtYear: r.year, ...(site.faith !== undefined ? { faith: site.faith } : {}) });
  b.condition = b.condition === "ruined" ? "sound" : b.condition;
  const jobs = stepDef(b.type, b.step).jobs ?? 0;
  const t = buildingType(b.type);
  const toSlots = t.class ? Math.min(site.crewHomeless, Math.max(0, jobs - b.filled)) : 0;
  b.filled += toSlots;
  returnCrew(p, site, toSlots);
  r.report.push(`${p.id}: ${stepDef(b.type, b.step).name} finished.`);
  return { building: b, toSlots, toHomeless: site.crewHomeless - toSlots };
}

/** While upgrading, a building works at its old step, a castle one step lower. */
export function worksAsStep(r: Realm, provinceId: string, b: Building): number {
  const upgrading = r.sites.some((s) => s.province === provinceId && s.place === b.place && s.upgrade);
  return upgrading && b.type === "castle" ? Math.max(0, b.step - 1) : b.step;
}

/** Starts an upgrade to the next step, if that step's needs are met. */
export function upgrade(r: Realm, provinceId: string, b: Building, owner: Owner = b.owner): StartResult {
  if (b.step >= topStep(b.type)) return { ok: false, reason: "no next step" };
  return startSite(r, provinceId, b.type, { step: b.step + 1, owner, place: b.place });
}

// ---------------------------------------------------------------- upkeep and condition

/** Yearly upkeep of a building at its step (earth doubles it; the commons pay none). */
export function yearlyUpkeep(b: Building, opts: { earth?: boolean } = {}): number {
  if (b.owner === "commons") return 0;
  const u = stepDef(b.type, Math.min(b.step, topStep(b.type))).upkeep ?? 0;
  return u * (opts.earth ? earthUpkeepMultiplier() : 1);
}

/** The yearly upkeep range of a building's group. */
export function upkeepRange(type: string): [number, number] | string | null {
  const g = buildingType(type).group;
  return g ? (cfg.upkeep_groups[g] ?? null) : null;
}

/** Who pays a building's upkeep: its owner (the clergy for houses of worship), unless the crown took it over. */
export function upkeepPayer(b: Building): Owner {
  return b.upkeepPayer ?? b.owner;
}

/** Sum of the crown's building upkeep a year, for the Treasury card's Upkeep line. */
export function realmUpkeep(r: Realm, payer: Owner = "crown"): number {
  let sum = 0;
  for (const p of r.provinces.values()) for (const b of p.buildings) if (upkeepPayer(b) === payer && b.condition !== "ruined") sum += yearlyUpkeep(b);
  return sum;
}

/**
 * Each month every owner pays a twelfth of the yearly upkeep. Unpaid, a building
 * goes neglected (the turn report says so the first month); paid again for a
 * full season, it is sound again.
 */
export function monthlyUpkeep(r: Realm): { paid: Map<Owner, number>; neglected: Building[] } {
  const paid = new Map<Owner, number>();
  const neglected: Building[] = [];
  let firstUnpaid = false;
  for (const p of r.provinces.values())
    for (const b of p.buildings) {
      if (b.condition === "ruined") continue;
      const due = yearlyUpkeep(b) / 12;
      const payer = upkeepPayer(b);
      if (due > 0 && !pay(r, payer, due)) {
        if (b.condition === "sound") firstUnpaid = true;
        if (b.condition !== "damaged") b.condition = "neglected";
        b.paidMonthsSinceNeglect = 0;
        neglected.push(b);
        continue;
      }
      paid.set(payer, (paid.get(payer) ?? 0) + due);
      if (b.condition === "neglected" && !b.shrinkNeglect) {
        b.paidMonthsSinceNeglect += 1;
        if (b.paidMonthsSinceNeglect >= cfg.condition.neglect_recovery_months) {
          b.condition = "sound";
          b.yearsNeglected = 0;
        }
      }
    }
  if (firstUnpaid) r.report.push(`${r.country}: building upkeep unpaid this month.`);
  return { paid, neglected };
}

/** How much a building works: sound full, neglected or damaged half (damaged nothing in its first season), ruined nothing. */
export function outputFactor(b: Building): number {
  if (b.condition === "ruined") return 0;
  if (b.condition === "damaged") return b.idleSeasons > 0 ? 0 : cfg.condition.damaged_output;
  if (b.condition === "neglected") return cfg.condition.neglected_output;
  return 1;
}

/** What a building makes in a year: only filled slots make wares, times its condition. */
export function yearlyMakes(b: Building): Record<string, number> {
  const s = stepDef(b.type, b.step);
  const jobs = s.jobs ?? 0;
  const out: Record<string, number> = {};
  for (const [w, n] of Object.entries(stepDef(b.type, 1).makes ?? {})) out[w] = jobs > 0 ? (n * b.filled) / jobs * outputFactor(b) : 0;
  return out;
}

/** Damages a building: half output, nothing in its first season. */
export function damage(b: Building): void {
  if (b.condition === "ruined") return;
  b.condition = "damaged";
  b.idleSeasons = 1;
}

export function endSeason(b: Building): void {
  if (b.idleSeasons > 0) b.idleSeasons -= 1;
  if (b.pendingCrop) {
    b.pendingCrop.seasons -= 1;
    if (b.pendingCrop.seasons <= 0) {
      b.crop = b.pendingCrop.crop;
      delete b.pendingCrop;
    }
  }
}

/** Ruins a building: it makes nothing until rebuilt at half cost or cleared. */
export function ruin(r: Realm, b: Building, cause = "lost"): void {
  b.condition = "ruined";
  b.filled = 0;
  r.report.push(`${stepDef(b.type, b.step).name} ${cause}.`);
}

/** Cost to repair a damaged building, or rebuild a ruined one: half the gold, materials and months. */
export function repairCost(b: Building, ground = "farmland"): Cost {
  const c = costOf(b.type, b.step, ground);
  const share = b.condition === "ruined" ? cfg.condition.rebuild_cost_share : cfg.condition.repair_cost_share;
  return {
    gold: c.gold * share,
    months: c.months * share,
    crew: c.crew,
    materials: Object.fromEntries(Object.entries(c.materials).map(([m, n]) => [m, n * share])),
  };
}

/** Clears a ruin so the place is free for something else. */
export function clearRuin(r: Realm, provinceId: string, b: Building): void {
  const p = prov(r, provinceId);
  if (b.condition !== "ruined") throw new Error("only a ruin can be cleared");
  p.buildings = p.buildings.filter((x) => x !== b);
}

/** Takes a building down one step; a step-1 building that falls is ruined. */
export function fallStep(r: Realm, _provinceId: string, b: Building): void {
  if (b.step > 1) b.step -= 1;
  else ruin(r, b);
}

/** A year passes: neglect years counted, a step lost after 10 years of neglect. */
export function yearOfNeglect(r: Realm, provinceId: string, b: Building): void {
  if (b.condition !== "neglected") return;
  b.yearsNeglected += 1;
  if (b.yearsNeglected >= cfg.condition.years_neglected_to_lose_step) {
    b.yearsNeglected = 0;
    fallStep(r, provinceId, b);
  }
}

/** A year of peace: one ruined land building on a burned tile rebuilds by itself; town buildings wait for an owner. */
export function yearlySelfRebuild(r: Realm, provinceId: string): Building | null {
  const p = prov(r, provinceId);
  if (p.enemyArmy || p.occupiedBy) return null;
  const b = p.buildings.find((x) => x.condition === "ruined" && x.place.startsWith("tile:"));
  if (!b) return null;
  b.condition = "sound";
  const tile = p.tiles[Number(b.place.slice(5)) - 1];
  if (tile) tile.burned = false;
  return b;
}

// ---------------------------------------------------------------- town size

/**
 * A town shrinks below its buildings: the extra town buildings are kept but
 * neglected until it grows back. The player chooses which; the AI drops the newest.
 */
export function shrinkTown(r: Realm, provinceId: string, size: TownSize, chosen?: Building[]): Building[] {
  const p = prov(r, provinceId);
  p.townSize = size;
  const town = p.buildings.filter((b) => b.place.startsWith("town:"));
  const extra = town.length - townSlots(size);
  if (extra <= 0) return [];
  const pick = chosen ?? [...town].sort((a, b) => b.order - a.order).slice(0, extra);
  if (pick.length !== extra) throw new Error(`choose ${extra} buildings`);
  for (const b of pick) {
    b.condition = "neglected";
    b.shrinkNeglect = true;
  }
  return pick;
}

/** The town grows: buildings neglected by the shrink work again once there are slots for them. */
export function growTown(r: Realm, provinceId: string, size: TownSize): void {
  const p = prov(r, provinceId);
  p.townSize = size;
  let room = townSlots(size) - p.buildings.filter((b) => b.place.startsWith("town:") && !b.shrinkNeglect).length;
  for (const b of p.buildings)
    if (b.shrinkNeglect && room > 0) {
      delete b.shrinkNeglect;
      b.condition = "sound";
      room--;
    }
}

// ---------------------------------------------------------------- damage and loss

function landBuildings(p: Province): Building[] {
  return p.buildings.filter((b) => b.place.startsWith("tile:") && b.condition !== "ruined");
}

function townBuildings(p: Province): Building[] {
  return p.buildings.filter((b) => b.place.startsWith("town:") && b.condition !== "ruined");
}

function hasTownWalls(p: Province, minStep = 1): boolean {
  return p.buildings.some((b) => b.type === "town walls" && b.step >= minStep && b.condition !== "ruined");
}

function pickSome<T>(list: T[], n: number, rng: Rng): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(pool.length), 1)[0]!);
  return out;
}

/** Foraging or looting armies burn land buildings tile by tile. */
export function forage(r: Realm, provinceId: string, tiles: number): Building[] {
  const p = prov(r, provinceId);
  const burned = landBuildings(p).slice(0, tiles);
  for (const b of burned) {
    const tile = p.tiles[Number(b.place.slice(5)) - 1];
    if (tile) tile.burned = true;
    ruin(r, b, "burned");
  }
  return burned;
}

/** A raid damages one building, or ruins it if big; town walls keep raids off town buildings. */
export function raid(r: Realm, provinceId: string, big: boolean, rng: Rng): Building | null {
  const p = prov(r, provinceId);
  const pool = hasTownWalls(p) ? landBuildings(p) : [...landBuildings(p), ...townBuildings(p)];
  const [hit] = pickSome(pool, 1, rng);
  if (!hit) return null;
  if (big) ruin(r, hit, "ruined in a raid");
  else damage(hit);
  return hit;
}

/** A plundered town: 1 in 3 town buildings ruined, 1 in 6 with town walls. */
export function plunder(r: Realm, provinceId: string, rng: Rng): Building[] {
  const p = prov(r, provinceId);
  const town = townBuildings(p);
  const share = hasTownWalls(p, 2) ? cfg.damage.plunder_share_with_walls : cfg.damage.plunder_share;
  const hit = pickSome(town, Math.floor(town.length * share + 1e-9), rng);
  for (const b of hit) ruin(r, b, "ruined by plunder");
  return hit;
}

/** Rebels holding a province loot one town building a season, the market first. */
export function rebelsLoot(r: Realm, provinceId: string): Building | null {
  const p = prov(r, provinceId);
  if (!p.rebels) return null;
  const town = townBuildings(p);
  const b = town.find((x) => buildingType(x.type).loot_first) ?? town[0];
  if (b) ruin(r, b, "looted by rebels");
  return b ?? null;
}

/** A town fire that broke out: one to three town buildings damaged. */
export function townFire(r: Realm, provinceId: string, rng: Rng): Building[] {
  const [lo, hi] = cfg.damage.fire_buildings;
  const hit = pickSome(townBuildings(prov(r, provinceId)), lo + rng.int(hi - lo + 1), rng);
  for (const b of hit) damage(b);
  return hit;
}

/** A flood damages land buildings on shore and marsh tiles; with a dyke broken in war a fields tile turns to marsh. */
export function flood(r: Realm, provinceId: string, dykeBroken = false): Building[] {
  const p = prov(r, provinceId);
  const hit = p.buildings.filter((b) => b.place.startsWith("shore:") || (b.place.startsWith("tile:") && p.tiles[Number(b.place.slice(5)) - 1]?.use === "marsh"));
  for (const b of hit) damage(b);
  const dykes = p.buildings.some((b) => b.type === "dykes" && b.condition !== "ruined");
  if (dykeBroken || !dykes) {
    if (dykeBroken) {
      const i = p.tiles.findIndex((t) => t.use === "fields");
      if (i >= 0) changeTileUse(r, provinceId, i + 1, "marsh");
    }
  }
  return hit;
}

/** Can a flood turn this province's fields to marsh (not with sound dykes)? With F8 and dykes marsh can be drained. */
export function dykeEffects(r: Realm, provinceId: string): { floodsTurnFieldsToMarsh: boolean; marshCanBeDrained: boolean } {
  const p = prov(r, provinceId);
  const dykes = p.buildings.some((b) => b.type === "dykes" && b.condition !== "ruined");
  return { floodsTurnFieldsToMarsh: !dykes, marshCanBeDrained: dykes && r.inventions.has(buildingType("dykes").drain_marsh_with ?? "") };
}

/** An earthquake: one building in three damaged, castles a step down. */
export function earthquake(r: Realm, provinceId: string, rng: Rng): { damaged: Building[]; castles: Building[] } {
  const p = prov(r, provinceId);
  const castles = p.buildings.filter((b) => b.type === "castle" && b.condition !== "ruined");
  const others = p.buildings.filter((b) => b.type !== "castle" && b.condition !== "ruined");
  const damaged = pickSome(others, Math.floor(others.length * cfg.damage.earthquake_share + 1e-9), rng);
  for (const b of damaged) damage(b);
  for (const c of castles) fallStep(r, provinceId, c);
  return { damaged, castles };
}

export type DemolishResult = { ok: true; materials: Partial<Record<Material, number>>; overflow: number; grievance?: string; persecution?: boolean } | { ok: false; reason: string };

/**
 * The owner demolishes a building: a quarter of its materials come back and
 * its workers overflow. A chartered town's buildings need the charter broken
 * first; pulling down the commons' buildings gives a Burned homes grievance.
 */
export function demolish(r: Realm, provinceId: string, b: Building, by: Owner = b.owner): DemolishResult {
  const p = prov(r, provinceId);
  if (b.owner === "town" && by === "crown" && p.charters.has("Town law")) return { ok: false, reason: "the Town law charter must be broken first" };
  const unchartered = b.owner === "town" && by === "crown";
  if (by !== b.owner && b.owner !== "commons" && !unchartered) return { ok: false, reason: "only the owner decides" };
  const c = b.builtWith ?? costOf(b.type, b.step).materials;
  const materials = Object.fromEntries(Object.entries(c).map(([m, n]) => [m, n * cfg.condition.demolish_material_refund]));
  p.buildings = p.buildings.filter((x) => x !== b);
  const overflow = b.filled;
  let grievance: string | undefined;
  if (b.owner === "commons" && by === "crown") p.grievances.push((grievance = "Burned homes"));
  const res: DemolishResult = { ok: true, materials, overflow };
  if (grievance) res.grievance = grievance;
  if (b.type === "minority house of worship") res.persecution = true;
  return res;
}

/** A peace treaty demands named castles demolished. */
export function peaceDemolishCastles(r: Realm, provinces: string[]): void {
  for (const id of provinces) {
    const p = prov(r, id);
    p.buildings = p.buildings.filter((b) => b.type !== "castle");
  }
}

/** A tile changes use: the building that no longer fits it ends. */
export function changeTileUse(r: Realm, provinceId: string, tile: number, use: TileUse | "town"): Building | null {
  const p = prov(r, provinceId);
  const t = p.tiles[tile - 1];
  if (!t) return null;
  if (use !== "town") t.use = use;
  const b = p.buildings.find((x) => x.place === `tile:${tile}`);
  if (b && (use === "town" || !buildingType(b.type).place.includes(use))) {
    p.buildings = p.buildings.filter((x) => x !== b);
    return b;
  }
  return null;
}

/** A mine whose seam runs out closes. */
export function seamRunsOut(r: Realm, provinceId: string, mine: Building): void {
  const p = prov(r, provinceId);
  p.buildings = p.buildings.filter((b) => b !== mine);
  r.report.push(`${p.id}: the ${mine.product ?? ""} mine closed.`.replace("  ", " "));
}

// ---------------------------------------------------------------- converting

/** A farm changes its crop free, taking effect after one season. Only grain feeds people. */
export function setCrop(b: Building, crop: string): void {
  const t = buildingType(b.type);
  if (!t.crops?.includes(crop)) throw new Error(`${t.id} cannot grow ${crop}`);
  b.pendingCrop = { crop, seasons: 1 };
}

export function feedsPeople(b: Building): boolean {
  const t = buildingType(b.type);
  if (!t.food_crop) return false;
  return (b.pendingCrop?.crop ?? b.crop ?? t.food_crop) === t.food_crop;
}

/** Would setting this farm to another crop leave the province short of food (the card warns)? */
export function cropWarning(p: Province, b: Building, peopleToFeed: number, fedPerFarm: number): boolean {
  const farms = p.buildings.filter((x) => x !== b && x.type === b.type && feedsPeople(x)).length;
  return farms * fedPerFarm < peopleToFeed;
}

/** A house of worship given to another faith; the religion context sets when and the grievance cost. */
export function convertFaith(b: Building, faith: string): { faith: string; grievanceCostBy: "religion" } {
  if (b.type !== "house of worship") throw new Error("only a house of worship changes faith");
  b.faith = faith;
  return { faith, grievanceCostBy: "religion" };
}

/** A craft building changes its trade, a factory its product, at half the cost of building the new one. */
export function conversionCost(newBuildCost: number): number {
  return newBuildCost * 0.5;
}

/** Converts a craft building to another trade at half the new building's gold. */
export function convertCraft(r: Realm, b: Building, to: string, owner: Owner = b.owner): { ok: boolean; gold: number } {
  const t = buildingType(b.type);
  if (!t.converts_to?.includes(to)) return { ok: false, gold: 0 };
  const gold = conversionCost(stepDef(to, 1).cost.gold ?? stepDef(b.type, 1).cost.gold ?? 0);
  if (!pay(r, owner, gold)) return { ok: false, gold };
  b.type = to;
  return { ok: true, gold };
}

/** Slighting a castle leaves a ruin that rebuilds at half cost. */
export function slight(r: Realm, castle: Building): void {
  if (castle.type !== "castle") throw new Error("only castles are slighted");
  ruin(r, castle, "slighted");
}

// ---------------------------------------------------------------- owners

/** Only the owner decides a building's upgrades, demolition and conversion. */
export function mayDecide(b: Building, who: Owner): boolean {
  return b.owner === who;
}

/** The crown pays for a building in a lord's province: the lord owns it and his loyalty rises a step. */
export function crownBuildsForLord(r: Realm, provinceId: string, type: string): StartResult {
  const p = prov(r, provinceId);
  if (!p.lord) return startSite(r, provinceId, type);
  const lord = r.lords.get(p.lord);
  const res = startSite(r, provinceId, type, { owner: `lord:${p.lord}`, payer: "crown" });
  if (res.ok && lord) {
    const i = cfg.loyalty_steps.indexOf(lord.loyalty);
    if (i >= 0 && i < cfg.loyalty_steps.length - 1) lord.loyalty = cfg.loyalty_steps[i + 1]!;
  }
  return res;
}

export type LordFate = "defects" | "line_dies_out" | "land_seized";

/** A lord's buildings go with him if he defects, and come to the crown if his line dies out or his land is seized. */
export function lordFate(r: Realm, lordId: string, fate: LordFate): void {
  if (fate === "defects") return;
  for (const p of r.provinces.values()) for (const b of p.buildings) if (b.owner === `lord:${lordId}`) b.owner = "crown";
}

/** Which building types an owner kind may build and own. */
export function mayOwn(ownerKind: string, type: string): boolean {
  const list = cfg.owners_may_build[ownerKind];
  return !list || list.includes(buildingType(type).id);
}

/** Share of a building's output its owner keeps (a company with a mining right keeps half). */
export function ownerOutputShare(b: Building): number {
  return b.owner.startsWith("company:") ? cfg.company_output_share : 1;
}

export type GainWay = "built_by_crown" | "built_by_lord" | "village_works" | "conquest" | "event" | "start";

/** A building gained one of the ways the design lists, with the owner that way gives it. */
export function gainBuilding(r: Realm, provinceId: string, type: string, way: GainWay, owner: Owner): Building {
  const place = freePlace(r, provinceId, type)!;
  const o = way === "village_works" ? cfg.village_works.owner : way === "built_by_crown" ? "crown" : owner;
  return placeBuilding(r, provinceId, type, place, { owner: o });
}

/** What a lord of a trait builds first; a Builder builds the most of anything. */
export function lordPriorities(trait: string): string[] {
  return cfg.lord_traits[trait] ?? [];
}

/** The clergy's order: a house of worship in every town of their faith first, then the rest. */
export function clergyNext(p: Province, faith: string): string[] {
  const hasHouse = p.buildings.some((b) => b.type === "house of worship" && b.faith === faith);
  const order = cfg.clergy_order.filter((t) => {
    if (t === "almshouse") return p.homeless > 0;
    if (t === "hospital") return !!p.plague;
    return true;
  });
  return hasHouse ? order.slice(1) : order;
}

export function townOrder(): string[] {
  return cfg.town_order;
}

export function companyOrder(): string[] {
  return cfg.company_order;
}

// ---------------------------------------------------------------- the people build

/** Year end: village works in a province at peace 5 years, with over 3 months of food and homeless or full slots. */
export function villageWorks(r: Realm, provinceId: string, roll: number): Building | null {
  const p = prov(r, provinceId);
  const n = cfg.village_works.needs;
  if (p.yearsAtPeace < n.years_at_peace || p.foodMonths <= n.food_store_months_over) return null;
  if (p.homeless <= 0) return null;
  if (roll >= cfg.village_works.chance_per_year) return null;
  for (const [use, type] of Object.entries(cfg.village_works.builds)) {
    const i = p.tiles.findIndex((t, i) => t.use === use && !t.burned && !p.buildings.some((b) => b.place === `tile:${i + 1}`));
    if (i >= 0) return placeBuilding(r, provinceId, type, `tile:${i + 1}`, { owner: cfg.village_works.owner });
  }
  return null;
}

/** A craft building appears in a town with a market, homeless people and its raw ware nearby, owned by the town or the commons. */
export function craftAppears(r: Realm, provinceId: string, rawNearby: string[], owner: "town" | "commons"): Building | null {
  const p = prov(r, provinceId);
  if (!p.buildings.some((b) => b.type === "market") || p.homeless <= 0) return null;
  const type = cfg.crafts_appearing.builds.find((t) => rawNearby.includes(cfg.crafts_appearing.raw[t] ?? ""));
  const place = type && freePlace(r, provinceId, type);
  if (!type || !place) return null;
  return placeBuilding(r, provinceId, type, place, { owner });
}

// ---------------------------------------------------------------- catalogue effects

export function stepFlags(type: string, step: number): string[] {
  return stepDef(type, step).flags ?? [];
}

/** Student seats of a school at a step and kind (madrasa or university at step 2). */
export function schoolSeats(step: number, kind?: string): number {
  const s = stepDef("school", step).seats;
  if (typeof s === "number") return s;
  return s?.[kind ?? ""] ?? 0;
}

/** Officials and lords that the realm's rule buildings add to its caps. */
export function ruleCaps(r: Realm): { officials: number; lords: number } {
  let officials = 0;
  let lords = 0;
  for (const p of r.provinces.values())
    for (const b of p.buildings) {
      if (b.condition === "ruined") continue;
      const s = stepDef(b.type, Math.min(b.step, topStep(b.type)));
      officials += s.officials ?? 0;
      lords += s.lords ?? 0;
    }
  return { officials, lords };
}

/** Tax registers (G3) and the census (G10) take effect only once a chancery stands. */
export function takesEffect(r: Realm, invention: string): boolean {
  if (!buildingType("chancery").enables?.includes(invention)) return r.inventions.has(invention);
  return r.inventions.has(invention) && [...r.provinces.values()].some((p) => p.buildings.some((b) => b.type === "chancery" && b.condition !== "ruined"));
}

/** Arms and powder stores without an arsenal lose a tenth a year. */
export function storesAfterYear(r: Realm, stores: number): number {
  const arsenal = [...r.provinces.values()].some((p) => p.buildings.some((b) => b.type === "arsenal" && b.condition !== "ruined"));
  return arsenal ? stores : stores * (1 - cfg.arsenal.spoil_share_without);
}

/** A mint coins silver and gold at full value instead of selling them. */
export function mintCoins(r: Realm, ware: string): boolean {
  return buildingType("mint").coins!.includes(ware) && [...r.provinces.values()].some((p) => p.buildings.some((b) => b.type === "mint" && b.condition !== "ruined"));
}

/** A step-2 factory needs a power station in the province; every factory makes Smoke. */
export function factoryStatus(r: Realm, provinceId: string, b: Building): { smoke: boolean; powered: boolean } {
  const missing = needsMet(r, prov(r, provinceId), stepDef("factory", b.step).needs);
  return { smoke: !!buildingType(b.type).makes_smoke, powered: missing === null };
}

/** A weaving manufactory works only with an official in the province. */
export function works(r: Realm, provinceId: string, b: Building): boolean {
  if (b.condition === "ruined") return false;
  return needsMet(r, prov(r, provinceId), stepDef(b.type, b.step).needs) === null;
}

/** Does a grove bear in a year (3 years after it was built)? */
export function groveBears(b: Building, year: number): boolean {
  return b.builtYear !== undefined && year >= b.builtYear + (buildingType(b.type).years_to_bear ?? 0);
}

/** A building's name and sprite by region and faith; its effect is the same everywhere. */
export function variantName(type: string, region: string): string {
  return cfg.variants[buildingType(type).id]?.[region] ?? buildingType(type).id;
}

// ---------------------------------------------------------------- landmarks

export function landmark(id: string): Landmark {
  const l = cfg.landmarks.find((x) => x.id === id);
  if (!l) throw new Error(`No landmark ${id}`);
  return l;
}

/** Landmarks on the map in a year: those standing in 1444, and those whose founding event has fired. */
export function landmarkOnMap(id: string, year: number, foundedEvents: ReadonlySet<string> = new Set()): boolean {
  const l = landmark(id);
  return l.present_1444 || foundedEvents.has(id);
}

/** A landmark is never on the build sheet. */
export function landmarkOnBuildSheet(): false {
  return false;
}

/** Places a landmark on the map as its building at its step. */
export function placeLandmark(r: Realm, id: string): Building {
  const l = landmark(id);
  const place = freePlace(r, l.province, l.building) ?? `landmark:${l.id}`;
  return placeBuilding(r, l.province, l.building, place, { step: l.step, landmark: l.id, condition: l.condition ?? "sound" });
}

/** Paying a neglected landmark's upkeep for a season brings it back to sound. */
export function landmarkIsReal(id: string): boolean {
  return cfg.landmarks.some((l) => l.id === id);
}

// ---------------------------------------------------------------- events

/** add_building: on a fitting empty place, or else the province's least-filled building goes up a step. */
export function addBuildingEffect(r: Realm, provinceId: string, type: string, step: number, owner: Owner): Building {
  const p = prov(r, provinceId);
  const place = freePlace(r, provinceId, type);
  if (place && limitReached(r, p, type) === null) return placeBuilding(r, provinceId, type, place, { step, owner });
  const candidates = p.buildings.filter((b) => b.step < topStep(b.type) && b.condition !== "ruined");
  const least = candidates.sort((a, b) => a.filled / (stepDef(a.type, a.step).jobs ?? 1) - b.filled / (stepDef(b.type, b.step).jobs ?? 1))[0];
  if (!least) throw new Error("nothing to raise");
  least.step += 1;
  return least;
}

export function removeBuildingEffect(r: Realm, provinceId: string, type: string): Building | null {
  const b = prov(r, provinceId).buildings.find((x) => x.type === buildingType(type).id && x.condition !== "ruined");
  if (b) ruin(r, b, "ruined by an event");
  return b ?? null;
}

export function damageBuildingsEffect(r: Realm, provinceId: string, share: number, rng: Rng): Building[] {
  const live = prov(r, provinceId).buildings.filter((b) => b.condition !== "ruined");
  const hit = pickSome(live, Math.round(live.length * share), rng);
  for (const b of hit) damage(b);
  return hit;
}

export function buildingStepEffect(r: Realm, provinceId: string, type: string, change: number): Building | null {
  const b = prov(r, provinceId).buildings.find((x) => x.type === buildingType(type).id);
  if (!b) return null;
  if (change < 0) for (let i = 0; i < -change; i++) fallStep(r, provinceId, b);
  else b.step = Math.min(topStep(b.type), b.step + change);
  return b;
}

/** Condition has_building: {type, step}. */
export function hasBuilding(r: Realm, provinceId: string, type: string, step = 1): boolean {
  return prov(r, provinceId).buildings.some((b) => b.type === buildingType(type).id && b.step >= step && b.condition !== "ruined");
}

/** The old province stats as buildings: prosperity +n fitting buildings, fort_level a castle step, infrastructure a road step, industry a factory. */
export function oldStatEffect(r: Realm, provinceId: string, stat: "prosperity" | "fort_level" | "infrastructure" | "industry", amount: number): Building[] {
  const out: Building[] = [];
  const p = prov(r, provinceId);
  for (let i = 0; i < amount; i++) {
    if (stat === "prosperity") {
      const type = ["farm", "ranch", "lumber camp", "loom house", "forge"].find((t) => freePlace(r, provinceId, t) && limitReached(r, p, t) === null);
      if (type) out.push(addBuildingEffect(r, provinceId, type, 1, "crown"));
    } else if (stat === "industry") out.push(addBuildingEffect(r, provinceId, "factory", 1, "crown"));
    else {
      const type = stat === "fort_level" ? "castle" : "road";
      const b = p.buildings.find((x) => x.type === type);
      out.push(b ? (buildingStepEffect(r, provinceId, type, 1), b) : addBuildingEffect(r, provinceId, type, 1, "crown"));
    }
  }
  return out;
}

// ---------------------------------------------------------------- the AI

export interface AiSituation {
  ruinedOrDamaged?: Building;
  canPay?: boolean;
  foodMonths?: number;
  hungry?: boolean;
  homelessShare?: number;
  unusedRaw?: string;
  expectsWar?: boolean;
  faithLow?: boolean;
  personality?: string;
}

const rawToCraft: Record<string, string> = { wool: "loom house", hides: "tannery", iron: "forge", grain: "brewery" };

/** The AI's pick for the province it checks this month: the first rule that fits. */
export function aiPick(s: AiSituation): string | null {
  if (s.ruinedOrDamaged && s.canPay) return `repair:${s.ruinedOrDamaged.type}`;
  if (s.hungry || (s.foodMonths !== undefined && s.foodMonths < cfg.ai.food_months_trigger)) return "food";
  if ((s.homelessShare ?? 0) > cfg.ai.homeless_share_trigger) return "most_homeless_jobs";
  if (s.unusedRaw && rawToCraft[s.unusedRaw]) return rawToCraft[s.unusedRaw]!;
  if (s.expectsWar) return "castle_or_walls";
  if (s.faithLow) return "house of worship";
  if (s.personality) return (cfg.ai_personality[s.personality] ?? []).join("|") || null;
  return null;
}

/** The province an AI country checks this month (in turn). */
export function aiProvinceThisMonth(provinces: readonly string[], monthIndex: number): string {
  return provinces[monthIndex % provinces.length]!;
}

/** The AI starts a site only if it keeps a year's upkeep in reserve and the site can be crewed. */
export function aiMayStart(gold: number, siteGold: number, yearlyUpkeepTotal: number, canCrew: boolean): boolean {
  return canCrew && gold - siteGold >= yearlyUpkeepTotal * cfg.ai.reserve_years_of_upkeep;
}

// ---------------------------------------------------------------- start of the game

/** Starting buildings from map wealth: wealth 1 a farm or ranch on a third of the tiles; wealth 10 every tile and town buildings at step 2. */
export function placeByWealth(r: Realm, provinceId: string, wealth: number): Building[] {
  const rule = cfg.map_wealth[String(wealth)];
  if (!rule) throw new Error(`no rule for map wealth ${wealth}`);
  const p = prov(r, provinceId);
  const out: Building[] = [];
  const target = Math.round(p.tiles.length * rule.built_tile_share);
  p.tiles.forEach((tile, i) => {
    if (out.length >= target) return;
    const type = (rule.buildings ?? cfg.buildings.map((b) => b.id)).find((t) => placeKind(t) === "land" && buildingType(t).place.includes(tile.use) && missingFor(r, provinceId, t, 1) === null);
    if (type) out.push(placeBuilding(r, provinceId, type, `tile:${i + 1}`));
  });
  if (rule.town_step) for (const b of p.buildings) if (b.place.startsWith("town:")) b.step = Math.min(rule.town_step, topStep(b.type));
  return out;
}

/** Fills town slots by a regional template. */
export function fillByTemplate(r: Realm, provinceId: string, template: string, faith?: string): Building[] {
  const list = cfg.templates[template];
  if (!list) throw new Error(`no template ${template}`);
  return list.map((t) => placeBuilding(r, provinceId, t.type, freePlace(r, provinceId, t.type)!, { faith: faith ?? t.faith ?? "", name: t.name }));
}

/** Geography anchors standing by a year (Potosí from 1545 by its event). */
export function anchorsBy(year: number): { id: string; byEvent: boolean }[] {
  return cfg.anchors.filter((a) => a.from_year <= year).map((a) => ({ id: a.id, byEvent: !!a.by_event }));
}

// ---------------------------------------------------------------- Works screen

export interface Advice {
  province: string;
  type: string;
  gold: number;
}

/** At most five advice lines a year, from empty tiles and homeless people. */
export function workOutAdvice(r: Realm): Advice[] {
  const out: Advice[] = [];
  for (const p of r.provinces.values()) {
    if (out.length >= cfg.advice.max_lines) break;
    if (p.homeless <= 0) continue;
    const type = ["farm", "ranch", "lumber camp", "loom house"].find((t) => canBuild(r, p.id, t).ok);
    if (type) out.push({ province: p.id, type, gold: costOf(type, 1, p.ground).gold });
  }
  r.advice = out;
  return out;
}

/** Build all advised: queue every suggestion that fits the gold set aside. */
export function buildAllAdvised(advice: readonly Advice[], goldSetAside: number): Advice[] {
  const queued: Advice[] = [];
  let left = goldSetAside;
  for (const a of advice)
    if (a.gold <= left) {
      queued.push(a);
      left -= a.gold;
    }
  return queued;
}

/** A batch order: start one thing everywhere it fits. */
export function batchOrder(r: Realm, type: string): Site[] {
  const out: Site[] = [];
  for (const p of r.provinces.values()) {
    const res = startSite(r, p.id, type);
    if (res.ok) out.push(res.site);
  }
  return out;
}

/** The Works screen header. */
export function worksHeader(r: Realm): string {
  return `Upkeep ${fmt(realmUpkeep(r))} gold a year · ${r.sites.length} sites running`;
}

/** The Works lens colour of a province. */
export function worksLens(r: Realm, provinceId: string): "green" | "amber" | "red" | null {
  const p = prov(r, provinceId);
  if (p.buildings.some((b) => b.condition === "ruined")) return "red";
  if (p.buildings.some((b) => b.condition === "neglected" || b.condition === "damaged")) return "amber";
  if (r.sites.some((s) => s.province === provinceId)) return "green";
  return null;
}

function fmt(x: number): string {
  return String(Math.round(x * 100) / 100);
}

// ---------------------------------------------------------------- more catalogue effects and screens

/** Converts a craft building to another trade, or a factory to another product, at half the new building's cost. */
export function convertTo(r: Realm, b: Building, to: string, newBuildCost: number, owner: Owner = b.owner): { ok: boolean; gold: number } {
  const t = buildingType(b.type);
  const gold = conversionCost(newBuildCost);
  const craft = t.converts_to?.includes(to);
  const product = t.products?.includes(to);
  if (!craft && !product) return { ok: false, gold };
  if (!pay(r, owner, gold)) return { ok: false, gold };
  if (craft) b.type = to;
  else b.product = to;
  return { ok: true, gold };
}

/** Each faith in a province is moved by its own houses of worship; a minority house calms its faith instead. */
export function faithPulls(p: Province): Record<string, "pulls" | "calms"> {
  const out: Record<string, "pulls" | "calms"> = {};
  for (const b of p.buildings) {
    const t = buildingType(b.type);
    if (t.faith_effect && b.faith && b.condition !== "ruined") out[b.faith] = t.faith_effect;
  }
  return out;
}

/** May a minority house of worship of a faith be built (a tenth of the province, or a Faith tolerance charter)? */
export function mayBuildMinorityHouse(p: Province, faith: string): boolean {
  const needs = stepDef("minority house of worship", 1).needs;
  const share = p.faithShares[faith] ?? 0;
  const anyOf = (needs?.any_of ?? []) as Record<string, unknown>[];
  return anyOf.some((o) => ("faith_share_at_least" in o ? share >= (o.faith_share_at_least as number) - 1e-9 : "charter" in o ? p.charters.has(o.charter as string) : false));
}

/** Health effects of a province's buildings. */
export function healthEffects(p: Province): { townDeathRateSlower: number; plagueSpreadsSlower: boolean; townPlagueDeathsFactor: number; townSizeBonus: number; homelessSheltered: number } {
  const live = p.buildings.filter((b) => b.condition !== "ruined").map((b) => buildingType(b.type));
  return {
    townDeathRateSlower: live.reduce((s, t) => s + (t.town_death_rate_slower ?? 0), 0),
    plagueSpreadsSlower: live.some((t) => t.effects?.includes("plague_spreads_slower")),
    townPlagueDeathsFactor: live.reduce((s, t) => s * (t.town_plague_deaths_factor ?? 1), 1),
    townSizeBonus: live.reduce((s, t) => s + (t.town_size_bonus ?? 0), 0),
    homelessSheltered: live.reduce((s, t) => s + (t.shelters_homeless ?? 0), 0),
  };
}

/** The named effects a province's buildings give (each building one at most). */
export function localEffects(p: Province): string[] {
  return p.buildings.filter((b) => b.condition !== "ruined").flatMap((b) => buildingType(b.type).effects ?? []);
}

/** Slipways of a shipyard (a landmark shipyard, the Venetian Arsenal, has its own count). */
export function slipways(b: Building): number {
  if (b.landmark) {
    const l = landmark(b.landmark);
    if (l.slipways !== undefined) return l.slipways;
  }
  return stepDef(b.type, Math.min(b.step, topStep(b.type))).slipways ?? 0;
}

export function berths(b: Building): number {
  return stepDef(b.type, b.step).berths ?? 0;
}

export function trainingRoom(b: Building): number {
  return stepDef(b.type, b.step).training_room ?? 0;
}

/** Standing regiments housed in barracks give no Soldiers quartered. */
export function quarteringGrievance(b: Building): boolean {
  return !stepDef(b.type, b.step).no_soldiers_quartered;
}

export interface CardField {
  value: string;
  gain: string[];
  lose: string[];
}

export interface BuildingCard {
  fields: Record<"type" | "place" | "step" | "owner" | "jobs" | "makes" | "needs" | "condition" | "upkeep", CardField>;
  next: { name: string; jobs: string; gold: number; materials: Partial<Record<Material, number>>; months: number } | null;
  actions: string[];
}

/** The building card: every field with its gain and lose list, the next step's gain and cost, and the actions. */
export function buildingCard(r: Realm, provinceId: string, b: Building): BuildingCard {
  const t = buildingType(b.type);
  const s = stepDef(b.type, b.step);
  const field = (value: string, gain: string[] = [], lose: string[] = []): CardField => ({ value, gain, lose });
  const nextDef = t.steps[b.step];
  const nextCost = nextDef ? costOf(b.type, b.step + 1, prov(r, provinceId).ground) : null;
  return {
    fields: {
      type: field(s.name),
      place: field(b.place),
      step: field(`${b.step} of ${topStep(b.type)}`, ["Upgrade"], ["neglect for 10 years", "a sack", "an earthquake"]),
      owner: field(b.owner),
      jobs: field(`${s.jobs ?? 0} ${t.class ?? ""}, ${b.filled} filled`, ["people of its class"], ["empty slots", "crew taken for a site"]),
      makes: field(Object.entries(yearlyMakes(b)).map(([w, n]) => `${fmt(n)} ${w}`).join(", "), ["filled slots"], ["empty slots", "missing input", "neglect", "damage"]),
      needs: field(Object.keys(s.eats ?? {}).join(", "), ["made here", "bought"], ["not in reach"]),
      condition: field(b.condition, ["repair", "paid upkeep"], ["unpaid upkeep", "fire", "flood", "raids"]),
      upkeep: field(`${fmt(yearlyUpkeep(b))} gold a year`, [], ["a twelfth a month"]),
    },
    next: nextDef && nextCost ? { name: nextDef.name, jobs: `+${(nextDef.jobs ?? 0) - (s.jobs ?? 0)} jobs`, gold: nextCost.gold, materials: nextCost.materials, months: nextCost.months } : null,
    actions: ["Upgrade", "Demolish", "Close"],
  };
}

/** What a building gives: job slots, wares and at most one named local effect; never a flat percentage to a country. */
export function buildingGives(b: Building): { jobSlots: number; wares: string[]; localEffect: string | null; countryPercent: null } {
  const t = buildingType(b.type);
  const s = stepDef(b.type, b.step);
  const local = t.effects?.[0] ?? s.flags?.[0] ?? s.effect ?? null;
  return { jobSlots: s.jobs ?? 0, wares: Object.keys(s.makes ?? stepDef(b.type, 1).makes ?? {}), localEffect: local, countryPercent: null };
}

/** The five small numbers stored per building. */
export function storedFields(b: Building): { type: string; step: number; owner: Owner; condition: Condition; filled: number } {
  return { type: b.type, step: b.step, owner: b.owner, condition: b.condition, filled: b.filled };
}

/** The Jobs lens: empty job slots against homeless people. */
export function jobsLens(p: Province): { emptySlots: number; homeless: number } {
  const empty = p.buildings.reduce((s, b) => s + Math.max(0, (stepDef(b.type, Math.min(b.step, topStep(b.type))).jobs ?? 0) - b.filled), 0);
  return { emptySlots: empty, homeless: p.homeless };
}

export interface WorksScreen {
  header: string;
  sites: { province: string; type: string; monthsDone: number; monthsTotal: number; crew: number }[];
  needs: { province: string; building: string; condition: Condition; action: "Pay" | "Rebuild" }[];
  advice: Advice[];
}

/** The realm's Works screen: sites with progress and crew, needs with Pay and Rebuild, and advice. */
export function worksScreen(r: Realm): WorksScreen {
  const needs: WorksScreen["needs"] = [];
  for (const p of r.provinces.values())
    for (const b of p.buildings) {
      if (b.condition === "neglected") needs.push({ province: p.id, building: b.type, condition: b.condition, action: "Pay" });
      if (b.condition === "ruined") needs.push({ province: p.id, building: b.type, condition: b.condition, action: "Rebuild" });
    }
  return {
    header: worksHeader(r),
    sites: r.sites.map((s) => ({ province: s.province, type: s.type, monthsDone: s.monthsDone, monthsTotal: s.monthsTotal, crew: s.crew })),
    needs,
    advice: r.advice,
  };
}

/** An AI month: it checks one province in turn and starts at most one building there. */
export function aiMonth(r: Realm, monthIndex: number, pickType: (p: Province) => string | null): { province: string; started: Site | null } {
  const ids = [...r.provinces.keys()];
  const id = aiProvinceThisMonth(ids, monthIndex);
  const type = pickType(prov(r, id));
  if (!type) return { province: id, started: null };
  const cost = costOf(type, 1, prov(r, id).ground);
  if (!aiMayStart(r.treasury, cost.gold, realmUpkeep(r), true)) return { province: id, started: null };
  const res = startSite(r, id, type);
  return { province: id, started: res.ok ? res.site : null };
}
