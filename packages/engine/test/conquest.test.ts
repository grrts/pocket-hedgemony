import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { declareWar, offerPeace, relationState, syncDate, type News } from "../src/war.ts";
import { monthlyConquest, nameAbroadView } from "../src/conquest.ts";
import { libraryEvents, statecraftView, syncCountries } from "../src/statecraft.ts";
import { foldInRealm, makeSubject } from "../src/subjects.ts";
import { maxCededProvinces, priceOfWar, whyAiWontDeclare, wouldSayPeaceAtDeclaration, aiWarPay } from "../src/priceOfWar.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const rel = dip.relations;
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const id = (w: World, n: number) => w.nationIds[n]!;
const provincesOf = (w: World, n: number) => Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === n);
const grudge = (w: World, holder: string, other: string, weight: number) => dip.addEntry(w.diplomacy, holder, other, { key: "test", name: "Test", weight, fadeYears: 50 });
const wrong = (w: World, holder: string, other: string, key: string) => dip.ledgerOf(w.diplomacy, holder, other).filter((e) => e.key === key).reduce((t, e) => t + e.weight, 0);

/** A realm with exactly `men` soldiers: no armies in the field, `men` levies it can call. */
function setStrength(w: World, n: number, men: number): void {
  for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === n) w.armies.alive[i] = 0;
  w.nationLevies[n] = men;
  // Its lords bring nothing: the levies are all of its strength (WAR-252).
  w.nationLordsMen[n] = 0;
  w.nationTroopCap[n] = 1e9;
  w.nationCapUsed[n] = 0;
}

/** Cuts every alliance, pledge and subject tie of a realm. */
function alone(w: World, n: number): void {
  const g = w.diplomacy.graph;
  const x = id(w, n);
  g.relations = g.relations.filter((r) => !((r.type === "alliance" || r.type === "subject") && (r.source === x || r.target === x)));
  g.facts = g.facts.filter((f) => !(f.fact === "protection_pledge" && (f.source === x || f.target === x)));
}

/** Castile takes `recent` provinces in 1440 and `old` before 1424 (its own land stands in for them). */
function conquests(w: World, recent: number, old: number): void {
  const land = provincesOf(w, nation(w, "castile"));
  for (let k = 0; k < recent + old; k++) w.diplomacy.taken.push({ by: "castile", from: "portugal", province: w.provinceIds[land[k]!]!, date: k < old ? "1423-06" : "1440-01" });
}

function january(w: World, year: number): void {
  w.date = { ...w.date, year, month: 1, day: 1 };
  syncDate(w);
}

describe("neighbours answer conquest (X-21)", () => {
  it("counts Lands taken over the last 20 years only, and land given back stops counting (DIPL-221)", () => {
    const w = createWorld(rules, 1, tiles);
    conquests(w, 7, 2);
    monthlyConquest(w, []);
    expect(dip.country(w.diplomacy, "castile").landsTaken).toBe(7);
    // A province no longer held drops out (REALM-125).
    const given = w.provinceIndex.get(w.diplomacy.taken.at(-1)!.province)!;
    w.provinceOwner[given] = nation(w, "portugal");
    monthlyConquest(w, []);
    expect(dip.country(w.diplomacy, "castile").landsTaken).toBe(6);
  });

  it("runs the yearly league check in the turn; the player is never joined; a league member attacked calls the rest (DIPL-221, DIPL-160)", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = nation(w, "castile");
    conquests(w, 9, 2);
    january(w, 1445);
    dip.refreshLandsTaken(w.diplomacy);
    const candidates = dip.leagueCandidates(w.diplomacy, "castile").filter((c) => !w.nationGone[nation(w, c)]);
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    const [a, b, player] = candidates as [string, string, string];
    w.player = nation(w, player);
    for (const c of [a, b, player]) grudge(w, c, "castile", -150);
    syncCountries(w);
    const news: News[] = [];
    monthlyConquest(w, news);
    const league = dip.leagueAgainst(w.diplomacy, "castile")!;
    expect(league.members).toEqual(expect.arrayContaining([a, b]));
    expect(league.members).not.toContain(player);
    expect(news.some((x) => /league forms against Castile/.test(x.text))).toBe(true);
    // Not in January: no check.
    w.date = { ...w.date, month: 2 };
    syncDate(w);
    const before = league.members.length;
    monthlyConquest(w, []);
    expect(dip.leagueAgainst(w.diplomacy, "castile")!.members.length).toBe(before);
    // Castile declares on a; b is called defensively and, an AI, answers.
    alone(w, nation(w, a));
    alone(w, nation(w, b));
    w.player = -1;
    expect(declareWar(w, castile, nation(w, a), [])).toBeNull();
    expect(relationState(w, castile, nation(w, b)).state).toBe("war");
  });

  it("dissolves a threshold league when Lands taken fall below half the threshold (DIPL-163)", () => {
    const w = createWorld(rules, 1, tiles);
    dip.formLeague(w.diplomacy, "castile", ["portugal", "navarre"]);
    january(w, 1445);
    monthlyConquest(w, []);
    expect(dip.leagueAgainst(w.diplomacy, "castile")).toBeUndefined();
  });

  it("gives the neighbours of land ceded in a peace Grabbed land near us, but not the taker's allies or the loser (DIPL-222)", () => {
    const w = createWorld(rules, 3, tiles);
    const castile = nation(w, "castile");
    const portugal = nation(w, "portugal");
    alone(w, portugal);
    alone(w, castile);
    expect(declareWar(w, castile, portugal, [])).toBeNull();
    const taken = provincesOf(w, portugal).slice(0, 2);
    for (const p of taken) w.provinceOccupier[p] = castile;
    // A realm that borders Castile is made its ally after the war began, so it is not in the war.
    const near = dip.neighbours(w.diplomacy, "castile").filter((c) => c !== "portugal" && !w.nationGone[nation(w, c)] && !rel.overlord(w.diplomacy.graph, c));
    const [friend, other] = near as [string, string];
    alone(w, nation(w, friend));
    rel.newRecord(w.diplomacy.graph, "alliance", "castile", friend, "mutual");
    offerPeace(w, castile, portugal, "take", [], true);
    const ceded = taken.filter((p) => w.provinceOwner[p] === castile).length;
    expect(ceded).toBeGreaterThan(0);
    expect(wrong(w, other, "castile", "grabbed_land_near_us")).toBe(-5 * ceded);
    expect(dip.ledgerOf(w.diplomacy, other, "castile").find((e) => e.key === "grabbed_land_near_us")!.fadeYears).toBe(20);
    expect(wrong(w, friend, "castile", "grabbed_land_near_us")).toBe(0);
    expect(wrong(w, "portugal", "castile", "grabbed_land_near_us")).toBe(0);
    expect(wrong(w, "portugal", "castile", "took_our_land")).toBeLessThan(0);
  });

  it("gives Grabbed land near us for a province demand given in, not for a fold-in (DIPL-222, DIPL-224)", () => {
    const w = createWorld(rules, 3, tiles);
    const castile = nation(w, "castile");
    const portugal = nation(w, "portugal");
    const p = provincesOf(w, portugal).find((q) => {
      for (let k = w.adjStart[q]!; k < w.adjStart[q + 1]!; k++) if (w.provinceOwner[w.adjList[k]!] === castile) return true;
      return false;
    })!;
    const bystanders = dip.neighbours(w.diplomacy, "castile").filter((c) => c !== "portugal" && !rel.has(w.diplomacy.graph, "alliance", c, "castile") && rel.overlord(w.diplomacy.graph, c) !== "castile");
    w.diplomacy.events.push({ type: "DemandGivenIn", date: w.diplomacy.date, asker: "castile", asked: "portugal", kind: "hand_over_province", province: w.provinceIds[p]! });
    const before = dip.country(w.diplomacy, "castile").landsTaken;
    libraryEvents(w, []);
    expect(w.provinceOwner[p]).toBe(castile);
    expect(bystanders.some((c) => wrong(w, c, "castile", "grabbed_land_near_us") === -5)).toBe(true);
    // A demand given in is a province seized: it counts in Lands taken.
    expect(dip.country(w.diplomacy, "castile").landsTaken).toBe(before + 1);
  });

  it("counts notoriety: -1 per 5 in an alliance count with the notorious realm, +1 per 5 in a league against it (DIPL-223)", () => {
    const w = createWorld(rules, 1, tiles);
    const d = w.diplomacy;
    dip.country(d, "venice").landsTaken = 8;
    expect(dip.notoriety(d, "venice")).toBe(40);
    const alliance = dip.countAsk(d, { action: "propose_alliance", asker: "venice", asked: "milan" });
    expect(dip.reasonNumber(alliance, "Notoriety")).toBe(-8);
    const marriage = dip.countAsk(d, { action: "arrange_marriage", asker: "venice", asked: "milan" });
    expect(dip.reasonNumber(marriage, "Notoriety")).toBe(-8);
    expect(dip.reasonNumber(dip.aiLeagueCount(d, "milan", "venice", 0), "X's notoriety")).toBe(8);
    // Pledging protection to Venice's neighbour counts its notoriety for the pledge.
    const neighbour = dip.neighbours(d, "venice")[0]!;
    expect(dip.notorietyReasons(d, "pledge_protection", "castile", neighbour)).toContainEqual({ name: "A notorious neighbour", number: 8 });
    expect(dip.notorietyReasons(d, "pledge_protection", "castile", "venice")).toContainEqual({ name: "Notoriety", number: -8 });
  });

  it("shows notoriety in the game: every realm on the Diplomacy tab and the player's name abroad (DIPL-223, DIPL-225)", () => {
    const w = createWorld(rules, 1, tiles);
    const me = nation(w, "castile");
    w.player = me;
    dip.country(w.diplomacy, "portugal").landsTaken = 11;
    dip.country(w.diplomacy, "castile").landsTaken = 6;
    dip.formLeague(w.diplomacy, "castile", ["portugal", "navarre"], "event");
    const view = statecraftView(w, me)!;
    expect(view.realms[nation(w, "portugal")]!.notoriety).toBe(55);
    const abroad = nameAbroadView(w, me);
    expect(abroad).toMatchObject({ notoriety: 30, word: "Watched", threshold: 8 });
    expect(abroad.leagues[0]!.members.map((m) => m.nation)).toEqual([nation(w, "portugal"), nation(w, "navarre")]);
    expect(view.nameAbroad.notoriety).toBe(30);
  });

  it("gains a whole realm by folding it in, bound by no peace limit and adding no Lands taken (DIPL-224)", () => {
    const w = createWorld(rules, 1, tiles);
    const castile = nation(w, "castile");
    const navarre = nation(w, "navarre");
    alone(w, navarre);
    makeSubject(w, navarre, castile, "vassal");
    const land = provincesOf(w, navarre);
    const before = dip.country(w.diplomacy, "castile").landsTaken;
    foldInRealm(w, navarre, castile, []);
    expect(land.every((p) => w.provinceOwner[p] === castile)).toBe(true);
    expect(dip.country(w.diplomacy, "castile").landsTaken).toBe(before);
    expect(wrong(w, "navarre", "castile", "took_our_land")).toBe(0);
    expect(w.diplomacy.taken.some((t) => t.by === "castile")).toBe(false);
  });
});

describe("the price of war (WAR-228, WAR-229)", () => {
  function scene() {
    const w = createWorld(rules, 1, tiles);
    const n = nation(w, "castile");
    const t = dip.neighbours(w.diplomacy, "castile").map((c) => nation(w, c)).find((x) => relationState(w, n, x).state === null && !w.nationGone[x])!;
    alone(w, t);
    alone(w, n);
    for (let k = 0; k < w.nationCount; k++) setStrength(w, k, 0);
    setStrength(w, n, 50000);
    setStrength(w, t, 10000);
    w.nationTreasury[n] = 1e6;
    w.player = -1;
    return { w, n, t };
  }

  it("may declare when twice as strong as the target's side", () => {
    const { w, n, t } = scene();
    expect(wouldSayPeaceAtDeclaration(w, n)).toBe(false);
    expect(whyAiWontDeclare(w, n, t)).toBeNull();
  });

  it("does not declare when the target's allies even the odds", () => {
    const { w, n, t } = scene();
    const ally = dip.neighbours(w.diplomacy, id(w, n)).map((c) => nation(w, c)).find((x) => x !== t && !w.nationGone[x])!;
    alone(w, ally);
    rel.newRecord(w.diplomacy.graph, "alliance", id(w, t), id(w, ally), "mutual");
    setStrength(w, ally, 20000);
    const price = priceOfWar(w, n, t);
    expect(price.against).toContainEqual({ nation: ally, via: "alliance", soldiers: 20000 });
    expect(price.theirSide).toBe(30000);
    expect(whyAiWontDeclare(w, n, t)).toBe("their side is too strong");
  });

  it("counts every member of a league against it", () => {
    const { w, n, t } = scene();
    const member = dip.neighbours(w.diplomacy, id(w, n)).map((c) => nation(w, c)).find((x) => x !== t && !w.nationGone[x])!;
    setStrength(w, member, 20000);
    dip.formLeague(w.diplomacy, id(w, n), [id(w, member)], "event");
    expect(whyAiWontDeclare(w, n, t)).toBe("their side is too strong");
  });

  it("does not declare holding gold for 3 months of war pay", () => {
    const { w, n, t } = scene();
    w.nationTreasury[n] = 3 * aiWarPay(w, n);
    expect(aiWarPay(w, n)).toBeGreaterThan(0);
    expect(whyAiWontDeclare(w, n, t)).toBe("no war chest");
    w.nationTreasury[n] = 6 * aiWarPay(w, n);
    expect(whyAiWontDeclare(w, n, t)).toBeNull();
  });

  it("does not declare at notoriety 60 unless Warlike", () => {
    const { w, n, t } = scene();
    dip.country(w.diplomacy, id(w, n)).landsTaken = 12;
    expect(dip.notoriety(w.diplomacy, id(w, n))).toBe(60);
    w.rulers[n]!.traits = [];
    expect(whyAiWontDeclare(w, n, t)).toBe("too notorious");
    w.rulers[n]!.traits = ["Warlike"];
    expect(whyAiWontDeclare(w, n, t)).toBeNull();
  });

  it("does not declare when its own people already want peace", () => {
    const { w, n, t } = scene();
    // Already at war elsewhere, with most of its land held by the foe: its voices say peace.
    const u = w.nationIds.map((_, k) => k).find((k) => k !== n && k !== t && !w.nationGone[k] && relationState(w, k, n).state === null)!;
    expect(declareWar(w, u, n, [])).toBeNull();
    for (const p of provincesOf(w, n)) w.provinceOccupier[p] = u;
    expect(wouldSayPeaceAtDeclaration(w, n)).toBe(true);
    expect(whyAiWontDeclare(w, n, t)).not.toBeNull();
  });

  it("prices a war for the player's declare sheet: who is called, who is threatened, a truce broken, pay and the most one peace takes", () => {
    const w = createWorld(rules, 1, tiles);
    const england = nation(w, "england");
    const france = nation(w, "france");
    w.player = england;
    const price = statecraftView(w, england)!.realms[france]!.price!;
    expect(price.truce).not.toBeNull();
    expect(price.noAim).toBe(true);
    expect(price.threatened.length).toBe(dip.neighbours(w.diplomacy, "england").filter((c) => c !== "france" && !w.nationGone[nation(w, c)]).length);
    expect(price.maxCeded).toBe(Math.ceil(provincesOf(w, france).length / 3));
    expect(maxCededProvinces(w, france)).toBe(price.maxCeded);
    expect(price.monthlyPay).toBeGreaterThanOrEqual(0);
    for (const c of price.against) expect(c.soldiers).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(price)).toBe(JSON.stringify(priceOfWar(w, england, france)));
  });
});
