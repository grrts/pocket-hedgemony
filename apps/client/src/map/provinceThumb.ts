import type { MapImage } from "./loadMap.ts";
import { DEPTH_COLORS, PALETTE, TERRAIN_COLORS, TERRAINS, hexToRgb } from "../art/palette.ts";

/**
 * Small pictures of single provinces for the lists (feedback 63): the
 * province's own shape in its terrain, washed with its holder's colour and
 * outlined in ink, its neighbours faded round it and the sea in blue. One
 * pass over the map finds every province's box the first time a picture is
 * asked for; pictures are cached by province, colour and size.
 */

let boxes: Int32Array | null = null;
let boxesFor: MapImage | null = null;

function provinceBoxes(img: MapImage, count: number): Int32Array {
  if (boxes && boxesFor === img) return boxes;
  const b = new Int32Array(count * 4);
  for (let i = 0; i < count; i++) b.set([img.width, img.height, -1, -1], i * 4);
  for (let y = 0, p = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++, p++) {
      const id = img.ids[p]!;
      if (id < 0 || id >= count) continue;
      const o = id * 4;
      if (x < b[o]!) b[o] = x;
      if (y < b[o + 1]!) b[o + 1] = y;
      if (x > b[o + 2]!) b[o + 2] = x;
      if (y > b[o + 3]!) b[o + 3] = y;
    }
  }
  boxes = b;
  boxesFor = img;
  return b;
}

const terrainRgb = TERRAINS.map((t) => hexToRgb(TERRAIN_COLORS[t]));
const sea = hexToRgb(DEPTH_COLORS[1]);
const ink = hexToRgb(PALETTE.ink);
const paper = hexToRgb(PALETTE.paper);
const cache = new Map<string, string>();

/** A square picture of province p, `size` pixels across, as a data URL. */
export function provinceThumb(img: MapImage, count: number, p: number, color: string, size = 48): string {
  const key = `${p}|${color}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const b = provinceBoxes(img, count);
  const [x0, y0, x1, y1] = [b[p * 4]!, b[p * 4 + 1]!, b[p * 4 + 2]!, b[p * 4 + 3]!];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (x1 < 0) return (cache.set(key, canvas.toDataURL()), cache.get(key)!);
  // A square window round the province with a margin, in whole map pixels per thumb pixel or less.
  const span = Math.max(x1 - x0 + 1, y1 - y0 + 1) * 1.15 + 3;
  const cx = (x0 + x1 + 1) / 2;
  const cy = (y0 + y1 + 1) / 2;
  const step = span / size;
  const realm = hexToRgb(color);
  const out = ctx.createImageData(size, size);
  const at = (tx: number, ty: number) => {
    const mx = Math.floor(cx - span / 2 + (tx + 0.5) * step);
    const my = Math.floor(cy - span / 2 + (ty + 0.5) * step);
    if (mx < 0 || my < 0 || mx >= img.width || my >= img.height) return -1;
    return my * img.width + mx;
  };
  const idAt = (tx: number, ty: number) => {
    const m = at(tx, ty);
    return m < 0 ? -1 : img.ids[m]!;
  };
  for (let ty = 0; ty < size; ty++) {
    for (let tx = 0; tx < size; tx++) {
      const m = at(tx, ty);
      const id = m < 0 ? -1 : img.ids[m]!;
      let c: readonly number[];
      if (id < 0) c = sea;
      else {
        const t = terrainRgb[Math.min(img.terrain[m * 3]!, terrainRgb.length - 1)] ?? paper;
        if (id === p) {
          const edge = idAt(tx + 1, ty) !== p || idAt(tx - 1, ty) !== p || idAt(tx, ty + 1) !== p || idAt(tx, ty - 1) !== p;
          c = edge ? ink : t.map((v, k) => Math.round(v * 0.7 + realm[k]! * 0.3));
        } else {
          // Neighbours fade towards parchment, so the province stands out.
          c = t.map((v, k) => Math.round(v * 0.35 + paper[k]! * 0.65));
        }
      }
      const o = (ty * size + tx) * 4;
      out.data[o] = c[0]!;
      out.data[o + 1] = c[1]!;
      out.data[o + 2] = c[2]!;
      out.data[o + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
