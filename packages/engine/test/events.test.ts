import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { answerEvent, createGameEvents, eventCards, monthlyEvents, restoreEvents, saveEvents } from "../src/events.ts";
import { declareWar, type News } from "../src/war.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const province = (w: World, id: string) => w.provinceIndex.get(id)!;

/** The Ottomans at war with Byzantium, holding Constantinople (the map's Istanbul). */
function siegeOfConstantinople(w: World): void {
  declareWar(w, nation(w, "ottomans"), nation(w, "byzantium"), []);
  w.provinceOccupier[province(w, "p1662")] = nation(w, "ottomans");
}

describe("historical events (milestone 6)", () => {
  it("starts the 1444 ages and periods and runs months without firing out-of-place events (EVT-011, EVT-015)", () => {
    const w = createWorld(rules, 1, tiles);
    const g = createGameEvents(w);
    expect(g.state.world.ages).toContain("age_of_gunpowder_empires");
    expect(g.state.world.periods).toContain("p_ottoman_expansion");
    expect(Object.keys(g.state.events).length).toBeGreaterThan(200);
    const news: News[] = [];
    for (let m = 0; m < 24; m++) {
      w.date = { ...w.date, month: (m % 12) + 1, year: 1445 + Math.floor(m / 12) };
      monthlyEvents(w, news);
    }
    expect(w.events!.state.world.history.every((h) => h.year >= 1445)).toBe(true);
  });

  it("the AI conqueror answers the Fall of Constantinople at once and the city passes to it (EVT-029, EVT-040)", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = nation(w, "england");
    siegeOfConstantinople(w);
    const news: News[] = [];
    monthlyEvents(w, news);
    const fired = w.events!.state.world.history.find((h) => h.event === "fall_of_constantinople");
    expect(fired?.roles.conqueror).toEqual(["ottoman"]);
    expect(fired?.option).toBeDefined();
    expect(w.provinceOwner[province(w, "p1662")]).toBe(nation(w, "ottomans"));
    const line = news.find((x) => x.kind === "event");
    expect(line?.text).toMatch(/^Fall of Constantinople: Ottomans chooses/);
    expect(line?.major).toBe(true);
  });

  it("waits for the player's answer on a card, then lands the choice (EVT-044, EVT-043)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "ottomans");
    w.player = me;
    siegeOfConstantinople(w);
    monthlyEvents(w, []);
    const [card] = eventCards(w, me);
    expect(card?.event).toBe("fall_of_constantinople");
    expect(card?.title).toBe("Fall of Constantinople");
    expect(card?.options.map((o) => o.id)).toEqual(["imperial_capital", "sack_and_leave"]);
    expect(card?.options[0]!.historical).toBe(true);
    expect(card?.always.some((t) => /^Constantinople passes to you/.test(t))).toBe(true);
    expect(card?.options[1]!.effects.some((t) => /^You: gold \+15%/.test(t))).toBe(true);
    // Nothing answers it for the player: a month on, it still waits.
    w.date = { ...w.date, month: w.date.month === 12 ? 1 : w.date.month + 1 };
    monthlyEvents(w, []);
    expect(eventCards(w, me)).toHaveLength(1);
    const gold = w.nationTreasury[me]!;
    expect(answerEvent(w, me, "fall_of_constantinople", "nonsense", [])).toBe("that choice is not open to you");
    expect(answerEvent(w, me, "fall_of_constantinople", "sack_and_leave", [])).toBeNull();
    expect(eventCards(w, me)).toHaveLength(0);
    expect(w.provinceOwner[province(w, "p1662")]).toBe(me);
    expect(w.nationTreasury[me]).toBeCloseTo(gold * 1.15);
  });

  it("answers through the turn's order and keeps the tree in a save (AnswerEvent)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "ottomans");
    w.player = me;
    siegeOfConstantinople(w);
    monthlyEvents(w, []);
    const saved = JSON.parse(JSON.stringify(saveEvents(w)));
    const copy = createWorld(rules, 1, tiles);
    copy.player = me;
    restoreEvents(copy, saved);
    expect(eventCards(copy, me).map((c) => c.event)).toEqual(["fall_of_constantinople"]);
    const r = processTurn(w, [{ type: "answerEvent", event: "fall_of_constantinople", option: "imperial_capital" }], me);
    expect(r.rejectedOrders).toEqual([]);
    expect(w.events!.state.world.history.find((h) => h.event === "fall_of_constantinople")?.option).toBe("imperial_capital");
  });
});
