import config from "../../../../rules/data/domain/research.json" with { type: "json" };
import type { Rng } from "../../rng.ts";

/**
 * Research (domain/research/spec.md): schools with student seats, students
 * taken from recruits, scholars, scholar-years of progress, and the one
 * invention tree every country climbs from the root *Settled life*.
 * Pure rules: state is plain data the caller owns; nothing here rolls dice.
 */

/** An era a date falls in, from the start on (Era I runs from the start, 1378 at the earliest, to 1500). */
export type Era = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
/** An era of the tree: the two before the start, Ancient and Medieval (RSCH-091), then the dated eras. */
export type TreeEra = "A" | "M" | Era;
/** Every era of the tree, the past ones first. */
export const TREE_ERAS: readonly TreeEra[] = config.eras as TreeEra[];
/** The eras a date falls in, Era I (from the start) on. */
export const ERAS: readonly Era[] = TREE_ERAS.filter((e) => !config.past_eras.includes(e)) as Era[];

export type SchoolType = keyof typeof config.school_seats;
export const SCHOOL_TYPES = Object.keys(config.school_seats) as SchoolType[];

/** What an invention does, where the tree states it as a number or a concrete unlock. */
export interface InventionEffects {
  buildings?: string[];
  faster?: string[];
  official_reach?: number;
  harvest_steps?: number;
  granary_pct?: number;
  failed_harvest_becomes?: string;
  harvests_per_year_irrigated_rice?: number;
  coastal_grain_store_pct?: number;
  salting?: boolean;
  provinces_per_official?: number;
  officials_cost_less?: boolean;
  royal_tax_pct?: number;
  scholars_become_officials?: boolean;
  envoys?: number;
  cross_oceans?: boolean;
  colonial_governor_slots?: number;
  merchant_earnings_pct?: number;
  debt_interest_pct?: number;
  school?: string;
  studies?: number;
  village_schools?: boolean;
  spread_pct?: number;
  research_pct?: number;
  /** Extra research toward inventions whose id starts with a letter (L3: Learning and Sea). */
  research_pct_for_letters?: Record<string, number>;
  school_upkeep_pct?: number;
  /** Scholars lost to old age become 1 in this many a year (L10). */
  old_age_one_in?: number;
  /** Years a harvest step lasts (F16). */
  harvest_steps_years?: number;
  needs_building?: string;
  [other: string]: unknown;
}

/** One config row of the tree (RSCH-044). */
export interface InventionRow {
  id: string;
  name: string;
  era: string;
  parent: string;
  or_parents: string[];
  also_needs: string[];
  unlocks: string;
  start_regions: string[];
  /** The event tree's id, for the 20 ★ inventions (RSCH-043). */
  event_id?: string;
  /** The contact event that opens a ⇄ invention (RSCH-035). */
  contact?: string;
  effects?: InventionEffects;
  /** What lacking a past invention costs a realm (RSCH-094), as the sheet says it. */
  without?: string;
}

export interface Invention extends InventionRow {
  era: TreeEra;
  /** The bough (R1–R4) this invention grows on, found by walking its parents. */
  bough: string;
}

export interface Tree {
  root: { id: string; name: string };
  boughs: { id: string; name: string }[];
  inventions: Map<string, Invention>;
}

export const researchConfig = config;

/** Loads the tree from config rows and checks it is one tree from one root (INV-RSCH-6). */
export function loadTree(rows: readonly InventionRow[] = config.inventions as InventionRow[]): Tree {
  const boughIds = new Set(config.boughs.map((b) => b.id));
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (byId.size !== rows.length) throw new Error("duplicate invention id");
  const inventions = new Map<string, Invention>();
  const boughOf = (id: string, seen: Set<string>): string => {
    if (boughIds.has(id)) return id;
    const row = byId.get(id);
    if (!row) throw new Error(`unknown parent ${id}`);
    if (seen.has(id)) throw new Error(`cycle at ${id}`);
    seen.add(id);
    return boughOf(row.parent, seen);
  };
  for (const row of rows) {
    if (!TREE_ERAS.includes(row.era as TreeEra)) throw new Error(`${row.id}: unknown era ${row.era}`);
    for (const need of [...row.or_parents, ...row.also_needs]) if (!byId.has(need) && !boughIds.has(need)) throw new Error(`${row.id}: unknown need ${need}`);
    inventions.set(row.id, { ...row, era: row.era as TreeEra, bough: boughOf(row.parent, new Set()) });
  }
  return { root: config.root, boughs: config.boughs, inventions };
}

let defaultTree: Tree | undefined;
export function tree(): Tree {
  return (defaultTree ??= loadTree());
}

export function invention(id: string, t: Tree = tree()): Invention {
  const inv = t.inventions.get(id);
  if (!inv) throw new Error(`unknown invention ${id}`);
  return inv;
}

/** The ids every country knows at the start: the root and the four boughs (RSCH-050). */
export function startingKnowledge(t: Tree = tree()): Set<string> {
  return new Set([t.root.id, ...t.boughs.map((b) => b.id)]);
}

/** Inventions in the tree, counted by era. */
export function countByEra(t: Tree = tree()): Record<TreeEra, number> {
  const out = Object.fromEntries(TREE_ERAS.map((e) => [e, 0])) as Record<TreeEra, number>;
  for (const inv of t.inventions.values()) out[inv.era]++;
  return out;
}

// ---------------------------------------------------------------- dates and eras

export interface Day {
  year: number;
  month?: number;
  day?: number;
}

function dayKey(d: Day): number {
  return d.year * 10000 + (d.month ?? 1) * 100 + (d.day ?? 1);
}

/** True while the date is inside the campaign (to 31 August 1939). */
export function withinCampaign(date: Day): boolean {
  return dayKey(date) <= dayKey(config.campaign_end);
}

/** The era a date falls in (RSCH-032). */
export function eraOf(date: Day): Era {
  let found: Era = "I";
  for (const era of ERAS) if (date.year >= config.era_dates[era]) found = era;
  return found;
}

/** An era's place: Era I is 0, so the past eras come before it (Ancient −2, Medieval −1). */
export const eraIndex = (era: TreeEra): number => TREE_ERAS.indexOf(era) - config.past_eras.length;

// ---------------------------------------------------------------- cost

/** Scholar-years an era's invention costs (RSCH-030). */
export function eraCost(era: TreeEra): number {
  return config.era_cost[era];
}

/**
 * Era I pacing (RSCH-113): Era I's cost per invention scales by the share of
 * Era I the campaign plays, the years from its start to Era II over the 56 of
 * a 1444 start, never below 1. A 1444 start (or no start given) is ×1, a 1378
 * start about ×2.18. Every other era is ×1.
 */
export function eraPace(era: TreeEra, startYear?: number): number {
  const pace = config.era_pace;
  if (startYear === undefined || era !== pace.era) return 1;
  const next = TREE_ERAS[TREE_ERAS.indexOf(era) + 1]!;
  return Math.max(1, (config.era_dates[next] - startYear) / pace.reference_years);
}

/** An era's cost for a campaign that started in startYear (RSCH-030, RSCH-113). */
export function eraCostFor(era: TreeEra, startYear?: number): number {
  return eraCost(era) * eraPace(era, startYear);
}

/** Cost before discounts: era cost (paced, RSCH-113), doubled for each era ahead of the date (RSCH-031). */
export function costBeforeDiscounts(era: TreeEra, date: Day, startYear?: number): number {
  const ahead = Math.max(0, eraIndex(era) - eraIndex(eraOf(date)));
  return eraCostFor(era, startYear) * config.ahead_multiplier ** ahead;
}

/** Spread discount in percent: 10 % per neighbour or trade partner who knows it, capped at 60 % (RSCH-034). */
export function spreadDiscountPct(partnersKnowing: number): number {
  return Math.min(config.spread_cap_pct, config.spread_per_partner_pct * Math.max(0, partnersKnowing));
}

/**
 * Behind the times: an invention of an era before the date's costs 25 % less
 * for each era it lies behind, at most 50 % off (RSCH-112).
 */
export function behindDiscountPct(era: TreeEra, date: Day): number {
  const behind = Math.max(0, eraIndex(eraOf(date)) - eraIndex(era));
  return Math.min(config.behind_discount_cap_pct, config.behind_discount_pct_per_era * behind);
}

/** The cost by era, then behind the times, then the spread; never under a fifth of the era cost (RSCH-112). */
function discountedCost(era: TreeEra, date: Day, spreadOffPct: number, startYear?: number): number {
  const behind = (costBeforeDiscounts(era, date, startYear) * (100 - behindDiscountPct(era, date))) / 100;
  return Math.max(eraCostFor(era, startYear) * config.cost_floor_share, (behind * (100 - spreadOffPct)) / 100);
}

/** What studying an invention costs in scholar-years now. */
export function studyCost(id: string, date: Day, partnersKnowing = 0, t: Tree = tree()): number {
  return discountedCost(invention(id, t).era, date, spreadDiscountPct(partnersKnowing));
}

// ---------------------------------------------------------------- the programme

export interface Cohort {
  count: number;
  enrolledYear: number;
}

export interface School {
  province: string;
  type: SchoolType;
  open: boolean;
  cohorts: Cohort[];
}

export interface Study {
  id: string;
  progress: number;
}

/** A country's research programme (the aggregate of spec §4). */
export interface Programme {
  country: string;
  known: Set<string>;
  /** Contact events that have happened for this country. */
  contacts: Set<string>;
  studies: Study[];
  schools: School[];
  scholars: number;
  /** Set when students are called to arms; research stays stopped until students enrol again. */
  stopped: boolean;
  /** Inventions lined up after the current study, in order (RSCH-108). */
  queue: string[];
  /** The start group the realm belongs to (RSCH-098); regional contacts read it (RSCH-096). */
  group?: string;
  /** The year the campaign started, for Era I pacing (RSCH-113); absent reads as a 1444 start. */
  startYear?: number;
}

/** The recruit pool research draws on (owned by realm and province). */
export interface RecruitPool {
  recruits: number;
  /** Recruits of single provinces, counted within `recruits`. */
  local?: Record<string, number>;
}

export function newProgramme(country: string, t: Tree = tree()): Programme {
  return { country, known: startingKnowledge(t), contacts: new Set(), studies: [], schools: [], scholars: 0, stopped: false, queue: [] };
}

/** Learns an invention; a known invention is never lost (INV-RSCH-1). */
export function learn(p: Programme, id: string): void {
  p.known.add(id);
  p.studies = p.studies.filter((s) => s.id !== id);
  p.queue = p.queue.filter((q) => q !== id);
}

export type Refusal = "unknown" | "known" | "parent" | "also_needs" | "contact" | "out_of_scope" | "too_many_studies";

/** Whether an invention may be studied (RSCH-033, RSCH-035, RSCH-045; INV-RSCH-3, INV-RSCH-5). */
export function eligibility(p: Programme, id: string, date: Day, t: Tree = tree()): { ok: true } | { ok: false; reason: Refusal } {
  const inv = t.inventions.get(id);
  if (!inv) return { ok: false, reason: "unknown" };
  if (p.known.has(id)) return { ok: false, reason: "known" };
  if (outOfScope(inv) || !withinCampaign(date)) return { ok: false, reason: "out_of_scope" };
  const need = needsMet(p, inv, p.known);
  return need ? { ok: false, reason: need } : { ok: true };
}

/** What stands between a realm and an invention when it has `have`: its parent, its other needs, a contact; null when nothing does. */
function needsMet(p: Programme, inv: Invention, have: ReadonlySet<string>): Refusal | null {
  if (!have.has(inv.parent) && !inv.or_parents.some((x) => have.has(x))) return "parent";
  if (!inv.also_needs.every((x) => have.has(x))) return "also_needs";
  const contact = contactFor(p, inv);
  if (contact && !p.contacts.has(contact)) return "contact";
  return null;
}

/**
 * The contact event an invention waits for in this realm: its row's (F9 waits
 * for the Atlantic crossing), or a regional one, as F03 waits for first
 * contact across the ocean in the Americas (RSCH-035, RSCH-096).
 */
export function contactFor(p: Programme, inv: Invention): string | undefined {
  if (inv.contact) return inv.contact;
  return config.regional_contacts.find((c) => c.invention === inv.id && p.group !== undefined && c.groups.includes(p.group))?.contact;
}

/**
 * Era VIII and the two Era VII inventions dropped by X-14 (L23 Nuclear physics,
 * L24 Rocketry) are never studied (RSCH-045, RSCH-062, RSCH-063).
 */
export function outOfScope(inv: Invention): boolean {
  return config.out_of_scope_eras.includes(inv.era) || config.dropped_inventions.includes(inv.id);
}

/** Records a contact event, opening the contact inventions it names (RSCH-035). */
export function contactEvent(p: Programme, contact: string): void {
  p.contacts.add(contact);
}

/** True when the country has an open academy-level school. */
export function hasAcademy(p: Programme): boolean {
  return p.schools.some((s) => s.open && config.academy_level_schools.includes(s.type));
}

/** How many inventions can be studied at once: one, two with an academy-level school (RSCH-014). */
export function maxStudies(p: Programme): number {
  return hasAcademy(p) ? config.studies_with_academy : 1;
}

/** Sets a study (the SetStudy / SetSecondStudy commands). */
export function setStudy(p: Programme, id: string, date: Day, t: Tree = tree()): { ok: true } | { ok: false; reason: Refusal } {
  const e = eligibility(p, id, date, t);
  if (!e.ok) return e;
  if (p.studies.some((s) => s.id === id)) return { ok: true };
  if (p.studies.length >= maxStudies(p)) return { ok: false, reason: "too_many_studies" };
  p.studies.push({ id, progress: 0 });
  return { ok: true };
}

export function students(p: Programme): number {
  return p.schools.reduce((n, s) => n + s.cohorts.reduce((m, c) => m + c.count, 0), 0);
}

/** Scholar-years a year: 1 per scholar, 0.2 per student (RSCH-010). */
export function researchPerYear(scholars: number, studentCount: number): number {
  return scholars * config.scholar_rate + studentCount * config.student_rate;
}

/** Sum of one numeric effect over every invention a country knows. */
export function knownEffectSum(p: Programme, key: "research_pct" | "spread_pct" | "school_upkeep_pct", t: Tree = tree()): number {
  let sum = 0;
  for (const id of p.known) {
    const v = t.inventions.get(id)?.effects?.[key];
    if (typeof v === "number") sum += v;
  }
  return sum;
}

/**
 * Research bonus in percent toward one invention: L6 and L11 +10 % each, L20
 * +50 %, and L3 +20 % toward Learning (L) and Sea (S) inventions (RSCH-074).
 */
export function researchBonusPct(p: Programme, id: string, t: Tree = tree()): number {
  let pct = knownEffectSum(p, "research_pct", t);
  for (const known of p.known) {
    const byLetter = t.inventions.get(known)?.effects?.research_pct_for_letters;
    if (byLetter) pct += byLetter[id.charAt(0)] ?? 0;
  }
  return pct;
}

/**
 * Discount per neighbour or trade partner who knows an invention: 10 %, raised
 * by a fifth by each of L5, L14 and L21 (RSCH-069).
 */
export function spreadPerPartnerPct(p: Programme, t: Tree = tree()): number {
  return config.spread_per_partner_pct * (1 + knownEffectSum(p, "spread_pct", t) / 100);
}

/** What a study costs this country now, with its own spread inventions. */
export function studyCostFor(p: Programme, id: string, date: Day, partnersKnowing = 0, t: Tree = tree()): number {
  const off = Math.min(config.spread_cap_pct, spreadPerPartnerPct(p, t) * Math.max(0, partnersKnowing));
  return discountedCost(invention(id, t).era, date, off, p.startYear);
}

function addProgress(p: Programme, scholarYears: number, date: Day, partnersKnowing: Record<string, number>, t: Tree): string[] {
  if (p.stopped || !p.schools.some((s) => s.open) || p.studies.length === 0) return [];
  // Two studies share the scholar-years evenly (RSCH-068).
  const share = p.studies.length > 1 ? config.second_study_share : 1;
  for (const s of p.studies) s.progress += scholarYears * share * (1 + researchBonusPct(p, s.id, t) / 100);
  const learned: string[] = [];
  for (const s of [...p.studies]) {
    if (s.progress >= studyCostFor(p, s.id, date, partnersKnowing[s.id] ?? 0, t)) {
      learn(p, s.id);
      learned.push(s.id);
    }
  }
  if (learned.length) startFromQueue(p, date, t);
  return learned;
}

/**
 * One monthly step of research: a twelfth of the yearly scholar-years goes into
 * the current study or studies (RSCH-067). Progress stops while no school is
 * open (RSCH-012) or after students were called to arms (RSCH-022). Returns the
 * inventions learned (RSCH-011).
 */
export function researchMonth(p: Programme, date: Day, partnersKnowing: Record<string, number> = {}, t: Tree = tree()): string[] {
  return addProgress(p, researchPerYear(p.scholars, students(p)) / config.research_months_per_year, date, partnersKnowing, t);
}

/** Twelve monthly steps at once (a year of research). */
export function researchYear(p: Programme, date: Day, partnersKnowing: Record<string, number> = {}, t: Tree = tree()): string[] {
  const learned: string[] = [];
  for (let m = 0; m < config.research_months_per_year; m++) learned.push(...researchMonth(p, date, partnersKnowing, t));
  return learned;
}

// ---------------------------------------------------------------- schools

export type SchoolGain = "build" | "lord_founds" | "clergy_founds" | "conquest";
export type SchoolLoss = keyof typeof config.school_lost_by;

/** Student seats of a school type (RSCH-003). */
export function seatsOf(type: SchoolType): number {
  return config.school_seats[type];
}

/** The invention a school type comes from (RSCH-003). */
export function schoolInvention(type: SchoolType): string {
  return config.school_invention[type];
}

/**
 * A school is gained by building it, a lord or the clergy founding it, or
 * conquering a town that has one (RSCH-001). Building one needs the invention
 * its type comes from.
 */
export function gainSchool(p: Programme, province: string, type: SchoolType, way: SchoolGain): School {
  if (!config.school_gained_by.includes(way)) throw new Error(`a school is not gained by ${way}`);
  if (way === "build" && !p.known.has(schoolInvention(type))) throw new Error(`building a ${type} needs ${schoolInvention(type)}`);
  const school: School = { province, type, open: true, cohorts: [] };
  p.schools.push(school);
  return school;
}

/** Unpaid upkeep or a religious change closes a school; a sack loses it (RSCH-002). */
export function loseSchool(p: Programme, province: string, cause: SchoolLoss): "closed" | "lost" {
  const result = config.school_lost_by[cause] as "closed" | "lost";
  const school = p.schools.find((s) => s.province === province);
  if (!school) throw new Error(`no school in ${province}`);
  if (result === "lost") p.schools = p.schools.filter((s) => s !== school);
  else school.open = false;
  return result;
}

/**
 * With L18 every province without a school gets village-school seats: 10 each
 * (RSCH-070). Village schools are not buildings and cost no upkeep.
 */
export function villageSeats(p: Programme, provinces: readonly string[], t: Tree = tree()): number {
  const has = [...p.known].some((id) => t.inventions.get(id)?.effects?.village_schools === true);
  if (!has) return 0;
  const withSchool = new Set(p.schools.map((s) => s.province));
  return provinces.filter((x) => !withSchool.has(x)).length * config.village_school_seats;
}

export function seats(p: Programme): number {
  return p.schools.filter((s) => s.open).reduce((n, s) => n + seatsOf(s.type), 0);
}

export function emptySeats(p: Programme): number {
  return seats(p) - students(p);
}

/**
 * Fills up to `n` seats from recruits, local recruits filling local seats
 * first, then the realm's (RSCH-004). Every seat filled takes
 * `recruits_per_student` men the army cannot raise (RSCH-020); a seat the
 * pool cannot pay for in full stays empty. Returns how many enrolled.
 */
export function fillSeats(p: Programme, pool: RecruitPool, n: number, year: number): number {
  const k = recruitsPerStudent();
  let left = Math.min(n, emptySeats(p), Math.floor(pool.recruits / k));
  let enrolled = 0;
  for (const school of p.schools) {
    if (!school.open || left <= 0) continue;
    const free = seatsOf(school.type) - school.cohorts.reduce((m, c) => m + c.count, 0);
    const take = Math.min(free, left);
    if (take <= 0) continue;
    const local = pool.local?.[school.province] ?? 0;
    const fromLocal = Math.min(local, take * k);
    if (pool.local && fromLocal > 0) pool.local[school.province] = local - fromLocal;
    pool.recruits -= take * k;
    school.cohorts.push({ count: take, enrolledYear: year });
    left -= take;
    enrolled += take;
  }
  if (enrolled > 0) p.stopped = false;
  return enrolled;
}

/** Recruits each student takes from the pool when he enrols (RSCH-020, D-RSCH-25); called to arms, only the student himself comes back (RSCH-022). */
export function recruitsPerStudent(): number {
  return config.recruits_per_student;
}

/** Recruits the army can still raise. */
export function raisableRecruits(pool: RecruitPool): number {
  return pool.recruits;
}

export type StudentLoss = "graduated" | "called_to_arms" | "famine" | "plague";

/** Students lost to graduation, the army, famine or plague (RSCH-005), youngest cohorts last. */
export function loseStudents(p: Programme, cause: StudentLoss, n: number, province?: string): number {
  if (!config.students.lost_by.includes(cause)) throw new Error(`students are not lost by ${cause}`);
  let left = n;
  for (const school of p.schools) {
    if (province && school.province !== province) continue;
    for (const c of school.cohorts) {
      const take = Math.min(c.count, left);
      c.count -= take;
      left -= take;
    }
    school.cohorts = school.cohorts.filter((c) => c.count > 0);
  }
  return n - left;
}

/** Years a cohort needs: 5, a year sooner where a Schoolmaster runs the province (RSCH-006). */
export function yearsToGraduate(schoolmaster: boolean): number {
  return config.graduation_years - (schoolmaster ? config.schoolmaster_years_sooner : 0);
}

/**
 * Year end: cohorts that have studied long enough graduate as scholars
 * (RSCH-006). Returns graduates by school type.
 */
export function graduateYear(p: Programme, year: number, schoolmasters: ReadonlySet<string> = new Set()): { type: SchoolType; province: string; count: number }[] {
  const out: { type: SchoolType; province: string; count: number }[] = [];
  for (const school of p.schools) {
    const need = yearsToGraduate(schoolmasters.has(school.province));
    const done = school.cohorts.filter((c) => year - c.enrolledYear >= need);
    const count = done.reduce((n, c) => n + c.count, 0);
    if (count > 0) out.push({ type: school.type, province: school.province, count });
    school.cohorts = school.cohorts.filter((c) => !done.includes(c));
    p.scholars += count;
  }
  return out;
}

/** Official types a graduate of a school type may become instead of a scholar (RSCH-007). */
export function graduateOfficialTypes(type: SchoolType): string[] {
  return (config.graduate_official_types as Record<string, string[]>)[type] ?? [];
}

/** With G4 *Examination system* a scholar can become an official directly (RSCH-007). */
export function scholarsCanBecomeOfficials(p: Programme, t: Tree = tree()): boolean {
  return [...p.known].some((id) => t.inventions.get(id)?.effects?.scholars_become_officials === true);
}

export type ScholarChange = "graduated" | "hired_foreign" | "fled_to_you" | "old_age" | "war_in_town" | "persecution" | "poached";

/** Scholars gained or lost by one of the design's causes (RSCH-008). */
export function changeScholars(p: Programme, cause: ScholarChange, n: number): number {
  if (config.scholars.gained_by.includes(cause)) p.scholars += n;
  else if (config.scholars.lost_by.includes(cause)) p.scholars = Math.max(0, p.scholars - n);
  else throw new Error(`scholars do not change by ${cause}`);
  return p.scholars;
}

// ---------------------------------------------------------------- war and research

/**
 * Yearly upkeep of the open schools: temple or monastery school 2 gold,
 * madrasa and university 4, academy 6, each 10 % less for C1, L4 and L5
 * (RSCH-070, RSCH-074).
 */
export function schoolUpkeep(p: Programme, t: Tree = tree()): number {
  const base = p.schools.filter((s) => s.open).reduce((n, s) => n + config.school_upkeep[s.type], 0);
  return (base * (100 + knownEffectSum(p, "school_upkeep_pct", t))) / 100;
}

/**
 * School upkeep is paid each year from the treasury that also pays soldiers
 * (RSCH-021). Without a figure the school's own upkeep applies.
 */
export function paySchoolUpkeep(p: Programme, treasury: { gold: number }, goldPerSchool?: number): number {
  const due = goldPerSchool === undefined ? schoolUpkeep(p) : p.schools.filter((s) => s.open).length * goldPerSchool;
  treasury.gold -= due;
  return due;
}

/** Empties every school back into recruits at once; research stops and these students never graduate (RSCH-022). */
export function callStudentsToArms(p: Programme, pool: RecruitPool): number {
  const n = students(p);
  for (const school of p.schools) school.cohorts = [];
  pool.recruits += n;
  p.stopped = true;
  return n;
}

/**
 * A battle in a province with a school may sack it and scatter its scholars,
 * who may flee to a peaceful neighbour (RSCH-023): what may happen.
 */
export function battleAtSchool(p: Programme, province: string, neighbours: { country: string; atPeace: boolean }[]): { maySack: boolean; scholarsMayFleeTo: string[] } {
  const has = p.schools.some((s) => s.province === province);
  return { maySack: has, scholarsMayFleeTo: has ? neighbours.filter((n) => n.atPeace).map((n) => n.country) : [] };
}

// ---------------------------------------------------------------- readers

/** The event tree's `literacy`: scholars and schools per thousand people (RSCH-060). */
export function literacy(p: Programme, peopleThousands: number): { scholarsPerThousand: number; schoolsPerThousand: number } {
  return { scholarsPerThousand: p.scholars / peopleThousands, schoolsPerThousand: p.schools.length / peopleThousands };
}

/** Inventions known, each with its era cost, for the realm's Technology score (RSCH-061). */
export function knownWithEraCost(p: Programme, t: Tree = tree()): { id: string; eraCost: number }[] {
  return [...p.known].filter((id) => t.inventions.has(id)).map((id) => ({ id, eraCost: eraCost(invention(id, t).era) }));
}

/** The effects an invention's row states (RSCH-042). */
export function effectsOf(id: string, t: Tree = tree()): InventionEffects {
  return invention(id, t).effects ?? {};
}

/** The invention carrying an event-tree id (RSCH-043). */
export function byEventId(eventId: string, t: Tree = tree()): Invention | undefined {
  for (const inv of t.inventions.values()) if (inv.event_id === eventId) return inv;
  return undefined;
}

// ---------------------------------------------------------------- decided rules (§13)

/**
 * Sack roll for a battle in a province with an open school: 25 % to sack it
 * (the school is lost); then half the province's scholars flee to the first
 * peaceful neighbour in the order given (ascending nation index), or are lost
 * when no neighbour is at peace (RSCH-072).
 */
export function sackRoll(
  p: Programme,
  province: string,
  provinceScholars: number,
  neighbours: { country: string; atPeace: boolean }[],
  rng: Rng,
): { sacked: boolean; fled: number; to: string | null } {
  const school = p.schools.find((s) => s.province === province && s.open);
  if (!school || rng.int(100) >= config.sack_chance_pct) return { sacked: false, fled: 0, to: null };
  loseSchool(p, province, "sacked");
  const fled = Math.floor(provinceScholars * config.sack_scholars_flee_share);
  p.scholars = Math.max(0, p.scholars - fled);
  const to = neighbours.find((n) => n.atPeace)?.country ?? null;
  return { sacked: true, fled, to };
}

/**
 * Stealing in war: occupying an enemy province with an open school gives each
 * current study the enemy knows 10 % of its cost, once per province per war
 * (RSCH-071). The caller keeps the per-war list of provinces already used.
 */
export function stealInWar(p: Programme, enemyKnows: ReadonlySet<string>, date: Day, t: Tree = tree()): string[] {
  const helped: string[] = [];
  for (const s of p.studies) {
    if (!enemyKnows.has(s.id)) continue;
    s.progress += costBeforeDiscounts(invention(s.id, t).era, date, p.startYear) * config.steal_share_of_cost;
    helped.push(s.id);
  }
  return helped;
}

/** Scholars a country loses to old age each January: 1 in 30, 1 in 60 with L10 (RSCH-075). */
export function oldAgeLoss(p: Programme, t: Tree = tree()): number {
  let oneIn = config.old_age_one_in;
  for (const id of p.known) {
    const v = t.inventions.get(id)?.effects?.old_age_one_in;
    if (typeof v === "number") oneIn = Math.max(oneIn, v);
  }
  return Math.floor(p.scholars / oneIn);
}

/**
 * Poaching each January: the richest neighbour with at least twice your gold
 * takes 1 in 20 of your scholars (RSCH-073).
 */
export function poachingYear(p: Programme, gold: number, neighbours: { country: string; gold: number }[]): { by: string | null; scholars: number } {
  const rich = neighbours.filter((n) => n.gold >= gold * config.poach_gold_ratio).sort((a, b) => b.gold - a.gold)[0];
  if (!rich) return { by: null, scholars: 0 };
  const n = Math.floor(p.scholars / config.poach_one_in);
  p.scholars -= n;
  return { by: rich.country, scholars: n };
}

// ---------------------------------------------------------------- start groups (§5.11)

interface StartGroup {
  realms: string[];
  past: string[];
  inventions: string[];
}
const startGroups = config.start_groups as Record<string, StartGroup>;

/**
 * What differs for a campaign that starts on another date than 11 November
 * 1444 (§5.11, RSCH-114): the groups its realms join, ids not yet on the map
 * included, and what each realm knows more or less than its 1444 set.
 */
export interface StartBlock {
  date: Day;
  join: Record<string, string>;
  add: Record<string, string[]>;
  remove: Record<string, string[]>;
}
const startBlocks = config.starts as unknown as Record<string, StartBlock>;

/** The start block of a campaign's start date, keyed by its year; none for 1444 (RSCH-114). */
export function startBlockFor(start?: Day): StartBlock | undefined {
  return start ? startBlocks[String(start.year)] : undefined;
}

/** The start group a map nation belongs to (RSCH-098), or undefined for one in none; a start block's joins come first (RSCH-114). */
export function startGroupOf(nation: string, start?: Day): string | undefined {
  const joined = startBlockFor(start)?.join[nation];
  if (joined) return joined;
  for (const [g, def] of Object.entries(startGroups)) if (def.realms.includes(nation)) return g;
  return undefined;
}

/** Every start group with its realms, for the data checks (INV-RSCH-8). */
export function startGroupTable(): Record<string, StartGroup> {
  return startGroups;
}

/**
 * The inventions a map nation knows at the start: the root, the four boughs,
 * its group's past inventions and Era I and II inventions, its own additions,
 * minus its own removals; nothing else (RSCH-098).
 */
export function startingKnowledgeFor(nation: string, t: Tree = tree(), start?: Day): Set<string> {
  const known = startingKnowledge(t);
  const block = startBlockFor(start);
  const group = startGroups[startGroupOf(nation, start) ?? ""];
  const add = [...((config.start_add as Record<string, string[]>)[nation] ?? []), ...(block?.add[nation] ?? [])];
  const remove = new Set([...((config.start_remove as Record<string, string[]>)[nation] ?? []), ...(block?.remove[nation] ?? [])]);
  for (const id of [...(group?.past ?? []), ...(group?.inventions ?? []), ...add]) if (!remove.has(id) && t.inventions.has(id)) known.add(id);
  return known;
}

/**
 * What a start set lacks: each invention in it whose parent (or every
 * alternative) or an "also needs" is missing, with what it misses. Empty when
 * the set is complete (RSCH-099).
 */
export function startSetGaps(known: ReadonlySet<string>, t: Tree = tree()): { id: string; missing: string[] }[] {
  const out: { id: string; missing: string[] }[] = [];
  for (const id of known) {
    const inv = t.inventions.get(id);
    if (!inv) continue;
    const missing: string[] = [];
    if (![inv.parent, ...inv.or_parents].some((x) => known.has(x))) missing.push(inv.parent);
    for (const x of inv.also_needs) if (!known.has(x)) missing.push(x);
    if (missing.length) out.push({ id, missing });
  }
  return out;
}

/**
 * A programme set up for a map nation at the start: its start group's
 * knowledge and no study (RSCH-098). Given the campaign's start date, the
 * start block of that date applies and Era I is paced to it (RSCH-113,
 * RSCH-114); without one it is the 1444 start.
 */
export function startingProgramme(nation: string, t: Tree = tree(), start?: Day): Programme {
  const p = newProgramme(nation, t);
  p.known = startingKnowledgeFor(nation, t, start);
  const group = startGroupOf(nation, start);
  if (group) p.group = group;
  if (start) p.startYear = start.year;
  return p;
}

// ---------------------------------------------------------------- standing (RSCH-097)

/** True for an invention of the eras before the start, Ancient and Medieval (RSCH-091). */
export function isPast(inv: Invention): boolean {
  return config.past_eras.includes(inv.era);
}

/** The display name of an era: "Ancient", "Medieval", "Era I". */
export function eraName(era: TreeEra): string {
  return (config.era_names as Record<string, string>)[era] ?? `Era ${era}`;
}

/**
 * A realm's standing: the latest era, from Ancient on, of which it knows at
 * least a quarter of the inventions in scope, and a quarter of every earlier
 * era's. Ancient is the floor (RSCH-097).
 */
export function standing(known: ReadonlySet<string>, t: Tree = tree()): TreeEra {
  const { all, eras } = eraCounts(t);
  const have = new Map<TreeEra, number>();
  for (const id of known) {
    const e = eras.get(id);
    if (e !== undefined) have.set(e, (have.get(e) ?? 0) + 1);
  }
  let found: TreeEra = TREE_ERAS[0]!;
  for (const era of TREE_ERAS) {
    const n = all.get(era) ?? 0;
    if (n === 0) continue;
    if ((have.get(era) ?? 0) < n * config.standing_share) break;
    found = era;
  }
  return found;
}

/** Each era's inventions in scope, and each such invention's era: counted once a tree, as every snapshot asks every realm's standing. */
const eraCountsOf = new WeakMap<Tree, { size: number; all: Map<TreeEra, number>; eras: Map<string, TreeEra> }>();
function eraCounts(t: Tree): { all: Map<TreeEra, number>; eras: Map<string, TreeEra> } {
  const had = eraCountsOf.get(t);
  if (had && had.size === t.inventions.size) return had;
  const all = new Map<TreeEra, number>();
  const eras = new Map<string, TreeEra>();
  for (const inv of t.inventions.values()) {
    if (outOfScope(inv)) continue;
    all.set(inv.era, (all.get(inv.era) ?? 0) + 1);
    eras.set(inv.id, inv.era);
  }
  const counts = { size: t.inventions.size, all, eras };
  eraCountsOf.set(t, counts);
  return counts;
}

/** Eras between a realm's standing and the era of the date: 0 when abreast of the times (RSCH-097). */
export function behindBy(known: ReadonlySet<string>, date: Day, t: Tree = tree()): number {
  return eraBehind(standing(known, t), date);
}

/** Eras between a standing already worked out and the era of the date. */
export function eraBehind(standing: TreeEra, date: Day): number {
  return Math.max(0, eraIndex(eraOf(date)) - eraIndex(standing));
}

/** Past inventions a realm lacks (to catch up). */
export function missingPast(known: ReadonlySet<string>, t: Tree = tree()): string[] {
  return [...t.inventions.values()].filter((i) => isPast(i) && !known.has(i.id)).map((i) => i.id);
}

// ---------------------------------------------------------------- without it (RSCH-094)

/** What lacking past inventions costs a realm: all neutral for a realm that knows them (RSCH-094). */
export interface Without {
  /** Harvest steps added (−1 without F01). */
  harvestSteps: number;
  /** Arms the realm can't raise (horse regiments without F03). */
  noArms: string[];
  /** No camel caravans (without F03). */
  noCaravans: boolean;
  /** Share of the food an army carries, in percent (50 without B01). */
  foodCarriedPct: number;
  /** Regiments' strength change in percent (−20 without C01). */
  strengthPct: number;
}

interface WithoutRow {
  harvest_steps?: number;
  no_arms?: string[];
  no_caravans?: boolean;
  food_carried_pct?: number;
  strength_pct?: number;
}

export function without(known: ReadonlySet<string>): Without {
  const out: Without = { harvestSteps: 0, noArms: [], noCaravans: false, foodCarriedPct: 100, strengthPct: 0 };
  for (const [id, row] of Object.entries(config.without as Record<string, WithoutRow>)) {
    if (known.has(id)) continue;
    out.harvestSteps += row.harvest_steps ?? 0;
    out.noArms.push(...(row.no_arms ?? []));
    out.noCaravans ||= row.no_caravans ?? false;
    if (row.food_carried_pct !== undefined) out.foodCarriedPct = Math.min(out.foodCarriedPct, row.food_carried_pct);
    out.strengthPct += row.strength_pct ?? 0;
  }
  return out;
}

// ---------------------------------------------------------------- the study queue (RSCH-108, RSCH-109)

export const QUEUE_LENGTH: number = config.queue_length;

/** What the realm will have known once the current studies and the queue are learned, in that order. */
function plannedSet(p: Programme): Set<string> {
  return new Set([...p.known, ...p.studies.map((s) => s.id), ...p.queue]);
}

/** True when a queued invention can't start yet: its needs are not known now (RSCH-108). */
export function queuedWaiting(p: Programme, id: string, date: Day, t: Tree = tree()): boolean {
  return !eligibility(p, id, date, t).ok;
}

/**
 * After a study is learned: the first queued inventions whose needs are now
 * known become the current studies at once, with no progress lost; one whose
 * needs are not met is skipped and stays queued, waiting (RSCH-108).
 */
export function startFromQueue(p: Programme, date: Day, t: Tree = tree()): string[] {
  const started: string[] = [];
  for (const id of [...p.queue]) {
    if (p.studies.length >= maxStudies(p)) break;
    if (!eligibility(p, id, date, t).ok) continue;
    p.queue = p.queue.filter((q) => q !== id);
    p.studies.push({ id, progress: 0 });
    started.push(id);
  }
  return started;
}

export type QueueRefusal = Refusal | "queue_full" | "queued";

/**
 * Add to queue: an invention whose needs are known, being studied or queued
 * ahead of it goes to the end of the queue (RSCH-109).
 */
export function enqueue(p: Programme, id: string, date: Day, t: Tree = tree()): { ok: true } | { ok: false; reason: QueueRefusal } {
  const inv = t.inventions.get(id);
  if (!inv) return { ok: false, reason: "unknown" };
  if (p.known.has(id)) return { ok: false, reason: "known" };
  if (p.queue.includes(id) || p.studies.some((s) => s.id === id)) return { ok: false, reason: "queued" };
  if (outOfScope(inv) || !withinCampaign(date)) return { ok: false, reason: "out_of_scope" };
  const need = needsMet(p, inv, plannedSet(p));
  if (need) return { ok: false, reason: need };
  if (p.queue.length >= QUEUE_LENGTH) return { ok: false, reason: "queue_full" };
  p.queue.push(id);
  return { ok: true };
}

/**
 * The path to an invention: its missing needs, each after its own, in an
 * order that can be studied, then the invention; what is known, studied or
 * queued already is left out. Where an invention grows from either of two
 * parents, one already had (or else the first) is taken. Refused when a step
 * waits on a contact or lies out of scope (RSCH-109).
 */
export function pathTo(p: Programme, id: string, t: Tree = tree()): { ok: true; path: string[] } | { ok: false; reason: Refusal } {
  const have = plannedSet(p);
  const path: string[] = [];
  const bough = new Set([t.root.id, ...t.boughs.map((b) => b.id)]);
  let refusal: Refusal | null = null;
  const visit = (x: string): void => {
    if (refusal || have.has(x) || bough.has(x)) return;
    const inv = t.inventions.get(x);
    if (!inv) return void (refusal = "unknown");
    if (outOfScope(inv)) return void (refusal = "out_of_scope");
    const parents = [inv.parent, ...inv.or_parents];
    visit(parents.find((q) => have.has(q) || bough.has(q)) ?? inv.parent);
    for (const n of inv.also_needs) visit(n);
    const contact = contactFor(p, inv);
    if (contact && !p.contacts.has(contact)) refusal ??= "contact";
    if (refusal) return;
    have.add(x);
    path.push(x);
  };
  visit(id);
  if (refusal) return { ok: false, reason: refusal };
  return { ok: true, path };
}

/** Queue the path: every missing step to an invention, or none of it when the queue would hold more than 5 (RSCH-109). */
export function queuePath(p: Programme, id: string, date: Day, t: Tree = tree()): { ok: true; added: string[] } | { ok: false; reason: QueueRefusal } {
  if (p.known.has(id)) return { ok: false, reason: "known" };
  if (!withinCampaign(date)) return { ok: false, reason: "out_of_scope" };
  const r = pathTo(p, id, t);
  if (!r.ok) return r;
  if (r.path.length === 0) return { ok: false, reason: "queued" };
  if (p.queue.length + r.path.length > QUEUE_LENGTH) return { ok: false, reason: "queue_full" };
  p.queue.push(...r.path);
  return { ok: true, added: r.path };
}

/** Removes an invention from the queue, and every queued one that needed it (they could never start). */
export function dequeue(p: Programme, id: string, t: Tree = tree()): void {
  p.queue = p.queue.filter((q) => q !== id);
  // What is left must still be reachable in order; drop the ones that no longer are.
  const have = new Set([...p.known, ...p.studies.map((s) => s.id)]);
  const keep: string[] = [];
  for (const q of p.queue) {
    const inv = t.inventions.get(q);
    if (inv && [inv.parent, ...inv.or_parents].some((x) => have.has(x) || isBough(x, t)) && inv.also_needs.every((x) => have.has(x) || isBough(x, t))) {
      keep.push(q);
      have.add(q);
    }
  }
  p.queue = keep;
}

const isBough = (id: string, t: Tree): boolean => id === t.root.id || t.boughs.some((b) => b.id === id);

/**
 * Moves a queued invention one place earlier (−1) or later (+1). A move that
 * would put it ahead of something it needs is refused (RSCH-110).
 */
export function moveInQueue(p: Programme, id: string, by: -1 | 1, t: Tree = tree()): boolean {
  const k = p.queue.indexOf(id);
  const j = k + by;
  if (k < 0 || j < 0 || j >= p.queue.length) return false;
  const [first, second] = by < 0 ? [id, p.queue[j]!] : [p.queue[j]!, id];
  const inv = t.inventions.get(first)!;
  if ((second === inv.parent && !inv.or_parents.some((x) => p.known.has(x))) || inv.also_needs.includes(second)) return false;
  p.queue[k] = p.queue[j]!;
  p.queue[j] = id;
  return true;
}

/** The contact event that opens a contact invention (RSCH-077). */
export function contactOf(id: string, t: Tree = tree()): string | undefined {
  return invention(id, t).contact;
}

/**
 * The AI studies the eligible invention that costs it least now, ties by id
 * (RSCH-078).
 */
export function aiChooseStudy(p: Programme, date: Day, partnersKnowing: Record<string, number> = {}, t: Tree = tree()): string | null {
  let best: { id: string; cost: number } | null = null;
  const ids = [...t.inventions.keys()].sort();
  for (const id of ids) {
    if (p.studies.some((s) => s.id === id)) continue;
    if (!eligibility(p, id, date, t).ok) continue;
    const cost = studyCostFor(p, id, date, partnersKnowing[id] ?? 0, t);
    if (!best || cost < best.cost) best = { id, cost };
  }
  return best?.id ?? null;
}

/**
 * Seats the AI fills: every empty seat while at peace, none while at war; it
 * calls students to arms only at war with no recruits left (RSCH-078).
 */
export function aiSeatsToFill(p: Programme, atWar: boolean): number {
  return atWar ? (config.ai.fill_seats_at_war ? emptySeats(p) : 0) : config.ai.fill_seats_in_peace ? emptySeats(p) : 0;
}

export function aiCallsStudentsToArms(p: Programme, atWar: boolean, recruits: number): boolean {
  return atWar && recruits <= 0 && students(p) > 0;
}

/**
 * Harvest steps a country's inventions give in a year. F16's step lasts 30
 * years from the year it was learned, then ends (RSCH-080).
 */
export function harvestStepsFromInventions(p: Programme, year: number, learnedYear: Record<string, number> = {}, t: Tree = tree()): number {
  let steps = 0;
  for (const id of p.known) {
    const e = t.inventions.get(id)?.effects;
    if (!e?.harvest_steps) continue;
    const lasts = e.harvest_steps_years;
    if (typeof lasts === "number" && year - (learnedYear[id] ?? year) >= lasts) continue;
    steps += e.harvest_steps;
  }
  return steps;
}

/**
 * Who may be made an official: a new graduate, as one of his school's types;
 * with G4 also a working scholar, as any type (RSCH-081).
 */
export function mayBecomeOfficial(p: Programme, who: { graduating: true; school: SchoolType } | { graduating: false }, type: string, t: Tree = tree()): boolean {
  if (who.graduating && graduateOfficialTypes(who.school).includes(type)) return true;
  if (!scholarsCanBecomeOfficials(p, t)) return false;
  return p.scholars > 0 || who.graduating;
}

/** An invention whose effect needs a building only works while the realm has it (RSCH-066: G3, G10 need a chancery). */
export function effectActive(id: string, buildings: ReadonlySet<string>, t: Tree = tree()): boolean {
  const need = invention(id, t).effects?.needs_building;
  return typeof need !== "string" || buildings.has(need);
}
