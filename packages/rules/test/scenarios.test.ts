import { describe, expect, it } from "vitest";
import { readScenario } from "../src/scenarios.ts";

describe("start scenarios (X-25)", () => {
  it("reads the bundled 1444 scenario from disk", () => {
    const s = readScenario("1444");
    expect(s.mapNations.length).toBeGreaterThan(100);
    expect(s.rulers.france).toBeTruthy();
  });

  it("joins the 1378 regions without clashes, and every name they use is defined", () => {
    const s = readScenario("1378");
    expect(s.scenario.date).toEqual({ year: 1378, month: 9, day: 20 });
    const realms = new Set([...s.mapNations, ...s.sleepingRealms].map((n) => n.id));
    for (const o of s.mapOwners) if (o.nation !== null) expect(realms, `owner rule for ${o.nation}`).toContain(o.nation);
    for (const id of Object.keys(s.rulers)) expect(realms, `ruler of ${id}`).toContain(id);
    for (const id of Object.keys(s.culture.realms)) expect(realms, `tongues of ${id}`).toContain(id);
    for (const t of s.ports) expect(realms, `port ${t.name}`).toContain(t.holder);
  });
});
