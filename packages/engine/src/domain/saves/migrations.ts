import { FORMAT_VERSION, type RawChunk } from "./format.ts";

/**
 * Keeping old saves loading (save-system §4.4): every released format version
 * has a pure migration to the next one, run in order, then the result is
 * validated.
 */

export type Chunks = ReadonlyMap<string, RawChunk>;

/** A pure function from one format version's chunks to the next one's. */
export interface Migration {
  from: number;
  to: number;
  run: (chunks: Chunks) => Map<string, RawChunk>;
}

/** This build's migrations. Format version 1 is the first released, so none yet. */
export const MIGRATIONS: readonly Migration[] = [];

/** Chunks every save must have after migration. */
export const REQUIRED_CHUNKS = ["core", "ids", "provinces", "nations", "armies"] as const;

export interface MigrationResult {
  chunks: Map<string, RawChunk>;
  /** Steps run, as "6 → 7". */
  ran: string[];
}

/** Runs every step from `from` up to `to` in order (SAVE-046). Throws if a step is missing. */
export function migrate(chunks: Chunks, from: number, to: number = FORMAT_VERSION, list: readonly Migration[] = MIGRATIONS): MigrationResult {
  let current = new Map(chunks);
  const ran: string[] = [];
  for (let v = from; v < to; v++) {
    const step = list.find((m) => m.from === v && m.to === v + 1);
    if (!step) throw new Error(`no migration from format version ${v} to ${v + 1}`);
    current = step.run(current);
    ran.push(`${v} → ${v + 1}`);
  }
  return { chunks: current, ran };
}

/** What is wrong with a set of chunks; empty when it is valid. */
export function validateChunks(chunks: Chunks): string[] {
  return REQUIRED_CHUNKS.filter((id) => !chunks.has(id)).map((id) => `missing chunk ${id}`);
}

/** The format version a build must carry: one more whenever any chunk's layout changes (SAVE-045). */
export function nextFormatVersion(released: number, changedChunks: readonly string[]): number {
  return changedChunks.length > 0 ? released + 1 : released;
}
