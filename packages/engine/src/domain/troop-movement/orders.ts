import { boardShips, landArmy } from "./army-ops.ts";
import { refillAndGo } from "./food.ts";
import { type Army, type MoveWorld, type OnTheWay, type Pace, armyById, blockingCastle, horseOnly, moverById, placeOf, sameSide } from "./model.ts";
import { castleExitAllowed, planRoute, type RoutePlan } from "./planner.ts";
import { aiStandingOrders, type RiskTolerance } from "../warfare/index.ts";

/** March orders, sent as data, the same for player and AI (9.1, gap-lists A4). */
export type MoveOrder =
  | { kind: "march to"; army: string; to: string }
  | { kind: "march by"; army: string; via: string[]; to: string }
  | { kind: "halt"; army: string }
  | { kind: "resume"; army: string }
  | { kind: "return home"; army: string }
  | { kind: "follow"; army: string; target: string }
  | { kind: "raid"; army: string; to: string }
  | { kind: "besiege"; army: string }
  | { kind: "route settings"; army: string; pace?: Pace; onTheWay?: OnTheWay }
  | { kind: "board ships"; army: string; fleet: string }
  | { kind: "land"; army: string; place: string }
  | { kind: "refill and go"; army: string };

export type OrderName = "March to" | "March by" | "Halt" | "Return home" | "Follow / Join" | "Raid" | "Besiege" | "Board ships" | "Land";

export type OrderResult = { ok: true; plan?: RoutePlan; days?: number } | { ok: false; reason: string };

/** The orders an army is offered (9.1). A broken army takes none. */
export function offeredOrders(w: MoveWorld, a: Army): OrderName[] {
  if (a.broken) return [];
  if (a.cargoOf) return ["Land"];
  const out: OrderName[] = ["March to", "March by", "Halt", "Return home", "Follow / Join"];
  if (horseOnly(a)) out.push("Raid");
  const c = placeOf(w, a.place).castle;
  if (c && !sameSide(w, c.owner, a.owner) && blockingCastle(w, a.owner, a.place)) out.push("Besiege");
  if (placeOf(w, a.place).harbour && w.movers.some((m) => m.kind === "fleet" && m.place === a.place && sameSide(w, m.owner, a.owner))) out.push("Board ships");
  return out;
}

function setRoute(w: MoveWorld, a: Army, plan: RoutePlan): OrderResult {
  if (plan.end === "no route" || (!plan.path.length && plan.end !== "arrives")) return { ok: false, reason: plan.message ?? "no route" };
  const first = plan.path[0];
  if (first !== undefined && !castleExitAllowed(w, a, first)) return { ok: false, reason: "can't march on until the castle falls" };
  a.route = [...plan.path];
  a.greyed = [...plan.greyed];
  a.playerRoute = true;
  a.besieging = false;
  return { ok: true, plan };
}

/** Applies one order for `realm`. Orders are plain data: a player's and an AI's are handled alike. */
export function applyOrder(w: MoveWorld, realm: string, o: MoveOrder): OrderResult {
  const a = armyById(w, o.army);
  if (a.owner !== realm) return { ok: false, reason: "not your army" };
  if (a.broken) return { ok: false, reason: "a broken army takes no orders" };
  switch (o.kind) {
    case "march to":
      // An order to the province it stands in is a Halt (D-MOVE-5).
      if (o.to === a.place) return applyOrder(w, realm, { kind: "halt", army: a.id });
      return setRoute(w, a, planRoute(w, a, o.to));
    case "march by":
      return setRoute(w, a, planRoute(w, a, o.to, o.via));
    case "raid": {
      if (!horseOnly(a)) return { ok: false, reason: "only horse-only armies raid" };
      const pace = a.pace;
      a.pace = "Raid";
      const r = setRoute(w, a, planRoute(w, a, o.to));
      if (!r.ok) a.pace = pace;
      return r;
    }
    case "halt":
      a.greyed = [...a.route, ...a.greyed];
      a.route = [];
      return { ok: true };
    case "resume": {
      const dest = a.greyed[a.greyed.length - 1];
      if (dest === undefined) return { ok: false, reason: "nothing to resume" };
      return setRoute(w, a, planRoute(w, a, dest));
    }
    case "return home": {
      let best: RoutePlan | null = null;
      for (const p of Object.values(w.places)) {
        if (p.owner !== realm || !p.castle || p.id === a.place) continue;
        const plan = planRoute(w, a, p.id);
        if (plan.end !== "arrives") continue;
        if (!best || plan.arrive[plan.arrive.length - 1]! < best.arrive[best.arrive.length - 1]!) best = plan;
      }
      return best ? setRoute(w, a, best) : { ok: false, reason: "no own province with a castle" };
    }
    case "follow": {
      const t = moverById(w, o.target);
      if (!t) return { ok: false, reason: "no such army" };
      a.follow = { target: t.id, lastSeen: t.place };
      a.playerRoute = true;
      if (t.place !== a.place) a.route = planRoute(w, a, t.place).path;
      return { ok: true };
    }
    case "besiege":
      if (!blockingCastle(w, realm, a.place)) return { ok: false, reason: "no enemy castle here" };
      a.besieging = true;
      a.greyed = [...a.route, ...a.greyed];
      a.route = [];
      return { ok: true };
    case "route settings":
      if (o.pace !== undefined) {
        if (o.pace === "Raid" && !horseOnly(a)) return { ok: false, reason: "only horse-only armies raid" };
        a.pace = o.pace;
      }
      if (o.onTheWay !== undefined) a.onTheWay = o.onTheWay;
      return { ok: true };
    case "board ships": {
      const f = moverById(w, o.fleet);
      if (!f) return { ok: false, reason: "no such fleet" };
      const r = boardShips(w, a, f);
      return r.ok ? { ok: true, days: r.days! } : { ok: false, reason: r.reason! };
    }
    case "land": {
      const r = landArmy(w, a, o.place);
      return r.ok ? { ok: true, days: r.days! } : { ok: false, reason: r.reason! };
    }
    case "refill and go": {
      const r = refillAndGo(w, a);
      return r ? { ok: true, days: r.days } : { ok: false, reason: "nowhere to refill" };
    }
  }
}

/** An AI army's standing orders come from its realm's risk tolerance through warfare's rule (MOVE-086, D-WAR-14). */
export function setAiStandingOrders(a: Army, risk: RiskTolerance): void {
  const o = aiStandingOrders(risk);
  const [x, y] = o.retreat.split(" to ").map(Number);
  a.stance = o.order;
  a.retreatIfOutnumbered = (x ?? 1) / (y ?? 1);
}
