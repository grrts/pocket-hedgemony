import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { Rng } from "@ph/engine";
import { loadDefaultRuleset, type ProvinceDef } from "@ph/rules";
import type { Era } from "@ph/engine/domain/research";
import * as N from "@ph/engine/domain/national-strengths";
import { allRecords } from "@ph/engine/domain/scenario-setup";

const { Given, When, Then } = steps("national-strengths");

// ---------------------------------------------------------------- helpers

const idOf = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function world(s: Scenario): N.WorldFacts {
  if (!s.w) {
    s.w = N.emptyWorld(1444);
    s.w.heritage = heritages(s);
  }
  return s.w;
}
function heritages(s: Scenario): Record<string, N.Heritage> {
  return (s.h ??= {});
}
function facts(s: Scenario, name: string): N.CountryFacts {
  return (world(s).countries[idOf(name)] ??= {});
}
function rng(s: Scenario): Rng {
  return (s.rng ??= new Rng(1444));
}
/** A country's heritage, from the example extracts or a small made-up one. */
function heritage(s: Scenario, name: string, data?: N.HeritageData): N.Heritage {
  const id = idOf(name);
  facts(s, name);
  return (heritages(s)[id] ??= N.newHeritage(id, data ?? (N.EXAMPLES[id] ? N.exampleHeritage(id) : madeUp(id))));
}
/** A plain heritage for countries the extracts leave out: simple conditions, the same shape. */
function madeUp(id: string, ambitions = 5): N.HeritageData {
  return {
    id,
    birthright: { id: `${id}_birthright`, name: "Birthright", text: "Tax reaching you +10 %.", effects: [{ lever: "tax_reach_pct", value: 10 }] },
    heydays: [],
    ambitions: Array.from({ length: ambitions }, (_, i) => madeUpAmbition(id, i, i < 2)),
    burden: null,
  };
}
function madeUpAmbition(id: string, i: number, historical: boolean): N.Ambition {
  return {
    id: `${id}_ambition_${i}`,
    name: `Ambition ${i}`,
    theme: "land",
    hint: `Hint ${i}.`,
    text: `Plain goal ${i}.`,
    historical,
    stir: { event: { id: `${id}_stir_${i}` } },
    goal: { event: { id: `${id}_goal_${i}` } },
    legacy: { id: `${id}_legacy_${i}`, name: `Legacy ${i}`, text: "Garrisons 10 % stronger.", effects: [{ lever: "garrison_pct", value: 10 }] },
  };
}
function evaluateAll(s: Scenario): void {
  for (const h of Object.values(heritages(s))) N.evaluate(h, world(s), rng(s));
}
/** Puts one pool ambition among the open ones, sealed (or stirred). */
function open(h: N.Heritage, pick: (a: N.Ambition) => boolean, state: "sealed" | "stirred" = "sealed"): N.Heritage["ambitions"][number] {
  const a = h.pool.find(pick) ?? h.waitingForAge.find(pick);
  if (!a) throw new Error("No such ambition in the pool");
  h.pool = h.pool.filter((x) => x !== a);
  const entry = { item: a, state, warmth: 0, band: "cold" as N.Band };
  h.ambitions.push(entry);
  return entry;
}
function ambition(h: N.Heritage, id: string): N.Heritage["ambitions"][number] {
  const a = h.ambitions.find((x) => x.item.id === id);
  if (!a) throw new Error(`${id} not drawn`);
  return a;
}

/** Changes the world so a condition holds (test set-up only). */
function satisfy(c: N.Condition, w: N.WorldFacts, self: string): void {
  const [type, v] = Object.entries(c)[0]!;
  const who = (x: unknown): string => (x === "this" || x === undefined ? self : String(x));
  const cf = (x: unknown): N.CountryFacts => (w.countries[who(x)] ??= {});
  switch (type) {
    case "all":
      return (v as N.Condition[]).forEach((x) => satisfy(x, w, self));
    case "any":
      return satisfy((v as N.Condition[])[0]!, w, self);
    case "not":
      return unsatisfy(v, w, self);
    case "knows":
      (cf(v.who).knows ??= []).push(v.invention);
      return;
    case "holds_place":
      (cf(v.who).places ??= []).push(v.place);
      return;
    case "coastal":
      (cf(v.who).harbours ??= []).push(v.sea ?? "sea");
      return;
    case "count": {
      const c2 = cf(v.who);
      (c2.counts ??= {})[v.thing] = N.countTarget(v.value, c2.start?.[v.thing] ?? 0);
      return;
    }
    case "independent":
      cf(v.who).overlord = null;
      w.relations = w.relations.filter((r) => !(r.who === who(v.who) && r.type === "subject"));
      return;
    case "relation":
      w.relations.push({ who: who(v.who), other: who(v.other), type: v.type });
      return;
    case "at_war":
      (cf(v.who).atWarWith ??= []).push(v.other ? who(v.other) : "someone");
      return;
    case "owns":
      (cf(v.who).owns ??= []).push(v.where);
      return;
    case "date":
      w.year = Math.max(w.year, v.min ?? w.year);
      return;
    case "event":
      w.events.push(v.id);
      return;
    case "religion":
      cf(v.who).religion = v.is;
      return;
    case "colonial_presence":
      (cf(v.who).colonial ??= {})[v.where] = v.value + (v.op === ">" ? 1 : 0);
      return;
    case "stat":
      (cf(v.who).stats ??= {})[v.stat] = v.value + (v.op === ">" ? 1 : 0);
      return;
    case "exists":
      cf(v.who).exists = true;
      return;
    case "trade_presence":
      (cf(v.who).trade ??= {})[v.hub] = v.value + (v.op === ">" ? 0.01 : 0);
      return;
    case "subject_count":
      for (let i = 0; i < v.value + (v.op === ">" ? 1 : 0); i++) w.relations.push({ who: `${who(v.who)}_subject_${i}`, other: who(v.who), type: "subject" });
      return;
    default:
      throw new Error(`Cannot set up ${type}`);
  }
}
function unsatisfy(c: N.Condition, w: N.WorldFacts, self: string): void {
  const [type, v] = Object.entries(c)[0]!;
  const id = v.who === "this" || v.who === undefined ? self : String(v.who);
  const cf = (w.countries[id] ??= {});
  switch (type) {
    case "rebels_active":
      cf.rebels = (cf.rebels ?? []).filter((r) => v.type && r !== v.type);
      return;
    case "at_war":
      cf.atWarWith = v.other ? (cf.atWarWith ?? []).filter((x) => x !== v.other) : [];
      return;
    case "exists":
      cf.exists = false;
      return;
    case "event":
      w.events = w.events.filter((e) => e !== v.id);
      return;
    default:
      throw new Error(`Cannot set up not ${type}`);
  }
}
const effectsOf = (s: Scenario, name: string): N.Effect[] => N.activeEffects(heritage(s, name));
function hasEffect(effects: N.Effect[], lever: string, value: number | boolean, params: Record<string, unknown> = {}): void {
  expect(effects, `${lever} ${String(value)} ${JSON.stringify(params)}`).toContainEqual(expect.objectContaining({ lever, value, ...params }));
}
const ageIdOf = (name: string): string => N.nsConfig.ages.find((a) => a.name === name || a.id === name)!.id;

When("the heritage conditions are evaluated", (s) => {
  evaluateAll(s);
});

// ---------------------------------------------------------------- birthright

Given("the country {string} has the birthright {string} needing a coast on the {string}", (s, name: string, br: string, sea: string) => {
  const h = heritage(s, name);
  expect(h.birthrights[0]!.item.name).toBe(br);
  expect(h.birthrights[0]!.item.needs).toEqual({ coastal: { who: "this", sea: sea.toLowerCase() } });
  s.subject = name;
});
Given("{string} owns a harbour on the Atlantic", (s, name: string) => {
  facts(s, name).harbours = ["atlantic"];
});
Given("{string} has lost every Atlantic harbour", (s, name: string) => {
  facts(s, name).harbours = ["atlantic"];
  evaluateAll(s);
  facts(s, name).harbours = [];
});
Given("{string} regains an Atlantic harbour", (s, name: string) => {
  facts(s, name).harbours = [];
  evaluateAll(s);
  expect(heritage(s, name).birthrights[0]!.dormant).toBe(true);
  facts(s, name).harbours = ["atlantic"];
});
Then("the birthright is active", (s) => {
  expect(heritage(s, s.subject).birthrights[0]!.dormant).toBe(false);
  expect(effectsOf(s, s.subject).length).toBeGreaterThan(0);
});
Then("the birthright is dormant and shown greyed", (s) => {
  const h = heritage(s, s.subject);
  expect(h.birthrights[0]!.dormant).toBe(true);
  expect(N.activeEffects(h).filter((e) => h.birthrights[0]!.item.effects.includes(e))).toEqual([]);
  expect(N.card(h)[0]!.greyed).toBe(true);
});
Then("the birthright is active again", (s) => {
  const h = heritage(s, s.subject);
  expect(h.birthrights[0]!.dormant).toBe(false);
  expect(h.log.map((e) => e.type)).toEqual(expect.arrayContaining(["BirthrightDormant", "BirthrightWoke"]));
});

Given("the country {string} has the birthright {string} and owns Atlantic harbours", (s, name: string, br: string) => {
  expect(heritage(s, name).birthrights[0]!.item.name).toBe(br);
  facts(s, name).harbours = ["atlantic"];
  s.subject = name;
});
When("its effects are applied", (s) => {
  evaluateAll(s);
  s.effects = effectsOf(s, s.subject);
});
Then("ships build 15 % faster, storms sink 30 % fewer, sea crossings take 10 % fewer days", (s) => {
  hasEffect(s.effects, "ship_build_pct", -15);
  hasEffect(s.effects, "storm_loss_pct", -30);
  hasEffect(s.effects, "sea_days_pct", -10);
});
Then("ports raise 20 % more sailors and fisheries feed 20 % more", (s) => {
  hasEffect(s.effects, "crew_pct", 20);
  hasEffect(s.effects, "fish_pct", 20);
});

Given("the country {string} has the birthright {string}", (s, name: string, br: string) => {
  const h = heritage(s, name);
  expect(h.birthrights[0]!.item.name).toBe(br);
  if (h.birthrights[0]!.item.needs) satisfy(h.birthrights[0]!.item.needs, world(s), h.country);
  facts(s, name).places = [...(facts(s, name).places ?? []), "Padua", "Verona", "Zara"];
  s.subject = name;
});
When("{string} loses a war and cedes provinces other than Venice", (s, name: string) => {
  facts(s, name).places = (facts(s, name).places ?? []).filter((p) => p === "Venice");
  evaluateAll(s);
});
Then("{string} still has the birthright {string}", (s, name: string, br: string) => {
  const b = heritage(s, name).birthrights.find((x) => x.item.name === br);
  expect(b).toBeDefined();
  expect(b!.dormant).toBe(false);
});

// ---------------------------------------------------------------- heydays

Given("the country {string} has the heyday {string} of the {string}", (s, name: string, hd: string, age: string) => {
  const h = heritage(s, name);
  s.heyday = h.heydays.find((x) => x.item.name === hd)!;
  expect(s.heyday.item.age).toBe(age);
  s.subject = name;
});
Given("its wakes condition is: an Atlantic harbour and knowing {string}", (s, inv: string) => {
  expect(s.heyday.item.wakes).toEqual({ all: [{ coastal: { who: "this", sea: "atlantic" } }, { knows: { who: "this", invention: inv } }] });
});
function wakeIt(s: Scenario): void {
  world(s).ages.active.push(s.heyday.item.age);
  facts(s, s.subject).harbours = ["atlantic"];
  facts(s, s.subject).knows = ["S4"];
  evaluateAll(s);
  expect(s.heyday.state).toBe("awake");
}
Given("the age is not yet active", (s) => {
  world(s).ages.active = [];
  facts(s, s.subject).harbours = ["atlantic"];
  facts(s, s.subject).knows = ["S4"];
});
Given("the age is active and {string} knows {string} with an Atlantic harbour", (s, name: string, inv: string) => {
  world(s).ages.active.push(s.heyday.item.age);
  facts(s, name).harbours = ["atlantic"];
  facts(s, name).knows = [inv];
});
Given("the age is active and {string} has lost its Atlantic harbours", (s, name: string) => {
  wakeIt(s);
  N.serveYears(heritage(s, name), 10);
  facts(s, name).harbours = [];
});
Given("the age has ended", (s) => {
  wakeIt(s);
  world(s).ages.active = [];
  world(s).ages.ended.push(s.heyday.item.age);
});
Then("the heyday is waiting", (s) => {
  expect(s.heyday.state).toBe("waiting");
});
Then("the heyday is awake", (s) => {
  expect(s.heyday.state).toBe("awake");
  for (const e of s.heyday.item.effects) expect(effectsOf(s, s.subject)).toContainEqual(e);
});
Then("the heyday is asleep, keeping its years served", (s) => {
  expect(s.heyday.state).toBe("asleep");
  expect(s.heyday.yearsAwake).toBe(10);
});
Then("the heyday is ended for good", (s) => {
  expect(s.heyday.state).toBe("ended");
  // Even if its age came back and the condition held, it stays ended.
  world(s).ages.active.push(s.heyday.item.age);
  world(s).ages.ended = [];
  evaluateAll(s);
  expect(s.heyday.state).toBe("ended");
});

Given("the Atlantic crossing happens early in this campaign", (s) => {
  world(s).year = 1460;
  world(s).events.push("columbus_first_voyage");
  const h = heritage(s, "Portugal");
  s.heyday = h.heydays.find((x) => x.item.age === "age_of_atlantic_empires")!;
  satisfy(s.heyday.item.wakes, world(s), "portugal");
});
When(/^the "([^"]*)" begins(?: early)?$/, (s, age: string) => {
  world(s).ages.active.push(age);
  for (const h of Object.values(heritages(s))) N.ageBegins(h, age);
  evaluateAll(s);
});
Then("Atlantic heydays can wake early", (s) => {
  expect(world(s).year).toBeLessThan(1492);
  expect(s.heyday.state).toBe("awake");
});

Given("the heyday {string} was awake {int} years in total", (s, name: string, years: number) => {
  s.subject = "Portugal";
  s.heyday = heritage(s, "Portugal").heydays.find((x) => x.item.name === name)!;
  wakeIt(s);
  N.serveYears(heritage(s, "Portugal"), years);
});
When("its age ends", (s) => {
  world(s).ages.active = world(s).ages.active.filter((a) => a !== s.heyday.item.age);
  world(s).ages.ended.push(s.heyday.item.age);
  evaluateAll(s);
});
Then("no mark is left", (s) => {
  expect(s.heyday.state).toBe("ended");
  expect(heritage(s, s.subject).legacies).toEqual([]);
});
Then("the mark {string} is granted as a permanent legacy", (s, mark: string) => {
  const h = heritage(s, s.subject);
  expect(h.legacies.map((l) => l.name)).toEqual([mark]);
  for (const e of s.heyday.item.mark.effects) expect(N.activeEffects(h)).toContainEqual(e);
});

Given(/^a heyday with no mark block whose first lever is (\w+) \+(\d+)$/, (s, lever: string, value: string) => {
  const data = madeUp("testland");
  data.heydays = [{ id: "testland_heyday", name: "A heyday", age: "age_of_exploration", text: "", wakes: { independent: { who: "this" } }, effects: [{ lever, value: Number(value) }, { lever: "growth_pct", value: 10 }] }];
  heritage(s, "Testland", data);
  s.subject = "Testland";
  s.heyday = heritage(s, "Testland").heydays[0]!;
  expect(s.heyday.item.mark).toBeUndefined();
});
Given("it was awake {int} years", (s, years: number) => {
  world(s).ages.active.push(s.heyday.item.age);
  evaluateAll(s);
  expect(s.heyday.state).toBe("awake");
  N.serveYears(heritage(s, s.subject), years);
});
When("it ends", (s) => {
  world(s).ages.active = [];
  world(s).ages.ended.push(s.heyday.item.age);
  evaluateAll(s);
});
Then(/^a legacy with (\w+) \+(\d+) is granted$/, (s, lever: string, value: string) => {
  const ls = heritage(s, s.subject).legacies;
  expect(ls).toHaveLength(1);
  expect(ls[0]!.effects).toEqual([{ lever, value: Number(value) }]);
});

function threeHeydays(id: string): N.HeritageData {
  const data = madeUp(id);
  data.heydays = ["age_of_exploration", "age_of_gunpowder_empires", "age_of_reformations"].map((age, i) => ({ id: `${id}_heyday_${i}`, name: `Heyday ${i}`, age, text: "", wakes: { event: { id: `${id}_wakes_${i}` } }, effects: [{ lever: "garrison_pct", value: 10 }] }));
  return data;
}
Given("the country {string} has 2 heydays awake", (s, name: string) => {
  const h = heritage(s, name, threeHeydays(idOf(name)));
  s.subject = name;
  world(s).ages.active.push(...h.heydays.map((x) => x.item.age));
  for (const hd of h.heydays.slice(0, 2)) satisfy(hd.item.wakes, world(s), h.country);
  evaluateAll(s);
  expect(h.heydays.filter((x) => x.state === "awake")).toHaveLength(2);
});
When("a third heyday's wakes condition holds", (s) => {
  const h = heritage(s, s.subject);
  satisfy(h.heydays[2]!.item.wakes, world(s), h.country);
  evaluateAll(s);
});
Then("the player is asked which heyday sleeps", (s) => {
  const h = heritage(s, s.subject);
  expect(h.ask).toMatchObject({ kind: "sleep_heyday", waking: h.heydays[2]!.item.id });
  N.chooseSleepingHeyday(h, h.heydays[0]!.item.id);
});
Then("only 2 heydays are awake afterwards", (s) => {
  const h = heritage(s, s.subject);
  const awake = () => h.heydays.filter((x) => x.state === "awake").map((x) => x.item.id);
  expect(awake()).toEqual([h.heydays[1]!.item.id, h.heydays[2]!.item.id]);
  evaluateAll(s);
  expect(awake()).toHaveLength(2);
  expect(h.ask).toBeNull();
});

// ---------------------------------------------------------------- ambitions

Given("the country {string} has a pool of {int} ambitions, {int} tagged historical", (s, name: string, n: number, hist: number) => {
  const data = N.exampleHeritage(idOf(name));
  expect(data.ambitions).toHaveLength(n);
  data.ambitions.forEach((a, i) => (a.historical = i >= n - hist));
  s.data = data;
  s.subject = name;
});
When("the campaign starts", (s) => {
  if (s.data) {
    // Many campaigns, many seeds: the rule must hold for every draw.
    s.draws = Array.from({ length: 40 }, (_, seed) => {
      const h = N.newHeritage(idOf(s.subject), s.data);
      N.startCampaign(h, new Rng(seed), world(s));
      return N.openAmbitions(h);
    });
  } else s.draws = [N.startCampaign(heritage(s, s.subject), rng(s), world(s))];
});
Then("{int} ambitions are drawn", (s, n: number) => {
  for (const d of s.draws) expect(d).toHaveLength(n);
});
Then("at least one of them is tagged historical", (s) => {
  for (const d of s.draws) expect(d.some((a: { item: N.Ambition }) => a.item.historical)).toBe(true);
});

Given("the country {string} has the sealed ambition with hint {string}", (s, name: string, hint: string) => {
  s.amb = open(heritage(s, name), (a) => a.hint === hint);
});
When("the player opens the heritage card", (s) => {
  s.view = N.ambitionView(s.amb);
});
Then("the ambition shows a theme icon and the hint", (s) => {
  expect(N.nsConfig.themes).toContain(s.view.theme);
  expect(s.view.hint).toBe(s.amb.item.hint);
});
Then("its plain goal is not shown", (s) => {
  expect(s.view.plainGoal).toBeUndefined();
  expect(Object.values(s.view)).not.toContain(s.amb.item.text);
});

Given("the country {string} has a sealed ambition", (s, name: string) => {
  s.subject = name;
  s.amb = open(heritage(s, name), (a) => a.id === "venice_lion_on_the_adda");
});
When("its stir condition holds", (s) => {
  if (s.amb) {
    satisfy(s.amb.item.stir, world(s), heritage(s, s.subject).country);
  } else {
    const h = heritage(s, s.subject);
    satisfy(h.burden!.item.shed, world(s), h.country);
  }
  evaluateAll(s);
});
Then("the ambition is stirred", (s) => {
  expect(s.amb.state).toBe("stirred");
});
Then("it shows a warmth, the name of the legacy it promises and its deadline", (s) => {
  const v = N.ambitionView(s.amb);
  expect(["cold", "warm", "hot"]).toContain(v.warmth);
  expect(v.legacy).toBe(s.amb.item.legacy.name);
  expect(v.deadline).toBe(s.amb.item.window[1]);
});
Then("the hint stays the only words shown", (s) => {
  const v = N.ambitionView(s.amb);
  expect(v.hint).toBe(s.amb.item.hint);
  expect(v.plainGoal).toBeUndefined();
});

Given("the country {string} has the stirred ambition {string}", (s, name: string, amb: string) => {
  s.subject = name;
  s.amb = open(heritage(s, name), (a) => a.name === amb, "stirred");
});
When("{string} holds {string}", (s, name: string, place: string) => {
  (facts(s, name).places ??= []).push(place);
  evaluateAll(s);
});
Then("the legacy {string} is granted", (s, name: string) => {
  expect(heritage(s, s.subject).legacies.map((l) => l.name)).toContain(name);
});
Then("the plain goal is shown for the first time", (s) => {
  expect(N.ambitionView(s.amb).plainGoal).toBe(s.amb.item.text);
  expect(s.amb.state).toBe("done");
});
Then(/^a new ambition is drawn(?: from the pool)?$/, (s) => {
  const log = heritage(s, s.subject).log.map((e) => e.type);
  const finished = Math.max(log.lastIndexOf("AmbitionDone"), log.lastIndexOf("AmbitionLost"));
  expect(finished).toBeGreaterThanOrEqual(0);
  expect(log.slice(finished)).toContain("AmbitionDrawn");
});

Given("the country {string} has the open ambition {string} with a window ending in {int}", (s, name: string, amb: string, end: number) => {
  s.subject = name;
  s.amb = open(heritage(s, name), (a) => a.name === amb);
  expect(s.amb.item.window[1]).toBe(end);
  const h = heritage(s, name);
  s.before = { legacies: structuredClone(h.legacies), burden: structuredClone(h.burden) };
});
When("the year {int} begins", (s, year: number) => {
  world(s).year = year;
  evaluateAll(s);
});
When("its fail condition holds", (s) => {
  // This ambition names no fail condition in the data: give it one, then make it hold.
  s.amb.item.fail ??= { event: { id: "cape_route_closed" } };
  satisfy(s.amb.item.fail, world(s), heritage(s, s.subject).country);
  evaluateAll(s);
});
Then("the ambition is lost without penalty", (s) => {
  expect(s.amb.state).toBe("lost");
  // No penalty: losing grants nothing and takes nothing; the legacies and the burden are as they were.
  const h = heritage(s, s.subject);
  expect(h.legacies).toEqual(s.before.legacies);
  expect(h.burden).toEqual(s.before.burden);
});
Then("its plain goal is shown as what might have been", (s) => {
  expect(N.ambitionView(s.amb).plainGoal).toBe(s.amb.item.text);
});

Given("an ambition's goal is a single count leaf of {int} markets", (s, n: number) => {
  const data = madeUp("testland", 0);
  data.ambitions = [{ ...madeUpAmbition("testland", 0, true), goal: { count: { who: "this", thing: "building:market", op: ">=", value: n } } }];
  s.subject = "Testland";
  s.amb = open(heritage(s, "Testland", data), () => true, "stirred");
});
Given("the country has {int} markets", (s, n: number) => {
  (facts(s, "Testland").counts ??= {})["building:market"] = n;
});
Then("the goal counts as two thirds met", (s) => {
  expect(s.amb.warmth).toBeCloseTo(2 / 3, 10);
  expect(s.amb.state).toBe("stirred");
});

Given("an ambition's goal is a single holds_place condition", (s) => {
  const data = madeUp("testland", 0);
  data.ambitions = [{ ...madeUpAmbition("testland", 0, true), goal: { holds_place: { who: "this", place: "Kilwa" } } }];
  s.subject = "Testland";
  s.amb = open(heritage(s, "Testland", data), () => true, "stirred");
});
When("the place is taken", (s) => {
  s.bands = [];
  for (let year = 1444; year < 1450; year++) {
    world(s).year = year;
    evaluateAll(s);
    s.bands.push(N.ambitionView(s.amb).warmth);
  }
  (facts(s, "Testland").places ??= []).push("Kilwa");
  evaluateAll(s);
  s.bands.push(N.ambitionView(s.amb).warmth);
});
Then("the warmth goes from cold straight to done", (s) => {
  expect(s.bands).toEqual(["cold", "cold", "cold", "cold", "cold", "cold", "done"]);
});

Given("a drawn ambition's goal already holds on 11 Nov 1444", (s) => {
  s.subject = "Portugal";
  s.free = N.exampleHeritage("portugal").ambitions.find((a) => a.id === "portugal_gold_of_mina")!;
  satisfy(s.free.goal, world(s), "portugal");
  expect(world(s).year).toBe(1444);
});
Then("the ambition is put back and another is drawn", (s) => {
  // Find a campaign where the free win came up in the draw.
  let found = false;
  for (let seed = 0; seed < 200 && !found; seed++) {
    const h = N.newHeritage("portugal", N.exampleHeritage("portugal"));
    N.startCampaign(h, new Rng(seed), world(s));
    if (!h.log.some((e) => e.type === "AmbitionPutBack" && e.id === s.free.id)) continue;
    found = true;
    expect(N.openAmbitions(h).map((a) => a.item.id)).not.toContain(s.free.id);
    expect(N.openAmbitions(h)).toHaveLength(3);
    expect(h.pool.map((a) => a.id)).toContain(s.free.id);
  }
  expect(found).toBe(true);
  for (const d of s.draws) expect(d.map((a: N.Ambition) => a.id)).not.toContain(s.free.id);
});

Given("the date is in era {word}", (s, era: Era) => {
  s.era = era;
  world(s).year = 1600;
});
Given("the country {string} last paid counsel {int} years ago", (s, name: string, years: number) => {
  s.subject = name;
  const h = heritage(s, name);
  s.amb = open(h, (a) => a.id === "venice_lion_on_the_adda");
  h.counselYear = world(s).year - years;
  s.treasury = { gold: 1000 };
});
When("{string} asks for counsel on one ambition", (s, name: string) => {
  s.counsel = N.payCounsel(heritage(s, name), s.amb.item.id, world(s), s.era, s.treasury);
});
Then("it pays {int} gold and the ambition stirs and shows its warmth", (s, gold: number) => {
  expect(s.counsel).toEqual({ ok: true, gold });
  expect(s.treasury.gold).toBe(1000 - gold);
  expect(s.amb.state).toBe("stirred");
  const v = N.ambitionView(s.amb);
  expect(["cold", "warm", "hot"]).toContain(v.warmth);
  expect(v.plainGoal).toBeUndefined();
});
Then("counsel is refused", (s) => {
  expect(s.counsel).toEqual({ ok: false, reason: "too_soon" });
  expect(s.treasury.gold).toBe(1000);
  expect(s.amb.state).toBe("sealed");
});

Given("the pool of {string} has an entry naming the {string}", (s, name: string, age: string) => {
  const data = madeUp(idOf(name));
  data.ambitions.push({ ...madeUpAmbition(idOf(name), 9, false), age });
  const h = heritage(s, name, data);
  s.subject = name;
  s.ageEntry = `${idOf(name)}_ambition_9`;
  expect(h.pool.map((a) => a.id)).not.toContain(s.ageEntry);
});
Then("the entry joins the pool of {string}", (s, name: string) => {
  const h = heritage(s, name);
  expect([...h.pool.map((a) => a.id), ...h.ambitions.map((a) => a.item.id)]).toContain(s.ageEntry);
});

const MODES: Record<string, N.HistoryMode> = { Drawn: "drawn", "Historical only": "historical_only" };
Given("the campaign setting {string} is {string}", (s, setting: string, mode: string) => {
  expect(setting).toBe("History mode");
  s.mode = MODES[mode];
  expect(N.RULES.ambitions.history_mode_setting.values).toContain(s.mode);
});
When("ambitions are drawn", (s) => {
  s.draws = Array.from({ length: 40 }, (_, seed) => {
    const h = N.newHeritage("venice", N.exampleHeritage("venice"));
    N.startCampaign(h, new Rng(seed), world(s), s.mode);
    return N.openAmbitions(h);
  });
});
Then("3 are drawn with one historical guaranteed", (s) => {
  for (const d of s.draws) {
    expect(d).toHaveLength(3);
    expect(d.some((a: { item: N.Ambition }) => a.item.historical)).toBe(true);
  }
  // Drawn mode can also bring up ambitions that are not historical.
  expect(s.draws.some((d: { item: N.Ambition }[]) => d.some((a) => !a.item.historical))).toBe(true);
});
Then("only ambitions tagged historical are drawn", (s) => {
  for (const d of s.draws) {
    expect(d.length).toBeGreaterThan(0);
    for (const a of d) expect(a.item.historical).toBe(true);
  }
});
Then("no setting reveals ambitions", (s) => {
  expect(N.RULES.ambitions.history_mode_setting.values).toEqual(["drawn", "historical_only"]);
  expect(N.RULES.ambitions.never_revealed).toBe(true);
  for (const d of s.draws) for (const a of d) expect(N.ambitionView(a).plainGoal).toBeUndefined();
});

Given("the AI country {string} has {int} active ambitions", (s, name: string, n: number) => {
  s.subject = name;
  const h = heritage(s, name);
  N.startCampaign(h, rng(s), world(s));
  expect(N.openAmbitions(h)).toHaveLength(n);
});
When("the AI chooses its goals", (s) => {
  s.goals = N.aiGoals(heritage(s, s.subject));
});
Then("it sees its ambitions' plain goals", (s) => {
  const h = heritage(s, s.subject);
  expect(s.goals.map((g: { plainGoal: string }) => g.plainGoal)).toEqual(N.openAmbitions(h).map((a) => a.item.text));
});
Then("weighs them at {float} next to its ai_personality priorities", (s, w: number) => {
  for (const g of s.goals) expect(g.weight).toBe(w);
});
Then("when it completes one it gets the legacy", (s) => {
  const h = heritage(s, s.subject);
  const g = s.goals[0];
  satisfy(g.goal, world(s), h.country);
  evaluateAll(s);
  const a = ambition(h, g.ambition);
  expect(a.state).toBe("done");
  expect(h.legacies).toContainEqual(a.item.legacy);
});

// ---------------------------------------------------------------- legacies and burdens

Given("the country {string} has heritage", (s, name: string) => {
  s.subject = name;
  heritage(s, name);
});
When("an ambition is done", (s) => {
  const h = heritage(s, s.subject);
  const a = open(h, (x) => x.id === "kongo_royal_schools");
  satisfy(a.item.goal, world(s), h.country);
  evaluateAll(s);
  expect(a.state).toBe("done");
});
When("a heyday awake 25 years ends and leaves its mark", (s) => {
  const h = heritage(s, s.subject);
  const hd = h.heydays.find((x) => x.item.mark)!;
  world(s).ages.active.push(hd.item.age);
  satisfy(hd.item.wakes, world(s), h.country);
  evaluateAll(s);
  N.serveYears(h, 25);
  world(s).ages.ended.push(hd.item.age);
  evaluateAll(s);
});
When("its burden is shed and turned", (s) => {
  const h = heritage(s, s.subject);
  satisfy(h.burden!.item.shed, world(s), h.country);
  evaluateAll(s);
});
Then("{string} gains a permanent legacy", (s, name: string) => {
  const h = heritage(s, name);
  expect(h.legacies).toHaveLength(1);
  const held = h.legacies[0]!;
  // Permanent: whatever happens next, it stays.
  world(s).year += 100;
  world(s).countries[h.country] = {};
  evaluateAll(s);
  expect(h.legacies).toContainEqual(held);
  for (const e of held.effects) expect(N.activeEffects(h)).toContainEqual(e);
});

Given("the country {string} holds {int} legacies", (s, name: string, n: number) => {
  s.subject = name;
  const h = heritage(s, name);
  for (let i = 0; i < n; i++) N.grantLegacy(h, { id: `l${i}`, name: `Legacy ${i}`, text: "", effects: [] });
  expect(h.legacies).toHaveLength(n);
});
When("it earns a sixth", (s) => {
  s.result = N.grantLegacy(heritage(s, s.subject), { id: "l6", name: "Sixth", text: "", effects: [] });
});
Then("the player is asked which one to let go", (s) => {
  const h = heritage(s, s.subject);
  expect(s.result).toBe("ask");
  expect(h.ask).toMatchObject({ kind: "let_go_legacy" });
  N.letGoLegacy(h, "l0");
});
Then("{string} holds {int} legacies", (s, name: string, n: number) => {
  const h = heritage(s, name);
  expect(h.legacies).toHaveLength(n);
  expect(h.legacies.map((l) => l.id)).toContain("l6");
  expect(h.legacies.map((l) => l.id)).not.toContain("l0");
});

Given("the ambition {string} rewards the great legacy {string}", (s, amb: string, legacy: string) => {
  const a = N.exampleHeritage("portugal").ambitions.find((x) => x.name === amb)!;
  expect(a.legacy.name).toBe(legacy);
  expect(a.legacy.great).toBe(true);
  s.legacy = a.legacy;
});
When("the heritage is built", (s) => {
  s.points = N.effectsPoints(s.legacy.effects);
});
Then("{string} may spend {int} points instead of {int}", (s, _name: string, great: number, plain: number) => {
  expect(N.partBudget("great_legacy")).toBe(great);
  expect(N.partBudget("legacy")).toBe(plain);
  expect(N.outsideBudget(s.points, great)).toBe(false);
  expect(N.outsideBudget(s.points, plain)).toBe(true);
});
Then("it gives one more trader and customs officers {int} % stronger on the coast", (s, pct: number) => {
  hasEffect(s.legacy.effects, "trader_count", 1);
  hasEffect(s.legacy.effects, "official_type_pct", pct, { type: "customs_officer", where: "coast" });
});

Given("the country {string} carries the burden {string} with lords one step less loyal", (s, name: string, burden: string) => {
  s.subject = name;
  const h = heritage(s, name);
  expect(h.burden!.item.name.toLowerCase()).toBe(burden);
  hasEffect(N.activeEffects(h), "lord_loyalty_start_steps", -1);
  facts(s, name).start = { loyal_lords: 3 };
  facts(s, name).counts = { loyal_lords: 3 };
});
Then("the turned legacy {string} is granted", (s, name: string) => {
  expect(heritage(s, s.subject).legacies.map((l) => l.name)).toEqual([name]);
});
Then("a new ruler or a disputed heir no longer shakes the lords", (s) => {
  const h = heritage(s, s.subject);
  expect(N.leverIn(h, "lord_loyalty_shield", {}, { cause: "new_ruler" })).toBe(1);
  expect(N.leverIn(h, "lord_loyalty_shield", {}, { cause: "disputed_heir" })).toBe(1);
});

Given("the country {string} carries the burden {string}", (s, name: string, burden: string) => {
  s.subject = name;
  const h = heritage(s, name);
  expect(h.burden!.item.name.toLowerCase()).toContain(burden);
});
When("{string} offers gold to remove it", (s, name: string) => {
  expect(N.offerGoldForBurden(heritage(s, name), 10000)).toBe(false);
  evaluateAll(s);
});
When("its shed condition holds", (s) => {
  const h = heritage(s, s.subject);
  satisfy(h.burden!.item.shed, world(s), h.country);
  evaluateAll(s);
});
When("a reform event applies shed_burden", (s) => {
  N.shedBurden(heritage(s, s.subject));
});
Then("the burden is {word}", (s, state: string) => {
  const h = heritage(s, s.subject);
  // "gone" (HER-032) and "shed" (HER-034) both mean the burden no longer weighs.
  expect(["kept", "shed", "gone"]).toContain(state);
  expect(h.burden!.state).toBe(state === "kept" ? "held" : "shed");
  if (state === "shed") expect(h.legacies).toContainEqual(h.burden!.item.turned);
  if (state === "gone") expect(N.leverIn(h, "lord_loyalty_start_steps")).toBe(0);
});

// ---------------------------------------------------------------- levers

Given("the lever {string} in levers.json", (s, key: string) => {
  s.key = key;
});
When("it is read", (s) => {
  s.lever = N.lever(s.key);
});
Then("it is in group {string} with unit {string}, costs {float} points per unit and is owned by {string}", (s, group: string, unit: string, pts: number, owner: string) => {
  expect(s.lever).toMatchObject({ group, unit, points: pts, owner });
  expect(["higher", "lower"]).toContain(s.lever.better);
  expect(Array.isArray(s.lever.params)).toBe(true);
});

Given(/^a legacy with (\w+) \+(\d+) for "([^"]*)" where "([^"]*)"$/, (s, lever: string, value: string, type: string, where: string) => {
  const h = heritage(s, "Testland", { ...madeUp("testland"), birthright: { id: "b", name: "B", text: "", effects: [] } });
  s.subject = "Testland";
  s.legacy = { id: "scoped", name: "Scoped", text: "", effects: [{ lever, value: Number(value), type, where }] };
  s.h0 = h;
});
When("the legacy is applied", (s) => {
  N.grantLegacy(s.h0, s.legacy);
});
Then("customs officers are 20 % stronger in coastal provinces only", (s) => {
  const p = { type: "customs_officer" };
  expect(N.leverIn(s.h0, "official_type_pct", { coast: true }, p)).toBe(20);
  expect(N.leverIn(s.h0, "official_type_pct", { coast: false }, p)).toBe(0);
  expect(N.leverIn(s.h0, "official_type_pct", { capital: true }, p)).toBe(0);
  expect(N.leverIn(s.h0, "official_type_pct", { coast: true }, { type: "judge" })).toBe(0);
});

Given("the lever {string} is provisional, waiting for the religion design", (s, key: string) => {
  expect(N.isProvisional(key)).toBe(true);
  expect(N.lever(key).owner).toMatch(/religion design/);
  s.key = key;
  s.data = [N.exampleHeritage("kongo")];
  expect(JSON.stringify(s.data)).toContain(`"${key}"`);
});
When("the religion design names its rule", (s) => {
  s.renamed = N.renameProvisionalLever(N.LEVERS, s.data, s.key, "religion_named_rule", "religion design");
});
Then("the lever can be renamed or pointed at that rule", (s) => {
  const { levers } = s.renamed;
  expect(levers[s.key]).toBeUndefined();
  expect(levers.religion_named_rule).toEqual({ ...N.lever(s.key), owner: "religion design" });
  expect(Object.keys(levers)).toHaveLength(Object.keys(N.LEVERS).length);
});
Then("only the key changes in heritage data", (s) => {
  const after = JSON.stringify(s.renamed.data).replaceAll('"religion_named_rule"', `"${s.key}"`);
  expect(after).toBe(JSON.stringify(s.data));
  expect(JSON.stringify(s.renamed.data)).not.toContain(`"${s.key}"`);
});

Given("the heyday {string}", (s, name: string) => {
  s.heyday = heritage(s, "Portugal").heydays.find((x) => x.item.name === name)!;
});
When("its effects are read", (s) => {
  s.levers = s.heyday.item.effects.map((e: N.Effect) => e.lever);
});
Then(/^it pulls (\d+) levers: (\w+), (\w+) and (\w+)$/, (s, n: string, a: string, b: string, c: string) => {
  expect(s.levers).toEqual([a, b, c]);
  expect(s.levers).toHaveLength(Number(n));
  for (const l of s.levers) N.lever(l);
});

// ---------------------------------------------------------------- conditions

Given("the country {string} knows {string}", (s, name: string, inv: string) => {
  (facts(s, name).knows ??= []).push(inv);
});
Given("the country {string} owns the province holding {string}", (s, name: string, place: string) => {
  (facts(s, name).places ??= []).push(place);
});
Given("the country {string} owns a province with a harbour on the Atlantic", (s, name: string) => {
  (facts(s, name).harbours ??= []).push("atlantic");
});
Given("the country {string} has {int} officials", (s, name: string, n: number) => {
  (facts(s, name).counts ??= {}).officials = n;
});
Given("the country {string} has done the ambition {string}", (s, name: string, id: string) => {
  const h = heritage(s, name);
  const a = open(h, (x) => x.id === id, "stirred");
  satisfy(a.item.goal, world(s), h.country);
  evaluateAll(s);
  expect(a.state).toBe("done");
});
Given("the country {string} has no overlord", (s, name: string) => {
  facts(s, name).overlord = null;
});
/** The short forms the feature writes: "knows R1", "count officials >= 30", "heritage X done" … */
function parseShort(text: string): N.Condition {
  const [type, ...rest] = text.split(" ");
  switch (type) {
    case "knows":
      return { knows: { who: "this", invention: rest[0] } };
    case "holds_place":
      return { holds_place: { who: "this", place: rest.join(" ") } };
    case "coastal":
      return { coastal: { who: "this", sea: rest[0] } };
    case "count":
      return { count: { who: "this", thing: rest[0], op: rest[1], value: Number(rest[2]) } };
    case "heritage":
      return { heritage: { who: "this", id: rest[0], state: rest[1] } };
    case "independent":
      return { independent: { who: "this" } };
    default:
      throw new Error(`Unknown condition ${text}`);
  }
}
When("the condition {string} is tested with this as {string}", (s, cond: string, name: string) => {
  const c = parseShort(cond);
  expect(N.nsConfig.heritage_conditions).toContain(Object.keys(c)[0]);
  s.result = N.holds(c, world(s), idOf(name));
  // The same condition is false for a country without that state.
  expect(N.holds(c, world(s), "nobody")).toBe(Object.keys(c)[0] === "independent");
});
Then("it holds", (s) => {
  expect(s.result).toBe(true);
});
Then("it does not hold", (s) => {
  expect(s.result).toBe(false);
});

Given("{string} is a subject of {string}", (s, a: string, b: string) => {
  world(s).relations.push({ who: idOf(a), other: idOf(b), type: "subject" });
});
When("the condition relation who {string} other {string} type {string} is tested", (s, a: string, b: string, type: string) => {
  s.result = N.holds({ relation: { who: idOf(a), other: idOf(b), type } }, world(s), idOf(a));
});
Then("relation who {string} other {string} type {string} holds", (s, a: string, b: string, type: string) => {
  expect(N.holds({ relation: { who: idOf(a), other: idOf(b), type } }, world(s), idOf(a))).toBe(true);
  // Read as "A is the T of B": the other way round does not hold.
  expect(N.holds({ relation: { who: idOf(b), other: idOf(a), type } }, world(s), idOf(a))).toBe(false);
});

Given("the country {string} began the campaign with {int} markets", (s, name: string, n: number) => {
  s.subject = name;
  (facts(s, name).start ??= {})["building:market"] = n;
});
Given("it now has {int} markets", (s, n: number) => {
  (facts(s, s.subject).counts ??= {})["building:market"] = n;
});
When("the condition count {string} >= {string} is tested", (s, thing: string, value: string) => {
  s.result = N.holds({ count: { who: "this", thing, op: ">=", value } }, world(s), idOf(s.subject));
});

// ---------------------------------------------------------------- budgets

const PARTS: Record<string, N.Part> = { birthright: "birthright", heyday: "heyday", legacy: "legacy", "great legacy": "great_legacy", burden: "burden" };
Given("a heritage {string}", (s, part: string) => {
  s.part = PARTS[part];
});
When("its points are totalled", (s) => {
  s.budget = N.partBudget(s.part);
});
Then("its budget is {int} points", (s, n: number) => {
  expect(s.budget).toBe(n);
});

Given("the lever {string} at +{int} costs {int} point realm-wide", (s, key: string, value: number, pts: number) => {
  s.effect = { lever: key, value };
  expect(N.effectPoints(s.effect)).toBeCloseTo(pts, 10);
});
const SCOPES: Record<string, Partial<N.Effect>> = {
  "the realm": { where: "realm" },
  "the capital": { where: "capital" },
  "one named area": { where: "area:lombardy_venetia" },
  "the coast and one terrain": { where: "coast", terrain: "hills" },
};
When("it is limited to {}", (s, scope: string) => {
  s.effect = { ...s.effect, ...SCOPES[scope] };
});
Given(/^an effect "(\w+) (?:(\w+) )?\+(\d+)(?: for (all wares|\w+))?"$/, (s, lever: string, stat: string | undefined, value: string, ware: string | undefined) => {
  s.effect = { lever, value: Number(value), ...(stat ? { stat } : {}), ...(ware && ware !== "all wares" ? { ware } : {}) };
});
When("its cost is worked out", () => {});
Then("it costs {float} points", (s, pts: number) => {
  expect(N.effectPoints(s.effect)).toBeCloseTo(pts, 10);
});

Given("the birthright of {string} totals {float} points against a budget of {float}", (s, country: string, pts: number, budget: number) => {
  if (N.EXAMPLES[country]) {
    const rec = N.CATALOGUE_EXAMPLES[country]!;
    expect(N.effectsPoints(N.exampleHeritage(country).birthright.effects)).toBeCloseTo(pts, 10);
    expect(N.partBudget("birthright", N.recordSize(rec))).toBe(budget);
  }
  s.build = () => (s.listed = N.outsideBudget(pts, budget));
});
Then(/^the report (lists|does not list) it as outside budget$/, (s, lists: string) => {
  expect(s.listed).toBe(lists === "lists");
});

// ---------------------------------------------------------------- who gets heritage

const GROUPS: Record<string, { group: N.Group; example: string }> = {
  "tier A playable": { group: "tier_a", example: "portugal" },
  "tier B and C playable": { group: "tier_b_c", example: "genoa" },
  "decentralised polity": { group: "decentralised", example: "igbo_societies" },
  "background or non-state actor": { group: "background", example: "nri" },
};
Given("a country in the group {string}", (s, group: string) => {
  const g = GROUPS[group]!;
  const rec = N.CATALOGUE_EXAMPLES[g.example]!;
  expect(N.nsConfig.groups[g.group].modes).toContain(rec.gameplay.representation.mode);
  s.build = () => {
    s.kind = N.heritageKindOf(g.group);
    if (s.kind === "authored") s.built = N.exampleHeritage(g.example);
    else if (s.kind !== "none") s.built = N.generate(rec, N.sizeBonus(N.recordSize(rec)));
  };
});
When("heritage is built", (s) => {
  s.build();
});
When("heritage is generated", (s) => {
  s.build();
});
Then(/^it gets (.*)$/, (s, what: string) => {
  switch (what) {
    case "hand-written birthright, 2–3 heydays, 5–7 ambitions and a burden":
      expect(s.kind).toBe("authored");
      expect(s.built.authored).toBe(true);
      expect(s.built.heydays.length).toBeGreaterThanOrEqual(2);
      expect(s.built.heydays.length).toBeLessThanOrEqual(3);
      expect(s.built.ambitions.length).toBeGreaterThanOrEqual(N.RULES.ambitions.pool_min_authored);
      expect(s.built.ambitions.length).toBeLessThanOrEqual(7);
      expect(s.built.burden).toBeTruthy();
      return;
    case "generated heritage by archetype":
      expect(s.kind).toBe("generated");
      expect(N.ARCHETYPE_IDS).toContain(s.built.archetype);
      expect(s.built.ambitions.length).toBeGreaterThanOrEqual(N.RULES.ambitions.pool_min_generated);
      return;
    case "generated heritage with a decentralised archetype":
      expect(s.kind).toBe("generated_decentralised");
      expect(N.DECENTRALISED_ARCHETYPES).toContain(s.built.archetype);
      return;
    case "no heritage":
      expect(s.kind).toBe("none");
      expect(s.built).toBeUndefined();
      return;
    case "its catalogue heritage":
      expect(s.built).toEqual(N.EXAMPLES[s.released]);
      return;
    case "the generated heritage of its archetype":
      expect(s.built.authored).toBe(false);
      expect(s.built.archetype).toBe(N.scoreArchetypes(s.record)[0]!.id);
      return;
    default:
      throw new Error(`Unknown outcome ${what}`);
  }
});

Given("{string} is a decentralised polity matching the archetype {string}", (s, name: string, label: string) => {
  const rec = N.CATALOGUE_EXAMPLES.igbo_societies!;
  expect(rec.names.common_en).toBe(name);
  expect(rec.gameplay.representation.mode).toBe("decentralized_polity");
  const best = N.scoreArchetypes(rec)[0]!.id;
  expect(N.archetypeLabel(best).toLowerCase()).toBe(label);
  s.build = () => (s.built = N.generate(rec, N.sizeBonus(N.recordSize(rec))));
});
Then("its birthright {string} makes foot fight harder and march faster in forest and makes conquerors' Foreign rule last longer", (s, name: string) => {
  const b: N.Birthright = s.built.birthright;
  expect(b.name.toLowerCase()).toBe(name);
  const e = b.effects;
  expect(e.find((x) => x.lever === "hits_pct" && x.arm === "foot" && x.terrain === "forest")!.value).toBeGreaterThan(0);
  expect(e.find((x) => x.lever === "march_days_pct" && x.terrain === "forest")!.value).toBeLessThan(0);
  expect(e.find((x) => x.lever === "homeland_resistance_pct")!.value).toBeGreaterThan(0);
});
Then("its heyday {string} belongs to the {string} and is awake while at war", (s, name: string, age: string) => {
  const hd: N.Heyday = s.built.heydays.find((x: N.Heyday) => x.name.toLowerCase() === name)!;
  expect(N.ageName(hd.age)).toBe(age);
  const h = N.newHeritage("igbo_societies", s.built);
  const w = N.emptyWorld(1500);
  w.ages.active.push(hd.age);
  w.countries.igbo_societies = { atWarWith: ["benin"] };
  N.evaluate(h, w);
  expect(h.heydays.find((x) => x.item.id === hd.id)!.state).toBe("awake");
  w.countries.igbo_societies = { atWarWith: [] };
  N.evaluate(h, w);
  expect(h.heydays.find((x) => x.item.id === hd.id)!.state).toBe("asleep");
});
Then("its ambitions include outlasting {string} and enduring as an independent people to {int}", (s, rival: string, year: number) => {
  const ams: N.Ambition[] = s.built.ambitions;
  const outlast = ams.find((a) => a.name === `Outlast ${rival}`)!;
  expect(outlast.goal).toEqual({ any: [{ not: { exists: { who: idOf(rival) } } }, { relation: { who: idOf(rival), other: "this", type: "subject" } }] });
  expect(ams).toContainEqual(expect.objectContaining({ theme: "survival", goal: { all: [{ independent: { who: "this" } }, { date: { min: year } }] } }));
});

Given("two sea-trading cities in different regions", (s) => {
  s.cities = ["genoa", "zanzibar"].map((id) => N.CATALOGUE_EXAMPLES[id]!);
  expect(s.cities[0].meta.region).not.toBe(s.cities[1].meta.region);
  s.build = () => (s.builtAll = s.cities.map((r: N.CatalogueRecord) => N.generate(r, N.sizeBonus(N.recordSize(r)))));
});
Then("each takes its birthright and burden from its best archetype", (s) => {
  for (const [i, g] of (s.builtAll as N.HeritageData[]).entries()) {
    const best = N.scoreArchetypes(s.cities[i])[0]!.id;
    expect(best).toBe("sea_trading_city");
    expect(g.archetype).toBe(best);
    const t = N.archetypeTemplates(best);
    expect(g.birthright.effects.map((e) => e.lever)).toEqual(t.birthright.effects.map((e) => e.lever));
    expect(g.burden!.effects.map((e) => e.lever)).toEqual(t.burden.effects.map((e) => e.lever));
  }
});
Then("its second-best archetype may add a heyday, so the two differ", (s) => {
  const [a, b] = s.builtAll as N.HeritageData[];
  expect(a!.secondary_archetype).not.toBe(b!.secondary_archetype);
  expect(a!.heydays).not.toEqual(b!.heydays);
  for (const g of [a!, b!]) {
    const best = N.archetypeTemplates(g.archetype!).heydays.map((h) => h.name);
    const second = N.archetypeTemplates(g.secondary_archetype!).heydays.map((h) => h.name);
    const fits = (n: string, name: string) => n === name || new RegExp(`^${n.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[^}]*\}/g, ".+")}$`).test(name);
    for (const h of g.heydays) expect([...best, ...second].some((n) => fits(n, h.name)), h.name).toBe(true);
  }
});

Given("a generated country gets a file in data\\/authored defining only its birthright", (s) => {
  const rec = N.CATALOGUE_EXAMPLES.genoa!;
  s.generated = N.generate(rec, N.sizeBonus(N.recordSize(rec)));
  s.authoredBirthright = { id: "genoa_bank_of_saint_george", name: "Bank of Saint George", text: "Loans cost 20 % less interest.", effects: [{ lever: "loan_interest_pct", value: -20 }] } satisfies N.Birthright;
  s.build = () => (s.built = N.mergeAuthored(s.generated, { birthright: s.authoredBirthright }));
});
Then("its birthright is the authored one", (s) => {
  expect(s.built.birthright).toEqual(s.authoredBirthright);
});
Then("its other parts stay generated", (s) => {
  expect(s.built.heydays).toEqual(s.generated.heydays);
  expect(s.built.ambitions).toEqual(s.generated.ambitions);
  expect(s.built.burden).toEqual(s.generated.burden);
  expect(s.built.archetype).toBe(s.generated.archetype);
});

// ---------------------------------------------------------------- changing hands

Given("the country {string} has 2 birthrights", (s, name: string) => {
  s.subject = name;
  const h = heritage(s, name);
  N.annex(h, heritage(s, "Byzantium"));
  expect(N.wakeClaim(h, "byzantium")).toBe(true);
  expect(h.birthrights).toHaveLength(2);
});
When("another annexed birthright would wake", (s) => {
  const h = heritage(s, s.subject);
  N.annex(h, heritage(s, "Wallachia"));
  s.woke = N.wakeClaim(h, "wallachia");
});
Then("{string} still holds at most 2 birthrights", (s, name: string) => {
  expect(s.woke).toBe(false);
  expect(heritage(s, name).birthrights).toHaveLength(N.RULES.inheritance.max_birthrights);
});

Given("{string} becomes a subject of {string}", (s, subject: string, overlord: string) => {
  const over = heritage(s, overlord);
  N.grantLegacy(over, N.exampleHeritage(idOf(overlord)).ambitions[0]!.legacy);
  const sub = heritage(s, subject);
  s.before = structuredClone(sub);
  s.overlordLegacies = over.legacies;
  world(s).relations.push({ who: idOf(subject), other: idOf(overlord), type: "subject" });
  s.pair = [subject, overlord];
});
When("heritage is applied", (s) => {
  evaluateAll(s);
});
Then("{string} keeps its whole heritage", (s, name: string) => {
  const h = heritage(s, name);
  const ids = (x: N.Heritage) => [x.birthrights.map((b) => b.item.id), x.heydays.map((d) => d.item.id), [...x.pool, ...x.waitingForAge].map((a) => a.id), x.burden?.item.id, x.legacies];
  expect(ids(h)).toEqual(ids(s.before));
});
Then("the legacies of {string} do not apply to {string}", (s, overlord: string, subject: string) => {
  const effects = effectsOf(s, subject);
  for (const l of heritage(s, overlord).legacies) for (const e of l.effects) expect(effects).not.toContainEqual(e);
  expect(heritage(s, subject).legacies).toEqual([]);
});

Given("the country {string} is released", (s, name: string) => {
  s.released = idOf(name);
});
Given(/^it (is|is not) in the catalogue$/, (s, is: string) => {
  expect(s.released in N.EXAMPLES).toBe(is === "is");
  if (is === "is not") {
    // A country the catalogue does not know: what is known of it, in the catalogue's shape.
    s.record = { ...structuredClone(N.CATALOGUE_EXAMPLES.zanzibar!), id: s.released, names: { common_en: "Newland" } };
  }
});
When("its heritage is set", (s) => {
  s.built = N.releasedHeritage(s.released, N.EXAMPLES, s.record);
});

Given("{string} and {string} form {string} by event", (s, a: string, _b: string, formed: string) => {
  const castile = heritage(s, a);
  N.grantLegacy(castile, castile.pool[0]!.legacy);
  s.forming = castile;
  s.formed = formed;
});
When("the heritage of {string} is set", (s, name: string) => {
  s.spain = N.formCountry(idOf(name), s.forming, N.EXAMPLES[idOf(name)] ?? null, new Rng(7));
  // The same rule for a formed country with its own heritage.
  s.ownData = madeUp(idOf(name), 3);
  s.spainOwn = N.formCountry(idOf(name), s.forming, s.ownData, new Rng(7));
});
Then("it keeps the birthright and legacies of the forming country", (s) => {
  for (const sp of [s.spain, s.spainOwn] as N.Heritage[]) {
    expect(sp.birthrights[0]!.item).toEqual(s.forming.birthrights[0]!.item);
    expect(sp.legacies).toEqual(s.forming.legacies);
  }
});
Then("it adds the heritage of {string} if it has its own", (s, _name: string) => {
  expect(s.spain.birthrights).toHaveLength(1);
  expect(s.spainOwn.birthrights.map((b: { item: N.Birthright }) => b.item.id)).toEqual([s.forming.birthrights[0]!.item.id, s.ownData.birthright.id]);
});
Then("it draws ambitions from both pools", (s) => {
  const sp: N.Heritage = s.spainOwn;
  const all = [...sp.pool, ...sp.ambitions.map((a) => a.item)].map((a) => a.id).sort();
  expect(all).toEqual([...s.forming.pool, ...s.ownData.ambitions].map((a: N.Ambition) => a.id).sort());
  expect(N.openAmbitions(sp)).toHaveLength(3);
  expect(N.openAmbitions(s.spain)).toHaveLength(3);
});

// ---------------------------------------------------------------- heritage in events

Given("the country {string} has {int} legacies", (s, name: string, n: number) => {
  s.subject = name;
  for (let i = 0; i < n; i++) N.grantLegacy(heritage(s, name), { id: `old_${i}`, name: `Old ${i}`, text: "", effects: [] });
});
When("an event applies grant_legacy with id {string} on {string}", (s, id: string, name: string) => {
  N.grantLegacy(heritage(s, name), { id, name: id, text: "", effects: [] });
});
Then("{string} holds the legacy {string}", (s, name: string, id: string) => {
  expect(heritage(s, name).legacies.map((l) => l.id)).toContain(id);
  expect(N.heritageStates(heritage(s, name), id)).toContain("held");
});

Given("the heyday {string} is asleep because {string} lacks {string}", (s, id: string, name: string, inv: string) => {
  s.subject = name;
  s.heyday = heritage(s, name).heydays.find((x) => x.item.id === id)!;
  world(s).year = 1500;
  world(s).ages.active.push(s.heyday.item.age);
  facts(s, name).harbours = ["atlantic"];
  facts(s, name).knows = [];
  evaluateAll(s);
  expect(N.holds({ knows: { who: "this", invention: inv } }, world(s), idOf(name))).toBe(false);
  expect(s.heyday.state).toBe("asleep");
});
When("an event applies wake_heyday on {string} with years {int}", (s, name: string, years: number) => {
  N.wakeHeydayByEvent(heritage(s, name), s.heyday.item.id, years, world(s));
});
Then("the heyday is awake for {int} years even though its condition fails", (s, years: number) => {
  expect(N.holds(s.heyday.item.wakes, world(s), idOf(s.subject))).toBe(false);
  expect(s.heyday.state).toBe("awake");
  const start = world(s).year;
  world(s).year = start + years - 1;
  evaluateAll(s);
  expect(s.heyday.state).toBe("awake");
  world(s).year = start + years;
  evaluateAll(s);
  expect(s.heyday.state).toBe("asleep");
});

When("an event applies stir_ambition on it", (s) => {
  N.stirAmbitionByEvent(heritage(s, s.subject), s.amb.item.id, world(s));
});
Then("the ambition is stirred and shows its warmth", (s) => {
  expect(s.amb.state).toBe("stirred");
  expect(["cold", "warm", "hot"]).toContain(N.ambitionView(s.amb).warmth);
});
Then("its words stay a hint", (s) => {
  const v = N.ambitionView(s.amb);
  expect(v.hint).toBe(s.amb.item.hint);
  expect(v.plainGoal).toBeUndefined();
});

Given("the country {string} carries a burden", (s, name: string) => {
  s.subject = name;
  expect(heritage(s, name).burden!.state).toBe("held");
});
When("a reform event applies shed_burden on {string}", (s, name: string) => {
  N.shedBurden(heritage(s, name));
});
Then("the burden is shed and its turned legacy is granted", (s) => {
  const h = heritage(s, s.subject);
  expect(h.burden!.state).toBe("shed");
  expect(h.legacies).toEqual([h.burden!.item.turned]);
  expect(N.heritageStates(h, h.burden!.item.id)).toContain("shed");
});

Given("the country {string} has its Atlantic heyday awake", (s, name: string) => {
  s.subject = name;
  s.heyday = heritage(s, name).heydays.find((x) => x.item.id === "portugal_carreira_da_india")!;
  wakeIt(s);
  s.check = (event: string) => {
    expect(event).toBe("da_gama_voyage");
    s.result = N.holds({ heritage: { who: "this", id: s.heyday.item.id, state: "awake" } }, world(s), idOf(name));
  };
});
Given("the country {string} has a legacy with event_weight +{int} on the event", (s, name: string, pct: number) => {
  const h = heritage(s, name);
  s.check = (event: string) => {
    N.grantLegacy(h, { id: "weighted", name: "Weighted", text: "", effects: [{ lever: "event_weight", value: pct, event }] });
    s.weights = [N.eventWeight(h, event, 10), N.eventWeight(h, "some_other_event", 10)];
  };
});
Given("the country {string} has a legacy with event_option on the option", (s, name: string) => {
  const h = heritage(s, name);
  s.check = (event: string) => {
    N.grantLegacy(h, { id: "opened", name: "Opened", text: "", effects: [{ lever: "event_option", value: true, event, option: "heritage_option" }] });
    s.option = [N.optionOpen(h, event, "heritage_option"), N.optionOpen(madeUpHeritage(), event, "heritage_option")];
  };
});
const madeUpHeritage = (): N.Heritage => N.newHeritage("other", madeUp("other"));
When("the event {string} is considered", (s, event: string) => {
  s.check(event);
});
Then("the heritage condition holds", (s) => {
  expect(s.result).toBe(true);
});
Then("the event's weight is doubled", (s) => {
  expect(s.weights).toEqual([20, 10]);
});
Then("the option is available", (s) => {
  expect(s.option).toEqual([true, false]);
});

// ---------------------------------------------------------------- the card and the phone

Given("the heyday {string} is awake in the {string}", (s, name: string, age: string) => {
  const h = heritage(s, s.subject);
  const hd = h.heydays.find((x) => x.item.name === name)!;
  expect(hd.item.age).toBe(ageIdOf(age));
  world(s).ages.active.push(hd.item.age);
  satisfy(hd.item.wakes, world(s), h.country);
  evaluateAll(s);
  expect(hd.state).toBe("awake");
});
Given("{string} has {int} active ambitions, one of them stirred and warm", (s, name: string, n: number) => {
  const h = heritage(s, name);
  N.startCampaign(h, rng(s), world(s));
  const open3 = N.openAmbitions(h);
  expect(open3).toHaveLength(n);
  // The goal of one is partly met: one of three places held (warm from a third, D-HER-13).
  const lion = h.ambitions.find((a) => a.item.id === "venice_lion_on_the_adda") ?? (open3[0]!.state === "sealed" ? open3[0]! : open3[0]!);
  if (lion.item.id === "venice_lion_on_the_adda") {
    satisfy(lion.item.stir, world(s), h.country);
    (facts(s, name).places ??= []).push("Bergamo");
  } else {
    N.stirAmbitionByEvent(h, lion.item.id, world(s));
    lion.band = "warm";
  }
  evaluateAll(s);
  expect(N.openAmbitions(h).filter((a) => a.state === "stirred" && a.band === "warm")).toHaveLength(1);
});
Given("{string} carries the burden {string} and has no legacies", (s, name: string, burden: string) => {
  const h = heritage(s, name);
  expect(h.burden?.item.name).toBe(burden);
  expect(h.legacies).toEqual([]);
});
When("the player opens the heritage card of {string}", (s, name: string) => {
  s.card = N.card(heritage(s, name), N.ageName);
});
Then("the card shows the rows Birthright, Heyday, Ambitions, Burden and Legacies and no more", (s) => {
  expect(s.card.map((r: N.CardRow) => r.row)).toEqual(["Birthright", "Heyday", "Ambitions", "Burden", "Legacies"]);
  expect(s.card[1].lines).toEqual(["The mude to Alexandria (Age of Gunpowder Empires · awake)"]);
  expect(s.card[2].lines).toHaveLength(3);
});
Then("the Legacies row says {string}", (s, text: string) => {
  expect(s.card[4].lines).toEqual([text]);
});
Then("tapping a row shows its full text, its history note and what it changes", (s) => {
  const b = s.card[0].details[0];
  const data = heritage(s, s.subject).birthrights[0]!.item;
  expect(b).toEqual({ name: data.name, text: data.text, why: data.why, changes: data.effects });
  expect(s.card[1].details[0].changes.length).toBeGreaterThan(0);
  expect(s.card[3].details[0].why).toBeTruthy();
});

Then("galleys build 30 % faster, the capital's garrison is 40 % stronger and ports raise 15 % more sailors", (s) => {
  hasEffect(s.effects, "ship_build_pct", -30, { ship: "galley" });
  hasEffect(s.effects, "garrison_pct", 40, { where: "capital" });
  hasEffect(s.effects, "crew_pct", 15);
  const h = heritage(s, s.subject);
  expect(N.leverIn(h, "garrison_pct", { capital: true })).toBe(40);
  expect(N.leverIn(h, "garrison_pct", { capital: false })).toBe(0);
});

Given("the country {string} has a birthright, an awake heyday, 3 sealed ambitions and a burden", (s, name: string) => {
  s.subject = name;
  const h = heritage(s, name);
  const hd = h.heydays[0]!;
  world(s).ages.active.push(hd.item.age);
  satisfy(hd.item.wakes, world(s), h.country);
  N.startCampaign(h, rng(s), world(s));
  evaluateAll(s);
  expect(N.openAmbitions(h).map((a) => a.state)).toEqual(["sealed", "sealed", "sealed"]);
});
When("the player opens the country card", (s) => {
  s.row = N.heritageRow(heritage(s, s.subject));
});
Then("one Heritage row shows the birthright icon, the heyday icon, three seals and the burden icon", (s) => {
  const h = heritage(s, s.subject);
  expect(s.row).toMatchObject({ birthright: h.birthrights[0]!.item.id, heyday: h.heydays[0]!.item.id, seals: ["sealed", "sealed", "sealed"], burden: h.burden!.item.id });
});
Then("tapping it opens the Heritage sheet", (s) => {
  expect(s.row.opens).toBe("Heritage sheet");
});

Given("the country {string} has an ambition", (s, name: string) => {
  s.subject = name;
  const h = heritage(s, name);
  const a: N.Ambition = {
    ...madeUpAmbition(h.country, 0, true),
    goal: { all: ["Bergamo", "Brescia", "Crema", "Cremona"].map((place) => ({ holds_place: { who: "this", place } })) },
  };
  h.pool.push(a);
  s.amb = open(h, (x) => x === a);
});
When("its seal cracks", (s) => {
  const h = heritage(s, s.subject);
  h.digest = [];
  s.logFrom = h.log.length;
  satisfy(s.amb.item.stir, world(s), h.country);
  evaluateAll(s);
  expect(s.amb.state).toBe("stirred");
});
When("its warmth rises to hot", (s) => {
  const h = heritage(s, s.subject);
  satisfy(s.amb.item.stir, world(s), h.country);
  (facts(s, s.subject).places ??= []).push("Bergamo", "Brescia");
  evaluateAll(s);
  expect(s.amb.band).toBe("warm");
  h.digest = [];
  s.logFrom = h.log.length;
  facts(s, s.subject).places!.push("Crema");
  evaluateAll(s);
  expect(s.amb.band).toBe("hot");
});
Then("a small quiet animation plays", (s) => {
  const moments = heritage(s, s.subject).log.slice(s.logFrom).filter((e) => e.type === "AmbitionStirred" || e.type === "WarmthChanged");
  expect(moments).toHaveLength(1);
});
Then("the monthly digest has one line about it", (s) => {
  const h = heritage(s, s.subject);
  expect(h.digest).toHaveLength(1);
  expect(h.digest[0]).toContain(s.amb.item.hint);
});

Given("the player is choosing a country", () => {});
When("the player looks at {string}", (s, name: string) => {
  s.data = N.exampleHeritage(idOf(name));
  s.picker = N.pickerSummary(s.data);
});
Then("the picker shows its birthright and burden, a count of its sealed ambitions and its heydays as ages", (s) => {
  expect(s.picker).toEqual({ birthright: s.data.birthright.name, burden: s.data.burden.name, sealedAmbitions: 3, heydayAges: s.data.heydays.map((h: N.Heyday) => h.age) });
  expect(Object.values(s.picker).flat()).not.toContain(s.data.ambitions[0].text);
});

// ---------------------------------------------------------------- decided questions (spec 13)

const tax = (points: number): N.Effect[] => [{ lever: "tax_reach_pct", value: Math.round(points * 10) }];

// D-HER-13: warmth bands at a third and two thirds
Given("an ambition's goal has {int} leaf conditions", (s, n: number) => {
  const h = heritage(s, "Warmland", { ...madeUp("warmland", 0), ambitions: [] });
  const a = madeUpAmbition("warmland", 0, true);
  a.goal = { all: Array.from({ length: n }, (_, i) => ({ knows: { who: "this", invention: `inv${i}` } })) };
  h.ambitions.push({ item: a, state: "stirred", warmth: 0, band: "cold" });
  s.amb = h.ambitions[0];
});
Given("{int} of them hold", (s, n: number) => {
  facts(s, "Warmland").knows = Array.from({ length: n }, (_, i) => `inv${i}`);
});
Then("its warmth is {string}", (s, warmth: string) => {
  if (warmth === "done") expect(s.amb.state).toBe("done");
  else {
    expect(s.amb.state).toBe("stirred");
    expect(s.amb.band).toBe(warmth);
  }
});

// D-HER-11: a resident envoy reads one ambition
Given("the country {string} has kept a resident envoy at the court of {string}", (s, reader: string, host: string) => {
  heritage(s, reader);
  s.host = heritage(s, host);
  N.startCampaign(s.host, rng(s), world(s));
  expect(N.envoyReading(s.host, 1, rng(s))).toBeNull();
});
When("{int} years have passed", (s, years: number) => {
  s.reading = N.envoyReading(s.host, years, rng(s));
});
Then("{string} learns the hint and warmth of one active ambition of {string}", (s, _reader: string, _host: string) => {
  const open = N.openAmbitions(s.host);
  expect(s.reading).not.toBeNull();
  expect(open.map((a) => a.item.hint)).toContain(s.reading.hint);
  expect(["cold", "warm", "hot"]).toContain(s.reading.band);
});
Then("never its plain goal", (s) => {
  const text = JSON.stringify(s.reading);
  for (const a of N.openAmbitions(s.host)) expect(text).not.toContain(a.item.text);
});

// D-HER-10: pool limits
Given("a generated heritage with {int} ambitions in its pool and {int} age ambitions", (s, pool: number, age: number) => {
  const d = madeUp("gen", pool);
  for (let i = 0; i < age; i++) d.ambitions.push({ ...madeUpAmbition("gen", 100 + i, false), age: "age_of_exploration" });
  s.build = () => {
    s.ok = N.poolWithinLimits(d, "generated");
    s.poolSize = pool;
  };
});
Then(/^its pool is (too small|within the limits|too large)$/, (s, verdict: string) => {
  expect(s.ok).toBe(verdict === "within the limits");
  if (verdict === "too small") expect(s.poolSize).toBeLessThan(N.RULES.ambitions.pool_min_generated);
  if (verdict === "too large") expect(s.poolSize).toBeGreaterThan(N.RULES.ambitions.pool_max);
});

// D-HER-12: the AI's choices
Given("the AI country {string} has 2 heydays awake worth {int} and {int} points", (s, name: string, a: number, b: number) => {
  const hd = (id: string, pts: number, wake: string): N.Heyday => ({ id, name: id, age: "age_of_exploration", text: "", wakes: { event: { id: wake } }, effects: tax(pts) });
  const d = { ...madeUp(idOf(name)), heydays: [hd(`h${a}`, a, "go"), hd(`h${b}`, b, "go")] };
  const h = heritage(s, name, d);
  world(s).ages.active.push("age_of_exploration");
  world(s).events.push("go");
  evaluateAll(s);
  expect(h.heydays.filter((x) => x.state === "awake")).toHaveLength(2);
  s.ai = h;
});
When("a third heyday worth {float} points would wake", (s, pts: number) => {
  const h: N.Heritage = s.ai;
  h.heydays.push({ item: { id: "third", name: "third", age: "age_of_exploration", text: "", wakes: { event: { id: "third" } }, effects: tax(pts) }, state: "waiting", yearsAwake: 0 });
  world(s).events.push("third");
  evaluateAll(s);
  expect(h.ask?.kind).toBe("sleep_heyday");
});
Then("the AI puts the heyday worth {int} points to sleep", (s, pts: number) => {
  expect(N.aiAnswer(s.ai)).toBe(`h${pts}`);
});
Then("2 heydays are awake", (s) => {
  evaluateAll(s);
  expect((s.ai as N.Heritage).heydays.filter((x) => x.state === "awake").map((x) => x.item.id).sort()).toEqual(["h3", "third"]);
});
Given("the AI country {string} holds 5 legacies, the weakest worth {float} points", (s, name: string, weakest: number) => {
  const h = heritage(s, name);
  for (const [i, pts] of [1.5, weakest, 1, 2.5, 1.2].entries()) N.grantLegacy(h, { id: `l${pts}`, name: `L${i}`, text: "", effects: tax(pts) });
  expect(h.legacies).toHaveLength(5);
  s.ai = h;
});
When("it earns a sixth worth {int} points", (s, pts: number) => {
  expect(N.grantLegacy(s.ai, { id: "new", name: "New", text: "", effects: tax(pts) })).toBe("ask");
});
Then("the AI lets the legacy worth {float} points go", (s, pts: number) => {
  expect(N.aiAnswer(s.ai)).toBe(`l${pts}`);
  expect((s.ai as N.Heritage).legacies.map((l) => l.id)).toContain("new");
});
Then("{string} still holds {int} legacies", (s, name: string, n: number) => {
  expect(heritage(s, name).legacies).toHaveLength(n);
  expect(heritage(s, name).ask).toBeNull();
});
Then("it changes {string}", (s, meaning: string) => {
  expect(s.lever.meaning).toBe(meaning);
});

// D-HER-9: one evaluation a turn, time in months
Given("the country {string} has a heyday awake in an active age", (s, name: string) => {
  const d = { ...madeUp(idOf(name)), heydays: [{ id: "long_heyday", name: "Long", age: "age_of_exploration", text: "", wakes: { event: { id: "go" } }, effects: tax(2) }] };
  heritage(s, name, d);
  s.who = name;
  world(s).ages.active.push("age_of_exploration");
  world(s).events.push("go");
});
When("{int} turns pass with its wakes condition holding", (s, turns: number) => {
  const h = heritage(s, s.who);
  for (let i = 0; i < turns; i++) N.monthTick(h, world(s), rng(s));
});
Then("the heyday has served {int} years", (s, years: number) => {
  const hd = heritage(s, s.who).heydays[0]!;
  expect(hd.state).toBe("awake");
  expect(hd.yearsAwake).toBe(years);
});

// D-HER-3: the size bonus follows the rules table
Given("the country {string} has size class {float}", (s, _name: string, size: number) => {
  s.size = size;
});
When("its birthright budget is set", (s) => {
  s.bonus = N.sizeBonus(s.size);
  s.budget = N.partBudget("birthright", s.size);
});
Then("its size bonus is {float} and its birthright budget is {float}", (s, bonus: number, budget: number) => {
  expect(s.bonus).toBe(bonus);
  expect(s.budget).toBe(budget);
});

// D-HER-1: a claim wakes after 30 years
Given("the country {string} annexed {string} in {int}", (s, a: string, b: string, year: number) => {
  world(s).year = year;
  N.annex(heritage(s, a), heritage(s, b));
  s.annexer = a;
  s.annexed = idOf(b);
});
Given("{string} has held Constantinople and most of the Byzantine homeland for {int} years", (s, name: string, years: number) => {
  facts(s, name).homelandHeldYears = { [s.annexed]: years };
});
Then("the Byzantine birthright is a dormant claim", (s) => {
  const h = heritage(s, s.annexer);
  expect(h.claims.map((c) => c.item.id)).toContain(N.exampleHeritage(s.annexed).birthright.id);
  expect(h.birthrights).toHaveLength(1);
});
Then("the Byzantine birthright is awake as the second birthright of {string}", (s, who: string) => {
  const h = heritage(s, who);
  expect(h.birthrights.map((b) => b.item.id)).toEqual([h.birthrights[0]!.item.id, N.exampleHeritage(s.annexed).birthright.id]);
  expect(h.claims).toHaveLength(0);
});

// D-HER-17: a formed country keeps two birthrights
Given("{string} holds its own birthright and one inherited from {string}", (s, name: string, from: string) => {
  const h = heritage(s, name);
  N.annex(h, heritage(s, from));
  expect(N.wakeClaim(h, idOf(from))).toBe(true);
  expect(h.birthrights).toHaveLength(2);
  s.forming = h;
});
When("{string} forms {string}, which has a birthright of its own", (s, _name: string, formed: string) => {
  s.formed = N.formCountry(idOf(formed), s.forming, madeUp(idOf(formed)), rng(s));
});
Then("{string} holds 2 birthrights: the own birthright of {string} and its own", (s, _formed: string, forming: string) => {
  const own = N.exampleHeritage(idOf(forming)).birthright.id;
  expect((s.formed as N.Heritage).birthrights.map((b) => b.item.id)).toEqual([own, `${(s.formed as N.Heritage).country}_birthright`]);
});
Then("the birthright inherited from {string} is a dormant claim of {string} again", (s, from: string, _formed: string) => {
  expect((s.formed as N.Heritage).claims.map((c) => c.from)).toContain(idOf(from));
});

// D-HER-16: place names bind to the map
let provinces: ProvinceDef[] | undefined;
Given("a heritage condition uses the place {string}", (s, place: string) => {
  s.place = place;
});
When("its place names are bound to the map", (s) => {
  provinces ??= loadDefaultRuleset().provinces;
  s.bound = N.bindPlace(s.place, provinces);
});
Then("{string} is bound to the one land province nearest the place", (s, place: string) => {
  const p = provinces!.find((x) => x.id === s.bound);
  expect(p, place).toBeDefined();
  expect(["sea", "ocean"]).not.toContain(p!.terrain);
  // it lies in the realm the place names
  expect(p!.owner).toBe(idOf(place));
});
Then("{string} stays on the list of places to bind", (s, _place: string) => {
  expect(s.bound).toBeNull();
});
Then("a holds_place condition on it does not hold", (s) => {
  expect(N.holds({ holds_place: { who: "this", place: s.place } }, world(s), "anyone")).toBe(false);
});

// ---------------------------------------------------------------- generation and the phone

// HER-052: build counts over the whole catalogue
Given("the country catalogue", (s) => {
  s.build = () => {
    const kinds = allRecords().map((r) => N.heritageKindOf(N.groupOfRecord(r.tier, r.representation)));
    s.kinds = kinds;
  };
});
Then("{int} countries have heritage: {int} hand-written and {int} generated", (s, all: number, hand: number, gen: number) => {
  const k = s.kinds as N.HeritageKind[];
  expect(k.filter((x) => x !== "none")).toHaveLength(all);
  expect(k.filter((x) => x === "authored")).toHaveLength(hand);
  expect(k.filter((x) => x === "generated" || x === "generated_decentralised")).toHaveLength(gen);
});
Then("{int} have none", (s, n: number) => {
  expect((s.kinds as N.HeritageKind[]).filter((x) => x === "none")).toHaveLength(n);
});

// HER-054: the first allowed age whose regions cover the country
const REGIONS: Record<string, string[]> = {
  "the Americas": ["north_america", "central_america", "caribbean", "south_america"],
  "West Africa": ["sub_saharan_africa"],
  "Southeast Asia": ["southeast_asia"],
  "Central Asia": ["central_asia"],
};
Given("a forest people in {string}", (s, region: string) => {
  s.regions = new Set(REGIONS[region]);
  s.options = N.archetypeTemplates("forest_chiefdom").heydays[0]!.age_options;
});
When("its heyday is generated", (s) => {
  s.age = N.pickAge(s.options, s.regions);
});
Then("the heyday belongs to the {string}", (s, age: string) => {
  expect(N.ageName(s.age)).toBe(age);
});

// HER-056: decentralised polities take crownless archetypes only
Given("a decentralised polity", (s) => {
  s.rec = N.CATALOGUE_EXAMPLES["igbo_societies"]!;
  expect(s.rec.gameplay.representation.mode).toBe("decentralized_polity");
});
When("it is scored against archetypes", (s) => {
  s.scored = N.scoreArchetypes(s.rec).map((x) => x.id);
});
Then("it can only take forest, hill, herding, steppe, desert, island, mountain, ocean, chiefdom, commune, raiders or segmentary archetypes", (s) => {
  expect(s.scored.length).toBeGreaterThan(0);
  for (const id of s.scored) expect(N.DECENTRALISED_ARCHETYPES).toContain(id);
});

// HER-072: the map shimmers over a hot ambition
Given("the country {string} has a hot ambition naming {string}, {string} and {string}", (s, name: string, a: string, b: string, c: string) => {
  const h = heritage(s, name);
  const amb = N.exampleHeritage(idOf(name)).ambitions.find((x) => JSON.stringify(x.goal).includes(a))!;
  h.ambitions.push({ item: amb, state: "stirred", warmth: 0, band: "cold" });
  facts(s, name).places = [a, b];
  evaluateAll(s);
  expect(h.ambitions.at(-1)!.band).toBe("hot");
  s.names = [a, b, c];
  s.who = name;
});
When("the player looks at the map", (s) => {
  s.shimmer = N.shimmer(heritage(s, s.who));
});
Then("the region faintly shimmers", (s) => {
  expect(s.shimmer).toHaveLength(1);
  expect(s.shimmer[0].places).toEqual(s.names);
});
Then("the target is neither outlined nor named", (s) => {
  expect(s.shimmer[0]).toMatchObject({ outline: false, named: false });
});

// HER-074: the free tier only limits which countries can be picked
Given("the player plays the free tier", (s) => {
  s.tier = "free";
});
When("the player picks an allowed country", (s) => {
  s.free = N.newHeritage("portugal", N.exampleHeritage("portugal"));
  N.startCampaign(s.free, new Rng(5), N.emptyWorld());
});
Then("its heritage works exactly as in the full game", (s) => {
  const full = N.newHeritage("portugal", N.exampleHeritage("portugal"));
  N.startCampaign(full, new Rng(5), N.emptyWorld());
  expect(s.free).toEqual(full);
  expect(N.card(s.free)).toEqual(N.card(full));
});
