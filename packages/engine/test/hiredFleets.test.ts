import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { applyNow, createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { monthlyNavy, navyCosts, navyView, type NavyFleet } from "../src/navy.ts";
import { fleetOffers, fleetPay, monthlyHiredFleets } from "../src/hiredFleets.ts";
import { navalConfig } from "../src/domain/naval/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const act = (w: World, order: Parameters<typeof applyNow>[1], who: number) => applyNow(w, order, who).rejectedOrders.map((r) => r.reason);
const fleetsOf = (w: World, who: number): NavyFleet[] => w.navy.fleets.filter((f) => f.owner === who);
const H = navalConfig.hiredFleets;

describe("starting fleets (F-115)", () => {
  it("gives an AI fleet that needs an admiral one commissioned from an official, never a general (RECR-128, RECR-130)", () => {
    const w = createWorld(rules, 1, tiles);
    const venice = n(w, "venice");
    const f = fleetsOf(w, venice)[0]!;
    w.nationTreasury[venice] = 1000;
    const generals = w.commanderIds.filter((_, k) => w.commanderOwner[k] === venice).length;
    expect(generals).toBeGreaterThan(0);
    monthlyNavy(w, []);
    expect(f.admiral).toBeGreaterThanOrEqual(0);
    expect(w.commanderSea[f.admiral]).toBe(1);
    expect(w.commanderHome[f.admiral]).toBeGreaterThanOrEqual(0);
  });

  it("gives the 1444 sea powers their ships, crewed and in their best port, and none to realms without a port", () => {
    const w = createWorld(rules, 1, tiles);
    const venice = fleetsOf(w, n(w, "venice"));
    expect(venice).toHaveLength(1);
    const types = venice[0]!.ships.map((s) => s.type);
    // Very high naval capability: 6 warships and 3 transports.
    expect(types.filter((t) => t === "galley")).toHaveLength(6);
    expect(types.filter((t) => t === "cog")).toHaveLength(3);
    expect(venice[0]!.admiral).toBe(-1);
    expect(venice[0]!.ships.every((s) => s.crew === navalConfig.ships[s.type as "galley"].crew && s.hull === 0)).toBe(true);
    const port = venice[0]!.at;
    expect(w.provinceOwner[port]).toBe(n(w, "venice"));
    expect(w.navy.away[port]).toBeGreaterThanOrEqual(6 * 180 + 3 * 30);
    // A low sea power has a transport only; a realm with no port nothing.
    expect(fleetsOf(w, n(w, "sweden")).flatMap((f) => f.ships.map((s) => s.type))).toEqual(["cog"]);
    expect(fleetsOf(w, n(w, "hungary"))).toHaveLength(0);
    // The Americas had no cogs, junks or dhows.
    expect(fleetsOf(w, n(w, "chimu"))).toHaveLength(0);
  });

  it("starts the same fleets from the same seed", () => {
    const shape = (w: World) => w.navy.fleets.map((f) => `${f.owner}:${f.at}:${f.ships.map((s) => `${s.type}/${s.age}`).join(",")}`);
    expect(shape(createWorld(rules, 7, tiles))).toEqual(shape(createWorld(rules, 7, tiles)));
  });
});

describe("hired fleets (F-115)", () => {
  /** A world with a Danzig convoy for hire off England's coast. */
  function withFreeFleet(seed = 1): { w: World; me: number } {
    const w = createWorld(rules, seed, tiles);
    const me = n(w, "england");
    w.player = me;
    const zone = w.navy.fleets.find((f) => f.owner === me)!.at;
    const sea = w.adjList.subarray(w.adjStart[zone]!, w.adjStart[zone + 1]!).find((q) => !!w.provinceWater[q])!;
    w.navy.forHire = [{ id: ++w.navy.hireSeq, group: "Hanseatic peace ships", name: "Danzig convoy", captain: "Bernd Pawest", skills: [2, 1, 3], at: sea, ships: ["cog", "cog", "cog"] }];
    w.nationTreasury[me] = 100;
    return { w, me };
  }

  it("keeps the age's number of free fleets for hire, each in its own sea", () => {
    const w = createWorld(rules, 3, tiles);
    expect(w.navy.forHire).toHaveLength(H.forHire);
    for (const f of w.navy.forHire) {
      const g = H.groups.find((x) => x.group === f.group)!;
      expect(g.seas.some((s) => w.rules.provinces[f.at]!.name.startsWith(s))).toBe(true);
      expect(g.names).toContain(f.name);
    }
    expect(new Set(w.navy.forHire.map((f) => f.name)).size).toBe(w.navy.forHire.length);
  });

  it("hires a free fleet: the first month paid, its own captain at its head, sailing for the nearest port", () => {
    const { w, me } = withFreeFleet();
    const [offer] = fleetOffers(w, me);
    expect(offer!.name).toBe("Danzig convoy");
    expect(offer!.pay).toBe(fleetPay(["cog", "cog", "cog"], H.payMultiplier));
    expect(act(w, { type: "navy", do: "hire", free: offer!.free }, me)).toEqual([]);
    expect(w.nationTreasury[me]).toBeCloseTo(100 - offer!.pay);
    expect(w.navy.forHire).toHaveLength(0);
    const f = w.navy.fleets.find((x) => x.hire)!;
    expect(f.owner).toBe(me);
    expect(w.commanders[f.admiral]!.name).toBe("Bernd Pawest");
    expect(w.commanderOwner[f.admiral]).toBe(me);
    expect(f.route.at(-1)).toBe(offer!.port);
    // It costs its contract, not its upkeep and wages.
    const own = fleetsOf(w, me).filter((x) => !x.hire);
    const ownCost = own.reduce((t, x) => t + navyView(w, me).mine.find((m) => m.id === x.id)!.cost, 0);
    expect(navyCosts(w)[me]).toBeCloseTo(ownCost + offer!.pay, 5);
    expect(navyView(w, me).fleets.find((x) => x.id === f.id)!.hired).toMatchObject({ name: "Danzig convoy", from: -1 });
    for (let t = 0; t < 4 && f.route.length; t++) processTurn(w, [], me);
    expect(f.at).toBe(offer!.port);
  });

  it("keeps a hired fleet under its own captain and its ships together", () => {
    const { w, me } = withFreeFleet();
    act(w, { type: "navy", do: "hire", free: w.navy.forHire[0]!.id }, me);
    const f = w.navy.fleets.find((x) => x.hire)!;
    const other = fleetsOf(w, me).find((x) => !x.hire)!;
    expect(act(w, { type: "navy", do: "admiral", fleet: f.id, commander: -1 }, me)[0]).toMatch(/own captain/);
    expect(act(w, { type: "navy", do: "split", fleet: f.id, ship: f.ships[0]!.id }, me)[0]).toMatch(/together/);
    expect(act(w, { type: "navy", do: "merge", fleet: other.id, into: f.id }, me)[0]).toMatch(/own captain/);
    expect(act(w, { type: "navy", do: "disband", fleet: f.id }, me)[0]).toMatch(/dismissed/);
  });

  it("dismissed, a free fleet sails off with its captain", () => {
    const { w, me } = withFreeFleet();
    act(w, { type: "navy", do: "hire", free: w.navy.forHire[0]!.id }, me);
    const f = w.navy.fleets.find((x) => x.hire)!;
    const captain = f.admiral;
    expect(act(w, { type: "navy", do: "dismiss", fleet: f.id }, me)).toEqual([]);
    expect(w.navy.fleets.includes(f)).toBe(false);
    expect(w.commanderOwner[captain]).toBe(-1);
  });

  it("leaves when the treasury can't pay it", () => {
    const { w, me } = withFreeFleet();
    act(w, { type: "navy", do: "hire", free: w.navy.forHire[0]!.id }, me);
    w.nationTreasury[me] = -5;
    const news: Parameters<typeof monthlyHiredFleets>[1] = [];
    monthlyHiredFleets(w, news);
    expect(w.navy.fleets.some((x) => x.hire)).toBe(false);
    expect(news.some((x) => /can't pay/.test(x.text))).toBe(true);
  });

  it("lets a sea power at peace lend its fleet: the gold goes to it, and the fleet goes home when it is called back", () => {
    const w = createWorld(rules, 1, tiles);
    const me = n(w, "france");
    const genoa = n(w, "genoa");
    w.player = me;
    w.nationTreasury[me] = 100;
    const lent = fleetOffers(w, me).find((o) => o.from === genoa)!;
    expect(lent.pay).toBe(fleetPay(lent.ships, H.lentPayMultiplier));
    const before = w.nationTreasury[genoa]!;
    expect(act(w, { type: "navy", do: "hire", lent: lent.lent }, me)).toEqual([]);
    expect(w.nationTreasury[genoa]).toBeCloseTo(before + lent.pay);
    const f = w.navy.fleets.find((x) => x.id === lent.lent)!;
    expect(f.owner).toBe(me);
    expect(f.hire!.from).toBe(genoa);
    // Genoa is paid on its own ledger line, France pays on its.
    const costs = navyCosts(w);
    expect(costs[genoa]).toBeLessThan(0);
    // A lent fleet is never offered twice.
    expect(fleetOffers(w, n(w, "castile")).some((o) => o.lent === f.id)).toBe(false);
    // Genoa goes to war: its fleet goes home, without France's captain.
    const captain = f.admiral;
    expect(act(w, { type: "declareWar", target: n(w, "milan") }, genoa)).toEqual([]);
    monthlyHiredFleets(w, []);
    expect(f.owner).toBe(genoa);
    expect(f.hire).toBeUndefined();
    expect(w.commanderOwner[captain]).toBe(-1);
  });

  it("keeps a hired fleet and the free fleets through a save", () => {
    const { w, me } = withFreeFleet();
    act(w, { type: "navy", do: "hire", free: w.navy.forHire[0]!.id }, me);
    w.navy.forHire.push({ id: ++w.navy.hireSeq, group: "Barbary corsairs", name: "Corsairs of Bougie", captain: "Rais Ali", skills: [1, 1, 1], at: w.navy.fleets[0]!.at, ships: ["galley"] });
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "england", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    const f = back.navy.fleets.find((x) => x.hire)!;
    expect(f.hire!.name).toBe("Danzig convoy");
    expect(back.commanders[f.hire!.captain]!.name).toBe("Bernd Pawest");
    expect(back.navy.forHire.map((x) => x.name)).toEqual(["Corsairs of Bougie"]);
    expect(back.navy.hireSeq).toBe(w.navy.hireSeq);
  });
});
