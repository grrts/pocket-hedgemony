/**
 * Interface art: parchment, carved wood frames, brass corners, cloth ribbons,
 * wax-seal buttons and pixel icons. All of it is painted here at startup into
 * small images and handed to the stylesheet as CSS variables, so the look is
 * editable as code and costs no downloads.
 *
 * Frames are used with CSS border-image: each image is a tiny 9-slice whose
 * edges repeat, scaled up by whole steps so pixels stay square.
 */

type Px = (x: number, y: number, c: string) => void;

function paint(w: number, h: number, draw: (px: Px, rect: (x: number, y: number, w: number, h: number, c: string) => void) => void): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // A canvas kept off the GPU: reading it back then never waits on the map's drawing.
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  // The colour "clear" punches a transparent hole.
  const rect = (x: number, y: number, rw: number, rh: number, c: string) => {
    if (c === "clear") return ctx.clearRect(x, y, rw, rh);
    ctx.fillStyle = c;
    ctx.fillRect(x, y, rw, rh);
  };
  draw((x, y, c) => rect(x, y, 1, 1, c), rect);
  return canvas.toDataURL();
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const UI_COLORS = {
  outline: "#24150c",
  woodDark: "#4a2c18",
  wood: "#7a4c2a",
  woodLight: "#a26a3c",
  woodGrain: "#5e3a20",
  brassDark: "#8a6424",
  brass: "#d0a248",
  brassLight: "#f6dc8a",
  parchment: "#efdcae",
  parchmentLight: "#f8ecc8",
  parchmentDark: "#d8be86",
  inkBrown: "#3a2414",
  cloth: "#a8323e",
  clothLight: "#d4545c",
  clothDark: "#6c1c2a",
  iron: "#4a4f5c",
} as const;
const C = UI_COLORS;

/** 24×24 carved wood frame with brass corner plates; slice 8. */
function woodFrame(): string {
  return paint(24, 24, (px, rect) => {
    const r = rng(7);
    rect(0, 0, 24, 24, C.outline);
    rect(1, 1, 22, 22, C.wood);
    // Grain: broken lines along each side.
    for (let i = 1; i < 23; i++) {
      for (const d of [2, 5]) {
        if (r() < 0.7) px(i, d, C.woodGrain);
        if (r() < 0.7) px(i, 23 - d, C.woodGrain);
        if (r() < 0.7) px(d, i, C.woodGrain);
        if (r() < 0.7) px(23 - d, i, C.woodGrain);
      }
    }
    // Bevel: light on the outer top-left, dark on the bottom-right.
    rect(1, 1, 22, 1, C.woodLight);
    rect(1, 1, 1, 22, C.woodLight);
    rect(1, 22, 22, 1, C.woodDark);
    rect(22, 1, 1, 22, C.woodDark);
    // Inner lip around the opening, on the last row of the 8-pixel slice so
    // the frame meets the parchment with no see-through seam.
    rect(7, 7, 10, 1, C.outline);
    rect(7, 7, 1, 10, C.outline);
    rect(6, 6, 12, 1, C.woodDark);
    rect(6, 6, 1, 12, C.woodDark);
    rect(7, 16, 10, 1, C.woodLight);
    rect(16, 7, 1, 10, C.woodLight);
    rect(8, 8, 8, 8, "clear");
    // Brass corners with a rivet.
    for (const [cx, cy] of [
      [0, 0],
      [17, 0],
      [0, 17],
      [17, 17],
    ] as const) {
      rect(cx, cy, 7, 7, C.outline);
      rect(cx + 1, cy + 1, 5, 5, C.brass);
      rect(cx + 1, cy + 1, 5, 1, C.brassLight);
      rect(cx + 1, cy + 1, 1, 5, C.brassLight);
      rect(cx + 1, cy + 5, 5, 1, C.brassDark);
      rect(cx + 5, cy + 1, 1, 5, C.brassDark);
      px(cx + 3, cy + 3, C.outline);
      px(cx + 2, cy + 2, C.brassLight);
    }
  });
}

/** 32×32 parchment, tiled as a background. */
function parchment(seed = 3, base: string = C.parchment): string {
  return paint(32, 32, (px, rect) => {
    const r = rng(seed);
    rect(0, 0, 32, 32, base);
    for (let i = 0; i < 90; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? C.parchmentDark : C.parchmentLight);
    // A few fibres.
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * 28);
      const y = Math.floor(r() * 32);
      rect(x, y, 2 + Math.floor(r() * 3), 1, "#e2ca94");
    }
  });
}

/** 32×32 dark planks, tiled behind the top bar. */
function planks(): string {
  return paint(32, 32, (px, rect) => {
    const r = rng(11);
    rect(0, 0, 32, 32, C.wood);
    for (let y = 0; y < 32; y += 8) {
      rect(0, y, 32, 1, C.woodDark);
      rect(0, y + 1, 32, 1, C.woodLight);
      for (let x = 0; x < 32; x++) if (r() < 0.35) px(x, y + 3 + Math.floor(r() * 4), C.woodGrain);
      const joint = (y * 7 + 5) % 32;
      rect(joint, y, 1, 8, C.woodDark);
      px(joint + 2, y + 4, C.outline);
    }
  });
}

/** 12×12 button plates; slice 4, filled. */
function plate(body: string, light: string, shadow: string, rim?: string, pressed = false): string {
  return paint(12, 12, (px, rect) => {
    rect(1, 0, 10, 12, C.outline);
    rect(0, 1, 12, 10, C.outline);
    rect(1, 1, 10, 10, body);
    const top = pressed ? shadow : light;
    const bottom = pressed ? light : shadow;
    rect(1, 1, 10, 1, top);
    rect(1, 1, 1, 9, top);
    rect(1, 9, 10, 2, bottom);
    rect(10, 2, 1, 9, bottom);
    if (rim) {
      rect(2, 2, 8, 1, rim);
      rect(2, 2, 1, 7, rim);
      rect(9, 2, 1, 7, rim);
      rect(2, 8, 8, 1, rim);
      rect(3, 3, 6, 5, body);
    }
    px(1, 1, C.outline);
  });
}

/** 24×12 cloth ribbon with forked ends; slice 3 8, filled. */
function ribbon(): string {
  return paint(24, 12, (px, rect) => {
    rect(0, 2, 24, 8, C.outline);
    rect(1, 3, 22, 6, C.cloth);
    rect(1, 3, 22, 1, C.clothLight);
    rect(1, 8, 22, 1, C.clothDark);
    // Forks.
    for (const x of [0, 1, 22, 23]) rect(x, 5, 1, 2, "clear");
    px(1, 5, C.outline);
    px(1, 6, C.outline);
    px(22, 5, C.outline);
    px(22, 6, C.outline);
    // Gold stitching.
    for (let x = 3; x < 21; x += 2) {
      px(x, 4, C.brass);
      px(x, 7, C.brassDark);
    }
  });
}

// ---- icons ----
const ICON_KEY: Record<string, string> = {
  k: C.outline,
  y: C.brassLight,
  g: C.brass,
  d: C.brassDark,
  s: "#c6ccd8",
  i: "#7c8494",
  w: "#f8ecc8",
  p: C.parchment,
  q: C.parchmentDark,
  b: C.wood,
  B: C.woodDark,
  r: C.cloth,
  R: C.clothDark,
  l: "#7ec8e3",
  e: "#4f8a3a",
};

export const ICONS = {
  coin: [
    "...kkkk...",
    "..kyyyyk..",
    ".kyggggdk.",
    "kygykkgdgk",
    "kygkgggdgk",
    "kyggkkgdgk",
    "kygggkgdgk",
    "kygkkggddk",
    ".kgggdddk.",
    "..kddddk..",
    "...kkkk...",
  ],
  swords: [
    "k........k",
    "ks......sk",
    ".ksi..isk.",
    "..ksiisk..",
    "...kssk...",
    "...ksik...",
    "..kskksk..",
    ".kbk..kbk.",
    "kgk....kgk",
    "kk......kk",
  ],
  hourglass: [
    "kkkkkkkk",
    "kbbbbbbk",
    ".kyyyyk.",
    ".kpyypk.",
    "..kyyk..",
    "...kk...",
    "..kpyk..",
    ".kpyypk.",
    ".kyyyyk.",
    "kbbbbbbk",
    "kkkkkkkk",
  ],
  map: [
    ".kkk.kkk.kk",
    "kpppkqqqkpk",
    "kpepkqlqkpk",
    "kpeekqllkpk",
    "kppekqqlkek",
    "kpppkqqqkek",
    "kplpkqeqkpk",
    "kpllkqeekpk",
    "kpppkqqqkpk",
    ".kkk.kkk.kk",
  ],
  castle: [
    "k.k.k..k.k.k",
    "kwkwk..kwkwk",
    "kwwwkkkkwwwk",
    "kwwwwwwwwwwk",
    "kwkwwwwwwkwk",
    "kwwwwkkwwwwk",
    "kwwwkBBkwwwk",
    "kwwwkBBkwwwk",
    "kkkkkkkkkkkk",
  ],
  collapse: ["kk....kk", "kwk..kwk", ".kwkkwk.", "..kwwk..", "...kk..."],
  close: ["kk....kk", "kwk..kwk", ".kwkkwk.", "..kwwk..", "..kwwk..", ".kwkkwk.", "kwk..kwk", "kk....kk"],
  scroll: [
    ".kkkkkkkk.",
    "kqpppppppk",
    "kqkkkkkkqk",
    ".kpppppppk",
    ".kpkkkkppk",
    ".kpppppppk",
    ".kpkkkkkpk",
    ".kpppppppk",
    "kqkkkkkkqk",
    "kqpppppppk",
    ".kkkkkkkk.",
  ],
  crown: [
    "k...k...k",
    "kyk.kyk.ky",
    "kyykyyykyk",
    "kygyygyygk",
    "kgggrgggdk",
    "kgrgggrgdk",
    "kddddddddk",
    "kkkkkkkkkk",
  ],
  speaker: ["....kk.....", "...kwk...k.", "kkkwwk.k..k", "kwwwwk..k.k", "kwwwwk..k.k", "kwwwwk..k.k", "kkkwwk.k..k", "...kwk...k.", "....kk....."],
  mute: ["....kk.....", "...kwk.....", "kkkwwkr...r", "kwwwwk.r.r.", "kwwwwk..r..", "kwwwwk.r.r.", "kkkwwkr...r", "...kwk.....", "....kk....."],
  anchor: [
    "...kkk...",
    "...kik...",
    "...kkk...",
    ".kkkikkk.",
    "...kik...",
    "...kik...",
    "k..kik..k",
    "kk.kik.kk",
    ".kkkikkk.",
    "..kkkkk..",
  ],
} as const;

export type IconName = keyof typeof ICONS;

const iconCache = new Map<string, string>();

/** An icon as a data URL, at a whole-number scale. */
export function iconUrl(name: IconName, scale = 2): string {
  const key = `${name}|${scale}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const url = paint(w * scale, rows.length * scale, (_, rect) => {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]!;
        if (ch !== ".") rect(x * scale, y * scale, scale, scale, ICON_KEY[ch]!);
      }
    });
  });
  iconCache.set(key, url);
  return url;
}

/** `<img>` markup for an icon. */
export function icon(name: IconName, scale = 2, label = ""): string {
  return `<img class="px-icon" src="${iconUrl(name, scale)}" alt="${label}" ${label ? "" : 'aria-hidden="true"'}>`;
}

/**
 * A realm's flag, as a data URL: a field of cloth in its colour with no pole
 * (feedback 37), rippling in the wind with its folds shaded light and dark,
 * inside an ink rim. Pixel rows are drawn at a whole-number scale.
 */
export function flagUrl(color: string, scale = 2): string {
  const key = `flag|${color}|${scale}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const rows = [
    ".kkkk....kkk.",
    "kLLNNkkkkLNNk",
    "kLNNNNNNNNNNk",
    "kNNNNnNNNNNnk",
    "kNNNnnNNNNnnk",
    "kNNnnkkkkNnnk",
    "knnk....knnk.",
    ".kk......kk..",
  ];
  const n = parseInt(color.slice(1), 16);
  const tone = (f: (v: number) => number) => `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  const dark = tone((v) => Math.round(v * 0.68));
  const light = tone((v) => Math.round(v + (255 - v) * 0.3));
  const url = paint(rows[0]!.length * scale, rows.length * scale, (_, rect) => {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]!;
        if (ch === ".") continue;
        rect(x * scale, y * scale, scale, scale, ch === "N" ? color : ch === "n" ? dark : ch === "L" ? light : ICON_KEY[ch]!);
      }
    });
  });
  iconCache.set(key, url);
  return url;
}

/** Paints the interface art and publishes it to the stylesheet as CSS variables. */
export function installUiArt(root: HTMLElement = document.documentElement): void {
  const set = (name: string, url: string) => root.style.setProperty(name, `url("${url}")`);
  set("--ui-wood-frame", woodFrame());
  set("--ui-parchment", parchment());
  set("--ui-parchment-dark", parchment(5, C.parchmentDark));
  set("--ui-planks", planks());
  set("--ui-ribbon", ribbon());
  set("--ui-btn", plate(C.wood, C.woodLight, C.woodDark));
  set("--ui-btn-down", plate(C.wood, C.woodLight, C.woodDark, undefined, true));
  set("--ui-btn-paper", plate(C.parchment, C.parchmentLight, C.parchmentDark));
  set("--ui-btn-paper-down", plate(C.parchmentDark, C.parchmentLight, "#b89a66", undefined, true));
  set("--ui-btn-wax", plate(C.cloth, C.clothLight, C.clothDark, C.brass));
  set("--ui-btn-wax-down", plate(C.clothDark, C.clothLight, C.clothDark, C.brassDark, true));
}
