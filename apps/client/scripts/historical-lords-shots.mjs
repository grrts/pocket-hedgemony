// Historical lords (REALM-284) as England in 1378: the Lords tab with each lord's History tag and title, and a
// lord's screen with his title, the In history line and his traits; on a small and a large phone held sideways, a
// tall window and a desktop.
// Usage: pnpm build && node scripts/historical-lords-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4185, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const check = (page, name, what, sel) =>
  page
    .evaluate((sel) => {
      const box = document.querySelector(sel);
      if (!box || box.hidden) return null;
      const small = [...box.querySelectorAll("button:not(.tab):not(header button)")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: box.scrollWidth > box.clientWidth + 1 };
    }, sel)
    .then((x) => console.log(name, what, JSON.stringify(x)));
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4185/");
  await page.waitForSelector("[data-nation=england]", { timeout: 60000 });
  await page.click("[data-nation=england]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  // On a small phone the realm button folds behind the bar's edge: press it as a tap on the pennant would.
  await page.evaluate(() => document.querySelector(".hud button.realm").click());
  await page.waitForTimeout(300);
  await page.click("#panel [data-realm-section=Lands]").catch(() => {});
  await page.click("[data-realm-tab=lords]");
  await page.waitForTimeout(300);
  await shot("lords");
  await check(page, name, "lords tab", ".panel");
  await page.click(".lord-row");
  await page.waitForTimeout(300);
  await shot("lord");
  await check(page, name, "lord screen", ".panel");
  await page.close();
}
await browser.close();
server.httpServer.close();
