import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { aiWarChanceFactor, campaignView, createEngineHost, createWorld, incomePaidIn, risingChanceByDifficulty, risingChanceIn, Rng, runLedger, setDifficulty, setPlayer } from "@ph/engine";
import { restoreCampaignEnd, saveCampaignEnd } from "../../engine/src/campaignEnd.ts";
import { aiDeclarations } from "../../engine/src/war.ts";
import { GRIEVANCES } from "../../engine/src/moods.ts";
import * as T from "@ph/engine/domain/trade";
import * as TIME from "@ph/engine/domain/time-and-turns";
import * as S from "@ph/engine/domain/scenario-setup";
import * as B from "@ph/engine/domain/buildings";
import { FORM_IDS, type CatalogueRecord, type FormId } from "@ph/engine/domain/government";
import { dataset1444 } from "@ph/engine/domain/diplomacy";
import { isCharted, landSteps, startChartedMap } from "@ph/engine/domain/exploration";
import { isWater, mapGraph, type MapGraph } from "@ph/engine/domain/world-map";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("scenario-setup");

// ---------------------------------------------------------------- helpers

let world: MapGraph | undefined;
const realMap = (): MapGraph => (world ??= mapGraph(loadDefaultRuleset()));

/** A record id from a name as the features write it ("Venice", "Ottomans", "a one-province count"). */
const idOf = (name: string): string => name.toLowerCase().replace(/ /g, "_");

/** Map nation ids by the names the features use. */
const realmId = (name: string): string => {
  const n = loadDefaultRuleset().nations.find((x) => x.name === name || x.id === name);
  if (!n) throw new Error(`no map nation ${name}`);
  return n.id;
};

/** A record by its English name or id. */
const recordByName = (name: string): S.CatalogueRow => {
  const r = S.allRecords().find((x) => x.name === name || x.id === name);
  if (!r) throw new Error(`no catalogue record named ${name}`);
  return r;
};

const DEFAULT_RULES: S.CampaignRules = { difficulty: "normal", ai_temper: "normal", fog: true, events: "historical", ironman: false, end_date: S.DEFAULT_END_DATE };

// ---------------------------------------------------------------- the catalogue

Given("the catalogue record {string}", (s, id: string) => {
  s.record = S.catalogueRecord(id);
});

When("it is read", (s) => {
  s.read = true;
});

Then("it describes France on 11 November 1444", (s) => {
  expect(s.record.name).toBe("France");
  expect(S.REFERENCE_DAY).toBe("1444-11-11");
  expect(S.checkedFor1444(s.record.id)).toBe(true);
});

Then("it holds no numeric game statistics", () => {
  expect(S.numericGameStatistics()).toEqual([]);
});

Given("the entity {string} founded in {int}", (s, name: string, year: number) => {
  s.entity = name;
  s.founded = year;
});

When("the catalogue is built", (s) => {
  s.inclusion = S.dateTest(s.founded);
  s.inventory = S.inventoryEntry(s.entity);
});

Then("it is listed in the inventory as {string}", (s, inclusion: string) => {
  expect(s.inclusion).toBe(inclusion);
  expect(s.inventory?.inclusion).toBe(inclusion);
  expect(S.hasRecord(s.inventory.id)).toBe(false);
});

Given(/^the entity "([^"]+)" is (under .+ with its own politics|without separate agency)$/, (s, name: string, status: string) => {
  s.entity = name;
  s.ownPolitics = status.endsWith("its own politics");
});

When("the inclusion rules are applied", (s) => {
  s.inclusion = S.agencyTest({ ownPolitics: s.ownPolitics });
});

Then(/^it is (included|excluded as not distinct or merged into another)$/, (s, result: string) => {
  if (result === "included") {
    expect(s.inclusion).toBe("included");
    const r = recordByName(s.entity);
    expect(["playable_country", "playable_subject"]).toContain(r.representation);
  } else {
    expect(["excluded_not_distinct", "merged_into_other"]).toContain(s.inclusion);
    expect(S.agencyTest({ ownPolitics: false, mergedInto: "x" })).toBe("merged_into_other");
    expect(S.inventoryByInclusion("excluded_not_distinct").length).toBeGreaterThan(0);
    expect(S.inventoryByInclusion("merged_into_other").length).toBeGreaterThan(0);
  }
});

Given("the group record {string}", (s, id: string) => {
  s.record = S.catalogueRecord(id);
  s.text = S.groupRecordText(id);
});

Then("its text says what it stands for and that it is a grouping", (s) => {
  expect(s.text.toLowerCase()).toContain("group");
  expect(s.text.length).toBeGreaterThan(40);
  expect(["playable_country", "playable_subject"]).not.toContain(s.record.representation);
});

Given("a stateless society in the catalogue", (s) => {
  s.record = S.catalogueRecord("sapmi");
  s.gov = S.startFormRecord("sapmi");
  expect(S.setupConfig.catalogue.stateless_entity_types).toContain(s.gov.entityType);
});

When("its representation is read", (s) => {
  s.representation = s.record.representation;
});

Then("it is {string} or {string}", (s, a: string, b: string) => {
  expect([a, b]).toContain(s.representation);
  expect(S.isStatelessRepresentation(s.representation)).toBe(true);
});

Then("its real political structure is described", (s) => {
  expect(s.gov.text.length).toBeGreaterThan(10);
});

Given("an entity whose existence in 1444 is disputed by scholars", (s) => {
  s.disputed = S.inventoryByInclusion("included_disputed");
});

When("it is catalogued", (s) => {
  s.inclusion = S.disputedInclusion();
});

Then("it is {string} with the dispute described", (s, inclusion: string) => {
  expect(s.inclusion).toBe(inclusion);
  expect(s.disputed.length).toBe(S.catalogueTotals.included_disputed);
  for (const e of s.disputed as S.InventoryEntry[]) expect(e.noted).toBe(true);
});

Given("the seed id of a record is renamed", (s) => {
  s.registry = S.idRegistry();
  s.oldId = "wallachia";
  s.newId = "principality_of_wallachia";
});

When("the catalogue is rebuilt", (s) => {
  S.renameRecord(s.registry, s.oldId, s.newId);
});

Then("the old id is kept in the inventory aliases", (s) => {
  expect(s.registry.aliases.get(s.oldId)).toBe(s.newId);
  expect(s.registry.ids.has(s.newId)).toBe(true);
});

Then("no other record takes the old id", (s) => {
  expect(S.mayUseId(s.registry, s.oldId)).toBe(false);
  expect(() => S.renameRecord(s.registry, "moldavia", s.oldId)).toThrow();
});

Given("a {string} edge between {string} and {string}", (s, kind: string, a: string, b: string) => {
  s.edge = { kind, a, b };
});

When("it is stored", (s) => {
  s.storedWith = S.edgeStoredWith(s.edge.kind, s.edge.a, s.edge.b);
});

Then("it is stored in the region of {string}", (s, party: string) => {
  expect(s.storedWith).toBe(party);
  expect(S.catalogueRecord(party).region).toMatch(/^[a-z]{2}_/);
});

Given("the assessment {string} of the record {string} is {string}", (s, dim: string, id: string, level: string) => {
  s.dimension = dim;
  s.assessment = S.catalogueRecord(id).assessments[dim];
  s.record = S.catalogueRecord(id);
  expect(s.assessment.level).toBe(level);
});

Then(/^it is judged (on one global scale|relative to the entity's own size and type|as a risk, where higher is worse)$/, (s, scale: string) => {
  const want = scale.startsWith("on one") ? "global" : scale.startsWith("relative") ? "relative" : "risk";
  expect(S.assessmentScale(s.dimension)).toBe(want);
});

Then("it carries a justification and a confidence", (s) => {
  expect(s.record.justified).toBe(true);
  expect(["low", "medium", "high"]).toContain(s.assessment.confidence);
});

Given("any catalogue record", (s) => {
  s.records = S.allRecords();
});

When("its assessments are read", (s) => {
  s.read = true;
});

Then("no single power score is given", (s) => {
  for (const r of s.records as S.CatalogueRow[]) {
    expect(Object.keys(r.assessments).sort()).toEqual([...S.ASSESSMENT_DIMENSIONS].sort());
    for (const a of Object.values(r.assessments)) expect(S.ASSESSMENT_LEVELS).toContain(a.level);
  }
  expect(S.ASSESSMENT_DIMENSIONS.some((d) => /score|^overall|^power/.test(d))).toBe(false);
});

When("its meta is read", (s) => {
  s.read = true;
});

Then("its {string} is null", (s, field: string) => {
  expect(field).toBe("eu4_tag");
  expect(S.recordsWithCommercialTags()).toEqual([]);
});

Given("the current catalogue build", (s) => {
  s.build = S.catalogueTotals;
  expect(S.catalogueIds().length).toBe(s.build.records);
  expect(S.regionCount()).toBe(29);
});

When("its records are counted by representation", (s) => {
  s.counts = S.countByRepresentation();
});

Then("there are {int} records of {string}", (s, n: number, mode: string) => {
  expect(s.counts[mode]).toBe(n);
});

Given("the record {string}", (s, id: string) => {
  s.id = id;
});

When("its AI personality is read", (s) => {
  s.keys = S.PERSONALITY_KEYS;
  s.record = S.catalogueRecord(s.id);
});

Then("it lists priorities, expansion modes, diplomatic style, economic focus, doctrine, risk tolerance, constraints, opportunities, failure conditions and an adaptation note", (s) => {
  for (const k of S.setupConfig.catalogue.personality_fields) expect(s.keys).toContain(k);
  expect(s.record.expansionModes.length).toBeGreaterThan(0);
});

Then("it gives no scripted moves", (s) => {
  expect((s.keys as string[]).some((k) => /script|move|order|action/.test(k))).toBe(false);
});

// ---------------------------------------------------------------- start forms

When("start forms are assigned", (s) => {
  if (!s.custom && !s.id) return; // all records: the Then step assigns them
  const r: CatalogueRecord = s.custom ?? S.startFormRecord(s.id);
  s.assigned = S.startForm(r);
});

Then("it starts as {string}", (s, f: string) => {
  expect(s.assigned.form).toBe(f);
});

Then("the override's reason is {string}", (s, why: string) => {
  expect(s.assigned.rule).toBe("override");
  expect(s.assigned.why).toBe(why);
});

Given("a record of entity type {string} with no override whose government form text contains {string}", (s, type: string, text: string) => {
  s.custom = { id: "test_record", entityType: type, region: "eu_france", tier: "B", text: `A ${text} government` };
});

Then("the merchant republic text rule does not apply to it", (s) => {
  expect(s.assigned.form).not.toBe("merchant_republic");
  expect(s.assigned.rule).toBe("kingdom_by_region");
});

Given("a record of entity type {string} with no override and no matching text", (s, type: string) => {
  s.custom = { id: "test_record", entityType: type, region: "eu_france", tier: "B", text: "" };
});

Given("a record of entity type {string} of tier {string} in the region {string} with no override and no matching text", (s, type: string, tier: string, region: string) => {
  s.custom = { id: "test_record", entityType: type, region, tier, text: "" };
});

Given("a record matched by no override, text rule, entity type or region rule", (s) => {
  s.custom = { id: "test_record", entityType: "unlisted", region: "zz_nowhere", tier: "C", text: "" };
});

Given("all {int} records", (s, n: number) => {
  s.records = S.startFormRecords();
  expect(s.records.length).toBe(n);
});

Then("no record starts as {string}", (s, f: string) => {
  expect(S.NEVER_START_FORMS).toContain(f);
  const forms = new Set(S.startFormSummary(s.records).map((l) => l.form));
  expect(forms.has(f as FormId)).toBe(false);
});

Given("the override for {string} is changed in the start-form config", (s, id: string) => {
  const before = S.startForm(S.startFormRecord(id)).form;
  const to = FORM_IDS.find((f) => f !== before && !S.NEVER_START_FORMS.includes(f))!;
  s.id = id;
  s.newForm = to;
  s.overrides = { ...S.START_FORM_OVERRIDES, [id]: { form: to, why: "changed" } };
});

When("the start-form tool is rerun", (s) => {
  s.summary = S.startFormSummary(S.startFormRecords(), s.overrides);
});

Then("the start-form summary shows the new form for {string}", (s, id: string) => {
  expect(s.summary.find((l: S.StartFormLine) => l.id === id)).toEqual({ id, form: s.newForm, rule: "override" });
  expect(S.startFormSummary().find((l) => l.id === id)!.form).not.toBe(s.newForm);
});

// ---------------------------------------------------------------- country start

When("the starting world is built", (s) => {
  s.built = true;
});

Given("the relations file for 11 November 1444 with {int} relations and {int} facts", (_s, relations: number, facts: number) => {
  expect(dataset1444.reference_date).toBe("1444-11-11");
  expect(dataset1444.relations.length).toBe(relations);
  expect(dataset1444.facts.length).toBe(facts);
});

Then("each country's allies, rivals, subjects and enemies are those in the relations file", () => {
  const rels = dataset1444.relations as { type: string; source: string; target: string }[];
  const countries = new Set(rels.flatMap((r) => [r.source, r.target]));
  let checked = 0;
  for (const c of countries) {
    const start = S.startingRelations(c);
    const want: S.StartingRelations = { allies: [], rivals: [], subjects: [], enemies: [] };
    for (const r of rels) {
      if (r.type === "alliance" && (r.source === c || r.target === c)) want.allies.push(r.source === c ? r.target : r.source);
      if (r.type === "rival" && (r.source === c || r.target === c)) want.rivals.push(r.source === c ? r.target : r.source);
      if (r.type === "at_war" && (r.source === c || r.target === c)) want.enemies.push(r.source === c ? r.target : r.source);
      if (r.type === "subject" && r.target === c) want.subjects.push(r.source);
    }
    expect(start).toEqual(want);
    checked += start.allies.length + start.rivals.length + start.enemies.length + start.subjects.length;
  }
  expect(checked).toBeGreaterThan(0);
  expect(S.startingRelations("france").subjects).toContain("brittany");
});

Given("the country {string} holds {int} provinces", (s, country: string, provinces: number) => {
  s.country = country;
  s.provinces = provinces;
});

Then("it starts with no lords", (s) => {
  expect(S.lordsAtStart(s.provinces, ["a great house"])).toEqual([]);
});

Given("a country whose {string} is {string}", (s, dim: string, level: string) => {
  expect(dim).toBe("trade_access");
  s.access = level;
});

Then("it starts with {int} traders", (s, n: number) => {
  expect(S.startingTraders(s.access, { ports: 1 })).toHaveLength(n);
});

Given(/^the country "([^"]+)" is (coastal with ports|inland)$/, (s, country: string, where: string) => {
  s.country = idOf(country);
  s.ports = where === "inland" ? 0 : 1;
  if (where !== "inland") expect(S.startPort(country).holder).toBe(s.country);
});

When("its starting traders are placed", (s) => {
  s.traders = S.startingTraders(S.catalogueRecord(s.country).assessments.trade_access!.level, { ports: s.ports });
});

Then(/^they are (trade ships|caravans)$/, (s, kind: string) => {
  expect(s.traders.length).toBeGreaterThan(0);
  for (const t of s.traders) expect(t).toBe(kind === "trade ships" ? "cog_junk_dhow" : "pack_caravan");
});

Given("the record {string} with a Sunni court over a Hindu majority", (s, id: string) => {
  s.id = id;
});

Then("Delhi's ruler's faith is Sunni and its people's majority faith is Hindu", (s) => {
  expect(S.startingFaiths(s.id)).toEqual({ ruler: "sunni", people: "hindu" });
});

Given("the country {string}", (s, country: string) => {
  s.country = country;
});

Then(/^it (can|can't) explore on the first turn$/, (s, can: string) => {
  expect(S.exploresAtStart(s.country)).toBe(can === "can");
});

// ---------------------------------------------------------------- province start

Given("the event-tree anchor {string}", (s, anchor: string) => {
  s.anchor = anchor;
});

Then(/^the province of "([^"]+)" starts with "(its market|its mine)"$/, (s, anchor: string, fixed: string) => {
  const standing = B.anchorsBy(1444).map((a) => a.id);
  const row = B.buildingsConfig.anchors.find((a) => a.province === anchor && standing.includes(a.id));
  expect(row).toBeDefined();
  expect(row!.building).toBe(fixed.replace("its ", ""));
});

Given("a province with wealth {int} in {string}", (s, wealth: number, region: string) => {
  const inventions = new Set(B.buildingsConfig.buildings.flatMap((b) => b.steps.map((x) => x.unlocked_by)).filter((x) => x !== "start"));
  s.r = B.createRealm("Realm", { treasury: 0, inventions });
  const uses = ["fields", "fields", "fields", "fields", "fields", "pasture", "pasture", "woods", "woods", "hills", "marsh", "waste"] as const;
  B.addProvince(s.r, "P", { townSize: "market_town", tiles: uses.map((use) => ({ use })), shoreTiles: 0, charters: new Set(["market charter"]) });
  s.wealth = wealth;
  s.region = region;
});

Then("a third of its tiles have a farm or a ranch", (s) => {
  const p = B.prov(s.r, "P");
  s.template = B.fillByTemplate(s.r, "P", S.townTemplate(s.region));
  const placed = B.placeByWealth(s.r, "P", s.wealth);
  expect(placed).toHaveLength(p.tiles.length / 3);
  for (const b of placed) expect(["farm", "ranch"]).toContain(b.type);
});

Then("every tile is built and town buildings are at step 2", (s) => {
  const p = B.prov(s.r, "P");
  s.template = B.fillByTemplate(s.r, "P", S.townTemplate(s.region));
  B.placeByWealth(s.r, "P", s.wealth);
  p.tiles.forEach((_, i) => expect(p.buildings.some((b) => b.place === `tile:${i + 1}`)).toBe(true));
  const town = p.buildings.filter((b) => b.place.startsWith("town:"));
  expect(town.length).toBeGreaterThan(0);
  for (const b of town) expect(b.step).toBe(Math.min(2, B.topStep(b.type)));
});

Then("its town slots fill by the {string} template", (s, template: string) => {
  expect(S.townTemplate(s.region)).toBe(template);
  expect(s.template.map((b: B.Building) => b.type)).toEqual(B.buildingsConfig.templates[template]!.map((t) => t.type));
  for (const b of s.template) expect(b.place).toMatch(/^town:/);
});

const TIERS: Record<string, string> = { "great port": "great", port: "port", "small harbour": "small", "canoe landing": "landing" };

Given("the 1444 port {string} of tier {string}", (s, town: string, tier: string) => {
  s.port = S.startPort(town);
  expect(s.port.tier).toBe(TIERS[tier]);
  expect(s.port.province).toMatch(/^p\d+$/);
});

Then(/^its province starts with (harbour 2|harbour 1|harbour 2 or harbour 1 if the town is small|no harbour, extra seafolk and small craft)$/, (s, what: string) => {
  const big = S.startHarbour(s.port.tier, false);
  const small = S.startHarbour(s.port.tier, true);
  if (what === "harbour 2 or harbour 1 if the town is small") expect([big.harbour, small.harbour]).toEqual([2, 1]);
  else if (what.startsWith("no harbour")) expect(big).toEqual({ harbour: 0, extraSeafolk: true, smallCraftOnly: true });
  else expect([big.harbour, small.harbour]).toEqual([Number(what.slice(-1)), Number(what.slice(-1))]);
});

Then("Castile has charted every province within {int} steps of its lands", (s, n: number) => {
  const g = realMap();
  s.chart = startChartedMap(g, idOf(s.country));
  const dist = landSteps(g, idOf(s.country), n + 1);
  s.within = [...dist].filter(([, d]) => d <= n).map(([id]) => id);
  for (const [id, d] of dist) expect(isCharted(s.chart, id)).toBe(d <= n);
});

Then("every sea zone touching them", (s) => {
  const g = realMap();
  const touching = new Set((s.within as string[]).flatMap((id) => g.byId.get(id)!.neighbors.filter((x) => isWater(g.byId.get(x)!))));
  expect(touching.size).toBeGreaterThan(0);
  for (const z of touching) expect(isCharted(s.chart, z)).toBe(true);
});

// ---------------------------------------------------------------- the 1444 map setup

Given("the map nation {string}", (s, id: string) => {
  s.nation = id;
});

When("the map setup is read", (s) => {
  s.source = S.nationSource(s.nation);
  s.built = loadDefaultRuleset().nations.find((n) => n.id === s.nation);
});

Then("it has the capital at longitude {float} and latitude {float}", (s, lon: number, lat: number) => {
  expect(s.source.capital).toEqual([lon, lat]);
  expect(s.built.capital).toMatch(/^p\d+$/);
});

Then("it has a colour and the commander {string} with might, cunning and logistics", (s, name: string) => {
  expect(s.built.color).toMatch(/^#[0-9a-f]{6}$/i);
  const c = s.built.commanders.find((x: { name: string }) => x.name === name);
  expect(c).toBeDefined();
  const src = s.source.commanders.find((x: { name: string }) => x.name === name);
  expect([c.might, c.cunning, c.logistics]).toEqual([src.might, src.cunning, src.logistics]);
});

Given("an owner rule giving modern {string} inside a box around Calais to {string}", (s, country: string, nation: string) => {
  s.rules = [{ nation, countries: [country], bbox: [1.5, 50.6, 2.2, 51.1] }];
  s.country = country;
});

Given("a later rule giving {string} in a larger box to {string}", (s, region: string, nation: string) => {
  s.rules.push({ nation, countries: [s.country], regions: [region], bbox: [1.5, 49.6, 4.3, 51.1] });
  s.region = region;
});

When("the map setup hands out provinces", (s) => {
  s.calais = S.matchOwner(s.rules, { country: s.country, admin1: "Pas-de-Calais", region: s.region, lon: 1.86, lat: 50.95 });
  s.lille = S.matchOwner(s.rules, { country: s.country, admin1: "Nord", region: s.region, lon: 3.06, lat: 50.63 });
});

Then("the Calais province belongs to England", (s) => {
  expect(s.calais).toBe("england");
  expect(s.lille).toBe("burgundy");
});

Given("a nation whose owner rules match no province", (s) => {
  s.rules = [{ nation: "lost_realm", countries: ["XXX"] }, { nation: "france", countries: ["FRA"] }];
  s.nations = [{ id: "france" }, { id: "lost_realm" }];
});

When("the map setup is built", (s) => {
  const owners = [{ country: "FRA", admin1: "", region: "", lon: 2, lat: 48 }].map((p) => S.matchOwner(s.rules, p));
  s.list = S.builtNations(s.nations, owners);
});

Then("that nation is not in the nation list", (s) => {
  expect(s.list.map((n: { id: string }) => n.id)).toEqual(["france"]);
});

Given("{string} and {string} are neighbours", (s, a: string, b: string) => {
  const g = realMap();
  const nb = new Map<string, Set<string>>();
  const count = new Map<string, number>();
  for (const p of g.places) {
    if (!p.owner) continue;
    count.set(p.owner, (count.get(p.owner) ?? 0) + 1);
    for (const n of p.neighbors) {
      const o = g.byId.get(n)?.owner;
      if (o && o !== p.owner) (nb.get(p.owner) ?? nb.set(p.owner, new Set()).get(p.owner)!).add(o);
    }
  }
  expect(nb.get(a)?.has(b)).toBe(true);
  s.pair = [a, b];
  s.neighbours = nb;
  s.sizes = count;
});

When("nation colours are chosen from the 32-colour palette", (s) => {
  expect(S.PALETTE).toHaveLength(32);
  const nations = loadDefaultRuleset().nations.map((n) => ({ id: n.id, provinces: s.sizes.get(n.id) ?? 0 }));
  s.colours = S.chooseColours(nations, s.neighbours);
});

Then("France and Burgundy have different colours", (s) => {
  const [a, b] = s.pair;
  expect(s.colours.get(a)).not.toBe(s.colours.get(b));
  for (const [n, set] of s.neighbours as Map<string, Set<string>>) for (const m of set) expect(s.colours.get(n)).not.toBe(s.colours.get(m));
  const built = loadDefaultRuleset().nations;
  expect(built.find((n) => n.id === a)!.color).not.toBe(built.find((n) => n.id === b)!.color);
});

Given("an owned {word} province of {int} km² in a region of density {int}", (s, ground: string, km2: number, density: number) => {
  s.pop = { ground, km2, density, owned: true, capital: false };
});

Given(/^it (is|is not) a capital$/, (s, is: string) => {
  s.pop.capital = is === "is";
});

When("its 1444 population is set", (s) => {
  s.population = S.startPopulation(s.pop);
  s.density = S.startDensity(s.pop);
});

Then("its population is about {int} thousand people before the spread of 0.7 to 1.3", (s, people: number) => {
  expect(s.population).toBe(people);
  expect(S.startPopulation({ ...s.pop, spread: 0.7 })).toBe(Math.round(people * 0.7));
  expect(() => S.startPopulation({ ...s.pop, spread: 1.4 })).toThrow();
});

Given("an unowned province in a region of density {int}", (s, density: number) => {
  s.pop = { ground: "grassland", km2: 10000, density, owned: false, capital: false };
});

Then("its density is at most {float} people per km²", (s, max: number) => {
  expect(s.density).toBeLessThanOrEqual(max);
  expect(s.density).toBe(max);
});

Given(/^a province in a region of wealth (\d+) that is (owned|unowned), (coastal|inland) and (not a capital|a capital)$/, (s, base: string, owned: string, coast: string, capital: string) => {
  s.wealthIn = { base: Number(base), owned: owned === "owned", coastal: coast === "coastal", capital: capital === "a capital" };
});

When("its 1444 wealth is set", (s) => {
  s.wealth = S.startWealth(s.wealthIn);
});

Then("its wealth is {int} before the spread of 0.75 to 1.25, kept between 1 and 10", (s, w: number) => {
  expect(s.wealth).toBe(w);
  expect(S.startWealth({ ...s.wealthIn, spread: 1.25 })).toBeLessThanOrEqual(10);
  expect(S.startWealth({ ...s.wealthIn, spread: 0.75 })).toBeGreaterThanOrEqual(1);
});

Given(/^an (owned|unowned) province that is (.+)$/, (s, owned: string, situation: string) => {
  const m = /with (\d+) thousand people/.exec(situation);
  s.castleIn = {
    owned: owned === "owned",
    capital: situation === "its nation's capital",
    population: m ? Number(m[1]) : 50,
    frontier: situation.startsWith("on a frontier"),
    ground: /in hills/.test(situation) ? "hills" : "farmland",
    roll: 0.99,
  } satisfies S.CastleInput;
});

When("its 1444 walls are set", (s) => {
  s.walls = S.startCastle(s.castleIn);
});

Then(/^it has (a stone castle|an earthwork ring fort|no walls)$/, (s, walls: string) => {
  expect(s.walls).toBe(walls === "a stone castle" ? "castle" : walls === "no walls" ? null : "fort");
  if (walls === "no walls") for (const roll of [0, 0.5]) expect(S.startCastle({ ...s.castleIn, roll, capital: true })).toBeNull();
});

// ---------------------------------------------------------------- choosing a realm

Given("the player has not bought the full game", (s) => {
  s.picker = S.newPicker(false);
});

When("the realm picker lists {string}", (s, realm: string) => {
  s.state = S.realmState(realmId(realm), s.picker.ownsFullGame);
});

Then(/^"([^"]+)" is (playable|locked)$/, (s, _realm: string, state: string) => {
  expect(s.state).toBe(state);
});

Given("the player starts the tutorial", (s) => {
  s.tutorial = true;
});

When("the tutorial campaign begins", (s) => {
  s.campaign = S.beginCampaign(1444, S.TUTORIAL_REALM, DEFAULT_RULES, new Rng(1));
});

Then("the player's realm is the Ottomans", (s) => {
  expect(s.campaign.nation).toBe(realmId("Ottomans"));
  expect(S.realmState(s.campaign.nation, false)).toBe("playable");
});

Given("the player taps the realm {string}", (s, realm: string) => {
  s.tap = S.tapRealm(s.picker, realmId(realm));
  expect(s.tap.locked).toBe(true);
});

When("the player buys the full game from its Unlock button", (s) => {
  S.openUnlock(s.picker);
  expect(s.picker.screen).toBe("unlock");
  S.purchaseDone(s.picker, true);
});

Then("the realm picker returns with {string} chosen and unlocked", (s, realm: string) => {
  expect(s.picker.screen).toBe("picker");
  expect(s.picker.chosen).toBe(realmId(realm));
  expect(S.realmState(s.picker.chosen, s.picker.ownsFullGame)).toBe("playable");
});

Given("the realm picker at world zoom", (s) => {
  s.realms = loadDefaultRuleset()
    .nations.filter((n) => S.hasRecord(n.id))
    .map((n) => ({ id: n.id, region: S.catalogueRecord(n.id).region }));
});

When(/^the player filters by "(region|free or locked)"$/, (s, filter: string) => {
  s.filter = filter === "region" ? ({ by: "region", region: "eu_france" } as const) : ({ by: "free_or_locked", state: "playable" } as const);
  s.offered = S.filterRealms(s.realms, s.filter, false);
});

Then("only realms matching {string} are offered", (s, _f: string) => {
  expect(s.offered.length).toBeGreaterThan(0);
  expect(s.offered.length).toBeLessThan(s.realms.length);
  for (const r of s.offered as S.RealmCard[]) {
    if (s.filter.by === "region") expect(r.region).toBe("eu_france");
    else expect(S.realmState(r.id, false)).toBe("playable");
  }
});

Given("the player chooses difficulty, AI temper, fog, historical events, ironman and the end date on the new campaign screen", (s) => {
  s.rules = { difficulty: "hard", ai_temper: "aggressive", fog: true, events: "historical", ironman: true, end_date: "1821-12-31" } satisfies S.CampaignRules;
  expect(Object.keys(s.rules).sort()).toEqual([...S.CAMPAIGN_RULE_FIELDS].sort());
});

When("the campaign begins", (s) => {
  s.campaign = S.beginCampaign(7, "france", s.rules, new Rng(99));
});

Then("the rules are saved with the campaign", (s) => {
  expect(s.campaign.rules).toEqual(s.rules);
  s.rules.difficulty = "easy";
  expect(s.campaign.rules.difficulty).toBe("hard");
});

Then("Pause, Campaign rules shows them read-only", (s) => {
  const view = S.campaignRulesView(s.campaign);
  expect(view.editable).toBe(false);
  expect(() => {
    (view.rules as S.CampaignRules).ironman = false;
  }).toThrow();
});

Given("the player chose {string} and the default rules", (s, realm: string) => {
  s.nation = realmId(realm);
  s.rules = { ...DEFAULT_RULES };
  expect(s.rules.end_date).toBe("1939-08-31");
});

When("the player taps Begin", (s) => {
  const host = createEngineHost(loadDefaultRuleset);
  s.reply = host({ id: 1, type: "newGame", seed: 1444, playerNation: s.nation });
  s.campaign = S.beginCampaign(1444, s.nation, s.rules, new Rng(12345));
  s.other = S.beginCampaign(1444, s.nation, s.rules, new Rng(54321));
});

Then("the engine starts a new game from a seed, the player's nation and the options", (s) => {
  expect(s.reply.response.type).toBe("snapshot");
  expect([s.campaign.seed, s.campaign.nation, s.campaign.rules]).toEqual([1444, s.nation, s.rules]);
});

Then("the campaign gets a new random id", (s) => {
  expect(s.campaign.id).toMatch(/^[0-9a-f]{32}$/);
  expect(s.other.id).not.toBe(s.campaign.id);
});

Given("a campaign as {string}", (s, realm: string) => {
  s.campaign = S.beginCampaign(1, realmId(realm), DEFAULT_RULES, new Rng(3));
});

When("it is saved", (s) => {
  s.header = S.saveHeader(s.campaign);
});

Then(/^the header records the nation "([^"]+)" and that it (doesn't need|needs) the full game$/, (s, realm: string, needs: string) => {
  expect(s.header).toEqual({ nation: realmId(realm), needsFullGame: needs === "needs" });
});

Given("the player last tapped {string} and used normal difficulty", (s, realm: string) => {
  s.last = { tapped: realmId(realm), options: { ...DEFAULT_RULES, difficulty: "normal", ironman: true } };
});

When("the player taps Quick start", (s) => {
  s.quick = S.quickStart(s.last, ["ottomans"], { ...DEFAULT_RULES, difficulty: "easy" });
});

Then("the Begin step shows {string} with the last options used", (s, realm: string) => {
  expect(s.quick).toEqual({ step: "begin", realm: realmId(realm), rules: s.last.options });
  expect(S.quickStart({ tapped: null, options: null }, ["ottomans"], DEFAULT_RULES).realm).toBe("ottomans");
});

// ---------------------------------------------------------------- decided rules (D-SETUP-1 … D-SETUP-17)

When("it is matched to the catalogue", (s) => {
  s.matched = S.catalogueIdOf(s.nation);
});

Then("it is the record {string}", (s, record: string) => {
  if (record === "none") expect(s.matched).toBeNull();
  else {
    expect(s.matched).toBe(record);
    expect(S.hasRecord(record)).toBe(true);
  }
});

Given("the map's {int} nations", (s, n: number) => {
  // The sleeping realms come after the map's nations and are not on the 1444 map (SETUP-080).
  s.nations = loadDefaultRuleset().nations.filter((x) => !x.asleep);
  expect(s.nations).toHaveLength(n);
});

Then("every map nation is a realm with provinces, a capital, a colour and commanders", (s) => {
  const provinces = loadDefaultRuleset().provinces;
  for (const n of s.nations) {
    const owned = provinces.filter((p) => p.owner === n.id).length;
    expect(S.isRealm(owned)).toBe(true);
    expect(n.capital).toBeTruthy();
    expect(n.color).toBeTruthy();
    expect(n.commanders.length).toBeGreaterThan(0);
  }
});

Then("every map nation is playable", (s) => {
  for (const n of s.nations) expect(S.realmState(n.id, true)).toBe("playable");
});

Then("{int} of them are catalogue ids and the other {int} go through the rename table", (s, same: number, other: number) => {
  const ids: string[] = s.nations.map((n: { id: string }) => n.id);
  expect(ids.filter((id) => S.hasRecord(id))).toHaveLength(same);
  const renamed = ids.filter((id) => !S.hasRecord(id));
  expect(renamed).toHaveLength(other);
  for (const id of renamed) expect(S.catalogueIdOf(id) === null || S.hasRecord(S.catalogueIdOf(id)!)).toBe(true);
});

Given("a coastal province owned by no country", (s) => {
  s.owner = null;
});

Given("a coastal province owned by the realm {string}", (s, realm: string) => {
  s.owner = realmId(realm);
});

When("a colonial governor of {string} tries to found a colony there", (s, _who: string) => {
  s.colony = S.colonisable(s.owner);
});

Then(/^the colony (can be founded on free tiles|can't be founded)$/, (s, result: string) => {
  expect(s.colony).toBe(result.startsWith("can be"));
});

Given("the catalogue record {string} owns no map province", (s, id: string) => {
  expect(S.hasRecord(id)).toBe(true);
  s.owned = loadDefaultRuleset().provinces.filter((p) => p.owner === id).length;
  expect(s.owned).toBe(0);
});

Then("it is reference data and not a realm", (s) => {
  expect(S.isRealm(s.owned)).toBe(false);
});

let startWorld: ReturnType<typeof createWorld> | undefined;
Then("the realm's administrative capacity is {int}", (s, rank: number) => {
  const w = (startWorld ??= createWorld(loadDefaultRuleset(), 1444));
  expect(w.nationAdminCapacity[w.nationIndex.get(s.nation)!]).toBe(rank);
});

Given("an assessment at {string}", (s, level: string) => {
  s.level = level;
});

When("its factor is read", (s) => {
  s.factor = S.levelFactor(s.level);
});

Then(/^the base start value is multiplied by ([\d.]+)$/, (s, text: string) => {
  const f = Number(text);
  expect(s.factor).toBe(f);
  expect(S.startValue(100, s.level, "high", new Rng(1))).toBeCloseTo(100 * f);
});

Given("the config values {string} {int}, {string} {int} and {string} {float}", (s, _a: string, gold: number, _b: string, men: number, _c: string, horse: number) => {
  const d = loadDefaultRuleset().defines;
  expect([d.economy.startingTreasury, d.levies.menPerThousandPeople, d.march.startingHorseShare]).toEqual([gold, men, horse]);
});

When("a new campaign starts", (s) => {
  s.world = createWorld(loadDefaultRuleset(), 1);
});

Then("every nation with no catalogue assessment has {int} gold", (s, gold: number) => {
  const w = s.world;
  for (const n of loadDefaultRuleset().nations) if (!n.asleep && S.catalogueIdOf(n.id) === null) expect(w.nationTreasury[w.nationIndex.get(n.id)]).toBe(gold);
});

Then("its levies are {int} men per thousand people", (s, per: number) => {
  const w = s.world;
  // Each province's recruit ceiling, royal land and lords' land alike (a lord's fills his retinue, WAR-252).
  let total = 0;
  let people = 0;
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] >= 0) (total += w.provinceRecruitCeiling[p], (people += w.provincePopulation[p]));
  expect(total).toBeCloseTo(people * per);
});

Then("its starting armies are one fifth horse", (s) => {
  const a = s.world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i]) expect(a.horse[i]).toBe(Math.round(a.men[i] * 0.2));
});

Given("the record {string} has the assessment {string} at {string}", (s, id: string, dim: string, level: string) => {
  const r = S.catalogueRecord(id);
  expect(r.assessments[dim]!.level).toBe(level);
  s.level = level;
});

Then("its starting {string} follows that level", (s, _stat: string) => {
  expect(S.startValue(10, s.level, "high", new Rng(1))).toBeCloseTo(10 * S.levelFactor(s.level));
});

Given("the starting traders and their routes", (s) => {
  s.campaign = TIME.newCampaign(loadDefaultRuleset(), 1444);
  s.trade = T.createTradeWorld();
  s.rngStart = Array.from(s.campaign.world.rng.state as Uint32Array);
});

Then("the traders are run for {int} months before the first turn", (s, months: number) => {
  let ran = 0;
  TIME.warmUp(s.campaign, months, (rng) => (ran += T.warmUp(s.trade, () => void rng.next(), 1)));
  expect(ran).toBe(months);
  expect(s.trade.month).toBeGreaterThanOrEqual(0);
});

Then("the trade ratios they leave are the starting ratios", (s) => {
  expect(s.trade.provinces).toBeInstanceOf(Map);
  expect(s.campaign.world.turn).toBe(0);
});

Then("the warm-up used the campaign's seed and left the date at 11 November 1444", (s) => {
  expect(Array.from(s.campaign.world.rng.state as Uint32Array)).not.toEqual(s.rngStart);
  expect(s.campaign.world.date).toMatchObject({ year: 1444, month: 11 });
  expect(TIME.START_DAY).toBe(11);
});

Given("a catalogue risk tolerance of {string}", (s, level: string) => {
  s.riskLevel = level;
});
When("the AI reads it", (s) => {
  s.risk = S.riskTolerance(s.riskLevel);
});
Then("its risk tolerance is {string}", (s, read: string) => {
  expect(s.risk).toBe(read);
});

// ---------------------------------------------------------------- difficulty (SETUP-099 to SETUP-103)

/** A new game through the engine host, as the client starts one. */
function hostGame(s: Scenario, nation: string, difficulty?: string): void {
  s.host = createEngineHost(loadDefaultRuleset);
  s.nation = realmId(nation);
  const r = s.host({ id: 1, type: "newGame", seed: 7, playerNation: s.nation, ...(difficulty === undefined ? {} : { difficulty }) }).response;
  if (r.type !== "snapshot") throw new Error(r.type);
  s.snapshot = r.snapshot;
  s.difficulty = difficulty;
  // The same new game as a world of its own, for the rules the host does not show.
  const w = createWorld(loadDefaultRuleset(), 7);
  setPlayer(w, w.nationIndex.get(s.nation)!);
  setDifficulty(w, difficulty);
  s.game = w;
}

function saveAndOpen(s: Scenario): void {
  const campaign = { campaignId: "c1", playerNation: s.nation, nationName: s.nation, ironman: false, options: { difficulty: s.difficulty ?? "normal", events: "historical", endDate: "1939-08-31" }, modified: false, playSeconds: 60 };
  const saved = s.host({ id: 2, type: "save", kind: "manual", campaign, device: "test", platform: "web", gameVersion: "0", listing: [], now: 1000 }).response;
  if (saved.type !== "saved") throw new Error(saved.type === "error" ? saved.message : saved.type);
  const back = s.host({ id: 3, type: "load", bytes: saved.bytes }).response;
  if (back.type !== "snapshot") throw new Error(back.type === "error" || back.type === "refused" ? back.message : back.type);
  s.snapshot = back.snapshot;
}

Given("a new campaign as {string} on {string} difficulty", (s, nation: string, level: string) => hostGame(s, nation, level));
Given("a new campaign as {string} saved before difficulty was kept", (s, nation: string) => {
  hostGame(s, nation, "hard");
  // A world from before difficulty was kept: its campaign record had no difficulty.
  const { difficulty: _, ...old } = saveCampaignEnd(s.game);
  s.oldSave = old;
});
When("the campaign is saved and opened again", (s) => saveAndOpen(s));
When("the campaign is opened from that save", (s) => {
  restoreCampaignEnd(s.game, s.oldSave, (n) => n);
  s.snapshot = { campaign: campaignView(s.game) };
});
Then("the campaign plays on {string} difficulty", (s, level: string) => {
  expect(s.snapshot.campaign.difficulty).toBe(level);
});

Then("the AI's war chance, AI income paid in and the player's rising chance are each multiplied by 1", (s) => {
  expect(S.difficultyEffects(s.game.campaign.difficulty)).toEqual({ ai_war_chance: 1, ai_income: 1, player_rising_chance: 1 });
  const ai = s.game.nationIndex.get("castile")!;
  expect(aiWarChanceFactor(s.game)).toBe(1);
  expect(incomePaidIn(s.game, ai, 37.5)).toBe(37.5);
  expect(risingChanceByDifficulty(s.game, s.game.campaign.playerLands[0]!, 0.05)).toBe(0.05);
});

/** New wars the AI declares in one monthly look when every roll comes out at `roll`. */
function warsAtRoll(s: Scenario, roll: number): number {
  const w = createWorld(loadDefaultRuleset(), 7);
  setPlayer(w, w.nationIndex.get(s.nation)!);
  setDifficulty(w, s.game.campaign.difficulty);
  w.rng.next = () => roll;
  const before = w.diplomacy.wars.length;
  aiDeclarations(w, []);
  return w.diplomacy.wars.length - before;
}
Then("the AI's monthly chance to look for a war is {float} times the balanced chance", (s, factor: number) => {
  const balanced = loadDefaultRuleset().defines.war.aiDeclareChancePerMonth;
  expect(aiWarChanceFactor(s.game)).toBe(factor);
  // A roll just under the scaled chance starts more wars than one just over it, so the chance is where the factor puts it.
  expect(warsAtRoll(s, balanced * factor * 0.999)).toBeGreaterThan(warsAtRoll(s, balanced * factor * 1.001));
});

When("a new month pays each realm's income into its treasury", (s) => {
  s.before = Float64Array.from(s.game.nationTreasury);
  runLedger(s.game, true);
});
const gained = (s: Scenario, realm: string) => {
  const n = s.game.nationIndex.get(realmId(realm))!;
  return { gain: s.game.nationTreasury[n] - s.before[n], income: s.game.nationMonthlyIncome[n] as number };
};
Then("the treasury of {string} gains {float} times its monthly income", (s, realm: string, factor: number) => {
  const { gain, income } = gained(s, realm);
  expect(income).toBeGreaterThan(0);
  expect(gain).toBeCloseTo(income * factor, 6);
});
Then("the treasury of {string} gains its monthly income", (s, realm: string) => {
  const { gain, income } = gained(s, realm);
  expect(gain).toBeCloseTo(income, 6);
});

Given("a province of {string} and a province of {string} each have {int} grievances", (s, mine: string, theirs: string, count: number) => {
  const w = s.game;
  const first = (realm: string) => {
    const n = w.nationIndex.get(realmId(realm));
    return w.provinceOwner.findIndex((o: number, p: number) => o === n && !w.provinceWater[p]);
  };
  const plain = GRIEVANCES.filter((g) => g !== "Heavy taxes" && g !== "Persecuted").slice(0, count);
  const bits = plain.reduce((g, name) => g | (1 << GRIEVANCES.indexOf(name)), 0);
  s.plotting = new Map<string, number>();
  for (const realm of [mine, theirs]) {
    const p = first(realm);
    w.provinceGrievances[p] = bits;
    s.plotting.set(realm, p);
  }
});
/** The province's chance as the same world plays it on normal. */
function balancedChance(s: Scenario, p: number): number {
  const level = s.game.campaign.difficulty;
  setDifficulty(s.game, "normal");
  const chance = risingChanceIn(s.game, p);
  setDifficulty(s.game, level);
  return chance;
}
Then("the province of {string} rises with {float} times its balanced chance", (s, realm: string, factor: number) => {
  const p = s.plotting.get(realm);
  const balanced = balancedChance(s, p);
  expect(balanced).toBeGreaterThan(0);
  expect(risingChanceIn(s.game, p)).toBeCloseTo(Math.min(1, balanced * factor), 9);
});
Then("the province of {string} rises with its balanced chance", (s, realm: string) => {
  const p = s.plotting.get(realm);
  expect(risingChanceIn(s.game, p)).toBe(balancedChance(s, p));
});
