import { describe, expect, it, vi } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, relationState, type World } from "../src/index.ts";
import { lordLands } from "../src/lords.ts";
import { appointCommander, idleCommanders, KIND, mergeArmies, recount, splitTroops } from "../src/recruit.ts";
import { lordSeat, monthlyRetinues, retinueArmy, retinueAtHome, retinueCap, retinuesWon, retinueView, weeklyRetinues } from "../src/retinues.ts";
import * as wf from "../src/domain/warfare/index.ts";

// The faith heads' censure makes lords waver too (RELG-149); these scenarios measure the lords alone.
vi.mock("../src/faithHeads.ts", async (importOriginal) => ({ ...(await importOriginal<typeof import("../src/faithHeads.ts")>()), faithHeadsWars: () => {} }));

/** Lords lead their retinues (WAR-252 to WAR-258): domain/warfare/features/lords-retinues.feature. */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const L = wf.W.lords;

function france(): { w: World; fr: number; lords: number[] } {
  const w = createWorld(rules, 1, tiles);
  const fr = w.nationIndex.get("france")!;
  for (const l of w.lords) l.loyalty = "Loyal";
  return { w, fr, lords: w.lords.flatMap((l, k) => (l.nation === fr ? [k] : [])) };
}

/** France at war with a realm it may declare on in 1444. */
function atWar(w: World, fr: number): number {
  for (const id of ["savoy", "milan", "aragon", "navarra", "brittany", "lorraine", "castile"]) {
    const b = w.nationIndex.get(id);
    if (b === undefined || relationState(w, fr, b).state !== null) continue;
    if (!applyNow(w, { type: "declareWar", target: b, aim: "no_aim" }, fr).rejectedOrders.length) return b;
  }
  throw new Error("no foe for France");
}

const gather = (w: World, days = L.wavering_days) => {
  for (let d = 0; d < days; d += 7) weeklyRetinues(w, []);
};

describe("a lord's lands fill his retinue, not the crown's levy (WAR-252)", () => {
  it("counts only royal provinces in the realm's levies and troop cap", () => {
    const { w, fr, lords } = france();
    const before = { levies: w.nationLevies[fr]!, cap: w.nationTroopCap[fr]! };
    const lands = lords.flatMap((k) => lordLands(w, k));
    expect(lands.length).toBeGreaterThan(0);
    // Granting every lord's land back to the crown would add its men to the levies.
    const royal = new Set<number>();
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === fr && w.provinceLord[p]! < 0) royal.add(p);
    const levies = [...royal].reduce((t, p) => t + w.provinceRecruits[p]!, 0);
    expect(before.levies).toBeCloseTo(levies, 0);
    for (const p of lands) w.provinceLord[p] = -1;
    recount(w);
    expect(w.nationLevies[fr]!).toBeGreaterThan(before.levies);
    expect(w.nationTroopCap[fr]!).toBeGreaterThan(before.cap);
  });

  it("caps a lord's retinue by his own share of his lands' people", () => {
    const { w, lords } = france();
    const k = lords[0]!;
    const cap = retinueCap(w, k);
    expect(cap).toBeGreaterThan(0);
    expect(retinueAtHome(w, k)).toBeLessThanOrEqual(cap);
  });
});

describe("calling the lords (WAR-253, WAR-038)", () => {
  it("is only for war", () => {
    const { w, fr } = france();
    const r = applyNow(w, { type: "callLords" }, fr);
    expect(r.rejectedOrders[0]?.reason).toBe("lords are called only at war");
  });

  it("brings a loyal lord's whole retinue after his days, a wavering lord's half after his, and no disloyal lord", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const [loyal, wavering, disloyal] = lords as [number, number, number];
    w.lords[wavering]!.loyalty = "Wavering";
    w.lords[disloyal]!.loyalty = "Disloyal";
    const men = { loyal: retinueAtHome(w, loyal), wavering: retinueAtHome(w, wavering) };
    expect(applyNow(w, { type: "callLords" }, fr).rejectedOrders).toEqual([]);
    expect(w.lords[loyal]!.call).toEqual({ men: men.loyal, daysLeft: L.loyal_days });
    expect(w.lords[wavering]!.call).toEqual({ men: Math.floor(men.wavering * L.wavering_share), daysLeft: L.wavering_days });
    expect(w.lords[disloyal]!.call).toBeUndefined();
    // Called men leave his lands' pools.
    expect(retinueAtHome(w, loyal)).toBe(0);
    gather(w, L.loyal_days);
    expect(retinueArmy(w, loyal)).toBeGreaterThanOrEqual(0);
    expect(retinueArmy(w, wavering)).toBe(-1);
    gather(w, L.wavering_days - L.loyal_days);
    expect(retinueArmy(w, wavering)).toBeGreaterThanOrEqual(0);
    expect(retinueView(w, fr, disloyal).refusal).toMatch(/will not come/);
  });
});

describe("a lord leads his own retinue (WAR-254, WAR-255)", () => {
  it("takes the field at his seat under the lord himself, unpaid and outside the troop cap", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const k = lords[0]!;
    const capUsed = w.nationCapUsed[fr]!;
    applyNow(w, { type: "callLords", lord: k }, fr);
    gather(w);
    const s = retinueArmy(w, k);
    const a = w.armies;
    expect(a.kind[s]).toBe(KIND.retinue);
    expect(a.location[s]).toBe(lordSeat(w, k));
    expect(w.commanders[a.commander[s]!]!.name).toBe(w.lords[k]!.name);
    expect(w.commanders[a.commander[s]!]!.origin).toBe("a lord");
    expect(a.horse[s]).toBe(Math.round(a.men[s]! * L.retinue_horse_share));
    expect(w.nationCapUsed[fr]!).toBe(capUsed);
    expect(wf.W.kinds.retinue.pay.multiplier).toBe(0);
  });

  it("stays whole under its lord: no other commander, no split, no merge, and he leads no other army", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const [k, j] = lords as [number, number];
    applyNow(w, { type: "callLords" }, fr);
    gather(w);
    const s = retinueArmy(w, k);
    const t = retinueArmy(w, j);
    const c = w.armies.commander[s]!;
    expect(idleCommanders(w, fr)).not.toContain(c);
    expect(splitTroops(w, fr, s, "levy foot", 100)).toMatch(/stays whole/);
    expect(appointCommander(w, fr, s, -1)).toMatch(/stays whole/);
    w.armies.location[t] = w.armies.location[s]!;
    expect(mergeArmies(w, fr, t, s)).toMatch(/stays whole/);
    const levy = Array.from({ length: w.armies.count }, (_, i) => i).find((i) => w.armies.alive[i] && w.armies.owner[i] === fr && w.armies.kind[i] === KIND.levy)!;
    expect(appointCommander(w, fr, levy, c)).toMatch(/only his own retinue/);
  });
});

describe("a retinue goes home (WAR-256)", () => {
  it("when peace comes, back to his lands", () => {
    const { w, fr, lords } = france();
    const foe = atWar(w, fr);
    const k = lords[0]!;
    applyNow(w, { type: "callLords", lord: k }, fr);
    gather(w);
    const men = w.armies.men[retinueArmy(w, k)]!;
    w.diplomacy.wars = w.diplomacy.wars.filter((x) => !(x.attackers.includes(w.nationIds[fr]!) || x.defenders.includes(w.nationIds[fr]!)));
    void foe;
    monthlyRetinues(w, []);
    expect(retinueArmy(w, k)).toBe(-1);
    expect(retinueAtHome(w, k)).toBeGreaterThanOrEqual(Math.min(men, retinueCap(w, k)) - 1);
  });

  it("when a wavering lord has served his months, unless the war is for his Want", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const k = lords[0]!;
    applyNow(w, { type: "callLords", lord: k }, fr);
    gather(w);
    const s = retinueArmy(w, k);
    w.lords[k]!.loyalty = "Wavering";
    w.armies.monthsOut[s] = L.wavering_stay_months - 1;
    monthlyRetinues(w, []);
    expect(retinueArmy(w, k)).toBe(s);
    w.armies.monthsOut[s] = L.wavering_stay_months;
    monthlyRetinues(w, []);
    expect(retinueArmy(w, k)).toBe(-1);
  });

  it("when its lord turns disloyal", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const k = lords[0]!;
    applyNow(w, { type: "callLords", lord: k }, fr);
    gather(w);
    w.lords[k]!.loyalty = "Disloyal";
    monthlyRetinues(w, []);
    expect(retinueArmy(w, k)).toBe(-1);
  });

  it("when the player sends him home", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const k = lords[0]!;
    applyNow(w, { type: "callLords", lord: k }, fr);
    gather(w);
    expect(applyNow(w, { type: "disband", army: retinueArmy(w, k) }, fr).rejectedOrders).toEqual([]);
    expect(retinueArmy(w, k)).toBe(-1);
    expect(retinueAtHome(w, k)).toBeGreaterThan(0);
  });
});

describe("a victory wins a lord's loyalty (WAR-257)", () => {
  it("raises a wavering lord whose retinue fought on the winning side", () => {
    const { w, fr, lords } = france();
    atWar(w, fr);
    const k = lords.find((x) => lordLands(w, x).length < 4)!;
    applyNow(w, { type: "callLords", lord: k }, fr);
    gather(w);
    w.lords[k]!.loyalty = "Wavering";
    retinuesWon(w, [retinueArmy(w, k)], []);
    expect(w.lords[k]!.loyalty).toBe("Loyal");
  });
});

describe("the AI calls its lords at war (WAR-258)", () => {
  it("calls every lord who will come", () => {
    const { w, fr } = france();
    const foe = atWar(w, fr);
    w.player = fr;
    for (const l of w.lords) if (l.nation === foe) l.loyalty = "Loyal";
    const theirs = w.lords.flatMap((l, k) => (l.nation === foe && retinueAtHome(w, k) >= L.min_men ? [k] : []));
    monthlyRetinues(w, []);
    for (const k of theirs) expect(w.lords[k]!.call).toBeDefined();
  });
});
