/**
 * The country catalogue as the source of 1444 entities (spec §5.1): compact
 * rows generated from country-catalogue/build into
 * packages/rules/data/domain/scenario-setup-catalogue.json, and the inclusion,
 * id and edge-storage rules of the catalogue README.
 */
import data from "../../../../rules/data/domain/scenario-setup-catalogue.json" with { type: "json" };
import config from "../../../../rules/data/domain/scenario-setup.json" with { type: "json" };

export const setupConfig = config;

export type Level = "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown";
export type Confidence = "low" | "medium" | "high";

export interface Assessment {
  level: Level;
  confidence: Confidence;
}

export interface CatalogueRow {
  id: string;
  name: string;
  region: string;
  tier: string;
  representation: string;
  confidence: Confidence;
  assessments: Record<string, Assessment>;
  /** Every assessment carries a justification. */
  justified: boolean;
  expansionModes: string[];
  stateFaith: string | null;
  peopleMajority: string | null;
}

const rows = data.records as Record<string, string>;

function parse(id: string, raw: string): CatalogueRow {
  const [name, region, tier, representation, confidence, assessments, modes, state, majority] = raw.split("|") as [string, string, string, string, string, string, string, string, string];
  const n = data.dimensions.length;
  const levels = data.level_codes as Record<string, Level>;
  const confs = data.confidence_codes as Record<string, Confidence>;
  return {
    id,
    name,
    region,
    tier,
    representation,
    confidence: confidence as Confidence,
    assessments: Object.fromEntries(data.dimensions.map((d, i) => [d, { level: levels[assessments[i]!]!, confidence: confs[assessments[n + i]!]! }])),
    justified: assessments[2 * n] === "j",
    expansionModes: modes ? modes.split(",") : [],
    stateFaith: state || null,
    peopleMajority: majority || null,
  };
}

/** One catalogue record by id. */
export function catalogueRecord(id: string): CatalogueRow {
  const raw = rows[id];
  if (raw === undefined) throw new Error(`no catalogue record ${id}`);
  return parse(id, raw);
}

export function hasRecord(id: string): boolean {
  return Object.hasOwn(rows, id);
}

export function catalogueIds(): string[] {
  return Object.keys(rows);
}

export function allRecords(): CatalogueRow[] {
  return Object.entries(rows).map(([id, raw]) => parse(id, raw));
}

/** Records counted by representation (SETUP-011). */
export function countByRepresentation(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const raw of Object.values(rows)) {
    const mode = raw.split("|")[3]!;
    out[mode] = (out[mode] ?? 0) + 1;
  }
  return out;
}

/** Records counted by region. */
export function regionCount(): number {
  return new Set(Object.values(rows).map((r) => r.split("|")[1])).size;
}

export const catalogueTotals = data.totals;

/** The reference day the catalogue describes (SETUP-001). */
export const REFERENCE_DAY = config.reference_day;

/** Records whose 1444 status has been checked against the reference day. */
export function checkedFor1444(id: string): boolean {
  return hasRecord(id) && !(data.records_without_1444_check as string[]).includes(id);
}

/** Every numeric field in the catalogue is a date or a sourced population range: no game statistics (SETUP-001, INV-SETUP-3). */
export function numericGameStatistics(): string[] {
  return data.numeric_paths.filter((p) => !config.catalogue.allowed_numeric_fields.includes(p));
}

/** Records carrying a commercial game's tag (SETUP-013): none. */
export function recordsWithCommercialTags(): string[] {
  return [...(data.eu4_tags_set as string[])];
}

// ---------------------------------------------------------------------------
// Inclusion (SETUP-002 … SETUP-006)

export type Inclusion = "included" | "included_disputed" | "excluded_anachronistic" | "excluded_not_distinct" | "merged_into_other";

/** The date test: it existed in the 1440s with the identity recorded (SETUP-002). */
export function dateTest(founded: number, ended: number | null = null): Inclusion {
  const [from, to] = config.catalogue.date_test_decade as [number, number];
  if (founded > to || (ended !== null && ended < from)) return "excluded_anachronistic";
  return "included";
}

/** The agency test: subordinate entities enter when their own politics mattered (SETUP-003). */
export function agencyTest(e: { ownPolitics: boolean; mergedInto?: string }): Inclusion {
  if (e.ownPolitics) return "included";
  return e.mergedInto ? "merged_into_other" : "excluded_not_distinct";
}

/** Disputed existence or classification is kept as disputed, never resolved silently (SETUP-006). */
export function disputedInclusion(): Inclusion {
  return "included_disputed";
}

export interface InventoryEntry {
  id: string;
  name: string;
  inclusion: string;
  /** The inventory says why. */
  noted: boolean;
  aliases: string[];
}

/** Inventory entities that are not plainly included, by id or English name. */
export function inventoryEntry(idOrName: string): InventoryEntry | undefined {
  const row = (data.not_included as [string, string, string, number, string[]][]).find((r) => r[0] === idOrName || r[1] === idOrName || r[1].startsWith(`${idOrName} `));
  return row && { id: row[0], name: row[1], inclusion: row[2], noted: row[3] === 1, aliases: row[4] };
}

export function inventoryByInclusion(inclusion: string): InventoryEntry[] {
  return (data.not_included as [string, string, string, number, string[]][]).filter((r) => r[2] === inclusion).map((r) => ({ id: r[0], name: r[1], inclusion: r[2], noted: r[3] === 1, aliases: r[4] }));
}

/** The catalogue's own text on a group record (SETUP-004). */
export function groupRecordText(id: string): string {
  const t = (data.group_notes as Record<string, string>)[id];
  if (t === undefined) throw new Error(`${id} is not a group record`);
  return t;
}

/** Whether a record's representation keeps a society without a state as one (SETUP-005). */
export function isStatelessRepresentation(representation: string): boolean {
  return config.catalogue.stateless_representations.includes(representation);
}

// ---------------------------------------------------------------------------
// Ids (SETUP-007)

/** The catalogue's ids with the inventory aliases of renamed seed ids. */
export interface IdRegistry {
  ids: Set<string>;
  aliases: Map<string, string>;
}

export function idRegistry(ids: Iterable<string> = catalogueIds()): IdRegistry {
  return { ids: new Set(ids), aliases: new Map() };
}

/** Renames a record: the old id goes into the inventory aliases and is never used again. */
export function renameRecord(r: IdRegistry, from: string, to: string): void {
  if (!r.ids.has(from)) throw new Error(`no record ${from}`);
  if (!mayUseId(r, to)) throw new Error(`id ${to} is taken`);
  r.ids.delete(from);
  r.ids.add(to);
  r.aliases.set(from, to);
}

/** A new id must be snake_case and neither in use nor an alias (INV-SETUP-1). */
export function mayUseId(r: IdRegistry, id: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(id) && !r.ids.has(id) && !r.aliases.has(id);
}

// ---------------------------------------------------------------------------
// Relationship edges (SETUP-008)

/** Which party's region stores an edge: the subordinate b for hierarchical edges, a for symmetric ones. */
export function edgeStoredWith(kind: string, a: string, b: string): string {
  if (config.catalogue.edges.hierarchical.includes(kind)) return b;
  if (config.catalogue.edges.symmetric.includes(kind)) return a;
  throw new Error(`unknown edge kind ${kind}`);
}

// ---------------------------------------------------------------------------
// Assessments (SETUP-009, SETUP-010)

export type Scale = "global" | "relative" | "risk";

export function assessmentScale(dimension: string): Scale {
  for (const [scale, dims] of Object.entries(config.catalogue.assessment_scales)) if (dims.includes(dimension)) return scale as Scale;
  throw new Error(`unknown dimension ${dimension}`);
}

export const ASSESSMENT_LEVELS = config.catalogue.assessment_levels as Level[];
export const ASSESSMENT_DIMENSIONS = data.dimensions;

/** The AI personality fields every record holds (SETUP-012). */
export const PERSONALITY_KEYS = data.personality_keys;
