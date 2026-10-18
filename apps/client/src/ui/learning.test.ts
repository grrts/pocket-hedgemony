import { describe, expect, it } from "vitest";
import { outOfScope, tree } from "@ph/engine/domain/research";
import { treeLayout } from "./learning.ts";

describe("the Research tab's one tree (RSCH-100)", () => {
  const lay = treeLayout();
  const t = tree();

  it("draws every invention in play once, and none that is never studied", () => {
    const placed = [...lay.at.keys()].filter((id) => t.inventions.has(id));
    const inPlay = [...t.inventions.values()].filter((i) => !outOfScope(i));
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed.sort()).toEqual(inPlay.map((i) => i.id).sort());
    expect(lay.at.get(t.root.id)!.col).toBe(0);
    for (const b of t.boughs) expect(lay.at.get(b.id)!.col).toBe(1);
  });

  it("starts with the two past eras, Ancient and Medieval, before Era I", () => {
    expect(lay.eras.slice(0, 3).map((e) => e.era)).toEqual(["A", "M", "I"]);
    expect(lay.eras.some((e) => e.era === "VIII")).toBe(false);
  });

  it("puts each invention in its branch's band, right of its parent, inside its era's columns, with no two in one place", () => {
    const spots = new Set<string>();
    for (const [id, at] of lay.at) {
      expect(spots.has(`${at.col}:${at.row}`)).toBe(false);
      spots.add(`${at.col}:${at.row}`);
      const inv = t.inventions.get(id);
      if (!inv) continue;
      const band = lay.bands.find((b) => b.id === inv.bough)!;
      expect(at.row).toBeGreaterThanOrEqual(band.row);
      expect(at.row).toBeLessThan(band.row + band.rows);
      expect(at.col).toBeGreaterThan(lay.at.get(inv.parent)!.col);
      const era = lay.eras.find((e) => e.era === inv.era)!;
      expect(at.col).toBeGreaterThanOrEqual(era.col);
      expect(at.col).toBeLessThan(era.col + era.width);
    }
  });

  it("stacks the four bands one under the other without gaps or overlaps", () => {
    let row = 0;
    for (const b of lay.bands) {
      expect(b.row).toBe(row);
      row += b.rows;
    }
    expect(row).toBe(lay.rows);
  });
});
