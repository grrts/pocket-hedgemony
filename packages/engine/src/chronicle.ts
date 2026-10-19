import { START_DATE } from "@ph/rules";
import data from "../../rules/data/domain/chronicle.json" with { type: "json" };
import config from "../../rules/data/domain/events.json" with { type: "json" };
import { isLive, type Goal } from "./goals.ts";
import type { World } from "./world.ts";

/**
 * The Chronicle (EVT-094 to EVT-096): the history checkpoints' turning points
 * that the event tree holds, whether each has happened, and whether those not
 * yet happened are on course, bent or gone, with the realms whose goals lead
 * there. It reads the game and changes nothing.
 */

const C = config.chronicle;

export interface TurningPoint {
  key: string;
  name: string;
  date: string;
  /** The tree event, when its id is not the key. */
  event?: string;
}

export const TURNING_POINTS: readonly TurningPoint[] = data.turning_points;

export type ChronicleState = "happened" | "on_course" | "bent" | "gone";

export interface ChronicleRow {
  key: string;
  name: string;
  /** The year it happened in history. */
  year: number;
  state: ChronicleState;
  /** When it happened in this campaign, and how that compares with history. */
  happened?: { year: number; timing: "as in history" | "early" | "late" };
  /** Realms whose live goals lead toward it, each with the goal (an index into the scenario's goals). */
  heading: { realm: number; goal: number }[];
}

export interface ChronicleView {
  counts: { on_course: number; bent: number; gone: number };
  /** Not yet happened, soonest first (EVT-096). */
  ahead: ChronicleRow[];
  /** Happened, newest first. */
  happened: ChronicleRow[];
}

/** Each live goal of a realm, as a realm's Aims fold and the Chronicle show it (EVT-098). */
export interface GoalView {
  goal: number;
  realm: number;
  target: number;
  /** Whether it took its alternative at the start (EVT-086). */
  swapped: boolean;
}

const startDate = `${START_DATE.year}-${String(START_DATE.month).padStart(2, "0")}-${String(START_DATE.day).padStart(2, "0")}`;

/** The tree event of a turning point in this campaign, if the tree holds one (EVT-094). */
export function treeEventOf(world: World, t: TurningPoint): string | null {
  const events = world.events?.state.events;
  if (!events) return null;
  const id = t.event ?? t.key;
  return events[id] ? id : null;
}

/** The Chronicle now (EVT-094 to EVT-096). */
export function chronicleView(world: World): ChronicleView {
  const view: ChronicleView = { counts: { on_course: 0, bent: 0, gone: 0 }, ahead: [], happened: [] };
  const ev = world.events?.state;
  if (!ev) return view;
  const year = world.date.year;
  const goals = world.goals;
  const toward = new Map<string, Goal[]>();
  for (const g of goals?.list ?? []) for (const k of goals!.defs[g.def]!.toward ?? []) toward.set(k, [...(toward.get(k) ?? []), g]);
  for (const t of TURNING_POINTS) {
    // What happened before the start is the start itself, not the campaign's history.
    if (t.date < startDate) continue;
    const id = treeEventOf(world, t);
    if (!id) continue;
    const def = ev.events[id]!;
    const hist = Number(t.date.slice(0, 4));
    const leading = toward.get(t.key) ?? [];
    const heading = leading.filter((g) => isLive(g) && !world.nationGone[g.realm]).map((g) => ({ realm: g.realm, goal: g.def }));
    const fired = ev.world.history.find((o) => o.event === id);
    if (fired) {
      const off = fired.year - hist;
      view.happened.push({ key: t.key, name: t.name, year: hist, state: "happened", happened: { year: fired.year, timing: Math.abs(off) <= C.on_course_years ? "as in history" : off < 0 ? "early" : "late" }, heading: [] });
      continue;
    }
    const latest = def.availability.latest;
    const gone = !!ev.invalidated[id] || (latest != null && year > latest) || (def.exclusive_with ?? []).some((x) => ev.world.history.some((o) => o.event === x));
    // Goals lead here and none still pursues its own aim (EVT-095).
    const goalsGone = leading.length > 0 && !leading.some((g) => isLive(g) && g.shaken === "kept" && !world.nationGone[g.realm]);
    const state: ChronicleState = gone ? "gone" : year > hist + C.on_course_years || goalsGone ? "bent" : "on_course";
    const near = hist <= year + C.horizon_years && (state !== "on_course" ? hist >= year - C.horizon_years : true);
    if (!near) continue;
    view.counts[state]++;
    view.ahead.push({ key: t.key, name: t.name, year: hist, state, heading });
  }
  view.ahead.sort((a, b) => a.year - b.year);
  view.happened.sort((a, b) => b.happened!.year - a.happened!.year || b.year - a.year);
  return view;
}

/** Every realm's live goals (EVT-098); the client reads their words from the scenario's goals. */
export function goalViews(world: World): GoalView[] {
  return (world.goals?.list ?? []).filter((g) => isLive(g) && !world.nationAsleep[g.realm]).map((g) => ({ goal: g.def, realm: g.realm, target: g.target, swapped: g.shaken === "swapped" }));
}
