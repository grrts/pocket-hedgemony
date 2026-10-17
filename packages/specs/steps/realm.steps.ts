import { expect } from "vitest";
import { steps } from "../src/registry.ts";
import * as M from "@ph/engine/domain/realm";
import * as R from "@ph/engine/domain/research";
import { loadDefaultRuleset } from "@ph/rules";

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
  s.card ??= franceCard();
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
  s.castles = Array.from({ length: n }, (_, i) => ({ id: `c${i}`, people: 100 + i * 50 }));
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
  "is sold for gold": "sold",
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
When("the campaign starts", (s) => {
  s.placed = M.characterFor(s.historical, () => ({ name: "generated", sex: "m", age: 30 }) as M.Person);
  s.generatedOnly = M.characterFor<M.Person>(undefined, () => ({ name: "generated", sex: "m", age: 30 }));
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
  s.oathCount = M.withinWindow(s.oaths, s.today, "oaths_broken");
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
  if (s.yearly) s.wins = M.winsByLead(s.yearly, s.leader);
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
});
Then("the country {string} wins by the Economy score", (s) => {
  expect(s.wins).toBe(true);
  expect(M.winsByLead(s.yearly.slice(1), s.leader)).toBe(false);
});
