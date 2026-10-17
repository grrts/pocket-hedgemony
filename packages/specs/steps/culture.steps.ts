import { expect } from "vitest";
import { steps, type Scenario, type Table } from "../src/registry.ts";
import * as C from "@ph/engine/domain/culture";
import { REGIONS, type Ground } from "@ph/engine/domain/world-map";
import { formIdFromName } from "@ph/engine/domain/government";

const { Given, When, Then } = steps("culture");

// ---------------------------------------------------------------- helpers

/** Court tongues of the countries the features name, used when a scenario does not set one. */
const COURTS: Record<string, string> = {
  France: "French",
  Castile: "Castilian",
  England: "English",
  Ming: "Han",
  Austria: "High German",
  Piedmont: "Italian",
  Qing: "Manchu",
  Bolivia: "Castilian",
  Savoy: "French",
  Testland: "French",
};
/** Country ids as config lists them (chancery tradition). */
const IDS: Record<string, string> = { Ottomans: "ottoman" };
/** People of a province when a scenario does not say (Troyes: province stats, 72,000). */
const POPULATION: Record<string, number> = { Troyes: 72000 };
const POLICY: Record<string, C.TonguePolicy> = { "Let be": "let_be", Teach: "teach", Impose: "impose" };

function cc(s: Scenario, name: string): C.CountryCulture {
  s.cc ??= {};
  s.main ??= name;
  return (s.cc[name] ??= C.newCountryCulture(IDS[name] ?? name.toLowerCase(), COURTS[name] ?? "French"));
}
function prov(s: Scenario, name: string, people?: Record<string, number>, init: Partial<C.ProvinceTongues> = {}): C.ProvinceTongues {
  s.p ??= {};
  if (people) s.p[name] = C.newProvinceTongues(name, people, init);
  return (s.p[name] ??= C.newProvinceTongues(name, {}, init));
}
function owner(s: Scenario, province: string): C.CountryCulture {
  const o: string | undefined = s.owner?.[province];
  return cc(s, o ?? s.main ?? "France");
}
function mix(total: number, shares: [string, number][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [t, pct] of shares) out[t] = (total * pct) / 100;
  return out;
}
function act(s: Scenario): void {
  s.acted = true;
}
const tongueOfPeople: Record<string, string> = { Andalusi: "Andalusi Arabic", Galicians: "Galician" };

// ---------------------------------------------------------------- AI

Given("the AI country {string} has the personality {string}", (s, name: string, p: string) => {
  cc(s, name);
  s.personality = p;
});
Given(/^the AI country "([^"]+)" (has|does not have) printing$/, (s, name: string, has: string) => {
  s.printing = has === "has";
  if (s.printing) cc(s, name).inventions.push("printing");
});
When("it chooses its Tongue policy", (s) => {
  s.chosen = C.aiTonguePolicy(s.personality, !!s.printing);
});
Then("its Tongue policy is {string}", (s, policy: string) => {
  expect(s.chosen).toBe(POLICY[policy]);
});
Then(/^it uses (.+)$/, (s, lever: string) => {
  expect(C.aiLevers(s.personality)).toContain(lever);
});

// ---------------------------------------------------------------- officials

Given("the country {string} has the court tongue {string}", (s, name: string, t: string) => {
  cc(s, name).court = C.mustTongue(t).id;
});
Given(/^an official of the tongue "([^"]+)" serves in a province whose people are (\S+) \(\w+\)$/, (s, official: string, people: string) => {
  s.official = { tongue: official, people };
});
When("the years pass", () => {});
Then("the official reaches full effect after {int} years", (s, years: number) => {
  expect(C.officialYearsToFullEffect(cc(s, s.main), s.official.tongue, s.official.people)).toBe(years);
});
When(/^an official is hired in the province "([^"]+)", which is (\w+)$/, (s, name: string, t: string) => {
  s.officialTongue = C.officialTongue({ hiredIn: prov(s, name, { [t]: 100000 }) });
});
When(/^an official is graduated from a school teaching in (\w+)$/, (s, t: string) => {
  s.officialTongue = C.officialTongue({ school: t });
});
Then("the official has the tongue {string}", (s, t: string) => {
  expect(s.officialTongue).toBe(C.mustTongue(t).id);
});

// ---------------------------------------------------------------- order and war

Given(/^the province "([^"]+)" is the (\w+) homeland with nationalism ([\d.]+)$/, (s, name: string, t: string, n: string) => {
  prov(s, name, { [t]: 90000 }, { homelandOf: [C.mustTongue(t).id], nationalism: Number(n) });
  s.homeland = t;
});
When("a homeland rising starts in {string}", (s, name: string) => {
  s.rising = { province: name, demand: C.homelandRisingDemand(prov(s, name).nationalism) };
});
Then(/^it draws (\d+) % of everyone of the tongue "([^"]+)"$/, (s, pct: string) => {
  expect(C.homelandRisingDraw(1000) / 10).toBeCloseTo(Number(pct));
});
Then("its demand is {string}", (s, demand: string) => {
  expect(s.rising.demand).toBe(demand);
});
Given(/^a battle in rough ground in the (\w+) homeland$/, (s, t: string) => {
  s.homeland = t;
  s.ground = "hills";
});
When(/^defenders of the tongue "([^"]+)" fight, rebels or not$/, (s, t: string) => {
  // Rebels and soldiers alike: the rule reads only the defenders' tongue.
  s.bonus = [C.locals(s.ground, t, s.homeland), C.locals(s.ground, t, s.homeland)];
});
Then(/^they get \+(\d+) %$/, (s, pct: string) => {
  for (const b of s.bonus) expect(b * 100).toBeCloseTo(Number(pct));
});
Given("a garrison captain of the tongue {string} serves a ruler of the tongue {string}", (s, captain: string, ruler: string) => {
  s.captain = { captain, ruler };
});
Given(/^nationalism is ([\d.]+)$/, (s, n: string) => {
  s.nationalism = Number(n);
});
Then(/^the captain (can|cannot) be bribed$/, (s, can: string) => {
  expect(C.captainBribable(s.captain.ruler, s.captain.captain, s.nationalism ?? 0)).toBe(can === "can");
});
Given(/^the province "([^"]+)" is the homeland of "([^"]+)", (\w+) to its ruler, with nationalism ([\d.]+)$/, (s, name: string, t: string, rel: string, n: string) => {
  const p = prov(s, name, { [t]: 90000 }, { homelandOf: [C.mustTongue(t).id], nationalism: Number(n) });
  expect(C.relationTo(cc(s, "France").court, t)).toBe(rel);
  s.free = p;
});
Then(/^the war aim "Free a people" is (open|not open) against its ruler$/, (s, open: string) => {
  const p: C.ProvinceTongues = s.free;
  expect(C.freeAPeopleOpen(cc(s, "France").court, p.homelandOf[0]!, p.nationalism)).toBe(open === "open");
});
Given("the date is {int}", (s, year: number) => {
  s.year = year;
});
Given(/^the province "([^"]+)" is mostly (\w+) and held by "([^"]+)"$/, (s, name: string, t: string, holder: string) => {
  prov(s, name, { [t]: 90000 }, { homelandOf: [C.mustTongue(t).id], yearsHeld: 30 });
  (s.owner ??= {})[name] = holder;
  cc(s, holder);
});
When(/^the country "([^"]+)" takes "([^"]+)" with the war aim "Gather our kin"$/, (s, taker: string, name: string) => {
  const p = prov(s, name);
  const c = cc(s, taker);
  expect(C.gatherOurKinOffered(C.ageOfRevolutions(s.year), c, { province: p, holder: s.owner[name] })).toBe(true);
  s.owner[name] = taker;
  p.gatheredKin = true;
  p.yearsHeld = 0;
  act(s);
});
Then("the province {string} does not get the grievance {string}", (s, name: string, g: string) => {
  expect(C.updateGrievances(prov(s, name), owner(s, name))).not.toContain(g);
});
Then(/^the war aim "Gather our kin" is not offered$/, (s) => {
  expect(C.gatherOurKinOffered(C.ageOfRevolutions(s.year))).toBe(false);
});
Given("the age of revolutions has begun", (s) => {
  s.age = true;
});
Given(/^a province of "([^"]+)" is (kin|stranger|cousin) with nationalism ([\d.]+)$/, (s, _c: string, rel: C.Relation, n: string) => {
  s.levy = { rel, n: Number(n) };
});
Then(/^recruits refill there (25 % faster|at the usual rate|25 % slower)$/, (s, speed: string) => {
  const m = C.nationalLevy(s.levy.rel, s.levy.n, !!s.age);
  expect(m).toBeCloseTo(speed === "25 % faster" ? 1.25 : speed === "25 % slower" ? 0.75 : 1);
});

// ---------------------------------------------------------------- trade, research, diplomacy

Given(/^the province "([^"]+)" has a market: (yes|no)$/, (s, name: string, m: string) => {
  s.market = m === "yes";
  s.tp = name;
});
Given(/^the tongue "([^"]+)" is (\d+) % of the province$/, (s, t: string, pct: string) => {
  s.share = { t, v: Number(pct) / 100 };
});
Then(/^the province gets \+(\d+) % trade value and may hire one extra (\w+) trader$/, (s, pct: string, t: string) => {
  expect(s.share.t).toBe(t);
  const b = C.tradingPeopleBonus(s.share.t, s.share.v, s.market);
  expect(b?.tradeValue).toBeCloseTo(Number(pct) / 100);
  expect(b?.extraTraders).toBe(1);
});
Then("the province gets no trading-people bonus", (s) => {
  expect(C.tradingPeopleBonus(s.share.t, s.share.v, s.market)).toBeNull();
});
Given(/^the province "([^"]+)" has a (\w+) trading people bonus$/, (s, name: string, t: string) => {
  const p = prov(s, name, { Castilian: 95000, [t]: 5000 });
  s.markets = new Set([name, "the neighbour"]);
  prov(s, "the neighbour", { Castilian: 50000 });
  expect(C.tradingPeopleBonus(t, C.share(p, t), true)).not.toBeNull();
  s.tradingTongue = t;
});
When(/^the country "([^"]+)" expels the (\w+) people$/, (s, _c: string, t: string) => {
  const from = Object.keys(s.p).find((k) => k !== "the neighbour")!;
  s.expelled = C.expelTradingPeople(prov(s, from), prov(s, "the neighbour"), t);
  s.expelledFrom = from;
});
Then("{string} loses the bonus", (s, name: string) => {
  expect(C.tradingPeopleBonus(s.tradingTongue, C.share(prov(s, name), s.tradingTongue), true)).toBeNull();
});
Then(/^the (\w+) people go as refugees to a neighbour$/, (s, t: string) => {
  const r = prov(s, "the neighbour").refugees ?? [];
  expect(r.some((x) => x.tongue === C.mustTongue(t).id && x.people === s.expelled)).toBe(true);
});
Then("that neighbour gains the bonus where they settle", (s) => {
  const n = prov(s, "the neighbour");
  C.ageRefugees(n);
  C.ageRefugees(n);
  expect(C.tradingPeopleBonus(s.tradingTongue, C.share(n, s.tradingTongue), true)).not.toBeNull();
});
Given(/^the country "([^"]+)" researches an invention known by its neighbour "([^"]+)" \((\w+) family\) and its neighbour "([^"]+)"$/, (s, c: string, a: string, fam: string, b: string) => {
  s.research = { own: C.familyOf(cc(s, c).court), [a]: fam, [b]: "another" };
});
Then(/^"([^"]+)" counts double toward the 60 % cap on cheaper research$/, (s, n: string) => {
  expect(C.neighbourResearchWeight(s.research.own, s.research[n])).toBe(2);
});
Then(/^"([^"]+)" of another family counts once$/, (s, n: string) => {
  expect(C.neighbourResearchWeight(s.research.own, s.research[n])).toBe(1);
});
Given("a foreign scholar of the tongue {string} looks for a realm", (s, t: string) => {
  s.scholar = t;
});
Given(/^"([^"]+)" \((\w+)\) and "([^"]+)" \((\w+)\) both welcome scholars$/, (s, a: string, fa: string, b: string, fb: string) => {
  s.realms = [
    { name: b, family: fb },
    { name: a, family: fa },
  ];
});
Then("the scholar settles first in {string}", (s, name: string) => {
  expect(C.scholarRealmOrder<{ name: string; family: string }>(s.scholar, s.realms)[0]!.name).toBe(name);
});
Given(/^the ruler of "([^"]+)" has the court tongue "([^"]+)" and the ruler of "([^"]+)" has the court tongue "([^"]+)"$/, (s, _a: string, ta: string, _b: string, tb: string) => {
  s.pair = [ta, tb];
});
Then(/^relations between them start (\d+) steps warmer$/, (s, n: string) => {
  expect(C.warmthSteps(s.pair[0], s.pair[1])).toBe(Number(n));
});
Given("nationalism has spread", (s) => {
  s.nationalismSpread = true;
});
Given("the country {string} holds many people of the tongue {string}", (s, _c: string, t: string) => {
  s.holdsMany = C.mustTongue(t).id;
});
Then("{string} is a natural rival of {string}, whose court tongue is {string}", (s, _a: string, b: string, t: string) => {
  cc(s, b).court = C.mustTongue(t).id;
  expect(C.naturalRival(!!s.nationalismSpread, s.holdsMany === cc(s, b).court)).toBe(true);
});

// ---------------------------------------------------------------- history

Given(/^the event "([^"]+)" spreads the family "([^"]+)" into the Ethiopian highlands$/, (s, _e: string, fam: string) => {
  s.spread = { family: fam, region: "ethiopian_highlands", provinces: [prov(s, "highland 1"), prov(s, "highland 2")] };
});
When("the event applies its spread", (s) => {
  for (const p of s.spread.provinces as C.ProvinceTongues[]) C.spreadFamily(p, s.spread.family, 1000, s.spread.region);
});
Then("the tongue {string} rises in each province of the Ethiopian highlands", (s, t: string) => {
  for (const p of s.spread.provinces as C.ProvinceTongues[]) expect(p.people[C.mustTongue(t).id] ?? 0).toBeGreaterThan(0);
});
Given(/^the province "([^"]+)" has the latin tongues "([^"]+)" (\d+) % and "([^"]+)" (\d+) %$/, (s, name: string, a: string, pa: string, b: string, pb: string) => {
  prov(s, name, mix(100000, [[a, Number(pa)], [b, Number(pb)]]));
  s.before = { ...prov(s, name).people };
});
When("an event spreads the family {string} into {string}", (s, fam: string, name: string) => {
  s.before = Object.fromEntries(Object.keys(prov(s, name).people).map((t) => [t, C.share(prov(s, name), t)]));
  C.spreadFamily(prov(s, name), fam, 5000);
});
Then("the share of {string} rises in {string}", (s, t: string, name: string) => {
  expect(C.share(prov(s, name), t)).toBeGreaterThan(s.before[C.mustTongue(t).id]);
});
Given(/^"([^"]+)" has been under (\d+) % of the people of "([^"]+)" for (\d+) years$/, (s, t: string, pct: string, country: string, years: string) => {
  s.year ??= 1700;
  s.checks = C.newChecks();
  s.checks.courtSmallSince = s.year - Number(years);
  s.people = { ...(s.people ?? {}), [C.mustTongue(t).id]: Number(pct) / 2 };
  cc(s, country);
});
Given("{string} is over half of the people of {string}", (s, t: string) => {
  const rest = 100 - Object.values(s.people as Record<string, number>).reduce((a, b) => a + b, 0);
  s.people[C.mustTongue(t).id] = rest;
});
Given("the country {string} has the court tongue {string} at {int} % of its people", (s, name: string, t: string, pct: number) => {
  cc(s, name).court = C.mustTongue(t).id;
  s.people = { [C.mustTongue(t).id]: pct, occitan: 100 - pct };
  s.checks = C.newChecks();
  s.year ??= 1700;
});
When("the 5-yearly culture checks run", (s) => {
  if (s.abroad) {
    const a = s.abroad as { tongue: string; years: number; region: string; courtRegion: string; province: C.ProvinceTongues };
    const to = C.newTongueAbroad(a.tongue, a.years, a.region, a.courtRegion);
    if (to) C.splitTongue(C.mustTongue(a.tongue).id, to, [a.province]);
    return;
  }
  if (s.mergeCase) {
    s.merged = C.mergeWithoutEvent(cc(s, s.main), s.mergeCase.years, Object.values(s.p as Record<string, C.ProvinceTongues>));
    return;
  }
  s.raised = C.checkCourtGoesNative(cc(s, s.main), s.checks, s.people, s.year);
});
Then(/^the event "The court goes native" is raised for "([^"]+)" with the choices "([^"]+)" and "([^"]+)"$/, (s, name: string, a: string, b: string) => {
  expect(s.raised?.country).toBe(cc(s, name).id);
  expect(s.raised?.choices).toEqual([a, b]);
});
Then(/^the event "The court goes native" is not raised for "([^"]+)"$/, (s) => {
  expect(s.raised).toBeNull();
});
function raiseNative(s: Scenario, name: string, majority: string, year: number): void {
  const c = cc(s, name);
  c.court = C.mustTongue(COURTS[name] ?? c.court).id;
  s.checks = C.newChecks();
  s.lords = [
    { name: "a Manchu banner lord", tongue: c.court },
    { name: "a Han lord", tongue: majority },
  ];
  s.raised = { country: c.id, majority: C.mustTongue(majority).id, choices: ["Take their tongue", "Keep ours"], year } satisfies C.CourtGoesNative;
  s.courtBefore = c.court;
}
Given(/^the event "The court goes native" is raised for "([^"]+)" with the majority tongue "([^"]+)"$/, (s, name: string, t: string) => {
  raiseNative(s, name, t, 1700);
});
Given(/^the event "The court goes native" is raised for "([^"]+)" in (\d+)$/, (s, name: string, year: string) => {
  raiseNative(s, name, "Han", Number(year));
});
When(/^"([^"]+)" chooses "(Take their tongue|Keep ours)"$/, (s, name: string, choice: "Take their tongue" | "Keep ours") => {
  s.answer = C.answerCourtGoesNative(cc(s, name), s.checks, s.raised, choice, s.lords);
  act(s);
});
Then(/^the court tongue of "([^"]+)" is "([^"]+)"$/, (s, name: string, t: string) => {
  expect(cc(s, name).court).toBe(C.mustTongue(t).id);
});
Then("lords of the tongue {string} waver a step", (s, t: string) => {
  const of = (s.lords as { name: string; tongue: string }[]).filter((l) => l.tongue === C.mustTongue(t).id).map((l) => l.name);
  expect(s.answer.wavering).toEqual(of);
});
Then(/^the "([^"]+)" people become strangers to "([^"]+)"$/, (s, t: string, name: string) => {
  expect(C.relationTo(cc(s, name).court, t)).toBe("stranger");
});
Then("nothing changes", (s) => {
  expect(cc(s, s.main).court).toBe(s.courtBefore);
  expect(s.answer.changed).toBeNull();
});
Then("the check for {string} runs again in {int}", (s, _n: string, year: number) => {
  expect(s.checks.nextCheck).toBe(year);
});
Given(/^the province "([^"]+)" is the homeland of "([^"]+)" with nationalism ([\d.]+)$/, (s, name: string, t: string, n: string) => {
  prov(s, name, { [t]: 90000 }, { homelandOf: [C.mustTongue(t).id], nationalism: Number(n), yearsHeld: 50, governor: { kind: "official" } });
});
Then(/^the "([^"]+)" people of "([^"]+)" count as strangers to "([^"]+)"$/, (s, t: string, name: string, country: string) => {
  expect(C.relationTo(cc(s, country).court, t, prov(s, name).nationalism)).toBe("stranger");
});
Then(/^"([^"]+)" has the grievance "Foreign rule" if held by "([^"]+)"$/, (s, name: string, country: string) => {
  expect(C.hasForeignRule(prov(s, name), cc(s, country))).toBe(true);
});
Then(/^drift toward "([^"]+)" in "([^"]+)" is multiplied by ([\d.]+)$/, (s, t: string, name: string, m: string) => {
  const p = prov(s, name);
  const ms = C.driftMultipliers({ pull: t, drifting: C.majorityTongue(p), nationalism: p.nationalism });
  expect(ms.find((x) => x.name === "nationalism")?.value).toBeCloseTo(Number(m));
});
Then(/^the war aim "Free a people" opens for "([^"]+)"$/, (s, name: string) => {
  const p = prov(s, name);
  expect(C.freeAPeopleOpen(cc(s, s.main).court, p.homelandOf[0]!, p.nationalism)).toBe(true);
});
When("the event {string} runs merge_tongues", (s, ev: string) => {
  const m = C.mergeEventTongues(ev)!;
  const p = prov(s, "a province", Object.fromEntries(m.ids.map((t) => [t, 1000])));
  s.mergeIds = m.ids;
  C.mergeTongues(m.ids, m.into, [p]);
});
Then(/^the tongues (.+) merge into "([^"]+)"$/, (s, list: string, into: string) => {
  const named = [...list.matchAll(/"([^"]+)"/g)].map((x) => C.mustTongue(x[1]!).id);
  expect([...s.mergeIds].sort()).toEqual(named.sort());
  expect(prov(s, "a province").people).toEqual({ [C.mustTongue(into).id]: 1000 * named.length });
});
When(/^an event applies "([^"]+)" with (.+)$/, (s, verb: string, params: string) => {
  if (verb === "tongue_spread") {
    const m = params.match(/^id (\w+), where (\w+) and an amount$/)!;
    const p = prov(s, m[2]!, { Nahua: 90000, Castilian: 10000 });
    s.before = p.people[C.mustTongue(m[1]!).id];
    C.tongueSpread(p, m[1]!, 5000);
  } else if (verb === "set_court_tongue") {
    const m = params.match(/^on (\w+), id (\w+)$/)!;
    C.setCourtTongue(cc(s, m[1]!), m[2]!);
  } else if (verb === "merge_tongues") {
    const m = params.match(/^ids (\w+) and (\w+), into (\w+), where (\w+)$/)!;
    const p = prov(s, m[4]!, { [m[1]!]: 1000, [m[2]!]: 2000 });
    C.mergeTongues([m[1]!, m[2]!], m[3]!, [p]);
  } else if (verb === "move_people") {
    const m = params.match(/^tongue (\w+), from (\w+), to (\w+) and an amount$/)!;
    prov(s, m[2]!, { [m[1]!]: 5000, English: 1000 });
    prov(s, m[3]!, { English: 1000 });
    s.moved = C.movePeople(m[1]!, prov(s, m[2]!), prov(s, m[3]!), 2000);
  } else throw new Error(verb);
  act(s);
});
Then(/^the tongue "([^"]+)" rises in (\w+)$/, (s, t: string, name: string) => {
  expect(prov(s, name).people[C.mustTongue(t).id]).toBeGreaterThan(s.before);
});
Then(/^the two tongues become "([^"]+)" in (\w+)$/, (s, t: string, name: string) => {
  expect(prov(s, name).people).toEqual({ [C.mustTongue(t).id]: 3000 });
});
Then(/^(\w+) people leave (\w+) as refugees and settle in (\w+)$/, (s, t: string, from: string, to: string) => {
  const id = C.mustTongue(t).id;
  expect(prov(s, from).people[id]).toBe(3000);
  const dest = prov(s, to);
  expect(dest.refugees?.[0]).toEqual({ tongue: id, people: 2000, years: 0 });
  C.ageRefugees(dest);
  C.ageRefugees(dest);
  expect(dest.people[id]).toBe(2000);
});
Given(/^the province "([^"]+)" is (\d+) % (\w+)$/, (s, name: string, pct: string, t: string) => {
  prov(s, name, mix(100000, [[t, Number(pct)], ["French", 100 - Number(pct)]]));
});
Then(/^the trigger (.+) is true$/, (s, trig: string) => {
  let m: RegExpMatchArray | null;
  if ((m = trig.match(/^court_tongue of (\w+) is (\w+)$/))) expect(C.triggers.court_tongue(cc(s, m[1]!), m[2]!)).toBe(true);
  else if ((m = trig.match(/^tongue_share of (\w+) in (\w+) is ([\d.]+)$/))) expect(C.triggers.tongue_share(prov(s, m[2]!), m[1]!)).toBeCloseTo(Number(m[3]));
  else if ((m = trig.match(/^(kin_of|cousin_of|stranger_to) (\w+) for (\w+)$/))) expect(C.triggers[m[1] as "kin_of"](cc(s, m[2]!), m[3]!)).toBe(true);
  else throw new Error(trig);
});

// ---------------------------------------------------------------- drift

Given("the country {string} has the court tongue {string} and the Tongue policy {string}", (s, name: string, t: string, policy: string) => {
  const c = cc(s, name);
  c.court = C.mustTongue(t).id;
  c.policy = POLICY[policy]!;
});
Given(/^the province "([^"]+)" is (\d+) % (\w+) and (\d+) % (\w+)$/, (s, name: string, pa: string, a: string, pb: string, b: string) => {
  prov(s, name, mix(POPULATION[name] ?? 100000, [[a, Number(pa)], [b, Number(pb)]]));
});
Given(/^the province "([^"]+)" has been held by "([^"]+)" for (\d+) years and is governed by a royal official$/, (s, name: string, country: string, years: string) => {
  const p = prov(s, name);
  p.yearsHeld = Number(years);
  p.governor = { kind: "official" };
  (s.owner ??= {})[name] = country;
});
Given("the province {string} has a school teaching in {string}", (s, name: string, t: string) => {
  prov(s, name).schools.push(C.schoolTongue(t) ?? t);
});
function yearEnds(s: Scenario): void {
  s.before = {};
  s.drift = {};
  for (const [name, p] of Object.entries((s.p ?? {}) as Record<string, C.ProvinceTongues>)) {
    s.before[name] = { ...p.people };
    s.drift[name] = C.driftYear(p, owner(s, name));
  }
  act(s);
}
When("a year ends", (s) => yearEnds(s));
Then("the pull tongue of {string} is {string}", (s, name: string, t: string) => {
  expect(s.drift[name].pull).toBe(C.mustTongue(t).id);
});
function moved(s: Scenario, t: string, name: string): { share: number; n: number } {
  const id = C.mustTongue(t).id;
  const n = s.drift[name].moved[id] ?? 0;
  return { share: n / s.before[name][id], n };
}
Then(/^([\d.]+) % of the (\w+) people of "([^"]+)" become (\w+), about (\d+) people$/, (s, pct: string, t: string, name: string, to: string, about: string) => {
  expect(s.drift[name].pull).toBe(C.mustTongue(to).id);
  const m = moved(s, t, name);
  expect(m.share * 100).toBeCloseTo(Number(pct), 6);
  expect(Math.round(m.n)).toBe(Number(about));
});
Then(/^([\d.]+) % of the (\w+) people of "([^"]+)" become (\w+)$/, (s, pct: string, t: string, name: string, to: string) => {
  expect(s.drift[name].pull).toBe(C.mustTongue(to).id);
  expect(moved(s, t, name).share * 100).toBeCloseTo(Number(pct), 6);
});
Then(/^no (\w+) people of "([^"]+)" move$/, (s, t: string, name: string) => {
  expect(s.drift[name].moved[C.mustTongue(t).id]).toBeUndefined();
  expect(prov(s, name).people[C.mustTongue(t).id]).toBeGreaterThanOrEqual(s.before[name][C.mustTongue(t).id]);
});
function troyes(s: Scenario): void {
  const c = cc(s, "France");
  c.court = "french";
  c.policy = "teach";
  prov(s, "Troyes", mix(72000, [["French", 94], ["Flemish", 6]]), { yearsHeld: 200, governor: { kind: "official" }, schools: ["french"] });
}
Given("the province {string} is set up as in the Troyes example", (s) => troyes(s));
Given("a Schoolmaster official serves in {string}", (s, name: string) => {
  prov(s, name).schoolmaster = true;
});
Given(/^the province "([^"]+)" is mostly (\w+)$/, (s, name: string, t: string) => {
  const other = C.mustTongue(t).id === "french" ? "Breton" : "French";
  prov(s, name, { [t]: 90000, [other]: 10000 });
});
Given("the province {string} has been held {int} years", (s, name: string, years: number) => {
  prov(s, name).yearsHeld = years;
});
Given(/^the province "([^"]+)" is governed by (?:a royal official|a lord of the tongue (\w+))$/, (s, name: string, lord?: string) => {
  prov(s, name).governor = lord ? { kind: "lord", tongue: C.mustTongue(lord).id } : { kind: "official" };
});
const DRIFTERS: Record<string, Partial<C.DriftCase> & { drifting: string }> = {
  "Flemish farmers with no other condition, under Teach": { drifting: "Flemish", policy: "teach" },
  "Flemish craftsmen in the town": { drifting: "Flemish", townClass: true },
  "Occitan farmers (cousins)": { drifting: "Occitan" },
  "Flemish farmers, under Let be": { drifting: "Flemish", policy: "let_be" },
  "Flemish farmers, under Impose": { drifting: "Flemish", policy: "impose" },
  "Breton farmers in the Breton homeland": { drifting: "Breton", homeland: true },
  "farmers of a herding tongue on the steppe": { drifting: "Fulbe", ground: "grassland" },
  "Jewish farmers (a trading people)": { drifting: "Jewish" },
  "Breton farmers where Breton nationalism is 0.3": { drifting: "Breton", nationalism: 0.3 },
  "Flemish farmers, the country has printing and railways": { drifting: "Flemish", inventions: ["printing", "railways"] },
};
Given("a province whose pull tongue is {string}", (s, t: string) => {
  s.pull = t;
});
Given(/^the drifting people are (.+)$/, (s, who: string) => {
  const d = DRIFTERS[who];
  if (!d) throw new Error(who);
  // The pull tongue is the court's here; the realm policy is Teach unless the row says.
  s.case = { pull: s.pull, towardCourt: true, policy: "teach", ...d } satisfies C.DriftCase;
});
Then(/^their drift rate is the base 0\.5 % times ([\d.]+)$/, (s, m: string) => {
  expect(C.driftRate(s.case) / C.cultureConfig.drift.base_rate_per_year).toBeCloseTo(Number(m), 6);
});
Given(/^the province "([^"]+)" has an "Own tongue" charter for "([^"]+)"$/, (s, name: string, t: string) => {
  prov(s, name, { [t]: 90000, French: 10000 }, { ownTongueCharter: C.mustTongue(t).id });
});
Given(/^the pull tongue of "([^"]+)" would be "([^"]+)"$/, (s, name: string, t: string) => {
  const p = prov(s, name);
  p.yearsHeld = 50;
  p.governor = { kind: "official" };
  expect(C.pullTongue(p, owner(s, name))).toBe(C.mustTongue(t).id);
});
Then(/^no (\w+) people of "([^"]+)" become (\w+)$/, (s, t: string, name: string, to: string) => {
  expect(s.drift[name].pull).toBe(C.mustTongue(to).id);
  expect(s.drift[name].moved[C.mustTongue(t).id] ?? 0).toBe(0);
});
Given("the province {string} has been held {int} years and its majority tongue is {string}", (s, name: string, years: number, t: string) => {
  prov(s, name, { [t]: 90000 }, { yearsHeld: years });
  (s.owner ??= {})[name] = "England";
});
Given("the province {string} has a {string} minority", (s, name: string, t: string) => {
  prov(s, name).people[C.mustTongue(t).id] = 10000;
});
Then(/^part of the (\w+) people of "([^"]+)" become (\w+)$/, (s, t: string, name: string, to: string) => {
  expect(s.drift[name].pull).toBe(C.mustTongue(to).id);
  const m = moved(s, t, name);
  expect(m.n).toBeGreaterThan(0);
  expect(m.share).toBeLessThan(1);
});
Given(/^the province "([^"]+)" has ([\d.]+) % (\w+) people after drift$/, (s, name: string, pct: string, t: string) => {
  prov(s, name, mix(72000, [[t, Number(pct)], ["French", 100 - Number(pct)]]));
});
When("the year's drift is finished", (s) => {
  for (const p of Object.values(s.p as Record<string, C.ProvinceTongues>)) C.dropSmallTongues(p);
});
Then("the tongue {string} is no longer in {string}", (s, t: string, name: string) => {
  expect(prov(s, name).people[C.mustTongue(t).id]).toBeUndefined();
});
When(/^(settlers from Castile|Andalusi refugees|homeless Galicians drifting next door|soldiers coming home to Galicia) arrive in the province "([^"]+)"$/, (s, who: string, name: string) => {
  const c = cc(s, "Castile");
  s.dest = name;
  if (who.startsWith("settlers")) {
    prov(s, name, { Castilian: 50000 });
    s.ok = C.arrive(prov(s, name), "settlers", c.court, 1000, { ownProvince: true, freeTiles: true });
  } else if (who.startsWith("Andalusi")) {
    prov(s, name, {});
    s.ok = C.arrive(prov(s, name), "refugees", tongueOfPeople["Andalusi"]!, 1000);
  } else if (who.startsWith("homeless")) {
    prov(s, name, { Castilian: 50000 });
    s.ok = C.arrive(prov(s, name), "homeless", tongueOfPeople["Galicians"]!, 1000);
  } else {
    prov(s, name, { Galician: 50000 });
    s.ok = C.arrive(prov(s, name), "soldiers", "Galician", 1000);
  }
  act(s);
});
Then(/^they add (\w+) people to (\w+), an own province with free tiles$/, (s, t: string, name: string) => {
  expect(s.ok).toBe(true);
  expect(prov(s, name).people[C.mustTongue(t).id]).toBe(51000);
  expect(C.arrive(prov(s, name), "settlers", t, 1, { ownProvince: true, freeTiles: false })).toBe(false);
});
Then(/^they count in the Tongue mix of (\w+) after (\d+) years$/, (s, name: string, years: string) => {
  const p = prov(s, name);
  for (let y = 1; y <= Number(years); y++) {
    expect(p.people["andalusi_arabic"]).toBeUndefined();
    C.ageRefugees(p);
  }
  expect(p.people["andalusi_arabic"]).toBe(1000);
});
Then(/^they add (\w+) people to (\w+)$/, (s, t: string, name: string) => {
  expect(prov(s, name).people[C.mustTongue(t).id]).toBe(1000);
});
Then(/^they rejoin the (\w+) tongue$/, (s, t: string) => {
  expect(prov(s, s.dest).people[C.mustTongue(t).id]).toBe(51000);
});

// ---------------------------------------------------------------- Tongue policy and charters

Given("the country {string} has the Tongue policy {string}", (s, name: string, policy: string) => {
  cc(s, name).policy = POLICY[policy]!;
});
Then(/^drift toward the court tongue in "([^"]+)" is multiplied by ([\d.]+)$/, (s, where: string, m: string) => {
  const isCountry = s.cc?.[where] !== undefined;
  const c = isCountry ? cc(s, where) : cc(s, s.main);
  expect(C.policyDriftMultiplier(C.policyIn(c, isCountry ? undefined : where))).toBeCloseTo(Number(m));
});
Given("a new campaign starts", (s) => {
  cc(s, "France");
});
Then("the Tongue policy of {string} is {string}", (s, name: string, policy: string) => {
  expect(cc(s, name).policy).toBe(POLICY[policy]);
});
When("the player sets the Tongue policy of the province {string} to {string}", (s, name: string, policy: string) => {
  expect(C.setTonguePolicy(cc(s, s.main), POLICY[policy]!, name)).toBe(true);
});
Then("the realm-wide Tongue policy of {string} is still {string}", (s, name: string, policy: string) => {
  expect(cc(s, name).policy).toBe(POLICY[policy]);
});
When("upkeep is paid", (s) => {
  s.upkeep = C.schoolUpkeepMultiplier(cc(s, s.main), prov(s, Object.keys(s.p)[0]!).schools[0]!);
});
Then("the school in {string} costs {int} % more upkeep", (s, _n: string, pct: number) => {
  expect((s.upkeep - 1) * 100).toBeCloseTo(pct);
});
Given(/^the province "([^"]+)" is mostly (.+?) \((cousins|strangers)\)$/, (s, name: string, t: string) => {
  prov(s, name, { [t]: 90000, [cc(s, s.main ?? "France").court]: 10000 });
});
When("nationalism in {string} reaches {float}", (s, name: string, n: number) => {
  prov(s, name).nationalism = n;
  act(s);
});
Given(/^the country "([^"]+)" (has|does not have) the invention "Printing"$/, (s, name: string, has: string) => {
  if (has === "has") cc(s, name).inventions.push("printing");
});
When("the country {string} sets the Tongue policy {string}", (s, name: string, policy: string) => {
  s.set = C.setTonguePolicy(cc(s, name), POLICY[policy]!);
  act(s);
});
Then(/^the policy is (set|refused)$/, (s, r: string) => {
  expect(s.set).toBe(r === "set");
});
Given(/^the province "([^"]+)" (has|does not have) the grievance "([^"]+)"$/, (s, name: string, has: string, g: string) => {
  if (!s.acted && has === "has" && !s.p?.[name]) {
    // Granada under Castile's *Impose*: most people are strangers.
    const c = cc(s, "Castile");
    c.policy = "impose";
    prov(s, name, { "Andalusi Arabic": 90000, Castilian: 10000 }, { homelandOf: ["andalusi_arabic"] });
  }
  const p = prov(s, name);
  C.updateGrievances(p, owner(s, name));
  if (has === "has") expect(p.grievances).toContain(g);
  else expect(p.grievances).not.toContain(g);
});
When(/^the Tongue policy becomes "([^"]+)"$/, (s, policy: string) => {
  expect(C.setTonguePolicy(cc(s, s.main), POLICY[policy]!)).toBe(true);
  act(s);
});
When(/^an "Own tongue" charter is granted in "([^"]+)"$/, (s, name: string) => {
  C.grantOwnTongue(prov(s, name), owner(s, name));
  act(s);
});
When(/^the majority of "([^"]+)" becomes kin$/, (s, name: string) => {
  const p = prov(s, name);
  p.people[owner(s, name).court] = 2 * C.totalPeople(p);
  act(s);
});
Given(/^the province "([^"]+)" is mostly (\w+) with the grievances "([^"]+)" and "([^"]+)"$/, (s, name: string, t: string, a: string, b: string) => {
  const c = cc(s, s.main ?? "France");
  c.policy = "impose";
  const p = prov(s, name, { [t]: 90000, [c.court]: 10000 }, { homelandOf: [C.mustTongue(t).id], yearsHeld: 100, governor: { kind: "official" } });
  C.updateGrievances(p, c);
  expect(p.grievances).toEqual(expect.arrayContaining([a, b]));
});
When(/^the lords of "([^"]+)" demand an "Own tongue" charter and it is granted$/, (s, name: string) => {
  expect(C.charterBroughtBy()).toContain("its lords");
  C.grantOwnTongue(prov(s, name), owner(s, name));
  act(s);
});
Then("the province {string} has neither {string} nor {string}", (s, name: string, a: string, b: string) => {
  const g = C.updateGrievances(prov(s, name), owner(s, name));
  expect(g).not.toContain(a);
  expect(g).not.toContain(b);
});
Then("drift toward {string} stops in {string}", (s, t: string, name: string) => {
  const p = prov(s, name);
  const local = C.majorityTongue(p);
  const r = C.driftYear(p, owner(s, name));
  expect(r.pull).toBe(C.mustTongue(t).id);
  expect(r.moved[local]).toBe(0);
});
Then("officials in {string} must be of the tongue {string}", (s, name: string, t: string) => {
  expect(C.officialTongueRequired(prov(s, name))).toBe(C.mustTongue(t).id);
});
const BRINGERS: Record<string, string> = {
  "the ruler grants it": "the ruler",
  "its lords demand it": "its lords",
  "its towns demand it": "its towns",
  "a homeland rising demands it": "a homeland rising",
};
When(/^(the ruler grants it|its lords demand it|its towns demand it|a homeland rising demands it) in the province "([^"]+)"$/, (s, who: string, name: string) => {
  s.bringer = BRINGERS[who];
  prov(s, name, { Basque: 90000, French: 10000 });
});
Then(/^an "Own tongue" charter can be granted in "([^"]+)"$/, (s, name: string) => {
  expect(C.charterBroughtBy()).toContain(s.bringer);
  C.grantOwnTongue(prov(s, name), owner(s, name));
  expect(prov(s, name).ownTongueCharter).toBe("basque");
});
Given(/^the province "([^"]+)" has an "Own tongue" charter$/, (s, name: string) => {
  prov(s, name, { Basque: 90000, French: 10000 }, { ownTongueCharter: "basque", homelandOf: ["basque"] });
});
When("the country {string} revokes it", (s, name: string) => {
  const p = Object.values(s.p as Record<string, C.ProvinceTongues>).find((p) => p.ownTongueCharter !== null)!;
  C.revokeOwnTongue(p, cc(s, name));
  act(s);
});
Given(/^the province "([^"]+)" is the (\w+) homeland held by "([^"]+)"$/, (s, name: string, t: string, holder: string) => {
  prov(s, name, { [t]: 90000, French: 10000 }, { homelandOf: [C.mustTongue(t).id] });
  (s.owner ??= {})[name] = holder;
  cc(s, holder);
});
When(/^the duke of \w+, of the tongue "([^"]+)", holds "([^"]+)" as a lord of "([^"]+)"$/, (s, t: string, name: string) => {
  prov(s, name).governor = { kind: "lord", tongue: C.mustTongue(t).id };
  act(s);
});
Given("the house {string} is of the tongue {string}", (s, house: string, t: string) => {
  s.house = { house, tongue: t };
});
When("the ruler of {string} marries into the house {string}", (s, name: string, house: string) => {
  cc(s, name).marriedHouses.push(house);
});
Then("the lords of the house {string} count as kin for loyalty", (s, house: string) => {
  expect(C.lordCountsAsKin(cc(s, s.main), { tongue: s.house.tongue, house })).toBe(true);
  expect(C.lordCountsAsKin(cc(s, s.main), { tongue: s.house.tongue, house: "another house" })).toBe(false);
});

// ---------------------------------------------------------------- tongues and relations

Given("the tongue {string} is in config", (s, t: string) => {
  expect(C.tongue(t)).toBeDefined();
});
Then("the tongue {string} belongs to the family {string}", (s, t: string, f: string) => {
  expect(C.familyOf(t)).toBe(f);
  expect(C.families()).toContain(f);
});
Given("the catalogue culture string {string}", (s, str: string) => {
  (s.strings ??= []).push(str);
});
Given("the catalogue culture string {string} matches no tongue", (s, str: string) => {
  (s.strings ??= []).push(str);
});
When("the catalogue strings are mapped to tongues", (s) => {
  s.mapped = C.mapCatalogueStrings(s.strings ?? []);
});
Then("the string maps to the tongue {string}", (s, t: string) => {
  expect(s.mapped.tongueOf[s.strings[0]]).toBe(C.mustTongue(t).id);
});
Then("the tooltip shows the local name {string}", (s, name: string) => {
  expect(s.mapped.localName[s.strings[0]]).toBe(name);
});
Then("the string {string} is on the review list", (s, str: string) => {
  expect(s.mapped.review).toContain(str);
});
Then("the tongues {string} and {string} are different tongues", (s, a: string, b: string) => {
  expect(C.mustTongue(a).id).not.toBe(C.mustTongue(b).id);
});
When("the player opens the country card of {string}", (s, name: string) => {
  s.card = C.countryCardCulture(cc(s, name), s.realmPeople ?? {});
});
Then("there is no culture meter, no cultural power and no list of accepted cultures", (s) => {
  expect(Object.keys(s.card).sort()).toEqual(["percent", "tongue"]);
});
When(/^a dynasty of the tongue "([^"]+)" takes the throne of "([^"]+)" by (conquest|inheritance|marriage|a lord's revolt)$/, (s, t: string, name: string) => {
  s.changed = C.setCourtTongue(cc(s, name), t);
});
Then(/^people of the tongue "([^"]+)" are (\w+) to "([^"]+)"$/, (s, t: string, rel: string, name: string) => {
  s.lastRel = C.relationTo(cc(s, name).court, t);
  expect(s.lastRel).toBe(rel);
});
Then("the music palette of {string} changes from the next track", (s, name: string) => {
  expect(s.changed?.country).toBe(cc(s, name).id);
  expect(s.changed?.musicPaletteFromNextTrack).toBe(true);
});
Then(/^they count ([\d.]+) toward the Tongue % of "([^"]+)"$/, (s, w: string) => {
  expect(C.tongueShareWeight(s.lastRel)).toBeCloseTo(Number(w));
});
Given(/^the realm of "([^"]+)" holds (.*million.*) people$/, (s, name: string, list: string) => {
  cc(s, name);
  s.realmPeople = {};
  for (const m of list.matchAll(/([\d.]+) million (\w+)/g)) s.realmPeople[C.mustTongue(m[2]!).id] = Number(m[1]) * 1e6;
});
Then("the Tongue % of {string} is {int}", (s, _n: string, pct: number) => {
  expect(s.card.percent).toBe(pct);
});
When("grievances are worked out", (s) => {
  for (const [name, p] of Object.entries(s.p as Record<string, C.ProvinceTongues>)) C.updateGrievances(p, owner(s, name));
  act(s);
});

// ---------------------------------------------------------------- what the player sees

When("the player looks at the province card of {string}", (s, name: string) => {
  s.line = C.tongueLine(prov(s, name), owner(s, name));
  s.looking = name;
});
Then("it shows {string}", (s, text: string) => {
  expect(s.line.text).toBe(text);
});
Then(/^"([^"]+)" has a (\w+) dot and "([^"]+)" a (\w+) dot$/, (s, a: string, ca: string, b: string, cb: string) => {
  expect(s.line.dots[a]).toBe(ca);
  expect(s.line.dots[b]).toBe(cb);
});
When("the player taps the Tongue line", (s) => {
  s.explain = C.driftExplanation(prov(s, s.looking), owner(s, s.looking));
});
Then(/^it shows this year's drift, that it pulls toward "([^"]+)", and why$/, (s, t: string) => {
  expect(s.explain.pull).toBe(C.mustTongue(t).id);
  expect(s.explain.why.length).toBeGreaterThan(0);
  expect(s.explain.groups.length).toBeGreaterThan(0);
  for (const g of s.explain.groups) expect(g.rate).toBeGreaterThan(0);
});
When("a tongue of the realm is shown on the province card", () => {});
Then(/^a tongue that is (kin|cousin|stranger|trading people) shows a (\w+) dot$/, (s, rel: string, colour: string) => {
  expect(C.dotColour(rel === "trading people" ? "trading" : (rel as C.Relation))).toBe(colour);
});
/** The realm of France as the design's Peoples screen shows it (culture §7.2). */
const FRANCE_PEOPLES: C.PeoplesRowInput[] = [
  { tongue: "French", people: 6.9e6, provinces: 38, homeland: false, grievances: [], lords: 0, charter: false, driftingTo: null, tradeBonusIn: [] },
  { tongue: "Occitan", people: 1.6e6, provinces: 9, homeland: true, grievances: ["Hunger", "Tax"], lords: 0, charter: false, driftingTo: "French", tradeBonusIn: [] },
  { tongue: "Breton", people: 0.5e6, provinces: 3, homeland: true, grievances: ["Foreign rule"], lords: 1, charter: false, driftingTo: null, tradeBonusIn: [] },
  { tongue: "Flemish", people: 0.4e6, provinces: 4, homeland: true, grievances: ["Foreign rule"], lords: 0, charter: false, driftingTo: null, tradeBonusIn: [] },
  { tongue: "Basque", people: 0.1e6, provinces: 1, homeland: true, grievances: [], lords: 0, charter: true, driftingTo: null, tradeBonusIn: [] },
  { tongue: "Jewish", people: 0.02e6, provinces: 6, homeland: false, grievances: [], lords: 0, charter: false, driftingTo: null, tradeBonusIn: ["Paris", "Lyon"] },
];
Given(/^the realm of "([^"]+)" holds ((?:(?!million).)*) people$/, (s, name: string, list: string) => {
  cc(s, name);
  const named = list.split(/, | and /).map((t) => C.mustTongue(t).name);
  s.peoples = FRANCE_PEOPLES.filter((r) => named.includes(r.tongue));
  expect(s.peoples.length).toBe(named.length);
});
When("the player taps the Tongue line of the country card of {string}", (s, name: string) => {
  s.screen = C.peoplesScreen(cc(s, name), s.peoples);
});
Then("the Peoples screen opens with the Tongue policy {string}", (s, policy: string) => {
  expect(s.screen.policy).toBe(POLICY[policy]);
});
Then("it lists, largest first:", (s, table: Table) => {
  const [head, ...rows] = table;
  const got = (s.screen.rows as C.PeoplesRow[]).map((r) => head!.map((h) => String(r[h as keyof C.PeoplesRow] ?? "")));
  expect(got).toEqual(rows);
});
Given(/^the realm of "([^"]+)" holds (\d+) tongues in (\d+) families$/, (s, _n: string, t: string, f: string) => {
  s.rows = Array.from({ length: Number(t) }, (_, i) => ({ tongue: `tongue ${i + 1}`, family: `family ${(i % Number(f)) + 1}` }));
  s.families = Number(f);
});
When("the player opens the Peoples screen", (s) => {
  s.groups = C.foldByFamily(s.rows);
});
Then("the tongues are grouped by family, folded shut", (s) => {
  expect(s.groups.length).toBe(s.families);
  expect(s.groups.every((g: { folded: boolean }) => g.folded)).toBe(true);
  expect(s.groups.reduce((n: number, g: { rows: unknown[] }) => n + g.rows.length, 0)).toBe(s.rows.length);
});
Given("the Peoples screen of {string} is open", (s, name: string) => {
  cc(s, name);
  s.realmProvinces = [prov(s, "Rennes", { Breton: 90000, French: 10000 }), prov(s, "Brest", { Breton: 80000 }), prov(s, "Paris", { French: 200000 })];
  s.realm = { lords: [{ name: "the Duke of Rohan", tongue: "Breton" }, { name: "the Duke of Guise", tongue: "French" }], officials: [{ name: "the bailiff of Rennes", tongue: "Breton" }], risings: [] };
});
When("the player taps the row {string}", (s, t: string) => {
  s.lit = C.peoplesRowTap(t, s.realmProvinces);
});
Then(/^the (\w+) provinces light up on the map$/, (s, t: string) => {
  expect(s.lit).toEqual(s.realmProvinces.filter((p: C.ProvinceTongues) => (p.people[C.mustTongue(t).id] ?? 0) > 0).map((p: C.ProvinceTongues) => p.id));
  expect(s.lit).toEqual(["Rennes", "Brest"]);
});
When("the player long-presses the row {string}", (s, t: string) => {
  s.detail = C.peoplesRowLongPress(t, s.realm);
});
Then(/^it shows the (\w+) lords, officials and any rising$/, (s) => {
  expect(s.detail).toEqual({ lords: ["the Duke of Rohan"], officials: ["the bailiff of Rennes"], risings: [] });
});
Given("the Tongue lens is on", () => {});
When(/^the map is at (far zoom|regional zoom|any zoom with the realm toggle on)$/, (s, zoom: string) => {
  s.colouring = zoom === "far zoom" ? C.lensColouring("far") : zoom === "regional zoom" ? C.lensColouring("regional") : C.lensColouring("far", true);
});
Then(/^provinces are coloured by (.+)$/, (s, what: string) => {
  expect(s.colouring).toBe(what);
});
Given(/^the (\w+) people have no country$/, (s, t: string) => {
  s.noCountry = t;
});
Then(/^the (\w+) homeland is outlined$/, (s, t: string) => {
  expect(C.outlinedHomelands([t, "French"], ["French", "Castilian"])).toEqual([C.mustTongue(s.noCountry).id]);
});

// ---------------------------------------------------------------- decided questions (D-CULT-n)

function regionId(name: string): string {
  const r = REGIONS.find((x) => x.name === name || x.name.replace(/\s*\(.*\)$/, "") === name);
  if (!r) throw new Error(`unknown region ${name}`);
  return r.id;
}
Given(/^settlers of the tongue "([^"]+)" have been the majority for (\d+) years in the map region "([^"]+)"$/, (s, t: string, years: string, region: string) => {
  s.abroad = { tongue: t, years: Number(years), region: regionId(region), courtRegion: "", province: prov(s, region, { [t]: 90000 }) };
});
Given(/^the court of "([^"]+)" sits in the map region "([^"]+)"$/, (s, name: string, region: string) => {
  s.abroad.courtRegion = regionId(region);
  cc(s, name).court = C.mustTongue(s.abroad.tongue).id;
});
Then(/^the tongue "([^"]+)" in "([^"]+)" becomes "([^"]+)" of the family "([^"]+)"$/, (s, t: string, region: string, to: string, fam: string) => {
  const p = prov(s, region);
  expect(p.people[C.mustTongue(t).id]).toBeUndefined();
  expect(p.people[C.mustTongue(to).id]).toBe(90000);
  expect(C.familyOf(to)).toBe(fam);
});
Then(/^"([^"]+)" people are cousins to "([^"]+)" and get no "Foreign rule" at once$/, (s, t: string, name: string) => {
  const c = cc(s, name);
  expect(C.relationTo(c.court, t)).toBe("cousin");
  const p = C.newProvinceTongues("abroad", { [t]: 1000 }, { homelandOf: [C.mustTongue(t).id] });
  expect(C.hasForeignRule(p, c)).toBe(false);
});
Then(/^the tongue "([^"]+)" in "([^"]+)" stays "([^"]+)"$/, (s, t: string, region: string) => {
  expect(prov(s, region).people[C.mustTongue(t).id]).toBe(90000);
});

Given(/^the country "([^"]+)" has the court tongue "([^"]+)" and the Tongue policy "Impose" for (\d+) years$/, (s, name: string, t: string, years: string) => {
  const c = cc(s, name);
  c.court = C.mustTongue(t).id;
  c.policy = "impose";
  s.mergeCase = { years: Number(years) };
});
Given(/^its provinces hold "([^"]+)" and "([^"]+)" people, whose merges_into entry is "([^"]+)"$/, (s, a: string, b: string, into: string) => {
  expect(C.mustTongue(a).merges_into).toBe(C.mustTongue(into).id);
  expect(C.mustTongue(b).merges_into).toBe(C.mustTongue(into).id);
  prov(s, "Florence", { [a]: 80000, [b]: 20000 });
  prov(s, "Milan", { [b]: 90000, [a]: 10000 });
});
Then(/^"([^"]+)" and "([^"]+)" (merge into "[^"]+"|stay apart)$/, (s, a: string, b: string, how: string) => {
  const into = /"([^"]+)"/.exec(how)?.[1];
  const ps = Object.values(s.p as Record<string, C.ProvinceTongues>);
  for (const t of [a, b]) {
    const has = ps.some((p) => (p.people[C.mustTongue(t).id] ?? 0) > 0);
    expect(has).toBe(how === "stay apart");
  }
  if (into) for (const p of ps) expect(p.people[C.mustTongue(into).id]).toBe(100000);
});

Given(/^the province "([^"]+)" is Breton with "Foreign rule" and "Banned tongue"$/, (s, name: string) => {
  const c = cc(s, "France");
  c.policy = "impose";
  const p = prov(s, name, { Breton: 90000, French: 10000 }, { homelandOf: ["breton"], yearsHeld: 100, governor: { kind: "official", tongue: "french" } });
  expect(C.updateGrievances(p, c)).toEqual(["Foreign rule", "Banned tongue"]);
});
When(/^a (?!Schoolmaster)(\w+) official serves in "([^"]+)"$/, (s, t: string, name: string) => {
  prov(s, name).governor = { kind: "official", tongue: C.mustTongue(t).id };
  act(s);
});

Given(/^a province of "([^"]+)" whose majority is (kin|cousin|stranger)$/, (s, name: string, rel: string) => {
  const t = { kin: "French", cousin: "Occitan", stranger: "Breton" }[rel]!;
  s.capProvince = prov(s, "the province", { [t]: 90000, French: 10000 });
  cc(s, name);
});
Then(/^its tongue adds nothing to the officials cap or the lords cap of "([^"]+)"$/, () => {
  expect((C.cultureConfig.officials as Record<string, unknown>).capacity_weight).toBeUndefined();
});
Then(/^an official sent there from the court needs (\d+) years to reach full effect$/, (s, years: string) => {
  const c = cc(s, s.main);
  expect(C.officialYearsToFullEffect(c, c.court, C.majorityTongue(s.capProvince))).toBe(Number(years));
});

When(/^a lord of the tongue "([^"]+)" is weighed for loyalty$/, (s, t: string) => {
  s.lordLoyalty = C.lordTongueLoyalty(cc(s, s.main), { tongue: t });
});
Then(/^his loyalty has the rising cause "shares your tongue"$/, (s) => {
  expect(s.lordLoyalty).toEqual({ sharesTongue: true, startSteps: 0 });
});
Then("his loyalty is not changed by tongue", (s) => {
  expect(s.lordLoyalty).toEqual({ sharesTongue: false, startSteps: 0 });
});
Then("his loyalty starts one step lower", (s) => {
  expect(s.lordLoyalty).toEqual({ sharesTongue: false, startSteps: -1 });
});

Given(/^the event tree sets nationalism support ([\d.]+) in the province "([^"]+)"$/, (s, n: string, name: string) => {
  prov(s, name, { Neapolitan: 90000 }, { nationalism: Number(n) });
});
When(/^the culture rules read nationalism for "([^"]+)"$/, (s, name: string) => {
  const p = prov(s, name);
  s.readNationalism = p.nationalism;
  C.driftYear(p, cc(s, "Piedmont"));
  C.updateGrievances(p, cc(s, "Piedmont"));
});
Then(/^they use ([\d.]+)$/, (s, n: string) => {
  expect(s.readNationalism).toBe(Number(n));
});
Then(/^the culture system never changes the nationalism support of "([^"]+)"$/, (s, name: string) => {
  expect(prov(s, name).nationalism).toBe(s.readNationalism);
});

Given(/^the province "([^"]+)" has nationalism ([\d.]+) and a homeland rising that wins$/, (s, name: string, n: string) => {
  const p = prov(s, name, { Breton: 90000, French: 10000 }, { homelandOf: ["breton"], nationalism: Number(n) });
  expect(C.homelandRisingDemand(p.nationalism)).toBe("a new country");
});
When(/^the (\w+) people are released as a country$/, (s, t: string) => {
  const catalogue = [{ id: "brittany", cultures: [t, "French"] }];
  s.released = C.releasedCountry(t, "feudal_realm", catalogue);
  s.generated = C.releasedCountry(t, "feudal_realm", []);
});
Then(/^the new country takes the catalogue's record for the (\w+) people$/, (s, t: string) => {
  expect(s.released).toEqual({ id: "brittany", court: C.mustTongue(t).id, form: "feudal_realm", generated: false });
});
Then("if no record fits, a generated one is used", (s) => {
  expect(s.generated).toEqual({ id: "Breton", court: "breton", form: "feudal_realm", generated: true });
});

Given(/^the province "([^"]+)" holds (\w+) (\d+) %, (\w+) (\d+) % and (\w+) (\d+) %$/, (s, name: string, a: string, pa: string, b: string, pb: string, c: string, pc: string) => {
  prov(s, name, { [a]: Number(pa) * 1000, [b]: Number(pb) * 1000, [c]: Number(pc) * 1000 });
});
When(/^(\w+) people as many as (\d+) % of "([^"]+)" arrive there$/, (s, t: string, pct: string, name: string) => {
  const p = prov(s, name);
  s.before = { ...p.people };
  C.arrive(p, "migrants", t, (C.totalPeople(p) * Number(pct)) / 100);
  s.arrived = { tongue: C.mustTongue(t).id, n: (100000 * Number(pct)) / 100 };
});
Then(/^the tongue "([^"]+)" (is|is not) among the top three of "([^"]+)"$/, (s, t: string, is: string, name: string) => {
  const p = prov(s, name);
  expect(Object.keys(p.people).length).toBeLessThanOrEqual(3);
  expect(p.people[C.mustTongue(t).id] !== undefined).toBe(is === "is");
});
Then(/^the (\w+) people join the majority tongue "([^"]+)"$/, (s, t: string, major: string) => {
  const id = C.mustTongue(t).id;
  const n = id === s.arrived.tongue ? s.arrived.n : s.before[id];
  expect(prov(s, "Riga").people[C.mustTongue(major).id]).toBeCloseTo(s.before[C.mustTongue(major).id] + n);
});

Given(/^a province whose ground is "([^"]+)" and which (touches|does not touch) the sea$/, (s, ground: string, coast: string) => {
  s.land = { ground: ground as Ground, coastal: coast === "touches" };
});
Then(/^a (herding|forest|seafaring) tongue there (lives|does not live) in its own kind of land$/, (s, way: C.WayOfLife, out: string) => {
  expect(C.livesInOwnLand(way, s.land.ground, s.land.coastal)).toBe(out === "lives");
  const t = ({ herding: "Fulbe", forest: "Lithuanian", seafaring: "Breton" } as Record<string, string>)[way] ?? "Fulbe";
  expect(C.mustTongue(t).way_of_life).toBe(way);
  const names = C.driftMultipliers({ pull: "French", drifting: t, ...s.land }).map((m) => m.name);
  expect(names.includes("way of life in its own land")).toBe(out === "lives");
});
Then(/^the school in "([^"]+)" counts for (no tongue's drift|the tongue "[^"]+")$/, (s, name: string, w: string) => {
  const t = /"([^"]+)"/.exec(w)?.[1];
  const school = prov(s, name).schools[0]!;
  expect(C.schoolTongue(school)).toBe(t ? C.mustTongue(t).id : null);
});

Given(/^the province "([^"]+)" is mostly (\w+) \((cousins|strangers)\) with nationalism ([\d.]+)$/, (s, name: string, t: string, _r: string, n: string) => {
  prov(s, name, { [t]: 90000, [cc(s, s.main ?? "France").court]: 10000 }, { nationalism: Number(n) });
});
Given(/^the country "([^"]+)" has the court tongue "([^"]+)" and the chancery tradition$/, (s, name: string, t: string) => {
  const c = cc(s, name);
  c.court = C.mustTongue(t).id;
  expect(C.hasChanceryTradition(c.id)).toBe(true);
  s.policyBefore = c.policy;
});
Given(/^the lord "([^"]+)" is of the tongue "([^"]+)"$/, (s, name: string, t: string) => {
  (s.lordsList ??= []).push({ name, tongue: C.mustTongue(t).id });
});
Then(/^the lord "([^"]+)" wavers one step$/, (s, name: string) => {
  const c = cc(s, s.main);
  expect(C.wavererOnPolicyChange(c, s.policyBefore ?? "teach", c.policy, s.lordsList)).toContain(name);
});
Then(/^the lord "([^"]+)" does not waver again while "Impose" holds$/, (s, name: string) => {
  const c = cc(s, s.main);
  expect(C.wavererOnPolicyChange(c, "impose", "impose", s.lordsList)).not.toContain(name);
});

Given("the event tree's culture groups", (s) => {
  s.groups = C.cultureConfig.families_event_tree;
});
When("the culture families are loaded", (s) => {
  s.families = C.families();
});
Then(/^the families include "([^"]+)", "([^"]+)", "([^"]+)" and "([^"]+)"$/, (s, ...fs: string[]) => {
  for (const f of fs.slice(0, 4)) expect(s.families).toContain(f);
  for (const g of s.groups) expect(s.families).toContain(g);
});
Then(/^there are (\d+) families$/, (s, n: string) => {
  expect(new Set(s.families).size).toBe(Number(n));
});

Given(/^the province "([^"]+)" has a "([^"]+)" community$/, (s, name: string, t: string) => {
  prov(s, name, { French: 95000, [t]: 5000 }, { homelandOf: [] });
  s.community = t;
});
Then(/^the "([^"]+)" people of "([^"]+)" give no "Foreign rule" grievance$/, (s, t: string, name: string) => {
  const p = prov(s, name);
  p.homelandOf = [C.mustTongue(t).id];
  expect(C.updateGrievances(p, owner(s, name))).not.toContain("Foreign rule");
});
Then("they count as neither kin nor stranger for grievances", (s) => {
  s.lastRel = C.relationTo(cc(s, s.main).court, s.community);
  expect(s.lastRel).toBe("trading");
});

Given(/^the country "([^"]+)" has the government form "([^"]+)"$/, (s, name: string, form: string) => {
  // Culture reads no form for the Tongue policy (CULT-093); the form only has to exist.
  formIdFromName(form);
  cc(s, name);
});
