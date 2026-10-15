// Electron shell for the web client build (apps/client/dist).
//
// The client is served from a custom app:// protocol rather than file://.
// The engine worker runs under both (checked on Electron 44), but file:// is
// an opaque origin: fetch() of data files is blocked and storage isn't tied to
// a stable origin. A "standard" + "secure" scheme behaves like an https site,
// and lets us add COOP/COEP headers later if desktop wants SharedArrayBuffer.
import { app, BrowserWindow, net, protocol } from "electron";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = normalize(process.env.PH_CLIENT_DIST ?? join(here, "../../client/dist"));
const smoke = process.env.PH_SMOKE === "1";

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.whenReady().then(async () => {
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
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  await win.loadURL("app://game/index.html");

  if (smoke) await runSmokeTest(win);
});

app.on("window-all-closed", () => app.quit());

/** Waits for the client's engine self-test and exits 0 if the worker ran a turn. */
async function runSmokeTest(win) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const d = await win.webContents.executeJavaScript("globalThis.__phDiagnostics ?? null");
    if (d && (d.engineRoundTripMs !== null || d.engineError !== null)) {
      console.log(JSON.stringify(d));
      app.exit(d.engineError === null ? 0 : 1);
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.error("smoke test timed out waiting for the engine worker");
  app.exit(1);
}
