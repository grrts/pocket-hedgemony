import { CLASSES, knows, provinceConfig, slotsByClass, totalPeople, workplaces, type ClassName, type Province, type ProvinceConfig } from "./model.ts";

/** People: births, deaths, famine, classes and slots, homeless, refugees, recruits (province stats §6). */

// ---------------------------------------------------------------- births and deaths

/** Base yearly birth rate of a class (PROV-100, PROV-103). Clergy are 0.5 % where they don't marry, else as townsfolk. */
export function birthRate(c: ClassName, opts: { celibateClergy?: boolean } = {}, cfg: ProvinceConfig = provinceConfig): number {
  if (c === "clergy") return opts.celibateClergy === false ? cfg.births.craftsmen : cfg.births.clergy_celibate;
  return (cfg.births as Record<string, number>)[c] ?? 0;
}

/** Base yearly death rate of a class (PROV-100). */
export function deathRate(c: ClassName, cfg: ProvinceConfig = provinceConfig): number {
  return (cfg.deaths as Record<string, number>)[c] ?? 0;
}

export interface DeathConditions {
  plague?: "rumour" | "outbreak" | "worst";
  war?: boolean;
  burnedTiles?: number;
  smoke?: boolean;
  hospitals?: boolean;
  shanty?: boolean;
  known?: string[];
}

/** Change to the yearly death rate for everyone and for town classes (PROV-102, PROV-123). */
export function deathModifiers(c: DeathConditions, cfg: ProvinceConfig = provinceConfig): { everyone: number; town: number } {
  const m = cfg.death_modifiers;
  let everyone = 0;
  let town = 0;
  if (c.plague) everyone += m.plague[c.plague];
  if (c.war) everyone += m.war;
  everyone += (c.burnedTiles ?? 0) * m.per_burned_tile;
  if (c.smoke) town += m.smoke_town;
  if (c.hospitals) town += m.hospitals_town;
  if (c.shanty) town += cfg.homeless.shanty_town_death_extra;
  if (c.known?.includes("sanitation")) everyone += m.sanitation;
  if (c.known?.includes("vaccination")) everyone += m.vaccination;
  return { everyone, town };
}

/** Newborns join their parents' class the month they are born (PROV-111). */
export function addBirths(p: Province, c: ClassName, born: number): void {
  p.people[c] += born;
}

// ---------------------------------------------------------------- famine

export interface FamineResult {
  unfed: number;
  fled: number;
  died: number;
  toStore: number;
  deadByClass: Record<string, number>;
}

/**
 * The seasonal food check (PROV-104 to PROV-106): with enough food everyone eats and the
 * rest goes to the store; otherwise the unfed die, spread over the classes by size, except
 * a quarter who flee as refugees when a neighbour has food. Food is counted in people fed.
 */
export function seasonFood(p: Province, food: number, neighbourHasFood: boolean, cfg: ProvinceConfig = provinceConfig): FamineResult {
  const eaters = totalPeople(p) + p.refugees.reduce((n, r) => n + r.count, 0);
  if (food >= eaters) return { unfed: 0, fled: 0, died: 0, toStore: food - eaters, deadByClass: {} };
  const unfed = eaters - food;
  const fled = neighbourHasFood ? Math.round(unfed * cfg.famine.flee_share) : 0;
  const leaving = unfed;
  const died = unfed - fled;
  // Everyone unfed leaves the classes by size; the dead are that share less those who fled.
  const total = totalPeople(p);
  const deadByClass: Record<string, number> = {};
  let removed = 0;
  CLASSES.forEach((c, k) => {
    const share = total > 0 ? p.people[c] / total : 0;
    const n = k === CLASSES.length - 1 ? leaving - removed : Math.round(leaving * share);
    const take = Math.min(p.people[c], Math.max(0, n));
    p.people[c] -= take;
    removed += take;
    if (take > 0) deadByClass[c] = take;
  });
  for (const c of Object.keys(deadByClass)) deadByClass[c] = Math.round((deadByClass[c]! * died) / leaving);
  return { unfed, fled, died, toStore: 0, deadByClass };
}

// ---------------------------------------------------------------- classes and overflow

function fill(people: number, slots: number): number {
  return slots > 0 ? people / slots : Infinity;
}

/** The class with free slots whose slots are least filled; ties go to food classes first (PROV-112). */
function leastFilled(p: Province, slots: Record<ClassName, number>, exclude: ClassName[], cfg: ProvinceConfig): ClassName | null {
  const food = cfg.classes.food as ClassName[];
  let best: ClassName | null = null;
  for (const c of CLASSES) {
    if (c === "homeless" || exclude.includes(c) || (cfg.classes.no_overflow as string[]).includes(c)) continue;
    if (slots[c] - p.people[c] <= 0) continue;
    if (best === null) {
      best = c;
      continue;
    }
    const a = fill(p.people[c], slots[c]);
    const b = fill(p.people[best], slots[best]);
    if (a < b - 1e-12 || (Math.abs(a - b) <= 1e-12 && food.includes(c) && !food.includes(best))) best = c;
  }
  return best;
}

/**
 * Moves people between classes (PROV-112 to PROV-117): homeless take any open slot first;
 * a class with more people than slots sends the extra to the least-filled class; with no
 * free slot anywhere, the extra become homeless. Overflow never makes scholars or soldiers;
 * a short class leaves its slots empty.
 */
export function balanceClasses(p: Province, cfg: ProvinceConfig = provinceConfig): void {
  const slots = slotsByClass(p, cfg);
  for (let guard = 0; guard < 64 && p.people.homeless > 0; guard++) {
    const to = leastFilled(p, slots, [], cfg);
    if (!to) break;
    const n = Math.min(p.people.homeless, slots[to] - p.people[to]);
    p.people[to] += n;
    p.people.homeless -= n;
  }
  for (const c of CLASSES) {
    if (c === "homeless") continue;
    let extra = p.people[c] - slots[c];
    for (let guard = 0; guard < 64 && extra > 0; guard++) {
      const to = leastFilled(p, slots, [c], cfg);
      const n = to ? Math.min(extra, slots[to] - p.people[to]) : extra;
      p.people[c] -= n;
      if (to) p.people[to] += n;
      else p.people.homeless += n;
      extra -= n;
    }
  }
}

/** Free slots per class (slots minus people, never below zero). */
export function freeSlots(p: Province, cfg: ProvinceConfig = provinceConfig): Record<ClassName, number> {
  const s = slotsByClass(p, cfg);
  return Object.fromEntries(CLASSES.map((c) => [c, Math.max(0, s[c] - p.people[c])])) as Record<ClassName, number>;
}

/** Fleet crews are raised from seafolk (PROV-118). Returns how many were taken. */
export function crewFleet(p: Province, crews: number): number {
  const n = Math.min(crews, p.people.seafolk);
  p.people.seafolk -= n;
  return n;
}

// ---------------------------------------------------------------- homeless

/** Homeless sheltered by almshouses: 3,000 each (PROV-071). */
export function shelteredHomeless(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  const almshouses = p.town.filter((b) => b === "almshouse").length;
  return Math.min(p.people.homeless, almshouses * cfg.almshouse.shelters);
}

/** Homeless who count toward theft, the *Homeless* grievance and shanty camps. */
export function troublesomeHomeless(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  return p.people.homeless - shelteredHomeless(p, cfg);
}

export function troubleShare(p: Province, cfg: ProvinceConfig = provinceConfig): number {
  const all = totalPeople(p);
  return all > 0 ? troublesomeHomeless(p, cfg) / all : 0;
}

/** Weight of the *Homeless* grievance: over a tenth one, over a fifth two (PROV-122, PROV-123). */
export function homelessGrievanceWeight(share: number, cfg: ProvinceConfig = provinceConfig): number {
  if (share > cfg.homeless.shanty_over) return 2;
  if (share > cfg.homeless.grievance_over) return 1;
  return 0;
}

export function shantyCamps(share: number, cfg: ProvinceConfig = provinceConfig): boolean {
  return share > cfg.homeless.shanty_over;
}

/** What shanty camps bring (PROV-123). */
export function shantyEffects(cfg: ProvinceConfig = provinceConfig): { plagueStartsHereFirst: boolean; plagueSpread: number; townDeathExtra: number; townBuildingMayBurnYearly: boolean } {
  return { plagueStartsHereFirst: true, plagueSpread: cfg.homeless.shanty_plague_spread, townDeathExtra: cfg.homeless.shanty_town_death_extra, townBuildingMayBurnYearly: true };
}

/** Where drifting homeless go: the neighbour with the least-filled slots, in the owner's own realm first (PROV-116). */
export function homelessDriftTarget(owner: string | null, neighbours: { id: string; owner: string | null; fill: number }[]): string | null {
  const own = neighbours.filter((n) => n.owner === owner);
  const pool = own.length ? own : neighbours;
  const sorted = [...pool].sort((a, b) => a.fill - b.fill);
  return sorted[0]?.id ?? null;
}

/** Sends homeless as settlers to a colony or frontier (PROV-126, PROV-254). */
export function sendSettlers(from: Province, to: Province, n: number): number {
  const sent = Math.min(n, from.people.homeless);
  from.people.homeless -= sent;
  to.settlers += sent;
  return sent;
}

/** Moves homeless to a neighbouring province, which takes them in (PROV-116, PROV-126). */
export function driftHomeless(from: Province, to: Province, n: number): number {
  const moved = Math.min(n, from.people.homeless);
  from.people.homeless -= moved;
  to.people.homeless += moved;
  balanceClasses(to);
  return moved;
}

// ---------------------------------------------------------------- refugees

export function addRefugees(p: Province, from: string, count: number, cls: ClassName | null = null): void {
  if (cls === "scholars" || cls === "craftsmen") {
    // Fleeing craftsmen and scholars keep their class if a slot is free (PROV-133).
    const free = freeSlots(p)[cls];
    const keep = Math.min(free, count);
    p.people[cls] += keep;
    count -= keep;
  }
  if (count > 0) p.refugees.push({ from, count, months: 0, class: cls });
}

/** Refugees go home when their province is safe (PROV-132). Returns how many left. */
export function refugeesGoHome(p: Province, from: string): number {
  const going = p.refugees.filter((r) => r.from === from).reduce((n, r) => n + r.count, 0);
  p.refugees = p.refugees.filter((r) => r.from !== from);
  return going;
}

/** Refugees age a month; after 2 years they settle into slots by overflow, or become homeless (PROV-132). */
export function ageRefugees(p: Province, months: number, cfg: ProvinceConfig = provinceConfig): void {
  const settleAt = cfg.refugees.settle_years * 12;
  const staying: typeof p.refugees = [];
  for (const r of p.refugees) {
    r.months += months;
    if (r.months >= settleAt) p.people.homeless += r.count;
    else staying.push(r);
  }
  p.refugees = staying;
  balanceClasses(p, cfg);
}

// ---------------------------------------------------------------- faith and tongue

/** Keeps the top three faiths or tongues (PROV-134). */
export function topThree(mix: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(mix)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
  );
}

/** The country's share of a faith or tongue: the people-weighted sum over its provinces (PROV-134). */
export function weightedShare(provinces: { people: number; mix: Record<string, number> }[], key: string): number {
  const all = provinces.reduce((n, p) => n + p.people, 0);
  if (all === 0) return 0;
  return provinces.reduce((n, p) => n + p.people * (p.mix[key] ?? 0), 0) / all;
}

/**
 * Persecution (PROV-135): the people of a faith flee, taking their share out of every class
 * and out of the faith mix; craftsmen among them take their crafts away.
 */
export function persecute(p: Province, faith: string): { fled: number; craftsmen: number } {
  const share = p.faith[faith] ?? 0;
  let fled = 0;
  let craftsmen = 0;
  for (const c of CLASSES) {
    const n = Math.round(p.people[c] * share);
    p.people[c] -= n;
    fled += n;
    if (c === "craftsmen") craftsmen = n;
  }
  const { [faith]: _gone, ...rest } = p.faith;
  const left = Object.values(rest).reduce((a, b) => a + b, 0);
  p.faith = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, left > 0 ? v / left : 0]));
  return { fled, craftsmen };
}

// ---------------------------------------------------------------- recruits, students, scholars

/** Whose the province's recruits are: the owner's for royal provinces, the lord's retinue for a lord's (PROV-141). */
export function recruitsGoTo(p: Province): string {
  if (p.governedBy === "lord" && p.lord) return `retinue of ${p.lord}`;
  if (p.governedBy === "occupied" && p.occupiedBy) return p.occupiedBy;
  return p.owner ?? "nobody";
}

/** Raising recruits takes them out of their class slots (PROV-142); homeless then fill the gaps (PROV-115). */
export function raiseLevy(p: Province, men: number, from: ClassName): number {
  const n = Math.min(men, p.recruits, p.people[from]);
  p.recruits -= n;
  p.people[from] -= n;
  balanceClasses(p);
  return n;
}

/** Soldiers coming home rejoin as homeless and overflow into the emptiest slots (PROV-143). */
export function soldiersReturn(p: Province, men: number): void {
  p.people.homeless += men;
  balanceClasses(p);
}

/** Enrolment: local recruits fill local school seats first, then the realm's (PROV-145). */
export function enrolStudents(seats: number, localRecruits: number, realmRecruits: number): { local: number; realm: number } {
  const local = Math.min(seats, localRecruits);
  const realm = Math.min(seats - local, realmRecruits);
  return { local, realm };
}

/** Students graduating become scholars here (PROV-146, PROV-147). */
export function graduate(p: Province, n: number): void {
  const g = Math.min(n, p.students);
  p.students -= g;
  p.people.scholars += g;
}

/** Workers in the province's slots (everyone but the homeless and idle surplus). */
export function peopleAtWork(p: Province): number {
  return workplaces(p).reduce((n, w) => n + w.workers, 0);
}

export function knowsAny(p: Province, ids: string[]): boolean {
  return ids.some((id) => knows(p, id));
}

/** Students called to arms leave the school (PROV-146). Returns how many went. */
export function callStudentsToArms(p: Province): number {
  const n = p.students;
  p.students = 0;
  return n;
}

/** A sacked school loses its students and the building (PROV-146). */
export function sackSchool(p: Province): void {
  p.students = 0;
  p.town = p.town.filter((b) => b !== "school");
  p.schoolSeats = 0;
}

/** Foreign scholars settle in a town with a school, in peace (PROV-147). */
export function scholarsSettle(p: Province, n: number): number {
  if (!p.town.includes("school") || p.war) return 0;
  p.people.scholars += n;
  return n;
}

/** Scholars lost to old age, war, persecution or a richer neighbour (PROV-147). */
export function loseScholars(p: Province, n: number): void {
  p.people.scholars = Math.max(0, p.people.scholars - n);
}
