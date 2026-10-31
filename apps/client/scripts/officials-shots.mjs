// Officials (feedback 66, 69) as France: the Officials tab, an official's screen with provinces to move him to, after a
// swap, an empty post's screen with officials to move in and types to hire (PROV-336), a foreign specialist hired,
// and a province's governance card; on a small and a large phone held sideways and a desktop window.
// Usage: pnpm build && node scripts/officials-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4180, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4180/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click(".hud button.realm");
  await page.click("#panel [data-realm-section=Lands]").catch(() => {});
  await page.click("[data-realm-tab=officials]");
  await page.waitForTimeout(300);
  await shot("officials");
  await page.click(".lord-row[data-official]");
  await page.waitForTimeout(300);
  await shot("official");
  await page.locator(".place-list").scrollIntoViewIfNeeded();
  await shot("official-moves");
  await page.click("[data-swap]");
  await page.waitForTimeout(500);
  await shot("official-moved");
  await page.evaluate(() => document.querySelector("[data-back]").click());
  await page.waitForTimeout(300);
  const empty = page.locator(".post-buttons [data-official]").first();
  if (await empty.count()) {
    await empty.click({ force: true });
    await page.waitForTimeout(300);
    await shot("post");
    await page.locator(".hire-list").scrollIntoViewIfNeeded();
    await shot("post-hire");
    await page.locator(".hire-row [data-hire-foreign='1']:not([disabled])").first().click({ force: true });
    await page.waitForTimeout(500);
    await shot("post-hired");
  } else console.log("no empty post");
  await page.evaluate(() => window.__phSelect("p1066"));
  await page.waitForTimeout(400);
  await shot("province");
  await page.close();
}
await browser.close();
server.httpServer.close();
