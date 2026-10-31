import type { KeyValue } from "../cloud/api.ts";
import type { Runtime } from "../platform.ts";

/**
 * Usage statistics and crash reports (settings SET-114, game-shell SHELL-014,
 * the privacy page): nothing is recorded or sent unless the player turned the
 * matching Privacy row on. Statistics wait in a small queue on the device and
 * go to our server in batches (`POST /api/metrics`), so play offline loses
 * nothing; crash reports go at once (`POST /api/crashes`) and wait only while
 * the server can't be reached. Turning a row off empties its queue.
 */

export interface MetricEvent {
  name: string;
  occurredAt: string;
  properties?: Record<string, string | number | boolean>;
}

export type CrashKind = "error" | "rejection" | "worker";

export interface CrashReport {
  kind: CrashKind;
  message: string;
  stack?: string;
  where?: string;
  browser?: string;
  occurredAt: string;
}

export interface TelemetryHost {
  /** The server's address, or undefined when the build has none (then nothing is ever sent). */
  base: string | undefined;
  runtime: Runtime;
  version: string;
  kv: KeyValue;
  /** The two Privacy rows; "ask" (not answered yet) counts as off. */
  stats: () => boolean;
  crashes: () => boolean;
  /** The signed-in account's id, sent with statistics only (the privacy page). */
  accountId: () => string | undefined;
  /** What the player has open, to say where a crash happened. */
  where: () => string | undefined;
  post: (url: string, body: unknown, keepalive: boolean) => Promise<boolean>;
  now: () => Date;
}

/** Limits that keep the queues small on the device and match the server's (MetricsController, CrashesController). */
export const LIMITS = { batch: 100, queued: 500, crashBatch: 20, crashesQueued: 20, crashesPerSession: 10, message: 500, stack: 8000 };

const QUEUE = "ph.metrics-queue";
const CRASHES = "ph.crash-queue";
const INSTALL = "ph.install-id";

export class Telemetry {
  private queue: MetricEvent[];
  private crashQueue: CrashReport[];
  private sending: Promise<void> | undefined;
  private seen = new Map<string, number>();
  private sentThisSession = 0;

  private host: TelemetryHost;

  constructor(host: TelemetryHost) {
    this.host = host;
    this.queue = read<MetricEvent[]>(host.kv, QUEUE) ?? [];
    this.crashQueue = read<CrashReport[]>(host.kv, CRASHES) ?? [];
  }

  /** Whether this build can send anything at all; without a server the Privacy rows don't show (D-SET-22). */
  get available(): boolean {
    return !!this.host.base;
  }

  /** A random id made once per install, which says nothing about who the player is (privacy page). */
  get installId(): string {
    let id = this.host.kv.get(INSTALL);
    if (!id) {
      id = randomId();
      this.host.kv.set(INSTALL, id);
    }
    return id;
  }

  /** Records one usage event, if the player agreed to statistics. */
  track(name: string, properties?: MetricEvent["properties"]): void {
    if (!this.available || !this.host.stats()) return;
    this.queue.push({ name, occurredAt: this.host.now().toISOString(), ...(properties && Object.keys(properties).length ? { properties } : {}) });
    // The oldest go first when the device has been offline for a long time.
    if (this.queue.length > LIMITS.queued) this.queue.splice(0, this.queue.length - LIMITS.queued);
    write(this.host.kv, QUEUE, this.queue);
    if (this.queue.length >= LIMITS.batch) void this.flush();
  }

  /** Records one crash, if the player agreed to crash reports, and sends it straight away. */
  crash(kind: CrashKind, message: string, stack?: string): void {
    if (!this.available || !this.host.crashes()) return;
    const clean = { message: tidy(message).slice(0, LIMITS.message), stack: stack ? tidy(stack).slice(0, LIMITS.stack) : undefined };
    // The same crash in a loop is one report a minute at most, and a session sends a handful.
    // Keyed by the message alone: an engine failure also comes back as the rejected request.
    const key = clean.message;
    const t = this.host.now().getTime();
    if ((this.seen.get(key) ?? -Infinity) > t - 60_000 || this.sentThisSession >= LIMITS.crashesPerSession) return;
    this.seen.set(key, t);
    this.sentThisSession++;
    const where = this.host.where();
    const browser = browserOf(globalThis.navigator?.userAgent ?? "");
    this.crashQueue.push({ kind, message: clean.message || "(no message)", ...(clean.stack ? { stack: clean.stack } : {}), ...(where ? { where } : {}), ...(browser ? { browser } : {}), occurredAt: new Date(t).toISOString() });
    if (this.crashQueue.length > LIMITS.crashesQueued) this.crashQueue.splice(0, this.crashQueue.length - LIMITS.crashesQueued);
    write(this.host.kv, CRASHES, this.crashQueue);
    void this.flush();
  }

  /** A Privacy row changed: turning one off forgets what waits under it. */
  consentChanged(): void {
    if (!this.host.stats() && this.queue.length) {
      this.queue = [];
      write(this.host.kv, QUEUE, this.queue);
    }
    if (!this.host.crashes() && this.crashQueue.length) {
      this.crashQueue = [];
      write(this.host.kv, CRASHES, this.crashQueue);
    }
  }

  /** Sends what waits, in batches; anything the server doesn't take stays for the next try. `leaving` sends while the page closes. */
  async flush(leaving = false): Promise<void> {
    if (!this.host.base) return;
    // One send at a time; a flush asked for meanwhile runs after it.
    while (this.sending) await this.sending;
    this.sending = this.send(leaving);
    try {
      await this.sending;
    } finally {
      this.sending = undefined;
    }
  }

  private async send(leaving: boolean): Promise<void> {
    while (this.crashQueue.length && this.host.crashes()) {
      const batch = this.crashQueue.slice(0, LIMITS.crashBatch);
      const ok = await this.host.post(`${this.host.base}/api/crashes`, { installId: this.installId, runtime: this.host.runtime, version: this.host.version, crashes: batch }, leaving);
      if (!ok) break;
      this.crashQueue.splice(0, batch.length);
      write(this.host.kv, CRASHES, this.crashQueue);
    }
    while (this.queue.length && this.host.stats()) {
      const batch = this.queue.slice(0, LIMITS.batch);
      const account = this.host.accountId();
      const ok = await this.host.post(`${this.host.base}/api/metrics`, { installId: this.installId, runtime: this.host.runtime, ...(account ? { accountId: account } : {}), events: batch }, leaving);
      if (!ok) break;
      this.queue.splice(0, batch.length);
      write(this.host.kv, QUEUE, this.queue);
    }
  }
}

/** The browser family and major version only, never the whole user agent. */
export function browserOf(ua: string): string | undefined {
  for (const [name, re] of [
    ["Electron", /Electron\/(\d+)/],
    ["Edge", /Edg\/(\d+)/],
    ["Firefox", /Firefox\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Safari", /Version\/(\d+)[.\d]* .*Safari/],
  ] as const) {
    const m = re.exec(ua);
    if (m) return `${name} ${m[1]}`;
  }
  return undefined;
}

/** Stack lines keep the file name and position but lose the address and query, which can carry a player's paths or tokens. */
export function tidy(text: string): string {
  return text.replace(/\b(?:https?|app|capacitor|file):\/\/[^\s)]*\/([^/\s)?#]+)(?:[?#][^\s):]*)?/g, "$1");
}

function randomId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function read<T>(kv: KeyValue, key: string): T | undefined {
  const text = kv.get(key);
  if (!text) return undefined;
  try {
    const v = JSON.parse(text) as unknown;
    return Array.isArray(v) ? (v as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(kv: KeyValue, key: string, list: unknown[]): void {
  kv.set(key, list.length ? JSON.stringify(list) : undefined);
}

/** `fetch` that says whether the server took it; offline or refused, the caller keeps the batch. */
export async function postJson(url: string, body: unknown, keepalive: boolean): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive });
    // A batch the server refuses as malformed would be refused forever: drop it rather than retry.
    return r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429);
  } catch {
    return false;
  }
}
