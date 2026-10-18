import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, spawnArmy, type World } from "../src/index.ts";
import { heldTax, LEDGER, LEDGER_LINES, provinceTax, runLedger } from "../src/treasury.ts";
import { tradeMonth } from "../src/trade.ts";
import { armyPay, KIND, mergeArmies, splitTroops } from "../src/recruit.ts";
import { armyDead, fallenOf, garrisonDead } from "../src/fallen.ts";
import { CLASS_COUNT } from "../src/living.ts";
import { atWar } from "../src/war.ts";
import { W } from "../src/domain/warfare/index.ts";

/** The price of war, economy part (X-21): WAR-224, WAR-225, WAR-226. */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const capital = (w: World, nation: number) => w.provinceIndex.get(rules.nations[nation]!.capital)!;
const line = (w: World, nation: number, name: (typeof LEDGER)[number]) => w.nationLedger[nation * LEDGER_LINES + LEDGER.indexOf(name)]!;
const ledgerSum = (w: World, nation: number) => LEDGER.reduce((t, l) => t + line(w, nation, l), 0);
/** A province of the realm other than its capital. */
const provinceOf = (w: World, nation: number) => Array.from({ length: w.provinceCount }, (_, p) => p).find((p) => w.provinceOwner[p] === nation && p !== capital(w, nation))!;
const classesOf = (w: World, p: number) => Array.from(w.provinceClasses.subarray(p * CLASS_COUNT, (p + 1) * CLASS_COUNT));

describe("occupation does not pay for the war (WAR-224)", () => {
  it("gives the occupier half the tax, the owner nothing, and the ledger what is paid", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = n(w, "france");
    const bur = n(w, "burgundy");
    const champagne = provinceOf(w, fra);
    runLedger(w, false);
    const full = provinceTax(w, champagne, fra);
    expect(full).toBeGreaterThan(0);
    expect(heldTax(w, champagne)).toBeCloseTo(full);
    const fraTax = line(w, fra, "tax");
    const burTax = line(w, bur, "tax");

    w.provinceOccupier[champagne] = bur;
    runLedger(w, false);
    expect(W.occupation.tax_share).toBe(0.5);
    expect(heldTax(w, champagne)).toBeCloseTo(full * 0.5);
    expect(line(w, bur, "tax")).toBeCloseTo(burTax + full * 0.5);
    expect(line(w, fra, "tax")).toBeCloseTo(fraTax - full);
    // The income shown is the sum of the lines, for both sides.
    expect(w.nationMonthlyIncome[fra]).toBeCloseTo(ledgerSum(w, fra));
    expect(w.nationMonthlyIncome[bur]).toBeCloseTo(ledgerSum(w, bur));
    // Running the occupier's ledger alone gives the same tax line (the player's ledger between months).
    runLedger(w, false, bur);
    expect(line(w, bur, "tax")).toBeCloseTo(burTax + full * 0.5);
  });

  it("pays no trade from occupied land to its owner or its occupier", () => {
    const traded = (occupy: boolean) => {
      const w = createWorld(rules, 1, tiles);
      if (occupy) {
        // Two realms at war with no one hold all the land, so every trader may still walk it.
        const calm = Array.from({ length: w.nationCount }, (_, k) => k).filter((k) => !w.nationGone[k] && Array.from({ length: w.nationCount }, (_, j) => j).every((j) => !atWar(w, k, j)));
        const [x, y] = calm;
        expect(y).toBeDefined();
        for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p]! >= 0) w.provinceOccupier[p] = w.provinceOwner[p] === x ? y! : x!;
      }
      w.nationTrade.fill(0);
      for (const t of w.traders) t.purse = 0;
      tradeMonth(w, true);
      let gold = 0;
      for (let k = 0; k < w.nationCount; k++) gold += w.nationTrade[k * 3]! + w.nationTrade[k * 3 + 1]!;
      return gold + w.traders.reduce((t, x) => t + x.purse, 0);
    };
    expect(traded(false)).toBeGreaterThan(0);
    expect(traded(true)).toBe(0);
  }, 60000);
});

describe("levies at war are paid at once (WAR-225)", () => {
  it("pays a month-old levy at war and not at peace", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    const levy = spawnArmy(w, me, capital(w, me), 1000, -1, 0, { kind: KIND.levy });
    w.armies.monthsOut[levy] = 1;
    // Castile starts at peace.
    expect(w.diplomacy.wars.some((x) => x.attackers.includes(w.nationIds[me]!) || x.defenders.includes(w.nationIds[me]!))).toBe(false);
    expect(armyPay(w, levy)).toBe(0);
    expect(applyNow(w, { type: "declareWar", target: foe }, me).rejectedOrders).toEqual([]);
    expect(armyPay(w, levy)).toBeGreaterThan(0);
    // The ledger's army pay counts it.
    runLedger(w, false);
    expect(-line(w, me, "army pay")).toBeGreaterThanOrEqual(armyPay(w, levy));
  });
});

describe("the dead are missed at home (WAR-226)", () => {
  it("takes a levy's dead from its home province's people, every class by its share", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = n(w, "france");
    const champagne = provinceOf(w, fra);
    const levy = spawnArmy(w, fra, champagne, 1000, -1, 0, { kind: KIND.levy });
    expect(w.armies.home[levy]).toBe(champagne);
    // It marches away: its dead are still Champagne's.
    w.armies.location[levy] = capital(w, fra);
    const people = w.provincePopulation[champagne]!;
    const classes = classesOf(w, champagne);
    const fallen = fallenOf(w, fra);
    armyDead(w, levy, 300);
    expect(w.provincePopulation[champagne]).toBeCloseTo(people - 0.3, 3);
    classesOf(w, champagne).forEach((c, k) => expect(c).toBeCloseTo(classes[k]! * (1 - 0.3 / people), 4));
    expect(fallenOf(w, fra)).toBeCloseTo(fallen + 300);
  });

  it("takes no one's people for a hired company's dead, but counts them fallen", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = n(w, "france");
    const cap = capital(w, fra);
    const hired = spawnArmy(w, fra, cap, 1000, -1, 0, { kind: KIND.hired });
    expect(w.armies.home[hired]).toBe(-1);
    const people = w.provincePopulation[cap]!;
    const fallen = fallenOf(w, fra);
    armyDead(w, hired, 200);
    expect(w.provincePopulation[cap]).toBe(people);
    expect(fallenOf(w, fra)).toBeCloseTo(fallen + 200);
  });

  it("keeps the home through splits and merges, the larger part's when two join", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = n(w, "france");
    const cap = capital(w, fra);
    const champagne = provinceOf(w, fra);
    const big = spawnArmy(w, fra, cap, 3000, -1, 0, { kind: KIND.levy, home: champagne });
    const small = spawnArmy(w, fra, cap, 1000, -1, 0, { kind: KIND.levy });
    expect(w.armies.home[small]).toBe(cap);
    expect(mergeArmies(w, fra, big, small)).toBe(null);
    expect(w.armies.home[small]).toBe(champagne);
    const before = w.armies.count;
    expect(splitTroops(w, fra, small, "levy foot", 500)).toBe(null);
    const split = Array.from({ length: w.armies.count }, (_, i) => i).find((i) => w.armies.alive[i] && i !== small && w.armies.men[i] === 500 && w.armies.owner[i] === fra)!;
    expect(w.armies.count >= before).toBe(true);
    expect(w.armies.home[split]).toBe(champagne);
  });

  it("takes a castle garrison's dead from the garrison's own province", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = n(w, "france");
    const cap = capital(w, fra);
    const people = w.provincePopulation[cap]!;
    const fallen = fallenOf(w, fra);
    garrisonDead(w, fra, cap, 150);
    expect(w.provincePopulation[cap]).toBeCloseTo(people - 0.15, 3);
    expect(fallenOf(w, fra)).toBeCloseTo(fallen + 150);
  });
});
