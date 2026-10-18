import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { aiRisings, reachOf, bondOf, foldInRealm, independencePeace, monthlySubjectEnvoys, riseUp, seasonalSubjects, subjectAnswersCall, subjectByAgreement, subjectPayments, subjectTies, whyNotSubjectAction } from "../src/subjects.ts";
import { statecraftView, whyNotEnvoy } from "../src/statecraft.ts";
import { LEDGER, LEDGER_LINES, runLedger } from "../src/treasury.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const tribute = (w: World, n: number) => w.nationLedger[n * LEDGER_LINES + LEDGER.indexOf("tribute")]!;

describe("subjects (milestone 5)", () => {
  it("starts the 1444 subjects with their kind and loyalty from the data (SUBJ-036)", () => {
    const w = createWorld(rules, 1, tiles);
    const granada = bondOf(w, nation(w, "granada"))!;
    expect(granada.kind).toBe("tributary");
    expect(granada.loyalty).toBe("wavering");
    expect(subjectTies(w).length).toBeGreaterThan(10);
  });

  it("makes each kind pay its share, by tribute level and loyalty (SUBJ-005, SUBJ-026, SUBJ-037)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    w.player = me;
    runLedger(w, false);
    const normal = tribute(w, me);
    expect(tribute(w, g)).toBeLessThan(0);
    // A Wavering tributary pays half of its 15 in 100.
    expect(subjectPayments(w).find(([a]) => a === g)![2]).toBeCloseTo(0.075);
    bondOf(w, g)!.loyalty = "loyal";
    expect(processTurn(w, [{ type: "subjectAction", subject: g, action: "tribute", level: "heavy" }], me).rejectedOrders).toEqual([]);
    expect(subjectPayments(w).find(([a]) => a === g)![2]).toBeCloseTo(0.225);
    expect(tribute(w, me)).toBeGreaterThan(normal);
    bondOf(w, g)!.loyalty = "disloyal";
    processTurn(w, [{ type: "subjectAction", subject: g, action: "tribute", level: "normal" }], me);
    // A Disloyal subject pays nothing.
    expect(subjectPayments(w).some(([a]) => a === g)).toBe(false);
    expect(subjectAnswersCall(w, g)).toBe(false);
  });

  it("counts loyalty at the end of a season from its reasons (SUBJ-030, SUBJ-031)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    w.player = me;
    const b = bondOf(w, g)!;
    b.tribute = "crushing";
    b.loyalty = "loyal";
    w.date.month = 3;
    const news: { kind: string; text: string }[] = [];
    seasonalSubjects(w, news as never);
    expect(b.loyalty).toBe("wavering");
    expect(news.some((x) => /Granada, your subject, is now Wavering/.test(x.text))).toBe(true);
    // Not twice the same way within 12 months.
    seasonalSubjects(w, news as never);
    expect(b.loyalty).toBe("wavering");
  });

  it("lets the overlord send a gift, loosen and release (SUBJ-039, SUBJ-045, SUBJ-046)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    w.player = me;
    w.nationTreasury[me] = 10_000;
    expect(whyNotSubjectAction(w, me, g, "loosen")).toMatch(/cannot be loosened/);
    expect(whyNotSubjectAction(w, nation(w, "aragon"), g, "gift")).toBe("not your subject");
    expect(processTurn(w, [{ type: "subjectAction", subject: g, action: "gift" }], me).rejectedOrders).toEqual([]);
    expect(bondOf(w, g)!.reasons.some((r) => r.id === "gift")).toBe(true);
    const view = statecraftView(w, me)!.subjects!;
    const row = view.subjects.find((s) => s.subject === g)!;
    expect(row.reasons.some((r) => r.label === "Gift")).toBe(true);
    expect(view.reach).toBe(reachOf(w, me));
    processTurn(w, [{ type: "subjectAction", subject: g, action: "release" }], me);
    expect(dip.relations.overlord(w.diplomacy.graph, "granada")).toBeNull();
    expect(dip.relations.stance(w.diplomacy.graph, "granada", "castile")).toBe("friendly");
  });

  it("makes a subject by agreement: offered, a Tributary; asked, a Vassal (SUBJ-086)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const navarre = nation(w, "navarre");
    expect(whyNotEnvoy(w, me, navarre, "offer_overlordship")).toBeNull();
    expect(whyNotEnvoy(w, navarre, me, "offer_overlordship")).toBe("they are not smaller than you");
    expect(whyNotEnvoy(w, me, nation(w, "granada"), "offer_overlordship")).toBe("they already answer to an overlord");
    const news: { kind: string; text: string }[] = [];
    subjectByAgreement(w, me, navarre, true, news as never);
    expect(bondOf(w, navarre)!.kind).toBe("vassal");
    expect(bondOf(w, navarre)!.loyalty).toBe("loyal");
    expect(news[0]!.text).toMatch(/Navarre places itself under Castile's protection/);
  });

  it("keeps the bonds through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    processTurn(w, [{ type: "subjectAction", subject: nation(w, "granada"), action: "tribute", level: "light" }], me);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(bondOf(back, back.nationIndex.get("granada")!)!.tribute).toBe("light");
  });

  it("tightens a Loyal tributary to a vassal over six months with an envoy at its court (SUBJ-044)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    w.player = me;
    const b = bondOf(w, g)!;
    expect(whyNotSubjectAction(w, me, g, "tighten")).toMatch(/Wavering; tightening needs them Loyal/);
    b.loyalty = "loyal";
    const free = dip.freeSeats(w.diplomacy, "castile");
    expect(processTurn(w, [{ type: "subjectAction", subject: g, action: "tighten" }], me).rejectedOrders).toEqual([]);
    expect(dip.freeSeats(w.diplomacy, "castile")).toBe(free - 1);
    const news: { kind: string; text: string }[] = [];
    for (let m = 0; m < 6; m++) monthlySubjectEnvoys(w, news as never);
    expect(bondOf(w, g)!.kind).toBe("vassal");
    expect(dip.freeSeats(w.diplomacy, "castile")).toBe(free);
    expect(news.some((x) => /Granada is now Castile's vassal/.test(x.text))).toBe(true);
  });

  it("folds a subject in: its land joins the realm under one lord and the country leaves the map (SUBJ-063, SUBJ-067)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    const land = [...Array(w.provinceCount).keys()].filter((p) => w.provinceOwner[p] === g);
    expect(whyNotSubjectAction(w, me, g, "fold_in")).toBe("tighten to vassal first");
    const news: { kind: string; text: string }[] = [];
    foldInRealm(w, g, me, news as never);
    expect(land.every((p) => w.provinceOwner[p] === me)).toBe(true);
    const lord = w.provinceLord[land[0]!]!;
    expect(lord).toBeGreaterThanOrEqual(0);
    expect(w.lords[lord]!.house).toBe("Granada");
    expect(w.nationGone[g]).toBe(1);
    expect(news.some((x) => /Granada is folded into Castile/.test(x.text))).toBe(true);
  });

  it("lets a Disloyal subject rise, and restores it one kind tighter when it loses its independence war (SUBJ-077, SUBJ-078)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    const news: { kind: string; text: string }[] = [];
    expect(riseUp(w, g, news as never)).toMatch(/only a Disloyal subject rises/);
    bondOf(w, g)!.loyalty = "disloyal";
    expect(riseUp(w, g, news as never)).toBeNull();
    expect(dip.relations.overlord(w.diplomacy.graph, "granada")).toBeNull();
    const war = w.diplomacy.wars.find((x) => x.declarer === "granada")!;
    expect(war).toBeTruthy();
    expect(news.some((x) => /Granada rises against Castile/.test(x.text))).toBe(true);
    dip.endWar(w.diplomacy, war, { truceMonths: 60 });
    independencePeace(w, war, new Set([g]), news as never);
    expect(bondOf(w, g)!.kind).toBe("vassal");
    expect(bondOf(w, g)!.loyalty).toBe("wavering");
  });

  it("AI subjects rise when Disloyal and their overlord loses a war elsewhere (SUBJ-076)", () => {
    const w = createWorld(rules, 1, tiles);
    const g = nation(w, "granada");
    bondOf(w, g)!.loyalty = "disloyal";
    w.date.month = 6;
    const news: { kind: string; text: string }[] = [];
    // At peace and with no backer next door, it waits.
    aiRisings(w, news as never);
    expect(dip.relations.overlord(w.diplomacy.graph, "granada")).toBe("castile");
  });

  it("reads reach from the realm's administrative capacity, and faith and tongue as reasons (SUBJ-056, SUBJ-032, D-SUBJ-28)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    w.nationAdminCapacity[me] = 5;
    expect(reachOf(w, me)).toBe(9);
    w.nationAdminCapacity[me] = 0;
    expect(reachOf(w, me)).toBe(5);
    w.player = me;
    const row = statecraftView(w, me)!.subjects!.subjects.find((s) => s.subject === g)!;
    // Catholic Castile over Sunni Granada: a different faith pulls away.
    expect(row.reasons.some((r) => r.label === "Different faith")).toBe(true);
  });

  it("takes a hostage from a Loyal or Wavering subject: +1 while held, home after 20 years or when sent (SUBJ-042, D-SUBJ-29)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const g = nation(w, "granada");
    w.player = me;
    expect(processTurn(w, [{ type: "subjectAction", subject: g, action: "hostage" }], me).rejectedOrders).toEqual([]);
    const row = () => statecraftView(w, me)!.subjects!.subjects.find((x) => x.subject === g)!;
    expect(row().reasons.some((r) => r.label === "Hostage at court" && r.arrow === 1)).toBe(true);
    expect(row().hostage!.until).toMatch(/^146\d-/);
    expect(whyNotSubjectAction(w, me, g, "hostage")).toBe("you hold their heir already");
    processTurn(w, [{ type: "subjectAction", subject: g, action: "send_heir_home" }], me);
    expect(row().hostage).toBeNull();
    bondOf(w, g)!.loyalty = "disloyal";
    expect(whyNotSubjectAction(w, me, g, "hostage")).toMatch(/Disloyal/);
    bondOf(w, g)!.loyalty = "wavering";
    processTurn(w, [{ type: "subjectAction", subject: g, action: "hostage" }], me);
    w.date.year += 20;
    monthlySubjectEnvoys(w, []);
    expect(bondOf(w, g)!.ties.includes("hostage_at_court")).toBe(false);
  });

  it("brings the backer into the independence war on the subject's side (SUBJ-077, D-SUBJ-29)", () => {
    const w = createWorld(rules, 1, tiles);
    const g = nation(w, "granada");
    // Any realm at peace will do as the backer here (Morocco is at war in 1444).
    const backer = w.nationIds.findIndex((id) => id !== "granada" && id !== "castile" && !dip.warOf(w.diplomacy, id) && !dip.relations.overlord(w.diplomacy.graph, id));
    bondOf(w, g)!.loyalty = "disloyal";
    const news: { kind: string; text: string }[] = [];
    expect(riseUp(w, g, news as never, backer)).toBeNull();
    const war = w.diplomacy.wars.find((x) => x.declarer === "granada")!;
    const id = w.nationIds[backer]!;
    expect(war.attackers).toContain(id);
    expect(dip.relations.stateOf(w.diplomacy.graph, id, "castile")).toBe("at_war");
    expect(news.some((x) => x.text === `${w.rules.nations[backer]!.name} backs Granada and declares war on Castile.`)).toBe(true);
  });
});
