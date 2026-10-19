import { describe, expect, it } from "vitest";
import nations from "../data/scenarios/1378/regions/africa-americas/map-nations.json" with { type: "json" };
import owners from "../data/scenarios/1378/regions/africa-americas/map-owners.json" with { type: "json" };
import rulers from "../data/scenarios/1378/regions/africa-americas/rulers.json" with { type: "json" };
import culture from "../data/scenarios/1378/regions/africa-americas/culture-start.json" with { type: "json" };
import relations from "../data/scenarios/1378/regions/africa-americas/relations.json" with { type: "json" };
import subjects from "../data/scenarios/1378/regions/africa-americas/subjects.json" with { type: "json" };
import ports from "../data/scenarios/1378/regions/africa-americas/ports.json" with { type: "json" };
import sleeping from "../data/scenarios/1378/regions/africa-americas/sleeping-realms.json" with { type: "json" };

// The Africa and Americas fragment of the 1378 start (X-25): each file agrees with the others.
describe("1378 start: Africa and the Americas", () => {
  const ids = new Set(nations.map((n) => n.id));

  it("names each map nation once, and every owner rule names one of them", () => {
    expect(ids.size).toBe(nations.length);
    for (const r of owners) expect(ids.has(r.nation)).toBe(true);
  });

  it("puts the realms born after the start to sleep, off the map", () => {
    for (const s of sleeping.realms) {
      expect(ids.has(s.id)).toBe(false);
      expect(s.forms_about).toBeGreaterThan(1378);
    }
    for (const id of ["adal", "kongo", "mutapa", "cherokee", "creek"]) expect(sleeping.realms.some((s) => s.id === id)).toBe(true);
    for (const id of ["ifat", "tepanecs", "chanka", "great_zimbabwe", "mogadishu"]) expect(ids.has(id)).toBe(true);
  });

  it("gives every map nation a ruler entry and its tongues", () => {
    expect(new Set(Object.keys(rulers.rulers))).toEqual(ids);
    for (const id of Object.keys(culture.realms)) expect(ids.has(id)).toBe(true);
    for (const c of Object.values(culture.realms)) expect(c.mix.reduce((a, [, s]) => a + (s as number), 0)).toBeCloseTo(1, 5);
  });

  it("lists the subjects of the relations and dates them to the start day", () => {
    expect(relations.reference_date).toBe("1378-09-20");
    const subjectRelations = relations.relations.filter((r) => r.type === "subject").map((r) => `${r.source}>${r.target}`);
    expect(subjects.subjects.map(([s, o]) => `${s}>${o}`)).toEqual(subjectRelations);
    expect(subjects.subjects).toContainEqual(["tenochtitlan", "tepanecs", "tributary", "high", "c.1325"]);
    expect(relations.relations.some((r) => r.type === "at_war" && r.source === "ethiopia" && r.target === "ifat")).toBe(true);
  });

  it("places every port by its own coordinates, with a 1378 holder", () => {
    for (const t of ports.towns) {
      expect(typeof t.lat).toBe("number");
      expect(t.holder).toBeTruthy();
      expect(sleeping.realms.some((s) => s.id === t.holder)).toBe(false);
    }
  });
});
