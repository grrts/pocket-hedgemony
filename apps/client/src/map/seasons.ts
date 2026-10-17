import { isWetSeason, isWinter, type Hemisphere, type WetClimate } from "@ph/engine/domain/time-and-turns";

/**
 * Seasons on the map (decision X-17): each province follows the season of its
 * hemisphere (X-4), picked once a month and drawn as a palette swap on its
 * tiles, so it costs nothing per frame. The code goes to the renderer.
 */
export const SEASON = { summer: 0, snow: 1, spring: 2, autumn: 3, wet: 4, bare: 5 } as const;
export type SeasonCode = (typeof SEASON)[keyof typeof SEASON];

/** Snow covers land from this latitude toward the pole, and every mountain province. */
const SNOW_LATITUDE = 50;
const TROPIC = 23.5;
const SNOWY_GROUND = new Set(["mountains", "snowpeaks", "glacier"]);
/** Dry lands that green up in their wet season. */
const DRY_GROUND = new Set(["savanna", "steppe", "drylands", "badlands"]);

/** Which wet-season calendar a tropical place follows (the domain's are placeholders by region). */
function wetClimate(lon: number): WetClimate {
  return lon < -30 ? "amazon" : lon > 60 ? "monsoon_asia" : "sahel_and_savanna";
}

export function provinceSeason(lon: number, lat: number, terrain: string, month: number): SeasonCode {
  const h: Hemisphere = lat >= 0 ? "northern" : "southern";
  if (Math.abs(lat) < TROPIC) return DRY_GROUND.has(terrain) && isWetSeason(wetClimate(lon), month) ? SEASON.wet : SEASON.summer;
  // South of the snow line, winter leaves the land bare and dull.
  if (isWinter(h, month)) return Math.abs(lat) >= SNOW_LATITUDE || SNOWY_GROUND.has(terrain) ? SEASON.snow : SEASON.bare;
  // The season's months in the north; the south runs six months behind.
  const m = h === "northern" ? month : ((month + 5) % 12) + 1;
  return m >= 3 && m <= 5 ? SEASON.spring : m >= 9 && m <= 11 ? SEASON.autumn : SEASON.summer;
}

export function seasonName(lat: number, month: number): string {
  const m = lat >= 0 ? month : ((month + 5) % 12) + 1;
  return m === 12 || m <= 2 ? "Winter" : m <= 5 ? "Spring" : m <= 8 ? "Summer" : "Autumn";
}
