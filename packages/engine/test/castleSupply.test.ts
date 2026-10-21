import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { advance, applyNow, createWorld, refillHere, spawnArmy, WORKS, type World } from "../src/index.ts";
import { besiegerEat, castleCutAt } from "../src/castleSupply.ts";
import { armyRations } from "../src/recruit.ts";
import { atWar, runOccupation, wallsOf, type News } from "../src/war.ts";
import { W as WARFARE } from "../src/domain/warfare/index.ts";
import { buildingType } from "../src/domain/buildings/index.ts";

/** Castles starve besiegers (Leroy, 19 Oct; WAR-263 to WAR-265). */
const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const C = WARFARE.castle_supply;
const CASTLE = WORKS.indexOf("castle");
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const setCastle = (w: World, p: number, step: number) => (w.provinceWorks[p * WORKS.length + CASTLE] = step);

/** Castile at war with Portugal, every Portuguese castle pulled down and Lisbon's walls taken, so only the castles a test builds count. */
function war() {
  const w = createWorld(rules, 7, tiles);
  const me = n(w, "castile");
  const foe = n(w, "portugal");
  expect(applyNow(w, { type: "declareWar", target: foe }, me).rejectedOrders).toEqual([]);
  const lands = Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === foe && !w.provinceWater[p]);
  for (const p of lands) setCastle(w, p, 0);
  const capital = w.provinceIndex.get(rules.nations[foe]!.capital)!;
  w.provinceOccupier[capital] = me;
  // A Portuguese province with food and a Portuguese neighbour, away from the capital.
  const p = lands.find((q) => q !== capital && w.provinceStore[q]! > 0 && neighbours(w, q).some((x) => x !== capital && w.provinceOwner[x] === foe))!;
  const next = neighbours(w, p).find((x) => x !== capital && w.provinceOwner[x] === foe)!;
  return { w, me, foe, p, next, capital };
}

function neighbours(w: World, p: number): number[] {
  const out: number[] = [];
  for (let k = w.adjStart[p]!; k < w.adjStart[p + 1]!; k++) out.push(w.adjList[k]!);
  return out;
}

describe("castles starve besiegers (WAR-263 to WAR-265)", () => {
  it("lets enemy foragers find less in a castle's province, by its step (WAR-263)", () => {
    const { w, me, p } = war();
    const army = spawnArmy(w, me, p, 5000);
    const open = refillHere(w, army);
    expect(open).toBeGreaterThan(0);
    for (const step of [1, 2]) {
      setCastle(w, p, step);
      expect(castleCutAt(w, p)).toEqual({ castle: p, share: C.forage_cut_by_step[step - 1] });
      expect(refillHere(w, army)).toBeCloseTo(open * (1 - C.forage_cut_by_step[step - 1]!), 6);
    }
  });

  it("cuts the forage by a share of that in the land the castle reaches (WAR-264)", () => {
    const { w, me, p, next } = war();
    const army = spawnArmy(w, me, p, 5000);
    const open = refillHere(w, army);
    setCastle(w, next, 2);
    const share = C.forage_cut_by_step[1]! * C.reach_share;
    expect(castleCutAt(w, p)).toEqual({ castle: next, share });
    expect(refillHere(w, army)).toBeCloseTo(open * (1 - share), 6);
  });

  it("gathers nothing in once the enemy holds the castle (WAR-264)", () => {
    const { w, me, p } = war();
    const army = spawnArmy(w, me, p, 5000);
    const open = refillHere(w, army);
    setCastle(w, p, 2);
    w.provinceOccupier[p] = me;
    expect(castleCutAt(w, p).share).toBe(0);
    expect(refillHere(w, army)).toBeCloseTo(open, 6);
  });

  it("leaves the owner's own armies and armies not at war with it alone (WAR-263)", () => {
    const { w, foe, p } = war();
    const own = spawnArmy(w, foe, p, 5000);
    const other = Array.from({ length: w.nationCount }, (_, k) => k).find((k) => k !== foe && !atWar(w, k, foe))!;
    const neutral = spawnArmy(w, other, p, 5000);
    const before = [refillHere(w, own), refillHere(w, neutral)];
    setCastle(w, p, 2);
    expect([refillHere(w, own), refillHere(w, neutral)]).toEqual(before);
  });

  it("makes an army besieging a castle eat more by its step, and only the besiegers (WAR-265)", () => {
    const { w, me, foe, p } = war();
    setCastle(w, p, 2);
    expect(wallsOf(w, p)).toBe("stone castle");
    for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === foe) w.armies.alive[i] = 0;
    w.provinceGarrison[p] = 500;
    const besieger = spawnArmy(w, me, p, 10000);
    const news: News[] = [];
    runOccupation(w, false, news);
    expect(w.sieges.has(p)).toBe(true);
    expect(besiegerEat(w, besieger)).toBe(C.besieger_eat_by_step[1]);
    // The garrison's own realm, standing by, is no besieger.
    const relief = spawnArmy(w, foe, p, 10);
    expect(besiegerEat(w, relief)).toBe(1);
    w.armies.alive[relief] = 0;
    // An army of the same size on open enemy land eats the plain campaign rations.
    const other = spawnArmy(w, me, w.provinceIndex.get(rules.nations[foe]!.capital)!, 10000);
    expect(besiegerEat(w, other)).toBe(1);
    expect(armyRations(w, besieger)).toBeCloseTo(armyRations(w, other) * C.besieger_eat_by_step[1]!, 6);
    // A day of eating from full wagons with nothing to forage: the besiegers' wagons empty faster.
    for (const a of [besieger, other]) {
      w.provinceStore[w.armies.location[a]!] = 0;
      w.armies.food[a] = 1e6;
    }
    expect(w.step).toBe(0);
    advance(w, 6);
    const eaten = (a: number) => 1e6 - w.armies.food[a]!;
    expect(eaten(besieger)).toBeCloseTo(eaten(other) * C.besieger_eat_by_step[1]!, 3);
  });

  it("keeps its numbers in the warfare config, marked provisional", () => {
    expect(C.provisional).toBe(true);
    // One value for each step of the castle work.
    expect(C.forage_cut_by_step.length).toBe(buildingType("castle").steps.length);
    expect(C.besieger_eat_by_step.length).toBe(buildingType("castle").steps.length);
  });
});
