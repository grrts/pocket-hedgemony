// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accountHtml, accountView } from "./accountCard.ts";
import { CloudApi, CloudError, webTokenStore, type KeyValue } from "./api.ts";
import { capacitorBridge, noBridge, steamAnswer, webBridge, type SignInBridge, type Store } from "./bridge.ts";
import { APP_RETURN, StoreSignIn } from "./storeSignIn.ts";
import { CloudSync, type LocalSaves } from "./sync.ts";

function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

const noSaves: LocalSaves = { list: async () => [], read: async () => undefined, commit: async () => undefined as never, remove: async () => {} };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const account = { id: "a1", displayName: "Bertrand", email: null };
const session = { accessToken: "acc", accessTokenExpiresIn: 900, deviceToken: "dev", deviceId: "d1", account, created: true };
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** A bridge that answers like the stores' sheets; `steam` comes back with a code unless told otherwise. */
function fakeBridge(can: Store[] = ["apple", "google", "steam"], steam: SignInBridge["steam"] = async () => ({ code: "phs_code" })) {
  const asked: { apple: string[]; google: string[]; steam: string[] } = { apple: [], google: [], steam: [] };
  const bridge: SignInBridge & { returnedWith?: { code?: string; error?: string } | undefined } = {
    steamReturn: APP_RETURN,
    can: (s) => can.includes(s),
    apple: async (hash) => {
      asked.apple.push(hash);
      return { identityToken: "apple.jwt", authorizationCode: "apple.code", name: "Bertrand" };
    },
    google: async (hash) => {
      asked.google.push(hash);
      return { idToken: "google.jwt" };
    },
    steam: async (url) => {
      asked.steam.push(url);
      return steam(url);
    },
    returned() {
      const r = this.returnedWith;
      this.returnedWith = undefined;
      return r;
    },
  };
  return { bridge, asked };
}

/** The game with a fake server; `answer` decides what each call says. */
function setup(platform: string, bridge: SignInBridge, answer: (path: string, body: Record<string, unknown>) => Response | undefined = () => undefined, kv = memoryKv()) {
  const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace("https://api.test", "").split("?")[0]!;
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    calls.push({ method: init.method ?? "GET", path, body });
    const own = answer(path, body);
    if (own) return own;
    if (path === "/api/sessions") return json(201, session);
    if (path === "/api/sessions/steam-openid") return json(200, { url: "https://steamcommunity.com/openid/login?x=1" });
    if (path === "/api/account/sign-ins") return json(201, { signIns: [] });
    if (path === "/api/saves") return json(200, { saves: [], tombstones: [], cursor: "1", more: false });
    return json(404, { error: "not_found" });
  };
  const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch });
  const sync = new CloudSync(api, noSaves, kv, { device: "iPhone", online: () => true });
  const device = { name: "iPhone", platform: platform === "steam" ? "steam" : platform };
  return { api, sync, calls, kv, store: new StoreSignIn(sync, bridge, kv, device, platform) };
}

describe("which store sign-ins the card offers (SAVE-155, SAVE-059)", () => {
  it.each([
    ["ios", ["apple", "steam"]],
    ["android", ["google", "steam"]],
    ["web", ["steam", "google", "apple"]],
    ["steam", ["steam"]],
  ])("on %s: %j", (platform, stores) => {
    expect(setup(platform, fakeBridge().bridge).store.stores()).toEqual(stores);
  });

  it("shows only what the build can start, and on iOS nothing without Sign in with Apple", () => {
    expect(setup("web", fakeBridge(["steam"]).bridge).store.stores()).toEqual(["steam"]);
    expect(setup("ios", fakeBridge(["steam"]).bridge).store.stores()).toEqual([]);
    expect(setup("desktop", noBridge).store.stores()).toEqual([]);
  });
});

describe("Sign in with Apple and Google (SAVE-149, SAVE-150)", () => {
  it("gives Apple the nonce's SHA-256 and the server the nonce, with Apple's name for a new account", async () => {
    const { bridge, asked } = fakeBridge();
    const { store, calls, api } = setup("ios", bridge);
    expect(await store.signIn("apple")).toBe(true);
    const sent = calls.find((c) => c.path === "/api/sessions")!.body;
    // Apple's authorization code goes with it, so the server can revoke the sign-in later (SAVE-203).
    expect(sent).toMatchObject({ appleIdentityToken: "apple.jwt", appleAuthorizationCode: "apple.code", displayName: "Bertrand", device: { name: "iPhone", platform: "ios" } });
    expect(sent.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(asked.apple).toEqual([sha256(sent.nonce as string)]);
    expect(api.signedIn).toBe(true);
  });

  it("makes a fresh nonce for every try", async () => {
    const { bridge, asked } = fakeBridge();
    const { store, api } = setup("android", bridge);
    await store.signIn("google");
    await api.signOut();
    await store.signIn("google");
    expect(new Set(asked.google).size).toBe(2);
  });

  it("sends Google's ID token", async () => {
    const { bridge } = fakeBridge();
    const { store, calls } = setup("android", bridge);
    await store.signIn("google");
    expect(Object.keys(calls.find((c) => c.path === "/api/sessions")!.body).sort()).toEqual(["device", "googleIdToken", "nonce"]);
  });

  it("says why when the sheet was closed, and stays signed out", async () => {
    const { bridge } = fakeBridge();
    const { store, api, sync } = setup("android", bridge);
    bridge.google = () => Promise.reject(new CloudError(499, "sign_in_cancelled"));
    await expect(store.signIn("google")).rejects.toThrow();
    expect(store.error).toBe("The sign-in was cancelled.");
    expect(api.signedIn).toBe(false);
    expect(accountHtml(sync, accountView(), 0, undefined, store)).toContain("The sign-in was cancelled.");
  });

  it.each([
    ["apple", 503, { error: "apple_unavailable", message: "Sign in with Apple is not available." }],
    ["apple", 401, { error: "apple_refused", message: "Apple did not accept the sign-in." }],
    ["google", 503, { error: "google_unavailable", message: "Google sign-in is not available." }],
  ] as const)("shows the server's words when %s answers %i", async (which, status, body) => {
    const { store } = setup("web", fakeBridge().bridge, (path) => (path === "/api/sessions" ? json(status, body) : undefined));
    await expect(store.signIn(which)).rejects.toThrow();
    expect(store.error).toBe(body.message);
  });
});

describe("Steam in the browser sheet (SAVE-151, SAVE-152)", () => {
  it("on a phone: asks for Steam's address to come back to the app, and exchanges the code", async () => {
    const { bridge, asked } = fakeBridge();
    const { store, calls, api } = setup("ios", bridge);
    expect(await store.signIn("steam")).toBe(true);
    expect(calls[0]).toEqual({ method: "POST", path: "/api/sessions/steam-openid", body: { return: "pockethegemony://auth/steam" } });
    expect(asked.steam).toEqual(["https://steamcommunity.com/openid/login?x=1"]);
    expect(calls[1]!.body).toEqual({ steamOpenIdCode: "phs_code", device: { name: "iPhone", platform: "ios" } });
    expect(api.signedIn).toBe(true);
  });

  it("on the web: the page goes to Steam, and the sign-in finishes when it comes back", async () => {
    const kv = memoryKv();
    const { bridge } = fakeBridge(undefined, async () => undefined);
    const first = setup("web", bridge, undefined, kv);
    expect(await first.store.signIn("steam")).toBe(false);
    expect(first.api.signedIn).toBe(false);
    // The page is back from Steam.
    bridge.returnedWith = { code: "phs_back" };
    const again = setup("web", bridge, undefined, kv);
    expect(await again.store.resume()).toBe(true);
    expect(again.calls.at(-2)?.body).toMatchObject({ steamOpenIdCode: "phs_back" });
    expect(again.api.signedIn).toBe(true);
    expect(await again.store.resume()).toBe(false);
  });

  it("on the web: an Add comes back as an Add", async () => {
    const kv = memoryKv();
    webTokenStore(kv).save({ deviceToken: "dev0", deviceId: "d0", account });
    const { bridge } = fakeBridge(undefined, async () => undefined);
    const first = setup("web", bridge, (path) => (path === "/api/sessions/refresh" ? json(200, session) : undefined), kv);
    await first.store.add("steam");
    bridge.returnedWith = { code: "phs_back" };
    const again = setup("web", bridge, (path) => (path === "/api/sessions/refresh" ? json(200, session) : undefined), kv);
    expect(await again.store.resume()).toBe(true);
    expect(again.calls.find((c) => c.path === "/api/account/sign-ins")?.body).toEqual({ steamOpenIdCode: "phs_back" });
  });

  it("says why when Steam's answer did not pass", async () => {
    const { bridge } = fakeBridge(undefined, async () => ({ error: "steam_refused" }));
    const { store, api } = setup("android", bridge);
    await expect(store.signIn("steam")).rejects.toThrow();
    expect(store.error).toBe("Steam did not accept the sign-in.");
    expect(api.signedIn).toBe(false);
  });

  it("says so when the server has no return addresses", async () => {
    const { store } = setup("web", fakeBridge().bridge, (path) =>
      path === "/api/sessions/steam-openid" ? json(503, { error: "steam_unavailable", message: "Steam sign-in is not available." }) : undefined,
    );
    await expect(store.signIn("steam")).rejects.toThrow();
    expect(store.error).toBe("Steam sign-in is not available.");
  });
});

describe("the Account card on phones and the web (SAVE-155 … SAVE-157)", () => {
  it("shows the platform's buttons above the email form, in order", () => {
    const { sync, store } = setup("ios", fakeBridge().bridge);
    const html = accountHtml(sync, accountView(), 0, undefined, store);
    expect(html.indexOf("Sign in with Apple")).toBeLessThan(html.indexOf("Sign in with Steam"));
    expect(html.indexOf("Sign in with Steam")).toBeLessThan(html.indexOf("Or use email instead:"));
    expect(html.indexOf("Or use email instead:")).toBeLessThan(html.indexOf("data-cloud-form"));
    expect(html).toContain('class="wax cloud-store cloud-apple" data-cloud-store="apple"');
    expect(html).not.toContain("Sign in with Google");
  });

  it("shows no store button where none can start", () => {
    const { sync, store } = setup("desktop", noBridge);
    const html = accountHtml(sync, accountView(), 0, undefined, store);
    expect(html).not.toContain("data-cloud-store");
    expect(html).not.toContain("Or use email instead:");
  });

  it("names the sign-in under the display name and offers to add the others", async () => {
    const { sync, store } = setup("ios", fakeBridge().bridge);
    await store.signIn("apple");
    const v = accountView();
    v.card = { ...account, signIns: [{ provider: "apple", label: "001234.abcd" }], devices: [] };
    const html = accountHtml(sync, v, 0, undefined, store);
    expect(html).toContain("Signed in with Apple");
    expect(html).toContain("Apple</small>");
    expect(html).toContain('data-cloud-add="steam"');
    expect(html).toContain("Add Sign in with Steam");
    expect(html).not.toContain('data-cloud-add="apple"');
    expect(html).not.toContain("001234.abcd");
  });

  it("says when an added sign-in belongs to another account", async () => {
    const { sync, store } = setup("android", fakeBridge().bridge, (path) => (path === "/api/account/sign-ins" ? json(409, { error: "linked_to_another_account" }) : undefined));
    await store.signIn("google");
    await expect(store.add("steam")).rejects.toThrow();
    const v = accountView();
    v.card = { ...account, signIns: [{ provider: "google", label: "1098765" }], devices: [] };
    expect(accountHtml(sync, v, 0, undefined, store)).toContain("This sign-in already belongs to another Pocket Hegemony account.");
  });
});

describe("the platform bridges (D-SAVE-22)", () => {
  it("reads the way back from Steam", () => {
    expect(steamAnswer("pockethegemony://auth/steam?steamCode=phs_1")).toEqual({ code: "phs_1" });
    expect(steamAnswer("https://play.test/?steamError=steam_refused")).toEqual({ error: "steam_refused" });
    expect(steamAnswer("https://play.test/")).toBeUndefined();
  });

  it("the web takes the code from the address once and cleans it", () => {
    let replaced = "";
    const page = {
      location: { href: "https://play.test/game/?shared=ABCD&steamCode=phs_1#x", origin: "https://play.test", pathname: "/game/" } as Location,
      history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => (replaced = url) } as unknown as History,
    };
    const bridge = webBridge({}, page);
    expect(bridge.steamReturn).toBe("https://play.test/game/");
    expect(bridge.returned()).toEqual({ code: "phs_1" });
    expect(replaced).toBe("/game/?shared=ABCD#x");
    expect(bridge.can("steam")).toBe(true);
    expect(bridge.can("google")).toBe(false);
    expect(webBridge({ googleClientId: "g", appleServicesId: "s", appleRedirectUri: "https://play.test/" }, page).can("apple")).toBe(true);
  });

  it("a phone uses its plugins only when the app has them, and comes back through the app link", async () => {
    const listeners: Record<string, (e: unknown) => void> = {};
    const opened: string[] = [];
    let closed = 0;
    const handle = { remove: () => {} };
    const plugins: Record<string, Record<string, (...a: never[]) => Promise<unknown>>> = {
      Browser: {
        open: async ({ url }: { url: string }) => {
          opened.push(url);
          // The player signs in at Steam; Steam sends the sheet to the app's link.
          setTimeout(() => listeners.appUrlOpen?.({ url: `${APP_RETURN}?steamCode=phs_9` }), 0);
        },
        close: async () => void closed++,
        addListener: async (name: string, cb: (e: unknown) => void) => ((listeners[`browser:${name}`] = cb), handle),
      },
      App: { addListener: async (name: string, cb: (e: unknown) => void) => ((listeners[name] = cb), handle) },
      SignInWithApple: { authorize: async () => ({ response: { identityToken: "apple.jwt", givenName: "Ana", familyName: "Paz" } }) },
    };
    const cap = { isPluginAvailable: (n: string) => n in plugins, Plugins: plugins as unknown as Record<string, unknown> };
    const bridge = capacitorBridge(cap, { appleClientId: "com.pockethegemony.app", appReturn: APP_RETURN });
    expect(bridge.can("apple")).toBe(true);
    expect(bridge.can("steam")).toBe(true);
    expect(bridge.can("google")).toBe(false);
    expect(await bridge.apple("h")).toEqual({ identityToken: "apple.jwt", name: "Ana Paz" });
    expect(await bridge.steam("https://steamcommunity.com/openid/login?x=1")).toEqual({ code: "phs_9" });
    expect(opened).toEqual(["https://steamcommunity.com/openid/login?x=1"]);
    expect(closed).toBe(1);
  });
});
