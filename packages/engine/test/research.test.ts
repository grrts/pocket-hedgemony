import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createEngineHost, createWorld, processTurn, type Order, type World } from "../src/index.ts";
import { armUnlocked, knows, schoolsOf, SCHOOL_GOLD, SCHOOL_MONTHS } from "../src/research.ts";
import * as rs from "../src/domain/research/index.ts";
import { LEDGER, LEDGER_LINES } from "../src/treasury.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { packChunk, unpackChunk } from "../src/domain/saves/format.ts";
import { hashWorld } from "../src/hash.ts";

const rules = loadDefaultRuleset();
const refused = (w: World, order: Order, n: number) => applyNow(w, order, n).rejectedOrders[0]?.reason;
const ok = (w: World, order: Order, n: number) => expect(refused(w, order, n)).toBeUndefined();

function setup(id = "france") {
  const w = createWorld(rules, 1);
  const me = w.nationIndex.get(id)!;
  w.player = me;
  return { w, me, p: w.research[me]! };
}

/** Plays weekly turns until a new month has begun; returns the news of those turns. */
function untilNewMonth(w: World, n: number) {
  const news = [];
  const month = w.date.month;
  while (w.date.month === month) news.push(...processTurn(w, [], n).news);
  return news;
}

describe("research", () => {
  it("starts each realm with what it knew in 1444, a school in its capital, students and scholars", () => {
    const { w, me, p } = setup();
    expect(knows(w, me, "L1")).toBe(true);
    expect(knows(w, me, "F1")).toBe(true);
    expect(knows(w, me, "L5")).toBe(false);
    const schools = schoolsOf(w, me);
    expect(schools).toHaveLength(1);
    expect(schools[0]!.province).toBe(w.provinceIndex.get(rules.nations[me]!.capital));
    expect(schools[0]!.type).toBe("temple_or_monastery_school");
    expect(rs.students(p)).toBe(10);
    expect(p.scholars).toBeGreaterThan(0);
    // Ming knows printing (RSCH-076's extra list).
    expect(knows(w, w.nationIndex.get("ming")!, "L5")).toBe(true);
    // No realm starts unable to learn.
    for (const prog of w.research) expect(prog.schools.filter((s) => s.open).length).toBeGreaterThan(0);
  });

  it("moves the study a twelfth of the year's scholar-years each month", () => {
    const { w, me, p } = setup();
    ok(w, { type: "setStudy", invention: "L5" }, me);
    expect(p.studies.map((s) => s.id)).toEqual(["L5"]);
    const perMonth = rs.researchPerYear(p.scholars, rs.students(p)) / 12;
    untilNewMonth(w, me);
    expect(p.studies[0]!.progress).toBeCloseTo(perMonth * (1 + rs.researchBonusPct(p, "L5") / 100), 5);
    // What isn't eligible is refused.
    expect(refused(w, { type: "setStudy", invention: "L6" }, me)).toMatch(/first know/);
    expect(refused(w, { type: "setStudy", invention: "F9" }, me)).toBeDefined();
  });

  it("learns an invention when progress reaches its cost, and tells the player to choose the next", () => {
    const { w, me, p } = setup();
    ok(w, { type: "setStudy", invention: "L5" }, me);
    p.studies[0]!.progress = 1000;
    const news = untilNewMonth(w, me);
    expect(knows(w, me, "L5")).toBe(true);
    expect(p.studies).toEqual([]);
    expect(news.some((x) => x.kind === "invention" && /Learned printing/.test(x.text))).toBe(true);
  });

  it("takes students from the recruit pools and gives them back when called to arms", () => {
    const { w, me, p } = setup();
    const levies = w.nationLevies[me]!;
    ok(w, { type: "setSeats", n: 20 }, me);
    expect(rs.students(p)).toBe(20);
    expect(w.nationLevies[me]).toBeCloseTo(levies - 10, 0);
    ok(w, { type: "setSeats", n: 15 }, me);
    expect(rs.students(p)).toBe(15);
    ok(w, { type: "callStudentsToArms" }, me);
    expect(rs.students(p)).toBe(0);
    expect(p.stopped).toBe(true);
    expect(w.nationLevies[me]!).toBeGreaterThan(levies - 1);
    expect(refused(w, { type: "callStudentsToArms" }, me)).toMatch(/no students/);
  });

  it("lets every AI realm pick the study that costs it least", () => {
    const { w, me } = setup();
    untilNewMonth(w, me);
    for (let n = 0; n < w.nationCount; n++) {
      if (n === me) continue;
      expect(w.research[n]!.studies.length).toBe(1);
    }
    const eng = w.nationIndex.get("england")!;
    const chosen = w.research[eng]!.studies[0]!.id;
    expect(rs.invention(chosen).era).toBe("I");
    // The AI fills every empty seat at peace.
    expect(rs.emptySeats(w.research[eng]!)).toBe(0);
  });

  it("founds a school in a town for the temple school's gold; it opens after its months", () => {
    const { w, me, p } = setup();
    const town = Array.from({ length: w.provinceCount }, (_, q) => q).find((q) => w.provinceOwner[q] === me && w.provincePopulation[q]! >= 25 && q !== w.provinceIndex.get(rules.nations[me]!.capital))!;
    const village = Array.from({ length: w.provinceCount }, (_, q) => q).find((q) => w.provinceOwner[q] === me && !w.provinceWater[q] && w.provincePopulation[q]! < 25);
    if (village !== undefined) expect(refused(w, { type: "foundSchool", province: village }, me)).toMatch(/towns/);
    w.nationTreasury[me] = SCHOOL_GOLD + 5;
    ok(w, { type: "foundSchool", province: town }, me);
    expect(w.nationTreasury[me]).toBeCloseTo(5);
    expect(refused(w, { type: "foundSchool", province: town }, me)).toBeDefined();
    for (let m = 0; m < SCHOOL_MONTHS; m++) untilNewMonth(w, me);
    expect(p.schools.map((s) => s.province)).toContain(w.provinceIds[town]);
    // The schools' upkeep is the ledger's last line.
    expect(w.nationLedger[me * LEDGER_LINES + LEDGER.indexOf("schools")]).toBeCloseTo(-rs.schoolUpkeep(p) / 12);
  });

  it("puts inventions to work: harvest steps and the arms a realm may train", () => {
    const { w, me } = setup();
    expect(w.researchHarvest[me]).toBe(1); // F1 Three-field rotation
    expect(armUnlocked(w, me, "armoured foot")).toBe(true);
    expect(armUnlocked(w, me, "knights and lancers")).toBe(true); // W2
    expect(armUnlocked(w, me, "pikes")).toBe(false); // W6 Pike squares: Swiss and Scots
    expect(armUnlocked(w, w.nationIndex.get("scotland")!, "pikes")).toBe(true);
  });

  it("keeps research through a save, in the world hash; an old save without it keeps the 1444 start", () => {
    const { w, me, p } = setup();
    ok(w, { type: "setStudy", invention: "L5" }, me);
    untilNewMonth(w, me);
    ok(w, { type: "setSeats", n: 18 }, me);
    const before = hashWorld(w);
    const chunks = worldChunks(w, { playerNation: "france", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules).world;
    expect(hashWorld(back)).toBe(before);
    expect(back.research[me]!.studies).toEqual(p.studies);
    expect(back.researchSeats[me]).toBe(18);
    expect([...back.research[me]!.known].sort()).toEqual([...p.known].sort());
    // Research counts in the hash.
    back.research[me]!.studies[0]!.progress += 1;
    expect(hashWorld(back)).not.toBe(before);
    // A save from before research.
    const old = chunks.map((c) => {
      if (c.id !== "nations") return c;
      const body = unpackChunk(c);
      delete body.meta.research;
      return packChunk(c.id, c.version, body);
    });
    const restored = restoreWorld(new Map(old.map((c) => [c.id, c])), rules).world;
    expect(restored.research[me]!.studies).toEqual([]);
    expect(knows(restored, me, "L1")).toBe(true);
  });

  it("sends the Research tab and every realm's research in the snapshot", () => {
    const host = createEngineHost(() => rules);
    const reply = host({ id: 1, type: "newGame", seed: 1, playerNation: "france" });
    if (reply.response.type !== "snapshot") throw new Error(reply.response.type === "error" ? reply.response.message : "no snapshot");
    const s = reply.response.snapshot;
    expect(s.research!.study).toBeNull();
    expect(s.research!.options.length).toBeGreaterThan(5);
    expect(s.research!.options.every((o) => o.cost > 0 && o.months !== null)).toBe(true);
    expect(s.research!.known.some((k) => k.id === "L1")).toBe(true);
    expect(s.research!.arms).not.toContain("pikes");
    expect(s.realmResearch).toHaveLength(rules.nations.length);
  });
});
