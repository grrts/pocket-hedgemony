// A fair score and chapters (SHELL-182 to SHELL-184): after a week as France a chapter closes and its card opens by itself; then Play on, the Score tab with growth and the chapter list,
// and the card opened again from it. On a small and a large phone held sideways, a tall window and a desktop. Prints
// FAIL lines for a tap target under 44 px or a panel that scrolls sideways.
// Usage: pnpm build && node scripts/chapter-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4186, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const check = (page, name, what) =>
  page
    .evaluate(() => {
      const box = document.querySelector("#panel");
      if (!box || box.hidden) return { panel: "hidden" };
      const small = [...box.querySelectorAll("button:not(.tab):not(header button)")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: box.scrollWidth > box.clientWidth + 1 };
    })
    .then((x) => {
      if (x.small?.length || x.sideways) console.log(`FAIL ${name} ${what}`, JSON.stringify(x));
      else console.log(name, what, "ok");
    });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4186/");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.locator(".hint-note button:has-text('Stop hints')").click().catch(() => {});
  // A week played, then a chapter closes as if it were January of its last year (__phPretendChapter; ?chapter=1 does it for real, slowly).
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await page.click("#fab");
  await page.waitForFunction(() => !document.querySelector("#fab.playing"), null, { timeout: 300000 });
  await page.evaluate(() => window.__phPretendChapter());
  await page.waitForTimeout(300);
  if (!(await page.$(".chapter-card"))) console.log(`FAIL ${name}: no chapter card`);
  await page.waitForFunction(() => !document.querySelector("#fab.playing"), null, { timeout: 60000 }).catch(() => {});
  await shot("chapter-card");
  await check(page, name, "chapter card");
  await page.locator(".chapter-card .end-choices").scrollIntoViewIfNeeded();
  await shot("chapter-choices");
  await page.click("[data-chapter-close=score]");
  await page.waitForTimeout(300);
  await shot("score-tab");
  await check(page, name, "score tab");
  await page.locator(".chapter-list").scrollIntoViewIfNeeded();
  await shot("chapter-list");
  await page.click(".chapter-list [data-chapter]");
  await page.waitForTimeout(300);
  await page.click("[data-chapter-close=play]");
  await page.waitForTimeout(300);
  await shot("played-on");
  await page.close();
}
await browser.close();
server.httpServer.close();
