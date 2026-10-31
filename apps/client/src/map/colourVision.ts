import { colourVision, lensBandPatterns, type ColourVision } from "@ph/engine/domain/map-presentation";
import { PALETTE as NATION_PALETTE } from "@ph/engine/domain/scenario-setup";

/**
 * Colour vision on the map (VIEW-047, VIEW-048, SET-095, SET-096, SET-130).
 * The engine's colourVision() says what a mode changes: nation colours (the
 * normal assignment, a second assignment from the same 32-colour palette, or
 * greys), the lens ramps (normal, blue to orange, or greys with patterns) and
 * whether patterns come on. This file turns that plan into colours: the
 * second assignment is chosen so neighbouring realms stay apart as that
 * vision type sees them, and the safe ramps run blue to orange with their
 * lightness in order, so they also read in grey.
 */

/** The setting's values (settings.json `accessibility.colour_vision`). */
export type VisionSetting = "default" | "protan" | "deutan" | "tritan" | "none";
/** Which colours a vision type confuses, for the simulator; "none" sees only lightness. */
type Kind = "protan" | "deutan" | "tritan" | "none";

const MODE: Record<VisionSetting, ColourVision> = { default: "Default", protan: "Red-weak", deutan: "Green-weak", tritan: "Blue-weak", none: "No colour" };

export interface Vision {
  setting: VisionSetting;
  /** The map-presentation mode the setting names. */
  mode: ColourVision;
  /** "normal assignment", "second assignment" or "greys". */
  nationColours: string;
  /** "normal", "blue to orange" or "greys with patterns". */
  ramp: string;
  /** No colour turns patterns on for every lens and the realms. */
  patterns: boolean;
  /** The size of the nation palette the assignment draws from. */
  palette: number;
}

export function visionOf(value: unknown): Vision {
  const setting = (String(value) in MODE ? String(value) : "default") as VisionSetting;
  const mode = MODE[setting];
  return { setting, mode, ...colourVision(mode) };
}

/** The shader's number for a mode: 0 normal, 1 to 3 the weak types, 4 no colour (season shifts, SET-130). */
export const visionIndex = (v: Vision): number => ["default", "protan", "deutan", "tritan", "none"].indexOf(v.setting);

// ---------------------------------------------------------------- colour maths

export type Rgb = readonly number[];

export function hexRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbHex = (c: Rgb): string => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = Math.max(0, Math.min(1, v));
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
};

/** Full-strength dichromat simulation (Machado, Oliveira and Fernandes 2009), applied in linear RGB. */
const SIM: Record<Exclude<Kind, "none">, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** How a colour looks to a vision type, as RGB bytes. */
export function simulate(c: Rgb, kind: Kind): number[] {
  const l = c.map(toLinear);
  if (kind === "none") {
    const y = 0.2126 * l[0]! + 0.7152 * l[1]! + 0.0722 * l[2]!;
    return [y, y, y].map(fromLinear);
  }
  return SIM[kind].map((row) => fromLinear(row[0]! * l[0]! + row[1]! * l[1]! + row[2]! * l[2]!));
}

/** CIE L*a*b* of an RGB colour. */
function lab(c: Rgb): [number, number, number] {
  const [r, g, b] = c.map(toLinear) as [number, number, number];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** How far apart two colours look (CIE76 ΔE). */
export function deltaE(a: Rgb, b: Rgb): number {
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Lightness 0..100 (L*), which every vision type keeps. */
export const lightness = (c: Rgb): number => lab(c)[0];

/** A grey of the given lightness. */
function greyOfLightness(l: number): number[] {
  const y = l > 8 ? ((l + 16) / 116) ** 3 : l / (24389 / 27);
  const v = Math.round(fromLinear(y));
  return [v, v, v];
}

/** The grey a colour turns to with no colour: the same lightness. */
export const greyOf = (c: Rgb): number[] => greyOfLightness(lightness(c));

// ---------------------------------------------------------------- nation colours

/** Neighbours far enough apart, in ΔE as the vision type sees them, count as told apart. */
export const NEIGHBOUR_DELTA_E = 20;

/** The greys a realm can take with no colour, light to dark, each a clear step from the next. */
const NATION_GREYS = [88, 76, 64, 52, 40, 30].map(greyOfLightness);
/** The patterns a realm can carry with no colour, beside its grey: none, hatching, dots, stripes. */
const NATION_PATTERNS = [0, 1, 2, 3];

export interface NationInput {
  /** Each realm's own colour, as the rules or its waking give it. */
  colours: readonly string[];
  /** Each realm's neighbours, by index. */
  neighbours: readonly ReadonlySet<number>[];
  /** The order to colour them in: largest first, realms woken later last, so waking never recolours the rest. */
  order: readonly number[];
}

export interface NationColours {
  /** The colour each realm is drawn in. */
  colours: string[];
  /** The pattern each realm carries on the map (0 none), with no colour only. */
  patterns: number[];
}

/**
 * The nation colours a mode draws (VIEW-047): the normal assignment as it is;
 * a second assignment from the same 32-colour palette, where each realm takes
 * the palette colour nearest its own that its neighbours can still be told
 * from as this vision type sees them; or, with no colour, a grey and a
 * pattern no neighbour shares.
 */
export function nationColours(v: Vision, input: NationInput): NationColours {
  const n = input.colours.length;
  const patterns = new Array<number>(n).fill(0);
  if (v.setting === "default") return { colours: input.colours.slice(), patterns };
  if (v.setting === "none") return greyNations(input);
  const kind = v.setting;
  const palette = NATION_PALETTE.slice(0, v.palette).map(hexRgb);
  const seen = palette.map((c) => simulate(c, kind));
  const gapOf = seen.map((a) => seen.map((b) => deltaE(a, b)));
  const chosen: number[] = new Array<number>(n).fill(-1);
  const out = input.colours.slice();
  for (const i of input.order) {
    const own = simulate(hexRgb(input.colours[i]!), kind);
    let best = -1;
    let bestScore = -Infinity;
    for (let k = 0; k < palette.length; k++) {
      let gap = Infinity;
      for (const j of input.neighbours[i] ?? []) if (chosen[j]! >= 0) gap = Math.min(gap, gapOf[k]![chosen[j]!]!);
      // Told apart from every neighbour first, then as near its own colour as can be.
      const score = Math.min(gap, NEIGHBOUR_DELTA_E) * 1000 - deltaE(seen[k]!, own);
      if (score > bestScore) (bestScore = score), (best = k);
    }
    chosen[i] = best;
    out[i] = NATION_PALETTE[best]!;
  }
  return { colours: out, patterns };
}

function greyNations(input: NationInput): NationColours {
  const n = input.colours.length;
  const grey = new Array<number>(n).fill(-1);
  const pat = new Array<number>(n).fill(0);
  for (const i of input.order) {
    const ownL = lightness(hexRgb(input.colours[i]!));
    let best: [number, number] = [0, 0];
    let bestScore = -Infinity;
    for (let g = 0; g < NATION_GREYS.length; g++) {
      for (const p of NATION_PATTERNS) {
        let gap = Infinity;
        let clash = 0;
        for (const j of input.neighbours[i] ?? []) {
          if (grey[j]! < 0) continue;
          gap = Math.min(gap, Math.abs(grey[j]! - g));
          if (grey[j] === g && pat[j] === p) clash++;
        }
        // Never the same grey and pattern as a neighbour; a different grey before a different pattern; then the grey nearest its own lightness, plain before patterned.
        const score = -clash * 1e6 + Math.min(gap, 2) * 1e4 - Math.abs(lightness(NATION_GREYS[g]!) - ownL) * 10 - (p ? 5 : 0);
        if (score > bestScore) (bestScore = score), (best = [g, p]);
      }
    }
    grey[i] = best[0];
    pat[i] = best[1];
  }
  return { colours: grey.map((g, i) => (g < 0 ? rgbHex(greyOf(hexRgb(input.colours[i]!))) : rgbHex(NATION_GREYS[g]!))), patterns: pat };
}

// ---------------------------------------------------------------- lens ramps

/** A safe sequential ramp, low to high: pale orange to dark blue, its lightness falling step by step. */
const SAFE_SEQUENTIAL = ["#fde2b8", "#f2a65a", "#8c9cbc", "#4a6fb0", "#1f3a70"];
/** A safe diverging ramp, bad to good: dark orange through pale to dark blue. */
const SAFE_DIVERGING = ["#b8540f", "#f0a050", "#ece4d0", "#7fa3d6", "#2c5a9e"];
/** Greys light to dark, for No colour; the patterns carry the bands too. */
const GREY_STEPS = [90, 72, 56, 40, 24];

export type RampKind = "sequential" | "diverging";

/**
 * A lens's ramp in a mode (VIEW-047): its normal colours, the safe blue to
 * orange ramp in the same order, or greys from light to dark.
 */
export function lensRamp(v: Vision, normal: readonly Rgb[], kind: RampKind): number[][] {
  if (v.setting === "default") return normal.map((c) => [...c]);
  if (v.setting === "none") {
    // Diverging ramps go dark (bad) to light (good) so the worst band stands out; sequential light (few) to dark (many).
    const steps = kind === "diverging" ? [...GREY_STEPS].reverse() : GREY_STEPS;
    return spread(steps, normal.length).map(greyOfLightness);
  }
  return spread(kind === "diverging" ? SAFE_DIVERGING : SAFE_SEQUENTIAL, normal.length).map(hexRgb);
}

/** Picks n items spread evenly along a list. */
function spread<T>(list: readonly T[], n: number): T[] {
  if (n <= 1) return [list[list.length - 1]!];
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]!);
}

/**
 * A lens's set of named colours in a mode: its own colours, the safe ones
 * given for the weak types (blue for friends and good, orange for foes and
 * bad), or greys from light to dark in the list's order with no colour.
 */
export function lensSet<K extends string>(v: Vision, normal: Record<K, Rgb>, safe: Partial<Record<K, string>>): Record<K, number[]> {
  const keys = Object.keys(normal) as K[];
  if (v.setting === "default") return Object.fromEntries(keys.map((k) => [k, [...normal[k]]])) as Record<K, number[]>;
  if (v.setting === "none") {
    const steps = spread([88, 76, 64, 52, 40, 28], keys.length);
    return Object.fromEntries(keys.map((k, i) => [k, greyOfLightness(steps[i]!)])) as Record<K, number[]>;
  }
  return Object.fromEntries(keys.map((k) => [k, safe[k] ? hexRgb(safe[k]!) : [...normal[k]]])) as Record<K, number[]>;
}

/** Any colour with no colour on: its grey; otherwise as it is. */
export const shown = (v: Vision, c: Rgb): number[] => (v.setting === "none" ? greyOf(c) : [...c]);

// ---------------------------------------------------------------- patterns

/** The shader's pattern codes, in the order lensBandPatterns names them. */
const PATTERN_CODE: Record<string, number> = { hatching: 1, dots: 2, stripes: 3, "hatching ×2": 4, "dots ×2": 5, "stripes ×2": 6 };
export const PATTERN_COUNT = 6;
const BAND_NAMES = lensBandPatterns(PATTERN_COUNT);

/** The pattern a lens band carries (VIEW-048): hatching, dots and stripes, then the same twice as dense. */
export const bandPattern = (band: number): number => (band < 0 ? 0 : PATTERN_CODE[BAND_NAMES[band % PATTERN_COUNT]!] ?? 0);
/** The name of a pattern code, for the key. */
export const patternName = (code: number): string => (code > 0 ? BAND_NAMES[code - 1]! : "");

/**
 * A pattern as CSS for a key's swatch, so the key shows what the map draws:
 * dark marks on a light colour, light marks on a dark one.
 */
export function patternCss(code: number, under: Rgb): string {
  if (!code) return "";
  const ink = lightness(under) > 50 ? "rgb(26 28 44 / 0.75)" : "rgb(245 245 245 / 0.85)";
  const line = (deg: number, gap: number) => `repeating-linear-gradient(${deg}deg, ${ink} 0 1.5px, transparent 1.5px ${gap}px)`;
  const dots = `radial-gradient(circle, ${ink} 1.3px, transparent 1.7px)`;
  const looks: [string, string][] = [
    [line(135, 5), "auto"],
    [dots, "6px 6px"],
    [line(0, 5), "auto"],
    [`${line(45, 5)}, ${line(135, 5)}`, "auto"],
    [dots, "3.5px 3.5px"],
    [`${line(0, 5)}, ${line(90, 5)}`, "auto"],
  ];
  const look = looks[code - 1];
  return look ? `background-image:${look[0]};background-size:${look[1]};` : "";
}
