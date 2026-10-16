import { DEPTH_COLORS, hexToRgb, PALETTE, TERRAINS } from "../art/palette.ts";
import { ATLAS_ROWS, BIG_ROWS, buildMiniAtlas, buildTileAtlas, rowColors, SEA_ROW, SHALLOW_ROW, TILE, VARIANTS, WATER_BASE } from "../art/tiles.ts";
import type { MapImage } from "./loadMap.ts";

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

export type MapMode = "political" | "terrain";

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
uniform sampler2D uLand;     // this tile's terrain per pixel (R = terrain index, G = water depth band + 1)
uniform ivec2 uTileOrigin;   // tile's top-left in map pixels
uniform ivec2 uTileSize;     // texels in this tile's texture (includes 1px overlap)
uniform sampler2D uInfo;     // per-province: rgb = fill colour, a = flags
uniform sampler2D uOwner;    // per-province: rg = owner index + 1, b = 255 for sea zones
uniform int uInfoWidth;
uniform float uZoom;
uniform float uTime;
uniform int uMode;           // 0 political, 1 terrain
uniform vec3 uTerrain[${TERRAINS.length}];  // average colour of each terrain's tiles
uniform vec3 uDepth[${DEPTH_COLORS.length}];     // ocean colour by depth band
uniform vec3 uFoam, uInk, uHighlight, uSand;
uniform sampler2D uAtlas;    // terrain tiles: ${VARIANTS} variants across, one row per terrain
uniform sampler2D uMini;     // the same at half size
out vec4 outColor;

const vec3 SEA_BASE = ${glsl(WATER_BASE.sea)};
const vec3 SHALLOW_BASE = ${glsl(WATER_BASE.shallow)};

int idAt(ivec2 p) {
  ivec2 local = clamp(p - uTileOrigin, ivec2(0), uTileSize - 1);
  vec3 c = texelFetch(uIds, local, 0).rgb * 255.0 + 0.5;
  return (int(c.r) << 16 | int(c.g) << 8 | int(c.b)) - 1;
}
vec2 landAt(ivec2 p) {
  ivec2 local = clamp(p - uTileOrigin, ivec2(0), uTileSize - 1);
  return texelFetch(uLand, local, 0).rg * 255.0 + 0.5;
}
int terrainAt(ivec2 p) { return min(int(landAt(p).r), ${TERRAINS.length - 1}); }
// Depth band of a map pixel; land counts as the shallowest so coasts stay light.
float depthAt(ivec2 p) { return max(floor(landAt(p).g) - 1.0, 0.0); }
vec4 info(int id) { return texelFetch(uInfo, ivec2(id % uInfoWidth, id / uInfoWidth), 0); }
int ownerOf(int id) {
  vec2 o = texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).rg * 255.0 + 0.5;
  return int(o.r) * 256 + int(o.g) - 1;
}
// Land province (not a lake, not a sea zone).
bool land(int id) {
  return id >= 0 && texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).b < 0.5;
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
vec3 highlight(vec3 c, int id, float strength) {
  int f = int(flags(id));
  if ((f & 1) != 0) c = mix(c, uHighlight, strength + strength * step(0.5, fract(uTime * 1.5)));
  if ((f & 2) != 0) c = mix(c, uHighlight, strength * 1.2);
  return c;
}
// How much of the realm's colour to lay over the terrain: more when far out,
// so realms read at a glance, less up close where the art carries the map.
float wash() { return mix(0.62, 0.3, smoothstep(1.0, ${DETAIL_ZOOM}.0, uZoom)); }
vec3 realmWash(vec3 terrain, vec3 realm) {
  return mix(terrain, realm * (0.45 + 0.85 * lum(terrain)), wash());
}

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
  vec3 c = tileAt(mini, terrain, variant, local);
  int owner = ownerOf(id);
  bool political = uMode == 0 && owner >= 0;
  if (political) {
    c = realmWash(c, inf.rgb);
    // A wider band of the owner's colour along its borders.
    bool edge = false;
    for (int k = 0; k < 4; k++) {
      int n = idAt(p + ivec2(k == 0 ? 1 : k == 1 ? -1 : 0, k == 2 ? 1 : k == 3 ? -1 : 0));
      if (land(n) && ownerOf(n) != owner) edge = true;
    }
    if (edge) c = mix(c, inf.rgb, 0.35);
  }

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
    } else if ((iR != id || iL != id || iD != id || iU != id) && ((a.x + a.y) & 1) == 0) {
      c = mix(c, uInk, 0.5); // dotted province border
    }
  }
  return highlight(c, id, 0.18);
}

// Rough height of a terrain, for hill shading on the far map.
float height(int t) {
  return t == ${T.mountains} || t == ${T.badlands} ? 2.0 : t == ${T.highlands} ? 1.6 : t == ${T.hills} ? 0.8 : 0.0;
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
    return id >= 0 ? highlight(c, id, 0.2) : c;
  }

  vec4 inf = info(id);
  int t = terrainAt(p);
  vec3 c = uTerrain[t];

  // Texture: a few darker pixels in fixed patterns, like old tile sets.
  float h = hash(p);
  float shade = h > 0.95 ? 0.92 : 1.0;
  if (t == ${T.forest} || t == ${T.jungle} || t == ${T.highlands}) shade = (p.x + p.y) % 3 == 0 && h > 0.4 ? 0.82 : 1.0;
  else if (t == ${T.farmland}) shade = p.y % 2 == 0 ? 0.9 : 1.0;
  else if (t == ${T.marsh}) shade = p.y % 2 == 0 && h > 0.6 ? 0.82 : 1.0;
  else if (t == ${T.savanna}) shade = h > 0.88 ? 0.8 : 1.0;
  else if (t == ${T.desert}) shade = (p.x + 2 * p.y) % 5 == 0 && h > 0.5 ? 0.9 : 1.0;
  c *= shade;

  // Hill shading, lit from the north-west: slopes rising to the south-east
  // catch the light, the far side falls into shadow. Peaks get snow.
  float rise = height(terrainAt(p + ivec2(1, 1))) + height(terrainAt(p + ivec2(2, 2))) - height(terrainAt(p - ivec2(1, 1))) - height(terrainAt(p - ivec2(2, 2)));
  c *= clamp(1.0 + 0.09 * rise, 0.7, 1.25);
  if ((t == ${T.mountains}) && height(terrainAt(p - ivec2(1, 1))) > 1.0 && h > 0.7) c = mix(c, vec3(0.95), 0.6);

  int owner = ownerOf(id);
  bool political = uMode == 0 && owner >= 0;
  if (political) c = realmWash(c, inf.rgb);

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
    else if (provinceEdge) c *= 0.72;
  } else if (provinceEdge && uZoom > 1.2) {
    c *= 0.72;
  }
  return highlight(c, id, 0.3);
}

void main() {
  vec3 c = uZoom >= ${DETAIL_ZOOM}.0 ? tiled(false) : uZoom >= ${MID_ZOOM}.0 ? tiled(true) : far();
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

export class MapRenderer {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private tiles: Tile[] = [];
  private infoTex: WebGLTexture;
  private ownerTex: WebGLTexture;
  private atlasTex: WebGLTexture;
  private miniTex: WebGLTexture;
  private terrainColors: number[];
  private infoWidth = 256;
  private infoData: Uint8Array;
  private ownerData: Uint8Array;
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
    for (const name of ["uCenter", "uZoom", "uView", "uIds", "uTileOrigin", "uTileSize", "uInfo", "uOwner", "uInfoWidth", "uTime", "uMode", "uTerrain", "uDepth", "uFoam", "uInk", "uHighlight", "uSand", "uAtlas", "uMini", "uLand"]) {
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

    const atlas = buildTileAtlas();
    this.atlasTex = makeDataTexture(gl, atlas.width, atlas.height);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, atlas.width, atlas.height, gl.RGBA, gl.UNSIGNED_BYTE, atlas.rgba);
    if (atlas.height !== ATLAS_ROWS * TILE) throw new Error("tile atlas has the wrong size");
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
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, texW, texH, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    setNearest(gl);

    const terrain = new Uint8Array(texW * texH * 2);
    for (let row = 0; row < texH; row++) {
      const start = (y + row) * this.map.width + x;
      terrain.set(this.map.terrain.subarray(start * 2, (start + texW) * 2), row * texW * 2);
    }
    const land = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, land);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, texW, texH, 0, gl.RG, gl.UNSIGNED_BYTE, terrain);
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
   * flags: 1 = selected, 2 = highlighted (e.g. a move target).
   */
  setProvinceStyle(i: number, rgb: readonly number[], owner: number, terrain: number, flags: number, water = false): void {
    const o = i * 4;
    this.infoData[o] = rgb[0]!;
    this.infoData[o + 1] = rgb[1]!;
    this.infoData[o + 2] = rgb[2]!;
    this.infoData[o + 3] = (terrain & 15) | (flags << 4);
    const ow = owner + 1;
    this.ownerData[o] = (ow >> 8) & 255;
    this.ownerData[o + 1] = ow & 255;
    this.ownerData[o + 2] = water ? 255 : 0;
  }

  uploadProvinceStyles(): void {
    const gl = this.gl;
    const rows = this.infoData.length / 4 / this.infoWidth;
    gl.bindTexture(gl.TEXTURE_2D, this.infoTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoWidth, rows, gl.RGBA, gl.UNSIGNED_BYTE, this.infoData);
    gl.bindTexture(gl.TEXTURE_2D, this.ownerTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoWidth, rows, gl.RGBA, gl.UNSIGNED_BYTE, this.ownerData);
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
    gl.uniform1i(this.u.uMode!, this.mode === "political" ? 0 : 1);
    gl.uniform1i(this.u.uInfoWidth!, this.infoWidth);
    gl.uniform3fv(this.u.uTerrain!, this.terrainColors);
    gl.uniform3fv(this.u.uDepth!, DEPTH_COLORS.flatMap((c) => hexToRgb(c).map((v) => v / 255)));
    const col = (name: string, hex: string) => gl.uniform3f(this.u[name]!, ...(hexToRgb(hex).map((v) => v / 255) as [number, number, number]));
    col("uFoam", PALETTE.foam);
    col("uInk", PALETTE.ink);
    col("uHighlight", PALETTE.paper);
    col("uSand", PALETTE.sand);

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
