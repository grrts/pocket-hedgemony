import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, type World } from "../src/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { battleDeath, lordAge, officialAge, onPersonDeath, personDies, yearlyPeople, type PersonDeath } from "../src/people.ts";
import { deathChance } from "../src/mortality.ts";
import { swapOfficials } from "../src/officials.ts";
import { addCommander } from "../src/recruit.ts";
import * as wf from "../src/domain/warfare/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const nation = (w: World, id: string) => w.nationIndex.get(id)!;
const lordOf = (w: World, n: number) => w.lords.findIndex((l, k) => l.nation === n && !l.gone && w.provinceLord.includes(k));
const landsOf = (w: World, k: number) => [...w.provinceLord.keys()].filter((p) => w.provinceLord[p] === k);
const january = (w: World) => {
  w.date.year++;
  w.date.month = 1;
};

describe("people age and die (REALM-270 to REALM-279)", () => {
  it("gives every person one age table, worse for the very young and the old", () => {
    expect(deathChance(2, "heir")).toBeGreaterThan(deathChance(30, "heir"));
    expect(deathChance(75, "official")).toBeGreaterThan(deathChance(45, "official"));
    expect(deathChance(55, "lord")).toBe(deathChance(55, "ruler"));
  });

  it("seeds ages for the lords, officials and commanders of 1444, the same every game", () => {
    const a = createWorld(rules, 1, tiles);
    const b = createWorld(rules, 2, tiles);
    const k = lordOf(a, nation(a, "france"));
    expect(lordAge(a, k).age).toBeGreaterThanOrEqual(20);
    expect(lordAge(a, k)).toEqual(lordAge(b, k));
    const p = a.provinceIndex.get(rules.nations[nation(a, "france")]!.capital)!;
    expect(officialAge(a, p)).toBeGreaterThanOrEqual(25);
    expect(a.commanders.some((c) => c.age !== 30)).toBe(true);
  });

  it("ages everyone a year each January", () => {
    const w = createWorld(rules, 1, tiles);
    const k = lordOf(w, nation(w, "france"));
    const p = w.provinceIndex.get(rules.nations[nation(w, "france")]!.capital)!;
    const [lord, official] = [lordAge(w, k).age, officialAge(w, p)];
    // Nobody dies this year, so the ages can be compared.
    w.rulerRng.next = () => 0.999;
    january(w);
    yearlyPeople(w, []);
    expect(lordAge(w, k).age).toBe(lord + 1);
    expect(officialAge(w, p)).toBe(official + 1);
  });

  it("passes a lord's lands to his heir, and returns them to the crown when his line dies out (REALM-079, REALM-082)", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = nation(w, "france");
    w.player = fr;
    const k = lordOf(w, fr);
    const lands = landsOf(w, k);
    w.lords[k]!.heir = { name: "Jean", age: 20 };
    const news: { text: string }[] = [];
    personDies(w, { kind: "lord", lord: k }, "old age", news as never);
    expect(w.lords[k]!.name).toBe("Jean");
    expect(w.lords[k]!.age).toBe(20);
    expect(landsOf(w, k)).toEqual(lands);
    // No kinsman steps in this time.
    w.rulerRng.next = () => 0.999;
    personDies(w, { kind: "lord", lord: k }, "assassinated", news as never);
    expect(w.lords[k]!.gone).toBe(true);
    for (const p of lands) {
      expect(w.provinceLord[p]).toBe(-1);
      expect(w.provinceOfficial[p]).toBe(-1);
    }
    expect(news.some((n) => /last of his line/.test(n.text))).toBe(true);
  });

  it("leaves a dead official's post empty for the player and refills it for the AI (PROV-194, REALM-275)", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = nation(w, "france");
    const en = nation(w, "england");
    w.player = fr;
    const royal = (n: number) => [...w.provinceOwner.keys()].find((p) => w.provinceOwner[p] === n && w.provinceLord[p]! < 0 && w.provinceOfficial[p]! >= 0)!;
    const mine = royal(fr);
    personDies(w, { kind: "official", p: mine }, "old age", []);
    expect(w.provinceOfficial[mine]).toBe(-1);
    const theirs = royal(en);
    const type = w.provinceOfficial[theirs];
    w.nationTreasury[en] = 1000;
    personDies(w, { kind: "official", p: theirs }, "old age", []);
    expect(w.provinceOfficial[theirs]).toBe(type);
  });

  it("keeps each official's age as he moves posts", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = nation(w, "france");
    const royal = [...w.provinceOwner.keys()].filter((p) => w.provinceOwner[p] === fr && w.provinceLord[p]! < 0 && w.provinceOfficial[p]! >= 0);
    const [a, b] = [royal[0]!, royal[1]!];
    const [ageA, ageB] = [officialAge(w, a), officialAge(w, b)];
    expect(swapOfficials(w, fr, a, b, [])).toBeNull();
    expect([officialAge(w, a), officialAge(w, b)]).toEqual([ageB, ageA]);
  });

  it("takes a dead commander from his army and tells every listener, once (WAR-062)", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = nation(w, "france");
    const slot = [...w.armies.owner.keys()].find((i) => w.armies.alive[i] && w.armies.owner[i] === fr && w.armies.commander[i]! >= 0)!;
    const c = w.armies.commander[slot]!;
    const heard: PersonDeath[] = [];
    const off = onPersonDeath((_, d) => heard.push(d));
    try {
      w.rulerRng.next = () => 0;
      battleDeath(w, c, []);
      personDies(w, { kind: "commander", c }, "old age", []);
    } finally {
      off();
    }
    expect(w.armies.commander[slot]).toBe(-1);
    expect(w.commanderOwner[c]).toBe(-1);
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({ who: { kind: "commander", c }, nation: fr, cause: "battle" });
  });

  it("lowers an old commander's Might as he ages (WAR-051)", () => {
    const w = createWorld(rules, 1, tiles);
    const c = addCommander(w, nation(w, "france"), wf.newCommander("Old Guard", { might: 4, age: 64 }));
    w.rulerRng.next = () => 0.999;
    january(w);
    yearlyPeople(w, []);
    expect(w.commanders[c]!.age).toBe(65);
    expect(w.commanders[c]!.might).toBe(3);
  });

  it("lets an heir die before his father (REALM-102)", () => {
    const w = createWorld(rules, 1, tiles);
    const n = w.rulers.findIndex((r, k) => r.heir && !w.nationGone[k]);
    personDies(w, { kind: "heir", n }, "illness", []);
    expect(w.rulers[n]!.heir).toBeNull();
  });

  it("keeps ages, heirs and lines that died out through a save", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = nation(w, "france");
    const k = lordOf(w, fr);
    w.lords[k]!.heir = { name: "Louis", age: 9 };
    w.lords[k]!.age = 61;
    const p = w.provinceIndex.get(rules.nations[fr]!.capital)!;
    w.provinceOfficialAge[p] = 70;
    w.commanders[0]!.age = 58;
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: w.nationIds[fr]!, options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(lordAge(back, k)).toEqual({ age: 61, heir: { name: "Louis", age: 9 } });
    expect(officialAge(back, p)).toBe(70);
    expect(back.commanders[0]!.age).toBe(58);
  });
});
