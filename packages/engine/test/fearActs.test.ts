import { afterEach, describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { monthlyFear } from "../src/arms.ts";
import { alliedAgainstYou, fearPartners, neighbourRealms, reasonName, syncCountries } from "../src/statecraft.ts";
import { aiWorks, nextStep, whyNot, W as WORK } from "../src/works.ts";
import { FORTIFICATION, monthlyResearch } from "../src/research.ts";
import { atWarElsewhere, priceOfWar, whyAiWontDeclare } from "../src/priceOfWar.ts";
import { relationState } from "../src/war.ts";
import * as dip from "../src/domain/diplomacy/index.ts";
import * as rs from "../src/domain/research/index.ts";

/** Acting on fear and taking chances (DIPL-238 to DIPL-244, F-166, Leroy 19 Oct). */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const rel = dip.relations;
const AF = dip.AF;
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const id = (w: World, n: number) => w.nationIds[n]!;
const fears = (w: World, n: number) => dip.country(w.diplomacy, id(w, n)).fears ?? [];

function feared(): World {
  const w = createWorld(rules, 1, tiles);
  w.player = -1;
  monthlyFear(w, []);
  syncCountries(w);
  return w;
}

/** Config numbers a test changes, put back after it. */
const saved: (() => void)[] = [];
function set<T extends object, K extends keyof T>(o: T, k: K, v: T[K]): void {
  const was = o[k];
  saved.push(() => (o[k] = was));
  o[k] = v;
}
afterEach(() => {
  while (saved.length) saved.pop()!();
});

describe("allies against a common fear (DIPL-238, DIPL-239)", () => {
  it("counts We fear the same realm in an alliance, more when the asked is Threatened", () => {
    const w = feared();
    const d = w.diplomacy;
    // Savoy, Provence and Burgundy all fear France in 1444; Provence is Threatened, Burgundy Wary.
    expect(fears(w, nation(w, "provence"))[0]).toMatchObject({ of: "france", level: "threatened" });
    expect(fears(w, nation(w, "burgundy"))[0]).toMatchObject({ of: "france", level: "wary" });
    const count = (asked: string) => dip.countAsk(d, { action: "propose_alliance", asker: "savoy", asked });
    expect(dip.reasonNumber(count("provence"), "We fear the same realm")).toBe(AF.allies.same_fear.threatened);
    expect(dip.reasonNumber(count("burgundy"), "We fear the same realm")).toBe(AF.allies.same_fear.wary);
    expect(count("provence").reasons.find((r) => r.name.startsWith("We fear the same realm"))!.name).toBe("We fear the same realm (france)");
    // Brittany fears no one: no row.
    expect(count("brittany").reasons.some((r) => r.name.startsWith("We fear the same realm"))).toBe(false);
    // Only alliances count it.
    expect(dip.countAsk(d, { action: "arrange_marriage", asker: "savoy", asked: "provence" }).reasons.some((r) => r.name.startsWith("We fear the same realm"))).toBe(false);
    // The Why? letter names the realm.
    expect(reasonName(w, "We fear the same realm (france)")).toBe("We fear the same realm (France)");
    expect(reasonName(w, "Base (alliance)")).toBe("Base (alliance)");
  });

  it("finds partners beside the realm it is Threatened of that fear it too, the strongest first", () => {
    const w = feared();
    const sav = nation(w, "savoy");
    const fra = nation(w, "france");
    const partners = fearPartners(w, sav);
    expect(partners.length).toBeGreaterThan(0);
    expect(partners.length).toBeLessThanOrEqual(AF.allies.partners);
    const near = neighbourRealms(w);
    for (const k of partners) {
      expect(near[fra]!.has(k)).toBe(true);
      expect(fears(w, k).some((f) => f.of === "france")).toBe(true);
    }
    // Some partner is beyond Savoy's own border: the shared fear widens its horizon.
    expect(partners.some((k) => !near[sav]!.has(k))).toBe(true);
    const soldiers = partners.map((k) => dip.country(w.diplomacy, id(w, k)).soldiers);
    expect(soldiers).toEqual([...soldiers].sort((a, b) => b - a));
    // An ally is no partner to look for.
    rel.formAlliance(w.diplomacy.graph, "savoy", id(w, partners[0]!));
    expect(fearPartners(w, sav)).not.toContain(partners[0]);
  });

  it("weighs its envoys more often when Threatened", () => {
    expect(dip.envoyEveryMonths("threatened", 12)).toBe(AF.allies.envoy_every_months);
    expect(dip.envoyEveryMonths("wary", 12)).toBe(12);
    expect(dip.envoyEveryMonths("calm", 12)).toBe(12);
  });

  it("tells the player when neighbours who fear them ally", () => {
    const w = feared();
    w.player = nation(w, "france");
    const news: { text: string }[] = [];
    alliedAgainstYou(w, nation(w, "savoy"), nation(w, "provence"), news as never);
    expect(news.map((x) => x.text)).toEqual(["Savoy and Provence ally out of fear of your strength: they will answer each other's call against you."]);
    // Realms that don't fear the player say nothing of it.
    w.player = nation(w, "brittany");
    const none: { text: string }[] = [];
    alliedAgainstYou(w, nation(w, "savoy"), nation(w, "provence"), none as never);
    expect(none).toEqual([]);
  });
});

describe("walls against the feared realm (DIPL-240)", () => {
  it("orders a castle on the border with the realm it fears most before other works", () => {
    const w = feared();
    // A realm afraid, at peace, with a border province whose castle is under what it wants.
    let found: { n: number; x: number } | null = null;
    for (let n = 0; n < w.nationCount && !found; n++) {
      const f = fears(w, n);
      if (!f.length || w.nationGone[n] || dip.warOf(w.diplomacy, id(w, n))) continue;
      const x = nation(w, f[0]!.of);
      const want = dip.defenceCastleStep(dip.fearLevel(f));
      for (let p = 0; p < w.provinceCount; p++) {
        if (w.provinceOwner[p] !== n || nextStep(w, p, WORK.castle) > want || whyNot(w, n, p, WORK.castle)) continue;
        let borders = false;
        for (let k = w.adjStart[p]!; k < w.adjStart[p + 1]!; k++) if (w.provinceOwner[w.adjList[k]!] === x) borders = true;
        if (borders) found = { n, x };
      }
    }
    expect(found).not.toBeNull();
    const { n, x } = found!;
    w.sites = w.sites.filter((s) => s.nation !== n);
    w.workQueue = w.workQueue.filter((q) => q.nation !== n);
    w.nationTreasury[n] = 1e6;
    // Twice: a first shipyard may come first.
    aiWorks(w, []);
    aiWorks(w, []);
    const castles = [...w.sites.filter((s) => s.nation === n), ...w.workQueue.filter((q) => q.nation === n)].filter((s) => s.work === WORK.castle);
    expect(castles.length).toBeGreaterThan(0);
    const p = castles[0]!.province;
    let borders = false;
    for (let k = w.adjStart[p]!; k < w.adjStart[p + 1]!; k++) if (w.provinceOwner[w.adjList[k]!] === x) borders = true;
    expect(borders).toBe(true);
  });

  it("wants no walls when calm, earthworks when Wary and stone when Threatened", () => {
    expect(dip.defenceCastleStep("calm")).toBe(0);
    expect(dip.defenceCastleStep("wary")).toBe(AF.defences.castle_step.wary);
    expect(dip.defenceCastleStep("threatened")).toBe(AF.defences.castle_step.threatened);
  });
});

describe("arms in research (DIPL-241)", () => {
  it("marks warfare inventions by their id and fortification ones by the castle steps they unlock", () => {
    expect([...FORTIFICATION].sort()).toEqual(["B1", "B13", "B4", "B5", "B6"]);
    expect(dip.armsInvention("W3", FORTIFICATION)).toBe(true);
    expect(dip.armsInvention("B5", FORTIFICATION)).toBe(true);
    expect(dip.armsInvention("F01", FORTIFICATION)).toBe(false);
    expect(dip.studyCostWeight("W3", "threatened", FORTIFICATION)).toBe(AF.technology.cost_weight.threatened);
    expect(dip.studyCostWeight("F01", "threatened", FORTIFICATION)).toBe(1);
    expect(dip.studyCostWeight("W3", "calm", FORTIFICATION)).toBe(1);
  });

  it("a Threatened realm studies a warfare or fortification invention when the weight makes it cheapest", () => {
    const w = feared();
    set(AF.technology.cost_weight, "threatened", 1e-6);
    const date = { year: w.date.year, month: w.date.month, day: w.date.day ?? 1 };
    // Each Threatened realm with an eligible arms invention picks one.
    let checked = 0;
    for (let n = 0; n < w.nationCount; n++) {
      const p = w.research[n];
      if (!p || w.nationGone[n] || dip.fearLevel(fears(w, n)) !== "threatened") continue;
      p.studies = [];
      if (![...rs.tree().inventions.keys()].some((i) => dip.armsInvention(i, FORTIFICATION) && rs.eligibility(p, i, date).ok)) continue;
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
    monthlyResearch(w, []);
    for (let n = 0; n < w.nationCount; n++) {
      const p = w.research[n];
      if (!p || w.nationGone[n] || dip.fearLevel(fears(w, n)) !== "threatened" || !p.studies.length) continue;
      const any = [...rs.tree().inventions.keys()].some((i) => dip.armsInvention(i, FORTIFICATION) && !p.known.has(i) && rs.eligibility(p, i, date).ok);
      if (any) expect(dip.armsInvention(p.studies[0]!.id, FORTIFICATION)).toBe(true);
    }
  });
});

describe("opportunities and gambles (DIPL-242, DIPL-243)", () => {
  it("needs a smaller edge against a target at war elsewhere and in a month it gambles, never under the floor", () => {
    const base = 2;
    const O = AF.opportunity;
    expect(dip.declareRatio(base, false, false)).toBe(base);
    expect(dip.declareRatio(base, true, false)).toBeCloseTo(Math.max(O.min_ratio, base * O.at_war_ratio_factor));
    expect(dip.declareRatio(base, false, true)).toBeCloseTo(Math.max(O.min_ratio, base * O.gamble_ratio_factor));
    expect(dip.declareRatio(base, true, true)).toBeCloseTo(Math.max(O.min_ratio, base * O.at_war_ratio_factor * O.gamble_ratio_factor));
    expect(dip.declareRatio(1, true, true)).toBe(1);
  });

  it("declares on a target busy with another war that it would leave alone at peace", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = -1;
    const n = nation(w, "castile");
    const g = w.diplomacy.graph;
    const t = dip.neighbours(w.diplomacy, "castile").map((c) => nation(w, c)).find((x) => relationState(w, n, x).state === null && !w.nationGone[x] && !atWarElsewhere(w, x, n))!;
    for (const k of [n, t]) {
      const x = id(w, k);
      g.relations = g.relations.filter((r) => !((r.type === "alliance" || r.type === "subject") && (r.source === x || r.target === x)));
      g.facts = g.facts.filter((f) => !(f.fact === "protection_pledge" && (f.source === x || f.target === x)));
    }
    w.nationTreasury[n] = 1e6;
    const price = priceOfWar(w, n, t);
    const ratio = price.ourSide / price.theirSide;
    expect(ratio).toBeGreaterThan(AF.opportunity.min_ratio);
    // A usual ratio just above what Castile has: at peace it leaves the target alone.
    const base = ratio / ((1 + AF.opportunity.at_war_ratio_factor) / 2);
    set(w.rules.defines.war, "aiDeclareStrengthRatio", base);
    expect(whyAiWontDeclare(w, n, t, price)).toBe("their side is too strong");
    expect(atWarElsewhere(w, t, n)).toBe(false);
    // A gamble may be enough when the edge is close.
    if (dip.declareRatio(base, false, true) < ratio) expect(whyAiWontDeclare(w, n, t, price, true)).not.toBe("their side is too strong");
    // At war with a third realm, the target is an opportunity.
    const u = w.nationIds.map((_, k) => k).find((k) => k !== n && k !== t && !w.nationGone[k] && relationState(w, k, t).state === null && relationState(w, k, n).state === null)!;
    rel.declareWar(g, id(w, u), id(w, t));
    expect(atWarElsewhere(w, t, n)).toBe(true);
    expect(whyAiWontDeclare(w, n, t, priceOfWar(w, n, t))).not.toBe("their side is too strong");
  });
});
