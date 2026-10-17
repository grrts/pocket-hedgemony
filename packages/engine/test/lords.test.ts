import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { crownShare, lordLands } from "../src/lords.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const lordsOf = (w: World, id: string) => w.lords.map((l, k) => [l, k] as const).filter(([l]) => l.nation === w.nationIndex.get(id));

describe("a living realm: lords", () => {
  it("gives France its great houses, and other realms a lord per four provinces", () => {
    const w = createWorld(rules, 1, tiles);
    expect(lordsOf(w, "france").map(([l]) => l.house)).toEqual(["Alencon", "Anjou", "Armagnac", "Bourbon", "Foix", "Nevers", "Orleans"]);
    const castile = w.nationIndex.get("castile")!;
    const provinces = w.provinceOwner.filter((o) => o === castile).length;
    expect(lordsOf(w, "castile").length).toBe(Math.floor(provinces / 4));
    for (const [, k] of lordsOf(w, "castile")) expect(lordLands(w, k).length).toBeGreaterThan(0);
    // The capital stays royal and gives all its tax.
    const toledo = w.provinceIndex.get(rules.nations[castile]!.capital)!;
    expect(w.provinceLord[toledo]).toBe(-1);
    expect(crownShare(w, toledo)).toBe(1);
  });

  it("halves what a loyal lord's province gives, and stops it when he turns disloyal; a gift wins him back a step", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("castile")!;
    w.player = me;
    const [[lord, k]] = lordsOf(w, "castile") as [readonly [{ loyalty: string }, number]];
    const p = lordLands(w, k)[0]!;
    expect(crownShare(w, p)).toBe(0.5);
    // Seizing two of his provinces: he drops twice.
    expect(applyNow(w, { type: "seizeFief", province: p }, me).rejectedOrders).toEqual([]);
    const q = lordLands(w, k)[0]!;
    expect(applyNow(w, { type: "seizeFief", province: q }, me).rejectedOrders).toEqual([]);
    expect(lord.loyalty).toBe("Disloyal");
    expect(crownShare(w, lordLands(w, k)[0] ?? p)).toBe(lordLands(w, k).length ? 0 : 1);
    expect(applyNow(w, { type: "gift", lord: k }, me).rejectedOrders).toEqual([]);
    expect(lord.loyalty).toBe("Wavering");
    // A fief granted back is a want granted; a great lord (4+ provinces) needs one more before he steps up (REALM-162).
    expect(applyNow(w, { type: "grantFief", province: p, lord: k }, me).rejectedOrders).toEqual([]);
    expect(w.provinceLord[p]).toBe(k);
    expect(lord.loyalty).toBe(lordLands(w, k).length >= 4 ? "Wavering" : "Loyal");
  });

  it("lets AI realms win back wavering lords with gifts", () => {
    const w = createWorld(rules, 1, tiles);
    const [[lord]] = lordsOf(w, "france") as [readonly [{ loyalty: string }, number]];
    lord.loyalty = "Disloyal";
    while (w.date.month !== 1) processTurn(w, [], -1);
    processTurn(w, [], -1);
    expect(lord.loyalty).not.toBe("Disloyal");
  });
});
