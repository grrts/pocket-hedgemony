import { expect } from "vitest";
import { inflateRawSync } from "node:zlib";
import { loadDefaultRuleset, type Ruleset } from "@ph/rules";
import { createWorld, generateSyntheticRuleset, hashWorld, processTurn, Rng, type Order, type World } from "@ph/engine";
import * as S from "@ph/engine/domain/saves";
import { calendarDayOfIso, turnSpan } from "@ph/engine/domain/time-and-turns";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("saves");

// ---------------------------------------------------------------- fixtures

const RULES = loadDefaultRuleset();
const C = S.savesConfig;

const nationName = (id: string) => RULES.nations.find((n) => n.id === id)?.name ?? id;
const nationId = (name: string) => RULES.nations.find((n) => n.name === name || n.id === name)?.id ?? name.toLowerCase();

const PLATFORMS: Record<string, S.Platform> = {
  Android: "android",
  android: "android",
  iOS: "ios",
  desktop: "desktop",
  Steam: "desktop",
  web: "web",
  "iOS 15 web view": "ios",
  "Steam Deck": "desktop",
};
const DEVICE_PLATFORM: Record<string, S.Platform> = { "Pixel 8": "android", "Steam Deck": "desktop", "this phone": "android", iPhone: "ios" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthOf(word: string): number {
  const i = MONTHS.findIndex((m) => m.toLowerCase().startsWith(word.toLowerCase().slice(0, 3)));
  expect(i, `month ${word}`).toBeGreaterThanOrEqual(0);
  return i + 1;
}
function parseDate(text: string): { y: number; m: number } {
  const [m, y] = text.trim().split(/\s+/);
  return { y: Number(y), m: monthOf(m!) };
}

function storage(s: Scenario): S.MemoryStorage {
  return (s.storage ??= S.memoryStorage({ transactional: s.platform === "web" }));
}
function rng(s: Scenario): Rng {
  return (s.rng ??= new Rng(11));
}
function ctx(s: Scenario, over: Partial<S.SaveContext> = {}): S.SaveContext {
  s.now = (s.now ?? 1_700_000_000_000) + 60_000;
  return {
    storage: storage(s),
    rules: s.rules ?? RULES,
    rng: rng(s),
    device: s.device ?? "Pixel 8",
    platform: s.platform ?? DEVICE_PLATFORM[s.device ?? "Pixel 8"] ?? "android",
    gameVersion: "1.0.0",
    now: s.now,
    ...over,
  };
}
function world(s: Scenario): World {
  return (s.world ??= createWorld(s.rules ?? RULES, 7));
}
/** Sets the month, keeping the day of the month when the engine's date has one (X-18 weekly turns). */
function setDate(w: World, d: { y: number; m: number }, turn?: number, day?: number): void {
  const old = w.date as { day?: number };
  w.date = { ...w.date, year: d.y, month: d.m, ...(old.day !== undefined ? { day: day ?? old.day } : {}) } as World["date"];
  if (turn !== undefined) w.turn = turn;
}
function campaign(s: Scenario, nation = "Castile", ironman = false): S.Campaign {
  if (!s.campaign) {
    const id = nationId(nation);
    s.campaign = S.newCampaign(rng(s), { playerNation: id, nationName: nationName(id), ironman });
  }
  return s.campaign;
}
function write(s: Scenario, kind: S.SaveKind, opts: S.WriteOptions = {}): S.Written {
  const w = S.writeSave(ctx(s), campaign(s), world(s), kind, opts);
  s.last = w;
  (s.written ??= []).push(w);
  return w;
}
function mine(s: Scenario, kind?: S.SaveKind): S.SaveEntry[] {
  return S.entries(storage(s)).filter((e) => e.header.campaignId === campaign(s).campaignId && (!kind || e.header.kind === kind));
}
function nationIndex(w: World, id: string): number {
  return w.nationIndex.get(id)!;
}
function armyOf(w: World, nation: string): number {
  const n = nationIndex(w, nation);
  for (let i = 0; i < w.armies.count; i++) if (w.armies.alive[i] && w.armies.owner[i] === n) return i;
  return 0;
}
function someOrders(w: World, nation: string, count: number): Order[] {
  const army = armyOf(w, nation);
  return Array.from({ length: count }, (_, k) => ({ type: "move" as const, army, to: (k * 7 + 3) % w.provinceCount }));
}
function opener(s: Scenario): S.OpenOptions {
  return { rules: s.rules ?? RULES, fullGame: s.fullGame ?? true };
}
function flip(bytes: Uint8Array, at: number): Uint8Array {
  const out = bytes.slice();
  out[at] = out[at]! ^ 0xff;
  return out;
}
/** Index of a byte inside the last chunk's compressed data. */
function chunkByte(bytes: Uint8Array): number {
  const t = S.readTable(bytes);
  const e = t[t.length - 1]!;
  return e.offset + Math.floor(e.length / 2);
}
/** The same file with a new header (for fixtures: old format versions, edited ids). */
function reheader(bytes: Uint8Array, edit: (h: S.SaveHeader) => void, editChunks?: (c: Map<string, S.RawChunk>) => void): Uint8Array {
  const d = S.decodeSave(bytes);
  const h = { ...d.header };
  edit(h);
  editChunks?.(d.chunks);
  return S.encodeSave(h, [...d.chunks.values()]);
}

/** End turn: run the turn, write the Resume (or Ironman) save, and the autosave if the new turn is due one. */
function endTurn(s: Scenario): void {
  const w = world(s);
  const c = campaign(s);
  processTurn(w, s.orders ?? [], nationIndex(w, c.playerNation));
  s.orders = [];
  s.endWrite = write(s, c.ironman ? "ironman" : "resume");
  turnStarts(s);
}
/** The month that begins in the turn starting on the world's date, or null (X-18); a month-only date begins its month. */
function monthBeginsAt(w: World): number | null {
  const d = w.date as { year: number; month: number; day?: number };
  if (d.day === undefined) return d.month;
  return turnSpan({ year: d.year, month: d.month, day: d.day }).monthBegins?.month ?? null;
}
function turnStarts(s: Scenario, monthBegins: number | null = monthBeginsAt(world(s))): void {
  const w = world(s);
  const c = campaign(s);
  const interval: S.AutosaveInterval = s.interval ?? S.AUTOSAVE_DEFAULTS.interval;
  const before = mine(s, "autosave").map((e) => e.path);
  s.autosaveWrite = undefined;
  if (S.autosaveDue(interval, monthBegins, c.ironman)) s.autosaveWrite = write(s, "autosave", { keep: s.keep ?? S.AUTOSAVE_DEFAULTS.keep });
  s.autosaveBefore = before;
}

// ---------------------------------------------------------------- devices and the cloud

interface Dev {
  name: string;
  storage: S.MemoryStorage;
  store: { text?: string };
  client: S.SyncClient;
  rng: Rng;
  uploaded?: Set<string>;
}
function server(s: Scenario): S.CloudServer {
  if (!s.server) {
    s.server = S.createServer(new Rng(99), s.rateLimit);
    S.createAccount(s.server, "player@example.org", "secret", s.accountId);
  }
  return s.server;
}
function queueStore(d: { text?: string }): S.QueueStore {
  return { load: () => d.text, save: (t) => (d.text = t) };
}
function dev(s: Scenario, name: string, signedIn = true): Dev {
  s.devs ??= {};
  if (!s.devs[name]) {
    const store: { text?: string } = {};
    const d: Dev = { name, storage: S.memoryStorage(), store, client: S.syncClient(name, queueStore(store)), rng: new Rng(1000 + Object.keys(s.devs).length) };
    if (signedIn) {
      const r = S.signIn(server(s), "player@example.org", "secret", name, DEVICE_PLATFORM[name] ?? "android");
      if ("error" in r) throw new Error(r.error);
      d.client.deviceToken = r.deviceToken;
    }
    s.devs[name] = d;
  }
  return s.devs[name];
}
function devCtx(s: Scenario, d: Dev): S.SaveContext {
  s.now = (s.now ?? 1_700_000_000_000) + 60_000;
  return { storage: d.storage, rules: RULES, rng: d.rng, device: d.name, platform: DEVICE_PLATFORM[d.name] ?? "android", gameVersion: "1.0.0", now: s.now };
}
function uploader(s: Scenario, d: Dev) {
  return (path: string) => {
    const bytes = d.storage.read(path);
    if (!bytes) return { ok: true as const };
    if (!d.client.online) return { ok: false as const, refusal: "offline" as const };
    const h = S.readHeader(bytes);
    s.now += 1000;
    return S.putSave(server(s), d.client.deviceToken!, S.rowOf("", h, bytes.length), bytes, s.now);
  };
}
/** One sync: queue the synced set, upload, fetch changes, download the newest Resume or Ironman save in the background. */
function sync(s: Scenario, d: Dev): ReturnType<typeof S.runQueue> {
  const done = (d.uploaded ??= new Set<string>());
  // The synced set, plus every ironman save in order so each names the one before it.
  const local = S.entries(d.storage);
  const toSend = new Set([...S.syncedSet(local), ...local.filter((e) => e.header.kind === "ironman")].map((e) => e.path));
  for (const e of local.sort((a, b) => a.header.savedAt - b.header.savedAt)) if (toSend.has(e.path) && !done.has(e.path)) S.queueUpload(d.client, e.path);
  const r = S.runQueue(d.client, uploader(s, d), s.now ?? 0);
  for (const p of r.uploaded) done.add(p);
  const ch = S.fetchChanges(d.client, server(s));
  for (const id of ch.removed) for (const e of S.entries(d.storage)) if (e.header.saveId === id) d.storage.remove(e.path);
  const newest = new Map<string, S.SaveRow>();
  for (const row of d.client.known.values()) {
    if (row.kind !== "resume" && row.kind !== "ironman") continue;
    const cur = newest.get(row.campaignId);
    if (!cur || row.savedAt > cur.savedAt) newest.set(row.campaignId, row);
  }
  const have = new Set(S.entries(d.storage).map((e) => e.header.saveId));
  for (const row of newest.values()) {
    if (have.has(row.saveId)) continue;
    const bytes = S.getSave(server(s), d.client.deviceToken!, row.saveId);
    if (bytes) S.writeFileSafely(d.storage, S.fileName(S.readHeader(bytes)), bytes);
  }
  return r;
}
/** What a device's Load screen lists: save id → the device that made it. */
function loadScreen(d: Dev): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of S.entries(d.storage)) m.set(e.header.saveId, e.header.device);
  for (const r of d.client.known.values()) m.set(r.saveId, r.device);
  return m;
}
function playOffline(s: Scenario, d: Dev, nation: string, turns: number, c?: S.Campaign): S.Campaign {
  const w = createWorld(RULES, 7);
  const camp = c ? { ...c } : S.newCampaign(d.rng, { playerNation: nationId(nation), nationName: nation });
  for (let t = 0; t < turns; t++) {
    processTurn(w, [], nationIndex(w, camp.playerNation));
    S.writeSave(devCtx(s, d), camp, w, camp.ironman ? "ironman" : "resume");
    if (!camp.ironman) S.writeSave(devCtx(s, d), camp, w, "autosave", { keep: 3 });
  }
  return camp;
}

// ================================================================ save-kinds-and-continue

Given("the campaign as {string} is at turn {int}, {word} {int}", (s, nation: string, turn: number, month: string, year: number) => {
  campaign(s, nation);
  setDate(world(s), { y: year, m: monthOf(month) }, turn);
});
Given("the player has queued {int} orders", (s, n: number) => {
  s.orders = someOrders(world(s), campaign(s).playerNation, n);
});
When("any save is written", (s) => {
  s.anySave = write(s, "resume", { orders: s.orders });
});
Then("the save holds the world at the start of turn {int} and the {int} queued orders", (s, turn: number, n: number) => {
  const r = S.openSave(s.anySave.bytes, opener(s));
  expect(r.kind).toBe("opened");
  if (r.kind !== "opened") return;
  expect(r.header.turn).toBe(turn);
  expect(r.world.turn).toBe(turn);
  expect(r.loadedHash).toBe(hashWorld(world(s)));
  expect(r.game.orders).toEqual(s.orders);
  expect(r.game.orders).toHaveLength(n);
});
Then("it holds nothing from halfway through a turn", (s) => {
  const r = S.openSave(s.anySave.bytes, opener(s));
  if (r.kind !== "opened") throw new Error(r.kind);
  // The week's four-hour steps all ran: the save starts the next week at its first step.
  expect(r.world.step).toBe(0);
  const chunks = [...S.decodeSave(s.anySave.bytes).chunks.keys()];
  expect(chunks.every((id) => C.format.chunks.includes(id))).toBe(true);
});

Given("the campaign as {string} is loaded", (s, nation: string) => {
  campaign(s, nation);
  world(s);
});
When("a save is written", (s) => {
  if (!s.campaign && !s.signedInDev && !s.addedChunk) {
    // Given a save is written: a world with a marching army, at a turn boundary.
    campaign(s);
    const w = world(s);
    const army = armyOf(w, "castile");
    const far = w.provinceIndex.get(RULES.nations.find((n) => n.id === "ottomans")!.capital)!;
    processTurn(w, [{ type: "move", army, to: far }], nationIndex(w, "castile"));
    write(s, "resume");
    return;
  }
  if (s.server && s.signedInDev) {
    // Wi-Fi only scenario: a save is written on the signed-in device and queued.
    const d: Dev = s.signedInDev;
    const c = S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" });
    const w = S.writeSave(devCtx(s, d), c, createWorld(RULES, 7), "manual");
    S.queueUpload(d.client, w.path);
    s.queueRun = S.runQueue(d.client, uploader(s, d), s.now);
    return;
  }
  if (s.addedChunk) {
    s.last = write(s, "manual", { systemChunks: [S.packChunk(s.addedChunk, 1, { meta: { relations: [] }, arrays: {} })] });
    return;
  }
  write(s, "manual");
});
Then("the save does not hold the {word}", (s, thing: string) => checkNotHeld(s, thing));
Then("the save does not hold the map shapes", (s) => checkNotHeld(s, "map shapes"));
Then("the save does not hold the achievement progress", (s) => checkNotHeld(s, "achievement progress"));
function allChunkText(bytes: Uint8Array): string {
  const d = S.decodeSave(bytes);
  return [...d.chunks.values()]
    .map((c) => {
      const p = c.payload;
      const len = new DataView(p.buffer, p.byteOffset).getUint32(0, true);
      return `${c.id} ${new TextDecoder().decode(p.subarray(4, 4 + len))}`;
    })
    .join("\n");
}
function checkNotHeld(s: Scenario, thing: string): void {
  const bytes: Uint8Array = s.last.bytes;
  const text = allChunkText(bytes);
  const header = JSON.stringify(Object.keys(S.readHeader(bytes)));
  const words: Record<string, RegExp> = {
    rules: /"defines"|"units"|"economy"|"march"|"might"|"cunning"/,
    "map shapes": /"x"|"y"|"shape|"neighbors"|"adj/,
    art: /PNG|"image|"sprite|"provinceImage"|"terrainImage"/,
    settings: /settings|"volume|"profile"|"language"/i,
    purchases: /purchase|unlock|"store"/i,
    "achievement progress": /achievement/i,
  };
  const re = words[thing];
  expect(re, thing).toBeDefined();
  expect(text).not.toMatch(re!);
  if (thing !== "art") expect(header).not.toMatch(re!);
}

Given("the autosave interval is {string}", (s, text: string) => {
  const map: Record<string, S.AutosaveInterval> = { "every month": 1, "every 6 months": 6, "every 12 months": 12, off: "off" };
  s.interval = map[text];
  expect(s.interval, text).toBeDefined();
});
Given("autosaves kept per campaign is {int}", (s, n: number) => {
  if (s.choices) {
    expect(S.AUTOSAVE_DEFAULTS.keep).toBe(n);
    return;
  }
  s.keep = n;
});
Given("the campaign as {string} has {int} autosaves", (s, nation: string, n: number) => {
  campaign(s, nation);
  const w = world(s);
  for (let i = 0; i < n; i++) {
    w.turn = i;
    write(s, "autosave", { keep: 5 });
  }
  expect(mine(s, "autosave")).toHaveLength(n);
});
When("a turn starts on {string}", (s, iso: string) => {
  const w = world(s);
  const span = turnSpan(calendarDayOfIso(iso));
  w.turn = 100;
  w.date = { year: span.first.year, month: span.first.month };
  turnStarts(s, span.monthBegins?.month ?? null);
});
Then("a new autosave marked {string} is written and the oldest is removed", (s, mark: string) => {
  const a: S.Written = s.autosaveWrite;
  expect(a).toBeDefined();
  expect(a.header.name).toBe(mark);
  expect(a.removed).toHaveLength(1);
  expect(a.removed[0]).toBe(s.autosaveBefore[0]);
  expect(mine(s, "autosave")).toHaveLength(s.keep);
});
Then("a new autosave marked {string} is written and none is removed", (s, mark: string) => {
  const a: S.Written = s.autosaveWrite;
  expect(a.header.name).toBe(mark);
  expect(a.removed).toHaveLength(0);
  expect(mine(s, "autosave")).toHaveLength(s.autosaveBefore.length + 1);
});
Then("no autosave is written", (s) => {
  expect(s.autosaveWrite).toBeUndefined();
});

Given("the player has never changed the autosave options", () => {});
When("the autosave options are read", (s) => {
  s.choices = S.autosaveChoices();
});
Then("the interval is {string}", (s, label: string) => {
  const labels = C.kinds.autosave.interval_labels as Record<string, string>;
  expect(labels[String(S.AUTOSAVE_DEFAULTS.interval)]).toBe(label);
});
Then("the offered intervals are {string}", (s, list: string) => {
  expect(s.choices.intervals.join(", ")).toBe(list);
});
Then("the offered counts are {string}", (s, list: string) => {
  expect(s.choices.counts.join(", ")).toBe(list);
});

When("the player ends the turn in which January begins", (s) => {
  campaign(s);
  setDate(world(s), { y: 1450, m: 12 }, 50, 29);
  endTurn(s);
  expect(world(s).date.month).toBe(1);
});
Then("the Resume save is written", (s) => {
  expect(s.endWrite.header.kind).toBe("resume");
  expect(mine(s, "resume").length).toBeGreaterThan(0);
});

Given("the campaign as {string} has {int} manual saves", (s, nation: string, n: number) => {
  campaign(s, nation);
  s.fakeEntries = fakeManual(campaign(s).campaignId, n);
});
Given("the player has {int} manual saves in all campaigns", (s, total: number) => {
  const own: S.SaveEntry[] = s.fakeEntries ?? [];
  s.fakeEntries = [...own, ...fakeManual("other-campaign", total - own.length)];
});
function fakeManual(campaignId: string, n: number): S.SaveEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    path: `${campaignId}/${i}.phsave`,
    header: { campaignId, kind: "manual", name: `save ${i}`, savedAt: i, turn: i } as S.SaveHeader,
  }));
}
When("the player taps Save and picks {string}", (s, _slot: string) => {
  s.answer = S.newManualSave(s.fakeEntries, campaign(s), { y: 1492, m: 5 });
});
Then("a manual save is written with the player's name for it", (s) => {
  expect(s.answer).toEqual({ action: "write", name: "Castile, May 1492" });
  const w = write(s, "manual", { name: s.answer.name });
  expect(w.header.name).toBe("Castile, May 1492");
});
Then("the player is asked which save to replace", (s) => {
  expect(s.answer.action).toBe("choose a save to replace");
  expect(s.answer.choices.length).toBeGreaterThan(0);
});

Given("the campaign as {string} is ironman", (s, nation: string) => {
  campaign(s, nation, true);
  const w = world(s);
  // Two earlier ironman saves: the current one and its backup.
  w.turn = 10;
  write(s, "ironman");
  w.turn = 11;
  write(s, "ironman");
});
When("the player ends the turn", (s) => {
  campaign(s);
  s.before = S.entries(storage(s)).map((e) => e.path);
  endTurn(s);
});
Then("the ironman save is written", (s) => {
  const w: S.Written = s.endWrite ?? s.exitWrite;
  expect(w.header.kind).toBe("ironman");
  expect(w.header.parent).toBeDefined();
  expect(storage(s).read(w.path)).toBeDefined();
});
Then("the campaign keeps {int} ironman save and {int} backup", (s, a: number, b: number) => {
  const list = mine(s, "ironman").sort((x, y) => y.header.savedAt - x.header.savedAt);
  expect(list).toHaveLength(a + b);
  expect(list[0]!.path).toBe(s.endWrite.path);
});
Then("Load shows it as the campaign itself", (s) => {
  const cards = S.loadList(S.entries(storage(s)), nationName);
  expect(cards).toHaveLength(1);
  expect(cards[0]!.ironman).toBe(true);
  expect(cards[0]!.saves.map((e) => e.path)).toEqual([s.endWrite.path]);
});

Given("the campaign as {string} has a manual save {string}", (s, nation: string, name: string) => {
  campaign(s, nation);
  setDate(world(s), parseDate(name.split(", ")[1]!));
  s.manual = write(s, "manual", { name });
});
When("the player exports it {int} times", (s, n: number) => {
  const e: S.SaveEntry = { path: s.manual.path, header: s.manual.header };
  s.exports = Array.from({ length: n }, () => S.exportSave("android", e, storage(s).read(e.path)!));
});
Then("{int} files leave the game with no limit applied", (s, n: number) => {
  expect(s.exports).toHaveLength(n);
  for (const f of s.exports) expect(f.fileName.endsWith(".phsave")).toBe(true);
});
When("the player imports one of those files", (s) => {
  s.imported = S.importSave(ctx(s), s.exports[0].bytes);
});
Then("it is listed among the Manual saves", (s) => {
  expect(s.imported.kind).toBe("imported");
  const manual = mine(s, "manual").map((e) => e.path);
  expect(manual).toContain(s.imported.entry.path);
});

Given("the player begins a new campaign as {string}", (s, nation: string) => {
  campaign(s, nation);
  s.otherCampaign = S.newCampaign(rng(s), { playerNation: "france", nationName: "France" });
});
When("the first save of it is written", (s) => {
  s.first = write(s, "resume");
});
Then("the save carries a new random campaign id", (s) => {
  expect(s.first.header.campaignId).toMatch(/^[0-9a-f]{16}$/);
  expect(s.first.header.campaignId).not.toBe(s.otherCampaign.campaignId);
});
Then("every later save of that game carries the same campaign id", (s) => {
  processTurn(world(s), [], 0);
  const a = write(s, "resume");
  const b = write(s, "manual");
  expect(a.header.campaignId).toBe(s.first.header.campaignId);
  expect(b.header.campaignId).toBe(s.first.header.campaignId);
});

Given("campaigns as {string} and {string} have saves", (s, a: string, b: string) => {
  for (const nation of [a, b]) {
    s.campaign = undefined;
    s.world = undefined;
    campaign(s, nation);
    write(s, "resume");
    world(s).turn = 1;
    write(s, "manual");
    world(s).turn = 2;
    write(s, "autosave");
    (s.campaigns ??= {})[nation] = s.campaign;
  }
});
When("the player opens Load", (s) => {
  s.cards = S.loadList(S.entries(storage(s)), nationName);
});
Then("each campaign shows its nation banner, nation name, in-game date, turn, play time and a small map crop", (s) => {
  expect(s.cards).toHaveLength(2);
  for (const c of s.cards as S.CampaignCard[]) {
    expect(RULES.nations.some((n) => n.id === c.nation)).toBe(true);
    expect(c.nationName).toBe(nationName(c.nation));
    expect(c.date.y).toBeGreaterThan(1400);
    expect(typeof c.turn).toBe("number");
    expect(typeof c.playSeconds).toBe("number");
    const png = S.fromBase64(c.thumbnail);
    expect(Array.from(png.subarray(1, 4))).toEqual([0x50, 0x4e, 0x47]);
  }
});
When("the player opens the campaign as {string}", (s, nation: string) => {
  s.opened = (s.cards as S.CampaignCard[]).find((c) => c.nationName === nation);
});
Then("its saves are listed newest first", (s) => {
  const saves: S.SaveEntry[] = s.opened.saves;
  expect(saves.length).toBe(2);
  expect(saves.every((e) => e.header.kind !== "resume")).toBe(true);
  for (let i = 1; i < saves.length; i++) expect(saves[i - 1]!.header.savedAt).toBeGreaterThan(saves[i]!.header.savedAt);
});

Given("the newest Resume or Ironman save across all campaigns is {string} made on {string}", (s, title: string, device: string) => {
  const [nation, date] = title.split(", ");
  // An older one first, from another campaign.
  s.device = "Pixel 8";
  s.campaign = undefined;
  s.world = undefined;
  campaign(s, "France");
  write(s, "resume");
  s.campaign = undefined;
  s.world = undefined;
  campaign(s, nation!);
  setDate(world(s), parseDate(date!));
  s.device = device;
  s.platform = DEVICE_PLATFORM[device];
  write(s, "resume");
});
Given("this device is {string}", (s, d: string) => {
  s.thisDevice = d;
});
When("the main menu shows Continue", (s) => {
  s.cont = S.continueTarget(S.entries(storage(s)), s.thisDevice, nationName);
});
Then("Continue reads {string}", (s, label: string) => {
  expect(s.cont.label).toBe(label);
});

// ================================================================ saving-by-hand

Given("the campaign as {string} is loaded in {word} {int} and is not ironman", (s, nation: string, month: string, year: number) => {
  campaign(s, nation);
  setDate(world(s), { y: year, m: monthOf(month) });
});
Given("the campaign has manual saves {string} and {string}", (s, a: string, b: string) => {
  write(s, "manual", { name: a });
  write(s, "manual", { name: b });
});
When("the player picks Save in the game menu", (s) => {
  s.slots = S.saveSlots(S.entries(storage(s)), campaign(s).campaignId);
});
Then("{string} is at the top", (s, label: string) => {
  expect(s.slots[0]).toBe(label);
});
Then("the existing manual saves are listed under it", (s) => {
  expect([...s.slots.slice(1)].sort()).toEqual(["Castile, January 1491", "Castile, March 1490"]);
});
When("the player picks {string}", (s, slot: string) => {
  expect(slot).toBe(C.messages.new_save);
  s.answer = S.newManualSave(S.entries(storage(s)), campaign(s), { y: world(s).date.year, m: world(s).date.month });
});
Then("the name is filled in as {string}", (s, name: string) => {
  expect(s.answer.name).toBe(name);
});
Then("the player can confirm it without typing", (s) => {
  const w = write(s, "manual", { name: s.answer.name });
  expect(w.header.name).toBe(s.answer.name);
});
Given("the campaign has the manual save {string} in the file {string}", (s, name: string, file: string) => {
  const b = S.buildSave(ctx(s), campaign(s), world(s), "manual", { name });
  storage(s).files.set(file, b.bytes);
  s.oldFile = file;
  s.oldBytes = b.bytes.slice();
});
When("the player picks {string} to save over", (s, name: string) => {
  const e = S.entries(storage(s)).find((x) => x.header.name === name);
  expect(e).toBeDefined();
  s.replaceTarget = e!.path;
  s.question = S.replaceQuestion();
});
Then("the question {string} is shown", (s, q: string) => {
  expect(s.question).toBe(q);
});
When("the player confirms", (s) => {
  storage(s).log.length = 0;
  s.before = new Map([...storage(s).files].map(([k, v]) => [k, v.slice()]));
  s.replaced = write(s, "manual", { replace: s.replaceTarget });
});
Then("a new file is written with a new name", (s) => {
  expect(s.replaced.path).not.toBe(s.oldFile);
  expect(storage(s).read(s.replaced.path)).toBeDefined();
});
Then("only then the file {string} is removed", (s, file: string) => {
  const log: string[] = storage(s).log;
  const renamed = log.findIndex((l) => l.startsWith("rename") && l.endsWith(s.replaced.path));
  const removed = log.indexOf(`remove ${file}`);
  expect(renamed).toBeGreaterThanOrEqual(0);
  expect(removed).toBeGreaterThan(renamed);
  expect(storage(s).read(file)).toBeUndefined();
});
Then("no existing file was changed", (s) => {
  for (const [path, bytes] of s.before as Map<string, Uint8Array>) {
    const now = storage(s).read(path);
    if (now) expect(Buffer.from(now).equals(Buffer.from(bytes))).toBe(true);
  }
  expect(storage(s).log.filter((l: string) => l.startsWith("write ")).every((l: string) => !(s.before as Map<string, unknown>).has(l.slice(6)))).toBe(true);
});
Given("the campaign has {int} manual saves", (s, n: number) => {
  for (let i = 0; i < n; i++) write(s, "manual", { name: `Castile ${i}` });
});
Then("no save is removed without the player's choice", (s) => {
  expect(mine(s, "manual")).toHaveLength(C.kinds.manual.max_per_campaign);
});
When("the player deletes {string} from the Load screen", (s, name: string) => {
  let e = S.entries(storage(s)).find((x) => x.header.name === name);
  if (!e) {
    write(s, "manual", { name });
    e = S.entries(storage(s)).find((x) => x.header.name === name)!;
  }
  s.target = e.path;
  s.del = S.deleteSave(storage(s), e.path, false);
});
Then("a confirmation is shown", (s) => {
  expect(s.del).toEqual({ ask: "confirm" });
  expect(storage(s).read(s.target)).toBeDefined();
});
Then("the save is removed only after the player confirms", (s) => {
  expect(storage(s).read(s.target)).toBeDefined();
  S.deleteSave(storage(s), s.target, true);
  expect(storage(s).read(s.target)).toBeUndefined();
});
When("a manual save is written", (s) => {
  write(s, "manual");
});
Then("the toast {string} is shown", (s, toast: string) => {
  expect(s.last.toast).toBe(toast);
});
Then("no dialog is shown", (s) => {
  expect(Object.keys(s.last)).not.toContain("dialog");
  expect(Object.keys(s.last)).not.toContain("ask");
});
Given("the device has no space left", (s) => {
  write(s, "manual", { name: "Castile, March 1490" });
  s.kept = new Map([...storage(s).files].map(([k, v]) => [k, v.slice()]));
  storage(s).freeBytes = 0;
});
When("the player saves", (s) => {
  s.result = S.trySave(ctx(s), campaign(s), world(s), "manual");
});
Then("no existing save is damaged", (s) => {
  for (const [p, b] of s.kept as Map<string, Uint8Array>) {
    expect(Buffer.from(storage(s).read(p)!).equals(Buffer.from(b))).toBe(true);
    expect(S.openSave(b, opener(s)).kind).toBe("opened");
  }
  expect([...storage(s).files.keys()].sort()).toEqual([...(s.kept as Map<string, unknown>).keys()].sort());
});

// ================================================================ save-file-format

When("a save is written for the layout", () => {});
Then("the file has the extension {string}", (s, ext: string) => {
  expect(s.last.path.endsWith(ext)).toBe(true);
});
Then("it starts with the {int} bytes {string}", (s, n: number, magic: string) => {
  expect(new TextDecoder().decode(s.last.bytes.subarray(0, n))).toBe(magic);
});
Then("then a uint16 container version and a uint32 header length", (s) => {
  const dv = new DataView(s.last.bytes.buffer);
  expect(dv.getUint16(4, true)).toBe(S.CONTAINER_VERSION);
  s.headerLen = dv.getUint32(6, true);
  expect(s.headerLen).toBeGreaterThan(0);
});
Then("then the header as uncompressed UTF-8 JSON", (s) => {
  const json = new TextDecoder().decode(s.last.bytes.subarray(10, 10 + s.headerLen));
  expect(JSON.parse(json).saveId).toBe(s.last.header.saveId);
});
Then("then a chunk table with the count and, per chunk, id, version, offset, length and CRC-32", (s) => {
  const b: Uint8Array = s.last.bytes;
  const dv = new DataView(b.buffer);
  let p = 10 + s.headerLen;
  const count = dv.getUint16(p, true);
  p += 2;
  s.table = [];
  for (let i = 0; i < count; i++) {
    const idLen = b[p]!;
    const id = new TextDecoder().decode(b.subarray(p + 1, p + 1 + idLen));
    p += 1 + idLen;
    s.table.push({ id, version: dv.getUint16(p, true), offset: dv.getUint32(p + 2, true), length: dv.getUint32(p + 6, true), crc: dv.getUint32(p + 10, true) });
    p += 14;
  }
  expect(s.table.map((e: S.ChunkEntry) => e.id)).toEqual(["core", "ids", "provinces", "nations", "armies", "events", "history"]);
  for (const e of s.table) expect(S.crc32(b, e.offset, e.offset + e.length)).toBe(e.crc);
  expect(s.table[0].offset).toBe(p);
});
Then("then the chunks, each compressed with deflate", (s) => {
  const d = S.decodeSave(s.last.bytes);
  for (const e of s.table as S.ChunkEntry[]) {
    const plain = inflateRawSync(s.last.bytes.subarray(e.offset, e.offset + e.length));
    expect(Buffer.from(plain).equals(Buffer.from(d.chunks.get(e.id)!.payload))).toBe(true);
  }
  const last = s.table[s.table.length - 1];
  expect(last.offset + last.length).toBe(s.last.bytes.length);
});

const SMALL = generateSyntheticRuleset(RULES, { provinces: 60, nations: 3, seed: 5 });
Given("{int} saves exist", (s, n: number) => {
  s.rules = SMALL;
  s.world = createWorld(SMALL, 3);
  s.campaign = S.newCampaign(rng(s), { playerNation: "N0", nationName: "Nation 0" });
  for (let i = 0; i < n; i++) write(s, i % 2 ? "manual" : "autosave", { keep: 99 });
  expect(storage(s).list()).toHaveLength(n);
});
When("the Load screen is filled", (s) => {
  s.reads = [];
  const st = storage(s);
  s.listing = S.readListing(st.list(), (path, start, end) => {
    s.reads.push({ path, start, end });
    return st.read(path)!.subarray(start, end);
  });
  s.cards = S.loadList(s.listing, (id) => id);
});
Then("only each file's header is read", (s) => {
  expect(s.listing).toHaveLength(30);
  for (const r of s.reads) {
    const full = storage(s).read(r.path)!;
    expect(r.end).toBeLessThanOrEqual(S.headerSpan(full));
  }
});
Then("no chunk is decompressed", (s) => {
  for (const r of s.reads) {
    const full = storage(s).read(r.path)!;
    const first = S.readTable(full)[0]!;
    expect(r.end).toBeLessThan(first.offset);
  }
});

Given("the same world and orders on {string} and {string}", (s, a: string, b: string) => {
  s.pair = [a, b];
  s.orders = someOrders(world(s), "castile", 2);
});
When("each writes a save", (s) => {
  const c = campaign(s);
  s.pairSaves = (s.pair as string[]).map((p, i) => S.buildSave({ ...ctx(s), platform: PLATFORMS[p]!, device: `${p} ${i}` }, c, world(s), "resume", { orders: s.orders }));
});
Then("the chunks are byte-identical", (s) => {
  const [a, b] = (s.pairSaves as { bytes: Uint8Array }[]).map((x) => {
    const t = S.readTable(x.bytes);
    return t.map((e) => x.bytes.subarray(e.offset, e.offset + e.length));
  });
  expect(a!.length).toBe(b!.length);
  a!.forEach((chunk, i) => expect(Buffer.from(chunk).equals(Buffer.from(b![i]!))).toBe(true));
});
Then("compression used the bundled deflate library, not CompressionStream", (s) => {
  const x = s.pairSaves[0];
  const d = S.decodeSave(x.bytes);
  for (const e of d.table) {
    const ours = S.deflateRaw(d.chunks.get(e.id)!.payload);
    expect(Buffer.from(ours).equals(Buffer.from(x.bytes.subarray(e.offset, e.offset + e.length)))).toBe(true);
  }
});
Given("a save made on Steam", (s) => {
  s.platform = "desktop";
  s.device = "Steam Deck";
  campaign(s);
  s.steamSave = write(s, "manual");
});
When("it is opened on an Android phone", (s) => {
  s.result = S.openSave(s.steamSave.bytes, opener(s));
});
Then("it loads", (s) => {
  expect(s.result.kind).toBe("opened");
  expect(s.result.loadedHash).toBe(hashWorld(world(s)));
});

Given("the campaign as {string} in {word} {int} at turn {int}, not ironman, on normal difficulty with historical events and the end date 1939-08-31", (s, nation: string, month: string, year: number, turn: number) => {
  campaign(s, nation);
  setDate(world(s), { y: year, m: monthOf(month) }, turn);
});
When("a manual save {string} is written on a {string}", (s, name: string, device: string) => {
  s.device = device;
  s.platform = DEVICE_PLATFORM[device];
  write(s, "manual", { name });
});
Then("the header holds saveId, campaignId, kind {string}, name {string}, savedAt, device {string}, platform {string}", (s, kind: string, name: string, device: string, platform: string) => {
  const h: S.SaveHeader = s.last.header;
  expect(h.saveId).toBeTruthy();
  expect(h.campaignId).toBe(campaign(s).campaignId);
  expect(h.kind).toBe(kind);
  expect(h.name).toBe(name);
  expect(typeof h.savedAt).toBe("number");
  expect(h.device).toBe(device);
  expect(h.platform).toBe(platform);
});
Then("it holds gameVersion, formatVersion, rulesHash, mapHash, turn {int}, date {int}-{int} and playerNation {string}", (s, turn: number, y: number, m: number, nation: string) => {
  const h: S.SaveHeader = s.last.header;
  expect(h.gameVersion).toBeTruthy();
  expect(h.formatVersion).toBe(S.FORMAT_VERSION);
  expect(h.rulesHash).toBe(S.rulesHash(RULES));
  expect(h.mapHash).toBe(S.mapHash(RULES));
  expect(h.turn).toBe(turn);
  expect(h.date).toEqual({ y, m });
  expect(h.playerNation).toBe(nation);
});
Then("it holds ironman false, playSeconds, options with difficulty {string}, events {string} and endDate {string}", (s, d: string, e: string, end: string) => {
  const h: S.SaveHeader = s.last.header;
  expect(h.ironman).toBe(false);
  expect(typeof h.playSeconds).toBe("number");
  expect(h.options).toEqual({ difficulty: d, events: e, endDate: end });
});
Then("it holds worldHash and a {int} × {int} PNG thumbnail", (s, w: number, hgt: number) => {
  const h: S.SaveHeader = s.last.header;
  expect(h.worldHash).toBe(hashWorld(world(s)));
  const png = S.fromBase64(h.thumbnail);
  const dv = new DataView(png.buffer);
  expect(dv.getUint32(16)).toBe(w);
  expect(dv.getUint32(20)).toBe(hgt);
});

Given("a save whose header worldHash equals hashWorld of its saved state", (s) => {
  processTurn(world(s), [], 0);
  const w = write(s, "manual");
  expect(w.header.worldHash).toBe(hashWorld(world(s)));
  s.saveBytes = w.bytes;
});
When("the save is loaded", (s) => loadSave(s));
When("it is loaded", (s) => loadSave(s));
function loadSave(s: Scenario): void {
  const opts: S.OpenOptions = { rules: s.buildRules ?? s.rules ?? RULES, fullGame: true };
  if (s.buildFv !== undefined) opts.buildFormatVersion = s.buildFv;
  if (s.migrations) opts.migrations = s.migrations;
  if (s.tables) opts.tables = s.tables;
  s.result = S.openSave(s.saveBytes, opts);
}
Then("hashWorld is computed again on the loaded world", (s) => {
  expect(s.result.kind).toBe("opened");
  expect(s.result.loadedHash).toBe(hashWorld(s.result.world));
});
Then("it equals the header's worldHash", (s) => {
  expect(s.result.loadedHash).toBe(s.result.header.worldHash);
});

When("the chunk {string} is read", (s, id: string) => {
  const d = S.decodeSave(s.last.bytes);
  s.chunk = d.chunks.get(id);
  s.body = S.unpackChunk(s.chunk);
  s.entry = d.table.find((e) => e.id === id);
});
Then("it holds the turn, date, Rng state as four uint32s, game options and the player's nation", (s) => {
  const w = world(s);
  expect(s.body.meta.turn).toBe(w.turn);
  expect(s.body.meta.date).toEqual(w.date);
  expect(s.body.arrays.rng).toBeInstanceOf(Uint32Array);
  expect(Array.from(s.body.arrays.rng)).toEqual(Array.from(w.rng.state));
  expect(s.body.meta.options).toEqual(campaign(s).options);
  expect(s.body.meta.playerNation).toBe("castile");
});
Then("it holds the province, nation and commander id lists", (s) => {
  const w = world(s);
  expect(s.body.meta.provinces).toEqual(w.provinceIds);
  expect(s.body.meta.nations).toEqual(w.nationIds);
  expect(s.body.meta.commanders).toEqual(w.commanderIds);
});
Then("it holds owner, people, wealth and the other changing province fields as typed arrays", (s) => {
  const w = world(s);
  expect(Array.from(s.body.arrays.owner)).toEqual(Array.from(w.provinceOwner));
  expect(Array.from(s.body.arrays.population)).toEqual(Array.from(w.provincePopulation));
  expect(s.body.arrays.wealth).toBeInstanceOf(Float32Array);
});
Then("it holds treasury, levies and the other changing nation fields", (s) => {
  const w = world(s);
  expect(Array.from(s.body.arrays.treasury)).toEqual(Array.from(w.nationTreasury));
  expect(Array.from(s.body.arrays.levies)).toEqual(Array.from(w.nationLevies));
});
Then("it holds the live armies only, with routes", (s) => {
  const w = world(s);
  w.armies.alive[1] = 0;
  const again = S.decodeSave(write(s, "resume").bytes);
  const body = S.unpackChunk(again.chunks.get("armies")!);
  const live = Array.from(w.armies.alive.subarray(0, w.armies.count)).filter((x) => x).length;
  expect(body.arrays.slot!.length).toBe(live);
  expect(Array.from(body.arrays.slot!)).not.toContain(1);
  const routes = Array.from(body.arrays.routeLen!).reduce((a, b) => a + b, 0);
  expect(routes).toBe(body.arrays.route!.length);
  expect(routes).toBeGreaterThan(0);
});
Then("it holds events fired, flags set, pending choices and event cooldowns", (s) => {
  expect(Object.keys(s.body.meta).sort()).toEqual(["cooldowns", "fired", "flags", "pending"]);
});
Then("it holds the realm timeline the ledger and end-of-campaign screens read", (s) => {
  expect(Array.isArray(s.body.meta.timeline)).toBe(true);
});
Then("it has its own version number", (s) => {
  const id: string = s.entry.id;
  expect(s.entry.version).toBe((C.format.chunk_versions as Record<string, number>)[id]);
});

Given("a build adds the chunk {string}", (s, id: string) => {
  campaign(s);
  s.addedChunk = id;
});
Then("the chunk {string} is added", (s, id: string) => {
  expect(S.readTable(s.last.bytes).map((e) => e.id)).toContain(id);
});
Then("the versions of the other chunks are unchanged", (s) => {
  for (const e of S.readTable(s.last.bytes)) if (e.id !== s.addedChunk) expect(e.version).toBe((C.format.chunk_versions as Record<string, number>)[e.id]);
});

When("its chunks are read", (s) => {
  s.chunkText = allChunkText(s.last.bytes);
  s.chunkArrays = [...S.decodeSave(s.last.bytes).chunks.values()].flatMap((c) => S.chunkArrays(c).map((a) => a.name));
});
Then("no chunk holds {word}", (s, what: string) => noBuildData(s, what));
Then("no chunk holds province shapes", (s) => noBuildData(s, "province shapes"));
function noBuildData(s: Scenario, what: string): void {
  const re: Record<string, RegExp> = {
    adjacency: /adj|neighbo/i,
    terrain: /terrain|ground/i,
    // As keys: a realm's heritage names its strengths by id, and "the embanked river" is no build data.
    water: /"[^"]*water[^"]*"\s*:/i,
    rivers: /"[^"]*river[^"]*"\s*:/i,
    "province shapes": /shape|"x"|"y"|polygon/i,
  };
  const loose: Record<string, RegExp> = { water: /water/i, rivers: /river/i };
  expect(s.chunkText).not.toMatch(re[what]!);
  for (const a of s.chunkArrays as string[]) expect(a).not.toMatch(loose[what] ?? re[what]!);
}

function gridRules(ids: string[], pops: number[]): Ruleset {
  const base = generateSyntheticRuleset(RULES, { provinces: ids.length, nations: 1, seed: 2 });
  return {
    ...base,
    provinces: base.provinces.map((p, i) => ({ ...p, id: ids[i]!, name: ids[i]!, population: pops[i]!, neighbors: ids.filter((x) => x !== ids[i]) })),
    nations: base.nations.map((n) => ({ ...n, capital: ids[0]! })),
  };
}
Given("a save written by a build whose province list is {string}", (s, list: string) => {
  const ids = list.split(", ");
  s.rules = gridRules(ids, ids.map((_, i) => 10 + i));
  s.world = createWorld(s.rules, 1);
  const w: World = s.world;
  w.provincePopulation[w.provinceIndex.get("B")!] = 111;
  w.provincePopulation[w.provinceIndex.get("C")!] = 222;
  s.campaign = S.newCampaign(rng(s), { playerNation: "N0", nationName: "Nation 0" });
  s.saveBytes = write(s, "manual").bytes;
});
When("a later build with the province list {string} loads it", (s, list: string) => {
  const ids = list.split(", ");
  s.buildRules = gridRules(ids, ids.map(() => 5));
  loadSave(s);
});
Then("the values for {string} and {string} land on {string} and {string} through the ids chunk", (s, b: string, c: string) => {
  expect(s.result.kind).toBe("opened");
  const w: World = s.result.world;
  expect(w.provincePopulation[w.provinceIndex.get(b)!]).toBe(111);
  expect(w.provincePopulation[w.provinceIndex.get(c)!]).toBe(222);
  expect(s.result.defaulted).toEqual(["D"]);
});
Then("the arrays were stored as raw little-endian bytes", (s) => {
  const chunk = S.decodeSave(s.saveBytes).chunks.get("provinces")!;
  const p = chunk.payload;
  const jsonLen = new DataView(p.buffer, p.byteOffset).getUint32(0, true);
  const descs = S.chunkArrays(chunk);
  let off = 4 + jsonLen;
  for (const d of descs) {
    if (d.name === "population") break;
    off += d.length * (d.kind === "i16" ? 2 : d.kind === "f64" ? 8 : 4);
  }
  const dv = new DataView(p.buffer, p.byteOffset + off);
  expect(dv.getFloat32(4, true)).toBe(111);
  expect(dv.getFloat32(8, true)).toBe(222);
});

Given("the player has queued orders", (s) => {
  campaign(s);
  s.orders = someOrders(world(s), campaign(s).playerNation, 2);
});
When("a {string} save is written", (s, kind: string) => {
  s.last = write(s, kind as S.SaveKind, { orders: s.orders });
});
Then("the orders chunk is present", (s) => {
  expect(S.readTable(s.last.bytes).map((e) => e.id)).toContain("orders");
});
Then("the orders chunk is not present", (s) => {
  expect(S.readTable(s.last.bytes).map((e) => e.id)).not.toContain("orders");
});

// ================================================================ safe-writing

Given("the game runs on {string}", (s, p: string) => {
  s.platformName = p;
  s.platform = PLATFORMS[p] ?? "desktop";
});
When("a new autosave replaces the oldest one", (s) => {
  campaign(s);
  for (let i = 0; i < 3; i++) {
    world(s).turn = i;
    write(s, "autosave", { keep: 3 });
  }
  s.oldest = mine(s, "autosave").sort((a, b) => a.header.savedAt - b.header.savedAt)[0]!.path;
  storage(s).log.length = 0;
  world(s).turn = 3;
  s.replacing = write(s, "autosave", { keep: 3 });
});
Then("the save is serialised and compressed in the worker", (s) => {
  expect(s.replacing.steps[0]).toBe("serialised and compressed in the worker");
});
Then("it is written to a temporary file in the same folder", (s) => {
  const w: S.Written = s.replacing;
  expect(w.steps).toContain("written to a temporary file in the same folder");
  const first = storage(s).log.find((l: string) => l.startsWith("write "))!;
  const tmp = first.slice(6);
  expect(tmp).toBe(w.path + S.TEMP_SUFFIX);
  expect(tmp.split("/")[0]).toBe(w.path.split("/")[0]);
});
Then("it is flushed to disk and renamed to its final name", (s) => {
  const steps: string[] = s.replacing.steps;
  expect(steps.indexOf("flushed to disk")).toBeGreaterThan(steps.indexOf("written to a temporary file in the same folder"));
  expect(steps.indexOf("renamed to its final name")).toBeGreaterThan(steps.indexOf("flushed to disk"));
});
Then("it is committed in a single IndexedDB transaction", (s) => {
  const log: string[] = storage(s).log;
  const begin = log.indexOf("begin transaction");
  const commit = log.indexOf("commit transaction");
  expect(begin).toBeGreaterThanOrEqual(0);
  const inside = log.slice(begin, commit);
  expect(inside.some((l) => l.startsWith("write "))).toBe(true);
  expect(inside.some((l) => l.startsWith("rename "))).toBe(true);
});
Then("only then the oldest autosave is removed", (s) => {
  const log: string[] = storage(s).log;
  const removed = log.indexOf(`remove ${s.oldest}`);
  const renamed = log.findIndex((l) => l.startsWith("rename "));
  expect(removed).toBeGreaterThan(renamed);
  expect(Math.max(log.indexOf("commit transaction"), renamed)).toBeLessThan(removed);
});

Given("the Resume save of turn {int} exists", (s, turn: number) => {
  campaign(s);
  world(s).turn = turn;
  s.r820 = write(s, "resume");
});
When("the app is killed while the Resume save of turn {int} is being written", (s, turn: number) => {
  world(s).turn = turn;
  s.killed = 0;
  // Kill the app at every point of the write in turn.
  for (let k = 0; k < 4; k++) {
    const st = storage(s);
    const snapshot = new Map(st.files);
    st.killAfter = k;
    try {
      S.writeSave(ctx(s), campaign(s), world(s), "resume");
    } catch (e) {
      expect(e).toBeInstanceOf(S.KilledError);
      s.killed++;
    }
    st.killAfter = undefined;
    (s.killStates ??= []).push(new Map(st.files));
    st.files = snapshot;
  }
});
When("the player starts the game again", () => {});
Then("the Resume save of turn {int} is intact", (s, turn: number) => {
  expect(s.killed).toBeGreaterThan(0);
  for (const files of s.killStates as Map<string, Uint8Array>[]) {
    const bytes = files.get(s.r820.path)!;
    expect(Buffer.from(bytes).equals(Buffer.from(s.r820.bytes))).toBe(true);
    const r = S.openSave(bytes, opener(s));
    expect(r.kind === "opened" && r.header.turn).toBe(turn);
  }
});

Given("Resume saves exist for turns {int} and {int}", (s, a: number, b: number) => {
  campaign(s);
  world(s).turn = a;
  s.ra = write(s, "resume");
  world(s).turn = b;
  s.rb = write(s, "resume");
});
When("the Resume save of turn {int} is written", (s, t: number) => {
  world(s).turn = t;
  s.rc = write(s, "resume");
});
Then("the Resume saves of turns {int} and {int} are kept", (s, a: number, b: number) => {
  expect(mine(s, "resume").map((e) => e.header.turn).sort()).toEqual([a, b]);
});
Then("the Resume save of turn {int} is removed", (s, t: number) => {
  expect(s.rc.removed).toEqual([s.ra.path]);
  expect(mine(s, "resume").some((e) => e.header.turn === t)).toBe(false);
});

Given("the Resume save of December 1511 is good", (s) => {
  campaign(s);
  setDate(world(s), { y: 1511, m: 12 }, 800);
  s.good = write(s, "resume");
});
Given("the newer Resume save is damaged", (s) => {
  processTurn(world(s), [], 0);
  const w = write(s, "resume");
  storage(s).files.set(w.path, flip(w.bytes, chunkByte(w.bytes)));
});
When("the player continues", (s) => {
  if (s.journalRecord) {
    s.journalResult = S.journalApplies(s.journalRecord, s.resumeRecord) ? "applied" : "ignored";
    return;
  }
  s.cont = S.continueCampaign(storage(s), campaign(s).campaignId, opener(s), s.journal);
});
Then("the Resume save of December 1511 is opened", (s) => {
  expect(s.cont.path).toBe(s.good.path);
  expect(s.cont.opened.header.date).toEqual({ y: 1511, m: 12 });
});
Then("the message {string} is shown", (s, msg: string) => {
  const shown = s.cont?.message ?? s.result?.message ?? s.result?.error;
  expect(shown).toBe(msg);
});

Given("a save file exists", (s) => {
  campaign(s);
  s.first = write(s, "resume");
  s.firstCopy = s.first.bytes.slice();
});
When("any later save is written", (s) => {
  processTurn(world(s), [], 0);
  s.later = [write(s, "resume"), write(s, "manual"), write(s, "autosave")];
});
Then("the existing file's bytes are unchanged", (s) => {
  expect(Buffer.from(storage(s).read(s.first.path)!).equals(Buffer.from(s.firstCopy))).toBe(true);
  for (const l of storage(s).log) if (l.startsWith("write ")) expect(l.slice(6)).not.toBe(s.first.path);
});
Then("the new save has a new file name", (s) => {
  for (const w of s.later as S.Written[]) expect(w.path).not.toBe(s.first.path);
  expect(new Set((s.later as S.Written[]).map((w) => w.path)).size).toBe(3);
});

Given("a low-end Android phone", () => {});
When(/^the save file size at the 1444 start is measured$/, (s) => {
  campaign(s);
  s.size = write(s, "resume").bytes.length;
});
Then("it is under {int} KB", (s, kb: number) => {
  expect(kb).toBe(C.budgets.file_kb_start);
  expect(s.size).toBeLessThan(kb * 1024);
});

// ================================================================ resume-and-orders-journal

Given("the campaign as {string} is loaded at turn {int}, {word} {int}", (s, nation: string, turn: number, month: string, year: number) => {
  campaign(s, nation);
  setDate(world(s), { y: year, m: monthOf(month) }, turn);
  s.resume = write(s, "resume");
});
Then("the engine worker writes the Resume save for turn {int}", (s, turn: number) => {
  expect(s.endWrite.header.kind).toBe("resume");
  expect(s.endWrite.header.turn).toBe(turn);
  expect(S.lifecycleWrites("end_turn", { turnRunning: false, ordersChanged: false })[0]).toMatch(/in the worker/);
});
Then("the player can already give orders while it writes", (s) => {
  // Orders for the new turn go into a journal of their own; nothing waits for the write.
  const j = S.makeJournal(s.endWrite, someOrders(world(s), "portugal", 1));
  expect(j.turn).toBe(s.endWrite.header.turn);
});
Given("the player has queued orders since the turn began", (s) => {
  s.orders = someOrders(world(s), campaign(s).playerNation, 2);
});
When("the app is backgrounded", (s) => {
  s.writes = S.lifecycleWrites("background", { turnRunning: false, ordersChanged: true });
  s.plan = S.syncPlan("background");
});
When("the app is suspended", (s) => {
  s.writes = S.lifecycleWrites("suspend", { turnRunning: false, ordersChanged: true });
});
When("the app is closed", (s) => {
  s.writes = S.lifecycleWrites("quit", { turnRunning: false, ordersChanged: true });
});
When("{int} seconds pass while the orders are changing", (s, sec: number) => {
  expect(sec).toBe(S.JOURNAL_SAFETY_SECONDS);
  s.writes = S.lifecycleWrites("safety_timer", { turnRunning: false, ordersChanged: true });
});
Then("the orders journal is written", (s) => {
  expect(s.writes).toEqual(["orders journal"]);
});

Given("the player has queued {int} orders in turn {int}", (s, n: number, turn: number) => {
  expect(world(s).turn).toBe(turn);
  s.orders = someOrders(world(s), campaign(s).playerNation, n);
  s.leftHash = hashWorld(world(s));
});
Given("the app was backgrounded and the journal written", (s) => {
  expect(S.lifecycleWrites("background", { turnRunning: false, ordersChanged: true })).toEqual(["orders journal"]);
  s.journal = JSON.parse(JSON.stringify(S.makeJournal(s.resume, s.orders)));
});
Given("the system killed the app", (s) => {
  s.world = undefined;
});
Then("the Resume save of turn {int} is loaded", (s, turn: number) => {
  expect(s.cont.opened.header.turn).toBe(turn);
  expect(s.cont.path).toBe(s.resume.path);
});
Then("the {int} orders are back in the queue", (s, n: number) => {
  expect(s.cont.journal).toBe("applied");
  expect(s.cont.orders).toHaveLength(n);
  expect(s.cont.orders).toEqual(s.orders);
});
Then("the state is exactly as the player left it", (s) => {
  expect(hashWorld(s.cont.opened.world)).toBe(s.leftHash);
});

Given("the journal records turn {int} and the hash {string}", (s, turn: number, hash: string) => {
  s.journalRecord = { turn, resumeHash: hash };
});
Given("the Resume save is turn {int} with the hash {string}", (s, turn: number, hash: string) => {
  s.resumeRecord = { turn, hash };
});
Then("the journal is {word}", (s, result: string) => {
  expect(s.journalResult).toBe(result);
});

When("the platform raises {string}", (s, event: string) => {
  const p: Record<string, string> = { iOS: "ios", Android: "android", desktop: "desktop", web: "web" };
  const moment = S.platformMoment(p[s.platformName]!, event);
  expect(moment, event).toBeDefined();
  s.writes = S.lifecycleWrites(moment!, { turnRunning: false, ordersChanged: true });
});

Given("the player ended turn {int} and the turn is being processed", (s, turn: number) => {
  expect(world(s).turn).toBe(turn);
  s.orders = someOrders(world(s), campaign(s).playerNation, 1);
  s.journal = S.makeJournal(s.resume, s.orders);
  // The turn as it would have come out.
  const w = createWorld(RULES, 7);
  const r = S.openSave(s.resume.bytes, opener(s));
  if (r.kind !== "opened") throw new Error(r.kind);
  processTurn(r.world, s.orders, nationIndex(r.world, campaign(s).playerNation));
  s.expected = hashWorld(r.world);
  void w;
  s.filesBefore = storage(s).list();
});
When("the app is backgrounded and later killed", (s) => {
  s.writes = S.lifecycleWrites("background", { turnRunning: true, ordersChanged: false });
  s.world = undefined;
});
Then("nothing new was saved", (s) => {
  expect(s.writes).toEqual([]);
  expect(storage(s).list()).toEqual(s.filesBefore);
});
Then("the previous Resume save and journal are used", (s) => {
  expect(s.cont.path).toBe(s.resume.path);
  expect(s.cont.journal).toBe("applied");
});
Then("turn {int} is processed again with the same result", (s, turn: number) => {
  const w: World = s.cont.opened.world;
  expect(w.turn).toBe(turn);
  processTurn(w, s.cont.orders, nationIndex(w, campaign(s).playerNation));
  expect(hashWorld(w)).toBe(s.expected);
});

Given(/^the game runs on (Steam|Android|iOS|the web|Android or iOS|desktop)$/, (s, p: string) => {
  s.platformName = p;
  s.platform = PLATFORMS[p] ?? (p === "the web" ? "web" : "android");
});
Given("a write takes {float} seconds", (s, sec: number) => {
  s.writeSeconds = sec;
});
When("the player quits", (s) => {
  s.closeAfter = S.desktopQuitSeconds(s.writeSeconds);
});
Then("the game closes after {float} seconds", (s, sec: number) => {
  expect(s.closeAfter).toBeCloseTo(sec);
});

// ================================================================ migrations

Given("format version {int} is released", (s, v: number) => {
  s.released = v;
});
When("a build changes the layout of the chunk {string}", (s, id: string) => {
  s.buildFv = S.nextFormatVersion(s.released, [id]);
});
Then("the build's formatVersion is {int}", (s, v: number) => {
  expect(s.buildFv).toBe(v);
  expect(S.nextFormatVersion(s.released, [])).toBe(s.released);
});

Given("a save with formatVersion {int}", (s, v: number) => {
  campaign(s);
  const w = write(s, "manual");
  s.saveBytes = reheader(w.bytes, (h) => (h.formatVersion = v));
  s.saveFv = v;
});
Given("the build has formatVersion {int}", (s, v: number) => {
  s.buildFv = v;
  s.migrationLog = [];
  s.migrationInputs = [];
  const step = (from: number): S.Migration => ({
    from,
    to: from + 1,
    run: (chunks) => {
      s.migrationLog.push(`${from} → ${from + 1}`);
      s.migrationInputs.push({ from, chunks });
      const out = new Map(chunks);
      const core = S.unpackChunk(chunks.get("core")!);
      out.set("core", S.packChunk("core", from + 1, { meta: { ...core.meta, migratedTo: from + 1 }, arrays: core.arrays }));
      return out;
    },
  });
  s.migrations = Array.from({ length: Math.max(0, v - (s.saveFv ?? v)) }, (_, k) => step((s.saveFv ?? v) + k));
});
Then("the migration {int} → {int} runs, then {int} → {int}", (s, a: number, b: number, c: number, d: number) => {
  expect(s.result.kind).toBe("opened");
  expect(s.migrationLog).toEqual([`${a} → ${b}`, `${c} → ${d}`]);
  expect(s.result.migrationsRun).toEqual(s.migrationLog);
});
Then("each migration is a pure function of the previous version's chunks", (s) => {
  for (const { from, chunks } of [...s.migrationInputs] as { from: number; chunks: Map<string, S.RawChunk> }[]) {
    const m = (s.migrations as S.Migration[]).find((x) => x.from === from)!;
    const copy = new Map([...chunks].map(([k, v]) => [k, { ...v, payload: v.payload.slice() }]));
    const a = m.run(chunks);
    const b = m.run(chunks);
    for (const [k, v] of a) expect(Buffer.from(v.payload).equals(Buffer.from(b.get(k)!.payload))).toBe(true);
    for (const [k, v] of copy) expect(Buffer.from(v.payload).equals(Buffer.from(chunks.get(k)!.payload))).toBe(true);
  }
});
Then("the result is validated", (s) => {
  expect(S.validateChunks(new Map([["core", {} as S.RawChunk]]))).not.toEqual([]);
  expect(s.result.kind).toBe("opened");
  expect(s.result.world.turn).toBe(world(s).turn);
});

function namedRules(provinceIds: string[], nationIds: string[], owners: (string | null)[]): Ruleset {
  const base = generateSyntheticRuleset(RULES, { provinces: provinceIds.length, nations: nationIds.length, seed: 4 });
  return {
    ...base,
    provinces: base.provinces.map((p, i) => ({
      ...p,
      id: provinceIds[i]!,
      name: provinceIds[i]!,
      owner: owners[i]!,
      population: 100,
      neighbors: provinceIds.filter((_, k) => Math.abs(k - i) === 1),
    })),
    nations: nationIds.map((id, k) => ({ id, name: id, color: "#808080", capital: provinceIds[owners.indexOf(id)]!, commanders: [] })).filter((n) => n.capital),
  };
}
Given("a save whose mapHash differs from the build's", (s) => {
  s.rules = namedRules(["old-1", "p2", "p3"], ["nation-a"], ["nation-a", "nation-a", null]);
  s.world = createWorld(s.rules, 1);
  s.world.provincePopulation[0] = 300;
  s.campaign = S.newCampaign(rng(s), { playerNation: "nation-a", nationName: "nation-a" });
  const w = write(s, "manual");
  // An older format: population was stored under another name; the migration renames it.
  s.saveBytes = reheader(
    w.bytes,
    (h) => (h.formatVersion = S.FORMAT_VERSION - 1),
    (chunks) => {
      const p = S.unpackChunk(chunks.get("provinces")!);
      const { population, wealth, ...rest } = p.arrays;
      void wealth;
      chunks.set("provinces", S.packChunk("provinces", 0, { meta: {}, arrays: { ...rest, people: population! } }));
    },
  );
  s.migrationLog = [];
  s.migrations = [
    {
      from: S.FORMAT_VERSION - 1,
      to: S.FORMAT_VERSION,
      run: (chunks: S.Chunks) => {
        s.migrationLog.push("migration");
        const out = new Map(chunks);
        const p = S.unpackChunk(chunks.get("provinces")!);
        const { people, ...rest } = p.arrays;
        out.set("provinces", S.packChunk("provinces", 1, { meta: {}, arrays: { ...rest, population: people! } }));
        return out;
      },
    },
  ];
});
Given("the map's rename table maps the province {string} to {string} and {string} with shares", (s, old: string, a: string, b: string) => {
  s.tables = { renames: { [old]: [{ id: a, share: 0.25 }, { id: b, share: 0.75 }] } };
  s.buildRules = namedRules([a, b, "p2", "p3"], ["nation-a"], ["nation-a", "nation-a", "nation-a", null]);
  s.buildRules.provinces.forEach((p: { wealth: number }, i: number) => (p.wealth = 7 + i));
});
Then("the format migrations run first", (s) => {
  expect(s.result.kind).toBe("opened");
  expect(s.migrationLog).toEqual(["migration"]);
  expect(s.result.mapped).toBe(true);
});
Then("provinces and nations are matched by id through the ids chunk", (s) => {
  const w: World = s.result.world;
  expect(w.provinceOwner[w.provinceIndex.get("p3")!]).toBe(-1);
  expect(w.provinceOwner[w.provinceIndex.get("p2")!]).toBe(w.nationIndex.get("nation-a"));
  expect(w.provincePopulation[w.provinceIndex.get("p2")!]).toBe(100);
});
Then("the province {string} is mapped onto {string} and {string} by those shares", (s, _old: string, a: string, b: string) => {
  const w: World = s.result.world;
  expect(w.provincePopulation[w.provinceIndex.get(a)!]).toBe(75);
  expect(w.provincePopulation[w.provinceIndex.get(b)!]).toBe(225);
  expect(w.provinceOwner[w.provinceIndex.get(a)!]).toBe(w.nationIndex.get("nation-a"));
});
Then("fields new in this build get their default value from the rules", (s) => {
  // The old layout had no wealth array: every province keeps the rules' wealth.
  const w: World = s.result.world;
  s.buildRules.provinces.forEach((p: { id: string; wealth: number }) => expect(w.provinceWealth[w.provinceIndex.get(p.id)!]).toBe(p.wealth));
});

Given("a save whose rulesHash differs from the build's", (s) => {
  s.rules = namedRules(["p1", "p2", "p3", "p4"], ["nation-a", "nation-b", "nation-c"], ["nation-a", "nation-b", "nation-c", "nation-a"]);
  s.world = createWorld(s.rules, 1);
  s.campaign = S.newCampaign(rng(s), { playerNation: "nation-b", nationName: "nation-b" });
  s.saveBytes = write(s, "manual").bytes;
});
Given("the build drops the nation {string}", (s, nation: string) => {
  const keep = ["nation-a", "nation-b", "nation-c"].filter((n) => n !== nation);
  const owners = ["nation-a", "nation-b", "nation-c", "nation-a"].map((o) => (o === nation ? null : o));
  s.buildRules = namedRules(["p1", "p2", "p3", "p4"], keep, owners);
  s.dropped = nation;
  expect(S.rulesHash(s.buildRules)).not.toBe(S.rulesHash(s.rules));
});
Given("the nation table maps {string} to {string}", (s, from: string, to: string) => {
  s.tables = { nations: { [from]: to } };
});
Given("the nation table has no entry for {string}", (s, _n: string) => {
  s.tables = { nations: {} };
});
Then("the provinces of {string} go to {string}", (s, from: string, to: string) => {
  expect(s.result.kind).toBe("opened");
  const w: World = s.result.world;
  const old = s.rules.provinces.filter((p: { owner: string }) => p.owner === from).map((p: { id: string }) => p.id);
  for (const id of old) expect(w.nationIds[w.provinceOwner[w.provinceIndex.get(id)!]!]).toBe(to);
});
Then("the provinces of {string} become unowned and a warning is logged, not an error", (s, from: string) => {
  expect(s.result.kind).toBe("opened");
  const w: World = s.result.world;
  const old = s.rules.provinces.filter((p: { owner: string }) => p.owner === from).map((p: { id: string }) => p.id);
  for (const id of old) expect(w.provinceOwner[w.provinceIndex.get(id)!]).toBe(-1);
  expect(s.result.warnings.some((x: string) => x.includes(from))).toBe(true);
});

When("the player tries to open it", (s) => loadSave(s));
Then("it is not opened", (s) => {
  expect(s.result.kind).toBe("rejected");
});

Given("a save from before a balance patch", (s) => {
  campaign(s);
  processTurn(world(s), [], 0);
  s.pre = write(s, "manual");
  s.saveBytes = s.pre.bytes;
});
When("it is loaded after the patch", (s) => {
  s.buildRules = { ...RULES, defines: { ...RULES.defines, economy: { ...RULES.defines.economy, goldPerThousandPeoplePerMonth: RULES.defines.economy.goldPerThousandPeoplePerMonth * 2 } } };
  loadSave(s);
});
Then("the turn already saved is unchanged", (s) => {
  expect(s.result.kind).toBe("opened");
  expect(s.result.loadedHash).toBe(s.pre.header.worldHash);
});
Then("the new rules apply from the next turn on with the saved Rng state", (s) => {
  const patched: World = s.result.world;
  expect(Array.from(patched.rng.state)).toEqual(Array.from(world(s).rng.state));
  const old = S.openSave(s.saveBytes, { rules: RULES, fullGame: true });
  if (old.kind !== "opened") throw new Error(old.kind);
  // Five weekly turns always include one in which a month begins and income is paid (X-18).
  for (let t = 0; t < 5; t++) {
    processTurn(patched, [], 0);
    processTurn(old.world, [], 0);
  }
  const n = patched.nationIndex.get("castile")!;
  // The AI pays its debt off with gold above a year's upkeep, so gold less debt shows the patch.
  expect(patched.nationTreasury[n]! - patched.nationDebt[n]!).not.toBeCloseTo(old.world.nationTreasury[n]! - old.world.nationDebt[n]!, 6);
  expect(patched.rules).toBe(s.buildRules);
});
Then("the save is not corrupted", (s) => {
  expect(S.openSave(s.saveBytes, { rules: RULES, fullGame: true }).kind).toBe("opened");
});

// ================================================================ integrity-and-testing

Given("a save with one flipped byte in a chunk", (s) => {
  campaign(s);
  const w = write(s, "manual");
  s.saveBytes = flip(w.bytes, chunkByte(w.bytes));
});
Given("a save with a province owner edited and CRCs fixed", (s) => {
  campaign(s);
  const w = write(s, "manual");
  s.saveBytes = reheader(
    w.bytes,
    () => {},
    (chunks) => {
      const p = S.unpackChunk(chunks.get("provinces")!);
      const owner = p.arrays.owner as Int16Array;
      owner[0] = owner[0] === 3 ? 4 : 3;
      chunks.set("provinces", S.packChunk("provinces", 1, p));
    },
  );
  expect(() => S.verifyCrcs(s.saveBytes)).not.toThrow();
});
Then("the problem is detected by the chunk's CRC-32", (s) => {
  expect(s.result.kind).toBe("rejected");
  expect(s.result.problem).toBe("damaged");
  expect(() => S.decodeSave(s.saveBytes)).toThrow(/CRC-32/);
});
Then("the problem is detected by the recomputed worldHash", (s) => {
  expect(s.result.kind).toBe("hash warning");
});

When("its bytes are read", (s) => {
  s.raw = s.last.bytes;
});
Then("the header is readable JSON and the chunks are plain deflate", (s) => {
  const len = new DataView(s.raw.buffer).getUint32(6, true);
  expect(() => JSON.parse(new TextDecoder().decode(s.raw.subarray(10, 10 + len)))).not.toThrow();
  for (const e of S.readTable(s.raw)) expect(() => inflateRawSync(s.raw.subarray(e.offset, e.offset + e.length))).not.toThrow();
});

Given("a save whose worldHash does not match its world", (s) => {
  s.hashMismatch = true;
});
Given("the save is not ironman", (s) => mismatched(s, false));
Given("the save is ironman", (s) => mismatched(s, true));
function mismatched(s: Scenario, ironman: boolean): void {
  campaign(s, "Castile", ironman);
  const w = write(s, ironman ? "ironman" : "manual");
  s.saveBytes = reheader(w.bytes, (h) => (h.worldHash = "00000000"));
}
When("the player opens it", (s) => {
  if (s.hashMismatch) {
    s.result = S.openSave(s.saveBytes, opener(s));
    if (s.result.kind === "hash warning") s.accepted = S.openSave(s.saveBytes, { ...opener(s), acceptModified: true });
    return;
  }
  if (s.cutFile) {
    s.cont = S.continueCampaign(storage(s), campaign(s).campaignId, opener(s));
    return;
  }
  s.result = S.openSave(s.lockedBytes, opener(s), nationName);
});
Then("a warning is shown, then it opens and is marked as modified in its header", (s) => {
  expect(s.result.kind).toBe("hash warning");
  expect(s.accepted.kind).toBe("opened");
  expect(s.accepted.header.modified).toBe(true);
});
Then("it does not open", (s) => {
  expect(s.result).toEqual({ kind: "refused", reason: "ironman save failed the hash check" });
});

Given("a save file cut short at any byte", (s) => {
  campaign(s);
  setDate(world(s), { y: 1511, m: 12 }, 800);
  s.prev = write(s, "resume");
  processTurn(world(s), [], 0);
  const w = write(s, "resume");
  s.full = w.bytes;
  s.cutFile = w.path;
  storage(s).files.set(w.path, w.bytes.subarray(0, Math.floor(w.bytes.length / 2)));
});
Then("it is rejected cleanly", (s) => {
  const full: Uint8Array = s.full;
  for (let k = 0; k < full.length; k++) {
    const r = S.openSave(full.subarray(0, k), opener(s));
    if (r.kind !== "rejected") throw new Error(`cut at ${k}: ${r.kind}`);
  }
});
Then("the previous save is offered", (s) => {
  expect(s.cont.path).toBe(s.prev.path);
  expect(s.cont.message).toBe("This save is damaged. The previous save from Dec 1511 was opened instead.");
});

Given("the player chooses to send a report", (s) => {
  campaign(s);
  s.resume = write(s, "resume");
  s.orders = someOrders(world(s), "castile", 1);
  s.journal = S.makeJournal(s.resume, s.orders);
  const w = createWorld(RULES, 7);
  processTurn(w, s.orders, nationIndex(w, "castile"));
  s.wentWrong = hashWorld(w);
});
When("the report is sent", (s) => {
  expect(S.bugReport(storage(s), campaign(s).campaignId, s.journal, false)).toBeUndefined();
  s.report = S.bugReport(storage(s), campaign(s).campaignId, s.journal, true);
});
Then("it carries the Resume save and the orders journal", (s) => {
  expect(Buffer.from(s.report.resume).equals(Buffer.from(s.resume.bytes))).toBe(true);
  expect(s.report.journal.orders).toEqual(s.orders);
});
Then("a developer can replay the exact turn that went wrong", (s) => {
  const r = S.openSave(s.report.resume, opener(s));
  if (r.kind !== "opened") throw new Error(r.kind);
  expect(S.journalApplies(s.report.journal, { turn: r.header.turn, hash: S.saveHash(s.report.resume) })).toBe(true);
  processTurn(r.world, s.report.journal.orders, nationIndex(r.world, "castile"));
  expect(hashWorld(r.world)).toBe(s.wentWrong);
});
Then("nothing was sent without the player's choice", (s) => {
  expect(S.bugReport(storage(s), campaign(s).campaignId, s.journal, false)).toBeUndefined();
});

Given("the save code is to be released", () => {});
When(
  /^the test "(save, load and save again gives byte-identical chunks and the same worldHash|a file cut short at any byte is rejected cleanly and the previous save offered|two devices with cloud on, played offline and reconnected, show both lines of play|two devices with one ironman campaign, played offline and reconnected, show the one prompt)" runs$/,
  (s, test: string) => {
    s.passed = RELEASE_TESTS[test]!(s);
  },
);
Then("it passes", (s) => {
  expect(s.passed).toBe(true);
});
const RELEASE_TESTS: Record<string, (s: Scenario) => boolean> = {
  "save, load and save again gives byte-identical chunks and the same worldHash": (s) => {
    campaign(s);
    processTurn(world(s), [], 0);
    const a = write(s, "manual");
    const r = S.openSave(a.bytes, opener(s));
    if (r.kind !== "opened") return false;
    const b = S.writeSave(ctx(s), campaign(s), r.world, "manual");
    const ta = S.readTable(a.bytes);
    const tb = S.readTable(b.bytes);
    return a.header.worldHash === b.header.worldHash && ta.every((e, i) => Buffer.from(a.bytes.subarray(e.offset, e.offset + e.length)).equals(Buffer.from(b.bytes.subarray(tb[i]!.offset, tb[i]!.offset + tb[i]!.length))));
  },
  "a file cut short at any byte is rejected cleanly and the previous save offered": (s) => {
    s.rules = SMALL;
    s.world = createWorld(SMALL, 3);
    s.campaign = S.newCampaign(rng(s), { playerNation: "N0", nationName: "Nation 0" });
    const prev = write(s, "resume");
    processTurn(world(s), [], 0);
    const w = write(s, "resume");
    for (let k = 0; k < w.bytes.length; k++) {
      if (S.openSave(w.bytes.subarray(0, k), opener(s)).kind !== "rejected") return false;
      if (k % 97 !== 0 && k !== w.bytes.length - 1) continue;
      storage(s).files.set(w.path, w.bytes.subarray(0, k));
      const r = S.continueCampaign(storage(s), campaign(s).campaignId, opener(s));
      if ("error" in r || r.path !== prev.path || !r.message) return false;
    }
    return true;
  },
  "two devices with cloud on, played offline and reconnected, show both lines of play": (s) => {
    const deck = dev(s, "Steam Deck");
    const pixel = dev(s, "Pixel 8");
    const c = playOffline(s, deck, "Portugal", 1);
    playOffline(s, pixel, "Portugal", 1, c);
    sync(s, deck);
    sync(s, pixel);
    sync(s, deck);
    const devices = new Set([...loadScreen(deck).values()]);
    return devices.has("Steam Deck") && devices.has("Pixel 8");
  },
  "two devices with one ironman campaign, played offline and reconnected, show the one prompt": (s) => {
    splitSetup(s, { y: 1530, m: 6 }, { y: 1528, m: 2 });
    return s.prompts === 1;
  },
};

// ================================================================ free-tier-saves

Given("the game is the free mobile tier", (s) => {
  s.fullGame = false;
  s.platform = "android";
});
Given("the game is the free mobile tier without the full game", (s) => {
  s.fullGame = false;
  s.platform = "android";
});
Given("the player has a campaign as {string}", (s, nation: string) => {
  campaign(s, nation);
  write(s, "resume");
  write(s, "manual");
  s.filesBefore = new Map([...storage(s).files].map(([k, v]) => [k, v.slice()]));
});
When("the player buys the full game", (s) => {
  s.fullGame = true;
});
Then("the same saves stay in place", (s) => {
  for (const [p, b] of s.filesBefore as Map<string, Uint8Array>) expect(Buffer.from(storage(s).read(p)!).equals(Buffer.from(b))).toBe(true);
  for (const e of S.entries(storage(s))) expect(S.openSave(storage(s).read(e.path)!, opener(s)).kind).toBe("opened");
});
Then("locked nations become playable", (s) => {
  const pt = S.buildSave(ctx(s), S.newCampaign(rng(s), { playerNation: "portugal", nationName: "Portugal" }), world(s), "manual");
  expect(pt.header.tier.needsFullGame).toBe(true);
  expect(S.openSave(pt.bytes, { rules: RULES, fullGame: true }).kind).toBe("opened");
  expect(S.openSave(pt.bytes, { rules: RULES, fullGame: false }).kind).toBe("locked");
});
When("a save of the nation {string} is written", (s, nation: string) => {
  s.campaign = undefined;
  campaign(s, nation);
  write(s, "manual");
});
Then("its header's tier has nation {string} and needsFullGame {word}", (s, nation: string, needs: string) => {
  expect(s.last.header.tier).toEqual({ nation: nationId(nation), needsFullGame: needs === "true", app: "full" });
});
Given("a save of the nation {string} exists", (s, nation: string) => {
  s.campaign = undefined;
  campaign(s, nation);
  s.lockedSave = write(s, "resume");
  s.lockedBytes = s.lockedSave.bytes;
});
Then("the message {string} is shown with the unlock screen", (s, msg: string) => {
  expect(s.result.kind).toBe("locked");
  expect(s.result.message).toBe(msg);
});
Then("the save is not deleted", (s) => {
  expect(storage(s).read(s.lockedSave.path)).toBeDefined();
});
Given("the player bought the full game and has a campaign as {string}", (s, nation: string) => {
  s.fullGame = true;
  campaign(s, nation);
  write(s, "resume");
  write(s, "manual");
  s.count = storage(s).list().length;
});
When("the purchase is refunded", (s) => {
  s.fullGame = false;
});
Then("the saves of {string} stay", (s, nation: string) => {
  expect(storage(s).list()).toHaveLength(s.count);
  expect(S.entries(storage(s)).every((e) => e.header.playerNation === nationId(nation))).toBe(true);
});
Then("opening one asks to unlock {string} again", (s, nation: string) => {
  const e = S.entries(storage(s))[0]!;
  const r = S.openSave(storage(s).read(e.path)!, opener(s), nationName);
  expect(r.kind).toBe("locked");
  expect(r.kind === "locked" && r.nation).toBe(nationId(nation));
});

Given("the Steam demo has saves in its save folder", (s) => {
  s.demo = S.memoryStorage();
  s.storage = s.demo;
  campaign(s);
  write(s, "resume");
  write(s, "manual");
  s.storage = S.memoryStorage();
});
When("the full game launches for the first time on the same computer", (s) => {
  s.copied = S.importDemoSaves(s.demo, storage(s), true);
});
Then("it finds the demo's saves under the same save folder name", (s) => {
  expect(s.copied.sort()).toEqual(s.demo.list());
});
Then("copies them into its own folder", (s) => {
  for (const p of s.demo.list()) expect(Buffer.from(storage(s).read(p)!).equals(Buffer.from(s.demo.read(p)!))).toBe(true);
  expect(S.importDemoSaves(s.demo, storage(s), false)).toEqual([]);
});
Then("Steam Cloud keeps them from then on", (s) => {
  expect(S.storeBackup("steam").method).toBe("auto_cloud");
  expect(S.syncedSet(S.entries(storage(s))).length).toBeGreaterThan(0);
});

Given("the player played the Steam demo signed in", (s) => {
  const demo = dev(s, "Steam Deck");
  playOffline(s, demo, "France", 1);
  s.demoDev = demo;
  s.how = "server";
});
Given("the player played the Steam demo without an account", (s) => {
  s.demoDev = { name: "Steam Deck", storage: S.memoryStorage(), rng: new Rng(5) };
  playOffline(s, s.demoDev, "France", 1);
  s.how = "files";
});
When("the player opens the full game on another device", (s) => {
  const d: Dev = s.demoDev;
  if (s.how === "server") {
    sync(s, d);
    s.other = dev(s, "Pixel 8");
    sync(s, s.other);
    return;
  }
  s.other = { name: "Pixel 8", storage: S.memoryStorage(), rng: new Rng(6) };
  for (const e of S.entries(d.storage)) {
    if (e.header.kind !== "resume") continue;
    const f = S.exportSave("desktop", e, d.storage.read(e.path)!);
    s.imported = S.importSave(devCtx(s, s.other), f.bytes);
  }
});
Then("the demo saves arrive through our server", (s) => {
  const other: Dev = s.other;
  const ids = new Set(S.entries(other.storage).map((e) => e.header.saveId));
  const demoResume = S.entries(s.demoDev.storage).filter((e) => e.header.kind === "resume")[0]!;
  expect(ids.has(demoResume.header.saveId)).toBe(true);
});
Then("the demo saves arrive by Export and Import", (s) => {
  expect(s.imported.kind).toBe("imported");
  expect(S.entries(s.other.storage)).toHaveLength(1);
});

// ================================================================ ironman

Given("the player begins a campaign with ironman {word}", (s, on: string) => {
  campaign(s, "Castile", on === "on");
});
When("the player looks for a way to change ironman later", (s) => {
  s.changeable = S.canChangeIronman(campaign(s));
});
Then("the campaign stays ironman", (s) => {
  expect(s.changeable).toBe(false);
  expect(campaign(s).ironman).toBe(true);
});
Then("the campaign stays not ironman", (s) => {
  expect(s.changeable).toBe(false);
  expect(campaign(s).ironman).toBe(false);
});
When("the player tries to make a manual save", (s) => {
  s.possible = S.allowed(campaign(s), "manual save") && S.newManualSave(S.entries(storage(s)), campaign(s), { y: 1444, m: 11 }).action === "write";
  expect(() => write(s, "manual")).toThrow();
});
When("the player tries to load an earlier point", (s) => {
  s.possible = S.allowed(campaign(s), "load an earlier point");
});
When("the player tries to open a console or debug tool", (s) => {
  s.possible = S.allowed(campaign(s), "console");
});
Then("it is not possible", (s) => {
  expect(s.possible).toBe(false);
});
When("the player exits to the main menu", (s) => {
  expect(S.ironmanWrites("exit_to_menu")).toBe(true);
  s.exitWrite = write(s, "ironman");
});

Given("the ironman campaign as {string} is on the {string}", (s, nation: string, device: string) => {
  const d = dev(s, device);
  s.ironmanCampaign = S.newCampaign(d.rng, { playerNation: nationId(nation), nationName: nation, ironman: true });
  const w = createWorld(RULES, 7);
  s.deckSave = S.writeSave(devCtx(s, d), s.ironmanCampaign, w, "ironman");
  sync(s, d);
});
When("the player exports it and imports it on the {string}", (s, device: string) => {
  const deck = dev(s, "Steam Deck");
  const file = S.exportSave("desktop", { path: s.deckSave.path, header: s.deckSave.header }, s.deckSave.bytes);
  expect(S.allowed(s.ironmanCampaign, "export")).toBe(true);
  const other = dev(s, device);
  s.imported = S.importSave(devCtx(s, other), file.bytes);
  sync(s, other);
  void deck;
});
Then("the campaign starts on the {string}", (s, device: string) => {
  expect(s.imported.kind).toBe("imported");
  expect(s.imported.entry.header.kind).toBe("ironman");
  expect(s.imported.entry.header.device).toBe(device);
  expect(server(s).heads.get(s.ironmanCampaign.campaignId)).toBe(s.imported.entry.header.saveId);
});
Then("the copy on the {string} is no longer the newest", (s, device: string) => {
  const all = [...S.entries(dev(s, device).storage), s.imported.entry];
  const newest = all.filter((e) => e.header.campaignId === s.ironmanCampaign.campaignId).sort((a, b) => b.header.savedAt - a.header.savedAt)[0]!;
  expect(newest.header.device).not.toBe(device);
  expect(server(s).heads.get(s.ironmanCampaign.campaignId)).not.toBe(s.deckSave.header.saveId);
});

Given("the ironman campaign's newest save on the server is {string}", (s, head: string) => {
  campaign(s, "Castile", true);
  server(s).heads.set(campaign(s).campaignId, head);
  s.serverDev = dev(s, "Pixel 8");
});
When("a device uploads an ironman save whose parent is {string}", (s, parent: string) => {
  const c: S.Campaign = { ...campaign(s), ironmanHead: parent };
  const d: Dev = s.serverDev;
  const w = S.writeSave(devCtx(s, d), c, world(s), "ironman", { saveId: "i9" });
  expect(w.header.parent).toBe(parent);
  s.upload = S.putSave(server(s), d.client.deviceToken!, S.rowOf("", w.header, w.bytes.length), w.bytes, s.now);
});
Then("the server accepts it and it becomes the head", (s) => {
  expect(s.upload).toEqual({ ok: true });
  expect(server(s).heads.get(campaign(s).campaignId)).toBe("i9");
});
Then("the server rejects it and the device is told to load the newer game first", (s) => {
  expect(s.upload).toEqual({ ok: false, refusal: "load the newer game first" });
  expect(C.messages.load_newer_first).toBe("Load the newer game first.");
  expect(server(s).heads.get(campaign(s).campaignId)).toBe("i8");
});

function splitSetup(s: Scenario, deckDate: { y: number; m: number }, phoneDate: { y: number; m: number }): void {
  const deck = dev(s, "Steam Deck");
  const phone = dev(s, "this phone");
  const c = S.newCampaign(deck.rng, { playerNation: "castile", nationName: "Castile", ironman: true });
  const w0 = createWorld(RULES, 7);
  const first = S.writeSave(devCtx(s, deck), c, w0, "ironman");
  sync(s, deck);
  sync(s, phone);
  // Each plays on from the same save, offline.
  const play = (d: Dev, date: { y: number; m: number }, turns: number) => {
    const camp: S.Campaign = { ...c, ironmanHead: first.header.saveId };
    const w = createWorld(RULES, 7);
    for (let t = 0; t < turns; t++) processTurn(w, [], 0);
    for (let k = 0; k < 2; k++) {
      w.date = { year: date.y, month: date.m };
      w.turn += k;
      S.writeSave(devCtx(s, d), camp, w, "ironman");
    }
  };
  play(deck, deckDate, 4);
  play(phone, phoneDate, 2);
  sync(s, deck);
  const r = sync(s, phone);
  s.phoneRun = r;
  s.prompts = new Set(r.askPlayer.filter((x) => x.refusal === "load the newer game first").map((x) => S.readHeader(phone.storage.read(x.path)!).campaignId)).size;
  s.splitCampaign = c;
}
Given("the ironman campaign was played offline on a {string} to {word} {int} and on this phone to {word} {int}", (s, device: string, m1: string, y1: number, m2: string, y2: number) => {
  expect(device).toBe("Steam Deck");
  s.dates = [{ y: y1, m: monthOf(m1) }, { y: y2, m: monthOf(m2) }];
});
When("the server rejects the phone's upload because the line has split", (s) => {
  splitSetup(s, s.dates[0], s.dates[1]);
  expect(s.phoneRun.askPlayer.length).toBeGreaterThan(0);
});
Then("the game asks once {string}", (s, q: string) => {
  expect(s.prompts).toBe(1);
  const phone = dev(s, "this phone");
  const deckRow = [...phone.client.known.values()].filter((r) => r.device === "Steam Deck" && r.kind === "ironman").sort((a, b) => b.savedAt - a.savedAt)[0]!;
  const mineNewest = S.entries(phone.storage).filter((e) => e.header.device === "this phone").sort((a, b) => b.header.savedAt - a.header.savedAt)[0]!.header;
  s.split = S.ironmanSplitQuestion({ device: deckRow.device, date: deckRow.date, turn: deckRow.turn }, { device: mineNewest.device, date: mineNewest.date, turn: mineNewest.turn });
  expect(s.split.question).toBe(q);
});
Then("the game from the {string} is the recommended option", (s, device: string) => {
  expect(device).toBe("Steam Deck");
  expect(s.split.recommended).toBe("a");
});
When("the player picks one", (s) => {
  s.removedLine = S.keepIronmanLine(dev(s, "this phone").storage, s.splitCampaign.campaignId, "Steam Deck");
});
Then("the other line is removed", (s) => {
  expect(s.removedLine.length).toBe(2);
  expect(S.entries(dev(s, "this phone").storage).some((e) => e.header.device === "this phone")).toBe(false);
});

Given("the ironman save of turn {int} is damaged", (s, turn: number) => {
  campaign(s, "Castile", true);
  world(s).turn = turn - 1;
  s.backup = write(s, "ironman");
  world(s).turn = turn;
  const w = write(s, "ironman");
  storage(s).files.set(w.path, flip(w.bytes, chunkByte(w.bytes)));
});
Given("its backup is turn {int}", (s, turn: number) => {
  expect(s.backup.header.turn).toBe(turn);
});
Then("the backup of turn {int} is opened", (s, turn: number) => {
  expect(s.cont.opened.header.turn).toBe(turn);
  expect(s.cont.path).toBe(s.backup.path);
});
Then("the player is told", (s) => {
  expect(s.cont.message).toMatch(/^This save is damaged\. The previous save from .+ was opened instead\.$/);
});

// ================================================================ backups-export-import

When("the game writes saves to {string}", (s, folder: string) => {
  s.folder = folder;
  s.backup = S.storeBackup("steam");
});
Then("Steam Auto-Cloud covers the synced set in that folder", (s) => {
  expect(s.backup.method).toBe("auto_cloud");
  expect(s.backup.folder).toBe(s.folder);
  expect(C.cloud.synced).toEqual({ manual: "all", resume: "latest", ironman: "latest", autosave: "latest" });
});
Then("root overrides map the Windows, macOS and Linux paths onto one cloud folder", (s) => {
  expect(s.backup.root_overrides).toEqual(["windows", "macos", "linux"]);
});
Then("the quota is {int} MB and {word} files", (s, mb: number, files: string) => {
  expect(s.backup.quota_mb).toBe(mb);
  expect(s.backup.quota_files).toBe(Number(files.replace(/,/g, "")));
});
Then("Dynamic Cloud Sync uploads saves of a suspended Deck after the suspend hook has written them", (s) => {
  expect(s.backup.dynamic_cloud_sync).toBe(true);
  expect(S.platformMoment("desktop", "powerMonitor suspend")).toBe("suspend");
  expect(S.lifecycleWrites("suspend", { turnRunning: false, ordersChanged: true })).toEqual(["orders journal"]);
});
Given("the player is signed in and uses Steam Auto-Cloud", (s) => {
  s.deck = dev(s, "Steam Deck");
  s.pixel = dev(s, "Pixel 8");
});
When("both add files to the save folder", (s) => {
  const c = playOffline(s, s.deck, "Portugal", 2);
  playOffline(s, s.pixel, "Portugal", 2, c);
  sync(s, s.pixel);
  s.deck.storage.log.length = 0;
  sync(s, s.deck);
});
Then("no two files share a name", (s) => {
  const names = S.entries(s.deck.storage).map((e) => e.path);
  expect(new Set(names).size).toBe(names.length);
  expect(S.entries(s.deck.storage).some((e) => e.header.device === "Pixel 8")).toBe(true);
});
Then("Steam's conflict dialog does not appear", (s) => {
  // A conflict needs one file name changed on two sides; every write here is a new name.
  const writes = (s.deck.storage.log as string[]).filter((l) => l.startsWith("rename ")).map((l) => l.split(" ")[2]);
  const before = S.entries(s.deck.storage).map((e) => e.path).filter((p) => !writes.includes(p));
  for (const w of writes) expect(before).not.toContain(w);
});
When("Auto Backup runs", (s) => {
  s.backup = S.storeBackup("android");
});
Then("it includes the synced set through the backup rules file within {int} MB", (s, mb: number) => {
  expect(s.backup.auto_backup).toBe(true);
  expect(s.backup.limit_mb).toBe(mb);
});
Then("it excludes the orders journal", () => {
  expect(C.cloud.local_only).toContain("orders_journal");
});
When("the device makes its iCloud backup", (s) => {
  s.backup = S.storeBackup("ios");
});
Then("the save folder is included", (s) => {
  expect(s.backup.device_backup).toBe(true);
});
When("the game starts", (s) => {
  s.backup = S.storeBackup("web");
});
Then("saves live in IndexedDB", (s) => {
  expect(s.backup.indexeddb_persist).toBe(true);
});
Then("the game asks for persistent storage", (s) => {
  expect(s.backup.indexeddb_persist).toBe(true);
});
Then("no store backup exists, so signing in is how the player keeps saves", (s) => {
  expect(Object.keys(s.backup)).toEqual(["indexeddb_persist"]);
});
When("saves are backed up", (s) => {
  s.notUsed = C.cloud.store_backups.not_used;
});
Then("Play Games saved games and an iCloud Documents container are not used", (s) => {
  expect(s.notUsed).toEqual(["Play Games saved games", "iCloud Documents container"]);
  for (const p of ["android", "ios"] as const) expect(JSON.stringify(S.storeBackup(p))).not.toMatch(/play_games|icloud_documents/i);
});
When("the player exports the save {string}", (s, name: string) => {
  campaign(s);
  setDate(world(s), parseDate(name.split(", ")[1]!));
  const w = write(s, "manual", { name });
  s.exported = S.exportSave(s.platform, { path: w.path, header: w.header }, w.bytes);
});
Then(/^a "\.phsave" file is offered through (the share sheet|a save dialog)$/, (s, way: string) => {
  expect(s.exported.fileName.endsWith(".phsave")).toBe(true);
  expect(s.exported.via).toBe(way.replace(/^(the|a) /, ""));
});
Given("a {string} file with a good magic, CRCs and worldHash", (s, ext: string) => {
  expect(ext).toBe(".phsave");
  campaign(s);
  const other: S.MemoryStorage = S.memoryStorage();
  s.fileBytes = S.writeSave({ ...ctx(s), storage: other }, campaign(s), world(s), "manual").bytes;
});
Given("a {string} file with a wrong magic", (s, ext: string) => {
  expect(ext).toBe(".phsave");
  campaign(s);
  s.fileBytes = flip(S.buildSave(ctx(s), campaign(s), world(s), "manual").bytes, 0);
});
When(/^the player imports it from (the file picker|Files|a download)$/, (s) => {
  s.imported = S.importSave(ctx(s), s.fileBytes);
});
Then("it joins the Manual saves", (s) => {
  expect(s.imported.kind).toBe("imported");
  expect(mine(s, "manual").map((e) => e.path)).toContain(s.imported.entry.path);
});
Then("it is rejected", (s) => {
  expect(s.imported.kind).toBe("rejected");
  expect(storage(s).list()).toHaveLength(0);
});
Given("a {string} file of the nation {string} with needsFullGame true", (s, _ext: string, nation: string) => {
  const c = S.newCampaign(new Rng(3), { playerNation: nationId(nation), nationName: nation });
  s.fileBytes = S.buildSave({ ...ctx(s), storage: S.memoryStorage() }, c, world(s), "manual").bytes;
  expect(S.readHeader(s.fileBytes).tier.needsFullGame).toBe(true);
});
When("the player imports and opens it", (s) => {
  s.imported = S.importSave(ctx(s), s.fileBytes);
  s.result = S.openSave(storage(s).read(s.imported.entry.path)!, opener(s), nationName);
});
Then("the unlock screen is shown", (s) => {
  expect(s.result.kind).toBe("locked");
});

// ================================================================ cloud-sync

Given("the player has no account", (s) => {
  s.noAccount = true;
});
Given("the device is offline", (s) => {
  s.offline = true;
  if (s.mainDev) s.mainDev.client.online = false;
});
When("the player plays and saves a campaign", (s) => {
  const d = dev(s, "Pixel 8", false);
  d.client.online = !s.offline;
  campaign(s);
  processTurn(world(s), [], 0);
  s.storage = d.storage;
  s.w = write(s, "manual");
  S.queueUpload(d.client, s.w.path);
  s.run = S.runQueue(d.client, uploader(s, d), s.now);
  s.mainDev = d;
});
Then("everything works except cloud sync", (s) => {
  expect(S.openSave(storage(s).read(s.w.path)!, opener(s)).kind).toBe("opened");
  expect(s.run.uploaded).toEqual([]);
  expect(S.maySync(s.mainDev.client)).toBe(false);
  expect(s.mainDev.client.queue).toHaveLength(1);
});
Given("the player is signed in on a {string} and a {string}", (s, a: string, b: string) => {
  dev(s, a);
  dev(s, b);
  s.pairNames = [a, b];
});
Given("both played different campaigns offline", (s) => {
  const [a, b] = (s.pairNames as string[]).map((n) => dev(s, n));
  playOffline(s, a!, "Portugal", 2);
  playOffline(s, b!, "Castile", 2);
});
When("both come online and sync", (s) => {
  const [a, b] = (s.pairNames as string[]).map((n) => dev(s, n));
  sync(s, a!);
  sync(s, b!);
  sync(s, a!);
});
Then("each device's Load screen shows the saves of both, each marked with the device that made it", (s) => {
  for (const n of s.pairNames as string[]) {
    const devices = new Set(loadScreen(dev(s, n)).values());
    expect([...devices].sort()).toEqual([...(s.pairNames as string[])].sort());
  }
});
Then("Continue picks the newest of them", (s) => {
  const all = (s.pairNames as string[]).flatMap((n) => S.entries(dev(s, n).storage));
  const newest = all.filter((e) => e.header.kind === "resume").sort((a, b) => b.header.savedAt - a.header.savedAt)[0]!;
  for (const n of s.pairNames as string[]) {
    const t = S.continueTarget(S.entries(dev(s, n).storage), n, nationName)!;
    expect(t.entry.header.saveId).toBe(newest.header.saveId);
  }
});
Then("every file name has the form {string}", (s, _form: string) => {
  for (const n of s.pairNames as string[]) for (const e of S.entries(dev(s, n).storage)) expect(e.path).toBe(`${e.header.campaignId}/${e.header.savedAt}-${e.header.saveId}.phsave`);
});
Given("the non-ironman campaign as {string} was continued offline on a {string} and on a {string}", (s, nation: string, a: string, b: string) => {
  s.pairNames = [a, b];
  const da = dev(s, a);
  const db = dev(s, b);
  const c = playOffline(s, da, nation, 1);
  playOffline(s, db, nation, 1, c);
  s.lineCampaign = c;
});
When("both sync", (s) => {
  const [a, b] = (s.pairNames as string[]).map((n) => dev(s, n));
  s.runs = [sync(s, a!), sync(s, b!), sync(s, a!)];
});
Then("both lines of play are kept", (s) => {
  const rows = [...server(s).rows.values()].filter((r) => r.campaignId === s.lineCampaign.campaignId && r.kind === "resume");
  expect(new Set(rows.map((r) => r.device))).toEqual(new Set(s.pairNames));
});
Then("the Load screen shows them as separate saves", (s) => {
  const screen = loadScreen(dev(s, s.pairNames[0]));
  const autos = [...server(s).rows.values()].filter((r) => r.campaignId === s.lineCampaign.campaignId && r.kind === "autosave");
  expect(autos.length).toBe(2);
  for (const r of autos) expect(screen.get(r.saveId)).toBe(r.device);
});
Then("no error is shown", (s) => {
  for (const r of s.runs as ReturnType<typeof S.runQueue>[]) {
    expect(r.failed).toEqual([]);
    expect(r.askPlayer).toEqual([]);
  }
});

Given("the player is signed in", (s) => {
  s.mainDev = dev(s, "Pixel 8");
  s.signedInDev = s.mainDev;
});
Given(/^the campaign has a "(manual save|latest Resume save|latest ironman save|newest autosave|older autosave|backup Resume save|orders journal)"$/, (s, what: string) => {
  const d: Dev = s.mainDev;
  const ctxd = () => devCtx(s, d);
  const plain = S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" });
  const iron = S.newCampaign(d.rng, { playerNation: "france", nationName: "France", ironman: true });
  const w = createWorld(RULES, 7);
  const made: Record<string, S.Written> = {};
  made["backup Resume save"] = S.writeSave(ctxd(), plain, w, "resume");
  made["older autosave"] = S.writeSave(ctxd(), plain, w, "autosave");
  made["manual save"] = S.writeSave(ctxd(), plain, w, "manual");
  made["newest autosave"] = S.writeSave(ctxd(), plain, w, "autosave");
  made["latest Resume save"] = S.writeSave(ctxd(), plain, w, "resume");
  S.writeSave(ctxd(), iron, w, "ironman");
  made["latest ironman save"] = S.writeSave(ctxd(), iron, w, "ironman");
  s.journal = S.makeJournal(made["latest Resume save"], someOrders(w, "castile", 2));
  s.what = what;
  s.made = made;
});
When("the device syncs", (s) => {
  s.run = sync(s, s.mainDev);
});
Then("that save is uploaded", (s) => {
  const w: S.Written = s.made[s.what];
  expect(server(s).rows.has(w.header.saveId)).toBe(true);
});
Then("that save is kept local only", (s) => {
  if (s.what === "orders journal") {
    const blobs = [...server(s).objects.values()];
    expect(blobs.every((b) => S.readHeader(b).saveId !== undefined)).toBe(true);
    expect(C.cloud.local_only).toContain("orders_journal");
    expect(s.mainDev.client.queue.every((q: S.QueueItem) => q.path.endsWith(".phsave"))).toBe(true);
    return;
  }
  const w: S.Written = s.made[s.what];
  expect(server(s).rows.has(w.header.saveId)).toBe(false);
});

When("the player deletes the campaign as {string}", (s, nation: string) => {
  const d: Dev = s.mainDev;
  const c = playOffline(s, d, nation, 2);
  sync(s, d);
  const other = dev(s, "Steam Deck");
  sync(s, other);
  s.otherKnew = [...other.client.known.values()].filter((r) => r.campaignId === c.campaignId).length;
  S.deleteCampaign(d.storage, c.campaignId);
  S.deleteCloudCampaign(server(s), d.client.deviceToken!, c.campaignId, s.now);
  s.deletedCampaign = c;
});
Then("the server tombstones every save of that campaign", (s) => {
  const rows = [...server(s).rows.values()].filter((r) => r.campaignId === s.deletedCampaign.campaignId);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((r) => r.deletedAt !== null)).toBe(true);
});
Then("other devices remove it on their next sync", (s) => {
  const other = dev(s, "Steam Deck");
  expect(s.otherKnew).toBeGreaterThan(0);
  sync(s, other);
  expect([...other.client.known.values()].some((r) => r.campaignId === s.deletedCampaign.campaignId)).toBe(false);
  expect(S.entries(other.storage).some((e) => e.header.campaignId === s.deletedCampaign.campaignId)).toBe(false);
});

When("the player signs in with email and password", (s) => {
  server(s);
  s.session = S.signIn(server(s), "player@example.org", "secret", "my device", s.platform);
});
Then("the server returns a short-lived access token and a long-lived device token", (s) => {
  expect(s.session.accessToken).toBeTruthy();
  expect(s.session.accessTtl).toBe("short");
  expect(s.session.deviceToken).toBeTruthy();
  expect(s.session.deviceTtl).toBe("long");
});
Then(/^the device token is kept in (Keychain|Keystore|safeStorage)$/, (s, where: string) => {
  expect(s.session.keptIn).toBe(where);
});
Then("the device appears in the account's device list", (s) => {
  const acc = S.authorise(server(s), s.session.deviceToken)!;
  expect(acc.devices.map((d) => d.name)).toContain("my device");
});
When("the player signs out the {string} from the {string}", (s, target: string, from: string) => {
  expect(S.signOutDevice(server(s), dev(s, from).client.deviceToken!, target)).toBe(true);
});
Then("the {string} no longer syncs", (s, name: string) => {
  const d = dev(s, name);
  expect(S.authorise(server(s), d.client.deviceToken!)).toBeUndefined();
  expect(S.changesSince(server(s), d.client.deviceToken!, 0)).toBeUndefined();
  expect(S.authorise(server(s), dev(s, "Pixel 8").client.deviceToken!)).toBeDefined();
});
Given("the player has an account with saves on the server", (s) => {
  s.mainDev = dev(s, "Pixel 8");
  playOffline(s, s.mainDev, "Castile", 1);
  sync(s, s.mainDev);
  expect(server(s).rows.size).toBeGreaterThan(0);
});
When("the player asks for a password reset", (s) => {
  S.requestPasswordReset(server(s), "player@example.org");
});
When("the player deletes the account", (s) => {
  expect(S.deleteAccount(server(s), s.mainDev.client.deviceToken)).toBe(true);
});
Then("a reset email is sent", (s) => {
  expect(server(s).outbox).toEqual([{ to: "player@example.org", subject: "password reset" }]);
});
Then("the account and every save are deleted", (s) => {
  expect(server(s).accounts.size).toBe(0);
  expect(server(s).rows.size).toBe(0);
  expect(server(s).objects.size).toBe(0);
});
Given("the game is at launch", () => {});
When("the sign-in options are listed on {string}", (s, platform: string) => {
  s.options = S.signInOptions(PLATFORMS[platform] ?? platform.toLowerCase(), s.later ?? []);
});
Then("{string} are offered", (s, opts: string) => {
  expect(s.options.join(", ")).toBe(opts);
});
Given("a later version offers Google sign-in", (s) => {
  s.later = ["Google"];
});
Then("Sign in with Apple is offered as well", (s) => {
  expect(s.options).toContain("Google");
  expect(s.options).toContain("Sign in with Apple");
});

Given("the player is signed in with the account {string}", (s, acc: string) => {
  s.accountId = acc;
  s.mainDev = dev(s, "Pixel 8");
});
When("the save {string} of the campaign {string} uploads", (s, saveId: string, campaignId: string) => {
  const d: Dev = s.mainDev;
  const c = { ...S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" }), campaignId };
  const w = S.writeSave(devCtx(s, d), c, createWorld(RULES, 7), "manual", { saveId });
  s.up = S.putSave(server(s), d.client.deviceToken!, S.rowOf("", w.header, w.bytes.length), w.bytes, s.now);
  s.upBytes = w.bytes;
  s.upId = saveId;
});
Then("a Save row holds account, campaign, save id, kind, name, saved at, device, platform, game version, format version, turn, date, nation, ironman, size and deleted at", (s) => {
  expect(s.up).toEqual({ ok: true });
  const row = server(s).rows.get(s.upId)!;
  expect(Object.keys(row)).toHaveLength(S.SAVE_ROW_FIELDS.length);
  expect(row.account).toBe(s.accountId);
  expect(row.size).toBe(s.upBytes.length);
  expect(row.deletedAt).toBeNull();
});
Then("the bytes go to object storage at {string}", (s, key: string) => {
  expect(server(s).objects.has(key)).toBe(true);
});
Then("the bytes are not in the database", (s) => {
  const row = server(s).rows.get(s.upId)!;
  expect(Object.values(row).some((v) => v instanceof Uint8Array)).toBe(false);
});

Given("the save {string} is on the server", (s, saveId: string) => {
  s.mainDev = dev(s, "Pixel 8");
  const d: Dev = s.mainDev;
  const w = S.writeSave(devCtx(s, d), campaign(s), world(s), "manual", { saveId });
  expect(S.putSave(server(s), d.client.deviceToken!, S.rowOf("", w.header, w.bytes.length), w.bytes, s.now)).toEqual({ ok: true });
  s.other = dev(s, "Steam Deck");
  S.fetchChanges(s.other.client, server(s));
  expect(s.other.client.known.has(saveId)).toBe(true);
  s.upId = saveId;
  s.key = S.objectKey(S.authorise(server(s), d.client.deviceToken!)!.id, campaign(s).campaignId, saveId);
});
When("the player removes it", (s) => {
  s.removedAt = s.now;
  expect(S.deleteCloudSave(server(s), s.mainDev.client.deviceToken, s.upId, s.removedAt)).toBe(true);
});
Then("the server marks it deleted with a tombstone", (s) => {
  expect(server(s).rows.get(s.upId)!.deletedAt).toBe(s.removedAt);
});
Then("other devices learn of it through the changes list", (s) => {
  const r = S.fetchChanges(s.other.client, server(s));
  expect(r.removed).toEqual([s.upId]);
  expect(s.other.client.known.has(s.upId)).toBe(false);
});
Then("its bytes are purged after {int} days", (s, days: number) => {
  const day = 86_400_000;
  expect(S.purge(server(s), s.removedAt + (days - 1) * day)).toEqual([]);
  expect(server(s).objects.has(s.key)).toBe(true);
  expect(S.purge(server(s), s.removedAt + days * day)).toEqual([s.upId]);
  expect(server(s).objects.has(s.key)).toBe(false);
});

When("the game calls {string}", (s, call: string) => {
  const d: Dev = s.mainDev;
  const token = d.client.deviceToken!;
  const c = playOffline(s, d, "Castile", 1);
  const files = S.entries(d.storage);
  const one = files[0]!;
  const bytes = d.storage.read(one.path)!;
  const put = () => S.putSave(server(s), token, S.rowOf("", one.header, bytes.length), bytes, s.now);
  s.call = call;
  if (call.startsWith("GET /api/saves?")) {
    put();
    s.callResult = S.changesSince(server(s), token, 0);
    s.callResult2 = S.changesSince(server(s), token, s.callResult.cursor);
  } else if (call.startsWith("PUT")) {
    s.callResult = put();
  } else if (call.startsWith("GET /api/saves/")) {
    put();
    s.callResult = S.getSave(server(s), token, one.header.saveId);
  } else if (call.startsWith("DELETE /api/saves/")) {
    put();
    s.callResult = S.deleteCloudSave(server(s), token, one.header.saveId, s.now);
  } else if (call.startsWith("DELETE /api/campaigns/")) {
    for (const f of files) S.putSave(server(s), token, S.rowOf("", f.header, d.storage.read(f.path)!.length), d.storage.read(f.path)!, s.now);
    s.callResult = S.deleteCloudCampaign(server(s), token, c.campaignId, s.now);
  } else if (call.startsWith("POST")) {
    s.callResult = [S.claimIronmanHead(server(s), c.campaignId, "i1", undefined), S.claimIronmanHead(server(s), c.campaignId, "i2", "i1"), S.claimIronmanHead(server(s), c.campaignId, "i3", "i1")];
  }
  s.one = one;
  s.oneBytes = bytes;
  s.files = files;
});
Then("the server returns headers and tombstones changed since the cursor and a new cursor", (s) => {
  expect(s.callResult.rows.map((r: S.SaveRow) => r.saveId)).toEqual([s.one.header.saveId]);
  expect(s.callResult.tombstones).toEqual([]);
  expect(s.callResult.cursor).toBeGreaterThan(0);
  expect(s.callResult2.rows).toEqual([]);
});
Then("the server stores one save, headers and bytes", (s) => {
  expect(s.callResult).toEqual({ ok: true });
  expect(server(s).rows.has(s.one.header.saveId)).toBe(true);
  expect(server(s).objects.size).toBe(1);
});
Then("the server returns the bytes", (s) => {
  expect(Buffer.from(s.callResult).equals(Buffer.from(s.oneBytes))).toBe(true);
});
Then("the server leaves a tombstone", (s) => {
  expect(s.callResult).toBe(true);
  expect(server(s).rows.get(s.one.header.saveId)!.deletedAt).not.toBeNull();
});
Then("the server tombstones every save of the campaign", (s) => {
  expect(s.callResult).toBe((s.files as unknown[]).length);
  expect([...server(s).rows.values()].every((r) => r.deletedAt !== null)).toBe(true);
});
Then("the server claims the ironman line", (s) => {
  expect(s.callResult[0]).toEqual({ ok: true });
  expect(s.callResult[1]).toEqual({ ok: true });
  expect(s.callResult[2]).toEqual({ ok: false, head: "i2" });
});

Given("the server holds the save {string}", (s, saveId: string) => {
  s.mainDev = dev(s, "Pixel 8");
  const w = S.writeSave(devCtx(s, s.mainDev), campaign(s), world(s), "manual", { saveId });
  expect(S.putSave(server(s), s.mainDev.client.deviceToken, S.rowOf("", w.header, w.bytes.length), w.bytes, s.now)).toEqual({ ok: true });
  s.held = w;
});
When("the game uploads {string} again with the same bytes", (s) => {
  const w: S.Written = s.held;
  s.up = S.putSave(server(s), s.mainDev.client.deviceToken, S.rowOf("", w.header, w.bytes.length), w.bytes, s.now);
});
When("the game uploads {string} again with different bytes", (s, saveId: string) => {
  processTurn(world(s), [], 0);
  const w = S.writeSave(devCtx(s, s.mainDev), campaign(s), world(s), "manual", { saveId });
  s.up = S.putSave(server(s), s.mainDev.client.deviceToken, S.rowOf("", w.header, w.bytes.length), w.bytes, s.now);
});
Then("the upload is accepted", (s) => {
  expect(s.up).toEqual({ ok: true });
});
Then("the upload is rejected", (s) => {
  expect(s.up).toEqual({ ok: false, refusal: "save id exists with other bytes" });
});

When("the game launches", (s) => {
  s.plan = S.syncPlan("launch");
});
When("the player returns to the app", (s) => {
  s.plan = S.syncPlan("resume");
});
Then("the game fetches changes since its last cursor", (s) => {
  expect(s.plan[0]).toBe("fetch changes since the last cursor");
  const d: Dev = s.mainDev;
  playOffline(s, dev(s, "Steam Deck"), "Castile", 1);
  sync(s, dev(s, "Steam Deck"));
  const first = S.fetchChanges(d.client, server(s));
  expect(first.arrived.length).toBeGreaterThan(0);
  expect(S.fetchChanges(d.client, server(s)).arrived).toEqual([]);
});
Then("headers arrive first so the Load screen fills at once", (s) => {
  expect(s.plan[1]).toBe("headers first");
  const d: Dev = s.mainDev;
  expect(d.client.known.size).toBeGreaterThan(0);
  expect(loadScreen(d).size).toBe(d.client.known.size);
  expect(d.storage.list()).toEqual([]);
});
Then("bytes download only when a save is opened, or in the background for the newest Resume save", (s) => {
  expect(s.plan[2]).toBe("bytes on open, or in the background for the newest Resume save");
  const d: Dev = s.mainDev;
  sync(s, d);
  const local = S.entries(d.storage);
  expect(local).toHaveLength(1);
  expect(local[0]!.header.kind).toBe("resume");
});

When("{int} saves are written and the app is restarted", (s, n: number) => {
  const d: Dev = s.mainDev;
  const c = S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" });
  const w = createWorld(RULES, 7);
  s.queued = [];
  for (let i = 0; i < n; i++) {
    w.turn = i;
    const x = S.writeSave(devCtx(s, d), c, w, "manual");
    S.queueUpload(d.client, x.path);
    s.queued.push(x.path);
  }
  S.runQueue(d.client, uploader(s, d), s.now);
  const token = d.client.deviceToken;
  d.client = S.syncClient(d.name, queueStore(d.store), { online: false });
  if (token) d.client.deviceToken = token;
});
Then("the {int} uploads are still queued", (s, n: number) => {
  expect(s.mainDev.client.queue.map((q: S.QueueItem) => q.path)).toEqual(s.queued);
  expect(s.queued).toHaveLength(n);
});
When("the device comes online", (s) => {
  const d: Dev = s.mainDev;
  d.client.online = true;
  s.run = S.runQueue(d.client, uploader(s, d), s.now);
});
Then("they upload oldest first", (s) => {
  expect(s.run.uploaded).toEqual(s.queued);
  expect(s.mainDev.client.queue).toEqual([]);
});
Then("failed uploads retry with growing waits", (s) => {
  const d: Dev = s.mainDev;
  S.queueUpload(d.client, "x/failing.phsave");
  const waits: number[] = [];
  let now = s.now;
  for (let i = 0; i < 3; i++) {
    const r = S.runQueue(d.client, () => ({ ok: false, refusal: "offline" }), now);
    waits.push(r.failed[0]!.retryAt - now);
    expect(S.runQueue(d.client, () => ({ ok: true }), now).uploaded).toEqual([]);
    now = r.failed[0]!.retryAt;
  }
  expect(waits[1]).toBeGreaterThan(waits[0]!);
  expect(waits[2]).toBeGreaterThan(waits[1]!);
});

Given("the player is signed in with uploads queued", (s) => {
  s.mainDev = dev(s, "Pixel 8");
  const d: Dev = s.mainDev;
  const c = S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" });
  const x = S.writeSave(devCtx(s, d), c, createWorld(RULES, 7), "resume");
  S.queueUpload(d.client, x.path);
});
Then("only the orders journal is written", (s) => {
  expect(s.writes).toEqual(["orders journal"]);
  expect(s.plan).toEqual([]);
  expect(s.mainDev.client.queue).toHaveLength(1);
});
Then("the queue continues next time", (s) => {
  const d: Dev = s.mainDev;
  expect(JSON.parse(d.store.text!)).toHaveLength(1);
  expect(S.runQueue(d.client, uploader(s, d), s.now).uploaded).toHaveLength(1);
});

Given(/^"Sync on Wi-Fi only" is (on|off)$/, (s, v: string) => {
  s.mainDev.client.wifiOnly = v === "on";
});
Given("the device is on a metered connection", (s) => {
  s.mainDev.client.metered = true;
});
Then("the upload starts", (s) => {
  expect(s.queueRun.uploaded).toHaveLength(1);
});
Then("the upload waits for Wi-Fi", (s) => {
  expect(s.queueRun.uploaded).toEqual([]);
  expect(s.mainDev.client.queue).toHaveLength(1);
  s.mainDev.client.metered = false;
  expect(S.runQueue(s.mainDev.client, uploader(s, s.mainDev), s.now).uploaded).toHaveLength(1);
});

When(/^the game uploads a save with (a size over 2 MB|a wrong magic|a chunk whose CRC does not match|a header that differs from its database row)$/, (s, problem: string) => {
  const d: Dev = s.mainDev;
  const c = S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" });
  const w = createWorld(RULES, 7);
  let opts: S.WriteOptions = {};
  if (problem.startsWith("a size")) {
    const r = new Rng(4);
    opts = { history: [Array.from({ length: 700_000 }, () => r.nextU32().toString(36)).join("")] };
  }
  const x = S.buildSave(devCtx(s, d), c, w, "manual", opts);
  let bytes = x.bytes;
  const row = S.rowOf("", x.header, bytes.length);
  if (problem === "a wrong magic") bytes = flip(bytes, 0);
  if (problem === "a chunk whose CRC does not match") bytes = flip(bytes, chunkByte(bytes));
  if (problem.startsWith("a header")) row.turn += 1;
  if (problem.startsWith("a size")) expect(bytes.length).toBeGreaterThan(C.cloud.server.max_save_mb * 1024 * 1024);
  s.up = S.putSave(server(s), d.client.deviceToken!, row, bytes, s.now);
});
Then("the server rejects it", (s) => {
  expect(s.up.ok).toBe(false);
  expect(server(s).rows.size).toBe(0);
});

Given("the account holds {int} saves", (s, n: number) => {
  s.mainDev = dev(s, "Pixel 8");
  const acc = S.authorise(server(s), s.mainDev.client.deviceToken)!;
  for (let i = 0; i < n; i++) {
    server(s).rows.set(`old${i}`, { ...S.rowOf(acc.id, { campaignId: "c0", saveId: `old${i}`, kind: "manual", name: "", savedAt: i, device: "x", platform: "android", gameVersion: "1", formatVersion: 1, turn: i, date: { y: 1444, m: 11 }, playerNation: "castile", ironman: false } as S.SaveHeader, 1000) });
  }
  expect(n).toBe(C.cloud.server.quota_saves);
});
When("the game uploads another save", (s) => {
  const d: Dev = s.mainDev;
  const c = S.newCampaign(d.rng, { playerNation: "castile", nationName: "Castile" });
  const x = S.writeSave(devCtx(s, d), c, createWorld(RULES, 7), "manual");
  S.queueUpload(d.client, x.path);
  s.run = S.runQueue(d.client, uploader(s, d), s.now);
});
Then("the game asks the player to delete old saves", (s) => {
  expect(s.run.askPlayer.map((a: { refusal: string }) => a.refusal)).toEqual(["quota"]);
});
Then("the server drops no save on its own", (s) => {
  expect(server(s).rows.size).toBe(C.cloud.server.quota_saves);
  expect([...server(s).rows.values()].every((r) => r.deletedAt === null)).toBe(true);
});

Given("one device sends uploads faster than the rate limit", (s) => {
  s.rateLimit = { uploads: 3, windowMs: 60_000 };
  s.fast = dev(s, "Pixel 8");
  s.slow = dev(s, "Steam Deck");
  const c = S.newCampaign(s.fast.rng, { playerNation: "castile", nationName: "Castile" });
  const w = createWorld(RULES, 7);
  s.mk = (d: Dev) => {
    w.turn++;
    const x = S.buildSave(devCtx(s, d), c, w, "manual");
    return S.putSave(server(s), d.client.deviceToken!, S.rowOf("", x.header, x.bytes.length), x.bytes, 1000);
  };
  for (let i = 0; i < 3; i++) expect(s.mk(s.fast)).toEqual({ ok: true });
});
When("the next upload arrives", (s) => {
  s.up = s.mk(s.fast);
});
Then("the server refuses it for that device", (s) => {
  expect(s.up).toEqual({ ok: false, refusal: "rate limit" });
  expect(s.mk(s.slow)).toEqual({ ok: true });
});

Given("a save is to count toward a leaderboard", (s) => {
  campaign(s);
  processTurn(world(s), [], 0);
  s.boardSave = write(s, "manual");
});
When("the server loads it with the engine", (s) => {
  s.result = S.openSave(s.boardSave.bytes, { rules: RULES, fullGame: true });
});
Then("it recomputes worldHash and compares it with the header", (s) => {
  expect(s.result.kind).toBe("opened");
  expect(s.result.loadedHash).toBe(s.boardSave.header.worldHash);
  const edited = reheader(s.boardSave.bytes, (h) => (h.worldHash = "deadbeef"));
  expect(S.openSave(edited, { rules: RULES, fullGame: true }).kind).toBe("hash warning");
});

Given("the full game was bought on Steam only", (s) => {
  s.purchases = { steam: true, android: false };
});
Given("the campaign as {string} synced from Steam to an Android phone without the unlock", (s, nation: string) => {
  const deck = dev(s, "Steam Deck");
  const phone = dev(s, "Pixel 8");
  s.syncedCampaign = playOffline(s, deck, nation, 1);
  sync(s, deck);
  sync(s, phone);
  s.phone = phone;
});
When("the player opens it on the phone", (s) => {
  const e = S.entries(s.phone.storage).find((x) => x.header.campaignId === s.syncedCampaign.campaignId)!;
  s.phoneBytes = s.phone.storage.read(e.path);
  s.result = S.openSave(s.phoneBytes, { rules: RULES, fullGame: s.purchases.android }, nationName);
});
Then("the phone asks for the unlock", (s) => {
  expect(s.result.kind).toBe("locked");
});
Then("the server does not unlock {string} on the phone", (s, nation: string) => {
  sync(s, s.phone);
  expect(JSON.stringify([...server(s).rows.values()])).not.toMatch(/purchase|unlock/);
  const again = S.openSave(s.phoneBytes, { rules: RULES, fullGame: s.purchases.android }, nationName);
  expect(again.kind === "locked" && again.nation).toBe(nationId(nation));
});

// ================================================================ decided rules (D-SAVE-1, 2, 3, 6, 10, 13, 15)

const MOMENTS: Record<string, S.Lifecycle> = {
  "End turn": "end_turn",
  pause: "pause",
  quit: "quit",
  "exit to the main menu": "exit_to_menu",
  suspend: "suspend",
  background: "background",
};
Given("the campaign as {string} is loaded and is not ironman", (s, nation: string) => {
  campaign(s, nation, false);
  const w = world(s);
  w.turn = 10;
  write(s, "resume");
  w.turn = 11;
  write(s, "resume");
});
When("the lifecycle moment {string} comes", (s, label: string) => {
  const m = MOMENTS[label];
  expect(m, label).toBeDefined();
  s.resumeWrite = S.resumeWrites(m!) ? write(s, "resume") : undefined;
  s.writes = m === "end_turn" ? [] : S.lifecycleWrites(m!, { turnRunning: false, ordersChanged: true });
});
Then("the Resume save of the campaign is current", (s) => {
  const newest = mine(s, "resume").sort((x, y) => y.header.savedAt - x.header.savedAt || y.header.turn - x.header.turn)[0];
  expect(newest?.path).toBe(s.resumeWrite.path);
});
Then("the campaign keeps {int} Resume save and {int} backup", (s, a: number, b: number) => {
  expect(mine(s, "resume")).toHaveLength(a + b);
});
Then("the Resume save is not listed in Load", (s) => {
  for (const card of S.loadList(S.entries(storage(s)), nationName)) for (const e of card.saves) expect(e.header.kind).not.toBe("resume");
});
Then("no Resume save is written", (s) => {
  expect(s.resumeWrite).toBeUndefined();
  expect(mine(s, "resume")).toHaveLength(2);
});

Given("a save made in the Steam demo", (s) => {
  campaign(s, "Ottomans").app = "demo";
  s.demoSave = write(s, "manual");
});
Then("its header's tier names the app {string} and lists no limits", (s, app: string) => {
  const tier = S.readHeader(s.demoSave.bytes).tier;
  expect(tier.app).toBe(app);
  expect(Object.keys(tier).sort()).toEqual(["app", "nation", "needsFullGame"]);
});
When("the full game loads it", (s) => {
  s.opened = S.openSave(s.demoSave.bytes, { rules: RULES, fullGame: true });
});
Then("the save opens", (s) => {
  expect(s.opened.kind).toBe("opened");
});

When("the achievements context reads its header", (s) => {
  s.readBack = S.readHeader(s.last.bytes);
});
Then("it finds the ironman flag and the modified mark", (s) => {
  expect(typeof s.readBack.ironman).toBe("boolean");
  expect(typeof s.readBack.modified).toBe("boolean");
});
Then("it finds the flags ironman_unbroken, cheat_marked, switched_country and began_as_tutorial", (s) => {
  expect(Object.keys(s.readBack.flags).sort()).toEqual(["began_as_tutorial", "cheat_marked", "ironman_unbroken", "switched_country"]);
});
Given("the player played on as another realm after game over", (s) => {
  campaign(s).switchedCountry = true;
});
Then(
  /^(?:the save's|its) flags read ironman_unbroken (true|false), cheat_marked (true|false), switched_country (true|false) and began_as_tutorial (true|false)$/,
  (s, a: string, b: string, c: string, d: string) => {
    expect(S.readHeader(s.last.bytes).flags).toEqual({
      ironman_unbroken: a === "true",
      cheat_marked: b === "true",
      switched_country: c === "true",
      began_as_tutorial: d === "true",
    });
  },
);
Then("its tier is nation {string}, needsFullGame {word} and app {string}", (s, nation: string, needs: string, app: string) => {
  expect(S.readHeader(s.last.bytes).tier).toEqual({ nation, needsFullGame: needs === "true", app });
});

When("the player exports it and imports it on the {string} while offline", (s, device: string) => {
  const file = S.exportSave("desktop", { path: s.deckSave.path, header: s.deckSave.header }, s.deckSave.bytes);
  s.imported = S.importSave(devCtx(s, dev(s, device)), file.bytes, false);
});
Then("the import is refused with {string}", (s, message: string) => {
  expect(s.imported).toEqual({ kind: "rejected", message });
});

Given("the campaign as {string} has a Resume save and {int} autosaves", (s, nation: string, n: number) => {
  campaign(s, nation);
  const w = world(s);
  for (let i = 0; i < n; i++) {
    w.turn = 10 + i;
    s.newestAuto = write(s, "autosave");
  }
  w.turn = 20;
  s.resumeWrite = write(s, "resume");
});
Given(/^its Resume saves are (sound|damaged)$/, (s, state: string) => {
  if (state === "damaged") for (const e of mine(s, "resume")) storage(s).write(e.path, flip(storage(s).read(e.path)!, chunkByte(storage(s).read(e.path)!)));
});
When("the player picks {string} on the failure screen", (s, choice: string) => {
  expect(choice).toBe("Restore the last autosave");
  s.restored = S.restoreLastAutosave(storage(s), campaign(s).campaignId, opener(s));
});
Then(/^the (Resume save|newest autosave) is opened$/, (s, which: string) => {
  expect(s.restored.path).toBe(which === "Resume save" ? s.resumeWrite.path : s.newestAuto.path);
});

When("the player chooses {string} at a before-the-battle stop on day {int}", (s, choice: string, day: number) => {
  const resume = write(s, "resume");
  s.journal = S.journalChoice(S.makeJournal(resume, s.orders ?? []), day, choice);
});
Then("the orders journal holds {string} on day {int}", (s, choice: string, day: number) => {
  expect(s.journal.choices).toEqual([{ day, choice }]);
  expect(s.journal.orders).toHaveLength(2);
});

Then("the account's synced files include {string}", (_s, file: string) => {
  expect(S.syncedFiles()).toContain(file);
});
