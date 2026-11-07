// Traders carry grain (TRADE-168 to TRADE-170) as France after a few months: the Food tab's grain line and Short of food
// rows, a province's Grain by trade line, and a trader card's Grain part; on a small and a large phone held sideways, a
// phone held upright (asked to turn), a tall window and a desktop.
// Usage: pnpm build && node scripts/grain-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const turns = Number(process.env.TURNS ?? 10);
const server = await preview({ preview: { port: 4188, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const check = (page, name, what) =>
  page
    .evaluate(() => {
      const box = document.querySelector("#panel");
      if (!box || box.hidden) return null;
      const small = [...box.querySelectorAll("button:not(.tab):not(header button)")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: box.scrollWidth > box.clientWidth + 1 };
    })
    .then((x) => console.log(name, what, JSON.stringify(x)));
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 90000 });
  await page.goto("http://localhost:4188/");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  while ((await page.evaluate(() => window.__phTurn())) < turns) {
    const t = await page.evaluate(() => window.__phTurn());
    await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
    // An event card holds the week until it is answered: take its first option.
    await page.evaluate(() => document.querySelector("#event-card:not([hidden]) [data-event-option]")?.click());
    await page.evaluate(() => document.querySelector(".end-turn")?.click());
    await page.waitForFunction((n) => window.__phTurn() > n, t, { timeout: 30000 }).catch(() => page.screenshot({ path: `${out}/${name}-stuck-${t}.png` }));
  }
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await page.waitForTimeout(500);
  // The Food tab: the grain line under the counts, and the Short of food rows.
  await page.evaluate(() => window.__phRealmTab("food"));
  await page.waitForTimeout(400);
  console.log(name, "food grain line", await page.evaluate(() => [...document.querySelectorAll("#panel p")].map((p) => p.textContent).find((t) => t.includes("traders")) ?? null));
  await shot("food");
  await check(page, name, "food tab");
  const shortList = page.locator("#panel .province-list").first();
  if (await shortList.count()) {
    await shortList.scrollIntoViewIfNeeded();
    await shot("food-short");
  }
  // A province traders sold grain to: its Grain by trade line.
  const fedId = await page.evaluate(() => window.__phGrainProvince());
  console.log(name, "province fed by traders", fedId);
  if (fedId) {
    await page.evaluate((id) => window.__phSelect(id), fedId);
    await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll("#panel dt")].find((d) => d.textContent === "Grain by trade")?.scrollIntoView({ block: "center" }));
    await shot("province");
  }
  // A trader's card: its Grain part.
  await page.evaluate(() => window.__phLookAtTrader(20));
  await page.waitForTimeout(500);
  const { width, height } = page.viewportSize();
  const box = (await page.evaluate(() => window.__phTraderBoxes())).find((b) => b.mine >= 0 && b.x > 0 && b.y > 60 && b.x + b.w < width - 120 && b.y + b.h < height - 100);
  if (box) {
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll("#panel h3")].find((h) => h.textContent === "Grain")?.scrollIntoView({ block: "start" }));
    await shot("trader");
    await check(page, name, "trader card");
    const dest = page.locator("[data-trader-dest]");
    if (await dest.count()) {
      await dest.first().click();
      await page.waitForSelector(".route-picks button", { timeout: 20000 }).catch(() => {});
      const pick = page.locator(".route-picks button").first();
      if (await pick.count()) {
        await pick.click();
        await page.waitForTimeout(800);
        console.log(name, "route grain", await page.evaluate(() => document.querySelector(".route-grain")?.textContent ?? null));
        await shot("route");
      }
      await page.click("[data-route-cancel]").catch(() => {});
    }
  } else console.log(name, "no French trader on screen to tap");
  await page.close();
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
