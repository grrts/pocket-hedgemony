// A war with no aim (F-167) as Castile in 1444: the declare sheet against Aragon (TARGET to change), its red-framed "A war with no aim"
// block with a row opened on a tap, and Confirm; on a small and a large phone held sideways (Wide), a tall window and
// a desktop. Logs any button under 44 points and any sideways scroll in the sheet.
// Usage: pnpm build && node scripts/aimless-war-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4191, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const open = (page, id) =>
  page.evaluate((id) => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation(id));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  }, id);
for (const [name, device] of [
  ["small", devices["iPhone SE landscape"]],
  ["wide", devices["Pixel 7 landscape"]],
  ["tall", { viewport: { width: 820, height: 1180 } }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto("http://localhost:4191/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
  await open(page, process.env.TARGET ?? "aragon");
  await page.waitForTimeout(300);
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await page.click(".aimless-warn details.pow-line >> nth=0").catch(() => console.log(name, "no aimless block"));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${name}-aimless-0.png` });
  const facts = await page.evaluate(() => {
    const p = document.querySelector("#panel");
    const small = [...p.querySelectorAll("button, details > summary")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    return { small, sideways: p.scrollWidth > p.clientWidth + 1, confirm: document.querySelector("[data-declare-confirm]")?.textContent.trim() };
  });
  console.log(name, JSON.stringify(facts));
  await page.evaluate(() => {
    const p = document.querySelector("#panel");
    p.scrollTop += p.clientHeight * 0.8;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${name}-aimless-1.png` });
  await page.close();
}
await browser.close();
server.httpServer.close();
