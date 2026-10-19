import { describe, expect, it } from "vitest";

// The 1378 start behind the dev switch (rules/src/start.ts), chosen when @ph/rules loads.
process.env.PH_START = "1378";
const { loadDefaultRuleset, startLords } = await import("@ph/rules");
const { createWorld } = await import("../src/index.ts");
const { lordLands } = await import("../src/lords.ts");
const { answerEvent, applyEventEffects, eventCards, monthlyEvents } = await import("../src/events.ts");
const evt = await import("../src/domain/events/index.ts");
const { default: lordEvents } = await import("../../rules/data/domain/events-bridge-lords.json", { with: { type: "json" } });
const { default: campaign } = await import("../../rules/data/domain/events-campaign.json", { with: { type: "json" } });
const { default: west } = await import("../../rules/data/domain/events-bridge-west.json", { with: { type: "json" } });

const rules = loadDefaultRuleset();
const fresh = () => createWorld(rules, 1);
const lordOf = (w: ReturnType<typeof fresh>, id: string) => w.lords.findIndex((l) => l.historical === id);
const events = lordEvents.events as unknown as Record<string, import("../src/domain/events/index.ts").EventDef>;

describe("historical figures who come later (REALM-295 to REALM-297)", () => {
  it("one event per later figure, passing the tree's build checks with the new effect", () => {
    expect(Object.keys(events).sort()).toEqual(Object.keys(startLords.later).map((id) => `lord_${id}`).sort());
    const report = evt.validate({ events: [...Object.values({ ...(campaign.events as unknown as typeof events), ...(west.events as unknown as typeof events) }), ...Object.values(events)], ages: campaign.ages as never, periods: campaign.periods as never, effectTypes: ["historical_lord"] });
    expect(report.errors.filter((e) => Object.keys(events).some((id) => e.includes(id)))).toEqual([]);
    for (const e of Object.values(events)) {
      expect(e.availability.mode).toBe("approximate");
      for (const k of ["name", "desc", "option.welcome", "option.refuse"]) expect((lordEvents.localization as Record<string, string>)[`event.${e.id}.${k}`]).toBeTruthy();
    }
  });

  it("a figure joins as a new lord, or takes the place of the generated lord who holds his seat", () => {
    const w = fresh();
    const ming = w.nationIndex.get("ming")!;
    const beijing = w.provinceIndex.get("p1809")!;
    const before = w.provinceLord[beijing]!;
    applyEventEffects(w, [{ historical_lord: { id: "zhu_di", on: "ming" } } as never], []);
    const k = lordOf(w, "zhu_di");
    expect(k).toBeGreaterThanOrEqual(0);
    expect(w.lords[k]!.nation).toBe(ming);
    expect(w.lords[k]!.title).toBe("Prince of Yan");
    expect(w.provinceLord[beijing]).toBe(k);
    if (before >= 0) expect(k).toBe(before);
    // His age is counted from his birth to the year he comes.
    expect(w.lords[k]!.age).toBe(w.date.year - 1360);
  });

  it("a figure who takes over replaces the lord of his seat, lands and all", () => {
    const w = fresh();
    const kestutis = lordOf(w, "kestutis");
    const lands = lordLands(w, kestutis);
    applyEventEffects(w, [{ historical_lord: { id: "skirgaila", on: "lithuania" } } as never], []);
    expect(lordOf(w, "skirgaila")).toBe(kestutis);
    expect(w.lords[kestutis]!.name).toBe("Skirgaila");
    expect(lordLands(w, kestutis)).toEqual(lands);
    expect(lordOf(w, "kestutis")).toBe(-1);
  });

  it("never takes land from another historical lord, and comes only once", () => {
    const w = fresh();
    const n = w.lords.length;
    applyEventEffects(w, [{ historical_lord: { id: "zhu_di", on: "ming" } } as never], []);
    const after = w.lords.length;
    applyEventEffects(w, [{ historical_lord: { id: "zhu_di", on: "ming" } } as never], []);
    expect(w.lords.length).toBe(after);
    expect(after - n).toBeLessThanOrEqual(1);
    for (const id of ["zhu_shuang", "zhu_gang"]) expect(lordLands(w, lordOf(w, id)).length).toBeGreaterThan(0);
  });

  it("the player's card offers him, and welcoming him seats him", () => {
    const w = fresh();
    const ming = w.nationIndex.get("ming")!;
    w.player = ming;
    const news: import("../src/war.ts").News[] = [];
    for (let m = 0; m < 12 * 12 && !eventCards(w, ming).some((c) => c.event === "lord_zhu_di"); m++) {
      w.date = w.date.month === 12 ? { ...w.date, year: w.date.year + 1, month: 1 } : { ...w.date, month: w.date.month + 1 };
      monthlyEvents(w, news);
      for (const c of eventCards(w, ming)) if (c.event !== "lord_zhu_di") answerEvent(w, ming, c.event, c.options[0]!.id, news);
    }
    const card = eventCards(w, ming).find((c) => c.event === "lord_zhu_di")!;
    expect(card.options.map((o) => o.name)).toEqual(["Send him to Beiping", "Keep him at Nanjing"]);
    expect(card.options[0]!.effects.join(" ")).toContain("Zhu Di becomes your lord as Prince of Yan");
    expect(answerEvent(w, ming, "lord_zhu_di", "welcome", news)).toBeNull();
    expect(lordOf(w, "zhu_di")).toBeGreaterThanOrEqual(0);
    expect(news.some((x) => x.text.includes("Zhu Di"))).toBe(true);
  });
});
