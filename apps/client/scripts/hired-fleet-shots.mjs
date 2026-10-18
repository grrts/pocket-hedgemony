// Hired fleets and starting navies as France (naval spec, F-115): the Navy tab with France's starting
// fleet and the Hired fleets line, the Hire a fleet screen, hiring the first fleet, and its fleet card;
// on a small and a large phone held sideways, a phone held upright (asked to turn), and a desktop.
// Usage: pnpm build && node scripts/hired-fleet-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4184, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const check = (page, name, what) =>
  page.evaluate(() => {
    const panel = document.querySelector(".panel");
    if (!panel || panel.hidden) return { panel: "hidden" };
    const small = [...panel.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    return { small, sideways: panel.scrollWidth > panel.clientWidth + 1 };
  }).then((r) => console.log(name, what, JSON.stringify(r)));

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 120000 });
  await page.goto("http://localhost:4184/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.click("[data-realm-tab=navy]");
  await page.waitForTimeout(300);
  await shot("1-navy-tab");
  await check(page, name, "navy tab");
  await page.click("[data-realm-open-tab=hireFleets]");
  await page.waitForTimeout(300);
  await shot("2-hire-a-fleet");
  await check(page, name, "hire a fleet");
  console.log(name, "offers", await page.locator("[data-hire-free], [data-hire-lent]").count());
  await page.locator("[data-hire-free]:not([disabled]), [data-hire-lent]:not([disabled])").first().click();
  await page.waitForTimeout(400);
  await shot("3-hired");
  await check(page, name, "hired");
  await page.locator(".companies [data-fleet-open]").first().click();
  await page.waitForTimeout(300);
  await shot("4-hired-fleet-card");
  await check(page, name, "hired fleet card");
  await page.close();
}
await browser.close();
server.httpServer.close();
