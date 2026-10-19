// Sending an assassin after a lord (REALM-284) as France: the lord's screen with Assassinate…, the confirm card,
// and the lords after the deed; on a small and a large phone held sideways, a phone upright and a desktop.
// Usage: pnpm build && node scripts/assassin-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4181/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  // Held upright the game asks to be turned sideways; that screen is the whole of it.
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  for (const d of await page.locator(".alert .dismiss").all()) await d.click().catch(() => {});
  await page.click("[data-hint=stop]").catch(() => {});
  // The top bar scrolls sideways on a small phone; tap the realm button wherever it sits.
  await page.evaluate(() => document.querySelector(".hud button.realm").click());
  await page.click("#panel [data-realm-section=Lands]").catch(() => {});
  await page.click("[data-realm-tab=lords]");
  await page.waitForTimeout(300);
  await page.click(".lord-row");
  await page.waitForTimeout(300);
  await shot("lord");
  await page.click("[data-assassin-ask]");
  await page.waitForTimeout(300);
  await page.locator(".assassin-ask").scrollIntoViewIfNeeded();
  await shot("ask");
  const box = await page.locator(".assassin-ask .confirm-row button").first().boundingBox();
  console.log(name, "send button", Math.round(box.width), "x", Math.round(box.height));
  await page.click("[data-assassinate]");
  await page.waitForTimeout(500);
  await shot("after");
  await page.click("[data-back-lords]").catch(() => {});
  await page.waitForTimeout(300);
  await shot("lords");
  await page.close();
}
await browser.close();
server.httpServer.close();
