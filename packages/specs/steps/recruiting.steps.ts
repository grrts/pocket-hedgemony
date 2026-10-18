import { expect } from "vitest";
import * as R from "@ph/engine/domain/recruiting";
import { provinceConfig } from "@ph/engine/domain/province";
import { type MoveWorld, type Place } from "@ph/engine/domain/troop-movement";
import { aiCollect, applyNow, ARMS, commanderScreen, commissionOfficial, createWorld, cultureOf, OFFICIALS, recruit, type World, garrisonTroops, garrisonView, gatherDays, idleCommanders, KIND, LEVY_UNIT, menByArm, monthlyRecruits, personName, rankedName, Rng, spawnArmy, trainingGround, WORK_COUNT, workIndex, type CommanderScreen, type Order } from "@ph/engine";
import { commanderAt, garrisonMen, levyGame, playDays, province, type LevyGame } from "./levy-game.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("recruiting");

const re = (src: string): RegExp => new RegExp(`^${src}$`);
const num = (t: string | number): number => Number(String(t).replace(/,/g, ""));
const near = (a: number, b: number, tol = 0.5) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const known = (s: Scenario): string[] => (s.known ??= []);

// ---------------------------------------------------------------- Champagne, from the design's worked example
// Recruiting §2.2 and §8: of every 5,000 levied in Champagne, 3,250 farmers, 550 herders, 500 homeless,
// 300 woodsmen, 200 craftsmen, 150 seafolk, 50 others. A levy takes each class by its share of the pool,
// so these are the shares of Champagne's men who can be called (65 % farmers).

const MIX: Record<string, number> = { farmers: 3250, herders: 550, homeless: 500, woodsmen: 300, craftsmen: 200, seafolk: 150, others: 50 };
const MIX_TOTAL = 5000;
const REGION_PEOPLE = 260000;
const REGION_CALLABLE = 7900;
const REGION_FIGHTING = 65000;
/** Troyes 72,000 people (design §2.2); the other three royal provinces share the rest. */
const PROVINCES: Record<string, number> = { Troyes: 72000, Reims: 62667, "Châlons": 62667, Vitry: 62666 };

/** Pools by class of the four royal provinces of Champagne. */
function champagne(callable = REGION_CALLABLE): R.PoolSource[] {
  return Object.entries(PROVINCES).map(([id, people]) => {
    const c = (callable * people) / REGION_PEOPLE;
    return { id, byClass: Object.fromEntries(Object.entries(MIX).map(([k, v]) => [k, (c * v) / MIX_TOTAL])) };
  });
}

/** Champagne's farmers (people), from the farmers who can be called. */
const champagneFarmers = (callable = REGION_CALLABLE): number => (callable * MIX["farmers"]!) / MIX_TOTAL / R.callShare("farmers") / R.recruitingConfig.fightingAgeShare;

/** Fighting-age men of each class in a province of `fighting` fighting-age men with Champagne's mix; "others" kept apart. */
function champagneFighting(fighting: number): { byClass: Record<string, number>; othersCallable: number } {
  const scale = REGION_CALLABLE / MIX_TOTAL;
  const byClass: Record<string, number> = {};
  for (const [k, v] of Object.entries(MIX)) if (k !== "others") byClass[k] = ((v * scale) / R.callShare(k)) * (fighting / REGION_FIGHTING);
  return { byClass, othersCallable: MIX["others"]! * scale * (fighting / REGION_FIGHTING) };
}

function levy(s: Scenario, men: number, sources: R.PoolSource[]): void {
  const draw = R.drawLevy(sources, men);
  s.left = R.applyLevy(sources, draw);
  s.draw = draw;
  s.gold = R.levyMoney(men);
  s.food = R.gatheringFood(men);
  s.harvest = R.harvestLoss((draw.byClass["farmers"] ?? 0) / champagneFarmers(), s.season ?? "other");
  s.conscription = Object.fromEntries(Object.keys(s.left).map((id) => [id, R.givesConscription(s.left[id] * REGION_CALLABLE, REGION_CALLABLE)]));
  s.levies = { men, arm: R.LEVY_ARM };
}

// ---------------------------------------------------------------- shared givens

Given("the date is late summer 1444, 3 weeks before harvest", (s) => {
  s.year = 1444;
  s.season = "harvest" satisfies R.Season;
});
Given('the country "France" holds 4 royal provinces in region "Champagne"', (s) => {
  s.region = champagne();
});
Given('the region "Champagne" has 4 royal provinces of "France" with about 260000 people', (s) => {
  s.region = champagne();
  expect(Object.values(PROVINCES).reduce((a, b) => a + b, 0)).toBe(REGION_PEOPLE);
});
Given('the region "Champagne" has about 260000 people and 65000 fighting-age men', () => {
  expect(R.fightingAgeMen(REGION_PEOPLE)).toBe(REGION_FIGHTING);
});
Given('the region "Champagne" has 65000 fighting-age men and 7900 men who can be called', (s) => {
  expect(R.fightingAgeMen(REGION_PEOPLE)).toBe(REGION_FIGHTING);
  const { byClass, othersCallable } = champagneFighting(REGION_FIGHTING);
  let callable = othersCallable;
  for (const [k, v] of Object.entries(byClass)) callable += v * R.callShare(k);
  near(callable, REGION_CALLABLE, 1);
  s.region ??= champagne();
});
Given('the region "Champagne" has 7900 men who can be called, 65 percent of them farmers', (s) => {
  s.region ??= champagne();
  const total = (s.region as R.PoolSource[]).reduce((n, p) => n + Object.values(p.byClass).reduce((a, b) => a + b, 0), 0);
  near(total, REGION_CALLABLE, 1e-6);
  const farmers = (s.region as R.PoolSource[]).reduce((n, p) => n + (p.byClass["farmers"] ?? 0), 0);
  near(farmers / total, 0.65, 1e-9);
});
Given('the country "France" is at war with the country "Burgundy"', (s) => {
  s.atWar = true;
});
Given(re('the country "France" knows invention "(\\w+) [^"]+"'), (s, id: string) => {
  known(s).push(id);
});
Given(re('the country "France" does not know invention "(\\w+) [^"]+"'), (s, id: string) => {
  s.known = known(s).filter((k) => k !== id);
});

// ---------------------------------------------------------------- who can be called (RECR-001..007)

Given(re('the province "Troyes" has (\\d+) people of class "([^"]+)"'), (s, n: string, cls: string) => {
  s.people = { [cls]: num(n) };
});
Given("the fighting-age share is 0.25", () => {
  expect(R.recruitingConfig.fightingAgeShare).toBe(0.25);
});
Given('the province "Troyes" has 72000 people and about 18000 fighting-age men', (s) => {
  expect(R.fightingAgeMen(72000)).toBe(18000);
  s.troyesFighting = champagneFighting(18000);
});
When("the men who can be called are counted", (s) => {
  if (s.people) s.callable = Object.fromEntries(Object.entries(s.people as Record<string, number>).map(([c, n]) => [c, R.callableOfClass(n, c)]));
  if (s.troyesFighting) {
    const people = Object.fromEntries(Object.entries(s.troyesFighting.byClass as Record<string, number>).map(([c, f]) => [c, f / R.recruitingConfig.fightingAgeShare]));
    s.ceiling = R.ceiling(people) + s.troyesFighting.othersCallable;
  }
});
Then(re('class "([^"]+)" gives (\\d+) men who can be called'), (s, cls: string, n: string) => {
  near(s.callable[cls], num(n), 1e-6);
});
Then('the province "Troyes" can give at most about 2200 men', (s) => {
  expect(Math.abs(s.ceiling - 2200) / 2200).toBeLessThan(0.025);
  near(s.ceiling / 18000, 1 / 8, 0.005);
});

Given('the province "Troyes" has a ceiling of 2200 men who can be called', (s) => {
  s.pool = { ceiling: 2200, recruits: 0, fallen: 0, veterans: 0 } satisfies R.ProvincePool;
});
Given('the province "Troyes" has 2200 recruits here', (s) => {
  s.pool.recruits = 2200;
});
When("a year of refill, disbanded men coming home and an invention are applied", (s) => {
  const p = s.pool as R.ProvincePool;
  R.refill(p, 1);
  R.poolCause(p, "disbanded men coming home", 500);
  known(s).push("W12");
  p.recruits = R.holdAtCeiling(p.recruits + 300, p.ceiling);
});
Then('the province "Troyes" has at most 2200 recruits here', (s) => {
  expect(s.pool.recruits).toBeLessThanOrEqual(2200);
});

Given('the province "Troyes" levies 100 farmers and 100 herders', (s) => {
  s.draw = R.drawLevy([{ id: "Troyes", byClass: { farmers: 100, herders: 100 } }], 200);
});
When("the levy gathers", (s) => {
  s.gathered = R.gatherLevy("L", "France", s.draw.men);
});
Then('all 200 men are levies of arm "levy foot"', (s) => {
  expect(s.gathered.men).toBe(200);
  expect(s.gathered.arm).toBe("levy foot");
  expect(s.gathered.kind).toBe("levy");
});

When(re('the call share of class "([^"]+)" is read'), (s, cls: string) => {
  s.share = R.callShare(cls, known(s));
});
Then(re("the call share is (\\d+) percent of its fighting-age men"), (s, p: string) => {
  near(s.share * 100, num(p), 1e-9);
});

// ---------------------------------------------------------------- the levy (RECR-008..018)

When('the player opens the levy screen for region "Champagne" and sets 5000 men', (s) => {
  s.screen = R.levyScreen(s.region, 5000, { season: s.season, farmers: champagneFarmers(), gatherAt: "Troyes" });
});
Then('the screen shows "Gold now" 100, "Food now" 2500, "Pay" free for 3 months then 750 gold a month', (s) => {
  const sc = s.screen as R.LevyScreen;
  expect(sc.goldNow).toBe(100);
  expect(sc.foodNow).toBe(2500);
  expect(sc.freeMonths).toBe(3);
  near(sc.payPerMonth, 750, 1e-9);
});
Then('the screen shows "Harvest" -6 percent in "Champagne"', (s) => {
  expect(Math.round(s.screen.harvestLoss * 100)).toBe(6);
});
Then('the screen shows "Pool left" 37 percent', (s) => {
  expect(Math.round(s.screen.poolLeft * 100)).toBe(37);
});
Then('the screen shows "Ready in" 2 weeks at "Troyes" as 5000 levies', (s) => {
  expect(s.screen.readyInDays).toBe(14);
  expect(s.screen.readyAt).toBe("Troyes");
  expect(s.screen.arm).toBe("levy foot");
});
Then("the screen shows a harvest warning for the season", (s) => {
  expect(s.screen.harvestWarning).toBe(true);
});
Then("every cost line opens its gain and lose list", (s) => {
  for (const l of s.screen.lines as R.LevyCostLine[]) {
    expect(l.gain.length).toBeGreaterThan(0);
    expect(l.lose.length).toBeGreaterThan(0);
  }
});

When(re('the country "France" levies (\\d+) men from region "Champagne"'), (s, n: string) => {
  s.region ??= champagne();
  levy(s, num(n), s.region);
});
Then("the levy takes by class:", (s, table: string[][]) => {
  for (const [cls, men] of table.slice(1)) near(s.draw.byClass[cls!], num(men!), 1e-6);
});
Then("the levy takes 63 percent of each province's pool", (s) => {
  for (const id of Object.keys(PROVINCES)) expect(Math.round((1 - s.left[id]) * 100)).toBe(63);
});

Given('the province "Troyes" has 2000 recruits here, of whom 400 are veterans', (s) => {
  s.troyes = { id: "Troyes", byClass: { farmers: 2000 }, veterans: 400 } satisfies R.PoolSource;
});
When('the country "France" levies 1000 men from province "Troyes"', (s) => {
  s.draw = R.drawLevy([s.troyes], 1000);
});
Then("200 of the levied men are veterans", (s) => {
  near(s.draw.veterans, 200, 1e-9);
});

Then('after 2 weeks the country "France" has 5000 levies of arm "levy foot"', (s) => {
  expect(R.gatheringDays(known(s))).toBe(14);
  s.gathered = R.gatherLevy("L", "France", s.levies.men, known(s));
  expect(s.gathered.men).toBe(5000);
  expect(s.gathered.arm).toBe("levy foot");
});
Then("the levies can march and fight at once", (s) => {
  expect(s.gathered.canMarch && s.gathered.canFight).toBe(true);
});

Then(re('the country "France" pays (\\d+) gold up front'), (s, g: string) => {
  expect(s.gold).toBe(num(g));
});
Then(re("the levy eats (\\d+) rations from the local stores while gathering"), (s, r: string) => {
  expect(s.food).toBe(num(r));
});

Given(re('the country "France" has 5000 levies that have served (\\d+) months'), (s, m: string) => {
  s.served = num(m);
});
When("the month is paid", (s) => {
  s.paid = R.levyPay(5000, s.served);
});
Then(re('the country "France" pays (\\d+) gold for them'), (s, g: string) => {
  near(s.paid, num(g), 1e-9);
});

Given('the province "Troyes" has a building whose slots are 60 percent filled', (s) => {
  s.before = R.buildingAfterLevy(60, 100);
  expect(s.before.fallow).toBe(false);
});
When("a levy takes men from its slots and leaves it 40 percent filled", (s) => {
  s.after = R.buildingAfterLevy(40, 100);
});
Then("the building goes fallow and pays no tax and makes no wares", (s) => {
  expect(s.after).toEqual({ fallow: true, paysTax: false, makesWares: false });
});

// ---------------------------------------------------------------- Champagne worked example

Then("the levy costs 100 gold and 2500 rations", (s) => {
  expect(s.gold).toBe(100);
  expect(s.food).toBe(2500);
});
Then(re('the harvest in "Champagne" falls by (\\d+) percent'), (s, p: string) => {
  expect(Math.round(s.harvest * 100)).toBe(num(p));
});
Then(re("each province keeps (\\d+) percent of its pool"), (s, p: string) => {
  for (const id of Object.keys(PROVINCES)) expect(Math.round(s.left[id] * 100)).toBe(num(p));
});
Then('no province gets the grievance "Conscription"', (s) => {
  expect(Object.values(s.conscription).some(Boolean)).toBe(false);
});
Then('all four provinces get the grievance "Conscription"', (s) => {
  expect(Object.values(s.conscription).filter(Boolean)).toHaveLength(4);
});

Given('the province "Troyes" has a stone castle', (s) => {
  (s.places ??= {})["Troyes"] = ["stone castle"];
});
Given('the country "France" has 5000 levies from region "Champagne"', (s) => {
  s.levies = { men: 5000, arm: R.LEVY_ARM };
  s.orders = [];
});
/** Reims trains in its own castle (the design: "castle stores at Troyes and Reims"). */
function trainAt(s: Scenario, men: number, arm: string, place: string, castle: boolean) {
  const places = s.places?.[place] ?? (castle || place === "Reims" ? ["stone castle"] : []);
  const r = R.orderTraining({ id: `${arm}@${place}`, place, arm, men, unlocked: [arm], room: R.trainingRoom(places) });
  if (!r.ok) throw new Error(r.reason);
  const horses = r.cost.needs["horses"] ?? 0;
  s.orders.push({ arm, men, cost: r.cost, food: R.trainingFood(men, horses, r.cost.months), place });
  s.levies.men -= men;
}
When(re('(\\d+) train into "([^"]+)" at the castle of "(\\w+)"'), (s, n: string, arm: string, place: string) => trainAt(s, num(n), arm, place, true));
When(re('(\\d+) train into "([^"]+)" at "(\\w+)"'), (s, n: string, arm: string, place: string) => trainAt(s, num(n), arm, place, false));
When("the other 2000 march at once as levies", (s) => {
  expect(s.levies.men).toBe(2000);
  expect(s.levies.arm).toBe("levy foot");
});
Then("the pikes cost 150 gold and 25 loads of arms and eat 11250 rations in 3 months", (s) => {
  const o = s.orders.find((x: { arm: string }) => x.arm === "pikes");
  expect(o.cost.gold).toBe(150);
  expect(o.cost.needs.arms).toBe(25);
  expect(o.cost.months).toBe(3);
  expect(o.food).toBe(11250);
});
Then("the light horse cost 50 gold and 500 horses and eat 6750 rations in 3 months", (s) => {
  const o = s.orders.find((x: { arm: string }) => x.arm === "light horse");
  expect(o.cost.gold).toBe(50);
  expect(o.cost.needs.horses).toBe(500);
  expect(o.cost.months).toBe(3);
  expect(o.food).toBe(6750);
});
Then('training eats 18000 rations from the castle stores at "Troyes" and "Reims"', (s) => {
  let total = 0;
  for (const o of s.orders) {
    const stores = { castle: 100000, province: 100000 };
    const t = R.takeFood(o.food, stores);
    expect(t.fromProvince).toBe(0);
    total += t.fromCastle;
  }
  expect(total).toBe(18000);
  expect(s.orders.map((o: { place: string }) => o.place).sort()).toEqual(["Reims", "Troyes"]);
});
Then("no pay is owed during training", (s) => {
  for (const o of s.orders) expect(R.payMonthsOwed(o.cost.months)).toBe(0);
});

Given("the army has 2500 pikes, 500 light horse and 2000 levies", (s) => {
  s.army = { men: 5000, horses: 500, parts: [["pikes", 2500], ["light horse", 500], ["levy foot", 2000]] };
});
When("it fills a 2-month reserve", (s) => {
  s.reserve = R.reserveFill(s.army.men, s.army.horses, 2);
});
Then("the reserve takes 23000 rations", (s) => {
  expect(s.reserve).toBe(23000);
});
Then("from the 4th month it costs 1000 gold a month in pay", (s) => {
  let pay = 0;
  for (const [arm, men] of s.army.parts as [string, number][]) pay += R.regimentPay(R.payGroupOf(arm), men);
  near(pay, 1000, 1e-9);
  expect(R.levyPay(2000, 3)).toBe(0);
});
Then("it eats 11500 rations a month on campaign", (s) => {
  expect(R.rations(s.army.men, "on campaign", s.army.horses)).toBe(11500);
});
Then("its real food cost against home is about 6500 rations a month", (s) => {
  expect(R.foodAgainstHome(s.army.men, s.army.horses)).toBe(6500);
});

Given('the official of province "Reims" is a steward with 8 years served', (s) => {
  s.official = { type: "Steward", years: 8, province: "Reims" };
});
Given('the province "Reims" has at least 20 clerks', (s) => {
  s.clerks = 20;
});
When('the steward is commissioned as commander and a deputy is named for "Reims"', (s) => {
  const { commission } = R.commission({ official: "steward of Reims", type: "Steward", yearsServed: s.official.years, province: "Reims" });
  commission.trait = commission.traitOffered[0]!;
  expect(R.emptyProvinceChoices(s.clerks)).toContain("Name a deputy");
  commission.choice = "Name a deputy";
  s.commission = commission;
  s.effect = R.emptyProvinceEffect("Name a deputy");
});
Then('the commander has Might 0, Cunning 1 and Logistics 4 and trait "Careful"', (s) => {
  expect(s.commission.skills).toEqual({ might: 0, cunning: 1, logistics: 4 });
  expect(s.commission.trait).toBe("Careful");
});
Then("the deputy costs 1 gold a month", (s) => {
  expect(s.effect.costPerMonth).toBe(1);
});
Then("the army eats 20 percent less", (s) => {
  near(R.logisticsFoodCut(s.commission.skills.logistics), 0.2, 1e-9);
});

Given('the lord "Count of Foix" is Proud and the lord "Duke of Bourbon" is not', (s) => {
  s.lords = { "Count of Foix": { proud: true, want: false }, "Duke of Bourbon": { proud: false, want: false } };
});
When(re("the lords are called to (?:the steward's|that) army"), (s) => {
  s.answers = Object.fromEntries(
    Object.entries(s.lords as Record<string, { proud: boolean; want: boolean }>).map(([n, l]) => [n, R.lordBringsRetinue({ proud: l.proud, officialCommands: true, aimIsHisWant: l.want })]),
  );
});
Then(re('the lord "([^"]+)" (refuses to bring his retinue|brings his retinue|comes)'), (s, lord: string, r: string) => {
  expect(s.answers[lord]).toBe(r !== "refuses to bring his retinue");
});

// ---------------------------------------------------------------- what recruiting gives back and takes (RECR-060..068)

Given('the province "Paris" has the state "Homeless"', (s) => {
  s.paris = { people: 100000, homeless: 10200 };
  expect(s.paris.homeless / s.paris.people).toBeGreaterThan(provinceConfig.homeless.grievance_over);
});
When('a levy takes homeless men by their share from "Paris"', (s) => {
  const callable = R.callableOfClass(s.paris.homeless, "homeless");
  s.cleared = R.streetsCleared(s.paris.homeless, callable, s.paris.people, provinceConfig.homeless.grievance_over);
});
Then('theft and begging in "Paris" fall', (s) => {
  expect(s.cleared.troubleFalls).toBe(true);
  expect(s.cleared.homeless).toBeLessThan(s.paris.homeless);
});
Then('the state "Homeless" can end', (s) => {
  expect(s.cleared.homelessStateCanEnd).toBe(true);
});

Given('the province "Troyes" is hungry', (s) => {
  s.troyesPeople = 72000;
});
When('1000 men from "Troyes" serve in an army abroad', (s) => {
  s.mouths = R.mouthsAtHome(s.troyesPeople, 1000);
});
Then('the province "Troyes" feeds 1000 fewer people', (s) => {
  expect(s.troyesPeople - s.mouths).toBe(1000);
});

Given('2500 soldiers training at "Troyes" are paid 500 gold this month', (s) => {
  s.pay = 500;
});
Then('100 gold counts as trade for the market folk of "Troyes"', (s) => {
  expect(s.spent.trade).toBe(100);
});
Then('the tax owed by "Troyes" rises by 100 gold', (s) => {
  expect(s.spent.taxOwed).toBe(100);
});

Given('500 disbanded men are sent to the frontier province "Frontier" with free tiles', (s) => {
  s.settlers = R.soldierSettlers(500, 1450);
});
Then("they clear tiles twice as fast as other settlers", (s) => {
  expect(s.settlers.clearingFactor).toBe(2);
});
Then('they become farmers in "Frontier"', (s) => {
  expect(s.settlers.become).toBe("farmers");
  expect(s.settlers.men).toBe(500);
});
Then('the province "Frontier" needs one grievance more to riot for 10 years', (s) => {
  expect(s.settlers.extraRiotGrievances).toBe(1);
  expect(s.settlers.until - 1450).toBe(10);
});

Given('an army took 1000 gold of loot and its men came from "Troyes" and "Reims"', (s) => {
  s.loot = 1000;
});
When("the army disbands", (s) => {
  if (s.loot !== undefined) s.lootHome = R.lootHome(s.loot);
  if (s.blooded) {
    s.pool = { ceiling: 2200, recruits: 1000, fallen: 0, veterans: 0 } satisfies R.ProvincePool;
    R.veteransHome(s.pool, s.blooded);
  }
});
Then('100 gold of loot goes to "Troyes" and "Reims"', (s) => {
  expect(s.lootHome.gold).toBe(100);
});
Then("their local store and tax owed rise for a year", (s) => {
  expect(s.lootHome.years).toBe(1);
});

Given('1000 men from "Troyes" are disbanded', (s) => {
  s.disbanded = 1000;
});
Given(re('the province "Troyes" has (\\d+) free slots'), (s, n: string) => {
  s.freeSlots = num(n);
});
When("they come home", (s) => {
  s.home = R.comingHome(s.disbanded, s.freeSlots);
});
Then(re("(\\d+) men go into the emptiest slots and (\\d+) become homeless"), (s, a: string, b: string) => {
  expect(s.home).toEqual({ slots: num(a), homeless: num(b) });
});

Given('an army from "Troyes" disbands', (s) => {
  s.arms = R.disbandArms();
});
Then("the arms go back to the store", (s) => {
  expect(s.arms.armsToStore).toBe(true);
});
Then("the player is not asked about the arms", (s) => {
  expect(s.arms.askPlayer).toBe(false);
});

Given("an army ends a plague campaign", (s) => {
  s.plague = true;
});
When("it disbands into 8 provinces within 3 months", (s) => {
  s.rumours = R.sicknessHome(["a", "b", "c", "d", "e", "f", "g", "h"], 3, new Rng(7));
});
Then("a plague rumour comes home to 2 of those provinces", (s) => {
  expect(s.rumours).toHaveLength(2);
  expect(new Set(s.rumours).size).toBe(2);
});

Given('the province "Paris" has students in its school', (s) => {
  s.students = 50;
});
When("students are called to arms", (s) => {
  s.research = R.studentsResearch(true);
});
Then("research from those students stops", (s) => {
  expect(s.research).toBe("stops");
});

// ---------------------------------------------------------------- commanders from officials (RECR-069..087)

Given(re('an official of type "([^"]+)" with 0 years served'), (s, t: string) => {
  s.type = t;
  s.years = 0;
});
Given(re('an official of type "Chaplain"'), (s) => {
  s.type = "Chaplain";
});
Given(re("(most|less than half) of the army shares the ruler's faith"), (s, share: string) => {
  s.faith = share === "most" ? 0.8 : 0.4;
});
Given(re('an official with a wage of (\\d+) gold a month'), (s, w: string) => {
  s.wage = num(w);
});
When(re("the official is commissioned as (commander|captain)"), (s, role: "commander" | "captain") => {
  const r = R.commission({ official: "O", type: s.type ?? "Warden", role, yearsServed: s.years ?? 0, wage: s.wage ?? 0, armyFaithShare: s.faith ?? 1 });
  s.commission = r.commission;
  s.cost = r.cost;
});
Then(re("the commander has Might (\\d+), Cunning (\\d+) and Logistics (\\d+)"), (s, m: string, c: string, l: string) => {
  expect(s.commission.skills).toEqual({ might: num(m), cunning: num(c), logistics: num(l) });
});
Then(re('the trait offered is "([^"]+)"'), (s, t: string) => {
  const offered = (s.commission.traitOffered as string[]).join(" or ");
  expect(offered || "none").toBe(t);
});

Given('an official of type "Warden" is being commissioned with a rolled trait "Reckless"', (s) => {
  s.commission = R.commission({ official: "O", type: "Warden", rolledTrait: "Reckless" }).commission;
});
When("the player keeps the rolled trait", (s) => {
  R.pickTrait(s.commission, "rolled");
});
Then('the commander has trait "Reckless"', (s) => {
  expect(s.commission.trait).toBe("Reckless");
});

Given(re('the country "France" has current style "([^"]+)" and has seen style "([^"]+)" in a battle it fought'), (s, cur: string, seen: string) => {
  s.style = { cur, seen };
});
When(re('an official of type "([^"]+)" is commissioned'), (s, t: string) => {
  s.commission = R.commission({ official: "O", type: t, currentStyle: s.style.cur, seenStyles: [s.style.seen] }).commission;
});
Then(re("the commander may take (.+)"), (s, what: string) => {
  const names = [...what.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
  if (what.startsWith("only ")) expect(s.commission.styles).toEqual(names);
  else expect([...s.commission.styles].sort()).toEqual(names.sort());
});

Given('the country "France" has an academy that graduates a Marshal', (s) => {
  s.marshal = R.marshalFrom("academy");
});
Given("the country \"France\" hires a Marshal for three times a normal official's price", (s) => {
  s.marshal = R.marshalFrom("hire", { officialPrice: 20 });
  expect(s.marshal.price).toBe(60);
});
Given('the country "France" raises a captain who stood in 3 won battles, on the offer after a won battle', (s) => {
  s.marshal = R.marshalFrom("captain", { wonBattles: 3, offerOpen: true });
  expect(R.marshalFrom("captain", { wonBattles: 2 }).ok).toBe(false);
});
Then('the country "France" gains a Marshal official', (s) => {
  expect(s.marshal.ok).toBe(true);
});

Given("an official's wage is 2 gold a month", (s) => {
  s.wage = 2;
});
Then("a Marshal's wage is 4 gold a month in war and in peace", (s) => {
  expect(R.marshalWage(s.wage)).toBe(4);
});

Given("a Marshal with best skill 3 has stood 10 years in a province with no war", (s) => {
  s.best = 3;
  s.idle = 10;
});
When("the year ends", (s) => {
  s.best = R.idleMarshal(s.best, s.idle);
});
Then("the Marshal's best skill is 2", (s) => {
  expect(s.best).toBe(2);
  expect(R.idleMarshal(3, 9)).toBe(3);
});

Then("the country pays 50 gold once", (s) => {
  expect(s.cost).toBe(50);
});
Then(re("the field wage is (\\d+) gold a month"), (s, w: string) => {
  expect(s.commission.wage).toBe(num(w));
});
Then(re("a staff of (\\d+) travels with them eating 2 rations each a month from the army's reserve"), (s, n: string) => {
  expect(s.commission.staff).toBe(num(n));
  expect(R.staffFood(s.commission.staff, 0)).toBe(num(n) * 2);
});

Given("a commander with 100 staff and 30 staff horses", (s) => {
  const c = R.commission({ official: "O", type: "Warden" }).commission;
  expect([c.staff, c.staffHorses]).toEqual([100, 30]);
  s.staff = c;
});
When("a month passes", (s) => {
  if (s.staff) s.staffAte = R.staffFood(s.staff.staff, s.staff.staffHorses);
  if (s.where) s.ate = R.rations(1000, s.where);
  if (s.order) {
    s.poolBefore = { ...s.pool };
    s.regiments = R.monthPasses(s.pool, [s.order], { month: 3 });
  }
});
Then("the staff eat 290 rations from the army's reserve", (s) => {
  expect(s.staffAte).toBe(290);
});

Given('the official of province "Reims" is commissioned', (s) => {
  s.commission = R.commission({ official: "O", type: "Steward", province: "Reims" }).commission;
});
When(re('the player chooses "([^"]+)" for "Reims"'), (s, c: R.EmptyProvinceChoice) => {
  s.effect = R.emptyProvinceEffect(c);
});
Then(
  re(
    'the province "Reims" has (half tax, half recruits and the state "Ungoverned"|the moved official at half effect, and their old province is now empty|full tax and recruits, no type effect, for 1 gold a month|full recruits to the lord\'s retinue, half tax to the lord, the lord a step more loyal)',
  ),
  (s, what: string) => {
  const e = s.effect as R.EmptyProvinceEffect;
  switch (what) {
    case 'half tax, half recruits and the state "Ungoverned"':
      expect([e.tax, e.recruits, e.state]).toEqual([0.5, 0.5, "Ungoverned"]);
      break;
    case "the moved official at half effect, and their old province is now empty":
      expect(e.movedOfficialEffect).toBe(0.5);
      expect(e.otherProvinceEmpty).toBe(true);
      break;
    case "full tax and recruits, no type effect, for 1 gold a month":
      expect([e.tax, e.recruits, e.typeEffect, e.costPerMonth]).toEqual([1, 1, 0, 1]);
      break;
    case "full recruits to the lord's retinue, half tax to the lord, the lord a step more loyal":
      expect(e.recruitsTo).toBe("lord's retinue");
      expect(e.taxToLord).toBe(0.5);
      expect(e.lordLoyaltySteps).toBe(1);
      break;
    default:
      throw new Error(`unknown effect ${what}`);
  }
  },
);

Given('the province "Bar" has 12 clerks', (s) => {
  s.clerks = 12;
});
When('the official of province "Bar" is commissioned', (s) => {
  s.choices = R.emptyProvinceChoices(s.clerks);
});
Then('the choice "Name a deputy" is not offered', (s) => {
  expect(s.choices).not.toContain("Name a deputy");
  expect(s.choices).toContain("Leave it");
});

Given('the lord next door ran "Reims" while its official was away', (s) => {
  s.effect = R.emptyProvinceEffect("Ask the lord next door");
});
When("the war ends", (s) => {
  s.warOver = true;
});
Then('the lord may ask for "Reims" as a fief', (s) => {
  expect(s.warOver && s.effect.lordMayAskFief).toBe(true);
});

Given('a commissioned official had 8 years served in "Reims"', (s) => {
  s.commission = R.commission({ official: "O", type: "Steward", yearsServed: 8, province: "Reims" }).commission;
});
Given(re('"Reims" was run by (a deputy|nobody) while they were away'), (s, who: string) => {
  s.commission.choice = who === "a deputy" ? "Name a deputy" : "Leave it";
});
When(re('the official is released to "(\\w+)"'), (s, to: string) => {
  s.released = R.release(s.commission, to);
});
Then(re("their years served are (\\d+)"), (s, y: string) => {
  expect(s.released.yearsServed).toBe(num(y));
});

// ---------------------------------------------------------------- effects of official commanders (RECR-088..096)

Given("an army commanded by a commissioned official", (s) => {
  s.conduct = R.officialConduct;
});
When("the war goes on for years", () => {});
Then("the commander never refuses a command", (s) => {
  expect(s.conduct.refusesCommand).toBe(false);
});
Then("never goes home with his men mid-war", (s) => {
  expect(s.conduct.goesHomeMidWar).toBe(false);
});
Then("never defects with land", (s) => {
  expect(s.conduct.defectsWithLand).toBe(false);
});

Given(re("a commissioned official with (\\d+) victories is released to a province"), (s, v: string) => {
  s.factor = R.returnEffect(num(v));
});
Then(re("they give ([\\d.]+) times their type's effect there"), (s, f: string) => {
  expect(s.factor).toBe(Number(f));
});

Given('the lord "Count of Foix" is Proud and serves as captain under an official', (s) => {
  s.proudCaptain = true;
});
When("a season passes", (s) => {
  s.waver = R.proudCaptainWavers(s.proudCaptain, true);
});
Then('the lord "Count of Foix" wavers a step', (s) => {
  expect(s.waver).toBe(1);
});

Given("an army is commanded by a commissioned official", (s) => {
  s.lords = {};
});
Given(re('the lord "([^"]+)" (is Proud|is not Proud)'), (s, lord: string, p: string) => {
  s.lords[lord] = { proud: p === "is Proud", want: false };
  s.lastLord = lord;
});
Given(re("the war aim (is|is not) his Want"), (s, w: string) => {
  s.lords[s.lastLord].want = w === "is";
});

When("an official is commissioned as commander", (s) => {
  s.commission = R.commission({ official: "O", type: "Steward" }).commission;
});
Then("the official brings no men of their own", () => {
  expect(R.officialConduct.retinue).toBe(0);
});

Given("a commissioned official commands an army", (s) => {
  s.roster = { commanders: 3, officials: 10 };
});
When("the official is captured in battle", (s) => {
  s.lost = R.officialLost(s.roster);
});
Then("the realm has lost a commander and an official", (s) => {
  expect(s.roster).toEqual({ commanders: 2, officials: 9 });
});
Then("paying the ransom brings both back", (s) => {
  s.lost.ransom();
  expect(s.roster).toEqual({ commanders: 3, officials: 10 });
});

Given("a royal army needs a commander", () => {});
When(re('the player picks "(the ruler|an heir|a lord|a hired captain|an exile)"'), (s, l: Parameters<typeof R.otherLeader>[0]) => {
  s.leader = R.otherLeader(l);
});
Then(
  re(
    "(the ruler leads|the heir leads|the lord can lead only his own retinue as a captain|the captain comes with his free company|the exile becomes an official of the closest type and can be commissioned)",
  ),
  (s, r: string) => {
    expect(s.leader).toBe(r);
  },
);

// ---------------------------------------------------------------- the recruit pool (RECR-020..030, RECR-100)

/** Troyes with Champagne's mix of classes, scaled to a ceiling. */
function troyesPeople(ceil: number): Record<string, number> {
  const { byClass, othersCallable } = champagneFighting(18000);
  const c = R.ceiling(Object.fromEntries(Object.entries(byClass).map(([k, f]) => [k, f / 0.25])));
  const k = ceil / c;
  void othersCallable;
  return Object.fromEntries(Object.entries(byClass).map(([cls, f]) => [cls, (f / 0.25) * k]));
}

Given(re('the province "Troyes" has 1000 recruits here below its ceiling'), (s) => {
  s.pool = { ceiling: 2200, recruits: 1000, fallen: 0, veterans: 0 } satisfies R.ProvincePool;
});
When(re('(.+) happens in province "Troyes"'), (s, cause: string) => {
  s.before = s.pool.recruits;
  R.poolCause(s.pool, cause, 100);
});
Then(re("the recruits here (rise|fall)"), (s, d: string) => {
  if (d === "rise") expect(s.pool.recruits).toBeGreaterThan(s.before);
  else expect(s.pool.recruits).toBeLessThan(s.before);
});

Given(re('the province "Troyes" has a ceiling of (\\d+) men'), (s, n: string) => {
  s.people = troyesPeople(num(n));
  near(R.ceiling(s.people), num(n), 1e-6);
});
When("its people grow", (s) => {
  s.before = R.ceiling(s.people);
  for (const k of Object.keys(s.people)) s.people[k] *= 1.05;
});
Then("its ceiling rises", (s) => {
  expect(R.ceiling(s.people)).toBeGreaterThan(s.before);
});

Given('the province "Troyes" has 72000 people', (s) => {
  s.pool = { ceiling: 2200, recruits: 2200, fallen: 0, veterans: 0 } satisfies R.ProvincePool;
  s.people = 72000;
});
When('720 soldiers levied in "Troyes" die in war', (s) => {
  s.cut = R.soldiersFell(s.pool, 720, s.people, 1444);
});
Then('the province "Troyes" has 720 fallen from here', (s) => {
  expect(s.pool.fallen).toBe(720);
});
Then('births in "Troyes" are cut by 0.2 percent for 10 years', (s) => {
  near(s.cut, 0.002, 1e-12);
  near(R.birthsCutIn(s.pool, 1453), 0.002, 1e-12);
  expect(R.birthsCutIn(s.pool, 1454)).toBe(0);
});
Then("each year a tenth of its fallen from here fades", (s) => {
  R.yearPasses(s.pool);
  near(s.pool.fallen, 648, 1e-9);
});

Given(re('an army with (\\d+) trained or blooded men from "Troyes"'), (s, n: string) => {
  s.blooded = num(n);
});
Then('the province "Troyes" has 1400 more veterans here', (s) => {
  expect(s.pool.veterans).toBe(1400);
});
Then("each year a tenth of its veterans here are lost to old age", (s) => {
  R.yearPasses(s.pool);
  near(s.pool.veterans, 1260, 1e-9);
});

Given('the province "Troyes" has 1400 veterans here', (s) => {
  s.pool = { ceiling: 2200, recruits: 1000, fallen: 0, veterans: 1400 } satisfies R.ProvincePool;
});
When("200 veterans leave as settlers", (s) => {
  R.veteransLeave(s.pool, 200);
});
Then('the province "Troyes" has 1200 veterans here', (s) => {
  expect(s.pool.veterans).toBe(1200);
});

Given('the province "Troyes" trains 2500 pikes with 3 months left', (s) => {
  s.order = { id: "P", place: "Troyes", arm: "pikes", men: 2500, monthsLeft: 3, monthsDone: 0, kind: "levy" } satisfies R.TrainingOrder;
  s.pool = { ceiling: 2200, recruits: 1000, fallen: 700, veterans: 1400 } satisfies R.ProvincePool;
});
Then("the training has 2 months left", (s) => {
  expect(s.order.monthsLeft).toBe(2);
});
Then("the pool refill and the fading of fallen and veterans wait for January", (s) => {
  expect(s.pool).toEqual(s.poolBefore);
  R.monthPasses(s.pool, [], { month: 1 });
  near(s.pool.recruits, 1000 + (2200 - 1000) * 0.25, 1e-9);
  near(s.pool.fallen, 630, 1e-9);
  near(s.pool.veterans, 1260, 1e-9);
});

// ---------------------------------------------------------------- food, harvest and births (RECR-030..038)

Given('2500 levies and 500 horses train at the castle of "Troyes"', (s) => {
  s.camp = { men: 2500, horses: 500 };
});
When("a month of training passes", (s) => {
  s.menAte = R.rations(s.camp.men, "in training camp");
  s.horsesAte = R.rations(0, "in training camp", s.camp.horses);
  s.stores = { castle: 4000, province: 10000 };
  s.took = R.takeFood(s.menAte + s.horsesAte, s.stores);
});
Then("the training eats 3750 rations for men and 1500 rations for horses", (s) => {
  expect([s.menAte, s.horsesAte]).toEqual([3750, 1500]);
});
Then('the rations come from the castle store of "Troyes" first, then the province "Troyes"', (s) => {
  expect(s.took).toEqual({ fromCastle: 4000, fromProvince: 1250, short: 0 });
});

Given(re("1000 men are (at home|in training camp|on campaign)"), (s, w: R.Where) => {
  s.where = w;
});
Then(re("they eat (\\d+) rations"), (s, r: string) => {
  expect(s.ate).toBe(num(r));
});

Given("an army of 5000 men and 500 horses with a 2-month reserve", (s) => {
  s.army = { men: 5000, horses: 500, months: 2 };
});
When("the reserve is filled", (s) => {
  s.reserve = R.reserveFill(s.army.men, s.army.horses, s.army.months);
  s.stores = { castle: 20000, province: 50000 };
  s.took = R.takeFood(s.reserve, s.stores);
});
Then("the rations come from the castle store first, then the locals", (s) => {
  expect(s.took).toEqual({ fromCastle: 20000, fromProvince: 3000, short: 0 });
});

Given('a levy takes 2 percent of the farmers of region "Champagne"', (s) => {
  s.farmerShare = 0.02;
});
Given(re("the season is (sowing|harvest|winter)"), (s, season: string) => {
  s.season = season === "winter" ? "other" : season;
});
When("the harvest is counted", (s) => {
  s.harvest = R.harvestLoss(s.farmerShare, s.season);
});

Given("the config gives each climate its sowing and harvest months", (s) => {
  s.calendar = R.recruitingConfig.seasonMonthsByClimate satisfies R.SeasonCalendar;
  expect(Object.keys(s.calendar).sort()).toEqual(["north", "rice", "south"]);
});
When("a levy is planned in a sowing or harvest month of its climate", (s) => {
  s.warnings = [
    [3, "north"],
    [9, "north"],
    [3, "south"],
    [9, "south"],
  ].map(([m, c]) => R.harvestWarning(R.seasonOf(m as number, c as string, s.calendar)));
  s.noWarning = R.harvestWarning(R.seasonOf(1, "north", s.calendar));
});
Then("the levy screen shows a harvest warning", (s) => {
  expect(s.warnings).toEqual([true, true, true, true]);
  expect(s.noWarning).toBe(false);
});

Given('10 percent of the fighting-age men of province "Troyes" are away with the army', (s) => {
  s.away = 0.1;
});
When('the births of "Troyes" are counted', (s) => {
  s.birthsCut = R.birthsCutForMenAway(s.away);
});
Then("births fall by the share of fighting-age men away", (s) => {
  expect(s.birthsCut).toBe(0.1);
});

// ---------------------------------------------------------------- standing regiments and retinues (RECR-055..059)

Given(re('a trained regiment of 1000 "pikes" paid 200 gold a month'), (s) => {
  s.regiment = { id: "R", arm: "pikes", men: 1000, kind: "levy", drill: 3, scars: true } satisfies R.Regiment;
  expect(R.regimentPay(R.payGroupOf("pikes"), 1000)).toBe(200);
});
When("the regiment is signed on", (s) => {
  s.result = R.signOn(s.regiment, known(s));
});
Then("it stays under arms in peace, keeping its drill and scars", (s) => {
  expect(s.result.ok).toBe(true);
  expect(s.result.regiment.signedOn).toBe(true);
  expect(s.result.regiment.drill).toBe(3);
  expect(s.result.regiment.scars).toBe(true);
  expect(R.goingHome({ ...s.result.regiment, monthsOut: 12 })).toBe(0);
});
Then("it is paid 300 gold a month all year", (s) => {
  expect(R.regimentPay(R.payGroupOf("pikes"), 1000, true)).toBe(300);
});
When("the player tries to sign on a trained regiment", (s) => {
  s.result = R.signOn({ id: "R", arm: "pikes", men: 1000, kind: "levy", drill: 3 }, known(s));
});
Then("the order is refused", (s) => {
  expect(s.result.ok).toBe(false);
});

Given('a regiment of 1000 men from "Troyes" is signed on', (s) => {
  s.pool = { ceiling: 2200, recruits: 2200, fallen: 0, veterans: 0 } satisfies R.ProvincePool;
  R.poolCause(s.pool, "a levy", 1000);
  s.emptySlots = 1000;
  s.regiment = R.signOn({ id: "R", arm: "pikes", men: 1000, kind: "levy", drill: 3 }, ["W12"]);
});
Then('those 1000 men are gone from the pool of "Troyes" while they serve', (s) => {
  expect(s.regiment.ok).toBe(true);
  expect(s.pool.recruits).toBe(1200);
  expect(R.goingHome({ ...s.regiment.regiment, monthsOut: 24 })).toBe(0);
});
Then('their slots in "Troyes" stay empty', (s) => {
  expect(s.emptySlots).toBe(1000);
});

Given('a standing regiment in peace in province "Troyes"', (s) => {
  s.standing = { men: 1000, peace: true };
});
Given(re('the province "Troyes" (has|does not have) a barracks with room for it'), (s, h: string) => {
  s.barracksRoom = h === "has" ? R.trainingRoom(["barracks"]) : 0;
});
When("the month ends", (s) => {
  if (s.pay !== undefined) s.spent = R.paySpentAtHome(s.pay);
  if (s.standing) s.quartered = R.soldiersQuartered(s.standing.peace, s.barracksRoom, s.standing.men);
  if (s.regiment && !s.standing) s.goneHome = R.goingHome(s.regiment);
  if (s.regimentSlot !== undefined) monthlyRecruits(levyGame(s).w, []);
});
Then(re('the province "Troyes" (gets|does not get) "Soldiers quartered"'), (s, g: string) => {
  expect(s.quartered).toBe(g === "gets");
});

Given('the lord "Duke of Bourbon" holds lands with a castle', (s) => {
  s.lord = { name: "Duke of Bourbon", wealth: 500, lands: [{ id: "Bourbonnais", byClass: { farmers: 1000, herders: 200 } }], castles: ["Moulins"] };
});
When('the lord "Duke of Bourbon" levies and trains his retinue', (s) => {
  s.retinue = R.lordLevy(s.lord, 600);
});
Then("the levy follows the same call shares from his lands", (s) => {
  const d = R.drawLevy([{ id: "Bourbonnais", byClass: { farmers: 1000, herders: 200 } }], 600);
  expect(s.retinue.draw.byClass).toEqual(d.byClass);
  expect(s.retinue.draw.share).toBe(0.5);
});
Then("he pays from his own wealth and trains at his own castles", (s) => {
  expect(s.retinue.paidBy).toBe("Duke of Bourbon");
  expect(s.lord.wealth).toBe(500 - R.levyMoney(600));
  expect(s.retinue.trainsAt).toEqual(["Moulins"]);
});

Given(re('the lord "(Lord [AB])" has trait "(\\w+)"'), (s, _lord: string, trait: string) => {
  s.traits = [trait];
});
When("the lord trains his retinue", (s) => {
  s.lordTrains = R.lordTrains(s.traits);
});
Then(re("he trains (knights and armoured foot|nothing: he keeps levies)"), (s, what: string) => {
  if (what === "knights and armoured foot") expect(s.lordTrains).toEqual(["knights and lancers", "armoured foot"]);
  else expect(s.lordTrains).toEqual([]);
});

// ---------------------------------------------------------------- training (RECR-039..054)

Given(re('the province "(\\w+)" has an? (earthwork ring fort|stone castle|bastion fort|star fort|drill yard|barracks) and an? (drill yard|barracks)'), (s, p: string, a: string, b: string) => {
  (s.places ??= {})[p] = [a, b];
});
Given(re('the province "(\\w+)" has an? (earthwork ring fort|bastion fort|star fort|drill yard|barracks)'), (s, p: string, a: string) => {
  (s.places ??= {})[p] = [a];
});
When(re('the training room of province "(\\w+)" is read'), (s, p: string) => {
  expect(R.canTrain(s.places[p])).toBe(true);
  s.room = R.trainingRoom(s.places[p]);
});
Then(re("it trains (\\d+) men at once"), (s, n: string) => {
  expect(s.room).toBe(num(n));
});

/** Bar, Troyes, Vitry and Langres as a small map; Troyes has the nearest castle. */
function marches(): MoveWorld {
  const place = (id: string): Place => ({ id, terrain: "farmland", owner: "France" });
  const ids = ["Bar", "Troyes", "Vitry", "Langres"];
  return {
    date: { year: 1444, month: 8 },
    places: Object.fromEntries(ids.map((i) => [i, place(i)])),
    neighbours: { Bar: ["Troyes", "Vitry"], Troyes: ["Bar"], Vitry: ["Bar", "Langres"], Langres: ["Vitry"] },
    relations: { wars: [], alliances: [], passage: [], subjects: [] },
    movers: [],
  };
}
Given('the province "Bar" has no castle and no drill yard', (s) => {
  (s.places ??= {})["Bar"] = [];
  expect(R.canTrain([])).toBe(false);
});
Given('the nearest training place is the castle of "Troyes"', (s) => {
  s.places["Troyes"] = ["stone castle"];
  s.places["Langres"] = ["star fort"];
});
When('the player trains levies standing in "Bar"', (s) => {
  const at = Object.entries(s.places as Record<string, string[]>).filter(([, v]) => R.canTrain(v)).map(([k]) => k);
  s.goTo = R.nearestTrainingPlace(marches(), "France", "Bar", at);
});
Then('the levies march to "Troyes" to train', (s) => {
  expect(s.goTo).toBe("Troyes");
});

Given('the country "France" has 5000 levies at "Troyes"', (s) => {
  s.levies = { men: 5000, arm: R.LEVY_ARM, at: "Troyes" };
});
When('the player trains 2500 of them into "pikes" at the castle of "Troyes"', (s) => {
  const r = R.orderTraining({ id: "T", place: "Troyes", arm: "pikes", men: 2500, unlocked: ["pikes"], room: R.trainingRoom(["stone castle"]) });
  if (!r.ok) throw new Error(r.reason);
  s.order = r.order;
  s.levies.men -= 2500;
});
Then('2500 levies walk to the castle of "Troyes" and start training', (s) => {
  expect(s.order.men).toBe(2500);
  expect(s.order.place).toBe("Troyes");
  expect(s.order.monthsLeft).toBe(3);
});
Then("the other 2500 stay levies", (s) => {
  expect(s.levies).toMatchObject({ men: 2500, arm: "levy foot" });
});

Given('the country "France" has not unlocked "musketeers"', (s) => {
  s.unlocked = ["pikes", "archers", "hand gunners"];
});
When('the player tries to train levies into "musketeers"', (s) => {
  s.result = R.orderTraining({ id: "T", place: "Troyes", arm: "musketeers", men: 1000, unlocked: s.unlocked, room: 3000 });
});

/** Parses the needs column of the arm table: "10 loads of arms, 10 powder", "1000 horses", "the guns, …". */
function parseNeeds(text: string): { needs: Record<string, number>; also: string[] } {
  const needs: Record<string, number> = {};
  const also: string[] = [];
  if (text === "nothing") return { needs, also };
  for (const part of text.split(", ")) {
    const m = /^(\d+) (.+)$/.exec(part);
    if (!m) {
      also.push(part);
      continue;
    }
    const what = m[2] === "loads of arms" ? "arms" : m[2]!;
    needs[what] = num(m[1]!);
  }
  return { needs, also };
}
When(re('1000 levies start training into "([^"]+)"'), (s, arm: string) => {
  s.cost = R.trainingCost(arm, 1000);
});
Then(re("the training takes (\\d+) months and (\\d+) gold"), (s, m: string, g: string) => {
  expect([s.cost.months, s.cost.gold]).toEqual([num(m), num(g)]);
});
Then(re('it takes "([^"]+)" from the stores'), (s, needs: string) => {
  const want = parseNeeds(needs);
  expect(s.cost.needs).toEqual(want.needs);
  expect(s.cost.also).toEqual(want.also);
});

Given('the official of province "Troyes" is a Marshal', (s) => {
  s.marshalHere = true;
});
When('1000 levies train into "archers" at "Troyes"', (s) => {
  s.cost = R.trainingCost("archers", 1000, { marshal: !!s.marshalHere });
  s.plain = R.trainingCost("archers", 1000);
});
Then("the training is 25 percent faster", (s) => {
  near(s.cost.months, s.plain.months * 0.75, 1e-9);
});
Then("the regiment leaves with drill 4", (s) => {
  expect(s.cost.drill).toBe(4);
  const order = R.orderTraining({ id: "A", place: "Troyes", arm: "archers", men: 1000, unlocked: ["archers"], room: 3000, marshal: true });
  if (!order.ok) throw new Error(order.reason);
  let done: R.Regiment | null = null;
  while (!done) done = R.tickTraining(order.order);
  expect(done.drill).toBe(4);
});

Given("1000 levies who are all veterans", (s) => {
  s.vet = 1;
});
When(re('they train into "([^"]+)"'), (s, arm: string) => {
  s.cost = R.trainingCost(arm, 1000, { veteranShare: s.vet });
});
Then("the training takes 1.5 months", (s) => {
  expect(s.cost.months).toBe(1.5);
});

Given('a regiment of 1000 "pikes" with drill 5 and scars', (s) => {
  s.regiment = { id: "R", arm: "pikes", men: 1000, kind: "levy", drill: 5, scars: true } satisfies R.Regiment;
});
When('it retrains into "pike and shot"', (s) => {
  s.retrained = R.retrain(s.regiment, "pike and shot");
});
Then("the retraining takes 2 months and 75 gold", (s) => {
  expect([s.retrained.cost.months, s.retrained.cost.gold]).toEqual([2, 75]);
});
Then("the regiment keeps drill 5 and its scars", (s) => {
  expect(s.retrained.regiment).toMatchObject({ arm: "pike and shot", drill: 5, scars: true });
});

Given('2500 levies have trained 2 months of 3 into "pikes"', (s) => {
  s.order = { id: "P", place: "Troyes", arm: "pikes", men: 2500, monthsLeft: 3, monthsDone: 0, kind: "levy" } satisfies R.TrainingOrder;
  R.tickTraining(s.order);
  R.tickTraining(s.order);
  expect(s.order.monthsDone).toBe(2);
});
When("they are called out of training to fight", (s) => {
  s.out = R.callOutOfTraining(s.order);
});
Then('they go as "levy foot"', (s) => {
  expect(s.out.arm).toBe("levy foot");
  expect(s.out.men).toBe(2500);
});
Then("the 2 months spent are lost", (s) => {
  expect(s.out.monthsLost).toBe(2);
  expect(s.order.monthsDone).toBe(0);
});

Given('2500 levies train at the castle of "Langres"', (s) => {
  s.order = { id: "P", place: "Langres", arm: "pikes", men: 2500, monthsLeft: 3, monthsDone: 0, kind: "levy" } satisfies R.TrainingOrder;
});
When('the castle of "Langres" is put under siege', (s) => {
  R.tickTraining(s.order, true);
});
Then('all training at "Langres" stops', (s) => {
  expect(s.order.stopped).toBe(true);
  expect(s.order.monthsLeft).toBe(3);
});

Given(re("a company that is (untrained levies|a trained regiment|a regiment trained under a Marshal)"), (s, st: string) => {
  const state = st === "untrained levies" ? "untrained" : st === "a trained regiment" ? "trained" : "trained under a Marshal";
  s.troopLevel = 0.05;
  s.company = R.drillAndBreak(state, s.troopLevel);
});
Then(re("its drill is (\\d+)"), (s, d: string) => {
  expect(s.company.drill).toBe(num(d));
});
Then(re("its break point is (25 percent|30 percent plus troop level)"), (s, b: string) => {
  near(s.company.breakPoint, b === "25 percent" ? 0.25 : 0.3 + s.troopLevel, 1e-9);
});

Given('1000 levies of kind "levy"', (s) => {
  s.order = { id: "P", place: "Troyes", arm: "pikes", men: 1000, monthsLeft: 3, monthsDone: 0, kind: "levy" } satisfies R.TrainingOrder;
});
When('they finish training into "pikes"', (s) => {
  let r: R.Regiment | null = null;
  while (!r) r = R.tickTraining(s.order);
  s.regiment = r;
});
Then('the regiment is still of kind "levy"', (s) => {
  expect(s.regiment.kind).toBe("levy");
  expect(s.regiment.arm).toBe("pikes");
});

Given('a trained regiment of kind "levy" that has been out 7 months unpaid double', (s) => {
  s.regiment = { id: "R", arm: "pikes", men: 1000, kind: "levy", drill: 3, monthsOut: 7 } satisfies R.Regiment;
});
Then("5 percent of its men go home", (s) => {
  near(s.goneHome, 50, 1e-9);
  expect(R.goingHome({ ...s.regiment, paidDouble: true })).toBe(0);
  expect(R.goingHome({ ...s.regiment, monthsOut: 6 })).toBe(0);
});

When(re('1000 levies train into "([^"]+)"'), (s, arm: string) => {
  s.cost = R.trainingCost(arm, 1000);
});
Then(re("(\\d+) months of pay are owed before they fight"), (s, n: string) => {
  expect(R.payMonthsOwed(s.cost.months)).toBe(num(n));
});

// ---------------------------------------------------------------- AI (RECR-097..099)

Given(re('the AI country "\\w" has personality "([^"]+)"'), (s, p: string) => {
  s.personality = p;
});
When("it raises an army", (s) => {
  s.ai = R.aiRaises(s.personality);
});
Given('the date is in a harvest month for the AI country "A"', (s) => {
  s.season = "harvest";
});
Given(re("an enemy army (is not|is) in its land"), (s, e: string) => {
  s.enemy = e === "is";
});
When('the AI country "A" decides whether to levy', (s) => {
  s.mayLevy = R.aiMayLevy(s.season, s.enemy);
});
Then(re("it (levies deep and trains expensive arms|levies little and hires companies instead|trains horse archers|does not levy|may levy)"), (s, what: string) => {
  switch (what) {
    case "levies deep and trains expensive arms":
      expect(s.ai).toEqual({ levy: "deep", trains: "expensive arms", hires: false });
      break;
    case "levies little and hires companies instead":
      expect(s.ai).toMatchObject({ levy: "little", hires: true });
      break;
    case "trains horse archers":
      expect(s.ai.trains).toBe("horse archers");
      break;
    case "does not levy":
      expect(s.mayLevy).toBe(false);
      break;
    case "may levy":
      expect(s.mayLevy).toBe(true);
  }
});

Given('the AI country "A" has a steward, a warden and a tax collector as officials', (s) => {
  s.officials = [
    { id: "tax collector", type: "Tax collector" },
    { id: "warden", type: "Warden" },
    { id: "steward", type: "Steward" },
  ];
});
When("it needs a commander", (s) => {
  s.picked = R.aiPicksCommander(s.officials);
});
Then("it commissions the steward or the warden first", (s) => {
  expect(["steward", "warden"]).toContain(s.picked);
});
Then("keeps the tax collector in his seat", (s) => {
  expect(s.picked).not.toBe("tax collector");
  expect(R.aiPicksCommander([{ id: "tax collector", type: "Tax collector" }])).toBeNull();
});

// ---------------------------------------------------------------- decided questions (D-RECR-*)

// D-RECR-3, D-RECR-11, D-RECR-24: the pool, the January step, riots.
Given(re('the province "Troyes" has a ceiling of (\\d+) men and (\\d+) recruits here'), (s, c: string, r: string) => {
  s.pool = { ceiling: num(c), recruits: num(r), fallen: 0, veterans: 0 } satisfies R.ProvincePool;
});
Given(re('the official of province "Troyes" is "(a steward|a muster master)"'), (s, o: string) => {
  s.musterMaster = o === "a muster master";
});
When("a year passes", (s) => {
  R.yearPasses(s.pool, { musterMaster: !!s.musterMaster });
});
Then(re('the province "Troyes" has (1300|1400) recruits here'), (s, n: string) => {
  near(s.pool.recruits, num(n), 1e-9);
});
Given('the province "Troyes" has 700 fallen from here and 1400 veterans here', (s) => {
  s.pool.fallen = 700;
  s.pool.veterans = 1400;
});
When("the turn in which 1 January falls passes", (s) => {
  R.monthPasses(s.pool, [], { month: R.recruitingConfig.yearlyMonth });
});
Then('the province "Troyes" has 630 fallen from here and 1260 veterans here', (s) => {
  near(s.pool.fallen, 630, 1e-9);
  near(s.pool.veterans, 1260, 1e-9);
});
When('the province "Troyes" riots', (s) => {
  s.rioting = true;
});
Then(re('the province "Troyes" can call (\\d+) men'), (s, n: string) => {
  expect(R.callableNow(s.pool, !!s.rioting)).toBe(num(n));
});
Then('the province "Troyes" still has a ceiling of 2200 men', (s) => {
  expect(s.pool.ceiling).toBe(2200);
});
Then('the province "Troyes" can call 2000 men again when the riot ends', (s) => {
  expect(R.callableNow(s.pool, false)).toBe(2000);
});

// D-RECR-10: Conscription thresholds.
Given(
  re('the province "Troyes" (has no fallen and no W15|has fallen from here|belongs to a realm with W15 Mass conscription|has fallen from here and belongs to a realm with W15 Mass conscription)'),
  (s, c: string) => {
    s.conscriptionWhen = { fallen: c.startsWith("has fallen"), massConscription: c.includes("W15 Mass") };
  },
);
When(re("a levy leaves (\\d+) recruits here"), (s, n: string) => {
  s.gets = R.givesConscription(num(n), R.ceiling(s.people), s.conscriptionWhen);
});
Then(re('the province "Troyes" (gets|does not get) the grievance "Conscription"'), (s, g: string) => {
  expect(s.gets).toBe(g === "gets");
});

// D-RECR-12, D-RECR-15: gathering and the muster place.
Then("the levies gather in 3 days instead of 14", (s) => {
  expect(R.gatheringDays(known(s))).toBe(3);
  expect(R.gatheringDays([])).toBe(14);
  expect(R.gatherLevy("L", "France", 5000, known(s)).gatheredOnDay).toBe(3);
});
Given('new regiments of "France" go to "Reims"', (s) => {
  s.rally = "Reims";
});
Then('the levy gathers as one army at "Troyes"', (s) => {
  s.muster = R.musterPlace(s.draw, s.rally);
  expect(s.muster.gathersAt).toBe("Troyes");
  if (!s.rally) expect(s.muster.thenMarchesTo).toBeUndefined();
});
Then('the gathered army is ordered to march to "Reims"', (s) => {
  expect(s.muster.thenMarchesTo).toBe("Reims");
});

// D-RECR-14: rice and pastoral lands.
Given("a province with rice lands", (s) => {
  s.climate = "rice";
});
When(re("a levy takes 2 percent of its farmers in month (\\d+)"), (s, m: string) => {
  s.harvest = R.harvestLoss(0.02, R.seasonOf(num(m), s.climate));
});
Then(re("its harvest falls by (\\d+) percent"), (s, p: string) => {
  near(s.harvest * 100, num(p), 1e-9);
});
Given(re("a pastoral province in the (north|south)"), (s, h: "north" | "south") => {
  s.hemisphere = h;
});
When(re("a levy takes 2 percent of its herders in month (\\d+)"), (s, m: string) => {
  s.herd = R.herdGrowthLoss(0.02, num(m), s.hemisphere);
  s.harvest = R.harvestLoss(0, R.seasonOf(num(m), s.hemisphere));
});
Then(re("its herd growth falls by (\\d+) percent"), (s, p: string) => {
  near(s.herd * 100, num(p), 1e-9);
});
Then("its harvest does not fall", (s) => {
  expect(s.harvest).toBe(0);
});

// D-RECR-8, D-RECR-9: pay groups and the free months.
Given(re('a trained regiment of (\\d+) "([^"]+)"'), (s, men: string, arm: string) => {
  s.regiment = { id: "R", arm, men: num(men), kind: "levy", drill: 3 } satisfies R.Regiment;
});
When("the month is paid after its free months", (s) => {
  s.pay = R.regimentPay(R.payGroupOf(s.regiment.arm), s.regiment.men);
});
Then(re("the regiment costs (\\d+) gold"), (s, g: string) => {
  near(s.pay, num(g), 1e-9);
});
Given(re('the arm "([^"]+)"'), (s, arm: string) => {
  s.arm = arm;
});
Then(re('its pay group is "([^"]+)"'), (s, g: string) => {
  expect(R.payGroupOf(s.arm)).toBe(g);
});
Given(re('a levy that gathered and went straight into training as "([^"]+)"'), (s, arm: string) => {
  s.cost = R.trainingCost(arm, 1000);
});
When("its training ends", () => {});
Then(re("it has owed (\\d+) months of pay"), (s, m: string) => {
  expect(R.paidMonths(s.cost.months)).toBe(num(m));
});

// D-RECR-13: students.
Given('the province "Reims" has 400 clergy, 100 scholars and 1000 students', (s) => {
  s.people = { clergy: 400, scholars: 100, students: 1000 };
});
Then("clergy and scholars add 0 men", (s) => {
  expect(s.callable.clergy + s.callable.scholars).toBe(0);
});
Then("students add 10 men to the same pool", (s) => {
  near(s.callable.students, 10, 1e-9);
  near(R.ceiling(s.people), 10, 1e-9);
});
Then("a levy that takes students stops their research", (s) => {
  const draw = R.drawLevy([{ id: "Reims", byClass: { students: s.callable.students } }], 5);
  expect(draw.byClass["students"]).toBe(5);
  expect(R.studentsResearch(draw.byClass["students"]! > 0)).toBe("stops");
});

// D-RECR-17: years served.
Given(re('an official of type "([^"]+)" with (\\d+) years served in "Reims"'), (s, t: string, y: string) => {
  s.type = t;
  s.years = num(y);
});
Then(re("the commander has Logistics (\\d+)"), (s, l: string) => {
  expect(s.commission.skills.logistics).toBe(num(l));
});

// D-RECR-16, D-RECR-20: official commanders.
Given('the lord "Count of Foix" is Wavering and the lord "Duke of Bourbon" is Loyal', (s) => {
  s.lordList = [
    { name: "Count of Foix", loyalty: "Wavering", lands: 2, retinue: 300 },
    { name: "Duke of Bourbon", loyalty: "Loyal", lands: 3, retinue: 500 },
  ];
  s.before = JSON.parse(JSON.stringify(s.lordList));
  s.realm = { victories: 0 };
});
When("an army commanded by a commissioned official wins a battle", (s) => {
  R.officialVictory(s.lordList, s.realm);
});
Then(re('the lord "([^"]+)" is Loyal'), (s, name: string) => {
  expect(s.lordList.find((l: { name: string }) => l.name === name).loyalty).toBe("Loyal");
});
Then("the ruler's victories rise by 1", (s) => {
  expect(s.realm.victories).toBe(1);
});
Then("no single lord grows from it", (s) => {
  for (const [i, l] of (s.lordList as { lands: number; retinue: number }[]).entries()) {
    expect([l.lands, l.retinue]).toEqual([s.before[i].lands, s.before[i].retinue]);
  }
});
Given(re("a commissioned official with (\\d+) victories who led the same regiments (\\d+) years"), (s, v: string, y: string) => {
  s.big = R.tooBig({ victories: num(v), yearsWithSameRegiments: num(y), official: true });
  s.soldiers = 3000;
});
When(re('the player answers "(refuse land|grant land|none)"'), (s, a: string) => {
  s.answer = a === "none" ? null : R.answerLandRequest(a as "refuse land" | "grant land", s.soldiers);
});
Then("the official becomes Ambitious", (s) => {
  expect(s.big).toBe("asks for land");
  expect(s.answer).toEqual({ trait: "Ambitious" });
});
Then("the official becomes a lord with his old soldiers as retinue", (s) => {
  expect(s.big).toBe("asks for land");
  expect(s.answer).toEqual({ becomes: "lord", retinue: 3000 });
});
Then('the official becomes "their man"', (s) => {
  expect(s.big).toBe("their man");
});
Then("the official asks for nothing", (s) => {
  expect(s.big).toBeNull();
});

// Champagne, after the war (design §8).
Given("the army wins twice and comes home in spring", (s) => {
  const { commission } = R.commission({ official: "steward of Reims", type: "Steward", yearsServed: 8, province: "Reims" });
  commission.choice = "Name a deputy";
  commission.victories = 2;
  s.commission = commission;
  s.troyesPool = { ceiling: 2200, recruits: 800, fallen: 0, veterans: 0 } satisfies R.ProvincePool;
});
Given("700 of the 5000 died", (s) => {
  R.soldiersFell(s.troyesPool, 700, 72000, 1445);
});
When('the steward is released to "Reims"', (s) => {
  s.released = R.release(s.commission, "Reims");
});
Then("the steward returns to full effect at once because a deputy kept the seat", (s) => {
  expect(s.released).toEqual({ province: "Reims", yearsServed: 8, fullEffectAtOnce: true });
  expect(R.returnEffect(s.commission.victories)).toBe(1);
});
Then('the births of "Troyes" dip for a decade from its fallen', (s) => {
  expect(s.troyesPool.fallen).toBe(700);
  expect(R.birthsCutIn(s.troyesPool, 1454)).toBeGreaterThan(0);
  expect(R.birthsCutIn(s.troyesPool, 1455)).toBe(0);
});
Then('1400 veterans return to "Troyes" and will train in half the time', (s) => {
  R.veteransHome(s.troyesPool, 1400);
  expect(s.troyesPool.veterans).toBe(1400);
  expect(R.trainingCost("pikes", 1400, { veteranShare: 1 }).months).toBe(R.trainingCost("pikes", 1400).months / 2);
});

// ---------------------------------------------------------------- names and ranks in the realm's language (feedback 125)

const nameRules = loadDefaultRuleset();
const realm = (id: string): number => {
  const n = nameRules.nations.findIndex((x) => x.id === id);
  expect(n, id).toBeGreaterThanOrEqual(0);
  return n;
};

Given("the country {string}", (s, id: string) => {
  s.realm = realm(id);
});

When("one of its people is named", (s) => {
  s.person = personName(nameRules, s.realm, 4444, "");
});

Then(re(`the name is in the "(\\w+)" culture with the family name (first|last)`), (s, culture: string, order: string) => {
  const c = cultureOf(nameRules, s.realm)!;
  expect(c).toBe(nameRules.names!.cultures[culture]);
  const family = c.family!.find((f) => (order === "first" ? s.person.startsWith(`${f} `) : s.person.endsWith(` ${f}`)));
  expect(family, s.person).toBeDefined();
});

Given("its commander {string}", (s, name: string) => {
  s.commander = name;
});

When(re("he leads (a fleet|an army)"), (s, post: string) => {
  s.ranked = rankedName(nameRules, s.realm, s.commander, post === "a fleet" ? "admiral" : "general");
});

Then("he is called {string}", (s, ranked: string) => {
  expect(s.ranked).toBe(ranked);
});

Given("the free companies for hire in 1444", (s) => {
  s.companies = createWorld(nameRules, 1).freeCompanies;
  expect(s.companies.length).toBeGreaterThan(0);
});

Then("each captain is ranked in the language of the realm his company gathers in", (s) => {
  for (const c of s.companies as { captain: string; home: number }[]) {
    const home = nameRules.nations.findIndex((n) => n.capital === nameRules.provinces[c.home]!.id);
    const [before, after] = (cultureOf(nameRules, home)?.ranks?.captain ?? "{name}").split("{name}");
    expect(c.captain.startsWith(before!) && c.captain.endsWith(after!), c.captain).toBe(true);
  }
});
// ---------------------------------------------------------------- the levy, garrison and training in the game (RECR-104..115)
// These run the engine's own rules on the 1444 map, with France as the player (levy-game.ts).

const order = (g: LevyGame, o: Order): string | undefined => applyNow(g.w, o, g.n).rejectedOrders[0]?.reason;
const troyes = (s: Scenario) => province(levyGame(s), "Troyes");

When('the country "France" levies 5000 men from province "Troyes"', (s) => {
  const g = levyGame(s);
  s.idleBefore = idleCommanders(g.w, g.n).length;
  s.armiesBefore = Array.from({ length: g.w.armies.count }, (_, i) => i).filter((i) => g.w.armies.alive[i] && g.w.armies.owner[i] === g.n).length;
  expect(order(g, { type: "recruit", province: troyes(s), thousands: 5 })).toBeUndefined();
});
Then('after 14 days the province "Troyes" has 1000 garrison troops of arm "levy foot"', (s) => {
  const g = levyGame(s);
  playDays(g, 7);
  expect(garrisonMen(g, troyes(s))).toBe(0);
  playDays(g, 7);
  expect(garrisonMen(g, troyes(s), "levy foot")).toBeCloseTo(1000, 0);
});
Then("the garrison troops can march and fight only once a commander picks them up", (s) => {
  const g = levyGame(s);
  const p = troyes(s);
  const [troop] = garrisonTroops(g.w, g.n, p);
  const next = g.w.rules.provinces[p]!.neighbors.map((id) => g.w.provinceIndex.get(id)!).find((q) => g.w.provinceOwner[q] === g.n)!;
  expect(order(g, { type: "move", army: troop!, to: next })).toMatch(/commander/);
  // Never drawn on the map: troops without a commander are no army.
  expect(g.w.armies.commander[troop!]).toBe(-1);
  const led = commanderAt(g, p);
  expect(order(g, { type: "pickUp", army: led.army })).toBeUndefined();
  expect(garrisonMen(g, p)).toBe(0);
  expect(g.w.armies.men[led.army]).toBeCloseTo(2000, 0);
  expect(order(g, { type: "move", army: led.army, to: next })).toBeUndefined();
});
Then("each thousand gathers in 3 days instead of 14", (s) => {
  const g = levyGame(s);
  expect(gatherDays(g.w, g.n)).toBe(3);
  // Days 3 and 6 of the first week: two thousands, and the third is due on day 9.
  playDays(g, 7);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(2000, 0);
  expect(garrisonView(g.w, g.n, troyes(s)).gathering[0]!.daysLeft).toBe(2);
});
Then('the levy gathers as garrison troops at "Troyes"', (s) => {
  const g = levyGame(s);
  playDays(g, 14);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(1000, 0);
  expect(garrisonTroops(g.w, g.n, troyes(s)).every((i) => g.w.armies.location[i] === troyes(s))).toBe(true);
});
Then("no army is formed until a commander picks them up", (s) => {
  const g = levyGame(s);
  for (const i of garrisonTroops(g.w, g.n, troyes(s))) expect(g.w.armies.commander[i]).toBe(-1);
  // No commander was taken from court for them.
  expect(idleCommanders(g.w, g.n).length).toBe(s.idleBefore);
});

When('the player opens the levy screen from the province card of "Troyes"', (s) => {
  const g = levyGame(s);
  s.callable = g.w.provinceRecruits[troyes(s)]!;
  s.levyScreen = R.provinceLevy(s.callable, 1);
});
Then("the men are chosen in whole thousands", (s) => {
  expect(LEVY_UNIT).toBe(1000);
  expect(R.provinceLevy(s.callable, 2.4).men).toBe(2000);
  const g = levyGame(s);
  expect(order(g, { type: "recruit", province: troyes(s), thousands: 2 })).toBeUndefined();
  expect(g.w.provinceRecruits[troyes(s)]).toBeCloseTo(s.callable - 2000, 0);
});
Then('the screen shows the thousands chosen as a percent of the men who can be called in "Troyes"', (s) => {
  expect(s.levyScreen.percent).toBe(Math.round((1000 / s.callable) * 100));
  expect(R.provinceLevy(5000, 1).percent).toBe(20);
});
Then("there is no levy for a region or the whole country", (s) => {
  const g = levyGame(s);
  // The levy names one province; anything else is no place to call men.
  expect(order(g, { type: "recruit", province: -1, thousands: 1 } as Order)).toBeTruthy();
  expect(order(g, { type: "recruit", thousands: 1 } as unknown as Order)).toBeTruthy();
});
Then("the first 1000 men are gathered after 14 days", (s) => {
  const g = levyGame(s);
  playDays(g, 14);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(1000, 0);
});
Then("all 5000 men are gathered after 70 days", (s) => {
  const g = levyGame(s);
  playDays(g, 56 - 7);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(4000, 0);
  playDays(g, 7);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(5000, 0);
  expect(garrisonView(g.w, g.n, troyes(s)).gathering).toEqual([]);
});

Given('the country "France" has gathered 2000 levies in "Troyes"', (s) => {
  const g = levyGame(s);
  expect(order(g, { type: "recruit", province: troyes(s), thousands: 2 })).toBeUndefined();
  playDays(g, 28);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(2000, 0);
});
Then('they are garrison troops of "Troyes" on its Garrison tab', (s) => {
  const g = levyGame(s);
  const tab = garrisonView(g.w, g.n, troyes(s));
  expect(tab.troops.reduce((t, x) => t + x.men, 0)).toBeCloseTo(2000, 0);
  // Only their own realm sees them.
  const england = g.w.nationIndex.get("england")!;
  expect(garrisonView(g.w, england, troyes(s)).troops).toEqual([]);
});
Then("they cannot march, fight in the field or train until a commander picks them up", (s) => {
  const g = levyGame(s);
  const [troop] = garrisonTroops(g.w, g.n, troyes(s));
  const next = g.w.rules.provinces[troyes(s)]!.neighbors.map((id) => g.w.provinceIndex.get(id)!)[0]!;
  expect(order(g, { type: "move", army: troop!, to: next })).toMatch(/commander/);
  expect(order(g, { type: "train", army: troop!, arm: "pikes", men: 1000 })).toMatch(/commander/);
});

// Training at a castle or drill yard, from the commander screen (RECR-043, RECR-108, RECR-109, RECR-112, RECR-113).

const LA_HIRE = (s: Scenario, p: number, men: number) => {
  const g = levyGame(s);
  s.laHire = commanderAt(g, p, men);
  g.w.commanders[s.laHire.commander]!.name = "La Hire";
  return s.laHire as { army: number; commander: number };
};

Given('the commander "La Hire" leads 5000 levies at "Troyes"', (s) => {
  LA_HIRE(s, troyes(s), 5000);
});
When('the player trains 2000 of them into "pikes" at the castle of "Troyes" from his commander screen', (s) => {
  const g = levyGame(s);
  const p = troyes(s);
  // Troyes has its castle (the scenario's place to train).
  g.w.provinceWorks[p * WORK_COUNT + workIndex("castle")] = Math.max(1, g.w.provinceWorks[p * WORK_COUNT + workIndex("castle")]!);
  expect(order(g, { type: "train", army: s.laHire.army, arm: "pikes", men: 2000 })).toBeUndefined();
});
Then('2000 levies walk to the castle of "Troyes" and start training', (s) => {
  const a = levyGame(s).w.armies;
  expect(a.trainArm[s.laHire.army]).toBe(ARMS.indexOf("pikes"));
  expect(a.trainMen[s.laHire.army]).toBe(2000);
});
Then("the other 3000 stay levies", (s) => {
  const a = levyGame(s).w.armies;
  expect(a.men[s.laHire.army]! - a.trainMen[s.laHire.army]!).toBe(3000);
  expect(menByArm(levyGame(s).w, s.laHire.army)[ARMS.indexOf("levy foot")]).toBeCloseTo(5000, 0);
});

Given('a trained regiment of kind "levy" that has been out 7 months', (s) => {
  const g = levyGame(s);
  const p = g.w.provinceIndex.get(g.w.rules.nations[g.n]!.capital)!;
  const slot = spawnArmy(g.w, g.n, p, 1000, -1, 0, { kind: KIND.levy, foot: "pikes", drill: 30 });
  g.w.armies.monthsOut[slot] = 7;
  s.regimentSlot = slot;
});
Then("none of its men go home on their own", (s) => {
  const g = levyGame(s);
  expect(g.w.armies.alive[s.regimentSlot]).toBe(1);
  expect(menByArm(g.w, s.regimentSlot)[ARMS.indexOf("pikes")]).toBeCloseTo(1000, 0);
});

Given('the province "Troyes" has 3000 garrison troops', (s) => {
  const g = levyGame(s);
  spawnArmy(g.w, g.n, troyes(s), 3000, -1, 0, { kind: KIND.levy });
});
Given('the commander "La Hire" stands in "Troyes"', (s) => {
  LA_HIRE(s, troyes(s), 1000);
  s.menBefore = levyGame(s).w.armies.men[s.laHire.army];
});
When('"La Hire" picks up 2000 of them', (s) => {
  const g = levyGame(s);
  s.dayBefore = g.w.day;
  expect(order(g, { type: "pickUp", army: s.laHire.army, men: 2000 })).toBeUndefined();
});
Then("at once his army has 2000 more men", (s) => {
  const g = levyGame(s);
  expect(g.w.day).toBe(s.dayBefore);
  expect(g.w.armies.men[s.laHire.army]! - s.menBefore).toBeCloseTo(2000, 0);
});
Then('1000 garrison troops stay in "Troyes"', (s) => {
  expect(garrisonMen(levyGame(s), troyes(s))).toBeCloseTo(1000, 0);
});

Given('the commander "La Hire" stands with his army in a province of France with no castle', (s) => {
  const g = levyGame(s);
  const capital = g.w.provinceIndex.get(g.w.rules.nations[g.n]!.capital)!;
  let p = -1;
  for (let q = 0; q < g.w.provinceCount && p < 0; q++) if (q !== capital && g.w.provinceOwner[q] === g.n && !g.w.provinceWater[q]) p = q;
  // No castle and no drill yard there.
  g.w.provinceWorks[p * WORK_COUNT + workIndex("castle")] = 0;
  g.w.provinceWorks[p * WORK_COUNT + workIndex("drill yard")] = 0;
  s.bare = p;
  LA_HIRE(s, p, 2000);
});
When("the player orders 1000 of his levies trained as pikes", (s) => {
  s.refused = order(levyGame(s), { type: "train", army: s.laHire.army, arm: "pikes", men: 1000 });
});
Then("the order is refused until the army stands at a castle or drill yard of France", (s) => {
  const g = levyGame(s);
  expect(s.refused).toMatch(/castle or drill yard/);
  expect(trainingGround(g.w, g.n, s.bare)).toBe(false);
  // A drill yard there is enough.
  g.w.provinceWorks[s.bare * WORK_COUNT + workIndex("drill yard")] = 1;
  expect(trainingGround(g.w, g.n, s.bare)).toBe(true);
  expect(order(g, { type: "train", army: s.laHire.army, arm: "pikes", men: 1000 })).toBeUndefined();
});

Given('the commander "La Hire" stands with his army in "Troyes"', (s) => {
  LA_HIRE(s, troyes(s), 3000);
});
When("he leaves 1000 men there", (s) => {
  expect(order(levyGame(s), { type: "split", army: s.laHire.army, arm: "levy foot", men: 1000 })).toBeUndefined();
});
Then('they become garrison troops of "Troyes"', (s) => {
  const g = levyGame(s);
  expect(garrisonMen(g, troyes(s))).toBeCloseTo(1000, 0);
  expect(g.w.armies.men[s.laHire.army]).toBeCloseTo(2000, 0);
});

// The AI commissions only for troops it has (RECR-115).

Given(re("an AI country has (\\d+) men without a commander and (\\d) free commanders"), (s, men: string, free: string) => {
  const g = levyGame(s);
  const n = g.w.nationIndex.get("burgundy")!;
  const a = g.w.armies;
  // Burgundy's armies and commanders put aside: only the scenario's men and commanders are left.
  for (let i = 0; i < a.count; i++) if (a.owner[i] === n) a.alive[i] = 0;
  const kept = g.w.commanderOwner.map((o, c) => (o === n ? c : -1)).filter((c) => c >= 0);
  kept.forEach((c, k) => {
    if (k >= num(free)) g.w.commanderOwner[c] = -1;
  });
  g.w.nationTreasury[n] = 1000;
  const p = g.w.provinceIndex.get(g.w.rules.nations[n]!.capital)!;
  s.ai = { n, troops: spawnArmy(g.w, n, p, num(men), -1, 0, { kind: KIND.levy }), commanders: () => g.w.commanderOwner.filter((o) => o === n).length };
  s.ai.before = s.ai.commanders();
});
When("its turn is played", (s) => {
  aiCollect(levyGame(s).w, []);
});
Then(re("it (commissions no official|commissions one official|sends its free commander)"), (s, what: string) => {
  const g = levyGame(s);
  const led = g.w.armies.commander[s.ai.troops]!;
  if (what === "commissions no official") {
    expect(s.ai.commanders()).toBe(s.ai.before);
    expect(led).toBe(-1);
  } else if (what === "commissions one official") {
    expect(s.ai.commanders()).toBe(s.ai.before + 1);
    expect(led).toBeGreaterThanOrEqual(0);
  } else {
    expect(s.ai.commanders()).toBe(s.ai.before);
    expect(led).toBeGreaterThanOrEqual(0);
  }
});

When('the player opens the commander screen of "La Hire"', (s) => {
  const g = levyGame(s);
  const p = troyes(s);
  const { army } = LA_HIRE(s, p, 3000);
  // A second army at Troyes it could merge with, and Troyes's castle to train at.
  const other = g.w.commanderOwner.findIndex((o, c) => o === g.n && c !== s.laHire.commander);
  for (let i = 0; i < g.w.armies.count; i++) if (g.w.armies.commander[i] === other) g.w.armies.alive[i] = 0;
  s.second = spawnArmy(g.w, g.n, p, 1000, other);
  g.w.provinceWorks[p * WORK_COUNT + workIndex("castle")] = Math.max(1, g.w.provinceWorks[p * WORK_COUNT + workIndex("castle")]!);
  s.screen = commanderScreen(g.w, g.n, army);
});
Then("it shows the army's men by arm and kind, drill, break point and his skills", (s) => {
  const v = s.screen as CommanderScreen;
  expect(v.byArm[ARMS.indexOf("levy foot")]).toBeCloseTo(3000, 0);
  expect(v.kind).toBe("levy");
  expect(v.drill).toBeGreaterThanOrEqual(0);
  expect(v.breakPoint).toBeGreaterThan(0);
  expect(v.commander.name).toBe("La Hire");
  for (const k of ["might", "cunning", "logistics"] as const) expect(typeof v.commander[k]).toBe("number");
});
Then("it shows the companies with split, merge and leave-as-garrison", (s) => {
  const v = s.screen as CommanderScreen;
  expect(v.companies.map((c) => c.arm)).toEqual(["levy foot"]);
  expect(v.companies[0]!.actions).toEqual(expect.arrayContaining(["split", "leave as garrison"]));
  expect(v.mergeWith).toEqual([s.second]);
});
Then("it shows the food reserve, the food used a day and a month, and the pay a month", (s) => {
  const v = s.screen as CommanderScreen;
  expect(v.food.reserve).toBeGreaterThan(0);
  expect(v.food.perMonth).toBeGreaterThan(0);
  expect(v.food.perDay).toBeCloseTo(v.food.perMonth / 30, 6);
  // A fresh levy is paid nothing for its first 3 months.
  expect(v.payPerMonth).toBe(0);
});
Then("training is ordered from it", (s) => {
  const g = levyGame(s);
  const v = s.screen as CommanderScreen;
  expect(v.canTrain).toBe(true);
  expect(order(g, { type: "train", army: s.laHire.army, arm: "pikes", men: 1000 })).toBeUndefined();
  expect(commanderScreen(g.w, g.n, s.laHire.army)!.training).toEqual({ arm: "pikes", men: 1000, monthsLeft: 3 });
});

// ---------------------------------------------------------------- commanders in the game (RECR-111, RECR-114)

/** The 1444 game with France playing (levy-game.ts). */
function gameFrance(s: Scenario): { w: World; n: number } {
  return levyGame(s);
}
function royalPostOf(w: World, n: number, type: string): number {
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === n && w.provinceLord[p]! < 0 && OFFICIALS[w.provinceOfficial[p]!] === type) return p;
  throw new Error(`no royal ${type}`);
}
Given('the country "France" raises a new army', (s) => {
  const { w, n } = gameFrance(s);
  const capital = w.provinceIndex.get(w.rules.nations[n]!.capital)!;
  w.nationTreasury[n] = 10_000;
  s.commanders = w.commanderIds.length;
  s.armies = w.armies.count;
  expect(recruit(w, n, capital, 1, [])).toBeNull();
  playDays(levyGame(s), 28);
  s.at = capital;
});
Then("the army has no commander until the player commissions an official or one already serving takes it", (s) => {
  const { w, n } = gameFrance(s);
  // The men stand in the province without a commander: no commander was made for them.
  expect(w.commanderIds.length).toBe(s.commanders);
  expect(commissionOfficial(w, n, royalPostOf(w, n, "Steward"), [])).toBeNull();
  expect(w.commanderIds.length).toBe(s.commanders + 1);
});
Then("no commander is attached to an army by default", (s) => {
  const { w } = gameFrance(s);
  for (let i = s.armies; i < w.armies.count; i++) if (w.armies.alive[i]) expect(w.armies.commander[i]).toBe(-1);
});
Given('the country "France" has 60 gold', (s) => {
  const { w, n } = gameFrance(s);
  w.nationTreasury[n] = 60;
});
When('the player commissions the steward of "Reims"', (s) => {
  const { w, n } = gameFrance(s);
  // Reims stands for any royal province of France with a steward.
  expect(commissionOfficial(w, n, royalPostOf(w, n, "Steward"), [])).toBeNull();
});
Then("France has 10 gold left", (s) => {
  const { w, n } = gameFrance(s);
  expect(w.nationTreasury[n]).toBe(10);
});
