import { type Army, type MoveWorld, armyById } from "./model.ts";
import { planRoute } from "./planner.ts";

/** March together is set with "arrive together" on by default (8). */
export const defaultMarchTogether = (): { arriveTogether: boolean } => ({ arriveTogether: true });

/**
 * March together (8): each army gets its own route to one destination; with arrive together on,
 * the faster ones start later so all arrive the same day. Returns each army's start delay and arrival day.
 */
export function marchTogether(
  w: MoveWorld,
  ids: string[],
  to: string,
  arriveTogether = defaultMarchTogether().arriveTogether,
): { armies: { army: string; delay: number; arrive: number }[]; meetDay: number } {
  const plans = ids.map((id) => {
    const a = armyById(w, id);
    const plan = planRoute(w, a, to);
    return { a, plan, days: plan.arrive[plan.arrive.length - 1] ?? 0 };
  });
  const slowest = Math.max(...plans.map((p) => p.days));
  const out = plans.map(({ a, plan, days }) => {
    const delay = arriveTogether ? Math.floor(slowest - days) : 0;
    a.route = [...plan.path];
    a.greyed = [...plan.greyed];
    a.playerRoute = true;
    a.waitDays = delay;
    return { army: a.id, delay, arrive: Math.ceil(days + delay) };
  });
  return { armies: out, meetDay: Math.max(...out.map((o) => o.arrive)) };
}

/** Rally here (8): every picked army marches to the province and joins on arrival, in the order they come. */
export function rallyHere(w: MoveWorld, ids: string[], to: string): void {
  for (const id of ids) {
    const a = armyById(w, id);
    const plan = planRoute(w, a, to);
    a.route = [...plan.path];
    a.greyed = [...plan.greyed];
    a.playerRoute = true;
    a.joinOnArrival = to;
  }
}

/** "New regiments go to" (8): a newly gathered levy or trained regiment marches to the realm's rally point on its own and joins the army there. */
export function newRegimentsReady(w: MoveWorld, a: Army): string | null {
  const to = w.relations.newRegimentsGoTo?.[a.owner];
  if (to === undefined) return null;
  if (!w.movers.includes(a)) w.movers.push(a);
  const plan = planRoute(w, a, to);
  a.route = [...plan.path];
  a.greyed = [...plan.greyed];
  a.joinOnArrival = to;
  return to;
}

/**
 * A front (8) can be drawn only by a realm that knows W14 Army divisions. Its armies spread along it:
 * the provinces are cut into even stretches in the order drawn, one per army in the order given, and each
 * army marches to the middle of its stretch. It intercepts only within its stretch, and a broken army
 * retreats to a refuge on the front when one is in range (MOVE-075).
 */
export function drawFront(
  w: MoveWorld,
  realm: string,
  provinces: string[],
  ids: string[],
): { ok: true; front: { provinces: string[]; armies: string[]; stretches: Record<string, string[]> } } | { ok: false; reason: string } {
  if (!(w.relations.armyDivisions ?? []).includes(realm)) return { ok: false, reason: "needs W14 Army divisions" };
  const stretches: Record<string, string[]> = {};
  ids.forEach((id, i) => {
    const from = Math.floor((i * provinces.length) / ids.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) * provinces.length) / ids.length));
    const stretch = provinces.slice(from, to);
    stretches[id] = stretch;
    const a = armyById(w, id);
    a.front = { provinces: [...provinces], stretch };
    const post = stretch[Math.floor((stretch.length - 1) / 2)]!;
    const plan = planRoute(w, a, post);
    a.route = [...plan.path];
    a.greyed = [...plan.greyed];
  });
  return { ok: true, front: { provinces: [...provinces], armies: [...ids], stretches } };
}
