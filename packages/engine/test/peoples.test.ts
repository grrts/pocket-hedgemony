import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { grievanceCount, grievancesOf } from "../src/moods.ts";
import { FAITH_IDS, faithLine, faithsOf, hasBelief, monthlyPeoples, NO_FAITH, NO_TONGUE, peoplesData, peoplesView, SLOTS, tongueLine, tonguesOf, TONGUE_IDS } from "../src/peoples.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const capitalOf = (w: World, id: string) => w.provinceIndex.get(rules.nations[w.nationIndex.get(id)!]!.capital)!;
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
/** Why an order was refused, or null. */
const refused = (w: World, order: Parameters<typeof applyNow>[1], n: number) => applyNow(w, order, n).rejectedOrders[0]?.reason ?? null;

/** Runs the monthly step of 1 January of the next year. */
function newYear(w: World): void {
  w.date = { year: w.date.year + 1, month: 1, day: 1 };
  monthlyPeoples(w, []);
}

describe("tongues and faiths", () => {
  it("gives every owned land province its realm's 1444 tongues and faiths, and no grievance yet (CULT-094, RELG-127)", () => {
    const w = createWorld(rules, 1, tiles);
    for (let p = 0; p < w.provinceCount; p++) {
      if (w.provinceWater[p] || w.provinceOwner[p]! < 0) continue;
      expect(w.provinceTongue[p * SLOTS]).not.toBe(NO_TONGUE);
      expect(w.provinceFaith[p * SLOTS]).not.toBe(NO_FAITH);
      const sum = Object.values(faithsOf(w, p)).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
      expect(w.provinceBelief[p]).toBe(0);
    }
    const p = capitalOf(w, "castile");
    expect(Object.keys(tonguesOf(w, p))[0]).toBe("castilian");
    expect(Object.keys(faithsOf(w, p))[0]).toBe("catholic");
    expect(FAITH_IDS[w.nationStateFaith[nation(w, "castile")]!]).toBe("catholic");
    expect(TONGUE_IDS[w.provinceHomeland[p]!]).toBe("castilian");
    // Bohemia's own land is Hussite, by the region override.
    expect(Object.keys(faithsOf(w, capitalOf(w, "bohemia")))[0]).toBe("hussite");
  });

  it("puts Foreign rule on a stranger homeland taken from its 1444 owner, and Banned language under Impose (CULT-015, CULT-040)", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "england");
    const castile = nation(w, "castile");
    w.provinceOwner[p] = castile;
    w.date = { year: 1445, month: 2, day: 1 };
    monthlyPeoples(w, []);
    expect(hasBelief(w, p, "Foreign rule")).toBe(true);
    expect(hasBelief(w, p, "Banned language")).toBe(false);
    // Castile has a chancery tradition and may Impose from 1444; France, without Printing, may not.
    expect(refused(w, { type: "tonguePolicy", policy: "impose" }, castile)).toBeNull();
    expect(hasBelief(w, p, "Banned language")).toBe(true);
    expect(refused(w, { type: "tonguePolicy", policy: "impose" }, nation(w, "france"))).toMatch(/Printing/);
    applyNow(w, { type: "tonguePolicy", policy: "teach" }, castile);
    expect(hasBelief(w, p, "Banned language")).toBe(false);
  });

  it("drifts tongues slowly toward the court each New Year, faster under Impose (CULT-016 to CULT-025)", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "castile");
    const before = tonguesOf(w, p);
    newYear(w);
    const teach = tonguesOf(w, p);
    expect(teach.castilian!).toBeGreaterThan(before.castilian!);
    expect(teach.galician!).toBeLessThan(before.galician!);
    // Half a percent a year, twice that for cousins: a slow move.
    expect(teach.castilian! - before.castilian!).toBeLessThan(0.005);
    w.nationTonguePolicy[nation(w, "castile")] = 2;
    newYear(w);
    const impose = tonguesOf(w, p);
    expect(before.galician! - teach.galician!).toBeLessThan(teach.galician! - impose.galician!);
    const line = tongueLine(peoplesData(w), p)!;
    expect(line.pull).toBe("castilian");
    expect(line.groups.find((g) => g.name === "Galician")!.reasons).toContain("related to the language it drifts toward");
  });

  it("takes a Faith policy at the next New Year: Restricted pays more tax, Persecuted counts twice and closes houses (RELG-050 to RELG-055)", () => {
    const w = createWorld(rules, 1, tiles);
    const bohemia = nation(w, "bohemia");
    const p = capitalOf(w, "bohemia");
    expect(refused(w, { type: "faithPolicy", faith: "hussite", policy: "restricted" }, bohemia)).toMatch(/Established/);
    applyNow(w, { type: "faithPolicy", faith: "catholic", policy: "restricted" }, bohemia);
    expect(w.provinceFaithTax[p]).toBe(1);
    newYear(w);
    expect(w.provinceFaithTax[p]).toBeGreaterThan(1);
    applyNow(w, { type: "faithPolicy", faith: "catholic", policy: "persecuted" }, bohemia);
    newYear(w);
    expect(grievancesOf(w, p)).toEqual([]);
    expect(hasBelief(w, p, "Persecuted")).toBe(true);
    expect(w.provinceFaithTax[p]).toBeLessThan(1);
    const catholic = FAITH_IDS.indexOf("catholic");
    expect([...w.provinceHouses.subarray(p * SLOTS, p * SLOTS + SLOTS)]).not.toContain(catholic);
    // The mood reads it on the next monthly step, and Persecuted counts as two.
    w.date = { year: w.date.year, month: 2, day: 1 };
    processTurn(w, [], -1);
    while (w.date.day !== 1) processTurn(w, [], -1);
    processTurn(w, [], -1);
    expect(grievancesOf(w, p)).toContain("Persecuted");
    expect(grievanceCount(w, p)).toBeGreaterThanOrEqual(2);
    const line = faithLine(peoplesData(w), p)!;
    expect(line.rows.find((r) => r.faith === "hussite")!.pulls.some((s) => s.source === "persecution")).toBe(true);
  });

  it("shows the realm's Peoples tab: Tongue %, Faith % and a row per tongue and faith (CULT-083, RELG-117)", () => {
    const w = createWorld(rules, 1, tiles);
    const v = peoplesView(peoplesData(w), nation(w, "castile"), w.provincePopulation)!;
    expect(v.courtName).toBe("Castilian");
    expect(v.mayImpose).toBe(true);
    expect(v.tonguePercent).toBeGreaterThan(0.85);
    expect(v.tongues[0]!.relation).toBe("kin");
    expect(v.faiths[0]).toMatchObject({ faith: "catholic", policy: "established" });
    expect(v.faiths.some((f) => f.faith === "jewish" && f.policy === "tolerated")).toBe(true);
  });

  it("keeps tongues, faiths and policies in the save", () => {
    const w = createWorld(rules, 1, tiles);
    const p = capitalOf(w, "castile");
    newYear(w);
    applyNow(w, { type: "faithPolicy", faith: "jewish", policy: "restricted" }, nation(w, "castile"));
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(tonguesOf(back, p)).toEqual(tonguesOf(w, p));
    expect(faithsOf(back, p)).toEqual(faithsOf(w, p));
    expect([...back.nationFaithPending]).toEqual([...w.nationFaithPending]);
    expect(back.provinceHeldSince[p]).toBe(w.provinceHeldSince[p]);
  });
});
