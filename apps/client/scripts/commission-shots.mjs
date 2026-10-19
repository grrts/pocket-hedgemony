// General or admiral (RECR-128, RECR-131..134) as France: an official's Command section with both commissions and
// their skills, the Navy tab after commissioning an admiral, and the Military tab's Commanders list; on a small and a
// large phone held sideways and a desktop window.
// Usage: pnpm build && node scripts/commission-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4181/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  // Hints over the panel would hide the buttons.
  await page.getByRole("button", { name: "Stop hints" }).click().catch(() => {});
  await page.waitForTimeout(200);
  await page.click(".hud button.realm");
  await page.click("[data-realm-tab=officials]");
  await page.waitForTimeout(300);
  await page.locator(".lord-row[data-official]").nth(1).click();
  await page.waitForTimeout(300);
  await page.locator("button.commission").first().scrollIntoViewIfNeeded();
  await shot("command");
  const sizes = await page.$$eval("button.commission", (bs) => bs.map((b) => `${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`));
  console.log(name, "commission buttons", sizes.join(" "));
  await page.click("button.commission[data-commission-sea]");
  await page.waitForTimeout(500);
  await shot("navy-tab");
  await page.click("[data-realm-tab=military]").catch(() => console.log("no military tab button"));
  await page.waitForTimeout(300);
  await page.locator("h3.sub", { hasText: "Commanders" }).first().scrollIntoViewIfNeeded().catch(() => {});
  await shot("commanders");
  await page.close();
}
await browser.close();
server.httpServer.close();
