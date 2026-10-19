import type { Platform, SaveHeader } from "@ph/engine/domain/saves";

/**
 * The game's client for our server's account and save API (domain/saves
 * SAVE-057, SAVE-063, SAVE-112 … SAVE-118; server/src/Controller): signing
 * in, the account card's devices, and the saves themselves. The base URL comes
 * from `VITE_CLOUD_API`; without it cloud saves are off and nothing here runs.
 */

/** The server's address for this build, or undefined when cloud saves are off. */
export function cloudBase(): string | undefined {
  const base = (import.meta.env.VITE_CLOUD_API as string | undefined)?.trim();
  return base ? base.replace(/\/+$/, "") : undefined;
}

/** Small string storage: localStorage on the web, a test double in tests. */
export interface KeyValue {
  get(key: string): string | undefined;
  set(key: string, value: string | undefined): void;
}

/** localStorage, which a private window or a sandboxed frame may refuse; then nothing outlasts the visit. */
export function webKeyValue(): KeyValue {
  return {
    get: (key) => {
      try {
        return localStorage.getItem(key) ?? undefined;
      } catch {
        return undefined;
      }
    },
    set: (key, value) => {
      try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // Kept for this visit only.
      }
    },
  };
}

export interface AccountInfo {
  id: string;
  displayName: string;
  email: string | null;
}

/** What a device keeps between launches: its device token and who it is signed in as. */
export interface DeviceTokens {
  deviceToken: string;
  deviceId: string;
  account: AccountInfo;
}

/**
 * Where the device token lives (SAVE-057): the web keeps it in localStorage;
 * desktop `safeStorage`, the iOS Keychain and the Android Keystore come later
 * behind the same two calls.
 */
export interface TokenStore {
  load(): DeviceTokens | undefined;
  save(tokens: DeviceTokens | undefined): void;
}

export function webTokenStore(kv: KeyValue = webKeyValue(), key = "ph.cloud-device"): TokenStore {
  return {
    load: () => {
      const text = kv.get(key);
      if (!text) return undefined;
      try {
        return JSON.parse(text) as DeviceTokens;
      } catch {
        return undefined;
      }
    },
    save: (t) => kv.set(key, t ? JSON.stringify(t) : undefined),
  };
}

export interface DeviceRow {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
  current: boolean;
}

export interface AccountCard extends AccountInfo {
  signIns: { provider: string; label: string }[];
  devices: DeviceRow[];
}

/** One save's header as the server's Save table keeps it (SAVE-061). */
export interface RemoteSave {
  saveId: string;
  campaignId: string;
  kind: SaveHeader["kind"];
  name: string;
  savedAt: number;
  device: string;
  platform: Platform;
  gameVersion: string;
  formatVersion: number;
  turn: number;
  date: { y: number; m: number };
  nation: string;
  ironman: boolean;
  size: number;
}

export interface Usage {
  saves: number;
  bytes: number;
  quotaSaves: number;
  quotaBytes: number;
}

export interface Changes {
  saves: RemoteSave[];
  tombstones: { saveId: string; deletedAt: number }[];
  cursor: string;
  more: boolean;
  usage: Usage | undefined;
}

/** An online game as the server gives it (server/src/Controller/GamesController.php). */
export interface GameTable {
  game: { code: string; seed: number; host: string; created: number; humans: string[]; started: boolean; ended: boolean; version: number; outOfStep: number | null };
  seats: { realm: string; player: string; at: number; mine: boolean }[];
  /** Only for a seated account. */
  weeks: { week: number; realm: string; orders: unknown; hash: string }[];
}

export interface MyGameRow {
  code: string;
  realm: string;
  started: boolean;
  week: number | null;
  waitingOn: string[];
  yourMove: boolean;
}

/**
 * A call that did not succeed. `status` 0 means the server was not reached
 * (offline); `code` is the server's error word (`wrong_email_or_password`,
 * `quota_full`, …), or `signed_out` once the device token is refused.
 */
export class CloudError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
  get offline(): boolean {
    return this.status === 0;
  }
}

/** The player's words for a failed sign-in or registration. */
export function errorText(e: unknown): string {
  if (!(e instanceof CloudError)) return "Something went wrong. Try again.";
  if (e.offline) return "Can't reach the server. Check the connection and try again.";
  switch (e.code) {
    case "wrong_email_or_password":
      return "Wrong email or password.";
    case "too_many_tries":
      return "Too many tries. Wait 15 minutes and try again.";
    case "email_taken":
      return "An account with this email already exists. Sign in instead.";
    case "invalid_input":
      return e.message !== "invalid_input" ? e.message : "Check the fields and try again.";
    default:
      return "Something went wrong. Try again.";
  }
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Refresh the access token this long before the server would refuse it. */
const EARLY_MS = 30_000;

/** A save's time as milliseconds, whether the server writes a number or an ISO date. */
const ms = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : 0);

function remoteSave(r: Record<string, unknown>): RemoteSave {
  return { ...(r as unknown as RemoteSave), savedAt: ms(r.savedAt) };
}

export class CloudApi {
  readonly base: string;
  private readonly store: TokenStore;
  private readonly fetch: Fetch;
  private readonly now: () => number;
  private access: { token: string; expiresAt: number } | undefined;
  private refreshing: Promise<void> | undefined;
  private tokens: DeviceTokens | undefined;
  /** Told when the device stops being signed in (signed out here, or from another device). */
  onSignedOut: () => void = () => {};

  constructor(base: string, store: TokenStore, opts: { fetch?: Fetch; now?: () => number } = {}) {
    this.base = base;
    this.store = store;
    this.fetch = opts.fetch ?? ((url, init) => fetch(url, init));
    this.now = opts.now ?? Date.now;
    this.tokens = store.load();
  }

  get signedIn(): boolean {
    return this.tokens !== undefined;
  }

  get account(): AccountInfo | undefined {
    return this.tokens?.account;
  }

  get deviceId(): string | undefined {
    return this.tokens?.deviceId;
  }

  /** `POST /api/sessions` with email and password. */
  async signIn(email: string, password: string, device: { name: string; platform: string }): Promise<AccountInfo> {
    const r = await this.json<{ accessToken: string; accessTokenExpiresIn: number; deviceToken: string; deviceId: string; account: AccountInfo }>("POST", "/api/sessions", { email, password, device }, false);
    this.keep(r);
    return r.account;
  }

  /** `POST /api/accounts`, then signs the new account in on this device. */
  async register(email: string, displayName: string, password: string, device: { name: string; platform: string }): Promise<AccountInfo> {
    await this.json("POST", "/api/accounts", { email, displayName, password }, false);
    return this.signIn(email, password, device);
  }

  /** `GET /api/account`: sign-ins and devices for the account card. */
  getAccount(): Promise<AccountCard> {
    return this.json<AccountCard>("GET", "/api/account");
  }

  /** `DELETE /api/devices/{id}`; signing this device out forgets its tokens even when the server can't be reached. */
  async signOutDevice(id: string): Promise<void> {
    const self = id === this.tokens?.deviceId;
    try {
      await this.call("DELETE", `/api/devices/${encodeURIComponent(id)}`);
    } catch (e) {
      if (!self) throw e;
    }
    if (self) this.forget();
  }

  signOut(): Promise<void> {
    return this.tokens ? this.signOutDevice(this.tokens.deviceId) : Promise.resolve();
  }

  /** `GET /api/saves?since=<cursor>`. */
  async changes(since: string | undefined): Promise<Changes> {
    const r = await this.json<{ saves?: Record<string, unknown>[]; tombstones?: { saveId: string; deletedAt: unknown }[]; cursor: string | number; more?: boolean; usage?: Usage }>(
      "GET",
      `/api/saves${since ? `?since=${encodeURIComponent(since)}` : ""}`,
    );
    return {
      saves: (r.saves ?? []).map(remoteSave),
      tombstones: (r.tombstones ?? []).map((t) => ({ saveId: t.saveId, deletedAt: ms(t.deletedAt) })),
      cursor: String(r.cursor),
      more: !!r.more,
      usage: r.usage,
    };
  }

  /** `PUT /api/saves/{saveId}` with the raw `.phsave` bytes. */
  async putSave(saveId: string, bytes: Uint8Array): Promise<void> {
    await this.call("PUT", `/api/saves/${encodeURIComponent(saveId)}`, { body: bytes as BodyInit, type: "application/octet-stream" });
  }

  /** `GET /api/saves/{saveId}`: the file's bytes. */
  async getSave(saveId: string): Promise<Uint8Array> {
    const res = await this.call("GET", `/api/saves/${encodeURIComponent(saveId)}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async deleteSave(saveId: string): Promise<void> {
    await this.call("DELETE", `/api/saves/${encodeURIComponent(saveId)}`);
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.call("DELETE", `/api/campaigns/${encodeURIComponent(campaignId)}`);
  }

  // ---------------------------------------------------------------- multiplayer (domain/multiplayer MP-020 … MP-051)

  /** `POST /api/games`: a new game with this account on `realm`. */
  hostGame(realm: string): Promise<GameTable> {
    return this.json<GameTable>("POST", "/api/games", { realm });
  }

  /** `GET /api/games`: Your games. */
  async myGames(): Promise<MyGameRow[]> {
    return (await this.json<{ games: MyGameRow[] }>("GET", "/api/games")).games;
  }

  /** `GET /api/games/{code}?since=`; undefined when the game is as `etag` says (304). */
  async getGame(code: string, since: number, etag?: string): Promise<{ table: GameTable; etag: string | undefined } | undefined> {
    const res = await this.call("GET", `/api/games/${encodeURIComponent(code)}?since=${since}`, undefined, true, etag ? { "If-None-Match": etag } : {});
    if (res.status === 304) return undefined;
    return { table: (await res.json()) as GameTable, etag: res.headers.get("ETag") ?? undefined };
  }

  /** `PUT /api/games/{code}/seats/{realm}`. */
  sitGame(code: string, realm: string): Promise<GameTable> {
    return this.json<GameTable>("PUT", `/api/games/${encodeURIComponent(code)}/seats/${encodeURIComponent(realm)}`);
  }

  /** `DELETE /api/games/{code}/seats/mine`. */
  async leaveGame(code: string): Promise<void> {
    await this.call("DELETE", `/api/games/${encodeURIComponent(code)}/seats/mine`);
  }

  /** `POST /api/games/{code}/start`, by the host. */
  startGame(code: string): Promise<GameTable> {
    return this.json<GameTable>("POST", `/api/games/${encodeURIComponent(code)}/start`);
  }

  /** `PUT /api/games/{code}/weeks/{week}`: a realm's orders for one week. */
  async sendWeek(code: string, week: number, body: { realm: string; orders: unknown; hash: string }): Promise<void> {
    await this.json("PUT", `/api/games/${encodeURIComponent(code)}/weeks/${week}`, body);
  }

  // ---------------------------------------------------------------- tokens

  private keep(r: { accessToken: string; accessTokenExpiresIn: number; deviceToken: string; deviceId: string; account: AccountInfo }): void {
    this.access = { token: r.accessToken, expiresAt: this.now() + r.accessTokenExpiresIn * 1000 };
    this.tokens = { deviceToken: r.deviceToken, deviceId: r.deviceId, account: r.account };
    this.store.save(this.tokens);
  }

  private forget(): void {
    const was = this.tokens !== undefined;
    this.tokens = undefined;
    this.access = undefined;
    this.store.save(undefined);
    if (was) this.onSignedOut();
  }

  /**
   * `POST /api/sessions/refresh`: the device token rotates, so one refresh runs
   * at a time and every call waiting on it shares it (SAVE-115). A refused
   * device token means the device was signed out (SAVE-116).
   */
  private refresh(): Promise<void> {
    this.refreshing ??= (async () => {
      try {
        const t = this.tokens;
        if (!t) throw new CloudError(401, "signed_out");
        const res = await this.send("POST", "/api/sessions/refresh", { body: JSON.stringify({ deviceToken: t.deviceToken }), type: "application/json" });
        if (res.status === 401) {
          this.forget();
          throw new CloudError(401, "signed_out");
        }
        if (!res.ok) throw await failure(res);
        this.keep((await res.json()) as Parameters<CloudApi["keep"]>[0]);
      } finally {
        this.refreshing = undefined;
      }
    })();
    return this.refreshing;
  }

  private async bearer(): Promise<string> {
    if (!this.tokens) throw new CloudError(401, "signed_out");
    if (!this.access || this.now() >= this.access.expiresAt - EARLY_MS) await this.refresh();
    return this.access!.token;
  }

  // ---------------------------------------------------------------- requests

  private async send(method: string, path: string, body?: { body: BodyInit; type: string }, bearer?: string, extra: Record<string, string> = {}): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json", ...extra };
    if (body) headers["Content-Type"] = body.type;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    try {
      return await this.fetch(this.base + path, { method, headers, ...(body ? { body: body.body } : {}) });
    } catch {
      throw new CloudError(0, "offline");
    }
  }

  /** A signed-in call: on a 401 the access token is refreshed once and the call made again. */
  private async call(method: string, path: string, body?: { body: BodyInit; type: string }, auth = true, extra: Record<string, string> = {}): Promise<Response> {
    const used = auth ? await this.bearer() : undefined;
    let res = await this.send(method, path, body, used, extra);
    if (auth && res.status === 401) {
      // Another call may have refreshed meanwhile; then its new token is tried as it is.
      if (this.access?.token === used) await this.refresh();
      if (!this.access) throw new CloudError(401, "signed_out");
      res = await this.send(method, path, body, this.access!.token, extra);
      if (res.status === 401) {
        this.forget();
        throw new CloudError(401, "signed_out");
      }
    }
    // 304 answers a conditional ask (If-None-Match): nothing changed.
    if (!res.ok && res.status !== 304) throw await failure(res);
    return res;
  }

  private async json<T>(method: string, path: string, data?: unknown, auth = true): Promise<T> {
    const res = await this.call(method, path, data === undefined ? undefined : { body: JSON.stringify(data), type: "application/json" }, auth);
    return (res.status === 204 ? {} : await res.json()) as T;
  }
}

async function failure(res: Response): Promise<CloudError> {
  let code = `http_${res.status}`;
  let message: string | undefined;
  try {
    const j = (await res.json()) as { error?: string; message?: string; details?: { field: string; message: string }[] };
    if (j.error) code = j.error;
    message = j.message ?? j.details?.map((d) => d.message).join(" ");
  } catch {
    // No JSON body.
  }
  return new CloudError(res.status, code, message);
}
