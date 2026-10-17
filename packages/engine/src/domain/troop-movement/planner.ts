import { rulesFor } from "./army-rules.ts";
import { type Army, type Mover, type MoveWorld, blockingCastle, isArmy, neighboursOf, placeOf, sameSide } from "./model.ts";

export type RouteEnd = "arrives" | "castle" | "needs passage" | "needs ships" | "no route";

export interface RoutePlan {
  /** Places after the start, in marching order. */
  path: string[];
  /** Days to reach each place on the path, from the start. */
  arrive: number[];
  /** The leg beyond a stop, drawn in grey. */
  greyed: string[];
  end: RouteEnd;
  stopsAt?: string;
  realm?: string;
  message?: string;
}

interface Search {
  /** Let refusals for these reasons through (to find what blocks a route). */
  relax?: readonly string[];
  /** Expand provinces with hostile garrisoned castles. */
  throughCastles?: boolean;
  /** Most steps from the start (retreat range). */
  maxSteps?: number;
}

/**
 * From a province with a hostile garrisoned castle an army may only go back where it came from
 * or into a neighbour its own side holds (5.2).
 */
export function castleExitAllowed(w: MoveWorld, a: Army, to: string): boolean {
  if (a.broken || !blockingCastle(w, a.owner, a.place)) return true;
  const owner = placeOf(w, to).owner;
  return to === a.cameFrom || (!!owner && sameSide(w, owner, a.owner));
}

/** Single Dijkstra over the shared graph with the mover's own step-days and may-enter rules. */
function search(w: MoveWorld, m: Mover, from: string, to: string, opt: Search): { path: string[]; arrive: number[] } | null {
  const rules = rulesFor(w, m);
  const dist = new Map<string, number>([[from, 0]]);
  const steps = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  const relaxed = (reason: string | undefined) => !!reason && (opt.relax ?? []).includes(reason);
  for (;;) {
    let p: string | undefined;
    let best = Infinity;
    for (const [k, d] of dist) if (!done.has(k) && d < best) [p, best] = [k, d];
    if (p === undefined) return null;
    if (p === to) break;
    done.add(p);
    if (p !== from && isArmy(m) && !opt.throughCastles && blockingCastle(w, m.owner, p)) continue;
    if ((steps.get(p) ?? 0) >= (opt.maxSteps ?? Infinity)) continue;
    for (const q of neighboursOf(w, m, p)) {
      if (done.has(q)) continue;
      if (p === from && isArmy(m) && !castleExitAllowed(w, m, q)) continue;
      const v = rules.mayEnter(w, m, q);
      if (!v.ok && !relaxed(v.reason)) continue;
      let c = rules.stepDays(w, m, p, q);
      if (!Number.isFinite(c)) {
        const water = (id: string) => ["sea", "ocean"].includes(placeOf(w, id).terrain);
        if (!(relaxed("needs ships") && (water(p) || water(q)))) continue;
        c = 1;
      }
      const d = best + c;
      if (d < (dist.get(q) ?? Infinity)) {
        dist.set(q, d);
        prev.set(q, p);
        steps.set(q, (steps.get(p) ?? 0) + 1);
      }
    }
  }
  const path: string[] = [];
  for (let p = to; p !== from; p = prev.get(p)!) path.push(p);
  path.reverse();
  return { path, arrive: path.map((p) => dist.get(p)!) };
}

/** Fastest route from where the mover stands within `maxSteps` steps; used by the retreat and interception. */
export function fastest(w: MoveWorld, m: Mover, to: string, maxSteps?: number): { path: string[]; arrive: number[] } | null {
  if (to === m.place) return { path: [], arrive: [] };
  return search(w, m, m.place, to, maxSteps === undefined ? {} : { maxSteps });
}

function planLeg(w: MoveWorld, m: Mover, from: string, to: string): RoutePlan {
  const name = (id: string) => id;
  const direct = search(w, m, from, to, {});
  if (direct) return { ...direct, greyed: [], end: "arrives" };
  if (isArmy(m)) {
    const through = search(w, m, from, to, { throughCastles: true });
    if (through) {
      const i = through.path.findIndex((p) => blockingCastle(w, m.owner, p));
      return {
        path: through.path.slice(0, i + 1),
        arrive: through.arrive.slice(0, i + 1),
        greyed: through.path.slice(i + 1),
        end: "castle",
        stopsAt: through.path[i]!,
        message: `stops at ${name(through.path[i]!)} until the castle falls`,
      };
    }
    const passage = search(w, m, from, to, { throughCastles: true, relax: ["needs passage"] });
    if (passage) {
      const rules = rulesFor(w, m);
      const i = passage.path.findIndex((p) => !rules.mayEnter(w, m, p).ok);
      const realm = rules.mayEnter(w, m, passage.path[i]!).realm ?? "";
      return {
        path: passage.path.slice(0, i),
        arrive: passage.arrive.slice(0, i),
        greyed: passage.path.slice(i),
        end: "needs passage",
        realm,
        message: `needs passage from ${realm}`,
      };
    }
    const water = search(w, m, from, to, { throughCastles: true, relax: ["needs passage", "needs ships"] });
    if (water) {
      const i = water.path.findIndex((p) => placeOf(w, p).terrain === "sea" || placeOf(w, p).terrain === "ocean");
      if (i >= 0)
        return { path: water.path.slice(0, i), arrive: water.arrive.slice(0, i), greyed: water.path.slice(i), end: "needs ships", message: "needs ships" };
    }
  }
  return { path: [], arrive: [], greyed: [], end: "no route" };
}

/**
 * The route planner (RoutePlanner): fastest route by step days with the mover's may-enter rule,
 * through waypoints in order; ends at hostile garrisoned castles, never through them (5.2);
 * says "needs passage from <realm>" or "needs ships" when that is what blocks it.
 */
export function planRoute(w: MoveWorld, m: Mover, to: string, via: readonly string[] = []): RoutePlan {
  const targets = [...via, to];
  const out: RoutePlan = { path: [], arrive: [], greyed: [], end: "arrives" };
  let from = m.place;
  let offset = 0;
  for (let k = 0; k < targets.length; k++) {
    const t = targets[k]!;
    if (t === from) continue;
    const leg = planLeg(w, m, from, t);
    out.path.push(...leg.path);
    out.arrive.push(...leg.arrive.map((d) => d + offset));
    if (leg.end !== "arrives") {
      out.end = leg.end;
      out.greyed = [...leg.greyed, ...targets.slice(k + 1)];
      if (leg.stopsAt !== undefined) out.stopsAt = leg.stopsAt;
      if (leg.realm !== undefined) out.realm = leg.realm;
      if (leg.message !== undefined) out.message = leg.message;
      return out;
    }
    offset = out.arrive[out.arrive.length - 1] ?? offset;
    from = t;
  }
  return out;
}
