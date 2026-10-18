import warfareData from "../../rules/data/domain/warfare.json" with { type: "json" };
import buildingsData from "../../rules/data/domain/buildings.json" with { type: "json" };
import * as rs from "./domain/research/index.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { controller } from "./war.ts";
import { inAnyWar } from "./lords.ts";
import { recount, sendHome } from "./recruit.ts";
import { noteInvention } from "./achievements.ts";

/**
 * Research (milestone 4, first slice): wires the research context
 * (domain/research/spec.md) into the turn. Each realm keeps a research
 * programme: what it knows, the one invention it studies, its schools with
 * students taken from the recruit pools, and its scholars. Each month the
 * scholars and students add a twelfth of their year's scholar-years to the
 * study; each January students graduate, old scholars retire and schools are
 * paid for through the ledger.
 *
 * Not in this slice: the academy's second study, stealing, sacking, poaching,
 * foreign scholars and contact events (contact inventions are simply never
 * eligible), and the schools' place in the buildings list.
 */

export type { Programme, SchoolType } from "./domain/research/index.ts";

/** A school being founded: it opens when its months have passed. */
export interface Founding {
  nation: number;
  province: number;
  type: rs.SchoolType;
  monthsLeft: number;
}

export interface ResearchState {
  /** Each realm's research programme, by nation index. */
  research: rs.Programme[];
  /** Students each realm wants enrolled (the player's seats setting; the AI sets its own each month). */
  researchSeats: Int32Array;
  /** Schools being founded. */
  researchFounding: Founding[];
  /** Harvest steps each realm's inventions give (worked out from what it knows). */
  researchHarvest: Int8Array;
  /** Realms owning land that borders each realm's by land (for spread), refreshed monthly. */
  researchNeighbours: number[][];
}

export function createResearchState(N: number): ResearchState {
  return { research: [], researchSeats: new Int32Array(N), researchFounding: [], researchHarvest: new Int8Array(N), researchNeighbours: Array.from({ length: N }, () => []) };
}

/** People (thousands) a province needs to count as a town where a school can be founded (the map draws a town from here). */
export const TOWN_PEOPLE = 25;

/** The temple school's step in the buildings data: gold and months to found one (RSCH-083, D-RSCH-19). */
const SCHOOL_STEP = (buildingsData.buildings as { id: string; steps: { cost: { gold: number | null; months: number | null } }[] }[]).find((b) => b.id === "school")!.steps[0]!.cost;
export const SCHOOL_GOLD = SCHOOL_STEP.gold ?? 60;
export const SCHOOL_MONTHS = SCHOOL_STEP.months ?? 12;

/** Starting scholars: a realm that knows how to build schools has more learned men (RSCH-082, D-RSCH-18). */
const START_SCHOLARS = { schooled: 5, unschooled: 2 };

/** Whether realm n knows an invention. Other systems gate on this (castles, roads, arms). */
export function knows(world: World, n: number, inventionId: string): boolean {
  return world.research[n]?.known.has(inventionId) ?? false;
}

/** The set of what realm n knows (empty for no realm). */
export function knownSet(world: World, n: number): ReadonlySet<string> {
  return world.research[n]?.known ?? EMPTY;
}
const EMPTY: ReadonlySet<string> = new Set();

const ARM_UNLOCK = warfareData.arms as Record<string, { unlock?: string }>;

/** Whether realm n may train an arm: one its realm had at the start, or whose invention it knows (warfare arms' `unlock`). */
export function armUnlocked(world: World, n: number, arm: string): boolean {
  const unlock = ARM_UNLOCK[arm]?.unlock ?? "start";
  return unlock === "start" || knows(world, n, unlock);
}

/** The school a realm founds: a madrasa where it knows L2, else a temple or monastery school (RSCH-003). */
function schoolTypeFor(p: rs.Programme): rs.SchoolType | null {
  if (p.known.has(rs.schoolInvention("madrasa"))) return "madrasa";
  if (p.known.has(rs.schoolInvention("temple_or_monastery_school"))) return "temple_or_monastery_school";
  return null;
}

/** Schools of a realm as other systems read them: province index, type, open, seats and students. */
export function schoolsOf(world: World, n: number): { province: number; type: rs.SchoolType; open: boolean; seats: number; students: number }[] {
  const p = world.research[n];
  if (!p) return [];
  return p.schools.map((s) => ({ province: world.provinceIndex.get(s.province) ?? -1, type: s.type, open: s.open, seats: rs.seatsOf(s.type), students: s.cohorts.reduce((t, c) => t + c.count, 0) }));
}

// ---------------------------------------------------------------- the start

/**
 * What each realm knows in 1444 (RSCH-076), and its first school: one in its
 * capital, a madrasa where it knows L2, else a temple or monastery school
 * (founded by the clergy where the realm knows neither, RSCH-001), half its
 * seats filled from recruits in cohorts of the last five years, and a few
 * scholars (RSCH-082, D-RSCH-18).
 */
export function seedResearch(world: World): void {
  const year = world.date.year;
  const land = landOf(world);
  world.research = world.rules.nations.map((def, n) => {
    const p = rs.startingProgramme(def.id);
    p.country = world.nationIds[n]!;
    const capital = world.provinceIndex.get(def.capital);
    const type = schoolTypeFor(p);
    p.scholars = type ? START_SCHOLARS.schooled : START_SCHOLARS.unschooled;
    if (capital === undefined || world.provinceOwner[capital] !== n) return p;
    const school = rs.gainSchool(p, world.provinceIds[capital]!, type ?? "temple_or_monastery_school", type ? "build" : "clergy_founds");
    const want = Math.floor(rs.seatsOf(school.type) / 2);
    const got = Math.floor(takeRecruits(world, n, want, land[n]));
    const years = rs.researchConfig.graduation_years;
    for (let k = 0; k < years; k++) {
      const count = Math.floor(got / years) + (k < got % years ? 1 : 0);
      if (count > 0) school.cohorts.push({ count, enrolledYear: year - years + 1 + k });
    }
    world.researchSeats[n] = rs.students(p);
    return p;
  });
  refreshNeighbours(world);
  for (let n = 0; n < world.nationCount; n++) refreshHarvest(world, n);
}

// ---------------------------------------------------------------- recruits

/** Each realm's provinces, by nation index. */
function landOf(world: World): number[][] {
  const out: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0) out[world.provinceOwner[p]!]!.push(p);
  return out;
}

/**
 * Takes up to `men` recruits from realm n's held provinces, each giving the
 * same share of its pool; returns how many. `land` lists the realm's
 * provinces when the caller has it.
 */
function takeRecruits(world: World, n: number, men: number, land?: readonly number[]): number {
  if (men <= 0) return 0;
  const held = (land ?? landOf(world)[n]!).filter((p) => world.provinceOwner[p] === n && controller(world, p) === n);
  let pool = 0;
  for (const p of held) pool += world.provinceRecruits[p]!;
  const take = Math.min(men, Math.floor(pool));
  if (take <= 0) return 0;
  const share = take / pool;
  for (const p of held) world.provinceRecruits[p] = world.provinceRecruits[p]! * (1 - share);
  return take;
}

/** Recruits realm n holds now (its pools in provinces it owns and holds). */
function heldRecruits(world: World, n: number): number {
  return world.nationLevies[n]!;
}

/** Enrols students from recruits until the realm has as many as it wants (RSCH-004, RSCH-020). */
function enrol(world: World, n: number, land?: readonly number[]): number {
  const p = world.research[n]!;
  const want = Math.min(world.researchSeats[n]!, rs.seats(p)) - rs.students(p);
  if (want <= 0) return 0;
  const got = takeRecruits(world, n, want, land);
  return rs.fillSeats(p, { recruits: got }, got, world.date.year);
}

// ---------------------------------------------------------------- spread and effects

/** Realms owning a province that borders one of each realm's by land (RSCH-034). */
function refreshNeighbours(world: World): void {
  const out: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < world.provinceCount; p++) {
    const a = world.provinceOwner[p]!;
    if (a < 0 || world.provinceWater[p]) continue;
    for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
      const q = world.adjList[k]!;
      const b = world.provinceOwner[q]!;
      if (b < 0 || b === a || world.provinceWater[q]) continue;
      if (!out[a]!.includes(b)) out[a]!.push(b);
    }
  }
  world.researchNeighbours = out;
}

/** Neighbours of realm n who already know an invention (each makes it cheaper, RSCH-034). */
export function partnersKnowing(world: World, n: number, id: string): number {
  let k = 0;
  for (const m of world.researchNeighbours[n] ?? []) if (world.research[m]?.known.has(id)) k++;
  return k;
}

function partnersFor(world: World, n: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of world.research[n]!.studies) out[s.id] = partnersKnowing(world, n, s.id);
  return out;
}

/** Harvest steps from F1, F12, F14, F15 and later inventions (PROV-295 moves the roll a band per step). */
function refreshHarvest(world: World, n: number): void {
  const p = world.research[n];
  world.researchHarvest[n] = p ? rs.harvestStepsFromInventions(p, world.date.year) : 0;
}

/** Gold a month realm n's open schools cost (RSCH-021, RSCH-070: the school's yearly upkeep over twelve months). */
export function schoolUpkeepMonthly(world: World, n: number): number {
  const p = world.research[n];
  return p ? rs.schoolUpkeep(p) / 12 : 0;
}

const nameOf = (id: string): string => rs.invention(id).name.replace(/_/g, " ");

function learned(world: World, n: number, id: string, news: News[]): void {
  refreshHarvest(world, n);
  noteInvention(world, n, id);
  if (n === world.player) news.push({ kind: "invention", text: `Learned ${nameOf(id)}. Choose the next study.`, nations: [n] });
}

// ---------------------------------------------------------------- the month

/**
 * The monthly research step (spec §9): schools being founded open, the AI
 * chooses its study and seats (RSCH-078), students enrol up to the seats
 * wanted, and a twelfth of the year's scholar-years goes into each realm's
 * study (RSCH-067). Each January cohorts of five years graduate (RSCH-006)
 * and old scholars are lost (RSCH-075); the schools' upkeep is a ledger line.
 */
export function monthlyResearch(world: World, news: News[]): void {
  const date = { year: world.date.year, month: world.date.month, day: world.date.day ?? 1 };
  // Spread is worked out again each January (spec §9).
  if (date.month === 1) refreshNeighbours(world);
  const land = landOf(world);
  world.researchFounding = world.researchFounding.filter((f) => {
    if (--f.monthsLeft > 0) return true;
    const p = world.research[f.nation];
    if (!p || world.provinceOwner[f.province] !== f.nation) return false;
    const school = rs.gainSchool(p, world.provinceIds[f.province]!, f.type, p.known.has(rs.schoolInvention(f.type)) ? "build" : "clergy_founds");
    if (f.nation === world.player) news.push({ kind: "invention", text: `A ${schoolName(school.type)} opens in ${world.rules.provinces[f.province]!.name}: ${rs.seatsOf(school.type)} more seats.`, nations: [f.nation], province: f.province });
    return false;
  });
  for (let n = 0; n < world.nationCount; n++) {
    const p = world.research[n];
    if (!p || world.nationGone[n]) continue;
    if (date.month === 1) {
      rs.graduateYear(p, date.year);
      rs.changeScholars(p, "old_age", rs.oldAgeLoss(p));
    }
    if (n !== world.player) aiResearch(world, n, date);
    enrol(world, n, land[n]);
    for (const id of rs.researchMonth(p, date, partnersFor(world, n))) learned(world, n, id, news);
    // The AI chooses its next study at once, so it never sits idle a month.
    if (n !== world.player) aiChoose(world, n, date);
  }
  recount(world);
}

/** The AI (RSCH-078): the eligible invention cheapest now; every empty seat in peace, none at war; students to arms at war with no recruits left. */
function aiResearch(world: World, n: number, date: rs.Day): void {
  const p = world.research[n]!;
  const war = inAnyWar(world, n);
  if (rs.aiCallsStudentsToArms(p, war, heldRecruits(world, n))) {
    callToArms(world, n);
  } else {
    world.researchSeats[n] = rs.students(p) + rs.aiSeatsToFill(p, war);
  }
  aiChoose(world, n, date);
}

function aiChoose(world: World, n: number, date: rs.Day): void {
  const p = world.research[n]!;
  if (p.studies.length > 0) return;
  // rs.aiChooseStudy's rule (cheapest now, ties by id) in one pass over the ids sorted once.
  let pick: string | null = null;
  let best = Infinity;
  // Only an invention with a known parent can be open, so only the known inventions' children are tried.
  const children = (childIndex ??= buildChildIndex());
  const tried = new Set<string>();
  for (const k of p.known) for (const c of children.get(k) ?? []) if (!p.known.has(c)) tried.add(c);
  for (const id of [...tried].sort()) {
    if (!rs.eligibility(p, id, date).ok) continue;
    const cost = rs.studyCostFor(p, id, date, partnersKnowing(world, n, id));
    if (cost < best) [pick, best] = [id, cost];
  }
  if (pick) rs.setStudy(p, pick, date);
}
let childIndex: Map<string, string[]> | undefined;
function buildChildIndex(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const inv of rs.tree().inventions.values()) for (const parent of [inv.parent, ...inv.or_parents]) (out.get(parent) ?? out.set(parent, []).get(parent)!).push(inv.id);
  return out;
}

function callToArms(world: World, n: number): number {
  const p = world.research[n]!;
  const pool = { recruits: 0 };
  const men = rs.callStudentsToArms(p, pool);
  sendHome(world, n, men);
  world.researchSeats[n] = 0;
  return men;
}

// ---------------------------------------------------------------- orders

const dateOf = (world: World): rs.Day => ({ year: world.date.year, month: world.date.month, day: world.date.day ?? 1 });

/** SetStudy: one study at a time; choosing another drops the progress on the old one (RSCH-083, D-RSCH-19). */
export function setStudy(world: World, n: number, id: string): string | null {
  const p = world.research[n];
  if (!p) return "no such realm";
  if (p.studies.some((s) => s.id === id)) return null;
  const ok = rs.eligibility(p, id, dateOf(world));
  if (!ok.ok) return REFUSAL[ok.reason] ?? "that can't be studied now";
  p.studies = [];
  rs.setStudy(p, id, dateOf(world));
  return null;
}

const REFUSAL: Partial<Record<rs.Refusal, string>> = {
  unknown: "no such invention",
  known: "you know that already",
  parent: "you must first know what it grows from",
  also_needs: "it needs other inventions first",
  contact: "it needs contact with lands that know it",
  out_of_scope: "that lies beyond this age",
};

/** SetSeatsToFill: how many students to keep; more enrol from recruits at once, fewer go back to them (RSCH-004, RSCH-020). */
export function setSeats(world: World, n: number, count: number): string | null {
  const p = world.research[n];
  if (!p) return "no such realm";
  if (!Number.isInteger(count) || count < 0) return "seats are a whole number";
  const seats = rs.seats(p);
  if (seats === 0) return "you have no open school";
  world.researchSeats[n] = Math.min(count, seats);
  const extra = rs.students(p) - world.researchSeats[n]!;
  if (extra > 0) sendHome(world, n, rs.loseStudents(p, "called_to_arms", extra));
  else enrol(world, n);
  recount(world);
  return null;
}

/** CallStudentsToArms: the schools empty into recruits at once and research stops until students enrol again (RSCH-022). */
export function callStudentsToArms(world: World, n: number): string | null {
  const p = world.research[n];
  if (!p || rs.students(p) === 0) return "no students to call";
  callToArms(world, n);
  recount(world);
  return null;
}

export const schoolName = (type: rs.SchoolType): string => (type === "temple_or_monastery_school" ? "temple school" : type);

const NO_GOLD = "not enough gold";

/** Why realm n can't found a school in province p now, or null. */
export function cantFoundSchool(world: World, n: number, p: number): string | null {
  const prog = world.research[n];
  if (!prog) return "no such realm";
  if (!schoolTypeFor(prog)) return "you must know Temple and monastery schools or Madrasa networks";
  if (p < 0 || p >= world.provinceCount || world.provinceWater[p]) return "no such province";
  if (world.provinceOwner[p] !== n || controller(world, p) !== n) return "not a province you hold";
  const capital = world.provinceIndex.get(world.rules.nations[n]!.capital) === p;
  if (!capital && world.provincePopulation[p]! < TOWN_PEOPLE) return "schools are founded in towns";
  if (prog.schools.some((s) => s.province === world.provinceIds[p]) || world.researchFounding.some((f) => f.province === p)) return "there is a school there already";
  if (world.nationTreasury[n]! < SCHOOL_GOLD) return NO_GOLD;
  return null;
}

/** FoundSchool: pays the temple school's gold now; it opens after its months (buildings `school` step 1). */
export function foundSchool(world: World, n: number, p: number): string | null {
  const why = cantFoundSchool(world, n, p);
  if (why) return why;
  world.nationTreasury[n] = world.nationTreasury[n]! - SCHOOL_GOLD;
  world.researchFounding.push({ nation: n, province: p, type: schoolTypeFor(world.research[n]!)!, monthsLeft: SCHOOL_MONTHS });
  return null;
}

// ---------------------------------------------------------------- what the UI reads

export interface InventionView {
  id: string;
  name: string;
  era: string;
  unlocks: string;
}

export interface StudyOption extends InventionView {
  /** Scholar-years it costs now, and months at the realm's pace now (null when research does not move). */
  cost: number;
  months: number | null;
  /** From an era later than today's: it costs double for each era ahead. */
  ahead: boolean;
  /** Neighbours who know it (each makes it cheaper). */
  partners: number;
}

export interface ResearchView {
  era: string;
  /** The year each era begins (RSCH-032). */
  eraStarts: Record<string, number>;
  study: (StudyOption & { progress: number }) | null;
  /** Scholar-years a year at the current pace (0 when research is stopped). */
  perYear: number;
  stopped: boolean;
  scholars: number;
  students: number;
  seats: number;
  /** Students the realm wants enrolled (the seats setting). */
  seatsWanted: number;
  /** Recruits the realm holds now. */
  recruits: number;
  schools: { province: number; type: string; seats: number; students: number; open: boolean }[];
  founding: { province: number; type: string; monthsLeft: number }[];
  /** Gold a year the schools cost. */
  upkeep: number;
  /** Founding a school: gold, months, the type it would be (null when it can't be built yet), and the provinces it can go in. */
  found: { gold: number; months: number; type: string | null; provinces: number[] };
  options: StudyOption[];
  known: InventionView[];
  harvestSteps: number;
  /** Arms the realm may train now. */
  arms: string[];
}

const view = (inv: rs.Invention): InventionView => ({ id: inv.id, name: inv.name.replace(/_/g, " "), era: inv.era, unlocks: inv.unlocks });

/** Scholar-years a year realm n puts into a study now (with its research inventions, RSCH-074). */
function paceFor(p: rs.Programme, id: string | null): number {
  if (p.stopped || !p.schools.some((s) => s.open)) return 0;
  const base = rs.researchPerYear(p.scholars, rs.students(p));
  return id ? base * (1 + rs.researchBonusPct(p, id) / 100) : base;
}

/** The player's Research tab. */
export function researchView(world: World, n: number, arms: readonly string[]): ResearchView | null {
  const p = world.research[n];
  if (!p) return null;
  const date = dateOf(world);
  const era = rs.eraOf(date);
  const option = (inv: rs.Invention): StudyOption => {
    const partners = partnersKnowing(world, n, inv.id);
    const cost = rs.studyCostFor(p, inv.id, date, partners);
    const pace = paceFor(p, inv.id);
    const progress = p.studies.find((s) => s.id === inv.id)?.progress ?? 0;
    return { ...view(inv), cost, months: pace > 0 ? Math.max(1, Math.ceil(((cost - progress) / pace) * 12)) : null, ahead: rs.eraIndex(inv.era) > rs.eraIndex(era), partners };
  };
  const t = rs.tree();
  const options: StudyOption[] = [];
  const known: InventionView[] = [];
  for (const inv of t.inventions.values()) {
    if (p.known.has(inv.id)) known.push(view(inv));
    else if (rs.eligibility(p, inv.id, date, t).ok) options.push(option(inv));
  }
  const eraOrder = (a: InventionView, b: InventionView) => rs.eraIndex(a.era as rs.Era) - rs.eraIndex(b.era as rs.Era);
  // Within an era the cheapest come first.
  options.sort((a, b) => eraOrder(a, b) || a.cost - b.cost || a.name.localeCompare(b.name));
  known.sort((a, b) => eraOrder(a, b) || a.name.localeCompare(b.name));
  const study = p.studies[0];
  const type = schoolTypeFor(p);
  const provinces: number[] = [];
  // Towns where a school could go, gold aside: the tab says when the treasury is short.
  if (type) for (let q = 0; q < world.provinceCount; q++) if (world.provinceOwner[q] === n && [null, NO_GOLD].includes(cantFoundSchool(world, n, q))) provinces.push(q);
  return {
    era,
    eraStarts: rs.researchConfig.era_dates,
    study: study ? { ...option(rs.invention(study.id)), progress: study.progress } : null,
    perYear: paceFor(p, study?.id ?? null),
    stopped: p.stopped,
    scholars: p.scholars,
    students: rs.students(p),
    seats: rs.seats(p),
    seatsWanted: world.researchSeats[n]!,
    recruits: heldRecruits(world, n),
    schools: schoolsOf(world, n).map((s) => ({ ...s, type: schoolName(s.type) })),
    founding: world.researchFounding.filter((f) => f.nation === n).map((f) => ({ province: f.province, type: schoolName(f.type), monthsLeft: f.monthsLeft })),
    upkeep: rs.schoolUpkeep(p),
    found: { gold: SCHOOL_GOLD, months: SCHOOL_MONTHS, type: type ? schoolName(type) : null, provinces },
    options,
    known,
    harvestSteps: world.researchHarvest[n]!,
    arms: arms.filter((a) => armUnlocked(world, n, a)),
  };
}

/** Every realm's research at a glance, for its country card: inventions known, its study and how far along. */
export function realmResearch(world: World): { known: number; study: string | null; pct: number }[] {
  return world.research.map((p) => {
    const s = p.studies[0];
    if (!s) return { known: p.known.size, study: null, pct: 0 };
    const cost = rs.studyCostFor(p, s.id, dateOf(world));
    return { known: p.known.size, study: nameOf(s.id), pct: Math.min(99, Math.floor((s.progress / cost) * 100)) };
  });
}

// ---------------------------------------------------------------- saves and the hash

interface SavedProgramme {
  known: string[];
  contacts: string[];
  studies: rs.Study[];
  schools: rs.School[];
  scholars: number;
  stopped: boolean;
  seats: number;
}

export interface SavedResearch {
  /** By the save's nation index. */
  realms: (SavedProgramme | null)[];
  founding: Founding[];
}

export function saveResearch(world: World): SavedResearch {
  return {
    realms: world.research.map((p, n) => ({ known: [...p.known], contacts: [...p.contacts], studies: p.studies, schools: p.schools, scholars: p.scholars, stopped: p.stopped, seats: world.researchSeats[n]! })),
    founding: world.researchFounding,
  };
}

/** Puts saved research back, nations and provinces mapped to this build; realms the save lacks keep their 1444 start. */
export function restoreResearch(world: World, saved: SavedResearch, mapNation: (old: number) => number, mapProvince: (old: number) => number): void {
  saved.realms.forEach((s, old) => {
    const n = mapNation(old);
    if (!s || n < 0) return;
    const p = world.research[n]!;
    p.known = new Set(s.known.filter((id) => rs.tree().inventions.has(id) || rs.startingKnowledge().has(id)));
    p.contacts = new Set(s.contacts);
    p.studies = s.studies.filter((x) => rs.tree().inventions.has(x.id)).map((x) => ({ ...x }));
    p.schools = s.schools.filter((x) => world.provinceIndex.has(x.province)).map((x) => ({ ...x, cohorts: x.cohorts.map((c) => ({ ...c })) }));
    p.scholars = s.scholars;
    p.stopped = s.stopped;
    world.researchSeats[n] = s.seats;
  });
  world.researchFounding = saved.founding.map((f) => ({ ...f, nation: mapNation(f.nation), province: mapProvince(f.province) })).filter((f) => f.nation >= 0 && f.province >= 0);
  refreshNeighbours(world);
  for (let n = 0; n < world.nationCount; n++) refreshHarvest(world, n);
}

let treeIndex: Map<string, number> | undefined;

/** Research as numbers for the world hash: per realm what it knows, its study, scholars, students and seats; then the schools being founded. */
export function researchHashData(world: World): Float64Array {
  const index = (treeIndex ??= new Map([...rs.startingKnowledge(), ...rs.tree().inventions.keys()].map((id, k) => [id, k + 1])));
  const out: number[] = [];
  world.research.forEach((p, n) => {
    let knownSum = 0;
    for (const id of p.known) knownSum += (index.get(id) ?? 0) ** 2;
    out.push(p.known.size, knownSum, p.scholars, p.stopped ? 1 : 0, world.researchSeats[n]!, p.schools.length);
    for (const s of p.studies) out.push(index.get(s.id) ?? 0, s.progress);
    for (const s of p.schools) {
      out.push(world.provinceIndex.get(s.province) ?? -1, rs.SCHOOL_TYPES.indexOf(s.type), s.open ? 1 : 0);
      for (const c of s.cohorts) out.push(c.count, c.enrolledYear);
    }
  });
  for (const f of world.researchFounding) out.push(f.nation, f.province, rs.SCHOOL_TYPES.indexOf(f.type), f.monthsLeft);
  return Float64Array.from(out);
}
