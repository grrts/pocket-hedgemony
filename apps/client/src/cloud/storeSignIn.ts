import { savesConfig, signInOptions } from "@ph/engine/domain/saves";
import { CloudError, errorText, type AccountInfo, type KeyValue, type StoreProof } from "./api.ts";
import type { SignInBridge, Store } from "./bridge.ts";
import type { CloudSync } from "./sync.ts";

/**
 * Sign in with Apple, Google, and Steam in the browser sheet (SAVE-149 … SAVE-156): the buttons
 * this platform offers, in SAVE-059's order, and each flow from the tap to the server's tokens.
 * The game makes a random nonce for each try, the store signs its SHA-256 into the token, and the
 * server gets the nonce itself (D-SAVE-22). Steam in the browser asks the server for Steam's
 * address and comes back with a one-time code; on the web the page goes to Steam and back, so
 * what the tap was for waits in storage until the page returns.
 */

/** SAVE-059's names for each store, as `sign_in.at_launch` lists them. */
const OPTION: Record<string, Store> = { "Sign in with Apple": "apple", Google: "google", Steam: "steam" };

export const STORE_LABEL: Record<Store, string> = { apple: "Sign in with Apple", google: "Sign in with Google", steam: "Sign in with Steam" };

/** What a Steam tap on the web was for, kept while the page is at Steam. */
const STEAM_INTENT_KEY = "ph.steam-intent";

export type Intent = "sign_in" | "add";

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A fresh nonce and its SHA-256 in hex: the hash goes to the store, the nonce to our server. */
export async function makeNonce(): Promise<{ nonce: string; hash: string }> {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(32)));
  return { nonce, hash: hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce))) };
}

export class StoreSignIn {
  readonly bridge: SignInBridge;
  private readonly sync: CloudSync;
  private readonly device: { name: string; platform: string };
  private readonly platform: string;
  private readonly kv: KeyValue;
  /** Why the last try failed, in the player's words, shown under the buttons; empty when it did not. */
  error = "";
  /** The store whose sheet is open, while it is. */
  busy: Store | undefined;

  /**
   * `platform` is SAVE-059's key for the build (`ios`, `android`, `web`, `steam`, `desktop`);
   * `device` is how this device names itself to the server.
   */
  constructor(sync: CloudSync, bridge: SignInBridge, kv: KeyValue, device: { name: string; platform: string }, platform: string) {
    this.sync = sync;
    this.bridge = bridge;
    this.kv = kv;
    this.device = device;
    this.platform = platform;
  }

  /**
   * The store sign-ins to show, in order: the platform's (SAVE-059) that this build can start. On
   * iOS none at all when Sign in with Apple cannot be started, since Apple asks for it beside any
   * other (SAVE-155).
   */
  stores(): Store[] {
    const list = signInOptions(this.platform)
      .map((o) => OPTION[o])
      .filter((s): s is Store => !!s && this.bridge.can(s));
    if (this.platform === "ios" && !list.includes("apple")) return [];
    return list;
  }

  /** The stores the account does not hold yet, for the Add buttons (SAVE-156). */
  addable(held: readonly string[]): Store[] {
    return this.stores().filter((s) => !held.includes(s));
  }

  /** Signs in with the store; false when the page went to Steam and will come back (web). */
  signIn(store: Store): Promise<boolean> {
    return this.run(store, "sign_in");
  }

  /** Adds the store's sign-in to this account (SAVE-153); false as for signIn. */
  add(store: Store): Promise<boolean> {
    return this.run(store, "add");
  }

  /**
   * On the web, at launch: finishes a Steam sign-in the page went to Steam for. Never throws;
   * the reason of a failure waits on the card. True when a sign-in or an add finished.
   */
  async resume(): Promise<boolean> {
    const answer = this.bridge.returned();
    if (!answer) return false;
    const intent: Intent = this.kv.get(STEAM_INTENT_KEY) === "add" ? "add" : "sign_in";
    this.kv.set(STEAM_INTENT_KEY, undefined);
    try {
      await this.finishSteam(answer, intent);
      this.error = "";
      return true;
    } catch (e) {
      this.error = errorText(e);
      return false;
    }
  }

  private async run(store: Store, intent: Intent): Promise<boolean> {
    this.busy = store;
    this.error = "";
    try {
      if (store === "steam") {
        const url = await this.sync.api.steamOpenIdUrl(this.bridge.steamReturn);
        this.kv.set(STEAM_INTENT_KEY, intent);
        const answer = await this.bridge.steam(url);
        if (!answer) return false;
        this.kv.set(STEAM_INTENT_KEY, undefined);
        await this.finishSteam(answer, intent);
        return true;
      }
      const { nonce, hash } = await makeNonce();
      let proof: StoreProof;
      let name: string | undefined;
      if (store === "apple") {
        const r = await this.bridge.apple(hash);
        proof = { appleIdentityToken: r.identityToken, nonce };
        name = r.name;
      } else {
        const r = await this.bridge.google(hash);
        proof = { googleIdToken: r.idToken, nonce };
        name = r.name;
      }
      await this.finish(proof, name, intent);
      return true;
    } catch (e) {
      this.error = errorText(e);
      throw e;
    } finally {
      this.busy = undefined;
    }
  }

  private async finishSteam(answer: { code?: string; error?: string }, intent: Intent): Promise<void> {
    if (!answer.code) throw new CloudError(answer.error === "steam_unavailable" ? 503 : 401, answer.error === "steam_unavailable" ? "steam_unavailable" : "steam_refused");
    await this.finish({ steamOpenIdCode: answer.code }, undefined, intent);
  }

  private async finish(proof: StoreProof, name: string | undefined, intent: Intent): Promise<AccountInfo | undefined> {
    if (intent === "add") {
      await this.sync.api.addSignIn(proof);
      return undefined;
    }
    const account = await this.sync.api.signInWithStore(proof, name, this.device);
    void this.sync.signedIn();
    return account;
  }
}

/** Where the phone app's browser sheet comes back to (SAVE-152). */
export const APP_RETURN: string = savesConfig.sign_in.app_return;
