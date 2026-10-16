// Builds the playable world map from Natural Earth (public domain) data.
//
//   node --experimental-strip-types tools/mapgen/mapgen.ts
//
// Outputs:
//   apps/client/public/map/provinces.png   province id per pixel (RGB = id + 1, black = water)
//   apps/client/public/map/terrain.png     terrain per pixel for the close-zoom art (R = terrain index,
//                                          G = ocean depth band)
//   packages/rules/data/world/*.json       provinces, nations, map metadata
//
// Regions come from modern first-level admin borders (states, provinces,
// departments), merged or split to even sizes, then handed to 1444 nations by
// the rules in owners-1444.json. The result is an approximation of 1444, not
// a historical atlas.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePngRgb } from "./png.ts";
import { rasterize, type Grid } from "./raster.ts";
import { connectedComponents, forEachBorder, mergeSmall, splitRegion } from "./regions.ts";
import { buildSeaZones } from "./seas.ts";
import { loadClimate } from "./climate.ts";
import { buildTerrain, DEPTH_LAYERS, DETAIL_TERRAINS, PROVINCE_TERRAIN } from "./terrain.ts";
import { assignOwners, matchOwner, type NationSource, type OwnerRule } from "./owners.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const cacheDir = join(here, ".cache");
const config = JSON.parse(readFileSync(join(here, "config.json"), "utf8"));

const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/";

async function loadNe(name: string): Promise<any> {
  const file = join(cacheDir, `${name}.geojson`);
  if (!existsSync(file)) {
    mkdirSync(cacheDir, { recursive: true });
    console.log(`downloading ${name}…`);
    const res = await fetch(NE_BASE + name + ".geojson");
    if (!res.ok) throw new Error(`download ${name}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

const grid: Grid = { pxPerDeg: config.pxPerDeg, latTop: config.latTop, width: 360 * config.pxPerDeg, height: (config.latTop - config.latBottom) * config.pxPerDeg };
const W = grid.width;
const H = grid.height;
const lonOf = (x: number) => (x + 0.5) / grid.pxPerDeg - 180;
const latOf = (y: number) => grid.latTop - (y + 0.5) / grid.pxPerDeg;
const inBox = (lon: number, lat: number, b: number[]) => lon >= b[0]! && lat >= b[1]! && lon <= b[2]! && lat <= b[3]!;

/** Target province size in pixels at a location, from the density zones in config.json. */
function targetSize(lon: number, lat: number): number {
  for (const zone of config.density) if (inBox(lon, lat, zone.bbox)) return zone.target;
  return config.defaultTarget;
}

console.time("mapgen");
const admin1 = await loadNe("ne_10m_admin_1_states_provinces");
const lakes = await loadNe("ne_10m_lakes");
const geoRegions = await loadNe("ne_10m_geography_regions_polys");
const marine = await loadNe("ne_10m_geography_marine_polys");
const bathymetry = await Promise.all(DEPTH_LAYERS.map((l) => loadNe(`ne_10m_bathymetry_${l}`)));
const climate = await loadClimate(cacheDir);

// 1. Rasterise admin regions, then punch out large lakes.
const features = admin1.features.filter((f: any) => f.properties.adm0_a3 !== "ATA");
const source = new Int32Array(W * H).fill(-1);
features.forEach((f: any, i: number) => rasterize(grid, f.geometry, (x, y) => (source[y * W + x] = i)));
for (const lake of lakes.features) {
  if (lake.properties.scalerank <= config.lakeMaxScalerank && lake.properties.featurecla !== "Reservoir") {
    rasterize(grid, lake.geometry, (x, y) => (source[y * W + x] = -1));
  }
}

// 2. Connected pieces of each admin region (exclaves and islands become their own pieces).
const label = new Int32Array(W * H);
let count = connectedComponents(W, H, source, label);
const stats = () => {
  const size = new Array(count).fill(0);
  const sx = new Array(count).fill(0);
  const sy = new Array(count).fill(0);
  const votes = Array.from({ length: count }, () => new Map<number, number>());
  for (let p = 0; p < label.length; p++) {
    const l = label[p]!;
    if (l < 0) continue;
    size[l]++;
    sx[l] += p % W;
    sy[l] += Math.floor(p / W);
    votes[l]!.set(source[p]!, (votes[l]!.get(source[p]!) ?? 0) + 1);
  }
  // The admin region covering most of the piece names it and decides its country.
  const feature = votes.map((v) => [...v.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
  return { size, cx: sx.map((s, i) => s / size[i]), cy: sy.map((s, i) => s / size[i]), feature };
};

// Islets too small to play on become sea.
{
  const s = stats();
  const hasNeighbor = new Uint8Array(count);
  forEachBorder(W, H, label, (a, b) => ((hasNeighbor[a] = 1), (hasNeighbor[b] = 1)));
  for (let p = 0; p < label.length; p++) {
    const l = label[p]!;
    if (l >= 0 && !hasNeighbor[l] && s.size[l] < config.minIslandSize) {
      label[p] = -1;
      source[p] = -1;
    }
  }
  count = connectedComponents(W, H, label.slice(), label);
}

// Merges stay inside one 1444 owner (or one modern country for unowned land),
// so a small region never drags its neighbour across a 1444 border.
const ownerRules: OwnerRule[] = JSON.parse(readFileSync(join(here, "owners-1444.json"), "utf8"));
const groupKeys = new Map<string, number>();
const featureGroup = features.map((f: any) => {
  const p = f.properties;
  const owner = matchOwner(ownerRules, { country: p.adm0_a3, admin1: p.name, region: p.region ?? "", lon: p.longitude, lat: p.latitude });
  const key = owner ?? `none:${p.adm0_a3}`;
  if (!groupKeys.has(key)) groupKeys.set(key, groupKeys.size);
  return groupKeys.get(key)!;
});
const groupOf = (feature: number) => featureGroup[feature] as number;

// 3. Merge pieces that are too small.
// Pixels under each nation's capital: those pieces never merge away, so
// city-states like Hamburg or Ragusa keep their own province.
const nationSourcesEarly: NationSource[] = JSON.parse(readFileSync(join(here, "nations-1444.json"), "utf8"));
const capitalPixels = nationSourcesEarly.map((n) => Math.floor((grid.latTop - n.capital[1]) * grid.pxPerDeg) * W + Math.floor((n.capital[0] + 180) * grid.pxPerDeg));

function mergePass(minFactor: number) {
  const s = stats();
  const minSize = s.size.map((_, i) => targetSize(lonOf(s.cx[i]), latOf(s.cy[i])) * minFactor);
  for (const p of capitalPixels) if (label[p]! >= 0) minSize[label[p]!] = 0;
  mergeSmall({ width: W, height: H, label }, { count, size: s.size, group: s.feature.map(groupOf), minSize });
  count = connectedComponents(W, H, label.slice(), label);
}
mergePass(config.minFactor);

// 4. Split pieces that are too large.
{
  const s = stats();
  const pixelsOf: number[][] = Array.from({ length: count }, () => []);
  for (let p = 0; p < label.length; p++) if (label[p]! >= 0) pixelsOf[label[p]!]!.push(p);
  let next = count;
  for (let r = 0; r < count; r++) {
    const target = targetSize(lonOf(s.cx[r]), latOf(s.cy[r]));
    if (s.size[r] <= target * config.maxFactor) continue;
    const k = Math.round(s.size[r] / target);
    const pixels = Int32Array.from(pixelsOf[r]!);
    const parts = splitRegion(pixels, k, W, latOf);
    for (let i = 0; i < pixels.length; i++) if (parts[i]! > 0) label[pixels[i]!] = next + parts[i]! - 1;
    next += k - 1;
  }
  count = connectedComponents(W, H, label.slice(), label);
  // k-means can leave slivers; fold them back in.
  mergePass(config.minFactor * 0.5);
}

// 5. Province records.
const s = stats();
const P = count;
console.log(`${P} provinces`);
const neighborSets: Set<number>[] = Array.from({ length: P }, () => new Set());
forEachBorder(W, H, label, (a, b) => (neighborSets[a]!.add(b), neighborSets[b]!.add(a)));
const coastal = new Uint8Array(P);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const l = label[y * W + x]!;
    if (l < 0) continue;
    if (label[y * W + ((x + 1) % W)]! < 0 || label[y * W + ((x - 1 + W) % W)]! < 0 || (y > 0 && label[(y - 1) * W + x]! < 0) || (y < H - 1 && label[(y + 1) * W + x]! < 0)) coastal[l] = 1;
  }
}

// Terrain: climate (Köppen-Geiger) per pixel plus Natural Earth's mountain
// ranges and wetlands; each province takes the terrain covering most of it.
const relief = new Uint8Array(W * H);
for (const f of geoRegions.features) {
  const cls = f.properties.FEATURECLA;
  const v = cls === "Range/mtn" ? 1 : cls === "Wetlands" || cls === "Delta" ? 2 : 0;
  if (v) rasterize(grid, f.geometry, (x, y) => (relief[y * W + x] = relief[y * W + x] === 1 ? 1 : v));
}
// Natural Earth's range outlines swallow some big lowlands (the Po valley
// inside "Alps"); config.json lists boxes that stay lowland.
const lowland = new Uint8Array(W * H);
for (const low of config.lowlands as { bbox: number[] }[]) {
  const [x0, y1, x1, y0] = [(low.bbox[0]! + 180) * grid.pxPerDeg, (grid.latTop - low.bbox[1]!) * grid.pxPerDeg, (low.bbox[2]! + 180) * grid.pxPerDeg, (grid.latTop - low.bbox[3]!) * grid.pxPerDeg];
  for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) lowland[y * W + x] = 1;
}
const fieldShare = (lon: number, lat: number) => {
  const zone = config.settlement.find((z: any) => inBox(lon, lat, z.bbox));
  return Math.min(0.6, ((zone?.density ?? config.defaultDensity) as number) / 50);
};
const terrain = buildTerrain({ width: W, height: H, label, lonOf, latOf, climate, relief, lowland, fieldShare });
const terrainVotes = Array.from({ length: P }, () => new Map<string, number>());
for (let p = 0; p < label.length; p++) {
  const l = label[p]!;
  if (l < 0) continue;
  const t = PROVINCE_TERRAIN[DETAIL_TERRAINS[terrain.base[p]!]!];
  terrainVotes[l]!.set(t, (terrainVotes[l]!.get(t) ?? 0) + 1);
}

// Names: the admin region, plus a compass point when it was split.
const nameCount = new Map<string, number>();
for (let i = 0; i < P; i++) {
  const n = features[s.feature[i]].properties.name ?? "Unknown";
  nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
}
const featureCenters = new Map<number, { x: number; y: number; n: number }>();
for (let i = 0; i < P; i++) {
  const c = featureCenters.get(s.feature[i]) ?? { x: 0, y: 0, n: 0 };
  c.x += s.cx[i];
  c.y += s.cy[i];
  c.n++;
  featureCenters.set(s.feature[i], c);
}
const usedNames = new Set<string>();
function provinceName(i: number): string {
  const base = (features[s.feature[i]].properties.name ?? "Unknown") as string;
  let name = base;
  if (nameCount.get(base)! > 1) {
    const c = featureCenters.get(s.feature[i])!;
    const dx = s.cx[i] - c.x / c.n;
    const dy = s.cy[i] - c.y / c.n;
    const ns = dy < -Math.abs(dx) * 0.5 ? "North " : dy > Math.abs(dx) * 0.5 ? "South " : "";
    const ew = dx > Math.abs(dy) * 0.5 ? "East " : dx < -Math.abs(dy) * 0.5 ? "West " : "";
    name = `${ns}${ew}${base}`.replace(/(North|South) (East|West) /, (_, a, b) => `${a}${b.toLowerCase()} `);
    if (name === base) name = `Central ${base}`;
  }
  let unique = name;
  for (let k = 2; usedNames.has(unique); k++) unique = `${name} ${k}`;
  usedNames.add(unique);
  return unique;
}

// Provinces are numbered west to east within latitude bands so ids are stable-ish and readable.
const order = [...Array(P).keys()].sort((a, b) => Math.floor(s.cy[a] / 64) - Math.floor(s.cy[b] / 64) || s.cx[a] - s.cx[b]);
const newIndex = new Int32Array(P);
order.forEach((old, i) => (newIndex[old] = i));

const provinces = order.map((old) => {
  const props = features[s.feature[old]].properties;
  const lat = latOf(s.cy[old]);
  const lon = lonOf(s.cx[old]);
  let terrain = [...terrainVotes[old]!.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  // Grassland in the most crowded parts of 1444 was mostly under the plough.
  if (terrain === "grassland" && fieldShare(lon, lat) >= 0.36) terrain = "farmland";
  return {
    id: `p${newIndex[old]}`,
    name: provinceName(old),
    country: props.adm0_a3 as string,
    admin1: props.name as string,
    region: (props.region ?? "") as string,
    lon: +lon.toFixed(2),
    lat: +lat.toFixed(2),
    x: Math.round(s.cx[old]),
    y: Math.round(s.cy[old]),
    size: s.size[old] as number,
    coastal: !!coastal[old],
    terrain,
    neighbors: [...neighborSets[old]!].map((n) => `p${newIndex[n]}`).sort(),
  };
});

// 6. Nations and owners.
const nationSources: NationSource[] = JSON.parse(readFileSync(join(here, "nations-1444.json"), "utf8"));
const provinceAt = (lon: number, lat: number) => {
  const x = Math.floor((lon + 180) * grid.pxPerDeg);
  const y = Math.floor((grid.latTop - lat) * grid.pxPerDeg);
  // Coastal capitals can fall a pixel into the sea; take the nearest land.
  for (let r = 0; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const l = label[(y + dy) * W + ((x + dx + W) % W)]!;
        if (l >= 0) return `p${newIndex[l]}`;
      }
    }
  }
  return null;
};
const world = assignOwners(provinces, nationSources, ownerRules, config, provinceAt);

// 7. Sea zones, numbered after the land provinces.
const seaNames: string[] = [];
const seaNameGrid = new Int32Array(W * H).fill(-1);
const titleCase = (n: string) => (n === n.toUpperCase() ? n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : n);
// Big features first so smaller seas and bays painted later win.
for (const f of [...marine.features].sort((a: any, b: any) => a.properties.scalerank - b.properties.scalerank)) {
  if (!f.properties.name || ["river", "reef"].includes(f.properties.featurecla)) continue;
  const n = seaNames.push(titleCase(f.properties.name)) - 1;
  rasterize(grid, f.geometry, (x, y) => (seaNameGrid[y * W + x] = n));
}
// Large lakes are sailable too; name them after the lake.
for (const lake of lakes.features) {
  if (!lake.properties.name || lake.properties.scalerank > config.lakeMaxScalerank) continue;
  const n = seaNames.push(titleCase(lake.properties.name)) - 1;
  rasterize(grid, lake.geometry, (x, y) => (seaNameGrid[y * W + x] = n));
}
const sea = buildSeaZones({ width: W, height: H, land: label, latOf, lonOf, nameGrid: seaNameGrid, names: seaNames, ...config.seas });
console.log(`${sea.zones.length} sea zones`);
const seaNeighbors = sea.zones.map(() => new Set<string>());
const landById = new Map(world.provinces.map((p) => [p.id, p]));
const seaId = (z: number) => `sea${z}`;
{
  const touch = (p: number, q: number) => {
    const a = sea.zoneOf[p]!;
    if (a < 0) return;
    const b = sea.zoneOf[q]!;
    if (b >= 0 && b !== a) {
      seaNeighbors[a]!.add(seaId(b));
      seaNeighbors[b]!.add(seaId(a));
    } else if (label[q]! >= 0) {
      const landId = `p${newIndex[label[q]!]}`;
      seaNeighbors[a]!.add(landId);
      landById.get(landId)!.neighbors.push(seaId(a));
    }
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const right = y * W + ((x + 1) % W);
      touch(p, right);
      touch(right, p);
      if (y < H - 1) {
        touch(p, p + W);
        touch(p + W, p);
      }
    }
  }
  // Straits too narrow for the pixel grid (the Bosporus, the Øresund) still join their seas.
  const seaNear = (lon: number, lat: number) => {
    const cx = Math.floor((lon + 180) * grid.pxPerDeg);
    const cy = Math.floor((grid.latTop - lat) * grid.pxPerDeg);
    for (let r = 0; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const z = sea.zoneOf[(cy + dy) * W + ((cx + dx + W) % W)]!;
          if (z >= 0) return z;
        }
      }
    }
    throw new Error(`no sea near ${lon},${lat}`);
  };
  for (const s of config.straits as { name: string; a: [number, number]; b: [number, number] }[]) {
    const a = seaNear(...s.a);
    const b = seaNear(...s.b);
    if (a !== b) {
      seaNeighbors[a]!.add(seaId(b));
      seaNeighbors[b]!.add(seaId(a));
    }
  }
}
for (const p of world.provinces) p.neighbors = [...new Set(p.neighbors)].sort();
const seaProvinces = sea.zones.map((z, i) => ({
  id: seaId(i),
  name: z.name,
  owner: null,
  terrain: z.deep ? "ocean" : "sea",
  population: 0,
  wealth: 0,
  x: Math.round(z.cx),
  y: Math.round(z.cy),
  neighbors: [...seaNeighbors[i]!].sort(),
}));

// 8. Write outputs.
const rgb = new Uint8Array(W * H * 3);
for (let p = 0; p < label.length; p++) {
  const z = sea.zoneOf[p]!;
  if (label[p]! < 0 && z < 0) continue;
  const v = (z >= 0 ? P + z : newIndex[label[p]!]!) + 1;
  rgb[p * 3] = (v >> 16) & 255;
  rgb[p * 3 + 1] = (v >> 8) & 255;
  rgb[p * 3 + 2] = v & 255;
}
const mapDir = join(root, "apps/client/public/map");
const dataDir = join(root, "packages/rules/data/world");
mkdirSync(mapDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(mapDir, "provinces.png"), encodePngRgb(W, H, rgb));
writeFileSync(join(mapDir, "terrain.png"), encodePngRgb(W, H, detailTerrain()));
writeFileSync(
  join(dataDir, "map.json"),
  JSON.stringify({ width: W, height: H, pxPerDeg: grid.pxPerDeg, latTop: grid.latTop, provinceImage: "map/provinces.png", terrainImage: "map/terrain.png" }, null, 2) + "\n",
);
writeFileSync(join(dataDir, "provinces.json"), "[\n" + [...world.provinces, ...seaProvinces].map((p) => JSON.stringify(p)).join(",\n") + "\n]\n");
writeFileSync(join(dataDir, "nations.json"), JSON.stringify(world.nations, null, 2) + "\n");

/** Close-zoom terrain in R; for water, G is 1 + the depth band (0-4, see DEPTH_LAYERS). */
function detailTerrain(): Uint8Array {
  const depth = new Uint8Array(W * H);
  bathymetry.forEach((layer, i) => {
    for (const f of layer.features) rasterize(grid, f.geometry, (x, y) => (depth[y * W + x] = i + 1));
  });
  const out = new Uint8Array(W * H * 3);
  for (let p = 0; p < W * H; p++) {
    if (label[p]! >= 0) out[p * 3] = terrain.detail[p]!;
    else out[p * 3 + 1] = depth[p]! + 1; // 0 marks land
  }
  return out;
}

if (process.argv.includes("--preview")) {
  // Political preview at 1/4 scale, for eyeballing the result.
  const scale = 4;
  const pw = W / scale;
  const ph = Math.floor(H / scale);
  const out = new Uint8Array(pw * ph * 3);
  const colors = world.provinces.map((p) => {
    const n = world.nations.find((n) => n.id === p.owner);
    const hex = n ? n.color : "#8a8a7a";
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  });
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const l = label[y * scale * W + x * scale]!;
      const right = label[y * scale * W + x * scale + scale - 1]!;
      const down = label[(y * scale + scale - 1) * W + x * scale]!;
      const c = l < 0 ? [26, 28, 44] : l !== right || l !== down ? [0, 0, 0] : colors[newIndex[l]!]!;
      out.set(c, (y * pw + x) * 3);
    }
  }
  writeFileSync(join(cacheDir, "preview.png"), encodePngRgb(pw, ph, out));
  console.log(`preview: ${join(cacheDir, "preview.png")}`);
}
console.timeEnd("mapgen");
