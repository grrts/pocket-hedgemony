// Tribes (tribes spec §5.1): tribal realms and the new tribes of 1444, read
// from the built map and the build's report.
import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as S from "@ph/engine/domain/scenario-setup";
import { grownAtBuild, isTribalRealm, leftOutAtBuild, newTribeProvinces, newTribeRecords, tribesConfig } from "@ph/engine/domain/tribes";
import { startFaiths, startTongues } from "../../engine/src/peoples.ts";
import sources from "../../../tools/mapgen/nations-1444.json" with { type: "json" };
import { steps } from "../src/registry.ts";

const { Given, When, Then } = steps("tribes");

const rules = loadDefaultRuleset();
const ownedBy = (id: string) => rules.provinces.filter((p) => p.owner === id);
const realmOf = (name: string) => rules.nations.find((n) => n.name === name || n.id === name.toLowerCase());
const formId = (name: string) => name.toLowerCase().replace(/ /g, "_");

// ---------------------------------------------------------------- which realms are tribal

Given("the country {string} has the form {string}", (s, realm: string, form: string) => {
  s.realm = realm;
  s.form = formId(form);
});

Given("the capital of {string} lies in the region {string}", (s, _realm: string, region: string) => {
  s.region = region;
});

Then(/^"([^"]+)" is a tribal realm: (yes|no)$/, (s, _realm: string, tribal: string) => {
  expect(isTribalRealm(s.form, s.region)).toBe(tribal === "yes");
});

// ---------------------------------------------------------------- the new tribes

Given(/^the catalogue record "([^"]+)" of region "([^"]+)" is a "([^"]+)"(?: of tier (\w))?$/, (s, id: string, region: string, rep: string, tier?: string) => {
  const r = S.catalogueRecord(id);
  expect(r.region).toBe(region);
  expect(r.representation).toBe(rep);
  if (tier) expect(r.tier).toBe(tier);
  s.id = id;
});

Given("the record {string} existed on 11 November 1444", (_s, id: string) => {
  expect(newTribeRecords().map((r) => r.id)).toContain(id);
});

Given("the home province of {string} is owned by no realm", (_s, id: string) => {
  expect(leftOutAtBuild().map((l) => l.id)).not.toContain(id);
  const home = (sources as { id: string; grows?: boolean }[]).find((n) => n.id === id);
  expect(home?.grows).toBe(true);
});

When("a campaign starts", () => {});

Then("{string} is a realm on the map with {int} provinces", (_s, id: string, n: number) => {
  expect(ownedBy(id)).toHaveLength(n);
  expect(grownAtBuild()[id]!.wanted).toBe(newTribeProvinces(S.catalogueRecord(id).tier));
});

Then("{string} is not a realm on the map", (_s, id: string) => {
  expect(rules.nations.find((n) => n.id === id)).toBeUndefined();
  expect(ownedBy(id)).toHaveLength(0);
});

Given("the home province of {string} is owned by {string} in 1444", (s, id: string, realm: string) => {
  const l = leftOutAtBuild().find((x) => x.id === id);
  expect(l?.owner).toBe(realmOf(realm)!.id);
  s.home = l!.capital;
});

Then("{string} keeps its provinces", (s, realm: string) => {
  expect(rules.provinces.find((p) => p.id === s.home)!.owner).toBe(realmOf(realm)!.id);
});

Given("the catalogue record {string} becomes a realm when a campaign starts", (s, id: string) => {
  expect(ownedBy(id).length).toBeGreaterThan(0);
  expect(tribesConfig.new_tribe_regions).toContain(S.catalogueRecord(id).region);
  s.id = id;
});

Then("its form comes from the start-form rules", (s) => {
  expect(S.NEVER_START_FORMS).not.toContain(S.startForm(S.startFormRecord(s.id)).form);
});

Then("its tongue, faith, starting numbers and personality come from the rules every realm uses", (s) => {
  expect(startTongues(s.id)?.court).toBeTruthy();
  expect(startFaiths(s.id)?.stateFaith).toBeTruthy();
  const r = S.catalogueRecord(s.id);
  expect(Object.keys(r.assessments)).toHaveLength(14);
  expect(S.catalogueIdOf(s.id)).toBe(s.id);
});
