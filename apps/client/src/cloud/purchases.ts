import { fullGameUnlocked, proofFirst, savesConfig, type EntitlementStatus, type Store } from "@ph/engine/domain/saves";
import { CloudError, type CloudApi, type KeyValue } from "./api.ts";

/**
 * Buying the full game (domain/saves SAVE-170 … SAVE-185). The game asks its
 * own store first through a store bridge, which works offline and needs no
 * account; when the player is signed in it also asks our server for this
 * store's entitlement, and the two answers decide (SAVE-179). Cross-buy is per
 * store: only this store is ever asked about.
 *
 * Each platform's shell gives the bridge: the Steam build makes one from
 * Steamworks (the paid app is the full game), and the phone apps make one over
 * their StoreKit 2 or Play Billing plugin (`capacitorStoreBridge`), unless a
 * shell sets its own in `globalThis.phStore`. Without a
 * bridge, or without a cloud server, the game stays the full game (SAVE-180).
 */

const PM = savesConfig.purchases.messages;

/** What the store hands over for the server to check. */
export type StoreProof = { signedTransaction: string } | { purchaseToken: string } | Record<string, never>;

/** The outcome of the store's purchase sheet; a cancelled one adds no message (SHELL-105). */
export type BuyOutcome = { outcome: "bought"; proof: StoreProof } | { outcome: "pending" } | { outcome: "cancelled" };

/**
 * A platform's store, as the game needs it. A mobile shell implements this
 * over its in-app purchase plugin: `owned` and `proof` from StoreKit 2's
 * current entitlements or Play Billing's queryPurchases (no sheet shown),
 * `buy` with the account's tag set (`appAccountToken`, `obfuscatedAccountId`),
 * and `restore` from AppStore.sync() or a fresh query.
 */
export interface StoreBridge {
  readonly store: Store;
  /** Whether this app sells the full game itself (the phones); the Steam app is the paid game. */
  readonly sells: boolean;
  /** The store's own answer, offline: does this store account own the full game? */
  owned(): Promise<boolean>;
  /** The proof of the full game the store holds now, without asking the player anything; null when there is none. */
  proof(): Promise<StoreProof | null>;
  /** The store's own price text for the full game ("€9.99"), when it can say. */
  price(): Promise<string | null>;
  /** Opens the store's purchase sheet; `accountTag` is the server's tag for this account, when signed in. */
  buy(accountTag: string | null): Promise<BuyOutcome>;
  /** Restore purchases: asks the store for past purchases; the proof, or null when there is none. */
  restore(): Promise<StoreProof | null>;
}

/** The bridge a phone shell set, if any. */
export function shellStoreBridge(): StoreBridge | undefined {
  const b = (globalThis as { phStore?: StoreBridge }).phStore;
  return b && (b.store === "apple" || b.store === "google") ? b : undefined;
}

/** The parts of a Capacitor runtime the phone store needs (as in bridge.ts). */
export interface CapacitorStoreLike {
  getPlatform?(): string;
  isPluginAvailable?(name: string): boolean;
  registerPlugin?(name: string): unknown;
  Plugins?: Record<string, unknown>;
}

/** A purchase as `@capgo/native-purchases` reports it. */
interface NativeTransaction {
  productIdentifier?: string;
  /** StoreKit 2's signed transaction (iOS). */
  jwsRepresentation?: string;
  /** Play's purchase token (Android). */
  purchaseToken?: string;
  /** Play's state: "1" bought, "0" waiting for payment (Android). */
  purchaseState?: string;
}
type NativePlugin = Record<string, ((options?: Record<string, unknown>) => Promise<unknown>) | undefined>;

/**
 * The phone's store, over the `NativePurchases` plugin (`@capgo/native-purchases`, apps/mobile):
 * StoreKit 2 on iOS and Play Billing on Android, for the one non-consumable `full_game`. Undefined
 * when the app has no such plugin, so the game stays the full game (SAVE-180). The plugin finishes
 * and acknowledges the purchase itself, so it holds even when the server never sees it.
 */
export function capacitorStoreBridge(cap: CapacitorStoreLike): StoreBridge | undefined {
  const platform = cap.getPlatform?.();
  const store: Store | undefined = platform === "ios" ? "apple" : platform === "android" ? "google" : undefined;
  if (!store || (cap.isPluginAvailable && !cap.isPluginAvailable("NativePurchases"))) return undefined;
  const plugin = (cap.Plugins?.NativePurchases ?? cap.registerPlugin?.("NativePurchases")) as NativePlugin | undefined;
  if (!plugin?.getPurchases || !plugin.purchaseProduct) return undefined;
  const product = savesConfig.purchases.product_id;
  const inapp = { productType: "inapp" };
  const proofOf = (t: NativeTransaction | undefined): StoreProof | null => {
    if (!t) return null;
    if (store === "apple") return t.jwsRepresentation ? { signedTransaction: t.jwsRepresentation } : null;
    return t.purchaseToken ? { purchaseToken: t.purchaseToken } : null;
  };
  /** The full game among this store account's purchases now: StoreKit's current entitlements, or Play's bought purchases. */
  const current = async (): Promise<NativeTransaction | undefined> => {
    const r = (await plugin.getPurchases!({ ...inapp, onlyCurrentEntitlements: true })) as { purchases?: NativeTransaction[] };
    return (r.purchases ?? []).find((t) => t.productIdentifier === product && (store === "apple" || t.purchaseState === undefined || t.purchaseState === "1"));
  };
  return {
    store,
    sells: true,
    owned: async () => !!(await current()),
    proof: async () => proofOf(await current()),
    async price() {
      const r = (await plugin.getProducts?.({ productIdentifiers: [product], ...inapp })) as { products?: { priceString?: string }[] } | undefined;
      return r?.products?.[0]?.priceString || null;
    },
    async buy(accountTag) {
      let t: NativeTransaction;
      try {
        t = (await plugin.purchaseProduct!({ productIdentifier: product, ...inapp, ...(accountTag ? { appAccountToken: accountTag } : {}) })) as NativeTransaction;
      } catch (e) {
        const why = `${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? e}`;
        if (/cancel/i.test(why)) return { outcome: "cancelled" };
        if (/pending/i.test(why)) return { outcome: "pending" };
        // Bought before (another device, or a sheet that closed early): what the store holds counts.
        if (/ALREADY_OWNED/.test(why)) {
          const proof = proofOf(await current());
          if (proof) return { outcome: "bought", proof };
        }
        throw e;
      }
      if (t.purchaseState === "0") return { outcome: "pending" };
      const proof = proofOf(t) ?? proofOf(await current());
      return proof ? { outcome: "bought", proof } : { outcome: "pending" };
    },
    async restore() {
      await plugin.restorePurchases?.();
      return proofOf(await current());
    },
  };
}

/**
 * The Steam build's bridge: the running app is the paid full game, so Steam
 * already owns it; there is nothing to buy or restore in it (SAVE-170, D-SAVE-23).
 * The server's check only records the purchase on the account.
 */
export function steamStoreBridge(): StoreBridge {
  return {
    store: "steam",
    sells: false,
    owned: async () => true,
    proof: async () => ({}),
    price: async () => null,
    buy: async () => ({ outcome: "cancelled" }),
    restore: async () => ({}),
  };
}

/** The server's answer to `GET /api/entitlements/{store}` (SAVE-172). */
export interface EntitlementAnswer {
  store: Store;
  fullGame: boolean;
  status: EntitlementStatus;
  checkedAt: string | null;
  accountTag: string | null;
}

/** The two calls the purchases make to our server (server/src/Controller/PurchasesController.php). */
export interface PurchasesApi {
  readonly signedIn: boolean;
  entitlement(store: Store): Promise<EntitlementAnswer>;
  submitPurchase(store: Store, proof: StoreProof): Promise<EntitlementAnswer>;
}

/** The CloudApi as the purchases see it. */
export function purchasesApi(api: CloudApi): PurchasesApi {
  return {
    get signedIn() {
      return api.signedIn;
    },
    entitlement: (store) => api.entitlement(store) as Promise<EntitlementAnswer>,
    submitPurchase: (store, proof) => api.submitPurchase(store, proof) as Promise<EntitlementAnswer>,
  };
}

const UNLOCKED_KEY = "ph.full-game";

export class Purchases {
  readonly bridge: StoreBridge;
  private readonly api: PurchasesApi;
  private readonly kv: KeyValue;
  /** Whether the full game is unlocked on this store, on this device. */
  unlocked: boolean;
  /** The server's last answer for this store, if any. */
  server: EntitlementStatus | undefined;
  /** The store's price text for Buy. */
  price: string | null = null;
  /** The card's result line (SAVE-183); empty when there is none. */
  note = "";
  busy = false;
  /** Told whenever `unlocked`, `note` or `busy` changes. */
  onChange: () => void = () => {};
  private accountTag: string | null = null;

  constructor(bridge: StoreBridge, api: PurchasesApi, kv: KeyValue) {
    this.bridge = bridge;
    this.api = api;
    this.kv = kv;
    // Until the store answers, the last answer on this device stands; Steam's paid app is the full game at once.
    this.unlocked = bridge.store === "steam" || kv.get(UNLOCKED_KEY) === "1";
  }

  /** Asks the store, then the server when signed in, and decides (SAVE-179). Never throws. */
  async refresh(): Promise<boolean> {
    let owned = false;
    try {
      owned = await this.bridge.owned();
      if (this.bridge.sells && this.price === null) this.price = await this.bridge.price();
    } catch {
      // The store did not answer: the last answer stands.
      return this.unlocked;
    }
    this.server = await this.ask();
    if (proofFirst({ store: this.bridge.store, owned, ...(this.server ? { server: this.server } : {}) })) {
      const proof = await this.bridge.proof().catch(() => null);
      if (proof) await this.send(proof);
    }
    this.decide(owned);
    return this.unlocked;
  }

  /** Buy on the Unlock card: the store's sheet, then the proof to the server (SAVE-183). */
  async buy(): Promise<void> {
    if (this.busy) return;
    this.start();
    try {
      if (this.api.signedIn && this.accountTag === null) await this.ask();
      const r = await this.bridge.buy(this.accountTag);
      if (r.outcome === "cancelled") this.note = "";
      else if (r.outcome === "pending") this.note = PM.pending;
      else {
        await this.send(r.proof);
        this.decide(true);
        this.note = this.unlocked ? PM.unlocked : this.server === "pending" ? PM.pending : "";
      }
    } catch (e) {
      this.note = e instanceof CloudError && e.code === "other_account" ? PM.other_account : PM.failed;
    }
    this.finish();
  }

  /** Restore purchases on the Unlock card (phones, SAVE-183). */
  async restore(): Promise<void> {
    if (this.busy) return;
    this.start();
    try {
      const proof = await this.bridge.restore();
      if (!proof) {
        this.note = PM.nothing_to_restore;
      } else {
        await this.send(proof);
        this.decide(true);
        this.note = this.unlocked ? PM.unlocked : PM.nothing_to_restore;
      }
    } catch (e) {
      this.note = e instanceof CloudError && e.code === "other_account" ? PM.other_account : PM.failed;
    }
    this.finish();
  }

  /** The server's answer for this store; undefined when there is none (signed out, offline, unavailable). */
  private async ask(): Promise<EntitlementStatus | undefined> {
    if (!this.api.signedIn) return undefined;
    try {
      const a = await this.api.entitlement(this.bridge.store);
      this.accountTag = a.accountTag;
      return a.status;
    } catch {
      return undefined;
    }
  }

  /** Sends the store's proof; a refusal for another account is the card's to say, anything else leaves the store's answer. */
  private async send(proof: StoreProof): Promise<void> {
    if (!this.api.signedIn) return;
    try {
      this.server = (await this.api.submitPurchase(this.bridge.store, proof)).status;
    } catch (e) {
      if (e instanceof CloudError && e.code === "other_account") throw e;
    }
  }

  private decide(owned: boolean): void {
    const was = this.unlocked;
    this.unlocked = fullGameUnlocked({ store: this.bridge.store, owned, ...(this.server ? { server: this.server } : {}) });
    this.kv.set(UNLOCKED_KEY, this.unlocked ? "1" : "0");
    if (was !== this.unlocked) this.onChange();
  }

  private start(): void {
    this.busy = true;
    this.note = "";
    this.onChange();
  }

  private finish(): void {
    this.busy = false;
    this.onChange();
  }
}

// ---------------------------------------------------------------- the Unlock card (SAVE-182 … SAVE-185)

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** What the card was opened for: a realm the player chose, or a locked save's message (SAVE-181). */
export interface UnlockFor {
  realm?: string;
  message?: string;
}

/**
 * The Unlock card's body: what the purchase unlocks, Buy with the store's own
 * price, Restore purchases on phones, and the result in the card itself. It
 * names no other store and no other way to pay.
 */
export function unlockHtml(p: Purchases, opened: UnlockFor = {}): string {
  const lead = opened.message ? `<p class="hint">${esc(opened.message)}</p>` : opened.realm ? `<p class="hint">${esc(opened.realm)} is part of the full game.</p>` : "";
  const note = p.note ? `<p class="note" role="status">${esc(p.note)}</p>` : "";
  if (p.unlocked) {
    // What the player asked for is one tap away, still chosen (SAVE-181).
    const go = opened.realm ? `Play ${opened.realm}` : opened.message ? "Continue this campaign" : "";
    return `<div class="unlock-card"><p class="unlock-done" role="status">${esc(PM.unlocked)}</p>${go ? `<button class="wax unlock-buy" data-unlock-go>${esc(go)}</button>` : ""}</div>`;
  }
  const busy = p.busy ? " disabled" : "";
  return `<div class="unlock-card">
    ${lead}
    <p class="unlock-what"><b>${esc(PM.unlocks)}</b></p>
    ${p.bridge.sells ? `<button class="wax unlock-buy" data-unlock-buy${busy}>Buy${p.price ? ` · ${esc(p.price)}` : ""}</button>` : ""}
    ${note}
    ${p.bridge.sells ? `<button class="paper unlock-restore" data-unlock-restore${busy}>Restore purchases</button>` : ""}
  </div>`;
}

/** Binds Buy, Restore purchases and, once unlocked, Play to the card. */
export function bindUnlock(card: HTMLElement, p: Purchases, go: () => void): void {
  card.querySelector("[data-unlock-buy]")?.addEventListener("click", () => void p.buy());
  card.querySelector("[data-unlock-restore]")?.addEventListener("click", () => void p.restore());
  card.querySelector("[data-unlock-go]")?.addEventListener("click", go);
}
