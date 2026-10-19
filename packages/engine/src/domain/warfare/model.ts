import config from "../../../../rules/data/domain/warfare.json" with { type: "json" };
import { eraOf as researchEraOf, type Era as ResearchEra } from "../research/index.ts";

/**
 * Warfare (domain/warfare/spec.md): the shared model. Companies of one kind
 * and one arm, armies under one commander, the realm's soldier stats. All
 * rates live in rules/data/domain/warfare.json (WAR-199). State is plain data
 * the caller owns; dice are rolled only through an Rng the caller hands in.
 */

export type WarfareConfig = typeof config;
export const warfareConfig: WarfareConfig = config;
export const W = config;

/** Research eras in scope: era VIII is out of scope for the campaign. */
export type Era = Exclude<ResearchEra, "VIII">;
/** Eras I to VII in scope (era VIII is out of scope for the campaign). */
export const ERAS: readonly Era[] = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const eraIndex = (e: Era): number => ERAS.indexOf(e);
/** The research era of a year (eras I from the start, 1378 at the earliest, … VII 1914). */
export const eraOfYear = (year: number): Era => {
  const e = researchEraOf({ year });
  return e === "VIII" ? "VII" : e;
};

export type Kind = "levy" | "retinue" | "hired company" | "standing regiment" | "garrison" | "rebel band";
export const KINDS = Object.keys(config.kinds) as Kind[];
export type Role = "Line" | "Brace" | "Shock" | "Shot" | "Light" | "Heavy" | "Guns" | "Air";
export type ArmName = keyof typeof config.arms;
export const ARMS = Object.keys(config.arms) as ArmName[];

export interface ArmNeeds {
  arms?: number;
  powder?: number;
  powder_per?: string;
  horses?: number;
  remounts?: number;
  camels?: number;
  crew?: number;
  oxen_instead?: boolean;
  elephants?: string;
}

export interface ArmDef {
  label?: string;
  strength: number;
  strength_with?: Record<string, number>;
  unit: "man" | "gun";
  needs: ArmNeeds;
  roles: Role[];
  unlock: string;
  next_down?: string;
  foot?: boolean;
  horse?: boolean;
  rider?: boolean;
  spears?: boolean;
  shoots?: string;
  start_regions?: string[];
  no_desert_penalty?: boolean;
  men_per_animal?: number;
  ground?: Record<string, number>;
  panic?: number;
  siege_shot?: number;
  shock_against_broken?: boolean;
}

export function armDef(arm: string): ArmDef {
  const a = (config.arms as Record<string, ArmDef>)[arm];
  if (!a) throw new Error(`unknown arm ${arm}`);
  return a;
}

/** The inventions a realm knows, by id ("W2", "B7"). */
export type Known = ReadonlySet<string>;
export const knows = (known: Known | undefined, id: string): boolean => known?.has(id) ?? false;
/** "W6 Pike squares" → "W6". */
export const inventionId = (text: string): string => text.trim().split(/\s+/)[0]!;

/** A company (WAR-001): one kind, one arm, its own counts. */
export interface Company {
  id: string;
  kind: Kind;
  arm: string;
  men: number;
  /** Months trained together (0 to drill_max). */
  drill: number;
  /** Battles stood through without breaking (0 to scars_max; diluted scars may be fractional). */
  scars: number;
  /** Loads of arms carried. */
  arms: number;
  payOwed: number;
  monthsOut: number;
  home?: string;
  /** The lord whose retinue this is. */
  lord?: string;
  /** Levels lost to re-arming or a new invention, until the Drilled months are drilled again (WAR-151, WAR-154). */
  levelDrop?: { levels: number; drillSince: number };
  /** A level the company never falls below (era I knights start at level 3, WAR-153). */
  startLevel?: number;
  /** Years since its last battle (WAR-007). */
  yearsWithoutBattle?: number;
  hungry?: boolean;
  /** Prisoners enlisted as a hired company fight at level 1 (WAR-132). */
  fixedLevel?: number;
}

let nextId = 0;
export function newCompany(init: Partial<Company> & { kind: Kind; arm: string; men: number }): Company {
  armDef(init.arm);
  return { id: init.id ?? `c${++nextId}`, drill: 0, scars: 0, arms: 0, payOwed: 0, monthsOut: 0, ...init };
}

/** Standing orders (WAR-134, WAR-077): retreat ratio, attack or wait, reserve size. */
export interface StandingOrders {
  /** Retreat when the enemy outnumbers by this ratio; null = never. */
  retreat: number | null;
  attack: boolean;
  reserveSize: 1 | 2 | 3;
}

export interface Commander {
  name: string;
  country?: string;
  might: number;
  cunning: number;
  logistics: number;
  styles: string[];
  traits: string[];
  victories: number;
  defeats: number;
  wounds: number;
  age: number;
  origin?: string;
  /** Battles fought in an adopted style so far (WAR-143). */
  battlesInStyle?: Record<string, number>;
}

export function newCommander(name: string, init: Partial<Commander> = {}): Commander {
  return { name, might: 0, cunning: 0, logistics: 0, styles: [], traits: [], victories: 0, defeats: 0, wounds: 0, age: 30, ...init };
}

export interface Army {
  id: string;
  owner: string;
  companies: Company[];
  commander?: Commander;
  captains: Commander[];
  /** Rations in the wagons. */
  reserve: number;
  wagons: number;
  horses: number;
  prisoners: number;
  orders: StandingOrders;
  /** Orders the player set himself; otherwise the commander's trait sets them (WAR-060). */
  ordersSetByPlayer?: boolean;
  place?: string;
  march?: "Normal" | "Forced" | "Careful" | "Raid";
}

export function newArmy(id: string, owner: string, companies: Company[] = [], init: Partial<Army> = {}): Army {
  return { id, owner, companies, captains: [], reserve: 0, wagons: 0, horses: 0, prisoners: 0, orders: { retreat: null, attack: false, reserveSize: 2 }, ...init };
}

export const armyMen = (a: Army): number => a.companies.reduce((s, c) => s + c.men, 0);

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
