// The living realm as Castile (milestone 3): a province's People tab, on a small and a large phone held sideways (the game plays in landscape).
// Usage: pnpm build && node scripts/living-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4177/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__phSelect("p1601"));
  await page.waitForTimeout(200);
  await shot("overview");
  await page.click("[data-tab=people]");
  await page.waitForTimeout(200);
  await shot("people");
  await page.click(".hud .realm");
  await page.waitForTimeout(300);
  await page.click("[data-realm-tab=lords]");
  await page.waitForTimeout(200);
  await shot("lords");
  await page.click("[data-realm-tab=provinces]");
  await page.waitForTimeout(200);
  await shot("provinces");
  await page.close();
}
await browser.close();
server.httpServer.close();
