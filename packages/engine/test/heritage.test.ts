import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { heritageView, heritageViews, restoreHeritage, saveHeritage } from "../src/heritage.ts";

const rules = loadDefaultRuleset();
const nation = (w: World, id: string) => w.nationIndex.get(id)!;

describe("heritage in play (HER-078)", () => {
  it("keeps every realm's heritage through a save, small", () => {
    const w = createWorld(rules, 3);
    w.player = nation(w, "france");
    while (w.date.year < 1446) processTurn(w, [], -1);
    const saved = JSON.parse(JSON.stringify(saveHeritage(w)));
    expect(JSON.stringify(saved).length).toBeLessThan(40_000);
    const copy = createWorld(rules, 3);
    copy.player = w.player;
    copy.date = { ...w.date };
    restoreHeritage(copy, saved);
    expect(saveHeritage(copy)).toEqual(saved);
    expect(heritageViews(copy)).toEqual(heritageViews(w));
    expect(heritageView(copy, w.player)!.ambitions).toHaveLength(3);
  });
});
