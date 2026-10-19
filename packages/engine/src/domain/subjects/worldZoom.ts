/**
 * How a realm looks on the map at world zoom (SUBJ-093, subjects-design 10.3):
 * a subject is washed in its direct overlord's colour with a thin diagonal hatch
 * in its own colour, and its border with that overlord is dotted. A chain never
 * stacks hatches: a subject of a subject shows only its direct overlord's colour
 * and its own hatch. Pure: no DOM, no randomness. The hatch width comes from
 * packages/rules/data/domain/subjects.json (map.world_zoom_hatch_px).
 */
import config from "../../../../rules/data/domain/subjects.json" with { type: "json" };

export interface WorldZoomLook {
  /** The realm whose colour fills the realm's land: its direct overlord, or itself when free. */
  fill: string;
  /** The realm whose colour the hatch is drawn in (always the realm itself), or null when not a subject. */
  hatch: string | null;
  /** Width of the hatch stripes in map pixels. */
  hatchPx: number;
  /** How the border between this realm and another is drawn. */
  borderWith(other: string): "dotted" | "solid";
}

/** The width of the world-zoom hatch in map pixels. */
export function worldZoomHatchPx(): number {
  return config.map.world_zoom_hatch_px;
}

/**
 * True when the border between realms a and b is the dotted one between a
 * subject and its direct overlord; every other nation border is solid.
 */
export function dottedBorder<T>(a: T, b: T, overlordOf: (realm: T) => T | null): boolean {
  return a !== b && (overlordOf(a) === b || overlordOf(b) === a);
}

/** The world-zoom look of a realm, given who the direct overlord of each realm is (null when free). */
export function worldZoomLook(realm: string, overlordOf: (realm: string) => string | null): WorldZoomLook {
  const overlord = overlordOf(realm);
  return {
    fill: overlord ?? realm,
    hatch: overlord ? realm : null,
    hatchPx: worldZoomHatchPx(),
    borderWith: (other) => (dottedBorder(realm, other, overlordOf) ? "dotted" : "solid"),
  };
}
