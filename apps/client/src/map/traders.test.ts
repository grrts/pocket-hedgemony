import { describe, expect, it } from "vitest";
import { alongLoop, clockDays, placeMovers } from "./traders.ts";

describe("traders on the living map (VIEW-123)", () => {
  const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];

  it("walks a loop by length, wrapping round", () => {
    expect(alongLoop(square, 0)).toMatchObject({ x: 0, y: 0, leg: 0 });
    expect(alongLoop(square, 0.125)).toMatchObject({ x: 5, y: 0, leg: 0 });
    expect(alongLoop(square, 0.5)).toMatchObject({ x: 10, y: 10 });
    expect(alongLoop(square, 1.625)).toMatchObject({ x: 5, y: 10, leg: 2 });
  });

  it("goes there and back along a two-stop path, facing the way it goes", () => {
    const line: [number, number][] = [[0, 0], [10, 0]];
    expect(alongLoop(line, 0.25)).toMatchObject({ x: 5, dx: 10 });
    expect(alongLoop(line, 0.75)).toMatchObject({ x: 5, dx: -10 });
  });

  it("draws a caravan, barge or ship by the path's medium, and keeps them steady", () => {
    const centre = (p: number) => square[p]!;
    const land = placeMovers({ id: 3, medium: "land", path: [0, 1, 2, 3], traders: 5 }, 100, centre);
    expect(land).toHaveLength(3);
    expect(land.every((m) => m.sprite === "caravanTrain")).toBe(true);
    expect(placeMovers({ id: 3, medium: "river", path: [0, 1], traders: 1 }, 100, centre)[0]!.sprite).toBe("barge");
    expect(placeMovers({ id: 3, medium: "sea", path: [0, 1], traders: 2 }, 100, centre).map((m) => m.sprite)).toEqual(["cog", "cog"]);
    const later = placeMovers({ id: 3, medium: "land", path: [0, 1, 2, 3], traders: 5 }, 100.01, centre);
    later.forEach((m, i) => expect(Math.hypot(m.x - land[i]!.x, m.y - land[i]!.y)).toBeLessThan(0.1));
  });

  it("runs the clock on over a new year", () => {
    expect(clockDays({ year: 1445, month: 1, day: 1 }, 0) - clockDays({ year: 1444, month: 12, day: 31 }, 12)).toBeCloseTo(0.5, 9);
  });
});
