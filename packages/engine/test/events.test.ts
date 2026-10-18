import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { answerEvent, applyEventEffects, createGameEvents, eventConditionHolds, eventCards, monthlyEvents, restoreEvents, saveEvents } from "../src/events.ts";
import { declareWar, type News } from "../src/war.ts";
import { bondOf, subjectTies } from "../src/subjects.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

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

describe("events and subjects (SUBJ-097)", () => {
  it("makes, loosens, weighs and frees the game's own subjects", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = nation(w, "castile");
    const navarre = nation(w, "navarre");
    const granada = nation(w, "granada");
    const news: News[] = [];
    expect(bondOf(w, navarre)).toBeNull();
    applyEventEffects(w, [{ vassalize: { who: "castile", target: "navarre", type: "puppet" } }], news);
    expect(bondOf(w, navarre)).toMatchObject({ overlord: "castile", kind: "protectorate", loyalty: "loyal" });
    expect(news.some((x) => /Navarre becomes a protectorate of Castile/.test(x.text))).toBe(true);
    expect(w.events!.state.world.subjects).toBeUndefined();
    // the loyalty test reads the real bond: Granada starts Wavering
    expect(eventConditionHolds(w, { subject_loyalty: { who: "castile", target: "granada", op: "==", step: "wavering" } })).toBe(true);
    expect(eventConditionHolds(w, { subject_loyalty: { who: "castile", target: "navarre", op: "==", step: "loyal" } })).toBe(true);
    expect(eventConditionHolds(w, { relation: { who: "navarre", other: "castile", type: "subject", kind: "protectorate" } })).toBe(true);
    const heads = subjectTies(w).filter((t) => t.o === castile).length;
    expect(eventConditionHolds(w, { subject_count: { who: "castile", op: "==", value: heads } })).toBe(true);
    // Granada a Tributary (0.5), Navarre a Protectorate (1): by reach less than a head count
    expect(eventConditionHolds(w, { subject_count: { who: "castile", op: "<", value: heads, by_reach: true } })).toBe(true);
    applyEventEffects(w, [{ change_subject_kind: { who: "castile", target: "navarre", kind: "loosen" } }], news);
    expect(bondOf(w, navarre)!.kind).toBe("tributary");
    expect(w.diplomacy.graph.relations.find((r) => r.type === "subject" && r.source === "navarre")!.subject_kind).toBe("tributary");
    applyEventEffects(w, [{ add_subject_reason: { target: "granada", reason: "lost_war", months: 36 } }], news);
    const now = w.date.year * 12 + w.date.month - 1;
    expect(bondOf(w, granada)!.reasons.find((r) => r.id === "lost_war")).toMatchObject({ arrow: -1, from: now, until: now + 36 });
    applyEventEffects(w, [{ remove_subject_reason: { target: "granada", reason: "lost_war" } }], news);
    expect(bondOf(w, granada)!.reasons.some((r) => r.id === "lost_war")).toBe(false);
    applyEventEffects(w, [{ release: { who: "castile", target: "navarre" } }], news);
    expect(bondOf(w, navarre)).toBeNull();
    expect(dip.relations.stance(w.diplomacy.graph, "navarre", "castile")).toBe("friendly");
    expect(eventConditionHolds(w, { relation: { who: "navarre", other: "castile", type: "subject" } })).toBe(false);
  });
});
