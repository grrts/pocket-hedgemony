import { expect } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { loadDefaultRuleset, type Ruleset } from "@ph/rules";
import { createWorld, processTurn } from "@ph/engine";
import {
  areasIn,
  areNeighbours,
  asymmetricNeighbours,
  CREDITS,
  cutPieces,
  cutThresholds,
  densityZone,
  fieldShare,
  fieldType,
  gridOf,
  groundCounts,
  groundOfTile,
  HILL_RIM,
  isRiverProvince,
  isWater,
  landProvinces,
  linkedPixels,
  lowland,
  macroRegion,
  mapGraph,
  pixelType,
  placeNear,
  provinceGround,
  rangePixel,
  rangeType,
  roadOf,
  ROAD_STEPS,
  seaZoneAcrossKm,
  seaZones,
  setRoad,
  settlementZone,
  startingTiles,
  STRAITS,
  subRegions,
  terrainPixel,
  tileType,
  touchesSea,
  traceRiver,
  type Ground,
  type MapGraph,
  type RoadMap,
} from "@ph/engine/domain/world-map";
import { steps } from "../src/registry.ts";

const { Given, When, Then } = steps("world-map");

const rules: Ruleset = loadDefaultRuleset();
const graph: MapGraph = mapGraph(rules);

/** The built province id image (apps/client/public/map/provinces.png): RGB = place index + 1. */
let image: { width: number; height: number; rgb: Uint8Array } | null = null;
function provinceImage(): { width: number; height: number; rgb: Uint8Array } {
  if (image) return image;
  const png = readFileSync(new URL(`../../../apps/client/public/${rules.map!.provinceImage}`, import.meta.url));
  let p = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (p < png.length) {
    const len = png.readUInt32BE(p);
    const type = png.toString("ascii", p + 4, p + 8);
    const body = png.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 2 || body[12] !== 0) throw new Error("expected an 8-bit RGB PNG");
    } else if (type === "IDAT") idat.push(body);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 3;
  const rgb = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? rgb[y * stride + i - 3]! : 0;
      const b = y > 0 ? rgb[(y - 1) * stride + i]! : 0;
      const c = i >= 3 && y > 0 ? rgb[(y - 1) * stride + i - 3]! : 0;
      let v = raw[y * (stride + 1) + 1 + i]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rgb[y * stride + i] = v & 255;
    }
  }
  return (image = { width, height, rgb });
}

When("the map is built", (s) => s.build());

// ---------------------------------------------------------------------------
// Grid and provinces

Given("the built map", (s) => {
  s.graph = graph;
});

When("its grid is read", (s) => {
  s.grid = gridOf(rules.map!);
});

Then("it is {int} pixels wide and {int} pixels high", (s, w: number, h: number) => {
  expect([s.grid.width, s.grid.height]).toEqual([w, h]);
});

Then("it has {int} pixels per degree from latitude {int} north to {int} south", (s, px: number, north: number, south: number) => {
  expect(s.grid.pxPerDeg).toBe(px);
  expect(s.grid.latTop).toBe(north);
  expect(s.grid.latBottom).toBe(-south);
});

Given("the config density region {string}", (s, name: string) => {
  if (name === "anywhere else") s.at = { lon: -100, lat: 40 };
  else {
    const z = densityZone(name)!;
    expect(z).toBeDefined();
    s.at = { lon: (z.bbox[0]! + z.bbox[2]!) / 2, lat: (z.bbox[1]! + z.bbox[3]!) / 2 };
  }
});

When("provinces are cut there", (s) => {
  s.cut = cutThresholds(s.at.lon, s.at.lat);
});

Then("admin regions are merged or split toward a target of {int} pixels", (s, target: number) => {
  expect(s.cut.target).toBe(target);
  expect(s.cut.mergeBelow).toBeLessThan(target);
  expect(s.cut.splitAbove).toBeGreaterThan(target);
});

Given("an admin region with a large lake and an offshore island", (s) => {
  // 8 × 5 pixels: region 0 on the mainland with a lake inside, and an island of region 0 across water.
  const W = 8;
  const H = 5;
  const rows = ["000..00.", "0LL0..0.", "0LL0....", "0000....", "........"];
  const region = new Int32Array(W * H).fill(-1);
  const lake = new Uint8Array(W * H);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "0" || ch === "L") region[y * W + x] = 0;
    if (ch === "L") lake[y * W + x] = 1;
  }));
  s.W = W;
  s.region = region;
  s.lake = lake;
  s.build = () => (s.pieces = cutPieces(W, H, region, lake));
});

Then("the lake pixels belong to no province", (s) => {
  for (let p = 0; p < s.lake.length; p++) if (s.lake[p]) expect(s.pieces[p]).toBe(-1);
});

Then("the island is a piece of its own", (s) => {
  const mainland = s.pieces[0];
  const island = s.pieces[1 * s.W + 6];
  expect(island).toBeGreaterThanOrEqual(0);
  expect(island).not.toBe(mainland);
  expect(s.pieces[0 * s.W + 5]).toBe(s.pieces[0 * s.W + 6]);
  expect(new Set(Array.from(s.pieces as Int32Array).filter((x) => x >= 0)).size).toBe(2);
});

When("its places are counted", (s) => {
  s.counts = { land: landProvinces(graph).length, sea: seaZones(graph).length };
});

Then("there are {int} land provinces", (s, n: number) => expect(s.counts.land).toBe(n));
Then("there are {int} sea zones", (s, n: number) => expect(s.counts.sea).toBe(n));

// ---------------------------------------------------------------------------
// The graph and regions

Given("a coastal province touching a sea zone", (s) => {
  s.province = landProvinces(graph).find((p) => touchesSea(graph, p))!;
  expect(s.province).toBeDefined();
});

When("the graph is read", (s) => {
  if (s.province) s.sea = s.province.neighbors.map((n: string) => graph.byId.get(n)!).find(isWater);
});

Then("the province and the sea zone are neighbours", (s) => {
  expect(areNeighbours(graph, s.province.id, s.sea.id)).toBe(true);
  expect(areNeighbours(graph, s.sea.id, s.province.id)).toBe(true);
});

Then("the province is marked coastal", (s) => {
  expect(s.province.coastal).toBe(true);
  for (const p of landProvinces(graph)) if (touchesSea(graph, p)) expect(p.coastal).toBe(true);
});

When("every neighbour list is checked", (s) => {
  s.asymmetric = asymmetricNeighbours(s.graph);
});

Then("whenever a place lists another, the other lists it back", (s) => expect(s.asymmetric).toEqual([]));

Given("the macro-region {string}", (s, name: string) => {
  s.regionName = name;
});

When("the regions are read", (s) => {
  s.region = macroRegion(s.regionName);
});

Then("it exists with its sub-regions and areas", (s) => {
  expect(s.region).toBeDefined();
  expect(s.region.macro).toBe(true);
  const subs = subRegions(s.region.id);
  for (const r of subs) expect(subs.some((x) => x.id === r.parent) || r.parent === s.region.id).toBe(true);
  expect(areasIn(s.region.id).length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Sea zones and straits

Given("a sea zone of kind {string}", (s, kind: string) => {
  s.kind = kind;
  expect(seaZones(graph).some((z) => z.terrain === kind)).toBe(true);
});

When("its size is measured", (s) => {
  s.sizes = [0, 20, 40, 60, 75, -40].map((lat) => seaZoneAcrossKm(s.kind, lat));
});

Then("it is about {int} km across at any latitude", (s, km: number) => {
  for (const z of s.sizes) {
    expect(Math.abs(z.northSouth - km) / km).toBeLessThan(0.1);
    expect(Math.abs(z.eastWest - km) / km).toBeLessThan(0.1);
  }
});

Given("the strait {string} in the map config", (s, name: string) => {
  s.strait = STRAITS.find((x) => x.name === name);
  expect(s.strait).toBeDefined();
  s.build = () => {
    const { width, height, rgb } = provinceImage();
    const sea = (i: number) => !!rules.provinces[i] && isWater(rules.provinces[i]!);
    s.sides = [s.strait.a, s.strait.b].map(([lon, lat]: number[]) => rules.provinces[placeNear(rgb, width, height, lon!, lat!, sea)]!.id);
  };
});

Then("the sea zones on either side of {string} are neighbours", (s, _name: string) => {
  const [a, b] = s.sides as [string, string];
  expect(a === b || (areNeighbours(graph, a, b) && areNeighbours(graph, b, a))).toBe(true);
});

Given("an army stands in a coastal province", (s) => {
  const w = createWorld(rules, 1);
  const n = w.nationIndex.get("france")!;
  const a = w.armies;
  let army = 0;
  while (a.owner[army] !== n) army++;
  const coast = landProvinces(graph).find((p) => p.owner === "france" && touchesSea(graph, p))!;
  a.location[army] = w.provinceIndex.get(coast.id)!;
  Object.assign(s, { w, n, army, coast });
});

When("it is ordered to march into the neighbouring sea zone without ships", (s) => {
  const sea = s.coast.neighbors.find((id: string) => isWater(graph.byId.get(id)!))!;
  s.order = { type: "move", army: s.army, to: s.w.provinceIndex.get(sea)! };
  s.report = processTurn(s.w, [s.order], s.n);
});

Then("the order is refused because armies need ships to cross water", (s) => {
  expect(s.report.rejectedOrders).toEqual([{ order: s.order, reason: "armies need ships to cross water" }]);
  expect(s.w.armies.location[s.army]).toBe(s.w.provinceIndex.get(s.coast.id));
});

// ---------------------------------------------------------------------------
// Terrain

Given("the tile type {string} of the category {string}", (s, type: string, category: string) => {
  expect(tileType(type).category).toBe(category);
  s.type = type;
});

When("its ground is looked up", (s) => {
  s.ground = groundOfTile(s.type);
});

Then("it plays as the ground {string}", (s, ground: string) => expect(s.ground).toBe(ground));

const CLIMATES: Record<string, { koppen: string; lat: number }> = {
  desert: { koppen: "BWh", lat: 25 },
  tropical: { koppen: "Aw", lat: 5 },
  alpine: { koppen: "ET", lat: 46 },
  "temperate, north of 50 degrees": { koppen: "Cfb", lat: 55 },
  "temperate, south of 50 degrees": { koppen: "Cfb", lat: 45 },
};

Given("a Natural Earth mountain range in a {string} climate", (s, climate: string) => {
  s.climate = CLIMATES[climate];
});

When("its pixels are typed", (s) => {
  if (s.climate) {
    const { koppen, lat } = s.climate;
    s.range = rangeType(koppen, lat);
    s.rims = [1, 2, 3].map((rim) => Array.from({ length: 6 }, (_, depth) => rangePixel(koppen, lat, depth, rim)));
  }
  if (s.wetland) s.typed = pixelType({ ...s.wetland, wetland: true });
});

Then("the range is {string}", (s, type: string) => {
  expect(s.range).toBe(type);
  for (const row of s.rims) expect(row.at(-1)).toBe(type);
});

Then("a rim of hills 1 to 3 pixels wide surrounds it", (s) => {
  expect([HILL_RIM.min, HILL_RIM.max]).toEqual([1, 3]);
  s.rims.forEach((row: string[], i: number) => {
    const rim = i + 1;
    expect(row.slice(0, rim).every((t) => t === "hills")).toBe(true);
    expect(row.slice(rim).every((t) => t === s.range)).toBe(true);
  });
  expect(() => rangePixel(s.climate.koppen, s.climate.lat, 0, 4)).toThrow();
});

const WETLANDS: Record<string, { lon: number; lat: number; koppen: string }> = {
  "the Sudd": { lon: 30.5, lat: 7.5, koppen: "Aw" },
  "the Pantanal": { lon: -57, lat: -18, koppen: "Aw" },
  "the Pripet": { lon: 27, lat: 52, koppen: "Dfb" },
  "the Fens": { lon: 0.1, lat: 52.6, koppen: "Cfb" },
};

Given("a Natural Earth wetland in {string}", (s, place: string) => {
  s.wetland = WETLANDS[place];
});

Then("it is {string}", (s, type: string) => expect(s.typed).toBe(type));

const FIELDS: Record<string, { lon: number; lat: number; koppen: string }> = {
  "monsoon Asia": { lon: 105.8, lat: 21, koppen: "Cwa" },
  "the Paris basin": { lon: 2.35, lat: 48.85, koppen: "Cfb" },
};

Given("a crowded 1444 region in {string} whose wood is partly cleared for fields", (s, place: string) => {
  s.place = FIELDS[place];
});

When("its fields are typed", (s) => {
  s.result = fieldType(s.place.lon, s.place.lat, s.place.koppen);
});

Then("they are {string}", (s, value: string) => expect(s.result.toLowerCase()).toBe(value.toLowerCase()));

Given("a province whose pixels are {int} % mountain, {int} % hills and otherwise mostly {string}", (s, m: number, h: number, common: string) => {
  s.counts = { mountains: m, hills: h, [common]: 100 - m - h } as Partial<Record<Ground, number>>;
});

When("its ground is decided", (s) => {
  s.ground = provinceGround(s.counts, s.share ?? 0);
});

Then("its ground is {string}", (s, ground: string) => expect(s.ground).toBe(ground));

Given("a temperate province over 60 % wooded after blurring", (s) => {
  const types = Array.from({ length: 100 }, () => pixelType({ lon: 15, lat: 51, koppen: "Cfb", cover: 0.65 }));
  s.counts = groundCounts(types);
});

Given("a grassland province in a part of 1444 crowded enough to be mostly under the plough", (s) => {
  const zone = settlementZone("Paris basin")!;
  s.share = fieldShare((zone.bbox[0]! + zone.bbox[2]!) / 2, (zone.bbox[1]! + zone.bbox[3]!) / 2);
  s.counts = { grassland: 100 };
});

Given("the config lowland {string}", (s, name: string) => {
  s.lowland = lowland(name);
  expect(s.lowland).toBeDefined();
  s.build = () => {
    // Pixels across the valley, all inside the Alps range outline that swallows it.
    const [x0, y0, x1, y1] = s.lowland.bbox as number[];
    const types: string[] = [];
    for (let lon = x0! + 0.05; lon < x1!; lon += 0.25) for (let lat = y0! + 0.05; lat < y1!; lat += 0.25) types.push(pixelType({ lon, lat, koppen: "Cfa", range: { depth: 6, rim: 2 } }));
    s.types = types;
    s.ground = provinceGround(groundCounts(types));
  };
});

Then("the provinces of the Po valley are not hills or mountains", (s) => {
  expect(s.types.some((t: string) => ["hills", "mountains", "snowpeaks", "badlands", "highlands"].includes(t))).toBe(false);
  expect(["hills", "mountains"]).not.toContain(s.ground);
});

Given("a province drawn with broadleaf, farmland and grassland pixels", (s) => {
  s.types = [...Array(40).fill("broadleaf"), ...Array(35).fill("farmland"), ...Array(25).fill("grassland")];
});

When("a system asks for its ground", (s) => {
  s.answer = [provinceGround(groundCounts(s.types))];
});

Then("exactly one ground is returned", (s) => {
  expect(s.answer).toHaveLength(1);
  expect(s.answer[0]).toBe("forest");
});

const DEPTHS: Record<string, number> = {
  "less than 200 m": 100,
  "between 200 m and 1 km": 500,
  "between 1 and 3 km": 2000,
  "between 3 and 5 km": 4000,
  "deeper than 5 km": 6000,
};

Given(/^a water pixel (.+) deep$/, (s, depth: string) => {
  s.pixel = { water: true, depth: DEPTHS[depth] };
});

Given("a land pixel with no river", (s) => {
  s.pixel = { water: false, type: "steppe" };
});

When("the terrain image is written", (s) => {
  s.rgb = terrainPixel(s.pixel);
});

Then("its green channel holds {int}", (s, v: number) => expect(s.rgb[1]).toBe(v));

Then("its red channel holds its terrain type", (s) => {
  expect(s.rgb[0]).toBe(17);
  expect(s.rgb[2]).toBe(0);
});

Given("a province drawn mostly as {string}", (s, type: string) => {
  s.type = type;
});

When("its starting tiles are suggested", (s) => {
  s.result = startingTiles(s.type);
});

// ---------------------------------------------------------------------------
// Rivers and roads

Given("a Natural Earth river of scale rank {int}", (s, rank: number) => {
  s.rank = rank;
});

When("it is traced onto the map", (s) => {
  s.path = [[10, 10], [11, 10], [12, 11], [12, 12], [11, 13]] as [number, number][];
  s.traced = traceRiver(s.path, s.rank);
});

Then("its pixels have river size {int}", (s, size: number) => {
  expect(s.traced).toHaveLength(s.path.length);
  for (const p of s.traced) expect(p.size).toBe(size);
});

Then("each pixel records which neighbours the river flows to", (s) => {
  const path: [number, number][] = s.path;
  s.traced.forEach((p: { x: number; y: number }, i: number) => {
    const want = [path[i - 1], path[i + 1]].filter((x): x is [number, number] => !!x).map(([x, y]) => `${x},${y}`).sort();
    expect(linkedPixels(s.traced[i]).map(([x, y]) => `${x},${y}`).sort()).toEqual(want);
    expect(`${p.x},${p.y}`).toBe(`${path[i]![0]},${path[i]![1]}`);
  });
});

Given("a province with {int} river pixels", (s, n: number) => {
  s.build = () => (s.river = isRiverProvince(n));
});

Then(/^the province (is|is not) a river province$/, (s, is: string) => expect(s.river).toBe(is === "is"));

Given("the province {string} has the road step {string}", (s, province: string, step: string) => {
  s.roads = new Map() as RoadMap;
  setRoad(s.roads, province, step);
  s.roadProvince = province;
});

When("movement reads its road", (s) => {
  s.road = roadOf(s.roads, s.roadProvince);
});

Then("the road step is {string} for the whole province", (s, step: string) => {
  expect(s.road).toBe(step);
  expect(ROAD_STEPS).toContain(step);
  expect(s.roads.size).toBe(1);
});

// ---------------------------------------------------------------------------
// Credits

Given("the credits of the game", (s) => {
  s.credits = CREDITS;
});

When("the map's sources are listed", (s) => {
  s.listed = s.credits.map((c: { source: string; licence: string }) => [c.source, c.licence]);
});

Then("{string} is credited under {string}", (s, source: string, licence: string) => {
  expect(s.listed).toContainEqual([source, licence]);
});

