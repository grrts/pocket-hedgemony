import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createEngineHost, createWorld, generateSyntheticRuleset, hashWorld, marchMap, planRoute, processTurn, Rng, stepDays } from "../src/index.ts";

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

  it("moves only your own armies, once per turn", () => {
    const w = createWorld(rules, 1);
    const fra = w.nationIndex.get("france")!;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const paris = w.armies.location[army]!;
    const next = Array.from(w.adjList.subarray(w.adjStart[paris]!, w.adjStart[paris + 1]!)).find((p) => !w.provinceWater[p])!;
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

  it("marches along a route over several turns, slower through rough ground", () => {
    const w = createWorld(rules, 1);
    const fra = w.nationIndex.get("france")!;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const madrid = w.provinceIndex.get(rules.nations.find((n) => n.id === "castile")!.capital)!;
    const d = rules.defines.march;
    const route = planRoute(d, marchMap(w), w.armies.location[army]!, madrid, { men: 5000, horse: 1000, logistics: 0 })!;
    expect(route.path.at(-1)).toBe(madrid);
    const months = Math.ceil(route.arrive.at(-1)! / d.daysPerMonth);
    expect(months).toBeGreaterThan(1);
    processTurn(w, [{ type: "move", army, to: madrid }], fra);
    expect(w.armies.marched[army]!.length).toBeGreaterThan(1);
    expect(w.armies.location[army]).not.toBe(madrid);
    for (let i = 1; i < months + 1; i++) processTurn(w, [], fra);
    expect(w.armies.location[army]).toBe(madrid);
    expect(w.armies.route[army]).toEqual([]);
  });

  it("is faster with horse and slower for a big army", () => {
    const w = createWorld(rules, 1);
    const map = marchMap(w);
    const d = rules.defines.march;
    const paris = w.provinceIndex.get(rules.nations.find((n) => n.id === "france")!.capital)!;
    const next = Array.from(w.adjList.subarray(w.adjStart[paris]!, w.adjStart[paris + 1]!)).find((p) => !w.provinceWater[p])!;
    const river = map.river[next] ? d.riverCrossingDays : 0;
    const foot = stepDays(d, map, paris, next, { men: 5000, horse: 0, logistics: 0 }) - river;
    expect(stepDays(d, map, paris, next, { men: 5000, horse: 5000, logistics: 0 }) - river).toBeCloseTo(foot / (1 + d.horseSpeedBonus));
    expect(stepDays(d, map, paris, next, { men: 10_000_000, horse: 0, logistics: 0 })).toBeGreaterThan(foot);
  });

  it("feeds armies from the land and starves them where it is bare", () => {
    const w = createWorld(rules, 1);
    const fra = w.nationIndex.get("france")!;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const full = w.armies.food[army]!;
    processTurn(w, [], fra);
    expect(w.armies.food[army]).toBeCloseTo(full);
    expect(w.armies.men[army]).toBe(5000);
    // A huge host in an empty province eats its wagons bare and then goes hungry.
    const empty = w.provinceGround.findIndex((g, p) => g === "tundra" && w.provincePopulation[p]! < 1);
    w.armies.location[army] = empty;
    w.armies.men[army] = 100_000;
    for (let i = 0; i < 3; i++) processTurn(w, [], fra);
    expect(w.armies.food[army]).toBe(0);
    expect(w.armies.men[army]).toBeLessThan(100_000);
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
