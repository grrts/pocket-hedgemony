/**
 * The starting world (spec §5.2–5.4): start forms of government, countries'
 * starting relations, traders, faiths, lords and exploration, and the
 * province start values other contexts own the rules of.
 */
import { assignStartForm, startLords, startRecords1444, type CatalogueRecord, type FormId, type StartRule } from "../government/index.ts";
import governmentConfig from "../../../../rules/data/domain/government.json" with { type: "json" };
import { dataset1444 } from "../diplomacy/index.ts";
import { invention } from "../research/index.ts";
import { startingKinds, startingTraderCount, type TraderKind } from "../trade/index.ts";
import { gateAtStart, hasExplorationUnlock, polityRegion } from "../exploration/index.ts";
import config from "../../../../rules/data/domain/scenario-setup.json" with { type: "json" };
import { catalogueRecord, hasRecord, type Confidence, type Level } from "./catalogue.ts";
import type { Rng } from "../../rng.ts";
import { START_YEAR } from "../../../../rules/src/start.ts";

// ---------------------------------------------------------------------------
// Start forms (SETUP-014 … SETUP-019)

export interface StartFormOverride {
  form: string;
  why: string;
}

export const START_FORM_OVERRIDES = governmentConfig.start_forms.overrides as Record<string, StartFormOverride>;

/** The 963 records as the start-form rules read them. */
export function startFormRecords(): CatalogueRecord[] {
  return startRecords1444();
}

export function startFormRecord(id: string): CatalogueRecord {
  const r = startRecords1444().find((x) => x.id === id);
  if (!r) throw new Error(`no catalogue record ${id}`);
  return r;
}

/** A record's start form by the rules in order: override, text, kingdom by region, entity type, default. */
export function startForm(r: CatalogueRecord, overrides: Readonly<Record<string, StartFormOverride>> = START_FORM_OVERRIDES): { form: FormId; rule: StartRule; why?: string } {
  const o = overrides[r.id];
  if (o) return { form: o.form as FormId, rule: "override", why: o.why };
  // Government's rules, without an override the edited config has removed.
  const out = assignStartForm(Object.hasOwn(START_FORM_OVERRIDES, r.id) ? { ...r, id: `${r.id}#no_override` } : r);
  return out;
}

export interface StartFormLine {
  id: string;
  form: FormId;
  rule: StartRule;
}

/** The start-form summary is generated from the config, never edited by hand (SETUP-019). */
export function startFormSummary(records: readonly CatalogueRecord[] = startRecords1444(), overrides: Readonly<Record<string, StartFormOverride>> = START_FORM_OVERRIDES): StartFormLine[] {
  return records.map((r) => {
    const f = startForm(r, overrides);
    return { id: r.id, form: f.form, rule: f.rule };
  });
}

/** Forms no country may start with (SETUP-018, INV-SETUP-9). */
export const NEVER_START_FORMS = config.start_forms_never as FormId[];

// ---------------------------------------------------------------------------
// Country starting values (SETUP-022 … SETUP-027)

export interface StartingRelations {
  allies: string[];
  rivals: string[];
  subjects: string[];
  enemies: string[];
}

/** A country's allies, rivals, subjects and enemies straight from the 1444 relations file (SETUP-022). */
export function startingRelations(country: string): StartingRelations {
  const out: StartingRelations = { allies: [], rivals: [], subjects: [], enemies: [] };
  for (const r of dataset1444.relations as { type: string; source: string; target: string }[]) {
    const other = r.source === country ? r.target : r.target === country ? r.source : null;
    if (other === null) continue;
    if (r.type === "alliance") out.allies.push(other);
    else if (r.type === "rival") out.rivals.push(other);
    else if (r.type === "at_war") out.enemies.push(other);
    // A subject relation runs from the subject (source) to its overlord (target).
    else if (r.type === "subject" && r.target === country) out.subjects.push(other);
  }
  return out;
}

/** Lords at the start: the great houses the catalogue's history names; none with one province (SETUP-023). */
export function lordsAtStart(provinces: number, greatHouses: readonly string[]): string[] {
  return greatHouses.slice(0, startLords(provinces, greatHouses.length));
}

/** Starting traders by the record's trade access, and their kind by where the country is (SETUP-024). */
export function startingTraders(access: string, where: { ports: number; riverHome?: boolean }): TraderKind[] {
  return startingKinds(where, startingTraderCount(access));
}

/** The ruler's and the people's faith from the catalogue (SETUP-026). */
export function startingFaiths(id: string): { ruler: string | null; people: string | null } {
  const r = catalogueRecord(id);
  return { ruler: r.stateFaith, people: r.peopleMajority };
}

/** Countries the research tree starts knowing an invention (by name in its start regions). */
export function knowsAtStart(inventionId: string, countryName: string): boolean {
  return invention(inventionId).start_regions.includes(countryName);
}

/**
 * Whether a country can explore on the first turn: S4 at start and the Age of Exploration in its region (SETUP-027).
 * The age has begun at the start when Portugal or Castile sails the ocean ships (EXPL-076).
 */
export function exploresAtStart(countryName: string, year = START_YEAR): boolean {
  const region = polityRegion(countryName.toLowerCase());
  if (!region) return false;
  const knows = new Set(["S1", "S2", "S3", "S4"].filter((i) => knowsAtStart(i, countryName)));
  const begun = knowsAtStart("S4", "Portugal") || knowsAtStart("S4", "Castile");
  return hasExplorationUnlock({ knows, region }, gateAtStart(year, begun));
}

// ---------------------------------------------------------------------------
// Province start values (SETUP-034, SETUP-035)

/** The town template a region's towns fill their slots by. */
export function townTemplate(region: string): string {
  const t = (config.town_templates as Record<string, string>)[region];
  if (!t) throw new Error(`no town template for ${region}`);
  return t;
}

// ---------------------------------------------------------------- decided rules (D-SETUP-1 … D-SETUP-17)

const MAP_TO_CATALOGUE = Object.fromEntries(Object.entries(config.map_to_catalogue).filter(([k]) => k !== "$comment")) as Record<string, string | null>;

/** The catalogue record a map nation is matched to; null when none matches and the map's own data is kept (X-13, D-SETUP-1). */
export function catalogueIdOf(mapId: string): string | null {
  if (mapId in MAP_TO_CATALOGUE) return MAP_TO_CATALOGUE[mapId] ?? null;
  return hasRecord(mapId) ? mapId : null;
}

/** Only a representation that owns map provinces is a realm (X-13, D-SETUP-2). */
export function isRealm(provincesOwned: number): boolean {
  return provincesOwned > 0;
}

/** A colony may be founded only where no country owns the land (SETUP-050, D-SETUP-2). */
export function colonisable(owner: string | null): boolean {
  return owner === null;
}

/** The factor an assessment level puts on a base start value; unknown counts as moderate (D-SETUP-6). */
export function levelFactor(level: Level): number {
  return (config.assessment_factors as Record<Level, number>)[level]!;
}

/** How far a start value may vary either way for a record of this confidence (D-SETUP-6). */
export function startSpread(confidence: Confidence): number {
  return (config.confidence_spread as Record<Confidence, number>)[confidence]!;
}

/** A start value: base times the level's factor, spread by confidence with the campaign's Rng. */
export function startValue(base: number, level: Level, confidence: Confidence, rng: Rng): number {
  const spread = startSpread(confidence);
  return base * levelFactor(level) * (1 + (rng.next() * 2 - 1) * spread);
}

/** The event-tree preset behind the new-game events option (D-SETUP-7). */
export function eventsPreset(option: "historical" | "plausible" | "free"): string {
  return (config.events_presets as Record<string, string>)[option]!;
}

/** The AI's risk tolerance in warfare's three steps: the catalogue's five levels folded to low, medium or high (SETUP-012). */
export function riskTolerance(level: string): "low" | "medium" | "high" {
  const r = (config.risk_tolerance_levels as Record<string, "low" | "medium" | "high">)[level];
  if (!r) throw new Error(`unknown risk tolerance level ${level}`);
  return r;
}
