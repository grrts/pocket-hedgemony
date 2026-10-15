// Screenshots the build at a few zoom levels, for reviewing the art.
// Usage: pnpm build && node scripts/shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4174, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7"] });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4174/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/1-start.png` });
await page.click("[data-nation=FRA]");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/2-france.png` });
await page.goto("http://localhost:4174/style.html");
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/3-style.png`, fullPage: true });
await browser.close();
server.httpServer.close();
