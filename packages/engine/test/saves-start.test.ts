import { describe, expect, it } from "vitest";
import { loadDefaultRuleset, START_ID } from "@ph/rules";
import { createWorld, Rng } from "../src/index.ts";
import { buildSave, decodeSave, encodeSave, memoryStorage, newCampaign, openSave, saveStart } from "../src/domain/saves/index.ts";

// A campaign plays on in the world it began in (SAVE-111, X-25).
describe("the start a save began from", () => {
  const rules = loadDefaultRuleset();
  const world = createWorld(rules, 7);
  const rng = new Rng(3);
  const ctx = { storage: memoryStorage(), rules, rng, device: "Pixel 8", platform: "android" as const, gameVersion: "1.0.0", now: 1_700_000_000_000 };
  const nation = rules.nations[0]!;
  const saved = buildSave(ctx, newCampaign(rng, { playerNation: nation.id, nationName: nation.name }), world, "manual");

  it("names the start in the header", () => {
    expect(saved.header.start).toBe(START_ID);
    expect(openSave(saved.bytes, { rules, fullGame: true }).kind).toBe("opened");
  });

  it("reads a save without a start as begun in 1444", () => {
    expect(saveStart({})).toBe("1444");
  });

  it("never opens a save from another start in this world", () => {
    const { header, chunks } = decodeSave(saved.bytes);
    const other = START_ID === "1444" ? "1378" : "1444";
    const r = openSave(encodeSave({ ...header, start: other }, [...chunks.values()]), { rules, fullGame: true });
    expect(r.kind === "rejected" && r.problem).toBe("other-start");
  });
});
