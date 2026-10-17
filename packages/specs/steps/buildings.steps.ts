import { expect } from "vitest";
import { Rng } from "@ph/engine";
import * as B from "@ph/engine/domain/buildings";
import { steps, type Scenario } from "../src/registry.ts";
import ports1444 from "../../rules/data/domain/naval-ports-1444.json" with { type: "json" };

const TIER_STEP: Record<string, number> = { small: 1, port: 2, great: 3 };
/** Harbour step per province from the naval ports-1444 list (D-BLD-8): the best tier there; landings have none. */
const PORTS = new Map<string, number>();
for (const t of ports1444.towns as { province: string; tier: string }[]) {
  const step = TIER_STEP[t.tier];
  if (step) PORTS.set(t.province, Math.max(step, PORTS.get(t.province) ?? 0));
}

const { Given, When, Then } = steps("buildings");

// ---------------------------------------------------------------- helpers

/** Every invention the catalogue unlocks with: a realm knows all unless a step says otherwise. */
const allInventions = new Set(B.buildingsConfig.buildings.flatMap((b) => b.steps.map((s) => s.unlocked_by)).filter((x) => x !== "start"));

function R(s: Scenario): B.Realm {
  return (s.r ??= B.createRealm("France", { treasury: 1000, inventions: new Set(allInventions) }));
}

function rng(s: Scenario): Rng {
  return (s.rng ??= new Rng(1444));
}

function later(s: Scenario, fn: () => void): void {
  (s.pending ??= []).push(fn);
}

const defaultTiles: B.Tile[] = [
  { use: "fields" },
  { use: "fields" },
  { use: "fields" },
  { use: "fields" },
  { use: "fields" },
  { use: "pasture" },
  { use: "pasture" },
  { use: "woods" },
  { use: "woods" },
  { use: "hills" },
  { use: "marsh" },
  { use: "waste" },
];

/** A province of the realm, created on first mention: a city with 12 tiles and 3 shore tiles, a market charter. */
function P(s: Scenario, id: string, init: Partial<B.Province> = {}): B.Province {
  const r = R(s);
  const p = r.provinces.get(id);
  if (p) return Object.assign(p, init);
  return B.addProvince(r, id, {
    townSize: "city",
    tiles: defaultTiles.map((t) => ({ ...t })),
    shoreTiles: 3,
    charters: new Set(["market charter"]),
    ...init,
  });
}

function place(s: Scenario, provinceId: string, type: string, init: Partial<B.Building> = {}): B.Building {
  const { type: t, step } = B.findStep(type);
  const at = B.freePlace(R(s), provinceId, t.id);
  if (!at) throw new Error(`no place for ${type} in ${provinceId}`);
  return B.placeBuilding(R(s), provinceId, t.id, at, { step, ...init });
}

function build(s: Scenario, provinceId: string, type: string, opts: { place?: string; faith?: string; owner?: B.Owner } = {}): B.StartResult {
  const res = B.startSite(R(s), provinceId, B.findStep(type).type.id, opts);
  if (res.ok) B.completeSite(R(s), res.site);
  return res;
}

const sizeOf = (text: string) => text.replace(/ /g, "_") as B.TownSize;
const ownerOf = (text: string): B.Owner => text.replace(/^the /, "");
const faithOfName: Record<string, string> = { church: "christian", synagogue: "jewish", mosque: "muslim" };

// ---------------------------------------------------------------- shared

Given("the buildings config of the design", (s) => {
  s.config = B.buildingsConfig;
});

When("the building rules are applied", (s) => {
  const list: (() => void)[] = s.pending ?? [];
  s.pending = [];
  for (const fn of list) fn();
});

Then("the build is refused", (s) => {
  expect(s.check.ok).toBe(false);
});

Then("it is refused", (s) => {
  expect(s.check.ok).toBe(false);
});

// ---------------------------------------------------------------- places and slots

Given(/^the province "([^"]+)" has a (fields tile|shore tile|castle tile) with a "([^"]+)" on it$/, (s, p: string, tile: string, existing: string) => {
  P(s, p);
  s.place = tile === "fields tile" ? "tile:1" : tile === "shore tile" ? "shore:1" : "castle";
  B.placeBuilding(R(s), p, B.findStep(existing).type.id, s.place);
  s.province = p;
});

When(/^the player tries to build a "([^"]+)" on the same (fields tile|shore tile|castle tile)$/, (s, type: string) => {
  s.check = B.canBuild(R(s), s.province, B.findStep(type).type.id, s.place);
});

Then("the build is refused because the place is taken", (s) => {
  expect(s.check).toEqual({ ok: false, reason: "the place is taken" });
});

Given("the province {string} has an empty woods tile", (s, p: string) => {
  P(s, p);
  s.province = p;
  s.place = "tile:8";
});

When("the player opens the build sheet for the woods tile", (s) => {
  s.sheet = B.buildSheet(R(s), s.province, s.place);
});

Then(/^the "([^"]+)" is (offered|grey with needs)$/, (s, type: string, shown: string) => {
  const row = (s.sheet as B.SheetRow[]).find((x) => x.type === B.findStep(type).type.id);
  expect(row).toBeDefined();
  expect(row!.grey).toBe(shown !== "offered");
  if (shown !== "offered") expect(row!.missing).toMatch(/^needs /);
});

Then("the {string} is not offered on the woods tile", (s, type: string) => {
  expect((s.sheet as B.SheetRow[]).some((x) => x.type === type)).toBe(false);
});

Given("the province {string} has a stone castle on its castle tile", (s, p: string) => {
  P(s, p);
  B.placeBuilding(R(s), p, "castle", "castle", { step: 2 });
  s.province = p;
});

When("the player builds a {string}", (s, type: string) => {
  const p = B.prov(R(s), s.province);
  s.slotsBefore = B.townSlotsUsed(p);
  s.tilesBefore = p.buildings.filter((b) => b.place.startsWith("tile:")).length;
  s.check = build(s, s.province, type);
  expect(s.check.ok).toBe(true);
  s.built = p.buildings.find((b) => b.type === B.findStep(type).type.id);
});

Then("the granary is part of the castle and takes no other tile or slot", (s) => {
  const p = B.prov(R(s), s.province);
  expect(s.built.place).toBe("castle:granary");
  expect(B.townSlotsUsed(p)).toBe(s.slotsBefore);
  expect(p.buildings.filter((b) => b.place.startsWith("tile:")).length).toBe(s.tilesBefore);
});

Given("the province {string} has a town of size {string}", (s, p: string, size: string) => {
  P(s, p, { townSize: sizeOf(size) });
  s.province = p;
});

Given(/^the province "([^"]+)" (is|is not) the capital$/, (s, p: string, is: string) => {
  P(s, p, { capital: is === "is" });
});

Then("the town has {int} town slots", (s, n: number) => {
  const p = B.prov(R(s), s.province);
  expect(B.townSlots(p.townSize, p.capital)).toBe(n);
});

Given("the province {string} is the capital of the country {string}", (s, p: string) => {
  P(s, p, { capital: true, townSize: "great_city" });
  R(s).capital = p;
  s.province = p;
});

When("the player opens the build sheet for the capital's extra slot", (s) => {
  s.sheet = B.buildSheet(R(s), s.province, "capital_extra");
});

Then("only the {string} can be built there", (s, type: string) => {
  expect((s.sheet as B.SheetRow[]).map((x) => x.type)).toEqual([type]);
});

Given("the province {string} has all its town slots full", (s, p: string) => {
  P(s, p, { townSize: "town" });
  place(s, p, "school");
  for (let i = 0; i < 5; i++) place(s, p, "loom house");
  expect(B.townSlotsUsed(B.prov(R(s), p))).toBe(6);
  s.province = p;
});

Then("no town slot is used", (s) => {
  expect(B.townSlotsUsed(B.prov(R(s), s.province))).toBe(s.slotsBefore);
  expect(s.built.place.startsWith("town:")).toBe(false);
});

Given("the province {string} has {string} at step {string}", (s, p: string, type: string, step: string) => {
  P(s, p);
  s.walls = place(s, p, step);
  expect(s.walls.type).toBe(type);
  s.province = p;
});

When("the player tries to build a second {string}", (s, type: string) => {
  s.check = B.canBuild(R(s), s.province, type);
});

Then("the player may upgrade the {string} to {string}", (s, _type: string, to: string) => {
  const res = B.upgrade(R(s), s.province, s.walls);
  expect(res.ok).toBe(true);
  if (res.ok) expect(B.stepDef(res.site.type, res.site.step).name).toBe(to);
});

Given("the province {string} has a city with {int} town buildings", (s, p: string, n: number) => {
  P(s, p, { townSize: "city" });
  for (let i = 0; i < n; i++) place(s, p, "loom house");
  s.province = p;
});

Given("the town shrinks to a town of {int} slots", (s, slots: number) => {
  expect(B.townSlots("town")).toBe(slots);
  s.shrinkTo = "town";
});

When(/^the (player|AI) resolves the shrink$/, (s, who: string) => {
  const p = B.prov(R(s), s.province);
  s.chosen = who === "player" ? [p.buildings[0]!, p.buildings[4]!, p.buildings[5]!] : undefined;
  s.neglected = B.shrinkTown(R(s), s.province, s.shrinkTo, s.chosen);
});

Then("{int} town buildings become neglected and are kept", (s, n: number) => {
  const p = B.prov(R(s), s.province);
  expect(s.neglected).toHaveLength(n);
  expect(p.buildings.filter((b) => b.condition === "neglected")).toHaveLength(n);
  expect(p.buildings).toHaveLength(9);
});

Then(/^the neglected buildings are (the ones chosen on the prompt|the 3 newest)$/, (s, which: string) => {
  const p = B.prov(R(s), s.province);
  const expected = which.startsWith("the ones") ? s.chosen : p.buildings.slice(-3);
  expect(new Set(s.neglected)).toEqual(new Set(expected));
});

Then("they stay neglected until the town grows back", (s) => {
  const r = R(s);
  r.treasury = 1000;
  for (let m = 0; m < 6; m++) B.monthlyUpkeep(r);
  for (const b of s.neglected) expect(b.condition).toBe("neglected");
  B.growTown(r, s.province, "city");
  for (const b of s.neglected) expect(b.condition).toBe("sound");
});

const simpleBuildings: Record<string, string[]> = {
  "a library": ["school", "library"],
  "an observatory": ["school", "observatory"],
  "a telegraph office": ["telegraph office"],
  dykes: ["dykes"],
  "a weekly market": ["market"],
  "a market": ["market"],
  "a silver mine": ["mine"],
  "a bimaristan, wells and drains and an almshouse": ["hospital", "wells and drains", "almshouse"],
  "a lighthouse and a naval base": ["harbour:3", "lighthouse", "naval base"],
  "a sound market": ["market"],
};

Given(/^the province "([^"]+)" has (a library|an observatory|a telegraph office|dykes|a weekly market|a market|a silver mine|a bimaristan, wells and drains and an almshouse|a lighthouse and a naval base|a sound market)$/, (s, p: string, what: string) => {
  P(s, p);
  s.province = p;
  for (const spec of simpleBuildings[what]!) {
    const [type, step] = spec.split(":");
    const b = place(s, p, type!, step ? { step: Number(step) } : {});
    if (type === "mine") b.product = "silver";
    s.building = b;
  }
});

Given(/^the province "([^"]+)" has a "([^"]+)"$/, (s, p: string, type: string) => {
  P(s, p);
  s.province = p;
  s.building = place(s, p, type);
});

When(/^the player tries to build a second "([^"]+)" in "([^"]+)"$/, (s, type: string, p: string) => {
  s.check = B.canBuild(R(s), p, B.findStep(type).type.id);
  if (!s.check.ok) expect(s.check.reason).toMatch(/^one /);
});

Given("the province {string} is a city with a church", (s, p: string) => {
  P(s, p);
  place(s, p, "house of worship", { faith: "christian", name: "church" });
  s.province = p;
});

When(/^the player builds a synagogue and a mosque in "([^"]+)"$/, (s, p: string) => {
  B.addGold(R(s), "clergy", 1000);
  for (const name of ["synagogue", "mosque"]) expect(build(s, p, "house of worship", { faith: faithOfName[name]!, owner: "clergy" })).toMatchObject({ ok: true });
});

Then("the city has a church, a synagogue and a mosque side by side", (s) => {
  const faiths = B.prov(R(s), s.province).buildings.filter((b) => b.type === "house of worship").map((b) => b.faith);
  expect(faiths.sort()).toEqual(["christian", "jewish", "muslim"]);
});

Then("a second church in {string} is refused", (s, p: string) => {
  expect(B.canBuild(R(s), p, "house of worship", undefined, { faith: "christian" }).ok).toBe(false);
});

Given("the country {string} has a {string} in its capital {string}", (s, _c: string, type: string, capital: string) => {
  P(s, capital, { capital: true, townSize: "great_city" });
  R(s).capital = capital;
  B.placeBuilding(R(s), capital, type, type === "palace" ? "capital_extra" : B.freePlace(R(s), capital, type)!);
  P(s, "Troyes");
});

When(/^the player tries to build a "([^"]+)" in "([^"]+)"$/, (s, type: string, p: string) => {
  s.check = B.canBuild(R(s), p, type);
});

Given("the province {string} has {int} loom houses and {int} free town slots", (s, p: string, n: number, free: number) => {
  P(s, p, { townSize: "market_town" });
  for (let i = 0; i < n; i++) place(s, p, "loom house");
  P(s, p, { townSize: "town" });
  if (B.townSlots("town") - B.townSlotsUsed(B.prov(R(s), p)) === free + 1) place(s, p, "market");
  expect(B.townSlots("town") - B.townSlotsUsed(B.prov(R(s), p))).toBe(free);
  s.province = p;
});

When("the player builds {int} more loom houses", (s, n: number) => {
  for (let i = 0; i < n; i++) expect(build(s, s.province, "loom house").ok).toBe(true);
});

Then("{string} has {int} loom houses", (s, p: string, n: number) => {
  expect(B.prov(R(s), p).buildings.filter((b) => b.type === "loom house")).toHaveLength(n);
});

// ---------------------------------------------------------------- build sheet and costs

Given(/^the country "([^"]+)" (knows|doesn't know|does not know) "([A-Z]+\d+)[^"]*"$/, (s, _c: string, knows: string, id: string) => {
  if (knows === "knows") R(s).inventions.add(id);
  else R(s).inventions.delete(id);
});

When("the player opens the upgrade list for a farm in {string}", (s, p: string) => {
  P(s, p);
  s.sheet = B.upgradeList(R(s), p, place(s, p, "farm"));
});

Then("the {string} row is grey and says {string}", (s, name: string, says: string) => {
  const row = (s.sheet as B.SheetRow[]).find((x) => x.type === name)!;
  expect(row.grey).toBe(true);
  expect(row.missing).toBe(says);
});

Given("the country {string} has {int} gold", (s, _c: string, gold: number) => {
  R(s).treasury = gold;
});

When("the crown starts a {string} in {string} costing {int} gold, {int} timber and {int} months", (s, type: string, p: string, gold: number, timber: number, months: number) => {
  P(s, p, { ground: "farmland" });
  const c = B.costOf(type, 1);
  expect([c.gold, c.materials.timber, c.months]).toEqual([gold, timber, months]);
  const res = B.startSite(R(s), p, type);
  expect(res.ok).toBe(true);
  if (res.ok) s.site = res.site;
});

Then("the treasury of {string} has {int} gold at once", (s, _c: string, gold: number) => {
  expect(R(s).treasury).toBe(gold);
});

Then("the site needs {int} timber, its crew and {int} months", (s, timber: number, months: number) => {
  expect(s.site.materials.timber).toBe(timber);
  expect(s.site.crewNeeded).toBe(B.costOf("market", 1).crew);
  expect(s.site.monthsTotal).toBe(months);
});

Given("a {string} costs {int} gold, {int} stone and {int} months on farmland", (s, name: string, gold: number, stone: number, months: number) => {
  s.step = B.findStep(name);
  const c = B.costOf(s.step.type.id, s.step.step, "farmland");
  expect([c.gold, c.materials.stone, c.months]).toEqual([gold, stone, months]);
});

When("it is built on {string} ground", (s, ground: string) => {
  s.cost = B.costOf(s.step.type.id, s.step.step, ground);
});

Then("it costs {int} gold, {int} stone and {int} months", (s, gold: number, stone: number, months: number) => {
  expect([s.cost.gold, s.cost.materials.stone, s.cost.months]).toEqual([gold, stone, months]);
});

Given("the crown started a {string} in {string} for {int} gold and {int} stone", (s, name: string, p: string, gold: number, stone: number) => {
  P(s, p);
  const { type, step } = B.findStep(name);
  const res = B.startSite(R(s), p, type.id, { step });
  expect(res.ok).toBe(true);
  if (res.ok) s.site = res.site;
  expect([s.site.gold, s.site.materials.stone]).toEqual([gold, stone]);
});

Given("{int} stone have been used", (s, n: number) => {
  s.site.materialsUsed.stone = n;
});

When("the player cancels the site", (s) => {
  s.treasuryBefore = R(s).treasury;
  s.refund = B.cancelSite(R(s), s.site);
});

Then("{int} gold is refunded", (s, gold: number) => {
  expect(s.refund.gold).toBe(gold);
  expect(R(s).treasury - s.treasuryBefore).toBe(gold);
});

Then("{int} stone is returned", (s, n: number) => {
  expect(s.refund.materials.stone).toBe(n);
});

// ---------------------------------------------------------------- materials

Given("the province {string} needs {int} stone for a site", (s, p: string, n: number) => {
  P(s, p, { neighbours: ["Champagne"], roadOrRiver: ["Champagne"] });
  P(s, "Champagne", { neighbours: ["Troyes", "Reims"], roadOrRiver: ["Troyes", "Reims"] });
  P(s, "Reims", { neighbours: ["Champagne", "Laon"], roadOrRiver: ["Champagne", "Laon"] });
  P(s, "Laon", { neighbours: ["Reims"], roadOrRiver: ["Reims"] });
  s.province = p;
  s.need = n;
});

Given(/^(the province "Troyes" makes 40 stone a year|a realm province one ring away makes stone|a realm province three rings away along a road makes stone|no realm province in reach makes stone)$/, (s, state: string) => {
  if (state.startsWith("the province")) B.prov(R(s), "Troyes").makes.add("stone");
  else if (state.includes("one ring")) B.prov(R(s), "Champagne").makes.add("stone");
  else if (state.includes("three rings")) B.prov(R(s), "Laon").makes.add("stone");
});

When("the materials are sourced", (s) => {
  s.source = B.sourceMaterial(R(s), s.province, "stone", s.need);
});

Then(/^the stone comes from (Troyes itself|that province, free|that province, along the road|the market, at the province's price)$/, (s, from: string) => {
  if (from === "Troyes itself") expect(s.source).toEqual({ from: "own", province: "Troyes" });
  else if (from === "that province, free") expect(s.source).toEqual({ from: "reach", province: "Champagne", along: "ring" });
  else if (from === "that province, along the road") expect(s.source).toEqual({ from: "reach", province: "Laon", along: "road" });
  else expect(s.source).toEqual({ from: "market", gold: B.buyPrice("stone", s.need) });
});

Given("no realm province in reach makes {string}", (s, m: string) => {
  P(s, "Troyes");
  s.material = m;
});

When("a site in {string} buys {int} loads of {string}", (s, p: string, n: number, m: string) => {
  const source = B.sourceMaterial(R(s), p, m as B.Material, n);
  s.paid = source.from === "market" ? source.gold : 0;
});

Then(/^it pays ([\d.]+) gold$/, (s, gold: string) => {
  expect(s.paid).toBeCloseTo(Number(gold), 6);
});

Given("the province {string} is more than {int} provinces from any quarry", (s, p: string, n: number) => {
  P(s, p, { quarryDistance: n + 1 });
});

When("a site in {string} buys {int} loads of stone", (s, p: string, n: number) => {
  const source = B.sourceMaterial(R(s), p, "stone", n);
  s.paid = source.from === "market" ? source.gold : 0;
});

Given("the realm of {string} has no quarry and a brickworks in {string}", (s, _c: string, p: string) => {
  P(s, p).makes.add("bricks");
  place(s, p, "kiln", { step: 2 });
  P(s, "Reims").neighbours.push(p);
});

When("a stone castle needing {int} stone is built in {string}", (s, n: number, p: string) => {
  P(s, p);
  expect(B.costOf("castle", 2).materials.stone).toBe(n);
  s.need = n;
  s.source = B.sourceMaterial(R(s), p, "stone", n);
});

Then("{int} bricks may be used instead, one for one", (s, n: number) => {
  expect(s.source.from).toBe("market");
  expect(B.mayStandIn("bricks", "stone")).toBe(true);
  expect(n).toBe(s.need);
  expect(B.sourceMaterial(R(s), "Reims", "bricks", n).from).not.toBe("market");
});

Given("the province {string} has ground {string}", (s, p: string, ground: string) => {
  P(s, p, { ground });
  s.province = p;
});

When("a building needing stone is built there in earth", (s) => {
  const p = B.prov(R(s), s.province);
  expect(B.mayStandIn("earth", "stone", p.ground)).toBe(true);
  expect(B.mayStandIn("earth", "stone", "farmland")).toBe(false);
  s.building = place(s, s.province, "house of worship", { faith: "muslim" });
});

Then("the earth is free and made on site", () => {
  expect(B.buyPrice("earth", 200)).toBe(0);
});

Then("the building's upkeep is doubled", (s) => {
  expect(B.yearlyUpkeep(s.building, { earth: true })).toBe(2 * B.yearlyUpkeep(s.building));
});

const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

Given(/^the date is in era ([IVX]+)$/, (s, era: string) => {
  R(s).era = roman[era]!;
});

Then(/^"([^"]+)" (is|is not) (?:available )?as a building material$/, (s, m: string, is: string) => {
  expect(B.materialAvailable(m as B.Material, R(s).era)).toBe(is === "is");
});

// ---------------------------------------------------------------- labourers

When("a {string} site is started", (s, name: string) => {
  const { type, step } = B.findStep(name);
  s.crew = B.costOf(type.id, step).crew;
});

Then("it needs a crew of {int}", (s, n: number) => {
  expect(s.crew).toBe(n);
});

Given("the province {string} has {int} homeless", (s, p: string, n: number) => {
  P(s, p, { homeless: n, classes: { farmers: 6000, craftsmen: 1500, market_folk: 1500 } });
});

When(/^an? (farm|stone castle) site needing a crew of (\d+) starts in "([^"]+)"$/, (s, name: string, crew: string, p: string) => {
  const { type, step } = B.findStep(name);
  expect(B.costOf(type.id, step).crew).toBe(Number(crew));
  s.classesBefore = { ...B.prov(R(s), p).classes };
  const res = B.startSite(R(s), p, type.id, { step });
  expect(res.ok).toBe(true);
  if (res.ok) s.site = res.site;
  s.province = p;
});

Then("{int} homeless join the crew", (s, n: number) => {
  expect(s.site.crewHomeless).toBe(n);
});

Then("they are fed and steal nothing while they work", (s) => {
  expect(s.site.crew).toBe(s.site.crewNeeded);
});

Then("the province counts {int} homeless toward the homeless trouble", (s, n: number) => {
  expect(B.homelessForTrouble(B.prov(R(s), s.province))).toBe(n);
});

Then("{int} more are taken from every class by its share", (s, n: number) => {
  const taken = s.site.crewFromClasses as Record<string, number>;
  expect(Object.values(taken).reduce((a, b) => a + b, 0)).toBe(n);
  const total = Object.values(s.classesBefore as Record<string, number>).reduce((a, b) => a + b, 0);
  for (const [cls, k] of Object.entries(taken)) expect(k).toBeCloseTo((n * s.classesBefore[cls]) / total, 0);
});

Then("their job slots stay empty while they build", (s) => {
  const p = B.prov(R(s), s.province);
  for (const [cls, k] of Object.entries(s.site.crewFromClasses as Record<string, number>)) expect(p.classes[cls]).toBe(s.classesBefore[cls] - k);
});

Given("a site needs a crew of {int} and {int} months", (s, crew: number, months: number) => {
  s.need = { crew, months };
});

Given("it has a crew of {int}", (s, crew: number) => {
  later(s, () => (s.months = B.siteMonths(s.need.months, crew, s.need.crew)));
});

Then(/^the site takes (\d+|stopped) months$/, (s, months: string) => {
  expect(s.months).toBe(months === "stopped" ? "stopped" : Number(months));
});

Given("a loom house site in {string} has a crew of {int} homeless", (s, p: string, n: number) => {
  P(s, p, { homeless: n, townSize: "town" });
  const res = B.startSite(R(s), p, "loom house");
  expect(res.ok).toBe(true);
  if (res.ok) s.site = res.site;
  expect(s.site.crewHomeless).toBe(n);
  s.province = p;
});

When("the loom house is finished", (s) => {
  s.done = B.completeSite(R(s), s.site);
});

Then("crew members who fit the craftsmen class move into its job slots", (s) => {
  expect(B.buildingType("loom house").class).toBe("craftsmen");
  expect(s.done.toSlots).toBe(Math.min(s.site.crewHomeless, B.stepDef("loom house", 1).jobs!));
  expect(s.done.building.filled).toBe(s.done.toSlots);
});

Then("the rest return to being homeless", (s) => {
  expect(B.prov(R(s), s.province).homeless).toBe(s.done.toHomeless);
  expect(s.done.toSlots + s.done.toHomeless).toBe(s.site.crewHomeless);
});

// ---------------------------------------------------------------- sites

Given("fields tile {int} of {string} has a farm site running", (s, tile: number, p: string) => {
  P(s, p);
  const res = B.startSite(R(s), p, "farm", { place: `tile:${tile}` });
  expect(res.ok).toBe(true);
  s.province = p;
});

When("the player tries to start a second site on fields tile {int}", (s, tile: number) => {
  s.check = B.startSite(R(s), s.province, "grove", { place: `tile:${tile}` });
});

function landAndTownSites(s: Scenario, p: string): void {
  P(s, p, { homeless: 5000 });
  const a = B.startSite(R(s), p, "farm");
  const b = B.startSite(R(s), p, "loom house");
  expect(a.ok && b.ok).toBe(true);
  if (a.ok) s.landSite = a.site;
  if (b.ok) s.townSite = b.site;
}

Given("the province {string} has a land site and a town site running", (s, p: string) => {
  P(s, p);
  landAndTownSites(s, p);
  s.province = p;
});

Given("no master of works is in {string}", (s, p: string) => {
  expect(B.prov(R(s), p).officials.has("master of works")).toBe(false);
});

When("the player tries to start another town site in {string}", (s, p: string) => {
  s.check = B.startSite(R(s), p, "forge");
});

Given("the province {string} has a master of works official", (s, p: string) => {
  P(s, p).officials.add("master of works");
  s.province = p;
});

When("the player starts a market needing {int} months", (s, months: number) => {
  expect(B.costOf("market", 1).months).toBe(months);
  const res = B.startSite(R(s), s.province, "market");
  expect(res.ok).toBe(true);
  if (res.ok) s.site = res.site;
});

Then("{string} may run {int} land sites and {int} town sites at once", (s, p: string, land: number, town: number) => {
  expect(B.siteCapacity(B.prov(R(s), p))).toEqual({ land, town });
  expect(B.startSite(R(s), p, "loom house").ok).toBe(true);
  expect(B.startSite(R(s), p, "forge").ok).toBe(false);
});

Then("the market takes {int} months", (s, months: number) => {
  expect(s.site.monthsTotal).toBe(months);
});

Given("the lord {string} holds the province {string}", (s, lord: string, p: string) => {
  P(s, p, { lord });
  R(s).lords.set(lord, { id: lord, wealth: 500, loyalty: "loyal" });
  s.lord = lord;
});

Given("the crown has a land site and a town site running in {string}", (s, p: string) => {
  landAndTownSites(s, p);
});

When("the lord starts a castle step in {string} with his own gold", (s, p: string) => {
  s.lordWealth = R(s).lords.get(s.lord)!.wealth;
  s.check = B.startSite(R(s), p, "castle", { owner: `lord:${s.lord}` });
});

Then("the lord's site runs as well", (s) => {
  expect(s.check.ok).toBe(true);
  expect(R(s).sites).toHaveLength(3);
  expect(R(s).lords.get(s.lord)!.wealth).toBe(s.lordWealth - B.costOf("castle", 1).gold);
});

Given("the province {string} has a {word} climate", (s, p: string, climate: string) => {
  P(s, p, { climate });
  s.province = p;
});

Given("it has a land site and a town site running", (s) => {
  landAndTownSites(s, s.province);
});

When(/^the month is (the coldest month|the wettest month)$/, (s) => {
  const climate = B.prov(R(s), s.province).climate!;
  const month = B.buildingsConfig.sites.stop_months_by_climate[climate]![0]!;
  s.landBefore = s.landSite.monthsDone;
  s.townBefore = s.townSite.monthsDone;
  B.advanceSites(R(s), month);
});

Then("the land site stops for the month", (s) => {
  expect(s.landSite.stopped).toContain("season");
  expect(s.landSite.monthsDone).toBe(s.landBefore);
});

Then("the town site keeps going", (s) => {
  expect(s.townSite.stopped).toEqual([]);
  expect(s.townSite.monthsDone).toBeGreaterThan(s.townBefore);
});

Given("the country {string} is at war with {string}", (s, a: string, b: string) => {
  s.war = [a, b];
});

Given("a Burgundian army is in {string}", (s, p: string) => {
  P(s, p);
  landAndTownSites(s, p);
  P(s, p, { enemyArmy: true });
  later(s, () => B.advanceSites(R(s)));
  s.province = p;
});

Then("every site in {string} is stopped", (s, p: string) => {
  const sites = R(s).sites.filter((x) => x.province === p);
  expect(sites.length).toBe(2);
  for (const site of sites) {
    expect(site.stopped).toContain("enemy army");
    expect(site.monthsDone).toBe(0);
  }
});

Given("the province {string} is occupied by {string}", (s, p: string, by: string) => {
  P(s, p);
  s.province = p;
  s.occupier = by;
});

Given("a site in {string} holds {int} stone", (s, p: string, n: number) => {
  const res = B.startSite(R(s), p, "house of worship", { faith: "christian" });
  expect(res.ok).toBe(true);
  if (res.ok) s.site = res.site;
  s.site.materials = { stone: n };
  P(s, p, { occupiedBy: s.occupier });
  later(s, () => B.advanceSites(R(s)));
});

Then("the site is stopped", (s) => {
  expect(s.site.stopped).toContain("occupied");
});

Then("{string} may loot the {int} stone", (s, by: string, n: number) => {
  expect(B.lootSite(R(s), s.site, "England")).toEqual({});
  expect(B.lootSite(R(s), s.site, by)).toEqual({ stone: n });
});

Given("the province {string} has a town site running", (s, p: string) => {
  P(s, p);
  const res = B.startSite(R(s), p, "loom house");
  expect(res.ok).toBe(true);
  s.province = p;
});

When("{string} is sacked", (s, p: string) => {
  B.sackTown(R(s), p);
});

Then("the town site is lost", (s) => {
  expect(R(s).sites.filter((x) => x.province === s.province && x.kind === "town")).toHaveLength(0);
});

// ---------------------------------------------------------------- upgrades

Given(/^the province "([^"]+)" (has|lacks) a market charter$/, (s, p: string, has: string) => {
  if (has === "has") P(s, p).charters.add("market charter");
  else P(s, p).charters.delete("market charter");
});

When("the market is at step {int}", (s, step: number) => {
  if (s.stepEvent) {
    expect(s.building.step).toBe(step);
    return;
  }
  s.step = step;
  s.missing = B.missingFor(R(s), "Troyes", "market", step);
});

Then("it is a {string} with {int} market folk", (s, name: string, jobs: number) => {
  expect(s.missing).toBeNull();
  const d = B.stepDef("market", s.step);
  expect(d.name).toBe(name);
  expect(d.jobs).toBe(jobs);
});

Then("the step costs {}", (s, cost: string) => {
  expect(B.formatCost(B.stepDef("market", s.step).cost)).toBe(cost);
});

Given(/^(the province "Troyes" has no market charter|the province "Troyes" is a village)$/, (s, missing: string) => {
  if (missing.endsWith("charter")) P(s, "Troyes").charters.delete("market charter");
  else P(s, "Troyes", { townSize: "village" });
});

When("the player tries to upgrade the market to a yearly fair", (s) => {
  s.check = B.upgrade(R(s), "Troyes", s.building);
});

Then("the upgrade is refused", (s) => {
  expect(s.check.ok).toBe(false);
  P(s, "Troyes", { townSize: "city" }).charters.add("market charter");
  R(s).inventions.add("T6");
  expect(B.upgrade(R(s), "Troyes", s.building).ok).toBe(true);
});

Given("the province {string} has a step {int} {string}", (s, p: string, step: number, type: string) => {
  P(s, p);
  s.province = p;
  s.building = place(s, p, type, { step });
});

When("an upgrade site for the {string} is running", (s) => {
  const res = B.upgrade(R(s), s.province, s.building);
  expect(res.ok).toBe(true);
});

Then("the {string} works as step {int}", (s, _type: string, step: number) => {
  expect(B.worksAsStep(R(s), s.province, s.building)).toBe(step);
});

When(/^(it has been neglected for 10 years|an earthquake hits "Rouen")$/, (s, cause: string) => {
  if (cause.startsWith("it has been")) {
    s.building.condition = "neglected";
    for (let y = 0; y < 10; y++) B.yearOfNeglect(R(s), s.province, s.building);
  } else B.earthquake(R(s), s.province, rng(s));
});

Then(/^the "([^"]+)" is (step \d+|ruined)$/, (s, _type: string, result: string) => {
  if (result === "ruined") expect(s.building.condition).toBe("ruined");
  else {
    expect(s.building.step).toBe(Number(result.slice(5)));
    expect(s.building.condition).not.toBe("ruined");
  }
});

When("the player opens the build sheet in {string}", (s, p: string) => {
  P(s, p);
  s.sheet = B.buildSheet(R(s), p);
});

// ---------------------------------------------------------------- upkeep and condition

Given("the province {string} has a loom house with upkeep {int} gold a year owned by {string}", (s, p: string, upkeep: number, owner: string) => {
  P(s, p);
  s.building = place(s, p, "loom house", { owner: ownerOf(owner) });
  expect(B.yearlyUpkeep(s.building)).toBe(upkeep);
});

When("a month passes", (s) => {
  if (s.ai) {
    s.aiResult = B.aiMonth(R(s), 0, () => "market");
    return;
  }
  s.treasuryBefore = R(s).treasury;
  s.paid = B.monthlyUpkeep(R(s)).paid;
});

Then("the crown pays 1\\/12 gold for the loom house", (s) => {
  expect(s.paid.get("crown")).toBeCloseTo(1 / 12, 9);
  expect(s.treasuryBefore - R(s).treasury).toBeCloseTo(1 / 12, 9);
});

Then("a {string} has a yearly upkeep between {float} and {float} gold", (_s, type: string, low: number, high: number) => {
  expect(B.upkeepRange(type)).toEqual([low, high]);
  const first = B.stepDef(type, 1).upkeep;
  if (first !== undefined) {
    expect(first).toBeGreaterThanOrEqual(low);
    expect(first).toBeLessThanOrEqual(high);
  }
});

Given("the province {string} has a church owned by {string}", (s, p: string, owner: string) => {
  P(s, p);
  s.building = place(s, p, "house of worship", { owner: ownerOf(owner), faith: "christian", name: "church" });
  R(s).purses.set("clergy", 10);
});

Then("the clergy pay the church's upkeep", (s) => {
  expect(s.paid.get("clergy")).toBeCloseTo(B.yearlyUpkeep(s.building) / 12, 9);
  expect(s.paid.get("crown") ?? 0).toBe(0);
});

Then("when the crown takes over its upkeep the crown pays it", (s) => {
  s.building.upkeepPayer = "crown";
  const paid = B.monthlyUpkeep(R(s)).paid;
  expect(paid.get("crown")).toBeCloseTo(B.yearlyUpkeep(s.building) / 12, 9);
  expect(paid.get("clergy") ?? 0).toBe(0);
});

/** Four star forts and four loom houses: 4 × 20 + 4 × 1 gold a year. */
function upkeep84(s: Scenario): void {
  for (const id of ["Paris", "Reims", "Rouen", "Lyon"]) {
    P(s, id);
    place(s, id, "star fort");
    place(s, id, "loom house");
  }
}

Given("the country {string} has buildings with a total upkeep of {int} gold a year", (s, _c: string, total: number) => {
  upkeep84(s);
  s.total = total;
});

Then("the Treasury card's Upkeep line includes {int} gold a year for buildings", (s, total: number) => {
  expect(B.realmUpkeep(R(s))).toBe(total);
});

When(/^(its upkeep goes unpaid in a month|its upkeep is then paid for 2 months|its upkeep is then paid for a full season of 3 months)$/, (s, event: string) => {
  const r = R(s);
  r.treasury = 0;
  B.monthlyUpkeep(r);
  r.treasury = 100;
  const months = event.includes("2 months") ? 2 : event.includes("3 months") ? 3 : 0;
  for (let m = 0; m < months; m++) B.monthlyUpkeep(r);
});

Then(/^the market is (neglected|sound) and works at (half|full)$/, (s, condition: string, output: string) => {
  expect(s.building.condition).toBe(condition);
  expect(B.outputFactor(s.building)).toBe(output === "half" ? 0.5 : 1);
});

Given("the province {string} has a sound loom house built for {int} gold, {int} timber and {int} months", (s, p: string, gold: number, timber: number, months: number) => {
  P(s, p);
  s.building = place(s, p, "loom house", { filled: 1500 });
  const c = B.costOf("loom house", 1);
  expect([c.gold, c.materials.timber, c.months]).toEqual([gold, timber, months]);
});

When("a town fire damages it", (s) => {
  B.damage(s.building);
});

Then("it makes nothing in its first season and works at half after", (s) => {
  expect(B.yearlyMakes(s.building).cloth).toBe(0);
  B.endSeason(s.building);
  expect(B.outputFactor(s.building)).toBe(0.5);
  expect(B.yearlyMakes(s.building).cloth).toBe(15);
});

Then("repairing it costs {float} gold, {int} timber and {int} months", (s, gold: number, timber: number, months: number) => {
  const c = B.repairCost(s.building);
  expect([c.gold, c.materials.timber, c.months]).toEqual([gold, timber, months]);
});

When(/^(its tile is burned|the town is plundered and it is chosen|the castle is razed|it stood neglected at step 1 for 10 years)$/, (s, cause: string) => {
  const r = R(s);
  const b: B.Building = s.building;
  if (cause === "its tile is burned") {
    const p = B.prov(r, s.province);
    p.buildings = p.buildings.filter((x) => x === b);
    B.forage(r, s.province, 1);
  } else if (cause.startsWith("it stood")) {
    b.condition = "neglected";
    for (let y = 0; y < 10; y++) B.yearOfNeglect(r, s.province, b);
  } else B.ruin(r, b, cause.includes("plundered") ? "ruined by plunder" : "razed");
});

Then("the {string} is ruined and makes nothing", (s) => {
  expect(s.building.condition).toBe("ruined");
  expect(B.outputFactor(s.building)).toBe(0);
});

Then("it can be rebuilt at half cost or cleared", (s) => {
  const full = B.costOf(s.building.type, s.building.step);
  expect(B.repairCost(s.building).gold).toBe(full.gold / 2);
  B.clearRuin(R(s), s.province, s.building);
  expect(B.prov(R(s), s.province).buildings).not.toContain(s.building);
});

Given("the province {string} has {int} ruined farms on burned tiles and a ruined market", (s, p: string, n: number) => {
  const prov = P(s, p);
  s.farms = Array.from({ length: n }, (_, i) => {
    prov.tiles[i]!.burned = true;
    return B.placeBuilding(R(s), p, "farm", `tile:${i + 1}`, { condition: "ruined" });
  });
  s.market = place(s, p, "market", { condition: "ruined" });
  s.province = p;
});

Given("{string} is at peace", (s, p: string) => {
  P(s, p, { enemyArmy: false });
  delete B.prov(R(s), p).occupiedBy;
});

When("a year passes", (s) => {
  if (s.arms !== undefined) {
    s.armsAfter = B.storesAfterYear(R(s), s.arms);
    return;
  }
  B.yearlySelfRebuild(R(s), s.province);
});

Then("one ruined farm is rebuilt by itself", (s) => {
  expect(s.farms.filter((f: B.Building) => f.condition === "sound")).toHaveLength(1);
});

Then("the market stays ruined until an owner pays", (s) => {
  B.yearlySelfRebuild(R(s), s.province);
  expect(s.market.condition).toBe("ruined");
  const res = B.startSite(R(s), s.province, "market", { place: s.market.place, costShare: 0.5, step: 1 });
  expect(res.ok).toBe(false);
});

// ---------------------------------------------------------------- damage and loss

Given("a Burgundian army forages in {string}", (s, p: string) => {
  P(s, p);
  for (const t of ["farm", "farm", "ranch", "lumber camp"]) place(s, p, t);
  later(s, () => (s.burned = B.forage(R(s), p, 4)));
  s.province = p;
});

Then("land buildings in {string} are burned tile by tile", (s, p: string) => {
  const prov = B.prov(R(s), p);
  for (const b of s.burned as B.Building[]) {
    expect(b.condition).toBe("ruined");
    expect(prov.tiles[Number(b.place.slice(5)) - 1]!.burned).toBe(true);
  }
  expect(s.burned).toHaveLength(4);
});

Given(/^the province "([^"]+)" (has no|has) town walls$/, (s, p: string, has: string) => {
  P(s, p);
  place(s, p, "farm");
  place(s, p, "market");
  place(s, p, "loom house");
  if (has === "has") place(s, p, "stone walls");
  s.province = p;
});

When(/^a (small|big) raid hits "([^"]+)"$/, (s, size: string, p: string) => {
  s.hit = B.raid(R(s), p, size === "big", rng(s));
});

Then(/^(one building is damaged|one building is ruined|one land building is damaged, no town building)$/, (s, result: string) => {
  const p = B.prov(R(s), s.province);
  const hurt = p.buildings.filter((b) => b.condition !== "sound");
  expect(hurt).toEqual([s.hit]);
  expect(s.hit.condition).toBe(result.includes("ruined") ? "ruined" : "damaged");
  if (result.startsWith("one land")) expect(s.hit.place.startsWith("tile:")).toBe(true);
});

Given(/^the province "([^"]+)" has (\d+) town buildings and (no town walls|stone town walls|a palisade)$/, (s, p: string, n: string, walls: string) => {
  P(s, p, { townSize: "great_city" });
  for (let i = 0; i < Number(n); i++) place(s, p, "loom house");
  if (walls === "stone town walls") place(s, p, "stone walls");
  if (walls === "a palisade") place(s, p, "palisade");
  s.province = p;
});

When("{string} is plundered", (s, p: string) => {
  s.ruined = B.plunder(R(s), p, rng(s));
});

Then("{int} town buildings are ruined", (s, n: number) => {
  expect(s.ruined).toHaveLength(n);
  expect(B.prov(R(s), s.province).buildings.filter((b) => b.place.startsWith("town:") && b.condition === "ruined")).toHaveLength(n);
});

Given("rebels hold the province {string}", (s, p: string) => {
  P(s, p, { rebels: true });
  s.province = p;
});

Given(/^"([^"]+)" has (?!\d+ loom houses$)(.+)$/, (s, p: string, what: string) => {
  P(s, p);
  if (what === "a market and a school") {
    place(s, p, "school");
    s.market = place(s, p, "market");
    return;
  }
  const sit: B.AiSituation = {};
  if (what === "a ruined market it can pay to rebuild") Object.assign(sit, { ruinedOrDamaged: place(s, p, "market", { condition: "ruined" }), canPay: true });
  else if (what === "under 3 months of food and an empty fields tile") sit.foodMonths = 2;
  else if (what === "homeless over 5 %") sit.homelessShare = 0.08;
  else if (what === "wool and no loom house in reach") sit.unusedRaw = "wool";
  else if (what === "a border with a country it expects war with") sit.expectsWar = true;
  else if (what === "a low share of its faith") sit.faithLow = true;
  else if (what === "none of the above and a mercantile personality") sit.personality = "mercantile";
  else throw new Error(`unknown situation ${what}`);
  later(s, () => (s.pick = B.aiPick(sit)));
});

When("a season passes", (s) => {
  s.looted = B.rebelsLoot(R(s), s.province);
});

Then("the market is looted", (s) => {
  expect(s.looted).toBe(s.market);
  expect(s.market.condition).toBe("ruined");
});

Given("the province {string} is a marsh province with a fishery on a shore tile", (s, p: string) => {
  P(s, p, { tiles: [{ use: "marsh" }, { use: "fields" }, { use: "fields" }] });
  s.fishery = place(s, p, "fishery");
  s.farm = B.placeBuilding(R(s), p, "farm", "tile:2");
  s.province = p;
});

When("a flood hits {string}", (s, p: string) => {
  B.flood(R(s), p);
});

Then("the fishery is damaged", (s) => {
  expect(s.fishery.condition).toBe("damaged");
  expect(s.farm.condition).toBe("sound");
});

Then("if a dyke is broken in war a fields tile turns to marsh", (s) => {
  const p = B.prov(R(s), s.province);
  const fieldsBefore = p.tiles.filter((t) => t.use === "fields").length;
  B.flood(R(s), s.province, true);
  expect(p.tiles.filter((t) => t.use === "fields").length).toBe(fieldsBefore - 1);
});

Given("the province {string} is in a quake region with {int} buildings and a stone castle", (s, p: string, n: number) => {
  P(s, p);
  for (let i = 0; i < n; i++) place(s, p, "loom house");
  s.castle = B.placeBuilding(R(s), p, "castle", "castle", { step: 2 });
  s.province = p;
});

When("an earthquake event hits {string}", (s, p: string) => {
  B.earthquake(R(s), p, rng(s));
});

Then("{int} buildings are damaged", (s, n: number) => {
  expect(B.prov(R(s), s.province).buildings.filter((b) => b.condition === "damaged")).toHaveLength(n);
});

Then("the castle falls a step", (s) => {
  expect(s.castle.step).toBe(1);
});

Given("the crown owns a forge in {string} built with {int} timber", (s, p: string, timber: number) => {
  P(s, p);
  s.building = place(s, p, "forge", { filled: 1200, builtWith: { timber } });
  s.province = p;
});

When("the crown demolishes the forge", (s) => {
  s.demolished = B.demolish(R(s), s.province, s.building, "crown");
});

Then("{int} timber come back", (s, n: number) => {
  expect(s.demolished.materials.timber).toBe(n);
});

Then("its craftsmen overflow", (s) => {
  expect(s.demolished.overflow).toBe(1200);
  expect(B.prov(R(s), s.province).buildings).not.toContain(s.building);
});

Given("{string} signs a peace with {string} demanding the castle of {string} demolished", (s, _a: string, _b: string, p: string) => {
  P(s, p);
  B.placeBuilding(R(s), p, "castle", "castle", { step: 2 });
  s.province = p;
});

When("the peace is signed", (s) => {
  B.peaceDemolishCastles(R(s), [s.province]);
});

Then("the castle of {string} is demolished", (s, p: string) => {
  expect(B.hasBuilding(R(s), p, "castle")).toBe(false);
});

Given(/^the province "([^"]+)" has a "([^"]+)" on a (woods tile|fields tile)$/, (s, p: string, type: string) => {
  P(s, p);
  s.building = place(s, p, type);
  s.province = p;
});

When(/^(the woods tile is cleared|the town grows over the fields)$/, (s, change: string) => {
  const tile = Number(s.building.place.slice(5));
  B.changeTileUse(R(s), s.province, tile, change.startsWith("the woods") ? "fields" : "town");
});

Then("the {string} ends", (s) => {
  expect(B.prov(R(s), s.province).buildings).not.toContain(s.building);
});

When("its seam runs out", (s) => {
  B.seamRunsOut(R(s), s.province, s.building);
});

Then("the mine closes", (s) => {
  expect(B.hasBuilding(R(s), s.province, "mine")).toBe(false);
});

// ---------------------------------------------------------------- converting

Given("the province {string} has a farm growing grain", (s, p: string) => {
  P(s, p);
  s.building = place(s, p, "farm", { crop: "grain" });
  s.province = p;
});

When("the owner sets the crop to flax", (s) => {
  s.treasuryBefore = R(s).treasury;
  B.setCrop(s.building, "flax");
});

Then("the farm grows flax after one season at no cost", (s) => {
  expect(s.building.crop).toBe("grain");
  B.endSeason(s.building);
  expect(s.building.crop).toBe("flax");
  expect(R(s).treasury).toBe(s.treasuryBefore);
});

Given("the province {string} has the church {string}", (s, p: string, name: string) => {
  P(s, p);
  s.building = B.placeLandmark(R(s), name);
  s.building.faith = "christian";
});

When("the 1453 conversion event fires", (s) => {
  expect(B.landmark(s.building.landmark).converts_by_event).toBe(1453);
  s.conversion = B.convertFaith(s.building, "muslim");
});

Then("{string} becomes a mosque", (s, name: string) => {
  expect(s.building.landmark).toBe(name);
  expect(s.building.faith).toBe("muslim");
});

Then("the cost in grievances is set by the religion context", (s) => {
  expect(s.conversion.grievanceCostBy).toBe("religion");
});

Given("a {string} costs {int} gold to build as {string}", (s, from: string, cost: number) => {
  P(s, "Lille");
  s.cost = cost;
  s.building = from === "textile factory" ? place(s, "Lille", "factory", { product: "textile mill" }) : place(s, "Lille", from);
});

When("the owner converts the {string} to a {string}", (s, _from: string, to: string) => {
  s.treasuryBefore = R(s).treasury;
  s.converted = B.convertTo(R(s), s.building, to, s.cost);
  expect(s.converted.ok).toBe(true);
});

Then("the conversion costs {float} gold", (s, gold: number) => {
  expect(s.converted.gold).toBe(gold);
  expect(s.treasuryBefore - R(s).treasury).toBe(gold);
});

Given("the crown owns a castle in {string}", (s, p: string) => {
  P(s, p);
  s.building = B.placeBuilding(R(s), p, "castle", "castle", { step: 2 });
  s.province = p;
});

When("the crown slights it", (s) => {
  B.slight(R(s), s.building);
});

Then("the castle is a ruin", (s) => {
  expect(s.building.condition).toBe("ruined");
});

Then("it rebuilds at half cost", (s) => {
  expect(B.repairCost(s.building).gold).toBe(B.costOf("castle", s.building.step).gold / 2);
});

// ---------------------------------------------------------------- owners

When(/^a building is gained by (.+)$/, (s, way: string) => {
  P(s, "Troyes");
  const ways: Record<string, [B.GainWay, B.Owner]> = {
    "the crown building it": ["built_by_crown", "crown"],
    "a lord building it": ["built_by_lord", "lord:Count of Champagne"],
    "the people building village works": ["village_works", "commons"],
    "conquest, its owners staying": ["conquest", "lord:Duke of Brittany"],
    "an event": ["event", "clergy"],
    "the start of the game": ["start", "town"],
  };
  const [w, owner] = ways[way]!;
  s.expectedOwner = owner;
  s.building = B.gainBuilding(R(s), "Troyes", "farm", w, owner);
});

Then(/^it stands in the province with owner (.+)$/, (s, owner: string) => {
  expect(B.prov(R(s), "Troyes").buildings).toContain(s.building);
  const expected = { "the crown": "crown", "the lord": "lord:Count of Champagne", "the commons": "commons" }[owner] ?? s.expectedOwner;
  expect(s.building.owner).toBe(expected);
});

Given("the lord {string} owns a market in {string}", (s, lord: string, p: string) => {
  P(s, p, { lord });
  R(s).lords.set(lord, { id: lord, wealth: 10, loyalty: "loyal" });
  s.building = place(s, p, "market", { owner: `lord:${lord}` });
  s.lord = lord;
  s.province = p;
  later(s, () => {
    s.treasuryBefore = R(s).treasury;
    B.monthlyUpkeep(R(s));
  });
});

Then("the lord pays its upkeep", (s) => {
  expect(R(s).lords.get(s.lord)!.wealth).toBeCloseTo(10 - B.yearlyUpkeep(s.building) / 12, 9);
  expect(R(s).treasury).toBe(s.treasuryBefore);
});

Then("only the lord decides its upgrades, demolition and conversion", (s) => {
  expect(B.mayDecide(s.building, `lord:${s.lord}`)).toBe(true);
  expect(B.mayDecide(s.building, "crown")).toBe(false);
  expect(B.demolish(R(s), s.province, s.building, "crown").ok).toBe(false);
});

Given("the lord {string} holds {string} at loyalty {string}", (s, lord: string, p: string, loyalty: string) => {
  P(s, p, { lord, townSize: "city" });
  R(s).lords.set(lord, { id: lord, wealth: 0, loyalty });
  s.lord = lord;
});

When("the crown pays for a loom house in {string}", (s, p: string) => {
  s.treasuryBefore = R(s).treasury;
  const res = B.crownBuildsForLord(R(s), p, "loom house");
  expect(res.ok).toBe(true);
  if (res.ok) s.building = B.completeSite(R(s), res.site).building;
});

Then("the lord owns the loom house", (s) => {
  expect(s.building.owner).toBe(`lord:${s.lord}`);
  expect(s.treasuryBefore - R(s).treasury).toBe(B.costOf("loom house", 1).gold);
});

Then("the lord's loyalty rises one step to {string}", (s, loyalty: string) => {
  expect(R(s).lords.get(s.lord)!.loyalty).toBe(loyalty);
});

Given("the lord {string} owns a castle in {string}", (s, lord: string, p: string) => {
  P(s, p, { lord });
  R(s).lords.set(lord, { id: lord, wealth: 0, loyalty: "wavering" });
  s.building = B.placeBuilding(R(s), p, "castle", "castle", { owner: `lord:${lord}` });
  s.lord = lord;
});

When(/^(the lord defects|the lord's line dies out|the crown seizes the lord's land)$/, (s, event: string) => {
  B.lordFate(R(s), s.lord, event === "the lord defects" ? "defects" : event.includes("dies") ? "line_dies_out" : "land_seized");
});

Then(/^the castle belongs to (the lord|the crown)$/, (s, owner: string) => {
  expect(s.building.owner).toBe(owner === "the lord" ? `lord:${s.lord}` : "crown");
});

Given("the clergy of {string} have wealth from tithes", (s, p: string) => {
  P(s, p);
  R(s).purses.set("clergy", 500);
  s.province = p;
});

When("the clergy build", (s) => {
  s.check = build(s, s.province, "house of worship", { owner: "clergy", faith: "catholic" });
  expect(s.check.ok).toBe(true);
});

Then("they may build houses of worship, monasteries, almshouses, hospitals and church schools", () => {
  for (const t of ["house of worship", "monastery", "almshouse", "hospital", "school"]) expect(B.mayOwn("clergy", t)).toBe(true);
  expect(B.mayOwn("clergy", "castle")).toBe(false);
});

Then("they pay their upkeep", (s) => {
  const before = R(s).purses.get("clergy")!;
  const t = R(s).treasury;
  B.monthlyUpkeep(R(s));
  expect(R(s).purses.get("clergy")).toBeLessThan(before);
  expect(R(s).treasury).toBe(t);
});

Given(/^the province "([^"]+)" (has|lacks) a "([^"]+)" charter$/, (s, p: string, has: string, charter: string) => {
  if (has === "has") P(s, p).charters.add(charter);
  else P(s, p).charters.delete(charter);
  s.province = p;
});

Given("the town of {string} owns the town walls", (s, p: string) => {
  s.building = place(s, p, "town walls", { owner: "town" });
});

When("the crown tries to demolish the town walls", (s) => {
  s.demolished = B.demolish(R(s), s.province, s.building, "crown");
});

Then("the charter must be broken first", (s) => {
  expect(s.demolished).toEqual({ ok: false, reason: "the Town law charter must be broken first" });
  B.prov(R(s), s.province).charters.delete("Town law");
  expect(B.demolish(R(s), s.province, s.building, "crown").ok).toBe(true);
});

Given("a merchant house holds a {string} in {string}", (s, right: string, p: string) => {
  P(s, p).charters.add(right);
  R(s).purses.set("company:Fugger", 500);
  s.province = p;
});

When("it builds a silver mine there", (s) => {
  expect(B.mayOwn("company", "mine")).toBe(true);
  const res = build(s, s.province, "mine", { owner: "company:Fugger" });
  expect(res.ok).toBe(true);
  s.building = B.prov(R(s), s.province).buildings.find((b) => b.type === "mine");
});

Then("the merchant house owns the mine and keeps half its output", (s) => {
  expect(s.building.owner).toBe("company:Fugger");
  expect(B.ownerOutputShare(s.building)).toBe(0.5);
});

Given("the commons own a farm in {string}", (s, p: string) => {
  P(s, p);
  s.building = place(s, p, "farm", { owner: "commons" });
  s.province = p;
});

Then("the farm has no upkeep", (s) => {
  expect(B.yearlyUpkeep(s.building)).toBe(0);
  expect(B.yearlyUpkeep({ ...s.building, owner: "crown", step: 2 })).toBeGreaterThan(0);
});

Then("if the crown demolishes it the province gains a {string} grievance", (s, g: string) => {
  const res = B.demolish(R(s), s.province, s.building, "crown");
  expect(res.ok && res.grievance).toBe(g);
  expect(B.prov(R(s), s.province).grievances).toContain(g);
});

Given("a lord with trait {string} has wealth to build", (s, trait: string) => {
  s.priorities = B.lordPriorities(trait);
});

Then(/^he builds (.+) first$/, (s, choice: string) => {
  const expected: Record<string, string[]> = {
    "the most of anything": ["any"],
    "markets and mines": ["market", "mine"],
    "houses of worship and monasteries": ["house of worship", "monastery"],
    "castles and drill yards": ["castle", "drill yard"],
  };
  expect(s.priorities).toEqual(expected[choice]);
});

Given("the clergy of a faith have no house of worship in a town of their faith", (s) => {
  s.prov = P(s, "Troyes", { homeless: 500, plague: true });
  later(s, () => (s.order = B.clergyNext(s.prov, "catholic")));
});

Then("they build a house of worship there first", (s) => {
  expect(s.order[0]).toBe("house of worship");
});

Then("then monasteries, almshouses where there are homeless, hospitals in plague years and schools", (s) => {
  expect(s.order.slice(1)).toEqual(["monastery", "almshouse", "hospital", "school"]);
  const quiet = P(s, "Reims", { homeless: 0, plague: false });
  expect(B.clergyNext(quiet, "catholic")).toEqual(["house of worship", "monastery", "school"]);
});

Given("the town of {string} holds a {string} charter", (s, p: string, charter: string) => {
  P(s, p).charters.add(charter);
});

Then("it builds market steps, walls and a bridge before craft buildings", () => {
  expect(B.townOrder()).toEqual(["market", "town walls", "bridge", "craft"]);
  for (const t of ["market", "town walls", "bridge"]) expect(B.mayOwn("town", t)).toBe(true);
});

Given("a trading company holds rights in {string}", (s, p: string) => {
  P(s, p);
});

Then("it builds warehouses and trading houses on its routes and mines and plantations it holds rights to", () => {
  expect(B.companyOrder()).toEqual(["warehouse", "market", "mine", "plantation"]);
  for (const t of ["warehouse", "mine", "plantation", "trading post"]) expect(B.mayOwn("company", t)).toBe(true);
  expect(B.findStep("trading house").type.id).toBe("market");
});

// ---------------------------------------------------------------- the people build

Given("the province {string} has been at peace for {int} years", (s, p: string, years: number) => {
  P(s, p, { yearsAtPeace: years, tiles: [{ use: "fields" }, { use: "pasture" }] });
  B.placeBuilding(R(s), p, "farm", "tile:1");
  s.province = p;
});

Given("it has {int} months of food in store", (s, months: number) => {
  P(s, s.province, { foodMonths: months });
});

Given("it has homeless people", (s) => {
  P(s, s.province, { homeless: 1200 });
});

Given("it has an empty pasture tile", (s) => {
  expect(B.freePlace(R(s), s.province, "ranch")).toBe("tile:2");
});

When(/^the year ends and the village works roll of (\d+) % succeeds$/, (s, pct: string) => {
  expect(B.buildingsConfig.village_works.chance_per_year).toBe(Number(pct) / 100);
  s.built = B.villageWorks(R(s), s.province, 0);
});

Then(/^(a step 1 ranch owned by the commons stands on the pasture|nothing is built)$/, (s, result: string) => {
  if (result === "nothing is built") expect(s.built).toBeNull();
  else expect(s.built).toMatchObject({ type: "ranch", step: 1, owner: "commons", place: "tile:2" });
});

Given("the province {string} has a market, homeless people and wool nearby", (s, p: string) => {
  P(s, p, { homeless: 900 });
  place(s, p, "market");
  s.province = p;
  s.raw = ["wool"];
});

When("a craft building appears", (s) => {
  s.built = B.craftAppears(R(s), s.province, s.raw, "town");
});

Then("it is a loom house, tannery, kiln or brewery owned by the town or the commons", (s) => {
  expect(["loom house", "tannery", "kiln", "brewery"]).toContain(s.built.type);
  expect(["town", "commons"]).toContain(s.built.owner);
});

// ---------------------------------------------------------------- the building card

Given("the province {string} has a step {int} {string} in town slot {int} owned by {string}", (s, p: string, step: number, type: string, slot: number, owner: string) => {
  P(s, p);
  s.building = B.placeBuilding(R(s), p, type, `town:${slot}`, { step, owner: ownerOf(owner) });
  s.province = p;
});

Given("the {string} has {int} craftsmen slots, all filled", (s, type: string, n: number) => {
  expect(B.stepDef(type, s.building.step).jobs).toBe(n);
  s.building.filled = n;
});

When("the player taps the {string} on the tile row", (s) => {
  s.card = B.buildingCard(R(s), s.province, s.building);
});

Then("the card shows type, place, step, owner, jobs, makes, needs, condition and upkeep", (s) => {
  const f = s.card.fields;
  expect(Object.keys(f)).toEqual(["type", "place", "step", "owner", "jobs", "makes", "needs", "condition", "upkeep"]);
  expect(f.type.value).toBe("loom house");
  expect(f.place.value).toBe("town:3");
  expect(f.owner.value).toBe("crown");
  expect(f.makes.value).toBe("30 cloth");
  expect(f.needs.value).toBe("wool");
  expect(f.condition.value).toBe("sound");
  expect(f.upkeep.value).toBe("1 gold a year");
});

Then("each field has its gain and lose list", (s) => {
  for (const f of Object.values(s.card.fields as Record<string, B.CardField>)) {
    expect(Array.isArray(f.gain)).toBe(true);
    expect(Array.isArray(f.lose)).toBe(true);
  }
  expect(s.card.fields.makes.lose.length).toBeGreaterThan(0);
});

Then("the card shows the next step {string} with {string} for {int} gold, {int} bricks and {int} months", (s, name: string, jobs: string, gold: number, bricks: number, months: number) => {
  expect(s.card.next).toEqual({ name, jobs, gold, materials: { bricks }, months });
});

Then("the card offers the actions {string}, {string} and {string}", (s, a: string, b: string, c: string) => {
  expect(s.card.actions).toEqual([a, b, c]);
});

Given("the province {string} has a step {int} {string} with {int} craftsmen slots", (s, p: string, step: number, type: string, n: number) => {
  P(s, p);
  s.building = place(s, p, type, { step });
  expect(B.stepDef(type, step).jobs).toBe(n);
});

Given("{int} of its slots are filled", (s, n: number) => {
  s.building.filled = n;
});

When("the year's wares are made", (s) => {
  s.made = B.yearlyMakes(s.building);
});

Then("only the filled slots make cloth", (s) => {
  const full = B.stepDef("loom house", 1).makes!.cloth!;
  expect(s.made.cloth).toBe((full * s.building.filled) / B.stepDef("loom house", 1).jobs!);
});

Then("a {string} with {int} filled slots makes nothing", (s, type: string, n: number) => {
  expect(B.yearlyMakes({ ...s.building, type, filled: n }).cloth).toBe(0);
});

Given("the country {string} has a step {int} {string} in {string}", (s, _c: string, step: number, type: string, p: string) => {
  P(s, p);
  s.building = place(s, p, type, { step, filled: 1500 });
});

When("the effects of the {string} are applied", (s) => {
  s.gives = B.buildingGives(s.building);
});

Then("the {string} gives job slots, wares and its named local effect", (s) => {
  expect(s.gives.jobSlots).toBe(1500);
  expect(Array.isArray(s.gives.wares)).toBe(true);
  expect(s.gives.localEffect).toBe("trade_endpoint");
});

Then("it gives no flat percentage to any country stat", (s) => {
  expect(s.gives.countryPercent).toBeNull();
});

// ---------------------------------------------------------------- events

Given(/^the province "([^"]+)" (has|lacks) a fitting empty place for a "([^"]+)"$/, (s, p: string, has: string) => {
  P(s, p, { townSize: "town" });
  s.province = p;
  if (has === "lacks") {
    s.fullest = place(s, p, "loom house", { filled: 1500 });
    s.least = place(s, p, "loom house", { filled: 100 });
    for (let i = 0; i < 4; i++) place(s, p, "loom house", { filled: 1000 });
  }
});

When("an event applies {string} with type {string}, step {int}, owner {string}", (s, effect: string, type: string, step: number, owner: string) => {
  expect(effect).toBe("add_building");
  s.result = B.addBuildingEffect(R(s), s.province, type, step, ownerOf(owner));
});

Then("a step 1 market owned by the crown stands on the empty place", (s) => {
  expect(s.result).toMatchObject({ type: "market", step: 1, owner: "crown" });
  expect(s.result.place).toMatch(/^town:/);
});

Then("the province's least-filled building goes up a step", (s) => {
  expect(s.result).toBe(s.least);
  expect(s.least.step).toBe(2);
  expect(s.fullest.step).toBe(1);
});

Given("the province {string} has a market at step {int}", (s, p: string, step: number) => {
  P(s, p);
  s.building = place(s, p, "market", { step });
  s.province = p;
});

When("an event applies {string} with type {string}", (s, effect: string, type: string) => {
  expect(effect).toBe("remove_building");
  B.removeBuildingEffect(R(s), s.province, type);
});

Then("the market is ruined", (s) => {
  expect(s.building.condition).toBe("ruined");
});

Given("the province {string} has {int} buildings", (s, p: string, n: number) => {
  P(s, p, { townSize: "great_city" });
  for (let i = 0; i < n; i++) place(s, p, "loom house");
  s.province = p;
});

When("an event applies {string} with share {float}", (s, effect: string, share: number) => {
  expect(effect).toBe("damage_buildings");
  B.damageBuildingsEffect(R(s), s.province, share, rng(s));
});

When(/^an event applies "building_step" with type "([^"]+)" and change ([+-]\d+)$/, (s, type: string, change: string) => {
  B.buildingStepEffect(R(s), s.province, type, Number(change));
  s.stepEvent = true;
});

Then(/^the condition "has_building" with type "([^"]+)" and step (\d+) (holds|does not hold)$/, (s, type: string, step: string, holds: string) => {
  expect(B.hasBuilding(R(s), s.province, type, Number(step))).toBe(holds === "holds");
});

When(/^an event applies "(prosperity|fort_level|infrastructure|industry) \+(\d+)" to "([^"]+)"$/, (s, stat: string, n: string, p: string) => {
  P(s, p, { townSize: "town" });
  s.castle = B.placeBuilding(R(s), p, "castle", "castle", { step: 1 });
  s.road = B.placeBuilding(R(s), p, "road", "ring:road", { step: 2 });
  s.before = B.prov(R(s), p).buildings.length;
  s.province = p;
  s.changed = B.oldStatEffect(R(s), p, stat as "prosperity", Number(n));
});

Then(/^(two fitting buildings are added|the castle goes up a step|the road goes up a step|a factory is added)$/, (s, result: string) => {
  const p = B.prov(R(s), s.province);
  if (result.startsWith("two")) expect(p.buildings.length).toBe(s.before + 2);
  else if (result.includes("castle")) expect(s.castle.step).toBe(2);
  else if (result.includes("road")) expect(s.road.step).toBe(3);
  else {
    expect(p.buildings.length).toBe(s.before + 1);
    expect(p.buildings.some((b) => b.type === "factory")).toBe(true);
  }
});

// ---------------------------------------------------------------- the AI

Given("the AI country {string} checks the province {string} this month", (s, _c: string, p: string) => {
  P(s, p);
});

Then(/^the AI picks (.+)$/, (s, choice: string) => {
  const expected: Record<string, string> = {
    "to repair or rebuild the market": "repair:market",
    "a food building on the empty tile": "food",
    "the building whose class can take most of them": "most_homeless_jobs",
    "a loom house": "loom house",
    "a castle step or walls": "castle_or_walls",
    "a house of worship": "house of worship",
    "a market or a harbour": "market|harbour",
  };
  expect(s.pick).toBe(expected[choice]);
});

Given("the AI country {string} has {int} provinces", (s, _c: string, n: number) => {
  for (let i = 0; i < n; i++) P(s, `Province ${i}`);
  s.ai = true;
});

Then("the AI checks one province and starts at most one building", (s) => {
  expect(s.aiResult.province).toBe("Province 0");
  expect(R(s).sites.length).toBeLessThanOrEqual(1);
  expect(R(s).sites.every((x) => x.province === s.aiResult.province)).toBe(true);
});

Given("the AI country {string} has building upkeep of {int} gold a year", (s, _c: string, upkeep: number) => {
  s.aiUpkeep = upkeep;
});

Given("it has {int} gold", (s, gold: number) => {
  s.aiGold = gold;
});

Given(/^the site (can|cannot) be crewed$/, (s, can: string) => {
  later(s, () => (s.aiStarts = B.aiMayStart(s.aiGold, B.costOf("market", 1).gold, s.aiUpkeep, can === "can")));
});

Then(/^the AI (starts|does not start) the site$/, (s, starts: string) => {
  expect(s.aiStarts).toBe(starts === "starts");
});

// ---------------------------------------------------------------- catalogue

const placeWords = ["fields", "pasture", "woods", "marsh", "waste", "hills", "mountains", "shore", "town"];

Then("the {string} stands on {string} with {} and costs {}", (_s, type: string, placeText: string, jobs: string, cost: string) => {
  const t = B.buildingType(type);
  const words = placeWords.filter((w) => placeText.includes(w));
  expect(words.length).toBeGreaterThan(0);
  const allowed = [...t.place, ...(JSON.stringify(t.steps[0]!.needs ?? {}).match(/[a-z]+/g) ?? [])];
  for (const w of words) expect(allowed).toContain(w);
  expect(t.place).toContain(words[0]);
  expect(B.formatJobs(t.id)).toBe(jobs);
  expect(B.formatCost(B.stepDef(t.id, 1).cost)).toBe(cost);
});

Given("the province {string} has {int} farms growing grain", (s, p: string, n: number) => {
  P(s, p);
  s.farms = Array.from({ length: n }, () => place(s, p, "farm", { crop: "grain" }));
  s.province = p;
});

When("the player sets one farm to flax", (s) => {
  B.setCrop(s.farms[0], "flax");
});

Then("that farm feeds nobody", (s) => {
  expect(B.feedsPeople(s.farms[0])).toBe(false);
  expect(B.feedsPeople(s.farms[1])).toBe(true);
});

Then("the province card warns if the province would be short of food", (s) => {
  const p = B.prov(R(s), s.province);
  expect(B.cropWarning(p, s.farms[0], 4 * 18000, 18000)).toBe(true);
  expect(B.cropWarning(p, s.farms[0], 3 * 18000, 18000)).toBe(false);
});

Given("a vineyard is finished in {string} in {int}", (s, p: string, year: number) => {
  P(s, p);
  s.building = place(s, p, "vineyard", { builtYear: year });
});

Then("it makes no grapes in {int}, {int} and {int}", (s, a: number, b: number, c: number) => {
  for (const y of [a, b, c]) expect(B.groveBears(s.building, y)).toBe(false);
});

Then("it makes grapes from {int}", (s, y: number) => {
  expect(B.groveBears(s.building, y)).toBe(true);
});

Given("a plantation in {string}", (s, p: string) => {
  P(s, p);
  s.building = place(s, p, "plantation");
});

Then("no rule gives it a forced-labour bonus", (s) => {
  expect(B.buildingType(s.building.type).forced_labour_bonus).toBe(false);
});

Given("a monastery stands on a fields tile in {string}", (s, p: string) => {
  P(s, p);
  s.building = place(s, p, "monastery");
  s.province = p;
});

Given("the country knows {string}", (s, id: string) => {
  R(s).inventions.add(id);
});

Then("it makes grain at the farm rate", (s) => {
  expect(s.building.place).toMatch(/^tile:/);
  expect(B.buildingType("monastery").grain_at_farm_rate).toBe(true);
});

Then("it makes clergy in the province", () => {
  expect(B.buildingType("monastery").makes_clergy).toBe(true);
});

Then("it gives {int} student seats", (s, n: number) => {
  expect(R(s).inventions.has("L1")).toBe(true);
  expect(B.stepDef("monastery", 1).student_seats_with_L1).toBe(n);
});

Given("the province {string} has no ranch and no horse stud", (s, p: string) => {
  P(s, p);
  s.province = p;
});

When("the player tries to build a saltpetre works", (s) => {
  s.check = B.canBuild(R(s), s.province, "saltpetre works");
  place(s, s.province, "ranch");
  expect(B.canBuild(R(s), s.province, "saltpetre works").ok).toBe(true);
});

Given("the province {string} has a weaving manufactory and no official", (s, p: string) => {
  P(s, p);
  s.building = place(s, p, "weaving manufactory");
  s.province = p;
});

Then("the weaving manufactory does not work", (s) => {
  expect(B.works(R(s), s.province, s.building)).toBe(false);
  B.prov(R(s), s.province).officials.add("judge");
  expect(B.works(R(s), s.province, s.building)).toBe(true);
});

Given("the province {string} has a factory at step {int} and no power station", (s, p: string, step: number) => {
  P(s, p);
  s.building = place(s, p, "factory", { step });
  s.province = p;
});

Then("the factory makes Smoke", (s) => {
  expect(B.factoryStatus(R(s), s.province, s.building).smoke).toBe(true);
});

Then("the step 2 factory lacks the power it needs", (s) => {
  expect(B.factoryStatus(R(s), s.province, s.building).powered).toBe(false);
  place(s, s.province, "power station");
  expect(B.factoryStatus(R(s), s.province, s.building).powered).toBe(true);
});

Then("the trade context reads the flag {string}", (s, flag: string) => {
  expect(B.stepFlags(s.building.type, s.building.step)).toContain(flag);
});

Given("the province {string} has a Jewish share of {float}", (s, p: string, share: number) => {
  P(s, p, { faithShares: { muslim: 1 - share, jewish: share } });
  s.province = p;
});

Then(/^a minority synagogue (may|may not) be built$/, (s, may: string) => {
  expect(B.mayBuildMinorityHouse(B.prov(R(s), s.province), "jewish")).toBe(may === "may");
});

Then("if built it calms that faith instead of spreading it", (s) => {
  const p = B.prov(R(s), s.province);
  B.placeBuilding(R(s), s.province, "minority house of worship", B.freePlace(R(s), s.province, "minority house of worship")!, { faith: "jewish" });
  expect(B.faithPulls(p).jewish).toBe("calms");
});

Given("the province {string} is a named holy place", (s, p: string) => {
  P(s, p, { holyPlace: true });
});

Given("the province {string} is not", (s, p: string) => {
  P(s, p, { holyPlace: false });
});

Then("a pilgrimage shrine is never on the build sheet in either province", (s) => {
  for (const p of ["Santiago", "Troyes"]) {
    expect(B.buildSheet(R(s), p).some((r) => r.type === "pilgrimage shrine")).toBe(false);
    expect(B.canBuild(R(s), p, "pilgrimage shrine").ok).toBe(false);
  }
});

Then("pilgrims to {string} count as traders passing", () => {
  expect(B.buildingType("pilgrimage shrine").pilgrims_count_as_traders).toBe(true);
});

Given("the province {string} has a church and a mosque", (s, p: string) => {
  P(s, p, { faithShares: { christian: 0.6, muslim: 0.4 } });
  place(s, p, "house of worship", { faith: "christian", name: "church" });
  s.minority = place(s, p, "minority house of worship", { faith: "muslim", name: "mosque" });
  s.province = p;
});

Then("Christians are moved by the church and Muslims by the mosque", (s) => {
  const pulls = B.faithPulls(B.prov(R(s), s.province));
  expect(Object.keys(pulls).sort()).toEqual(["christian", "muslim"]);
});

Then("pulling down the minority house of worship is persecution", (s) => {
  const res = B.demolish(R(s), s.province, s.minority, s.minority.owner);
  expect(res.ok && res.persecution).toBe(true);
});

Given("a school at step {int} as a {string}", (s, step: number, kind: string) => {
  s.seats = B.schoolSeats(step, kind);
});

Then("it has {int} student seats", (s, n: number) => {
  expect(s.seats).toBe(n);
});

Then("students there graduate a year sooner", (s) => {
  expect(B.localEffects(B.prov(R(s), s.province))).toContain("graduate_a_year_sooner");
});

Then("when {string} is sacked not all its scholars flee", (s, p: string) => {
  expect(B.localEffects(B.prov(R(s), p))).toContain("sacked_scholars_not_all_flee");
});

Then("scholars there work at double rate on Boats inventions", (s) => {
  expect(B.localEffects(B.prov(R(s), s.province))).toContain("boats_inventions_double_rate");
});

Then("town classes there die {float} % slower and plague spreads slower", (s, pct: number) => {
  const h = B.healthEffects(B.prov(R(s), s.province));
  expect(h.townDeathRateSlower).toBeCloseTo(pct / 100, 9);
  expect(h.plagueSpreadsSlower).toBe(true);
});

Then("plague deaths in town are halved", (s) => {
  expect(B.healthEffects(B.prov(R(s), s.province)).townPlagueDeathsFactor).toBe(0.5);
});

Then("the town can grow one size bigger before shanty camps", (s) => {
  expect(B.healthEffects(B.prov(R(s), s.province)).townSizeBonus).toBe(1);
});

Then("{int} homeless are sheltered", (s, n: number) => {
  expect(B.healthEffects(B.prov(R(s), s.province)).homelessSheltered).toBe(n);
});

Given("the country {string} has a palace at step {int}, three seats and a court of law", (s, _c: string, step: number) => {
  P(s, "Paris", { capital: true });
  R(s).capital = "Paris";
  B.placeBuilding(R(s), "Paris", "palace", "capital_extra", { step });
  for (const p of ["Paris", "Rouen", "Lyon"]) place(s, P(s, p).id, "seat");
  place(s, "Paris", "court of law");
});

Then("the buildings add {int} officials and {int} lords to its caps", (s, officials: number, lords: number) => {
  expect(B.ruleCaps(R(s))).toEqual({ officials, lords });
});

Then("tax registers take effect only once a chancery stands", (s) => {
  expect(B.takesEffect(R(s), "G3")).toBe(false);
  place(s, "Paris", "chancery");
  expect(B.takesEffect(R(s), "G3")).toBe(true);
});

Given("the province {string} makes silver and the realm has a mint", (s, p: string) => {
  P(s, p).makes.add("silver");
  place(s, p, "mint");
});

Then("the silver is coined at full value instead of sold on the market", (s) => {
  expect(B.mintCoins(R(s), "silver")).toBe(true);
  expect(B.mintCoins(R(s), "wool")).toBe(false);
});

Given(/^the province "([^"]+)" has an? (drill yard|harbour|shipyard) at step (\d+)$/, (s, p: string, type: string, step: string) => {
  P(s, p);
  if (type === "shipyard") place(s, p, "harbour");
  const n = Number(step);
  s.building = n > B.topStep(type) ? B.placeLandmark(R(s), "Venetian Arsenal") : place(s, p, type, { step: n });
});

Then("it has training room for {int} men of any arm", (s, n: number) => {
  expect(B.trainingRoom(s.building)).toBe(n);
});

Given("standing regiments are housed in the barracks of {string}", (s, p: string) => {
  P(s, p);
  s.building = place(s, p, "barracks");
});

Then("they do not give {string}", (s) => {
  expect(B.quarteringGrievance(s.building)).toBe(false);
  expect(B.quarteringGrievance({ ...s.building, step: 1 })).toBe(true);
});

Given("the country {string} keeps {int} arms in store and has no arsenal", (s, _c: string, arms: number) => {
  P(s, "Paris");
  s.arms = arms;
});

Then("{int} arms are lost", (s, n: number) => {
  expect(s.arms - s.armsAfter).toBeCloseTo(n, 9);
});

Given("the border province {string} has a watchtower line", (s, p: string) => {
  P(s, p);
  place(s, p, "watchtower line");
  s.province = p;
});

Then("enemy armies are seen one province further away", (s) => {
  expect(B.localEffects(B.prov(R(s), s.province))).toContain("enemy_armies_seen_one_province_further");
});

Then("raids are spotted a season ahead", (s) => {
  expect(B.localEffects(B.prov(R(s), s.province))).toContain("raids_spotted_a_season_ahead");
});

Then("it has {int} berths and is a port that raises sailors", (s, n: number) => {
  expect(B.berths(s.building)).toBe(n);
  expect(B.buildingType("harbour").port && B.buildingType("harbour").raises_sailors).toBe(true);
});

Then("it has {int} slipways", (s, n: number) => {
  expect(B.slipways(s.building)).toBe(n);
});

Then("ships in the next sea zone lose half as many to storms", () => {
  expect(B.buildingType("lighthouse").next_zone_storm_loss_factor).toBe(0.5);
});

Then("fleets based there keep their crews in peace without pay at sea", (s) => {
  expect(B.localEffects(B.prov(R(s), s.province))).toContain("based_crews_kept_in_peace_without_pay");
});

Then("sea battles next to {string} give its side reinforcement from the port", (s, p: string) => {
  expect(B.localEffects(B.prov(R(s), p))).toContain("reinforces_sea_battles_next_to_it");
});

When("a canal is built in {string}", (s, p: string) => {
  P(s, p);
  s.cost = B.costOf("canal", 1);
  const res = build(s, p, "canal");
  expect(res.ok).toBe(true);
});

Then("it costs {int} gold, {int} stone, {int} months and {int} labourers", (s, gold: number, stone: number, months: number, crew: number) => {
  expect(s.cost).toEqual({ gold, months, crew, materials: { stone } });
});

Then("it adds a river to the province", () => {
  expect(B.buildingType("canal").adds_river).toBe(true);
});

Then("its Days to capital count as 1 for orders and market prices", () => {
  expect(B.buildingType("telegraph office").days_to_capital).toBe(1);
});

Then("floods can't turn its fields to marsh", (s) => {
  expect(B.dykeEffects(R(s), s.province).floodsTurnFieldsToMarsh).toBe(false);
});

Then("with {string} its marsh tiles can be drained", (s, inv: string) => {
  R(s).inventions.delete(inv);
  expect(B.dykeEffects(R(s), s.province).marshCanBeDrained).toBe(false);
  R(s).inventions.add(inv);
  expect(B.dykeEffects(R(s), s.province).marshCanBeDrained).toBe(true);
});

// ---------------------------------------------------------------- landmarks and variants

Given(/^the date is (?!in era)(.+)$/, (s, date: string) => {
  R(s).year = Number(/(\d{4})$/.exec(date)![1]);
});

Then(/^the landmark "([^"]+)" is (on the map|not on the map; founded by event in \d+ if its requirements hold)$/, (s, id: string, state: string) => {
  const year = R(s).year;
  expect(B.landmarkOnBuildSheet()).toBe(false);
  if (state === "on the map") expect(B.landmarkOnMap(id, year)).toBe(true);
  else {
    expect(B.landmarkOnMap(id, year)).toBe(false);
    expect(state).toContain(String(B.landmark(id).founded_by_event));
    expect(B.landmarkOnMap(id, B.landmark(id).founded_by_event!, new Set([id]))).toBe(true);
  }
});

Given("the event founding {string} has fired in {string}", (s, id: string, p: string) => {
  P(s, p);
  expect(B.landmark(id).province).toBe(p);
  s.landmark = id;
});

Given("it is being built", (s) => {
  s.beingBuilt = true;
});

Then("realms of its faith can be asked for gifts toward it", (s) => {
  expect(s.beingBuilt && B.landmark(s.landmark).asks_gifts_while_built).toBe(true);
});

Given("the landmark {string} stands neglected in {int}", (s, id: string) => {
  P(s, B.landmark(id).province);
  s.building = B.placeLandmark(R(s), id);
  expect(s.building.condition).toBe("neglected");
  R(s).treasury = 0;
});

When("its owner pays its upkeep", (s) => {
  B.addGold(R(s), B.upkeepPayer(s.building), 1000);
  for (let m = 0; m < 3; m++) B.monthlyUpkeep(R(s));
});

Then("it can be brought back to sound", (s) => {
  expect(s.building.condition).toBe("sound");
});

Then("restoring it is a decision with its own event", (s) => {
  expect(B.landmark(s.building.landmark).restoring_is_decision).toBe(true);
});

Given("an event founds a landmark in an alternate history", (s) => {
  P(s, "Lisbon");
  s.landmark = "St Peter's Basilica";
  later(s, () => {
    B.prov(R(s), "Lisbon");
    s.placed = B.placeBuilding(R(s), "Lisbon", B.landmark(s.landmark).building, B.freePlace(R(s), "Lisbon", "house of worship")!, { landmark: s.landmark, step: 4 });
  });
});

Then("the landmark is a real building that stood or was built between 1444 and 1939", (s) => {
  expect(B.landmarkIsReal(s.landmark)).toBe(true);
  expect(B.landmarkIsReal("Tower of Babel")).toBe(false);
  const year = B.landmark(s.landmark).founded_by_event!;
  expect(year >= 1444 && year <= 1939).toBe(true);
});

Then("it may stand in another realm or never be built", (s) => {
  expect(s.placed.landmark).toBe(s.landmark);
  expect(B.landmark(s.landmark).province).not.toBe("Lisbon");
  expect(B.landmarkOnMap(s.landmark, 1939)).toBe(false);
});

Given("a {string} stands in a province of region and faith {string}", (s, type: string, region: string) => {
  s.variant = { type, region };
});

Then("it is named {string} with that region's sprite", (s, name: string) => {
  expect(B.variantName(s.variant.type, s.variant.region)).toBe(name);
});

Then("its effect is the same as everywhere", (s) => {
  const t = B.buildingType(s.variant.type);
  expect(B.buildingType(B.findStep(s.variant.type).type.id)).toBe(t);
});

// ---------------------------------------------------------------- start of the game

Given("the province {string} has map wealth {int}", (s, p: string, wealth: number) => {
  P(s, p, { townSize: "town" });
  if (wealth === 10) for (let i = 0; i < 3; i++) place(s, p, "loom house");
  s.wealth = wealth;
  s.province = p;
});

When("the campaign starts", (s) => {
  if (s.wealth !== undefined) s.placed = B.placeByWealth(R(s), s.province, s.wealth);
  if (s.template) s.placed = B.fillByTemplate(R(s), s.province, s.template);
});

Then("a farm or ranch stands on a third of its tiles", (s) => {
  const p = B.prov(R(s), s.province);
  expect(s.placed).toHaveLength(p.tiles.length / 3);
  for (const b of s.placed) expect(["farm", "ranch"]).toContain(b.type);
});

Then("every tile is built and its town buildings are at step 2", (s) => {
  const p = B.prov(R(s), s.province);
  p.tiles.forEach((_, i) => expect(p.buildings.some((b) => b.place === `tile:${i + 1}`)).toBe(true));
  for (const b of p.buildings.filter((x) => x.place.startsWith("town:"))) expect(b.step).toBe(2);
});

Given("the province {string} is a {string} town", (s, p: string, template: string) => {
  P(s, p, { townSize: "market_town" });
  s.template = template;
  s.province = p;
});

Then("its town slots are filled with {}", (s, list: string) => {
  expect(s.placed.map((b: B.Building) => b.name)).toEqual(list.split(", "));
  for (const b of s.placed) expect(b.place).toMatch(/^town:/);
});

When("the campaign reaches {}", (s, date: string) => {
  s.anchors = B.anchorsBy(Number(/(\d{4})$/.exec(date)![1]));
});

Then(/^"([^"]+)" is (on the map|founded by its event)$/, (s, id: string, state: string) => {
  const a = (s.anchors as { id: string; byEvent: boolean }[]).find((x) => x.id === id);
  expect(a).toBeDefined();
  expect(a!.byEvent).toBe(state !== "on the map");
  if (a!.byEvent) expect(B.anchorsBy(1544).some((x) => x.id === id)).toBe(false);
});

Given("a province with {int} town buildings", (s, n: number) => {
  P(s, "Paris", { townSize: "great_city" });
  for (let i = 0; i < n; i++) place(s, "Paris", "loom house");
  s.province = "Paris";
});

Then("each building stores type, step, owner, condition and filled jobs", (s) => {
  for (const b of B.prov(R(s), s.province).buildings) expect(Object.keys(B.storedFields(b))).toEqual(["type", "step", "owner", "condition", "filled"]);
});

Then("sites are kept in one realm-level list", (s) => {
  B.startSite(R(s), "Paris", "farm");
  expect(R(s).sites).toHaveLength(1);
  expect("sites" in B.prov(R(s), "Paris")).toBe(false);
});

Then("adding a building type is adding one config entry", () => {
  const ids = B.buildingsConfig.buildings.map((b) => b.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(B.buildingType(id).id).toBe(id);
});

// ---------------------------------------------------------------- Troyes

Given("the province {string} has 12 tiles: 4 farms, a burned field, 2 ranches, a lumber camp, an empty woods tile, a fishery on the Seine, the castle and the town", (s, p: string) => {
  const tiles: B.Tile[] = [
    { use: "fields" },
    { use: "fields" },
    { use: "fields" },
    { use: "fields" },
    { use: "fields", burned: true },
    { use: "pasture" },
    { use: "pasture" },
    { use: "woods" },
    { use: "woods" },
  ];
  P(s, p, { tiles, shoreTiles: 1, neighbours: ["Champagne", "Burgundy"], roadOrRiver: ["Champagne"], townSize: "town", charters: new Set() });
  for (let i = 1; i <= 4; i++) B.placeBuilding(R(s), p, "farm", `tile:${i}`);
  B.placeBuilding(R(s), p, "farm", "tile:5", { condition: "ruined" });
  B.placeBuilding(R(s), p, "ranch", "tile:6");
  B.placeBuilding(R(s), p, "ranch", "tile:7");
  B.placeBuilding(R(s), p, "lumber camp", "tile:8");
  B.placeBuilding(R(s), p, "fishery", "shore:1");
  B.placeBuilding(R(s), p, "castle", "castle");
  P(s, "Champagne", { neighbours: ["Troyes"], tiles: [{ use: "hills" }] });
});

Given("the town of {string} is a town with {int} slots holding a market, 3 loom houses, a church and a school", (s, p: string, slots: number) => {
  expect(B.townSlots("town")).toBe(slots);
  place(s, p, "market");
  for (let i = 0; i < 3; i++) place(s, p, "loom house");
  place(s, p, "house of worship", { faith: "catholic", name: "church" });
  place(s, p, "school");
  expect(B.townSlotsUsed(B.prov(R(s), p))).toBe(slots);
});

Given("the shipyard downriver needs the timber of {string}", (s, p: string) => {
  s.keepWoods = p;
});

When("the player leaves the woods tile and builds a quarry on a hills tile of a neighbouring province for {int} gold", (s, gold: number) => {
  const p = B.prov(R(s), "Troyes");
  const woods = p.tiles.findIndex((t, i) => t.use === "woods" && !p.buildings.some((b) => b.place === `tile:${i + 1}`));
  expect(woods).toBeGreaterThanOrEqual(0);
  expect(B.costOf("quarry", 1, "farmland").gold).toBe(gold);
  const res = build(s, "Champagne", "quarry");
  expect(res.ok).toBe(true);
  B.prov(R(s), "Champagne").makes.add("stone");
  expect(p.tiles[woods]!.use).toBe("woods");
});

Then("the next castle step in {string} needs no bought stone", (s, p: string) => {
  const need = B.costOf("castle", 2).materials.stone!;
  expect(B.sourceMaterial(R(s), p, "stone", need)).toEqual({ from: "reach", province: "Champagne", along: "ring" });
});

// ---------------------------------------------------------------- Works screen

Given("the player opens the {string} lens", (s, lens: string) => {
  s.lens = lens;
  P(s, "Troyes", { homeless: 2000 });
  P(s, "Reims");
  P(s, "Rouen");
  P(s, "Orléans");
  expect(B.startSite(R(s), "Troyes", "farm").ok).toBe(true);
  P(s, "Troyes", { homeless: 900 });
  place(s, "Rouen", "market", { condition: "neglected" });
  place(s, "Orléans", "market", { condition: "ruined" });
  place(s, "Reims", "loom house", { filled: 500 });
});

Then(/^provinces are coloured by (sites green, neglected or damaged amber, ruined red|empty job slots against homeless people)$/, (s) => {
  if (s.lens === "Works") {
    expect(B.worksLens(R(s), "Troyes")).toBe("green");
    expect(B.worksLens(R(s), "Rouen")).toBe("amber");
    expect(B.worksLens(R(s), "Orléans")).toBe("red");
  } else {
    expect(B.jobsLens(B.prov(R(s), "Reims"))).toEqual({ emptySlots: 1000, homeless: 0 });
    expect(B.jobsLens(B.prov(R(s), "Troyes")).homeless).toBe(900);
  }
});

Given("the country {string} has {int} sites running and {int} gold of upkeep a year", (s, _c: string, sites: number) => {
  upkeep84(s);
  P(s, "Rouen").buildings[1]!.condition = "neglected";
  B.placeBuilding(R(s), "Lyon", "market", "town:2", { condition: "ruined" });
  for (const p of ["Paris", "Reims", "Rouen"]) {
    expect(B.startSite(R(s), p, "farm").ok).toBe(true);
    expect(B.startSite(R(s), p, "forge").ok).toBe(true);
  }
  expect(R(s).sites).toHaveLength(sites);
  P(s, "Paris").homeless = 9400;
  B.workOutAdvice(R(s));
});

When("the player opens the Works screen", (s) => {
  s.screen = B.worksScreen(R(s));
});

Then("it shows {string}", (s, header: string) => {
  expect(s.screen.header).toBe(header);
});

Then("it lists sites with months done and crew", (s) => {
  expect(s.screen.sites).toHaveLength(6);
  for (const x of s.screen.sites) expect(x).toHaveProperty("monthsDone");
  for (const x of s.screen.sites) expect(x).toHaveProperty("crew");
});

Then("it lists needs with {string} and {string} actions", (s, pay: string, rebuild: string) => {
  const actions = s.screen.needs.map((n: { action: string }) => n.action);
  expect(actions).toContain(pay);
  expect(actions).toContain(rebuild);
});

Then("it lists advice", (s) => {
  expect(s.screen.advice.length).toBeGreaterThan(0);
});

Given("the country {string} has {int} provinces with homeless and empty tiles", (s, _c: string, n: number) => {
  for (let i = 0; i < n; i++) P(s, `Province ${i}`, { homeless: 2000 });
});

When("the year begins", (s) => {
  B.workOutAdvice(R(s));
});

Then("the Works screen shows at most {int} advice lines", (s, n: number) => {
  expect(B.worksScreen(R(s)).advice.length).toBeLessThanOrEqual(n);
  expect(B.worksScreen(R(s)).advice.length).toBe(n);
});

Given("the Works screen shows {int} advice lines costing {int}, {int} and {int} gold", (s, _n: number, a: number, b: number, c: number) => {
  s.advice = [a, b, c].map((gold, i) => ({ province: `P${i}`, type: "farm", gold }));
});

Given("the player has set aside {int} gold", (s, gold: number) => {
  s.aside = gold;
});

When("the player orders {string}", (s, order: string) => {
  if (order === "Build all advised") s.queued = B.buildAllAdvised(s.advice, s.aside);
  else {
    for (const p of ["Paris", "Reims", "Rouen"]) P(s, p);
    B.placeBuilding(R(s), "Paris", "castle", "castle");
    B.placeBuilding(R(s), "Reims", "castle", "castle");
    s.started = B.batchOrder(R(s), "granary");
  }
});

Then("every suggestion that fits within {int} gold is queued", (s, gold: number) => {
  expect(s.queued.map((a: B.Advice) => a.gold)).toEqual([30, 40]);
  expect(s.queued.reduce((t: number, a: B.Advice) => t + a.gold, 0)).toBeLessThanOrEqual(gold);
});

Then("a granary site starts at every castle where it fits", (s) => {
  expect(s.started.map((x: B.Site) => x.province).sort()).toEqual(["Paris", "Reims"]);
});

When(/^(a building is finished|a building is lost|upkeep first goes unpaid in a month)$/, (s, event: string) => {
  const r = R(s);
  P(s, "Troyes");
  const before = r.report.length;
  if (event === "a building is finished") {
    const res = B.startSite(r, "Troyes", "farm");
    if (res.ok) B.completeSite(r, res.site);
  } else if (event === "a building is lost") B.ruin(r, place(s, "Troyes", "market"), "burned");
  else {
    place(s, "Troyes", "market");
    r.treasury = 0;
    B.monthlyUpkeep(r);
    B.monthlyUpkeep(r);
  }
  s.newLines = r.report.slice(before);
});

Then("the turn report has one line saying so", (s) => {
  expect(s.newLines).toHaveLength(1);
});


// ---------------------------------------------------------------- decided rules (spec §13, BLD-155 to BLD-161)

Given("the province {string} is a market town with a weekly market and a market charter", (s, p: string) => {
  P(s, p, { townSize: "market_town", charters: new Set(["market charter"]) });
  s.building = place(s, p, "weekly market");
});
When("the country {string} learns T6", (s) => {
  R(s).inventions.add("T6");
});
Then("a yearly fair may be built in {string}", (s, p: string) => {
  expect(B.mayBuildYearlyFair(R(s), p)).toBeNull();
});
Then(/^the "(caravanserai|counting house)" gives "([^"]+)"$/, (_s, b: "caravanserai" | "counting house", role: string) => {
  expect(B.tradeRole(b)).toBe(role);
});
Given("a town of size {string}", (s, size: B.TownSize) => {
  s.townSizeOnly = size;
});
Then("its chance of a fire this year is {}", (s, c: string) => {
  expect(B.townFireChance(s.townSizeOnly)).toBeCloseTo(Number(c.replace(/\s*%/, "")) / 100);
});
Given(/^a raid of ([\d,]+) men$/, (s, n: string) => {
  s.raidMen = Number(n.replace(/,/g, ""));
});
Then(/^the raid is (small|big)$/, (s, size: string) => {
  expect(B.isBigRaid(s.raidMen)).toBe(size === "big");
});
Given("the province {string} has 2 burned farm tiles", (s, p: string) => {
  P(s, p, { tiles: [{ use: "fields", burned: true }, { use: "fields", burned: true }] });
  B.placeBuilding(R(s), p, "farm", "tile:1", { condition: "ruined" });
  B.placeBuilding(R(s), p, "farm", "tile:2", { condition: "ruined" });
  s.province = p;
});
When("a year of peace passes", (s) => {
  s.rebuilt = [];
  for (let i = 0; i < B.freeRebuildsPerYear(); i++) {
    const b = B.yearlySelfRebuild(R(s), s.province);
    if (b) s.rebuilt.push(b);
  }
});
Then("1 farm rebuilds by itself for free", (s) => {
  expect(s.rebuilt).toHaveLength(1);
  expect(B.prov(R(s), s.province).buildings.filter((b) => b.condition === "ruined")).toHaveLength(1);
});
Then(/^paying (\d+) gold rebuilds the other within (\d+) months$/, (_s, g: string, m: string) => {
  expect(B.paidRebuild()).toEqual({ gold: Number(g), months: Number(m) });
});
Given(/^the landmark "([^"]+)" stands in "([^"]+)"$/, (s, id: string, p: string) => {
  expect(B.landmark(id).province).toBe(p);
  s.landmarkId = id;
});
Then("it is a {string}", (s, type: string) => {
  expect(B.landmarkInfo(s.landmarkId).type).toBe(type);
});
Then("its own effect is {string}", (s, effect: string) => {
  expect(B.landmarkInfo(s.landmarkId).effect).toBe(effect);
});
Then("the variant {string} for {string} is stored in the buildings data, changing {string}", (_s, id: string, who: string, change: string) => {
  expect(B.uniqueVariant(id)).toEqual({ who, change });
});
Given(/^the province "Troyes" is touched by (a|no) trade route$/, (s, a: string) => {
  s.onRoute = a === "a";
});
When("a site there buys 30 stone", (s) => {
  s.paid = B.buyPrice("stone", 30, 0, s.onRoute);
});
When("the player starts a market costing 40 gold and 6 months", (s) => {
  s.mowCost = B.costOf("market", 1, "farmland", true);
  const res = B.startSite(R(s), s.province, "market");
  expect(res.ok).toBe(true);
});
Then("it costs 30 gold and takes 3 months", (s) => {
  expect(s.mowCost.gold).toBe(30);
  expect(s.mowCost.months).toBe(3);
});
Then(/^(\d+) provinces from the naval ports-1444 list have a harbour with its step$/, (_s, n: string) => {
  expect(B.startingPortsFile()).toBe("naval-ports-1444");
  expect(PORTS.size).toBe(Number(n));
});
Then(/^the (\d+) provinces with a great port of the time have harbour step 3$/, (_s, n: string) => {
  expect([...PORTS.values()].filter((x) => x === 3)).toHaveLength(Number(n));
});
Then(/^the town of "([^"]+)" is a "([^"]+)" with (\d+) town slots$/, (_s, _p: string, size: string, n: string) => {
  expect(B.troyes1444()).toEqual({ townSize: size, slots: Number(n) });
});
Then(/^road step (\d) is the "([^"]+)", needing "([^"]+)" and (\d+) gold$/, (_s, step: string, name: string, unlock: string, gold: string) => {
  expect(B.roadSteps()[Number(step) - 1]).toEqual({ name, unlock, gold: Number(gold) });
});
Then("the {string} has steps up to {int}", (_s, type: string, top: number) => {
  expect(B.stepsUpTo(type)).toBe(top);
});
When("the player pays 15 gold to rebuild the burned field", (s) => {
  s.paidRebuild = B.paidRebuild();
  expect(s.paidRebuild.gold).toBe(15);
});
Then("the farm is rebuilt in 3 months instead of a year", (s) => {
  expect(s.paidRebuild.months).toBe(3);
  expect(s.paidRebuild.months).toBeLessThan(12);
});
Then("500 of the homeless form the crew", (s) => {
  expect(B.stepDef("farm", 1).cost.crew).toBe(500);
  expect(B.prov(R(s), "Troyes").homeless).toBeGreaterThanOrEqual(500);
});
Then("when it is done they move into the farm's slots", () => {
  expect(B.stepDef("farm", 1).jobs ?? 0).toBeGreaterThanOrEqual(500);
});
Given("no free town slot is left in {string}", (s, p: string) => {
  const q = B.prov(R(s), p);
  expect(B.townSlotsUsed(q)).toBe(B.townSlots(q.townSize));
});
Given("a market charter is granted in {string}", (s, p: string) => {
  B.prov(R(s), p).charters.add("market charter");
  P(s, "Champagne").lord = "Count of Champagne";
  P(s, "Champagne").makes.add("stone");
});
When("the player upgrades the market to a yearly fair for 100 gold, 30 stone and 12 months", (s) => {
  const c = B.costOf("market", 2);
  expect([c.gold, c.materials.stone, c.months]).toEqual([100, 30, 12]);
  const market = B.prov(R(s), "Troyes").buildings.find((b) => b.type === "market")!;
  s.check = B.upgrade(R(s), "Troyes", market);
  expect(s.check.ok).toBe(true);
});
Then("the stone comes free from a quarry in a lord's province one ring away, which counts as the crown's own", (s) => {
  expect(B.sourceMaterial(R(s), "Troyes", "stone", 30)).toEqual({ from: "reach", province: "Champagne", along: "ring" });
});
Then("the crew of 2000 is all homeless", (s) => {
  expect(B.stepDef("market", 2).cost.crew).toBe(2000);
  expect(B.prov(R(s), "Troyes").homeless).toBe(3600 - 2000);
});
Then("when the fair opens it takes 900 more market folk", () => {
  expect((B.stepDef("market", 2).jobs ?? 0) - (B.stepDef("market", 1).jobs ?? 0)).toBe(900);
});
Then("traders can be hired in {string}", () => {
  expect(B.stepFlags("market", 2)).toContain("hires_traders");
});
