import { expect } from "vitest";
import { loadDefaultRuleset, type ProvinceDef } from "@ph/rules";
import { Rng } from "@ph/engine";
import * as E from "@ph/engine/domain/exploration";
import { countedOfficials, form, formIdFromName, type FormId, type Official } from "@ph/engine/domain/government";
import { mapGraph, isWater, type MapGraph } from "@ph/engine/domain/world-map";
import catalogue from "../../rules/data/domain/scenario-setup-catalogue.json" with { type: "json" };
import mapData from "../../rules/data/domain/scenario-setup-map.json" with { type: "json" };
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("exploration");

// ---------------------------------------------------------------- helpers

let world: MapGraph | undefined;
/** The real 1444 map. */
const realMap = (): MapGraph => (world ??= mapGraph(loadDefaultRuleset()));

/** A small map: places with neighbours made symmetric; land unless the id starts with "z". */
function smallMap(places: { id: string; owner?: string | null; neighbors?: string[]; population?: number; terrain?: ProvinceDef["terrain"]; coastal?: boolean }[]): MapGraph {
  const defs = new Map<string, ProvinceDef>();
  for (const p of places) {
    const water = p.id.startsWith("z");
    defs.set(p.id, {
      id: p.id,
      name: p.id,
      owner: p.owner ?? null,
      terrain: p.terrain ?? (water ? "ocean" : "grassland"),
      population: p.population ?? (water ? 0 : 10),
      wealth: water ? 0 : 1,
      neighbors: [],
      ...(water ? {} : { coastal: p.coastal ?? true }),
    });
  }
  for (const p of places)
    for (const n of p.neighbors ?? []) {
      const a = defs.get(p.id)!;
      const b = defs.get(n)!;
      if (!a.neighbors.includes(n)) a.neighbors.push(n);
      if (!b.neighbors.includes(p.id)) b.neighbors.push(p.id);
    }
  return mapGraph({ provinces: [...defs.values()] });
}

/** A line of n+1 zones z0 … zn, a port province "Port" on z0 and "Target" on zn. */
function lineMap(n: number, extra: { id: string; neighbors: string[]; owner?: string | null }[] = []): MapGraph {
  const places: { id: string; neighbors?: string[]; owner?: string | null }[] = [];
  for (let i = 0; i <= n; i++) places.push({ id: `z${i}`, neighbors: i ? [`z${i - 1}`] : [] });
  places.push({ id: "Port", neighbors: ["z0"], owner: "home" }, { id: "Target", neighbors: [`z${n}`] }, ...extra);
  return smallMap(places);
}

const chartAll = (g: MapGraph): E.ChartedMap => {
  const m = E.newChartedMap(E.placeIndex(g));
  for (const p of g.places) E.chart(m, p.id);
  return m;
};

const record = (id: string): string[] => {
  const row = (catalogue.records as Record<string, string>)[id];
  if (!row) throw new Error(`no catalogue record ${id}`);
  return row.split("|");
};
const expansionModes = (id: string): string[] => record(id)[6]!.split(",").filter(Boolean);

const portProvince = (name: string): string => {
  const row = (mapData.ports as [string, string, string | null, string | null, number][]).find((p) => p[0] === name);
  if (!row?.[2]) throw new Error(`no 1444 port ${name}`);
  return row[2];
};
const portTier = (name: string): string | undefined => (mapData.ports as [string, string][]).find((p) => p[0] === name)?.[1];

const inventions = (list: string): Set<string> => new Set(list.split(/, | and /).map((x) => x.trim()));

const countryId = (name: string): string => name.toLowerCase().replace(/ /g, "_");

const knows = (s: Scenario): Set<string> => (s.knows ??= new Set<string>());

function office(s: Scenario, country = "castile"): E.ColonialOffice {
  return (s.office ??= E.newOffice(country));
}

function hire(s: Scenario, id = "governor"): E.ColonialGovernor {
  const r = E.hireGovernor(office(s), knows(s), "Seville", id);
  if (!r.ok) throw new Error(`hire refused: ${r.reason}`);
  return r.governor;
}

/** A colony being founded by Castile with its governor ashore. */
function colonyOf(s: Scenario, progress: number, food: number, province = "the colony"): E.Colony {
  knows(s).add("S5");
  hire(s);
  E.embarkGovernor(office(s), "governor", { id: "caravel", at: "Seville" });
  const { colony } = E.goAshore(office(s), "governor", province, s.level ?? "Wary");
  colony.progress = progress;
  colony.food = food;
  s.colony = colony;
  s.events = [];
  return colony;
}

function siteFor(s: Scenario): E.ColonySite {
  return (s.site ??= { province: "Small island", coastal: true, owner: null, freeTiles: 2, zonesToNearest: 17, beingFoundedBy: null });
}

function chartFor(s: Scenario): E.ChartedMap {
  if (s.chart) return s.chart;
  const g = smallMap([{ id: s.site?.province ?? "Small island" }, { id: "Inland" }, { id: "Hispaniola" }]);
  return (s.chart = chartAll(g));
}

// ---------------------------------------------------------------- unlocking exploration

Given("the date is {int}", (s, year: number) => {
  s.year = year;
});

Given("the age {string} has begun in the region of the country {string}", (s, age: string, country: string) => {
  expect(age).toBe(E.explorationConfig.unlock_age);
  const region = E.polityRegion(countryId(country));
  expect(region).not.toBeNull();
  s.region = region;
  s.gate = E.gateAtStart(s.year ?? 1444);
  expect(s.gate.begunIn.has(region)).toBe(true);
});

Given("the age {string} has begun in the region {string}", (s, age: string, region: string) => {
  s.gate ??= E.newAgeGate(age);
  E.ageBegins(s.gate, [region]);
  s.region ??= region;
});

Given("the age {string} began in the region {string} in {int}", (s, age: string, region: string, year: number) => {
  s.gate = E.gateAtStart(year);
  expect(s.gate.age).toBe(age);
  expect(s.gate.begunIn.has(region)).toBe(true);
});

Given("the age {string} ended in {int}", (s, _age: string, _year: number) => {
  E.ageEnds(s.gate);
});

Given(/^the country "([^"]+)" (knows|does not know) (S\d+) "([^"]+)"$/, (s, country: string, k: string, inv: string) => {
  s.country = country;
  if (k === "knows") knows(s).add(inv);
  else knows(s).delete(inv);
});

Given(/^the country "([^"]+)" knows ((?:[A-Z]\d+)(?:(?:, | and )[A-Z]\d+)*)$/, (s, country: string, list: string) => {
  s.country = country;
  for (const i of inventions(list)) knows(s).add(i);
});

Given(/^the country "([^"]+)" knows ((?:[A-Z]\d+)(?:(?:, | and )[A-Z]\d+)*) but not (S\d+)$/, (s, country: string, list: string, not: string) => {
  s.country = country;
  for (const i of inventions(list)) knows(s).add(i);
  knows(s).delete(not);
  s.region = E.polityRegion(countryId(country));
});

When("the country {string} learns S4 {string}", (s, _country: string, _name: string) => {
  knows(s).add("S4");
  s.unlockChecked = true;
});

Given("the country {string} learns S4 {string} in {int}", (s, country: string, _name: string, _year: number) => {
  knows(s).add("S4");
  s.region = E.polityRegion(countryId(country));
});

When("the game checks the exploration unlock for the country {string}", (s, country: string) => {
  s.region ??= E.polityRegion(countryId(country));
  s.unlockChecked = true;
});

When("the game checks its exploration unlock", (s) => {
  s.unlockChecked = true;
});

Then(/^the country "([^"]+)" (has|lacks) the exploration unlock$/, (s, country: string, has: string) => {
  if (s.unlockChecked) {
    expect(E.hasExplorationUnlock({ knows: knows(s), region: s.region }, s.gate)).toBe(has === "has");
    return;
  }
  // As a given: set up a country that has, or lacks, the unlock.
  s.region = E.polityRegion(countryId(country)) ?? "europe";
  s.gate = E.gateAtStart(1444);
  if (has === "has") knows(s).add("S4");
  else s.gate = E.newAgeGate();
  expect(E.hasExplorationUnlock({ knows: knows(s), region: s.region }, s.gate)).toBe(has === "has");
});

Then("it has the exploration unlock", (s) => {
  expect(E.hasExplorationUnlock({ knows: knows(s), region: s.region }, s.gate)).toBe(true);
});

Then("its exploration ships are voyaging canoes", (s) => {
  expect(E.explorationShipsKnown(knows(s))).toEqual(["voyaging_canoe"]);
});

Given(/^a country(?: of the region "([^"]+)")? knows (S\d+) "([^"]+)"(?: (?:and|but) not (.+))?$/, (s, region: string | undefined, inv: string, _name: string, not: string | undefined) => {
  if (region) s.region = region;
  knows(s).add(inv);
  for (const n of (not ?? "").split(/ or | and /).filter(Boolean)) {
    knows(s).delete(n.trim());
    expect(knows(s).has(n.trim())).toBe(false);
  }
});

When("the country {string} orders a {string}", (s, country: string, ship: string) => {
  s.order = E.mayBuyShip({ knows: knows(s), region: s.region ?? E.polityRegion(countryId(country)) ?? "europe" }, s.gate, ship);
});

Then("the order is refused", (s) => {
  expect(s.order.ok).toBe(false);
});

When("its caravel plans a voyage into an ocean zone {int} zones from a coast", (s, zones: number) => {
  s.sail = E.maySail(knows(s), "caravel", { kind: "ocean", zonesFromCoast: zones });
});

When("its voyaging canoe plans a voyage across open ocean", (s) => {
  s.sail = E.maySail(knows(s), "voyaging_canoe", { kind: "ocean", zonesFromCoast: 30 });
});

Then(/^the voyage is (allowed|refused)$/, (s, result: string) => {
  expect(s.sail).toBe(result === "allowed");
});

Given("it holds a shore tile with seafolk and no harbour", (s) => {
  s.shore = { seafolk: true, harbour: false };
});

When("it orders a voyaging canoe there", (s) => {
  expect(E.mayBuildVoyagingCanoe(knows(s), s.shore)).toBe(true);
  s.canoe = E.voyagingCanoe();
  expect(s.canoe.needsHarbour).toBe(false);
});

Then("the canoe needs {int} sailors, {int} gold, {int} timber and {int} month", (s, crew: number, gold: number, timber: number, months: number) => {
  expect([s.canoe.crew, s.canoe.gold, s.canoe.timber, s.canoe.months]).toEqual([crew, gold, timber, months]);
});

Then("the canoe carries {int} supply and {int} rations of colony stores", (s, supply: number, stores: number) => {
  expect([s.canoe.supply, s.canoe.stores]).toEqual([supply, stores]);
});

Given("its government form is {string} with colonial range {int}", (s, name: string, range: number) => {
  s.form = formIdFromName(name);
  expect(form(s.form).colonialRange).toBe(range);
});

When("the game counts its colonial governors and range", (s) => {
  s.slots = E.governorSlots(knows(s));
  s.range = E.colonialRange(s.form, knows(s));
});

Then("it has {int} colonial governor slot", (s, n: number) => {
  expect(s.slots).toBe(n);
});

Then("its colonial range is {int} zones", (s, n: number) => {
  expect(s.range).toBe(n);
});

// ---------------------------------------------------------------- the charted map

When("the campaign starts", (s) => {
  s.g = realMap();
  s.chart = E.startChartedMap(s.g, "portugal");
});

Then("the country {string} has charted every province within {int} steps of its lands", (s, country: string, steps: number) => {
  const g: MapGraph = s.g;
  const dist = E.landSteps(g, countryId(country), steps + 1);
  expect([...dist.values()].filter((d) => d === steps).length).toBeGreaterThan(0);
  for (const [id, d] of dist) expect(E.isCharted(s.chart, id)).toBe(d <= steps);
  s.within = [...dist].filter(([, d]) => d <= steps).map(([id]) => id);
});

Then("the country {string} has charted every sea zone touching those provinces", (s, _country: string) => {
  const g: MapGraph = s.g;
  const touching = new Set<string>();
  for (const id of s.within as string[]) for (const n of g.byId.get(id)!.neighbors) if (isWater(g.byId.get(n)!)) touching.add(n);
  expect(touching.size).toBeGreaterThan(0);
  for (const z of touching) expect(E.isCharted(s.chart, z)).toBe(true);
  const chartedWater = g.places.filter((p) => isWater(p) && E.isCharted(s.chart, p.id)).length;
  expect(chartedWater).toBe(touching.size);
});

Then("its charted map is one bit per province and per sea zone", (s) => {
  expect(s.chart.bits.length).toBe(Math.ceil(s.g.places.length / 8));
  expect(E.chartedCount(s.chart)).toBe(s.within.length + new Set((s.within as string[]).flatMap((id) => s.g.byId.get(id).neighbors.filter((n: string) => isWater(s.g.byId.get(n))))).size);
});

Given("a Portuguese caravel enters an uncharted ocean zone", (s) => {
  s.g = realMap();
  s.chart = E.startChartedMap(s.g, "portugal");
  const g: MapGraph = s.g;
  s.zone = g.places.find((p) => isWater(p) && !E.isCharted(s.chart, p.id) && p.neighbors.some((n) => !isWater(g.byId.get(n)!)))!.id;
  expect(E.isCharted(s.chart, s.zone)).toBe(false);
});

When("the zone is entered", (s) => {
  E.chartOnEntering(s.chart, s.g, s.zone);
});

Then(/^the country "[^"]+" has charted that (?:province|zone)$/, (s) => {
  expect(E.isCharted(s.chart, s.target ?? s.zone)).toBe(true);
});

Then("the country {string} has charted every zone and coastal province next to it", (s, _c: string) => {
  const g: MapGraph = s.g;
  const next = g.byId.get(s.zone)!.neighbors;
  expect(next.some((n) => !isWater(g.byId.get(n)!))).toBe(true);
  for (const n of next) expect(E.isCharted(s.chart, n)).toBe(true);
});

Given(/^a Portuguese (army|fleet of cogs) stands next to an uncharted (province|zone)$/, (s, mover: string, place: string) => {
  const g = (s.g = realMap());
  s.chart = E.startChartedMap(g, "portugal");
  const wantWater = place === "zone";
  const at = g.places.find((p) => isWater(p) === (mover !== "army") && E.isCharted(s.chart, p.id) && p.neighbors.some((n) => isWater(g.byId.get(n)!) === wantWater && !E.isCharted(s.chart, n)))!;
  s.at = at.id;
  s.target = at.neighbors.find((n) => isWater(g.byId.get(n)!) === wantWater && !E.isCharted(s.chart, n));
});

When("the day loop runs", (s) => {
  E.chartAround(s.chart, s.g, s.at);
});

Given("the country {string} has charted the coast of {string}", (s, _country: string, place: string) => {
  const g = (s.g = realMap());
  s.chart = E.startChartedMap(g, "portugal");
  s.place = portProvince(place);
  for (const z of E.coastalZones(g, s.place)) E.chartOnEntering(s.chart, g, z);
  expect(E.isCharted(s.chart, s.place)).toBe(true);
});

When("the country {string} loses every ship and every province near {string}", (s) => {
  s.ships = [];
  s.provinces = [];
});

Then("the country {string} still has charted the coast of {string}", (s) => {
  expect(E.isCharted(s.chart, s.place)).toBe(true);
  expect(E.underParchment(s.chart, s.place)).toBe(false);
});

Given("the country {string} has not charted the province {string}", (s, _country: string, province: string) => {
  const g = smallMap([{ id: "Castile", owner: "castile", neighbors: ["z0"] }, { id: province, neighbors: ["z1"] }, { id: "z0", neighbors: ["z1"] }, { id: "z1" }]);
  s.g = g;
  s.chart = E.startChartedMap(g, "castile", E.placeIndex(g), 0);
  expect(E.isCharted(s.chart, province)).toBe(false);
});

When("the player of the country {string} looks at the world map", (s) => {
  s.parchment = s.g.places.filter((p: ProvinceDef) => E.underParchment(s.chart, p.id)).map((p: ProvinceDef) => p.id);
});

Then("the province {string} lies under the parchment", (s, province: string) => {
  expect(s.parchment).toContain(province);
  expect(s.parchment).not.toContain("Castile");
});

Given(/^a Portuguese fleet of (caravels|carracks|galleons|caravels and one carrack)$/, (s, ships: string) => {
  s.ships = { caravels: ["caravel", "caravel"], carracks: ["carrack", "carrack"], galleons: ["galleon", "galleon"], "caravels and one carrack": ["caravel", "caravel", "carrack"] }[ships];
});

When("it plans a route through an uncharted zone", (s) => {
  const g = smallMap([
    { id: "za", neighbors: ["zu", "zb1"] },
    { id: "zu", neighbors: ["zc"] },
    { id: "zb1", neighbors: ["zb2"] },
    { id: "zb2", neighbors: ["zc"] },
    { id: "zc" },
  ]);
  const m = E.newChartedMap(E.placeIndex(g));
  for (const id of ["za", "zb1", "zb2", "zc"]) E.chart(m, id);
  expect(E.underParchment(m, "zu")).toBe(true);
  s.route = E.planFleetRoute(g, m, s.ships, "za", "zc");
});

Then(/^the route (enters the uncharted zone|goes round through charted zones only)$/, (s, result: string) => {
  if (result === "enters the uncharted zone") expect(s.route).toEqual(["za", "zu", "zc"]);
  else expect(s.route).toEqual(["za", "zb1", "zb2", "zc"]);
});

// ---------------------------------------------------------------- colonial governors

When("the country {string} tries to hire a colonial governor", (s) => {
  s.hire = E.hireGovernor(office(s), knows(s), "Seville", `governor ${office(s).governors.length + 1}`);
});

Then(/^the hire is (allowed|refused)$/, (s, result: string) => {
  expect(s.hire.ok).toBe(result === "allowed");
});

When("the game counts its colonial governor slots", (s) => {
  s.slotsCounted = true;
});

Then("the country {string} has {int} colonial governor slots", (s, _c: string, n: number) => {
  if (s.slotsCounted) {
    expect(E.governorSlots(knows(s))).toBe(n);
    return;
  }
  for (const i of ["S5", "T8", "T9"]) if (E.governorSlots(knows(s)) < n) knows(s).add(i);
  expect(E.governorSlots(knows(s))).toBe(n);
});

When("the country {string} loses provinces in a war", (s) => {
  s.provincesLost = 5;
});

Then("the country {string} still has {int} colonial governor slots", (s, _c: string, n: number) => {
  expect(E.governorSlots(knows(s))).toBe(n);
});

Given("the country {string} has {int} colonial governor slots and {int} colonial governors", (s, _c: string, slots: number, governors: number) => {
  knows(s).add("S5");
  expect(E.governorSlots(knows(s))).toBe(slots);
  for (let i = 0; i < governors; i++) hire(s, `governor ${i + 1}`);
});

Given("the country {string} has a colonial governor {string} holding slot {int} of {int}", (s, _c: string, name: string, slot: number, of: number) => {
  knows(s).add("S5");
  expect(E.governorSlots(knows(s))).toBe(of);
  hire(s, name);
  expect(E.slotsUsed(office(s))).toBe(slot);
  s.governor = name;
});

When(/^(his colony is founded|his colony is lost|he dies of old age|the country "Castile" dismisses him)$/, (s, event: string) => {
  const o = office(s);
  if (event.startsWith("his colony")) {
    E.embarkGovernor(o, s.governor, { id: "caravel", at: "Seville" });
    const { colony } = E.goAshore(o, s.governor, "the colony", "Peaceful");
    if (event.endsWith("founded")) {
      colony.progress = 99;
      colony.food = 20;
      expect(E.colonyMonth(colony, 0)).toBe("founded");
      s.founded = E.colonyFounded(o, colony);
    } else {
      colony.progress = 1;
      expect(E.colonyMonth(colony, 0)).toBe("lost");
      s.lost = E.colonyLost(o, colony);
    }
  } else if (event.startsWith("he dies")) E.governorDiesOfAge(o, s.governor);
  else expect(E.dismissGovernor(o, s.governor)).toBe(true);
});

Then(/^(he becomes the colony's ordinary official and his slot frees|he dies and his slot frees)$/, (s, result: string) => {
  expect(E.slotsUsed(office(s))).toBe(0);
  if (result.startsWith("he becomes")) {
    expect(s.founded.province.official).toEqual({ id: s.governor, governorSlot: false });
  }
  if (result.startsWith("he dies")) expect(s.lost.governor.alive).toBe(false);
});

Given("the country {string} has as many officials as its officials cap allows", (s, _c: string) => {
  knows(s).add("S5");
  const cap = form("feudal_realm").officials;
  s.officials = Array.from({ length: cap }, (_, i): Official => ({ id: `o${i}`, province: `p${i}`, hired: i }));
  s.counted = countedOfficials(s.officials).length;
  expect(s.counted).toBe(cap);
});

When("the country {string} hires a colonial governor into a free slot", (s) => {
  s.hire = E.hireGovernor(office(s), knows(s), "Seville", "new governor");
  if (s.hire.ok) s.officials.push({ id: "new governor", province: "Seville", hired: 99, governorSlot: true });
});

Then("the number of officials counted against the cap of the country {string} does not change", (s) => {
  expect(countedOfficials(s.officials).length).toBe(s.counted);
});

Given("the colonial governor {string} waits in the port {string}", (s, name: string, port: string) => {
  knows(s).add("S5");
  const r = E.hireGovernor(office(s), knows(s), port, name);
  expect(r.ok).toBe(true);
  s.governor = name;
});

When("a Castilian carrack in the port {string} takes him aboard", (s, port: string) => {
  s.ship = E.newShip("carrack", "carrack", 40);
  expect(E.embarkGovernor(office(s), s.governor, { id: "carrack", at: port })).toBe(true);
});

Then("the governor travels aboard the carrack", (s) => {
  expect(office(s).governors[0]!.where).toEqual({ kind: "aboard", ship: "carrack" });
});

Then("the carrack carries no colony stores for him", (s) => {
  expect(E.storesCapacity("carrack")).toBe(0);
  expect(E.loadStores(s.ship, 300, "food").ok).toBe(false);
  expect(s.ship.stores).toBe(0);
});

Given("the country {string} has the government form {string}", (s, _c: string, name: string) => {
  s.form = formIdFromName(name) as FormId;
});

When("the game reads its colonial range", (s) => {
  s.rangeRead = E.colonialRange(s.form, knows(s));
});

Then("the country {string} has a colonial range of {int} zones", (s, _c: string, range: number) => {
  if (s.rangeRead !== undefined) expect(s.rangeRead).toBe(range);
  else s.range = range;
});

Given("the coastal zone of a colonisable province is {int} zones from the nearest Castilian port or colony", (s, zones: number) => {
  s.g = lineMap(zones);
  s.ports = ["Port"];
});

When(/^the country "([^"]+)" tries to found a colony (?:there|in that province|on an unowned coast of Brazil)$/, (s, country: string) => {
  const g: MapGraph = s.g;
  const zones = E.zonesToNearest(g, "Target", [...s.ports, ...(s.colonies ?? [])]);
  s.zones = zones;
  s.found = E.colonisable(
    { province: "Target", coastal: true, owner: null, freeTiles: 2, zonesToNearest: zones!, beingFoundedBy: null },
    { id: countryId(country), chart: chartAll(g), range: s.range },
  );
});

Then(/^founding is (allowed|refused)$/, (s, result: string) => {
  expect(s.found.ok).toBe(result === "allowed");
});

Given("a province is {int} zones from the nearest Castilian port", (s, zones: number) => {
  s.length = zones;
});

Given("the country {string} founds a colony {int} zones from its port and {int} zones from that province", (s, _c: string, fromPort: number, fromProvince: number) => {
  expect(fromPort + fromProvince).toBe(s.length);
  s.g = lineMap(s.length, [{ id: "Colony", neighbors: [`z${fromPort}`], owner: "castile" }]);
  s.ports = ["Port"];
  expect(E.zonesToNearest(s.g, "Target", s.ports)).toBe(s.length);
  expect(E.zonesToNearest(s.g, "Colony", s.ports)).toBe(fromPort);
  s.colonies = ["Colony"];
});

Given("the coast of Brazil is about {int} zones from a Portuguese port in the Cape Verde islands", (s, zones: number) => {
  s.g = lineMap(zones);
  s.ports = ["Port"];
});

// ---------------------------------------------------------------- exploration AI

Given("the AI country {string} favours expansion by sea in its catalogue personality", (s, country: string) => {
  s.country = countryId(country);
  expect(E.favoursSea(expansionModes(s.country))).toBe(true);
});

When("the AI plans its exploration", (s) => {
  const g = realMap();
  s.g = g;
  s.chart = E.startChartedMap(g, s.country);
  const ports = (mapData.ports as [string, string, string | null, string | null][]).filter((p) => p[3] === s.country && p[2]).map((p) => p[2]!);
  s.planInput = { expansionModes: expansionModes(s.country), unlocked: true, ports };
  s.plan = E.planExploration(g, s.chart, s.planInput);
});

Then("it sends exploration ships along the edge of its charted map", (s) => {
  const g: MapGraph = s.g;
  expect(s.plan.voyageTargets.length).toBeGreaterThan(0);
  for (const z of s.plan.voyageTargets as string[]) {
    expect(E.isCharted(s.chart, z)).toBe(true);
    expect(g.byId.get(z)!.neighbors.some((n) => !E.isCharted(s.chart, n))).toBe(true);
  }
});

Then("it founds colonies on the nearest unowned coasts", (s) => {
  const g: MapGraph = s.g;
  // Its ships sail the edge of its charts, turn after turn, until unowned coasts are charted.
  for (let turn = 0; turn < 60 && s.plan.colonyTargets.length === 0; turn++) {
    expect(s.plan.colonyTargets).toEqual([]);
    for (const edge of s.plan.voyageTargets as string[])
      for (const n of g.byId.get(edge)!.neighbors) if (isWater(g.byId.get(n)!) && !E.isCharted(s.chart, n)) E.chartOnEntering(s.chart, g, n);
    s.plan = E.planExploration(g, s.chart, s.planInput);
  }
  const targets = s.plan.colonyTargets as { province: string; zones: number }[];
  expect(targets.length).toBeGreaterThan(0);
  for (const t of targets) expect(g.byId.get(t.province)!.owner).toBeNull();
  for (let i = 1; i < targets.length; i++) expect(targets[i]!.zones).toBeGreaterThanOrEqual(targets[i - 1]!.zones);
});

Given("the AI country {string} is a land power by its catalogue personality", (s, country: string) => {
  s.country = countryId(country);
  expect(E.favoursSea(expansionModes(s.country))).toBe(false);
});

When("the AI plans its turn", (s) => {
  const g = realMap();
  s.plan = E.planExploration(g, E.startChartedMap(g, s.country), { expansionModes: expansionModes(s.country), unlocked: true, ports: [] });
});

Then("it gives no voyage and founds no colony", (s) => {
  expect(s.plan).toEqual({ voyageTargets: [], colonyTargets: [] });
});

// ---------------------------------------------------------------- founding a colony

Given("the country {string} has a colonial governor aboard a caravel next to the province {string}", (s, _c: string, province: string) => {
  knows(s).add("S5");
  hire(s);
  E.embarkGovernor(office(s), "governor", { id: "caravel", at: "Seville" });
  s.site = { province, coastal: true, owner: null, freeTiles: 2, zonesToNearest: 17, beingFoundedBy: null };
  s.range = 20;
});

Given(/^the province "([^"]+)" is (charted, coastal, unowned, with free tiles, in range|not charted by Castile|unowned but every tile worked by its people|outside Castile's colonial range|already being founded by Portugal|not coastal)$/, (s, province: string, condition: string) => {
  const g = smallMap([{ id: province }, { id: "Other" }]);
  s.chart = E.newChartedMap(E.placeIndex(g));
  if (condition !== "not charted by Castile") E.chart(s.chart, province);
  const site = siteFor(s);
  if (condition.startsWith("unowned but")) site.freeTiles = 0;
  if (condition.startsWith("outside")) site.zonesToNearest = 21;
  if (condition.startsWith("already")) site.beingFoundedBy = "portugal";
  if (condition === "not coastal") site.coastal = false;
});

function giveFoundColony(s: Scenario): void {
  const site = siteFor(s);
  s.found = E.colonisable(site, { id: "castile", chart: chartFor(s), range: s.range ?? 20 });
  if (!s.found.ok) return;
  const people = s.people ?? true;
  const level = E.rollAggression(new Rng(s.seed ?? 1), people);
  const r = E.goAshore(office(s), s.governorId ?? "governor", site.province, level);
  s.colony = r.colony;
  s.events = r.events;
}

When("the country {string} gives {string}", (s, _c: string, command: string) => {
  if (command === "Found colony") giveFoundColony(s);
  else if (command === "Unload stores") s.unload = E.unloadStores(s.colony, s.ship);
  else throw new Error(`unknown command ${command}`);
});

Given("the province {string} is owned by a Taíno chiefdom, a country in the 1444 list", (s, province: string) => {
  expect(record("marien")[1]).toBe("am_mesoamerica_caribbean");
  s.site = { province, coastal: true, owner: "marien", freeTiles: 2, zonesToNearest: 17, beingFoundedBy: null };
  knows(s).add("S5");
  hire(s);
  E.embarkGovernor(office(s), "governor", { id: "caravel", at: "Seville" });
});

When("the country {string} gives {string} there", (s, _c: string, command: string) => {
  expect(command).toBe("Found colony");
  giveFoundColony(s);
});

Then("the province {string} can only be taken by war or treaty", (s) => {
  expect(s.found).toEqual({ ok: false, reason: "owned" });
  expect(E.howTaken(s.site.owner)).toBe("war_or_treaty");
});

Given("a Castilian caravel carrying the colonial governor {string} is in the coastal zone of an unowned island", (s, name: string) => {
  knows(s).add("S5");
  hire(s, name);
  s.governorId = name;
  E.embarkGovernor(office(s), name, { id: "caravel", at: "Seville" });
  s.site = { province: "Island", coastal: true, owner: null, freeTiles: 4, zonesToNearest: 10, beingFoundedBy: null };
});

Then("the governor goes ashore", (s) => {
  expect(office(s).governors[0]!.where).toEqual({ kind: "ashore", province: s.site.province });
});

Then("the colony starts at {int} progress", (s, n: number) => {
  expect(s.colony.progress).toBe(n);
});

Then("its local aggression is rolled at once from the peoples in the province and its neighbours and shown", (s) => {
  const rolled = (s.events as E.FoundingEvent[]).find((e) => e.type === "LocalAggressionRolled");
  expect(rolled).toEqual({ type: "LocalAggressionRolled", province: s.site.province, level: s.colony.aggression });
  expect(E.AGGRESSION.map((a) => a.level)).toContain(s.colony.aggression);
});

Given("an unowned island with no people", (s) => {
  s.places = [{ id: "Island", population: 0, neighbors: ["z0"] }, { id: "z0" }];
});

Given("the Taíno live on a coast across one sea zone from it", (s) => {
  s.places.push({ id: "Taíno coast", population: 20, neighbors: ["z0"] });
});

When("a colony is founded on the island", (s) => {
  const g = smallMap(s.places);
  s.counted = E.aggressionNeighbours(g, "Island");
  s.people = E.peopleAround(g, "Island", (id) => g.byId.get(id)!.population);
});

Then("the Taíno are counted for its local aggression", (s) => {
  expect(s.counted).toContain("Taíno coast");
  expect(s.people).toBe(true);
});

Given("a colony with people in its province or neighbours", (s) => {
  s.people = true;
});

When("its local aggression is rolled {string}", (s, level: E.AggressionLevel) => {
  s.level = level;
});

Then("it loses on average {int} progress a month to the locals", (s, loss: number) => {
  expect(E.averageFounding(s.level).loss).toBe(loss);
  expect(E.pressureMax(s.level)).toBe(loss * 2);
});

Then("it takes on average {int} months to reach 100 and needs about {int} rations", (s, months: number, food: number) => {
  const a = E.averageFounding(s.level);
  expect([a.months, a.food]).toEqual([months, food]);
});

When("local aggression is rolled many times for colonies with people nearby", (s) => {
  const rng = new Rng(1444);
  const counts: Record<string, number> = {};
  for (let i = 0; i < 20000; i++) {
    const l = E.rollAggression(rng, true);
    counts[l] = (counts[l] ?? 0) + 1;
  }
  s.counts = counts;
  s.rolls = 20000;
});

Then("about {int} percent are Peaceful, {int} percent Wary, {int} percent Hostile and {int} percent Fierce", (s, p: number, w: number, h: number, f: number) => {
  for (const [level, pct] of [["Peaceful", p], ["Wary", w], ["Hostile", h], ["Fierce", f]] as const) expect(Math.abs((100 * (s.counts[level] ?? 0)) / s.rolls - pct)).toBeLessThan(1.5);
});

Given("an unowned island with no people in it or any neighbour", (s) => {
  s.places = [{ id: "Island", population: 0, neighbors: ["z0", "Islet"] }, { id: "z0" }, { id: "Islet", population: 0, neighbors: ["z0"] }];
});

When("a colony is founded there", (s) => {
  const g = smallMap(s.places);
  const people = E.peopleAround(g, "Island", (id) => g.byId.get(id)!.population);
  s.level = E.rollAggression(new Rng(7), people);
});

Then("its local aggression is {string}", (s, level: string) => {
  expect(s.level).toBe(level);
});

Given("a colony at {int} progress with {int} rations of colony food", (s, progress: number, food: number) => {
  colonyOf(s, progress, food);
});

Given("its locals' pressure roll this month is {int}", (s, pressure: number) => {
  s.pressure = pressure;
});

When("the month ends", (s) => {
  s.outcome = E.colonyMonth(s.colony, s.pressure);
});

Then("the colony has {int} progress and {int} rations of colony food", (s, progress: number, food: number) => {
  expect([s.colony.progress, s.colony.food]).toEqual([progress, food]);
});

Given("a Castilian caravel docks in the port {string}", (s, port: string) => {
  expect(portTier(port)).toBe("great");
  s.ship = E.newShip("caravel", "caravel", 25);
  s.ship.supply = 10;
  E.leavePort([s.ship]);
});

When("it loads colony stores", (s) => {
  s.load = E.loadStores(s.ship, 1000, E.dockingPays("realm"));
});

Then("it carries up to {int} rations of colony stores apart from its {int} supply", (s, stores: number, supply: number) => {
  expect(s.ship.stores).toBe(stores);
  expect(s.ship.supply).toBe(supply);
});

Then("the stores are paid as resupply is paid there: food from the province", (s) => {
  expect(s.load).toEqual({ ok: true, loaded: 300, paidIn: "food" });
});

Given("a Castilian caravel with {int} rations of colony stores in the coastal zone of a colony with {int} colony food", (s, stores: number, food: number) => {
  colonyOf(s, 30, food);
  s.ship = E.newShip("caravel", "caravel", 25);
  E.loadStores(s.ship, stores, "food");
});

Then("after one day the colony has {int} rations of colony food", (s, food: number) => {
  expect(s.unload.days).toBe(1);
  expect(s.colony.food).toBe(food);
});

Given(/^the country "Castile" founds a colony(?: "([^"]+)")? at (\d+) progress with (\d+) rations of colony food$/, (s, name: string | undefined, progress: string, food: string) => {
  colonyOf(s, Number(progress), Number(food), name ?? "the colony");
});

Given("the colonial governor {string} holds slot {int} of {int}", (s, name: string, slot: number, of: number) => {
  const g = office(s).governors.find((x) => x.id === s.colony.governor)!;
  g.id = name;
  g.name = name;
  s.colony.governor = name;
  expect(E.slotsUsed(office(s))).toBe(slot);
  expect(E.governorSlots(knows(s))).toBe(of);
});

When(/^a month brings its progress to (100|0)$/, (s, target: string) => {
  s.outcome = E.colonyMonth(s.colony, 0);
  expect(s.colony.progress).toBe(Number(target));
  if (s.outcome === "founded") {
    const r = E.colonyFounded(office(s), s.colony);
    s.province = r.province;
    s.events.push(r.event);
  } else if (s.outcome === "lost") {
    s.lostResult = E.colonyLost(office(s), s.colony);
    s.events.push(s.lostResult.event);
  }
});

Then("the province {string} belongs to the country {string} with its settlement at {string}", (s, province: string, country: string, settlement: string) => {
  expect(s.province.id).toBe(province);
  expect(s.province.owner).toBe(countryId(country));
  expect(s.province.settlement).toBe(settlement);
});

Then("{string} stays as its official and counts against the officials cap", (s, name: string) => {
  const official: Official = { ...s.province.official, province: s.province.id, hired: 1 };
  expect(official.id).toBe(name);
  expect(countedOfficials([official])).toHaveLength(1);
});

Then("the country {string} has {int} of {int} colonial governor slots used", (s, _c: string, used: number, of: number) => {
  expect(E.slotsUsed(office(s))).toBe(used);
  expect(E.governorSlots(knows(s))).toBe(of);
});

Then("the left-over {int} rations go into the province's store", (s, food: number) => {
  expect(s.province.store).toBe(food);
});

Then("the colony is counted by the event tree's colonial presence", (s) => {
  expect(E.colonialPresence(s.events, "castile")).toBe(1);
});

Then("the colonial governor dies", (s) => {
  expect(s.lostResult.governor.alive).toBe(false);
});

Then("the colony food is lost", (s) => {
  expect(s.colony.food).toBe(0);
});

Then("his slot frees", (s) => {
  expect(E.slotsUsed(office(s))).toBe(0);
});

Then("the province stays unowned", (s) => {
  expect(s.lostResult.owner).toBeNull();
});

Given(/^the country "Castile" founds a colony with (a caravel|no ship) in its coastal zone$/, (s, ship: string) => {
  colonyOf(s, 40, 100);
  s.shipInZone = ship === "a caravel" ? { id: "caravel" } : null;
});

When(/^the country "Castile" (?:tries to )?abandons? the colony$/, (s) => {
  s.abandon = E.abandonColony(office(s), s.colony, s.shipInZone);
});

Then("the governor goes back aboard the caravel", (s) => {
  expect(s.abandon.ok).toBe(true);
  expect(office(s).governors[0]!.where).toEqual({ kind: "travelling_home", ship: "caravel" });
});

Then("his slot stays used until he is home in a port of the country {string}", (s) => {
  expect(E.slotsUsed(office(s))).toBe(1);
  E.governorHome(office(s), "governor", "Seville");
  expect(E.slotsUsed(office(s))).toBe(0);
});

Then("abandoning is refused", (s) => {
  expect(s.abandon).toEqual({ ok: false, reason: "no_ship_in_zone" });
});

Given("a colony being founded", (s) => {
  colonyOf(s, 40, 100);
  s.before = { progress: 40, food: 100 };
});

When("days pass inside a month", (s) => {
  for (let d = 0; d < 29; d++) E.colonyDay(s.colony);
});

Then("its progress and colony food change only at the monthly province update", (s) => {
  expect({ progress: s.colony.progress, food: s.colony.food }).toEqual(s.before);
  E.colonyMonth(s.colony, 1);
  expect({ progress: s.colony.progress, food: s.colony.food }).toEqual({ progress: 44, food: 80 });
});

Given("the country {string} has a colonial governor in slot {int} of {int} and a feudal colonial range of {int}", (s, _c: string, slot: number, of: number, range: number) => {
  knows(s).add("S5");
  hire(s);
  expect([E.slotsUsed(office(s)), E.governorSlots(knows(s))]).toEqual([slot, of]);
  s.range = E.colonialRange("feudal_realm", knows(s));
  expect(s.range).toBe(range);
});

Given("two caravels load {int} rations of colony stores and the governor", (s, rations: number) => {
  s.caravels = [E.newShip("c1", "caravel", 25), E.newShip("c2", "caravel", 25)];
  let loaded = 0;
  for (const c of s.caravels) {
    const r = E.loadStores(c, rations - loaded, E.dockingPays("realm"));
    if (r.ok) loaded += r.loaded;
  }
  expect(loaded).toBe(rations);
  expect(E.embarkGovernor(office(s), "governor", { id: "c1", at: "Seville" })).toBe(true);
});

Given("they sail to an unowned coast on a small island {int} zones from the Canaries", (s, zones: number) => {
  s.site = { province: "Small island", coastal: true, owner: null, freeTiles: 3, zonesToNearest: zones, beingFoundedBy: null };
});

When("the Taíno across the strait make the roll {string}", (s, level: E.AggressionLevel) => {
  s.colony.aggression = level;
});

When("the caravels unload all {int} rations", (s, rations: number) => {
  for (const c of s.caravels) E.unloadStores(s.colony, c);
  expect(s.colony.food).toBe(rations);
});

Then("the colony gains about {int} progress a month", (s, gain: number) => {
  expect(E.averageFounding(s.colony.aggression).gain).toBe(gain);
});

Then("a third caravel brings {int} more rations in year two after a bad run of rolls", (s, rations: number) => {
  const avg = E.averageFounding(s.colony.aggression).loss;
  // Rolls at the average, except a bad run of three months at the top of year two.
  const pressure = (month: number) => (month >= 13 && month <= 15 ? avg + 1 : avg);
  const third = E.newShip("c3", "caravel", 25);
  E.loadStores(third, rations, "food");
  let month = 0;
  let outcome: "founded" | "lost" | null = null;
  while (!outcome && month < 120) {
    month++;
    if (month === 16) E.unloadStores(s.colony, third);
    expect(s.colony.food).toBeGreaterThanOrEqual(E.explorationConfig.food_per_month);
    outcome = E.colonyMonth(s.colony, pressure(month));
  }
  s.month = month;
  s.outcome = outcome;
});

Then("the colony reaches 100 progress in month {int} and is a Castilian province", (s, month: number) => {
  expect(s.outcome).toBe("founded");
  expect(s.month).toBe(month);
  const r = E.colonyFounded(office(s), s.colony);
  s.province = r.province;
  expect(r.province.owner).toBe("castile");
});

Then("the governor stays as its official and his slot frees for the next colony", (s) => {
  expect(s.province.official.id).toBe("governor");
  expect(E.slotsUsed(office(s))).toBe(0);
  expect(E.hireGovernor(office(s), knows(s), "Seville", "next").ok).toBe(true);
});

// ---------------------------------------------------------------- voyages

/** A voyage line out of Lagos: z0 at Lagos, zones z1 … zn; the first `charted` zones are charted. */
function voyageLine(s: Scenario, n: number, charted: number, ports: { name: string; at: number; charted: boolean }[]) {
  const places: { id: string; neighbors?: string[]; owner?: string | null }[] = [{ id: "Lagos", neighbors: ["z0"], owner: "portugal" }];
  for (let i = 0; i <= n; i++) places.push({ id: `z${i}`, neighbors: i ? [`z${i - 1}`] : [] });
  for (const p of ports) places.push({ id: p.name, neighbors: [`z${p.at}`] });
  const g = smallMap(places);
  const m = E.newChartedMap(E.placeIndex(g));
  E.chart(m, "Lagos");
  for (let i = 0; i <= charted; i++) E.chart(m, `z${i}`);
  for (const p of ports) if (p.charted) E.chart(m, p.name);
  s.g = g;
  s.chart = m;
  s.path = Array.from({ length: n }, (_, i) => `z${i + 1}`);
  s.portsOnWay = ports.map((p) => ({ name: p.name, province: p.name, tier: portTier(p.name) ?? "port" }));
}

Given("the caravel {string} of the country {string} is in the port {string} with {int} supply", (s, name: string, _c: string, port: string, supply: number) => {
  expect(portTier(port)).toBeDefined();
  s.ship = E.newShip(name, "caravel", 25);
  expect(s.ship.maxSupply).toBe(supply);
});

When("the player draws a voyage of {int} zones, {int} of them uncharted", (s, zones: number, uncharted: number) => {
  voyageLine(s, zones, zones - uncharted, [
    { name: "Arguin", at: 6, charted: true },
    { name: "Elmina", at: 30, charted: false },
  ]);
  s.preview = E.voyagePreview([s.ship], s.path, s.chart, s.portsOnWay);
});

Then("the voyage shows {int} zones and {int} uncharted", (s, zones: number, uncharted: number) => {
  expect([s.preview.zones, s.preview.uncharted]).toEqual([zones, uncharted]);
});

Then("the voyage shows supply {int} of {int}, {int} out and {int} back, {int} short", (s, have: number, max: number, out: number, back: number, short: number) => {
  const p: E.VoyagePreview = s.preview;
  expect([p.supply, p.maxSupply, p.out, p.back, p.short]).toEqual([have, max, out, back, short]);
});

Then("the voyage lists {string} as a canoe landing with no dock and {string} as uncharted", (s, landing: string, uncharted: string) => {
  expect(portTier(landing)).toBe("landing");
  expect(s.preview.ports).toEqual([
    { name: landing, mark: "no dock" },
    { name: uncharted, mark: "uncharted" },
  ]);
});

Then("the voyage offers {string} and {string} on low supply", (s, a: string, b: string) => {
  expect(s.preview.choices).toEqual([a, b]);
  expect(s.preview.defaultChoice).toBe("Turn back");
});

Given("the caravel {string} is in the port {string} with {int} of {int} supply", (s, name: string, _port: string, supply: number, max: number) => {
  s.ship = E.newShip(name, "caravel", 25);
  expect(s.ship.maxSupply).toBe(max);
  s.ship.supply = supply;
});

When("the voyage starts", (s) => {
  E.leavePort([s.ship]);
});

Then("the caravel leaves the port {string} with {int} supply", (s, _port: string, supply: number) => {
  expect(s.ship.supply).toBe(supply);
});

Given("a caravel on a voyage set to {string}", (s, choice: E.LowSupply) => {
  s.choice = choice;
  s.ship = E.newShip("caravel", "caravel", 25);
});

Given("the nearest port where it may dock is {int} zones away", (s, zones: number) => {
  s.portZones = zones;
  s.g = lineMap(40);
  s.chart = E.newChartedMap(E.placeIndex(s.g));
  E.chart(s.chart, "z0");
});

When("its supply left falls to {int}", (s, left: number) => {
  expect(E.shouldTurnBack(s.choice, left + 1, s.portZones)).toBe(false);
  expect(E.shouldTurnBack(s.choice, left, s.portZones)).toBe(true);
  s.ship.supply = left + s.portZones;
  s.result = E.sailVoyage(s.g, s.chart, [s.ship], "z0", Array.from({ length: 40 }, (_, i) => `z${i + 1}`), s.choice, ["Port"]);
  expect(s.ship.supply + s.portZones).toBe(left);
});

Then("the caravel turns and sails to that port", (s) => {
  expect(s.result.turnedBackAt).toBe(`z${s.portZones}`);
  expect(s.result.at).toBe("z0");
  expect(E.coastalZones(s.g, "Port")).toContain(s.result.at);
  expect(s.result.zonesWithoutSupply).toBe(0);
});

Given("a caravel with a crew of {int} on a voyage set to {string}", (s, crew: number, choice: E.LowSupply) => {
  s.ship = E.newShip("caravel", "caravel", crew);
  s.choice = choice;
  s.crew = crew;
});

Given("its path is {int} zones longer than its supply allows", (s, extra: number) => {
  s.extra = extra;
  s.length = s.ship.maxSupply + extra;
  s.g = lineMap(s.length);
  s.chart = E.newChartedMap(E.placeIndex(s.g));
});

When("it sails the path to its end", (s) => {
  s.result = E.sailVoyage(s.g, s.chart, [s.ship], "z0", Array.from({ length: s.length }, (_, i) => `z${i + 1}`), s.choice, ["Port"]);
});

Then("it sails the last zones with no supply", (s) => {
  expect(s.result.turnedBackAt).toBeNull();
  expect(s.result.at).toBe(`z${s.length}`);
  expect(s.result.zonesWithoutSupply).toBe(s.extra);
});

Then("it loses 1 in 10 of its crew for each zone sailed without supply", (s) => {
  expect(s.ship.crew).toBeCloseTo(s.crew * 0.9 ** s.extra, 9);
});

Given("a Castilian caravel on a voyage reaches a port of the country {string}", (s, owner: string) => {
  s.owner = owner;
});

Given(/^the country "([^"]+)" is (the realm|at peace and not a rival|a rival|at war) of the country "Castile"$/, (s, _o: string, relation: string) => {
  s.relation = ({ "the realm": "realm", "at peace and not a rival": "peace", "a rival": "rival", "at war": "war" } as const)[relation];
});

When("the caravel tries to dock", (s) => {
  s.dock = E.dockingPays(s.relation);
});

Then(/^docking is (allowed, paid in food|allowed, paid in gold|refused)$/, (s, result: string) => {
  expect(s.dock).toBe(result === "refused" ? null : result.endsWith("food") ? "food" : "gold");
});

Given("a Castilian caravel charts the coast of {string}", (s, province: string) => {
  const g = smallMap([{ id: province, owner: "marien", neighbors: ["z0"], terrain: "jungle", population: 30 }, { id: "z0" }]);
  s.g = g;
  s.chart = E.newChartedMap(E.placeIndex(g));
  s.province = province;
  s.charted = E.chartOnEntering(s.chart, g, "z0");
});

When("the land is newly charted", (s) => {
  expect(s.charted).toContain(s.province);
  s.view = E.newlyChartedView(s.g.byId.get(s.province), ["Xaraguá landing"]);
});

Then("the country {string} sees its terrain, its owner and its ports", (s) => {
  expect(s.view).toEqual({ terrain: "jungle", owner: "marien", ports: ["Xaraguá landing"] });
});

Then("nothing else about its peoples is shown", (s) => {
  expect(Object.keys(s.view).sort()).toEqual(["owner", "ports", "terrain"]);
});

Given("the country {string} has the exploration unlock and knows S5", (s, country: string) => {
  s.gate = E.gateAtStart(1493);
  s.region = E.polityRegion(countryId(country));
  knows(s).add("S4").add("S5").add("S1");
  expect(E.hasExplorationUnlock({ knows: knows(s), region: s.region }, s.gate)).toBe(true);
});

Given("three caravels sail from the port {string} to the Canaries and dock for food from the province", (s, port: string) => {
  expect(portTier(port)).toBe("great");
  s.ships = [E.newShip("Santa María", "caravel", 40), E.newShip("Pinta", "caravel", 25), E.newShip("Niña", "caravel", 25)];
  for (const sh of s.ships) sh.supply = 50;
  expect(E.dockingPays("realm")).toBe("food");
  E.leavePort(s.ships);
});

When("they sail {int} uncharted zones west with {int} supply each", (s, zones: number, supply: number) => {
  const places: { id: string; neighbors?: string[]; owner?: string | null }[] = [
    { id: "Seville", owner: "castile", neighbors: ["zs"] },
    { id: "zs", neighbors: ["zk"] },
    { id: "Canaries", owner: "castile", neighbors: ["zk"] },
    { id: "zk" },
  ];
  for (let i = 1; i <= zones; i++) places.push({ id: `zw${i}`, neighbors: [i === 1 ? "zk" : `zw${i - 1}`] });
  places.push({ id: "Bahamas", neighbors: [`zw${zones - 1}`] }, { id: "Hispaniola", owner: "marien", neighbors: [`zw${zones}`] });
  const g = smallMap(places);
  s.g = g;
  s.chart = E.newChartedMap(E.placeIndex(g));
  for (const id of ["Seville", "zs", "Canaries", "zk"]) E.chart(s.chart, id);
  const out = Array.from({ length: zones }, (_, i) => `zw${i + 1}`);
  for (const sh of s.ships) expect(sh.supply).toBe(supply);
  s.preview = E.voyagePreview(s.ships, out, s.chart, []);
  expect(s.preview.uncharted).toBe(zones);
  const back = [...out].reverse().slice(1).concat("zk");
  s.result = E.sailVoyage(g, s.chart, s.ships, "zk", [...out, ...back], "Turn back", ["Canaries", "Seville"]);
});

Then("the voyage preview shows enough supply to get there and back", (s) => {
  expect(s.preview.short).toBe(0);
  expect(s.preview.out + s.preview.back).toBeLessThanOrEqual(s.preview.supply);
});

Then("they chart the Bahamas and the coast of {string}", (s, province: string) => {
  expect(E.isCharted(s.chart, "Bahamas")).toBe(true);
  expect(E.isCharted(s.chart, province)).toBe(true);
});

Then("they come home", (s) => {
  expect(s.result.at).toBe("zk");
  expect(s.result.zonesWithoutSupply).toBe(0);
  expect(E.coastalZones(s.g, "Canaries")).toContain(s.result.at);
});
