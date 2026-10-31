// Steamworks for the Steam build (domain/saves SAVE-140 … SAVE-142). The
// binding, steamworks.js, is an optional dependency and is loaded only when
// the game has a Steam app id, so CI and builds without Steam never load its
// native part. Whatever goes wrong (no app id, no library, Steam not running)
// ends in `undefined`: the desktop game without Steam.
//
// main.mjs calls these before Electron's ready event: relaunching through
// Steam has to happen before a window opens, and the Steam overlay adds
// Chromium switches that count only before ready.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Loads steamworks.js (CommonJS) at once, so it can run before Electron is ready. */
export const loadSteamworks = () => require("steamworks.js");

/** A Steam app id, or undefined for anything else ("0", "off", junk). */
function appIdFrom(raw) {
  const text = String(raw ?? "").trim();
  return /^[1-9][0-9]{0,9}$/.test(text) ? Number(text) : undefined;
}

/** The id the switch, the environment or Steam names, ahead of the built-in one. */
function givenAppId(env, argv) {
  const flag = argv.find((a) => a.startsWith("--steam-app-id="))?.slice("--steam-app-id=".length);
  return flag ?? env.PH_STEAM_APP_ID ?? env.SteamAppId;
}

/**
 * The app id: `--steam-app-id=<id>` on the command line, else
 * `PH_STEAM_APP_ID`, else the `SteamAppId` Steam sets when it starts the game,
 * else `builtIn`, the id a packaged store build carries in its package.json
 * (see `builtInAppId`). "0" or "off" turns Steam off, the built-in id too.
 * No id is in the code; Valve's test app 480 (Spacewar) is passed only by
 * `pnpm --filter @ph/desktop steam`.
 */
export function steamAppId(env = process.env, argv = process.argv, builtIn = undefined) {
  return appIdFrom(givenAppId(env, argv) ?? builtIn);
}

/**
 * The id a packaged build was made with: `steamAppId` in its package.json,
 * written there at build time by `pnpm --filter @ph/desktop dist:steam`
 * (electron-builder's `extraMetadata`). The source package.json has none.
 */
export function builtInAppId(pkg) {
  return appIdFrom(pkg?.steamAppId);
}

/**
 * The app id to relaunch through Steam with: the built-in one, when nothing
 * else names an id, which is how a store build started outside Steam (from its
 * folder or a shortcut) looks. Steam sets `SteamAppId` when it starts the game,
 * so a game Steam started never relaunches; neither does a dev run, which has
 * no built-in id.
 */
export function relaunchAppId(env = process.env, argv = process.argv, builtIn = undefined) {
  return givenAppId(env, argv) === undefined ? appIdFrom(builtIn) : undefined;
}

/** The binding out of the module, whichever way it was loaded. */
function binding(mod) {
  const lib = typeof mod?.init === "function" ? mod : mod?.default;
  if (typeof lib?.init !== "function") throw new Error("steamworks.js has no init");
  return lib;
}

/**
 * `SteamAPI_RestartAppIfNecessary`: true when Steam starts the game again
 * itself and this process must quit before it opens a window. Every failure
 * (no app id, no library, no native part) answers false, and the game goes on
 * as the desktop game.
 */
export function relaunchThroughSteam({ appId, load = loadSteamworks, log = () => {} } = {}) {
  if (appId === undefined) return false;
  try {
    const lib = binding(load());
    if (typeof lib.restartAppIfNecessary !== "function") throw new Error("steamworks.js has no restartAppIfNecessary");
    return lib.restartAppIfNecessary(appId) === true;
  } catch (e) {
    log(`Steam off: could not ask Steam whether to relaunch (${e?.message ?? e})`);
    return false;
  }
}

/** Steam sets `SteamDeck=1` for games it starts on a Steam Deck (SAVE-142). */
export function onSteamDeck(env = process.env) {
  return env.SteamDeck === "1";
}

/** A Web API ticket is cancelled this long after it was handed out; the server checks it at once. */
const TICKET_LIFE_MS = 5 * 60 * 1000;

/**
 * Starts Steamworks, or answers undefined. `load` loads the binding (a test
 * passes its own); `log` hears why Steam is off, for the console only. With
 * `overlay`, once Steam is on, the Steam overlay is turned on for Electron
 * (`electronEnableSteamOverlay`): it adds Chromium switches, which is why
 * main.mjs starts Steam before the app is ready, and it keeps every window
 * repainting so the overlay can draw over the game.
 */
export async function startSteam({ appId, load = loadSteamworks, log = () => {}, overlay = false } = {}) {
  if (appId === undefined) return undefined;
  let lib;
  try {
    lib = binding(await load());
  } catch (e) {
    log(`Steam off: steamworks.js did not load (${e?.message ?? e})`);
    return undefined;
  }
  let client;
  try {
    client = lib.init(appId);
  } catch (e) {
    log(`Steam off: Steamworks did not start; is Steam running? (${e?.message ?? e})`);
    return undefined;
  }
  if (overlay) {
    try {
      lib.electronEnableSteamOverlay();
    } catch (e) {
      log(`Steam overlay off (${e?.message ?? e})`);
    }
  }
  let name = "";
  try {
    name = String(client.localplayer.getName() ?? "");
  } catch {
    // The name is only the first display name; the server falls back to "Player".
  }
  const tickets = new Set();
  const cancel = (t) => {
    tickets.delete(t);
    try {
      t.cancel();
    } catch {
      // Already gone.
    }
  };
  return {
    appId,
    name,
    /** `GetAuthTicketForWebApi(identity)`, as the hex the server's `steamTicket` takes. */
    async webTicket(identity) {
      if (typeof identity !== "string" || !/^[A-Za-z0-9_.-]{1,64}$/.test(identity)) throw new Error("bad ticket identity");
      const ticket = await client.auth.getAuthTicketForWebApi(identity);
      tickets.add(ticket);
      setTimeout(() => cancel(ticket), TICKET_LIFE_MS).unref?.();
      return Buffer.from(ticket.getBytes()).toString("hex");
    },
    /** Cancels every ticket still out, on quit. */
    close() {
      for (const t of [...tickets]) cancel(t);
    },
  };
}
