import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { subjectPayments, subjectTies } from "../src/subjects.ts";
import { demandableProvinces, giftGold, makeDemand, monthlyStatecraft, sendEnvoy, seatsOf, standingOf, statecraftView, whyNotDemand, whyNotEnvoy } from "../src/statecraft.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;

function months(w: World, n: number, player: number): string[] {
  const news: string[] = [];
  const end = w.date.year * 12 + w.date.month + n;
  while (w.date.year * 12 + w.date.month < end) for (const x of processTurn(w, [], player).news) if (x.kind === "envoy") news.push(x.text);
  return news;
}

describe("statecraft (milestone 5)", () => {
  it("sends an envoy on a courtesy visit: the seat is taken, and the court thinks better of you when he arrives (DIPL-048, DIPL-055, DIPL-059)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const them = nation(w, "portugal");
    w.player = me;
    // 1 seat, 1 for more than 10 provinces, 1 envoy at court from Castile's standing abroad (REALM-130).
    expect(seatsOf(w, me)).toEqual({ seats: 3, free: 3 });
    const before = standingOf(w, them, me).standing;
    const r = processTurn(w, [{ type: "sendEnvoy", target: them, action: "courtesy_visit" }], me);
    expect(r.rejectedOrders).toEqual([]);
    expect(seatsOf(w, me).free).toBe(2);
    expect(whyNotEnvoy(w, me, them, "send_gift")).toBe("an envoy is already on the way");
    const news = months(w, 4, me);
    expect(standingOf(w, them, me).standing).toBe(before + 15);
    expect(standingOf(w, them, me).lines.some((l) => l.name === "Courtesy visit")).toBe(true);
    expect(news.some((t) => /Portugal receives our envoy kindly/.test(t))).toBe(true);
    const view = statecraftView(w, me)!;
    expect(view.letters[0]!.from).toBe(them);
  });

  it("counts an alliance by its reasons and says why in the answer (DIPL-081, DIPL-094)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const them = nation(w, "aragon");
    w.player = me;
    processTurn(w, [{ type: "sendEnvoy", target: them, action: "propose_alliance" }], me);
    months(w, 4, me);
    const letter = statecraftView(w, me)!.letters.find((l) => l.from === them)!;
    expect(letter.reasons.length).toBeGreaterThan(0);
    expect(letter.reasons.some((x) => /base|Asking/i.test(x.name) || x.number === -40)).toBe(true);
    const allied = dip.relations.has(w.diplomacy.graph, "alliance", "castile", "aragon");
    expect(allied).toBe(letter.answer === "yes");
  });

  it("pays for a gift, and refuses an envoy with no free seat or to an enemy", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    w.nationTreasury[me] = 100;
    processTurn(w, [{ type: "sendEnvoy", target: nation(w, "portugal"), action: "send_gift" }], me);
    expect(w.nationTreasury[me]).toBeLessThanOrEqual(100 - giftGold(w) + 1);
    processTurn(w, [{ type: "sendEnvoy", target: nation(w, "france"), action: "courtesy_visit" }], me);
    processTurn(w, [{ type: "sendEnvoy", target: nation(w, "england"), action: "courtesy_visit" }], me);
    expect(whyNotEnvoy(w, me, nation(w, "navarre"), "courtesy_visit")).toBe("no free envoy: every seat is taken");
    const fresh = createWorld(rules, 1, tiles);
    fresh.player = me;
    const enemy = nation(fresh, "aragon");
    expect(processTurn(fresh, [{ type: "declareWar", target: enemy }], me).rejectedOrders).toEqual([]);
    expect(whyNotEnvoy(fresh, me, enemy, "courtesy_visit")).toBe("you are at war");
  });

  it("lets the AI send envoys: marriages and alliances are made between other realms", () => {
    const w = createWorld(rules, 1, tiles);
    const marriages = w.diplomacy.marriages.length;
    const allies = () => w.diplomacy.graph.relations.filter((r) => r.type === "alliance").length;
    const alliances = allies();
    months(w, 24, -1);
    expect(w.diplomacy.marriages.length - marriages + allies() - alliances).toBeGreaterThan(2);
  }, 30000);

  it("demands tribute of a weak neighbour: counted from −60, and a yes makes them a Tributary that pays (DIPL-111 to DIPL-114)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const them = nation(w, "navarre");
    w.player = me;
    expect(whyNotDemand(w, me, them, "pay_tribute")).toBeNull();
    expect(whyNotDemand(w, me, nation(w, "england"), "pay_tribute")).toMatch(/reason|border/);
    expect(processTurn(w, [{ type: "makeDemand", target: them, kind: "pay_tribute" }], me).rejectedOrders).toEqual([]);
    expect(whyNotDemand(w, me, them, "pay_tribute")).toBe("an envoy is already on the way");
    months(w, 4, me);
    const letter = statecraftView(w, me)!.letters.find((l) => l.from === them && l.action === "demand")!;
    expect(letter.reasons[0]!.number).toBe(-60);
    const tributary = dip.relations.overlord(w.diplomacy.graph, "navarre") === "castile";
    expect(tributary).toBe(letter.answer === "yes");
    if (tributary) expect(subjectPayments(w).some(([a, b]) => a === them && b === me)).toBe(true);
    else expect(dip.warAimsOf(w.diplomacy, "castile", "navarre").some((a) => a.aim === "tribute")).toBe(true);
    expect(standingOf(w, them, me).lines.some((l) => /Threatened/.test(l.name))).toBe(true);
  });

  it("hands over a demanded province when the court gives in, and only border provinces can be demanded", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const them = nation(w, "navarre");
    const border = demandableProvinces(w, me, them);
    expect(border.length).toBeGreaterThan(0);
    const far = [...Array(w.provinceCount).keys()].find((p) => w.provinceOwner[p] === nation(w, "france"))!;
    expect(whyNotDemand(w, me, them, "hand_over_province", far)).toBe("that province is not theirs");
    const news: { kind: string; text: string }[] = [];
    // Giving in, as the library reports it, moves the province.
    w.diplomacy.events.push({ type: "DemandGivenIn", date: w.diplomacy.date, asker: "castile", asked: "navarre", kind: "hand_over_province", province: w.provinceIds[border[0]!] });
    monthlyStatecraft(w, news as never);
    expect(w.provinceOwner[border[0]!]).toBe(me);
    expect(news.some((x) => / hands .* to Castile/.test(x.text))).toBe(true);
  });

  it("lets AI realms demand before they go to war (DIPL-180)", () => {
    const w = createWorld(rules, 1, tiles);
    months(w, 36, -1);
    const demands = w.diplomacy.letters.filter((l) => l.action === "demand").length + w.diplomacy.refusedDemands.length + subjectTies(w).filter((t) => t.r.origin === "game").length;
    expect(demands).toBeGreaterThan(0);
  }, 30000);

  /** Runs until an envoy of `from` waits at the player's court, and returns its ask. */
  function askArrives(w: World, player: number, from: number) {
    for (let k = 0; k < 400; k++) {
      const a = statecraftView(w, player)!.asks.find((x) => x.from === from);
      if (a) return a;
      processTurn(w, [], player);
    }
    throw new Error("no ask arrived");
  }

  it("waits for the player to answer a demand, and giving in makes them a Tributary at once (DIPL-211, DIPL-212)", () => {
    const w = createWorld(rules, 1, tiles);
    const asker = nation(w, "castile");
    const me = nation(w, "navarre");
    w.player = me;
    expect(makeDemand(w, asker, me, "pay_tribute")).toBeNull();
    const ask = askArrives(w, me, asker);
    expect(ask.action).toBe("demand");
    expect(ask.kind).toBe("pay_tribute");
    expect(dip.relations.overlord(w.diplomacy.graph, "navarre")).toBeNull();
    const r = processTurn(w, [{ type: "answerAsk", ask: ask.id, yes: true }], me);
    expect(r.rejectedOrders).toEqual([]);
    expect(dip.relations.overlord(w.diplomacy.graph, "navarre")).toBe("castile");
    expect(statecraftView(w, me)!.asks).toEqual([]);
    expect(r.news.some((x) => /You give in to Castile's demand/.test(x.text))).toBe(true);
    months(w, 3, me);
    expect(w.diplomacy.letters.some((l) => l.to === "castile" && l.from === "navarre" && l.action === "demand" && l.answer === "yes")).toBe(true);
  });

  it("gives the asker a war aim when the player refuses, and counts silence as a refusal (DIPL-211)", () => {
    const w = createWorld(rules, 1, tiles);
    const asker = nation(w, "castile");
    const me = nation(w, "navarre");
    w.player = me;
    const p = demandableProvinces(w, asker, me)[0]!;
    expect(makeDemand(w, asker, me, "hand_over_province", p)).toBeNull();
    const ask = askArrives(w, me, asker);
    expect(ask.province?.province).toBe(p);
    expect(processTurn(w, [{ type: "answerAsk", ask: ask.id, yes: false }], me).rejectedOrders).toEqual([]);
    expect(w.provinceOwner[p]).toBe(me);
    expect(dip.warAimsOf(w.diplomacy, "castile", "navarre").some((a) => a.aim === "take_land")).toBe(true);
    expect(processTurn(w, [{ type: "answerAsk", ask: ask.id, yes: true }], me).rejectedOrders.length).toBe(1);

    const quiet = createWorld(rules, 1, tiles);
    quiet.player = me;
    expect(makeDemand(quiet, asker, me, "pay_tribute")).toBeNull();
    askArrives(quiet, me, asker);
    months(quiet, 2, me);
    // Other courts may have asks of their own by then (more envoys at court, REALM-230).
    expect(statecraftView(quiet, me)!.asks.filter((a) => a.from === asker)).toEqual([]);
    expect(quiet.diplomacy.refusedDemands.some((x) => x.asker === "castile" && x.asked === "navarre")).toBe(true);
  });

  it("lets the player agree to an alliance an AI court proposes (DIPL-211, DIPL-212)", () => {
    const w = createWorld(rules, 1, tiles);
    const asker = nation(w, "portugal");
    const me = nation(w, "castile");
    w.player = me;
    expect(sendEnvoy(w, asker, me, "propose_alliance")).toBeNull();
    const ask = askArrives(w, me, asker);
    expect(ask.action).toBe("propose_alliance");
    expect(processTurn(w, [{ type: "answerAsk", ask: ask.id, yes: true }], me).rejectedOrders).toEqual([]);
    expect(dip.relations.has(w.diplomacy.graph, "alliance", "portugal", "castile")).toBe(true);
  });

  it("keeps envoys, letters and alliances through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    processTurn(w, [{ type: "sendEnvoy", target: nation(w, "portugal"), action: "courtesy_visit" }], me);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.diplomacy.envoys.length).toBe(w.diplomacy.envoys.length);
    expect(back.diplomacy.graph.relations.length).toBe(w.diplomacy.graph.relations.length);
  });
});
