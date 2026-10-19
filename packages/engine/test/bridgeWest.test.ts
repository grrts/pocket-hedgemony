import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { answerEvent, applyEventEffects, createGameEvents, eventCards, eventConditionHolds, monthlyEvents } from "../src/events.ts";
import { declareWar, type News } from "../src/war.ts";
import * as evt from "../src/domain/events/index.ts";
import west from "../../rules/data/domain/events-bridge-west.json" with { type: "json" };
import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };
import places from "../../rules/data/domain/events-places.json" with { type: "json" };

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const bridgeEvents = west.events as unknown as Record<string, evt.EventDef>;
const own = Object.values(bridgeEvents).filter((e) => !(e.id in campaign.events));

/** The 1444 map played from the 1378 start day, as the bridge events see it until the 1378 map is joined. */
function from1378(): World {
  const w = createWorld(rules, 1, tiles);
  w.date = { ...w.date, year: 1378, month: 9 };
  w.events = createGameEvents(w);
  return w;
}

/** Plays a month at a time until the condition holds or the months run out. */
function playUntil(w: World, months: number, done: () => boolean, news: News[] = []): void {
  for (let m = 0; m < months && !done(); m++) {
    w.date = w.date.month === 12 ? { ...w.date, year: w.date.year + 1, month: 1 } : { ...w.date, month: w.date.month + 1 };
    monthlyEvents(w, news);
  }
}

const fired = (w: World, id: string) => w.events!.state.world.history.find((h) => h.event === id);

describe("bridge events of the West, 1378 to 1444 (EVT-085 to EVT-089)", () => {
  it("passes the event tree's build checks together with the campaign (EVT-062, EVT-085)", () => {
    const all = { ...(campaign.events as unknown as Record<string, evt.EventDef>), ...bridgeEvents };
    const report = evt.validate({ events: Object.values(all), ages: campaign.ages as unknown as evt.AgeDef[], periods: campaign.periods as unknown as evt.PeriodDef[] });
    const ids = new Set(Object.keys(bridgeEvents));
    expect(report.errors.filter((e) => [...ids].some((id) => e.includes(id)))).toEqual([]);
    expect(own.length).toBeGreaterThanOrEqual(50);
    // Every event is conditional and dated by history, never forced (EVT-019, plan-1378 §2).
    for (const e of own) {
      expect(e.availability.mode).not.toBe("mandatory");
      expect(e.availability.earliest).toBeGreaterThanOrEqual(1378);
      expect(e.availability.latest).toBeLessThanOrEqual(1460);
      expect(e.history?.date).toBeDefined();
      expect(west.localization[`event.${e.id}.name` as keyof typeof west.localization]).toBeTruthy();
      expect(west.localization[`event.${e.id}.desc` as keyof typeof west.localization]).toBeTruthy();
      for (const o of e.options) expect(west.localization[`event.${e.id}.option.${o.id}` as keyof typeof west.localization]).toBeTruthy();
    }
  });

  it("names only places the bridge maps and modifiers the tree has", () => {
    const known = new Set([...Object.keys(places.places), ...Object.keys(west.places), ...places.start.places]);
    const mods = new Set((campaign.modifiers as { id: string }[]).map((m) => m.id));
    const text = JSON.stringify(own);
    for (const [, key] of text.matchAll(/"((?:area|province|region):[a-z_]+)"/g)) if (!key!.startsWith("region:")) expect(known.has(key!), key).toBe(true);
    for (const [, id] of text.matchAll(/"modifier":"([a-z_]+)"/g)) expect(mods.has(id!), id).toBe(true);
  });

  it("from a 1444 start the West's events are history already, with their historical choices (EVT-087)", () => {
    const w = createWorld(rules, 1, tiles);
    const troyes = fired(w, "treaty_of_troyes");
    expect(troyes).toMatchObject({ year: 1420, month: 5, option: "accept_troyes" });
    expect(fired(w, "council_of_constance")?.roles.church).toEqual(["papal_states"]);
    // A 1444 event re-dated for 1378 that now needs a bridge event still holds from 1444 (EVT-089).
    expect(eventConditionHolds(w, bridgeEvents.end_of_hundred_years_war!.requires!)).toBe(true);
    expect(eventConditionHolds(w, bridgeEvents.union_of_castile_and_aragon!.requires!)).toBe(true);
    // Nothing of 1378 to 1444 fires again in a 1444 game.
    const before = w.events!.state.world.history.length;
    playUntil(w, 12, () => false);
    for (const h of w.events!.state.world.history.slice(before)) expect(own.some((e) => e.id === h.event)).toBe(false);
  });

  it("from 1378 the bridge events wait for their history: none counts as happened (EVT-087)", () => {
    const w = from1378();
    expect(own.filter((e) => fired(w, e.id))).toEqual([]);
    expect(w.events!.state.world.periods).toContain("p_western_schism");
  });

  it("France declares for Clement, then the Catholic realms choose their Pope (EVT-088)", () => {
    const w = from1378();
    w.player = nation(w, "ottomans");
    playUntil(w, 120, () => w.events!.state.world.history.filter((h) => h.event === "schism_obedience").length >= 5);
    expect(fired(w, "schism_vincennes")).toBeDefined();
    const chose = w.events!.state.world.history.filter((h) => h.event === "schism_obedience");
    expect(chose.length).toBeGreaterThanOrEqual(5);
    // Each realm chooses once, and never France or the Pope's own state, who stand first.
    const realms = chose.map((h) => h.roles.realm![0]);
    expect(new Set(realms).size).toBe(realms.length);
    expect(realms).not.toContain("france");
    expect(realms).not.toContain("papal_states");
    // The chosen obedience is kept as a flag the later events read.
    const [first] = chose;
    const flag = first!.option === "obey_rome" ? "obedience_rome" : first!.option === "obey_avignon" ? "obedience_avignon" : null;
    if (flag) expect(eventConditionHolds(w, { flag: { who: first!.roles.realm![0], id: flag } })).toBe(true);
  });

  it("the tree sees each realm's faith, its ruler and the Emperor (EVT-086)", () => {
    const w = from1378();
    const france = nation(w, "france");
    expect(eventConditionHolds(w, { religion: { who: "france", is: "catholic" } })).toBe(true);
    expect(eventConditionHolds(w, { stat: { who: "france", stat: "ruler_age", op: "==", value: w.rulers[france]!.age } })).toBe(true);
    // A new ruler reads 0 years on the throne in his first year; a regent ruling for a child sets the regency flag.
    w.rulers[france]!.years = 0;
    w.rulers[france]!.regent = "Duke of Anjou";
    expect(eventConditionHolds(w, { stat: { who: "france", stat: "ruler_years", op: "<=", value: 0 } })).toBe(true);
    expect(eventConditionHolds(w, { flag: { who: "france", id: "regency" } })).toBe(true);
    const emperor = w.empire!.holder!;
    expect(eventConditionHolds(w, { flag: { who: emperor, id: "emperor" } })).toBe(true);
    expect(eventConditionHolds(w, { flag: { who: w.empire!.members.find((m) => m !== emperor)!, id: "empire_member" } })).toBe(true);
    expect(eventConditionHolds(w, { flag: { who: "france", id: "empire_member" } })).toBe(false);
  });

  it("the regency of Charles V's death waits on the player's answer, then empties the treasury", () => {
    const w = from1378();
    const france = nation(w, "france");
    w.player = france;
    w.rulers[france]!.regent = "Duke of Anjou";
    playUntil(w, 60, () => eventCards(w, france).some((c) => c.event === "death_of_charles_v"));
    const card = eventCards(w, france).find((c) => c.event === "death_of_charles_v")!;
    expect(card.title).toBe("The uncles' regency");
    expect(card.options.map((o) => o.name)).toEqual(["Rule by the uncles", "Keep the hearth tax"]);
    const gold = w.nationTreasury[france]!;
    expect(answerEvent(w, france, "death_of_charles_v", "rule_by_the_uncles", [])).toBeNull();
    expect(w.nationTreasury[france]).toBeCloseTo(gold * 0.8);
  });

  it("at Troyes France may give Paris to England (EVT-088)", () => {
    const w = from1378();
    const france = nation(w, "france");
    const england = nation(w, "england");
    w.player = france;
    w.date = { ...w.date, year: 1420, month: 1 };
    expect(declareWar(w, england, france, [], { breakTruce: true })).toBeNull();
    for (const id of ["p1058", "p1051", "p1047", "p1057", "p1053"]) w.provinceOccupier[w.provinceIndex.get(id)!] = england;
    applyEventEffects(w, [{ set_flag: { on: "france", id: "princes_feud", years: 0 } }], []);
    playUntil(w, 60, () => eventCards(w, france).some((c) => c.event === "treaty_of_troyes"));
    expect(answerEvent(w, france, "treaty_of_troyes", "accept_troyes", [])).toBeNull();
    const paris = w.provinceIndex.get("p1063")!;
    expect(w.provinceOwner[paris]).toBe(england);
  });

  it("a rebels effect sparks the realm's aggrieved provinces (EVT-048, EVT-088)", () => {
    const w = from1378();
    const england = nation(w, "england");
    const mine = [...Array(w.provinceCount).keys()].filter((p) => w.provinceOwner[p] === england);
    w.provinceGrievances[mine[0]!] = 1;
    w.rebelSparks.length = 0;
    applyEventEffects(w, [{ rebels: { on: "england", type: "peasant", size: "medium" } }], []);
    expect(w.rebelSparks.map((s) => s.province)).toEqual([mine[0]]);
  });

  it("Madeira and Cape Bojador raise Portugal's naval reach without stopping the game (EVT-054, EVT-073)", () => {
    const w = from1378();
    const tree = () => w.events!.state.world.countries.portugal!.stats;
    expect(tree().naval_reach).toBe(10);
    applyEventEffects(w, bridgeEvents.madeira_and_azores!.options[0]!.effects.immediate!, [], { navigator: ["portugal"] });
    applyEventEffects(w, bridgeEvents.cape_bojador!.options[0]!.effects.immediate!, [], { navigator: ["portugal"] });
    expect(tree().naval_reach).toBe(18);
    expect(eventConditionHolds(w, { stat: { who: "portugal", stat: "naval_reach", op: ">=", value: 15 } })).toBe(true);
  });

  it("no stat change in the game's events stops the game (EVT-054, EVT-073)", () => {
    const w = from1378();
    const all = { ...(campaign.events as unknown as Record<string, evt.EventDef>), ...bridgeEvents };
    const stats = new Set<string>();
    for (const ev of Object.values(all))
      for (const tiers of [ev.effects, ...ev.options.map((o) => o.effects)])
        for (const list of Object.values(tiers ?? {}))
          for (const e of (list as evt.Effect[]) ?? []) if (typeof e.stat === "object") for (const k of Object.keys(e.stat as object)) stats.add(k);
    expect(stats.has("naval_reach")).toBe(true);
    expect(stats.has("income")).toBe(true);
    const before = { ...w.events!.state.world.countries.portugal!.stats };
    for (const stat of stats) expect(() => applyEventEffects(w, [{ on: "portugal", stat: { [stat]: 1 } }], []), stat).not.toThrow();
    // A derived statistic the game reads from the realm is not written (EVT-054).
    expect(w.events!.state.world.countries.portugal!.stats.income).toBe(before.income);
  });
});
