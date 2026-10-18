import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, officialName, personName } from "../src/index.ts";

const rules = loadDefaultRuleset();
const nation = (id: string) => rules.nations.findIndex((n) => n.id === id);

describe("culture names (feedback 33)", () => {
  it("names people after their realm's culture", () => {
    const castilian = rules.names!.cultures.castilian!;
    const name = personName(rules, nation("castile"), 12345, "Toledo");
    expect(castilian.given.some((g) => name.startsWith(`${g} `))).toBe(true);
    expect(castilian.family!.some((f) => name.endsWith(` ${f}`))).toBe(true);
    const ming = personName(rules, nation("ming"), 12345, "Beijing");
    expect(rules.names!.cultures.chinese!.family!.some((f) => ming.startsWith(`${f} `))).toBe(true);
  });

  it("keeps a province's official the same, and the commissioned commander takes their name", () => {
    const w = createWorld(rules, 3);
    const me = nation("castile");
    w.player = me;
    w.nationTreasury[me] = 1000;
    // A royal province: a lord's official serves the lord and is not commissioned.
    const p = w.provinceOwner.findIndex((o, i) => o === me && w.provinceLord[i]! < 0 && w.provinceOfficial[i]! >= 0);
    const name = officialName(rules, p, me);
    expect(officialName(rules, p, me)).toBe(name);
    const r = applyNow(w, { type: "commission", province: p }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect(w.commanders.at(-1)!.name).toBe(name);
  });
});
