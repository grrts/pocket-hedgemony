// The Achievements card and the unlock toast as France, on a small and a large phone held sideways and upright (ACH-080).
// Upright the game asks to be turned sideways (SHELL rules), so those shots show the notice.
// Usage: pnpm build && node scripts/achievement-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const phones = [
  ["small", devices["iPhone SE landscape"]],
  ["landscape", devices["Pixel 7 landscape"]],
  ["portrait", devices["Pixel 7"]],
  ["small-portrait", devices["iPhone SE"]],
];
for (const [name, device] of phones) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4178/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  if (name.includes("portrait")) {
    // The game plays in landscape: upright, the rotate notice covers everything, the card included.
    await page.waitForTimeout(500);
    await shot("rotate");
    console.log(name, "rotate notice shown", await page.$eval(".rotate", (e) => getComputedStyle(e).display !== "none"));
    await page.close();
    continue;
  }
  await page.waitForSelector("[data-ach-open]", { timeout: 60000 });
  await page.tap("[data-ach-open]");
  await page.waitForTimeout(300);
  await shot("card-before");
  await page.tap(".close");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.tap("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.tap("#fab");
  await page.waitForSelector("#ach-toast:not([hidden])", { timeout: 60000 });
  await page.waitForTimeout(300);
  await shot("toast");
  const toast = await page.$eval("#ach-toast", (e) => ({ text: e.textContent, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }));
  console.log(name, "toast", JSON.stringify(toast));
  // The toast may have gone after its 3 seconds while the shot was taken; its tap opens the card at the unlock.
  await page.evaluate(() => document.querySelector("#ach-toast").click());
  await page.waitForTimeout(400);
  await shot("card-at-unlock");
  // Every tap target on the card is at least 44 points (ACH-080).
  const small = await page.$$eval("#panel button", (bs) => bs.filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44)).map((b) => b.className + ":" + Math.round(b.getBoundingClientRect().width) + "x" + Math.round(b.getBoundingClientRect().height)));
  console.log(name, "small targets", JSON.stringify(small));
  await page.tap("[data-ach-filter=reach]");
  await page.waitForTimeout(200);
  await page.tap("[data-ach=first_year]");
  await page.waitForTimeout(200);
  await shot("card-reach");
  const stored = await page.evaluate(() => localStorage.getItem("ph.profile.default.achievements"));
  console.log(name, "stored", stored?.slice(0, 120));
  // A ladder at level 3 of 5, from a profile that has brought in 140 province harvests (ACH-086).
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("ph.profile.default.achievements"));
    Object.assign(p.unlocked, { first_harvest: "1445-09-01", harvests_10: "1445-09-01", harvests_100: "1452-09-01" });
    p.totals = { provinces_harvested: 140 };
    localStorage.setItem("ph.profile.default.achievements", JSON.stringify(p));
  });
  await page.reload();
  await page.waitForSelector("[data-ach-open]", { timeout: 60000 });
  await page.tap("[data-ach-open]");
  await page.waitForTimeout(300);
  // The first-campaign hint would cover the card in these shots.
  await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
  await page.$eval("[data-ach=first_harvest]", (e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  await shot("ladder-grid");
  await page.tap("[data-ach=first_harvest]");
  await page.waitForTimeout(300);
  await page.$eval("#ach-detail", (e) => e.scrollIntoView({ block: "start" }));
  await shot("ladder");
  console.log(name, "ladder", await page.$eval("#ach-detail", (e) => e.innerText.replace(/\s+/g, " ")));
  await page.close();
}
await browser.close();
server.httpServer.close();
