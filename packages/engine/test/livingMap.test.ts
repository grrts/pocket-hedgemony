import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { fileURLToPath } from "node:url";
import { decodeRgb, loadMapTiles } from "../src/node/mapTiles.ts";
import { groundOfCell, landGrid, LandGridScan, WATER } from "../src/tiles.ts";
import {
  animatedFigures, bandFade, detailBands, figureArms, figureCount, figuresLeft, formation, hamletCount, hamletSpots, hullCount, hullsInPort, berthSpots,
  kindOfByte, linksOfByte, livingBand, neighbours4, pieceLabels, pieceUnit, roadGrade, roadLines, roadPath, settlementBytes, tapBox, tapTarget,
  tileDistance, townCells, townFootprint, townGrowthOrder, townPeopleThousands, townPlan, townsToRefresh, traderMovers, wallEdges, worksSpot, changedBox,
} from "../src/domain/map-presentation/index.ts";

const rules = loadDefaultRuleset();
const grid = landGrid(loadMapTiles(rules));
const idx = (id: string): number => {
  const i = rules.provinces.findIndex((p) => p.name === id);
  if (i < 0) throw new Error(`no province ${id}`);
  return i;
};
const landNeighbours = (p: number): number[] => (rules.provinces[p]!.neighbors ?? []).map((n) => rules.provinces.findIndex((q) => q.id === n)).filter((n) => n >= 0).filter((n) => grid.centre[n]! >= 0);

describe("living map: zoom bands", () => {
  it("splits Local into icons, living and street by zoom and Map detail", () => {
    expect(livingBand(10)).toBe("icons");
    expect(livingBand(16)).toBe("living");
    expect(livingBand(39.9)).toBe("living");
    expect(livingBand(40)).toBe("street");
    expect(livingBand(40, "Medium")).toBe("living");
    expect(livingBand(30, "Low")).toBe("icons");
    expect(detailBands("Low").closestZoom).toBe(40);
    expect(detailBands("High").closestZoom).toBe(96);
  });

  it("cross-fades icons into living pieces between 14 and 16", () => {
    expect(bandFade(13)).toEqual({ icons: 1, living: 0 });
    expect(bandFade(15)).toEqual({ icons: 0.5, living: 0.5 });
    expect(bandFade(16)).toEqual({ icons: 0, living: 1 });
    expect(bandFade(20, "Low")).toEqual({ icons: 1, living: 0 });
  });

  it("draws pieces at max(2, zoom / 8) living and zoom / 16 at street level", () => {
    expect(pieceUnit(16)).toBe(2);
    expect(pieceUnit(32)).toBe(4);
    expect(pieceUnit(80)).toBe(5);
  });
});

describe("living map: towns", () => {
  it("counts the town classes and sizes a town by the root of its people", () => {
    expect(townPeopleThousands({ craftsmen: 10, "market folk": 4, clergy: 1, clerks: 1, scholars: 0.5, farmers: 90 })).toBe(16.5);
    expect(townCells(0.2)).toBe(1);
    expect(townCells(16)).toBe(6);
    expect(townCells(300)).toBe(26);
    expect(townCells(5000)).toBe(30);
  });

  it("grows Toledo from its seed over its own land, contiguous and never on water", () => {
    const toledo = idx("Toledo");
    const order = townGrowthOrder(grid, toledo);
    expect(order[0]).toBe(grid.centre[toledo]);
    expect(new Set(order).size).toBe(order.length);
    for (const t of order) {
      expect(grid.provinceAt(t)).toBe(toledo + 1);
      expect(tileDistance(grid, order[0]!, t)).toBeLessThanOrEqual(8);
    }
    const set = new Set<number>([order[0]!]);
    for (const t of order.slice(1)) {
      expect(neighbours4(grid, t).some((n) => set.has(n))).toBe(true);
      set.add(t);
    }
  });

  it("only adds tiles at the edge as a town grows, and splits core and outskirts 60/40", () => {
    const p = idx("Toledo");
    const small = townFootprint(grid, p, 6);
    const big = townFootprint(grid, p, 15);
    expect(big.tiles.slice(0, 6)).toEqual(small.tiles);
    expect(big.core.length).toBe(9);
    expect(big.outskirts.length).toBe(6);
  });

  it("seeds a town on land when the centre point is in the sea", () => {
    const genova = idx("Genova");
    const seed = grid.centre[genova]!;
    expect(grid.provinceAt(seed)).toBe(genova + 1);
  });

  it("refreshes footprints once a game month, only where the cell count changed", () => {
    const before = new Map([[1, 4], [2, 6]]);
    const after = new Map([[1, 4], [2, 7], [3, 1]]);
    expect(townsToRefresh({ lastMonth: "1444-11", month: "1444-11", before, after })).toEqual([]);
    expect(townsToRefresh({ lastMonth: "1444-11", month: "1444-12", before, after })).toEqual([2, 3]);
  });

  it("places keep, market, worship and drill yard in the core from the seed, and docks by the water", () => {
    const sevilla = idx("Sevilla");
    const fp = townFootprint(grid, sevilla, 12);
    const plan = townPlan(grid, fp, { capital: true, castleStep: 2, market: true, drillYard: true, coastal: true });
    const kinds = [...plan.special.values()];
    expect(kinds).toEqual(expect.arrayContaining(["keep", "market", "worship", "drill yard"]));
    expect(plan.special.get(fp.core.find((t) => plan.special.get(t) !== "docks")!)).toBe("keep");
    expect(plan.walls).toBe("stone");
    expect(wallEdges(grid, plan).length).toBeGreaterThan(0);
    if (kinds.includes("docks")) expect(plan.piers.length).toBeGreaterThan(0);
    const village = townPlan(grid, townFootprint(grid, sevilla, 1), {});
    expect([...village.special.values()]).toEqual(["worship"]);
    expect(village.walls).toBe("none");
  });
});

describe("living map: hamlets, works and roads", () => {
  it("makes one hamlet per 40,000 country people, up to 6, spaced from the town and each other", () => {
    expect(hamletCount(10)).toBe(0);
    expect(hamletCount(100)).toBe(3);
    expect(hamletCount(900)).toBe(6);
    const p = idx("Toledo");
    const fp = townFootprint(grid, p, 10);
    const spots = hamletSpots(grid, p, 3, fp.tiles);
    expect(spots.length).toBeGreaterThan(0);
    for (const h of spots) {
      expect(grid.provinceAt(h)).toBe(p + 1);
      for (const t of [...fp.tiles, ...spots.filter((s) => s !== h)]) expect(tileDistance(grid, h, t)).toBeGreaterThanOrEqual(4);
    }
    expect(hamletSpots(grid, p, 3, fp.tiles)).toEqual(spots);
  });

  it("puts a mine on one seeded tile of matching ground", () => {
    const p = idx("Toledo");
    const t = worksSpot(grid, p, "mine", new Set());
    expect(t).not.toBeNull();
    expect(grid.provinceAt(t!)).toBe(p + 1);
  });

  it("grades a road by the lower road step of its two ends", () => {
    expect(roadGrade(0, 2)).toBe("track");
    expect(roadGrade(1, 2)).toBe("road");
    expect(roadGrade(2, 2)).toBe("paved road");
  });

  it("runs roads over land between neighbouring towns, with river crossings as bridges", () => {
    const toledo = idx("Toledo");
    const towns = [toledo, ...landNeighbours(toledo)].map((p) => ({ province: p, seed: grid.centre[p]!, roadStep: 0 }));
    const roads = roadLines(grid, towns, (p) => (p === toledo ? landNeighbours(toledo) : []));
    expect(roads.length).toBeGreaterThan(0);
    for (const r of roads) {
      expect(r.path[0]).toBe(r.from);
      expect(r.path.at(-1)).toBe(r.to);
      for (const t of r.path) expect(grid.provinceAt(t)).toBeGreaterThan(0);
      for (let i = 1; i < r.path.length; i++) expect(neighbours4(grid, r.path[i - 1]!)).toContain(r.path[i]);
    }
  });

  it("finds no land road to an island", () => {
    const mallorca = idx("East Baleares");
    expect(roadPath(grid, grid.centre[idx("Valencia")]!, grid.centre[mallorca]!)).toBeNull();
  });
});

describe("living map: settlement bytes", () => {
  it("packs the cell kind in the low four bits and road links in the high four", () => {
    const p = idx("Toledo");
    const fp = townFootprint(grid, p, 9);
    const plan = townPlan(grid, fp, { capital: true });
    const towns = [p, ...landNeighbours(p)].map((q) => ({ province: q, seed: grid.centre[q]!, roadStep: 1 }));
    const roads = roadLines(grid, towns, (q) => (q === p ? landNeighbours(p) : []));
    const bytes = settlementBytes(grid, [{ plan }], roads);
    expect(kindOfByte(bytes[fp.seed]!)).toBe("keep");
    expect(kindOfByte(bytes[fp.tiles.at(-1)!]!)).toBe("outskirts");
    expect(linksOfByte(bytes[fp.seed]!)).toBeGreaterThan(0);
    const empty = new Uint8Array(bytes.length);
    const box = changedBox(grid.width, empty, bytes)!;
    expect(box.x1).toBeGreaterThanOrEqual(box.x0);
    expect(changedBox(grid.width, bytes, bytes)).toBeNull();
  });
});

describe("living map: figures, hulls and movers", () => {
  it("draws one figure per 1,000 men living and 250 at street level, capped", () => {
    expect(figureCount(400, "living")).toBe(1);
    expect(figureCount(8_000, "living")).toBe(8);
    expect(figureCount(30_000, "living")).toBe(12);
    expect(figureCount(8_000, "street")).toBe(32);
    expect(figureCount(30_000, "street")).toBe(40);
  });

  it("splits figures by arm in proportion, with a wagon when there are wagons", () => {
    const arms = figureArms(10, { foot: 6000, horse: 3000, guns: 1000, wagons: true });
    expect(arms.filter((a) => a === "wagons").length).toBe(1);
    expect(arms.filter((a) => a === "foot").length).toBe(5);
    expect(arms.filter((a) => a === "horse").length).toBe(3);
    expect(arms.filter((a) => a === "guns").length).toBe(1);
    expect(figureArms(3, { foot: 9800, guns: 200 })).toEqual(["foot", "foot", "guns"]);
  });

  it("marches in a column behind the banner and stands in ranks", () => {
    const march = formation({ men: 5000, foot: 5000, state: "marching", band: "living", facing: [1, 0] });
    expect(march[0]).toMatchObject({ x: 0, y: 0, banner: true });
    expect(march.every((f) => f.y === 0)).toBe(true);
    expect(march[1]!.x).toBeLessThan(0);
    const stand = formation({ men: 12000, foot: 12000, state: "standing", band: "living" });
    expect(new Set(stand.map((f) => f.x)).size).toBe(4);
    const rebels = formation({ men: 3000, foot: 3000, state: "standing", band: "living", rebel: true });
    expect(rebels.some((f) => f.banner)).toBe(false);
  });

  it("takes figures away as a side loses men", () => {
    expect(figuresLeft(10000, 10000, "living")).toBe(10);
    expect(figuresLeft(10000, 4000, "living")).toBe(4);
    expect(figuresLeft(10000, 100, "living")).toBe(1);
    expect(figuresLeft(10000, 0, "living")).toBe(0);
  });

  it("draws one hull per 5 ships living and one per ship at street level, berthing as many as the harbour shows", () => {
    expect(hullCount(12, "living")).toBe(3);
    expect(hullCount(80, "living")).toBe(8);
    expect(hullCount(12, "street")).toBe(12);
    expect(hullsInPort(5, 3)).toEqual({ atBerth: 3, waiting: 2 });
    // Genova's waterfront: berths on water next to the town, a berth every other water pixel, the docks' first.
    const fp = townFootprint(grid, idx("Genova"), 12);
    const plan = townPlan(grid, fp, { coastal: true, harbour: true });
    const docks = [...plan.special].find(([, k]) => k === "docks")?.[0];
    const town = docks === undefined ? fp.tiles : [docks, ...fp.tiles.filter((t) => t !== docks)];
    const berths = berthSpots(grid, town);
    expect(berths.length).toBeGreaterThan(0);
    for (const b of berths) expect(groundOfCell(grid.cellAt(b))).toBe(WATER);
    if (plan.piers.length) expect(plan.piers).toContain(berths[0]);
  });

  it("moves up to three traders along a path, evenly spaced and steady from turn to turn", () => {
    const m = traderMovers({ id: 7, medium: "river", traders: 9 }, 100);
    expect(m.length).toBe(3);
    expect(m.every((x) => x.kind === "barge")).toBe(true);
    const gaps = [(m[1]!.at - m[0]!.at + 1) % 1, (m[2]!.at - m[1]!.at + 1) % 1];
    for (const g of gaps) expect(g).toBeCloseTo(1 / 3, 6);
    const later = traderMovers({ id: 7, medium: "river", traders: 9 }, 100.01);
    expect(Math.abs(later[0]!.at - m[0]!.at)).toBeLessThan(0.001);
  });
});

describe("living map: plates, taps and budget", () => {
  it("hides plates in the living band unless Markers is on or the piece is selected", () => {
    expect(pieceLabels("icons", { markers: false, selected: false })).toEqual({ plate: true, name: true });
    expect(pieceLabels("living", { markers: false, selected: false })).toEqual({ plate: false, name: false });
    expect(pieceLabels("living", { markers: true, selected: false })).toEqual({ plate: true, name: true });
    expect(pieceLabels("street", { markers: false, selected: false })).toEqual({ plate: false, name: true });
  });

  it("gives every piece a tap box of at least 44 points and resolves taps to the piece first", () => {
    expect(tapBox(10, 6, 2)).toEqual({ w: 44, h: 44 });
    expect(tapBox(30, 6, 2)).toEqual({ w: 60, h: 44 });
    const t = tapTarget({ x: 10, y: 10 }, [
      { id: "Toledo", kind: "province", x: 0, y: 0, w: 100, h: 100 },
      { id: "army", kind: "piece", x: 12, y: 8, w: 44, h: 44 },
    ]);
    expect(t?.id).toBe("army");
    expect(tapTarget({ x: -40, y: -40 }, [{ id: "Toledo", kind: "province", x: 0, y: 0, w: 100, h: 100 }, { id: "army", kind: "piece", x: 12, y: 8, w: 44, h: 44 }])?.id).toBe("Toledo");
  });

  it("animates at most 60 figures, the nearest first", () => {
    const pieces = [{ distance: 5, n: 40 }, { distance: 1, n: 30 }, { distance: 9, n: 20 }];
    const moving = animatedFigures(pieces, (p) => p.n);
    expect([...moving].map((p) => p.distance).sort()).toEqual([1, 9]);
  });
});

describe("LandGridScan", () => {
  it("scanned a few rows at a time, finds the same centres and bounds as the whole tile grid", () => {
    const rules = loadDefaultRuleset();
    const tiles = loadMapTiles(rules);
    const terrain = decodeRgb(fileURLToPath(new URL("../../../apps/client/public/map/terrain.png", import.meta.url))).rgb;
    const ids = decodeRgb(fileURLToPath(new URL("../../../apps/client/public/map/provinces.png", import.meta.url))).rgb;
    const scan = new LandGridScan(rules, tiles.width, tiles.height, (t) => (ids[t * 3]! << 16) | (ids[t * 3 + 1]! << 8) | ids[t * 3 + 2]!, terrain);
    let passes = 0;
    while (!scan.scan(97)) passes++;
    expect(passes).toBeGreaterThan(1);
    const g = scan.grid();
    expect(Array.from(g.centre)).toEqual([...tiles.centre]);
    expect(Array.from(g.bounds)).toEqual([...tiles.bounds]);
    const t = tiles.centre[0]!;
    expect([g.provinceAt(t), g.cellAt(t)]).toEqual([tiles.province[t], tiles.cell[t]]);
  });
});
