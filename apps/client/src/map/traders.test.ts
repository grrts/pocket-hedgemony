import { describe, expect, it } from "vitest";
import type { TraderWalk } from "@ph/engine";
import { onLeg, placeTrader } from "./traders.ts";

const walk = (o: Partial<TraderWalk>): TraderWalk => ({ id: 1, owner: 0, medium: "land", from: 0, to: 1, progress: 0, tiles: new Int32Array(0), mine: true, ...o });
// Tiles 0..9 in a row; provinces' centres at x = 0, 10 and 20.
const tileAt = (t: number) => [t, 0] as const;
const centre = (p: number) => [p * 10, 0] as const;

describe("traders on the living map walk as armies do (VIEW-123)", () => {
  it("steps along the leg's tiles by the share walked, heading the way it goes", () => {
    expect(onLeg([[0, 0], [1, 0], [2, 0]], 0.75)).toMatchObject({ x: 1.5, y: 0, ux: 1, uy: 0 });
    expect(onLeg([[0, 0], [0, 4]], 0.5)).toMatchObject({ x: 0, y: 2, uy: 1 });
  });

  it("walks on along the same leg over the step from the previous day", () => {
    const tiles = Int32Array.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    const before = walk({ progress: 0.2, tiles });
    const now = walk({ progress: 0.4, tiles });
    expect(placeTrader(now, before, 0, tileAt, centre).x).toBeCloseTo(2, 9);
    expect(placeTrader(now, before, 0.5, tileAt, centre).x).toBeCloseTo(3, 9);
    expect(placeTrader(now, before, 1, tileAt, centre).x).toBeCloseTo(4, 9);
  });

  it("finishes the last leg, then starts the next, when it enters a province", () => {
    const before = walk({ from: 0, to: 1, progress: 0.8 });
    const now = walk({ from: 1, to: 2, progress: 0.2 });
    // 0.2 of the way to go, then 0.2 on: halfway through the step it is just entering province 1.
    expect(placeTrader(now, before, 0, tileAt, centre).x).toBeCloseTo(8, 9);
    expect(placeTrader(now, before, 0.5, tileAt, centre).x).toBeCloseTo(10, 9);
    expect(placeTrader(now, before, 1, tileAt, centre).x).toBeCloseTo(12, 9);
  });

  it("stands where the game has it after a new route, and sails between zone centres at sea", () => {
    expect(placeTrader(walk({ from: 1, to: 2, progress: 0.5 }), walk({ from: 5, to: 6 }), 0, tileAt, centre).x).toBeCloseTo(15, 9);
    const ship = placeTrader(walk({ medium: "sea", from: 0, to: 2, progress: 0.25 }), undefined, 1, tileAt, centre);
    expect(ship).toMatchObject({ x: 5, sprite: "cog" });
    expect(placeTrader(walk({ medium: "river" }), undefined, 1, tileAt, centre).sprite).toBe("barge");
    expect(placeTrader(walk({}), undefined, 1, tileAt, centre).sprite).toBe("caravanTrain");
  });
});
