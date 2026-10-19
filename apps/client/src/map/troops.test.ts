import { describe, expect, it } from "vitest";
import { behind, extendTrail, SNAP, stepTroop, walk, type Pt } from "./troops.ts";

describe("figures walk, not jump (living map)", () => {
  it("keeps the leader's road, newest first, only as long as the column needs", () => {
    let trail: Pt[] = [];
    for (let x = 0; x <= 5; x++) trail = extendTrail(trail, [x, 0], 2.5);
    expect(trail[0]).toEqual([5, 0]);
    expect(trail).toEqual([[5, 0], [4, 0], [3, 0], [2, 0]]);
    // Standing still adds nothing; a long jump starts a new road.
    expect(extendTrail(trail, [5, 0], 2.5)).toEqual(trail);
    expect(extendTrail(trail, [5 + SNAP + 1, 0], 2.5)).toEqual([[5 + SNAP + 1, 0]]);
  });

  it("puts each follower on the road the leader took, round its corners", () => {
    const trail: Pt[] = [[2, 2], [2, 0], [0, 0]];
    expect(behind(trail, 0, [0, 1])).toEqual([2, 2]);
    expect(behind(trail, 1, [0, 1])).toEqual([2, 1]);
    expect(behind(trail, 3, [0, 1])).toEqual([1, 0]);
    // Past the road's end the column goes on straight, away from the way it faces.
    expect(behind([[0, 0]], 2, [1, 0])).toEqual([-2, 0]);
  });

  it("walks a figure toward its spot without overshooting, and places one that is far off", () => {
    const { at, walking } = walk([[0, 0]], [[2, 0]], 0.1);
    expect(at[0]![0]).toBeGreaterThan(0);
    expect(at[0]![0]).toBeLessThan(2);
    expect(walking).toBe(true);
    expect(walk([[0, 0]], [[SNAP + 1, 0]], 0.1).at).toEqual([[SNAP + 1, 0]]);
    expect(walk([[1.99, 0]], [[2, 0]], 0.1)).toEqual({ at: [[2, 0]], walking: false });
    // A new figure starts at the leader's spot.
    expect(walk([[0, 0]], [[0, 0], [0, 1]], 0.01).at[1]![1]).toBeLessThan(1);
  });

  it("forms a column behind the banner when an army sets off, instead of jumping into it", () => {
    const ranks: Pt[] = [[0, 0], [0, 0.75], [-0.6, 0], [-0.6, 0.75]];
    const column: Pt[] = [[0, 0], [-0.75, 0], [-1.5, 0], [-2.25, 0]];
    let { troop } = stepTroop(undefined, { point: [10, 10], offsets: ranks, marching: false, facing: [1, 0], now: 0, still: false });
    expect(troop.at[1]).toEqual([10, 10.75]);
    // The army sets off east: a moment later the second figure is between its rank and its place in the column.
    const step = stepTroop(troop, { point: [10.2, 10], offsets: column, marching: true, facing: [1, 0], now: 100, still: false });
    expect(step.walking).toBe(true);
    const [x, y] = step.troop.at[1]!;
    expect(y).toBeGreaterThan(10);
    expect(y).toBeLessThan(10.75);
    // Given time, every figure stands on the leader's road behind him.
    troop = step.troop;
    for (let t = 200; t <= 3000; t += 100) troop = stepTroop(troop, { point: [10.2, 10], offsets: column, marching: true, facing: [1, 0], now: t, still: false }).troop;
    expect(troop.at[3]![0]).toBeCloseTo(10.2 - 2.25, 1);
    expect(troop.at[3]![1]).toBeCloseTo(10, 1);
    expect(x).toBeLessThan(10.2);
  });

  it("puts still figures, or an army not drawn for a while, straight in place", () => {
    const first = stepTroop(undefined, { point: [0, 0], offsets: [[0, 0], [0, 1]], marching: false, facing: [1, 0], now: 0, still: false }).troop;
    const still = stepTroop(first, { point: [0, 0], offsets: [[0, 0], [1, 0]], marching: false, facing: [1, 0], now: 100, still: true });
    expect(still.troop.at[1]).toEqual([1, 0]);
    const late = stepTroop(first, { point: [0, 0], offsets: [[0, 0], [1, 0]], marching: false, facing: [1, 0], now: 5000, still: false });
    expect(late.troop.at[1]).toEqual([1, 0]);
  });
});
