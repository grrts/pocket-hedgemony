/**
 * Traders on the living map (VIEW-123, VIEW-132): each busy trade path the
 * snapshot feeds carries up to three movers, a caravan on land, a barge on a
 * river and a trading ship at sea, walking its loop of province centres with
 * the game clock. Decoration only: the Trade tab and lenses keep the numbers.
 */
import type { GameDate } from "@ph/rules";
import { traderMovers } from "@ph/engine/domain/map-presentation";
import type { SpriteName } from "../art/sprites.ts";

export interface MoverPath {
  id: number;
  medium: "land" | "river" | "sea";
  path: readonly number[];
  traders: number;
}

export interface PlacedMover {
  /** Map position, and whether it heads right (the sprites face left). */
  x: number;
  y: number;
  right: boolean;
  /** The leg's direction, one map pixel long, so traders keep to their side of the way and meet without overlapping. */
  ux: number;
  uy: number;
  /** The provinces of the leg it is on. */
  from: number;
  to: number;
  sprite: SpriteName;
}

const SPRITE: Record<string, SpriteName> = { caravan: "caravanTrain", barge: "barge", "trading ship": "cog" };

/** Days since year 0 at a date and hour, so the movers' clock runs smoothly over months and years. */
export function clockDays(date: GameDate, hour: number): number {
  return Date.UTC(date.year, date.month - 1, date.day ?? 1) / 86_400_000 + hour / 24;
}

/** The point a share `at` of the way round a closed loop, by length, with the leg it is on. */
export function alongLoop(pts: readonly (readonly [number, number])[], at: number): { x: number; y: number; leg: number; dx: number; dy: number } {
  const n = pts.length;
  const len = (k: number) => Math.hypot(pts[(k + 1) % n]![0] - pts[k]![0], pts[(k + 1) % n]![1] - pts[k]![1]);
  let total = 0;
  for (let k = 0; k < n; k++) total += len(k);
  let left = (((at % 1) + 1) % 1) * total;
  for (let k = 0; k < n; k++) {
    const l = len(k);
    if (left <= l || k === n - 1) {
      const [ax, ay] = pts[k]!;
      const [bx, by] = pts[(k + 1) % n]!;
      const t = l > 0 ? Math.min(1, left / l) : 0;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, leg: k, dx: bx - ax, dy: by - ay };
    }
    left -= l;
  }
  return { x: pts[0]![0], y: pts[0]![1], leg: 0, dx: 0, dy: 0 };
}

/** Where a path's movers stand at a game clock, in map pixels, from the provinces' centre points. */
export function placeMovers(p: MoverPath, days: number, centre: (province: number) => readonly [number, number]): PlacedMover[] {
  if (p.path.length < 2) return [];
  const pts = p.path.map(centre);
  return traderMovers(p, days).map((m) => {
    const a = alongLoop(pts, m.at);
    const l = Math.hypot(a.dx, a.dy) || 1;
    return { x: a.x, y: a.y, right: a.dx > 0, ux: a.dx / l, uy: a.dy / l, from: p.path[a.leg]!, to: p.path[(a.leg + 1) % p.path.length]!, sprite: SPRITE[m.kind] ?? "caravanTrain" };
  });
}
