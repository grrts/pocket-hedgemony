// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { describe, expect, it } from "vitest";
import { encodeSave, fileName, headerSpan, readHeader, type SaveHeader } from "@ph/engine/domain/saves";
import type { FolderEntry, SaveFolderBridge } from "../desktop.ts";
import type { KeyValue } from "../cloud/api.ts";
import { FileSaveStore, moveIntoFolder, type SaveStoreLike } from "./fileStore.ts";
import type { StoredSave } from "./store.ts";

function header(saveId: string, savedAt: number): SaveHeader {
  return {
    saveId, campaignId: "c1", kind: "manual", name: `Castile ${saveId}`, savedAt, device: "Desktop", platform: "desktop", gameVersion: "0.1.0", formatVersion: 1,
    rulesHash: "r", mapHash: "m", turn: savedAt, date: { y: 1444, m: 11 }, playerNation: "castile", ironman: false, playSeconds: 0,
    options: { difficulty: "normal", events: "historical", endDate: "1939" }, tier: { nation: "castile", needsFullGame: false, app: "full" },
    flags: { ironman_unbroken: false, cheat_marked: false, switched_country: false, began_as_tutorial: false }, worldHash: "w", thumbnail: "", modified: false,
  };
}

/** The shell's save folder in memory: it hands back only each file's header, as apps/desktop/src/saves.mjs does. */
function folder(): SaveFolderBridge & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    list: async (): Promise<FolderEntry[]> => [...files].map(([path, b]) => ({ path, head: b.slice(0, headerSpan(b)) })),
    read: async (p) => files.get(p),
    commit: async (p, b, removed) => {
      files.set(p, b);
      for (const r of removed) files.delete(r);
    },
    remove: async (p) => void files.delete(p),
  };
}

function memoryStore(): SaveStoreLike & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  const entry = (path: string, b: Uint8Array): StoredSave => ({ path, header: readHeader(b), head: b.slice(0, headerSpan(b)) });
  return {
    files,
    list: async () => [...files].map(([p, b]) => entry(p, b)),
    read: async (p) => files.get(p),
    commit: async (p, b, removed) => {
      files.set(p, b);
      for (const r of removed) files.delete(r);
      return entry(p, b);
    },
    remove: async (p) => void files.delete(p),
  };
}

function memoryKv(): KeyValue {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

describe("saves as files on the desktop (SAVE-144)", () => {
  it("writes each save under its cloud name and lists it newest first from its header", async () => {
    const f = folder();
    const store = new FileSaveStore(f);
    const a = header("a", 10);
    const b = header("b", 20);
    await store.commit(fileName(a), encodeSave(a, []), []);
    await store.commit(fileName(b), encodeSave(b, []), [fileName(a)]);
    expect([...f.files.keys()]).toEqual(["c1/20-b.phsave"]);
    const [only] = await store.list();
    expect(only!.header.name).toBe("Castile b");
    expect(await store.read("c1/20-b.phsave")).toEqual(encodeSave(b, []));
  });

  it("leaves out a file whose header does not read", async () => {
    const f = folder();
    f.files.set("c1/1-x.phsave", new Uint8Array([80, 72, 83, 86, 1, 0, 3, 0, 0, 0, 123, 34, 120]));
    expect(await new FileSaveStore(f).list()).toEqual([]);
  });

  it("moves the saves IndexedDB kept into the folder once", async () => {
    const old = memoryStore();
    for (const h of [header("a", 1), header("b", 2), header("c", 3)]) await old.commit(fileName(h), encodeSave(h, []), []);
    const f = folder();
    const store = new FileSaveStore(f);
    const kv = memoryKv();
    expect(await moveIntoFolder(old, store, kv)).toBe(3);
    expect([...f.files.keys()].sort()).toEqual(["c1/1-a.phsave", "c1/2-b.phsave", "c1/3-c.phsave"]);
    expect(old.files.size).toBe(0);
    const later = header("d", 4);
    await old.commit(fileName(later), encodeSave(later, []), []);
    expect(await moveIntoFolder(old, store, kv)).toBe(0);
  });
});
