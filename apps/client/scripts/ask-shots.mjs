// Screenshots the answer card of an envoy waiting at the player's court (DIPL-212) in the real dispatches
// panel, on a phone in landscape and in a Tall (portrait) window, and measures its buttons. The card is
// rendered by the game's own askCard (dev server), since an AI ask arrives only after months of play.
// Phones play in landscape: a phone held upright is asked to turn sideways.
// Usage: node scripts/ask-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { createServer } from "vite";

const out = process.argv[2] ?? ".";
const server = await createServer({ server: { port: 4178, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

async function shoot(name, options) {
  const page = await browser.newPage(options);
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto("http://localhost:4178/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.click("[data-news]");
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const { askCard } = await import("/src/ui/statecraft.ts");
    const rb = (n) => `<button class="realm-link" data-realm="${n}"><b>${n ? "Portugal" : "Aragon"}</b></button>`;
    const html =
      askCard({ id: "a1", from: 1, action: "demand", kind: "hand_over_province", province: { province: 0, name: "Badajoz", capital: false }, until: "1445-01" }, rb) +
      askCard({ id: "a2", from: 0, action: "propose_alliance", until: "1445-01" }, rb);
    document.querySelector(".panel nav.tabs").insertAdjacentHTML("afterend", html);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}.png` });
  const sizes = await page.$$eval("[data-ask]", (bs) => bs.map((b) => `${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`).join(" "));
  const overflow = await page.evaluate(() => [...document.querySelectorAll(".call")].some((c) => c.scrollWidth > c.clientWidth + 1));
  console.log(`${name}: buttons ${sizes}, overflow ${overflow}`);
  await page.close();
}

await shoot("1-phone-landscape", { ...devices["Pixel 7 landscape"] });
await shoot("2-tall-window", { viewport: { width: 600, height: 960 } });
await browser.close();
await server.close();
