import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld } from "../src/index.ts";
import { canBorrow, isBroke, monthlyDebts } from "../src/treasury.ts";
import { stabilityOf, STABILITY } from "../src/stability.ts";
import type { News } from "../src/war.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

describe("default (X-29)", () => {
  it("warns a broke realm twice, then defaults: debt gone, lords turned, troubled, no lenders", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.nationIndex.get("castile")!;
    w.player = n;
    w.nationDebt[n] = 1e6;
    w.nationTreasury[n] = -50;
    expect(isBroke(w, n)).toBe(true);
    const loyal = w.lords.filter((l) => l.nation === n && !l.gone && l.loyalty === "Loyal").length;
    expect(loyal).toBeGreaterThan(0);
    const news: News[] = [];
    monthlyDebts(w, news);
    monthlyDebts(w, news);
    expect(news.filter((x) => /defaults on its debts in/.test(x.text))).toHaveLength(2);
    expect(STABILITY[stabilityOf(w, n).pillars[4]!.step]).toBe("Uneasy");
    expect(w.nationDebt[n]).toBe(1e6);
    monthlyDebts(w, news);
    expect(w.nationDebt[n]).toBe(0);
    expect(w.nationTreasury[n]).toBe(0);
    expect(w.nationDefaultYear[n]).toBe(w.date.year);
    expect(w.lords.filter((l) => l.nation === n && !l.gone && l.loyalty === "Loyal")).toHaveLength(0);
    expect(STABILITY[stabilityOf(w, n).step]).not.toBe("Steady");
    expect(stabilityOf(w, n).pillars[4]).toMatchObject({ key: "treasury", step: 2 });
    expect(canBorrow(w, n)).toBe(0);
  });

  it("a realm that can still borrow, or has gold, is not broke", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.nationIndex.get("castile")!;
    w.nationTreasury[n] = -1;
    expect(isBroke(w, n)).toBe(false);
    monthlyDebts(w, []);
    expect(w.nationBrokeMonths[n]).toBe(0);
  });
});
