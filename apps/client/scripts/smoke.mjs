// Loads the production build in headless Chromium (the engine behind Android's
// WebView and Electron) as a phone, and checks the engine starts in each mode:
//   1. normal: module worker
//   2. worker script blocked: falls back to the main thread
// Usage: pnpm build && pnpm smoke
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const server = await preview({ preview: { port: 4173, strictPort: true } });
const base = "http://localhost:4173/";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;

async function check(name, expectedMode, setup) {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await setup?.(page);
  await page.goto(base);
  const d = await page.waitForFunction(
    () => {
      const d = globalThis.__phDiagnostics;
      return d && (d.engineRoundTripMs !== null || d.engineError !== null) ? d : null;
    },
    null,
    { timeout: 15000 },
  ).then((h) => h.jsonValue());
  // Play one turn through the real UI too.
  await page.click("[data-nation=france]");
  await page.click("#fab");
  await page.click(".actions .end-turn");
  await page.waitForSelector(".turn-label:text('April 1444')");
  const ok = d.engineError === null && d.engineMode === expectedMode;
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(d)}`);
  await context.close();
}

try {
  await check("module worker", "worker");
  await check("worker blocked", "main-thread", (page) =>
    page.route("**/engine.worker-*.js", (route) => route.fulfill({ status: 404 })),
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
