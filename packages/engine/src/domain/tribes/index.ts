import config from "../../../../rules/data/domain/tribes.json" with { type: "json" };
import report from "../../../../rules/data/domain/scenario-setup-report.json" with { type: "json" };
import { allRecords, type CatalogueRow } from "../scenario-setup/catalogue.ts";

/**
 * Tribes (TRIBE, domain/tribes/spec.md): which realms are tribal realms, and
 * the rules of their hunting grounds, unowned provinces a tribe walks. Pure
 * and deterministic: the engine (tribes.ts) gives it the world's facts, a
 * province's owner, people and neighbours, and keeps the ranges. Dates are
 * month numbers (year × 12 + month − 1). Numbers come from
 * rules/data/domain/tribes.json.
 */

export const tribesConfig = config;
const C = config;

export type AggressionLevel = "Peaceful" | "Wary" | "Hostile" | "Fierce";

/** A month number: year × 12 + month − 1, so 1 March 1446 and 1 June 1446 lie 3 apart. */
export const monthNumber = (year: number, month: number): number => year * 12 + month - 1;
export const monthYear = (m: number): { year: number; month: number } => ({ year: Math.floor(m / 12), month: (m % 12) + 1 });

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "1 June 1446": the 1st of a month number, as the cards write it. */
export function monthText(m: number): string {
  const { year, month } = monthYear(m);
  return `1 ${MONTHS[month - 1]} ${year}`;
}

// ---------------------------------------------------------------- tribal realms (TRIBE-001)

/** A form that walks hunting grounds: clan council, chiefdom or confederation. */
export const isTribalForm = (form: string): boolean => C.tribal_forms.includes(form);

/** Whether a place (longitude, latitude) lies in a region of `tribes.regions`. */
export function inTribalRegion(lon: number, lat: number): boolean {
  const bounds = C.region_bounds as Record<string, { west: number; east: number; south: number; north: number }>;
  return C.regions.some((r) => {
    const b = bounds[r];
    return !!b && lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
  });
}

/** TRIBE-001: a tribal form with its capital in a tribal region. */
export const isTribalRealm = (form: string, capitalLon: number, capitalLat: number): boolean => isTribalForm(form) && inTribalRegion(capitalLon, capitalLat);

/** TRIBE-006: hunting grounds the form may hold (0 for a form that is not tribal). */
export function rangeSize(form: string): number {
  return (C.range_size as Record<string, number>)[form] ?? 0;
}

// ---------------------------------------------------------------- claiming and leaving (TRIBE-008 to TRIBE-010)

/** What the claim rules read of a realm and one province. */
export interface ClaimFacts {
  tribal: boolean;
  /** Grounds held and the range size. */
  held: number;
  size: number;
  claimUnderWay: boolean;
  water: boolean;
  owned: boolean;
  /** The name of the realm whose ground it is ("the Creek"), or null. */
  groundOf: string | null;
  /** True when it is this realm's own ground already. */
  ownGround: boolean;
  colony: boolean;
  /** Touches, by land, the realm's land or one of its grounds. */
  touches: boolean;
  /** Month before which the realm may not claim it again (it left it, or gave it up), or null. */
  barredUntil: number | null;
  now: number;
}

/** Why the realm may not claim the province, in the card's words, or null (TRIBE-008, TRIBE-010, TRIBE-024). */
export function whyNotClaim(f: ClaimFacts): string | null {
  if (!f.tribal) return "only a tribal realm walks hunting grounds";
  if (f.water) return "that is the sea";
  if (f.owned) return "the province is owned";
  if (f.ownGround) return "it is your ground already";
  if (f.groundOf) return `it is ${f.groundOf}'s ground`;
  if (f.colony) return "a colony is being founded there";
  if (!f.touches) return "the province is not next to it";
  if (f.held >= f.size) return "no free place";
  if (f.claimUnderWay) return "a claim is under way";
  if (f.barredUntil !== null && f.now < f.barredUntil) return `not before ${monthText(f.barredUntil)}`;
  return null;
}

/** TRIBE-009: the month a claim made now becomes a ground. */
export const claimEnds = (now: number): number => now + C.claim_months;
/** TRIBE-010: the month before which a ground left now may not be claimed again. */
export const reclaimFrom = (now: number): number => now + C.reclaim_years * 12;
/** TRIBE-024: the same for a ground given up for gold. */
export const givenReclaimFrom = (now: number): number => now + C.given_reclaim_years * 12;

// ---------------------------------------------------------------- the start (TRIBE-007)

/** What the start reads: each tribal realm in nation order with its range size and land. */
export interface StartRealm {
  realm: number;
  size: number;
  land: readonly number[];
}

/**
 * TRIBE-007: each realm in turn walks out from its land one province at a
 * time, always onto the free unowned land province touching its land or its
 * grounds with the most people (lowest index on a tie), until its range is
 * full or nothing is left; a province an earlier realm took is skipped.
 */
export function startRanges(realms: readonly StartRealm[], neighbours: (p: number) => readonly number[], free: (p: number) => boolean, people: (p: number) => number): Map<number, number[]> {
  const taken = new Set<number>();
  const out = new Map<number, number[]>();
  for (const r of realms) {
    const grounds: number[] = [];
    const walked = new Set<number>(r.land);
    while (grounds.length < r.size) {
      let best = -1;
      for (const from of walked) {
        for (const q of neighbours(from)) {
          if (walked.has(q) || taken.has(q) || !free(q)) continue;
          if (best < 0 || people(q) > people(best) || (people(q) === people(best) && q < best)) best = q;
        }
      }
      if (best < 0) break;
      grounds.push(best);
      walked.add(best);
      taken.add(best);
    }
    out.set(r.realm, grounds);
  }
  return out;
}

/** TRIBE-031: the AI's claim, the province it may claim with the most people, lowest index on a tie. */
export function aiClaimPick(candidates: readonly { province: number; people: number }[]): number {
  let best: { province: number; people: number } | null = null;
  for (const c of candidates) if (!best || c.people > best.people || (c.people === best.people && c.province < best.province)) best = c;
  return best ? best.province : -1;
}

// ---------------------------------------------------------------- what a ground gives (TRIBE-014)

/** Gold a month from the furs and hides of n grounds. */
export const fursGold = (grounds: number): number => grounds * C.furs_gold;

// ---------------------------------------------------------------- taking in (TRIBE-018)

export interface TakeInFacts {
  heldMonths: number;
  atWar: boolean;
  colony: boolean;
}

/** Why the realm may not take the ground in now, in the card's words, or null. */
export function whyNotTakeIn(f: TakeInFacts): string | null {
  const years = Math.floor(f.heldMonths / 12);
  if (years < C.take_in_years) return `held ${years} of ${C.take_in_years} years`;
  if (f.atWar) return "not while at war";
  if (f.colony) return "a colony is being founded";
  return null;
}

// ---------------------------------------------------------------- settlers on our land (TRIBE-021, TRIBE-022)

const STEPS: AggressionLevel[] = ["Peaceful", "Wary", "Hostile", "Fierce"];

/** TRIBE-021: the locals one step fiercer on a tribe's ground (Fierce stays Fierce). */
export function fiercer(level: AggressionLevel): AggressionLevel {
  return STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(level) + 1)]!;
}

export const SETTLERS_WRONG = "Settlers on our land";

// ---------------------------------------------------------------- asking for the land (TRIBE-023 to TRIBE-025)

export interface LandAskFacts {
  gold: number;
  /** The tribe's standing toward the asker. */
  standing: number;
  settlersHeld: boolean;
  hostile: boolean;
  /** Grounds the tribe holds now, the asked one among them. */
  grounds: number;
}

export interface LandReason {
  name: string;
  number: number;
}

/** The asking price the AI offers and the player starts at (TRIBE-023). */
export const landPrice = (): number => C.land_price;

/**
 * TRIBE-025: the tribe's reasons count when asked for a ground: the gold
 * offered (more is a stronger yes), its standing toward the asker, the wrong
 * Settlers on our land held against it, a Hostile stance, and how many
 * grounds it would have left (giving up its last is a strong no). A yes when
 * the total is above zero.
 */
export function landAskCount(f: LandAskFacts): { reasons: LandReason[]; total: number; yes: boolean } {
  const A = C.ask;
  const reasons: LandReason[] = [{ name: "Base (ask for the land)", number: A.base }];
  reasons.push({ name: "Gold offered", number: Math.min(A.gold_max, Math.round(f.gold * A.per_gold)) });
  reasons.push({ name: "Standing / 4", number: Math.trunc(f.standing / A.standing_divisor) });
  if (f.settlersHeld) reasons.push({ name: SETTLERS_WRONG, number: A.settlers_held });
  if (f.hostile) reasons.push({ name: "Hostile toward them", number: A.hostile });
  const left = f.grounds - 1;
  if (left <= 0) reasons.push({ name: "Our last hunting ground", number: A.last_ground });
  else if (left === 1) reasons.push({ name: "Only one ground would be left", number: A.one_ground_left });
  const total = reasons.reduce((s, r) => s + r.number, 0);
  return { reasons, total, yes: total > 0 };
}

/** TRIBE-033: the AI asks first only while it holds the price twice over. */
export const aiMayAsk = (gold: number): boolean => gold >= C.land_price * C.ai.ask_when_gold_times;
export * from "./screens.ts";

// ---------------------------------------------------------------- new tribes on the 1444 map (TRIBE-002 to TRIBE-005)
// The map build places them (tools/mapgen, the start scenario's map-nations.json `grows`); these read the same config and the build's report.

/** TRIBE-001 by catalogue region: a tribal form whose record lies in a tribal region. */
export const isTribalRealmIn = (form: string, region: string): boolean => isTribalForm(form) && C.regions.includes(region);

/** Records the new-tribe rule looks at, and the ones it leaves out as not of 1444 or already on the map (TRIBE-002, D-TRIBE-2). */
export function newTribeRecords(): CatalogueRow[] {
  const leftOut = C.new_tribes_left_out as Record<string, string>;
  return allRecords().filter((r) => C.new_tribe_regions.includes(r.region) && C.new_tribe_representations.includes(r.representation) && !Object.hasOwn(leftOut, r.id));
}

/** Provinces a new tribe starts with, by catalogue tier (TRIBE-003). */
export function newTribeProvinces(tier: string): number {
  return (C.new_tribe_provinces as Record<string, number>)[tier] ?? 1;
}

/** Added realms the map build left as reference data, with the province and realm that held their capital (SETUP-064, TRIBE-004). */
export function leftOutAtBuild(): { id: string; capital: string; owner: string }[] {
  return report.left_out;
}

/** Each added realm's wanted and built size (SETUP-063, TRIBE-003). */
export function grownAtBuild(): Record<string, { wanted: number; got: number }> {
  return report.grown;
}
