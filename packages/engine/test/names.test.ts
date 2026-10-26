import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, cultureOf, officialName, personName, rankedName } from "../src/index.ts";

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

describe("ranks in the culture's language (feedback 125)", () => {
  it("puts the rank where the language puts it", () => {
    expect(rankedName(rules, nation("portugal"), "Fernão Coutinho", "admiral")).toBe("Almirante Fernão Coutinho");
    expect(rankedName(rules, nation("castile"), "Rodrigo Manrique", "general")).toBe("Mariscal Rodrigo Manrique");
    expect(rankedName(rules, nation("japan"), "Hosokawa Katsumoto", "general")).toBe("Hosokawa Katsumoto Taishō");
  });

  it("ranks a fleet leader by his post, and every culture with an admiral has a commodore or viceroy too", () => {
    expect(rankedName(rules, nation("portugal"), "Fernão Coutinho", "commodore")).toBe("Capitão-mor Fernão Coutinho");
    expect(rankedName(rules, nation("portugal"), "Fernão Coutinho", "viceroy")).toBe("Vice-Rei Fernão Coutinho");
    expect(rankedName(rules, nation("japan"), "Hosokawa Katsumoto", "viceroy")).toBe("Hosokawa Katsumoto Tandai");
    for (const [id, c] of Object.entries(rules.names!.cultures))
      if (c.ranks?.admiral) for (const p of [c.ranks.commodore, c.ranks.viceroy]) if (p !== undefined) expect(p, id).toContain("{name}");
    const seafaring = Object.entries(rules.names!.cultures).filter(([, c]) => c.ranks?.admiral);
    expect(seafaring.filter(([, c]) => !c.ranks!.viceroy).map(([id]) => id)).toEqual(["ethiopian"]);
  });

  it("names the map data's stand-in generals in their realm's culture", () => {
    const w = createWorld(rules, 3);
    expect(w.commanders.filter((c) => c.name.startsWith("General of ")).map((c) => c.name)).toEqual([]);
    expect(w.commanders.some((c) => c.name === "Hunyadi János")).toBe(true);
  });

  it("gives every culture with ranks a rank for leading an army", () => {
    for (const [id, c] of Object.entries(rules.names!.cultures)) if (c.ranks) expect(c.ranks.general, id).toContain("{name}");
  });

  it("names a free company's captain with his rank in the language of the land it gathers in", () => {
    const w = createWorld(rules, 3);
    expect(w.freeCompanies.length).toBeGreaterThan(0);
    for (const c of w.freeCompanies) {
      const home = rules.nations.findIndex((n) => n.capital === rules.provinces[c.home]!.id);
      const [before, after] = (cultureOf(rules, home)?.ranks?.captain ?? "{name}").split("{name}");
      expect(c.captain.startsWith(before!) && c.captain.endsWith(after!), c.captain).toBe(true);
      expect(c.captain.length).toBeGreaterThan(`${before}${after}`.length);
    }
  });
});

