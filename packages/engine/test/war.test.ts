import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { advance, applyNow, createWorld, marchMap, processTurn, relationState, spawnArmy, type World } from "../src/index.ts";
import { blockingCastle, routeBars } from "../src/turn.ts";
import { runOccupation, wallsOf, type News } from "../src/war.ts";
import { planRoute } from "../src/march.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const n = (w: World, id: string) => w.nationIndex.get(id)!;
const armyOf = (w: World, nation: number) => Array.from(w.armies.owner.subarray(0, w.armies.count)).findIndex((o, i) => o === nation && w.armies.alive[i]);

describe("war and conquest", () => {
  it("starts from the 1444 relations between the map's realms", () => {
    const w = createWorld(rules, 1, tiles);
    expect(relationState(w, n(w, "england"), n(w, "france")).state).toBe("truce");
    expect(w.diplomacy.wars.length).toBeGreaterThan(0);
  });

  it("declares war, fights, occupies and makes peace for the land", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    w.player = me;
    const foe = n(w, "portugal");
    expect(relationState(w, me, foe).state).toBe(null);
    const r = applyNow(w, { type: "declareWar", target: foe }, me);
    expect(r.rejectedOrders).toEqual([]);
    expect(relationState(w, me, foe).state).toBe("war");
    // A big army walks to Granada's capital and sits there.
    const army = armyOf(w, me);
    w.armies.men[army] = 40000;
    w.armies.horse[army] = 8000;
    const target = w.provinceIndex.get(rules.nations[foe]!.capital)!;
    const news = [];
    let peace = false;
    for (let t = 0; t < 120 && !peace; t++) {
      const orders = w.armies.location[army] !== target && !w.armies.route[army]!.length ? [{ type: "move" as const, army, to: target }] : [];
      news.push(...processTurn(w, orders, me).news);
      if (w.provinceOccupier[target] === me) {
        const p = applyNow(w, { type: "offerPeace", target: foe, terms: "take" }, me);
        news.push(...p.news);
        peace = relationState(w, me, foe).state !== "war";
      }
    }
    const kinds = new Set(news.map((x) => x.kind));
    expect(kinds.has("siege") || kinds.has("battle")).toBe(true);
    expect(peace).toBe(true);
    // One peace never takes a capital that is not the loser's last province (WAR-227).
    expect(w.provinceOwner[target]).toBe(foe);
    expect(relationState(w, me, foe).state).toBe("truce");
  }, 60000);

  it("lets the AI offer the player peace, which the player may take (feedback 10)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    w.player = me;
    const foe = n(w, "portugal");
    applyNow(w, { type: "declareWar", target: foe }, me);
    // Castile holds all of Portugal: Portugal's people want peace, and it gives the land up.
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === foe) w.provinceOccupier[p] = me;
    let offer;
    for (let t = 0; t < 8 && !offer; t++) {
      processTurn(w, [], me);
      offer = w.peaceOffers.find((o) => o.from === foe);
    }
    expect(offer?.terms).toBe("give");
    const portugal = w.provinceOwner.filter((o) => o === foe).length;
    const mine = w.provinceOwner.filter((o) => o === me).length;
    expect(applyNow(w, { type: "answerPeace", offer: offer!.id, yes: true }, me).rejectedOrders).toEqual([]);
    expect(w.nationGone[foe] || relationState(w, me, foe).state === "truce").toBeTruthy();
    // It gives up at most a third of its land, and keeps its capital (WAR-227).
    expect(w.provinceOwner[w.provinceIndex.get(rules.nations[foe]!.capital)!]).toBe(foe);
    expect(w.provinceOwner.filter((o) => o === me).length - mine).toBe(Math.ceil(portugal / 3));
    expect(w.peaceOffers).toEqual([]);
  }, 60000);

  it("keeps an AI peace offer waiting until the player answers, one per realm (SHELL-141)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    w.player = me;
    const foe = n(w, "portugal");
    applyNow(w, { type: "declareWar", target: foe }, me);
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === foe) w.provinceOccupier[p] = me;
    let offer;
    for (let t = 0; t < 8 && !offer; t++) {
      processTurn(w, [], me);
      offer = w.peaceOffers.find((o) => o.from === foe);
    }
    expect(offer).toBeDefined();
    // Two more months pass unanswered: the same offer still waits, and only one.
    for (let t = 0; t < 9; t++) processTurn(w, [], me);
    expect(w.peaceOffers.filter((o) => o.from === foe)).toEqual([offer]);
  }, 60000);

  it("sends a province's garrison troops into a battle fought in it (RECR-107)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    applyNow(w, { type: "declareWar", target: foe }, me);
    const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === me && w.provinceIndex.get(rules.nations[me]!.capital) !== i)!;
    const army = spawnArmy(w, me, p, 5000, w.commanderOwner.indexOf(me));
    const troops = spawnArmy(w, me, p, 2000);
    const enemy = spawnArmy(w, foe, p, 6000, w.commanderOwner.indexOf(foe));
    advance(w, 1);
    expect(w.armies.battle[army]).toBeGreaterThanOrEqual(0);
    expect(w.armies.battle[enemy]).toBe(w.armies.battle[army]);
    expect(w.armies.battle[troops]).toBe(w.armies.battle[army]);
  });

  it("stops armies at a garrisoned enemy castle until it falls (warfare 5.5)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    applyNow(w, { type: "declareWar", target: foe }, me);
    const castle = w.provinceIndex.get(rules.nations[foe]!.capital)!;
    expect(blockingCastle(w, castle, me)).toBe(true);
    const map = marchMap(w);
    const around = Array.from(map.adjList.subarray(map.adjStart[castle]!, map.adjStart[castle + 1]!)).filter((p) => map.ground[p]);
    const [back, onward] = around.filter((p) => w.provinceOwner[p] === foe);
    expect(back !== undefined && onward !== undefined).toBe(true);
    // An army marching from one side to the other halts at the castle (Portugal's own armies kept out of its way).
    const keepOut = () => {
      for (let i = 0; i < w.armies.count; i++) if (w.armies.owner[i] === foe && w.armies.battle[i]! < 0) w.armies.alive[i] = 0;
    };
    keepOut();
    const army = spawnArmy(w, me, back!, 20000, w.commanderOwner.indexOf(me));
    w.armies.route[army] = [castle, onward!];
    for (let t = 0; t < 8 && w.armies.location[army] !== castle; t++) {
      processTurn(w, [], me);
      keepOut();
    }
    expect(w.armies.location[army]).toBe(castle);
    expect(w.armies.route[army]).toEqual([]);
    expect(w.armies.path[army]!.length).toBe(0);
    // It may not go on past the castle, but it may go back.
    const on = applyNow(w, { type: "move", army, to: onward! }, me);
    expect(on.rejectedOrders.length).toBe(1);
    expect(applyNow(w, { type: "move", army, to: back! }, me).rejectedOrders).toEqual([]);
    // Once the castle has no men in it, the road is open.
    w.provinceGarrison[castle] = 0;
    expect(applyNow(w, { type: "move", army, to: onward! }, me).rejectedOrders).toEqual([]);
  });

  it("plans marches around enemy castles when there is a way (playtest feedback)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    applyNow(w, { type: "declareWar", target: foe }, me);
    const map = marchMap(w);
    const a = { men: 20000, horse: 0, logistics: 0 };
    const from = w.provinceIndex.get(rules.nations[me]!.capital)!;
    const army = spawnArmy(w, me, from, 20000, w.commanderOwner.indexOf(me));
    // Portugal takes a Castilian castle on the fastest road somewhere; the march now goes round it.
    let detours = 0;
    for (let to = 0; to < w.provinceCount && !detours; to++) {
      if (w.provinceOwner[to] !== me || !map.ground[to] || to === from) continue;
      const fast = planRoute(rules.defines.march, map, from, to, a);
      const k = fast ? fast.path.slice(0, -1).findIndex((p) => wallsOf(w, p) && w.provinceGarrison[p]! > 0) : -1;
      if (k < 0) continue;
      // The castle and the land beyond it are Portugal's for now.
      const castle = fast!.path[k]!;
      const beyond = fast!.path[k + 1]!;
      w.provinceOccupier[castle] = foe;
      w.provinceOccupier[beyond] = foe;
      const round = planRoute(rules.defines.march, map, from, to, a, routeBars(w, army));
      if (round) {
        expect(round.path).not.toContain(castle);
        expect(applyNow(w, { type: "move", army, to }, me).rejectedOrders).toEqual([]);
        expect(w.armies.route[army]).toEqual(round.path);
        detours++;
      }
      w.provinceOccupier[castle] = -1;
      w.provinceOccupier[beyond] = -1;
    }
    expect(detours).toBeGreaterThan(0);
  });

  it("keeps armies out of land they have no war with or passage through (playtest feedback)", () => {
    const w = createWorld(rules, 7, tiles);
    const me = n(w, "castile");
    const foe = n(w, "portugal");
    const army = armyOf(w, me);
    const lisbon = w.provinceIndex.get(rules.nations[foe]!.capital)!;
    expect(applyNow(w, { type: "move", army, to: lisbon }, me).rejectedOrders[0]?.reason).toMatch(/passage/);
    w.diplomacy.passages.push({ granter: "portugal", grantee: "castile", until: "9999-12" });
    expect(applyNow(w, { type: "move", army, to: lisbon }, me).rejectedOrders).toEqual([]);
  });

  it("gives a province to the first realm to besiege or hold it, not the strongest (feedback 45)", () => {
    const w = createWorld(rules, 1, tiles);
    const a = n(w, "castile");
    const b = n(w, "aragon");
    const foe = n(w, "portugal");
    expect(applyNow(w, { type: "declareWar", target: foe }, a).rejectedOrders).toEqual([]);
    expect(applyNow(w, { type: "declareWar", target: foe }, b).rejectedOrders).toEqual([]);
    const lands = Array.from({ length: w.provinceCount }, (_, p) => p).filter((p) => w.provinceOwner[p] === foe);
    const open = lands.find((p) => !wallsOf(w, p))!;
    const walled = lands.find((p) => wallsOf(w, p))!;
    const news: News[] = [];
    for (const p of [open, walled]) {
      for (let i = 0; i < w.armies.count; i++) if (w.armies.location[i] === p) w.armies.alive[i] = 0;
      if (p === walled) w.provinceGarrison[p] = 50;
      spawnArmy(w, a, p, 1000);
      runOccupation(w, false, news);
      // A bigger army of another realm arrives the next day.
      spawnArmy(w, b, p, 20000);
      for (let d = 0; d < 400 && w.provinceOccupier[p]! < 0; d++) runOccupation(w, false, news);
      expect(w.provinceOccupier[p]).toBe(a);
    }
  });

  it("runs decades of AI wars deterministically and quickly", () => {
    const a = createWorld(rules, 3, tiles);
    const b = createWorld(rules, 3, tiles);
    const t0 = performance.now();
    let wars = 0;
    let taken = 0;
    for (let t = 0; t < 520; t++) {
      const ra = processTurn(a, [], -1);
      processTurn(b, [], -1);
      wars += ra.news.filter((x) => x.kind === "war").length;
      taken += ra.news.filter((x) => x.kind === "peace" && x.text.includes("takes")).length;
    }
    const ms = (performance.now() - t0) / 1040;
    console.log(`10 years: ${wars} wars, ${taken} peaces with land, ${ms.toFixed(2)} ms a turn, ${a.diplomacy.wars.length} wars still on`);
    expect(Array.from(a.provinceOwner)).toEqual(Array.from(b.provinceOwner));
    expect(wars).toBeGreaterThan(0);
    // A week is 42 four-hour steps; the game plays it a day or a step at a time.
    expect(ms).toBeLessThan(120);
  }, 120000);
});
