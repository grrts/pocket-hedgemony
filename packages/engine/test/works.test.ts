import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, monthBeginning, processTurn, tileMarch, type World } from "../src/index.ts";
import { tileStepHours } from "../src/march.ts";
import { wallsOf } from "../src/war.ts";
import { LEDGER, LEDGER_LINES, provinceTrade } from "../src/treasury.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { hashWorld } from "../src/hash.ts";
import { buildSheet, knowsInvention, nextStep, whyNot, WORK_COUNT, workCost, workIndex, worksAt } from "../src/works.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const work = (name: string) => workIndex(name);

function untilNewMonth(w: World, n: number): void {
  while (monthBeginning(w.date) === null) processTurn(w, [], n);
  processTurn(w, [], n);
}

/** A province of realm n where a work can be ordered now. */
function whereFits(w: World, n: number, name: string): number {
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === n && !whyNot(w, n, p, work(name))) return p;
  throw new Error(`nowhere to build a ${name}`);
}

describe("works (milestone 4)", () => {
  it("stands the map's castles and a stone castle in every capital in 1444", () => {
    const w = createWorld(rules, 1, tiles);
    for (const n of rules.nations) {
      const cap = w.provinceIndex.get(n.capital)!;
      expect(worksAt(w, cap, work("castle"))).toBe(2);
    }
    rules.provinces.forEach((def, p) => {
      if (def.castle === "fort" && !rules.nations.some((n) => n.capital === def.id)) expect(wallsOf(w, p)).toBe("earthwork ring fort");
      if (def.castle === "castle") expect(wallsOf(w, p)).toBe("stone castle");
    });
  });

  it("builds a farm: the gold goes when the site opens, and the farm stands when its months are up", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    w.nationTreasury[fra] = 500;
    const p = whereFits(w, fra, "farm");
    const step = nextStep(w, p, work("farm"));
    const { gold, months } = workCost(w, p, work("farm"), step);
    expect(applyNow(w, { type: "build", province: p, work: work("farm") }, fra).rejectedOrders).toEqual([]);
    expect(w.nationTreasury[fra]).toBeCloseTo(500 - gold);
    expect(w.sites.filter((s) => s.nation === fra)).toHaveLength(1);
    let built = false;
    for (let m = 0; m < months + 1 && !built; m++) {
      untilNewMonth(w, fra);
      built = worksAt(w, p, work("farm")) === step;
    }
    expect(built).toBe(true);
    expect(w.sites.some((s) => s.province === p)).toBe(false);
  });

  it("queues a second work for the same site, starts it when the site is free, and gives half back on a cancel", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    w.nationTreasury[fra] = 500;
    // Two works for the same site: a farm and a road both take the land site.
    let p = -1;
    let town: string[] = [];
    for (let i = 0; i < w.provinceCount && p < 0; i++) {
      town = ["farm", "road"].filter((x) => w.provinceOwner[i] === fra && !whyNot(w, fra, i, work(x)));
      if (town.length === 2) p = i;
    }
    expect(p).toBeGreaterThanOrEqual(0);
    applyNow(w, { type: "build", province: p, work: work(town[0]!) }, fra);
    applyNow(w, { type: "build", province: p, work: work(town[1]!) }, fra);
    expect(w.workQueue).toEqual([{ nation: fra, province: p, work: work(town[1]!), step: nextStep(w, p, work(town[1]!)) - 1 }]);
    const site = w.sites.find((s) => s.province === p)!;
    const before = w.nationTreasury[fra]!;
    expect(applyNow(w, { type: "cancelBuild", province: p, work: site.work }, fra).rejectedOrders).toEqual([]);
    expect(w.nationTreasury[fra]).toBeCloseTo(before + site.gold / 2);
    // The queued work takes the free site at the next month.
    untilNewMonth(w, fra);
    expect(w.sites.some((s) => s.province === p && s.work === work(town[1]!))).toBe(true);
    expect(w.workQueue).toEqual([]);
  });

  it("moves an order earlier or later in its province's queue", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    w.nationTreasury[fra] = 0;
    let p = -1;
    let ok: number[] = [];
    for (let i = 0; i < w.provinceCount && p < 0; i++) {
      if (w.provinceOwner[i] !== fra) continue;
      ok = Array.from({ length: WORK_COUNT }, (_, k) => k).filter((k) => !whyNot(w, fra, i, k));
      if (ok.length >= 2) p = i;
    }
    // Without the gold both wait, in the order given.
    for (const k of ok.slice(0, 2)) expect(applyNow(w, { type: "build", province: p, work: k }, fra).rejectedOrders).toEqual([]);
    expect(w.workQueue.map((q) => q.work)).toEqual(ok.slice(0, 2));
    applyNow(w, { type: "moveBuild", province: p, work: ok[1]!, by: -1 }, fra);
    expect(w.workQueue.map((q) => q.work)).toEqual([ok[1], ok[0]]);
  });

  it("pays works upkeep on the ledger, and empty coffers leave the works giving half", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    processTurn(w, [], fra);
    expect(w.nationLedger[fra * LEDGER_LINES + LEDGER.indexOf("works")]).toBeLessThan(0);
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === fra && worksAt(w, i, work("market")) > 0)!;
    const full = provinceTrade(w, p);
    w.nationTreasury[fra] = -100;
    untilNewMonth(w, fra);
    expect(w.nationNeglect[fra]).toBe(1);
    expect(provinceTrade(w, p)).toBeLessThan(full);
  });

  it("needs its invention for the next step: a stone castle where only earthworks are known is out of reach", () => {
    const w = createWorld(rules, 1, tiles);
    for (let n = 0; n < w.nationCount; n++) {
      if (knowsInvention(w, n, "B1")) continue;
      const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === n && worksAt(w, i, work("castle")) === 1);
      if (p === undefined) continue;
      expect(whyNot(w, n, p, work("castle"))).toMatch(/^needs /);
      return;
    }
  });

  it("speeds armies along a road", () => {
    const w = createWorld(rules, 1, tiles);
    const m = tileMarch(w);
    const t = tiles.centre[w.provinceIndex.get(rules.nations[nation(w, "france")]!.capital)!]!;
    const p = tiles.province[t + 1]! - 1;
    const army = { men: 5000, horse: 0, logistics: 0 };
    w.provinceWorks[p * WORK_COUNT + work("road")] = 0;
    w.provinceRoadHours[p] = 1;
    const plain = tileStepHours(m, t, t + 1, army);
    w.provinceRoadHours[p] = 1 - rules.defines.works.roadSpeed * 2;
    expect(tileStepHours(m, t, t + 1, army)).toBeCloseTo(plain * (1 - rules.defines.works.roadSpeed * 2));
  });

  it("lets the AI order works with spare gold", () => {
    const w = createWorld(rules, 3, tiles);
    w.player = nation(w, "france");
    for (let n = 0; n < w.nationCount; n++) w.nationTreasury[n] = 200;
    untilNewMonth(w, w.player);
    const builders = new Set(w.sites.map((s) => s.nation));
    expect(builders.size).toBeGreaterThan(10);
    expect(builders.has(w.player)).toBe(false);
  });

  it("keeps works, sites and the queue through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const cas = nation(w, "castile");
    w.player = cas;
    w.nationTreasury[cas] = 500;
    const p = w.provinceIndex.get(rules.nations[cas]!.capital)!;
    applyNow(w, { type: "build", province: p, work: work("market") }, cas);
    applyNow(w, { type: "build", province: p, work: work("drill yard") }, cas);
    w.provinceWorks[p * WORK_COUNT + work("road")] = 2;
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.sites).toEqual(w.sites);
    expect(back.workQueue).toEqual(w.workQueue);
    expect(Array.from(back.provinceWorks)).toEqual(Array.from(w.provinceWorks));
    expect(back.provinceRoadHours[p]).toBeCloseTo(1 - rules.defines.works.roadSpeed * 2);
    expect(hashWorld(back)).toBe(hashWorld(w));
  });

  it("offers only works the land suits on the build sheet", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const p = w.provinceIndex.get(rules.nations[fra]!.capital)!;
    const sheet = buildSheet(w, fra, p);
    expect(sheet.some((r) => r.work === work("castle"))).toBe(true);
    expect(sheet.every((r) => r.gold >= 0 && r.months > 0)).toBe(true);
    if (!rules.provinces[p]!.coastal) expect(sheet.some((r) => r.work === work("harbour"))).toBe(false);
  });
});
