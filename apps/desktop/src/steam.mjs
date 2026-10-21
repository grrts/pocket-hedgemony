// Steamworks for the Steam build (domain/saves SAVE-140 … SAVE-142). The
// binding, steamworks.js, is an optional dependency and is imported only when
// the game has a Steam app id, so CI and builds without Steam never load its
// native part. Whatever goes wrong (no app id, no library, Steam not running)
// ends in `undefined`: the desktop game without Steam.

/**
 * The app id: `--steam-app-id=<id>` on the command line, else the build's
 * `PH_STEAM_APP_ID`, else the `SteamAppId` Steam sets when it starts the game.
 * "0" or "off" turns Steam off. No id is built in; Valve's test app 480
 * (Spacewar) is passed only by `pnpm --filter @ph/desktop steam`.
 */
export function steamAppId(env = process.env, argv = process.argv) {
  const flag = argv.find((a) => a.startsWith("--steam-app-id="))?.slice("--steam-app-id=".length);
  const raw = String(flag ?? env.PH_STEAM_APP_ID ?? env.SteamAppId ?? "").trim();
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) return undefined;
  return Number(raw);
}

/** Steam sets `SteamDeck=1` for games it starts on a Steam Deck (SAVE-142). */
export function onSteamDeck(env = process.env) {
  return env.SteamDeck === "1";
}

/** A Web API ticket is cancelled this long after it was handed out; the server checks it at once. */
const TICKET_LIFE_MS = 5 * 60 * 1000;

/**
 * Starts Steamworks, or answers undefined. `load` imports the binding (a test
 * passes its own); `log` hears why Steam is off, for the console only.
 */
export async function startSteam({ appId, load = () => import("steamworks.js"), log = () => {} } = {}) {
  if (appId === undefined) return undefined;
  let lib;
  try {
    const mod = await load();
    lib = typeof mod?.init === "function" ? mod : mod?.default;
    if (typeof lib?.init !== "function") throw new Error("steamworks.js has no init");
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
