import { loyaltyCause, type Lord } from "../realm/index.ts";
import type { Use } from "../province/index.ts";
import { monthDrill } from "./companies.ts";
import { W, knows, type Company, type Known } from "./model.ts";

/**
 * Supply (spec §5.8): rations, the food reserve in wagons, taking food at
 * home, plunder abroad, the forage limit, hunger, sickness, winter quarters
 * and scorched earth.
 */

export type Rating = keyof typeof W.foraging_rating;
/** "rich" or "Rich" → the province ground table's rating name. */
export function rating(text: string): Rating {
  const r = (Object.keys(W.foraging_rating) as Rating[]).find((k) => k.toLowerCase() === text.toLowerCase());
  if (!r) throw new Error(`unknown foraging rating ${text}`);
  return r;
}
export const ratingShare = (r: string): number => W.foraging_rating[rating(r)];

/** A week's share of a month's meals. */
export const weekOf = (monthly: number): number => (monthly * W.days_per_week) / W.days_per_month;

// ---------------------------------------------------------------- the reserve (WAR-075 … WAR-077)

export interface Supply {
  reserve: number;
  wagons: number;
  reserveSize: number;
  known?: Known;
  logistics?: number;
}

/** What the wagons hold: 1,000 rations each, +50 % with W10 (WAR-076, INV-WAR-3). */
export const reserveRoom = (s: Pick<Supply, "wagons" | "known">): number => s.wagons * W.wagon.rations * (knows(s.known, "W10") ? W.wagon.w10_load : 1);
/** Each wagon needs 2 horses (WAR-076). */
export const wagonHorses = (wagons: number): number => wagons * W.wagon.horses;
/** The reserve size is 1, 2 or 3 months (WAR-077, INV-WAR-4). */
export const validReserveSize = (n: number): boolean => (W.reserve_sizes as number[]).includes(n);

/** Food added to the reserve, never above the wagons' room (WAR-075). */
export function addToReserve(s: Supply, rations: number): number {
  const took = Math.max(0, Math.min(rations, reserveRoom(s) - s.reserve));
  s.reserve += took;
  return took;
}

/** A month of rot: 5 %, half as fast with Logistics 3 or more (WAR-075). */
export function rot(s: Supply): number {
  const r = W.reserve;
  const share = r.rot * ((s.logistics ?? 0) >= r.rot_slow_logistics ? r.rot_slow_factor : 1);
  const lost = s.reserve * share;
  s.reserve -= lost;
  return lost;
}

/** A broken army loses half its wagons and the food in them (WAR-075, WAR-076). */
export function loseHalfWagons(s: Supply): { wagons: number; rations: number } {
  const wagons = s.wagons / 2;
  const rations = s.reserve / 2;
  s.wagons -= wagons;
  s.reserve -= rations;
  return { wagons, rations };
}

// ---------------------------------------------------------------- taking food (WAR-072 … WAR-082)

export interface SupplyProvince {
  id: string;
  localStore: number;
  /** Rations in the castle store, and the part kept back as its siege reserve. */
  castleStore?: number;
  siegeReserve?: number;
  /** Whose castle it is. */
  castleOf?: string;
  foraging?: string;
  charters?: string[];
  grievances: Record<string, number>;
  lord?: Lord;
  /** Months of food the people need (for Hungry). */
  monthlyNeed?: number;
  tiles?: { use: Use; burned?: boolean; seasonFood?: number }[];
  town?: boolean;
  /** A magazine built by an occupier with W10 (WAR-088). */
  magazineOf?: string;
}

export interface WeekTake {
  fromCastle: number;
  fromLocal: number;
  fromReserve: number;
  plundered: number;
  burnedTile: boolean;
}

/** Mark the province: Requisitioned for a season, Hungry under a month of food, Broken charter under a no-quartering charter (WAR-078, WAR-080). */
function requisitioned(p: SupplyProvince): void {
  p.grievances["Requisitioned"] = W.season_months;
  if (p.monthlyNeed !== undefined && p.localStore < p.monthlyNeed * W.requisition.hungry_below_months) p.grievances["Hungry"] = W.season_months;
  if (p.charters?.includes("no quartering")) p.grievances["Broken charter"] = W.season_months;
}

/**
 * A week of supply. At home (or at its own magazine with W10) an army takes
 * only its week's meals plus what its reserve is missing, from its own castle
 * down to the siege reserve, then from the local store; anywhere else it eats
 * its reserve, then plunders (WAR-072 … WAR-074, WAR-088).
 */
export function supplyWeek(s: Supply & { owner: string; monthly: number }, p: SupplyProvince, atHome: boolean): WeekTake {
  const meals = weekOf(s.monthly);
  const out: WeekTake = { fromCastle: 0, fromLocal: 0, fromReserve: 0, plundered: 0, burnedTile: false };
  const home = atHome || (p.magazineOf === s.owner && knows(s.known, "W10"));
  if (home) {
    const target = Math.min(reserveRoom(s), s.reserveSize * s.monthly);
    let need = meals + Math.max(0, target - s.reserve);
    if (p.castleOf === s.owner && p.castleStore !== undefined) {
      const spare = Math.max(0, p.castleStore - (p.siegeReserve ?? 0));
      out.fromCastle = Math.min(spare, need);
      p.castleStore -= out.fromCastle;
      need -= out.fromCastle;
    }
    out.fromLocal = Math.min(p.localStore, need);
    p.localStore -= out.fromLocal;
    if (out.fromLocal > 0) requisitioned(p);
    const got = out.fromCastle + out.fromLocal;
    s.reserve = Math.min(reserveRoom(s), s.reserve + Math.max(0, got - meals));
    return out;
  }
  out.fromReserve = Math.min(s.reserve, meals);
  s.reserve -= out.fromReserve;
  const short = meals - out.fromReserve;
  if (short > 0) {
    const p2 = plunder(p, short);
    out.plundered = p2.got;
    out.burnedTile = p2.burnedTile;
  }
  return out;
}

/** Plunder: the local store at the foraging rating, then the standing crop one tile a week; it never refills the reserve (WAR-074). */
export function plunder(p: SupplyProvince, want: number): { got: number; burnedTile: boolean } {
  if (p.localStore > 0) {
    const take = Math.min(p.localStore, want);
    p.localStore -= take;
    requisitioned(p);
    return { got: take * ratingShare(p.foraging ?? "Rich"), burnedTile: false };
  }
  const tile = p.tiles?.find((t) => !t.burned && (t.use === "Fields" || t.use === "Pasture"));
  if (!tile) return { got: 0, burnedTile: false };
  tile.burned = true;
  return { got: tile.seasonFood ?? 0, burnedTile: true };
}

/** A lord whose grain an army takes in a season loses a step of loyalty, once a season (WAR-079). */
export function lordResents(lord: Lord, alreadyThisSeason: boolean): void {
  if (!alreadyThisSeason) loyaltyCause(lord, "grain_requisitioned");
}

/** How many soldiers a province can feed for a month: local store × foraging rating ÷ 2 rations (WAR-081). */
export const forageLimit = (localStore: number, foraging: string): number => (localStore * ratingShare(foraging)) / W.forage_limit_rations;

/** Taking an enemy castle puts its store into the army's reserve (WAR-082, WAR-174). */
export function takeCastleStore(s: Supply, p: SupplyProvince): number {
  const took = addToReserve(s, p.castleStore ?? 0);
  p.castleStore = 0;
  return took;
}

// ---------------------------------------------------------------- hunger and sickness (WAR-083, WAR-084)

/** A week with no food: 5 % desert (levies first, standing regiments last), 2 % die, 1 in 10 horses eaten, −20 % strength, −10 % break point (WAR-083). */
export function hungerWeek(companies: Company[], horses: number, opts: { beloved?: boolean } = {}): { deserted: number; died: number; horsesEaten: number; strength: number; breakPoint: number; byKind: Record<string, number> } {
  const H = W.hunger;
  const men = companies.reduce((s, c) => s + c.men, 0);
  let deserting = men * H.desert * (opts.beloved ? W.traits.Beloved.desertion : 1);
  const deserted = deserting;
  const byKind: Record<string, number> = {};
  for (const kind of H.desert_order) {
    for (const c of companies.filter((x) => x.kind === kind)) {
      const n = Math.min(c.men, deserting);
      c.men -= n;
      deserting -= n;
      byKind[kind] = (byKind[kind] ?? 0) + n;
    }
  }
  const died = men * H.die;
  const left = companies.reduce((s, c) => s + c.men, 0);
  for (const c of companies) c.men -= left > 0 ? (died * c.men) / left : 0;
  for (const c of companies) c.hungry = true;
  return { deserted, died, horsesEaten: horses * H.horses, strength: H.strength, breakPoint: H.break, byKind };
}

export type Sickness = "Low" | "Medium" | "High" | "Heat" | "Cold";

/** Men lost to sickness in a month: the ground's rate (cold only in winter) plus fever land for men not born there, cut 10 % per Logistics; forced march and camp fever double it (WAR-084, WAR-066, WAR-168). */
export function sicknessLoss(men: number, ground: string, o: { logistics?: number; winter?: boolean; feverRate?: number; bornThere?: boolean; doubled?: boolean } = {}): number {
  const g = (Object.keys(W.sickness) as string[]).find((k) => k.toLowerCase() === ground.toLowerCase()) as Sickness | undefined;
  if (!g) throw new Error(`unknown sickness ${ground}`);
  let rate = g === "Cold" && W.sickness.cold_only_in_winter && !o.winter ? 0 : W.sickness[g];
  if (o.bornThere === false) rate += o.feverRate ?? 0;
  if (o.doubled) rate *= W.forced_march.sickness;
  return men * rate * (1 - W.logistics.sickness_cut * (o.logistics ?? 0));
}

// ---------------------------------------------------------------- winter (WAR-085, WAR-086)

/** Winter quarters: refused under a no-quartering charter; otherwise 1 ration a man from the local store, drill, and Soldiers quartered after a season (WAR-085). */
export function winterQuarters(companies: Company[], p: SupplyProvince, monthsQuartered: number): { refused: boolean; eaten: number } {
  if (!p.town || p.charters?.includes("no quartering")) return { refused: true, eaten: 0 };
  const men = companies.reduce((s, c) => s + c.men, 0);
  const eaten = Math.min(p.localStore, men * W.rations.quarters);
  p.localStore -= eaten;
  for (const c of companies) monthDrill(c, "in winter quarters");
  if (monthsQuartered >= W.season_months) p.grievances["Soldiers quartered"] = W.season_months;
  return { refused: false, eaten };
}

// ---------------------------------------------------------------- scorched earth (WAR-087)

/** Burn the fields: every food tile burns, the local store goes to the nearest castle or is destroyed, Burned homes and Hungry (WAR-087). */
export function burnTheFields(p: SupplyProvince, nearestCastle?: { store: number }): void {
  for (const t of p.tiles ?? []) if (t.use === "Fields" || t.use === "Pasture") t.burned = true;
  if (nearestCastle) nearestCastle.store += p.localStore;
  p.localStore = 0;
  p.grievances["Burned homes"] = W.season_months;
  p.grievances["Hungry"] = W.season_months;
}
