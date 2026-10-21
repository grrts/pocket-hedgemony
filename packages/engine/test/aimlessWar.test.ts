import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import * as dip from "../src/domain/diplomacy/index.ts";
import { declareWar, declaringAim, relationState, type News } from "../src/war.ts";
import { peaceVoices } from "../src/peace.ts";
import { grievancesOf, monthlyMoods } from "../src/moods.ts";
import { priceOfWar } from "../src/priceOfWar.ts";
import { NO_AIM } from "../src/aimlessWar.ts";

/** A war with no aim punishes its declarer hugely, at once (F-167). */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

/** A realm with lords, and a neighbour it holds no aim against and has no pact with. */
function pair(w: World): [number, number] {
  for (let a = 0; a < w.nationCount; a++) {
    if (w.nationGone[a] || !w.lords.some((l) => l.nation === a && !l.gone && l.loyalty === "Loyal")) continue;
    if (dip.warOf(w.diplomacy, w.nationIds[a]!) || dip.relations.overlord(w.diplomacy.graph, w.nationIds[a]!)) continue;
    for (const id of dip.neighbours(w.diplomacy, w.nationIds[a]!)) {
      const b = w.nationIndex.get(id);
      if (b === undefined || w.nationGone[b] || dip.warOf(w.diplomacy, id)) continue;
      if (relationState(w, a, b).state !== null || dip.relations.overlord(w.diplomacy.graph, id)) continue;
      if (declaringAim(w, a, b).aim === "no_aim") return [a, b];
    }
  }
  throw new Error("no pair found");
}

describe("a war with no aim (F-167)", () => {
  it("turns every lord, raises notoriety and makes the people call it unjust the day it is declared", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    const lords = w.lords.map((l, k) => [l, k] as const).filter(([l]) => l.nation === a && !l.gone);
    const before = dip.notoriety(w.diplomacy, w.nationIds[a]!);
    const news: News[] = [];
    expect(declareWar(w, a, b, news)).toBeNull();
    // Two steps: every Loyal or Wavering lord is now Disloyal, Warlike or not.
    for (const [l] of lords) expect(["Disloyal", "In revolt"]).toContain(l.loyalty);
    expect(dip.notoriety(w.diplomacy, w.nationIds[a]!)).toBeGreaterThanOrEqual(before + NO_AIM.notoriety);
    const mine = Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === a);
    for (const p of mine) expect(grievancesOf(w, p)).toContain("Unjust war");
    // The grievance stays while the war lasts, and goes with it.
    monthlyMoods(w, []);
    expect(grievancesOf(w, mine[0]!)).toContain("Unjust war");
    w.diplomacy.wars = w.diplomacy.wars.filter((x) => x.declarer !== w.nationIds[a]);
    monthlyMoods(w, []);
    expect(grievancesOf(w, mine[0]!)).not.toContain("Unjust war");
  });

  it("makes the declarer's voices lean to peace", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    declareWar(w, a, b, []);
    const war = dip.warOf(w.diplomacy, w.nationIds[a]!)!;
    const unjust = peaceVoices(w, a, war).share;
    const w2 = createWorld(rules, 1, tiles);
    declareWar(w2, a, b, []);
    const war2 = dip.warOf(w2.diplomacy, w2.nationIds[a]!)!;
    war2.aim = "punish";
    expect(unjust).toBeCloseTo(Math.min(1, peaceVoices(w2, a, war2).share + NO_AIM.peace_share));
  });

  it("keeps an AI ally out of it with no oath broken", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    const ally = dip.neighbours(w.diplomacy, w.nationIds[a]!).map((id) => w.nationIndex.get(id)!).find((x) => x !== b && x !== w.player && !w.nationGone[x] && !dip.warOf(w.diplomacy, w.nationIds[x]!) && relationState(w, a, x).state === null && !dip.relations.overlord(w.diplomacy.graph, w.nationIds[x]!) && dip.relations.overlord(w.diplomacy.graph, w.nationIds[a]!) !== w.nationIds[x]);
    expect(ally).toBeDefined();
    dip.relations.formAlliance(w.diplomacy.graph, w.nationIds[a]!, w.nationIds[ally!]!);
    expect(priceOfWar(w, a, b).aimless?.alliesStayOut).toContain(ally);
    expect(priceOfWar(w, a, b).friends.map((f) => f.nation)).not.toContain(ally);
    declareWar(w, a, b, []);
    const call = w.diplomacy.calls.find((c) => c.called === w.nationIds[ally!]);
    expect(call?.answer).toBe("no");
    expect(dip.relations.has(w.diplomacy.graph, "alliance", w.nationIds[a]!, w.nationIds[ally!]!)).toBe(true);
  });

  it("prices the whole cost on the declare sheet", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    const p = priceOfWar(w, a, b);
    expect(p.noAim).toBe(true);
    expect(p.aimless).toMatchObject({ lordSteps: NO_AIM.lord_steps, notoriety: NO_AIM.notoriety, peaceShare: NO_AIM.peace_share });
    expect(p.aimless!.lords).toBe(w.lords.filter((l) => l.nation === a && !l.gone && (l.loyalty === "Loyal" || l.loyalty === "Wavering")).length);
    expect(p.aimless!.provinces).toBe(Array.from({ length: w.provinceCount }, (_, k) => k).filter((k) => w.provinceOwner[k] === a).length);
  });

  it("costs nothing for a war with an aim", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    dip.grantAim(w.diplomacy, { holder: w.nationIds[a]!, target: w.nationIds[b]!, aim: "punish", until: dip.addMonths(dip.monthOf(w.diplomacy.date), 60), source: "test" });
    expect(declaringAim(w, a, b).aim).toBe("punish");
    expect(priceOfWar(w, a, b).aimless).toBeNull();
    const loyal = w.lords.filter((l) => l.nation === a && l.loyalty === "Loyal").length;
    declareWar(w, a, b, []);
    expect(w.lords.filter((l) => l.nation === a && l.loyalty === "Loyal").length).toBe(loyal);
  });
});
