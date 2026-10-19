import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { advance, cloneWorld, idleCommanders, createEngineHost, createWorld, hashWorld, resolutionOrder, STEPS_PER_TURN, type PlayerOrders, type Snapshot } from "../src/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

type Host = ReturnType<typeof createEngineHost>;
const snap = (h: Host, req: Parameters<Host>[0]): Snapshot => {
  const r = h(req).response;
  if (r.type !== "snapshot") throw new Error(r.type === "error" || r.type === "refused" ? r.message : r.type);
  return r.snapshot;
};
const planned = (h: Host): PlayerOrders => {
  const r = h({ id: 0, type: "planned" }).response;
  if (r.type !== "planned") throw new Error(r.type);
  return r.orders;
};
/** Plays the week on as the client does, `chunk` steps at a time; the last answer carries the week's hash. */
const playWeek = (h: Host, chunk: number): Snapshot => {
  let s: Snapshot | null = null;
  for (let left = STEPS_PER_TURN; left > 0; left -= chunk) s = snap(h, { id: 0, type: "advance", steps: Math.min(chunk, left) });
  return s!;
};
/** The player's first army with more than 2,000 men. */
const bigArmy = (s: Snapshot): number => {
  const a = s.armies;
  for (let k = 0; k < a.id.length; k++) if (a.owner[k] === s.playerNation && a.men[k]! > 2000) return a.id[k]!;
  return -1;
};

describe("multiplayer", () => {
  it("copies the world so that the copy plays on exactly as the original", () => {
    const a = createWorld(rules, 42, tiles);
    advance(a, STEPS_PER_TURN * 2);
    const b = cloneWorld(a);
    expect(hashWorld(b)).toBe(hashWorld(a));
    // A copy of the copy, as each device makes one a week, keeps agreeing with another copy.
    const c = cloneWorld(a);
    for (let i = 0; i < 6; i++) {
      advance(b, STEPS_PER_TURN);
      advance(c, STEPS_PER_TURN);
    }
    expect(hashWorld(b)).toBe(hashWorld(c));
  });

  it("turns the order players' orders are applied in each week", () => {
    expect(resolutionOrder([7, 3], 0)).toEqual([3, 7]);
    expect(resolutionOrder([7, 3], 1)).toEqual([7, 3]);
    expect(resolutionOrder([7, 3], 2)).toEqual([3, 7]);
  });

  it("keeps two devices in step: each plans its own realm, both apply everyone's orders and agree on the hash", () => {
    const humans = ["castile", "france"];
    const A = createEngineHost(() => rules);
    const B = createEngineHost(() => rules);
    let a = snap(A, { id: 1, type: "newGame", seed: 9, playerNation: "castile", humans });
    let b = snap(B, { id: 1, type: "newGame", seed: 9, playerNation: "france", humans });
    expect(a.hash).toBe(b.hash);
    for (let week = 0; week < 4; week++) {
      // In the first week each splits a company off its biggest army under a new commander and marches it to a
      // neighbour: the new army's slot on the planning copy is taken by the other player's split when the orders
      // come together. The weeks after are played on empty orders.
      for (const [h, s] of week === 0 ? ([[A, a], [B, b]] as const) : []) {
        const army = bigArmy(s);
        if (army < 0) continue;
        const before = new Set(s.armies.id);
        const w = h.world()!;
        // A commander for the new army: the first official who takes a commission.
        for (let p = 0; p < w.provinceCount && !idleCommanders(w, s.playerNation).length; p++) {
          if (w.provinceOwner[p] === s.playerNation && w.provinceOfficial[p]! >= 0) snap(h, { id: 2, type: "act", order: { type: "commission", province: p } });
        }
        const commander = idleCommanders(h.world()!, s.playerNation)[0];
        if (commander === undefined) throw new Error("no commander at court");
        const after = snap(h, { id: 2, type: "act", order: { type: "split", army, arm: "levy foot", men: 500, commander } });
        const made = [...after.armies.id].find((x) => !before.has(x));
        if (made === undefined) continue;
        const at = after.armies.location[[...after.armies.id].indexOf(made)]!;
        const to = w.adjList[w.adjStart[at]!] ?? at;
        snap(h, { id: 3, type: "act", order: { type: "move", army: made, to } });
      }
      const all = [planned(A), planned(B)];
      expect(all.map((p) => p.orders.map((o) => o.type))).toEqual(week === 0 ? [["commission", "split", "move"], ["commission", "split", "move"]] : [[], []]);
      // Both splits and both marches still go through when the orders come together, the second player's
      // new army in whichever slot is free by then.
      expect(snap(A, { id: 4, type: "resolve", all }).rejectedOrders).toEqual([]);
      expect(snap(B, { id: 4, type: "resolve", all: [...all].reverse() }).rejectedOrders).toEqual([]);
      a = playWeek(A, 6);
      b = playWeek(B, 7);
      expect(a.hash).not.toBe("");
      expect(a.hash).toBe(b.hash);
      expect(a.turn).toBe(week + 1);
    }
  });

  it("lets two players plan on one device in turn (pass and play)", () => {
    const H = createEngineHost(() => rules);
    const D = createEngineHost(() => rules);
    const humans = ["castile", "portugal"];
    const s = snap(H, { id: 1, type: "newGame", seed: 3, playerNation: "castile", humans });
    snap(D, { id: 1, type: "newGame", seed: 3, playerNation: "castile", humans });
    expect(s.playerNation).toBe(rules.nations.findIndex((n) => n.id === "castile"));
    snap(H, { id: 2, type: "act", order: { type: "setTax", province: -1, rate: 0 } });
    const mine = planned(H);
    const portugal = rules.nations.findIndex((n) => n.id === "portugal");
    snap(H, { id: 4, type: "plan", nation: portugal });
    snap(H, { id: 5, type: "act", order: { type: "setTax", province: -1, rate: 2 } });
    const theirs = planned(H);
    expect(theirs.nation).toBe(portugal);
    expect(mine.orders).toHaveLength(1);
    snap(H, { id: 6, type: "resolve", all: [mine, theirs] });
    snap(D, { id: 6, type: "resolve", all: [mine, theirs] });
    expect(playWeek(H, 42).hash).toBe(playWeek(D, 3).hash);
  });

  it("leaves peace between two players to the one asked", () => {
    const humans = ["castile", "portugal"];
    const A = createEngineHost(() => rules);
    const B = createEngineHost(() => rules);
    const a = snap(A, { id: 1, type: "newGame", seed: 5, playerNation: "castile", humans });
    const b = snap(B, { id: 1, type: "newGame", seed: 5, playerNation: "portugal", humans });
    const week = (ordersA: PlayerOrders, ordersB: PlayerOrders) => {
      snap(A, { id: 4, type: "resolve", all: [ordersA, ordersB] });
      snap(B, { id: 4, type: "resolve", all: [ordersA, ordersB] });
      return [playWeek(A, 42), playWeek(B, 42)] as const;
    };
    snap(A, { id: 2, type: "act", order: { type: "declareWar", target: b.playerNation, breakTruce: true } });
    let [sa, sb] = week(planned(A), planned(B));
    expect(sa.wars.some((w) => w.attackers.includes(a.playerNation) && w.defenders.includes(b.playerNation))).toBe(true);
    snap(A, { id: 5, type: "act", order: { type: "offerPeace", target: b.playerNation, terms: "white" } });
    [sa, sb] = week(planned(A), planned(B));
    // Still at war: Portugal has not answered; the offer waits on its screen, not on Castile's.
    expect(sa.wars.some((w) => w.attackers.includes(a.playerNation))).toBe(true);
    expect(sa.peaceOffers).toEqual([]);
    expect(sb.peaceOffers).toEqual([expect.objectContaining({ from: a.playerNation, terms: "white" })]);
    snap(B, { id: 6, type: "act", order: { type: "answerPeace", offer: sb.peaceOffers[0]!.id, yes: true } });
    [sa, sb] = week(planned(A), planned(B));
    expect(sb.wars.some((w) => w.attackers.includes(a.playerNation) && w.defenders.includes(b.playerNation))).toBe(false);
    expect(sa.hash).toBe(sb.hash);
  });
});
