import { expect } from "vitest";
import { createWorld, officialEffect as gameOfficialEffect, Rng, yearsServed } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";
import * as P from "@ph/engine/domain/province";
import type { Ground, Province, ClassName, TaxRate, Use, Lord, Official } from "@ph/engine/domain/province";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("province");
const cfg = P.provinceConfig;

// ---------------------------------------------------------------- helpers

const num = (t: string): number => Number(t.replace(/,/g, ""));
/** "+25 %" → 0.25, "−10 %" → −0.10, "0" → 0. */
const pct = (t: string): number => {
  const m = t.trim().replace("−", "-").match(/^([+-]?[\d.]+)\s*%?$/);
  if (!m) throw new Error(`not a percentage: ${t}`);
  return t.includes("%") ? Number(m[1]) / 100 : Number(m[1]);
};
/** "+25 %" → ×1.25, "−25 %" → ×0.75, "100 %" → ×1. */
const factor = (t: string): number => {
  const s = t.trim().replace("−", "-");
  if (/^[+-]/.test(s)) return 1 + pct(s);
  return pct(s);
};
const cap = (w: string): Use => (w[0]!.toUpperCase() + w.slice(1).toLowerCase()) as Use;
const USES = ["fields", "pasture", "woods", "marsh", "waste", "shore", "town", "castle"];

function known(s: Scenario): string[] {
  return (s.known ??= []);
}
function prov(s: Scenario, name: string, ground: Ground = "farmland"): Province {
  s.provinces ??= {};
  if (!s.provinces[name]) s.provinces[name] = P.newProvince(name, ground, { owner: "France", known: known(s) });
  s.cur = s.provinces[name];
  return s.provinces[name];
}
function cur(s: Scenario): Province {
  return s.cur ?? prov(s, "Troyes");
}
function addTile(p: Province, use: Use, building: string | null = null): number {
  p.tiles.push(P.tile(use, building));
  return p.tiles.length - 1;
}
/** Every slot full: four farms of farmers and a town tile. */
function fullFarms(p: Province, farms = 4): void {
  for (let i = 0; i < farms; i++) addTile(p, "Fields", "farm");
  if (!p.tiles.some((t) => t.use === "Town")) addTile(p, "Town");
  p.people.farmers += farms * 12000;
}
function lord(s: Scenario, name: string): Lord {
  s.lords ??= {};
  return (s.lords[name] ??= P.newLord(name, []));
}
function work(s: Scenario, fn: () => void): void {
  (s.work ??= []).push(fn);
}

When("the game works out the province's stats", (s) => {
  for (const fn of s.work ?? []) fn();
});

// ---------------------------------------------------------------- basics

Given("any province stat", (s) => {
  const p = prov(s, "Troyes");
  fullFarms(p);
  addTile(p, "Woods");
  p.tiles[0]!.state = "Burned";
  p.people.homeless = 3600;
  work(s, () => (s.stats = P.provinceStats(p)));
});
Then("it is a count of tiles, buildings, workers, men, gold or days", (s) => {
  const allowed = ["tiles", "buildings", "workers", "people", "men", "gold", "days", "months", "grievances"];
  for (const [, v] of Object.entries(s.stats as Record<string, { value: number; unit: string }>)) {
    expect(allowed).toContain(v.unit);
    expect(Number.isFinite(v.value)).toBe(true);
    expect(v.value).toBeGreaterThanOrEqual(0);
  }
});
Then("no development, base tax, autonomy, core, unrest or devastation meter exists", (s) => {
  const keys = [...Object.keys(s.stats), ...Object.keys(cur(s))].map((k) => k.toLowerCase());
  for (const meter of P.FORBIDDEN_METERS) expect(keys.some((k) => k.replace(/[^a-z]/g, "").includes(meter.replace(/ /g, "")))).toBe(false);
});

Given("the player opens the province {string}", (s, name: string) => {
  prov(s, name);
  s.card = P.provinceCard();
});
Then(/^the card shows its (.+)$/, (s, list: string) => {
  const want = list.split(/, | and /).map((x) => x.trim());
  for (const line of want) expect(s.card.lines).toContain(line);
});
When("the player taps the {string} line", (s, line: string) => {
  s.detail = s.card.detail(line);
});
Then("its list of how it is gained and how it is lost is shown", (s) => {
  expect(s.detail.gain.length).toBeGreaterThan(0);
  expect(s.detail.lose.length).toBeGreaterThan(0);
});

Given("the province config file", (s) => {
  s.cfg = cfg;
});
Then("it holds jobs per building, food per worker, the ground tables, slots per town size, toll effects and grievance thresholds", (s) => {
  const c = s.cfg as typeof cfg;
  expect(c.buildings.land.farm.slots).toBe(12000);
  expect(c.buildings.land.farm.food_per_worker).toBe(1.5);
  expect(Object.keys(c.ground.troops)).toHaveLength(11);
  expect(Object.keys(c.ground.economy)).toHaveLength(11);
  expect(c.town.building_slots.city).toBe(9);
  expect(c.tolls.rates).toEqual(["none", "low", "high"]);
  expect(c.grievances.levels.riots).toBe(3);
});
Then("changing them needs no code change", (s) => {
  const changed = structuredClone(s.cfg as typeof cfg);
  changed.bare_tile.slots = 1234;
  expect(P.tileSlots(P.tile("Woods"), changed)?.slots).toBe(1234);
  expect(P.tileSlots(P.tile("Woods"))?.slots).toBe(3000);
});

// ---------------------------------------------------------------- tiles

Given(/^the province "([^"]+)" is the (smallest|largest) province on the map$/, (s, name: string, size: "smallest" | "largest") => {
  prov(s, name);
  s.size = size;
});
When("the province's tiles are laid out", (s) => {
  if (s.size) s.tileCount = P.tileCountForSize(s.size);
  if (s.onWater !== undefined) s.shore = [0, 1, 2, 3, 5].map((w) => P.shoreTileCount(s.onWater, w));
});
Then("the province {string} has {int} tiles", (s, _n: string, n: number) => {
  expect(s.tileCount).toBe(n);
});
Given(/^the province "([^"]+)" (lies on a navigable river|lies on a coast|has no coast, lake or river)$/, (s, name: string, water: string) => {
  prov(s, name);
  s.onWater = !water.startsWith("has no");
});
Then(/^the province "([^"]+)" has (1 to 3|\d+) shore tiles$/, (s, _n: string, want: string) => {
  for (const n of s.shore as number[]) {
    if (want === "1 to 3") {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    } else expect(n).toBe(Number(want));
  }
});

Given("the province {string} has a tile with use {string}", (s, name: string, use: string) => {
  s.tileIdx = addTile(prov(s, name), use as Use);
});
When("a {string} is placed on that tile", (s, b: string) => {
  s.placed = P.canPlace(cur(s), s.tileIdx, b.toLowerCase(), { anyInvention: true, seam: true, water: true, tropical: true, dryOrWarmCoast: true });
});
Then(/^the placement is (allowed|refused)$/, (s, r: string) => {
  expect(s.placed).toBe(r === "allowed");
});

Given(new RegExp(`^the province "([^"]+)" has an? (${USES.join("|")}) tile$`, "i"), (s, name: string, use: string) => {
  const p = prov(s, name);
  s.tileIdx = addTile(p, cap(use), cap(use) === "Castle" ? "castle" : null);
  s.tileUse = cap(use);
});
Given("the province {string} has an empty woods tile", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Woods");
});
When("the country {string} pays gold to clear that woods tile", (s) => {
  expect(P.changeTileUse(cur(s), s.tileIdx, "clear woods")).toBe(true);
});
Then("after {int} years the tile's use is {string}", (s, years: number, use: string) => {
  P.advanceTileChanges(cur(s), years * 12 - 1);
  expect(cur(s).tiles[s.tileIdx]!.use).not.toBe(use);
  P.advanceTileChanges(cur(s), 1);
  expect(cur(s).tiles[s.tileIdx]!.use).toBe(use);
});
Then(/^the province "([^"]+)" gains (\d+) loads? of timber$/, (s, name: string, n: string) => {
  expect(prov(s, name).timber).toBe(Number(n));
});
Given("the province {string} has a fields tile nobody has worked for 10 years", (s, name: string) => {
  const p = prov(s, name);
  s.tileIdx = addTile(p, "Fields");
  p.tiles[s.tileIdx]!.idleYears = cfg.fields_to_woods.years - 1;
});
When("the year ends", (s) => {
  P.yearEndLand(cur(s));
});
Then("the tile's use is {string}", (s, use: string) => {
  expect(cur(s).tiles[s.tileIdx]!.use).toBe(use);
});
When(/^the tile is (salted|overgrazed|irrigated|drained)$/, (s, how: string) => {
  if (how === "irrigated" || how === "drained") s.groundWork = { [how]: true };
  else expect(P.changeTileUse(cur(s), s.tileIdx, how === "salted" ? "salt" : "overgraze")).toBe(true);
});
When("the country {string} turns that tile to pasture", (s) => {
  expect(P.changeTileUse(cur(s), s.tileIdx, "to pasture")).toBe(true);
});
Then("after one season the tile's use is {string}", (s, use: string) => {
  P.advanceTileChanges(cur(s), cfg.months_per_season);
  expect(cur(s).tiles[s.tileIdx]!.use).toBe(use);
});
When("the country {string} ploughs that tile", (s) => {
  expect(P.changeTileUse(cur(s), s.tileIdx, "plough")).toBe(true);
});
When("the country drains it with Polder drainage", (s) => {
  known(s).push("Polder drainage");
  expect(P.changeTileUse(cur(s), s.tileIdx, "drain")).toBe(true);
});
When("a flood strikes the tile", (s) => {
  expect(P.changeTileUse(cur(s), s.tileIdx, "flood")).toBe(true);
});
When("a dyke is broken in war", (s) => {
  expect(P.changeTileUse(cur(s), s.tileIdx, "dyke broken")).toBe(true);
});
Given("the country {string} knows the invention {string}", (s, _c: string, inv: string) => {
  known(s).push(inv);
});
When("the country {string} irrigates that tile", (s) => {
  expect(P.changeTileUse(cur(s), s.tileIdx, "irrigate")).toBe(true);
});
Given("the province {string} has a shore tile with a fishery", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Shore", "fishery");
});
When("an enemy fleet blockades the province {string}", (s, name: string) => {
  prov(s, name).blockaded = true;
});
Then("the fishery stops working", (s) => {
  expect(P.buildingWorks(cur(s), s.tileIdx)).toBe(false);
});
Then("the province {string} still has that shore tile", (s, name: string) => {
  expect(prov(s, name).tiles[s.tileIdx]!.use).toBe("Shore");
});

Given("the province {string} has one Town tile and 39,000 townsfolk", (s, name: string) => {
  const p = prov(s, name);
  addTile(p, "Town");
  for (let i = 0; i < 4; i++) addTile(p, "Fields");
  s.fieldsBefore = 4;
});
When(/^its townsfolk (reach|fall below) 40,000$/, (s, how: string) => {
  P.updateTownTiles(cur(s), how === "reach" ? 40000 : 39999);
});
const countUse = (p: Province, u: Use) => p.tiles.filter((t) => t.use === u).length;
Then("the town takes a second tile built over fields", (s) => {
  expect(countUse(cur(s), "Town")).toBe(2);
  expect(countUse(cur(s), "Fields")).toBe(s.fieldsBefore - 1);
});
Then("the second town tile becomes fields again", (s) => {
  expect(countUse(cur(s), "Town")).toBe(1);
  expect(countUse(cur(s), "Fields")).toBe(s.fieldsBefore);
});
Given("the province {string} is a great city", (s, name: string) => {
  const p = prov(s, name);
  p.townSize = "great city";
  addTile(p, "Town");
  for (let i = 0; i < 6; i++) addTile(p, "Fields");
  work(s, () => P.updateTownTiles(p, P.townsfolk(p)));
});
Then("the town of {string} covers {int} tiles", (s, name: string, n: number) => {
  expect(countUse(prov(s, name), "Town")).toBe(n);
});
When("the country {string} builds a castle on it", (s) => {
  s.castleBuilt = P.buildCastleTile(cur(s), s.tileIdx);
});
Then(/^the castle is (built, and the tile stops producing|refused)$/, (s, r: string) => {
  if (r === "refused") return expect(s.castleBuilt).toBe(false);
  expect(s.castleBuilt).toBe(true);
  expect(P.tileSlots(cur(s).tiles[s.tileIdx]!)).toBeNull();
});
Given("the province {string} has a castle", (s, name: string) => {
  const p = prov(s, name);
  s.tileIdx = addTile(p, "Castle", "castle");
  p.castle = "stone castle";
  p.garrison = 300;
});
When("the castle is destroyed", (s) => {
  P.destroyCastleTile(cur(s));
});
Then("the castle tile is {string} for {int} years", (s, use: string, years: number) => {
  const t = cur(s).tiles[s.tileIdx]!;
  expect(t.use).toBe(use);
  P.advanceTileChanges(cur(s), years * 12 - 1);
  expect(t.use).toBe(use);
});
Then("after that the tile's use is {string}", (s, use: string) => {
  P.advanceTileChanges(cur(s), 1);
  expect(cur(s).tiles[s.tileIdx]!.use).toBe(use);
});
When("the woods are cleared for fields", (s) => {
  P.changeTileUse(cur(s), s.tileIdx, "clear woods");
  P.advanceTileChanges(cur(s), cfg.clear_woods.years * 12);
});
When("drought ruins the pasture", (s) => {
  P.changeTileUse(cur(s), s.tileIdx, "drought");
});
When("the pasture is ploughed to fields", (s) => {
  P.changeTileUse(cur(s), s.tileIdx, "plough");
});
Then(/^the province "([^"]+)" loses that (woods|pasture) tile$/, (s, name: string, use: string) => {
  expect(prov(s, name).tiles[s.tileIdx]!.use).not.toBe(cap(use));
});
Given("the country {string} knows a later replanting invention", (s) => {
  known(s).push("replanting");
});
When("the country {string} replants a fields tile in the province {string}", (s, _c: string, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields");
  expect(P.changeTileUse(cur(s), s.tileIdx, "replant")).toBe(true);
});

// ---------------------------------------------------------------- tile states

Given("the province {string} has a fallow fields tile", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields", "farm");
  cur(s).tiles[s.tileIdx]!.state = "Fallow";
});
When("an army burns that tile", (s) => {
  P.burnTile(cur(s), s.tileIdx);
});
Then("the tile's state is {string}", (s, st: string) => {
  expect(cur(s).tiles[s.tileIdx]!.state).toBe(st);
});
Then("the tile has no other state", (s) => {
  expect(typeof cur(s).tiles[s.tileIdx]!.state).toBe("string");
});
Given("the province {string} has a farm tile with 12,000 farmers", (s, name: string) => {
  const p = prov(s, name);
  s.tileIdx = addTile(p, "Fields", "farm");
  p.people.farmers = 12000;
});
When(
  /^(an army forages beyond the foraging limit|an army loots the province|the country "France" burns its own fields|raiders raid the province|rebels burn the province)$/,
  (s) => {
    s.displaced = P.burnTile(cur(s), s.tileIdx);
  },
);
Then("the tile gives nothing", (s) => {
  expect(P.tileSlots(cur(s).tiles[s.tileIdx]!)).toBeNull();
  expect(P.tileFood(cur(s), s.tileIdx, 12000, ["normal"])).toBe(0);
});
Then("its workers become refugees or die", (s) => {
  expect(s.displaced).toBe(12000);
  expect(cur(s).people.farmers).toBe(0);
});
Given(/^the province "([^"]+)" has (\d+) burned tiles$/, (s, name: string, n: string) => {
  const p = prov(s, name);
  if (s.yearPassed) return expect(P.burnedTiles(p)).toBe(Number(n));
  for (let i = 0; i < Number(n); i++) p.tiles[addTile(p, "Fields", "farm")]!.state = "Burned";
  (s.cond ??= {}).burnedTiles = Number(n);
});
Given("the province {string} has people and is at peace", (s, name: string) => {
  const p = prov(s, name);
  p.people.farmers = 1000;
  p.war = false;
});
Given("the province {string} has war in the province", (s, name: string) => {
  const p = prov(s, name);
  p.people.farmers = Math.max(p.people.farmers, 1000);
  p.war = true;
  (s.cond ??= {}).war = true;
});
When("a year passes", (s) => {
  P.yearEndLand(cur(s));
  s.yearPassed = true;
});
Given("the province {string} has a farm with 12,000 job slots", (s, name: string) => {
  const p = prov(s, name);
  s.tileIdx = addTile(p, "Fields", "farm");
  p.people.farmers = 12000;
});
When("plague leaves the farm with 5,000 farmers", (s) => {
  cur(s).people.farmers = 5000;
  P.updateFallow(cur(s));
});
When("farmers return and the farm has 6,000 farmers", (s) => {
  cur(s).people.farmers = 6000;
  P.updateFallow(cur(s));
});
Then("the farm tile's state is {string}", (s, st: string) => {
  expect(cur(s).tiles[s.tileIdx]!.state).toBe(st);
});
Then("the farm tile is no longer {string}", (s, st: string) => {
  expect(cur(s).tiles[s.tileIdx]!.state).not.toBe(st);
});
Given("the province {string} has 3 burned tiles of 12", (s, name: string) => {
  const p = prov(s, name);
  for (let i = 0; i < 12; i++) addTile(p, "Fields", "farm");
  for (let i = 0; i < 3; i++) p.tiles[i]!.state = "Burned";
});
When("the player looks at the province {string}", (s, name: string) => {
  s.stats = P.provinceStats(prov(s, name));
});
Then("the damage is shown as {int} burned tiles", (s, n: number) => {
  expect(s.stats.burnedTiles).toEqual({ value: n, unit: "tiles" });
});
Then("no devastation meter exists", (s) => {
  expect(Object.keys(s.stats).some((k) => /devastation/i.test(k))).toBe(false);
  expect(Object.keys(cur(s)).some((k) => /devastation/i.test(k))).toBe(false);
});

// ---------------------------------------------------------------- ground and troops

Given("the map gives the province {string} the terrain {string}", (s, name: string, terrain: string) => {
  s.mapTerrain = { name, terrain };
});
When("the province is set up", (s) => {
  prov(s, s.mapTerrain.name, s.mapTerrain.terrain);
  s.setUp = true;
});
Given("the province {string} has the ground {string}", (s, name: string, g: string) => {
  if (s.setUp) return expect(prov(s, name).ground).toBe(g);
  prov(s, name).ground = g as Ground;
});
Then("its starting tile mix and its troop, building and people effects come from {string}", (s, g: string) => {
  const p = cur(s);
  expect(P.groundTroops(p.ground)).toBe(P.groundTroops(g as Ground));
  expect(P.buildCost(p.ground)).toBe(P.buildCost(g as Ground));
  expect(P.peopleOutput(p.ground, "herding")).toBe(P.peopleOutput(g as Ground, "herding"));
});
Given("a battle is fought in a province with the ground {string}", (s, g: string) => {
  s.ground = g;
});
Then(/^foot fight at (.+), horse at (.+), guns at (.+) and the defender at (.+)$/, (s, f: string, h: string, gu: string, d: string) => {
  expect(P.armStrength(s.ground, "foot")).toBeCloseTo(pct(f));
  expect(P.armStrength(s.ground, "horse")).toBeCloseTo(pct(h));
  expect(P.armStrength(s.ground, "guns")).toBeCloseTo(pct(gu));
  expect(P.armStrength(s.ground, "defender")).toBeCloseTo(pct(d));
});
Then(/^the province takes ([\d.]+) days to cross, with (.+) foraging and (.+) sickness$/, (s, days: string, forage: string, sick: string) => {
  const t = P.groundTroops(s.ground);
  expect(t.days_to_cross).toBe(Number(days));
  expect(t.foraging).toBe(forage);
  expect(t.sickness).toBe(sick);
});
Then(/^horse fight at (.+)$/, (s, v: string) => {
  expect(P.armStrength(s.ground, "horse")).toBeCloseTo(pct(v));
});
Then(/^camels fight at (.+)$/, (s, v: string) => {
  expect(P.armStrength(s.ground, "camels")).toBeCloseTo(pct(v));
});
Given(/^the province "([^"]+)" has a river shore tile and (no bridge|a bridge)$/, (s, name: string, bridge: string) => {
  const p = prov(s, name);
  p.tiles[addTile(p, "Shore", bridge === "a bridge" ? "bridge" : null)]!.river = true;
});
When("an army attacks into {string} over the river", (s, name: string) => {
  s.attack = P.riverCrossing(prov(s, name));
});
Then(/^the attacker fights at (.+)$/, (s, v: string) => {
  expect(s.attack).toBeCloseTo(pct(v));
});
Given("a province has {int} woods tiles", (s, n: number) => {
  s.woods = n;
});
When("a battle is fought there", (s) => {
  s.ambush = P.woodsAmbush(s.woods);
});
Then(/^the defender gets (.+) from the woods$/, (s, v: string) => {
  expect(s.ambush).toBeCloseTo(pct(v));
});
When("an army forages in {string}", (s, name: string) => {
  s.forage = P.forageableTiles(prov(s, name));
});
Then("only the {int} unburned tiles count toward what it can take before it starts burning them", (s, n: number) => {
  expect(s.forage).toBe(n);
});
When("an enemy attacks the garrison of {string}", (s, name: string) => {
  s.walls = P.defenderOnWalls(prov(s, name));
});
Then("the defender fights from the walls under the warfare castle rules", (s) => {
  expect(s.walls).toBe(true);
});
Given("a defending army of the province's homeland tongue", (s) => {
  s.homelandArmy = true;
});
Given("the province has the ground {string}", (s, g: string) => {
  s.ground = g;
});
Then(/^the defender gets a further (.+)$/, (s, v: string) => {
  expect(P.localsBonus(s.ground, s.homelandArmy)).toBeCloseTo(pct(v));
  expect(P.localsBonus(s.ground, false)).toBe(0);
});

// ---------------------------------------------------------------- ground and economy

Given("a province with the ground {string}", (s, g: string) => {
  s.ground = g;
});
Then(/^buildings cost (\d+) % of the base cost$/, (s, v: string) => {
  expect(P.buildCost(s.ground)).toBeCloseTo(Number(v) / 100);
});
/** Reads a design cell like "−50 % for farms, +50 % for mines" into expected outputs by building. */
function buildingCell(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  const names: Record<string, string> = { mines: "mine", farms: "farm", lumber: "lumber camp", "irrigation works": "irrigation works" };
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(.+?) until (irrigated|drained)$/))) return { base: factor(m[1]!), [m[2]!]: 1 };
  if ((m = text.match(/^(.+?) except mines and irrigation works$/))) return { base: factor(m[1]!), mine: 1, "irrigation works": 1 };
  if ((m = text.match(/^(.+?) \((\w+) (.+)\)$/))) return { base: factor(m[1]!), [names[m[2]!]!]: factor(m[3]!) };
  if ((m = text.match(/^(.+?) for farms, (.+?) for mines$/))) return { farm: factor(m[1]!), mine: factor(m[2]!) };
  out.base = factor(text);
  return out;
}
Then(/^building output is (.+)$/, (s, text: string) => {
  for (const [k, v] of Object.entries(buildingCell(text))) {
    if (k === "irrigated" || k === "drained") expect(P.buildingOutput(s.ground, "loom house", { [k]: true })).toBeCloseTo(v);
    else expect(P.buildingOutput(s.ground, k === "base" ? "loom house" : k)).toBeCloseTo(v);
  }
});
Then(/^people output without a building is (.+)$/, (s, text: string) => {
  const m = text.match(/^(.+?)(?: for (.+?))?(?: \(.+\))?$/)!;
  const f = factor(m[1]!);
  const acts = m[2] ? m[2].split(" and ").map((a) => (a === "hunting" ? "hunting and gathering" : a)) : ["base"];
  if (m[2] === "hunting and gathering") acts.splice(0, acts.length, "hunting and gathering");
  for (const a of acts) expect(P.peopleOutput(s.ground, a)).toBeCloseTo(f);
});
Then(/^building output there is no longer (.+)$/, (s, penalty: string) => {
  expect(P.buildingOutput(s.ground, "farm", s.groundWork)).not.toBeCloseTo(factor(penalty));
  expect(P.buildingOutput(s.ground, "farm", {})).toBeCloseTo(factor(penalty));
});
Then(/^an? (.+) works at (.+)$/, (s, b: string, v: string) => {
  expect(P.buildingOutput(s.ground, b)).toBeCloseTo(factor(v));
});

// ---------------------------------------------------------------- buildings in the province

Then("the castle stands on the castle tile of {string}", (s, name: string) => {
  const t = prov(s, name).tiles.find((x) => x.building === "castle");
  expect(t?.use).toBe("Castle");
});
Then("it is counted among the province's buildings", (s) => {
  expect(P.provinceStats(cur(s)).buildings?.value ?? 0).toBeGreaterThanOrEqual(1);
});
Given("the province {string} has a farm with 12,000 job slots for farmers", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields", "farm");
});
When(/^the farm has ([\d,]+) farmers$/, (s, n: string) => {
  cur(s).people.farmers = num(n);
  const w = P.workplaces(cur(s))[0]!;
  s.working = P.workingShare(w.workers, w.slots);
});
Then(/^the farm works at (.+)$/, (s, share: string) => {
  const m = share.match(/^(\d+)\/(\d+)$/);
  expect(s.working.share).toBeCloseTo(m ? Number(m[1]) / Number(m[2]) : pct(share));
});
Then(/^the farm is (fallow|not fallow)$/, (s, f: string) => {
  expect(s.working.fallow).toBe(f === "fallow");
});
Given("the province {string} has no loom house", (s, name: string) => {
  const p = prov(s, name);
  p.townSize = "town";
  addTile(p, "Town");
  expect(p.town).not.toContain("loom house");
});
When("the country {string} builds one, paying the cost times the ground's build cost", (s) => {
  s.cost = P.buildCost(cur(s).ground);
  expect(P.canBuildTown(cur(s), "loom house")).toBe(true);
  cur(s).town.push("loom house");
});
When("an event founds one", (s) => {
  expect(P.foundCraftBuilding(cur(s), "loom house")).toBe(true);
});
When("one appears by itself in a town with a market, homeless and wool nearby", (s) => {
  const p = cur(s);
  p.town.push("market");
  p.people.homeless = 500;
  expect(P.craftBuildingMayAppear(p, true)).toBe(true);
  expect(P.foundCraftBuilding(p, "loom house")).toBe(true);
});
Then("the province {string} has a loom house", (s, name: string) => {
  expect(prov(s, name).town).toContain("loom house");
});

const TILE_KINDS: Record<string, { use: Use; ground?: Ground; ctx?: P.PlaceContext; extra?: (p: Province) => void; river?: boolean }> = {
  "fields by a shore": { use: "Fields", extra: (p) => void addTile(p, "Shore") },
  "fields on hills": { use: "Fields", ground: "hills" },
  "fields on tropical ground": { use: "Fields", ctx: { tropical: true } },
  "mountains with a seam": { use: "Waste", ground: "mountains", ctx: { seam: true } },
  "shore on a warm coast": { use: "Shore", ctx: { dryOrWarmCoast: true } },
  "shore with a harbour": { use: "Shore", extra: (p) => void addTile(p, "Shore", "harbour") },
  "shore on a river": { use: "Shore", river: true },
};
Given(new RegExp(`^the province "([^"]+)" has an? (${Object.keys(TILE_KINDS).join("|")}) tile$`), (s, name: string, kind: string) => {
  const k = TILE_KINDS[kind]!;
  const p = prov(s, name, k.ground);
  if (k.ground) p.ground = k.ground;
  k.extra?.(p);
  s.tileIdx = addTile(p, k.use);
  p.tiles[s.tileIdx]!.river = k.river ?? false;
  s.ctx = k.ctx ?? {};
});
Given("the country knows {string}", (s, inv: string) => {
  if (inv !== "known at start") known(s).push(inv);
});
When(/^an? (.+) is built there$/, (s, b: string) => {
  s.built = b;
  if (s.townSlotFree) return void cur(s).town.push(b);
  expect(P.placeBuilding(cur(s), s.tileIdx, b, s.ctx ?? {})).toBe(true);
});
Then(/^it has ([\d,]+) job slots for (.+)$/, (s, slots: string, cls: string) => {
  const b = P.landBuilding(s.built) ?? P.townBuilding(s.built);
  expect(b?.slots).toBe(num(slots));
  expect(b?.class ?? "nobody").toBe(cls === "nobody" ? "nobody" : cls);
});
Given("the province {string} has no shore tile and no irrigation", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields");
  known(s).push("F2 Wet-rice terracing");
});
When("a rice paddy is planned there", (s) => {
  s.placed = P.canPlace(cur(s), s.tileIdx, "rice paddy");
});
Then("the rice paddy is refused", (s) => {
  expect(s.placed).toBe(false);
});
When("a mill is added to a farm in the province {string}", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields", "farm");
  expect(P.addMill(cur(s), s.tileIdx)).toBe(true);
});
Then("the farm earns +25 % gold from its grain", (s) => {
  expect(P.grainGoldBonus(cur(s).tiles[s.tileIdx]!)).toBeCloseTo(0.25);
});
Given("the country {string} knows the inventions {string} and {string}", (s, _c: string, a: string, b: string) => {
  known(s).push(a, b);
});
Then("the country {string} may build an earthwork ring fort or a stone castle", (s) => {
  const allowed = P.castleStepsAllowed(prov(s, "Troyes"));
  expect(allowed).toEqual(["earthwork ring fort", "stone castle"]);
});
Then("it may build a bastion fort only with {string} and a star fort only with {string}", (s, b5: string, b6: string) => {
  known(s).push(b5);
  expect(P.castleStepsAllowed(cur(s))).toContain("bastion fort");
  expect(P.castleStepsAllowed(cur(s))).not.toContain("star fort");
  known(s).push(b6);
  expect(P.castleStepsAllowed(cur(s))).toContain("star fort");
});
Given(/^the province "([^"]+)" has a silver mine with (\d+) years? of seams left(?: and ([\d,]+) miners)?$/, (s, name: string, years: string, miners?: string) => {
  const p = prov(s, name, "mountains");
  s.tileIdx = addTile(p, "Waste", "mine");
  p.tiles[s.tileIdx]!.seams = Number(years);
  if (miners) p.people.miners = num(miners);
});
Given("every other slot in {string} is full", (s, name: string) => {
  fullFarms(prov(s, name), 1);
  s.atWork = P.peopleAtWork(cur(s));
});
When("the year of digging ends", (s) => {
  P.digYear(cur(s));
  P.balanceClasses(cur(s));
});
Then("the mine has 0 seams left and closes", (s) => {
  const t = cur(s).tiles[s.tileIdx]!;
  expect(t.seams).toBe(0);
  expect(t.building).toBeNull();
});
Then("its miners become homeless", (s) => {
  expect(cur(s).people.miners).toBe(0);
  expect(cur(s).people.homeless).toBe(6000);
});
Then("the town shrinks", (s) => {
  expect(P.peopleAtWork(cur(s))).toBe(s.atWork - 6000);
});
When("a prospecting event adds {int} years of seams", (s, n: number) => {
  P.addSeams(cur(s), s.tileIdx, n);
});
Then("the mine has {int} years of seams left", (s, n: number) => {
  expect(cur(s).tiles[s.tileIdx]!.seams).toBe(n);
});
Given("the province {string} has a shipyard", (s, name: string) => {
  const p = prov(s, name);
  addTile(p, "Shore", "harbour");
  addTile(p, "Shore", "shipyard");
});
Given("the province {string} has a lumber camp", (s) => {
  s.rings = 0;
});
Given("a neighbouring province has a lumber camp", (s) => {
  s.rings = 1;
});
Given("the nearest lumber camp is two rings away and there is no road", (s) => {
  s.rings = 2;
});
Then(/^ships (can|cannot) be built in "([^"]+)"$/, (s, r: string) => {
  expect(P.timberInReach(s.rings)).toBe(r === "can");
});
Given("the province {string} has a woods tile with no building", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Woods");
});
Then("up to 3,000 woodsmen can work it at the ground's people output rate", (s) => {
  const t = cur(s).tiles[s.tileIdx]!;
  expect(P.tileSlots(t)).toEqual({ class: "woodsmen", slots: 3000 });
  expect(P.bareActivity(t.use)).toBe("hunting and gathering");
});
Given(/^the town of "([^"]+)" is an? (hamlet|village|market town|town|city|great city)$/, (s, name: string, size: string) => {
  const p = prov(s, name);
  p.townSize = size as Province["townSize"];
  s.townSize = size;
});
Then("it has {int} building slots", (s, n: number) => {
  expect(P.townBuildingSlots(s.townSize)).toBe(n);
});
Given("the town of {string} has a free building slot", (s, name: string) => {
  const p = prov(s, name);
  p.townSize = "town";
  s.townSlotFree = true;
});
const NEEDS: Record<string, string[]> = {
  "a raw ware such as wool": ["raw ware"],
  iron: ["iron"],
  clay: ["clay"],
  hides: ["hides"],
  "paper and printing": ["paper", "printing"],
  "grain or grapes": ["grain or grapes"],
  "a market charter for the fair": ["market charter for the fair"],
  "a road": ["road"],
  nothing: [],
  "a town or bigger, and its own official": ["own official"],
  "gold upkeep": ["gold upkeep"],
  saltpetre: ["saltpetre"],
  "later inventions": ["later inventions"],
  "era V inventions and coal or water power": ["era V inventions", "coal or water power"],
  "the railway invention and a road": ["railway invention", "road"],
};
Then(/^it needs (?!an official$)(.+)$/, (s, needs: string) => {
  const b = P.townBuilding(s.built)!;
  expect(b.needs).toEqual(NEEDS[needs]);
  if (needs.startsWith("a town or bigger")) expect(b.min_town_size).toBe("town");
});
When("a school is planned there", (s) => {
  s.placed = P.canBuildTown(cur(s), "school");
});
Then("the school is refused", (s) => {
  expect(s.placed).toBe(false);
});
Given(/^the province "([^"]+)" has ([\d,]+) homeless$/, (s, name: string, n: string) => {
  const p = prov(s, name);
  if (p.tiles.length === 0) {
    fullFarms(p);
    p.tiles[addTile(p, "Fields", "farm")]!.state = "Burned";
  }
  p.people.homeless = num(n);
  p.townSize ??= "town";
});
When("an almshouse is built in {string}", (s, name: string) => {
  prov(s, name).town.push("almshouse");
});
Then("3,000 homeless are sheltered", (s) => {
  expect(P.shelteredHomeless(cur(s))).toBe(3000);
});
Then("only 1,000 homeless count toward theft, the {string} grievance and shanty camps", (s) => {
  expect(P.troublesomeHomeless(cur(s))).toBe(1000);
});
Given("the town of {string} has a market, homeless people and wool nearby", (s, name: string) => {
  const p = prov(s, name);
  p.town.push("market");
  p.people.homeless = 1000;
  s.wool = true;
});
Given("a free building slot", (s) => {
  cur(s).townSize = "town";
});
When("the year passes", (s) => {
  s.mayAppear = P.craftBuildingMayAppear(cur(s), s.wool);
});
Then("a craft building may appear in {string} by itself", (s) => {
  expect(s.mayAppear).toBe(true);
});
Given("craftsmen flee persecution in the country {string}", (s) => {
  s.fleeing = "loom house";
});
When("they arrive in the province {string}", (s, name: string) => {
  const p = prov(s, name);
  p.townSize = "city";
  s.mayFound = P.canBuildTown(p, s.fleeing);
});
Then("they may found a craft building in {string}", (s, name: string) => {
  expect(s.mayFound).toBe(true);
  expect(P.foundCraftBuilding(prov(s, name), s.fleeing)).toBe(true);
});

// ---------------------------------------------------------------- food

const FOOD_TILES: Record<string, () => P.Tile> = {
  farm: () => P.tile("Fields", "farm"),
  terrace: () => P.tile("Fields", "terrace"),
  "raised fields": () => P.tile("Marsh", "raised fields"),
  "rice paddy": () => P.tile("Fields", "rice paddy"),
  ranch: () => P.tile("Pasture", "ranch"),
  fishery: () => P.tile("Shore", "fishery"),
  "fields with no building": () => P.tile("Fields"),
};
Given(/^a (.+) with 1,000 workers on "([^"]+)" with a normal harvest$/, (s, kind: string, g: string) => {
  s.food = P.foodKind(FOOD_TILES[kind]!());
  s.ground = g;
});
Then(/^it feeds (.+) people a year before the ground's multiplier$/, (s, fed: string) => {
  const k = s.food as P.FoodTileKind;
  const m = fed.match(/^([\d,]+)( per harvest, two harvests| × people output)?$/)!;
  expect(1000 * k.perWorker).toBeCloseTo(num(m[1]!));
  expect(k.harvests).toBe(m[2]?.includes("two") ? 2 : 1);
  expect(k.bare).toBe(m[2]?.includes("people output") ?? false);
});
Given("a farm in the province {string} that feeds 18,000 in a normal year", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields", "farm");
  s.workers = 18000 / (1.5 * P.buildingOutput("farmland", "farm"));
});
When("the harvest is {string}", (s, roll: string) => {
  s.roll = roll;
});
Then(/^the farm feeds ([\d,]+)$/, (s, fed: string) => {
  expect(P.tileFood(cur(s), s.tileIdx, s.workers, [s.roll])).toBeCloseTo(num(fed));
});
Given("the province {string} has a rice paddy", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name), "Fields", "rice paddy");
});
When("the year's harvests are rolled", (s) => {
  const rng = new Rng(1);
  const rolls = cfg.food.harvest_order as P.HarvestRoll[];
  s.rolls = P.harvestRolls(cur(s).tiles[s.tileIdx]!, () => rolls[rng.int(rolls.length)]!);
});
Then("the rice paddy's harvest is rolled twice", (s) => {
  expect(s.rolls).toHaveLength(2);
});
const BARE: Record<string, () => P.Tile> = { ranch: () => P.tile("Pasture", "ranch"), fishery: () => P.tile("Shore", "fishery"), "bare woods tile": () => P.tile("Woods"), "bare pasture": () => P.tile("Pasture") };
Given(/^the province "([^"]+)" has a (ranch|fishery|bare woods tile|bare pasture)$/, (s, name: string, kind: string) => {
  const p = prov(s, name);
  p.tiles.push(BARE[kind]!());
  s.tileIdx = p.tiles.length - 1;
});
Then(/^the (ranch|fishery|bare woods tile|bare pasture) feeds as in a normal year$/, (s) => {
  expect(P.tileFood(cur(s), s.tileIdx, 1000, [s.roll])).toBeCloseTo(P.tileFood(cur(s), s.tileIdx, 1000, ["normal"]));
});
Then(/^(drought and hard winter events|storms and blockades|nothing named in the design) can still cut it$/, (s, hazard: string) => {
  const want = hazard === "drought and hard winter events" ? ["drought", "hard winter"] : hazard === "storms and blockades" ? ["storms", "blockades"] : [];
  expect(P.foodKind(cur(s).tiles[s.tileIdx]!)!.hazards).toEqual(want);
});
When(/^the province "([^"]+)" rolls a "failed" harvest$/, (s, name: string) => {
  s.counts = P.harvestWithSteps(P.effectiveRoll(prov(s, name), "failed"), s.harvestSteps ?? 0);
});
Then("the harvest counts as {string}", (s, roll: string) => {
  expect(s.counts).toBe(roll);
});

// ---------------------------------------------------------------- wares

Given("the province {string} has a full silver mine with 6,000 miners", (s, name: string) => {
  const p = prov(s, name);
  s.tileIdx = addTile(p, "Waste", "mine");
  p.people.miners = 6000;
});
When("the year's wares are worked out", (s) => {
  const w = P.workplaces(cur(s)).find((x) => x.building === "mine")!;
  s.wares = (inventions: number) => P.wareOutput(cur(s).ground, "mine", w.workers, { inventions });
});
Then("the mine makes silver for 6,000 miners at +50 % building output and the country's mining inventions", (s) => {
  expect(s.wares(1)).toBeCloseTo(6000 * 1.5);
  expect(s.wares(1.2)).toBeCloseTo(6000 * 1.5 * 1.2);
});
Given("the province {string} turns wool into cloth in a loom house", (s, name: string) => {
  prov(s, name).town.push("loom house");
});
Then("the cloth is worth three times the wool", () => {
  expect(P.craftValue("cloth")).toBe(3);
  expect(P.craftValue("wool")).toBe(1);
});
Given("the province {string} makes tools in a forge", (s, name: string) => {
  const p = prov(s, name);
  p.town.push("forge");
  p.people.craftsmen = 1500;
  s.ware = { workers: 1500, inputs: true, standing: true };
  s.baseline = P.wareOutput(p.ground, "forge", 1500);
});
When("no iron arrives", (s) => {
  s.ware.inputs = false;
});
When("plague kills half the craftsmen", (s) => {
  P.plagueKill(cur(s), 750);
  s.ware.workers = P.workplaces(cur(s)).find((w) => w.building === "forge")!.workers;
});
When("the forge's town is sacked", (s) => {
  cur(s).town = cur(s).town.filter((b) => b !== "forge");
  s.ware.standing = false;
});
Then(/^the province "([^"]+)" makes (no tools|fewer tools)$/, (s, _n: string, r: string) => {
  const made = P.wareOutput(cur(s).ground, "forge", s.ware.workers, { inputs: s.ware.inputs, standing: s.ware.standing });
  if (r === "no tools") expect(made).toBe(0);
  else {
    expect(made).toBeGreaterThan(0);
    expect(made).toBeLessThan(s.baseline);
  }
});
Given("the ware list in the province config", (s) => {
  s.wareList = P.wareList();
});
Then("it includes grain, cloth, iron, silver, spices, saltpetre and powder", (s) => {
  for (const w of ["grain", "cloth", "iron", "silver", "spices", "saltpetre", "powder"]) expect(s.wareList.now).toContain(w);
});
Then("later eras add coal, rubber and oil", (s) => {
  expect(s.wareList.later).toEqual(["coal", "rubber", "oil"]);
});
Then("no ware stands for enslaved people", (s) => {
  for (const w of [...s.wareList.now, ...s.wareList.later]) expect(w).not.toMatch(/slave|people|captive/i);
});

// ---------------------------------------------------------------- births, deaths, famine

Given("a class {string} with no modifiers", (s, c: string) => {
  s.cls = c;
});
Then(/^its yearly birth rate is ([\d.]+ %) and its death rate is ([\d.]+ %)$/, (s, b: string, d: string) => {
  expect(P.birthRate(s.cls)).toBeCloseTo(pct(b));
  expect(P.deathRate(s.cls)).toBeCloseTo(pct(d));
});
Given("the province {string} has a plague rumour", (s, name: string) => {
  prov(s, name).plague = "rumour";
  (s.cond ??= {}).plague = "rumour";
});
Given("the province {string} has a plague outbreak", (s, name: string) => {
  prov(s, name).plague = "outbreak";
  (s.cond ??= {}).plague = "outbreak";
});
Given("the province {string} has plague at its worst", (s, name: string) => {
  prov(s, name).plague = "outbreak";
  (s.cond ??= {}).plague = "worst";
});
Given("the province {string} has smoke", (s, name: string) => {
  if (s.smokeChecked) return expect(prov(s, name).smoke).toBe(true);
  prov(s, name).smoke = true;
  (s.cond ??= {}).smoke = true;
});
Given("the province {string} has hospitals, wells and drains", (s, name: string) => {
  prov(s, name).town.push("hospital, wells and drains");
  (s.cond ??= {}).hospitals = true;
});
Given(/^the province "([^"]+)" is in a country that knows (sanitation|vaccination)$/, (s, name: string, inv: string) => {
  prov(s, name);
  known(s).push(inv);
  (s.cond ??= {}).known = known(s);
});
Then(/^the death rate of (everyone|town classes) changes by (.+)$/, (s, who: string, v: string) => {
  const m = P.deathModifiers(s.cond ?? {});
  expect(who === "everyone" ? m.everyone : m.town).toBeCloseTo(pct(v));
  expect(who === "everyone" ? m.town : m.everyone).toBeCloseTo(0);
});
Given(/^the clergy of the province follow a faith whose clergy (do not marry|marry)$/, (s, m: string) => {
  s.celibate = m === "do not marry";
});
Then(/^the clergy birth rate is (.+)$/, (s, v: string) => {
  const r = P.birthRate("clergy", { celibateClergy: s.celibate });
  expect(r).toBeCloseTo(v === "the townsfolk rate" ? P.birthRate("craftsmen") : pct(v));
});
Given(/^the province "([^"]+)" has ([\d,]+) people$/, (s, name: string, n: string) => {
  prov(s, name).people.farmers = num(n);
});
Given("its food this season covers 80,000 people", (s) => {
  s.foodNow = 80000;
});
Given(/^the province "([^"]+)" has ([\d,]+) people and food for ([\d,]+) this season$/, (s, name: string, n: string, f: string) => {
  const p = prov(s, name);
  p.people.farmers = num(n) * 0.75;
  p.people.craftsmen = num(n) * 0.25;
  s.foodNow = num(f);
  s.before = { ...p.people };
});
Given("the neighbouring province {string} has food to spare", (s, name: string) => {
  s.neighbour = name;
});
Given("no neighbouring province has food", (s) => {
  s.neighbour = null;
});
When("the season's food is compared with the eaters", (s) => {
  const p = cur(s);
  s.famine = P.seasonFood(p, s.foodNow, Boolean(s.neighbour));
  if (s.neighbour && s.famine.fled > 0) P.addRefugees(prov(s, s.neighbour), p.id, s.famine.fled);
  s.cur = p;
});
Then("everyone eats", (s) => {
  expect(s.famine.unfed).toBe(0);
  expect(s.famine.died).toBe(0);
});
Then("the rest goes to the local store", (s) => {
  expect(s.famine.toStore).toBe(8000);
});
Then(/^([\d,]+) people cannot be fed$/, (s, n: string) => {
  expect(s.famine.unfed).toBe(num(n));
});
Then(/^([\d,]+) of them flee to "([^"]+)" as refugees$/, (s, n: string, to: string) => {
  expect(s.famine.fled).toBe(num(n));
  expect(prov(s, to).refugees.reduce((a: number, r: P.Refugees) => a + r.count, 0)).toBe(num(n));
});
Then(/^([\d,]+) die, spread over the classes by their size$/, (s, n: string) => {
  expect(s.famine.died).toBe(num(n));
  expect(s.famine.deadByClass.farmers).toBe(num(n) * 0.75);
  expect(s.famine.deadByClass.craftsmen).toBe(num(n) * 0.25);
});
Then(/^([\d,]+) people die$/, (s, n: string) => {
  expect(s.famine.died).toBe(num(n));
  expect(s.famine.fled).toBe(0);
});

// ---------------------------------------------------------------- classes and overflow

const PLURAL: Record<string, string> = {
  farms: "farm",
  "rice paddies": "rice paddy",
  terraces: "terrace",
  "raised fields": "raised fields",
  plantations: "plantation",
  "irrigation works": "irrigation works",
  ranches: "ranch",
  "horse studs": "horse stud",
  "lumber camps": "lumber camp",
  mines: "mine",
  saltworks: "saltworks",
  fisheries: "fishery",
  harbours: "harbour",
  shipyards: "shipyard",
  "loom houses": "loom house",
  forges: "forge",
  kilns: "kiln",
  tanneries: "tannery",
  presses: "press",
  breweries: "brewery or winery",
  factories: "factory",
  "rail stations": "rail station",
  markets: "market",
  "caravanserais and warehouses": "caravanserai or warehouse",
  "houses of worship": "house of worship",
  almshouses: "almshouse",
  hospitals: "hospital, wells and drains",
  seats: "seat",
  schools: "school",
};
Given("a person of the class {string}", (s, c: string) => {
  s.cls = c;
});
Then(/^their slots are in (.+)$/, (s, list: string) => {
  if (list === "no slots") {
    expect(Object.values(cfg.buildings.land).some((b) => b.class === s.cls)).toBe(false);
    expect(Object.values(cfg.buildings.town).some((b) => b.class === s.cls)).toBe(false);
    return;
  }
  for (const item of list.split(", ")) {
    const empty = item.match(/^empty (\w+)$/);
    if (empty) {
      expect(P.tileSlots(P.tile(cap(empty[1]!)))?.class).toBe(s.cls);
      continue;
    }
    const b = PLURAL[item];
    expect(b, item).toBeDefined();
    expect((P.landBuilding(b!) ?? P.townBuilding(b!))?.class).toBe(s.cls);
  }
});
Given(/^the province "([^"]+)" has ([\d,]+) (farmers|seafolk)$/, (s, name: string, n: string, c: ClassName) => {
  prov(s, name).people[c] = num(n);
});
When("160 farmers are born this month", (s) => {
  P.addBirths(cur(s), "farmers", 160);
});
Then("the province {string} has 48,160 farmers before deaths and overflow", (s, name: string) => {
  expect(prov(s, name).people.farmers).toBe(48160);
});
Given("the province {string} has full farms and 3,600 homeless", (s, name: string) => {
  const p = prov(s, name);
  fullFarms(p);
  p.people.homeless = 3600;
});
When("a new loom house with 1,500 craftsman slots is built", (s) => {
  cur(s).town.push("loom house");
  P.balanceClasses(cur(s));
});
Then("1,500 homeless become craftsmen", (s) => {
  expect(cur(s).people.craftsmen).toBe(1500);
});
Then("2,100 stay homeless", (s) => {
  expect(cur(s).people.homeless).toBe(2100);
});
Given("the province {string} has more farmers than farm slots", (s, name: string) => {
  const p = prov(s, name);
  fullFarms(p);
  p.people.farmers += 500;
});
Given("its craftsman slots are 60 % filled and its herder slots are 90 % filled", (s) => {
  const p = cur(s);
  p.town.push("loom house", "loom house", "loom house");
  p.people.craftsmen = 2700;
  addTile(p, "Pasture", "ranch");
  addTile(p, "Pasture", "ranch");
  p.people.herders = 5400;
});
Given("no one is homeless", (s) => {
  cur(s).people.homeless = 0;
});
When("the month's overflow is worked out", (s) => {
  s.before = { ...cur(s).people };
  P.balanceClasses(cur(s));
});
Then("the extra farmers become craftsmen", (s) => {
  const p = cur(s);
  expect(p.people.farmers).toBe(48000);
  expect(p.people.craftsmen).toBe(3200);
  expect(p.people.herders).toBe(5400);
});
Given("the province {string} has more craftsmen than craftsman slots", (s, name: string) => {
  const p = prov(s, name);
  addTile(p, "Town");
  p.town.push("loom house");
  p.people.craftsmen = 2000;
});
Given("its farmer slots and its market folk slots are both 70 % filled and least filled", (s) => {
  const p = cur(s);
  addTile(p, "Fields", "farm");
  p.people.farmers = 8400;
  p.town.push("market");
  p.people["market folk"] = 1050;
});
Then("the extra craftsmen become farmers", (s) => {
  expect(cur(s).people.farmers).toBe(8900);
  expect(cur(s).people["market folk"]).toBe(1050);
  expect(cur(s).people.craftsmen).toBe(1500);
});
Given("its school has empty scholar slots", (s) => {
  cur(s).town.push("school");
  cur(s).schoolSeats = 50;
});
Then("no farmer becomes a scholar", (s) => {
  expect(cur(s).people.scholars).toBe(0);
});
Then("no farmer becomes a soldier", (s) => {
  expect(cur(s).recruits).toBe(0);
  expect(P.totalPeople(cur(s))).toBe(Object.values(s.before as Record<string, number>).reduce((a, b) => a + b, 0));
  expect(cur(s).people.homeless).toBe(500);
});
Given("every slot in the province {string} is full", (s, name: string) => {
  fullFarms(prov(s, name));
});
Given("the farmers have 500 more born than died this year", (s) => {
  cur(s).people.farmers += 500;
});
When("the overflow is worked out", (s) => {
  P.balanceClasses(cur(s));
});
Then("the province {string} has 500 more homeless", (s, name: string) => {
  expect(prov(s, name).people.homeless).toBe(500);
});
When("a levy takes 800 farmers from the farms", (s) => {
  cur(s).recruits = 800;
  P.raiseLevy(cur(s), 800, "farmers");
});
Then("800 homeless take the empty farm slots", (s) => {
  expect(cur(s).people.homeless).toBe(200);
  expect(cur(s).people.farmers).toBe(48000);
});
Given("the French province {string} and the Burgundian province {string} border {string}", (s, a: string, b: string) => {
  s.neighbours = [
    { id: a, owner: "France", fill: 0 },
    { id: b, owner: "Burgundy", fill: 0 },
  ];
});
Given("{string} has emptier slots than {string}", (s, emptier: string, fuller: string) => {
  for (const n of s.neighbours) n.fill = n.id === emptier ? 0.5 : n.id === fuller ? 0.9 : n.fill;
});
When("the month ends", (s) => {
  const p = cur(s);
  if (s.neighbours) s.driftTo = P.homelessDriftTarget(p.owner, s.neighbours);
  P.balanceClasses(p);
  P.updateFallow(p);
});
Then("a share of the homeless of {string} move to {string}", (s, _f: string, to: string) => {
  expect(s.driftTo).toBe(to);
});
Given("the province {string} has a new forge with 1,500 craftsman slots", (s, name: string) => {
  const p = prov(s, name);
  addTile(p, "Town");
  p.town.push("forge");
});
Given("no class has extra people and no one is homeless", (s) => {
  const p = cur(s);
  addTile(p, "Fields", "farm");
  p.people.farmers = 12000;
  p.people.homeless = 0;
});
Then("the forge's slots stay empty until overflow arrives", (s) => {
  expect(P.workplaces(cur(s)).find((w) => w.building === "forge")!.workers).toBe(0);
});
Then("the forge is fallow", (s) => {
  const w = P.workplaces(cur(s)).find((x) => x.building === "forge")!;
  expect(P.workingShare(w.workers, w.slots).fallow).toBe(true);
});
When("the country {string} crews a fleet in {string}", (s, _c: string, name: string) => {
  s.crewed = P.crewFleet(prov(s, name), 500);
});
Then("the crews are taken from the seafolk of {string}", (s, name: string) => {
  expect(s.crewed).toBe(500);
  expect(prov(s, name).people.seafolk).toBe(2500);
});

// ---------------------------------------------------------------- homeless

Then("they eat from the local store", (s) => {
  const p = cur(s);
  const fed = P.seasonFood(structuredClone(p), P.totalPeople(p) - p.people.homeless, false);
  expect(fed.unfed).toBe(p.people.homeless);
});
Then("they make nothing and pay no tax", (s) => {
  expect(P.workplaces(cur(s)).some((w) => w.class === "homeless")).toBe(false);
  expect(P.peopleAtWork(cur(s))).toBe(P.totalPeople(cur(s)) - cur(s).people.homeless);
});
Then("their death rate is 5 % a year", () => {
  expect(P.deathRate("homeless")).toBeCloseTo(0.05);
});
Given(/^the province "([^"]+)" has (\d+) % homeless$/, (s, name: string, share: string) => {
  const p = prov(s, name);
  p.people.homeless = Number(share) * 100;
  p.people.farmers = (100 - Number(share)) * 100;
});
Then("the {string} grievance counts as {int}", (s, g: string, w: number) => {
  expect(P.evaluateGrievances(cur(s))[g] ?? 0).toBe(w);
});
Then(/^shanty camps are (absent|present)$/, (s, st: string) => {
  expect(P.shantyCamps(P.troubleShare(cur(s)))).toBe(st === "present");
});
Given("the province {string} has shanty camps", (s, name: string) => {
  const p = prov(s, name);
  p.people.homeless = 2500;
  p.people.farmers = 7500;
  expect(P.shantyCamps(P.troubleShare(p))).toBe(true);
  s.shanty = P.shantyEffects();
});
Then("plague starts here first and spreads twice as fast", (s) => {
  expect(s.shanty.plagueStartsHereFirst).toBe(true);
  expect(s.shanty.plagueSpread).toBe(2);
});
Then("town classes die 1 % faster", (s) => {
  expect(P.deathModifiers({ shanty: true }).town).toBeCloseTo(0.01);
});
Then("each year a town building may burn", (s) => {
  expect(s.shanty.townBuildingMayBurnYearly).toBe(true);
});
Given("the province {string} has no free slot", (s, name: string) => {
  const p = prov(s, name);
  fullFarms(p);
  const i = addTile(p, "Waste", "mine");
  p.tiles[i]!.seams = 1;
  p.people.miners = 6000;
});
const remember = (s: Scenario) => (s.homelessBefore = cur(s).people.homeless);
When("births overflow from a full class", (s) => {
  remember(s);
  cur(s).people.farmers += 500;
  P.balanceClasses(cur(s));
});
When("the mine runs out and closes", (s) => {
  remember(s);
  P.digYear(cur(s));
  P.balanceClasses(cur(s));
});
When("soldiers come home", (s) => {
  remember(s);
  P.soldiersReturn(cur(s), 1000);
});
When("refugees settle after 2 years", (s) => {
  remember(s);
  P.addRefugees(cur(s), "Sens", 1000);
  P.ageRefugees(cur(s), 24);
});
Then("the province {string} has more homeless", (s, name: string) => {
  expect(prov(s, name).people.homeless).toBeGreaterThan(s.homelessBefore);
});
const rememberTrouble = (s: Scenario) => (s.troubleBefore = P.troublesomeHomeless(cur(s)));
When("a new building opens slots", (s) => {
  rememberTrouble(s);
  cur(s).town.push("loom house");
  P.balanceClasses(cur(s));
});
When("a burned tile is rebuilt", (s) => {
  rememberTrouble(s);
  P.yearEndLand(cur(s));
  P.balanceClasses(cur(s));
});
When("an almshouse is built", (s) => {
  rememberTrouble(s);
  cur(s).town.push("almshouse");
});
When("a levy is raised", (s) => {
  rememberTrouble(s);
  cur(s).recruits = 1000;
  P.raiseLevy(cur(s), 1000, "farmers");
});
When("the country sends 2,000 of them as settlers to a colony", (s) => {
  rememberTrouble(s);
  P.sendSettlers(cur(s), prov(s, "Madeira"), 2000);
  s.cur = s.provinces.Troyes;
});
When("they drift to a neighbouring province", (s) => {
  rememberTrouble(s);
  const p = cur(s);
  P.driftHomeless(p, prov(s, "Sens"), 1000);
  s.cur = p;
});
Then("the province {string} has fewer homeless counting toward trouble", (s, name: string) => {
  expect(P.troublesomeHomeless(prov(s, name))).toBeLessThan(s.troubleBefore);
});

// ---------------------------------------------------------------- other people stats

Given("the province {string} shelters 2,000 refugees from {string}", (s, name: string, from: string) => {
  const p = prov(s, name);
  addTile(p, "Fields", "farm");
  p.people.farmers = 11000;
  P.addRefugees(p, from, 2000);
});
Given("{string} stays unsafe", () => {});
When("2 years pass", (s) => {
  P.ageRefugees(cur(s), 24);
});
Then("the refugees join the classes of {string} by overflow", (s, name: string) => {
  const p = prov(s, name);
  expect(p.refugees).toHaveLength(0);
  expect(p.people.farmers).toBe(12000);
});
Then("any who find no slot become homeless", (s) => {
  expect(cur(s).people.homeless).toBe(1000);
});
When("{string} becomes safe", (s, from: string) => {
  s.wentHome = { from, n: P.refugeesGoHome(cur(s), from) };
});
Then("the refugees go home to {string}", (s, to: string) => {
  expect(s.wentHome).toEqual({ from: to, n: 2000 });
  expect(cur(s).refugees).toHaveLength(0);
});
Given("scholars flee war into the province {string}", (s, name: string) => {
  prov(s, name);
  s.fleeingScholars = 3;
});
Given("{string} has a free scholar slot in its school", (s, name: string) => {
  const p = prov(s, name);
  p.town.push("school");
  p.schoolSeats = 1;
  work(s, () => P.addRefugees(p, "Milan", s.fleeingScholars, "scholars"));
});
Then("the scholars who fill it stay scholars", (s) => {
  expect(cur(s).people.scholars).toBe(1);
  expect(cur(s).refugees[0]?.count).toBe(2);
});
Given(/^the country "([^"]+)" has the province "([^"]+)" with ([\d,]+) people, (\d+) % Catholic$/, (s, _c: string, name: string, n: string, share: string) => {
  (s.faithRows ??= []).push({ people: num(n), mix: { Catholic: Number(share) / 100 } });
  prov(s, name);
});
Given(/^the province "([^"]+)" with ([\d,]+) people, (\d+) % Catholic$/, (s, name: string, n: string, share: string) => {
  (s.faithRows ??= []).push({ people: num(n), mix: { Catholic: Number(share) / 100, Protestant: 1 - Number(share) / 100 } });
  prov(s, name);
});
Given("the country {string} is Catholic", (s) => {
  s.rulerFaith = "Catholic";
});
Then(/^the country's Faith is (\d+) %$/, (s, v: string) => {
  expect(P.weightedShare(s.faithRows, s.rulerFaith)).toBeCloseTo(Number(v) / 100);
});
Given("the province {string} has tongues French 94 % and Flemish 6 %", (s, name: string) => {
  const p = prov(s, name);
  p.tongue = P.topThree({ French: 0.94, Flemish: 0.06 });
  p.faith = P.topThree({ Catholic: 0.9, Cathar: 0.04, Jewish: 0.03, Muslim: 0.02, Hussite: 0.01 });
});
Then("the province stores at most three tongues and three faiths", (s) => {
  expect(Object.keys(cur(s).tongue).length).toBeLessThanOrEqual(3);
  expect(Object.keys(cur(s).faith)).toEqual(["Catholic", "Cathar", "Jewish"]);
});
Given("the province {string} persecutes a minority faith", (s, name: string) => {
  const p = prov(s, name);
  p.faith = { Catholic: 0.8, Jewish: 0.2 };
  p.people.farmers = 8000;
  p.people.craftsmen = 2000;
});
When("people of that faith flee", (s) => {
  s.persecuted = P.persecute(cur(s), "Jewish");
});
Then("the faith mix of {string} loses their share", (s, name: string) => {
  expect(prov(s, name).faith).toEqual({ Catholic: 1 });
});
Then("their crafts leave with them", (s) => {
  expect(s.persecuted.craftsmen).toBe(400);
  expect(cur(s).people.craftsmen).toBe(1600);
});

// ---------------------------------------------------------------- recruits, students, scholars

Given(/^the province "([^"]+)" is governed by (.+)$/, (s, name: string, who: string) => {
  const p = prov(s, name);
  if (who === "a subject ruler") {
    P.refreshGovernance(p);
    return expect(p.governedBy).toBe("subject ruler");
  }
  const lordName = who.match(/^the lord "(.+)"$/)?.[1] ?? (who === "a lord" ? "a lord" : null);
  p.lord = lordName;
  p.official = who === "no one" ? null : { id: "o1", type: "steward", yearsServed: 5, employer: lordName ?? "ruler" };
  P.refreshGovernance(p);
});
Then(/^its recruits go to (.+)$/, (s, whom: string) => {
  const p = cur(s);
  if (whom === "the lord's retinue") expect(P.recruitsGoTo(p)).toBe(`retinue of ${p.lord}`);
  else expect(P.recruitsGoTo(p)).toBe(whom.match(/"(.+)"/)![1]);
});
Given("the province {string} has 1,100 recruits drawn from its farmers", (s, name: string) => {
  const p = prov(s, name);
  fullFarms(p);
  p.recruits = 1100;
});
When("the country {string} raises 1,000 of them as soldiers", (s) => {
  P.raiseLevy(cur(s), 1000, "farmers");
});
Then("1,000 farm slots in {string} are empty", (s, name: string) => {
  const p = prov(s, name);
  expect(P.slotsByClass(p).farmers - p.people.farmers).toBe(1000);
});
Given("1,000 soldiers from {string} are disbanded", (s, name: string) => {
  const p = prov(s, name);
  addTile(p, "Fields", "farm");
  p.people.farmers = 11000;
});
When("they come home", (s) => {
  const p = cur(s);
  const before = p.people.homeless;
  p.people.homeless += 1000;
  s.joinedHomeless = p.people.homeless - before;
  P.balanceClasses(p);
});
Then("they join the homeless of {string}", (s) => {
  expect(s.joinedHomeless).toBe(1000);
});
Then("overflow into the emptiest slots", (s) => {
  expect(cur(s).people.farmers).toBe(12000);
  expect(cur(s).people.homeless).toBe(0);
});
Given(/^the province "([^"]+)" has recruits at (\d+) % of its pool$/, (s, name: string, share: string) => {
  const p = prov(s, name);
  p.recruitPool = 1000;
  p.recruits = Number(share) * 10;
});
Then(/^the "([^"]+)" grievance is (present|absent|present if it started below a quarter)$/, (s, g: string, st: string) => {
  const p = cur(s);
  if (st === "present if it started below a quarter") {
    p.grievances = [];
    expect(P.evaluateGrievances(p)[g]).toBeUndefined();
    p.grievances = [{ name: g, months: 0 }];
    expect(P.evaluateGrievances(p)[g]).toBe(1);
    return;
  }
  expect(g in P.evaluateGrievances(p)).toBe(st === "present");
});
Given("the province {string} has a school with 50 empty seats and 30 recruits", (s, name: string) => {
  prov(s, name).recruits = 30;
  s.seats = 50;
});
When("the country {string} enrols students to fill the seats", (s) => {
  s.enrolled = P.enrolStudents(s.seats, cur(s).recruits, 1000);
});
Then("30 seats are filled from the recruits of {string}", (s) => {
  expect(s.enrolled.local).toBe(30);
});
Then("20 are filled from the realm's recruits", (s) => {
  expect(s.enrolled.realm).toBe(20);
});
Given("the province {string} has 40 students", (s, name: string) => {
  const p = prov(s, name);
  p.students = 40;
  p.town.push("school");
});
When("10 students graduate", (s) => {
  P.graduate(cur(s), 10);
});
When("the country calls the students to arms", (s) => {
  P.callStudentsToArms(cur(s));
});
When("the school of {string} is sacked", (s, name: string) => {
  P.sackSchool(prov(s, name));
});
Then("the province {string} has fewer students", (s, name: string) => {
  expect(prov(s, name).students).toBeLessThan(40);
});
Given(/^the province "([^"]+)" has (\d+) scholars$/, (s, name: string, n: string) => {
  const p = prov(s, name);
  if (s.scholarsChanged) return expect(p.people.scholars).toBe(Number(n));
  p.people.scholars = Number(n);
  p.students = 40;
  p.town.push("school");
});
const scholarsChange = (fn: (s: Scenario) => void) => (s: Scenario) => {
  fn(s);
  s.scholarsChanged = true;
};
When("5 students graduate", scholarsChange((s) => P.graduate(cur(s), 5)));
When("3 foreign scholars settle in a peaceful town with a school", scholarsChange((s) => P.scholarsSettle(cur(s), 3)));
When("2 scholars die of old age", scholarsChange((s) => P.loseScholars(cur(s), 2)));
When(/^war in "([^"]+)" makes 10 flee$/, scholarsChange((s) => P.loseScholars(cur(s), 10)));
When("a richer neighbour hires 4", scholarsChange((s) => P.loseScholars(cur(s), 4)));

// ---------------------------------------------------------------- tax and tolls

Given("the country {string} holds the toll point {string}", (s, _c: string, point: string) => {
  s.tollPoint = point;
  prov(s, point);
});
When("the country {string} sets its toll to {string}", (s, _c: string, rate: P.TollRate) => {
  P.setToll(cur(s), s.tollPoint, rate);
});
Then("the toll at {string} is {string}", (s, point: string, rate: string) => {
  expect(prov(s, point).tolls[point]).toBe(rate);
});
Given("the province {string} has a toll point with a {string} toll", (s, name: string, rate: P.TollRate) => {
  P.setToll(prov(s, name), name, rate);
});
When("the country grants {string} a free trade charter", (s, name: string) => {
  P.grantCharter(prov(s, name), "free trade");
});
Given("the country {string} sets the realm default tax rate to {string}", (s, _c: string, r: TaxRate) => {
  s.realmDefault = r;
});
When("the country {string} sets the province {string} to {string}", (s, _c: string, name: string, r: TaxRate) => {
  P.setTaxRate(prov(s, name), r, s.realmDefault ?? "normal");
  s.taxChecked = true;
});
Then("the province {string} pays at {string}", (s, name: string, r: string) => {
  expect(P.taxRateOf(prov(s, name), s.realmDefault)).toBe(r);
});
Given("the country {string} owns the province {string}", (s, c: string, name: string) => {
  const p = prov(s, name);
  if (s.ownerChanged) return expect(p.owner).toBe(c);
  p.owner = c;
});
Given("the province {string} owes 12 gold a year", (s, name: string) => {
  prov(s, name);
  s.owes = 12;
});
When("the province {string} has riots", (s) => {
  s.owed = P.taxOwed(s.owes, P.moodEffects(P.mood(3)).taxFactor < 1);
});
Then("it owes 6 gold a year", (s) => {
  expect(s.owed).toBe(6);
});
Given("the country {string} owns border provinces, a heartland, towns and countryside", (s) => {
  s.preset = [
    { province: prov(s, "Picardy"), border: true, town: false },
    { province: prov(s, "Île-de-France"), border: false, town: false },
    { province: prov(s, "Paris"), border: false, town: true },
    { province: prov(s, "Calais"), border: true, town: true },
  ];
});
When("the country {string} picks the tax preset {string}", (s, _c: string, preset: string) => {
  P.applyTaxPreset(s.preset, preset);
});
const rates = (s: Scenario, f: (t: P.TaxPresetTarget) => boolean) => (s.preset as P.TaxPresetTarget[]).filter(f).map((t) => t.province.taxRate);
Then(/^every province is "(\w+)"$/, (s, r: string) => {
  expect(new Set(rates(s, () => true))).toEqual(new Set([r]));
});
Then(/^border provinces are "(\w+)" and the heartland "(\w+)"$/, (s, a: string, b: string) => {
  expect(new Set(rates(s, (t) => t.border))).toEqual(new Set([a]));
  expect(new Set(rates(s, (t) => !t.border))).toEqual(new Set([b]));
});
Then(/^towns and cities are "(\w+)" and the countryside "(\w+)"$/, (s, a: string, b: string) => {
  expect(new Set(rates(s, (t) => t.town))).toEqual(new Set([a]));
  expect(new Set(rates(s, (t) => !t.town))).toEqual(new Set([b]));
});
Given("the lord {string} holds the province {string}", (s, l: string, name: string) => {
  const p = prov(s, name);
  p.lord = l;
  P.refreshGovernance(p);
  lord(s, l).provinces.push(name);
});
Given("his loyalty is {string}", (s, loyalty: P.Loyalty) => {
  (Object.values(s.lords)[0] as Lord).loyalty = loyalty;
});
When("the country {string} sets {string} to {string}", (s, _c: string, name: string, r: TaxRate) => {
  const res = P.setTaxRate(prov(s, name), r);
  const p = cur(s);
  if (res.lordWavers && p.lord) P.waver(lord(s, p.lord));
});
Then("the lord keeps half of what is collected", () => {
  expect(P.lordKeeps(10)).toBe(5);
});
Then("the lord {string} wavers", (s, l: string) => {
  expect(lord(s, l).loyalty).toBe("Wavering");
});
Given("the province {string} has a tax cap charter", (s, name: string) => {
  P.grantCharter(prov(s, name), "tax cap");
});
When("the country {string} tries to set {string} to {string}", (s, _c: string, name: string, r: TaxRate) => {
  P.setTaxRate(prov(s, name), r);
});
Then("the province {string} stays at {string} or below", (s, name: string, r: TaxRate) => {
  const rs = cfg.tax.rates;
  expect(rs.indexOf(P.taxRateOf(prov(s, name), "normal"))).toBeLessThanOrEqual(rs.indexOf(r));
});
Given("the province {string} has the tax rate {string}", (s, name: string, r: TaxRate) => {
  if (s.taxChecked) return expect(P.taxRateOf(prov(s, name), "normal")).toBe(r);
  prov(s, name).taxRate = r;
});
When("rebels in {string} force their demand", (s, name: string) => {
  P.forceTaxDown(prov(s, name));
});
Then("the tax rate of {string} goes down", (s, name: string) => {
  const rs = cfg.tax.rates;
  expect(rs.indexOf(P.taxRateOf(prov(s, name), "normal"))).toBeLessThan(rs.indexOf("heavy"));
});
Then("{string} counts as {int} in {string}", (s, g: string, w: number, name: string) => {
  expect(P.evaluateGrievances(prov(s, name))[g] ?? 0).toBe(w);
});

// ---------------------------------------------------------------- roads and travel

Given("the province {string} has a {string} road", (s, name: string, step: P.RoadStep) => {
  const p = prov(s, name);
  if (s.roadBuilt) return expect(p.road).toBe(step);
  p.road = step;
});
Given("the country {string} knows the invention for {string}", (s, _c: string, step: P.RoadStep) => {
  (s.roadSteps ??= []).push(step);
});
When("the country {string} pays gold times the ground's build cost", (s) => {
  const to = s.roadSteps[0] as P.RoadStep;
  expect(P.buildRoad(cur(s), to, s.roadSteps)).toBe(true);
  s.roadBuilt = true;
});
Given("the province {string} has a {string}", (s, name: string, step: P.RoadStep) => {
  prov(s, name).road = step;
  s.roadBefore = step;
});
When(/^(upkeep is neglected|fighting wrecks it|a flood breaks it)$/, (s) => {
  P.roadFalls(cur(s));
});
Then("the road of {string} falls a step", (s, name: string) => {
  const steps = cfg.roads.steps;
  expect(steps.indexOf(prov(s, name).road)).toBe(steps.indexOf(s.roadBefore) - 1);
});
When("a canal is dug through the province {string}", (s, name: string) => {
  expect(P.digCanal(prov(s, name))).toBe(true);
});
Then("{string} counts as a river province, one ring closer for castle food spread", (s, name: string) => {
  expect(P.isRiverProvince(prov(s, name))).toBe(true);
});
When("the canal is wrecked in war", (s) => {
  P.wreckCanal(cur(s));
});
Then("{string} no longer counts as a river province", (s, name: string) => {
  expect(P.isRiverProvince(prov(s, name))).toBe(false);
});
Given("the province {string} is {int} days from {string} by road", (s, name: string, days: number) => {
  prov(s, name);
  s.route = { capital: days, seats: [] as number[] };
  work(s, () => (s.days = P.daysToCapital(s.route.capital, s.route.seats)));
});
Given("nothing blocks the road", () => {});
Given("a seat stands 2 days away", (s) => {
  s.route.seats.push(2);
});
Then("the days to capital of {string} are {int}", (s, _n: string, d: number) => {
  expect(s.days).toBe(d);
});
Given("the province {string} is {int} days from the capital or a seat", (s, name: string, d: number) => {
  prov(s, name).daysToCapital = d;
});

// ---------------------------------------------------------------- governance

When(/^the country "England" conquers it and keeps it in the peace$/, (s) => {
  P.changeOwner(cur(s), "England");
  s.ownerChanged = true;
});
When(/^the country "France" cedes it to "Burgundy" in a peace$/, (s) => {
  P.changeOwner(cur(s), "Burgundy");
  s.ownerChanged = true;
});
When(/^its lord defects to "Burgundy" with his land$/, (s) => {
  P.changeOwner(cur(s), "Burgundy");
  s.ownerChanged = true;
});
Then(/^it gives (full|half) tax and (full recruits|half recruits|recruits to the lord's retinue)$/, (s, tax: string, rec: string) => {
  const g = P.governanceGives(cur(s));
  expect(g.tax).toBe(tax);
  expect(g.recruits).toBe(rec === "full recruits" ? "full" : rec === "half recruits" ? "half" : "retinue");
});
Then(/^it has (the effect of his type|the lord's officials running it|the "Ungoverned" grievance)$/, (s, extra: string) => {
  const p = cur(s);
  const g = P.governanceGives(p);
  if (extra === "the effect of his type") expect(g.officialEffect && P.officialEffect(p.official!.type, p.official!.yearsServed)).toBeTruthy();
  else if (extra === "the lord's officials running it") expect(p.official?.employer).toBe(p.lord);
  else expect(P.evaluateGrievances(p).Ungoverned).toBe(1);
});
Given("the province {string} belongs to a subject of the country {string}", (s, name: string, c: string) => {
  prov(s, name).subjectOf = c;
});
Given("the lord {string} holds the province {string} and has no heir", (s, l: string, name: string) => {
  const p = prov(s, name);
  p.lord = l;
  p.official = { id: "lo", type: "steward", yearsServed: 3, employer: l };
  P.refreshGovernance(p);
});
When("the lord dies", (s) => {
  P.lordLineDiesOut(cur(s));
});
Then("the province {string} becomes royal", (s, name: string) => {
  expect(prov(s, name).lord).toBeNull();
});
Then("it needs an official", (s) => {
  expect(cur(s).governedBy).toBe("no one");
  expect(P.evaluateGrievances(cur(s)).Ungoverned).toBe(1);
});
Given("the province {string} has no castle", (s, name: string) => {
  prov(s, name).castle = "none";
});
When("the army of {string} takes the castle", (s, c: string) => {
  expect(P.occupy(cur(s), c, { tookCastle: true })).toBe(true);
});
When("the army of {string} holds the province for a season", (s, c: string) => {
  expect(P.occupy(cur(s), c, { monthsHeld: 2 })).toBe(false);
  expect(P.occupy(cur(s), c, { monthsHeld: 3 })).toBe(true);
});
Then("the province {string} is occupied by {string}", (s, name: string, c: string) => {
  expect(prov(s, name).occupiedBy).toBe(c);
  expect(prov(s, name).governedBy).toBe("occupied");
});
Then("its tax, recruits, food and trade go to {string}", (s, c: string) => {
  expect(P.incomeGoesTo(cur(s))).toBe(c);
  expect(P.recruitsGoTo(cur(s))).toBe(c);
});
Given("the province {string} has been occupied by {string} for {int} months", (s, name: string, c: string, m: number) => {
  const p = prov(s, name);
  p.occupiedBy = c;
  p.occupiedMonths = m;
});
When("peace is made and {string} stays French", (s, name: string) => {
  P.liberate(prov(s, name));
});
Then("the province {string} is no longer occupied", (s, name: string) => {
  expect(prov(s, name).occupiedBy).toBeNull();
});
Given("the Castilians make up most of the province {string} for 100 years", (s, name: string) => {
  const p = prov(s, name);
  work(s, () => P.updateHomeland(p, "Castilians", 100, 0));
});
Then("the province {string} is a homeland of the Castilians", (s, name: string) => {
  expect(prov(s, name).homeland).toContain("Castilians");
});
Given("no Moors have lived in the province {string} for 100 years", (s, name: string) => {
  const p = prov(s, name);
  p.homeland = ["Moors"];
  work(s, () => P.updateHomeland(p, "Moors", 0, 100));
});
Then("the province {string} is no longer a homeland of the Moors", (s, name: string) => {
  expect(prov(s, name).homeland).not.toContain("Moors");
});
Given("the province {string} is the homeland of the Bretons", (s, name: string) => {
  prov(s, name).homeland = ["Breton"];
});
Given("it is held by a ruler of the French tongue", (s) => {
  cur(s).holderTongue = "French";
});
Then("the province {string} has the {string} grievance", (s, name: string, g: string) => {
  P.updateGrievances(prov(s, name));
  expect(prov(s, name).grievances.map((x) => x.name)).toContain(g);
});
Then("separatist events can start there", (s) => {
  expect(P.evaluateGrievances(cur(s))["Foreign rule"]).toBe(1);
});
const PRETENDER = (lostYearsAgo: number | null, x: Partial<P.Pretender> = {}): P.Pretender => ({ name: "king of England", lostYearsAgo, heirs: true, renounced: false, marriedIn: false, ...x });
Given(/^the province "([^"]+)" was lost by the king of "England" in war (\d+) years ago$/, (s, name: string, y: string) => {
  prov(s, name).pretenders = [PRETENDER(Number(y))];
});
Given(/^the province "([^"]+)" has a pretender who (died without heirs|renounced it in a peace|married into the ruling house of "France")$/, (s, name: string, how: string) => {
  prov(s, name).pretenders = [PRETENDER(null, how.startsWith("died") ? { heirs: false } : how.startsWith("renounced") ? { renounced: true } : { marriedIn: true })];
});
Then(/^the king of "England" is (a pretender to it|no longer a pretender)$/, (s, r: string) => {
  expect(P.livePretenders(cur(s)).includes("king of England")).toBe(r === "a pretender to it");
});
Then("that pretender is gone", (s) => {
  expect(P.livePretenders(cur(s))).toEqual([]);
});

// ---------------------------------------------------------------- officials

const official = (type: string, yearsServed: number, employer = "ruler"): Official => ({ id: `${type}-1`, type, yearsServed, employer });
Given("the province {string} is royal", (s, name: string) => {
  prov(s, name).lord = null;
});
Given(/^a "([^"]+)" official has served (\d+) years in "([^"]+)"$/, (s, type: string, y: string, name: string) => {
  const p = prov(s, name);
  p.official = official(type, Number(y));
  P.refreshGovernance(p);
});
const EFFECTS: Record<string, P.OfficialEffect> = {
  "+20 % of tax owed reaching you": { tax_reach: 0.2 },
  "+10 % food from the tiles and a local store that rots half as fast": { food: 0.1, store_rot: 0.5 },
  "riots needing one grievance more and Broken charter fading twice as fast": { riots_extra_grievances: 1, broken_charter_fade: 2 },
  "buildings and roads 25 % cheaper and twice as fast, and burned tiles rebuilt twice as fast": { build_cost: -0.25, build_time: 0.5, burned_rebuild: 2 },
  "recruits refilling 25 % faster": { recruit_refill: 0.25 },
  "+15 % trade ratio gain": { trade_ratio_gain: 0.15 },
  "faith mix moving twice as fast toward the ruler's faith": { faith_shift: 2 },
  "tongue mix moving twice as fast toward the ruler's tongue and students graduating a year sooner": { tongue_shift: 2, graduate_sooner_years: 1 },
  "a garrison fighting 25 % better, walls repairing twice as fast and a castle store rotting half as fast": { garrison: 0.25, walls_repair: 2, castle_store_rot: 0.5 },
  "no effect of its own": {},
};
Then(/^the province "([^"]+)" gets (?!its third grievance$)(.+)$/, (s, name: string, effect: string) => {
  if (s.eventResult !== undefined) return expect(s.eventResult).toBe(effect);
  const o = prov(s, name).official!;
  expect(EFFECTS[effect], effect).toBeDefined();
  expect(P.officialEffect(o.type, o.yearsServed)).toEqual(EFFECTS[effect]);
});
Given("the country {string} has 1 free official", (s) => {
  s.free = official("steward", 0);
});
Given("the province {string} has a seat", (s, name: string) => {
  const p = prov(s, name);
  p.townSize = "town";
  p.town.push("seat");
});
When("the country {string} assigns the official to {string}", (s, _c: string, name: string) => {
  expect(P.assignOfficial(prov(s, name), s.free)).toBe(true);
});
Then("the official runs the province {string}", (s, name: string) => {
  expect(prov(s, name).official?.id).toBe(s.free.id);
  expect(prov(s, name).governedBy).toBe("official");
});
Then("the seat in {string} still needs an official of its own", (s, name: string) => {
  expect(P.seatNeedsOfficial(prov(s, name))).toBe(true);
  expect(P.assignOfficial(prov(s, name), s.free)).toBe(false);
});
Then(/^he gives (half|all) of his effect$/, (s, share: string) => {
  expect(P.officialEffectShare(cur(s).official!.yearsServed)).toBe(share === "half" ? 0.5 : 1);
});
When("the country {string} moves him to {string}", (s, _c: string, name: string) => {
  const from = cur(s);
  s.moved = P.moveOfficial(from, prov(s, name));
});
Then("he gives half of his effect in {string}", (s, name: string) => {
  expect(P.officialEffectShare(prov(s, name).official!.yearsServed)).toBe(0.5);
});
Given("the country {string} has a free colonial governor slot", (s) => {
  s.slot = true;
});
Given("a colonial governor holds that slot", (s) => {
  s.governor = official("colonial governor", 0);
});
Then("he does not count against the officials cap", (s) => {
  expect(P.countsAgainstCap(s.governor, s.slot)).toBe(false);
});
When("his colony is founded", (s) => {
  const colony = prov(s, "Madeira");
  colony.owner = null;
  P.foundColony(colony, "Portugal");
  s.governor = P.governorFoundsColony(s.governor, colony);
  s.slot = false;
});
Then("he becomes the colony's ordinary official", (s) => {
  expect(prov(s, "Madeira").official?.id).toBe(s.governor.id);
  expect(prov(s, "Madeira").governedBy).toBe("official");
});
Then("he counts against the officials cap", (s) => {
  expect(P.countsAgainstCap(s.governor, s.slot)).toBe(true);
});
Given(/^the country "([^"]+)" has an? (madrasa|university|academy)$/, (s, _c: string, school: string) => {
  s.school = school;
});
When("a scholar graduates and becomes an official", (s) => {
  s.types = P.schoolTrains(s.school);
});
Then(/^he may be a (.+) or (.+)$/, (s, a: string, b: string) => {
  expect(s.types).toEqual([a, b]);
});
Given(/^the country "([^"]+)" has (\d+) officials$/, (s, _c: string, n: string) => {
  if (s.rosterChanged) return expect(P.countryOfficials(s.roster)).toBe(Number(n));
  s.roster = [];
  for (let i = 0; i < Number(n); i++) P.hireOfficial(s.roster, i % 2 ? "judge" : "steward");
});
const rosterChange = (fn: (s: Scenario) => void) => (s: Scenario) => {
  fn(s);
  s.rosterChanged = true;
};
When("it hires a steward for gold up front", rosterChange((s) => P.hireOfficial(s.roster, "steward")));
When("a lord's line dies out and his one official enters service", rosterChange((s) => P.hireOfficial(s.roster, "steward", "lords-official")));
When(
  /^(an official dies of old age|it dismisses a judge|it leaves wages unpaid and one official leaves|rebels take a province and kill its official|a richer neighbour hires one away)$/,
  rosterChange((s) => {
    const judge = (s.roster as Official[]).find((o) => o.type === "judge")!;
    P.loseOfficial(s.roster, judge.id);
  }),
);
Given("the country {string} has 18 officials in royal provinces and 22 elsewhere in its service", (s) => {
  s.roster = [];
  for (let i = 0; i < 40; i++) P.hireOfficial(s.roster, "steward");
});
Then("the country card shows {int} officials", (s, n: number) => {
  expect(P.countryOfficials(s.roster)).toBe(n);
});

// Moving, swapping and hiring officials (PROV-303, PROV-333 to 335).
Given("the province {string} is royal with its post empty", (s, name: string) => {
  const p = prov(s, name);
  p.lord = null;
  p.official = null;
  P.refreshGovernance(p);
});
When("the country {string} moves the official of {string} to {string}", (s, _c: string, from: string, to: string) => {
  s.before = { [from]: prov(s, from).official, [to]: prov(s, to).official };
  expect(P.moveOrSwapOfficial(prov(s, from), prov(s, to))).toBeNull();
});
Then(/^the "([^"]+)" runs "([^"]+)"(?: under his own name,)? at half his effect$/, (s, type: string, name: string) => {
  const o = prov(s, name).official!;
  expect(o.type).toBe(type);
  // Under his own name: the same official as before the move, when he moved.
  const was = Object.values((s.before ?? {}) as Record<string, Official | null>).find((x) => x?.type === type);
  if (was) expect(o.id).toBe(was.id);
  expect(P.officialEffectShare(o.yearsServed)).toBe(0.5);
  expect(prov(s, name).governedBy).toBe("official");
});
Then("the post in {string} stands empty", (s, name: string) => {
  expect(prov(s, name).official).toBeNull();
  expect(P.governanceGives(prov(s, name)).ungoverned).toBe(true);
});
Given("the lord {string} holds {string} with an official of his own", (s, l: string, name: string) => {
  const p = prov(s, name);
  p.lord = l;
  p.official = official("steward", 3, l);
  P.refreshGovernance(p);
});
When("the country {string} tries to move the official of {string}", (s, _c: string, name: string) => {
  s.refusal = P.moveOrSwapOfficial(prov(s, name), prov(s, "Paris"));
  expect(prov(s, name).official?.employer).not.toBe("ruler");
});
When("the country {string} tries to commission the official of {string}", (s, _c: string, name: string) => {
  s.refusal = P.servesTheLord(prov(s, name));
});
Then(/^it is refused because (.+)$/, (s, why: string) => {
  expect(s.refusal).toBe(why);
});
/** Types serving in the realm's royal posts other than province `but`. */
const serving = (s: Scenario, but: string): string[] =>
  Object.entries((s.provinces ?? {}) as Record<string, Province>).filter(([n, p]) => n !== but && p.lord === null && p.official).map(([, p]) => p.official!.type);
const hire = (s: Scenario, type: string, name: string, foreign: boolean) => {
  const p = prov(s, name);
  const gold = s.gold ?? 1e9;
  s.refusal = P.cannotHire(p, type, foreign, serving(s, name), gold);
  if (s.refusal) return;
  s.paid = P.hireIntoPost(p, official(type, 0), foreign);
  s.gold = gold - s.paid;
};
Given("the country {string} has {int} gold", (s, _c: string, gold: number) => {
  s.gold = gold;
});
Given("the country {string} has gold to hire an official", (s) => {
  s.gold = 1000;
  prov(s, "Troyes").official = official("master of works", 4);
  prov(s, "Rouen").official = null;
});
When(/^the country "[^"]+" (tries to hire|hires) an? (foreign )?"([^"]+)" for "([^"]+)"$/, (s, how: string, foreign: string | undefined, type: string, name: string) => {
  hire(s, type, name, !!foreign);
  if (how === "hires") expect(s.refusal).toBeNull();
});
When(/^the country "[^"]+" hires a foreign ([^"]+)$/, (s, type: string) => {
  hire(s, type, "Rouen", true);
  expect(s.refusal).toBeNull();
});
Then("it pays more than for a native {}", (s, type: string) => {
  expect(s.paid).toBeGreaterThan(P.hirePrice(false));
});
Then("the country {string} has {int} gold left", (s, _c: string, gold: number) => {
  expect(s.gold).toBe(gold);
});
When("the country {string} tries to hire a {string} for {string}, held by the lord {string}", (s, _c: string, type: string, name: string, l: string) => {
  const p = prov(s, name);
  p.lord = l;
  p.official = null;
  hire(s, type, name, false);
});
Given("no {string} serves in a royal post of {string}", (s, type: string) => {
  expect(serving(s, "").includes(type)).toBe(false);
});

// Officials in the game (PROV-304, PROV-305).
When("a new campaign starts", (s) => {
  s.game = createWorld(loadDefaultRuleset(), 1);
});
Then("each official has served between 0 and 10 years in his province", (s) => {
  const w = s.game;
  const years: number[] = [];
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOfficial[p] >= 0) years.push(yearsServed(w, p));
  expect(years.length).toBeGreaterThan(100);
  expect(Math.min(...years)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...years)).toBeLessThanOrEqual(10);
  s.years = years;
});
Then("not every official has served the same number of years", (s) => {
  expect(new Set(s.years.map((y: number) => Math.floor(y))).size).toBeGreaterThan(5);
});
Then(/^his effect shows as waiting until (buildings|schools) are in the game$/, (s, system: string) => {
  const o = cur(s).official!;
  const type = o.type[0]!.toUpperCase() + o.type.slice(1);
  expect(gameOfficialEffect(type, o.yearsServed).note).toBe(`Takes effect when ${system} arrive`);
});

// ---------------------------------------------------------------- lords

Given("the lord {string} holds only the province {string}", (s, l: string, name: string) => {
  prov(s, name);
  lord(s, l).provinces = [name];
  s.lordName = l;
});
When(/^the country "France" seizes "([^"]+)" by force$/, (s, name: string) => {
  P.lordLosesProvince(lord(s, s.lordName), name, "seized");
});
When(/^an enemy conquers "([^"]+)"$/, (s, name: string) => {
  P.lordLosesProvince(lord(s, s.lordName), name, "conquered");
});
When(/^he gives "([^"]+)" away$/, (s, name: string) => {
  P.lordLosesProvince(lord(s, s.lordName), name, "given away");
});
Then("he is no longer a lord", (s) => {
  expect(P.isLord(lord(s, s.lordName))).toBe(false);
});
Then(/^he (flees abroad and becomes a pretender to "[^"]+"|stays at court as a courtier)$/, (s, fate: string) => {
  const l = lord(s, s.lordName);
  const to = fate.match(/"([^"]+)"/)?.[1];
  if (to) {
    expect(l.abroad).toBe(true);
    expect(l.pretenderTo).toContain(to);
  } else expect(l.courtier).toBe(true);
});
Given("{string} is a courtier at the court of {string}", (s, l: string) => {
  const x = lord(s, l);
  x.courtier = true;
  s.lordName = l;
});
When("the country {string} grants him the province {string}", (s, _c: string, name: string) => {
  P.grantLand(lord(s, s.lordName), name);
});
Then("he is a lord again", (s) => {
  expect(P.isLord(lord(s, s.lordName))).toBe(true);
  expect(lord(s, s.lordName).courtier).toBe(false);
});
Given("the lord {string} holds {string} and {string}", (s, l: string, a: string, b: string) => {
  for (const n of [a, b]) {
    const p = prov(s, n);
    p.lord = l;
    P.refreshGovernance(p);
  }
  lord(s, l).provinces = [a, b];
  s.lordName = l;
});
Given("he has one {string} official of his own in {string}", (s, type: string, name: string) => {
  prov(s, name).official = official(type, 5, s.lordName);
});
Then("{string} gets the steward's effect", (s, name: string) => {
  const o = prov(s, name).official!;
  expect(P.governanceGives(prov(s, name)).officialEffect).toBe(true);
  expect(P.officialEffect(o.type, o.yearsServed)).toEqual(EFFECTS["+10 % food from the tiles and a local store that rots half as fast"]);
});
Then("{string} pays him half and has the {string} grievance", (s, name: string, g: string) => {
  const p = prov(s, name);
  expect(P.governanceGives(p).tax).toBe("half");
  expect(P.evaluateGrievances(p)[g]).toBe(1);
});
Given("the country {string} has a free {string} official", (s, _c: string, type: string) => {
  s.free = official(type, 0);
});
When("the country {string} lends the judge to the lord {string}", (s, _c: string, l: string) => {
  s.lent = P.lendOfficial(lord(s, l), s.free);
  s.lordName = l;
});
Then("the country {string} keeps paying the judge's wage", (s) => {
  expect(s.lent.wagePaidBy).toBe("ruler");
});
Then("the lord's loyalty goes up", (s) => {
  expect(s.lent.loyaltyWon).toBe(true);
});
Then("the judge works for the lord until called back", (s) => {
  const l = lord(s, s.lordName);
  expect(s.free.employer).toBe(l.name);
  P.recallOfficial(l, s.free);
  expect(s.free.employer).toBe("ruler");
});
Given("a lord with the trait {string} has wealth to spend", (s, t: string) => {
  s.trait = t;
});
When("he builds in his own provinces", (s) => {
  s.favours = P.lordFavours(s.trait);
});
const FAVOURS: Record<string, string[]> = { "the most buildings of any lord": ["any"], "markets and mines": ["market", "mine"], "houses of worship": ["house of worship"], castles: ["castle"] };
Then(/^he favours (.+)$/, (s, what: string) => {
  expect(s.favours).toEqual(FAVOURS[what]);
});
Given("the lord {string} is {string}", (s, l: string, loyalty: P.Loyalty) => {
  lord(s, l).loyalty = loyalty;
  s.lordName = l;
});
When("the country {string} pays for a market in {string}", (s, _c: string, name: string) => {
  s.paid = P.payForLordBuilding(lord(s, s.lordName), "market", name);
});
Then("the market belongs to the lord", (s) => {
  expect(s.paid.owner).toBe(s.lordName);
});
Then("his loyalty becomes {string}", (s, loyalty: string) => {
  expect(lord(s, s.lordName).loyalty).toBe(loyalty);
});
Given("the lord {string} owns a market and a castle in {string}", (s, l: string, name: string) => {
  s.owned = [
    { building: "market", province: name, owner: l },
    { building: "castle", province: name, owner: l },
  ];
  s.lordName = l;
});
When("his land comes back to the country {string}", (s, c: string) => {
  P.landComesBack(s.owned, s.lordName, c);
});
Then("the market and the castle belong to the country {string}", (s, c: string) => {
  expect((s.owned as P.BuildingOwner[]).map((b) => b.owner)).toEqual([c, c]);
});

// ---------------------------------------------------------------- charters

When("the country {string} grants the province {string} a {string} charter", (s, _c: string, name: string, kind: string) => {
  P.grantCharter(prov(s, name), kind);
  s.charter = kind;
  s.effect = P.charterEffect(kind);
});
const GAINS: Record<string, (e: P.CharterEffect) => boolean> = {
  "a market that can grow into a yearly fair": (e) => e.marketCanGrowToFair === true,
  "a tax rate no higher than light": (e) => e.maxTaxRate === "light",
  "townsfolk running the town": (e) => e.townRunsTown === true,
  "no armies wintering there": (e) => e.noWinterQuarters === true,
  "its minority faith worshipping openly": (e) => e.minorityFaithOpen === true,
  "no tolls": (e) => e.noTolls === true,
  "faster digging and new seams": (e) => e.fasterDigging === true && e.newSeams === true,
};
const COSTS: Record<string, (e: P.CharterEffect) => boolean> = {
  "a little gold": (e) => e.costsGold === true,
  "tax from it": (e) => e.costsTax === true,
  "seizing anything there without breaking it": (e) => e.noSeizures === true,
  "winter quarters there": (e) => e.noWinterQuarters === true,
  "clergy lords' loyalty; Wrong faith ends there": (e) => e.clergyLordsWaver === true && e.endsWrongFaith === true,
  "toll gold": (e) => e.noTolls === true,
  "half the mine's output": (e) => e.ownerOutputShare === 0.5,
};
Then(/^the province gets (.+)$/, (s, gain: string) => {
  expect(GAINS[gain]!(s.effect)).toBe(true);
  expect(cur(s).charters).toContain(s.charter);
});
Then(/^the country gives up (.+)$/, (s, c: string) => {
  expect(COSTS[c]!(s.effect)).toBe(true);
});
Given("the province {string} has no {string} charter", (s, name: string, kind: string) => {
  expect(prov(s, name).charters).not.toContain(kind);
  s.charter = kind;
});
When(/^(the country grants it|the town demands it for a loan and is granted it|rebels force it)$/, (s) => {
  P.grantCharter(cur(s), s.charter);
  s.charterGranted = true;
});
Given("the province {string} has the {string} charter", (s, name: string, kind: string) => {
  const p = prov(s, name);
  if (s.charterGranted) return expect(p.charters).toContain(kind);
  P.grantCharter(p, kind);
  s.charter = kind;
});
When("the country {string} revokes it", (s) => {
  s.revoked = P.revokeCharter(cur(s), s.charter);
});
Then("the province {string} has the {string} grievance for 20 years", (s, name: string, g: string) => {
  const p = prov(s, name);
  expect(P.evaluateGrievances(p)[g]).toBe(1);
  p.brokenCharters[0]!.years = 19;
  expect(P.evaluateGrievances(p)[g]).toBe(1);
  p.brokenCharters[0]!.years = 20;
  expect(P.evaluateGrievances(p)[g]).toBeUndefined();
  p.brokenCharters[0]!.years = 0;
});
Then("every lord of {string} notices", (s) => {
  expect(s.revoked.lordsNotice).toBe(true);
});
When(/^the country "([^"]+)" conquers "([^"]+)" and (keeps|revokes) the charter$/, (s, c: string, name: string, choice: string) => {
  P.conquerCharters(prov(s, name), c, choice === "keeps");
});
Then("the province {string} still has the {string} charter", (s, name: string, kind: string) => {
  expect(prov(s, name).charters).toContain(kind);
});
Then("the town of {string} needs no official", (s, name: string) => {
  const p = prov(s, name);
  p.town.push("seat");
  expect(P.seatNeedsOfficial(p)).toBe(false);
  expect(P.charterEffect("town law").noOfficialNeeded).toBe(true);
});
When("the country {string} seizes property in {string}", (s, _c: string, name: string) => {
  s.seized = P.seizeProperty(prov(s, name));
});
Then("the charter is broken", (s) => {
  expect(s.seized.brokeCharter).toBe(true);
  expect(P.evaluateGrievances(cur(s))["Broken charter"]).toBe(1);
});
Given("the province {string} has a silver mine", (s, name: string) => {
  s.tileIdx = addTile(prov(s, name, "mountains"), "Waste", "mine");
});
When("the country grants a {string} charter there", (s, kind: string) => {
  P.grantCharter(cur(s), kind);
  s.effect = P.charterEffect(kind);
});
Then("a merchant house runs the mine", (s) => {
  expect(s.effect.merchantRunsMine).toBe(true);
});
Then("the country gets half the mine's output", (s) => {
  expect(s.effect.ownerOutputShare).toBe(0.5);
});
Then("the mine digs faster and finds new seams", (s) => {
  expect(s.effect.fasterDigging && s.effect.newSeams).toBe(true);
});

// ---------------------------------------------------------------- defence

Given("the province {string} has the castle {string}", (s, name: string, step: P.CastleStep) => {
  const p = prov(s, name);
  if (s.castleChanged) return expect(p.castle).toBe(step);
  p.castle = step;
});
const castleChange = (fn: (s: Scenario) => void) => (s: Scenario) => {
  fn(s);
  s.castleChanged = true;
};
When(
  "the country builds an earthwork ring fort",
  castleChange((s) => {
    known(s).push("B4");
    expect(P.upgradeCastle(cur(s), "earthwork ring fort")).toBe(true);
  }),
);
When(
  "the country upgrades it with B5 known",
  castleChange((s) => {
    known(s).push("B5");
    expect(P.upgradeCastle(cur(s), "bastion fort")).toBe(true);
  }),
);
When(
  "it goes 10 years without upkeep",
  castleChange((s) => {
    for (let i = 0; i < 10; i++) P.castleYearUnkept(cur(s));
  }),
);
When(/^(a peace demolishes it|it is destroyed in a siege)$/, castleChange((s) => P.castleLost(cur(s))));
Given("the province {string} has a stone castle", (s, name: string) => {
  const p = prov(s, name);
  p.castle = "stone castle";
  p.castleHolder = p.owner;
  p.garrison = 300;
});
When("the country {string} conquers {string}", (s, c: string, name: string) => {
  P.changeOwner(prov(s, name), c);
  prov(s, name).castleHolder = c;
});
Then("the country {string} holds the stone castle of {string}", (s, c: string, name: string) => {
  const p = prov(s, name);
  expect(p.castle).toBe("stone castle");
  expect(p.castleHolder).toBe(c);
  expect(p.owner).toBe(c);
});
Given("the province {string} has a castle and the ground {string}", (s, name: string, g: Ground) => {
  const p = prov(s, name, g);
  p.ground = g;
  p.castle = "stone castle";
  addTile(p, "Castle", "castle");
});
Then(/^the castle (is far harder to take|must be besieged to take the province)$/, (s, e: string) => {
  expect(P.castleHardToTake(cur(s))).toBe(e === "is far harder to take");
  expect(P.defenderOnWalls(cur(s))).toBe(true);
});
Given("the province {string} has a castle on a shore tile", (s, name: string) => {
  const p = prov(s, name);
  p.castle = "stone castle";
  s.onShore = true;
});
When("an enemy besieges it by land", () => {});
Then("the castle can be supplied by sea", (s) => {
  expect(P.suppliedBySea(s.onShore)).toBe(true);
});
Given("the castle of {string} has {int} breaches", (s, name: string, n: number) => {
  const p = prov(s, name);
  if (s.wallsChanged) return expect(p.breaches).toBe(n);
  p.castle = "stone castle";
  p.breaches = n;
});
const wallsChange = (fn: (s: Scenario) => void) => (s: Scenario) => {
  fn(s);
  s.wallsChanged = true;
};
When(/^(siege guns breach the walls|mining opens another breach|an earthquake strikes|siege guns fire again)$/, wallsChange((s) => P.breach(cur(s))));
When("the country pays gold and waits months", wallsChange((s) => P.repairBreach(cur(s))));
Given("the castle of {string} has no garrison", (s, name: string) => {
  const p = prov(s, name);
  p.castle = "stone castle";
  p.garrison = 0;
});
When("an enemy army enters {string}", (s, name: string) => {
  s.falls = P.castleFallsAtOnce(prov(s, name));
});
Then("the castle falls at once", (s) => {
  expect(s.falls).toBe(true);
});

// ---------------------------------------------------------------- grievances

Then("the {string} grievance is gone", (s, g: string) => {
  P.updateGrievances(cur(s));
  expect(cur(s).grievances.map((x) => x.name)).not.toContain(g);
});
Given('the province {string} has its tax rate at "heavy"', (s, name: string) => {
  prov(s, name).taxRate = "heavy";
});
When('the rate drops to "normal"', (s) => {
  P.setTaxRate(cur(s), "normal");
});
Given("the province {string} has a local food store under 1 month", (s, name: string) => {
  prov(s, name).storeMonths = 0.5;
});
When("the store stays above 3 months for a full season", (s) => {
  cur(s).storeMonths = 4;
  cur(s).storeAboveMonths = cfg.months_per_season;
});
Given("the province {string} has more than a tenth of its people homeless", (s, name: string) => {
  const p = prov(s, name);
  fullFarms(p, 1);
  p.people.homeless = 1500;
});
When("new buildings take them in", (s) => {
  cur(s).town.push("loom house");
  P.balanceClasses(cur(s));
});
Given("the province {string} has an army staying more than a season", (s, name: string) => {
  prov(s, name).armyMonths = 4;
});
When("the army leaves", (s) => {
  cur(s).armyMonths = 0;
});
Given("the province {string} has a burned tile", (s, name: string) => {
  const p = prov(s, name);
  p.people.farmers = 100;
  p.tiles[addTile(p, "Fields", "farm")]!.state = "Burned";
});
When("all tiles are rebuilt", (s) => {
  P.yearEndLand(cur(s));
});
Given("the province {string} has recruits below a quarter of the pool", (s, name: string) => {
  const p = prov(s, name);
  p.recruitPool = 1000;
  p.recruits = 200;
});
When("recruits refill to half", (s) => {
  cur(s).recruits = 500;
});
Given("the province {string} is a homeland held by a ruler of another tongue", (s, name: string) => {
  const p = prov(s, name);
  p.homeland = ["Breton"];
  p.holderTongue = "French";
});
When("a lord of the local tongue is granted it", (s) => {
  const p = cur(s);
  p.lord = "Duke of Brittany";
  p.holderTongue = "Breton";
  p.official = official("steward", 0, p.lord);
  P.refreshGovernance(p);
});
Given("the province {string} has most people not sharing the ruler's faith", (s, name: string) => {
  const p = prov(s, name);
  p.faith = { Protestant: 0.7, Catholic: 0.3 };
  p.rulerFaith = "Catholic";
});
When("a faith tolerance charter is granted", (s) => {
  P.grantCharter(cur(s), "faith tolerance");
});
Given("the province {string} is royal with no official", (s, name: string) => {
  const p = prov(s, name);
  p.official = null;
  P.refreshGovernance(p);
});
When("an official is assigned", (s) => {
  P.assignOfficial(cur(s), official("judge", 0));
});
Given("the province {string} has a lord who is Cruel", (s, name: string) => {
  const p = prov(s, name);
  p.lord = "Cruel lord";
  p.lordTraits = ["Cruel"];
  p.official = official("steward", 0, p.lord);
  P.refreshGovernance(p);
});
When("the lord changes", (s) => {
  cur(s).lord = "New lord";
  cur(s).lordTraits = ["Builder"];
});
Given("the province {string} had a charter revoked", (s, name: string) => {
  const p = prov(s, name);
  P.grantCharter(p, "tax cap");
  P.revokeCharter(p, "tax cap");
});
When("20 years pass", (s) => {
  for (const b of cur(s).brokenCharters) b.years += 20;
  if (cur(s).bloodshedYears !== null) cur(s).bloodshedYears! += 20;
});
Given("the province {string} is 35 days from the capital", (s, name: string) => {
  prov(s, name).daysToCapital = 35;
});
When("a seat is built nearby", (s) => {
  cur(s).daysToCapital = P.daysToCapital(35, [2]);
});
When("the plague burns out", (s) => {
  const rng = new Rng(7);
  for (let i = 0; i < 4 && cur(s).plague === "outbreak"; i++) P.plagueSeason(cur(s), rng);
  if (cur(s).plague === "outbreak") cur(s).plague = "burning out";
});
Given("the province {string} saw a rising of its faith massacred", (s, name: string) => {
  prov(s, name).bloodshedYears = 0;
});
Given("the province {string} has food taken from its store by an army", (s, name: string) => {
  prov(s, name).requisitionedMonthsAgo = 0;
});
When("a season passes after the last taking", (s) => {
  cur(s).requisitionedMonthsAgo = cfg.months_per_season;
});
Given("the province {string} borders a province whose rebels share one of its grievances", (s, name: string) => {
  prov(s, name).neighbourRebels = ["Sens"];
});
When("those rebels are beaten", (s) => {
  cur(s).neighbourRebels = [];
});
Given(/^the province "([^"]+)" is held by a lord who is (Cruel|Greedy|hostile to the people's faith|hostile to the people's tongue)$/, (s, name: string, trait: string) => {
  const p = prov(s, name);
  p.lord = "the lord";
  p.lordTraits = [trait.replace("the people's ", "")];
  p.official = official("steward", 0, p.lord);
  P.refreshGovernance(p);
});
Given("the province {string} has {int} grievances", (s, name: string, n: number) => {
  prov(s, name);
  s.count = n;
});
Then("its growth slows", (s) => {
  expect(P.moodEffects(P.mood(s.count)).growthSlows).toBe(true);
});
Then("scholars and craftsmen start to leave", (s) => {
  expect(P.moodEffects(P.mood(s.count)).scholarsAndCraftsmenLeave).toBe(true);
});
Given("the province {string} is held by the lord {string}, who is {string}", (s, name: string, l: string, loyalty: P.Loyalty) => {
  const p = prov(s, name);
  p.lord = l;
  lord(s, l).loyalty = loyalty;
  s.lordName = l;
});
When("the province {string} gets its third grievance", (s) => {
  s.effects = P.moodEffects(P.mood(3));
  if (s.effects.lordWavers) P.waver(lord(s, s.lordName));
});
Then("tax and recruits of {string} are halved", (s) => {
  expect(s.effects.taxFactor).toBe(0.5);
  expect(s.effects.recruitsFactor).toBe(0.5);
});
Then("traders avoid {string}", (s) => {
  expect(s.effects.tradersAvoid).toBe(true);
});
Given("the province {string} has fewer than 4 grievances", (s, name: string) => {
  prov(s, name);
  s.count = 2;
});
When(/^(a disloyal lord raises his retinue|a pretender lands|foreign gold arms the people)$/, (s, cause: string) => {
  P.raiseRebels(cur(s), cause.startsWith("a disloyal") ? "disloyal lord" : cause.startsWith("a pretender") ? "pretender" : "foreign gold");
  s.rebelsChanged = true;
});
Given("the province {string} has rebels", (s, name: string) => {
  const p = prov(s, name);
  if (s.rebelsChanged) return expect(p.rebels).not.toBeNull();
  P.raiseRebels(p, "grievances");
});
When(/^(the rebels are beaten|their demand is granted|the grievances are fixed|their leader is killed|their leader is bribed)$/, (s) => {
  P.rebelsMeltAway(cur(s));
});
Then("the province {string} has no rebels", (s, name: string) => {
  expect(prov(s, name).rebels).toBeNull();
});
Given("the province {string} has rebels in arms", (s, name: string) => {
  P.raiseRebels(prov(s, name), "grievances");
});
When("they fight a battle", (s) => {
  s.kind = P.REBEL_KIND;
});
Then("they fight as the {string} kind under the warfare battle rules", (s, k: string) => {
  expect(s.kind).toBe(k);
});
Given("the country {string} has the province {string} with riots and {string} with rebels", (s) => {
  s.revolt = [
    { mood: P.mood(3), rebels: false },
    { mood: P.mood(1), rebels: true },
    { mood: P.mood(2), rebels: false },
  ];
});
Then("the country {string} has {int} provinces in revolt", (s, _c: string, n: number) => {
  expect(P.inRevolt(s.revolt)).toBe(n);
});

// ---------------------------------------------------------------- health

const LINKS: Record<string, string> = { "a road carrying traders": "road", "a sea route": "sea route", "an army marching from Genoa": "army", "refugees fleeing Genoa": "refugees" };
Given(/^the province "([^"]+)" is joined to it by (.+)$/, (s, name: string, link: string) => {
  s.link = { to: name, kind: LINKS[link] };
});
When("plague spreads", (s) => {
  s.mayCatch = P.plagueCanSpread(s.link.kind);
});
Then("the province {string} may catch the plague", (s, name: string) => {
  expect(s.link.to).toBe(name);
  expect(s.mayCatch).toBe(true);
});
Given("plague reaches a region", (s) => {
  s.region = [
    { id: "countryside", townsfolk: 2000 },
    { id: "crowded town", townsfolk: 30000 },
  ];
});
Then("its crowded towns catch it before its countryside", (s) => {
  expect(P.plagueCatchOrder(s.region).map((r: { id: string }) => r.id)).toEqual(["crowded town", "countryside"]);
});
Given("the province {string} has a plague {string}", (s, name: string, step: P.PlagueStep) => {
  prov(s, name).plague = step;
});
When("the plague grows", (s) => {
  s.rng = new Rng(3);
  P.plagueSeason(cur(s), s.rng);
});
Then("it becomes an {string}", (s, step: string) => {
  expect(cur(s).plague).toBe(step);
});
Then("after a season or two it is {string}", (s, step: string) => {
  let seasons = 0;
  while (cur(s).plague === "outbreak") {
    P.plagueSeason(cur(s), s.rng);
    seasons++;
  }
  expect(seasons).toBeGreaterThanOrEqual(1);
  expect(seasons).toBeLessThanOrEqual(2);
  expect(cur(s).plague).toBe(step);
});
Then("then the province has no plague", (s) => {
  P.plagueSeason(cur(s), s.rng);
  expect(cur(s).plague).toBe("none");
});
When("the country {string} quarantines the province", (s) => {
  s.quarantine = P.quarantine(cur(s), true);
});
Then("trade with {string} stops", (s) => {
  expect(s.quarantine.tradeStops).toBe(true);
});
Then("the plague spreads more slowly", (s) => {
  expect(P.plagueCanSpread("road", true)).toBe(false);
  expect(P.plagueCanSpread("road", false)).toBe(true);
});
Then("townsfolk die before countryfolk", (s) => {
  const p = cur(s);
  addTile(p, "Fields", "farm");
  p.people.farmers = 12000;
  p.people.craftsmen = 1500;
  const dead = P.plagueKill(p, 2000);
  expect(dead).toEqual({ craftsmen: 1500, farmers: 500 });
});
Then("buildings that lose half their workers go fallow", (s) => {
  const p = cur(s);
  P.plagueKill(p, 6000);
  P.updateFallow(p);
  expect(p.tiles.find((t) => t.building === "farm")!.state).toBe("Fallow");
});
Given("the province {string} has 2 factories and a coal mine in era V", (s, name: string) => {
  const p = prov(s, name);
  p.town.push("factory", "factory");
  s.coal = 1;
  p.smoke = P.hasSmoke(p, 5, s.coal);
  s.smokeChecked = true;
});
Then("its townsfolk get sick", (s) => {
  expect(P.smokeEffects(cur(s).smoke).townsfolkSick).toBe(true);
});
Then("its tiles become worn", (s) => {
  expect(P.smokeEffects(cur(s).smoke).tilesWear).toBe(true);
});
Then("the smoke feeds the event tree's climate stats", (s) => {
  expect(P.smokeEffects(cur(s).smoke).feedsClimateStats).toBe(true);
});
When("the factories and the coal mine close", (s) => {
  const p = cur(s);
  p.town = p.town.filter((b) => b !== "factory");
  p.smoke = P.hasSmoke(p, 5, 0);
});
Then("the smoke goes", (s) => {
  expect(cur(s).smoke).toBe(false);
  expect(P.hasSmoke(cur(s), 4, 1)).toBe(false);
});

// ---------------------------------------------------------------- colonies

Given("the unowned province {string} has 8 tiles, of which 3 are worked by the local people", (s, name: string) => {
  const p = prov(s, name);
  p.owner = null;
  for (let i = 0; i < 8; i++) p.tiles[addTile(p, "Fields")]!.local = i < 3;
});
When("a colony is founded there", (s) => {
  s.taken = P.foundColony(cur(s), "England");
});
Then("the colony takes the {int} free tiles", (s, n: number) => {
  expect(s.taken).toHaveLength(n);
  for (const i of s.taken) expect(cur(s).tiles[i]!.local).toBe(false);
});
Then("the local people keep their {int} tiles", (s, n: number) => {
  expect(cur(s).tiles.filter((t) => t.local)).toHaveLength(n);
});
Given("the province {string} has the settlement {string}", (s, name: string, st: P.Settlement) => {
  const p = prov(s, name);
  p.settlement = st;
  p.owner = "England";
  p.settlers = 1000;
});
When(/^(the local people drive it out|disease wipes it out|the country abandons it)$/, (s) => {
  P.loseSettlement(cur(s));
});
When("another power takes it", (s) => {
  P.loseSettlement(cur(s), "Spain");
});
Then("the province {string} loses its settlement", (s, name: string) => {
  expect(prov(s, name).settlement).toBe("none");
  expect(prov(s, name).owner).not.toBe("England");
});
Given("the province {string} has a trading post of {string}", (s, name: string, c: string) => {
  const p = prov(s, name);
  p.owner = null;
  p.tiles.push(P.tile("Fields"), P.tile("Shore"));
  P.foundTradingPost(p);
  s.postOwner = c;
});
Then("the trading post works as a market drawing traders", (s) => {
  expect(P.tradingPostWorks(cur(s)).market).toBe(true);
});
Then("it takes no tile", (s) => {
  expect(P.tradingPostWorks(cur(s)).tilesTaken).toBe(0);
  expect(cur(s).tiles.every((t) => !t.building)).toBe(true);
});
Given("the country {string} has homeless people in {string}", (s, _c: string, name: string) => {
  prov(s, name).people.homeless = 5000;
  const m = prov(s, "Madeira");
  m.owner = null;
  for (let i = 0; i < 4; i++) addTile(m, "Fields");
  P.foundColony(m, "Portugal");
  s.cur = s.provinces[name];
});
When("it sends 3,000 of them as settlers to the colony {string}", (s, name: string) => {
  s.sent = P.sendSettlers(cur(s), prov(s, name), 3000);
});
Then("they live on the free tiles of {string} and the buildings on them", (s, name: string) => {
  const m = prov(s, name);
  expect(s.sent).toBe(3000);
  expect(m.settlers).toBeLessThanOrEqual(P.colonyRoom(m));
  expect(P.colonyCanGrow(m)).toBe(true);
});
When("the free tiles of {string} are full", (s, name: string) => {
  const m = prov(s, name);
  m.settlers = P.colonyRoom(m);
});
Then("the colony stops growing", (s) => {
  expect(P.colonyCanGrow(cur(s))).toBe(false);
});
Given("the colony {string} has 2,000 settlers", (s, name: string) => {
  prov(s, name).settlers = 2000;
});
When(/^(fever land kills them|war with the local people|settlers leave)$/, (s) => {
  P.loseSettlers(cur(s), 200);
});
Then("the colony {string} has fewer settlers", (s, name: string) => {
  expect(prov(s, name).settlers).toBeLessThan(2000);
});

// ---------------------------------------------------------------- country card, event map, start

Given("the lord {string} holds {string} with 900 recruits and 2 officials of his own", (s, l: string, name: string) => {
  const p = prov(s, name);
  p.lord = l;
  p.recruits = 900;
  p.official = official("steward", 3, l);
  P.refreshGovernance(p);
  const royal = prov(s, "Troyes");
  royal.recruits = 1100;
  royal.official = official("judge", 3);
  P.refreshGovernance(royal);
  s.officials = [p.official, official("warden", 1, l), royal.official];
});
Then("the country {string} counts none of those recruits", (s) => {
  expect(P.countryRecruits(Object.values(s.provinces))).toBe(1100);
});
Then("none of those officials", (s) => {
  expect(P.countryOfficials(s.officials)).toBe(1);
});
Given("an event reads the province stat {string}", (s, stat: string) => {
  s.eventStat = stat;
});
Then(/^it reads (.+)$/, (s, what: string) => {
  expect(P.eventStatMeaning(s.eventStat)).toBe(what);
});
Given("the province {string} starts with wealth 7", (s, name: string) => {
  prov(s, name);
  s.inputs = { population: 72, wealth: 7, terrain: "farmland", coastal: false };
});
When("its starting buildings are placed", (s) => {
  s.placedStart = P.placeStartingBuildings(cur(s), s.inputs, ["market", "loom house"]);
});
Then("wealth is no longer a live stat of {string}", (s) => {
  expect(s.placedStart.live).not.toContain("wealth");
  expect(s.placedStart.province.town).toEqual(["market", "loom house"]);
});

// ---------------------------------------------------------------- decided rules (spec §13, PROV-293 to PROV-301)

// births (D-PROV-8)
Given("the province {string} has 72,000 farmers and no birth or death modifiers", (s, name: string) => {
  prov(s, name).people.farmers = 72000;
});
When("a year of monthly births and deaths passes", (s) => {
  const f = cur(s).people.farmers;
  let born = 0;
  let died = 0;
  for (let m = 0; m < 12; m++) {
    born += (f * P.birthRate("farmers")) / 12;
    died += (f * P.deathRate("farmers")) / 12;
  }
  s.born = Math.round(born);
  s.died = Math.round(died);
});
Then("2,880 are born and 2,160 die", (s) => {
  expect(s.born).toBe(2880);
  expect(s.died).toBe(2160);
});
Then("the province {string} grows by 720 people", (s) => {
  expect(s.born - s.died).toBe(720);
});
const BIRTH_COND: Record<string, string> = {
  "has more than 6 months of food in store": "food over 6 months",
  "has had 10 years of peace": "10 years of peace",
  "has less than 3 months of food in store": "food under 3 months",
  'is short of food with the "Hungry" grievance': "Hungry",
  "has plague": "plague",
};
Given(/^the province "([^"]+)" (has more than 6 months of food in store|has had 10 years of peace|has less than 3 months of food in store|is short of food with the "Hungry" grievance|has plague)$/, (s, name: string, c: string) => {
  prov(s, name);
  (s.birthConds ??= []).push(BIRTH_COND[c]!);
});
Then("the yearly birth rate of its farmers is {}", (s, rate: string) => {
  const conds: string[] = [...(s.birthConds ?? [])];
  if (s.cond?.war) conds.push("war");
  expect(P.birthRateWith(P.birthRate("farmers"), conds)).toBeCloseTo(pct(rate));
});

// buildings lost (D-PROV-3)
Given(/^the province "([^"]+)" has a (farm|forge|market)$/, (s, name: string, b: string) => {
  prov(s, name);
  s.lossBuilding = b;
});
When(/^(its tile burns|the town is sacked|the player demolishes it|a peace treaty demolishes it|its pasture tile is ploughed to fields|it stays neglected for 10 years|its upkeep goes unpaid for a month)$/, (s, cause: string) => {
  s.lossResult = P.buildingAfter(cause);
});
Then(/^the (farm|market|castle|ranch) is lost$/, (s) => {
  expect(s.lossResult).toBe("lost");
});
Then("the forge falls one step", (s) => {
  expect(s.lossResult).toBe("one step down");
});
Then("the forge is neglected and works at half", (s) => {
  expect(s.lossResult).toBe("neglected");
  expect(P.neglectedOutput()).toBe(0.5);
});

// colonies (D-PROV-7)
Given(/^the province "([^"]+)" is (owned by no country|owned by the country "[^"]+"|owned by a tribal country|lived in by a stateless people)$/, (s, name: string, how: string) => {
  prov(s, name);
  s.landOwner = how === "owned by no country" ? "none" : how === "owned by a tribal country" ? "tribal country" : how.startsWith("lived") ? "stateless people" : "country";
});
When("the country {string} tries to found a colony there", (s) => {
  s.founding = P.canColonise(s.landOwner) ? "allowed" : "refused";
});
Then(/^the founding is (allowed|refused)$/, (s, r: string) => {
  expect(s.founding).toBe(r);
});
When("a colonial governor founds a colony there", (s) => {
  const p = cur(s);
  p.owner = null;
  P.foundColony(p, "Portugal");
});
When("the country founds a post with an envoy and gold", (s) => {
  P.foundTradingPost(cur(s));
});
Then("its colony stage is {string}", (s, stage: string) => {
  expect(P.settlementStage(cur(s).settlement)).toBe(stage);
});

// aggregation and events (D-PROV-1, D-PROV-16)
Given("the country {string} holds its provinces", (s) => {
  s.country = "France";
});
Then(/^the country stat "([^"]+)" is the sum of (.+)$/, (s, stat: string, sum: string) => {
  expect(P.countrySumOf(stat)).toBe(sum);
});
Given("the province {string} is hit by an event effect {string}", (s, name: string, effect: string) => {
  prov(s, name);
  s.eventResult = P.eventEffectResult(effect);
});

// harvest steps (D-PROV-14)
Given(/^the province "([^"]+)" has (\d+) harvest steps$/, (s, name: string, n: string) => {
  prov(s, name);
  s.harvestSteps = Number(n);
});
When(/^the province "([^"]+)" rolls a "(poor|bumper)" harvest$/, (s, name: string, roll: P.HarvestRoll) => {
  const p = prov(s, name);
  const steps = s.harvestSteps ?? known(s).filter((k) => ["F1", "F12", "F14", "F15"].includes(k.split(" ")[0]!)).length;
  s.counts = P.harvestWithSteps(P.effectiveRoll(p, roll), steps);
});

// grievances and rebels (D-PROV-2, D-PROV-18)
Then(/^the province "([^"]+)" is (calm|grumbling|rioting|plotting)$/, (s, _n: string, mood: string) => {
  expect(P.moodOf(s.count).mood).toBe(mood);
});
Then("its monthly chance to rise is {}", (s, c: string) => {
  expect(P.riseChance(s.count)).toBeCloseTo(pct(c));
});
Given(/^the province "([^"]+)" has (\d+) grievances, of which "([^"]+)" is the biggest$/, (s, name: string, n: string, g: string) => {
  prov(s, name);
  s.count = Number(n);
  s.biggest = g;
});
Given(/^the province "([^"]+)" has ([\d,]+) recruits here$/, (s, name: string, n: string) => {
  prov(s, name);
  s.recruitPool = num(n);
});
When(/^it rises with ([\d,]+) men wanted$/, (s, n: string) => {
  expect(P.riseChance(s.count)).toBeGreaterThan(0);
  s.risen = P.risingMen(s.recruitPool, num(n));
  s.rebelLeader = `the leader of ${cur(s).id}`;
});
Then(/^([\d,]+) of its recruits take up arms$/, (s, n: string) => {
  expect(s.risen).toBe(num(n));
});
Then("they follow a named leader", (s) => {
  expect(s.rebelLeader).toBeTruthy();
});
Then("they demand the tax rate back down", (s) => {
  expect(s.biggest).toBe("Heavy taxes");
});
Then("a spark can start a rising there", (s) => {
  expect(P.sparkCanStart(s.count)).toBe(true);
  expect(P.riseChance(s.count)).toBe(0);
});
Given("the province {string} has a {string} official at full effect", (s, name: string, type: string) => {
  prov(s, name);
  s.judge = type === "judge";
});
When("it has 4 grievances", (s) => {
  s.count = 4;
});
Then("it is grumbling, not rioting", (s) => {
  const m = P.moodOf(s.count, s.judge);
  expect(m.mood).toBe("grumbling");
  expect(m.rioting).toBe(false);
});
Then("it is rioting and plotting", (s) => {
  const m = P.moodOf(s.count, s.judge);
  expect(m.rioting && m.plotting).toBe(true);
  expect(P.moodOf(3, s.judge).rioting).toBe(false);
});
Then('"Broken charter" fades twice as fast there', () => {
  expect(P.officialEffect("judge", 99).broken_charter_fade).toBe(2);
});

// homeless (D-PROV-1)
Then(/^(\d+) % less of its tax reaches you$/, (s, n: string) => {
  expect(P.homelessCut(P.homelessShare(cur(s)))).toBeCloseTo(Number(n) / 100);
});
Then(/^its trade ratio gain is (\d+) % lower$/, (s, n: string) => {
  expect(P.homelessCut(P.homelessShare(cur(s)))).toBeCloseTo(Number(n) / 100);
});

// cadence (D-PROV-4)
Given("the game advances one month", (s) => {
  s.cadence = true;
});
Then("births, deaths and overflow update", (s) => {
  expect(s.cadence).toBe(true);
});
Then("food updates each season", () => {
  expect(cfg.food.harvest_order.length).toBe(5);
});
Then("plague updates on days 7, 14, 21 and 28 while an outbreak runs", () => {
  expect(P.plagueWeekDays()).toEqual([7, 14, 21, 28]);
});

// recruits, drift, refugees (D-PROV-17)
Given("the province {string} has 40,000 farmers, 5,000 craftsmen, 800 clergy, 100 scholars and 2,000 homeless", (s, name: string) => {
  const p = prov(s, name);
  Object.assign(p.people, { farmers: 40000, craftsmen: 5000, clergy: 800, scholars: 100, homeless: 2000 });
});
Then("recruits here grow by 400 farmers, 50 craftsmen and 20 homeless", (s) => {
  const r = P.yearlyRecruits(cur(s).people);
  expect([r.farmers, r.craftsmen, r.homeless]).toEqual([400, 50, 20]);
});
Then("no clergy or scholars", (s) => {
  const r = P.yearlyRecruits(cur(s).people);
  expect(r.clergy).toBeUndefined();
  expect(r.scholars).toBeUndefined();
});
Then("40 homeless drift to free slots elsewhere", (s) => {
  expect(P.homelessDriftPerYear(cur(s).people.homeless)).toBe(40);
});
Then("refugees who have stayed 2 years settle", () => {
  expect(P.refugeesSettle(2)).toBe(true);
  expect(P.refugeesSettle(1)).toBe(false);
});

// tax (D-PROV-10, D-PROV-22)
Given(/^the province "([^"]+)" owes ([\d.]+) gold this year at "([^"]+)"$/, (s, name: string, n: string) => {
  prov(s, name);
  s.owedYear = Number(n);
  s.travelDays = 0;
  s.collector = 0;
});
Given("it is a royal province with an official, 3 days from Paris", (s) => {
  s.travelDays = 3;
  s.collector = 1;
});
Given(/^it is (\d+) days from the capital with a tax collector at (no|full) effect$/, (s, d: string, c: string) => {
  s.travelDays = Number(d);
  s.collector = c === "full" ? 1 : 0;
});
When("the tax is collected", (s) => {
  s.reached = P.taxReaching(s.owedYear, s.travelDays, s.collector);
});
Then(/^([\d.]+) gold reach the country "([^"]+)"$/, (s, n: string) => {
  expect(s.reached).toBeCloseTo(Number(n));
});
When("a month of tax is paid", (s) => {
  s.monthPaid = P.monthlyTax(s.owedYear);
});
Then("1 gold is paid that month", (s) => {
  expect(s.monthPaid).toBe(1);
});
Given("it is 12 days from the capital", (s) => {
  s.reach.days = 12;
});
Then("13 gold reaches the treasury", (s) => {
  expect(P.reachesTreasury(20, s.reach)).toBeCloseTo(13);
});

// tiles and towns (D-PROV-11)
Given("a map of 101 provinces ranked by land area", (s) => {
  s.mapCount = 101;
});
When(/^the province ranked (\d+) lays out its tiles$/, (s, r: string) => {
  s.tileCount = P.tilesByAreaRank(Number(r), s.mapCount);
});
Then(/^it has (\d+) tiles$/, (s, n: string) => {
  expect(s.tileCount).toBe(Number(n));
});
Given(/^a town with ([\d,]+) townsfolk$/, (s, n: string) => {
  s.townsfolk = num(n);
});
Then(/^the town is a "([^"]+)" covering (\d+) town tiles$/, (s, size: string, t: string) => {
  expect(P.townSizeFor(s.townsfolk)).toBe(size);
  expect(P.townTilesFor(s.townsfolk)).toBe(Number(t));
});

// officials and lords (D-PROV-13, D-PROV-23, D-PROV-24)
Given(/^an official of the "([^"]+)" tongue runs a province of the "([^"]+)" tongue$/, (s, o: string, p: string) => {
  s.kin = o === p ? "own" : p === "Picard" ? "cousin" : "stranger";
});
Then(/^he learns the province in (\d+) years$/, (s, n: string) => {
  expect(P.officialLearnYears(s.kin)).toBe(Number(n));
});
Given(/^the country "France" knows (G\d+(?: and G\d+)?)$/, (s, list: string) => {
  s.officialInventions = list.split(" and ");
});
Then(/^one official runs (\d+) provinces$/, (s, n: string) => {
  expect(P.provincesPerOfficial(s.officialInventions)).toBe(Number(n));
});
Given("the lord {string} holds {string} without an official of his own", (s, l: string, name: string) => {
  const p = prov(s, name);
  p.lord = l;
  p.official = null;
  P.refreshGovernance(p);
  s.lordName = l;
});
Given("{string} would give 10 gold and 600 recruits", (s) => {
  s.lordGives = P.lordUngovernedGives(10, 600);
});
Then("the province {string} is ungoverned", (s, name: string) => {
  P.updateGrievances(prov(s, name));
  expect(prov(s, name).official).toBeNull();
});
Then("the lord {string} gets 5 gold and 300 recruits from it", (s) => {
  expect(s.lordGives).toEqual({ tax: 5, recruits: 300 });
});

// sickness (D-PROV-15)
Given(/^an army of 10,000 men in land with (Low|Medium|High|Heat|Cold|fever land) sickness$/, (s, k: string) => {
  s.sickness = k;
});
When("a month passes", (s) => {
  s.sickLost = s.sickness === "fever land" ? P.sicknessLoss(10000, "Low", true) : P.sicknessLoss(10000, s.sickness);
});
Then(/^it loses (\d+) men to sickness$/, (s, n: string) => {
  expect(s.sickLost).toBe(Number(n));
});

// how much reaches you (PROV-163)
Given(/^the province "([^"]+)" owes 20 gold$/, (s, name: string) => {
  prov(s, name);
  s.reach = { days: 3 };
});
Given("it is royal with no official", (s) => {
  s.reach.official = false;
});
Given("a lord governs it", (s) => {
  s.reach.lord = true;
});
Given('it is occupied by the country "England"', (s) => {
  s.reach.occupied = true;
});
Given("an enemy army sits on the road to Paris", (s) => {
  s.reach.blockedDays = 5;
});
Then(/^(at most 10 gold|nothing|less than with a free road) reaches the treasury$/, (s, what: string) => {
  const got = P.reachesTreasury(20, s.reach);
  if (what === "nothing") expect(got).toBe(0);
  else if (what === "at most 10 gold") expect(got).toBeLessThanOrEqual(10);
  else expect(got).toBeLessThan(P.reachesTreasury(20, { ...s.reach, blockedDays: 0 }));
});
