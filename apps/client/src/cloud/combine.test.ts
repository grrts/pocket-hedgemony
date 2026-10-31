// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { describe, expect, it } from "vitest";
import { accountHtml, accountView } from "./accountCard.ts";
import { CloudApi, webTokenStore, type CombineOffer, type KeyValue } from "./api.ts";
import type { SignInBridge, Store } from "./bridge.ts";
import { combinedLine, combineHtml, offerLine, RAN_OUT } from "./combine.ts";
import { APP_RETURN, StoreSignIn } from "./storeSignIn.ts";
import { CloudSync, type LocalSaves } from "./sync.ts";

/** Combining two accounts and removing a sign-in on the Account card (SAVE-192, SAVE-194 … SAVE-197). */

function memoryKv(): KeyValue {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

const noSaves: LocalSaves = { list: async () => [], read: async () => undefined, commit: async () => undefined as never, remove: async () => {} };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const leroy = { id: "a1", displayName: "Leroy", email: null };
const session = { accessToken: "acc", accessTokenExpiresIn: 900, deviceToken: "dev", deviceId: "d1", account: leroy, created: false };

const offer = (over: Partial<CombineOffer> = {}): CombineOffer => ({
  signIn: "apple",
  account: { displayName: "Bertrand", saves: 4, sharedSaves: 0, purchases: [], storageFull: false, sharedFull: false },
  blockedBy: null,
  token: "a1.b2.1792500000.mac",
  ...over,
});

const bridge: SignInBridge = {
  steamReturn: APP_RETURN,
  can: (s: Store) => s === "apple" || s === "steam",
  apple: async () => ({ identityToken: "apple.jwt" }),
  google: async () => ({ idToken: "google.jwt" }),
  steam: async () => ({ code: "phs_code" }),
  returned: () => undefined,
};

function setup(answer: (method: string, path: string, body: Record<string, unknown>) => Response | undefined = () => undefined) {
  const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace("https://api.test", "").split("?")[0]!;
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    const method = init.method ?? "GET";
    calls.push({ method, path, body });
    const own = answer(method, path, body);
    if (own) return own;
    if (path === "/api/sessions") return json(200, session);
    if (path === "/api/saves") return json(200, { saves: [], tombstones: [], cursor: "1", more: false });
    return json(404, { error: "not_found" });
  };
  const kv = memoryKv();
  const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch });
  const sync = new CloudSync(api, noSaves, kv, { device: "Steam Deck", online: () => true });
  const store = new StoreSignIn(sync, bridge, kv, { name: "iPhone", platform: "ios" }, "ios");
  return { api, sync, store, calls };
}

describe("the offer to combine (SAVE-194)", () => {
  it("names what the other account holds", () => {
    expect(offerLine(offer())).toBe('This Sign in with Apple has its own Pocket Hegemony account, "Bertrand", with 4 saves.');
    expect(offerLine(offer({ signIn: "steam", account: { ...offer().account, saves: 1, sharedSaves: 2, purchases: ["apple", "google"] } }))).toBe(
      'This Steam sign-in has its own Pocket Hegemony account, "Bertrand", with 1 save, 2 shared saves and the full game on the App Store and Google Play.',
    );
  });

  it("asks once what combining does, with Combine accounts and Keep apart", () => {
    const html = combineHtml({ ...offer(), at: 0 }, "Leroy", false, 1000);
    expect(html).toContain("Combine the two accounts?");
    expect(html).toContain("Everything moves to this account, &#34;Leroy&#34;: saves, shared saves, purchases, sign-ins and devices. All saves are kept. &#34;Bertrand&#34; is then closed.");
    expect(html).toContain("data-cloud-combine>Combine accounts");
    expect(html).toContain(">Keep apart<");
    expect(html).not.toContain("storage will be full");
    expect(combineHtml({ ...offer({ account: { ...offer().account, storageFull: true } }), at: 0 }, "Leroy", false, 0)).toContain("Your storage will be full; delete old saves to keep uploading.");
  });

  it("gives the reason and only OK when a store both hold blocks it (SAVE-188)", () => {
    const message = "Both accounts have a Steam sign-in. Remove one of them, then add this sign-in again.";
    const { token: _t, ...rest } = offer();
    const html = combineHtml({ ...rest, blockedBy: "steam", message, at: 0 }, "Leroy", false, 0);
    expect(html).toContain(message);
    expect(html).toContain(">OK<");
    expect(html).not.toContain("data-cloud-combine>");
  });

  it("says when the offer ran out after 10 minutes", () => {
    expect(combineHtml({ ...offer(), at: 0 }, "Leroy", false, 10 * 60_000)).toContain(RAN_OUT);
    expect(combineHtml({ ...offer(), at: 0 }, "Leroy", false, 10 * 60_000 - 1)).toContain("Combine accounts");
  });
});

describe("Add, then combine, on the card (SAVE-186, SAVE-187)", () => {
  it("an Add of another account's sign-in turns into the question, not an error", async () => {
    const { api, sync, store, calls } = setup((method, path) =>
      path === "/api/account/sign-ins" ? json(409, { error: "linked_to_another_account", message: "This sign-in already belongs to another Pocket Hegemony account.", combine: offer() }) : undefined,
    );
    await api.signIn("leroy@example.org", "correct horse", { name: "Steam Deck", platform: "steam" });
    expect(await store.add("apple")).toBe(true);
    expect(store.error).toBe("");
    expect(store.offer?.token).toBe(offer().token);

    const v = accountView();
    v.card = { ...leroy, signIns: [{ provider: "steam", label: "76561198000000001" }], devices: [] };
    const html = accountHtml(sync, v, store.offer!.at, undefined, store);
    expect(html).toContain('This Sign in with Apple has its own Pocket Hegemony account, &#34;Bertrand&#34;, with 4 saves.');
    // The question takes the Add buttons' place.
    expect(html).not.toContain("data-cloud-add");
    expect(calls.filter((c) => c.path === "/api/account/sign-ins")).toHaveLength(1);
  });

  it("Combine accounts sends the token and the card says what happened", async () => {
    const { api, calls } = setup((method, path) =>
      path === "/api/account/merge"
        ? json(200, { ...leroy, signIns: [{ provider: "steam", label: "s" }, { provider: "apple", label: "a" }], devices: [], combined: { displayName: "Bertrand", signIns: 1, devices: 1, saves: 4, sharedSaves: 0, purchases: 0 } })
        : undefined,
    );
    await api.signIn("leroy@example.org", "correct horse", { name: "Steam Deck", platform: "steam" });
    const r = await api.combineAccounts(offer().token!);
    expect(calls.at(-1)).toMatchObject({ method: "POST", path: "/api/account/merge", body: { combineToken: offer().token } });
    expect(combinedLine(r.combined.displayName)).toBe('Accounts combined. Everything from "Bertrand" is now in this account.');
  });
});

describe("Remove on the Sign-ins row (SAVE-195, SAVE-196)", () => {
  it("each sign-in has Remove while there are two or more, asking first in its row", async () => {
    const { api, sync } = setup();
    await api.signIn("leroy@example.org", "correct horse", { name: "Steam Deck", platform: "steam" });
    const v = accountView();
    v.card = { ...leroy, signIns: [{ provider: "email", label: "leroy@example.org" }, { provider: "steam", label: "s" }], devices: [] };
    let html = accountHtml(sync, v);
    expect(html).toContain('data-cloud-ask="sign-in:steam"');
    expect(html).toContain('data-cloud-ask="sign-in:email"');
    v.confirm = "sign-in:steam";
    html = accountHtml(sync, v);
    expect(html).toContain("Remove Steam? This device stays signed in.");
    expect(html).toContain('data-cloud-unlink="steam"');

    v.card = { ...v.card, signIns: [{ provider: "steam", label: "s" }] };
    expect(accountHtml(sync, v)).not.toContain("data-cloud-ask=\"sign-in:");
  });

  it("removes through the server", async () => {
    const { api, calls } = setup((method, path) => (method === "DELETE" && path === "/api/account/sign-ins/email" ? json(200, { signIns: [{ provider: "steam", label: "s" }] }) : undefined));
    await api.signIn("leroy@example.org", "correct horse", { name: "Steam Deck", platform: "steam" });
    expect(await api.removeSignIn("email")).toEqual([{ provider: "steam", label: "s" }]);
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: "/api/account/sign-ins/email" });
  });
});

describe("a device of the other account (SAVE-192)", () => {
  it("replaces the cloud lines it held when the list starts over", async () => {
    let reset = false;
    const row = (saveId: string) => ({ saveId, campaignId: "c", kind: "manual", name: saveId, savedAt: 1, device: "iPhone", platform: "ios", gameVersion: "0.1.0", formatVersion: 1, turn: 1, date: { y: 1444, m: 11 }, nation: "POR", ironman: false, size: 10 });
    const { api, sync } = setup((method, path) =>
      path === "/api/saves" ? json(200, reset ? { saves: [row("l1"), row("b1")], tombstones: [], cursor: "9", more: false, reset: true } : { saves: [row("old")], tombstones: [], cursor: "3", more: false }) : undefined,
    );
    await api.signIn("bertrand@example.org", "correct horse", { name: "iPhone", platform: "ios" });
    await sync.run("launch");
    expect(sync.remote([]).map((e) => e.header.saveId)).toEqual(["old"]);
    reset = true;
    await sync.run("launch");
    expect(sync.remote([]).map((e) => e.header.saveId)).toEqual(["l1", "b1"]);
  });
});
