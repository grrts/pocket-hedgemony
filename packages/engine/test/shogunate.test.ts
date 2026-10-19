import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { advance, createWorld, STEPS_PER_TURN, type News } from "../src/index.ts";
import { formOf } from "../src/government.ts";
import { hashWorld } from "../src/hash.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { eventFired } from "../src/institutions.ts";
import { askTheCourt, breakShogunate, closedTo, closeCountry, confirmHouse, housesOf, monthlyShogunate, shogunOf, summonHouse, vacantMembers } from "../src/shogunate.ts";
import { syncDate } from "../src/index.ts";

const rules = loadDefaultRuleset();
const N = (w: ReturnType<typeof createWorld>, id: string) => w.nationIndex.get(id)!;
const P = (w: ReturnType<typeof createWorld>, id: string) => w.provinceIndex.get(id)!;

function month(w: ReturnType<typeof createWorld>, year: number, m: number, news: News[]): void {
  w.date = { year, month: m, day: 1 };
  syncDate(w);
  monthlyShogunate(w, news);
}

describe("the Shogunate (INST-060 to INST-069)", () => {
  it("starts with Japan as shogun over fourteen great houses on their own land", () => {
    const w = createWorld(rules, 1);
    const japan = N(w, "japan");
    expect(shogunOf(w)).toBe(japan);
    expect(w.shogunate!.hold).toBe(30);
    expect(w.shogunate!.land.length).toBe(32);
    const houses = housesOf(w).map((k) => w.lords[k]!.house);
    expect(houses.length).toBe(14);
    expect(houses).toContain("Hosokawa");
    expect(w.lords[w.provinceLord[P(w, "p2432")]!]!.house).toBe("Ōuchi");
    // The Court's province stays royal.
    expect(w.provinceLord[P(w, "p2110")]).toBe(-1);
  });

  it("breaks at hold 0 into warlord domains, fires the Ōnin War, and a realm with the Court and over half of Japan is appointed", () => {
    const w = createWorld(rules, 1);
    const news: News[] = [];
    const japan = N(w, "japan");
    w.shogunate!.hold = 0;
    month(w, 1445, 3, news);
    expect(shogunOf(w)).toBe(-1);
    expect(formOf(w, japan)).toBe("warlord_domain");
    const hosokawa = N(w, "hosokawa");
    expect(w.nationGone[hosokawa]).toBe(0);
    expect(formOf(w, hosokawa)).toBe("warlord_domain");
    expect(w.provinceOwner[P(w, "p2108")]).toBe(hosokawa);
    expect(w.provinceOwner[P(w, "p2110")]).toBe(japan);
    expect(eventFired(w, "onin_war")).toBe(true);
    expect(vacantMembers(w)).toContain(japan);
    expect(vacantMembers(w).length).toBe(15);
    // Japan takes back over half of the land and asks the Court.
    for (const pid of ["p2108", "p2106", "p2436", "p2111", "p2109", "p2107", "p2104", "p2432", "p2116", "p1828", "p2115", "p2117", "p2119"]) w.provinceOwner[P(w, pid)] = japan;
    expect(askTheCourt(w, japan, news)).toBeNull();
    expect(shogunOf(w)).toBe(japan);
    expect(formOf(w, japan)).toBe("shogunate");
    expect(w.shogunate!.hold).toBe(40);
    // Every other member has answered: sworn houses are lords again, refusers are under Bring to heel.
    const others = [...new Set(vacantMembers(w))];
    expect(others).toEqual([]);
    for (const m of ["imagawa", "toki", "kyogoku", "otomo", "shimazu", "takeda", "date", "nanbu"]) {
      const n = N(w, m);
      const swore = w.nationGone[n] === 1;
      if (!swore) expect(w.diplomacy.aims.some((a) => a.aim === "bring_to_heel" && a.target === m)).toBe(true);
    }
    for (let k = 0; k < 4; k++) advance(w, STEPS_PER_TURN);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "japan", options: {} as never }).map((c) => [c.id, c])), rules, {}).world;
    expect(back.shogunate!.holder).toBe("japan");
    expect(hashWorld(back)).toBe(hashWorld(w));
  });

  it("breaks when the shogun loses the Court's province", () => {
    const w = createWorld(rules, 1);
    const news: News[] = [];
    w.provinceOwner[P(w, "p2110")] = N(w, "hosokawa");
    month(w, 1445, 2, news);
    expect(shogunOf(w)).toBe(-1);
    expect(news.some((x) => x.text.startsWith("The Shogunate breaks"))).toBe(true);
  });

  it("summons and confirms houses, and closes the country with one port", () => {
    const w = createWorld(rules, 1);
    const news: News[] = [];
    const s = w.shogunate!;
    const ouchi = housesOf(w).find((k) => w.lords[k]!.house === "Ōuchi")!;
    expect(summonHouse(w, ouchi)).toBe("only while hold is Firm or better");
    s.hold = 55;
    expect(summonHouse(w, ouchi)).toBeNull();
    month(w, 1446, 1, news);
    expect(w.lords[ouchi]!.wealth).toBe(90);
    s.hold = 45;
    month(w, 1446, 2, news);
    expect(s.summoned).toEqual([]);
    const takeda = housesOf(w).find((k) => w.lords[k]!.house === "Takeda")!;
    w.lords[takeda]!.loyalty = "Wavering";
    expect(confirmHouse(w, takeda, news)).toBeNull();
    expect(w.lords[takeda]!.loyalty).toBe("Loyal");
    expect(s.hold).toBe(40);
    expect(confirmHouse(w, takeda, news)).toBe("already confirmed by this ruler");
    s.hold = 60;
    w.diplomacy.era = "III";
    const port = P(w, "p2103");
    expect(closeCountry(w, port, news)).toBeNull();
    expect(closedTo(w, N(w, "joseon"), P(w, "p2104"))).toBe(true);
    expect(closedTo(w, N(w, "joseon"), port)).toBe(false);
    expect(closedTo(w, N(w, "japan"), P(w, "p2104"))).toBe(false);
  });

  it("ends when the shogun's realm leaves the shogunate form", () => {
    const w = createWorld(rules, 1);
    const news: News[] = [];
    breakShogunate(w, "test", news);
    expect(w.shogunate!.ended).toBeNull();
    const v = createWorld(rules, 1);
    v.nationForm[N(v, "japan")] = v.nationForm[N(v, "england")]!;
    month(v, 1445, 2, news);
    expect(v.shogunate!.ended?.how).toBe("reform");
  });
});
