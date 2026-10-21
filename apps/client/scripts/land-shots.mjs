// The Land tab of a province as Castile, a tile tapped, a woods tile being cleared, and the Short of food view, on a small and a large phone held sideways (feedback 80, 81, 86, 87).
// Usage: pnpm build && node scripts/land-shots.mjs <outDir>
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
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.waitForTimeout(300);
  await page.click("[data-tab=land]");
  await page.waitForTimeout(300);
  await shot("land");
  const tiles = await page.$$eval("[data-land-tile]", (bs) => bs.map((b) => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]));
  console.log(name, "tiles:", tiles.length, "smallest:", Math.min(...tiles.map((t) => Math.min(...t))));
  await page.click("[data-land-tile='1']");
  await page.waitForTimeout(300);
  await shot("land-tile");
  console.log(name, "build in sheet:", (await page.$$(".land-sheet [data-build]")).length);
  // A woods tile: the game, the lodge and lumber camp, and its changes; clear it.
  const woods = await page.$(".land-tile.use-woods");
  if (woods) {
    await woods.click();
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector(".land-sheet")?.scrollIntoView({ block: "end" }));
    await shot("land-woods");
    const change = await page.$("[data-change-tile]");
    console.log(name, "changes offered:", (await page.$$("[data-change-tile]")).length, "heights:", await page.$$eval("[data-change-tile]", (bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height))));
    if (change) {
      await change.click();
      await page.waitForTimeout(800);
      await page.click(".land-tile.use-woods:last-of-type").catch(() => {});
      await page.waitForTimeout(300);
      await page.evaluate(() => document.querySelector(".land-sheet")?.scrollIntoView({ block: "end" }));
      await shot("land-changing");
      console.log(name, "stop button:", (await page.$$("[data-stop-change]")).length);
    }
  }
  // The realm's Provinces list, Short of food.
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation("castile"));
    document.body.append(b);
    b.click();
    b.remove();
  });
  await page.waitForTimeout(300);
  await page.click("#panel [data-realm-section=Lands]").catch(() => {});
  await page.click("[data-realm-tab=provinces], [data-tab=provinces]").catch((e) => console.log("no provinces tab", e.message));
  await page.waitForTimeout(300);
  await page.click("[data-province-sort=short]").catch((e) => console.log("no short sort", e.message));
  await page.waitForTimeout(300);
  await shot("short-of-food");
  console.log(name, "short rows:", (await page.$$("[data-open-land]")).length);
  await page.close();
}
await browser.close();
server.httpServer.close();
