import { DEPTH_COLORS, hexToRgb, PALETTE, TERRAINS } from "../art/palette.ts";
import { ATLAS_ROWS, BIG_ROWS, buildMiniAtlas, buildTileAtlas, rowColors, SEA_ROW, SHALLOW_ROW, TILE, VARIANTS, WATER_BASE } from "../art/tiles.ts";
import { TOWN_FLAG, TOWN_ROWS, TOWN_TILE, TOWN_VARIANTS, buildTownAtlas } from "../art/townTiles.ts";
import { UI_COLORS } from "../art/ui.ts";
import { ICE } from "@ph/engine/domain/map-presentation";
import type { MapImage } from "./loadMap.ts";

/** A number as a GLSL float literal. */
const glf = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));
/** A colour of 0..1 channels as a GLSL vec3. */
const glv = (c: readonly number[]): string => `vec3(${c.map(glf).join(", ")})`;

/**
 * WebGL2 world map. The province id image is uploaded once; colours live in
 * a small per-province lookup texture, so changing owners, selection or map
 * mode only rewrites a few kilobytes instead of millions of pixels.
 * Each map pixel is drawn as a crisp block (nearest filtering) for the 8-bit look.
 *
 * Three levels of detail:
 * - far: one colour per map pixel from its terrain, with relief shading,
 *   the realm's colour washed over it and ocean depth in dithered bands;
 * - middle (MID_ZOOM): every map pixel becomes 4×4 art pixels from a
 *   half-size tile atlas;
 * - close (DETAIL_ZOOM): every map pixel becomes 8×8 art pixels.
 * Both tiled levels draw coasts with cut corners and a sand line, two-tone
 * nation borders and dotted province borders.
 */

/** Device pixels per map pixel at which the full-size tiles take over. */
export const DETAIL_ZOOM = 7;
/** Device pixels per map pixel at which the half-size tiles take over. */
export const MID_ZOOM = 4;

/** political: realm colours; terrain: bare land; lens: a strong wash of each province's own colour (a data lens). */
export type MapMode = "political" | "terrain" | "lens";

export interface Camera {
  /** Map pixel at the centre of the screen. */
  x: number;
  y: number;
  /** Screen pixels per map pixel. */
  zoom: number;
}

const VERT = `#version 300 es
in vec2 aPos;          // map pixel coordinates
uniform vec2 uCenter;  // camera centre in map pixels
uniform float uZoom;
uniform vec2 uView;    // viewport in device pixels
out vec2 vMap;
void main() {
  vMap = aPos;
  vec2 screen = (aPos - uCenter) * uZoom;
  gl_Position = vec4(screen.x * 2.0 / uView.x, -screen.y * 2.0 / uView.y, 0.0, 1.0);
}`;

const T = Object.fromEntries(TERRAINS.map((t, i) => [t, i])) as Record<(typeof TERRAINS)[number], number>;
const glsl = (hex: string) => `vec3(${hexToRgb(hex).map((v) => (v / 255).toFixed(4)).join(", ")})`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vMap;
uniform sampler2D uIds;      // this tile's province ids (RGB = id + 1)
uniform sampler2D uLand;     // per pixel: R terrain index; G water depth band + 1, or 64 + river size on land; B river links
uniform ivec2 uTileOrigin;   // tile's top-left in map pixels
uniform ivec2 uTileSize;     // texels in this tile's texture (includes 1px overlap)
uniform sampler2D uInfo;     // per-province: rgb = fill colour, a = flags
uniform sampler2D uOwner;    // per-province: rg = owner index + 1, b = 255 for sea zones (else +64 faded, +16 closed to the moving armies), a = lord tag (0 = royal land)
uniform sampler2D uSeason;   // per-province season, see seasonal()
uniform int uInfoWidth;
uniform float uZoom;
uniform float uTime;
uniform int uMode;           // 0 political, 1 terrain, 2 data lens
uniform vec3 uParchment, uParchmentDark;
uniform vec3 uTerrain[${TERRAINS.length}];  // average colour of each terrain's tiles
uniform vec3 uDepth[${DEPTH_COLORS.length}];     // ocean colour by depth band
uniform vec3 uFoam, uInk, uHighlight, uSand, uForbid;
uniform sampler2D uAtlas;    // terrain tiles: ${VARIANTS} variants across, one row per terrain
uniform sampler2D uMini;     // the same at half size
uniform sampler2D uTown;     // per-province town (VIEW-110, VIEW-113): r walls (0 none, 1 palisade, 2 stone), g road grade (0 track, 1 road, 2 paved), b worship variant, a style
uniform sampler2D uTownAtlas; // town tiles: ${TOWN_VARIANTS} variants across, one row per cell kind (row = kind - 1)
uniform float uLiving;       // 0..1: how far the living map has faded in (VIEW-101)
uniform vec3 uRoad[3];       // track, road, paved road
out vec4 outColor;

const vec3 SEA_BASE = ${glsl(WATER_BASE.sea)};
const vec3 SHALLOW_BASE = ${glsl(WATER_BASE.shallow)};

int idAt(ivec2 p) {
  ivec2 local = clamp(p - uTileOrigin, ivec2(0), uTileSize - 1);
  vec3 c = texelFetch(uIds, local, 0).rgb * 255.0 + 0.5;
  return (int(c.r) << 16 | int(c.g) << 8 | int(c.b)) - 1;
}
vec3 land3(ivec2 p) {
  ivec2 local = clamp(p - uTileOrigin, ivec2(0), uTileSize - 1);
  return texelFetch(uLand, local, 0).rgb * 255.0 + 0.5;
}
vec2 landAt(ivec2 p) { return land3(p).rg; }
int terrainAt(ivec2 p) { return min(int(landAt(p).r), ${TERRAINS.length - 1}); }
// Depth band of a map pixel; land counts as the shallowest so coasts stay light.
float depthAt(ivec2 p) {
  float g = floor(landAt(p).g);
  return g >= 64.0 ? 0.0 : max(g - 1.0, 0.0);
}
// River size on a land pixel: 0 none, 1 river, 2 great river.
int riverAt(ivec2 p) {
  int g = int(landAt(p).g);
  return g >= 64 ? g - 64 : 0;
}
vec4 info(int id) { return texelFetch(uInfo, ivec2(id % uInfoWidth, id / uInfoWidth), 0); }
int ownerOf(int id) {
  vec2 o = texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).rg * 255.0 + 0.5;
  return int(o.r) * 256 + int(o.g) - 1;
}
// Which lord holds a province, as a tag (0 = royal land); neighbours with different tags have a fief border.
int lordTag(int id) { return int(texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).a * 255.0 + 0.5); }
// Land faded back while other provinces are picked out (owner b = 64), e.g. while a lord's lands are lit.
vec3 faded(vec3 c, int id) {
  float b = texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).b;
  return b > 0.2 && b < 0.4 ? mix(vec3(dot(c, vec3(0.3, 0.55, 0.15))), uParchmentDark, 0.25) * 0.75 : c;
}
// Land province (not a lake, not a sea zone).
bool land(int id) {
  return id >= 0 && texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).b < 0.5;
}
float segDist(vec2 q, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(q - a - ab * t);
}
// Distance from q (map pixels, relative to pixel p's corner) to the rivers
// around p, and the size of the nearest one. Each river pixel draws a
// half-segment toward every neighbour its river flows to.
vec2 riverDist(ivec2 p, vec2 q) {
  float best = 9.0;
  float size = 0.0;
  for (int cy = -1; cy <= 1; cy++) for (int cx = -1; cx <= 1; cx++) {
    vec3 l = land3(p + ivec2(cx, cy));
    int rc = int(l.g) >= 64 ? int(l.g) - 64 : 0;
    if (rc == 0) continue;
    int links = int(l.b);
    vec2 a = vec2(cx, cy) + 0.5;
    float d = links == 0 ? length(q - a) : 9.0;
    for (int k = 0; k < 8; k++) {
      if ((links & (1 << k)) == 0) continue;
      vec2 dir = vec2(k == 0 || k == 1 || k == 7 ? 1.0 : k == 3 || k == 4 || k == 5 ? -1.0 : 0.0, k >= 1 && k <= 3 ? 1.0 : k >= 5 ? -1.0 : 0.0);
      d = min(d, segDist(q, a, a + dir * 0.5));
    }
    if (d < best) { best = d; size = float(rc); }
  }
  return vec2(best, size);
}
float hash(ivec2 p) {
  uint h = uint(p.x) * 374761393u + uint(p.y) * 668265263u;
  h = (h ^ (h >> 13)) * 1274126177u;
  return float(h & 0xffffu) / 65535.0;
}
float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
// 4×4 ordered dither threshold in (0, 1), for crisp pixel-art gradients.
float bayer(ivec2 a) {
  int x = a.x & 3, y = a.y & 3;
  int b2 = ((x ^ y) & 1) * 2 + (y & 1);
  int b1 = (((x >> 1) ^ (y >> 1)) & 1) * 2 + ((y >> 1) & 1);
  return (float(b2 * 4 + b1) + 0.5) / 16.0;
}
vec3 depthColor(float v, ivec2 a) {
  int band = clamp(int(floor(v + bayer(a))), 0, ${DEPTH_COLORS.length - 1});
  return uDepth[band];
}
bool isBig(int t) { return ${BIG_ROWS.map((r) => `t == ${r}`).join(" || ")}; }
float flags(int id) { return float(int(info(id).a * 255.0 + 0.5) >> 4); }
// Occupied land (flag 8): diagonal hatching over the occupier's wash; under the diplomacy lens, realms at war with the player.
vec3 hatch(vec3 c, int id, ivec2 q, int width) {
  if (uMode == 1 || (int(flags(id)) & 8) == 0) return c;
  return ((q.x + q.y) / width) % 2 == 0 ? mix(c, uInk, 0.35) : c;
}
vec3 highlight(vec3 c, int id, float strength) {
  int f = int(flags(id));
  if ((f & 1) != 0) c = mix(c, uHighlight, strength + strength * step(0.5, fract(uTime * 1.5)));
  if ((f & 2) != 0) c = mix(c, uHighlight, strength * 1.2);
  return c;
}
// Seasons (decision X-17), from the engine's climate.ts once a turn: uSeason per province
// holds r = sea-level temperature ((C + 60) / 127.5), g = autumn, b = spring,
// a = wet season. Each tile is cooled by its height, so snow lies where it
// is below freezing there: first on the peaks, then down into the valleys.
vec4 seasonAt(int id) { return texelFetch(uSeason, ivec2(id % uInfoWidth, id / uInfoWidth), 0); }
float heightKm(int t) {
  return t == ${T.snowpeaks} ? 3.6 : t == ${T.glacier} ? 3.0 : t == ${T.mountains} ? 2.1 : t == ${T.highlands} ? 1.3 : t == ${T.badlands} ? 0.7 : t == ${T.hills} ? 0.5 : 0.1;
}
float tempAt(int id, int t) { return seasonAt(id).r * 127.5 - 60.0 - 6.5 * heightKm(t); }
// Snow cover 0..1: none above +1 C, full by -5 C. grain in 0..1 breaks
// light cover into patches of art pixels.
float snowAt(int id, int t, float grain) {
  float cover = smoothstep(1.0, -5.0, tempAt(id, t));
  return clamp((cover - grain * 0.8) / 0.2, 0.0, 1.0) * step(0.02, cover);
}
vec3 seasonal(vec3 c, int t, int id, float grain) {
  vec4 s = seasonAt(id);
  float temp = tempAt(id, t);
  float l = lum(c);
  bool trees = t == ${T.forest} || t == ${T.broadleaf} || t == ${T.jungle} || t == ${T.highlands};
  bool green = t == ${T.grassland} || t == ${T.farmland} || t == ${T.broadleaf} || t == ${T.forest} || t == ${T.mediterranean} || t == ${T.paddies} || t == ${T.steppe} || t == ${T.hills} || t == ${T.marsh};
  bool gold = t == ${T.grassland} || t == ${T.farmland} || t == ${T.broadleaf} || t == ${T.paddies} || t == ${T.steppe} || t == ${T.hills} || t == ${T.mediterranean};
  // Wet season on tropical dry lands, fresh spring green, autumn gold.
  c = mix(c, clamp(vec3(0.62, 1.15, 0.5) * l, 0.0, 1.0), 0.45 * s.a);
  if (green) c = mix(c, clamp(c * vec3(0.92, 1.12, 0.86) + vec3(0.0, 0.02, 0.0), 0.0, 1.0), s.b);
  if (gold) c = mix(c, vec3(1.4, 0.95, 0.38) * l, (t == ${T.broadleaf} ? 0.75 : 0.55) * s.g);
  else if (t == ${T.forest}) c = mix(c, vec3(1.25, 0.9, 0.45) * l, 0.25 * s.g);
  // The small white caps of the mountain tiles are snow too: where it is warm
  // up there (the tropics, or any summer low enough) they turn to bare rock.
  if (t == ${T.mountains} && l > 0.72) c = mix(c, vec3(0.56, 0.54, 0.52), smoothstep(-1.0, 5.0, temp - 6.5));
  // Cold without snow leaves the land bare and dull.
  float cold = smoothstep(9.0, 2.0, temp);
  c = mix(c, vec3(1.02, 0.97, 0.9) * l, 0.45 * cold);
  // Snow: bright where the ground is light, blue shadow where it is dark;
  // trees stay a little darker so forests still read.
  float snow = snowAt(id, t, grain);
  vec3 white = mix(vec3(0.58, 0.64, 0.78), vec3(0.97, 0.98, 1.0), clamp(l * 1.9 - 0.15, 0.0, 1.0));
  return mix(c, white, snow * (trees ? 0.55 : 0.85));
}

// How much of the realm's colour to lay over the terrain: more when far out,
// so realms read at a glance, less up close where the art carries the map.
float wash() { return uMode == 2 ? 0.78 : mix(0.62, 0.3, smoothstep(1.0, ${DETAIL_ZOOM}.0, uZoom)); }
vec3 realmWash(vec3 terrain, vec3 realm) {
  return mix(terrain, realm * (0.45 + 0.85 * lum(terrain)), wash());
}
// Smooth value noise over map pixels, and a few octaves of it, for shapes
// that follow no province line.
float vnoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(i);
  return mix(mix(hash(c), hash(c + ivec2(1, 0)), f.x), mix(hash(c + ivec2(0, 1)), hash(c + ivec2(1, 1)), f.x), f.y);
}
float fbm(vec2 x) { return ${ICE.noiseOctaves.map(([scale, weight]) => `${glf(weight)} * vnoise(x / ${glf(scale)})`).join(" + ")}; }
// How cold a sea zone is for ice, 0..1: open water above ${ICE.openAboveC} C, frozen over by ${ICE.frozenByC} C.
float seaCold(int id) { return smoothstep(${glf(ICE.openAboveC)}, ${glf(ICE.frozenByC)}, seasonAt(id).r * 127.5 - 60.0); }
// Slush and sea ice, each 0..1, at map point m (VIEW-080..082): seaIceAt in the engine's
// map-presentation runs the same sums, for the specs. The cold is blended across
// neighbouring sea zones so no zone freezes as a block; ice forms first along
// coasts and over shallow water, and its edge follows noise, not borders, with no dither.
vec2 iceAt(vec2 m) {
  float cold = 0.0;
  float seas = 0.0;
  float coast = 0.0;
  for (int k = 0; k < ${ICE.samples + 1}; k++) {
    vec2 o = k == 0 ? vec2(0.0) : ${glf(ICE.sampleRadius)} * vec2(cos(float(k) * 0.785), sin(float(k) * 0.785));
    int id = idAt(ivec2(floor(m + o)));
    if (land(id)) coast += 1.0;
    else if (id >= 0) { cold += seaCold(id); seas += 1.0; }
  }
  if (seas == 0.0 || cold < 0.02) return vec2(0.0);
  cold /= seas;
  float depth = depthAt(ivec2(floor(m))) / ${DEPTH_COLORS.length}.0;
  float k = cold * ${glf(ICE.coldGain)} + ${glf(ICE.coastWeight)} * coast / ${glf(ICE.samples + 1)} - ${glf(ICE.depthWeight)} * depth - ${glf(ICE.noiseWeight)} * fbm(m);
  return vec2(smoothstep(${glf(ICE.slush[0])}, ${glf(ICE.slush[1])}, k), smoothstep(${glf(ICE.solid[0])}, ${glf(ICE.solid[1])}, k));
}
// Ice: a cool grey-blue, darker than snow on land, with cracks and pale floes.
vec3 iceColor(vec2 m) {
  vec3 c = mix(${glv(ICE.iceColour)}, ${glv(ICE.floeColour)}, smoothstep(0.55, 0.75, vnoise(m * 0.45)));
  // A few long cracks between the floes.
  if (abs(vnoise(m * 0.22 + 17.0) - 0.5) < 0.018) c = ${glv(ICE.crackColour)};
  return c;
}
// Open water meets the ice in a band of slush rather than a hard line.
vec3 icedSea(vec3 water, vec2 m) {
  vec2 ice = iceAt(m);
  if (ice.x <= 0.0) return water;
  return mix(mix(water, ${glv(ICE.slushColour)}, ${glf(ICE.slushMix)} * ice.x), iceColor(m), ice.y);
}
// Rivers freeze a few degrees below zero, the small ones first.
bool riverFrozen(int id, int t, float grain) { return smoothstep(-3.0, -8.0, tempAt(id, t)) > grain * 0.9 + 0.05; }
// Snow lies over the realm's colour too, so winter reads from far out.
vec3 snowOver(vec3 c, int id, int t, float grain) { return mix(c, vec3(0.94, 0.96, 1.0), 0.32 * snowAt(id, t, grain)); }

vec3 tileAt(bool mini, int row, int variant, ivec2 local) {
  if (mini) return texelFetch(uMini, ivec2(variant * ${TILE / 2} + local.x, row * ${TILE / 2} + local.y), 0).rgb;
  return texelFetch(uAtlas, ivec2(variant * ${TILE} + local.x, row * ${TILE} + local.y), 0).rgb;
}

// Province under an art pixel, with stair-stepped corners: where the two
// pixels beside a corner belong to the same other province, the corner is
// cut off and given to it, which rounds coasts and borders.
int effId(vec2 m) {
  ivec2 p = ivec2(floor(m));
  int id = idAt(p);
  vec2 f = fract(m);
  int sx = f.x < 0.5 ? -1 : 1;
  int sy = f.y < 0.5 ? -1 : 1;
  int h = idAt(p + ivec2(sx, 0));
  if (h == id || h != idAt(p + ivec2(0, sy))) return id;
  float dx = sx < 0 ? f.x : 1.0 - f.x;
  float dy = sy < 0 ? f.y : 1.0 - f.y;
  return dx + dy < 0.5 ? h : id;
}


// The living map (VIEW-105..VIEW-115): the alpha of the id texture holds each
// map pixel's settlement byte, the cell kind in bits 0-3 and road links
// N/E/S/W in bits 4-7. Towns are drawn over the terrain in the ground's own
// art pixels; walls are worked out from neighbouring core cells.
int settlementAt(ivec2 p) {
  ivec2 local = clamp(p - uTileOrigin, ivec2(0), uTileSize - 1);
  return int(texelFetch(uIds, local, 0).a * 255.0 + 0.5);
}
// Cells inside the walls: core, keep, market, worship, docks, drill yard and landmark.
bool walled(int b) { int k = b & 15; return (k >= 3 && k <= 8) || k == 12; }
vec4 townInfo(int id) { return floor(texelFetch(uTown, ivec2(id % uInfoWidth, id / uInfoWidth), 0) * 255.0 + 0.5); }
const vec3 FLAG = ${glsl(TOWN_FLAG)};
vec3 livingTown(vec3 c, ivec2 p, ivec2 a, int id, int terrain, vec3 realm) {
  int b = settlementAt(p);
  if (b == 0) return c;
  int kind = b & 15;
  int links = b >> 4;
  ivec2 q = a & ${TOWN_TILE - 1};
  vec4 ti = townInfo(id);
  if (links != 0) {
    // A two-pixel road from the middle of the map pixel to each linked side; a track is broken.
    bool mid = q.x >= 3 && q.x <= 4;
    bool row = q.y >= 3 && q.y <= 4;
    bool on = (mid && row) || ((links & 1) != 0 && mid && q.y <= 4) || ((links & 2) != 0 && row && q.x >= 3) || ((links & 4) != 0 && mid && q.y >= 3) || ((links & 8) != 0 && row && q.x <= 4);
    // A darker verge one pixel either side, so the road reads on every ground.
    bool wide = q.x >= 2 && q.x <= 5;
    bool tall = q.y >= 2 && q.y <= 5;
    bool verge = !on && ((wide && tall) || ((links & 1) != 0 && wide && q.y <= 5) || ((links & 2) != 0 && tall && q.x >= 2) || ((links & 4) != 0 && wide && q.y >= 2) || ((links & 8) != 0 && tall && q.x <= 5));
    int grade = clamp(int(ti.g), 0, 2);
    if (on) c = uRoad[grade] * (hash(a + 3) > 0.8 ? 0.88 : 1.0);
    else if (verge) c = mix(c, uInk, grade == 0 ? 0.18 : 0.3);
  }
  if (kind == 0) return c;
  bool woods = terrain == ${T.forest} || terrain == ${T.broadleaf} || terrain == ${T.jungle} || terrain == ${T.highlands};
  int variant = kind == 6 ? int(ti.b) : kind == 9 ? (woods ? 2 : terrain == ${T.hills} ? 1 : terrain == ${T.mountains} || terrain == ${T.badlands} ? 0 : 3) : int(hash(p + ivec2(13, 7)) * ${TOWN_VARIANTS}.0);
  ivec2 tq = q;
  if (kind == 7) {
    // Docks are painted with the quay to the north and the water to the south: turn them to face the water.
    const int L = ${TOWN_TILE - 1};
    if (!land(idAt(p + ivec2(0, -1)))) tq = ivec2(q.x, L - q.y);
    else if (!land(idAt(p + ivec2(1, 0)))) tq = ivec2(q.y, q.x);
    else if (!land(idAt(p + ivec2(-1, 0)))) tq = ivec2(q.y, L - q.x);
  }
  vec4 t = texelFetch(uTownAtlas, ivec2((variant & ${TOWN_VARIANTS - 1}) * ${TOWN_TILE} + tq.x, (kind - 1) * ${TOWN_TILE} + tq.y), 0);
  if (t.a > 0.5) {
    c = distance(t.rgb, FLAG) < 0.02 ? realm : t.rgb;
    // Snow on the roofs in winter (VIEW-128, VIEW-072).
    c = mix(c, vec3(0.94, 0.96, 1.0), 0.6 * snowAt(id, terrain, hash(a)));
  }
  int walls = int(ti.r);
  if (walls > 0 && walled(b)) {
    bool n = !walled(settlementAt(p + ivec2(0, -1)));
    bool s = !walled(settlementAt(p + ivec2(0, 1)));
    bool w = !walled(settlementAt(p + ivec2(-1, 0)));
    bool e = !walled(settlementAt(p + ivec2(1, 0)));
    bool wall = (n && q.y == 0) || (s && q.y == ${TOWN_TILE - 1}) || (w && q.x == 0) || (e && q.x == ${TOWN_TILE - 1});
    bool cornerX = (w && q.x <= 1) || (e && q.x >= ${TOWN_TILE - 2});
    bool cornerY = (n && q.y <= 1) || (s && q.y >= ${TOWN_TILE - 2});
    if (walls == 2 && cornerX && cornerY) c = ((q.x + q.y) & 1) == 0 ? ${glsl("#b5aebb")} : ${glsl("#77707e")};
    else if (wall) c = walls == 1 ? (((q.x + q.y) & 1) == 0 ? ${glsl("#8a5a2a")} : ${glsl("#5a3a1a")}) : (((q.x + q.y) & 1) == 0 ? ${glsl("#9a94a0")} : ${glsl("#4a4552")});
  }
  return c;
}

// Tiled map: each map pixel is ART × ART art pixels; tiles cover 2 × 2 map pixels.
vec3 tiled(bool mini) {
  int size = mini ? ${TILE / 2} : ${TILE};
  int shift = mini ? ${Math.log2(TILE / 2)} : ${Math.log2(TILE)};
  float art = float(size / 2);
  vec2 artPos = floor(vMap * art);
  vec2 m = (artPos + 0.5) / art;
  float e = 1.0 / art;
  int id = effId(m);
  int iR = effId(m + vec2(e, 0.0));
  int iL = effId(m - vec2(e, 0.0));
  int iD = effId(m + vec2(0.0, e));
  int iU = effId(m - vec2(0.0, e));
  ivec2 a = ivec2(artPos);
  ivec2 cell = a >> shift;
  ivec2 local = a & (size - 1);
  int variant = int(hash(cell) * ${VARIANTS}.0) & ${VARIANTS - 1};
  ivec2 p = ivec2(floor(m));

  if (!land(id)) {
    bool nearLand = land(idAt(p + ivec2(1, 0))) || land(idAt(p - ivec2(1, 0))) || land(idAt(p + ivec2(0, 1))) || land(idAt(p - ivec2(0, 1)));
    // Waves drift sideways, each tile at its own pace.
    int drift = int(uTime * art * 0.25 + hash(cell + 7) * float(size));
    vec3 c = tileAt(mini, nearLand ? ${SHALLOW_ROW} : ${SEA_ROW}, variant, ivec2((local.x + drift) & (size - 1), local.y));
    // Shift the tile to the water's depth, blending bands with a dither.
    vec2 q = m - 0.5;
    ivec2 b = ivec2(floor(q));
    vec2 f = fract(q);
    float v = mix(mix(depthAt(b), depthAt(b + ivec2(1, 0)), f.x), mix(depthAt(b + ivec2(0, 1)), depthAt(b + ivec2(1, 1)), f.x), f.y);
    c = clamp(c + depthColor(v, a) - (nearLand ? SHALLOW_BASE : SEA_BASE), 0.0, 1.0);
    if (land(iR) || land(iL) || land(iD) || land(iU)) {
      c = mix(c, uFoam, 0.55 + 0.2 * step(0.5, fract(uTime * 0.7 + hash(a))));
    } else if (id >= 0 && ((iR >= 0 && iR != id) || (iD >= 0 && iD != id)) && ((a.x + a.y) / 2 & 1) == 0) {
      c = mix(c, uFoam, 0.3); // dashed line between sea zones
    }
    c = icedSea(c, m);
    return id >= 0 ? highlight(c, id, 0.15) : c;
  }

  vec4 inf = info(id);
  int terrain = terrainAt(p);
  if (idAt(p) != id) terrain = int(inf.a * 255.0 + 0.5) & 15; // a corner borrowed from a neighbour
  if (isBig(terrain)) {
    // One picture over four tiles, mirrored at random per block.
    int big = size * 2;
    ivec2 q = a & (big - 1);
    if (hash(a >> (shift + 1)) > 0.5) q.x = big - 1 - q.x;
    variant = (q.x >> shift) + 2 * (q.y >> shift);
    local = q & (size - 1);
  }
  vec3 c = seasonal(tileAt(mini, terrain, variant, local), terrain, id, hash(a));
  int owner = ownerOf(id);
  bool political = uMode != 1 && owner >= 0;
  if (political) {
    c = snowOver(realmWash(c, inf.rgb), id, terrain, hash(a));
    // A wider band of the owner's colour along its borders.
    bool edge = false;
    for (int k = 0; k < 4; k++) {
      int n = idAt(p + ivec2(k == 0 ? 1 : k == 1 ? -1 : 0, k == 2 ? 1 : k == 3 ? -1 : 0));
      if (land(n) && ownerOf(n) != owner) edge = true;
    }
    if (edge) c = mix(c, inf.rgb, 0.35);
    // A lord's land (feedback 68): a sparse diaper of small dark crosses, like a fief's mantle.
    if (lordTag(id) > 0 && uMode == 0) {
      ivec2 d = ivec2(a.x + ((a.y >> 3) & 1) * 4, a.y) & 7;
      if ((d.x == 2 && d.y >= 1 && d.y <= 3) || (d.y == 2 && d.x >= 1 && d.x <= 3)) c = mix(c, uInk, 0.28);
    }
  }

  // Rivers: a winding band of water with dark banks.
  vec2 rv = riverDist(p, m - vec2(p));
  if (rv.y > 0.0) {
    float w = (rv.y > 1.5 ? 0.26 : 0.17) * (mini ? 1.3 : 1.0);
    if (rv.x < w) {
      float ripple = step(0.82, hash(a + ivec2(int(uTime * 2.0), 0)));
      c = riverFrozen(id, terrain, hash(a)) ? iceColor(m) : mix(mix(uDepth[0], SHALLOW_BASE, 0.5), uFoam, 0.25 * ripple);
    } else if (rv.x < w + 1.0 / art) {
      c = mix(c, uInk, 0.45);
    }
  }

  if (!mini && uLiving > 0.0) c = mix(c, livingTown(c, p, a, id, terrain, inf.rgb), uLiving);

  bool other1 = (land(iR) && ownerOf(iR) != owner) || (land(iL) && ownerOf(iL) != owner) || (land(iD) && ownerOf(iD) != owner) || (land(iU) && ownerOf(iU) != owner);
  if (!land(iR) || !land(iL) || !land(iD) || !land(iU)) {
    c = uSand;
  } else if (other1) {
    // Nation border: a dark ink line ...
    c = mix(uInk, inf.rgb, 0.18);
  } else {
    int jR = effId(m + vec2(2.0 * e, 0.0));
    int jL = effId(m - vec2(2.0 * e, 0.0));
    int jD = effId(m + vec2(0.0, 2.0 * e));
    int jU = effId(m - vec2(0.0, 2.0 * e));
    bool other2 = (land(jR) && ownerOf(jR) != owner) || (land(jL) && ownerOf(jL) != owner) || (land(jD) && ownerOf(jD) != owner) || (land(jU) && ownerOf(jU) != owner);
    if (other2 && political) {
      // ... with a bright band of the realm's own colour just inside it.
      c = mix(c, min(inf.rgb * 1.15 + 0.06, 1.0), 0.8);
    } else if (other2) {
      c = mix(c, uInk, 0.35);
    } else if (political && uMode == 0 && ((iR != id && lordTag(iR) != lordTag(id)) || (iL != id && lordTag(iL) != lordTag(id)) || (iD != id && lordTag(iD) != lordTag(id)) || (iU != id && lordTag(iU) != lordTag(id)))) {
      if (((a.x + a.y) >> 1 & 1) == 0) c = mix(c, uInk, 0.7); // dashed border between fiefs and royal land
    } else if ((iR != id || iL != id || iD != id || iU != id) && ((a.x + a.y) & 1) == 0) {
      c = mix(c, uInk, 0.5); // dotted province border
    }
  }
  return highlight(hatch(faded(c, id), id, a, max(2, size / 2)), id, 0.18);
}

// Rough height of a terrain, for hill shading on the far map.
float height(int t) {
  return t == ${T.mountains} || t == ${T.badlands} || t == ${T.snowpeaks} ? 2.0 : t == ${T.highlands} ? 1.6 : t == ${T.hills} ? 0.8 : 0.0;
}

vec3 far() {
  ivec2 p = ivec2(floor(vMap));
  int id = idAt(p);
  if (!land(id)) {
    // Ocean: depth bands dithered into each other, a light line along the
    // coast, sparse drifting glints, and faint dashes between sea zones.
    float v = (depthAt(p) * 2.0 + depthAt(p + ivec2(2, 0)) + depthAt(p - ivec2(2, 0)) + depthAt(p + ivec2(0, 2)) + depthAt(p - ivec2(0, 2))) / 6.0;
    vec3 c = depthColor(v, p);
    bool coast = land(idAt(p + ivec2(1, 0))) || land(idAt(p - ivec2(1, 0))) || land(idAt(p + ivec2(0, 1))) || land(idAt(p - ivec2(0, 1)));
    float glint = hash(ivec2(p.x + int(uTime * 1.5), p.y));
    if (coast && uZoom > 1.2) {
      c = mix(c, uFoam, 0.4);
    } else if (glint > 0.985 - 0.01 * v) {
      c = mix(c, uFoam, 0.25);
    } else if (id >= 0 && uZoom > 2.5) {
      int r = idAt(p + ivec2(1, 0));
      int d = idAt(p + ivec2(0, 1));
      if (((r >= 0 && r != id) || (d >= 0 && d != id)) && ((p.x + p.y) & 1) == 0) c = mix(c, uFoam, 0.15);
    }
    c = icedSea(c, vMap);
    return id >= 0 ? highlight(c, id, 0.2) : c;
  }

  vec4 inf = info(id);
  int t = terrainAt(p);
  vec3 c = seasonal(uTerrain[t], t, id, bayer(p));

  // Texture: a few darker pixels in fixed patterns, like old tile sets.
  float h = hash(p);
  float shade = h > 0.95 ? 0.92 : 1.0;
  if (t == ${T.forest} || t == ${T.jungle} || t == ${T.highlands} || t == ${T.broadleaf} || t == ${T.swamp}) shade = (p.x + p.y) % 3 == 0 && h > 0.4 ? 0.82 : 1.0;
  else if (t == ${T.farmland} || t == ${T.paddies}) shade = p.y % 2 == 0 ? 0.9 : 1.0;
  else if (t == ${T.marsh}) shade = p.y % 2 == 0 && h > 0.6 ? 0.82 : 1.0;
  else if (t == ${T.savanna}) shade = h > 0.88 ? 0.8 : 1.0;
  else if (t == ${T.desert} || t == ${T.dunes}) shade = (p.x + 2 * p.y) % 5 == 0 && h > 0.5 ? 0.9 : 1.0;
  c *= shade;

  // Hill shading, lit from the north-west: slopes rising to the south-east
  // catch the light, the far side falls into shadow. Peaks get snow.
  float rise = height(terrainAt(p + ivec2(1, 1))) + height(terrainAt(p + ivec2(2, 2))) - height(terrainAt(p - ivec2(1, 1))) - height(terrainAt(p - ivec2(2, 2)));
  c *= clamp(1.0 + 0.09 * rise, 0.7, 1.25);
  if ((t == ${T.mountains}) && height(terrainAt(p - ivec2(1, 1))) > 1.0 && h > 0.7) c = mix(c, vec3(0.95), 0.6);

  int owner = ownerOf(id);
  bool political = uMode != 1 && owner >= 0;
  if (political) c = snowOver(realmWash(c, inf.rgb), id, t, bayer(p));
  // Great rivers always, the rest once zoomed in a little.
  int rs = riverAt(p);
  if (rs == 2 && uZoom > 0.9 || rs == 1 && uZoom > 2.2) c = mix(c, riverFrozen(id, t, bayer(p)) ? iceColor(vec2(p)) : uDepth[0], 0.8);

  // Borders: nation borders always, with an inner band of the realm's
  // colour once pixels are big enough; province borders once zoomed in.
  int r = idAt(p + ivec2(1, 0));
  int d = idAt(p + ivec2(0, 1));
  bool nationEdge = (land(r) && ownerOf(r) != owner) || (land(d) && ownerOf(d) != owner);
  bool provinceEdge = (land(r) && r != id) || (land(d) && d != id);
  if (nationEdge) {
    c = mix(c, uInk, uZoom > 2.0 ? 0.85 : 0.65);
  } else if (political && uZoom > 2.0) {
    int l = idAt(p - ivec2(1, 0));
    int u = idAt(p - ivec2(0, 1));
    if ((land(l) && ownerOf(l) != owner) || (land(u) && ownerOf(u) != owner)) c = mix(c, inf.rgb, 0.7);
    else if (provinceEdge) c *= (land(r) && lordTag(r) != lordTag(id)) || (land(d) && lordTag(d) != lordTag(id)) ? 0.5 : 0.72;
    else if (uMode == 0 && lordTag(id) > 0 && uZoom > 3.0 && (p.x & 3) == 1 && (p.y & 3) == 1) c *= 0.8;
  } else if (provinceEdge && uZoom > 1.2) {
    c *= 0.72;
  }
  return highlight(hatch(faded(c, id), id, p, 2), id, 0.3);
}

// Undiscovered land and sea: old parchment with stains and a ruled grid.
bool unknown(int id) { return id >= 0 && (int(flags(id)) & 4) != 0; }
vec3 parchment(vec2 m) {
  float art = uZoom >= ${MID_ZOOM}.0 ? 8.0 : 1.0;
  ivec2 a = ivec2(floor(m * art));
  ivec2 big = ivec2(floor(m / 6.0));
  float stain = hash(big) * 0.5 + hash(ivec2(floor(m / 2.5))) * 0.5;
  vec3 c = mix(uParchment, uParchmentDark, step(0.72, stain) * 0.6 + step(bayer(a), stain - 0.45) * 0.25);
  if (hash(a) > 0.97) c = mix(c, uParchmentDark, 0.6);
  vec2 g = fract(m / 15.0);
  if ((g.x < 0.012 || g.y < 0.012) && ((a.x + a.y) & 1) == 0) c = mix(c, uInk, 0.25);
  return c;
}

// Land the chosen armies may not enter (owner b bit 16, MOVE-129): a faint red
// wash, and a red line on its side of every border with land they may enter.
bool shut(int id) { return id >= 0 && (int(texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).b * 255.0 + 0.5) & 16) != 0; }
vec3 forbidden(vec3 c, vec2 m) {
  bool tiles = uZoom >= ${MID_ZOOM}.0;
  float art = uZoom >= ${DETAIL_ZOOM}.0 ? ${TILE / 2}.0 : ${TILE / 4}.0;
  // Art pixel or map pixel centre, and a line about three screen pixels wide.
  vec2 q = tiles ? (floor(m * art) + 0.5) / art : floor(m) + 0.5;
  float d = tiles ? 2.0 / art : max(1.0, floor(3.0 / uZoom));
  int id = tiles ? effId(q) : idAt(ivec2(q));
  if (!land(id) || !shut(id)) return c;
  bool edge = false;
  for (int k = 0; k < 4; k++) {
    vec2 dir = vec2(k == 0 ? 1.0 : k == 1 ? -1.0 : 0.0, k == 2 ? 1.0 : k == 3 ? -1.0 : 0.0);
    for (int j = 1; j <= 2; j++) {
      vec2 at = q + dir * d * float(j) * 0.5;
      int n = tiles ? effId(at) : idAt(ivec2(floor(at)));
      if (land(n) && !shut(n) && !unknown(n)) edge = true;
    }
  }
  return edge ? mix(c, uForbid, 0.85) : mix(c, uForbid, 0.16);
}

void main() {
  vec2 m = vMap;
  int id = idAt(ivec2(floor(m)));
  if (unknown(id)) {
    outColor = vec4(parchment(m), 1.0);
    return;
  }
  vec3 c = uZoom >= ${DETAIL_ZOOM}.0 ? tiled(false) : uZoom >= ${MID_ZOOM}.0 ? tiled(true) : far();
  c = forbidden(c, m);
  // A dark seam where the known world meets the unknown.
  ivec2 p = ivec2(floor(m));
  if (unknown(idAt(p + ivec2(1, 0))) || unknown(idAt(p - ivec2(1, 0))) || unknown(idAt(p + ivec2(0, 1))) || unknown(idAt(p - ivec2(0, 1)))) {
    c = mix(c, uParchmentDark, 0.55);
  }
  outColor = vec4(c, 1.0);
}`;

interface Tile {
  texture: WebGLTexture;
  land: WebGLTexture;
  x: number;
  y: number;
  w: number;
  h: number;
  texW: number;
  texH: number;
  vao: WebGLVertexArrayObject;
}

/** Packs province `i`'s season into `out`: sea-level °C, and autumn, spring and wet season 0..1 (the engine's climate.ts). */
export function seasonBytes(out: Uint8Array, i: number, temperature: number, autumn: number, spring: number, wet: number): void {
  const o = i * 4;
  const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  out[o] = byte((temperature + 60) / 127.5);
  out[o + 1] = byte(autumn);
  out[o + 2] = byte(spring);
  out[o + 3] = byte(wet);
}

export class MapRenderer {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private tiles: Tile[] = [];
  private infoTex: WebGLTexture;
  private ownerTex: WebGLTexture;
  private seasonTex: WebGLTexture;
  private seasonData: Uint8Array;
  private atlasTex: WebGLTexture;
  private miniTex: WebGLTexture;
  private terrainColors: number[];
  private infoWidth = 256;
  private infoData: Uint8Array;
  private ownerData: Uint8Array;
  private townData: Uint8Array;
  private townTex: WebGLTexture;
  private townAtlasTex: WebGLTexture;
  private u: Record<string, WebGLUniformLocation | null> = {};
  mode: MapMode = "political";
  readonly canvas: HTMLCanvasElement;
  readonly map: MapImage;

  constructor(canvas: HTMLCanvasElement, map: MapImage, provinceCount: number) {
    this.canvas = canvas;
    this.map = map;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.program = link(gl, VERT, FRAG);
    for (const name of ["uCenter", "uZoom", "uView", "uIds", "uTileOrigin", "uTileSize", "uInfo", "uOwner", "uInfoWidth", "uTime", "uMode", "uParchment", "uParchmentDark", "uTerrain", "uDepth", "uFoam", "uInk", "uHighlight", "uSand", "uForbid", "uAtlas", "uMini", "uLand", "uSeason", "uTown", "uTownAtlas", "uLiving", "uRoad"]) {
      this.u[name] = gl.getUniformLocation(this.program, name);
    }

    // Split the id image into tiles the GPU can hold, with 1px overlap for border checks.
    const maxTex = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 4096);
    const tileSize = maxTex - 1;
    for (let ty = 0; ty < map.height; ty += tileSize) {
      for (let tx = 0; tx < map.width; tx += tileSize) {
        const w = Math.min(tileSize, map.width - tx);
        const h = Math.min(tileSize, map.height - ty);
        const texW = Math.min(w + 1, map.width - tx);
        const texH = Math.min(h + 1, map.height - ty);
        this.tiles.push(this.makeTile(tx, ty, w, h, texW, texH));
      }
    }

    const rows = Math.ceil(provinceCount / this.infoWidth);
    this.infoData = new Uint8Array(this.infoWidth * rows * 4);
    this.ownerData = new Uint8Array(this.infoWidth * rows * 4);
    this.infoTex = makeDataTexture(gl, this.infoWidth, rows);
    this.ownerTex = makeDataTexture(gl, this.infoWidth, rows);
    this.seasonData = new Uint8Array(this.infoWidth * rows * 4);
    this.seasonTex = makeDataTexture(gl, this.infoWidth, rows);

    const atlas = buildTileAtlas();
    this.atlasTex = makeDataTexture(gl, atlas.width, atlas.height);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, atlas.width, atlas.height, gl.RGBA, gl.UNSIGNED_BYTE, atlas.rgba);
    if (atlas.height !== ATLAS_ROWS * TILE) throw new Error("tile atlas has the wrong size");
    this.townData = new Uint8Array(this.infoWidth * rows * 4);
    this.townTex = makeDataTexture(gl, this.infoWidth, rows);
    const town = buildTownAtlas();
    if (town.width !== TOWN_VARIANTS * TOWN_TILE || town.height !== TOWN_ROWS * TOWN_TILE) throw new Error("town atlas has the wrong size");
    this.townAtlasTex = makeDataTexture(gl, town.width, town.height);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, town.width, town.height, gl.RGBA, gl.UNSIGNED_BYTE, town.rgba);
    const mini = buildMiniAtlas();
    this.miniTex = makeDataTexture(gl, mini.width, mini.height);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, mini.width, mini.height, gl.RGBA, gl.UNSIGNED_BYTE, mini.rgba);
    this.terrainColors = rowColors(atlas).slice(0, TERRAINS.length * 3);
  }

  private makeTile(x: number, y: number, w: number, h: number, texW: number, texH: number): Tile {
    const gl = this.gl;
    const pixels = new Uint8Array(texW * texH * 4);
    for (let row = 0; row < texH; row++) {
      const start = ((y + row) * this.map.width + x) * 4;
      pixels.set(this.map.rgba.subarray(start, start + texW * 4), row * texW * 4);
    }
    // The alpha holds the settlement byte (VIEW-115), none until the living map lays its towns.
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 0;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, texW, texH, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    setNearest(gl);

    const terrain = new Uint8Array(texW * texH * 3);
    for (let row = 0; row < texH; row++) {
      const start = (y + row) * this.map.width + x;
      terrain.set(this.map.terrain.subarray(start * 3, (start + texW) * 3), row * texW * 3);
    }
    const land = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, land);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, texW, texH, 0, gl.RGB, gl.UNSIGNED_BYTE, terrain);
    setNearest(gl);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x, y, x + w, y, x, y + h, x + w, y + h]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { texture, land, x, y, w, h, texW, texH, vao };
  }

  /**
   * Sets each province's fill colour, owner and flags.
   * flags: 1 = selected, 2 = highlighted (e.g. a move target, a lord's lands), 4 = undiscovered.
   * lord: the lord holding it, -1 for royal land (drawn as a fief border and a pattern).
   * fade: land drawn faded to grey, so the provinces that are not stand out.
   * closed: land the armies being moved may not enter, drawn with red borders.
   */
  setProvinceStyle(i: number, rgb: readonly number[], owner: number, terrain: number, flags: number, water = false, lord = -1, fade = false, closed = false): void {
    const o = i * 4;
    this.infoData[o] = rgb[0]!;
    this.infoData[o + 1] = rgb[1]!;
    this.infoData[o + 2] = rgb[2]!;
    this.infoData[o + 3] = (terrain & 15) | (flags << 4);
    const ow = owner + 1;
    this.ownerData[o] = (ow >> 8) & 255;
    this.ownerData[o + 1] = ow & 255;
    this.ownerData[o + 2] = water ? 255 : (fade ? 64 : 0) | (closed ? 16 : 0);
    this.ownerData[o + 3] = lord >= 0 ? (lord % 255) + 1 : 0;
  }

  /** A province's town for the living map: walls (0 none, 1 palisade, 2 stone), road grade (0 track, 1 road, 2 paved), worship variant and style. */
  setTownInfo(i: number, walls: number, roadGrade: number, worship: number, style: number): void {
    const o = i * 4;
    this.townData[o] = walls;
    this.townData[o + 1] = roadGrade;
    this.townData[o + 2] = worship;
    this.townData[o + 3] = style;
    this.townDirty = true;
  }
  private townDirty = false;

  /** How far the living map has faded in, 0..1 (VIEW-101). */
  living = 0;

  /**
   * Writes the settlement bytes of a box of map pixels into the alpha of the
   * id textures it touches, leaving the rest of the GPU's copy alone (VIEW-115).
   */
  setSettlement(bytes: Uint8Array, box: { x0: number; y0: number; x1: number; y1: number }): void {
    const gl = this.gl;
    const W = this.map.width;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    for (const t of this.tiles) {
      const x0 = Math.max(box.x0, t.x), y0 = Math.max(box.y0, t.y);
      const x1 = Math.min(box.x1, t.x + t.texW - 1), y1 = Math.min(box.y1, t.y + t.texH - 1);
      if (x1 < x0 || y1 < y0) continue;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const buf = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) {
        const row = (y0 + y) * W + x0;
        buf.set(this.map.rgba.subarray(row * 4, (row + w) * 4), y * w * 4);
        for (let x = 0; x < w; x++) buf[(y * w + x) * 4 + 3] = bytes[row + x]!;
      }
      gl.bindTexture(gl.TEXTURE_2D, t.texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x0 - t.x, y0 - t.y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    }
  }

  /** Every province's season for this turn, four bytes each, as seasonBytes() packs them. */
  setProvinceSeasons(bytes: Uint8Array): void {
    this.seasonData.set(bytes);
    this.seasonDirty = true;
  }
  private seasonDirty = false;

  uploadProvinceStyles(): void {
    const gl = this.gl;
    const rows = this.infoData.length / 4 / this.infoWidth;
    gl.bindTexture(gl.TEXTURE_2D, this.infoTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoWidth, rows, gl.RGBA, gl.UNSIGNED_BYTE, this.infoData);
    gl.bindTexture(gl.TEXTURE_2D, this.ownerTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoWidth, rows, gl.RGBA, gl.UNSIGNED_BYTE, this.ownerData);
    if (this.townDirty) {
      gl.bindTexture(gl.TEXTURE_2D, this.townTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoWidth, rows, gl.RGBA, gl.UNSIGNED_BYTE, this.townData);
      this.townDirty = false;
    }
    if (this.seasonDirty) {
      gl.bindTexture(gl.TEXTURE_2D, this.seasonTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoWidth, rows, gl.RGBA, gl.UNSIGNED_BYTE, this.seasonData);
      this.seasonDirty = false;
    }
  }

  draw(camera: Camera, time: number): void {
    const gl = this.gl;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    gl.clearColor(...(hexToRgb(PALETTE.deepSea).map((v) => v / 255) as [number, number, number]), 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.uniform2f(this.u.uView!, width, height);
    gl.uniform1f(this.u.uZoom!, camera.zoom);
    gl.uniform1f(this.u.uTime!, time);
    gl.uniform1i(this.u.uMode!, this.mode === "political" ? 0 : this.mode === "terrain" ? 1 : 2);
    gl.uniform3fv(this.u.uParchment!, hexToRgb(UI_COLORS.parchment).map((v) => v / 255));
    gl.uniform3fv(this.u.uParchmentDark!, hexToRgb(UI_COLORS.parchmentDark).map((v) => v / 255));
    gl.uniform1i(this.u.uInfoWidth!, this.infoWidth);
    gl.uniform3fv(this.u.uTerrain!, this.terrainColors);
    gl.uniform3fv(this.u.uDepth!, DEPTH_COLORS.flatMap((c) => hexToRgb(c).map((v) => v / 255)));
    const col = (name: string, hex: string) => gl.uniform3f(this.u[name]!, ...(hexToRgb(hex).map((v) => v / 255) as [number, number, number]));
    col("uFoam", PALETTE.foam);
    col("uInk", PALETTE.ink);
    col("uHighlight", PALETTE.paper);
    col("uSand", PALETTE.sand);
    col("uForbid", PALETTE.blood);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.infoTex);
    gl.uniform1i(this.u.uInfo!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.ownerTex);
    gl.uniform1i(this.u.uOwner!, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(this.u.uAtlas!, 3);
    gl.uniform1i(this.u.uLand!, 4);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.miniTex);
    gl.uniform1i(this.u.uMini!, 5);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.seasonTex);
    gl.uniform1i(this.u.uSeason!, 6);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, this.townTex);
    gl.uniform1i(this.u.uTown!, 7);
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.townAtlasTex);
    gl.uniform1i(this.u.uTownAtlas!, 8);
    gl.uniform1f(this.u.uLiving!, this.living);
    gl.uniform3fv(this.u.uRoad!, ["#8a6a44", PALETTE.clay, "#9a94a0"].flatMap((c) => hexToRgb(c).map((v) => v / 255)));
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.u.uIds!, 0);

    // The world wraps east-west: draw the copies that are on screen.
    const halfW = width / 2 / camera.zoom;
    const halfH = height / 2 / camera.zoom;
    for (let k = -1; k <= 1; k++) {
      const cx = camera.x - k * this.map.width;
      for (const t of this.tiles) {
        if (t.x + t.w < cx - halfW || t.x > cx + halfW || t.y + t.h < camera.y - halfH || t.y > camera.y + halfH) continue;
        gl.uniform2f(this.u.uCenter!, cx, camera.y);
        gl.uniform2i(this.u.uTileOrigin!, t.x, t.y);
        gl.uniform2i(this.u.uTileSize!, t.texW, t.texH);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, t.land);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, t.texture);
        gl.bindVertexArray(t.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    gl.bindVertexArray(null);
  }
}

function setNearest(gl: WebGL2RenderingContext) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function makeDataTexture(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  setNearest(gl);
  return tex;
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link error");
  return p;
}
