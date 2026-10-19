import { describe, expect, it } from "vitest";
import { checkFacts, checkRelations } from "../src/domain/diplomacy/relations.ts";
import nations from "../../rules/data/scenarios/1378/regions/asia/map-nations.json" with { type: "json" };
import owners from "../../rules/data/scenarios/1378/regions/asia/map-owners.json" with { type: "json" };
import rulers from "../../rules/data/scenarios/1378/regions/asia/rulers.json" with { type: "json" };
import culture from "../../rules/data/scenarios/1378/regions/asia/culture-start.json" with { type: "json" };
import relations from "../../rules/data/scenarios/1378/regions/asia/relations.json" with { type: "json" };
import subjects from "../../rules/data/scenarios/1378/regions/asia/subjects.json" with { type: "json" };
import sleeping from "../../rules/data/scenarios/1378/regions/asia/sleeping-realms.json" with { type: "json" };
import culture1444 from "../../rules/data/scenarios/1444/culture-start.json" with { type: "json" };
import cultureRules from "../../rules/data/domain/culture.json" with { type: "json" };
import religion from "../../rules/data/domain/religion.json" with { type: "json" };

// The 1378 start's South, East and Southeast Asia (X-25, milestone 10 step 5), checked on its own
// until the region folders are merged into the scenario.
describe("1378 scenario: Asia", () => {
  const ids = new Set(nations.map((n) => n.id));

  it("holds the relations of 20 September 1378 by the dataset's rules (DIPL-020)", () => {
    const rep = checkRelations(relations.relations as Record<string, unknown>[], { historical: true, referenceDate: "1378-09-20" });
    expect(rep.errors).toEqual([]);
    expect(checkFacts(relations.facts as Record<string, unknown>[]).errors).toEqual([]);
  });

  it("hands land only to its own map nations, and every map nation gets land (SETUP-040, SETUP-041)", () => {
    expect(ids.size).toBe(nations.length);
    for (const r of owners) if (r.nation !== null) expect(ids, `owner rule for ${r.nation}`).toContain(r.nation);
    for (const id of ids) expect(owners.some((r) => r.nation === id), id).toBe(true);
    for (const n of nations) {
      const [lon = NaN, lat = NaN] = n.capital;
      expect(lon >= 60 && lon <= 150 && lat >= -12 && lat <= 55, n.id).toBe(true);
    }
  });

  it("names a ruler, a court tongue and the people's tongues for every map nation (REALM-233, CULT-094)", () => {
    const tongues = new Set([...cultureRules.tongues.map((t) => t.id), ...Object.keys(culture1444.tongues), ...Object.keys(culture.tongues)]);
    const faiths = new Set(Object.keys(religion.faiths));
    const realms = culture.realms as unknown as Record<string, { court: string; mix: [string, number][]; faith?: string }>;
    for (const id of ids) {
      expect(rulers.rulers, id).toHaveProperty(id);
      const c = realms[id]!;
      expect(c, id).toBeDefined();
      expect(tongues, `${id} court`).toContain(c.court);
      for (const [t] of c.mix) expect(tongues, `${id} ${t}`).toContain(t);
      expect(c.mix.reduce((s, [, x]) => s + x, 0)).toBeCloseTo(1, 5);
      if (c.faith) expect(faiths, `${id} faith`).toContain(c.faith);
    }
  });

  it("keeps the subjects file in step with the relations", () => {
    const fromRelations = relations.relations.filter((r) => r.type === "subject").map((r) => [r.source, r.target, r.subject_kind, r.autonomy, r.start_date]);
    expect(subjects.subjects).toEqual(fromRelations);
  });

  it("lists the realms history founds later as sleeping realms, not map nations (SETUP-080, X-24)", () => {
    for (const r of sleeping.realms) {
      expect(ids.has(r.id), r.id).toBe(false);
      expect(r.home.length, r.id).toBeGreaterThan(0);
      expect(r.capital, r.id).toHaveLength(2);
    }
    for (const id of ["malacca", "jaunpur", "gujarat", "malwa", "multan", "oirat"]) expect(sleeping.realms.map((r) => r.id)).toContain(id);
  });
});
