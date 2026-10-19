// Screenshots the build for reviewing the art: the start screen, a few map
// spots from far to close, a turn as France, and the art test page.
// Usage: pnpm build && node scripts/shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
// Map pixel x, y and zoom (screen pixels per map pixel), passed as ?view=.
const VIEWS = {
  "2-channel": "2880,440,3",
  "3-alps": "3008,504,8",
  "4-brittany-coast": "2832,480,12",
  "5-aegean": "3360,620,6",
};
const server = await preview({ preview: { port: 4174, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
const open = async (query = "") => {
  await page.goto(`http://localhost:4174/${query}`);
  await page.waitForSelector(".map-layer", { timeout: 30000 });
  await page.waitForTimeout(900);
};
await open();
await page.screenshot({ path: `${out}/1-start.png` });
for (const [name, view] of Object.entries(VIEWS)) {
  await open(`?view=${view}`);
  await page.click(".panel .close").catch(() => {});
  await page.evaluate(() => (document.querySelector("#panel").hidden = true));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await open();
await page.click("[data-nation=france]");
await page.click(".end-turn");
await page.waitForSelector(".turn-label .day:text('18 Nov 1444')");
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/6-france.png` });
await page.goto("http://localhost:4174/style.html");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/7-art-page.png`, fullPage: true });
await browser.close();
server.httpServer.close();
