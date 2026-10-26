import { CloudError } from "./api.ts";

/**
 * The platform bridge for the store sign-ins (SAVE-149 … SAVE-155, D-SAVE-22): how this build
 * opens Apple's and Google's sheets and the browser sheet for Steam. The game's own logic, the
 * nonce and the server calls live in storeSignIn.ts; this file only talks to the platform.
 *
 * - On a phone (Capacitor) each store goes through a small plugin, used only when the app has it:
 *   `SocialLogin` (`@capgo/capacitor-social-login`) for Sign in with Apple on iOS and Google's
 *   Credential Manager on Android, and `Browser` with `App` (`@capacitor/browser`, `@capacitor/app`)
 *   for Steam's page and the return link `pockethegemony://auth/steam` (apps/mobile, docs/mobile.md).
 * - On the web, Apple's and Google's own sign-in scripts, used only when the build names its Apple
 *   Services ID and redirect address (`VITE_APPLE_SERVICES_ID`, `VITE_APPLE_REDIRECT_URI`) and its
 *   Google client id (`VITE_GOOGLE_CLIENT_ID`); Steam goes to Steam in the same tab and comes back.
 * - In the desktop app none of them: the Steam build signs in with its ticket (steam.ts).
 */
export type Store = "apple" | "google" | "steam";

export interface SignInBridge {
  /** Whether this build can start the store's sign-in; a store it cannot start shows no button. */
  can(store: Store): boolean;
  /** Apple's sheet, asked to sign `nonceHash` into the identity token; the authorization code lets the server revoke the sign-in later (SAVE-203). */
  apple(nonceHash: string): Promise<{ identityToken: string; authorizationCode?: string | undefined; name?: string | undefined }>;
  /** Google's sheet (Credential Manager, or Google's web sign-in), likewise. */
  google(nonceHash: string): Promise<{ idToken: string; name?: string | undefined }>;
  /** Where Steam's sign-in comes back to: the app's link, or this page on the web. */
  readonly steamReturn: string;
  /**
   * Opens Steam's sign-in page; resolves with the browser's way back (`steamCode` or `steamError`),
   * or with undefined when the page itself went to Steam and the game resumes on its return (web).
   */
  steam(url: string): Promise<{ code?: string; error?: string } | undefined>;
  /** On the web, the way back from Steam this page was opened with, once; then the address is cleaned. */
  returned(): { code?: string; error?: string } | undefined;
}

const cancelled = () => new CloudError(499, "sign_in_cancelled");
const failed = () => new CloudError(503, "sign_in_sheet");

/** What came back from the browser: `?steamCode=…` or `?steamError=…`, or undefined when neither. */
export function steamAnswer(url: string): { code?: string; error?: string } | undefined {
  let q: URLSearchParams;
  try {
    q = new URL(url).searchParams;
  } catch {
    return undefined;
  }
  const code = q.get("steamCode") ?? undefined;
  const error = q.get("steamError") ?? undefined;
  return code || error ? { ...(code ? { code } : {}), ...(error ? { error } : {}) } : undefined;
}

const nameOf = (...parts: (string | null | undefined)[]) => parts.filter((p) => !!p?.trim()).join(" ").trim() || undefined;

// ---------------------------------------------------------------- phones (Capacitor)

interface Listener {
  remove(): Promise<void> | void;
}
type Plugin = Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>;
export interface CapacitorLike {
  getPlatform?(): string;
  isPluginAvailable?(name: string): boolean;
  registerPlugin?(name: string): unknown;
  Plugins?: Record<string, unknown>;
}

/**
 * The phone's bridge. `googleClientId` is the web client id Google's tokens are made for (the
 * Android app names it as its server client); `appleClientId` is the app's bundle id. Sign in with
 * Apple is offered on iOS only, where the sheet is the system's own (the stores per platform are
 * `sign_in.options`).
 */
export function capacitorBridge(cap: CapacitorLike, config: { googleClientId?: string | undefined; appleClientId: string; appReturn: string }): SignInBridge {
  const plugin = (name: string): Plugin | undefined => {
    if (cap.isPluginAvailable && !cap.isPluginAvailable(name)) return undefined;
    return (cap.Plugins?.[name] ?? cap.registerPlugin?.(name)) as Plugin | undefined;
  };
  // SocialLogin starts each provider once, with only that provider's settings.
  const ready = new Map<string, Promise<unknown>>();
  const start = (p: Plugin, provider: "apple" | "google", options: Record<string, unknown>) => {
    if (!ready.has(provider)) ready.set(provider, p.initialize!({ [provider]: options }));
    return ready.get(provider)!;
  };
  return {
    steamReturn: config.appReturn,
    can: (store) =>
      store === "apple"
        ? !!plugin("SocialLogin") && cap.getPlatform?.() === "ios"
        : store === "google"
          ? !!plugin("SocialLogin") && !!config.googleClientId
          : !!plugin("Browser") && !!plugin("App"),
    async apple(nonceHash) {
      const p = plugin("SocialLogin");
      if (!p?.initialize || !p.login) throw failed();
      let r: { result?: { idToken?: string | null; accessToken?: { token?: string | null } | null; profile?: { givenName?: string | null; familyName?: string | null } } };
      try {
        // On iOS Apple's sheet signs for the app's own bundle id; the client id only names the provider.
        await start(p, "apple", { clientId: config.appleClientId });
        r = (await p.login({ provider: "apple", options: { scopes: ["name"], nonce: nonceHash } })) as typeof r;
      } catch {
        throw cancelled();
      }
      const token = r.result?.idToken;
      if (!token) throw failed();
      // Left in its default mode the plugin hands back Apple's one-time authorization code as accessToken.token,
      // unspent, so the server can trade it for the refresh token it revokes on Delete account.
      return { identityToken: token, authorizationCode: r.result?.accessToken?.token || undefined, name: nameOf(r.result?.profile?.givenName, r.result?.profile?.familyName) };
    },
    async google(nonceHash) {
      const p = plugin("SocialLogin");
      if (!p?.initialize || !p.login || !config.googleClientId) throw failed();
      let r: { result?: { idToken?: string | null; profile?: { name?: string | null } } };
      try {
        await start(p, "google", { webClientId: config.googleClientId });
        r = (await p.login({ provider: "google", options: { scopes: ["profile"], nonce: nonceHash } })) as typeof r;
      } catch {
        throw cancelled();
      }
      const token = r.result?.idToken;
      if (!token) throw failed();
      return { idToken: token, name: nameOf(r.result?.profile?.name) };
    },
    async steam(url) {
      const browser = plugin("Browser");
      const app = plugin("App");
      if (!browser?.open || !app?.addListener) throw failed();
      const listeners: Listener[] = [];
      try {
        return await new Promise<{ code?: string; error?: string }>((resolve, reject) => {
          void (app.addListener!("appUrlOpen", (e: unknown) => {
            const link = (e as { url?: string }).url ?? "";
            if (!link.startsWith(config.appReturn)) return;
            const answer = steamAnswer(link);
            if (answer) resolve(answer);
            else reject(failed());
          }) as Promise<Listener>).then((l) => listeners.push(l));
          // The player closed the sheet without signing in.
          void (browser.addListener?.("browserFinished", () => reject(cancelled())) as Promise<Listener> | undefined)?.then((l) => listeners.push(l));
          browser.open!({ url, presentationStyle: "popover" }).catch(() => reject(failed()));
        });
      } finally {
        for (const l of listeners) void l.remove();
        void browser.close?.().catch(() => {});
      }
    },
    returned: () => undefined,
  };
}

// ---------------------------------------------------------------- the web

interface AppleJs {
  auth: {
    init(o: Record<string, unknown>): void;
    signIn(): Promise<{ authorization?: { id_token?: string; code?: string }; user?: { name?: { firstName?: string; lastName?: string } } }>;
  };
}
interface GoogleJs {
  accounts: {
    id: {
      initialize(o: Record<string, unknown>): void;
      prompt(cb?: (n: Record<string, (() => unknown) | undefined>) => void): void;
    };
  };
}

const APPLE_JS = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
const GOOGLE_JS = "https://accounts.google.com/gsi/client";

/** Loads a store's sign-in script once; the page goes on without it when it cannot load. */
function script(src: string): Promise<void> {
  const loaded = (window as unknown as { __phScripts?: Record<string, Promise<void>> }).__phScripts ?? {};
  (window as unknown as { __phScripts: Record<string, Promise<void>> }).__phScripts = loaded;
  return (loaded[src] ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      delete loaded[src];
      reject(failed());
    };
    document.head.append(el);
  }));
}

export interface WebConfig {
  googleClientId?: string | undefined;
  appleServicesId?: string | undefined;
  appleRedirectUri?: string | undefined;
}

/** The web game's bridge; `location` and `history` are the page's own. */
export function webBridge(config: WebConfig, page: { location: Location; history: History } = window): SignInBridge {
  const here = () => page.location.origin + page.location.pathname;
  return {
    get steamReturn() {
      return here();
    },
    can: (store) => (store === "apple" ? !!config.appleServicesId && !!config.appleRedirectUri : store === "google" ? !!config.googleClientId : true),
    async apple(nonceHash) {
      if (!config.appleServicesId || !config.appleRedirectUri) throw failed();
      await script(APPLE_JS);
      const AppleID = (window as unknown as { AppleID?: AppleJs }).AppleID;
      if (!AppleID) throw failed();
      AppleID.auth.init({ clientId: config.appleServicesId, scope: "name", redirectURI: config.appleRedirectUri, usePopup: true, nonce: nonceHash });
      let r: Awaited<ReturnType<AppleJs["auth"]["signIn"]>>;
      try {
        r = await AppleID.auth.signIn();
      } catch {
        throw cancelled();
      }
      const token = r.authorization?.id_token;
      if (!token) throw failed();
      return { identityToken: token, authorizationCode: r.authorization?.code || undefined, name: nameOf(r.user?.name?.firstName, r.user?.name?.lastName) };
    },
    async google(nonceHash) {
      if (!config.googleClientId) throw failed();
      await script(GOOGLE_JS);
      const google = (window as unknown as { google?: GoogleJs }).google;
      if (!google) throw failed();
      const token = await new Promise<string>((resolve, reject) => {
        google.accounts.id.initialize({
          client_id: config.googleClientId,
          nonce: nonceHash,
          use_fedcm_for_prompt: true,
          cancel_on_tap_outside: true,
          context: "signin",
          callback: (r: { credential?: string }) => (r.credential ? resolve(r.credential) : reject(failed())),
        });
        google.accounts.id.prompt((n) => {
          const dismissed = n.isDismissedMoment?.() && n.getDismissedReason?.() !== "credential_returned";
          if (n.isNotDisplayed?.() || n.isSkippedMoment?.() || dismissed) reject(cancelled());
        });
      });
      return { idToken: token };
    },
    async steam(url) {
      page.location.assign(url);
      return undefined;
    },
    returned() {
      const answer = steamAnswer(page.location.href);
      if (!answer) return undefined;
      const url = new URL(page.location.href);
      url.searchParams.delete("steamCode");
      url.searchParams.delete("steamError");
      page.history.replaceState(page.history.state, "", url.pathname + url.search + url.hash);
      return answer;
    },
  };
}

/** A build that can start none of them: the desktop app. */
export const noBridge: SignInBridge = {
  steamReturn: "",
  can: () => false,
  apple: () => Promise.reject(failed()),
  google: () => Promise.reject(failed()),
  steam: () => Promise.reject(failed()),
  returned: () => undefined,
};
