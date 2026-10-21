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
 * Where the device token lives (SAVE-057): the web keeps it in localStorage,
 * the desktop in `safeStorage` (`desktopTokenStore`); the iOS Keychain and the
 * Android Keystore come later behind the same two calls.
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

/** The desktop's safeStorage behind preload.cjs (SAVE-143); `set` answers false where it cannot encrypt. */
export interface SecretStore {
  get(): string | undefined;
  set(value: string | undefined): boolean;
}

/**
 * The device token on the desktop (SAVE-143): encrypted with safeStorage; where
 * that cannot encrypt, in web storage as on the web. A token web storage kept
 * before moves into safeStorage once it can.
 */
export function desktopTokenStore(secret: SecretStore, fallback: TokenStore = webTokenStore()): TokenStore {
  return {
    load: () => {
      const text = secret.get();
      if (text) {
        try {
          return JSON.parse(text) as DeviceTokens;
        } catch {
          return undefined;
        }
      }
      const old = fallback.load();
      if (old && secret.set(JSON.stringify(old))) fallback.save(undefined);
      return old;
    },
    save: (t) => {
      if (secret.set(t ? JSON.stringify(t) : undefined)) fallback.save(undefined);
      else fallback.save(t);
    },
  };
}

export interface DeviceRow {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
  current: boolean;
}

/**
 * What a store sign-in sends the server (SAVE-149 … SAVE-151): Apple's identity token or Google's
 * ID token with the nonce whose SHA-256 the store signed into it, or the one-time code Steam in the
 * browser came back with.
 */
export type StoreProof = { appleIdentityToken: string; nonce: string; appleAuthorizationCode?: string } | { googleIdToken: string; nonce: string } | { steamOpenIdCode: string };

export interface AccountCard extends AccountInfo {
  signIns: { provider: string; label: string }[];
  devices: DeviceRow[];
}

/**
 * The offer that comes with a sign-in of another account (SAVE-186): what that account holds, the
 * sign-in both accounts hold when that blocks combining (SAVE-188), and otherwise the token.
 */
export interface CombineOffer {
  signIn: string;
  account: { displayName: string; saves: number; sharedSaves: number; purchases: string[]; storageFull: boolean; sharedFull: boolean };
  blockedBy: string | null;
  token?: string;
  message?: string;
}

/** The offer a refused Add carries, if it carries one. */
export function combineOffer(e: unknown): CombineOffer | undefined {
  if (!(e instanceof CloudError) || e.code !== "linked_to_another_account") return undefined;
  const offer = e.body?.combine as CombineOffer | undefined;
  return offer && typeof offer === "object" && offer.account ? offer : undefined;
}

/** What `POST /api/account/merge` answers: the account card, and what came over (SAVE-187). */
export interface Combined extends AccountCard {
  combined: { displayName: string; signIns: number; devices: number; saves: number; sharedSaves: number; purchases: number };
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

/** What a shared save is for: the board its topic goes to, or a reply in the topic it came from (SAVE-125, SAVE-130). */
export type SharePurpose = "show" | "help" | "broke" | "reply";

/** A shared save's card, as the server gives it (SAVE-127). */
export interface SharedCard {
  code: string;
  title: string;
  author: string;
  nation: string;
  realm: string;
  date: { y: number; m: number };
  turn: number;
  playSeconds: number;
  gameVersion: string;
  ironman: boolean;
  modified: boolean;
  thumbnail: string;
  plays: number;
  topicUrl?: string;
}

/** What the server answers a share with. */
export interface Shared {
  code: string;
  shownCode: string;
  link: string;
  topicUrl: string;
}

/** The bytes as base64, in pieces so a 2 MB save does not overflow the call stack. */
export function base64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

export interface Changes {
  saves: RemoteSave[];
  tombstones: { saveId: string; deletedAt: number }[];
  cursor: string;
  more: boolean;
  usage: Usage | undefined;
  /** The device came over from an account combined into this one: the list starts over (SAVE-192). */
  reset: boolean;
}

/**
 * A call that did not succeed. `status` 0 means the server was not reached
 * (offline); `code` is the server's error word (`wrong_email_or_password`,
 * `quota_full`, …), or `signed_out` once the device token is refused.
 */
export class CloudError extends Error {
  readonly status: number;
  readonly code: string;
  /** The server's whole answer, for refusals that carry more than a word (the offer to combine, SAVE-186). */
  readonly body: Record<string, unknown> | undefined;
  constructor(status: number, code: string, message?: string, body?: Record<string, unknown>) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.body = body;
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
    // Steam sign-in (SAVE-118, SAVE-141): the server's own words.
    case "steam_unavailable":
      return e.message !== e.code ? e.message : "Steam sign-in is not available.";
    case "steam_refused":
      return e.message !== e.code ? e.message : "Steam did not accept the sign-in.";
    case "steam_ticket":
      return "Steam could not sign you in just now. Check that Steam is online and try again.";
    // Apple, Google and Steam in the browser (SAVE-149 … SAVE-156): the server's own words where it gives them.
    case "apple_unavailable":
      return e.message !== e.code ? e.message : "Sign in with Apple is not available.";
    case "apple_refused":
      return e.message !== e.code ? e.message : "Apple did not accept the sign-in.";
    case "google_unavailable":
      return e.message !== e.code ? e.message : "Google sign-in is not available.";
    case "google_refused":
      return e.message !== e.code ? e.message : "Google did not accept the sign-in.";
    case "sign_in_expired":
      return e.message !== e.code ? e.message : "The sign-in took too long or was used already. Try again.";
    case "sign_in_cancelled":
      return "The sign-in was cancelled.";
    case "sign_in_sheet":
      return "The sign-in could not open. Try again.";
    case "return_not_allowed":
      return "This build of the game cannot sign in with Steam in the browser.";
    case "linked_to_another_account":
      return "This sign-in already belongs to another Pocket Hegemony account.";
    case "already_has_steam":
      return "This account already has a Steam sign-in.";
    case "already_has_apple":
      return "This account already has a Sign in with Apple.";
    case "already_has_google":
      return "This account already has a Google sign-in.";
    // Combining accounts and removing a sign-in (SAVE-186 … SAVE-193): the server's own words.
    case "combine_expired":
      return e.message !== e.code ? e.message : "The offer to combine ran out. Add the sign-in again.";
    case "nothing_to_combine":
      return e.message !== e.code ? e.message : "That account is already combined or gone.";
    case "both_have_steam":
    case "both_have_apple":
    case "both_have_google":
    case "both_have_email":
      return e.message !== e.code ? e.message : "Both accounts have a sign-in of the same kind. Remove one of them, then add this sign-in again.";
    case "last_sign_in":
      return "An account keeps at least one sign-in.";
    // Shared saves (SAVE-125 … SAVE-131): the server's own words.
    case "no_shared_save":
    case "too_many_shared":
    case "topic_locked":
    case "no_topic":
    case "rate_limited":
    case "damaged":
    case "too_big":
      return e.message !== e.code ? e.message : "Something went wrong. Try again.";
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

  /**
   * `POST /api/sessions` with a Steam Web API ticket (hex) and the Steam name,
   * which names the account when this Steam account has none yet (SAVE-113).
   */
  async signInWithSteam(steamTicket: string, displayName: string, device: { name: string; platform: string }): Promise<AccountInfo> {
    const r = await this.json<{ accessToken: string; accessTokenExpiresIn: number; deviceToken: string; deviceId: string; account: AccountInfo }>(
      "POST",
      "/api/sessions",
      { steamTicket, ...(displayName ? { displayName } : {}), device },
      false,
    );
    this.keep(r);
    return r.account;
  }

  /**
   * `POST /api/sessions` with a store's proof (SAVE-149 … SAVE-151); `displayName` names the account
   * when the store has none yet and gives no name itself (Apple's name comes only the first time).
   */
  async signInWithStore(proof: StoreProof, displayName: string | undefined, device: { name: string; platform: string }): Promise<AccountInfo> {
    const r = await this.json<{ accessToken: string; accessTokenExpiresIn: number; deviceToken: string; deviceId: string; account: AccountInfo }>(
      "POST",
      "/api/sessions",
      { ...proof, ...(displayName ? { displayName } : {}), device },
      false,
    );
    this.keep(r);
    return r.account;
  }

  /** `POST /api/account/sign-ins` with a store's proof: adds that sign-in to this account (SAVE-153). */
  async addSignIn(proof: StoreProof): Promise<AccountCard["signIns"]> {
    return (await this.json<{ signIns: AccountCard["signIns"] }>("POST", "/api/account/sign-ins", proof)).signIns;
  }

  /** `POST /api/account/merge`: combines the account the offer named into this one (SAVE-187). */
  combineAccounts(combineToken: string): Promise<Combined> {
    return this.json<Combined>("POST", "/api/account/merge", { combineToken });
  }

  /** `DELETE /api/account/sign-ins/{provider}`: removes a sign-in while another remains (SAVE-193). */
  async removeSignIn(provider: string): Promise<AccountCard["signIns"]> {
    return (await this.json<{ signIns: AccountCard["signIns"] }>("DELETE", `/api/account/sign-ins/${encodeURIComponent(provider)}`)).signIns;
  }

  /** `POST /api/sessions/steam-openid`: Steam's sign-in address, coming back to `returnUrl` (SAVE-151, SAVE-152). */
  async steamOpenIdUrl(returnUrl: string): Promise<string> {
    return (await this.json<{ url: string }>("POST", "/api/sessions/steam-openid", { return: returnUrl }, false)).url;
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

  /**
   * `DELETE /api/account` (SAVE-198): deletes the account with its cloud and
   * shared saves, signing every device out; this one forgets its tokens and
   * its cloud lines, and keeps the saves on the device (SAVE-206).
   */
  async deleteAccount(): Promise<void> {
    await this.call("DELETE", "/api/account");
    this.forget();
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
    const r = await this.json<{ saves?: Record<string, unknown>[]; tombstones?: { saveId: string; deletedAt: unknown }[]; cursor: string | number; more?: boolean; usage?: Usage; reset?: boolean }>(
      "GET",
      `/api/saves${since ? `?since=${encodeURIComponent(since)}` : ""}`,
    );
    return {
      saves: (r.saves ?? []).map(remoteSave),
      tombstones: (r.tombstones ?? []).map((t) => ({ saveId: t.saveId, deletedAt: ms(t.deletedAt) })),
      cursor: String(r.cursor),
      more: !!r.more,
      usage: r.usage,
      reset: !!r.reset,
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

  // ---------------------------------------------------------------- shared saves (SAVE-124 … SAVE-131)

  /** `POST /api/shared-saves`: posts one save to the community as the player. */
  shareSave(input: { bytes: Uint8Array; title: string; note: string; realm: string; purpose: SharePurpose }): Promise<Shared> {
    return this.json<Shared>("POST", "/api/shared-saves", { file: base64(input.bytes), title: input.title, note: input.note, realm: input.realm, purpose: input.purpose });
  }

  /** `GET /api/shared-saves/{code}`: anyone may read a card. */
  async sharedCard(code: string): Promise<SharedCard> {
    return (await this.json<{ save: SharedCard }>("GET", `/api/shared-saves/${encodeURIComponent(code)}`, undefined, false)).save;
  }

  /** `GET /api/shared-saves/{code}/file`: the bytes; the server counts a play. */
  async sharedFile(code: string): Promise<Uint8Array> {
    const res = await this.call("GET", `/api/shared-saves/${encodeURIComponent(code)}/file`, undefined, false);
    return new Uint8Array(await res.arrayBuffer());
  }

  /** `GET /api/shared-saves`: what this account shared, for the Shared saves row. */
  async mySharedSaves(): Promise<SharedCard[]> {
    return (await this.json<{ shared: SharedCard[] }>("GET", "/api/shared-saves")).shared;
  }

  async removeShared(code: string): Promise<void> {
    await this.call("DELETE", `/api/shared-saves/${encodeURIComponent(code)}`);
  }

  // ---------------------------------------------------------------- purchases (SAVE-172 … SAVE-175)

  /** `GET /api/entitlements/{store}`: is the full game unlocked on this store? (purchases.ts reads the answer). */
  entitlement(store: string): Promise<unknown> {
    return this.json("GET", `/api/entitlements/${encodeURIComponent(store)}`);
  }

  /** `POST /api/purchases`: the store's proof (a signed transaction, a purchase token, or nothing for Steam). */
  submitPurchase(store: string, proof: object): Promise<unknown> {
    return this.json("POST", "/api/purchases", { ...proof, store });
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

  private async send(method: string, path: string, body?: { body: BodyInit; type: string }, bearer?: string): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body) headers["Content-Type"] = body.type;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    try {
      return await this.fetch(this.base + path, { method, headers, ...(body ? { body: body.body } : {}) });
    } catch {
      throw new CloudError(0, "offline");
    }
  }

  /** A signed-in call: on a 401 the access token is refreshed once and the call made again. */
  private async call(method: string, path: string, body?: { body: BodyInit; type: string }, auth = true): Promise<Response> {
    const used = auth ? await this.bearer() : undefined;
    let res = await this.send(method, path, body, used);
    if (auth && res.status === 401) {
      // Another call may have refreshed meanwhile; then its new token is tried as it is.
      if (this.access?.token === used) await this.refresh();
      if (!this.access) throw new CloudError(401, "signed_out");
      res = await this.send(method, path, body, this.access!.token);
      if (res.status === 401) {
        this.forget();
        throw new CloudError(401, "signed_out");
      }
    }
    if (!res.ok) throw await failure(res);
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
  let body: Record<string, unknown> | undefined;
  try {
    const j = (await res.json()) as { error?: string; message?: string; details?: { field: string; message: string }[] };
    if (j.error) code = j.error;
    message = j.message ?? j.details?.map((d) => d.message).join(" ");
    body = j as Record<string, unknown>;
  } catch {
    // No JSON body.
  }
  return new CloudError(res.status, code, message, body);
}
