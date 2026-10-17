import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, ARMS, createWorld, monthBeginning, processTurn, type Order, type World } from "../src/index.ts";
import { armyPay, companyMen, companyWeeks, freeCompaniesFor, garrisonTroops, idleCommanders, menByArm, refreshFreeCompanies } from "../src/recruit.ts";
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
  it("starts each realm's men spread over its land, with commanders for its military power", () => {
    const w = createWorld(rules, 1, tiles);
    const count = (nation: string) => {
      const me = n(w, nation);
      const mine = armiesOf(w, me);
      const led = mine.filter((i) => w.armies.commander[i]! >= 0);
      const places = new Set(mine.map((i) => w.armies.location[i]!));
      const commanders = w.commanderOwner.reduce((t, o) => t + (o === me ? 1 : 0), 0);
      const men = mine.reduce((t, i) => t + w.armies.men[i]!, 0);
      return { mine: mine.length, led: led.length, places: places.size, commanders, men };
    };
    const ming = count("ming");
    const france = count("france");
    const england = count("england");
    // Not one stack: each army stands in its own province, and every man is under a commander.
    for (const r of [ming, france, england]) {
      expect(r.places).toBe(r.mine);
      expect(r.led).toBe(r.mine);
      expect(r.led).toBe(r.commanders);
    }
    // Commanders follow the men under arms in 1444.
    expect(ming.commanders).toBeGreaterThan(france.commanders);
    expect(france.commanders).toBeGreaterThan(england.commanders);
    expect(england.mine).toBeGreaterThan(1);
    expect(france.men).toBe(rules.nations[n(w, "france")]!.army);
    // The first army stands in the capital under the realm's own commander.
    const fra = n(w, "france");
    const first = armiesOf(w, fra).find((i) => w.armies.location[i] === capital(w, fra))!;
    expect(w.commanderIds[w.armies.commander[first]!]).toBe(rules.nations[fra]!.commanders[0]!.id);
  });

  it("recruits a province's men by the thousand, each thousand gathering in two weeks, as its garrison", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const p = neighbourOf(w, capital(w, me), me);
    // Without the troops the realm started with there.
    for (const i of garrisonTroops(w, me, p)) w.armies.alive[i] = 0;
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

  it("queues recruits a thousand at a time, at most ten per province, and cancels the last with its gold back", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    w.nationTreasury[me] = 1000;
    w.nationTroopCap[me] = 1e6;
    const p = capital(w, me);
    w.provinceRecruits[p] = w.provinceRecruitCeiling[p] = 20000;
    for (let i = 0; i < 10; i++) ok(w, { type: "recruit", province: p, thousands: 1 }, me);
    expect(refused(w, { type: "recruit", province: p, thousands: 1 }, me)).toMatch(/queue .* full/);
    const gold = w.nationTreasury[me]!;
    ok(w, { type: "cancelRecruit", province: p }, me);
    expect(w.musters.find((m) => m.province === p)!.men).toBe(9000);
    expect(w.provinceRecruits[p]).toBeCloseTo(11000, 0);
    expect(w.nationTreasury[me]).toBeGreaterThan(gold);
    ok(w, { type: "recruit", province: p, thousands: 1 }, me);
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
    const [company] = freeCompaniesFor(w, me);
    expect(refused(w, { type: "hire", company: company!.id }, me)).toMatch(/siege/);
  });

  it("splits, merges and sends home troops", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const [army] = armiesOf(w, me);
    const men = w.armies.men[army!]!;
    const before = armiesOf(w, me);
    ok(w, { type: "split", army: army!, arm: "light horse", men: 600 }, me);
    const other = armiesOf(w, me).find((i) => !before.includes(i))!;
    expect(w.armies.horse[other]).toBe(600);
    expect(w.armies.commander[other]).toBe(-1);
    expect(w.armies.men[army!]).toBe(men - 600);
    ok(w, { type: "dismiss", army: army!, arm: "levy foot", men: 400 }, me);
    expect(w.armies.men[army!]).toBe(men - 1000);
    ok(w, { type: "pickUp", army: army! }, me);
    expect(w.armies.men[army!]).toBe(men - 400);
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

  it("buys free companies who arrive weeks later under their own captain", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "castile");
    w.player = me;
    const c = freeCompaniesFor(w, me)[0]!;
    const weeksToCome = companyWeeks(w, c, me);
    const before = armiesOf(w, me).length;
    w.nationTreasury[me] = 10000;
    ok(w, { type: "hire", company: c.id }, me);
    expect(w.freeCompanies).not.toContain(c);
    expect(refused(w, { type: "hire", company: c.id }, me)).toMatch(/not for hire/);
    weeks(w, me, weeksToCome);
    const company = armiesOf(w, me).find((i) => w.armies.kind[i] === 1)!;
    expect(armiesOf(w, me).length).toBe(before + 1);
    expect(w.armies.commander[company]).toBeGreaterThanOrEqual(0);
    expect(w.commanders[w.armies.commander[company]!]!.name).toBe(`Captain ${c.captain}`);
    ARMS.forEach((a, k) => expect(arm(w, company, a)).toBeCloseTo(c.byArm[k]!));
    expect(w.armies.men[company]).toBeCloseTo(companyMen(c));
    expect(refused(w, { type: "appoint", army: company, commander: -1 }, me)).toMatch(/captain/);
  });

  it("free companies are of the age: a group's arms, a size up to the largest company, and always some for hire", () => {
    const w = createWorld(rules, 1, tiles);
    const d = rules.defines.recruit;
    expect(w.freeCompanies.length).toBe(d.freeCompaniesForHire);
    const sizes = new Set<number>();
    for (let month = 0; month < 24; month++) {
      for (const c of w.freeCompanies) {
        const def = d.freeCompanies.find((f) => f.group === c.group)!;
        expect(companyMen(c)).toBeGreaterThanOrEqual(d.freeCompanyMen.min);
        expect(companyMen(c)).toBeLessThanOrEqual(d.freeCompanyMen.max);
        expect(def.names).toContain(c.name);
        ARMS.forEach((a, k) => {
          if (c.byArm[k]! > 0) expect(def.mix[a], `${c.group} has no ${a}`).toBeDefined();
        });
        sizes.add(companyMen(c));
      }
      w.turn += 4;
      refreshFreeCompanies(w);
      expect(w.freeCompanies.length).toBe(d.freeCompaniesForHire);
      expect(new Set(w.freeCompanies.map((c) => c.name)).size).toBe(w.freeCompanies.length);
    }
    // Not every company the same size (Leroy: no fixed 1,000 men).
    expect(sizes.size).toBeGreaterThan(5);
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
