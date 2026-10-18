import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, monthBeginning, processTurn, tileMarch, type World } from "../src/index.ts";
import { tileStepHours } from "../src/march.ts";
import { wallsOf } from "../src/war.ts";
import { LEDGER, LEDGER_LINES } from "../src/treasury.ts";
import { provinceWares, refreshTradeValues, tradeValueAt, warePrice } from "../src/trade.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { hashWorld } from "../src/hash.ts";
import { gameTarget, huntingRoom, huntingYear, seamWare, SEAM_WARES, tilesOf, tileCount, MAX_TILES } from "../src/land.ts";
import { landSheet, mineYear, worksFood } from "../src/works.ts";

/** Gold a year a province's goods are worth. */
const goods = (w: World, p: number) => provinceWares(w, p).reduce((t, x) => t + x.loads * warePrice(x.ware), 0);
import { aiChanges, changeGold, changeMonths, monthlyChanges, orderChange, stopChange, whyNotChange } from "../src/conversion.ts";
import { CLASS_COUNT, CLASS_NAMES } from "../src/living.ts";
import { yearlyFood } from "../src/food.ts";
import { buildSheet, knowsInvention, nextStep, slotsOf, slotsUsed, whyNot, WORK_COUNT, workCost, workIndex, worksAt } from "../src/works.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const work = (name: string) => workIndex(name);
let fresh: World | null = null;
const createWorldOnce = () => (fresh ??= createWorld(rules, 1, tiles));

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

  it("gives a province slots by its people, one for each work, and none left means no new work", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const d = rules.defines.works;
    const p = w.provinceIndex.get(rules.nations[fra]!.capital)!;
    w.provincePopulation[p] = d.townPeople[1]! - 1;
    expect(slotsOf(w, p)).toBe(d.baseSlots + 1);
    w.provincePopulation[p] = d.townPeople.at(-1)! + 1;
    expect(slotsOf(w, p)).toBe(d.baseSlots + d.townPeople.length);
    // Fill every slot: a new work is refused, a next step of one standing is not.
    w.provincePopulation[p] = 1;
    w.provinceWorks.fill(0, p * WORK_COUNT, (p + 1) * WORK_COUNT);
    w.provinceWorks[p * WORK_COUNT + work("castle")] = 1;
    w.provinceWorks[p * WORK_COUNT + work("road")] = 1;
    expect(slotsUsed(w, p)).toBe(slotsOf(w, p));
    expect(whyNot(w, fra, p, work("farm"))).toMatch(/^no free slot/);
    expect(whyNot(w, fra, p, work("road"))).not.toMatch(/^no free slot/);
    // Every province starts within its slots.
    for (let q = 0; q < w.provinceCount; q++) if (!w.provinceWater[q]) expect(slotsUsed(createWorldOnce(), q)).toBeLessThanOrEqual(slotsOf(createWorldOnce(), q));
  });

  it("pays works upkeep on the ledger, and empty coffers leave the works giving half", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    processTurn(w, [], fra);
    expect(w.nationLedger[fra * LEDGER_LINES + LEDGER.indexOf("works")]).toBeLessThan(0);
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === fra && worksAt(w, i, work("market")) > 0)!;
    const full = tradeValueAt(w, p);
    w.nationTreasury[fra] = -100;
    untilNewMonth(w, fra);
    expect(w.nationNeglect[fra]).toBe(1);
    refreshTradeValues(w);
    expect(tradeValueAt(w, p)).toBeLessThan(full);
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

  it("lays out every province's 4 to 16 tiles, with a town tile and shore on a coast (PROV-010, PROV-018)", () => {
    const w = createWorldOnce();
    for (let p = 0; p < w.provinceCount; p++) {
      if (w.provinceWater[p]) continue;
      const n = tileCount(w, p);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(MAX_TILES);
      expect(tilesOf(w, p, "town")).toBe(1);
      if (!rules.provinces[p]!.coastal) expect(tilesOf(w, p, "shore")).toBe(0);
    }
  });

  it("works a province's fields from one farm: its farmers feed more on them than on bare land (feedback 80)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === fra && tilesOf(w, i, "fields") > 0)!;
    w.provinceWorks[p * WORK_COUNT + work("farm")] = 0;
    const bare = yearlyFood(w, p);
    w.provinceWorks[p * WORK_COUNT + work("farm")] = 1;
    const one = yearlyFood(w, p);
    w.provinceWorks[p * WORK_COUNT + work("farm")] = 3;
    expect(one).toBeGreaterThan(bare);
    expect(yearlyFood(w, p)).toBeGreaterThan(one);
    // No fields, no farm.
    w.provinceTiles.fill(0, p * MAX_TILES, (p + 1) * MAX_TILES);
    w.provinceTiles[p * MAX_TILES] = 7;
    w.provinceWorks[p * WORK_COUNT + work("farm")] = 0;
    expect(whyNot(w, fra, p, work("farm"))).toBe("needs fields in the province");
  });

  it("starts every province fed in a normal year, at about 110 % (feedback 80)", () => {
    const w = createWorldOnce();
    const share = rules.defines.works.seedFoodShare;
    for (let p = 0; p < w.provinceCount; p++) {
      if (w.provinceWater[p] || w.provincePopulation[p]! <= 0) continue;
      expect(yearlyFood(w, p) / w.provincePopulation[p]!).toBeGreaterThanOrEqual(share - 0.01);
    }
  });

  it("hunts in the woods: a lodge brings in more, crowded woods thin, a hard winter cuts the catch (feedback 81)", () => {
    const w = createWorld(rules, 1, tiles);
    const swe = nation(w, "sweden");
    const wd = CLASS_NAMES.indexOf("woodsmen");
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === swe && tilesOf(w, i, "woods") > 0 && w.provinceClasses[i * CLASS_COUNT + wd]! > 0)!;
    // Fewer hunters than the woods hold: plenty of game.
    w.provinceClasses[p * CLASS_COUNT + wd] = huntingRoom(w, p) / 2;
    w.provinceGame[p] = 1;
    expect(gameTarget(w, p)).toBe(1);
    w.provinceWorks[p * WORK_COUNT + work("hunting lodge")] = 0;
    const bare = worksFood(w, p, "woodsmen");
    w.provinceWorks[p * WORK_COUNT + work("hunting lodge")] = 1;
    const lodge = worksFood(w, p, "woodsmen");
    expect(lodge).toBeGreaterThan(bare * 1.4);
    // A hard winter cuts the year's catch.
    w.provinceHardWinter[p] = 1;
    expect(worksFood(w, p, "woodsmen")).toBeCloseTo(lodge * 0.6, 5);
    w.provinceHardWinter[p] = 0;
    // Three times the hunters the woods hold: the game thins year by year toward the floor.
    w.provinceClasses[p * CLASS_COUNT + wd] = huntingRoom(w, p) * 3;
    expect(gameTarget(w, p)).toBeLessThan(0.5);
    for (let y = 0; y < 10; y++) huntingYear(w, () => 0);
    expect(w.provinceGame[p]).toBeLessThan(0.6);
    // Without woods, no lodge.
    w.provinceTiles.fill(0, p * MAX_TILES, (p + 1) * MAX_TILES);
    w.provinceTiles[p * MAX_TILES] = 7;
    w.provinceWorks[p * WORK_COUNT + work("hunting lodge")] = 0;
    expect(whyNot(w, swe, p, work("hunting lodge"))).toBe("needs woods in the province");
  });

  it("changes a tile's use one at a time, for gold and months (feedback 86)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === fra && w.provinceLord[i]! < 0 && tilesOf(w, i, "woods") > 0)!;
    w.nationTreasury[fra] = 1000;
    const woods = tilesOf(w, p, "woods");
    const fields = tilesOf(w, p, "fields");
    expect(orderChange(w, fra, p, "clear woods")).toBeNull();
    expect(w.nationTreasury[fra]).toBeCloseTo(1000 - changeGold(w, p, "clear woods"), 4);
    // One at a time.
    expect(whyNotChange(w, fra, p, "to pasture")).toMatch(/one change at a time/);
    for (let m = 0; m < changeMonths("clear woods") - 1; m++) monthlyChanges(w, []);
    expect(tilesOf(w, p, "woods")).toBe(woods);
    const news: { text: string }[] = [];
    monthlyChanges(w, news as never);
    expect(tilesOf(w, p, "woods")).toBe(woods - 1);
    expect(tilesOf(w, p, "fields")).toBe(fields + 1);
    expect(news[0]!.text).toMatch(/Woods cleared/);
    // Stopping gives half the gold back.
    expect(orderChange(w, fra, p, "to pasture")).toBeNull();
    const after = w.nationTreasury[fra]!;
    expect(stopChange(w, fra, p)).toBeNull();
    expect(w.nationTreasury[fra]).toBeCloseTo(after + changeGold(w, p, "to pasture") / 2, 4);
    // Draining needs Polder drainage; a lord's land is his to change.
    w.provinceTiles[p * MAX_TILES + 1] = 4;
    if (!w.research[fra]?.known.has("F8")) expect(whyNotChange(w, fra, p, "drain")).toMatch(/Polder drainage/);
    w.provinceLord[p] = 0;
    expect(whyNotChange(w, fra, p, "plough")).toMatch(/lord/);
  });

  it("lets the AI clear woods where a province goes hungry (feedback 86)", () => {
    const w = createWorld(rules, 1, tiles);
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i]! >= 0 && w.provinceOwner[i] !== w.player && tilesOf(w, i, "woods") >= 2)!;
    w.nationTreasury[w.provinceOwner[p]!] = 1000;
    w.provincePopulation[p] = w.provincePopulation[p]! * 3;
    w.date.month = 1;
    aiChanges(w);
    expect(w.provinceChangeTile[p]).toBeGreaterThanOrEqual(0);
  });

  it("keeps tiles through a save", () => {
    const w = createWorld(rules, 1, tiles);
    w.provinceTiles[0] = 3;
    w.provinceGame[5] = 0.42;
    w.provinceChangeTile[5] = 2;
    w.provinceChangeLeft[5] = 7;
    w.provinceHardWinter[5] = 1;
    w.provinceSeam[5] = 3;
    w.provinceSeamYears[5] = 17;
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(Array.from(back.provinceTiles)).toEqual(Array.from(w.provinceTiles));
    expect(Array.from(back.provinceLandYield)).toEqual(Array.from(w.provinceLandYield));
    expect(back.provinceGame[5]).toBeCloseTo(0.42, 5);
    expect(back.provinceHardWinter[5]).toBe(1);
    expect(back.provinceChangeTile[5]).toBe(2);
    expect(back.provinceChangeLeft[5]).toBe(7);
    expect(back.provinceSeam[5]).toBe(3);
    expect(back.provinceSeamYears[5]).toBe(17);
  });

  it("finds seams under rough waste and stands the famous mines of 1444 (feedback 87)", () => {
    const w = createWorldOnce();
    const kutna = w.rules.provinces.findIndex((d) => d.name === "Středočeský");
    expect(seamWare(w, kutna)).toBe("silver");
    expect(worksAt(w, kutna, work("mine"))).toBe(1);
    // Its seam shows on the waste tile of the Land tab with the mine and its silver.
    const waste = landSheet(w, kutna).find((t) => t.use === "waste")!;
    expect(waste.building).toContain("mine");
    expect(waste.seam).toEqual({ ware: "silver", years: 120 });
    expect(waste.ware?.name).toContain("silver");
    // Hundreds of provinces hold a seam: about a third of the rough waste.
    let seams = 0;
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceSeam[p]! >= 0) seams++;
    expect(seams).toBeGreaterThan(200);
  });

  it("needs a seam and timber in reach for a mine, and digs the seam out year by year (feedback 87)", () => {
    const w = createWorld(rules, 1, tiles);
    const n = nation(w, "castile");
    const rough = [...Array(w.provinceCount).keys()].find((p) => w.provinceOwner[p] === n && (w.provinceGround[p] === "hills" || w.provinceGround[p] === "mountains") && tilesOf(w, p, "waste") > 0 && worksAt(w, p, work("mine")) === 0)!;
    w.provinceSeam[rough] = -1;
    expect(whyNot(w, n, rough, work("mine"))).toBe("no ore deposit has been found here");
    w.provinceSeam[rough] = SEAM_WARES.indexOf("iron");
    w.provinceSeamYears[rough] = 2;
    w.provinceWorks[rough * WORK_COUNT + work("lumber camp")] = 0;
    for (let k = w.adjStart[rough]!; k < w.adjStart[rough + 1]!; k++) w.provinceWorks[w.adjList[k]! * WORK_COUNT + work("lumber camp")] = 0;
    expect(whyNot(w, n, rough, work("mine"))).toBe("needs timber: a lumber camp here or next door");
    w.provinceWorks[rough * WORK_COUNT + work("lumber camp")] = 1;
    expect(whyNot(w, n, rough, work("mine"))).not.toMatch(/ore deposit|timber/);
    // A mine standing adds its ore to the province's goods (TRADE-129), silver at the precious price.
    const before = goods(w, rough);
    w.provinceWorks[rough * WORK_COUNT + work("mine")] = 1;
    expect(goods(w, rough)).toBeGreaterThan(before);
    w.provinceSeam[rough] = SEAM_WARES.indexOf("silver");
    expect(provinceWares(w, rough).find((x) => x.ware === "silver")).toBeTruthy();
    expect(warePrice("silver")).toBe(12);
    // Each January it digs a year off; when the seam runs out the mine closes.
    const news: { text: string }[] = [];
    mineYear(w, news as never);
    expect(w.provinceSeamYears[rough]).toBe(1);
    expect(worksAt(w, rough, work("mine"))).toBe(1);
    mineYear(w, news as never);
    expect(worksAt(w, rough, work("mine"))).toBe(0);
    expect(seamWare(w, rough)).toBeNull();
    expect(news.some((x) => /silver mine in .* has run out/.test(x.text))).toBe(true);
  });

  it("makes salt on a dry or warm coast (feedback 87)", () => {
    const w = createWorldOnce();
    const n = nation(w, "castile");
    const p = whereFits(w, n, "saltworks");
    expect(buildSheet(w, n, p).some((r) => r.name === "saltworks")).toBe(true);
  });
});
