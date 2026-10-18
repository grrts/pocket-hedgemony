import { expect } from "vitest";
import { steps } from "../src/registry.ts";
import * as R from "@ph/engine/domain/research";
import { Rng } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";

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

Given("the country {string} knows the branch {string}", (s, country: string, bough: string) => {
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
  "it has one root {string} with the branches R1 {string}, R2 {string}, R3 {string} and R4 {string}",
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

Then("{string} grows on the branch {string} although its letter is {word}", (s, name: string, bough: string, letter: string) => {
  const t: R.Tree = s.tree;
  const inv = R.invention(idOf(name), t);
  expect(inv.id.startsWith(letter)).toBe(true);
  expect(t.boughs.find((b) => b.id === inv.bough)?.name).toBe(bough);
});

Then(
  "it holds {int} inventions: {int} of era A, {int} of era M, {int} of era I, {int} of era II, {int} of era III, {int} of era IV, {int} of era V, {int} of era VI, {int} of era VII and {int} of era VIII",
  (s, total: number, ...byEra: number[]) => {
    const t: R.Tree = s.tree;
    expect(t.inventions.size).toBe(total);
    const counts = R.countByEra(t);
    expect(R.TREE_ERAS.map((e) => counts[e])).toEqual(byEra);
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
  const open = ["B02", "B4", "F01"];
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

Then("it knows {string} and the four branches", (s, root: string) => {
  const p = programme(s);
  const t = R.tree();
  expect(t.root.name).toBe(root);
  expect([...p.known].sort()).toEqual([t.root.id, ...t.boughs.map((b) => b.id)].sort());
});

// ------------------------------------------------------------ decided rules (spec §13)

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Given(/^the date is (\d+) (January|February|March|April|May|June|July|August|September|October|November|December) (\d+)$/, (s, d: string, m: string, y: string) => {
  s.date = { year: Number(y), month: MONTHS.indexOf(m) + 1, day: Number(d) };
});

/** Adds an invention and everything it needs (parent and also needs), recursively. */
function knowWithNeeds(p: R.Programme, id: string, self = false): void {
  const inv = R.invention(id);
  if (self) p.known.add(id);
  for (const need of [inv.parent, ...inv.also_needs]) {
    if (p.known.has(need)) continue;
    if (R.tree().inventions.has(need)) knowWithNeeds(p, need, true);
  }
}

Given("the country {string} knows everything {string} needs", (s, country: string, name: string) => {
  knowWithNeeds(programme(s, country), idOf(name));
});

Then("the study is refused as out of scope", (s) => {
  expect(s.result).toEqual({ ok: false, reason: "out_of_scope" });
});

Then("the {int} event-tree inventions of era VIII keep their ids", (s, n: number) => {
  const t: R.Tree = s.tree;
  const viii = [...t.inventions.values()].filter((i) => i.era === "VIII" && i.event_id);
  expect(viii.map((i) => i.id).sort()).toEqual(["F23", "L25", "T19"]);
  expect(viii.length).toBe(n);
});

Then("no country may ever study an invention of era VIII", (s) => {
  const t: R.Tree = s.tree;
  for (const inv of t.inventions.values()) {
    if (inv.era !== "VIII") continue;
    const p = R.newProgramme("Any", t);
    knowWithNeeds(p, inv.id);
    expect(R.eligibility(p, inv.id, { year: 1939, month: 8 }, t)).toEqual({ ok: false, reason: "out_of_scope" });
  }
});

Then("{string} has the parent {string} and needs nothing else", (s, name: string, parent: string) => {
  const inv = R.invention(idOf(name), s.tree);
  expect(inv.parent).toBe(idOf(parent));
  expect(inv.also_needs).toEqual([]);
  expect(inv.or_parents).toEqual([]);
});

Then("a country of {int} that knows {string} may study {string} for {int} scholar-years", (s, year: number, known: string, name: string, cost: number) => {
  const p = R.newProgramme("Any");
  knowWithNeeds(p, idOf(known), true);
  expect(R.eligibility(p, idOf(name), { year })).toEqual({ ok: true });
  expect(R.studyCostFor(p, idOf(name), { year })).toBe(cost);
});

Then("its row reads {string}", (s, unlock: string) => {
  expect(R.invention(s.learned).unlocks).toBe(unlock);
});

Then("the effect works only while the realm has a {string}", (s, building: string) => {
  expect(R.effectActive(s.learned, new Set())).toBe(false);
  expect(R.effectActive(s.learned, new Set([building]))).toBe(true);
});

// research itself
When("research is next worked out", (s) => {
  const p = programme(s);
  s.withIt = p;
  s.without = R.newProgramme("Without");
});

const upkeepOf = (p: R.Programme): number => {
  const q: R.Programme = { ...p, schools: [{ province: "X", type: "university", open: true, cohorts: [] }] };
  return R.schoolUpkeep(q);
};

Then("school upkeep is {int} % lower", (s, pct: number) => {
  expect(upkeepOf(s.withIt)).toBeCloseTo((upkeepOf(s.without) * (100 - pct)) / 100);
});

Then("each partner takes {int} % off", (s, pct: number) => {
  expect(R.spreadPerPartnerPct(s.withIt ?? programme(s))).toBeCloseTo(pct);
});

Then("each partner takes {int} % off and school upkeep is {int} % lower", (s, pct: number, up: number) => {
  expect(R.spreadPerPartnerPct(s.withIt)).toBeCloseTo(pct);
  expect(upkeepOf(s.withIt)).toBeCloseTo((upkeepOf(s.without) * (100 - up)) / 100);
});

Then("research is {int} % higher", (s, pct: number) => {
  expect(R.researchBonusPct(s.withIt, "B6")).toBe(pct);
});

Then("Learning and Sea inventions get {int} % more research", (s, pct: number) => {
  expect(R.researchBonusPct(s.withIt, "L7")).toBe(pct);
  expect(R.researchBonusPct(s.withIt, "S5")).toBe(pct);
  expect(R.researchBonusPct(s.withIt, "B6")).toBe(0);
});

Then("{int} in {int} scholars is lost to old age each year instead of {int} in {int}", (s, _a: number, slow: number, _b: number, fast: number) => {
  s.withIt.scholars = 120;
  s.without.scholars = 120;
  expect(R.oldAgeLoss(s.withIt)).toBe(120 / slow);
  expect(R.oldAgeLoss(s.without)).toBe(120 / fast);
});

When("{int} neighbours or trade partners of {string} know an invention of its own era", (s, n: number) => {
  s.partnersN = n;
});

Then("the invention costs {int} % of its era cost", (s, pct: number) => {
  expect(R.studyCostFor(programme(s), "B5", { year: 1500 }, s.partnersN)).toBeCloseTo((40 * pct) / 100);
});

Then("with {int} such partners it costs {int} % of its era cost", (s, n: number, pct: number) => {
  expect(R.studyCostFor(programme(s), "B5", { year: 1500 }, n)).toBeCloseTo((40 * pct) / 100);
});

Then("{string} opens on the contact event {string}", (s, name: string, contact: string) => {
  expect(R.contactOf(idOf(name), s.tree)).toBe(contact);
});

Then("the country {string} knows {string} from the start", (s, country: string, name: string) => {
  expect(R.startingKnowledgeFor(country.toLowerCase()).has(idOf(name))).toBe(true);
});

// progress
Given("the country {string} has {int} scholars and {int} students", (s, country: string, scholars: number, n: number) => {
  const p = programme(s, country);
  p.scholars = scholars;
  addTempleSchools(p, Math.ceil(n / 20));
  R.fillSeats(p, { recruits: n }, n, 1440);
});

Given("it studies {string} with {int} scholar-years of progress", (s, name: string, progress: number) => {
  const p = programme(s);
  knowWithNeeds(p, idOf(name));
  expect(R.setStudy(p, idOf(name), date(s))).toEqual({ ok: true });
  p.studies.find((x) => x.id === idOf(name))!.progress = progress;
  s.study = idOf(name);
});

Given("the country {string} studies {string} with {int} scholar-years of progress", (s, country: string, name: string, progress: number) => {
  const p = programme(s, country);
  addTempleSchools(p, 1);
  knowWithNeeds(p, idOf(name));
  expect(R.setStudy(p, idOf(name), date(s))).toEqual({ ok: true });
  p.studies.find((x) => x.id === idOf(name))!.progress = progress;
});

When("a month passes", (s) => {
  s.learnedNow = R.researchMonth(programme(s), date(s));
});

When("{int} more months pass", (s, n: number) => {
  for (let i = 0; i < n; i++) R.researchMonth(programme(s), date(s));
});

Then("{float} scholar-years are added to {string}", (s, n: number, name: string) => {
  expect(programme(s).studies.find((x) => x.id === idOf(name))?.progress).toBeCloseTo(n);
});

Then("the country {string} knows {string}", (s, _country: string, name: string) => {
  expect(programme(s).known.has(idOf(name))).toBe(true);
});

Given("the country {string} is at war with {string}, which knows {string}", (s, country: string, enemy: string, name: string) => {
  programme(s, country);
  s.enemyKnows = new Set([idOf(name)]);
  s.enemy = enemy;
});

When("the Ottomans occupy a Venetian province with an open school", (s) => {
  s.helped = R.stealInWar(programme(s), s.enemyKnows, date(s));
});

Then("the country {string} gains {int} scholar-years toward {string}", (s, _country: string, n: number, name: string) => {
  expect(s.helped).toEqual([idOf(name)]);
  expect(programme(s).studies.find((x) => x.id === idOf(name))?.progress).toBeCloseTo(n);
});

Given("the country {string} has an academy of science, {int} scholars and {int} students", (s, country: string, scholars: number, _n: number) => {
  const p = programme(s, country);
  p.known.add("L12");
  R.gainSchool(p, "London", "academy", "build");
  p.scholars = scholars;
});

Given("it studies {string} and {string}", (s, a: string, b: string) => {
  const p = programme(s);
  for (const name of [a, b]) {
    knowWithNeeds(p, idOf(name));
    expect(R.setStudy(p, idOf(name), date(s))).toEqual({ ok: true });
  }
});

When("a year passes", (s) => {
  const p = programme(s);
  if (s.treasury) {
    R.paySchoolUpkeep(p, s.treasury);
    return;
  }
  R.researchYear(p, date(s));
});

Then("each study has {int} scholar-years of progress", (s, n: number) => {
  for (const st of programme(s).studies) expect(st.progress).toBeCloseTo(n);
});

// schools
Given("it has {int} provinces, {int} of them with a school", (s, n: number, withSchool: number) => {
  const p = programme(s);
  s.provinces = Array.from({ length: n }, (_, i) => `P${i + 1}`);
  for (let i = 0; i < withSchool; i++) p.schools.push({ province: s.provinces[i], type: "temple_or_monastery_school", open: true, cohorts: [] });
});

When("the year begins", (s) => {
  const p = programme(s);
  if (s.provinces) {
    s.village = R.villageSeats(p, s.provinces);
    return;
  }
  if (s.neighbourGold !== undefined) {
    s.poached = R.poachingYear(p, s.gold, [{ country: s.neighbourName, gold: s.neighbourGold }]);
    return;
  }
  s.oldAge = R.oldAgeLoss(p);
  p.scholars -= s.oldAge;
});

Then("the {int} provinces without a school have {int} village-school seats each", (s, n: number, seats: number) => {
  expect(s.village).toBe(n * seats);
  expect(R.villageSeats(R.newProgramme("No L18"), s.provinces)).toBe(0);
});

Given(/^it (knows|does not know) the invention "([^"]+)"$/, (s, knows: string, name: string) => {
  if (knows === "knows") R.learn(programme(s), idOf(name));
  else expect(programme(s).known.has(idOf(name))).toBe(false);
});

When(/^the player wants a (\w+(?: of works)?) from (a new university graduate|a working scholar)$/, (s, type: string, who: string) => {
  s.who = who === "a working scholar" ? { graduating: false } : { graduating: true, school: "university" };
  s.allowed = R.mayBecomeOfficial(programme(s), s.who, type);
});

Then("it is allowed", (s) => {
  expect(s.allowed).toBe(true);
});
Then("it is refused", (s) => {
  expect(s.allowed).toBe(false);
});

Then("the graduates are counted as scholars without a sex", (s) => {
  const p = programme(s);
  expect(p.scholars).toBeGreaterThan(0);
  expect(Object.keys(p)).not.toContain("women");
});

Then("whether a scholar named to a role is a woman is the realm's women-in-roles roll", (s) => {
  expect(Object.keys(R)).not.toContain("womanScholarChance");
});

Then(/^it knows "([^"]+)" and "([^"]+)", which "([^"]+)" needs$/, (s, a: string, b: string, c: string) => {
  const known: Set<string> = s.p.known;
  expect(known.has(idOf(c))).toBe(true);
  expect(known.has(idOf(a))).toBe(true);
  expect(known.has(idOf(b))).toBe(true);
  const inv = R.invention(idOf(c));
  expect([inv.parent, ...inv.also_needs]).toEqual(expect.arrayContaining([idOf(a), idOf(b)]));
});

Then("it does not know {string}", (s, name: string) => {
  expect(s.p.known.has(idOf(name))).toBe(false);
});

Then("it has no study under way", (s) => {
  expect(s.p.studies).toEqual([]);
});

// war and research
Given("the country {string} has {int} schools and {int} gold", (s, country: string, n: number, gold: number) => {
  addTempleSchools(programme(s, country), n);
  s.treasury = { gold };
  s.goldBefore = gold;
});

Then("it pays school upkeep from the same gold that pays soldiers", (s) => {
  expect(s.treasury.gold).toBeLessThan(s.goldBefore);
});

Then("the country {string} has {int} gold", (s, _country: string, gold: number) => {
  expect(s.treasury.gold).toBe(gold);
});

When("a battle is fought in {string} and the sack roll comes up", (s, province: string) => {
  // Find a seed whose first roll sacks, then use it.
  let seed = 1;
  while (new Rng(seed).int(100) >= R.researchConfig.sack_chance_pct) seed++;
  s.sack = R.sackRoll(programme(s), province, 20, s.neighbours, new Rng(seed));
  if (s.sack.sacked) s.outcome = "lost";
});

Then("10 scholars flee to {string}", (s, country: string) => {
  expect(s.sack).toEqual({ sacked: true, fled: 10, to: country });
});

Then("over many battles about {int} % of the rolls sack the school", (s, pct: number) => {
  const rng = new Rng(7);
  let sacked = 0;
  for (let i = 0; i < 2000; i++) {
    const p = R.newProgramme("Milan");
    p.schools.push({ province: "Milan", type: "university", open: true, cohorts: [] });
    if (R.sackRoll(p, "Milan", 20, [], rng).sacked) sacked++;
  }
  expect(Math.abs(sacked / 20 - pct)).toBeLessThan(3);
});

Given("the country {string} has {int} scholars and {int} gold", (s, country: string, scholars: number, gold: number) => {
  programme(s, country).scholars = scholars;
  s.gold = gold;
});

Given("its neighbour {string} has {int} gold", (s, name: string, gold: number) => {
  s.neighbourName = name;
  s.neighbourGold = gold;
});

Then("the country {string} loses {int} scholars to {string}", (s, _country: string, n: number, to: string) => {
  expect(s.poached.scholars).toBe(n);
  if (n > 0) expect(s.poached.by).toBe(to);
});

Then("the country {string} loses {int} scholars to old age", (s, _country: string, n: number) => {
  expect(s.oldAge).toBe(n);
});

Given("the AI country {string} has {int} empty seats", (s, country: string, n: number) => {
  addTempleSchools(programme(s, country), n / 20);
});

Given(/^it is (at peace|at war)$/, (s, state: string) => {
  s.atWar = state === "at war";
});

When("the AI plans its research", (s) => {
  const p = programme(s);
  s.aiStudy = R.aiChooseStudy(p, date(s));
  s.aiSeats = R.aiSeatsToFill(p, s.atWar);
});

Then("it studies the cheapest invention it may study, ties by id", (s) => {
  const p = programme(s);
  const ok = [...R.tree().inventions.keys()].filter((id) => R.eligibility(p, id, date(s)).ok);
  const cheapest = Math.min(...ok.map((id) => R.studyCostFor(p, id, date(s))));
  expect(s.aiStudy).toBe(ok.filter((id) => R.studyCostFor(p, id, date(s)) === cheapest).sort()[0]);
});

Then("it fills {int} seats", (s, n: number) => {
  expect(s.aiSeats).toBe(n);
});

Given("the country {string} learned {string} in {int}", (s, country: string, name: string, year: number) => {
  R.learn(programme(s, country), idOf(name));
  s.learnedYear = { [idOf(name)]: year };
});

When("the year {int} begins", (s, year: number) => {
  s.steps = R.harvestStepsFromInventions(programme(s), year, s.learnedYear);
});

Then("its inventions give {int} harvest steps from guano", (s, n: number) => {
  expect(s.steps).toBe(n);
});

When("the country {string} is set up", (s, country: string) => {
  s.p = R.startingProgramme(country.toLowerCase());
});

Then("it typically knows {string}", (s, name: string) => {
  expect(s.p.known.has(idOf(name))).toBe(true);
});

// ------------------------------------------------------------ the past eras (RSCH-091 to RSCH-097)

const nationId = (country: string): string => country.toLowerCase().replace(/ /g, "_");
Given("the invention tree config with the past eras", (s) => {
  s.rows = [...(R.researchConfig.inventions as R.InventionRow[])];
});

Then("it has the eras Ancient and Medieval before era I", (s) => {
  expect(R.TREE_ERAS.slice(0, 3)).toEqual(["A", "M", "I"]);
  expect([R.eraName("A"), R.eraName("M")]).toEqual(["Ancient", "Medieval"]);
  expect(R.eraIndex("M")).toBeLessThan(R.eraIndex("I"));
});

Then("it holds {int} past inventions of era Ancient and {int} of era Medieval", (s, a: number, m: number) => {
  const counts = R.countByEra(s.tree);
  expect([counts.A, counts.M]).toEqual([a, m]);
});

Then("it holds {int} inventions in all", (s, n: number) => {
  expect((s.tree as R.Tree).inventions.size).toBe(n);
});

Then("{string} needs the past invention {string}", (s, name: string, past: string) => {
  const inv = R.invention(idOf(name), s.tree);
  expect(R.isPast(R.invention(idOf(past), s.tree))).toBe(true);
  expect([inv.parent, ...inv.or_parents, ...inv.also_needs]).toContain(idOf(past));
});

Given("the country {string} starts without {string} but with {string}", (s, country: string, lacks: string, has: string) => {
  // Only what the realm has here: the root, the boughs, and the invention it has with all it needs.
  const p = (s.p = R.newProgramme(nationId(country)));
  knowWithNeeds(p, idOf(has), true);
  expect(p.known.has(idOf(lacks))).toBe(false);
  expect(R.startingKnowledgeFor(nationId(country)).has(idOf(lacks))).toBe(false);
  expect(R.startingKnowledgeFor(nationId(country)).has(idOf(has))).toBe(true);
});

Given("the country {string} starts without {string}", (s, country: string, lacks: string) => {
  s.p = R.startingProgramme(nationId(country));
  expect(s.p.known.has(idOf(lacks))).toBe(false);
});

Given("the country {string} starts knowing every past invention", (s, country: string) => {
  s.p = R.startingProgramme(nationId(country));
  expect(R.missingPast(s.p.known)).toEqual([]);
});

When("it tries to study {string} in {int}", (s, name: string, year: number) => {
  s.date = { year };
  s.result = R.eligibility(programme(s), idOf(name), s.date);
  s.cost = R.studyCostFor(programme(s), idOf(name), s.date, s.partners?.[idOf(name)] ?? 0);
});

Then("the past invention costs {float} scholar-years", (s, cost: number) => {
  expect(s.result).toEqual({ ok: true });
  expect(s.cost).toBeCloseTo(cost);
});

When("its lack of a past invention applies", (s) => {
  s.without = R.without(programme(s).known);
});

Then("its farmland harvests one step worse", (s) => {
  expect(s.without.harvestSteps).toBe(-1);
});

Then("it can raise no horse regiments", (s) => {
  expect(s.without.noArms).toEqual(expect.arrayContaining(["light horse", "knights and lancers"]));
  expect(s.without.noCaravans).toBe(true);
});

Then("its armies carry half the food", (s) => {
  expect(s.without.foodCarriedPct).toBe(50);
});

Then("its regiments fight {int} % weaker", (s, pct: number) => {
  expect(s.without.strengthPct).toBe(-pct);
});

Then("nothing changes against today's rules", (s) => {
  expect(s.without).toEqual({ harvestSteps: 0, noArms: [], noCaravans: false, foodCarriedPct: 100, strengthPct: 0 });
});

Given("no realm from across the ocean has met it", (s) => {
  expect(programme(s).contacts.size).toBe(0);
});

Then("the study is refused until first contact", (s) => {
  expect(s.result).toEqual({ ok: false, reason: "contact" });
});

When("exploration reports its first contact with {string}", (s, other: string) => {
  const p = programme(s);
  const contact = R.researchConfig.regional_contacts.find((c) => c.groups.includes(p.group ?? ""))!;
  // The other realm comes from across the ocean: its start group is not one of the contact's.
  expect(contact.groups).not.toContain(R.startGroupOf(nationId(other)));
  R.contactEvent(p, contact.contact);
});

Then("the country {string} may study {string}", (s, _country: string, name: string) => {
  expect(R.eligibility(programme(s), idOf(name), date(s))).toEqual({ ok: true });
});

When("the country {string} is set up from its start group", (s, country: string) => {
  s.p = R.startingProgramme(nationId(country));
});

Then("its standing is {string}", (s, standing: string) => {
  expect(R.eraName(R.standing(s.p.known))).toBe(standing);
});

Then("it is behind the times by {int} eras", (s, n: number) => {
  expect(R.behindBy(s.p.known, date(s))).toBe(n);
});

// ------------------------------------------------------------ start groups (RSCH-098, RSCH-099)

Then("it belongs to the start group {string}", (s, group: string) => {
  expect(s.p.group).toBe(group);
});

Then("it starts knowing {int} inventions besides the root and the boughs", (s, n: number) => {
  expect(s.p.known.size - R.startingKnowledge().size).toBe(n);
});

Given("the research data with start groups", (s) => {
  s.groups = R.startGroupTable();
});

When("every map nation is looked up", (s) => {
  s.nations = loadDefaultRuleset().nations.map((n) => n.id);
  s.memberships = s.nations.map((id: string) => Object.values(s.groups as Record<string, { realms: string[] }>).filter((g) => g.realms.includes(id)).length);
});

Then("each of the {int} map nations belongs to exactly one start group", (s, n: number) => {
  expect(s.nations.length).toBe(n);
  expect(s.memberships.every((k: number) => k === 1)).toBe(true);
});

When("every map nation's start set is built", (s) => {
  s.gaps = loadDefaultRuleset().nations.flatMap((n) => R.startSetGaps(R.startingKnowledgeFor(n.id)).map((g) => ({ nation: n.id, ...g })));
});

Then("every invention in it has its parent or an alternative and everything it also needs in the same set", (s) => {
  expect(s.gaps).toEqual([]);
  // The check refuses a set that is not complete.
  expect(R.startSetGaps(new Set(["R0", "R1", "R2", "R3", "R4", "W2"]))).toEqual([{ id: "W2", missing: ["C02", "F03"] }]);
});

Then(/^it (starts knowing|does not start knowing) "([^"]+)"$/, (s, knows: string, name: string) => {
  expect(s.p.known.has(idOf(name))).toBe(knows === "starts knowing");
});

// ------------------------------------------------------------ the study queue (RSCH-108, RSCH-109)

/** A realm from its 1444 start with a school and scholars, so research moves. */
function queueRealm(s: Record<string, any>, country: string): R.Programme {
  const p = (s.p = R.startingProgramme(nationId(country)));
  addTempleSchools(p, 1);
  p.scholars = 10;
  return p;
}

Given(/^the country "([^"]+)" studies "([^"]+)" with its queue ((?:"[^"]+"(?:, )?)+)$/, (s, country: string, study: string, queue: string) => {
  const p = queueRealm(s, country);
  expect(R.setStudy(p, idOf(study), date(s))).toEqual({ ok: true });
  p.queue = [...queue.matchAll(/"([^"]+)"/g)].map((m) => idOf(m[1]!));
});

When("{string} is learned from the queue", (s, name: string) => {
  const p = programme(s);
  const study = p.studies.find((x) => x.id === idOf(name))!;
  study.progress = R.studyCostFor(p, study.id, date(s));
  s.learnedNow = R.researchMonth(p, date(s));
  expect(s.learnedNow).toContain(idOf(name));
});

Then("the queue moves on to {string} with no alert to choose", (s, name: string) => {
  // The alert to choose comes only when nothing is studied (RSCH-089, RSCH-108).
  expect(programme(s).studies).toEqual([{ id: idOf(name), progress: 0 }]);
});

Then("the study queue holds {string}", (s, name: string) => {
  expect(programme(s).queue).toEqual([idOf(name)]);
});

Then("{string} stays queued and marked waiting", (s, name: string) => {
  const p = programme(s);
  expect(p.queue).toContain(idOf(name));
  expect(R.queuedWaiting(p, idOf(name), date(s))).toBe(true);
});

Given("the country {string} has an empty study queue and knows {string}", (s, country: string, name: string) => {
  const p = queueRealm(s, country);
  expect(p.queue).toEqual([]);
  expect(p.known.has(idOf(name))).toBe(true);
});

When("the player queues the path to {string}", (s, name: string) => {
  s.queued = R.queuePath(programme(s), idOf(name), date(s));
});

Then(/^the study queue holds, in an order that can be studied, ((?:"[^"]+"(?:, | and )?)+)$/, (s, list: string) => {
  const ids = [...list.matchAll(/"([^"]+)"/g)].map((m) => idOf(m[1]!));
  const p = programme(s);
  expect(p.queue).toEqual(ids);
  // Each can be studied once those before it are known.
  const q = R.newProgramme(p.country);
  q.known = new Set(p.known);
  for (const id of p.queue) {
    expect(R.eligibility(q, id, date(s))).toEqual({ ok: true });
    q.known.add(id);
  }
});

Given("the country {string} has {int} inventions in its study queue", (s, country: string, n: number) => {
  const p = queueRealm(s, country);
  const open = [...R.tree().inventions.keys()].filter((id) => R.eligibility(p, id, date(s)).ok);
  expect(R.setStudy(p, open[0]!, date(s))).toEqual({ ok: true });
  for (const id of open.slice(1, n + 1)) expect(R.enqueue(p, id, date(s))).toEqual({ ok: true });
  expect(p.queue.length).toBe(n);
});

When("the player queues the path to an invention that needs {int} more steps", (s, n: number) => {
  const p = programme(s);
  const far = [...R.tree().inventions.keys()].find((id) => {
    const r = R.pathTo(p, id);
    return r.ok && r.path.length === n + 1;
  })!;
  s.before = [...p.queue];
  s.queued = R.queuePath(p, far, date(s));
});

Then("nothing is added to the study queue and the sheet says the queue is full", (s) => {
  expect(s.queued).toEqual({ ok: false, reason: "queue_full" });
  expect(programme(s).queue).toEqual(s.before);
});
