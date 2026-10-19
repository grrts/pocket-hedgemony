import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { answerEveryday, everydayCards, fireEverydayNow, monthlyEveryday } from "../src/everyday.ts";
import { lordLands } from "../src/lords.ts";
import type { News } from "../src/war.ts";
import { startOutbreak } from "../src/plague.ts";
import { personDies } from "../src/people.ts";

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

  /** A royal post of the player's with an official in it. */
  const royalPost = (w: World) => [...Array(w.provinceCount).keys()].find((p) => w.provinceOwner[p] === w.player && w.provinceLord[p]! < 0 && w.provinceOfficial[p]! >= 0 && w.provinceOccupier[p]! < 0)!;

  it("an official's death empties his seat; the deputy starts afresh, a seasoned man costs gold and keeps the post's years (EVT-122)", () => {
    const w = france();
    const news: News[] = [];
    const p = royalPost(w);
    const type = w.provinceOfficial[p]!;
    w.provinceOfficialSince[p] = w.day - 3 * 365;
    const since = w.provinceOfficialSince[p]!;
    personDies(w, { kind: "official", p }, "old age", news);
    expect(w.provinceOfficial[p]).toBe(-1);
    const gold = w.nationTreasury[w.player]!;
    const card = everydayCards(w, w.player)[0]!;
    expect(card.title).toMatch(/^Death of /);
    expect(card.text).toMatch(/3 years in the post/);
    expect(card.options.map((o) => o.id)).toContain("seasoned");
    expect(answerEveryday(w, w.player, card.event, "seasoned", news)).toBeNull();
    expect(w.nationTreasury[w.player]).toBe(gold - 25);
    expect(w.provinceOfficial[p]).toBe(type);
    expect(w.provinceOfficialSince[p]).toBe(since);
    w.day += 400;
    personDies(w, { kind: "official", p }, "old age", news);
    const next = everydayCards(w, w.player)[0]!;
    expect(answerEveryday(w, w.player, next.event, "deputy", news)).toBeNull();
    expect(w.provinceOfficial[p]).toBe(type);
    expect(w.provinceOfficialSince[p]).toBe(w.day);
  });

  it("a death while an everyday event waits brings no second card, and a death is never drawn (EVT-117, EVT-122)", () => {
    const w = france();
    const p = royalPost(w);
    fireEverydayNow(w, "lords_quarrel", w.player, []);
    personDies(w, { kind: "official", p }, "old age", []);
    expect(everydayCards(w, w.player)).toHaveLength(1);
    expect(fireEverydayNow(w, "official_dies", w.player, [])).toBeNull();
  });

  it("an option that costs more gold than the realm holds is not offered (EVT-120)", () => {
    const w = france();
    w.nationTreasury[w.player] = 5;
    personDies(w, { kind: "official", p: royalPost(w) }, "old age", []);
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

  it("a lord's death: his heir holds the lands, or the crown takes them and the other lords fear for theirs (EVT-123)", () => {
    const w = france();
    const mine = () => w.lords.flatMap((l, j) => (l.nation === w.player && !l.gone && lordLands(w, j).length ? [j] : []));
    const k = mine()[0]!;
    const l = w.lords[k]!;
    const dead = l.name;
    l.heir = { name: "Jean Testard", age: 20 };
    const lands = lordLands(w, k);
    personDies(w, { kind: "lord", lord: k }, "old age", []);
    expect(l.name).toBe("Jean Testard");
    const card = everydayCards(w, w.player)[0]!;
    expect(card.title).toBe(`Death of ${dead}`);
    expect(answerEveryday(w, w.player, card.event, "take", [])).toBeNull();
    expect(lordLands(w, k)).toEqual([]);
    for (const p of lands) expect(w.provinceLord[p]).toBe(-1);
    expect(w.lords.some((x, j) => j !== k && x.nation === w.player && x.loyalty !== "Loyal")).toBe(true);
    const k2 = mine()[0]!;
    w.lords[k2]!.heir = { name: "Pierre Testard", age: 30 };
    personDies(w, { kind: "lord", lord: k2 }, "battle", []);
    const next = everydayCards(w, w.player)[0]!;
    expect(answerEveryday(w, w.player, next.event, "confirm", [])).toBeNull();
    expect(w.lords[k2]!.name).toBe("Pierre Testard");
    expect(lordLands(w, k2).length).toBeGreaterThan(0);
  });

  it("a lord whose line dies out brings no card: his lands are the crown's already (EVT-123)", () => {
    const w = france();
    const k = w.lords.findIndex((l, j) => l.nation === w.player && !l.gone && lordLands(w, j).length > 0);
    personDies(w, { kind: "lord", lord: k }, "old age", []);
    if (w.lords[k]!.gone) expect(everydayCards(w, w.player)).toEqual([]);
    else expect(everydayCards(w, w.player)).toHaveLength(1);
  });

  it("the heir trusted to prayer dies through the death of people (EVT-127)", () => {
    const w = france();
    const r = w.rulers[w.player]!;
    r.heir = { name: "Charles", age: 8, sex: "m", relation: "child" };
    const news: News[] = [];
    for (let k = 0; k < 40 && w.rulers[w.player]!.heir; k++) {
      const ev = fireEverydayNow(w, "heir_ill", w.player, news)!;
      expect(answerEveryday(w, w.player, ev.id, "pray", news)).toBeNull();
    }
    expect(w.rulers[w.player]!.heir).toBeNull();
    expect(news.some((x) => /Your heir, Charles, dies of a fever/.test(x.text))).toBe(true);
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

  it("a general's death: his second may keep the men in the field, or they go home (EVT-132)", () => {
    const w = france();
    const n = w.player;
    w.nationTreasury[n] = 1000;
    const a = w.armies;
    let i = -1;
    for (let k = 0; k < a.count && i < 0; k++) if (a.alive[k] && a.owner[k] === n && a.commander[k]! >= 0 && a.battle[k]! < 0) i = k;
    const lordLand = [...w.provinceLord.keys()].find((p) => w.provinceOwner[p] === n && w.provinceLord[p]! >= 0)!;
    a.location[i] = lordLand;
    a.tile[i] = w.tiles.centre[lordLand]!;
    const news: News[] = [];
    personDies(w, { kind: "commander", c: a.commander[i]! }, "old age", news);
    // The men are on their way home (RECR-135) and a card asks about them.
    expect(a.retreating[i]).toBe(1);
    const card = everydayCards(w, n)[0]!;
    expect(card.text).toMatch(/your general, has died at .*His second in command, .*, asks to lead them/);
    expect(card.options.map((o) => o.id)).toEqual(["second", "home"]);
    expect(card.options[0]!.effects).toEqual(["You: gold −15", expect.stringMatching(/leads them: Might [1-3], Cunning [1-3], Logistics [1-3]/)]);
    expect(answerEveryday(w, n, card.event, "second", news)).toBeNull();
    const c = a.commander[i]!;
    expect(c).toBeGreaterThanOrEqual(0);
    expect(w.commanderOwner[c]).toBe(n);
    expect(a.retreating[i]).toBe(0);
    expect(a.route[i]).toEqual([]);
    expect(a.location[i]).toBe(lordLand);
  });

  it("a general's second is not offered once another commander has taken the men (EVT-132)", () => {
    const w = france();
    const n = w.player;
    const a = w.armies;
    let i = -1;
    for (let k = 0; k < a.count && i < 0; k++) if (a.alive[k] && a.owner[k] === n && a.commander[k]! >= 0 && a.battle[k]! < 0) i = k;
    personDies(w, { kind: "commander", c: a.commander[i]! }, "old age", []);
    a.commander[i] = 0;
    const card = everydayCards(w, n)[0]!;
    expect(card.options.map((o) => o.id)).toEqual(["home"]);
  });

  it("an admiral's death: his flag captain may keep the fleet at sea (EVT-132)", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.nationIndex.get("venice")!;
    w.player = n;
    w.nationTreasury[n] = 1000;
    const f = w.navy.fleets.find((x) => x.owner === n && x.ships.length)!;
    const post = w.provinceOfficial.findIndex((o, q) => o >= 0 && w.provinceOwner[q] === n && w.provinceLord[q]! < 0);
    expect(processTurn(w, [{ type: "commission", province: post, sea: true }], n).rejectedOrders).toEqual([]);
    const c = w.commanderIds.length - 1;
    f.admiral = c;
    personDies(w, { kind: "commander", c }, "at sea", []);
    const card = everydayCards(w, n)[0]!;
    expect(card.text).toMatch(/your admiral, has died/);
    expect(answerEveryday(w, n, card.event, "second", [])).toBeNull();
    expect(f.admiral).toBeGreaterThan(c);
    expect(f.fleeing).toBe(false);
  });
});
