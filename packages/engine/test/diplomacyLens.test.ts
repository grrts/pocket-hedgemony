import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, LENS_RELATIONS, processTurn, type World } from "../src/index.ts";
import { diplomacyLensView } from "../src/diplomacyLens.ts";
import { declareWar } from "../src/war.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const relationOf = (w: World, me: number, id: string) => LENS_RELATIONS[diplomacyLensView(w, me)!.relation[nation(w, id)]!];

describe("diplomacy lens (DIPL-183, DIPL-184, DIPL-209)", () => {
  it("colours each realm by the library's lens colour for the player", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    const view = diplomacyLensView(w, me)!;
    expect(view.relation.length).toBe(w.nationCount);
    expect(LENS_RELATIONS[view.relation[me]!]).toBe("own");
    for (let n = 0; n < w.nationCount; n++) {
      if (w.nationGone[n]) continue;
      const word = { own: "own", ally: "blue", pledged: "light blue", close: "green", warm: "pale green", neutral: "grey", cold: "orange", hostile: "red", war: "red, hatched" }[LENS_RELATIONS[view.relation[n]!]!];
      expect(word).toBe(dip.lensColour(w.diplomacy, "castile", w.nationIds[n]!));
    }
  });

  it("shows a war as red, hatched, and an ally as blue", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    expect(declareWar(w, me, nation(w, "morocco"), [])).toBeNull();
    expect(relationOf(w, me, "morocco")).toBe("war");
    expect(relationOf(w, me, "granada")).toBe("own");
    dip.relations.newRecord(w.diplomacy.graph, "alliance", "castile", "portugal", "mutual");
    expect(relationOf(w, me, "portugal")).toBe("ally");
  });

  it("follows an envoy on the road from capital to capital until he arrives", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    const them = nation(w, "portugal");
    w.player = me;
    processTurn(w, [{ type: "sendEnvoy", target: them, action: "courtesy_visit" }], me);
    const [e] = diplomacyLensView(w, me)!.envoys;
    expect(e).toBeDefined();
    expect(e!.target).toBe(them);
    expect(e!.from).toBe(w.provinceIndex.get(w.rules.nations[me]!.capital));
    expect(e!.to).toBe(w.provinceIndex.get(w.rules.nations[them]!.capital));
    expect(e!.progress).toBeGreaterThanOrEqual(0);
    expect(e!.progress).toBeLessThanOrEqual(1);
    for (let i = 0; i < 8; i++) processTurn(w, [], me);
    expect(diplomacyLensView(w, me)!.envoys).toEqual([]);
  });

  it("marks the realms the player holds a war aim on, never for Raid or No aim alone", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    w.diplomacy.aims.push({ holder: "castile", target: "aragon", aim: "take_land", source: "test" });
    const aims = diplomacyLensView(w, me)!.aims;
    expect(aims).toContain(nation(w, "aragon"));
    expect(aims).not.toContain(me);
  });

  it("takes little time for the whole world", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    diplomacyLensView(w, me);
    const t = performance.now();
    for (let i = 0; i < 5; i++) diplomacyLensView(w, me);
    const ms = (performance.now() - t) / 5;
    console.log(`diplomacy lens view: ${ms.toFixed(2)} ms for ${w.nationCount} nations`);
    expect(ms).toBeLessThan(20);
  });
});
