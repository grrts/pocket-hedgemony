// The Chronicle (EVT-112) and another realm's Aims fold (EVT-113), on a small and a large phone held sideways, a
// phone held upright, a tablet held upright and a desktop window. The 1444 start has no goals, so ?goals= gives a
// few realms goals of their own to show who is heading toward each turning point.
// Usage: pnpm build && node scripts/chronicle-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const take = (name, at) => ({ kind: "take", places: [{ name, at }] });
const goals = [
  { realm: "ottomans", goal: "Take Constantinople", reason: "The city sits between the sultan's two halves", ends_when: "Holds Constantinople", window: [1444, 1460], weight: "strong", deviation: "Turn on Hungary first", aim: take("Constantinople", [28.98, 41.01]), toward: ["fall_of_constantinople"] },
  { realm: "france", goal: "Drive the English from Gascony", reason: "The last English land in the south", ends_when: "Holds Bordeaux", window: [1449, 1453], weight: "strong", deviation: "", aim: take("Bordeaux", [-0.58, 44.84]), toward: ["battle_of_castillon"] },
  { realm: "castile", goal: "Unite with Aragon by marriage", reason: "Two crowns against Granada and France", ends_when: "Allied with Aragon", window: [1460, 1479], weight: "normal", deviation: "", aim: { kind: "ally", target: "aragon" }, toward: ["marriage_of_ferdinand_and_isabella", "fall_of_granada"] },
  { realm: "castile", goal: "Take Granada", reason: "The last Muslim realm in Iberia", ends_when: "Holds Granada", window: [1482, 1492], weight: "strong", deviation: "", aim: take("Granada", [-3.6, 37.18]), toward: ["fall_of_granada"] },
  { realm: "aragon", goal: "Unite with Castile by marriage", reason: "A strong ally against France", ends_when: "Allied with Castile", window: [1460, 1479], weight: "normal", deviation: "", aim: { kind: "ally", target: "castile" }, toward: ["marriage_of_ferdinand_and_isabella"] },
];
const url = `http://localhost:4183/?goals=${encodeURIComponent(JSON.stringify(goals))}`;
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tablet", devices["iPad Mini landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto(url);
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  for (const d of await page.locator(".alert .dismiss").all()) await d.click().catch(() => {});
  await page.click("[data-hint=stop]").catch(() => {});
  await page.click(".hud [data-news]");
  await page.waitForTimeout(300);
  await page.click("[data-news-history]");
  await page.waitForTimeout(300);
  await shot("history");
  // The seed's shake may drop a goal, so open the first turning point someone is heading toward.
  const row = page.locator("details.chron-row summary").first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(300);
  await shot("history-open");
  await page.locator(".chronicle > details:last-child, .chronicle h3:last-of-type").last().scrollIntoViewIfNeeded();
  await shot("history-foot");
  // Another realm's card: its Aims fold on the General tab.
  await page.locator("details.chron-row[open] [data-realm]").first().click();
  await page.waitForTimeout(300);
  const aims = page.locator("details[data-page-fold^='aims:'] summary");
  await aims.scrollIntoViewIfNeeded();
  await aims.click();
  await page.waitForTimeout(300);
  await shot("aims");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll(".chron-row summary, div.chron-row, .aims li, details[data-page-fold] summary, [data-news-history]")]
      .filter((e) => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 44)
      .map((e) => e.textContent?.slice(0, 40)),
  );
  console.log(name, "targets under 44:", small.length ? small : "none");
  await page.close();
}
await browser.close();
server.httpServer.close();
