import { describe, expect, it } from "vitest";
import { realmStrengths } from "@ph/engine";
import { heritageTab } from "./heritage.ts";

describe("the realm card's Heritage tab (HER-081..083)", () => {
  it("shows the birthright, each heyday with its age and the burden, each opening on a tap to its history note", () => {
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

  it("says so for a realm with nothing recorded", () => {
    const html = heritageTab(realmStrengths("ireland"));
    expect(html).toContain("No heritage is recorded");
    expect(html).not.toContain("<li ");
  });
});
