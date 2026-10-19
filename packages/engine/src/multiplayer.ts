import { bindConditions } from "./events.ts";
import { applyNow, type Order } from "./turn.ts";
import type { News } from "./war.ts";
import type { World } from "./world.ts";

/**
 * Multiplayer (prototype): every player's device runs the same deterministic
 * world, and only orders cross the network. A week is planned by all players
 * at once on their own copy (each sees their orders act at once); when all are
 * ready, every device goes back to the week's start, applies everyone's orders
 * in the same order and plays the week. The world hash at the week's end shows
 * that the devices still agree.
 */

/** One player's orders for one week. */
export interface PlayerOrders {
  nation: number;
  orders: Order[];
  /**
   * For each order, what it brought to life on the planning copy, by kind
   * (army slots, commanders, fleets, governors, traders), so later orders that
   * name them can be pointed at what the same orders make when everyone's are
   * applied together: another player's orders may have taken those numbers first.
   */
  created: Created[];
}

/** What one order made, by kind, in order of number. */
export type Created = Partial<Record<Kind, number[]>>;

type Kind = "army" | "commander" | "fleet" | "governor" | "trader";

/** How to list each kind's numbers as orders name them. */
const KINDS: Record<Kind, (world: World) => number[]> = {
  army: (w) => {
    const out: number[] = [];
    for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i]) out.push(i);
    return out;
  },
  commander: (w) => Array.from({ length: w.commanders.length }, (_, i) => i),
  fleet: (w) => w.navy?.fleets.map((f) => f.id) ?? [],
  governor: (w) => w.explore?.governors.map((g) => g.id) ?? [],
  trader: (w) => w.traders?.map((t) => t.id) ?? [],
};

/** The kind of thing each field of an order names; `into` is an army in a march's merge and a fleet at sea. */
function kindOf(order: Order, field: string): Kind | null {
  switch (field) {
    case "army":
    case "commander":
    case "fleet":
    case "governor":
    case "trader":
      return field;
    case "into":
      return order.type === "merge" ? "army" : order.type === "navy" ? "fleet" : null;
    default:
      return null;
  }
}

/**
 * The order the players' orders are applied in: it turns each week, so no
 * realm is always first to march or first to buy (simultaneous turns).
 */
export function resolutionOrder(humans: readonly number[], turn: number): number[] {
  const sorted = [...humans].sort((a, b) => a - b);
  if (!sorted.length) return sorted;
  const k = turn % sorted.length;
  return [...sorted.slice(k), ...sorted.slice(0, k)];
}

/** Applies one order for a nation now, noting what it creates. */
export function applyRecorded(world: World, order: Order, nation: number): { rejected: string | null; news: News[]; created: Created } {
  const kinds = Object.keys(KINDS) as Kind[];
  const before = kinds.map((k) => new Set(KINDS[k](world)));
  const report = applyNow(world, order, nation);
  const created: Created = {};
  kinds.forEach((k, i) => {
    const made = KINDS[k](world).filter((x) => !before[i]!.has(x));
    if (made.length) created[k] = made.sort((a, b) => a - b);
  });
  return { rejected: report.rejectedOrders[0]?.reason ?? null, news: report.news, created };
}

/**
 * Applies every player's week of orders, in resolution order, each one's new
 * armies, commanders, fleets, governors and traders mapped from the numbers
 * they had on its planning copy to the ones they take here.
 */
export function applyAll(world: World, all: readonly PlayerOrders[]): { rejected: { nation: number; order: Order; reason: string }[]; news: News[] } {
  const byNation = new Map(all.map((p) => [p.nation, p]));
  const rejected: { nation: number; order: Order; reason: string }[] = [];
  const news: News[] = [];
  for (const nation of resolutionOrder([...byNation.keys()], world.turn)) {
    const p = byNation.get(nation)!;
    const map: Record<Kind, Map<number, number>> = { army: new Map(), commander: new Map(), fleet: new Map(), governor: new Map(), trader: new Map() };
    p.orders.forEach((order, k) => {
      const o = { ...order } as Record<string, unknown>;
      for (const f of Object.keys(o)) {
        const kind = kindOf(order, f);
        if (kind && typeof o[f] === "number" && map[kind].has(o[f] as number)) o[f] = map[kind].get(o[f] as number);
      }
      const r = applyRecorded(world, o as Order, nation);
      news.push(...r.news);
      if (r.rejected) rejected.push({ nation, order: o as Order, reason: r.rejected });
      const planned = p.created[k] ?? {};
      for (const kind of Object.keys(planned) as Kind[]) {
        planned[kind]!.forEach((was, j) => {
          const now = r.created[kind]?.[j];
          if (now !== undefined) map[kind].set(was, now);
        });
      }
    });
  }
  return { rejected, news };
}

/** Shared, never-changing parts of a world: the rules, the map's tiles and the event tree's data. */
function sharedParts(world: World): Set<unknown> {
  const shared = new Set<unknown>([world.rules, world.tiles]);
  const st = world.events?.state as unknown as Record<string, unknown> | undefined;
  if (st) for (const k of ["rules", "events", "ages", "periods"]) if (st[k]) shared.add(st[k]);
  return shared;
}

/**
 * A full copy of the world, to go back to the week's start. Saves are no
 * use here: a world opened from a save does not yet play on exactly as the
 * one it was written from.
 */
export function cloneWorld(world: World): World {
  const shared = sharedParts(world);
  const memo = new Map<unknown, unknown>();
  const copy = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (shared.has(v)) return v;
    const seen = memo.get(v);
    if (seen !== undefined) return seen;
    if (ArrayBuffer.isView(v)) {
      const c = (v as unknown as Uint8Array).slice();
      memo.set(v, c);
      return c;
    }
    if (Array.isArray(v)) {
      const c: unknown[] = new Array(v.length);
      memo.set(v, c);
      for (let i = 0; i < v.length; i++) c[i] = copy(v[i]);
      return c;
    }
    if (v instanceof Map) {
      const c = new Map();
      memo.set(v, c);
      for (const [k, x] of v) c.set(copy(k), copy(x));
      return c;
    }
    if (v instanceof Set) {
      const c = new Set();
      memo.set(v, c);
      for (const x of v) c.add(copy(x));
      return c;
    }
    const c = Object.create(Object.getPrototypeOf(v)) as Record<string, unknown>;
    memo.set(v, c);
    for (const k of Object.keys(v)) c[k] = copy((v as Record<string, unknown>)[k]);
    return c;
  };
  const out = copy(world) as World;
  if (out.events) bindConditions(out, out.events);
  return out;
}
