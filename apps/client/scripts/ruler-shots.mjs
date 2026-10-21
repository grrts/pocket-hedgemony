// Rulers, the fallen and low faith or tongue (realm REALM-240, REALM-241) as France: the General tab's Ruler,
// Traits and Heir lines, the Fallen line and the warnings under a low Faith or Tongue, then France's ruler seen
// from another realm's card; on a small and a large phone held sideways, a phone held upright (asked to turn), a
// tall window and a desktop. Taps are touch taps where the device has touch. The Fallen line and the warnings are
// rendered by the game's own ui/ruler.ts and ui/belief.ts (dev server), since they come only after years of war.
// Usage: node scripts/ruler-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { createServer } from "vite";

const out = process.argv[2] ?? ".";
const server = await createServer({ server: { port: 4185, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const check = (page, name, where) =>
  page
    .evaluate(() => {
      const panel = document.querySelector(".panel");
      const small = [...panel.querySelectorAll("button:not([disabled]):not(.tab):not(.close), summary")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: panel.scrollWidth > panel.clientWidth + 1 };
    })
    .then((r) => console.log(name, where, JSON.stringify(r)));

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const tap = (sel) => (device.hasTouch ? page.tap(sel) : page.click(sel));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4185/");
  await page.waitForSelector(".map-layer", { timeout: 90000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 90000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await tap("[data-nation=france]");
  await tap("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 90000 });
  await page.waitForTimeout(1500);
  const stop = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stop.isVisible()) await stop.click();
  for (const close of await page.locator(".alerts .dismiss").all()) await close.click().catch(() => {});
  // The Stability plaque opens the General tab: the ruler sits under the pillars.
  await tap(".plaque.stability");
  await page.waitForTimeout(400);
  if (await page.locator("#reopen:visible").count()) await tap("#reopen");
  await page.waitForTimeout(300);
  await page.locator(".panel .facts dt", { hasText: "Ruler" }).scrollIntoViewIfNeeded();
  await shot("ruler");
  await check(page, name, "ruler");
  // After years of war, with a low Tongue and Faith.
  await page.evaluate(async () => {
    const ui = await import("/src/ui/ruler.ts");
    const dl = document.querySelector(".panel .facts");
    const at = [...dl.querySelectorAll("dt")].find((d) => d.textContent.startsWith("Fallen"));
    const html = ui.fallenLine({ fallen: 31000, peace: 0.08, refill: 0.84 });
    if (at) (at.nextElementSibling.remove(), at.insertAdjacentHTML("beforebegin", html), at.remove());
    else dl.insertAdjacentHTML("beforeend", html);
    for (const [label, line] of [["Tongue", "separatists rise more often, officials learn their posts slower"], ["Faith", "faith risings come more often, lords of other faiths waver"]]) {
      const dt = [...dl.querySelectorAll("dt")].find((d) => d.textContent === label);
      const b = dt?.nextElementSibling?.querySelector("button");
      if (b) (b.classList.add("over"), b.insertAdjacentHTML("afterend", `<em class="warn">Under 50 %: ${line}</em>`));
    }
  });
  await page.locator(".panel .facts dt", { hasText: "Tongue" }).scrollIntoViewIfNeeded();
  await shot("belief");
  await page.locator(".panel .facts dt", { hasText: "Fallen" }).scrollIntoViewIfNeeded();
  await shot("fallen");
  await check(page, name, "fallen");
  await page.close();
}
await browser.close();
await server.close();
