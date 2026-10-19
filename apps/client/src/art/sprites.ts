import { PALETTE } from "./palette.ts";

/**
 * Hand-drawn pixel sprites as text so they're easy to edit in a diff.
 * Each character is one pixel: "." is transparent, other letters map to
 * the colours below; "N", "L" and "n" are the owning nation's colour, a
 * lighter and a darker shade of it. An ink outline is added around every
 * sprite when it is drawn, so the art only needs its inner lines.
 */
const KEY: Record<string, string> = {
  k: PALETTE.ink,
  w: PALETTE.paper,
  g: PALETTE.mist,
  s: PALETTE.steel,
  d: PALETTE.slate,
  y: PALETTE.gold,
  o: PALETTE.clay,
  r: PALETTE.blood,
  b: "#8b5a3c", // wood, leather, horse
  a: "#b07a4e", // horse in light
  H: "#4a2e1e", // horse in shade, hooves
  z: "#2b2130", // eyes
  t: "#5c3a26", // dark wood: poles, hooves
  h: "#4a2e1e", // hair
  f: "#f2c09c", // skin
  F: "#c98f6c", // skin in shade
  c: "#d8ccb0", // stone, plaster
  e: "#a39478", // stone in shade
  E: "#6e6252", // ground shadow
  m: "#2b2130", // doorways, arrow slits
};

export const SPRITES = {
  /** Capital city: a keep flying the realm's banner behind a gatehouse wall. */
  capital: [
    ".........t.........",
    ".........tNNN......",
    ".........tLNNn.....",
    ".........tNNn......",
    ".........t.........",
    ".......c.c.e.......",
    "c.c.e..ccwce..c.c.e",
    "cccce..ccmce..cccce",
    "ccmce..cccce..ccmce",
    "ccmce.ckckckc.ccmce",
    "ccccekcNcccNckcccce",
    "ccecekcncecnckcccce",
    "ceccekcckkkcckcecce",
    "ccccekckmsmkckccece",
    "ecccEkckmsmkckeccee",
    "eeeeEkekmsmkekeeeee",
    "EEEEEEEEEEEEEEEEEEE",
  ],
  /** Ordinary town: a timber-framed house under a roof in the realm's colour. */
  town: [
    "......k...t..",
    ".....kLk..t..",
    "....kLNnk.t..",
    "...kLNNNnkt..",
    "..kLNNNNNnk..",
    ".kLNNNNNNNnk.",
    "kLNNNNNNNNNnk",
    ".kbbbbbbbbbk.",
    ".kcwwcbcccek.",
    ".kcggcbcmmek.",
    ".kccccbcmmek.",
    ".keeeebemmek.",
    "EEEEEEEEEEEEE",
  ],
  /** Village: a single cottage with a smoke-pole, roofed in the realm's colour. */
  village: [
    "....k....",
    "...kLk.t.",
    "..kLNnkt.",
    ".kLNNNnk.",
    "kLNNNNNnk",
    ".kbbbbbk.",
    ".kcwbmck.",
    ".kecbmek.",
    "EEEEEEEEE",
  ],
  /** City: a church spire among houses roofed in the realm's colour. */
  city: [
    "..........y..........",
    ".........kck.........",
    ".........kck.........",
    "........kcwck........",
    "...k....kcmck.....k..",
    "..kLk...kcmck....kLk.",
    ".kLNnk.kNNNNnk..kLNnk",
    "kLNNNnkLNNNNNnkkLNNNn",
    ".kbbbkkcccccccekkbbbk",
    ".kcwck.cwcmmcwe.kcwck",
    ".kcmck.cccmmcce.kcmck",
    ".kemek.eccmmcee.kemek",
    "EEEEEEEEEEEEEEEEEEEEE",
  ],
  /** Castle: a stone tower standing beside the settlement. */
  tower: [
    "c.c.e",
    "cccce",
    "ccmce",
    "ccmce",
    "cccce",
    "ccece",
    "cecce",
    "ccmce",
    "ecmee",
    "EEEEE",
  ],
  /** Fort: an earthwork ring with a palisade of stakes in front of the settlement. */
  palisade: [
    "t.t.t.t.t.t.t.t.t.t.t",
    "ttttttttttttttttttttt",
    "tbtbtbtbtbtbtbtbtbtbt",
    "ooooooooooooooooooooo",
  ],
  /** Commander: a knight on a barded horse, lance pennant, plume and caparison in the realm's colour. */
  commander: [
    "..y........NL.........",
    "..tNNNNN..Nn..........",
    "..tLLLN..ggg..........",
    "..tnnnnngssd..........",
    "..t......ffd..........",
    "..t......Ffs.....Hb...",
    "..t....sLNNNns...aab..",
    "..t....gLyyynd..hbbzbb",
    "..tfssssLNyNn...hbbyHb",
    "..t.f...LNLNn..hbbbbbH",
    "..t.....LNNNn.hbbb..bb",
    "..t.aaaatttttaaabb....",
    "..thbLLLLLssLLLbb.....",
    "..tHbNyNNyssyNNb......",
    "..t.bNNyNNsdNyNb......",
    ".ht.bnnnnndnnnnb......",
    ".ht.HnHnHnHnHnHH......",
    "..h..bH.bH...bH.bH....",
    ".....bH.bH...bH.bH....",
    ".....ba.bb...ba.bb....",
    ".....bb.bb...bb.bb....",
    ".....HH.HH...HH.HH....",
  ],
  /**
   * Army on the map: the commander's knight, facing east (drawn mirrored to
   * face west). Two frames: the horse gallops and the pennant flutters.
   */
  rider0: [
    "..y........NL.........",
    "..tNNNNN..Nn..........",
    "..tLLLN..ggg..........",
    "..tnnnnngssd..........",
    "..t......ffd..........",
    "..t......Ffs.....Hb...",
    "..t....sLNNNns...aab..",
    "..t....gLyyynd..hbbzbb",
    "..tfssssLNyNn...hbbyHb",
    "..t.f...LNLNn..hbbbbbH",
    "..t.....LNNNn.hbbb..bb",
    "..t.aaaatttttaaabb....",
    "..thbLLLLLssLLLbb.....",
    "..tHbNyNNyssyNNb......",
    "..t.bNNyNNsdNyNb......",
    ".ht.bnnnnndnnnnb......",
    ".ht.HnHnHnHnHnHH......",
    "..h..bH.bH...bH.bH....",
    ".....bH.bH...bH.bH....",
    ".....ba.bb...ba.bb....",
    ".....bb.bb...bb.bb....",
    ".....HH.HH...HH.HH....",
  ],
  rider1: [
    "..y........NL.........",
    "..tNNNN...Nn..........",
    "..tLLLNN.ggg..........",
    "..tnnnnNgssd..........",
    "..t......ffd..........",
    "..t......Ffs.....Hb...",
    "..t....sLNNNns...aab..",
    "..t....gLyyynd..hbbzbb",
    "..tfssssLNyNn...hbbyHb",
    "..t.f...LNLNn..hbbbbbH",
    "..t.....LNNNn.hbbb..bb",
    "..t.aaaatttttaaabb....",
    "..thbLLLLLssLLLbb.....",
    "..tHbNyNNyssyNNb......",
    "..t.bNNyNNsdNyNb......",
    ".ht.bnnnnndnnnnb......",
    ".ht.HnHnHnHnHnHH......",
    "..h..bH.bH...bH.bH....",
    "....bH...bH.bH...bH...",
    "...ba.....bbba....bb..",
    "...bb......bb......bb.",
    "...HH......HH......HH.",
  ],
  /** A fleet on the map: a cog with a sail in the realm's colour, rocking on the swell. */
  ship0: [
    ".......tNNN.....",
    ".......tLNn.....",
    ".......t........",
    "....wwwtwww.....",
    "...wwNNtNNww....",
    "...wNNNtNNNw....",
    "...wwNNtNNww....",
    "....wwwtwww.....",
    ".......t........",
    ".bbb...t....bbb.",
    ".bobbbbbbbbbbob.",
    "..bbwbbwbbwbbb..",
    "...bbbbbbbbbb...",
    "..gg..gggg..gg..",
  ],
  ship1: [
    ".......tNN......",
    ".......tLNNn....",
    ".......t........",
    "....wwwtwww.....",
    "...wwNNtNNww....",
    "...wNNNtNNNw....",
    "...wwNNtNNww....",
    "....wwwtwww.....",
    ".......t........",
    ".bbb...t....bbb.",
    ".bobbbbbbbbbbob.",
    "..bbwbbwbbwbbb..",
    "...bbbbbbbbbb...",
    ".gg..gg..gg..gg.",
  ],
  /** Plain army without a named commander: a helmeted spearman. */
  soldier: [
    "....s.....",
    "...sgs....",
    "..sgggs.k.",
    "..sffFs.s.",
    "...ffF..s.",
    "..NNLNNfs.",
    ".NNLNNNNs.",
    ".fNLNNNns.",
    "..bbybbbs.",
    "..NNNNNn..",
    "..ss.ss...",
    "..ss.ss...",
    ".bbb.bbb..",
  ],
  /** An envoy on the road, riding right with his letter (DIPL-184). */
  envoy: [
    "......f....",
    ".....NNw...",
    ".....NLw...",
    "..bbbNbbab.",
    ".bbbbbbbbaa",
    "b.bbbbbbb..",
    "..t.t..t.t.",
    "..t.t..t.t.",
  ],
  /** A land trader on its loop: a pack mule under a bale in the realm's colour (TRADE-143). */
  caravan: [
    "....NNNN...",
    "...NLLLNn..",
    "ab.bNNNnbb.",
    "abbbbbbbbbb",
    "..bbbbbbb.b",
    "..t.t..t.t.",
    "..t.t..t.t.",
  ],
  /** A trade ship on its loop: a cog under a sail in the realm's colour (TRADE-143). */
  cog: [
    ".....t.....",
    "....NNN....",
    "...NLLNn...",
    "...NLLNn...",
    "....NNN....",
    ".....t.....",
    "bbbbbbbbbbb",
    ".bbbbbbbbb.",
    "..bbbbbbb..",
  ],
  /** Move order arrow head. */
  flag: [
    "kk....",
    "kNNNk.",
    "kNnNNk",
    "kNNNk.",
    "kk....",
    "k.....",
    "k.....",
  ],
} as const;

export type SpriteName = keyof typeof SPRITES;

const cache = new Map<string, HTMLCanvasElement>();

function shade(hex: string, ch: "n" | "L"): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(ch === "n" ? v * 0.62 : v + (255 - v) * 0.35);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** The sprite with a one-pixel ink outline around everything that isn't ink already. */
function outlined(rows: readonly string[]): string[] {
  const w = rows[0]!.length + 2;
  const grid = [".".repeat(w), ...rows.map((r) => `.${r}.`), ".".repeat(w)];
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < grid.length && !".k".includes(grid[y]![x]!);
  return grid.map((row, y) =>
    [...row].map((ch, x) => (ch === "." && (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) ? "k" : ch)).join(""),
  );
}

/** Renders a sprite at an integer scale, tinted with a nation colour. Cached. */
export function sprite(name: SpriteName, nationColor: string, scale: number): HTMLCanvasElement {
  const key = `${name}|${nationColor}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = outlined(SPRITES[name]);
  const canvas = document.createElement("canvas");
  canvas.width = rows[0]!.length * scale;
  canvas.height = rows.length * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      ctx.fillStyle = ch === "N" ? nationColor : ch === "n" || ch === "L" ? shade(nationColor, ch) : KEY[ch]!;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  cache.set(key, canvas);
  return canvas;
}

const urlCache = new Map<string, string>();
/** The sprite as a data URL for an <img>, cached: encoding a PNG takes far longer than drawing it. */
export function spriteUrl(name: SpriteName, nationColor: string, scale: number): string {
  const key = `${name}|${nationColor}|${scale}`;
  let url = urlCache.get(key);
  if (!url) urlCache.set(key, (url = sprite(name, nationColor, scale).toDataURL()));
  return url;
}


/**
 * The living map's detailed pieces (feedback 126): the same figures, ships and
 * traders drawn at twice the art density, so each art pixel of the ground holds
 * two by two of theirs and they stand as tall as before with far more in them.
 * Facing east with their feet (or keel) on the last row; the ink outline is a
 * half art pixel too. The coarse art above stays for the icons further out.
 */
export const FIGURES = {
  /** A spearman in a kettle hat, his tunic in the realm's colour. */
  foot0: [
    "........w.",
    ".......gsd",
    "........t.",
    "...gsd..t.",
    "..gsssd.t.",
    ".dsssssdt.",
    "...hfff.t.",
    "...hfzF.t.",
    "....fF..t.",
    "..LLNNnfF.",
    ".LNNyNn.t.",
    ".LNNNNn.t.",
    "..bbybb.t.",
    "..Nn.Nn.t.",
    "..dd..d.t.",
    ".tt...tt..",
  ],
  foot1: [
    "........w.",
    ".......gsd",
    "........t.",
    "...gsd..t.",
    "..gsssd.t.",
    ".dsssssdt.",
    "...hfff.t.",
    "...hfzF.t.",
    "....fF..t.",
    "..LLNNnfF.",
    ".LNNyNn.t.",
    ".LNNNNn.t.",
    "..bbybb.t.",
    "..NnNn..t.",
    "...dd...t.",
    "...ttt....",
  ],
  /** A horseman in a sallet on a bay horse under a saddle cloth in the realm's colour. */
  horse0: [
    "......gs........",
    ".....gssd.......",
    "......fz........",
    ".....LNNn.....a.",
    "....LNNNnf...abH",
    ".....NyNn.f.abzb",
    ".....NNNn..abbbH",
    ".a..bLNNnbbbb.HH",
    "aabbbNNNNnbbb...",
    "a.bbbnnnnnbbb...",
    "..bbbbbbbbbbH...",
    "..bH.bH..bH.bH..",
    "..b..b...b...b..",
    "..H..H...H...H..",
  ],
  horse1: [
    "......gs........",
    ".....gssd.......",
    "......fz........",
    ".....LNNn.....a.",
    "....LNNNnf...abH",
    ".....NyNn.f.abzb",
    ".....NNNn..abbbH",
    ".a..bLNNnbbbb.HH",
    "aabbbNNNNnbbb...",
    "a.bbbnnnnnbbb...",
    "..bbbbbbbbbbH...",
    "...bHbH...bHbH..",
    "...b..b...b..b..",
    "..H....H.H....H.",
  ],
  /** A bronze gun on its carriage, its gunner behind it with the rammer. */
  guns0: [
    ".gs.............",
    "gssd............",
    ".fz.............",
    "LNNn...ddssssd..",
    "NNNnf.dsggssssdk",
    "NyNn..ddssssssd.",
    "NNNn..tbtt......",
    ".dd..tbybt......",
    ".dd.ttbtbtt.....",
    ".tt...tbt.......",
  ],
  guns1: [
    ".gs.............",
    "gssd............",
    ".fz.............",
    "LNNn...ddssssd..",
    "NNNnf.dsggssssdk",
    "NyNn..ddssssssd.",
    "NNNn..tbtt......",
    ".dd..tbybt......",
    ".d.dttbtbtt.....",
    "t...t.tbt.......",
  ],
  /** A covered supply wagon, a band of the realm's colour on its canvas. */
  wagons0: [
    "..wwwwwwww....",
    ".wwwwwwwwwww..",
    "wwgwwwwwwgwww.",
    "wNNNNNNNNNNNw.",
    "wwgwwwwwwgwww.",
    "tbbbbbbbbbbbbt",
    ".bbbbbbbbbbbb.",
    ".tbt....tbt.tt",
    ".bmb....bmb...",
    ".tbt....tbt...",
  ],
  wagons1: [
    "..wwwwwwww....",
    ".wwwwwwwwwww..",
    "wwgwwwwwwgwww.",
    "wNNNNNNNNNNNw.",
    "wwgwwwwwwgwww.",
    "tbbbbbbbbbbbbt",
    ".bbbbbbbbbbbb.",
    ".tbt....tbt.tt",
    ".mbb....mbb...",
    ".tbt....tbt...",
  ],
  /** The commander: a knight under his great banner, gold at his crest, riding at the head. */
  banner0: [
    ".y..............",
    ".tNNNNNNL.......",
    ".tNLLyNNn.......",
    ".tNLyyyNn.......",
    ".tNNLyNnn.......",
    ".tNNNNNnn.......",
    ".tNn.Nn.n.......",
    ".t....yy........",
    ".t...gssd.......",
    ".t...wssd.......",
    ".t....fz........",
    ".tf..LNNn.....a.",
    ".tfLLNNNnf...abH",
    ".t...NyNn.f.abzb",
    ".t...NNNn..abbbH",
    ".ta.bLNNnbbbb.HH",
    "aabbbNNNNnbbb...",
    "a.bbbnynynbbb...",
    "..bbbbbbbbbbH...",
    "..bH.bH..bH.bH..",
    "..b..b...b...b..",
    "..H..H...H...H..",
  ],
  banner1: [
    ".y..............",
    ".tNNNNNL........",
    ".tNLLyNNnn......",
    ".tNLyyyNNn......",
    ".tNNLyNNnn......",
    ".tNNNNNNn.......",
    ".tNn.NNn........",
    ".t....yy........",
    ".t...gssd.......",
    ".t...wssd.......",
    ".t....fz........",
    ".tf..LNNn.....a.",
    ".tfLLNNNnf...abH",
    ".t...NyNn.f.abzb",
    ".t...NNNn..abbbH",
    ".ta.bLNNnbbbb.HH",
    "aabbbNNNNnbbb...",
    "a.bbbnynynbbb...",
    "..bbbbbbbbbbH...",
    "...bHbH...bHbH..",
    "...b..b...b..b..",
    "..H....H.H....H.",
  ],
  /** A besieger's tent, striped in the realm's colour, its flap open. */
  tent: [
    ".....tN.....",
    ".....t......",
    "....wwe.....",
    "...wwNee....",
    "..wwNNNee...",
    ".wwwNNNeee..",
    "wwwwNmNeeee.",
    "wwwNmmmNeee.",
    "wwwNmmmNeeee",
    "EEEEEEEEEEEE",
  ],
  /** Close in, a trading ship on a sea trade path: a cog under a striped sail in the realm's colour (VIEW-123). */
  cog: [
    "..........y...........",
    "..........tNN.........",
    "..........tLNn........",
    "......wwwwtwwww.......",
    "......wNwNtNwNw.......",
    "......wNwNtNwNw.......",
    "......wNwNtNwNw.......",
    "......wNwNtNwNw.......",
    ".......wwwtwww........",
    ".ao.......t........ao.",
    ".bbb......t.......bbb.",
    "bbbbbbbbbbbbbbbbbbbbbb",
    "bobbbbbbbbbbbbbbbbbbob",
    ".bbbbbbbbbbbbbbbbbbbb.",
    "..HbbbbbbbbbbbbbbbbH..",
    "...HHHHHHHHHHHHHHHH...",
  ],
  /** Close in, one hull of a fleet: a carrack under a mainsail in the realm's colour, bow to the right (VIEW-121). */
  hull0: [
    "..........y.................",
    "..........tNNN..............",
    "..........tLNn.......y......",
    "..........t..........tNn....",
    "......wwwwtwwww......t......",
    ".....wLNNNtNNNNw...wwtww....",
    ".....wNNNytyNNNw..wwwtwww...",
    "..t..wNNyytyyNNw..wgwtwgw...",
    "..tw.wNNNytyNNNw..wwwtwww...",
    "..tww.wNNNtNNNww...wwtww...t",
    "..twww.wwwtwww......wtw...t.",
    "..t......t.t........t....t..",
    "aaoaao...t.t........t..aaoa.",
    "bbbbbb...t.t........t..bbbt.",
    "bobbbbbbbbbbbbbbbbbbbbbbbbb.",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbb.",
    ".byybbbbbbbbbbbbbbbbbbbbbb..",
    ".bbmbbmbbmbbmbbmbbmbbmbbbb..",
    "..bbbbbbbbbbbbbbbbbbbbbbb...",
    "...HbbbbbbbbbbbbbbbbbbbH....",
    "....HHHHHHHHHHHHHHHHHHH.....",
  ],
  hull1: [
    "..........y.................",
    "..........tNN...............",
    "..........tLNNn......y......",
    "..........t..........tN.....",
    "......wwwwtwwww......t......",
    ".....wLNNNtNNNNw...wwtww....",
    ".....wNNNytyNNNw..wwwtwww...",
    "..t..wNNyytyyNNw..wgwtwgw...",
    "..tw.wNNNytyNNNw..wwwtwww...",
    "..tww.wNNNtNNNww...wwtww...t",
    "..twww.wwwtwww......wtw...t.",
    "..t......t.t........t....t..",
    "aaoaao...t.t........t..aaoa.",
    "bbbbbb...t.t........t..bbbt.",
    "bobbbbbbbbbbbbbbbbbbbbbbbbb.",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbb.",
    ".byybbbbbbbbbbbbbbbbbbbbbb..",
    ".bbmbbmbbmbbmbbmbbmbbmbbbb..",
    "..bbbbbbbbbbbbbbbbbbbbbbb...",
    "...HbbbbbbbbbbbbbbbbbbbH....",
    "....HHHHHHHHHHHHHHHHHHH.....",
  ],
  /** Close in, a caravan on its trade path: a pack mule leading a covered cart in the realm's colour, walking left (VIEW-123). */
  caravanTrain: [
    ".a.................wwwwwwwwwww...",
    "aab.....wwww......wLLNNNNNNNNnw..",
    "abzb...wLNNnw....wLNNNNNNNNNNNnw.",
    "Hbbb...wNyNnw....wNNNNNNNNNNNNnw.",
    "..bbb..wNNNnw....wNNNNNNNNNNNNnw.",
    "...bbbbbbbbbbbbbttbbbbbbbbbbbbbbt",
    "....bbbbbbbbbbbb..bbbbbbbbbbbbbb.",
    "....bbbbbbbbbbb....tbbt....tbbt..",
    "....bH.bH.bH.bH....bmyb....bmyb..",
    "....b..b..b...b....tbbt....tbbt..",
    "....H..H..H...H.....tt......tt...",
  ],
  /** Close in, a barge on a river trade path: bales in the realm's colour and a boatman poling at the stern (VIEW-123). */
  barge: [
    "........................f...t.",
    "......................hfF..t..",
    "......................LNn.t...",
    "...wwww..wwww.........NNnt....",
    "..wNNNnw.wNNNnw......fNNn.....",
    "..wNyNnw.wNyNnw..wwwwbdd......",
    "..wNNNnw.wNNNnw.wNNNnw.d......",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbb.",
    ".boooooooooooooooooooooooooob.",
    "..bbbbbbbbbbbbbbbbbbbbbbbbbb..",
    "...tttttttttttttttttttttttt...",
  ],
} as const;

export type FigureName = keyof typeof FIGURES;


/** Least-recently-used cache of figure art, keyed by figure, colour, whole art pixel and facing (VIEW-130). */
const figureCache = new Map<string, FigureArt>();
const FIGURE_CACHE_MAX = 400;

/** A figure's picture and the size to draw it at, in CSS pixels. */
export interface FigureArt {
  img: HTMLCanvasElement;
  w: number;
  h: number;
}

/**
 * A figure at `u` CSS pixels per art pixel of the ground, so half that per pixel of
 * its own art, tinted with its realm's colour, facing east (1) or west (-1). The
 * picture is painted at the screen's own pixels so the half art pixels stay sharp.
 */
export function figureSprite(name: FigureName, color: string, u: number, dir: 1 | -1): FigureArt {
  const key = `${name}|${color}|${u}|${dir}`;
  const hit = figureCache.get(key);
  if (hit) {
    figureCache.delete(key);
    figureCache.set(key, hit);
    return hit;
  }
  // Outlined in ink like every sprite, so each figure in a block reads on any ground.
  const rows = outlined(FIGURES[name].map((r) => (dir === 1 ? r : [...r].reverse().join(""))));
  const k = Math.max(1, Math.round((u * Math.min(window.devicePixelRatio || 1, 2)) / 2));
  const canvas = document.createElement("canvas");
  canvas.width = rows[0]!.length * k;
  canvas.height = rows.length * k;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      ctx.fillStyle = ch === "N" ? color : ch === "n" || ch === "L" ? shade(color, ch) : KEY[ch]!;
      ctx.fillRect(x * k, y * k, k, k);
    }
  });
  const art = { img: canvas, w: (rows[0]!.length * u) / 2, h: (rows.length * u) / 2 };
  figureCache.set(key, art);
  if (figureCache.size > FIGURE_CACHE_MAX) figureCache.delete(figureCache.keys().next().value!);
  return art;
}
