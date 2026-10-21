import { describe, expect, it } from "vitest";
import { PALETTE } from "@ph/engine/domain/scenario-setup";
import { bandPattern, deltaE, hexRgb, lensRamp, lensSet, lightness, NEIGHBOUR_DELTA_E, nationColours, simulate, visionOf, type VisionSetting } from "./colourVision.ts";

/** A grid of realms, each bordering the ones beside, above and below it, coloured as the default assignment might. */
function grid(w: number, h: number) {
  const n = w * h;
  const neighbours = Array.from({ length: n }, () => new Set<number>());
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x + 1 < w) (neighbours[i]!.add(i + 1), neighbours[i + 1]!.add(i));
      if (y + 1 < h) (neighbours[i]!.add(i + w), neighbours[i + w]!.add(i));
      if (x + 1 < w && y + 1 < h) (neighbours[i]!.add(i + w + 1), neighbours[i + w + 1]!.add(i));
    }
  // Neighbours differ in the default palette, as SETUP-043 has it, but nothing is done for any colour vision.
  const colours = Array.from({ length: n }, (_, i) => PALETTE[(i * 7 + Math.floor(i / w) * 3) % PALETTE.length]!);
  return { colours, neighbours, order: [...Array(n).keys()] };
}

const apart = (colours: string[], neighbours: Set<number>[], kind: "protan" | "deutan" | "tritan") => {
  let ok = 0;
  let all = 0;
  neighbours.forEach((set, i) =>
    set.forEach((j) => {
      if (j < i) return;
      all++;
      if (deltaE(simulate(hexRgb(colours[i]!), kind), simulate(hexRgb(colours[j]!), kind)) >= NEIGHBOUR_DELTA_E) ok++;
    }),
  );
  return ok / all;
};

describe("colour vision (VIEW-047, SET-095)", () => {
  it("names the map-presentation mode and its plan for each setting", () => {
    expect(visionOf("default")).toMatchObject({ mode: "Default", nationColours: "normal assignment", ramp: "normal", patterns: false });
    expect(visionOf("deutan")).toMatchObject({ mode: "Green-weak", nationColours: "second assignment", ramp: "blue to orange", patterns: false, palette: 32 });
    expect(visionOf("none")).toMatchObject({ mode: "No colour", nationColours: "greys", ramp: "greys with patterns", patterns: true });
    expect(visionOf("nonsense").setting).toBe("default");
  });

  it("keeps the normal assignment by default", () => {
    const g = grid(8, 6);
    expect(nationColours(visionOf("default"), g).colours).toEqual(g.colours);
  });

  for (const kind of ["protan", "deutan", "tritan"] as const) {
    it(`gives a second assignment from the 32-colour palette that keeps neighbours apart for ${kind}`, () => {
      const g = grid(10, 8);
      const out = nationColours(visionOf(kind), g);
      for (const c of out.colours) expect(PALETTE).toContain(c);
      expect(apart(out.colours, g.neighbours, kind)).toBe(1);
      expect(apart(out.colours, g.neighbours, kind)).toBeGreaterThan(apart(g.colours, g.neighbours, kind));
    });
  }

  it("with no colour, gives each realm a grey and a pattern no neighbour shares", () => {
    const g = grid(10, 8);
    const out = nationColours(visionOf("none"), g);
    for (const c of out.colours) {
      const [r, gg, b] = hexRgb(c);
      expect(r).toBe(gg);
      expect(gg).toBe(b);
    }
    g.neighbours.forEach((set, i) => set.forEach((j) => expect(`${out.colours[i]} ${out.patterns[i]}`).not.toBe(`${out.colours[j]} ${out.patterns[j]}`)));
  });

  it("turns a red to green ramp into blue to orange whose lightness runs in order", () => {
    const food = ["#a8323e", "#d08a48", "#e9d79a", "#8cb85a", "#3f7a44"].map(hexRgb);
    const people = ["#f3e3b5", "#e8c172", "#d68a3c", "#b14a2e", "#6e1f2c"].map(hexRgb);
    for (const s of ["protan", "deutan", "tritan"] as VisionSetting[]) {
      const seq = lensRamp(visionOf(s), people, "sequential");
      const l = seq.map(lightness);
      for (let i = 1; i < l.length; i++) expect(l[i]!).toBeLessThan(l[i - 1]!);
      const div = lensRamp(visionOf(s), food, "diverging");
      // The ends: orange for the bad end, blue for the good.
      expect(div[0]![0]!).toBeGreaterThan(div[0]![2]!);
      expect(div[4]![2]!).toBeGreaterThan(div[4]![0]!);
      // Neighbouring bands stay apart as each weak type sees them.
      if (s !== "default") for (let i = 1; i < seq.length; i++) expect(deltaE(simulate(seq[i]!, s as "protan"), simulate(seq[i - 1]!, s as "protan"))).toBeGreaterThan(10);
    }
    expect(lensRamp(visionOf("default"), food, "diverging")).toEqual(food);
    const greys = lensRamp(visionOf("none"), people, "sequential");
    for (const [r, g, b] of greys) expect(r === g && g === b).toBe(true);
  });

  it("swaps a lens's named colours for the safe ones, or greys in order", () => {
    const base = { loyal: hexRgb("#3f8f46"), disloyal: hexRgb("#b8323a") };
    expect(lensSet(visionOf("deutan"), base, { loyal: "#2c5a9e" }).loyal).toEqual(hexRgb("#2c5a9e"));
    expect(lensSet(visionOf("deutan"), base, { loyal: "#2c5a9e" }).disloyal).toEqual(base.disloyal);
    const none = lensSet(visionOf("none"), base, {});
    expect(lightness(none.loyal)).toBeGreaterThan(lightness(none.disloyal));
  });

  it("gives each lens band its own pattern: hatching, dots, stripes, then twice as dense (VIEW-048)", () => {
    const codes = [0, 1, 2, 3, 4, 5].map(bandPattern);
    expect(new Set(codes).size).toBe(6);
    expect(codes.every((c) => c > 0)).toBe(true);
    expect(bandPattern(-1)).toBe(0);
  });
});
