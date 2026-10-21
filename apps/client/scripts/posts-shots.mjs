// Officials with fewer taps (PROV-342 to PROV-351) as France: the Officials tab with the Auto-fill posts switch and
// Fill all, an empty post's screen with its best fit first, an official's screen with Replace and Dismiss (asking once
// more in place); on a small and a large phone held sideways, a tall window and a desktop window.
// Usage: pnpm build && node scripts/posts-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  // Every button in the panel at least 44 points tall, and nothing wider than the panel (PROV-351).
  const shot = async (what) => {
    await page.screenshot({ path: `${out}/${name}-${what}.png` });
    const r = await page.evaluate(() => {
      const root = document.querySelector("#panel");
      const small = [...root.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: root.scrollWidth > root.clientWidth + 1 };
    });
    if (r.small.length || r.sideways) console.log(name, what, JSON.stringify(r));
  };
  const panelTo = (sel) => page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center" }), sel);
  await page.goto("http://localhost:4181/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);
  const stop = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stop.count()) await stop.first().click();
  // The alerts over the panel would cover the shots.
  await page.evaluate(() => document.querySelector("#alerts")?.remove());
  await page.locator(".hud [data-realm]:visible").first().click();
  for (const sec of ["Realm", "Lands"]) {
    if (await page.locator("[data-realm-tab=officials]").isVisible().catch(() => false)) break;
    await page.click(`#panel [data-realm-section=${sec}]`, { timeout: 3000 }).catch(() => {});
  }
  await page.click("[data-realm-tab=officials]", { timeout: 5000 }).catch(async (e) => {
    await page.screenshot({ path: `${out}/${name}-debug.png` });
    console.log(await page.evaluate(() => [...document.querySelectorAll("[data-realm-tab],[data-realm-section]")].map((b) => b.outerHTML.slice(0, 90))));
    throw e;
  });
  await page.waitForTimeout(300);
  await shot("tab-auto-on");
  await page.click("[data-auto-fill]");
  await page.waitForTimeout(400);
  await shot("tab-auto-off");
  // An official's screen: Replace with the best fit, and Dismiss asking once more.
  await page.click(".lord-row[data-official]");
  await page.waitForTimeout(300);
  await panelTo("#panel h3.sub:nth-of-type(2)");
  await shot("official-replace");
  await page.click("[data-dismiss]");
  await page.waitForTimeout(200);
  await shot("official-dismiss-ask");
  await page.click("[data-dismiss]");
  await page.waitForTimeout(500);
  await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
  await shot("post-best-fit");
  await page.evaluate(() => document.querySelector("[data-back]").click());
  await page.waitForTimeout(300);
  await panelTo("[data-fill-posts]");
  await shot("tab-fill-all");
  await page.click("[data-fill-posts]").catch(() => console.log("no Fill all"));
  await page.waitForTimeout(500);
  await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
  await shot("tab-filled");
  await page.close();
}
await browser.close();
server.httpServer.close();
