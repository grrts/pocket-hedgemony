import type { Ruleset } from "@ph/rules";
import { FAITH_FAMILY, LandGridScan, SLOTS, WORKS, type LandGrid, type Snapshot } from "@ph/engine";
import {
  hamletCount, hamletSpots, LIVING_MAP, roadLines, settlementByte, townCellKinds, townCells, townFootprint, townGrowthOrder, townPeopleThousands, townPlan,
  worksSpot, roadLinks, roadPath, berthSpots, type CellKind, type RoadLine, type TownPlan,
} from "@ph/engine/domain/map-presentation";
import type { MapImage } from "./loadMap.ts";

/**
 * The living map's towns, hamlets and roads (VIEW-105..VIEW-115), as the
 * settlement byte of every map pixel the renderer keeps in the alpha of the
 * province id texture. Worked out only for the provinces near the camera, the
 * first time the living band comes close, and again for a province when its
 * town's cell count or works change in a new game month (VIEW-108). Roads only
 * depend on the map, so each is laid once. All of it is done in small steps
 * up to a deadline (the map scan a few rows at a time, then town by town and
 * road by road), so the client can run it in idle time between frames,
 * starting before the living band.
 */

const WORK = Object.fromEntries(WORKS.map((w, i) => [w, i])) as Record<string, number>;
const WORSHIP = LIVING_MAP.worshipVariant as Record<string, number>;

interface ProvinceTown {
  /** What it was worked out from; a change of key redoes it. */
  key: string;
  tiles: Map<number, CellKind>;
  hamlets: number[];
  /** Where its hulls lie in port, worked out when first asked for (VIEW-122). */
  berths?: number[];
}

/** Per province: walls (0 none, 1 palisade, 2 stone), road grade, worship variant, and the town style (VIEW-110, VIEW-113, VIEW-131). */
export interface TownInfo {
  walls: number;
  roadGrade: number;
  worship: number;
  style: number;
}

const isCapital = (rules: Ruleset, s: Snapshot, p: number): boolean => {
  const owner = s.provinceOwner[p]!;
  return owner >= 0 && rules.nations[owner]?.capital === rules.provinces[p]!.id;
};

/** What the shader needs of a province's town: walls (a capital always has stone), road grade, worship by majority faith, style. */
export function townInfo(rules: Ruleset, s: Snapshot, p: number): TownInfo {
  const step = (w: string) => (WORK[w] === undefined ? 0 : s.provinceWorks[p * s.works.length + WORK[w]!]!);
  const faith = s.peoples.provinceFaith[p * SLOTS];
  const family = faith === undefined || faith < 0 ? "none" : (FAITH_FAMILY[faith] ?? "none");
  return { walls: isCapital(rules, s, p) ? 2 : Math.min(2, step("castle")), roadGrade: Math.min(2, Math.max(0, step("road") - 1)), worship: WORSHIP[family] ?? 0, style: 0 };
}

export class TownLayer {
  private readonly scan: LandGridScan;
  private gridReady: LandGrid | null = null;
  /** The settlement byte of every map pixel (kind in bits 0-3, road links N/E/S/W in bits 4-7). */
  readonly bytes: Uint8Array;
  private readonly kinds: Uint8Array;
  private readonly links: Uint8Array;
  private readonly orders = new Map<number, number[]>();
  private readonly towns = new Map<number, ProvinceTown>();
  private readonly roadsDone = new Set<number>();
  /** Neighbour pairs whose road is laid, as lower × provinces + higher. */
  private readonly pairs = new Set<number>();
  private month = "";
  private recheck: number[] = [];
  private dirty: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private readonly rules: Ruleset;
  private readonly provinceIndex: Map<string, number>;

  constructor(rules: Ruleset, map: MapImage) {
    this.rules = rules;
    this.provinceIndex = new Map(rules.provinces.map((p, i) => [p.id, i]));
    const ids = map.ids;
    this.scan = new LandGridScan(rules, map.width, map.height, (t) => ids[t]! + 1, map.terrain);
    this.bytes = new Uint8Array(map.width * map.height);
    this.kinds = new Uint8Array(map.width * map.height);
    this.links = new Uint8Array(map.width * map.height);
  }

  get grid(): LandGrid {
    return this.gridReady!;
  }

  /** A port town's berths, as map pixels, the docks' first; empty until its town is laid (VIEW-122). */
  berths(p: number): number[] {
    const town = this.towns.get(p);
    if (!town) return [];
    if (!town.berths) {
      const cells = [...town.tiles].filter(([, k]) => k !== "works");
      const docks = cells.filter(([, k]) => k === "docks").map(([t]) => t);
      town.berths = berthSpots(this.grid, [...docks, ...cells.map(([t]) => t).filter((t) => !docks.includes(t))]);
    }
    return town.berths;
  }

  /** The box of map pixels whose byte changed since the last call, or null. */
  takeDirty(): { x0: number; y0: number; x1: number; y1: number } | null {
    const d = this.dirty;
    this.dirty = null;
    return d;
  }

  /**
   * Works towards every land province whose box meets one of the given map
   * rectangles having its town, hamlets and roads, until the deadline (a
   * performance.now() time); in a new month, provinces already done are
   * checked again and redone where their town changed. True while work is left.
   */
  update(s: Snapshot, rects: readonly { x0: number; y0: number; x1: number; y1: number }[], deadline: number): boolean {
    if (!this.gridReady) {
      while (!this.scan.scan(8)) if (performance.now() >= deadline) return true;
      this.gridReady = this.scan.grid();
    }
    const month = `${s.date.year}-${s.date.month}`;
    if (month !== this.month) {
      this.month = month;
      this.recheck = [...this.towns.keys()];
    }
    // A town already laid changes only in a new month (VIEW-108); one coming into view is laid as soon as there is time.
    while (this.recheck.length) {
      if (performance.now() >= deadline) return true;
      this.settle(s, this.recheck.pop()!);
    }
    for (const r of rects) {
      for (const p of this.provincesIn(r)) {
        if (this.roadsDone.has(p)) continue;
        if (!this.towns.has(p)) {
          if (performance.now() >= deadline) return true;
          this.settle(s, p);
        }
        if (!this.lay(p, deadline)) return true;
      }
    }
    return false;
  }

  private provincesIn(r: { x0: number; y0: number; x1: number; y1: number }): number[] {
    const out: number[] = [];
    const b = this.grid.bounds;
    const P = this.rules.provinces.length;
    for (let p = 0; p < P; p++) {
      if (this.grid.centre[p]! < 0) continue;
      const x0 = b[p * 4]!, y0 = b[p * 4 + 1]!, x1 = b[p * 4 + 2]!, y1 = b[p * 4 + 3]!;
      if (x1 < x0 || y1 < y0) continue;
      if (x1 >= r.x0 && x0 <= r.x1 && y1 >= r.y0 && y0 <= r.y1) out.push(p);
    }
    return out;
  }

  /** A province's town and hamlets, from its people and works this month. */
  private settle(s: Snapshot, p: number): void {
    const n = s.classNames.length;
    const classes: Record<string, number> = {};
    let total = 0;
    s.classNames.forEach((c, k) => {
      const v = s.provinceClasses[p * n + k]!;
      classes[c] = v;
      total += v;
    });
    const town = townPeopleThousands(classes);
    const cells = townCells(town);
    const hamlets = hamletCount(total - town);
    const step = (w: string) => (WORK[w] === undefined ? 0 : s.provinceWorks[p * s.works.length + WORK[w]!]!);
    const state = {
      capital: isCapital(this.rules, s, p),
      castleStep: step("castle"),
      market: step("market") > 0,
      drillYard: step("drill yard") > 0,
      harbour: step("harbour") > 0,
      coastal: !!this.rules.provinces[p]!.coastal,
    };
    const works = (["mine", "quarry", "lumber camp"] as const).filter((w) => step(w) > 0);
    const key = `${cells}|${hamlets}|${Object.values(state).map(Number).join("")}|${works.join(",")}`;
    const old = this.towns.get(p);
    if (old?.key === key) return;
    let order = this.orders.get(p);
    if (!order) this.orders.set(p, (order = townGrowthOrder(this.grid, p)));
    const plan: TownPlan = townPlan(this.grid, townFootprint(this.grid, p, cells, order), state);
    const tiles = townCellKinds(plan);
    const spots = hamletSpots(this.grid, p, hamlets, plan.footprint.tiles);
    const taken = new Set<number>([...tiles.keys(), ...spots]);
    for (const w of works) {
      const t = worksSpot(this.grid, p, w, taken);
      if (t !== null) (taken.add(t), tiles.set(t, "works"));
    }
    if (old) {
      for (const t of old.tiles.keys()) this.setKind(t, 0);
      for (const t of old.hamlets) this.setKind(t, 0);
    }
    for (const t of spots) this.setKind(t, 1);
    for (const [t, k] of tiles) this.setKind(t, settlementByte(k) & 15);
    this.towns.set(p, { key, tiles, hamlets: spots });
  }

  /**
   * The roads from a province's town to its neighbours' towns and from its
   * hamlets (VIEW-113), one road at a time until the deadline; each pair of
   * neighbours is laid once. True once all of the province's roads are laid.
   */
  private lay(p: number, deadline: number): boolean {
    const near = this.rules.provinces[p]!.neighbors.map((id) => this.provinceIndex.get(id)).filter((q): q is number => q !== undefined && this.grid.centre[q]! >= 0);
    const P = this.rules.provinces.length;
    const from = this.grid.centre[p]!;
    for (const q of near) {
      const pair = Math.min(p, q) * P + Math.max(p, q);
      if (this.pairs.has(pair)) continue;
      if (performance.now() >= deadline) return false;
      this.pairs.add(pair);
      const path = roadPath(this.grid, from, this.grid.centre[q]!);
      if (path) this.link([{ from, to: this.grid.centre[q]!, grade: "track", path, bridges: [] }]);
    }
    if (performance.now() >= deadline) return false;
    this.roadsDone.add(p);
    const hamlets = this.towns.get(p)?.hamlets ?? [];
    if (hamlets.length) this.link(roadLines(this.grid, [{ province: p, seed: from, roadStep: 0 }], () => [], hamlets));
    return true;
  }

  private link(roads: RoadLine[]): void {
    for (const [t, l] of roadLinks(this.grid, roads)) this.setLinks(t, this.links[t]! | l);
  }

  private setKind(t: number, kind: number): void {
    this.kinds[t] = kind;
    this.write(t);
  }

  private setLinks(t: number, links: number): void {
    this.links[t] = links;
    this.write(t);
  }

  private write(t: number): void {
    const b = (this.kinds[t]! & 15) | ((this.links[t]! & 15) << 4);
    if (this.bytes[t] === b) return;
    this.bytes[t] = b;
    const x = t % this.grid.width, y = (t - x) / this.grid.width;
    const d = (this.dirty ??= { x0: x, y0: y, x1: x, y1: y });
    d.x0 = Math.min(d.x0, x);
    d.y0 = Math.min(d.y0, y);
    d.x1 = Math.max(d.x1, x);
    d.y1 = Math.max(d.y1, y);
  }
}
