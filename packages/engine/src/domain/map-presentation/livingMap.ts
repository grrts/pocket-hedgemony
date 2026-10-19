/**
 * The living map close in (VIEW-100..VIEW-131, living-map-design.md,
 * feedback 126): past the Local icons the map shows the world itself. Towns
 * cover map pixels in proportion to their people, hamlets and roads join
 * them, and armies, fleets and traders become figures in the ground's own art
 * pixels. Everything here is drawn from the snapshot, the map tiles and
 * seeded hashes; nothing feeds back into the simulation (INV-VIEW-3).
 * Numbers come from `livingMap` in map-presentation.json.
 */
import config from "../../../../rules/data/domain/map-presentation.json" with { type: "json" };
import { mix } from "../../names.ts";
import { GROUNDS, groundOfCell, riverOfCell, WATER, type LandGrid } from "../../tiles.ts";
import type { MapDetail } from "./index.ts";

const L = config.livingMap;

// ---------------------------------------------------------------------------
// Zoom bands (VIEW-100..VIEW-104)

export type LivingBand = "icons" | "living" | "street";

export interface DetailBands {
  living: boolean;
  street: boolean;
  life: "off" | "reduced" | "full";
  /** The closest camera zoom the player can pinch to. */
  closestZoom: number;
}

/** What Map detail turns on close in: Low keeps icons, Medium adds the living band, High the street level too (VIEW-104). */
export function detailBands(detail: MapDetail): DetailBands {
  const d = L.byDetail[detail];
  return { living: d.living, street: d.street, life: d.life as DetailBands["life"], closestZoom: d.closestZoom };
}

/** The band a camera zoom (CSS pixels per map pixel) is in at a Map detail (VIEW-100). */
export function livingBand(zoom: number, detail: MapDetail = "High"): LivingBand {
  const d = detailBands(detail);
  if (!d.living || zoom < L.livingFrom) return "icons";
  if (d.street && zoom >= L.streetFrom) return "street";
  return "living";
}

/**
 * How strongly icons and living pieces are drawn at a zoom: between
 * `livingFrom - livingFade` and `livingFrom` the icons fade out as the living
 * pieces fade in, so pinching across never pops (VIEW-101).
 */
export function bandFade(zoom: number, detail: MapDetail = "High"): { icons: number; living: number } {
  if (!detailBands(detail).living) return { icons: 1, living: 0 };
  const t = Math.min(1, Math.max(0, (zoom - (L.livingFrom - L.livingFade)) / L.livingFade));
  return { icons: 1 - t, living: t };
}

/** CSS pixels per art pixel for the pieces at a zoom: max(2, zoom / 8) in the living band, zoom / 16 at street level (VIEW-102). */
export function pieceUnit(zoom: number, detail: MapDetail = "High"): number {
  const band = livingBand(zoom, detail);
  return band === "street" ? zoom / L.unitDivisor.street : Math.max(L.minUnit, zoom / L.unitDivisor.living);
}

/** Art pixels along one side of a map pixel in a band (VIEW-103). */
export const bandArtPixels = (band: LivingBand): number => (band === "street" ? L.artPixels.street : L.artPixels.living);

// ---------------------------------------------------------------------------
// Towns (VIEW-105..VIEW-110)

/** The town people of a province, in thousands: the classes the province overview counts as town (VIEW-105). */
export function townPeopleThousands(classes: Readonly<Record<string, number>>): number {
  return L.townClasses.reduce((s, c) => s + (classes[c] ?? 0), 0);
}

/** How many map pixels a town covers: clamp(1, maxCells, round(sqrt(town thousands) × cellsPerRootK)) (VIEW-105). */
export function townCells(townThousands: number): number {
  return Math.min(L.maxCells, Math.max(1, Math.round(Math.sqrt(Math.max(0, townThousands)) * L.cellsPerRootK)));
}

const MOUNTAINS = GROUNDS.indexOf("mountains");
const MARSH = GROUNDS.indexOf("marsh");

/** The four neighbours of a tile, N, E, S, W; the map wraps east-west, -1 off the top or bottom. */
export function neighbours4(grid: Pick<LandGrid, "width" | "height">, t: number): [number, number, number, number] {
  const { width, height } = grid;
  const x = t % width;
  const y = (t - x) / width;
  return [y > 0 ? t - width : -1, y * width + ((x + 1) % width), y < height - 1 ? t + width : -1, y * width + ((x + width - 1) % width)];
}

// Water is told by the ground: water tiles may carry their sea zone as their province (NAVY-147).
const isWater = (grid: LandGrid, t: number): boolean => t < 0 || groundOfCell(grid.cellAt(t)) === WATER;
const touchesWater = (grid: LandGrid, t: number): boolean => neighbours4(grid, t).some((n) => n >= 0 && isWater(grid, n));

/** Wrapped distance between two tiles, in map pixels. */
export function tileDistance(grid: Pick<LandGrid, "width">, a: number, b: number): number {
  const w = grid.width;
  const ax = a % w, ay = (a - ax) / w, bx = b % w, by = (b - bx) / w;
  const dx = Math.min(Math.abs(ax - bx), w - Math.abs(ax - bx));
  return Math.hypot(dx, ay - by);
}

/** A seeded number in [0, 1) for a tile and a salt. */
const unit = (t: number, salt: number): number => mix(t, salt) / 4294967296;

/**
 * The fixed order a province's town grows in: from its seed (the land tile
 * nearest its centre point) out over its own land within `growRadius`, always
 * taking the cheapest tile on the town's edge next. Cost is distance to the
 * seed plus a small seeded jitter, less a bonus by rivers and coasts, plus a
 * penalty on mountains and marsh. Water is never used. Because the order is
 * fixed, a growing town only adds tiles at its edge (VIEW-106).
 */
export function townGrowthOrder(grid: LandGrid, province: number): number[] {
  const seed = grid.centre[province] ?? -1;
  if (seed < 0 || grid.provinceAt(seed) !== province + 1) return [];
  const g = L.growth;
  const cost = (t: number): number => {
    const c = grid.cellAt(t);
    const ground = groundOfCell(c);
    let k = tileDistance(grid, seed, t) + unit(t, province) * g.jitter;
    if (riverOfCell(c)) k -= g.riverBonus;
    if (touchesWater(grid, t)) k -= g.coastBonus;
    if (ground === MOUNTAINS) k += g.mountainPenalty;
    if (ground === MARSH) k += g.marshPenalty;
    return k;
  };
  const order: number[] = [seed];
  const seen = new Set([seed]);
  const edge: { t: number; k: number }[] = [];
  const reach = (from: number): void => {
    for (const n of neighbours4(grid, from)) {
      if (n < 0 || seen.has(n) || grid.provinceAt(n) !== province + 1 || tileDistance(grid, seed, n) > L.growRadius) continue;
      seen.add(n);
      edge.push({ t: n, k: cost(n) });
    }
  };
  reach(seed);
  while (edge.length) {
    let best = 0;
    for (let i = 1; i < edge.length; i++) if (edge[i]!.k < edge[best]!.k || (edge[i]!.k === edge[best]!.k && edge[i]!.t < edge[best]!.t)) best = i;
    const { t } = edge.splice(best, 1)[0]!;
    order.push(t);
    reach(t);
  }
  return order;
}

export interface TownFootprint {
  seed: number;
  /** Every tile of the town, in growth order: the core first, then the outskirts. */
  tiles: number[];
  core: number[];
  outskirts: number[];
}

/** A town's tiles: the first `cells` of its growth order, the first coreShare of them the core (VIEW-106, VIEW-107). */
export function townFootprint(grid: LandGrid, province: number, cells: number, order: readonly number[] = townGrowthOrder(grid, province)): TownFootprint {
  const tiles = order.slice(0, Math.max(0, Math.min(cells, order.length)));
  const coreCount = tiles.length ? Math.max(1, Math.round(tiles.length * L.coreShare)) : 0;
  return { seed: order[0] ?? -1, tiles, core: tiles.slice(0, coreCount), outskirts: tiles.slice(coreCount) };
}

/**
 * Footprints are worked out again when a turn is applied in a new game month
 * only, and only for provinces whose cell count changed (VIEW-108).
 */
export function townsToRefresh(o: { lastMonth: string | null; month: string; before: ReadonlyMap<number, number>; after: ReadonlyMap<number, number> }): number[] {
  if (o.lastMonth === o.month) return [];
  const out: number[] = [];
  for (const [p, cells] of o.after) if (o.before.get(p) !== cells) out.push(p);
  for (const p of o.before.keys()) if (!o.after.has(p)) out.push(p);
  return out.sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// What stands in a town (VIEW-109, VIEW-110)

export type CellKind = "none" | "hamlet" | "outskirts" | "core" | "keep" | "market" | "worship" | "docks" | "drill yard" | "works" | "ash" | "site" | "landmark";
export const CELL_KINDS = L.cellKinds as CellKind[];
export const cellKindCode = (k: CellKind): number => CELL_KINDS.indexOf(k);

export interface TownState {
  /** The province is a realm's capital: a keep with the realm's flag. */
  capital?: boolean;
  /** Castle work step: 0 none, 1 fort (palisade), 2 or more castle (stone with towers). */
  castleStep?: number;
  market?: boolean;
  drillYard?: boolean;
  harbour?: boolean;
  coastal?: boolean;
  /** A hand-made landmark replaces the keep or worship cell (VIEW-131). */
  landmark?: boolean;
}

export interface TownPlan {
  footprint: TownFootprint;
  /** Kind per town tile; tiles not listed are core or outskirts by ring. */
  special: Map<number, CellKind>;
  walls: "none" | "palisade" | "stone";
  /** The water tiles a pier reaches into from the docks. */
  piers: number[];
}

/**
 * Special cells are taken from the core in growth order, starting at the
 * seed: keep (capital), market, worship (always), drill yard; the docks take
 * the first town tile by water when there is a harbour or the coast (VIEW-109).
 */
export function townPlan(grid: LandGrid, footprint: TownFootprint, s: TownState): TownPlan {
  const special = new Map<number, CellKind>();
  const free = footprint.core.slice();
  let docks: number | undefined;
  if (s.harbour || s.coastal) {
    docks = footprint.tiles.find((t) => touchesWater(grid, t));
    if (docks !== undefined) {
      special.set(docks, "docks");
      const i = free.indexOf(docks);
      if (i >= 0) free.splice(i, 1);
    }
  }
  const wanted: CellKind[] = [];
  if (s.capital) wanted.push(s.landmark ? "landmark" : "keep");
  if (s.market) wanted.push("market");
  wanted.push(s.landmark && !s.capital ? "landmark" : "worship");
  if (s.drillYard) wanted.push("drill yard");
  for (const kind of wanted) {
    const t = free.shift();
    if (t === undefined) break;
    special.set(t, kind);
  }
  const step = s.castleStep ?? 0;
  const piers = docks === undefined ? [] : neighbours4(grid, docks).filter((n) => n >= 0 && isWater(grid, n));
  return { footprint, special, walls: step <= 0 ? "none" : step === 1 ? "palisade" : "stone", piers };
}

/** The kind of every town tile, by its plan and ring. */
export function townCellKinds(plan: TownPlan): Map<number, CellKind> {
  const out = new Map<number, CellKind>();
  for (const t of plan.footprint.core) out.set(t, plan.special.get(t) ?? "core");
  for (const t of plan.footprint.outskirts) out.set(t, plan.special.get(t) ?? "outskirts");
  return out;
}

/**
 * The tiles a wall ring runs along: the core's outer edges, where a core tile
 * meets a tile that is not core. Returned as tile and side (0 N, 1 E, 2 S, 3 W).
 * The shader works the same out from neighbouring core cells (VIEW-110).
 */
export function wallEdges(grid: LandGrid, plan: TownPlan): [number, number][] {
  if (plan.walls === "none") return [];
  const core = new Set(plan.footprint.core);
  const out: [number, number][] = [];
  for (const t of plan.footprint.core) neighbours4(grid, t).forEach((n, side) => !core.has(n) && out.push([t, side]));
  return out;
}

// ---------------------------------------------------------------------------
// Hamlets, works and roads (VIEW-111..VIEW-114)

/** How many hamlets the countryside makes: clamp(0, 6, round(rural thousands / 40)) (VIEW-111). */
export function hamletCount(ruralThousands: number): number {
  const h = L.hamlets;
  return Math.min(h.max, Math.max(0, Math.round(Math.max(0, ruralThousands) / h.ruralThousandsPerHamlet)));
}

/** Land tiles of a province in a seeded order (stable for the province). */
function seededTiles(grid: LandGrid, province: number, salt: number): number[] {
  const out: number[] = [];
  const b = grid.bounds;
  const [x0, y0, x1, y1] = [b[province * 4]!, b[province * 4 + 1]!, b[province * 4 + 2]!, b[province * 4 + 3]!];
  if (!(x1 >= x0 && y1 >= y0)) return out;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = y * grid.width + x;
    if (grid.provinceAt(t) === province + 1) out.push(t);
  }
  const key = (t: number): number => mix(t, province * 31 + salt);
  return out.sort((a, b) => key(a) - key(b) || a - b);
}

/** Hamlet tiles: seeded, at least minSpacing from the town and from each other (VIEW-111). */
export function hamletSpots(grid: LandGrid, province: number, count: number, town: readonly number[]): number[] {
  const out: number[] = [];
  if (count <= 0) return out;
  const far = (t: number, from: readonly number[]): boolean => from.every((u) => tileDistance(grid, t, u) >= L.hamlets.minSpacing);
  for (const t of seededTiles(grid, province, 1)) {
    if (out.length >= count) break;
    if (far(t, town) && far(t, out)) out.push(t);
  }
  return out;
}

export type WorksSpotKind = keyof typeof L.worksSpots;

/** One seeded tile for a mine, quarry or lumber camp, on matching ground when the province has it (VIEW-112). */
export function worksSpot(grid: LandGrid, province: number, work: WorksSpotKind, taken: ReadonlySet<number>): number | null {
  const grounds = new Set((L.worksSpots[work] as string[]).map((g) => GROUNDS.indexOf(g as (typeof GROUNDS)[number])));
  const tiles = seededTiles(grid, province, 2 + Object.keys(L.worksSpots).indexOf(work)).filter((t) => !taken.has(t));
  return tiles.find((t) => grounds.has(groundOfCell(grid.cellAt(t)))) ?? tiles[0] ?? null;
}

export type RoadGrade = "track" | "road" | "paved road";
const ROAD_STEPS = ["track", "road", "paved road"] as const;

/** A road between two towns is drawn at the lower of both ends' road step, and a track when either has none (VIEW-113). */
export function roadGrade(stepA: number, stepB: number): RoadGrade {
  return ROAD_STEPS[Math.max(0, Math.min(ROAD_STEPS.length - 1, Math.min(stepA, stepB)))]!;
}

const stepCost = (grid: LandGrid, t: number): number => {
  const c = L.roads.cost as Record<string, number>;
  return c[GROUNDS[groundOfCell(grid.cellAt(t))] ?? ""] ?? c.default!;
};

/** A binary min-heap of indices by priority, ties broken by the lower index so paths are the same everywhere. */
class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];
  get size(): number {
    return this.ids.length;
  }
  private less(a: number, b: number): boolean {
    return this.keys[a]! < this.keys[b]! || (this.keys[a] === this.keys[b] && this.ids[a]! < this.ids[b]!);
  }
  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b]!, this.ids[a]!];
    [this.keys[a], this.keys[b]] = [this.keys[b]!, this.keys[a]!];
  }
  push(id: number, key: number): void {
    this.ids.push(id);
    this.keys.push(key);
    for (let i = this.ids.length - 1; i > 0; ) {
      const up = (i - 1) >> 1;
      if (!this.less(i, up)) break;
      this.swap(i, up);
      i = up;
    }
  }
  pop(): number {
    const top = this.ids[0]!;
    const lastId = this.ids.pop()!, lastKey = this.keys.pop()!;
    if (this.ids.length) {
      this.ids[0] = lastId;
      this.keys[0] = lastKey;
      for (let i = 0; ; ) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.ids.length && this.less(l, m)) m = l;
        if (r < this.ids.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

/**
 * The line a road takes from one tile to another over land, north, east,
 * south and west only, round the water; null when no land way is found
 * within the box of both ends plus a margin. Rivers are crossed on a tile
 * that becomes a bridge (VIEW-113).
 */
export function roadPath(grid: LandGrid, from: number, to: number): number[] | null {
  if (isWater(grid, from) || isWater(grid, to)) return null;
  if (from === to) return [from];
  const w = grid.width;
  const m = L.roads.searchMargin;
  const fx = from % w, fy = Math.floor(from / w), tx = to % w, ty = Math.floor(to / w);
  // Work in a box in unwrapped x, so a road across the date line still finds its way.
  let ux = tx;
  if (Math.abs(tx - fx) > w / 2) ux = tx < fx ? tx + w : tx - w;
  const bx0 = Math.min(fx, ux) - m, bx1 = Math.max(fx, ux) + m, by0 = Math.max(0, Math.min(fy, ty) - m), by1 = Math.min(grid.height - 1, Math.max(fy, ty) + m);
  const bw = bx1 - bx0 + 1;
  const local = (x: number, y: number): number => (y - by0) * bw + (x - bx0);
  const tile = (x: number, y: number): number => y * w + (((x % w) + w) % w);
  const size = bw * (by1 - by0 + 1);
  const dist = new Float64Array(size).fill(Infinity);
  const prev = new Int32Array(size).fill(-1);
  const open = new MinHeap();
  const start = local(fx, fy), goal = local(ux, ty);
  dist[start] = 0;
  open.push(start, 0);
  const h = (x: number, y: number): number => Math.abs(x - ux) + Math.abs(y - ty);
  // Old roads keep to the straight line between the towns where the ground lets them: a step costs more the farther it strays from it.
  const lx = ux - fx, ly = ty - fy, len = Math.hypot(lx, ly) || 1;
  const stray = (x: number, y: number): number => (L.roads.straightness * Math.abs((x - fx) * ly - (y - fy) * lx)) / len;
  const done = new Uint8Array(size);
  while (open.size) {
    const i = open.pop();
    if (done[i]) continue;
    done[i] = 1;
    if (i === goal) break;
    const x = (i % bw) + bx0, y = Math.floor(i / bw) + by0;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < bx0 || nx > bx1 || ny < by0 || ny > by1) continue;
      const t = tile(nx, ny);
      if (isWater(grid, t)) continue;
      const j = local(nx, ny);
      const d = dist[i]! + stepCost(grid, t) + stray(nx, ny);
      if (d < dist[j]!) {
        dist[j] = d;
        prev[j] = i;
        open.push(j, d + h(nx, ny));
      }
    }
  }
  if (dist[goal] === Infinity) return null;
  const out: number[] = [];
  for (let i = goal; i >= 0; i = prev[i]!) out.push(tile((i % bw) + bx0, Math.floor(i / bw) + by0));
  return out.reverse();
}

export interface RoadLine {
  from: number;
  to: number;
  grade: RoadGrade;
  path: number[];
  /** Tiles where the road crosses a river. */
  bridges: number[];
}

export interface TownSeat {
  province: number;
  /** The town's seed tile. */
  seed: number;
  /** The province's road step: 0 track, 1 road, 2 paved road. */
  roadStep: number;
}

/**
 * Whether two neighbouring towns get a road of their own: not when a third
 * town, neighbour to both, is nearer to each of them than they are to each
 * other, since the way then runs through that town (the relative neighbourhood
 * of the towns). Only towns that stand are counted: unsettled land has none.
 * This keeps a few ways out of each town, as the roads of the time ran, rather
 * than a web to every neighbour (VIEW-113).
 */
export function keepsRoad(grid: Pick<LandGrid, "width">, a: TownSeat, b: TownSeat, shared: readonly TownSeat[]): boolean {
  const d = tileDistance(grid, a.seed, b.seed);
  return !shared.some((c) => c.province !== a.province && c.province !== b.province && Math.max(tileDistance(grid, a.seed, c.seed), tileDistance(grid, b.seed, c.seed)) < d);
}

/**
 * The roads a region draws: one from each town to the town of each
 * neighbouring province where keepsRoad holds (each pair once), and a track
 * from each hamlet to its nearest town or hamlet when that is within
 * trackReach (VIEW-113).
 */
export function roadLines(grid: LandGrid, towns: readonly TownSeat[], neighbours: (province: number) => readonly number[], hamlets: readonly number[] = []): RoadLine[] {
  const out: RoadLine[] = [];
  const bySeat = new Map(towns.map((t) => [t.province, t]));
  const line = (from: number, to: number, grade: RoadGrade): void => {
    const path = roadPath(grid, from, to);
    if (path) out.push({ from, to, grade, path, bridges: path.filter((t) => riverOfCell(grid.cellAt(t))) });
  };
  for (const a of towns) {
    for (const p of neighbours(a.province)) {
      const b = bySeat.get(p);
      if (!b || b.province <= a.province) continue;
      const near = new Set(neighbours(b.province));
      const shared = neighbours(a.province).filter((q) => near.has(q)).map((q) => bySeat.get(q)).filter((c): c is TownSeat => !!c);
      if (!keepsRoad(grid, a, b, shared)) continue;
      line(a.seed, b.seed, roadGrade(a.roadStep, b.roadStep));
    }
  }
  const places = [...towns.map((t) => t.seed), ...hamlets];
  for (const h of hamlets) {
    let best = -1, bestD = Infinity;
    for (const p of places) {
      if (p === h) continue;
      const d = tileDistance(grid, h, p);
      if (d < bestD || (d === bestD && p < best)) (best = p), (bestD = d);
    }
    if (best >= 0 && bestD <= L.hamlets.trackReach) line(h, best, "track");
  }
  return out;
}

/** The N/E/S/W road links on every tile the roads pass (bit 0 N, 1 E, 2 S, 3 W). */
export function roadLinks(grid: LandGrid, roads: readonly RoadLine[]): Map<number, number> {
  const links = new Map<number, number>();
  const add = (t: number, bit: number): void => void links.set(t, (links.get(t) ?? 0) | bit);
  for (const r of roads) {
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1]!, b = r.path[i]!;
      const side = neighbours4(grid, a).indexOf(b);
      if (side < 0) continue;
      add(a, 1 << side);
      add(b, 1 << ((side + 2) % 4));
    }
  }
  return links;
}

// ---------------------------------------------------------------------------
// The settlement byte (VIEW-115)

export interface ProvinceSettlement {
  plan?: TownPlan;
  hamlets?: readonly number[];
  works?: readonly number[];
  /** Town tiles in ash (burned or sacked) or under scaffolding (building site); town states (VIEW-128). */
  ash?: readonly number[];
  sites?: readonly number[];
}

/** One settlement byte: the cell kind in bits 0-3 and the road links N/E/S/W in bits 4-7 (VIEW-115). */
export const settlementByte = (kind: CellKind, links = 0): number => (cellKindCode(kind) & 15) | ((links & 15) << 4);
export const kindOfByte = (b: number): CellKind => CELL_KINDS[b & 15] ?? "none";
export const linksOfByte = (b: number): number => b >> 4;

/**
 * The settlement byte of every map tile, for the free alpha channel of the
 * province id texture. Ash and building sites cover town tiles; town tiles
 * cover works and hamlets; roads add their links on any tile (VIEW-115).
 */
export function settlementBytes(grid: LandGrid, settlements: Iterable<ProvinceSettlement>, roads: readonly RoadLine[] = []): Uint8Array {
  const kind = new Uint8Array(grid.width * grid.height);
  for (const s of settlements) {
    for (const t of s.hamlets ?? []) kind[t] = cellKindCode("hamlet");
    for (const t of s.works ?? []) kind[t] = cellKindCode("works");
    if (s.plan) for (const [t, k] of townCellKinds(s.plan)) kind[t] = cellKindCode(k);
    for (const t of s.sites ?? []) kind[t] = cellKindCode("site");
    for (const t of s.ash ?? []) kind[t] = cellKindCode("ash");
  }
  for (const [t, l] of roadLinks(grid, roads)) kind[t] = (kind[t]! & 15) | (l << 4);
  return kind;
}

/** The box of tiles whose byte differs between two settlement images, or null when none does; the renderer rewrites only the chunks it touches (VIEW-115). */
export function changedBox(width: number, before: Uint8Array, after: Uint8Array): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let t = 0; t < after.length; t++) {
    if (before[t] === after[t]) continue;
    const x = t % width, y = (t - x) / width;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

// ---------------------------------------------------------------------------
// Figures, hulls and movers (VIEW-116..VIEW-124)

export type FigureArm = "foot" | "horse" | "guns" | "wagons";
export type FormationState = "standing" | "marching" | "fighting" | "besieging";
type Band = Exclude<LivingBand, "icons">;

export interface Figure {
  arm: FigureArm;
  /** Offset from the piece's point in art pixels of its band, x east, y south. */
  x: number;
  y: number;
  /** The leading figure carries the realm's banner; rebels carry none. */
  banner?: boolean;
}

/** How many figures an army is: one per menPerFigure men, at least 1, at most maxFigures (VIEW-116). */
export function figureCount(men: number, band: Band): number {
  const f = L.figures;
  return Math.min(f.maxFigures[band], Math.max(1, Math.round(men / f.menPerFigure[band])));
}

/** Figures split between the arms by largest remainder; wagons, when there are any, take one figure once there are two or more (VIEW-116). */
export function figureArms(count: number, arms: { foot?: number; horse?: number; guns?: number; wagons?: boolean }): FigureArm[] {
  const parts = (["foot", "horse", "guns"] as const).map((a) => [a, Math.max(0, arms[a] ?? 0)] as const);
  const total = parts.reduce((s, [, n]) => s + n, 0);
  const wagons = arms.wagons && count >= 2 ? 1 : 0;
  const n = count - wagons;
  const out: FigureArm[] = [];
  if (total <= 0) {
    for (let i = 0; i < n; i++) out.push("foot");
  } else {
    const exact = parts.map(([a, m]) => ({ a, q: (m / total) * n }));
    const whole = exact.map((e) => ({ a: e.a, k: Math.floor(e.q), r: e.q - Math.floor(e.q) }));
    let left = n - whole.reduce((s, w) => s + w.k, 0);
    for (const w of [...whole].sort((x, y) => y.r - x.r)) if (left-- > 0) w.k++;
    // Every arm that has men shows at least one figure while there is room.
    for (const w of whole) {
      if (w.k === 0 && (arms[w.a] ?? 0) > 0) {
        const donor = whole.reduce((b, x) => (x.k > b.k ? x : b));
        if (donor.k > 1) (donor.k--, w.k++);
      }
    }
    for (const w of whole) for (let i = 0; i < w.k; i++) out.push(w.a);
  }
  for (let i = 0; i < wagons; i++) out.push("wagons");
  return out;
}

export interface FormationInput {
  men: number;
  foot?: number;
  horse?: number;
  guns?: number;
  wagons?: boolean;
  state: FormationState;
  band: Band;
  /** Unit direction it last marched or faces the enemy (dx, dy); east when unknown. */
  facing?: readonly [number, number];
  rebel?: boolean;
}

/**
 * An army as figures and where each stands (VIEW-117..VIEW-120): standing in
 * ranks facing the way it last marched; marching in a column with the banner
 * in front; fighting with its front rank towards the enemy; besieging in a
 * ring round the walls. Rebels carry no banner.
 */
export function formation(a: FormationInput): Figure[] {
  const arms = figureArms(figureCount(a.men, a.band), a);
  const [sx, sy] = L.figures.spacing as [number, number];
  const len = Math.hypot(a.facing?.[0] ?? 1, a.facing?.[1] ?? 0) || 1;
  const fx = (a.facing?.[0] ?? 1) / len, fy = (a.facing?.[1] ?? 0) / len;
  // Along the facing (forward) and across it (to the right).
  const place = (fwd: number, side: number): [number, number] => [Math.round(fwd * fx - side * fy) || 0, Math.round(fwd * fy + side * fx) || 0];
  const n = arms.length;
  let at: [number, number][];
  if (a.state === "marching") {
    at = arms.map((_, i) => place(-i * sx, 0));
  } else if (a.state === "besieging") {
    const r = L.figures.siegeRing;
    at = arms.map((_, i) => [Math.round(Math.cos((2 * Math.PI * i) / n) * r), Math.round(Math.sin((2 * Math.PI * i) / n) * r)]);
  } else {
    const ranks = Math.min(L.figures.ranks, n);
    const files = Math.ceil(n / ranks);
    // Standing and fighting: foot in the front ranks, horse on, guns and wagons at the back.
    at = arms.map((_, i) => {
      const rank = Math.floor(i / files), file = i % files;
      return place(-rank * sy, (file - (files - 1) / 2) * sx);
    });
  }
  return arms.map((arm, i) => ({ arm, x: at[i]![0], y: at[i]![1], ...(i === 0 && !a.rebel && a.state !== "besieging" ? { banner: true } : {}) }));
}

/** Figures lost in a battle round: the side's men now against when the battle began, as figures (VIEW-119). */
export function figuresLeft(menAtStart: number, menNow: number, band: Band): number {
  if (menNow <= 0) return 0;
  const start = figureCount(menAtStart, band);
  return Math.max(1, Math.min(start, Math.round((start * menNow) / Math.max(1, menAtStart))));
}

/** How many hulls a fleet is: one per shipsPerHull ships, at most maxHulls (VIEW-121). */
export function hullCount(ships: number, band: Band): number {
  if (ships <= 0) return 0;
  const h = L.hulls;
  return Math.min(h.maxHulls[band], Math.max(1, Math.ceil(ships / h.shipsPerHull[band])));
}

/** Hulls at sea in a loose formation round the fleet's point, seeded by fleet, in art pixels (VIEW-121). */
export function hullsAtSea(fleet: number, ships: number, band: Band): { x: number; y: number }[] {
  const n = hullCount(ships, band);
  const r = L.hulls.spread;
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return { x: 0, y: 0 };
    const angle = (2 * Math.PI * i) / Math.max(1, n - 1) + unit(fleet, i) * 0.6;
    const d = r * (0.6 + unit(fleet, i + 100) * 0.4) * (1 + Math.floor((i - 1) / 6) * 0.8);
    return { x: Math.round(Math.cos(angle) * d), y: Math.round(Math.sin(angle) * d) };
  });
}

/** In port, hulls lie at the docks' berths, as many as the harbour has berths; the rest wait off the docks (VIEW-122). */
export function hullsInPort(hulls: number, berths: number): { atBerth: number; waiting: number } {
  const atBerth = Math.min(hulls, Math.max(0, berths));
  return { atBerth, waiting: hulls - atBerth };
}

export type TraderMedium = "land" | "river" | "sea";

/** The figure a trader is drawn as: a caravan on land, a barge on a river, a trading ship at sea (VIEW-123). */
export const traderFigure = (medium: TraderMedium): string => (L.traders.figure as Record<string, string>)[medium]!;

/**
 * The berths of a port town, as map pixels: the water pixels next to its town
 * pixels, the docks' first, then in the town's growth order, every
 * `berthSpacing`th one, so hulls lie along the waterfront without
 * overlapping (VIEW-122). `town` is the docks pixel (if any) and then the rest.
 */
export function berthSpots(grid: LandGrid, town: readonly number[]): number[] {
  const seen = new Set<number>();
  const water: number[] = [];
  for (const t of town) {
    for (const n of neighbours4(grid, t)) {
      if (n < 0 || !isWater(grid, n) || seen.has(n)) continue;
      seen.add(n);
      water.push(n);
    }
  }
  return water.filter((_, i) => i % L.hulls.berthSpacing === 0);
}

/**
 * Where a trader stands on the leg it walks, from the daily walk's share of
 * the way (VIEW-123): the tile it last reached and the share of the way on to
 * the next, as an army steps along its tiles. A leg of one tile or none keeps
 * it there.
 */
export function traderOnLeg(tiles: number, progress: number): { index: number; frac: number } {
  if (tiles < 2) return { index: 0, frac: 0 };
  const along = Math.min(1, Math.max(0, progress)) * (tiles - 1);
  const index = Math.min(tiles - 2, Math.floor(along));
  return { index, frac: along - index };
}

// ---------------------------------------------------------------------------
// Plates, names, taps and the overlay budget (VIEW-125..VIEW-127, VIEW-129)

/** Whether a piece shows its number plate and its name: always in the icons band; in the living band only when selected or with Markers on; names always at street level (VIEW-126). */
export function pieceLabels(band: LivingBand, o: { markers: boolean; selected: boolean }): { plate: boolean; name: boolean } {
  if (band === "icons") return { plate: true, name: true };
  const shown = o.markers || o.selected;
  return { plate: shown, name: shown || band === "street" };
}

/** A piece's tap box in CSS pixels: its drawn size, grown to at least 44 points each way (VIEW-125). */
export function tapBox(artWidth: number, artHeight: number, u: number, minPoints: number = L.tapBoxPoints): { w: number; h: number } {
  return { w: Math.max(minPoints, artWidth * u), h: Math.max(minPoints, artHeight * u) };
}

export interface Tappable {
  id: string;
  kind: "piece" | "province";
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a tap opens: the nearest piece whose box holds the point first, then the province (VIEW-125). */
export function tapTarget(point: { x: number; y: number }, targets: readonly Tappable[]): Tappable | null {
  const hit = targets.filter((t) => Math.abs(point.x - t.x) <= t.w / 2 && Math.abs(point.y - t.y) <= t.h / 2);
  const d = (t: Tappable): number => Math.hypot(point.x - t.x, point.y - t.y);
  return hit.filter((t) => t.kind === "piece").sort((a, b) => d(a) - d(b))[0] ?? hit.find((t) => t.kind === "province") ?? null;
}

/** How figures move by the Animations setting: Off draws every figure still, Reduced animates marching and battles only (VIEW-129). */
export function figuresAnimate(animations: "Full" | "Reduced" | "Off", state: FormationState | "life"): boolean {
  if (animations === "Off") return false;
  if (animations === "Reduced") return state === "marching" || state === "fighting";
  return true;
}

/** At most maxAnimated figures move each frame, the nearest the screen's centre first; the rest stand still (VIEW-130). */
export function animatedFigures<T extends { distance: number }>(pieces: readonly T[], figuresOf: (p: T) => number, cap: number = L.figures.maxAnimated): Set<T> {
  const out = new Set<T>();
  let left = cap;
  for (const p of [...pieces].sort((a, b) => a.distance - b.distance)) {
    const n = figuresOf(p);
    if (n > left) continue;
    left -= n;
    out.add(p);
  }
  return out;
}

export const LIVING_MAP = L;
