import config from "../../../../rules/data/domain/research.json" with { type: "json" };
import type { Rng } from "../../rng.ts";

/**
 * Research (domain/research/spec.md): schools with student seats, students
 * taken from recruits, scholars, scholar-years of progress, and the one
 * invention tree every country climbs from the root *Settled life*.
 * Pure rules: state is plain data the caller owns; nothing here rolls dice.
 */

export type Era = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
export const ERAS: readonly Era[] = config.eras as Era[];

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
}

export interface Invention extends InventionRow {
  era: Era;
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
    if (!ERAS.includes(row.era as Era)) throw new Error(`${row.id}: unknown era ${row.era}`);
    for (const need of [...row.or_parents, ...row.also_needs]) if (!byId.has(need) && !boughIds.has(need)) throw new Error(`${row.id}: unknown need ${need}`);
    inventions.set(row.id, { ...row, era: row.era as Era, bough: boughOf(row.parent, new Set()) });
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
export function countByEra(t: Tree = tree()): Record<Era, number> {
  const out = Object.fromEntries(ERAS.map((e) => [e, 0])) as Record<Era, number>;
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

export const eraIndex = (era: Era): number => ERAS.indexOf(era);

// ---------------------------------------------------------------- cost

/** Scholar-years an era's invention costs (RSCH-030). */
export function eraCost(era: Era): number {
  return config.era_cost[era];
}

/** Cost before discounts: era cost, doubled for each era ahead of the date (RSCH-031). */
export function costBeforeDiscounts(era: Era, date: Day): number {
  const ahead = Math.max(0, eraIndex(era) - eraIndex(eraOf(date)));
  return eraCost(era) * config.ahead_multiplier ** ahead;
}

/** Spread discount in percent: 10 % per neighbour or trade partner who knows it, capped at 60 % (RSCH-034). */
export function spreadDiscountPct(partnersKnowing: number): number {
  return Math.min(config.spread_cap_pct, config.spread_per_partner_pct * Math.max(0, partnersKnowing));
}

/** What studying an invention costs in scholar-years now. */
export function studyCost(id: string, date: Day, partnersKnowing = 0, t: Tree = tree()): number {
  const base = costBeforeDiscounts(invention(id, t).era, date);
  return (base * (100 - spreadDiscountPct(partnersKnowing))) / 100;
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
}

/** The recruit pool research draws on (owned by realm and province). */
export interface RecruitPool {
  recruits: number;
  /** Recruits of single provinces, counted within `recruits`. */
  local?: Record<string, number>;
}

export function newProgramme(country: string, t: Tree = tree()): Programme {
  return { country, known: startingKnowledge(t), contacts: new Set(), studies: [], schools: [], scholars: 0, stopped: false };
}

/** Learns an invention; a known invention is never lost (INV-RSCH-1). */
export function learn(p: Programme, id: string): void {
  p.known.add(id);
  p.studies = p.studies.filter((s) => s.id !== id);
}

export type Refusal = "unknown" | "known" | "parent" | "also_needs" | "contact" | "out_of_scope" | "too_many_studies";

/** Whether an invention may be studied (RSCH-033, RSCH-035, RSCH-045; INV-RSCH-3, INV-RSCH-5). */
export function eligibility(p: Programme, id: string, date: Day, t: Tree = tree()): { ok: true } | { ok: false; reason: Refusal } {
  const inv = t.inventions.get(id);
  if (!inv) return { ok: false, reason: "unknown" };
  if (p.known.has(id)) return { ok: false, reason: "known" };
  if (outOfScope(inv) || !withinCampaign(date)) return { ok: false, reason: "out_of_scope" };
  if (![inv.parent, ...inv.or_parents].some((x) => p.known.has(x))) return { ok: false, reason: "parent" };
  if (!inv.also_needs.every((x) => p.known.has(x))) return { ok: false, reason: "also_needs" };
  if (inv.contact && !p.contacts.has(inv.contact)) return { ok: false, reason: "contact" };
  return { ok: true };
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
  const base = costBeforeDiscounts(invention(id, t).era, date);
  const off = Math.min(config.spread_cap_pct, spreadPerPartnerPct(p, t) * Math.max(0, partnersKnowing));
  return (base * (100 - off)) / 100;
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
 * first, then the realm's (RSCH-004). Every seat filled is one man the army
 * cannot raise (RSCH-020). Returns how many enrolled.
 */
export function fillSeats(p: Programme, pool: RecruitPool, n: number, year: number): number {
  let left = Math.min(n, emptySeats(p), pool.recruits);
  let enrolled = 0;
  for (const school of p.schools) {
    if (!school.open || left <= 0) continue;
    const free = seatsOf(school.type) - school.cohorts.reduce((m, c) => m + c.count, 0);
    const take = Math.min(free, left);
    if (take <= 0) continue;
    const local = pool.local?.[school.province] ?? 0;
    const fromLocal = Math.min(local, take);
    if (pool.local && fromLocal > 0) pool.local[school.province] = local - fromLocal;
    pool.recruits -= take;
    school.cohorts.push({ count: take, enrolledYear: year });
    left -= take;
    enrolled += take;
  }
  if (enrolled > 0) p.stopped = false;
  return enrolled;
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
    s.progress += costBeforeDiscounts(invention(s.id, t).era, date) * config.steal_share_of_cost;
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

/**
 * The inventions a map nation knows at the start: the root and the boughs,
 * every invention whose start regions include a label the nation belongs to
 * (research data), the nation's extra list, and everything those need. No
 * study starts with progress (RSCH-076).
 */
export function startingKnowledgeFor(nation: string, t: Tree = tree()): Set<string> {
  const known = startingKnowledge(t);
  const members = config.start_region_members as Record<string, string[]>;
  const extra = (config.start_extra as Record<string, string[]>)[nation] ?? [];
  const add = (id: string): void => {
    if (known.has(id)) return;
    const inv = t.inventions.get(id);
    if (!inv) return;
    known.add(id);
    const parentKnown = [inv.parent, ...inv.or_parents].some((x) => known.has(x));
    if (!parentKnown) add(inv.parent);
    for (const need of inv.also_needs) add(need);
  };
  for (const inv of t.inventions.values()) {
    if (outOfScope(inv)) continue;
    if (inv.start_regions.some((label) => (members[label] ?? []).includes(nation))) add(inv.id);
  }
  for (const id of extra) add(id);
  return known;
}

/** A programme set up for a map nation at the start. */
export function startingProgramme(nation: string, t: Tree = tree()): Programme {
  const p = newProgramme(nation, t);
  p.known = startingKnowledgeFor(nation, t);
  return p;
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
