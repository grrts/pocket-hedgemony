/**
 * What the map shows of the war, the clock and the winter, from Leroy's
 * playtest feedback (VIEW-074..082): armies on their tiles under their
 * commanders' banners, battles and sieges with their progress, the names the
 * map keeps, the date ticking through playback, route lines that read on any
 * colour, and sea ice that grows from the coasts with a soft edge. The client
 * draws from these, so the specs check what the player sees.
 */
import config from "../../../../rules/data/domain/map-presentation.json" with { type: "json" };
import { STEPS_PER_DAY } from "../time-and-turns/index.ts";
import type { Mark, Zoom } from "./index.ts";

// ---------------------------------------------------------------------------
// Armies on their tiles (VIEW-074)

export interface ArmyOnMap {
  /** Map tile the army stands on now. */
  tile: number;
  owner: string;
  /** The commander's name; troops without one are their province's garrison and stay off the map (RECR-107). */
  commander: string | null;
}

/** An army stands on its own tile under its commander's banner (VIEW-074). */
export function armyStand(a: ArmyOnMap): Mark[] {
  if (a.commander === null) return [];
  return [{ draw: "banner", tile: a.tile, commander: a.commander, colour: a.owner }];
}

// ---------------------------------------------------------------------------
// Route lines (VIEW-075)

export const ROUTE_STROKE = config.routeStroke as { dash: string; outline: string; minContrast: number };

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Contrast ratio of two colours, 1 to 21 (WCAG). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A route line over a ground colour: a light dash over a dark outline (VIEW-075). The pair reads
 * on any ground: the outline stands out from light ground, the dash from dark, and dash and outline
 * from each other.
 */
export function routeStrokeOver(ground: string): { dash: string; outline: string; readable: boolean } {
  const { dash, outline, minContrast } = ROUTE_STROKE;
  const readable = contrastRatio(dash, outline) >= minContrast && Math.max(contrastRatio(dash, ground), contrastRatio(outline, ground)) >= minContrast;
  return { dash, outline, readable };
}

// ---------------------------------------------------------------------------
// The date during playback (VIEW-076, TIME-076)

/** 4-hour steps the next playback tick plays: the rest of the day, or one step while a player battle runs. */
export function playbackAdvance(hour: number, playerBattle: boolean): number {
  return playerBattle ? 1 : STEPS_PER_DAY - hour / (24 / STEPS_PER_DAY);
}

/** The hour the top bar shows beside the date: only while a player battle runs, as "08:00". */
export function playbackHour(hour: number, playerBattle: boolean): string | null {
  return playerBattle ? `${String(hour).padStart(2, "0")}:00` : null;
}

// ---------------------------------------------------------------------------
// Battles (VIEW-077, WAR-207)

export interface BattleRoundView {
  attMen: number;
  defMen: number;
  attStart: number;
  defStart: number;
  /** Rounds fought, and the rounds the battle takes. */
  round: number;
  rounds: number;
  attackerWins: boolean;
}

export interface BattleSide {
  men: number;
  /** Men left of those the side brought, 0..1. */
  menLeft: number;
  /** Morale left, 0..1: the losing side's runs out as it breaks on the last round; the winner's sinks less. */
  moraleLeft: number;
}

/** Each side of a battle after the rounds fought so far: men, and the bars of men and morale left (VIEW-077). */
export function battleSides(b: BattleRoundView): [BattleSide, BattleSide] {
  const t = b.rounds > 0 ? Math.min(1, b.round / b.rounds) : 0;
  const side = (men: number, start: number, wins: boolean): BattleSide => ({
    men,
    menLeft: start > 0 ? Math.max(0, Math.min(1, men / start)) : 0,
    moraleLeft: Math.max(0, 1 - t * (wins ? config.battleMorale.winnerSpends : 1)),
  });
  return [side(b.attMen, b.attStart, b.attackerWins), side(b.defMen, b.defStart, !b.attackerWins)];
}

/** What the map and the battle viewer show of a battle: each side's men over a bar of men and morale left. */
export function battleProgressMarks(sides: readonly [BattleSide, BattleSide]): Mark[] {
  return sides.flatMap((s, i) => {
    const side = i === 0 ? "attacker" : "defender";
    return [
      { draw: "men", side, men: s.men },
      { draw: "bar", side, menLeft: s.menLeft, moraleLeft: s.moraleLeft },
    ];
  });
}

// ---------------------------------------------------------------------------
// Sieges (VIEW-078, WAR-208)

export interface SiegeProgress {
  /** Days the walls have held, and the siege months passed. */
  days: number;
  months: number;
  breaches: number;
  garrison: number;
  /** Months of food left in the castle store; null while nobody eats from it. */
  foodMonths: number | null;
}

/** How long the walls have held, in words: days in the first siege month, then months. */
export function siegeHeld(s: Pick<SiegeProgress, "days" | "months">): string {
  if (s.months < 1) return `${s.days} ${s.days === 1 ? "day" : "days"}`;
  return `${s.months} ${s.months === 1 ? "month" : "months"}`;
}

/**
 * A besieged castle at Region and Local zoom: a plate with how long it has held, its breaches, its
 * garrison and its food left (VIEW-078); far out only the ring of VIEW-008 shows.
 */
export function siegeProgressMarks(zoom: Zoom, s: SiegeProgress): Mark[] {
  if (zoom === "World") return [];
  return [{ draw: "siege plate", held: siegeHeld(s), breaches: s.breaches, garrison: s.garrison, foodMonths: s.foodMonths === null ? "no one eats" : Math.floor(s.foodMonths * 10) / 10 }];
}

// ---------------------------------------------------------------------------
// Names on the map (VIEW-079)

export interface NamedPlace {
  name: string;
  sea?: boolean;
  /** Whether the province is the capital of the realm that owns it. */
  ownersCapital?: boolean;
}

/** Whether a place's name is written on the map: seas, and of the land only each realm's capital (VIEW-079). */
export const nameOnMap = (p: NamedPlace): boolean => p.sea === true || p.ownersCapital === true;

/**
 * The province names the map draws at a zoom, and the name on the selected province's name tab and
 * card. Far out only realm names show; from Region in, each realm's capital and the seas (VIEW-079).
 */
export function mapNames(zoom: Zoom, places: readonly NamedPlace[], selected: NamedPlace | null = null): { drawn: string[]; nameTab: string | null; card: string | null } {
  const drawn = zoom === "World" ? [] : places.filter(nameOnMap).map((p) => p.name);
  return { drawn, nameTab: selected?.name ?? null, card: selected?.name ?? null };
}

// ---------------------------------------------------------------------------
// Sea ice (VIEW-080..082, X-17)

export type Rgb01 = readonly [number, number, number];

export const ICE = config.seaIce as {
  openAboveC: number;
  frozenByC: number;
  sampleRadius: number;
  samples: number;
  coldGain: number;
  coastWeight: number;
  depthWeight: number;
  noiseWeight: number;
  /** Octaves of the edge's noise: [scale in map pixels, weight]. */
  noiseOctaves: [number, number][];
  slush: [number, number];
  solid: [number, number];
  slushMix: number;
  slushColour: [number, number, number];
  iceColour: [number, number, number];
  floeColour: [number, number, number];
  crackColour: [number, number, number];
  landSnowColour: [number, number, number];
  closesWhenFrozenShare: number;
};

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The map shader's hash of a map pixel, 0..1 (the same integer steps as its GLSL). */
export function pixelHash(x: number, y: number): number {
  let h = (Math.imul(x >>> 0, 374761393) + Math.imul(y >>> 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h & 0xffff) / 65535;
}

/** Smooth value noise over map pixels. */
export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return mix(mix(pixelHash(ix, iy), pixelHash(ix + 1, iy), fx), mix(pixelHash(ix, iy + 1), pixelHash(ix + 1, iy + 1), fx), fy);
}

/** A few octaves of value noise (wide shapes first, a little fine grain last), for an ice edge that follows no province line. */
export const fractalNoise = (x: number, y: number): number => ICE.noiseOctaves.reduce((t, [scale, weight]) => t + weight * valueNoise(x / scale, y / scale), 0);

/** How cold a sea zone is for ice, 0..1: open water above `openAboveC`, frozen over by `frozenByC`. */
export const seaCold = (celsius: number): number => smoothstep(ICE.openAboveC, ICE.frozenByC, celsius);

/** The sea around a map point, for the ice: what is at each map pixel. */
export interface IceSampler {
  /** The place at a map pixel: land, a sea zone with its temperature, or nothing (off the map). */
  at(x: number, y: number): { land: true } | { land: false; celsius: number } | null;
  /** Depth band at a map pixel, 0 (shallow) .. 1 (deepest). */
  depth(x: number, y: number): number;
}

/**
 * Slush and sea ice at a map point, each 0..1 (VIEW-080, VIEW-082). The cold is blended across the
 * sea zones round the point so no zone freezes as a block; ice forms first along coasts and over
 * shallow water, and its edge follows noise, not zone borders; slush and ice rise smoothly, with no
 * ordered dither. The map shader runs the same sums.
 */
export function seaIceAt(s: IceSampler, x: number, y: number): { slush: number; ice: number } {
  let cold = 0;
  let seas = 0;
  let coast = 0;
  const n = ICE.samples + 1;
  for (let k = 0; k < n; k++) {
    const ox = k === 0 ? 0 : ICE.sampleRadius * Math.cos(k * 0.785);
    const oy = k === 0 ? 0 : ICE.sampleRadius * Math.sin(k * 0.785);
    const p = s.at(Math.floor(x + ox), Math.floor(y + oy));
    if (!p) continue;
    if (p.land) coast += 1;
    else {
      cold += seaCold(p.celsius);
      seas += 1;
    }
  }
  if (seas === 0 || cold < 0.02) return { slush: 0, ice: 0 };
  cold /= seas;
  const k = cold * ICE.coldGain + (ICE.coastWeight * coast) / n - ICE.depthWeight * s.depth(Math.floor(x), Math.floor(y)) - ICE.noiseWeight * fractalNoise(x, y);
  return { slush: smoothstep(ICE.slush[0], ICE.slush[1], k), ice: smoothstep(ICE.solid[0], ICE.solid[1], k) };
}

const mixRgb = (a: Rgb01, b: Rgb01, t: number): Rgb01 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Sea ice's own colour at a map point: a grey-blue darker than snow on land, pale floes and a few long cracks (VIEW-081). */
export function iceColour(x: number, y: number): Rgb01 {
  if (Math.abs(valueNoise(x * 0.22 + 17, y * 0.22 + 17) - 0.5) < 0.018) return ICE.crackColour;
  return mixRgb(ICE.iceColour, ICE.floeColour, smoothstep(0.55, 0.75, valueNoise(x * 0.45, y * 0.45)));
}

/** Open water under the ice at a map point: slush then ice laid over the water's colour. */
export function icedSea(water: Rgb01, s: IceSampler, x: number, y: number): Rgb01 {
  const { slush, ice } = seaIceAt(s, x, y);
  if (slush <= 0) return water;
  return mixRgb(mixRgb(water, ICE.slushColour, ICE.slushMix * slush), iceColour(x, y), ice);
}

/** Brightness of a colour as the eye sees it, 0..1; colour vision modes and greys keep it. */
export const brightness = (c: Rgb01): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
