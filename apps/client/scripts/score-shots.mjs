// Campaign end and score (SHELL-162 to SHELL-164): the Score line and tab on the country card, and the end card when the end date comes (?end= brings it near), on a small and a large phone held sideways, a phone held upright and a desktop window.
// Usage: pnpm build && node scripts/score-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4181/?end=1444-11-14");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  for (const d of await page.locator(".alert .dismiss").all()) await d.click();
  await page.click(".hud .realm[data-realm]");
  await page.waitForTimeout(300);
  await page.locator(".score-line").scrollIntoViewIfNeeded();
  await shot("general");
  await page.click(".score-line button");
  await page.waitForTimeout(300);
  await shot("score-tab");
  await page.locator(".score-ledger").scrollIntoViewIfNeeded();
  await shot("score-ledger");
  await page.click(".panel .close");
  await page.click("#fab");
  await page.waitForSelector(".end-card", { timeout: 60000 });
  await page.waitForTimeout(500);
  await shot("end-card");
  await page.locator(".end-choices").scrollIntoViewIfNeeded();
  await shot("end-choices");
  await page.click("[data-end=look]");
  await page.waitForTimeout(300);
  await shot("look-at-map");
  await page.click("#fab");
  await page.waitForTimeout(300);
  await shot("reopened");
  await page.close();
}
await browser.close();
server.httpServer.close();
