import { bridgeUsable, displayDays, stepBreakdown } from "./army-rules.ts";
import type { MonthLog } from "./day-loop.ts";
import { routeFood, type FoodStep } from "./food.ts";
import { MARCH, MOVE, type Army, type MoveWorld, atWar, hostileArmies, moverById, placeOf, shownMen } from "./model.ts";
import type { RoutePlan } from "./planner.ts";

export type StepIcon = "river" | "snow pass" | "castle" | "border" | "enemy army" | "snowflake" | "rain";

export interface PreviewStep {
  from: string;
  to: string;
  days: number;
  /** Day count at the province, from now. */
  dayCount: number;
  greyed: boolean;
  icons: StepIcon[];
  /** Shown size of an enemy army seen on the step. */
  enemyShown?: number;
}

export interface RoutePreview {
  steps: PreviewStep[];
  total: number;
  /** Where the army stands at the end of this and each later turn: after `afterIndex` places of the path, mid-step when `between`. */
  turnMarks: { turn: number; after: string; between?: string }[];
  food: FoodStep[];
  pointOfNoReturn?: string;
  message?: string;
}

/**
 * The route preview (10.3): day counts at each province and the total, turn marks (a turn is a week, X-18),
 * icons on the steps that cost extra, food colour and the point of no return.
 * `dayOfTurn` is the day already gone this turn (0 at the start of a turn).
 */
export function previewRoute(w: MoveWorld, a: Army, plan: RoutePlan, dayOfTurn = 0): RoutePreview {
  const steps: PreviewStep[] = [];
  const all = [...plan.path, ...plan.greyed];
  let from = a.place;
  let count = 0;
  all.forEach((to, i) => {
    const b = stepBreakdown(w, a, from, to);
    const greyed = i >= plan.path.length;
    const days = plan.arrive[i] !== undefined ? plan.arrive[i]! - (plan.arrive[i - 1] ?? 0) : b.days;
    count += days;
    const icons: StepIcon[] = [];
    const p = placeOf(w, to);
    if (p.river && !bridgeUsable(w, a, to)) icons.push("river");
    if (p.snowPeak) icons.push("snow pass");
    if (plan.end === "castle" && to === plan.stopsAt) icons.push("castle");
    if (plan.end === "needs passage" && i === plan.path.length) icons.push("border");
    const step: PreviewStep = { from, to, days, dayCount: count, greyed, icons };
    const seen = hostileArmies(w, a, to)
      .map((e) => shownMen(w, a.owner, e))
      .filter((n): n is number => n !== null);
    if (seen.length) {
      icons.push("enemy army");
      step.enemyShown = seen.reduce((s, n) => s + n, 0);
    }
    if (b.seasonKind === "winter") icons.push("snowflake");
    if (b.seasonKind === "wet") icons.push("rain");
    steps.push(step);
    from = to;
  });
  const active = steps.filter((s) => !s.greyed);
  const total = active.length ? active[active.length - 1]!.dayCount : 0;
  const turnMarks: RoutePreview["turnMarks"] = [];
  for (let turn = 1; ; turn++) {
    const end = turn * MOVE.turnDays - dayOfTurn;
    if (end >= total) break;
    const i = active.findIndex((s) => s.dayCount > end);
    const at = active[i]!;
    if (i > 0 && active[i - 1]!.dayCount === end) turnMarks.push({ turn, after: at.from });
    else turnMarks.push({ turn, after: at.from, between: at.to });
  }
  const food = routeFood(w, a, plan);
  const out: RoutePreview = { steps, total, turnMarks, food: food.steps };
  if (food.pointOfNoReturn !== undefined) out.pointOfNoReturn = food.pointOfNoReturn;
  if (plan.message !== undefined) out.message = plan.message;
  return out;
}

export interface Playback {
  secondsPer10Days: number;
  skip: boolean;
  /** The 4-hour steps the month slows to while the player's battles run, and what the player may do at each (X-1). */
  battleSteps: { day: number; step: number; places: string[] }[];
  choices: string[];
  /** Battles between AI realms: crossed swords and a half-second pause, never a stop. */
  flashes: { day: number; place: string; pauseSeconds: number }[];
  /** Castles that stopped an army, ringed red. */
  redRings: { day: number; place: string }[];
}

/** The month played back as the day loop ran (10.6, X-1): the player's battles slow it to 4-hour steps; AI battles only flash. */
export function monthPlayback(w: MoveWorld, realm: string, log: MonthLog): Playback {
  const ours = (ids: string[]) => ids.some((id) => moverById(w, id)?.owner === realm);
  return {
    secondsPer10Days: MOVE.replaySecondsPer10Days,
    skip: true,
    battleSteps: log.steps.map((st) => ({
      day: st.day,
      step: st.step,
      places: log.battles.filter((b) => ours([...b.sides[0], ...b.sides[1]]) && b.day <= st.day && !log.battleEnds.some((e) => e.place === b.place && (e.day < st.day || (e.day === st.day && e.step < st.step)))).map((b) => b.place),
    })),
    choices: [...MOVE.battleStepChoices],
    flashes: log.battles.filter((b) => !ours([...b.sides[0], ...b.sides[1]])).map((b) => ({ day: b.day, place: b.place, pauseSeconds: 0.5 })),
    redRings: log.stops.filter((s) => s.reason === "castle").map((s) => ({ day: s.day, place: s.place })),
  };
}

/** Day counts as the player sees them: whole days. */
export const shownDayCounts = (p: RoutePreview): number[] => p.steps.filter((s) => !s.greyed).map((s) => displayDays(s.dayCount));

/** How a route set on the map is confirmed (10.2): a tapped route on March, a dragged one on lift. */
export const confirmedBy = (setBy: "tap" | "drag"): "March" | "lift" => (setBy === "tap" ? "March" : "lift");

export type NoticeKind = "stopped short" | "battle" | "route red" | "enemy seen entering" | "lost sight";

export interface Notice {
  kind: NoticeKind;
  army: string;
  text: string;
}

/**
 * The month's notices for one realm (10.6): only what changes its plans; nothing for an army
 * that walked where it was told.
 */
export function noticesFor(w: MoveWorld, realm: string, log: MonthLog): Notice[] {
  const out: Notice[] = [];
  const owner = (id: string) => moverById(w, id)?.owner;
  for (const s of log.stops) if (s.short && owner(s.army) === realm) out.push({ kind: "stopped short", army: s.army, text: `${s.army} stopped at ${s.place}: ${s.reason}` });
  for (const b of log.battles) {
    const ours = [...b.sides[0], ...b.sides[1]].find((id) => owner(id) === realm);
    if (ours) out.push({ kind: "battle", army: ours, text: `Battle at ${b.place}` });
  }
  for (const r of log.red) if (owner(r.army) === realm) out.push({ kind: "route red", army: r.army, text: `${r.army}: food runs out at ${r.place}` });
  for (const l of log.lostSight) if (owner(l.army) === realm) out.push({ kind: "lost sight", army: l.army, text: `${l.army} lost sight of its quarry at ${l.place}` });
  const seen = new Set<string>();
  for (const e of log.entered) {
    const m = moverById(w, e.mover);
    if (!m || m.kind !== "army" || seen.has(m.id) || !atWar(w, m.owner, realm)) continue;
    if (placeOf(w, e.place).owner !== realm || placeOf(w, e.from).owner === realm) continue;
    if (shownMen(w, realm, m as Army) === null) continue;
    seen.add(m.id);
    out.push({ kind: "enemy seen entering", army: m.id, text: `Enemy army seen entering ${e.place}` });
  }
  return out;
}
