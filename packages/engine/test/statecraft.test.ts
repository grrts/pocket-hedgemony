import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { giftGold, seatsOf, standingOf, statecraftView, whyNotEnvoy } from "../src/statecraft.ts";
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
    expect(seatsOf(w, me)).toEqual({ seats: 2, free: 2 });
    const before = standingOf(w, them, me).standing;
    const r = processTurn(w, [{ type: "sendEnvoy", target: them, action: "courtesy_visit" }], me);
    expect(r.rejectedOrders).toEqual([]);
    expect(seatsOf(w, me).free).toBe(1);
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
    months(w, 24, -1);
    expect(w.diplomacy.marriages.length).toBeGreaterThan(marriages + 3);
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
