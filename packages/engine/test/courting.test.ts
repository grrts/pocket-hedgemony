import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { aiCourting, courtingsOf, monthlyCourting, whyNotCourt } from "../src/courting.ts";
import { bondOf, reasonsNow } from "../src/subjects.ts";
import { statecraftView } from "../src/statecraft.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;

/** A lord of realm t whose land borders realm n, or -1. */
function borderLord(w: World, t: number, n: number): number {
  for (let p = 0; p < w.provinceCount; p++) {
    const k = w.provinceLord[p]!;
    if (w.provinceOwner[p] !== t || k < 0) continue;
    for (let j = w.adjStart[p]!; j < w.adjStart[p + 1]!; j++) if (w.provinceOwner[w.adjList[j]!] === n) return k;
  }
  return -1;
}

/** Two bordering realms at peace, the second with a lord on the border. */
function neighbours(w: World): [number, number, number] {
  for (let a = 0; a < w.nationCount; a++) {
    for (let b = 0; b < w.nationCount; b++) {
      if (a === b || w.nationGone[a] || w.nationGone[b]) continue;
      const ia = w.nationIds[a]!, ib = w.nationIds[b]!;
      if (dip.relations.has(w.diplomacy.graph, "at_war", ia, ib) || dip.relations.overlord(w.diplomacy.graph, ia) === ib || dip.relations.overlord(w.diplomacy.graph, ib) === ia) continue;
      const k = borderLord(w, b, a);
      if (k >= 0) return [a, b, k];
    }
  }
  throw new Error("no neighbours");
}

/** Never found out: the diplomacy draws pinned high for this test. */
const hidden = (w: World) => void (w.diplomacy.rng = [0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);

describe("courting (milestone 5)", () => {
  it("courts only a Wavering or Disloyal lord, with a free seat (DIPL-215)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, k] = neighbours(w);
    w.player = a;
    w.lords[k]!.loyalty = "Loyal";
    expect(whyNotCourt(w, a, b, k)).toMatch(/only a Wavering or Disloyal lord/);
    w.lords[k]!.loyalty = "Wavering";
    expect(whyNotCourt(w, a, b, k)).toBeNull();
    expect(processTurn(w, [{ type: "court", target: b, lord: k }], a).rejectedOrders).toEqual([]);
    expect(whyNotCourt(w, a, b, k)).toBe("your envoy is there already");
    const v = statecraftView(w, a)!;
    expect(v.courting!.mine).toEqual([expect.objectContaining({ target: b, lord: k })]);
    expect(v.free).toBe(v.seats - 1);
    processTurn(w, [{ type: "court", target: b, lord: k, recall: true }], a);
    expect(courtingsOf(w)).toEqual([]);
  });

  it("drops a courted lord a step each season and has him defect after a year (DIPL-216)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, k] = neighbours(w);
    w.lords[k]!.loyalty = "Wavering";
    expect(processTurn(w, [{ type: "court", target: b, lord: k }], a).rejectedOrders).toEqual([]);
    const land: number[] = [];
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceLord[p] === k) land.push(p);
    hidden(w);
    w.date.month = 3;
    monthlyCourting(w, []);
    expect(w.lords[k]!.loyalty).toBe("Disloyal");
    w.date.year += 2;
    hidden(w);
    monthlyCourting(w, []);
    expect(w.lords[k]!.nation).toBe(a);
    expect(w.lords[k]!.loyalty).toBe("Wavering");
    for (const p of land) {
      expect(w.provinceOwner[p]).toBe(a);
      expect(w.provinceLord[p]).toBe(k);
    }
    expect(courtingsOf(w)).toEqual([]);
  });

  it("sends a found-out envoy home with the wrong Courted our lord (DIPL-217)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, k] = neighbours(w);
    w.player = a;
    w.lords[k]!.loyalty = "Wavering";
    processTurn(w, [{ type: "court", target: b, lord: k }], a);
    w.diplomacy.rng = [0, 0, 0, 1];
    w.date.month = 3;
    const news: { text: string }[] = [];
    for (let i = 0; i < 20 && courtingsOf(w).length; i++) monthlyCourting(w, news as never);
    expect(courtingsOf(w)).toEqual([]);
    expect(news.some((x) => /found out your envoy/.test(x.text))).toBe(true);
    expect(w.diplomacy.ledgers[dip.key(w.nationIds[b]!, w.nationIds[a]!)]!.some((e) => e.key === "courted_our_lord")).toBe(true);
  });

  it("counts Courted on a courted subject, and names the courter to an overlord with a resident (DIPL-218)", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = nation(w, "castile");
    const granada = nation(w, "granada");
    const other = w.nationIds.findIndex((id, n) => n !== castile && n !== granada && !w.nationGone[n] && !dip.relations.overlord(w.diplomacy.graph, id) && !dip.relations.has(w.diplomacy.graph, "at_war", id, "granada"));
    expect(whyNotCourt(w, castile, granada)).toBe("they are your own subject");
    expect(processTurn(w, [{ type: "court", target: granada }], other).rejectedOrders).toEqual([]);
    expect(reasonsNow(w, granada).some((r) => r.label === "Courted")).toBe(true);
    const row = () => statecraftView(w, castile)!.subjects!.subjects.find((x) => x.subject === granada)!;
    expect(row().courtedBy).toEqual([]);
    processTurn(w, [{ type: "subjectAction", subject: granada, action: "resident" }], castile);
    expect(row().courtedBy).toEqual([other]);
  });

  it("has an AI realm court a Wavering lord of a rival neighbour (DIPL-219)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, k] = neighbours(w);
    w.player = -1;
    w.lords[k]!.loyalty = "Wavering";
    dip.relations.setStance(w.diplomacy.graph, w.nationIds[a]!, w.nationIds[b]!, "rival");
    if (!dip.borders(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!)) dip.setBorder(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!);
    w.date.month = 3;
    aiCourting(w, (s) => bondOf(w, s)?.loyalty ?? null);
    expect(courtingsOf(w).some((c) => c.by === w.nationIds[a] && c.target === w.nationIds[b])).toBe(true);
  });
});
