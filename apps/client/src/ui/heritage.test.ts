import { describe, expect, it, vi } from "vitest";
import { realmStrengths, type HeritageView } from "@ph/engine";
import { heritageLine, heritageTab } from "./heritage.ts";

vi.mock("../art/ui.ts", () => ({ icon: () => "" }));

describe("the realm card's Heritage tab (HER-081..083)", () => {
  it("shows the birthright, each golden age with its age and the weakness, each opening on a tap to its history note", () => {
    const html = heritageTab(realmStrengths("france"));
    expect(html.match(/<details class="heritage-part/g)).toHaveLength(5);
    expect(html).toContain("Taille without consent");
    expect(html).toContain("Age of Crisis and Absolutism");
    expect(html).toContain("Princes of the blood");
    expect(html).toContain('class="why-note"');
  });

  it("shows all 14 assessments in three groups, marking low confidence as uncertain", () => {
    const html = heritageTab(realmStrengths("mali"));
    expect(html.match(/<h4 class="sub">/g)).toHaveLength(3);
    expect(html.match(/<li /g)).toHaveLength(14);
    expect(html).toContain("Reach of rule: moderate (uncertain)");
  });

  it("says under each assessment which starting number it sets (REALM-232)", () => {
    const html = heritageTab(realmStrengths("france"));
    for (const what of ["starting gold", "starting debt", "levies at the start", "officials at their posts", "envoys at court"]) expect(html).toContain(`<small class="sets">${what}</small>`);
    expect(html.match(/class="sets"/g)).toHaveLength(5);
  });

  it("says so for a realm with nothing recorded", () => {
    const html = heritageTab(realmStrengths("ireland"));
    expect(html).toContain("No heritage is recorded");
    expect(html).not.toContain("<li ");
  });
});

describe("ambitions in plain sight, rewards hidden (HER-091, HER-092, X-27)", () => {
  const view: HeritageView = {
    birthrights: [{ id: "portugal_sagres_pilots", dormant: false }],
    heydays: [],
    burden: null,
    legacies: [],
    open: 2,
    ambitions: [
      { id: "a", theme: "sea", name: "Beyond the Cape of Storms", goal: "Hold Goa or Calicut on the Malabar coast.", progress: { have: 0, need: 1 }, legacy: "Estado da Índia", great: true, deadline: 1560, state: "open" },
      { id: "b", theme: "wealth", name: "Twelve markets", goal: "Keep 12 markets.", progress: { have: 8, need: 12 }, near: true, legacy: "The fair of Lisbon", state: "open" },
      { id: "c", theme: "wealth", name: "The gold of Mina", goal: "Hold Elmina on the Gold Coast.", legacy: "Casa da Mina", reward: "Tax reaching you from the coast +10 %.", state: "done" },
    ],
    counsel: { gold: 30, nextYear: null },
  };

  it("shows each open ambition's goal and progress and names its legacy, but not what it gives", () => {
    const html = heritageTab(realmStrengths("portugal"), view, 100);
    expect(html).toContain("Hold Goa or Calicut on the Malabar coast.");
    expect(html).toContain("<b>0/1</b>");
    expect(html).toContain("<b>8/12</b>");
    expect(html).toContain('aria-label="8 of 12"');
    expect(html).toContain("promises <b>Estado da Índia</b> (a great legacy) · by 1560");
    expect(html).toContain('class="aim near"');
    expect(html.match(/data-heritage-counsel=/g)).toHaveLength(2);
  });

  it("shows what a legacy gives once its ambition is fulfilled", () => {
    const html = heritageTab(realmStrengths("portugal"), view, 100);
    expect(html).toContain("Fulfilled: The gold of Mina. <b>Casa da Mina</b>: Tax reaching you from the coast +10 %.");
  });

  it("puts each ambition's progress on the General tab's Heritage line", () => {
    expect(heritageLine(realmStrengths("portugal"), view)).toContain("ambitions 0/1 · 8/12");
    const { ambitions: _a, counsel: _c, ...other } = view;
    expect(heritageLine(realmStrengths("portugal"), other)).toContain("2 ambitions");
  });
});
