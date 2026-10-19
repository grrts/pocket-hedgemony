import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { personDies } from "../src/people.ts";
import { crownHeld } from "../src/leaderless.ts";
import { isPort } from "../src/navy.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const act = (w: World, order: Parameters<typeof applyNow>[1], who: number) => applyNow(w, order, who).rejectedOrders.map((r) => r.reason);
/** A living army of realm n under a general, and its general. */
const ledArmy = (w: World, n: number) => {
  const a = w.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n && a.commander[i]! >= 0 && a.battle[i]! < 0) return { i, c: a.commander[i]! };
  throw new Error("no led army");
};
const place = (w: World, i: number, p: number) => {
  w.armies.location[i] = p;
  w.armies.tile[i] = w.tiles.centre[p]!;
};

describe("men and ships whose commander dies (RECR-135 to RECR-137)", () => {
  it("leaves a dead general's army in his crown province as its garrison", () => {
    const w = createWorld(rules, 1, tiles);
    const n = nation(w, "france");
    const { i, c } = ledArmy(w, n);
    const home = w.provinceIndex.get(w.rules.nations[n]!.capital)!;
    place(w, i, home);
    personDies(w, { kind: "commander", c }, "old age", []);
    expect(w.armies.commander[i]).toBe(-1);
    expect(w.armies.location[i]).toBe(home);
    expect(w.armies.route[i]).toEqual([]);
    expect(w.armies.retreating[i]).toBe(0);
  });

  it("walks a dead general's army out of a lord's land to the nearest crown province, where it stands as a garrison", () => {
    const w = createWorld(rules, 1, tiles);
    const n = nation(w, "france");
    const lordLand = [...w.provinceLord.keys()].find((p) => w.provinceOwner[p] === n && w.provinceLord[p]! >= 0)!;
    expect(lordLand).toBeDefined();
    const { i, c } = ledArmy(w, n);
    place(w, i, lordLand);
    const news: { text: string }[] = [];
    w.player = n;
    personDies(w, { kind: "commander", c }, "old age", news as never);
    expect(w.armies.commander[i]).toBe(-1);
    expect(w.armies.retreating[i]).toBe(1);
    const to = w.armies.route[i]!.at(-1)!;
    expect(crownHeld(w, n, to)).toBe(true);
    expect(news.some((x) => /march for .* without him/.test(x.text))).toBe(true);
    // It takes no orders on the way.
    expect(act(w, { type: "move", army: i, to: lordLand }, n)[0]).toMatch(/without a commander/);
    for (let t = 0; t < 12 && w.armies.route[i]!.length; t++) processTurn(w, [], n);
    expect(w.armies.alive[i]).toBe(1);
    expect(crownHeld(w, n, w.armies.location[i]!)).toBe(true);
    expect(w.armies.retreating[i]).toBe(0);
  });

  it("sails a dead admiral's fleet to the nearest port of its own realm, with no token on the map", () => {
    const w = createWorld(rules, 1, tiles);
    const n = nation(w, "venice");
    w.player = n;
    w.nationTreasury[n] = 1000;
    const f = w.navy.fleets.find((x) => x.owner === n)!;
    const post = w.provinceOfficial.findIndex((o, q) => o >= 0 && w.provinceOwner[q] === n && w.provinceLord[q]! < 0);
    expect(act(w, { type: "commission", province: post, sea: true }, n)).toEqual([]);
    const c = w.commanderIds.length - 1;
    expect(act(w, { type: "navy", do: "admiral", fleet: f.id, commander: c }, n)).toEqual([]);
    // Out to sea, two zones off its port.
    const port = f.at;
    const sea = w.adjList.subarray(w.adjStart[port]!, w.adjStart[port + 1]!).find((q) => w.provinceWater[q])!;
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: sea }, n)).toEqual([]);
    for (let t = 0; t < 6 && !w.provinceWater[f.at]; t++) processTurn(w, [], n);
    expect(w.provinceWater[f.at]).toBe(1);
    personDies(w, { kind: "commander", c }, "at sea", []);
    expect(f.admiral).toBe(-1);
    expect(f.fleeing).toBe(true);
    const to = f.route.at(-1)!;
    expect(isPort(w, to) && w.provinceOwner[to] === n).toBe(true);
    for (let t = 0; t < 8 && f.route.length; t++) processTurn(w, [], n);
    expect(w.provinceWater[f.at]).toBe(0);
    expect(w.provinceOwner[f.at]).toBe(n);
  });
});
