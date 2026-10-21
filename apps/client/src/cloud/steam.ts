import type { SteamBridge } from "../desktop.ts";
import { CloudError, errorText, type AccountInfo, type KeyValue } from "./api.ts";
import type { CloudSync } from "./sync.ts";

/**
 * Steam sign-in in the Steam build (SAVE-141): at launch the game signs in by
 * itself with a Web API ticket and the Steam name, so the player types
 * nothing. Once the device is signed out (here, or from another device) it
 * waits for the player to tap Sign in with Steam. A failed silent try shows
 * nothing at launch; its reason waits on the Account card.
 */
const SIGNED_OUT_KEY = "ph.steam-signed-out";

export class SteamSignIn {
  readonly steam: SteamBridge;
  private readonly sync: CloudSync;
  private readonly kv: KeyValue;
  private readonly device: { name: string; platform: string };
  private readonly identity: string;
  /** Why the last try failed, in the player's words, for the card; empty when it did not. */
  error = "";

  constructor(sync: CloudSync, steam: SteamBridge, kv: KeyValue, device: { name: string; platform: string }, identity: string) {
    this.sync = sync;
    this.steam = steam;
    this.kv = kv;
    this.device = device;
    this.identity = identity;
    const before = sync.api.onSignedOut;
    sync.api.onSignedOut = () => {
      before();
      this.kv.set(SIGNED_OUT_KEY, "1");
    };
  }

  /** Whether the game will sign in by itself at the next launch. */
  get silent(): boolean {
    return !this.kv.get(SIGNED_OUT_KEY);
  }

  /** At launch: signs in with Steam unless signed in already or signed out on purpose. Never throws. */
  async atLaunch(): Promise<boolean> {
    if (this.sync.api.signedIn || !this.silent) return false;
    try {
      await this.signIn();
      return true;
    } catch {
      return false;
    }
  }

  /** Sign in with Steam: the ticket, then `POST /api/sessions`; the synced set goes up as for any sign-in. */
  async signIn(): Promise<AccountInfo> {
    try {
      let ticket: string;
      try {
        ticket = await this.steam.webTicket(this.identity);
      } catch {
        throw new CloudError(503, "steam_ticket");
      }
      const account = await this.sync.api.signInWithSteam(ticket, this.steam.name, this.device);
      this.kv.set(SIGNED_OUT_KEY, undefined);
      this.error = "";
      void this.sync.signedIn();
      return account;
    } catch (e) {
      this.error = errorText(e);
      throw e;
    }
  }
}
