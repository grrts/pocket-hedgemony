// Calls levies at France's capital, lets them gather, picks them up and trains, on a phone in landscape
// (and a smaller one), and shows the portrait screen. Usage: pnpm build && node scripts/levy-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [tag, device] of [["pixel", devices["Pixel 7 landscape"]], ["se", devices["iPhone SE landscape"]]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const endTurn = async () => {
    const t = await page.evaluate(() => window.__phTurn());
    await page.click(".end-turn");
    await page.waitForFunction((n) => window.__phTurn() > n, t, { timeout: 30000 });
    await page.waitForTimeout(200);
  };
  const shot = (name) => page.screenshot({ path: `${out}/${tag}-${name}.png` });
  const garrison = async (id) => {
    await page.evaluate((p) => window.__phSelect(p), id);
    await page.waitForTimeout(200);
    // On a phone the card waits behind its button.
    if (!(await page.isVisible("[data-tab=garrison]"))) await page.click("#reopen");
    await page.waitForTimeout(200);
    await page.click("[data-tab=garrison]");
    await page.waitForTimeout(200);
  };
  await page.goto("http://localhost:4179/");
  await page.waitForSelector(".map-layer", { timeout: 30000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForTimeout(500);
  await page.click("text=Stop hints").catch(() => {});
  await garrison("p1063");
  for (let i = 0; i < 3; i++) {
    await page.click("[data-recruit]");
    await page.waitForTimeout(300);
  }
  await shot("1-queue");
  await page.click(".panel .close").catch(() => {});
  for (let i = 0; i < 4; i++) await endTurn();
  await garrison("p1063");
  await shot("2-gathered");
  await page.evaluate(() => document.querySelector(".panel .garrison h3:last-of-type")?.scrollIntoView());
  await page.waitForTimeout(200);
  await shot("2b-troops");
  await page.click("[data-pickup][data-men]");
  await page.waitForTimeout(300);
  await shot("3-picked-1000");
  await page.click("[data-pickup]");
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__phSelect("p1063"));
  await page.waitForTimeout(200);
  if (!(await page.isVisible("[data-command]"))) await page.click("#reopen");
  await page.waitForTimeout(200);
  await page.click("[data-command]");
  await page.waitForTimeout(300);
  await page.click("[data-train-more]").catch(() => console.log("no stepper"));
  await page.waitForTimeout(200);
  await shot("4-commander");
  const tall = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll(".panel button")) {
      const r = b.getBoundingClientRect();
      if (r.width && r.height < 43.5) out.push(`${b.textContent.trim().slice(0, 30)} ${Math.round(r.height)}`);
    }
    return out;
  });
  console.log(tag, "buttons under 44px:", tall.join(" | ") || "none");
  await page.close();
}
const portrait = await browser.newPage({ ...devices["Pixel 7"] });
await portrait.goto("http://localhost:4179/");
await portrait.waitForTimeout(3000);
await portrait.screenshot({ path: `${out}/portrait.png` });
await browser.close();
server.httpServer.close();
