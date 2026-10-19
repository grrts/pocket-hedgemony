import { describe, expect, it } from "vitest";
import { assassinCard, type AssassinAsk, type LordView } from "./lords.ts";

const lord: LordView = { k: 3, name: "Jean of Armagnac", house: "Armagnac", nation: 0, loyalty: "Disloyal", lands: 5 };
const ask: AssassinAsk = { open: true, gold: 25, chance: 0.45, base: 0.6, heir: "Bernard", heirLoyalty: "Wavering", onFailure: "Disloyal", others: 4, house: 1 };

describe("the assassin's confirm card (REALM-284)", () => {
  it("names the cost, the odds and what follows either way", () => {
    const html = assassinCard(lord, ask, 100);
    expect(html).toContain("Send an assassin after Jean of Armagnac?");
    expect(html).toContain("<b>25 gold</b>, spent either way");
    expect(html).toContain("<b>45 %</b> he succeeds (a great lord is well guarded)");
    expect(html).toContain("his heir Bernard takes his lands, wavering");
    expect(html).toContain("the other 1 of House Armagnac turns disloyal");
    expect(html).toContain("every other lord of yours (4) falls a step of loyalty");
    expect(html).toContain("he turns disloyal, and every other lord still falls a step");
    expect(html).toMatch(/data-assassinate="3" >Send the assassin/);
    expect(html).toContain("data-assassin-cancel");
  });

  it("says where the land goes with no heir, and waits for the gold", () => {
    const html = assassinCard(lord, { ...ask, heir: null, chance: 0.6, others: 0, house: 0 }, 10);
    expect(html).toContain("with no heir, a kinsman may take his lands, wavering, or they return to the crown");
    expect(html).not.toContain("well guarded");
    expect(html).not.toContain("falls a step");
    expect(html).toContain("disabled>Needs 25 gold");
  });
});
