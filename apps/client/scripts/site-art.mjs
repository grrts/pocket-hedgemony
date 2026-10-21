// Gives the website (server/) the game's own look: paints the interface art
// from src/art/ui.ts in headless Chromium and saves it as PNG files, and copies
// the game's two pixel fonts (OFL), into server/public/site/.
// Rerun after changing src/art/ui.ts or the fonts: pnpm --filter @ph/client site-art
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const client = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(client, "../../server/public/site");
const ICONS = ["coin", "swords", "hourglass", "map", "castle", "scroll", "crown", "anchor", "trophy", "hammer", "menu", "close"];

mkdirSync(join(out, "art"), { recursive: true });
mkdirSync(join(out, "fonts"), { recursive: true });

const server = await createServer({ root: client, logLevel: "error", server: { port: 5199, strictPort: true } });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:5199/style.html");
  const art = await page.evaluate(async (icons) => {
    const ui = await import("/src/art/ui.ts");
    const el = document.createElement("div");
    ui.installUiArt(el);
    const found = {};
    for (const name of el.style) found[name.replace(/^--ui-/, "")] = /url\("(.*)"\)/.exec(el.style.getPropertyValue(name))[1];
    for (const name of icons) found[`icon-${name}`] = ui.iconUrl(name, 1);
    return found;
  }, ICONS);
  for (const [name, url] of Object.entries(art)) {
    writeFileSync(join(out, "art", `${name}.png`), Buffer.from(url.split(",")[1], "base64"));
  }
  console.log(`site art: ${Object.keys(art).length} images`);
} finally {
  await browser.close();
  await server.close();
}

for (const [pkg, file] of [
  ["jersey-10", "jersey-10-latin-400-normal.woff2"],
  ["jersey-10", "jersey-10-latin-ext-400-normal.woff2"],
  ["jacquard-12", "jacquard-12-latin-400-normal.woff2"],
]) {
  copyFileSync(join(client, "node_modules/@fontsource", pkg, "files", file), join(out, "fonts", file));
}
