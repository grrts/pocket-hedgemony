import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { advance, createWorld, STEPS_PER_TURN, type News } from "../src/index.ts";
import { setPlayer } from "../src/campaignEnd.ts";
import { hashWorld } from "../src/hash.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { spareSleepers, wakeRealm } from "../src/sleeping.ts";

const rules = loadDefaultRuleset();
const N = (w: ReturnType<typeof createWorld>, id: string) => w.nationIndex.get(id)!;

describe("sleeping realms (SETUP-080 to SETUP-091)", () => {
  it("keeps the map nations where they were and sleeps the rest", () => {
    const w = createWorld(rules, 3);
    expect(w.nationIds.indexOf("england")).toBe(0);
    const spain = N(w, "spain");
    expect(spain).toBeGreaterThan(N(w, "pueblo"));
    expect(w.nationAsleep[spain]).toBe(1);
    expect(w.nationGone[spain]).toBe(1);
    expect(spareSleepers(w).length).toBe(12);
  });

  it("plays on after a union, a breakaway and a spare wake, and saves them", () => {
    const w = createWorld(rules, 3);
    const news: News[] = [];
    setPlayer(w, N(w, "castile"));
    expect(wakeRealm(w, N(w, "spain"), { from: [N(w, "castile"), N(w, "aragon")] }, news)).toBe(true);
    expect(w.player).toBe(N(w, "spain"));
    expect(wakeRealm(w, N(w, "dutch_republic"), { breakFrom: N(w, "burgundy") }, news)).toBe(true);
    const spare = spareSleepers(w)[0]!;
    expect(wakeRealm(w, spare, { provinces: [w.provinceIndex.get("p1044")!], name: "Armorica" }, news)).toBe(true);
    // The build's list never takes a woken spare's name.
    expect(rules.nations[spare]!.name).not.toBe("Armorica");
    // A season and more of turns, so the monthly and seasonal steps meet the woken realms.
    for (let k = 0; k < 16; k++) advance(w, STEPS_PER_TURN);
    expect(w.nationGone[N(w, "spain")]).toBe(0);
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: "spain", options: {} as never }).map((c) => [c.id, c])), rules, {}).world;
    expect(back.rules.nations[spare]!.name).toBe("Armorica");
    expect(back.nationAsleep[N(back, "spain")]).toBe(0);
    expect(back.nationAsleep[N(back, "russia")]).toBe(1);
    expect(back.nationGone[N(back, "russia")]).toBe(1);
    expect(hashWorld(back)).toBe(hashWorld(restoreWorld(new Map(worldChunks(back, { playerNation: "spain", options: {} as never }).map((c) => [c.id, c])), rules, {}).world));
  });
});
