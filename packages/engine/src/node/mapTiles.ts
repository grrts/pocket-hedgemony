import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import type { Ruleset } from "@ph/rules";
import { tileGridFromImages, type TileGrid } from "../tiles.ts";

/**
 * The real map's tile grid for Node (tests, benchmarks, tools): decodes the
 * generated province and terrain images the client draws from. Node only, so
 * the browser build never pulls it in.
 */
const MAP_DIR = new URL("../../../../apps/client/public/map/", import.meta.url);

let cached: { rules: Ruleset; grid: TileGrid } | null = null;

export function loadMapTiles(rules: Ruleset): TileGrid {
  if (cached?.rules === rules) return cached.grid;
  const ids = decodeRgb(fileURLToPath(new URL("provinces.png", MAP_DIR)));
  const terrain = decodeRgb(fileURLToPath(new URL("terrain.png", MAP_DIR)));
  const n = ids.width * ids.height;
  const province = new Uint16Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 3) province[p] = (ids.rgb[i]! << 16) | (ids.rgb[i + 1]! << 8) | ids.rgb[i + 2]!;
  const grid = tileGridFromImages(rules, ids.width, ids.height, province, terrain.rgb);
  cached = { rules, grid };
  return grid;
}

/** An 8-bit RGB PNG (as tools/mapgen writes them), with any row filters undone. */
export function decodeRgb(path: string): { width: number; height: number; rgb: Uint8Array } {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 2) throw new Error(`${path}: only 8-bit RGB PNGs are read`);
    } else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 3;
  const rgb = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? rgb[out + x - 3]! : 0;
      const up = y > 0 ? rgb[out - stride + x]! : 0;
      const upLeft = x >= 3 && y > 0 ? rgb[out - stride + x - 3]! : 0;
      let v = raw[src + x]!;
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      rgb[out + x] = v & 255;
    }
  }
  return { width, height, rgb };
}
