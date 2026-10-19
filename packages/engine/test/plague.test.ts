import { afterEach, describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, spawnArmy, type World } from "../src/index.ts";
import { catchChance, crowding, plagueDeaths, setQuarantine, spared, startOutbreak, weeklyPlague, BURNING_OUT, NONE, OUTBREAK, RUMOUR } from "../src/plague.ts";
import { provinceConfig } from "../src/domain/province/model.ts";
import { CLASS_COUNT, CLASS_NAMES } from "../src/living.ts";
import { provinceTax } from "../src/treasury.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { packChunk, unpackChunk } from "../src/domain/saves/format.ts";
import { hashWorld } from "../src/hash.ts";
import type { News } from "../src/war.ts";

const rules = loadDefaultRuleset();
const C = provinceConfig.plague;
const saved = { ...C };
afterEach(() => Object.assign(C, saved));

function game(): { w: World; me: number; p: number } {
  const w = createWorld(rules, 1);
  const me = w.nationIndex.get("france")!;
  w.player = me;
  const p = w.provinceIndex.get(rules.nations[me]!.capital)!;
  return { w, me, p };
}

/** One plague week that is not the month's first, so no new outbreak is rolled. */
function week(w: World, news: News[] = []): News[] {
  w.date = { ...w.date, day: 14 };
  w.day += 7;
  weeklyPlague(w, news);
  return news;
}

const landNeighbours = (w: World, p: number) => Array.from(w.adjList.subarray(w.adjStart[p]!, w.adjStart[p + 1]!)).filter((q) => !w.provinceWater[q] && w.provinceOwner[q]! >= 0);
const town = new Set(provinceConfig.classes.town);

describe("plague (PROV-342 to PROV-353)", () => {
  it("starts with no plague anywhere", () => {
    const { w } = game();
    expect(w.plagueSick).toEqual([]);
    expect(w.provincePlague.every((s) => s === NONE)).toBe(true);
  });

  it("runs its steps, lasts a season or two and burns out, and the province is spared after", () => {
    C.spread_week = 0;
    const { w, p } = game();
    const news: News[] = [];
    expect(startOutbreak(w, p, news)).toBe(true);
    expect(w.provincePlague[p]).toBe(RUMOUR);
    expect(news.some((n) => n.kind === "plague" && n.province === p)).toBe(true);
    expect(startOutbreak(w, p, [])).toBe(false);
    let weeks = 0;
    const seen = new Set<number>();
    while (w.provincePlague[p] !== NONE && weeks < 200) {
      week(w, news);
      seen.add(w.provincePlague[p]!);
      weeks++;
    }
    expect([...seen]).toEqual(expect.arrayContaining([OUTBREAK, BURNING_OUT, NONE]));
    const outbreak = weeks - C.rumour_weeks - C.burning_out_weeks;
    expect([C.weeks_per_season, 2 * C.weeks_per_season]).toContain(outbreak);
    expect(w.plagueSick).toEqual([]);
    expect(news.filter((n) => n.province === p && n.text.includes("burned out"))).toHaveLength(1);
    expect(spared(w, p)).toBe(true);
    expect(startOutbreak(w, p, [])).toBe(false);
  });

  it("spreads from an outbreak to land next door, and none out of a closed province", () => {
    C.spread_week = 10;
    C.sea_spread_week = 0;
    const { w, p } = game();
    const near = landNeighbours(w, p);
    expect(near.length).toBeGreaterThan(0);
    startOutbreak(w, p, []);
    w.provincePlague[p] = OUTBREAK;
    w.provincePlagueWeeks[p] = 12;
    w.provinceQuarantine[p] = 1;
    week(w);
    expect(near.every((q) => w.provincePlague[q] === NONE)).toBe(true);
    w.provinceQuarantine[p] = 0;
    week(w);
    expect(near.every((q) => w.provincePlague[q] === RUMOUR)).toBe(true);
    expect(w.plagueSick).toEqual([...w.plagueSick].sort((a, b) => a - b));
  });

  it("reaches crowded towns more, and a closed province less", () => {
    const { w, p } = game();
    const q = landNeighbours(w, p)[0]!;
    const base = catchChance(w, q, 0.1);
    expect(base).toBeCloseTo(0.1 * crowding(w, q) * (crowding(w, q) > 0 ? 1 : 0), 6);
    w.provinceQuarantine[q] = 1;
    expect(catchChance(w, q, 0.1)).toBeCloseTo(base * C.into_quarantine_factor, 6);
    // A town with more townsfolk is more crowded.
    const row = w.provinceClasses.subarray(q * CLASS_COUNT, (q + 1) * CLASS_COUNT);
    const before = crowding(w, q);
    CLASS_NAMES.forEach((c, k) => town.has(c) && (row[k] = row[k]! * 4));
    w.provincePopulation[q] = row.reduce((a, b) => a + b, 0);
    expect(crowding(w, q)).toBeGreaterThan(before);
  });

  it("travels with an army that stood where it raged", () => {
    C.spread_week = 0;
    C.army_spread_week = 10;
    const { w, me, p } = game();
    const q = landNeighbours(w, p).find((x) => w.provinceOwner[x] === me)!;
    startOutbreak(w, p, []);
    w.provincePlague[p] = OUTBREAK;
    w.provincePlagueWeeks[p] = 12;
    const slot = spawnArmy(w, me, p, 1000);
    week(w);
    expect(w.plagueCarriers.get(slot)).toBe(C.army_carry_weeks);
    w.armies.location[slot] = q;
    week(w);
    expect(w.provincePlague[q]).toBe(RUMOUR);
  });

  it("kills townsfolk first, then countryfolk", () => {
    const { w, p } = game();
    startOutbreak(w, p, []);
    w.provincePlague[p] = OUTBREAK;
    const row = () => Array.from(w.provinceClasses.subarray(p * CLASS_COUNT, (p + 1) * CLASS_COUNT));
    const sum = (r: number[], inTown: boolean) => r.reduce((a, n, k) => a + (town.has(CLASS_NAMES[k]!) === inTown ? n : 0), 0);
    const before = row();
    const people = w.provincePopulation[p]!;
    const dead = plagueDeaths(w, p);
    const after = row();
    expect(dead).toBeGreaterThan(0);
    expect(w.provincePopulation[p]).toBeCloseTo(people - dead, 3);
    const townLost = sum(before, true) - sum(after, true);
    const countryLost = sum(before, false) - sum(after, false);
    // Each town class loses its week's most, or all the dead come from the town.
    expect(townLost).toBeCloseTo(Math.min(dead, sum(before, true) * C.town_week_share_max), 5);
    expect(countryLost).toBeCloseTo(dead - townLost, 5);
    // Per head, the town dies faster than the countryside.
    expect(townLost / sum(before, true)).toBeGreaterThan(countryLost / sum(before, false));
    expect(w.provincePlagueDead[p]).toBeCloseTo(dead, 6);
  });

  it("lets the owner close a province: trade stops and tax falls while it lasts", () => {
    const { w, me, p } = game();
    w.provinceTradeRatio[p] = 40;
    const tax = provinceTax(w, p, me);
    const other = (me + 1) % w.nationCount;
    expect(applyNow(w, { type: "quarantine", province: p, on: true }, other).rejectedOrders[0]?.reason).toBe("not your province");
    const r = applyNow(w, { type: "quarantine", province: p, on: true }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect(r.news.some((n) => n.kind === "plague")).toBe(true);
    expect(w.provinceQuarantine[p]).toBe(1);
    expect(w.provinceTradeRatio[p]).toBe(0);
    // Without the trade ratio's tax and at half while closed.
    expect(provinceTax(w, p, me)).toBeLessThanOrEqual(tax * C.quarantine_tax_factor + 1e-9);
    expect(applyNow(w, { type: "quarantine", province: p, on: true }, me).rejectedOrders).toHaveLength(1);
    expect(applyNow(w, { type: "quarantine", province: p, on: false }, me).rejectedOrders).toEqual([]);
    expect(w.provinceQuarantine[p]).toBe(0);
  });

  it("has the AI close its crowded towns when the outbreak begins and open them when it is gone", () => {
    C.spread_week = 0;
    const { w, me, p } = game();
    w.player = -1;
    // Make the capital a crowded town.
    const row = w.provinceClasses.subarray(p * CLASS_COUNT, (p + 1) * CLASS_COUNT);
    CLASS_NAMES.forEach((c, k) => town.has(c) && (row[k] = row[k]! * 10));
    w.provincePopulation[p] = row.reduce((a, b) => a + b, 0);
    expect(crowding(w, p)).toBeGreaterThanOrEqual(1);
    startOutbreak(w, p, []);
    for (let i = 0; i < C.rumour_weeks; i++) week(w);
    expect(w.provincePlague[p]).toBe(OUTBREAK);
    expect(w.provinceQuarantine[p]).toBe(1);
    while (w.provincePlague[p] !== NONE) week(w);
    expect(w.provinceQuarantine[p]).toBe(0);
    void me;
    // The player's own provinces are his to close.
    const g = game();
    expect(setQuarantine(g.w, g.me, g.p, true, [])).toBeNull();
  });

  it("is kept in the save and restored, and older saves load without it", () => {
    const { w, me, p } = game();
    startOutbreak(w, p, []);
    w.provincePlague[p] = OUTBREAK;
    w.provincePlagueWeeks[p] = 9;
    w.provincePlagueDead[p] = 1.5;
    const q = landNeighbours(w, p)[0]!;
    w.provinceQuarantine[q] = 1;
    w.provincePlagueEnded[q] = w.day - 10;
    const slot = spawnArmy(w, me, p, 1000);
    w.plagueCarriers.set(slot, 3);
    w.plagueRng.next();
    const before = hashWorld(w);
    const chunks = worldChunks(w, { playerNation: "france", options: {} as never });
    const back = restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules).world;
    expect(hashWorld(back)).toBe(before);
    expect(back.plagueSick).toEqual([p]);
    expect(back.provincePlague[p]).toBe(OUTBREAK);
    expect(back.provincePlagueWeeks[p]).toBe(9);
    expect(back.provincePlagueDead[p]).toBeCloseTo(1.5, 6);
    expect(back.provinceQuarantine[q]).toBe(1);
    expect(spared(back, q)).toBe(true);
    expect(back.plagueCarriers.get(slot)).toBe(3);
    expect(Array.from(back.plagueRng.state)).toEqual(Array.from(w.plagueRng.state));
    // The same weeks play the same way after a load.
    week(w);
    week(back);
    expect(hashWorld(back)).toBe(hashWorld(w));
    // A save from before plague.
    const old = chunks.map((c) => {
      if (c.id !== "nations") return c;
      const body = unpackChunk(c);
      delete body.meta.plague;
      return packChunk(c.id, c.version, body);
    });
    const restored = restoreWorld(new Map(old.map((c) => [c.id, c])), rules).world;
    expect(restored.plagueSick).toEqual([]);
    expect(restored.provinceQuarantine.every((x) => x === 0)).toBe(true);
  });

  it("breaks out somewhere in a large realm every few years, not every few months", () => {
    const { w } = game();
    w.player = -1;
    const counts = new Map<number, number>();
    w.provinceOwner.forEach((o) => o >= 0 && counts.set(o, (counts.get(o) ?? 0) + 1));
    const big = [...counts].filter(([, n]) => n >= 40).map(([n]) => n);
    const years = 40;
    const sickYears = new Map<number, Set<number>>(big.map((n) => [n, new Set()]));
    for (let m = 0; m < years * 12; m++) {
      for (const d of provinceConfig.decided.plague_week_days) {
        w.date = { year: 1400 + Math.floor(m / 12), month: (m % 12) + 1, day: d };
        w.day += 7;
        weeklyPlague(w, []);
        for (const p of w.plagueSick) sickYears.get(w.provinceOwner[p]!)?.add(w.date.year);
      }
    }
    const share = big.map((n) => sickYears.get(n)!.size / years);
    const mean = share.reduce((a, b) => a + b, 0) / share.length;
    // Plague somewhere in a large realm in some years, but far from every year.
    expect(mean).toBeGreaterThan(0.08);
    expect(mean).toBeLessThan(0.6);
  });
});
