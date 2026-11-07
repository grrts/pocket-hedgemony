import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, spawnArmy, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { declareWar } from "../src/war.ts";
import { tradeConfig } from "../src/domain/trade/index.ts";
import { kindRow, tradeDay, tradeView, type GameTrader } from "../src/trade.ts";
import { closeGrainMonth, grainHold, grainSpare, grainWanted, grainWay, tradeGrainAt } from "../src/tradeGrain.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const GR = tradeConfig.game.grain;
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
/** A land trader of realm n whose next province on its way is land its realm or a realm at peace holds. */
const walker = (w: World, n: number) => w.traders.find((t) => t.owner === n && t.kind === "pack_caravan" && t.path.length >= 3)!;
const nextOf = (t: GameTrader) => t.path[(t.at + 1) % t.path.length]!;
/** Walks the trader's world on until it stands somewhere new, at most two months. */
function step(w: World, t: GameTrader): void {
  const at = t.at;
  for (let d = 0; d < 60 && t.at === at && t.raided < 0; d++) tradeDay(w, []);
}

describe("traders carry grain (TRADE-162 to TRADE-167)", () => {
  it("gives each trader a grain hold of its kind's hold times hold_per_hold (TRADE-162)", () => {
    const w = createWorld(rules, 1, tiles);
    expect(grainHold(kindRow(w, "pack_caravan").hold)).toBe(kindRow(w, "pack_caravan").hold * GR.hold_per_hold);
    expect(grainHold(kindRow(w, "cog_junk_dhow").hold)).toBeGreaterThan(grainHold(kindRow(w, "pack_caravan").hold));
    // The warm-up before the first turn moves no grain.
    expect(w.traders.every((t) => t.grain === 0)).toBe(true);
    expect(w.provinceGrain.every((x) => x === 0)).toBe(true);
  });

  it("sells grain to a store running low on entering it, up to the low mark (TRADE-163)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const t = walker(w, fra);
    const q = nextOf(t);
    const people = w.provincePopulation[q]!;
    w.provinceStore[q] = people * (GR.unload_below_months - 1);
    t.grain = grainHold(kindRow(w, t.kind).hold);
    const before = w.provinceStore[q]!;
    step(w, t);
    expect(t.path[t.at]).toBe(q);
    const sold = Math.min(people, grainHold(kindRow(w, t.kind).hold));
    expect(w.provinceStore[q]! - before).toBeCloseTo(sold, 3);
    expect(w.provinceGrain[q * 2]).toBeCloseTo(sold, 3);
    // The player's trader keeps where it sold; France isn't the player here, so only the world's counts move.
    expect(t.grain).toBeCloseTo(grainHold(kindRow(w, t.kind).hold) - sold, 3);
  });

  it("buys grain where the store has plenty, as much of the excess as fits (TRADE-163)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const t = walker(w, fra);
    const q = nextOf(t);
    const people = w.provincePopulation[q]!;
    w.provinceStore[q] = people * GR.load_above_months + 1;
    t.grain = 0;
    step(w, t);
    expect(t.grain).toBeCloseTo(1, 3);
    expect(w.provinceStore[q]).toBeCloseTo(people * GR.load_above_months, 2);
    expect(w.provinceGrain[q * 2 + 1]).toBeCloseTo(1, 3);
  });

  it("moves gold for grain only across a border, at the one grain price, into the Grain line (TRADE-164)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const eng = nation(w, "england");
    const home = [...Array(w.provinceCount).keys()].find((p) => w.provinceOwner[p] === fra && !w.provinceWater[p])!;
    const abroad = [...Array(w.provinceCount).keys()].find((p) => w.provinceOwner[p] === eng && !w.provinceWater[p] && w.provinceOccupier[p]! < 0)!;
    const t = { ...walker(w, fra), grain: 0, grainSold: [], grainBought: [] } as GameTrader;
    w.provinceStore[home] = w.provincePopulation[home]! * GR.load_above_months + 2;
    tradeGrainAt(w, t, home, 5);
    expect(t.grain).toBeCloseTo(2, 3);
    expect(w.nationGrainTradeNow[fra]).toBe(0);
    w.provinceStore[abroad] = 0;
    tradeGrainAt(w, t, abroad, 5);
    expect(t.grain).toBe(0);
    const price = rules.defines.castleFood.grainGoldScale * 0.5;
    expect(w.nationGrainTradeNow[fra]).toBeGreaterThan(0);
    expect(w.nationGrainTradeNow[eng]).toBeCloseTo(-w.nationGrainTradeNow[fra]!, 9);
    expect(w.nationGrainTradeNow[fra]! / 2).toBeCloseTo(price, 6);
    // Neither bought nor sold in unclaimed or occupied land.
    w.provinceOccupier[abroad] = fra;
    t.grain = 3;
    tradeGrainAt(w, t, abroad, 5);
    expect(t.grain).toBe(3);
    // The month turns: the grain gold joins the Grain line.
    w.provinceOccupier[abroad] = -1;
    const gold = w.nationGrainTradeNow[fra]!;
    w.nationGrainGold[fra] = 0;
    closeGrainMonth(w, true);
    expect(w.nationGrainGold[fra]).toBeCloseTo(gold, 9);
    expect(w.nationGrainTradeNow[fra]).toBe(0);
    expect(w.provinceGrainLast[home * 2 + 1]).toBeCloseTo(2, 3);
  });

  it("names the provinces on a way that would sell and buy grain now (TRADE-167)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const t = walker(w, fra);
    const [a, b] = [t.path[0]!, t.path[1]!];
    w.provinceStore[a] = w.provincePopulation[a]! * (GR.load_above_months + 2);
    w.provinceStore[b] = 0;
    const way = grainWay(w, t.path);
    expect(grainSpare(w, a)).toBeGreaterThan(0);
    expect(grainWanted(w, b)).toBeGreaterThan(0);
    expect(way.sell).toContain(a);
    expect(way.buy).toContain(b);
    const v = tradeView(w, fra).traders.find((x) => x.id === t.id)!;
    expect(v.grainMax).toBe(grainHold(kindRow(w, t.kind).hold));
    expect(v.grainWay.sell).toContain(a);
  });

  it("loses its purse and grain to an enemy army on the land ahead, and its way is shut (TRADE-165)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const t = walker(w, fra);
    const q = nextOf(t);
    let foe = -1;
    for (let n = 0; n < w.nationCount && foe < 0; n++) if (n !== fra && w.provinceOwner.includes(n) && declareWar(w, n, fra, []) === null) foe = n;
    expect(foe).toBeGreaterThanOrEqual(0);
    spawnArmy(w, foe, q, 500);
    t.grain = 3;
    t.purse = 1;
    const gold = w.nationTreasury[foe]!;
    const news: { text: string }[] = [];
    tradeDay(w, news as never);
    expect(t.raided).toBe(q);
    expect(t.grain).toBe(0);
    expect(t.purse).toBe(0);
    expect(w.nationTreasury[foe]).toBeCloseTo(gold + 1, 6);
    expect(tradeView(w, fra).traders.find((x) => x.id === t.id)!.problem).toMatch(/raided/);
  });

  it("keeps grain in the hold, the counts and this month's grain gold in the save (TRADE-162, TRADE-166)", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    const t = walker(w, fra);
    t.grain = 2.5;
    t.grainSoldLast = [t.path[1]!, 4];
    w.provinceGrainLast[t.path[1]! * 2] = 4;
    w.nationGrainTradeNow[fra] = 0.25;
    const chunks = worldChunks(w, { playerNation: "france", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules, {}, tiles).world;
    const u = back.traders.find((x) => x.id === t.id)!;
    expect(u.grain).toBeCloseTo(2.5, 6);
    expect(u.grainSoldLast).toEqual([t.path[1]!, 4]);
    expect(back.provinceGrainLast[t.path[1]! * 2]).toBeCloseTo(4, 6);
    expect(back.nationGrainTradeNow[fra]).toBeCloseTo(0.25, 9);
  });
});
