import { describe, expect, it } from "vitest";
import { CloudApi, CloudError, errorText, webTokenStore, type KeyValue } from "./api.ts";

/** A key-value store in memory, standing in for localStorage. */
function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

type Call = { method: string; url: string; auth: string | undefined; body: unknown };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A fake server: each route answers from a handler; every call is logged. */
function fakeFetch(routes: Record<string, (c: Call) => Response>) {
  const calls: Call[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    const c: Call = { method: init.method ?? "GET", url: url.replace("https://api.test", ""), auth: headers.Authorization, body };
    calls.push(c);
    const key = `${c.method} ${c.url.split("?")[0]}`;
    const h = routes[key];
    if (!h) return json(404, { error: "not_found" });
    return h(c);
  };
  return { fetch, calls };
}

const account = { id: "a1", displayName: "Leroy", email: "l@example.com" };
const session = (n: number) => ({ accessToken: `acc${n}`, accessTokenExpiresIn: 900, deviceToken: `dev${n}`, deviceId: "d1", account });

describe("the cloud API client (SAVE-057, SAVE-114, SAVE-115)", () => {
  it("signs in with email and keeps the device token, not the access token", async () => {
    const kv = memoryKv();
    const f = fakeFetch({ "POST /api/sessions": () => json(200, session(1)) });
    const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch: f.fetch });
    await api.signIn("l@example.com", "secret123", { name: "Browser", platform: "web" });
    expect(f.calls[0]!.body).toEqual({ email: "l@example.com", password: "secret123", device: { name: "Browser", platform: "web" } });
    expect(api.signedIn).toBe(true);
    const kept = JSON.parse(kv.data.get("ph.cloud-device")!);
    expect(kept).toEqual({ deviceToken: "dev1", deviceId: "d1", account });
    expect(JSON.stringify(kept)).not.toContain("acc1");
  });

  it("says why a sign-in failed in the player's words", async () => {
    const f = fakeFetch({ "POST /api/sessions": () => json(401, { error: "wrong_email_or_password" }) });
    const api = new CloudApi("https://api.test", webTokenStore(memoryKv()), { fetch: f.fetch });
    const e = await api.signIn("x@y.z", "nope", { name: "Browser", platform: "web" }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(CloudError);
    expect(errorText(e)).toBe("Wrong email or password.");
    expect(errorText(new CloudError(429, "too_many_tries"))).toContain("15 minutes");
    expect(errorText(new CloudError(0, "offline"))).toContain("Can't reach");
    expect(api.signedIn).toBe(false);
  });

  it("refreshes the access token at launch with the device token and keeps the new device token", async () => {
    const kv = memoryKv();
    webTokenStore(kv).save({ deviceToken: "dev1", deviceId: "d1", account });
    const f = fakeFetch({
      "POST /api/sessions/refresh": (c) => json(200, session((c.body as { deviceToken: string }).deviceToken === "dev1" ? 2 : 9)),
      "GET /api/account": (c) => (c.auth === "Bearer acc2" ? json(200, { ...account, signIns: [], devices: [] }) : json(401, {})),
    });
    const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch: f.fetch });
    await api.getAccount();
    expect(f.calls.map((c) => c.method + " " + c.url)).toEqual(["POST /api/sessions/refresh", "GET /api/account"]);
    expect(JSON.parse(kv.data.get("ph.cloud-device")!).deviceToken).toBe("dev2");
  });

  it("refreshes once when a call answers 401, and every waiting call shares the one refresh", async () => {
    let now = 0;
    let valid = "acc1";
    let refreshes = 0;
    const f = fakeFetch({
      "POST /api/sessions": () => json(200, session(1)),
      "POST /api/sessions/refresh": () => {
        refreshes++;
        valid = "acc2";
        return json(200, session(2));
      },
      "GET /api/saves": (c) => (c.auth === `Bearer ${valid}` ? json(200, { saves: [], tombstones: [], cursor: "5", more: false }) : json(401, { error: "invalid_token" })),
    });
    const api = new CloudApi("https://api.test", webTokenStore(memoryKv()), { fetch: f.fetch, now: () => now });
    await api.signIn("l@example.com", "pw", { name: "Browser", platform: "web" });
    valid = "revoked";
    // The server stopped taking acc1 early: both calls get 401, then one refresh serves them both.
    const [a, b] = await Promise.all([api.changes(undefined), api.changes("3")]);
    expect(a.cursor).toBe("5");
    expect(b.cursor).toBe("5");
    expect(refreshes).toBe(1);
    // A token near its end is refreshed before the call.
    now = 900_000;
    await api.changes("5");
    expect(f.calls.filter((c) => c.url === "/api/sessions/refresh").length).toBe(refreshes);
    expect(f.calls.at(-2)!.url).toBe("/api/sessions/refresh");
  });

  it("forgets the device once its device token is refused (signed out from another device, SAVE-116)", async () => {
    const kv = memoryKv();
    webTokenStore(kv).save({ deviceToken: "dev1", deviceId: "d1", account });
    const f = fakeFetch({ "POST /api/sessions/refresh": () => json(401, { error: "invalid_token" }) });
    const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch: f.fetch });
    let told = 0;
    api.onSignedOut = () => told++;
    const e = (await api.changes(undefined).catch((x: unknown) => x)) as CloudError;
    expect(e.code).toBe("signed_out");
    expect(api.signedIn).toBe(false);
    expect(told).toBe(1);
    expect(kv.data.has("ph.cloud-device")).toBe(false);
  });

  it("reports an unreachable server as offline", async () => {
    const kv = memoryKv();
    webTokenStore(kv).save({ deviceToken: "dev1", deviceId: "d1", account });
    const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch: () => Promise.reject(new TypeError("Failed to fetch")) });
    const e = (await api.getAccount().catch((x: unknown) => x)) as CloudError;
    expect(e.offline).toBe(true);
    expect(api.signedIn).toBe(true);
  });

  it("uploads raw bytes, downloads them, and signs this device out even when the server is not reached", async () => {
    let stored: Uint8Array | undefined;
    const f = fakeFetch({
      "POST /api/sessions": () => json(200, session(1)),
      "PUT /api/saves/s1": (c) => {
        stored = c.body as Uint8Array;
        return json(201, {});
      },
      "GET /api/saves/s1": () => new Response(stored as BodyInit, { status: 200 }),
      "DELETE /api/campaigns/c1": () => new Response(null, { status: 204 }),
    });
    const api = new CloudApi("https://api.test", webTokenStore(memoryKv()), { fetch: f.fetch });
    await api.signIn("l@example.com", "pw", { name: "Browser", platform: "web" });
    await api.putSave("s1", new Uint8Array([80, 72, 83, 86, 1]));
    expect(f.calls.at(-1)!.auth).toBe("Bearer acc1");
    expect([...(await api.getSave("s1"))]).toEqual([80, 72, 83, 86, 1]);
    await api.deleteCampaign("c1");
    await api.signOut();
    expect(api.signedIn).toBe(false);
  });

  it("registers, then signs the new account in", async () => {
    const f = fakeFetch({
      "POST /api/accounts": () => json(201, account),
      "POST /api/sessions": () => json(201, session(1)),
    });
    const api = new CloudApi("https://api.test", webTokenStore(memoryKv()), { fetch: f.fetch });
    await api.register("l@example.com", "Leroy", "longenough", { name: "Browser", platform: "web" });
    expect(f.calls[0]!.body).toEqual({ email: "l@example.com", displayName: "Leroy", password: "longenough" });
    expect(api.account?.displayName).toBe("Leroy");
  });
});
