import { startGoals, type GoalAim, type GoalDef } from "@ph/rules";
import config from "../../rules/data/domain/events.json" with { type: "json" };
import * as dip from "./domain/diplomacy/index.ts";
import { pixelOf } from "./domain/world-map/index.ts";
import { Rng } from "./rng.ts";
import type { World } from "./world.ts";

/**
 * Realms' historical goals (EVT-085 to EVT-093, plan-1378 §2). History is a
 * reference, not a script: each realm pursues the goals it really had, for the
 * reasons it had them, and a goal ends when its reason does. The seed shakes
 * every realm's goals at the start; the AI weighs what is left like any other
 * wish (war.ts, statecraft.ts), never above what it can afford.
 */

const G = config.goals;
const rel = dip.relations;

export type GoalEnd = "achieved" | "lost" | "gone" | "lapsed" | "realm gone";

export interface Goal {
  /** Index in the scenario's goals. */
  def: number;
  realm: number;
  /** The aim in force: the goal's own, or its alternative once it deviated. */
  aim: GoalAim | null;
  /** The provinces the aim's places are bound to. */
  places: number[];
  target: number;
  /** Weight word × the seed's shake × the preset (EVT-086). */
  weight: number;
  shaken: "kept" | "swapped" | "dropped";
  end: { why: GoalEnd; year: number } | null;
}

export interface GoalState {
  defs: readonly GoalDef[];
  list: Goal[];
  /** Each realm's pull toward other realms this month (EVT-089), AI realms only. */
  pulls: Map<number, number>[];
}

type Mode = keyof typeof G.preset_mult;

/** The province whose centre lies nearest a point, of the land ones (as heritage binds its places, D-HER-16). */
export function nearestLand(world: World, at: readonly [number, number]): number {
  const { x, y } = pixelOf(at[0], at[1]);
  let best = -1;
  let dist = Infinity;
  world.rules.provinces.forEach((p, i) => {
    if (world.provinceWater[i] || p.x === undefined || p.y === undefined) return;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < dist) [dist, best] = [d, i];
  });
  return best;
}

function bind(world: World, aim: GoalAim | null | undefined): { places: number[]; target: number } {
  if (!aim) return { places: [], target: -1 };
  if (aim.kind === "take" || aim.kind === "hold") return { places: [...new Set(aim.places.map((p) => nearestLand(world, p.at)).filter((p) => p >= 0))], target: -1 };
  return { places: [], target: world.nationIndex.get(aim.target ?? "") ?? -1 };
}

/** The scenario's goals, shaken by the campaign's seed (EVT-086). */
export function createGoals(world: World, defs: readonly GoalDef[] = startGoals, mode: Mode = modeOf(world)): GoalState {
  const rng = new Rng(world.weatherSeed ^ 0x60a15);
  const share = G.deviate_share[mode];
  const list = defs.flatMap((d, def): Goal[] => {
    const realm = world.nationIndex.get(d.realm);
    if (realm === undefined) return [];
    const shake = G.shake_low + rng.next() * (G.shake_high - G.shake_low);
    const deviates = rng.next() < share;
    const shaken = !deviates ? "kept" : d.alternative ? "swapped" : "dropped";
    const aim = shaken === "swapped" ? d.alternative! : d.aim;
    return [{ def, realm, aim, ...bind(world, aim), weight: G.weights[d.weight] * shake * G.preset_mult[mode], shaken, end: null }];
  });
  return { defs, list, pulls: [] };
}

function modeOf(world: World): Mode {
  const m = world.events?.state.rules.mode;
  return m && m in G.preset_mult ? (m as Mode) : "plausible";
}

const yearNow = (world: World) => world.date.year + (world.date.month - 1) / 12;

/** A goal's time factor (EVT-087): 1 inside its window, rising before it and fading after it. */
export function timeFactor(def: GoalDef, year: number): number {
  const [from, to] = def.window;
  if (year < from) return Math.max(0, 1 - (from - year) / G.lead_years);
  if (to === null || year <= to + 1) return 1;
  return Math.max(0, 1 - (year - to - 1) / G.lapse_years);
}

const exists = (world: World, n: number) => n >= 0 && !world.nationGone[n] && !world.nationAsleep[n];

/** Why a live goal ends now, if it does (EVT-088). */
function endOf(world: World, g: Goal, year: number): GoalEnd | null {
  // A sleeper counts as gone to every system, but its goals wait for it to wake.
  if (world.nationAsleep[g.realm]) return null;
  if (world.nationGone[g.realm]) return "realm gone";
  const def = world.goals!.defs[g.def]!;
  const a = g.aim;
  if (a) {
    const owner = world.provinceOwner;
    if (a.kind === "take" && g.places.length && g.places.every((p) => owner[p] === g.realm)) return "achieved";
    if (a.kind === "hold" && g.places.some((p) => owner[p] !== g.realm)) return "lost";
    if (a.kind !== "take" && a.kind !== "hold") {
      if (g.target < 0 || !exists(world, g.target)) return g.target >= 0 && world.nationAsleep[g.target] ? null : "gone";
      const d = world.diplomacy;
      const [x, y] = [world.nationIds[g.realm]!, world.nationIds[g.target]!];
      if (a.kind === "subject" && rel.overlord(d.graph, y) === x) return "achieved";
      if (a.kind === "ally" && rel.has(d.graph, "alliance", x, y)) return "achieved";
      if (a.kind === "free" && rel.overlord(d.graph, x) !== y) return "achieved";
      if (a.kind === "fight" && d.taken.some((t) => t.by === x && t.from === y)) return "achieved";
    }
  }
  if (def.window[1] !== null && timeFactor(def, year) <= 0 && year > def.window[1]) return "lapsed";
  return null;
}

/** A goal not ended and not dropped by the seed's shake. */
export const isLive = (g: Goal): boolean => !g.end && g.shaken !== "dropped";

/** A live goal's pull now (EVT-087). */
export function pullOf(world: World, g: Goal): number {
  if (!isLive(g) || !exists(world, g.realm)) return 0;
  return g.weight * timeFactor(world.goals!.defs[g.def]!, yearNow(world));
}

/** Each month: goals whose reason ended end, and every AI realm's pull toward others is counted again (EVT-088, EVT-089). */
export function monthlyGoals(world: World, endGoals = true): void {
  const s = world.goals;
  if (!s) return;
  const year = yearNow(world);
  s.pulls = [];
  for (const g of s.list) {
    if (!isLive(g)) continue;
    const why = endGoals ? endOf(world, g, year) : null;
    if (why) {
      g.end = { why, year: world.date.year };
      continue;
    }
    // The player's realm is never steered (EVT-092).
    if (g.realm === world.player || !g.aim) continue;
    const pull = pullOf(world, g);
    if (pull <= 0) continue;
    const at = (t: number) => {
      if (t < 0 || t === g.realm) return;
      const m = (s.pulls[g.realm] ??= new Map());
      m.set(t, (m.get(t) ?? 0) + pull);
    };
    if (g.aim.kind === "take") new Set(g.places.map((p) => world.provinceOwner[p]!)).forEach(at);
    else if (g.aim.kind === "subject" || g.aim.kind === "fight") at(g.target);
  }
}

/** Realm n's pull toward each other realm this month (EVT-089). */
export function goalPulls(world: World, n: number): ReadonlyMap<number, number> | undefined {
  return world.goals?.pulls[n];
}

/** Provinces t holds that n's live take goals name, strongest goal first (EVT-090). */
export function goalPlacesHeldBy(world: World, n: number, t: number): number[] {
  const s = world.goals;
  if (!s || n === world.player) return [];
  return s.list
    .filter((g) => g.realm === n && isLive(g) && g.aim?.kind === "take")
    .sort((a, b) => pullOf(world, b) - pullOf(world, a))
    .flatMap((g) => g.places.filter((p) => world.provinceOwner[p] === t));
}

/** The envoys n's live ally and subject goals call for, with each goal's pull (EVT-091). */
export function goalAsks(world: World, n: number): { target: number; actions: string[]; pull: number }[] {
  const s = world.goals;
  if (!s || n === world.player) return [];
  return s.list.flatMap((g) => {
    if (g.realm !== n || !isLive(g) || (g.aim?.kind !== "ally" && g.aim?.kind !== "subject") || !exists(world, g.target)) return [];
    const pull = pullOf(world, g);
    return pull > 0 ? [{ target: g.target, actions: g.aim.kind === "ally" ? ["propose_alliance", "arrange_marriage"] : ["offer_overlordship"], pull }] : [];
  });
}

/** What a save keeps of each goal (EVT-093). */
export function saveGoals(world: World): { def: number; weight: number; shaken: Goal["shaken"]; end: Goal["end"] }[] | undefined {
  return world.goals?.list.map((g) => ({ def: g.def, weight: g.weight, shaken: g.shaken, end: g.end }));
}

export function restoreGoals(world: World, saved: ReturnType<typeof saveGoals>): void {
  if (!saved || !world.goals) return;
  const defs = world.goals.defs;
  world.goals.list = saved.flatMap((x): Goal[] => {
    const d = defs[x.def];
    const realm = d && world.nationIndex.get(d.realm);
    if (!d || realm === undefined) return [];
    const aim = x.shaken === "swapped" ? (d.alternative ?? d.aim) : d.aim;
    return [{ def: x.def, realm, aim, ...bind(world, aim), weight: x.weight, shaken: x.shaken, end: x.end }];
  });
  monthlyGoals(world, false);
}
