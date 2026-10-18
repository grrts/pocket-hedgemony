import config from "../../../../rules/data/domain/saves.json" with { type: "json" };
import {
  arraySize,
  bytesOf,
  crc32,
  deflateRaw,
  fromLE,
  fromUtf8,
  inflateRaw,
  kindOf,
  putBytes,
  putU16,
  putU32,
  putU8,
  toLE,
  utf8,
  writer,
  type ArrayKind,
  type Typed,
} from "./bytes.ts";

/**
 * The `.phsave` file (save-system §4.1–§4.3): magic "PHSV", a uint16 container
 * version, a uint32 header length, the header as plain UTF-8 JSON, a chunk
 * table, then one deflate-compressed chunk per system. Everything little-endian.
 */

export type SavesConfig = typeof config;
export const savesConfig: SavesConfig = config;

export type SaveKind = "resume" | "autosave" | "manual" | "ironman";
export type Platform = "android" | "ios" | "desktop" | "web";

/** Campaign options carried in the header: every rule from the new-game screen (D-SAVE-8). */
export interface CampaignOptions {
  difficulty: string;
  events: string;
  endDate: string;
  aiTemper?: string;
  fogOfWar?: boolean;
  musicEra?: string;
}

/** The app a save was written by (D-SAVE-13). */
export type AppTier = "free" | "demo" | "full";

/** The flags achievements reads (X-16, D-SAVE-1). */
export interface SaveFlags {
  ironman_unbroken: boolean;
  cheat_marked: boolean;
  switched_country: boolean;
  began_as_tutorial: boolean;
}

/** The header the Load list reads without opening the chunks (SAVE-038). */
export interface SaveHeader {
  saveId: string;
  campaignId: string;
  kind: SaveKind;
  name: string;
  /** Milliseconds since 1970, given by the caller's clock. */
  savedAt: number;
  device: string;
  platform: Platform;
  gameVersion: string;
  formatVersion: number;
  rulesHash: string;
  mapHash: string;
  turn: number;
  date: { y: number; m: number };
  playerNation: string;
  ironman: boolean;
  playSeconds: number;
  options: CampaignOptions;
  tier: { nation: string; needsFullGame: boolean; app: AppTier };
  flags: SaveFlags;
  worldHash: string;
  /** Base64 PNG, 96 × 64. */
  thumbnail: string;
  /** Set once a save that failed the hash check was opened anyway (SAVE-094). */
  modified: boolean;
  /** The ironman save this one follows (INV-SAVE-10). */
  parent?: string;
}

/** One chunk before compression. */
export interface RawChunk {
  id: string;
  version: number;
  payload: Uint8Array;
}

/** One row of the chunk table. */
export interface ChunkEntry {
  id: string;
  version: number;
  offset: number;
  length: number;
  crc: number;
}

export const MAGIC = config.format.magic;
export const CONTAINER_VERSION = config.format.container_version;
/** The build's format version (SAVE-045). */
export const FORMAT_VERSION = config.format.format_version;

/** Why a file could not be read. */
export type SaveProblem = "wrong-magic" | "damaged" | "newer-version";

export class SaveError extends Error {
  readonly problem: SaveProblem;
  constructor(problem: SaveProblem, message: string) {
    super(message);
    this.problem = problem;
  }
}

/** The file's bytes: header, chunk table and compressed chunks (SAVE-035). */
export function encodeSave(header: SaveHeader, chunks: readonly RawChunk[]): Uint8Array {
  const headerBytes = utf8(JSON.stringify(header));
  const packed = chunks.map((c) => ({ ...c, data: deflateRaw(c.payload), idBytes: utf8(c.id) }));
  const tableSize = 2 + packed.reduce((n, c) => n + 1 + c.idBytes.length + 2 + 4 + 4 + 4, 0);
  let offset = 4 + 2 + 4 + headerBytes.length + tableSize;
  const w = writer(offset + packed.reduce((n, c) => n + c.data.length, 0));
  putBytes(w, utf8(MAGIC));
  putU16(w, CONTAINER_VERSION);
  putU32(w, headerBytes.length);
  putBytes(w, headerBytes);
  putU16(w, packed.length);
  for (const c of packed) {
    putU8(w, c.idBytes.length);
    putBytes(w, c.idBytes);
    putU16(w, c.version);
    putU32(w, offset);
    putU32(w, c.data.length);
    putU32(w, crc32(c.data));
    offset += c.data.length;
  }
  for (const c of packed) putBytes(w, c.data);
  return bytesOf(w);
}

function checkMagic(bytes: Uint8Array): void {
  if (bytes.length < 4 || [...MAGIC].some((ch, i) => bytes[i] !== ch.charCodeAt(0))) throw new SaveError("wrong-magic", "not a Pocket Hegemony save");
}

/** How many leading bytes hold the header: all the Load list needs (SAVE-036). */
export function headerSpan(prefix: Uint8Array): number {
  checkMagic(prefix);
  if (prefix.length < 10) throw new SaveError("damaged", "file cut short");
  const len = new DataView(prefix.buffer, prefix.byteOffset).getUint32(6, true);
  return 10 + len;
}

/** Reads only the header; the chunks are neither read nor decompressed. */
export function readHeader(prefix: Uint8Array): SaveHeader {
  const end = headerSpan(prefix);
  if (prefix.length < end) throw new SaveError("damaged", "file cut short");
  try {
    return JSON.parse(fromUtf8(prefix.subarray(10, end))) as SaveHeader;
  } catch {
    throw new SaveError("damaged", "header is not readable");
  }
}

/** The chunk table, with every offset checked against the file length. */
export function readTable(bytes: Uint8Array): ChunkEntry[] {
  let p = headerSpan(bytes);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const need = (n: number) => {
    if (p + n > bytes.length) throw new SaveError("damaged", "file cut short");
  };
  need(2);
  const count = dv.getUint16(p, true);
  p += 2;
  const table: ChunkEntry[] = [];
  for (let i = 0; i < count; i++) {
    need(1);
    const idLen = bytes[p]!;
    p += 1;
    need(idLen + 14);
    let id: string;
    try {
      id = fromUtf8(bytes.subarray(p, p + idLen));
    } catch {
      throw new SaveError("damaged", "chunk table is not readable");
    }
    p += idLen;
    const version = dv.getUint16(p, true);
    const offset = dv.getUint32(p + 2, true);
    const length = dv.getUint32(p + 6, true);
    const crc = dv.getUint32(p + 10, true);
    p += 14;
    if (offset + length > bytes.length) throw new SaveError("damaged", "file cut short");
    table.push({ id, version, offset, length, crc });
  }
  return table;
}

/** A whole file, checked: magic, every chunk's CRC-32, and every chunk inflated (SAVE-092). */
export interface DecodedSave {
  header: SaveHeader;
  table: ChunkEntry[];
  chunks: Map<string, RawChunk>;
}

export function decodeSave(bytes: Uint8Array): DecodedSave {
  // The table first: a file cut short fails there before its header is parsed.
  const table = readTable(bytes);
  const header = readHeader(bytes);
  const chunks = new Map<string, RawChunk>();
  for (const e of table) {
    const data = bytes.subarray(e.offset, e.offset + e.length);
    if (crc32(data) !== e.crc) throw new SaveError("damaged", `chunk ${e.id} fails its CRC-32`);
    let payload: Uint8Array;
    try {
      payload = inflateRaw(data);
    } catch {
      throw new SaveError("damaged", `chunk ${e.id} does not inflate`);
    }
    chunks.set(e.id, { id: e.id, version: e.version, payload });
  }
  return { header, table, chunks };
}

/** Checks magic and CRCs without keeping anything (server checks, import). */
export function verifyCrcs(bytes: Uint8Array): void {
  readHeader(bytes);
  for (const e of readTable(bytes)) {
    if (crc32(bytes, e.offset, e.offset + e.length) !== e.crc) throw new SaveError("damaged", `chunk ${e.id} fails its CRC-32`);
  }
}

// ---------------------------------------------------------------- chunk payloads

/** A chunk's own contents: JSON fields plus named typed arrays stored as raw little-endian bytes. */
export interface ChunkBody {
  meta: Record<string, unknown>;
  arrays: Record<string, Typed>;
}

interface ArrayDesc {
  name: string;
  kind: ArrayKind;
  length: number;
}

export function packChunk(id: string, version: number, body: ChunkBody): RawChunk {
  const descs: ArrayDesc[] = Object.entries(body.arrays).map(([name, a]) => ({ name, kind: kindOf(a), length: a.length }));
  const json = utf8(JSON.stringify({ meta: body.meta, arrays: descs }));
  const w = writer(json.length + 64);
  putU32(w, json.length);
  putBytes(w, json);
  for (const a of Object.values(body.arrays)) putBytes(w, toLE(a));
  return { id, version, payload: bytesOf(w) };
}

export function unpackChunk(chunk: RawChunk): ChunkBody {
  const p = chunk.payload;
  const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const jsonLen = dv.getUint32(0, true);
  const parsed = JSON.parse(fromUtf8(p.subarray(4, 4 + jsonLen))) as { meta: Record<string, unknown>; arrays: ArrayDesc[] };
  const arrays: Record<string, Typed> = {};
  let off = 4 + jsonLen;
  for (const d of parsed.arrays) {
    arrays[d.name] = fromLE(d.kind, p, off, d.length);
    off += d.length * arraySize(d.kind);
  }
  return { meta: parsed.meta, arrays };
}

/** The descriptions of a chunk's typed arrays, read without decoding them. */
export function chunkArrays(chunk: RawChunk): { name: string; kind: ArrayKind; length: number }[] {
  const p = chunk.payload;
  const jsonLen = new DataView(p.buffer, p.byteOffset, p.byteLength).getUint32(0, true);
  return (JSON.parse(fromUtf8(p.subarray(4, 4 + jsonLen))) as { arrays: ArrayDesc[] }).arrays;
}
