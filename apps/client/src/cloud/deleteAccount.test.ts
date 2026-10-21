// The engine first, so the saves module finds its imports in order.
import "@ph/engine";
import { describe, expect, it } from "vitest";
import { accountHtml, accountView, DELETED, deleteHtml } from "./accountCard.ts";
import { CloudApi, webTokenStore, type KeyValue } from "./api.ts";
import { CloudSync, type LocalSaves } from "./sync.ts";

/** Delete account on the Account and cloud saves card (SAVE-198, SAVE-205 … SAVE-208). */

function memoryKv(): KeyValue {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

const noSaves: LocalSaves = { list: async () => [], read: async () => undefined, commit: async () => undefined as never, remove: async () => {} };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const leroy = { id: "a1", displayName: "Leroy", email: "leroy@example.org" };
const session = { accessToken: "acc", accessTokenExpiresIn: 900, deviceToken: "dev", deviceId: "d1", account: leroy, created: false };

function setup(deleteAnswer: () => Response = () => new Response(null, { status: 204 })) {
  const calls: string[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace("https://api.test", "").split("?")[0]!;
    const method = init.method ?? "GET";
    calls.push(`${method} ${path}`);
    if (method === "DELETE" && path === "/api/account") return deleteAnswer();
    if (path === "/api/sessions") return json(200, session);
    if (path === "/api/saves") return json(200, { saves: [], tombstones: [], cursor: "1", more: false });
    return json(404, { error: "not_found" });
  };
  const kv = memoryKv();
  const api = new CloudApi("https://api.test", webTokenStore(kv), { fetch });
  const sync = new CloudSync(api, noSaves, kv, { device: "Phone", online: () => true });
  return { api, sync, calls, kv };
}

describe("Delete account (SAVE-205, SAVE-207)", () => {
  it("sits at the bottom of the card, under Sign out, and asks first", async () => {
    const { api, sync } = setup();
    await api.signIn("leroy@example.org", "pw", { name: "Phone", platform: "ios" });
    const v = accountView();
    const html = accountHtml(sync, v);
    expect(html.indexOf("data-cloud-ask=\"delete-account\"")).toBeGreaterThan(html.indexOf("data-cloud-sign-out"));
    expect(html).not.toContain("data-cloud-delete");
    v.confirm = "delete-account";
    const asked = accountHtml(sync, v);
    expect(asked).toContain("data-cloud-delete");
    expect(asked).toContain("Keep");
    expect(asked).not.toContain('data-cloud-ask="delete-account"');
  });

  it("names what goes and what stays", () => {
    const html = deleteHtml("Leroy", 12, 2, false, false);
    expect(html).toContain('Delete the account "Leroy"?');
    expect(html).toContain("Its 12 cloud saves and 2 shared saves are deleted, and every device is signed out.");
    expect(html).toContain("The saves on this device stay.");
    expect(html).toContain("Restore purchases unlocks the full game again.");
    expect(html).toContain("This cannot be undone.");
    expect(deleteHtml("Leroy", 1, 0, false, false)).toContain("Its 1 cloud save is deleted");
    expect(deleteHtml("Leroy", undefined, undefined, false, false)).toContain("Its cloud saves are deleted");
  });

  it("waits for a connection (SAVE-206)", () => {
    const html = deleteHtml("Leroy", 3, 0, true, false);
    expect(html).toContain("Connect to delete the account.");
    expect(html).toMatch(/data-cloud-delete disabled/);
  });
});

describe("after deleting (SAVE-198, SAVE-206)", () => {
  it("sends DELETE /api/account and signs this device out", async () => {
    const { api, sync, calls, kv } = setup();
    await api.signIn("leroy@example.org", "pw", { name: "Phone", platform: "ios" });
    await api.deleteAccount();
    expect(calls).toContain("DELETE /api/account");
    expect(api.signedIn).toBe(false);
    expect(sync.state()).toBe("signed_out");
    expect(webTokenStore(kv).load()).toBeUndefined();
  });

  it("shows the signed-out card with the line", async () => {
    const { sync } = setup();
    const v = accountView();
    v.notice = DELETED;
    const html = accountHtml(sync, v);
    expect(html).toContain(DELETED);
    expect(html).toContain("data-cloud-form");
  });

  it("stays signed in when the server refuses", async () => {
    const { api } = setup(() => json(500, { error: "server" }));
    await api.signIn("leroy@example.org", "pw", { name: "Phone", platform: "ios" });
    await expect(api.deleteAccount()).rejects.toThrow();
    expect(api.signedIn).toBe(true);
  });
});
