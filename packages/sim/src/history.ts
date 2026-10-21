import { readdirSync, readFileSync } from "node:fs";
import { advance, nearestLand, STEPS_PER_TURN, TURNING_POINTS, treeEventOf, type World } from "@ph/engine";
import { dayKey } from "./campaign.ts";
import { newWorld, type MapKind } from "./world.ts";

/**
 * The history check (BAL-031 to BAL-034, plan-1378 §2): AI-only campaigns from
 * the bundled start, compared with the history checkpoints on each checkpoint
 * date they reach. Reference only: nothing here changes how the game plays.
 */

const DIR = new URL("../data/checkpoints/", import.meta.url);

export interface Checkpoint {
  date: string;
  label: string;
  realms: { id: string; rank: string }[];
  great_powers: string[];
  key_places: Record<string, { holder: string | null; confidence?: string }>;
  since_previous?: { events: { key: string }[] };
  tolerance?: { key_places_match_share: number };
}

export interface KeyPlace {
  id: string;
  name: string;
  at: [number, number];
}

export const KEY_PLACES: readonly KeyPlace[] = JSON.parse(readFileSync(new URL("key-places.json", DIR), "utf8")).places;

/** Every checkpoint, oldest first. */
export const CHECKPOINTS: readonly Checkpoint[] = readdirSync(DIR)
  .filter((f) => /^\d{4}\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8")));

/** Each realm id of the checkpoints and the ids merged into it (ids.json). */
const ALIASES: ReadonlyMap<string, readonly string[]> = new Map(
  (JSON.parse(readFileSync(new URL("ids.json", DIR), "utf8")).realms as { id: string; aliases: string[] }[]).map((r) => [r.id, [r.id, ...r.aliases]]),
);

/** Whether a realm of the game stands for the checkpoint's realm: the same id or one merged into it. */
export const sameRealm = (checkpoint: string, game: string): boolean => (ALIASES.get(checkpoint) ?? [checkpoint]).includes(game);

export interface PlaceDiff {
  place: string;
  expected: string;
  held: string | null;
}

export interface CheckpointResult {
  date: string;
  label: string;
  keyPlaces: { matched: number; counted: number; share: number };
  realms: { exist: number; listed: number };
  greatPowers: { among: number; of: number };
  turningPoints: { happened: number; held: number };
  tolerance: number | null;
  within: boolean;
  differ: PlaceDiff[];
}

const isoOf = (w: World) => `${w.date.year}-${String(w.date.month).padStart(2, "0")}-${String(w.date.day ?? 1).padStart(2, "0")}`;

/** The world against one checkpoint (BAL-032, BAL-033). */
export function compare(world: World, cp: Checkpoint, places: ReadonlyMap<string, number> = bindPlaces(world)): CheckpointResult {
  const alive = (n: number) => !world.nationGone[n] && !world.nationAsleep[n];
  const differ: PlaceDiff[] = [];
  let matched = 0;
  let counted = 0;
  for (const [id, want] of Object.entries(cp.key_places)) {
    const p = places.get(id);
    // A place nobody held as a state is left out.
    if (!want.holder || p === undefined) continue;
    counted++;
    const n = world.provinceOwner[p]!;
    const held = n >= 0 ? world.nationIds[n]! : null;
    if (held && sameRealm(want.holder, held)) matched++;
    else differ.push({ place: id, expected: want.holder, held });
  }
  const exists = (id: string) => [...(ALIASES.get(id) ?? [id])].some((x) => {
    const n = world.nationIndex.get(x);
    return n !== undefined && alive(n);
  });
  const size = new Map<number, number>();
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0 && !world.provinceWater[p]) size.set(world.provinceOwner[p]!, (size.get(world.provinceOwner[p]!) ?? 0) + 1);
  const largest = [...size].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => world.nationIds[n]!);
  const keys = new Set((cp.since_previous?.events ?? []).map((e) => e.key));
  const fired = new Set(world.events?.state.world.history.map((o) => o.event) ?? []);
  const held = TURNING_POINTS.filter((t) => keys.has(t.key)).map((t) => treeEventOf(world, t)).filter((x): x is string => !!x);
  const share = counted ? matched / counted : 0;
  const tolerance = cp.tolerance?.key_places_match_share ?? null;
  return {
    date: cp.date,
    label: cp.label,
    keyPlaces: { matched, counted, share },
    realms: { exist: cp.realms.filter((r) => exists(r.id)).length, listed: cp.realms.length },
    greatPowers: { among: cp.great_powers.filter((g) => largest.some((x) => sameRealm(g, x))).length, of: cp.great_powers.length },
    turningPoints: { happened: held.filter((e) => fired.has(e)).length, held: held.length },
    tolerance,
    within: tolerance === null ? share === 1 : share >= tolerance,
    differ,
  };
}

/** Each key place's province on this map (BAL-032). */
export function bindPlaces(world: World): Map<string, number> {
  return new Map(KEY_PLACES.map((k) => [k.id, nearestLand(world, k.at)]));
}

export interface HistoryOptions {
  seed: number;
  years: number;
  map: MapKind;
}

export interface HistoryResult {
  kind: "history";
  seed: number;
  startYear: number;
  endYear: number;
  seconds: number;
  checkpoints: CheckpointResult[];
  error?: string;
}

/** One AI-only campaign from the start, compared with every checkpoint it reaches (BAL-031). */
export function runHistory(o: HistoryOptions): HistoryResult {
  const t0 = performance.now();
  const world = newWorld(o.map, o.seed);
  const startYear = world.date.year;
  const end = dayKey({ ...world.date, year: startYear + o.years });
  const places = bindPlaces(world);
  const ahead = CHECKPOINTS.filter((c) => c.date > isoOf(world));
  const results: CheckpointResult[] = [];
  let error: string | undefined;
  try {
    while (dayKey(world.date) < end && ahead.length) {
      advance(world, STEPS_PER_TURN - world.step);
      while (ahead.length && isoOf(world) >= ahead[0]!.date) results.push(compare(world, ahead.shift()!, places));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return { kind: "history", seed: o.seed, startYear, endYear: world.date.year, seconds: (performance.now() - t0) / 1000, checkpoints: results, ...(error ? { error } : {}) };
}

/** history.md: one row per checkpoint, then the places that differ most often (BAL-034). */
export function historyReport(results: readonly HistoryResult[]): string {
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const lines = [`# History check`, "", `${results.length} AI-only campaign(s) from ${results[0]?.startYear ?? "?"}, seeds ${results.map((r) => r.seed).join(", ")}. Reference only: the game never pulls a realm back toward history (BAL-031 to BAL-034).`, ""];
  const dates = [...new Set(results.flatMap((r) => r.checkpoints.map((c) => c.date)))].sort();
  if (!dates.length) lines.push("No run reached a checkpoint: play more years.", "");
  else {
    lines.push("| Checkpoint | Key places (needed) | Realms · great powers | Turning points | Mark |", "|---|---|---|---|---|");
    for (const date of dates) {
      const cs = results.flatMap((r) => r.checkpoints.filter((c) => c.date === date));
      const avg = (f: (c: CheckpointResult) => number) => cs.reduce((t, c) => t + f(c), 0) / cs.length;
      const c0 = cs[0]!;
      const within = cs.filter((c) => c.within).length;
      lines.push(
        `| ${date.slice(0, 4)} ${c0.label} | ${pct(avg((c) => c.keyPlaces.share))} (${c0.tolerance === null ? "all" : pct(c0.tolerance)}) | ${avg((c) => c.realms.exist).toFixed(0)} of ${c0.realms.listed} · ${avg((c) => c.greatPowers.among).toFixed(1)} of ${c0.greatPowers.of} | ${avg((c) => c.turningPoints.happened).toFixed(1)} of ${c0.turningPoints.held} | ${within === cs.length ? "within history" : within ? `${within} of ${cs.length} within` : "apart"} |`,
      );
    }
    lines.push("");
    const often = new Map<string, { n: number; held: Map<string, number>; expected: string }>();
    for (const r of results) for (const c of r.checkpoints) for (const d of c.differ) {
      const k = `${c.date.slice(0, 4)} ${d.place}`;
      const e = often.get(k) ?? { n: 0, held: new Map(), expected: d.expected };
      e.n++;
      e.held.set(d.held ?? "nobody", (e.held.get(d.held ?? "nobody") ?? 0) + 1);
      often.set(k, e);
    }
    const top = [...often].sort((a, b) => b[1].n - a[1].n).slice(0, 20);
    if (top.length) {
      lines.push("## Places that differ most often", "", "| Checkpoint and place | History | Held instead | Runs |", "|---|---|---|---|");
      for (const [k, e] of top) lines.push(`| ${k} | ${e.expected} | ${[...e.held].sort((a, b) => b[1] - a[1]).map(([h, n]) => `${h} ${n}`).join(", ")} | ${e.n} |`);
      lines.push("");
    }
  }
  for (const r of results) if (r.error) lines.push(`Seed ${r.seed} stopped in ${r.endYear}: ${r.error}`);
  return lines.join("\n") + "\n";
}
