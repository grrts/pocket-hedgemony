import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { Rng } from "@ph/engine";
import * as R from "@ph/engine/domain/rebellions";
import * as P from "@ph/engine/domain/province";

const { Given, When, Then } = steps("rebellions");

// ---------------------------------------------------------------- helpers

/** Unrest of a province, made on first use. */
function unrest(s: Scenario, name: string): R.Unrest {
  s.u ??= {};
  return (s.u[name] ??= { grievances: 0 });
}
/** Grievance names held by a province. */
function gs(s: Scenario, name: string): string[] {
  s.g ??= {};
  return (s.g[name] ??= []);
}
function rising(s: Scenario): R.Rising {
  expect(s.r, "a rising").toBeDefined();
  return s.r;
}
function hold(s: Scenario, cause: R.Cause, province: string, init: Partial<R.Rising> = {}): R.Rising {
  s.r = R.newRising("r1", cause, province, { army: true, cardShown: true, ...init });
  return s.r;
}
function pool(s: Scenario): R.Pool {
  return (s.pool ??= { classes: {}, recruits: 0 });
}
function hook(s: Scenario, fn: () => void): void {
  (s.hooks ??= []).push(fn);
}
/** A When step ran: dual Given/Then steps assert from here on. */
function act(s: Scenario): void {
  s.acted = true;
}
/** Sources that give exactly this arms step: the first way listed in the config. */
function sourcesFor(arms: R.Arms): R.ArmsSource[] {
  if (arms === "Tools") return [];
  const ways = (R.rebellionsConfig.arms.sources as Record<string, string[][]>)[arms]!;
  return [...ways[0]!] as R.ArmsSource[];
}
const STEP_COUNTS: Record<string, number> = {
  grumbling: R.rebellionsConfig.steps.grumbling,
  riots: R.rebellionsConfig.steps.riots,
  plotting: R.rebellionsConfig.steps.plotting,
};

When("the month is processed", (s) => {
  for (const fn of s.hooks ?? []) fn();
  act(s);
});

// ---------------------------------------------------------------- from grievances to a rising

Given("the province {string} has {int} grievances", (s, name: string, n: number) => {
  unrest(s, name).grievances = n;
});
Given("the province {string} has {int} grievance", (s, name: string, n: number) => {
  unrest(s, name).grievances = n;
  (s.ci ??= { grievances: 0 }).grievances = n;
});
Given("the province {string} has {int} other grievances", (s, name: string, n: number) => {
  unrest(s, name).grievances = n;
});
Given("no judge runs the province {string}", (s, name: string) => {
  unrest(s, name).judge = false;
});
Given("a judge runs the province {string}", (s, name: string) => {
  unrest(s, name).judge = true;
});
Given("the province {string} is at the step {string}", (s, name: string, step: string) => {
  if (s.acted) return expect(R.stepOf(unrest(s, name))).toBe(step);
  if (step === "rising") {
    unrest(s, name).grievances = STEP_COUNTS["plotting"]!;
    s.risen = true;
  } else unrest(s, name).grievances = STEP_COUNTS[step] ?? 0;
});
Then("the province {string} has the effects {string}", (s, name: string, effects: string) => {
  const want = effects === "none" ? [] : effects.split("; ");
  const step = R.stepOf(unrest(s, name));
  expect(R.stepEffects(step)).toEqual(want);
  if (want.includes("tax halved")) expect(R.stepTaxFactor(step)).toBe(0.5);
});
Then("the province {string} rolls to rise with a chance of {int} percent", (s, name: string, pct: number) => {
  expect(R.risingChance(unrest(s, name))).toBe(pct);
});
Then("the card of the province {string} shows the chance and a named plotter", (s, name: string) => {
  const card = R.plottingCard(name, unrest(s, name), new Rng(7));
  expect(card.chance).toBeGreaterThan(0);
  expect(card.plotter).toMatch(new RegExp(`^the (dyer|miller|village elder) of ${name}$`));
});
Given("no spark happens in the province {string} this month", (s, name: string) => {
  unrest(s, name);
});
Then("no rising starts in the province {string}", (s, name: string) => {
  for (let seed = 1; seed <= 200; seed++) expect(R.rollRising(unrest(s, name), new Rng(seed))).toBe(false);
});
When("the monthly roll for the province {string} succeeds", (s, name: string) => {
  const u = unrest(s, name);
  let seed = 1;
  while (!R.rollRising(u, new Rng(seed))) seed++;
  s.r = R.startRising("r1", "Town", name);
  const p = pool(s);
  p.classes = { homeless: 1000, craftsmen: 1000, farmers: 1000 };
  s.joined = R.muster(s.r, p);
  s.rolled = true;
  act(s);
});
/** Dual: a When that starts a rising, or a Then after the monthly roll. */
Given("a rising starts in the province {string}", (s, name: string) => {
  if (s.rolled) return expect(rising(s).provinces).toContain(name);
  const cause: R.Cause = s.ci ? (R.causeOf(s.ci) ?? "Town") : "Town";
  s.r = R.startRising("r1", cause, name);
  s.r.army = true;
  s.r.holdsCapital = s.capital === name;
  s.r.nearCapital = s.nearCapitalProvince === name;
  act(s);
});
Then("rebels muster in the province {string}", (s, name: string) => {
  expect(rising(s).provinces).toContain(name);
  expect(R.totalMen(rising(s))).toBeGreaterThan(0);
});
Then("the rebellion card appears", (s) => {
  expect(rising(s).cardShown).toBe(true);
});
When("the player looks at the map", (s) => {
  act(s);
});
Then("the province {string} shows the step {string}", (s, name: string, step: string) => {
  expect(R.mapStep(unrest(s, name), !!s.risen)).toBe(step);
});
Given("the province {string} has {int} percent homeless", (s, name: string, pct: number) => {
  unrest(s, name).homelessShare = pct / 100;
});
Given("no almshouse shelters the homeless of {string}", (s, name: string) => {
  unrest(s, name).almshouse = false;
});
Given("an almshouse shelters the homeless of {string}", (s, name: string) => {
  unrest(s, name).almshouse = true;
});
Then("the province {string} counts {int} grievances", (s, name: string, n: number) => {
  expect(R.effectiveCount(unrest(s, name))).toBe(n);
});

// ---------------------------------------------------------------- sparks

When("{string} happens in the province {string}", (s, spark: string, name: string) => {
  expect(R.sparkKind(spark), spark).not.toBeNull();
  s.started = R.sparkStartsRising(unrest(s, name), spark, gs(s, name).includes("Hungry"));
  if (s.started) s.r = R.startRising("r1", "Tax", name, spark);
  act(s);
});
Then("a rising starts in the province {string} at once", (s, name: string) => {
  expect(s.started).toBe(true);
  expect(rising(s).provinces).toContain(name);
});
Then("a rising starts at once in the province {string}", (s, name: string) => {
  if (s.revRisings) return expect((s.revRisings as R.Rising[]).some((r) => r.provinces.includes(name))).toBe(true);
  expect(s.started).toBe(true);
  expect(rising(s).provinces).toContain(name);
});
Then("a rising does not start in the province {string}", (s, name: string) => {
  if (s.revRisings) return expect((s.revRisings as R.Rising[]).some((r) => r.provinces.includes(name))).toBe(false);
  expect(s.started).toBe(false);
});
Then("the rebellion card shows {string} as the reason the rising began", (s, spark: string) => {
  expect(rising(s).reason).toBe(spark);
  expect(rising(s).cardShown).toBe(true);
});
/** Dual: sets a grievance before a When, asserts it after. */
Given("the province {string} has the grievance {string}", (s, name: string, g: string) => {
  if (s.acted) return expect(gs(s, name)).toContain(g);
  gs(s, name).push(g);
});
Given("the province {string} does not have the grievance {string}", (s, name: string, g: string) => {
  s.g ??= {};
  s.g[name] = gs(s, name).filter((x: string) => x !== g);
});
Then("the province {string} no longer has the grievance {string}", (s, name: string, g: string) => {
  expect(gs(s, name)).not.toContain(g);
});

// ---------------------------------------------------------------- cause, demand and leader

Given("the province {string} has the heaviest grievance {string}", (s, name: string, g: string) => {
  s.ci = { heaviest: g, grievances: 1 };
  gs(s, name).push(g);
});
Then("the rising has the cause {string}", (s, cause: string) => {
  expect(rising(s).cause).toBe(cause);
});
Then("the rising demands {string}", (s, demand: string) => {
  expect(rising(s).demand).toBe(demand);
});
Then("most joiners are {string}", (s, joiners: string) => {
  expect(R.joinersOf(rising(s).cause)).toBe(joiners);
});
Given("a pretender has a right to the province {string}", (s) => {
  (s.ci ??= { grievances: 0 }).pretenderRight = true;
});
Given("the province {string} is a colony of the country {string}", (s, name: string, c: string) => {
  s.colony = { name, owner: c };
});
Given("local people work tiles in the province {string}", (s, name: string) => {
  s.localTiles = name;
});
When("settlers of {string} take a tile of the local people in {string}", (s, _c: string, name: string) => {
  s.r = R.startResistance("res1", name, R.localLeader(name, new Rng(3)));
  act(s);
});
Then("a resistance of the local people starts in the province {string}", (s, name: string) => {
  expect(rising(s).resistance).toBe(true);
  expect(rising(s).provinces).toContain(name);
});
Then("the resistance has its own named leader", (s) => {
  expect(rising(s).leader?.name).toBeTruthy();
});
Then("the resistance demands its tiles back", (s) => {
  expect(rising(s).demand).toBe("their tiles back");
});
Then("the resistance can win", (s) => {
  const r = rising(s);
  expect(R.canWin(r)).toBe(true);
  for (let m = 0; m < R.rebellionsConfig.win_hold_months; m++) R.advanceMonth(r);
  expect(r.ended).toBe("won");
});
Given("the province {string} has returned soldiers among its homeless", (s) => {
  s.veterans = true;
});
Then("the leader may be a veteran who brings Might", (s) => {
  expect(R.possibleLeaders(rising(s).cause, !!s.veterans)).toContain("veteran");
  expect(R.leaderBrings("veteran")).toBe("Might");
});
Given("a faith rising led by a preacher holds the province {string}", (s, name: string) => {
  hold(s, "Faith", name, { leader: { name: "Jan the Preacher", kind: "preacher" } });
});
Then("the rising's faith spreads to the neighbours of {string} twice as fast as without the preacher", (s) => {
  const r = rising(s);
  expect(R.faithSpreadFactor(r) / R.faithSpreadFactor({ ...r, leader: null })).toBe(2);
});

// ---------------------------------------------------------------- strength

Given("a rising in the province {string} has {int} men", (s, name: string, n: number) => {
  hold(s, "Tax", name, { men: { farmers: n } });
});
/** Dual: sets the arms before a When, asserts them after. */
Given("the rising carries {string}", (s, arms: R.Arms) => {
  if (s.acted) return expect(R.armsOf(rising(s))).toBe(arms);
  rising(s).sources = sourcesFor(arms);
});
When("its strength is computed", (s) => {
  s.lf = 1.2;
  s.gf = R.rebelGroundFactor("hills");
  s.strength = R.strength(R.totalMen(rising(s)), R.armsOf(rising(s)), s.lf, s.gf);
  act(s);
});
Then(/^its strength is (\d+) men times ([\d.]+) times its leader factor times its ground factor$/, (s, men: string, mult: string) => {
  expect(R.armsMultiplier(R.armsOf(rising(s)))).toBe(Number(mult));
  expect(s.strength).toBeCloseTo(Number(men) * Number(mult) * s.lf * s.gf, 6);
});
Then("in battle the rebels fight as the kind {string} under the warfare battle rules", (_s, kind: string) => {
  expect(R.REBEL_BAND).toBe(kind);
});
Given("a rising with the cause {string} is growing in the province {string}", (s, cause: R.Cause, name: string) => {
  hold(s, cause, name);
  hook(s, () => {
    s.before = { ...pool(s).classes };
    s.joined = R.muster(rising(s), pool(s));
  });
});
Given("the province {string} has {int} men of the class {string}", (s, _n: string, n: number, cls: string) => {
  pool(s).classes[cls] = n;
});
Then("{int} men of the class {string} join the rising", (s, n: number, cls: string) => {
  expect(s.joined[cls] ?? 0).toBe(n);
  expect(rising(s).men[cls] ?? 0).toBe(n);
});
Then("their job slots go empty", (s) => {
  for (const [cls, before] of Object.entries(s.before as Record<string, number>)) {
    expect(pool(s).classes[cls]).toBe(before - (s.joined[cls] ?? 0));
  }
});
Given("{int} men of another class in {string} share the rebels' faith", (s, n: number) => {
  pool(s).classes["craftsmen"] = n;
  pool(s).sharing = ["craftsmen"];
});
Then("{int} of them join the rising", (s, n: number) => {
  expect(s.joined["craftsmen"] ?? 0).toBe(n);
});
Then(/^clergy and scholars (may join|never join) the rising$/, (s, how: string) => {
  const cause = rising(s).cause;
  for (const cls of ["clergy", "scholars"]) {
    const share = R.joinShare(cause, cls, true);
    if (how === "may join") expect(share).toBeGreaterThan(0);
    else expect(share).toBe(0);
  }
});
Given("the lord {string} has a retinue of {int} men", (s, name: string, n: number) => {
  (s.lords ??= {})[name] = { name, loyalty: "Wavering", retinue: n, sharesFaithOrTongue: false } satisfies R.JoiningLord;
});
When("{string} joins a rising", (s, name: string) => {
  s.r ??= R.newRising("r1", "Lord", "Dijon");
  s.joinedN = R.lordJoins(s.r, s.lords[name]);
  act(s);
});
Then("all {int} men of his retinue join the rising at once", (s, n: number) => {
  expect(s.joinedN).toBe(n);
  expect(rising(s).men["retinue"]).toBe(n);
});
When("the tax rate of the province {string} drops so that {string} ends", (s, name: string, g: string) => {
  s.g ??= {};
  s.g[name] = gs(s, name).filter((x: string) => x !== g);
  R.updateGrowth(rising(s), gs(s, name));
  act(s);
});
Then("the rising stops growing", (s) => {
  expect(rising(s).growing).toBe(false);
  const p: R.Pool = { classes: { homeless: 1000 }, recruits: 0 };
  expect(R.muster(rising(s), p)).toEqual({});
});
Given("the province {string} has {int} recruits", (s, _n: string, n: number) => {
  pool(s).recruits = n;
});
When("{int} men of {string} join a rising", (s, n: number) => {
  s.recruitsBefore = pool(s).recruits;
  R.takeFromRecruits(pool(s), n);
  s.joinedN = n;
  act(s);
});
Then("the men who joined are not counted as recruits for the owner", (s) => {
  expect(pool(s).recruits).toBe(s.recruitsBefore - s.joinedN);
});
const SOURCES: Record<string, R.ArmsSource[]> = {
  none: [],
  "a forge in the province": ["forge"],
  "a forge and a market": ["forge", "market"],
  "a captured castle's store": ["captured castle store"],
  "foreign gold": ["foreign gold"],
  "a lord's retinue": ["lord's retinue"],
  deserters: ["deserters"],
  "a rival's troops": ["rival's troops"],
  "a pretender's army": ["pretender's army"],
};
Given("a rising in the province {string} has the sources {string}", (s, name: string, src: string) => {
  expect(SOURCES[src], src).toBeDefined();
  hold(s, "Tax", name, { sources: [...SOURCES[src]!] });
});
When("its arms are set", (s) => {
  s.arms = R.armsOf(rising(s));
  act(s);
});
Then("the rising carries {string} with a multiplier of {float}", (s, arms: string, mult: number) => {
  expect(s.arms).toBe(arms);
  expect(R.armsMultiplier(s.arms)).toBe(mult);
});
Given("a hunger rising holds a farm province with no forge, market or castle", (s) => {
  hold(s, "Hunger", "Champagne", { sources: [] });
});
Given("nobody pays or arms the rebels", (s) => {
  expect(rising(s).backer).toBeNull();
});
Given("a rising carrying {string} is led by a veteran", (s, arms: R.Arms) => {
  hold(s, "Town", "Troyes", { sources: sourcesFor(arms), leader: { name: "old Pierre", kind: "veteran" } });
});
When("the rebels fight a battle", (s) => {
  s.battleArms = R.battleArms(rising(s));
  act(s);
});
Then("they fight as if carrying {string}", (s, arms: string) => {
  expect(s.battleArms).toBe(arms);
});
Given("a rising holds the province {string} with the ground {string}", (s, name: string, ground: string) => {
  hold(s, "Tax", name);
  s.ground = ground;
});
When("the rebels fight in their province", (s) => {
  act(s);
});
Then(/^the rebels get (the|no) "([^"]+)" bonus$/, (s, has: string, bonus: string) => {
  expect(R.LOCALS_BONUS).toBe(bonus);
  expect(R.rebelsGetLocalsBonus(s.ground)).toBe(has === "the");
  if (has === "the") expect(R.rebelGroundFactor(s.ground)).toBeGreaterThan(1);
  else expect(R.rebelGroundFactor(s.ground)).toBe(1);
});
Given("a rising holds the castle of the province {string}", (s, name: string) => {
  hold(s, "Tax", name, { holdsCastle: true });
});
When("an army attacks the rebels in {string}", (s) => {
  act(s);
});
Then("the rebels fight from the castle's walls", (s) => {
  expect(R.fightsFromWalls(rising(s))).toBe(true);
});
Given("a rising of {int} men holds the province {string}", (s, n: number, name: string) => {
  hold(s, "Hunger", name, { men: { farmers: n } });
});
Given("the local store of {string} is empty", (s) => {
  s.store = { months: 0, forageTiles: 10, tilesBurnedByForage: 1 };
});
Given("no tiles are left to forage in {string}", (s) => {
  s.store.forageTiles = 0;
  hook(s, () => {
    s.fed = R.feed(rising(s), s.store);
  });
});
Then("the rising loses {int} men to hunger and desertion", (s, n: number) => {
  expect(s.fed.from).toBe("none");
  expect(s.fed.lost).toBe(n);
});
Given("a rising holds the province {string}", (s, name: string) => {
  hold(s, "Tax", name);
});
When("the rebels forage", (s) => {
  s.fed = R.feed(rising(s), s.store);
  act(s);
});
Then("tiles of {string} are burned", (s) => {
  expect(s.fed.from).toBe("forage");
  expect(s.fed.tilesBurned).toBeGreaterThan(0);
});
Then("the province {string} gets the grievance {string}", (s, _n: string, g: string) => {
  expect(g).toBe("Burned homes");
  expect(s.fed.burnedHomes).toBe(true);
});

// ---------------------------------------------------------------- severity and spread

Given("a rising holds {int} provinces", (s, n: number) => {
  hold(s, "Tax", "P1", { provinces: Array.from({ length: n }, (_, i) => `P${i + 1}`), army: false });
});
Given(/^the rising (holds|does not hold) the capital's province$/, (s, h: string) => {
  rising(s).holdsCapital = h === "holds";
});
Given(/^the rising (holds|does not hold) a whole lord's land$/, (s, h: string) => {
  rising(s).holdsWholeLordLand = h === "holds";
});
Given(/^the rising (has|has no) a rebel army$/, (s, h: string) => {
  rising(s).army = h === "has";
});
When("its severity is set", (s) => {
  act(s);
});
Then("its severity tier is {string}", (s, tier: string) => {
  expect(R.severity(rising(s))).toBe(tier);
});
Given("the capital of the country {string} is the province {string}", (s, _c: string, name: string) => {
  s.capital = name;
});
Given("a rising holds the province {string} with a rebel army", (s, name: string) => {
  hold(s, "Tax", name, { army: true });
  hook(s, () => {
    s.effects = R.tierEffects(R.severity(rising(s)));
  });
});
Then("no tax, recruits, food or trade reach the owner from {string}", (s, name: string) => {
  expect(rising(s).provinces).toContain(name);
  expect(s.effects.ownerGets).toBe(0);
});
Then("the official of {string} has fled", (s) => {
  expect(s.effects.officialFlees).toBe(true);
});
Given("a faith rising holds {int} provinces of the country {string}", (s, n: number) => {
  hold(s, "Faith", "P1", { provinces: Array.from({ length: n }, (_, i) => `P${i + 1}`) });
  hook(s, () => {
    s.effects = R.tierEffects(R.severity(rising(s)));
  });
});
Given("the lord {string} holds a neighbouring province and shares the rebels' faith", (s, name: string) => {
  hook(s, () => {
    if (s.effects.neighbourLordsOfFaithOrTongueWaver) (s.wavered ??= []).push(name);
  });
});
Then("the lord {string} wavers", (s, name: string) => {
  const wavered: string[] = s.wavered ?? s.treated?.lordsWaver ?? [];
  expect(wavered).toContain(name);
});
Then("the rebels besiege castles in the provinces they hold", (s) => {
  expect(s.effects.besiegeCastles).toBe(true);
});
Given("a rising of the country {string} is a {string}", (s, _c: string, tier: string) => {
  hold(s, "Tax", "P1", { provinces: Array.from({ length: R.rebellionsConfig.severity.rebellion_max + 1 }, (_, i) => `P${i + 1}`) });
  expect(R.severity(rising(s))).toBe(tier);
  hook(s, () => {
    s.effects = R.tierEffects(R.severity(rising(s)));
  });
});
Then("every lord of {string} picks a side by his loyalty", (s) => {
  expect(s.effects.civilWar).toBe(true);
  expect(s.effects.lordsPickSides).toBe(true);
});
Then("the allies of {string} may stay out", (s) => {
  expect(s.effects.alliesMayStayOut).toBe(true);
});
Then("rival AIs may attack {string}", (s) => {
  expect(s.effects.rivalsMayAttack).toBe(true);
});
Given("a tax rising holds the province {string}", (s, name: string) => {
  hold(s, "Tax", name, { men: { farmers: 600, craftsmen: 300, "market folk": 100 } });
  gs(s, name).push("Heavy taxes");
});
const CONDITIONS: [RegExp, string][] = [
  [/^has the same grievance$/, "same grievance"],
  [/^shares the rebels' faith$/, "shares faith or tongue"],
  [/^is joined to "[^"]+" by a road, a river and traders$/, "roads, rivers and traders"],
  [/^has many homeless$/, "many homeless"],
  [/^is owned by a country whose army is away at war$/, "owner's army away at war"],
  [/^is owned by a country that answered the last rising with a massacre$/, "owner massacred last rising"],
  [/^lies where a rival is paying the rebels$/, "rival pays the rebels"],
  [/^has no shared grievance$/, "no shared grievance"],
  [/^is behind a garrisoned castle on the road from "[^"]+"$/, "garrisoned castle on the road"],
  [/^is run by a judge$/, "judge"],
  [/^is owned by a country whose army is in the region$/, "owner's army in the region"],
  [/^is owned by a country that pardoned the last rising$/, "owner pardoned last rising"],
  [/^has an almshouse$/, "almshouse"],
];
Given(/^the neighbouring province "([^"]+)" (?!has the grievance ")(.+)$/, (s, _n: string, cond: string) => {
  const hit = CONDITIONS.find(([re]) => re.test(cond));
  expect(hit, cond).toBeDefined();
  (s.conds ??= []).push(hit![1]);
});
Given("a garrisoned castle stands on the main road from {string} to {string}", (s) => {
  (s.conds ??= []).push("garrisoned castle on the road");
  s.garrison = true;
});
When("the spread roll for {string} is made", (s) => {
  s.lean = R.spreadLean(s.conds ?? []);
  act(s);
});
Then(/^the chance to spread to "([^"]+)" is (higher|lower)$/, (s, _n: string, dir: string) => {
  if (dir === "higher") expect(s.lean).toBeGreaterThan(0);
  else expect(s.lean).toBeLessThan(0);
});
Then("the rebels must besiege the castle to pass", (s) => {
  expect(R.mustBesiegeToPass(!!s.garrison)).toBe(true);
});
function neighbourInRevolt(s: Scenario): void {
  for (const [name, list] of Object.entries(s.g as Record<string, string[]>)) {
    if (rising(s).provinces.includes(name)) continue;
    const others = list.filter((g) => g !== "Neighbour in revolt");
    const on = R.neighbourInRevolt(rising(s), others);
    s.g[name] = on ? [...others, "Neighbour in revolt"] : others;
  }
}
Given("the neighbouring province {string} has the grievance {string}", (s, name: string, g: string) => {
  gs(s, name).push(g);
  hook(s, () => neighbourInRevolt(s));
});
When("the rising in {string} is beaten", (s) => {
  R.scatter(rising(s));
  neighbourInRevolt(s);
  act(s);
});
Given("a faith rising holds the province {string}", (s, name: string) => {
  hold(s, "Faith", name);
});
Given("the lord {string} is {string} and shares the rebels' faith", (s, name: string, loyalty: P.Loyalty) => {
  (s.lords ??= {})[name] = { name, loyalty, retinue: 1500, sharesFaithOrTongue: true } satisfies R.JoiningLord;
});
When("{string} joins the rising with his retinue", (s, name: string) => {
  s.joinedN = R.lordJoins(rising(s), s.lords[name]);
  act(s);
});
Then("the rising becomes a lord's revolt", (s) => {
  expect(rising(s).lordsRevolt).toBe(true);
});
Given("a rising holds the province {string} for a season", (s, name: string) => {
  hold(s, "Tax", name, { monthsHeld: P.provinceConfig.months_per_season });
});
Given("the province {string} has a market and a loom house", (s) => {
  s.town = ["loom house", "market"];
});
When("the season ends", (s) => {
  expect(R.lootsThisMonth(rising(s).monthsHeld)).toBe(true);
  s.held = R.holdSeason(s.town);
  act(s);
});
Then("the rebels loot the market first", (s) => {
  expect(s.held.looted).toBe("market");
  expect(s.town).toEqual(["loom house"]);
});
Then("the officials of {string} are killed or driven out", (s) => {
  expect(s.held.officialsGone).toBe(true);
});
Then("the scholars of {string} flee", (s) => {
  expect(s.held.scholarsFlee).toBe(true);
});
Given("a tax rising has held the province {string} for {int} months", (s, name: string, n: number) => {
  hold(s, "Tax", name, { monthsHeld: n });
  pool(s).classes = { farmers: 1000, craftsmen: 1000, homeless: 500 };
});
Given(/^"([^"]+)" still holds in "([^"]+)"$/, (s, g: string, name: string) => {
  gs(s, name).push(g);
  hook(s, () => {
    R.updateGrowth(rising(s), gs(s, name));
    s.joined = R.muster(rising(s), pool(s));
  });
});
Then("more men join the rising", (s) => {
  expect(Object.values(s.joined as Record<string, number>).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- answering

Given("its leader is {string}", (s, name: string) => {
  rising(s).leader = { name, kind: "local" };
});
Given("it demands {string}", (s, demand: string) => {
  expect(rising(s).demand.startsWith(demand)).toBe(true);
});
Given("the province {string} also has the grievance {string}", (s, name: string, g: string) => {
  gs(s, name).push(g);
});
When("the owner grants the demand", (s) => {
  const r = rising(s);
  const home = r.provinces[0]!;
  s.menBefore = R.totalMen(r);
  s.prov = P.newProvince(home, "farmland", { taxRate: "heavy" });
  if (r.cause === "Tax") P.forceTaxDown(s.prov);
  const others = Object.entries(s.g as Record<string, string[]>)
    .filter(([n]) => n !== home)
    .map(([name, grievances]) => ({ name, grievances }));
  s.granted = R.grantDemand(r, others);
  s.g[home] = gs(s, home).filter((g: string) => !s.granted.removed.includes(g));
  act(s);
});
Then("the tax rate of {string} is lowered", (s) => {
  const rates = P.provinceConfig.tax.rates;
  expect(rates.indexOf(P.taxRateOf(s.prov, "normal"))).toBeLessThan(rates.indexOf("heavy"));
});
Then("the rising ends at once", (s) => {
  expect(rising(s).ended).toBe("granted");
});
Then("the rebels go back to their classes", (s) => {
  const back = Object.values(s.granted.back as Record<string, number>).reduce((a, b) => a + b, 0);
  expect(back).toBe(s.menBefore);
  expect(R.totalMen(rising(s))).toBe(0);
});
Then("the province {string} becomes more likely to rise and ask for the same", (s, name: string) => {
  expect(s.granted.emboldened).toContain(name);
});
Given("a rising with the cause {string} holds the province {string}", (s, cause: R.Cause, name: string) => {
  hold(s, cause, name, { men: { farmers: 1000 } });
});
When("the owner talks with the rebels using an envoy and some gold", (s) => {
  s.talk = R.talk(rising(s).cause);
  act(s);
});
Then("the talks offer half the demand", (s) => {
  expect(s.talk.share).toBe(0.5);
});
Then(/^the talks (usually|rarely) work$/, (s, how: string) => {
  expect(s.talk.works).toBe(how);
});
When("the owner bribes {string} with gold", (s) => {
  s.bribe = R.bribeLeader(rising(s));
  act(s);
});
Then("{string} leaves the rising", (s, name: string) => {
  expect(s.bribe.left).toBe(name);
});
Then("the rising loses the leader's bonus", (s) => {
  expect(R.hasLeaderBonus(rising(s))).toBe(false);
});
Then("the rising may split or melt away", (s) => {
  expect(s.bribe.mayMeltOrSplit).toBe(true);
});
When("the owner bribes the preacher", (s) => {
  s.bribe = R.bribeLeader(rising(s), "a new preacher of Prague");
  act(s);
});
Then("the faith rising finds a new preacher quickly", (s) => {
  expect(s.bribe.newLeader?.kind).toBe("preacher");
  expect(rising(s).leader?.kind).toBe("preacher");
});
Then("bribing a lord or a pretender would cost more gold than bribing a local", () => {
  expect(R.bribeCostsMore("the lord himself")).toBe(true);
  expect(R.bribeCostsMore("the pretender")).toBe(true);
  expect(R.bribeCostsMore("local")).toBe(false);
});
Given(/^the rising in "([^"]+)" (has no food and no arms|holds a castle|has a lord|has foreign gold)$/, (s, _n: string, has: string) => {
  const r = rising(s);
  r.sources = [];
  s.hasFood = false;
  if (has === "holds a castle") r.holdsCastle = true;
  if (has === "has a lord") r.lord = "Count of Armagnac";
  if (has === "has foreign gold") r.sources.push("foreign gold");
});
When("the owner waits a month", (s) => {
  s.wait = R.waitMonth(rising(s), s.hasFood);
  act(s);
});
Then("the owner loses the tax and output of {string} for that month", (s) => {
  expect(s.wait.ownerLosesTaxAndOutput).toBe(true);
});
Then(/^the rising (shrinks|does not shrink)$/, (s, how: string) => {
  expect(s.wait.shrinks).toBe(how === "shrinks");
});
Given("the rising in {string} has {int} men", (s, _n: string, n: number) => {
  rising(s).men = { farmers: n };
});
When("the owner's army beats the rebels in battle", (s) => {
  s.scatter = R.scatter(rising(s));
  act(s);
});
Then("{int} rebels die", (s, n: number) => {
  expect(s.scatter.die).toBe(n);
});
Then("{int} rebels flee abroad", (s, n: number) => {
  expect(s.scatter.flee).toBe(n);
});
Then("{int} rebels go home to {string} as homeless", (s, n: number) => {
  expect(s.scatter.homeless).toBe(n);
});
Given("the owner's army has beaten the rising in {string}", (s) => {
  R.scatter(rising(s));
});
const YEAR = 1500;
When("the owner chooses {string}", (s, t: R.Treatment) => {
  s.locks = R.newLocks();
  s.cause = rising(s).cause;
  s.treated = R.treat(rising(s), t, s.locks, YEAR, s.same ?? { provinces: [], lords: [] });
  act(s);
});
Then(/^the survivors return to their classes, "([^"]+)" calms faster and "([^"]+)" may rise again$/, (s) => {
  expect(s.treated.survivorsHome).toBe(true);
  expect(s.treated.calmsFaster).toBe(true);
  expect(s.treated.leaderMayRiseAgain).toBe(true);
});
Then(/^"([^"]+)" is executed and "([^"]+)" gets no new tax rising for (\d+) years$/, (s, _l: string, _p: string, years: string) => {
  const y = Number(years);
  expect(s.treated.leaderExecuted).toBe(true);
  expect(s.cause).toBe("Tax");
  expect(R.mayRise(s.locks, "Tax", YEAR + y - 1)).toBe(false);
  expect(R.mayRise(s.locks, "Tax", YEAR + y)).toBe(true);
  expect(R.mayRise(s.locks, "Hunger", YEAR + 1)).toBe(true);
});
Then(/^"([^"]+)" gets no rising for (\d+) years$/, (s, _p: string, years: string) => {
  const y = Number(years);
  for (const c of ["Tax", "Hunger", "Faith"] as R.Cause[]) {
    expect(R.mayRise(s.locks, c, YEAR + y - 1)).toBe(false);
    expect(R.mayRise(s.locks, c, YEAR + y)).toBe(true);
  }
});
Given("the rebels of {string} are Catholic and speak French", (s) => {
  s.same ??= { provinces: [], lords: [] };
});
Given("the provinces {string} and {string} are Catholic or French-speaking", (s, a: string, b: string) => {
  (s.same ??= { provinces: [], lords: [] }).provinces.push(a, b);
});
Given("the lord {string} is French-speaking", (s, name: string) => {
  (s.same ??= { provinces: [], lords: [] }).lords.push(name);
});
Then("the provinces {string} and {string} get the grievance {string} for {int} years", (s, a: string, b: string, g: string, years: number) => {
  expect(g).toBe("Bloodshed");
  expect(s.treated.bloodshed.provinces).toEqual([a, b]);
  expect(s.treated.bloodshed.years).toBe(years);
});

// ---------------------------------------------------------------- prevention

Given("the province {string} has {int} grievances including {string}", (s, name: string, n: number, g: string) => {
  unrest(s, name).grievances = n;
  gs(s, name).push(g);
});
When(/^the local store of "([^"]+)" stays above (\d+) months for a full season$/, (s, name: string, months: string) => {
  const p = P.newProvince(name, "farmland", {
    storeMonths: Number(months) + 1,
    storeAboveMonths: P.provinceConfig.months_per_season,
    grievances: gs(s, name).map((g: string) => ({ name: g, months: 1 })),
  });
  const now = P.evaluateGrievances(p);
  for (const g of [...gs(s, name)]) {
    if (g === "Hungry" && !now["Hungry"]) {
      s.g[name] = gs(s, name).filter((x: string) => x !== g);
      unrest(s, name).grievances -= 1;
    }
  }
  act(s);
});
Then("the homeless of {string} do not count toward its grievances", (s, name: string) => {
  const u = unrest(s, name);
  expect(R.homelessCount(u)).toBe(0);
  expect(R.homelessCount({ ...u, almshouse: false })).toBeGreaterThan(0);
});
Given("the lord {string} is {string}", (s, name: string, loyalty: P.Loyalty) => {
  const l: R.JoiningLord = { name, loyalty, retinue: 1000, sharesFaithOrTongue: true };
  (s.lords ??= {})[name] = l;
  hook(s, () => {
    s.joinedN = R.lordJoins(rising(s), l);
  });
});
Then("{string} does not join the rising", (s, name: string) => {
  expect(R.lordMayJoin(s.lords[name])).toBe(false);
  expect(s.joinedN).toBe(0);
  expect(rising(s).men["retinue"] ?? 0).toBe(0);
});
Then("his retinue fights for the owner", (s) => {
  const lords = Object.values(s.lords as Record<string, R.JoiningLord>);
  expect(lords.every((l) => !R.lordMayJoin(l))).toBe(true);
});

// ---------------------------------------------------------------- if the rebels win

Given("a rising holds its provinces of the country {string}", (s) => {
  hold(s, "Tax", "Troyes");
  hook(s, () => R.checkWin(rising(s)));
});
Given(/^the rising has held them for (\d+) months with no army defeating it$/, (s, n: string) => {
  rising(s).monthsHeld = Number(n);
});
Given("the rebels take the capital", (s) => {
  rising(s).holdsCapital = true;
});
Given(/^a rising has held its provinces for (\d+) months with no army defeating it$/, (s, n: string) => {
  hold(s, "Tax", "Troyes", { monthsHeld: Number(n) });
  hook(s, () => R.checkWin(rising(s)));
});
Given("the rebels do not hold the capital", (s) => {
  rising(s).holdsCapital = false;
});
/** Dual: a When that wins the rising, or a Then after the month. */
Given("the rising is won", (s) => {
  if (s.acted) return expect(rising(s).ended).toBe("won");
  const r = rising(s);
  r.monthsHeld = R.rebellionsConfig.win_hold_months;
  expect(R.checkWin(r)).toBe(true);
  s.outcome = R.outcome(r, s.tier ?? R.severity(r));
  if (r.cause === "Homeland") s.brokeAway = R.breakAway(s.people, `the homeland of the ${s.people}`, (p) => (p === "Breton" ? "Brittany" : null));
  act(s);
});
Then("the rising is not yet won", (s) => {
  expect(rising(s).ended).toBeNull();
});
const OUT = R.rebellionsConfig.outcomes;
Then(/^the castle's food is handed out, "Hungry" ends and the lord of "([^"]+)" turns disloyal$/, (s) => {
  expect(s.outcome.results).toEqual(OUT.Hunger);
});
Then(/^the tax rate in the rebels' provinces is fixed at (\w+) for (\d+) years$/, (s, rate: string, years: string) => {
  expect(s.outcome.taxFixed).toEqual({ rate, years: Number(years) });
});
Then("every province the rebels held gets a faith tolerance charter", (s) => {
  expect(s.outcome.chartersIn).toEqual(rising(s).provinces);
  expect(s.outcome.results).toEqual(OUT.Faith);
});
Then(/^"([^"]+)" gets a town law charter and the quartered army leaves$/, (s, name: string) => {
  expect(rising(s).provinces).toContain(name);
  expect(s.outcome.results).toEqual(OUT.Town);
});
Then("the government of the owner changes to the rebels' through the event tree's revolution events", (s) => {
  expect(s.outcome.results).toEqual(OUT["New ideas"]);
});
Given("a faith rising of the country {string} is a {string}", (s, _c: string, tier: R.Tier) => {
  hold(s, "Faith", "Paris", { holdsCapital: true });
  expect(R.severity(rising(s))).toBe(tier);
});
Then("{string} gets a ruler of the rebels' faith", (s) => {
  expect(s.outcome.results).toEqual(OUT["Faith great revolt"]);
});
Then(/^one of these happens: (.+)$/, (s, list: string) => {
  expect(s.outcome.oneOf).toBe(true);
  expect(s.outcome.results).toEqual(list.split("; or "));
});
Given("a homeland rising of the people {string} holds the provinces {string}", (s, people: string, provinces: string) => {
  const list = provinces.split(", ");
  hold(s, "Homeland", list[0]!, { provinces: list });
  s.people = people;
});
Then("the provinces {string} break away as a new country", (s, provinces: string) => {
  expect(rising(s).provinces).toEqual(provinces.split(", "));
  expect(s.outcome.results).toEqual(OUT.Homeland);
});
Then("the new country is the catalogue entity for that people, because one fits", (s) => {
  expect(s.brokeAway).toEqual({ country: "Brittany", fromCatalogue: true });
});
Then("the new country is a new country named for the homeland, because none fits", (s) => {
  expect(s.brokeAway.fromCatalogue).toBe(false);
  expect(s.brokeAway.country).toBe(`the homeland of the ${s.people}`);
});

// ---------------------------------------------------------------- other systems

Given("the country {string} has {int} provinces in riots and {int} province held by rebels", (s, _c: string, riots: number, held: number) => {
  s.provinces = [
    ...Array.from({ length: riots }, () => ({ step: "riots" as R.Step, rebels: false })),
    ...Array.from({ length: held }, () => ({ step: "rising" as R.Step, rebels: true })),
    { step: "calm" as R.Step, rebels: false },
    { step: "grumbling" as R.Step, rebels: false },
  ];
});
When("the country card of {string} is shown", (s) => {
  s.inRevolt = R.inRevoltCount(s.provinces);
  act(s);
});
Then(/^"In revolt" shows (\d+)$/, (s, n: string) => {
  expect(s.inRevolt).toBe(Number(n));
});
Given("the lord {string} reaches the loyalty {string}", (s, name: string, loyalty: P.Loyalty) => {
  const l: R.JoiningLord = { name, loyalty, retinue: 2000, sharesFaithOrTongue: true };
  s.lordLands = ["Dijon", "Beaune"];
  hook(s, () => {
    if (l.loyalty === "In revolt") s.r = R.lordsRevolt("r1", l, s.lordLands);
  });
});
Then("a lord's revolt led by {string} holds his lands", (s, name: string) => {
  const r = rising(s);
  expect(r.lordsRevolt).toBe(true);
  expect(r.leader).toEqual({ name, kind: "the lord himself" });
  expect(r.provinces).toEqual(s.lordLands);
  expect(R.severity(r)).toBe("Great revolt");
});
Given(/^an event applies "unrest \+(\d+)" to the province "([^"]+)"$/, (s, _n: string, name: string) => {
  expect(P.eventStatMeaning("unrest")).toContain("grievances");
  s.eventProvince = name;
});
When("the effect is applied", (s) => {
  for (const g of R.unrestGrievances("Harsh lord")) gs(s, s.eventProvince).push(g);
  act(s);
});
Then("the province {string} gets one named grievance from the event", (s, name: string) => {
  expect(gs(s, name)).toEqual(["Harsh lord"]);
});
Given("the country {string} pays the rebels in the province {string} of {string}", (s, by: string, name: string, victim: string) => {
  hold(s, "Tax", name);
  s.act = R.payRebels(rising(s), by, victim);
});
When("an envoy of {string} finds out", (s, c: string) => {
  expect(s.act.against).toBe(c);
  R.envoyFindsOut(s.act);
  act(s);
});
Then("{string} knows {string} paid its rebels as a hostile act", (s, victim: string, by: string) => {
  expect(s.act).toEqual({ by, against: victim, act: "paid rebels", known: true });
  expect(rising(s).sources).toContain("foreign gold");
});
Given("a tax rising holds Troyes town but not the castle", (s) => {
  hold(s, "Tax", "Troyes", { holdsCastle: false });
  s.holds = "Troyes town (not the castle)";
});
Given("its leader is {string} with Cunning {int}", (s, name: string) => {
  rising(s).leader = { name, kind: "local" };
});
Given("craftsmen, homeless and some farmers have joined", (s) => {
  s.joinedClasses = ["craftsmen", "homeless", "farmers"];
});
Given("it has {int} men carrying {string}", (s, n: number, arms: R.Arms) => {
  const [a, b, c] = s.joinedClasses as string[];
  const farmers = Math.floor(n / 10);
  const homeless = Math.floor((n - farmers) / 2);
  rising(s).men = { [a!]: n - farmers - homeless, [b!]: homeless, [c!]: farmers };
  rising(s).sources = sourcesFor(arms);
});
Given("it has food for {int} months", (s, n: number) => {
  rising(s).foodMonths = n;
});
Given("{int} neighbouring provinces share the grievance", (s, n: number) => {
  s.sharing = n;
});
Given("nobody backs it", (s) => {
  rising(s).backer = null;
});
When("the player opens the rebellion card", (s) => {
  s.card = R.rebellionCard(rising(s), { holds: s.holds, neighboursSharing: s.sharing, spreadTo: ["Sens", "Reims"] });
  act(s);
});
function cardValues(s: Scenario): string[] {
  const c = s.card as R.RebellionCard;
  return [c.men, c.arms, c.holds, c.food, c.severity, c.backer, c.spread];
}
Then("the card shows the cause {string} and the demand {string}", (s, cause: string, demand: string) => {
  expect(s.card.cause).toBe(cause);
  expect(s.card.demand).toBe(demand);
});
Then("the card shows {string} and {string}", (s, a: string, b: string) => {
  expect(cardValues(s)).toContain(a);
  expect(cardValues(s)).toContain(b);
});
Then("the card shows {string}", (s, a: string) => {
  expect(cardValues(s)).toContain(a);
});
Then("the card shows {string} and where it may spread next month", (s, a: string) => {
  expect(cardValues(s)).toContain(a);
  expect(s.card.spread).toContain("Sens");
});
Then("the card offers {string}, {string}, {string}, {string} and {string}", (s, ...answers: string[]) => {
  expect(s.card.answers).toEqual(answers.slice(0, 5));
});

// ---------------------------------------------------------------- decided questions (D-REBL-4, 8, 12)

Given(/^the age of revolutions (has begun|has not begun)$/, (s, a: string) => {
  (s.ci ??= { grievances: 0 }).ageOfRevolutions = a === "has begun";
});
Given("the event tree's support for {string} is {float} in the province {string}", (s, ideology: string, v: number) => {
  expect(R.rebellionsConfig.new_ideas.ideologies).toContain(ideology);
  (s.ci ??= { grievances: 0 }).ideologySupport = v;
});
Then("the rising does not have the cause {string}", (s, cause: string) => {
  expect(rising(s).cause).not.toBe(cause);
});
Given("the province {string} borders the capital {string}", (s, near: string, capital: string) => {
  s.capital = capital;
  s.nearCapitalProvince = near;
});
Given("the event {string} fires for the country {string}", (s, ev: string) => {
  s.revEvent = ev;
  s.revProvinces = [];
});
Given("the provinces {string} and {string} of {string} meet the event's conditions", (s, a: string, b: string) => {
  s.revProvinces.push({ name: a, meets: true }, { name: b, meets: true });
});
Given("the province {string} of {string} does not meet the event's conditions", (s, a: string) => {
  s.revProvinces.push({ name: a, meets: false });
});
When("the event raises rebels", (s) => {
  s.revRisings = R.revolutionRisings(s.revEvent, s.revProvinces);
  s.started = s.revRisings.length > 0;
  act(s);
});
Then("each new rising carries the revolution {string}", (s, ev: string) => {
  for (const r of s.revRisings as R.Rising[]) expect(r.revolution).toBe(ev);
});

Given("a rising with the cause {string} starts in the province {string}", (s, cause: string, name: string) => {
  s.r = R.startRising("r1", cause as R.Cause, name);
});
When("its leader is chosen", (s) => {
  s.leader = R.chooseLeader(rising(s).cause, rising(s).provinces[0]!, new Rng(3));
  act(s);
});
Then(/^the leader is a local such as an? (.+)$/, (s) => {
  expect(s.leader.kind).toBe("local");
  expect(R.rebellionsConfig.leaders.local.roles.some((r: string) => s.leader.name.startsWith(`the ${r} of`))).toBe(true);
});
Then(/^the leader is (a preacher|the lord himself|the pretender)$/, (s, who: string) => {
  expect(s.leader.kind).toBe(who === "a preacher" ? "preacher" : who);
});
Then("the leader brings {string}", (s, brings: string) => {
  expect(s.leader.brings).toBe(brings);
});
Then("the leader has Might, Cunning and Logistics like a commander", (s) => {
  for (const k of ["might", "cunning", "logistics"]) expect(typeof s.leader[k]).toBe("number");
});
