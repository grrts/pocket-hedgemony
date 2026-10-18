import * as nv from "./domain/naval/index.ts";
import type { World } from "./world.ts";
import { Rng } from "./rng.ts";
import { mix } from "./names.ts";
import { realmStrengths } from "./realmStrengths.ts";
import { aiShip, berthsOf, harbourStep, isPort, localTradeShip, newShip } from "./navy.ts";

const lonOf = (world: World, p: number): number => {
  const m = world.rules.map;
  const x = world.rules.provinces[p]!.x;
  return m && x !== undefined ? x / m.pxPerDeg - 180 : 0;
};

/**
 * Realms that had ships in 1444 start with them (F-115, NAVY-132 to
 * NAVY-134): one fleet in the realm's best port, its warships and transports
 * by the catalogue's naval capability, crewed from that port's people, with no
 * admiral yet. A realm the catalogue does not assess starts with none, as it
 * keeps the flat start (SETUP-047).
 */
export function seedStartingFleets(world: World): void {
  const T = nv.navalConfig.startingFleets;
  const v = world.navy;
  const ports: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0 && isPort(world, p) && lonOf(world, p) >= T.noShipsWestOfLon) ports[o]!.push(p);
  }
  for (let n = 0; n < world.nationCount; n++) {
    const mine = ports[n]!;
    const a = realmStrengths(world.nationIds[n]!).assessments;
    if (!mine.length || !a.length) continue;
    const found = a.find((x) => x.dimension === "naval_capability")?.level;
    const level = Math.max(0, T.levels.indexOf(!found || found === "unknown" ? "moderate" : found));
    let war = T.warships[level]!;
    let transports = T.transports[level]!;
    if (!war && !transports) continue;
    // The best yard, then the biggest harbour, then the nearest to the capital (the lower index on a tie).
    const capital = world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1;
    const score = (p: number) => v.shipyard[p]! * 8 + harbourStep(world, p) * 2 + (p === capital ? 1 : 0);
    const port = mine.reduce((b, p) => (score(p) > score(b) ? p : b), mine[0]!);
    const warship = aiShip(world, n, port);
    const trade = localTradeShip(world, port);
    // With no warship to order there, the fleet takes transports instead.
    if (!nv.isWarship(warship)) {
      transports += war;
      war = 0;
    }
    const types = [...Array<string>(war).fill(warship), ...Array<string>(transports).fill(trade)].slice(0, berthsOf(world, port));
    const rng = new Rng(mix(world.weatherSeed ^ 0x5f1ee7, n + 1));
    const ships = types.map((t) => {
      const crew = nv.shipRow(t).crew;
      // The crews come out of the port's people, as a muster takes them (NAVY-027).
      world.provinceRecruits[port] = Math.max(0, world.provinceRecruits[port]! - crew);
      v.away[port] = v.away[port]! + crew;
      return { ...newShip(world, t, crew, port), age: rng.int(T.maxAgeYears + 1) };
    });
    v.fleets.push({ id: ++v.seq, owner: n, at: port, route: [], progress: 0, admiral: -1, ships, army: -1, landAt: -1, landing: 0, battle: -1, fleeing: false });
  }
}
