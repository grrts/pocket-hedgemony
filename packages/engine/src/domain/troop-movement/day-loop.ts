import { breakArmy, joinArmies, reachRefuge, type BreakResult } from "./army-ops.ts";
import { armyMayEnter, armyStepDays, armyStopCheck, eatsFrom, rulesFor, snowClosed, visibleEnemyIn } from "./army-rules.ts";
import {
  MARCH,
  type Army,
  type Mover,
  type MoveWorld,
  type StopReason,
  armiesIn,
  atWar,
  blockingCastle,
  hostileArmies,
  isArmy,
  moverById,
  neighboursOf,
  placeOf,
  sameSide,
  shownMen,
} from "./model.ts";
import { castleExitAllowed, planRoute } from "./planner.ts";

/** The order of a day (2.1). */
export const DAY_PHASES = ["move", "stop checks", "contact", "standing orders"] as const;
export type DayPhase = (typeof DAY_PHASES)[number];

export interface Battle {
  place: string;
  day: number;
  /** Army ids on each side. */
  sides: [string[], string[]];
  /** Realm whose castle garrison joins from the walls (warfare 8.5, Relieved). */
  garrisonJoins?: string;
  /** Broken armies caught on the run: they can't withdraw and break again at the first lost sector. */
  caughtBroken: string[];
}

export interface BattleOutcome {
  /** Days the battle lasts (1 to 3, warfare's); 1 when absent. */
  days?: number;
  /** Index of the side that broke. */
  loser?: 0 | 1;
  winnerHeldFieldWithHorse?: boolean;
  fledMen?: number;
}

/** What other contexts plug into the day loop. */
export interface DayHooks {
  /** Warfare's battle rules, started on contact. */
  battle?: (w: MoveWorld, b: Battle) => BattleOutcome | void;
  /** Changes from other contexts that land on a given day (passage withdrawn, castle taken…). */
  scheduled?: { day: number; apply: (w: MoveWorld) => void }[];
  /** Warfare's monthly steps, run once after the day loop. */
  monthly?: Partial<Record<"food" | "sickness" | "sieges" | "pay", (w: MoveWorld) => void>>;
  /** Trade's amount when a raiding army attacks a trader. */
  raidTrader?: (w: MoveWorld, army: Army, trader: Mover) => void;
}

export interface Stop {
  army: string;
  place: string;
  day: number;
  reason: StopReason;
  /** Stopped short of where it was going (route left, greyed). */
  short: boolean;
}

/** The month's replay and everything the notices are made from (MonthReplay). */
export interface MonthLog {
  days: number[];
  phases: { day: number; phase: DayPhase }[];
  entered: { mover: string; from: string; place: string; day: number }[];
  stopChecks: { army: string; place: string; day: number }[];
  stops: Stop[];
  battles: Battle[];
  withdrawals: { army: string; from: string; to: string; day: number }[];
  mustFight: { army: string; day: number }[];
  red: { army: string; place: string; day: number }[];
  joins: { host: string; joined: string; place: string; day: number }[];
  broken: { army: string; day: number; result: BreakResult }[];
  refuges: { army: string; place: string; day: number }[];
  intercepts: { army: string; target: string; place: string; day: number }[];
  lostSight: { army: string; place: string; day: number }[];
  raids: { army: string; trader: string; place: string; day: number }[];
  monthly: string[];
}

export const newLog = (): MonthLog => ({
  days: [],
  phases: [],
  entered: [],
  stopChecks: [],
  stops: [],
  battles: [],
  withdrawals: [],
  mustFight: [],
  red: [],
  joins: [],
  broken: [],
  refuges: [],
  intercepts: [],
  lostSight: [],
  raids: [],
  monthly: [],
});

/** Stops a march where the mover stands; the rest of the route is kept, greyed (5). */
export function stopMarch(m: Mover, reason: StopReason, day: number, log: MonthLog): void {
  const short = m.route.length > 0;
  m.greyed = [...m.route, ...m.greyed];
  m.route = [];
  log.stops.push({ army: m.id, place: m.place, day, reason, short });
}

/** Two hostile armies walking the same border in opposite directions meet in the province of the one with more days still to walk (2.2). */
export function meetingPlace(a: Mover & { step: { days: number } }, b: Mover & { step: { days: number } }): string {
  return a.step.days - a.progress >= b.step.days - b.progress ? a.place : b.place;
}

const inBattle = (a: Army) => (a.battleDaysLeft ?? 0) > 0;

function enterReason(w: MoveWorld, m: Mover, next: string): StopReason | null {
  const rules = rulesFor(w, m);
  const v = rules.mayEnter(w, m, next);
  const days = rules.stepDays(w, m, m.place, next);
  if (isArmy(m) && !castleExitAllowed(w, m, next)) return "castle";
  if (v.ok && Number.isFinite(days)) return null;
  if (!v.ok) return v.reason === "needs passage" ? "border" : (v.reason ?? "blocked");
  if (isArmy(m)) {
    const why = armyMayEnter(w, m, next);
    if (!why.ok) return why.reason ?? "blocked";
  }
  return "strait closed";
}

function movePhase(w: MoveWorld, day: number, log: MonthLog): Mover[] {
  const arrived: Mover[] = [];
  for (const m of [...w.movers]) {
    if (isArmy(m)) {
      // Projection of the reserve for the route colour; the food itself is warfare's, monthly.
      if (m.reserve && !["locals", "subject's terms"].includes(eatsFrom(w, m))) m.reserve.days -= 1;
      if (m.cargoOf) continue;
      if (inBattle(m)) {
        m.battleDaysLeft = m.battleDaysLeft! - 1;
        continue;
      }
      if (m.wintering) continue;
    }
    if (m.cargoOf) continue;
    if ((m.waitDays ?? 0) > 0) {
      m.waitDays = m.waitDays! - 1;
      continue;
    }
    const next = m.route[0];
    if (next === undefined) continue;
    if (!m.step || m.step.to !== next) {
      const why = enterReason(w, m, next);
      if (why) {
        stopMarch(m, why, day, log);
        continue;
      }
      if (m.step) m.progress = 0;
      m.step = { to: next, days: rulesFor(w, m).stepDays(w, m, m.place, next) };
    }
    m.progress += 1;
    if (m.progress + 1e-9 < m.step.days) continue;
    m.progress -= m.step.days;
    const from = m.place;
    m.place = next;
    m.route.shift();
    delete m.step;
    if (!m.route.length) m.progress = 0;
    if (isArmy(m)) {
      m.cameFrom = from;
      m.arrivedOn = day;
    }
    log.entered.push({ mover: m.id, from, place: next, day });
    arrived.push(m);
  }
  for (const m of w.movers) {
    if (!m.cargoOf) continue;
    const f = moverById(w, m.cargoOf);
    if (f) m.place = f.place;
  }
  return arrived;
}

function joinHere(w: MoveWorld, a: Army, day: number, log: MonthLog): void {
  const host = armiesIn(w, a.place).find((b) => b !== a && b.owner === a.owner && !b.broken);
  if (!host) return;
  joinArmies(w, host, a);
  log.joins.push({ host: host.id, joined: a.id, place: a.place, day });
}

function stopChecksPhase(w: MoveWorld, arrived: Mover[], day: number, log: MonthLog, hooks: DayHooks): void {
  for (const m of arrived) {
    if (!w.movers.includes(m)) continue;
    if (!isArmy(m)) {
      const reason = rulesFor(w, m).stopsAt(w, m, m.place, day);
      if (reason) stopMarch(m, reason, day, log);
      continue;
    }
    const a = m;
    log.stopChecks.push({ army: a.id, place: a.place, day });
    if (a.broken) {
      if (a.place === a.broken.refuge) {
        reachRefuge(a);
        log.refuges.push({ army: a.id, place: a.place, day });
      }
      continue;
    }
    if (a.refill?.at === a.place) {
      a.waitDays = Math.max(a.waitDays ?? 0, a.refill.days);
      if (a.reserve) a.reserve.days = a.reserve.full;
      delete a.refill;
    }
    const reason = armyStopCheck(w, a, a.place);
    if (reason) {
      stopMarch(a, reason, day, log);
      if (reason === "snow") a.wintering = a.hungry = true;
    } else if (a.haltReason && !a.route.length) {
      log.stops.push({ army: a.id, place: a.place, day, reason: a.haltReason, short: true });
    }
    delete a.haltReason;
    if (a.reserve && a.reserve.days <= 0 && a.red === undefined) {
      a.red = a.place;
      log.red.push({ army: a.id, place: a.place, day });
    }
    if (a.pace === "Raid")
      for (const t of w.movers)
        if ((t.kind === "trader" || t.kind === "trade ship") && t.place === a.place && atWar(w, a.owner, t.owner)) {
          log.raids.push({ army: a.id, trader: t.id, place: a.place, day });
          hooks.raidTrader?.(w, a, t);
        }
    if (a.joinOnArrival === a.place) {
      delete a.joinOnArrival;
      joinHere(w, a, day, log);
    }
  }
  // Marching armies whose way closed today: passage withdrawn, a pass under snow.
  for (const a of w.movers.filter(isArmy)) {
    if (!a.route.length || a.cargoOf || a.broken) continue;
    if (snowClosed(placeOf(w, a.place), w.date.month)) {
      stopMarch(a, "snow", day, log);
      a.wintering = a.hungry = true;
      continue;
    }
    const v = armyMayEnter(w, a, a.route[0]!);
    if (!v.ok && v.reason === "needs passage") stopMarch(a, "border", day, log);
  }
}

/** Every neighbour it may enter holds an enemy army or castle (6.1). */
export function isTrapped(w: MoveWorld, a: Army): boolean {
  const open = neighboursOf(w, a, a.place).filter((q) => armyMayEnter(w, a, q).ok);
  return open.every((q) => hostileArmies(w, a, q).length > 0 || blockingCastle(w, a.owner, q));
}

/** Where a withdrawing side goes: back where it came from today, or the neighbouring friendly province with the fewest enemies (6.1). */
export function withdrawTo(w: MoveWorld, a: Army, day: number): string | null {
  if (a.arrivedOn === day && a.cameFrom !== undefined) return a.cameFrom;
  let best: string | null = null;
  let fewest = Infinity;
  for (const q of neighboursOf(w, a, a.place)) {
    const owner = placeOf(w, q).owner;
    if (!owner || !sameSide(w, owner, a.owner) || !armyMayEnter(w, a, q).ok) continue;
    const n = hostileArmies(w, a, q).length;
    if (n < fewest) [best, fewest] = [q, n];
  }
  return best;
}

export interface WithdrawCheck {
  wants: boolean;
  getsAway: boolean;
  counted: number;
}

/** "Retreat if outnumbered" against what it sees, a rumour counting at its shown size; it gets away only with higher Cunning and not trapped (6.1). */
export function withdrawCheck(w: MoveWorld, a: Army, enemies: Army[]): WithdrawCheck {
  const counted = enemies.reduce((s, e) => s + (shownMen(w, a.owner, e) ?? 0), 0);
  const wants = !a.broken && a.retreatIfOutnumbered !== undefined && counted / a.men > a.retreatIfOutnumbered;
  const theirs = Math.max(0, ...enemies.map((e) => e.commander?.cunning ?? 0));
  const getsAway = wants && (a.commander?.cunning ?? 0) > theirs && !isTrapped(w, a);
  return { wants, getsAway, counted };
}

function contactPhase(w: MoveWorld, day: number, log: MonthLog, hooks: DayHooks): void {
  // Opposite walkers on one border meet halfway.
  const walkers = w.movers.filter(isArmy).filter((a) => a.step && a.route.length && !a.cargoOf && !inBattle(a));
  for (const a of walkers)
    for (const b of walkers) {
      if (a === b || !a.step || !b.step || a.step.to !== b.place || b.step.to !== a.place || !atWar(w, a.owner, b.owner)) continue;
      const at = meetingPlace(a as Army & { step: { days: number } }, b as Army & { step: { days: number } });
      const mover = at === a.place ? b : a;
      mover.cameFrom = mover.place;
      mover.place = at;
      mover.route.shift();
      delete mover.step;
      mover.progress = 0;
      mover.arrivedOn = day;
      stopMarch(a, "enemy", day, log);
      stopMarch(b, "enemy", day, log);
    }
  const places = [...new Set(w.movers.filter(isArmy).filter((a) => !a.cargoOf).map((a) => a.place))];
  for (const place of places) {
    // A broken army leaving the field it lost on is not fought again there.
    const here = armiesIn(w, place).filter((a) => !inBattle(a) && a.broken?.from !== place);
    const first = here.find((a) => here.some((b) => atWar(w, a.owner, b.owner)));
    if (!first) continue;
    let sides: [Army[], Army[]] = [here.filter((a) => sameSide(w, a.owner, first.owner)), here.filter((a) => atWar(w, a.owner, first.owner))];
    for (const k of [0, 1] as const) {
      const enemies = sides[1 - k]!;
      for (const a of [...sides[k]]) {
        const c = withdrawCheck(w, a, enemies);
        if (!c.wants) continue;
        const to = c.getsAway ? withdrawTo(w, a, day) : null;
        if (to === null) {
          log.mustFight.push({ army: a.id, day });
          continue;
        }
        log.withdrawals.push({ army: a.id, from: a.place, to, day });
        a.cameFrom = a.place;
        a.place = to;
        a.route = [];
        delete a.step;
        a.progress = 0;
        sides = [sides[0].filter((x) => x !== a), sides[1].filter((x) => x !== a)];
      }
    }
    if (!sides[0].length || !sides[1].length) continue;
    const battle: Battle = { place, day, sides: [sides[0].map((a) => a.id), sides[1].map((a) => a.id)], caughtBroken: [...sides[0], ...sides[1]].filter((a) => a.broken).map((a) => a.id) };
    const castle = placeOf(w, place).castle;
    if (castle && castle.garrison > 0) {
      const side = sides.find((s) => s.some((a) => sameSide(w, castle.owner, a.owner)));
      if (side) battle.garrisonJoins = castle.owner;
    }
    log.battles.push(battle);
    const out = hooks.battle?.(w, battle) ?? {};
    for (const a of [...sides[0], ...sides[1]]) {
      a.battleDaysLeft = Math.max(0, (out.days ?? 1) - 1);
      if (a.route.length && !a.broken) stopMarch(a, "enemy", day, log);
    }
    if (out.loser !== undefined)
      for (const a of sides[out.loser]) {
        const opt: { winnerHeldFieldWithHorse?: boolean; fledMen?: number } = {};
        if (out.winnerHeldFieldWithHorse !== undefined) opt.winnerHeldFieldWithHorse = out.winnerHeldFieldWithHorse;
        if (out.fledMen !== undefined) opt.fledMen = out.fledMen;
        log.broken.push({ army: a.id, day, result: breakArmy(w, a, opt) });
      }
  }
}

function standingOrdersPhase(w: MoveWorld, day: number, log: MonthLog): void {
  for (const a of w.movers.filter(isArmy)) {
    if (!w.movers.includes(a) || a.broken || a.cargoOf || inBattle(a)) continue;
    if (a.follow) {
      const t = moverById(w, a.follow.target);
      if (!t || !isArmy(t)) {
        delete a.follow;
      } else {
        const friendly = sameSide(w, a.owner, t.owner);
        const seen = friendly || shownMen(w, a.owner, t) !== null;
        if (seen) a.follow.lastSeen = t.place;
        if (friendly && t.place === a.place) {
          delete a.follow;
          joinArmies(w, t, a);
          log.joins.push({ host: t.id, joined: a.id, place: a.place, day });
          continue;
        }
        const goal = a.follow.lastSeen;
        if (!seen && goal === a.place) {
          delete a.follow;
          a.route = [];
          log.lostSight.push({ army: a.id, place: a.place, day });
          continue;
        }
        if (goal !== undefined && goal !== a.place) a.route = planRoute(w, a, goal).path;
        continue;
      }
    }
    if (a.stance === "attack" && (!a.playerRoute || a.onTheWay === "attack what we see")) {
      const target = interceptTarget(w, a);
      if (target) {
        a.route = [target.place];
        a.greyed = [];
        log.intercepts.push({ army: a.id, target: target.id, place: target.place, day });
      }
    }
    if (a.onTheWay === "halt when the enemy is seen" && a.route.length) {
      const i = a.route.findIndex((p) => visibleEnemyIn(w, a, p));
      if (i === 0) stopMarch(a, "enemy seen", day, log);
      else if (i > 0) {
        a.greyed = [...a.route.slice(i), ...a.greyed];
        a.route = a.route.slice(0, i);
        a.haltReason = "enemy seen";
      }
    }
  }
}

/**
 * Interception (6.3): a visible enemy army in a neighbouring province, no stronger than this army,
 * that it can reach before the enemy finishes its own step.
 */
export function interceptTarget(w: MoveWorld, a: Army): Army | null {
  if (a.stance !== "attack") return null;
  for (const q of neighboursOf(w, a, a.place))
    for (const e of hostileArmies(w, a, q)) {
      const shown = shownMen(w, a.owner, e);
      if (shown === null || a.men < shown) continue;
      const left = e.step && e.route.length ? e.step.days - e.progress : Infinity;
      if (armyStepDays(w, a, a.place, q) < left) return e;
    }
  return null;
}

/** Plays days `first` to `last` of the month for every mover at once. */
export function playDays(w: MoveWorld, first: number, last: number, hooks: DayHooks = {}, log: MonthLog = newLog()): MonthLog {
  for (let day = first; day <= last; day++) {
    for (const s of hooks.scheduled ?? []) if (s.day === day) s.apply(w);
    log.days.push(day);
    log.phases.push({ day, phase: "move" });
    const arrived = movePhase(w, day, log);
    log.phases.push({ day, phase: "stop checks" });
    stopChecksPhase(w, arrived, day, log, hooks);
    log.phases.push({ day, phase: "contact" });
    contactPhase(w, day, log, hooks);
    log.phases.push({ day, phase: "standing orders" });
    standingOrdersPhase(w, day, log);
  }
  return log;
}

/** A monthly turn: the day loop (daysPerMonth days), then food, sickness, sieges and pay once. */
export function playMonth(w: MoveWorld, hooks: DayHooks = {}): MonthLog {
  const log = playDays(w, 1, MARCH.daysPerMonth, hooks);
  for (const k of ["food", "sickness", "sieges", "pay"] as const) {
    const f = hooks.monthly?.[k];
    if (f) {
      f(w);
      log.monthly.push(k);
    }
  }
  return log;
}
