import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createEngineHost, createWorld, officialEffect, OFFICIALS, provinceTax, type Order, type World } from "../src/index.ts";
import { bestFit, emptyPosts, fillAllCost, hireGold, monthlyPosts, nativeTypes, newLands, officialAt, yearsServed } from "../src/officials.ts";
import { releaseCommander } from "../src/recruit.ts";
import { cedeProvince } from "../src/war.ts";
import { COMMISSION_GOLD } from "../src/recruit.ts";
import { worldChunks, restoreWorld } from "../src/domain/saves/world-chunks.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const refused = (w: World, order: Order, nation: number) => applyNow(w, order, nation).rejectedOrders[0]?.reason;
const ok = (w: World, order: Order, nation: number) => expect(refused(w, order, nation)).toBeUndefined();
const royal = (w: World, n: number) => Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === n && w.provinceLord[p]! < 0);
const lordHeld = (w: World, n: number) => Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === n && w.provinceLord[p]! >= 0);

function setup() {
  const w = createWorld(rules, 1, tiles);
  const me = w.nationIndex.get("castile")!;
  w.player = me;
  // Two royal provinces with officials of different types.
  const own = royal(w, me);
  const a = own[0]!;
  const b = own.find((p) => w.provinceOfficial[p] !== w.provinceOfficial[a])!;
  return { w, me, a, b };
}

describe("officials", () => {
  it("won't commission a lord's official: he serves the lord, not the crown", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("castile")!;
    const p = lordHeld(w, me)[0]!;
    expect(w.provinceOfficial[p]).toBeGreaterThanOrEqual(0);
    expect(refused(w, { type: "commission", province: p }, me)).toMatch(/serves the lord, not the crown/);
    expect(w.provinceOfficial[p]).toBeGreaterThanOrEqual(0);
  });

  it("swaps two officials: each takes his type and name to the other post and starts his years again", () => {
    const { w, me, a, b } = setup();
    const [ta, tb] = [w.provinceOfficial[a], w.provinceOfficial[b]];
    const [na, nb] = [officialAt(w, a), officialAt(w, b)];
    w.day += 3000;
    expect(yearsServed(w, a)).toBeGreaterThan(5);
    const r = applyNow(w, { type: "swapOfficials", a, b }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect([w.provinceOfficial[a], w.provinceOfficial[b]]).toEqual([tb, ta]);
    expect([officialAt(w, a), officialAt(w, b)]).toEqual([nb, na]);
    expect([yearsServed(w, a), yearsServed(w, b)]).toEqual([0, 0]);
    expect(r.news.some((x) => x.text.includes(na!) && x.text.includes("moves"))).toBe(true);
  });

  it("moves an official into an empty post, leaving his own empty", () => {
    const { w, me, a, b } = setup();
    w.nationTreasury[me] = 1000;
    ok(w, { type: "commission", province: b }, me);
    expect(w.provinceOfficial[b]).toBe(-1);
    const [ta, na] = [w.provinceOfficial[a], officialAt(w, a)];
    ok(w, { type: "swapOfficials", a, b }, me);
    expect(w.provinceOfficial[b]).toBe(ta);
    expect(officialAt(w, b)).toBe(na);
    expect(w.provinceOfficial[a]).toBe(-1);
    expect(officialAt(w, a)).toBeNull();
    // Both posts empty: nothing to move.
    ok(w, { type: "commission", province: b }, me);
    expect(refused(w, { type: "swapOfficials", a, b }, me)).toMatch(/empty/);
  });

  it("refuses a lord's province, a foreign one and the same province twice", () => {
    const { w, me, a } = setup();
    expect(refused(w, { type: "swapOfficials", a, b: lordHeld(w, me)[0]! }, me)).toMatch(/lord/);
    const fra = w.nationIndex.get("france")!;
    expect(refused(w, { type: "swapOfficials", a, b: royal(w, fra)[0]! }, me)).toMatch(/not your province/);
    expect(refused(w, { type: "swapOfficials", a, b: a }, me)).toBeTruthy();
  });

  it("a tax collector raises the tax a province pays, more with his years", () => {
    const { w, me, a } = setup();
    const collector = OFFICIALS.indexOf("Tax collector");
    w.provinceOfficial[a] = collector === 0 ? 1 : 0;
    const without = provinceTax(w, a, me);
    w.nationTonguePercent[me] = 100;
    w.provinceOfficial[a] = collector;
    w.provinceOfficialSince[a] = w.day;
    expect(provinceTax(w, a, me)).toBeCloseTo(without * 1.1, 6);
    w.provinceOfficialSince[a] = w.day - 6 * 366;
    expect(provinceTax(w, a, me)).toBeCloseTo(without * 1.2, 6);
    // In a realm of a low Tongue % his years count at half pace (REALM-238).
    w.nationTonguePercent[me] = 30;
    expect(provinceTax(w, a, me)).toBeLessThan(without * 1.2 - 1e-6);
  });

  it("gives half his effect in his first year and all of it after five", () => {
    expect(officialEffect("Tax collector", 0).share).toBe(0.5);
    expect(officialEffect("Tax collector", 5).share).toBe(1);
    expect(officialEffect("Tax collector", 0).lines).toEqual(["+10% tax reaching you"]);
    expect(officialEffect("Tax collector", 5).lines).toEqual(["+20% tax reaching you"]);
    expect(officialEffect("Master of works", 3).note).toMatch(/buildings arrive/);
  });

  it("starts officials with a spread of years served, and keeps names and years through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const years = new Set(Array.from({ length: w.provinceCount }, (_, p) => Math.floor(yearsServed(w, p))).filter((_, p) => w.provinceOfficial[p]! >= 0));
    expect(years.size).toBeGreaterThan(5);
    const me = w.nationIndex.get("castile")!;
    const [a, b] = royal(w, me);
    ok(w, { type: "swapOfficials", a: a!, b: b! }, me);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(officialAt(back, a!)).toBe(officialAt(w, a!));
    expect(yearsServed(back, b!)).toBe(yearsServed(w, b!));
  });

  it("sends each official's name and years in the snapshot", () => {
    const handle = createEngineHost(() => rules);
    const reply = handle({ id: 1, type: "newGame", seed: 1, playerNation: "castile" });
    if (reply.response.type !== "snapshot") throw new Error("no snapshot");
    const s = reply.response.snapshot;
    const p = s.provinceOfficial.findIndex((o) => o !== null);
    expect(typeof s.provinceOfficialName[p]).toBe("string");
    expect(s.provinceOfficialYears[p]).toBeGreaterThanOrEqual(0);
  });

  it("hires an official into an empty post; a foreign specialist costs more and bears a foreign name", () => {
    const { w, me, a, b } = setup();
    ok(w, { type: "commission", province: a }, me);
    expect(w.provinceOfficial[a]).toBe(-1);
    const home = [...nativeTypes(w, me, a)][0]!;
    w.nationTreasury[me] = 1000;
    ok(w, { type: "hireOfficial", province: a, official: home, foreign: false }, me);
    expect(w.nationTreasury[me]).toBe(1000 - hireGold(false));
    expect(w.provinceOfficial[a]).toBe(home);
    expect(yearsServed(w, a)).toBe(0);
    expect(refused(w, { type: "hireOfficial", province: a, official: home, foreign: false }, me)).toMatch(/already/);
    // Empty b and hire a foreign specialist of a type no royal post of the realm has.
    ok(w, { type: "commission", province: b }, me);
    for (let p = 0; p < w.provinceCount; p++) if (p !== b && w.provinceOwner[p] === me && w.provinceLord[p]! < 0 && w.provinceOfficial[p] === 2) w.provinceOfficial[p] = 0;
    expect(refused(w, { type: "hireOfficial", province: b, official: 2, foreign: false }, me)).toMatch(/no one at home/);
    const gold = w.nationTreasury[me]!;
    ok(w, { type: "hireOfficial", province: b, official: 2, foreign: true }, me);
    expect(gold - w.nationTreasury[me]!).toBe(hireGold(true));
    expect(hireGold(true)).toBeGreaterThan(hireGold(false));
    expect(w.provinceOfficialFrom[b]).not.toBe(me);
    expect(w.provinceOfficialFrom[b]).toBeGreaterThanOrEqual(0);
    // He keeps his origin through a save.
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(officialAt(back, b)).toBe(officialAt(w, b));
  });

  it("won't hire into a lord's province", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("castile")!;
    const p = lordHeld(w, me)[0]!;
    w.provinceOfficial[p] = -1;
    expect(refused(w, { type: "hireOfficial", province: p, official: 0, foreign: true }, me)).toMatch(/lord/);
  });

  it("charges the commission's gold once", () => {
    const { w, me, a } = setup();
    w.nationTreasury[me] = 60;
    ok(w, { type: "commission", province: a }, me);
    expect(COMMISSION_GOLD).toBe(50);
    expect(w.nationTreasury[me]).toBe(10);
  });

  it("land just taken loses its official and waits for the player's decision", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("castile")!;
    w.player = me;
    ok(w, { type: "autoFillPosts", on: false }, me);
    const p = Array.from({ length: w.provinceCount }, (_, q) => q).find((q) => w.provinceOwner[q]! >= 0 && w.provinceOwner[q] !== me && w.provinceOfficial[q]! >= 0)!;
    cedeProvince(w, p, me, []);
    expect(w.provinceOfficial[p]).toBe(-1);
    expect(officialAt(w, p)).toBeNull();
    expect(newLands(w, me)).toEqual([p]);
    ok(w, { type: "settleLand", province: p }, me);
    expect(newLands(w, me)).toEqual([]);
    // Filling the post settles it too.
    const q = Array.from({ length: w.provinceCount }, (_, x) => x).find((x) => w.provinceOwner[x]! >= 0 && w.provinceOwner[x] !== me && x !== p)!;
    cedeProvince(w, q, me, []);
    w.nationTreasury[me] = 1000;
    ok(w, { type: "hireOfficial", province: q, official: 0, foreign: true }, me);
    expect(newLands(w, me)).toEqual([]);
  });

  it("a lord's land: no levy for the crown, and a building paid for there is his gift", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("castile")!;
    w.player = me;
    w.nationTreasury[me] = 10_000;
    const p = lordHeld(w, me)[0]!;
    expect(refused(w, { type: "recruit", province: p, thousands: 1 }, me)).toMatch(/answer his call/);
  });

  describe("with fewer taps (PROV-342 to PROV-347)", () => {
    const castile = () => {
      const w = createWorld(rules, 1, tiles);
      const me = w.nationIndex.get("castile")!;
      w.player = me;
      return { w, me };
    };
    const empty = (w: World, ps: number[]) => ps.forEach((p) => (w.provinceOfficial[p] = -1));

    it("each month the crown fills its empty posts by their best fit, most people first, keeping the reserve", () => {
      const { w, me } = castile();
      const own = royal(w, me).filter((p) => w.provinceOfficial[p]! >= 0).slice(0, 3);
      empty(w, own);
      w.nationTreasury[me] = 20 + 2 * hireGold(false) + 5;
      const news: { text: string }[] = [];
      monthlyPosts(w, news as never);
      const filled = own.filter((p) => w.provinceOfficial[p]! >= 0);
      expect(filled.length).toBe(2);
      const byPeople = [...own].sort((a, b) => w.provincePopulation[b]! - w.provincePopulation[a]! || a - b);
      expect(filled).toEqual(byPeople.slice(0, 2).sort((a, b) => filled.indexOf(a) - filled.indexOf(b)));
      for (const p of filled) expect(w.provinceOfficial[p]).toBe(bestFit(w, p).type);
      expect(w.nationTreasury[me]).toBeGreaterThanOrEqual(20);
      expect(news.filter((x) => x.text.startsWith("Auto-fill:")).length).toBe(1);
    });

    it("stays under the officials cap", () => {
      const { w, me } = castile();
      const own = royal(w, me).filter((p) => w.provinceOfficial[p]! >= 0).slice(0, 2);
      empty(w, own);
      w.nationCustomOfficials[me] = w.nationCustomOfficials[me]! - 1;
      w.nationTreasury[me] = 10_000;
      monthlyPosts(w, []);
      expect(own.filter((p) => w.provinceOfficial[p]! >= 0).length).toBe(1);
    });

    it("leaves the player's posts alone while Auto-fill posts is off, and Fill all fills them at once", () => {
      const { w, me } = castile();
      const own = royal(w, me).filter((p) => w.provinceOfficial[p]! >= 0).slice(0, 2);
      empty(w, own);
      w.nationTreasury[me] = 1000;
      ok(w, { type: "autoFillPosts", on: false }, me);
      w.nationCustomOfficials[me] = w.nationCustomOfficials[me]! + 50;
      monthlyPosts(w, []);
      expect(emptyPosts(w, me)).toEqual(expect.arrayContaining(own));
      const cost = fillAllCost(w, me);
      expect(cost.posts).toBe(emptyPosts(w, me).length);
      ok(w, { type: "fillPosts" }, me);
      expect(w.nationTreasury[me]).toBe(1000 - cost.gold);
      expect(emptyPosts(w, me)).toEqual([]);
      expect(refused(w, { type: "fillPosts" }, me)).toMatch(/no post/);
    });

    it("the best fit: a judge where it riots, else a tax collector by default", () => {
      const { w, me } = castile();
      const p = royal(w, me).find((q) => !w.provinceTradeCity[q]! && !(bestFit(w, q).why.includes("walls")) && !(bestFit(w, q).why.includes("food")))!;
      expect(OFFICIALS[bestFit(w, p).type]).toBe("Tax collector");
      expect(bestFit(w, p).why).toMatch(/gold tax a month/);
      w.provinceGrievances[p] = 0xffff;
      expect(OFFICIALS[bestFit(w, p).type]).toBe("Judge");
    });

    it("land just taken is filled at once and does not wait for a decision", () => {
      const { w, me } = castile();
      w.nationTreasury[me] = 1000;
      w.nationCustomOfficials[me] = w.nationCustomOfficials[me]! + 5;
      const p = Array.from({ length: w.provinceCount }, (_, q) => q).find((q) => w.provinceOwner[q]! >= 0 && w.provinceOwner[q] !== me && w.provinceOfficial[q]! >= 0)!;
      const news: { text: string }[] = [];
      cedeProvince(w, p, me, news as never);
      expect(newLands(w, me)).toEqual([]);
      expect(w.provinceOfficial[p]).toBe(bestFit(w, p).type);
      expect(news.some((x) => x.text.startsWith("Auto-fill:"))).toBe(true);
    });

    it("dismisses an official, or replaces him with another type in one step", () => {
      const { w, me, a, b } = setup();
      w.nationTreasury[me] = 100;
      const tb = w.provinceOfficial[b]!;
      ok(w, { type: "dismissOfficial", province: a, hire: { official: tb, foreign: false } }, me);
      expect(w.provinceOfficial[a]).toBe(tb);
      expect(yearsServed(w, a)).toBe(0);
      expect(w.nationTreasury[me]).toBe(100 - hireGold(false));
      expect(refused(w, { type: "dismissOfficial", province: a, hire: { official: tb, foreign: false } }, me)).toMatch(/already/);
      w.nationTreasury[me] = 0;
      expect(refused(w, { type: "dismissOfficial", province: b, hire: { official: 0, foreign: true } }, me)).toMatch(/gold/);
      expect(w.provinceOfficial[b]).toBe(tb);
      ok(w, { type: "dismissOfficial", province: b }, me);
      expect(w.provinceOfficial[b]).toBe(-1);
      expect(refused(w, { type: "dismissOfficial", province: lordHeld(w, me)[0]! }, me)).toMatch(/lord/);
    });

    it("a released commander whose post was filled takes another empty post, or waits for one", () => {
      const { w, me, a, b } = setup();
      w.nationTreasury[me] = 1000;
      ok(w, { type: "commission", province: a }, me);
      const c = Array.from(w.commanderOwner).lastIndexOf(me);
      w.nationCustomOfficials[me] = w.nationCustomOfficials[me]! + 50;
      monthlyPosts(w, []);
      expect(w.provinceOfficial[a]).toBeGreaterThanOrEqual(0);
      for (const p of emptyPosts(w, me)) w.provinceOfficial[p] = 0;
      expect(releaseCommander(w, me, c)).toMatch(/no post stands empty/);
      w.provinceOfficial[b] = -1;
      expect(releaseCommander(w, me, c)).toBeNull();
      expect(officialAt(w, b)).not.toBeNull();
      expect(yearsServed(w, b)).toBe(0);
    });

    it("Auto-fill posts survives a save", () => {
      const { w, me } = castile();
      ok(w, { type: "autoFillPosts", on: false }, me);
      const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
      expect(back.nationManualPosts[me]).toBe(1);
    });
  });
});

