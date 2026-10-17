import { expect } from "vitest";
import { steps } from "../src/registry.ts";
import * as R from "@ph/engine/domain/research";

const { Given, When, Then } = steps("research");

/** "B5 bastion_fortification" → "B5". */
const idOf = (name: string): string => name.split(" ")[0]!;
const num = (text: string | number): number => Number(String(text).replace(/,/g, ""));
const NUM = "([\\d,]+)";

function programme(s: Record<string, any>, country?: string): R.Programme {
  if (!s.p) s.p = R.newProgramme(country ?? "Country");
  if (country) s.p.country = country;
  return s.p;
}
const date = (s: Record<string, any>): R.Day => s.date ?? { year: 1444, month: 3 };

function addTempleSchools(p: R.Programme, count: number, province = "Paris"): void {
  for (let i = 0; i < count; i++) p.schools.push({ province: `${province} ${i + 1}`, type: "temple_or_monastery_school", open: true, cohorts: [] });
}

// ------------------------------------------------------------ cost and eligibility

Given("the date is {int}", (s, year: number) => {
  s.date = { year };
});

When("the country {string} studies an invention of era {word}", (s, country: string, era: string) => {
  programme(s, country);
  s.era = era as R.Era;
});

Then("it costs {int} scholar-years before discounts", (s, cost: number) => {
  expect(R.costBeforeDiscounts(s.era, date(s))).toBe(cost);
});

Given(/^the country "([^"]+)" knows ([A-Z]\d+ .*)$/, (s, country: string, known: string) => {
  const p = programme(s, country);
  const [have] = known.split(" but not ");
  for (const m of have!.matchAll(/\b([A-Z]\d+)\b/g)) p.known.add(m[1]!);
  const [, without] = known.split(" but not ");
  if (without) for (const m of without.matchAll(/\b([A-Z]\d+)\b/g)) expect(p.known.has(m[1]!)).toBe(false);
});

When("it tries to study {string}", (s, name: string) => {
  s.result = R.eligibility(programme(s), idOf(name), date(s));
});

Then("the study is allowed", (s) => {
  expect(s.result).toEqual({ ok: true });
});

Then("the study is refused", (s) => {
  expect(s.result.ok).toBe(false);
});

Given("{int} neighbours or trade partners of {string} know {string}", (s, partners: number, country: string, name: string) => {
  programme(s, country);
  s.partners = { [idOf(name)]: partners };
});

When("{string} studies {string} in its own era", (s, _country: string, name: string) => {
  const inv = R.invention(idOf(name));
  s.date = { year: R.researchConfig.era_dates[inv.era] };
  s.cost = R.studyCost(inv.id, s.date, s.partners[inv.id] ?? 0);
});

Then("it costs {int} scholar-years", (s, cost: number) => {
  expect(s.cost).toBe(cost);
});

Given("the country {string} knows the bough {string}", (s, country: string, bough: string) => {
  const p = programme(s, country);
  const b = R.tree().boughs.find((x) => x.name === bough);
  expect(b).toBeDefined();
  expect(p.known.has(b!.id)).toBe(true);
});

Given("it has made no Atlantic crossing", (s) => {
  expect(programme(s).contacts.has("atlantic_crossing")).toBe(false);
});

When("the Atlantic crossing contact event happens for {string}", (s, _country: string) => {
  R.contactEvent(programme(s), "atlantic_crossing");
});

Then("it may study {string}", (s, name: string) => {
  expect(R.eligibility(programme(s), idOf(name), date(s))).toEqual({ ok: true });
});

// ------------------------------------------------------------ the tree

Given("the invention tree config", (s) => {
  s.rows = [...(R.researchConfig.inventions as R.InventionRow[])];
});

When("the tree is loaded", (s) => {
  s.tree = R.loadTree(s.rows);
});

Then(
  "it has one root {string} with the boughs R1 {string}, R2 {string}, R3 {string} and R4 {string}",
  (s, root: string, r1: string, r2: string, r3: string, r4: string) => {
    const t: R.Tree = s.tree;
    expect(t.root.name).toBe(root);
    expect(t.boughs).toEqual([
      { id: "R1", name: r1 },
      { id: "R2", name: r2 },
      { id: "R3", name: r3 },
      { id: "R4", name: r4 },
    ]);
    // Every invention grows on one of the four boughs: one tree, one root.
    for (const inv of t.inventions.values()) expect(["R1", "R2", "R3", "R4"]).toContain(inv.bough);
  },
);

Then("{string} grows on the bough {string} although its letter is {word}", (s, name: string, bough: string, letter: string) => {
  const t: R.Tree = s.tree;
  const inv = R.invention(idOf(name), t);
  expect(inv.id.startsWith(letter)).toBe(true);
  expect(t.boughs.find((b) => b.id === inv.bough)?.name).toBe(bough);
});

Then(
  "it holds {int} inventions: {int} of era I, {int} of era II, {int} of era III, {int} of era IV, {int} of era V, {int} of era VI, {int} of era VII and {int} of era VIII",
  (s, total: number, ...byEra: number[]) => {
    const t: R.Tree = s.tree;
    expect(t.inventions.size).toBe(total);
    const counts = R.countByEra(t);
    expect(R.ERAS.map((e) => counts[e])).toEqual(byEra);
  },
);

Given("the country {string} learns {string}", (s, country: string, name: string) => {
  const p = programme(s, country);
  R.learn(p, idOf(name));
  s.learned = idOf(name);
});

When("its effect applies", (s) => {
  s.effects = R.effectsOf(s.learned);
});

Then("castles can be built", (s) => {
  expect(s.effects.buildings).toContain("castle");
});

Then("farmland harvests one step better", (s) => {
  expect(s.effects.harvest_steps).toBe(1);
});

Then("officials cost less and each runs {int} provinces", (s, n: number) => {
  expect(s.effects.officials_cost_less).toBe(true);
  expect(s.effects.provinces_per_official).toBe(n);
});

Then("ships cross oceans and {int} colonial governor slots open", (s, n: number) => {
  expect(s.effects.cross_oceans).toBe(true);
  expect(s.effects.colonial_governor_slots).toBe(n);
});

Then("the country has one more envoy", (s) => {
  expect(s.effects.envoys).toBe(1);
});

Then("grain and armies move far faster", (s) => {
  expect(s.effects.faster).toEqual(["grain", "armies"]);
});

Given("the event tree uses the ids {string}, {string}, {string} and {string}", (s, ...ids: string[]) => {
  s.eventIds = ids;
});

Then("{string}, {string}, {string} and {string} carry those ids", (s, ...ids: string[]) => {
  ids.forEach((id, i) => expect(R.invention(id, s.tree).event_id).toBe(s.eventIds[i]));
  s.eventIds.forEach((e: string, i: number) => expect(R.byEventId(e, s.tree)?.id).toBe(ids[i]));
});

Then("the tree has {int} such inventions", (s, n: number) => {
  const t: R.Tree = s.tree;
  expect([...t.inventions.values()].filter((i) => i.event_id).length).toBe(n);
});

When("a row {string} is added with id, parent, also_needs, era, unlocks and start_regions", (s, name: string) => {
  const row: R.InventionRow = { id: "F25", name, era: "I", parent: "F3", or_parents: [], also_needs: [], unlocks: "Mountain provinces farm well", start_regions: ["Andes"] };
  s.rows.push(row);
  s.newRow = row;
  s.tree = R.loadTree(s.rows);
});

Then("it hangs on its parent's branch without code changes", (s) => {
  const t: R.Tree = s.tree;
  const added = R.invention(s.newRow.id, t);
  expect(added.bough).toBe(R.invention(s.newRow.parent, t).bough);
  const p = R.newProgramme("Inca", t);
  expect(R.eligibility(p, added.id, { year: 1444 }, t).ok).toBe(false);
  p.known.add(s.newRow.parent);
  expect(R.eligibility(p, added.id, { year: 1444 }, t)).toEqual({ ok: true });
  expect(R.costBeforeDiscounts(added.era, { year: 1444 })).toBe(20);
});

// ------------------------------------------------------------ progress

Given("the country {string} knows {string} and is {int} % through {string}", (s, country: string, known: string, pct: number, studying: string) => {
  const p = programme(s, country);
  R.learn(p, idOf(known));
  p.scholars = 35;
  addTempleSchools(p, 4);
  p.schools.forEach((x) => x.cohorts.push({ count: 50, enrolledYear: 1442 }));
  const id = idOf(studying);
  s.date = { year: 1444 };
  p.studies.push({ id, progress: (R.studyCost(id, s.date) * pct) / 100 });
  s.before = p.studies[0]!.progress;
});

When("all its schools close", (s) => {
  const p = programme(s);
  for (const school of [...p.schools]) R.loseSchool(p, school.province, "upkeep_unpaid");
  s.learnedNow = R.researchYear(p, s.date);
});

Then("progress on {string} stops", (s, name: string) => {
  const study = programme(s).studies.find((x) => x.id === idOf(name));
  expect(study?.progress).toBe(s.before);
  expect(s.learnedNow).toEqual([]);
});

Then("the country {string} still knows {string}", (s, _country: string, name: string) => {
  expect(programme(s).known.has(idOf(name))).toBe(true);
});

Given("the country {string} has no academy-level school", (s, country: string) => {
  addTempleSchools(programme(s, country), 2);
});

Given("the country {string} has an academy of science", (s, country: string) => {
  const p = programme(s, country);
  p.known.add("L12");
  R.gainSchool(p, "London", "academy", "build");
});

When("it chooses what to study", (s) => {
  s.max = R.maxStudies(programme(s));
});

Then("it can study {int} at once", (s, n: number) => {
  expect(s.max).toBe(n);
  // One more than allowed is refused.
  const p = programme(s);
  const open = ["B1", "B2", "B4"];
  for (let i = 0; i < n; i++) expect(R.setStudy(p, open[i]!, { year: 1444 })).toEqual({ ok: true });
  expect(R.setStudy(p, open[n]!, { year: 1444 })).toEqual({ ok: false, reason: "too_many_studies" });
});

// ------------------------------------------------------------ readers

Given("the country {string} has {int} scholars and {int} schools for {float} m people", (s, country: string, scholars: number, schools: number, millions: number) => {
  const p = programme(s, country);
  p.scholars = scholars;
  addTempleSchools(p, schools, "Venezia");
  s.people = millions * 1000;
});

When("an event reads {string}", (s, stat: string) => {
  expect(stat).toBe("literacy");
  s.literacy = R.literacy(programme(s), s.people);
});

Then("it reads scholars and schools per thousand people of {string}", (s, _country: string) => {
  expect(s.literacy.scholarsPerThousand).toBeCloseTo(35 / 1500);
  expect(s.literacy.schoolsPerThousand).toBeCloseTo(4 / 1500);
});

Given("the country {string} knows {int} inventions of era I and {int} of era II", (s, country: string, one: number, two: number) => {
  const p = programme(s, country);
  const of = (era: R.Era) => [...R.tree().inventions.values()].filter((i) => i.era === era).map((i) => i.id);
  of("I").slice(0, one).forEach((id) => R.learn(p, id));
  of("II").slice(0, two).forEach((id) => R.learn(p, id));
});

When("the realm works out the Technology score", (s) => {
  s.supplied = R.knownWithEraCost(programme(s));
});

Then("research supplies {int} inventions with era costs {int} and {int}", (s, n: number, a: number, b: number) => {
  const supplied: { eraCost: number }[] = s.supplied;
  expect(supplied.length).toBe(n);
  expect([...new Set(supplied.map((x) => x.eraCost))].sort((x, y) => x - y)).toEqual([a, b]);
});

// ------------------------------------------------------------ schools and students

Given("the country {string} has no school in the province {string}", (s, country: string, province: string) => {
  const p = programme(s, country);
  p.known.add("L1");
  s.province = province;
  expect(p.schools.some((x) => x.province === province)).toBe(false);
});

When("the country {string} builds one for gold", (s) => {
  R.gainSchool(programme(s), s.province, "temple_or_monastery_school", "build");
});
When("a lord founds one", (s) => {
  R.gainSchool(programme(s), s.province, "temple_or_monastery_school", "lord_founds");
});
When("the clergy found one", (s) => {
  R.gainSchool(programme(s), s.province, "temple_or_monastery_school", "clergy_founds");
});
When("the country {string} conquers a town with a school", (s) => {
  R.gainSchool(programme(s), s.province, "university", "conquest");
});

Then("the province {string} has a school", (s, province: string) => {
  expect(programme(s).schools.some((x) => x.province === province && x.open)).toBe(true);
});

Given("the province {string} has a university", (s, province: string) => {
  const p = programme(s, "France");
  p.schools.push({ province, type: "university", open: true, cohorts: [] });
  s.province = province;
});

When("its upkeep is not paid", (s) => {
  s.outcome = R.loseSchool(programme(s), s.province, "upkeep_unpaid");
});
When("it is sacked in war", (s) => {
  s.outcome = R.loseSchool(programme(s), s.province, "sacked");
});
When("a religious change closes the other faith's schools", (s) => {
  s.outcome = R.loseSchool(programme(s), s.province, "religious_change");
});

Then("the university of {string} closes", (s, province: string) => {
  expect(s.outcome).toBe("closed");
  expect(programme(s).schools.find((x) => x.province === province)?.open).toBe(false);
});

Then("the university of {string} is lost", (s, province: string) => {
  expect(s.outcome).toBe("lost");
  expect(programme(s).schools.some((x) => x.province === province)).toBe(false);
});

Given("the country {string} knows the invention {string}", (s, country: string, name: string) => {
  R.learn(programme(s, country), idOf(name));
});

const schoolNames: Record<string, R.SchoolType> = {
  "temple or monastery school": "temple_or_monastery_school",
  madrasa: "madrasa",
  university: "university",
  academy: "academy",
};

When(/^it builds a (temple or monastery school|madrasa|university|academy)$/, (s, name: string) => {
  s.school = R.gainSchool(programme(s), "Paris", schoolNames[name]!, "build");
});

Then("the school has {int} student seats", (s, n: number) => {
  expect(R.seatsOf(s.school.type)).toBe(n);
  expect(R.emptySeats(programme(s))).toBe(n);
});

Given(new RegExp(`^the country "([^"]+)" has ${NUM} empty seats and ${NUM} recruits$`), (s, country: string, seats: string, recruits: string) => {
  const p = programme(s, country);
  addTempleSchools(p, num(seats) / R.seatsOf("temple_or_monastery_school"));
  expect(R.emptySeats(p)).toBe(num(seats));
  s.pool = { recruits: num(recruits) };
});

When("the player sets {int} seats to be filled", (s, n: number) => {
  s.enrolled = R.fillSeats(programme(s), s.pool, n, 1444);
});

Then("{int} recruits become students", (s, n: number) => {
  expect(s.enrolled).toBe(n);
  expect(R.students(programme(s))).toBe(n);
});

Then(new RegExp(`^the country "([^"]+)" has ${NUM} recruits$`), (s, _country: string, n: string) => {
  expect(s.pool.recruits).toBe(num(n));
});

Given("the country {string} has {int} students", (s, country: string, n: number) => {
  const p = programme(s, country);
  addTempleSchools(p, Math.ceil(n / 20));
  s.pool = { recruits: 1000 };
  R.fillSeats(p, s.pool, n, 1440);
  s.year = 1445;
});

When("some students graduate", (s) => {
  const p = programme(s);
  p.schools[0]!.cohorts[0]!.enrolledYear = s.year - 5;
  R.graduateYear(p, s.year);
});
When("students are called back into the army", (s) => {
  R.loseStudents(programme(s), "called_to_arms", 20);
});
When("famine strikes a school town", (s) => {
  const p = programme(s);
  R.loseStudents(p, "famine", 5, p.schools[0]!.province);
});
When("plague strikes a school town", (s) => {
  const p = programme(s);
  R.loseStudents(p, "plague", 5, p.schools[0]!.province);
});

Then("the country {string} has fewer than {int} students", (s, _country: string, n: number) => {
  expect(R.students(programme(s))).toBeLessThan(n);
});

Given("{int} students enrolled in {string} {int} years ago", (s, n: number, province: string, years: number) => {
  const p = programme(s, "France");
  s.year = 1450;
  p.schools.push({ province, type: "university", open: true, cohorts: [{ count: n, enrolledYear: s.year - years }] });
  s.schoolmasters = new Set<string>();
});

Given("the province {string} has no Schoolmaster", (s, province: string) => {
  expect(s.schoolmasters.has(province)).toBe(false);
});

Given("the province {string} has a Schoolmaster official", (s, province: string) => {
  s.schoolmasters.add(province);
});

When("the year ends", (s) => {
  s.before = programme(s).scholars;
  s.graduated = R.graduateYear(programme(s), s.year, s.schoolmasters);
});

Then("the {int} students graduate", (s, n: number) => {
  expect(programme(s).scholars - s.before).toBe(n);
  expect(R.students(programme(s))).toBe(0);
});

Then("the {int} students are still students", (s, n: number) => {
  expect(programme(s).scholars).toBe(s.before);
  expect(R.students(programme(s))).toBe(n);
});

Given("a student of a {word} graduates", (s, school: string) => {
  s.schoolType = schoolNames[school];
});

When("the player makes him an official", (s) => {
  s.types = R.graduateOfficialTypes(s.schoolType);
});

Then(/^he may be a (.+) or (.+)$/, (s, a: string, b: string) => {
  expect(s.types).toEqual([a, b]);
});

When("the player needs an official", (s) => {
  s.direct = R.scholarsCanBecomeOfficials(programme(s));
});

Then("a scholar can become an official directly", (s) => {
  expect(s.direct).toBe(true);
  expect(R.scholarsCanBecomeOfficials(R.newProgramme("Other"))).toBe(false);
});

Given("the country {string} has {int} scholars", (s, country: string, n: number) => {
  programme(s, country).scholars = n;
  s.before = n;
});

const scholarCauses: Record<string, R.ScholarChange> = {
  "students graduate": "graduated",
  "it hires a foreign scholar for gold": "hired_foreign",
  "scholars flee a war abroad to Venice": "fled_to_you",
  "scholars die of old age": "old_age",
  "war reaches a school town": "war_in_town",
  "persecution drives scholars abroad": "persecution",
  "a richer neighbour poaches scholars": "poached",
};
When(new RegExp(`^(${Object.keys(scholarCauses).join("|")})$`), (s, cause: string) => {
  R.changeScholars(programme(s), scholarCauses[cause]!, 1);
});

Then("its scholars are more", (s) => {
  expect(programme(s).scholars).toBeGreaterThan(s.before);
});
Then("its scholars are fewer", (s) => {
  expect(programme(s).scholars).toBeLessThan(s.before);
});

// ------------------------------------------------------------ war and research

Given(new RegExp(`^the country "([^"]+)" has ${NUM} recruits and ${NUM} students$`), (s, country: string, recruits: string, n: string) => {
  const p = programme(s, country);
  addTempleSchools(p, 10);
  s.pool = { recruits: num(recruits) };
  expect(R.students(p)).toBe(num(n));
});

When("it fills {int} school seats", (s, n: number) => {
  expect(R.fillSeats(programme(s), s.pool, n, 1444)).toBe(n);
});

Then(new RegExp(`^it can raise at most ${NUM} recruits as soldiers$`), (s, n: string) => {
  expect(R.raisableRecruits(s.pool)).toBe(num(n));
});

Given("the country {string} has {int} students and studies {string}", (s, country: string, n: number, name: string) => {
  const p = programme(s, country);
  p.known.add("B1").add("C2").add("W3");
  addTempleSchools(p, Math.ceil(n / 20));
  s.pool = { recruits: 1000 };
  R.fillSeats(p, s.pool, n, 1444);
  s.recruitsBefore = s.pool.recruits;
  expect(R.setStudy(p, idOf(name), { year: 1500 })).toEqual({ ok: true });
  s.study = idOf(name);
  s.scholarsBefore = p.scholars;
});

When("the player calls the students to arms", (s) => {
  R.callStudentsToArms(programme(s), s.pool);
});

Then("the country {string} has {int} more recruits and {int} students", (s, _country: string, more: number, left: number) => {
  expect(s.pool.recruits - s.recruitsBefore).toBe(more);
  expect(R.students(programme(s))).toBe(left);
});

Then("research stops", (s) => {
  const p = programme(s);
  p.scholars = 10;
  const before = p.studies.find((x) => x.id === s.study)!.progress;
  R.researchYear(p, { year: 1500 });
  expect(p.studies.find((x) => x.id === s.study)!.progress).toBe(before);
  p.scholars = s.scholarsBefore;
});

Then("those {int} never become scholars", (s, _n: number) => {
  const p = programme(s);
  for (let year = 1445; year <= 1455; year++) R.graduateYear(p, year);
  expect(p.scholars).toBe(s.scholarsBefore);
});

Given("the province {string} has a university and {int} scholars", (s, province: string, n: number) => {
  const p = programme(s, "Milan");
  p.schools.push({ province, type: "university", open: true, cohorts: [] });
  p.scholars = n;
  s.neighbours = [];
});

Given("the neighbouring country {string} is at peace", (s, country: string) => {
  s.neighbours.push({ country, atPeace: true }, { country: "France", atPeace: false });
});

When("a battle is fought in {string}", (s, province: string) => {
  s.battle = R.battleAtSchool(programme(s), province, s.neighbours);
});

Then("the university of {string} may be sacked", (s) => {
  expect(s.battle.maySack).toBe(true);
});

Then("its scholars may flee to {string}", (s, country: string) => {
  expect(s.battle.scholarsMayFleeTo).toEqual([country]);
});

// ------------------------------------------------------------ start

When("any country is set up", (s) => {
  s.p = R.newProgramme("Any");
});

Then("it knows {string} and the four boughs", (s, root: string) => {
  const p = programme(s);
  const t = R.tree();
  expect(t.root.name).toBe(root);
  expect([...p.known].sort()).toEqual([t.root.id, ...t.boughs.map((b) => b.id)].sort());
});
