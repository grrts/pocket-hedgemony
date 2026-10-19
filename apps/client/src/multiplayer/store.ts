/**
 * Where a multiplayer game's lobby and orders are kept, for every device in it
 * to read: the Artifact's shared database when the game runs as a claude.ai
 * Artifact, else this browser's storage, shared between its tabs (a test of the
 * online game on one computer, and the dev server's).
 */
export interface MpStore {
  /** "online" reaches other devices; "this browser" only other tabs. */
  reach: "online" | "this browser";
  set(path: string, data: Record<string, unknown>): Promise<void>;
  get(path: string): Promise<Record<string, unknown> | null>;
  /** Calls back with the documents of a collection now and on every change; returns the way to stop. */
  watch(collection: string, cb: (docs: { id: string; data: Record<string, unknown> }[]) => void): () => void;
}

interface DbDoc {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface Db {
  doc(path: string): { get(): Promise<DbDoc>; set(data: Record<string, unknown>): Promise<void> };
  collection(path: string): { onSnapshot(next: (s: { docs: DbDoc[] }) => void, error?: (e: { code: string; message: string }) => void): () => void };
}

/** The Artifact's shared database, or null outside a claude.ai Artifact (or when the viewer may not use it). */
async function artifactDb(): Promise<Db | null> {
  const claude = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (!claude?.use) return null;
  try {
    return ((await claude.use("db")) as Db | null) ?? null;
  } catch {
    return null;
  }
}

function dbStore(db: Db): MpStore {
  return {
    reach: "online",
    async set(path, data) {
      try {
        await db.doc(path).set(data);
      } catch (e) {
        // A short platform hiccup: once more after a moment (the db's own advice for "unavailable").
        if ((e as { code?: string }).code !== "unavailable") throw e;
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
        await db.doc(path).set(data);
      }
    },
    async get(path) {
      const d = await db.doc(path).get();
      return d.exists ? (d.data() ?? null) : null;
    },
    watch(collection, cb) {
      return db.collection(collection).onSnapshot(
        (s) => cb(s.docs.filter((d) => d.exists).map((d) => ({ id: d.id, data: d.data() ?? {} }))),
        (e) => console.warn(`multiplayer: ${collection} stopped: ${e.code} ${e.message}`),
      );
    },
  };
}

const PREFIX = "ph-mp:";

/** This browser's storage, shared between its tabs through a BroadcastChannel. */
function browserStore(): MpStore {
  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("ph-mp") : null;
  const watchers = new Set<() => void>();
  const ping = () => watchers.forEach((w) => w());
  channel?.addEventListener("message", ping);
  window.addEventListener("storage", (e) => e.key?.startsWith(PREFIX) && ping());
  const read = (key: string): Record<string, unknown> | null => {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  return {
    reach: "this browser",
    async set(path, data) {
      localStorage.setItem(PREFIX + path, JSON.stringify(data));
      channel?.postMessage(path);
      // Other watchers in this tab hear it too, a moment later, as the db does.
      setTimeout(ping, 0);
    },
    async get(path) {
      return read(PREFIX + path);
    },
    watch(collection, cb) {
      const prefix = `${PREFIX}${collection}/`;
      let last = "";
      const look = () => {
        const docs: { id: string; data: Record<string, unknown> }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!;
          if (!key.startsWith(prefix) || key.slice(prefix.length).includes("/")) continue;
          const data = read(key);
          if (data) docs.push({ id: key.slice(prefix.length), data });
        }
        docs.sort((a, b) => (a.id < b.id ? -1 : 1));
        const now = JSON.stringify(docs);
        if (now === last) return;
        last = now;
        cb(docs);
      };
      watchers.add(look);
      setTimeout(look, 0);
      return () => watchers.delete(look);
    },
  };
}

let store: Promise<MpStore> | null = null;

/** The store this game's multiplayer uses: the Artifact's database when there is one. */
export function mpStore(): Promise<MpStore> {
  return (store ??= artifactDb().then((db) => (db ? dbStore(db) : browserStore())));
}
