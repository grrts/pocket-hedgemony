/**
 * Government (GOV): the officials cap and the lords cap, government forms and
 * what they set, reforms, form changes without a reform, and start forms.
 * After government-design v2; every number comes from
 * packages/rules/data/domain/government.json (government.yaml + start-forms.yaml).
 */
import config from "../../../../rules/data/domain/government.json" with { type: "json" };
import startRecords from "../../../../rules/data/domain/government-start-records.json" with { type: "json" };

export type FormId = keyof typeof config.forms;
export type Family = "house" | "citizens" | "faith" | "kin" | "warriors" | "modern";
export type AdministrativeCapacity = keyof typeof config.subject_reach_start;
export type CapBuildingId = keyof typeof config.buildings;
export type Loyalty = "loyal" | "wavering" | "disloyal" | "in_revolt";

export interface GovernmentForm {
  id: FormId;
  family: Family;
  officials: number;
  lords: number;
  /** Change to subject reach; null means the form can hold no subjects. */
  subjectReach: number | null;
  colonialRange: number;
  succession: string;
  eventTree: string;
  next: FormId[];
  selfRun: boolean;
}

export interface ReformRule {
  from: FormId[];
  to: FormId;
  needs: string[];
  gold: number;
  lordsSlip: number;
}

interface RawForm {
  family: string;
  officials: number;
  lords: number;
  subject_reach: number | string;
  colonial_range: number;
  succession: string;
  event_tree: string;
  next: string[];
  self_run?: boolean;
}

const rawForms = config.forms as Record<FormId, RawForm>;

export const FORM_IDS = Object.keys(rawForms) as FormId[];

export function isFormId(id: string): id is FormId {
  return Object.hasOwn(rawForms, id);
}

/** A form by id, with the config's numbers. */
export function form(id: FormId): GovernmentForm {
  const f = rawForms[id];
  return {
    id,
    family: f.family as Family,
    officials: f.officials,
    lords: f.lords,
    subjectReach: typeof f.subject_reach === "number" ? f.subject_reach : null,
    colonialRange: f.colonial_range,
    succession: f.succession,
    eventTree: f.event_tree,
    next: f.next as FormId[],
    selfRun: f.self_run === true,
  };
}

/** "Prince-bishopric" → "prince_bishopric". Throws on a name that is not a form. */
export function formIdFromName(name: string): FormId {
  const id = name.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!isFormId(id)) throw new Error(`Unknown government form: ${name}`);
  return id;
}

/** "prince_bishopric" → "Prince-bishopric"; other ids by their words. */
export function formName(id: FormId): string {
  if (id === "prince_bishopric") return "Prince-bishopric";
  const words = id.replace(/_/g, " ");
  return words[0]!.toUpperCase() + words.slice(1);
}

/** How the next ruler is chosen, in the design's words. */
export function successionName(id: FormId): string {
  const key = form(id).succession as keyof typeof config.succession_names;
  return config.succession_names[key];
}

// ---------------------------------------------------------------------------
// The two caps (design §2, §2.1)
// ---------------------------------------------------------------------------

/** A cap building the country holds; `step` counts from 1. */
export interface CapBuilding {
  id: CapBuildingId;
  step: number;
}

interface RawCapBuilding {
  officials?: number | number[];
  lords?: number | number[];
  needs?: string;
  forms?: string[];
}

const rawBuildings = config.buildings as Record<CapBuildingId, RawCapBuilding>;

function byStep(v: number | number[] | undefined, step: number): number {
  if (v === undefined) return 0;
  if (typeof v === "number") return v;
  return v[Math.min(step, v.length) - 1] ?? 0;
}

/** What one cap building adds to the officials and lords caps at its step. */
export function buildingContribution(id: CapBuildingId, step = 1): { officials: number; lords: number } {
  const b = rawBuildings[id];
  return { officials: byStep(b.officials, step), lords: byStep(b.lords, step) };
}

/** "court of law" → "court_of_law". */
export function capBuildingIdFromName(name: string): CapBuildingId {
  const id = name.trim().toLowerCase().replace(/\s+/g, "_");
  if (!Object.hasOwn(rawBuildings, id)) throw new Error(`Unknown cap building: ${name}`);
  return id as CapBuildingId;
}

/** Step 2 of a seat needs G11 (design §2.1); the config lists only the step-1 need of other buildings. */
const SEAT_STEP_2_NEEDS = "G11";

/**
 * Whether a country may build a cap building: its invention need and its form
 * limit. Returns the first missing requirement, or null when available.
 */
export function capBuildingMissing(id: CapBuildingId, step: number, country: { form: FormId; inventions: ReadonlySet<string> }): string | null {
  const b = rawBuildings[id];
  if (b.needs && !country.inventions.has(b.needs)) return b.needs;
  if (id === "seat" && step >= 2 && !country.inventions.has(SEAT_STEP_2_NEEDS)) return SEAT_STEP_2_NEEDS;
  if (b.forms && !b.forms.includes(country.form)) return `form ${country.form}`;
  return null;
}

/** One line of a cap's breakdown on the government card. */
export interface CapPart {
  source: string;
  value: number;
}

export interface Cap {
  total: number;
  parts: CapPart[];
}

export interface CapInput {
  form: FormId;
  buildings: readonly CapBuilding[];
  /** Additions from national strengths (design §8). */
  strengths?: readonly { officials?: number; lords?: number }[];
}

function buildingLabel(id: CapBuildingId): string {
  return id.replace(/_/g, " ");
}

/** Both caps with their parts: form, each building (seats together), strengths. */
export function workOutCaps(input: CapInput): { officials: Cap; lords: Cap } {
  const f = form(input.form);
  const officials: CapPart[] = [{ source: "form", value: f.officials }];
  const lords: CapPart[] = [{ source: "form", value: f.lords }];
  const seats = input.buildings.filter((b) => b.id === "seat");
  for (const b of input.buildings) {
    if (b.id === "seat") continue;
    const c = buildingContribution(b.id, b.step);
    if (c.officials) officials.push({ source: buildingLabel(b.id), value: c.officials });
    if (c.lords) lords.push({ source: buildingLabel(b.id), value: c.lords });
  }
  if (seats.length) {
    const value = seats.reduce((n, b) => n + buildingContribution("seat", b.step).officials, 0);
    officials.push({ source: seats.length === 1 ? "1 seat" : `${seats.length} seats`, value });
  }
  for (const s of input.strengths ?? []) {
    if (s.officials) officials.push({ source: "strength", value: s.officials });
    if (s.lords) lords.push({ source: "strength", value: s.lords });
  }
  const sum = (parts: CapPart[]): Cap => ({ total: parts.reduce((n, p) => n + p.value, 0), parts });
  return { officials: sum(officials), lords: sum(lords) };
}

/** An official in service: where he serves and when he was hired (larger = newer). */
export interface Official {
  id: string;
  province: string;
  hired: number;
  /** A colonial governor still waiting in a governor slot (design §3). */
  governorSlot?: boolean;
}

/** Officials that count against the officials cap. */
export function countedOfficials(officials: readonly Official[]): Official[] {
  if (config.colonial_governors_count_against_officials_cap) return [...officials];
  return officials.filter((o) => !o.governorSlot);
}

/**
 * Provinces that get *Grasping officials*: the province of each official over
 * the cap, newest hires first (GOV-005). Empty when within the cap (GOV-004, GOV-006).
 */
export function graspingOfficials(officials: readonly Official[], cap: number): Set<string> {
  const counted = countedOfficials(officials);
  const over = counted.length - cap;
  if (over <= 0) return new Set();
  const newestFirst = [...counted].sort((a, b) => b.hired - a.hired);
  return new Set(newestFirst.slice(0, over).map((o) => o.province));
}

export const GRASPING_OFFICIALS = config.over_cap.officials.grievance;

export interface LordInRealm {
  id: string;
  loyalty: Loyalty;
  provinces: number;
}

const LOYALTY_ORDER: Loyalty[] = ["loyal", "wavering", "disloyal", "in_revolt"];

/**
 * Lords that lose one loyalty step at New Year: one per lord over the lords
 * cap, lowest loyalty first, then most provinces (GOV-007).
 */
export function newYearLordSlips(lords: readonly LordInRealm[], cap: number): string[] {
  const over = (lords.length - cap) * config.over_cap.lords.slips_per_lord_over;
  if (over <= 0) return [];
  const ordered = [...lords].sort(
    (a, b) => LOYALTY_ORDER.indexOf(b.loyalty) - LOYALTY_ORDER.indexOf(a.loyalty) || b.provinces - a.provinces,
  );
  return ordered.slice(0, over).map((l) => l.id);
}

/** Lords-cap slips for the turn that starts month `month` (1–12): only at New Year. */
export function lordSlipsAtMonthStart(month: number, lords: readonly LordInRealm[], cap: number): string[] {
  return config.over_cap.lords.when === "new_year" && month === 1 ? newYearLordSlips(lords, cap) : [];
}

/** Permanent *Great lord* down reasons for a lord of this size (GOV-008). Size never touches the cap. */
export function greatLordReasons(provinces: number): number {
  for (const band of config.great_lord) {
    if (provinces >= band.provinces_min && provinces <= band.provinces_max) return band.down_reasons;
  }
  return 0;
}

/** Every lord counts 1 toward the lords cap, whatever his size (GOV-003). */
export function lordCapCount(_lord: { provinces: number }): number {
  return 1;
}

// ---------------------------------------------------------------------------
// Forms (design §3)
// ---------------------------------------------------------------------------

/**
 * Subject reach: the start base from the catalogue's administrative capacity
 * plus the form's change; null for a form that holds no subjects (GOV-019, GOV-020).
 */
export function subjectReach(capacity: AdministrativeCapacity, formId: FormId): number | null {
  const change = form(formId).subjectReach;
  return change === null ? null : config.subject_reach_start[capacity] + change;
}

/** "very high" → "very_high". */
export function capacityFromName(name: string): AdministrativeCapacity {
  const id = name.trim().toLowerCase().replace(/\s+/g, "_");
  if (!Object.hasOwn(config.subject_reach_start, id)) throw new Error(`Unknown administrative capacity: ${name}`);
  return id as AdministrativeCapacity;
}

/** Whether a province needs an official: self-run forms leave their own people's provinces alone (GOV-023, GOV-024). */
export function needsOfficial(formId: FormId, ownPeople: boolean): boolean {
  return !(form(formId).selfRun && ownPeople);
}

// ---------------------------------------------------------------------------
// Reforms (design §4)
// ---------------------------------------------------------------------------

/** The full list of reforms from config (GOV-033). */
export const REFORMS: ReformRule[] = config.reforms.map((r) => ({
  from: (Array.isArray(r.from) ? r.from : [r.from]) as FormId[],
  to: r.to as FormId,
  needs: r.needs,
  gold: r.gold,
  lordsSlip: r.lords_slip,
}));

/** The reform from one form to another, if config lists one and `to` is a next form (GOV-027). */
export function findReform(from: FormId, to: FormId): ReformRule | undefined {
  if (!form(from).next.includes(to)) return undefined;
  return REFORMS.find((r) => r.to === to && r.from.includes(from));
}

/** What a reform's needs are checked against. */
export interface ReformCountry {
  form: FormId;
  gold: number;
  inventions: ReadonlySet<string>;
  buildings: ReadonlySet<CapBuildingId>;
  provinces: number;
  lords: number;
  subjects: number;
  /** Other conditions that hold, in the config's words (e.g. "no adult heir"). */
  facts: ReadonlySet<string>;
}

const COUNT_NEED = /^(\d+) or more (provinces|subjects|lords)$/;
const INVENTION = /^([GW]\d+)\b/;
const BUILDING_NEED = /^an? (diet hall|parliament house|examination hall|chancery|court of law|hostage residence)$/;

/** Whether one listed need holds. Inventions by code ("G3 Tax registers or G6 Quipu" takes either). */
export function needMet(need: string, c: ReformCountry): boolean {
  const count = COUNT_NEED.exec(need);
  if (count) return c[count[2] as "provinces" | "subjects" | "lords"] >= Number(count[1]);
  const building = BUILDING_NEED.exec(need);
  if (building) return c.buildings.has(capBuildingIdFromName(building[1]!));
  const alternatives = need.split(" or ").map((a) => INVENTION.exec(a)?.[1]);
  if (alternatives.every((a) => a !== undefined)) return alternatives.some((a) => c.inventions.has(a!));
  return c.facts.has(need);
}

/** The need as the government card names it: an invention by its code. */
export function needLabel(need: string): string {
  return need
    .split(" or ")
    .map((a) => INVENTION.exec(a)?.[1] ?? a)
    .join(" or ");
}

export type ReformResult =
  | { ok: true; form: FormId; goldPaid: number; lordsSlip: number }
  | { ok: false; reason: "no_reform" | "need_missing" | "gold"; missing?: string };

/**
 * A reform order (GOV-027 … GOV-032): to one of the next forms through a
 * listed reform, every need met, gold in the treasury. The number of lords
 * that slip is returned; which lords is open (OQ-GOV-4).
 */
export function reform(c: ReformCountry, to: FormId): ReformResult {
  const rule = findReform(c.form, to);
  if (!rule) return { ok: false, reason: "no_reform" };
  const missing = rule.needs.find((n) => !needMet(n, c));
  if (missing !== undefined) return { ok: false, reason: "need_missing", missing };
  if (c.gold < rule.gold) return { ok: false, reason: "gold" };
  return { ok: true, form: to, goldPaid: rule.gold, lordsSlip: rule.lordsSlip };
}

// ---------------------------------------------------------------------------
// Form changes without a reform (design §4, §5)
// ---------------------------------------------------------------------------

/** A revolution or a won *New ideas* rising sets the form; no needs, no gold, era ignored (GOV-034, GOV-035). */
export function setFormByRevolution(_current: FormId, to: FormId): FormId {
  return to;
}

/** A successful army coup (GOV-037). */
export function formAfterCoup(): FormId {
  return "military_junta";
}

/** A shogunate whose shogun loses the capital breaks into warlord domains (GOV-038). */
export function formAfterCapitalLost(current: FormId): FormId {
  const rule = REFORMS.find((r) => r.from.includes(current) && r.needs.includes("the shogun loses the capital"));
  return rule ? rule.to : current;
}

export type EventGovernmentValue = keyof typeof config.event_tree_map;

interface EventMapping {
  set: string;
  keep_if_in?: string[];
  before_G14?: string;
}

/** The form an event-tree `government` value sets (GOV-039 … GOV-041). */
export function formFromEvent(current: FormId, value: string, hasG14: boolean): FormId {
  const m = (config.event_tree_map as Record<string, EventMapping>)[value];
  if (!m) throw new Error(`Unknown event-tree government value: ${value}`);
  if (m.keep_if_in?.includes(current)) return current;
  if (m.before_G14 && !hasG14) return m.before_G14 as FormId;
  return m.set as FormId;
}

// ---------------------------------------------------------------------------
// The start in 1444 (design §6, start-forms.yaml)
// ---------------------------------------------------------------------------

export interface CatalogueRecord {
  id: string;
  entityType: string;
  region: string;
  tier: string;
  /** The catalogue's government form text. */
  text: string;
}

export type StartRule = "override" | "text" | "kingdom_by_region" | "entity_type" | "default";

interface TextRule {
  match: string;
  form: string;
  only_types?: string[];
  skip_types?: string[];
}

const startForms = config.start_forms;

function kingdomForm(region: string, tier: string): FormId {
  for (const [prefix, f] of Object.entries(startForms.kingdom_by_region)) {
    if (!region.startsWith(prefix)) continue;
    if (typeof f === "string") return f as FormId;
    return (tier === "A" || tier === "B" ? f.tier_a_b : f.tier_c) as FormId;
  }
  return "feudal_realm";
}

/** The start form of a catalogue record by the first rule that applies (GOV-043 … GOV-045). */
export function assignStartForm(r: CatalogueRecord): { form: FormId; rule: StartRule } {
  const override = (startForms.overrides as Record<string, { form: string }>)[r.id];
  if (override) return { form: override.form as FormId, rule: "override" };
  const text = r.text.toLowerCase();
  for (const rule of startForms.text_rules as TextRule[]) {
    if (rule.only_types && !rule.only_types.includes(r.entityType)) continue;
    if (rule.skip_types?.includes(r.entityType)) continue;
    if (new RegExp(rule.match).test(text)) return { form: rule.form as FormId, rule: "text" };
  }
  if (r.entityType === "kingdom") return { form: kingdomForm(r.region, r.tier), rule: "kingdom_by_region" };
  const byType = (startForms.entity_type as Record<string, string>)[r.entityType];
  if (byType) return { form: byType as FormId, rule: "entity_type" };
  return { form: startForms.default as FormId, rule: "default" };
}

/** Whether a record id has a hand-set start form. */
export function hasOverride(id: string): boolean {
  return Object.hasOwn(startForms.overrides, id);
}

/** The 1444 catalogue records the start-form rules read. */
export function startRecords1444(): CatalogueRecord[] {
  return (startRecords.records as string[][]).map(([id, entityType, region, tier, text]) => ({
    id: id!,
    entityType: entityType!,
    region: region!,
    tier: tier!,
    text: text!,
  }));
}

/** Lords at the start: the catalogue's historical houses, none for a one-province country (GOV-046). */
export function startLords(provinces: number, historicalHouses: number): number {
  return provinces <= 1 ? 0 : historicalHouses;
}

// ---------------------------------------------------------------------------
// The government card (design §1)
// ---------------------------------------------------------------------------

export interface NextFormLine {
  form: FormId;
  text: string;
  met: boolean;
}

/** Next forms with their needs, as the government card lists them (GOV-049). */
export function nextFormLines(c: ReformCountry): NextFormLine[] {
  return form(c.form).next.map((to) => {
    const rule = findReform(c.form, to);
    const needs = rule?.needs ?? [];
    return {
      form: to,
      text: `${formName(to)}: needs ${needs.map(needLabel).join(", ")}`,
      met: rule !== undefined && needs.every((n) => needMet(n, c)),
    };
  });
}

export interface GovernmentCard {
  form: string;
  officials: string;
  lords: string;
  subjects: string;
  next: NextFormLine[];
  actions: string[];
}

/**
 * The government card: form, both caps as "x of y", subjects as "x of y"
 * (reach from `subjectReach`, use counted by the subjects context), next forms, Reform.
 */
export function governmentCard(
  c: ReformCountry & { officials: number },
  caps: { officials: Cap; lords: Cap },
  reach: number | null,
  subjectsUsed: number,
): GovernmentCard {
  return {
    form: formName(c.form),
    officials: `Officials ${c.officials} of ${caps.officials.total}`,
    lords: `Lords ${c.lords} of ${caps.lords.total}`,
    subjects: reach === null ? "Subjects none" : `Subjects ${subjectsUsed} of ${reach}`,
    next: nextFormLines(c),
    actions: ["Reform"],
  };
}
