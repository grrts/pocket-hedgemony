import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { hashWorld } from "../src/hash.ts";
import { declareWar } from "../src/war.ts";
import { LEDGER, LEDGER_LINES, provinceTax } from "../src/treasury.ts";
import { CLASS_COUNT, classIndex } from "../src/living.ts";
import { workIndex, WORK_COUNT, worksAt } from "../src/works.ts";
import { tradeConfig } from "../src/domain/trade/index.ts";
import {
  bestRoute, dismissTrader, draftTradeRoute, estimateLoop, foundProblem, foundTrader, isTradeStop, kindRow, loopPath, monthlyTrade, provinceWares, refreshTradeValues,
  routeOptions, routeProblem, setTradeRoute, startCount, suggestRoutes, tradeDay, tradeLine, tradeSeen, traderWalks, tradeTaxFactor, tradeValueAt, tradeView, warePrice,
} from "../src/trade.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const capital = (w: World, n: number) => w.provinceIndex.get(rules.nations[n]!.capital)!;
const own = (w: World, n: number) => [...Array(w.provinceCount).keys()].filter((p) => w.provinceOwner[p] === n);
const MARKET_FOLK = classIndex("market folk");

describe("trade in the game (TRADE-129 to TRADE-140)", () => {
  const w = createWorld(rules, 1, tiles);
  const fra = nation(w, "france");
  const paris = capital(w, fra);

  it("counts each province's goods from its works, food surplus and craftsmen, priced by tier (TRADE-129)", () => {
    const wares = provinceWares(w, paris);
    expect(wares.some((x) => x.ware === "crafts")).toBe(true);
    expect(warePrice("crafts")).toBe(5);
    expect(warePrice("salt")).toBe(1);
    expect(warePrice("wool")).toBe(2);
    expect(warePrice("gold")).toBe(12);
    expect(warePrice("stone")).toBe(1);
    // Sea zones trade nothing.
    const sea = [...Array(w.provinceCount).keys()].find((p) => w.provinceWater[p])!;
    expect(provinceWares(w, sea)).toEqual([]);
    expect(tradeValueAt(w, sea)).toBe(0);
  });

  it("weighs a province's market into its trade value, and a harbour for ships only (TRADE-130)", () => {
    const p = own(w, fra).find((q) => w.provinceGoodsValue[q]! > 0)!;
    const keep = w.provinceWeight[p]!;
    w.provinceWeight[p] = 0;
    const plain = tradeValueAt(w, p);
    const goodsMonth = (w.provinceGoodsValue[p]! / 12) * tradeConfig.game.value_scale;
    expect(plain).toBeCloseTo(goodsMonth, 6);
    w.provinceWeight[p] = tradeConfig.value.building_weights.weekly_market.weight;
    expect(tradeValueAt(w, p)).toBeCloseTo(goodsMonth * 1.25, 6);
    w.provinceWeight[p] = keep;
    // A harbour adds its weight to ships only.
    const port = own(w, fra).find((q) => worksAt(w, q, workIndex("harbour")) > 0 && w.provinceGoodsValue[q]! > 0)!;
    expect(tradeValueAt(w, port, true)).toBeGreaterThan(tradeValueAt(w, port));
  });

  it("lets land traders stop at cities and market towns and ships at ports (TRADE-131)", () => {
    for (const p of own(w, fra)) {
      if (w.provinceTradeCity[p]! & 1) expect(isTradeStop(w, p, "pack_caravan")).toBe(true);
      if (worksAt(w, p, workIndex("market")) > 0) expect(isTradeStop(w, p, "pack_caravan")).toBe(true);
      expect(isTradeStop(w, p, "cog_junk_dhow")).toBe(worksAt(w, p, workIndex("harbour")) > 0);
    }
  });

  it("starts every realm with traders by its trade access, already walking, the ratios set by two years of them (TRADE-138)", () => {
    expect(w.traders.length).toBeGreaterThan(100);
    const ven = nation(w, "venice");
    expect(startCount(w, ven)).toBe(6);
    expect(w.traders.filter((t) => t.owner === ven).length).toBeGreaterThan(0);
    expect(w.traders.filter((t) => t.owner === fra).length).toBeLessThanOrEqual(startCount(w, fra));
    for (const t of w.traders) expect(t.stops.length).toBe(2);
    expect(Array.from(w.provinceTradeRatio).filter((r) => r > 0).length).toBeGreaterThan(200);
    // The ledger opens with a month of trade in it.
    expect(w.nationLedger[ven * LEDGER_LINES + LEDGER.indexOf("trade")]).toBeGreaterThan(0);
  });

  it("walks traders a month, collecting as they enter and depositing in their own cities; the Trade line is deposits and fees less upkeep (TRADE-132, TRADE-134)", () => {
    const x = createWorld(rules, 1, tiles);
    const before = x.traders.map((t) => ({ at: t.at, purse: t.purse }));
    monthlyTrade(x, []);
    expect(x.traders.some((t, k) => t.at !== before[k]!.at)).toBe(true);
    const ven = nation(x, "venice");
    const line = tradeLine(x, ven);
    expect(line).toBeCloseTo(x.nationTrade[ven * 3]! + x.nationTrade[ven * 3 + 1]! - x.nationTrade[ven * 3 + 2]!, 9);
    const upkeep = x.traders.filter((t) => t.owner === ven).reduce((s, t) => s + kindRow(x, t.kind).upkeep, 0);
    expect(x.nationTrade[ven * 3 + 2]).toBeCloseTo(upkeep, 9);
    const deposited = x.traders.filter((t) => t.owner === ven).reduce((s, t) => s + t.thisMonth, 0);
    expect(x.nationTrade[ven * 3]).toBeCloseTo(deposited, 9);
    for (const t of x.traders) expect(t.purse).toBeLessThanOrEqual(kindRow(x, t.kind).purse + 1e-9);
  });

  it("moves ratios: gain from traders passing, a tenth decays, no gain under an enemy (TRADE-133)", () => {
    const x = createWorld(rules, 1, tiles);
    const quiet = [...Array(x.provinceCount).keys()].find((p) => x.provinceTradeRatio[p]! > 10 && !x.traders.some((t) => t.stops.includes(p)))!;
    const r = x.provinceTradeRatio[quiet]!;
    const busy = x.traders[0]!.stops[0]!;
    x.provinceOccupier[busy] = -1;
    monthlyTrade(x, []);
    if (x.provincePassed[quiet] === 0) expect(x.provinceTradeRatio[quiet]).toBeCloseTo(r * 0.9, 4);
    expect(x.provinceTradeRatio[busy]).toBeGreaterThan(0);
    for (const v of x.provinceTradeRatio) expect(v).toBeLessThanOrEqual(100);
  });

  it("raises tax owed 1 % for every 4 points of trade ratio (TRADE-134, TRADE-088)", () => {
    const x = createWorld(rules, 1, tiles);
    x.provinceTradeRatio[paris] = 0;
    const base = provinceTax(x, paris, fra);
    x.provinceTradeRatio[paris] = 41;
    expect(tradeTaxFactor(x, paris)).toBeCloseTo(1.1, 9);
    expect(provinceTax(x, paris, fra)).toBeCloseTo(base * 1.1, 9);
  });

  it("founds a trader in a city with a market, paying its gold and taking its crew, on the AI's best loop (TRADE-135)", () => {
    const x = createWorld(rules, 1, tiles);
    const city = own(x, fra).find((p) => worksAt(x, p, workIndex("market")) > 0)!;
    const noMarket = own(x, fra).find((p) => worksAt(x, p, workIndex("market")) === 0)!;
    x.provinceWorks[city * WORK_COUNT + workIndex("market")] = 0;
    expect(foundProblem(x, fra, city, "pack_caravan")).toBe("needs a market");
    x.provinceWorks[city * WORK_COUNT + workIndex("market")] = 1;
    void noMarket;
    expect(foundProblem(x, nation(x, "england"), city, "pack_caravan")).toBe("not your city");
    if (!x.provinceRiver[city]) expect(foundProblem(x, fra, city, "river_barge")).toBe("needs a river");
    const gold = x.nationTreasury[fra]!;
    const folk = x.provinceClasses[city * CLASS_COUNT + MARKET_FOLK]!;
    const people = x.provincePopulation[city]!;
    const count = x.traders.length;
    expect(foundTrader(x, fra, city, "pack_caravan")).toBeNull();
    expect(x.traders.length).toBe(count + 1);
    const t = x.traders.at(-1)!;
    expect(t.home).toBe(city);
    expect(x.nationTreasury[fra]).toBeCloseTo(gold - kindRow(x, "pack_caravan").gold, 9);
    expect(x.provinceClasses[city * CLASS_COUNT + MARKET_FOLK]).toBeCloseTo(folk - 0.05, 5);
    expect(x.provincePopulation[city]).toBeCloseTo(people - 0.05, 5);
    // Too few market folk, and it is refused.
    x.provinceClasses[city * CLASS_COUNT + MARKET_FOLK] = 0.01;
    expect(foundProblem(x, fra, city, "pack_caravan")).toBe("needs 50 market folk");
    x.nationTreasury[fra] = 0;
    x.provinceClasses[city * CLASS_COUNT + MARKET_FOLK] = 5;
    expect(foundProblem(x, fra, city, "pack_caravan")).toMatch(/^needs .* gold$/);
  });

  it("sets a route from one trade stop to another, refuses others, previews a drawn one and dismisses a trader (TRADE-136, TRADE-137)", () => {
    const x = createWorld(rules, 1, tiles);
    x.player = fra;
    const t = x.traders.find((y) => y.owner === fra && y.kind !== "cog_junk_dhow")!;
    const stops = own(x, fra).filter((p) => isTradeStop(x, p, t.kind)).slice(0, 3);
    expect(routeProblem(x, fra, t.kind, stops.slice(0, 1))).toBe("a route has a start and an end");
    expect(routeProblem(x, fra, t.kind, stops.slice(0, 3))).toBe("a route has a start and an end");
    expect(routeProblem(x, fra, t.kind, [stops[0]!, stops[0]!])).toBe("pick two different cities");
    const village = [...Array(x.provinceCount).keys()].find((p) => !x.provinceWater[p] && x.provinceOwner[p]! >= 0 && !isTradeStop(x, p, t.kind) && x.provinceOwner[p] === fra) ?? [...Array(x.provinceCount).keys()].find((p) => !x.provinceWater[p] && !isTradeStop(x, p, t.kind))!;
    expect(routeProblem(x, fra, t.kind, [stops[0]!, village])).toMatch(/is not a city or a market town$/);
    expect(setTradeRoute(x, nation(x, "england"), t.id, stops)).toBe("not your trader");
    expect(draftTradeRoute(x, fra, t.id, stops.slice(0, 2))).toBeNull();
    const draft = tradeView(x, fra).draft!;
    expect(draft.stops).toEqual(stops.slice(0, 2));
    expect(draft.why).toBeNull();
    expect(draft.loopDays).toBeGreaterThan(0);
    expect(setTradeRoute(x, fra, t.id, stops.slice(0, 2))).toBeNull();
    expect(t.stops).toEqual(stops.slice(0, 2));
    expect(x.tradeDraft).toBeNull();
    const path = loopPath(x, fra, t.kind, t.stops)!;
    expect(path[0]).toBe(stops[0]);
    expect(path).toContain(stops[1]);
    const home = t.home;
    const folk = x.provinceClasses[home * CLASS_COUNT + MARKET_FOLK]!;
    expect(dismissTrader(x, fra, t.id)).toBeNull();
    expect(x.traders.includes(t)).toBe(false);
    expect(x.provinceClasses[home * CLASS_COUNT + MARKET_FOLK]).toBeCloseTo(folk + kindRow(x, t.kind).crew / 1000, 5);
  });

  it("plans the way through the most populated land (TRADE-136, D-TRADE-21)", () => {
    const x = createWorld(rules, 1, tiles);
    // A land trader whose way out passes through a few provinces between its two cities.
    const t = x.traders.find((y) => y.kind !== "cog_junk_dhow" && (loopPath(x, y.owner, y.kind, y.stops) ?? []).indexOf(y.stops[1]!) >= 4)!;
    const there = (y: number[]) => y.slice(1, y.indexOf(t.stops[1]!));
    const before = there(loopPath(x, t.owner, t.kind, t.stops)!);
    const people = (ps: number[]) => ps.reduce((a, p) => a + x.provincePopulation[p]!, 0) / ps.length;
    // Empty the land it walks through: the planner now takes a way through land where people live.
    for (const p of before) x.provincePopulation[p] = 0;
    refreshTradeValues(x);
    const after = there(loopPath(x, t.owner, t.kind, t.stops)!);
    expect(after).not.toEqual(before);
    expect(people(after)).toBeGreaterThan(people(before));
  });

  it("never plans a way through the land of a realm at war with the trader's (TRADE-136)", () => {
    const x = createWorld(rules, 1, tiles);
    // A trader whose way crosses a third realm's land, and a war between them.
    let t = x.traders[0]!;
    let foe = -1;
    for (const y of x.traders) {
      const p = loopPath(x, y.owner, y.kind, y.stops) ?? [];
      const q = p.find((r) => x.provinceOwner[r]! >= 0 && x.provinceOwner[r] !== y.owner && !y.stops.some((s) => x.provinceOwner[s] === x.provinceOwner[r]));
      if (q !== undefined && declareWar(x, y.owner, x.provinceOwner[q]!, []) === null) ((t = y), (foe = x.provinceOwner[q]!));
      if (foe >= 0) break;
    }
    expect(foe).toBeGreaterThanOrEqual(0);
    const again = loopPath(x, t.owner, t.kind, t.stops);
    if (again) expect(again.some((q) => x.provinceOwner[q] === foe)).toBe(false);
  });

  it("finds the AI a paying route from a city to one other (TRADE-139)", () => {
    const x = createWorld(rules, 1, tiles);
    const city = own(x, fra).find((p) => worksAt(x, p, workIndex("market")) > 0)!;
    const stops = bestRoute(x, fra, "pack_caravan", city);
    expect(stops).not.toBeNull();
    expect(stops![0]).toBe(city);
    expect(stops!.length).toBe(2);
    expect(estimateLoop(x, fra, "pack_caravan", loopPath(x, fra, "pack_caravan", stops!)!, tradeConfig.game.ai_ratio_floor).expected).toBeGreaterThan(0);
  });

  it("pays the Trade line into the treasury when the month turns, and gives up a trader unpaid for six months (TRADE-134)", () => {
    const x = createWorld(rules, 1, tiles);
    const ven = nation(x, "venice");
    for (let k = 0; k < 6; k++) processTurn(x, [], -1);
    expect(x.nationLedger[ven * LEDGER_LINES + LEDGER.indexOf("trade")]).toBeCloseTo(tradeLine(x, ven), 9);
    const mine = x.traders.filter((t) => t.owner === ven).length;
    for (let m = 0; m < 6; m++) {
      x.nationTreasury[ven] = -1000;
      monthlyTrade(x, []);
    }
    expect(x.traders.filter((t) => t.owner === ven).length).toBe(0);
    expect(mine).toBeGreaterThan(0);
  });

  it("keeps traders, purses, routes and ratios in a save (TRADE-140)", () => {
    const x = createWorld(rules, 1, tiles);
    for (let k = 0; k < 6; k++) processTurn(x, [], -1);
    const chunks = worldChunks(x, { playerNation: "france", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.traders.map((t) => [t.id, t.kind, t.home, t.stops.join(), t.purse])).toEqual(x.traders.map((t) => [t.id, t.kind, t.home, t.stops.join(), t.purse]));
    expect(Array.from(back.provinceTradeRatio)).toEqual(Array.from(x.provinceTradeRatio));
    expect(Array.from(back.nationTrade)).toEqual(Array.from(x.nationTrade));
    expect(hashWorld(back)).toBe(hashWorld(x));
    // Each trader keeps the loop it walks.
    expect(back.traders.map((t) => t.path.length)).toEqual(x.traders.map((t) => t.path.length));
  });

  it("shows the player last month's trade, its traders, where it can found more and its busiest cities (TRADE-141, TRADE-144)", () => {
    const x = createWorld(rules, 1, tiles);
    const v = tradeView(x, fra);
    expect(v.net).toBeCloseTo(v.deposits + v.fees - v.upkeep, 9);
    expect(v.traders.length).toBe(x.traders.filter((t) => t.owner === fra).length);
    for (const t of v.traders) {
      expect(t.path.length).toBeGreaterThan(0);
      expect(t.stops.length).toBeGreaterThanOrEqual(2);
    }
    expect(v.found.length).toBeGreaterThan(0);
    expect(v.found[0]!.kinds.map((k) => k.kind)).toEqual(["pack_caravan", "camel_caravan", "river_barge", "cog_junk_dhow"]);
    expect(v.centres.length).toBeGreaterThan(0);
    expect(WORK_COUNT).toBeGreaterThan(0);
  });
});

describe("traders walk a day at a time (TRADE-132, VIEW-132)", () => {
  const w = createWorld(rules, 1, tiles);
  const fra = nation(w, "france");

  it("walks every trader one day on, entering the next province when its days are walked", () => {
    const t = w.traders.find((x) => x.owner === fra && x.path.length >= 2)!;
    const at = t.at;
    let days = 0;
    while (t.at === at && days < 60) (tradeDay(w), days++);
    expect(t.at).not.toBe(at);
    // It took the days its kind needs for the province, not a month at once.
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(30);
  });

  it("counts a trader once in each province it stood in during the month (TRADE-033)", () => {
    const t = w.traders.find((x) => x.owner === fra && x.path.length >= 2)!;
    for (let d = 0; d < 20; d++) tradeDay(w);
    expect(new Set(t.marked).size).toBe(t.marked.length);
    expect(t.marked).toContain(t.path[t.at]);
  });

  it("shows each trader the realm sees on its leg, how far along, with the leg's tiles over land", () => {
    const before = hashWorld(w);
    const walks = traderWalks(w, fra, 1000);
    expect(hashWorld(w)).toBe(before);
    const seen = tradeSeen(w, fra);
    expect(walks.length).toBeGreaterThan(0);
    expect(walks[0]!.mine).toBe(true);
    for (const x of walks) {
      expect(seen[x.from] || seen[x.to]).toBeTruthy();
      expect(x.progress).toBeGreaterThanOrEqual(0);
      expect(x.progress).toBeLessThanOrEqual(1);
      if (x.medium !== "sea" && x.from !== x.to) {
        // The leg runs from the centre of one province to the centre of the next, through those two only.
        expect(x.tiles[0]).toBe(w.tiles.centre[x.from]);
        expect(x.tiles[x.tiles.length - 1]).toBe(w.tiles.centre[x.to]);
        for (const tile of x.tiles) expect([x.from, x.to]).toContain(w.tiles.province[tile]! - 1);
      }
    }
    const t = w.traders.find((x) => x.owner === fra && x.path.length >= 2)!;
    const mine = walks.find((x) => x.id === t.id)!;
    expect(mine.from).toBe(t.path[t.at]);
    expect(mine.to).toBe(t.path[(t.at + 1) % t.path.length]);
    expect(traderWalks(w, fra, 3)).toHaveLength(3);
    expect(traderWalks(w, -1, 100000)).toHaveLength(w.traders.length);
  });
});

describe("following and steering a trader (TRADE-146 to TRADE-152)", () => {
  const fra = (w: World) => nation(w, "france");

  it("estimates what a route brings within a fifth of what its trader deposits over a year (TRADE-147)", () => {
    const x = createWorld(rules, 1, tiles);
    x.player = fra(x);
    let got = 0, est = 0;
    let month = x.date.month;
    for (let k = 0; k < 52; k++) {
      processTurn(x, [], -1);
      if (x.date.month === month) continue;
      month = x.date.month;
      for (const t of tradeView(x, fra(x)).traders) ((got += t.lastMonth), (est += t.expected));
    }
    expect(got).toBeGreaterThan(0);
    expect(Math.abs(est - got) / got).toBeLessThan(0.2);
  });

  it("carries no more than a purse between deposits, so a long loop brings less than its collections (TRADE-147)", () => {
    const x = createWorld(rules, 1, tiles);
    const n = fra(x);
    const t = x.traders.find((y) => y.owner === n && y.kind === "pack_caravan")!;
    const path = loopPath(x, n, t.kind, t.stops)!;
    const e = estimateLoop(x, n, t.kind, path, 0, path);
    const months = e.loopDays / x.rules.defines.march.daysPerMonth;
    // Never more than a purse each deposit.
    expect(e.expected * months).toBeLessThanOrEqual(kindRow(x, t.kind).purse * e.deposits + 1e-9);
  });

  it("shows where a trader is going and where its gold came from on its last trip (TRADE-146)", () => {
    const x = createWorld(rules, 1, tiles);
    x.player = fra(x);
    for (let k = 0; k < 12; k++) processTurn(x, [], -1);
    const v = tradeView(x, fra(x));
    const t = v.traders.find((y) => y.stops.length >= 2 && y.sourcesTrip === "last")!;
    expect(t.stops).toContain(t.heading);
    expect(t.headingDays).toBeGreaterThanOrEqual(t.nextDays);
    expect(t.path).toContain(t.next);
    expect(t.sources.length).toBeGreaterThan(0);
    for (let i = 1; i < t.sources.length; i++) expect(t.sources[i - 1]!.gold).toBeGreaterThanOrEqual(t.sources[i]!.gold);
    for (const s of t.sources) expect(t.path).toContain(s.province);
  });

  it("offers better routes worth at least a fifth and 0.2 gold more, from the start or home, and Use sets one (TRADE-148)", () => {
    const x = createWorld(rules, 1, tiles);
    const n = fra(x);
    x.player = n;
    const views = tradeView(x, n).traders;
    const tv = views.find((y) => y.better.length > 0)!;
    expect(tv).toBeDefined();
    for (const b of tv.better) {
      expect(b.gain).toBeGreaterThanOrEqual(tradeConfig.game.suggest.min_gain);
      expect(b.expected).toBeGreaterThanOrEqual(tv.expected * (1 + tradeConfig.game.suggest.min_gain_share) - 1e-9);
      expect([tv.stops[0], tv.home]).toContain(b.stops[0]);
      expect(b.stops.join()).not.toBe(tv.stops.join());
    }
    expect(tv.better.length).toBeLessThanOrEqual(tradeConfig.game.suggest.count);
    const t = x.traders.find((y) => y.id === tv.id)!;
    // Looking at suggestions changes nothing in the game.
    const before = hashWorld(x);
    suggestRoutes(x, t, tv.expected);
    expect(hashWorld(x)).toBe(before);
    expect(setTradeRoute(x, n, t.id, tv.better[0]!.stops)).toBeNull();
    const now = tradeView(x, n).traders.find((y) => y.id === t.id)!;
    expect(now.expected).toBeGreaterThan(tv.expected);
  });

  it("while a route is chosen, gives each city it could go to from its start its estimate, best first (TRADE-149)", () => {
    const x = createWorld(rules, 1, tiles);
    const n = fra(x);
    x.player = n;
    const t = x.traders.find((y) => y.owner === n && y.kind === "pack_caravan")!;
    expect(draftTradeRoute(x, n, t.id, [t.stops[0]!])).toBeNull();
    const d = tradeView(x, n).draft!;
    expect(d.options.length).toBeGreaterThan(0);
    expect(d.options.length).toBeLessThanOrEqual(tradeConfig.game.suggest.draft_options);
    for (let i = 1; i < d.options.length; i++) expect(d.options[i - 1]!.expected).toBeGreaterThanOrEqual(d.options[i]!.expected);
    expect(d.options.map((o) => o.city)).toEqual(routeOptions(x, n, t.kind, t.stops[0]!, 0, t.path).slice(0, d.options.length).map((o) => o.stops[1]));
  });

  it("sums the realm's trade: gold on the road, this month so far and where the gold comes from (TRADE-150)", () => {
    const x = createWorld(rules, 1, tiles);
    const n = fra(x);
    x.player = n;
    for (let k = 0; k < 12; k++) processTurn(x, [], -1);
    const v = tradeView(x, n);
    expect(v.onRoad).toBeCloseTo(x.traders.filter((t) => t.owner === n).reduce((a, t) => a + t.purse, 0), 9);
    expect(v.depositsNow).toBe(x.nationTradeNow[n * 2]);
    expect(v.sources.length).toBeGreaterThan(0);
    expect(v.sourcesTotal).toBeGreaterThanOrEqual(v.sources.reduce((a, s) => a + s.gold, 0) - 1e-9);
  });

  it("tells the map of each collection and deposit of the player's traders, once (TRADE-152)", () => {
    const x = createWorld(rules, 1, tiles);
    x.player = fra(x);
    x.tradeFeed = [];
    for (let d = 0; d < 30; d++) tradeDay(x);
    expect(x.tradeFeed.some((f) => f.deposit)).toBe(true);
    expect(x.tradeFeed.some((f) => !f.deposit)).toBe(true);
    const mine = new Set(x.traders.filter((t) => t.owner === x.player).map((t) => t.id));
    for (const f of x.tradeFeed) {
      expect(mine.has(f.trader)).toBe(true);
      expect(f.gold).toBeGreaterThan(0);
    }
    expect(x.tradeFeed.length).toBeLessThanOrEqual(tradeConfig.game.feed_max);
  });

  it("keeps where each trader's gold came from in a save (TRADE-146)", () => {
    const x = createWorld(rules, 1, tiles);
    for (let k = 0; k < 8; k++) processTurn(x, [], -1);
    const chunks = worldChunks(x, { playerNation: "france", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.traders.map((t) => t.srcLast)).toEqual(x.traders.map((t) => t.srcLast));
    expect(Array.from(back.provinceVisitsLast)).toEqual(Array.from(x.provinceVisitsLast));
  });
});
