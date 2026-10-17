import { PALETTE } from "./palette.ts";

/**
 * Pixel portraits for commanders and officials (feedback 40-42), put together
 * from a person's name: face, skin, hair, beard and dress picked by a hash of
 * the name, headwear and clothes by where the realm lies, and the realm's
 * colour in the clothes and the backdrop. The same person always gets the same
 * face. Drawn on a 20 × 22 grid of art pixels and scaled by whole steps.
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
  /** The realm's colour. */
  color: string;
  kind: "commander" | "official" | "lord";
  look: Look;
}

const urlCache = new Map<string, string>();

/** A portrait as a data URL at a whole-number scale. Cached. */
export function portraitUrl(p: PortraitSpec, scale = 3): string {
  const key = `${p.name}|${p.color}|${p.kind}|${p.look}|${scale}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, p, scale);
  const url = canvas.toDataURL();
  urlCache.set(key, url);
  return url;
}

/** `<img>` markup for a portrait. */
export function portrait(p: PortraitSpec, scale = 3, cls = "portrait face"): string {
  return `<img class="${cls}" src="${portraitUrl(p, scale)}" alt="" width="${W * scale}" height="${H * scale}">`;
}

function draw(ctx: CanvasRenderingContext2D, p: PortraitSpec, s: number): void {
  const h = hash(p.name);
  const bits = (shift: number, n: number) => (h >>> shift) % n;
  const px = (x: number, y: number, w: number, hh: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * s, y * s, w * s, hh * s);
  };
  const realm = tones(p.color);
  const [skin, skinShade] = SKINS[p.look][bits(0, SKINS[p.look].length)]!;
  const hairs = HAIRS[p.look];
  const hair = hairs[bits(3, hairs.length)]!;
  const beard = bits(7, 4); // 0 none, 1 moustache, 2 short, 3 full
  const hairStyle = bits(10, 3); // 0 short, 1 long, 2 receding
  const face = bits(13, 2); // 0 narrow, 1 broad
  const brow = bits(15, 2);

  // Backdrop: the realm's colour, darker below, with a lighter halo behind the head.
  px(0, 0, W, H, realm.dark);
  px(1, 1, W - 2, H - 2, realm.base);
  px(4, 2, 12, 12, realm.light);
  px(3, 4, 14, 8, realm.light);
  // Ink frame.
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, W * s, s);
  ctx.fillRect(0, (H - 1) * s, W * s, s);
  ctx.fillRect(0, 0, s, H * s);
  ctx.fillRect((W - 1) * s, 0, s, H * s);

  // Shoulders and dress.
  if (p.kind === "commander") {
    // Steel shoulders, a tabard in the realm's colour.
    px(2, 16, 16, 5, PALETTE.ink);
    px(3, 17, 14, 4, PALETTE.steel);
    px(3, 17, 14, 1, PALETTE.mist);
    px(7, 17, 6, 4, realm.base);
    px(7, 17, 6, 1, realm.light);
    px(9, 18, 2, 2, PALETTE.gold);
  } else if (p.kind === "lord") {
    // A fur-trimmed mantle over a coat in the realm's colour, and a gold chain.
    px(2, 16, 16, 5, PALETTE.ink);
    px(3, 17, 14, 4, realm.base);
    px(3, 17, 14, 1, realm.light);
    px(3, 17, 3, 4, "#efe2bf");
    px(14, 17, 3, 4, "#efe2bf");
    for (const x of [4, 15]) px(x, 18, 1, 1, PALETTE.ink), px(x, 20, 1, 1, PALETTE.ink);
    px(8, 18, 4, 1, PALETTE.gold);
    px(9, 19, 2, 2, PALETTE.gold);
  } else {
    const robe = p.look === "europe" ? realm.dark : p.look === "africa" ? PALETTE.paper : realm.dark;
    px(2, 16, 16, 5, PALETTE.ink);
    px(3, 17, 14, 4, robe);
    px(3, 17, 14, 1, realm.light);
    // A collar and a chain of office.
    px(7, 17, 6, 1, p.look === "europe" ? "#efe2bf" : realm.base);
    for (const x of [6, 8, 11, 13]) px(x, 18, 1, 1, PALETTE.gold);
    px(9, 19, 2, 1, PALETTE.gold);
  }
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

  headwear(px, p, hx, hw, realm, bits(18, 3));
}

type Px = (x: number, y: number, w: number, h: number, c: string) => void;

/** What the person wears on the head: by kind and look, one of a few per look. */
function headwear(px: Px, p: PortraitSpec, hx: number, hw: number, realm: { base: string; dark: string; light: string }, v: number): void {
  const k = PALETTE.ink;
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
  if (p.kind === "lord") {
    // A noble's coronet over a cap of the realm's colour, or a gold circlet on bare hair.
    if (v !== 2) {
      px(hx - 1, 2, hw + 2, 4, k);
      px(hx, 3, hw, 2, realm.dark);
    }
    px(hx - 1, 4, hw + 2, 2, k);
    px(hx, 4, hw, 1, PALETTE.gold);
    for (let i = 0; i < hw; i += 3) px(hx + i, 2 + (v === 2 ? 1 : 0), 1, 2, PALETTE.gold);
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
