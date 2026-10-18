// Government (GOV-064 to GOV-066) as France: the General tab's government line, the Government tab with both caps,
// the laws and the next forms, and a reform asking once more; on a small and a large phone held sideways, a phone
// held upright (asked to turn), a tall window and a desktop.
// A horde (great_horde) also shows the riders line and the settle card (GOV-077 to GOV-079).
// Usage: pnpm build && node scripts/government-shots.mjs <outDir> [nation]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const nation = process.argv[3] ?? "france";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto(`http://localhost:4181/?feature=${nation}`);
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector(`[data-nation=${nation}]`, { timeout: 60000 });
  // A phone held upright is asked to turn sideways; the game plays in landscape.
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click(`[data-nation=${nation}]`);
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.locator("[data-realm-open-tab=government]").scrollIntoViewIfNeeded();
  await shot("general");
  await page.click("[data-realm-tab=government]");
  await page.waitForTimeout(300);
  await shot("government");
  await page.locator(".next-forms").scrollIntoViewIfNeeded();
  await shot("government-reform");
  // Small targets and sideways scrolling are what break on a phone.
  const issues = await page.evaluate(() => {
    const panel = document.querySelector(".panel");
    const small = [...panel.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    return { small, sideways: panel.scrollWidth > panel.clientWidth + 1 };
  });
  console.log(name, JSON.stringify(issues));
  await page.close();
}
await browser.close();
server.httpServer.close();
