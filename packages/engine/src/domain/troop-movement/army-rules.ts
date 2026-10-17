import { stepDays as baseStepDays, type MarchMap } from "../../march.ts";
import {
  MARCH,
  MOVE,
  type Army,
  type EnterVerdict,
  type Hemisphere,
  type Mover,
  type MoverRules,
  type MoveWorld,
  type Place,
  type Road,
  type StopReason,
  atWar,
  blockingCastle,
  grantsPassage,
  groundOfPlace,
  hostileArmies,
  isArmy,
  isSubjectOf,
  isWater,
  placeOf,
  sameSide,
  straitBetween,
} from "./model.ts";

// ---- Seasons (4.2, 4.3) ----

const inMonths = (months: readonly number[] | undefined, month: number) => !!months && months.includes(month);
const hemisphereOf = (p: Place): Hemisphere => p.hemisphere ?? "north";

/** Winter by hemisphere: December to February in the north, June to August in the south. */
export const isWinter = (p: Place, month: number): boolean => inMonths(MOVE.winterMonths[hemisphereOf(p)], month);

/** The wet season of the province's climate, from config. */
export const isWetSeason = (p: Place, month: number): boolean =>
  !!p.climate && inMonths((MOVE.wetSeasonMonths as Record<string, number[]>)[p.climate], month);

/** A snow-peak province with no pass and no road is closed December to March (June to September in the south). */
export function snowClosed(p: Place, month: number): boolean {
  if (!p.snowPeak || p.pass || (p.road && p.road !== "track")) return false;
  return inMonths(MOVE.snowClosedMonths[hemisphereOf(p)], month);
}

/** Month index of a date, for floods and other spans. */
export const monthIndex = (d: { year: number; month: number }): number => d.year * 12 + d.month;

/** A named ford counts as a bridge in summer and autumn of its hemisphere (4.1, D-MOVE-10). */
export const fordUsable = (p: Place, month: number): boolean => !!p.ford && inMonths(MOVE.fordMonths[hemisphereOf(p)], month);

/** From December to March a river at latitude 55° or more is frozen and crossed like a bridge (X-17, MOVE-117). */
export const riverFrozen = (p: Place, month: number): boolean =>
  !!p.river && Math.abs(p.latitude ?? 0) >= MOVE.frozenRivers.minLatitude && MOVE.frozenRivers.months.includes(month);

/** A flood (an event) doubles a province's river days for 3 months from the month it starts (4.1, D-MOVE-10). */
export function startFlood(w: MoveWorld, place: string): void {
  placeOf(w, place).floodUntil = monthIndex(w.date) + MOVE.floodMonths;
}
export const flooded = (w: MoveWorld, p: Place): boolean => p.floodUntil !== undefined && monthIndex(w.date) < p.floodUntil;

/** A river of Natural Earth scale rank 0 or 1 is a great river (D-MOVE-10). */
export const riverKindOfRank = (rank: number): "river" | "great river" => (MOVE.greatRiverScaleRanks.includes(rank) ? "great river" : "river");

/** No army forages in dunes (4.4). */
export const canForage = (p: Place): boolean => !p.dunes;

/** The day an army arrives: the day its walked days reach the step days, so a fraction rounds up (13.5 → day 14, D-MOVE-19). */
export const arrivalDay = (days: number): number => Math.ceil(days - 1e-9);

// ---- Step days (3.1) ----

/** Road factor of one province: a pass counts as a road (4.2). */
export function roadOf(p: Place): Road {
  const built = p.road ?? "track";
  if (p.pass && MOVE.roadFactor[built] > MOVE.roadFactor[MOVE.passRoad as Road]) return MOVE.passRoad as Road;
  return built;
}

/** The worse road of the two provinces counts. */
export const roadFactor = (from: Place, to: Place): number => Math.max(MOVE.roadFactor[roadOf(from)], MOVE.roadFactor[roadOf(to)]);

/** +1 day per 10,000 men or part, twice for a great river (4.1). */
export function riverDays(men: number, river: "river" | "great river"): number {
  const per = river === "great river" ? MOVE.greatRiverDaysPer10kMen : MOVE.riverDaysPer10kMen;
  return Math.ceil(men / 10000) * per;
}

/** A bridge is useless while an enemy army holds its province (4.1). */
export function bridgeUsable(w: MoveWorld, a: Army, to: string): boolean {
  return !!placeOf(w, to).bridge && hostileArmies(w, a, to).length === 0;
}

/** River days for this army entering `to`: none over a bridge or a ford in season, doubled in a flood. */
export function riverDaysInto(w: MoveWorld, a: Army, to: string): number {
  const p = placeOf(w, to);
  if (!p.river || bridgeUsable(w, a, to) || fordUsable(p, w.date.month) || riverFrozen(p, w.date.month)) return 0;
  return riverDays(a.men, p.river) * (flooded(w, p) ? 2 : 1);
}

/** 2 days per 10,000 men or part to cross a strait by ferry (4.4). */
export const ferryDays = (men: number): number => Math.ceil(men / 10000) * MOVE.ferryDaysPer10kMen;

/** A strait has a ferry when a harbour on either side is owned by you, an ally or a realm granting passage; an enemy fleet in it closes it. */
export function ferryOpen(w: MoveWorld, a: Army, from: string, to: string): EnterVerdict {
  const s = straitBetween(w, from, to);
  if (!s) return { ok: false, reason: "needs ships" };
  const enemyFleet = w.movers.some((m) => (m.kind === "fleet") && m.place === s.zone && atWar(w, m.owner, a.owner));
  if (enemyFleet) return { ok: false, reason: "strait closed" };
  const ferry = [s.a, s.b].some((id) => {
    const p = placeOf(w, id);
    const o = p.owner;
    return !!p.harbour && !!o && (sameSide(w, o, a.owner) || grantsPassage(w, o, a.owner));
  });
  return ferry ? { ok: true } : { ok: false, reason: "no ferry" };
}

export const gunsSlow = (a: Army): boolean => (a.bombards ?? 0) > 0 || (a.heavyGuns ?? 0) > 0;
const hasGuns = (a: Army): boolean => gunsSlow(a) || (a.lightGuns ?? 0) > 0;
/** Guns cross dunes only with camels (4.4). */
export const dunesBarGuns = (a: Army, p: Place): boolean => !!p.dunes && hasGuns(a) && !a.camels;
export const horseShareBonus = (a: Army): number => 1 + MARCH.horseSpeedBonus * (a.men > 0 ? Math.min(1, a.horse / a.men) : 0);
export const cunningFactor = (a: Army): number => 1 + MOVE.cunningSpeed * (a.commander?.cunning ?? 0);

/** The pace an army walks at: a broken army retreats on forced march (6.2). */
export const paceOf = (a: Army) => (a.broken ? "Forced" : a.pace);

export interface StepBreakdown {
  allowed: boolean;
  reason?: string;
  crossing: number;
  column: number;
  road: number;
  season: number;
  order: number;
  guns: number;
  horse: number;
  cunning: number;
  river: number;
  ferry: boolean;
  /** Which season factor applied, if any. */
  seasonKind?: "winter" | "wet";
  days: number;
}

const twoPlaceMap = (gf: Place, gt: Place): MarchMap => ({
  adjStart: new Int32Array([0, 1, 2]),
  adjList: new Int32Array([1, 0]),
  ground: [groundOfPlace(gf), groundOfPlace(gt)],
  population: [Infinity, Infinity],
  river: [0, 0],
});

/**
 * Days for one step (3.1): crossing × days per crossing × road × season × march order × guns × column
 * ÷ horse share bonus ÷ Cunning + river days. The crossing ÷ horse part is march.ts's own stepDays
 * (no column, no river: those are counted here); season and guns look at the province entered (OQ-MOVE-9).
 */
export function stepBreakdown(w: MoveWorld, a: Army, from: string, to: string): StepBreakdown {
  const pf = placeOf(w, from);
  const pt = placeOf(w, to);
  const none: StepBreakdown = { allowed: false, crossing: 0, column: 0, road: 1, season: 1, order: 1, guns: 1, horse: 1, cunning: 1, river: 0, ferry: false, days: Infinity };
  const strait = straitBetween(w, from, to);
  if (strait && !(w.neighbours[from] ?? []).includes(to)) {
    const f = ferryOpen(w, a, from, to);
    if (!f.ok) return { ...none, reason: f.reason ?? "no ferry", ferry: true };
    return { ...none, allowed: true, ferry: true, days: ferryDays(a.men) };
  }
  const gt = groundOfPlace(pt);
  if (isWater(pf) || !gt) return { ...none, reason: "needs ships" };
  if (pt.glacier) return { ...none, reason: "can't enter" };
  if ((a.bombards ?? 0) > 0 && gt === "mountains" && roadOf(pt) === "track") return { ...none, reason: "guns" };
  if (dunesBarGuns(a, pt)) return { ...none, reason: "guns" };
  const horse = horseShareBonus(a);
  // Dunes count 3 crossings instead of the ground's own (D-MOVE-11): half for each end that is dunes.
  const dunesExtra = [pf, pt].reduce((n, p) => {
    const g = groundOfPlace(p);
    return n + (p.dunes && g ? (MOVE.dunesDaysToCross - (MARCH.daysToCross as Record<string, number>)[g]!) / 2 : 0);
  }, 0);
  const base = baseStepDays(MARCH, twoPlaceMap(pf, pt), 0, 1, { men: a.men, horse: a.horse, logistics: 0 }) + (dunesExtra * MARCH.daysPerCrossing) / horse;
  const crossing = (base * horse) / MARCH.daysPerCrossing;
  const column = pt.forageLimit !== undefined && a.men > pt.forageLimit ? MARCH.bigArmyExtraCrossings : 0;
  const road = roadFactor(pf, pt);
  let season = 1;
  let seasonKind: "winter" | "wet" | undefined;
  const month = w.date.month;
  if (isWinter(pt, month) && MOVE.seasonFactor.winter.grounds.includes(gt)) {
    season *= MOVE.seasonFactor.winter.factor;
    seasonKind = "winter";
  }
  if (isWetSeason(pt, month) && (MOVE.seasonFactor.wet.grounds.includes(gt) || (pt.paddies && MOVE.seasonFactor.wet.grounds.includes("paddies")))) {
    season *= MOVE.seasonFactor.wet.factor;
    seasonKind = "wet";
  }
  const order = MOVE.orderFactor[paceOf(a)];
  const guns = gunsSlow(a) && MOVE.gunsGrounds.includes(gt) ? MOVE.gunsFactor : 1;
  const cunning = cunningFactor(a);
  const river = riverDaysInto(w, a, to);
  const days = ((base + (column * MARCH.daysPerCrossing) / horse) * road * season * order * guns) / cunning + river;
  const out: StepBreakdown = { allowed: true, crossing, column, road, season, order, guns, horse, cunning, river, ferry: false, days };
  if (seasonKind) out.seasonKind = seasonKind;
  return out;
}

export const armyStepDays = (w: MoveWorld, a: Army, from: string, to: string): number => {
  const b = stepBreakdown(w, a, from, to);
  return b.allowed ? b.days : Infinity;
};

/** Step days are kept with their fraction and rounded only for display (3.1). */
export const displayDays = (days: number): number => Math.round(days);

// ---- Whose land (5.3) ----

export type EatsFrom = "locals" | "reserve" | "reserve then plunder" | "reserve unless terms" | "subject's terms";

export interface LandVerdict extends EnterVerdict {
  eats?: EatsFrom;
}

/** May this army's realm enter this place, and what does it eat there (5.3, warfare 6.2)? */
export function landRule(w: MoveWorld, realm: string, place: string): LandVerdict {
  const p = placeOf(w, place);
  if (isWater(p)) return { ok: false, reason: "needs ships" };
  if (p.glacier) return { ok: false, reason: "can't enter" };
  if (snowClosed(p, w.date.month)) return { ok: false, reason: "snow" };
  if (p.rebelHeld) return { ok: true, eats: "reserve then plunder" };
  const o = p.owner ?? null;
  if (o === null) return { ok: true, eats: "reserve then plunder" };
  if (o === realm) return { ok: true, eats: "locals" };
  if (isSubjectOf(w, o, realm)) return { ok: true, eats: (w.relations.subjectFeeds ?? []).includes(o) ? "subject's terms" : "reserve unless terms" };
  if (atWar(w, o, realm)) return { ok: true, eats: "reserve then plunder" };
  if (sameSide(w, o, realm) || grantsPassage(w, o, realm)) return { ok: true, eats: "reserve" };
  return { ok: false, reason: "needs passage", realm: o };
}

/** What this army eats from where it stands; aboard ships it eats from its reserve, as abroad (11.3). */
export function eatsFrom(w: MoveWorld, a: Army): EatsFrom {
  if (a.cargoOf) return "reserve";
  return landRule(w, a.owner, a.place).eats ?? "reserve";
}

export function armyMayEnter(w: MoveWorld, a: Army, place: string): EnterVerdict {
  const v = landRule(w, a.owner, place);
  if (!v.ok) return v;
  const gt = groundOfPlace(placeOf(w, place));
  if ((a.bombards ?? 0) > 0 && gt === "mountains" && roadOf(placeOf(w, place)) === "track") return { ok: false, reason: "guns" };
  if (dunesBarGuns(a, placeOf(w, place))) return { ok: false, reason: "guns" };
  return v;
}

// ---- What stops an army (5) ----

/** The stop checks in order, for an army that has just arrived in `place`. Food is checked by the day loop. */
export function armyStopCheck(w: MoveWorld, a: Army, place: string): StopReason | null {
  if (hostileArmies(w, a, place).length) return "enemy";
  if (blockingCastle(w, a.owner, place)) return "castle";
  const next = a.route[0];
  if (next !== undefined) {
    const v = straitBetween(w, place, next) && !(w.neighbours[place] ?? []).includes(next) ? ferryOpen(w, a, place, next) : armyMayEnter(w, a, next);
    if (!v.ok && v.reason === "needs passage") return "border";
  }
  if (snowClosed(placeOf(w, place), w.date.month) || (next !== undefined && snowClosed(placeOf(w, next), w.date.month))) return "snow";
  if (a.onTheWay === "halt when the enemy is seen" && next !== undefined && visibleEnemyIn(w, a, next)) return "enemy seen";
  return null;
}

export function visibleEnemyIn(w: MoveWorld, a: Army, place: string): boolean {
  return hostileArmies(w, a, place).some((e) => (w.shown?.[a.owner]?.[e.id] ?? e.men) !== null);
}

export const armyRules: MoverRules = {
  stepDays: (w, m, from, to) => (isArmy(m) ? armyStepDays(w, m, from, to) : Infinity),
  mayEnter: (w, m, place) => (isArmy(m) ? armyMayEnter(w, m, place) : { ok: false }),
  stopsAt: (w, m, place) => (isArmy(m) ? armyStopCheck(w, m, place) : null),
};

/** The rules of a mover's kind: armies use this context's; fleets and traders use what naval and trade plug in. */
export function rulesFor(w: MoveWorld, m: Mover): MoverRules {
  if (m.kind === "army") return armyRules;
  const r = w.rules?.[m.kind];
  if (!r) throw new Error(`no rules for ${m.kind}: naval and trade supply them`);
  return r;
}

/** Ports join land and sea (11.2): ships may enter a land province only through its harbour; sea zones are theirs. */
export function shipMayEnterBase(w: MoveWorld, place: string): EnterVerdict {
  const p = placeOf(w, place);
  if (isWater(p)) return { ok: true };
  return p.harbour ? { ok: true } : { ok: false, reason: "no harbour" };
}
