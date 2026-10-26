import { describe, expect, it } from "vitest";
import type { KeyValue } from "../cloud/api.ts";
import { browserOf, LIMITS, Telemetry, tidy, type TelemetryHost } from "./telemetry.ts";

function memory(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k), set: (k, v) => (v === undefined ? data.delete(k) : data.set(k, v)) };
}

function setup(over: Partial<TelemetryHost> = {}) {
  const posts: { url: string; body: any }[] = [];
  const consent = { stats: true, crashes: true };
  let up = true;
  let clock = Date.parse("2026-10-21T12:00:00Z");
  const host: TelemetryHost = {
    base: "https://api.example",
    runtime: "web",
    version: "0.1.0",
    kv: memory(),
    stats: () => consent.stats,
    crashes: () => consent.crashes,
    accountId: () => undefined,
    where: () => "map",
    post: async (url, body) => {
      if (!up) return false;
      posts.push({ url, body });
      return true;
    },
    now: () => new Date(clock),
    ...over,
  };
  return { t: new Telemetry(host), host, posts, consent, offline: (v: boolean) => (up = !v), tick: (ms: number) => (clock += ms) };
}

describe("usage statistics", () => {
  it("records nothing without consent", async () => {
    const s = setup();
    s.consent.stats = false;
    s.t.track("session_started");
    await s.t.flush();
    expect(s.posts).toEqual([]);
  });

  it("sends nothing in a build without a server", async () => {
    const s = setup({ base: undefined });
    s.t.track("session_started");
    s.t.crash("error", "boom");
    await s.t.flush();
    expect(s.posts).toEqual([]);
    expect(s.t.available).toBe(false);
  });

  it("sends a batch with the install id, and keeps it while offline", async () => {
    const s = setup();
    s.offline(true);
    s.t.track("turn_ended", { turn: 3 });
    await s.t.flush();
    expect(s.posts).toEqual([]);
    // A new launch reads the queue back.
    const again = new Telemetry(s.host);
    s.offline(false);
    await again.flush();
    expect(s.posts).toHaveLength(1);
    expect(s.posts[0]!.url).toBe("https://api.example/api/metrics");
    expect(s.posts[0]!.body.installId).toBe(again.installId);
    expect(s.posts[0]!.body.events).toEqual([{ name: "turn_ended", occurredAt: "2026-10-21T12:00:00.000Z", properties: { turn: 3 } }]);
  });

  it("keeps the install id between launches", () => {
    const s = setup();
    expect(new Telemetry(s.host).installId).toBe(s.t.installId);
  });

  it("sends at most one batch's worth per request and caps the queue", async () => {
    const s = setup();
    s.offline(true);
    for (let i = 0; i < LIMITS.queued + 20; i++) s.t.track("turn_ended", { turn: i });
    s.offline(false);
    await s.t.flush();
    expect(s.posts.map((p) => p.body.events.length)).toEqual([100, 100, 100, 100, 100]);
    // The oldest were dropped.
    expect(s.posts[0]!.body.events[0].properties.turn).toBe(20);
  });

  it("forgets the queue when the player turns statistics off", async () => {
    const s = setup();
    s.offline(true);
    s.t.track("session_started");
    s.consent.stats = false;
    s.t.consentChanged();
    s.consent.stats = true;
    s.offline(false);
    await s.t.flush();
    expect(s.posts).toEqual([]);
  });

  it("names the account only when signed in", async () => {
    const s = setup({ accountId: () => "0192b6a8-0000-7000-8000-000000000000" });
    s.t.track("session_started");
    await s.t.flush();
    expect(s.posts[0]!.body.accountId).toBe("0192b6a8-0000-7000-8000-000000000000");
  });
});

describe("crash reports", () => {
  it("sends at once with where it happened, and never without consent", async () => {
    const s = setup();
    s.consent.stats = false;
    s.t.crash("error", "x is undefined", "at f (https://game.example/assets/main-abc.js?v=2:10:5)");
    await s.t.flush();
    expect(s.posts).toHaveLength(1);
    expect(s.posts[0]!.url).toBe("https://api.example/api/crashes");
    expect(s.posts[0]!.body.crashes[0]).toMatchObject({ kind: "error", message: "x is undefined", stack: "at f (main-abc.js:10:5)", where: "map" });
    expect(s.posts[0]!.body).not.toHaveProperty("accountId");
    s.consent.crashes = false;
    s.t.crash("error", "other");
    await s.t.flush();
    expect(s.posts).toHaveLength(1);
  });

  it("reports the same crash in a loop once a minute", async () => {
    const s = setup();
    s.t.crash("error", "loop");
    s.t.crash("error", "loop");
    await s.t.flush();
    s.tick(61_000);
    s.t.crash("error", "loop");
    await s.t.flush();
    expect(s.posts.flatMap((p) => p.body.crashes)).toHaveLength(2);
  });
});

describe("what leaves the device", () => {
  it("keeps only file names in stacks", () => {
    expect(tidy("at g (app://pocket/assets/engine.worker-x1.js:1:200)\nat h (file:///Users/leroy/game/index.js:4:2)")).toBe("at g (engine.worker-x1.js:1:200)\nat h (index.js:4:2)");
  });

  it("keeps only the browser family and major version", () => {
    expect(browserOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")).toBe("Safari 17");
    expect(browserOf("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0")).toBe("Edge 130");
    expect(browserOf("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) pocket-hegemony/0.1.0 Chrome/128.0.0.0 Electron/32.0.0 Safari/537.36")).toBe("Electron 32");
  });
});
