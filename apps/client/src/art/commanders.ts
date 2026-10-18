import research from "../../../../packages/rules/data/domain/research.json" with { type: "json" };
import { flagColors } from "./flags.ts";
import { PALETTE } from "./palette.ts";
import type { Look } from "./portraits.ts";

/**
 * Commanders on the map (feedback 56, 57): a figure on foot, put together
 * like the portraits. The realm's flag colours dress them, so each country's
 * commanders look like their own; where the realm lies picks the headwear of
 * the early eras; the era of the date picks their kit, from plate and sword
 * through pike, pistol, tricorne and sabre to the steel helmet; and their age
 * greys their hair and beard. Drawn facing east on a 14 × 20 grid of art
 * pixels with an ink outline, in two frames: on the march they step, at
 * rest they shift their weapon.
 */

export interface CommanderLook {
  /** The commander's name: their face, beard and kit variants come from it. */
  name: string;
  /** The realm's id, for its flag colours. */
  nation: string;
  /** The realm's map colour, for a realm with no flag. */
  color: string;
  look: Look;
  /** Era index, 0 = I (1444) to 7 = VIII. */
  era: number;
  /** Age in years. */
  age: number;
}

const W = 14;
const H = 20;

/** The size in CSS pixels of a commander's sprite at a scale: the 14 × 20 figure and its ink outline. */
export function commanderSpriteSize(scale: number): { w: number; h: number } {
  return { w: (W + 2) * scale, h: (H + 2) * scale };
}

/** 32-bit FNV-1a hash of a string. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

// The dated eras only: Ancient and Medieval (RSCH-091) lie before 1444.
const ERA_START = Object.entries(research.era_dates).filter(([era]) => !research.past_eras.includes(era)).map(([, year]) => year);

/** The era a year falls in, 0 = I, from the research rules' era dates (RSCH-032). */
export function eraOfYear(year: number): number {
  let era = 0;
  ERA_START.forEach((start, i) => {
    if (year >= start) era = i;
  });
  return era;
}

/**
 * How old a person looks in a year. People have no birth year in the rules
 * yet, so it is worked out from the name: 22 to 55 at the start in 1444,
 * a year older each year, and no older than 78.
 */
export function apparentAge(name: string, year: number): number {
  return Math.min(78, 22 + (hash(name) % 34) + Math.max(0, year - ERA_START[0]!));
}

/** Hair by age: their own colour, then grey, then white. */
export function hairForAge(own: string, age: number): string {
  return age >= 65 ? "#e4e4e4" : age >= 50 ? "#9a9aa6" : own;
}

function tone(hex: string, f: number): string {
  if (!hex.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const k = (v: number) => Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1));
  return `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`;
}

const SKIN: Record<Look, [string, string]> = {
  europe: ["#f2c09c", "#c98f6c"],
  levant: ["#d9a273", "#a8734e"],
  steppe: ["#e3b489", "#b4835c"],
  eastAsia: ["#efc8a0", "#c49a72"],
  southAsia: ["#b97a4e", "#8a5634"],
  africa: ["#7a4a2e", "#55321e"],
  americas: ["#b8784a", "#8a5532"],
};
const OWN_HAIR = ["#4a2e1e", "#2b2130", "#8b5a3c", "#1f1a24"];

type Grid = (string | null)[][];

/** What a commander wears on the body, by era. */
export type CommanderBody = "plate armour" | "breastplate" | "buff coat" | "coat with facings" | "plain coat";
/** What a commander wears on the head: by where the realm lies in the first eras, then the hats of the age. */
export type CommanderHeadwear =
  | "spiked helmet in a turban"
  | "fur-trimmed cap"
  | "lacquered helmet"
  | "jewelled turban"
  | "wrapped cap"
  | "feather headband"
  | "helm"
  | "morion"
  | "broad hat"
  | "tricorne"
  | "bicorne"
  | "spiked helmet"
  | "kepi"
  | "steel helmet"
  | "beret";
/** What a commander carries in the front hand. */
export type CommanderWeapon = "sword" | "halberd" | "pistol" | "small sword" | "sabre" | "revolver" | "rifle" | "field glasses";

export interface CommanderKit {
  body: CommanderBody;
  headwear: CommanderHeadwear;
  weapon: CommanderWeapon;
}

const BODY: CommanderBody[] = ["plate armour", "breastplate", "buff coat", "coat with facings", "coat with facings", "coat with facings", "plain coat", "plain coat"];
const WEAPON: CommanderWeapon[] = ["sword", "halberd", "pistol", "small sword", "sabre", "revolver", "rifle", "field glasses"];
const REGIONAL_HEADWEAR: Partial<Record<Look, CommanderHeadwear>> = {
  levant: "spiked helmet in a turban",
  steppe: "fur-trimmed cap",
  eastAsia: "lacquered helmet",
  southAsia: "jewelled turban",
  africa: "wrapped cap",
  americas: "feather headband",
};
const HEADWEAR_OF_AGE: CommanderHeadwear[] = ["helm", "morion", "broad hat", "tricorne", "bicorne", "spiked helmet", "steel helmet", "beret"];

/**
 * A commander's kit (VIEW-084): the body, headwear and weapon of the era (0 = I to 7 = VIII); in the
 * first three eras the headwear is by where the realm lies. `variant` turns era VI's spiked helmet
 * into a kepi. The figure is drawn from this.
 */
export function commanderKit(era: number, look: Look, variant = 0): CommanderKit {
  const e = Math.max(0, Math.min(7, era));
  const regional = e <= 2 ? REGIONAL_HEADWEAR[look] : undefined;
  const headwear = regional ?? (e === 5 && variant !== 0 ? "kepi" : HEADWEAR_OF_AGE[e]!);
  return { body: BODY[e]!, headwear, weapon: WEAPON[e]! };
}

/** The commander's figure, as rows of colours (null = clear), without the outline. */
export function commanderGrid(c: CommanderLook, frame: 0 | 1, moving = false): Grid {
  const g: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) g[j]![i] = col;
  };
  const h = hash(c.name);
  const bit = (shift: number, n: number) => (h >>> shift) % n;
  const [coat, facing] = flagColors(c.nation, c.color);
  const coatDark = tone(coat, 0.68);
  const [skin, skinShade] = SKIN[c.look];
  const hair = hairForAge(c.look === "europe" ? OWN_HAIR[bit(3, OWN_HAIR.length)]! : "#1f1a24", c.age);
  const beard = c.age < 28 ? 0 : 1 + bit(7, 3); // 1 moustache, 2 short, 3 full
  const era = Math.max(0, Math.min(7, c.era));
  const steel = PALETTE.steel;
  const leather = "#8b5a3c";
  const boot = "#2b2130";
  const walk = moving && frame === 1;
  const kit = commanderKit(era, c.look, bit(12, 3));

  // Legs: greaves in the first era, breeches and boots, then trousers.
  const legs = era === 0 ? steel : era <= 3 ? coatDark : era <= 5 ? tone(facing, 0.85) : coatDark;
  if (walk) {
    px(4, 14, 2, 4, legs), px(3, 18, 3, 2, boot);
    px(7, 14, 2, 4, legs), px(8, 18, 3, 2, boot);
  } else {
    px(5, 14, 2, 4, legs), px(5, 18, 2, 2, boot);
    px(7, 14, 2, 4, legs), px(7, 18, 3, 2, boot);
  }
  if (era === 0) px(5, 16, 4, 1, PALETTE.mist);

  // Body: plate under a tabard, a breastplate over sleeves, a buff coat, then a coat with facings.
  if (kit.body === "plate armour") {
    px(4, 8, 6, 6, steel);
    px(5, 9, 4, 5, coat);
    px(6, 10, 2, 2, facing);
  } else if (kit.body === "breastplate") {
    px(4, 8, 6, 6, coat);
    px(5, 8, 4, 4, steel), px(5, 8, 4, 1, PALETTE.mist);
    px(4, 12, 6, 1, facing);
  } else if (kit.body === "buff coat") {
    px(4, 8, 6, 6, "#c4a070");
    px(4, 8, 6, 1, PALETTE.paper);
    for (let i = 0; i < 4; i++) px(4 + i + 1, 9 + i, 1, 1, facing); // the sash, shoulder to hip
    px(4, 13, 6, 1, leather);
  } else {
    px(4, 8, 6, 6, coat);
    px(6, 8, 2, 5, kit.body === "plain coat" ? coatDark : facing);
    for (const y of [9, 11]) px(7, y, 1, 1, PALETTE.gold);
    px(4, 12, 6, 1, era >= 6 ? leather : PALETTE.paper);
    if (era === 4 || era === 5) px(3, 8, 2, 1, PALETTE.gold), px(9, 8, 2, 1, PALETTE.gold); // epaulettes
  }
  // The back arm hangs; the front arm holds the kit of the era.
  const sleeve = kit.body === "plate armour" ? steel : kit.body === "buff coat" ? "#c4a070" : coat;
  px(3, 9, 1, 4, sleeve);
  px(3, 13, 1, 1, skinShade);
  px(10, 9, 1, 3, sleeve);
  px(10, 12, 1, 1, skin);
  weapon(px, kit.weapon, frame, coat, facing);

  // Head and neck.
  px(6, 7, 2, 1, skinShade);
  px(5, 3, 4, 4, skin);
  px(8, 4, 1, 1, PALETTE.ink); // eye
  px(5, 6, 4, 1, skinShade);
  px(9, 5, 1, 1, skinShade); // nose
  if (beard >= 1) px(7, 6, 2, 1, hair);
  if (beard >= 2) px(5, 6, 4, 1, hair);
  if (beard === 3) px(6, 7, 3, 1, hair);
  px(5, 3, 1, 3, hair); // hair at the back of the head

  headwear(px, kit.headwear, coat, facing, hair, bit(12, 3));
  return g;
}

type Px = (x: number, y: number, w: number, h: number, c: string) => void;

/** What the front hand carries: sword and shield, a halberd, a pistol, a sword, a sabre, a revolver, a rifle, field glasses. */
function weapon(px: Px, w: CommanderWeapon, frame: 0 | 1, coat: string, facing: string): void {
  const steel = PALETTE.mist;
  const wood = "#5c3a26";
  const lift = frame ? 0 : 1;
  switch (w) {
    case "sword": // A sword held up, and a shield in the flag's colours on the back arm.
      px(11, 5 + lift, 1, 7, steel), px(10, 11 + lift, 3, 1, PALETTE.gold);
      px(1, 9, 3, 4, coat), px(2, 9, 1, 4, facing), px(2, 13, 1, 1, coat);
      return;
    case "halberd":
      px(11, 1, 1, 14, wood), px(12, 1, 1, 3, steel), px(10, 2, 1, 1, steel);
      return;
    case "pistol": // A wheel-lock pistol raised.
      px(11, 9 + lift, 2, 1, PALETTE.slate), px(11, 10 + lift, 1, 2, wood);
      return;
    case "small sword":
    case "sabre":
      px(11, 12, 1, 1, PALETTE.gold);
      px(12, 13, 1, 1, steel), px(13, 14, 1, 2, steel);
      if (w === "sabre") px(12, 16, 1, 1, steel);
      return;
    case "revolver":
      px(11, 11, 2, 1, PALETTE.slate);
      return;
    case "rifle": // A rifle at the shoulder.
      px(11, 2 + lift, 1, 12, wood), px(11, 1 + lift, 1, 2, PALETTE.slate);
      return;
    case "field glasses":
      px(9, 4, 2, 1, PALETTE.ink), px(10, 5, 1, 7, PALETTE.slate);
  }
}

/** Headwear: by where the realm lies in the first eras, then the hats of the age. */
function headwear(px: Px, hw: CommanderHeadwear, coat: string, facing: string, hair: string, v: number): void {
  const k = PALETTE.ink;
  const steel = PALETTE.steel;
  switch (hw) {
    case "spiked helmet in a turban":
      px(4, 2, 6, 2, PALETTE.paper), px(4, 3, 6, 1, PALETTE.mist), px(6, 0, 2, 2, steel), px(7, 2, 1, 1, facing);
      return;
    case "fur-trimmed cap": // With a point.
      px(5, 0, 3, 1, coat), px(4, 1, 5, 2, coat), px(4, 2, 6, 1, "#8b5a3c");
      return;
    case "lacquered helmet": // With a gold crest.
      px(4, 1, 6, 2, "#2b2130"), px(4, 3, 1, 2, "#2b2130"), px(5, 0, 1, 1, PALETTE.gold), px(8, 0, 1, 1, PALETTE.gold);
      return;
    case "jewelled turban": // In the realm's colour.
      px(4, 1, 6, 3, coat), px(4, 2, 6, 1, facing), px(8, 1, 1, 1, PALETTE.gold);
      return;
    case "wrapped cap":
      px(4, 1, 6, 2, v ? PALETTE.paper : coat), px(4, 2, 6, 1, PALETTE.gold);
      return;
    case "feather headband":
      px(4, 2, 6, 1, PALETTE.gold);
      px(4, 0, 1, 2, coat), px(6, 0, 1, 2, facing), px(8, 0, 1, 2, PALETTE.grass);
      return;
    case "helm": // A great helm or a sallet, plumed in the flag's second colour.
      px(4, 1, 6, 3, steel), px(4, 1, 6, 1, PALETTE.mist);
      if (v === 0) px(5, 4, 4, 1, steel), px(8, 2, 1, 1, k);
      px(6, 0, 2, 1, facing);
      return;
    case "morion": // With its crest.
      px(3, 2, 8, 1, steel), px(5, 1, 4, 1, steel), px(6, 0, 2, 1, PALETTE.mist);
      return;
    case "broad hat": // With a feather.
      px(3, 2, 8, 1, "#2b2130"), px(5, 0, 4, 2, "#2b2130"), px(4, 0, 1, 2, facing);
      return;
    case "tricorne": // And a powdered wig.
      px(5, 3, 1, 3, PALETTE.paper);
      px(3, 2, 8, 1, k), px(4, 1, 6, 1, "#2b2130"), px(9, 1, 1, 1, PALETTE.gold);
      return;
    case "bicorne": // With a cockade.
      px(4, 1, 7, 2, "#2b2130"), px(6, 0, 3, 1, "#2b2130"), px(7, 1, 1, 1, facing);
      return;
    case "spiked helmet":
      px(4, 1, 6, 2, k), px(6, 0, 2, 1, PALETTE.gold);
      return;
    case "kepi":
      px(5, 0, 4, 3, coat), px(5, 2, 4, 1, k), px(8, 3, 2, 1, k);
      return;
    case "steel helmet":
      px(4, 1, 6, 2, PALETTE.moss), px(3, 3, 8, 1, PALETTE.moss);
      return;
    case "beret": // In the realm's colour.
      px(4, 1, 6, 2, coat), px(4, 2, 1, 1, hair), px(9, 1, 1, 1, facing);
  }
}

const cache = new Map<string, HTMLCanvasElement>();

/** The commander's figure at a whole-number scale, facing east (1) or west (-1). Cached. */
export function commanderSprite(c: CommanderLook, scale: number, frame: 0 | 1, dir: 1 | -1 = 1, moving = false): HTMLCanvasElement {
  const ageBand = c.age >= 65 ? 3 : c.age >= 50 ? 2 : c.age >= 28 ? 1 : 0;
  const key = `${c.name}|${c.nation}|${c.color}|${c.look}|${c.era}|${ageBand}|${scale}|${frame}|${dir}|${moving}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const g = commanderGrid(c, frame, moving);
  const canvas = document.createElement("canvas");
  const size = commanderSpriteSize(scale);
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d")!;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? g[y]![x] : null);
  for (let y = -1; y <= H; y++)
    for (let x = -1; x <= W; x++) {
      const col = at(x, y) ?? (at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1) ? PALETTE.ink : null);
      if (!col) continue;
      ctx.fillStyle = col;
      const dx = dir === 1 ? x + 1 : W - x;
      ctx.fillRect(dx * scale, (y + 1) * scale, scale, scale);
    }
  cache.set(key, canvas);
  return canvas;
}
