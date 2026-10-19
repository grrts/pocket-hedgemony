// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { describe, expect, it } from "vitest";
import { headerSpan, readHeader } from "@ph/engine/domain/saves";
import type { StoredSave } from "../saves/store.ts";
import { accountHtml, accountView } from "./accountCard.ts";
import { CloudApi, desktopTokenStore, errorText, CloudError, webTokenStore, type KeyValue, type SecretStore } from "./api.ts";
import { SteamSignIn } from "./steam.ts";
import { CloudSync, type LocalSaves } from "./sync.ts";

function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

function memorySaves(): LocalSaves {
  const files = new Map<string, Uint8Array>();
  const entry = (path: string, b: Uint8Array): StoredSave => ({ path, header: readHeader(b), head: b.slice(0, headerSpan(b)) });
  return {
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

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const steamAccount = { id: "a1", displayName: "Bertrand", email: null };
const session = { accessToken: "acc", accessTokenExpiresIn: 900, deviceToken: "dev", deviceId: "d1", account: steamAccount };

/** The game with a fake server; `answer` decides what `POST /api/sessions` says. */
function setup(answer: (body: Record<string, unknown>) => Response = () => json(201, { ...session, created: true }), kv = memoryKv()) {
  const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace("https://api.test", "").split("?")[0]!;
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    calls.push({ method: init.method ?? "GET", path, body });
    if (path === "/api/sessions" && init.method === "POST") return answer(body);
    if (path === "/api/saves") return json(200, { saves: [], tombstones: [], cursor: "1", more: false });
    if (path.startsWith("/api/devices/")) return new Response(null, { status: 204 });
    return json(404, { error: "not_found" });
  };
  const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch });
  const sync = new CloudSync(api, memorySaves(), kv, { device: "Steam Deck", online: () => true });
  const tickets: string[] = [];
  const bridge = {
    name: "Bertrand",
    webTicket: async (identity: string) => {
      tickets.push(identity);
      return "1400abff";
    },
  };
  const steam = new SteamSignIn(sync, bridge, kv, { name: "Steam Deck", platform: "steam" }, "pockethegemony");
  return { api, sync, steam, calls, tickets, kv, bridge };
}

describe("Steam sign-in in the Steam build (SAVE-141, SAVE-142)", () => {
  it("signs in by itself at launch with a Web API ticket and the Steam name", async () => {
    const { api, steam, calls, tickets } = setup();
    expect(await steam.atLaunch()).toBe(true);
    expect(tickets).toEqual(["pockethegemony"]);
    expect(calls[0]).toEqual({
      method: "POST",
      path: "/api/sessions",
      body: { steamTicket: "1400abff", displayName: "Bertrand", device: { name: "Steam Deck", platform: "steam" } },
    });
    expect(api.signedIn).toBe(true);
    expect(api.account?.displayName).toBe("Bertrand");
  });

  it("does nothing at launch when already signed in", async () => {
    const kv = memoryKv();
    webTokenStore(kv).save({ deviceToken: "dev0", deviceId: "d0", account: steamAccount });
    const { steam, tickets } = setup(undefined, kv);
    expect(await steam.atLaunch()).toBe(false);
    expect(tickets).toEqual([]);
  });

  it("is not signed in again after the player signed out, until they tap Sign in with Steam", async () => {
    const kv = memoryKv();
    const first = setup(undefined, kv);
    await first.steam.atLaunch();
    await first.api.signOut();
    expect(first.api.signedIn).toBe(false);
    // The next launch.
    const again = setup(undefined, kv);
    expect(again.steam.silent).toBe(false);
    expect(await again.steam.atLaunch()).toBe(false);
    expect(again.tickets).toEqual([]);
    await again.steam.signIn();
    expect(again.api.signedIn).toBe(true);
    expect(again.steam.silent).toBe(true);
  });

  it.each([
    ["Steam refuses the ticket", () => json(401, { error: "steam_refused", message: "Steam did not accept the sign-in." }), "Steam did not accept the sign-in."],
    ["the server has no Steam key", () => json(503, { error: "steam_unavailable", message: "Steam sign-in is not available." }), "Steam sign-in is not available."],
  ])("fails silently at launch when %s, and keeps the reason for the card", async (_why, answer, message) => {
    const { api, steam, sync } = setup(answer);
    expect(await steam.atLaunch()).toBe(false);
    expect(api.signedIn).toBe(false);
    expect(steam.error).toBe(message);
    expect(accountHtml(sync, accountView(), 0, steam)).toContain(message);
  });

  it("fails silently when the server cannot be reached", async () => {
    const { steam, sync } = setup();
    (sync.api as unknown as { fetch: () => Promise<Response> }).fetch = () => Promise.reject(new TypeError("offline"));
    expect(await steam.atLaunch()).toBe(false);
    expect(steam.error).toBe("Can't reach the server. Check the connection and try again.");
  });

  it("says so when Steam gives no ticket", async () => {
    const { steam, bridge } = setup();
    bridge.webTicket = () => Promise.reject(new Error("timed out"));
    expect(await steam.atLaunch()).toBe(false);
    expect(steam.error).toContain("Steam could not sign you in");
    expect(errorText(new CloudError(503, "steam_unavailable"))).toBe("Steam sign-in is not available.");
  });
});

describe("the Account card with Steam (SAVE-146, SAVE-147)", () => {
  it("offers Sign in with Steam above the email form only in the Steam build", () => {
    const { sync, steam } = setup();
    const html = accountHtml(sync, accountView(), 0, steam);
    expect(html).toContain("data-cloud-steam");
    expect(html.indexOf("Sign in with Steam")).toBeLessThan(html.indexOf("data-cloud-form"));
    expect(accountHtml(sync, accountView(), 0)).not.toContain("Steam");
  });

  it("shows Steam as the sign-in once signed in", async () => {
    const { sync, steam } = setup();
    await steam.atLaunch();
    const v = accountView();
    v.card = { ...steamAccount, signIns: [{ provider: "email", label: "b@e.x" }, { provider: "steam", label: "76561198000000002" }], devices: [] };
    const html = accountHtml(sync, v, 0, steam);
    expect(html).toContain("Signed in with Steam");
    expect(html).toContain("<b>Sign-ins</b>");
    expect(html.indexOf("Steam · Bertrand")).toBeLessThan(html.indexOf("Email · b@e.x"));
    expect(html).not.toContain("76561198000000002");
  });
});

describe("the device token on the desktop (SAVE-143)", () => {
  const secret = (usable: boolean): SecretStore & { value: string | undefined } => {
    const s = {
      value: undefined as string | undefined,
      get: () => (usable ? s.value : undefined),
      set: (v: string | undefined) => {
        if (v === undefined) {
          s.value = undefined;
          return true;
        }
        if (!usable) return false;
        s.value = v;
        return true;
      },
    };
    return s;
  };
  const tokens = { deviceToken: "dev", deviceId: "d1", account: steamAccount };

  it("keeps it in safeStorage and not in web storage", () => {
    const kv = memoryKv();
    const s = secret(true);
    const store = desktopTokenStore(s, webTokenStore(kv));
    store.save(tokens);
    expect(JSON.parse(s.value!)).toEqual(tokens);
    expect(kv.data.size).toBe(0);
    expect(store.load()).toEqual(tokens);
    store.save(undefined);
    expect(s.value).toBeUndefined();
  });

  it("moves a token web storage kept before into safeStorage", () => {
    const kv = memoryKv();
    webTokenStore(kv).save(tokens);
    const s = secret(true);
    expect(desktopTokenStore(s, webTokenStore(kv)).load()).toEqual(tokens);
    expect(s.value).toBeDefined();
    expect(kv.data.size).toBe(0);
  });

  it("stays in web storage where safeStorage cannot encrypt", () => {
    const kv = memoryKv();
    const store = desktopTokenStore(secret(false), webTokenStore(kv));
    store.save(tokens);
    expect(kv.data.size).toBe(1);
    expect(store.load()).toEqual(tokens);
  });
});
