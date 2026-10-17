import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, ARMS, createWorld, monthBeginning, processTurn, type Order, type World } from "../src/index.ts";
import { armyPay, garrisonTroops, idleCommanders, menByArm } from "../src/recruit.ts";
import { wallsOf } from "../src/war.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const capital = (w: World, nation: number) => w.provinceIndex.get(rules.nations[nation]!.capital)!;
const armiesOf = (w: World, nation: number) => Array.from({ length: w.armies.count }, (_, i) => i).filter((i) => w.armies.alive[i] && w.armies.owner[i] === nation);
const ok = (w: World, order: Order, nation: number) => expect(applyNow(w, order, nation).rejectedOrders).toEqual([]);
const refused = (w: World, order: Order, nation: number) => applyNow(w, order, nation).rejectedOrders[0]?.reason;
const arm = (w: World, slot: number, name: string) => menByArm(w, slot)[ARMS.indexOf(name)]!;
const neighbourOf = (w: World, p: number, nation: number) => Array.from(w.adjList.subarray(w.adjStart[p]!, w.adjStart[p + 1]!)).find((q) => w.provinceOwner[q] === nation)!;

/** Plays weekly turns until `count` monthly steps have run. */
function months(w: World, nation: number, count: number): void {
  for (let seen = 0; seen < count; ) {
    if (monthBeginning(w.date) !== null) seen++;
    processTurn(w, [], nation);
  }
}

function weeks(w: World, nation: number, count: number): void {
  for (let i = 0; i < count; i++) processTurn(w, [], nation);
}

describe("armies that cost something", () => {
  it("recruits a province's men by the thousand, each thousand gathering in two weeks, as its garrison", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const p = neighbourOf(w, capital(w, me), me);
    const pool = w.provinceRecruits[p]!;
    const gold = w.nationTreasury[me]!;
    ok(w, { type: "recruit", province: p, thousands: 2 }, me);
    expect(w.provinceRecruits[p]).toBeCloseTo(pool - 2000, 0);
    expect(w.nationTreasury[me]).toBeLessThan(gold);
    weeks(w, me, 2);
    expect(garrisonTroops(w, me, p).map((i) => w.armies.men[i])).toEqual([1000]);
    weeks(w, me, 2);
    expect(garrisonTroops(w, me, p).map((i) => w.armies.men[i])).toEqual([2000]);
    // Troops without a commander stay put.
    const [troop] = garrisonTroops(w, me, p);
    expect(refused(w, { type: "move", army: troop!, to: capital(w, me) }, me)).toMatch(/commander/);
  });

  it("commissions a province's official as commander, leaving the post empty for half tax", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const p = neighbourOf(w, capital(w, me), me);
    ok(w, { type: "recruit", province: p, thousands: 1 }, me);
    weeks(w, me, 2);
    const [troop] = garrisonTroops(w, me, p);
    const income = w.nationMonthlyIncome[me]!;
    w.nationTreasury[me] = 500;
    ok(w, { type: "commission", province: p }, me);
    expect(w.provinceOfficial[p]).toBe(-1);
    const [c] = idleCommanders(w, me);
    expect(w.commanderHome[c!]).toBe(p);
    ok(w, { type: "appoint", army: troop!, commander: c! }, me);
    ok(w, { type: "move", army: troop!, to: capital(w, me) }, me);
    processTurn(w, [], me);
    expect(w.nationMonthlyIncome[me]).toBeLessThan(income);
    // Back to his post: the commander leaves the army as a garrison, then goes home.
    ok(w, { type: "appoint", army: troop!, commander: -1 }, me);
    ok(w, { type: "release", commander: c! }, me);
    expect(w.provinceOfficial[p]).toBeGreaterThanOrEqual(0);
  });

  it("lets a commander pick up the garrison where his army stands", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const p = capital(w, me);
    ok(w, { type: "recruit", province: p, thousands: 1 }, me);
    weeks(w, me, 2);
    const army = armiesOf(w, me).find((i) => w.armies.commander[i]! >= 0)!;
    const before = arm(w, army, "levy foot");
    ok(w, { type: "pickUp", army }, me);
    expect(arm(w, army, "levy foot")).toBeCloseTo(before + 1000, -1);
    expect(garrisonTroops(w, me, p)).toEqual([]);
  });

  it("pays levies from their fourth month and keeps them under arms until sent home", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const [army] = armiesOf(w, me);
    expect(armyPay(w, army!)).toBe(0);
    months(w, me, 4);
    expect(armyPay(w, army!)).toBeGreaterThan(0);
    const men = w.armies.men[army!]!;
    months(w, me, 8);
    expect(w.armies.men[army!]).toBe(men);
  });

  it("trains levy foot as archers in the army while it stands at home", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const [army] = armiesOf(w, me);
    ok(w, { type: "train", army: army!, arm: "archers", men: 1000 }, me);
    months(w, me, 4);
    expect(arm(w, army!, "archers")).toBeCloseTo(1000, -1);
    expect(w.armies.trainArm[army!]).toBe(-1);
    expect(w.armies.drill[army!]).toBeGreaterThan(1.5);
  });

  it("trains only at a castle of the realm's own (RECR-109)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    const [army] = armiesOf(w, me);
    const open = Array.from({ length: w.provinceCount }, (_, p) => p).find((p) => w.provinceOwner[p] === me && !wallsOf(w, p))!;
    w.armies.location[army!] = open;
    expect(refused(w, { type: "train", army: army!, arm: "archers", men: 1000 }, me)).toMatch(/castle/);
    w.armies.location[army!] = capital(w, me);
    ok(w, { type: "train", army: army!, arm: "archers", men: 1000 }, me);
  });

  it("sells no companies while the capital is under siege (WAR-210)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.provinceOccupier[capital(w, me)] = n(w, "portugal");
    expect(refused(w, { type: "hire", arm: "pikes" }, me)).toMatch(/siege/);
  });

  it("splits, merges and sends home troops", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const [army] = armiesOf(w, me);
    ok(w, { type: "split", army: army!, arm: "light horse", men: 600 }, me);
    const other = armiesOf(w, me).find((i) => i !== army)!;
    expect(w.armies.horse[other]).toBe(600);
    expect(w.armies.commander[other]).toBe(-1);
    expect(w.armies.men[army!]).toBe(4400);
    ok(w, { type: "dismiss", army: army!, arm: "levy foot", men: 400 }, me);
    expect(w.armies.men[army!]).toBe(4000);
    ok(w, { type: "pickUp", army: army! }, me);
    expect(w.armies.men[army!]).toBe(4600);
    expect(w.armies.alive[other]).toBe(0);
  });

  it("refuses to recruit past the troop cap or the province's men", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    const p = capital(w, me);
    expect(refused(w, { type: "recruit", province: p, thousands: Math.ceil(w.provinceRecruits[p]! / 1000) + 1 }, me)).toMatch(/only/);
    w.nationCapUsed[me] = w.nationTroopCap[me]!;
    expect(refused(w, { type: "recruit", province: p, thousands: 1 }, me)).toMatch(/troop cap/);
  });

  it("buys mercenaries who arrive weeks later under their own captain", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    ok(w, { type: "hire", arm: "pikes" }, me);
    expect(armiesOf(w, me).length).toBe(1);
    weeks(w, me, rules.defines.recruit.mercenaryWeeks);
    const company = armiesOf(w, me).find((i) => w.armies.kind[i] === 1)!;
    expect(w.armies.commander[company]).toBeGreaterThanOrEqual(0);
    expect(arm(w, company, "pikes")).toBe(1000);
    expect(armyPay(w, company)).toBeCloseTo(1000 * 0.2 * 3 * rules.defines.recruit.goldScale);
    expect(refused(w, { type: "appoint", army: company, commander: -1 }, me)).toMatch(/captain/);
  });

  it("AI realms at war recruit and send commanders out to their troops", () => {
    const w = createWorld(rules, 3, tiles);
    for (let t = 0; t < 104; t++) processTurn(w, [], -1);
    let led = 0;
    let garrisons = 0;
    for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i]) w.armies.commander[i]! >= 0 ? led++ : garrisons++;
    expect(led).toBeGreaterThan(garrisons);
    expect(w.commanderIds.length).toBeGreaterThan(rules.nations.length);
  }, 60000);
});
