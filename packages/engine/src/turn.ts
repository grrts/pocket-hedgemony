import { addDays, DAYS_PER_RATION_MONTH, DAYS_PER_TURN, monthBeginning } from "./calendar.ts";
import { forageRations, monthlyRations, planRoute, stepDays, type MarchingArmy } from "./march.ts";
import { marchMap, type World } from "./world.ts";
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
  recruit,
  releaseCommander,
  splitTroops,
  trainTroops,
  ungoverned,
  weeklyMusters,
} from "./recruit.ts";
import { emptyProvinceEffect } from "./domain/recruiting/index.ts";
import {
  aiDeclarations,
  aiMarches,
  aiRaise,
  answerAiCalls,
  answerCall,
  atWar,
  controller,
  declareWar,
  monthlyDiplomacy,
  offerPeace,
  relationState,
  runBattles,
  runOccupation,
  syncDate,
  wallsOf,
  type News,
  type PeaceTerms,
} from "./war.ts";

export type Order =
  | { type: "move"; army: number; to: number }
  | { type: "declareWar"; target: number }
  | { type: "offerPeace"; target: number; terms: PeaceTerms }
  | { type: "answerCall"; call: string; yes: boolean }
  /** Call up thousands of men from one province's people; each thousand gathers in two weeks. */
  | { type: "recruit"; province: number; thousands: number }
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
  | { type: "hire"; arm: string }
  | { type: "merge"; army: number; into: number }
  /** Put a commander at the head of an army or garrison troops (swapping with the army he led); -1 leaves the men as a garrison. */
  | { type: "appoint"; army: number; commander: number }
  | { type: "disband"; army: number };

export type MoveOrder = Extract<Order, { type: "move" }>;

export interface TurnReport {
  turn: number;
  rejectedOrders: { order: Order; reason: string }[];
  news: News[];
}

/** Orders that act at once, between turns (declaring war, peace, raising levies); moves wait for the turn. */
export function applyNow(world: World, order: Order, actingNation: number): TurnReport {
  const news: News[] = [];
  const reason = applyOrder(world, order, actingNation, news);
  return { turn: world.turn, rejectedOrders: reason ? [{ order, reason }] : [], news };
}

/**
 * Advances the world by one turn (one month). Phases run in a fixed order and
 * only use seeded randomness, so the same world plus the same orders always
 * produces the same result.
 */
export function processTurn(world: World, orders: readonly Order[], actingNation: number): TurnReport {
  const rejectedOrders: TurnReport["rejectedOrders"] = [];
  const news: News[] = [];
  world.armies.movedThisTurn.fill(0);
  syncDate(world);

  for (const order of orders) {
    const reason = applyOrder(world, order, actingNation, news);
    if (reason) rejectedOrders.push({ order, reason });
  }
  aiMarches(world);

  // Orders, the day loop and its battles, the weekly steps, then the monthly
  // steps in the turn a new month begins (decisions X-1, X-2, X-18).
  const moved = runMarches(world);
  runBattles(world, moved, news);
  for (let i = 0; i < world.armies.count; i++) if (world.armies.alive[i] && world.armies.men[i]! < 1) world.armies.alive[i] = 0;
  const newMonth = monthBeginning(world.date) !== null;
  runOccupation(world, newMonth, news);
  weeklyMusters(world, news);
  aiCollect(world, news);
  if (newMonth) monthlyRecruits(world, news);
  else recount(world);
  runEconomy(world, newMonth);
  if (newMonth) {
    monthlyDiplomacy(world, news);
    aiDeclarations(world, news);
    aiRaise(world, news);
  }
  answerAiCalls(world, news);
  world.date = addDays(world.date, DAYS_PER_TURN);
  world.turn++;
  syncDate(world);

  return { turn: world.turn, rejectedOrders, news };
}

function applyOrder(world: World, order: Order, actingNation: number, news: News[]): string | null {
  const a = world.armies;
  switch (order.type) {
    case "declareWar":
      return declareWar(world, actingNation, order.target, news);
    case "offerPeace":
      return offerPeace(world, actingNation, order.target, order.terms, news);
    case "answerCall": {
      const call = world.diplomacy.calls.find((c) => c.id === order.call && c.called === world.nationIds[actingNation] && !c.answer);
      if (!call) return "no such call to arms";
      answerCall(world, call, order.yes, news);
      return null;
    }
    case "recruit":
      return recruit(world, actingNation, order.province, order.thousands, news);
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
      return hireCompany(world, actingNation, order.arm, news);
    case "merge":
      return mergeArmies(world, actingNation, order.army, order.into);
    case "appoint":
      return appointCommander(world, actingNation, order.army, order.commander);
    case "disband":
      return disbandArmy(world, actingNation, order.army);
    case "move": {
      if (order.army < 0 || order.army >= a.count || !a.alive[order.army]) return "no such army";
      if (a.owner[order.army] !== actingNation) return "not your army";
      if (a.movedThisTurn[order.army]) return "army already moved this turn";
      if (world.provinceWater[order.to]) return "armies need ships to cross water";
      if (a.commander[order.army]! < 0) return "troops without a commander can't march: give them one";
      a.movedThisTurn[order.army] = 1;
      if (order.to === a.location[order.army]) {
        // Marching to where it stands is a halt.
        a.route[order.army] = [];
        a.progress[order.army] = 0;
        return null;
      }
      const route = planRoute(world.rules.defines.march, marchMap(world), a.location[order.army]!, order.to, marching(world, order.army));
      if (!route) {
        a.movedThisTurn[order.army] = 0;
        return "no road there over land";
      }
      if (castleBars(world, order.army, route.path[0]!)) {
        a.movedThisTurn[order.army] = 0;
        return "an enemy castle bars the road: go back, or take it first";
      }
      a.route[order.army] = route.path;
      a.progress[order.army] = 0;
      return null;
    }
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
  const holder = controller(world, to);
  if (holder === n) return false;
  const tie = relationState(world, n, holder).state;
  return tie !== "alliance" && tie !== "subject" && tie !== "overlord";
}

export function marching(world: World, slot: number): MarchingArmy {
  const a = world.armies;
  const c = a.commander[slot]!;
  return { men: a.men[slot]!, horse: a.horse[slot]!, logistics: c >= 0 ? world.commanderLogistics[c]! : 0 };
}

/**
 * A month on the march. Every army eats its month of rations from its wagons
 * when it sets out (or sits still), walks as far along its route as the days
 * allow, then refills its wagons from the land where it stops. What the land
 * can't make up is hunger: men desert and die, and horses are eaten.
 */
function runMarches(world: World): Set<number> {
  const d = world.rules.defines.march;
  const map = marchMap(world);
  const a = world.armies;
  const moved = new Set<number>();
  // Where armies stood when the week began: a march halts on meeting an enemy there.
  const standing = new Map<number, number[]>();
  for (let i = 0; i < a.count; i++) if (a.alive[i]) standing.set(a.location[i]!, [...(standing.get(a.location[i]!) ?? []), a.owner[i]!]);
  const enemyAt = (p: number, owner: number) => (standing.get(p) ?? []).some((o) => atWar(world, owner, o));
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const army = marching(world, i);
    // A week's rations, at a month's rations over 30 days.
    const week = DAYS_PER_TURN / DAYS_PER_RATION_MONTH;
    const need = monthlyRations(d, army) * week;
    a.food[i] = a.food[i]! - need;

    const walked = [a.location[i]!];
    const route = a.route[i]!;
    let days = a.progress[i]! + (route.length ? DAYS_PER_TURN : 0);
    while (route.length) {
      if (castleBars(world, i, route[0]!)) {
        route.length = 0;
        days = 0;
        break;
      }
      const cost = stepDays(d, map, a.location[i]!, route[0]!, army);
      if (days < cost) break;
      days -= cost;
      a.cameFrom[i] = a.location[i]!;
      a.location[i] = route.shift()!;
      walked.push(a.location[i]!);
      // An enemy army, or a garrisoned enemy castle, ends the march (warfare 5.5).
      if (enemyAt(a.location[i]!, a.owner[i]!) || blockingCastle(world, a.location[i]!, a.owner[i]!)) {
        route.length = 0;
        days = 0;
      }
    }
    if (walked.length > 1) moved.add(i);
    a.progress[i] = route.length ? days : 0;
    a.marched[i] = walked.length > 1 ? walked : [];

    const room = monthlyRations(d, army) * d.monthsCarried - a.food[i]!;
    a.food[i] = a.food[i]! + Math.max(0, Math.min(room, forageRations(d, map, a.location[i]!) * week));
    if (a.food[i]! < 0) {
      const short = Math.min(1, -a.food[i]! / need);
      const loss = d.hungerLossPerMonth * week * short;
      a.men[i] = Math.round(a.men[i]! * (1 - loss));
      a.horse[i] = Math.round(a.horse[i]! * (1 - loss));
      a.food[i] = 0;
    }
  }
  return moved;
}

/** Works out each realm's monthly income, and pays it when a new month begins. */
function runEconomy(world: World, pay: boolean): void {
  const { economy } = world.rules.defines;
  const income = world.nationMonthlyIncome;
  const emptyTax = emptyProvinceEffect("Leave it").tax;
  income.fill(0);

  for (let p = 0; p < world.provinceCount; p++) {
    // An occupier collects the tax (WAR occupation: tax, recruits, food, trade).
    const owner = controller(world, p);
    if (owner < 0) continue;
    // A province whose official was commissioned pays half (recruiting RECR-083, "Leave it").
    const share = ungoverned(world, p) ? emptyTax : 1;
    income[owner] =
      income[owner]! +
      (world.provincePopulation[p]! * economy.goldPerThousandPeoplePerMonth + world.provinceWealth[p]! * economy.goldPerWealthPerMonth) * share;
  }

  // Pay for levies and mercenaries (milestone 2, recruit.ts).
  for (let n = 0; n < world.nationCount; n++) income[n] = income[n]! - nationPay(world, n);

  if (!pay) return;
  const treasury = world.nationTreasury;
  for (let n = 0; n < world.nationCount; n++) treasury[n] = treasury[n]! + income[n]!;
}
