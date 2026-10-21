import { describe, expect, it } from "vitest";
import { ParticleField, Shape } from "./particles.ts";

const seeded = () => {
  let s = 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

describe("the map's particles", () => {
  it("adds a moment's particles and lets them die when their life is over", () => {
    const f = new ParticleField(64, seeded());
    f.moment("flip", 10, 10, 24, 1.2, "#ff0000");
    expect(f.count).toBe(24);
    f.step(0.5);
    expect(f.count).toBeGreaterThan(0);
    for (let k = 0; k < 20; k++) f.step(0.1);
    expect(f.count).toBe(0);
  });

  it("never holds more than its cap: the oldest give their slots to the newest", () => {
    const f = new ParticleField(30, seeded());
    for (let k = 0; k < 5; k++) f.moment("built", 0, 0, 20, 1.4, "#ffffff");
    expect(f.count).toBe(30);
  });

  it("counts particles by shape for the looping emitters", () => {
    const f = new ParticleField(64, seeded());
    f.moment("rising", 0, 0, 24, 2, "#000000");
    expect(f.countOf(Shape.Ember)).toBe(8);
    expect(f.countOf(Shape.Smoke)).toBe(16);
  });
});
