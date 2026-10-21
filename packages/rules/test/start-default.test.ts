import { describe, expect, it } from "vitest";

// With no switch, new campaigns start in 1378 (X-25, SETUP-095). The test
// config pins the 1444 checkpoint, so this file clears it before the first
// import, since the start is chosen when the module loads.
delete process.env.PH_START;
const rules = await import("../src/index.ts");

describe("the default start (X-25)", () => {
  it("starts new campaigns on 20 September 1378", () => {
    expect(rules.START_ID).toBe("1378");
    expect(rules.START_DATE).toEqual({ year: 1378, month: 9, day: 20 });
    expect(rules.START_SCENARIO.name).toBe("Autumn 1378");
  });
});
