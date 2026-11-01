// Plays a three-player online game against a deployed server (docs/deploy.md: the web game at <url>/play/ and the API
// on the same address), each player on a separate browser and screen: two phones and a tablet, in landscape (the game asks
// to turn a touch screen in portrait, which is checked on the Players card). It covers the rules of domain/multiplayer that need more than two players or real time:
//   - the host's five-minute turn limit runs out on a player who never presses Ready (MP-080);
//   - a week's orders sent with a different week-start hash mark the game out of step on every device (MP-034);
//   - a player comes back to the game in a fresh page and catches up (MP-038);
//   - the host hands their own realm to the AI and the host's part passes on (MP-081, MP-082);
//   - the new host hands another player's realm to the AI, and the last player ends the game (MP-081, MP-082);
//   - the Multiplayer dialog, lobby and Players card keep 44-point buttons and no sideways scroll (MP-075, MP-083),
//     and a phone turned to portrait mid-game is asked to turn back (the game plays in landscape).
// Usage (a local stack: see docs/multiplayer.md, "Testing a deployed server"):
//   URL=https://localhost NODE_EXTRA_CA_CERTS=<the server's root certificate> node scripts/multiplayer-deploy-check.mjs <outDir>
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright-core";

const out = process.argv[2] ?? "mp-deploy-shots";
const url = (process.env.URL ?? "https://localhost").replace(/\/$/, "");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const check = (ok, what) => {
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
const LONG = { timeout: 600000 };
const ready = (page) => page.waitForFunction(() => globalThis.__phDiagnostics?.engineRoundTripMs != null, null, LONG);
const mpState = (page) => page.evaluate(() => globalThis.__phMp());
const turnIs = (page, turn) => page.waitForFunction((t) => globalThis.__phMp()?.turn === t && !globalThis.__phMp()?.waiting, turn, LONG);
const seen = (page) => page.evaluate(() => globalThis.__seen ?? []);

/** Answers the week's event cards, which open over everything as a player would see them. */
async function answerEvents(page) {
  for (let k = 0; k < 6; k++) {
    const opt = page.locator("#event-card:not([hidden]) [data-event-option]");
    if (!(await opt.count())) break;
    await opt.first().click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

/** Taps a button the way a player would: after answering any event card in the way. */
async function tap(page, selector) {
  await answerEvents(page);
  if (selector.startsWith("#panel") && !(await page.locator("#panel .mp-players").count())) await openPlayers(page);
  await page.click(selector);
}

async function pressReady(page) {
  await answerEvents(page);
  await page.click(".end-turn", LONG);
}

/** Freezes the running games while another page loads: pages drawing the map in software starve a new page's engine. */
async function frozen(pages, run) {
  const set = (state) => Promise.all(pages.map(async (p) => (await p.context().newCDPSession(p)).send("Page.setWebLifecycleState", { state })));
  await set("frozen");
  try {
    return await run();
  } finally {
    await set("active");
  }
}

const api = async (method, path, body, token) => {
  const r = await fetch(url + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: r.status === 204 ? null : await r.json().catch(() => null) };
};

/** A new account; each call signs in one more device and gives its tokens. */
async function account(name) {
  const email = `${name.toLowerCase()}-${Date.now()}@example.com`;
  const password = "correct horse battery staple";
  await api("POST", "/api/accounts", { email, displayName: name, password });
  return async (device) => (await api("POST", "/api/sessions", { email, password, device: { name: device, platform: "web" } })).body;
}

/** A browser of its own, signed in, with the alerts it shows kept in `__seen` (they fade). */
async function device(name, tokens) {
  const context = await browser.newContext({ ...devices[name], ignoreHTTPSErrors: true });
  const kept = { deviceToken: tokens.deviceToken, deviceId: tokens.deviceId, account: tokens.account };
  await context.addInitScript((t) => {
    localStorage.getItem("ph.cloud-device") || localStorage.setItem("ph.cloud-device", t);
    globalThis.__seen = [];
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.textContent) globalThis.__seen.push(n.textContent);
    }).observe(document, { childList: true, subtree: true });
  }, JSON.stringify(kept));
  return open(context, name);
}

async function open(context, name) {
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] page error: ${e.message}`));
  await page.goto(`${url}/play/?start`);
  await ready(page);
  const none = page.locator("[data-start=consent][data-choice=none]");
  if (await none.count()) await none.click(LONG);
  return page;
}

/** Every button in the card at least 44 points tall, and the page never scrolls sideways (MP-075). */
async function layout(page, card, what) {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const small = el ? [...el.querySelectorAll("button, input")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim() || b.getAttribute("aria-label")) : ["(no card)"];
    return { small, wide: document.documentElement.scrollWidth > window.innerWidth + 1 };
  }, card);
  check(!r.small.length && !r.wide, `${what}: 44-point buttons, no sideways scroll${r.small.length ? ` (small: ${r.small.join(", ")})` : ""}${r.wide ? " (scrolls sideways)" : ""}`);
}

async function openPlayers(page) {
  await answerEvents(page);
  if (!(await page.locator("#panel .mp-players").count())) await page.click(".mp-plaque");
  await page.waitForSelector("#panel .mp-players");
}

async function play() {
  const leroy = await account("Leroy");
  const ana = await account("Ana");
  const bo = await account("Bo");
  const a = await device("Pixel 7 landscape", await leroy("Pixel 7"));
  const b = await frozen([a], async () => device("iPhone 13 landscape", await ana("iPhone")));
  const c = await frozen([a, b], async () => device("iPad Pro 11 landscape", await bo("iPad")));

  await a.click("[data-start=multiplayer]");
  await a.waitForSelector("[data-mp=host]:not([disabled])");
  await layout(a, ".mp-menu", "Multiplayer dialog, Pixel 7");
  await a.screenshot({ path: `${out}/1-menu-pixel.png` });
  await a.click("[data-mp=host]");
  await a.click("[data-nation=castile]");
  await a.waitForSelector("[data-mp-start]");
  const code = (await a.textContent(".mp-code")).trim();

  for (const [p, realm] of [[b, "france"], [c, "england"]]) {
    await p.click("[data-start=multiplayer]");
    await p.waitForSelector("#mp-code-input:not([disabled])");
    await p.fill("#mp-code-input", code);
    await p.click("[data-mp-join-form] button");
    await p.waitForSelector(`[data-nation=${realm}]`, LONG);
    await p.click(`[data-nation=${realm}]`);
    await p.waitForSelector("#panel .mp-players");
  }
  await a.waitForFunction(() => document.querySelectorAll("#panel .mp-players li").length === 3, null, LONG);
  await a.click('[data-mp-limit="300"]');
  await a.waitForSelector('[data-mp-limit="300"][aria-pressed=true]');
  await layout(a, "#panel", "lobby card with the turn limit, Pixel 7");
  await a.screenshot({ path: `${out}/2-lobby-pixel.png` });
  await layout(b, "#panel", "lobby card, iPhone 13");
  await a.click("[data-mp-start]");
  for (const p of [a, b, c]) await p.waitForFunction(() => globalThis.__phMp()?.turn === 0, null, LONG);
  const h0 = await Promise.all([a, b, c].map(mpState));
  check(h0.every((s) => s.hash === h0[0].hash), "three devices start from the same world");

  // Week 1: Ana never presses Ready; after five minutes the week plays without her orders (MP-080).
  await pressReady(a);
  await pressReady(c);
  await openPlayers(b);
  check(/\d:\d\d/.test(await b.textContent("#panel [data-mp-clock]")), "the Players card counts the five minutes down");
  await layout(b, "#panel", "Players card, iPhone 13");
  await b.screenshot({ path: `${out}/3-players-iphone-clock.png` });
  const started = Date.now();
  for (const p of [a, b, c]) await turnIs(p, 1);
  const waited = Math.round((Date.now() - started) / 1000);
  check(waited > 200, `the week waited for its time to run out (${waited} s after the others were ready)`);
  const h1 = await Promise.all([a, b, c].map(mpState));
  check(h1.every((s) => s.hash === h1[0].hash && !s.outOfStep), `week 1 played without Ana's orders, alike on every device (${h1.map((s) => s.hash).join(" / ")})`);
  check((await seen(b)).some((t) => t.includes("Time ran out before your orders were in")), "Ana is told her orders missed the week");

  // Week 2: Bo's orders arrive with a different week-start hash: every device says the game is out of step (MP-034).
  const boApi = (await api("POST", "/api/sessions/refresh", { deviceToken: (await bo("script")).deviceToken })).body.accessToken;
  const sent = await api("PUT", `/api/games/${code}/weeks/1`, { realm: "england", orders: { nation: -1, orders: [], created: [] }, hash: "deadbeef" }, boApi);
  check(sent.status === 201, `orders with a wrong hash are kept for Bo (${sent.status})`);
  await pressReady(a);
  await pressReady(b);
  for (const p of [a, b, c]) await turnIs(p, 2);
  const h2 = await Promise.all([a, b, c].map(mpState));
  check(h2.every((s) => !!s.outOfStep), "every device says the game is out of step");
  check((await api("GET", `/api/games/${code}?since=0`, null, boApi)).body?.game?.outOfStep === 1, "the server marks the game out of step from week 2");
  await openPlayers(a);
  check((await a.textContent("#panel")).includes("Out of step"), "the Players card shows it");
  await layout(a, "#panel", "Players card, Pixel 7");
  await a.screenshot({ path: `${out}/4-players-pixel-out-of-step.png` });
  check(h2.every((s) => s.hash === h2[0].hash), "the worlds still agree (only the sent hash differed)");
  // Turned to portrait mid-game, the phone asks to be turned back, and the game carries on once it is.
  const wide = a.viewportSize();
  await a.setViewportSize({ width: wide.height, height: wide.width });
  await a.waitForTimeout(500);
  check(await a.locator(".rotate").isVisible(), "a phone turned to portrait is asked to turn back");
  await a.screenshot({ path: `${out}/4b-portrait-asks-to-turn.png` });
  await a.setViewportSize(wide);
  await a.waitForTimeout(500);
  check(!(await a.locator(".rotate").isVisible()) && (await a.locator("#panel .mp-players").isVisible()), "turned back, the Players card is where it was");

  // Ana comes back in a fresh page and catches up (MP-038).
  await b.close();
  const b2 = await frozen([a, c], () => open(b.context(), "iPhone 13 landscape"));
  await b2.click("[data-start=multiplayer]");
  await b2.waitForSelector(`[data-mp-rejoin="${code}"]`, LONG);
  // The others wait frozen while the device plays the weeks it missed again: the replay shares this machine with them.
  await frozen([a, c], async () => {
    await b2.click(`[data-mp-rejoin="${code}"]`);
    await turnIs(b2, 2).catch(async (e) => {
      console.log("coming back:", JSON.stringify(await mpState(b2).catch(() => null)), JSON.stringify(await seen(b2)).slice(-600));
      await b2.screenshot({ path: `${out}/stuck-rejoin.png` });
      throw e;
    });
  });
  check((await mpState(b2)).hash === (await mpState(a)).hash, "a player coming back in a fresh page catches up to the same world");

  // Leroy hands his own realm to the AI: Ana, who sat down first after him, becomes the host (MP-081, MP-082).
  await openPlayers(a);
  await tap(a, '.mp-leave [data-mp-drop="castile"]');
  await a.waitForSelector('.mp-leave [data-mp-drop="castile"].wax');
  await tap(a, '.mp-leave [data-mp-drop="castile"]');
  await a.waitForSelector(".mp-menu [role=alert]", LONG);
  check((await a.textContent(".mp-menu [role=alert]")).includes("You handed Castile to the AI"), "Leroy leaves for good, told why");
  await layout(a, ".mp-menu", "Multiplayer dialog with the reason, Pixel 7");
  await openPlayers(b2);
  await b2.waitForSelector('#panel [data-mp-drop="england"]', LONG);
  check((await b2.textContent("#panel")).includes("host · "), "Ana is the host now and may hand Bo's realm to the AI");
  check((await b2.textContent("#panel")).includes("played by the AI"), "Castile is played by the AI");

  // Ana hands Bo's realm to the AI, plays on alone, then hands her own: the game ends (MP-081, MP-082).
  await tap(b2, '#panel [data-mp-drop="england"]');
  await b2.waitForSelector("#panel [role=alert]");
  await b2.screenshot({ path: `${out}/5-new-host-confirm-iphone.png` });
  await tap(b2, '#panel [data-mp-drop="england"]');
  await c.waitForSelector(".mp-menu [role=alert]", LONG);
  check((await c.textContent(".mp-menu [role=alert]")).includes("handed to the AI"), "Bo is told his realm went to the AI");
  await c.screenshot({ path: `${out}/6-handed-to-the-ai-ipad.png` });
  await pressReady(b2);
  await turnIs(b2, 3);
  check(true, "Ana plays the next week alone against the AI");
  await openPlayers(b2);
  await tap(b2, '.mp-leave [data-mp-drop="france"]');
  await b2.waitForSelector('.mp-leave [data-mp-drop="france"].wax');
  await tap(b2, '.mp-leave [data-mp-drop="france"]');
  await b2.waitForSelector(".mp-menu [role=alert]", LONG);
  // Access tokens last 15 minutes and this run takes longer: Bo signs in again, as a device would.
  const boLater = (await api("POST", "/api/sessions/refresh", { deviceToken: (await bo("script-end")).deviceToken })).body.accessToken;
  const after = await api("GET", `/api/games/${code}?since=0`, null, boLater);
  check(after.status === 404, `with nobody left the game has ended (${after.status})`);
}

try {
  await play();
} catch (e) {
  console.log("FAIL", e);
  failed = true;
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
