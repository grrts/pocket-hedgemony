import { COMBINE_MINUTES } from "@ph/engine/domain/saves";
import type { CombineOffer } from "./api.ts";

/**
 * The question the Account card asks once when an Add brings a sign-in of another account
 * (SAVE-194, accounts-design §5): what that account holds, which account stays, and that saves,
 * shared saves and purchases all move to it. It sits in the card's one column, in place of the Add
 * buttons; Combine accounts is full width and 48 points high, Keep apart and OK 44 (SAVE-197).
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const SIGN_IN: Record<string, string> = { steam: "Steam sign-in", apple: "Sign in with Apple", google: "Google sign-in", email: "email" };
const STORE: Record<string, string> = { steam: "Steam", apple: "the App Store", google: "Google Play" };

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

function list(parts: string[]): string {
  return parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "This Sign in with Apple has its own Pocket Hegemony account, "Bertrand", with 4 saves." */
export function offerLine(offer: CombineOffer): string {
  const a = offer.account;
  const held = [count(a.saves, "save")];
  if (a.sharedSaves) held.push(count(a.sharedSaves, "shared save"));
  if (a.purchases.length) held.push(`the full game on ${list(a.purchases.map((s) => STORE[s] ?? s))}`);
  return `This ${SIGN_IN[offer.signIn] ?? offer.signIn} has its own Pocket Hegemony account, "${a.displayName}", with ${list(held)}.`;
}

/** What combining does, naming the account that stays. */
export function movesLine(offer: CombineOffer, staying: string): string {
  return `Everything moves to this account, "${staying}": saves, shared saves, purchases, sign-ins and devices. All saves are kept. "${offer.account.displayName}" is then closed.`;
}

export const RAN_OUT = "The offer to combine ran out. Add the sign-in again.";

/** The offer has run out on the server by now (`sign_in.combine_minutes`). */
export function offerRanOut(at: number, now: number): boolean {
  return now - at >= COMBINE_MINUTES * 60_000;
}

/** The question in the card, its reason when combining is blocked (SAVE-188), or the line that it ran out. */
export function combineHtml(offer: CombineOffer & { at: number }, staying: string, busy: boolean, now: number): string {
  const ok = `<button class="paper cloud-combine-no" data-cloud-combine-close>OK</button>`;
  if (offerRanOut(offer.at, now)) return `<div class="cloud-combine" role="group"><p class="hint">${esc(RAN_OUT)}</p>${ok}</div>`;
  if (offer.blockedBy || !offer.token) {
    return `<div class="cloud-combine" role="alert">
      <p>${esc(offerLine(offer))}</p>
      <p class="note">${esc(offer.message ?? "These two accounts cannot be combined.")}</p>
      ${ok}
    </div>`;
  }
  const full = offer.account.storageFull || offer.account.sharedFull ? `<p class="note">Your storage will be full; delete old saves to keep uploading.</p>` : "";
  return `<div class="cloud-combine" role="group" aria-label="Combine the two accounts">
    <p>${esc(offerLine(offer))}</p>
    <p><b>Combine the two accounts?</b></p>
    <p class="hint">${esc(movesLine(offer, staying))}</p>
    ${full}
    <button class="wax cloud-combine-yes" data-cloud-combine${busy ? " disabled" : ""}>Combine accounts</button>
    <button class="paper cloud-combine-no" data-cloud-combine-close${busy ? " disabled" : ""}>Keep apart</button>
  </div>`;
}

/** What the card says once the two are one. */
export const combinedLine = (name: string) => `Accounts combined. Everything from "${name}" is now in this account.`;
