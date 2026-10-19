import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn, type World } from "../src/index.ts";
import { grievancesOf } from "../src/moods.ts";
import { cedeProvince } from "../src/war.ts";
import { LEDGER, LEDGER_LINES, runLedger } from "../src/treasury.ts";
import { newLandUpkeep, newlyTaken } from "../src/newlyTaken.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const NEW_LAND = LEDGER.indexOf("new land");

function nextMonth(w: World): void {
  const m = w.date.month;
  while (w.date.month === m) processTurn(w, [], w.player);
  processTurn(w, [], w.player);
}

describe("newly taken land (X-28)", () => {
  it("holds the grievance and costs upkeep on the New land line for ten years", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = w.nationIndex.get("castile")!;
    const portugal = w.nationIndex.get("portugal")!;
    const p = Array.from({ length: w.provinceCount }, (_, q) => q).find((q) => w.provinceOwner[q] === portugal && w.provinceIndex.get(rules.nations[portugal]!.capital) !== q)!;
    cedeProvince(w, p, castile, []);
    expect(newlyTaken(w, p)).toBe(true);
    nextMonth(w);
    expect(grievancesOf(w, p)).toContain("Newly taken");
    runLedger(w, false);
    expect(newLandUpkeep(w, p)).toBeGreaterThan(0);
    expect(w.nationLedger[castile * LEDGER_LINES + NEW_LAND]).toBeLessThan(0);
    // Ten years on, it is simply Castile's.
    w.provinceTakenYear[p] = w.date.year - 10;
    nextMonth(w);
    expect(grievancesOf(w, p)).not.toContain("Newly taken");
    runLedger(w, false);
    expect(newLandUpkeep(w, p)).toBe(0);
  });

  it("land held since the start is not newly taken", () => {
    const w = createWorld(rules, 1, tiles);
    expect(Array.from(w.provinceTakenYear).every((y) => y === -1)).toBe(true);
  });
});
