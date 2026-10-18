import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createEngineHost, createWorld, processTurn, type World } from "../src/index.ts";
import { NOT_YET, noteBattle, noteInvention, notePeace, noteSiege, startAchievements, turnEndAchievements, achievementsView } from "../src/achievements.ts";
import { ACHIEVEMENTS } from "../src/domain/achievements/index.ts";
import { realmConfig } from "../src/domain/realm/index.ts";

const rules = loadDefaultRuleset();
const PRESET = Object.keys(realmConfig.food.presets)[0]!;

function setup(id = "france"): { w: World; me: number } {
  const w = createWorld(rules, 1);
  const me = w.nationIndex.get(id)!;
  w.player = me;
  startAchievements(w);
  return { w, me };
}

const earned = (w: World) => Object.keys(w.achievements!.campaign.earned);

describe("achievements in the live game", () => {
  it("leaves out only the rows whose systems are not built, and knows every id it names", () => {
    const ids = new Set(ACHIEVEMENTS.map((d) => d.id));
    for (const id of NOT_YET) expect(ids.has(id)).toBe(true);
    expect(ACHIEVEMENTS.length - NOT_YET.size).toBeGreaterThan(40);
  });

  it("earns nothing without a player realm", () => {
    const w = createWorld(rules, 1);
    startAchievements(w);
    expect(w.achievements).toBeUndefined();
    processTurn(w, [], -1);
  });

  it("plays a year: A Year in the Ledger after twelve months, First Harvest at the harvest, and hands each unlock over once", () => {
    const { w, me } = setup();
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      processTurn(w, [], me);
      seen.push(...achievementsView(w)!.fresh.map((u) => u.id));
    }
    expect(earned(w)).toContain("first_year");
    expect(earned(w)).toContain("first_harvest");
    expect(seen.filter((id) => id === "first_year")).toHaveLength(1);
    expect(achievementsView(w)!.fresh).toEqual([]);
    expect(w.achievements!.campaign.counters.gold).toBeGreaterThanOrEqual(0);
  });

  it("tests a moment at the turn's end: a castle stormed, a battle won against twice the men", () => {
    const { w, me } = setup();
    const foe = w.nationIndex.get("england")!;
    noteSiege(w, me, "stormed", 5);
    noteBattle(w, me, foe, 5000, 10000, 5);
    expect(earned(w)).toEqual([]);
    turnEndAchievements(w);
    expect(earned(w)).toEqual(expect.arrayContaining(["castle_by_storm", "first_castle", "outnumbered_win"]));
    const fresh = achievementsView(w)!.fresh;
    expect(fresh.find((u) => u.id === "castle_by_storm")?.province).toBe(5);
  });

  it("ignores moments of other realms", () => {
    const { w } = setup();
    const foe = w.nationIndex.get("england")!;
    noteSiege(w, foe, "terms", 5);
    turnEndAchievements(w);
    expect(earned(w)).not.toContain("castle_by_terms");
  });

  it("counts a peace the player signed", () => {
    const { w, me } = setup();
    const foe = w.nationIndex.get("england")!;
    notePeace(w, { attackers: [w.nationIds[me]!], defenders: [w.nationIds[foe]!] }, me, foe, []);
    turnEndAchievements(w);
    expect(earned(w)).toContain("first_peace");
  });

  it("reads an invention's era and name: printing before 1470", () => {
    const { w, me } = setup();
    noteInvention(w, me, "L5");
    turnEndAchievements(w);
    expect(earned(w)).toEqual(expect.arrayContaining(["first_invention", "printing_early"]));
  });

  it("checks a date row once, at the first turn end on or after its day", () => {
    const { w } = setup();
    w.date = { year: 1500, month: 1, day: 3 };
    turnEndAchievements(w);
    expect(earned(w)).toContain("reach_1500");
    expect(w.achievements!.campaign.datesChecked).toContain("reach_1500");
  });

  it("raises a food policy change from the order", () => {
    const { w, me } = setup();
    expect(applyNow(w, { type: "foodPreset", name: PRESET }, me).rejectedOrders).toEqual([]);
    turnEndAchievements(w);
    expect(earned(w)).toContain("food_policy_set");
  });

  it("carries the achievements in the snapshot once a realm is chosen", () => {
    const host = createEngineHost(() => rules);
    const r = host({ id: 1, type: "newGame", seed: 1, playerNation: "france" });
    const snap = (r.response as { snapshot: { achievements: { eligible: boolean; earned: object } } }).snapshot;
    expect(snap.achievements.eligible).toBe(true);
    expect(snap.achievements.earned).toEqual({});
  });
});
