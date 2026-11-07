// Claims (DIPL-262 to DIPL-264) as Castile: Portugal's Claims section before and while forging, with claims held,
// the declare sheet's aim choices and the no-aim way out, and Castile's own Your claims; on a small and a large phone
// held sideways and a desktop (upright, the game asks to turn the phone).
// Usage: pnpm build && node scripts/claims-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4184, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"], ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
const open = (page, id) =>
  page.evaluate((id) => {
    const b = document.createElement("button");
    b.dataset.realm = String(id === "me" ? window.__phSnapshot?.()?.playerNation ?? window.__phNation("castile") : window.__phNation(id));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  }, id);
const toClaims = (page) => page.evaluate(() => document.querySelector("#claims")?.scrollIntoView({ block: "start" }));
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = async (what) => {
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${name}-${what}.png` });
  };
  await page.goto("http://localhost:4184/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  await open(page, "portugal");
  await page.waitForTimeout(300);
  await toClaims(page);
  await shot("claims-none");
  const ids = await page.evaluate(() => [...document.querySelectorAll("#claims [data-forge]")].map((b) => window.__phProvinceId(Number(b.dataset.forge))));
  // Small tap targets anywhere in the section.
  const small = await page.evaluate(() => [...document.querySelectorAll("#claims button")].filter((b) => b.getBoundingClientRect().height < 44).length);
  if (small) console.log(`${name}: ${small} claim buttons under 44 px`);
  // The declare sheet with no aim: the way out.
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector("[data-forge-goto]")?.scrollIntoView({ block: "center" }));
  await shot("declare-no-aim");
  await page.evaluate(() => document.querySelector("[data-forge-goto]").click());
  await page.waitForTimeout(300);
  await shot("forge-goto");
  await page.click("[data-forge]");
  await page.waitForTimeout(500);
  await toClaims(page);
  await shot("forging");
  // Claims held, and more than one aim on the declare sheet.
  const ps = ids.length;
  await page.evaluate((ids) => {
    window.__phClaims("portugal", [[ids[0], "our claim", "1466-05"], [ids[1] ?? ids[0], "held within 50 years"]], [["take_land", ids[0], "our claim"], ["take_land", ids[1] ?? ids[0], "held within 50 years"], ["punish", undefined, "insulted_us"]]);
  }, ids);
  await toClaims(page);
  await shot("claims-held");
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector(".aim-choices")?.scrollIntoView({ block: "center" }));
  await shot("declare-aims");
  await page.evaluate(() => document.querySelector("[data-declare-aim=\"2\"]").click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector(".aim-choices")?.scrollIntoView({ block: "center" }));
  await shot("declare-aim-picked");
  const smallAims = await page.evaluate(() => [...document.querySelectorAll(".aim-choice")].filter((b) => b.getBoundingClientRect().height < 44).length);
  if (smallAims) console.log(`${name}: ${smallAims} aim rows under 44 px`);
  console.log(name, "confirm:", await page.textContent("[data-declare-confirm]"), ps);
  await page.click("[data-declare-back]");
  await open(page, "castile");
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll("#panel h3")].find((h) => h.textContent === "Your claims")?.scrollIntoView({ block: "start" }));
  await shot("own");
  await page.close();
}
await browser.close();
server.httpServer.close();
