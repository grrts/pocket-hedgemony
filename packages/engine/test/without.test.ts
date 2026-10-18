import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, spawnArmy, type World } from "../src/index.ts";
import { battleArmy, battleRow } from "../src/war.ts";
import { foundProblem } from "../src/trade.ts";
import { withoutOf } from "../src/research.ts";
import * as wf from "../src/domain/warfare/index.ts";

const rules = loadDefaultRuleset();
/** Realm n knows the invention, or lacks it. */
const set = (w: World, n: number, id: string, known: boolean) => (known ? w.research[n]!.known.add(id) : w.research[n]!.known.delete(id));

describe("without a past invention (RSCH-094)", () => {
  const w = createWorld(rules, 1);
  const fra = w.nationIndex.get("france")!;
  const cap = w.provinceIndex.get(rules.nations[fra]!.capital)!;

  it("an army of a realm without B01 Wheel and carts carries half the food", () => {
    set(w, fra, "B01", true);
    const full = w.armies.food[spawnArmy(w, fra, cap, 5000)]!;
    set(w, fra, "B01", false);
    const half = w.armies.food[spawnArmy(w, fra, cap, 5000)]!;
    set(w, fra, "B01", true);
    expect(full).toBeGreaterThan(0);
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it("regiments of a realm without C01 Iron smelting fight 20 % weaker, the other side as before", () => {
    const fight = (attKnows: boolean) => {
      set(w, fra, "C01", attKnows);
      const s = spawnArmy(w, fra, cap, 10000);
      const att = { country: "a", army: battleArmy(w, [s], "a")[0], known: new Set<string>(), strengthPct: withoutOf(w, fra).strengthPct };
      const def = { country: "d", army: battleArmy(w, [s], "d")[0], known: new Set<string>(), strengthPct: 0 };
      const era = wf.eraOfYear(1444);
      return wf.fightBattle({ attacker: att, defender: def, sectors: wf.battlefield(battleRow("grassland"), { ground: "grassland", era }), ground: "grassland", era });
    };
    const lost = (r: wf.BattleResult, side: string) => r.losses[side]!.killed + r.losses[side]!.wounded + r.losses[side]!.fled;
    const knowing = fight(true);
    const lacking = fight(false);
    set(w, fra, "C01", true);
    expect(withoutOf(w, fra).strengthPct).toBe(0);
    expect(lost(lacking, "d")).toBeLessThan(lost(knowing, "d"));
  });

  it("a realm without F03 Riding and pack animals founds no camel caravan", () => {
    // A city of any realm where a camel caravan could be founded while F03 is known.
    let city = -1;
    let n = -1;
    for (let p = 0; p < w.provinceCount && city < 0; p++) {
      const o = w.provinceOwner[p]!;
      if (o < 0) continue;
      w.nationTreasury[o] = 1e6;
      set(w, o, "F03", true);
      if (foundProblem(w, o, p, "camel_caravan") === null) [city, n] = [p, o];
    }
    expect(city).toBeGreaterThanOrEqual(0);
    set(w, n, "F03", false);
    expect(foundProblem(w, n, city, "camel_caravan")).toBe("needs Riding and pack animals");
    expect(foundProblem(w, n, city, "pack_caravan")).toBeNull();
  });
});
