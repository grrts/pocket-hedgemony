import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { advance, applyNow, createWorld, STEPS_PER_DAY, STEPS_PER_TURN } from "../src/index.ts";
import { campaignView, scoreOf, setPlayer } from "../src/campaignEnd.ts";
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
    expect(m.provinces).toBeGreaterThanOrEqual(landOf(w, me).length);
    expect(m.scores).toEqual([scoreOf(w, me, 0), scoreOf(w, me, 1), scoreOf(w, me, 2)]);
    expect(v.scoresDate).toBe("1444-11-11");
    // Ranks run from 1, and the leader of each score has the top value.
    for (let k = 0; k < 3; k++) {
      const leader = [...Array(w.nationCount).keys()].filter((n) => v.ranks[n * 3 + k] === 1);
      expect(leader.length).toBeGreaterThan(0);
      const best = Math.max(...[...Array(w.nationCount).keys()].map((n) => v.scores[n * 3 + k]!));
      for (const n of leader) expect(v.scores[n * 3 + k]).toBe(best);
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
