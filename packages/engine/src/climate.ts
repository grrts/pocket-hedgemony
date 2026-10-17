import { isWetSeason, type WetClimate } from "./domain/time-and-turns/index.ts";
import type { GameDate } from "@ph/rules";

/**
 * Seasons on the map (decision X-17), worked out week by week from a simple
 * climate model so they come and go gradually: each province gets a
 * sea-level temperature for the day from its latitude and the time of year,
 * and how strongly autumn, spring and the wet season show. The renderer
 * lowers the temperature by each tile's height (6.5 °C a kilometre) and lays
 * snow where it is below freezing, so snow climbs down the mountains first
 * and only the highest peaks near the equator keep any. Seas and rivers
 * freeze in hard winters, the sea a month behind the land.
 */
export interface ProvinceClimate {
  /** Sea-level temperature for the day, °C. */
  temperature: number;
  /** 0..1 how far the leaves and fields have turned. */
  autumn: number;
  /** 0..1 how fresh the new green is. */
  spring: number;
  /** 0..1 how deep into its wet season a tropical dry land is. */
  wet: number;
}

// Zonal means by latitude (°C): yearly average and half the summer-to-winter swing.
const LATS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const MEAN = [26, 26, 24, 20, 14, 7, 0, -10, -18, -22];
const SWING = [1, 2, 4, 7, 9, 11, 14, 17, 18, 18];

const interp = (xs: number[], ys: number[], x: number) => {
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]!) return ys[i - 1]! + ((ys[i]! - ys[i - 1]!) * (x - xs[i - 1]!)) / (xs[i]! - xs[i - 1]!);
  return ys.at(-1)!;
};
/** 1 inside a box of longitude and latitude, easing to 0 over `edge` degrees outside it, so regions blend. */
const inBox = (lon: number, lat: number, w: number, s: number, e: number, n: number, edge = 8) => {
  const ramp = (d: number) => Math.min(1, Math.max(0, 1 - d / edge));
  return ramp(Math.max(0, w - lon, lon - e)) * ramp(Math.max(0, s - lat, lat - n));
};

/**
 * Yearly mean and half-swing at a place. Western Europe is warmed and evened
 * out by the Gulf Stream; the east sides of North America and Asia are colder
 * and swing harder; coasts swing less than inland.
 */
function climateAt(lon: number, lat: number, coastal: boolean): { mean: number; swing: number } {
  const a = Math.abs(lat);
  let mean = interp(LATS, MEAN, a);
  let swing = interp(LATS, SWING, a);
  const gulf = inBox(lon, lat, -12, 38, 10, 72);
  const continental = Math.max(inBox(lon, lat, -110, 35, -55, 70), inBox(lon, lat, 65, 40, 145, 75));
  mean += 3 * gulf - 3 * continental;
  swing *= (1 - 0.3 * gulf) * (1 + 0.35 * continental);
  if (coastal) swing *= 0.8;
  return { mean, swing };
}

const DAYS_BEFORE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export const dayOfYear = (d: GameDate) => DAYS_BEFORE[d.month - 1]! + (d.day ?? 1);

/** A smooth bump around a day of the year, 1 at its centre, 0 by `width` days away. */
function bump(day: number, centre: number, width: number): number {
  let x = Math.abs(day - centre);
  x = Math.min(x, 365 - x);
  return x >= width ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * x) / width);
}

/** Which wet-season calendar a tropical place follows (the domain's are placeholders by region). */
function wetClimate(lon: number): WetClimate {
  return lon < -30 ? "amazon" : lon > 60 ? "monsoon_asia" : "sahel_and_savanna";
}
const DRY_GROUND = new Set(["savanna", "steppe", "drylands", "badlands"]);

/** What a province's seasons depend on that never changes, worked out once. */
export interface PlaceClimate {
  lat: number;
  mean: number;
  swing: number;
  /** Days the coldest and warmest days come after the land's (the sea's heat lags). */
  lag: number;
  /** Wet-season calendar, for tropical dry lands only. */
  wet: WetClimate | null;
}

export function placeClimate(lon: number, lat: number, coastal: boolean, terrain: string): PlaceClimate {
  const { mean, swing } = climateAt(lon, lat, coastal);
  if (terrain === "sea" || terrain === "ocean") {
    // For a sea the temperature only decides its ice. The North Atlantic
    // Drift keeps the Norwegian Sea and the south of the Barents Sea open
    // while the Baltic's gulfs, the White Sea and Hudson Bay freeze over.
    const drift = Math.max(inBox(lon, lat, -30, 50, 12, 80, 4), inBox(lon, lat, 12, 68.5, 45, 80, 2), inBox(lon, lat, 4, 60, 15.5, 70, 1));
    return { lat, mean: mean + 12 * drift, swing, lag: 30, wet: null };
  }
  return { lat, mean, swing, lag: 0, wet: Math.abs(lat) < 23.5 && DRY_GROUND.has(terrain) ? wetClimate(lon) : null };
}

/** The months each day of the year falls in, for the wet-season window. */
const MONTH_OF_DAY = Array.from({ length: 365 }, (_, d) => DAYS_BEFORE.filter((b) => d >= b).length);

export function provinceClimate(place: PlaceClimate, date: GameDate): ProvinceClimate {
  const { lat, mean, swing } = place;
  const south = lat < 0;
  // The year as the northern hemisphere sees it: the south runs half a year behind.
  const day = (dayOfYear(date) + (south ? 182 : 0)) % 365;
  // Warmest around 20 July, coldest around 20 January, the land lagging the sun.
  const temperature = mean + swing * Math.cos((2 * Math.PI * (day - 201 - place.lag)) / 365);
  // Leaves turn earlier further north; the tropics have no autumn or spring to speak of.
  const a = Math.abs(lat);
  const temperate = Math.min(1, Math.max(0, (a - 22) / 10));
  const autumn = temperate * bump(day, 300 - Math.max(0, a - 40) * 2, 45);
  const spring = temperate * bump(day, 125 + Math.max(0, a - 40) * 2, 40);
  // Wet season: the share of the two months around today that are wet, so it eases in and out.
  let wet = 0;
  if (place.wet) {
    for (const k of [-30, -15, 0, 15, 30]) wet += isWetSeason(place.wet, MONTH_OF_DAY[(dayOfYear(date) - 1 + k + 365) % 365]!) ? 0.2 : 0;
  }
  return { temperature, autumn, spring, wet };
}

export function seasonName(lat: number, month: number): string {
  const m = lat >= 0 ? month : ((month + 5) % 12) + 1;
  return m === 12 || m <= 2 ? "Winter" : m <= 5 ? "Spring" : m <= 8 ? "Summer" : "Autumn";
}

/** Snow cover 0..1 at a temperature, as the map lays it: none above +1 °C, full by -5 °C. */
export function snowCover(temperature: number): number {
  const t = Math.min(1, Math.max(0, (1 - temperature) / 6));
  return t * t * (3 - 2 * t);
}
