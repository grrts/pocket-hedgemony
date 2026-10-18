import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { classFood, feverDeathRateOf, feverOf, jobSlots, MAX_TILES, tilesOf, wearYear, wearYearsOf, wornFields } from "../src/land.ts";
import { landSheet } from "../src/works.ts";
import { CLASS_COUNT, CLASS_NAMES } from "../src/living.ts";
import { provinceConfig } from "../src/domain/province/model.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
let fresh: World | null = null;
const world = () => (fresh ??= createWorld(rules, 1, tiles));
const FARMERS = CLASS_NAMES.indexOf("farmers");
const WORN = provinceConfig.worn;

/** A land province with fields and an owner. */
function fieldsProvince(w: World): number {
  for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p] && w.provinceOwner[p]! >= 0 && tilesOf(w, p, "fields") >= 2) return p;
  throw new Error("no fields province");
}

describe("land and health (PROV-333, PROV-334)", () => {
  it("wears overworked fields one tile at a time and lets rested ones recover", () => {
    const w = createWorld(rules, 1, tiles);
    const p = fieldsProvince(w);
    const fields = tilesOf(w, p, "fields");
    const room = fields * jobSlots("farm");
    w.provinceClasses[p * CLASS_COUNT + FARMERS] = room * 1.2;
    w.provinceOverwork[p] = Math.ceil(wearYearsOf(w, p)) - 1;
    const before = classFood(w, p, "farmers", 1);
    wearYear(w);
    expect(wornFields(w, p)).toBe(1);
    expect(w.provinceOverwork[p]).toBe(0);
    expect(classFood(w, p, "farmers", 1)).toBeLessThan(before);
    // The worn tile shows on the Land tab and feeds half a sound one.
    const rows = landSheet(w, p).filter((r) => r.use === "fields");
    const worn = rows.filter((r) => r.worn);
    expect(worn).toHaveLength(1);
    expect(worn[0]!.feeds).toBeCloseTo(rows[0]!.feeds * WORN.output, 5);
    // Fewer farmers than the sound fields hold: the worn tile rests 5 years and is sound again.
    w.provinceClasses[p * CLASS_COUNT + FARMERS] = (fields - 1) * jobSlots("farm") * 0.5;
    for (let y = 1; y < WORN.recovery_years; y++) wearYear(w);
    expect(wornFields(w, p)).toBe(1);
    wearYear(w);
    expect(wornFields(w, p)).toBe(0);
  });

  it("makes wearing rarer with rotation inventions", () => {
    const w = createWorld(rules, 1, tiles);
    const p = fieldsProvince(w);
    const known = w.research[w.provinceOwner[p]!]!.known as Set<string>;
    for (const id of WORN.rotation_inventions) known.delete(id);
    expect(wearYearsOf(w, p)).toBe(WORN.overwork_years);
    known.add("F1");
    expect(wearYearsOf(w, p)).toBe(WORN.overwork_years * WORN.rotation_stretch);
  });

  it("sets fever land by ground, the tropics and marsh, and spares the locals", () => {
    const w = world();
    let jungle = -1;
    let farmland = -1;
    for (let p = 0; p < w.provinceCount; p++) {
      if (w.provinceWater[p]) continue;
      if (jungle < 0 && w.provinceGround[p] === "jungle" && Math.abs(w.provincePlace[p]!.lat) <= 10) jungle = p;
      if (farmland < 0 && w.provinceGround[p] === "farmland" && Math.abs(w.provincePlace[p]!.lat) > 40 && tilesOf(w, p, "marsh") === 0) farmland = p;
    }
    expect(feverOf(w, jungle)).toBe(3);
    expect(feverOf(w, farmland)).toBe(0);
    expect(feverDeathRateOf(w, jungle, false)).toBeCloseTo(0.3);
    expect(feverDeathRateOf(w, jungle, true)).toBeCloseTo(0.03);
    const counts = [0, 0, 0, 0];
    for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p]) counts[feverOf(w, p)]!++;
    // Most of the world is free of fever; deadly land is the tropical jungle.
    expect(counts[0]!).toBeGreaterThan(counts[1]! + counts[2]! + counts[3]!);
    expect(counts[3]!).toBeGreaterThan(0);
  });

  it("keeps worn fields through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const p = fieldsProvince(w);
    w.provinceWorn[p] = 1;
    w.provinceOverwork[p + 1] = 12;
    w.provinceRested[p] = 3;
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.provinceWorn[p]).toBe(1);
    expect(back.provinceOverwork[p + 1]).toBe(12);
    expect(back.provinceRested[p]).toBe(3);
    expect(back.provinceTiles.length).toBe(w.provinceCount * MAX_TILES);
  });
});
