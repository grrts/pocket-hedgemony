import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as G from "@ph/engine";
import * as T from "@ph/engine/domain/tribes";
import * as DIP from "@ph/engine/domain/diplomacy";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("tribes");

/**
 * Tribes (TRIBE-001, TRIBE-006 to TRIBE-033). The start's walk and the range
 * sizes are checked on the domain's own rules with the provinces a scenario
 * names; everything else on a whole 1444 campaign, where the five tribal
 * realms of the map walk their grounds: claims, furs, taking in, settlers,
 * asks for the land, the AI and what the screens read.
 */

const RULES = loadDefaultRuleset();
type S = Scenario;

const formId = (name: string) => name.toLowerCase().replace(/ /g, "_");
const idOf = (name: string) => name.toLowerCase().replace(/^the /, "").replace(/ /g, "_");

/** A whole 1444 campaign, made on first need. */
function world(s: S): G.World {
  if (!s.w) {
    s.w = G.createWorld(RULES, 1);
    s.news = [] as G.News[];
  }
  return s.w;
}
const nation = (s: S, name: string): number => {
  const n = world(s).nationIndex.get(idOf(name));
  if (n === undefined) throw new Error(`no realm ${name}`);
  return n;
};
const province = (s: S, name: string): number => {
  const p = world(s).rules.provinces.findIndex((x) => x.name === name);
  if (p < 0) throw new Error(`no province ${name}`);
  return p;
};
const list = (names: string) => [...names.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
const month = (s: S) => T.monthNumber(world(s).date.year, world(s).date.month);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function setDate(s: S, text: string): void {
  const m = /^(\d+) (\w+) (\d+)$/.exec(text)!;
  const w = world(s);
  w.date = { year: Number(m[3]), month: MONTHS.indexOf(m[2]!) + 1, day: Number(m[1]) };
  G.syncDate(w);
}
const monthOfText = (text: string): number => {
  const m = /^(\d+) (\w+) (\d+)$/.exec(text)!;
  return T.monthNumber(Number(m[3]), MONTHS.indexOf(m[2]!) + 1);
};
const monthly = (s: S) => G.monthlyTribes(world(s), s.news);
const neighboursOf = (w: G.World, p: number): number[] => Array.from(w.adjList.subarray(w.adjStart[p]!, w.adjStart[p + 1]!)).filter((q) => !w.provinceWater[q]);

/** Makes p a ground of the realm, held since the given month (now when left out). */
function ground(s: S, realm: string, p: string, since?: number): void {
  const w = world(s);
  const q = province(s, p);
  expect(w.provinceOwner[q]).toBe(-1);
  G.makeGround(w, nation(s, realm), q, since ?? month(s));
}
/** Leaves the realm with only `keep` of its grounds (the newest go). */
function keepGrounds(s: S, realm: string, keep: number): void {
  const w = world(s);
  for (const p of G.groundsOf(w, nation(s, realm)).slice(keep)) w.provinceHunt[p] = -1;
}

// ---------------------------------------------------------------- tribal realms and range sizes (TRIBE-001, TRIBE-006)

Given("the country {string} has the form {string}", (s, name: string, form: string) => {
  (s.forms ??= {})[name] = formId(form);
});
Given("the capital of {string} lies in the region {string}", (s, name: string, region: string) => {
  const w = world(s);
  const n = nation(s, name);
  const def = w.rules.provinces[w.provinceIndex.get(w.rules.nations[n]!.capital)!]!;
  const m = w.rules.map!;
  expect(T.inTribalRegion(def.x! / m.pxPerDeg - 180, m.latTop - def.y! / m.pxPerDeg)).toBe(T.tribesConfig.regions.includes(region));
});
Then(/^"([^"]+)" is a tribal realm: (yes|no)$/, (s, name: string, yes: string) => {
  const w = world(s);
  const n = nation(s, name);
  G.setForm(w, n, s.forms[name]);
  expect(G.isTribal(w, n)).toBe(yes === "yes");
});
Then("the range size of {string} is {int}", (s, name: string, size: number) => expect(T.rangeSize(s.forms[name])).toBe(size));

// ---------------------------------------------------------------- the start (TRIBE-007), on the domain's own walk

Given("the date is 11 November 1444", (s) => {
  s.date = T.monthNumber(1444, 11);
});
Given(/^the unowned land provinces touching the Creek are (.+)$/, (s, text: string) => {
  const rows = [...text.matchAll(/"([^"]+)" with (\d+)/g)].map((m) => ({ name: m[1]!, people: Number(m[2]) }));
  // Province 0 is the Creek's land; each named province touches it and nothing else.
  s.names = ["Creek land", ...rows.map((r) => r.name)];
  s.people = [0, ...rows.map((r) => r.people)];
  s.adj = [rows.map((_, k) => k + 1), ...rows.map(() => [0])];
  s.realms = [{ name: "Creek", realm: 0, land: [0] }];
});
Given("the unowned province {string} touches both {string} and {string}", (s, p: string, a: string, b: string) => {
  // 0: Cherokee land, 1: Creek land, 2: the shared province, 3 and 4: next best of each.
  s.names = [`${a} land`, `${b} land`, p, `${b} next`, `${a} next`];
  s.people = [0, 0, 60, 40, 30];
  s.adj = [[2, 4], [2, 3], [0, 1], [1], [0]];
  s.realms = [
    { name: a, realm: 0, land: [0] },
    { name: b, realm: 1, land: [1] },
  ];
});
Given("{string} comes before {string} in nation index", (s, a: string, b: string) => {
  expect(s.realms.findIndex((r: { name: string }) => r.name === a)).toBeLessThan(s.realms.findIndex((r: { name: string }) => r.name === b));
});
Given("{string} is the best ground left for both", (s, p: string) => {
  const k = s.names.indexOf(p);
  expect(Math.max(...s.people)).toBe(s.people[k]);
});
When("a campaign starts", (s) => {
  if (!s.realms) {
    world(s);
    return;
  }
  const size = (name: string) => T.rangeSize(s.forms?.[name] ?? "chiefdom");
  s.ranges = T.startRanges(
    s.realms.map((r: { name: string; realm: number; land: number[] }) => ({ realm: r.realm, size: size(r.name), land: r.land })),
    (p) => s.adj[p],
    (p) => !s.realms.some((r: { land: number[] }) => r.land.includes(p)),
    (p) => s.people[p],
  );
});
const startGrounds = (s: S, name: string): string[] => (s.ranges.get(s.realms.find((r: { name: string }) => r.name === name).realm) as number[]).map((p) => s.names[p]);
Then(/^the hunting grounds of "([^"]+)" are (.+)$/, (s, name: string, names: string) => expect(startGrounds(s, name)).toEqual(list(names)));
// The start's walk checks it; in a campaign the scenario makes it so.
Given("{string} is a hunting ground of {string}", (s, p: string, realm: string) => {
  if (s.ranges) return void expect(startGrounds(s, realm)).toContain(p);
  if (G.huntOf(world(s), province(s, p)) !== nation(s, realm)) ground(s, realm, p);
  s.ground = p;
});
Then("{string} takes its next best province instead", (s, name: string) => {
  const got = startGrounds(s, name);
  expect(got[0]).toBe(`${name} next`);
  expect(got).not.toContain(s.names[2]);
});

// ---------------------------------------------------------------- claiming and leaving (TRIBE-008 to TRIBE-010)

Given("the country {string} has {int} of {int} hunting grounds and no claim under way", (s, name: string, held: number, size: number) => {
  const w = world(s);
  expect(G.rangeOf(w, nation(s, name))).toBe(size);
  keepGrounds(s, name, held);
  expect(G.groundsOf(w, nation(s, name)).length).toBe(held);
  expect(w.tribes.claims.some((c) => c.realm === nation(s, name))).toBe(false);
});
Given("the unowned province {string} touches the land of {string}", (s, p: string, realm: string) => {
  const w = world(s);
  expect(w.provinceOwner[province(s, p)]).toBe(-1);
  expect(neighboursOf(w, province(s, p)).some((q) => w.provinceOwner[q] === nation(s, realm))).toBe(true);
});
When("{string} claims {string} on {}", (s, realm: string, p: string, date: string) => {
  setDate(s, date);
  expect(G.claimGround(world(s), nation(s, realm), province(s, p), s.news)).toBeNull();
});
Then("a claim on {string} runs until {}", (s, p: string, date: string) => {
  const c = world(s).tribes.claims.find((x) => x.province === province(s, p))!;
  expect(T.monthText(c.ends)).toBe(date);
});
Then("on {} {string} is a hunting ground of {string}", (s, date: string, p: string, realm: string) => {
  setDate(s, date);
  monthly(s);
  expect(G.huntOf(world(s), province(s, p))).toBe(nation(s, realm));
});

Given("the country {string} is a tribal realm", (s, name: string) => {
  expect(G.isTribal(world(s), nation(s, name))).toBe(true);
  s.realm = name;
  s.target = "East Kentucky";
});
Given("its range has no free place", (s) => {
  const w = world(s);
  expect(G.groundsOf(w, nation(s, s.realm)).length).toBe(G.rangeOf(w, nation(s, s.realm)));
});
Given("it already has a claim under way", (s) => {
  keepGrounds(s, s.realm, 1);
  world(s).tribes.claims.push({ realm: nation(s, s.realm), province: province(s, "West Virginia 2"), ends: month(s) + 3 });
});
Given("the province is a hunting ground of {string}", (s, realm: string) => {
  keepGrounds(s, s.realm, 1);
  s.target = "North Mississippi";
  expect(G.huntOf(world(s), province(s, s.target))).toBe(nation(s, realm));
});
Given("a colony is being founded in the province", (s) => {
  keepGrounds(s, s.realm, 1);
  world(s).explore.colonies.push({ province: province(s, s.target), owner: nation(s, "Castile"), governor: -1, progress: 10, aggression: "Wary", food: 0, lastChange: 0 });
});
Given("the province touches neither its land nor its grounds", (s) => {
  keepGrounds(s, s.realm, 1);
  s.target = "Massachusetts";
});
Given("the province is owned by a realm", (s) => {
  keepGrounds(s, s.realm, 1);
  s.target = "North Alabama";
});
When("{string} tries to claim the province", (s, realm: string) => {
  s.why = G.whyNotClaim(world(s), nation(s, realm), province(s, s.target));
});
Then(/^the claim is refused because (.+)$/, (s, reason: string) => expect(s.why).toBe(reason));

When("{string} leaves {string} on {}", (s, realm: string, p: string, date: string) => {
  setDate(s, date);
  expect(G.leaveGround(world(s), nation(s, realm), province(s, p), s.news)).toBeNull();
});
Then("{string} is no one's hunting ground", (s, p: string) => expect(G.huntOf(world(s), province(s, p))).toBe(-1));
Then("{string} may not claim {string} again before {}", (s, realm: string, p: string, date: string) => {
  const b = world(s).tribes.barred.find((x) => x.realm === nation(s, realm) && x.province === province(s, p))!;
  expect(b.until).toBe(monthOfText(date));
});

// ---------------------------------------------------------------- losing grounds (TRIBE-011 to TRIBE-013)

When("a colony of {string} is founded in {string}", (s, realm: string, p: string) => {
  world(s).provinceOwner[province(s, p)] = nation(s, realm);
});
Then("{string} is no longer a hunting ground of {string}", (s, p: string, realm: string) => expect(G.huntOf(world(s), province(s, p))).not.toBe(nation(s, realm)));
Then("{string} has a free place in its range", (s, realm: string) => {
  const w = world(s);
  expect(G.groundsOf(w, nation(s, realm)).length).toBeLessThan(G.rangeOf(w, nation(s, realm)));
});
Given("{string} is a hunting ground of {string} touching only {string}", (s, p: string, realm: string, only: string) => {
  const w = world(s);
  const n = nation(s, realm);
  ground(s, realm, p);
  // Its other ties to the realm go: neighbouring grounds of the realm are left.
  for (const q of neighboursOf(w, province(s, p))) if (G.huntOf(w, q) === n) w.provinceHunt[q] = -1;
  const ties = neighboursOf(w, province(s, p)).filter((q) => w.provinceOwner[q] === n || G.huntOf(w, q) === n);
  expect(ties).toEqual([province(s, only)]);
});
When("{string} is taken from {string} in a peace", (s, p: string, realm: string) => {
  const w = world(s);
  expect(w.provinceOwner[province(s, p)]).toBe(nation(s, realm));
  G.cedeProvince(w, province(s, p), nation(s, "Cherokee"), s.news);
});
Then("at the next monthly step {string} is no longer a hunting ground of {string}", (s, p: string, realm: string) => {
  expect(G.huntOf(world(s), province(s, p))).toBe(nation(s, realm));
  monthly(s);
  expect(G.huntOf(world(s), province(s, p))).toBe(-1);
});
Given("the country {string} holds {int} hunting grounds", (s, realm: string, n: number) => expect(G.groundsOf(world(s), nation(s, realm)).length).toBe(n));
When("{string} reforms to {string}", (s, realm: string, form: string) => G.setForm(world(s), nation(s, realm), formId(form) as Parameters<typeof G.setForm>[2]));
Then("{string} holds no hunting grounds", (s, realm: string) => expect(G.groundsOf(world(s), nation(s, realm))).toEqual([]));

// ---------------------------------------------------------------- what a ground gives (TRIBE-014 to TRIBE-017)

When("a month passes", (s) => {
  const w = world(s);
  s.before = Float64Array.from(w.nationTreasury);
  G.runLedger(w, true);
});
Then("the treasury of {string} gains {int} gold on the ledger line {string}", (s, realm: string, gold: number, label: string) => {
  const w = world(s);
  const n = nation(s, realm);
  const line = G.LEDGER.indexOf("furs");
  expect(w.nationLedger[n * G.LEDGER.length + line]).toBeCloseTo(gold);
  const view = G.treasuryView({ playerNation: n, nationTreasury: w.nationTreasury, ledger: G.LEDGER.map((l, k) => ({ line: l, gold: w.nationLedger[n * G.LEDGER.length + k]! })), provinceTax: [], provinceOwner: [], taxDefault: 2, debt: 0, debtLimit: 0, canBorrow: 0, loanDebtFactor: 1, loanUnsettlesLords: false } as unknown as Parameters<typeof G.treasuryView>[0]);
  expect(view.ledger.find((r) => r.label === label)?.gold).toBeCloseTo(gold);
});

Given(/^an army of (.+) stands in "([^"]+)"$/, (s, quoted: string, p: string) => {
  const w = world(s);
  const who = quoted.replace(/^"|"$/g, "");
  const tribe = nation(s, "Iroquois");
  let n = tribe;
  if (who.startsWith("an ally of")) {
    n = nation(s, "Huron");
    DIP.relations.formAlliance(w.diplomacy.graph, w.nationIds[n]!, w.nationIds[tribe]!);
  } else if (who.startsWith("a realm at war")) {
    n = nation(s, "Huron");
    expect(G.declareWar(w, n, tribe, s.news)).toBeNull();
  } else n = nation(s, who.replace(/"/g, ""));
  const q = province(s, p);
  w.provinceStore[q] = 400;
  s.slot = G.spawnArmy(w, n, q, 1000, -1, 0);
  s.where = q;
});
Then(/^the army refills its wagons there as in (friendly|enemy) land$/, (s, land: string) => {
  const w = world(s);
  const got = G.refillHere(w, s.slot);
  // The same province as the tribe's own land: friendly keeps the locals' reserve, enemy land is stripped.
  const tribe = nation(s, "Iroquois");
  w.provinceHunt[s.where] = -1;
  w.provinceOwner[s.where] = tribe;
  const asLand = G.refillHere(w, s.slot);
  w.provinceOwner[s.where] = -1;
  w.provinceHunt[s.where] = tribe;
  expect(got).toBeCloseTo(asLand);
  expect(G.atWar(w, tribe, w.armies.owner[s.slot]!)).toBe(land === "enemy");
});

Given("{string} touches a hunting ground of {string}", (s, p: string, realm: string) => {
  const w = world(s);
  const d = w.diplomacy;
  const a = w.nationIds[nation(s, "Huron")]!;
  const b = w.nationIds[nation(s, realm)]!;
  // Forget any border the start drew, so the ground alone makes the neighbours.
  d.borders = d.borders.filter((k) => k !== DIP.pairKey(a, b));
  const q = neighboursOf(w, province(s, p)).find((x) => w.provinceOwner[x] === -1 && G.huntOf(w, x) === -1) ?? neighboursOf(w, province(s, p)).find((x) => G.huntOf(w, x) === nation(s, realm))!;
  w.provinceHunt[q] = -1;
  G.makeGround(w, nation(s, realm), q, month(s));
});
Given("the land of {string} and {string} do not touch", (s, a: string, b: string) => {
  const w = world(s);
  // On the 1444 map they do: the second realm's provinces on the first's border go to no one, as long as it keeps one.
  for (let p = 0; p < w.provinceCount; p++) {
    if (w.provinceOwner[p] !== nation(s, b) || !neighboursOf(w, p).some((q) => w.provinceOwner[q] === nation(s, a))) continue;
    if (w.provinceOwner.filter((o) => o === nation(s, b)).length > 1) w.provinceOwner[p] = -1;
  }
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === nation(s, a)) for (const q of neighboursOf(w, p)) expect(w.provinceOwner[q]).not.toBe(nation(s, b));
});
Then("{string} and {string} are neighbours", (s, a: string, b: string) => {
  const w = world(s);
  expect(DIP.neighbours(w.diplomacy, w.nationIds[nation(s, a)]!)).toContain(w.nationIds[nation(s, b)]!);
});

Then("{string} pays no tax, needs no official and raises no levy", (s, p: string) => {
  const w = world(s);
  const q = province(s, p);
  expect(w.provinceOwner[q]).toBe(-1);
  expect(G.ungoverned(w, q)).toBe(false);
  // No owner: no tax line, no levy and no seat in the domination count read it.
  expect(G.groundsOf(w, nation(s, "Iroquois"))).toContain(q);
});
Then("{string} does not count toward world domination for {string}", (s, p: string, realm: string) => {
  const w = world(s);
  expect(w.provinceOwner[province(s, p)]).not.toBe(nation(s, realm));
});
Then("the people of {string} are a people with no country", (s, p: string) => {
  const w = world(s);
  expect(w.provinceOwner[province(s, p)]).toBe(-1);
  expect(T.groundLine(null)).toBe("Land of a people with no country");
});

// ---------------------------------------------------------------- taking in (TRIBE-018 to TRIBE-020)

Given("{string} has been a hunting ground of {string} since 11 November 1444", (s, p: string, realm: string) => {
  const w = world(s);
  const q = province(s, p);
  if (G.huntOf(w, q) !== nation(s, realm)) ground(s, realm, p);
  w.provinceHuntSince[q] = T.monthNumber(1444, 11);
});
Given(/^"([^"]+)" has been a hunting ground of "([^"]+)" for (\d+) years$/, (s, p: string, realm: string, years: string) => {
  const w = world(s);
  setDate(s, "1 January 1460");
  const q = province(s, p);
  if (G.huntOf(w, q) !== nation(s, realm)) {
    keepGrounds(s, realm, 1);
    ground(s, realm, p);
  }
  w.provinceHuntSince[q] = month(s) - Number(years) * 12;
  s.ground = p;
});
Given(/^the largest tongue of "([^"]+)" is (not )?the tongue of "([^"]+)"$/, (s, p: string, not: string | undefined, realm: string) => {
  const w = world(s);
  const court = w.nationCourt[nation(s, realm)]!;
  w.provinceTongue[province(s, p) * 3] = not ? (court === 0 ? 1 : court - 1) : court;
});
Given(/^"([^"]+)" is at (peace|war)$/, (s, realm: string, state: string) => {
  const w = world(s);
  if (state === "war") expect(G.declareWar(w, nation(s, "Creek"), nation(s, realm), s.news)).toBeNull();
  expect(G.inAnyWar(w, nation(s, realm))).toBe(state === "war");
});
When("{string} takes in {string} on {}", (s, realm: string, p: string, date: string) => {
  setDate(s, date);
  s.people = world(s).provincePopulation[province(s, p)];
  s.tongue = world(s).provinceTongue[province(s, p) * 3];
  expect(G.takeIn(world(s), nation(s, realm), province(s, p), s.news)).toBeNull();
});
When("{string} takes in {string}", (s, realm: string, p: string) => {
  expect(G.takeIn(world(s), nation(s, realm), province(s, p), s.news)).toBeNull();
});
Then("{string} is a province of {string} with its people, tongue and faith", (s, p: string, realm: string) => {
  const w = world(s);
  const q = province(s, p);
  expect(w.provinceOwner[q]).toBe(nation(s, realm));
  expect(w.provincePopulation[q]).toBe(s.people);
  expect(w.provinceTongue[q * 3]).toBe(s.tongue);
});
Then("{string} needs no official", (s, p: string) => {
  expect(G.selfRun(world(s), province(s, p))).toBe(true);
  expect(G.ungoverned(world(s), province(s, p))).toBe(false);
});
Then("{string} needs an official, counted against the officials cap of {string}", (s, p: string, realm: string) => {
  const w = world(s);
  const q = province(s, p);
  expect(w.provinceOwner[q]).toBe(nation(s, realm));
  expect(G.selfRun(w, q)).toBe(false);
  expect(G.ungoverned(w, q)).toBe(true);
});
Given("a colony is being founded in {string}", (s, p: string) => {
  world(s).explore.colonies.push({ province: province(s, p), owner: nation(s, "Castile"), governor: -1, progress: 10, aggression: "Wary", food: 0, lastChange: 0 });
});
When("{string} tries to take in {string}", (s, realm: string, p: string) => {
  s.why = G.whyNotTakeIn(world(s), nation(s, realm), province(s, p));
});
Then(/^it is refused because (.+)$/, (s, reason: string) => expect(s.why).toBe(reason));

// ---------------------------------------------------------------- settlers on our land (TRIBE-021 to TRIBE-025)

Given("a governor of {string} goes ashore in {string}", (s, realm: string, p: string) => {
  s.founder = realm;
  s.site = p;
});
When("the local aggression rolls {string}", (s, rolled: T.AggressionLevel) => {
  s.colony = G.colonyStarts(world(s), nation(s, s.founder), province(s, s.site), rolled, s.news);
});
Then("the colony's local aggression is {string}", (s, level: string) => expect(s.colony.aggression).toBe(level));
When("{string} starts founding a colony in {string} on {}", (s, realm: string, p: string, date: string) => {
  setDate(s, date);
  s.colony = G.colonyStarts(world(s), nation(s, realm), province(s, p), "Wary", s.news);
});
Then("{string} holds the wrong {string} of {int} against {string}, fading over {int} years", (s, tribe: string, wrong: string, weight: number, realm: string, years: number) => {
  const w = world(s);
  const e = DIP.ledgerOf(w.diplomacy, w.nationIds[nation(s, tribe)]!, w.nationIds[nation(s, realm)]!).find((x) => x.name === wrong)!;
  expect(e.weight).toBe(weight);
  expect(e.fadeYears).toBe(years);
});
Then("{string} holds the war aim {string} against {string} until {}", (s, tribe: string, aim: string, realm: string, date: string) => {
  const w = world(s);
  const a = DIP.warAimsOf(w.diplomacy, w.nationIds[nation(s, tribe)]!, w.nationIds[nation(s, realm)]!).find((x) => DIP.aimName(x.aim) === aim && x.source === T.SETTLERS_WRONG)!;
  const { year, month: m } = T.monthYear(monthOfText(date));
  expect(a.until).toBe(`${year}-${String(m).padStart(2, "0")}`);
});

When("{string} asks {string} for {string} offering {int} gold", (s, asker: string, tribe: string, p: string, gold: number) => {
  if (s.founder) return aiAsks(s, asker, tribe, p, gold);
  const w = world(s);
  w.nationTreasury[nation(s, asker)] = 100;
  s.gold = { [asker]: w.nationTreasury[nation(s, asker)]!, [tribe]: w.nationTreasury[nation(s, tribe)]! };
  expect(G.huntOf(w, province(s, p))).toBe(nation(s, tribe));
  expect(G.askForLand(w, nation(s, asker), province(s, p), gold, s.news)).toBeNull();
});
When(/^a month later "([^"]+)" says (yes|no)$/, (s, tribe: string, yes: string) => {
  const w = world(s);
  const ask = w.tribes.asks.find((a) => a.tribe === nation(s, tribe))!;
  expect(ask.answerOn).toBe(month(s) + 1);
  w.date = { year: w.date.year + (w.date.month === 12 ? 1 : 0), month: (w.date.month % 12) + 1, day: 1 };
  G.syncDate(w);
  expect(G.answerLandAsk(w, nation(s, tribe), ask.id, yes === "yes", s.news)).toBeNull();
});
Then("{string} gains {int} gold and {string} loses {int} gold", (s, tribe: string, g1: number, asker: string, g2: number) => {
  const w = world(s);
  expect(w.nationTreasury[nation(s, tribe)]! - s.gold[tribe]).toBeCloseTo(g1);
  expect(s.gold[asker] - w.nationTreasury[nation(s, asker)]!).toBeCloseTo(g2);
});
Then("{string} may not claim {string} again for {int} years", (s, tribe: string, p: string, years: number) => {
  const b = world(s).tribes.barred.find((x) => x.realm === nation(s, tribe) && x.province === province(s, p))!;
  expect(b.until).toBe(month(s) + years * 12);
});
Then("the next colony of {string} in {string} rolls {string}", (s, realm: string, p: string, level: string) => {
  s.colony = G.colonyStarts(world(s), nation(s, realm), province(s, p), "Fierce", s.news);
  expect(s.colony.aggression).toBe(level);
});
Then("that colony counts as founded with the consent of the local people", (s) => expect(s.colony.consent).toBe(true));

Given("{string} is asked for one of its hunting grounds by {string}", (s, tribe: string, asker: string) => {
  s.ask = { tribe: nation(s, tribe), asker: nation(s, asker), gold: T.landPrice() };
});
Given("{string} offers more gold than the asking price", (s) => {
  s.ask.gold = T.landPrice() * 2;
  s.reason = "Gold offered";
});
Given("{string} holds {string} against {string}", (s, tribe: string, wrong: string, asker: string) => {
  const w = world(s);
  DIP.eventOpinion(w.diplomacy, wrong, w.nationIds[nation(s, tribe)]!, w.nationIds[nation(s, asker)]!, -30, 20);
  s.reason = wrong;
});
Given("the stance of {string} toward {string} is Hostile", (s, tribe: string, asker: string) => {
  const w = world(s);
  DIP.relations.setStance(w.diplomacy.graph, w.nationIds[nation(s, tribe)]!, w.nationIds[nation(s, asker)]!, "hostile");
  s.reason = "Hostile toward them";
});
Given("it is the last hunting ground of {string}", (s, tribe: string) => {
  keepGrounds(s, tribe, 1);
  s.reason = "Our last hunting ground";
});
Then(/^the reasons count of "([^"]+)" counts it as (a yes|a no|a strong no)$/, (s, _tribe: string, weight: string) => {
  const c = G.landAskCount(world(s), s.ask.asker, s.ask.tribe, s.ask.gold);
  const n = c.reasons.find((r) => r.name === s.reason)!.number;
  if (weight === "a yes") expect(n).toBeGreaterThan(0);
  if (weight === "a no") expect(n).toBeLessThan(0);
  if (weight === "a strong no") expect(n).toBeLessThanOrEqual(-50);
});

// ---------------------------------------------------------------- the AI (TRIBE-031 to TRIBE-033)

Given("the AI country {string} has a free place in its range and no claim under way", (s, realm: string) => {
  const w = world(s);
  expect(w.player).not.toBe(nation(s, realm));
  s.realm = realm;
});
Given(/^it may claim "([^"]+)" with (\d+) people and "([^"]+)" with (\d+) people$/, (s, a: string, na: string, b: string, nb: string) => {
  const w = world(s);
  const n = nation(s, s.realm);
  // Free the first of them if it is the realm's ground already, then leave only these two to claim.
  w.provinceHunt[province(s, a)] = -1;
  keepGrounds(s, s.realm, G.rangeOf(w, n) - 1);
  w.provincePopulation[province(s, a)] = Number(na);
  w.provincePopulation[province(s, b)] = Number(nb);
  for (let p = 0; p < w.provinceCount; p++) if (p !== province(s, a) && p !== province(s, b) && w.provinceOwner[p] === -1 && !G.whyNotClaim(w, n, p)) w.provincePopulation[p] = 1;
  expect(G.whyNotClaim(w, n, province(s, a))).toBeNull();
  expect(G.whyNotClaim(w, n, province(s, b))).toBeNull();
});
When("the monthly step runs", (s) => monthly(s));
Then("{string} claims {string}", (s, realm: string, p: string) => {
  expect(world(s).tribes.claims.find((c) => c.realm === nation(s, realm))?.province).toBe(province(s, p));
});

Given("the AI country {string} has {int} hunting grounds held 10 years or more", (s, realm: string, n: number) => {
  const w = world(s);
  setDate(s, "1 January 1456");
  const grounds = G.groundsOf(w, nation(s, realm));
  grounds.slice(0, n).forEach((p, k) => (w.provinceHuntSince[p] = T.monthNumber(1444, 11) + k));
  for (const p of grounds.slice(n)) w.provinceHuntSince[p] = month(s);
  s.old = grounds.slice(0, n);
  s.realm = realm;
});
Given("{string} has room under its officials cap for one official", (s, realm: string) => {
  const w = world(s);
  const n = nation(s, realm);
  let used = 0;
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === n && w.provinceLord[p]! < 0 && (w.provinceOfficial[p]! >= 0 || !G.selfRun(w, p))) used++;
  const cap = G.governmentView(w, n).officials.cap.total;
  w.nationCustomOfficials[n] = w.nationCustomOfficials[n]! + used + 1 - cap;
  w.nationTreasury[n] = 500;
});
Given("one of those grounds needs an official and the other does not", (s) => {
  const w = world(s);
  const court = w.nationCourt[nation(s, s.realm)]!;
  w.provinceTongue[s.old[0] * 3] = court === 0 ? 1 : court - 1;
  w.provinceTongue[s.old[1] * 3] = court;
});
When("the turn in which 1 January falls ends", (s) => monthly(s));
Then("{string} takes in both grounds, oldest first, while it stays within its officials cap", (s, realm: string) => {
  const w = world(s);
  const n = nation(s, realm);
  for (const p of s.old) expect(w.provinceOwner[p]).toBe(n);
  const v = G.governmentView(w, n);
  expect(v.officials.used).toBeLessThanOrEqual(v.officials.cap.total);
});

Given("the AI country {string} wants to found a colony in {string}", (s, realm: string, p: string) => {
  s.founder = realm;
  s.site = p;
});
Given("{string} holds at least {int} gold", (s, realm: string, gold: number) => {
  world(s).nationTreasury[nation(s, realm)] = gold;
});
function aiAsks(s: S, asker: string, tribe: string, p: string, gold: number): void {
  const w = world(s);
  expect(G.aiWaitsToFound(w, nation(s, asker), province(s, p), s.news)).toBe(true);
  const ask = w.tribes.asks.find((a) => a.asker === nation(s, asker) && a.province === province(s, p))!;
  expect(ask).toMatchObject({ tribe: nation(s, tribe), gold });
}
Then("{string} founds there only after {string} has answered", (s, asker: string) => {
  const w = world(s);
  const p = province(s, s.site);
  expect(G.aiWaitsToFound(w, nation(s, asker), p, s.news)).toBe(true);
  w.date = { year: w.date.year + (w.date.month === 12 ? 1 : 0), month: (w.date.month % 12) + 1, day: 1 };
  G.syncDate(w);
  monthly(s);
  expect(w.tribes.asks.length).toBe(0);
  expect(G.aiWaitsToFound(w, nation(s, asker), p, s.news)).toBe(false);
});

// ---------------------------------------------------------------- the screens (TRIBE-026 to TRIBE-030)

const view = (s: S) => G.tribesView(world(s), world(s).player);
function play(s: S, realm: string): void {
  world(s).player = nation(s, realm);
}

Given("the player plays {string}, which has a free place in its range", (s, realm: string) => {
  play(s, realm);
  keepGrounds(s, realm, 1);
});
Given("the player plays {string}, whose range has no free place", (s, realm: string) => {
  play(s, realm);
  expect(G.groundsOf(world(s), nation(s, realm)).length).toBe(G.rangeOf(world(s), nation(s, realm)));
});
When("the player opens the province card of {string}", (s, p: string) => {
  const v = view(s);
  const q = province(s, p);
  const g = v.ground[q]!;
  s.card = {
    line: T.groundLine(g >= 0 ? G.tribeName(world(s), g) : null),
    claim: v.mine?.candidates.find((c) => c.province === q),
    row: v.mine?.grounds.find((r) => r.province === q),
    name: p,
  };
});
Then("the card says {string}", (s, line: string) => expect(s.card.line).toBe(line));
Then("it shows the button {string} at least {int} points high", (s, label: string, h: number) => {
  const b = T.claimButton(s.card.claim.why);
  expect(b).toMatchObject({ label, enabled: true });
  expect(b.minHeight).toBeGreaterThanOrEqual(h);
});
Then("the claim button is greyed and {string} is written under it", (s, note: string) => {
  expect(T.claimButton(s.card.claim.why)).toMatchObject({ enabled: false, note });
});
Given("the player plays {string} and {string} has been its ground {int} years", (s, realm: string, p: string, years: number) => {
  play(s, realm);
  setDate(s, "1 January 1460");
  world(s).provinceHuntSince[province(s, p)] = month(s) - years * 12;
});
Then("{string} is greyed with {string} under it", (s, label: string, note: string) => {
  expect(T.takeInButton(s.card.row.takeInWhy)).toMatchObject({ label, enabled: false, note });
});
Then("{string} asks to confirm before it acts", (s, label: string) => {
  const b = T.leaveButton(s.card.name);
  expect(b.label).toBe(label);
  expect(b.confirm).toContain(s.card.name);
});

Given("the player plays {string} with {int} of {int} hunting grounds and one claim under way", (s, realm: string, held: number, size: number) => {
  play(s, realm);
  const w = world(s);
  expect(G.rangeOf(w, nation(s, realm))).toBe(size);
  keepGrounds(s, realm, held);
  setDate(s, "1 January 1456");
  // The oldest ground is ready to take in.
  w.provinceHuntSince[G.groundsOf(w, nation(s, realm)).at(-1)!] = T.monthNumber(1444, 11);
  const free = view(s).mine!.candidates.find((c) => c.why === null)!;
  expect(G.claimGround(w, nation(s, realm), free.province, s.news)).toBeNull();
});
When("the player opens the Hunting grounds tab of their realm card", (s) => {
  s.tab = view(s).mine;
});
When("the player opens the Hunting grounds tab", (s) => {
  s.tab = view(s).mine;
});
Then("it shows {string} with a bar and the claim under way with its end date", (s, head: string) => {
  const h = T.rangeHeader(s.tab.held, s.tab.size);
  expect(h.text).toBe(head);
  expect(h.bar).toBeCloseTo(s.tab.held / s.tab.size);
  expect(s.tab.claim.ends).toMatch(/^1 \w+ \d{4}$/);
});
Then("one row per ground with its people, years held and furs, a ground ready to take in first", (s) => {
  expect(s.tab.grounds.length).toBe(s.tab.held);
  expect(s.tab.grounds[0].takeInWhy).toBeNull();
  for (const r of s.tab.grounds) expect(T.groundRow(r)).toMatch(/people · held \d+ years? · furs /);
});
Then("the General tab shows {string}, opening this tab", (s, line: string) => {
  const g = T.generalLine(s.tab.held, s.tab.size, s.tab.fursPerMonth);
  expect(g.text).toBe(line);
  expect(g.opens).toBe(T.HUNT_TAB.id);
});
Given("the player plays {string} and {string} is founding a colony on its ground {string}", (s, realm: string, founder: string, p: string) => {
  play(s, realm);
  world(s).explore.colonies.push({ province: province(s, p), owner: nation(s, founder), governor: -1, progress: 10, aggression: "Hostile", food: 0, lastChange: 0 });
  s.founder = founder;
  s.site = p;
});
Then("the colony is listed first, in red, with {string}", (s, button: string) => {
  const first = s.tab.settlers[0];
  expect(first.province).toBe(province(s, s.site));
  expect(T.settlersRow(s.founder, s.site)).toMatchObject({ tone: "red", button });
});

When("the map is drawn at any zoom with the political or Charts lens", (s) => {
  s.lens = view(s).ground;
});
Then("{string} shows a light diagonal hatch in the colour of {string}", (s, p: string, realm: string) => {
  expect(s.lens[province(s, p)]).toBe(nation(s, realm));
  expect(T.HUNT_KEY).toMatchObject({ pattern: "light diagonal hatch", zooms: "every zoom" });
  expect(T.HUNT_KEY.lenses).toEqual(["political", "charts"]);
});
Then("in the Charts lens of a colonial player its coast is amber, not green", (s) => {
  expect(T.chartsCoast(s.lens[province(s, s.ground)] >= 0)).toBe("amber");
  expect(T.chartsCoast(false)).toBe("green");
});

Given("the player plays {string} with a fleet carrying a governor off {string}", (s, realm: string, p: string) => {
  play(s, realm);
  s.site = p;
});
When("the player opens the fleet card's Colony section", (s) => {
  const t = view(s).ground[province(s, s.site)]!;
  s.note = t >= 0 ? T.colonyNote(G.tribeName(world(s), t)) : null;
});
Then("it says {string}", (s, text: string) => expect(s.note).toBe(text));
Then("{string} stands beside {string}", (s, a: string, b: string) => {
  expect(T.COLONY_BUTTONS).toContain(a);
  expect(T.COLONY_BUTTONS).toContain(b);
});
Given("the player plays {string}", (s, realm: string) => play(s, realm));
When("{string} starts founding a colony on the Creek's ground {string}", (s, realm: string, p: string) => {
  G.colonyStarts(world(s), nation(s, realm), province(s, p), "Wary", s.news);
});
Then("a short alert over the map says {string} with {string}", (s, text: string, button: string) => {
  const n = (s.news as G.News[]).find((x) => x.kind === "tribe" && x.text === text)!;
  expect(n.province).toBeGreaterThanOrEqual(0);
  const a = T.settlersAlert("Castile", "Northeast Florida");
  expect(a.text).toBe(text);
  expect(a.buttons).toContain(button);
});
Then("the dispatches keep it", (s) => {
  expect((s.news as G.News[]).some((x) => x.kind === "tribe")).toBe(true);
  expect(T.settlersAlert("Castile", "Northeast Florida").kept).toBe(true);
});

Given(/^the game runs on a phone in the (Wide|Tall) layout$/, (s, layout: string) => {
  s.shape = layout === "Wide" ? "Short wide" : "Tall";
});
When("the player opens the Hunting grounds tab and a province card with claim buttons", (s) => {
  s.card = T.tribesCard(s.shape);
  s.buttons = [T.claimButton(null), T.claimButton("no free place"), T.takeInButton("held 6 of 10 years"), T.leaveButton("East Kentucky"), T.askButton(10, null)];
});
Then("every button is at least 44 points high and no reason is shown only on hover", (s) => {
  for (const b of s.buttons) expect(b.minHeight).toBeGreaterThanOrEqual(44);
  expect(s.buttons.filter((b: T.ButtonView) => !b.enabled).every((b: T.ButtonView) => !!b.note)).toBe(true);
  expect(s.card.hover).toBe(false);
});
Then("the tab's rows stack in one column with no sideways scrolling", (s) => {
  expect(s.card).toMatchObject({ columns: 1, sidewaysScroll: false });
});
