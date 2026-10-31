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
    // A sleeping realm founds its school once it wakes (SETUP-083).
    for (const prog of w.research.filter((_, n) => !w.nationAsleep[n])) expect(prog.schools.filter((s) => s.open).length).toBeGreaterThan(0);
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

  it("carries on with the study queue without asking, and queues the path to a far invention (RSCH-108, RSCH-109)", () => {
    const { w, me, p } = setup();
    ok(w, { type: "setStudy", invention: "L5" }, me);
    ok(w, { type: "queueStudy", invention: "B4" }, me);
    expect(p.queue).toEqual(["B4"]);
    p.studies[0]!.progress = 1000;
    const news = untilNewMonth(w, me);
    expect(knows(w, me, "L5")).toBe(true);
    expect(p.studies.map((s) => s.id)).toEqual(["B4"]);
    expect(news.some((x) => x.kind === "invention" && /Choose/.test(x.text))).toBe(false);
    // Kongo knows iron but neither steel nor horses: the path to heavy cavalry queues both first.
    const k = setup("kongo");
    ok(k.w, { type: "queuePath", invention: "W2" }, k.me);
    expect([...k.p.studies.map((s) => s.id), ...k.p.queue]).toEqual(["C02", "F03", "W2"]);
    // Heavy cavalry can't move ahead of the horses it needs.
    expect(refused(k.w, { type: "moveQueuedStudy", invention: "W2", by: -1 }, k.me)).toMatch(/before what it needs/);
    ok(k.w, { type: "unqueueStudy", invention: "F03" }, k.me);
    expect(k.p.queue).toEqual([]);
  });

  it("starts the Americas without horses until first contact, and every realm from its start group (RSCH-096, RSCH-098)", () => {
    const { w } = setup();
    const aztecs = w.nationIndex.get("aztecs")!;
    expect(knows(w, aztecs, "F03")).toBe(false);
    expect(rs.eligibility(w.research[aztecs]!, "F03", { year: 1444 })).toEqual({ ok: false, reason: "contact" });
    expect(armUnlocked(w, aztecs, "light horse")).toBe(false);
    expect(armUnlocked(w, w.nationIndex.get("france")!, "light horse")).toBe(true);
    // A sleeping realm takes its start group when it wakes (SETUP-083).
    w.research.forEach((p, n) => !w.nationAsleep[n] && expect(p.group).toBeDefined());
  });

  it("takes each student's cost from the recruit pools and gives back only the students when called to arms", () => {
    const { w, me, p } = setup();
    const levies = w.nationLevies[me]!;
    ok(w, { type: "setSeats", n: 20 }, me);
    expect(rs.students(p)).toBe(20);
    const k = rs.recruitsPerStudent();
    // 10 more students at k recruits each (RSCH-020).
    expect(w.nationLevies[me]).toBeCloseTo(levies - 10 * k, 0);
    ok(w, { type: "setSeats", n: 15 }, me);
    expect(rs.students(p)).toBe(15);
    ok(w, { type: "callStudentsToArms" }, me);
    expect(rs.students(p)).toBe(0);
    expect(p.stopped).toBe(true);
    // 5 sent home and 15 called come back one man each; the rest of the cost is spent (RSCH-022).
    expect(w.nationLevies[me]!).toBeCloseTo(levies - 10 * k + 20, 0);
    expect(refused(w, { type: "callStudentsToArms" }, me)).toMatch(/no students/);
  });

  it("lets every AI realm pick the study that costs it least", () => {
    const { w, me } = setup();
    untilNewMonth(w, me);
    for (let n = 0; n < w.nationCount; n++) {
      if (n === me || w.nationAsleep[n]) continue;
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

describe("Era I from the start, and a 1378 start (RSCH-113 to RSCH-115)", () => {
  const start1378 = { year: 1378, month: 9, day: 20 };

  it("dates Era I from 1378 to 1500 and Medieval to 1377, with nothing renumbered", () => {
    expect(rs.researchConfig.era_dates.M).toBe(600);
    expect(rs.researchConfig.era_dates.I).toBe(1378);
    expect(rs.eraOf(start1378)).toBe("I");
    expect(rs.eraOf({ year: 1444, month: 11, day: 11 })).toBe("I");
    expect(rs.eraOf({ year: 1500 })).toBe("II");
    expect(rs.TREE_ERAS).toEqual(["A", "M", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"]);
    // A Medieval invention is one era behind at either start.
    expect(rs.behindDiscountPct("M", start1378)).toBe(rs.behindDiscountPct("M", { year: 1444 }));
  });

  it("paces Era I to the start: x1 from 1444, about x2.18 from 1378, other eras unchanged", () => {
    expect(rs.eraPace("I", 1444)).toBe(1);
    expect(rs.eraPace("I")).toBe(1);
    expect(rs.eraPace("I", 1378)).toBeCloseTo(122 / 56);
    expect(rs.eraPace("II", 1378)).toBe(1);
    expect(rs.eraPace("M", 1378)).toBe(1);
    const p1444 = rs.startingProgramme("france", rs.tree(), { year: 1444, month: 11, day: 11 });
    const p1378 = rs.startingProgramme("france", rs.tree(), start1378);
    expect(rs.studyCostFor(p1444, "L5", { year: 1450 })).toBe(20);
    expect(rs.studyCostFor(rs.startingProgramme("france"), "L5", { year: 1450 })).toBe(20);
    expect(rs.studyCostFor(p1378, "L5", { year: 1400 })).toBeCloseTo((20 * 122) / 56);
    expect(rs.studyCostFor(p1378, "B5", { year: 1400 })).toBe(80);
    expect(rs.studyCostFor(p1378, "F02", { year: 1400 })).toBe(rs.studyCostFor(p1444, "F02", { year: 1450 }));
  });

  it("leaves a 1444 start exactly as the start groups give it", () => {
    const start = { year: 1444, month: 11, day: 11 };
    expect(rs.startBlockFor(start)).toBeUndefined();
    for (const n of rules.nations) {
      const p = rs.startingProgramme(n.id, rs.tree(), start);
      expect([...p.known].sort(), n.id).toEqual([...rs.startingKnowledgeFor(n.id)].sort());
      expect(p.group).toBe(rs.startGroupOf(n.id));
    }
    const { w, me, p } = setup();
    expect(p.startYear).toBe(1444);
    expect(rs.studyCostFor(p, "L5", w.date)).toBe(20);
    expect(knows(w, w.nationIndex.get("ottomans")!, "W3")).toBe(true);
    expect(knows(w, me, "L1")).toBe(true);
  });

  it("gives the 1378 sets: removals, additions and the realms of 1378 in their groups", () => {
    const k = (id: string) => rs.startingKnowledgeFor(id, rs.tree(), start1378);
    expect(k("ottomans").has("W3")).toBe(false);
    expect(k("ottomans").has("W5")).toBe(false);
    expect(k("ottomans").has("G3")).toBe(false);
    expect(k("france").has("W3")).toBe(true);
    expect(k("ming").has("W5")).toBe(true);
    expect(k("ming").has("G3")).toBe(false);
    expect(k("venice").has("G3")).toBe(true);
    expect(k("bohemia").has("W4")).toBe(false);
    expect(k("portugal").has("S4")).toBe(false);
    expect(k("genoa").has("S4")).toBe(true);
    expect(k("timurids").has("L3")).toBe(false);
    expect(k("jalayirids").has("L3")).toBe(true);
    expect(k("korea").has("L4")).toBe(true);
    expect(rs.startGroupOf("timurids", start1378)).toBe("khanates");
    expect(rs.startGroupOf("timurids")).toBe("islamic");
    expect(rs.startGroupOf("white_horde", start1378)).toBe("hordes");
    expect(rs.startGroupOf("white_horde")).toBeUndefined();
    expect(rs.startGroupOf("great_horde", start1378)).toBe("hordes");
    expect(rs.startGroupOf("lithuania", start1378)).toBe("latin");
    expect(rs.startGroupOf("tepanecs", start1378)).toBe("mesoamerica");
    // Every set the block gives is complete (RSCH-099), the realms not yet on the map included.
    const block = rs.startBlockFor(start1378)!;
    const ids = new Set([...rules.nations.map((n) => n.id), ...Object.keys(block.join), ...Object.keys(block.add), ...Object.keys(block.remove)]);
    for (const id of ids) expect(rs.startSetGaps(k(id)), id).toEqual([]);
    // Standing (RSCH-097): as in 1444, but Timur's realm stands with the khanates.
    expect(rs.eraName(rs.standing(k("ottomans")))).toBe("Era I");
    expect(rs.eraName(rs.standing(k("timurids")))).toBe("Medieval");
    expect(rs.eraName(rs.standing(k("jalayirids")))).toBe("Era I");
  });

  it("seeds a world that starts in 1378 with the 1378 sets and the Era I pace", () => {
    const early = { ...rules, defines: { ...rules.defines, startDate: { ...rules.defines.startDate, ...start1378 } } };
    const w = createWorld(early, 1);
    const france = w.nationIndex.get("france")!;
    const ottomans = w.nationIndex.get("ottomans")!;
    expect(w.research[france]!.startYear).toBe(1378);
    expect(knows(w, ottomans, "W3")).toBe(false);
    expect(knows(w, france, "W3")).toBe(true);
    expect(rs.studyCostFor(w.research[france]!, "L5", w.date)).toBeCloseTo((20 * 122) / 56);
    // The pace survives a save.
    const chunks = worldChunks(w, { playerNation: "france", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), early).world;
    expect(back.research[france]!.startYear).toBe(1378);
  });
});
