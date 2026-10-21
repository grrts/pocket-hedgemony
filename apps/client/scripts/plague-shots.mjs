// Stages plague in one of France's provinces and screenshots its province card, a closed province, and the
// Provinces overview's Sick list, on a small and a large phone held sideways (PROV-360 to PROV-363).
// Usage: pnpm build && node scripts/plague-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [
  ["pixel", devices["Pixel 7 landscape"]],
  ["large", { ...devices["Pixel 7 landscape"], viewport: { width: 932, height: 430 } }],
]) {
  const page = await (await browser.newContext(device)).newPage();
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4179/");
  await page.waitForSelector(".map-layer", { timeout: 30000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.click(".panel .close").catch(() => {});
  await page.click("[data-hint=stop]").catch(() => {});
  // Seine-Maritime and Somme, two of France's royal provinces.
  await page.evaluate(() => window.__phStagePlague(1062, true));
  await page.evaluate(() => window.__phStagePlague(1056));
  await page.waitForTimeout(800);
  await shot("1-map");
  await page.getByRole("button", { name: "Seine-Maritime" }).first().click().catch((e) => console.log("chip", e.message));
  await page.waitForTimeout(500);
  await shot("1-province");
  await page.evaluate(() => document.querySelector(".panel .plague-card")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await shot("2-plague-card");
  await page.click(".panel .close").catch(() => {});
  await page.click(".hud .realm");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector("#panel [data-realm-section=Lands]")?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector("[data-realm-tab=provinces]")?.click());
  await page.waitForTimeout(300);
  await shot("3-provinces");
  await page.evaluate(() => document.querySelector("[data-province-sort=sick]")?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector("[data-province-sort=sick]")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  await shot("4-sick");
  await page.click(".panel .close").catch(() => {});
}
await browser.close();
server.httpServer.close();
