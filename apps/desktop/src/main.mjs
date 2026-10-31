// Electron shell for the web client build (apps/client/dist).
//
// The client is served from a custom app:// protocol rather than file://.
// The engine worker runs under both (checked on Electron 44), but file:// is
// an opaque origin: fetch() of data files is blocked and storage isn't tied to
// a stable origin. A "standard" + "secure" scheme behaves like an https site,
// and lets us add COOP/COEP headers later if desktop wants SharedArrayBuffer.
//
// Saves are files in `<userData>/saves` (domain/saves SAVE-144), the folder
// Steam Auto-Cloud syncs (SAVE-145); the device token is kept with safeStorage
// (SAVE-143); and in the Steam build Steamworks gives the Web API ticket the
// game signs in with (SAVE-140, SAVE-141). The game reaches all three through
// preload.cjs. Without Steam everything but the ticket works the same.
//
// Packaged (electron-builder, docs/steam.md "Packaging") the client build is
// in `<resources>/client`, and a store build carries its Steam app id in its
// package.json: started outside Steam, it relaunches through Steam.
import { app, BrowserWindow, ipcMain, net, protocol, safeStorage } from "electron";
import { readFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { saveFolder } from "./saves.mjs";
import { secretFile } from "./secret.mjs";
import { builtInAppId, onSteamDeck, relaunchAppId, relaunchThroughSteam, startSteam, steamAppId } from "./steam.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = normalize(
  process.env.PH_CLIENT_DIST ?? (app.isPackaged ? join(process.resourcesPath, "client") : join(here, "../../client/dist")),
);
const smoke = process.env.PH_SMOKE === "1";
const GAME_ORIGIN = "app://game";
const log = (line) => console.log(line);

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// Only a packaged build has a built-in app id, so `pnpm desktop` and
// `pnpm --filter @ph/desktop steam` never relaunch.
const builtIn = app.isPackaged ? packagedAppId() : undefined;

if (relaunchThroughSteam({ appId: relaunchAppId(process.env, process.argv, builtIn), log })) {
  log("Steam is starting the game itself; this copy quits");
  app.exit(0);
} else {
  // Awaited at the top level, so Electron holds its ready event until
  // Steamworks has started and the overlay's switches are in.
  const steam = await startSteam({ appId: steamAppId(process.env, process.argv, builtIn), log, overlay: true });
  if (steam) log(`Steam on: app ${steam.appId}`);
  app.on("will-quit", () => steam?.close());
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(() => openGame(steam));
}

/** The Steam app id the packaged build was made with (`dist:steam`), if any. */
function packagedAppId() {
  try {
    return builtInAppId(JSON.parse(readFileSync(join(app.getAppPath(), "package.json"), "utf8")));
  } catch {
    return undefined;
  }
}

async function openGame(steam) {
  const userData = app.getPath("userData");
  bridge({
    steam,
    saves: saveFolder(join(userData, "saves")),
    secret: secretFile(join(userData, "device-token.bin"), safeStorage),
  });

  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = normalize(join(distDir, decodeURIComponent(pathname)));
    if (file !== distDir && !file.startsWith(distDir + sep)) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(file).toString());
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: !smoke,
    backgroundColor: "#1a1c2c",
    webPreferences: { contextIsolation: true, sandbox: true, preload: join(here, "preload.cjs") },
  });
  await win.loadURL(`${GAME_ORIGIN}/index.html`);

  if (smoke) await runSmokeTest(win);
}

/** The calls preload.cjs makes, answered only for the game's own pages. */
function bridge({ steam, saves, secret }) {
  const ours = (event) => (event.senderFrame?.url ?? "").startsWith(`${GAME_ORIGIN}/`);
  const handle = (channel, fn) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (!ours(event)) throw new Error("not the game");
      return fn(...args);
    });
  const answer = (channel, fn) =>
    ipcMain.on(channel, (event, ...args) => {
      event.returnValue = ours(event) ? fn(...args) : undefined;
    });

  answer("ph:info", () => ({
    steam: steam ? { name: steam.name } : null,
    steamDeck: onSteamDeck(),
    secretUsable: secret.usable(),
  }));
  answer("ph:secret:get", () => secret.get());
  answer("ph:secret:set", (value) => secret.set(value));
  handle("ph:saves:list", () => saves.list());
  handle("ph:saves:read", (path) => saves.read(path));
  handle("ph:saves:commit", (path, bytes, removed) => saves.commit(path, bytes, Array.isArray(removed) ? removed : []));
  handle("ph:saves:remove", (path) => saves.remove(path));
  handle("ph:steam:ticket", (identity) => {
    if (!steam) throw new Error("steam_off");
    return steam.webTicket(identity);
  });
}

/** Waits for the client's engine self-test and exits 0 if the worker ran a turn. */
async function runSmokeTest(win) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const d = await win.webContents.executeJavaScript("globalThis.__phDiagnostics ?? null");
    if (d && (d.engineRoundTripMs !== null || d.engineError !== null)) {
      const bridged = await win.webContents.executeJavaScript("typeof globalThis.phDesktop?.saves?.list === 'function'");
      console.log(JSON.stringify({ ...d, desktopBridge: bridged }));
      app.exit(d.engineError === null && bridged ? 0 : 1);
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.error("smoke test timed out waiting for the engine worker");
  app.exit(1);
}
