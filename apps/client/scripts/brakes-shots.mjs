// Brakes on big realms (X-29) as Lithuania in 1378: a far province's card (To capital, the Tax line's cut), the Days to
// capital lens and the Stability section with what the step costs; on a small and a large phone held sideways, a
// tall window and a desktop.
// Usage: pnpm build && node scripts/brakes-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4186, strictPort: true } });
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
  await page.goto("http://localhost:4186/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  if (await page.isVisible("[data-hint=stop]")) await page.click("[data-hint=stop]");
  // A Lithuanian province's card offers to rule Lithuania.
  await page.waitForFunction(() => window.__phSelect, null, { timeout: 60000 });
  await page.evaluate(() => window.__phSelect("p613"));
  await page.waitForTimeout(600);
  if (await page.locator("#reopen:visible").count()) await page.click("#reopen");
  await page.locator("button.play[data-nation=lithuania]").click();
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await page.evaluate(() => window.__phOpenProvince("p613"));
  await page.waitForTimeout(500);
  if (await page.locator("#reopen:visible").count()) await page.click("#reopen");
  await page.waitForTimeout(300);
  await page.locator(".panel dt", { hasText: "To capital" }).scrollIntoViewIfNeeded().catch(() => console.log(name, "no To capital line"));
  await shot("province");
  await check(page, name, "province", ".panel");
  await page.click(".panel button.close").catch(() => {});
  await page.click("#mode");
  await page.click("[data-lens=throne]");
  await page.waitForTimeout(600);
  await shot("lens-throne");
  await page.click("#mode").catch(() => {});
  await page.evaluate(() => document.querySelector(".hud button.realm").click());
  await page.waitForTimeout(300);
  await page.click("[data-realm-tab=general]").catch(() => {});
  await page.waitForTimeout(300);
  await page.locator(".pillars").scrollIntoViewIfNeeded().catch(() => {});
  await shot("stability");
  await check(page, name, "stability", ".panel");
  await page.close();
}
await browser.close();
server.httpServer.close();
