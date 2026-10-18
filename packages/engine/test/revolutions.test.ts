import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { hashWorld } from "../src/hash.ts";
import { formOf } from "../src/government.ts";
import { GRIEVANCES } from "../src/moods.ts";
import { monthlyRebels } from "../src/rebels.ts";
import { monthlyRevolutions, revolutionView } from "../src/revolutions.ts";
import { TAX_RATES } from "../src/treasury.ts";
import type { News } from "../src/war.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const bit = (g: (typeof GRIEVANCES)[number]) => 1 << GRIEVANCES.indexOf(g);

/**
 * Castile as the player, its signs lit by hand: Heavy taxes everywhere, two
 * lords wavering and deep debt make three signs (estates, a monarchy with no
 * hunger); `hungry` adds Hunger everywhere, which makes it agrarian.
 */
function stirred(o: { hungry?: boolean; seed?: number } = {}): { w: World; me: number; own: number[] } {
  const w = createWorld(rules, o.seed ?? 1, tiles);
  const me = w.nationIndex.get("castile")!;
  w.player = me;
  const own: number[] = [];
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === me) own.push(p);
  stir(w, me, own, o.hungry ?? false);
  return { w, me, own };
}

function stir(w: World, me: number, own: number[], hungry: boolean): void {
  for (const p of own) w.provinceGrievances[p] = bit("Heavy taxes") | (hungry ? bit("Hungry") : 0);
  let wavering = 0;
  for (const l of w.lords) if (l.nation === me && wavering < 2 && w.provinceLord.includes(w.lords.indexOf(l))) ((l.loyalty = "Wavering"), wavering++);
  expect(wavering).toBe(2);
  w.nationDebt[me] = 1e7;
}

/** Runs the revolutions step until the realm's card breaks out (it rolls 1 in 12 a month). */
function untilOutbreak(w: World, me: number, news: News[] = []): News[] {
  for (let i = 0; i < 400 && !w.revo[me]!.outbreak && !w.revo[me]!.rising && !w.revo[me]!.regime && !w.revo[me]!.stopped; i++) monthlyRevolutions(w, news);
  return news;
}

describe("revolutions in the game", () => {
  it("lit signs make the card amber, then red; a monarchy without hunger is an estates revolution (REVO-082, REVO-090)", () => {
    const { w, me } = stirred();
    const v = revolutionView(w, me);
    expect(v.family).toBe("estates");
    expect(v.lit).toBe(3);
    expect(v.need).toBe(3);
    expect(v.colour).toBe("red");
    expect(v.stage).toBe("Ready");
    expect(v.signs.slice(0, 3).every((s) => s.lit)).toBe(true);
    expect(v.signs.filter((s) => s.lit).map((s) => s.key)).toEqual(["tax", "lords", "debt"]);
    expect(v.stances.map((s) => s.label)).toEqual(["Share power", "Grant charters", "Break them"]);
    w.nationDebt[me] = 0;
    const amber = revolutionView(w, me);
    expect(amber.colour).toBe("amber");
    expect(amber.stage).toBe("Brewing");
    expect(revolutionView(stirred({ hungry: true }).w, me).family).toBe("agrarian");
  });

  it("never breaks out in the month it became Ready, and easing below need stops the roll (REVO-083)", () => {
    const { w, me } = stirred();
    monthlyRevolutions(w, []);
    expect(w.revo[me]!.readySince).toBeGreaterThan(0);
    expect(w.revo[me]!.outbreak).toBe("");
    w.nationDebt[me] = 0;
    monthlyRevolutions(w, []);
    expect(w.revo[me]!.readySince).toBe(-1);
  });

  it("the player's outbreak waits on a stance; Lead sets the regime's form without making it the old form, and its locks refuse orders (REVO-084, REVO-087)", () => {
    const { w, me, own } = stirred();
    const before = w.nationOldForm[me];
    const news = untilOutbreak(w, me);
    expect(w.revo[me]!.outbreak).toBe("estates");
    expect(news.some((n) => n.kind === "revolution" && n.begins)).toBe(true);
    expect(revolutionView(w, me).outbreak).toBe(true);
    expect(applyNow(w, { type: "answerRevolution", stance: "lead" }, me).rejectedOrders).toEqual([]);
    expect(formOf(w, me)).toBe("diet_monarchy");
    expect(w.nationOldForm[me]).toBe(before);
    const v = revolutionView(w, me);
    expect(v.regime?.name).toBe("League of towns");
    expect(v.regime?.locks.map((l) => l.action)).toContain("crushing_taxes");
    expect(v.ruler).toBe("The house that ruled in 1444");
    const refused = applyNow(w, { type: "setTax", province: own[0]!, rate: TAX_RATES.indexOf("crushing") }, me).rejectedOrders;
    expect(refused[0]?.reason).toMatch(/locked by the revolution/);
    // A grace period follows: it cannot break out again for 3 years.
    monthlyRevolutions(w, []);
    monthlyRevolutions(w, []);
    expect(w.revo[me]!.outbreak).toBe("");
  });

  it("Bend fixes the tax at light where it was heavy and stops it, not solved (REVO-084)", () => {
    const { w, me, own } = stirred();
    untilOutbreak(w, me);
    expect(applyNow(w, { type: "answerRevolution", stance: "bend" }, me).rejectedOrders).toEqual([]);
    expect(w.revo[me]!.stopped).toBe(true);
    expect(own.every((p) => w.provinceLightTax[p]! >= w.date.year + 10)).toBe(true);
    expect(revolutionView(w, me).stage).toBe("Stopped");
    expect(revolutionView(w, me).stopped?.until).toMatch(/\d{4}$/);
  });

  it("Fight raises a tagged rising; if it wins, the estates' republic elects its ruler (REVO-084, REVO-085)", () => {
    const { w, me } = stirred();
    untilOutbreak(w, me);
    applyNow(w, { type: "answerRevolution", stance: "fight" }, me);
    const b = w.bands.find((x) => x.revolution);
    expect(b?.owner).toBe(me);
    expect(b?.cause).toBe("Town");
    expect(w.revo[me]!.rising).toBe(b!.id);
    b!.monthsHeld = 11;
    const news: News[] = [];
    monthlyRebels(w, news);
    expect(w.bands.includes(b!)).toBe(false);
    expect(formOf(w, me)).toBe("merchant_republic");
    expect(w.revo[me]!.regime).toBe("estates_republic");
    expect(w.revo[me]!.rulerRule).toBe("elected");
    expect(w.revo[me]!.rising).toBe(0);
    expect(news.some((n) => n.kind === "revolution" && n.text.startsWith("The revolution wins"))).toBe(true);
  });

  it("an agrarian rising that wins puts its leader on the throne and every lord wavers (REVO-085)", () => {
    const { w, me } = stirred({ hungry: true });
    untilOutbreak(w, me);
    applyNow(w, { type: "answerRevolution", stance: "fight" }, me);
    const b = w.bands.find((x) => x.revolution)!;
    expect(b.cause).toBe("Hunger");
    b.monthsHeld = 11;
    monthlyRebels(w, []);
    expect(w.revo[me]!.regime).toBe("new_dynasty");
    expect(w.revo[me]!.ruler).toBe(b.leader!.name);
    expect(w.revo[me]!.emigre).toBe(true);
    expect(w.lords.filter((l) => l.nation === me).every((l) => l.loyalty !== "Loyal")).toBe(true);
    expect(revolutionView(w, me).ruler).toContain(b.leader!.name);
  });

  it("a rising that melts away is crushed: reaction, bloodshed, and one sign fewer for 20 years (REVO-085, REVO-051)", () => {
    const { w, me } = stirred();
    untilOutbreak(w, me);
    applyNow(w, { type: "answerRevolution", stance: "fight" }, me);
    const b = w.bands.find((x) => x.revolution)!;
    b.men = 10;
    monthlyRebels(w, []);
    expect(w.revo[me]!.regime).toBe("reaction");
    expect(w.revo[me]!.stopped).toBe(true);
    expect(w.provinceBattleYear[b.provinces[0]!]).toBe(w.date.year);
    expect(revolutionView(w, me).need).toBe(2);
  });

  it("an ordinary rising that wins on a Ready card wins the revolution at once (REVO-086)", () => {
    const { w, me, own } = stirred();
    // A tax rising holds a province; the card is Ready (tax, lords, debt, and now rebels).
    w.provinceGrievances[own[0]!] = bit("Heavy taxes") | bit("Hungry") | bit("Ungoverned") | bit("Bloodshed");
    w.provinceRecruits[own[0]!] = 50_000;
    w.rebelSparks.push({ province: own[0]!, spark: "the tax rate of the province is raised" });
    monthlyRebels(w, []);
    const b = w.bands.find((x) => !x.revolution && x.owner === me);
    expect(b).toBeDefined();
    stir(w, me, own.slice(1), false);
    b!.monthsHeld = 11;
    monthlyRebels(w, []);
    expect(w.revo[me]!.rebelsWonYear).toBe(w.date.year);
    expect(w.revo[me]!.regime).not.toBe("");
  });

  it("an AI realm with a Ready card takes a stance by itself (REVO-088)", () => {
    const { w, me } = stirred();
    w.player = -1;
    untilOutbreak(w, me);
    const r = w.revo[me]!;
    expect(r.outbreak).toBe("");
    expect(r.regime !== "" || r.stopped || r.rising > 0).toBe(true);
  });

  it("revolution cards, regimes and rulers are kept in the save (REVO-089)", () => {
    const { w, me } = stirred({ hungry: true });
    untilOutbreak(w, me);
    applyNow(w, { type: "answerRevolution", stance: "lead" }, me);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.revo[me]).toEqual(w.revo[me]);
    expect(hashWorld(back)).toBe(hashWorld(w));
  });
});
