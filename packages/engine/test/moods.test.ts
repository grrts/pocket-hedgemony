import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { grievancesOf, moodIndex, MOODS } from "../src/moods.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const capitalOf = (w: World, id: string) => w.provinceIndex.get(rules.nations[w.nationIndex.get(id)!]!.capital)!;
const neighbourOf = (w: World, p: number) => Array.from(w.adjList.subarray(w.adjStart[p]!, w.adjStart[p + 1]!)).find((q) => w.provinceOwner[q] === w.provinceOwner[p] && !w.armies.location.subarray(0, w.armies.count).includes(q))!;

/** Plays until the next monthly step has run. */
function nextMonth(w: World): void {
  const m = w.date.month;
  while (w.date.month === m) processTurn(w, [], w.player);
  processTurn(w, [], w.player);
}

describe("a living realm: moods", () => {
  it("starts calm, and a province with no food and no official grumbles, then riots when conscripted", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("castile")!;
    w.player = me;
    const p = neighbourOf(w, capitalOf(w, "castile"));
    nextMonth(w);
    expect(MOODS[moodIndex(w, p)]).toBe("calm");
    w.provinceStore.fill(0);
    // The post must stay empty: the crown would fill it otherwise (PROV-342).
    applyNow(w, { type: "autoFillPosts", on: false }, me);
    expect(applyNow(w, { type: "commission", province: p }, me).rejectedOrders).toEqual([]);
    nextMonth(w);
    expect(grievancesOf(w, p)).toEqual(expect.arrayContaining(["Hungry", "Ungoverned"]));
    expect(MOODS[moodIndex(w, p)]).toBe("grumbling");
    w.provinceRecruits[p] = 0;
    const income = w.nationMonthlyIncome[me]!;
    nextMonth(w);
    expect(grievancesOf(w, p)).toContain("Conscription");
    expect(MOODS[moodIndex(w, p)]).toBe("rioting");
    expect(w.nationMonthlyIncome[me]).toBeLessThan(income);
  });

  it("holds Foreign rule over a conquered people of a stranger tongue, not over cousins (CULT-015)", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "england");
    w.provinceOwner[p] = w.nationIndex.get("france")!;
    const q = capitalOf(w, "portugal");
    w.provinceOwner[q] = w.nationIndex.get("castile")!;
    nextMonth(w);
    expect(grievancesOf(w, p)).toContain("Foreign rule");
    expect(grievancesOf(w, q)).not.toContain("Foreign rule");
  });
});
