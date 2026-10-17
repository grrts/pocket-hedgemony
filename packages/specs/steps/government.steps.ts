import { expect } from "vitest";
import {
  REFORMS,
  assignStartForm,
  buildingContribution,
  capBuildingIdFromName,
  capBuildingMissing,
  capacityFromName,
  countedOfficials,
  form,
  formAfterCapitalLost,
  formAfterCoup,
  formFromEvent,
  formIdFromName,
  formName,
  governmentCard,
  graspingOfficials,
  greatLordReasons,
  hasOverride,
  lordCapCount,
  lordSlipsAtMonthStart,
  newYearLordSlips,
  reform,
  setFormByRevolution,
  startLords,
  startRecords1444,
  subjectReach,
  successionName,
  workOutCaps,
  type AdministrativeCapacity,
  type CapBuilding,
  type CapBuildingId,
  type CatalogueRecord,
  type FormId,
  type LordInRealm,
  type Official,
  type ReformCountry,
  type ReformResult,
} from "@ph/engine/domain/government";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("government");

interface Country {
  name: string;
  form: FormId;
  buildings: CapBuilding[];
  strengths: { officials?: number; lords?: number }[];
  officials: Official[];
  lords: LordInRealm[];
  inventions: Set<string>;
  facts: Set<string>;
  gold: number;
  goldBefore: number;
  provinces: number;
  subjects: number;
  capacity?: AdministrativeCapacity;
  /** An officials or lords cap given outright by the scenario. */
  officialsCap?: number;
  lordsCap?: number;
  houses?: number;
  lastChange?: "reform" | "revolution" | "coup" | "event" | "capital_lost";
}

function country(s: Scenario, name: string): Country {
  s.countries ??= {};
  s.countries[name] ??= {
    name,
    form: "feudal_realm",
    buildings: [],
    strengths: [],
    officials: [],
    lords: [],
    inventions: new Set(),
    facts: new Set(),
    gold: 0,
    goldBefore: 0,
    provinces: 1,
    subjects: 0,
  } satisfies Country;
  return s.countries[name];
}

function setOfficials(c: Country, n: number): void {
  c.officials = Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, province: `${c.name} province ${i + 1}`, hired: i + 1 }));
}

function setLords(c: Country, n: number): void {
  c.lords = Array.from({ length: n }, (_, i) => ({ id: `lord ${i + 1}`, loyalty: "loyal", provinces: 1 }));
}

function reformCountry(c: Country): ReformCountry {
  return {
    form: c.form,
    gold: c.gold,
    inventions: c.inventions,
    buildings: new Set(c.buildings.map((b) => b.id)),
    provinces: c.provinces,
    lords: c.lords.length,
    subjects: c.subjects,
    facts: c.facts,
  };
}

function caps(c: Country) {
  return workOutCaps({ form: c.form, buildings: c.buildings, strengths: c.strengths });
}

function officialsCap(c: Country): number {
  return c.officialsCap ?? caps(c).officials.total;
}

function lordsCap(c: Country): number {
  return c.lordsCap ?? caps(c).lords.total;
}

/** Province grievances, kept per scenario. */
function grievances(s: Scenario): Map<string, Set<string>> {
  s.grievances ??= new Map<string, Set<string>>();
  return s.grievances;
}

/** Re-checks the officials cap: adds Grasping officials over the cap, lifts it back under. */
function checkOfficials(s: Scenario, c: Country): void {
  const over = graspingOfficials(c.officials, officialsCap(c));
  const g = grievances(s);
  for (const [province, set] of g) if (province.length && !over.has(province) && c.officials.some((o) => o.province === province)) set.delete("Grasping officials");
  for (const province of over) {
    if (!g.has(province)) g.set(province, new Set());
    g.get(province)!.add("Grasping officials");
  }
}

function slipLords(s: Scenario, ids: string[]): void {
  s.slipped ??= new Map<string, number>();
  for (const id of ids) s.slipped.set(id, (s.slipped.get(id) ?? 0) + 1);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

Given(/^the date is (.+)$/, (s, text: string) => {
  const m = /^(?:(\d+) )?(?:([A-Za-z]+) )?(\d{4})$/.exec(text.trim());
  if (!m) throw new Error(`Unreadable date: ${text}`);
  s.year = Number(m[3]);
  s.month = m[2] ? MONTHS.indexOf(m[2].toLowerCase()) + 1 : 1;
});

// ---------------------------------------------------------------------------
// Forms and buildings
// ---------------------------------------------------------------------------

Given("the country {string} has the form {string}", (s, name: string, f: string) => {
  country(s, name).form = formIdFromName(f);
});

Given(/^the country "([^"]+)" has an? ([a-z ]+) at step (\d+)$/, (s, name: string, building: string, step: string) => {
  const c = country(s, name);
  c.buildings.push({ id: capBuildingIdFromName(building), step: Number(step) });
  s.lastBuilding = { id: capBuildingIdFromName(building), step: Number(step) };
});

Given(/^the country "([^"]+)" has an? (palace|seat|chancery|court of law|diet hall|hostage residence|examination hall|parliament house)$/, (s, name: string, building: string) => {
  country(s, name).buildings.push({ id: capBuildingIdFromName(building), step: 1 });
});

Given("the country {string} has {int} seats at step {int}", (s, name: string, n: number, step: number) => {
  const c = country(s, name);
  for (let i = 0; i < n; i++) c.buildings.push({ id: "seat", step });
});

Given("the country {string} has a palace at step {int}, a chancery, {int} seats at step {int} and a hostage residence", (s, name: string, palace: number, seats: number, seatStep: number) => {
  const c = country(s, name);
  c.buildings.push({ id: "palace", step: palace }, { id: "chancery", step: 1 }, { id: "hostage_residence", step: 1 });
  for (let i = 0; i < seats; i++) c.buildings.push({ id: "seat", step: seatStep });
});

Given("the country {string} has a palace at step {int} and no other cap building", (s, name: string, step: number) => {
  country(s, name).buildings = [{ id: "palace", step }];
});

Given("the country {string} has {int} province(s) and a palace at step {int}", (s, name: string, n: number, step: number) => {
  const c = country(s, name);
  c.provinces = n;
  c.buildings.push({ id: "palace", step });
});

Given("the country {string} has a national strength that adds {int} officials", (s, name: string, n: number) => {
  country(s, name).strengths.push({ officials: n });
});

Given("the country {string} has {int} officials and {int} lords", (s, name: string, o: number, l: number) => {
  const c = country(s, name);
  setOfficials(c, o);
  setLords(c, l);
});

When("the caps are worked out", (s) => {
  s.acted = true;
  s.caps = {};
  for (const [name, c] of Object.entries(s.countries as Record<string, Country>)) s.caps[name] = caps(c);
});

Then(/^the (officials|lords) cap of "([^"]+)" is (\d+), made of (.+)$/, (s, which: "officials" | "lords", name: string, total: string, made: string) => {
  const cap = caps(country(s, name))[which];
  expect(cap.total).toBe(Number(total));
  const parts = made.split(/, | and /).map((p) => {
    const m = /^(.+) (\d+)$/.exec(p)!;
    return { source: m[1]!, value: Number(m[2]) };
  });
  expect(cap.parts).toEqual(parts);
});

Then(/^the (officials|lords) cap of "([^"]+)" is (\d+)$/, (s, which: "officials" | "lords", name: string, total: string) => {
  expect(caps(country(s, name))[which].total).toBe(Number(total));
});

Then("the officials cap of {string} includes {int} from the form and {int} from the strength", (s, name: string, f: number, st: number) => {
  const parts = caps(country(s, name)).officials.parts;
  expect(parts.find((p) => p.source === "form")?.value).toBe(f);
  expect(parts.find((p) => p.source === "strength")?.value).toBe(st);
});

Then("the government card of {string} shows {string} and {string}", (s, name: string, a: string, b: string) => {
  const c = country(s, name);
  const card = governmentCard({ ...reformCountry(c), officials: c.officials.length }, caps(c), subjectReach("high", c.form), 0);
  expect(card.officials).toBe(a);
  expect(card.lords).toBe(b);
});

Then("{string} is within both caps", (s, name: string) => {
  const c = country(s, name);
  expect(c.officials.length).toBeLessThanOrEqual(officialsCap(c));
  expect(c.lords.length).toBeLessThanOrEqual(lordsCap(c));
  expect(graspingOfficials(c.officials, officialsCap(c)).size).toBe(0);
  expect(newYearLordSlips(c.lords, lordsCap(c))).toEqual([]);
});

Then("the country {string} has no lords", (s, name: string) => {
  const c = country(s, name);
  expect(startLords(c.provinces, c.houses ?? 0)).toBe(0);
});

Then(/^the (.+) adds (\d+) officials and (\d+) lords to the caps of "([^"]+)"$/, (s, building: string, o: string, l: string, name: string) => {
  const b = country(s, name).buildings.find((x) => x.id === capBuildingIdFromName(building))!;
  expect(buildingContribution(b.id, b.step)).toEqual({ officials: Number(o), lords: Number(l) });
});

Given("the country {string} does not have the invention {string}", (s, name: string, invention: string) => {
  country(s, name).inventions.delete(invention.split(" ")[0]!);
});

When(/^the country "([^"]+)" (?:tries to build|looks for) an? (.+)$/, (s, name: string, what: string) => {
  const m = /^(.+?)(?: at step (\d+))?$/.exec(what)!;
  const c = country(s, name);
  s.availability = capBuildingMissing(capBuildingIdFromName(m[1]!), Number(m[2] ?? 1), c) === null;
});

Then(/^the (.+?) is (available|not available) to "([^"]+)"$/, (s, _building: string, availability: string) => {
  expect(s.availability).toBe(availability === "available");
});

// ---------------------------------------------------------------------------
// Officials over the cap
// ---------------------------------------------------------------------------

Given("the country {string} has {int} officials and an officials cap of {int}", (s, name: string, n: number, cap: number) => {
  const c = country(s, name);
  setOfficials(c, n);
  c.officialsCap = cap;
});

Given("the country {string} has an officials cap of {int} and {int} officials", (s, name: string, cap: number, n: number) => {
  const c = country(s, name);
  setOfficials(c, n);
  c.officialsCap = cap;
});

Given("the country {string} has {int} lords and a lords cap of {int}", (s, name: string, n: number, cap: number) => {
  const c = country(s, name);
  setLords(c, n);
  c.lordsCap = cap;
});

Given("the country {string} has an officials cap of {int}", (s, name: string, cap: number) => {
  country(s, name).officialsCap = cap;
});

Given("the country {string} has {int} officials", (s, name: string, n: number) => {
  setOfficials(country(s, name), n);
});

Given("the two newest hires serve in {string} and {string}", (s, a: string, b: string) => {
  const c = Object.values(s.countries as Record<string, Country>)[0]!;
  const newest = [...c.officials].sort((x, y) => y.hired - x.hired);
  newest[0]!.province = b;
  newest[1]!.province = a;
});

Given("the country {string} has a colonial governor holding a governor slot", (s, name: string) => {
  const c = country(s, name);
  c.officials.push({ id: "governor", province: "the colony", hired: c.officials.length + 1, governorSlot: true });
});

When("the caps are checked", (s) => {
  s.acted = true;
  for (const c of Object.values(s.countries as Record<string, Country>)) checkOfficials(s, c);
});

When("the governor's colony is founded", (s) => {
  for (const c of Object.values(s.countries as Record<string, Country>)) {
    const g = c.officials.find((o) => o.id === "governor");
    if (g) delete g.governorSlot;
    checkOfficials(s, c);
  }
});

Then("the governor is not counted against the officials cap of {string}", (s, name: string) => {
  expect(countedOfficials(country(s, name).officials).some((o) => o.id === "governor")).toBe(false);
});

Then("the governor counts as that colony's official against the officials cap of {string}", (s, name: string) => {
  expect(countedOfficials(country(s, name).officials).some((o) => o.id === "governor")).toBe(true);
});

Then("the country {string} has {int} officials against a cap of {int}", (s, name: string, n: number, cap: number) => {
  const c = country(s, name);
  expect(countedOfficials(c.officials).length).toBe(n);
  expect(officialsCap(c)).toBe(cap);
});

Given("the province {string} has the grievance {string}", (s, province: string, grievance: string) => {
  const g = grievances(s);
  if (s.acted) {
    expect(g.get(province)?.has(grievance)).toBe(true);
    s.checkedProvinces = [...(s.checkedProvinces ?? []), province];
    return;
  }
  if (!g.has(province)) g.set(province, new Set());
  g.get(province)!.add(grievance);
  // The scenario's province is one where an official over the cap serves.
  const c = Object.values(s.countries as Record<string, Country>)[0]!;
  const newest = [...c.officials].sort((x, y) => y.hired - x.hired)[0];
  if (newest) newest.province = province;
});

Then("the province {string} no longer has the grievance {string}", (s, province: string, grievance: string) => {
  expect(grievances(s).get(province)?.has(grievance) ?? false).toBe(false);
});

Then("no province of {string} has the grievance {string}", (s, _name: string, grievance: string) => {
  for (const set of grievances(s).values()) expect(set.has(grievance)).toBe(false);
});

Then("no other province of {string} has the grievance {string}", (s, _name: string, grievance: string) => {
  const named = new Set(s.checkedProvinces ?? []);
  const with_ = [...grievances(s)].filter(([, set]) => set.has(grievance)).map(([p]) => p);
  expect(with_.filter((p) => !named.has(p))).toEqual([]);
});

When("the country {string} builds a chancery and its officials cap becomes {int}", (s, name: string, cap: number) => {
  s.acted = true;
  const c = country(s, name);
  c.officialsCap = officialsCap(c) + buildingContribution("chancery").officials;
  expect(c.officialsCap).toBe(cap);
  checkOfficials(s, c);
});

// ---------------------------------------------------------------------------
// Lords over the cap, Great lord
// ---------------------------------------------------------------------------

Given("the country {string} has a lords cap of {int}", (s, name: string, cap: number) => {
  country(s, name).lordsCap = cap;
});

Given("the country {string} has {int} lords", (s, name: string, n: number) => {
  setLords(country(s, name), n);
});

Given("the lord {string} has the lowest loyalty", (s, lord: string) => {
  const c = Object.values(s.countries as Record<string, Country>)[0]!;
  c.lords[0] = { id: lord, loyalty: "disloyal", provinces: 1 };
});

Given("the lords {string} and {string} share the next lowest loyalty, {string} holding more provinces", (s, a: string, b: string, more: string) => {
  const c = Object.values(s.countries as Record<string, Country>)[0]!;
  c.lords[1] = { id: a, loyalty: "wavering", provinces: a === more ? 5 : 3 };
  c.lords[2] = { id: b, loyalty: "wavering", provinces: b === more ? 5 : 3 };
});

When("the month ends", (s) => {
  s.acted = true;
  const month = s.month ?? 1;
  const next = (month % 12) + 1;
  s.month = next;
  for (const c of Object.values(s.countries as Record<string, Country>)) {
    checkOfficials(s, c);
    slipLords(s, lordSlipsAtMonthStart(next, c.lords, lordsCap(c)));
  }
});

When("a New Year begins", (s) => {
  s.acted = true;
  s.month = 1;
  for (const c of Object.values(s.countries as Record<string, Country>)) slipLords(s, lordSlipsAtMonthStart(1, c.lords, lordsCap(c)));
});

Then("the lord {string} loses {int} loyalty step", (s, lord: string, n: number) => {
  expect(s.slipped?.get(lord) ?? 0).toBe(n);
});

Then("the lord {string} loses no loyalty step", (s, lord: string) => {
  expect(s.slipped?.get(lord) ?? 0).toBe(0);
});

Then("no lord of {string} loses a loyalty step for the lords cap", (s) => {
  expect(s.slipped?.size ?? 0).toBe(0);
});

Given("the country {string} has a lord {string} holding {int} provinces", (s, name: string, lord: string, n: number) => {
  country(s, name).lords.push({ id: lord, loyalty: "loyal", provinces: n });
});

When("the caps and loyalty reasons are worked out", (s) => {
  s.acted = true;
});

Then("the lord {string} counts {int} toward the lords cap of {string}", (s, lord: string, n: number, name: string) => {
  const l = country(s, name).lords.find((x) => x.id === lord)!;
  expect(lordCapCount(l)).toBe(n);
});

Then("the lord {string} has {int} permanent {string} reasons", (s, lord: string, n: number, reason: string) => {
  expect(reason).toBe("Great lord");
  const l = Object.values(s.countries as Record<string, Country>).flatMap((c) => c.lords).find((x) => x.id === lord)!;
  expect(greatLordReasons(l.provinces)).toBe(n);
});

// ---------------------------------------------------------------------------
// The government card
// ---------------------------------------------------------------------------

Given("the country {string} has no diet hall, no G9 and no W12", (s, name: string) => {
  const c = country(s, name);
  c.buildings = c.buildings.filter((b) => b.id !== "diet_hall");
  c.inventions.delete("G9");
  c.inventions.delete("W12");
});

When("the player opens the government card of {string}", (s, name: string) => {
  const c = country(s, name);
  // France's administrative capacity is high (subjects design, France 1444).
  s.card = governmentCard({ ...reformCountry(c), officials: c.officials.length }, caps(c), subjectReach("high", c.form), 0);
});

Then("it shows {string} as not met", (s, text: string) => {
  const line = s.card.next.find((l: { text: string }) => l.text === text);
  expect(line, `card lines: ${s.card.next.map((l: { text: string }) => l.text).join(" | ")}`).toBeDefined();
  expect(line.met).toBe(false);
});

Then("it shows the subjects line as {string} from the subjects design", (s, pattern: string) => {
  expect(pattern).toBe("x of y");
  expect(s.card.subjects).toMatch(/^Subjects \d+ of \d+$/);
});

Then("it offers the Reform action", (s) => {
  expect(s.card.actions).toContain("Reform");
});

// ---------------------------------------------------------------------------
// Form numbers
// ---------------------------------------------------------------------------

When("the form's numbers are read", (s) => {
  s.acted = true;
  s.form = form(Object.values(s.countries as Record<string, Country>)[0]!.form);
});

Then("the form belongs to the family {string}", (s, family: string) => {
  expect(s.form.family).toBe(family);
});

Then("the form gives {int} officials and {int} lords to the caps", (s, o: number, l: number) => {
  expect([s.form.officials, s.form.lords]).toEqual([o, l]);
  const cap = workOutCaps({ form: s.form.id, buildings: [] });
  expect([cap.officials.total, cap.lords.total]).toEqual([o, l]);
});

Then("the form changes subject reach by {int}", (s, n: number) => {
  expect(s.form.subjectReach).toBe(n);
});

Then("the colonial range of {string} is {int} sea zones", (s, name: string, n: number) => {
  expect(form(country(s, name).form).colonialRange).toBe(n);
});

Then("succession in {string} is {string}", (s, name: string, text: string) => {
  expect(successionName(country(s, name).form)).toBe(text);
});

Given("the country {string} has the catalogue administrative capacity {string}", (s, name: string, capacity: string) => {
  country(s, name).capacity = capacityFromName(capacity);
});

When("its subject reach is worked out", (s) => {
  s.acted = true;
});

Then("the subject reach of {string} is {int}", (s, name: string, n: number) => {
  const c = country(s, name);
  expect(subjectReach(c.capacity!, c.form)).toBe(n);
});

Then("the country {string} has no subject reach and can hold no subjects", (s, name: string) => {
  const f = country(s, name).form;
  for (const capacity of ["very_low", "low", "moderate", "high", "very_high"] as const) expect(subjectReach(capacity, f)).toBeNull();
});

// ---------------------------------------------------------------------------
// Reforms
// ---------------------------------------------------------------------------

Given("the reform list is the config list {string}", (s, key: string) => {
  expect(key).toBe("reforms");
  expect(REFORMS.length).toBeGreaterThan(0);
});

Given("the country {string} meets {string}", (s, name: string, needs: string) => {
  const c = country(s, name);
  s.pendingNeeds = needs;
  s.pendingCountry = name;
  void c;
});

Given("the country {string} has {int} gold", (s, name: string, gold: number) => {
  const c = country(s, name);
  c.gold = gold;
  c.goldBefore = gold;
});

/** Makes every listed need of the reform hold, after checking the scenario names the same needs as config. */
function satisfyNeeds(c: Country, needs: string[]): void {
  for (const need of needs) {
    const count = /^(\d+) or more (provinces|subjects|lords)$/.exec(need);
    if (count) {
      const n = Number(count[1]);
      if (count[2] === "provinces") c.provinces = n;
      else if (count[2] === "subjects") c.subjects = n;
      else setLords(c, n);
      continue;
    }
    const building = /^an? (diet hall|parliament house|examination hall)$/.exec(need);
    if (building) {
      c.buildings.push({ id: capBuildingIdFromName(building[1]!) as CapBuildingId, step: 1 });
      continue;
    }
    const codes = need.split(" or ").map((a) => /^([GW]\d+)\b/.exec(a)?.[1]);
    if (codes.every((x) => x !== undefined)) {
      for (const code of codes) c.inventions.add(code!);
      continue;
    }
    c.facts.add(need);
  }
}

When("the country {string} reforms to {string}", (s, name: string, to: string) => {
  s.acted = true;
  const c = country(s, name);
  const target = formIdFromName(to);
  if (s.pendingNeeds !== undefined && s.pendingCountry === name) {
    const rule = REFORMS.find((r) => r.to === target && r.from.includes(c.form));
    expect(rule, `config has a reform ${c.form} → ${target}`).toBeDefined();
    const configNeeds = rule!.needs.map((n) => n.replace(/ \(religion design\)$/, "")).join(" and ");
    expect(configNeeds).toBe(s.pendingNeeds);
    satisfyNeeds(c, rule!.needs);
  }
  const result: ReformResult = reform(reformCountry(c), target);
  s.reform = result;
  if (result.ok) {
    c.form = result.form;
    c.gold -= result.goldPaid;
    c.lastChange = "reform";
  }
});

Then("the form of {string} is {string}", (s, name: string, f: string) => {
  expect(formName(country(s, name).form)).toBe(f);
});

Then("the country {string} has paid {int} gold", (s, name: string, gold: number) => {
  const c = country(s, name);
  expect(c.goldBefore - c.gold).toBe(gold);
});

Then("{int} lords of {string} have lost a loyalty step", (s, n: number) => {
  expect(s.reform.ok).toBe(true);
  expect(s.reform.lordsSlip).toBe(n);
});

Then("the reform is refused", (s) => {
  expect(s.reform.ok).toBe(false);
});

Then("the country {string} still has {int} gold", (s, name: string, gold: number) => {
  expect(country(s, name).gold).toBe(gold);
});

Given("the country {string} has G9 Professional bureaucracy but not W12 Standing regiments", (s, name: string) => {
  const c = country(s, name);
  c.inventions.add("G9");
  c.inventions.delete("W12");
});

Given("the country {string} has G9 Professional bureaucracy and W12 Standing regiments and {int} gold", (s, name: string, gold: number) => {
  const c = country(s, name);
  c.inventions.add("G9");
  c.inventions.add("W12");
  c.gold = gold;
  c.goldBefore = gold;
});

// ---------------------------------------------------------------------------
// Form changes without a reform
// ---------------------------------------------------------------------------

Given(/^the country "([^"]+)" (has|does not have) G14 Written constitution$/, (s, name: string, has: string) => {
  const c = country(s, name);
  if (has === "has") c.inventions.add("G14");
  else c.inventions.delete("G14");
});

Given("the country {string} has the form {string} and no G14 Written constitution", (s, name: string, f: string) => {
  const c = country(s, name);
  c.form = formIdFromName(f);
  c.inventions.delete("G14");
});

function revolution(s: Scenario, name: string, f: string): void {
  const c = country(s, name);
  c.form = setFormByRevolution(c.form, formIdFromName(f));
  c.lastChange = "revolution";
}

When("a revolution sets the form {string} on {string}", (s, f: string, name: string) => {
  s.acted = true;
  revolution(s, name, f);
});

Given("a revolution has set the form {string} on {string}", (s, f: string, name: string) => {
  revolution(s, name, f);
});

When("a {string} rising wins in {string} and sets the form {string}", (s, rising: string, name: string, f: string) => {
  expect(rising).toBe("New ideas");
  revolution(s, name, f);
});

Then("no gold is paid and no reform needs are checked", (s) => {
  for (const c of Object.values(s.countries as Record<string, Country>)) {
    expect(c.gold).toBe(c.goldBefore);
    if (c.lastChange) expect(c.lastChange).toBe("revolution");
  }
});

When("an army coup succeeds in {string}", (s, name: string) => {
  const c = country(s, name);
  c.form = formAfterCoup();
  c.lastChange = "coup";
});

When("the country {string} loses its capital", (s, name: string) => {
  const c = country(s, name);
  s.formBeforeCapitalLost = c.form;
  c.form = formAfterCapitalLost(c.form);
  c.lastChange = "capital_lost";
});

Then("the shogunate breaks into warlord domains", (s) => {
  expect(s.formBeforeCapitalLost).toBe("shogunate");
  const c = Object.values(s.countries as Record<string, Country>)[0]!;
  expect(c.form).toBe("warlord_domain");
});

When("an event sets the government value {string} on {string}", (s, value: string, name: string) => {
  const c = country(s, name);
  c.form = formFromEvent(c.form, value, c.inventions.has("G14"));
  c.lastChange = "event";
});

// ---------------------------------------------------------------------------
// Start forms and start lords
// ---------------------------------------------------------------------------

function record(s: Scenario, id: string): CatalogueRecord {
  s.records ??= new Map<string, CatalogueRecord>();
  if (!s.records.has(id)) s.records.set(id, { id, entityType: "", region: "", tier: "C", text: "" });
  return s.records.get(id);
}

Given("the catalogue record {string} has the entity type {string} and the government text {string}", (s, id: string, type: string, text: string) => {
  Object.assign(record(s, id), { entityType: type, text });
});

Given("the catalogue record {string} has the entity type {string} and a government text no rule matches", (s, id: string, type: string) => {
  Object.assign(record(s, id), { entityType: type, text: "" });
});

Given("the catalogue record {string} is in the overrides list", (s, id: string) => {
  expect(hasOverride(id)).toBe(true);
  record(s, id);
});

Given("the catalogue record {string} is a kingdom in the region {string} with detail tier {string}", (s, id: string, region: string, tier: string) => {
  Object.assign(record(s, id), { entityType: "kingdom", region, tier });
});

Given("no override or text rule applies to {string}", (s, id: string) => {
  expect(hasOverride(id)).toBe(false);
  record(s, id).text = "";
});

Given("no override applies to {string}", (_s, id: string) => {
  expect(hasOverride(id)).toBe(false);
});

When("start forms are assigned", (s) => {
  const records: CatalogueRecord[] = s.records ? [...s.records.values()] : startRecords1444();
  s.assigned = new Map(records.map((r) => [r.id, assignStartForm(r)]));
});

Then("the record {string} starts as {string} by the rule {string}", (s, id: string, f: string, rule: string) => {
  const a = s.assigned.get(id);
  expect(formName(a.form)).toBe(f);
  expect(a.rule).toBe(rule);
});

Then("the record {string} starts as {string}", (s, id: string, f: string) => {
  expect(formName(s.assigned.get(id).form)).toBe(f);
});

Then("no record starts as {string}", (s, f: string) => {
  const id = formIdFromName(f);
  expect(s.assigned.size).toBeGreaterThan(900);
  for (const a of s.assigned.values()) expect(a.form).not.toBe(id);
});

Given("the country {string} has {int} provinces in 1444", (s, name: string, n: number) => {
  country(s, name).provinces = n;
});

Given("the catalogue lists {int} historical houses for {string}", (s, n: number, name: string) => {
  country(s, name).houses = n;
});

When("the 1444 start is set up", (s) => {
  for (const c of Object.values(s.countries as Record<string, Country>)) setLords(c, startLords(c.provinces, c.houses ?? 0));
});

Then("the country {string} starts with {int} lords", (s, name: string, n: number) => {
  expect(country(s, name).lords.length).toBe(n);
});
