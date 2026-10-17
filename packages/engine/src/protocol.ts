import type { GameDate, Ruleset } from "@ph/rules";
import { hashWorld } from "./hash.ts";
import { processTurn, type Order } from "./turn.ts";
import { createWorld, type World } from "./world.ts";

/** Messages the UI thread sends to the engine worker. */
export type EngineRequest =
  | { id: number; type: "newGame"; seed: number; playerNation: string }
  | { id: number; type: "endTurn"; orders: Order[] };

/** Messages the engine worker sends back. */
export type EngineResponse =
  | { id: number; type: "snapshot"; snapshot: Snapshot }
  | { id: number; type: "error"; message: string };

/**
 * Read-only copy of the state the UI draws from. Arrays are fresh copies so
 * they can be transferred (zero-copy) to the UI thread while the engine keeps
 * its own. SharedArrayBuffer is deliberately not used: it needs cross-origin
 * isolation headers that mobile webviews don't provide.
 */
export interface Snapshot {
  turn: number;
  date: GameDate;
  playerNation: number;
  hash: string;
  computeMs: number;
  rejectedOrders: { order: Order; reason: string }[];
  provinceOwner: Int16Array;
  nationTreasury: Float64Array;
  nationLevies: Float64Array;
  nationMonthlyIncome: Float64Array;
  armies: {
    id: Int32Array;
    owner: Int16Array;
    location: Int32Array;
    men: Int32Array;
    commander: Int32Array;
    horse: Int32Array;
    /** Rations in the wagons, rounded. */
    food: Int32Array;
    /** Days marched toward the next province on the route. */
    progress: Int32Array;
    /** Provinces still to march through. */
    route: number[][];
    /** Provinces walked last turn, from where the army set out; empty if it stood still. */
    marched: number[][];
  };
}

export interface HostReply {
  response: EngineResponse;
  transfer: ArrayBuffer[];
}

/**
 * Engine side of the worker protocol, kept free of Worker APIs so it can be
 * tested directly and reused by a server-side runner later.
 */
export function createEngineHost(loadRules: () => Ruleset, now: () => number = () => performance.now()) {
  let world: World | null = null;
  let player = -1;

  function snapshot(id: number, started: number, rejectedOrders: Snapshot["rejectedOrders"]): HostReply {
    const w = world!;
    const a = w.armies;
    const live: number[] = [];
    for (let i = 0; i < a.count; i++) if (a.alive[i]) live.push(i);
    const pick = <T extends Int16Array | Int32Array>(src: T, make: (n: number) => T): T => {
      const out = make(live.length);
      live.forEach((slot, k) => (out[k] = src[slot]!));
      return out;
    };
    const snap: Snapshot = {
      turn: w.turn,
      date: { ...w.date },
      playerNation: player,
      hash: hashWorld(w),
      computeMs: now() - started,
      rejectedOrders,
      provinceOwner: w.provinceOwner.slice(),
      nationTreasury: w.nationTreasury.slice(),
      nationLevies: w.nationLevies.slice(),
      nationMonthlyIncome: w.nationMonthlyIncome.slice(),
      armies: {
        id: Int32Array.from(live),
        owner: pick(a.owner, (n) => new Int16Array(n)),
        location: pick(a.location, (n) => new Int32Array(n)),
        men: pick(a.men, (n) => new Int32Array(n)),
        commander: pick(a.commander, (n) => new Int32Array(n)),
        horse: pick(a.horse, (n) => new Int32Array(n)),
        food: Int32Array.from(live, (slot) => Math.round(a.food[slot]!)),
        progress: Int32Array.from(live, (slot) => Math.round(a.progress[slot]!)),
        route: live.map((slot) => a.route[slot]!.slice()),
        marched: live.map((slot) => a.marched[slot]!.slice()),
      },
    };
    const transfer = [
      snap.provinceOwner,
      snap.nationTreasury,
      snap.nationLevies,
      snap.nationMonthlyIncome,
      ...Object.values(snap.armies).filter((v): v is Int32Array | Int16Array => ArrayBuffer.isView(v)),
    ].map((arr) => arr.buffer as ArrayBuffer);
    return { response: { id, type: "snapshot", snapshot: snap }, transfer };
  }

  return function handle(req: EngineRequest): HostReply {
    const started = now();
    try {
      switch (req.type) {
        case "newGame": {
          world = createWorld(loadRules(), req.seed);
          const idx = world.nationIndex.get(req.playerNation);
          if (idx === undefined) throw new Error(`unknown nation ${req.playerNation}`);
          player = idx;
          return snapshot(req.id, started, []);
        }
        case "endTurn": {
          if (!world) throw new Error("no game in progress");
          const report = processTurn(world, req.orders, player);
          return snapshot(req.id, started, report.rejectedOrders);
        }
      }
    } catch (e) {
      return { response: { id: req.id, type: "error", message: e instanceof Error ? e.message : String(e) }, transfer: [] };
    }
  };
}
