import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, offerPeace, processTurn, type World } from "../src/index.ts";
import { backersOf, bondOf, makeSubject, reasonsNow, riseUp, seasonalSubjects, subjectPayments, subjectTies } from "../src/subjects.ts";
import { inheritCrown } from "../src/crowns.ts";
import { statecraftView } from "../src/statecraft.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
type Line = { kind: string; text: string };

/** Two independent realms at peace, neither the other's subject nor married. */
function freePair(w: World): [number, number] {
  const free = w.nationIds
    .map((id, n) => [id, n] as const)
    .filter(([id, n]) => !w.nationGone[n] && !dip.relations.overlord(w.diplomacy.graph, id) && !dip.warOf(w.diplomacy, id) && !subjectTies(w).some((t) => t.o === n) && !w.diplomacy.marriages.some((m) => m.a === id || m.b === id));
  return [free[0]![1], free[1]![1]];
}

describe("playing as a subject (SUBJ-131 to SUBJ-136)", () => {
  it("shows the player its own card from below, with the same badges and its choices (SUBJ-131)", () => {
    const w = createWorld(rules, 1, tiles);
    const g = nation(w, "granada");
    w.player = g;
    const over = statecraftView(w, g)!.subjects!.overlord!;
    expect(over.overlord).toBe(nation(w, "castile"));
    expect(over.reasons).toEqual(reasonsNow(w, g).map((r) => ({ label: r.label, arrow: r.arrow })));
    expect(over.below.choices.map((c) => c.id)).toEqual(["pay", "stop_paying", "ask_loosen", "seek_backer", "wait_bad_war", "marry", "rise"]);
    expect(over.below.choices.find((c) => c.id === "pay")!.locked).toBe("you pay already");
    expect(over.below.choices.find((c) => c.id === "rise")!.locked).toBe("only a Disloyal subject rises");
    expect(over.realm.provinces).toBeGreaterThan(0);
  });

  it("stops paying: nothing reaches the overlord, and loyalty steps down a season at a time (SUBJ-132)", () => {
    const w = createWorld(rules, 1, tiles);
    const g = nation(w, "granada");
    w.player = g;
    bondOf(w, g)!.loyalty = "loyal";
    expect(processTurn(w, [{ type: "subjectChoice", action: "stop_paying" }], g).rejectedOrders).toEqual([]);
    expect(subjectPayments(w).some(([a]) => a === g)).toBe(false);
    expect(reasonsNow(w, g).some((r) => r.label === "Withholds tribute" && r.arrow === -2)).toBe(true);
    w.date.month = 3;
    const news: Line[] = [];
    seasonalSubjects(w, news as never);
    expect(bondOf(w, g)!.loyalty).toBe("wavering");
    expect(news.some((x) => /You grow Wavering toward Castile/.test(x.text))).toBe(true);
    // Not twice the same way within 12 months; a year on, Disloyal.
    w.date.month = 6;
    seasonalSubjects(w, news as never);
    expect(bondOf(w, g)!.loyalty).toBe("wavering");
    w.date.year += 1;
    seasonalSubjects(w, news as never);
    expect(bondOf(w, g)!.loyalty).toBe("disloyal");
    // Paying again ends the reason.
    expect(processTurn(w, [{ type: "subjectChoice", action: "pay" }], g).rejectedOrders).toEqual([]);
    expect(bondOf(w, g)!.withholding).toBeUndefined();
  });

  it("asks politely to loosen: granted when the overlord is over its reach (SUBJ-134)", () => {
    const w = createWorld(rules, 1, tiles);
    const [o, s] = freePair(w);
    makeSubject(w, s, o, "vassal");
    w.player = s;
    // Reach 2 (very low capacity) under more than two vassals' weight: over reach.
    w.nationAdminCapacity[o] = 1;
    for (const extra of w.nationIds.map((_, n) => n).filter((n) => n !== o && n !== s && !w.nationGone[n] && !dip.relations.overlord(w.diplomacy.graph, w.nationIds[n]!)).slice(0, 3)) makeSubject(w, extra, o, "vassal");
    expect(processTurn(w, [{ type: "subjectChoice", action: "ask_loosen" }], s).rejectedOrders).toEqual([]);
    expect(bondOf(w, s)!.kind).toBe("tributary");
    expect(reasonsNow(w, s).some((r) => r.label === "Loosened")).toBe(true);
  });

  it("brings the first willing backer into the player's rising (SUBJ-133)", () => {
    const w = createWorld(rules, 1, tiles);
    const g = nation(w, "granada");
    const c = nation(w, "castile");
    w.player = g;
    bondOf(w, g)!.loyalty = "disloyal";
    const backers = backersOf(w, g, c);
    expect(processTurn(w, [{ type: "riseUp" }], g).rejectedOrders).toEqual([]);
    const war = w.diplomacy.wars.find((x) => x.declarer === "granada")!;
    expect(war).toBeTruthy();
    if (backers[0] !== undefined) expect(war.attackers).toContain(w.nationIds[backers[0]]);
  });

  it("turns the tables: a subject that outgrew its overlord makes it its own subject in the peace (SUBJ-135)", () => {
    const w = createWorld(rules, 1, tiles);
    const [o, s] = freePair(w);
    makeSubject(w, s, o, "vassal");
    bondOf(w, s)!.loyalty = "disloyal";
    w.player = s;
    const news: Line[] = [];
    expect(riseUp(w, s, news as never)).toBeNull();
    const war = w.diplomacy.wars.find((x) => x.declarer === w.nationIds[s])!;
    const d = w.diplomacy;
    const tables = () => statecraftView(w, s)!.subjects!.tables!;
    // Not outgrown: the rule says why.
    dip.country(d, w.nationIds[s]!).provinces = 1;
    dip.country(d, w.nationIds[o]!).provinces = 2;
    expect(tables().why).toMatch(/must have outgrown them/);
    // Outgrown, but too few of their voices want peace.
    dip.country(d, w.nationIds[s]!).provinces = 5;
    expect(tables().why).toMatch(/over three quarters must/);
    expect(offerPeace(w, s, o, "master", news as never)).toMatch(/over three quarters must/);
    // Every province of theirs held: their voices want peace.
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === o) w.provinceOccupier[p] = s;
    expect(tables().kind).not.toBeNull();
    expect(offerPeace(w, s, o, "master", news as never)).toBeNull();
    expect(w.diplomacy.wars).not.toContain(war);
    const b = bondOf(w, o)!;
    expect(b.overlord).toBe(w.nationIds[s]);
    expect(b.loyalty).toBe("loyal");
    expect(news.some((x) => /turns the tables/.test(x.text))).toBe(true);
  });

  it("lets a subject inherit its overlord's crown: a union runs either way (SUBJ-136)", () => {
    const w = createWorld(rules, 1, tiles);
    const [o, s] = freePair(w);
    makeSubject(w, s, o, "vassal");
    dip.marriageAgreed(w.diplomacy, w.nationIds[s]!, w.nationIds[o]!);
    const news: Line[] = [];
    inheritCrown(w, o, news as never);
    expect(bondOf(w, s)).toBeNull();
    const b = bondOf(w, o)!;
    expect(b.kind).toBe("union");
    expect(b.overlord).toBe(w.nationIds[s]);
  });
});
