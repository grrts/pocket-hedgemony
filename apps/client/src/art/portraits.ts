import { apparentAge, eraOfYear, hairForAge } from "./commanders.ts";
import { FLAG_H, FLAG_W, flagColors, flagGrid } from "./flags.ts";
import { PALETTE } from "./palette.ts";

/**
 * Pixel portraits for commanders, officials and lords (feedback 40-42, 58,
 * 65), put together from a person's name: face, skin, hair, beard and dress
 * picked by a hash of the name, headwear by where the realm lies. What they
 * do shows in their dress and what they hold: a commander's armour of the
 * era, an official's tools of their post (a judge's red robe, a steward's
 * keys, a tax collector's purse), a lord's fur mantle and coronet. Their
 * realm shows in their colours, taken from its flag, and in the flag itself,
 * dimmed behind them. Their age greys their hair. The same person always
 * gets the same face. Drawn on a 20 × 22 grid of art pixels and scaled by
 * whole steps.
 */

export type Look = "europe" | "levant" | "steppe" | "eastAsia" | "southAsia" | "africa" | "americas";

/** Where each culture of data/names.json dresses, for its portraits. */
const LOOK_OF_CULTURE: Record<string, Look> = {
  turkish: "levant", turkmen: "levant", persian: "levant", arab: "levant", mamluk: "levant", maghrebi: "levant", somali: "levant", swahili: "levant", kashmiri: "levant",
  tatar: "steppe", mongol: "steppe", tibetan: "steppe", jurchen: "steppe",
  chinese: "eastAsia", korean: "eastAsia", japanese: "eastAsia", vietnamese: "eastAsia", cham: "southAsia", tai: "southAsia", khmer: "southAsia", burmese: "southAsia", malay: "southAsia", javanese: "southAsia",
  hindustani: "southAsia", deccani: "southAsia", rajput: "southAsia", telugu_kannada: "southAsia", oriya: "southAsia", bengali: "southAsia", assamese: "southAsia", gond: "southAsia",
  west_african: "africa", wolof: "africa", voltaic: "africa", hausa_kanuri: "africa", edo: "africa", ethiopian: "africa", shona: "africa", kongo: "africa",
  nahua: "americas", purepecha: "americas", zapotec: "americas", maya: "americas", quechua: "americas", muisca: "americas", iroquoian: "americas", southeastern: "americas", pueblo: "americas",
};

export function lookOfCulture(culture: string | undefined): Look {
  return (culture && LOOK_OF_CULTURE[culture]) || "europe";
}

/** Skin tones by look, light to dark; a person gets one of their look's. */
const SKINS: Record<Look, [string, string][]> = {
  europe: [["#f2c09c", "#c98f6c"], ["#e8b48a", "#bd8460"], ["#f6cfb0", "#d29c7a"]],
  levant: [["#d9a273", "#a8734e"], ["#c98f62", "#9a6440"], ["#e6b086", "#b57f58"]],
  steppe: [["#e3b489", "#b4835c"], ["#d6a477", "#a6754d"]],
  eastAsia: [["#efc8a0", "#c49a72"], ["#e6bb90", "#b98e66"]],
  southAsia: [["#b97a4e", "#8a5634"], ["#a86a42", "#7a4a2c"], ["#c88a5c", "#99633e"]],
  africa: [["#7a4a2e", "#55321e"], ["#8a5634", "#603a22"], ["#64391f", "#432614"]],
  americas: [["#b8784a", "#8a5532"], ["#c4865a", "#94603c"]],
};
const HAIRS: Record<Look, string[]> = {
  europe: ["#4a2e1e", "#2b2130", "#8b5a3c", "#c9a060", "#9a9aa6"],
  levant: ["#2b2130", "#3a2418", "#9a9aa6"],
  steppe: ["#2b2130", "#3a2418"],
  eastAsia: ["#1f1a24", "#2b2130"],
  southAsia: ["#1f1a24", "#2b2130", "#9a9aa6"],
  africa: ["#1f1a24", "#2b2130", "#8a8a96"],
  americas: ["#1f1a24", "#2b2130"],
};

/** 32-bit FNV-1a hash of a string. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function tones(hex: string): { base: string; dark: string; light: string } {
  const n = parseInt(hex.slice(1), 16);
  const f = (k: (v: number) => number) => `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`;
  return { base: hex, dark: f((v) => Math.round(v * 0.6)), light: f((v) => Math.round(v + (255 - v) * 0.35)) };
}

const W = 20;
const H = 22;

export interface PortraitSpec {
  /** The person's name: their face is worked out from it. */
  name: string;
  /** The realm's colour, for a realm with no flag. */
  color: string;
  kind: "commander" | "official" | "lord";
  look: Look;
  /** The realm's id, for its flag and colours. */
  nation?: string;
  /** An official's post ("Judge"), for what they wear and hold. */
  post?: string;
}

/** What a portrait's sitter wears below the neck. */
export type PortraitWear = "armour and tabard" | "buff coat" | "uniform" | "fur mantle" | "red robe" | "steel gorget" | "robe of office";
/** What a portrait's sitter holds at the bottom of the frame. */
export type PortraitHeld = "mace" | "sword" | "keys" | "purse" | "ledger" | "gavel" | "book" | "builder's square" | "muster roll" | "spear";
/** What a portrait's sitter wears on the head; "by look" is the headwear of where the realm lies. */
export type PortraitHead = "coronet" | "hat of the age" | "white wig" | "by look";

export interface PortraitDress {
  /** Behind the sitter: the realm's flag, dimmed, or (a realm with no flag) its colour. */
  backdrop: "flag" | "realm colour";
  wears: PortraitWear;
  holds: PortraitHeld | null;
  head: PortraitHead;
}

/** The tool each official's post holds (VIEW-087). */
const HELD_BY_POST: Record<string, PortraitHeld> = {
  Steward: "keys",
  "Tax collector": "purse",
  "Customs officer": "ledger",
  Judge: "gavel",
  Schoolmaster: "book",
  "Master of works": "builder's square",
  "Muster master": "muster roll",
  Warden: "spear",
};

/**
 * Who a portrait shows and what they do (VIEW-087): the realm's flag behind them; a commander in the
 * armour or uniform of the era (0 = I); an official in the dress and with the tool of their post; a
 * lord in a fur mantle and coronet. The portrait is drawn from this.
 */
export function portraitDress(p: Pick<PortraitSpec, "kind" | "look" | "nation" | "post">, era: number): PortraitDress {
  const backdrop = p.nation && flagGrid(p.nation) ? "flag" : "realm colour";
  if (p.kind === "commander")
    return {
      backdrop,
      wears: era <= 1 ? "armour and tabard" : era === 2 ? "buff coat" : "uniform",
      holds: era === 0 ? "mace" : era >= 2 && era <= 5 ? "sword" : null,
      head: era >= 3 ? "hat of the age" : "by look",
    };
  if (p.kind === "lord") return { backdrop, wears: "fur mantle", holds: null, head: "coronet" };
  const post = p.post ?? "";
  return {
    backdrop,
    wears: post === "Judge" ? "red robe" : post === "Warden" || post === "Muster master" ? "steel gorget" : "robe of office",
    holds: HELD_BY_POST[post] ?? null,
    head: post === "Judge" && p.look === "europe" ? "white wig" : "by look",
  };
}

/** The year portraits are drawn in, for the era's armour and the sitter's age; the game sets it as the date moves. */
let portraitYear = 1444;
export function setPortraitYear(year: number): void {
  portraitYear = year;
}

const urlCache = new Map<string, string>();

/** A portrait as a data URL at a whole-number scale. Cached. */
export function portraitUrl(p: PortraitSpec, scale = 3): string {
  const age = apparentAge(p.name, portraitYear);
  const era = eraOfYear(portraitYear);
  const key = `${p.name}|${p.color}|${p.kind}|${p.look}|${p.nation}|${p.post}|${era}|${ageBand(age)}|${scale}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, p, scale, age, era);
  const url = canvas.toDataURL();
  urlCache.set(key, url);
  return url;
}

/** `<img>` markup for a portrait. */
export function portrait(p: PortraitSpec, scale = 3, cls = "portrait face"): string {
  return `<img class="${cls}" src="${portraitUrl(p, scale)}" alt="" width="${W * scale}" height="${H * scale}">`;
}

const ageBand = (age: number) => (age >= 65 ? 3 : age >= 50 ? 2 : age >= 28 ? 1 : 0);

function draw(ctx: CanvasRenderingContext2D, p: PortraitSpec, s: number, age: number, era: number): void {
  const h = hash(p.name);
  const bits = (shift: number, n: number) => (h >>> shift) % n;
  const px = (x: number, y: number, w: number, hh: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * s, y * s, w * s, hh * s);
  };
  const [main, second] = p.nation ? flagColors(p.nation, p.color) : [p.color, PALETTE.paper];
  const realm = tones(main);
  const trim = tones(second);
  const [skin, skinShade] = SKINS[p.look][bits(0, SKINS[p.look].length)]!;
  const hairs = HAIRS[p.look];
  const hair = hairForAge(hairs[bits(3, hairs.length)]!, age);
  const beard = age < 28 ? 0 : bits(7, 4); // 0 none, 1 moustache, 2 short, 3 full
  const hairStyle = bits(10, 3); // 0 short, 1 long, 2 receding
  const face = bits(13, 2); // 0 narrow, 1 broad
  const brow = bits(15, 2);
  const dressed = portraitDress(p, era);

  // Backdrop: the realm's flag, dimmed, or its colour with a lighter halo behind the head.
  const flag = dressed.backdrop === "flag" && p.nation ? flagGrid(p.nation) : null;
  if (flag)
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) px(x, y, 1, 1, dim(flag[Math.floor(((y - 1) * FLAG_H) / (H - 2))]![Math.floor(((x - 1) * FLAG_W) / (W - 2))]!));
  else {
    px(0, 0, W, H, realm.dark);
    px(1, 1, W - 2, H - 2, realm.base);
    px(4, 2, 12, 12, realm.light);
    px(3, 4, 14, 8, realm.light);
  }
  // Ink frame.
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, W * s, s);
  ctx.fillRect(0, (H - 1) * s, W * s, s);
  ctx.fillRect(0, 0, s, H * s);
  ctx.fillRect((W - 1) * s, 0, s, H * s);

  // Shoulders and dress, by what they do.
  dress(px, dressed.wears, p.look, era, realm, trim);
  // Neck.
  px(8, 15, 4, 2, skinShade);

  // Head: an oval, broad or narrow.
  const hx = face ? 5 : 6;
  const hw = face ? 10 : 8;
  px(hx - 1, 5, hw + 2, 11, PALETTE.ink);
  px(hx, 4, hw, 1, PALETTE.ink);
  px(hx, 5, hw, 10, skin);
  px(hx + 1, 15, hw - 2, 1, PALETTE.ink);
  px(hx, 14, hw, 1, skinShade);
  px(hx + hw - 1, 6, 1, 8, skinShade);
  // Ears.
  px(hx - 1, 9, 1, 2, skinShade);
  px(hx + hw, 9, 1, 2, skinShade);

  // Eyes, brows, nose and mouth.
  const ey = 9;
  px(hx + 2, ey, 1, 1, PALETTE.ink);
  px(hx + hw - 3, ey, 1, 1, PALETTE.ink);
  px(hx + 1, ey - 1 - brow, 2, 1, hair);
  px(hx + hw - 3, ey - 1 - brow, 2, 1, hair);
  px(hx + (hw >> 1) - 1, ey + 1, 1, 2, skinShade);
  px(hx + (hw >> 1) - 1, ey + 3, 2, 1, "#8a4a3c");

  // Lines with age.
  if (age >= 50) px(hx + 1, ey + 2, 1, 1, skinShade), px(hx + hw - 2, ey + 2, 1, 1, skinShade);
  if (age >= 65) px(hx + 2, ey - 3, hw - 4, 1, skinShade);

  // Hair under any headwear.
  if (hairStyle === 1) {
    px(hx - 1, 6, 1, 7, hair);
    px(hx + hw, 6, 1, 7, hair);
  }
  if (hairStyle !== 2) px(hx, 5, hw, 2, hair);
  else px(hx, 5, 2, 2, hair), px(hx + hw - 2, 5, 2, 2, hair);

  // Beard.
  if (beard >= 1) px(hx + 2, ey + 3, hw - 4, 1, hair);
  if (beard >= 2) px(hx + 1, ey + 4, hw - 2, 2, hair), px(hx + (hw >> 1) - 1, ey + 3, 2, 1, "#8a4a3c");
  if (beard === 3) px(hx, ey + 2, 1, 4, hair), px(hx + hw - 1, ey + 2, 1, 4, hair), px(hx + 2, ey + 6, hw - 4, 1, hair);

  headwear(px, dressed.head, p, hx, hw, realm, bits(18, 3), era, trim);
  if (dressed.holds) held(px, dressed.holds);
}

/** A flag colour dimmed for the backdrop, so the face stands out. */
function dim(c: string): string {
  const [r, g, b] = c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : [128, 128, 128];
  const k = (v: number) => Math.round(v * 0.55 + 26 * 0.45);
  return `rgb(${k(r!)},${k(g!)},${k(b!)})`;
}

type Tones = { base: string; dark: string; light: string };

/** What they wear below the neck: armour of the era, the robe of an official's post, a lord's fur mantle. */
function dress(px: Px, wears: PortraitWear, look: Look, era: number, realm: Tones, trim: Tones): void {
  px(2, 16, 16, 5, PALETTE.ink);
  switch (wears) {
    case "armour and tabard": // Steel shoulders, a tabard in the flag's colours.
      px(3, 17, 14, 4, PALETTE.steel);
      px(3, 17, 14, 1, PALETTE.mist);
      px(7, 17, 6, 4, realm.base);
      px(7, 17, 6, 1, realm.light);
      px(9, 18, 2, 2, trim.base);
      return;
    case "buff coat": // With a sash of the flag's second colour.
      px(3, 17, 14, 4, "#c4a070");
      px(3, 17, 14, 1, "#e0c090");
      for (let i = 0; i < 4; i++) px(6 + 2 * i, 17 + i, 2, 1, trim.base);
      return;
    case "uniform": // A uniform coat with facings and epaulettes.
      px(3, 17, 14, 4, realm.base);
      px(3, 17, 14, 1, realm.light);
      px(8, 17, 4, 4, trim.base);
      px(9, 18, 1, 1, PALETTE.gold), px(9, 20, 1, 1, PALETTE.gold);
      if (era < 6) px(3, 17, 3, 1, PALETTE.gold), px(14, 17, 3, 1, PALETTE.gold);
      return;
    case "fur mantle": // A mantle in the realm's colour with an ermine collar, and a chain.
      px(3, 17, 14, 4, realm.base);
      px(3, 17, 14, 1, realm.light);
      px(4, 17, 12, 2, PALETTE.paper);
      for (const x of [5, 8, 11, 14]) px(x, 17 + (x % 2), 1, 1, PALETTE.ink);
      for (const x of [6, 9, 12]) px(x, 19, 1, 1, PALETTE.gold);
      px(9, 20, 2, 1, trim.base === PALETTE.paper ? PALETTE.gold : trim.base);
      return;
    case "red robe": // With a white collar.
      px(3, 17, 14, 4, "#b13e53");
      px(3, 17, 14, 1, "#d06070");
      px(7, 17, 6, 2, PALETTE.paper);
      return;
    case "steel gorget": // Over a coat in the flag's colours.
      px(3, 17, 14, 4, realm.dark);
      px(3, 17, 14, 1, realm.light);
      px(7, 17, 6, 2, PALETTE.steel);
      px(7, 17, 6, 1, PALETTE.mist);
      px(9, 19, 2, 1, trim.base);
      return;
    case "robe of office": {
      // A robe in the realm's colour, a collar and a chain of office.
      const robe = look === "africa" ? PALETTE.paper : realm.dark;
      px(3, 17, 14, 4, robe);
      px(3, 17, 14, 1, realm.light);
      px(7, 17, 6, 1, look === "europe" ? "#efe2bf" : trim.base);
      for (const x of [6, 8, 11, 13]) px(x, 18, 1, 1, PALETTE.gold);
      px(9, 19, 2, 1, PALETTE.gold);
    }
  }
}

/** What they hold at the bottom of the frame: the tools of an official's post, a commander's weapon of the era. */
function held(px: Px, what: PortraitHeld): void {
  const k = PALETTE.ink;
  switch (what) {
    case "sword": // A sword hilt at the shoulder.
      px(15, 13, 1, 5, PALETTE.mist), px(14, 17, 3, 1, PALETTE.gold);
      return;
    case "mace":
      px(15, 15, 1, 5, "#5c3a26"), px(14, 13, 3, 2, PALETTE.steel), px(14, 13, 3, 1, PALETTE.mist);
      return;
    case "keys": // Keys on a ring.
      px(13, 17, 3, 1, PALETTE.gold), px(14, 18, 1, 2, PALETTE.gold), px(15, 19, 1, 1, PALETTE.gold);
      return;
    case "purse": // A purse of coin.
      px(13, 17, 4, 3, k), px(14, 17, 2, 3, "#8b5a3c"), px(14, 16, 2, 1, PALETTE.gold);
      return;
    case "ledger":
      px(13, 16, 4, 4, k), px(14, 17, 2, 2, PALETTE.paper), px(14, 18, 2, 1, PALETTE.steel);
      return;
    case "gavel":
      px(14, 16, 3, 2, "#5c3a26"), px(15, 18, 1, 2, "#5c3a26");
      return;
    case "book":
      px(13, 17, 4, 3, k), px(14, 17, 2, 2, "#b13e53"), px(14, 19, 2, 1, PALETTE.paper);
      return;
    case "builder's square":
      px(13, 16, 1, 4, PALETTE.mist), px(13, 19, 4, 1, PALETTE.mist);
      return;
    case "muster roll":
      px(13, 16, 3, 4, PALETTE.paper), px(13, 16, 3, 1, "#c9b48a"), px(14, 17, 1, 2, PALETTE.steel);
      return;
    case "spear":
      px(15, 9, 1, 11, "#5c3a26"), px(15, 7, 1, 2, PALETTE.mist);
  }
}

type Px = (x: number, y: number, w: number, h: number, c: string) => void;

/** What the person wears on the head: by kind and look, one of a few per look. */
function headwear(px: Px, head: PortraitHead, p: PortraitSpec, hx: number, hw: number, realm: Tones, v: number, era: number, trim: Tones): void {
  const k = PALETTE.ink;
  if (head === "coronet") {
    // A coronet: a gold band with points, a jewel in the flag's second colour.
    px(hx - 1, 3, hw + 2, 3, k);
    px(hx, 4, hw, 1, PALETTE.gold);
    for (let i = 0; i < hw; i += 2) px(hx + i, 2, 1, 2, PALETTE.gold), px(hx + i, 1, 1, 1, k);
    px(hx + (hw >> 1) - 1, 4, 2, 1, trim.base);
    return;
  }
  if (head === "hat of the age") {
    // The hats of the age: tricorne, bicorne, spiked helmet, steel helmet, beret.
    px(hx - 2, 3, hw + 4, 3, k);
    if (era === 3) px(hx - 1, 4, hw + 2, 1, "#2b2130"), px(hx + 1, 2, hw - 2, 2, "#2b2130"), px(hx + hw, 4, 1, 1, PALETTE.gold);
    else if (era === 4) px(hx - 1, 3, hw + 2, 2, "#2b2130"), px(hx + 2, 1, hw - 4, 2, "#2b2130"), px(hx + (hw >> 1), 3, 1, 1, trim.base);
    else if (era === 5) px(hx, 3, hw, 2, k), px(hx + (hw >> 1) - 1, 0, 2, 3, PALETTE.gold);
    else if (era === 6) px(hx - 1, 3, hw + 2, 2, PALETTE.moss), px(hx + 1, 2, hw - 2, 1, PALETTE.moss);
    else px(hx - 1, 3, hw + 2, 2, realm.base), px(hx, 2, hw - 1, 1, realm.base), px(hx + hw - 2, 4, 1, 1, trim.base);
    return;
  }
  if (head === "white wig") {
    px(hx - 2, 4, 2, 8, PALETTE.paper), px(hx + hw, 4, 2, 8, PALETTE.paper), px(hx - 1, 3, hw + 2, 2, PALETTE.paper);
    return;
  }
  if (p.kind === "commander") {
    switch (p.look) {
      case "levant":
        // A spiked helmet wrapped in a turban.
        px(hx - 1, 3, hw + 2, 4, k);
        px(hx, 4, hw, 2, PALETTE.paper);
        px(hx, 5, hw, 1, PALETTE.mist);
        px(hx + (hw >> 1) - 1, 1, 2, 3, PALETTE.steel);
        px(hx + (hw >> 1) - 1, 0, 2, 1, k);
        return;
      case "steppe":
        // A fur-trimmed cap with a point.
        px(hx - 1, 3, hw + 2, 4, k);
        px(hx, 2, hw, 2, realm.base);
        px(hx + 2, 1, hw - 4, 1, realm.base);
        px(hx - 1, 5, hw + 2, 2, "#8b5a3c");
        px(hx - 1, 5, hw + 2, 1, "#b07a4e");
        return;
      case "eastAsia":
        // Lacquered helmet with a crest.
        px(hx - 1, 3, hw + 2, 4, k);
        px(hx, 4, hw, 2, "#2b2130");
        px(hx - 1, 6, hw + 2, 1, "#5d275d");
        px(hx + 1, 1, 1, 3, PALETTE.gold);
        px(hx + hw - 2, 1, 1, 3, PALETTE.gold);
        return;
      case "americas":
        // A headdress of feathers in the realm's colours.
        px(hx - 1, 4, hw + 2, 3, k);
        px(hx, 5, hw, 1, PALETTE.gold);
        for (let i = 0; i < hw; i += 2) px(hx + i, 1 + (i % 4 === 0 ? 0 : 1), 1, 4, i % 4 === 0 ? realm.base : PALETTE.grass);
        return;
      case "africa":
      case "southAsia":
        if (v === 0) {
          px(hx - 1, 3, hw + 2, 4, k);
          px(hx, 4, hw, 2, realm.light);
          px(hx, 5, hw, 1, realm.base);
          px(hx + hw - 2, 2, 2, 2, PALETTE.gold);
          return;
        }
        break;
      default:
        break;
    }
    // A steel helm with a nasal, or an open sallet with a plume.
    px(hx - 1, 2, hw + 2, 5, k);
    px(hx, 3, hw, 3, PALETTE.steel);
    px(hx, 3, hw, 1, PALETTE.mist);
    if (v === 1) px(hx + (hw >> 1) - 1, 6, 1, 3, PALETTE.steel);
    else {
      px(hx + hw - 2, 0, 2, 3, realm.base);
      px(hx + hw - 2, 0, 1, 1, realm.light);
    }
    return;
  }
  // Officials.
  switch (p.look) {
    case "levant":
    case "southAsia":
      // A wound turban, white or in the realm's colour.
      px(hx - 2, 2, hw + 4, 5, k);
      px(hx - 1, 3, hw + 2, 3, v === 0 ? realm.light : PALETTE.paper);
      px(hx - 1, 4, hw + 2, 1, v === 0 ? realm.base : PALETTE.mist);
      px(hx + (hw >> 1), 3, 1, 1, PALETTE.gold);
      return;
    case "eastAsia":
      // A scholar's black gauze cap with wings.
      px(hx - 1, 2, hw + 2, 4, k);
      px(hx, 3, hw, 2, "#2b2130");
      px(hx - 3, 4, 2, 1, k);
      px(hx + hw + 1, 4, 2, 1, k);
      return;
    case "steppe":
      px(hx - 1, 3, hw + 2, 4, k);
      px(hx, 2, hw, 2, realm.dark);
      px(hx - 1, 5, hw + 2, 2, "#8b5a3c");
      return;
    case "africa":
      if (v !== 2) {
        px(hx - 1, 3, hw + 2, 3, k);
        px(hx, 3, hw, 2, v === 0 ? realm.base : PALETTE.paper);
        px(hx, 4, hw, 1, PALETTE.gold);
      }
      return;
    case "americas":
      px(hx - 1, 4, hw + 2, 2, k);
      px(hx, 4, hw, 1, realm.base);
      px(hx + hw - 2, 1, 1, 4, PALETTE.grass);
      return;
    default:
      // A chaperon or a flat cap, in the realm's colour; some go bare-headed.
      if (v === 2) return;
      px(hx - 1, 2, hw + 2, 4, k);
      px(hx, 3, hw, 2, v === 0 ? realm.dark : "#2b2130");
      px(hx, 3, hw, 1, v === 0 ? realm.base : PALETTE.slate);
      if (v === 0) px(hx + hw, 4, 2, 4, realm.dark), px(hx + hw + 1, 4, 1, 4, k);
  }
}
