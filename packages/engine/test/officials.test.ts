import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createEngineHost, createWorld, officialEffect, OFFICIALS, provinceTax, type Order, type World } from "../src/index.ts";
import { hireGold, nativeTypes, officialAt, yearsServed } from "../src/officials.ts";
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
    w.provinceOfficial[a] = collector;
    w.provinceOfficialSince[a] = w.day;
    expect(provinceTax(w, a, me)).toBeCloseTo(without * 1.1, 6);
    w.provinceOfficialSince[a] = w.day - 6 * 366;
    expect(provinceTax(w, a, me)).toBeCloseTo(without * 1.2, 6);
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
});
