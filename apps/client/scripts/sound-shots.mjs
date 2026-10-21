// The Sound menu as Castile, on a small and a large phone held sideways, and a check that music starts on the first tap.
// Usage: pnpm build && node scripts/sound-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=user-gesture-required"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4177/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.click("#sound");
  await page.waitForTimeout(300);
  console.log(name, await page.$eval(".now-playing", (e) => e.textContent));
  await shot("sound");
  await page.click("#fab");
  await page.waitForFunction(() => !document.querySelector("#fab .badge") || true);
  await page.waitForTimeout(9000);
  console.log(name, "after a turn:", await page.evaluate(() => ({ running: globalThis.__phSound.running, playing: globalThis.__phSound.nowPlaying() })));
  await page.click("#sound");
  await page.waitForTimeout(100);
  if (await page.$eval("#sound-menu", (e) => e.hidden)) await page.click("#sound");
  await page.click("[data-toggle=musicOn]");
  await page.waitForTimeout(200);
  await shot("sound-off");
  if (name === "landscape") {
    // War: the stinger, then the war music once the 45 s in a state have passed (AUD-044).
    await page.click("[data-toggle=musicOn]");
    await page.click("#sound");
    await page.evaluate(() => {
      const b = document.createElement("button");
      b.dataset.realm = String(window.__phNation("portugal"));
      b.dataset.realmOpen = "diplomacy";
      document.body.append(b);
      b.click();
      b.remove();
    });
    await page.waitForTimeout(300);
    await page.click("[data-declare]");
    await page.click("[data-declare-confirm]");
    await page.evaluate(() => window.__phMarchOn("portugal"));
    for (let t = 0; t < 8; t++) {
      await page.click("#fab");
      await page.waitForTimeout(8000);
      console.log("turn", t, JSON.stringify(await page.evaluate(() => globalThis.__phSound.nowPlaying())));
    }
  }
  await page.close();
}
await browser.close();
server.httpServer.close();
