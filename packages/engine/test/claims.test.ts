import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import * as dip from "../src/domain/diplomacy/index.ts";
import { declareWar, declaringAim, fittingAimsHeld, relationState, type News } from "../src/war.ts";
import { aiForging, claimsView, forgeClaim, forgingsOf, makeClaim, monthlyClaims, syncClaims, whyNotForge } from "../src/claims.ts";
import { applyNow } from "../src/turn.ts";

/** Claims and forging them (F-30, DIPL-256 to DIPL-261). */

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const C = dip.config.claims;

/** A realm and a neighbour it holds no aim against and has no pact with, and one of the neighbour's provinces on its border. */
function pair(w: World): [number, number, number] {
  for (let a = 0; a < w.nationCount; a++) {
    if (w.nationGone[a] || dip.warOf(w.diplomacy, w.nationIds[a]!) || dip.relations.overlord(w.diplomacy.graph, w.nationIds[a]!)) continue;
    for (const id of dip.neighbours(w.diplomacy, w.nationIds[a]!)) {
      const b = w.nationIndex.get(id);
      if (b === undefined || w.nationGone[b] || dip.warOf(w.diplomacy, id)) continue;
      if (relationState(w, a, b).state !== null || dip.relations.overlord(w.diplomacy.graph, id)) continue;
      if (declaringAim(w, a, b).aim !== "no_aim") continue;
      for (let p = 0; p < w.provinceCount; p++) {
        if (w.provinceOwner[p] !== b) continue;
        for (let k = w.adjStart[p]!; k < w.adjStart[p + 1]!; k++) if (w.provinceOwner[w.adjList[k]!] === a) return [a, b, p];
      }
    }
  }
  throw new Error("no pair found");
}

/** Moves the world's calendar on by months, keeping the diplomacy date with it. */
function advance(w: World, months: number): void {
  for (let i = 0; i < months; i++) {
    w.date.month++;
    if (w.date.month > 12) {
      w.date.month = 1;
      w.date.year++;
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  w.diplomacy.date = w.diplomacy.graph.date = `${w.date.year}-${pad(w.date.month)}-01`;
}

describe("claims (F-30)", () => {
  it("gives Take land on the province, and the owner a wrong, until it lapses", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    makeClaim(w, a, p);
    const held = dip.warAimsOf(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!).find((x) => x.aim === "take_land" && x.province === w.provinceIds[p]);
    expect(held?.source).toBe("our claim");
    expect(declaringAim(w, a, b).aim).toBe("take_land");
    expect(dip.ledgerOf(w.diplomacy, w.nationIds[b]!, w.nationIds[a]!).some((e) => e.key === "holds_claim_on_us")).toBe(true);
    advance(w, C.years * 12);
    syncClaims(w);
    expect(declaringAim(w, a, b).aim).toBe("no_aim");
  });

  it("follows the province to a new owner and ends when the claimant holds it", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    makeClaim(w, a, p);
    const c = [...Array(w.nationCount).keys()].find((x) => x !== a && x !== b && !w.nationGone[x])!;
    w.provinceOwner[p] = c;
    syncClaims(w);
    expect(dip.holdsAim(w.diplomacy, w.nationIds[a]!, w.nationIds[c]!, "take_land", w.provinceIds[p]!)).toBe(true);
    w.provinceOwner[p] = a;
    syncClaims(w);
    expect(w.diplomacy.graph.facts.some((f) => f.fact === "territorial_claim" && f.province === w.provinceIds[p])).toBe(false);
  });

  it("is forged by an envoy in a year, for gold and a seat", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    w.nationTreasury[a] = 100;
    const seats = dip.freeSeats(w.diplomacy, w.nationIds[a]!);
    expect(forgeClaim(w, a, p)).toBeNull();
    expect(w.nationTreasury[a]).toBe(100 - C.forge.gold);
    expect(dip.freeSeats(w.diplomacy, w.nationIds[a]!)).toBe(seats - 1);
    expect(whyNotForge(w, a, p)).toBe("your envoy is there already");
    const news: News[] = [];
    for (let i = 0; i < C.forge.months - 1; i++) {
      advance(w, 1);
      monthlyClaims(w, news);
    }
    expect(dip.holdsAim(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!, "take_land", w.provinceIds[p]!)).toBe(false);
    advance(w, 1);
    monthlyClaims(w, news);
    expect(dip.holdsAim(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!, "take_land", w.provinceIds[p]!)).toBe(true);
    expect(forgingsOf(w)).toHaveLength(0);
    expect(dip.freeSeats(w.diplomacy, w.nationIds[a]!)).toBe(seats);
    expect(whyNotForge(w, a, p)).toBe("you already hold a claim on it");
  });

  it("is found out now and then, and the work goes on", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    w.nationTreasury[a] = 100;
    forgeClaim(w, a, p);
    const chance = C.forge.discovery_chance_per_season;
    C.forge.discovery_chance_per_season = 1;
    try {
      // To the next season's end: he is found out, and stays at work.
      do {
        advance(w, 1);
        monthlyClaims(w, []);
      } while (w.date.month % 3 !== 0);
    } finally {
      C.forge.discovery_chance_per_season = chance;
    }
    expect(dip.ledgerOf(w.diplomacy, w.nationIds[b]!, w.nationIds[a]!).some((e) => e.key === "forged_a_claim_on_us")).toBe(true);
    expect(forgingsOf(w)).toHaveLength(1);
    while (forgingsOf(w).length) {
      advance(w, 1);
      monthlyClaims(w, []);
    }
    expect(dip.holdsAim(w.diplomacy, w.nationIds[a]!, w.nationIds[b]!, "take_land", w.provinceIds[p]!)).toBe(true);
  });

  it("ends with nothing made when the two go to war", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    w.nationTreasury[a] = 100;
    forgeClaim(w, a, p);
    declareWar(w, a, b, []);
    monthlyClaims(w, []);
    expect(forgingsOf(w)).toHaveLength(0);
    expect(whyNotForge(w, a, p)).toBe("you are at war with them");
  });

  it("is refused for a province off the border or without the gold", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    const far = [...Array(w.provinceCount).keys()].find((q) => {
      if (w.provinceOwner[q] !== b) return false;
      for (let k = w.adjStart[q]!; k < w.adjStart[q + 1]!; k++) if (w.provinceOwner[w.adjList[k]!] === a) return false;
      return true;
    });
    if (far !== undefined) expect(whyNotForge(w, a, far)).toBe("it does not border your land");
    const [, , p] = pair(w);
    w.nationTreasury[a] = 0;
    expect(whyNotForge(w, a, p)).toMatch(/needs \d+ gold/);
  });

  it("lets the AI forge on a rival once a season", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b] = pair(w);
    w.player = -1;
    w.nationTreasury[a] = 100;
    dip.relations.setStance(w.diplomacy.graph, w.nationIds[a]!, w.nationIds[b]!, "rival");
    while (w.date.month % 3 !== 0) advance(w, 1);
    // isSeasonEnd: March, June, September, December.
    aiForging(w);
    // It forges on a realm it holds as Rival or Hostile, on its own border.
    const mine = forgingsOf(w).filter((f) => f.by === w.nationIds[a]);
    expect(mine).toHaveLength(1);
    const t = w.nationIndex.get(mine[0]!.target)!;
    expect(["rival", "hostile"]).toContain(dip.relations.stance(w.diplomacy.graph, w.nationIds[a]!, mine[0]!.target));
    expect(w.provinceOwner[w.provinceIndex.get(mine[0]!.province)!]).toBe(t);
    // One forging at a time.
    aiForging(w);
    expect(forgingsOf(w).filter((f) => f.by === w.nationIds[a])).toHaveLength(1);
  });

  it("lets the player pick the aim the war is declared with", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    makeClaim(w, a, p);
    dip.grantAim(w.diplomacy, { holder: w.nationIds[a]!, target: w.nationIds[b]!, aim: "punish", source: "test" });
    const aims = fittingAimsHeld(w, a, b);
    expect(aims[0]).toMatchObject({ aim: "take_land", province: w.provinceIds[p] });
    expect(aims.some((x) => x.aim === "punish")).toBe(true);
    expect(applyNow(w, { type: "declareWar", target: b, aim: "punish" }, a).rejectedOrders).toHaveLength(0);
    expect(dip.warOf(w.diplomacy, w.nationIds[a]!)?.aim).toBe("punish");
  });

  it("shows the player's claims, forgings and border provinces", () => {
    const w = createWorld(rules, 1, tiles);
    const [a, b, p] = pair(w);
    w.player = a;
    w.nationTreasury[a] = 100;
    let v = claimsView(w, a)!;
    expect(v.forge[b]!.provinces.some((x) => x.province === p && x.why === null)).toBe(true);
    makeClaim(w, a, p);
    v = claimsView(w, a)!;
    expect(v.claims[b]!.find((x) => x.province === p)).toMatchObject({ why: "our claim" });
    expect(v.claims[b]!.find((x) => x.province === p)!.until).toBeDefined();
    expect(v.forge[b]!.provinces.some((x) => x.province === p)).toBe(false);
  });
});
