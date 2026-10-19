import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset, type GoalDef } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { createGoals, goalAsks, goalPlacesHeldBy, goalPulls, monthlyGoals, nearestLand, restoreGoals, saveGoals, timeFactor } from "../src/goals.ts";
import { chronicleView, goalViews } from "../src/chronicle.ts";
import { aiDeclarations, relationState } from "../src/war.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const CONSTANTINOPLE: [number, number] = [28.98, 41.01];

const goal = (o: Partial<GoalDef>): GoalDef => ({
  realm: "ottomans",
  goal: "Take Constantinople",
  reason: "The city between the Ottomans' two halves",
  ends_when: "Holds Constantinople",
  window: [1444, 1460],
  weight: "strong",
  deviation: "",
  aim: { kind: "take", places: [{ name: "Constantinople", at: CONSTANTINOPLE }] },
  toward: ["fall_of_constantinople"],
  ...o,
});

/** A 1444 world whose realms have these goals, unshaken unless a preset is named. */
function withGoals(defs: GoalDef[], mode?: "historical" | "plausible" | "divergent", seed = 1): World {
  const w = createWorld(rules, seed, tiles);
  w.goals = createGoals(w, defs, mode);
  if (!mode) for (const g of w.goals.list) [g.weight, g.shaken, g.aim] = [{ weak: 0.5, normal: 1, strong: 2 }[defs[g.def]!.weight], "kept", defs[g.def]!.aim];
  monthlyGoals(w);
  return w;
}

describe("historical goals (EVT-085 to EVT-093)", () => {
  it("binds a place to the land province nearest it", () => {
    const w = createWorld(rules, 1, tiles);
    expect(w.provinceOwner[nearestLand(w, CONSTANTINOPLE)]).toBe(nation(w, "byzantium"));
  });

  it("pulls its realm toward the holder of its places while its time is near (EVT-087, EVT-089)", () => {
    const w = withGoals([goal({})]);
    expect(goalPulls(w, nation(w, "ottomans"))?.get(nation(w, "byzantium"))).toBeCloseTo(2);
    expect(goalPlacesHeldBy(w, nation(w, "ottomans"), nation(w, "byzantium"))).toEqual([nearestLand(w, CONSTANTINOPLE)]);
    const def = goal({ window: [1450, 1460] });
    expect(timeFactor(def, 1442)).toBe(0);
    expect(timeFactor(def, 1447.5)).toBeCloseTo(0.5);
    expect(timeFactor(def, 1455)).toBe(1);
    expect(timeFactor(def, 1466)).toBeCloseTo(0.5);
    expect(timeFactor(def, 1471)).toBe(0);
    expect(timeFactor(goal({ window: [1378, null] }), 1600)).toBe(1);
  });

  it("ends a goal when its reason ends (EVT-088)", () => {
    const w = withGoals([goal({}), goal({ realm: "byzantium", goal: "Hold the city", aim: { kind: "hold", places: [{ name: "Constantinople", at: CONSTANTINOPLE }] } }), goal({ realm: "castile", goal: "Ally Portugal", aim: { kind: "ally", target: "portugal" } })]);
    const city = nearestLand(w, CONSTANTINOPLE);
    w.provinceOwner[city] = nation(w, "ottomans");
    const g = w.diplomacy.graph;
    if (!dip.relations.has(g, "alliance", "castile", "portugal")) g.relations.push({ id: "test", type: "alliance", source: "castile", target: "portugal" } as (typeof g.relations)[number]);
    monthlyGoals(w);
    expect(w.goals!.list.map((x) => x.end?.why)).toEqual(["achieved", "lost", "achieved"]);
    expect(goalPulls(w, nation(w, "ottomans"))).toBeUndefined();
  });

  it("lapses a goal long past its window", () => {
    const w = withGoals([goal({ window: [1400, 1420] })]);
    expect(w.goals!.list[0]!.end?.why).toBe("lapsed");
  });

  it("shakes the goals by the seed and the preset: Free goes its own way more than Historical (EVT-086)", () => {
    const defs = Array.from({ length: 400 }, (_, k) => goal({ goal: `Goal ${k}`, alternative: k % 2 ? { kind: "fight", target: "byzantium" } : null }));
    const moved = (mode: "historical" | "divergent") => withGoals(defs, mode).goals!.list.filter((g) => g.shaken !== "kept").length;
    expect(moved("historical")).toBeLessThan(80);
    expect(moved("divergent")).toBeGreaterThan(160);
    const w = withGoals(defs, "historical");
    expect(w.goals!.list.every((g) => g.weight >= 2 * 0.5 * 1.5 && g.weight <= 2 * 1.5 * 1.5)).toBe(true);
    expect(w.goals!.list.filter((g) => g.shaken === "swapped").every((g) => g.aim?.kind === "fight")).toBe(true);
    expect(saveGoals(withGoals(defs, "historical"))).toEqual(saveGoals(w));
  });

  it("never steers the player's realm (EVT-092)", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = nation(w, "ottomans");
    w.goals = createGoals(w, [goal({})]);
    monthlyGoals(w);
    expect(goalPulls(w, w.player)).toBeUndefined();
    expect(goalPlacesHeldBy(w, w.player, nation(w, "byzantium"))).toEqual([]);
  });

  it("never lets a goal past the price of war: a weak realm does not march (EVT-090)", () => {
    const w = withGoals([goal({ realm: "byzantium", goal: "Beat the Ottomans", aim: { kind: "fight", target: "ottomans" } })]);
    w.rules.defines.war.aiDeclareChancePerMonth = 1;
    for (let k = 0; k < 20; k++) aiDeclarations(w, []);
    expect(relationState(w, nation(w, "byzantium"), nation(w, "ottomans")).state).not.toBe("war");
  });

  it("asks for envoys toward the realms its ally and subject goals name (EVT-091)", () => {
    const w = withGoals([goal({ realm: "castile", goal: "Ally Portugal", aim: { kind: "ally", target: "portugal" } })]);
    expect(goalAsks(w, nation(w, "castile"))).toEqual([{ target: nation(w, "portugal"), actions: ["propose_alliance", "arrange_marriage"], pull: 2 }]);
  });

  it("keeps every goal's state in a save (EVT-093)", () => {
    const w = withGoals([goal({}), goal({ window: [1400, 1420] })], "plausible");
    const copy = createWorld(rules, 9, tiles);
    copy.goals = createGoals(copy, w.goals!.defs);
    restoreGoals(copy, JSON.parse(JSON.stringify(saveGoals(w))));
    expect(saveGoals(copy)).toEqual(saveGoals(w));
  });
});

describe("the Chronicle (EVT-094 to EVT-096)", () => {
  const row = (w: World, key: string) => [...chronicleView(w).ahead, ...chronicleView(w).happened].find((r) => r.key === key);

  it("shows a turning point ahead on course, with the realms heading there", () => {
    const w = withGoals([goal({})]);
    const r = row(w, "fall_of_constantinople")!;
    expect(r).toMatchObject({ state: "on_course", year: 1453, heading: [{ realm: nation(w, "ottomans"), goal: 0 }] });
    expect(goalViews(w)).toEqual([{ goal: 0, realm: nation(w, "ottomans"), target: -1, swapped: false }]);
    expect(chronicleView(w).counts.on_course).toBeGreaterThan(0);
    // Nothing from before the start.
    expect(chronicleView(w).ahead.every((x) => x.year >= 1444)).toBe(true);
  });

  it("marks one that happened as in history, early or late", () => {
    const w = withGoals([]);
    w.events!.state.world.history.push({ event: "fall_of_constantinople", year: 1470, month: 5, roles: {} } as never);
    expect(row(w, "fall_of_constantinople")).toMatchObject({ state: "happened", happened: { year: 1470, timing: "late" } });
  });

  it("bends one long overdue, or whose goals have all gone", () => {
    const w = withGoals([goal({})]);
    w.goals!.list[0]!.shaken = "dropped";
    expect(row(w, "fall_of_constantinople")!.state).toBe("bent");
    const late = withGoals([]);
    late.date.year = 1470;
    expect(row(late, "fall_of_constantinople")!.state).toBe("bent");
  });

  it("marks one that can no longer happen as gone", () => {
    const w = withGoals([]);
    w.events!.state.invalidated.fall_of_constantinople = {};
    expect(row(w, "fall_of_constantinople")!.state).toBe("gone");
  });
});
