import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { capsOf, formOf, governmentView, monthlyGovernment, reform, reformGold, setForm, startFormOf } from "../src/government.ts";
import { grievancesOf, monthlyMoods } from "../src/moods.ts";
import { FORM_IDS } from "../src/domain/government/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;

const royalWithOfficial = (w: World, n: number) => {
  const out: number[] = [];
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === n && w.provinceLord[p]! < 0 && w.provinceOfficial[p]! >= 0) out.push(p);
  return out;
};

describe("government in the game (GOV-058 to GOV-066)", () => {
  it("gives every realm its 1444 form by the start-form rules, the map's own realms included (GOV-058)", () => {
    const w = createWorld(rules, 1, tiles);
    expect(formOf(w, nation(w, "france"))).toBe("feudal_realm");
    expect(formOf(w, nation(w, "venice"))).toBe("merchant_republic");
    expect(formOf(w, nation(w, "ottomans"))).toBe("household_realm");
    expect(formOf(w, nation(w, "japan"))).toBe("shogunate");
    for (const id of w.nationIds) expect(FORM_IDS).toContain(startFormOf(id));
  });

  it("starts every realm within both caps, what it held above its form counted as Custom (GOV-059, D-GOV-18)", () => {
    const w = createWorld(rules, 1, tiles);
    for (let n = 0; n < w.nationCount; n++) {
      const v = governmentView(w, n);
      expect(v.officials.used).toBeLessThanOrEqual(v.officials.cap.total);
      expect(v.lords.used).toBeLessThanOrEqual(v.lords.cap.total);
    }
    const ming = governmentView(w, nation(w, "ming"));
    expect(ming.officials.cap.parts[0]).toEqual({ source: "form", value: 20 });
    expect(ming.officials.cap.parts[1]!.source).toBe("custom");
  });

  it("gives the newest officials over the cap Grasping officials, and lifts it when back within (GOV-005, GOV-006, GOV-060)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "france");
    const posts = royalWithOfficial(w, me);
    w.nationCustomOfficials[me] = w.nationCustomOfficials[me]! - 2;
    const newest = posts[3]!;
    w.provinceOfficialSince[newest] = 999;
    monthlyGovernment(w, []);
    expect(posts.filter((p) => w.provinceGrasping[p])).toHaveLength(2);
    expect(w.provinceGrasping[newest]).toBe(1);
    monthlyMoods(w, []);
    expect(grievancesOf(w, newest)).toContain("Grasping officials");
    w.nationCustomOfficials[me] = w.nationCustomOfficials[me]! + 2;
    monthlyGovernment(w, []);
    expect(posts.some((p) => w.provinceGrasping[p])).toBe(false);
  });

  it("makes one lord slip at New Year for each lord over the cap, lowest loyalty first (GOV-007, GOV-061)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "france");
    w.player = me;
    const mine = w.lords.flatMap((l, k) => (l.nation === me && w.provinceLord.includes(k) ? [k] : []));
    expect(mine.length).toBeGreaterThan(2);
    w.lords[mine[1]!]!.loyalty = "Wavering";
    setForm(w, me, "household_realm");
    w.nationCustomLords[me] = mine.length - 4 - 1;
    w.date = { year: 1445, month: 1, day: 1 };
    const news: { text: string }[] = [];
    monthlyGovernment(w, news as never);
    expect(w.lords[mine[1]!]!.loyalty).toBe("Disloyal");
    expect(mine.filter((k) => w.lords[k]!.loyalty !== "Loyal")).toHaveLength(1);
    expect(news.some((x) => x.text.includes("more lords than the realm can hold"))).toBe(true);
  });

  it("reforms into a next form when the needs are met and the gold paid, and lords slip (GOV-027 to GOV-032, GOV-062)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "france");
    expect(reform(w, me, "absolute_monarchy", [])).toBe("a need is not met");
    expect(reform(w, me, "elective_monarchy", [])).toBe("it comes by itself when its condition holds");
    expect(reform(w, me, "party_state", [])).toBe("only by revolution or event");
    w.research[me]!.known.add("G9");
    w.research[me]!.known.add("W12");
    w.nationTreasury[me] = 10;
    expect(reform(w, me, "absolute_monarchy", [])).toBe("not enough gold");
    w.nationTreasury[me] = 500;
    const loyalBefore = w.lords.filter((l) => l.nation === me && l.loyalty === "Loyal").length;
    expect(reform(w, me, "absolute_monarchy", [])).toBeNull();
    expect(formOf(w, me)).toBe("absolute_monarchy");
    expect(w.nationTreasury[me]).toBe(500 - reformGold(w, 300));
    expect(w.lords.filter((l) => l.nation === me && l.loyalty === "Loyal").length).toBe(loyalBefore - 3);
    expect(capsOf(w, me).officials.parts[0]).toEqual({ source: "form", value: 16 });
  });

  it("shows the form's laws and each next form with its needs on the Government tab (GOV-064)", () => {
    const w = createWorld(rules, 1, tiles);
    const v = governmentView(w, nation(w, "france"));
    expect(v.form).toBe("Feudal realm");
    expect(v.laws).toEqual({ succession: expect.any(String), colonialRange: 20, subjectReach: 0 });
    expect(v.next.map((x) => [x.id, x.way])).toEqual([
      ["diet_monarchy", "reform"],
      ["absolute_monarchy", "reform"],
      ["elective_monarchy", "condition"],
    ]);
    expect(v.next[1]!.needs).toEqual([
      { label: "G9 Professional bureaucracy", met: false },
      { label: "W12 Standing regiments", met: false },
    ]);
    expect(v.next[1]!.whyNot).toBe("needs G9 Professional bureaucracy");
  });

  it("has the AI reform in January when it meets the needs with twice the gold (GOV-052, GOV-063)", () => {
    const w = createWorld(rules, 1, tiles);
    const them = nation(w, "castile");
    w.research[them]!.known.add("G9");
    w.research[them]!.known.add("W12");
    w.nationTreasury[them] = reformGold(w, 300) * 2;
    w.date = { year: 1445, month: 1, day: 1 };
    monthlyGovernment(w, []);
    expect(formOf(w, them)).toBe("absolute_monarchy");
  });

  it("keeps forms and Custom in the save (GOV-065)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "france");
    setForm(w, me, "diet_monarchy");
    w.nationCustomOfficials[me] = 7;
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "france", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(formOf(back, me)).toBe("diet_monarchy");
    expect(back.nationCustomOfficials[me]).toBe(7);
  });
});
