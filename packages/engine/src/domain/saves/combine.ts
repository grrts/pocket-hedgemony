import { savesConfig } from "./format.ts";

/**
 * Combining two accounts and removing a sign-in (domain/saves SAVE-186 …
 * SAVE-193, D-SAVE-24): which of two rows stays where both accounts hold one,
 * when combining is refused, and when a sign-in may be removed. The server
 * (`server/src/Account/AccountCombiner.php`) follows the same rules; the
 * account the player is in always stays.
 */

/** A way in to an account: one per store, and email with its password (INV-SAVE-21). */
export type SignInKind = "steam" | "apple" | "google" | "email";

/** How long the offer to combine lasts (saves.json `sign_in.combine_minutes`, provisional). */
export const COMBINE_MINUTES: number = savesConfig.sign_in.combine_minutes;

/** The sign-in both accounts hold, which refuses combining (SAVE-188), or undefined when none is. */
export function combineBlockedBy(staying: readonly SignInKind[], other: readonly SignInKind[]): SignInKind | undefined {
  return staying.find((k) => other.includes(k));
}

/** Which copy stays when both accounts hold the same row. */
export type Kept = "staying" | "other";

/**
 * A save id both accounts hold is the same write-once file (SAVE-189): the copy
 * that is not removed wins, else the staying account's.
 */
export function keptSave(staying: { removed: boolean }, other: { removed: boolean }): Kept {
  return staying.removed && !other.removed ? "other" : "staying";
}

/** Two ironman heads for one campaign (SAVE-189): the newer save's head stays, the staying account's on a tie. */
export function keptIronmanHead(staying: { savedAt: number }, other: { savedAt: number }): Kept {
  return other.savedAt > staying.savedAt ? "other" : "staying";
}

export type HeldStatus = "active" | "refunded" | "revoked";
const RANK: Record<HeldStatus, number> = { active: 0, refunded: 1, revoked: 2 };

/** Two entitlements for one store (SAVE-190): active before refunded before revoked, the staying account's on a tie. */
export function keptEntitlement(staying: HeldStatus, other: HeldStatus): Kept {
  return RANK[other] < RANK[staying] ? "other" : "staying";
}

/** Whether the combined account goes over the quota (SAVE-191); it is combined all the same. */
export function overQuota(
  staying: { saves: number; bytes: number },
  other: { saves: number; bytes: number },
  quota: { saves: number; bytes: number } = { saves: savesConfig.cloud.server.quota_saves, bytes: savesConfig.cloud.server.quota_mb * 1024 * 1024 },
): boolean {
  return staying.saves + other.saves > quota.saves || staying.bytes + other.bytes > quota.bytes;
}

/** A sign-in may be removed while the account holds another (SAVE-193). */
export function mayRemoveSignIn(held: readonly SignInKind[], kind: SignInKind): boolean {
  return held.includes(kind) && held.length > 1;
}
