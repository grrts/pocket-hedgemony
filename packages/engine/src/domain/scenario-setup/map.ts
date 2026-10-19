/**
 * The 1444 map setup in today's build (spec §5.5; tools/mapgen owners.ts):
 * owner rules, the nation list, colours, population, wealth and the stand-in
 * castle rule, as pure functions. Numbers from scenario-setup.json and the
 * generated scenario-setup-map.json.
 */
import mapData from "../../../../rules/data/domain/scenario-setup-map.json" with { type: "json" };
import config from "../../../../rules/data/domain/scenario-setup.json" with { type: "json" };

const M = config.map;

export interface NationSource {
  id: string;
  name: string;
  /** [longitude, latitude] of the capital city. */
  capital: [number, number];
  color?: string;
  commanders?: { name: string; might: number; cunning: number; logistics: number }[];
}

/** A map nation's source row (SETUP-040). */
export function nationSource(id: string): NationSource {
  const n = (mapData.nations as unknown as NationSource[]).find((x) => x.id === id);
  if (!n) throw new Error(`no map nation ${id}`);
  return n;
}

export const PALETTE = mapData.palette as string[];

/** First matching rule wins; every listed condition must hold. A null nation leaves the land unowned. */
export interface OwnerRule {
  nation: string | null;
  countries?: string[];
  admin1?: string[];
  regions?: string[];
  bbox?: [number, number, number, number];
}

export interface PlaceOnEarth {
  country: string;
  admin1: string;
  region: string;
  lon: number;
  lat: number;
}

const inBox = (lon: number, lat: number, b: readonly number[]) => lon >= b[0]! && lat >= b[1]! && lon <= b[2]! && lat <= b[3]!;

/** The owner of a province by the first matching owner rule (SETUP-041). */
export function matchOwner(rules: readonly OwnerRule[], p: PlaceOnEarth): string | null {
  const rule = rules.find(
    (r) =>
      (!r.countries || r.countries.includes(p.country)) &&
      (!r.admin1 || r.admin1.includes(p.admin1)) &&
      (!r.regions || r.regions.includes(p.region)) &&
      (!r.bbox || inBox(p.lon, p.lat, r.bbox)),
  );
  return rule ? rule.nation : null;
}

/** Nations that end up with at least one province; the rest are left out (SETUP-042). */
export function builtNations<T extends { id: string }>(nations: readonly T[], owners: Iterable<string | null>): T[] {
  const owned = new Set<string>();
  for (const o of owners) if (o) owned.add(o);
  return nations.filter((n) => owned.has(n.id));
}

/**
 * Nation colours (SETUP-043): a fixed colour where the nation names one, else,
 * largest first, a palette colour no neighbouring nation has; `pick` chooses
 * among the free ones (mapgen hashes the id).
 */
export function chooseColours(
  nations: readonly { id: string; color?: string; provinces: number }[],
  neighbours: ReadonlyMap<string, ReadonlySet<string>>,
  pick: (id: string, free: readonly string[]) => string | undefined = (_id, free) => free[0],
  palette: readonly string[] = PALETTE,
): Map<string, string> {
  const color = new Map<string, string>();
  for (const n of nations) if (n.color) color.set(n.id, n.color);
  for (const n of [...nations].sort((a, b) => b.provinces - a.provinces)) {
    if (color.has(n.id)) continue;
    const taken = new Set([...(neighbours.get(n.id) ?? [])].map((m) => color.get(m)));
    const free = palette.filter((c) => !taken.has(c));
    color.set(n.id, pick(n.id, free) ?? palette[0]!);
  }
  return color;
}

/** The settlement region of a place: the first box that holds it, else the defaults. */
export function settlementRegion(lon: number, lat: number): { name: string; density: number; wealth: number } {
  const z = (mapData.settlement as { name: string; bbox: number[]; density: number; wealth: number }[]).find((r) => inBox(lon, lat, r.bbox));
  return z ?? { name: "default", density: mapData.defaultDensity, wealth: mapData.defaultWealth };
}

export interface PopulationInput {
  km2: number;
  /** Density of the settlement region, people per km². */
  density: number;
  ground: string;
  owned: boolean;
  capital: boolean;
  /** 0.7 to 1.3; 1 gives the value before the spread. */
  spread?: number;
}

/** People per km² a province starts with (SETUP-044): unowned land at most twice the default. */
export function startDensity(i: Omit<PopulationInput, "km2" | "spread">): number {
  let d = i.owned ? i.density : Math.min(i.density, mapData.defaultDensity * M.unownedDensityCapFactor);
  if (M.lowDensityGrounds.includes(i.ground)) d *= M.lowDensityFactor;
  if (M.highDensityGrounds.includes(i.ground)) d *= M.highDensityFactor;
  if (i.owned && i.capital) d *= M.capitalDensityFactor;
  return d;
}

/** 1444 population in thousands of people (SETUP-044). */
export function startPopulation(i: PopulationInput): number {
  const spread = i.spread ?? 1;
  const [lo, hi] = M.populationSpread as [number, number];
  if (spread < lo || spread > hi) throw new Error(`spread ${spread} outside ${lo}-${hi}`);
  return Math.max(1, Math.round((i.km2 * startDensity(i) * spread) / 1000));
}

export interface WealthInput {
  /** Wealth of the settlement region. */
  base: number;
  owned: boolean;
  coastal: boolean;
  capital: boolean;
  /** 0.75 to 1.25; 1 gives the value before the spread. */
  spread?: number;
}

/** 1444 wealth (SETUP-045): region wealth (1 unowned), +1 owned coast, +2 capital, spread, kept in 1–10. */
export function startWealth(i: WealthInput): number {
  let w = i.owned ? i.base : mapData.defaultWealth;
  if (i.owned && i.coastal) w += M.coastalWealth;
  if (i.owned && i.capital) w += M.capitalWealth;
  const [lo, hi] = M.wealthRange as [number, number];
  return Math.min(hi, Math.max(lo, Math.round(w * (i.spread ?? 1))));
}

export interface CastleInput {
  owned: boolean;
  capital: boolean;
  /** Thousands of people. */
  population: number;
  /** Borders another nation's province. */
  frontier: boolean;
  ground: string;
  /** A value in [0, 1) per province (mapgen hashes the id) for the old ring forts. */
  roll: number;
  /** The province lies in sub-Saharan Africa (SETUP-067). */
  subSaharan?: boolean;
  /** A geography anchor names a stone castle here (SETUP-067). */
  stoneAnchor?: boolean;
}

/** The stand-in castle rule until real castles are researched (SETUP-046). */
export function startCastle(i: CastleInput): "castle" | "fort" | null {
  const c = M.castle;
  if (!i.owned) return null;
  // Sub-Saharan Africa built earthworks: a capital's ring fort, a few old ones, stone only where an anchor names it (SETUP-067).
  if (i.subSaharan) {
    const a = config.africa.sub_saharan_castles;
    if (i.stoneAnchor) return "castle";
    return i.capital ? (a.capital as "fort") : i.roll < a.old_fort_share ? "fort" : null;
  }
  if (i.capital || i.population >= c.capitalOrPopulation) return "castle";
  if (i.frontier) return (c.highGrounds.includes(i.ground) && i.population >= c.frontierHighPopulation) || i.population >= c.frontierPopulation ? "castle" : "fort";
  return i.roll < c.oldFortShare ? "fort" : null;
}

// ---------------------------------------------------------------------------
// Ports in 1444 (SETUP-036; naval 1.3)

export interface StartPort {
  town: string;
  tier: string;
  province: string | null;
  holder: string | null;
  shipyard: boolean;
}

export function startPort(town: string): StartPort {
  const p = (mapData.ports as [string, string, string | null, string | null, number][]).find((x) => x[0] === town);
  if (!p) throw new Error(`no 1444 port ${town}`);
  return { town: p[0], tier: p[1], province: p[2], holder: p[3], shipyard: p[4] === 1 };
}

export interface StartHarbour {
  harbour: number;
  extraSeafolk: boolean;
  smallCraftOnly: boolean;
}

/** What a port tier starts with; a "port" whose town is too small for market town step 2 gets harbour 1. */
export function startHarbour(tier: string, smallTown = false): StartHarbour {
  const t = (config.ports as unknown as Record<string, { harbour: number; harbour_if_small_town?: number; extra_seafolk?: boolean; small_craft_only?: boolean }>)[tier];
  if (!t) throw new Error(`unknown port tier ${tier}`);
  return {
    harbour: smallTown && t.harbour_if_small_town !== undefined ? t.harbour_if_small_town : t.harbour,
    extraSeafolk: t.extra_seafolk === true,
    smallCraftOnly: t.small_craft_only === true,
  };
}
