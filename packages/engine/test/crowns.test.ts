import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { bondOf, makeSubject, subjectTies, whyNotSubjectAction, aiOverlordEnvoys } from "../src/subjects.ts";
import { houseView, inheritCrown, yearlyCrowns } from "../src/crowns.ts";
import { statecraftView } from "../src/statecraft.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
/** Two independent realms at peace, neither the other's subject. */
function freePair(w: World): [number, number] {
  const free = w.nationIds.map((id, n) => [id, n] as const).filter(([id, n]) => !w.nationGone[n] && !dip.relations.overlord(w.diplomacy.graph, id) && !dip.warOf(w.diplomacy, id) && !subjectTies(w).some((t) => t.o === n) && !w.diplomacy.marriages.some((m) => m.a === id || m.b === id));
  return [free[0]![1], free[1]![1]];
}

describe("personal unions (milestone 5)", () => {
  it("passes a crown with no heir to the house married most often into it, as a Union (SUBJ-127)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = freePair(w);
    const [c] = freePair(w).filter((x) => x !== a && x !== b).concat(w.nationIds.map((_, n) => n).filter((n) => n !== a && n !== b && !w.nationGone[n] && !dip.relations.overlord(w.diplomacy.graph, w.nationIds[n]!) && !dip.warOf(w.diplomacy, w.nationIds[n]!)));
    const id = (n: number) => w.nationIds[n]!;
    dip.marriageAgreed(w.diplomacy, id(c!), id(a));
    dip.marriageAgreed(w.diplomacy, id(b), id(a));
    dip.marriageAgreed(w.diplomacy, id(a), id(b));
    w.player = b;
    const news: { kind: string; text: string }[] = [];
    inheritCrown(w, a, news as never);
    const bond = bondOf(w, a)!;
    expect(bond.kind).toBe("union");
    expect(bond.overlord).toBe(id(b));
    expect(bond.loyalty).toBe("loyal");
    expect(news.some((x) => /passes to your ruler/.test(x.text))).toBe(true);
    // The Union shows on the player's subjects list, with Merge the crowns locked by its years.
    const row = statecraftView(w, b)!.subjects!.subjects.find((x) => x.subject === a)!;
    expect(row.kindName).toBe("Union");
    expect(row.why.merge).toMatch(/^0 of the 50 years in union needed$/);
    expect(row.why.fold_in).toMatch(/merging the crowns/);
  });

  it("leaves an unmarried crown alone, and waits for peace (SUBJ-127)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = freePair(w);
    inheritCrown(w, a, []);
    expect(bondOf(w, a)).toBeNull();
    dip.marriageAgreed(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!);
    dip.relations.newRecord(w.diplomacy.graph, "at_war", w.nationIds[b]!, w.nationIds[(b + 1) % w.nationCount]!, "mutual");
    w.diplomacy.wars.push({ id: "w-test", declarer: w.nationIds[b]!, target: w.nationIds[(b + 1) % w.nationCount]!, attackers: [w.nationIds[b]!], defenders: [w.nationIds[(b + 1) % w.nationCount]!], start: "1444-11" } as never);
    inheritCrown(w, a, []);
    expect(bondOf(w, a)).toBeNull();
  });

  it("gives married houses claims that lapse after 20 years, shown under Your house (SUBJ-126, SUBJ-130)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = freePair(w);
    w.player = b;
    for (let i = 0; i < 40; i++) dip.marriageAgreed(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!);
    // Forty marriages at 1 in 10 each: a claim is all but certain once the ruler dies without a son.
    const before = w.diplomacy.pretenders.length;
    dip.rulerDiesWithoutDirectHeir(w.diplomacy, w.nationIds[a]!);
    expect(w.diplomacy.pretenders.length).toBeGreaterThan(before);
    for (const p of w.diplomacy.pretenders.slice(before)) (p as { until?: number }).until = w.date.year * 12 + 20 * 12;
    const house = houseView(w, b)!;
    expect(house.married).toEqual([a]);
    expect(house.claims.some((c) => c.throne === a && c.until?.startsWith(String(w.date.year + 20)))).toBe(true);
    w.date.year += 21;
    w.date.month = 1;
    yearlyCrowns(w, []);
    expect(houseView(w, b)!.claims.some((c) => c.throne === a)).toBe(false);
  });

  it("merges a Union 50 years in union and Loyal: its land joins, its lords keep their loyalty (SUBJ-129)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "denmark");
    const sw = nation(w, "sweden");
    w.player = me;
    const b = bondOf(w, sw)!;
    expect(b.kind).toBe("union");
    expect(whyNotSubjectAction(w, me, sw, "merge")).toMatch(/years in union needed/);
    b.since -= 50 * 12;
    b.loyalty = "wavering";
    expect(whyNotSubjectAction(w, me, sw, "merge")).toMatch(/they are Wavering/);
    b.loyalty = "loyal";
    expect(whyNotSubjectAction(w, me, sw, "merge")).toBeNull();
    const land: number[] = [];
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === sw) land.push(p);
    const lords = new Map(land.filter((p) => w.provinceLord[p]! >= 0).map((p) => [w.provinceLord[p]!, w.lords[w.provinceLord[p]!]!.loyalty]));
    expect(processTurn(w, [{ type: "subjectAction", subject: sw, action: "merge" }], me).rejectedOrders).toEqual([]);
    expect(w.nationGone[sw]).toBe(1);
    for (const p of land) expect(w.provinceOwner[p]).toBe(me);
    for (const [l, loyalty] of lords) {
      expect(w.lords[l]!.nation).toBe(me);
      expect(w.lords[l]!.loyalty).toBe(loyalty);
    }
  });

  it("has a Loyal Union's or Vassal's overlord take an heirless crown at once (SUBJ-128)", () => {
    const w = createWorld(rules, 1, tiles);
    const dk = nation(w, "denmark");
    const no = nation(w, "norway");
    bondOf(w, no)!.loyalty = "loyal";
    inheritCrown(w, no, []);
    expect(w.nationGone[no]).toBe(1);
    const sw = nation(w, "sweden");
    expect(bondOf(w, sw)!.loyalty).toBe("wavering");
    inheritCrown(w, sw, []);
    expect(w.nationGone[sw]).toBe(0);
    expect(bondOf(w, sw)!.overlord).toBe(w.nationIds[dk]);
  });

  it("has AI overlords that like centralising merge a ready Union (SUBJ-129)", () => {
    const w = createWorld(rules, 1, tiles);
    const [a] = freePair(w);
    const o = w.nationIds.findIndex((_, n) => (n * 7) % 3 === 0 && n !== a && !w.nationGone[n] && !dip.relations.overlord(w.diplomacy.graph, w.nationIds[n]!));
    makeSubject(w, a, o, "union");
    const b = bondOf(w, a)!;
    b.since -= 51 * 12;
    w.player = -1;
    w.date.month = 3;
    aiOverlordEnvoys(w, []);
    expect(w.nationGone[a]).toBe(1);
  });

  it("keeps claims through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = freePair(w);
    w.diplomacy.pretenders.push({ name: "Claimant", throne: w.nationIds[a]!, court: w.nationIds[b]!, claims: [], until: 99999 } as dip.Pretender);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: w.nationIds[b]!, options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(houseView(back, b)!.claims).toEqual([{ throne: a, until: houseView(w, b)!.claims[0]!.until }]);
  });
});
