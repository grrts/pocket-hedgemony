import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { eventConditionHolds } from "../src/events.ts";
import * as evt from "../src/domain/events/index.ts";
import sequels from "../../rules/data/domain/events-ambitions.json" with { type: "json" };
import campaign from "../../rules/data/domain/events-campaign.json" with { type: "json" };

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const events = sequels.events as unknown as Record<string, evt.EventDef>;
const words = sequels.localization as Record<string, string>;

/** Marks one of a realm's ambitions done, drawing it from the pool first if it is not drawn. */
function fulfil(w: World, realm: string, id: string): void {
  const h = w.heritage!.realms[w.nationIndex.get(realm)!]!;
  let a = h.ambitions.find((x) => x.item.id === id);
  if (!a) {
    const item = h.pool.find((x) => x.id === id)!;
    expect(item, id).toBeDefined();
    a = { item, state: "open", share: 0, near: false };
    h.ambitions.push(a);
  }
  a.state = "done";
}

describe("events that follow a fulfilled ambition (HER-093)", () => {
  it("pass the event tree's build checks, each named and dated by history", () => {
    const report = evt.validate({ events: Object.values({ ...(campaign.events as unknown as Record<string, evt.EventDef>), ...events }), ages: campaign.ages as unknown as evt.AgeDef[], periods: campaign.periods as unknown as evt.PeriodDef[], conditions: ["heritage"] });
    expect(report.errors.filter((e) => Object.keys(events).some((id) => e.includes(id)))).toEqual([]);
    expect(Object.keys(events).length).toBeGreaterThanOrEqual(40);
    for (const e of Object.values(events)) {
      expect(e.id in campaign.events).toBe(false);
      expect(JSON.stringify(e.trigger)).toContain('"heritage"');
      expect(e.history?.date).toBeDefined();
      expect(words[`event.${e.id}.name`]).toBeTruthy();
      for (const o of e.options) expect(words[`event.${e.id}.option.${o.id}`]).toBeTruthy();
    }
  });

  it("wait until the realm has done the ambition", () => {
    const w = createWorld(rules, 1, tiles);
    const casa = w.events!.state.events.amb_casa_da_india!;
    expect(eventConditionHolds(w, casa.trigger!)).toBe(false);
    expect(evt.eligible(w.events!.state, casa)).toEqual([]);
    fulfil(w, "portugal", "portugal_beyond_the_cape");
    expect(eventConditionHolds(w, casa.trigger!)).toBe(true);
    expect(evt.eligible(w.events!.state, casa)).toHaveLength(1);
  });

  it("each hang on an ambition the realm can draw", () => {
    const w = createWorld(rules, 1, tiles);
    for (const e of Object.values(events)) {
      const leaf = JSON.stringify(e.trigger).match(/"heritage":\{"who":"([a-z_]+)","id":"([a-z_]+)"/)!;
      const n = w.events!.nationOf.get(leaf[1]!);
      expect(n, `${e.id} ${leaf[1]}`).toBeDefined();
      const h = w.heritage!.realms[n!]!;
      expect([...h.ambitions.map((a) => a.item), ...h.pool, ...h.waitingForAge].some((a) => a.id === leaf[2]), `${e.id} ${leaf[2]}`).toBe(true);
    }
  });
});
