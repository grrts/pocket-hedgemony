import { fastest } from "./planner.ts";
import { armyStopCheck } from "./army-rules.ts";
import {
  MOVE,
  type Army,
  type Commander,
  type Mover,
  type MoveWorld,
  type StopReason,
  armiesIn,
  atWar,
  isWater,
  placeOf,
  sameSide,
} from "./model.ts";

// ---- Splitting and joining (3.3) ----

export interface SplitOptions {
  newId: string;
  /** Share of the army that goes to the second half. */
  share?: number;
  /** The realm knows W14 Army divisions: the split takes no days. */
  armyDivisions?: boolean;
  /** Who leads the second half: a captain, a new commander, or nobody (its senior company captain, Cunning 0). */
  secondLeader?: Commander | null;
}

const part = (n: number | undefined, share: number) => (n === undefined ? undefined : Math.round(n * share));

/** Splits an army in two: 2 days before W14 Army divisions, none after; each half keeps its share. The commander stays with the first half. */
export function splitArmy(w: MoveWorld, a: Army, opt: SplitOptions): { first: Army; second: Army; days: number } {
  const share = opt.share ?? 0.5;
  const days = opt.armyDivisions ? 0 : MOVE.splitDays;
  const second: Army = { ...a, id: opt.newId, route: [], greyed: [], progress: 0, captains: [] };
  delete second.step;
  const fields = ["men", "horse", "bombards", "heavyGuns", "lightGuns", "wagons", "food", "companies"] as const;
  for (const f of fields) {
    const v = part(a[f], share);
    if (v === undefined) continue;
    second[f] = v;
    a[f] = a[f]! - v;
  }
  if (opt.secondLeader) second.commander = opt.secondLeader;
  else second.commander = { name: "senior company captain", cunning: 0 };
  a.waitDays = Math.max(a.waitDays ?? 0, days);
  second.waitDays = days;
  w.movers.push(second);
  return { first: a, second, days };
}

/** Joins two armies in one province in 1 day: everything adds up; the commander with more victories leads, the other becomes a captain if there is room. */
export function joinArmies(w: MoveWorld, host: Army, other: Army, captainRoom = true): { army: Army; days: number; captain?: string } {
  if (host.place !== other.place) throw new Error("armies must stand in the same province");
  const fields = ["men", "horse", "bombards", "heavyGuns", "lightGuns", "wagons", "food", "companies"] as const;
  for (const f of fields) if (host[f] !== undefined || other[f] !== undefined) host[f] = (host[f] ?? 0) + (other[f] ?? 0);
  const [lead, second] =
    (other.commander?.victories ?? -1) > (host.commander?.victories ?? -1) ? [other.commander, host.commander] : [host.commander, other.commander];
  if (lead) host.commander = lead;
  const out: { army: Army; days: number; captain?: string } = { army: host, days: MOVE.joinDays };
  if (second && captainRoom) {
    host.captains = [...(host.captains ?? []), second.name];
    out.captain = second.name;
  }
  if (host.reserve && other.reserve) host.reserve = { days: Math.min(host.reserve.days, other.reserve.days), full: Math.max(host.reserve.full, other.reserve.full) };
  host.waitDays = Math.max(host.waitDays ?? 0, MOVE.joinDays);
  w.movers = w.movers.filter((m) => m !== other);
  return out;
}

// ---- Retreat after a lost battle (6.2) ----

export type BreakResult =
  | { kind: "retreat"; refuge: string; route: string[] }
  | { kind: "surrender"; prisoners: number; commander: "captured" | "escaped" | "none"; capital?: string };

/** The nearest refuge up to `retreatMaxProvinces` away: an own-side castle, failing that any own-side province with no enemy. */
export function findRefuge(w: MoveWorld, a: Army): { refuge: string; route: string[] } | null {
  const was = a.broken;
  a.broken ??= { refuge: "", fledMen: 0 };
  try {
    const own = Object.values(w.places).filter((p) => p.id !== a.place && !isWater(p) && !!p.owner && sameSide(w, p.owner, a.owner));
    const best = (cands: typeof own) => {
      let out: { refuge: string; route: string[]; days: number } | null = null;
      for (const p of cands) {
        const r = fastest(w, a, p.id, MOVE.retreatMaxProvinces);
        if (!r || !r.path.length) continue;
        const days = r.arrive[r.arrive.length - 1]!;
        if (!out || days < out.days) out = { refuge: p.id, route: r.path, days };
      }
      return out;
    };
    // An army on a front retreats along it: refuges on the front come first (8).
    const onFront = a.front ? best(own.filter((p) => a.front!.provinces.includes(p.id) && !armiesIn(w, p.id).some((b) => atWar(w, a.owner, b.owner)))) : null;
    const castle = onFront ?? best(own.filter((p) => p.castle && sameSide(w, p.castle.owner, a.owner)));
    const r = castle ?? best(own.filter((p) => !armiesIn(w, p.id).some((b) => atWar(w, a.owner, b.owner))));
    return r && { refuge: r.refuge, route: r.route };
  } finally {
    if (was) a.broken = was;
    else delete a.broken;
  }
}

/**
 * A side breaks: it drops half its wagons, and its guns if the winner held the field with horse,
 * then marches on forced march to the nearest refuge, or surrenders when trapped.
 */
export function breakArmy(w: MoveWorld, a: Army, opt: { winnerHeldFieldWithHorse?: boolean; fledMen?: number } = {}): BreakResult {
  if (a.wagons !== undefined) a.wagons = Math.ceil(a.wagons / 2);
  if (opt.winnerHeldFieldWithHorse) {
    a.bombards = 0;
    a.heavyGuns = 0;
    a.lightGuns = 0;
  }
  const r = findRefuge(w, a);
  if (!r) {
    w.movers = w.movers.filter((m) => m !== a);
    const cunning = a.commander?.cunning;
    if (cunning === undefined) return { kind: "surrender", prisoners: a.men, commander: "none" };
    if (cunning >= MOVE.escapeCunning) {
      const capital = w.relations.capitals?.[a.owner];
      return capital === undefined ? { kind: "surrender", prisoners: a.men, commander: "escaped" } : { kind: "surrender", prisoners: a.men, commander: "escaped", capital };
    }
    return { kind: "surrender", prisoners: a.men, commander: "captured" };
  }
  a.broken = { refuge: r.refuge, fledMen: opt.fledMen ?? 0, from: a.place };
  a.route = [...r.route];
  a.greyed = [];
  a.besieging = false;
  a.playerRoute = false;
  delete a.follow;
  if (a.step && a.step.to !== a.route[0]) {
    delete a.step;
    a.progress = 0;
  }
  return { kind: "retreat", refuge: r.refuge, route: r.route };
}

/** A broken army that reaches its refuge is an ordinary army again, and its fled men come back. */
export function reachRefuge(a: Army): void {
  if (!a.broken) return;
  a.men += a.broken.fledMen;
  delete a.broken;
}

/** What a broken army drops (for display). */
export const dropsGuns = (winnerHeldFieldWithHorse: boolean): boolean => winnerHeldFieldWithHorse;

// ---- Ships (11.3) ----

export const boardingDays = (men: number): number => Math.ceil(men / MOVE.menPerBoardingDay);
export const landingDays = (men: number, port: boolean): number => boardingDays(men) * (port ? 1 : MOVE.landingNoPortFactor);

/** An army in a port with enough of its own or an ally's ships boards at a day per 5,000 men and becomes cargo. */
export function boardShips(w: MoveWorld, a: Army, fleet: Mover): { ok: boolean; days?: number; reason?: string } {
  if (!placeOf(w, a.place).harbour) return { ok: false, reason: "not a port" };
  if (fleet.place !== a.place) return { ok: false, reason: "no ships here" };
  if (!sameSide(w, fleet.owner, a.owner)) return { ok: false, reason: "not our ships" };
  if ((fleet.room ?? 0) < a.men) return { ok: false, reason: "not enough ships" };
  const days = boardingDays(a.men);
  a.cargoOf = fleet.id;
  a.route = [];
  a.greyed = [];
  delete a.step;
  a.progress = 0;
  return { ok: true, days };
}

/** A fleet in a sea zone lands its army on a neighbouring coast: a day per 5,000 men, twice that with no port; the stop checks apply. */
export function landArmy(w: MoveWorld, a: Army, place: string): { ok: boolean; days?: number; stop?: StopReason | null; reason?: string } {
  const fleet = w.movers.find((m) => m.id === a.cargoOf);
  if (!fleet) return { ok: false, reason: "not aboard" };
  if (!(w.neighbours[fleet.place] ?? []).includes(place) || isWater(placeOf(w, place))) return { ok: false, reason: "not a coast next to the fleet" };
  const days = landingDays(a.men, !!placeOf(w, place).harbour);
  delete a.cargoOf;
  a.cameFrom = fleet.place;
  a.place = place;
  a.waitDays = Math.max(a.waitDays ?? 0, days);
  return { ok: true, days, stop: armyStopCheck(w, a, place) };
}
