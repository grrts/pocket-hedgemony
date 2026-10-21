import { savesConfig } from "./format.ts";
import { needsFullGame } from "./library.ts";

/**
 * Whether the full game is unlocked on this store (domain/saves SAVE-170,
 * SAVE-179 … SAVE-181): the store's own answer, which works offline and needs
 * no account, and the server's entitlement for this store when there is one.
 * Cross-buy is per store: nothing here looks at another store's purchase.
 */

/** The stores that sell the full game (saves.json `purchases.stores`). */
export type Store = "steam" | "apple" | "google";
export const STORES = savesConfig.purchases.stores as readonly Store[];

/** The server's entitlement status for one account and store (SAVE-171, SAVE-172); `pending` is a Play payment not through yet. */
export type EntitlementStatus = "active" | "refunded" | "revoked" | "pending" | "none";

export interface UnlockInputs {
  store: Store;
  /** The store's own answer: this store's account owns the full game. */
  owned: boolean;
  /** The server's answer, or undefined when there is none (offline, signed out, the store unavailable on the server). */
  server?: EntitlementStatus;
}

/**
 * The decision of SAVE-179. On Steam the running paid app is the full game,
 * whatever the server says. On the phones an active entitlement unlocks, a
 * refund or revocation locks again even while the store's cached answer says
 * owned, and otherwise the store's own answer decides.
 */
export function fullGameUnlocked(i: UnlockInputs): boolean {
  if (i.store === "steam") return i.owned;
  if (i.server === "active") return true;
  if (i.server === "refunded" || i.server === "revoked") return false;
  return i.owned;
}

/** The store says owned but the server holds no active entitlement: send the store's proof first, then decide (SAVE-179). */
export function proofFirst(i: UnlockInputs): boolean {
  return i.store !== "steam" && i.owned && i.server !== undefined && i.server !== "active" && i.server !== "refunded" && i.server !== "revoked";
}

/**
 * Whether the game has an unlock state at all (SAVE-180): only where the build
 * names a cloud server and the shell gives a store bridge; elsewhere it stays
 * the full game as before.
 */
export function hasUnlockState(o: { cloudServer: boolean; storeBridge: boolean }): boolean {
  return o.cloudServer && o.storeBridge;
}

/** What starting a realm or opening a save does while the full game is locked (SAVE-181). */
export function gate(nation: string, unlocked: boolean): "go" | "unlock" {
  return unlocked || !needsFullGame(nation) ? "go" : "unlock";
}
