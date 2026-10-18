import type { Snapshot, World } from "@ph/engine";

/**
 * What a balance run reads of the game, the same whether it reads the whole
 * world (an AI-only run) or the snapshot the player's screen gets (a bot run).
 */
export interface GameView {
  year: number;
  month: number;
  nationIds: readonly string[];
  provinceOwner: Int16Array;
  /** 1 for land, 0 for sea. */
  land: Uint8Array;
  treasury: ArrayLike<number>;
  income: ArrayLike<number>;
  levies: ArrayLike<number>;
  /** Men under arms by nation (armies and garrison troops). */
  men: Float64Array;
  /** Wars by nation index: attackers first, then defenders. */
  wars: { attackers: number[]; defenders: number[] }[];
}

export function viewOfWorld(w: World): GameView {
  const men = new Float64Array(w.nationCount);
  const a = w.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i]! >= 0) men[a.owner[i]!]! += a.men[i]!;
  const idx = (ids: string[]) => ids.map((x) => w.nationIndex.get(x)!).filter((n) => n !== undefined);
  return {
    year: w.date.year,
    month: w.date.month,
    nationIds: w.nationIds,
    provinceOwner: w.provinceOwner,
    land: Uint8Array.from(w.provinceWater, (x) => 1 - x),
    treasury: w.nationTreasury,
    income: w.nationMonthlyIncome,
    levies: w.nationLevies,
    men,
    wars: w.diplomacy.wars.map((x) => ({ attackers: idx(x.attackers), defenders: idx(x.defenders) })),
  };
}

export function viewOfSnapshot(s: Snapshot, nationIds: readonly string[], land: Uint8Array): GameView {
  const men = new Float64Array(nationIds.length);
  const a = s.armies;
  for (let i = 0; i < a.id.length; i++) if (a.owner[i]! >= 0) men[a.owner[i]!]! += a.men[i]!;
  return {
    year: s.date.year,
    month: s.date.month,
    nationIds,
    provinceOwner: s.provinceOwner,
    land,
    treasury: s.nationTreasury,
    income: s.nationMonthlyIncome,
    levies: s.nationLevies,
    men,
    wars: s.wars.map((x) => ({ attackers: x.attackers, defenders: x.defenders })),
  };
}

/** One realm at one moment. */
export interface RealmSample {
  provinces: number;
  treasury: number;
  income: number;
  levies: number;
  men: number;
  atWar: boolean;
}

/** The world at one moment: the numbers the reports chart and the checks read. */
export interface WorldSample {
  year: number;
  month: number;
  landProvinces: number;
  realmsAlive: number;
  wars: number;
  realmsAtWar: number;
  /** The realm holding the most land, and its share of all land provinces (0 to 1). */
  largest: { realm: string; share: number };
  medianTreasury: number;
  medianIncome: number;
  /** Men under arms of all realms, and their levies (men they could call). */
  menUnderArms: number;
  levies: number;
  realms: Record<string, RealmSample>;
}

export function sample(v: GameView): WorldSample {
  const N = v.nationIds.length;
  const provinces = new Int32Array(N);
  let landProvinces = 0;
  for (let p = 0; p < v.provinceOwner.length; p++) {
    if (!v.land[p]) continue;
    landProvinces++;
    const o = v.provinceOwner[p]!;
    if (o >= 0) provinces[o]!++;
  }
  const atWar = new Uint8Array(N);
  for (const war of v.wars) for (const n of [...war.attackers, ...war.defenders]) atWar[n] = 1;
  const realms: Record<string, RealmSample> = {};
  const alive: number[] = [];
  let largest = { realm: "", share: 0 };
  let menUnderArms = 0;
  let levies = 0;
  for (let n = 0; n < N; n++) {
    if (!provinces[n]) continue;
    alive.push(n);
    const id = v.nationIds[n]!;
    realms[id] = { provinces: provinces[n]!, treasury: round(v.treasury[n]!), income: round(v.income[n]!), levies: round(v.levies[n]!), men: v.men[n]!, atWar: !!atWar[n] };
    if (provinces[n]! / landProvinces > largest.share) largest = { realm: id, share: provinces[n]! / landProvinces };
    menUnderArms += v.men[n]!;
    levies += v.levies[n]!;
  }
  return {
    year: v.year,
    month: v.month,
    landProvinces,
    realmsAlive: alive.length,
    wars: v.wars.length,
    realmsAtWar: alive.filter((n) => atWar[n]).length,
    largest,
    medianTreasury: round(median(alive.map((n) => v.treasury[n]!))),
    medianIncome: round(median(alive.map((n) => v.income[n]!))),
    menUnderArms,
    levies: round(levies),
    realms,
  };
}

/** A number that should be a number and isn't, or a count that went below zero, found by checkFinite. */
export interface BadValue {
  path: string;
  index: number;
  value: number;
}

/**
 * Looks through a world or a snapshot for numbers gone wrong: NaN or infinity
 * in any of its number arrays, and negative people. Reports the first few of
 * each array, so a broken sum does not flood the report.
 */
export function checkFinite(root: object, skip: ReadonlySet<string> = new Set(["rules", "tiles"])): BadValue[] {
  const out: BadValue[] = [];
  const seen = new Set<object>();
  const walk = (value: unknown, path: string, depth: number) => {
    if (value === null || typeof value !== "object" || seen.has(value) || depth > 4) return;
    seen.add(value);
    if (ArrayBuffer.isView(value)) {
      if (!(value instanceof Float32Array || value instanceof Float64Array)) return;
      const people = /population|people/i.test(path);
      let found = 0;
      for (let i = 0; i < value.length && found < 3; i++) {
        const x = value[i]!;
        if (!Number.isFinite(x) || (people && x < 0)) {
          out.push({ path, index: i, value: x });
          found++;
        }
      }
      return;
    }
    if (value instanceof Map || value instanceof Set) return;
    if (Array.isArray(value)) {
      // Long arrays of records (provinces, lords) are checked through their first entries only.
      for (let i = 0; i < Math.min(value.length, 64); i++) walk(value[i], `${path}[${i}]`, depth + 1);
      return;
    }
    for (const [k, v] of Object.entries(value)) {
      if (skip.has(k)) continue;
      if (typeof v === "number" && !Number.isFinite(v)) out.push({ path: path ? `${path}.${k}` : k, index: -1, value: v });
      else walk(v, path ? `${path}.${k}` : k, depth + 1);
    }
  };
  walk(root, "", 0);
  return out;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1]!;
}

const round = (x: number) => Math.round(x * 100) / 100;
