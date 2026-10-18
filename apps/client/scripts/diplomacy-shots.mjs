// The diplomacy lens (DIPL-183, DIPL-184, DIPL-209) as Castile, with envoys on the road to Portugal and France and a
// war on Morocco: the lens menu with its key, the world zoom (colours only), the regional zoom (riders, dotted roads
// and swords), and a tap on Portugal opening its Diplomacy tab; on a small and a large phone held sideways, a phone
// held upright and a desktop.
// Usage: pnpm build && node scripts/diplomacy-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
// Upright, the game asks to turn the phone; this shows that screen.
{
  const page = await browser.newPage({ ...devices["Pixel 7"] });
  await page.goto("http://localhost:4179/");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/portrait.png` });
  await page.close();
}
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4179/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    await window.__phEnvoy("portugal");
    await window.__phEnvoy("aragon");
  });
  // Open Morocco's card and declare war, so it shows red and hatched.
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation("morocco"));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  });
  await page.waitForTimeout(300);
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await page.click("#panel .close");
  await page.waitForTimeout(300);
  await page.click("#mode");
  await page.click("[data-lens=diplomacy]");
  await page.waitForTimeout(600);
  await shot("menu");
  await page.click("#mode");
  await page.waitForTimeout(400);
  await shot("world");
  await page.evaluate(() => window.__phLookAtArmy(3));
  await page.waitForTimeout(800);
  await shot("regional");
  // A tap on Portugal opens its Diplomacy tab.
  const box = await page.locator("#map").boundingBox();
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.click("#panel .close");
  await page.mouse.click(box.x + box.width * 0.22, box.y + box.height * 0.62);
  await page.waitForTimeout(500);
  await shot("tap");
  await page.close();
}
await browser.close();
server.httpServer.close();
