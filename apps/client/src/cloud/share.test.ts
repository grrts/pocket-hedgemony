// The engine first, so the saves module finds its imports in order.
import { Rng } from "@ph/engine";
import { describe, expect, it } from "vitest";
import { decodeSave, encodeSave, sharedFromLine, type SaveHeader } from "@ph/engine/domain/saves";
import { CloudApi, webTokenStore, type KeyValue } from "./api.ts";
import { CloudSync } from "./sync.ts";
import { accountHtml, accountView } from "./accountCard.ts";
import { fetchSharedCopy, openError, postShare, shareSheetHtml, shareView } from "./share.ts";

function memoryKv(): KeyValue {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

function header(over: Partial<SaveHeader> = {}): SaveHeader {
  return {
    saveId: "s1", campaignId: "c1", kind: "manual", name: "Castile, May 1492", savedAt: 1, device: "", platform: "desktop", gameVersion: "0.1.0", formatVersion: 1,
    rulesHash: "r", mapHash: "m", turn: 12, date: { y: 1492, m: 5 }, playerNation: "castile", ironman: false, playSeconds: 600,
    options: { difficulty: "normal", events: "historical", endDate: "1939" }, tier: { nation: "castile", needsFullGame: false, app: "full" },
    flags: { ironman_unbroken: false, cheat_marked: false, switched_country: false, began_as_tutorial: false }, worldHash: "w", thumbnail: "", modified: false,
    ...over,
  };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const session = { accessToken: "a", accessTokenExpiresIn: 900, deviceToken: "d", deviceId: "dev1", account: { id: "x", displayName: "Bertrand", email: "b@e.x" } };

/** A server with one shared save, K7QXM2PA by Leroy, and the share endpoint. */
function fakeServer(file: Uint8Array) {
  const calls: { method: string; path: string; auth: string | undefined; body: unknown }[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname;
    const method = init.method ?? "GET";
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    calls.push({ method, path, auth, body: typeof init.body === "string" ? JSON.parse(init.body) : undefined });
    if (path === "/api/sessions") return json(200, session);
    if (path === "/api/shared-saves/K7QXM2PA") return json(200, { save: { code: "K7QXM2PA", author: "Leroy", title: "Castile, May 1492" } });
    if (path === "/api/shared-saves/K7QXM2PA/file") return new Response(file as BodyInit, { status: 200 });
    if (path === "/api/shared-saves" && method === "POST") return json(201, { code: "ABCDEFGH", shownCode: "ABCD-EFGH", link: "https://x/s/ABCDEFGH", topicUrl: "https://x/community/t/1-castile#p1" });
    if (path === "/api/shared-saves" && method === "GET") return json(200, { shared: [{ code: "ABCDEFGH", title: "Castile, May 1492", plays: 3, topicUrl: "https://x/t" }] });
    if (path === "/api/account") return json(200, { id: "x", displayName: "Bertrand", email: "b@e.x", signIns: [], devices: [] });
    return json(404, { error: "no_shared_save", message: "There is no shared save with this code." });
  };
  return { fetch, calls };
}

describe("opening a shared save (SAVE-128, SAVE-129)", () => {
  it("makes a new campaign of the player's own, kept as a Manual save, that says where it came from", async () => {
    const original = header({ kind: "ironman", ironman: true, parent: "p0", flags: { ironman_unbroken: true, cheat_marked: false, switched_country: false, began_as_tutorial: false } });
    const srv = fakeServer(encodeSave(original, []));
    const api = new CloudApi("https://x", webTokenStore(memoryKv()), { fetch: srv.fetch });
    const copy = await fetchSharedCopy(api, "k7qx-m2pa", { rng: new Rng(3), now: 5000, device: "Pixel 8", platform: "android" });
    // The card and the file are public: no Bearer token.
    expect(srv.calls.map((c) => `${c.method} ${c.path} ${c.auth ?? "-"}`)).toEqual(["GET /api/shared-saves/K7QXM2PA -", "GET /api/shared-saves/K7QXM2PA/file -"]);
    const h = decodeSave(copy.bytes).header;
    expect(h.campaignId).not.toBe("c1");
    expect(h.saveId).not.toBe("s1");
    expect(h).toMatchObject({ kind: "manual", ironman: false, device: "Pixel 8", platform: "android", savedAt: 5000, sharedFrom: { code: "K7QXM2PA", author: "Leroy" } });
    expect(h.flags.ironman_unbroken).toBe(false);
    expect(h.parent).toBeUndefined();
    expect(copy.path).toBe(`${h.campaignId}/5000-${h.saveId}.phsave`);
    expect(sharedFromLine(h)).toBe("From Leroy's campaign");
  });

  it("says why a code opens nothing", async () => {
    const api = new CloudApi("https://x", webTokenStore(memoryKv()), { fetch: fakeServer(new Uint8Array()).fetch });
    const e = await fetchSharedCopy(api, "ZZZZZZZZ", { rng: new Rng(1), now: 1, device: "d", platform: "web" }).catch((x) => x);
    expect(openError(e)).toBe("There is no shared save with this code.");
    const typo = await fetchSharedCopy(api, "K7Q", { rng: new Rng(1), now: 1, device: "d", platform: "web" }).catch((x) => x);
    expect(openError(typo)).toBe("There is no shared save with this code.");
    const offline = new CloudApi("https://x", webTokenStore(memoryKv()), { fetch: async () => Promise.reject(new TypeError("offline")) });
    expect(openError(await fetchSharedCopy(offline, "K7QXM2PA", { rng: new Rng(1), now: 1, device: "d", platform: "web" }).catch((x) => x))).toBe("Connect to open a shared save.");
  });
});

describe("the Share sheet (SAVE-133)", () => {
  it("asks a signed-out player to sign in, since sharing posts as them", () => {
    const html = shareSheetHtml(shareView("p", header()), { signedIn: false, systemShare: false });
    expect(html).toContain("needs your account");
    expect(html).toContain('data-settings-section="account"');
    expect(html).not.toContain("Post to the community");
  });

  it("holds the title, a note, the three choices and Post, which waits for a choice", () => {
    const v = shareView("p", header());
    const html = shareSheetHtml(v, { signedIn: true, systemShare: false });
    expect(html).toContain('value="Castile, May 1492"');
    expect(html).toContain("<textarea");
    for (const label of ["Show my campaign", "Help me with this", "Something broke"]) expect(html).toContain(label);
    expect(html).not.toContain("Reply in the original topic");
    expect(html).toMatch(/share-post" type="submit" disabled/);
  });

  it("offers Reply in the original topic first, and chosen, for a copy of a shared save", () => {
    const v = shareView("p", header({ sharedFrom: { code: "K7QXM2PA", author: "Leroy" } }));
    expect(v.purpose).toBe("reply");
    const html = shareSheetHtml(v, { signedIn: true, systemShare: false });
    expect(html.indexOf("Reply in the original topic")).toBeLessThan(html.indexOf("Show my campaign"));
    expect(html).toContain("Leroy's save");
  });

  it("posts the save as the player and then shows the link", async () => {
    const srv = fakeServer(new Uint8Array());
    const api = new CloudApi("https://x", webTokenStore(memoryKv()), { fetch: srv.fetch });
    await api.signIn("b@e.x", "secret123", { name: "Pixel 8", platform: "android" });
    const bytes = encodeSave(header(), []);
    const v = shareView("p", header());
    v.purpose = "help";
    v.note = "  Stuck against Aragon.  ";
    await postShare(v, { api, read: async () => bytes, realm: () => "Castile", redraw: () => {} });
    const post = srv.calls.find((c) => c.method === "POST" && c.path === "/api/shared-saves")!;
    expect(post.auth).toBe("Bearer a");
    expect(post.body).toMatchObject({ title: "Castile, May 1492", note: "Stuck against Aragon.", realm: "Castile", purpose: "help" });
    expect(Uint8Array.from(atob((post.body as { file: string }).file), (c) => c.charCodeAt(0))).toEqual(bytes);
    const html = shareSheetHtml(v, { signedIn: true, systemShare: true });
    expect(html).toContain("Shared. Your topic is on the community.");
    for (const label of ["Copy link", "Share link", "Open the topic", "ABCD-EFGH"]) expect(html).toContain(label);
    expect(shareSheetHtml(v, { signedIn: true, systemShare: false })).not.toContain("Share link");
  });
});

describe("the Shared saves row on the account card (SAVE-135)", () => {
  it("lists what the player shared with its plays, the topic and Remove", async () => {
    const srv = fakeServer(new Uint8Array());
    const api = new CloudApi("https://x", webTokenStore(memoryKv()), { fetch: srv.fetch });
    await api.signIn("b@e.x", "secret123", { name: "Pixel 8", platform: "android" });
    const saves = { list: async () => [], read: async () => undefined, commit: async () => { throw new Error("no"); }, remove: async () => {} };
    const sync = new CloudSync(api, saves, memoryKv(), { device: "Pixel 8" });
    const v = accountView();
    v.shared = await api.mySharedSaves();
    const html = accountHtml(sync, v);
    expect(html).toContain("Shared saves");
    expect(html).toContain("Played 3 times");
    expect(html).toContain('data-cloud-topic="https://x/t"');
    expect(html).toContain('data-cloud-ask="shared:ABCDEFGH"');
    v.confirm = "shared:ABCDEFGH";
    expect(accountHtml(sync, v)).toContain("Remove it? The topic stays.");
  });
});
