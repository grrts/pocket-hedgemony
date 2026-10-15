import { areNeighbors, recomputeMaxLevies, type World } from "./world.ts";

export type Order = { type: "move"; army: number; to: number };

export interface TurnReport {
  turn: number;
  rejectedOrders: { order: Order; reason: string }[];
}

/**
 * Advances the world by one turn (one month). Phases run in a fixed order and
 * only use seeded randomness, so the same world plus the same orders always
 * produces the same result.
 */
export function processTurn(world: World, orders: readonly Order[], actingNation: number): TurnReport {
  const rejectedOrders: TurnReport["rejectedOrders"] = [];
  world.armies.movedThisTurn.fill(0);

  for (const order of orders) {
    const reason = applyOrder(world, order, actingNation);
    if (reason) rejectedOrders.push({ order, reason });
  }

  runEconomy(world);
  runLevies(world);
  advanceDate(world);
  world.turn++;

  return { turn: world.turn, rejectedOrders };
}

function applyOrder(world: World, order: Order, actingNation: number): string | null {
  const a = world.armies;
  switch (order.type) {
    case "move": {
      if (order.army < 0 || order.army >= a.count || !a.alive[order.army]) return "no such army";
      if (a.owner[order.army] !== actingNation) return "not your army";
      if (a.movedThisTurn[order.army]) return "army already moved this turn";
      if (!areNeighbors(world, a.location[order.army]!, order.to)) return "provinces do not border";
      if (world.provinceWater[order.to]) return "armies need ships to cross water";
      a.location[order.army] = order.to;
      a.movedThisTurn[order.army] = 1;
      return null;
    }
  }
}

function runEconomy(world: World): void {
  const { economy, military } = world.rules.defines;
  const income = world.nationMonthlyIncome;
  income.fill(0);

  for (let p = 0; p < world.provinceCount; p++) {
    const owner = world.provinceOwner[p]!;
    if (owner < 0) continue;
    income[owner] =
      income[owner]! +
      world.provincePopulation[p]! * economy.goldPerThousandPeoplePerMonth +
      world.provinceWealth[p]! * economy.goldPerWealthPerMonth;
  }

  const a = world.armies;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const owner = a.owner[i]!;
    income[owner] = income[owner]! - (a.men[i]! / 1000) * military.upkeepPerThousandMenPerMonth;
  }

  const treasury = world.nationTreasury;
  for (let n = 0; n < world.nationCount; n++) treasury[n] = treasury[n]! + income[n]!;
}

function runLevies(world: World): void {
  recomputeMaxLevies(world);
  const frac = world.rules.defines.levies.monthlyRecoveryFraction;
  const mp = world.nationLevies;
  const max = world.nationMaxLevies;
  for (let n = 0; n < world.nationCount; n++) {
    mp[n] = Math.min(max[n]!, mp[n]! + max[n]! * frac);
  }
}

function advanceDate(world: World): void {
  if (world.date.month === 12) {
    world.date = { year: world.date.year + 1, month: 1 };
  } else {
    world.date = { year: world.date.year, month: world.date.month + 1 };
  }
}
