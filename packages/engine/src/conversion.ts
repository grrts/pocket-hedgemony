import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { provinceConfig } from "./domain/province/model.ts";
import { buildCost } from "./domain/province/land.ts";
import { FOOD_CLASSES, MAX_TILES, tileUse, USES, type UseName } from "./land.ts";
import { knowsInvention, worksFood } from "./works.ts";

/**
 * Changing what a tile is used for (feedback 86; province PROV-012,
 * PROV-015 to PROV-017): clear woods into fields, turn fields to pasture and
 * plough pasture back, drain marsh and irrigate dry waste (each of the last
 * two needs its invention). Each costs gold and months, one change at a
 * time per province, and the ground never changes. The crown changes its
 * own provinces; lords and the AI change theirs by a rule (PROV-325).
 */

export const CHANGES = ["clear woods", "to pasture", "plough", "drain", "irrigate"] as const;
export type ChangeName = (typeof CHANGES)[number];

const FROM_TO: Record<ChangeName, [UseName, UseName]> = {
  "clear woods": ["woods", "fields"],
  "to pasture": ["fields", "pasture"],
  plough: ["pasture", "fields"],
  drain: ["marsh", "fields"],
  irrigate: ["waste", "fields"],
};

/** What the change is called on the Land tab. */
export const changeTitle = (c: ChangeName): string => TITLE[c];
const TITLE: Record<ChangeName, string> = {
  "clear woods": "Clear the woods",
  "to pasture": "Turn to pasture",
  plough: "Plough the pasture",
  drain: "Drain the marsh",
  irrigate: "Irrigate the waste",
};

const CFG = provinceConfig.tile_changes as Record<ChangeName, { gold: number; years?: number; seasons?: number; needs?: string; grounds?: string[] }>;

export interface ConversionState {
  /** The tile being changed in each province (index within its tiles), -1 when none. */
  provinceChangeTile: Int8Array;
  /** The change under way (index into CHANGES). */
  provinceChange: Uint8Array;
  /** Months left of it, and months it takes in all. */
  provinceChangeLeft: Uint8Array;
  provinceChangeMonths: Uint8Array;
  /** Gold paid for it (half comes back if it is stopped). */
  provinceChangeGold: Float32Array;
}

export function createConversionState(P: number): ConversionState {
  return { provinceChangeTile: new Int8Array(P).fill(-1), provinceChange: new Uint8Array(P), provinceChangeLeft: new Uint8Array(P), provinceChangeMonths: new Uint8Array(P), provinceChangeGold: new Float32Array(P) };
}

/** Months a change takes. */
export function changeMonths(change: ChangeName): number {
  const c = CFG[change];
  if (change === "clear woods") return provinceConfig.clear_woods.years * 12;
  if (change === "to pasture") return provinceConfig.fields_to_pasture.seasons * provinceConfig.months_per_season;
  return c.years ? c.years * 12 : (c.seasons ?? 1) * provinceConfig.months_per_season;
}

/** Treasury gold a change costs in a province (the data's gold, at the province's ground's build cost). */
export function changeGold(world: World, p: number, change: ChangeName): number {
  return CFG[change].gold * world.rules.defines.works.goldScale * buildCost(world.provinceGround[p] ?? "grassland");
}

/** The use a change starts from and ends in. */
export const changeUses = (change: ChangeName): [UseName, UseName] => FROM_TO[change];

/** The changes that fit a tile of a use in a province's ground (whatever is known): one to three. */
export function changesFor(world: World, p: number, use: UseName): ChangeName[] {
  const ground = world.provinceGround[p] ?? "grassland";
  return CHANGES.filter((c) => FROM_TO[c][0] === use && (!CFG[c].grounds || CFG[c].grounds!.includes(ground)));
}

/** Whether a change is under way in the province. */
export const changing = (world: World, p: number): boolean => world.provinceChangeTile[p]! >= 0;

/** Why realm n can't start a change on a tile of a use in province p now, or null when it can. */
export function whyNotChange(world: World, n: number, p: number, change: ChangeName, ai = false): string | null {
  if (world.provinceOwner[p] !== n) return "not your province";
  if (!ai && world.provinceLord[p]! >= 0) return "its lord decides on his land";
  if (!changesFor(world, p, FROM_TO[change][0]).includes(change)) return `the ground here can't be ${change === "irrigate" ? "irrigated" : "changed so"}`;
  if (changing(world, p)) return "one change at a time: another is under way";
  if (tileOf(world, p, FROM_TO[change][0]) < 0) return `no ${FROM_TO[change][0]} here`;
  const needs = CFG[change].needs;
  if (needs && !knowsInvention(world, n, needs)) return `needs ${inventionTitle(needs)}`;
  if (!ai && world.nationTreasury[n]! < changeGold(world, p, change)) return "not enough gold";
  return null;
}

const INVENTION_TITLE: Record<string, string> = { F8: "Polder drainage", F3: "Qanat and canal irrigation" };
const inventionTitle = (id: string) => INVENTION_TITLE[id] ?? id;

/** The last tile of a use in province p (the one a change takes), or -1. */
function tileOf(world: World, p: number, use: UseName): number {
  for (let i = MAX_TILES - 1; i >= 0; i--) if (tileUse(world, p, i) === use) return i;
  return -1;
}

/** Starts a change on a tile of its use; the gold goes now (the AI's lords pay nothing from the crown). */
export function orderChange(world: World, n: number, p: number, change: string, ai = false): string | null {
  if (!(CHANGES as readonly string[]).includes(change)) return "no such change";
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount) return "no such province";
  const c = change as ChangeName;
  const why = whyNotChange(world, n, p, c, ai);
  if (why) return why;
  const gold = world.provinceLord[p]! >= 0 ? 0 : changeGold(world, p, c);
  world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  world.provinceChangeTile[p] = tileOf(world, p, FROM_TO[c][0]);
  world.provinceChange[p] = CHANGES.indexOf(c);
  world.provinceChangeLeft[p] = world.provinceChangeMonths[p] = changeMonths(c);
  world.provinceChangeGold[p] = gold;
  return null;
}

/** Stops the change under way in a province: half its gold comes back. */
export function stopChange(world: World, n: number, p: number): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || !changing(world, p)) return "nothing being changed there";
  if (world.provinceOwner[p] !== n) return "not your province";
  world.nationTreasury[n] = world.nationTreasury[n]! + world.provinceChangeGold[p]! * 0.5;
  world.provinceChangeTile[p] = -1;
  return null;
}

/** The month's work on every change: a finished one turns its tile to the new use. */
export function monthlyChanges(world: World, news: News[]): void {
  for (let p = 0; p < world.provinceCount; p++) {
    const i = world.provinceChangeTile[p]!;
    if (i < 0) continue;
    const c = CHANGES[world.provinceChange[p]!]!;
    // A change in a lost province, or on a tile no longer of its use, stops.
    if (world.provinceOwner[p]! < 0 || tileUse(world, p, i) !== FROM_TO[c][0]) {
      world.provinceChangeTile[p] = -1;
      continue;
    }
    world.provinceChangeLeft[p] = world.provinceChangeLeft[p]! - 1;
    if (world.provinceChangeLeft[p]! > 0) continue;
    const to = FROM_TO[c][1];
    world.provinceTiles[p * MAX_TILES + i] = USES.indexOf(to) + 1;
    world.provinceChangeTile[p] = -1;
    news.push({ kind: "built", text: `${changeDone(c)} in ${world.rules.provinces[p]!.name}: a tile of ${to} more.`, nations: [world.provinceOwner[p]!], province: p });
  }
}

const changeDone = (c: ChangeName): string =>
  c === "clear woods" ? "Woods cleared" : c === "to pasture" ? "Fields turned to pasture" : c === "plough" ? "Pasture ploughed" : c === "drain" ? "Marsh drained" : "Waste irrigated";

/**
 * Lords and the AI by rule (feedback 86): each January, a province that
 * doesn't feed its people and changes nothing yet starts the first change
 * that gives fields: drain marsh, irrigate waste, then clear woods (keeping
 * one woods tile), if its realm keeps the gold. The player's own royal
 * provinces are left to the player; their lords' provinces follow the rule.
 */
export function aiChanges(world: World): void {
  if (world.date.month !== 1) return;
  const reserve = world.rules.defines.works.aiReserveGold;
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (n < 0 || world.provinceWater[p] || changing(world, p)) continue;
    const lord = world.provinceLord[p]! >= 0;
    if (n === world.player && !lord) continue;
    let fed = 0;
    for (const c of FOOD_CLASSES) fed += worksFood(world, p, c);
    if (fed >= world.provincePopulation[p]!) continue;
    for (const c of ["drain", "irrigate", "clear woods"] as const) {
      if (c === "clear woods" && countUse(world, p, "woods") < 2) continue;
      if (!lord && world.nationTreasury[n]! - changeGold(world, p, c) < reserve) continue;
      if (orderChange(world, n, p, c, true) === null) break;
    }
  }
}

function countUse(world: World, p: number, use: UseName): number {
  let k = 0;
  for (let i = 0; i < MAX_TILES; i++) if (tileUse(world, p, i) === use) k++;
  return k;
}

/** A change on a province's Land tab: what it is, what it costs, and why not. */
export interface ChangeRow {
  change: ChangeName;
  title: string;
  to: UseName;
  gold: number;
  months: number;
  why: string | null;
}

/** The changes a tile of a use offers realm n in province p. */
export function changeRows(world: World, n: number, p: number, use: UseName): ChangeRow[] {
  return changesFor(world, p, use).map((c) => ({ change: c, title: TITLE[c], to: FROM_TO[c][1], gold: changeGold(world, p, c), months: changeMonths(c), why: whyNotChange(world, n, p, c) }));
}
