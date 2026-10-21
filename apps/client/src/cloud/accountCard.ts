import { CloudError, errorText, type AccountCard, type SharedCard } from "./api.ts";
import { combinedLine, combineHtml } from "./combine.ts";
import type { SteamSignIn } from "./steam.ts";
import { STORE_LABEL, type StoreSignIn } from "./storeSignIn.ts";
import type { CloudSync } from "./sync.ts";

/**
 * Settings → Account and cloud saves (accounts-design §3, SAVE-119 …): one
 * card for the subject. Signed out, the store sign-ins this platform offers
 * (Sign in with Steam in the Steam build, SAVE-146; Apple, Google and Steam in
 * the browser on phones and the web, SAVE-155), the email sign-in and Make an
 * account; signed in, the display name, the cloud's status line (its
 * overview), Sign-ins with Add buttons (SAVE-147, SAVE-156), Remove on each
 * while there are two or more (SAVE-195), the question whether to combine
 * when an Add brings another account's sign-in (SAVE-194), Storage, Devices
 * with Sign out on each, Shared saves with Remove on each (SAVE-135), Sign
 * out, and at the very bottom Delete account, which asks first and names
 * what goes (SAVE-205). Sync on Wi-Fi only joins when it is built.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export interface AccountView {
  form: "sign_in" | "register";
  /** Kept across redraws so a failed try need not be typed again. */
  email: string;
  busy: boolean;
  error: string;
  /** The account card from the server, fetched when the section opens. */
  card: AccountCard | undefined;
  cardError: string;
  /** The device whose Sign out was tapped, or `shared:<code>` for a Remove, asking first. */
  confirm: string;
  /** The saves this account shared with the community, fetched with the card (SAVE-135). */
  shared: SharedCard[] | undefined;
  /** A line about what just happened, such as two accounts combined (SAVE-194). */
  notice: string;
}

export const accountView = (): AccountView => ({ form: "sign_in", email: "", busy: false, error: "", card: undefined, cardError: "", confirm: "", shared: undefined, notice: "" });

/** The line the signed-out card shows once the account is deleted (SAVE-206). */
export const DELETED = "The account is deleted. The saves on this device stay.";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * Delete account's question, in the card in place of the button (SAVE-205,
 * SAVE-207): what goes, read from Storage and the Shared saves row, and what
 * stays. Offline it waits for a connection (SAVE-206).
 */
export function deleteHtml(name: string, saves: number | undefined, shared: number | undefined, offline: boolean, busy: boolean): string {
  const goes = [saves === undefined ? "Its cloud saves" : `Its ${plural(saves, "cloud save")}`, shared ? plural(shared, "shared save") : ""].filter(Boolean).join(" and ");
  return `<div class="cloud-delete" role="group" aria-label="Delete account">
    <p><b>Delete the account "${esc(name)}"?</b> ${esc(goes)} ${saves === 1 && !shared ? "is" : "are"} deleted, and every device is signed out.</p>
    <p>The saves on this device stay. Purchases stay with the store: Restore purchases unlocks the full game again.</p>
    <p><b>This cannot be undone.</b></p>
    ${offline ? `<p class="note" role="status">Connect to delete the account.</p>` : ""}
    <button class="wax cloud-delete-yes" data-cloud-delete${busy || offline ? " disabled" : ""}>Delete account</button>
    <button class="paper cloud-delete-no" data-cloud-cancel>Keep</button>
  </div>`;
}

const times = (n: number) => `Played ${n} time${n === 1 ? "" : "s"}`;

const PLATFORMS: Record<string, string> = { steam: "Steam", desktop: "Computer", ios: "iPhone or iPad", android: "Android", web: "Browser" };

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

function seen(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const min = Math.round((now - t) / 60000);
  if (min < 2) return "active now";
  if (min < 60) return `last seen ${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `last seen ${h} h ago`;
  return `last seen ${new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

const PROVIDERS: Record<string, string> = { steam: "Steam", apple: "Apple", google: "Google", email: "Email", password: "Email" };

/** What Remove asks about each sign-in (SAVE-195). */
const REMOVE_NAME: Record<string, string> = { steam: "Steam", apple: "Sign in with Apple", google: "Google sign-in", email: "the email sign-in" };

/**
 * The Sign-ins row (SAVE-147): Steam first, with the Steam name on this
 * computer (the server knows only the SteamID), then email with its address.
 * With two or more, each has Remove, which asks first in its row (SAVE-195);
 * the last one has none.
 */
function signInsRow(card: AccountCard | undefined, steam: SteamSignIn | undefined, v?: AccountView): string {
  if (!card?.signIns.length) return "";
  const order = (p: string) => (p === "steam" ? 0 : p === "email" || p === "password" ? 2 : 1);
  const rows = [...card.signIns].sort((a, b) => order(a.provider) - order(b.provider));
  const label = (s: { provider: string; label: string }) =>
    s.provider === "steam" ? (steam?.steam.name ? `Steam · ${steam.steam.name}` : "Steam") : s.provider === "email" || s.provider === "password" ? `Email · ${s.label}` : (PROVIDERS[s.provider] ?? s.provider);
  if (rows.length < 2) return `<div class="set-row cloud-sign-ins"><div class="set-label"><b>Sign-ins</b><small>${rows.map((s) => esc(label(s))).join("<br>")}</small></div></div>`;
  const kind = (p: string) => (p === "password" ? "email" : p);
  return `<div class="set-row cloud-sign-ins"><div class="set-label"><b>Sign-ins</b></div></div>
    ${rows
      .map((s) => {
        const k = kind(s.provider);
        const control =
          v?.confirm === `sign-in:${k}`
            ? `<b>Remove ${esc(REMOVE_NAME[k] ?? k)}? This device stays signed in.</b><button class="wax" data-cloud-unlink="${esc(k)}"${v.busy ? " disabled" : ""}>Remove</button><button class="paper" data-cloud-cancel>Keep</button>`
            : `<button class="paper" data-cloud-ask="sign-in:${esc(k)}">Remove</button>`;
        return `<div class="set-row cloud-sign-in"><div class="set-label"><small>${esc(label(s))}</small></div><div class="set-control">${control}</div></div>`;
      })
      .join("")}`;
}

/** The store sign-ins on the card: Steam's ticket in the Steam build, else what the bridge can start. */
function storesShown(steam: SteamSignIn | undefined, store: StoreSignIn | undefined) {
  return (store?.stores() ?? []).filter((s) => !(steam && s === "steam"));
}

/**
 * `steam` is there only in the Steam build with Steam running (SAVE-146);
 * `store` wherever cloud saves are on (SAVE-155).
 */
export function accountHtml(sync: CloudSync, v: AccountView, now = Date.now(), steam?: SteamSignIn, store?: StoreSignIn): string {
  const api = sync.api;
  const error = v.error ? `<p class="note" role="alert">${esc(v.error)}</p>` : "";
  const storeError = store?.error ? `<p class="note" role="alert">${esc(store.error)}</p>` : "";
  const waiting = v.busy || !!store?.busy;
  if (!api.signedIn) {
    const register = v.form === "register";
    const stores = storesShown(steam, store);
    const buttons = [
      steam ? `<button class="wax cloud-steam" data-cloud-steam${waiting ? " disabled" : ""}>Sign in with Steam</button>` : "",
      ...stores.map((s) => `<button class="wax cloud-store cloud-${s}" data-cloud-store="${s}"${waiting ? " disabled" : ""}>${STORE_LABEL[s]}</button>`),
    ].join("");
    const steamPart =
      steam || stores.length
        ? `${buttons}
      ${steam?.error ? `<p class="note" role="alert">${esc(steam.error)}</p>` : ""}${storeError}
      <p class="hint">Or use email instead:</p>`
        : "";
    return `<div class="cloud-card">
      ${v.notice ? `<p class="note cloud-notice" role="status">${esc(v.notice)}</p>` : ""}
      <p class="hint">Sign in to keep your saves on every device. The game plays fully without an account.</p>
      ${steamPart}
      ${error}
      <form class="cloud-form" data-cloud-form="${v.form}">
        <label><span>Email</span><input name="email" type="email" autocomplete="email" value="${esc(v.email)}" required></label>
        ${register ? `<label><span>Display name</span><input name="displayName" minlength="2" maxlength="40" autocomplete="nickname" required></label>` : ""}
        <label><span>Password</span><input name="password" type="password" ${register ? `minlength="8" autocomplete="new-password"` : `autocomplete="current-password"`} required></label>
        <button class="wax" type="submit"${v.busy ? " disabled" : ""}>${register ? "Make the account" : "Sign in"}</button>
      </form>
      <button class="paper" data-cloud-switch="${register ? "sign_in" : "register"}">${register ? "I already have an account" : "Make an account"}</button>
    </div>`;
  }
  const u = sync.usage();
  const devices = v.card?.devices ?? [];
  const state = sync.state();
  // An account made with a store alone has no email (accounts-design §4): the line names the sign-in instead (SAVE-147, SAVE-156).
  const held = v.card?.signIns.map((s) => s.provider) ?? [];
  const first = steam ? "steam" : (["steam", "apple", "google"] as const).find((p) => held.includes(p));
  const under = api.account?.email ?? (first ? `Signed in with ${{ steam: "Steam", apple: "Apple", google: "Google" }[first]}` : "");
  const addable = v.card && store ? storesShown(steam, store).filter((s) => !held.includes(s)) : [];
  // An Add that brought a sign-in of another account asks, once, whether to combine them, in place of the Add buttons (SAVE-194).
  const addRow = store?.offer
    ? combineHtml(store.offer, api.account?.displayName ?? "", v.busy, now)
    : addable.length
      ? `<div class="cloud-add-row">${addable.map((s) => `<button class="paper cloud-add" data-cloud-add="${s}"${waiting ? " disabled" : ""}>Add ${STORE_LABEL[s]}</button>`).join("")}</div>`
      : "";
  const notice = v.notice ? `<p class="note cloud-notice" role="status">${esc(v.notice)}</p>` : "";
  return `<div class="cloud-card">
    <div class="set-row"><div class="set-label"><b>${esc(api.account?.displayName ?? "")}</b><small>${esc(under)}</small></div></div>
    <p class="cloud-status${state === "up_to_date" ? "" : " warn"}" role="status">${esc(sync.statusText())}</p>
    ${error}${notice}
    ${signInsRow(v.card, steam, v)}
    ${addRow}${storeError}
    <div class="set-row"><div class="set-label"><b>Storage</b><small>${u ? `${u.saves} of ${u.quotaSaves} saves · ${mb(u.bytes)} of ${mb(u.quotaBytes)}` : "Counted after the next sync."}</small></div></div>
    <h4 class="sub">Devices</h4>
    ${v.card ? "" : `<p class="hint">${esc(v.cardError || "Loading the devices…")}</p>`}
    ${devices
      .map(
        (d) => `<div class="set-row cloud-device">
      <div class="set-label"><b>${esc(d.name)}${d.current ? " (this device)" : ""}</b><small>${esc([PLATFORMS[d.platform] ?? d.platform, seen(d.lastSeenAt, now)].filter(Boolean).join(" · "))}</small></div>
      <div class="set-control">${
        v.confirm === d.id
          ? `<b>Sign out ${esc(d.name)}?</b><button class="wax" data-cloud-device-out="${esc(d.id)}"${v.busy ? " disabled" : ""}>Sign out</button><button class="paper" data-cloud-cancel>Keep</button>`
          : `<button class="paper" data-cloud-ask="${esc(d.id)}">Sign out</button>`
      }</div>
    </div>`,
      )
      .join("")}
    <h4 class="sub">Shared saves</h4>
    ${v.shared === undefined ? `<p class="hint">${v.card ? "Connect to see what you shared." : esc(v.cardError || "Loading…")}</p>` : v.shared.length ? "" : `<p class="hint">None yet. Open a save under Load and tap Share to post it to the community.</p>`}
    ${(v.shared ?? [])
      .map(
        (s) => `<div class="set-row cloud-shared">
      <div class="set-label"><b>${esc(s.title)}</b><small>${esc(times(s.plays))} · code ${esc(s.code.slice(0, 4))}-${esc(s.code.slice(4))}</small></div>
      <div class="set-control">${
        v.confirm === `shared:${s.code}`
          ? `<b>Remove it? The topic stays.</b><button class="wax" data-cloud-unshare="${esc(s.code)}"${v.busy ? " disabled" : ""}>Remove</button><button class="paper" data-cloud-cancel>Keep</button>`
          : `${s.topicUrl ? `<button class="paper" data-cloud-topic="${esc(s.topicUrl)}">Topic</button>` : ""}<button class="paper" data-cloud-ask="shared:${esc(s.code)}">Remove</button>`
      }</div>
    </div>`,
      )
      .join("")}
    <button class="paper cloud-sign-out" data-cloud-sign-out${v.busy ? " disabled" : ""}>Sign out of this device</button>
    ${
      v.confirm === "delete-account"
        ? deleteHtml(api.account?.displayName ?? "", u?.saves, v.shared?.length, state === "offline", v.busy)
        : `<button class="paper cloud-delete-ask" data-cloud-ask="delete-account"${v.busy ? " disabled" : ""}>Delete account</button>`
    }
  </div>`;
}

/**
 * Binds the card's buttons. `device` is how this device names itself to the
 * server; `redraw` draws the section again.
 */
export function bindAccount(card: HTMLElement, sync: CloudSync, v: AccountView, device: { name: string; platform: string }, redraw: () => void, steam?: SteamSignIn, store?: StoreSignIn): void {
  const api = sync.api;
  const act = async (work: () => Promise<unknown>) => {
    v.busy = true;
    v.error = "";
    v.notice = "";
    // A store's old reason would only confuse once the player moved on to the email form.
    if (store) store.error = "";
    redraw();
    try {
      await work();
    } catch (e) {
      v.error = errorText(e);
    }
    v.busy = false;
    redraw();
  };
  const form = card.querySelector<HTMLFormElement>("[data-cloud-form]");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const email = String(f.get("email") ?? "").trim();
    v.email = email;
    const password = String(f.get("password") ?? "");
    void act(async () => {
      if (form.dataset.cloudForm === "register") await api.register(email, String(f.get("displayName") ?? "").trim(), password, device);
      else await api.signIn(email, password, device);
      v.form = "sign_in";
      void sync.signedIn();
      void loadCard(sync, v, redraw);
    });
  });
  card.querySelector<HTMLButtonElement>("[data-cloud-steam]")?.addEventListener("click", async () => {
    if (!steam) return;
    v.busy = true;
    v.error = "";
    redraw();
    try {
      await steam.signIn();
      void loadCard(sync, v, redraw);
    } catch {
      // steam.error holds the reason, shown under the button.
    }
    v.busy = false;
    redraw();
  });
  // Apple, Google and Steam in the browser (SAVE-155, SAVE-156): the store's own sheet, then the card again.
  const storeTap = (work: (s: StoreSignIn) => Promise<boolean>) => async () => {
    if (!store) return;
    v.busy = true;
    v.error = "";
    redraw();
    try {
      if (await work(store)) await loadCard(sync, v, () => {});
    } catch {
      // store.error holds the reason, shown under the buttons.
    }
    v.busy = false;
    redraw();
  };
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-store]").forEach((b) =>
    b.addEventListener("click", storeTap((s) => s.signIn(b.dataset.cloudStore as Parameters<StoreSignIn["signIn"]>[0]))),
  );
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-add]").forEach((b) =>
    b.addEventListener("click", storeTap((s) => s.add(b.dataset.cloudAdd as Parameters<StoreSignIn["add"]>[0]))),
  );
  // Combining two accounts (SAVE-187, SAVE-194): the server moves everything here, then the sync brings the saves.
  card.querySelector<HTMLButtonElement>("[data-cloud-combine]")?.addEventListener("click", () =>
    void act(async () => {
      const offer = store?.offer;
      if (!offer?.token) return;
      try {
        const r = await api.combineAccounts(offer.token);
        v.card = r;
        v.notice = combinedLine(r.combined.displayName);
        void sync.run("launch");
        void loadCard(sync, v, redraw);
      } finally {
        if (store) store.offer = undefined;
      }
    }),
  );
  card.querySelector<HTMLButtonElement>("[data-cloud-combine-close]")?.addEventListener("click", () => {
    if (store) store.offer = undefined;
    redraw();
  });
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-unlink]").forEach((b) =>
    b.addEventListener("click", () =>
      void act(async () => {
        const signIns = await api.removeSignIn(b.dataset.cloudUnlink!);
        v.confirm = "";
        if (v.card) v.card = { ...v.card, signIns };
      }),
    ),
  );
  card.querySelector<HTMLButtonElement>("[data-cloud-switch]")?.addEventListener("click", (e) => {
    v.form = (e.currentTarget as HTMLButtonElement).dataset.cloudSwitch as AccountView["form"];
    v.error = "";
    redraw();
  });
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-ask]").forEach((b) =>
    b.addEventListener("click", () => {
      v.confirm = b.dataset.cloudAsk!;
      redraw();
    }),
  );
  card.querySelector("[data-cloud-cancel]")?.addEventListener("click", () => {
    v.confirm = "";
    redraw();
  });
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-device-out]").forEach((b) =>
    b.addEventListener("click", () =>
      void act(async () => {
        await api.signOutDevice(b.dataset.cloudDeviceOut!);
        v.confirm = "";
        if (api.signedIn) await loadCard(sync, v, () => {});
        else v.card = undefined;
      }),
    ),
  );
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-topic]").forEach((b) => b.addEventListener("click", () => window.open(b.dataset.cloudTopic!, "_blank", "noopener")));
  card.querySelectorAll<HTMLButtonElement>("[data-cloud-unshare]").forEach((b) =>
    b.addEventListener("click", () =>
      void act(async () => {
        await api.removeShared(b.dataset.cloudUnshare!);
        v.confirm = "";
        v.shared = v.shared?.filter((s) => s.code !== b.dataset.cloudUnshare);
      }),
    ),
  );
  // Deleting the account (SAVE-198, SAVE-206): the server deletes it, this device signs out and keeps its own saves.
  card.querySelector("[data-cloud-delete]")?.addEventListener("click", () =>
    void act(async () => {
      await api.deleteAccount();
      v.confirm = "";
      v.card = undefined;
      v.shared = undefined;
      v.form = "sign_in";
      v.notice = DELETED;
    }),
  );
  card.querySelector("[data-cloud-sign-out]")?.addEventListener("click", () =>
    void act(async () => {
      await api.signOut();
      v.card = undefined;
      v.shared = undefined;
    }),
  );
}

/** Fetches the devices and the shared saves for the card. */
export async function loadCard(sync: CloudSync, v: AccountView, redraw: () => void): Promise<void> {
  if (!sync.api.signedIn) return;
  try {
    // The shared saves are a row of their own: the devices show even when they could not be read.
    const [card, shared] = await Promise.all([sync.api.getAccount(), sync.api.mySharedSaves().catch(() => undefined)]);
    v.card = card;
    v.shared = shared;
    v.cardError = "";
  } catch (e) {
    v.cardError = e instanceof CloudError && e.offline ? "Connect to see the devices." : errorText(e);
  }
  redraw();
}
