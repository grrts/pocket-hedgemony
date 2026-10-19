import { expect, test } from "vitest";
import nations from "../../../../packages/rules/data/scenarios/1444/world/nations.json" with { type: "json" };
import sleeping from "../../../../packages/rules/data/scenarios/1444/world/sleeping-realms.json" with { type: "json" };
import { FLAG_H, FLAG_W, flagGrid } from "./flags.ts";
import { NATION_FLAGS } from "./nationFlags.ts";

test("every realm has its own flag, on a full cloth", () => {
  // The map's realms and the listed sleeping realms (SETUP-080); spares fly their colour.
  const realms = [...nations, ...sleeping.realms];
  for (const n of realms) {
    const g = flagGrid(n.id);
    expect(g, n.id).not.toBeNull();
    expect(g!.length).toBe(FLAG_H);
    for (const row of g!) expect(row.length).toBe(FLAG_W);
  }
  expect(Object.keys(NATION_FLAGS).sort()).toEqual(realms.map((n) => n.id).sort());
});

test("France flies blue, white and red", () => {
  const g = flagGrid("france")!;
  expect(new Set([g[4]![0], g[4]![7], g[4]![14]]).size).toBe(3);
});
