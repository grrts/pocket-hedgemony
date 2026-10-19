import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, spawnArmy, type World } from "../src/index.ts";
import { aiRecruits, fearOfRealm, monthlyFear, standingTargetOf, strengths, warRaise } from "../src/arms.ts";
import { aiTreasury, LEDGER, LEDGER_LINES } from "../src/treasury.ts";
import { KIND, recount } from "../src/recruit.ts";
import { neighbourRealms, statecraftView } from "../src/statecraft.ts";
import { nameAbroadView } from "../src/conquest.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import * as dip from "../src/domain/diplomacy/index.ts";
import { W } from "../src/domain/warfare/index.ts";

/** Arms and fear (DIPL-228 to DIPL-233, Leroy 19 Oct). */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const capital = (w: World, n: number) => w.provinceIndex.get(rules.nations[n]!.capital)!;
const fears = (w: World, n: number) => dip.country(w.diplomacy, w.nationIds[n]!).fears ?? [];
const AF = dip.AF;

describe("fear of a stronger neighbour (DIPL-228)", () => {
  it("reads the levels from the strength ratio", () => {
    expect(dip.fearOf(AF.fear.wary_ratio - 0.01)).toBe("calm");
    expect(dip.fearOf(AF.fear.wary_ratio)).toBe("wary");
    expect(dip.fearOf(AF.fear.threatened_ratio)).toBe("threatened");
    expect(dip.ownSide(10000, [4000, 2000])).toBe(10000 + AF.fear.ally_weight * 6000);
  });

  it("makes a small realm Threatened of a much stronger neighbour, by the neighbour's strength over its side's", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    monthlyFear(w, []);
    const sav = nation(w, "savoy");
    const fra = nation(w, "france");
    const s = strengths(w);
    const f = fears(w, sav).find((x) => x.of === "france")!;
    expect(f.level).toBe("threatened");
    expect(f.ratio).toBeCloseTo(s[fra]! / s[sav]!, 1);
    expect(fearOfRealm(w, sav)).toBe("threatened");
    // Most feared first; France fears none of its small neighbours.
    expect(fears(w, sav).map((x) => x.ratio)).toEqual([...fears(w, sav).map((x) => x.ratio)].sort((a, b) => b - a));
    expect(fears(w, fra).some((x) => x.of === "savoy")).toBe(false);
  });

  it("fears no ally, and counts its allies on its side", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    const g = w.diplomacy.graph;
    dip.relations.formAlliance(g, "savoy", "france");
    monthlyFear(w, []);
    expect(fears(w, nation(w, "savoy")).some((x) => x.of === "france")).toBe(false);
    // A strong ally lowers what it fears of the rest.
    const v = createWorld(rules, 1, tiles);
    v.player = -1;
    monthlyFear(v, []);
    const feared = fears(v, nation(v, "savoy")).find((x) => x.of === "france")!;
    dip.relations.formAlliance(v.diplomacy.graph, "savoy", "ottomans");
    monthlyFear(v, []);
    expect(fears(v, nation(v, "savoy")).find((x) => x.of === "france")!.ratio).toBeLessThan(feared.ratio);
  });

  it("tells the player when a neighbour comes to feel threatened by them, once", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = nation(w, "france");
    const news: { text: string }[] = [];
    monthlyFear(w, news as never);
    expect(news.some((x) => x.text.startsWith("Savoy feels threatened by your strength"))).toBe(true);
    const again: { text: string }[] = [];
    monthlyFear(w, again as never);
    expect(again.some((x) => x.text.startsWith("Savoy"))).toBe(false);
  });

  it("shows the player who fears them and whom another realm fears, and keeps fears in a save", () => {
    const w = createWorld(rules, 1, tiles);
    const fra = nation(w, "france");
    w.player = fra;
    monthlyFear(w, []);
    const abroad = nameAbroadView(w, fra);
    expect(abroad.fearful.some((x) => x.nation === nation(w, "savoy") && x.level === "threatened")).toBe(true);
    expect(abroad.fearRatios).toEqual({ wary: AF.fear.wary_ratio, threatened: AF.fear.threatened_ratio });
    const view = statecraftView(w, fra)!;
    expect(view.me).toBe(fra);
    expect(view.realms[nation(w, "savoy")]!.fears[0]!.nation).toBe(fra);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "france", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(dip.country(back.diplomacy, "savoy").fears).toEqual(fears(w, nation(w, "savoy")));
  });
});

describe("standing armies at peace (DIPL-229)", () => {
  it("sizes the standing army by the cap, the largest unfriendly neighbour and fear, within its pay", () => {
    const base = { cap: 40000, largestNeighbour: 0, income: 1000, levyPer1000: 1, fear: "calm" as const };
    expect(dip.standingTarget(base)).toBeCloseTo(AF.standing.share_of_cap * 40000);
    expect(dip.standingTarget({ ...base, largestNeighbour: 30000 })).toBeCloseTo(AF.standing.match_neighbour * 30000);
    expect(dip.standingTarget({ ...base, fear: "threatened" })).toBeCloseTo(AF.standing.share_of_cap * 40000 * AF.standing.multiplier.threatened);
    expect(dip.standingTarget({ ...base, largestNeighbour: 1e6 })).toBeCloseTo(AF.standing.max_share_of_cap.calm * 40000);
    expect(dip.standingTarget({ ...base, income: 5 })).toBeCloseTo(5 * AF.standing.pay_share_of_income.calm * 1000);
  });

  it("calls men up to its standing army at peace, in its provinces with the most men to call", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    monthlyFear(w, []);
    const n = nation(w, "aragon");
    const target = standingTargetOf(w, n);
    expect(target - w.nationCapUsed[n]!).toBeGreaterThan(AF.standing.slack);
    aiRecruits(w, [], () => false);
    const called = w.musters.filter((m) => m.nation === n).reduce((t, m) => t + m.men, 0);
    expect(called).toBeGreaterThan(0);
    expect(called).toBeLessThanOrEqual(AF.standing.raise_per_month * 1000);
  });

  it("sends home only the levies beyond its standing army, smallest first", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    monthlyFear(w, []);
    const n = nation(w, "castile");
    const a = w.armies;
    for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n) a.alive[i] = 0;
    w.musters = w.musters.filter((m) => m.nation !== n);
    const at = capital(w, n);
    const armies = [3000, 4000, 6000, 30000].map((men) => spawnArmy(w, n, at, men, -1, 0, { kind: KIND.levy }));
    for (const i of armies) a.monthsOut[i] = W.levy.free_months;
    recount(w);
    const target = standingTargetOf(w, n);
    expect(w.nationCapUsed[n]!).toBeGreaterThan(target);
    aiRecruits(w, [], () => false);
    const kept = armies.filter((i) => a.alive[i]).map((i) => a.men[i]!);
    expect(w.nationCapUsed[n]!).toBeGreaterThanOrEqual(target);
    // The 30,000 stay: sending them home would take it under its standing army.
    expect(kept).toContain(30000);
    expect(kept.length).toBeLessThan(4);
  });
});

describe("calling men across the realm at war (DIPL-230)", () => {
  it("calls more than the old 10,000 a month, in provinces far from the capital too, within its share of the cap", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    const n = nation(w, "france");
    w.nationTreasury[n] = 1000;
    const want = warRaise(w, n);
    expect(want).toBeLessThanOrEqual(AF.war.share_of_cap * w.nationTroopCap[n]! + 1);
    w.musters = [];
    aiRecruits(w, [], (k) => k === n);
    const mine = w.musters.filter((m) => m.nation === n);
    const called = mine.reduce((t, m) => t + m.men, 0);
    expect(called).toBeGreaterThan(10000);
    expect(called).toBeLessThanOrEqual(want + 1);
    const cap = capital(w, n);
    const nearCap = new Set([cap]);
    for (let k = w.adjStart[cap]!; k < w.adjStart[cap + 1]!; k++) nearCap.add(w.adjList[k]!);
    expect(mine.some((m) => !nearCap.has(m.province))).toBe(true);
    for (const m of mine) expect(m.men).toBeLessThanOrEqual(AF.war.per_province * 1000);
  });
});

describe("borrowing for war (DIPL-231)", () => {
  it("borrows up to a few months of its army's pay while Threatened, and not while calm", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    monthlyFear(w, []);
    const sav = nation(w, "savoy");
    const pay = 10;
    w.nationLedger[sav * LEDGER_LINES + LEDGER.indexOf("army pay")] = -pay;
    w.nationDebt[sav] = 0;
    w.nationTreasury[sav] = 5;
    aiTreasury(w, []);
    expect(w.nationDebt[sav]!).toBeGreaterThan(0);
    expect(w.nationTreasury[sav]!).toBeCloseTo(Math.min(5 + w.nationDebt[sav]! / 1.1, pay * AF.borrow.months_of_pay), 0);
    const calm = w.nationIndex.get("france")!;
    expect(fearOfRealm(w, calm)).not.toBe("threatened");
    w.nationLedger[calm * LEDGER_LINES + LEDGER.indexOf("army pay")] = -pay;
    w.nationDebt[calm] = 0;
    w.nationTreasury[calm] = 5;
    aiTreasury(w, []);
    expect(w.nationDebt[calm]).toBe(0);
  });

  it("measures fears only against neighbours", () => {
    const w = createWorld(rules, 1, tiles);
    monthlyFear(w, []);
    const near = neighbourRealms(w);
    for (let n = 0; n < w.nationCount; n++) for (const f of fears(w, n)) expect(near[n]!.has(nation(w, f.of))).toBe(true);
  });
});
