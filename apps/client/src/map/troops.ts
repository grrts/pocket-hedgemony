/**
 * How the figures of an army move on the living map (feedback after VIEW-118):
 * no figure jumps to its new spot. The banner-bearer leads, and the others walk
 * the road he took, so a column snakes along the march; when the army halts,
 * besieges or sets off, each figure walks from where it stands to its new place.
 * Everything here is in map pixels and is view only (INV-VIEW-3).
 */

export type Pt = [number, number];

/** Map pixels a figure walks a second at the least, so the last steps don't crawl. */
const MIN_SPEED = 1.5;
/** Share of the way left that a figure covers each second, so far figures hurry and near ones settle. */
const CATCH_UP = 5;
/** Further than this from its spot (map pixels), a figure is placed there: the army was carried, not walked. */
export const SNAP = 6;

const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * The leader's road, newest point first, kept as long as the column needs (`keep` map pixels).
 * A jump further than SNAP starts a new road.
 */
export function extendTrail(trail: readonly Pt[], leader: Pt, keep: number): Pt[] {
  if (!trail.length || dist(trail[0]!, leader) > SNAP) return [leader];
  const out: Pt[] = dist(trail[0]!, leader) < 0.01 ? [...trail] : [leader, ...trail];
  let len = 0;
  for (let i = 1; i < out.length; i++) {
    len += dist(out[i - 1]!, out[i]!);
    if (len >= keep) return out.slice(0, i + 1);
  }
  return out;
}

/**
 * The point `d` map pixels back along the road from its head. Past the road's end the column goes on
 * straight, away from `ahead` (the way the army faces), so a column that has just set off still forms.
 */
export function behind(trail: readonly Pt[], d: number, ahead: Pt): Pt {
  let left = d;
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1]!, b = trail[i]!;
    const seg = dist(a, b);
    if (seg >= left) {
      const t = seg ? left / seg : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    left -= seg;
  }
  const end = trail[trail.length - 1]!;
  const len = Math.hypot(ahead[0], ahead[1]) || 1;
  return [end[0] - (ahead[0] / len) * left, end[1] - (ahead[1] / len) * left];
}

/**
 * Walks each figure toward its spot over `dt` seconds. A new figure starts at the leader's
 * spot (the first); one further than SNAP from its spot is placed there. Returns where each
 * stands now and whether any is still walking.
 */
export function walk(at: readonly Pt[], targets: readonly Pt[], dt: number): { at: Pt[]; walking: boolean } {
  let walking = false;
  const out = targets.map((target, i): Pt => {
    const from = at[i] ?? at[0] ?? targets[0]!;
    const d = dist(from, target);
    if (d > SNAP || d < 0.02) return [target[0], target[1]];
    const step = Math.min(d, Math.max(MIN_SPEED * dt, d * (1 - Math.exp(-CATCH_UP * dt))));
    if (step < d) walking = true;
    const t = step / d;
    return [from[0] + (target[0] - from[0]) * t, from[1] + (target[1] - from[1]) * t];
  });
  return { at: out, walking };
}

/** What the map remembers of an army's figures between frames. */
export interface Troop {
  trail: Pt[];
  at: Pt[];
  /** When it was last drawn, ms. */
  t: number;
}

/**
 * Moves an army's figures one frame (VIEW-117..VIEW-120 as they change): `offsets` are the
 * figures' places from `formation`, in map pixels from the army's point. Marching, each figure
 * keeps its distance behind the leader along the road the leader walked; otherwise it heads for
 * its place in ranks or round the walls. Still figures (Animations Off), or an army not drawn for
 * a while, take their places at once.
 */
export function stepTroop(troop: Troop | undefined, o: { point: Pt; offsets: readonly Pt[]; marching: boolean; facing: Pt; now: number; still: boolean }): { troop: Troop; walking: boolean } {
  const keep = Math.max(1, ...o.offsets.map((p) => Math.hypot(p[0], p[1]))) + 1;
  const trail = extendTrail(troop?.trail ?? [], o.point, keep);
  const targets = o.offsets.map((p): Pt => (o.marching ? behind(trail, Math.hypot(p[0], p[1]), o.facing) : [o.point[0] + p[0], o.point[1] + p[1]]));
  const dt = troop ? (o.now - troop.t) / 1000 : Infinity;
  if (!troop || o.still || dt > 1) return { troop: { trail, at: targets, t: o.now }, walking: false };
  const next = walk(troop.at, targets, dt);
  return { troop: { trail, at: next.at, t: o.now }, walking: next.walking };
}
