import { expect } from "vitest";
import { Rng } from "@ph/engine";
import * as R from "@ph/engine/domain/warfare";
import { tree } from "@ph/engine/domain/research";
import { MOVE } from "@ph/engine/domain/troop-movement";
import type { Lord } from "@ph/engine/domain/realm";
import type { Ground } from "@ph/engine/domain/province";
import timeConfig from "../../rules/data/domain/time-and-turns.json" with { type: "json" };
import { steps, type Scenario, type Table } from "../src/registry.ts";

const { Given, When, Then } = steps("warfare");
const W = R.warfareConfig;

// ---------------------------------------------------------------- helpers

/** Work a Given step queued for the scenario's When. */
function hook(s: Scenario, fn: () => void): void {
  (s.hooks ??= []).push(fn);
}
/** Run what the Given steps queued; dual Given/Then steps assert from here on. */
function run(s: Scenario): void {
  const hs: (() => void)[] = s.hooks ?? [];
  s.hooks = [];
  for (const fn of hs) fn();
  s.acted = true;
}
const lord = (name: string, loyalty: Lord["loyalty"] = "Loyal", extra: Partial<Lord> = {}): Lord => ({ name, house: name, provinces: [], retinue: 0, wealth: 0, traits: [], loyalty, sons: [], ...extra });
const ids = (text: string): Set<string> => new Set(text === "none" ? [] : text.split(/,\s*|\s+with\s+|\s+and\s+/).map((t) => R.inventionId(t)).filter((t) => /^[WB]\d+$/.test(t)));
function knownOf(s: Scenario, country = "France"): Set<string> {
  s.knownBy ??= {};
  return (s.knownBy[country] ??= new Set<string>());
}
function realmOf(s: Scenario, country: string): R.RealmWar {
  s.realms ??= {};
  return (s.realms[country] ??= R.newRealmWar(country, { known: knownOf(s, country) }));
}
const company = (s: Scenario): R.Company => {
  expect(s.company, "a company").toBeDefined();
  return s.company;
};
const cmd = (s: Scenario): R.Commander => {
  expect(s.cmd, "a commander").toBeDefined();
  return s.cmd;
};
const pct = (n: number): number => n / 100;
const close = (a: number, b: number, digits = 6): void => expect(a).toBeCloseTo(b, digits);
/** Drill and scars that give a level in era II's main table. */
const LEVEL_II: Record<number, { drill: number; scars: number }> = { 1: { drill: 0, scars: 0 }, 2: { drill: 3, scars: 0 }, 3: { drill: 6, scars: 1 }, 4: { drill: 6, scars: 3 }, 5: { drill: 12, scars: 5 } };
const atLevel = (level: number, init: Partial<R.Company> & { kind?: R.Kind; arm?: string; men?: number } = {}): R.Company =>
  R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, ...LEVEL_II[level]!, ...init } as Parameters<typeof R.newCompany>[0]);

const TROYES_ROW = ["Fields", "Fields", "Fields", "Pasture", "Pasture", "Woods", "Town"];
const ROMAN: Record<string, R.Era> = { I: "I", II: "II", III: "III", IV: "IV", V: "V", VI: "VI", VII: "VII" };
const era = (e: string): R.Era => {
  const v = ROMAN[e];
  if (!v) throw new Error(`era ${e}`);
  return v;
};

// ---------------------------------------------------------------- generic Whens

for (const w of [
  "the month ends",
  "the turn ends",
  "the company is evaluated",
  "the commander is evaluated",
  "the battle is resolved",
  "the warfare config is read",
  "the troop cap and soldiers are counted",
  "the month is played",
  "a week passes",
  "a month passes",
  "the day ends",
  "the siege is evaluated",
  "the peace voices are counted",
  "the battle rules are applied",
  "the rules of its era are applied",
  "the AI plans its turn",
  "the invention effects are applied",
  "the week is played",
  "the bell is resolved",
  "he deploys",
  "the contract is signed",
  "he leads in any battle",
  "he ages further",
  "honours of war are offered",
  "the besieger offers its captain gold",
  "the pursuit is made",
  "a bell's orders are given",
]) When(w, (s) => run(s));

Given("the date is {int}", (s, year: number) => {
  s.year = year;
  s.era = R.eraOfYear(year);
});

Given("the country {string} knows {string}", (s, country: string, inv: string) => {
  for (const i of ids(inv)) knownOf(s, country).add(i);
  s.country = country;
  s.known = knownOf(s, country);
});
Given("the country {string} does not know {string}", (s, country: string, inv: string) => {
  for (const i of ids(inv)) knownOf(s, country).delete(i);
  s.country = country;
  s.known = knownOf(s, country);
});
Given(/^its country (knows|does not know) "([^"]+)"$/, (s, k: string, inv: string) => {
  s.known = k === "knows" ? ids(inv) : new Set<string>();
});

// ---------------------------------------------------------------- companies and arms

Given("the army {string} of the country {string}", (s, name: string, country: string) => {
  s.army = R.newArmy(name, country);
});
When("a company of {int} men of kind {string} and arm {string} is added to it", (s, men: number, kind: R.Kind, arm: string) => {
  s.company = R.newCompany({ kind, arm, men });
  s.army.companies.push(s.company);
});
Then("the company has kind {string} and arm {string}", (s, kind: string, arm: string) => {
  expect(company(s).kind).toBe(kind);
  expect(company(s).arm).toBe(arm);
  expect(s.army.companies).toContain(s.company);
});
Then("the company keeps its own men, drill, scars, arms, pay owed and months out", (s) => {
  const c = company(s);
  for (const k of ["men", "drill", "scars", "arms", "payOwed", "monthsOut"] as const) expect(typeof c[k]).toBe("number");
  expect(c.men).toBe(800);
});

Given("a company of {int} men", (s, men: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men });
});
When(/^(.+) changes its men by (-?\d+)$/, (s, cause: string, change: string) => {
  R.changeMen(company(s), cause, Number(change));
});
Then("the company has {int} men", (s, men: number) => {
  close(company(s).men, men);
});

Given("a company of kind {string} with drill {int}", (s, kind: R.Kind, drill: number) => {
  s.company = R.newCompany({ kind, arm: "levy foot", men: 800, drill });
});
Given(/^the company spent the month (in camp|in winter quarters|in garrison|marching)$/, (s, where: R.Where) => {
  hook(s, () => R.monthDrill(company(s), where));
});
Then("the company has drill {int}", (s, drill: number) => {
  close(company(s).drill, drill);
});
Then("the company has scars {float}", (s, scars: number) => {
  close(company(s).scars, scars);
});

Given("a company of {int} men with drill {int} and scars {int}", (s, men: number, drill: number, scars: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men, drill, scars });
});
When("{int} new men refill it", (s, n: number) => {
  R.addMen(company(s), n, "refilling from recruits");
});

Given("a company with drill {int}", (s, drill: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men: 800, drill });
});
When("the company has a hungry month", (s) => R.hungryMonth(company(s)));

Given("a company with scars {int}", (s, scars: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men: 800, scars });
});
When(/^the company stands through a battle without breaking and its side (wins|loses)$/, (s, r: string) => {
  R.standThrough(company(s), r === "wins");
});
When("{int} years pass without the company fighting a battle", (s, years: number) => {
  R.yearsPass(company(s), years);
});

Given("a company of kind {string} with drill {int} and scars {int}", (s, kind: R.Kind, drill: number, scars: number) => {
  s.company = R.newCompany({ kind, arm: "levy foot", men: 800, drill, scars });
});
When("the company is disbanded", (s) => {
  s.store ??= { arms: 0 };
  s.home ??= { recruitPool: 0, homeless: 0, slotsFree: Infinity };
  R.disbandHome(company(s), s.store, s.home);
});
Then("its drill and scars are reset", (s) => {
  expect(company(s).drill).toBe(0);
  expect(company(s).scars).toBe(0);
});

Given("a company of {int} men of arm {string} carrying {int} loads of arms", (s, men: number, arm: string, loads: number) => {
  s.company = R.newCompany({ kind: "levy", arm, men, arms: loads });
});
When("it captures {int} loads on a won field", (s, n: number) => R.captureArms(company(s), n));
When("{int} of its men are killed", (s, n: number) => R.removeMen(company(s), n, "killed in battle"));
When("it leaves {int} loads on a lost field", (s, n: number) => R.leaveArms(company(s), n));
Then("the company carries {int} loads of arms", (s, n: number) => close(company(s).arms, n));
When("the company fights in a battle", (s) => {
  s.fightsAs = R.fightsAs(company(s));
});
Then("the company fights as arm {string}", (s, arm: string) => expect(s.fightsAs).toBe(arm));

Given("the arm {string}", (s, arm: string) => {
  s.arm = arm;
});
Then("its strength per man is {float}", (s, v: number) => {
  expect(R.armDef(s.arm).strength).toBe(v);
  expect(R.strengthOf(s.arm)).toBe(v);
});
/** "2 loads of arms, 1 powder a battle" → the needs record. */
function parseNeeds(text: string): { needs: R.ArmNeeds; perGiven: boolean } {
  const needs: R.ArmNeeds = {};
  let perGiven = false;
  if (text === "nothing") return { needs, perGiven };
  for (const part of text.split(/,\s*/)) {
    let m: RegExpMatchArray | null;
    if ((m = part.match(/^(\d+) (?:loads? of )?arms$/))) needs.arms = Number(m[1]);
    else if ((m = part.match(/^(\d+) (?:loads? of )?powder(?: (a battle|a month firing))?$/))) {
      needs.powder = Number(m[1]);
      if (m[2]) {
        needs.powder_per = m[2] === "a battle" ? "battle" : "month firing";
        perGiven = true;
      }
    } else if ((m = part.match(/^(\d+) horses( or oxen)?$/))) {
      needs.horses = Number(m[1]);
      if (m[2]) needs.oxen_instead = true;
    } else if ((m = part.match(/^(\d+) remounts$/))) needs.remounts = Number(m[1]);
    else if ((m = part.match(/^(\d+) crew$/))) needs.crew = Number(m[1]);
    else if ((m = part.match(/^(\d+) camels$/))) needs.camels = Number(m[1]);
    else throw new Error(`cannot read need "${part}"`);
  }
  return { needs, perGiven };
}
Then("it needs {string} per 100 men", (s, text: string) => {
  const { needs, perGiven } = parseNeeds(text);
  const cfg = { ...R.armDef(s.arm).needs };
  if (!perGiven) delete cfg.powder_per;
  expect(cfg).toEqual(needs);
});
Then("its roles are {string}", (s, roles: string) => {
  expect(R.armDef(s.arm).roles).toEqual(roles.split(/,\s*/));
});
Then("it is unlocked by {string}", (s, unlock: string) => {
  expect(R.armDef(s.arm).unlock).toBe(unlock === "start" ? "start" : R.inventionId(unlock));
  if (unlock !== "start") expect(tree().inventions.has(R.inventionId(unlock))).toBe(true);
});
Then("it fights at -50 % in forest and jungle with 8 men to an elephant", (s) => {
  expect(R.armGround(s.arm, "forest")).toBe(-0.5);
  expect(R.armGround(s.arm, "jungle")).toBe(-0.5);
  expect(R.armDef(s.arm).men_per_animal).toBe(8);
});
Then("it takes no desert penalty and needs 100 camels per 100 men", (s) => {
  expect(R.armGround(s.arm, "desert")).toBeGreaterThanOrEqual(0);
  expect(R.armGround("light horse", "desert")).toBeLessThan(0);
  expect(R.armDef(s.arm).needs.camels).toBe(100);
});
Given("the country {string} is a Sahel realm in 1444", (s, country: string) => {
  s.realm = { country, regions: ["Sahel"], known: knownOf(s, country) };
});
Then("the country {string} can field the arm {string}", (s, _c: string, arm: string) => {
  expect(R.canField(arm, s.realm)).toBe(true);
  expect(R.canField(arm, { regions: ["the Low Countries"] })).toBe(false);
});

/** "has N loads of powder in its powder store": sets it before the When, checks it after. */
Given("the country {string} has {int} loads of powder in its powder store", (s, country: string, n: number) => {
  if (s.acted) close(realmOf(s, country).powderStore, n);
  else realmOf(s, country).powderStore = n;
  s.country = country;
});
Given("the country {string} has {int} loads of arms in its arms store", (s, country: string, n: number) => {
  if (s.acted) close(realmOf(s, country).armsStore, n);
  else realmOf(s, country).armsStore = n;
  s.country = country;
});
Given(/^its army has (\d+) bombards and (\d+) hand gunners$/, (s, guns: string, men: string) => {
  s.army = R.newArmy("army", s.country, [R.newCompany({ id: "bombards", kind: "levy", arm: "bombards", men: Number(guns) }), R.newCompany({ id: "gunners", kind: "levy", arm: "hand gunners", men: Number(men) })]);
});
Given("its army has {int} hand gunners", (s, men: number) => {
  s.army = R.newArmy("army", s.country, [R.newCompany({ id: "gunners", kind: "levy", arm: "hand gunners", men })]);
});
When("the army fights a battle", (s) => {
  const r = realmOf(s, s.country);
  const store = { powder: r.powderStore };
  s.powder = R.drawBattlePowder(s.army.companies, store);
  r.powderStore = store.powder;
  s.acted = true;
});
Then("its bombards and hand gunners do not fire", (s) => {
  expect(s.powder.silent.map((c: R.Company) => c.id).sort()).toEqual(["bombards", "gunners"]);
});

// ---------------------------------------------------------------- kinds and break points

Given("a company of kind {string}", (s, kind: R.Kind) => {
  s.company = R.newCompany({ kind, arm: "levy foot", men: 1000 });
});
Then("its base break point is {int} %", (s, bp: number) => {
  close(R.kindDef(company(s).kind).break_point, pct(bp));
});
const PAY: Record<string, R.KindDef["pay"]> = {
  "free for the first 3 months, then normal pay": { by: "treasury", multiplier: 1, free_months: 3 },
  "paid by the lord": { by: "lord", multiplier: 0 },
  "three times normal pay": { by: "treasury", multiplier: 3 },
  "1.5 times normal pay, all year": { by: "treasury", multiplier: 1.5, all_year: true },
  "normal pay": { by: "treasury", multiplier: 1 },
  loot: { by: "loot", multiplier: 0 },
};
Then("its pay is {string}", (s, text: string) => {
  expect(R.kindDef(company(s).kind).pay).toEqual(PAY[text]);
});
Then("the country {string} cannot keep a company of kind {string}", (s, country: string, kind: R.Kind) => {
  expect(R.canKeep(kind, knownOf(s, country))).toBe(false);
  expect(R.canKeep(kind, new Set(["W12"]))).toBe(true);
});

Given("a levy company of {int} men that has been out {int} months", (s, men: number, months: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men, monthsOut: months });
  hook(s, () => R.levyGoingHome(company(s), { paidDouble: s.paidDouble === true, known: s.known }));
});
Given(/^it is (paid normally|paid double)$/, (s, p: string) => {
  s.paidDouble = p === "paid double";
});

Given("{int} farmers of Champagne serve as levies", (s, n: number) => {
  s.levied = n;
});
When("the harvest comes while they are away", (s) => {
  s.harvest = R.levyAwayAtHarvest("Champagne", s.levied);
});
Then("the province is told that share of its farmers is away for the harvest", (s) => {
  expect(s.harvest).toEqual({ province: "Champagne", farmersAway: 3250 });
});

Given("the lord {string} is wavering and his retinue serves in an army at war", (s, name: string) => {
  s.lord = lord(name, "Wavering");
  s.retinue = R.newCompany({ kind: "retinue", arm: "armoured foot", men: 800, lord: name });
  s.army = R.newArmy("army", "France", [s.retinue, R.newCompany({ kind: "levy", arm: "levy foot", men: 1000 })]);
});
When("he decides to go home", (s) => {
  s.left = R.lordLeaves(s.army, s.lord.name, { wavering: s.lord.loyalty === "Wavering" });
});
Then("his retinue leaves the army", (s) => {
  expect(s.left).toEqual([s.retinue]);
  expect(s.army.companies).not.toContain(s.retinue);
});

Given("a hired company is owed {int} months of pay", (s, months: number) => {
  s.owed = months;
});
When(/^it stands in the province "([^"]+)" and an enemy offers (nothing|more than its pay owed)$/, (s, _p: string, offer: string) => {
  s.hired = R.hiredBehaviour(s.owed, offer === "nothing" ? 0 : 1000, 500);
});
Then(/^the hired company (will not fight|loots the province it stands in|takes the enemy's offer)$/, (s, does: string) => {
  const want = does === "loots the province it stands in" ? "loots" : does;
  expect(s.hired).toBe(want);
});

Given("a standing regiment with drill {int} and scars {int}", (s, drill: number, scars: number) => {
  s.company = R.newCompany({ kind: "standing regiment", arm: "line infantry", men: 800, drill, scars });
});
When("a year of peace passes", (s) => {
  for (let m = 0; m < 12; m++) R.monthDrill(company(s), "in garrison");
  R.yearsPass(company(s), 1);
});

Given("a stone castle with garrison room {int}", (s, room: number) => {
  expect(R.castleDef("stone castle").room).toBe(room);
  s.room = room;
});
Given("a garrison of {int} men in it", (s, men: number) => {
  s.garrisonMen = men;
});
Then("{int} men of that garrison count toward the troop cap", (s, n: number) => {
  expect(R.garrisonOverRoom(s.garrisonMen, s.room)).toBe(n);
  expect(R.capUse("France", [], [{ owner: "France", men: s.garrisonMen, room: s.room }])).toBe(n);
});

Given("the rebellions context forms a rebel band in the province {string}", (s, province: string) => {
  s.province = province;
  s.band = R.newCompany({ id: "band", kind: "rebel band", arm: "levy foot", men: 2000 });
});
When("it meets a royal army", (s) => {
  const rebels = R.newArmy("rebels", "rebels", [s.band], { commander: R.newCommander("rebel leader") });
  const royal = R.newArmy("royal", "France", [R.newCompany({ kind: "levy", arm: "levy foot", men: 2000, drill: 3 }), R.newCompany({ kind: "levy", arm: "archers", men: 1000, arms: 10, drill: 3 })], { commander: R.newCommander("royal commander", { cunning: 1 }) });
  s.result = R.fightBattle({ attacker: { country: "rebels", army: rebels, known: new Set() }, defender: { country: "France", army: royal, known: new Set(), content: 1 }, sectors: R.battlefield(TROYES_ROW), ground: "farmland", era: "I" });
});
Then("the rebel band fights by the battle rules as kind {string}", (s, kind: R.Kind) => {
  expect(s.band.kind).toBe(kind);
  close(R.breakPoint(s.band, { era: "I" }), W.kinds["rebel band"].break_point);
  close(R.fleeShare(s.band, { content: 1 }), W.flee.rebel);
  expect(s.result.losses["rebels"].killed + s.result.losses["rebels"].fled).toBeGreaterThan(0);
  expect([s.result.winner, s.result.loser].sort()).toEqual(["France", "rebels"]);
});

Given("a company of kind {string} with base break point {int} %", (s, kind: R.Kind, bp: number) => {
  s.company = R.newCompany({ kind, arm: "levy foot", men: 1000 });
  close(R.kindDef(kind).break_point, pct(bp));
  s.bctx = {} as R.BreakContext;
});
Given("it defends its own homeland", (s) => {
  s.bctx.homeland = true;
});
Given("it is hungry", (s) => {
  s.hungry = true;
  if (s.bctx) s.bctx.hungry = true;
  if (s.hitCtx) s.hitCtx.hungry = true;
  if (s.levelTest) R.hungryMonth(company(s));
});
Given("it is owed {int} months of pay", (s, n: number) => {
  company(s).payOwed = n;
});
Given("its army's commander has the trait {string}", (s, t: string) => {
  s.bctx.traits = [t];
});
Then("its break point is {int} %", (s, bp: number) => {
  close(R.breakPoint(company(s), s.bctx), pct(bp));
});

// ---------------------------------------------------------------- the realm's soldiers and troop cap

Given("the country {string} has {int} men in armies and {int} men in garrisons", (s, country: string, armies: number, garrisons: number) => {
  s.country = country;
  s.armyMen = armies;
  s.garrisonMen = garrisons;
});
Then("the country {string} has {int} soldiers", (s, _c: string, n: number) => {
  expect(R.soldiers(s.armyMen, s.garrisonMen)).toBe(n);
});
When("its forges make {int} loads", (s, n: number) => void R.armsStore(realmOf(s, s.country), { forges: n }));
When("a disbanded company hands back {int} loads", (s, n: number) => void R.armsStore(realmOf(s, s.country), { handedBack: n }));
When("{int} loads are issued to a company", (s, n: number) => void R.armsStore(realmOf(s, s.country), { issued: n }));
When("a year of rust passes", (s) => void R.armsStore(realmOf(s, s.country), { rustYears: 1 }));
When("its powder mills make {int} loads", (s, n: number) => void R.powderStore(realmOf(s, s.country), { mills: n }));
When("a year of damp passes", (s) => void R.powderStore(realmOf(s, s.country), { dampYears: 1 }));
When("a castle magazine of {int} loads is captured", (s, n: number) => void R.powderStore(realmOf(s, s.country), { magazineCaptured: n }));

Given("the country {string} holds {int} prisoners", (s, country: string, n: number) => {
  realmOf(s, country).prisoners = n;
  s.country = country;
});
Then("{int} rations are eaten by its prisoners", (s, n: number) => {
  expect(R.prisonerRations(realmOf(s, s.country).prisoners)).toBe(n);
});

Given("the country {string} won {int} battles in {int} and {int} in {int}", (s, country: string, a: number, y1: number, b: number, y2: number) => {
  const r = realmOf(s, country);
  r.victories.push(...Array(a).fill(y1), ...Array(b).fill(y2));
  s.country = country;
});
Then("the country {string} has {int} victories", (s, country: string, n: number) => {
  expect(R.recentCount(realmOf(s, country).victories, s.year)).toBe(n);
});

Given("the country {string} has {int} people in royal provinces with an official", (s, country: string, people: number) => {
  s.country = country;
  s.capProvinces = [{ people, royal: true, official: true }];
});
Given("{int} people in royal provinces without one", (s, people: number) => {
  s.capProvinces.push({ people, royal: true, official: false });
});
Given("it has {int} castles", (s, n: number) => {
  s.castleRooms = Array(n).fill(R.castleDef("stone castle").room);
});
Then("the troop cap of {string} is {int} plus the garrison room of its {int} castles", (s, _c: string, base: number, n: number) => {
  expect(s.castleRooms.length).toBe(n);
  close(R.troopCap(s.capProvinces, s.castleRooms), base + s.castleRooms.reduce((a: number, b: number) => a + b, 0));
  close(R.troopCap(s.capProvinces, []), base);
});
Given("a royal province of {int} people with a muster master", (s, people: number) => {
  s.capProvince = { people, royal: true, official: true, musterMaster: true };
});
Given("a royal province of {int} people with an official", (s, people: number) => {
  s.capProvince = { people, royal: true, official: true };
});
Given("the country knows {string}", (s, inv: string) => {
  s.known = ids(inv);
});
Then("it adds {int} to the troop cap", (s, n: number) => {
  close(R.provinceCap(s.capProvince, s.known), n);
});

Given("the country {string} has a company of kind {string}", (s, country: string, kind: R.Kind) => {
  s.country = country;
  s.company = R.newCompany({ kind, arm: "levy foot", men: 1000 });
});
Then(/^the company (counts|does not count|counts only above its castle's room) toward the troop cap of "([^"]+)"$/, (s, counts: string, country: string) => {
  expect(R.countsTowardCap(company(s).kind)).toBe(counts);
  if (counts !== "counts only above its castle's room") expect(R.capUse(country, [{ owner: country, companies: [company(s)] }])).toBe(counts === "counts" ? 1000 : 0);
  else expect(R.capUse(country, [], [{ owner: country, men: 1000, room: 2000 }])).toBe(0);
});
Given("the royal province {string} with an official is occupied by {string}", (s, province: string, by: string) => {
  s.province = province;
  s.capProvince = { people: 300000, royal: true, official: true, occupied: by !== "" };
});
Then("{string} adds nothing to the troop cap of {string}", (s) => {
  expect(R.provinceCap(s.capProvince)).toBe(0);
  expect(R.provinceCap({ ...s.capProvince, occupied: false })).toBeGreaterThan(0);
  expect(R.provinceCap({ ...s.capProvince, occupied: false, inRevolt: true })).toBe(0);
});
Given("the lord {string} holds {int} provinces in France with about {int} people, all with his officials", (s, name: string, n: number, people: number) => {
  s.lord = lord(name, "Loyal");
  s.lands = Array.from({ length: n }, () => ({ people: people / n, official: true }));
  s.retinue = R.newCompany({ kind: "retinue", arm: "armoured foot", men: 8000, lord: name });
});
Then("his retinue cap is about {int}", (s, n: number) => {
  expect(Math.round(R.lordCap(s.lands) / 1000) * 1000).toBe(n);
});
Then("his retinue does not count toward the troop cap of {string}", (s, country: string) => {
  expect(R.capUse(country, [{ owner: country, companies: [s.retinue] }])).toBe(0);
});
Given("the country {string} is an ally of {string} with an army in France", (s, ally: string) => {
  s.allyArmy = { owner: ally, companies: [R.newCompany({ kind: "levy", arm: "levy foot", men: 3000 })] };
});
Then("that army counts toward the troop cap of {string} and not of {string}", (s, ally: string, host: string) => {
  expect(R.capUse(ally, [s.allyArmy])).toBe(3000);
  expect(R.capUse(host, [s.allyArmy])).toBe(0);
});
Given("the country {string} has {int} more soldiers counting toward its troop cap than the cap allows", (s, country: string, over: number) => {
  s.country = country;
  s.over = R.overCap(100000 + over, 100000);
});
Then("the country {string} cannot raise or hire anyone", (s) => expect(s.over.canRaise).toBe(false));
Then("each of the {int} soldiers over the cap costs double pay", (s, n: number) => {
  expect(s.over.doublePayFor).toBe(n);
  expect(W.over_cap.pay).toBe(2);
});
Then("its levies desert {int} % a month until it is back under the cap", (s, p: number) => {
  close(s.over.levyDesertion, pct(p));
  expect(R.overCap(100000, 100000).levyDesertion).toBe(0);
});
Given("the country {string} is under its troop cap", (s, country: string) => {
  s.country = country;
  expect(R.overCap(50000, 95000).canRaise).toBe(true);
});
When("it joins all its armies into one army of {int} men", (s, men: number) => {
  s.allowed = R.armySizeAllowed(men);
});
Then("the army is allowed", (s) => expect(s.allowed).toBe(true));

// ---------------------------------------------------------------- raising and keeping an army

const TOWN_OF: Record<string, string> = { Champagne: "Troyes" };
Given("recruiting levies {int} men in the region {string}", (s, men: number, region: string) => {
  s.levy = R.receiveLevy(men, TOWN_OF[region]!, region);
});
When("{int} weeks pass", (s, weeks: number) => {
  s.days = weeks * W.days_per_week;
});
Then("{int} men of kind {string} and arm {string} with drill {int} stand at {string}", (s, men: number, kind: string, arm: string, drill: number, at: string) => {
  expect(s.days).toBeGreaterThanOrEqual(s.levy.afterDays);
  expect(s.levy.company).toMatchObject({ men, kind, arm, drill });
  expect(s.levy.at).toBe(at);
});
When("recruiting levies men in a province on a railway", (s) => {
  s.gather = R.levyGathering({ known: s.known, railway: true });
});
Then("they gather in days instead of 2 weeks", (s) => {
  expect(s.gather.inDays).toBe(true);
  expect(R.levyGathering({ railway: true })).toEqual({ days: 14, inDays: false });
});

const LOYALTY: Record<string, Lord["loyalty"]> = { loyal: "Loyal", wavering: "Wavering", disloyal: "Disloyal", "in revolt": "In revolt" };
Given(/^the lord "([^"]+)" is (loyal|wavering|disloyal|in revolt) with a retinue of (\d+) men$/, (s, name: string, l: string, men: string) => {
  s.lord = lord(name, LOYALTY[l]!, { retinue: Number(men) });
});
Given("the lord {string} is wavering", (s, name: string) => {
  s.lord = lord(name, "Wavering", { retinue: 2000, want: "Take land" });
});
Given("the war aim of {string} is his Want", (s) => {
  s.warAim = s.lord.want;
});
When("the country {string} calls the lords", (s) => {
  s.answer = R.callLord(s.lord, s.warAim === undefined ? {} : { warAim: s.warAim });
  s.again = R.callLord(s.lord, { calledBefore: true });
});
Then("he brings {int} men in {int} weeks and may lead them as a captain", (s, men: number, weeks: number) => {
  expect(s.answer).toMatchObject({ men, days: weeks * 7, mayCaptain: true, goesHomeAfter: null });
});
Then("he brings {int} men in {int} weeks and goes home after {int} months", (s, men: number, weeks: number, months: number) => {
  expect(s.answer).toMatchObject({ men, days: weeks * 7, goesHomeAfter: months });
});
Then("he refuses and calling him again makes him angrier", (s) => {
  expect(s.answer.refuses).toBe(true);
  expect(s.again.angrier).toBe(true);
});
Then("his retinue is a rebel army", (s) => expect(s.answer.rebelArmy).toBe(true));
Then("he brings his retinue and stays to the end of the war", (s) => {
  expect(s.answer.men).toBeGreaterThan(0);
  expect(s.answer.goesHomeAfter).toBeNull();
  expect(R.callLord(s.lord).goesHomeAfter).toBe(W.lords.wavering_stay_months);
});
Given("the lord {string} serves with his retinue in the army of {string}", (s, name: string, country: string) => {
  s.lord = lord(name, "Loyal");
  s.retinue = R.newCompany({ kind: "retinue", arm: "knights and lancers", men: 1000, lord: name });
  s.army = R.newArmy("army", country, [s.retinue]);
});
When("the enemy occupies one of his provinces", (s) => {
  s.left = R.lordLeaves(s.army, s.lord.name, { landsOccupied: true });
});
Then("he leaves with his retinue to defend his lands", (s) => {
  expect(s.left).toEqual([s.retinue]);
  expect(s.army.companies).toHaveLength(0);
});

function contract(country: string, months: number): R.Contract {
  return { company: R.newCompany({ kind: "hired company", arm: "pikes", men: 800, arms: 8 }), captain: "a Swiss captain", people: "Swiss Confederacy", months, upFront: 3000, monthlyPay: 1200 };
}
Given("the country {string} signs a contract for {int} months with a Swiss mercenary company", (s, country: string, months: number) => {
  s.country = country;
  s.army = R.newArmy("army", country);
  s.treasury = { gold: 10000 };
  s.contract = contract(country, months);
  hook(s, () => (s.hire = R.hire(s.army, s.treasury, s.contract)));
});
Then("the company joins its army", (s) => {
  expect(s.army.companies).toContain(s.contract.company);
  expect(s.contract.company.kind).toBe("hired company");
});
Then("Venice pays gold up front and monthly pay", (s) => {
  expect(s.treasury.gold).toBe(10000 - s.contract.upFront);
  expect(R.payThisMonth(s.contract.company)).toEqual({ treasury: true, multiplier: 3 });
});
Then("no recruits are taken from its provinces", (s) => expect(s.hire.recruitsTaken).toBe(0));
Given("the country {string} has a hired mercenary company", (s, country: string) => {
  s.contract = contract(country, 6);
  s.state = { monthsServed: 2 };
});
When("its contract ends", (s) => {
  s.state.monthsServed = s.contract.months;
});
When("an enemy outbids Venice", (s) => {
  s.state.enemyOffer = s.contract.monthlyPay * 2;
});
Then("the mercenary company leaves Venice's service", (s) => {
  expect(R.hireEnds(s.contract, s.state)).toBe(true);
  expect(R.hireEnds(s.contract, { monthsServed: 2 })).toBe(false);
});

Given("a company of kind {string} that has been out {int} months", (s, kind: R.Kind, months: number) => {
  s.company = R.newCompany({ kind, arm: "levy foot", men: 800, monthsOut: months });
});
Then(/^the treasury (pays|does not pay) its pay$/, (s, p: string) => {
  expect(R.treasuryPays(company(s))).toBe(p === "pays");
});

Given("an army of {int} soldiers, {int} horses and {int} prisoners", (s, soldiers: number, horses: number, prisoners: number) => {
  s.eater = { soldiers, horses, prisoners };
});
Given(/^the army stands (in its own province|in an enemy province)$/, (s, where: string) => {
  s.atHome = where === "in its own province";
});
When("a turn is played", (s) => run(s));
Then(/^it eats (\d+) rations from (the province it stands in|its food reserve)$/, (s, n: string, from: string) => {
  close(R.weekRations(s.eater), Number(n));
  expect(R.foodSource(s.atHome)).toBe(from);
});
Then("a month's rations are {int}", (s, n: number) => expect(R.monthRations(s.eater)).toBe(n));

Given("a levy company of {int} men from {string} carrying {int} loads of arms", (s, men: number, home: string, arms: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "armoured foot", men, arms, home });
  s.store = { arms: 0 };
  s.home = { recruitPool: 0, homeless: 0, slotsFree: Infinity };
});
Then("{int} men return to the recruit pool of {string}", (s, men: number) => {
  expect(s.home.recruitPool).toBe(men);
  expect(s.home.homeless).toBe(0);
});
Then("{int} loads of arms return to the arms store", (s, n: number) => expect(s.store.arms).toBe(n));
Given("{int} men disband into the province {string} whose slots filled while they were away", (s, men: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men });
  s.home = { recruitPool: 0, homeless: 0, slotsFree: 0 };
  s.store = { arms: 0 };
});
When("they come home", (s) => R.disbandHome(company(s), s.store, s.home));
Then("the province {string} receives them as homeless", (s) => {
  expect(s.home.homeless).toBe(2000);
  expect(s.home.recruitPool).toBe(0);
});

// ---------------------------------------------------------------- commanders and captains

Given("the commander {string} of the country {string}", (s, name: string, country: string) => {
  s.cmd = R.namedCommander(name);
  expect(s.cmd.country).toBe(country);
});
Then("he has Might {int}, Cunning {int} and Logistics {int}", (s, m: number, c: number, l: number) => {
  expect([cmd(s).might, cmd(s).cunning, cmd(s).logistics]).toEqual([m, c, l]);
});
Then("he has the style {string} and the trait {string}", (s, style: string, trait: string) => {
  expect(cmd(s).styles).toEqual([style]);
  expect(cmd(s).traits).toEqual([trait]);
  R.style(style);
  expect(W.traits).toHaveProperty(trait);
});
Then("he has {int} victories, {int} defeat, {int} wound and age {int}", (s, v: number, d: number, w: number, a: number) => {
  expect([cmd(s).victories, cmd(s).defeats, cmd(s).wounds, cmd(s).age]).toEqual([v, d, w, a]);
});

Given("a commander with Might {int} and {int} victories", (s, might: number, victories: number) => {
  s.cmd = R.newCommander("a commander", { might, victories });
});
When(/^he (wins a battle|wins a battle while outnumbered)$/, (s, w: string) => {
  R.winBattle(cmd(s), { outnumbered: w.endsWith("outnumbered") });
});
Then("he has Might {int}", (s, n: number) => expect(cmd(s).might).toBe(n));
Given("a commander with Might {int} aged {int}", (s, might: number, age: number) => {
  s.cmd = R.newCommander("a commander", { might, age, cunning: 3 });
});
When("he takes a serious wound", (s) => R.seriousWound(cmd(s)));
When("he turns {int}", (s, age: number) => {
  while (cmd(s).age < age) R.birthday(cmd(s));
});
Given("a commander with Cunning {int}", (s, cunning: number) => {
  s.cmd = R.newCommander("a commander", { cunning });
});
When("he wins a battle in which he gave more orders than the enemy commander", (s) => R.winBattle(cmd(s), { moreOrders: true }));
When("he makes a clean withdrawal from a lost battle", (s) => R.loseBattle(cmd(s), { cleanWithdrawal: true }));
Then("he has Cunning {int}", (s, n: number) => expect(cmd(s).cunning).toBe(n));
Given("a commander with Cunning {int} aged {int}", (s, cunning: number, age: number) => {
  s.cmd = R.newCommander("a commander", { cunning, age, might: 3 });
});
When("he is ambushed and loses", (s) => R.loseBattle(cmd(s), { ambushed: true }));
Given("a commander with Logistics {int}", (s, logistics: number) => {
  s.cmd = R.newCommander("a commander", { logistics });
  s.logistics = logistics;
});
When("he spends a full year in the field without a hungry month", (s) => R.logisticsYear(cmd(s)));
When("he takes command after years as a steward official", (s) => R.takeCommandAfterOffice(cmd(s), "steward"));
Then("he has Logistics {int}", (s, n: number) => expect(cmd(s).logistics).toBe(n));
When("his army spends a month at no food", (s) => R.armyStarved(cmd(s)));
Given("a commander with Logistics {int} aged {int}", (s, logistics: number, age: number) => {
  s.cmd = R.newCommander("a commander", { logistics, age });
});
Then("his Logistics can fall", (s) => {
  expect(R.skillsAgeTakes(cmd(s))).toContain("Logistics");
  expect(R.skillsAgeTakes(R.newCommander("young", { age: 50 }))).not.toContain("Logistics");
});
Given("an academy trains a commander", (s) => {
  s.base = { cunning: 1, logistics: 1 };
  s.grads = [R.academyGraduate("a graduate", "Cunning", s.base), R.academyGraduate("another", "Logistics", s.base)];
  s.cmd = s.grads[0];
});
Then("he starts with +1 Cunning or +1 Logistics", (s) => {
  expect(s.grads[0].cunning).toBe(2);
  expect(s.grads[0].logistics).toBe(1);
  expect(s.grads[1].logistics).toBe(2);
});
Then("he has {int} victories", (s, n: number) => expect(cmd(s).victories).toBe(n));

Given("a commander with trait {string}", (s, trait: string) => {
  s.cmd = R.newCommander("a commander", { traits: [trait] });
});
When(/^his army (loses|wins) a battle$/, (s, r: string) => {
  s.won = r === "wins";
});
Then("his chance of a serious wound is {int} in {int}", (s, a: number, b: number) => {
  close(R.woundChance(cmd(s), s.won), a / b);
});
const trait = (s: Scenario): Record<string, number | boolean | string> => R.traitEffects(cmd(s).traits[0]!);
Then("his army's break point is +5 %", (s) => {
  close(trait(s)["army_break"] as number, 0.05);
  const c = R.newCompany({ kind: "levy", arm: "levy foot", men: 1000 });
  close(R.breakPoint(c, { traits: cmd(s).traits }) - R.breakPoint(c), 0.05);
});
Then("his army has +10 % strength, -5 % break point and losses x1.3 for both sides", (s) => {
  expect(trait(s)).toMatchObject({ strength: 0.1, army_break: -0.05, losses: 1.3 });
});
Then("he is never ambushed while marching Careful and spots hidden companies as with +1 Cunning", (s) => {
  expect(trait(s)).toMatchObject({ never_ambushed_careful: true, spot_bonus: 1 });
  expect(R.seesHidden({ cunning: 2, careful: true }, 3)).toBe(true);
  expect(R.seesHidden({ cunning: 2 }, 3)).toBe(false);
});
Then("desertion in his army is halved and levies stay 3 months longer", (s) => {
  expect(trait(s)).toMatchObject({ desertion: 0.5, levy_extra_months: 3 });
  const levy = R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, monthsOut: 8 });
  expect(R.levyGoingHome(levy, { beloved: true })).toBe(0);
});
Then("sacks pay 50 % more and enemy garrisons won't accept his terms", (s) => {
  const p = { yearTax: 1000, townBuildings: 3, townsfolk: 1000 };
  expect(R.sack("Plunder", { ...p, cruel: true }).gold).toBe(1.5 * R.sack("Plunder", p).gold);
  expect(R.aiAcceptsHonours({ breaches: 1, foodMonths: 6, reliefDays: null, cruel: true })).toBe(false);
});
Then("his breaches come 25 % faster", (s) => {
  const sm = R.hasTrait(cmd(s), "Siege master");
  close(R.breachSpeed({ siegeMaster: sm, bombards: 4, fieldGuns: 0 }, false), 1.25);
});
Then("his Shock is +10 % and his Turn orders with Shock give hits x2", (s) => {
  expect(trait(s)).toMatchObject({ shock: 0.1, turn_shock_hits: 2 });
});
Then("drill of his companies rises 2 a month", (s) => {
  const c = R.newCompany({ kind: "levy", arm: "levy foot", men: 800, drill: 2 });
  R.monthDrill(c, "in camp", { oldSoldier: R.hasTrait(cmd(s), "Old soldier") });
  expect(c.drill).toBe(4);
});
Then("he keeps a tenth of all loot and takes bribes from garrisons", (s) => {
  expect(trait(s)).toMatchObject({ loot_share: 0.1, takes_bribes: true });
});
Given("a commander with trait {string} occupies the province {string}", (s, t: string, province: string) => {
  s.cmd = R.newCommander("a commander", { traits: [t] });
  s.province = province;
});
Then("{string} gains Burned homes faster than under another commander", (s) => {
  expect(R.traitEffects("Cruel")["burned_homes_faster"]).toBe(true);
  expect(R.hasTrait(cmd(s), "Cruel")).toBe(true);
});
Given("a commander with trait {string} and {int} victories", (s, t: string, v: number) => {
  s.cmd = R.newCommander("a commander", { traits: [t], victories: v });
});
Then("he may gain a second trait", (s) => {
  expect(R.maySecondTrait(cmd(s))).toBe(true);
  expect(R.maySecondTrait(R.newCommander("x", { traits: ["Steady"], victories: 9 }))).toBe(false);
});
Given("an army whose player has not set its standing orders", (s) => {
  s.army = R.newArmy("army", "France");
});
Given("its commander has trait {string}", (s, t: string) => {
  s.army.commander = R.newCommander("a commander", { traits: [t] });
});
const RATIO: Record<string, number | null> = { never: null, "3 to 2": 1.5, "2 to 1": 2 };
Then("its standing order {string} is {string}", (s, _o: string, ratio: string) => {
  expect(R.defaultOrders(s.army).retreat).toBe(RATIO[ratio]);
});
Given("the army of {string} wins a battle", (s) => {
  s.offers = R.promotionOffers(true);
});
Then("the player is offered one company captain who stood to promote to commander", (s) => {
  expect(s.offers).toBe(1);
  expect(R.promotionOffers(false)).toBe(0);
});
Given("the commander {string} leads an army", (s, name: string) => {
  s.cmd = R.namedCommander(name);
  s.army = R.newArmy("army", s.cmd.country, [], { commander: s.cmd });
});
When(/^his army loses a battle and he is killed \(1 in 20\)$/, (s) => {
  expect(R.deathChance(cmd(s)).chance).toBe(1 / 20);
  s.loss = R.loseCommander(s.army, "killed");
});
When("he is captured", (s) => { s.loss = R.loseCommander(s.army, "captured"); });
When("he dies of old age", (s) => { s.loss = R.loseCommander(s.army, "old age"); });
When("he is dismissed", (s) => { s.loss = R.loseCommander(s.army, "dismissed", s.lord); });
When("he defects with his army", (s) => { s.loss = R.loseCommander(s.army, "defected"); });
Then("the country {string} loses him as a commander", (s) => {
  expect(s.loss.lost).toBe(true);
  expect(s.army.commander).toBeUndefined();
});
Given("the commander {string} is granted land as a new lord", (s, name: string) => {
  s.cmd = R.namedCommander(name);
  s.army = R.newArmy("army", "France", [], { commander: s.cmd });
  s.loss = R.loseCommander(s.army, "granted land");
});
Then("he leads only his own retinue", (s) => expect(s.loss.leadsOnlyRetinue).toBe(true));
Given("the lord {string} commands an army of {string}", (s, name: string, country: string) => {
  s.lord = lord(name, "Loyal");
  s.army = R.newArmy("army", country, [], { commander: R.newCommander(name) });
});
Then("the lord {string} wavers", (s) => expect(s.lord.loyalty).toBe("Wavering"));
Given("the army {string} with commander {string} in style {string}", (s, name: string, c: string, style: string) => {
  s.cmd = R.newCommander(c, { styles: [style] });
  s.army = R.newArmy(name, "France", [], { commander: s.cmd });
});
Given("captains {string} and {string}", (s, a: string, b: string) => {
  s.captains = { [a]: R.newCommander(a), [b]: R.newCommander(b) };
  expect(R.addCaptain(s.army, s.captains[a])).toBe(true);
  expect(R.addCaptain(s.army, s.captains[b])).toBe(true);
});
When("the captain {string} has won {int} battles under him", (s, name: string, n: number) => {
  for (let i = 0; i < n; i++) R.captainWins(s.captains[name], cmd(s));
});
Then("the captain {string} knows the style {string}", (s, name: string, style: string) => {
  expect(s.captains[name].styles).toContain(style);
});
Then("the army cannot take a third captain", (s) => {
  expect(R.addCaptain(s.army, R.newCommander("a third"))).toBe(false);
  expect(s.army.captains).toHaveLength(2);
});
Given("a commander with {int} victories who has led the same standing regiments for {int} years", (s, v: number, years: number) => {
  s.cmd = R.newCommander("a general", { victories: v });
  s.years = years;
});
Then("those regiments follow him before the crown", (s) => {
  expect(R.theirMan(cmd(s), s.years)).toBe(true);
  expect(R.throneOffer(cmd(s), s.years, {})).toBe(false);
});
When("the ruler of his country is a child", (s) => {
  s.childRuler = true;
});
Then("events can offer him the throne or a march on the capital", (s) => {
  expect(R.throneOffer(cmd(s), s.years, { childRuler: s.childRuler })).toBe(true);
});

// ---------------------------------------------------------------- march effects and seeing the enemy

Given("an army on forced march with {int} levies", (s, levies: number) => {
  s.levies = levies;
  s.march = R.marchEffects("Forced");
});
Then("its sickness is doubled", (s) => {
  expect(s.march.sickness).toBe(2);
  close(R.sicknessLoss(s.levies, "Medium", { doubled: true }), 2 * R.sicknessLoss(s.levies, "Medium"));
});
Then("{int} % of its levies desert each week", (s, p: number) => close(s.march.levyDesertionWeek, pct(p)));
Then("if it arrives into a battle it has {int} % strength on the first day", (s, p: number) => {
  close(s.march.firstDayStrength, pct(p));
  const c = R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, fixedLevel: 2 });
  close(R.hitsOf(c, { forcedFirstDay: true }), R.hitsOf(c) * (1 + pct(p)));
});
Given("an army marching Careful", (s) => {
  s.march = R.marchEffects("Careful");
});
Then("it cannot be ambushed", (s) => expect(s.march.ambushable).toBe(false));
Then("its scouts see two provinces ahead", (s) => {
  expect(s.march.scoutRange).toBe(2);
  expect(R.sightRange(0, { careful: true })).toBe(2);
});
Given("the country {string} has an army with {int} light horse at {string}", (s, _c: string, riders: number) => {
  s.range = R.sightRange(R.ridersOf(riders ? [R.newCompany({ kind: "levy", arm: "light horse", men: riders })] : []));
});
Given("an enemy army stands {int} provinces from {string} outside France", (s, d: number) => {
  s.seen = { distanceToArmy: d, range: s.range };
});
Then(/^France (sees|does not see) that enemy army$/, (s, v: string) => {
  expect(R.sees(s.seen)).toBe(v === "sees");
});
Given("an enemy army stands in a French province next to a French castle", (s) => {
  s.seen = { inOwnProvince: true, nextToOwnCastle: true, distanceToArmy: 9, range: 1 };
});
Given("an army of {int} men near {string} beyond French sight", (s, men: number, place: string) => {
  s.rumour = R.rumour(men, place, new Rng(7));
});
Then("France sees a rumour of between about {int} and about {int} men near {string}", (s, low: number, high: number, place: string) => {
  expect(Math.round(s.rumour.low)).toBe(low);
  expect(Math.round(s.rumour.high)).toBe(high);
  expect(s.rumour.men).toBeGreaterThanOrEqual(low);
  expect(s.rumour.men).toBeLessThanOrEqual(high + 1);
  expect(s.rumour.place).toBe(place);
});
Given("two AI armies far from any of the player's armies", (s) => {
  s.observerIsPlayer = false;
});
Then("rumours and scouting are not worked out for them", (s) => {
  expect(R.scoutingWorkedOut(s.observerIsPlayer)).toBe(false);
  expect(R.scoutingWorkedOut(true)).toBe(true);
});

// ---------------------------------------------------------------- supply

/** A supply province, made on first mention. */
function sprov(s: Scenario, id: string): R.SupplyProvince {
  s.provs ??= {};
  return (s.provs[id] ??= { id, localStore: 50000, grievances: {}, town: true, foraging: "Rich" });
}
/** An army's supply: 10,000 soldiers eating 20,000 rations a month, 40 wagons. */
function supply(s: Scenario, owner: string, init: Partial<R.Supply> = {}): R.Supply & { owner: string; monthly: number } {
  s.sup = { owner, monthly: 20000, wagons: 40, reserve: 40000, reserveSize: 2, ...init };
  if (s.known) s.sup.known = s.known;
  return s.sup;
}
/** Queue a week of supply in a province. */
function supplyIn(s: Scenario, id: string, atHome: boolean): void {
  hook(s, () => {
    s.before = { ...sprov(s, id) };
    s.take = R.supplyWeek(s.sup, sprov(s, id), atHome);
  });
}

Given("an army of {int} soldiers and no horses on campaign", (s, soldiers: number) => {
  s.eater = { soldiers };
});
Given("its commander has Logistics {int}", (s, logistics: number) => {
  s.logistics = logistics;
  if (s.eater) s.eater.logistics = logistics;
  if (s.sick) s.sick.logistics = logistics;
});
Then("it eats {int} rations", (s, n: number) => close(R.monthRations(s.eater), n));

Given("the castle of {string} holds food above its siege reserve", (s, id: string) => {
  Object.assign(sprov(s, id), { castleOf: "France", castleStore: 30000, siegeReserve: 10000 });
});
Given("the castle of {string} holds exactly its siege reserve", (s, id: string) => {
  Object.assign(sprov(s, id), { castleOf: "France", castleStore: 10000, siegeReserve: 10000 });
});
Given("an army of {string} at {string} with a full reserve", (s, owner: string, id: string) => {
  supply(s, owner);
  supplyIn(s, id, true);
});
Given("an army of {string} at {string} needs food", (s, owner: string, id: string) => {
  supply(s, owner);
  supplyIn(s, id, true);
});
Given("an army of {string} at {string} whose reserve is missing {int} rations", (s, owner: string, id: string, missing: number) => {
  supply(s, owner, { reserve: 40000 - missing });
  supplyIn(s, id, true);
});
Given("{string} has no castle of France", (s, id: string) => {
  delete sprov(s, id).castleOf;
});
Then("the army takes its week's meals from the castle store of {string}", (s, id: string) => {
  close(s.take.fromCastle, R.weekOf(s.sup.monthly));
  close(sprov(s, id).castleStore!, 30000 - R.weekOf(s.sup.monthly));
});
Then("the local store of {string} is not touched", (s, id: string) => {
  expect(s.take.fromLocal).toBe(0);
  expect(sprov(s, id).localStore).toBe(s.before.localStore);
});
Then("it takes its week's meals plus {int} rations from the local store of {string}", (s, n: number, id: string) => {
  close(s.take.fromLocal, R.weekOf(s.sup.monthly) + n);
  close(sprov(s, id).localStore, s.before.localStore - R.weekOf(s.sup.monthly) - n);
});
Then("its reserve is full", (s) => close(s.sup.reserve, R.reserveRoom(s.sup)));
Then("the army takes its food from the local store of {string}", (s, id: string) => {
  expect(s.take.fromCastle).toBe(0);
  expect(sprov(s, id).castleStore).toBe(10000);
  close(s.take.fromLocal, R.weekOf(s.sup.monthly));
});

Given(/^an army of "([^"]+)" stands in (an enemy province|a neutral province|an ally's province)$/, (s, owner: string) => {
  supply(s, owner, { reserve: 30000 });
  supplyIn(s, "abroad", false);
});
Then("it eats from its food reserve", (s) => {
  close(s.take.fromReserve, R.weekOf(s.sup.monthly));
  expect(s.take.fromLocal + s.take.plundered).toBe(0);
});
Then("its reserve shrinks", (s) => close(s.sup.reserve, 30000 - R.weekOf(s.sup.monthly)));

Given("an army of {string} with an empty reserve in the enemy province {string}", (s, owner: string, id: string) => {
  supply(s, owner, { reserve: 0 });
  sprov(s, id).localStore = 5000;
  s.place = id;
});
Given("the ground of {string} has foraging rating {string}", (s, id: string, r: string) => {
  sprov(s, id).foraging = R.rating(r);
});
When("it takes {int} rations' worth from the local store", (s, n: number) => {
  s.got = R.plunder(sprov(s, s.place), n).got;
});
Then("it gets {int} rations", (s, n: number) => close(s.got, n));

Given("an army with an empty reserve in an enemy province whose local store is gone", (s) => {
  supply(s, "France", { reserve: 0 });
  Object.assign(sprov(s, "Langres"), { localStore: 0, tiles: [{ use: "Fields", seasonFood: 15000 }, { use: "Fields", seasonFood: 15000 }, { use: "Woods" }] });
  supplyIn(s, "Langres", false);
});
Then("one tile of the province turns burned", (s) => {
  expect(s.take.burnedTile).toBe(true);
  expect(sprov(s, "Langres").tiles!.filter((t) => t.burned)).toHaveLength(1);
});
Then("the army eats one season of that tile's food at once", (s) => expect(s.take.plundered).toBe(15000));
Then("its reserve stays empty", (s) => expect(s.sup.reserve).toBe(0));

Given("an army with {int} rations in its reserve and room for {int}", (s, reserve: number, room: number) => {
  supply(s, "France", { reserve, wagons: room / W.wagon.rations });
});
Given("an army with {int} rations in its reserve and a commander with Logistics {int}", (s, reserve: number, logistics: number) => {
  supply(s, "France", { reserve, wagons: 30, logistics });
});
When("it captures an enemy army's wagons holding {int} rations", (s, n: number) => void R.addToReserve(s.sup, n));
When("it takes an enemy castle whose store holds {int} rations", (s, n: number) => {
  s.castleProv = { id: "castle", localStore: 0, castleStore: n, grievances: {} };
  R.takeCastleStore(s.sup, s.castleProv);
});
When("a month of rot passes", (s) => void R.rot(s.sup));
When("it breaks in a battle", (s) => void R.loseHalfWagons(s.sup));
Then("its reserve holds {int} rations", (s, n: number) => close(s.sup.reserve, n));

Given("an army with {int} wagons", (s, wagons: number) => {
  s.wagons = wagons;
});
Then("its reserve can hold at most {int} rations", (s, n: number) => close(R.reserveRoom({ wagons: s.wagons, known: s.known }), n));
Then("its wagons need {int} horses", (s, n: number) => expect(R.wagonHorses(s.wagons)).toBe(n));

Given("an army of {string}", (s, owner: string) => {
  s.army = R.newArmy("army", owner);
});
When("the player sets its reserve size to {int} months", (s, months: number) => {
  expect(R.validReserveSize(months)).toBe(true);
  s.army.orders.reserveSize = months;
  s.army.ordersSetByPlayer = true;
});
Then("the army tries to keep {int} months of food", (s, months: number) => {
  expect(s.army.orders.reserveSize).toBe(months);
  // At home it refills toward that many months of meals.
  const sup = { owner: s.army.owner, monthly: 20000, wagons: 100, reserve: 0, reserveSize: months };
  R.supplyWeek(sup, { id: "home", localStore: 1e6, grievances: {} }, true);
  close(sup.reserve, months * 20000);
});

Given("an army takes food from the local store of {string}", (s, id: string) => {
  supply(s, "France", { reserve: 30000 });
  Object.assign(sprov(s, id), { localStore: 100000, monthlyNeed: 20000 });
  supplyIn(s, id, true);
});
Then("{string} gets Requisitioned for a season", (s, id: string) => {
  expect(sprov(s, id).grievances["Requisitioned"]).toBe(W.season_months);
  expect(sprov(s, id).grievances["Hungry"]).toBeUndefined();
});
Then("if {string} drops under a month of food it gets Hungry", (s, id: string) => {
  const p: R.SupplyProvince = { id, localStore: 25000, monthlyNeed: 20000, grievances: {} };
  R.supplyWeek({ owner: "France", monthly: 20000, wagons: 40, reserve: 30000, reserveSize: 2 }, p, true);
  expect(p.localStore).toBeLessThan(20000);
  expect(p.grievances["Hungry"]).toBe(W.season_months);
});

Given("an army of {string} takes food in a province of the lord {string} this season", (s, _owner: string, name: string) => {
  s.lord = lord(name, "Loyal");
  hook(s, () => {
    R.lordResents(s.lord, false);
    R.lordResents(s.lord, true);
  });
});
Then("the lord {string} loses a step of loyalty", (s) => expect(s.lord.loyalty).toBe("Wavering"));

Given("the province {string} has a no-quartering charter", (s, id: string) => {
  sprov(s, id).charters = ["no quartering"];
});
When("an army of {string} takes food from {string}", (s, owner: string, id: string) => {
  supply(s, owner, { reserve: 30000 });
  R.supplyWeek(s.sup, sprov(s, id), true);
});
Then("{string} gets Broken charter", (s, id: string) => expect(sprov(s, id).grievances["Broken charter"]).toBe(W.season_months));
When("an army tries to stop for the winter in {string}", (s, id: string) => {
  s.quarters = R.winterQuarters([R.newCompany({ kind: "levy", arm: "levy foot", men: 1000 })], sprov(s, id), 1);
});
Then("{string} refuses to quarter it", (s, id: string) => {
  expect(s.quarters.refused).toBe(true);
  expect(sprov(s, id).localStore).toBe(50000);
});

Given("the province {string} has {int} rations in its local store", (s, id: string, n: number) => {
  sprov(s, id).localStore = n;
  s.place = id;
});
Given("its foraging rating is {string}", (s, r: string) => {
  sprov(s, s.place).foraging = R.rating(r);
});
Then("its forage limit is {int} soldiers", (s, n: number) => {
  const p = sprov(s, s.place);
  close(R.forageLimit(p.localStore, p.foraging!), n);
});

Given("an army of {string} takes the castle of {string}", (s, owner: string, id: string) => {
  supply(s, owner, { reserve: 0 });
  Object.assign(sprov(s, id), { castleOf: "France", castleStore: 8000 });
  hook(s, () => R.takeCastleStore(s.sup, sprov(s, id)));
});
Then("the castle store of {string} goes into the army's reserve", (s, id: string) => {
  expect(s.sup.reserve).toBe(8000);
  expect(sprov(s, id).castleStore).toBe(0);
});

Given("an army of {int} men and {int} horses with no food", (s, men: number, horses: number) => {
  s.companies = [
    R.newCompany({ kind: "standing regiment", arm: "pikes", men: men * 0.3 }),
    R.newCompany({ kind: "levy", arm: "levy foot", men: men * 0.4 }),
    R.newCompany({ kind: "hired company", arm: "pikes", men: men * 0.3 }),
  ];
  hook(s, () => (s.hunger = R.hungerWeek(s.companies, horses)));
});
Then("{int} men desert, levies first and standing regiments last", (s, n: number) => {
  close(s.hunger.deserted, n);
  close(s.hunger.byKind["levy"], n);
  expect(s.hunger.byKind["standing regiment"] ?? 0).toBe(0);
  // With too few levies left, hired men go before the standing regiments.
  const few = [R.newCompany({ kind: "standing regiment", arm: "pikes", men: 5000 }), R.newCompany({ kind: "levy", arm: "levy foot", men: 100 }), R.newCompany({ kind: "hired company", arm: "pikes", men: 4900 })];
  const h = R.hungerWeek(few, 0);
  close(h.byKind["levy"]!, 100);
  close(h.byKind["hired company"]!, 400);
  expect(h.byKind["standing regiment"] ?? 0).toBe(0);
});
Then("{int} men die", (s, n: number) => close(s.hunger.died, n));
Then("{int} horses are eaten", (s, n: number) => close(s.hunger.horsesEaten, n));
Then("it fights at {int} % strength and {int} % break point", (s, st: number, br: number) => {
  close(s.hunger.strength, pct(st));
  close(s.hunger.breakPoint, pct(br));
});

Given("an army of {int} men born on that ground stays a month in ground of sickness {string}", (s, men: number, ground: string) => {
  s.sick = { men, ground, bornThere: true };
});
Given("an army of {int} men stays a month in ground of sickness {string}", (s, men: number, ground: string) => {
  s.sick = { men, ground };
});
Then("it loses {int} men to sickness", (s, n: number) => {
  const { men, ground, ...o } = s.sick;
  close(R.sicknessLoss(men, ground, o), n);
});
Then("the sick are counted for the player", (s) => {
  const { men, ground, ...o } = s.sick;
  expect(R.sicknessLoss(men, ground, o)).toBeGreaterThan(0);
});
Given("an army of men from {string} stays a month in a fever land province", (s) => {
  s.sick = { men: 10000, ground: "Medium", feverRate: 0.01 };
});
Then("it loses the ground's sickness plus the fever land rate", (s) => {
  const { men, ground, feverRate } = s.sick;
  close(R.sicknessLoss(men, ground, { bornThere: false, feverRate }), R.sicknessLoss(men, ground, { bornThere: true, feverRate }) + men * feverRate);
});

Given("an army of {int} men stops for the winter in {string}, a province with a town", (s, men: number, id: string) => {
  s.companies = [R.newCompany({ kind: "levy", arm: "levy foot", men })];
  s.place = id;
  sprov(s, id);
  hook(s, () => (s.quarters = R.winterQuarters(s.companies, sprov(s, id), 1)));
});
Then("it eats {int} rations from the local store of {string}", (s, n: number, id: string) => {
  expect(s.quarters.eaten).toBe(n);
  expect(sprov(s, id).localStore).toBe(50000 - n);
});
Then("its companies drill", (s) => expect(s.companies[0].drill).toBeGreaterThan(0));
Then("after a season {string} gains Soldiers quartered", (s, id: string) => {
  expect(sprov(s, id).grievances["Soldiers quartered"]).toBeUndefined();
  R.winterQuarters(s.companies, sprov(s, id), W.season_months);
  expect(sprov(s, id).grievances["Soldiers quartered"]).toBe(W.season_months);
});
Given("an army of {int} soldiers in the field in winter", (s, soldiers: number) => {
  s.eater = { soldiers, winter: true };
});

Given("an enemy army approaches the French province {string}", (s, id: string) => {
  Object.assign(sprov(s, id), { localStore: 20000, tiles: [{ use: "Fields", seasonFood: 5000 }, { use: "Pasture", seasonFood: 3000 }, { use: "Woods" }] });
});
When("France orders Burn the fields in {string}", (s, id: string) => {
  s.castle = { store: 0 };
  R.burnTheFields(sprov(s, id), s.castle);
  s.noCastle = { id: "other", localStore: 9000, grievances: {} };
  R.burnTheFields(s.noCastle);
});
Then("every food tile of {string} burns", (s, id: string) => {
  const tiles = sprov(s, id).tiles!;
  expect(tiles.filter((t) => t.use !== "Woods").every((t) => t.burned)).toBe(true);
});
Then("its local store goes to the nearest castle or is destroyed", (s) => {
  expect(s.castle.store).toBe(20000);
  expect(s.noCastle.localStore).toBe(0);
});
Then("{string} gains Burned homes and Hungry", (s, id: string) => {
  expect(sprov(s, id).grievances).toMatchObject({ "Burned homes": W.season_months, Hungry: W.season_months });
});
Then("the invader finds nothing to forage there", (s) => {
  expect(R.plunder(sprov(s, "Champagne"), 1000).got).toBe(0);
});

Given("it builds a magazine in an occupied province", (s) => {
  Object.assign(sprov(s, "occupied"), { magazineOf: s.country });
});
When("its army stands there", (s) => {
  supply(s, s.country, { reserve: 10000 });
  s.take = R.supplyWeek(s.sup, sprov(s, "occupied"), false);
});
Then("the army refills its reserve as if at home", (s) => {
  expect(s.take.fromLocal).toBeGreaterThan(0);
  expect(s.take.fromReserve).toBe(0);
  close(s.sup.reserve, Math.min(R.reserveRoom(s.sup), 2 * s.sup.monthly));
  const without = { owner: s.country, monthly: 20000, wagons: 40, reserve: 10000, reserveSize: 2 as const };
  expect(R.supplyWeek(without, { id: "x", localStore: 50000, grievances: {}, magazineOf: s.country }, false).fromReserve).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- battle: the field, roles, levels, approaches, skills

const rolesOf = (c: R.Company): string[] => R.armDef(c.arm).roles;
const sumMen = (cs: R.Company[]): number => cs.reduce((t, c) => t + c.men, 0);

/** A plain army for battle tests, all companies Drilled. */
function battleArmy(country: string, init: Partial<R.Army> = {}): R.Army {
  const mk = (arm: string, men: number, kind: R.Kind = "levy"): R.Company => R.newCompany({ kind, arm, men, drill: 3, arms: 20, id: `${country}-${arm}-${men}-${Math.random()}` });
  const cs = [...Array.from({ length: 8 }, () => mk("levy foot", 1000)), mk("archers", 800), mk("archers", 800), mk("knights and lancers", 600, "retinue"), mk("knights and lancers", 600, "retinue"), mk("light horse", 500, "retinue"), mk("field guns", 30, "standing regiment")];
  return R.newArmy(country, country, cs, init);
}
/** A fresh copy of the same battle each call (WAR-094). */
function sameBattle(): R.BattleInput {
  const known = new Set(["W2", "W3", "W8"]);
  const ids0 = (a: R.Army): R.Army => (a.companies.forEach((c, i) => (c.id = `${a.owner}-${i}`)), a);
  return {
    attacker: { country: "Burgundy", army: ids0(battleArmy("Burgundy", { commander: R.newCommander("Bastard", { might: 3, cunning: 2, logistics: 1 }) })), known, style: "Three battles" },
    defender: { country: "France", army: ids0(battleArmy("France", { commander: R.newCommander("Jean de Dunois", { might: 3, cunning: 4, logistics: 2 }) })), known, style: "Three battles", content: 0.7 },
    sectors: R.battlefield(TROYES_ROW),
    ground: "farmland",
    era: "II",
  };
}

Given("the army of {string} with commander Cunning {int} stands in {string}", (s, _c: string, cunning: number) => {
  s.slip = { cunning, wants: false, trapped: false, enemyCunning: 0 };
});
Given("the army of {string} with commander Cunning {int} arrives in {string} at the end of a day", (s, _c: string, cunning: number) => {
  s.slip.enemyCunning = cunning;
});
Given(/^the army of "([^"]+)" wants to withdraw and is (trapped|not trapped)$/, (s, _c: string, t: string) => {
  s.slip.wants = true;
  s.slip.trapped = t === "trapped";
});
Then("the army of {string} slips away", (s) => expect(R.slipsAway(s.slip)).toBe(true));
Then("the two armies fight", (s) => expect(R.slipsAway(s.slip)).toBe(false));

Given("a battle in era {word}", (s, e: string) => {
  s.era = era(e);
});
Then("each battle day has {int} bells", (s, n: number) => expect(R.battleScale(s.era).bellsPerDay).toBe(n));
Then("if no army has broken after {int} days the attacker pulls back", (s, days: number) => {
  expect(R.battleScale(s.era).maxDays).toBe(days);
  expect(R.afterLastDay(days - 1, s.era)).toBe("fight on");
  expect(R.afterLastDay(days, s.era)).toBe("the attacker pulls back");
});

Given(/^the province "([^"]+)" has a tile row whose middle (\d+) tiles are (.+)$/, (s, _p: string, _n: string, list: string) => {
  s.row = ["Marsh", "Shore", ...list.split(/,\s*/), "Waste", "Marsh"];
});
When("a battle is fought in {string}", (s) => {
  s.field = R.battlefield(s.row);
});
Then(/^the battlefield has (\d+) sectors: (.+)$/, (s, n: string, list: string) => {
  expect(s.field).toHaveLength(Number(n));
  expect(s.field.map((x: R.Sector) => x.use)).toEqual(list.split(/,\s*/));
});
Then("each army has its camp with its wagons, food reserve, wounded and unplaced guns behind it", (s) => {
  const a = battleArmy("France", { wagons: 20, reserve: 15000 });
  const levy = a.companies[0]!;
  const placement: R.Placement = { sectors: s.field.map((_: R.Sector, i: number) => (i === 0 ? [levy] : [])), behind: s.field.map(() => []), reserve: [], hidden: [] };
  const camp = R.campOf(a, placement, 300);
  expect(camp).toMatchObject({ wagons: 20, reserve: 15000, wounded: 300 });
  expect(camp.guns.map((c) => c.arm)).toEqual(["field guns"]);
});
Given("a province with a tile row of {int} tiles", (s, n: number) => {
  s.row = Array.from({ length: n }, () => "Fields");
});
When("a battle is fought there", (s) => {
  s.field = R.battlefield(s.row);
});
Then("the battlefield has {int} sectors", (s, n: number) => expect(s.field).toHaveLength(n));

Given("a sector of tile use {string}", (s, use: string) => {
  s.sector = R.sectorOf(use);
  s.use = use;
});
Then("its room is {int}", (s, room: number) => expect(s.sector.room).toBe(room));
Then("horse can charge in it", (s) => expect(s.sector.charge).toBe(true));
Then("horse can charge in it and horse gets +10 %", (s) => {
  expect(s.sector.charge).toBe(true);
  close(s.sector.horse, 0.1);
});
Then("no charges are possible and shooting into it is halved", (s) => {
  expect(s.sector.charge).toBe(false);
  expect(s.sector.cover).toBe(0.5);
});
Then("no charges are possible and everyone fights at -25 %", (s) => {
  expect(s.sector.charge).toBe(false);
  expect(s.sector.all).toBe(-0.25);
});
Then("attacking across it is -20 % unless the province has a bridge or its river is frozen", (s) => {
  expect(s.sector.attackAcross).toBe(-0.2);
  expect(R.sectorOf(s.use, { bridge: true }).attackAcross).toBe(0);
  expect(R.sectorOf(s.use, { frozen: true }).attackAcross).toBe(0);
});
Then("the defender gets +50 %, shooting into it is halved and no charges", (s) => {
  expect(s.sector.defender).toBe(0.5);
  expect(s.sector.cover).toBe(0.5);
  expect(s.sector.charge).toBe(false);
});
Given("a sector of tile use {string} in a province of ground {string}", (s, use: string, ground: string) => {
  s.sector = R.sectorOf(use, { ground: ground as Ground });
});
Then(/^charges (are possible|are not possible) in it$/, (s, c: string) => expect(s.sector.charge).toBe(c === "are possible"));

Given("companies fight in the town sector of {string}", (s) => {
  const a = R.newArmy("a", "Burgundy", [R.newCompany({ kind: "levy", arm: "levy foot", men: 1500 })]);
  const d = R.newArmy("d", "France", [R.newCompany({ kind: "levy", arm: "levy foot", men: 1000 })]);
  hook(s, () => (s.result = R.fightBattle({ attacker: { country: "Burgundy", army: a, known: new Set(), approach: "Assault" }, defender: { country: "France", army: d, known: new Set(), approach: "Assault" }, sectors: R.battlefield(["Town"]), ground: "farmland", era: "II" })));
});
Then("town buildings of {string} burn", (s) => expect(s.result.townFought).toBe(true));

Given("a battle in a mountains province with a woods sector and a river bank", (s) => {
  s.ground = "mountains";
});
Then("the province's foot, horse and guns modifiers and its defender bonus apply", (s) => {
  const g = R.groundOn(s.ground);
  expect(g).toMatchObject({ foot: 0, horse: -0.4, guns: -0.3, defender: 0.3 });
  close(R.armGround("knights and lancers", s.ground), -0.4);
  close(R.armGround("field guns", s.ground), -0.3);
});
Then("a defending army of the province's homeland language gets +10 % in that rough country", (s) => {
  close(R.groundOn(s.ground, { defenderHomeland: true }).locals, 0.1);
  expect(R.groundOn(s.ground, { defenderHomeland: false }).locals).toBe(0);
  expect(R.groundOn("farmland", { defenderHomeland: true }).locals).toBe(0);
});

Given("a fields sector with room {int} holding {int} men of an army with {int} more men in depth behind it", (s, room: number, front: number, depth: number) => {
  s.fill = { room, front, depth };
});
When("{int} of the men in the sector are lost in a bell", (s, n: number) => {
  s.filled = R.fillFromDepth(s.fill.front - n, s.fill.room, s.fill.depth);
});
Then("at the end of the bell {int} men step forward from depth", (s, n: number) => {
  expect(s.filled.moved).toBe(n);
  expect(s.filled.front).toBe(s.fill.room);
});
Given("an army of {int} and an army of {int} meet on a row of woods and marsh sectors", (s, big: number, small: number) => {
  const field = R.battlefield(["Woods", "Marsh", "Woods", "Marsh"]);
  s.big = R.frontAndDepth(big, field);
  s.small = R.frontAndDepth(small, field);
});
Then("the bigger army's extra men only stand as fresh depth", (s) => {
  expect(s.big.front).toBe(3000);
  expect(s.big.front).toBe(s.small.front);
  expect(s.big.depth).toBe(27000);
});

Given("the same two armies, commanders, tile row and inventions", (s) => {
  s.make = sameBattle;
});
When("the battle is fought twice", (s) => {
  s.r1 = R.fightBattle(s.make());
  s.r2 = R.fightBattle(s.make());
});
Then("both battles have the same result", (s) => {
  expect(s.r1.bells).toBeGreaterThan(0);
  expect(s.r2).toEqual(s.r1);
});

Given(/^a company with role "([^"]+)" meets (.+) in (an open sector|a woods sector)$/, (s, role: string, _e: string, where: string) => {
  s.role = role;
  s.sector = R.sectorOf(where === "a woods sector" ? "Woods" : "Fields");
});
Then("the chargers take double hits and deal half", (s) => {
  expect(R.chargeOf({ sectorCharge: s.sector.charge, firstContact: true, targetRoles: [s.role] })).toEqual({ can: true, dealt: 0.5, taken: 2 });
});
Then("the Brace company takes x1.5 hits from shooting", (s) => expect(R.shotInto({ shooterArm: "hand gunners", targetRoles: [s.role] })).toBe(1.5));
Then("the Shock company deals double hits in the first bell it meets the enemy", (s) => {
  expect(R.chargeOf({ sectorCharge: s.sector.charge, firstContact: true, targetRoles: ["Line"] }).dealt).toBe(2);
  expect(R.chargeOf({ sectorCharge: s.sector.charge, firstContact: false, targetRoles: ["Line"] }).dealt).toBe(1);
});
Then("the Shock company cannot charge", (s) => expect(R.chargeOf({ sectorCharge: s.sector.charge, firstContact: true, targetRoles: ["Line"] }).can).toBe(false));
Then("arrows against it are halved", (s) => expect(R.shotInto({ shooterArm: "archers", targetRoles: [s.role] })).toBe(0.5));
Then("hand gun hits against it are not halved", (s) => expect(R.shotInto({ shooterArm: "hand gunners", targetRoles: [s.role] })).toBe(1));
Then("the Light company can step back a sector without fleeing and shoot again", (s) => {
  expect(R.stepsBackWithoutFleeing([s.role])).toBe(true);
  expect(R.stepsBackWithoutFleeing(["Line"])).toBe(false);
});
Then("the guns shoot into their own and the neighbouring sectors", () => {
  expect(R.gunTargets(3, 7)).toEqual([2, 3, 4]);
  expect(R.gunTargets(0, 7)).toEqual([0, 1]);
});
Given("a Shock company in an open sector spent a bell out of contact", (s) => {
  s.sector = R.sectorOf("Fields");
  // Out of contact for a bell, its contact count starts over.
  s.contact = 0;
});
When("it meets an enemy again", (s) => {
  s.charge = R.chargeOf({ sectorCharge: s.sector.charge, firstContact: s.contact === 0, targetRoles: ["Line"] });
});
Then("it deals double hits in that bell", (s) => expect(s.charge.dealt).toBe(2));
Given("an enemy company reaches a sector held only by guns", (s) => {
  s.roles = ["Guns"];
});
Then("the guns deal no melee hits", (s) => {
  expect(R.hasMelee(s.roles)).toBe(false);
  expect(R.hasMelee(["Line"])).toBe(true);
});
Given("a war elephant company in a sector holding {int} men of its own side", (s, men: number) => {
  s.sectorMen = men;
});
When("that sector loses a bell badly", (s) => {
  s.trampled = R.elephantPanic(s.sectorMen);
});
Then("the elephants trample their own side for {int} men", (s, n: number) => close(s.trampled, n));

Given("a company of level {int}", (s, level: number) => {
  s.company = atLevel(level);
  s.level = level;
  s.levelTest = true;
  expect(R.levelOf(s.company, "II")).toBe(level);
});
const pctText = (t: string): number => Number(t.replace(/\s*%$/, "").replace("+", "")) / 100;
Then(/^its hits are ([-+]?\d+ %) and its break point bonus is ([-+]?\d+ %)$/, (s, h: string, b: string) => {
  close(R.levelHits(s.level, "I"), pctText(h));
  close(R.levelHits(s.level, "II"), pctText(h));
  close(R.levelBreak(s.level, "I"), pctText(b));
  close(R.levelBreak(s.level, "II"), pctText(b));
});
Then("it can't fall back without breaking", (s) => expect(R.fallBack(s.level)).toBe("breaks"));
Then("it can fall back a sector on orders without breaking", (s) => expect(R.fallBack(s.level)).toBe("falls back"));
Then("it can shift to a neighbouring sector within one bell", (s) => {
  expect(R.shiftArrives(s.level)).toBe("the same bell");
  expect(R.shiftArrives(2)).toBe("next bell");
});
Then("as Line it counts as half Brace", (s) => expect(R.levelAbilities(s.level).line_half_brace).toBe(true));
Then("it has one free order of its own each bell", (s) => expect(R.levelAbilities(s.level).free_orders).toBe(1));

Given("a standing regiment of level {int} in a realm that knows {string}", (s, level: number, inv: string) => {
  s.company = atLevel(level, { kind: "standing regiment", arm: "pikes" });
  s.known = ids(inv);
});
When("it is refilled with many new men", (s) => R.addMen(company(s), 10000));
Then("its level is {int}", (s, n: number) => {
  expect(R.levelOf(company(s), s.era ?? "II", s.known)).toBe(n);
  if (s.company.kind === "standing regiment") expect(R.levelOf(company(s), "II")).toBeLessThan(n);
});
When("new men dilute its drill and scars", (s) => R.addMen(company(s), 2000));
When("{int} years pass without a battle", (s, years: number) => R.yearsPass(company(s), years));
Then("its level can fall", (s) => expect(R.levelOf(company(s), "II")).toBeLessThan(s.level));

const BASE_ROSTER = (): R.Company[] => battleArmy("X").companies;
Given("a commander whose style uses the approach {string}", (s, approach: string) => {
  s.approach = approach;
  s.roster = BASE_ROSTER();
  s.field = R.battlefield(TROYES_ROW);
  hook(s, () => (s.placement = R.deploy(s.roster, s.field, approach, "II")));
});
Then("all Shock is massed in the best one or two open sectors with a small reserve", (s) => {
  const p: R.Placement = s.placement;
  const shockAt = p.sectors.map((cs, i) => (cs.some((c) => rolesOf(c).includes("Shock")) ? i : -1)).filter((i) => i >= 0);
  expect(shockAt.length).toBeGreaterThanOrEqual(1);
  expect(shockAt.length).toBeLessThanOrEqual(2);
  for (const i of shockAt) expect(s.field[i].charge).toBe(true);
  expect(p.reserve.length).toBeGreaterThan(0);
  expect(sumMen(p.reserve)).toBeLessThan(sumMen(s.roster) / 4);
});
Then("Line stands evenly in every sector with Shot behind and a quarter in reserve", (s) => {
  const p: R.Placement = s.placement;
  for (const cs of p.sectors) expect(cs.some((c) => rolesOf(c).includes("Line"))).toBe(true);
  const shot = s.roster.filter((c: R.Company) => rolesOf(c).includes("Shot"));
  for (const c of shot) expect(p.behind.flat()).toContain(c);
  expect(sumMen(p.reserve)).toBeGreaterThan(0);
  expect(sumMen(p.reserve)).toBeLessThanOrEqual(sumMen(s.roster) * 0.25);
});
Then("the end sectors are strong and the centre is thin and Drilled", (s) => {
  const p: R.Placement = s.placement;
  const n = p.sectors.length;
  const ends = Math.min(sumMen(p.sectors[0]!), sumMen(p.sectors[n - 1]!));
  for (let i = 1; i < n - 1; i++) {
    expect(sumMen(p.sectors[i]!)).toBeLessThan(ends);
    for (const c of p.sectors[i]!) expect(R.levelOf(c, "II")).toBeGreaterThanOrEqual(2);
  }
});
Then("Light and Shot spread over the open sectors with Shock behind and no reserve", (s) => {
  const p: R.Placement = s.placement;
  p.sectors.forEach((cs, i) => {
    if (cs.some((c) => rolesOf(c).includes("Shot") || rolesOf(c).includes("Light"))) expect(s.field[i].charge).toBe(true);
  });
  expect(p.sectors.filter((cs) => cs.some((c) => rolesOf(c).includes("Shot"))).length).toBeGreaterThan(1);
  for (const c of s.roster.filter((x: R.Company) => x.arm === "knights and lancers")) expect(p.behind.flat()).toContain(c);
  expect(p.reserve).toHaveLength(0);
});
Then("up to half the army hides in woods, marsh and town sectors", (s) => {
  const p: R.Placement = s.placement;
  const hidden = sumMen(p.hidden.map((h) => h.company));
  expect(hidden).toBeGreaterThan(0);
  expect(hidden).toBeLessThanOrEqual(sumMen(s.roster) / 2);
  for (const h of p.hidden) expect(["Woods", "Marsh", "Town"]).toContain(s.field[h.sector].use);
});
Then("guns are massed in the centre sectors with Line guarding them", (s) => {
  const p: R.Placement = s.placement;
  const centre = (p.sectors.length - 1) / 2;
  p.sectors.forEach((cs, i) => {
    if (cs.some((c) => rolesOf(c).includes("Guns"))) expect(i).toBe(centre);
  });
  expect(p.sectors[centre]!.some((c) => rolesOf(c).includes("Guns"))).toBe(true);
  expect(p.sectors[centre]!.some((c) => rolesOf(c).includes("Line"))).toBe(true);
});
Then("everyone stands in front with no reserve", (s) => {
  const p: R.Placement = s.placement;
  expect(p.reserve).toHaveLength(0);
  expect(p.behind.flat()).toHaveLength(0);
  expect(p.hidden).toHaveLength(0);
  expect(p.sectors.flat()).toHaveLength(s.roster.length);
});

Given("the commander {string} has the style {string}", (s, name: string, style: string) => {
  s.cmd = R.namedCommander(name);
  if (!s.cmd.styles.includes(style)) s.cmd.styles.push(style);
  s.style = style;
});
Then("he fights in the style {string}", (s, style: string) => {
  expect(cmd(s).styles[0]).toBe(style);
  // The same style whatever the field: it sets the approach, not the battle.
  expect(R.approachOf(style, "attacker")).toBe(R.approachOf(cmd(s).styles[0]!, "attacker"));
  expect(R.approachOf(style, "defender")).toBe(R.approachOf(cmd(s).styles[0]!, "defender"));
});

When(/^he is the (defender|attacker)$/, (s, side: "defender" | "attacker") => {
  s.ent = R.entrenchment(side);
});
Then("he spends the first bell digging in and dug-in sectors give the defender +50 % and reverse charges", (s) => {
  expect(s.ent).toMatchObject({ digsFirstBell: true, dugDefender: 0.5, reversesCharges: true });
});
Then("he fights as Steadfast", (s) => expect(s.ent.fightsAs).toBe("Steadfast"));

When("the first bell is fought", (s) => {
  run(s);
  s.first = R.firstBell(s.approach);
});
Then("everything advances with no shooting phase for either side", (s) => {
  expect(s.first).toMatchObject({ shooting: false, melee: true });
  expect(s.placement.reserve).toHaveLength(0);
});
Then("losses are x1.25 for both sides", (s) => expect(s.first.lossMul).toBe(1.25));
Given("the attacker's commander has a style using the approach {string}", (s, approach: string) => {
  s.approach = approach;
});
Then("only shooting happens", (s) => expect(s.first).toMatchObject({ shooting: true, melee: false }));
Then("the lines meet with no shooting for either side", (s) => expect(s.first).toMatchObject({ shooting: false, melee: true }));

Given("a commander with Might {int} stands in a sector chosen by his approach", (s, might: number) => {
  s.cmd = R.newCommander("a commander", { might });
});
Then("the men in that sector get +{int} % hits and +{int} % break point", (s, h: number, b: number) => {
  const m = R.mightEffect(cmd(s).might, s.era);
  expect(m.scope).toBe("sector");
  close(m.hits, pct(h));
  close(m.breakPoint, pct(b));
});
Then("if that sector is lost he may be wounded, captured or killed", (s) => {
  const m = R.mightEffect(cmd(s).might, s.era);
  expect(m.risk).toBeGreaterThan(0);
  expect(m.riskIf).toBe("sector lost");
});
Then("he has {int} orders per bell", (s, n: number) => expect(R.ordersPerBell(cmd(s).cunning, s.era ?? "II", s.known)).toBe(n));
Given("the commander of {string} has Cunning {int} and the commander of {string} Cunning {int}", (s, a: string, ca: number, b: string, cb: number) => {
  s.seq = R.orderSequence({ side: a, cunning: ca }, { side: b, cunning: cb });
});
Then("{string} gives its orders first and {string} gives its orders after seeing them", (s, first: string, second: string) => {
  expect(s.seq).toEqual([first, second]);
});
Given("an Ambush commander with Cunning {int} hides companies in the woods", (s, c: number) => {
  s.ambusher = c;
});
Given("the enemy commander has Cunning {int}", (s, c: number) => {
  s.spotter = c;
});
Then(/^the hidden companies (are seen|are not seen)$/, (s, seen: string) => {
  expect(R.seesHidden({ cunning: s.spotter }, s.ambusher)).toBe(seen === "are seen");
});
Given("a Shot company under a commander with Logistics {int}", (s, l: number) => {
  s.logistics = l;
});
Then("it can shoot for {int} bells before falling back to the camp for a bell to refill", (s, n: number) => {
  expect(R.ammunitionBells(s.logistics, s.era, s.known)).toBe(n);
});
Given("a company that has fought {int} bells in a row", (s, n: number) => {
  s.bellsInRow = n;
});
When(/^it fights a (\d+)(?:st|nd|rd|th) bell without being rotated$/, (s, n: string) => {
  expect(Number(n)).toBe(s.bellsInRow + 1);
  s.tired = R.tiredness(Number(n));
});
Then("its hits are {int} %", (s, n: number) => close(s.tired - 1, pct(n)));
Then("each bell up to {int} sectors may swap a tired company for a fresh one from depth for free", (s, n: number) => {
  expect(R.freeRotations(cmd(s).logistics)).toBe(n);
});

Given("a company is given the order {string}", (s, order: string) => {
  s.order = R.orderEffect(order);
});
Then("reserve companies enter a sector", (s) => expect(s.order.reserve_enters).toBe(true));
Then("a company moves to a neighbouring sector, arriving the same bell if Seasoned or better", (s) => {
  expect(s.order.to_neighbour).toBe(true);
  expect(R.shiftArrives(3)).toBe("the same bell");
  expect(R.shiftArrives(2)).toBe("next bell");
});
Then("companies in a won sector strike a neighbour from the side with hits x1.5 and the enemy there -10 % break point", (s) => {
  expect(s.order).toMatchObject({ from_won: true, into: "neighbour", hits: 1.5, enemy_break: -0.1 });
});
Then("companies in a won sector take the enemy camp's wagons and food reserve, free prisoners, spike guns there and the enemy army is -10 % break point", (s) => {
  expect(s.order).toMatchObject({ from_won: true, into: "camp", takes: ["wagons", "food reserve"], frees_prisoners: true, spikes_guns: true, enemy_army_break: -0.1 });
});
Then("a company pulls back one sector's depth and takes no hits that bell", (s) => expect(s.order.no_hits).toBe(true));
Then("half of the men who fled from one sector this bell come back into line", (s) => expect(s.order.fled_return).toBe(0.5));
Then("hidden Ambush companies are revealed with hits x1.5 that bell and the enemy there -10 % break point", (s) => {
  expect(s.order).toMatchObject({ ambush_only: true, reveals: true, hits: 1.5, enemy_break: -0.1 });
});
Then("a tired company is swapped for a fresh one beyond the free rotation", (s) => expect(s.order).toMatchObject({ swap_tired: true, beyond_free: true }));
When("it is given the order {string}", (s, order: string) => {
  expect(order).toBe("Fall back");
  s.fell = R.fallBack(R.levelOf(company(s), "II"));
});
Then("it breaks", (s) => expect(s.fell).toBe("breaks"));

// ---------------------------------------------------------------- battle: the bell, hits, flee share, breaking

Given("a battle bell", (s) => {
  s.bell = W.battle.bell_order;
});
Then("it runs in this order:", (s, t: Table) => expect(s.bell).toEqual(t.slice(1).map((r) => r[0])));
Then("in the orders step the commander with less Cunning gives his orders first, then the other, then Elite companies take their free order", () => {
  expect(R.orderSequence({ side: "France", cunning: 4 }, { side: "Burgundy", cunning: 2 })).toEqual(["Burgundy", "France"]);
  expect(R.levelAbilities(5).free_orders).toBe(1);
  expect(R.levelAbilities(4).free_orders).toBeUndefined();
});

Given("a company of {int} men in the front of arm {string} at level {int}", (s, men: number, arm: string, level: number) => {
  s.company = atLevel(level, { arm, men });
  s.hitCtx = { era: s.era, front: men, level };
});
Given("no other modifiers apply", () => {});
Given("it is tired after {int} bells in a row", (s, n: number) => {
  s.hitCtx.bellInRow = n + 1;
});
Given("it arrived by forced march on the first day", (s) => {
  s.hitCtx.forcedFirstDay = true;
});
Given("it is level {int}", (s, level: number) => {
  s.hitCtx.level = level;
});
When("it fights a bell", (s) => {
  s.hits = R.hitsOf(company(s), s.hitCtx);
});
Then("it deals {int} hits", (s, n: number) => close(s.hits, n));

Given("the country {string} has {int} % of its people in calm provinces", (s, _c: string, content: number) => {
  s.content = pct(content);
});
When("a French levy company takes {int} hits", (s, hits: number) => {
  s.split = R.splitHits(hits, R.fleeShare(R.newCompany({ kind: "levy", arm: "levy foot", men: 1000 }), { content: s.content }));
});
Then("{float} men flee and {float} are killed and {float} are wounded", (s, fled: number, killed: number, wounded: number) => {
  close(s.split.fled, fled);
  close(s.split.killed, killed);
  close(s.split.wounded, wounded);
});
Given(/^a company of kind "([^"]+)" (owed no pay|owed \d+ months of pay|in any realm|of a disloyal lord|of a wavering lord whose lands are \d+ % content|defending its own province's castle)$/, (s, kind: R.Kind, cond: string) => {
  const owed = /owed (\d+) months/.exec(cond);
  s.company = R.newCompany({ kind, arm: "levy foot", men: 1000, payOwed: owed ? Number(owed[1]) : 0 });
  const content = /(\d+) % content/.exec(cond);
  s.fleeCtx = cond.includes("disloyal") ? { lordLoyalty: "Disloyal" } : cond.includes("wavering") ? { lordLoyalty: "Wavering", content: pct(Number(content![1])) } : cond.includes("own province's castle") ? { ownCastle: true, content: 0.3 } : {};
});
Then("its flee share is {int} %", (s, n: number) => close(R.fleeShare(company(s), s.fleeCtx), pct(n)));

Given("a levy company of {int} men with break point {int} %", (s, men: number, bp: number) => {
  s.co = { men, bp: pct(bp) };
});
When("it has lost {int} killed, {int} wounded and {int} fled", (s, k: number, w: number, f: number) => {
  s.co.lost = { k, w, f };
});
Then("the company breaks", (s) => {
  const { k, w, f } = s.co.lost;
  expect(R.companyBreaks(s.co.men, k + w + f, s.co.bp)).toBe(true);
  // Without the fled men it would hold: fled men count.
  expect(R.companyBreaks(s.co.men, k + w, s.co.bp)).toBe(false);
});
Then("it leaves the line and counts as fled for the pursuit", (s) => {
  // In battle a broken company's remaining men join its fled.
  const r = R.fightBattle({
    attacker: { country: "A", army: R.newArmy("a", "A", [R.newCompany({ kind: "levy", arm: "levy foot", men: 3000, id: "a1" })]), known: new Set(), approach: "Assault" },
    defender: { country: "B", army: R.newArmy("b", "B", [R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, id: "b1" })]), known: new Set(), approach: "Assault" },
    sectors: R.battlefield(["Fields"]),
    ground: "farmland",
    era: "II",
  });
  expect(r.brokenCompanies).toContain("b1");
  const l = r.losses["B"]!;
  close(l.killed + l.wounded + l.fled, 1000, 3);
  expect(r.pursuitShare).toBe(1);
});

Given("the last French company in the pasture sector breaks", (s) => {
  s.holder = R.sectorHolder({ side: "France", men: 0 }, { side: "Burgundy", men: 1500 });
});
Then("the pasture sector is won by the other side", (s) => expect(s.holder).toBe("Burgundy"));
Then("its companies can Turn or Drive next bell", () => {
  expect(R.orderEffect("Turn").from_won).toBe(true);
  expect(R.orderEffect("Drive").from_won).toBe(true);
});
Given("an army that started in {int} sectors", (s, n: number) => {
  s.ab = { startedSectors: n, lostSectors: 0, losses: 0, men: 10000, breakPoint: 0.25 };
});
Given("it has lost {int} sectors", (s, n: number) => {
  s.ab.lostSectors = n;
});
Given("its total losses pass the men-weighted average break point of its companies", (s) => {
  const cs = [R.newCompany({ kind: "levy", arm: "levy foot", men: 6000 }), R.newCompany({ kind: "hired company", arm: "pikes", men: 4000 })];
  s.ab.breakPoint = R.armyBreakPoint(cs);
  close(s.ab.breakPoint, (6000 * R.breakPoint(cs[0]!) + 4000 * R.breakPoint(cs[1]!)) / 10000);
  s.ab.losses = 10000 * s.ab.breakPoint + 1;
});
Given(/^its camp is taken by Drive and it has lost (\d+) sectors?$/, (s, n: string) => {
  s.ab.campTaken = true;
  s.ab.lostSectors = Number(n);
});
Then(/^the army (breaks|does not break)$/, (s, b: string) => expect(R.armyBreaks(s.ab)).toBe(b === "breaks"));
Given("both armies pass their break point in the same bell", (s) => {
  s.past = { France: 1.1, Burgundy: 1.1 };
});
Given("the army of {string} is further past its break point", (s, c: string) => {
  s.past[c] = 1.3;
});
Then("only the army of {string} breaks", (s, c: string) => {
  expect(R.whoBreaks({ side: "France", past: s.past.France }, { side: "Burgundy", past: s.past.Burgundy })).toBe(c);
});

// ---------------------------------------------------------------- battle: night, aftermath, prisoners, standing orders, reports

/** Two even single-sector armies that fight on past the first night unless a standing order pulls one back. */
function nightBattle(o: { burgundyCunning?: number; franceCunning?: number; burgundyRetreat?: number | null; franceRetreat?: number | null } = {}): R.BattleInput {
  const mk = (id: string, men: number): R.Company => R.newCompany({ kind: "standing regiment", arm: "levy foot", men, id, drill: 6, scars: 1 });
  const a = R.newArmy("a", "Burgundy", [mk("a1", 3000)], { commander: R.newCommander("the Bastard of Burgundy", { cunning: o.burgundyCunning ?? 2 }) });
  const d = R.newArmy("d", "France", [mk("d1", 2600)], { commander: R.newCommander("Jean de Dunois", { cunning: o.franceCunning ?? 4 }) });
  a.orders.retreat = o.burgundyRetreat ?? null;
  d.orders.retreat = o.franceRetreat ?? null;
  return { attacker: { country: "Burgundy", army: a, known: new Set(), approach: "Assault" }, defender: { country: "France", army: d, known: new Set(), approach: "Assault" }, sectors: R.battlefield(["Fields"]), ground: "farmland", era: "II" };
}

Given("no army has broken after {int} bells", (s, bells: number) => {
  s.nightAfter = bells;
});
Given("the army of {string} withdraws by its standing orders", (s) => {
  s.withdraws = true;
});
Given("its commander has Cunning {int} and the enemy commander Cunning {int}", (s, b: number, f: number) => {
  hook(s, () => (s.result = R.fightBattle(nightBattle({ burgundyCunning: b, franceCunning: f, burgundyRetreat: 0.5 }))));
});
Then(/^the withdrawal is (clean, with no pursuit|counted as breaking, with half the pursuit)$/, (s, w: string) => {
  const r: R.BattleResult = s.result;
  expect(r.bells).toBe(s.nightAfter);
  expect(r.loser).toBe("Burgundy");
  if (w.startsWith("clean")) expect([r.how, r.pursuitShare]).toEqual(["withdrew clean", 0]);
  else expect([r.how, r.pursuitShare]).toEqual(["withdrew", 0.5]);
});

Given("night falls in a battle", (s) => {
  s.unit = { men: 800, fled: 200, ammoUsed: 3 };
  hook(s, () => (s.night = R.overnight(s.unit)));
});
Then("the fled men who will come back return to their companies", (s) => {
  expect(s.unit).toMatchObject({ men: 900, fled: 100 });
});
Then("ammunition is refilled", (s) => expect(s.unit.ammoUsed).toBe(0));

Given(/^a battle ends with (\d+) wounded on the side that (holds the field|broke)$/, (s, n: string, side: string) => {
  s.after = R.woundedAfter(Number(n), side === "holds the field");
  s.afterUnfed = R.woundedAfter(Number(n), side === "holds the field", false);
});
Then("{int} return to their companies after {int} weeks if the army is fed and {int} die", (s, back: number, weeks: number, die: number) => {
  close(s.after.back, back);
  close(s.after.die, die);
  expect(s.after.weeks).toBe(weeks);
  expect(s.afterUnfed.back).toBe(0);
});
Then("{int} become the winner's prisoners", (s, n: number) => {
  expect(s.after.prisoners).toBe(n);
  expect(s.after.back).toBe(0);
});
Given(/^a battle ends with (\d+) fled on the side that (holds the field|broke)$/, (s, n: string, side: string) => {
  s.after = R.fledAfter(Number(n), side === "holds the field");
});
Then("{int} return within {int} weeks and {int} go home to recruits", (s, back: number, weeks: number, home: number) => {
  expect(s.after).toMatchObject({ back, weeks, home, needsFriendlyCastle: false });
});
Then("{int} return if the army reaches a friendly castle and {int} go home to recruits", (s, back: number, home: number) => {
  expect(s.after).toMatchObject({ back, home, needsFriendlyCastle: true });
});
Given("the side that holds the field has {int} Shock and Light men who didn't break", (s, n: number) => {
  s.pursuers = n;
});
Given("the broken side has at least {int} fleeing men", (s, n: number) => {
  s.fleeing = n;
});
Then("{int} fleeing men are killed or taken prisoner", (s, n: number) => {
  expect(R.pursuit(s.pursuers, s.fleeing)).toBe(n);
  expect(R.pursuit(s.pursuers, s.fleeing * 10)).toBe(n);
});
Given(/^a battle where the broken side's camp (was not taken|was taken by Drive)$/, (s, c: string) => {
  s.lostArms = 30;
  hook(s, () => (s.spoils = R.spoils({ lostArms: s.lostArms, wagons: 20, reserve: 10000, campTaken: c !== "was not taken" })));
});
Then("the field-holder picks up the arms of the loser's killed and wounded", (s) => expect(s.spoils.arms).toBe(s.lostArms));
Then(/^the field-holder takes (half|all) of the loser's wagons and food reserve$/, (s, share: string) => {
  const f = share === "half" ? 0.5 : 1;
  expect(s.spoils).toMatchObject({ wagons: 20 * f, reserve: 10000 * f });
});
Given("the army of {string} broke with its commander and {int} captains", (s, _c: string, n: number) => {
  s.leaders = n + 1;
});
Then("each of them has a 1 in 10 chance of capture, more if pursued", (s) => {
  expect(s.leaders).toBe(3);
  expect(R.captureChance(false)).toEqual({ chance: 0.1, more: false });
  expect(R.captureChance(true).more).toBe(true);
});

/** A finished battle's result, for the record. */
function resultOf(winner: string, loser: string, init: Partial<R.BattleResult> = {}): R.BattleResult {
  return { winner, loser, how: "broke", bells: 6, days: 1, losses: {}, sectorsLost: {}, campTaken: false, townFought: false, lines: [], reason: "", brokenCompanies: [], pursuitShare: 1, ordersGiven: {}, ...init };
}
Given("the army of {string} under {string} holds the field against {string}", (s, winner: string, name: string, loser: string) => {
  s.armies = {
    [winner]: R.newArmy("w", winner, [R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, id: "fr1" })], { commander: R.namedCommander(name) }),
    [loser]: R.newArmy("l", loser, [R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, id: "bu1" })], { commander: R.newCommander("the Bastard of Burgundy") }),
  };
  s.realmsRec = { [winner]: { victories: [], defeats: [], fallen: 0 }, [loser]: { victories: [], defeats: [], fallen: 0 } };
  hook(s, () => R.recordBattle(resultOf(winner, loser, { brokenCompanies: ["bu1"] }), s.armies, s.realmsRec, 1450));
});
Then("{string} and {string} gain a victory", (s, name: string, country: string) => {
  expect(s.armies[country].commander.name).toBe(name);
  expect(s.armies[country].commander.victories).toBe(R.namedCommander(name).victories + 1);
  expect(s.realmsRec[country].victories).toEqual([1450]);
});
Then("the Burgundian commander and {string} gain a defeat", (s, country: string) => {
  expect(s.armies[country].commander.defeats).toBe(1);
  expect(s.realmsRec[country].defeats).toEqual([1450]);
});
Then("French companies that didn't break gain {int} scars", (s, n: number) => expect(s.armies["France"].companies[0].scars).toBe(n));
Then("Burgundian companies that broke gain no scar", (s) => expect(s.armies["Burgundy"].companies[0].scars).toBe(0));
Given("{int} French soldiers are killed in a battle", (s, killed: number) => {
  s.realmsRec = { France: { victories: [], defeats: [], fallen: 100 }, Burgundy: { victories: [], defeats: [], fallen: 0 } };
  const armies = { France: R.newArmy("f", "France"), Burgundy: R.newArmy("b", "Burgundy") };
  hook(s, () => R.recordBattle(resultOf("Burgundy", "France", { losses: { France: { killed, wounded: 0, fled: 0 } } }), armies, s.realmsRec, 1450));
});
Then("the Fallen of {string} rise by {int}", (s, country: string, n: number) => expect(s.realmsRec[country].fallen).toBe(100 + n));

Given("the country {string} holds a Burgundian prisoner", (s) => {
  s.prisoner = { owner: "Burgundy", rank: "knight" };
});
When(/^France chooses to (ransom|exchange|release|enlist|hold)$/, (s, choice: R.PrisonerChoice) => {
  s.dec = R.decidePrisoner(choice, s.prisoner);
});
Then("Burgundy pays gold by the prisoner's rank", (s) => expect(s.dec).toMatchObject({ goesHome: true, payer: "Burgundy", byRank: "knight" }));
Then("a French prisoner held by Burgundy comes home", (s) => expect(s.dec).toMatchObject({ goesHome: true, swapped: true }));
Then("the prisoner goes home, a gift that wins goodwill", (s) => expect(s.dec).toMatchObject({ goesHome: true, goodwill: true }));
Then("the prisoners become a hired company at level 1", (s) => {
  expect(s.dec.enlistedLevel).toBe(1);
  const c = R.newCompany({ kind: "hired company", arm: "armoured foot", men: 500, drill: 12, scars: 5, fixedLevel: s.dec.enlistedLevel });
  expect(R.levelOf(c)).toBe(1);
});
Then("the prisoner stays and eats a ration a month", (s) => {
  expect(s.dec).toMatchObject({ goesHome: false, eats: 1 });
  expect(R.prisonerRations(1)).toBe(1);
});
Given("the Mesoamerican country {string} has capture warfare", () => {
  expect(W.capture_warfare.regions).toContain("Mesoamerica");
});
When("its army kills {int} enemy soldiers in a battle", (s, n: number) => {
  s.cw = R.captureWarfare(n);
});
Then("{int} of them are taken as prisoners instead", (s, n: number) => {
  expect(s.cw.prisoners).toBe(n);
  expect(s.cw.killed + s.cw.prisoners).toBe(2 * n);
});

const RETREAT_RATIO: Record<string, number | null> = { "3 to 2": 1.5, "2 to 1": 2, never: null };
Given(/^an army of (\d+) men with standing order "retreat if outnumbered (3 to 2|2 to 1|never)"$/, (s, men: string, r: string) => {
  s.ours = Number(men);
  s.ratio = RETREAT_RATIO[r];
});
Given("an enemy army of {int} men arrives", (s, n: number) => {
  s.theirs = n;
});
Then(/^before the battle the army (wants to retreat|does not want to retreat)$/, (s, w: string) => {
  expect(R.wantsToRetreat(s.ours, s.theirs, s.ratio)).toBe(w === "wants to retreat");
});
Given("a battle reaches night", (s) => {
  hook(s, () => {
    s.held = R.fightBattle(nightBattle());
    s.pulled = R.fightBattle(nightBattle({ franceRetreat: 1.1 }));
  });
});
Then('each army checks its standing order "retreat if outnumbered" again', (s) => {
  // Without the order the armies fight on past the first night; with it the defender leaves at nightfall.
  expect(s.held.days).toBeGreaterThan(1);
  expect(s.pulled.days).toBe(1);
  expect(s.pulled.bells).toBe(W.battle.bells_per_day);
  expect(s.pulled.loser).toBe("France");
});
Given("an army with standing order {string}", (s, o: string) => {
  s.attack = o === "attack";
});
Given("an enemy army comes into a neighbouring province", () => {});
Then(/^the army (marches on the enemy army|stays put)$/, (s, d: string) => expect(R.attackOrWait(s.attack)).toBe(d));

Given("three battles were fought in the turn", (s) => {
  const bs = ["Troyes", "Reims", "Langres"].map((where) => ({ ...nightBattle(), where }));
  hook(s, () => (s.month = R.resolveTurn(bs, "Castile")));
});
Then("each battle is resolved one at a time, in order", (s) => expect(s.month.order).toEqual(["Troyes", "Reims", "Langres"]));
Then("each result is ready before its report shows", (s) => {
  for (const r of s.month.log) {
    expect(r.result.winner).toBeTruthy();
    expect(r.reason).toBe(r.result.reason);
    expect(r.reason.length).toBeGreaterThan(0);
  }
});
Given("{string} and {string} fought a battle this turn and the player is {string}", (s, a: string, b: string, player: string) => {
  const input = nightBattle();
  input.attacker.country = a;
  input.defender.country = b;
  hook(s, () => (s.month = R.resolveTurn([{ ...input, where: "Badajoz" }], player)));
});
Then("the turn does not stop", (s) => expect(s.month.playerReports).toHaveLength(0));
Then("the battle report waits in the log", (s) => expect(s.month.log).toHaveLength(1));
Given("the player watches the battle at {string}", (s) => {
  hook(s, () => (s.result = R.fightBattle(sameBattle())));
});
Then("each bell shows a line such as {string}", (s, example: string) => {
  const r: R.BattleResult = s.result;
  expect(r.lines).toHaveLength(r.bells);
  for (const bell of r.lines) {
    expect(bell.some((l) => l.startsWith("Dunois "))).toBe(true);
    expect(bell.some((l) => l.startsWith("Bastard "))).toBe(true);
  }
  const shape = example.replace(/to the \w+$/, "to the");
  expect(r.lines.flat().some((l) => l.startsWith(shape))).toBe(true);
});

Given("the player's army loses a battle", (s) => {
  const r = R.fightBattle(sameBattle());
  s.notice = R.notification("battle lost", r.reason);
});
Given("a breach opens in a castle the player besieges", (s) => {
  const siege = R.newSiege("stone castle", { garrison: 500, store: 100000, besiegers: 3000, bombards: 20 });
  if (R.siegeMonth(siege).newBreaches > 0) s.notice = R.notification("breach");
});
Given("terms are offered to the player", (s) => {
  s.notice = R.notification("terms offered");
});
Given("the player's peace voices pass half", (s) => {
  s.notice = R.notification("peace voices passing half");
});
Given("pay is owed to the player's army", (s) => {
  s.notice = R.notification("pay owed");
});
Given("the player's army is hungry", (s) => {
  s.notice = R.notification("army hungry");
});
Then("the player gets a notification {string}", (s, text: string) => {
  expect(s.notice.title).toBe(text);
  if (text.startsWith("battle lost")) expect(s.notice.reason).toMatch(/broke|withdrew|pulled back/);
});

// ---------------------------------------------------------------- commander styles

/** Where a few realms lie, by culture group (map facts for the tests, not rules). */
const CULTURE_GROUP: Record<string, string> = { Mali: "Sahel", Inca: "Andes" };
const ALL_KNOWN = new Set(Array.from({ length: 23 }, (_, i) => `W${i + 1}`));

Given("the country {string} knows the inventions {string}", (s, country: string, inv: string) => {
  s.country = country;
  s.known = ids(inv);
});
Then(/^the style "([^"]+)" (is|is not) on its list$/, (s, name: string, is: string) => {
  expect(R.countryStyles(s.country, s.known, s.adoptedList ?? []).includes(name)).toBe(is === "is");
});
Given("an academy of {string} teaches the style {string}", (s, country: string, name: string) => {
  s.country = country;
  s.academy = name;
});
When("it graduates a commander", (s) => {
  s.cmd = R.academyGraduate("a graduate", "Cunning");
  const st = R.styleByOrigin("an academy graduate", { academy: s.academy, horse: "Charge en haie", foot: "Three battles" });
  if (st) s.cmd.styles = [st];
});
Then("he takes the style {string}", (s, name: string) => expect(cmd(s).styles).toEqual([name]));
Given("the country {string} hires a Swiss mercenary company with its captain", (s) => {
  s.captain = R.hiredCaptainStyle("Swiss Confederacy");
});
Then("the captain fights in the style {string}", (s, name: string) => expect(s.captain).toBe(name));
Given("the country {string} has no named style of its own in era I", (s, country: string) => {
  s.country = country;
  expect(R.countryStyles(country, ALL_KNOWN).filter((n) => R.styleEra(n) === "I")).toEqual([]);
});
Then("it uses the style {string} from the config table by culture group", (s, name: string) => {
  expect(R.regionStyle(CULTURE_GROUP[s.country]!)).toBe(name);
});

Given("the country {string} knows the inventions of the style {string}", (s, country: string, name: string) => {
  s.country = country;
  s.styleName = name;
  s.known = new Set(R.style(name).needs);
  s.now = 1720;
});
When("it has hired {int} commanders or captains who use it and {int} years have passed", (s, count: number, years: number) => {
  s.adoption = { officersYears: { count, years } };
});
When("an academy is set to teach it with one teacher who knows it", (s) => {
  s.adoption = { academyTeacher: true };
});
When("it lost {int} battles to it within {int} years", (s, n: number, years: number) => {
  s.adoption = { lostTo: Array.from({ length: n }, (_, i) => s.now - years + 1 + i) };
});
When("it fought beside an ally using it in {int} battles", (s, n: number) => {
  s.adoption = { alliedBattles: n };
});
When("it took the capital of a country that uses it", (s) => {
  s.adoption = { tookCapital: true };
});
Then("the style {string} is on its list as adopted", (s, name: string) => {
  expect(R.adopts(name, s.known, s.adoption, s.now)).toBe(true);
  expect(R.adopts(name, new Set(), s.adoption, s.now)).toBe(false);
  expect(R.countryStyles(s.country, s.known)).not.toContain(name);
  expect(R.countryStyles(s.country, s.known, [name])).toContain(name);
});
When("it loses {int} battles to the style {string} within {int} years", (s, n: number, name: string, years: number) => {
  const now = 1720;
  s.adoptedList = R.adopts(name, s.known, { lostTo: Array.from({ length: n }, (_, i) => now - years + 1 + i) }, now) ? [name] : [];
});
Given("a commander of {string} learns the adopted style {string}", (s, country: string, name: string) => {
  s.cmd = R.newCommander("a commander", { country, styles: [name], battlesInStyle: {} });
  s.styleName = name;
});
When("he fights his first battle in it", (s) => {
  s.strength = R.ruleStrength(cmd(s), s.styleName, true);
});
Then("its special rule works at half strength", (s) => {
  expect(s.strength).toBe(0.5);
  cmd(s).battlesInStyle![s.styleName] = 1;
  expect(R.ruleStrength(cmd(s), s.styleName, true)).toBe(1);
  expect(R.ruleStrength(R.newCommander("native"), s.styleName, false)).toBe(1);
});

Given("a commander in the style {string}", (s, name: string) => {
  s.styleName = name;
  s.cmd = R.newCommander("a commander", { styles: [name] });
});
const ENEMY_TOKENS: Record<string, string[]> = {
  "pikes (W6) in the sector charged": ["W6", "pikes in sector"],
  "W9 Volley fire drill": ["W9"],
  "only levy foot": [],
  "W8 massed": ["W8", "W8 massed"],
  "W17 with W19": ["W17", "W19"],
  "W9 with W8": ["W9", "W8"],
};
Given(/^the enemy has (pikes \(W6\) in the sector charged|W9 Volley fire drill|only levy foot|W8 massed|W17 with W19|W9 with W8)$/, (s, e: string) => {
  s.enemy = new Set(ENEMY_TOKENS[e]);
});
Then(/^his style is (stale|not stale)$/, (s, st: string) => expect(R.isStale(s.styleName, s.enemy)).toBe(st === "stale"));

Given("the commander of {string} in {int} fights in the style {string} with Cunning {int}", (s, country: string, year: number, name: string, cunning: number) => {
  s.era = R.eraOfYear(year);
  s.styleName = name;
  s.cmd = R.newCommander("Bayard", { country, cunning, styles: [name] });
});
Given("the Spanish army knows {string}", (s, inv: string) => {
  const tokens = ids(inv);
  hook(s, () => {
    s.sib = R.styleInBattle(s.styleName, tokens);
    const b = sameBattle();
    b.era = s.era;
    b.defender.style = s.styleName;
    b.defender.staleTokens = tokens;
    b.attacker.country = "Spain";
    s.result = R.fightBattle(b);
  });
});
When("the battle is fought", (s) => run(s));
Then("he has no special rule and {int} orders per bell", (s, n: number) => {
  expect(s.sib.rule).toBeNull();
  expect(s.sib.orderLoss).toBe(1);
  expect(R.ordersPerBell(cmd(s).cunning, s.era, undefined, true)).toBe(n);
  expect(R.ordersPerBell(cmd(s).cunning, s.era, undefined, false)).toBe(n + 1);
});
Then("the battle report says why his style failed", (s) => {
  expect(s.sib.reason).toMatch(/stale against W9/);
  expect(s.result.reason).toContain(s.sib.reason);
});

Given("a commander of {string} in the style {string}", (s, country: string, name: string) => {
  s.cmd = R.newCommander("a commander", { country, styles: [name] });
});
Given("a newer style {string} entered his country's list", (s, name: string) => {
  s.newStyle = name;
});
When("{int} years pass in which he served", (s, years: number) => {
  R.learnsStyle(cmd(s), s.newStyle, { yearsServedSince: years - 1 });
  expect(cmd(s).styles).not.toContain(s.newStyle);
  R.learnsStyle(cmd(s), s.newStyle, { yearsServedSince: years });
});
When("he graduates from an academy that teaches it", (s) => void R.learnsStyle(cmd(s), s.newStyle, { academy: true }));
When("he loses a battle to it", (s) => void R.learnsStyle(cmd(s), s.newStyle, { lostTo: true }));
Then("he knows the style {string}", (s, name: string) => expect(cmd(s).styles).toContain(name));
Given("a commander who knows one style and has {int} victories", (s, v: number) => {
  s.cmd = R.newCommander("a commander", { styles: ["Three battles"], victories: v });
  expect(R.maySecondStyle(s.cmd)).toBe(false);
});
Then("he may know a second style", (s) => expect(R.maySecondStyle(cmd(s))).toBe(true));

const STYLE_RULES: Record<string, Record<string, number | boolean>> = {
  "his Shock charges deal x2.5 instead of x2": { charge: 2.5 },
  "his reserve adds +5 % break point to the whole army": { reserve_army_break: 0.05 },
  "his dug sectors double the first bell's Shot": { dug_first_bell_shot: 2 },
  "his pikes advance in the first bell without their charge being reversed by Shock": { pikes_advance_first_bell: true, pikes_not_reversed: true },
  "he can dig in on a day he marched and his dug sectors block Turn and Drive": { dig_after_march: true, dug_block_turn_drive: true },
  "Commit reserve gives x1.5 hits in the bell it arrives": { commit_reserve_hits: 1.5 },
  "his centre counts as dug in": { centre_dug: true },
  "his Shot has no ammunition limit for the first 6 bells": { unlimited_ammo_bells: 6 },
  "his Turn hits x2 instead of x1.5": { turn_hits: 2 },
  "his end sectors get +25 % room": { end_room: 1.25 },
  "when his army would break it fights one more bell at x1.5": { last_stand_bells: 1, last_stand_hits: 1.5 },
  "half of the enemy's killed are taken as prisoners": { killed_to_prisoners: 0.5 },
  "his companies are Brace and Shot in one and can't Shift": { brace_and_shot: true, no_shift: true },
  "his charges are not reversed by Brace in the first contact": { first_contact_not_reversed: true },
  "his charges into Raw companies deal x3": { charge_raw: 3 },
  "his breaches come x1.5 faster and storming losses are halved": { breaches: 1.5, storm_losses: 0.5 },
  "one end sector gets double room for one bell and Turn from it is x2": { end_room_one_bell: 2, turn_from_end: 2 },
  "all guns fire into one sector for two bells and its defenders are -15 % break point": { massed_fire_bells: 2, target_break: -0.15 },
  "an enemy army whose two end sectors are lost can't withdraw and all its men become prisoners when it breaks": { ends_lost_no_withdraw: true, all_prisoners: true },
  "the attacker's flee share is halved": { attacker_flee: 0.5 },
  "breaks are delayed by one bell and losses are x2 for both sides": { break_delay_bells: 1, losses: 2 },
  "level 4+ companies can Drive through a sector that is still held": { drive_through_level: 4 },
};
for (const [text, effects] of Object.entries(STYLE_RULES)) {
  Then(text, (s) => {
    const sib = R.styleInBattle(s.styleName, new Set());
    expect(sib.rule).toMatchObject(effects);
    // The rules the engine already plays.
    if ("charge" in effects) expect(R.chargeOf({ sectorCharge: true, firstContact: true, targetRoles: ["Line"], chargeMul: sib.rule!["charge"] as number }).dealt).toBe(2.5);
    if ("breaches" in effects) {
      const st = { styleBreaches: sib.rule!["breaches"] as number, bombards: 4, fieldGuns: 0 };
      expect(R.breachSpeed(st, false)).toBe(1.5);
      expect(R.storm({ castle: "stone castle", ground: "farmland", breaches: 1 }, { stormLosses: sib.rule!["storm_losses"] as number }).stormerLosses).toBe(W.storm.losses * 0.5);
    }
    if ("killed_to_prisoners" in effects) expect(R.captureWarfare(400).prisoners).toBe(200);
    if ("attacker_flee" in effects) close(R.fleeShare(R.newCompany({ kind: "levy", arm: "levy foot", men: 1000 }), { multiplier: sib.rule!["attacker_flee"] as number }), 0.1);
  });
}

Given("the province {string} homeland of {string} is occupied by {string} in {int}", (s) => {
  s.homelandOccupied = true;
});
Given("{string} has the style {string}", (s, _c: string, name: string) => {
  s.ownStyles = [name];
});
Then("hidden bands raid the food reserve of the French army there", (s) => {
  expect(R.guerrillaRaids(s.ownStyles, s.homelandOccupied)).toBe(true);
  expect(R.guerrillaRaids(s.ownStyles, false)).toBe(false);
  expect(R.guerrillaRaids(["Three battles"], true)).toBe(false);
});
Given("a homeland province of a country with the style {string} is occupied", (s, name: string) => {
  s.ownStyles = [name];
  s.homelandOccupied = true;
});
Then("rebel bands form for that country in the province", (s) => {
  expect(R.peoplesWarBands(s.ownStyles, s.homelandOccupied)).toBe(true);
  expect(R.peoplesWarBands(s.ownStyles, false)).toBe(false);
});
Given("a Maratha commander in the style {string} has hidden companies", (s, name: string) => {
  s.styleName = name;
});
When("an enemy army marches through", (s) => {
  s.raids = R.raidsMarchers(s.styleName, true);
});
Then("the hidden companies can attack it outside battle, raiding its food reserve", (s) => {
  expect(s.raids).toBe(true);
  expect(R.raidsMarchers(s.styleName, false)).toBe(false);
});
Given("a Zulu commander in the style {string}", (s, name: string) => {
  s.styleName = name;
});
When("he fights a British thin line spread over many sectors with ammunition far in the camp", (s) => {
  s.sib = R.styleInBattle(s.styleName, new Set(["W16"]));
});
Then("from the second bell both British end sectors count as Turned on", (s) => {
  expect(s.sib.rule).toMatchObject({ ends_turned_from_bell: 2 });
  expect(R.approachOf(s.styleName, "attacker")).toBe("Envelopment");
});
When("he later fights a British square that knows {string} and {string}", (s, a: string, b: string) => {
  s.sib = R.styleInBattle(s.styleName, new Set([...ids(a), ...ids(b)]));
});
Then("his style is stale and the horns never reach the ends", (s) => {
  expect(s.sib.rule).toBeNull();
  expect(s.sib.reason).toMatch(/stale/);
});

// ---------------------------------------------------------------- warfare through the eras

/** Every W invention of an era or earlier, from the research tree. */
function wUpTo(e: R.Era): Set<string> {
  const out = new Set<string>();
  for (const inv of tree().inventions.values()) if (/^W\d+$/.test(inv.id) && R.ERAS.includes(inv.era as R.Era) && R.eraIndex(inv.era as R.Era) <= R.eraIndex(e)) out.add(inv.id);
  return out;
}
Given("the country {string} knows the inventions of era {word}", (s, country: string, e: string) => {
  s.sides = { [country]: wUpTo(era(e)) };
});
Given("the Zulu kingdom knows no W inventions", (s) => {
  s.sides["Zulu kingdom"] = new Set<string>();
});
When("they fight a battle in {int}", (s, year: number) => {
  s.era = R.eraOfYear(year);
  const brit = R.newArmy("b", "Britain", [R.newCompany({ kind: "standing regiment", arm: "riflemen", men: 1700, drill: 12, scars: 3, arms: 51, id: "b1" })], { commander: R.newCommander("Chelmsford", { cunning: 2 }) });
  const zulu = R.newArmy("z", "Zulu kingdom", [R.newCompany({ kind: "levy", arm: "levy foot", men: 20000, drill: 6, scars: 1, id: "z1" })], { commander: R.newCommander("Ntshingwayo", { cunning: 4 }) });
  s.result = R.fightBattle({ attacker: { country: "Zulu kingdom", army: zulu, known: s.sides["Zulu kingdom"], style: "Impondo zankomo" }, defender: { country: "Britain", army: brit, known: s.sides["Britain"], style: "Platoon fire" }, sectors: R.battlefield(["Waste", "Waste", "Fields", "Waste", "Waste"]), ground: "grassland", era: s.era });
});
Then("each side fights with the troop types, style forms and skill rules of the inventions it knows", (s) => {
  const brit: Set<string> = s.sides["Britain"];
  const zulu: Set<string> = s.sides["Zulu kingdom"];
  expect(R.canField("riflemen", { known: brit })).toBe(true);
  expect(R.canField("riflemen", { known: zulu })).toBe(false);
  expect(R.hitsShare(brit)).toBeGreaterThan(R.hitsShare(zulu));
  expect(R.countryStyles("Zulu kingdom", zulu)).toContain("Impondo zankomo");
  expect(R.countryStyles("Britain", brit)).toContain("Platoon fire");
  expect(R.ordersPerBell(4, s.era, brit)).toBeGreaterThanOrEqual(R.ordersPerBell(4, s.era, zulu));
  expect(s.result.bells).toBeGreaterThan(0);
});

Given("a company of arm {string}", (s, arm: string) => {
  s.company = R.newCompany({ kind: "levy", arm, men: 1000 });
});
Given("the enemy knows {string}", (s, inv: string) => {
  s.enemyKnown = ids(inv);
});
Given("the enemy does not know {string}", (s) => {
  s.enemyKnown = new Set<string>();
});
Then("the company fights at half strength", (s) => expect(R.againstEnemy(company(s).arm, s.enemyKnown).strength).toBe(0.5));
Then("the company fights at full strength", (s) => expect(R.againstEnemy(company(s).arm, s.enemyKnown).strength).toBe(1));
Given("a light horse company", (s) => {
  s.company = R.newCompany({ kind: "retinue", arm: "light horse", men: 500 });
});
Then("it is obsolete as Shock but still fights as Light", (s) => {
  const a = R.againstEnemy(company(s).arm, s.enemyKnown);
  expect(a.roles).toEqual(["Light"]);
  expect(a.strength).toBe(1);
});
Given("the country {string} has horse archers", (s) => {
  s.company = R.newCompany({ kind: "retinue", arm: "horse archers", men: 500 });
});
Given("its enemy knows {string}", (s, inv: string) => {
  s.enemyKnown = ids(inv);
});
Then("the horse archers still scout and raid", (s) => {
  const a = R.againstEnemy(company(s).arm, s.enemyKnown);
  expect(a.strength).toBe(0.5);
  expect(a.keeps).toEqual(["scouting", "raiding"]);
});
Then("the country {string} cannot raise the arm {string}", (s, country: string, arm: string) => {
  // It knew the arm's own invention before.
  s.ownKnown = new Set([...knownOf(s, country), R.armDef(arm).unlock]);
  expect(R.canRaise(arm, { known: s.ownKnown })).toBe(false);
});
Then("its existing pike companies can still be fielded", (s) => {
  expect(R.canField("pikes", { known: s.ownKnown })).toBe(true);
  expect(R.canRaise("pikes", { known: new Set(["W6"]) })).toBe(true);
});

Given("a pike company of level {int}", (s, level: number) => {
  s.company = atLevel(level, { kind: "hired company", arm: "pikes", arms: 10 });
});
When("it re-arms to {string}", (s, arm: string) => {
  s.stores = { arms: 100, powder: 100 };
  s.took = R.rearm(company(s), arm, s.stores);
});
Then("its loads of arms and powder for the new arm are taken from the stores", (s) => {
  const need = R.armDef(company(s).arm).needs;
  expect(s.took).toEqual({ arms: (need.arms! * 1000) / 100, powder: (need.powder! * 1000) / 100 });
  expect(s.stores).toEqual({ arms: 100 - s.took.arms, powder: 100 - s.took.powder });
  expect(company(s).arm).toBe("pike and shot");
});

Given("a company of the country {string} in era {word}", (s, _c: string, e: string) => {
  s.era = era(e);
});
Then("it needs {int}, {int} and {int} months of drill for Drilled, Seasoned and Elite", (s, d: number, se: number, el: number) => {
  expect(W.levels_by_era[s.era as R.Era].drill).toEqual([d, se, el]);
  const at = (drill: number, scars: number): number => R.levelOf(R.newCompany({ kind: "hired company", arm: "pikes", men: 100, drill, scars }), s.era);
  expect([at(d - 1, 0), at(d, 0)]).toEqual([1, 2]);
  expect([at(se - 1, 1), at(se, 1)]).toEqual([2, 3]);
  if (el <= W.drill_max) expect([at(el - 1, 5), at(el, 5)]).toEqual([4, 5]);
});
const pctList = (t: string): number[] => t.replace(/\s*%$/, "").split("/").map((x) => Number(x.trim().replace("+", "")) / 100);
Then(/^its hits bonus at levels 1 to 5 is (.+)$/, (s, t: string) => {
  pctList(t).forEach((v, i) => close(R.levelHits(i + 1, s.era), v));
});
Then(/^its break point bonus at levels 3 to 5 is (.+)$/, (s, t: string) => {
  pctList(t).forEach((v, i) => close(R.levelBreak(i + 3, s.era), v));
  expect(R.levelBreak(2, s.era)).toBe(0);
});

Given("a knight company is raised in era I", (s) => {
  s.era = "I";
  s.company = R.raiseCompany(R.newCompany({ kind: "retinue", arm: "knights and lancers", men: 500 }), "I");
});
Then("it starts at level 3", (s) => {
  expect(R.levelOf(company(s), "I")).toBe(3);
  expect(R.levelOf(R.raiseCompany(R.newCompany({ kind: "retinue", arm: "knights and lancers", men: 500 }), "II"), "II")).toBe(1);
});
Given("a levy company in era I has drill and scars for level 4", (s) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, drill: 4, scars: 3 });
});
Then("it stays at level 3 unless it becomes standing troops", (s) => {
  expect(R.levelOf(company(s), "I")).toBe(3);
  expect(R.levelOf({ ...company(s), kind: "standing regiment" }, "I")).toBe(4);
});
Given("a pike and shot company is level 1 in era II", (s) => {
  s.company = R.newCompany({ kind: "hired company", arm: "pike and shot", men: 1000, arms: 20 });
});
Then("it fights as levy foot", (s) => {
  expect(R.eraNotes(company(s), "II").fightsAs).toBe("levy foot");
  expect(R.eraNotes({ ...company(s), drill: 3 }, "II").fightsAs).toBe("pike and shot");
});
Given("a musketeer company is level 1 in era III with W9", (s) => {
  s.company = R.newCompany({ kind: "hired company", arm: "musketeers", men: 1000, arms: 20 });
  s.known = new Set(["W9"]);
});
Then("it shoots at half", (s) => {
  expect(R.eraNotes(company(s), "III", s.known).shotFactor).toBe(0.5);
  expect(R.eraNotes({ ...company(s), drill: 4 }, "III", s.known).shotFactor).toBe(1);
});
Given("a line infantry company is level 1 in era IV", (s) => {
  s.company = R.newCompany({ kind: "standing regiment", arm: "line infantry", men: 1000, arms: 20 });
});
Then("it can't change sector in a bell", (s) => {
  expect(R.eraNotes(company(s), "IV").canShiftInBell).toBe(false);
  expect(R.eraNotes({ ...company(s), drill: 6 }, "IV").canShiftInBell).toBe(true);
});
Given("a realm with W18 calls up former soldiers in era VI", (s) => {
  s.reservists = R.reservistLevel("VI", new Set(["W18"]));
});
Then("they come at level 2", (s) => {
  expect(s.reservists).toBe(2);
  expect(R.reservistLevel("VI", new Set())).toBeNull();
});
Given("a level 4 company fights in era VII", (s) => {
  s.company = R.newCompany({ kind: "standing regiment", arm: "riflemen", men: 1000, drill: 12, scars: 3 });
  expect(R.levelOf(s.company, "VII")).toBe(4);
});
Then("it can infiltrate", (s) => {
  expect(R.eraNotes(company(s), "VII").canInfiltrate).toBe(true);
  expect(R.eraNotes(company(s), "VI").canInfiltrate).toBe(false);
});

Given("the country {string} has a musketeer company of level {int}", (s, _c: string, level: number) => {
  s.company = atLevel(level, { kind: "hired company", arm: "musketeers" });
  s.level = level;
});
When("{string} learns {string}", (s, _c: string, inv: string) => {
  s.dropped = R.learnInvention([company(s)], R.inventionId(inv));
});
Then("the company's level is {int}", (s, n: number) => {
  expect(s.dropped).toContain(s.company);
  expect(R.levelOf(company(s), "II")).toBe(n);
});
Then("it regains the level after drilling the new era's Drilled months", (s) => {
  const newEra: R.Era = "IV";
  const months = W.levels_by_era[newEra].drill[0]!;
  for (let m = 1; m < months; m++) R.monthDrill(company(s), "in camp", { era: newEra });
  expect(R.levelOf(company(s), "II")).toBe(s.level - 1);
  R.monthDrill(company(s), "in camp", { era: newEra });
  expect(R.levelOf(company(s), "II")).toBe(s.level);
});

Given("a commander with Might {int} in era {word}", (s, might: number, e: string) => {
  s.cmd = R.newCommander("a commander", { might });
  s.era = era(e);
});
Then(/^the men in his sector get \+(\d+) % hits and \+(\d+) % break point(?:, and he has a 1 in (\d+) risk if the sector is lost)?$/, (s, h: string, b: string, risk?: string) => {
  const m = R.mightEffect(cmd(s).might, s.era);
  expect(m.scope).toBe("sector");
  close(m.hits, pct(Number(h)));
  close(m.breakPoint, pct(Number(b)));
  if (risk) {
    close(m.risk!, 1 / Number(risk));
    expect(m.riskIf).toBe("sector lost");
  }
});
Then(/^the whole army gets \+(\d+) % hits and \+(\d+) % break point, and (?:he is at risk only if the camp is taken|his Drive orders get \+(\d+) %)$/, (s, h: string, b: string, drive?: string) => {
  const m = R.mightEffect(cmd(s).might, s.era);
  expect(m.scope).toBe("army");
  close(m.hits, pct(Number(h)));
  close(m.breakPoint, pct(Number(b)));
  expect(m.riskIf).toBe("camp taken");
  if (drive) close(m.drive, pct(Number(drive)));
});
Given("a commander with Cunning {int} in era {word} whose realm knows {word}", (s, cunning: number, e: string, inv: string) => {
  s.cmd = R.newCommander("a commander", { cunning });
  s.era = era(e);
  s.known = ids(inv);
});
Given("a commander in era {word} gives an order to a sector {int} sectors from his own", (s, e: string, d: number) => {
  s.era = era(e);
  s.distance = d;
});
Then(/^the order arrives (the same bell|next bell)$/, (s, when: string) => expect(R.orderArrives(s.era, s.distance)).toBe(when));
Then("captains give their own orders in their sectors", (s) => {
  expect(R.captainsGiveOrders(s.era)).toBe(true);
  expect(R.captainsGiveOrders("V")).toBe(false);
});
Given("a commander with Logistics {int} in era {word}", (s, l: number, e: string) => {
  s.cmd = R.newCommander("a commander", { logistics: l });
  s.era = era(e);
});
const logi = (s: Scenario): ReturnType<typeof R.logisticsEffect> => R.logisticsEffect(cmd(s).logistics, s.era);
Then("his bowmen shoot {int} bells before refilling", (s, n: number) => expect(logi(s)).toMatchObject({ ammo: n, who: "bows" }));
Then("his Shot shoots {int} bells before refilling", (s, n: number) => expect(logi(s)).toMatchObject({ ammo: n, who: "Shot" }));
Then("his Shot and guns shoot {int} bells and his guns need powder wagons in the camp", (s, n: number) => expect(logi(s)).toMatchObject({ ammo: n, who: "Shot and guns", powderWagons: true }));
Then("his companies have {int} bells of ammunition, fight at half without it, and up to {int} sectors rotate for free", (s, n: number, rot: number) => {
  expect(logi(s)).toMatchObject({ ammo: n, who: "all", withoutAmmo: 0.5, freeRotation: rot });
});
Then("his tanks and aircraft have fuel for {int} bells, then stop, and depth replaces {int} % of losses per bell", (s, n: number, d: number) => {
  const l = logi(s);
  expect(l).toMatchObject({ ammo: n, who: "tanks and aircraft", fuel: true });
  close(l.depthReplaces, pct(d));
});

// ---------------------------------------------------------------- sieges

const siegeOf = (s: Scenario): R.Siege => {
  expect(s.siege, "a siege").toBeDefined();
  return s.siege;
};
const BIG_STORE = 1e6;

Given("a castle of type {string} on ground {string}", (s, castle: string, ground: string) => {
  s.siege = R.newSiege(castle, { ground, garrison: 300, store: BIG_STORE });
});
Then("its walls bonus is +{int} %", (s, n: number) => close(R.wallsBonus(siegeOf(s).castle, siegeOf(s).ground), pct(n)));
Then("it needs {int} shot or {int} months of mining per breach", (s, shot: number, mining: number) => {
  expect(R.castleDef(siegeOf(s).castle)).toMatchObject({ shot_per_breach: shot, mining_months: mining });
});
Then("its garrison room is {int}", (s, room: number) => expect(R.castleDef(siegeOf(s).castle).room).toBe(room));

Given("the castle of {string} has no garrison", (s) => {
  s.siege = R.newSiege("stone castle", { garrison: 0, store: 5000 });
});
When("an army of {string} besieges it", (s) => {
  s.besieged = R.besiege(siegeOf(s));
});
Then("the castle of {string} falls at once", (s) => {
  expect(s.besieged).toBe("falls at once");
  expect(siegeOf(s).fallen).toBe(true);
  expect(R.besiege(R.newSiege("stone castle", { garrison: 100 }))).toBe("siege started");
});

Given("a castle with a garrison of {int}", (s, n: number) => {
  s.siege = R.newSiege("stone castle", { garrison: n, store: BIG_STORE });
});
Given("{int} men besiege it", (s, n: number) => {
  siegeOf(s).besiegers = n;
});
Then(/^the castle is (closed|not closed)$/, (s, c: string) => expect(R.isClosed(siegeOf(s))).toBe(c === "closed"));
Given("a castle that is not closed", (s) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, besiegers: 500, store: BIG_STORE });
  expect(R.isClosed(s.siege)).toBe(false);
});
Given(/^it stands on (an inland tile|a shore tile)$/, (s, t: string) => {
  siegeOf(s).shore = t === "a shore tile";
});
Given(/^the sea (is not relevant|is not blockaded|is blockaded)$/, (s, b: string) => {
  siegeOf(s).blockaded = b === "is blockaded";
});
Then(/^it can be fed (by road from its own side|by road and by sea|by road only)$/, (s, how: string) => {
  expect(R.fedBy(siegeOf(s))).toEqual(how === "by road and by sea" ? ["road", "sea"] : ["road"]);
  expect(R.fedBy({ ...siegeOf(s), besiegers: 900 })).toEqual([]);
});

Given("a castle with a garrison of {int} and {int} townsfolk on its tile", (s, g: number, t: number) => {
  s.siege = R.newSiege("stone castle", { garrison: g, townsfolk: t, store: 10000 });
});
When("a month of siege passes", (s) => {
  run(s);
  if (s.siege) s.month = R.siegeMonth(s.siege);
});
Then("{int} rations are eaten from the castle store", (s, n: number) => {
  expect(s.month.eaten).toBe(n);
  expect(siegeOf(s).store).toBe(10000 - n);
});
Given("a besieged castle's commander drives out the townsfolk", (s) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, townsfolk: 500, store: 10000 });
  hook(s, () => (s.drive = R.driveOutTownsfolk(siegeOf(s))));
});
Then("they no longer eat from the castle store", (s) => expect(R.siegeMonth(siegeOf(s)).eaten).toBe(300));
Then("the provinces next door gain refugees and Burned homes", (s) => {
  expect(s.drive.refugees).toBe(500);
  expect(s.drive.nextDoor).toEqual(["refugees", "Burned homes"]);
});

Given("an army of {string} besieges a French castle", (s, owner: string) => {
  supply(s, owner, { reserve: 5000 });
  Object.assign(sprov(s, "Troyes"), { localStore: 0, tiles: [{ use: "Fields", seasonFood: 4000 }, { use: "Fields", seasonFood: 4000 }, { use: "Pasture", seasonFood: 3000 }, { use: "Fields", seasonFood: 4000 }] });
  hook(s, () => {
    s.weeks = [];
    for (let w = 0; w < 4; w++) s.weeks.push(R.supplyWeek(s.sup, sprov(s, "Troyes"), false));
  });
});
Then("it eats from its reserve, then plunders the province around it tile by tile", (s) => {
  const ws: R.WeekTake[] = s.weeks;
  expect(ws[0]!.fromReserve).toBe(5000 > R.weekOf(20000) ? R.weekOf(20000) : 5000);
  expect(ws[0]!.burnedTile).toBe(false);
  for (const w of ws.slice(1)) expect(w.burnedTile).toBe(true);
  expect(sprov(s, "Troyes").tiles!.filter((t) => t.burned)).toHaveLength(ws.length - 1);
});

Given("a castle of type {string}", (s, castle: string) => {
  s.siege = R.newSiege(castle, { garrison: 300, store: BIG_STORE });
});
Given(/^the besiegers have (\d+) (bombards|field guns)$/, (s, n: string, kind: string) => {
  if (kind === "bombards") siegeOf(s).bombards = Number(n);
  else siegeOf(s).fieldGuns = Number(n);
});
Given(/^the besieging country (knows|does not know) "([^"]+)"$/, (s, k: string, inv: string) => {
  siegeOf(s).besiegerKnown = k === "knows" ? ids(inv) : new Set<string>();
});
Then("the besiegers add {int} shot a month", (s, n: number) => close(R.shotPerMonth(siegeOf(s)), n));
Given("a stone castle besieged by an army with no guns", (s) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, besiegers: 3000, store: BIG_STORE });
});
When("{int} months of mining pass", (s, n: number) => {
  for (let m = 0; m < n; m++) R.siegeMonth(siegeOf(s));
});
Then(/^the castle has (\d+) breach(?:es)?$/, (s, n: string) => expect(siegeOf(s).breaches).toBe(Number(n)));
Given("a besieging commander with trait {string}", (s, t: string) => {
  s.cmd = R.newCommander("a commander", { traits: [t] });
});

Given("a besieged castle with {int} breaches", (s, n: number) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, besiegers: 3000, breaches: n, store: BIG_STORE });
});
Given(/^its garrison (has a warden|has 200 spare men|has no warden and no spare men)$/, (s, h: string) => {
  if (h === "has a warden") siegeOf(s).warden = true;
  if (h === "has 200 spare men") siegeOf(s).spareMen = 200;
});
When("a month of siege passes with no new breach", (s) => {
  s.month = R.siegeMonth(siegeOf(s));
  expect(s.month.newBreaches).toBe(0);
});

Given("a besieged castle with a garrison of {int}", (s, n: number) => {
  s.siege = R.newSiege("stone castle", { garrison: n, besiegers: 6000, store: BIG_STORE });
});
When("the garrison sallies", (s) => {
  s.sally = R.sally(siegeOf(s));
});
Then("{int} men fight a one-bell battle against the siege camp", (s, n: number) => {
  close(s.sally.men, n);
  expect(s.sally.bells).toBe(1);
});
Then("the garrison may sally only once that month", (s) => {
  expect(R.sally(siegeOf(s))).toBeNull();
  R.siegeMonth(siegeOf(s));
  expect(R.sally(siegeOf(s))).not.toBeNull();
});
Given("a besieged castle with an empty store and a garrison of {int}", (s, n: number) => {
  s.siege = R.newSiege("stone castle", { garrison: n, besiegers: 6000, store: 0 });
});
Then("the garrison has {int} men", (s, n: number) => close(siegeOf(s).garrison, n));
Then("its break point is {int} % lower", (s, n: number) => {
  const g = R.newCompany({ kind: "garrison", arm: "levy foot", men: siegeOf(s).garrison });
  expect(siegeOf(s).starving).toBe(true);
  close(R.breakPoint(g, { starving: true }) - R.breakPoint(g), -pct(n));
});
Given("an army has besieged the same castle for {int} months", (s, n: number) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, besiegers: 6000, store: BIG_STORE, months: n });
});
When(/^the (\d+)(?:st|nd|rd|th) month of siege passes$/, (s, n: string) => {
  expect(siegeOf(s).months + 1).toBe(Number(n));
  s.month = R.siegeMonth(siegeOf(s));
});
Then("the besiegers' sickness is doubled", (s) => {
  expect(s.month.sicknessMultiplier).toBe(2);
  expect(R.siegeMonth(R.newSiege("stone castle", { garrison: 300, store: BIG_STORE, months: 2 })).sicknessMultiplier).toBe(1);
  close(R.sicknessLoss(6000, "Medium", { doubled: s.month.sicknessMultiplier === 2 }), 2 * R.sicknessLoss(6000, "Medium"));
});

Given("a castle of type {string} with {int} breaches", (s, castle: string, n: number) => {
  s.siege = R.newSiege(castle, { garrison: 300, breaches: n, store: BIG_STORE });
});
Then(/^the besieger (cannot|can|can, by scaling the walls at double losses) storm it$/, (s, can: string) => {
  const st = R.stormable(siegeOf(s));
  expect(st.can).toBe(can !== "cannot");
  expect(st.scaling).toBe(can.includes("scaling"));
  if (st.scaling) expect(R.storm(siegeOf(s)).stormerLosses).toBe(2);
});
Then("the storm is fought on one sector of room {int}", (s, room: number) => expect(R.stormable(siegeOf(s)).room).toBe(room));
Given("a stone castle on farmland with {int} breach", (s, n: number) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, breaches: n, store: BIG_STORE });
});
When("the besieger storms it", (s) => {
  s.storm = R.storm(siegeOf(s));
});
Then("the storm lasts up to {int} bells", (s, n: number) => expect(s.storm.bells).toBe(n));
Then("the garrison gets a walls bonus of about +{int} %", (s, n: number) => expect(Math.round(s.storm.walls * 100)).toBe(n));
Then("the stormers' losses are x1.5", (s) => expect(s.storm.stormerLosses).toBe(1.5));

Given("the castle of {string} is besieged by {string}", (s) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, besiegers: 6000, store: 1800 });
});
When(/^the siege ends by (honours of war|surrender|storm|relief|lifting)$/, (s, how: R.SiegeEnd) => {
  s.end = R.endSiege(siegeOf(s), how);
});
Then("the garrison marches out with its arms to the nearest friendly castle and the castle is taken whole", (s) => {
  expect(s.end).toMatchObject({ castleTaken: true, garrison: "marches out with arms" });
  expect(R.honoursMarchTo([{ province: "Paris", days: 9 }, { province: "Reims", days: 4 }])).toBe("Reims");
  expect(R.takeCastle(siegeOf(s), "Champagne").store).toBe(1800);
});
Then("the garrison become prisoners of {string}", (s) => expect(s.end).toMatchObject({ castleTaken: true, garrison: "prisoners" }));
Then("the garrison is killed or taken and {string} chooses Spare, Plunder or Raze", (s) => {
  expect(s.end).toMatchObject({ castleTaken: true, garrison: "killed or taken", choices: ["Spare", "Plunder", "Raze"] });
});
Then("a French army beats the besiegers and the garrison joins the battle as a reserve with +10 % strength", (s) => {
  expect(s.end).toMatchObject({ castleTaken: false, garrison: "joins as reserve", reliefBonus: 0.1 });
});
Then("the besiegers leave", (s) => expect(s.end).toMatchObject({ castleTaken: false, garrison: "stays" }));
Given("{string} offered honours of war to the garrison of {string} and it accepted", (s) => {
  s.oaths = { oathsBroken: 0 };
});
When("{string} breaks those terms", (s) => R.breakTerms(s.oaths));
Then("{string} counts an oath broken", (s) => expect(s.oaths.oathsBroken).toBe(1));

Given("{string} storms the castle of {string}", (s) => {
  s.sackP = { yearTax: 1200, townBuildings: 6, townsfolk: 3000 };
});
When(/^it chooses (Spare|Plunder|Raze)$/, (s, c: "Spare" | "Plunder" | "Raze") => {
  s.sacked = R.sack(c, s.sackP);
});
Then("nothing more happens", (s) => expect(s.sacked).toEqual({ gold: 0, buildingsBurned: 0, townsfolkLost: 0, burnedHomes: false, castleDestroyed: false }));
Then("Burgundy gains gold equal to a year of Troyes's tax owed, 1 in 3 town buildings burn, 10 % of townsfolk die or flee, and Troyes gains Burned homes", (s) => {
  expect(s.sacked).toMatchObject({ gold: 1200, burnedHomes: true, castleDestroyed: false });
  close(s.sacked.buildingsBurned, 2);
  close(s.sacked.townsfolkLost, 300);
  expect(R.sack("Plunder", { ...s.sackP, cruel: true }).gold).toBe(1800);
});
Then("the castle of {string} is destroyed", (s) => expect(s.sacked.castleDestroyed).toBe(true));

Given(/^an AI garrison with (\d+) breaches and (\d+) (months|weeks) of food$/, (s, b: string, n: string, unit: string) => {
  s.honours = { breaches: Number(b), foodMonths: unit === "months" ? Number(n) : (Number(n) * W.days_per_week) / W.days_per_month, reliefDays: null, cruel: false };
});
Given(/^(no relief army is within 10 days|a relief army is within 10 days)$/, (s, r: string) => {
  s.honours.reliefDays = r.startsWith("no") ? null : 5;
});
Given(/^the besieging commander (is not Cruel|is Cruel)$/, (s, c: string) => {
  s.honours.cruel = c === "is Cruel";
});
Then(/^the garrison (accepts|refuses)$/, (s, a: string) => expect(R.aiAcceptsHonours(s.honours)).toBe(a === "accepts"));

const BRIBE: Record<string, Parameters<typeof R.bribeCanWork>[0]> = {
  "garrison is owed 2 months of pay": { payOwed: 2 },
  "lord is wavering": { lordLoyalty: "Wavering" },
  "lord is disloyal": { lordLoyalty: "Disloyal" },
  "captain speaks a language different from his ruler's": { captainTongue: "German", rulerTongue: "French" },
  "garrison is paid and loyal, of its ruler's language": { payOwed: 0, lordLoyalty: "Loyal", captainTongue: "French", rulerTongue: "French" },
};
Given(/^a besieged castle whose (.+)$/, (s, c: string) => {
  s.bribe = BRIBE[c];
  expect(s.bribe).toBeDefined();
});
Then(/^the bribe (can work|cannot work)$/, (s, w: string) => expect(R.bribeCanWork(s.bribe)).toBe(w === "can work"));
Given("a bribe is offered to a garrison", (s) => {
  s.gold = 1000;
});
Then("a Greedy commander inside takes it", (s) => {
  expect(R.bribeGreed(s.gold, { greedyInside: true }).taken).toBe(true);
  expect(R.bribeGreed(s.gold, {}).taken).toBe(false);
});
Then("a Greedy commander outside pockets a tenth of it", (s) => {
  expect(R.bribeGreed(s.gold, { greedyOutside: true }).pocketed).toBe(100);
  expect(R.bribeGreed(s.gold, {}).pocketed).toBe(0);
});

Given("the castle of {string} is a stone castle with a garrison of {int} and {int} months of store", (s, _p: string, g: number, months: number) => {
  s.siege = R.newSiege("stone castle", { garrison: g, store: g * W.siege.ration * months });
});
Given("{string} besieges it with {int} men and {int} bombards", (s, _c: string, men: number, bombards: number) => {
  Object.assign(siegeOf(s), { besiegers: men, bombards });
});
When("{int} months of siege pass", (s, n: number) => {
  for (let m = 0; m < n; m++) R.siegeMonth(siegeOf(s));
});
Then("the castle has {int} breach and a walls bonus of about +{int} %", (s, b: number, walls: number) => {
  expect(siegeOf(s).breaches).toBe(b);
  expect(Math.round(R.wallsWithBreaches(siegeOf(s).castle, siegeOf(s).ground, b) * 100)).toBe(walls);
});
When("{string} offers honours in month {int} and no French relief army is within {int} days", (s, _c: string, month: number) => {
  expect(siegeOf(s).months).toBe(month);
  s.accepts = R.aiAcceptsHonours({ breaches: siegeOf(s).breaches, foodMonths: R.foodMonths(siegeOf(s)), reliefDays: null, cruel: false });
});
Then("the garrison accepts and marches to {string}", (s, to: string) => {
  expect(s.accepts).toBe(true);
  s.end = R.endSiege(siegeOf(s), "honours of war");
  expect(s.end.garrison).toBe("marches out with arms");
  expect(R.honoursMarchTo([{ province: to, days: 4 }, { province: "Paris", days: 8 }])).toBe(to);
});
Then("{string} takes the castle whole with its castle store and control of food spread in Champagne", (s) => {
  const left = siegeOf(s).store;
  expect(left).toBeGreaterThan(0);
  expect(R.takeCastle(siegeOf(s), "Champagne")).toEqual({ store: left, foodHubOf: "Champagne" });
});

Given("a siege is running", (s) => {
  s.siege = R.newSiege("stone castle", { garrison: 300, besiegers: 6000, bombards: 4, store: BIG_STORE });
});
Then("its steps run once at the end of each month", (s) => {
  const step = timeConfig.cadences.find((c: { step: string }) => c.step === "siege month") as { context: string; cadence: string } | undefined;
  expect(step).toMatchObject({ context: "warfare", cadence: "monthly" });
  R.siegeMonth(siegeOf(s));
  R.siegeMonth(siegeOf(s));
  expect(siegeOf(s).months).toBe(2);
});

// ---------------------------------------------------------------- occupation and raids

Given(/^the province "([^"]+)" of "([^"]+)" (has a castle|has no castle)$/, (s, province: string, owner: string, c: string) => {
  s.holding = { province, owner, castle: c === "has a castle" } satisfies R.Holding;
});
When(/^an army of "([^"]+)" (takes its castle|holds it for a season)$/, (s, by: string, how: "takes its castle" | "holds it for a season") => {
  if (how === "holds it for a season") {
    s.holding.heldMonths = W.occupation.hold_months - 1;
    expect(R.occupy(s.holding, by, how)).toBe(false);
    s.holding.heldMonths = W.occupation.hold_months;
  }
  expect(R.occupy(s.holding, by, how)).toBe(true);
});
Then("{string} is occupied by {string}", (s, _p: string, by: string) => expect(s.holding.occupiedBy).toBe(by));
Then("{string} gets its tax, recruits, food and trade", (s) => expect(R.occupierGets(s.holding)).toEqual(["tax", "recruits", "food", "trade"]));
Given("the lord {string} holds a province of {string}", (s, name: string, owner: string) => {
  s.lord = lord(name, "Loyal");
  s.holding = { province: "Bourbonnais", owner, castle: true, lord: s.lord };
});
When("{string} occupies that province", (s, by: string) => void R.occupy(s.holding, by, "takes its castle"));
Then("the lord {string} wavers toward {string}", (s, _l: string, by: string) => {
  expect(s.holding.lord.loyalty).toBe("Wavering");
  expect(s.holding.lord.wavesToward).toBe(by);
});
Given("a horse-only army of {int} riders of {string} with orders Raid in an enemy province", (s, riders: number) => {
  hook(s, () => {
    s.raid = R.raidWeek(riders, true);
    expect(R.raidWeek(riders, false)).toBeNull();
  });
});
Then("it burns one tile", (s) => expect(s.raid.tilesBurned).toBe(1));
Then("it takes gold from market and town, and herds and horses from pasture, up to {int} loads", (s, n: number) => {
  expect(s.raid.maxLoot).toBe(n);
  expect(s.raid.loot).toEqual(["gold from market and town", "herds and horses from pasture"]);
});
Then("it moves on without besieging or occupying", (s) => expect(s.raid).toMatchObject({ besieges: false, occupies: false, movesOn: true }));
Given("a raiding army in a province with an enemy castle", (s) => {
  hook(s, () => (s.may = R.raiderMay()));
});
Then("the castle's garrison may sally against it", (s) => {
  expect(s.may.castlesMaySally).toBe(true);
  expect(R.sally(R.newSiege("stone castle", { garrison: 600 }))).toMatchObject({ men: 200, bells: 1 });
});
Given("a horse-only army with orders Raid in a province with an enemy castle", (s) => {
  hook(s, () => (s.may = R.raiderMay()));
});
Then("it cannot besiege or occupy", (s) => expect(s.may).toMatchObject({ besiege: false, occupy: false }));

// ---------------------------------------------------------------- war and peace voices

Given("the country {string} declares war on {string} with the aim {string} naming {string}", (s, a: string, d: string, aim: string, target: string) => {
  s.war = R.openWar("w", a, d, aim, [target]);
});
Then("every country sees the aim", (s) => {
  expect(s.war.visibleTo).toBe("everyone");
  expect([s.war.aim, s.war.aimTarget]).toEqual(["Take land", ["Champagne"]]);
});
Then("the aim decides which lords come and how peace voices speak", (s) => {
  const wants = lord("Duke of Bourbon", "Wavering", { retinue: 2000, want: "Take land" });
  const other = lord("Count of Foix", "Wavering", { retinue: 2000, want: "Tribute" });
  expect(R.callLord(wants, { warAim: s.war.aim }).goesHomeAfter).toBeNull();
  expect(R.callLord(other, { warAim: s.war.aim }).goesHomeAfter).toBe(W.lords.wavering_stay_months);
  expect(R.lordVoice({ provinces: 2, loyalty: "Loyal", aimIsWant: wants.want === s.war.aim }).says).toBe("war");
  expect(R.lordVoice({ provinces: 2, loyalty: "Loyal", aimIsWant: other.want === s.war.aim }).says).toBe("none");
});
Given("the country {string} declares war on {string} with no aim", (s, a: string, d: string) => {
  s.war = R.openWar("w", a, d, null);
  s.lords = [lord("Duke of Bourbon", "Loyal"), lord("Count of Foix", "Loyal", { traits: ["Warlike"] })];
});
When("France takes {int} provinces in the war", (s, n: number) => {
  s.noAim = R.noAimTaken(n, s.lords);
});
Then("France counts {int} Lands taken", (s, n: number) => expect(s.noAim.landsTaken).toBe(n));
Then("its lords who aren't Warlike waver", (s) => expect(s.lords.map((l: Lord) => l.loyalty)).toEqual(["Wavering", "Loyal"]));
Then("its allies don't have to join", (s) => expect(s.noAim.alliesObliged).toBe(false));
Given("the country {string} has a truce with {string}", (s) => {
  s.lords = [lord("Duke of Bourbon", "Loyal"), lord("Duke of Orléans", "Wavering")];
});
When("France declares war on England", (s) => {
  s.broke = R.breakTruce(s.lords);
});
Then("France counts an oath broken", (s) => expect(s.broke.oathsBroken).toBe(1));
Then("every lord of France wavers one step", (s) => expect(s.lords.map((l: Lord) => l.loyalty)).toEqual(["Wavering", "Disloyal"]));

Given("the lord {string} holds {int} provinces of {string} at war", (s, _l: string, n: number) => {
  s.lv = { provinces: n, loyalty: "Loyal" } satisfies R.LordVoiceState;
});
const LORD_SITUATION: Record<string, Partial<R.LordVoiceState>> = {
  "one of his provinces is occupied": { anyOccupied: true },
  "his retinue has lost half its men": { retinueHalfLost: true },
  "he is wavering": { loyalty: "Wavering" },
  "his lands are hungry": { landsHungry: true },
  "he is Warlike": { warlike: true },
  "the war aim is his Want": { aimIsWant: true },
  "he is loyal and France has more victories in this war": { loyalty: "Loyal", moreVictories: true },
};
Given(/^(one of his provinces is occupied|his retinue has lost half its men|he is wavering|his lands are hungry|he is Warlike|the war aim is his Want|he is loyal and France has more victories in this war)$/, (s, sit: string) => {
  Object.assign(s.lv, LORD_SITUATION[sit]);
});
Then(/^his (\d+) voices say (peace|war)$/, (s, n: string, says: string) => {
  expect(R.lordVoice(s.lv)).toEqual({ voices: Number(n), says });
  expect(R.lordVoice({ provinces: Number(n), loyalty: "Loyal" }).says).toBe("none");
});
Given("the royal province {string} of {string} at war", (s) => {
  s.rv = { grievances: [] as string[], occupied: false };
});
const ROYAL: Record<string, { grievances: string[]; occupied: boolean }> = {
  "Conscription and Soldiers quartered": { grievances: ["Conscription", "Soldiers quartered"], occupied: false },
  "Burned homes and Hungry": { grievances: ["Burned homes", "Hungry"], occupied: false },
  "only Heavy taxes": { grievances: ["Heavy taxes"], occupied: false },
  "no grievance but it is occupied": { grievances: [], occupied: true },
};
Given(/^it has (Conscription and Soldiers quartered|Burned homes and Hungry|only Heavy taxes|no grievance but it is occupied)$/, (s, g: string) => {
  s.rv = ROYAL[g];
});
Then(/^its voice says (peace|nothing)$/, (s, v: string) => expect(R.royalVoice(s.rv.grievances, s.rv.occupied)).toBe(v === "nothing" ? "none" : "peace"));
Given("the capital of {string} is besieged", (s) => {
  hook(s, () => (s.count = R.countVoices({ lords: [{ provinces: 3, loyalty: "Loyal" }, { provinces: 2, loyalty: "Loyal" }], royal: ["none", "none", "none", "none", "none"], capitalPeace: true })));
});
Then("a third of all French voices say peace", (s) => {
  close(s.count.peace / s.count.total, 1 / 3);
  close(s.count.peaceShare, 1 / 3);
});
Given("the ruler of {string} is Warlike", (s) => {
  s.warlikeRuler = true;
});
Given("{int} % of French voices say peace", (s, n: number) => {
  s.share = pct(n);
});
Then("{int} % of French voices count as peace", (s, n: number) => {
  close(R.warlikeShare(s.share), pct(n));
  // The same through the count: 60 royal provinces of 100 voices in all (the capital silent, a third of them).
  const royal: R.Voice[] = [...Array(40).fill("peace"), ...Array(27).fill("none")];
  const c = R.countVoices({ lords: [], royal, capitalPeace: false, warlikeRuler: s.warlikeRuler });
  close(c.peaceShare, R.warlikeShare(40 / c.total));
});
Given("the ruler of {string} is a child with a regent", (s) => {
  s.regent = { provinces: 2, loyalty: "Wavering" } satisfies R.LordVoiceState;
  hook(s, () => (s.count = R.countVoices({ lords: [], regent: s.regent, royal: [], capitalPeace: false })));
});
Then("the regent's voices count as a lord's", (s) => {
  const v = R.lordVoice(s.regent);
  expect(s.count.peace).toBe(v.voices);
  expect(R.countVoices({ lords: [s.regent], royal: [], capitalPeace: false }).peace).toBe(s.count.peace);
});

Given(/^(\d+) % of the voices of "([^"]+)" say peace$/, (s, n: string) => {
  s.share = pct(Number(n));
});
Then("France is free to fight on", (s) => expect(R.obligation(s.share)).toBe("free"));
Then("France must accept a peace asking only for provinces the enemy occupies and gold up to its treasury", (s) => expect(R.obligation(s.share)).toBe("occupied provinces and gold"));
Then("France must also accept tribute, a pretender, or becoming a subject", (s) => expect(R.obligation(s.share)).toBe("also tribute, a pretender or becoming a subject"));
Given("over half of the player's voices say peace", (s) => {
  s.share = 0.6;
});
Given("the enemy offers a peace asking only for occupied provinces", (s) => {
  expect(R.obligation(s.share)).not.toBe("free");
});
When("the player refuses", (s) => {
  s.pen = R.refusalPenalty();
});
Then("every lord of the player's country loses a step of loyalty each season", (s) => expect(s.pen.lordStepsPerSeason).toBe(1));
Then("its levies desert twice as fast", (s) => expect(s.pen.levyDesertion).toBe(2));
Given("over half of the voices of the AI country {string} say peace", (s) => {
  s.share = 0.6;
});
When("the player offers a peace asking only for provinces France occupies", (s) => {
  const terms: R.Term[] = [{ kind: "cede", province: "Dijon" }];
  const state = { occupiedByEnemy: ["Dijon"], treasury: 100 };
  s.acc = R.aiAccepts(s.share, terms, state);
  s.accLow = R.aiAccepts(0.4, terms, state);
});
Then("{string} accepts", (s) => {
  expect(s.acc).toBe(true);
  expect(s.accLow).toBe(false);
});

Given("the country {string} at war with {string}", (s) => {
  s.ws = { occupied: [], enemyTreasury: 0, enemyPeaceShare: 0 } satisfies R.WarState;
});
Given("France occupies {string}", (s, p: string) => void s.ws.occupied.push(p));
Given("France does not occupy {string}", (s, p: string) => expect(s.ws.occupied).not.toContain(p));
Given("Burgundy has {int} gold in its treasury", (s, n: number) => {
  s.ws.enemyTreasury = n;
});
Given("{int} % of Burgundy's voices say peace", (s, n: number) => {
  s.ws.enemyPeaceShare = pct(n);
});
Given("France occupies the capital of Burgundy", (s) => {
  s.ws.capitalOccupied = true;
});
Given("France does not occupy the capital of Burgundy", (s) => {
  s.ws.capitalOccupied = false;
});
Given("Burgundy keeps {string}", (s, p: string) => {
  s.ws.enemyKeeps = [p];
});
Given("nothing in particular", () => {});
function termOf(text: string): R.Term {
  let m: RegExpExecArray | null;
  if ((m = /^cede (.+)$/.exec(text))) return { kind: "cede", province: m[1]! };
  if ((m = /^pay (\d+) gold$/.exec(text))) return { kind: "gold", amount: Number(m[1]) };
  if ((m = /^demolish the castle of (.+)$/.exec(text))) return { kind: "demolish", province: m[1]! };
  const simple: Record<string, R.Term> = { tribute: { kind: "tribute" }, "become a subject": { kind: "subject" }, "seat a pretender": { kind: "pretender" }, "white peace": { kind: "white peace" } };
  const t = simple[text];
  if (!t) throw new Error(`term ${text}`);
  return t;
}
Then(/^France (can|cannot) ask for "(.+)"$/, (s, can: string, term: string) => expect(R.mayAsk(termOf(term), s.ws)).toBe(can === "can"));

Given("the country {string} has no soldiers and no castles left", (s, country: string) => {
  s.war = R.openWar("w", "France", country, "Take land", ["Nice"]);
  hook(s, () => {
    expect(R.checkCollapse(R.openWar("x", "France", country, "Take land"), { country, soldiers: 100, castles: 0 }, [])).toBe(false);
    R.checkCollapse(s.war, { country, soldiers: 0, castles: 0 }, ["Nice", "Chambéry"]);
  });
});
Then("the war ends", (s) => expect(s.war.ended).toBeDefined());
Then("the winner takes all it occupies", (s) => expect(s.war.ended).toMatchObject({ winner: "France", takes: ["Nice", "Chambéry"] }));
Given("the country {string} fights a war with the aim {string} against {string}", (s, a: string, aim: string, d: string) => {
  s.war = R.openWar("w", a, d, aim);
});
When("{int} months pass", (s, n: number) => {
  s.raidMonths = [];
  for (let m = 0; m < n; m++) s.raidMonths.push(R.raidWarMonth(s.war));
});
Then("during it Crimea could only raid, not occupy", (s) => {
  expect(s.raidMonths.every((m: { mayOccupy: boolean }) => !m.mayOccupy)).toBe(true);
  expect(s.raidMonths.slice(0, -1).every((m: { ended: boolean }) => !m.ended)).toBe(true);
});
Given("the ruler of {string} dies with no heir during its war with {string}", (s, a: string, b: string) => {
  s.war = R.openWar("w", b, a, "Take land");
});
Given("the lords of Burgundy fall into a succession war", () => {});
Given(/^"([^"]+)" (backs no claimant|backs a claimant)$/, (s, _c: string, b: string) => {
  hook(s, () => R.successionWar(s.war, b === "backs a claimant"));
});
Then(/^the foreign war (becomes a white peace|goes on)$/, (s, e: string) => {
  if (e === "goes on") expect(s.war.ended).toBeUndefined();
  else expect(s.war.ended).toEqual({ how: "white peace" });
});
Given(/^a peace between "([^"]+)" and "([^"]+)" is signed that (moves no province|moves provinces)$/, (s, a: string, b: string, m: string) => {
  s.war = R.openWar("w", a, b, "Take land");
  hook(s, () => (s.truce = R.signPeace(s.war, { landOrSubject: m === "moves provinces" })));
});
Then("a truce of {int} years starts", (s, n: number) => expect(s.truce.truceYears).toBe(n));
Given("the country {string} wins a war with the aim {string}", (s, _c: string, aim: string) => {
  s.aim = aim;
});
const AIM_RESULTS: Record<string, string> = {
  "France gets the named provinces": "those provinces",
  "the enemy ruler is replaced and the realm becomes France's ally or subject": "their ruler replaced, realm your ally or subject",
  "the enemy pays yearly gold or grain": "yearly gold or grain",
  "a new country is released": "a new country released",
  "the subject becomes independent": "it becomes independent",
  "a faith tolerance charter is granted there, or France gets the province": "a faith tolerance charter there, or the province",
  "the enemy pays gold and its ruler is humbled": "gold and a humbled ruler",
};
for (const [text, effect] of Object.entries(AIM_RESULTS)) Then(text, (s) => expect(R.aimEffect(s.aim)).toBe(effect));

// ---------------------------------------------------------------- inventions outside battle

Then(/^it can have (stone castles|earthwork ring forts|bastion forts|star forts)(, against which bombards are nearly useless)?$/, (s, kind: string, useless?: string) => {
  const castle = kind.replace(/s$/, "").replace("forts", "fort");
  const id = [...s.known][0] as string;
  expect(R.bInvention(id).castle).toBe(castle);
  expect(R.castleTypes(s.known)).toEqual([castle]);
  expect(R.castleTypes(new Set())).toEqual([]);
  expect(R.bInvention(id).bombardsNearlyUseless).toBe(Boolean(useless));
});
Then("its shot and mining in sieges are x1.5", (s) => {
  expect(R.bInvention("B7").siege).toBe(1.5);
  const base = { bombards: 4, fieldGuns: 0 };
  expect(R.shotPerMonth({ ...base, besiegerKnown: s.known })).toBe(1.5 * R.shotPerMonth(base));
  const mine = (known: Set<string>): number => {
    const sg = R.newSiege("stone castle", { garrison: 300, besiegers: 3000, store: 1e6, besiegerKnown: known });
    R.siegeMonth(sg);
    return sg.miningMonths;
  };
  expect(mine(s.known)).toBe(1.5 * mine(new Set()));
});
Then("its roads give the road factor to troop-movement", () => {
  const road = R.bInvention("B2").road as keyof typeof MOVE.roadFactor;
  expect(road).toBe("road");
  expect(MOVE.roadFactor[road]).toBeLessThan(MOVE.roadFactor.track);
});
When("it splits an army", (s) => {
  s.split = R.splitJoinDays(s.known);
});
Then("the split takes a day", (s) => {
  expect(s.split).toBe(1);
  expect(R.splitJoinDays(new Set())).toBeNull();
});
Given("a levy company has been out {int} months", (s, months: number) => {
  s.company = R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, monthsOut: months });
  hook(s, () => (s.goneHome = R.levyGoingHome(company(s), { known: s.known })));
});
Then("none of its men go home", (s) => {
  expect(s.goneHome).toBe(0);
  expect(company(s).men).toBe(1000);
  expect(R.levyGoingHome(R.newCompany({ kind: "levy", arm: "levy foot", men: 1000, monthsOut: company(s).monthsOut }))).toBeGreaterThan(0);
});
Then("its scouts see {int} provinces", (s, n: number) => {
  expect(R.aircraft(s.known)?.scoutRange).toBe(n);
  expect(R.aircraft(new Set())).toBeNull();
});
Then("it can bomb castles with shot and bomb wagons", (s) => expect(R.aircraft(s.known)?.bombs).toEqual(["castles", "wagons"]));

// ---------------------------------------------------------------- the war AI

/** The government form the AI's personality reads for kinds raised (from the 1444 start records). */
const FORM: Record<string, string> = { Venice: "city republic" };
Given("the AI country {string}", (s, country: string) => {
  s.country = country;
});
Then(/^it raises mainly (.+)$/, (s, kinds: string) => {
  const form = FORM[s.country];
  expect(R.kindsRaised(form ? { country: s.country, form } : { country: s.country })).toEqual(kinds.split(" and "));
});
Given("the AI country {string} has the personality {string}", (s, _c: string, p: string) => {
  s.personality = p;
});
Then(/^it offers peace when (a third of its voices say peace|it is forced by its peace voices)$/, (s, when: string) => {
  const at = R.aiPeaceAt(s.personality);
  if (when.startsWith("a third")) close(at, 1 / 3);
  else {
    expect(at).toBe(W.peace.half);
    expect(R.obligation(at + 0.01)).not.toBe("free");
  }
});
Given("the AI country {string} plans a march into France", (s) => {
  s.view = { forageLimits: { Champagne: R.forageLimit(60000, "Rich") }, reserves: { army: 30000 }, peaceVoices: R.countVoices({ lords: [], royal: ["peace", "none"], capitalPeace: false }) };
  hook(s, () => (s.aiView = R.aiReads(s.view)));
});
Then("it reads the same forage limits, food reserves and peace voices the player sees", (s) => {
  expect(s.aiView).toBe(s.view);
  expect(s.aiView.forageLimits.Champagne).toBe(30000);
});

// ---------------------------------------------------------------- decided questions (D-WAR-*)

// D-WAR-2, X-1: a player battle stops the turn on the before-the-battle card.
Given("the player's country {string} fights a battle at {string} this turn", (s, player: string, where: string) => {
  hook(s, () => (s.month = R.resolveTurn([{ ...nightBattle(), where }], player)));
  s.player = player;
});
When("the battle is fought one round at a time", (s) => {
  run(s);
  const f = R.startBattle(nightBattle());
  let r: R.BattleResult | null = null;
  while (!r) r = f.round();
  s.stepped = r;
});
Then("it ends with the same result as the battle fought at once", (s) => {
  const r: R.BattleResult = s.month.playerReports[0].result;
  expect([s.stepped.winner, s.stepped.how, s.stepped.bells]).toEqual([r.winner, r.how, r.bells]);
});
Then(/^at each round the player can "([^"]+)", "([^"]+)" or "([^"]+)", and there is no Skip to result$/, (s, a: string, b: string, c: string) => {
  expect([...R.BATTLE_STEP_CHOICES]).toEqual([a, b, c]);
  expect(R.BATTLE_STEP_CHOICES).not.toContain("Skip to result");
});
When(/^"(\w+)" orders a retreat after round (\d+)$/, (s, _c: string, n: string) => {
  const f = R.startBattle(nightBattle());
  for (let i = 0; i < Number(n); i++) expect(f.round()).toBeNull();
  f.retreat(1);
  s.result = f.round();
  s.rounds = f.rounds;
});
Then(/^the battle ends in round (\d+) with "(\w+)" withdrawing$/, (s, n: string, c: string) => {
  expect(s.rounds).toBe(Number(n));
  expect(s.result.loser).toBe(c);
  expect(s.result.how).toMatch(/^withdrew/);
});
When(/^a French army of (\d+) men marches in after round (\d+)$/, (s, men: string, n: string) => {
  const f = R.startBattle(nightBattle());
  for (let i = 0; i < Number(n); i++) f.round();
  f.join(1, [R.newCompany({ kind: "standing regiment", arm: "levy foot", men: Number(men), id: "j1", drill: 6, scars: 1 })]);
  f.round();
  s.fight = f;
});
Then(/^the French side has (\d+) men in the battle$/, (s, n: string) => expect(s.fight.men[1]).toBe(Number(n)));
Then("after the battle a report names who fought, where, the result, the losses and the one-line reason", (s) => {
  const r: R.BattleReport = s.month.playerReports[0];
  expect(r.who).toContain(s.player);
  expect(r.where).toBe("Troyes");
  expect(r.result.winner).toBeTruthy();
  expect(Object.keys(r.result.losses)).toHaveLength(2);
  expect(r.reason.length).toBeGreaterThan(0);
});
Then("the battle can be replayed later from its report", (s) => {
  const r: R.BattleReport = s.month.playerReports[0];
  expect(r.result.lines.length).toBe(r.result.bells);
});

// D-WAR-9: level thresholds of the main table are era II's.
Given("a company with drill {int} and scars {int}", (s, drill: number, scars: number) => {
  s.company = R.newCompany({ kind: "hired company", arm: "pikes", men: 600, id: "c", drill, scars });
  s.era = "II";
});

// D-WAR-6, X-7: origins and their catches; a new commander's style by origin.
Given("the country {string} gets a commander by origin {string}", (s, country: string, origin: string) => {
  s.country = country;
  hook(s, () => (s.catch = R.originCatch(origin)));
});
Then("the catch is {string}", (s, c: string) => expect(s.catch).toBe(c));
Given("the country {string} has the horse style {string} and the foot style {string}", (s, country: string, horse: string, foot: string) => {
  s.country = country;
  s.styleList = { horse, foot };
});
When(/^it gets a new commander who is (a noble|a lord|risen from the ranks)$/, (s, origin: "a noble" | "a lord" | "risen from the ranks") => {
  s.cmd = R.newCommander("a new commander");
  const st = R.styleByOrigin(origin, s.styleList);
  s.cmd.styles = st ? [st] : [];
});

// D-WAR-14: risk tolerance sets standing orders, starting styles and besiege or raid.
Given("the AI country {string} has the risk tolerance {string}", (s, country: string, risk: R.RiskTolerance) => {
  s.country = country;
  s.risk = risk;
});
Given(/^its army is (horse only|foot and horse)$/, (s, army: string) => {
  s.horseOnly = army === "horse only";
});
Then("its armies' standing order is {string} and they retreat if outnumbered {string}", (s, order: string, ratio: string) => {
  expect(R.aiStandingOrders(s.risk)).toEqual({ order, retreat: ratio });
});
Then("its new commanders can start with the style {string}", (s, name: string) => {
  expect(R.countryStyles(s.country)).toContain(name);
});
Then(/^its army (raids|besieges)$/, (s, does: string) => {
  expect(R.aiBesiegesOrRaids(s.risk, s.horseOnly)).toBe(does === "raids" ? "raid" : "besiege");
});

// D-WAR-17: later-era arms have provisional strength and needs.
Given("the arm {string} in config", (s, arm: string) => {
  s.arm = arm;
});
Then("it has a strength per man, needs and an unlocking invention like every other arm", (s) => {
  const a = (W.later_arms as Record<string, { strength?: number; needs?: Record<string, unknown>; unlock?: string }>)[s.arm];
  expect(a?.strength).toBeGreaterThan(0);
  expect(Object.keys(a?.needs ?? {}).length).toBeGreaterThan(0);
  expect(a?.unlock).toMatch(/^W\d+$/);
});

// D-WAR-10: battle scale by era.
Given(/^a battle fought in era (\w+) by realms that know (.+)$/, (s, era: string, inv: string) => {
  s.era = era as R.Era;
  s.known = ids(inv);
});
const BELL: Record<string, string> = { "2 hours": "2 hours", "half a day": "half a day", "a day": "a day" };
Then(/^a bell is (2 hours|half a day|a day)$/, (s, bell: string) => expect(R.battleScale(s.era).bell).toBe(BELL[bell]));
Then("the longest battle is {int} days", (s, d: number) => expect(R.battleScale(s.era).maxDays).toBe(d));
Then(/^sector room is (all|half|a quarter) of the sector table$/, (s, r: string) => expect(R.battleScale(s.era).room).toBe({ all: 1, half: 0.5, "a quarter": 0.25 }[r]));
Then("hits per bell are {int} % of the front", (s, h: number) => close(R.hitsShare(s.known, s.era), pct(h)));

// D-WAR-13: skills grow by era; the staff college is the academy of eras VI–VII.
Given("a commander in era {word}", (s, era: string) => {
  s.era = era as R.Era;
});
const GROWTH: [RegExp, (m: RegExpMatchArray) => R.GrowthEvent][] = [
  [/^he is trained at an academy$/, () => ({ kind: "academy" })],
  [/^he graduates from a staff college$/, () => ({ kind: "academy" })],
  [/^he serves as a captain under a Cunning (\d) commander$/, (m) => ({ kind: "captain under", commanderCunning: Number(m[1]) })],
  [/^he spends a peacetime year in wargames for the first time this era$/, () => ({ kind: "wargames", firstThisEra: true })],
  [/^he commands a standing army a year in peace with fewer than 3 such gains$/, () => ({ kind: "peace command year", gainsSoFar: 2 })],
  [/^he wins his 4th victory since his last Might from victories$/, () => ({ kind: "victories", sinceLastMight: 4 })],
];
for (const [re, ev] of GROWTH) When(re, (s, ...args: string[]) => {
  const m = [""].concat(args) as unknown as RegExpMatchArray;
  s.gained = R.eraSkillGain(s.era, ev(m));
});
Then(/^he gains \+1 (Might|Cunning|Logistics)$/, (s, skill: string) => expect(s.gained).toContain(skill));

// W inventions in battle that the engine already applies (WAR-122).
Then("in battle every commander gets +1 order per bell", (s) => expect(R.ordersPerBell(2, "V", s.known)).toBe(R.ordersPerBell(2, "V") + 1));
Then(/^in battle its riflemen hit (\d) % of the front per bell$/, (s, h: string) => close(R.hitsShare(s.known), pct(Number(h))));
Then("in battle its standing regiments never drop below level 2", (s) => {
  const c = R.newCompany({ kind: "standing regiment", arm: "pikes", men: 600, id: "c", drill: 0, scars: 0 });
  expect(R.levelOf(c, "IV", s.known)).toBe(2);
  expect(R.levelOf(c, "IV")).toBe(1);
});
