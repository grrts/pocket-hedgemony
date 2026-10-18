import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, relationState, settlementTable, settlementsView, type World } from "../src/index.ts";
import { monthlyDiplomacy, strength, type News } from "../src/war.ts";
import { answerDemand, beaten, bestDemand, capacityOf, demandCost, provinceCost, whyNotTerms, type Candidate, type WarOutcome } from "../src/domain/warfare/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;

const facts = { people: 100, wealth: 3, castle: false, coastal: false, river: false, capital: false, bordersTaker: true };
const outcome = (o: Partial<WarOutcome> = {}): WarOutcome => ({
  realmValue: 100,
  landHeld: 0,
  capitalHeld: false,
  menLost: { ours: 0, theirs: 0 },
  strength: { ours: 1000, theirs: 1000 },
  theirPeaceShare: 0,
  ...o,
});

describe("peace settlement scoring: the counts (WAR-240 … WAR-245)", () => {
  it("prices a province by its people, wealth, castle, coast, river, capital and nearness", () => {
    const plain = provinceCost(facts);
    expect(plain).toBe(Math.round(2 + 10 * 0.5 + 3));
    expect(provinceCost({ ...facts, castle: true })).toBeGreaterThan(plain);
    expect(provinceCost({ ...facts, coastal: true, river: true })).toBeGreaterThan(plain);
    expect(provinceCost({ ...facts, capital: true })).toBe(Math.round(10 * 1.5));
    expect(provinceCost({ ...facts, bordersTaker: false })).toBe(Math.round(10 * 1.25));
    expect(provinceCost({ ...facts, people: 0, wealth: 0 })).toBe(2);
  });

  it("builds the capacity from land held, the capital, battles, armies and the will to fight", () => {
    expect(capacityOf(outcome()).capacity).toBe(0);
    // Armies and their wish for peace weigh only what was won: nothing won, nothing to ask.
    expect(capacityOf(outcome({ strength: { ours: 9000, theirs: 10 }, theirPeaceShare: 0.9 })).capacity).toBe(0);
    const c = capacityOf(outcome({ landHeld: 40, capitalHeld: true, menLost: { ours: 1000, theirs: 3000 }, strength: { ours: 2000, theirs: 1000 }, theirPeaceShare: 0.6 }));
    const points = Object.fromEntries(c.parts.map((p) => [p.part, p.points]));
    expect(points).toEqual({ land_held: 20, capital_held: 15, battles: 7.5, armies: 2.1, will_to_fight: 6.3 });
    expect(c.capacity).toBe(51);
    // Never more than the whole realm; a surrender opens the whole realm.
    expect(capacityOf(outcome({ landHeld: 100, capitalHeld: true, menLost: { ours: 0, theirs: 9 }, strength: { ours: 1, theirs: 0 }, theirPeaceShare: 1 })).capacity).toBe(100);
    expect(capacityOf(outcome({ surrendered: true })).capacity).toBe(100);
    // Losing battles or being outnumbered never gives capacity below zero.
    expect(capacityOf(outcome({ menLost: { ours: 5000, theirs: 10 }, strength: { ours: 10, theirs: 5000 } })).capacity).toBe(0);
  });

  const cands: Candidate[] = [
    { province: 1, realm: 9, cost: 10 },
    { province: 2, realm: 9, cost: 6 },
    { province: 3, realm: 9, cost: 4 },
    { province: 4, realm: 8, cost: 7 },
  ];
  const limits = { mostPerRealm: new Map([[9, 2], [8, 1]]), maxGold: 200 };
  const cap = (capacity: number) => ({ parts: [], capacity, realmValue: 100, surrendered: false });

  it("checks what may be asked at all: held land, the per-realm limit and their gold", () => {
    expect(whyNotTerms({ provinces: [1, 2], gold: 0 }, cands, limits)).toBeNull();
    expect(whyNotTerms({ provinces: [1, 2, 3], gold: 0 }, cands, limits)).toMatch(/at most 2/);
    expect(whyNotTerms({ provinces: [5], gold: 0 }, cands, limits)).toMatch(/holds/);
    expect(whyNotTerms({ provinces: [], gold: 500 }, cands, limits)).toMatch(/gold/);
    expect(whyNotTerms({ provinces: [], gold: 0 }, cands, limits)).toMatch(/at least/);
    expect(demandCost({ provinces: [1, 4], gold: 30 }, cands)).toBe(10 + 7 + 2);
  });

  it("answers a demand: accept what fits, counter with the most of it that fits, refuse when nothing does", () => {
    expect(answerDemand({ provinces: [1, 2], gold: 0 }, cands, cap(16), limits)).toEqual({ answer: "accept" });
    expect(answerDemand({ provinces: [1, 2, 4], gold: 50 }, cands, cap(18), limits)).toEqual({ answer: "counter", counter: { provinces: [1, 4], gold: 25 } });
    expect(answerDemand({ provinces: [1], gold: 0 }, cands, cap(9), limits)).toEqual({ answer: "reject" });
    expect(answerDemand({ provinces: [3], gold: 0 }, cands, cap(0), limits)).toEqual({ answer: "reject" });
  });

  it("spends a capacity as the AI would: dearest land that fits, within the limits, the rest in gold", () => {
    expect(bestDemand(cands, 20, limits)).toEqual({ provinces: [1, 4], gold: 75 });
    expect(bestDemand(cands, 100, limits)).toEqual({ provinces: [1, 4, 2], gold: 200 });
    expect(bestDemand(cands, 3, { ...limits, maxGold: 0 })).toEqual({ provinces: [], gold: 0 });
  });

  it("calls a side beaten only when it wants peace, has hardly an army and has lost its capital or half its land", () => {
    const lost = outcome({ theirPeaceShare: 0.8, strength: { ours: 1000, theirs: 200 }, capitalHeld: true });
    expect(beaten(lost)).toBe(true);
    expect(beaten({ ...lost, theirPeaceShare: 0.6 })).toBe(false);
    expect(beaten({ ...lost, strength: { ours: 1000, theirs: 400 } })).toBe(false);
    expect(beaten({ ...lost, capitalHeld: false, landHeld: 30 })).toBe(false);
    expect(beaten({ ...lost, capitalHeld: false, landHeld: 50 })).toBe(true);
  });
});

/** Castile at war with Portugal, holding the Portuguese provinces `held` picks. */
function castileAtWar(seed = 7) {
  const w = createWorld(rules, seed, tiles);
  const me = n(w, "castile");
  const foe = n(w, "portugal");
  w.player = me;
  applyNow(w, { type: "declareWar", target: foe }, me);
  const capital = w.provinceIndex.get(rules.nations[foe]!.capital)!;
  const theirs = Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === foe);
  return { w, me, foe, capital, theirs };
}

describe("peace settlement scoring in the game", () => {
  it("prices the same war the same way every time (deterministic)", () => {
    const a = castileAtWar();
    const b = castileAtWar();
    for (const x of [a, b]) for (const p of x.theirs.slice(0, 3)) x.w.provinceOccupier[p] = x.me;
    expect(JSON.stringify(settlementTable(a.w, a.me, a.foe))).toBe(JSON.stringify(settlementTable(b.w, b.me, b.foe)));
    expect(settlementsView(a.w)).toEqual(settlementsView(b.w));
  });

  it("grows the capacity as the war is won", () => {
    const { w, me, foe, theirs } = castileAtWar();
    const before = settlementTable(w, me, foe)!.capacity.capacity;
    for (const p of theirs.slice(0, 4)) w.provinceOccupier[p] = me;
    const after = settlementTable(w, me, foe)!;
    expect(after.capacity.capacity).toBeGreaterThan(before);
    expect(after.capacity.parts.find((x) => x.part === "land_held")!.points).toBeGreaterThan(0);
    // Battles won count too.
    const war = w.diplomacy.wars.find((x) => x.attackers.includes("castile"))!;
    war.menLost = { attackers: 100, defenders: 5000 };
    expect(settlementTable(w, me, foe)!.capacity.capacity).toBeGreaterThan(after.capacity.capacity);
  });

  it("signs a demand that fits, and only for land held, never the capital while they have more", () => {
    const { w, me, foe, capital, theirs } = castileAtWar();
    for (const p of theirs) w.provinceOccupier[p] = me;
    const t = settlementTable(w, me, foe)!;
    expect(t.candidates.map((c) => c.province)).not.toContain(capital);
    expect(t.limits.mostPerRealm.get(foe)).toBe(Math.ceil(theirs.length / 3));
    expect(applyNow(w, { type: "offerPeace", target: foe, terms: "take", demand: { provinces: [capital], gold: 0 } }, me).rejectedOrders[0]?.reason).toMatch(/holds/);
    const cheapest = [...t.candidates].sort((a, b) => a.cost - b.cost)[0]!;
    expect(cheapest.cost).toBeLessThanOrEqual(t.capacity.capacity);
    const r = applyNow(w, { type: "offerPeace", target: foe, terms: "take", demand: { provinces: [cheapest.province], gold: 0 } }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect(w.provinceOwner[cheapest.province]).toBe(me);
    expect(relationState(w, me, foe).state).toBe("truce");
  });

  it("counters a demand that asks too much with what the war allows, which the player may take", () => {
    const { w, me, foe, theirs, capital } = castileAtWar();
    const held = theirs.filter((p) => p !== capital).slice(0, 5);
    for (const p of held) w.provinceOccupier[p] = me;
    const t = settlementTable(w, me, foe)!;
    expect(Math.min(...t.candidates.map((c) => c.cost))).toBeLessThanOrEqual(t.capacity.capacity);
    const all = { provinces: t.candidates.map((c) => c.province).slice(0, t.limits.mostPerRealm.get(foe)), gold: t.limits.maxGold };
    expect(all.provinces.reduce((s, p) => s + t.candidates.find((c) => c.province === p)!.cost, 0) + Math.ceil(all.gold / 25)).toBeGreaterThan(t.capacity.capacity);
    const r = applyNow(w, { type: "offerPeace", target: foe, terms: "take", demand: all }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect(relationState(w, me, foe).state).toBe("war");
    const counter = w.peaceOffers.find((o) => o.from === foe && o.counter)!;
    expect(r.news.some((x) => /will not give all you asked/.test(x.text))).toBe(true);
    expect(counter.terms).toBe("give");
    const goldBefore = w.nationTreasury[me]!;
    expect(applyNow(w, { type: "answerPeace", offer: counter.id, yes: true }, me).rejectedOrders).toEqual([]);
    for (const p of counter.provinces!) expect(w.provinceOwner[p]).toBe(me);
    expect(w.nationTreasury[me]!).toBeCloseTo(goldBefore + (counter.gold ?? 0), 3);
    expect(relationState(w, me, foe).state).toBe("truce");
  });

  it("refuses a demand when the war has gone their way", () => {
    const { w, me, foe, theirs, capital } = castileAtWar();
    const p = theirs.find((x) => x !== capital)!;
    w.provinceOccupier[p] = me;
    // Castile lost every battle and its armies are gone; Portugal does not want peace.
    const war = w.diplomacy.wars.find((x) => x.attackers.includes("castile"))!;
    war.menLost = { attackers: 20000, defenders: 100 };
    for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === me) w.armies.alive[i] = 0;
    const t = settlementTable(w, me, foe)!;
    expect(t.capacity.capacity).toBeLessThan(t.candidates[0]!.cost);
    const r = applyNow(w, { type: "offerPeace", target: foe, terms: "take", demand: { provinces: [p], gold: 0 } }, me);
    expect(r.news.some((x) => x.kind === "refused")).toBe(true);
    expect(relationState(w, me, foe).state).toBe("war");
  });

  it("lets a beaten AI surrender unconditionally to the player, who then may ask the whole table", () => {
    const { w, me, foe, theirs } = castileAtWar();
    for (const p of theirs) w.provinceOccupier[p] = me;
    for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === foe) w.armies.alive[i] = 0;
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === foe) w.provinceRecruits[p] = 0;
    w.nationLevies[foe] = 0;
    expect(strength(w, foe)).toBeLessThan(strength(w, me) * 0.25);
    expect(settlementTable(w, me, foe)!.beaten).toBe(true);
    const news: News[] = [];
    monthlyDiplomacy(w, news);
    expect(news.some((x) => /surrenders unconditionally/.test(x.text))).toBe(true);
    const offer = w.peaceOffers.find((o) => o.from === foe && o.surrender)!;
    expect(offer.terms).toBe("give");
    const view = settlementsView(w).find((s) => s.target === foe)!;
    expect(view.surrendered).toBe(true);
    expect(view.capacity).toBe(view.realmValue);
    // The rules still hold: at most a third of their land, no capital while they keep more.
    const most = view.mostPerRealm.find((x) => x.realm === foe)!.most;
    const ask = view.provinces.filter((x) => !x.why).slice(0, most).map((x) => x.province);
    expect(applyNow(w, { type: "offerPeace", target: foe, terms: "take", demand: { provinces: ask, gold: view.maxGold } }, me).rejectedOrders).toEqual([]);
    for (const p of ask) expect(w.provinceOwner[p]).toBe(me);
    expect(relationState(w, me, foe).state).toBe("truce");
  });

  it("ends a war between AI realms on the victor's terms when the loser surrenders", () => {
    const { w, me, foe, theirs } = castileAtWar();
    w.player = -1;
    for (const p of theirs) w.provinceOccupier[p] = me;
    for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === foe) w.armies.alive[i] = 0;
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === foe) w.provinceRecruits[p] = 0;
    w.nationLevies[foe] = 0;
    const news: News[] = [];
    monthlyDiplomacy(w, news);
    expect(news.some((x) => /surrenders unconditionally to Castile/.test(x.text))).toBe(true);
    expect(relationState(w, me, foe).state).toBe("truce");
    const taken = theirs.filter((p) => w.provinceOwner[p] === me).length;
    expect(taken).toBe(Math.ceil(theirs.length / 3));
  });
});
