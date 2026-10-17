import { expect } from "vitest";
import { steps } from "../src/registry.ts";
import * as M from "@ph/engine/domain/realm";
import * as R from "@ph/engine/domain/research";
import { loadDefaultRuleset } from "@ph/rules";
import { Rng } from "@ph/engine";
import * as G from "@ph/engine";
import diplomacyConfig from "../../rules/data/domain/diplomacy.json" with { type: "json" };
import relations1444 from "../../rules/data/domain/diplomacy-relations-1444.json" with { type: "json" };

const { Given, When, Then } = steps("realm");

const num = (text: string | number): number => Number(String(text).replace(/,/g, ""));
const NUM = "([\\d,]+)";
const re = (src: string): RegExp => new RegExp(`^${src}$`);
const esc = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type S = Record<string, any>;

// ------------------------------------------------------------ counted stats (REALM-001)
// Each feature row names a cause in words; this maps the words to the cause the
// realm config lists for the stat the scenario is about.

const causes: Partial<Record<M.Stat | "warships", Record<string, string>>> = {
  harvest: {
    "the country knows a rotation invention": "inventions",
    "the province is at peace": "peace",
    "the weather roll for its region is bad": "weather",
    "an army marches through": "army_marching",
    "its tiles are burned": "devastation",
    "plague kills its farmers": "plague",
    "a cold period of the event tree's climate stats begins": "cold_period",
  },
  local_store: {
    "the harvest leaves a surplus after collection": "harvest_surplus",
    "a castle delivers food": "castle_delivery",
    "an army refills its food reserve there": "army_refill",
    "the yearly rot takes its share": "rot",
    "raiders strike": "raid",
  },
  herds: {
    "a year on good pasture": "good_pasture",
    "a raid brings animals home": "raiding",
    "a drought strikes": "drought",
    "a hard winter strikes": "hard_winter",
    "disease strikes": "disease",
    "famine forces slaughter": "famine_slaughter",
  },
  fish: {
    "more fishing boats are built": "fishing_boats",
    "the country learns a salting invention": "salting_invention",
    "an enemy fleet blockades the coast": "blockade",
    "war at sea reaches the coast": "war_at_sea",
  },
  castle_store: {
    "collection arrives from nearby provinces": "collection",
    "another castle delivers food": "castle_delivery",
    "the country buys grain for it": "grain_bought",
    "its garrison eats": "garrison",
    "it spreads food to the land around it": "spread",
    "it hands out food to an army refilling at home": "army_refill",
    "rot takes its share": "rot",
    "the castle is captured": "capture",
  },
  granary: {
    "the country builds a bigger granary for gold": "granary_built",
    'the country learns "F7 Ever-normal granaries"': "invention",
    "a siege damages it": "siege_damage",
    "it is neglected": "neglect",
  },
  reach: {
    "a road is built to the next ring": "road",
    "wagons and horses are added": "wagons",
    "an invention improves transport": "research",
    "an enemy army cuts the road": "enemy_on_road",
    "winter comes": "winter",
    "the land is devastated": "devastation",
  },
  people: {
    "its provinces grow fed and at peace": "growth",
    "migrants flee famine abroad into France": "migrants",
    "it conquers a province": "conquest",
    "famine strikes": "famine",
    "plague strikes": "plague",
    "war kills its people": "war_deaths",
    "refugees leave": "refugees",
    "a forced migration event strikes": "forced_migration",
  },
  provinces: {
    "it conquers one": "conquest",
    "it inherits one": "inheritance",
    "it buys one": "purchase",
    "a lord joins it with his one province": "lord_joins",
    "it founds a colony": "colony",
    "it cedes one in a peace": "ceded",
    "a lord defects with his one province": "lord_defects",
    "a revolt breaks one away": "breakaway",
  },
  royal_provinces: {
    "a lord's line holding one province dies out": "line_dies_out",
    "it seizes one province from a lord": "seized_from_lord",
    "it conquers a province and keeps it": "conquest_kept",
    "it grants one province as a fief": "fief_granted",
  },
  faith: {
    "missionaries and clergy work over time": "missionaries_and_clergy",
    "schools of its faith teach": "schools",
    "migrants of its faith arrive": "migrants",
    "a conversion event": "conversion_event",
    "it conquers people of another faith": "conquest",
    "a reformation spreads": "reformation",
    "foreign missionaries arrive": "foreign_missionaries",
  },
  tongue: {
    "provinces held long and well assimilate": "assimilation",
    "settlers move in": "settlers",
    "schools teach in its tongue": "schools",
    "it conquers people of another tongue": "conquest",
    "migrants of another tongue arrive": "migration",
    "a separatist movement spreads": "separatists",
  },
  in_revolt: {
    "it sets heavy taxes": "heavy_taxes",
    "famine strikes": "famine",
    "disloyal lords stir": "disloyal_lords",
    "it loses a war": "lost_war",
    "it defeats the rebels": "rebels_defeated",
    "it gives in to their demands": "demands_given",
    "it lowers taxes": "taxes_lowered",
    "it feeds the hungry provinces": "food",
  },
  soldiers: {
    "it raises recruits for gold": "raised",
    "it hires a paid company": "paid_company",
    "a lord brings his retinue": "retinue",
    "a battle kills men": "battle",
    "disease and hunger strike on campaign": "disease_and_hunger",
    "it leaves pay owed and men desert": "desertion",
    "it disbands a company": "disbanded",
  },
  recruits: {
    "the year's refill comes from its royal provinces": "yearly_refill",
    "students leave school": "students_leave_school",
    "it raises soldiers": "soldiers_raised",
    "it sends young men to school": "sent_to_school",
    "famine strikes": "famine",
    "plague strikes": "plague",
  },
  horses: {
    "its grassland breeds them": "breeding",
    "it buys from steppe traders": "bought",
    "it captures them": "captured",
    "a battle kills them": "battle",
    "fodder runs short": "fodder_shortage",
    "disease strikes them": "disease",
  },
  ships: {
    "it builds in a port": "built",
    "it captures an enemy ship": "captured",
    "a storm sinks some": "storm",
    "they rot without upkeep": "rot",
    "a sea battle sinks some": "battle",
  },
  castles: {
    "it builds one": "built",
    "it conquers one": "conquered",
    "a siege destroys one": "siege",
    "a peace demolishes one": "demolished_in_peace",
  },
  commanders: {
    "it hires one": "hired",
    "its heir takes command": "lord_or_heir_commands",
    "a captain is promoted after a victory": "promoted",
    "one dies in battle": "battle_death",
    "one dies of old age": "old_age",
    "one is captured": "captured",
  },
  heirs: {
    "a child is born": "birth",
    "the ruler names a relative as heir": "named",
    "an heir dies": "death",
    "a daughter marries abroad": "married_abroad",
    "an heir goes over to a rebel lord": "joined_rebel",
  },
  allies: {
    "an envoy's alliance mission succeeds": "alliance_mission",
    "a marriage binds a new ally": "marriage",
    "a peace term makes an ally": "peace_term",
    "it breaks an alliance": "alliance_broken",
    "it goes to war with an ally": "war_between",
    "a rival bribes an ally away": "bribed_away",
  },
};

const allPhrases = [...new Set(Object.values(causes).flatMap((m) => Object.keys(m!)))];

/** Starts tracking one counted stat (or several, for ships). */
function track(s: S, stat: M.Stat, values: Record<string, number>): void {
  s.stat = stat;
  s.values = { ...values };
  s.before = { ...values };
}

When(re(`(${allPhrases.map(esc).join("|")})`), (s, phrase: string) => {
  const stat: M.Stat = s.stat;
  const cause = causes[stat]?.[phrase];
  if (!cause) throw new Error(`no ${stat} cause for "${phrase}"`);
  for (const key of Object.keys(s.values)) {
    if (stat === "harvest") s.values[key] = M.harvestAfter(s.values[key], cause);
    else if (stat === "castle_store" && cause === "capture") s.values[key] = 0;
    else s.values[key] = M.applyCause(s.values[key], stat, cause, s.amount ?? 1);
  }
});

const dirWords: Record<string, 1 | -1> = { more: 1, higher: 1, larger: 1, longer: 1, better: 1, fewer: -1, lower: -1, smaller: -1, shorter: -1, worse: -1 };
function expectDirection(s: S, key: string, word: string): void {
  const dir = dirWords[word];
  if (!dir) throw new Error(`unknown direction ${word}`);
  let before = s.before[key];
  let after = s.values[key];
  if (s.stat === "harvest") {
    const order = M.realmConfig.harvest_steps;
    before = order.indexOf(before);
    after = order.indexOf(after);
  }
  if (dir > 0) expect(after).toBeGreaterThan(before);
  else expect(after).toBeLessThan(before);
}

Then(
  /^its (harvest|local store|herds|fish catch|granary size|reach|people|faith share|tongue share|count in revolt|soldiers|recruits|horses|warships|trade ships) (?:is|are) (\w+)$/,
  (s, what: string, word: string) => {
    expectDirection(s, what === "warships" || what === "trade ships" ? what : "value", word);
  },
);

/** "Given … has N x" and "Then … has M x" share one text: set the first time, compare afterwards. */
function setOrExpect(s: S, stat: M.Stat, n: number): void {
  if (s.stat === stat && s.values) expect(s.values.value).toBe(n);
  else track(s, stat, { value: n });
}

// ------------------------------------------------------------ the country card

const franceCard = (): M.CardInput => ({
  country: "France",
  ruler: { title: "King", name: "Charles VII", age: 41, years: 23, heirs: 2 },
  gold: 310,
  peopleThousands: 9500,
  soldiers: 22000,
  recruits: 48000,
  food: { castles: 9, fed: 41, provinces: 52, hungry: 3 },
  horses: 6000,
  ships: { war: 12, trade: 60 },
  castles: 31,
  officials: 40,
  royalProvinces: 18,
  lords: ["Loyal", "Loyal", "Loyal", "Loyal", "Loyal", "Loyal", "Loyal", "Wavering", "Wavering", "Wavering", "Disloyal"],
  schools: { count: 4, students: 200, scholars: 35, study: "Bastion forts", progressPct: 62 },
  faithPct: 96,
  tonguePct: 71,
  inRevolt: 2,
  allies: 2,
  enemies: 1,
  oathsBroken: 0,
  fallen: 31000,
});

Given(/^the country "([^"]+)" is ruled by (King|Queen) (.+), (\d+), (\d+) years on the throne, with (\d+) heirs$/, (s, country: string, title: string, name: string, age: string, years: string, heirs: string) => {
  s.card = { ...franceCard(), country, ruler: { title, name, age: num(age), years: num(years), heirs: num(heirs) } };
});

Given(re(`the country "([^"]+)" has ${NUM} gold, ([\\d.]+) m people, ${NUM} soldiers and ${NUM} recruits`), (s, _c: string, gold: string, people: string, soldiers: string, recruits: string) => {
  s.card = { ...(s.card ?? franceCard()), gold: num(gold), peopleThousands: Number(people) * 1000, soldiers: num(soldiers), recruits: num(recruits) };
});

When("the player opens the country card of {string}", (s, country: string) => {
  s.card ??= { ...franceCard(), country };
  expect(s.card.country).toBe(country);
  s.lines = M.countryCard(s.card);
  s.text = s.lines.map((l: { text: string }) => l.text);
});

Then("the card shows {string}, {string} and {string}", (s, ...texts: string[]) => {
  for (const t of texts) expect(s.text).toContain(t);
});

Then("it shows food as castles feeding a number of the provinces and how many are hungry", (s) => {
  expect(s.text.some((t: string) => /^Food \d+ castles feeding \d+ of \d+ provinces · \d+ hungry$/.test(t))).toBe(true);
});

Then("it shows horses, ships war and trade, castles, officials for royal provinces, lords by loyalty, schools with students, scholars and the current study", (s) => {
  const pats = [/^Horses [\d,]+$/, /^Ships \d+ war \/ \d+ trade$/, /^Castles \d+$/, /^Officials \d+ for \d+ royal provinces$/, /^Lords \d+ named: \d+ loyal, \d+ wavering, \d+ disloyal$/, /^Schools \d+ \([\d,]+ students, [\d,]+ scholars\) · studying: .+ \d+ %$/];
  for (const p of pats) expect(s.text.some((t: string) => p.test(t))).toBe(true);
});

Then("it shows faith, tongue, in revolt, allies, enemies, oaths broken and Fallen in 10 years", (s) => {
  for (const p of [/^Faith \d+ %$/, /^Tongue \d+ %$/, /^In revolt \d+$/, /^Allies \d+$/, /^Enemies \d+$/, /^Oaths broken \d+$/, /^Fallen \(10 yrs\) [\d,]+$/]) expect(s.text.some((t: string) => p.test(t))).toBe(true);
});

Then("every count opens its list of how it is gained and how it is lost", (s) => {
  for (const line of s.lines as { stat: string }[]) {
    const g = line.stat === "schools" ? { gain: R.researchConfig.school_gained_by, lose: Object.keys(R.researchConfig.school_lost_by) } : M.gainsAndLosses(line.stat as M.Stat);
    expect(g.gain.length).toBeGreaterThan(0);
    expect(g.lose.length).toBeGreaterThan(0);
  }
});

Given(/^the country "([^"]+)" ranks (\d+)\w\w in Economy, (\d+)\w\w in Power and (\d+)\w\w in Technology$/, (s, country: string, e: string, p: string, t: string) => {
  // Four countries' scores that put the country at those ranks.
  const placed = (rank: number) => Object.fromEntries(["A", "B", "C", "D"].map((c, i) => [i + 1 === rank ? country : c, 100 - i * 10]));
  s.expected = { economy: num(e), power: num(p), technology: num(t) };
  s.ranks = { economy: M.ranks(placed(num(e)))[country], power: M.ranks(placed(num(p)))[country], technology: M.ranks(placed(num(t)))[country] };
  s.card = { ...franceCard(), country, ranks: s.ranks };
});

Then("the card shows those three ranks", (s) => {
  expect(s.ranks).toEqual(s.expected);
  for (const t of ["Economy 2nd", "Power 1st", "Technology 4th"]) expect(s.text).toContain(t);
});

// ------------------------------------------------------------ treasury

Given("the country {string} has {int} gold", (s, country: string, gold: number) => {
  s.realm = M.newRealm(country, gold);
  s.gold0 = gold;
});

const goldIn: Record<string, string> = {
  "taxes from royal provinces": "royal_taxes",
  "a share of lords' taxes": "lords_tax_share",
  trade: "trade",
  "tribute from subjects": "tribute",
  "selling grain": "grain_sold",
  "loot and ransoms": "loot_and_ransoms",
  "selling titles": "titles_sold",
};
const goldOut: Record<string, string> = {
  "soldiers' pay": "soldiers_pay",
  "officials' wages": "officials_wages",
  "school upkeep": "school_upkeep",
  building: "building",
  "debt interest": "debt_interest",
  "gifts and bribes": "gifts_and_bribes",
  "buying grain": "grain_bought",
};

When(re(`it gains gold from (${Object.keys(goldIn).map(esc).join("|")})`), (s, source: string) => {
  s.realm.treasury.gold = M.applyCause(s.realm.treasury.gold, "gold", goldIn[source]!, 10);
});
When(re(`it pays for (${Object.keys(goldOut).map(esc).join("|")})`), (s, cost: string) => {
  s.realm.treasury.gold = M.applyCause(s.realm.treasury.gold, "gold", goldOut[cost]!, 10);
});

Then("the country {string} has more than {int} gold", (s, _c: string, n: number) => {
  expect(s.realm.treasury.gold).toBeGreaterThan(n);
});
Then("the country {string} has less than {int} gold", (s, _c: string, n: number) => {
  expect(s.realm.treasury.gold).toBeLessThan(n);
});

Given("the country {string} has no debt", (s, country: string) => {
  s.realm = M.newRealm(country, 100);
  expect(M.debt(s.realm.treasury)).toBe(0);
});

When("the country {string} takes a loan from a bank", (s) => {
  // The amount and the yearly interest are the lender's terms (OQ-REALM-13 gives none).
  M.takeLoan(s.realm.treasury, "a bank", 200, 10);
});

Then("the country {string} owes that bank", (s) => {
  expect(s.realm.treasury.loans.map((l: M.Loan) => l.lender)).toEqual(["a bank"]);
  expect(M.debt(s.realm.treasury)).toBe(200);
});

Then("each year it pays interest on the debt", (s) => {
  const gold = s.realm.treasury.gold;
  const paid = M.payInterest(s.realm.treasury);
  expect(paid).toBeGreaterThan(0);
  expect(s.realm.treasury.gold).toBe(gold - paid);
});

Given(/^the country "([^"]+)" owes (\d+) gold to (?:a bank|the lord "([^"]+)"|the city "([^"]+)")$/, (s, country: string, amount: string, lord?: string, city?: string) => {
  s.realm = M.newRealm(country, 300);
  s.lender = lord ?? city ?? "a bank";
  M.takeLoan(s.realm.treasury, s.lender, num(amount), 10);
  s.realm.treasury.gold = 300;
});

When("it repays {int} gold", (s, n: number) => {
  M.repay(s.realm.treasury, s.lender, n);
});
When("the lender dies", (s) => {
  M.lenderGone(s.realm.treasury, s.lender, "lender_died");
});
When("the lender is conquered", (s) => {
  M.lenderGone(s.realm.treasury, s.lender, "lender_conquered");
});

Then("the country {string} no longer owes that debt", (s) => {
  expect(s.realm.treasury.loans.some((l: M.Loan) => l.lender === s.lender)).toBe(false);
});

When("the country {string} defaults", (s) => {
  s.oaths0 = s.realm.treasury.oaths.length;
  M.defaultOnDebt(s.realm.treasury, s.lender, { year: 1500 });
});

Then("the country {string} owes nothing to {string}", (s, _c: string, lender: string) => {
  expect(s.realm.treasury.loans.filter((l: M.Loan) => l.lender === lender)).toEqual([]);
});

Then("the country {string} has one more oath broken", (s) => {
  expect(s.realm.treasury.oaths.length).toBe(s.oaths0 + 1);
});

Given("the province {string} of {string} is taxed {string}", (s, province: string, _c: string, rate: string) => {
  s.tax = { [province]: rate };
});
When("rebels in {string} force the tax down", (s, province: string) => {
  s.taxBefore = s.tax[province];
  s.tax[province] = M.forceTaxDown(s.tax[province]);
});
Then("the tax rate of {string} is lower", (s, province: string) => {
  const order = M.realmConfig.tax_rates;
  expect(order.indexOf(s.tax[province])).toBeLessThan(order.indexOf(s.taxBefore));
});

// ------------------------------------------------------------ food in provinces and castles

/** A line of provinces with castles spaced along it; distances in provinces. */
function foodLine(count: number, castleCount: number, people = 50): { provinces: M.FoodProvince[]; castles: M.FoodCastle[] } {
  const step = Math.floor(count / castleCount);
  const castles: M.FoodCastle[] = Array.from({ length: castleCount }, (_, i) => ({ id: `c${i}`, province: `p${i * step + 2}`, store: 0, reach: 2 }));
  const provinces: M.FoodProvince[] = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    people,
    harvest: people * 12 * 1.5,
    store: people * 3,
    castleDistance: Object.fromEntries(castles.map((c) => [c.id, Math.abs(i - Number(c.province.slice(1)))])),
  }));
  return { provinces, castles };
}

Given("the country {string} has {int} provinces and {int} castles", (s, _c: string, p: number, c: number) => {
  s.world = foodLine(p, c);
  s.storeBefore = Object.fromEntries(s.world.provinces.map((x: M.FoodProvince) => [x.id, x.store]));
});

When("the year of food runs", (s) => {
  s.report = M.runFoodYear(s.world.provinces, s.world.castles, s.policy ?? M.foodPolicyFromPreset("Feed the people"));
});

Then("each province grows, stores and eats its own food", (s) => {
  const r: M.FoodYearReport = s.report;
  for (const p of s.world.provinces as M.FoodProvince[]) {
    expect(r.eaten[p.id]).toBe(p.people * 12);
    const collected = M.nearestCastleInReach(p, s.world.castles) ? ((p.harvest - p.people * 12) * 25) / 100 : 0;
    expect(p.store).toBeCloseTo(s.storeBefore[p.id] + p.harvest - collected + (r.delivered[p.id] ?? 0) - p.people * 12);
  }
});

Then("the castles collect and spread food to the land around them", (s) => {
  const r: M.FoodYearReport = s.report;
  for (const c of s.world.castles as M.FoodCastle[]) expect(r.collected[c.id]).toBeGreaterThan(0);
  expect(Object.values(r.delivered).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
});

Given("the province {string} is outside the reach of every French castle", (s, province: string) => {
  s.world = foodLine(10, 1);
  const p: M.FoodProvince = { id: province, people: 50, harvest: 300, store: 0, castleDistance: { c0: 9 } };
  s.world.provinces.push(p);
  expect(M.nearestCastleInReach(p, s.world.castles)).toBeNull();
  s.target = p;
});

Then("{string} receives no castle food", (s, province: string) => {
  expect(s.report.delivered[province]).toBeUndefined();
});

Then("it lives or starves on its own harvest", (s) => {
  // 300 harvest for 600 eaten: it has only its own harvest and starves.
  expect(s.report.eaten[s.target.id]).toBe(300);
  expect(s.report.starving).toContain(s.target.id);
});

Given("the province {string} would have a {string} harvest", (s, _p: string, h: string) => {
  track(s, "harvest", { value: h as unknown as number });
});

Given(/^the province "([^"]+)" has (\d+) months? of food in its local store$/, (s, province: string, months: string) => {
  s.province = province;
  s.store = { months: num(months) };
  track(s, "local_store", { value: num(months) });
});
Given("no castle delivers food to it", (s) => {
  s.store.delivered = 0;
});
When("a month passes with its people eating", (s) => {
  s.eat = M.eatMonth(s.store);
});
Then("the local store of {string} is at zero", (s) => {
  expect(s.eat.months).toBe(0);
});
Then("the province {string} starves", (s) => {
  expect(s.eat.starves).toBe(true);
});

Given("the steppe province {string} has {int} thousand head of herds", (s, _p: string, n: number) => {
  track(s, "herds", { value: n });
});

Given("the people of {string} eat from their herds", (s) => {
  s.stores = { castleStore: 6, herds: 40 };
});
When("an enemy army besieges the castle of {string}", (s) => {
  s.siege = M.besiegedStores(s.stores);
});
Then("the herds move with their owners and are not besieged", (s) => {
  expect(s.siege.herdsBesieged).toBe(0);
  expect(s.siege.castleStoreBesieged).toBe(6);
});

Given("the coastal province {string} has a steady fish catch", (s) => {
  track(s, "fish", { value: 10 });
});

Given("the castle of {string} holds {int} months of food", (s, castle: string, months: number) => {
  s.castle = castle;
  s.months = months;
  track(s, "castle_store", { value: months });
});

Then(/^the castle store of "([^"]+)" is (higher|lower|emptied for its owner)$/, (s, _c: string, word: string) => {
  if (word === "emptied for its owner") expect(s.values.value).toBe(0);
  else expectDirection(s, "value", word);
});

Given("the castle of {string} has a granary", (s) => {
  track(s, "granary", { value: 100 });
});

Given("the castle of {string} reaches {int} ring of provinces", (s, _c: string, n: number) => {
  track(s, "reach", { value: n });
});

// ------------------------------------------------------------ food policy

Given("the country {string} has the realm collection set to {int} %", (s, _c: string, pct: number) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  M.setFoodPolicy(s.policy, "collection", pct);
});
When("the country {string} sets the castle of {string} to collect {int} %", (s, _c: string, castle: string, pct: number) => {
  M.overrideCastle(s.policy, castle, "collection", pct);
});
Then("the castle of {string} collects {int} %", (s, castle: string, pct: number) => {
  expect(M.castlePolicy(s.policy, castle).collection).toBe(pct);
});
Then("every other French castle collects {int} %", (s, pct: number) => {
  for (const c of ["Paris", "Troyes", "Rouen"]) expect(M.castlePolicy(s.policy, c).collection).toBe(pct);
});

Given(re(`the province "([^"]+)" has a surplus of ${NUM} people's food for a year`), (s, _p: string, n: string) => {
  s.surplus = num(n);
});
Given("the realm collection is {int} %", (s, pct: number) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  M.setFoodPolicy(s.policy, "collection", pct);
});
When("the collection runs", (s) => {
  if (s.surplus !== undefined) s.collected = M.collect(s.surplus, s.policy.realm.collection);
  else s.goesTo = M.nearestCastleInReach(s.sens, s.castles);
});
Then(re(`${NUM} goes to the nearest castle and the rest stays in the local store`), (s, n: string) => {
  expect(s.collected.sent).toBe(num(n));
  expect(s.collected.kept).toBe(s.surplus - num(n));
});

Given("the country {string} has collected food in {int} castles", (s, _c: string, n: number) => {
  // The first castle is the capital's; the last two stand on the border.
  s.castles = Array.from({ length: n }, (_, i) => ({ id: `c${i}`, people: 100 + i * 50, capital: i === 0, border: i >= n - 2 }));
});
When("the castle shares are set to {string}", (s, rule: M.ShareRule) => {
  s.rule = rule;
  s.custom = Object.fromEntries(s.castles.map((c: { id: string }, i: number) => [c.id, i === 0 ? 20 : 10]));
  s.shares = M.castleShares(rule, s.castles, rule === "Custom" ? s.custom : undefined);
});
Then("each castle's share is in proportion to the people around it", (s) => {
  const total = s.castles.reduce((n: number, c: { people: number }) => n + c.people, 0);
  for (const c of s.castles) expect(s.shares[c.id]).toBeCloseTo(c.people / total);
});
Then("each castle's share is the same for every castle", (s) => {
  for (const c of s.castles) expect(s.shares[c.id]).toBeCloseTo(1 / s.castles.length);
});
Then("each castle's share is the slider per castle, summing to {int} %", (s, pct: number) => {
  const sum = Object.values(s.shares as Record<string, number>).reduce((a, b) => a + b, 0);
  expect(sum * 100).toBeCloseTo(pct);
  for (const c of s.castles) expect(s.shares[c.id]).toBeCloseTo(s.custom[c.id] / 100);
});

Given("the country {string} sets custom castle shares", (s) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
});
When("the sliders sum to {int} %", (s, pct: number) => {
  s.accepted = M.setCustomShares(s.policy, { Paris: pct - 30, Calais: 30 });
});
Then("the shares are not accepted until they sum to {int} %", (s, pct: number) => {
  expect(s.accepted).toBe(false);
  expect(s.policy.custom).toBeUndefined();
  expect(M.setCustomShares(s.policy, { Paris: pct - 30, Calais: 30 })).toBe(true);
});

Given("the castle of {string} has {int} sacks to hand out after its reserve", (s, _c: string, n: number) => {
  s.sacks = n;
});
When("its spread pattern is {string}", (s, pattern: M.SpreadName) => {
  s.spread = M.spreadFood(s.sacks, pattern);
});
Then("its own province gets {int}, the next ring shares {int} and the ring beyond shares {int}", (s, own: number, next: number, beyond: number) => {
  expect([s.spread.own, s.spread.next, s.spread.beyond]).toEqual([own, next, beyond]);
});

When("its siege reserve is {int} months and the spread runs", (s, reserve: number) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  M.setFoodPolicy(s.policy, "siegeReserve", reserve);
  const out = M.spreadFood(M.spreadable(s.months, reserve), "50/30/20");
  s.left = s.months - (out.own + out.next + out.beyond);
});
Then("it keeps at least {int} months", (s, n: number) => {
  expect(s.left).toBeGreaterThanOrEqual(n);
});

Given("the province {string} has {float} months of food in store", (s, _p: string, months: number) => {
  s.storeMonths = months;
});
Given("the famine rule is {string}", (s, rule: M.FoodPolicy["famineRule"]) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  M.setFoodPolicy(s.policy, "famineRule", rule);
});
When("the castle of {string} spreads its food", (s) => {
  s.fedFirst = M.fedFirst(s.storeMonths, s.policy.realm.famineRule);
});
Then("{string} is fed first, ignoring the spread pattern", (s) => {
  expect(s.fedFirst).toBe(true);
});
Then("{string} gets its share by the spread pattern", (s) => {
  expect(s.fedFirst).toBe(false);
});

Given("the castle of {string} holds more than its granary size", (s) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
});
When("the surplus rule is {string}", (s, rule: string) => {
  M.setFoodPolicy(s.policy, "surplus", rule);
  s.goes = M.surplusGoes(s.policy.realm.surplus);
});
const surplusResults: Record<string, string> = {
  "stays and rots": "rots",
  "is sold to the treasury for gold": "sold",
  "goes to the castle of the capital": "capital_castle",
  "goes to subjects or allies": "subjects_or_allies",
};
Then(re(`the food above the granary size (${Object.keys(surplusResults).join("|")})`), (s, result: string) => {
  expect(s.goes).toBe(surplusResults[result]);
});

Given("the lord {string} is {string}", (s, name: string, loyalty: M.Loyalty) => {
  s.lord = lord(name, { loyalty });
  s.realm ??= M.newRealm("France", 300);
  s.realm.lords.push(s.lord);
});
When("the country {string} sets collection to {int} %", (s, _c: string, pct: number) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  M.setFoodPolicy(s.policy, "collection", pct);
  s.lordCollects = M.lordCollection(pct, s.lord.loyalty);
});
Then("his castles collect {int} %", (s, pct: number) => {
  expect(s.lordCollects).toBe(pct);
});
Then("his castles collect nothing for you; he keeps his food", (s) => {
  expect(s.lordCollects).toBe(0);
});

Given("the country {string} has its own food settings", (s) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  M.setFoodPolicy(s.policy, "collection", 0);
  M.setFoodPolicy(s.policy, "siegeReserve", 0);
});
When("the country {string} picks the food preset {string}", (s, _c: string, preset: M.PresetName) => {
  M.applyPreset(s.policy, preset);
});
Then("collection is {int} %, castle shares {string}, spread {string}, siege reserve {int} months and army refill {string}", (s, c: number, shares: string, spread: string, reserve: number, refill: string) => {
  const p: M.FoodPolicy = s.policy.realm;
  expect([p.collection, p.castleShares, p.spread, p.siegeReserve, p.armyRefill]).toEqual([c, shares, spread, reserve, refill]);
});

Given("the country {string} keeps its surplus", (s) => {
  s.policy = M.foodPolicyFromPreset("Feed the people");
  expect(s.policy.realm.surplus).toBe("Keep");
});
Then("its surplus rule is {string}", (s, rule: string) => {
  expect(s.policy.realm.surplus).toBe(rule);
});

// ------------------------------------------------------------ the year of food

Given("the provinces {string}, {string} and {string} lie in one weather region", (s, ...ps: string[]) => {
  s.regionOf = Object.fromEntries(ps.map((p) => [p, "Champagne"]));
  s.harvests = Object.fromEntries(ps.map((p) => [p, "normal"]));
  s.price = { Champagne: 10 };
});
When("the autumn harvest is rolled with bad weather for that region", (s) => {
  s.after = M.regionWeather(s.harvests, s.regionOf, { Champagne: "bad" });
  s.priceAfter = { Champagne: M.applyCause(s.price.Champagne, "grain_price", "bad_harvests", 1) };
});
Then("all three suffer together", (s) => {
  for (const p of Object.keys(s.harvests)) expect(s.after[p]).toBe("poor");
});
Then("the grain price rises for all of them", (s) => {
  for (const p of Object.keys(s.harvests)) expect(s.priceAfter[s.regionOf[p]]).toBeGreaterThan(s.price[s.regionOf[p]]);
});

Given("the province {string} has a surplus and lies in reach of the castles of {string} and {string}", (s, p: string, a: string, b: string) => {
  s.sens = { castleDistance: { [a]: 1, [b]: 2 } };
  s.castles = [
    { id: a, province: a, store: 0, reach: 2 },
    { id: b, province: b, store: 0, reach: 2 },
  ];
  s.province = p;
});
Given("{string} is the nearer", (s, castle: string) => {
  expect(Math.min(...Object.values(s.sens.castleDistance as Record<string, number>))).toBe(s.sens.castleDistance[castle]);
});
Then("the collected food goes to the castle of {string}", (s, castle: string) => {
  expect(s.goesTo).toBe(castle);
});

Given("the castle of {string} holds {int} months of food and has a siege reserve of {int} months", (s, _c: string, months: number, reserve: number) => {
  s.months = months;
  s.reserve = reserve;
});
When("the spread runs", (s) => {
  if (s.besieged || s.cut) s.spread = M.spreadFood(100, "50/30/20", { besieged: !!s.besieged, outerRingCut: !!s.cut });
  else s.spread = M.spreadFood(M.spreadable(s.months, s.reserve), "50/30/20");
});
Then("it keeps {int} months", (s, n: number) => {
  expect(s.months - (s.spread.own + s.spread.next + s.spread.beyond)).toBe(n);
});
Then("hands out the rest to the rings around it by its spread pattern", (s) => {
  const rest = s.months - s.reserve;
  expect([s.spread.own, s.spread.next, s.spread.beyond]).toEqual(M.spreadPattern("50/30/20").map((p) => (rest * p) / 100));
});

Given(re(`an army of ${NUM} men is on campaign and a herd of ${NUM} horses is at home`), (s, men: string, horses: string) => {
  s.men = num(men);
  s.horses = num(horses);
});
When("a month of eating passes", (s) => {
  s.armyEats = M.eatersInMen({ onCampaign: s.men });
  s.horsesEat = M.eatersInMen({ horses: s.horses });
});
Then(re(`the army eats as much as ${NUM} men at home`), (s, n: string) => {
  expect(s.armyEats).toBe(num(n));
});
Then("the horses eat as much as {int} men", (s, n: number) => {
  expect(s.horsesEat).toBe(n);
});

Given("the castle of {string} is besieged", (s) => {
  s.besieged = true;
});
Then("the castle of {string} hands out nothing", (s) => {
  expect(s.spread.own + s.spread.next + s.spread.beyond).toBe(0);
});
Then("it lives on its own store", (s) => {
  expect(s.spread.kept).toBe(100);
});

Given("an enemy army sits between the castle of {string} and its outer ring", (s) => {
  s.cut = true;
});
Then("the provinces of the outer ring receive nothing from {string}", (s) => {
  expect(s.spread.beyond).toBe(0);
  expect(s.spread.next).toBeGreaterThan(0);
});

Given("a rice province of {string} has irrigated rice land fed by canals", (s) => {
  s.known = new Set(["F2"]);
  s.rice = { irrigatedRice: true, canalsWrecked: false };
});
When("the year's harvests are rolled", (s) => {
  s.harvests = M.harvestsPerYear(s.rice, s.known);
});
Then("it harvests twice", (s) => {
  expect(s.harvests).toBe(2);
});
When("war wrecks its canals", (s) => {
  s.rice.canalsWrecked = true;
});
Then("its irrigated rice land no longer harvests twice", (s) => {
  expect(M.harvestsPerYear(s.rice, s.known)).toBe(1);
});

Given("the country {string} has made Atlantic contact", (s, country: string) => {
  s.p = R.newProgramme(country);
  R.contactEvent(s.p, "atlantic_crossing");
});
When("it learns {string}", (s, name: string) => {
  const id = name.split(" ")[0]!;
  expect(R.eligibility(s.p, id, { year: 1500 })).toEqual({ ok: true });
  R.learn(s.p, id);
});
Then("its failed harvests become poor ones", (s) => {
  expect(M.withNewCrops("failed", s.p.known)).toBe("poor");
  expect(M.withNewCrops("failed", new Set())).toBe("failed");
});

Given("the province {string} of the lord {string} runs out of food", (s, province: string, name: string) => {
  s.lord = lord(name, { provinces: [province], loyalty: "Loyal" });
  s.province = { localStore: 0 };
});
When("the famine strikes", (s) => {
  s.famine = M.famine(s.lord.provinces[0], s.lord);
});
Then("people of {string} die", (s, province: string) => {
  expect(s.famine.province).toBe(province);
  expect(s.famine.peopleDie).toBe(true);
});
Then("survivors flee to neighbouring provinces or abroad", (s) => {
  expect(s.famine.survivorsFlee).toEqual(["neighbours", "abroad"]);
});
Then("a revolt in {string} becomes likely", (s) => {
  expect(s.famine.revoltLikely).toBe(true);
});
Then("the lord {string} turns {string}", (s, _n: string, loyalty: string) => {
  expect(s.lord.loyalty).toBe(loyalty);
});
Then("the event tree's famine events read the same store", (s) => {
  expect(M.foodSecurity(s.province).localStore).toBe(s.province.localStore);
});

Given("an enemy army is about to march into the province {string}", (s) => {
  s.forage = loadDefaultRuleset().defines.march.foraging.farmland;
});
When("the country {string} burns its own fields in {string}", (s) => {
  s.forage = M.forageAfterBurning(s.forage, true);
});
Then("the enemy army finds nothing to forage there", (s) => {
  expect(s.forage).toBe(0);
});

// ------------------------------------------------------------ people and land

Given("the country {string} has {float} m people", (s, _c: string, m: number) => {
  track(s, "people", { value: m * 1000 });
});
Given("the country {string} holds {int} provinces", (s, _c: string, n: number) => setOrExpect(s, "provinces", n));
Given("the country {string} has {int} royal provinces", (s, _c: string, n: number) => setOrExpect(s, "royal_provinces", n));

Given("the royal province {string} has no official", (s, province: string) => {
  s.realm = M.newRealm("France");
  s.realm.royal.add(province);
  s.province = province;
});
When("its tax and recruits are collected", (s) => {
  s.yield = M.provinceYield(s.realm, s.province, 100, 400);
});
Then("it pays half its taxes", (s) => {
  expect(s.yield.tax).toBe(50);
});
Then("gives half its recruits", (s) => {
  expect(s.yield.recruits).toBe(200);
});

Given("the country {string} has {int} % faith", (s, _c: string, n: number) => track(s, "faith", { value: n }));
Given("the country {string} has {int} % tongue", (s, _c: string, n: number) => track(s, "tongue", { value: n }));
Given("the country {string} has {int} provinces in revolt", (s, _c: string, n: number) => track(s, "in_revolt", { value: n }));

// ------------------------------------------------------------ lords

function lord(name: string, over: Partial<M.Lord> = {}): M.Lord {
  return { name, house: name, provinces: ["Dijon"], retinue: 1000, wealth: 100, traits: [], loyalty: "Loyal", sons: [], ...over };
}

Given("the lord {string} of House {word}, age {int}, holds {int} provinces", (s, name: string, house: string, age: number, n: number) => {
  // The design's card shows him Wavering.
  s.lord = lord(name, { house, age, provinces: Array.from({ length: n }, (_, i) => `Burgundy ${i + 1}`), loyalty: "Wavering", sons: ["Charles"] });
});
Given(re(`he has a retinue of ${NUM} men, (\\d+) gold, the traits (\\w+) and (\\w+), and wants (.+)`), (s, retinue: string, gold: string, a: string, b: string, want: string) => {
  Object.assign(s.lord, { retinue: num(retinue), wealth: num(gold), traits: [a, b], want });
});
When("the player opens his card", (s) => {
  s.cardOf = M.lordCard(s.lord);
});
Then("it shows his lands, retinue, wealth, traits, want, loyalty {string} and heir", (s, loyalty: string) => {
  expect(s.cardOf).toEqual({ lands: 6, retinue: 4000, wealth: 220, traits: ["Ambitious", "Rich"], want: "the county of Champagne", loyalty, heir: "Charles" });
});

Given(/^a country is a (.+)$/, (s, society: string) => {
  s.society = society;
});
When("the player opens the card of one of its lords", (s) => {
  s.label = M.lordLabel(s.society);
});
Then(/^the lord is labelled as an? (.+)$/, (s, label: string) => {
  expect(s.label).toBe(label);
});

Given("the royal province {string} is run by an official", (s, province: string) => {
  s.realm ??= M.newRealm("France");
  s.realm.royal.add(province);
  s.realm.officials.add(province);
});
Given("the province {string} is held by the lord {string}", (s, province: string, name: string) => {
  s.realm.lords.push(lord(name, { provinces: [province] }));
});
When("the year's taxes and recruits are collected", (s) => {
  s.yields = { Troyes: M.provinceYield(s.realm, "Troyes", 100, 400), Dijon: M.provinceYield(s.realm, "Dijon", 100, 400) };
});
Then("{string} sends all its taxes and recruits to the ruler, and the official costs wages", (s, p: string) => {
  expect(s.yields[p]).toEqual({ tax: 100, recruits: 400, retinue: 0, wagesDue: true });
});
Then("{string} sends half its taxes, and its recruits form the lord's retinue, and the lord costs nothing", (s, p: string) => {
  expect(s.yields[p]).toEqual({ tax: 50, recruits: 0, retinue: 400, wagesDue: false });
});
Then("the official can be dismissed at will", () => {
  expect(M.removableBy("official")).toEqual(["dismissal"]);
});
Then("the lord can be removed only by force, a trial or his line dying out", () => {
  expect(M.removableBy("lord")).toEqual(["force", "trial", "line_dies_out"]);
});

When("the country {string} calls his retinue to war", (s) => {
  s.came = M.callRetinue(s.lord);
});
Then("his retinue comes", (s) => {
  expect(s.came).toBe(s.lord.retinue);
});
Then("his retinue does not come", (s) => {
  expect(s.came).toBe(0);
});

Given("the lord {string} has {int} gold", (s, name: string, gold: number) => {
  s.realm = M.newRealm("France", 300);
  s.lord = lord(name, { wealth: gold });
  s.realm.lords.push(s.lord);
});
When("he lends to the ruler", (s) => {
  M.lordLends(s.realm, s.lord, 100, 10);
});
When("he funds a revolt", (s) => {
  s.rising = M.lordFundsRevolt(s.lord, 100);
});
Then("the country {string} owes him gold", (s) => {
  expect(s.realm.treasury.loans).toEqual([{ lender: s.lord.name, amount: 100, interestPct: 10 }]);
  expect(s.lord.wealth).toBe(120);
});
Then("a rising is armed with his gold", (s) => {
  expect(s.rising).toEqual({ lord: s.lord.name, gold: 100 });
  expect(s.lord.wealth).toBe(120);
});

Given("the country {string} holds the royal provinces {string} and {string}, each with an official", (s, country: string, a: string, b: string) => {
  s.realm = M.newRealm(country);
  for (const p of [a, b]) {
    s.realm.provinces.add(p);
    s.realm.royal.add(p);
    s.realm.officials.add(p);
  }
  s.fief = [a, b];
});
When("the country {string} grants both as a fief to its commander {string}", (s, _c: string, person: string) => {
  s.newLord = M.grantFief(s.realm, s.fief, person);
});
Then("{string} is a {string} lord holding {string} and {string}", (s, name: string, loyalty: string, a: string, b: string) => {
  expect(s.newLord).toMatchObject({ name, loyalty, provinces: [a, b] });
});
Then("those provinces no longer need a royal official", (s) => {
  for (const p of s.fief) expect(M.needsOfficial(s.realm, p)).toBe(false);
});

Given("the country {string} has conquered the province {string}", (s, country: string, province: string) => {
  s.realm = M.newRealm(country);
  s.province = province;
});
When("it keeps the defeated ruler of {string} as its lord", (s, province: string) => {
  s.kept = M.keepLocalRuler(s.realm, province, `ruler of ${province}`);
});
Then("he is a {string} lord holding {string}", (s, loyalty: string, province: string) => {
  expect(s.kept.lord).toMatchObject({ loyalty, provinces: [province] });
});
Then("no royal official is needed there", (s) => {
  expect(M.needsOfficial(s.realm, s.province)).toBe(false);
});
Then("the people of {string} stay calm", (s) => {
  expect(s.kept.peopleCalm).toBe(true);
});

Given("the country {string} holds the royal province {string}", (s, country: string, province: string) => {
  s.realm = M.newRealm(country, 300);
  s.realm.provinces.add(province);
  s.realm.royal.add(province);
});
When("it sells {string} as a fief to a rich merchant", (s, province: string) => {
  s.merchant = M.sellTitle(s.realm, province, "a rich merchant", 100);
});
Then("the country {string} gains gold", (s) => {
  expect(s.realm.treasury.gold).toBeGreaterThan(300);
});
Then("the merchant is a weak but {string} lord", (s, loyalty: string) => {
  expect(s.merchant).toMatchObject({ loyalty, weak: true });
});

Given("a local house holds the province {string} outside the realm of {string}", (s, province: string, country: string) => {
  s.realm = M.newRealm(country);
  s.house = lord("House of Béarn", { provinces: [province] });
});
When("a princess of {string} marries into that house and the house joins", (s) => {
  s.tie = M.marry(s.realm.country, s.house.house);
  M.lordJoins(s.realm, s.house);
});
Then("the house is a lord of {string} holding {string}", (s, _c: string, province: string) => {
  expect(M.lordOf(s.realm, province)?.name).toBe(s.house.name);
  expect(s.realm.provinces.has(province)).toBe(true);
});

Given("the lord {string} holds {int} provinces and has {int} sons", (s, name: string, n: number, sons: number) => {
  s.realm = M.newRealm("France");
  s.realm.lords.push(lord(name, { provinces: Array.from({ length: n }, (_, i) => `${name} ${i + 1}`), sons: Array.from({ length: sons }, (_, i) => `son ${i + 1}`) }));
});
Given(/^the inheritance law of "([^"]+)" passes a lord's land (to one heir|split among the sons)$/, (s, _c: string, law: M.Realm["landLaw"]) => {
  s.realm.landLaw = law;
});
When("the lord {string} dies", (s, name: string) => {
  s.heirsOut = M.lordDies(s.realm, name);
});
Then("his eldest son holds all {int} provinces", (s, n: number) => {
  expect(s.heirsOut.map((l: M.Lord) => [l.name, l.provinces.length])).toEqual([["son 1", n]]);
});
Then("his lands are split between his {int} sons", (s, n: number) => {
  expect(s.heirsOut.length).toBe(n);
  expect(s.heirsOut.map((l: M.Lord) => l.provinces.length)).toEqual([2, 2]);
});

Given("the lord {string} of the country {string} is {string} and borders {string}", (s, name: string, country: string, loyalty: M.Loyalty, other: string) => {
  s.from = M.newRealm(country);
  s.to = M.newRealm(other);
  s.defector = lord(name, { provinces: ["Rennes", "Nantes"], loyalty });
  M.lordJoins(s.from, s.defector);
});
When("he defects to the country {string}", (s) => {
  M.defect(s.from, s.to, s.defector.name);
});
Then("the country {string} holds his provinces", (s) => {
  for (const p of s.defector.provinces) {
    expect(s.to.provinces.has(p)).toBe(true);
    expect(s.from.provinces.has(p)).toBe(false);
  }
});
Then("he is a lord of {string}", (s) => {
  expect(s.to.lords).toContain(s.defector);
});

Given("the lord {string} holds {int} provinces and has no heir", (s, name: string, n: number) => {
  s.realm = M.newRealm("France");
  s.realm.lords.push(lord(name, { provinces: Array.from({ length: n }, (_, i) => `${name} ${i + 1}`) }));
});
Then("the {int} provinces become royal provinces of {string}", (s, n: number) => {
  expect(s.realm.royal.size).toBe(n);
  expect(s.realm.lords.length).toBe(0);
});
Then("each needs an official", (s) => {
  for (const p of s.realm.royal) expect(M.needsOfficial(s.realm, p)).toBe(true);
});

Given("the lords {string} and {string} are {string}", (s, a: string, b: string, loyalty: M.Loyalty) => {
  s.realm = M.newRealm("France");
  s.realm.lords.push(lord(a, { provinces: [`${a} 1`], loyalty }), lord(b, { provinces: [`${b} 1`], loyalty }));
});
When("the country {string} seizes the land of {string} by decree", (s, _c: string, name: string) => {
  s.seized = M.seizeLand(s.realm, name);
});
Then("the land of {string} is royal", (s, name: string) => {
  expect(s.realm.royal.has(`${name} 1`)).toBe(true);
});
Then("the lord {string} wavers", (s, name: string) => {
  expect(s.realm.lords.find((l: M.Lord) => l.name === name)?.loyalty).toBe("Wavering");
});
Then("{string} may rebel", (s) => {
  expect(s.seized.mayRebel).toBe(true);
});

Given("the lord {string} of House {word} is {string}", (s, name: string, house: string, loyalty: M.Loyalty) => {
  s.realm = M.newRealm("France");
  s.realm.lords.push(lord(name, { house, loyalty }));
});
Given("another lord of House {word} is {string}", (s, house: string, loyalty: M.Loyalty) => {
  s.realm.lords.push(lord("Count of Pardiac", { house, loyalty, provinces: ["Pardiac"] }));
});
When("the country {string} tries and executes the lord {string}", (s, _c: string, name: string) => {
  M.trial(s.realm, name);
  s.tried = name;
});
Then("he is no longer a lord", (s) => {
  expect(s.realm.lords.some((l: M.Lord) => l.name === s.tried)).toBe(false);
});
Then("every lord of House {word} becomes {string}", (s, house: string, loyalty: string) => {
  const ofHouse = s.realm.lords.filter((l: M.Lord) => l.house === house);
  expect(ofHouse.length).toBeGreaterThan(0);
  for (const l of ofHouse) expect(l.loyalty).toBe(loyalty);
});

When(/^the country "([^"]+)" defeats his revolt and (keeps the land|gives it to a loyal claimant)$/, (s, _c: string, choice: string) => {
  s.claimant = M.defeatRevolt(s.realm, s.lord.name, choice === "keeps the land" ? undefined : "the claimant");
});
Then("his land is royal", (s) => {
  for (const p of s.lord.provinces) expect(s.realm.royal.has(p)).toBe(true);
});
Then("the claimant is a {string} lord of it", (s, loyalty: string) => {
  expect(s.claimant).toMatchObject({ loyalty, provinces: s.lord.provinces });
  expect(s.realm.royal.size).toBe(0);
});

Given("the lords {string} and {string} are separate lords of {string}", (s, a: string, b: string, country: string) => {
  s.realm = M.newRealm(country);
  s.realm.lords.push(lord(a, { provinces: ["Armagnac"] }), lord(b, { provinces: ["Rennes"] }));
  s.pair = [a, b];
});
When("their houses join by marriage", (s) => {
  s.merged = M.mergeHouses(s.realm, s.pair[0], s.pair[1]);
});
Then("they are one lord holding both lands", (s) => {
  expect(s.realm.lords).toEqual([s.merged]);
  expect(s.merged.provinces).toEqual(["Armagnac", "Rennes"]);
});

const loyaltyCauses: Record<string, string> = {
  "the ruler grants him the county of Champagne he wants": "want_granted",
  "the ruler gives him a gift of gold": "gift_of_gold",
  "the ruler gives him an office at court": "office_at_court",
  "his house marries into the ruling house": "marriage_into_ruling_house",
  "he takes part in a victory": "victory_taken_part",
  "the reign is long and secure with a clear heir": "long_secure_reign",
  "the ruler feeds his lands in famine": "fed_in_famine",
  "he shares the ruler's faith and tongue": "shared_faith_and_tongue",
  "his land is taxed heavy or crushing": "heavy_taxes",
  "the ruler seizes land from him": "land_seized_from_him",
  "the ruler seizes land from another lord": "land_seized_from_another",
  "the realm loses a war": "war_lost",
  "the realm loses a battle": "battle_lost",
  "a child becomes ruler": "child_ruler",
  "the heir is disputed": "disputed_heir",
  "a new ruler takes the throne": "new_ruler",
  "the ruler requisitions his grain": "grain_requisitioned",
  "a foreign rival bribes him with promises": "foreign_bribes",
};
When(re(`(${Object.keys(loyaltyCauses).map(esc).join("|")})`), (s, cause: string) => {
  s.loyaltyBefore = s.lord.loyalty;
  M.loyaltyCause(s.lord, loyaltyCauses[cause]!);
});
Then("his loyalty rises", (s) => {
  expect(M.loyaltyRank(s.lord.loyalty)).toBeLessThan(M.loyaltyRank(s.loyaltyBefore));
});
Then("his loyalty falls", (s) => {
  expect(M.loyaltyRank(s.lord.loyalty)).toBeGreaterThan(M.loyaltyRank(s.loyaltyBefore));
});

// ------------------------------------------------------------ army and navy

Given(re(`the country "([^"]+)" has ${NUM} soldiers`), (s, _c: string, n: string) => track(s, "soldiers", { value: num(n) }));
Given(re(`the country "([^"]+)" has ${NUM} recruits`), (s, _c: string, n: string) => track(s, "recruits", { value: num(n) }));
Given(re(`the country "([^"]+)" has ${NUM} horses`), (s, _c: string, n: string) => track(s, "horses", { value: num(n) }));
Given("the country {string} has {int} warships and {int} trade ships", (s, _c: string, w: number, t: number) => track(s, "ships", { warships: w, "trade ships": t }));
Given("the country {string} has {int} castles", (s, _c: string, n: number) => track(s, "castles", { value: n }));
Given("the country {string} has {int} named commanders with Might, Cunning and Logistics", (s, _c: string, n: number) => track(s, "commanders", { value: n }));
Then("it has {int} castles", (s, n: number) => expect(s.values.value).toBe(n));
Then("it has {int} commanders", (s, n: number) => expect(s.values.value).toBe(n));

When("a month passes", (s) => {
  const pay = loadDefaultRuleset().defines.military.upkeepPerThousandMenPerMonth;
  s.month = M.soldiersMonth(s.values.value, pay);
});
Then("it pays them gold", (s) => {
  expect(s.month.gold).toBeGreaterThan(0);
});
Then("they eat grain", (s) => {
  expect(s.month.grainInMen).toBe(s.values.value);
});

When(re(`it tries to field ${NUM} horsemen`), (s, n: string) => {
  s.fielded = M.horsemenCap(s.values.value, num(n));
});
Then("it can field at most as many horsemen as its horses allow", (s) => {
  expect(s.fielded).toBe(s.values.value);
});

// ------------------------------------------------------------ ruler and family

Given("King Charles VII has reigned {int} years", (s, years: number) => {
  s.realm = M.newRealm("France");
  s.realm.lords.push(lord("Armagnac"), lord("Brittany"));
  s.ruler = { name: "Charles VII", age: 41, years, heirs: [{ name: "Louis", sex: "m", age: 21, relation: "child" }], traits: [] } satisfies M.Ruler;
});
When(/^he (dies|is deposed|abdicates)$/, (s) => {
  const heir = M.successor("eldest son", s.ruler.heirs);
  if (heir === "succession war") throw new Error("no heir");
  s.wavering0 = s.realm.lords.filter((l: M.Lord) => l.loyalty === "Wavering").length;
  M.crown(s.realm, s.ruler, heir);
});
Then("the new ruler has {int} years on the throne", (s, n: number) => {
  expect(s.ruler.name).toBe("Louis");
  expect(s.ruler.years).toBe(n);
});
Then("more lords are wavering", (s) => {
  expect(s.realm.lords.filter((l: M.Lord) => l.loyalty === "Wavering").length).toBeGreaterThan(s.wavering0);
});

Given("the ruler of {string} has {int} heirs", (s, _c: string, n: number) => setOrExpect(s, "heirs", n));

Given("the ruler of {string} has no heir", (s, country: string) => {
  s.realm = M.newRealm(country);
  s.realm.lords.push(lord("Lord of Beaumont"), lord("Lord of Agramont"));
  s.heirs = [];
});
When("the ruler dies", (s) => {
  s.next = M.successor("eldest son", s.heirs);
});
Then("the lords of {string} fight a succession war", (s) => {
  expect(s.next).toBe("succession war");
  expect(s.realm.lords.length).toBeGreaterThan(0);
});

Given("the ruler of {string} has an unmarried princess", (s, country: string) => {
  s.country = country;
  s.realm = M.newRealm(country);
});
When("she marries into the ruling house of {string}", (s, other: string) => {
  s.tie = M.marry(s.country, other);
});
When("she marries into the house of the lord {string}", (s, name: string) => {
  s.lord = lord(name, { loyalty: "Wavering" });
  s.loyaltyBefore = s.lord.loyalty;
  s.tie = M.marry(s.country, s.lord.house);
  M.loyaltyCause(s.lord, "marriage_into_ruling_house");
});
When("she dies", (s) => {
  s.tie = M.marry(s.country, "Castile");
  M.endMarriage(s.tie, "death");
});
When("{string} and {string} go to war", (s, a: string, b: string) => {
  s.tie = M.marry(a, b);
  M.endMarriage(s.tie, "war");
});
Then("{string} and {string} have a living marriage tie, with goodwill", (s, a: string, b: string) => {
  expect(s.tie).toEqual({ houses: [a, b], living: true, goodwill: true });
});
Then("the lord {string} gains loyalty", (s) => {
  expect(M.loyaltyRank(s.lord.loyalty)).toBeLessThan(M.loyaltyRank(s.loyaltyBefore));
});
Then("the marriage tie ends", (s) => {
  expect(s.tie.living).toBe(false);
});

Given("the ruling house of {string} is married into the ruling house of {string}", (s, a: string, b: string) => {
  s.tie = M.marry(a, b);
});
When("the ruler of {string} dies and the marriage gives {string} the strongest claim", (s) => {
  s.passes = M.mayInheritRealm(s.tie, true);
});
Then("the realm of {string} may pass to the ruler of {string}", (s) => {
  expect(s.passes).toBe(true);
  expect(M.mayInheritRealm({ ...s.tie, living: false }, true)).toBe(false);
});

const family: M.Person[] = [
  { name: "eldest daughter", sex: "f", age: 20, relation: "child" },
  { name: "eldest son", sex: "m", age: 17, relation: "child" },
  { name: "brother", sex: "m", age: 45, relation: "sibling" },
  { name: "cousin", sex: "m", age: 60, relation: "house" },
  { name: "weak lord", sex: "m", age: 50, relation: "lord", claim: 1, votes: 1 },
  { name: "strong lord", sex: "m", age: 40, relation: "lord", claim: 5, votes: 2 },
  { name: "elected", sex: "m", age: 35, relation: "lord", claim: 2, votes: 4 },
];
Given("the inheritance law of {string} is {string}", (s, _c: string, law: M.ThroneLaw) => {
  s.law = law;
});
When("the ruler of {string} dies", (s) => {
  s.next = M.successor(s.law, family);
});
const throneGoesTo: Record<string, string> = {
  "the ruler's eldest son": "eldest son",
  "the ruler's eldest child, a daughter if she is eldest": "eldest daughter",
  "the candidate the electors choose": "elected",
  "the strongest claimant among the lords": "strong lord",
  "a brother or the eldest of the house": "brother",
};
Then(re(`the throne goes to (${Object.keys(throneGoesTo).map(esc).join("|")})`), (s, who: string) => {
  expect(s.next.name).toBe(throneGoesTo[who]);
});

// ------------------------------------------------------------ women in roles

Given(/^the country "([^"]+)" lets a daughter inherit (the crown|a duchy but not the crown)$/, (s, country: string, what: string) => {
  s.country = country;
  s.law = what === "the crown" ? "eldest child" : "eldest son";
});
When("its ruler dies leaving only a daughter", (s) => {
  s.next = M.successor(s.law, [{ name: "daughter", sex: "f", age: 18, relation: "child" }]);
});
Then("she can become queen regnant", (s) => {
  expect(s.next.name).toBe("daughter");
});
Then("she cannot inherit the throne of France", (s) => {
  expect(s.next).toBe("succession war");
});

Given("the lord {string} of {string} dies leaving only a daughter", (s, name: string, country: string) => {
  s.realm = M.newRealm(country);
  s.realm.lords.push(lord(name, { provinces: ["Rennes", "Nantes"], daughters: ["Anne"] }));
  s.dead = name;
});
When("his land passes", (s) => {
  s.heirsOut = M.lordDies(s.realm, s.dead);
});
Then("his daughter becomes the lord of {string}", (s) => {
  expect(s.heirsOut.map((l: M.Lord) => l.name)).toEqual(["Anne"]);
  expect(s.heirsOut[0].provinces).toEqual(["Rennes", "Nantes"]);
});

Given("the ruler of {string} dies and his heir is a child", (s, country: string) => {
  s.realm = M.newRealm(country);
  s.realm.lords.push(lord("Armagnac"));
});
When("a regent is chosen", (s) => {
  s.regents = M.regentCandidates(s.realm, "the queen mother");
});
Then("the queen mother can be the regent", (s) => {
  expect(s.regents).toContain("the queen mother");
});

Given("a woman held a role in 1444 in the catalogue's history", (s) => {
  s.historical = { name: "a woman of 1444", sex: "f", age: 30 } satisfies M.Person;
});
Then("she is placed in that role as she was", (s) => {
  expect(s.placed.person).toBe(s.historical);
});
Then("the chance tables apply only to characters the game generates", (s) => {
  expect(s.placed.generated).toBe(false);
  expect(s.generatedOnly.generated).toBe(true);
});

// ------------------------------------------------------------ abroad

Given("the country {string} has {int} allies", (s, _c: string, n: number) => setOrExpect(s, "allies", n));

Given("the country {string} has the ally {string}", (s, _c: string, ally: string) => {
  s.standing = M.newStanding();
  s.standing.allies.add(ally);
});
When("the country {string} goes to war", (s) => {
  s.called = M.goToWar(s.standing, "England");
});
Then("{string} is called into the war", (s, ally: string) => {
  expect(s.called).toContain(ally);
});

Given("the country {string} is at peace", (s) => {
  s.standing = M.newStanding();
  expect(s.standing.enemies.size).toBe(0);
});
When("the country {string} declares war on {string}", (s, enemy: string) => {
  M.goToWar(s.standing, enemy);
});
Then("{string} is an enemy of {string}", (s, enemy: string) => {
  expect(s.standing.enemies.has(enemy)).toBe(true);
});
When("peace is made", (s) => {
  for (const e of [...s.standing.enemies]) M.makePeace(s.standing, e);
});
Then("{string} is no longer an enemy", (s, enemy: string) => {
  expect(s.standing.enemies.has(enemy)).toBe(false);
});

Given("{string} and {string} both claim the province {string}", (s, a: string, b: string, p: string) => {
  s.standing = M.newStanding();
  s.claim = { a, b, p };
});
When("the claim is contested", (s) => {
  M.contestClaim(s.standing, s.claim.b, s.claim.p);
});
Then("{string} is a rival of {string} over {string}", (s, rival: string, _c: string, thing: string) => {
  expect(s.standing.rivals.get(rival)).toBe(thing);
});
Then("the AI targets its rivals", (s) => {
  expect(M.aiTargets(s.standing)).toEqual([s.claim.b]);
});
Then("wars against the rival please the lords of {string}", (s) => {
  expect(M.warPleasesLords(s.standing, s.claim.b)).toBe(true);
  const l = lord("Armagnac", { loyalty: "Wavering" });
  M.loyaltyCause(l, "war_against_rival");
  expect(l.loyalty).toBe("Loyal");
});
When("{string} is settled", (s, thing: string) => {
  M.settleClaim(s.standing, thing);
});
Then("they are no longer rivals over it", (s) => {
  expect(s.standing.rivals.size).toBe(0);
});

Given("the country {string} has the subject {string}", (s) => {
  s.overlord = { gold: 100, grain: 0, troops: 0 };
});
When("the subject pays", (s) => {
  M.payTribute(s.overlord, { gold: 20, troops: 500 });
});
Then("{string} receives tribute in gold or grain", (s) => {
  expect(s.overlord.gold + s.overlord.grain).toBeGreaterThan(100);
});
Then("troops from {string}", (s) => {
  expect(s.overlord.troops).toBe(500);
});

Given(/^the country "([^"]+)" (broke a truce|abandoned an ally|defaulted on debt) (\d+) years ago$/, (s, _c: string, act: string, years: string) => {
  s.today = { year: 1500 };
  s.oaths = [{ date: { year: 1500 - num(years) }, count: 1, kind: act }];
});
When("it asks for an alliance or a loan", (s) => {
  if (s.oaths) s.oathCount = M.withinWindow(s.oaths, s.today, "oaths_broken");
});
Then(/^its oaths broken count includes that act: (yes|no)$/, (s, yes: string) => {
  expect(s.oathCount).toBe(yes === "yes" ? 1 : 0);
});

Given("the country {string} has an envoy abroad in {string}", (s) => {
  track(s, "envoys", { value: 1 });
});
When("{string} holds him", (s) => {
  s.values.value = M.applyCause(s.values.value, "envoys", "held", 1);
});
Then("the country {string} has one fewer envoy", (s) => {
  expect(s.values.value).toBe(s.before.value - 1);
});

// ------------------------------------------------------------ AI

Given("the AI country {string} has the personality {string}", (s, ai: string, personality: M.Personality) => {
  s.ai = { ai, personality };
});
Given(/^its neighbour "([^"]+)" (has wavering lords|has just lost many soldiers|is strong|is weak)$/, (s, name: string, state: string) => {
  s.neighbour = { name, waveringLords: state === "has wavering lords" ? 3 : 0, soldiersDropped: state === "has just lost many soldiers" };
});
When("the AI plans its turn", (s) => {
  s.plan = M.aiPlan(s.ai.personality, s.neighbour);
});
Then("it considers attacking {string}", (s, name: string) => {
  expect(s.plan).toContain(`consider attacking ${name}`);
});
Then("it fills its schools and avoids war", (s) => {
  expect(s.plan).toEqual(["fill schools", "avoid war"]);
});
Then("it keeps its recruits for the army", (s) => {
  expect(s.plan).toEqual(["keep recruits for the army"]);
});

// ------------------------------------------------------------ scores

Given("the country {string} has a yearly income of {int} gold from taxes, lords' share, trade and tribute", (s, _c: string, income: number) => {
  s.income = income;
});
Given("it has {int} gold and {int} debt", (s, gold: number, d: number) => {
  s.bank = { gold, debt: d };
});
When("the scores are worked out", (s) => {
  if (s.income !== undefined) s.economy = M.economyScore(s.income, s.bank.gold, s.bank.debt);
  if (s.p) s.technology = M.technologyScore(s.p.known);
  if (s.yearly) s.wins = s.month === 8 && s.year === 1939 ? M.scoreWinners(s.yearly.at(-1)) : [];
  if (s.power) s.powerOut = M.powerScore(s.power);
  if (s.domination) s.dominates = M.dominationWin(s.domination.share, 100, s.domination.month);
});
Then("its Economy score is built from {int} yearly income and a bank of {int}", (s, income: number, bank: number) => {
  expect(s.economy).toEqual({ income, bank, score: income + bank });
});

Given("the country {string} knows {int} inventions of era I and {int} of era II", (s, country: string, one: number, two: number) => {
  s.p = R.newProgramme(country);
  const of = (era: R.Era) => [...R.tree().inventions.values()].filter((i) => i.era === era).map((i) => i.id);
  of("I").slice(0, one).forEach((id) => R.learn(s.p, id));
  of("II").slice(0, two).forEach((id) => R.learn(s.p, id));
  s.counts = { one, two };
});
Then("its Technology score weighs each invention by its era cost in the research tree", (s) => {
  expect(s.technology).toBe(s.counts.one * R.eraCost("I") + s.counts.two * R.eraCost("II"));
});
Then("no event removes a known invention from it", (s) => {
  // Research has no command that forgets an invention; learning again changes nothing.
  for (const id of [...s.p.known]) R.learn(s.p, id);
  expect(M.technologyScore(s.p.known)).toBe(s.technology);
});

Given("the country {string} has led Economy by {int} % over second place for {int} years", (s, country: string, pct: number, years: number) => {
  s.leader = country;
  s.yearly = Array.from({ length: years }, () => ({ [country]: 100 * (1 + pct / 100), Genoa: 100, Milan: 80 }));
  s.year = 1700;
  s.month = 1;
});
Then("no one wins by a score before the end date", (s) => {
  expect(s.wins).toEqual([]);
});

// ------------------------------------------------------------ decided rules (spec §13)

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Given("the date is {int} August {int}", (s, d: number, y: number) => {
  s.day = d;
  s.month = 8;
  s.year = y;
});

// win scores
Given("the country {string} holds {int} provinces and its subjects hold {int}", (s, _c: string, own: number, sub: number) => {
  s.power = { provinces: own, subjectProvinces: sub };
});
Given(re(`it has ${NUM} foot, ${NUM} horse, ${NUM} guns, (\\d+) warships and (\\d+) commanders`), (s, foot: string, horse: string, guns: string, ws: string, cm: string) => {
  Object.assign(s.power, { foot: num(foot), horse: num(horse), guns: num(guns), warships: num(ws), commanders: num(cm) });
});
Then("its Power score counts {int} provinces", (s, n: number) => {
  expect(s.powerOut.provinces).toBe(n);
});
Then("adds its army power from soldiers weighted by kind, warships and commanders", (s) => {
  expect(s.powerOut.score).toBe(s.powerOut.provinces + s.powerOut.army);
  expect(M.powerScore({ ...s.power, horse: 0 }).army).toBeLessThan(s.powerOut.army);
});
Then("its army power is {int}", (s, n: number) => {
  expect(s.powerOut.army).toBe(n);
});
Given("the country {string} owns or holds as subjects {int} % of the world's settled land provinces", (s, _c: string, pct: number) => {
  s.domination = { share: pct, month: 1 };
});
Given(/^it is the turn in which 1 (\w+) falls$/, (s, month: string) => {
  s.domination.month = MONTHS.indexOf(month) + 1;
});
Then("the country {string} wins by world domination and may keep playing to the end date", (s) => {
  expect(s.dominates).toBe(true);
  expect(M.realmConfig.campaign_end).toEqual({ year: 1939, month: 8, day: 31 });
});
Then("the country {string} does not win yet", (s) => {
  expect(s.dominates).toBe(false);
});
Given("the country {string} leads the Technology score", (s, country: string) => {
  s.tech = { [country]: 900, Germany: 850, England: 800 };
});
Given("the countries {string} and {string} share the lead in the Technology score", (s, a: string, b: string) => {
  s.tech = { [a]: 900, [b]: 900, England: 800 };
});
Given("the country {string} leads no score and holds no domination", (s, country: string) => {
  s.player = country;
  s.tech = { Japan: 900, [country]: 300, England: 800 };
});
When("the campaign's end date arrives", (s) => {
  expect([s.year, s.month, s.day]).toEqual([1939, 8, 31]);
  s.winners = M.scoreWinners(s.tech);
  s.ranks = M.ranks(s.tech);
});
Then("the country {string} wins by the Technology score", (s, country: string) => {
  expect(s.winners).toEqual([country]);
});
Then("both {string} and {string} win by the Technology score", (s, a: string, b: string) => {
  expect(s.winners).toEqual([a, b]);
});
Then("the campaign shows the final scores and the player's rank in each", (s) => {
  expect(s.winners).not.toContain(s.player);
  expect(s.ranks[s.player]).toBe(3);
});

// women in roles
Given("the event tree's age {string} has arrived", (s, age: string) => {
  s.age = age;
});
When(/^the game generates a (ruler|lord|commander|official|scholar) for "([^"]+)"$/, (s, role: M.Role, country: string) => {
  s.role = role;
  s.chance = M.womanChance(country, role, s.age ?? null, s.reformed ?? false);
  s.baseChance = M.womanChance(country, role);
});
Then("the chance that she is a woman is multiplied by the factor for {string}", (s, age: string) => {
  expect(s.chance / s.baseChance).toBeCloseTo((M.realmConfig.age_multipliers as Record<string, number>)[age]!);
});
Then("that factor is {float}", (s, f: number) => {
  expect(s.chance / s.baseChance).toBeCloseTo(f);
});
Given("no age has raised the chances yet", (s) => {
  s.age = null;
});
Then("the chance that she is a woman is {float}", (s, c: number) => {
  expect(s.chance).toBeCloseTo(c);
});
Given("the country {string} passes a new succession law by an event", (s) => {
  s.reformed = true;
});
Then("the chance of a woman is higher for {string} before the ages raise it", (s, country: string) => {
  expect(s.age ?? null).toBeNull();
  expect(s.chance).toBeGreaterThan(M.womanChance(country, s.role));
});
Given("the realm config", (s) => {
  s.cfg = M.realmConfig;
});
When("the game reads the women-in-roles tables", (s) => {
  s.tables = { w: s.cfg.women_in_roles, a: s.cfg.age_multipliers };
});
Then("it finds {string} per country or culture for ruler, lord, commander, official and scholar", (s, key: string) => {
  expect(key).toBe("women_in_roles");
  expect(Object.keys(s.tables.w.default).sort()).toEqual(["commander", "lord", "official", "ruler", "scholar"]);
  expect(s.tables.w.by_country).toBeDefined();
});
Then("{string} per age", (s, key: string) => {
  expect(key).toBe("age_multipliers");
  expect(Object.keys(s.tables.a)).toEqual(["Age of Revolutions", "Age of Industrialization", "Age of World Wars"]);
});

// abroad
Given("the country {string} has {int} subject(s)", (s, _c: string, n: number) => setOrExpect(s, "subjects", n));
const subjectCauses: Record<string, [string, number]> = {
  "it forces a neighbour to be a vassal in a peace": ["forced_in_peace", 1],
  "a weak neighbour asks for protection": ["asked_for_protection", 1],
  "the subject wins its independence war": ["independence_war", 1],
  "it releases the subject": ["released", 1],
  "it annexes the subject": ["annexed", 1],
};
When(re(`(${Object.keys(subjectCauses).map(esc).join("|")})`), (s, phrase: string) => {
  const [cause, n] = subjectCauses[phrase]!;
  s.values.value = M.applyCause(s.values.value, "subjects", cause, n);
});
Then("the Subjects row reads {string}", (s, text: string) => {
  const kinds = M.realmConfig.subject_kinds;
  const row = `${kinds.slice(0, -1).join(", ")} and ${kinds.at(-1)}`;
  expect(row.charAt(0).toUpperCase() + row.slice(1)).toBe(text);
  expect(M.cardExtraLines()).toContain("Subjects");
});
Given("the country {string} has {int} traders and {int} trade ships", (s, country: string, t: number, ts: number) => {
  s.card = { ...franceCard(), country, ships: { war: 0, trade: ts } };
  s.traders = t;
});
Then("the card has the lines {string} and {string} and no line {string}", (s, a: string, b: string, no: string) => {
  const extra = M.cardExtraLines();
  expect(extra).toContain(a);
  expect(extra).toContain(b);
  expect(extra).not.toContain(no);
  expect(s.lines.map((l: { text: string }) => l.text).join("\n")).not.toContain(no);
});
Then("gold from trade counts deposits from traders, market fees and tolls", (s) => {
  const gold = M.gainsAndLosses("gold").gain;
  expect(gold).toContain("trade");
  expect(Object.keys(M.realmConfig.stats)).not.toContain("merchants");
});
Given("the country {string} is at war", (s, country: string) => {
  s.card = { ...franceCard(), country };
});
Then(/^the card also has the lines (.+)$/, (s, list: string) => {
  const names = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
  for (const n of names) expect(M.cardExtraLines()).toContain(n);
});
When("the country {string} sends that official abroad on a marriage mission", (s) => {
  const province = [...s.realm.officials][0] as string;
  s.realm.officials.delete(province);
  s.envoyAbroad = province;
});
Then("{string} pays half until he returns", (s, province: string) => {
  expect(M.provinceYield(s.realm, province, 10, 100).tax).toBe(5);
});
Then("he handles only that one mission", (s) => {
  expect(M.gainsAndLosses("envoys")).toEqual({ gain: ["sent"], lose: ["mission_ended", "killed", "held"] });
  expect(M.cardExtraLines()).toContain("Envoy seats");
});
When("the mission ends", (s) => {
  s.realm.officials.add(s.envoyAbroad);
});
Then("he comes home and runs {string} again", (s, province: string) => {
  expect(M.provinceYield(s.realm, province, 10, 100).tax).toBe(10);
});
Given("the country {string} has {int} oaths broken", (s, _c: string, n: number) => {
  s.oathsBroken = n;
});
Then("other countries are more likely to refuse", (s) => {
  expect(M.refusalPct(s.oathsBroken)).toBeGreaterThan(M.refusalPct(0));
});
Then("the chance of a refusal is {int} %", (s, pct: number) => {
  expect(M.refusalPct(s.oathsBroken)).toBe(pct);
});

// events and AI
Given("an event reads the country stat {string}", (s, stat: string) => {
  s.eventStat = stat;
});
When("the event is evaluated", (s) => {
  s.reads = M.eventStatReads(s.eventStat);
});
Then(/^it reads (.+)$/, (s, list: string) => {
  const r: string[] = s.reads;
  const text = r.length > 1 ? `${r.slice(0, -1).join(", ")} and ${r.at(-1)}` : r[0];
  expect(text).toBe(list);
});
Given(/^the AI country "([^"]+)" is (at peace|at war) with (-?\d+) gold$/, (s, _c: string, state: string, gold: string) => {
  s.aiRealm = { atWar: state === "at war", gold: Number(gold), disloyalLords: [] as string[], royalProvinces: 0, officials: 0, known: new Set<string>(["G1"]) };
});
Given("it has {int} royal provinces, {int} officials and the disloyal lord {string}", (s, royal: number, officials: number, lordName: string) => {
  Object.assign(s.aiRealm, { royalProvinces: royal, officials, disloyalLords: [lordName] });
});
When("the AI plans its realm", (s) => {
  s.aiOut = M.aiRealmPlan(s.aiRealm);
});
Then("it picks the food preset {string} and the tax default {string}", (s, preset: string, tax: string) => {
  expect([s.aiOut.foodPreset, s.aiOut.tax]).toEqual([preset, tax]);
});
Then(/^it (takes no|takes) a loan$/, (s, w: string) => {
  expect(s.aiOut.takeLoan).toBe(w === "takes");
});
Then(/^it gives a gift to (no one|"[^"]+")$/, (s, who: string) => {
  expect(s.aiOut.giftTo).toBe(who === "no one" ? null : who.slice(1, -1));
});
Then("it grants {int} provinces as fiefs", (s, n: number) => {
  expect(s.aiOut.grantFiefs).toBe(n);
});

// starting values
const LEVELS: M.Level[] = ["very_low", "low", "moderate", "high", "very_high"];
Given("the catalogue rates the country {string} on {string}", (s, _c: string, assessment: string) => {
  s.assessment = assessment;
});
When("the campaign starts", (s) => {
  if (s.assessment) {
    const dims = s.assessment.split(" and ");
    // A good rating is a high level, except for unrest risk, where it is a low one.
    const mirror = (lvl: M.Level): M.Level => LEVELS[4 - LEVELS.indexOf(lvl)]!;
    const at = (lvl: M.Level) => M.startingCounts(Object.fromEntries(dims.map((d: string) => [d, d === "unrest_risk" ? mirror(lvl) : lvl])), 9500, 52, "high", new Rng(1));
    s.low = at("very_low");
    s.high = at("very_high");
  }
  if (s.historical) {
    s.placed = M.characterFor(s.historical, () => ({ name: "generated", sex: "m", age: 30 }) as M.Person);
    s.generatedOnly = M.characterFor<M.Person>(undefined, () => ({ name: "generated", sex: "m", age: 30 }));
  }
  if (s.relationsFile) s.relations = loadRelations();
});
Given("the date is {int}", (s, year: number) => {
  s.year = year;
});
Then(/^that rating sets its (.+)$/, (s, _stats: string) => {
  for (const key of M.ASSESSMENT_SETS[s.assessment]!) expect(s.low[key]).not.toBe(s.high[key]);
});
Given("the catalogue has {string} confidence in the country {string}", (s, conf: M.Confidence) => {
  s.confidence = conf;
});
When("two campaigns start", (s) => {
  const run = (conf: M.Confidence, seed: number) => M.startingCounts({}, 2000, 20, conf, new Rng(seed));
  s.spreadOf = (conf: M.Confidence) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let seed = 1; seed <= 200; seed++) {
      const g = run(conf, seed).gold;
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
    }
    return { lo, hi, mid: run(conf, 1).gold && M.startingCounts({}, 2000, 20, "high", new Rng(0)).gold };
  };
  s.run = run;
});
Then("the starting counts of {string} vary more between them than those of a country with high confidence", (s) => {
  const low = s.spreadOf(s.confidence);
  const high = s.spreadOf("high");
  expect(low.hi - low.lo).toBeGreaterThan(high.hi - high.lo);
});
Then("each count stays within {int} % of its middle value", (s, pct: number) => {
  const mid = 2000 * M.realmConfig.starting.per_thousand_people.gold[2]!;
  const r = s.spreadOf(s.confidence);
  expect(r.lo).toBeGreaterThanOrEqual(Math.floor(mid * (1 - pct / 100)));
  expect(r.hi).toBeLessThanOrEqual(Math.ceil(mid * (1 + pct / 100)));
});
Then("the same seed gives the same counts", (s) => {
  expect(s.run(s.confidence, 7)).toEqual(s.run(s.confidence, 7));
});
function loadRelations(): M.Relation1444[] {
  return (relations1444 as { relations: M.Relation1444[] }).relations;
}
Given("the relations file {string}", (s, file: string) => {
  expect(file).toBe("country-relations/data/relations-1444.json");
  s.relationsFile = file;
});
Then("each country's allies, rivals, subjects and enemies come from it", (s) => {
  const h = M.standingFrom1444(s.relations, "hungary");
  expect(h.allies).toEqual(["papal_states", "wallachia"]);
  expect(h.enemies).toEqual(["ottoman"]);
  expect(h.subjects).toEqual(["croatia", "ragusa", "transylvania"]);
});
Then("the lords of major countries come from the catalogue's history text", () => {
  const houses = (M.realmConfig.starting_lords.great_houses as Record<string, string[]>).france!;
  expect(M.startingLords(52, houses).names).toContain("armagnac");
});

// food policy and food year
Given("a French army refills its food reserve at home in {string}, a lord's province {string} or a royal province", (s, home: string, lordsLand: string) => {
  s.refill = { home, lordsLand };
});
Given("the army refill rule is {string}", (s, rule: string) => {
  // The same words set the rule in an outline row and check the default afterwards.
  if (s.refillRule !== undefined && s.fromHome !== undefined) {
    expect(s.refillRule).toBe(rule);
    return;
  }
  s.refillRule = rule;
  s.fromHome = M.armyRefillSource(rule, false);
  s.fromLord = M.armyRefillSource(rule, true);
});
Then("it is taken from the province's local store", (s) => {
  expect(s.fromHome).toBe("locals");
});
Then("the castle hands it out before the locals give", (s) => {
  expect(s.fromHome).toBe("castle_then_locals");
});
Then("it cannot refill in {string}", (s) => {
  expect(s.fromLord).toBe("none");
  expect(s.fromHome).toBe("locals");
});
Given("the country {string} has not changed its army refill rule", (s) => {
  s.refillRule = M.realmConfig.food.army_refill_default;
});
When("a French army refills its food reserve at home in {string}", (s) => {
  s.fromHome = M.armyRefillSource(s.refillRule, false);
});
// Larger than its share by people alone.
const perPerson = (s: S, c: { id: string; people: number }) => s.shares[c.id] / c.people;
Then("each castle's share is larger for border castles", (s) => {
  const border = s.castles.filter((c: { border?: boolean }) => c.border);
  const other = s.castles.find((c: { border?: boolean }) => !c.border);
  for (const c of border) expect(perPerson(s, c)).toBeGreaterThan(perPerson(s, other));
});
Then("each castle's share is larger for the capital's castle", (s) => {
  const cap = s.castles.find((c: { capital?: boolean }) => c.capital);
  for (const c of s.castles) if (c !== cap) expect(perPerson(s, cap)).toBeGreaterThan(perPerson(s, c));
});
Given(/^the castles of "([^"]+)" \(capital, (\d+) people\), "([^"]+)" \(border, (\d+) people\) and "([^"]+)" \((\d+) people\)$/, (s, a: string, pa: string, b: string, pb: string, c: string, pc: string) => {
  s.castles = [
    { id: a, people: num(pa), capital: true },
    { id: b, people: num(pb), border: true },
    { id: c, people: num(pc) },
  ];
});
Then("{string} gets half of the food and the other two a quarter each", (s, castle: string) => {
  for (const c of s.castles) expect(s.shares[c.id]).toBeCloseTo(c.id === castle ? 0.5 : 0.25);
});
Given("the castle of {string} holds more than its share and {string} less", (s, a: string, b: string) => {
  s.exchange = { from: a, to: b, sent: 1000, provinces: 3 };
});
When("the castles exchange food until each holds its share", (s) => {
  s.arrived = M.transferArrives(s.exchange.sent, s.exchange.provinces);
});
Then("the food sent from {string} to {string} arrives with less than was sent, losing some for every province it travels", (s) => {
  expect(s.arrived).toBeLessThan(s.exchange.sent);
  expect(M.transferArrives(1000, 4)).toBeLessThan(s.arrived);
});
Then(re(`${NUM} food sent (\\d+) provinces arrives as ${NUM}`), (s, sent: string, n: string, arrives: string) => {
  expect(Math.round(M.transferArrives(num(sent), num(n)))).toBe(num(arrives));
});
Given("the castles of {string} and {string} hold the same food and only {string} has a granary", (s, a: string, b: string) => {
  s.rot = { [a]: { store: 1000, granary: true }, [b]: { store: 1000, granary: false } };
});
When("a season passes", (s) => {
  s.after = Object.fromEntries(Object.entries(s.rot as Record<string, { store: number; granary: boolean }>).map(([k, v]) => [k, M.rotSeason(v.store, v.granary)]));
});
Then("both lose some food to rot", (s) => {
  for (const v of Object.values(s.after as Record<string, number>)) expect(v).toBeLessThan(1000);
});
Then("{string} loses less", (s, castle: string) => {
  const others = Object.entries(s.after as Record<string, number>).filter(([k]) => k !== castle);
  for (const [, v] of others) expect(s.after[castle]).toBeGreaterThan(v);
});
Then("{string} loses {float} % and {string} {int} %", (s, a: string, pa: number, b: string, pb: number) => {
  expect(1000 - s.after[a]).toBeCloseTo(pa * 10);
  expect(1000 - s.after[b]).toBeCloseTo(pb * 10);
});
Given("a province lies at latitude {int}", (s, lat: number) => {
  s.lat = lat;
});
When("its harvest month is worked out", (s) => {
  s.harvestMonth = M.harvestMonth(s.lat);
});
Then("its harvest comes in {word}", (s, month: string) => {
  expect(s.harvestMonth).toBe(MONTHS.indexOf(month) + 1);
});
Given("a weather region rolls its harvest weather many times", (s) => {
  const rng = new Rng(11);
  s.weather = { bad: 0, good: 0, normal: 0 };
  for (let i = 0; i < 6000; i++) s.weather[M.rollRegionWeather(rng)]++;
});
When("the rolls are counted", () => {});
Then("about 1 in 6 is bad, 1 in 6 is good and the rest normal", (s) => {
  expect(Math.abs(s.weather.bad - 1000)).toBeLessThan(120);
  expect(Math.abs(s.weather.good - 1000)).toBeLessThan(120);
});
Given(/^the castle of "([^"]+)" stands on a (track|road|paved road|turnpike|railway)$/, (s, _c: string, road: string) => {
  s.road = road;
});
When("its reach is worked out", (s) => {
  s.reach = M.reachByRoad(s.road);
});
Then("it feeds {int} rings", (s, n: number) => {
  expect(s.reach).toBe(n);
});

// grain
Given("the realm's grain price is {float} gold a food", (s, price: number) => {
  expect(M.grainPrice()).toBe(price);
});
const grainCauses = ["the harvests across the region are bad", "war closes the roads", "a blockade closes the port", "the harvests are good", "a trade route opens to the province"];
When(re(`(${grainCauses.map(esc).join("|")})`), (s, cause: string) => {
  s.price = M.grainPrice(cause);
});
Then("the grain price stays {float} gold a food", (s, price: number) => {
  expect(s.price).toBe(price);
});
When("it sells {int} food of surplus grain", (s, food: number) => {
  s.treasury ??= { gold: s.values?.value ?? s.gold ?? 300, loans: [], oaths: [] };
  M.grainTrade(s.treasury, food, "sell");
});
When("it buys {int} food of grain", (s, food: number) => {
  M.grainTrade(s.treasury, food, "buy");
});

// officials
Given(/^the country "([^"]+)" knows (nothing|[A-Z]\d+(?:(?:, | and )[A-Z]\d+)*)$/, (s, _c: string, list: string) => {
  s.known = new Set(list === "nothing" ? [] : list.split(/, | and /));
});
When("it works out how many officials its {int} royal provinces need", (s, n: number) => {
  s.per = M.provincesPerOfficial(s.known);
  s.needed = M.officialsNeeded(n, s.known);
});
Then("one official runs {int} provinces and it needs {int} officials", (s, per: number, needed: number) => {
  expect([s.per, s.needed]).toEqual([per, needed]);
});
const officialCauses: Record<string, string> = {
  "it hires one for gold up front": "hired",
  "a school graduates one": "graduated",
  "it dismisses one": "dismissed",
  "it leaves wages unpaid and one leaves": "wages_unpaid",
  "war in a province kills its official": "war_in_province",
};
Given("the country {string} has {int} officials", (s, _c: string, n: number) => setOrExpect(s, "officials", n));
When(re(`(${Object.keys(officialCauses).map(esc).join("|")})`), (s, phrase: string) => {
  s.values.value = M.applyCause(s.values.value, "officials", officialCauses[phrase]!, 1);
});

// ruler, regents, great lords
Given("the country {string} has a government form whose succession is {string}", (s, country: string, succession: string) => {
  s.form = { country, succession };
});
When("its throne law is worked out", (s) => {
  s.throneLaw = M.throneLawFor(s.form.succession, s.form.country);
});
Then("it is {string}", (s, law: string) => {
  expect(s.throneLaw).toBe(law);
});
Given("the country {string} passes the crown only through men", (s, country: string) => {
  expect(M.daughtersInheritCrown(country)).toBe(false);
});
When("the player looks for a way to change it", (s) => {
  s.commands = M.INHERITANCE_COMMANDS;
});
Then("no command changes the inheritance law", (s) => {
  expect(s.commands).toEqual([]);
});
Then("an event or a reform can change it", () => {
  expect(M.INHERITANCE_CHANGED_BY).toEqual(["event", "reform"]);
  expect(M.throneLawFor("Lords elect", "France")).toBe("election by lords");
});
Given("the lord {string} of {string} holds {int} provinces and is {string}", (s, name: string, _c: string, n: number, loyalty: M.Loyalty) => {
  s.lord = { name, house: name, provinces: Array.from({ length: n }, (_, i) => `${name} ${i + 1}`), retinue: 0, wealth: 0, traits: [], loyalty, sons: [] } satisfies M.Lord;
});
When("he receives {int} gifts of gold", (s, n: number) => {
  for (let i = 0; i < n; i++) M.loyaltyCause(s.lord, "gift_of_gold");
});
Then("he is {string}", (s, loyalty: string) => {
  expect(s.lord.loyalty).toBe(loyalty);
});
Given("the ruler of {string} dies and his heir is {int} years old", (s, country: string, age: number) => {
  s.realm = M.newRealm(country);
  s.realm.lords.push(
    { name: "Armagnac", house: "Armagnac", provinces: ["Auch"], retinue: 0, wealth: 0, traits: [], loyalty: "Wavering", sons: [] },
    { name: "Bourbon", house: "Bourbon", provinces: ["Moulins", "Clermont"], retinue: 0, wealth: 0, traits: [], loyalty: "Loyal", sons: [] },
    { name: "Foix", house: "Foix", provinces: ["Foix"], retinue: 0, wealth: 0, traits: [], loyalty: "Loyal", sons: [] },
  );
  s.ruler = { name: "Charles VII", age: 60, years: 40, heirs: [{ name: "Louis", sex: "m", age, relation: "child" }], traits: [] } satisfies M.Ruler;
});
When("the heir takes the throne", (s) => {
  s.before = s.realm.lords.map((l: M.Lord) => M.loyaltyRank(l.loyalty));
  const heir = M.successor("eldest son", s.ruler.heirs);
  expect(heir).not.toBe("succession war");
  M.crown(s.realm, s.ruler, heir as M.Person);
  if (s.ruler.age < M.CHILD_UNDER) for (const l of s.realm.lords) M.loyaltyCause(l, "child_ruler");
  s.regent = M.regentFor(s.realm, s.queenMother);
});
Then("a regent rules for him", (s) => {
  expect(s.ruler.age).toBeLessThan(M.CHILD_UNDER);
  expect(s.regent).not.toBeNull();
});
Then("lords lose loyalty for a child ruler", (s) => {
  const after = s.realm.lords.map((l: M.Lord) => M.loyaltyRank(l.loyalty));
  after.forEach((a: number, i: number) => expect(a).toBeGreaterThanOrEqual(s.before[i]));
  expect(M.realmConfig.loyalty.down).toContain("child_ruler");
});
Given("the queen mother {string} lives", (s, name: string) => {
  s.queenMother = name;
});
Given("there is no queen mother", (s) => {
  s.queenMother = undefined;
});
Then(/^the regent is (?:the most loyal lord, )?"([^"]+)"$/, (s, name: string) => {
  const regent = M.regentFor(s.realm, s.queenMother);
  expect(regent).toBe(name);
});

// treasury
Given("the lord {string} has lent {int} gold to the country {string}", (s, name: string, gold: number, country: string) => {
  s.realm = M.newRealm(country);
  s.lord = { name, house: name, provinces: ["Auch"], retinue: 0, wealth: gold, traits: [], loyalty: "Loyal", sons: [] } satisfies M.Lord;
  s.realm.lords.push(s.lord);
  s.loan = M.lordLoan(s.realm, s.lord, gold);
});
When("the lord {string} makes demands of the ruler", (s) => {
  s.demanding = M.effectiveLoyalty(s.lord);
});
Then("the lord {string} is more demanding than if he were not owed money", (s) => {
  const notOwed: M.Lord = { ...s.lord, owed: 0 };
  expect(M.loyaltyRank(s.demanding)).toBeGreaterThan(M.loyaltyRank(M.effectiveLoyalty(notOwed)));
  expect(s.loan.interestPct).toBe(0);
});
Given("the country {string} has the realm tax default {string}", (s, _c: string, rate: M.TaxRate) => {
  s.taxDefault = rate;
});
When("the country {string} raises the realm tax default to {string}", (s, _c: string, rate: string) => {
  s.raised = M.raiseTaxDefault(s.taxDefault);
  expect(s.raised.rate).toBe(rate);
});
Then("more gold reaches the treasury", (s) => {
  expect(s.raised.goldFactor).toBeGreaterThan(1);
});
Then("lords waver", (s) => {
  expect(s.raised.lordsWaver).toBe(true);
  const l: M.Lord = { name: "x", house: "x", provinces: ["a"], retinue: 0, wealth: 0, traits: [], loyalty: "Loyal", sons: [] };
  expect(M.loyaltyCause(l, "heavy_taxes")).toBe("Wavering");
});
Then("provinces become more likely to revolt", (s) => {
  expect(s.raised.revoltLikelier).toBe(true);
});
When("the tax steps are read", (s) => {
  s.steps = s.cfg.tax_rates;
});
Then("they are {string}, {string}, {string}, {string} and {string}", (s, ...steps: string[]) => {
  expect(s.steps).toEqual(steps);
});
Then("a revolt forces {string} down to {string}", (_s, a: M.TaxRate, b: string) => {
  expect(M.forceTaxDown(a)).toBe(b);
});
Given("it has a yearly income of {int} gold", (s, n: number) => {
  s.income = n;
});
When("it asks a bank for a loan", (s) => {
  s.offer = { cap: M.loanCap(s.income, s.known), pct: M.interestPct(s.known) };
  s.income = undefined;
});
Then("the bank lends at most {int} gold at {float} % a year", (s, cap: number, pct: number) => {
  expect(s.offer.cap).toBe(cap);
  expect(s.offer.pct).toBeCloseTo(pct);
});

// fallen and windows
Given(re(`the country "([^"]+)" lost ${NUM} soldiers (\\d+) years ago`), (s, _c: string, n: string, years: string) => {
  s.fallenEntries = [{ date: { year: 1500 - num(years) }, count: num(n) }];
});
When("the player opens its card", (s) => {
  s.fallenCount = M.withinWindow(s.fallenEntries, { year: 1500 }, "fallen");
});
Then(re(`its Fallen count includes ${NUM} of them`), (s, n: string) => {
  expect(s.fallenCount).toBe(num(n));
  expect(M.WINDOWS_ARE_HARD).toBe(true);
});

// starting lords
When("the country {string} is set up", (s, country: string) => {
  const id = country.toLowerCase();
  const houses = (M.realmConfig.starting_lords.great_houses as Record<string, string[]>)[id] ?? [];
  const provinces = id === "france" ? 52 : 8;
  s.startLords = M.startingLords(provinces, houses);
});
Then("it starts with its great houses from the catalogue, e.g. Armagnac, Bourbon and Orléans", (s) => {
  for (const h of ["armagnac", "bourbon", "orleans"]) expect(s.startLords.names).toContain(h);
  for (const h of s.startLords.names) expect(M.isGreatHouseType(greatHouseType(h))).toBe(true);
});
Then("it starts with a few generated lords sized to its realm", (s) => {
  expect(s.startLords.names).toEqual([]);
  expect(s.startLords.generated).toBe(2);
});
function greatHouseType(id: string): string {
  const types: Record<string, string> = { alencon: "duchy", anjou: "duchy", armagnac: "county", bourbon: "duchy", foix: "county", nevers: "county", orleans: "duchy" };
  return types[id] ?? "kingdom";
}

// lands taken: realm keeps the count; diplomacy's league threshold decides whether neighbours band together (REALM-125, REALM-158)
const leagueThresholdEraI = (diplomacyConfig as { leagues: { threshold_by_era: Record<string, number> } }).leagues.threshold_by_era.I!;
Given("the country {string} has seized many provinces in the last 20 years", (s) => {
  s.today = { year: 1480 };
  s.taken = [{ date: { year: 1470 }, count: leagueThresholdEraI + 2 }];
});
When("its neighbours weigh the threat", (s) => {
  s.takenCount = M.withinWindow(s.taken, s.today, "lands_taken");
});
Then("they band together against it", (s) => {
  expect(s.takenCount).toBeGreaterThanOrEqual(leagueThresholdEraI);
  expect(M.cardExtraLines()).toContain("Leagues against you");
});
When("it gives land back", (s) => {
  s.taken[0].count = M.applyCause(s.taken[0].count, "lands_taken", "land_given_back", 3);
  s.after = M.withinWindow(s.taken, s.today, "lands_taken");
});
Then("its lands taken fall", (s) => {
  expect(s.after).toBeLessThan(s.takenCount);
});

// ------------------------------------------------------------ tax rates and the treasury ledger (milestone 3)
// These run against the game itself: a fresh 1444 world, orders as the player gives them.

type GW = G.World;
const GAME_RULES = loadDefaultRuleset();
const realmOf = (s: S, name: string): number => (s.game as GW).nationIndex.get(GAME_RULES.nations.find((n) => n.name === name)!.id)!;
const provinceOf = (name: string): number => GAME_RULES.provinces.findIndex((p) => p.name === name);
const rateOf = (name: string): number => G.TAX_RATES.indexOf(name as (typeof G.TAX_RATES)[number]);
const ledger = (s: S, realm: string, line: string): number => (s.game as GW).nationLedger[realmOf(s, realm) * G.LEDGER_LINES + G.LEDGER.indexOf(line as (typeof G.LEDGER)[number])]!;
function order(s: S, realm: string, o: G.Order): void {
  s.refused = G.applyNow(s.game, o, realmOf(s, realm)).rejectedOrders[0]?.reason ?? null;
  G.runLedger(s.game, false);
}

Given("the game starts with the country {string}", (s, realm: string) => {
  s.game = G.createWorld(GAME_RULES, 1);
  s.game.player = realmOf(s, realm);
});
Given("the game starts with the AI country {string}", (s) => {
  s.game = G.createWorld(GAME_RULES, 1);
});
Then("the realm tax default of {string} is {string}", (s, realm: string, rate: string) => {
  expect(s.game.nationTaxDefault[realmOf(s, realm)]).toBe(rateOf(rate));
});
Then("the province {string} follows the realm default", (s, p: string) => {
  expect(s.game.provinceTax[provinceOf(p)]).toBe(-1);
});
When("{string} taxes the province {string} {string}", (s, realm: string, p: string, rate: string) => {
  s.normalTax ??= G.provinceTax(s.game, provinceOf(p), realmOf(s, realm));
  order(s, realm, { type: "setTax", province: provinceOf(p), rate: rateOf(rate) });
});
When("{string} sets the realm tax default to {string}", (s, realm: string, rate: string) => {
  order(s, realm, { type: "setTax", province: -1, rate: rateOf(rate) });
});
When("{string} puts the province {string} back on the realm default", (s, realm: string, p: string) => {
  order(s, realm, { type: "setTax", province: provinceOf(p), rate: -1 });
});
Then("the province {string} pays at {string}", (s, p: string, rate: string) => {
  const i = provinceOf(p);
  expect(G.taxRateOf(s.game, i, s.game.provinceOwner[i])).toBe(rateOf(rate));
});
Then("a province of {string} without its own rate pays at {string}", (s, realm: string, rate: string) => {
  const n = realmOf(s, realm);
  const p = Array.from(s.game.provinceOwner as Int16Array).findIndex((o, i) => o === n && s.game.provinceTax[i] === -1);
  expect(G.taxRateOf(s.game, p, n)).toBe(rateOf(rate));
});
Then(re(`the province "([^"]+)" pays ([\\d.]+) times its tax at "normal"`), (s, p: string, factor: string) => {
  const i = provinceOf(p);
  expect(G.provinceTax(s.game, i, s.game.provinceOwner[i])).toBeCloseTo(s.normalTax * Number(factor));
});
Then("the order is refused with {string}", (s, why: string) => {
  expect(s.refused).toBe(why);
});
Then("the order is refused", (s) => {
  expect(s.refused).toBeTruthy();
});
Then("the ledger of {string} shows no tax", (s, realm: string) => {
  expect(ledger(s, realm, "tax")).toBe(0);
});
Then("the ledger of {string} shows trade", (s, realm: string) => {
  expect(ledger(s, realm, "trade")).toBeGreaterThan(0);
});
Then(/^the ledger of "([^"]+)" has the lines (.+)$/, (s, _realm: string, lines: string) => {
  expect([...G.LEDGER]).toEqual([...lines.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
});
Then("the monthly income of {string} is the sum of its ledger", (s, realm: string) => {
  expect(s.game.nationMonthlyIncome[realmOf(s, realm)]).toBeCloseTo(G.LEDGER.reduce((t, l) => t + ledger(s, realm, l), 0));
});
When("a new month begins", (s) => {
  const n = s.game.player;
  s.goldBefore = s.game.nationTreasury[n];
  while (G.monthBeginning(s.game.date) === null) {
    G.processTurn(s.game, [], n);
    s.goldBefore = s.game.nationTreasury[n];
  }
  G.processTurn(s.game, [], n);
});
Then("the month's income is paid into the treasury of {string}", (s, realm: string) => {
  const n = realmOf(s, realm);
  expect(s.game.nationTreasury[n]).toBeCloseTo(s.goldBefore + s.game.nationMonthlyIncome[n]);
});
const officialsAtPost = (s: S, n: number): number => {
  let k = 0;
  for (let p = 0; p < s.game.provinceCount; p++) if (s.game.provinceOwner[p] === n && s.game.provinceOfficial[p] >= 0) k++;
  return k;
};
Then("the officials line of {string} is one wage for each official at his post", (s, realm: string) => {
  const n = realmOf(s, realm);
  s.officials = officialsAtPost(s, n);
  expect(s.officials).toBeGreaterThan(0);
  expect(ledger(s, realm, "officials")).toBeCloseTo(-s.officials * GAME_RULES.defines.economy.officialWagePerMonth);
});
When("{string} commissions the official of {string}", (s, realm: string, p: string) => {
  order(s, realm, { type: "commission", province: provinceOf(p) });
  expect(s.refused).toBe(null);
});
Then("the officials line of {string} is one wage smaller", (s, realm: string) => {
  expect(ledger(s, realm, "officials")).toBeCloseTo(-(s.officials - 1) * GAME_RULES.defines.economy.officialWagePerMonth);
});
const yearsIncome = (s: S, realm: string) => 12 * (ledger(s, realm, "tax") + ledger(s, realm, "trade"));
Then("lenders would give {string} a year's tax and trade", (s, realm: string) => {
  s.cap = yearsIncome(s, realm);
  expect(G.canBorrow(s.game, realmOf(s, realm))).toBeCloseTo(s.cap);
});
When(re(`"([^"]+)" borrows ${NUM} gold`), (s, realm: string, gold: string) => {
  s.goldBefore = s.game.nationTreasury[realmOf(s, realm)];
  order(s, realm, { type: "borrow", gold: num(gold) });
});
Then(re(`"([^"]+)" has ${NUM} gold more and owes ${NUM} gold`), (s, realm: string, more: string, owed: string) => {
  const n = realmOf(s, realm);
  expect(s.refused).toBe(null);
  expect(s.game.nationTreasury[n]).toBeCloseTo(s.goldBefore + num(more));
  expect(s.game.nationDebt[n]).toBeCloseTo(num(owed));
});
Then(re(`the interest line of "([^"]+)" is ${NUM} % of ${NUM} gold a year, paid monthly`), (s, realm: string, pct: string, gold: string) => {
  expect(ledger(s, realm, "interest")).toBeCloseTo(-(num(gold) * num(pct)) / 100 / 12);
});
Then(re(`lenders would give "([^"]+)" ${NUM} gold less`), (s, realm: string, less: string) => {
  expect(G.canBorrow(s.game, realmOf(s, realm))).toBeCloseTo(s.cap - num(less));
});
When("{string} borrows more than lenders would give", (s, realm: string) => {
  order(s, realm, { type: "borrow", gold: G.canBorrow(s.game, realmOf(s, realm)) + 1 });
});
When(re(`"([^"]+)" repays ${NUM} gold`), (s, realm: string, gold: string) => {
  order(s, realm, { type: "repay", gold: num(gold) });
});
Then(re(`"([^"]+)" owes ${NUM} gold`), (s, realm: string, gold: string) => {
  expect(s.game.nationDebt[realmOf(s, realm)]).toBeCloseTo(num(gold));
});
Then("{string} owes nothing", (s, realm: string) => {
  expect(s.game.nationDebt[realmOf(s, realm)]).toBe(0);
});
Given(re(`"([^"]+)" is (at peace|at war) with (-?[\\d,]+) gold`), (s, realm: string, state: string, gold: string) => {
  const n = realmOf(s, realm);
  const id = s.game.nationIds[n];
  s.game.diplomacy.wars = s.game.diplomacy.wars.filter((w: { attackers: string[]; defenders: string[] }) => !w.attackers.includes(id) && !w.defenders.includes(id));
  if (state === "at war") {
    const foe = s.game.nationIds[realmOf(s, "Austria")];
    s.game.diplomacy.wars.push({ ...structuredClone(s.game.diplomacy.wars[0] ?? {}), id: "test-war", attackers: [foe], defenders: [id] });
  }
  s.game.nationTreasury[n] = Number(gold.replace(/,/g, ""));
});
When("the AI plans its treasury", (s) => {
  G.aiTreasury(s.game, []);
});
Then("{string} borrows enough to bring its gold above zero", (s, realm: string) => {
  const n = realmOf(s, realm);
  expect(s.game.nationDebt[n]).toBeGreaterThan(0);
  expect(s.game.nationTreasury[n]).toBeGreaterThan(0);
});
