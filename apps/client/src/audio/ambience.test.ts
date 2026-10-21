import { describe, expect, it } from "vitest";
import type { Snapshot } from "@ph/engine";
import { ambienceBeds } from "@ph/engine/domain/audio";
import { SR } from "./chip.ts";
import { AMBIENCE_BEDS, AMBIENCE_SECONDS, renderBed } from "./ambience.ts";
import { bedUnderCamera } from "./facts.ts";

describe("ambience beds (AUD-148)", () => {
  it("has a sound for every bed of the catalogue", () => {
    expect([...AMBIENCE_BEDS].sort()).toEqual([...ambienceBeds()].sort());
  });

  it("loops every bed without a seam, at one loudness", () => {
    for (const id of AMBIENCE_BEDS) for (const windier of [false, true]) {
      const [L, R] = renderBed(id, windier);
      expect(L.length, id).toBe(AMBIENCE_SECONDS * SR);
      expect(L.every(Number.isFinite) && R.every(Number.isFinite), id).toBe(true);
      const rms = Math.sqrt(L.reduce((a, v) => a + v * v, 0) / L.length);
      expect(rms, id).toBeGreaterThan(0.06);
      expect(rms, id).toBeLessThan(0.2);
      // The jump from the last sample to the first is no bigger than a step inside the loop.
      let step = 0;
      for (let i = 1; i < L.length; i++) step = Math.max(step, Math.abs(L[i]! - L[i - 1]!));
      expect(Math.abs(L[0]! - L[L.length - 1]!), id).toBeLessThanOrEqual(step);
    }
  }, 60_000);
});

describe("the bed under the camera (AUD-079)", () => {
  const s = { provincePeople: [50, 400], sieges: [], battles: [{ province: 0 }], date: { year: 1400, month: 7, day: 1 } } as unknown as Snapshot;
  it("hears the ground at regional zoom and nothing at world zoom", () => {
    expect(bedUnderCamera(s, 0, "sea", 3, false)?.bed).toBe("amb_sea_coast");
    expect(bedUnderCamera(s, 0, "broadleaf", 3, false)?.bed).toBe("amb_forest");
    expect(bedUnderCamera(s, 0, "forest", 1, false)).toBeNull();
    expect(bedUnderCamera(s, -1, "forest", 3, false)).toBeNull();
  });
  it("hears a war or a big town close in", () => {
    expect(bedUnderCamera(s, 0, "grassland", 10, false)?.bed).toBe("amb_war_front");
    expect(bedUnderCamera(s, 1, "grassland", 10, false)?.bed).toBe("amb_town");
    expect(bedUnderCamera(s, 1, "grassland", 3, false)?.bed).toBe("amb_wind_plain");
  });
});
