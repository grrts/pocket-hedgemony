// Dev check for the 1378 start behind ?start=1378: loads the build as a phone in
// landscape, picks a realm, plays one week, and saves a screenshot of the map.
// Usage: pnpm build && node scripts/start1378-check.mjs [realm] [outDir]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const realm = process.argv[2] ?? "ottomans";
const out = process.argv[3] ?? ".";
const server = await preview({ preview: { port: 4175, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
try {
  const context = await browser.newContext({ ...devices["Pixel 7 landscape"] });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("http://localhost:4175/?start=1378&new");
  const d = await page
    .waitForFunction(() => {
      const d = globalThis.__phDiagnostics;
      return d && (d.engineRoundTripMs !== null || d.engineError !== null) ? d : null;
    }, null, { timeout: 30000 })
    .then((h) => h.jsonValue());
  console.log("engine", JSON.stringify(d));
  await page.screenshot({ path: `${out}/1378-picker.png` });
  await page.click(`[data-nation=${realm}]`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/1378-start.png` });
  await page.click(".end-turn");
  await page.waitForSelector(".turn-label:text('27 Sep 1378')", { timeout: 60000 });
  await page.screenshot({ path: `${out}/1378-week.png` });
  console.log("PASS one week of 1378 as", realm);
} catch (e) {
  console.log("FAIL", e.message);
  process.exitCode = 1;
} finally {
  console.log("errors:", errors.slice(0, 10));
  await browser.close();
  server.httpServer.close();
}
