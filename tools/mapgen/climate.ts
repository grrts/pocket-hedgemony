// Köppen-Geiger climate per location, from Beck et al. (2018), "Present and
// future Köppen-Geiger climate classification maps at 1-km resolution",
// Scientific Data 5:180214 (CC BY 4.0). We use the 1/36° resampling shipped
// in the kgcpy package (BSD-3), which is a PNG with one class number per pixel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync, inflateSync } from "node:zlib";

const WHEEL = "https://files.pythonhosted.org/packages/py3/k/kgcpy/kgcpy-1.1.8-py3-none-any.whl";
const ENTRY = "kgcpy/kmz_int_reshape.png";

/** Class number (1-31) to Köppen code; 32 is ocean. */
export const KOPPEN = [
  "", "Af", "Am", "As", "Aw", "BSh", "BSk", "BWh", "BWk", "Cfa", "Cfb", "Cfc", "Csa", "Csb", "Csc", "Cwa", "Cwb",
  "Cwc", "Dfa", "Dfb", "Dfc", "Dfd", "Dsa", "Dsb", "Dsc", "Dsd", "Dwa", "Dwb", "Dwc", "Dwd", "EF", "ET", "Ocean",
];

export interface ClimateMap {
  width: number;
  height: number;
  data: Uint8Array;
  /** Köppen code at a longitude and latitude ("" if unknown or sea). */
  at(lon: number, lat: number): string;
}

/** Reads one stored or deflated file out of a zip archive. */
function unzipEntry(zip: Buffer, name: string): Buffer {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extra = zip.readUInt16LE(p + 30);
    const comment = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    if (zip.toString("utf8", p + 46, p + 46 + nameLen) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const body = zip.subarray(start, start + size);
      return method === 0 ? body : inflateRawSync(body);
    }
    p += 46 + nameLen + extra + comment;
  }
  throw new Error(`${name} not found in archive`);
}

/** Decodes an 8-bit greyscale, non-interlaced PNG. */
function decodePngGray(png: Buffer): { width: number; height: number; data: Uint8Array } {
  let p = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (p < png.length) {
    const len = png.readUInt32BE(p);
    const type = png.toString("ascii", p + 4, p + 8);
    const body = png.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 0 || body[12] !== 0) throw new Error("expected an 8-bit greyscale PNG");
    } else if (type === "IDAT") idat.push(body);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)]!;
    const row = raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1));
    for (let x = 0; x < width; x++) {
      const a = x > 0 ? data[y * width + x - 1]! : 0;
      const b = y > 0 ? data[(y - 1) * width + x]! : 0;
      const c = x > 0 && y > 0 ? data[(y - 1) * width + x - 1]! : 0;
      let v = row[x]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[y * width + x] = v & 255;
    }
  }
  return { width, height, data };
}

export async function loadClimate(cacheDir: string): Promise<ClimateMap> {
  const file = join(cacheDir, "koppen.png");
  if (!existsSync(file)) {
    mkdirSync(cacheDir, { recursive: true });
    console.log("downloading Köppen-Geiger climate map…");
    const res = await fetch(WHEEL);
    if (!res.ok) throw new Error(`download climate map: HTTP ${res.status}`);
    writeFileSync(file, unzipEntry(Buffer.from(await res.arrayBuffer()), ENTRY));
  }
  const { width, height, data } = decodePngGray(readFileSync(file));
  return {
    width,
    height,
    data,
    at(lon, lat) {
      const x = Math.min(width - 1, Math.max(0, Math.floor(((lon + 180) * width) / 360)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(((90 - lat) * height) / 180)));
      const v = data[y * width + x]!;
      return v >= 1 && v <= 31 ? KOPPEN[v]! : "";
    },
  };
}
