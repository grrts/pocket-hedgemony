import { plagueReached } from "./everyday.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { Rng } from "./rng.ts";
import { CLASSES as CLASS_NAMES, provinceConfig } from "./domain/province/model.ts";
import { deathModifiers } from "./domain/province/people.ts";
import { plagueWeekDays } from "./domain/province/decided.ts";

/**
 * Plague (province PROV-240 to PROV-242, PROV-352 to PROV-363): a province
 * catches it, goes through the steps rumour, outbreak and burning out, and is
 * spared for some years after. It starts rarely, most often in crowded towns
 * and shanty camps, and spreads on the plague weeks (days 7, 14, 21 and 28 of
 * the month) to land next door, along rivers, by sea between coasts of the
 * same waters, and with armies that stood where it raged. Its deaths fall on
 * townsfolk first. The owner can close a province (quarantine): nothing
 * spreads out of it by trade and less gets in, but its trade stops and its
 * tax falls while it stays closed.
 *
 * Only the sick provinces are visited each plague week (a list kept in step
 * order of province), and the yearly chance of a new outbreak is rolled once
 * a month, so a day without plague costs nothing. Plague has its own seeded
 * draws, so a plague roll never shifts any other roll of the game.
 */

const C = provinceConfig.plague;

/** The steps, as the province context names them: 0 none, 1 rumour, 2 outbreak, 3 burning out. */
export const PLAGUE_STEPS = C.steps as readonly string[];
export const NONE = 0;
export const RUMOUR = 1;
export const OUTBREAK = 2;
export const BURNING_OUT = 3;

/** Days of the month the plague week runs on (D-PROV-4). */
const WEEK_DAYS = plagueWeekDays();
const WEEKS_A_YEAR = 12 * WEEK_DAYS.length;
const TOWN = new Set<string>(provinceConfig.classes.town);
const TOWN_CLASSES = CLASS_NAMES.map((c, k) => (TOWN.has(c) ? k : -1)).filter((k) => k >= 0);
const COUNTRY_CLASSES = CLASS_NAMES.map((c, k) => (TOWN.has(c) ? -1 : k)).filter((k) => k >= 0);
const HOMELESS = CLASS_NAMES.indexOf("homeless");
/** Classes per province in provinceClasses (living.ts; read here from the province context, as the engine's modules import one another in a cycle). */
const CLASS_COUNT = CLASS_NAMES.length;

export interface PlagueState {
  /** Plague step of each province (index into PLAGUE_STEPS). */
  provincePlague: Int8Array;
  /** Plague weeks left at the step. */
  provincePlagueWeeks: Uint8Array;
  /** 1 while the owner keeps the province closed (quarantine). */
  provinceQuarantine: Uint8Array;
  /** People this plague has killed in each province, in thousands (kept after it burns out until the next). */
  provincePlagueDead: Float32Array;
  /** 1 while the owner pays physicians against this plague (an everyday event's choice, EVT-130): fewer die and it is over sooner. */
  provincePlagueCare: Uint8Array;
  /** world.day the last plague in each province burned out; the province is spared for plague.spared_years after. */
  provincePlagueEnded: Int32Array;
  /** The sick provinces (step above none), in province order. */
  plagueSick: number[];
  /** Armies carrying plague (slot → plague weeks left). */
  plagueCarriers: Map<number, number>;
  /** Plague's own draws. */
  plagueRng: Rng;
}

export function createPlagueState(P: number, seed: number): PlagueState {
  return {
    provincePlague: new Int8Array(P),
    provincePlagueWeeks: new Uint8Array(P),
    provinceQuarantine: new Uint8Array(P),
    provincePlagueDead: new Float32Array(P),
    provincePlagueCare: new Uint8Array(P),
    provincePlagueEnded: new Int32Array(P).fill(-1e6),
    plagueSick: [],
    plagueCarriers: new Map(),
    plagueRng: new Rng((seed ^ 0x5eed_b1a9) >>> 0),
  };
}

/** Whether the plague week runs on this day of the month. */
export function isPlagueWeek(dayOfMonth: number): boolean {
  return WEEK_DAYS.includes(dayOfMonth);
}

/** How crowded a province is: its townsfolk share against a typical town's, within crowd_min and crowd_max. */
export function crowding(world: World, p: number): number {
  const people = world.provincePopulation[p]!;
  if (!(people > 0)) return 0;
  let town = 0;
  for (const c of TOWN_CLASSES) town += world.provinceClasses[p * CLASS_COUNT + c]!;
  return Math.min(C.crowd_max, Math.max(C.crowd_min, town / people / C.crowd_town_share));
}

/** Shanty camps: homeless over plague's shanty share of the people (PROV-123): plague starts and spreads there twice as fast. */
function shanty(world: World, p: number): boolean {
  const people = world.provincePopulation[p]!;
  return people > 0 && world.provinceClasses[p * CLASS_COUNT + HOMELESS]! / people > provinceConfig.homeless.shanty_over;
}

/** Weight of crowding and shanty camps on a province's chance to catch plague. */
function catchWeight(world: World, p: number): number {
  return crowding(world, p) * (shanty(world, p) ? provinceConfig.homeless.shanty_plague_spread : 1);
}

/** Spared: plague burned out here within plague.spared_years (the survivors don't catch it again soon). */
export function spared(world: World, p: number): boolean {
  return world.day - world.provincePlagueEnded[p]! < C.spared_years * 365;
}

/** Whether plague can take hold in p now: land with people, not sick, not spared. */
function canCatch(world: World, p: number): boolean {
  return held(world, p) && world.provincePlague[p] === NONE && !spared(world, p);
}

/** Land a realm holds, with people: land no realm holds has scattered folk and no towns, and plague neither starts nor spreads there (PROV-352). */
function held(world: World, p: number): boolean {
  return !world.provinceWater[p] && world.provinceOwner[p]! >= 0 && world.provincePopulation[p]! > 0;
}

function nameOf(world: World, p: number): string {
  return world.rules.provinces[p]!.name;
}

/** Puts p on the sick list, which stays in province order. */
function addSick(world: World, p: number): void {
  const list = world.plagueSick;
  let i = list.length;
  while (i > 0 && list[i - 1]! > p) i--;
  list.splice(i, 0, p);
}

/**
 * Plague takes hold in p at its first step, rumour. `from` is the province it
 * came from (-1 when it broke out there), `how` the way it came. The player
 * hears of it once for each province of his.
 */
function catchPlague(world: World, p: number, news: News[], from: number, how: "road" | "river" | "sea" | "army" | "here"): void {
  world.provincePlague[p] = RUMOUR;
  world.provincePlagueWeeks[p] = C.rumour_weeks;
  world.provincePlagueDead[p] = 0;
  addSick(world, p);
  const owner = world.provinceOwner[p]!;
  if (owner >= 0 && owner === world.player) {
    const way = how === "here" ? "has broken out in its crowded streets" : how === "army" ? "has come with an army" : how === "sea" ? `has come by ship from ${nameOf(world, from)}` : `has come ${how === "river" ? "down the river" : "along the road"} from ${nameOf(world, from)}`;
    news.push({ kind: "plague", text: `Plague in ${nameOf(world, p)}: the sickness ${way}. Its townsfolk die first. You can close the province to slow it, at a cost to its trade and tax.`, nations: [owner], province: p });    // A card asks what to do about it (EVT-130).
    plagueReached(world, p);
  }
}

/**
 * Starts plague in province p at its first step, as an event's "a plague
 * outbreak" does (PROV-270). Returns false when it can't take hold there
 * (sea, no people, already sick or spared).
 */
export function startOutbreak(world: World, p: number, news: News[]): boolean {
  if (p < 0 || p >= world.provinceCount || !canCatch(world, p)) return false;
  catchPlague(world, p, news, -1, "here");
  return true;
}

/**
 * Realm n closes province p (quarantine, on) or opens it again (off)
 * (QuarantineProvince, PROV-357). While closed, its trade ratio stays at 0,
 * its tax falls to plague.quarantine_tax_factor, nothing spreads out of it by
 * road, river or sea, and less gets in. Returns why not, or null.
 */
export function setQuarantine(world: World, n: number, p: number, on: boolean, news: News[]): string | null {
  if (p < 0 || p >= world.provinceCount || world.provinceWater[p]) return "no such province";
  if (world.provinceOwner[p] !== n) return "not your province";
  if (!!world.provinceQuarantine[p] === on) return on ? "it is already closed" : "it is not closed";
  world.provinceQuarantine[p] = on ? 1 : 0;
  // Trade stops at once: no trader trades in a closed province (TRADE-040).
  if (on) world.provinceTradeRatio[p] = 0;
  if (n === world.player) news.push({ kind: "plague", text: on ? `${nameOf(world, p)} is closed: its trade stops and its tax falls by half until you lift the quarantine.` : `The quarantine on ${nameOf(world, p)} is lifted: traders come back, slowly.`, nations: [n], province: p });
  return null;
}

/** What a closed province still pays of its tax (PROV-357). */
export function quarantineTaxFactor(world: World, p: number): number {
  return world.provinceQuarantine[p] ? C.quarantine_tax_factor : 1;
}

/** The share of its tax any closed province still pays, for the screens. */
export function quarantineTaxShare(): number {
  return C.quarantine_tax_factor;
}

/** Yearly death rate plague adds at a province's step: rumour and burning out the lowest, an outbreak in shanty camps the worst (PROV-102). */
export function plagueDeathRate(world: World, p: number): number {
  const step = world.provincePlague[p]!;
  if (step === NONE) return 0;
  const stage = step === OUTBREAK ? (shanty(world, p) ? "worst" : "outbreak") : "rumour";
  return deathModifiers({ plague: stage }).everyone;
}

/**
 * One plague week's dead in p (PROV-356): a week's share of the plague death
 * rate, taken from the townsfolk first, at most plague.town_week_share_max of
 * each town class a week, and the rest from the countryfolk by their shares.
 * Returns the dead, in thousands.
 */
export function plagueDeaths(world: World, p: number): number {
  const people = world.provincePopulation[p]!;
  const dead = ((people * plagueDeathRate(world, p)) / WEEKS_A_YEAR) * (world.provincePlagueCare[p] ? 1 - C.care_death_cut : 1);
  if (!(dead > 0)) return 0;
  const cls = world.provinceClasses;
  let left = dead;
  for (const c of TOWN_CLASSES) {
    const i = p * CLASS_COUNT + c;
    const take = Math.min(left, cls[i]! * C.town_week_share_max);
    cls[i] = cls[i]! - take;
    left -= take;
  }
  if (left > 0) {
    let country = 0;
    for (const c of COUNTRY_CLASSES) country += cls[p * CLASS_COUNT + c]!;
    const keep = country > left ? 1 - left / country : 0;
    for (const c of COUNTRY_CLASSES) cls[p * CLASS_COUNT + c] = cls[p * CLASS_COUNT + c]! * keep;
    left = Math.max(0, left - country);
  }
  const taken = dead - left;
  world.provincePopulation[p] = Math.max(0, people - taken);
  world.provincePlagueDead[p] = world.provincePlagueDead[p]! + taken;
  return taken;
}

/**
 * The AI's rule (PROV-358): when an outbreak begins in a crowded town of an AI
 * realm (crowding 1 or more), the realm closes it, and opens it again when the
 * plague is gone. It leaves its countryside open: closing it costs more than it saves.
 */
function aiQuarantine(world: World, p: number, on: boolean): void {
  const owner = world.provinceOwner[p]!;
  if (owner < 0 || owner === world.player || !!world.provinceQuarantine[p] === on) return;
  if (on && crowding(world, p) < 1) return;
  setQuarantine(world, owner, p, on, []);
}

/** Moves p on by a plague week: deaths, then the step's weeks run down (PROV-355, PROV-356). Returns false once it is gone. */
function weekOf(world: World, p: number, news: News[]): boolean {
  plagueDeaths(world, p);
  const left = world.provincePlagueWeeks[p]! - 1;
  if (left > 0) {
    world.provincePlagueWeeks[p] = left;
    return true;
  }
  const step = world.provincePlague[p]!;
  if (step === RUMOUR) {
    // It lasts a season or two (PROV-241).
    const [lo, hi] = C.outbreak_seasons as [number, number];
    world.provincePlague[p] = OUTBREAK;
    // Physicians cut it to the shortest (EVT-130).
    world.provincePlagueWeeks[p] = (world.provincePlagueCare[p] ? lo : lo + world.plagueRng.int(hi - lo + 1)) * C.weeks_per_season;
    aiQuarantine(world, p, true);
    return true;
  }
  if (step === OUTBREAK) {
    world.provincePlague[p] = BURNING_OUT;
    world.provincePlagueWeeks[p] = C.burning_out_weeks;
    return true;
  }
  world.provincePlague[p] = NONE;
  world.provincePlagueWeeks[p] = 0;
  world.provincePlagueCare[p] = 0;
  world.provincePlagueEnded[p] = world.day;
  aiQuarantine(world, p, false);
  const owner = world.provinceOwner[p]!;
  if (owner >= 0 && owner === world.player) {
    const dead = Math.round(world.provincePlagueDead[p]! * 1000);
    news.push({ kind: "plague", text: `The plague in ${nameOf(world, p)} has burned out. ${dead.toLocaleString("en-GB")} died of it.${world.provinceQuarantine[p] ? " The province stays closed until you lift the quarantine." : ""}`, nations: [owner], province: p });
  }
  return false;
}

/** A roll for plague to reach q from a sick province, at chance `chance` before q's own crowding and quarantine. */
function tryCatch(world: World, q: number, chance: number, news: News[], from: number, how: "road" | "river" | "sea" | "army"): void {
  if (!canCatch(world, q)) return;
  if (world.plagueRng.next() < catchChance(world, q, chance)) catchPlague(world, q, news, from, how);
}

/** The chance plague reaches q this week from a link of chance `base`: more in crowded towns and shanty camps, less into a closed province (PROV-353, PROV-357). */
export function catchChance(world: World, q: number, base: number): number {
  return base * catchWeight(world, q) * (world.provinceQuarantine[q] ? C.into_quarantine_factor : 1);
}

/**
 * The plague week (PROV-353 to PROV-356), on days 7, 14, 21 and 28: the sick
 * provinces move on a week, then plague spreads from every outbreak, then
 * armies pick it up and carry it, and on the first plague week of the month
 * new outbreaks may start anywhere.
 */
export function weeklyPlague(world: World, news: News[]): void {
  // Sick provinces move on a week; those it leaves come off the list.
  const before = world.plagueSick;
  if (before.length) world.plagueSick = before.filter((p) => weekOf(world, p, news));
  // Spread from each outbreak to its neighbours (PROV-353).
  const sick = world.plagueSick.slice();
  const adj = world.adjList;
  for (const s of sick) {
    if (world.provincePlague[s] !== OUTBREAK) continue;
    // A closed province sends nothing out by trade; only armies can still carry it.
    if (world.provinceQuarantine[s]) continue;
    for (let k = world.adjStart[s]!, end = world.adjStart[s + 1]!; k < end; k++) {
      const q = adj[k]!;
      if (world.provinceWater[q]) {
        // By ship to the other coasts of the same waters.
        for (let j = world.adjStart[q]!, e = world.adjStart[q + 1]!; j < e; j++) {
          const r = adj[j]!;
          if (r !== s && !world.provinceWater[r]) tryCatch(world, r, C.sea_spread_week, news, s, "sea");
        }
        continue;
      }
      const river = world.provinceRiver[s] && world.provinceRiver[q];
      tryCatch(world, q, C.spread_week * (river ? C.river_factor : 1), news, s, river ? "river" : "road");
    }
  }
  spreadWithArmies(world, news);
  if ((world.date.day ?? 1) === WEEK_DAYS[0]) newOutbreaks(world, news);
}

/** Armies pick plague up where it rages and may bring it where they stand for plague.army_carry_weeks after (PROV-354). */
function spreadWithArmies(world: World, news: News[]): void {
  const carriers = world.plagueCarriers;
  if (!world.plagueSick.length && !carriers.size) return;
  const a = world.armies;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) {
      carriers.delete(i);
      continue;
    }
    const at = a.location[i]!;
    if (world.provincePlague[at] === OUTBREAK) {
      carriers.set(i, C.army_carry_weeks);
      continue;
    }
    const weeks = carriers.get(i);
    if (weeks === undefined) continue;
    tryCatch(world, at, C.army_spread_week, news, -1, "army");
    if (weeks <= 1) carriers.delete(i);
    else carriers.set(i, weeks - 1);
  }
}

/** New outbreaks, rolled once a month: each province's yearly chance, by its crowding and shanty camps (PROV-352). */
function newOutbreaks(world: World, news: News[]): void {
  const chance = C.start_chance_year / 12;
  const rng = world.plagueRng;
  for (let p = 0; p < world.provinceCount; p++) {
    if (!held(world, p)) continue;
    // One draw for every land province, sick or not, so the draws stay in step.
    const roll = rng.next();
    if (roll < chance * catchWeight(world, p) && canCatch(world, p)) catchPlague(world, p, news, -1, "here");
  }
}

/** Sick provinces of realm n, for the overview. */
export function sickProvinces(world: World, n: number): number[] {
  return world.plagueSick.filter((p) => world.provinceOwner[p] === n);
}

// ---------------------------------------------------------------- saves

export interface SavedPlague {
  rng: number[];
  /** Sick provinces: province, step, weeks left, dead (thousands). */
  sick: [number, number, number, number][];
  /** Closed provinces. */
  closed: number[];
  /** Provinces spared and the day their plague burned out. */
  ended: [number, number][];
  /** Armies carrying plague: slot, weeks left. */
  carriers: [number, number][];
  /** Dead of a plague that burned out, shown until the next one: province, thousands. */
  dead: [number, number][];
  /** Sick provinces with physicians paid (EVT-130). */
  care?: number[];
}

export function savePlague(world: World): SavedPlague {
  const ended: [number, number][] = [];
  const closed: number[] = [];
  const dead: [number, number][] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (spared(world, p)) ended.push([p, world.provincePlagueEnded[p]!]);
    if (world.provinceQuarantine[p]) closed.push(p);
    if (world.provincePlague[p] === NONE && world.provincePlagueDead[p]! > 0) dead.push([p, world.provincePlagueDead[p]!]);
  }
  return {
    rng: Array.from(world.plagueRng.state),
    sick: world.plagueSick.map((p) => [p, world.provincePlague[p]!, world.provincePlagueWeeks[p]!, world.provincePlagueDead[p]!]),
    closed,
    ended,
    carriers: [...world.plagueCarriers],
    dead,
    care: world.plagueSick.filter((p) => world.provincePlagueCare[p]),
  };
}

/** Restores plague, mapping old province indexes; a save from before plague has none. */
export function restorePlague(world: World, s: SavedPlague | undefined, mapP: (old: number) => number): void {
  if (!s) return;
  world.plagueRng = new Rng(Uint32Array.from(s.rng));
  for (const [old, step, weeks, dead] of s.sick) {
    const p = mapP(old);
    if (p < 0 || world.provinceWater[p] || world.provincePlague[p]) continue;
    world.provincePlague[p] = step;
    world.provincePlagueWeeks[p] = weeks;
    world.provincePlagueDead[p] = dead;
  }
  for (const old of s.closed) {
    const p = mapP(old);
    if (p >= 0 && !world.provinceWater[p]) world.provinceQuarantine[p] = 1;
  }
  for (const [old, day] of s.ended) {
    const p = mapP(old);
    if (p >= 0) world.provincePlagueEnded[p] = day;
  }
  for (const [old, dead] of s.dead ?? []) {
    const p = mapP(old);
    if (p >= 0 && !world.provincePlague[p]) world.provincePlagueDead[p] = dead;
  }
  for (const old of s.care ?? []) {
    const p = mapP(old);
    if (p >= 0 && world.provincePlague[p]) world.provincePlagueCare[p] = 1;
  }
  world.plagueSick = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provincePlague[p]) world.plagueSick.push(p);
  world.plagueCarriers = new Map(s.carriers.filter(([slot]) => slot < world.armies.count && world.armies.alive[slot]));
}

/** Numbers for the world's hash. */
export function plagueHashData(world: World): ArrayBufferView[] {
  return [world.provincePlague, world.provincePlagueWeeks, world.provinceQuarantine, world.provincePlagueCare, world.provincePlagueDead, world.provincePlagueEnded, world.plagueRng.state, Int32Array.from([...world.plagueCarriers].flat())];
}
