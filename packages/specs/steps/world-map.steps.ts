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
  ANCHORS,
  anchorProvince,
  fordProvince,
  hasGreatRiver,
  onWater,
  passProvince,
  proposalFact,
  provinceName,
  provinceRecord,
  provinceSize,
  REJECTED_PROPOSALS,
  renamed,
  splitProvince,
  straitCrossing,
  STRAIT_CROSSINGS,
  type ProvinceRecord,
  seaZoneFrozen,
  seaZoneOpenToFleets,
  portFrozen,
  riverFrozen,
  riverCrossingPenalty,
} from "@ph/engine/domain/world-map";
import { tileCountForSize, shoreTileCount } from "@ph/engine/domain/province";
import { buildSave, chunkArrays, mapHash, memoryStorage, newCampaign as newSaveCampaign, worldChunks } from "@ph/engine/domain/saves";
import { Rng } from "@ph/engine";
import movement from "../../rules/data/domain/troop-movement.json" with { type: "json" };
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


// ---------------------------------------------------------------------------
// Decided: province facts, geographic lists, versions (D-MAP-1 … D-MAP-12)

const byName = (name: string) => {
  const p = landProvinces(graph).find((x) => x.name === name);
  if (!p) throw new Error(`no province ${name}`);
  return p;
};

Given("the province {string}", (s, name: string) => {
  s.provinceId = byName(name).id;
});

When("its record is read", (s) => {
  s.record = provinceRecord(graph, s.provinceId);
});

Then("it has an id, a name, a centre, a size, a ground, a coastal flag, a river flag and a list of neighbours", (s) => {
  const r: ProvinceRecord = s.record;
  expect(r.id).toBe("p1073");
  expect(r.name).toBe("Aube");
  expect(r.centre.x).toBeGreaterThan(0);
  expect(r.size).toBeGreaterThan(0);
  expect(r.ground).toBe("farmland");
  expect(typeof r.coastal).toBe("boolean");
  expect(r.river).toBe(true);
  expect(r.neighbours.length).toBeGreaterThan(0);
});

Then("its tile type is {string} and its ground is {string}", (s, type: string, ground: string) => {
  expect(s.record.tileType).toBe(type);
  expect(s.record.ground).toBe(ground);
  expect(groundOfTile(type)).toBe(ground);
});

Then("it is marked coastal", (s) => expect(s.record.coastal).toBe(true));
Then("it counts as on water for shore tiles", (s) => {
  expect(onWater(s.record)).toBe(true);
  expect(shoreTileCount(onWater(s.record))).toBeGreaterThanOrEqual(1);
});
Then("it has no sea-zone neighbour", (s) => {
  expect(s.record.neighbours.some((n: string) => isWater(graph.byId.get(n)!))).toBe(false);
});

Then("it is a river province", (s) => expect(s.record.river).toBe(true));
Then(/^it (does|does not) show that a navigable river runs through$/, (s, does: string) => {
  expect(s.record.navigableRiver).toBe(does === "does");
});
Then("its river counts as a great river for movement", (s) => {
  expect(hasGreatRiver(s.provinceId)).toBe(true);
  expect(s.record.navigableRiver).toBe(true);
});

Given(/^a province cut from the admin region "(.+)" that was (not split|split)$/, (s, admin: string, split: string) => {
  s.admin = admin;
  s.split = split === "split";
  s.build = () => {
    s.cutNames = landProvinces(graph).map((p) => p.name).filter((n) => n === admin || n.endsWith(` ${admin}`) || new RegExp(` ${admin} \\d+$`).test(n));
  };
});

Then("the province is named {string}", (s, name: string) => {
  expect(s.cutNames).toContain(name);
  if (!s.split) expect(s.cutNames).toEqual([name]);
  else {
    expect(s.cutNames.length).toBeGreaterThan(1);
    expect(name).toBe(provinceName(s.admin, name.slice(0, name.length - s.admin.length - 1)));
  }
});

Given(/^a province that is the (smallest|largest) on the map$/, (s, which: string) => {
  const sizes = landProvinces(graph).map((p) => provinceSize(p.id));
  s.size = which;
  s.pixels = which === "smallest" ? Math.min(...sizes) : Math.max(...sizes);
});

When("its tile row is made", (s) => {
  if (s.size) s.tiles = tileCountForSize(s.size);
  if (s.where) s.shore = shoreTileCount(onWater(s.where));
});

Then(/^it has (\d+) tiles$/, (s, n: string) => {
  expect(s.tiles).toBe(Number(n));
  expect(s.pixels).toBeGreaterThan(0);
});

const WHERE: Record<string, string> = { "on a coast": "Gironde", "on a navigable river": "Aube", "inland with no navigable river": "Loiret" };

Given(/^a province that is (on a coast|on a navigable river|inland with no navigable river)$/, (s, where: string) => {
  s.where = provinceRecord(graph, byName(WHERE[where]!).id);
});

Then(/^it has (1 to 3|0) shore tiles$/, (s, shore: string) => {
  if (shore === "0") expect(s.shore).toBe(0);
  else {
    expect(s.shore).toBeGreaterThanOrEqual(1);
    expect(s.shore).toBeLessThanOrEqual(3);
  }
});

Given("the event-tree anchor {string} in the area {string}", (s, anchor: string, area: string) => {
  s.anchor = anchor;
  s.area = area;
});

When("it is resolved on the map", (s) => {
  const a = anchorProvince(s.anchor);
  expect(a?.area).toBe(s.area);
  s.resolved = a ? [a.province] : [];
});

Then("exactly one province is returned", (s) => {
  expect(s.resolved).toHaveLength(1);
  expect(isWater(graph.byId.get(s.resolved[0])!)).toBe(false);
});

Then("it is the province {string}", (s, name: string) => expect(graph.byId.get(s.resolved[0])!.name).toBe(name));

Given("the event tree's {int} anchor provinces", (s, n: number) => {
  expect(ANCHORS).toHaveLength(n);
});

When("they are resolved on the map", (s) => {
  s.all = ANCHORS.map((a) => graph.byId.get(a.province));
});

Then("each resolves to one land province", (s) => {
  for (const p of s.all) expect(p && !isWater(p)).toBe(true);
});

Given("the ford {string} in the movement config", (s, name: string) => {
  expect(movement.fords.map((x: string) => `the ${x}`)).toContain(name);
  s.listed = fordProvince(name);
});

Given("the pass {string} in the movement config", (s, name: string) => {
  expect(movement.passes.some((x: string) => name.endsWith(x))).toBe(true);
  s.listed = passProvince(name.replace(/^the Pyrenees at /, ""));
});

Then(/^the province of "(.+)" is listed as a (ford|pass)$/, (s, _name: string, kind: string) => {
  const p = graph.byId.get(s.listed)!;
  expect(p).toBeDefined();
  expect(isWater(p)).toBe(false);
  if (kind === "pass") expect(["mountains", "hills"]).toContain(p.terrain);
});

Given("the strait crossing {string} in the movement config", (s, name: string) => {
  expect(movement.straitCrossings.some((x: string) => straitCrossing(x)?.name === straitCrossing(name)?.name)).toBe(true);
  s.crossing = straitCrossing(name);
});

Then("the two land provinces on either side of {string} are listed as a strait crossing", (s, _name: string) => {
  const [a, b] = s.crossing.provinces as [string, string];
  expect(a).not.toBe(b);
  for (const id of [a, b]) expect(isWater(graph.byId.get(id)!)).toBe(false);
  expect(STRAIT_CROSSINGS).toContain(s.crossing);
});

Then("the strait crossing joins {string} and {string}", (s, a: string, b: string) => {
  expect(s.crossing.provinces).toEqual([byName(a).id, byName(b).id]);
});

Given("the sea zone {string}", (s, name: string) => {
  s.zone = seaZones(graph).find((z) => z.name === name);
});

Then("it is a water place of kind {string}", (s, kind: string) => {
  expect(s.zone.terrain).toBe(kind);
  expect(isWater(s.zone)).toBe(true);
});

When("the places are listed in order", (s) => {
  s.listedPlaces = graph.places;
});

Then("all land provinces come before all sea zones", (s) => {
  const firstSea = s.listedPlaces.findIndex(isWater);
  expect(s.listedPlaces.slice(firstSea).every(isWater)).toBe(true);
});

Then("every sea zone has terrain {string} or {string}", (s, a: string, b: string) => {
  for (const z of seaZones(graph)) expect([a, b]).toContain(z.terrain);
});

Then("every sea zone is named from Natural Earth's marine areas", (s) => {
  for (const z of seaZones(graph)) {
    expect(z.name).not.toMatch(/^sea\d+$/);
    expect(z.name).toMatch(/^[\p{L}'.() -]+?( \d+°[NS] \d+°[EW])?( \d+)?$/u);
  }
});

Given("a province of the tile type {string}", (s, type: string) => {
  s.provinceId = landProvinces(graph).find((p) => provinceRecord(graph, p.id).tileType === type)!.id;
});

When("movement reads it", (s) => {
  s.fact = proposalFact(provinceRecord(graph, s.provinceId).tileType);
});

Then("{string} holds", (s, fact: string) => expect(s.fact).toBe(fact));

Given("the terrain proposal {string}", (s, proposal: string) => {
  s.proposal = proposal;
});

When("the map's facts are read", () => {});

Then("the proposal changes nothing in the game", (s) => {
  expect(REJECTED_PROPOSALS).toContain(s.proposal);
});

// Versions

Given("a campaign in {string}", (s, _when: string) => {
  s.world = createWorld(rules, 1);
});

Given("a campaign on the built map", (s) => {
  s.world = createWorld(rules, 1);
});

When("it is saved", (s) => {
  const rng = new Rng(1);
  const ctx = { storage: memoryStorage(), rules, rng, device: "phone", platform: "android" as const, gameVersion: "1", now: 0 };
  s.chunks = worldChunks(s.world, { playerNation: "france", options: { difficulty: "normal", events: "historical", endDate: "1939-08-31" } });
  s.save = buildSave(ctx, newSaveCampaign(rng, { playerNation: "france", nationName: "France" }), s.world, "manual");
});

Then("the save holds no adjacency, terrain, water, rivers or province shapes", (s) => {
  const names = s.chunks.flatMap((c: Parameters<typeof chunkArrays>[0]) => chunkArrays(c).map((a) => a.name));
  for (const n of names) expect(n).not.toMatch(/adj|terrain|water|river|shape|neighbo/i);
});

Then("the save header records the map's hash", (s) => {
  expect(s.save.header.mapHash).toBe(mapHash(rules));
});

Given("the province {string} holds the ports of Lübeck, Hamburg, Kiel and Flensburg", (s, name: string) => {
  s.old = byName(name).id;
});

When("the map generator splits it into two provinces", (s) => {
  const size = provinceSize(s.old);
  s.table = [splitProvince(s.old, [{ id: "p4411", size: Math.round(size / 2) }, { id: "p4412", size: size - Math.round(size / 2) }])];
});

Then("a rename table maps the old id to the two new ids with their shares", (s) => {
  const parts = renamed(s.table, s.old);
  expect(parts.map((x) => x.id)).toEqual(["p4411", "p4412"]);
  expect(parts.reduce((a, x) => a + x.share, 0)).toBeCloseTo(1);
  expect(renamed(s.table, "p1073")).toEqual([{ id: "p1073", share: 1 }]);
});

// ---------------------------------------------------------------------------
// Frozen seas and rivers (X-17)

const MONTH_INDEX = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (name: string) => ({ month: MONTH_INDEX.indexOf(name) + 1 });

When(/^it is (January|February|March|April|May|June|July|August|September|October|November|December)$/, (s, month: string) => {
  s.when = monthOf(month);
});
Then(/^the sea zone is (open|closed) to fleets$/, (s, state: string) => {
  expect(s.zone).toBeDefined();
  expect(seaZoneOpenToFleets(s.zone.name, s.when)).toBe(state === "open");
  expect(seaZoneFrozen(s.zone.name, s.when)).toBe(state === "closed");
});
Given("a port whose only sea zone is {string}", (s, zone: string) => {
  s.portZones = [zone];
});
Then("the port can neither launch nor take in ships", (s) => {
  expect(portFrozen(s.portZones, s.when)).toBe(true);
});
Then("in May it can", (s) => {
  expect(portFrozen(s.portZones, monthOf("May"))).toBe(false);
});
Given("a river at latitude {int} with a crossing penalty of {int} day", (s, lat: number, penalty: number) => {
  s.river = { lat, penalty };
});
Then(/^the river is (frozen|flowing) and its crossing penalty is (\d+) days$/, (s, state: string, penalty: string) => {
  expect(riverFrozen(s.river.lat, s.when)).toBe(state === "frozen");
  expect(riverCrossingPenalty(s.river.lat, s.when, s.river.penalty)).toBe(Number(penalty));
});
