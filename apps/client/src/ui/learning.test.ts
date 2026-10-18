import { describe, expect, it } from "vitest";
import { outOfScope, tree } from "@ph/engine/domain/research";
import { boughLayouts } from "./learning.ts";

describe("the Research tab's tree (RSCH-084)", () => {
  const lays = boughLayouts();

  it("draws every invention in play once, on its own branch, and none that is never studied", () => {
    const placed = lays.flatMap((l) => [...l.at.keys()].filter((id) => tree().inventions.has(id)));
    const inPlay = [...tree().inventions.values()].filter((i) => !outOfScope(i));
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed.sort()).toEqual(inPlay.map((i) => i.id).sort());
    for (const l of lays) for (const id of l.at.keys()) if (tree().inventions.has(id)) expect(tree().inventions.get(id)!.bough).toBe(l.id);
  });

  it("puts each invention right of its parent, inside its era's columns, with no two in one place", () => {
    for (const l of lays) {
      const spots = new Set<string>();
      for (const [id, at] of l.at) {
        expect(spots.has(`${at.col}:${at.row}`)).toBe(false);
        spots.add(`${at.col}:${at.row}`);
        const inv = tree().inventions.get(id);
        if (!inv) continue;
        expect(at.col).toBeGreaterThan(l.at.get(inv.parent)!.col);
        const era = l.eras.find((e) => e.era === inv.era)!;
        expect(at.col).toBeGreaterThanOrEqual(era.col);
        expect(at.col).toBeLessThan(era.col + era.width);
      }
    }
  });
});
