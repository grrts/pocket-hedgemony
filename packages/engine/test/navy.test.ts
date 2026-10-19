import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { advance, applyNow, createWorld, LEDGER, LEDGER_LINES, processTurn, relationState, WORK_COUNT, workIndex, type World } from "../src/index.ts";
import { callable, fleetById, harbourStep, isPort, navyView, planVoyage, shipyardOf, type NavyFleet } from "../src/navy.ts";
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
  for (let q = 0; q < w.provinceCount; q++) if (w.provinceOwner[q] === who && isPort(w, q) && (best < 0 || shipyardOf(w, q) > shipyardOf(w, best))) best = q;
  return best;
}

/** Orders ships, musters their crews and waits until every one is laid down. */
function buy(w: World, who: number, port: number, ship: string, count = 1): void {
  w.nationTreasury[who] = 1000;
  const crew = { cog: 30, galley: 180, carrack: 60 }[ship] ?? 200;
  for (let i = 0; i < count; i++) expect(act(w, { type: "navy", do: "buy", province: port, ship }, who)).toEqual([]);
  for (let d = 0; d < 400 && w.navy.orders.some((o) => o.owner === who && o.province === port); d++) {
    if (!w.navy.musters.some((m) => m.province === port)) expect(act(w, { type: "navy", do: "muster", province: port, sailors: crew }, who)).toEqual([]);
    advance(w, STEPS_PER_DAY);
  }
  expect(w.navy.orders.filter((o) => o.owner === who)).toEqual([]);
}

describe("ports and fleets", () => {
  it("starts the 1444 ports: harbours, and Venice's Arsenal", () => {
    const w = createWorld(rules, 1, tiles);
    const venice = capital(w, "venice");
    expect(harbourStep(w, venice)).toBeGreaterThanOrEqual(1);
    expect(shipyardOf(w, w.navy.arsenal)).toBe(4);
    const lisbon = capital(w, "portugal");
    expect(isPort(w, lisbon)).toBe(true);
    expect(callable(w, lisbon)).toBeGreaterThan(100);
  });

  it("musters sailors who are ready in two weeks, then buys and launches a ship", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "portugal");
    w.player = me;
    // Without the fleet Portugal starts with (F-115), so the new ship has a fleet of its own.
    w.navy.fleets = w.navy.fleets.filter((f) => f.owner !== me);
    const lisbon = capital(w, "portugal");
    const before = w.provinceRecruits[lisbon]!;
    w.nationTreasury[me] = 1000;
    // Portugal knows the carrack in 1444: Lisbon's shipyard builds it, and no longer offers the cog it replaces (D-NAVY-33).
    const view = () => navyView(w, me).ports.find((x) => x.province === lisbon)!;
    expect(view().ships.map((x) => x.type)).toContain("carrack");
    expect(view().ships.map((x) => x.type)).not.toContain("cog");
    expect(act(w, { type: "navy", do: "buy", province: lisbon, ship: "cog" }, me)).toEqual(["replaced by the carrack"]);
    expect(act(w, { type: "navy", do: "buy", province: lisbon, ship: "galleon" }, me)[0]).toMatch(/needs/);
    // Ordered with no crew in port, the carrack waits in the queue for its 60 sailors.
    expect(act(w, { type: "navy", do: "buy", province: lisbon, ship: "carrack" }, me)).toEqual([]);
    expect(view().queue.map((x) => x.waiting)).toEqual(["waiting for 60 more sailors"]);
    expect(view().crewShort).toBe(60);
    // Sailors join the muster queue in batches of 50, one after another, each two weeks.
    expect(act(w, { type: "navy", do: "muster", province: lisbon, sailors: 100 }, me)).toEqual([]);
    // The men at sea come out of the levy pool at once (NAVY-027).
    expect(w.provinceRecruits[lisbon]).toBe(before - 100);
    expect(view().musterQueue.map((m) => [m.sailors, m.days])).toEqual([[50, 14], [50, 28]]);
    // The last batch can be taken off the queue, its bounty and men back.
    expect(act(w, { type: "navy", do: "unmuster", province: lisbon }, me)).toEqual([]);
    expect(w.provinceRecruits[lisbon]).toBe(before - 50);
    expect(act(w, { type: "navy", do: "muster", province: lisbon, sailors: 50 }, me)).toEqual([]);
    advance(w, STEPS_PER_DAY * 15);
    expect(w.navy.sailors[lisbon]).toBe(50);
    expect(view().building).toHaveLength(0);
    advance(w, STEPS_PER_DAY * 15);
    // The second batch in, the carrack is laid down with its crew.
    expect(view().queue).toHaveLength(0);
    expect(view().building.map((b) => b.type)).toEqual(["carrack"]);
    expect(w.navy.sailors[lisbon]).toBe(40);
    for (let t = 0; t < 40 && !fleetsOf(w, me).length; t++) processTurn(w, [], me);
    const [f] = fleetsOf(w, me);
    expect(f!.ships.map((s) => s.type)).toEqual(["carrack"]);
    expect(f!.at).toBe(lisbon);
    // The ledger pays the ship's upkeep and crew.
    expect(w.nationLedger[me * LEDGER_LINES + LEDGER.indexOf("navy")]).toBeLessThan(0);
  });

  it("needs a shipyard to muster sailors and build ships, and a harbour to build the shipyard", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "portugal");
    w.player = me;
    w.nationTreasury[me] = 1000;
    const yard = workIndex("shipyard");
    // Lisbon, its shipyard taken down.
    const port = capital(w, "portugal");
    w.provinceWorks[port * WORK_COUNT + yard] = 0;
    expect(act(w, { type: "navy", do: "muster", province: port, sailors: 50 }, me)[0]).toMatch(/shipyard/);
    expect(act(w, { type: "navy", do: "buy", province: port, ship: "carrack" }, me)).toEqual(["needs a shipyard"]);
    expect(navyView(w, me).ports.find((x) => x.province === port)!.ships).toEqual([]);
    // A coast with no harbour can't take a shipyard.
    const shore = w.provinceOwner.findIndex((o, q) => o === me && !!w.rules.provinces[q]!.coastal && !w.provinceWater[q] && !isPort(w, q));
    if (shore >= 0) expect(act(w, { type: "build", province: shore, work: yard }, me)).toEqual(["needs a harbour first"]);
    // Built, the shipyard musters and builds.
    w.provinceWorks[port * WORK_COUNT + yard] = 1;
    expect(act(w, { type: "navy", do: "muster", province: port, sailors: 50 }, me)).toEqual([]);
    expect(act(w, { type: "navy", do: "buy", province: port, ship: "cog" }, me)).toEqual([]);
    // The cog stays offered at a slipway yard, which can't build the carrack that would replace it.
    expect(navyView(w, me).ports.find((x) => x.province === port)!.later.map((x) => [x.type, x.why])).toContainEqual(["carrack", "needs a shipyard here"]);
    // The last ship waiting can be taken off the queue for its gold.
    const gold = w.nationTreasury[me]!;
    expect(act(w, { type: "navy", do: "unorder", province: port }, me)).toEqual([]);
    expect(w.nationTreasury[me]).toBeGreaterThan(gold);
    expect(w.navy.orders).toHaveLength(0);
  });

  it("sails to a sea zone at the pace of its ships, and an army sails to a shore and lands", () => {
    const w = createWorld(rules, 2, tiles);
    const me = n(w, "england");
    w.player = me;
    w.navy.fleets = w.navy.fleets.filter((f) => f.owner !== me);
    const port = bestPort(w, me);
    buy(w, me, port, "cog", 2);
    for (let t = 0; t < 30 && w.navy.hulls.length; t++) processTurn(w, [], me);
    const f = fleetsOf(w, me)[0]!;
    expect(f.ships).toHaveLength(2);
    // An army in the port boards: it needs an admiral first.
    const post = w.provinceOfficial.findIndex((o, q) => o >= 0 && w.provinceOwner[q] === me && q !== port && w.provinceLord[q]! < 0);
    // A general can't lead a fleet: the official is commissioned as admiral (RECR-128).
    expect(act(w, { type: "commission", province: post, sea: true }, me)).toEqual([]);
    const c = w.commanderIds.length - 1;
    expect(w.commanderSea[c]).toBe(1);
    const general = w.commanderIds.findIndex((_, k) => w.commanderOwner[k] === me && !w.commanderSea[k]);
    expect(act(w, { type: "navy", do: "admiral", fleet: f.id, commander: general }, me)[0]).toMatch(/general leads armies/);
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
    // No enemy fleet on the way and no Breton levy mustering on the shore: this is about the crossing and the landing.
    w.navy.fleets = w.navy.fleets.filter((x) => x.owner === me);
    w.musters = w.musters.filter((m) => m.province !== target);
    const clearShore = () => {
      for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === n(w, "brittany") && w.armies.location[i] === target) w.armies.alive[i] = 0;
    };
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: target }, me)).toEqual([]);
    expect(f.landAt).toBe(target);
    // At sea the army stands in the fleet's zone, out of reach on land.
    for (let t = 0; t < 12 && w.armies.location[slot] !== target; t++) {
      clearShore();
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
    const fleet: NavyFleet = { id: 999, owner: me, at: port, tile: -1, path: [], pathAt: 0, legHours: 0, goal: -1, post: "admiral", blockading: false, route: [], progress: 0, admiral: -1, ships: [{ id: 1, type: "galley", crew: 180, hull: 0, supply: 6, damage: 0, wear: 0, age: 0, home: port }], army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false };
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
    // Ships launched in different months may lie in different fleets: each side's are gathered into one.
    const gather = (who: number): NavyFleet => {
      const [f, ...rest] = fleetsOf(w, who).sort((x, y) => y.ships.length - x.ships.length);
      for (const g of rest) f!.ships.push(...g.ships.splice(0));
      return f!;
    };
    const fa = gather(a);
    const fb = gather(b);
    // Out of the way of the AI, which keeps its own fleets moving.
    w.player = a;
    if (relationState(w, a, b).state !== "war") expect(act(w, { type: "declareWar", target: b }, a)).toEqual([]);
    // Both fleets meet in a zone beside Genoa's port.
    const zone = w.adjList.subarray(w.adjStart[pb]!, w.adjStart[pb + 1]!).find((q) => !!w.provinceWater[q])!;
    for (const f of [fa, fb]) {
      f.at = zone;
      f.tile = w.tiles.centre[zone]!;
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
