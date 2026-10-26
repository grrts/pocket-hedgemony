// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { describe, expect, it } from "vitest";
import { encodeSave, fileName, headerSpan, readHeader, type SaveHeader } from "@ph/engine/domain/saves";
import type { StoredSave } from "../saves/store.ts";
import { CloudApi, webTokenStore, type KeyValue, type RemoteSave } from "./api.ts";
import { CLOUD_PATH, CloudSync, saveIdOf, type LocalSaves } from "./sync.ts";
import { accountHtml, accountView } from "./accountCard.ts";

function memoryKv(): KeyValue {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

function header(saveId: string, kind: SaveHeader["kind"], savedAt: number, device = "Browser", campaignId = "c1"): SaveHeader {
  return {
    saveId, campaignId, kind, name: `Castile ${saveId}`, savedAt, device, platform: "web", gameVersion: "0.1.0", formatVersion: 1,
    rulesHash: "r", mapHash: "m", turn: savedAt, date: { y: 1444, m: 11 }, playerNation: "castile", ironman: kind === "ironman", playSeconds: 0,
    options: { difficulty: "normal", events: "historical", endDate: "1939" }, tier: { nation: "castile", needsFullGame: false, app: "full" },
    flags: { ironman_unbroken: false, cheat_marked: false, switched_country: false, began_as_tutorial: false }, worldHash: "w", thumbnail: "", modified: false,
  };
}
const bytesOf = (h: SaveHeader) => encodeSave(h, []);

/** The SaveStore in memory. */
function memorySaves(): LocalSaves & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  const entry = (path: string, b: Uint8Array): StoredSave => ({ path, header: readHeader(b), head: b.slice(0, headerSpan(b)) });
  return {
    files,
    list: async () => [...files].map(([p, b]) => entry(p, b)).sort((a, b) => b.header.savedAt - a.header.savedAt),
    read: async (p) => files.get(p),
    commit: async (p, b, removed) => {
      files.set(p, b);
      for (const r of removed) files.delete(r);
      return entry(p, b);
    },
    remove: async (p) => void files.delete(p),
  };
}
async function write(saves: ReturnType<typeof memorySaves>, h: SaveHeader, removed: string[] = []): Promise<string> {
  const path = fileName(h);
  await saves.commit(path, bytesOf(h), removed);
  return path;
}

const row = (h: SaveHeader): RemoteSave => ({
  saveId: h.saveId, campaignId: h.campaignId, kind: h.kind, name: h.name, savedAt: h.savedAt, device: h.device, platform: h.platform,
  gameVersion: h.gameVersion, formatVersion: h.formatVersion, turn: h.turn, date: h.date, nation: h.playerNation, ironman: h.ironman, size: 100,
});

/** A fake server for the saves API: rows, bytes, tombstones and a cursor. */
function fakeServer() {
  const s = {
    up: true,
    rows: new Map<string, RemoteSave>(),
    bytes: new Map<string, Uint8Array>(),
    log: [] as { cursor: number; saveId: string; deleted?: number }[],
    quotaSaves: 300,
    putStatus: undefined as number | undefined,
    calls: [] as string[],
    add(h: SaveHeader) {
      s.rows.set(h.saveId, row(h));
      s.bytes.set(h.saveId, bytesOf(h));
      s.log.push({ cursor: s.log.length + 1, saveId: h.saveId });
    },
    tombstone(id: string) {
      s.rows.delete(id);
      s.log.push({ cursor: s.log.length + 1, saveId: id, deleted: 1 });
    },
  };
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const fetch = async (url: string, init: RequestInit = {}) => {
    if (!s.up) throw new TypeError("Failed to fetch");
    const u = new URL(url);
    const method = init.method ?? "GET";
    s.calls.push(`${method} ${u.pathname}`);
    if (u.pathname === "/api/sessions") return json(200, { accessToken: "a", accessTokenExpiresIn: 900, deviceToken: "d", deviceId: "dev1", account: { id: "x", displayName: "Leroy", email: "l@e.x" } });
    const id = decodeURIComponent(u.pathname.split("/").at(-1)!);
    if (u.pathname === "/api/saves" && method === "GET") {
      const since = Number(u.searchParams.get("since") ?? 0);
      const later = s.log.filter((l) => l.cursor > since);
      const page = later.slice(0, 2);
      const saves = page.filter((l) => !l.deleted && s.rows.has(l.saveId)).map((l) => s.rows.get(l.saveId));
      const tombstones = page.filter((l) => l.deleted).map((l) => ({ saveId: l.saveId, deletedAt: "2026-10-19T10:00:00+00:00" }));
      const cursor = page.at(-1)?.cursor ?? since;
      return json(200, { saves, tombstones, cursor: String(cursor), more: later.length > 2, usage: { saves: s.rows.size, bytes: s.rows.size * 100, quotaSaves: s.quotaSaves, quotaBytes: 200 * 1024 * 1024 } });
    }
    if (u.pathname.startsWith("/api/saves/") && method === "PUT") {
      if (s.putStatus) return json(s.putStatus, { error: s.putStatus === 507 ? "quota_full" : s.putStatus === 409 ? "not_the_newest" : "server_error" });
      if (s.rows.has(id)) return json(409, { error: "save_id_exists" });
      s.add(readHeader(init.body as Uint8Array));
      return json(201, {});
    }
    if (u.pathname.startsWith("/api/saves/") && method === "GET") return s.bytes.has(id) ? new Response(s.bytes.get(id)! as BodyInit) : json(404, { error: "not_found" });
    if (u.pathname.startsWith("/api/saves/") && method === "DELETE") {
      if (!s.rows.has(id)) return json(404, { error: "not_found" });
      s.tombstone(id);
      return new Response(null, { status: 204 });
    }
    if (u.pathname.startsWith("/api/campaigns/") && method === "DELETE") {
      for (const r of [...s.rows.values()]) if (r.campaignId === id) s.tombstone(r.saveId);
      return new Response(null, { status: 204 });
    }
    return json(404, { error: "not_found" });
  };
  return { s, fetch };
}

async function setup(opts: { now?: () => number; signedIn?: boolean } = {}) {
  const server = fakeServer();
  const kv = memoryKv();
  const saves = memorySaves();
  const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch: server.fetch });
  if (opts.signedIn !== false) await api.signIn("l@e.x", "pw", { name: "Browser", platform: "web" });
  const timers: { fn: () => void; ms: number }[] = [];
  const make = () => new CloudSync(api, saves, kv, { device: "Browser", now: opts.now ?? (() => 1000), later: (fn, ms) => (timers.push({ fn, ms }), 0 as unknown as ReturnType<typeof setTimeout>) });
  return { server: server.s, kv, saves, api, sync: make(), make, timers };
}

describe("the upload queue (SAVE-065, SAVE-055)", () => {
  it("uploads a written save after it is saved, and the status line says up to date", async () => {
    const { server, saves, sync } = await setup();
    const p = await write(saves, header("r1", "resume", 10));
    sync.saved(p);
    expect(sync.statusText()).toBe("1 save waiting to upload");
    await sync.run("after_save");
    expect(server.rows.has("r1")).toBe(true);
    expect(sync.statusText()).toBe("Up to date");
    expect(sync.usage()?.saves).toBe(1);
  });

  it("keeps the queue across a restart and empties it oldest first", async () => {
    const { server, saves, sync, make } = await setup();
    server.up = false;
    const a = await write(saves, header("m1", "manual", 10));
    const b = await write(saves, header("m2", "manual", 20));
    sync.saved(a);
    sync.saved(b);
    await sync.run("after_save");
    expect(sync.statusText()).toBe("Offline, will sync when connected");
    server.up = true;
    const again = make();
    expect(again.statusText()).toBe("2 saves waiting to upload");
    await again.run("launch");
    expect(server.calls.filter((c) => c.startsWith("PUT")).map((c) => c.split("/").at(-1))).toEqual(["m1", "m2"]);
  });

  it("uploads only the synced set: the backup Resume save and older autosaves stay local", async () => {
    const { server, saves, sync } = await setup();
    const old = await write(saves, header("r1", "resume", 10));
    const cur = await write(saves, header("r2", "resume", 20));
    const auto1 = await write(saves, header("a1", "autosave", 5));
    const auto2 = await write(saves, header("a2", "autosave", 15));
    for (const p of [old, cur, auto1, auto2]) sync.saved(p);
    await sync.run("after_save");
    expect([...server.rows.keys()].sort()).toEqual(["a2", "r2"]);
    expect(sync.statusText()).toBe("Up to date");
  });

  it("takes the older Resume save it sent out of the cloud when a newer one goes up, keeping the local backup", async () => {
    const { server, saves, sync } = await setup();
    const r1 = await write(saves, header("r1", "resume", 10));
    sync.saved(r1);
    await sync.run("after_save");
    const r2 = await write(saves, header("r2", "resume", 20));
    sync.saved(r2);
    await sync.run("after_save");
    expect([...server.rows.keys()]).toEqual(["r2"]);
    // The tombstone for r1 comes back; this device's backup stays.
    await sync.run("resume");
    expect(saves.files.has(r1)).toBe(true);
  });

  it("waits longer after each failure, using the engine's back-off", async () => {
    let now = 1000;
    const { server, saves, sync, timers } = await setup({ now: () => now });
    server.putStatus = 500;
    sync.saved(await write(saves, header("m1", "manual", 10)));
    await sync.run("after_save");
    expect(timers.at(-1)!.ms).toBe(1000);
    now += 1000;
    await sync.run("after_save");
    expect(timers.at(-1)!.ms).toBe(2000);
    server.putStatus = undefined;
    now += 2000;
    timers.at(-1)!.fn();
    await sync.run("after_save");
    expect(server.rows.has("m1")).toBe(true);
  });

  it("stops at a full account and says so (SAVE-069)", async () => {
    const { server, saves, sync } = await setup();
    server.putStatus = 507;
    sync.saved(await write(saves, header("m1", "manual", 10)));
    await sync.run("after_save");
    expect(sync.state()).toBe("full");
    expect(sync.statusText()).toContain("Storage full");
    expect(sync.statusText()).not.toContain("waiting");
    server.putStatus = undefined;
    await sync.run("launch");
    expect(server.rows.has("m1")).toBe(true);
  });

  it("tells the player when another device is further along in an ironman game (SAVE-089)", async () => {
    const { server, saves, sync } = await setup();
    server.putStatus = 409;
    sync.saved(await write(saves, header("i1", "ironman", 10)));
    await sync.run("after_save");
    expect(sync.state()).toBe("newer_elsewhere");
  });

  it("does nothing extra when the app is backgrounded (SAVE-066)", async () => {
    const { server, saves, sync } = await setup();
    sync.saved(await write(saves, header("m1", "manual", 10)));
    const before = server.calls.length;
    await sync.run("background");
    expect(server.calls.length).toBe(before);
  });

  it("does nothing while signed out", async () => {
    const { server, saves, sync } = await setup({ signedIn: false });
    sync.saved(await write(saves, header("m1", "manual", 10)));
    await sync.run("launch");
    expect(server.calls).toEqual([]);
    expect(sync.state()).toBe("signed_out");
  });

  it("sends up what the device already holds when the player signs in", async () => {
    const { server, saves, sync } = await setup();
    await write(saves, header("m1", "manual", 10));
    await write(saves, header("r1", "resume", 20));
    await sync.signedIn();
    expect([...server.rows.keys()].sort()).toEqual(["m1", "r1"]);
  });
});

describe("saves from other devices (SAVE-053, SAVE-064)", () => {
  it("lists other devices' headers page by page, and downloads the bytes only when a save is opened", async () => {
    const { server, saves, sync } = await setup();
    server.add(header("d1", "resume", 50, "Steam Deck"));
    server.add(header("d2", "manual", 40, "Steam Deck"));
    server.add(header("d3", "manual", 30, "Steam Deck"));
    await sync.run("launch");
    expect(server.calls.filter((c) => c === "GET /api/saves").length).toBe(2);
    const remote = sync.remote(await saves.list());
    expect(remote.map((e) => e.path)).toEqual(["cloud:d1", "cloud:d2", "cloud:d3"]);
    expect(remote[0]!.header.device).toBe("Steam Deck");
    expect(saves.files.size).toBe(0);
    const got = await sync.download("d1");
    expect(got.path).toBe(fileName(header("d1", "resume", 50)));
    expect(saves.files.has(got.path)).toBe(true);
    expect(sync.remote(await saves.list()).map((e) => e.path)).toEqual(["cloud:d2", "cloud:d3"]);
  });

  it("keeps the headers across a restart, so the Load card lists them offline", async () => {
    const { server, saves, sync, make } = await setup();
    server.add(header("d1", "manual", 50, "Steam Deck"));
    await sync.run("launch");
    server.up = false;
    expect(make().remote(await saves.list()).map((e) => e.header.saveId)).toEqual(["d1"]);
    expect(CLOUD_PATH + "d1").toBe("cloud:d1");
  });

  it("applies tombstones: a save deleted on another device leaves the list and this device", async () => {
    const { server, saves, sync } = await setup();
    const h = header("d2", "manual", 40, "Steam Deck");
    server.add(h);
    await sync.run("launch");
    await sync.download("d2");
    server.tombstone("d2");
    await sync.run("resume");
    expect(sync.remote(await saves.list())).toEqual([]);
    expect(saves.files.size).toBe(0);
  });

  it("deletes a save, and a whole campaign, in the cloud when the player deletes it here (SAVE-056, SAVE-062)", async () => {
    const { server, saves, sync } = await setup();
    server.add(header("m1", "manual", 10, "Steam Deck"));
    server.add(header("m2", "manual", 20, "Steam Deck"));
    server.add(header("x1", "manual", 30, "Steam Deck", "c2"));
    await sync.run("launch");
    sync.deleted("m1");
    await sync.run("after_save");
    expect(server.rows.has("m1")).toBe(false);
    sync.deletedCampaign("c1");
    await sync.run("after_save");
    expect([...server.rows.keys()]).toEqual(["x1"]);
    expect(sync.remote(await saves.list()).map((e) => e.header.saveId)).toEqual(["x1"]);
  });

  it("replacing a manual save that went up takes the old one out of the cloud", async () => {
    const { server, saves, sync } = await setup();
    const a = await write(saves, header("m1", "manual", 10));
    sync.saved(a);
    await sync.run("after_save");
    const b = await write(saves, header("m2", "manual", 20), [a]);
    sync.saved(b, [a]);
    await sync.run("after_save");
    expect([...server.rows.keys()]).toEqual(["m2"]);
    expect(saveIdOf(b)).toBe("m2");
  });

  it("forgets the queue and the headers when the device is signed out", async () => {
    const { server, saves, sync, api } = await setup();
    server.add(header("d1", "manual", 50, "Steam Deck"));
    await sync.run("launch");
    sync.saved(await write(saves, header("m1", "manual", 10)));
    server.up = false;
    await api.signOut();
    expect(sync.state()).toBe("signed_out");
    expect(sync.remote(await saves.list())).toEqual([]);
  });
});

describe("the Account and cloud saves card (SAVE-119 … SAVE-123)", () => {
  it("offers email sign-in and Make an account when signed out, and no store sign-ins yet", async () => {
    const { sync } = await setup({ signedIn: false });
    const v = accountView();
    const html = accountHtml(sync, v);
    expect(html).toContain('data-cloud-form="sign_in"');
    expect(html).toContain("Make an account");
    expect(html).not.toMatch(/Steam|Apple|Google|Wi-Fi/);
    v.form = "register";
    expect(accountHtml(sync, v)).toContain('name="displayName"');
  });

  it("shows the name, the status line, storage against the quota and each device with Sign out", async () => {
    const { saves, sync } = await setup();
    sync.saved(await write(saves, header("m1", "manual", 10)));
    await sync.run("after_save");
    const v = accountView();
    const seen = new Date(1000).toISOString();
    v.card = {
      id: "x",
      displayName: "Leroy",
      email: "l@e.x",
      signIns: [],
      devices: [
        { id: "dev1", name: "Browser", platform: "web", lastSeenAt: seen, current: true },
        { id: "dev2", name: "Steam Deck", platform: "steam", lastSeenAt: seen, current: false },
      ],
    };
    const html = accountHtml(sync, v, 1000);
    expect(html).toContain("Leroy");
    expect(html).toContain("Up to date");
    expect(html).toContain("1 of 300 saves");
    expect(html).toContain("Browser (this device)");
    expect(html.match(/data-cloud-ask="(?!delete-account)/g)?.length).toBe(2);
    expect(html).toContain("Sign out of this device");
  });
});
