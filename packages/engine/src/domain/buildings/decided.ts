import type { Rng } from "../../rng.ts";
import { buildingsConfig as cfg, buildingType, costOf, prov, townSlots, type Realm, type TownSize } from "./index.ts";

/** Rules settled in spec §13 (D-BLD-1 to D-BLD-21, BLD-155 to BLD-161). Numbers live in buildings.json. */

/** Troyes in 1444: a town with 6 town slots (BLD-155). */
export function troyes1444(): { townSize: TownSize; slots: number } {
  return { townSize: cfg.troyes_1444.town_size, slots: townSlots(cfg.troyes_1444.town_size) };
}

/** Chance a town burns this year: 1 % plus 0.5 % per size above town (BLD-161). */
export function townFireChance(size: TownSize): number {
  const f = cfg.damage.town_fire;
  const above = Math.max(0, cfg.town_sizes.indexOf(size) - cfg.town_sizes.indexOf("town"));
  return f.chance_per_year + f.per_size_above_town * above;
}

/** A yearly roll for a town fire (BLD-161). */
export function rollTownFire(size: TownSize, rng: Rng): boolean {
  return rng.next() < townFireChance(size);
}

/** A raid of 2,000 men or more is big (BLD-161). */
export function isBigRaid(men: number): boolean {
  return men >= cfg.damage.big_raid_men;
}

/** A craft building may appear only where the trade ratio is at least 30 %, with a 1 in 10 chance a year (D-BLD-15). */
export function craftMayAppear(tradeRatio: number, roll: number): boolean {
  return tradeRatio >= cfg.crafts_appearing.trade_ratio_at_least && roll < cfg.crafts_appearing.chance_per_year;
}

/** Paying to rebuild a burned tile: half a farm's cost, done within a season (BLD-160). */
export function paidRebuild(ground = "farmland"): { gold: number; months: number } {
  const b = cfg.burned_rebuild;
  return { gold: costOf("farm", 1, ground).gold * b.paid_share_of_farm_cost, months: b.paid_months };
}

/** Burned tiles rebuilding by themselves each year in peace (BLD-160). */
export function freeRebuildsPerYear(): number {
  return cfg.burned_rebuild.free_per_year_in_peace;
}

/** Road step names, their unlocks and gold (BLD-157). */
export function roadSteps(): { name: string; unlock: string; gold: number }[] {
  return buildingType("road").steps.map((s) => ({ name: s.name, unlock: s.unlocked_by, gold: s.cost.gold ?? 0 }));
}

/** Highest step a building type has (D-BLD-4). */
export function stepsUpTo(type: string): number {
  return buildingType(type).steps.length;
}

/** Whether a realm may start a new yearly fair: T6 and a market charter (BLD-158, D-TRADE-3). */
export function mayBuildYearlyFair(r: Realm, provinceId: string): string | null {
  const s = buildingType("market").steps[1];
  if (s && s.unlocked_by !== "start" && !r.inventions.has(s.unlocked_by)) return `needs ${s.unlocked_by}`;
  if (!prov(r, provinceId).charters.has("market charter")) return "needs a market charter";
  return null;
}

/** The trade role of the caravanserai and counting house (BLD-159). */
export function tradeRole(type: "caravanserai" | "counting house"): string {
  return type === "caravanserai"
    ? `land traders +${Math.round(cfg.caravanserai_land_trader_weight * 100)} % weight and no bandits`
    : "foreign traders deposit with bills of exchange";
}

/** The data file that sets the starting harbours: the start scenario's ports (D-BLD-8, X-25). */
export function startingPortsFile(): string {
  return cfg.starting_ports_file;
}

/** A landmark's type and step, and its own effect (D-BLD-5). */
export function landmarkInfo(id: string): { type: string; effect: string } {
  const l = cfg.landmarks.find((x) => x.id === id);
  if (!l) throw new Error(`No landmark ${id}`);
  const known = cfg.buildings.some((b) => b.id === l.building);
  return { type: known ? `${l.building}, step ${l.step}` : l.building, effect: l.effect ?? "" };
}

/** Unique variants stored in the buildings data, by country or culture (D-BLD-16). */
export function uniqueVariant(id: string): { who: string; change: string } | null {
  const v = cfg.unique_variants.find((x) => x.id === id);
  return v ? { who: v.who, change: v.change } : null;
}
