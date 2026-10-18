import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { advance, applyNow, createWorld, LEDGER, LEDGER_LINES, processTurn, type World } from "../src/index.ts";
import { isPort, planVoyage, type NavyFleet } from "../src/navy.ts";
import { chartAround, explorationUnlocked, isCharted } from "../src/exploration.ts";
import { colonialOffice, explorationView, rangeZones, whyNotColony } from "../src/colonies.ts";
import { STEPS_PER_DAY } from "../src/turn.ts";
import { restoreExploration, saveExploration } from "../src/colonies.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const capital = (w: World, id: string) => w.provinceIndex.get(rules.nations[n(w, id)]!.capital)!;
const act = (w: World, order: Parameters<typeof applyNow>[1], who: number) => applyNow(w, order, who).rejectedOrders.map((r) => r.reason);
const nb = (w: World, p: number) => Array.from(w.adjList.subarray(w.adjStart[p]!, w.adjStart[p + 1]!));

/** A fleet of ships of one type lying in port, ready to sail. */
function fleetAt(w: World, owner: number, at: number, type = "caravel", count = 1): NavyFleet {
  const crew = { caravel: 25, cog: 30, "voyaging canoe": 20 }[type] ?? 30;
  const supply = type === "cog" ? 15 : 60;
  const f: NavyFleet = {
    id: ++w.navy.seq,
    owner,
    at,
    route: [],
    progress: 0,
    admiral: -1,
    ships: Array.from({ length: count }, () => ({ id: ++w.navy.seq, type, crew, hull: 0, supply, damage: 0, wear: 0, age: 0, home: at, stores: 0 })),
    army: -1,
    landAt: -1,
    landing: 0,
    battle: -1,
    fleeing: false,
  };
  w.navy.fleets.push(f);
  return f;
}

/** A course of sea zones from a port to the nearest zone the realm has not charted. */
function courseIntoFog(w: World, me: number, from: number): number[] {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    if (p !== from && !isCharted(w, me, p)) {
      const path: number[] = [];
      for (let x = p; x !== from; x = prev.get(x)!) path.push(x);
      return path.reverse();
    }
    for (const q of nb(w, p)) if (!prev.has(q) && w.provinceWater[q] && w.navy.coastDist[q]! <= 3) (prev.set(q, p), queue.push(q));
  }
  throw new Error("no fog in reach");
}

// Each test builds the 1444 world and plays months of it; a shared CI runner can take longer than the 5 s default.
describe("charts", { timeout: 30_000 }, () => {
  it("starts each realm with its lands, six steps around and the seas touching them (EXPL-011)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "portugal");
    const lisbon = capital(w, "portugal");
    expect(isCharted(w, me, lisbon)).toBe(true);
    expect(nb(w, lisbon).filter((q) => w.provinceWater[q]).every((q) => isCharted(w, me, q))).toBe(true);
    // The far side of the world is under the parchment.
    expect(isCharted(w, me, capital(w, "ming"))).toBe(false);
    expect(isCharted(w, n(w, "ming"), lisbon)).toBe(false);
  });

  it("keeps fleets of other ships to charted zones (EXPL-016) and charts what a fleet passes", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "portugal");
    const lisbon = capital(w, "portugal");
    const course = courseIntoFog(w, me, lisbon);
    const fog = course.at(-1)!;
    const cog = fleetAt(w, me, lisbon, "cog");
    expect(planVoyage(w, cog, (q) => q === fog)).toBeNull();
    const caravel = fleetAt(w, me, lisbon);
    expect(planVoyage(w, caravel, (q) => q === fog)).not.toBeNull();
    // Once a ship has been beside it, the zone is charted and the cog may go.
    chartAround(w, me, course.at(-2)!);
    expect(planVoyage(w, cog, (q) => q === fog)).not.toBeNull();
  });
});

describe("exploration ships and voyages", { timeout: 30_000 }, () => {
  it("opens exploration ships with Carrack and caravel and the Age of Exploration (EXPL-001, EXPL-005)", () => {
    const w = createWorld(rules, 1, tiles);
    expect(explorationUnlocked(w, n(w, "portugal"))).toBe(true);
    expect(explorationUnlocked(w, n(w, "castile"))).toBe(true);
    expect(explorationUnlocked(w, n(w, "england"))).toBe(false);
    // North America waits for a later age (EXPL-004).
    const cherokee = n(w, "cherokee");
    w.research[cherokee]!.known.add("S4");
    expect(explorationUnlocked(w, cherokee)).toBe(false);
    w.date = { ...w.date, year: 1520 };
    expect(explorationUnlocked(w, cherokee)).toBe(true);
  });

  it("sails a voyage into the fog with full supply, charts as it goes and turns back short of supply (EXPL-017 … EXPL-020)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "portugal");
    w.player = me;
    const lisbon = capital(w, "portugal");
    const f = fleetAt(w, me, lisbon);
    f.ships[0]!.supply = 10;
    const course = courseIntoFog(w, me, lisbon);
    // Out at sea a voyage can't be given: it leaves only from port (EXPL-066).
    f.at = course[0]!;
    expect(act(w, { type: "explore", do: "voyage", fleet: f.id, path: course.slice(1) }, me)[0]).toMatch(/port/);
    f.at = lisbon;
    expect(act(w, { type: "explore", do: "voyage", fleet: f.id, path: course }, me)).toEqual([]);
    expect(f.ships[0]!.supply).toBe(60);
    const before = explorationView(w, me).charted.reduce((t, b) => t + b.toString(2).replace(/0/g, "").length, 0);
    const news = advance(w, STEPS_PER_DAY * 90);
    const after = explorationView(w, me).charted.reduce((t, b) => t + b.toString(2).replace(/0/g, "").length, 0);
    expect(after).toBeGreaterThan(before);
    expect(news.some((x) => x.kind === "voyage")).toBe(true);
    // A voyage with not enough supply to come back turns for port on its own.
    const far: number[] = [];
    let at = lisbon;
    const seen = new Set([lisbon]);
    for (let i = 0; i < 40; i++) {
      const q = nb(w, at).find((x) => w.provinceWater[x] && !seen.has(x) && w.navy.coastDist[x]! <= 3);
      if (q === undefined) break;
      seen.add(q);
      far.push(q);
      at = q;
    }
    f.at = lisbon;
    f.route = [];
    expect(act(w, { type: "explore", do: "voyage", fleet: f.id, path: far }, me)).toEqual([]);
    for (const s of f.ships) s.supply = 3;
    const back = advance(w, STEPS_PER_DAY * 60);
    expect(back.some((x) => x.kind === "voyage" && /Short of supply/.test(x.text))).toBe(true);
  });
});

describe("colonies", { timeout: 30_000 }, () => {
  /** Portugal with ocean navigation, a caravel in Lisbon and the nearest empty coast in range. */
  function colonist() {
    const w = createWorld(rules, 5, tiles);
    const me = n(w, "portugal");
    w.player = me;
    w.research[me]!.known.add("S5");
    w.nationTreasury[me] = 500;
    const lisbon = capital(w, "portugal");
    const f = fleetAt(w, me, lisbon);
    const o = colonialOffice(w, me);
    const zones = rangeZones(w, me, o.range);
    let site = -1;
    for (let p = 0; p < w.provinceCount; p++) {
      if (w.provinceWater[p] || w.provinceOwner[p]! >= 0 || !w.rules.provinces[p]!.coastal) continue;
      for (const q of nb(w, p)) if (w.provinceWater[q]) chartAround(w, me, q);
      if (!whyNotColony(w, me, p, zones)) {
        site = p;
        break;
      }
    }
    expect(site).toBeGreaterThanOrEqual(0);
    return { w, me, lisbon, f, site, zone: nb(w, site).find((q) => w.provinceWater[q] && zones[q]! >= 0)! };
  }

  it("hires a governor aboard, loads stores and founds a colony that grows into a province (EXPL-025 … EXPL-047)", () => {
    const { w, me, lisbon, f, site, zone } = colonist();
    expect(colonialOffice(w, me)).toMatchObject({ unlocked: true, slots: 2, used: 0 });
    expect(act(w, { type: "explore", do: "found", fleet: f.id, province: site }, me)[0]).toMatch(/governor/);
    const gold = w.nationTreasury[me]!;
    expect(act(w, { type: "explore", do: "hire", fleet: f.id }, me)).toEqual([]);
    expect(w.nationTreasury[me]).toBe(gold - 20);
    expect(act(w, { type: "explore", do: "load", fleet: f.id }, me)).toEqual([]);
    expect(f.ships[0]!.stores).toBe(300);
    // Beside the coast the governor goes ashore and the stores follow.
    f.at = zone;
    expect(act(w, { type: "explore", do: "found", fleet: f.id, province: site }, me)).toEqual([]);
    expect(act(w, { type: "explore", do: "unload", fleet: f.id }, me)).toEqual([]);
    const c = w.explore.colonies.find((x) => x.province === site)!;
    expect(c.progress).toBe(10);
    expect(c.food).toBe(300);
    expect(w.provinceOwner[site]).toBe(-1);
    // Wages are an official's.
    processTurn(w, [], me);
    expect(w.nationLedger[me * LEDGER_LINES + LEDGER.indexOf("officials")]).toBeLessThan(0);
    // Keep it fed and peaceful; months later it is Portugal's.
    c.aggression = "Peaceful";
    c.food = 10_000;
    for (let t = 0; t < 120 && w.provinceOwner[site] !== me; t++) processTurn(w, [], me);
    expect(w.provinceOwner[site]).toBe(me);
    expect(w.explore.founded[site]).toBe(me);
    expect(colonialOffice(w, me).used).toBe(0);
    expect(explorationView(w, me).founded).toContain(site);
    expect(isPort(w, lisbon)).toBe(true);
  });

  it("loses a starving colony and its governor (EXPL-043, EXPL-048), and abandons with a ship beside it (EXPL-049)", () => {
    const { w, me, f, site, zone } = colonist();
    expect(act(w, { type: "explore", do: "hire", fleet: f.id }, me)).toEqual([]);
    f.at = zone;
    expect(act(w, { type: "explore", do: "found", fleet: f.id, province: site }, me)).toEqual([]);
    const c = w.explore.colonies[0]!;
    c.aggression = "Fierce";
    let news: ReturnType<typeof advance> = [];
    for (let t = 0; t < 20 && w.explore.colonies.length; t++) news = news.concat(processTurn(w, [], me).news);
    expect(w.explore.colonies).toHaveLength(0);
    expect(news.some((x) => x.kind === "colony" && /lost/.test(x.text))).toBe(true);
    expect(w.explore.governors).toHaveLength(0);
    // A new governor; this time he is taken off again.
    f.at = capital(w, "portugal");
    expect(act(w, { type: "explore", do: "hire", fleet: f.id }, me)).toEqual([]);
    f.at = zone;
    expect(act(w, { type: "explore", do: "found", fleet: f.id, province: site }, me)).toEqual([]);
    f.at = capital(w, "portugal");
    expect(act(w, { type: "explore", do: "abandon", province: site }, me)[0]).toMatch(/ship/);
    const other = fleetAt(w, me, zone, "cog");
    expect(act(w, { type: "explore", do: "abandon", province: site }, me)).toEqual([]);
    expect(w.explore.governors[0]!.fleet).toBe(other.id);
  });

  it("refuses owned land and coasts beyond the colonial range (EXPL-032, EXPL-035)", () => {
    const { w, me } = colonist();
    const zones = rangeZones(w, me, colonialOffice(w, me).range);
    const castilian = w.rules.provinces.findIndex((x, p) => w.provinceOwner[p] === n(w, "castile") && x.coastal && isCharted(w, me, p));
    expect(whyNotColony(w, me, castilian, zones)).toMatch(/holds it/);
    const tiny = rangeZones(w, me, 0);
    const empty = w.rules.provinces.findIndex((x, p) => !w.provinceWater[p] && w.provinceOwner[p] === -1 && x.coastal && isCharted(w, me, p) && !nb(w, p).some((q) => tiny[q]! >= 0));
    if (empty >= 0) expect(whyNotColony(w, me, empty, tiny)).toMatch(/range/);
  });

  it("keeps charts, governors and colonies in a save", () => {
    const { w, me, f, site, zone } = colonist();
    expect(act(w, { type: "explore", do: "hire", fleet: f.id }, me)).toEqual([]);
    f.at = zone;
    expect(act(w, { type: "explore", do: "found", fleet: f.id, province: site }, me)).toEqual([]);
    const saved = JSON.parse(JSON.stringify(saveExploration(w)));
    const v = createWorld(rules, 5, tiles);
    restoreExploration(v, saved, (x) => x, (x) => x);
    expect(v.explore.colonies).toEqual(w.explore.colonies);
    expect(v.explore.governors).toEqual(w.explore.governors);
    expect(Array.from(v.explore.charted)).toEqual(Array.from(w.explore.charted));
  });
});

describe("the exploration AI", { timeout: 30_000 }, () => {
  it("has a sea-minded realm build a caravel and explore the edge of its charts (EXPL-053), and a land power never (EXPL-054)", () => {
    const w = createWorld(rules, 7, tiles);
    const pt = n(w, "portugal");
    const en = n(w, "england");
    w.nationTreasury[pt] = 500;
    const count = (who: number) => explorationView(w, who).charted.reduce((t, b) => t + b.toString(2).replace(/0/g, "").length, 0);
    const before = count(pt);
    for (let t = 0; t < 52; t++) processTurn(w, [], -1);
    expect(w.navy.fleets.some((f) => f.owner === pt && f.ships.some((s) => s.type === "caravel"))).toBe(true);
    expect(count(pt)).toBeGreaterThan(before);
    expect(w.navy.fleets.some((f) => f.owner === en && f.ships.some((s) => s.type === "caravel"))).toBe(false);
  });

  it("has a sea-minded realm with ocean navigation hire a governor and settle the nearest empty coast (EXPL-053, EXPL-062)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    w.research[me]!.known.add("S5");
    w.nationTreasury[me] = 300;
    for (let t = 0; t < 52 * 3 && !w.explore.colonies.some((c) => c.owner === me) && !w.explore.founded.includes(me); t++) processTurn(w, [], -1);
    const c = w.explore.colonies.find((x) => x.owner === me);
    expect(!!c || w.explore.founded.includes(me)).toBe(true);
    if (c) expect(c.food).toBeGreaterThan(0);
  });
});
