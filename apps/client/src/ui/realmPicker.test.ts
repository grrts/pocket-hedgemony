import { describe, expect, it } from "vitest";
import { pickerCardHtml, regionListHtml, regionSelectHtml, sortRows, strongIn } from "./realmPicker.ts";

const row = (index: number, name: string, provinces = 1) => ({ index, name, provinces, standing: "Starts in Era I", pennant: "" });

describe("the realm picker (SETUP-072, SETUP-073)", () => {
  it("offers only the regions that have realms, Suggested first", () => {
    const html = regionSelectHtml(
      [
        { id: "europe", name: "Europe", count: 3 },
        { id: "oceania", name: "Oceania", count: 0 },
        { id: "sub_saharan_africa", name: "Sub-Saharan Africa", count: 2 },
      ],
      "sub_saharan_africa",
      5,
    );
    expect(html.indexOf("Suggested")).toBeLessThan(html.indexOf("Europe"));
    expect(html).not.toContain("Oceania");
    expect(html).toContain(`value="sub_saharan_africa" selected`);
  });

  it("lists every realm of the region, A to Z, each a row that opens its card", () => {
    const rows = [row(4, "Kongo", 5), row(2, "Benin", 3), row(9, "Allada", 1)];
    expect(sortRows(rows).map((r) => r.name)).toEqual(["Allada", "Benin", "Kongo"]);
    const html = regionListHtml("Sub-Saharan Africa", rows);
    expect(html.match(/data-realm="/g)).toHaveLength(3);
    expect(html).toContain("1 province ·");
    expect(html).toContain("3 realms in Sub-Saharan Africa");
  });

  it("shows the realm at a glance with one Ways to grow line", () => {
    const html = pickerCardHtml({ form: "Chiefdom", provinces: 2, people: "40,000", strong: [], ways: { smallerNeighbours: 3, freeProvinces: 4, goldFields: 0, mines: 0, tradeTowns: 0, ports: 1 } });
    expect(html).toContain("Chiefdom");
    expect(html).toContain("Ways to grow:</b> 3 smaller neighbours · 4 free provinces · 1 port");
  });

  it("reads strengths from the realm's catalogue record, or says none are recorded", () => {
    expect(strongIn("no_such_realm")).toBeNull();
    expect(Array.isArray(strongIn("mali"))).toBe(true);
  });
});
