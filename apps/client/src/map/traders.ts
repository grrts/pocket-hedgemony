/**
 * Traders on the living map (VIEW-123, VIEW-132): each trader is drawn where
 * the game's daily walk has it, on the leg from the province it stands in to
 * the next of its loop. Over land it steps along the leg's tiles as an army
 * does; at sea it sails from zone to zone. Between days it walks on smoothly
 * over the step, as armies walk their trail.
 */
import type { TraderWalk } from "@ph/engine";
import { traderFigure, traderOnLeg } from "@ph/engine/domain/map-presentation";
import type { SpriteName } from "../art/sprites.ts";

export interface PlacedTrader {
  /** Map position, and the way it heads, one map pixel long (the sprites face left). */
  x: number;
  y: number;
  ux: number;
  uy: number;
  sprite: SpriteName;
}

const SPRITE: Record<string, SpriteName> = { caravan: "caravanTrain", barge: "barge", "trading ship": "cog" };

type XY = readonly [number, number];

/** The points of a leg: its tiles over land, else the centres of the two provinces. */
function legPoints(w: Pick<TraderWalk, "from" | "to" | "tiles">, tileAt: (tile: number) => XY, centre: (province: number) => XY): XY[] {
  return w.tiles.length >= 2 ? Array.from(w.tiles, tileAt) : [centre(w.from), centre(w.to)];
}

/** The point a share of the way along a leg, stepping tile to tile, and the way it heads there. */
export function onLeg(pts: readonly XY[], progress: number): { x: number; y: number; ux: number; uy: number } {
  if (pts.length < 2) return { x: pts[0]![0], y: pts[0]![1], ux: -1, uy: 0 };
  const { index, frac } = traderOnLeg(pts.length, progress);
  const [ax, ay] = pts[index]!;
  const [bx, by] = pts[index + 1]!;
  const l = Math.hypot(bx - ax, by - ay) || 1;
  return { x: ax + (bx - ax) * frac, y: ay + (by - ay) * frac, ux: (bx - ax) / l, uy: (by - ay) / l };
}

/**
 * Where a trader is drawn a share `t` of the way through the step from the
 * previous day's walk to this one's: on along the same leg, or finishing the
 * last leg and starting the next when it entered a province; anything else
 * (a new route, a lost save) puts it straight where the game has it.
 */
export function placeTrader(now: TraderWalk, before: TraderWalk | undefined, t: number, tileAt: (tile: number) => XY, centre: (province: number) => XY): PlacedTrader {
  const sprite = SPRITE[traderFigure(now.medium)] ?? "caravanTrain";
  const k = Math.min(1, Math.max(0, t));
  let at: { x: number; y: number; ux: number; uy: number };
  if (before && before.from === now.from && before.to === now.to) at = onLeg(legPoints(now, tileAt, centre), before.progress + (now.progress - before.progress) * k);
  else if (before && before.to === now.from && before.from !== before.to) {
    const v = before.progress - 1 + (now.progress - (before.progress - 1)) * k;
    at = v < 0 ? onLeg(legPoints(before, tileAt, centre), 1 + v) : onLeg(legPoints(now, tileAt, centre), v);
  } else at = onLeg(legPoints(now, tileAt, centre), now.progress);
  return { ...at, sprite };
}
