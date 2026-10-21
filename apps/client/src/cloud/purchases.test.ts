// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { describe, expect, it } from "vitest";
import { savesConfig } from "@ph/engine/domain/saves";
import { CloudApi, CloudError, webTokenStore, type KeyValue } from "./api.ts";
import { Purchases, purchasesApi, shellStoreBridge, steamStoreBridge, unlockHtml, type BuyOutcome, type EntitlementAnswer, type PurchasesApi, type StoreBridge, type StoreProof } from "./purchases.ts";

const PM = savesConfig.purchases.messages;

function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

/** A phone store: what it says it owns, the proof it holds, and what its sheet does. */
function fakeStore(o: { store?: "apple" | "google"; owned?: boolean; buy?: BuyOutcome; restore?: StoreProof | null } = {}) {
  const calls: string[] = [];
  const proof: StoreProof = (o.store ?? "apple") === "apple" ? { signedTransaction: "jws" } : { purchaseToken: "tok" };
  const bridge: StoreBridge & { ownedNow: boolean } = {
    store: o.store ?? "apple",
    sells: true,
    ownedNow: o.owned ?? false,
    async owned() {
      calls.push("owned");
      return this.ownedNow;
    },
    proof: async () => (calls.push("proof"), bridge.ownedNow ? proof : null),
    price: async () => "€9.99",
    buy: async (tag) => (calls.push(`buy ${tag}`), o.buy ?? { outcome: "bought", proof }),
    restore: async () => (calls.push("restore"), o.restore === undefined ? proof : o.restore),
  };
  return { bridge, calls };
}

/** The server: its entitlement status for this store, and what a sent proof turns it into. */
function fakeServer(o: { signedIn?: boolean; status?: EntitlementAnswer["status"]; after?: EntitlementAnswer["status"]; refuse?: string; down?: boolean } = {}) {
  const calls: string[] = [];
  let status = o.status ?? "none";
  const answer = (store: EntitlementAnswer["store"]): EntitlementAnswer => ({ store, fullGame: status === "active", status, checkedAt: null, accountTag: "tag-1" });
  const api: PurchasesApi = {
    signedIn: o.signedIn ?? true,
    entitlement: async (store) => {
      calls.push(`GET ${store}`);
      if (o.down) throw new CloudError(0, "offline");
      return answer(store);
    },
    submitPurchase: async (store, proof) => {
      calls.push(`POST ${store} ${JSON.stringify(proof)}`);
      if (o.refuse) throw new CloudError(409, o.refuse);
      status = o.after ?? "active";
      return answer(store);
    },
  };
  return { api, calls };
}

describe("the game decides from its store and the server (SAVE-179)", () => {
  it("unlocks from the server's active entitlement and remembers it on the device", async () => {
    const kv = memoryKv();
    const p = new Purchases(fakeStore().bridge, fakeServer({ status: "active" }).api, kv);
    expect(p.unlocked).toBe(false);
    expect(await p.refresh()).toBe(true);
    expect(kv.data.get("ph.full-game")).toBe("1");
    // The next launch starts unlocked before the store answers.
    expect(new Purchases(fakeStore().bridge, fakeServer().api, kv).unlocked).toBe(true);
  });

  it("locks again after a refund, although the store's cached answer still says owned", async () => {
    let changed = 0;
    const p = new Purchases(fakeStore({ owned: true }).bridge, fakeServer({ status: "refunded" }).api, memoryKv());
    p.unlocked = true;
    p.onChange = () => changed++;
    expect(await p.refresh()).toBe(false);
    expect(changed).toBe(1);
  });

  it("sends the store's proof first when the server holds no active entitlement", async () => {
    const store = fakeStore({ store: "google", owned: true });
    const server = fakeServer({ status: "none" });
    const p = new Purchases(store.bridge, server.api, memoryKv());
    expect(await p.refresh()).toBe(true);
    expect(server.calls).toEqual(["GET google", 'POST google {"purchaseToken":"tok"}']);
    expect(p.server).toBe("active");
  });

  it("asks only the store when signed out or offline", async () => {
    const signedOut = fakeServer({ signedIn: false });
    expect(await new Purchases(fakeStore({ owned: true }).bridge, signedOut.api, memoryKv()).refresh()).toBe(true);
    expect(signedOut.calls).toEqual([]);
    expect(await new Purchases(fakeStore({ owned: false }).bridge, fakeServer({ down: true }).api, memoryKv()).refresh()).toBe(false);
  });

  it("on Steam the paid app is the full game whatever the server says, and the check only records it", async () => {
    const server = fakeServer({ status: "refunded" });
    const p = new Purchases(steamStoreBridge(), server.api, memoryKv());
    expect(p.unlocked).toBe(true);
    expect(await p.refresh()).toBe(true);
    expect(server.calls).toEqual(["GET steam"]);
  });

  it("takes a bridge only from a phone shell", () => {
    expect(shellStoreBridge()).toBeUndefined();
    (globalThis as { phStore?: unknown }).phStore = { ...fakeStore().bridge };
    expect(shellStoreBridge()?.store).toBe("apple");
    delete (globalThis as { phStore?: unknown }).phStore;
  });
});

describe("Buy and Restore purchases on the Unlock card (SAVE-182 … SAVE-185)", () => {
  it("buys with the account's tag, sends the proof and says it is unlocked", async () => {
    const store = fakeStore();
    const server = fakeServer();
    const p = new Purchases(store.bridge, server.api, memoryKv());
    await p.buy();
    expect(store.calls).toEqual(["buy tag-1"]);
    expect(server.calls).toEqual(["GET apple", 'POST apple {"signedTransaction":"jws"}']);
    expect(p.unlocked).toBe(true);
    expect(p.note).toBe(PM.unlocked);
    expect(unlockHtml(p, { realm: "Portugal" })).toContain("Play Portugal");
  });

  it("a cancelled purchase adds no message; a pending one waits", async () => {
    const cancelled = new Purchases(fakeStore({ buy: { outcome: "cancelled" } }).bridge, fakeServer().api, memoryKv());
    await cancelled.buy();
    expect([cancelled.unlocked, cancelled.note]).toEqual([false, ""]);
    const pending = new Purchases(fakeStore({ buy: { outcome: "pending" } }).bridge, fakeServer().api, memoryKv());
    await pending.buy();
    expect(pending.note).toBe(PM.pending);
  });

  it("Restore purchases says when nothing was found, and when the purchase is on another account", async () => {
    const none = new Purchases(fakeStore({ restore: null }).bridge, fakeServer().api, memoryKv());
    await none.restore();
    expect(none.note).toBe(PM.nothing_to_restore);
    const other = new Purchases(fakeStore().bridge, fakeServer({ refuse: "other_account" }).api, memoryKv());
    await other.restore();
    expect([other.unlocked, other.note]).toEqual([false, PM.other_account]);
  });

  it("the card holds what it unlocks, Buy with the store's price and Restore purchases, and names no store", async () => {
    const p = new Purchases(fakeStore().bridge, fakeServer().api, memoryKv());
    await p.refresh();
    const html = unlockHtml(p, { message: "Portugal is part of the full game. Unlock it to continue this campaign." });
    expect(html).toContain(PM.unlocks);
    expect(html).toContain("Buy · €9.99");
    expect(html).toContain("Restore purchases");
    expect(html).toContain("Portugal is part of the full game.");
    expect(html).not.toMatch(/Steam|App Store|Google Play/);
    // The Steam app sells nothing itself.
    expect(unlockHtml(new Purchases({ ...steamStoreBridge(), owned: async () => false }, fakeServer().api, memoryKv()))).not.toContain("Buy");
  });
});

describe("the server calls (SAVE-172)", () => {
  it("asks about this store only and sends the proof with the store's name", async () => {
    const calls: { method: string; path: string; body: unknown }[] = [];
    const fetch = async (url: string, init: RequestInit = {}) => {
      const path = new URL(url).pathname;
      calls.push({ method: init.method ?? "GET", path, body: typeof init.body === "string" ? JSON.parse(init.body) : undefined });
      if (path === "/api/sessions/refresh") return new Response(JSON.stringify({ accessToken: "a", accessTokenExpiresIn: 900, deviceToken: "d2", deviceId: "dev1", account: { id: "x", displayName: "B", email: null } }), { status: 200 });
      return new Response(JSON.stringify({ store: "google", fullGame: true, status: "active", checkedAt: null, accountTag: "h" }), { status: 200 });
    };
    const kv = memoryKv();
    webTokenStore(kv).save({ deviceToken: "d", deviceId: "dev1", account: { id: "x", displayName: "B", email: null } });
    const api = purchasesApi(new CloudApi("https://x", webTokenStore(kv), { fetch }));
    expect((await api.entitlement("google")).status).toBe("active");
    await api.submitPurchase("google", { purchaseToken: "tok" });
    expect(calls.filter((c) => c.path !== "/api/sessions/refresh")).toEqual([
      { method: "GET", path: "/api/entitlements/google", body: undefined },
      { method: "POST", path: "/api/purchases", body: { purchaseToken: "tok", store: "google" } },
    ]);
  });
});
