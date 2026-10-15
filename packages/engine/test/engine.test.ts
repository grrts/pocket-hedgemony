import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createEngineHost, createWorld, generateSyntheticRuleset, hashWorld, processTurn, Rng } from "../src/index.ts";

const rules = loadDefaultRuleset();

describe("rng", () => {
  it("is reproducible from a seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.nextU32());
    expect(Array.from({ length: 5 }, () => b.nextU32())).toEqual(seqA);
    expect(new Set(seqA).size).toBe(5);
  });
});

describe("turns", () => {
  it("starts in March 1444 and rolls over into 1445", () => {
    const w = createWorld(rules, 1);
    processTurn(w, [], 0);
    expect(w.date).toEqual({ year: 1444, month: 4 });
    for (let i = 0; i < 9; i++) processTurn(w, [], 0);
    expect(w.date).toEqual({ year: 1445, month: 1 });
  });

  it("pays province income into the owner's treasury", () => {
    const w = createWorld(rules, 1);
    const fra = w.nationIndex.get("france")!;
    const before = w.nationTreasury[fra]!;
    processTurn(w, [], fra);
    expect(w.nationMonthlyIncome[fra]).toBeGreaterThan(0);
    expect(w.nationTreasury[fra]).toBeCloseTo(before + w.nationMonthlyIncome[fra]!);
  });

  it("moves armies only across borders and only your own", () => {
    const w = createWorld(rules, 1);
    const fra = w.nationIndex.get("france")!;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const paris = w.armies.location[army]!;
    const next = w.adjList[w.adjStart[paris]!]!;
    const london = w.provinceIndex.get(rules.nations.find((n) => n.id === "england")!.capital)!;
    const report = processTurn(
      w,
      [
        { type: "move", army, to: next },
        { type: "move", army: army + 1, to: next },
        { type: "move", army, to: london },
      ],
      fra,
    );
    expect(w.armies.location[army]).toBe(next);
    expect(report.rejectedOrders.map((r) => r.reason)).toEqual(["not your army", "army already moved this turn"]);
  });

  it("keeps armies off sea zones until they have ships", () => {
    const w = createWorld(rules, 1);
    const eng = w.nationIndex.get("england")!;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(eng);
    const london = w.armies.location[army]!;
    const sea = Array.from(w.adjList.subarray(w.adjStart[london]!, w.adjStart[london + 1]!)).find((p) => w.provinceWater[p]);
    expect(sea).toBeDefined();
    const report = processTurn(w, [{ type: "move", army, to: sea! }], eng);
    expect(report.rejectedOrders.map((r) => r.reason)).toEqual(["armies need ships to cross water"]);
  });

  it("is deterministic for the same seed and orders", () => {
    const run = () => {
      const w = createWorld(rules, 7);
      for (let i = 0; i < 24; i++) processTurn(w, [], 0);
      return hashWorld(w);
    };
    expect(run()).toBe(run());
  });
});

describe("engine host", () => {
  it("starts a game and ends turns through the message protocol", () => {
    const handle = createEngineHost(() => rules);
    const start = handle({ id: 1, type: "newGame", seed: 1, playerNation: "castile" });
    expect(start.response.type).toBe("snapshot");
    const next = handle({ id: 2, type: "endTurn", orders: [] });
    if (next.response.type !== "snapshot") throw new Error(next.response.message);
    expect(next.response.snapshot.turn).toBe(1);
    expect(next.transfer.length).toBeGreaterThan(0);
  });

  it("reports errors instead of throwing", () => {
    const handle = createEngineHost(() => rules);
    expect(handle({ id: 1, type: "endTurn", orders: [] }).response).toEqual({ id: 1, type: "error", message: "no game in progress" });
  });
});

describe("scale", () => {
  it("handles a full-world sized map", () => {
    const big = generateSyntheticRuleset(rules, { provinces: 5000, nations: 500 });
    const w = createWorld(big, 1);
    for (let i = 0; i < 12; i++) processTurn(w, [], 0);
    expect(w.turn).toBe(12);
  });
});
