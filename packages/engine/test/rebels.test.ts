import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { moodShare } from "../src/moods.ts";
import { rebelsView, tierOf } from "../src/rebels.ts";
import { TAX_RATES } from "../src/treasury.ts";
import { wallsOf } from "../src/war.ts";
import type { News } from "../src/war.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const HEAVY = TAX_RATES.indexOf("heavy");

/** Plays until the next monthly step has run, with the news on the way. */
function nextMonth(w: World): News[] {
  const news: News[] = [];
  const m = w.date.month;
  while (w.date.month === m) news.push(...processTurn(w, [], w.player).news);
  news.push(...processTurn(w, [], w.player).news);
  return news;
}

/**
 * Castile with a province away from the capital and its armies, without
 * walls, made restless: no food and no official, so a tax rise there is a
 * spark in a rioting province.
 */
function restless(seed = 1): { w: World; me: number; p: number } {
  const w = createWorld(rules, seed, tiles);
  const me = w.nationIndex.get("castile")!;
  w.player = me;
  const capital = w.provinceIndex.get(rules.nations[me]!.capital)!;
  const near = new Set([capital, ...Array.from(w.adjList.subarray(w.adjStart[capital]!, w.adjStart[capital + 1]!))]);
  const armyAt = new Set(Array.from(w.armies.location.subarray(0, w.armies.count)));
  let p = -1;
  for (let q = 0; q < w.provinceCount && p < 0; q++) if (w.provinceOwner[q] === me && !near.has(q) && !armyAt.has(q) && !wallsOf(w, q) && w.provinceLord[q]! < 0) p = q;
  expect(p).toBeGreaterThanOrEqual(0);
  w.provinceStore[p] = 0;
  w.castleStore.fill(0);
  expect(applyNow(w, { type: "commission", province: p }, me).rejectedOrders).toEqual([]);
  return { w, me, p };
}

/** Raises the tax of p to heavy: a new burden, and Heavy taxes on top of Hungry and Ungoverned. */
function rise(w: World, me: number, p: number): News[] {
  expect(applyNow(w, { type: "setTax", province: p, rate: HEAVY }, me).rejectedOrders).toEqual([]);
  w.provinceStore[p] = 0;
  return nextMonth(w);
}

describe("rebellions in the game", () => {
  it("a spark in a rioting province raises a band that holds it: no tax or recruits reach the owner (REBL-004, REBL-035)", () => {
    const { w, me, p } = restless();
    const news = rise(w, me, p);
    expect(w.bands).toHaveLength(1);
    const b = w.bands[0]!;
    expect(b.owner).toBe(me);
    expect(b.provinces).toEqual([p]);
    expect(b.cause).toBe("Tax");
    expect(b.reason).toBe("the tax rate of the province is raised");
    expect(rebelsView(w).risings[0]!.reason).toBe("rose after a tax rise");
    expect(b.men).toBeGreaterThan(200);
    expect(b.leader?.name).toMatch(/^the (dyer|miller|village elder) of /);
    expect(w.provinceRebels[p]).toBe(b.id);
    expect(moodShare(w, p)).toBe(0);
    expect(news.some((n) => n.kind === "rebels" && n.begins && n.province === p && n.text.startsWith(`Rising in ${rules.provinces[p]!.name} after a tax rise`))).toBe(true);
    expect(tierOf(w, b)).toBe("Rising");
    // The card the player answers from (REBL-063).
    const card = rebelsView(w).risings[0]!;
    expect(card.demand).toBe("tax back to normal");
    expect(card.arms).toBe("tools");
    expect(card.answers.map((a) => a.label)).toEqual(["Grant demand", "Talk", "Bribe leader"]);
  });

  it("a granted demand lowers the tax, ends the rising and sends the rebels home (REBL-045)", () => {
    const { w, me, p } = restless();
    rise(w, me, p);
    const b = w.bands[0]!;
    const recruits = w.provinceRecruits[p]!;
    expect(applyNow(w, { type: "answerRebels", rising: b.id, answer: "grant" }, me).rejectedOrders).toEqual([]);
    expect(w.bands).toHaveLength(0);
    expect(w.provinceRebels[p]).toBe(0);
    expect(w.provinceTax[p]).toBe(TAX_RATES.indexOf("normal"));
    expect(w.provinceRecruits[p]).toBeGreaterThan(recruits);
    expect(w.nationEmboldened[me]).toBeGreaterThan(0);
  });

  it("a bribe costs gold by the rebels' numbers and takes their leader (REBL-047)", () => {
    const { w, me, p } = restless();
    rise(w, me, p);
    const b = w.bands[0]!;
    const cost = rebelsView(w).risings[0]!.answers.find((a) => a.answer === "bribe")!.gold;
    expect(cost).toBe(Math.ceil(b.men / 100));
    const gold = w.nationTreasury[me]!;
    expect(applyNow(w, { type: "answerRebels", rising: b.id, answer: "bribe" }, me).rejectedOrders).toEqual([]);
    expect(w.nationTreasury[me]).toBeCloseTo(gold - cost, 5);
    expect(w.bands.length === 0 || w.bands[0]!.leader === null).toBe(true);
    if (w.bands.length) expect(applyNow(w, { type: "answerRebels", rising: b.id, answer: "bribe" }, me).rejectedOrders[0]!.reason).toBe("they have no leader to bribe");
  });

  it("an army that marches on the band beats it: the rebels scatter and wait on the player's verdict; a massacre locks the province (REBL-049, REBL-050)", () => {
    const { w, me, p } = restless();
    rise(w, me, p);
    const b = w.bands[0]!;
    // The realm's biggest army, with its commander, goes to the rebels.
    let army = -1;
    for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i] && w.armies.owner[i] === me && w.armies.commander[i]! >= 0 && (army < 0 || w.armies.men[i]! > w.armies.men[army]!)) army = i;
    expect(applyNow(w, { type: "move", army, to: p }, me).rejectedOrders).toEqual([]);
    let news: News[] = [];
    for (let k = 0; k < 20 && w.bands.length; k++) news = news.concat(processTurn(w, [], me).news);
    expect(w.bands).toHaveLength(0);
    expect(news.some((n) => n.kind === "battle" && n.text.includes("beat the rebels"))).toBe(true);
    expect(w.verdicts).toHaveLength(1);
    expect(rebelsView(w).verdicts[0]!.province).toBe(p);
    expect(applyNow(w, { type: "treatRebels", rising: b.id, treatment: "Massacre" }, me).rejectedOrders).toEqual([]);
    expect(w.verdicts).toHaveLength(0);
    expect(w.rebelLocks.get(p)!.any).toBe(w.date.year + 20);
    expect(w.provinceBattleYear[p]).toBe(w.date.year);
  });

  it("rebels left alone for a year win their cause: their tax stays light and can't be raised (REBL-056, REBL-057)", () => {
    const { w, me, p } = restless();
    rise(w, me, p);
    // Keep them fed, and the realm's armies at home, so nothing beats them.
    for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === me) w.armies.alive[i] = 0;
    const b = w.bands[0]!;
    let news: News[] = [];
    for (let m = 0; m < 13 && w.bands.includes(b); m++) {
      w.provinceStore[p] = w.provincePopulation[p]! * 6;
      b.sources = ["lord's retinue"];
      b.men = Math.max(b.men, 1000);
      news = news.concat(nextMonth(w));
    }
    expect(w.bands.includes(b)).toBe(false);
    expect(news.some((n) => n.text.startsWith("The rebels win"))).toBe(true);
    expect(w.provinceTax[p]).toBe(TAX_RATES.indexOf("light"));
    expect(applyNow(w, { type: "setTax", province: p, rate: HEAVY }, me).rejectedOrders[0]!.reason).toMatch(/keeps light tax until/);
  });

  it("a homeland rising that wins breaks away as a realm of its own, named for its homeland (REBL-058, SETUP-088)", () => {
    const { w, me, p } = restless();
    rise(w, me, p);
    for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === me) w.armies.alive[i] = 0;
    const b = w.bands[0]!;
    b.cause = "Homeland";
    let news: News[] = [];
    for (let m = 0; m < 13 && w.bands.includes(b); m++) {
      w.provinceStore[p] = w.provincePopulation[p]! * 6;
      b.sources = ["lord's retinue"];
      b.men = Math.max(b.men, 1000);
      news = news.concat(nextMonth(w));
    }
    const n = w.provinceOwner[p]!;
    expect(n).not.toBe(me);
    expect(w.rules.nations[n]!.spare).toBe(true);
    expect(w.rules.nations[n]!.name).toBe(rules.provinces[p]!.name);
    expect(news.some((x) => x.kind === "founded" && x.nations.includes(n))).toBe(true);
    expect(news.some((x) => x.text.includes(`break away as ${rules.provinces[p]!.name}`))).toBe(true);
  });

  it("a plotting province rolls to rise by itself; AI realms answer their own risings", () => {
    const w = createWorld(rules, 3, tiles);
    w.player = -1;
    let rose = 0;
    // Risings are rare: play up to four years, until one comes.
    for (let t = 0; t < 52 * 4 && rose === 0; t++) rose += processTurn(w, [], -1).news.filter((n) => n.kind === "rebels" && n.text.startsWith("Rising in")).length;
    expect(rose).toBeGreaterThan(0);
    // Every rising left is held by its own realm's rebels.
    for (const b of w.bands) for (const q of b.provinces) expect(w.provinceRebels[q]).toBe(b.id);
  }, 60000);

  it("keeps risings in the save", () => {
    const { w, me, p } = restless();
    rise(w, me, p);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.bands).toHaveLength(1);
    expect(back.bands[0]!.men).toBe(w.bands[0]!.men);
    expect(back.provinceRebels[p]).toBe(w.bands[0]!.id);
    void me;
  });
});
