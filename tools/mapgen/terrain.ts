// Terrain per pixel, from real climate and relief data.
//
// The base terrain comes from the Köppen-Geiger climate class (rainforest is
// jungle, savanna climates are savanna, steppe is drylands, taiga is forest,
// and so on). Natural Earth's mountain-range outlines add relief: peaks deep
// inside a range, hills on its flanks, and the climate decides what kind of
// mountain it is (snowy rock, red desert rock, green tropical highland).
// The close-zoom art then breaks the base up with woods and fields.
import type { ClimateMap } from "./climate.ts";

/**
 * Close-zoom tile types, same order as TERRAINS in apps/client/src/art/palette.ts.
 * The first fourteen keep their old numbers; new types are appended.
 * docs/terrain.md lists each type, where it comes from and what it does.
 */
export const DETAIL_TERRAINS = [
  "grassland", "farmland", "hills", "mountains", "drylands", "marsh", "forest", "desert", "tundra", "jungle",
  "savanna", "glacier", "badlands", "highlands",
  "snowpeaks", "broadleaf", "mediterranean", "steppe", "dunes", "colddesert", "swamp", "paddies",
] as const;
export type DetailTerrain = (typeof DETAIL_TERRAINS)[number];
const T = Object.fromEntries(DETAIL_TERRAINS.map((t, i) => [t, i])) as Record<DetailTerrain, number>;

/** What the simulation sees: one ground per province (the grounds in the province design). */
export const PROVINCE_TERRAIN: Record<DetailTerrain, string> = {
  grassland: "grassland", farmland: "farmland", hills: "hills", mountains: "mountains", drylands: "drylands",
  marsh: "marsh", forest: "forest", desert: "desert", tundra: "tundra", jungle: "jungle", savanna: "savanna",
  glacier: "tundra", badlands: "mountains", highlands: "mountains", snowpeaks: "mountains", broadleaf: "forest",
  mediterranean: "grassland", steppe: "grassland", dunes: "desert", colddesert: "desert", swamp: "marsh", paddies: "farmland",
};

export function climateTerrain(k: string, lat: number): DetailTerrain {
  if (k === "Af" || k === "Am") return "jungle";
  if (k === "Aw" || k === "As") return "savanna";
  if (k === "BWh") return "desert";
  if (k === "BWk") return "colddesert";
  if (k === "BSh") return "drylands";
  if (k === "BSk") return "steppe";
  if (k === "EF") return "glacier";
  if (k === "ET") return "tundra";
  if (k.startsWith("D") && (k.endsWith("c") || k.endsWith("d"))) return "forest"; // taiga
  if (k === "Cfc" || k === "Cwc" || k === "Csc") return "forest";
  if (k === "Csa" || k === "Csb") return "mediterranean";
  if (k) return "grassland";
  // No climate data (a coast the climate grid calls sea): fall back to latitude.
  const a = Math.abs(lat);
  return a > 66 ? "tundra" : a > 55 ? "forest" : a < 10 ? "jungle" : "grassland";
}

/**
 * How wooded a climate's land was before people cleared it, and how much of
 * that wood is conifer. After the WWF terrestrial ecoregions (Olson et al.
 * 2001, BioScience 51:933): boreal taiga in the subarctic climates;
 * hemiboreal mixed forest of pine, spruce, oak and lime in the cool-summer
 * continental ones (Dfb: the Baltic, Muscovy, southern Scandinavia, New
 * England); broadleaf forest in the warm temperate ones; thinning out into
 * forest-steppe where the steppe begins. These are blurred across climate
 * borders, so one belt fades into the next instead of meeting at a line.
 */
function forestOf(k: string): [cover: number, pine: number] {
  if (k === "EF") return [0, 1];
  if (k === "ET") return [0.03, 1];
  if (k.startsWith("D") && (k.endsWith("c") || k.endsWith("d"))) return [0.88, 0.92];
  if (k === "Cfc" || k === "Cwc" || k === "Csc") return [0.75, 0.85];
  if (k === "Dfb" || k === "Dwb" || k === "Dsb") return [0.74, 0.5];
  if (k === "Dfa" || k === "Dwa" || k === "Dsa") return [0.45, 0.15];
  if (k === "Cfb" || k === "Cwb") return [0.42, 0.15];
  if (k === "Cfa" || k === "Cwa") return [0.42, 0.1];
  if (k === "Csa" || k === "Csb") return [0.15, 0.3];
  if (k === "BSk") return [0.03, 0.4];
  if (k.startsWith("B")) return [0.01, 0.3];
  if (!k) return [0.3, 0.5];
  return [0, 0]; // tropical climates break up on their own rules
}

/** Box blur over land only (weights in w), wrapping east-west; radius r pixels. */
function blurLand(v: Float32Array, w: Float32Array, W: number, H: number, r: number): Float32Array {
  const pass = (src: Float32Array, horizontal: boolean) => {
    const out = new Float32Array(src.length);
    const [len, lines] = horizontal ? [W, H] : [H, W];
    const at = (line: number, i: number) => (horizontal ? line * W + ((i % W) + W) % W : i * W + line);
    for (let line = 0; line < lines; line++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) if (horizontal || (i >= 0 && i < len)) sum += src[at(line, i)]!;
      for (let i = 0; i < len; i++) {
        out[at(line, i)] = sum;
        const add = i + r + 1;
        const drop = i - r;
        if (horizontal || add < len) sum += src[at(line, add)]!;
        if (horizontal || drop >= 0) sum -= src[at(line, drop)]!;
      }
    }
    return out;
  };
  const blur = (a: Float32Array) => pass(pass(pass(pass(a, true), false), true), false);
  const num = new Float32Array(v.length);
  for (let p = 0; p < v.length; p++) num[p] = v[p]! * w[p]!;
  const a = blur(num);
  const b = blur(w);
  for (let p = 0; p < v.length; p++) a[p] = b[p]! > 0 ? a[p]! / b[p]! : v[p]!;
  return a;
}

/** Monsoon Asia, where fields are rice paddies. */
const paddyLand = (lon: number, lat: number, k: string) =>
  lon > 72 && lon < 150 && lat > -11 && lat < 36 && /^(Cwa|Cfa|Cwb|Aw|Am|Af|As)$/.test(k);

export interface TerrainInput {
  width: number;
  height: number;
  /** Land label per pixel; negative is water. */
  label: Int32Array;
  lonOf: (x: number) => number;
  latOf: (y: number) => number;
  climate: ClimateMap;
  /** 1 where Natural Earth draws a mountain range, 2 for wetlands, else 0. */
  relief: Uint8Array;
  /** 1 where config.json forces lowland (a valley inside a range outline). */
  lowland: Uint8Array;
  /** Share of land under fields, 0-0.6, from the 1444 settlement density. */
  fieldShare: (lon: number, lat: number) => number;
}

const lattice = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export function buildTerrain(o: TerrainInput): { base: Uint8Array; detail: Uint8Array } {
  const { width: W, height: H, label } = o;
  const N = W * H;
  const smooth = (x: number, y: number, size: number, seed: number) => {
    const fx = x / size;
    const fy = y / size;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const u = (fx - x0) * (fx - x0) * (3 - 2 * (fx - x0));
    const v = (fy - y0) * (fy - y0) * (3 - 2 * (fy - y0));
    const wrap = Math.round(W / size);
    const at = (i: number, j: number) => lattice(((i % wrap) + wrap) % wrap, j, seed);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * u;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * u;
    return a + (b - a) * v;
  };
  const noise = (x: number, y: number, seed: number) => smooth(x, y, 12, seed) * 0.65 + smooth(x, y, 4, seed + 1) * 0.35;

  // Climate per pixel; coastal pixels the climate grid calls sea borrow a neighbour's.
  const koppen: string[] = new Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (label[p]! < 0) continue;
      let k = o.climate.at(o.lonOf(x), o.latOf(y));
      for (let r = 1; !k && r <= 4; r++) {
        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]] as const) {
          k = o.climate.at(o.lonOf(x + dx), o.latOf(y + dy));
          if (k) break;
        }
      }
      koppen[p] = k;
    }
  }

  // Forest cover and conifer share, blurred so the belts fade into each other
  // over a degree or two (the forest-steppe, the hemiboreal mixed forest).
  const cover0 = new Float32Array(N);
  const pine0 = new Float32Array(N);
  const weight = new Float32Array(N);
  for (let p = 0; p < N; p++) {
    if (label[p]! < 0 || koppen[p]!.startsWith("A")) continue;
    [cover0[p], pine0[p]] = forestOf(koppen[p]!);
    weight[p] = 1;
  }
  const cover = blurLand(cover0, weight, W, H, 10);
  const pine = blurLand(pine0, weight, W, H, 10);
  // The noise is bunched around 0.5; rank it so a threshold of c covers c of the land.
  const samples = Array.from({ length: 4096 }, (_, i) => noise(lattice(i, 0, 7) * W, lattice(i, 1, 7) * H, 1 + (i % 3))).sort((a, b) => a - b);
  const rank = (v: number) => {
    let lo = 0;
    let hi = samples.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (samples[m]! < v) lo = m + 1;
      else hi = m;
    }
    return lo / samples.length;
  };

  // Distance from the edge of each mountain range, so peaks sit in the middle.
  const isRange = (p: number) => label[p]! >= 0 && o.relief[p] === 1 && !o.lowland[p];
  const edge = new Int16Array(N).fill(-1);
  const queue = new Int32Array(N);
  let head = 0;
  let tail = 0;
  for (let p = 0; p < N; p++) if (!isRange(p)) ((edge[p] = 0), (queue[tail++] = p));
  while (head < tail) {
    const p = queue[head++]!;
    const x = p % W;
    for (const q of [p - W, p + W, p - x + ((x + 1) % W), p - x + ((x - 1 + W) % W)]) {
      if (q >= 0 && q < N && edge[q]! < 0) {
        edge[q] = edge[p]! + 1;
        queue[tail++] = q;
      }
    }
  }

  const base = new Uint8Array(N).fill(255);
  const detail = new Uint8Array(N).fill(255);
  for (let y = 0; y < H; y++) {
    const lat = o.latOf(y);
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (label[p]! < 0) continue;
      const k = koppen[p]!;
      const n1 = noise(x, y, 1);
      const n2 = noise(x, y, 2);
      let t: DetailTerrain = climateTerrain(k, lat);
      const lon = o.lonOf(x);
      if (o.lowland[p]) t = "grassland";
      else if (o.relief[p] === 2 && t !== "glacier") t = k.startsWith("A") ? "swamp" : "marsh";
      else if (isRange(p)) {
        // The whole range is mountain, edge to edge, with a thin rim of hills.
        // Its look follows the climate; snow where the climate is alpine or
        // polar, and on the high core of temperate ranges.
        const depth = edge[p]! + (n2 - 0.5) * 4;
        const cold = k === "ET" || k === "EF" || ((k.endsWith("c") || k.endsWith("d")) && edge[p]! >= 4);
        const peak: DetailTerrain = k.startsWith("B")
          ? "badlands"
          : k.startsWith("A")
            ? "highlands"
            : cold || edge[p]! + (n1 - 0.5) * 6 >= 9 || (Math.abs(lat) >= 50 && edge[p]! >= 5)
              ? "snowpeaks"
              : "mountains";
        if (depth >= 3) t = peak;
        else t = k.startsWith("A") ? "highlands" : k.startsWith("B") ? "badlands" : "hills";
      }

      // Woods: how much of the land is wooded follows the blurred forest cover,
      // less where 1444 settlement had cleared it for fields; which trees grow
      // follows the blurred conifer share, so pine and broadleaf mingle in the
      // mixed-forest belt. A little noise wobbles every edge.
      const share = o.fieldShare(lon, lat);
      const wobble = (smooth(x, y, 30, 5) - 0.5) * 0.24;
      const wooded = !!k && !k.startsWith("A") && t !== "mediterranean" && t !== "glacier";
      const c = wooded ? Math.max(0, cover[p]! + wobble) * (1 - share * 0.5) : 0;
      const isWood = wooded && rank(n1) > 1 - c;
      const conifer = rank(noise(x * 2, y * 2, 3)) < pine[p]! + wobble + (t === "hills" ? 0.2 : 0);
      const wood: DetailTerrain = conifer ? "forest" : "broadleaf";
      // Province ground: thickly wooded temperate land is forest ground.
      if (t === "grassland" && cover[p]! + wobble >= 0.6) t = "forest";
      else if (t === "forest" && cover[p]! + wobble < 0.45 && /^D..$/.test(k)) t = "grassland";
      base[p] = T[t];

      const field: DetailTerrain = paddyLand(lon, lat, k) ? "paddies" : "farmland";
      const erg = smooth(x, y, 40, 9);
      let d = t;
      if (t === "grassland" || t === "hills" || t === "forest") {
        if (isWood) d = wood;
        else if (t !== "hills" && rank(n2) < share) d = field;
        else if (t === "forest") d = k.startsWith("E") || (k.endsWith("c") || k.endsWith("d")) && cover[p]! < 0.7 ? "tundra" : "grassland";
      } else if (t === "tundra") {
        if (isWood) d = "forest";
      } else if (t === "mediterranean") {
        if (n1 > 0.74) d = "broadleaf";
        else if (n2 < share * 0.8) d = "farmland";
      } else if (t === "steppe") {
        if (isWood) d = wood;
        else if (n1 > 0.76) d = "grassland";
        else if (n2 < share * 0.4) d = "farmland";
      } else if (t === "desert") {
        if (erg > 0.56) d = "dunes";
        else if (n1 > 0.74) d = "drylands";
      } else if (t === "colddesert") {
        if (n1 > 0.72) d = "steppe";
      } else if (t === "drylands") {
        if (n1 > 0.72) d = "desert";
        else if (n1 < 0.2) d = "grassland";
        else if (n2 < share * 0.5) d = field;
      } else if (t === "savanna") {
        if (n1 > 0.72) d = "jungle";
        else if (n2 < share * 0.6) d = field;
      } else if (t === "jungle") {
        if (n1 < 0.2) d = "savanna";
        else if (n2 < share * 0.4) d = field;
      }
      detail[p] = T[d];
    }
  }
  return { base, detail };
}

/**
 * Ocean depth band per water pixel from Natural Earth's bathymetry layers:
 * 0 shelf (under 200 m), 1 slope (200-1,000 m), 2 deep (1-3 km),
 * 3 abyss (3-5 km), 4 trench (over 5 km).
 */
export const DEPTH_LAYERS = ["K_200", "J_1000", "H_3000", "F_5000"] as const;
