import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { advance, applyNow, createWorld, type World } from "../src/index.ts";
import { tileDistance } from "../src/war.ts";
import { anchorage, closedBy, monthlyNavy, navyView, newFleet, refreshBlockades, restoreNavy, saveNavy, seaRange, tradeShipMayPass, type NavyFleet } from "../src/navy.ts";
import { WATER } from "../src/tiles.ts";
import { STEPS_PER_DAY } from "../src/turn.ts";

/** Fleets at sea (feedback 122, 123, 124, 127; NAVY-147..145). */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const p = (w: World, name: string) => w.rules.provinces.findIndex((x) => x.name === name);
const capital = (w: World, id: string) => w.provinceIndex.get(rules.nations[n(w, id)]!.capital)!;
const act = (w: World, order: Parameters<typeof applyNow>[1], who: number) => applyNow(w, order, who).rejectedOrders.map((r) => r.reason);
const zoneOf = (w: World, t: number) => (w.tiles.cell[t] === WATER ? w.tiles.province[t]! - 1 : -1);
const seaBeside = (w: World, q: number) => Array.from(w.adjList.subarray(w.adjStart[q]!, w.adjStart[q + 1]!)).filter((z) => !!w.provinceWater[z]);

/** A fleet of `count` ships of one type for realm `who` at `at` (a port or a zone), with crews and supply. */
function fleet(w: World, who: number, at: number, type: string, count = 1): NavyFleet {
  const f = newFleet(w, who, at, w.provinceWater[at] ? w.tiles.centre[at]! : anchorage(w, at));
  const crew = { cog: 30, galley: 180, carrack: 60, caravel: 25 }[type] ?? 200;
  for (let i = 0; i < count; i++) f.ships.push({ id: ++w.navy.seq, type, crew, hull: 0, supply: 30, damage: 0, wear: 0, age: 0, home: -1 });
  return f;
}

/** A commander of realm `who` made from an official, free of any army. */
function commander(w: World, who: number): number {
  w.nationTreasury[who] = 1000;
  const post = w.provinceOfficial.findIndex((o, q) => o >= 0 && w.provinceOwner[q] === who && w.provinceLord[q]! < 0);
  expect(act(w, { type: "commission", province: post }, who)).toEqual([]);
  return w.commanderIds.length - 1;
}

/** Water tiles of zone z, as [tile, x, y]. */
function zoneTiles(w: World, z: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const b = w.tiles.bounds;
  for (let y = b[z * 4 + 1]!; y <= b[z * 4 + 3]!; y++) for (let x = b[z * 4]!; x <= b[z * 4 + 2]!; x++) if (zoneOf(w, y * w.tiles.width + x) === z) out.push([y * w.tiles.width + x, x, y]);
  return out;
}

describe("fleets sail tile by tile (NAVY-147..134)", () => {
  it("lies at its port's anchorage and sails over water, a little each step, into the zone of its tile", () => {
    const w = createWorld(rules, 11, tiles);
    const me = n(w, "portugal");
    w.player = me;
    const lisbon = capital(w, "portugal");
    const f = fleet(w, me, lisbon, "cog", 2);
    expect(zoneOf(w, f.tile)).toBeGreaterThanOrEqual(0);
    expect(seaBeside(w, lisbon)).toContain(zoneOf(w, f.tile));
    // Out past the first zone off the coast.
    const first = zoneOf(w, f.tile);
    const far = seaBeside(w, first).flatMap((z) => seaBeside(w, z)).find((z) => z !== first && !w.navy.ocean[z] && !seaBeside(w, lisbon).includes(z))!;
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: far }, me)).toEqual([]);
    const seen = new Set<number>([f.tile]);
    for (let s = 0; s < STEPS_PER_DAY * 30 && f.route.length; s++) {
      advance(w, 1);
      seen.add(f.tile);
      expect(w.tiles.cell[f.tile]).toBe(WATER);
      if (w.provinceWater[f.at]) expect(zoneOf(w, f.tile)).toBe(f.at);
    }
    expect(f.route).toEqual([]);
    expect(f.at).toBe(far);
    expect(f.tile).toBe(w.tiles.centre[far]);
    // Many tiles on the way, not a jump from zone to zone.
    expect(seen.size).toBeGreaterThan(10);
  });

  it("sails to the spot of a zone the player tapped", () => {
    const w = createWorld(rules, 12, tiles);
    const me = n(w, "portugal");
    w.player = me;
    const zone = seaBeside(w, capital(w, "portugal"))[0]!;
    const f = fleet(w, me, zone, "cog");
    const spot = zoneTiles(w, zone).sort((a, b) => tileDistance(w, b[0], f.tile) - tileDistance(w, a[0], f.tile))[0]![0];
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: zone, tile: spot }, me)).toEqual([]);
    advance(w, STEPS_PER_DAY * 20);
    expect(f.tile).toBe(spot);
    expect(f.at).toBe(zone);
    const view = navyView(w, me).fleets.find((x) => x.id === f.id)!;
    expect(view.tile).toBe(spot);
  });

  it("keeps its tile and leg through a save", () => {
    const w = createWorld(rules, 13, tiles);
    const me = n(w, "portugal");
    const lisbon = capital(w, "portugal");
    const f = fleet(w, me, lisbon, "cog");
    const zone = seaBeside(w, lisbon)[0]!;
    expect(act(w, { type: "navy", do: "sail", fleet: f.id, to: seaBeside(w, zone).find((z) => z !== zone)! }, me)).toEqual([]);
    advance(w, 3);
    const saved = JSON.parse(JSON.stringify(saveNavy(w)));
    const before = { tile: f.tile, path: f.path.slice(), pathAt: f.pathAt };
    restoreNavy(w, saved, (x) => x, (x) => x, (x) => x);
    const g = w.navy.fleets.find((x) => x.id === f.id)!;
    expect({ tile: g.tile, path: g.path, pathAt: g.pathAt }).toEqual(before);
  });
});

describe("wider sea encounters (NAVY-150, NAVY-151)", () => {
  it("meets an enemy fleet in its own zone only within sight: 20 tiles and a tile a point of Cunning, at most 30", () => {
    const w = createWorld(rules, 14, tiles);
    const a = n(w, "venice");
    const b = n(w, "genoa");
    w.player = a;
    expect(act(w, { type: "declareWar", target: b }, a)).toEqual([]);
    // A big open zone, so the fleets can lie far apart in it.
    const b4 = w.tiles.bounds;
    const zone = w.rules.provinces.findIndex((_, q) => !!w.provinceWater[q] && b4[q * 4 + 2]! - b4[q * 4]! > 45 && b4[q * 4 + 2]! - b4[q * 4]! < 200 && b4[q * 4 + 3]! - b4[q * 4 + 1]! > 45 && zoneTiles(w, q).length > 1800);
    expect(zone).toBeGreaterThanOrEqual(0);
    const all = zoneTiles(w, zone);
    const [t0] = all[Math.floor(all.length / 2)]!;
    const far = all.find(([t]) => tileDistance(w, t, t0) > 24 && tileDistance(w, t, t0) < 30)![0];
    const fa = fleet(w, a, zone, "galley", 2);
    const fb = fleet(w, b, zone, "galley", 1);
    fa.tile = t0;
    fb.tile = far;
    expect(seaRange(w, fa)).toBe(20);
    advance(w, 2);
    expect(fa.battle).toBe(-1);
    expect(fb.battle).toBe(-1);
    // Within 20 tiles they meet.
    fb.tile = all.find(([t]) => tileDistance(w, t, t0) > 12 && tileDistance(w, t, t0) < 18)![0];
    advance(w, 1);
    expect(fa.battle).toBeGreaterThanOrEqual(0);
    expect(fb.battle).toBe(fa.battle);
    expect(navyView(w, a).battles[0]!.tile).toBeGreaterThanOrEqual(0);
    // A leader's Cunning widens the sight, to 30 at most.
    fa.admiral = commander(w, a);
    w.commanders[fa.admiral]!.cunning = 4;
    expect(seaRange(w, fa)).toBe(24);
    w.commanders[fa.admiral]!.cunning = 40;
    expect(seaRange(w, fa)).toBe(30);
  });

  it("never meets an enemy fleet in another zone, however close", () => {
    const w = createWorld(rules, 15, tiles);
    const a = n(w, "venice");
    const b = n(w, "genoa");
    w.player = a;
    expect(act(w, { type: "declareWar", target: b }, a)).toEqual([]);
    const port = capital(w, "genoa");
    const z1 = seaBeside(w, port)[0]!;
    const z2 = seaBeside(w, z1).find((z) => z !== z1)!;
    // The two tiles nearest each other across the border of the zones.
    const t1 = zoneTiles(w, z1);
    const t2 = zoneTiles(w, z2);
    let best: [number, number] = [t1[0]![0], t2[0]![0]];
    let bestD = Infinity;
    for (const [x] of t1.filter((_, i) => i % 7 === 0)) for (const [y] of t2.filter((_, i) => i % 7 === 0)) if (tileDistance(w, x, y) < bestD) ((bestD = tileDistance(w, x, y)), (best = [x, y]));
    expect(bestD).toBeLessThan(15);
    const fa = fleet(w, a, z1, "galley", 2);
    const fb = fleet(w, b, z2, "galley", 1);
    fa.tile = best[0];
    fb.tile = best[1];
    advance(w, 2);
    expect(fa.battle).toBe(-1);
    expect(fb.battle).toBe(-1);
  });
});

describe("leader posts (NAVY-152..139)", () => {
  it("appoints a commodore to trade ships, an admiral to warships, and lets the post be changed", () => {
    const w = createWorld(rules, 16, tiles);
    const me = n(w, "portugal");
    const lisbon = capital(w, "portugal");
    const traders = fleet(w, me, lisbon, "cog", 2);
    const war = fleet(w, me, lisbon, "galley", 1);
    const c1 = commander(w, me);
    const c2 = commander(w, me);
    expect(act(w, { type: "navy", do: "admiral", fleet: traders.id, commander: c1 }, me)).toEqual([]);
    expect(traders.post).toBe("commodore");
    expect(act(w, { type: "navy", do: "admiral", fleet: war.id, commander: c2 }, me)).toEqual([]);
    expect(war.post).toBe("admiral");
    expect(act(w, { type: "navy", do: "post", fleet: war.id, post: "viceroy" }, me)).toEqual([]);
    expect(war.post).toBe("viceroy");
    expect(act(w, { type: "navy", do: "post", fleet: war.id, post: "pirate" as never }, me)).toEqual(["no such post"]);
    const view = navyView(w, me);
    expect(view.posts.map((x) => x.key)).toEqual(["admiral", "commodore", "viceroy"]);
    expect(view.fleets.find((x) => x.id === traders.id)!.post).toBe("commodore");
  });
});

describe("blockades (NAVY-155..144)", () => {
  /** England and Brittany, an English war fleet lying off Brittany's coast. */
  function setUp(seed: number) {
    const w = createWorld(rules, seed, tiles);
    const me = n(w, "england");
    const fr = n(w, "brittany");
    w.player = me;
    const coast = w.rules.provinces.findIndex((x, q) => w.provinceOwner[q] === fr && x.coastal && seaBeside(w, q).length > 0);
    const zone = seaBeside(w, coast)[0]!;
    const f = fleet(w, me, zone, "galley", 2);
    f.admiral = commander(w, me);
    return { w, me, fr, coast, zone, f };
  }

  it("closes the enemy's coast beside the zone while it lies still there, and the zone to their trade ships", () => {
    const { w, me, fr, coast, zone, f } = setUp(21);
    refreshBlockades(w, []);
    expect(f.blockading).toBe(false);
    expect(act(w, { type: "declareWar", target: fr }, me)).toEqual([]);
    const news: Parameters<typeof refreshBlockades>[1] = [];
    refreshBlockades(w, news);
    expect(f.blockading).toBe(true);
    expect(closedBy(w, me, zone)).toContain(coast);
    expect(w.navy.blockade[coast]).toBe(me + 1);
    expect(news.some((x) => /closes/.test(x.text))).toBe(true);
    expect(tradeShipMayPass(w, fr, zone)).toBe(false);
    expect(tradeShipMayPass(w, me, zone)).toBe(true);
    const view = navyView(w, me);
    expect(view.blockades.find((b) => b.fleet === f.id)!.ports).toContain(coast);
    // A French commodore lying in the zone escorts French trade ships through.
    const escort = fleet(w, fr, zone, "cog", 1);
    escort.admiral = commander(w, fr);
    escort.post = "commodore";
    escort.tile = w.tiles.centre[zone]!;
    refreshBlockades(w, []);
    expect(tradeShipMayPass(w, fr, zone)).toBe(true);
    // Sailing on ends it.
    w.navy.fleets.splice(w.navy.fleets.indexOf(escort), 1);
    f.route = [seaBeside(w, zone).find((z) => z !== zone)!];
    refreshBlockades(w, []);
    expect(f.blockading).toBe(false);
    expect(w.navy.blockade[coast]).toBe(0);
  });

  it("needs a warship and a leader", () => {
    const { w, me, fr, f } = setUp(22);
    expect(act(w, { type: "declareWar", target: fr }, me)).toEqual([]);
    f.admiral = -1;
    refreshBlockades(w, []);
    expect(f.blockading).toBe(false);
    const traders = fleet(w, me, f.at, "cog", 3);
    traders.admiral = commander(w, me);
    refreshBlockades(w, []);
    expect(traders.blockading).toBe(false);
  });

  it("pays prize money each month from the ports it closes, more under a commodore", () => {
    const { w, me, fr, coast, f } = setUp(23);
    expect(act(w, { type: "declareWar", target: fr }, me)).toEqual([]);
    refreshBlockades(w, []);
    w.provinceTradeRatio[coast] = 50;
    const gold = w.nationTreasury[me]!;
    monthlyNavy(w, []);
    const prize = w.navy.prize[me]!;
    expect(prize).toBeGreaterThan(0);
    expect(navyView(w, me).prize).toBeCloseTo(prize, 1);
    expect(w.nationTreasury[me]! - gold).toBeGreaterThan(0);
    f.post = "commodore";
    refreshBlockades(w, []);
    w.provinceTradeRatio[coast] = 50;
    monthlyNavy(w, []);
    expect(w.navy.prize[me]!).toBeGreaterThan(prize * 1.2);
  });
});
