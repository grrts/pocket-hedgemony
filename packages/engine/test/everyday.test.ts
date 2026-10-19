import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { answerEveryday, everydayCards, fireEverydayNow, monthlyEveryday } from "../src/everyday.ts";
import { lordLands } from "../src/lords.ts";
import type { News } from "../src/war.ts";
import { startOutbreak } from "../src/plague.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

function france(): World {
  const w = createWorld(rules, 1, tiles);
  w.player = w.nationIndex.get("france")!;
  return w;
}

/** Plays the month's everyday step on the first of each month for `months` months. */
function months(w: World, count: number, answer: boolean, news: News[] = []): number {
  let seen = 0;
  for (let k = 0; k < count; k++) {
    w.date = { ...w.date, month: (w.date.month % 12) + 1, year: w.date.year + (w.date.month === 12 ? 1 : 0) };
    monthlyEveryday(w, news);
    for (const c of everydayCards(w, w.player)) {
      seen++;
      if (answer) expect(answerEveryday(w, w.player, c.event, c.options[0]!.id, news)).toBeNull();
    }
  }
  return seen;
}

describe("everyday events (EVT-115 to EVT-128)", () => {
  it("draw a small choice every 3 to 6 months for the player, and answer the AI's at once (EVT-115, EVT-116)", () => {
    const w = france();
    const seen = months(w, 60, true);
    // 5 years at one every 3 to 6 months.
    expect(seen).toBeGreaterThanOrEqual(8);
    expect(seen).toBeLessThanOrEqual(21);
    // The AI's never wait.
    expect(w.everyday!.pending).toEqual([]);
    expect(w.everyday!.seq).toBeGreaterThan(seen * 10);
  });

  it("bring no new one while the player's waits (EVT-117)", () => {
    const w = france();
    months(w, 36, false);
    expect(everydayCards(w, w.player)).toHaveLength(1);
  });

  it("an official's death: the deputy starts afresh, a seasoned man costs gold and keeps the post's years (EVT-122)", () => {
    const w = france();
    const news: News[] = [];
    const ev = fireEverydayNow(w, "official_dies", w.player, news)!;
    const p = ev.province!;
    const since = w.provinceOfficialSince[p]!;
    const gold = w.nationTreasury[w.player]!;
    const card = everydayCards(w, w.player)[0]!;
    expect(card.title).toMatch(/^Death of /);
    expect(card.options.map((o) => o.id)).toContain("seasoned");
    expect(answerEveryday(w, w.player, ev.id, "seasoned", news)).toBeNull();
    expect(w.nationTreasury[w.player]).toBe(gold - 25);
    expect(w.provinceOfficialSince[p]).toBe(since);
    const ev2 = fireEverydayNow(w, "official_dies", w.player, news)!;
    w.day += 400;
    expect(answerEveryday(w, w.player, ev2.id, "deputy", news)).toBeNull();
    expect(w.provinceOfficialSince[ev2.province!]).toBe(w.day);
  });

  it("an option that costs more gold than the realm holds is not offered (EVT-120)", () => {
    const w = france();
    w.nationTreasury[w.player] = 5;
    fireEverydayNow(w, "official_dies", w.player, []);
    expect(everydayCards(w, w.player)[0]!.options.map((o) => o.id)).not.toContain("seasoned");
  });

  it("spoiled grain is lost at once; buying grain makes half of it good (EVT-126)", () => {
    const w = france();
    const ev = fireEverydayNow(w, "grain_rots", w.player, [])!;
    const p = ev.province!;
    const after = w.provinceStore[p]!;
    expect(ev.loss).toBeGreaterThan(0);
    expect(everydayCards(w, w.player)[0]!.always[0]).toMatch(/months of grain lost/);
    expect(answerEveryday(w, w.player, ev.id, "buy", [])).toBeNull();
    expect(w.provinceStore[p]).toBeCloseTo(after + ev.loss! / 2, 3);
  });

  it("a lord's death: his son follows him, or the crown takes his lands and the other lords fear for theirs (EVT-123)", () => {
    const w = france();
    const ev = fireEverydayNow(w, "lord_dies", w.player, [])!;
    const k = ev.lord!;
    const lands = lordLands(w, k);
    expect(lands.length).toBeGreaterThan(0);
    const others = w.lords.flatMap((l, j) => (j !== k && l.nation === w.player ? [j] : []));
    expect(answerEveryday(w, w.player, ev.id, "take", [])).toBeNull();
    expect(lordLands(w, k)).toEqual([]);
    for (const p of lands) expect(w.provinceLord[p]).toBe(-1);
    expect(others.some((j) => w.lords[j]!.loyalty !== "Loyal")).toBe(true);
    const ev2 = fireEverydayNow(w, "lord_dies", w.player, [])!;
    expect(answerEveryday(w, w.player, ev2.id, "confirm", [])).toBeNull();
    expect(w.lords[ev2.lord!]!.name).toBe(ev2.name);
  });

  it("a child born to an heirless ruler becomes the heir (EVT-124)", () => {
    const w = france();
    const r = w.rulers[w.player]!;
    r.heir = null;
    r.age = 30;
    r.regent = null;
    const ev = fireEverydayNow(w, "child_born", w.player, [])!;
    expect(everydayCards(w, w.player)[0]!.options.find((o) => o.id === "quiet")!.effects).toEqual([`${ev.name} becomes your heir`]);
    expect(answerEveryday(w, w.player, ev.id, "quiet", [])).toBeNull();
    expect(w.rulers[w.player]!.heir?.name).toBe(ev.name);
  });

  it("is kept in the save, with the event waiting for the player (EVT-128)", () => {
    const w = france();
    const ev = fireEverydayNow(w, "lords_quarrel", w.player, [])!;
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "france", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    back.player = back.nationIndex.get("france")!;
    expect(everydayCards(back, back.player).map((c) => c.event)).toEqual([ev.id]);
    expect(back.everyday!.due[back.player]).toBe(w.everyday!.due[w.player]);
  });

  it("answers through the AnswerEvent order", () => {
    const w = france();
    const ev = fireEverydayNow(w, "lord_praises", w.player, []) ?? fireEverydayNow(w, "lords_quarrel", w.player, [])!;
    const option = everydayCards(w, w.player)[0]!.options.at(-1)!.id;
    const r = processTurn(w, [{ type: "answerEvent", event: ev.id, option }], w.player);
    expect(r.rejectedOrders).toEqual([]);
    expect(everydayCards(w, w.player).some((c) => c.event === ev.id)).toBe(false);
  });
  it("plague reaching the player's land opens one card: close the province, or pay physicians (EVT-130)", () => {
    const w = france();
    const mine = [...Array(w.provinceCount).keys()].filter((p) => w.provinceOwner[p] === w.player && w.provincePopulation[p]! > 0);
    expect(startOutbreak(w, mine[0]!, [])).toBe(true);
    expect(startOutbreak(w, mine[1]!, [])).toBe(true);
    const cards = everydayCards(w, w.player);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.title).toBe(`Plague at ${w.rules.provinces[mine[0]!]!.name}`);
    expect(cards[0]!.options.map((o) => o.id)).toEqual(["close", "physicians", "open"]);
    expect(answerEveryday(w, w.player, cards[0]!.event, "physicians", [])).toBeNull();
    expect(w.provincePlagueCare[mine[0]!]).toBe(1);
    expect(startOutbreak(w, mine[2]!, [])).toBe(true);
    const next = everydayCards(w, w.player)[0]!;
    expect(answerEveryday(w, w.player, next.event, "close", [])).toBeNull();
    expect(w.provinceQuarantine[mine[2]!]).toBe(1);
  });
});
