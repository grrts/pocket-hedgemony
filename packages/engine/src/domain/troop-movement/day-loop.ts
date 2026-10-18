import { breakArmy, joinArmies, reachRefuge, type BreakResult } from "./army-ops.ts";
import { armyMayEnter, armyStepDays, armyStopCheck, eatsFrom, rulesFor, snowClosed, visibleEnemyIn } from "./army-rules.ts";
import {
  MARCH,
  MOVE,
  type Army,
  type Mover,
  type MoveWorld,
  type StopReason,
  armiesIn,
  atWar,
  blockingCastle,
  hostileArmies,
  isArmy,
  monthLength,
  moverById,
  neighboursOf,
  placeOf,
  sameSide,
  shownMen,
} from "./model.ts";
import { castleExitAllowed, planRoute } from "./planner.ts";

export type WeeklyStep = "food" | "hunger" | "plunder" | "raids";
export const WEEKLY_STEPS: readonly WeeklyStep[] = ["food", "hunger", "plunder", "raids"];

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

/** A battle being fought over time, one round per 4-hour step (X-1). */
export interface RunningBattle extends Battle {
  /** The player's army or fleet is in it: the day loop slows to 4-hour steps while it runs. */
  player: boolean;
  roundsFought: number;
  /** Rounds left when warfare gave a length at the start; the round hook may end it sooner. */
  roundsLeft: number;
  outcome: BattleOutcome;
}

export interface BattleOutcome {
  /** Rounds (4-hour steps) the battle lasts when warfare decides it at the start; battleSteps.defaultRounds when absent. */
  rounds?: number;
  /** The battle ends this round (from the round hook). */
  ended?: boolean;
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
  /** Warfare's rounds: one round of a running battle; return an outcome with ended to end it (X-1). */
  round?: (w: MoveWorld, b: RunningBattle) => BattleOutcome | void;
  /** Each 4-hour step while a player battle runs: the player may change standing orders, order a retreat (orderRetreat) or switch battles. */
  playerStep?: (w: MoveWorld, day: number, step: number, battles: RunningBattle[]) => void;
  /** The weekly steps at the end of every turn (X-18): army food and hunger, plunder, raids. */
  weekly?: Partial<Record<WeeklyStep, (w: MoveWorld, day: number) => void>>;
  /** Warfare's monthly steps, run once after the day loop: sickness and pay. */
  monthly?: Partial<Record<"sieges" | "sickness" | "pay", (w: MoveWorld) => void>>;
  /** The player's realm: while a battle its armies are in runs, the day is played in 4-hour steps (X-1). */
  player?: string;
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
  /** Weekly steps run, by day (X-3). */
  weekly: { day: number; step: WeeklyStep }[];
  /** The 4-hour steps played while a player battle ran (X-1). */
  steps: { day: number; step: number }[];
  /** Armies that marched into a running battle and joined a side. */
  joinedBattles: { army: string; place: string; day: number; step: number }[];
  /** Battles that ended, with the rounds fought. */
  battleEnds: { place: string; day: number; step: number; rounds: number }[];
  /** Armies that retreated from a running battle on the player's or their standing orders. */
  retreats: { army: string; from: string; to: string | null; day: number; step: number }[];
  /** Armies whose reserve refilled at a weekly food step in their own land, without stopping (D-MOVE-6). */
  refills: { army: string; place: string; day: number }[];
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
  weekly: [],
  steps: [],
  joinedBattles: [],
  battleEnds: [],
  retreats: [],
  refills: [],
  monthly: [],
});

const KIND_ORDER = MOVE.moverKindOrder as readonly string[];
/** Movers in their order of a day (X-2): armies, then fleets, then traders, each kind in ascending id. */
export function moverOrder(movers: readonly Mover[]): Mover[] {
  return [...movers].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

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

const inBattle = (a: Army) => a.inBattle !== undefined;
const running = (w: MoveWorld): RunningBattle[] => (w.battles ??= []);
/** A battle the player's army is in is running: the day loop goes in 4-hour steps (X-1). */
export const playerBattleRunning = (w: MoveWorld): boolean => running(w).some((b) => b.player);

/** Orders an army out of the battle it is in; it leaves at the start of the next round (X-1, MOVE-118). */
export function orderRetreat(w: MoveWorld, armyId: string): void {
  const a = moverById(w, armyId);
  if (a && isArmy(a) && inBattle(a)) a.retreating = true;
}

/** Starts a running battle; its armies stop and stay in it until it ends (X-1). */
export function beginBattle(w: MoveWorld, b: Battle, out: BattleOutcome = {}, player?: string): RunningBattle {
  const rounds = out.rounds ?? MOVE.battleSteps.defaultRounds;
  const rb: RunningBattle = { ...b, player: player !== undefined && [...b.sides[0], ...b.sides[1]].some((id) => moverById(w, id)?.owner === player), roundsFought: 0, roundsLeft: rounds, outcome: out };
  for (const id of [...b.sides[0], ...b.sides[1]]) {
    const a = moverById(w, id);
    if (a && isArmy(a)) a.inBattle = b.place;
  }
  running(w).push(rb);
  return rb;
}

function endBattle(w: MoveWorld, b: RunningBattle, out: BattleOutcome, day: number, step: number, log: MonthLog): void {
  w.battles = running(w).filter((x) => x !== b);
  log.battleEnds.push({ place: b.place, day, step, rounds: b.roundsFought });
  for (const id of [...b.sides[0], ...b.sides[1]]) {
    const a = moverById(w, id);
    if (a && isArmy(a)) {
      delete a.inBattle;
      delete a.retreating;
    }
  }
  if (out.loser === undefined) return;
  for (const id of b.sides[out.loser]) {
    const a = moverById(w, id);
    if (!a || !isArmy(a)) continue;
    const opt: { winnerHeldFieldWithHorse?: boolean; fledMen?: number } = {};
    if (out.winnerHeldFieldWithHorse !== undefined) opt.winnerHeldFieldWithHorse = out.winnerHeldFieldWithHorse;
    if (out.fledMen !== undefined) opt.fledMen = out.fledMen;
    log.broken.push({ army: a.id, day, result: breakArmy(w, a, opt) });
  }
}

/** One round of every running battle, in the order they started (X-1): retreats first, then warfare's round. */
function roundPhase(w: MoveWorld, day: number, step: number, log: MonthLog, hooks: DayHooks): void {
  for (const b of [...running(w)]) {
    for (const k of [0, 1] as const)
      for (const id of [...b.sides[k]]) {
        const a = moverById(w, id);
        if (!a || !isArmy(a) || !a.retreating) continue;
        const enemies = b.sides[1 - k]!.map((x) => moverById(w, x)).filter((x): x is Army => !!x && isArmy(x));
        const theirs = Math.max(0, ...enemies.map((e) => e.commander?.cunning ?? 0));
        b.sides[k] = b.sides[k].filter((x) => x !== id);
        delete a.inBattle;
        delete a.retreating;
        if ((a.commander?.cunning ?? 0) > theirs && !isTrapped(w, a)) {
          const to = withdrawTo(w, a, day);
          if (to !== null) {
            a.cameFrom = a.place;
            a.place = to;
            a.route = [];
            delete a.step;
            a.progress = 0;
          }
          log.retreats.push({ army: a.id, from: b.place, to, day, step });
        } else {
          log.retreats.push({ army: a.id, from: b.place, to: null, day, step });
          log.broken.push({ army: a.id, day, result: breakArmy(w, a, {}) });
        }
      }
    if (!b.sides[0].length || !b.sides[1].length) {
      endBattle(w, b, {}, day, step, log);
      continue;
    }
    b.roundsFought += 1;
    b.roundsLeft -= 1;
    const out = hooks.round?.(w, b);
    if (out && out.ended) endBattle(w, b, out, day, step, log);
    else if (b.roundsLeft <= 0) endBattle(w, b, b.outcome, day, step, log);
  }
}

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

function movePhase(w: MoveWorld, day: number, log: MonthLog, part = 1): Mover[] {
  const arrived: Mover[] = [];
  for (const m of moverOrder(w.movers)) {
    if (isArmy(m)) {
      // Projection of the reserve for the route colour; the food itself is warfare's, monthly.
      if (m.reserve && !["locals", "subject's terms"].includes(eatsFrom(w, m))) m.reserve.days -= part;
      if (m.cargoOf) continue;
      if (inBattle(m)) continue;
      if (m.wintering) continue;
    }
    if (m.cargoOf) continue;
    if ((m.waitDays ?? 0) > 1e-9) {
      m.waitDays = Math.max(0, m.waitDays! - part);
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
    m.progress += part;
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
      // A raider spends a week in each province it enters, then rides on at raid pace (D-MOVE-12).
      if (m.pace === "Raid" && !m.broken) m.waitDays = Math.max(m.waitDays ?? 0, MOVE.raidDaysPerProvince);
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

function contactPhase(w: MoveWorld, day: number, log: MonthLog, hooks: DayHooks, step = 0): void {
  // Armies that marched into a running battle join the side they belong to (X-1, MOVE-119).
  for (const b of running(w))
    for (const a of armiesIn(w, b.place)) {
      if (inBattle(a) || a.broken?.from === b.place) continue;
      const k = ([0, 1] as const).find((i) => b.sides[i].some((id) => { const x = moverById(w, id); return !!x && sameSide(w, x.owner, a.owner); }));
      if (k === undefined) continue;
      b.sides[k].push(a.id);
      a.inBattle = b.place;
      if (a.route.length) stopMarch(a, "enemy", day, log);
      log.joinedBattles.push({ army: a.id, place: b.place, day, step });
    }
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
    for (const a of [...sides[0], ...sides[1]]) if (a.route.length && !a.broken) stopMarch(a, "enemy", day, log);
    beginBattle(w, battle, out, hooks.player);
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
  for (const q of neighboursOf(w, a, a.place).filter((p) => !a.front || a.front.stretch.includes(p)))
    for (const e of hostileArmies(w, a, q)) {
      const shown = shownMen(w, a.owner, e);
      if (shown === null || a.men < shown || (w.rumoured?.[a.owner] ?? []).includes(e.id)) continue;
      const left = e.step && e.route.length ? e.step.days - e.progress : Infinity;
      if (armyStepDays(w, a, a.place, q) < left) return e;
    }
  return null;
}

/**
 * The weekly food step (X-3, D-MOVE-6): an army standing in its own land refills its reserve there
 * (castle store first, then the locals: warfare's amounts) without stopping; elsewhere it eats its reserve.
 */
function weeklyFood(w: MoveWorld, day: number, log: MonthLog): void {
  for (const a of w.movers.filter(isArmy)) {
    if (!a.reserve || a.cargoOf || eatsFrom(w, a) !== "locals" || a.reserve.days >= a.reserve.full) continue;
    a.reserve.days = a.reserve.full;
    log.refills.push({ army: a.id, place: a.place, day });
  }
}

/** Plays days `first` to `last` of the month for every mover at once. */
export function playDays(w: MoveWorld, first: number, last: number, hooks: DayHooks = {}, log: MonthLog = newLog()): MonthLog {
  const perDay = MOVE.battleSteps.perDay;
  for (let day = first; day <= last; day++) {
    for (const s of hooks.scheduled ?? []) if (s.day === day) s.apply(w);
    log.days.push(day);
    if (playerBattleRunning(w)) {
      // X-1: while a player battle runs, the day is six 4-hour steps; every other mover moves a sixth of a day.
      log.phases.push({ day, phase: "move" });
      for (let step = 1; step <= perDay; step++) {
        const arrived = movePhase(w, day, log, 1 / perDay);
        stopChecksPhase(w, arrived, day, log, hooks);
        contactPhase(w, day, log, hooks, step);
        if (playerBattleRunning(w)) {
          log.steps.push({ day, step });
          hooks.playerStep?.(w, day, step, running(w).filter((b) => b.player));
        }
        roundPhase(w, day, step, log, hooks);
      }
      log.phases.push({ day, phase: "stop checks" }, { day, phase: "contact" });
    } else {
      log.phases.push({ day, phase: "move" });
      const arrived = movePhase(w, day, log);
      log.phases.push({ day, phase: "stop checks" });
      stopChecksPhase(w, arrived, day, log, hooks);
      log.phases.push({ day, phase: "contact" });
      contactPhase(w, day, log, hooks);
      // AI battles fight their six rounds at once; a player battle that began today is fought in 4-hour steps.
      for (let step = 1; step <= perDay; step++) {
        if (playerBattleRunning(w)) {
          log.steps.push({ day, step });
          hooks.playerStep?.(w, day, step, running(w).filter((b) => b.player));
        }
        roundPhase(w, day, step, log, hooks);
      }
    }
    log.phases.push({ day, phase: "standing orders" });
    standingOrdersPhase(w, day, log);
    // The weekly steps run at the end of every turn of 7 days (X-18).
    if (day % MOVE.turnDays === 0) {
      weeklyFood(w, day, log);
      for (const k of WEEKLY_STEPS) {
        hooks.weekly?.[k]?.(w, day);
        log.weekly.push({ day, step: k });
      }
    }
  }
  return log;
}


/**
 * A turn is one week (X-18): the day loop plays its 7 days with the weekly steps at the end; the monthly steps
 * (sieges, sickness, pay) run when a new month begins in this turn; the date then moves on 7 days.
 */
export function playTurn(w: MoveWorld, hooks: DayHooks = {}, into: MonthLog = newLog()): MonthLog {
  const start = w.date.day ?? 1;
  const len = monthLength(w);
  const log = playDays(w, 1, MOVE.turnDays, hooks, into);
  if (start === 1 || start + MOVE.turnDays - 1 > len)
    for (const k of ["sieges", "sickness", "pay"] as const) {
      const f = hooks.monthly?.[k];
      if (f) {
        f(w);
        log.monthly.push(k);
      }
    }
  const next = start + MOVE.turnDays;
  if (next > len) w.date = { year: w.date.month === 12 ? w.date.year + 1 : w.date.year, month: (w.date.month % 12) + 1, day: next - len };
  else w.date = { ...w.date, day: next };
  return log;
}

/** The turns of a whole month played back to back: the month's real days, a weekly step every 7th day, then the monthly steps (X-2, X-3, X-18). */
export function playMonth(w: MoveWorld, hooks: DayHooks = {}, into: MonthLog = newLog()): MonthLog {
  const log = playDays(w, 1, monthLength(w), hooks, into);
  for (const k of ["sieges", "sickness", "pay"] as const) {
    const f = hooks.monthly?.[k];
    if (f) {
      f(w);
      log.monthly.push(k);
    }
  }
  return log;
}
