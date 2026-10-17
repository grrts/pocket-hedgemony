import type { GameDate, Ruleset } from "@ph/rules";
import { hashWorld } from "./hash.ts";
import { applyNow, processTurn, type Order } from "./turn.ts";
import { createWorld, type World } from "./world.ts";
import { relationState, type News } from "./war.ts";
import { armyPay, armyRations, ARMS, menByArm, mercenaryPrice, nationPay, OFFICIALS, weeksToGather } from "./recruit.ts";

/** Messages the UI thread sends to the engine worker. */
export type EngineRequest =
  | { id: number; type: "newGame"; seed: number; playerNation: string }
  | { id: number; type: "endTurn"; orders: Order[] }
  /** An order that acts at once (everything but moves: war and peace, recruiting, training, commanders). */
  | { id: number; type: "act"; order: Order };

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
  /** Nation occupying each province, -1 = none. */
  provinceOccupier: Int16Array;
  /** What happened this turn (or from the last order) that concerns the player. */
  news: News[];
  /** Wars under way, by nation index. */
  wars: { id: string; attackers: number[]; defenders: number[]; start: string }[];
  /** Calls to arms waiting for the player's answer. */
  calls: { id: string; caller: number; against: number; kind: "offensive" | "defensive" }[];
  /** The player's standing with every other nation that has one. */
  relations: { nation: number; state: "war" | "truce" | "alliance" | "subject" | "overlord"; until?: string }[];
  sieges: { province: number; by: number; months: number; breaches: number; garrison: number }[];
  nationTreasury: Float64Array;
  nationLevies: Float64Array;
  nationMonthlyIncome: Float64Array;
  /** Troop cap and the men counting toward it, by nation. */
  nationTroopCap: Float64Array;
  nationCapUsed: Float64Array;
  /** Gold the player pays their men this month. */
  pay: number;
  /** Men who can be called in each province now. */
  provinceRecruits: Float32Array;
  /** The player's men gathering in provinces: men still to come, weeks to the next thousand and to the last. */
  musters: { province: number; men: number; weeksLeft: number; weeksAll: number }[];
  /** The player's mercenary companies on their way. */
  mercs: { arm: string; men: number; weeksLeft: number }[];
  /** Price of a mercenary company by arm. */
  mercPrices: Record<string, number>;
  /** Official of each province (a name from OFFICIALS), or null when the post stands empty. */
  provinceOfficial: (string | null)[];
  /** Every commander: who they serve (-1 = none), their skills and record, the army they lead (index in armies, -1 = at court) and the province they left as an official (-1 = none). */
  commanders: { name: string; owner: number; might: number; cunning: number; logistics: number; victories: number; defeats: number; army: number; home: number; origin: string }[];
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
    /** 0 levy, 1 hired company. */
    kind: Int16Array;
    monthsOut: Int32Array;
    /** Months drilled, ×10. */
    drill: Int32Array;
    /** Men by arm, in the order of `arms`. */
    byArm: number[][];
    /** Gold a month and rations a month. */
    pay: number[];
    rations: number[];
    training: ({ arm: string; men: number; months: number } | null)[];
  };
  /** Arm names for armies.byArm. */
  arms: readonly string[];
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

  function snapshot(id: number, started: number, rejectedOrders: Snapshot["rejectedOrders"], news: News[] = []): HostReply {
    const w = world!;
    const idx = (ids: string[]) => ids.map((x) => w.nationIndex.get(x)!).filter((n) => n !== undefined);
    const wars = w.diplomacy.wars.map((x) => ({ id: x.id, attackers: idx(x.attackers), defenders: idx(x.defenders), start: x.start }));
    // The player hears of what involves them, their partners and their neighbours' wars.
    const close = new Set<number>([player]);
    for (const x of wars) if (x.attackers.includes(player) || x.defenders.includes(player)) for (const n of [...x.attackers, ...x.defenders]) close.add(n);
    const relations: Snapshot["relations"] = [];
    for (let n = 0; n < w.nationCount; n++) {
      if (n === player) continue;
      const r = relationState(w, player, n);
      if (r.state) {
        relations.push({ nation: n, state: r.state, ...(r.until ? { until: r.until } : {}) });
        if (r.state === "alliance" || r.state === "overlord" || r.state === "subject") close.add(n);
      }
    }
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
      provinceOccupier: w.provinceOccupier.slice(),
      news: news.filter((x) => x.nations.some((n) => close.has(n)) || x.kind === "war" || x.kind === "destroyed"),
      wars,
      calls: w.diplomacy.calls
        .filter((c) => !c.answer && c.called === w.nationIds[player])
        .map((c) => ({ id: c.id, caller: w.nationIndex.get(c.caller)!, against: w.nationIndex.get(c.against)!, kind: c.kind as "offensive" | "defensive" })),
      relations,
      sieges: [...w.sieges].map(([p, st]) => ({ province: p, by: st.by, months: st.siege.months, breaches: st.siege.breaches, garrison: Math.round(st.siege.garrison) })),
      nationTreasury: w.nationTreasury.slice(),
      nationLevies: w.nationLevies.slice(),
      nationMonthlyIncome: w.nationMonthlyIncome.slice(),
      nationTroopCap: w.nationTroopCap.slice(),
      nationCapUsed: w.nationCapUsed.slice(),
      pay: player >= 0 ? nationPay(w, player) : 0,
      provinceRecruits: w.provinceRecruits.slice(),
      musters: w.musters.filter((m) => m.nation === player).map((m) => ({ province: m.province, men: m.men, weeksLeft: m.weeksLeft, weeksAll: weeksToGather(w, m) })),
      mercs: w.mercs.filter((m) => m.nation === player).map((m) => ({ arm: m.arm, men: m.men, weeksLeft: m.weeksLeft })),
      mercPrices: Object.fromEntries(w.rules.defines.recruit.hiredArms.map((arm) => [arm, mercenaryPrice(w, arm)])),
      provinceOfficial: Array.from(w.provinceOfficial, (o) => (o >= 0 ? OFFICIALS[o]! : null)),
      commanders: w.commanders.map((c, k) => ({
        name: c.name,
        owner: w.commanderOwner[k]!,
        might: c.might,
        cunning: c.cunning,
        logistics: c.logistics,
        victories: c.victories,
        defeats: c.defeats,
        army: live.findIndex((slot) => a.commander[slot] === k),
        home: w.commanderHome[k]!,
        origin: c.origin ?? "",
      })),
      arms: ARMS,
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
        kind: Int16Array.from(live, (slot) => a.kind[slot]!),
        monthsOut: Int32Array.from(live, (slot) => a.monthsOut[slot]!),
        drill: Int32Array.from(live, (slot) => Math.round(a.drill[slot]! * 10)),
        byArm: live.map((slot) => menByArm(w, slot).map(Math.round)),
        pay: live.map((slot) => armyPay(w, slot)),
        rations: live.map((slot) => armyRations(w, slot)),
        training: live.map((slot) => (a.trainArm[slot]! >= 0 ? { arm: ARMS[a.trainArm[slot]!]!, men: a.trainMen[slot]!, months: a.trainLeft[slot]! } : null)),
      },
    };
    const transfer = [
      snap.provinceOwner,
      snap.provinceOccupier,
      snap.nationTreasury,
      snap.nationLevies,
      snap.nationMonthlyIncome,
      snap.nationTroopCap,
      snap.nationCapUsed,
      snap.provinceRecruits,
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
          world.player = idx;
          return snapshot(req.id, started, []);
        }
        case "endTurn": {
          if (!world) throw new Error("no game in progress");
          const report = processTurn(world, req.orders, player);
          return snapshot(req.id, started, report.rejectedOrders, report.news);
        }
        case "act": {
          if (!world) throw new Error("no game in progress");
          const report = applyNow(world, req.order, player);
          return snapshot(req.id, started, report.rejectedOrders, report.news);
        }
      }
    } catch (e) {
      return { response: { id: req.id, type: "error", message: e instanceof Error ? e.message : String(e) }, transfer: [] };
    }
  };
}
