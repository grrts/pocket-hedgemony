// Tongues and faiths (CULT-080 to CULT-085, RELG-116 to RELG-118) as Castile: the General tab's Tongue and Faith
// lines, the Peoples tab with its tongues, Tongue policy and a faith's policy waiting for New Year, the capital's
// Tongue and Faith lines opened, and the Faiths lens; on a small and a large phone held sideways, a phone held
// upright (asked to turn), a tall window and a desktop.
// Usage: pnpm build && node scripts/belief-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4182, strictPort: true } });
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
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4182/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.locator("[data-realm-open-tab=peoples]").first().scrollIntoViewIfNeeded();
  await shot("general");
  await page.click("#panel [data-realm-section=Research]").catch(() => {});
  await page.click("[data-realm-tab=peoples]");
  await page.waitForTimeout(300);
  await shot("peoples");
  await check(page, name, "peoples");
  await page.click("[data-faith=jewish][data-faith-policy=restricted]");
  await page.waitForTimeout(400);
  await page.locator(".faith-rows").scrollIntoViewIfNeeded();
  await shot("peoples-faiths");
  // The capital's overview, from the General tab's Capital button.
  await page.click("#panel [data-realm-section=Realm]").catch(() => {});
  await page.click("[data-realm-tab=general]");
  await page.waitForTimeout(300);
  await page.locator(".panel button.capital").first().scrollIntoViewIfNeeded();
  await page.click(".panel button.capital");
  await page.waitForTimeout(500);
  // On a small screen the map shows the province first, its overview folded to a button.
  if (await page.locator("#reopen:visible").count()) await page.click("#reopen");
  await page.waitForTimeout(300);
  const line = page.locator("[data-belief=tongue]");
  if (await line.count()) {
    await line.scrollIntoViewIfNeeded();
    await line.click();
    await page.waitForTimeout(300);
    await shot("province-tongue");
    await page.locator("[data-belief=faith]").scrollIntoViewIfNeeded();
    await page.click("[data-belief=faith]");
    await page.waitForTimeout(300);
    await page.locator(".belief-more").scrollIntoViewIfNeeded();
    await shot("province-faith");
    await check(page, name, "province");
  } else console.log(name, "no province card under the centre");
  await page.click(".panel button.close").catch(() => {});
  await page.click("#mode");
  await page.click("[data-lens=faiths]");
  await page.waitForTimeout(600);
  await shot("lens-faiths");
  await page.click("[data-lens=tongues]");
  await page.waitForTimeout(600);
  await shot("lens-tongues");
  await page.close();
}
await browser.close();
server.httpServer.close();
