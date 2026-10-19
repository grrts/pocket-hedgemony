import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { PICKER_REGIONS, pickerRegions, recordRegion, startTrade, waysToGrow, waysToGrowLine, type GrowthMap } from "../src/domain/scenario-setup/index.ts";

const rules = loadDefaultRuleset();
const at = new Map(rules.provinces.map((p) => [p.id, p]));
const realms = rules.nations.map((n) => ({ id: n.id, x: at.get(n.capital)!.x!, y: at.get(n.capital)!.y! }));
const regions = pickerRegions(realms);
const regionOf = (id: string) => regions[rules.nations.findIndex((n) => n.id === id)];

describe("the realm picker's regions (SETUP-072)", () => {
  it("places every realm of the map by its own data, in one of the macro regions", () => {
    const ids = new Set(PICKER_REGIONS.map((r) => r.id));
    for (const n of rules.nations) expect(recordRegion(n.id), n.id).not.toBeNull();
    for (const r of regions) expect(ids.has(r)).toBe(true);
  });

  it("splits Africa at the Sahara: Mali, Benin, Kongo, Ethiopia, Adal, Ajuran and Kilwa south of it, Morocco and the Mamluks north", () => {
    for (const id of ["mali", "benin", "kongo", "ethiopia", "adal", "ajuran", "kilwa"]) expect(regionOf(id), id).toBe("sub_saharan_africa");
    for (const id of ["morocco", "mamluks", "tunis"]) expect(regionOf(id), id).toBe("north_africa");
  });

  it("reads map ids that differ from the catalogue's, and realms the catalogue does not hold", () => {
    expect(regionOf("ottomans")).toBe("middle_east");
    expect(regionOf("aztecs")).toBe("central_america");
    expect(regionOf("iroquois")).toBe("north_america");
    expect(regionOf("japan")).toBe("east_asia");
    expect(regionOf("france")).toBe("europe");
  });

  it("falls back to the region of the nearest capital for a realm with no data", () => {
    expect(pickerRegions([{ id: "france", x: 0, y: 0 }, { id: "nowhere_realm", x: 1, y: 1 }])).toEqual(["europe", "europe"]);
  });
});

describe("Ways to grow (SETUP-073)", () => {
  // Five land provinces in a row and one sea: 0 1 | 2 | 3 free | 4 | sea 5 by 0.
  const map: GrowthMap = {
    owners: [0, 0, 1, -1, 2, -1],
    neighbors: [[1, 5], [0, 2, 3], [1], [1, 4], [3], [0]],
    water: [false, false, false, false, false, true],
    trade: { gold: new Set([0]), mines: new Set(), towns: new Set([1]), ports: new Set([0]) },
  };

  it("counts smaller neighbours by land, free land beside it and its trade", () => {
    expect(waysToGrow(map, 0)).toEqual({ smallerNeighbours: 1, freeProvinces: 1, goldFields: 1, mines: 0, tradeTowns: 1, ports: 1 });
    expect(waysToGrowLine(waysToGrow(map, 0))).toBe("1 smaller neighbour · 1 free province · 1 gold field · 1 trade town · 1 port");
  });

  it("does not count a neighbour as large as it, nor the sea as free land", () => {
    const w = waysToGrow(map, 1);
    expect(w.smallerNeighbours).toBe(0);
    expect(waysToGrow(map, 2).freeProvinces).toBe(1);
    expect(waysToGrowLine({ smallerNeighbours: 0, freeProvinces: 0, goldFields: 0, mines: 0, tradeTowns: 0, ports: 0 })).toBe("none at the start");
  });

  it("reads the start's trade from the map's anchors and the 1444 ports", () => {
    const t = startTrade(rules.provinces);
    expect(t.ports.size).toBeGreaterThan(100);
    const london = rules.provinces.findIndex((p) => p.id === "p803");
    expect(t.ports.has(london)).toBe(true);
    const owners = rules.provinces.map((p) => (p.owner ? rules.nations.findIndex((n) => n.id === p.owner) : -1));
    const idx = new Map(rules.provinces.map((p, i) => [p.id, i]));
    const grow = waysToGrow({ owners, neighbors: rules.provinces.map((p) => p.neighbors.map((id) => idx.get(id)!)), water: rules.provinces.map((p) => p.terrain === "sea" || p.terrain === "ocean"), trade: t }, rules.nations.findIndex((n) => n.id === "england"));
    expect(grow.ports).toBeGreaterThan(3);
  });
});
