import type { Ruleset } from "@ph/rules";
import { createEngineHost, STEPS_PER_TURN, type EngineRequest, type Order, type Snapshot, type World } from "@ph/engine";
import { mapImagesFor, type MapKind } from "./world.ts";

/** An engine request without its id (each kind on its own, so its fields stay known). */
type Request = EngineRequest extends infer R ? (R extends EngineRequest ? Omit<R, "id"> : never) : never;

/**
 * One realm played through the engine host the game's screens talk to
 * (newGame, act, advance), so every order is checked exactly as a player's
 * is. Counts the orders sent and those the game refused, by type.
 */
export interface HostPlay {
  /** The snapshot after the last request. */
  readonly s: Snapshot;
  /** Sends one order; returns the snapshot after it. */
  act(order: Order): Snapshot;
  /** Plays one week. */
  week(): Snapshot;
  /** The world in play, for measuring only (a strategy decides from the snapshot). */
  world(): Readonly<World>;
  readonly ordersSent: number;
  /** Orders the game refused, by order type, with the first reason given. */
  readonly rejected: Record<string, { count: number; reason: string }>;
}

export function playThroughHost(rules: Ruleset, map: MapKind, seed: number, realm: string, difficulty?: string): HostPlay {
  const host = createEngineHost(() => rules);
  let id = 0;
  const send = (req: Request): Snapshot => {
    const r = host({ ...req, id: ++id } as EngineRequest).response;
    if (r.type === "error") throw new Error(r.message);
    if (r.type !== "snapshot") throw new Error(`unexpected ${r.type}`);
    return r.snapshot;
  };
  const images = mapImagesFor(map);
  let s = send({ type: "newGame", seed, playerNation: realm, ...(difficulty ? { difficulty } : {}), ...(images ? { map: images } : {}) });
  let ordersSent = 0;
  const rejected: HostPlay["rejected"] = {};
  return {
    get s() {
      return s;
    },
    act(order) {
      ordersSent++;
      s = send({ type: "act", order });
      for (const r of s.rejectedOrders) {
        const e = (rejected[r.order.type] ??= { count: 0, reason: r.reason });
        e.count++;
      }
      return s;
    },
    week() {
      s = send({ type: "advance", steps: STEPS_PER_TURN });
      return s;
    },
    world() {
      const w = host.world();
      if (!w) throw new Error("no game in progress");
      return w;
    },
    get ordersSent() {
      return ordersSent;
    },
    rejected,
  };
}
