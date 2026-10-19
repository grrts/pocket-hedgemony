/**
 * Byte tools for the save file (save-system §4.1): CRC-32, a small bundled
 * deflate (SAVE-037: not the browser's CompressionStream, so the bytes are the
 * same on every platform), little-endian typed-array packing and FNV-1a hashes.
 * Pure TypeScript, no platform APIs.
 */

// ---------------------------------------------------------------- CRC-32

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE), as zip and PNG use it. */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** FNV-1a over a string, as 8 hex digits (rules and map hashes). */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function hex32(n: number): string {
  return (n >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------- growable writer

export interface ByteWriter {
  buf: Uint8Array;
  len: number;
}

export function writer(capacity = 1024): ByteWriter {
  return { buf: new Uint8Array(capacity), len: 0 };
}

function ensure(w: ByteWriter, extra: number): void {
  if (w.len + extra <= w.buf.length) return;
  let cap = w.buf.length * 2;
  while (cap < w.len + extra) cap *= 2;
  const next = new Uint8Array(cap);
  next.set(w.buf.subarray(0, w.len));
  w.buf = next;
}

export function putBytes(w: ByteWriter, bytes: Uint8Array): void {
  ensure(w, bytes.length);
  w.buf.set(bytes, w.len);
  w.len += bytes.length;
}

export function putU8(w: ByteWriter, v: number): void {
  ensure(w, 1);
  w.buf[w.len++] = v & 0xff;
}

export function putU16(w: ByteWriter, v: number): void {
  ensure(w, 2);
  new DataView(w.buf.buffer).setUint16(w.len, v, true);
  w.len += 2;
}

export function putU32(w: ByteWriter, v: number): void {
  ensure(w, 4);
  new DataView(w.buf.buffer).setUint32(w.len, v >>> 0, true);
  w.len += 4;
}

export function bytesOf(w: ByteWriter): Uint8Array {
  return w.buf.slice(0, w.len);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

export function fromUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

// ---------------------------------------------------------------- typed arrays as raw little-endian bytes

export type ArrayKind = "i8" | "u8" | "i16" | "u32" | "i32" | "f32" | "f64";
export type Typed = Int8Array | Uint8Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array;

/** Whether this platform keeps numbers little-endian, so typed arrays copy as they are. */
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

const SIZE: Record<ArrayKind, number> = { i8: 1, u8: 1, i16: 2, u32: 4, i32: 4, f32: 4, f64: 8 };

export function kindOf(a: Typed): ArrayKind {
  if (a instanceof Int8Array) return "i8";
  if (a instanceof Uint8Array) return "u8";
  if (a instanceof Int16Array) return "i16";
  if (a instanceof Uint32Array) return "u32";
  if (a instanceof Int32Array) return "i32";
  if (a instanceof Float32Array) return "f32";
  return "f64";
}

/** Raw little-endian bytes of a typed array, whatever the platform's own byte order (SAVE-043). */
export function toLE(a: Typed): Uint8Array {
  if (LITTLE_ENDIAN) return new Uint8Array(a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength));
  const kind = kindOf(a);
  const size = SIZE[kind];
  const out = new Uint8Array(a.length * size);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < a.length; i++) {
    const v = a[i]!;
    const o = i * size;
    switch (kind) {
      case "i8": dv.setInt8(o, v); break;
      case "u8": dv.setUint8(o, v); break;
      case "i16": dv.setInt16(o, v, true); break;
      case "u32": dv.setUint32(o, v, true); break;
      case "i32": dv.setInt32(o, v, true); break;
      case "f32": dv.setFloat32(o, v, true); break;
      case "f64": dv.setFloat64(o, v, true); break;
    }
  }
  return out;
}

/** Reads `length` values of `kind` from little-endian bytes. */
export function fromLE(kind: ArrayKind, bytes: Uint8Array, offset: number, length: number): Typed {
  const size = SIZE[kind];
  if (offset + length * size > bytes.length) throw new Error("array runs past the chunk");
  const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, length * size);
  const make = (): Typed => {
    switch (kind) {
      case "i8": return new Int8Array(length);
      case "u8": return new Uint8Array(length);
      case "i16": return new Int16Array(length);
      case "u32": return new Uint32Array(length);
      case "i32": return new Int32Array(length);
      case "f32": return new Float32Array(length);
      case "f64": return new Float64Array(length);
    }
  };
  const out = make();
  if (LITTLE_ENDIAN) {
    new Uint8Array(out.buffer).set(bytes.subarray(offset, offset + length * size));
    return out;
  }
  for (let i = 0; i < length; i++) {
    const o = i * size;
    switch (kind) {
      case "i8": out[i] = dv.getInt8(o); break;
      case "u8": out[i] = dv.getUint8(o); break;
      case "i16": out[i] = dv.getInt16(o, true); break;
      case "u32": out[i] = dv.getUint32(o, true); break;
      case "i32": out[i] = dv.getInt32(o, true); break;
      case "f32": out[i] = dv.getFloat32(o, true); break;
      case "f64": out[i] = dv.getFloat64(o, true); break;
    }
  }
  return out;
}

export function arraySize(kind: ArrayKind): number {
  return SIZE[kind];
}

// ---------------------------------------------------------------- deflate (RFC 1951)

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface BitWriter {
  out: ByteWriter;
  bits: number;
  count: number;
}

function putBits(b: BitWriter, value: number, n: number): void {
  b.bits |= value << b.count;
  b.count += n;
  while (b.count >= 8) {
    putU8(b.out, b.bits & 0xff);
    b.bits >>>= 8;
    b.count -= 8;
  }
}

function reverse(code: number, len: number): number {
  let r = 0;
  for (let i = 0; i < len; i++) {
    r = (r << 1) | (code & 1);
    code >>>= 1;
  }
  return r;
}

/** Fixed Huffman code of a literal/length symbol (RFC 1951 §3.2.6). */
const LIT_CODE = new Uint16Array(288);
const LIT_BITS = new Uint8Array(288);
for (let sym = 0; sym < 288; sym++) {
  const [code, n] = sym < 144 ? [0x30 + sym, 8] : sym < 256 ? [0x190 + sym - 144, 9] : sym < 280 ? [sym - 256, 7] : [0xc0 + sym - 280, 8];
  LIT_CODE[sym] = reverse(code, n);
  LIT_BITS[sym] = n;
}
function putLitLen(b: BitWriter, sym: number): void {
  putBits(b, LIT_CODE[sym]!, LIT_BITS[sym]!);
}

const LEN_CODE = new Uint8Array(259);
for (let len = 3, c = 0; len <= 258; len++) {
  while (c < 28 && LEN_BASE[c + 1]! <= len) c++;
  LEN_CODE[len] = c;
}
function lengthCode(len: number): number {
  return LEN_CODE[len]!;
}

function distCode(dist: number): number {
  let c = 0;
  while (c < 29 && DIST_BASE[c + 1]! <= dist) c++;
  return c;
}

const DIST_REV = Uint8Array.from({ length: 30 }, (_, dc) => reverse(dc, 5));

const WINDOW = 32768;
const HASH_BITS = 15;
const MAX_CHAIN = 48;

/** Matches and literals per block: each block gets codes fitted to its own bytes. */
const BLOCK_TOKENS = 16384;

/**
 * Raw deflate with LZ77 matching and, block by block, Huffman codes built for
 * that block's symbols (or the fixed codes where they come out shorter).
 * Deterministic: the same input gives the same bytes everywhere.
 */
export function deflateRaw(input: Uint8Array): Uint8Array {
  const tokens = lz77(input);
  const b: BitWriter = { out: writer(Math.max(64, input.length >>> 2)), bits: 0, count: 0 };
  for (let start = 0; start === 0 || start < tokens.length; start += BLOCK_TOKENS) {
    const end = Math.min(tokens.length, start + BLOCK_TOKENS);
    putBlock(b, tokens, start, end, end === tokens.length);
  }
  if (b.count > 0) putU8(b.out, b.bits & 0xff);
  return bytesOf(b.out);
}

/** The input as tokens: a literal byte (< 65536), or a match as length << 16 | distance. */
function lz77(input: Uint8Array): number[] {
  const tokens: number[] = [];
  const head = new Int32Array(1 << HASH_BITS).fill(-1);
  const prev = new Int32Array(WINDOW).fill(-1);
  const n = input.length;
  const hashAt = (i: number) => ((input[i]! << 10) ^ (input[i + 1]! << 5) ^ input[i + 2]!) & ((1 << HASH_BITS) - 1);
  const insert = (i: number) => {
    if (i + 2 >= n) return;
    const h = hashAt(i);
    prev[i & (WINDOW - 1)] = head[h]!;
    head[h] = i;
  };
  let i = 0;
  while (i < n) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + 2 < n) {
      let cand = head[hashAt(i)]!;
      let chain = 0;
      const maxLen = Math.min(258, n - i);
      while (cand >= 0 && i - cand <= WINDOW && chain++ < MAX_CHAIN) {
        if (input[cand + bestLen] === input[i + bestLen]) {
          let l = 0;
          while (l < maxLen && input[cand + l] === input[i + l]) l++;
          if (l > bestLen) {
            bestLen = l;
            bestDist = i - cand;
            if (l === maxLen) break;
          }
        }
        const nextCand = prev[cand & (WINDOW - 1)]!;
        if (nextCand >= cand) break;
        cand = nextCand;
      }
    }
    if (bestLen >= 3) {
      tokens.push((bestLen << 16) | bestDist);
      for (let k = 0; k < bestLen; k++) insert(i + k);
      i += bestLen;
    } else {
      tokens.push(input[i]!);
      insert(i);
      i++;
    }
  }
  return tokens;
}

/** Writes tokens [start, end) as one block, with dynamic codes unless the fixed ones are shorter. */
function putBlock(b: BitWriter, tokens: readonly number[], start: number, end: number, final: boolean): void {
  const litFreq = new Uint32Array(286);
  const distFreq = new Uint32Array(30);
  let extraBits = 0;
  for (let t = start; t < end; t++) {
    const tok = tokens[t]!;
    if (tok < 65536) {
      litFreq[tok]!++;
      continue;
    }
    const lc = lengthCode(tok >>> 16);
    const dc = distCode(tok & 0xffff);
    litFreq[257 + lc]!++;
    distFreq[dc]!++;
    extraBits += LEN_EXTRA[lc]! + DIST_EXTRA[dc]!;
  }
  litFreq[256] = 1;
  let fixedBits = 3 + extraBits;
  for (let s = 0; s < 286; s++) fixedBits += litFreq[s]! * LIT_BITS[s]!;
  for (let s = 0; s < 30; s++) fixedBits += distFreq[s]! * 5;

  const litLen = codeLengths(atLeastTwo(litFreq), 15);
  const distLen = codeLengths(atLeastTwo(distFreq), 15);
  let hlit = 286;
  while (hlit > 257 && litLen[hlit - 1] === 0) hlit--;
  let hdist = 30;
  while (hdist > 1 && distLen[hdist - 1] === 0) hdist--;
  const all = new Uint8Array(hlit + hdist);
  all.set(litLen.subarray(0, hlit));
  all.set(distLen.subarray(0, hdist), hlit);
  const runs = lengthRuns(all);
  const clFreq = new Uint32Array(19);
  for (const r of runs) clFreq[r.sym]!++;
  const clLen = codeLengths(atLeastTwo(clFreq), 7);
  let hclen = 19;
  while (hclen > 4 && clLen[CL_ORDER[hclen - 1]!] === 0) hclen--;
  let dynBits = 3 + 14 + hclen * 3 + extraBits;
  for (const r of runs) dynBits += clLen[r.sym]! + RUN_EXTRA[r.sym]!;
  for (let s = 0; s < 286; s++) dynBits += litFreq[s]! * litLen[s]!;
  for (let s = 0; s < 30; s++) dynBits += distFreq[s]! * distLen[s]!;

  putBits(b, final ? 1 : 0, 1);
  let litCode: Uint16Array;
  let litBits: Uint8Array;
  let distC: Uint16Array;
  let distBits: Uint8Array;
  if (fixedBits <= dynBits) {
    putBits(b, 1, 2); // BTYPE = 01, fixed codes
    [litCode, litBits, distC, distBits] = [LIT_CODE, LIT_BITS, DIST_REV_16, FIVE_BITS];
  } else {
    putBits(b, 2, 2); // BTYPE = 10, dynamic codes
    putBits(b, hlit - 257, 5);
    putBits(b, hdist - 1, 5);
    putBits(b, hclen - 4, 4);
    for (let k = 0; k < hclen; k++) putBits(b, clLen[CL_ORDER[k]!]!, 3);
    const clCode = canonical(clLen);
    for (const r of runs) {
      putBits(b, clCode[r.sym]!, clLen[r.sym]!);
      if (RUN_EXTRA[r.sym]) putBits(b, r.extra, RUN_EXTRA[r.sym]!);
    }
    [litCode, litBits, distC, distBits] = [canonical(litLen), litLen, canonical(distLen), distLen];
  }
  for (let t = start; t < end; t++) {
    const tok = tokens[t]!;
    if (tok < 65536) {
      putBits(b, litCode[tok]!, litBits[tok]!);
      continue;
    }
    const len = tok >>> 16;
    const dist = tok & 0xffff;
    const lc = lengthCode(len);
    putBits(b, litCode[257 + lc]!, litBits[257 + lc]!);
    if (LEN_EXTRA[lc]) putBits(b, len - LEN_BASE[lc]!, LEN_EXTRA[lc]!);
    const dc = distCode(dist);
    putBits(b, distC[dc]!, distBits[dc]!);
    if (DIST_EXTRA[dc]) putBits(b, dist - DIST_BASE[dc]!, DIST_EXTRA[dc]!);
  }
  putBits(b, litCode[256]!, litBits[256]!);
}

const DIST_REV_16 = Uint16Array.from(DIST_REV);
const FIVE_BITS = new Uint8Array(30).fill(5);
/** Extra bits after each code-length symbol: 16 repeats the last 3–6 times, 17 and 18 give 3–10 and 11–138 zeros. */
const RUN_EXTRA = Uint8Array.from({ length: 19 }, (_, s) => (s === 16 ? 2 : s === 17 ? 3 : s === 18 ? 7 : 0));

/** Gives at least two symbols a count, so no code is a lone one-bit code some inflaters refuse. */
function atLeastTwo(freq: Uint32Array): Uint32Array {
  let used = 0;
  for (const f of freq) if (f) used++;
  if (used >= 2) return freq;
  const out = freq.slice();
  for (let s = 0; s < out.length && used < 2; s++) {
    if (!out[s]) {
      out[s] = 1;
      used++;
    }
  }
  return out;
}

/**
 * Huffman code lengths of at most `limit` bits. Ties go by symbol, so the
 * lengths are the same everywhere; counts are halved until the code fits.
 */
function codeLengths(freq: Uint32Array, limit: number): Uint8Array {
  const n = freq.length;
  let f = Array.from(freq);
  for (;;) {
    const lens = huffmanLengths(f);
    let max = 0;
    for (let s = 0; s < n; s++) if (lens[s]! > max) max = lens[s]!;
    if (max <= limit) return lens;
    f = f.map((v) => (v ? (v + 1) >>> 1 : 0));
  }
}

/** Plain Huffman lengths by the two-queue method over leaves sorted by (count, symbol). */
function huffmanLengths(freq: readonly number[]): Uint8Array {
  const n = freq.length;
  const lens = new Uint8Array(n);
  const leaves: number[] = [];
  for (let s = 0; s < n; s++) if (freq[s]) leaves.push(s);
  leaves.sort((a, c) => freq[a]! - freq[c]! || a - c);
  if (leaves.length === 1) {
    lens[leaves[0]!] = 1;
    return lens;
  }
  // Nodes 0..L-1 are the leaves in order; merged nodes follow, already in weight order.
  const L = leaves.length;
  const weight: number[] = leaves.map((s) => freq[s]!);
  const parent: number[] = new Array(2 * L - 1).fill(-1);
  let li = 0;
  let ni = L;
  const take = (): number => {
    if (li < L && (ni >= weight.length || weight[li]! <= weight[ni]!)) return li++;
    return ni++;
  };
  while (weight.length < 2 * L - 1) {
    const a = take();
    const c = take();
    const id = weight.length;
    weight.push(weight[a]! + weight[c]!);
    parent[a] = id;
    parent[c] = id;
  }
  const depth = new Uint8Array(2 * L - 1);
  for (let k = 2 * L - 3; k >= 0; k--) depth[k] = depth[parent[k]!]! + 1;
  for (let k = 0; k < L; k++) lens[leaves[k]!] = depth[k]!;
  return lens;
}

/** Canonical codes for the lengths (RFC 1951 §3.2.2), bit-reversed for writing low bit first. */
function canonical(lens: Uint8Array): Uint16Array {
  const count = new Uint16Array(16);
  for (const l of lens) count[l]!++;
  count[0] = 0;
  const next = new Uint16Array(16);
  for (let bits = 1, code = 0; bits < 16; bits++) {
    code = (code + count[bits - 1]!) << 1;
    next[bits] = code;
  }
  const codes = new Uint16Array(lens.length);
  for (let s = 0; s < lens.length; s++) if (lens[s]) codes[s] = reverse(next[lens[s]!]!++, lens[s]!);
  return codes;
}

/** The code lengths as code-length symbols, with runs of zeros and repeats folded (RFC 1951 §3.2.7). */
function lengthRuns(lens: Uint8Array): { sym: number; extra: number }[] {
  const out: { sym: number; extra: number }[] = [];
  let i = 0;
  while (i < lens.length) {
    const v = lens[i]!;
    let run = 1;
    while (i + run < lens.length && lens[i + run] === v) run++;
    i += run;
    if (v === 0) {
      while (run >= 11) {
        const k = Math.min(run, 138);
        out.push({ sym: 18, extra: k - 11 });
        run -= k;
      }
      if (run >= 3) {
        out.push({ sym: 17, extra: run - 3 });
        run = 0;
      }
    } else {
      out.push({ sym: v, extra: 0 });
      run--;
      while (run >= 3) {
        const k = Math.min(run, 6);
        out.push({ sym: 16, extra: k - 3 });
        run -= k;
      }
    }
    for (; run > 0; run--) out.push({ sym: v, extra: 0 });
  }
  return out;
}

interface Huff {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function buildHuff(lengths: ArrayLike<number>, n: number): Huff {
  const counts = new Uint16Array(16);
  const symbols = new Uint16Array(n);
  for (let i = 0; i < n; i++) counts[lengths[i]!]!++;
  counts[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1]! + counts[i - 1]!;
  for (let i = 0; i < n; i++) if (lengths[i]) symbols[offs[lengths[i]!]!++] = i;
  return { counts, symbols };
}

const FIXED_LIT = (() => {
  const l = new Uint8Array(288);
  l.fill(8, 0, 144);
  l.fill(9, 144, 256);
  l.fill(7, 256, 280);
  l.fill(8, 280, 288);
  return buildHuff(l, 288);
})();
const FIXED_DIST = buildHuff(new Uint8Array(30).fill(5), 30);

/** Thrown when deflate data is cut short or malformed. */
export class InflateError extends Error {}

/** Inflates raw deflate data (stored, fixed and dynamic blocks). */
export function inflateRaw(data: Uint8Array): Uint8Array {
  const out = writer(Math.max(64, data.length * 4));
  let pos = 0;
  let bitBuf = 0;
  let bitCnt = 0;
  const bit = (): number => {
    if (bitCnt === 0) {
      if (pos >= data.length) throw new InflateError("deflate data cut short");
      bitBuf = data[pos++]!;
      bitCnt = 8;
    }
    const v = bitBuf & 1;
    bitBuf >>>= 1;
    bitCnt--;
    return v;
  };
  const bits = (n: number): number => {
    while (bitCnt < n) {
      if (pos >= data.length) throw new InflateError("deflate data cut short");
      bitBuf |= data[pos++]! << bitCnt;
      bitCnt += 8;
    }
    const v = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return v;
  };
  const decode = (h: Huff): number => {
    // Up to 15 bits are read ahead into the buffer; only the code's own bits are used up.
    while (bitCnt < 15 && pos < data.length) {
      bitBuf |= data[pos++]! << bitCnt;
      bitCnt += 8;
    }
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len++) {
      if (len > bitCnt) throw new InflateError("deflate data cut short");
      code |= (bitBuf >>> (len - 1)) & 1;
      const count = h.counts[len]!;
      if (code - count < first) {
        bitBuf >>>= len;
        bitCnt -= len;
        return h.symbols[index + (code - first)]!;
      }
      index += count;
      first += count;
      first <<= 1;
      code <<= 1;
    }
    throw new InflateError("bad Huffman code");
  };
  let final = 0;
  do {
    final = bit();
    const type = bits(2);
    if (type === 0) {
      // Whole bytes read ahead go back; the rest of the current byte is padding.
      pos -= bitCnt >>> 3;
      bitBuf = 0;
      bitCnt = 0;
      if (pos + 4 > data.length) throw new InflateError("deflate data cut short");
      const len = data[pos]! | (data[pos + 1]! << 8);
      const nlen = data[pos + 2]! | (data[pos + 3]! << 8);
      if ((len ^ 0xffff) !== nlen) throw new InflateError("bad stored block");
      pos += 4;
      if (pos + len > data.length) throw new InflateError("deflate data cut short");
      putBytes(out, data.subarray(pos, pos + len));
      pos += len;
      continue;
    }
    let lit = FIXED_LIT;
    let dist = FIXED_DIST;
    if (type === 2) {
      const hlit = bits(5) + 257;
      const hdist = bits(5) + 1;
      const hclen = bits(4) + 4;
      const cl = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]!] = bits(3);
      const clh = buildHuff(cl, 19);
      const lens = new Uint8Array(hlit + hdist);
      let k = 0;
      while (k < hlit + hdist) {
        const sym = decode(clh);
        if (sym < 16) lens[k++] = sym;
        else {
          let rep = 0;
          let val = 0;
          if (sym === 16) {
            if (k === 0) throw new InflateError("bad repeat");
            val = lens[k - 1]!;
            rep = 3 + bits(2);
          } else if (sym === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          if (k + rep > hlit + hdist) throw new InflateError("bad lengths");
          while (rep--) lens[k++] = val;
        }
      }
      lit = buildHuff(lens.subarray(0, hlit), hlit);
      dist = buildHuff(lens.subarray(hlit), hdist);
    } else if (type !== 1) throw new InflateError("bad block type");
    for (;;) {
      const sym = decode(lit);
      if (sym < 256) putU8(out, sym);
      else if (sym === 256) break;
      else {
        const lc = sym - 257;
        if (lc >= 29) throw new InflateError("bad length code");
        const len = LEN_BASE[lc]! + bits(LEN_EXTRA[lc]!);
        const dc = decode(dist);
        if (dc >= 30) throw new InflateError("bad distance code");
        const d = DIST_BASE[dc]! + bits(DIST_EXTRA[dc]!);
        if (d > out.len) throw new InflateError("distance too far back");
        ensure(out, len);
        for (let k = 0; k < len; k++) out.buf[out.len] = out.buf[out.len++ - d]!;
      }
    }
  } while (!final);
  return bytesOf(out);
}

// ---------------------------------------------------------------- PNG (the 96 × 64 thumbnail)

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** An RGB PNG from w × h × 3 bytes, made with the bundled deflate. */
export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  const z = writer();
  putU8(z, 0x78);
  putU8(z, 0x01);
  putBytes(z, deflateRaw(raw));
  const ad = adler32(raw);
  putU8(z, ad >>> 24);
  putU8(z, ad >>> 16);
  putU8(z, ad >>> 8);
  putU8(z, ad);
  const w = writer();
  putBytes(w, Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
  const chunk = (type: string, body: Uint8Array) => {
    const be = new DataView(new ArrayBuffer(4));
    be.setUint32(0, body.length);
    putBytes(w, new Uint8Array(be.buffer));
    const tb = writer();
    putBytes(tb, utf8(type));
    putBytes(tb, body);
    const typed = bytesOf(tb);
    putBytes(w, typed);
    be.setUint32(0, crc32(typed));
    putBytes(w, new Uint8Array(be.buffer.slice(0)));
  };
  const ihdr = new DataView(new ArrayBuffer(13));
  ihdr.setUint32(0, width);
  ihdr.setUint32(4, height);
  ihdr.setUint8(8, 8); // bit depth
  ihdr.setUint8(9, 2); // RGB
  chunk("IHDR", new Uint8Array(ihdr.buffer));
  chunk("IDAT", bytesOf(z));
  chunk("IEND", new Uint8Array(0));
  return bytesOf(w);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    s += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    s += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    s += c === undefined ? "=" : B64[c & 63]!;
  }
  return s;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]!) : 0));
    const n = (v[0]! << 18) | (v[1]! << 12) | (v[2]! << 6) | v[3]!;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
