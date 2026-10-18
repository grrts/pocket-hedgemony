import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { addDays, advance, applyNow, GROUNDS, tileMarch, tileStepHours, createEngineHost, daysInMonth, monthBeginning, turnOfDay, createWorld, generateSyntheticRuleset, hashWorld, marchMap, planRoute, processTurn, Rng, stepDays, type World } from "../src/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

/** France's province farthest from where the army stands: a long march inside its own land. */
function farFrench(w: World, fra: number, army: number): number {
  const at = w.tiles.centre[w.armies.location[army]!]!;
  const W = w.tiles.width;
  let best = -1;
  let far = -1;
  for (let p = 0; p < w.provinceCount; p++) {
    if (w.provinceOwner[p] !== fra || w.provinceWater[p]) continue;
    const c = w.tiles.centre[p]!;
    const d = Math.hypot((c % W) - (at % W), Math.floor(c / W) - Math.floor(at / W));
    if (d > far) ((far = d), (best = p));
  }
  return best;
}

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
  it("starts on 11 November 1444 and moves on a week a turn into 1445", () => {
    const w = createWorld(rules, 1, tiles);
    expect(w.date).toEqual({ year: 1444, month: 11, day: 11 });
    processTurn(w, [], 0);
    expect(w.date).toEqual({ year: 1444, month: 11, day: 18 });
    for (let i = 0; i < 7; i++) processTurn(w, [], 0);
    expect(w.date).toEqual({ year: 1445, month: 1, day: 6 });
  });

  it("follows the real calendar", () => {
    expect([1, 2, 4, 12].map((m) => daysInMonth(1445, m))).toEqual([31, 28, 30, 31]);
    expect(daysInMonth(1448, 2)).toBe(29);
    expect(daysInMonth(1500, 2)).toBe(28);
    expect(daysInMonth(1600, 2)).toBe(29);
    expect(addDays({ year: 1444, month: 12, day: 30 }, 7)).toEqual({ year: 1445, month: 1, day: 6 });
    // A new month begins in the turn from 25 November, not in the one from 18 November.
    expect(monthBeginning({ year: 1444, month: 11, day: 18 })).toBeNull();
    expect(monthBeginning({ year: 1444, month: 11, day: 25 })).toBe(12);
    expect(monthBeginning({ year: 1445, month: 3, day: 1 })).toBe(3);
    // 25 days from 11 November: four turns, ending on 5 December.
    expect(turnOfDay({ year: 1444, month: 11, day: 11 }, 25)).toEqual({ turns: 4, date: { year: 1444, month: 12, day: 5 } });
  });

  it("pays province income into the owner's treasury once a month", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = w.nationIndex.get("france")!;
    // The player's realm: the AI would order works with its gold.
    w.player = fra;
    processTurn(w, [], fra);
    processTurn(w, [], fra);
    // 11 and 18 November: no new month yet.
    expect(w.nationMonthlyIncome[fra]).toBeGreaterThan(0);
    const before = w.nationTreasury[fra]!;
    // France starts rich, from its catalogue assessment (REALM-130), not the flat start.
    expect(before).toBeGreaterThan(rules.defines.economy.startingTreasury);
    // 25 November: December begins in this turn.
    processTurn(w, [], fra);
    expect(w.nationTreasury[fra]).toBeCloseTo(before + w.nationMonthlyIncome[fra]!);
  });

  it("moves only your own armies, and a new order replaces the old one", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = w.nationIndex.get("france")!;
    w.player = fra;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const paris = w.armies.location[army]!;
    const next = Array.from(w.adjList.subarray(w.adjStart[paris]!, w.adjStart[paris + 1]!)).find((p) => !w.provinceWater[p])!;
    const madrid = farFrench(w, fra, army);
    const report = processTurn(
      w,
      [
        { type: "move", army, to: madrid },
        { type: "move", army: Array.from(w.armies.owner.subarray(0, w.armies.count)).findIndex((o) => o !== fra), to: next },
        { type: "move", army, to: next },
      ],
      fra,
    );
    expect(report.rejectedOrders.map((r) => r.reason)).toEqual(["not your army"]);
    expect(w.armies.location[army]).toBe(next);
    processTurn(w, [], fra);
    expect(w.armies.tile[army]).toBe(w.tiles.centre[next]);
  });

  it("marches over tiles a step at a time, along a road the province planner found", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = w.nationIndex.get("france")!;
    w.player = fra;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const madrid = farFrench(w, fra, army);
    expect(applyNow(w, { type: "move", army, to: madrid }, fra).rejectedOrders).toEqual([]);
    const path = w.armies.path[army]!;
    expect(path.at(-1)).toBe(w.tiles.centre[madrid]);
    // Each tile is a neighbour of the one before, and on land.
    let at = w.armies.tile[army]!;
    for (const t of path) {
      expect(Math.abs((t % w.tiles.width) - (at % w.tiles.width))).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.floor(t / w.tiles.width) - Math.floor(at / w.tiles.width))).toBeLessThanOrEqual(1);
      expect(w.tiles.province[t]).toBeGreaterThan(0);
      at = t;
    }
    // A day is six steps; the march goes on step by step, and the army stands on its path.
    advance(w, 6);
    const walked = w.armies.pathAt[army]!;
    expect(walked).toBeGreaterThan(0);
    expect(w.armies.tile[army]).toBe(path[walked - 1]);
    expect(w.tiles.province[w.armies.tile[army]!]! - 1).toBe(w.armies.location[army]);
    let weeks = 0;
    while (w.armies.location[army] !== madrid && weeks++ < 30) processTurn(w, [], fra);
    expect(w.armies.location[army]).toBe(madrid);
    for (let i = 0; i < 4; i++) processTurn(w, [], fra);
    expect(w.armies.tile[army]).toBe(w.tiles.centre[madrid]);
    expect(w.armies.route[army]).toEqual([]);
  });

  it("marches slower over rough ground and through snow", () => {
    const w = createWorld(rules, 1, tiles);
    const m = tileMarch(w);
    const grid = w.tiles;
    const army = { men: 100, horse: 0, logistics: 0 };
    const find = (ground: string) => {
      for (let t = grid.width; t < grid.province.length; t++) {
        const c = grid.cell[t]!;
        if (c !== 15 && GROUNDS[c & 15] === ground && !(c & 16) && c >> 5 === 0 && grid.cell[t - grid.width] === c) return t;
      }
      return -1;
    };
    const step = (t: number) => tileStepHours(m, t - grid.width, t, army);
    const grass = find("grassland");
    const forest = find("forest");
    w.provinceTemperature.fill(20);
    expect(step(forest)).toBeCloseTo(step(grass) * 2);
    w.provinceTemperature.fill(-20);
    expect(step(grass)).toBeGreaterThan(tileStepHours({ ...m, temperature: new Float32Array(w.provinceCount).fill(20) }, grass - grid.width, grass, army) * 1.9);
  });

  it("is faster with horse and slower for a big army", () => {
    const w = createWorld(rules, 1, tiles);
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
    const w = createWorld(rules, 1, tiles);
    const fra = w.nationIndex.get("france")!;
    const army = Array.from(w.armies.owner.subarray(0, w.armies.count)).indexOf(fra);
    const full = w.armies.food[army]!;
    const men = w.armies.men[army]!;
    processTurn(w, [], fra);
    expect(w.armies.food[army]).toBeCloseTo(full);
    expect(w.armies.men[army]).toBe(men);
    // A huge host in an empty province eats its wagons bare and then goes hungry.
    const empty = w.provinceGround.findIndex((g, p) => g === "tundra" && w.provincePopulation[p]! < 1);
    w.armies.location[army] = empty;
    w.armies.men[army] = 100_000;
    for (let i = 0; i < 3; i++) processTurn(w, [], fra);
    expect(w.armies.food[army]).toBe(0);
    expect(w.armies.men[army]).toBeLessThan(100_000);
  });

  it("keeps armies off sea zones until they have ships", () => {
    const w = createWorld(rules, 1, tiles);
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
      const w = createWorld(rules, 7, tiles);
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
