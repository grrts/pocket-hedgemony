/**
 * Unlocking exploration (design §2, §2.1), exploration ships, where they may
 * sail (naval 7.2 as exploration reads it), colonial governor slots and
 * colonial range (design §4.2, §4.3).
 */
import { form, type FormId } from "../government/index.ts";
import { explorationConfig as cfg, regionData, type ExplorationShipType } from "./config.ts";

// ---------------------------------------------------------------------------
// Regions and the age gate

/** The macro region (event tree geography) a region or sub-region lies in. */
export function macroRegionOf(region: string): string | null {
  let at: string | null | undefined = region;
  const seen = new Set<string>();
  while (at && !seen.has(at)) {
    if (regionData.macro_regions.includes(at)) return at;
    seen.add(at);
    at = regionData.parents[at];
  }
  return null;
}

/** The macro region of a 1444 polity of the event tree (by its id), or null. */
export function polityRegion(id: string): string | null {
  const sub = regionData.polities_1444[id];
  return sub ? macroRegionOf(sub) : null;
}

/** The regions an age covers, from the event tree. */
export function ageRegions(age: string): string[] {
  const a = regionData.ages[age];
  if (!a) throw new Error(`unknown age ${age}`);
  return a.regions;
}

/**
 * Where the gating age has begun at some time. Once begun in a region the gate
 * stays open there, also after the age ends (EXPL-002).
 */
export interface AgeGate {
  age: string;
  begunIn: Set<string>;
}

export function newAgeGate(age: string = cfg.unlock_age): AgeGate {
  return { age, begunIn: new Set() };
}

/** The age begins: its gate opens in every region it covers that is asked for (all by default). */
export function ageBegins(gate: AgeGate, regions: readonly string[] = ageRegions(gate.age)): void {
  for (const r of regions) gate.begunIn.add(r);
}

/** The age ends: nothing closes (EXPL-002). */
export function ageEnds(_gate: AgeGate): void {}

/**
 * The age that opens the exploration gate in a region (D-EXPL-3): the gating
 * age where it covers the region, otherwise the first age that starts later
 * and covers it (north_america: age_of_atlantic_empires; middle_east and
 * central_asia: age_of_reformations). Null when no age ever covers it.
 */
export function gateAgeFor(region: string, gating: string = cfg.unlock_age): string | null {
  if (ageRegions(gating).includes(region)) return gating;
  const from = regionData.ages[gating]?.force_start ?? 0;
  const later = Object.entries(regionData.ages)
    .filter(([id, a]) => id !== gating && (a.force_start ?? Infinity) > from && a.regions.includes(region))
    .sort((a, b) => (a[1].force_start ?? Infinity) - (b[1].force_start ?? Infinity));
  return later[0]?.[0] ?? null;
}

/** Any age begins: the gate opens in each region it covers for which it is the opening age (EXPL-004, D-EXPL-3). */
export function anyAgeBegins(gate: AgeGate, age: string, regions: readonly string[] = ageRegions(age)): void {
  for (const r of regions) if (gateAgeFor(r, gate.age) === age) gate.begunIn.add(r);
}

/** The 1444 start: the Age of Exploration starts in 1444 (its force_start) in all its regions. */
export function gateAtStart(year: number): AgeGate {
  const gate = newAgeGate();
  const start = regionData.ages[gate.age]?.force_start;
  if (start !== null && start !== undefined && year >= start) ageBegins(gate);
  return gate;
}

// ---------------------------------------------------------------------------
// The unlock

export interface Explorer {
  knows: ReadonlySet<string>;
  /** Macro region of the country (event tree geography). */
  region: string;
}

/** S4 or S3 known, and the configured age has begun in the country's region (EXPL-001, EXPL-003). */
export function hasExplorationUnlock(c: Explorer, gate: AgeGate): boolean {
  return cfg.unlock_inventions.some((i) => c.knows.has(i)) && gate.begunIn.has(c.region);
}

/** The exploration ships a country's research gives: caravel with S4, voyaging canoe with S3 (EXPL-007). */
export function explorationShipsKnown(knows: ReadonlySet<string>): ExplorationShipType[] {
  return (Object.entries(cfg.naval.exploration_ships) as [ExplorationShipType, { invention: string }][])
    .filter(([, s]) => knows.has(s.invention))
    .map(([t]) => t);
}

export function isExplorationShip(type: string): type is ExplorationShipType {
  return Object.hasOwn(cfg.naval.exploration_ships, type);
}

export type BuyRefusal = "no_exploration_unlock" | "unknown_invention";

/** Exploration ships need the unlock and their own invention (EXPL-005). Other ships are naval's business. */
export function mayBuyShip(c: Explorer, gate: AgeGate, type: string): { ok: true } | { ok: false; reason: BuyRefusal } {
  if (!isExplorationShip(type)) return { ok: true };
  if (!hasExplorationUnlock(c, gate)) return { ok: false, reason: "no_exploration_unlock" };
  if (!c.knows.has(cfg.naval.exploration_ships[type].invention)) return { ok: false, reason: "unknown_invention" };
  return { ok: true };
}

/** The voyaging canoe's row (naval 3.3): crew, gold, timber, months, supply and colony stores. */
export function voyagingCanoe(): { crew: number; gold: number; timber: number; months: number; supply: number; stores: number; needsHarbour: boolean } {
  const c = cfg.naval.exploration_ships.voyaging_canoe;
  return { crew: c.crew, gold: c.gold, timber: c.timber, months: c.months, supply: c.supply, stores: cfg.colony_stores.voyaging_canoe, needsHarbour: c.needs_harbour };
}

/** Whether a voyaging canoe can be ordered on a shore: S3 known and seafolk there; no harbour needed (EXPL-007). */
export function mayBuildVoyagingCanoe(knows: ReadonlySet<string>, shore: { seafolk: boolean }): boolean {
  return knows.has(cfg.s3_invention) && shore.seafolk;
}

// ---------------------------------------------------------------------------
// Where a ship may sail (naval 7.2; EXPL-006, EXPL-008)

export interface WaterZone {
  kind: "sea" | "ocean";
  /** Zones from the nearest coast (0 for coastal sea). */
  zonesFromCoast: number;
}

export function maySail(knows: ReadonlySet<string>, ship: string, zone: WaterZone): boolean {
  if (zone.kind === "sea") return true;
  if (ship === "voyaging_canoe") return true;
  const r = cfg.naval.reach;
  if (knows.has(r.any_ocean_with)) return true;
  if (knows.has(r.ocean_with)) return zone.zonesFromCoast <= r.ocean_within_zones_of_coast;
  return false;
}

// ---------------------------------------------------------------------------
// Colonial governors and range

/** Whether the country may hire colonial governors: S5, or S3 (EXPL-024, EXPL-009). */
export function hasColonialUnlock(knows: ReadonlySet<string>): boolean {
  return knows.has(cfg.colonial_unlock_invention) || knows.has(cfg.s3_invention);
}

/**
 * Colonial governor slots from research: a base of 2 with S5, else 1 with S3;
 * T8 and T9 each add 1 to any base (EXPL-026, EXPL-009, D-EXPL-4). Research is
 * never lost, so slots are never lost.
 */
export function governorSlots(knows: ReadonlySet<string>): number {
  const s = cfg.governor_slots as Record<string, number>;
  const base = knows.has(cfg.colonial_unlock_invention) ? s[cfg.colonial_unlock_invention]! : knows.has(cfg.s3_invention) ? s[cfg.s3_invention]! : 0;
  if (base === 0) return 0;
  let n = base;
  for (const extra of ["T8", "T9"]) if (knows.has(extra)) n += s[extra]!;
  return n;
}

/** Colonial range in sea zones: the government form's, at least 10 for S3 realms (EXPL-031, EXPL-009). */
export function colonialRange(formId: FormId, knows: ReadonlySet<string>): number {
  const byForm = form(formId).colonialRange;
  return knows.has(cfg.s3_invention) ? Math.max(byForm, cfg.s3_min_range) : byForm;
}

/** Whether a coast this many zones from the nearest port or colony lies in range (EXPL-032). */
export function inColonialRange(zonesToNearest: number, range: number): boolean {
  return zonesToNearest <= range;
}
