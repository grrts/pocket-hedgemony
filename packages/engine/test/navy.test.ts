import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { advance, applyNow, createWorld, LEDGER, LEDGER_LINES, processTurn, relationState, type World } from "../src/index.ts";
import { callable, fleetById, harbourStep, isPort, navyView, planVoyage, type NavyFleet } from "../src/navy.ts";
import { STEPS_PER_DAY } from "../src/turn.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const p = (w: World, name: string) => w.rules.provinces.findIndex((x) => x.name === name);
const capital = (w: World, id: string) => w.provinceIndex.get(rules.nations[n(w, id)]!.capital)!;
const act = (w: World, order: Parameters<typeof applyNow>[1], who: number) => applyNow(w, order, who).rejectedOrders.map((r) => r.reason);
const fleetsOf = (w: World, who: number): NavyFleet[] => w.navy.fleets.filter((f) => f.owner === who);

/** A port of the realm's with a shipyard (the best one), for buying warships. */
function bestPort(w: World, who: number): number {
  let best = -1;
  for (let q = 0; q < w.provinceCount; q++) if (w.provinceOwner[q] === who && isPort(w, q) && (best < 0 || w.navy.shipyard[q]! > w.navy.shipyard[best]!)) best = q;
  return best;
}

/** Musters a crew, waits for it, and buys a ship; returns the port. */
function buy(w: World, who: number, port: number, ship: string, count = 1): void {
  w.nationTreasury[who] = 1000;
  const crew = { cog: 30, galley: 180, carrack: 60 }[ship] ?? 200;
  expect(act(w, { type: "navy", do: "muster", province: port, sailors: crew * count }, who)).toEqual([]);
  advance(w, STEPS_PER_DAY * 15);
  for (let i = 0; i < count; i++) expect(act(w, { type: "navy", do: "buy", province: port, ship }, who)).toEqual([]);
}

describe("ports and fleets", () => {
  it("starts the 1444 ports: harbours, and Venice's Arsenal", () => {
    const w = createWorld(rules, 1, tiles);
    const venice = capital(w, "venice");
    expect(harbourStep(w, venice)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...w.navy.shipyard)).toBe(4);
    const lisbon = capital(w, "portugal");
    expect(isPort(w, lisbon)).toBe(true);
    expect(callable(w, lisbon)).toBeGreaterThan(100);
  });

  it("musters sailors who are ready in two weeks, then buys and launches a ship", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "portugal");
    w.player = me;
    const lisbon = capital(w, "portugal");
    const before = w.provinceRecruits[lisbon]!;
    expect(act(w, { type: "navy", do: "buy", province: lisbon, ship: "cog" }, me)).toEqual(["needs 30 sailors in port"]);
    expect(act(w, { type: "navy", do: "muster", province: lisbon, sailors: 30 }, me)).toEqual([]);
    // The men at sea come out of the levy pool at once (NAVY-027).
    expect(w.provinceRecruits[lisbon]).toBe(before - 30);
    expect(w.navy.sailors[lisbon]).toBe(0);
    advance(w, STEPS_PER_DAY * 15);
    expect(w.navy.sailors[lisbon]).toBe(30);
    expect(act(w, { type: "navy", do: "buy", province: lisbon, ship: "galleon" }, me)[0]).toMatch(/needs/);
    expect(act(w, { type: "navy", do: "buy", province: lisbon, ship: "cog" }, me)).toEqual([]);
    expect(w.navy.sailors[lisbon]).toBe(0);
    expect(navyView(w, me).ports.find((x) => x.province === lisbon)!.building).toHaveLength(1);
    for (let t = 0; t < 20 && !fleetsOf(w, me).length; t++) processTurn(w, [], me);
    const [f] = fleetsOf(w, me);
    expect(f!.ships.map((s) => s.type)).toEqual(["cog"]);
    expect(f!.at).toBe(lisbon);
    // The ledger pays the ship's upkeep and crew.
    expect(w.nationLedger[me * LEDGER_LINES + LEDGER.indexOf("navy")]).toBeLessThan(0);
  });

  it("sails to a sea zone at the pace of its ships, and an army sails to a shore and lands", () => {
    const w = createWorld(rules, 2, tiles);
    const me = n(w, "england");
    w.player = me;
    const port = bestPort(w, me);
    buy(w, me, port, "cog", 2);
    for (let t = 0; t < 30 && w.navy.hulls.length; t++) processTurn(w, [], me);
    const f = fleetsOf(w, me)[0]!;
    expect(f.ships).toHaveLength(2);
    // An army in the port boards: it needs an admiral first.
    const post = w.provinceOfficial.findIndex((o, q) => o >= 0 && w.provinceOwner[q] === me && q !== port && w.provinceLord[q]! < 0);
    expect(act(w, { type: "commission", province: post }, me)).toEqual([]);
    const c = w.commanderIds.length - 1;
    let slot = -1;
    for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i] && w.armies.owner[i] === me && w.armies.commander[i]! >= 0) slot = i;
    w.armies.location[slot] = port;
    w.armies.tile[slot] = w.tiles.centre[port]!;
    w.armies.men[slot] = 400;
    w.armies.horse[slot] = 20;
    expect(act(w, { type: "navy", do: "board", fleet: f.id, army: slot }, me)).toEqual([]);
    // Brittany's coast, across the Channel, landed on at war.
    const target = p(w, "Côtes-d'Armor");
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: target }, me)[0]).toMatch(/admiral/);
    expect(act(w, { type: "navy", do: "admiral", fleet: f.id, commander: c }, me)).toEqual([]);
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: target }, me)[0]).toMatch(/right to land/);
    expect(act(w, { type: "declareWar", target: n(w, "brittany") }, me)).toEqual([]);
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: target }, me)).toEqual([]);
    expect(f.landAt).toBe(target);
    // At sea the army stands in the fleet's zone, out of reach on land.
    for (let t = 0; t < 12 && w.armies.location[slot] !== target; t++) {
      processTurn(w, [], me);
      if (fleetById(w, f.id)!.army === slot) expect(w.armies.retreating[slot]).toBe(1);
    }
    expect(w.armies.location[slot]).toBe(target);
    expect(w.armies.retreating[slot]).toBe(0);
    expect(f.army).toBe(-1);
  });

  it("keeps ships off the open ocean without the compass, and galleys off it always", () => {
    const w = createWorld(rules, 3, tiles);
    const me = n(w, "england");
    const port = bestPort(w, me);
    const fleet: NavyFleet = { id: 999, owner: me, at: port, route: [], progress: 0, admiral: -1, ships: [{ id: 1, type: "galley", crew: 180, hull: 0, supply: 6, damage: 0, wear: 0, age: 0, home: port }], army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false };
    const far = w.rules.provinces.findIndex((x, q) => x.terrain === "ocean" && w.navy.coastDist[q]! > 5);
    expect(planVoyage(w, fleet, (q) => q === far)).toBeNull();
  });

  it("fights a sea battle round by round: the weaker fleet loses ships and runs for port", () => {
    const w = createWorld(rules, 4, tiles);
    const a = n(w, "venice");
    const b = n(w, "genoa");
    const pa = bestPort(w, a);
    const pb = bestPort(w, b);
    buy(w, a, pa, "galley", 3);
    buy(w, b, pb, "galley", 1);
    for (let t = 0; t < 40 && w.navy.hulls.some((h) => h.owner === a || h.owner === b); t++) processTurn(w, [], -1);
    const fa = fleetsOf(w, a)[0]!;
    const fb = fleetsOf(w, b)[0]!;
    // Out of the way of the AI, which keeps its own fleets moving.
    w.player = a;
    if (relationState(w, a, b).state !== "war") expect(act(w, { type: "declareWar", target: b }, a)).toEqual([]);
    // Both fleets meet in a zone beside Genoa's port.
    const zone = w.adjList.subarray(w.adjStart[pb]!, w.adjStart[pb + 1]!).find((q) => !!w.provinceWater[q])!;
    for (const f of [fa, fb]) {
      f.at = zone;
      f.route = [];
      f.admiral = -1;
    }
    const news = advance(w, STEPS_PER_DAY * 4);
    expect(news.some((x) => x.kind === "battle" && /sea battle begins/.test(x.text))).toBe(true);
    expect(news.some((x) => x.kind === "battle" && /is over/.test(x.text))).toBe(true);
    const left = fleetsOf(w, b)[0];
    expect(!left || left.ships.length === 0 || left.fleeing || left.at !== zone).toBe(true);
    expect(fleetsOf(w, a)[0]!.ships.length).toBeGreaterThan(0);
    expect(navyView(w, a).battles).toHaveLength(0);
  });
});
