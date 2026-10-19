import { CloudError, errorText, type AccountCard, type SharedCard } from "./api.ts";
import type { CloudSync } from "./sync.ts";

/**
 * Settings → Account and cloud saves (accounts-design §3, SAVE-119 …): one
 * card for the subject. Signed out, the email sign-in and Make an account;
 * signed in, the display name, the cloud's status line (its overview),
 * Storage, Devices with Sign out on each, Shared saves with Remove on each
 * (SAVE-135), and Sign out. Store sign-ins (Steam,
 * Apple, Google) and Sync on Wi-Fi only join when they are built.
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
}

export const accountView = (): AccountView => ({ form: "sign_in", email: "", busy: false, error: "", card: undefined, cardError: "", confirm: "", shared: undefined });

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

export function accountHtml(sync: CloudSync, v: AccountView, now = Date.now()): string {
  const api = sync.api;
  const error = v.error ? `<p class="note" role="alert">${esc(v.error)}</p>` : "";
  if (!api.signedIn) {
    const register = v.form === "register";
    return `<div class="cloud-card">
      <p class="hint">Sign in to keep your saves on every device. The game plays fully without an account.</p>
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
  return `<div class="cloud-card">
    <div class="set-row"><div class="set-label"><b>${esc(api.account?.displayName ?? "")}</b><small>${esc(api.account?.email ?? "")}</small></div></div>
    <p class="cloud-status${state === "up_to_date" ? "" : " warn"}" role="status">${esc(sync.statusText())}</p>
    ${error}
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
  </div>`;
}

/**
 * Binds the card's buttons. `device` is how this device names itself to the
 * server; `redraw` draws the section again.
 */
export function bindAccount(card: HTMLElement, sync: CloudSync, v: AccountView, device: { name: string; platform: string }, redraw: () => void): void {
  const api = sync.api;
  const act = async (work: () => Promise<unknown>) => {
    v.busy = true;
    v.error = "";
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
