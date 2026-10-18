import { headerSpan, readHeader, type SaveHeader } from "@ph/engine/domain/saves";

/** A save the device keeps: where it is, its header, and the header's own bytes (for the engine's rotation). */
export interface StoredSave {
  path: string;
  header: SaveHeader;
  head: Uint8Array;
}

/**
 * Where the web keeps saves (SAVE-077, SAVE-110): IndexedDB, with the file
 * bytes in one store and the headers in another so the Load card lists them
 * without reading a file. Each save is written in one transaction together
 * with the removal of the saves it replaces (SAVE-032). Where IndexedDB is
 * refused (a private window), saves last for the visit only.
 */
export class SaveStore {
  private db: Promise<IDBDatabase | null>;
  private memory = new Map<string, { bytes: Uint8Array; entry: StoredSave }>();

  constructor(name = "pocket-hegemony-saves") {
    this.db = new Promise((resolve) => {
      try {
        const open = indexedDB.open(name, 1);
        open.onupgradeneeded = () => {
          open.result.createObjectStore("files");
          open.result.createObjectStore("heads");
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => resolve(null);
        open.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /** Every save, newest first. */
  async list(): Promise<StoredSave[]> {
    const db = await this.db;
    let all: StoredSave[];
    if (!db) all = [...this.memory.values()].map((m) => m.entry);
    else all = await request<StoredSave[]>(db.transaction("heads").objectStore("heads").getAll());
    return all.sort((a, b) => b.header.savedAt - a.header.savedAt || b.header.turn - a.header.turn);
  }

  async read(path: string): Promise<Uint8Array | undefined> {
    const db = await this.db;
    if (!db) return this.memory.get(path)?.bytes;
    return request<Uint8Array | undefined>(db.transaction("files").objectStore("files").get(path));
  }

  /** Keeps a new save and removes the ones it replaces, all or nothing. */
  async commit(path: string, bytes: Uint8Array, removed: readonly string[]): Promise<StoredSave> {
    const entry: StoredSave = { path, header: readHeader(bytes), head: bytes.slice(0, headerSpan(bytes.subarray(0, 10))) };
    const db = await this.db;
    if (!db) {
      this.memory.set(path, { bytes, entry });
      for (const p of removed) this.memory.delete(p);
      return entry;
    }
    const tx = db.transaction(["files", "heads"], "readwrite");
    tx.objectStore("files").put(bytes, path);
    tx.objectStore("heads").put(entry, path);
    for (const p of removed) {
      tx.objectStore("files").delete(p);
      tx.objectStore("heads").delete(p);
    }
    await done(tx);
    return entry;
  }

  async remove(path: string): Promise<void> {
    const db = await this.db;
    if (!db) {
      this.memory.delete(path);
      return;
    }
    const tx = db.transaction(["files", "heads"], "readwrite");
    tx.objectStore("files").delete(path);
    tx.objectStore("heads").delete(path);
    await done(tx);
  }
}

function request<T>(r: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result as T);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("save aborted"));
  });
}
