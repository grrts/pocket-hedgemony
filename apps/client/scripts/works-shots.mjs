// The Build tab of a province and the realm's General tab as Castile, on a small and a large phone held sideways.
// Usage: pnpm build && node scripts/works-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4177/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.waitForTimeout(300);
  await page.click("[data-tab=build]");
  await page.waitForTimeout(300);
  await shot("works");
  const build = await page.$("[data-build]");
  console.log(name, "build buttons:", (await page.$$("[data-build]")).length, "rows:", (await page.$$(".work-row")).length);
  if (build) {
    await build.click();
    await page.waitForTimeout(500);
    await shot("works-building");
    const sizes = await page.$$eval(".work-row > button", (bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
    console.log(name, "button heights:", Math.min(...sizes));
  }
  // The realm's General tab.
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation("castile"));
    document.body.append(b);
    b.click();
    b.remove();
  });
  await page.waitForTimeout(300);
  await shot("realm-general");
  await page.close();
}
await browser.close();
server.httpServer.close();
