import { hexToRgb, PALETTE, TERRAIN_COLORS, TERRAINS } from "../art/palette.ts";
import type { MapImage } from "./loadMap.ts";

/**
 * WebGL2 world map. The province id image is uploaded once; colours live in
 * a small per-province lookup texture, so changing owners, selection or map
 * mode only rewrites a few kilobytes instead of millions of pixels.
 * Each map pixel is drawn as a crisp block (nearest filtering) for the 8-bit look.
 */

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

const FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vMap;
uniform sampler2D uIds;      // this tile's province ids (RGB = id + 1)
uniform ivec2 uTileOrigin;   // tile's top-left in map pixels
uniform ivec2 uTileSize;     // texels in this tile's texture (includes 1px overlap)
uniform sampler2D uInfo;     // per-province: rgb = fill colour, a = flags
uniform sampler2D uOwner;    // per-province: rg = owner index + 1
uniform int uInfoWidth;
uniform float uZoom;
uniform float uTime;
uniform int uMode;           // 0 political, 1 terrain
uniform vec3 uTerrain[10];
uniform vec3 uSea, uDeepSea, uFoam, uInk, uHighlight;
out vec4 outColor;

int idAt(ivec2 p) {
  ivec2 local = clamp(p - uTileOrigin, ivec2(0), uTileSize - 1);
  vec3 c = texelFetch(uIds, local, 0).rgb * 255.0 + 0.5;
  return (int(c.r) << 16 | int(c.g) << 8 | int(c.b)) - 1;
}
vec4 info(int id) { return texelFetch(uInfo, ivec2(id % uInfoWidth, id / uInfoWidth), 0); }
int ownerOf(int id) {
  vec2 o = texelFetch(uOwner, ivec2(id % uInfoWidth, id / uInfoWidth), 0).rg * 255.0 + 0.5;
  return int(o.r) * 256 + int(o.g) - 1;
}
float hash(ivec2 p) {
  uint h = uint(p.x) * 374761393u + uint(p.y) * 668265263u;
  h = (h ^ (h >> 13)) * 1274126177u;
  return float(h & 0xffffu) / 65535.0;
}

void main() {
  ivec2 p = ivec2(floor(vMap));
  int id = idAt(p);
  if (id < 0) {
    // Sea: dithered deep water, a light line where it meets the coast.
    bool coast = idAt(p + ivec2(1, 0)) >= 0 || idAt(p - ivec2(1, 0)) >= 0 || idAt(p + ivec2(0, 1)) >= 0 || idAt(p - ivec2(0, 1)) >= 0;
    float wave = hash(ivec2(p.x + int(uTime * 1.5), p.y));
    vec3 c = wave > 0.93 ? uSea : uDeepSea;
    if (coast && uZoom > 1.5) c = mix(uSea, uFoam, 0.35);
    outColor = vec4(c, 1.0);
    return;
  }

  vec4 inf = info(id);
  int terrain = int(inf.a * 255.0 + 0.5) & 15;
  int flags = int(inf.a * 255.0 + 0.5) >> 4;
  vec3 c = uMode == 0 ? inf.rgb : uTerrain[terrain];

  // Terrain texture: a few darker pixels in fixed patterns, like old tile sets.
  float h = hash(p);
  float shade = 1.0;
  if (terrain == 3) shade = (p.y % 3 == 0 && (p.x + p.y / 3) % 4 == 0) || h > 0.86 ? 0.72 : 1.0;      // mountains
  else if (terrain == 6 || terrain == 9) shade = (p.x + p.y) % 3 == 0 && h > 0.4 ? 0.8 : 1.0;          // forest, jungle
  else if (terrain == 2) shade = p.y % 4 == 0 && h > 0.5 ? 0.86 : 1.0;                                    // hills
  else if (terrain == 7 || terrain == 4) shade = h > 0.92 ? 0.85 : 1.0;                                   // desert, drylands
  else if (terrain == 5) shade = p.y % 2 == 0 && h > 0.7 ? 0.84 : 1.0;                                    // marsh
  else shade = h > 0.95 ? 0.9 : 1.0;
  c *= mix(1.0, shade, uMode == 0 ? 0.6 : 1.0);

  // Borders: nation borders always, province borders once zoomed in.
  int owner = ownerOf(id);
  int r = idAt(p + ivec2(1, 0));
  int d = idAt(p + ivec2(0, 1));
  bool nationEdge = (r >= 0 && ownerOf(r) != owner) || (d >= 0 && ownerOf(d) != owner);
  bool provinceEdge = (r >= 0 && r != id) || (d >= 0 && d != id);
  if (nationEdge) c = mix(c, uInk, uZoom > 2.0 ? 0.85 : 0.6);
  else if (provinceEdge && uZoom > 1.2) c *= 0.7;

  // Selected province blinks; flagged targets (move orders) get a steady tint.
  if ((flags & 1) != 0) c = mix(c, uHighlight, 0.35 + 0.25 * step(0.5, fract(uTime * 1.5)));
  if ((flags & 2) != 0) c = mix(c, uHighlight, 0.25);
  outColor = vec4(c, 1.0);
}`;

interface Tile {
  texture: WebGLTexture;
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
    for (const name of ["uCenter", "uZoom", "uView", "uIds", "uTileOrigin", "uTileSize", "uInfo", "uOwner", "uInfoWidth", "uTime", "uMode", "uTerrain", "uSea", "uDeepSea", "uFoam", "uInk", "uHighlight"]) {
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

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x, y, x + w, y, x, y + h, x + w, y + h]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { texture, x, y, w, h, texW, texH, vao };
  }

  /**
   * Sets each province's fill colour, owner and flags.
   * flags: 1 = selected, 2 = highlighted (e.g. a move target).
   */
  setProvinceStyle(i: number, rgb: readonly number[], owner: number, terrain: number, flags: number): void {
    const o = i * 4;
    this.infoData[o] = rgb[0]!;
    this.infoData[o + 1] = rgb[1]!;
    this.infoData[o + 2] = rgb[2]!;
    this.infoData[o + 3] = (terrain & 15) | (flags << 4);
    const ow = owner + 1;
    this.ownerData[o] = (ow >> 8) & 255;
    this.ownerData[o + 1] = ow & 255;
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
    gl.uniform3fv(this.u.uTerrain!, TERRAINS.flatMap((t) => hexToRgb(TERRAIN_COLORS[t]).map((v) => v / 255)));
    const col = (name: string, hex: string) => gl.uniform3f(this.u[name]!, ...(hexToRgb(hex).map((v) => v / 255) as [number, number, number]));
    col("uSea", PALETTE.sea);
    col("uDeepSea", PALETTE.deepSea);
    col("uFoam", PALETTE.foam);
    col("uInk", PALETTE.ink);
    col("uHighlight", PALETTE.paper);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.infoTex);
    gl.uniform1i(this.u.uInfo!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.ownerTex);
    gl.uniform1i(this.u.uOwner!, 2);
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
