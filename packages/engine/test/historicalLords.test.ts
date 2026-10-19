import { describe, expect, it } from "vitest";

// The 1378 start behind the dev switch (rules/src/start.ts), chosen when @ph/rules loads.
process.env.PH_START = "1378";
const { loadDefaultRuleset, startLords } = await import("@ph/rules");
const { createWorld } = await import("../src/index.ts");
const { lordLands } = await import("../src/lords.ts");
const { lordTraits } = await import("../src/peace.ts");
const { personDies } = await import("../src/people.ts");

const rules = loadDefaultRuleset();
const w = createWorld(rules, 1);
const lordOf = (id: string) => w.lords.findIndex((l) => l.historical === id);

describe("historical lords of 1378 (REALM-290 to REALM-293)", () => {
  it("every historical lord is seated in his realm on land it holds, never its capital", () => {
    const missing: string[] = [];
    for (const [realm, list] of Object.entries(startLords.realms)) {
      const n = w.nationIndex.get(realm);
      expect(n, realm).toBeDefined();
      for (const h of list) {
        const k = lordOf(h.id);
        if (k < 0) {
          missing.push(`${realm}: ${h.name}`);
          continue;
        }
        const l = w.lords[k]!;
        expect(l.nation).toBe(n);
        const lands = lordLands(w, k);
        expect(lands.length, h.name).toBeGreaterThan(0);
        expect(lands.map((p) => w.provinceIds[p])).not.toContain(rules.nations[n!]!.capital);
      }
    }
    expect(missing).toEqual([]);
  });

  it("a historical lord takes his name, title, traits, age and heir from the data", () => {
    const k = lordOf("henry_percy");
    const l = w.lords[k]!;
    expect(l.name).toBe("Henry Percy");
    expect(l.title).toBe("Earl of Northumberland");
    expect(lordTraits(w, k)).toEqual(["Warlike", "Greedy"]);
    expect(l.age).toBe(1378 - 1341);
    expect(l.heir).toEqual({ name: "Henry 'Hotspur' Percy", age: 1378 - 1364 });
    expect(w.provinceIds[lordLands(w, k)[0]!]).toBe("p567");
  });

  it("the rest of a realm's lords stay generated, and the 1444 great houses do not reach France in 1378", () => {
    const france = w.nationIndex.get("france")!;
    const lords = w.lords.filter((l) => l.nation === france);
    expect(lords.some((l) => !l.historical)).toBe(true);
    expect(lords.map((l) => l.house)).not.toContain("Anjou");
  });

  it("no generated lord takes a historical lord's house: 1378 Hungary has no Hunyadi before the event brings one", () => {
    const hungary = w.nationIndex.get("hungary")!;
    expect(w.lords.filter((l) => l.nation === hungary && !l.historical && /Hunyadi|Garai/.test(l.name))).toEqual([]);
  });

  it("the head of a seated house in history is that house's lord", () => {
    const k = lordOf("hosokawa_yoriyuki");
    expect(w.lords[k]!.house).toBe("Hosokawa");
    expect(w.lords.filter((l) => l.nation === w.lords[k]!.nation && l.house === "Hosokawa")).toHaveLength(1);
  });

  it("a lord the sources set against the crown starts so", () => {
    expect(w.lords[lordOf("shimazu_ujihisa")]!.loyalty).toBe("Disloyal");
  });

  it("his heir keeps the title, not the history (REALM-293)", () => {
    const k = lordOf("john_of_gaunt");
    personDies(w, { kind: "lord", lord: k }, "old age", []);
    const l = w.lords[k]!;
    expect(l.name).toBe("Henry of Bolingbroke");
    expect(l.title).toBe("Duke of Lancaster");
    expect(l.historical).toBeUndefined();
    expect(l.note).toBeUndefined();
  });
});
