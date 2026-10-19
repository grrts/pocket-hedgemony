// Plays an online multiplayer game against our real server (domain/multiplayer, server/src/Controller/GamesController.php):
// two accounts on two separate browsers (no shared storage), one hosts on a phone and one joins by the code on a
// tablet, three weeks are played, and the joiner comes back from Your games on a fresh browser of the same account.
// Usage:
//   cd server && php bin/console doctrine:schema:create && php -S 127.0.0.1:8077 -t public   (CORS_ALLOW_ORIGINS must list http://localhost:4174)
//   VITE_CLOUD_API=http://127.0.0.1:8077 pnpm --filter @ph/client exec vite build --outDir <dist> --emptyOutDir
//   API=http://127.0.0.1:8077 DIST=<dist> node scripts/multiplayer-server-shots.mjs <outDir>
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? "mp-server-shots";
const api = process.env.API ?? "http://127.0.0.1:8077";
mkdirSync(out, { recursive: true });
const server = await preview({ build: { outDir: process.env.DIST ?? "dist" }, preview: { port: 4174, strictPort: true } });
const base = "http://localhost:4174/?start";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const check = (ok, what) => {
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
const ready = (page) => page.waitForFunction(() => globalThis.__phDiagnostics?.engineRoundTripMs != null, null, { timeout: 120000 });
const mpState = (page) => page.evaluate(() => globalThis.__phMp());
const ready_ = async (page) => {
  for (let k = 0; k < 6; k++) {
    const opt = page.locator("#event-card:not([hidden]) [data-event-option]");
    if (!(await opt.count())) break;
    await opt.first().click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.click(".end-turn");
};

/** A new account, signed in on a new device: the tokens the game keeps in "ph.cloud-device". */
async function account(name) {
  const email = `${name.toLowerCase()}-${Date.now()}@example.com`;
  const password = "correct horse battery staple";
  const post = (path, body) => fetch(api + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
  await post("/api/accounts", { email, displayName: name, password });
  return async (device) => {
    const s = await post("/api/sessions", { email, password, device: { name: device, platform: "web" } });
    return { deviceToken: s.deviceToken, deviceId: s.deviceId, account: s.account };
  };
}

/** A browser of its own (nothing shared with the others), signed in as `tokens`, or signed out. */
async function device(name, tokens) {
  const context = await browser.newContext({ ...devices[name] });
  if (tokens) await context.addInitScript((t) => localStorage.setItem("ph.cloud-device", t), JSON.stringify(tokens));
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] page error: ${e.message}`));
  await page.goto(base);
  await ready(page);
  return page;
}

async function play() {
  // Signed out: Online asks for the account first (MP-021).
  const guest = await device("Pixel 7 landscape", null);
  await guest.click("[data-start=multiplayer]");
  await guest.waitForSelector(".mp-menu [data-settings-section=account]");
  await guest.screenshot({ path: `${out}/1-signed-out.png` });
  check(!(await guest.locator("[data-mp=host]").count()), "signed out: Online asks for sign-in, no Host a game");
  await guest.context().close();

  const leroy = await account("Leroy");
  const ana = await account("Ana");
  const a = await device("Pixel 7 landscape", await leroy("Pixel 7"));
  const b = await device("iPad Pro 11 landscape", await ana("iPad"));

  await a.click("[data-start=multiplayer]");
  await a.click("[data-mp=host]");
  await a.click("[data-nation=castile]");
  await a.waitForSelector("[data-mp-start]");
  const code = (await a.textContent(".mp-code")).trim();
  check(/^[A-HJ-NP-Z]{5}$/.test(code), `the server made the code ${code}`);

  await b.click("[data-start=multiplayer]");
  await b.waitForSelector("[data-mp-join-form] input:not([disabled])");
  await b.fill("#mp-code-input", "zzzzz");
  await b.click("[data-mp-join-form] button");
  await b.waitForSelector(".mp-menu [role=alert]");
  check((await b.textContent(".mp-menu [role=alert]")).includes("No game ZZZZZ"), "a wrong code is refused");
  await b.fill("#mp-code-input", code.toLowerCase());
  await b.click("[data-mp-join-form] button");
  // Castile is the host's: tapping it says so, then France sits down.
  await b.waitForSelector("[data-nation=castile]", { timeout: 20000 }).catch(async (e) => {
    await b.screenshot({ path: `${out}/stuck-join.png` });
    throw e;
  });
  await b.click("[data-nation=castile]");
  await b.waitForSelector(".alert, [role=alert]", { timeout: 10000 }).catch(() => {});
  await b.click("[data-nation=france]");
  await a.waitForSelector("[data-mp-start]:not([disabled])", { timeout: 20000 });
  const lobby = await a.textContent(".mp-players");
  check(lobby.includes("Leroy") && lobby.includes("Ana"), "the lobby names both players");
  await a.screenshot({ path: `${out}/2-lobby-host.png` });
  await b.screenshot({ path: `${out}/3-lobby-joined.png` });

  await a.click("[data-mp-start]");
  await a.waitForFunction(() => globalThis.__phMp()?.turn === 0, null, { timeout: 60000 });
  await b.waitForFunction(() => globalThis.__phMp()?.turn === 0, null, { timeout: 60000 });
  check((await mpState(a)).hash === (await mpState(b)).hash, "both devices start from the same world");

  for (let week = 1; week <= 3; week++) {
    await ready_(a);
    await a.waitForFunction(() => globalThis.__phMp()?.waiting === true);
    if (week === 1) {
      await a.screenshot({ path: `${out}/4-waiting.png` });
      // Your games on a second browser of Ana's account marks the game as waiting on her (MP-074).
      const b2 = await device("Pixel 7 landscape", await ana("Pixel"));
      await b2.click("[data-start=multiplayer]");
      await b2.waitForSelector(`[data-mp-rejoin="${code}"]`, { timeout: 20000 });
      await b2.evaluate(() => (document.querySelector(".mp-menu").scrollTop = 1e4));
      await b2.screenshot({ path: `${out}/5-your-games-waiting.png` });
      check((await b2.textContent(`[data-mp-rejoin="${code}"]`)).includes("waiting for your orders"), "Your games on another device marks the game waiting on this player");
      await b2.context().close();
    }
    await ready_(b);
    for (const p of [a, b])
      await p.waitForFunction((w) => globalThis.__phMp()?.turn === w && !globalThis.__phMp()?.waiting, week, { timeout: 90000 }).catch(async (e) => {
        for (const [n, q] of [["a", a], ["b", b]]) {
          await q.screenshot({ path: `${out}/stuck-${n}.png` });
          console.log(n, JSON.stringify(await mpState(q)));
        }
        throw e;
      });
    const [sa, sb] = [await mpState(a), await mpState(b)];
    check(sa.hash === sb.hash && !sa.outOfStep && !sb.outOfStep, `week ${week}: both devices agree (${sa.hash} / ${sb.hash})`);
  }
  await a.click(".mp-plaque");
  await a.screenshot({ path: `${out}/6-players.png` });

  // Ana comes back on a fresh browser of her account: Your games comes from the server (MP-050, MP-038).
  const c = await device("iPad Pro 11 landscape", await ana("Laptop"));
  await c.click("[data-start=multiplayer]");
  await c.waitForSelector(`[data-mp-rejoin="${code}"]`, { timeout: 20000 });
  await c.click(`[data-mp-rejoin="${code}"]`);
  await c.waitForFunction(() => globalThis.__phMp()?.turn === 3, null, { timeout: 120000 });
  await c.waitForTimeout(1500);
  const [sc, sa] = [await mpState(c), await mpState(a)];
  check(sc.hash === sa.hash, `a device coming back catches up to the same world (${sc.hash} / ${sa.hash})`);
  await c.screenshot({ path: `${out}/7-came-back.png`, timeout: 90000 }).catch(() => console.log("(no screenshot of the device that came back: the page was busy)"));
}

try {
  await play();
} catch (e) {
  console.log("FAIL", e);
  failed = true;
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
