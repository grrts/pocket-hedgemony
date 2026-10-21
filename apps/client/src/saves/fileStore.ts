import { headerSpan, readHeader } from "@ph/engine/domain/saves";
import type { SaveFolderBridge } from "../desktop.ts";
import type { KeyValue } from "../cloud/api.ts";
import type { StoredSave } from "./store.ts";

/** The parts of a save store the game uses: IndexedDB on the web, the save folder on the desktop. */
export interface SaveStoreLike {
  list(): Promise<StoredSave[]>;
  read(path: string): Promise<Uint8Array | undefined>;
  commit(path: string, bytes: Uint8Array, removed: readonly string[]): Promise<StoredSave>;
  remove(path: string): Promise<void>;
}

/**
 * The desktop's saves (SAVE-144): one `.phsave` file each in the save folder,
 * which Steam Auto-Cloud syncs (SAVE-145). The shell writes the files safely
 * and hands back only each file's header for the list; a header that does not
 * read is left out.
 */
export class FileSaveStore implements SaveStoreLike {
  private readonly folder: SaveFolderBridge;

  constructor(folder: SaveFolderBridge) {
    this.folder = folder;
  }

  async list(): Promise<StoredSave[]> {
    const out: StoredSave[] = [];
    for (const e of await this.folder.list()) {
      try {
        out.push({ path: e.path, header: readHeader(e.head), head: e.head });
      } catch {
        // Not a readable save: not listed, not touched.
      }
    }
    return out.sort((a, b) => b.header.savedAt - a.header.savedAt || b.header.turn - a.header.turn);
  }

  read(path: string): Promise<Uint8Array | undefined> {
    return this.folder.read(path);
  }

  async commit(path: string, bytes: Uint8Array, removed: readonly string[]): Promise<StoredSave> {
    const entry: StoredSave = { path, header: readHeader(bytes), head: bytes.slice(0, headerSpan(bytes.subarray(0, 10))) };
    await this.folder.commit(path, bytes, [...removed]);
    return entry;
  }

  remove(path: string): Promise<void> {
    return this.folder.remove(path);
  }
}

const MOVED_KEY = "ph.saves-moved-to-folder";

/**
 * Moves the saves an earlier desktop build kept in IndexedDB into the folder,
 * once (SAVE-144). A save already in the folder is not written again; each
 * one leaves IndexedDB only after its file is in place.
 */
export async function moveIntoFolder(from: SaveStoreLike, to: SaveStoreLike, kv: KeyValue): Promise<number> {
  if (kv.get(MOVED_KEY)) return 0;
  const there = new Set((await to.list()).map((e) => e.path));
  let moved = 0;
  for (const e of await from.list()) {
    const bytes = await from.read(e.path);
    if (!bytes) continue;
    if (!there.has(e.path)) {
      await to.commit(e.path, bytes, []);
      moved++;
    }
    await from.remove(e.path);
  }
  kv.set(MOVED_KEY, "1");
  return moved;
}
