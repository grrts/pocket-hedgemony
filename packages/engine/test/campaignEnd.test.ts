import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { advance, applyNow, createWorld, STEPS_PER_DAY, STEPS_PER_TURN } from "../src/index.ts";
import { campaignView, growthOf, nowOf, scoreOf, setPlayer, workOutScores } from "../src/campaignEnd.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { realmConfig } from "../src/domain/realm/index.ts";
import { LEDGER, LEDGER_LINES } from "../src/treasury.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

function game(realm = "france") {
  const w = createWorld(rules, 1, tiles);
  setPlayer(w, w.nationIndex.get(realm)!);
  return w;
}

const landOf = (w: ReturnType<typeof game>, n: number) => {
  const out: number[] = [];
  for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p] && w.provinceOwner[p] === n) out.push(p);
  return out;
};

describe("campaign end and score (SHELL-162 to SHELL-164)", () => {
  it("works out every realm's three scores and ranks from the first day", () => {
    const w = game();
    const v = campaignView(w);
    const me = w.player;
    const m = v.mine!;
    const income = (["tax", "trade", "tribute"] as const).reduce((t, l) => t + Math.max(0, w.nationLedger[me * LEDGER_LINES + LEDGER.indexOf(l)]!), 0) * 12;
    expect(m.income).toBe(Math.round(income));
    expect(m.bank).toBe(Math.round(w.nationTreasury[me]! - w.nationDebt[me]!));
    // The bank counts up to a year's income (REALM-310).
    expect(m.counted).toBeLessThanOrEqual(Math.max(m.income, m.bank < 0 ? m.bank : 0) + 1);
    expect(m.provinces).toBeGreaterThanOrEqual(landOf(w, me).length);
    expect(m.scores).toEqual([scoreOf(w, me, 0), scoreOf(w, me, 1), scoreOf(w, me, 2)]);
    expect(v.scoresDate).toBe("1444-11-11");
    // France is above the floor, so at the start it has grown by exactly nothing (REALM-312).
    expect(m.growth).toEqual([1, 1, 1]);
    expect(m.years).toBe(1);
    expect(v.chapter).toEqual({ n: 1, from: 1444, to: 1544, last: false });
    // Ranks run from 1, and the leader of each score has the top growth.
    for (let k = 0; k < 3; k++) {
      const leader = [...Array(w.nationCount).keys()].filter((n) => v.ranks[n * 3 + k] === 1);
      expect(leader.length).toBeGreaterThan(0);
      const best = Math.max(...[...Array(w.nationCount).keys()].map((n) => v.growth[n * 3 + k]!));
      for (const n of leader) expect(v.growth[n * 3 + k]).toBeCloseTo(best, 5);
    }
    expect(v.ledger.length).toBeGreaterThanOrEqual(5);
    expect(v.ledger.some((r) => r.nation === me)).toBe(true);
    expect(v.ending).toBeNull();
  });

  it("ends at the end date, stops the clock and offers Look at the map and New game", () => {
    const w = game();
    w.campaign.endDate = "1444-11-13";
    advance(w, STEPS_PER_DAY * 3);
    const v = campaignView(w);
    expect(v.ending).toMatchObject({ kind: "end date", headline: "The campaign ends · 13 November 1444", choices: ["Look at the map", "New game"] });
    expect(v.ending!.outcome).toMatch(/^(Victory|No victory)/);
    const day = w.day;
    advance(w, STEPS_PER_TURN);
    expect(w.day).toBe(day);
    // No playing on past the end date (SHELL-100).
    expect(applyNow(w, { type: "keepPlaying" }, w.player).rejectedOrders).toHaveLength(1);
  });

  it("shows game over when the realm loses its last land, naming who took it, and lets the player play on", () => {
    const w = game();
    const me = w.player;
    const eng = w.nationIndex.get("england")!;
    const bur = w.nationIndex.get("burgundy")!;
    const mine = landOf(w, me);
    mine.forEach((p, i) => (w.provinceOwner[p] = i % 3 === 0 ? bur : eng));
    advance(w, STEPS_PER_TURN);
    const v = campaignView(w);
    expect(w.nationGone[me]).toBe(1);
    expect(v.ending).toMatchObject({ kind: "game over", headline: "France was divided between England and Burgundy · 1444", choices: ["Play on as another realm", "New game"] });
    expect(v.ending!.highs.largest).toBe(mine.length);
    expect(v.ending!.outcome).toMatch(/^No victory · Economy \d+(st|nd|rd|th)/);
    expect(applyNow(w, { type: "playOn", nation: me }, me).rejectedOrders).toHaveLength(1);
    expect(applyNow(w, { type: "playOn", nation: bur }, me).rejectedOrders).toHaveLength(0);
    expect(w.player).toBe(bur);
    expect(campaignView(w)).toMatchObject({ ending: null, playedOn: true });
    const day = w.day;
    advance(w, STEPS_PER_DAY);
    expect(w.day).toBe(day + 1);
  });

  it("needs the whole world for world domination: one settled province short is no win (X-28)", () => {
    const w = game();
    const me = w.player;
    let left = -1;
    for (let p = 0; p < w.provinceCount; p++) {
      if (w.provinceWater[p]) continue;
      if (left < 0 && w.provincePopulation[p]! > 0 && w.provinceOwner[p] !== me) {
        left = p;
        continue;
      }
      w.provinceOwner[p] = me;
    }
    let n = 0;
    while (w.date.year < 1445 && n++ < 60) advance(w, STEPS_PER_DAY);
    advance(w, STEPS_PER_DAY);
    expect(w.campaign.ending).toBeNull();
  });

  it("wins by world domination in the January turn, and Keep playing goes on", () => {
    const w = game();
    const me = w.player;
    // The player holds every settled land province.
    for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p]) w.provinceOwner[p] = me;
    w.campaign.nationLargest.fill(0);
    w.nationGone.fill(0);
    // Play to 1 January 1445.
    let n = 0;
    while (!w.campaign.ending && n++ < 60) advance(w, STEPS_PER_DAY);
    const v = campaignView(w);
    expect(v.ending).toMatchObject({ kind: "world domination", headline: "World domination · 1445", choices: ["Keep playing", "New game"] });
    expect(v.ending!.outcome).toMatch(/^Victory: World domination/);
    expect(w.date).toMatchObject({ year: 1445, month: 1 });
    expect(applyNow(w, { type: "keepPlaying" }, me).rejectedOrders).toHaveLength(0);
    const day = w.day;
    advance(w, STEPS_PER_DAY);
    expect(w.day).toBe(day + 1);
    expect(w.campaign.ending).toBeNull();
  });
});

describe("a fair score and chapters (X-28, REALM-310 to REALM-314)", () => {
  it("counts no commanders in Power, only men under arms and warships", () => {
    const w = game();
    const me = w.player;
    const before = nowOf(w, me, 1);
    // Every commander in the world joins the player's realm: Power does not move.
    w.commanderOwner.fill(me);
    workOutScores(w);
    expect(nowOf(w, me, 1)).toBe(before);
    expect(realmConfig.win).not.toHaveProperty("commander_men");
  });

  it("does not let banked gold run the Economy score up", () => {
    const w = game();
    const me = w.player;
    w.nationTreasury[me] = 1e7;
    w.nationDebt[me] = 0;
    workOutScores(w);
    const m = campaignView(w).mine!;
    expect(m.bank).toBeGreaterThan(1e6);
    expect(m.counted).toBe(m.income);
    expect(m.now[0]).toBe(2 * m.income);
    // Debt counts in full.
    w.nationTreasury[me] = 0;
    w.nationDebt[me] = 5000;
    workOutScores(w);
    expect(campaignView(w).mine!.now[0]).toBe(m.income - 5000);
  });

  it("judges the average of the Januaries, so a last-year burst moves it little", () => {
    const w = game();
    const me = w.player;
    playToJanuary(w);
    // Ten years of the same score, then a sudden jump in the bank's gold counts one year in eleven.
    const c = w.campaign;
    for (let y = 0; y < 10; y++) {
      const slot = (me * realmConfig.win.average_years + (c.historyLen[me]! % realmConfig.win.average_years)) * 3;
      c.history[slot] = 100;
      c.historyLen[me]!++;
    }
    const slot = (me * realmConfig.win.average_years + (c.historyLen[me]! % realmConfig.win.average_years)) * 3;
    c.history[slot] = 1200;
    c.historyLen[me]!++;
    expect(scoreOf(w, me, 0)).toBeLessThan(400);
  });

  it("measures growth against the realm's own start, so a small realm that doubles beats a large one standing still", () => {
    const w = game("brittany");
    const bri = w.player;
    const fra = w.nationIndex.get("france")!;
    const c = w.campaign;
    // Brittany's Power average doubles over its start; France's stays.
    const Y = realmConfig.win.average_years;
    for (const [n, f] of [[bri, 2], [fra, 1]] as const) {
      const start = Math.max(c.startScore[n * 3 + 1]!, c.startFloors[1]);
      c.historyLen[n] = 1;
      c.history[(n * Y) * 3 + 1] = start * f;
    }
    expect(growthOf(w, bri, 1)).toBe(2);
    expect(growthOf(w, fra, 1)).toBe(1);
    // A speck of a realm is measured from the floor, not from its own tiny start.
    for (let n = 0; n < w.nationCount; n++) if (c.started[n]) for (let k = 0; k < 3; k++) expect(Math.max(c.startScore[n * 3 + k]!, c.startFloors[k]!)).toBeGreaterThanOrEqual(c.startFloors[k]!);
  });

  it("closes a chapter in the January turn every 100 years, with the player's place and the leaders, then plays on", () => {
    const w = game();
    // As if the campaign had begun in 1345: the first chapter closes in January 1445.
    w.campaign.startYear = 1345;
    w.campaign.chapterFrom = 1345;
    playToJanuary(w);
    advance(w, STEPS_PER_DAY);
    const v = campaignView(w);
    expect(v.ending).toBeNull();
    expect(v.chapters).toHaveLength(1);
    const ch = v.chapters[0]!;
    expect(ch).toMatchObject({ n: 1, from: 1345, to: 1445, realm: w.player, last: false });
    for (let k = 0; k < 3; k++) {
      expect(ch.ranks[k]).toBeGreaterThan(0);
      expect(ch.leaders[k]!.length).toBeGreaterThan(0);
    }
    expect(ch.ledger.some((r) => r.nation === w.player)).toBe(true);
    expect(v.chapter).toMatchObject({ n: 2, from: 1445, to: 1545 });
    // The next chapter starts from every realm's score now.
    expect(v.mine!.chapterGrowth.every((g) => g > 0.5 && g < 2)).toBe(true);
    const day = w.day;
    advance(w, STEPS_PER_DAY);
    expect(w.day).toBe(day + 1);
  });

  it("closes the last chapter with the campaign", () => {
    const w = game();
    w.campaign.endDate = "1444-11-13";
    advance(w, STEPS_PER_DAY * 3);
    const v = campaignView(w);
    expect(v.chapters.at(-1)).toMatchObject({ n: 1, from: 1444, to: 1444, last: true });
  });

  it("keeps the Januaries, the starts and the chapters in a save", () => {
    const w = game();
    w.campaign.startYear = 1345;
    w.campaign.chapterFrom = 1345;
    playToJanuary(w);
    advance(w, STEPS_PER_DAY);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "france", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    setPlayer(back, back.nationIndex.get("france")!);
    const a = campaignView(w);
    const b = campaignView(back);
    expect(b.chapters).toEqual(a.chapters);
    expect(b.chapter).toEqual(a.chapter);
    expect(b.mine!.years).toBe(a.mine!.years);
    expect(b.mine!.growth).toEqual(a.mine!.growth);
  });
});

/** Plays to the first day of the next January. */
function playToJanuary(w: ReturnType<typeof game>): void {
  const y = w.date.year;
  let n = 0;
  while (w.date.year === y && n++ < 400) advance(w, STEPS_PER_DAY);
}
