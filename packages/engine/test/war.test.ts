import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, relationState, type World } from "../src/index.ts";

const rules = loadDefaultRuleset();
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const armyOf = (w: World, nation: number) => Array.from(w.armies.owner.subarray(0, w.armies.count)).findIndex((o, i) => o === nation && w.armies.alive[i]);

describe("war and conquest", () => {
  it("starts from the 1444 relations between the map's realms", () => {
    const w = createWorld(rules, 1);
    expect(relationState(w, n(w, "england"), n(w, "france")).state).toBe("truce");
    expect(w.diplomacy.wars.length).toBeGreaterThan(0);
  });

  it("declares war, fights, occupies and makes peace for the land", () => {
    const w = createWorld(rules, 7);
    const me = n(w, "castile");
    w.player = me;
    const foe = n(w, "portugal");
    expect(relationState(w, me, foe).state).toBe(null);
    const r = applyNow(w, { type: "declareWar", target: foe }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect(relationState(w, me, foe).state).toBe("war");
    // A big army walks to Granada's capital and sits there.
    const army = armyOf(w, me);
    w.armies.men[army] = 40000;
    w.armies.horse[army] = 8000;
    const target = w.provinceIndex.get(rules.nations[foe]!.capital)!;
    const news = [];
    let peace = false;
    for (let t = 0; t < 120 && !peace; t++) {
      const orders = w.armies.location[army] !== target && !w.armies.route[army]!.length ? [{ type: "move" as const, army, to: target }] : [];
      news.push(...processTurn(w, orders, me).news);
      if (w.provinceOccupier[target] === me) {
        const p = applyNow(w, { type: "offerPeace", target: foe, terms: "take" }, me);
        news.push(...p.news);
        peace = relationState(w, me, foe).state !== "war";
      }
    }
    const kinds = new Set(news.map((x) => x.kind));
    expect(kinds.has("siege") || kinds.has("battle")).toBe(true);
    expect(peace).toBe(true);
    expect(w.provinceOwner[target]).toBe(me);
    expect(relationState(w, me, foe).state).toBe("truce");
  });

  it("runs decades of AI wars deterministically and quickly", () => {
    const a = createWorld(rules, 3);
    const b = createWorld(rules, 3);
    const t0 = performance.now();
    let wars = 0;
    let taken = 0;
    for (let t = 0; t < 520; t++) {
      const ra = processTurn(a, [], -1);
      processTurn(b, [], -1);
      wars += ra.news.filter((x) => x.kind === "war").length;
      taken += ra.news.filter((x) => x.kind === "peace" && x.text.includes("takes")).length;
    }
    const ms = (performance.now() - t0) / 1040;
    console.log(`10 years: ${wars} wars, ${taken} peaces with land, ${ms.toFixed(2)} ms a turn, ${a.diplomacy.wars.length} wars still on`);
    expect(Array.from(a.provinceOwner)).toEqual(Array.from(b.provinceOwner));
    expect(wars).toBeGreaterThan(0);
    expect(ms).toBeLessThan(40);
  }, 120000);
});
