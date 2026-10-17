import { monthlyPeople } from "./living.ts";
import { aiTreasury, repayLoan, runLedger, setTax, takeLoan } from "./treasury.ts";
import { monthlyFood } from "./food.ts";
import { monthlyMoods } from "./moods.ts";
import { giveGift, grantFief, inAnyWar, monthlyLords, seizeFief } from "./lords.ts";
import { addDays, DAYS_PER_RATION_MONTH, DAYS_PER_TURN } from "./calendar.ts";
import { corridor, forageRations, monthlyRations, planRoute, planTilePath, tileStepHours, type MarchingArmy } from "./march.ts";
import { marchMap, NO_PATH, tileMarch, updateWeather, type World } from "./world.ts";
import {
  aiCollect,
  appointCommander,
  disbandArmy,
  dismissTroops,
  commissionOfficial,
  hireCompany,
  mergeArmies,
  monthlyRecruits,
  nationPay,
  pickUp,
  recount,
  cancelRecruit,
  recruit,
  releaseCommander,
  splitTroops,
  trainTroops,
  ungoverned,
  weeklyMusters,
} from "./recruit.ts";
import { emptyProvinceEffect } from "./domain/recruiting/index.ts";
import { mayEnter } from "./domain/diplomacy/actions.ts";
import {
  aiDeclarations,
  aiMarches,
  aiRaise,
  answerAiCalls,
  answerCall,
  answerPeace,
  atWar,
  controller,
  declareWar,
  monthlyDiplomacy,
  offerPeace,
  relationState,
  engage,
  fightRound,
  runOccupation,
  syncDate,
  wallsOf,
  type News,
  type PeaceTerms,
} from "./war.ts";

export type Order =
  /** March to a province, to the given tile in it if any (else its centre). */
  | { type: "move"; army: number; to: number; tile?: number }
  | { type: "declareWar"; target: number }
  | { type: "offerPeace"; target: number; terms: PeaceTerms }
  | { type: "answerCall"; call: string; yes: boolean }
  /** Take or turn down a peace the AI offers (its id in the snapshot's peaceOffers). */
  | { type: "answerPeace"; offer: number; yes: boolean }
  /** Call up thousands of men from one province's people; each thousand gathers in two weeks. */
  | { type: "recruit"; province: number; thousands: number }
  /** Take the last thousand off a province's recruit queue, with its levy money back. */
  | { type: "cancelRecruit"; province: number }
  /** The army's commander takes in the garrison troops where it stands. */
  | { type: "pickUp"; army: number }
  /** Commission a province's official as a commander; release one back to his post. */
  | { type: "commission"; province: number }
  | { type: "release"; commander: number }
  /** Train levy foot of an army as another arm. */
  | { type: "train"; army: number; arm: string; men: number }
  /** Send home men of one arm. */
  | { type: "dismiss"; army: number; arm: string; men: number }
  /** Split men of one arm off, under a commander at court or left as the province's garrison. */
  | { type: "split"; army: number; arm: string; men: number; commander?: number }
  | { type: "hire"; company: number }
  | { type: "merge"; army: number; into: number }
  /** Put a commander at the head of an army or garrison troops (swapping with the army he led); -1 leaves the men as a garrison. */
  | { type: "appoint"; army: number; commander: number }
  | { type: "disband"; army: number }
  /** Set a province's tax rate (index into TAX_RATES, -1 = the realm default), or the realm default when province is -1. */
  | { type: "setTax"; province: number; rate: number }
  /** Borrow gold from lenders, or pay some of it back. */
  | { type: "borrow"; gold: number }
  | { type: "repay"; gold: number }
  /** Give a lord gold, grant him a royal province, or take a province back from its lord. */
  | { type: "gift"; lord: number }
  | { type: "grantFief"; province: number; lord: number }
  | { type: "seizeFief"; province: number };

export type MoveOrder = Extract<Order, { type: "move" }>;

export interface TurnReport {
  turn: number;
  rejectedOrders: { order: Order; reason: string }[];
  news: News[];
}

/** A day is played as six 4-hour steps: armies march a step at a time and battles fight a round a step (TIME-027). */
export const STEPS_PER_DAY = 6;
export const HOURS_PER_STEP = 24 / STEPS_PER_DAY;
export const STEPS_PER_TURN = STEPS_PER_DAY * DAYS_PER_TURN;

/** Orders act at once, whenever they are given: a march sets off with the next step of the clock. */
export function applyNow(world: World, order: Order, actingNation: number): TurnReport {
  const news: News[] = [];
  const reason = applyOrder(world, order, actingNation, news);
  return { turn: world.turn, rejectedOrders: reason ? [{ order, reason }] : [], news };
}

/**
 * Plays the world on by a number of 4-hour steps. Each step marches every
 * army, finds the enemies that come within reach of each other and fights a
 * round of every battle; each day ends with food, sieges and occupation, each
 * week with musters and the AI's plans, and the 1st of each month brings the
 * monthly steps. Only seeded randomness is used, so the same world played the
 * same way always gives the same result.
 */
export function advance(world: World, steps: number): News[] {
  const news: News[] = [];
  for (let s = 0; s < steps; s++) {
    if (world.step === 0) startDay(world, news);
    stepMarches(world, HOURS_PER_STEP);
    engage(world, news);
    fightRound(world, news);
    for (let i = 0; i < world.armies.count; i++) if (world.armies.alive[i] && world.armies.men[i]! < 1) world.armies.alive[i] = 0;
    if (++world.step === STEPS_PER_DAY) {
      world.step = 0;
      endDay(world, news);
    }
  }
  return news;
}

/**
 * Applies orders, then plays a whole turn (one week). Kept for tests and the
 * benchmark; the game plays the week a day or a step at a time (advance).
 */
export function processTurn(world: World, orders: readonly Order[], actingNation: number): TurnReport {
  const rejectedOrders: TurnReport["rejectedOrders"] = [];
  const news: News[] = [];
  for (const order of orders) {
    const reason = applyOrder(world, order, actingNation, news);
    if (reason) rejectedOrders.push({ order, reason });
  }
  news.push(...advance(world, STEPS_PER_TURN - world.step));
  return { turn: world.turn, rejectedOrders, news };
}

function startDay(world: World, news: News[]): void {
  syncDate(world);
  // The 1st of the month: pools refill, pay, diplomacy, the AI's monthly choices.
  if (world.day > 0 && world.date.day === 1) {
    monthlyPeople(world, news);
    monthlyFood(world, news);
    monthlyMoods(world, news);
    monthlyLords(world, (n) => !inAnyWar(world, n), news);
    monthlyRecruits(world, news);
    runLedger(world, true);
    aiTreasury(world, news);
    monthlyDiplomacy(world, news);
    aiDeclarations(world, news);
    aiRaise(world, news);
  }
  if (world.day % DAYS_PER_TURN === 0) aiMarches(world);
}

function endDay(world: World, news: News[]): void {
  feedArmies(world);
  runOccupation(world, world.date.day === 1, news);
  world.date = addDays(world.date, 1);
  world.day++;
  updateWeather(world);
  syncDate(world);
  if (world.day % DAYS_PER_TURN === 0) {
    weeklyMusters(world, news);
    aiCollect(world, news);
    recount(world);
    runLedger(world, false);
    answerAiCalls(world, news);
    world.turn++;
  }
}

function applyOrder(world: World, order: Order, actingNation: number, news: News[]): string | null {
  switch (order.type) {
    case "declareWar":
      return declareWar(world, actingNation, order.target, news);
    case "offerPeace":
      return offerPeace(world, actingNation, order.target, order.terms, news);
    case "answerPeace":
      return answerPeace(world, order.offer, order.yes, news);
    case "answerCall": {
      const call = world.diplomacy.calls.find((c) => c.id === order.call && c.called === world.nationIds[actingNation] && !c.answer);
      if (!call) return "no such call to arms";
      answerCall(world, call, order.yes, news);
      return null;
    }
    case "recruit":
      return recruit(world, actingNation, order.province, order.thousands, news);
    case "cancelRecruit":
      return cancelRecruit(world, actingNation, order.province);
    case "pickUp":
      return pickUp(world, actingNation, order.army);
    case "commission":
      return commissionOfficial(world, actingNation, order.province, news);
    case "release":
      return releaseCommander(world, actingNation, order.commander);
    case "train":
      return trainTroops(world, actingNation, order.army, order.arm, order.men, news);
    case "dismiss":
      return dismissTroops(world, actingNation, order.army, order.arm, order.men);
    case "split":
      return splitTroops(world, actingNation, order.army, order.arm, order.men, order.commander);
    case "hire":
      return hireCompany(world, actingNation, order.company, news);
    case "merge":
      return mergeArmies(world, actingNation, order.army, order.into);
    case "appoint":
      return appointCommander(world, actingNation, order.army, order.commander);
    case "disband":
      return disbandArmy(world, actingNation, order.army);
    case "setTax":
      return setTax(world, actingNation, order.province, order.rate, news);
    case "borrow":
      return takeLoan(world, actingNation, order.gold, news);
    case "repay":
      return repayLoan(world, actingNation, order.gold);
    case "gift":
      return giveGift(world, actingNation, order.lord);
    case "grantFief":
      return grantFief(world, actingNation, order.province, order.lord);
    case "seizeFief":
      return seizeFief(world, actingNation, order.province, news);
    case "move":
      return orderMarch(world, order, actingNation);
  }
}

/** An enemy castle with men inside stands in province p and stops nation n's armies (warfare 5.5). */
export function blockingCastle(world: World, p: number, n: number): boolean {
  return world.provinceGarrison[p]! > 0 && wallsOf(world, p) !== null && atWar(world, controller(world, p), n);
}

/**
 * Whether a blocking castle where the army stands keeps it from stepping to
 * `to`: it may only go back the way it came, or into land its own side holds.
 */
export function castleBars(world: World, slot: number, to: number): boolean {
  const a = world.armies;
  const n = a.owner[slot]!;
  if (!blockingCastle(world, a.location[slot]!, n) || to === a.cameFrom[slot]) return false;
  return !ownSide(world, n, to);
}

/** Land nation n's armies may always step into: its own side's. */
function ownSide(world: World, n: number, to: number): boolean {
  const holder = controller(world, to);
  if (holder === n) return true;
  const tie = relationState(world, n, holder).state;
  return tie === "alliance" || tie === "subject" || tie === "overlord";
}

/**
 * Whether nation n's armies may march into province q: unclaimed land, its own
 * side's, an enemy's, or a realm that gave it passage (DIPL-116).
 */
export function mayMarchInto(world: World, n: number, q: number): boolean {
  const holder = controller(world, q);
  if (holder < 0 || ownSide(world, n, q)) return true;
  return mayEnter(world.diplomacy, world.nationIds[n]!, world.nationIds[holder]!);
}

/**
 * Steps an army of `slot` may not take when planning: into land it has no
 * right to enter, and (with `castles`) out of an enemy castle's province,
 * but back the way it came from where it stands.
 */
export function routeBars(world: World, slot: number, castles = true): (p: number, q: number) => boolean {
  const here = world.armies.location[slot]!;
  const n = world.armies.owner[slot]!;
  return (p, q) => !mayMarchInto(world, n, q) || (castles && (p === here ? castleBars(world, slot, q) : blockingCastle(world, p, n) && !ownSide(world, n, q)));
}

/** Leaves out of a march's corridor the land nation n may not enter, but where the army stands. */
function keepToRights(world: World, n: number, here: number, allowed: Uint8Array): void {
  for (let p = 0; p < allowed.length; p++) if (allowed[p] && p !== here && !mayMarchInto(world, n, p)) allowed[p] = 0;
}

export function marching(world: World, slot: number): MarchingArmy {
  const a = world.armies;
  const c = a.commander[slot]!;
  return { men: a.men[slot]!, horse: a.horse[slot]!, logistics: c >= 0 ? world.commanderLogistics[c]! : 0 };
}

/** The army stops where it stands. */
export function halt(world: World, slot: number): void {
  const a = world.armies;
  a.route[slot] = [];
  a.path[slot] = NO_PATH;
  a.pathAt[slot] = 0;
  a.progress[slot] = 0;
}

/** Whether the army has a march under way. */
export function isMarching(world: World, slot: number): boolean {
  const a = world.armies;
  return a.route[slot]!.length > 0 || a.pathAt[slot]! < a.path[slot]!.length;
}

/** A march to a province, to a chosen tile in it when given, else to its centre. */
function orderMarch(world: World, order: MoveOrder, n: number): string | null {
  const a = world.armies;
  const i = order.army;
  if (i < 0 || i >= a.count || !a.alive[i]) return "no such army";
  if (a.owner[i] !== n) return "not your army";
  if (a.commander[i]! < 0) return "troops without a commander can't march: give them one";
  if (a.battle[i]! >= 0) return "the army is fighting a battle";
  if (a.retreating[i]) return "the army is falling back and won't take orders until it gets there";
  if (order.to < 0 || order.to >= world.provinceCount || world.provinceWater[order.to]) return "armies need ships to cross water";
  const target = order.tile !== undefined && world.tiles.province[order.tile]! - 1 === order.to ? order.tile : world.tiles.centre[order.to]!;
  if (target === a.tile[i]) {
    // Marching to where it stands is a halt.
    halt(world, i);
    return null;
  }
  return marchTo(world, i, order.to, target);
}

const corridorScratch = new WeakMap<World, Uint8Array>();

/**
 * Plans a march for army `slot` to a tile in province `to`: the fastest road
 * over the provinces, then the walk over the tiles of that road and the land
 * beside it. Returns why it can't go, or null.
 */
export function marchTo(world: World, slot: number, to: number, target: number = world.tiles.centre[to]!): string | null {
  const a = world.armies;
  const here = a.location[slot]!;
  const army = marching(world, slot);
  if (to !== here && !mayMarchInto(world, a.owner[slot]!, to)) {
    if (!planRoute(world.rules.defines.march, marchMap(world), here, to, army)) return "no road there over land";
    return `you have no right to march into ${world.rules.nations[controller(world, to)]?.name ?? "that land"}: you need war or passage`;
  }
  // The best road no enemy castle bars; failing that, the road up to the first castle in the way, where the army stops.
  // Either way only through land the army may enter.
  const route = to === here ? { path: [] as number[] } : (planRoute(world.rules.defines.march, marchMap(world), here, to, army, routeBars(world, slot)) ?? planRoute(world.rules.defines.march, marchMap(world), here, to, army, routeBars(world, slot, false)));
  if (!route) return "no road there over land";
  if (route.path.length && castleBars(world, slot, route.path[0]!)) return "an enemy castle bars the road: go back, or take it first";
  let allowed = corridorScratch.get(world);
  if (!allowed) corridorScratch.set(world, (allowed = new Uint8Array(world.provinceCount)));
  corridor(marchMap(world), [here, ...route.path], allowed);
  keepToRights(world, a.owner[slot]!, here, allowed);
  const walk = world.tiles.coarse
    ? { tiles: Int32Array.from(route.path, (p) => world.tiles.centre[p]!) }
    : planTilePath(tileMarch(world), a.tile[slot]!, target, allowed, army);
  a.route[slot] = route.path.slice();
  a.progress[slot] = 0;
  a.pathAt[slot] = 0;
  // Without a walk through the corridor, the army goes province by province.
  a.path[slot] = walk ? walk.tiles : NO_PATH;
  if (!walk && !route.path.length) return "no way over the land there";
  return null;
}

/** Stretches walked a province at a time take a nearly fastest way (the AI plans many each day). */
const LEG_GREED = 1.6;

/** The next stretch of a march planned province by province: to the centre of the next province on the route. */
function planLeg(world: World, slot: number): boolean {
  const a = world.armies;
  const next = a.route[slot]![0]!;
  if (world.tiles.coarse) {
    a.path[slot] = Int32Array.of(world.tiles.centre[next]!);
    a.pathAt[slot] = 0;
    return true;
  }
  let allowed = corridorScratch.get(world);
  if (!allowed) corridorScratch.set(world, (allowed = new Uint8Array(world.provinceCount)));
  // Through the two provinces alone first, the land beside them too if that finds no way.
  allowed.fill(0);
  allowed[a.location[slot]!] = 1;
  allowed[next] = 1;
  const m = tileMarch(world);
  const army = marching(world, slot);
  let walk = planTilePath(m, a.tile[slot]!, world.tiles.centre[next]!, allowed, army, LEG_GREED);
  if (!walk) {
    corridor(marchMap(world), [a.location[slot]!, next], allowed);
    keepToRights(world, a.owner[slot]!, a.location[slot]!, allowed);
    walk = planTilePath(m, a.tile[slot]!, world.tiles.centre[next]!, allowed, army, LEG_GREED);
  }
  a.path[slot] = walk ? walk.tiles : NO_PATH;
  a.pathAt[slot] = 0;
  return !!walk;
}

/**
 * Every army that isn't fighting walks its hours along its tiles. Stepping
 * into another province it checks the walls there: an enemy castle with men
 * inside bars the way on (warfare 5.5) and stops an army that comes in.
 */
function stepMarches(world: World, hours: number): void {
  const m = tileMarch(world);
  const a = world.armies;
  const tiles = world.tiles;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.battle[i]! >= 0) continue;
    if (a.pathAt[i]! >= a.path[i]!.length) {
      if (!a.route[i]!.length) {
        a.progress[i] = 0;
        a.retreating[i] = 0;
        continue;
      }
      if (!planLeg(world, i)) {
        halt(world, i);
        a.retreating[i] = 0;
        continue;
      }
    }
    const army = marching(world, i);
    let have = a.progress[i]! + hours;
    while (a.pathAt[i]! < a.path[i]!.length) {
      const next = a.path[i]![a.pathAt[i]!]!;
      const into = tiles.province[next]! - 1;
      const owner = a.owner[i]!;
      // Inside a province with an enemy castle the army goes where it likes, but leaves only the way it came.
      if (into !== a.location[i] && (castleBars(world, i, into) || !mayMarchInto(world, owner, into))) {
        halt(world, i);
        have = 0;
        break;
      }
      const cost = tileStepHours(m, a.tile[i]!, next, army);
      if (have < cost) break;
      have -= cost;
      a.tile[i] = next;
      a.pathAt[i] = a.pathAt[i]! + 1;
      a.trail[i]!.push(next);
      if (into !== a.location[i]) {
        a.cameFrom[i] = a.location[i]!;
        a.location[i] = into;
        const k = a.route[i]!.indexOf(into);
        if (k >= 0) a.route[i]!.splice(0, k + 1);
      }
      if (a.pathAt[i]! >= a.path[i]!.length && a.route[i]!.length && !planLeg(world, i)) {
        halt(world, i);
        have = 0;
        break;
      }
    }
    if (a.pathAt[i]! >= a.path[i]!.length && !a.route[i]!.length) {
      a.path[i] = NO_PATH;
      a.pathAt[i] = 0;
      a.retreating[i] = 0;
      have = 0;
    }
    a.progress[i] = have;
  }
}

/**
 * A day's food. Every army eats a day of rations from its wagons and refills
 * them from the land where it stands; what the land can't make up is hunger:
 * men desert and die, and horses are eaten.
 */
function feedArmies(world: World): void {
  const d = world.rules.defines.march;
  const map = marchMap(world);
  const a = world.armies;
  const day = 1 / DAYS_PER_RATION_MONTH;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const army = marching(world, i);
    const need = monthlyRations(d, army) * day;
    a.food[i] = a.food[i]! - need;
    const room = monthlyRations(d, army) * d.monthsCarried - a.food[i]!;
    a.food[i] = a.food[i]! + Math.max(0, Math.min(room, forageRations(d, map, a.location[i]!) * day));
    if (a.food[i]! < 0) {
      const short = Math.min(1, -a.food[i]! / need);
      const loss = d.hungerLossPerMonth * day * short;
      a.men[i] = Math.round(a.men[i]! * (1 - loss));
      a.horse[i] = Math.round(a.horse[i]! * (1 - loss));
      a.food[i] = 0;
    }
  }
}

