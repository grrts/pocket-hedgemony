import { knows, landBuilding, provinceConfig, slotsByClass, tileSlots, workplaces, type Ground, type Province, type ProvinceConfig, type Tile, type Use } from "./model.ts";

/** Land: tiles, tile states, ground effects and what the tiles produce (province stats §2–§5). */

// ---------------------------------------------------------------- tile count and layout

/** Tile count of the smallest and largest province on the map (PROV-010). The mapping in between is OQ-PROV-11. */
export function tileCountForSize(size: "smallest" | "largest", cfg: ProvinceConfig = provinceConfig): number {
  return size === "smallest" ? cfg.tiles.min : cfg.tiles.max;
}

/** Shore tiles: 1 to 3 on a coast, lake or navigable river, none otherwise (PROV-018). */
export function shoreTileCount(onWater: boolean, wanted: number = provinceConfig.shore_tiles.min, cfg: ProvinceConfig = provinceConfig): number {
  if (!onWater) return 0;
  return Math.max(cfg.shore_tiles.min, Math.min(cfg.shore_tiles.max, wanted));
}

/** Shares n tiles out by weight, largest remainder first; with no weights, all fields. `fieldsAt` is the index of fields. */
export function shareOut(weights: ArrayLike<number>, n: number, fieldsAt = 0): number[] {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i]!;
  if (total <= 0) return Array.from(weights, (_, i) => (i === fieldsAt ? n : 0));
  const exact = Array.from(weights, (w) => (w / total) * n);
  const out = exact.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i]!++;
    left--;
  }
  return out;
}

/** How a square of the ground is shared between the tile uses at the start, by lower-case use (PROV-024, D-PROV-25). */
export function groundStartMix(g: Ground, cfg: ProvinceConfig = provinceConfig): Record<string, number> {
  return (cfg.ground.start_mix as unknown as Record<string, Record<string, number>>)[g] ?? { fields: 1 };
}

/** The starting uses of a province's land tiles (not its Town and Shore), from its ground: grassland and savanna mostly pasture (PROV-024). */
export function startingTileMix(g: Ground, landTiles: number, cfg: ProvinceConfig = provinceConfig): Use[] {
  const mix = Object.entries(groundStartMix(g, cfg));
  const counts = shareOut(mix.map(([, w]) => w), landTiles);
  return mix.flatMap(([use], i) => Array.from({ length: counts[i]! }, () => (use[0]!.toUpperCase() + use.slice(1)) as Use));
}

// ---------------------------------------------------------------- tile uses

export type TileChange =
  | "clear woods"
  | "to pasture"
  | "plough"
  | "drain"
  | "irrigate"
  | "flood"
  | "dyke broken"
  | "salt"
  | "overgraze"
  | "drought"
  | "replant";

const CHANGES: Record<TileChange, { from: Use[]; to: Use; needs?: string }> = {
  "clear woods": { from: ["Woods"], to: "Fields" },
  "to pasture": { from: ["Fields"], to: "Pasture" },
  plough: { from: ["Pasture"], to: "Fields" },
  drain: { from: ["Marsh"], to: "Fields", needs: "Polder drainage" },
  irrigate: { from: ["Waste"], to: "Fields", needs: "F3" },
  flood: { from: ["Fields", "Pasture", "Woods"], to: "Marsh" },
  "dyke broken": { from: ["Fields", "Pasture", "Woods"], to: "Marsh" },
  salt: { from: ["Fields", "Pasture"], to: "Waste" },
  overgraze: { from: ["Fields", "Pasture"], to: "Waste" },
  drought: { from: ["Pasture"], to: "Waste" },
  replant: { from: ["Fields"], to: "Woods", needs: "replanting" },
};

/**
 * Starts or applies a change of tile use (PROV-012 to PROV-017, PROV-023, PROV-024).
 * Clearing woods takes years and turning fields to pasture a season; the rest is at once.
 * Returns false when the tile's use or the known inventions do not allow it.
 */
export function changeTileUse(p: Province, i: number, change: TileChange, cfg: ProvinceConfig = provinceConfig): boolean {
  const t = p.tiles[i];
  const rule = CHANGES[change];
  if (!t || !rule.from.includes(t.use)) return false;
  if (rule.needs && !knows(p, rule.needs)) return false;
  if (change === "clear woods") t.change = { to: "Fields", monthsLeft: cfg.clear_woods.years * 12 };
  else if (change === "to pasture") t.change = { to: "Pasture", monthsLeft: cfg.fields_to_pasture.seasons * cfg.months_per_season };
  else setUse(t, rule.to);
  return true;
}

function setUse(t: Tile, use: Use): void {
  // A building that does not fit the new use is lost with it (PROV-063).
  if (t.building && !(landBuilding(t.building)?.uses ?? []).includes(use)) t.building = null;
  t.use = use;
  t.change = null;
  t.idleYears = 0;
}

/**
 * Woods lost to fire or to cutting more timber than they regrow become waste, stumps and ash,
 * and grow back to woods after ten years (PROV-023, D-PROV-30). A lumber camp goes with them.
 */
export function loseWoods(p: Province, i: number, cfg: ProvinceConfig = provinceConfig): boolean {
  const t = p.tiles[i];
  if (!t || t.use !== "Woods") return false;
  setUse(t, "Waste");
  t.change = { to: "Woods", monthsLeft: cfg.woods.regrow_years * 12 };
  return true;
}

/** A year of timber: the woods regrow a load per tile; cutting more than that loses the last woods tile (PROV-023, D-PROV-30). */
export function timberYear(p: Province, loadsCut: number, cfg: ProvinceConfig = provinceConfig): number | null {
  const woods = p.tiles.flatMap((t, i) => (t.use === "Woods" && !t.change ? [i] : []));
  if (loadsCut <= woods.length * cfg.woods.regrow_loads_per_tile || !woods.length) return null;
  const last = woods[woods.length - 1]!;
  loseWoods(p, last, cfg);
  return last;
}

/** Advances use changes under way by some months; finished clearing gives one load of timber. */
export function advanceTileChanges(p: Province, months: number, cfg: ProvinceConfig = provinceConfig): void {
  for (const t of p.tiles) {
    if (!t.change) continue;
    t.change.monthsLeft -= months;
    if (t.change.monthsLeft > 0) continue;
    const wasWoods = t.use === "Woods";
    setUse(t, t.change.to);
    if (wasWoods) p.timber += cfg.clear_woods.timber_loads;
  }
}

/** Workers on each tile, by index. */
export function tileWorkers(p: Province): number[] {
  const out = p.tiles.map(() => 0);
  for (const w of workplaces(p)) if (w.kind === "tile") out[w.index] = w.workers;
  return out;
}

/**
 * Years of overwork before fields wear: 30, stretched by half for each of *Three-field rotation*,
 * *Fodder crops* and *Four-field rotation* the owner knows (PROV-034, PROV-035, D-PROV-31).
 */
export function wearYears(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  const w = cfg.worn;
  return w.overwork_years * w.rotation_stretch ** w.rotation_inventions.filter((id) => knows(p, id)).length;
}

/** Farmers beyond the slots of the province's fields: the land is farmed with more people than it needs. */
export function surplusFarmers(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  return Math.max(0, p.people.farmers - slotsByClass(p, cfg).farmers);
}

/**
 * Year-end land changes: unworked fields grow back to woods after 10 years (PROV-013),
 * worked fields wear after years farmed with more farmers than their slots (PROV-034),
 * worn tiles recover after 5 years without use (PROV-035), and in peace one burned
 * tile is rebuilt (PROV-032; twice as fast under a master of works).
 */
export function yearEndLand(p: Province, cfg: ProvinceConfig = provinceConfig, rebuildMultiplier = 1): void {
  const workers = tileWorkers(p);
  const overworked = surplusFarmers(p, cfg) > 0;
  const wearAt = wearYears(p, cfg);
  p.tiles.forEach((t, i) => {
    if (t.use === "Town" || t.use === "Castle" || t.change) return;
    t.idleYears = (workers[i] ?? 0) > 0 ? 0 : t.idleYears + 1;
    if (t.state === "Worn" && t.idleYears >= cfg.worn.recovery_years) t.state = null;
    if (t.use === "Fields" && t.state === null && (workers[i] ?? 0) > 0) {
      t.overworkedYears = overworked ? t.overworkedYears + 1 : 0;
      if (t.overworkedYears >= wearAt) {
        t.state = "Worn";
        t.overworkedYears = 0;
      }
    }
    if (t.use === "Fields" && t.state !== "Burned" && t.idleYears >= cfg.fields_to_woods.years) setUse(t, "Woods");
  });
  const peopleHere = Object.values(p.people).some((n) => n > 0);
  if (peopleHere && !p.war) {
    let rebuild = cfg.burned.rebuild_per_year * rebuildMultiplier;
    for (const t of p.tiles) {
      if (rebuild <= 0) break;
      if (t.state === "Burned") {
        t.state = null;
        rebuild--;
      }
    }
  }
}

// ---------------------------------------------------------------- tile states

/**
 * Burns a tile (PROV-031): its building is wrecked, it gives nothing, and its workers
 * lose their place. Returns how many were displaced; whether they become refugees or
 * die is the caller's (warfare's) to say, or with `stay` they stay on as homeless (PROV-125).
 * A tile carries one state, so Burned replaces any other.
 */
export function burnTile(p: Province, i: number, opts: { stay?: boolean } = {}): number {
  const t = p.tiles[i];
  if (!t) return 0;
  const before = tileWorkers(p)[i] ?? 0;
  const cls = tileSlots(t)?.class;
  t.state = "Burned";
  if (cls) p.people[cls] -= before;
  if (opts.stay) p.people.homeless += before;
  return before;
}

/** Marks tiles Fallow below half their workers, and clears it when enough return (PROV-033). */
export function updateFallow(p: Province, cfg: ProvinceConfig = provinceConfig): void {
  for (const w of workplaces(p, cfg)) {
    if (w.kind !== "tile" || !w.building) continue;
    const t = p.tiles[w.index]!;
    const share = w.workers / w.slots;
    if (share < cfg.buildings.fallow_below && t.state === null) t.state = "Fallow";
    else if (share >= cfg.buildings.fallow_below && t.state === "Fallow") t.state = null;
  }
}

/** Share a workplace works at, and whether it is fallow (PROV-061). */
export function workingShare(workers: number, slots: number, cfg: ProvinceConfig = provinceConfig): { share: number; fallow: boolean } {
  const share = slots > 0 ? Math.min(1, workers / slots) : 0;
  return { share, fallow: share < cfg.buildings.fallow_below };
}

export function burnedTiles(p: Province): number {
  return p.tiles.filter((t) => t.state === "Burned").length;
}

// ---------------------------------------------------------------- town and castle tiles

/** Town tiles the town needs: one, a second at 40,000 townsfolk, a third for a great city (PROV-019). */
export function townTilesNeeded(townsfolk: number, greatCity: boolean, cfg: ProvinceConfig = provinceConfig): number {
  if (greatCity) return cfg.town.great_city_tiles;
  return townsfolk >= cfg.town.second_tile_townsfolk ? 2 : 1;
}

/** Grows the town over fields or gives tiles back as fields (PROV-019, PROV-020). */
export function updateTownTiles(p: Province, townsfolk: number, cfg: ProvinceConfig = provinceConfig): void {
  const need = townTilesNeeded(townsfolk, p.townSize === "great city", cfg);
  let have = p.tiles.filter((t) => t.use === "Town").length;
  while (have < need) {
    const fields = p.tiles.findIndex((t) => t.use === "Fields" && !t.building) ?? -1;
    const any = fields >= 0 ? fields : p.tiles.findIndex((t) => t.use === "Fields");
    if (any < 0) break;
    const t = p.tiles[any]!;
    t.use = "Town";
    t.building = null;
    t.state = null;
    have++;
  }
  for (let i = p.tiles.length - 1; i >= 0 && have > need; i--) {
    const t = p.tiles[i]!;
    if (t.use !== "Town") continue;
    if (p.tiles.findIndex((x) => x.use === "Town") === i) break;
    setUse(t, "Fields");
    have--;
  }
}

/** Builds a castle on a land tile other than the Town; that tile stops producing (PROV-021). */
export function buildCastleTile(p: Province, i: number): boolean {
  const t = p.tiles[i];
  if (!t || t.use === "Town" || t.use === "Castle") return false;
  t.use = "Castle";
  t.building = "castle";
  t.state = null;
  return true;
}

/** A destroyed castle leaves its tile waste for 5 years, then fields (PROV-022). */
export function destroyCastleTile(p: Province, cfg: ProvinceConfig = provinceConfig): void {
  const t = p.tiles.find((x) => x.use === "Castle");
  if (!t) return;
  t.use = "Waste";
  t.building = null;
  t.change = { to: "Fields", monthsLeft: cfg.castle_ruin.waste_years * 12 };
  p.castle = "none";
}

// ---------------------------------------------------------------- ground and troops

export interface GroundTroops {
  foot: number;
  horse: number;
  camels?: number;
  guns: number;
  defender: number;
  days_to_cross: number;
  foraging: string;
  sickness: string;
}

export function groundTroops(g: Ground, cfg: ProvinceConfig = provinceConfig): GroundTroops {
  return (cfg.ground.troops as Record<Ground, GroundTroops>)[g];
}

/** Strength change for an arm in this ground; camels take the desert's camel value (PROV-041, PROV-042). */
export function armStrength(g: Ground, arm: "foot" | "horse" | "guns" | "defender" | "camels", cfg: ProvinceConfig = provinceConfig): number {
  const t = groundTroops(g, cfg);
  if (arm === "camels") return t.camels ?? t.horse;
  return t[arm];
}

/** An attacker over a river shore tile fights at −20 %, unless there is a bridge (PROV-043). */
export function riverCrossing(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  const river = p.tiles.some((t) => t.use === "Shore" && t.river);
  const bridge = p.tiles.some((t) => t.building === "bridge" && t.state !== "Burned");
  return river && !bridge ? cfg.river_crossing_penalty : 0;
}

/** +5 % to the defender for every two woods tiles, up to +15 % (PROV-044). */
export function woodsAmbush(woodsTiles: number, cfg: ProvinceConfig = provinceConfig): number {
  return Math.min(cfg.woods_ambush.cap, Math.floor(woodsTiles / 2) * cfg.woods_ambush.per_two_woods);
}

/** Tiles an army can forage from before it starts burning them: burned tiles give nothing (PROV-045, PROV-049). */
export function forageableTiles(p: Province): number {
  return p.tiles.filter((t) => t.state !== "Burned").length;
}

/** With a castle tile the defender fights from the walls under the warfare castle rules (PROV-046). */
export function defenderOnWalls(p: Province): boolean {
  return p.tiles.some((t) => t.use === "Castle" && t.building === "castle");
}

/** A further +10 % to a defending army of the homeland tongue in rough ground (PROV-047). */
export function localsBonus(g: Ground, homelandTongue: boolean, cfg: ProvinceConfig = provinceConfig): number {
  return homelandTongue && cfg.locals_rough_bonus.grounds.includes(g) ? cfg.locals_rough_bonus.bonus : 0;
}

// ---------------------------------------------------------------- fever land

export type FeverStep = "none" | "mild" | "harsh" | "deadly";

/** What sets a province's fever land, in steps: its ground, the tropics, its marsh tiles, and the inventions that lower it (PROV-243, D-PROV-32). */
export function feverLandParts(p: Province, cfg: ProvinceConfig = provinceConfig): { ground: number; climate: number; marsh: number; inventions: number; step: FeverStep } {
  const f = cfg.fever_land;
  const ground = (f.by_ground as Record<string, number>)[p.ground] ?? 0;
  const climate = p.tropical ? f.tropics_steps : 0;
  const marsh = Math.floor(p.tiles.filter((t) => t.use === "Marsh").length / f.marsh_tiles_per_step);
  const inventions = -f.lowered_by.filter((id) => knows(p, id)).length;
  const steps = f.steps as FeverStep[];
  const at = ground + climate + marsh;
  // Inventions only lower fever land a province has.
  const step = at > 0 ? steps[Math.max(0, Math.min(steps.length - 1, at) + inventions)]! : "none";
  return { ground, climate, marsh, inventions, step };
}

export function feverLand(p: Province, cfg: ProvinceConfig = provinceConfig): FeverStep {
  return feverLandParts(p, cfg).step;
}

/** Extra yearly death rate in fever land: in full for people born elsewhere, a tenth for locals (PROV-102, PROV-243). */
export function feverDeathRate(step: FeverStep, bornHere: boolean, cfg: ProvinceConfig = provinceConfig): number {
  const rate = (cfg.fever_land.deaths_born_elsewhere as Record<FeverStep, number>)[step] ?? 0;
  return bornHere ? rate * cfg.fever_land.local_share : rate;
}

/** People of a group lost to fever land in some months. */
export function feverDeaths(people: number, step: FeverStep, bornHere: boolean, months = 1, cfg: ProvinceConfig = provinceConfig): number {
  return people * feverDeathRate(step, bornHere, cfg) * (months / 12);
}

// ---------------------------------------------------------------- ground and economy

interface GroundEconomy {
  build_cost: number;
  building_output: Record<string, number | string>;
  people_output: Record<string, number>;
}

function economy(g: Ground, cfg: ProvinceConfig): GroundEconomy {
  return (cfg.ground.economy as Record<Ground, GroundEconomy>)[g];
}

export function buildCost(g: Ground, cfg: ProvinceConfig = provinceConfig): number {
  return economy(g, cfg).build_cost;
}

/**
 * Building output multiplier for a building in this ground (PROV-050 to PROV-053).
 * Drylands and marsh lose their penalty once the tile is irrigated or drained.
 */
export function buildingOutput(g: Ground, building: string, work: { irrigated?: boolean; drained?: boolean } = {}, cfg: ProvinceConfig = provinceConfig): number {
  const o = economy(g, cfg).building_output;
  const own = o[building];
  if (typeof own === "number") return own;
  if (o.lifted_by === "irrigated" && work.irrigated) return 1;
  if (o.lifted_by === "drained" && work.drained) return 1;
  return o.base as number;
}

/** People output without a building, for an activity (herding, fishing …) (PROV-050). */
export function peopleOutput(g: Ground, activity: string, cfg: ProvinceConfig = provinceConfig): number {
  const o = economy(g, cfg).people_output;
  return o[activity] ?? o.base!;
}

/** The activity of people working a bare tile of this use. */
export function bareActivity(use: Use, cfg: ProvinceConfig = provinceConfig): string | null {
  return (cfg.bare_tile.by_use as Record<string, { activity: string }>)[use]?.activity ?? null;
}

// ---------------------------------------------------------------- buildings on tiles

export interface PlaceContext {
  /** The province has a shore tile or irrigation works (rice paddy). */
  water?: boolean;
  /** The tile's ground is wet (rice paddy). */
  wet?: boolean;
  tropical?: boolean;
  seam?: boolean;
  dryOrWarmCoast?: boolean;
  /** Ignore the invention check (placement only). */
  anyInvention?: boolean;
}

/** Whether a land building may stand on this tile (PROV-011, PROV-064). */
export function canPlace(p: Province, i: number, building: string, ctx: PlaceContext = {}, cfg: ProvinceConfig = provinceConfig): boolean {
  const t = p.tiles[i];
  const b = landBuilding(building, cfg);
  if (!t || !b || t.building) return false;
  if (!ctx.anyInvention && b.unlock && !knows(p, b.unlock)) return false;
  const rough = (b.rough_grounds ?? []).includes(p.ground);
  if (!b.uses.includes(t.use) && !(rough && t.use !== "Town" && t.use !== "Castle")) return false;
  if (b.grounds && !b.grounds.includes(p.ground)) return false;
  if (b.fields_grounds && t.use === "Fields" && !b.fields_grounds.includes(p.ground)) return false;
  if (b.needs_water && !(ctx.water ?? p.tiles.some((x) => x.use === "Shore" || x.building === "irrigation works"))) return false;
  if (b.tropical && !ctx.tropical) return false;
  if (b.needs_seam && !ctx.seam) return false;
  if (b.dry_or_warm_coast && !ctx.dryOrWarmCoast) return false;
  if (b.needs_harbour && !p.tiles.some((x) => x.building === "harbour")) return false;
  if (b.river && !t.river) return false;
  return true;
}

/** Places a land building if allowed. */
export function placeBuilding(p: Province, i: number, building: string, ctx: PlaceContext = {}, cfg: ProvinceConfig = provinceConfig): boolean {
  if (!canPlace(p, i, building, ctx, cfg)) return false;
  p.tiles[i]!.building = building;
  return true;
}

/** Whether a tile's building works now: not burned or fallow, and shore buildings stop under blockade (PROV-018). */
export function buildingWorks(p: Province, i: number): boolean {
  const t = p.tiles[i];
  if (!t || !t.building || t.state === "Burned" || t.state === "Fallow") return false;
  if (t.use === "Shore" && p.blockaded) return false;
  return true;
}

/** Castle steps the owner may build, from the research tree (PROV-064). */
export function castleStepsAllowed(p: Province, cfg: ProvinceConfig = provinceConfig): string[] {
  return Object.entries(cfg.buildings.castle_steps)
    .filter(([, unlock]) => unlock !== null && knows(p, unlock))
    .map(([step]) => step);
}

/** Gold bonus from a farm's grain with a mill, which needs *Water and wind mills* (PROV-064). */
export function addMill(p: Province, i: number, cfg: ProvinceConfig = provinceConfig): boolean {
  const t = p.tiles[i];
  if (!t || t.building !== "farm" || !knows(p, cfg.buildings.mill.unlock)) return false;
  t.mill = true;
  return true;
}

export function grainGoldBonus(t: Tile, cfg: ProvinceConfig = provinceConfig): number {
  return t.mill ? cfg.buildings.mill.gold_bonus : 0;
}

/** Shipyards and mines need a lumber camp within reach: same province or one ring (PROV-067). */
export function timberInReach(ringsToNearestLumberCamp: number | null, cfg: ProvinceConfig = provinceConfig): boolean {
  return ringsToNearestLumberCamp !== null && ringsToNearestLumberCamp <= cfg.buildings.timber_reach_rings;
}

/** A year of digging: every worked mine loses a year of seams and closes at none (PROV-065, PROV-066). */
export function digYear(p: Province): string[] {
  const closed: string[] = [];
  const workers = tileWorkers(p);
  p.tiles.forEach((t, i) => {
    if (t.building !== "mine" || (workers[i] ?? 0) === 0) return;
    t.seams = Math.max(0, t.seams - 1);
    if (t.seams === 0) {
      t.building = null;
      closed.push(`tile ${i}`);
    }
  });
  return closed;
}

// ---------------------------------------------------------------- food

export type HarvestRoll = "bumper" | "good" | "normal" | "poor" | "failed";

export function harvestMultiplier(roll: HarvestRoll, cfg: ProvinceConfig = provinceConfig): number {
  return cfg.food.harvest[roll];
}

/** The roll as it counts: with *Maize, potato and cassava* a failed harvest is poor (PROV-085). */
export function effectiveRoll(p: Province, roll: HarvestRoll, cfg: ProvinceConfig = provinceConfig): HarvestRoll {
  return roll === "failed" && knows(p, cfg.food.new_crops.invention) ? (cfg.food.new_crops.failed_becomes as HarvestRoll) : roll;
}

export interface FoodTileKind {
  perWorker: number;
  harvests: number;
  rolls: boolean;
  hazards: string[];
  /** Bare tiles feed at 0.67 × the ground's people output. */
  bare: boolean;
}

/** How a food tile feeds (PROV-081 to PROV-083); null when the tile grows no food. */
export function foodKind(t: Tile, cfg: ProvinceConfig = provinceConfig): FoodTileKind | null {
  if (t.building) {
    const b = landBuilding(t.building, cfg);
    if (!b || b.food_per_worker === undefined) return null;
    return { perWorker: b.food_per_worker, harvests: b.harvests ?? 1, rolls: b.harvest_roll ?? false, hazards: b.hazards ?? [], bare: false };
  }
  const bare = (cfg.bare_tile.by_use as Record<string, { food: boolean; harvest_roll: boolean }>)[t.use];
  if (!bare || !bare.food) return null;
  return { perWorker: cfg.food.bare_per_worker, harvests: 1, rolls: bare.harvest_roll, hazards: [], bare: true };
}

/**
 * People a food tile feeds in a year (PROV-080): workers × food per person × ground ×
 * harvest roll, once per harvest. Burned tiles feed nothing; worn tiles half.
 * `rolls` gives the roll for each harvest (rice is rolled twice, PROV-082).
 */
export function tileFood(p: Province, i: number, workers: number, rolls: HarvestRoll[], cfg: ProvinceConfig = provinceConfig): number {
  const t = p.tiles[i];
  if (!t || t.state === "Burned") return 0;
  const kind = foodKind(t, cfg);
  if (!kind) return 0;
  const ground = kind.bare ? peopleOutput(p.ground, bareActivity(t.use, cfg) ?? "base", cfg) : buildingOutput(p.ground, t.building!, {}, cfg);
  let fed = 0;
  for (let h = 0; h < kind.harvests; h++) {
    const roll = kind.rolls ? effectiveRoll(p, rolls[h] ?? rolls[0] ?? "normal", cfg) : "normal";
    fed += workers * kind.perWorker * ground * harvestMultiplier(roll, cfg);
  }
  return t.state === "Worn" ? fed * cfg.worn.output : fed;
}

/** The rolls a food tile takes in a year: one per harvest when it rolls at all. */
export function harvestRolls(t: Tile, roll: () => HarvestRoll, cfg: ProvinceConfig = provinceConfig): HarvestRoll[] {
  const kind = foodKind(t, cfg);
  if (!kind || !kind.rolls) return [];
  return Array.from({ length: kind.harvests }, () => roll());
}

// ---------------------------------------------------------------- wares

/**
 * Wares a building makes in a year, in worker-loads: workers × the ground's building output ×
 * inventions (PROV-090). A craft building without its input makes nothing (PROV-092).
 */
export function wareOutput(g: Ground, building: string, workers: number, opts: { inventions?: number; inputs?: boolean; standing?: boolean } = {}, cfg: ProvinceConfig = provinceConfig): number {
  if (opts.standing === false || opts.inputs === false) return 0;
  return workers * buildingOutput(g, building, {}, cfg) * (opts.inventions ?? 1);
}

/** Value of a finished ware against its raw ware: three times (PROV-091). */
export function craftValue(finished: string, cfg: ProvinceConfig = provinceConfig): number {
  return finished in cfg.wares.crafts ? cfg.wares.craft_value : 1;
}

export function wareList(cfg: ProvinceConfig = provinceConfig): { now: string[]; later: string[] } {
  return { now: cfg.wares.list, later: cfg.wares.later };
}

/** Prospecting events and mining inventions add years of seams (PROV-065). */
export function addSeams(p: Province, i: number, years: number): number {
  const t = p.tiles[i];
  if (!t || t.building !== "mine") return 0;
  t.seams += years;
  return t.seams;
}

// ---------------------------------------------------------------- town buildings

/** Building slots of the Town tile, from town size (PROV-069). */
export function townBuildingSlots(size: string, cfg: ProvinceConfig = provinceConfig): number {
  return (cfg.town.building_slots as Record<string, number>)[size] ?? 0;
}

/** Whether a town building can go up: a free building slot and a big enough town (PROV-069, PROV-070). */
export function canBuildTown(p: Province, name: string, cfg: ProvinceConfig = provinceConfig): boolean {
  const b = (cfg.buildings.town as Record<string, { min_town_size?: string }>)[name];
  if (!b || !p.townSize) return false;
  const sizes = cfg.town.sizes;
  if (b.min_town_size && sizes.indexOf(p.townSize) < sizes.indexOf(b.min_town_size)) return false;
  return p.town.length < townBuildingSlots(p.townSize, cfg);
}

/** Craft buildings may appear by themselves in a town with a market, homeless and the raw ware nearby (PROV-072). */
export function craftBuildingMayAppear(p: Province, rawWareNearby: boolean, cfg: ProvinceConfig = provinceConfig): boolean {
  return p.town.includes("market") && p.people.homeless > 0 && rawWareNearby && canBuildTown(p, "loom house", cfg);
}

/** A craft building appearing by itself, or founded by craftsmen fleeing persecution abroad (PROV-072, PROV-073). */
export function foundCraftBuilding(p: Province, name: string, cfg: ProvinceConfig = provinceConfig): boolean {
  if (!cfg.buildings.craft.includes(name) || !canBuildTown(p, name, cfg)) return false;
  p.town.push(name);
  return true;
}
