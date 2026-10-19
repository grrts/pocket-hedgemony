// African starts (scenario-setup spec §5.8, X-20): the catalogue's African
// records on the 1444 map, read from the built map and the build's report.
import { expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld } from "@ph/engine";
import * as S from "@ph/engine/domain/scenario-setup";
import { grownAtBuild, leftOutAtBuild } from "@ph/engine/domain/tribes";
import { subjectTies } from "../../engine/src/subjects.ts";
import { formOf } from "../../engine/src/government.ts";
import { assignOwners, type NationSource } from "../../../tools/mapgen/owners.ts";
import sources from "../../rules/data/scenarios/1444/map-nations.json" with { type: "json" };
import setupConfig from "../../rules/data/domain/scenario-setup.json" with { type: "json" };
import provinceConfig from "../../rules/data/domain/province.json" with { type: "json" };
import buildingsConfig from "../../rules/data/domain/buildings.json" with { type: "json" };
import worldMap from "../../rules/data/domain/world-map.json" with { type: "json" };
import { startPorts as ports } from "@ph/rules/start";
import names from "../../rules/data/names.json" with { type: "json" };
import { steps } from "../src/registry.ts";

const { Given, When, Then } = steps("scenario-setup");

const rules = loadDefaultRuleset();
const land = () => rules.provinces.filter((p) => !p.id.startsWith("sea"));
const byId = new Map(rules.provinces.map((p) => [p.id, p]));
const nationOf = (id: string) => rules.nations.find((n) => n.id === id);
const ownedBy = (id: string) => land().filter((p) => p.owner === id);
const source = (id: string) => (sources as unknown as NationSource[]).find((n) => n.id === id);
const REPRESENTATION: Record<string, string> = {
  "playable country": "playable_country",
  "playable subject": "playable_subject",
  "decentralised polity": "decentralized_polity",
  "non-state actor": "non_state_actor",
};

let world: ReturnType<typeof createWorld> | undefined;
const startWorld = () => (world ??= createWorld(rules, 1444));

// ---------------------------------------------------------------- which records are realms

Given(/^the catalogue record "([^"]+)" of the region "([^"]+)" is a (playable country|playable subject)$/, (s, id: string, region: string, rep: string) => {
  const r = S.catalogueRecord(id);
  expect(r.region).toBe(region);
  expect(r.representation).toBe(REPRESENTATION[rep]);
  s.id = id;
});

Then("{string} is a realm on the map with a capital, a colour and a commander", (_s, id: string) => {
  const n = nationOf(id)!;
  expect(n, id).toBeDefined();
  expect(byId.get(n.capital)!.owner).toBe(id);
  expect(n.color).toMatch(/^#[0-9a-f]{6}$/);
  expect(n.commanders.length).toBeGreaterThan(0);
  expect(source(id)!.capitalFrom, "where the capital was read").toBeTruthy();
});

Given(/^the catalogue record "([^"]+)" is a (decentralised polity|non-state actor) with a homeland on unowned land$/, (s, id: string, rep: string) => {
  expect(S.catalogueRecord(id).representation).toBe(REPRESENTATION[rep]);
  expect(source(id)!.grows).toBe(true);
  s.id = id;
});

Then("{string} is a realm on the map", (_s, id: string) => {
  expect(ownedBy(id).length).toBeGreaterThan(0);
});

Then("its start form comes from the start-form rules", (s) => {
  const f = S.startForm(S.startFormRecord(s.id));
  expect(S.NEVER_START_FORMS).not.toContain(f.form);
  const n = startWorld().nationIndex.get(s.id)!;
  expect(formOf(startWorld(), n)).toBe(f.form);
});

Given(/^the catalogue record "([^"]+)" is (a migration non-state actor|background only)$/, (s, id: string, kind: string) => {
  const r = S.catalogueRecord(id);
  if (kind === "background only") expect(r.representation).toBe("background_only");
  else {
    expect(r.representation).toBe("non_state_actor");
    expect(setupConfig.africa.reference_only).toContain(id);
  }
  s.id = id;
});

Then("{string} is reference data and not a realm", (_s, id: string) => {
  expect(nationOf(id)).toBeUndefined();
  expect(S.isRealm(ownedBy(id).length)).toBe(false);
});

// ---------------------------------------------------------------- subjects

Given("the relations file names {string} as the overlord of {string}", (s, overlord: string, subject: string) => {
  expect(S.startingRelations(overlord).subjects).toContain(subject);
  s.pair = [subject, overlord];
});

Then("{string} is a subject of {string}", (_s, subject: string, overlord: string) => {
  const w = startWorld();
  const tie = subjectTies(w).find((t) => w.nationIds[t.s] === subject);
  expect(tie, subject).toBeDefined();
  expect(w.nationIds[tie!.o]).toBe(overlord);
});

// ---------------------------------------------------------------- land

const LEVEL: Record<string, string> = { "very low": "very_low", low: "low", moderate: "moderate", high: "high", "very high": "very_high", unknown: "unknown" };

Given(/^the new African nation "([^"]+)" has manpower potential "([^"]+)" and no owner rule$/, (s, id: string, level: string) => {
  expect(S.catalogueRecord(id).assessments.manpower_potential!.level).toBe(LEVEL[level]);
  expect(source(id)!.grows).toBe(true);
  expect(source(id)!.land).toBeUndefined();
  s.id = id;
});

Then("{string} owns {int} provinces, all of them unowned before", (_s, id: string, n: number) => {
  expect(ownedBy(id)).toHaveLength(n);
  expect(grownAtBuild()[id]).toEqual({ wanted: n, got: n });
});

Then("each of them is joined to its capital through its own land", (s) => {
  const mine = new Set(ownedBy(s.id).map((p) => p.id));
  const seen = new Set([nationOf(s.id)!.capital]);
  const queue = [...seen];
  while (queue.length) for (const nb of byId.get(queue.pop()!)!.neighbors) if (mine.has(nb) && !seen.has(nb)) seen.add(nb), queue.push(nb);
  expect(seen.size).toBe(mine.size);
});

// Two capitals on a made-up map: A and B border the shared province C, which has the most people.
Given("two new African nations whose capitals border the same unowned province", (s) => {
  const p = (id: string, size: number, neighbors: string[]) => ({ id, name: id, country: "XXX", admin1: "", region: "", lon: 0, lat: 0, x: 0, y: 0, size, coastal: false, terrain: "savanna", neighbors });
  s.provinces = [p("p1", 10, ["p3", "p4"]), p("p2", 10, ["p3", "p5"]), p("p3", 900, ["p1", "p2"]), p("p4", 10, ["p1"]), p("p5", 20, ["p2"])];
  s.nations = [
    { id: "first", name: "First", capital: [1, 0], grows: true },
    { id: "second", name: "Second", capital: [2, 0], grows: true },
  ];
});

Then("the nation with the lower nation index takes it in the first round", (s) => {
  const config = { settlement: [], defaultDensity: 0.8, defaultWealth: 1, pxPerDeg: 16, palette: ["#000000", "#ffffff"] };
  const out = assignOwners(s.provinces, s.nations, [], config, (lon) => `p${lon}`, { sizeOf: () => 2, subSaharan: () => false, stoneCastles: new Set() });
  s.owner = Object.fromEntries(out.provinces.map((p) => [p.id, p.owner]));
  expect(s.owner.p3).toBe("first");
});

Then("the other nation takes another unowned neighbour in the same round", (s) => {
  expect(s.owner.p5).toBe("second");
  expect(s.owner.p4).toBeNull();
});

Given("an owner rule of the new nation {string} names the province a broad rule gives {string}", (s, id: string, broad: string) => {
  const rule = source(id)!.land![0]!;
  const p = land().find((q) => q.owner === id)!;
  s.province = p.id;
  s.id = id;
  s.broad = broad;
  expect(rule.bbox).toBeDefined();
});

Then("{string} owns that province and {string} keeps its capital", (s, id: string, broad: string) => {
  expect(byId.get(s.province)!.owner).toBe(id);
  expect(byId.get(nationOf(broad)!.capital)!.owner).toBe(broad);
});

Then("every province keeps the id it had before the new nations were added", () => {
  // The province facts read from the built images and the 1444 port list name provinces by id.
  expect(land()).toHaveLength(worldMap.provinceFacts.size.length);
  for (const t of ports.towns as { province: string | null; province_name?: string }[]) if (t.province && t.province_name) expect(byId.get(t.province)!.name).toBe(t.province_name);
});

Given("the catalogue record {string} has its capital in a province the realm {string} owns", (s, id: string, owner: string) => {
  const l = leftOutAtBuild().find((x) => x.id === id);
  expect(l, id).toBeDefined();
  expect(l!.owner).toBe(owner);
  expect(byId.get(l!.capital)!.owner).toBe(owner);
  s.id = id;
});

Given("no owner rule gives {string} land", (_s, id: string) => {
  expect(source(id)!.land).toBeUndefined();
});

Then("the map build's report lists {string}", (_s, id: string) => {
  const report = JSON.parse(readFileSync(new URL("../../rules/data/domain/scenario-setup-report.json", import.meta.url), "utf8"));
  expect(report.left_out.map((l: { id: string }) => l.id)).toContain(id);
});

Given("a sub-Saharan coastal province that no new nation reached", (s) => {
  const p = land().find((q) => q.owner === null && q.coastal && q.x! / 16 - 180 > -18 && 78 - q.y! / 16 < 10 && 78 - q.y! / 16 > -34);
  expect(p).toBeDefined();
  s.province = p!.id;
});

Then("it is owned by no country and has no castle", (s) => {
  const p = byId.get(s.province)!;
  expect(p.owner).toBeNull();
  expect(p.castle).toBeUndefined();
});

Then("a colonial governor may found a colony there on its free tiles", (s) => {
  expect(S.colonisable(byId.get(s.province)!.owner)).toBe(true);
});

Given("the new African nation {string}", (s, id: string) => {
  expect(source(id)!.grows).toBe(true);
  s.id = id;
});

Then("its colour is not taken by a neighbouring nation", (s) => {
  const colour = nationOf(s.id)!.color;
  const mine = new Set(ownedBy(s.id).map((p) => p.id));
  const neighbours = new Set(ownedBy(s.id).flatMap((p) => p.neighbors.map((nb) => byId.get(nb)!.owner)).filter((o): o is string => !!o && o !== s.id));
  expect(mine.size).toBeGreaterThan(0);
  for (const n of neighbours) expect(nationOf(n)!.color, n).not.toBe(colour);
});

Then("it has one commander named from its tongue's name list", (s) => {
  expect(nationOf(s.id)!.commanders).toHaveLength(1);
  const culture = (names.nations as Record<string, string>)[s.id];
  expect(culture, "a name list of its own people").toBeDefined();
  expect(culture).not.toBe(names.fallback);
});

// ---------------------------------------------------------------- castles, gold and towns

Given(/^the sub-Saharan province (.+)$/, (s, which: string) => {
  const capital = /^that is the capital of "([^"]+)"$/.exec(which);
  const stone = /^that an anchor names as the stone castle "([^"]+)"$/.exec(which);
  if (capital) s.province = nationOf(capital[1]!)!.capital;
  else if (stone) {
    const c = (setupConfig.africa.sub_saharan_castles.stone_castles as string[]).includes(stone[1]!);
    expect(c).toBe(true);
    const anchor = { "Great Zimbabwe": "Masvingo", Kilwa: "Lindi", Mombasa: "Coast" }[stone[1]!]!;
    s.province = land().find((p) => p.name === anchor)!.id;
  } else {
    const m = /^on a frontier with (\d+) thousand people$/.exec(which)!;
    s.castleIn = { owned: true, capital: false, population: Number(m[1]), frontier: true, ground: "hills", roll: 0.5, subSaharan: true } satisfies S.CastleInput;
  }
});

Then("its castle is {}", (s, castle: string) => {
  if (s.castleIn) {
    expect(castle).toBe("none or an old ring fort");
    for (const roll of [0, 0.5, 0.99]) expect([null, "fort"]).toContain(S.startCastle({ ...s.castleIn, roll }));
    expect(S.startCastle({ ...s.castleIn, roll: 0.99 })).toBeNull();
    return;
  }
  const want = { "an earthwork ring fort": "fort", "a stone castle": "castle" }[castle];
  expect(byId.get(s.province)!.castle).toBe(want);
});

const ANCHOR_PROVINCES: Record<string, string> = { Bambuk: "South Kayes", Bure: "Siguiri", Timbuktu: "Southeast Timbuktu", Kilwa: "Lindi" };

Given("the geography anchor {string}", (s, place: string) => {
  s.place = place;
  s.provinceName = ANCHOR_PROVINCES[place];
  expect(s.provinceName).toBeDefined();
});

Then(/^the province of "([^"]+)" has (a gold mine|a Sahel trade town|its 1444 port tier and a stone castle)$/, (s, place: string, what: string) => {
  const p = land().find((q) => q.name === s.provinceName)!;
  if (what === "a gold mine") {
    const a = (provinceConfig.mines.anchors as Record<string, { ware: string }>)[p.name];
    expect(a?.ware).toBe("gold");
  } else if (what === "a Sahel trade town") {
    const a = (buildingsConfig.anchors as { province: string; building: string; town?: string }[]).find((x) => x.province === p.name);
    expect(a?.building).toBe("market");
    expect(a?.town).toBe(S.townTemplate("the Sahel"));
  } else {
    const port = (ports.towns as { name: string; tier: string; province: string | null }[]).find((t) => t.name === place);
    expect(port?.province).toBe(p.id);
    expect(port?.tier).toBeTruthy();
    expect(p.castle).toBe("castle");
  }
});

// ---------------------------------------------------------------- the same rules

Given("the new African nation {string} and the realm {string} with the same assessments", (s, a: string, b: string) => {
  s.pair = [a, realmIdOf(b)];
});

const realmIdOf = (name: string) => rules.nations.find((n) => n.name === name || n.id === name)!.id;

Then("both get their starting counts from the same factors", (s) => {
  for (const level of ["very_low", "low", "moderate", "high", "very_high"] as const) expect(S.levelFactor(level)).toBeGreaterThan(0);
  expect(S.catalogueIdOf(s.pair[0])).toBe(s.pair[0]);
});

Then("neither has a bonus or penalty of its own", () => {
  // Nothing in the start config is keyed by an African realm: the African block holds only map rules.
  expect(Object.keys(setupConfig.africa).sort()).toEqual(["$comment", "reference_only", "regions", "size_by_manpower", "sub_saharan_castles"]);
});
