import { describe, expect, it, vi } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, relationState, spawnArmy, type World } from "../src/index.ts";
import { lordLands } from "../src/lords.ts";
import { monthlyRecruits } from "../src/recruit.ts";
import { warBetween } from "../src/war.ts";
import { cededProvinces, maxCeded, monthlyRefusals, peaceVoices, refusingPeace, warPeaceView, type GameWar } from "../src/peace.ts";
import * as dip from "../src/domain/diplomacy/index.ts";
import * as wf from "../src/domain/warfare/index.ts";

// These scenarios measure the war-price rules alone: a head of the faith's censure of a war on
// fellow believers makes lords waver too (RELG-149), and is tested with the faith heads.
vi.mock("../src/faithHeads.ts", async (importOriginal) => ({ ...(await importOriginal<typeof import("../src/faithHeads.ts")>()), faithHeadsWars: () => {} }));

/** The price of war, peace part (X-21): domain/warfare/features/price-of-war.feature. */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const lordsOf = (w: World, nation: number) => w.lords.flatMap((l, k) => (l.nation === nation ? [k] : []));
const landOf = (w: World, nation: number) => Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === nation);
const capitalOf = (w: World, nation: number) => w.provinceIndex.get(rules.nations[nation]!.capital)!;

/** A world where a realm's voices depend only on what the test sets: no grievances, no Warlike ruler, loyal lords who aren't Warlike. */
function quiet(seed = 1): World {
  const w = createWorld(rules, seed, tiles);
  w.provinceGrievances.fill(0);
  for (const r of w.rulers) r.traits = ["Pious", "Builder"];
  for (const l of w.lords) {
    l.loyalty = "Loyal";
    l.traits = ["Pious", "Builder"];
  }
  return w;
}

/** A realm France may declare on in 1444: no tie, truce or war between them (worked out once). */
let foe1444: string | undefined;
function foeOf(w: World, a: number): number {
  if (!foe1444) {
    for (const id of ["savoy", "milan", "aragon", "navarra", "brittany", "lorraine", "castile"]) {
      const b = w.nationIndex.get(id);
      if (b === undefined || b === a || relationState(w, a, b).state !== null) continue;
      const probe = createWorld(rules, 1, tiles);
      if (!applyNow(probe, { type: "declareWar", target: b, aim: "no_aim" }, a).rejectedOrders.length) {
        foe1444 = id;
        break;
      }
    }
  }
  return n(w, foe1444!);
}

/**
 * At war: `a` declares on `b` (the aim given, else no aim), and the war. A war
 * with no aim is declared on a Punish aim and then made aimless, so the
 * declaration's own price (F-167, aimlessWar.test.ts) leaves the lords be.
 */
function war(w: World, a: number, b: number, aim = "no_aim") {
  if (aim === "no_aim") w.diplomacy.aims.push({ holder: w.nationIds[a]!, target: w.nationIds[b]!, aim: "punish", source: "test" });
  const r = applyNow(w, { type: "declareWar", target: b, aim: aim === "no_aim" ? "punish" : aim }, a);
  expect(r.rejectedOrders).toEqual([]);
  const x = warBetween(w, a, b)! as GameWar;
  if (aim === "no_aim") x.aim = "no_aim";
  return x;
}

describe("the price of war: peace voices in the game (WAR-221)", () => {
  it("counts France's voices from its lords, royal provinces and capital, not the share of its people occupied", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    const x = war(w, foe, fr);
    const lords = lordsOf(w, fr);
    expect(lords.length).toBeGreaterThanOrEqual(5);
    // 3 of France's lords have a province occupied by the enemy.
    const hurt = lords.slice(0, 3);
    for (const k of hurt) w.provinceOccupier[lordLands(w, k)[0]!] = foe;
    w.day++;
    const v = peaceVoices(w, fr, x);
    const hurtVoices = hurt.reduce((t, k) => t + lordLands(w, k).length, 0);
    expect(v.peace).toBe(hurtVoices);
    expect(v.war).toBe(0);
    // The capital weighs a third of all voices.
    expect(v.total).toBeCloseTo((v.total - v.total / 3) * 1.5);
    expect(v.share).toBeCloseTo(v.peace / v.total);
    // Occupying the most peopled royal province adds one voice, not its share of the people.
    const royal = landOf(w, fr).filter((p) => w.provinceLord[p]! < 0 && p !== capitalOf(w, fr)).sort((a, b) => w.provincePopulation[b]! - w.provincePopulation[a]!)[0]!;
    w.provinceOccupier[royal] = foe;
    w.day++;
    expect(peaceVoices(w, fr, x).peace).toBe(hurtVoices + 1);
    // The war card carries both leaders' voices.
    const view = warPeaceView(w, x)!;
    expect(view.voices.defender.nation).toBe(fr);
    expect(view.voices.defender.peace).toBe(hurtVoices + 1);
    expect(view.aim).toBe("no_aim");
  });

  it("makes a Warlike ruler ignore a quarter of the peace voices and the capital weigh a third (WAR-180)", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    const x = war(w, foe, fr);
    w.provinceOccupier[capitalOf(w, fr)] = foe;
    w.day++;
    const v = peaceVoices(w, fr, x);
    expect(v.peace / v.total).toBeCloseTo(1 / 3);
    w.rulers[fr]!.traits = ["Warlike", "Pious"];
    w.day++;
    expect(peaceVoices(w, fr, x).share).toBeCloseTo((1 / 3) * 0.75);
  });

  it("makes an obliged AI give up what the enemy occupies, and a free one refuse (WAR-181, WAR-183)", () => {
    const w = quiet(7);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    w.player = me;
    const x = war(w, me, foe);
    const land = landOf(w, foe);
    // Only one province held: Portugal's voices do not oblige it.
    const one = land.find((p) => p !== capitalOf(w, foe))!;
    w.provinceOccupier[one] = me;
    w.day++;
    expect(peaceVoices(w, foe, x).obliged).toBe(false);
    // It will not hand over the province: one province held does not buy it at the peace table (WAR-243).
    applyNow(w, { type: "offerPeace", target: foe, terms: "take", provinces: [one] }, me);
    expect(relationState(w, me, foe).state).toBe("war");
    w.peaceOffers = [];
    // All of it held: over half say peace, and it gives up what one peace may take.
    for (const p of land) w.provinceOccupier[p] = me;
    w.day++;
    expect(peaceVoices(w, foe, x).obliged).toBe(true);
    applyNow(w, { type: "offerPeace", target: foe, terms: "take" }, me);
    expect(relationState(w, me, foe).state).toBe("truce");
    expect(landOf(w, foe).length).toBe(land.length - maxCededOf(land.length));
  });
});

const maxCededOf = (of: number) => wf.maxCeded(of).max;

describe("the price of war: refusing an obliged peace (WAR-221, WAR-181)", () => {
  it("costs every lord a step each season and makes levies desert twice as fast", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    w.player = fr;
    const x = war(w, foe, fr);
    // Castile holds most of France, its capital among them: over half say peace.
    const land = landOf(w, fr);
    land.slice(0, Math.ceil(land.length * 0.7)).forEach((p) => (w.provinceOccupier[p] = foe));
    w.provinceOccupier[capitalOf(w, fr)] = foe;
    w.day++;
    expect(peaceVoices(w, fr, x).obliged).toBe(true);
    // A levy of 10,000 at home, and Castile's offer asking only for what it occupies.
    const home = land.find((p) => w.provinceOccupier[p]! < 0)!;
    const levy = spawnArmy(w, fr, home, 10000);
    w.peaceOffers.push({ id: 1, from: foe, terms: "take" });
    expect(applyNow(w, { type: "answerPeace", offer: 1, yes: false }, fr).rejectedOrders).toEqual([]);
    expect(x.refused).toContain("france");
    expect(refusingPeace(w, fr)).toBe(true);
    // At the season's end every lord of France loses a step.
    w.date = { year: 1445, month: 3, day: 1 };
    monthlyRefusals(w, []);
    for (const k of lordsOf(w, fr)) expect(w.lords[k]!.loyalty).toBe("Wavering");
    // Levies desert twice as fast: from at least the old going-home pace of 5 % a month.
    const before = w.armies.men[levy]!;
    monthlyRecruits(w, []);
    expect(1 - w.armies.men[levy]! / before).toBeCloseTo(wf.W.levy.go_home_rate * wf.W.peace.refuse_desertion, 2);
  });

  it("forgives a refusal once the voices no longer oblige", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    w.player = fr;
    const x = war(w, foe, fr);
    for (const p of landOf(w, fr)) w.provinceOccupier[p] = foe;
    w.day++;
    w.peaceOffers.push({ id: 2, from: foe, terms: "white" });
    applyNow(w, { type: "answerPeace", offer: 2, yes: false }, fr);
    expect(x.refused).toContain("france");
    w.provinceOccupier.fill(-1);
    w.day++;
    w.date = { year: 1445, month: 2, day: 1 };
    monthlyRefusals(w, []);
    expect(x.refused).toEqual([]);
    expect(refusingPeace(w, fr)).toBe(false);
  });
});

describe("the price of war: no fitting aim and broken truces (WAR-222)", () => {
  it("makes France's lords who aren't Warlike waver when it takes a province in a war with no aim", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    const lords = lordsOf(w, fr);
    w.lords[lords[0]!]!.traits = ["Warlike", "Pious"];
    war(w, fr, foe, "no_aim");
    for (const p of landOf(w, foe)) w.provinceOccupier[p] = fr;
    w.day++;
    applyNow(w, { type: "offerPeace", target: foe, terms: "take" }, fr);
    expect(relationState(w, fr, foe).state).toBe("truce");
    expect(w.lords[lords[0]!]!.loyalty).toBe("Loyal");
    for (const k of lords.slice(1)) expect(w.lords[k]!.loyalty).toBe("Wavering");
  });

  it("leaves the lords be when the war has a fitting aim", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    const x = war(w, fr, foe, "no_aim");
    x.aim = "punish";
    for (const p of landOf(w, foe)) w.provinceOccupier[p] = fr;
    w.day++;
    applyNow(w, { type: "offerPeace", target: foe, terms: "take" }, fr);
    expect(relationState(w, fr, foe).state).toBe("truce");
    for (const k of lordsOf(w, fr)) expect(w.lords[k]!.loyalty).toBe("Loyal");
  });

  it("makes every lord waver a step when the ruler breaks a truce to declare (WAR-179)", () => {
    const w = quiet();
    const fr = n(w, "france");
    const en = n(w, "england");
    expect(relationState(w, fr, en).state).toBe("truce");
    expect(applyNow(w, { type: "declareWar", target: en }, fr).rejectedOrders[0]?.reason).toMatch(/truce/);
    for (const k of lordsOf(w, fr)) expect(w.lords[k]!.loyalty).toBe("Loyal");
    // On a Punish aim, so only the broken truce moves the lords (a war with no aim costs more, F-167).
    w.diplomacy.aims.push({ holder: "france", target: "england", aim: "punish", source: "test" });
    expect(applyNow(w, { type: "declareWar", target: en, breakTruce: true }, fr).rejectedOrders).toEqual([]);
    expect(relationState(w, fr, en).state).toBe("war");
    for (const k of lordsOf(w, fr)) expect(w.lords[k]!.loyalty).toBe("Wavering");
  });

  it("declares with the best fitting aim the declarer holds when none is named", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    w.diplomacy.aims.push({ holder: "france", target: w.nationIds[foe]!, aim: "punish", source: "test" });
    expect(applyNow(w, { type: "declareWar", target: foe }, fr).rejectedOrders).toEqual([]);
    expect(warBetween(w, fr, foe)!.aim).toBe("punish");
  });
});

describe("the price of war: lords tire of a long war (WAR-223)", () => {
  it("makes a lord who isn't Warlike and whose Want is not the aim say peace with all his voices after 2 years", () => {
    const w = quiet();
    const fr = n(w, "france");
    const foe = foeOf(w, fr);
    const lords = lordsOf(w, fr);
    const bourbon = lords.find((k) => w.lords[k]!.house === "Bourbon")!;
    // Every other lord is Warlike (he says war); Bourbon is not, and wants another province than the aim.
    for (const k of lords) if (k !== bourbon) w.lords[k]!.traits = ["Warlike", "Greedy"];
    const x = war(w, fr, foe);
    x.aim = "take_land";
    x.aimProvince = w.provinceIds[landOf(w, foe)[0]!]!;
    w.lords[bourbon]!.want = w.provinceIds[landOf(w, foe)[1]!]!;
    const bourbonVoices = lordLands(w, bourbon).length;
    w.day++;
    expect(peaceVoices(w, fr, x).peace).toBe(0);
    // Two years on.
    x.start = dip.addMonths(x.start, -24);
    w.day++;
    const v = peaceVoices(w, fr, x);
    expect(v.peace).toBe(bourbonVoices);
    expect(warPeaceView(w, x)!.longWar).toBe(true);
    // A lord whose Want is the aim says war instead.
    w.lords[bourbon]!.want = x.aimProvince;
    w.day++;
    expect(peaceVoices(w, fr, x).peace).toBe(0);
    expect(peaceVoices(w, fr, x).war).toBe(lords.reduce((t, k) => t + lordLands(w, k).length, 0));
  });
});

describe("the price of war: one peace cannot swallow a realm (WAR-227)", () => {
  /** Leaves Portugal `provinces` provinces (its capital among them), gives the rest to Castile, and has Castile occupy `occupied` of them, the capital first. */
  function setUp(provinces: number, occupied: number) {
    const w = quiet(7);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    w.player = me;
    war(w, me, foe);
    const cap = capitalOf(w, foe);
    const land = [cap, ...landOf(w, foe).filter((p) => p !== cap)];
    // Portugal has fewer than 11 provinces: Castile's nearest land is lent to it.
    for (const p of landOf(w, me)) if (land.length < provinces && p !== capitalOf(w, me)) land.push(p);
    land.forEach((p, i) => {
      w.provinceOwner[p] = i < provinces ? foe : me;
      w.provinceLord[p] = -1;
    });
    const kept = land.slice(0, provinces);
    kept.slice(0, occupied).forEach((p) => (w.provinceOccupier[p] = me));
    w.day++;
    return { w, me, foe, cap, kept };
  }

  for (const [provinces, occupied, ceded, capital] of [
    [11, 11, 4, "kept"],
    [3, 2, 1, "kept"],
    [1, 1, 1, "ceded"],
  ] as const) {
    it(`cedes ${ceded} of ${provinces} provinces when ${occupied} are occupied, and the capital is ${capital}`, () => {
      const { w, me, foe, cap } = setUp(provinces, occupied);
      expect(maxCeded(w, foe)).toEqual({ max: ceded, of: provinces });
      const before = landOf(w, me).length;
      applyNow(w, { type: "offerPeace", target: foe, terms: "take" }, me);
      expect(relationState(w, me, foe).state === "truce" || w.nationGone[foe]).toBeTruthy();
      expect(landOf(w, me).length - before).toBe(ceded);
      expect(w.provinceOwner[cap] === me ? "ceded" : "kept").toBe(capital);
    });
  }

  it("takes the asker's picks first, and the land on its border before the rest", () => {
    const { w, me, foe, kept } = setUp(11, 11);
    const pick = kept[kept.length - 1]!;
    const chosen = cededProvinces(w, foe, [me], [pick]);
    expect(chosen[0]).toBe(pick);
    expect(chosen.length).toBe(4);
    expect(chosen).not.toContain(capitalOf(w, foe));
    // Deterministic: the same every time.
    expect(cededProvinces(w, foe, [me], [pick])).toEqual(chosen);
    // The war card says the most one peace can take now.
    expect(warPeaceView(w, warBetween(w, me, foe)!)!.cede.defender).toEqual({ max: 4, of: 11, now: 4 });
  });
});
