import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as G from "@ph/engine";
import * as I from "@ph/engine/domain/institutions";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("institutions");

/**
 * Institutions slice 3, the Shogunate (INST-060 to INST-069, INST-082,
 * INST-083), on a whole 1444 world: Japan's great houses as lords, the hold,
 * summons and confirmation, the break into warlord domains, the Court, the
 * oath, the closed country and the end. The world is the same one the
 * Empire's steps make (s.w), so "January begins" and "the event … fires" run
 * the whole institutions step.
 */

const RULES = loadDefaultRuleset();
type S = Scenario;

function world(s: S): G.World {
  if (!s.w) {
    s.w = G.createWorld(RULES, 1);
    s.news = [] as G.News[];
  }
  return s.w;
}

const shogunate = (s: S): I.Shogunate => world(s).shogunate!;
const N = (s: S, id: string): number => {
  const w = world(s);
  const n = w.nationIndex.get(id) ?? w.rules.nations.findIndex((x, k) => x.name === id && !w.nationGone[k]);
  if (n < 0) throw new Error(`no realm ${id}`);
  return n;
};
const japan = (s: S) => N(s, "japan");
const house = (s: S, name: string): number => {
  const k = G.housesOf(world(s)).find((x) => world(s).lords[x]!.house === name);
  if (k === undefined) throw new Error(`no great house ${name}`);
  return k;
};
const province = (s: S, name: string): number => {
  const p = world(s).rules.provinces.findIndex((x) => x.name === name);
  if (p < 0) throw new Error(`no province ${name}`);
  return p;
};
const BANDS: Record<string, number> = { Strong: 85, Firm: 55, Weak: 30, Hollow: 10 };

/** Runs the institutions step on the 1st of the given month. */
function monthStep(s: S, year: number, month: number): void {
  const w = world(s);
  w.date = { year, month, day: 1 };
  G.syncDate(w);
  G.monthlyInstitutions(w, s.news);
}

// ---------------------------------------------------------------- 1444 and the hold (INST-060 to INST-062)

Then("{string} holds the office of Shogun", (s, name: string) => expect(G.shogunOf(world(s))).toBe(N(s, name === "Japan" ? "japan" : name)));
Then("Japan's great houses are the Shogunate's members", (s) => {
  const w = world(s);
  const houses = G.housesOf(w).map((k) => w.lords[k]!.house);
  expect(houses).toHaveLength(14);
  expect(houses).toEqual(expect.arrayContaining(["Hosokawa", "Yamana", "Ōuchi", "Takeda", "Shimazu"]));
  for (const k of G.housesOf(w)) expect(w.lords[k]!.nation).toBe(japan(s));
});
Then("the Shogunate's hold is {int}", (s, n: number) => expect(shogunate(s).hold).toBe(n));
Given("the Shogunate has hold {int}", (s, n: number) => {
  shogunate(s).hold = n;
});
Given("the house {string} is In revolt", (s, name: string) => {
  world(s).lords[house(s, name)]!.loyalty = "In revolt";
});
Then("the hold record shows {int} for {string}", (s, n: number, name: string) => {
  expect(shogunate(s).record).toContainEqual({ cause: `${name} in revolt`, number: n });
});
Then("no gain for a year without revolt", (s) => {
  expect(shogunate(s).record.some((l) => l.cause === "No house in revolt")).toBe(false);
});
Given("the Shogunate's hold reads {string}", (s, word: string) => {
  shogunate(s).hold = BANDS[word]!;
  expect(I.holdWord(shogunate(s).hold)).toBe(word);
  for (const k of G.housesOf(world(s))) world(s).lords[k]!.loyalty = "Wavering";
});
When("the season ends", (s) => monthStep(s, 1445, 3));
Then("every great house counts {string} as {word} in its loyalty", (s, _reason: string, by: string) => {
  const w = world(s);
  const want = by === "+1" ? "Loyal" : by === "-1" ? "Disloyal" : "Wavering";
  for (const k of G.housesOf(w)) expect(w.lords[k]!.loyalty, w.lords[k]!.house).toBe(want);
});

// ---------------------------------------------------------------- summons and confirmation (INST-063, INST-064)

When("the shogun summons the house {string}", (s, name: string) => {
  s.lord = house(s, name);
  expect(G.summonHouse(world(s), s.lord)).toBeNull();
});
Then("the lord of {string} cannot join a rising", (s, name: string) => expect(G.mayJoinRising(world(s), house(s, name))).toBe(false));
Then("his wealth falls by {int} percent a year", (s, pct: number) => {
  monthStep(s, 1445, 1);
  expect(world(s).lords[s.lord]!.wealth).toBe(100 - pct);
});
When("the hold falls to {int}", (s, n: number) => {
  shogunate(s).hold = n;
  monthStep(s, 1445, 2);
});
Then("the summons of {string} ends", (s, name: string) => {
  expect(shogunate(s).summoned).not.toContain(house(s, name));
  expect(G.mayJoinRising(world(s), house(s, name))).toBe(true);
});
Given("the house {string} is Wavering and its land has not been confirmed by this shogun", (s, name: string) => {
  const k = house(s, name);
  world(s).lords[k]!.loyalty = "Wavering";
  expect(shogunate(s).confirmed.some((c) => c.lord === k)).toBe(false);
  s.holdBefore = shogunate(s).hold;
});
When("the shogun confirms the land of {string}", (s, name: string) => {
  expect(G.confirmHouse(world(s), house(s, name), s.news)).toBeNull();
});
Then("{string} is Loyal", (s, name: string) => expect(world(s).lords[house(s, name)]!.loyalty).toBe("Loyal"));
Then("the Shogunate's hold falls by {int}", (s, n: number) => expect(shogunate(s).hold).toBe(s.holdBefore - n));
Then("the shogun cannot confirm {string} again", (s, name: string) => {
  expect(G.confirmHouse(world(s), house(s, name), s.news)).toBe("already confirmed by this ruler");
});

// ---------------------------------------------------------------- the break (INST-065)

Then("each great house is a warlord domain with its land", (s) => {
  const w = world(s);
  for (const [id, pid] of [["hosokawa", "p2108"], ["ouchi", "p2432"], ["uesugi", "p2116"], ["takeda", "p2113"]] as const) {
    const n = N(s, id);
    expect(w.nationGone[n], id).toBe(0);
    expect(G.formOf(w, n)).toBe("warlord_domain");
    expect(w.provinceOwner[w.provinceIndex.get(pid)!]).toBe(n);
  }
  expect(G.shogunOf(w)).toBe(-1);
});
Then("the shogun's realm is a warlord domain with its royal provinces", (s) => {
  const w = world(s);
  expect(G.formOf(w, japan(s))).toBe("warlord_domain");
  const held: string[] = [];
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === japan(s)) held.push(w.provinceIds[p]!);
  expect(held.sort()).toEqual(["p2103", "p2110", "p2429", "p2431", "p2437"]);
});
Then("the event {string} is in the chronicle", (s, ev: string) => {
  expect(world(s).events!.state.world.history.some((h) => h.event === ev)).toBe(true);
});
Given("the shogun loses the Court's province", (s) => {
  const w = world(s);
  w.provinceOwner[w.provinceIndex.get(I.S.court_province)!] = N(s, "korea");
  monthStep(s, 1445, 2);
});
Then("the Shogunate breaks into warlord domains", (s) => {
  expect(G.shogunOf(world(s))).toBe(-1);
  expect(G.formOf(world(s), N(s, "hosokawa"))).toBe("warlord_domain");
  expect(G.vacantMembers(world(s)).length).toBeGreaterThan(10);
});

// ---------------------------------------------------------------- the Court and the oath (INST-066, INST-067)

/** A warlord domain of Japan woken on the given provinces (a spare named for it). */
function warlord(s: S, name: string, provinces: string[]): number {
  const w = world(s);
  const n = G.spareSleepers(w)[0]!;
  expect(G.wakeRealm(w, n, { provinces: provinces.map((p) => w.provinceIndex.get(p)!), name }, [])).toBe(true);
  G.setForm(w, n, "warlord_domain");
  return n;
}
const HALF = ["p2110", "p2109", "p2111", "p2112", "p2113", "p2114", "p2108", "p2107", "p2106", "p2105", "p2104", "p2116", "p2115", "p1828", "p2117", "p2119", "p2118"];

Given("the office of Shogun is vacant", (s) => {
  G.breakShogunate(world(s), "the test breaks it", s.news);
  expect(G.shogunOf(world(s))).toBe(-1);
});
Given("the warlord domain {string} holds the Court's province and over half of Japan's land provinces", (s, name: string) => {
  const n = warlord(s, name, HALF);
  expect(G.japanHeld(world(s), n) * 2).toBeGreaterThan(shogunate(s).land.length);
  expect(G.vacantMembers(world(s))).toContain(n);
});
When("{string} asks the Court", (s, name: string) => {
  expect(G.askTheCourt(world(s), N(s, name), s.news)).toBeNull();
});
Then("{string} has the shogunate form and holds the office of Shogun", (s, name: string) => {
  expect(G.formOf(world(s), N(s, name))).toBe("shogunate");
  expect(G.shogunOf(world(s))).toBe(N(s, name));
});
Given("{string} has just been appointed shogun", (s, name: string) => {
  G.breakShogunate(world(s), "the test breaks it", s.news);
  warlord(s, name, HALF);
  expect(G.askTheCourt(world(s), N(s, name), s.news)).toBeNull();
});
When("the warlord domain {string} {word} the oath", (s, name: string, answer: string) => {
  const w = world(s);
  const n = warlord(s, name, ["p2432", "p2430"]);
  shogunate(s).oaths.push({ realm: w.nationIds[n]!, ends: "1445-01" });
  s.provinces = 2;
  G.swearOrRefuse(w, n, answer === "swears", s.news);
});
Then("{string} is a great house of {string} with its land, Wavering", (s, name: string, shogun: string) => {
  const w = world(s);
  const k = G.housesOf(w).find((x) => w.lords[x]!.house === name);
  expect(k).toBeDefined();
  expect(w.lords[k!]).toMatchObject({ nation: N(s, shogun), loyalty: "Wavering" });
  expect(w.provinceLord[w.provinceIndex.get("p2432")!]).toBe(k);
});
Then("{string} holds the war aim {string} on {string}", (s, holder: string, aim: string, target: string) => {
  const w = world(s);
  const a = w.diplomacy.aims.find((x) => x.holder === w.nationIds[N(s, holder)] && x.target === w.nationIds[N(s, target)]);
  expect(a?.aim).toBe("bring_to_heel");
  expect(aim).toBe("Bring to heel");
});

// ---------------------------------------------------------------- the closed country and the end (INST-068, INST-069)

Given("it is era III and the Shogunate's hold is Firm", (s) => {
  world(s).diplomacy.era = "III";
  shogunate(s).hold = 55;
});
When("the shogun closes the country with the port {string}", (s, port: string) => {
  expect(G.closeCountry(world(s), province(s, port), s.news)).toBeNull();
  s.port = province(s, port);
});
Then("foreign traders trade only at {string}", (s, port: string) => {
  const w = world(s);
  const korea = N(s, "korea");
  expect(G.closedTo(w, korea, province(s, port))).toBe(false);
  expect(G.closedTo(w, korea, w.provinceIndex.get("p2110")!)).toBe(true);
  expect(G.closedTo(w, japan(s), w.provinceIndex.get("p2110")!)).toBe(false);
});
Then("foreign faiths send no missionaries into Japan", (s) => {
  expect(G.missionariesBarred(world(s), N(s, "castile"), world(s).provinceIndex.get("p2110")!)).toBe(true);
});
Then("the ports are open", (s) => {
  expect(shogunate(s).closed).toBeNull();
  expect(shogunate(s).forcedOpen).toBe(true);
});
When("{string} reforms to a constitutional monarchy", (s, name: string) => {
  G.setForm(world(s), N(s, name === "Japan" ? "japan" : name), "constitutional_monarchy");
  monthStep(s, 1445, 2);
});
Then("the Shogunate has ended", (s) => expect(shogunate(s).ended?.how).toBe("reform"));

// ---------------------------------------------------------------- the card and the oath card (INST-082, INST-083)

Given("the player plays {string} and the Shogunate's hold is Weak", (s, name: string) => {
  world(s).player = N(s, name === "Japan" ? "japan" : name);
  shogunate(s).hold = BANDS.Weak!;
});
When("the player opens the Shogunate card", (s) => {
  s.view = G.shogunateView(world(s), world(s).player);
  expect(s.view).not.toBeNull();
});
Then("it has the folds Houses, The Court and Hold", (s) => {
  expect([...I.SHOGUNATE_FOLDS]).toEqual(["Houses", "The Court", "Hold"]);
  const v: G.ShogunateView = s.view;
  expect(v.houses).toHaveLength(14);
  expect(v.court.holder).toBe(japan(s));
  expect(v.role).toBe("Shogun");
});
Then("it shows the line {string}", (s, line: string) => expect((s.view as G.ShogunateView).warning).toBe(line));
When("a request to swear an oath concerns the player", (s) => {
  const w = world(s);
  G.breakShogunate(w, "the test breaks it", s.news);
  w.player = N(s, "shimazu");
  warlord(s, "Oda", HALF);
  expect(G.askTheCourt(w, N(s, "Oda"), s.news)).toBeNull();
  s.oathAsk = true;
});
