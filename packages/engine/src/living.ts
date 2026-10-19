import type { World } from "./world.ts";
import { birthRate, deathModifiers, deathRate } from "./domain/province/people.ts";
import { CLASSES, provinceConfig, type ClassName } from "./domain/province/model.ts";
import type { News } from "./war.ts";
import { heritageFactor } from "./heritage.ts";

/**
 * A living realm (milestone 3): each province's people by class, born and
 * dying month by month at the province context's rates, and the calendar's
 * seasonal and yearly steps.
 */

/** The province context's classes, in order (CLASSES): farmers to homeless. */
export const CLASS_NAMES: readonly ClassName[] = CLASSES;
export const CLASS_COUNT = CLASS_NAMES.length;
export const classIndex = (c: ClassName): number => CLASS_NAMES.indexOf(c);

export interface LivingState {
  /** People of each class in each province, in thousands: CLASS_COUNT per province. */
  provinceClasses: Float32Array;
}

export function createLivingState(P: number): LivingState {
  return { provinceClasses: new Float32Array(P * CLASS_COUNT) };
}

/** The class mix a province starts with, from its ground, coast and wealth (defines.living). */
export function startingMix(world: World, p: number): Float32Array {
  const d = world.rules.defines.living;
  const def = world.rules.provinces[p]!;
  const mix = new Float32Array(CLASS_COUNT);
  const town = Math.min(d.townShareMax, d.townShareBase + d.townSharePerWealth * Math.max(0, def.wealth - 1));
  const country = 1 - town - d.homelessShare;
  const seafolk = def.coastal ? d.coastalSeafolk : 0;
  const ground = d.countryMix[def.terrain] ?? d.countryMix["grassland"]!;
  for (const [c, share] of Object.entries(ground)) mix[classIndex(c as ClassName)]! += share * country * (1 - seafolk);
  mix[classIndex("seafolk")]! += country * seafolk;
  for (const [c, share] of Object.entries(d.townMix)) mix[classIndex(c as ClassName)]! += share * town;
  mix[classIndex("homeless")]! += d.homelessShare;
  return mix;
}

/** Splits every land province's people into classes. */
export function seedClasses(world: World): void {
  const cls = world.provinceClasses;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    const mix = startingMix(world, p);
    const people = world.provincePopulation[p]!;
    for (let c = 0; c < CLASS_COUNT; c++) cls[p * CLASS_COUNT + c] = people * mix[c]!;
  }
}

/** Sets a province's classes to a mix (its own when null) scaled to its people. */
export function rescaleClasses(world: World, p: number, mix: ArrayLike<number> | null): void {
  const row = world.provinceClasses.subarray(p * CLASS_COUNT, (p + 1) * CLASS_COUNT);
  if (mix) row.set(mix);
  let sum = 0;
  for (let c = 0; c < CLASS_COUNT; c++) sum += row[c]!;
  const people = world.provincePopulation[p]!;
  // Only when the people no longer match their classes (a renamed province, an older save).
  if (sum <= 0 || Math.abs(sum - people) <= 1e-4 * people) return;
  for (let c = 0; c < CLASS_COUNT; c++) row[c] = (row[c]! / sum) * people;
}

/** People of one class in a province, in thousands. */
export function classPeople(world: World, p: number, c: ClassName): number {
  return world.provinceClasses[p * CLASS_COUNT + classIndex(c)]!;
}

/** A province's people by class name, in thousands. */
export function classesOf(world: World, p: number): Record<ClassName, number> {
  const out = {} as Record<ClassName, number>;
  CLASS_NAMES.forEach((c, k) => (out[c] = world.provinceClasses[p * CLASS_COUNT + k]!));
  return out;
}

/**
 * Takes `men` dead soldiers from a province's people: a levy takes every class by its share (X-7),
 * so its dead come from every class by its share too (WAR-226). Returns the people taken, in thousands.
 */
export function takePeople(world: World, p: number, men: number): number {
  const people = world.provincePopulation[p]!;
  if (!(men > 0) || !(people > 0)) return 0;
  const taken = Math.min(people, men / 1000);
  const keep = 1 - taken / people;
  const cls = world.provinceClasses;
  for (let c = 0; c < CLASS_COUNT; c++) cls[p * CLASS_COUNT + c] = cls[p * CLASS_COUNT + c]! * keep;
  world.provincePopulation[p] = people - taken;
  return taken;
}

/** Yearly birth and death rates per class (province context PROV-100, PROV-103; clergy don't marry). */
const BIRTHS = CLASS_NAMES.map((c) => birthRate(c));
const DEATHS = CLASS_NAMES.map((c) => deathRate(c));
/** Births plague takes off the yearly rate, as a share (decided.birth_points.plague, in percentage points). */
const PLAGUE_BIRTHS = -provinceConfig.decided.birth_points.plague / 100;

/** A province is at war while an enemy holds it, besieges it or fights in it (province: war deaths, PROV-102). */
function atWar(world: World, p: number, fighting: Uint8Array): boolean {
  return world.provinceOccupier[p]! >= 0 || world.sieges.has(p) || fighting[p] === 1;
}

/**
 * The monthly people step (province §9, step 1): each class gains a twelfth of
 * its yearly births and loses a twelfth of its yearly deaths; war adds deaths.
 * The province's people are then the sum of its classes.
 */
export function monthlyPeople(world: World, _news: News[]): void {
  const cls = world.provinceClasses;
  const fighting = new Uint8Array(world.provinceCount);
  for (const b of world.battles) fighting[b.province] = 1;
  const war = deathModifiers({ war: true });
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceWater[p]) continue;
    // Plague lowers births while it is here (PROV-101); its deaths come each plague week (plague.ts).
    const extra = (atWar(world, p, fighting) ? war.everyone : 0) + (world.provincePlague[p] ? PLAGUE_BIRTHS : 0);
    // Heritage speeds or slows growth (growth_pct), never a decline.
    const growth = heritageFactor(world, world.provinceOwner[p]!, "growth_pct");
    let total = 0;
    for (let c = 0; c < CLASS_COUNT; c++) {
      const i = p * CLASS_COUNT + c;
      const net = BIRTHS[c]! - DEATHS[c]! - extra;
      const rate = net > 0 ? net * growth : net;
      cls[i] = Math.max(0, cls[i]! * (1 + rate / 12));
      total += cls[i]!;
    }
    world.provincePopulation[p] = total;
  }
}

/** Hemisphere of a province from its latitude (time-and-turns seasons). */
export function southern(world: World, p: number): boolean {
  return world.provincePlace[p]!.lat < 0;
}

/** The season that begins this month in the north (spring 3, summer 6, autumn 9, winter 12), or null. */
export function seasonBeginning(month: number): number | null {
  return month % 3 === 0 ? month : null;
}
