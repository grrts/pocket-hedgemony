import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, monthBeginning, processTurn, type World } from "../src/index.ts";
import { aiTreasury, canBorrow, LEDGER, LEDGER_LINES, NORMAL_TAX, provinceTax, runLedger, TAX_RATES, taxRateOf } from "../src/treasury.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { hashWorld } from "../src/hash.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const capital = (w: World, n: number) => w.provinceIndex.get(rules.nations[n]!.capital)!;
const line = (w: World, n: number, name: (typeof LEDGER)[number]) => w.nationLedger[n * LEDGER_LINES + LEDGER.indexOf(name)]!;
const rate = (name: (typeof TAX_RATES)[number]) => TAX_RATES.indexOf(name);

function untilNewMonth(w: World, n: number): void {
  while (monthBeginning(w.date) === null) processTurn(w, [], n);
  processTurn(w, [], n);
}

describe("tax rates and the treasury ledger", () => {
  it("keeps a monthly ledger whose lines add up to the income paid in", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    processTurn(w, [], fra);
    expect(line(w, fra, "tax")).toBeGreaterThan(0);
    expect(line(w, fra, "trade")).toBeGreaterThan(0);
    expect(line(w, fra, "officials")).toBeLessThan(0);
    const sum = LEDGER.reduce((t, l) => t + line(w, fra, l), 0);
    expect(w.nationMonthlyIncome[fra]).toBeCloseTo(sum);
    const before = w.nationTreasury[fra]!;
    untilNewMonth(w, fra);
    expect(w.nationTreasury[fra]).toBeCloseTo(before + w.nationMonthlyIncome[fra]!);
  });

  it("pays one wage a month for each official at his post", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    runLedger(w, false);
    let officials = 0;
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === fra && w.provinceOfficial[p]! >= 0) officials++;
    expect(line(w, fra, "officials")).toBeCloseTo(-officials * rules.defines.economy.officialWagePerMonth);
    // A commissioned official leaves his post and his wage with it.
    expect(applyNow(w, { type: "commission", province: capital(w, fra) }, fra).rejectedOrders).toEqual([]);
    runLedger(w, false);
    expect(line(w, fra, "officials")).toBeCloseTo(-(officials - 1) * rules.defines.economy.officialWagePerMonth);
  });

  it("taxes each province at its own rate, else the realm's default", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const paris = capital(w, fra);
    const normal = provinceTax(w, paris, fra);
    expect(taxRateOf(w, paris, fra)).toBe(NORMAL_TAX);
    expect(applyNow(w, { type: "setTax", province: paris, rate: rate("heavy") }, fra).rejectedOrders).toEqual([]);
    expect(provinceTax(w, paris, fra)).toBeCloseTo(normal * 1.5);
    // The realm default moves every province that follows it, not one set on its own.
    applyNow(w, { type: "setTax", province: -1, rate: rate("light") }, fra);
    expect(provinceTax(w, paris, fra)).toBeCloseTo(normal * 1.5);
    const other = w.adjList.subarray(w.adjStart[paris]!, w.adjStart[paris + 1]!).find((p) => w.provinceOwner[p] === fra && w.provinceTax[p] === -1)!;
    expect(taxRateOf(w, other, fra)).toBe(rate("light"));
    // Back to the default.
    applyNow(w, { type: "setTax", province: paris, rate: -1 }, fra);
    expect(provinceTax(w, paris, fra)).toBeCloseTo(normal * 0.5);
    applyNow(w, { type: "setTax", province: paris, rate: rate("none") }, fra);
    expect(provinceTax(w, paris, fra)).toBe(0);
    // Not someone else's province, and only the five steps.
    const eng = nation(w, "england");
    expect(applyNow(w, { type: "setTax", province: capital(w, eng), rate: rate("heavy") }, fra).rejectedOrders[0]?.reason).toBe("not your province");
    expect(applyNow(w, { type: "setTax", province: paris, rate: 5 }, fra).rejectedOrders[0]?.reason).toBe("no such tax rate");
  });

  it("lends up to a year's income at 10 % a year, and takes repayment", () => {
    const w = createWorld(rules, 1, tiles);
    const cas = nation(w, "castile");
    w.player = cas;
    runLedger(w, false);
    const year = 12 * (line(w, cas, "tax") + line(w, cas, "trade"));
    expect(canBorrow(w, cas)).toBeCloseTo(year);
    expect(applyNow(w, { type: "borrow", gold: year + 1 }, cas).rejectedOrders).toHaveLength(1);
    const gold = w.nationTreasury[cas]!;
    expect(applyNow(w, { type: "borrow", gold: 100 }, cas).rejectedOrders).toEqual([]);
    expect(w.nationTreasury[cas]).toBeCloseTo(gold + 100);
    expect(canBorrow(w, cas)).toBeCloseTo(year - 100);
    runLedger(w, false);
    expect(line(w, cas, "interest")).toBeCloseTo(-100 * 0.1 / 12);
    expect(applyNow(w, { type: "repay", gold: 40 }, cas).rejectedOrders).toEqual([]);
    expect(w.nationDebt[cas]).toBeCloseTo(60);
    // Repaying more than is owed pays off the debt.
    applyNow(w, { type: "repay", gold: 1000 }, cas);
    expect(w.nationDebt[cas]).toBe(0);
    expect(applyNow(w, { type: "repay", gold: 10 }, cas).rejectedOrders[0]?.reason).toBe("nothing owed");
  });

  it("the AI taxes normally at peace and heavily at war, and borrows only below zero gold", () => {
    const w = createWorld(rules, 1, tiles);
    runLedger(w, false);
    const hun = nation(w, "hungary");
    const id = w.nationIds[hun]!;
    const atWar = w.diplomacy.wars.some((x) => x.attackers.includes(id) || x.defenders.includes(id));
    aiTreasury(w, []);
    expect(w.nationTaxDefault[hun]).toBe(rate(atWar ? "heavy" : "normal"));
    expect(w.nationDebt[hun]).toBe(0);
    w.nationTreasury[hun] = -30;
    aiTreasury(w, []);
    expect(w.nationDebt[hun]).toBeCloseTo(31);
    expect(w.nationTreasury[hun]).toBeCloseTo(1);
    // The player's realm is left alone.
    const fra = nation(w, "france");
    w.player = fra;
    w.nationTreasury[fra] = -30;
    aiTreasury(w, []);
    expect(w.nationDebt[fra]).toBe(0);
  });

  it("keeps tax rates, debt and the ledger in a save", () => {
    const w = createWorld(rules, 1, tiles);
    const cas = nation(w, "castile");
    w.player = cas;
    applyNow(w, { type: "setTax", province: capital(w, cas), rate: rate("crushing") }, cas);
    applyNow(w, { type: "setTax", province: -1, rate: rate("light") }, cas);
    applyNow(w, { type: "borrow", gold: 50 }, cas);
    processTurn(w, [], cas);
    const chunks = worldChunks(w, { playerNation: "castile", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.provinceTax[capital(w, cas)]).toBe(rate("crushing"));
    expect(back.nationTaxDefault[cas]).toBe(rate("light"));
    expect(back.nationDebt[cas]).toBe(50);
    expect(Array.from(back.nationLedger)).toEqual(Array.from(w.nationLedger));
    expect(hashWorld(back)).toBe(hashWorld(w));
  });
});

describe("heavy taxes stir the province", () => {
  it("gives the Heavy taxes grievance at heavy, counted twice at crushing", async () => {
    const { grievanceCount, grievancesOf, monthlyMoods } = await import("../src/moods.ts");
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const paris = capital(w, fra);
    monthlyMoods(w, []);
    const base = grievanceCount(w, paris);
    expect(grievancesOf(w, paris)).not.toContain("Heavy taxes");
    applyNow(w, { type: "setTax", province: paris, rate: rate("heavy") }, fra);
    monthlyMoods(w, []);
    expect(grievancesOf(w, paris)).toContain("Heavy taxes");
    expect(grievanceCount(w, paris)).toBe(base + 1);
    applyNow(w, { type: "setTax", province: paris, rate: rate("crushing") }, fra);
    monthlyMoods(w, []);
    expect(grievanceCount(w, paris)).toBe(base + 2);
    applyNow(w, { type: "setTax", province: paris, rate: rate("normal") }, fra);
    monthlyMoods(w, []);
    expect(grievancesOf(w, paris)).not.toContain("Heavy taxes");
  });
});

describe("tax and the lords", () => {
  it("a lord keeps his share, and wavers when his land is taxed heavy", async () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    const p = Array.from(w.provinceOwner).findIndex((o, i) => o === fra && w.provinceLord[i]! >= 0 && w.lords[w.provinceLord[i]!]!.loyalty === "Loyal");
    expect(p).toBeGreaterThanOrEqual(0);
    const lord = w.provinceLord[p]!;
    const royal = Array.from(w.provinceOwner).findIndex((o, i) => o === fra && w.provinceLord[i]! < 0 && w.provinceOfficial[i]! >= 0);
    // Same people and official, a lord's province pays the crown half.
    const perThousand = (q: number) => provinceTax(w, q, fra) / w.provincePopulation[q]!;
    if (w.provinceOfficial[p]! >= 0) expect(perThousand(p)).toBeCloseTo(perThousand(royal) * 0.5);
    applyNow(w, { type: "setTax", province: p, rate: rate("light") }, fra);
    expect(w.lords[lord]!.loyalty).toBe("Loyal");
    const r = applyNow(w, { type: "setTax", province: p, rate: rate("heavy") }, fra);
    expect(r.rejectedOrders).toEqual([]);
    expect(w.lords[lord]!.loyalty).not.toBe("Loyal");
  });
});
