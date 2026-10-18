import { describe, expect, it, vi } from "vitest";
import type { SettlementView } from "@ph/engine";
// The icons are painted on a canvas, which tests have not got.
vi.mock("../art/ui.ts", () => ({ icon: () => "" }));

import { draftCost, fitDraft, offerLine, peaceTable, startDraft, stepGold, togglePick } from "./peace.ts";

const view: SettlementView = {
  target: 5,
  whole: true,
  capacity: 20,
  realmValue: 90,
  parts: [
    { part: "land_held", points: 12 },
    { part: "capital_held", points: 0 },
    { part: "battles", points: 4 },
    { part: "armies", points: 2 },
    { part: "will_to_fight", points: 2 },
  ],
  surrendered: false,
  provinces: [
    { province: 10, realm: 5, cost: 9 },
    { province: 11, realm: 5, cost: 6 },
    { province: 12, realm: 5, cost: 15, why: "their capital: only in the peace that takes their last province" },
  ],
  mostPerRealm: [{ realm: 5, most: 1 }],
  maxGold: 120,
  goldPerPoint: 25,
  best: { provinces: [10], gold: 100 },
};
const names = { province: (p: number) => `Prov${p}`, realm: (n: number) => `Realm${n}`, lost: 0 };

describe("the peace table (WAR-248)", () => {
  it("starts from the most the war allows and prices the draft as the engine does", () => {
    const d = startDraft(view);
    expect(d).toEqual({ provinces: [10], gold: 100 });
    expect(draftCost(view, d)).toBe(9 + 4);
  });

  it("toggles land within the per-realm limit, never the capital, and steps gold within their treasury", () => {
    let d = { provinces: [] as number[], gold: 0 };
    d = togglePick(view, d, 10);
    expect(d.provinces).toEqual([10]);
    expect(togglePick(view, d, 11).provinces).toEqual([10]);
    expect(togglePick(view, d, 12).provinces).toEqual([10]);
    expect(togglePick(view, d, 10).provinces).toEqual([]);
    expect(stepGold(view, d, 1).gold).toBe(25);
    expect(stepGold(view, { ...d, gold: 100 }, 1).gold).toBe(120);
    expect(stepGold(view, d, -1).gold).toBe(0);
    expect(fitDraft(view, { provinces: [12, 99, 10], gold: 500 })).toEqual({ provinces: [10], gold: 120 });
  });

  it("shows the capacity, where it comes from, each province as a 44-point toggle and whether they will sign", () => {
    const html = peaceTable(view, { provinces: [10], gold: 0 }, names);
    expect(html).toContain("up to <b>20</b>");
    expect(html).toContain("Asked <b>9</b> of <b>20</b>");
    expect(html).toContain("they will sign");
    expect(html.match(/class="paper peace-pick/g)).toHaveLength(3);
    expect(html).toContain('data-peace-pick="10" aria-pressed="true"');
    expect(html).toMatch(/data-peace-pick="12" aria-pressed="false" disabled/);
    expect(html).toMatch(/data-peace-pick="11" aria-pressed="false" disabled/);
    expect(html).toContain("Their wish for peace");
    expect(html).not.toContain("Give up");
    const over = peaceTable(view, { provinces: [10], gold: 120 }, { ...names, lost: 2 });
    expect(over).toContain("Asked <b>14</b> of <b>20</b>");
    expect(peaceTable({ ...view, capacity: 15 }, { provinces: [10, 11], gold: 120 }, names)).toContain("Over by <b>5</b>");
    expect(peaceTable(view, { provinces: [], gold: 0 }, { ...names, lost: 2 })).toContain("Give up 2 provinces");
    expect(peaceTable({ ...view, surrendered: true }, startDraft(view), names)).toContain("They have surrendered");
  });

  it("words each kind of offer the player gets", () => {
    const name = (p: number) => `Prov${p}`;
    expect(offerLine({ id: 1, from: 5, terms: "give", provinces: [10, 11], gold: 50, counter: true }, name)).toBe("will not give all you asked, but offers Prov10, Prov11 and 50 gold");
    expect(offerLine({ id: 1, from: 5, terms: "give", provinces: [10], gold: 0, surrender: true }, name)).toMatch(/^has surrendered unconditionally. It will sign Prov10/);
    expect(offerLine({ id: 1, from: 5, terms: "take", provinces: [3], gold: 0 }, name)).toBe("offers peace if you give it Prov3");
    expect(offerLine({ id: 1, from: 5, terms: "white" }, name)).toBe("offers a white peace: no land changes hands");
  });
});
