import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect } from "vitest";
import { Rng } from "@ph/engine";
import * as D from "@ph/engine/domain/diplomacy";
import { relations as rel, type Diplomacy } from "@ph/engine/domain/diplomacy";
import { steps, type Scenario, type Table } from "../src/registry.ts";

const { Given, When, Then } = steps("diplomacy");

// ---------------------------------------------------------------- helpers

const DATASET_PATH = new URL("../../rules/data/domain/diplomacy-relations-1444.json", import.meta.url);
const datasetHash = () => createHash("sha256").update(readFileSync(DATASET_PATH)).digest("hex");

/** The scenario's diplomacy state; a test route of 10 crossing units stands in for the map. */
function w(s: Scenario): Diplomacy {
  if (!s.d) {
    const d = D.createDiplomacy(s.date ?? "1444-11-01");
    d.defaultRoute = { land: [{ kind: "land", units: 10 }] };
    s.d = d;
  }
  return s.d as Diplomacy;
}
const g = (s: Scenario) => w(s).graph;
const c = (s: Scenario, id: string) => D.country(w(s), id);

/** Marks that the scenario has acted: steps used both as Given and as Then now check instead of set. */
const act = (s: Scenario) => (s.acted = true);

function attempt(s: Scenario, fn: () => unknown): void {
  act(s);
  try {
    s.result = fn();
    s.error = undefined;
  } catch (e) {
    if (!(e instanceof D.RuleError)) throw e;
    s.error = e.message;
  }
}

function setDate(s: Scenario, date: string): void {
  s.date = date;
  const d = w(s);
  d.date = date;
  d.graph.date = date;
}

/** The 1444 start as the design's worked example reads it (diplomacy 14, 13.3; envoys example). */
function start1444(s: Scenario): void {
  const d = w(s);
  for (const k of ["Venice", "Hungary", "Florence", "Austria", "Papal States"]) c(s, k).faith = "catholic";
  c(s, "Ottomans").faith = "sunni";
  c(s, "Hungary").soldiers = 14000;
  c(s, "Venice").soldiers = 18350;
  D.setBorder(d, "Hungary", "Venice");
}

/** Stores a state relation as data (as the dataset does), without the actions' side effects. */
function addState(s: Scenario, type: string, a: string, b: string): void {
  rel.setRelation(g(s), type, a, b);
}

/** Forces the next roll to come up (below the chance) or not, using the game's Rng. */
function rngWhere(pred: (x: number) => boolean): Rng {
  for (let seed = 1; ; seed++) {
    const r = new Rng(seed);
    const probe = new Rng(Uint32Array.from(r.state));
    if (pred(probe.next())) return r;
  }
}

const num = (x: string) => Number(x.replace(/,/g, ""));
const lower = (x: string) => x.toLowerCase().replace(/ /g, "_");

const ACTIONS: Record<string, string> = {
  "propose alliance": "propose_alliance", "an alliance": "propose_alliance", alliance: "propose_alliance", "swear peace": "swear_peace", "arrange marriage": "arrange_marriage",
  "trade pact": "trade_pact", "a trade pact": "trade_pact", "send gift": "send_gift", "ask for passage": "ask_passage", passage: "ask_passage", "call to arms": "call_to_arms",
  "court a lord": "court_lord", "make resident": "make_resident", "a demand": "demand",
};
const actionId = (x: string) => ACTIONS[x] ?? lower(x);

/** Everything a scenario's relation set step builds. */
let rid = 0;
function R(t: string, a: string, b: string, dir?: string, extra: Record<string, unknown> = {}): rel.RelationRecord {
  const direction = dir ?? (t === "subject" || t === "overlord" ? "directed" : "mutual");
  const r: rel.RelationRecord = { id: `${t}_${a}_${b}_${direction}_${++rid}`, type: t, source: a, target: b, direction, origin: "gameplay" };
  if (t === "subject") {
    r.subject_kind = "vassal";
    r.autonomy = "moderate";
  }
  return Object.assign(r, extra);
}
const set = (s: Scenario): rel.RelationRecord[] => (s.set ??= []);

// ---------------------------------------------------------------- general

Given("the diplomacy rules are in force", (s) => void w(s));
When("the game evaluates it", (s) => void act(s));
Given("the date is {string}", (s, date: string) => {
  setDate(s, date);
  if (date === "1444-11-11") start1444(s);
});
Given("the era is {string}", (s, era: string) => void (w(s).era = era));
When("the month passes", (s) => {
  act(s);
  D.advanceMonth(w(s));
});

// ---------------------------------------------------------------- relation model

Given("the country {string} is a subject of the country {string} with kind {string}", (s, a: string, b: string, kind: string) => void rel.makeSubject(g(s), a, b, kind));
Given("the country {string} is a subject of the country {string}", (s, a: string, b: string) => void rel.makeSubject(g(s), a, b));
Given("the country {string} is a subject of {string} with kind {string}", (s, a: string, b: string, kind: string) => void rel.makeSubject(g(s), a, b, kind));
Given("the country {string} is a subject of {string}", (s, a: string, b: string) => void rel.makeSubject(g(s), a, b));
When("the game reads the relations of the country {string}", (s) => void act(s));
Given("the country {string} is the overlord of the country {string}", (s, ov: string, sub: string) => {
  if (s.acted) expect(rel.overlord(g(s), sub)).toBe(ov);
  else rel.makeSubject(g(s), sub, ov);
});
Then("no Overlord record is stored", (s) => expect(g(s).relations.some((r) => r.type === "overlord")).toBe(false));

Given("a relation set holding an Overlord record from {string} to {string}", (s, a: string, b: string) => void set(s).push(R("overlord", a, b, "directed")));
Given("a relation set holding a {string} and a {string} between the countries {string} and {string}", (s, x: string, y: string, a: string, b: string) => void set(s).push(R(x, a, b), R(y, a, b)));
Given("a relation set holding a one-way {string} from {string} to {string} and a one-way {string} from {string} to {string}", (s, t1: string, a1: string, b1: string, t2: string, a2: string, b2: string) =>
  void set(s).push(R(t1, a1, b1, "one_way"), R(t2, a2, b2, "one_way")));
Given("a relation set where the country {string} is a subject of {string} and of {string}", (s, a: string, b: string, c2: string) => void set(s).push(R("subject", a, b), R("subject", a, c2)));
Given("a relation set where {string} is a subject of {string}, {string} of {string} and {string} of {string}", (s, a: string, b: string, b2: string, c2: string, c3: string, a2: string) =>
  void set(s).push(R("subject", a, b), R("subject", b2, c2), R("subject", c3, a2)));
Given("a relation set holding a mutual {string} from {string} to {string} and a mutual {string} from {string} to {string}", (s, t1: string, a1: string, b1: string, t2: string, a2: string, b2: string) =>
  void set(s).push(R(t1, a1, b1), R(t2, a2, b2)));
Given("a relation set holding a mutual {string} between {string} and {string} and a one-way {string} from {string} to {string}", (s, t1: string, a1: string, b1: string, t2: string, a2: string, b2: string) =>
  void set(s).push(R(t1, a1, b1), R(t2, a2, b2, "one_way")));
Given("a relation set holding a {string} and a {string} between the same pair", (s, x: string, y: string) => void set(s).push(R(x, "A", "B"), R(y, "A", "B")));
Given("a relation set holding a {string} and a {string} between the same pair with note {string}", (s, x: string, y: string, note: string) =>
  void set(s).push(R(x, "A", "B"), R(y, "A", "B", undefined, note === "none" ? {} : { note })));
Given("a relation set holding a {string} from {string} to {string}", (s, t: string, a: string, b: string) => void set(s).push(R(t, a, b)));
Given("a relation set holding a one-way {string} from {string} to {string}", (s, t: string, a: string, b: string) => void set(s).push(R(t, a, b, "one_way")));
Given("a relation set holding a {string} with kind {string}", (s, t: string, kind: string) => void set(s).push(R(t, "A", "B", undefined, { subject_kind: kind })));
When("the validator checks the relation set", (s) => {
  act(s);
  s.report = rel.checkRelations(set(s));
});
Then("the validator reports the error {string}", (s, frag: string) => expect((s.report as rel.Report).errors.some((e) => e.includes(frag)), (s.report as rel.Report).errors.join("\n")).toBe(true));
Then("the validator reports no error", (s) => expect((s.report as rel.Report).errors).toEqual([]));
Then("the validator reports an error", (s) => expect((s.report as rel.Report).errors.length).toBeGreaterThan(0));
Then("the validator reports a warning {string}", (s, frag: string) => expect((s.report as rel.Report).warnings.some((e) => e.includes(frag))).toBe(true));
Then("the validator result is {string}", (s, result: string) => {
  const errs = (s.report as rel.Report).errors;
  if (result === "no error") expect(errs).toEqual([]);
  else expect(errs.some((e) => e.includes(result.replace(/^error /, ""))), errs.join("\n")).toBe(true);
});

Given("the countries {string} and {string} have the state {string} and no stored stance", (s, a: string, b: string, st: string) => {
  if (st !== "none") addState(s, st, a, b);
});
When("the game reads the stance of {string} toward {string}", (s, a: string, b: string) => {
  act(s);
  s.stance = rel.stance(g(s), a, b);
});
Then("the stance is {string}", (s, st: string) => expect(s.stance).toBe(st));

const DATA_IDS: Record<string, string> = { Ottomans: "ottoman" };
const dataId = (n: string) => DATA_IDS[n] ?? lower(n);
Given("the dataset holds no relation between the countries {string} and {string}", (s, a: string, b: string) => {
  s.d = D.createFromDataset();
  s.pair = [dataId(a), dataId(b)];
  expect(rel.relationsBetween(g(s), dataId(a), dataId(b))).toEqual([]);
});
When("the game reads the pair", (s) => {
  act(s);
  const [a, b] = s.pair as [string, string];
  s.pairText = rel.relationsBetween(g(s), a, b).length ? "recorded" : "nothing recorded";
});
Then("the pair is {string}", (s, t: string) => expect(s.pairText).toBe(t));
Then("no Alliance, Subject or Rival is inferred from neighbourhood or friendliness", (s) => {
  const [a, b] = s.pair as [string, string];
  expect(rel.stateOf(g(s), a, b)).toBeNull();
  expect(rel.overlord(g(s), a) === b || rel.overlord(g(s), b) === a).toBe(false);
  expect(rel.stance(g(s), a, b)).toBe("neutral");
  expect(rel.stance(g(s), b, a)).toBe("neutral");
});

Given("the 1444 dataset holds an Alliance and an At War for the same pair", (s) => {
  const recs = structuredClone(D.dataset1444.relations);
  const ally = recs.find((r) => r.type === "alliance")!;
  recs.push({ ...ally, id: `${String(ally.id)}_war`, type: "at_war" });
  s.set = recs;
  s.before = recs.length;
});
When("the validator checks the dataset", (s) => {
  act(s);
  s.report = rel.checkRelations(s.set, { historical: true, referenceDate: D.dataset1444.reference_date });
});
Then("the dataset is rejected", (s) => expect((s.report as rel.Report).errors.length).toBeGreaterThan(0));
Then("neither record is removed automatically", (s) => expect((s.set as unknown[]).length).toBe(s.before));

Given("the countries {string} and {string} have a {string}", (s, a: string, b: string, t: string) => {
  addState(s, t, a, b);
  s.pair = [a, b];
});
Given("in the same tick an effect sets {string} and another sets {string} between them", (s, x: string, y: string) => void (s.tick = [x, y]));
When("the tick is resolved", (s) => {
  act(s);
  const [a, b] = s.pair as [string, string];
  rel.setRelation(g(s), rel.resolveSameTick(s.tick as string[]), a, b);
});
Then("{string} wins because At War comes before Truce, Subject and Alliance", (s, t: string) => {
  const [a, b] = s.pair as [string, string];
  expect(rel.stateOf(g(s), a, b)).toBe(t);
  expect(rel.checkRelations(g(s).relations).errors).toEqual([]);
});
When("the game evaluates the precedence", (s) => void act(s));
Then("the relation precedence is {string}", (_s, order: string) => expect(D.config.relations.precedence.order.join(", ")).toBe(order));

Given("the country {string} holds no contested object with the country {string}", () => {});
When("the country {string} declares the country {string} a rival", (s, a: string, b: string) => attempt(s, () => D.declareRival(w(s), a, b, undefined)));
Then("the action is refused with {string}", (s, msg: string) => expect(s.error).toContain(msg));

Given("the fact {string} between the countries {string} and {string}", (s, f: string, a: string, b: string) => void rel.addFact(g(s), f, a, b));
When("the game reads the relations between {string} and {string}", (s, a: string, b: string) => {
  act(s);
  s.pair = [a, b];
});
Then("the fact creates no relation type", (s) => expect(rel.relationsBetween(g(s), ...(s.pair as [string, string]))).toEqual([]));
Then("the fact blocks no relation action", (s) => {
  const [a, b] = s.pair as [string, string];
  for (const fn of [(x: rel.RelationGraph) => rel.formAlliance(x, a, b), (x: rel.RelationGraph) => rel.declareWar(x, a, b), (x: rel.RelationGraph) => rel.setRival(x, a, b, "a throne")]) {
    expect(() => fn(structuredClone(g(s)))).not.toThrow();
  }
});

Given("the countries {string} and {string} form an alliance in play", (s, a: string, b: string) => {
  s.hash = datasetHash();
  rel.formAlliance(g(s), a, b);
  s.pair = [a, b];
});
When("the game is saved", (s) => {
  act(s);
  s.saved = JSON.stringify(w(s));
});
Then("the alliance has origin {string}", (s, o: string) => expect(rel.find(g(s), "alliance", ...(s.pair as [string, string]))[0]?.origin).toBe(o));
Then("the file {string} is unchanged", (s) => expect(datasetHash()).toBe(s.hash));

Given("a relation between {string} and {string} is locked", (s, a: string, b: string) => {
  rel.setStance(g(s), a, b, "friendly");
  rel.setStance(g(s), b, a, "friendly");
  for (const r of rel.relationsBetween(g(s), a, b)) r.locked = true;
  s.pair = [a, b];
  s.snapshot = JSON.stringify(g(s).relations);
});
When("the country {string} insults the country {string}", (s, a: string, b: string) => attempt(s, () => D.insult(w(s), a, b)));
Then("the relation is unchanged", (s) => {
  expect(s.error).toBeDefined();
  expect(JSON.stringify(g(s).relations)).toBe(s.snapshot);
});
Then("a scripted event may change it", (s) => {
  const [a, b] = s.pair as [string, string];
  D.insult(w(s), a, b, true);
  expect(JSON.stringify(g(s).relations)).not.toBe(s.snapshot);
});

Given("a relation with start date {string} and expiry {string} of type {string}", (s, start: string, exp: string, t: string) =>
  void set(s).push(R(t, "A", "B", undefined, exp === "none" ? { start_date: start } : { start_date: start, expires_on: exp })));
When("the validator checks it against the reference date {string}", (s, ref: string) => {
  act(s);
  s.report = rel.checkRelations(set(s), { referenceDate: ref });
});

Given("the dataset {string} with {int} relations and {int} facts", (_s, _f: string, n: number, f: number) => {
  expect(D.dataset1444.relations.length).toBe(n);
  expect(D.dataset1444.facts.length).toBe(f);
});
When("the validator checks it with the rules file", (s) => {
  act(s);
  const r = rel.checkRelations(D.dataset1444.relations, { historical: true, referenceDate: D.dataset1444.reference_date });
  r.errors.push(...rel.checkFacts(D.dataset1444.facts).errors);
  s.report = r;
});

When("the country {string} pledges protection to the country {string}", (s, a: string, b: string) => {
  s.pair = [a, b];
  attempt(s, () => D.pledgeProtection(w(s), a, b));
});
Then("a {string} fact is recorded", (s, f: string) => expect(rel.hasFact(g(s), f, ...(s.pair as [string, string]), true)).toBe(true));
Then("no relation type other than the nine is used", (s) => {
  expect(g(s).relations.every((r) => rel.RELATION_TYPES.includes(r.type))).toBe(true);
  expect(rel.RELATION_TYPES.length).toBe(9);
  expect(rel.relationsBetween(g(s), ...(s.pair as [string, string]))).toEqual([]);
});

Given("the config value {string} is changed", (s, k: string) => {
  s.hash = datasetHash();
  const cfg = structuredClone(D.config) as unknown as Record<string, Record<string, number>>;
  const [sec, field] = k.split(".") as [string, string];
  cfg[sec]![field] = (cfg[sec]![field] ?? 0) + 12;
  s.cfg = cfg;
});
When("the game loads", (s) => {
  act(s);
  s.d = D.createFromDataset();
});

// ---------------------------------------------------------------- relation actions

Given("the countries {string} and {string} are at war", (s, a: string, b: string) => {
  addState(s, "at_war", a, b);
  s.pair = [a, b];
});
When("{string} and {string} make peace with a truce of {int} months", (s, a: string, b: string, m: number) => {
  act(s);
  rel.makePeace(g(s), a, b, { truceMonths: m });
});
When("{string} and {string} make peace", (s, a: string, b: string) => {
  act(s);
  rel.makePeace(g(s), a, b);
  s.pair = [a, b];
});
Then("{string} and {string} have a {string}", (s, a: string, b: string, t: string) => expect(rel.has(g(s), t, a, b)).toBe(true));
Given("the stance of {string} toward {string} is stored as {string}", (s, a: string, b: string, t: string) => {
  if (s.acted) expect(rel.storedStance(g(s), a, b)).toBe(t);
  else rel.setStance(g(s), a, b, t);
  s.pair = [a, b];
});
When("the country {string} declares war on the country {string}", (s, a: string, b: string) => attempt(s, () => D.declareWar(w(s), a, b)));
Then("the declaration is refused because a truce is in force", (s) => expect(s.error).toMatch(/truce/));
When("the country {string} breaks the truce with the country {string}", (s, a: string, b: string) => attempt(s, () => D.breakTruce(w(s), a, b)));
Then("{string} and {string} are at war", (s, a: string, b: string) => expect(rel.has(g(s), "at_war", a, b)).toBe(true));
Then("the country {string} is still a subject of the country {string}", (s, a: string, b: string) => expect(rel.overlord(g(s), a)).toBe(b));

Given("the countries {string} and {string} have a truce expiring {string}", (s, a: string, b: string, exp: string) => {
  addState(s, "truce", a, b);
  rel.find(g(s), "truce", a, b)[0]!.expires_on = exp;
  s.pair = [a, b];
});
Given("{string} and {string} are mutual rivals", (s, a: string, b: string) => {
  rel.setRival(g(s), a, b, "the crown of France");
  rel.setRival(g(s), b, a, "the crown of France");
});
When("both extend the truce by {int} months", (s, m: number) => attempt(s, () => rel.extendTruce(g(s), ...(s.pair as [string, string]), m)));
Then("the truce expires {string}", (s, exp: string) => expect(rel.find(g(s), "truce", ...(s.pair as [string, string]))[0]?.expires_on).toBe(exp));
When("the date reaches {string}", (s, date: string) => {
  act(s);
  D.advanceTo(w(s), date);
});
Then("{string} and {string} have no truce", (s, a: string, b: string) => expect(rel.has(g(s), "truce", a, b)).toBe(false));
Then("the country {string} may declare war on the country {string}", (s, a: string, b: string) => expect(() => D.declareWar(structuredClone(w(s)), a, b)).not.toThrow());
Given("the countries {string} and {string} have no truce", (s, a: string, b: string) => void (s.pair = [a, b]));
Then(/^the action is (allowed|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));

Given("the stance of {string} toward {string} is {string} with a note", (s, a: string, b: string, t: string) => void rel.setStance(g(s), a, b, t, "A disloyal subject."));
When("the country {string} starts an independence war", (s, a: string) => {
  act(s);
  s.pair = [a, rel.independenceWar(g(s), a)];
});
Then("both stances between them are {string}", (s, t: string) => {
  const [a, b] = s.pair as [string, string];
  expect([rel.stance(g(s), a, b), rel.stance(g(s), b, a)]).toEqual([t, t]);
});
When("{string} becomes a subject of {string} with kind {string}", (s, a: string, b: string, k: string) => void rel.makeSubject(g(s), a, b, k));
When("{string} and {string} make peace with {string} becoming a subject of {string}", (s, a: string, b: string, _sub: string, ov: string) => void rel.makePeace(g(s), a, b, { vassalize: ov }));
Then("the overlord of {string} is {string}", (s, a: string, b: string) => expect(rel.overlord(g(s), a)).toBe(b));

Given("the country {string} started an independence war against its overlord {string}", (s, a: string, b: string) => {
  rel.makeSubject(g(s), a, b);
  rel.independenceWar(g(s), a);
  s.sub = a;
});
When("the country {string} wins the war", (s, winner: string) => {
  act(s);
  rel.endIndependenceWar(g(s), s.sub, winner);
});
Then("the country {string} is again a subject of the country {string}", (s, a: string, b: string) => {
  expect(rel.overlord(g(s), a)).toBe(b);
  expect(rel.checkRelations(g(s).relations).errors).toEqual([]);
});

Given("the countries {string} and {string} are allied", (s, a: string, b: string) => {
  if (s.acted) expect(rel.has(g(s), "alliance", a, b)).toBe(true);
  else addState(s, "alliance", a, b);
  s.pair = [a, b];
});
Then("the declaration is refused", (s) => expect(s.error).toBeDefined());
When("the country {string} breaks the alliance with the country {string}", (s, a: string, b: string) => attempt(s, () => D.breakAlliance(w(s), a, b)));
Then("the country {string} gains an Oath broken", (s, a: string) => expect(c(s, a).oaths.length).toBeGreaterThan(0));
Then("the declaration is refused with {string}", (s, msg: string) => expect(s.error).toContain(msg));

Given("no stance of {string} toward {string} is stored", (s, a: string, b: string) => expect(rel.storedStance(g(s), a, b)).toBeNull());
Then("the friendly stance is ended", (s) => expect(g(s).relations.some((r) => r.type === "friendly")).toBe(false));

Then("they have a {string} and both stances are {string}", (s, t: string, st: string) => {
  const [a, b] = s.pair as [string, string];
  expect(rel.has(g(s), t, a, b)).toBe(true);
  expect([rel.stance(g(s), a, b), rel.stance(g(s), b, a)]).toEqual([st, st]);
});
When("the country {string} proposes an alliance to the country {string}", (s, a: string, b: string) => {
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: a, asked: b });
  attempt(s, () => D.proposeAlliance(w(s), a, b));
});
Then("the alliance is refused because a stance is {string}", (s, t: string) => expect(s.error).toContain(t));
When("relations between them improve until both stances are {string}", (s, t: string) => {
  act(s);
  const [a, b] = s.pair as [string, string];
  for (let i = 0; i < 4; i++) {
    if (rel.stance(g(s), a, b) !== t) rel.improveRelations(g(s), a, b);
    if (rel.stance(g(s), b, a) !== t) rel.improveRelations(g(s), b, a);
  }
  expect([rel.stance(g(s), a, b), rel.stance(g(s), b, a)]).toEqual([t, t]);
});
When("the countries {string} and {string} form an alliance", (s, a: string, b: string) => attempt(s, () => rel.formAlliance(g(s), a, b)));
Then("they are allied", (s) => expect(rel.has(g(s), "alliance", ...(s.pair as [string, string]))).toBe(true));
Then("they have no truce", (s) => expect(rel.has(g(s), "truce", ...(s.pair as [string, string]))).toBe(false));
Then("no friendly stance is stored between them", (s) => expect(rel.relationsBetween(g(s), ...(s.pair as [string, string])).some((r) => r.type === "friendly")).toBe(false));

Given("the countries {string} and {string} have {string}", (s, a: string, b: string, r: string) => {
  if (r === "at_war") addState(s, "at_war", a, b);
  else if (r === `${a} is a subject of ${b}`) rel.makeSubject(g(s), a, b);
  else throw new Error(`unknown relation ${r}`);
});

When("{string} is made a subject of {string}", (s, a: string, b: string) => attempt(s, () => rel.makeSubject(g(s), a, b)));
Then("the action is refused because {string} already has an overlord", (s) => expect(s.error).toContain("already has overlord"));
When("{string} releases {string}", (s, ov: string, sub: string) => {
  act(s);
  expect(rel.releaseSubject(g(s), sub)).toBe(ov);
});
Then("both stances between {string} and {string} are {string}", (s, a: string, b: string, t: string) => expect([rel.stance(g(s), a, b), rel.stance(g(s), b, a)]).toEqual([t, t]));

Given("the stance of {string} toward {string} is {string}", (s, a: string, b: string, t: string) => {
  if (s.acted) expect(rel.stance(g(s), a, b)).toBe(t);
  else rel.setStance(g(s), a, b, t);
  s.pair = [a, b];
});
Then("the subject record carries the note {string}", (s, note: string) => expect(g(s).relations.find((r) => r.type === "subject")?.note).toBe(note));

When("they make a white peace", (s) => {
  act(s);
  rel.whitePeace(g(s), ...(s.pair as [string, string]));
});
Then("they have a {string}", (s, t: string) => expect(rel.has(g(s), t, ...(s.pair as [string, string]))).toBe(true));
Then("the rival stance notes the contested object is still open", (s) => {
  const r = rel.storedStanceRecord(g(s), ...(s.pair as [string, string]));
  expect(r?.note).toContain("Contested object left open");
});

When("relations of {string} toward {string} improve", (s, a: string, b: string) => {
  act(s);
  rel.improveRelations(g(s), a, b);
});

Given("the country {string} has an alliance with {string} and a rival stance toward {string}", (s, a: string, b: string, x: string) => {
  addState(s, "alliance", a, b);
  rel.setRival(g(s), a, x, "a frontier");
});
When("the country {string} is destroyed", (s, a: string) => {
  act(s);
  rel.countryDestroyed(g(s), a);
});
Then("no relation names the country {string}", (s, a: string) => expect(g(s).relations.some((r) => r.source === a || r.target === a)).toBe(false));

Given("the stance of {string} toward {string} has been {string} for {int} months", (s, a: string, b: string, t: string, m: number) => {
  rel.setStance(g(s), a, b, t);
  rel.storedStanceRecord(g(s), a, b)!.start_date = D.addMonths(D.monthOf(w(s).date), -m);
  s.pair = [a, b];
});
Then("the friendly stance may decay", (s) => expect(rel.friendlyMayDecay(g(s), ...(s.pair as [string, string]))).toBe(true));
// "the rival stance may not change yet" is left undefined: 119 months plus the month that passes is 120, which DIPL-041 allows.
Then("the hostile stance decays to {string}", (s, t: string) => expect(rel.stance(g(s), ...(s.pair as [string, string]))).toBe(t));

Given("the AI country {string} has been exhausted at war for {int} months", (s, _a: string, m: number) => void (s.exhausted = m));
When("a peace is offered", (s) => {
  act(s);
  s.accepts = rel.aiMustAcceptPeace(s.exhausted);
});
Then("the AI country {string} accepts it", (s) => expect(s.accepts).toBe(true));

Then("no trade flows between {string} and {string}", (s, a: string, b: string) => expect(D.tradeAllowed(w(s), a, b)).toBe(false));
Then("each month a border-raid event between them has a chance of {float}", (s, p: number) => expect(rel.borderRaidChance(g(s), ...(s.pair as [string, string]))).toBe(p));

Given("the dataset truce between {string} and {string} expires {string}", (s, a: string, b: string, exp: string) => {
  const t = D.dataset1444.relations.find((r) => r.type === "truce" && r.source === dataId(a) && r.target === dataId(b));
  expect(t?.expires_on).toBe(exp);
  s.pair = [dataId(a), dataId(b)];
});
When("the game starts on {string}", (s, date: string) => {
  act(s);
  s.d = D.createFromDataset(date);
});
Then("the truce expires {string} and not after the configured length", (s, exp: string) => {
  const t = rel.find(g(s), "truce", ...(s.pair as [string, string]))[0]!;
  expect(t.expires_on).toBe(exp);
  expect(t.expires_on).not.toBe(D.addMonths(String(t.start_date), D.config.relations.types.truce!.duration!.default_months!));
});

// ---------------------------------------------------------------- ledger and standing

Given("the countries {string} and {string} share the Catholic faith", (s, a: string, b: string) => {
  c(s, a).faith = "catholic";
  c(s, b).faith = "catholic";
});
Given("no other entry exists in the ledger of {string} toward {string}", (s, a: string, b: string) => expect(w(s).ledgers[D.key(a, b)] ?? []).toEqual([]));
Given(/^the standing of "([^"]*)" toward "([^"]*)" is ([+-]?\d+)$/, (s, a: string, b: string, n: string) => {
  if (s.acted) expect(D.standing(w(s), a, b)).toBe(Number(n));
  else w(s).standingOverride[D.key(a, b)] = Number(n);
});
Then(/^the event-tree `opinion` of "([^"]*)" toward "([^"]*)" is ([+-]?\d+)$/, (s, a: string, b: string, n: string) => expect(D.standing(w(s), a, b)).toBe(Number(n)));

Given("the relation of {string} toward {string} is {string}", (s, a: string, b: string, t: string) => {
  if (D.relations.layerOf(t) === "state") addState(s, t, a, b);
  else rel.setStance(g(s), a, b, t);
  s.pair = [a, b];
});
Then(/^the ledger line for the relation weighs ([+-]?\d+)$/, (s, n: string) => expect(D.relationLine(w(s), ...(s.pair as [string, string])).weight).toBe(Number(n)));

function lastsText(e: D.LedgerEntry): string[] {
  if (e.fadeYears !== undefined) return [`fades over ${e.fadeYears} years`];
  switch (e.condition) {
    case "marriage": return ["while the marriage lives", "while the marriages live"];
    case "true": return ["while true"];
    case "in_force": return ["while in force"];
    case "claim": return ["while the claim stands"];
    default: return [];
  }
}

/** Makes what the cause says happen, through the rules (A holds the ledger, B is the other). */
function causeTie(s: Scenario, tie: string, cause: string): void {
  const d = w(s);
  switch (tie) {
    case "Married houses": {
      const n = cause.startsWith("three") ? 3 : 1;
      for (let i = 0; i < n; i++) D.marriageAgreed(d, "A", "B");
      return;
    }
    case "Gift": D.receiveGift(d, "B", "A", num(/(\d+) gold/.exec(cause)![1]!)); return;
    case "Fought side by side": {
      addState(s, "alliance", "A", "B");
      D.declareWar(d, "A", "C");
      D.answerCall(d, D.pendingCall(d, "B")!, true);
      D.endWar(d, D.warOf(d, "A")!);
      return;
    }
    case "Answered our call": {
      addState(s, "alliance", "A", "B");
      D.declareWar(d, "A", "C");
      D.answerCall(d, D.pendingCall(d, "B")!, true);
      return;
    }
    case "Share a rival": rel.setRival(g(s), "A", "C", "a frontier"); rel.setRival(g(s), "B", "C", "a frontier"); return;
    case "Same faith": c(s, "A").faith = c(s, "B").faith = "catholic"; return;
    case "Same culture group": c(s, "A").cultureGroup = c(s, "B").cultureGroup = "slavic"; return;
    case "Trade pact": D.tradePactAgreed(d, "A", "B"); return;
    case "Pledged to protect us": D.pledgeProtection(d, "B", "A"); return;
    case "Freed us": D.freedBy(d, "A", "B"); return;
  }
  throw new Error(`no cause for ${tie}`);
}

function causeWrong(s: Scenario, wrong: string, cause: string): void {
  const d = w(s);
  switch (wrong) {
    case "Took our land": D.provincesTaken(d, "B", "A", ["p1", "p2", "p3"].slice(0, num(/(\d+) provinces/.exec(cause)![1]!))); return;
    case "Broke a truce with us": addState(s, "truce", "A", "B"); D.breakTruce(d, "B", "A"); return;
    case "Broke our alliance": addState(s, "alliance", "A", "B"); D.breakAlliance(d, "B", "A"); return;
    case "Abandoned us": addState(s, "alliance", "A", "B"); D.declareWar(d, "C", "A"); D.answerCall(d, D.pendingCall(d, "B")!, false); return;
    case "Insulted us": D.insult(d, "B", "A"); return;
    case "Threatened us": D.demandGivenIn(d, "B", "A", "pay_tribute"); return;
    case "Holds a claim": rel.addFact(g(s), "dynastic_claim", "B", "A"); return;
    case "Courted our lord": {
      d.lords.push({ name: "Lord of A", country: "A", loyalty: "wavering", provinces: [] });
      D.courtLord(d, "B", "Lord of A");
      D.courtingSeason(d, rngWhere((x) => x < D.config.actions.court_lord.discovery_chance_per_season));
      return;
    }
    case "Embargo against us": D.declareEmbargo(d, "B", "A"); return;
    case "Different faith":
      // the religion context's verdict; diplomacy keeps it within -10..-25
      d.faithHostility[D.pairKey("A", "B")] = cause.includes("least") ? -5 : -40;
      return;
    case "Notorious deed": D.setBorder(d, "A", "B"); D.eventNotoriety(d, "B", num(/notoriety (\d+)/.exec(cause)![1]!)); return;
    case "Stirred revolt in our land": {
      D.country(d, "A").revolutionSigns = 1;
      D.fundingCaught(d, D.fundRebels(d, "B", "A"));
      return;
    }
  }
  throw new Error(`no cause for ${wrong}`);
}

When(/^the (tie|wrong) "([^"]*)" is added to the ledger of "A" toward "B" because (.*)$/, (s, kind: string, name: string, cause: string) => {
  act(s);
  if (kind === "tie") causeTie(s, name, cause);
  else causeWrong(s, name, cause);
  s.entryName = name;
});
Then(/^it weighs ([+-]?\d+) and lasts "([^"]*)"$/, (s, n: string, lasts: string) => {
  const e = D.ledgerOf(w(s), "A", "B").find((x) => x.name.startsWith(s.entryName) || x.name.includes(s.entryName));
  expect(e, `${s.entryName} in ${JSON.stringify(D.ledgerOf(w(s), "A", "B"))}`).toBeDefined();
  expect(e!.weight).toBeCloseTo(Number(n));
  expect(lastsText(e!)).toContain(lasts);
});

Given("the fact {string} from {string} to {string} for Ladislaus V", (s, f: string, a: string, b: string) => void rel.addFact(g(s), f, a, b));
Then(/^the ledger of "([^"]*)" toward "([^"]*)" holds "([^"]*)" at ([+-]?\d+)$/, (s, a: string, b: string, name: string, n: string) => {
  const e = D.ledgerOf(w(s), a, b).find((x) => x.name === name);
  expect(e, JSON.stringify(D.ledgerOf(w(s), a, b))).toBeDefined();
  expect(e!.weight).toBeCloseTo(Number(n));
});
Given(/^the ledger of "([^"]*)" toward "([^"]*)" holds "([^"]*)" at ([+-]?\d+) fading over (\d+) years$/, (s, a: string, b: string, name: string, n: string, y: string) => {
  if (s.acted) {
    const e = D.ledgerOf(w(s), a, b).find((x) => x.name === name);
    expect(e, JSON.stringify(D.ledgerOf(w(s), a, b))).toBeDefined();
    expect(e!.weight).toBeCloseTo(Number(n));
    expect(e!.fadeYears).toBe(Number(y));
  } else {
    D.addEntry(w(s), a, b, { key: lower(name), name, weight: Number(n), fadeYears: Number(y) });
    s.pair = [a, b];
  }
});
When(/^(\d+) (?:more )?years? pass(?:es)?$/, (s, y: string) => {
  act(s);
  for (let i = 0; i < Number(y) * 12; i++) D.advanceMonth(w(s));
});
When("{int} months pass within the same year", (s, m: number) => {
  act(s);
  for (let i = 0; i < m; i++) D.advanceMonth(w(s));
});
const entry = (s: Scenario, name: string) => D.ledgerOf(w(s), ...(s.pair as [string, string])).find((x) => x.name === name);
Then(/^"([^"]*)" (?:still )?weighs ([+-]?\d+)$/, (s, name: string, n: string) => expect(entry(s, name)?.weight).toBeCloseTo(Number(n)));
Then("{string} is gone", (s, name: string) => expect(entry(s, name)).toBeUndefined());

Given("the ledger of {string} toward {string} holds {int} entries", (s, a: string, b: string, n: number) => {
  for (let i = 0; i < n; i++) D.addEntry(w(s), a, b, { key: `e${i}`, name: `Entry ${i}`, weight: 5 + i });
  s.pair = [a, b];
});
When("a 13th entry is added", (s) => {
  act(s);
  D.addEntry(w(s), ...(s.pair as [string, string]), { key: "e13", name: "Entry 13", weight: 30 });
});
Then("the ledger holds at most {int} entries", (s, n: number) => expect(w(s).ledgers[D.key(...(s.pair as [string, string]))]!.length).toBeLessThanOrEqual(n));
Then("the smallest entries are merged into {string}", (s, name: string) => {
  const list = w(s).ledgers[D.key(...(s.pair as [string, string]))]!;
  const old = list.find((e) => e.name === name);
  expect(old?.weight).toBe(5 + 6);
  expect(list.some((e) => e.name === "Entry 0" || e.name === "Entry 1")).toBe(false);
});

Then("the standing is shown as {string}", (s, word: string) => {
  const [k, v] = Object.entries(w(s).standingOverride)[0]!;
  void k;
  expect(D.standingWord(v)).toBe(word);
});

Given(/^the country "([^"]*)" has (\d+) allies, (\d+) enem(?:y|ies), (\d+) oaths broken, (\d+) of (\d+) envoys abroad and (\d+) leagues against it$/, (s, a: string, al: string, en: string, oa: string, ab: string, seats: string, lg: string) => {
  for (let i = 0; i < Number(al); i++) addState(s, "alliance", a, `Ally ${i}`);
  for (let i = 0; i < Number(en); i++) addState(s, "at_war", a, `Enemy ${i}`);
  for (let i = 0; i < Number(oa); i++) D.addOath(w(s), a, "test");
  const k = c(s, a);
  const extra = Number(seats) - 1;
  if (extra >= 1) k.provinces = 11;
  if (extra >= 2) k.inventions.push("G5");
  if (extra >= 3) k.inventions.push("G8");
  for (let i = 0; i < Number(ab); i++) D.sendEnvoy(w(s), { country: a, target: `Court ${i}`, action: "courtesy_visit" });
  for (let i = 0; i < Number(lg); i++) D.formLeague(w(s), a, ["X1", "X2"]);
  s.subject = a;
});
Then("the country card line reads {string}, {string}, {string}, {string}, {string}", (s, ...parts: string[]) => expect(D.cardLine(w(s), s.subject)).toEqual(parts));

Given("the countries {string} and {string} have never dealt with each other", (s, a: string, b: string) => void (s.pair = [a, b]));
Then("no ledger exists between {string} and {string}", (s, a: string, b: string) => expect(D.hasLedger(w(s), a, b)).toBe(false));

// ---------------------------------------------------------------- the reasons count

Given("the country {string} is at war with the country {string}", (s, a: string, b: string) => void addState(s, "at_war", a, b));
Given("the country {string} is allied with the country {string}", (s, a: string, b: string) => void addState(s, "alliance", a, b));
Given("the country {string} has posture {string} and negotiation {string}", (s, a: string, p: string, n: string) => {
  c(s, a).posture = lower(p);
  c(s, a).negotiation = lower(n);
});
When("the country {string} sends the country {string} a gift of {int} gold", (s, a: string, b: string, gold: number) => {
  act(s);
  s.giftCounted = D.receiveGift(w(s), a, b, gold);
  s.pair = [b, a];
});
When("an envoy of {string} who is a {string} asks the country {string} for an alliance", (s, a: string, type: string, b: string) => {
  act(s);
  const ask: D.Ask = { action: "propose_alliance", asker: a, asked: b, envoy: { type, years: 0 } };
  s.count = D.countAsk(w(s), ask);
  D.applyAnswer(w(s), ask, s.count.yes);
});
Then("the total is {int}", (s, n: number) => expect((s.count as D.Count).total, JSON.stringify(s.count.reasons)).toBe(n));
Then("the answer is {string}", (s, a: string) => expect((s.count as { total: number }).total > 0 ? "yes" : "no").toBe(a));
Given("a count totals {int}", (s, n: number) => void (s.count = { total: n }));

When("the country {string} gives its answer to {string}", (s, asked: string, asker: string) => {
  act(s);
  const ask: D.Ask = { action: "propose_alliance", asker, asked };
  const count = D.countAsk(w(s), ask);
  w(s).envoys.push({ id: "e1", country: asker, person: "Envoy", personKind: "official", type: "", years: 0, action: "propose_alliance", target: asked, status: "court", sent: w(s).date, arrival: w(s).date, ask });
  s.count = D.decideMission(w(s), w(s).envoys[w(s).envoys.length - 1]!) ?? count;
});
Then("the country {string} sees no answer yet", (s, a: string) => expect(D.lettersReceived(w(s), a)).toEqual([]));
Then("in {string} the country {string} receives a letter with the answer and every reason and number", (s, date: string, a: string) => {
  D.advanceTo(w(s), date);
  const l = D.lettersReceived(w(s), a);
  expect(l.length).toBe(1);
  expect(l[0]!.answer).toMatch(/yes|no/);
  expect(l[0]!.reasons).toEqual((s.count as D.Count).reasons);
  expect(l[0]!.total).toBe((s.count as D.Count).total);
});

Given(/^the country "([^"]*)" (has a|has no) resident at the court of "([^"]*)"$/, (s, a: string, has: string, b: string) => {
  if (has === "has a") {
    c(s, a).inventions.push("G8");
    const e = D.sendEnvoy(w(s), { country: a, target: b, action: "make_resident" });
    D.advanceTo(w(s), e.arrival);
  }
  s.pair = [a, b];
});
Then("the country {string} sees the soldiers of {string} as {string}", (s, a: string, b: string, seen: string) =>
  expect(D.courtView(w(s), a, b).soldiers === "exact" ? "exact" : "an estimate").toBe(seen));
Then("the country {string} sees the ledger and the stance of {string} toward it", (s, a: string, b: string) => {
  expect(Array.isArray(D.ledgerOf(w(s), b, a))).toBe(true);
  expect(typeof rel.stance(g(s), b, a)).toBe("string");
});

Given("the ruler of {string} is {string}", (s, a: string, t: string) => void c(s, a).traits.push(t.toLowerCase().trim()));
When("the country {string} asks the country {string} for {string}", (s, a: string, b: string, what: string) => {
  act(s);
  const ask: D.Ask = { action: "propose_alliance", asker: a, asked: b };
  if (what.startsWith("anything, both of the same faith")) c(s, a).faith = c(s, b).faith = "catholic";
  else if (what === "an alliance with a gift") ask.gift = 50;
  else ask.action = actionId(what);
  s.count = D.countAsk(w(s), ask);
});
Then("the count holds the trait reason at {int}", (s, n: number) => expect((s.count as D.Count).reasons.filter((r) => r.kind === "trait").reduce((t, r) => t + r.number, 0)).toBe(n));

Given("the country {string} has {int} soldiers and no allies", (s, a: string, n: number) => void (c(s, a).soldiers = n));
Given("the country {string} has {int} soldiers and allies who would come with {int} soldiers", (s, a: string, n: number, al: number) => {
  c(s, a).soldiers = n;
  if (al > 0) {
    addState(s, "alliance", a, `${a}'s ally`);
    c(s, `${a}'s ally`).soldiers = al;
  }
});
When("the country {string} asks the country {string} for an alliance", (s, a: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: a, asked: b });
});
Then(/^the count holds "([^"]*)" at ([+-]?\d+)$/, (s, name: string, n: string) => expect(D.reasonNumber(s.count as D.Count, name), JSON.stringify(s.count.reasons)).toBe(Number(n)));

Given("the country {string} has {int} times the soldiers of the country {string}", (s, a: string, n: number, b: string) => {
  c(s, a).soldiers = n * 1000;
  c(s, b).soldiers = 1000;
});
Given(/^the allies of "([^"]*)" (would|would not) defend it$/, (s, b: string, would: string) => {
  if (would === "would") addState(s, "alliance", b, `${b}'s friend`);
});
When("the country {string} demands a province of the country {string}", (s, a: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "demand", asker: a, asked: b, demandKind: "hand_over_province", province: "P" });
});

When("the country {string} asks the country {string} for a new commitment against {string}", (s, a: string, b: string, enemy: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: a, asked: b, against: [enemy] });
});

Given(/^the countries "([^"]*)" and "([^"]*)" (share a border|share a neighbour|share no border and no neighbour)$/, (s, a: string, b: string, how: string) => {
  if (how === "share a border") D.setBorder(w(s), a, b);
  if (how === "share a neighbour") {
    D.setBorder(w(s), a, "N");
    D.setBorder(w(s), b, "N");
  }
  s.pair = [a, b];
});
Given("an envoy needs {int} days from {string} to {string}", (s, days: number, a: string, b: string) => void (w(s).routes[D.pairKey(a, b)] = { land: [{ kind: "land", units: Math.ceil(days / D.config.envoys.days_per_crossing_unit) }] }));
Then("the count holds distance reasons totalling {int}", (s, n: number) => {
  const [a, b] = s.pair as [string, string];
  const count = D.countAsk(w(s), { action: "trade_pact", asker: a, asked: b }, (x, y) => D.routeDays(D.envoyRoute(w(s), x, y).legs));
  expect(D.reasonNumber(count, "Too far to matter") + D.reasonNumber(count, "Very far")).toBe(n);
});

Given("the countries {string} and {string} are both at war with the country {string}", (s, a: string, b: string, x: string) => {
  addState(s, "at_war", a, x);
  addState(s, "at_war", b, x);
  s.pair = [a, b];
});
Then(/^a count between them holds "([^"]*)" at ([+-]?\d+)$/, (s, name: string, n: string) => {
  const [a, b] = s.pair as [string, string];
  expect(D.reasonNumber(D.countAsk(w(s), { action: "propose_alliance", asker: a, asked: b }), name)).toBe(Number(n));
});

Given("the country {string} has {int} alliances", (s, b: string, n: number) => {
  for (let i = 0; i < n; i++) addState(s, "alliance", b, `Partner ${i}`);
  s.subject = b;
});
Then(/^a count made by "([^"]*)" holds "([^"]*)" at ([+-]?\d+)$/, (s, b: string, name: string, n: string) =>
  expect(D.reasonNumber(D.countAsk(w(s), { action: "propose_alliance", asker: "Asker", asked: b }), name)).toBe(Number(n)));

// ---------------------------------------------------------------- envoys

Given("the country {string} has the official {string}, a {string} running the province {string}", (s, a: string, name: string, type: string, p: string) => {
  c(s, a).officials.push({ name, type: lower(type), province: p, yearsServed: 0 });
  D.province(w(s), p, a).official = name;
});
When("the country {string} sends {string} as envoy to the country {string}", (s, a: string, name: string, b: string) => {
  act(s);
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: "courtesy_visit", official: name });
});
Then("the province {string} is run as if it had no official", (s, p: string) => expect(D.provinceOfficial(w(s), p)).toBeNull());
Then("when the envoy comes home the province {string} has its official again", (s, p: string) => {
  D.advanceTo(w(s), (s.envoy as D.Envoy).returnDate!);
  expect((s.envoy as D.Envoy).status === "home" || w(s).envoys.find((e) => e.id === s.envoy.id)?.status === "home").toBe(true);
  expect(D.provinceOfficial(w(s), p)).toBe((s.envoy as D.Envoy).person);
});

Given("the country {string} has {int} provinces", (s, a: string, n: number) => void (c(s, a).provinces = n));
Given("the country {string} knows the inventions {string}", (s, a: string, inv: string) => {
  if (inv !== "none") c(s, a).inventions.push(...inv.split(",").map((x) => x.trim()));
});
Given("a national strength of {string} adds {int} seats", (s, a: string, n: number) => void (c(s, a).extraSeats = n));
Then("the country {string} has {int} envoy seats", (s, a: string, n: number) => expect(D.envoySeats(w(s), a)).toBe(n));

function seatsTo(s: Scenario, a: string, n: number): void {
  const k = c(s, a);
  if (n >= 2) k.provinces = 11;
  if (n >= 3) k.inventions.push("G5");
  if (n >= 4) k.inventions.push("G8");
}
Given("the country {string} has {int} envoy seats and {int} envoys abroad", (s, a: string, n: number, ab: number) => {
  seatsTo(s, a, n);
  for (let i = 0; i < ab; i++) D.sendEnvoy(w(s), { country: a, target: `Court ${i}`, action: "courtesy_visit" });
});
When("the country {string} sends an envoy to the country {string}", (s, a: string, b: string) => attempt(s, () => (s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: "courtesy_visit" }))));
Then("the order is refused for lack of a free seat", (s) => expect(s.error).toContain("free seat"));

Given("the envoy is a {string}", (s, t: string) => void (s.envoyType = { type: t, years: 0 }));
Given("the envoy is a {string} with {int} years served", (s, t: string, y: number) => void (s.envoyType = { type: t, years: y }));
When(/^the envoy carries the action "([^"]*)"(?: to a country (of the same faith|of another faith))?$/, (s, action: string, faith?: string) => {
  act(s);
  s.envoyReason = D.envoyReason(s.envoyType.type, s.envoyType.years, actionId(action), faith === "of the same faith");
});
Then("the envoy's reason in the count is {int}", (s, n: number) => expect(s.envoyReason).toBe(n));
When("the envoy carries a gift of {int} gold", (s, gold: number) => {
  act(s);
  s.giftCounted = D.giftCounts(w(s), gold, s.envoyType.type, "Receiver");
});
Then("the gift counts as {int} gold", (s, n: number) => expect(s.giftCounted).toBe(n));

Given("the country {string} has had a resident at the court of {string} for {int} years", (s, a: string, b: string, y: number) => {
  c(s, a).inventions.push("G8");
  const e = D.sendEnvoy(w(s), { country: a, target: b, action: "make_resident" });
  D.advanceTo(w(s), e.arrival);
  e.residentSince = D.addMonths(D.monthOf(w(s).date), -12 * y);
});
When("the country {string} asks anything of the country {string}", (s, a: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "trade_pact", asker: a, asked: b });
});
Then("the count has a reason of +5 for the resident's years", (s) => expect(D.reasonNumber(s.count, "Resident for 5 years")).toBe(5));

Given("the country {string} has no officials", (s, a: string) => void (c(s, a).noOfficials = true));
When("the country {string} sends the lord {string} on a mission lasting {int} months", (s, a: string, lord: string, m: number) => {
  act(s);
  w(s).lords.push({ name: lord, country: a, loyalty: "loyal", provinces: [] });
  const days = Math.ceil(((m - D.config.envoys.months_at_court) * 31) / 2) + 2;
  w(s).routes[D.pairKey(a, "Far Court")] = { land: [{ kind: "land", units: Math.ceil(days / D.config.envoys.days_per_crossing_unit) }] };
  s.envoy = D.sendEnvoy(w(s), { country: a, target: "Far Court", action: "courtesy_visit", lord });
  expect((s.envoy as D.Envoy).missionMonths).toBeGreaterThanOrEqual(m);
});
Then("the lord {string} leaves his lands without his presence", (s, lord: string) => expect(w(s).lords.find((l) => l.name === lord)?.away).toBe(true));
Then("the loyalty of {string} drops a step", (s, lord: string) => expect(w(s).lords.find((l) => l.name === lord)?.loyalty).toBe("wavering"));

Given("the route from the capital of {string} to the capital of {string} is {int} crossing units by land", (s, a: string, b: string, n: number) =>
  void (w(s).routes[D.pairKey(a, b)] = { land: [{ kind: "land", units: n }] }));
Then("the envoy arrives after {int} days", (s, n: number) => expect(D.daysBetween(s.envoy.sent, s.envoy.arrival)).toBe(n));
Then("the envoy stays one month at court", (s) => expect(D.monthsBetween(s.envoy.arrival, s.envoy.leaveCourt)).toBe(1));
Then("the envoy's return date is fixed when it is sent", (s) => {
  const e = s.envoy as D.Envoy;
  expect(e.returnDate).toBe(D.addDays(e.leaveCourt!, D.daysBetween(e.sent, e.arrival)));
});

Given("the route from {string} to {string} is by sea", (s) => {
  // naval supplies the sea-zone times; here two legs of 5 and 7 days
  s.seaDays = 12;
  w(s).defaultRoute = { sea: [{ kind: "sea", days: 5 }, { kind: "sea", days: 7 }] };
});
Then("the sea legs take the naval sea-zone travel times", (s) => expect(D.daysBetween(s.envoy.sent, s.envoy.arrival)).toBe(s.seaDays));

Given("the only land route from {string} to {string} crosses the country {string}", (s, a: string, b: string, x: string) => {
  w(s).routes[D.pairKey(a, b)] = { land: [{ kind: "land", units: 10, crosses: [x] }] };
  s.pair = [a, b];
});
Given("the country {string} has denied passage to the country {string}", (s, x: string, a: string) => void w(s).passageDenied.push({ by: x, to: a, until: D.addMonths(D.monthOf(w(s).date), 24) }));
Given("the country {string} is at peace with the country {string}", () => {});
Then(/^the envoy (goes by sea or cannot be sent|goes by land)$/, (s, how: string) => {
  const r = D.envoyRoute(w(s), ...(s.pair as [string, string]));
  if (how === "goes by land") {
    expect(s.error).toBeUndefined();
    expect(r.by).toBe("land");
  } else expect(r.by === "sea" || (r.by === "none" && s.error !== undefined)).toBe(true);
});

Given("the countries {string} and {string} both know {string}", (s, a: string, b: string, inv: string) => {
  c(s, a).inventions.push(inv);
  c(s, b).inventions.push(inv);
  w(s).routes[D.pairKey(a, b)] = { land: [{ kind: "land", units: 5 }] };
});
When("the country {string} sends the action {string} to the country {string}", (s, a: string, action: string, b: string) => {
  act(s);
  if (actionId(action) === "make_resident") c(s, a).inventions.push("G8");
  if (actionId(action) === "arrange_marriage") c(s, a).unmarriedChildren = c(s, b).unmarriedChildren = 1;
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: actionId(action) });
  s.sender = a;
});
Then("it is decided this turn and the envoy never leaves home", (s) => {
  expect((s.envoy as D.Envoy).instant).toBe(true);
  expect(D.envoysAbroad(w(s), s.sender)).toEqual([]);
  expect(w(s).letters.length).toBe(1);
});
Then("the person still travels", (s) => {
  expect((s.envoy as D.Envoy).instant).toBeUndefined();
  expect(D.daysBetween(s.envoy.sent, s.envoy.arrival)).toBeGreaterThan(0);
});
Then("the answer reaches {string} a month later", (s, a: string) => {
  expect(D.lettersReceived(w(s), a)).toEqual([]);
  D.advanceMonth(w(s));
  expect(D.lettersReceived(w(s), a).length).toBe(1);
});

Given("the envoy {string} is on a mission to {string}", (s, name: string, b: string) => {
  c(s, "Hungary").officials.push({ name, type: "marshal", yearsServed: 0 });
  c(s, "Hungary").provinces = 11;
  D.sendEnvoy(w(s), { country: "Hungary", target: b, action: "courtesy_visit", official: name });
});
When("the country {string} orders {string} to also become resident in {string}", (s, a: string, name: string, b: string) => {
  c(s, a).inventions.push("G8");
  attempt(s, () => D.assignResidence(w(s), name, b, a));
});
Then(/^the order is (accepted|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));

Given("an envoy carries {string} to the country {string}", (s, action: string, b: string) => {
  s.envoy = D.sendEnvoy(w(s), { country: "Asker", target: b, action: actionId(action) });
});
When("the envoy arrives at the court of {string}", (s) => {
  act(s);
  D.advanceTo(w(s), s.envoy.arrival);
});
Then("the count is made on arrival", (s) => expect(w(s).events.some((e) => e.type === "AnswerGiven" && e.date === w(s).date)).toBe(true));
Then("the envoy travels home afterwards", (s) => {
  D.advanceTo(w(s), s.envoy.returnDate);
  expect(w(s).envoys.find((e) => e.id === s.envoy.id)?.status).toBe("home");
});

Given(/^the country "([^"]*)" (knows|does not know) "([^"]*)"$/, (s, a: string, k: string, inv: string) => {
  if (k === "knows") c(s, a).inventions.push(inv);
});
When("the country {string} makes an envoy resident at the court of {string}", (s, a: string, b: string) => attempt(s, () => D.sendEnvoy(w(s), { country: a, target: b, action: "make_resident" })));

When("{int} seasons pass", (s, n: number) => {
  act(s);
  const e = w(s).envoys.find((x) => x.action === "make_resident")!;
  D.advanceTo(w(s), e.arrival);
  for (let i = 0; i < n * 3; i++) D.advanceMonth(w(s));
});
Then("the resident still takes an envoy seat", (s) => expect(D.envoysAbroad(w(s), (s.pair as string[])[0]!).some((e) => e.status === "resident")).toBe(true));
When("the resident is recalled", (s) => D.recallResident(w(s), ...(s.pair as [string, string])));
Then("{string} fades to zero over {int} years", (s, name: string, y: number) => {
  const [a, b] = s.pair as [string, string];
  const e = D.ledgerOf(w(s), b, a).find((x) => x.name === name)!;
  expect(e.fadeYears).toBe(y);
  for (let i = 0; i < y * 12; i++) D.advanceMonth(w(s));
  expect(D.ledgerOf(w(s), b, a).find((x) => x.name === name)).toBeUndefined();
});

Given(/^the country "([^"]*)" has ([\d,]+) soldiers and ([\d,]+) gold$/, (s, a: string, n: string, gold: string) => {
  c(s, a).soldiers = num(n);
  c(s, a).gold = num(gold);
  w(s).lords.push({ name: `Lord of ${a}`, country: a, loyalty: "wavering", provinces: [] });
});
Then(/^the country "([^"]*)" sees ([\d,]+) soldiers in "([^"]*)"$/, (s, a: string, n: string, b: string) => expect(D.courtView(w(s), a, b).soldierCount).toBe(num(n)));
Then(/^the country "([^"]*)" sees a treasury of ([\d,]+) gold in "([^"]*)"$/, (s, a: string, n: string, b: string) => expect(D.courtView(w(s), a, b).treasury).toBe(num(n)));
Then("the country {string} sees the loyalty of every lord of {string}", (s, a: string, b: string) =>
  expect(D.courtView(w(s), a, b).lordLoyalty?.length).toBe(w(s).lords.filter((l) => l.country === b).length));

When("the country {string} asks the country {string} for a trade pact through the resident", (s, a: string, b: string) => {
  act(s);
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: "trade_pact", throughResident: true });
});
Then("the ask arrives this turn with no travel time", (s) => {
  expect(s.envoy.arrival).toBe(w(s).date);
  expect(w(s).events.some((e) => e.type === "AnswerGiven" && e.date === w(s).date)).toBe(true);
});

Given("the country {string} will declare war on the country {string}, an ally of {string}, next month", (s, by: string, on: string, ally: string) => {
  addState(s, "alliance", on, ally);
  w(s).plannedWars.push({ by, on, month: D.addMonths(D.monthOf(w(s).date), 1) });
});
Then("the country {string} is warned now", (s, a: string) => expect(D.residentWarnings(w(s), a).length).toBe(1));

When("the country {string} makes a courtesy visit to the country {string}", (s, a: string, b: string) => {
  act(s);
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: "courtesy_visit" });
  D.advanceTo(w(s), s.envoy.returnDate);
});
Then("the envoy stays one month at court and comes back", (s) => {
  expect(D.monthsBetween(s.envoy.arrival, s.envoy.leaveCourt)).toBe(1);
  expect(w(s).envoys.find((e) => e.id === s.envoy.id)?.status).toBe("home");
});

Given("an envoy of {string} is at the court of {string} carrying {string}", (s, a: string, b: string, carrying: string) => {
  const action = carrying === "a peace offer" ? "peace_offer" : actionId(carrying);
  if (action === "peace_offer") addState(s, "at_war", a, b);
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: action === "peace_offer" ? "peace_offer" : "courtesy_visit" });
  w(s).envoys.find((e) => e.id === s.envoy.id)!.status = "court";
  s.sender = a;
});
When("the country {string} declares war on {string}", (s, a: string, b: string) => attempt(s, () => D.declareWar(w(s), a, b)));
When("the official dies of old age on the road", (s) => {
  act(s);
  s.freeBefore = D.freeSeats(w(s), s.sender);
  D.envoyOfficialDies(w(s), w(s).envoys.find((e) => e.id === s.envoy.id)!);
});
When("the war goes on", (s) => {
  act(s);
  D.advanceMonth(w(s));
});
const envoyNow = (s: Scenario) => w(s).envoys.find((e) => e.id === s.envoy.id)!;
Then("the envoy is held until the peace returns him", (s) => {
  expect(envoyNow(s).status).toBe("held");
  D.endWar(w(s), w(s).wars[0]!);
  expect(envoyNow(s).status).toBe("home");
});
Then("the seat is free and the mission fails", (s) => {
  expect(envoyNow(s).status).toBe("failed");
  expect(D.freeSeats(w(s), s.sender)).toBe(s.freeBefore + 1);
});
Then("the envoy is never held", (s) => {
  expect(envoyNow(s).status).not.toBe("held");
  expect(D.mayBeHeld(envoyNow(s))).toBe(false);
});

Given("an envoy of {string} carries a demand to {string}", (s, a: string, b: string) => {
  w(s).refusedDemands.length = 0;
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: "courtesy_visit" });
  const e = envoyNow(s);
  e.action = "demand";
  e.ask = { action: "demand", asker: a, asked: b, demandKind: "pay_tribute" };
  s.pair = [a, b];
});
When(/^"([^"]*)" refuses and the 1 in 10 roll comes up$/, (s, b: string) => {
  act(s);
  D.demandRefused(w(s), (s.pair as string[])[0]!, b, "pay_tribute", undefined, rngWhere((x) => x < 0.1), envoyNow(s));
});
Then("the envoy is held", (s) => expect(envoyNow(s).status).toBe("held"));
Then(/^the country "([^"]*)" (holds|holds for 5 years|holds while true|does not hold) the war aim "([^"]*)" against "([^"]*)"$/, (s, a: string, how: string, aim: string, b: string) => {
  const aims = D.warAimsOf(w(s), a, b).filter((x) => x.aim === D.aimId(aim));
  if (how === "does not hold") return expect(aims).toEqual([]);
  expect(aims.length, JSON.stringify(D.warAimsOf(w(s), a, b))).toBeGreaterThan(0);
  if (how === "holds for 5 years") expect(aims.some((x) => x.until === D.addMonths(D.monthOf(w(s).date), 60))).toBe(true);
  if (how === "holds while true") expect(aims.some((x) => !x.until)).toBe(true);
});

When("the country {string} falls to rebels", (s, a: string) => {
  act(s);
  D.fallsToRebels(w(s), a);
});
Then("the resident flees home", (s) => expect(w(s).envoys.find((e) => e.action === "make_resident")?.status).toBe("home"));

// ---------------------------------------------------------------- alliances and calls

Given(/^the countries "([^"]*)" and "([^"]*)" (are at peace with no stance|have B Hostile toward A|have A as a subject of B)$/, (s, a: string, b: string, how: string) => {
  if (how === "have B Hostile toward A") rel.setStance(g(s), b, a, "hostile");
  if (how === "have A as a subject of B") rel.makeSubject(g(s), a, b);
});
Then(/^the proposal is (sent|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));
Given("the countries {string} and {string} have a truce", (s, a: string, b: string) => {
  addState(s, "truce", a, b);
  rel.find(g(s), "truce", a, b)[0]!.expires_on = D.addMonths(D.monthOf(w(s).date), 60);
  s.pair = [a, b];
});
When("the country {string} agrees to an alliance with the country {string}", (s, b: string, a: string) => {
  act(s);
  D.applyAnswer(w(s), { action: "propose_alliance", asker: a, asked: b }, true);
  s.pair = [a, b];
});
When(/^"([^"]*)", a subject of "([^"]*)", starts its independence war$/, (s, a: string, ov: string) => {
  act(s);
  rel.makeSubject(g(s), a, ov);
  rel.independenceWar(g(s), a);
});
When(/^"([^"]*)" declares war after "([^"]*)" refused its demand$/, (s, a: string, b: string) => {
  act(s);
  D.demandRefused(w(s), a, b, "pay_tribute");
  D.declareWar(w(s), a, b);
});
const callsTo = (s: Scenario, x: string) => w(s).calls.filter((k) => k.called === x);
Then(/^"([^"]*)" gets a defensive call this turn$/, (s, x: string) => expect(callsTo(s, x).some((k) => k.kind === "defensive" && k.issued === D.monthOf(w(s).date))).toBe(true));
Then(/^"([^"]*)" gets no defensive call$/, (s, x: string) => expect(callsTo(s, x).some((k) => k.kind === "defensive")).toBe(false));
Given("the country {string} declared war on {string}", (s, a: string, b: string) => void D.declareWar(w(s), a, b));
When("the country {string} refuses the defensive call", (s, x: string) => {
  act(s);
  D.answerCall(w(s), D.pendingCall(w(s), x)!, false);
});
Then("{string} and {string} are no longer allied", (s, a: string, b: string) => expect(rel.has(g(s), "alliance", a, b)).toBe(false));

Given(/^a "(defensive|offensive)" call to the country "([^"]*)"$/, (s, kind: string, b: string) => {
  s.call = { kind, called: b, target: "T" };
  c(s, b).soldiers = 1000;
});
Given(/^the target is (not B's concern|B's Rival|B's Hostile)$/, (s, how: string) => {
  if (how === "B's Rival") rel.setRival(g(s), s.call.called, "T", "a frontier");
  if (how === "B's Hostile") rel.setStance(g(s), s.call.called, "T", "hostile");
});
Given(/^the country "([^"]*)" (is not at war|is already at war)$/, (s, b: string, how: string) => {
  if (how === "is already at war") addState(s, "at_war", b, "Elsewhere");
});
Given("the enemy side has {int} times the soldiers of {string}", (s, n: number, b: string) => void (c(s, "T").soldiers = n * c(s, b).soldiers));
Then("the call's own reasons total {int}", (s, n: number) => {
  const count = D.countAsk(w(s), { action: "call_to_arms", asker: "Caller", asked: s.call.called, callKind: s.call.kind, callTarget: "T" });
  expect(D.ownTotal(count), JSON.stringify(count.reasons)).toBe(n);
});

Given("the country {string} answered the call of {string} against {string}", (s, ally: string, caller: string, enemy: string) => {
  addState(s, "alliance", caller, ally);
  D.declareWar(w(s), caller, enemy);
  D.answerCall(w(s), D.pendingCall(w(s), ally)!, true);
  s.pair = [caller, ally];
});
Given("over half of the peace voices of {string} say peace", (s, a: string) => void (c(s, a).peaceVoicesForPeace = 0.6));
When("the country {string} makes a separate peace with the country {string}", (s, a: string, b: string) => attempt(s, () => D.separatePeace(w(s), a, b)));
Then("the country {string} gains no Oath broken", (s, a: string) => expect(c(s, a).oaths.length).toBe(0));
Then("the ledger of {string} toward {string} loses the tie {string}", (s, a: string, b: string, name: string) => expect(D.ledgerOf(w(s), a, b).some((e) => e.name === name)).toBe(false));

Given("the country {string} joined the war of {string} when asked", (s, ally: string, caller: string) => {
  addState(s, "alliance", caller, ally);
  D.declareWar(w(s), caller, `the enemy of ${caller}`);
  D.answerCall(w(s), D.pendingCall(w(s), ally)!, true);
  s.pair = [caller, ally];
});
When("the war ends", (s) => {
  act(s);
  D.endWar(w(s), w(s).wars[0]!);
});
Then(/^each ledger between them holds "([^"]*)" at ([+-]?\d+)$/, (s, name: string, n: string) => {
  const [a, b] = s.pair as [string, string];
  for (const [x, y] of [[a, b], [b, a]] as const) expect(D.ledgerOf(w(s), x, y).find((e) => e.name === name)?.weight).toBeCloseTo(Number(n));
});

// ---------------------------------------------------------------- courting lords

Given("the lord {string} of {string} is {string}", (s, lord: string, a: string, loyalty: string) => void w(s).lords.push({ name: lord, country: a, loyalty: loyalty.toLowerCase(), provinces: [] }));
When("the country {string} sends an envoy to court {string}", (s, a: string, lord: string) => attempt(s, () => D.courtLord(w(s), a, lord)));
Then(/^the courting is (started|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));
Given("the country {string} courts the Wavering lord {string} of {string}", (s, a: string, lord: string, b: string) => {
  w(s).lords.push({ name: lord, country: b, loyalty: "wavering", provinces: [] });
  D.courtLord(w(s), a, lord);
});
Given(/^during the season (.*)$/, (s, what: string) => {
  if (what !== "nothing happens") w(s).courtings[0]!.countered = true;
});
When("the season ends", (s) => {
  act(s);
  D.courtingSeason(w(s), rngWhere((x) => x >= D.config.actions.court_lord.discovery_chance_per_season));
});
Then("the loyalty of {string} is {string}", (s, lord: string, l: string) => expect(w(s).lords.find((x) => x.name === lord)?.loyalty).toBe(l.toLowerCase()));
Given("the lord {string} of {string} is Disloyal and his lands border {string}", (s, lord: string, a: string, b: string) => {
  const p = D.province(w(s), `${lord}'s land`, a);
  p.borders.push(b);
  w(s).lords.push({ name: lord, country: a, loyalty: "disloyal", provinces: [p.id] });
  s.lord = lord;
});
Given("the country {string} has courted him for {int} months", (s, a: string, m: number) => {
  D.courtLord(w(s), a, s.lord);
  w(s).courtings[0]!.since = D.addMonths(D.monthOf(w(s).date), -m);
});
When("the next month begins", (s) => {
  act(s);
  D.advanceMonth(w(s));
});
Then("{string} joins {string} with his lands", (s, lord: string, a: string) => {
  const l = w(s).lords.find((x) => x.name === lord)!;
  expect(l.country).toBe(a);
  for (const p of l.provinces) expect(w(s).provinces[p]!.owner).toBe(a);
});
Then("the country {string} holds the war aim {string} for those provinces", (s, a: string, aim: string) => {
  const l = w(s).lords.find((x) => x.name === s.lord)!;
  for (const p of l.provinces) expect(D.holdsAim(w(s), a, l.country, D.aimId(aim), p)).toBe(true);
});
Given("the country {string} courts a lord of {string}", (s, a: string, b: string) => {
  w(s).lords.push({ name: "A lord", country: b, loyalty: "wavering", provinces: [] });
  D.courtLord(w(s), a, "A lord");
});
When("the season's 1 in 4 discovery roll comes up", (s) => {
  act(s);
  D.courtingSeason(w(s), rngWhere((x) => x < D.config.actions.court_lord.discovery_chance_per_season));
});
Then("the envoy is sent home", (s) => {
  expect(w(s).courtings).toEqual([]);
  expect(w(s).events.some((e) => e.type === "CourtingDiscovered")).toBe(true);
});

// ---------------------------------------------------------------- declaring war

Given("the country {string} holds no aim {string} against {string}", (s, a: string, aim: string, b: string) => expect(D.holdsAim(w(s), a, b, D.aimId(aim))).toBe(false));
When("the country {string} declares war on {string} with the aim {string}", (s, a: string, b: string, aim: string) => attempt(s, () => D.declareWar(w(s), a, b, { aim: D.aimId(aim) })));
Given("the country {string} has a {string} with the country {string}", (s, a: string, pact: string, b: string) => {
  if (pact === "pledge") D.pledgeProtection(w(s), a, b);
  else addState(s, pact, a, b);
  s.pair = [a, b];
});
const breakPact = (d: Diplomacy, pact: string, a: string, b: string) =>
  pact === "alliance" ? D.breakAlliance(d, a, b) : pact === "truce" ? D.breakTruce(d, a, b) : D.breakPledge(d, a, b);
Then("the declaration is refused until the {string} is broken", (s, pact: string) => {
  expect(s.error).toBeDefined();
  const [a, b] = s.pair as [string, string];
  const copy = structuredClone(w(s));
  breakPact(copy, pact, a, b);
  expect(() => D.declareWar(copy, a, b)).not.toThrow();
});
Then("breaking the {string} gives {string} an Oath broken", (s, pact: string, a: string) => {
  const [, b] = s.pair as [string, string];
  breakPact(w(s), pact, a, b);
  expect(c(s, a).oaths.length).toBe(1);
});

Given("the country {string} is allied with {string}", (s, a: string, b: string) => void addState(s, "alliance", a, b));
Given("the country {string} is allied with {string} and pledged by {string}", (s, a: string, b: string, p: string) => {
  addState(s, "alliance", a, b);
  D.pledgeProtection(w(s), p, a);
});
Given("the country {string} has the vassal {string}", (s, a: string, v: string) => void rel.makeSubject(g(s), v, a, "vassal"));
Given("a league against {string} includes {string}", (s, x: string, l: string) => void D.formLeague(w(s), x, [l], "event"));
Then("{string} gets an offensive call in {string}", (s, x: string, m: string) => expect(callsTo(s, x).some((k) => k.kind === "offensive" && k.issued === m)).toBe(true));
Then("{string} and {string} get defensive calls in {string}", (s, x: string, y: string, m: string) => {
  for (const z of [x, y]) expect(callsTo(s, z).some((k) => k.kind === "defensive" && k.issued === m)).toBe(true);
});
Then("{string} joins by its kind", (s, v: string) => {
  // D-DIPL-10: a Vassal is called and answers by its loyalty (subjects context).
  expect(rel.has(g(s), "at_war", v, "A") || callsTo(s, v).some((k) => k.via === "subject" && k.against === "A")).toBe(true);
});
Then("{string} is called against {string}", (s, l: string, x: string) => expect(callsTo(s, l).some((k) => k.against === x && k.via === "league")).toBe(true));
Then("the answers arrive in {string}", (s, m: string) => expect(w(s).calls.every((k) => k.answerOn === m || k.answer)).toBe(true));

Given("the ruler of {string} is a child under a regent", (s, a: string) => void (c(s, a).regency = true));
When(/^the country "([^"]*)" declares war on "([^"]*)" with aim "([^"]*)"$/, (s, a: string, b: string, aim: string) => attempt(s, () => D.declareWar(w(s), a, b, { aim: D.aimId(aim) })));
When(/^the country "([^"]*)" answers a defensive call$/, (s, a: string) => attempt(s, () => {
  if (!D.mayAnswerCall(w(s), a, "defensive")) throw new D.RuleError("a regency may not answer");
}));

// ---------------------------------------------------------------- demands

Given(/^the country "([^"]*)" (holds a Rival stance|holds a Hostile stance|holds a war aim|has no stance or aim) against the country "([^"]*)"$/, (s, a: string, how: string, b: string) => {
  if (how === "holds a Rival stance") rel.setRival(g(s), a, b, "a frontier");
  if (how === "holds a Hostile stance") rel.setStance(g(s), a, b, "hostile");
  if (how === "holds a war aim") D.grantAim(w(s), { holder: a, target: b, aim: "punish", source: "test", until: D.addMonths(D.monthOf(w(s).date), 60) });
  s.pair = [a, b];
});
Given(/^(A borders that province|A neither borders nor claims that province|A borders B|A has a pretender to B's throne at court|B has a subject|a province of B bordering A carries the persecution flag|B insulted A|B is allied with A's Rival)$/, (s, need: string) => {
  const d = w(s);
  switch (need) {
    case "A borders that province": D.province(d, "P", "B").borders.push("A"); break;
    case "A neither borders nor claims that province": D.province(d, "P", "B"); break;
    case "A borders B": D.setBorder(d, "A", "B"); break;
    case "A has a pretender to B's throne at court": D.placePretender(d, "Pretender", "B", "A"); break;
    case "B has a subject": rel.makeSubject(d.graph, "S", "B"); break;
    case "a province of B bordering A carries the persecution flag": Object.assign(D.province(d, "P", "B"), { persecution: true }).borders.push("A"); break;
    case "B insulted A": D.insult(d, "B", "A"); break;
    case "B is allied with A's Rival": addState(s, "alliance", "B", "R"); rel.setRival(d.graph, "A", "R", "a frontier"); break;
  }
});
When("the country {string} demands {string} of the country {string}", (s, a: string, kind: string, b: string) => attempt(s, () => D.makeDemand(w(s), a, b, D.DEMANDS[kind]!, "P")));
Then(/^the demand is (sent|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));
Given(/^the province "([^"]*)" (is neither B's capital nor of B's culture|holds B's capital)$/, (s, p: string, how: string) => {
  const pr = D.province(w(s), p, "B");
  if (how === "holds B's capital") pr.capital = true;
});
When("the country {string} demands the province {string} of the country {string}", (s, a: string, p: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "demand", asker: a, asked: b, demandKind: "hand_over_province", province: p });
});
Then("the demand's own reasons total {int}", (s, n: number) => expect(D.ownTotal(s.count)).toBe(n));
When("the country {string} gives in to the demand {string} of the country {string}", (s, b: string, kind: string, a: string) => {
  act(s);
  D.demandGivenIn(w(s), a, b, D.DEMANDS[kind]!);
  s.pair = [a, b];
});
Then("the country {string} gets exactly the tribute demanded", (s, a: string) => expect(w(s).events.find((e) => e.type === "DemandGivenIn" && e.asker === a)?.granted).toBe("pay_tribute"));
Then("there is no war and no truce between them", (s) => expect(rel.stateOf(g(s), ...(s.pair as [string, string]))).toBeNull());
When("the country {string} refuses the demand {string} of the country {string}", (s, b: string, kind: string, a: string) => {
  act(s);
  D.demandRefused(w(s), a, b, D.DEMANDS[kind]!, "P");
});
Then("the country {string} holds the war aim {string} against {string} until {string}", (s, a: string, aim: string, b: string, until: string) =>
  expect(D.warAimsOf(w(s), a, b).some((x) => x.aim === D.aimId(aim) && x.until === until), JSON.stringify(D.warAimsOf(w(s), a, b))).toBe(true));

// ---------------------------------------------------------------- funding rebels

/** A target with a brewing revolution and 1200 gold a year, unless the scenario set it. */
function brewing(s: Scenario, b: string): void {
  const k = c(s, b);
  if (!k.yearlyIncome) k.yearlyIncome = 1200;
  if (s.signs === undefined && !k.revolutionSigns) k.revolutionSigns = 1;
}
Given("the country {string} has a free envoy seat", (s, a: string) => expect(D.freeSeats(w(s), a)).toBeGreaterThan(0));
Given("the country {string} is a rival of the country {string}", (s, a: string, b: string) => void rel.setRival(g(s), a, b, "trade in Lombardy"));
Given("the country {string} is an ally of the country {string}", (s, a: string, b: string) => void addState(s, "alliance", a, b));
Given("the revolution card of {string} shows {int} signs", (s, b: string, n: number) => {
  c(s, b).revolutionSigns = n;
  s.signs = n;
});
Given("the country {string} earns {int} gold a year and its revolution card shows {int} sign", (s, b: string, gold: number, n: number) => {
  c(s, b).yearlyIncome = gold;
  c(s, b).revolutionSigns = n;
});
When("the country {string} funds rebels in {string}", (s, a: string, b: string) => {
  brewing(s, b);
  s.eventsBefore = w(s).events.length;
  s.funder = a;
  attempt(s, () => D.fundRebels(w(s), a, b));
});
Then(/^the funding is (started|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));
Then("the country {string} pays {int} gold each month", (s, a: string, n: number) => {
  const before = c(s, a).gold;
  D.advanceMonth(w(s), rngWhere((x) => x >= D.caughtChance()));
  expect(before - c(s, a).gold).toBe(n);
});
Then("the country {string} is told nothing", (s, b: string) => {
  expect(w(s).events.slice(s.eventsBefore).some((e) => JSON.stringify(e).includes(b))).toBe(false);
  expect(w(s).letters.some((l) => l.to === b)).toBe(false);
});
When("the country {string} stops the funding in {string}", (s, a: string, b: string) => {
  act(s);
  D.stopFunding(w(s), a, b);
});
Then("the envoy of {string} comes home", (s, a: string) => {
  expect(w(s).envoys.find((e) => e.country === a && e.action === "fund_rebels")?.status).toBe("home");
  expect(w(s).fundings).toEqual([]);
});
Then("{string} carries the flag {string}", (s, b: string, flag: string) => {
  expect(flag).toBe(D.config.actions.fund_rebels.flag);
  expect(D.revolutionFunded(w(s), b)).toBe(true);
});
Given("an émigré court of the old dynasty of {string} sits in {string}", (s, target: string, host: string) => void (s.emigre = { target, host }));
When("the country {string} funds it", (s, a: string) => {
  act(s);
  c(s, s.emigre.target).yearlyIncome = 1200;
  s.funding = D.fundEmigreCourt(w(s), a, `Émigré court of ${s.emigre.target}`, s.emigre.target);
});
Then("it is funded under the same rules as rebels", (s) => {
  expect(w(s).fundings).toContain(s.funding);
  expect(s.funding.gold).toBe(D.fundingGold(w(s), s.emigre.target));
});
Then("each month the chance of being caught is {int} in {int}", (s, a: number, n: number) => expect(D.caughtChance()).toBeCloseTo(a / n));
When("the funding of {string} in {string} is caught", (s, a: string, b: string) => {
  act(s);
  brewing(s, b);
  D.fundingCaught(w(s), D.fundRebels(w(s), a, b));
  s.funder = a;
});
Then("the envoy of {string} is held and the funding stops", (s, a: string) => {
  expect(w(s).envoys.find((e) => e.country === a && e.action === "fund_rebels")?.status).toBe("held");
  expect(w(s).fundings).toEqual([]);
});
When(/^the revolution in "([^"]*)" wins with a regime (not hostile to|hostile to) the form of rule of "([^"]*)"$/, (s, b: string, how: string) => {
  act(s);
  D.revolutionWon(w(s), b, () => how === "hostile to");
});
Then("the ledger of {string} toward {string} does not hold {string}", (s, a: string, b: string, name: string) => expect(D.ledgerOf(w(s), a, b).some((x) => x.name === name)).toBe(false));
Then("the country {string} learns it was caught in {string}", (s, a: string, m: string) => {
  expect(D.lettersReceived(w(s), a)).toEqual([]);
  expect(w(s).letters.find((l) => l.to === a)?.deliverOn).toBe(m);
});

// ---------------------------------------------------------------- gifts, insults, rivals

Then(/^the ledger of "([^"]*)" toward "([^"]*)" gains "([^"]*)" at ([+-]?\d+)(?: fading over (\d+) years)?$/, (s, a: string, b: string, name: string, n: string, y?: string) => {
  const e = D.ledgerOf(w(s), a, b).find((x) => x.name === name);
  expect(e?.weight).toBeCloseTo(Number(n));
  if (y) expect(e?.fadeYears).toBe(Number(y));
});
When(/^the country "([^"]*)" declares the country "([^"]*)" a rival over (.*)$/, (s, a: string, b: string, obj: string) => attempt(s, () => D.declareRival(w(s), a, b, obj === "nothing named" ? undefined : obj)));
Then("the declaration is accepted", (s) => expect(s.error).toBeUndefined());

// ---------------------------------------------------------------- leagues

Given("the country {string} has taken {int} provinces in the last 20 years", (s, x: string, n: number) => {
  c(s, x).landsTaken = n;
  s.conqueror = x;
});
Given("the country {string} borders {string} and is not its ally, subject or overlord and not at war with it", (s, a: string, x: string) => D.setBorder(w(s), a, x));
When("the yearly league check runs", (s) => {
  act(s);
  s.asked = D.leagueCandidates(w(s), s.conqueror);
});
Then(/^the country "([^"]*)" (makes|does not make) the count "Join a league against ([^"]*)"$/, (s, a: string, how: string) => expect((s.asked as string[]).includes(a)).toBe(how === "makes"));
Given("the country {string} is the overlord of {string}", (s, a: string, b: string) => void rel.makeSubject(g(s), b, a));
Given("the country {string} is at war with {string}", (s, a: string, b: string) => void addState(s, "at_war", a, b));
Given("the country {string} neither borders {string} nor a province it took", () => {});
Then("the country {string} is not asked to join", (s, a: string) => expect((s.asked as string[]).includes(a)).toBe(false));

Given("the country {string} took {int} provinces of {string}", (s, x: string, n: number, a: string) => D.provincesTaken(w(s), x, a, Array.from({ length: n }, (_, i) => `${a} ${i}`)));
Given("the Lands taken of {string} are {int}", (s, x: string, n: number) => void (c(s, x).landsTaken = n));
Given("the country {string} is a {string} and {string} has {int} times its soldiers", (s, a: string, posture: string, x: string, n: number) => {
  c(s, a).posture = lower(posture);
  c(s, a).soldiers = 1000;
  c(s, x).soldiers = n * 1000;
  s.leagueOf = [a, x];
});
Given("{int} country is already in the league", (s, n: number) => void (s.members = n));
Given("{string} and {string} share a faith", (s, a: string, b: string) => void (c(s, a).faith = c(s, b).faith = "catholic"));
const leagueCountOf = (s: Scenario) => D.leagueCount(w(s), s.leagueOf[0], s.leagueOf[1], s.members ?? 0);
Then("the count of {string} holds these reasons:", (s, _a: string, table: Table) => {
  if (s.leagueOf) s.count = leagueCountOf(s);
  for (const [name, n] of table.slice(1)) expect(D.reasonNumber(s.count, name!), name).toBe(Number(n));
});
Then(/^the count of "([^"]*)" holds "([^"]*)" at ([+-]?\d+)$/, (s, _a: string, name: string, n: string) => expect(D.reasonNumber(leagueCountOf(s), name)).toBe(Number(n)));
Given("{int} countries say yes to a league against {string}", (s, n: number, x: string) => {
  s.formed = D.formLeague(w(s), x, Array.from({ length: n }, (_, i) => `Member ${i}`));
  s.conqueror = x;
});
Then("no league exists", (s) => expect(D.leagueAgainst(w(s), s.conqueror)).toBeUndefined());
Then(/^the league "League against ([^"]*)" exists$/, (s, x: string) => expect(D.leagueAgainst(w(s), x)?.members.length).toBeGreaterThanOrEqual(2));
Given("the countries {string} and {string} are in the league against {string}", (s, a: string, b: string, x: string) => void D.formLeague(w(s), x, [a, b]));
Then("the country {string} is called defensively", (s, a: string) => expect(callsTo(s, a).some((k) => k.kind === "defensive" && k.via === "league")).toBe(true));
When("the country {string} refuses", (s, a: string) => {
  act(s);
  D.answerCall(w(s), D.pendingCall(w(s), a)!, false);
});
Then("the country {string} leaves the league", (s, a: string) => expect(w(s).leagues.some((l) => l.members.includes(a))).toBe(false));
Then("the country {string} is not called by the league", (s, a: string) => expect(callsTo(s, a).some((k) => k.via === "league")).toBe(false));
Given("the league against {string} has the members {string} and {string}", (s, x: string, a: string, b: string) => {
  D.formLeague(w(s), x, [a, b]);
  c(s, a).soldiers = 12000;
  c(s, b).soldiers = 8000;
});
Then("the country card of {string} shows the league, its members and their soldiers", (s, x: string) =>
  expect(D.leagueCard(w(s), x)).toEqual({ name: `League against ${x}`, members: [{ id: "Milan", soldiers: 12000 }, { id: "Florence", soldiers: 8000 }] }));
Given("the era is {string} and a league exists against {string}", (s, era: string, x: string) => {
  w(s).era = era;
  c(s, x).landsTaken = D.config.leagues.threshold_by_era[era]!;
  D.formLeague(w(s), x, ["Member 1", "Member 2"]);
  s.conqueror = x;
});
When("the Lands taken of {string} fall to {int}", (s, x: string, n: number) => {
  act(s);
  c(s, x).landsTaken = n;
  D.checkLeagueDissolution(w(s));
});
When(/^"([^"]*)" makes a peace giving provinces back to a member$/, (s, x: string) => {
  act(s);
  D.peaceReturnsProvinces(w(s), x, "Member 1");
});
Then(/^the league (dissolves|stays)$/, (s, r: string) => expect(D.leagueAgainst(w(s), s.conqueror) !== undefined).toBe(r === "stays"));

// ---------------------------------------------------------------- marriages and pretenders

Given(/^the ruling house of "([^"]*)" (has an unmarried daughter|has an unmarried heir|has no unmarried child)$/, (s, a: string, how: string) => void (c(s, a).unmarriedChildren = how === "has no unmarried child" ? 0 : 1));
When("the country {string} proposes a marriage to the country {string}", (s, a: string, b: string) => {
  s.count = D.countAsk(w(s), { action: "arrange_marriage", asker: a, asked: b });
  attempt(s, () => D.proposeMarriage(w(s), a, b));
});
Given("the ruling houses of {string} and {string} follow hostile faiths", (s, a: string, b: string) => {
  c(s, a).faith = "catholic";
  c(s, b).faith = "sunni";
  c(s, a).unmarriedChildren = c(s, b).unmarriedChildren = 1;
  s.pair = [a, b];
});
Given("the religion rules do not allow the marriage", (s) => void w(s).marriageForbidden.push(D.pairKey(...(s.pair as [string, string]))));
Given(/^the realm of "([^"]*)" has (more than|fewer than) the people of "([^"]*)"$/, (s, a: string, how: string, b: string) => {
  c(s, a).people = how === "more than" ? 2000 : 500;
  c(s, b).people = 1000;
});
Given("the houses of {string} and {string} are already bound by {int} marriages", (s, a: string, b: string, n: number) => {
  for (let i = 0; i < n; i++) D.marriageAgreed(w(s), a, b);
});
Then("the marriage's own reasons total {int}", (s, n: number) => expect(D.ownTotal(s.count)).toBe(n));
When("the country {string} agrees to a marriage with the country {string}", (s, b: string, a: string) => {
  act(s);
  D.applyAnswer(w(s), { action: "arrange_marriage", asker: a, asked: b }, true);
  s.pair = [a, b];
});
Then("the fact {string} exists between {string} and {string}", (s, f: string, a: string, b: string) => expect(rel.hasFact(g(s), f, a, b)).toBe(true));
Then("each ledger between them holds {string}", (s, name: string) => {
  const [a, b] = s.pair as [string, string];
  expect(D.ledgerOf(w(s), a, b).some((e) => e.name === name) && D.ledgerOf(w(s), b, a).some((e) => e.name === name)).toBe(true);
});
Given("the houses of {string} and {string} are bound by {int} living marriage", (s, a: string, b: string, n: number) => {
  for (let i = 0; i < n; i++) D.marriageAgreed(w(s), a, b);
  s.pair = [a, b];
});
When("the ruler of {string} dies without a direct heir", (s, a: string) => {
  act(s);
  s.dead = a;
});
When("the 1 in 10 roll comes up", (s) => D.rulerDiesWithoutDirectHeir(w(s), s.dead, rngWhere((x) => x < D.config.actions.arrange_marriage.claim_chance_per_heirless_death)));
Then("the fact {string} from {string} to {string} exists", (s, f: string, a: string, b: string) => expect(rel.hasFact(g(s), f, a, b, true)).toBe(true));
Then("a pretender to the throne of {string} sits at the court of {string}", (s, t: string, court: string) => expect(w(s).pretenders.some((p) => p.throne === t && p.court === court)).toBe(true));
Given("Austria holds Ladislaus V at its court in 1444", (s) => void D.placePretender(w(s), "Ladislaus V", "Hungary", "Austria"));
Given("an exile of {string} flees to {string} after a lost succession war", (s, b: string, a: string) => void D.placePretender(w(s), `Exile of ${b}`, b, a));
Given("an event places a pretender of {string} at the court of {string}", (s, b: string, a: string) => void D.eventEffect(w(s), "pretender", { target: b, court: a, name: `Pretender of ${b}` }));
Then("the country {string} holds a pretender to the throne of {string}", (s, a: string, t: string) => expect(w(s).pretenders.some((p) => p.court === a && p.throne === t)).toBe(true));
Given("the pretender {string} to the throne of {string} sits at the court of {string}", (s, n: string, t: string, court: string) => void D.placePretender(w(s), n, t, court));
When(/^"([^"]*)" dies (leaving a son|with no heir)$/, (s, n: string, how: string) => {
  act(s);
  D.pretenderDies(w(s), n, how === "leaving a son" ? `${n}'s son` : undefined);
  s.pretender = n;
});
Then("his son becomes the pretender", (s) => expect(w(s).pretenders.map((p) => p.name)).toEqual([`${s.pretender}'s son`]));
Then("the claim lapses", (s) => expect(w(s).pretenders).toEqual([]));
Given("the ruler of {string} dies with no heir at all", (s, a: string) => void (s.dead = a));
Given("the house of {string} holds the most marriages with the house of {string}", (s, a: string, b: string) => {
  D.marriageAgreed(w(s), a, b);
  D.marriageAgreed(w(s), a, b);
  D.marriageAgreed(w(s), "Portugal", b);
  w(s).lords.push({ name: "Count of Urgell", country: b, loyalty: "disloyal", provinces: [] }, { name: "Loyal baron", country: b, loyalty: "loyal", provinces: [] });
});
When("the succession is resolved", (s) => {
  act(s);
  s.heir = D.rulerDiesWithNoHeir(w(s), s.dead);
});
Then("the realm of {string} passes to the ruler of {string}", (s, x: string, h: string) => expect(w(s).events.some((e) => e.type === "CrownInherited" && e.realm === x && e.newRuler === h)).toBe(true));
Then("the union is handed to the subjects context as {string}", (s, kind: string) => expect(w(s).events.find((e) => e.type === "CrownInherited")?.kind).toBe(kind));
Then("each Wavering or Disloyal lord of {string} rolls to rise for a local claimant as a succession war", (s, x: string) =>
  expect(w(s).events.filter((e) => e.type === "SuccessionWarRoll" && e.realm === x).map((e) => e.lord)).toEqual(["Count of Urgell"]));

// ---------------------------------------------------------------- passage

Given(/^the country "([^"]*)" and the country "([^"]*)" (are at war|have B as a subject of A|are allied|have passage granted by B to A|are at peace with nothing else)$/, (s, a: string, b: string, how: string) => {
  if (how === "are at war") addState(s, "at_war", a, b);
  if (how === "have B as a subject of A") rel.makeSubject(g(s), b, a);
  if (how === "are allied") addState(s, "alliance", a, b);
  if (how === "have passage granted by B to A") D.grantPassage(w(s), b, a);
});
Then(/^the armies of "([^"]*)" (may|may not) enter the country "([^"]*)"$/, (s, a: string, may: string, b: string) => expect(D.mayEnter(w(s), a, b)).toBe(may === "may"));
When("the country {string} asks the country {string} for passage", (s, a: string, b: string) => {
  s.count = D.countAsk(w(s), { action: "ask_passage", asker: a, asked: b, ...(s.passTarget ? { passageTarget: s.passTarget } : {}) });
  attempt(s, () => D.askPassage(w(s), a, b, s.passTarget));
});
Then(/^the ask is (sent|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));
Given(/^the likely target of the army of "([^"]*)" is (a country Friendly with "B"|a country allied with "B"|an enemy of "B"|nobody "B" cares about)$/, (s, _a: string, how: string) => {
  s.passTarget = "T";
  if (how.includes("Friendly")) rel.setStance(g(s), "B", "T", "friendly");
  if (how.includes("allied")) addState(s, "alliance", "B", "T");
  if (how.includes("enemy")) addState(s, "at_war", "B", "T");
});
Then("the passage's own reasons total {int}", (s, n: number) => expect(D.ownTotal(s.count)).toBe(n));
When("the country {string} grants passage to the country {string}", (s, a: string, b: string) => {
  act(s);
  D.grantPassage(w(s), a, b);
  s.pair = [a, b];
});
Then("the passage lasts until {string}", (s, until: string) => expect(w(s).passages[0]?.until).toBe(until));
When("the country {string} revokes it in {string}", (s, a: string, date: string) => {
  D.advanceTo(w(s), date);
  D.revokePassage(w(s), a, (s.pair as string[])[1]!);
});
Then("the passage ends that day", (s) => {
  const [a, b] = s.pair as [string, string];
  expect(D.mayEnter(w(s), b, a)).toBe(false);
});
Given("the country {string} has no passage through the country {string}", (s, a: string, b: string) => expect(D.mayEnter(w(s), a, b)).toBe(false));
When("an army of {string} enters the country {string}", (s, a: string, b: string) => {
  act(s);
  D.armyEnters(w(s), a, b);
});
Then("the country {string} may declare war on {string} with the aim {string} this turn", (s, b: string, a: string, aim: string) => expect(() => D.declareWar(structuredClone(w(s)), b, a, { aim: D.aimId(aim) })).not.toThrow());
Then("the defensive calls of {string} count as answered to a war started by {string}", (s, b: string, a: string) => {
  const copy = structuredClone(w(s));
  rel.setRelation(copy.graph, "alliance", b, "Ally");
  const war = D.declareWar(copy, b, a, { aim: "punish" });
  expect(war.startedBy).toBe(a);
  expect(copy.calls.find((k) => k.called === "Ally")?.kind).toBe("defensive");
});

// ---------------------------------------------------------------- peace and truces

When("both agree to extend it", (s) => {
  act(s);
  s.before = rel.find(g(s), "truce", ...(s.pair as [string, string]))[0]!.expires_on;
  rel.extendTruce(g(s), ...(s.pair as [string, string]), 12);
});
Then("the truce lasts longer", (s) => expect(D.monthIndex(rel.find(g(s), "truce", ...(s.pair as [string, string]))[0]!.expires_on!)).toBeGreaterThan(D.monthIndex(s.before)));
Given("an envoy of {string} carries a peace offer to the {string} during the war", (s, a: string, b: string) => {
  addState(s, "at_war", a, b);
  s.envoy = D.sendEnvoy(w(s), { country: a, target: b, action: "peace_offer" });
});
Given("three countries are at war on each side", (s) => {
  for (const a of ["A1", "A2", "A3"]) for (const b of ["B1", "B2", "B3"]) addState(s, "at_war", a, b);
  for (const x of ["A1", "B2"]) c(s, x).peaceVoicesForPeace = 0.7;
});
When("one envoy carries a single peace to every warring country", (s) => attempt(s, () => D.manySidedPeace(w(s), [["A1", "A2", "A3"], ["B1", "B2", "B3"]])));
Then("each country signs or not by its own peace voices, all at once", (s) => {
  expect(s.error).toBeUndefined();
  const signs = (s.result as { signs: Record<string, boolean> }).signs;
  expect(Object.keys(signs).length).toBe(6);
  expect(signs.A1).toBe(true);
  expect(signs.A2).toBe(false);
});
Then("each pair must make its own peace", (s) => expect(s.error).toContain("each pair must make its own peace"));

// ---------------------------------------------------------------- pledges and sworn peace

Then(/^the pledge is (made|refused)$/, (s, r: string) => (r === "refused" ? expect(s.error).toBeDefined() : expect(s.error).toBeUndefined()));
Then("no relation type between them is created or blocked", (s) => {
  const [a, b] = s.pair as [string, string];
  expect(rel.relationsBetween(g(s), a, b)).toEqual([]);
  expect(() => rel.formAlliance(structuredClone(g(s)), a, b)).not.toThrow();
});
Then("{string} owes {string} nothing", (s, a: string, b: string) => {
  expect(rel.overlord(g(s), a)).toBeNull();
  expect(rel.relationsBetween(g(s), a, b)).toEqual([]);
});
Given("the country {string} pledged protection to the country {string}", (s, a: string, b: string) => void D.pledgeProtection(w(s), a, b));
Then("the country {string} gets a defensive call as if allied", (s, a: string) => expect(callsTo(s, a).some((k) => k.kind === "defensive" && k.via === "pledge")).toBe(true));
When("the country {string} refuses the call", (s, a: string) => {
  act(s);
  D.answerCall(w(s), D.pendingCall(w(s), a)!, false);
});
Given(/^the country "([^"]*)" (holds no|holds) a claim on land of "([^"]*)"$/, (s, b: string, how: string, a: string) => {
  if (how === "holds") rel.addFact(g(s), "territorial_claim", b, a);
});
When("the country {string} asks the country {string} to swear peace", (s, a: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "swear_peace", asker: a, asked: b });
});
Then("the sworn peace's own reasons total {int}", (s, n: number) => expect(D.ownTotal(s.count)).toBe(n));
When("the country {string} agrees to swear peace with the country {string}", (s, b: string, a: string) => {
  act(s);
  D.applyAnswer(w(s), { action: "swear_peace", asker: a, asked: b }, true);
});
Then("{string} and {string} have a truce with origin {string} until {string}", (s, a: string, b: string, o: string, until: string) => {
  const t = rel.find(g(s), "truce", a, b)[0];
  expect(t?.origin).toBe(o);
  expect(t?.expires_on).toBe(until);
});
Given("the countries {string} and {string} have a sworn peace", (s, a: string, b: string) => {
  D.swornPeace(w(s), a, b);
  s.pair = [a, b];
});

// ---------------------------------------------------------------- subjects by agreement

When("the country {string} accepts the overlordship of the country {string}", (s, b: string, a: string) => {
  act(s);
  D.applyAnswer(w(s), { action: "offer_overlordship", asker: a, asked: b }, true);
});
Then("the subjects context makes {string} a subject of {string} with a kind it allows for that pair", (s, b: string, a: string) => {
  const e = w(s).events.find((x) => x.type === "SubjectByAgreementAgreed");
  expect(e).toMatchObject({ overlord: a, subject: b });
  expect(e?.kind).toBeUndefined();
  expect(rel.overlord(g(s), b)).toBeNull();
});
When("the country {string} asks the country {string} for protection", (s, a: string, b: string) => {
  act(s);
  s.ask = { action: "ask_protection", asker: a, asked: b };
  s.count = D.countAsk(w(s), s.ask);
});
Then("the count of {string} holds the base {int}", (s, _b: string, n: number) => expect(s.count.reasons.find((r: D.Reason) => r.kind === "base")?.number).toBe(n));
Then("on yes the subjects context makes {string} a subject of {string}", (s, a: string, b: string) => {
  const copy = structuredClone(w(s));
  D.applyAnswer(copy, s.ask, true);
  expect(copy.events.find((x) => x.type === "SubjectByAgreementAgreed")).toMatchObject({ overlord: b, subject: a });
});

// ---------------------------------------------------------------- war aims

Given("the country {string} held the province {string} {int} years ago", (s, a: string, p: string, y: number) =>
  void D.province(w(s), p, "B").history.push({ owner: a, until: D.addMonths(D.monthOf(w(s).date), -12 * y) }));
Given("a pretender of {string} claims the province {string}", (s, a: string, p: string) => {
  D.province(w(s), p, "B");
  D.placePretender(w(s), "Claimant", "B", a, [p]);
});
Given("the province {string} is a homeland of the culture of {string}", (s, p: string, a: string) => {
  c(s, a).culture = `culture of ${a}`;
  D.province(w(s), p, "B").homelandOf = `culture of ${a}`;
});
Given("a lord of {string} wants the province {string}", (s, a: string, p: string) => {
  D.province(w(s), p, "B");
  w(s).lords.push({ name: "Wanting lord", country: a, loyalty: "loyal", provinces: [], wants: [p] });
});
Given("the country {string} refused the demand of {string} for the province {string}", (s, b: string, a: string, p: string) => {
  D.province(w(s), p, b);
  D.demandRefused(w(s), a, b, "hand_over_province", p);
});
Given("a lord defected from {string} to {string} with the province {string}", (s, a: string, b: string, p: string) => {
  D.province(w(s), p, b);
  w(s).defections.push({ from: a, to: b, provinces: [p] });
});
Then(/^the country "([^"]*)" holds the war aim "([^"]*)" for the province "([^"]*)" against "([^"]*)" (while the reason holds|for 5 years)$/, (s, a: string, aim: string, p: string, b: string, how: string) => {
  const aims = D.warAimsOf(w(s), a, b).filter((x) => x.aim === D.aimId(aim) && x.province === p);
  expect(aims.length).toBeGreaterThan(0);
  if (how === "for 5 years") expect(aims[0]!.until).toBe(D.addMonths(D.monthOf(w(s).date), 60));
  else expect(aims[0]!.until).toBeUndefined();
});
Given("the country {string} last held the province {string} {int} years ago and has no other reason", (s, a: string, p: string, y: number) =>
  void D.province(w(s), p, "B").history.push({ owner: a, until: D.addMonths(D.monthOf(w(s).date), -12 * y) }));
Then("the country {string} holds no war aim {string} for the province {string}", (s, a: string, aim: string, p: string) =>
  expect(D.holdsAim(w(s), a, w(s).provinces[p]!.owner, D.aimId(aim), p)).toBe(false));
Given("Ladislaus V, a pretender to the throne of {string}, is at the court of {string}", (s, t: string, court: string) => void D.placePretender(w(s), "Ladislaus V", t, court));
When("Ladislaus V dies with no heir", (s) => {
  act(s);
  D.pretenderDies(w(s), "Ladislaus V");
});
Then("the country {string} no longer holds that aim", (s, a: string) => expect(D.holdsAim(w(s), a, "Hungary", "seat_pretender")).toBe(false));
Given(/^"([^"]*)" refused a tribute demand of "([^"]*)"$/, (s, b: string, a: string) => D.demandRefused(w(s), a, b, "pay_tribute"));
Given(/^"([^"]*)" has (\d+) times the soldiers of "([^"]*)"$/, (s, a: string, n: string, b: string) => {
  c(s, a).soldiers = Number(n) * 1000;
  c(s, b).soldiers = 1000;
});
Given("the land of {string} holds a homeland of the culture {string} with no country of its own", (s, b: string, cu: string) => {
  D.province(w(s), "Homeland", b).homelandOf = cu;
  w(s).statelessCultures.push(cu);
  s.culture = cu;
});
Given(/^the culture "([^"]*)" is (the culture|an accepted culture|neither culture nor accepted) of "([^"]*)"$/, (s, cu: string, how: string, a: string) => {
  if (how === "the culture") c(s, a).culture = cu;
  if (how === "an accepted culture") c(s, a).acceptedCultures.push(cu);
});
Given("a province of {string} bordering {string} carries the persecution flag", (s, b: string, a: string) => {
  const p = D.province(w(s), "Persecuted", b);
  p.persecution = true;
  p.borders.push(a);
});
Given(/^"([^"]*)" refused the demand of "([^"]*)" to tolerate its faith there$/, (s, b: string, a: string) => D.demandRefused(w(s), a, b, "tolerate_faith"));
When("the country {string} breaks a truce with {string}", (s, b: string, a: string) => {
  act(s);
  addState(s, "truce", a, b);
  D.breakTruce(w(s), b, a);
});
When("the country {string} insults {string}", (s, b: string, a: string) => {
  act(s);
  D.insult(w(s), b, a);
});
When("the country {string} holds an envoy of {string}", (s, b: string, a: string) => {
  act(s);
  D.holdEnvoy(w(s), b, D.sendEnvoy(w(s), { country: a, target: b, action: "courtesy_visit" }));
});
When("an army of {string} enters {string} without passage", (s, b: string, a: string) => {
  act(s);
  D.armyEnters(w(s), b, a);
});
When("the country {string} refuses the demand {string} of {string}", (s, b: string, kind: string, a: string) => {
  act(s);
  D.demandRefused(w(s), a, b, D.DEMANDS[kind]!);
});
When(/^"([^"]*)" catches "([^"]*)" funding rebels in its land$/, (s, a: string, b: string) => {
  act(s);
  c(s, a).revolutionSigns = 1;
  D.fundingCaught(w(s), D.fundRebels(w(s), b, a));
});
Given("the country {string} holds no other aim against {string}", (s, a: string, b: string) =>
  expect(D.warAimsOf(w(s), a, b).every((x) => x.aim === "raid" || x.aim === "no_aim")).toBe(true));
Then("the country {string} may declare war on {string} with the aim {string}", (s, a: string, b: string, aim: string) => expect(() => D.declareWar(structuredClone(w(s)), a, b, { aim: D.aimId(aim) })).not.toThrow());
Given(/^an event grants "([^"]*)" the aim "([^"]*)" for (\d+) years$/, (s, a: string, aim: string, y: string) => D.eventEffect(w(s), "war_aim", { holder: a, target: "B", aim: D.aimId(aim), years: Number(y) }));
Given(/^a national strength of "([^"]*)" grants its own aim against "([^"]*)"$/, (s, a: string, b: string) => D.grantAim(w(s), { holder: a, target: b, aim: "its own aim", source: "national strength" }));
Then(/^the country "([^"]*)" holds the war aim "([^"]*)" against "([^"]*)" (?:for (\d+) years|as the strength says)$/, (s, a: string, aim: string, b: string, y?: string) => {
  const x = D.warAimsOf(w(s), a, b).find((k) => k.aim === D.aimId(aim));
  expect(x).toBeDefined();
  if (y) expect(x!.until).toBe(D.addMonths(D.monthOf(w(s).date), 12 * Number(y)));
  else expect(x!.source).toBe("national strength");
});

// ---------------------------------------------------------------- trade pacts and embargoes

Given("the countries {string} and {string} are not at war", (s, a: string, b: string) => expect(rel.has(g(s), "at_war", a, b)).toBe(false));
When("the country {string} agrees to a trade pact with the country {string}", (s, b: string, a: string) => {
  act(s);
  D.applyAnswer(w(s), { action: "trade_pact", asker: a, asked: b }, true);
  s.pair = [a, b];
});
Then("their traders pay no tolls and no extra fees in each other's provinces", (s) => expect(D.tollsWaived(w(s), ...(s.pair as [string, string]))).toBe(true));
Then("the fact {string} exists between them", (s, f: string) => expect(rel.hasFact(g(s), f, ...(s.pair as [string, string]))).toBe(true));
Given("the countries {string} and {string} have a trade pact", (s, a: string, b: string) => {
  D.tradePactAgreed(w(s), a, b);
  s.pair = [a, b];
});
When("the country {string} cancels the pact", (s, b: string) => {
  act(s);
  D.cancelTradePact(w(s), (s.pair as string[])[0]!, b);
});
Then("the trade pact has ended", (s) => expect(D.tollsWaived(w(s), ...(s.pair as [string, string]))).toBe(false));
When("the country {string} declares an embargo on the country {string}", (s, a: string, b: string) => {
  act(s);
  D.declareEmbargo(w(s), a, b);
});
Then("the traders of {string} and {string} may not cross each other's land or ports", (s, a: string, b: string) => expect(D.tradeAllowed(w(s), a, b)).toBe(false));
Then("the paths through the provinces of {string} are closed to the traders of {string}", (s, a: string, b: string) => expect(D.pathsClosed(w(s), a, b)).toBe(true));
Then(/^the ledger of "([^"]*)" toward "([^"]*)" holds "([^"]*)" at ([+-]?\d+) while it lasts$/, (s, a: string, b: string, name: string, n: string) => {
  const e = D.ledgerOf(w(s), a, b).find((x) => x.name === name);
  expect(e?.weight).toBe(Number(n));
  expect(e?.condition).toBe("in_force");
});
When("the country {string} offers a trade pact to the country {string}", (s, a: string, b: string) => attempt(s, () => D.offerTradePact(w(s), a, b)));
Then("the offer is refused", (s) => expect(s.error).toBeDefined());

// ---------------------------------------------------------------- eras

When("the event {string} fires", (s, ev: string) => {
  act(s);
  w(s).flags.push(ev);
});
Then("many-sided peace is available", (s) => expect(D.manySidedPeaceUnlocked(w(s))).toBe(true));
Then("the tie {string} weighs {int}", (s, name: string, n: number) => expect(D.ledgerOf(w(s), ...(s.pair as [string, string])).find((e) => e.name === name)?.weight).toBe(n));
Then("the league threshold is {int} provinces", (s, n: number) => expect(D.leagueThreshold(w(s))).toBe(n));
Given("the allies {string} and {string} have marked their alliance as a mobilisation pact", (s, a: string, b: string) => {
  addState(s, "alliance", a, b);
  D.markMobilisationPact(w(s), a, b);
});
Given("the player plays {string}", (s, a: string) => void (w(s).player = a));
Then("the defensive call to {string} is answered yes with no reasons count", (s, a: string) => {
  const k = callsTo(s, a).find((x) => x.kind === "defensive")!;
  expect(k.answer).toBe("yes");
  expect(k.automatic).toBe(true);
  expect(rel.has(g(s), "at_war", a, "Russia")).toBe(true);
});
Then("the player gets the event {string} saying {string} has joined the war", (s, title: string, a: string) => {
  const e = w(s).events.find((x) => x.type === "MobilisationTriggered");
  expect(e).toMatchObject({ title, joined: a, to: w(s).player });
});
When("the allies {string} and {string} mark their alliance as a mobilisation pact", (s, a: string, b: string) => {
  addState(s, "alliance", a, b);
  attempt(s, () => D.markMobilisationPact(w(s), a, b));
});
Given("the country {string} became a revolutionary republic by a revolution", (s, a: string) => {
  // the revolutions context supplies the row and its time
  w(s).revolutionRows.push({ country: a, name: "Different form of rule", number: -20, againstForm: "monarchy", until: D.addMonths(w(s).date, 120) });
  s.revolutionary = a;
});
When("the monarchy {string} counts any ask of {string}", (s, b: string, a: string) => {
  act(s);
  c(s, b).form = "monarchy";
  s.count = D.countAsk(w(s), { action: "trade_pact", asker: a, asked: b });
  s.pair = [a, b];
});
Then("the count holds {string} at {int} for the time the revolution sets", (s, name: string, n: number) => {
  expect(D.reasonNumber(s.count, name)).toBe(n);
  const later = structuredClone(w(s));
  later.date = later.revolutionRows[0]!.until!;
  expect(D.reasonNumber(D.countAsk(later, { action: "trade_pact", asker: s.pair[0], asked: s.pair[1] }), name)).toBe(0);
});

// ---------------------------------------------------------------- events

When(/^the event "([^"]*)" adds opinion (-?\d+) of "([^"]*)" toward "([^"]*)" (?:with no fade given|fading over (\d+) years)$/, (s, ev: string, n: string, a: string, b: string, y?: string) => {
  act(s);
  D.eventOpinion(w(s), ev, a, b, Number(n), y ? Number(y) : undefined);
});
Then(/^the ledger of "([^"]*)" toward "([^"]*)" holds an entry named after "([^"]*)" at (-?\d+) fading over (\d+) years$/, (s, a: string, b: string, ev: string, n: string, y: string) => {
  const e = D.ledgerOf(w(s), a, b).find((x) => x.name === ev);
  expect(e?.weight).toBe(Number(n));
  expect(e?.fadeYears).toBe(Number(y));
});
Given("the country {string} has broken {int} oaths in the last 30 years", (s, a: string, n: number) => {
  for (let i = 0; i < n; i++) D.addOath(w(s), a, "test");
});
Then("the trust of {string} reads {int}", (s, a: string, n: number) => expect(D.trust(w(s), a)).toBe(n));
When("an event lowers the trust of {string}", (s, a: string) => {
  act(s);
  D.lowerTrust(w(s), a);
});
When("an event sets the relation {string} between {string} and {string}", (s, t: string, a: string, b: string) => attempt(s, () => D.eventRelation(w(s), t, a, b, "named by the event")));
Then("the diplomacy context applies {string} with its requirements", (s, action: string) => {
  expect(s.error).toBeUndefined();
  expect(s.result).toBe(lower(action));
});
Then("the alliance must be broken first, as for a player", (s) => {
  expect(s.error).toBeDefined();
  expect(rel.has(g(s), "alliance", ...(s.pair as [string, string]))).toBe(true);
});
When("an event uses the effect {string}", (s, effect: string) => {
  act(s);
  D.eventEffect(w(s), effect, { holder: "A", target: "B", court: "A", years: 5, aim: "punish", name: "Pretender" });
});
Then("a war aim against a role is granted for a set number of years", (s) => expect(D.warAimsOf(w(s), "A", "B").some((a) => a.aim === "punish" && a.until === D.addMonths(D.monthOf(w(s).date), 60))).toBe(true));
Then("a league against a role is started", (s) => expect(D.leagueAgainst(w(s), "B")?.origin).toBe("event"));
Then("a pretender to a role's throne is placed at another role's court", (s) => expect(w(s).pretenders).toContainEqual({ name: "Pretender", throne: "B", court: "A", claims: [] }));

// ---------------------------------------------------------------- the AI

Given("the AI country {string} has posture {string}", (s, b: string, p: string) => void (c(s, b).posture = lower(p)));
const postureTotal = (r: D.Reason[]) => r.filter((x) => x.kind === "posture").reduce((t, x) => t + x.number, 0);
When(/^a country asks "([^"]*)" for (an alliance|a trade pact|a demand|passage)$/, (s, b: string, what: string) => {
  act(s);
  const action = what === "a demand" ? "demand" : actionId(what);
  s.count = D.countAsk(w(s), { action, asker: "X", asked: b, ...(action === "demand" ? { demandKind: "pay_tribute" } : {}) });
});
When(/^a country asks "([^"]*)" to swear peace$/, (s, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "swear_peace", asker: "X", asked: b });
});
When(/^a stronger country asks "([^"]*)" for an alliance$/, (s, b: string) => {
  act(s);
  c(s, "X").soldiers = 2000;
  c(s, b).soldiers = 1000;
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: "X", asked: b });
});
When(/^"([^"]*)" counts a league against a country with (\d+) times its soldiers$/, (s, b: string, n: string) => {
  act(s);
  c(s, b).soldiers = 1000;
  c(s, "X").soldiers = 1000 * Number(n);
  s.count = D.leagueCount(w(s), b, "X", 0);
});
When(/^"([^"]*)" is called to a war on the side with more soldiers$/, (s, b: string) => {
  act(s);
  c(s, "X").soldiers = 2000;
  c(s, "T").soldiers = 1000;
  s.count = D.countAsk(w(s), { action: "call_to_arms", asker: "X", asked: b, callKind: "offensive", callTarget: "T" });
});
When(/^"([^"]*)" gets a defensive call where the enemy is stronger$/, (s, b: string) => {
  act(s);
  c(s, "X").soldiers = 1000;
  c(s, "T").soldiers = 2000;
  s.count = D.countAsk(w(s), { action: "call_to_arms", asker: "X", asked: b, callKind: "defensive", callTarget: "T" });
});
When(/^a country asks "([^"]*)" for an alliance against its strongest neighbour$/, (s, b: string) => {
  act(s);
  D.setBorder(w(s), b, "N");
  D.setBorder(w(s), b, "M");
  c(s, "N").soldiers = 5000;
  c(s, "M").soldiers = 1000;
  addState(s, "at_war", "X", "N");
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: "X", asked: b });
});
When(/^a stronger Warm country offers "([^"]*)" overlordship$/, (s, b: string) => {
  act(s);
  c(s, "X").soldiers = 2000;
  c(s, b).soldiers = 1000;
  w(s).standingOverride[D.key(b, "X")] = 40;
  s.count = D.countAsk(w(s), { action: "offer_overlordship", asker: "X", asked: b });
});
Then("the count of {string} holds the posture reason at {int}", (s, _b: string, n: number) => expect(postureTotal(s.count.reasons)).toBe(n));
Given("the AI country {string} is an {string}", (s, b: string, p: string) => void (c(s, b).posture = lower(p)));
Given("the country {string} has broken {int} oaths", (s, a: string, n: number) => {
  for (let i = 0; i < n; i++) D.addOath(w(s), a, "test");
});
Given("the AI country {string} has negotiation {string}", (s, b: string, n: string) => void (c(s, b).negotiation = lower(n)));
Then("the count holds the negotiation reason at {int}", (s, n: number) => expect(s.count.reasons.filter((r: D.Reason) => r.kind === "negotiation").reduce((t: number, r: D.Reason) => t + r.number, 0)).toBe(n));
When("the country {string} sends {string} a gift of {int} gold", (s, a: string, b: string, gold: number) => {
  act(s);
  s.giftCounted = D.receiveGift(w(s), a, b, gold);
});

Given("the AI country {string} has {int} free envoy seat", (s, a: string, n: number) => {
  s.d = D.createFromDataset();
  s.ai = dataId(a);
  expect(D.freeSeats(w(s), s.ai)).toBe(n);
});
When("the AI turn runs", (s) => {
  act(s);
  if (s.bestEstimate !== undefined) s.choice = D.aiChoose(s.bestEstimate);
  else if (s.fundingAi) s.fundTargets = D.aiFundingTargets(w(s), s.fundingAi);
  else s.candidates = D.aiCandidates(w(s), s.ai);
});
Then("the {string} score at most {int} candidate actions", (s, _a: string, n: number) => {
  expect(s.candidates.length).toBeGreaterThan(0);
  expect(s.candidates.length).toBeLessThanOrEqual(n);
});
Then("every candidate targets a neighbour, a neighbour's neighbour, a country it holds a relation or fact with, or an enemy of its rivals", (s) => {
  const h = D.horizon(w(s), s.ai);
  for (const k of s.candidates as D.Candidate[]) expect(h).toContain(k.target);
});
Given("the best candidate of the AI country {string} has an estimated total of {int}", (s, _a: string, n: number) => void (s.bestEstimate = n));
Then(/^the AI country "([^"]*)" (sends that request|sends a gift first|sends nothing for it)$/, (s, _a: string, what: string) =>
  expect(s.choice).toBe({ "sends that request": "send", "sends a gift first": "gift_first", "sends nothing for it": "nothing" }[what]));
Given("the AI country {string} has no resident in {string}", (s, a: string, b: string) => expect(w(s).envoys.some((e) => e.country === a && e.target === b && e.status === "resident")).toBe(false));
When("the {string} estimate a count of {string}", (s, a: string, b: string) => {
  act(s);
  s.estimate = D.estimateCount(w(s), { action: "propose_alliance", asker: a, asked: b });
});
Then("they use an estimate of the soldiers of {string}, not the exact number", (s) => expect(s.estimate.soldiers).toBe("estimate"));
Given("the AI country {string} with posture {string} holds an aim against {string} that a demand fits", (s, a: string, p: string, b: string) => {
  c(s, a).posture = lower(p);
  D.grantAim(w(s), { holder: a, target: b, aim: "punish", source: "insulted us", until: D.addMonths(D.monthOf(w(s).date), 60) });
});
Given(/^the armies of "([^"]*)" are (at home|away)$/, (s, b: string, where: string) => void (c(s, b).armiesAway = where === "away"));
When("the AI country {string} decides to go to war with {string}", (s, a: string, b: string) => {
  act(s);
  s.plan = D.aiWarPlan(w(s), a, b);
});
Then(/^the AI country "([^"]*)" (sends the demand first|declares war without a demand)$/, (s, _a: string, what: string) => expect(s.plan).toBe(what === "sends the demand first" ? "demand_first" : "declare"));
When("the player's envoy asks the AI country {string} for an alliance", (s, b: string) => {
  act(s);
  s.expected = D.countAsk(structuredClone(w(s)), { action: "propose_alliance", asker: "Player", asked: b });
  s.envoy = D.sendEnvoy(w(s), { country: "Player", target: b, action: "propose_alliance" });
});
Then("{string} answers with exactly the reasons count of the rules", (s, b: string) => {
  const given = w(s).events.find((e) => e.type === "AnswerGiven" && e.asked === b);
  expect(given?.total).toBe(s.expected.total);
});
Then("the player reads the reasons when the answer arrives", (s) => {
  D.advanceMonth(w(s));
  expect(D.lettersReceived(w(s), "Player")[0]?.reasons).toEqual(s.expected.reasons);
});
Given("the AI country {string} has posture {string}, a free seat and gold to spare", (s, a: string, p: string) => {
  c(s, a).posture = lower(p);
  c(s, a).goldToSpare = true;
  s.fundingAi = a;
});
Given("the revolution card of its rival {string} shows {int} signs", (s, b: string, n: number) => {
  rel.setRival(g(s), s.fundingAi, b, "a frontier");
  c(s, b).revolutionSigns = n;
  s.rivalB = b;
});
Then(/^the AI country "([^"]*)" (may|does not) fund rebels there$/, (s, _a: string, how: string) => expect((s.fundTargets as string[]).includes(s.rivalB)).toBe(how === "may"));

// ---------------------------------------------------------------- lens and strip

Given(/^the country "([^"]*)" is (a subject|an ally|pledged|Close|Warm|Cool|nothing recorded|Cold|a Rival|Hostile|at war) to "([^"]*)"$/, (s, x: string, how: string, v: string) => {
  const words: Record<string, number> = { Close: 100, Warm: 50, Cool: 10, Cold: -50 };
  if (how === "a subject") rel.makeSubject(g(s), x, v);
  else if (how === "an ally") addState(s, "alliance", x, v);
  else if (how === "pledged") D.pledgeProtection(w(s), v, x);
  else if (how in words) w(s).standingOverride[D.key(x, v)] = words[how]!;
  else if (how === "a Rival") rel.setRival(g(s), v, x, "a frontier");
  else if (how === "Hostile") rel.setStance(g(s), x, v, "hostile");
  else if (how === "at war") addState(s, "at_war", x, v);
});
When("the player opens the diplomacy lens", (s) => void act(s));
Then("the country {string} is coloured {string}", (s, x: string, col: string) => expect(D.lensColour(w(s), w(s).player!, x)).toBe(col === `the colour of ${w(s).player}` ? "own" : col));
Given("a league against {string} exists", (s, x: string) => {
  D.formLeague(w(s), x, ["Austria", "Poland"]);
  w(s).player = x;
});
Then("the league's members are shown with a red border", (s) => {
  for (const m of ["Austria", "Poland"]) expect(D.lensBorder(w(s), w(s).player!, m)).toBe("red");
  expect(D.lensBorder(w(s), w(s).player!, "Venice")).toBeNull();
});
Given(/^the country "([^"]*)" has 3 seats: one free, one on the road to "([^"]*)" with (\d+) days left, one resident in "([^"]*)"$/, (s, a: string, to: string, days: string, court: string) => {
  c(s, a).provinces = 11;
  c(s, a).inventions.push("G8");
  const r = D.sendEnvoy(w(s), { country: a, target: court, action: "make_resident" });
  D.advanceTo(w(s), r.arrival);
  setDate(s, `${D.monthOf(w(s).date)}-20`);
  w(s).routes[D.pairKey(a, to)] = { land: [{ kind: "land", units: Number(days) / D.config.envoys.days_per_crossing_unit }] };
  D.sendEnvoy(w(s), { country: a, target: to, action: "courtesy_visit" });
  s.subject = a;
});
Then("the envoys strip shows {string}, {string} and {string}", (s, x: string, y: string, z: string) => expect(D.envoysStrip(w(s), s.subject)).toEqual([x, y, z]));

// ---------------------------------------------------------------- decided questions (D-DIPL-*)

// D-DIPL-2: an offensive refusal breaks nothing.
When("the country {string} refuses the offensive call", (s, x: string) => {
  act(s);
  s.oathsBefore = c(s, x).oaths.length;
  D.answerCall(w(s), D.pendingCall(w(s), x)!, false);
  s.refuser = x;
});
Then("{string} and {string} are still allied", (s, a: string, b: string) => expect(rel.has(g(s), "alliance", a, b)).toBe(true));
Then("no tie or wrong is added", (s) => {
  const x = s.refuser as string;
  expect(c(s, x).oaths.length).toBe(s.oathsBefore);
  expect(Object.values(w(s).ledgers).flat().some((e) => e.key === "abandoned_us" || e.key === "answered_our_call")).toBe(false);
});

// DIPL-099, DIPL-100
When("the country {string} calls the country {string} to arms", (s, a: string, b: string) => {
  act(s);
  addState(s, "alliance", a, b);
  D.declareWar(w(s), a, `the enemy of ${a}`);
  s.call = D.pendingCall(w(s), b);
});
Then("the call reaches {string} in {string}", (s, b: string, m: string) => {
  expect(s.call.called).toBe(b);
  expect(s.call.issued).toBe(m);
});
Then("{string} learns the answer in {string}", (s, a: string, m: string) => {
  expect(s.call.caller).toBe(a);
  expect(s.call.answerOn).toBe(m);
});
Given("the country {string} joined the war of {string}", (s, ally: string, caller: string) => {
  addState(s, "alliance", caller, ally);
  D.declareWar(w(s), caller, "Ottomans");
  D.answerCall(w(s), D.pendingCall(w(s), ally)!, true);
  s.pair = [caller, ally];
});
Then("the armies of {string} stay under the command of {string}", (s, a: string, b: string) => {
  expect(a).toBe(b);
  const war = D.warOf(w(s), a)!;
  expect(war.attackers).toContain(a);
  expect(war.declarer).not.toBe(a);
});
Then("{string} counts its own peace voices", (s, a: string) => {
  c(s, a).peaceVoicesForPeace = 0.6;
  w(s).era = "III";
  const war = D.warOf(w(s), a)!;
  expect(D.manySidedPeace(w(s), [war.attackers, war.defenders]).signs[a]).toBe(true);
  w(s).era = undefined as unknown as string;
  delete w(s).era;
  c(s, a).peaceVoicesForPeace = 0;
});
When("{string} makes peace with the country {string}", (s, a: string, _b: string) => {
  act(s);
  D.endWar(w(s), D.warOf(w(s), a)!);
});
Then("{string} is named in the peace and gets the truce", (s, a: string) => expect(rel.has(g(s), "truce", a, "Ottomans")).toBe(true));

// DIPL-148, DIPL-189, D-DIPL-33
Given("the country {string} holds the aim {string} for {string} from the Want of its lord John Hunyadi", (s, a: string, _aim: string, p: string) => {
  D.province(w(s), p, "Ottomans");
  w(s).lords.push({ name: "John Hunyadi", country: a, loyalty: "loyal", provinces: [], wants: [p] });
  s.declarer = a;
});
Given("the country {string} is allied with {string} and {string}", (s, a: string, b: string, x: string) => {
  addState(s, "alliance", a, b);
  addState(s, "alliance", a, x);
});
Given("the country {string} is a tributary of {string}", (s, a: string, b: string) => void rel.makeSubject(g(s), a, b, "tributary"));
When("the player opens the war declaration sheet against {string}", (s, b: string) => {
  act(s);
  c(s, s.declarer).peaceVoicesForPeace = 0.25;
  s.sheet = D.declarationSheet(w(s), s.declarer, b, "take_land");
});
Then("the sheet shows the aim {string} and its source", (s, aim: string) => {
  expect(s.sheet.aim).toBe(aim);
  expect(s.sheet.source).toBe("a lord's Want");
});
Then("the sheet shows {string} and {string} as called on the side of {string}", (s, x: string, y: string, a: string) => {
  for (const k of [x, y]) expect(s.sheet.sides).toContainEqual(expect.objectContaining({ country: k, side: a, how: "called" }));
});
Then("the sheet shows {string} as a tributary of the {string} that does not join", (s, x: string, b: string) =>
  expect(s.sheet.sides).toContainEqual(expect.objectContaining({ country: x, side: b, how: "tributary, does not join" })));
Then("the sheet shows how many of the voices of {string} lean to peace", (s, _a: string) => expect(s.sheet.peaceVoices).toBe(0.25));
Then("the sheet does not show how the called countries will answer", (s) => expect(JSON.stringify(s.sheet)).not.toMatch(/answer"|yes|will join/));
Then("the sheet offers {string} and {string}", (s, x: string, y: string) => expect(s.sheet.choices).toEqual([x, y]));

// DIPL-151
Given("the country {string} holds the aim {string} against {string} and borders {string}", (s, a: string, aim: string, b: string, n: string) => {
  D.setBorder(w(s), a, n);
  if (aim !== "No aim") D.grantAim(w(s), { holder: a, target: b, aim: D.aimId(aim), source: "test" });
  s.declarer = a;
});
Then("every country sees the aim {string}", (s, aim: string) => {
  expect(s.error).toBeUndefined();
  expect(w(s).events.some((e) => e.type === "WarDeclared" && e.aim === aim && e.public === true)).toBe(true);
});
Then(/^every neighbour of "([^"]*)" (gains|does not gain) the wrong "([^"]*)" toward "([^"]*)"$/, (s, a: string, how: string, name: string) => {
  for (const n of D.neighbours(w(s), a)) {
    if (n === "B") continue;
    expect(D.ledgerOf(w(s), n, a).some((e) => e.name === name)).toBe(how === "gains");
  }
});

// DIPL-150, DIPL-152, D-DIPL-10
Given("the country {string} is a subject of {string} of the relation kind {string}", (s, a: string, b: string, kind: string) => void rel.makeSubject(g(s), a, b, kind));
Given(/^the country "([^"]*)" (borders|does not border) the country "([^"]*)"$/, (s, a: string, how: string, b: string) => {
  if (how === "borders") D.setBorder(w(s), a, b);
});
Then(/^"([^"]*)" is at war with "([^"]*)"$/, (s, a: string, b: string) => expect(rel.has(g(s), "at_war", a, b)).toBe(true));
Then(/^"([^"]*)" gets a call against "([^"]*)"$/, (s, a: string, b: string) => expect(callsTo(s, a).some((k) => k.via === "subject" && k.against === b)).toBe(true));
Then(/^"([^"]*)" stays out of the war$/, (s, a: string) => {
  expect(rel.has(g(s), "at_war", a, "A")).toBe(false);
  expect(callsTo(s, a)).toEqual([]);
});

// DIPL-115, D-DIPL-5
Given("the country {string} refused the demand of the country {string}", (s, b: string, a: string) => {
  w(s).lords.push({ name: "Calm lord", country: a, loyalty: "loyal", provinces: [] });
  D.demandRefused(w(s), a, b, "pay_tribute");
  s.pair = [a, b];
});
When("the country {string} declares war on {string} with the aim from the refusal", (s, a: string, b: string) => {
  act(s);
  s.war = D.declareWar(w(s), a, b, { aim: "tribute" });
});
Then("the lords of {string} who are not Warlike do not waver", (s, a: string) => {
  expect(s.war.provokedBy).toBe(s.pair[1]);
  expect(D.config.actions.demand.on_refusal.lords_not_warlike_waver).toBe(false);
  expect(w(s).lords.filter((l) => l.country === a && !l.warlike).every((l) => l.loyalty === "loyal")).toBe(true);
});
Then("offensive calls of {string} to its allies hold {string} at +{int}", (s, a: string, name: string, n: number) => {
  for (const ally of rel.alliesOf(g(s), a)) {
    const k = callsTo(s, ally)[0]!;
    expect(k.kind).toBe("offensive");
    const count = D.countAsk(w(s), { action: "call_to_arms", asker: a, asked: ally, callKind: "offensive", callTarget: k.against });
    expect(D.reasonNumber(count, name)).toBe(n);
  }
});
Then("the allies of {string} get no defensive call", (s, b: string) => {
  for (const ally of rel.alliesOf(g(s), b)) expect(callsTo(s, ally).some((k) => k.kind === "defensive")).toBe(false);
});

// DIPL-049, D-DIPL-13
Given("the country {string} has {int} provinces and knows {string}", (s, a: string, n: number, inv: string) => {
  c(s, a).provinces = n;
  c(s, a).inventions.push(inv);
});
When("the country {string} falls to {int} provinces", (s, a: string, n: number) => {
  act(s);
  D.setProvinceCount(w(s), a, n);
});
Given("the country {string} has residents in {string} since {string} and in {string} since {string} and an envoy on the road to {string}", (s, a: string, b: string, sb: string, x: string, sx: string, dd: string) => {
  for (const [t, since] of [[b, sb], [x, sx]] as const) {
    D.sendEnvoy(w(s), { country: a, target: t, action: "make_resident" });
    const e = w(s).envoys.find((e) => e.target === t)!;
    e.status = "resident";
    e.residentSince = since;
  }
  w(s).routes[D.pairKey(a, dd)] = { land: [{ kind: "land", units: 40 }] };
  D.sendEnvoy(w(s), { country: a, target: dd, action: "courtesy_visit" });
  s.sender = a;
});
Then("the resident in {string} is recalled", (s, t: string) => expect(w(s).envoys.find((e) => e.target === t)?.status).toBe("home"));
Then("the resident in {string} stays", (s, t: string) => expect(w(s).envoys.find((e) => e.target === t)?.status).toBe("resident"));
Then("the envoy to {string} finishes its mission", (s, t: string) => expect(w(s).envoys.find((e) => e.target === t)?.status).toBe("road"));

// DIPL-165
Then("only countries that know {string} may make residents", (s, inv: string) => {
  expect(D.config.envoys.resident.requires_invention).toBe(inv);
  expect(() => D.sendEnvoy(w(s), { country: "Castile", target: "Venice", action: "make_resident" })).toThrow();
  c(s, "Milan").inventions.push(inv);
  expect(() => D.sendEnvoy(w(s), { country: "Milan", target: "Venice", action: "make_resident" })).not.toThrow();
});
Then("the Italian states start knowing {string}", (_s, inv: string) => {
  const research = JSON.parse(readFileSync(new URL("../../rules/data/domain/research.json", import.meta.url), "utf8")) as { inventions: { id: string; start_regions?: string[] }[] };
  expect(research.inventions.find((x) => x.id === inv)?.start_regions).toContain("Italian states");
});

// DIPL-168, D-DIPL-11
Given("the allies {string} and {string} share a mobilisation pact", (s, a: string, b: string) => {
  addState(s, "alliance", a, b);
  D.markMobilisationPact(w(s), a, b);
});
When("the country {string} sends an offensive call to {string}", (s, a: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "call_to_arms", asker: a, asked: b, callKind: "offensive", callTarget: "Serbia" });
});
Then("the call holds +{int} for the pact", (s, n: number) => expect(D.reasonNumber(s.count, "Our mobilisation pact")).toBe(n));

// DIPL-174, D-DIPL-26
Given("the country {string} has {int} Lands taken", (s, a: string, n: number) => void (c(s, a).landsTaken = n));
When("an event adds notoriety {int} to {string}", (s, n: number, a: string) => {
  act(s);
  D.setBorder(w(s), a, "Border");
  c(s, a).seaZones = ["Adriatic"];
  c(s, "Seafarer").seaZones = ["Adriatic"];
  c(s, "Landlocked").seaZones = [];
  D.tradePactAgreed(w(s), a, "Trader");
  D.eventNotoriety(w(s), a, n);
});
Then("every country that shares a border, a sea zone or a trade pact with {string} gains the wrong {string} at {int} fading over {int} years", (s, a: string, name: string, n: number, y: number) => {
  for (const k of ["Border", "Seafarer", "Trader"]) {
    const e = D.ledgerOf(w(s), k, a).find((x) => x.name === name);
    expect(e?.weight).toBe(n);
    expect(e?.fadeYears).toBe(y);
  }
  expect(D.ledgerOf(w(s), "Landlocked", a).some((x) => x.name === name)).toBe(false);
});
Then("the Lands taken of {string} are still {int}", (s, a: string, n: number) => expect(c(s, a).landsTaken).toBe(n));
Then("the notoriety of {string} is {int}", (s, a: string, n: number) => expect(D.notoriety(w(s), a)).toBe(n));
Then("the notoriety of {string} never reads above {int}", (s, a: string, n: number) => {
  D.eventNotoriety(w(s), a, 100);
  expect(D.notoriety(w(s), a)).toBe(n);
});

// DIPL-132, D-DIPL-4
Given("the lord {string} of {string} is Warlike and wants a war with {string}", (s, lord: string, a: string, b: string) =>
  void w(s).lords.push({ name: lord, country: a, loyalty: "wavering", provinces: [], warlike: true, wantsWarWith: b }));
Then("the loyalty of {string} rises one step", (s, lord: string) => expect(w(s).lords.find((l) => l.name === lord)?.loyalty).toBe("loyal"));
Given("the stance between {string} and {string} is {string}", (s, a: string, b: string, t: string) => {
  rel.setStance(g(s), a, b, t);
  rel.setStance(g(s), b, a, t);
});

// DIPL-163, DIPL-164, D-DIPL-25
When("an event starts a league against {string} with only {string} in it", (s, x: string, m: string) => {
  act(s);
  D.eventEffect(w(s), "league", { target: x, holder: m });
});
Then("the league against {string} exists with {int} member", (s, x: string, n: number) => expect(D.leagueAgainst(w(s), x)?.members.length).toBe(n));
Given("the era is {string} and an event started a league against {string} with {string}", (s, era: string, x: string, m: string) => {
  w(s).era = era;
  c(s, x).landsTaken = 9;
  D.formLeague(w(s), x, [m, "Member 1"], "event");
  s.conqueror = x;
});

// DIPL-078, DIPL-079, DIPL-091
Then("the count holds the reason {string} at {int}", (s, name: string, n: number) => expect(D.reasonNumber(s.count, name)).toBe(n));
Given("the country {string} took {int} provinces bordering the country {string} in the last 20 years", (s, a: string, n: number, b: string) => {
  for (let i = 0; i < n; i++) D.province(w(s), `Frontier ${i}`, b).borders.push(b);
  D.provincesTaken(w(s), a, "Third", Array.from({ length: n }, (_, i) => `Frontier ${i}`));
});
Given("the Lands taken of {string} include {int} provinces bordering the country {string}", (s, a: string, n: number, b: string) => {
  for (let i = 0; i < n; i++) D.province(w(s), `Frontier ${i}`, b).borders.push(b);
  D.provincesTaken(w(s), a, "Third", Array.from({ length: n }, (_, i) => `Frontier ${i}`));
});
When("the country {string} asks the country {string} for anything", (s, a: string, b: string) => {
  act(s);
  s.counts = ["propose_alliance", "trade_pact", "swear_peace", "ask_passage", "arrange_marriage"].map((action) => D.countAsk(w(s), { action, asker: a, asked: b }));
  s.count = s.counts[0];
});

// DIPL-154, X-11
When(/^the countries "([^"]*)" and "([^"]*)" sign a peace that (is a white peace|pays gold only|moves a province|makes "[^"]*" a subject)$/, (s, a: string, b: string, terms: string) => {
  act(s);
  addState(s, "at_war", a, b);
  const months = D.truceMonthsAfterPeace({ white: terms === "is a white peace", landOrSubject: terms === "moves a province" || terms.startsWith("makes") });
  rel.makePeace(g(s), a, b, { truceMonths: months });
  s.pair = [a, b];
});
Then("their truce lasts until {string}", (s, m: string) => expect(rel.find(g(s), "truce", ...(s.pair as [string, string]))[0]?.expires_on?.slice(0, 7)).toBe(m));

// DIPL-040 … DIPL-042
Then("the rival stance may not change yet", (s) => expect(rel.rivalMayChange(g(s), ...(s.pair as [string, string]))).toBe(false));

// DIPL-126, D-DIPL-32
Given("the country {string} has {int} neighbours Hostile toward it or holding a claim on it", (s, b: string, n: number) => {
  for (let i = 0; i < n; i++) {
    D.setBorder(w(s), b, `Threat ${i}`);
    rel.setStance(g(s), `Threat ${i}`, b, "hostile");
  }
});
Given(/^the country "([^"]*)" (has|has not) pledged protection to "([^"]*)"$/, (s, a: string, how: string, b: string) => {
  if (how === "has") D.pledgeProtection(w(s), a, b);
});
Given("the country {string} has {int} castles", (s, b: string, n: number) => void (c(s, b).castles = n));
When("the country {string} offers overlordship to the country {string}", (s, a: string, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "offer_overlordship", asker: a, asked: b });
});
Then("the offer's own reasons total {int}", (s, n: number) => expect(D.ownTotal(s.count)).toBe(n));

// DIPL-143, D-DIPL-8
Given("the country {string} has the subject {string}", (s, b: string, sub: string) => void rel.makeSubject(g(s), sub, b, "vassal"));
Given(/^"([^"]*)" is (Hostile|Friendly) toward "([^"]*)"$/, (s, a: string, t: string, b: string) => void rel.setStance(g(s), a, b, t.toLowerCase()));
Given(/^"([^"]*)" asked "([^"]*)" for help$/, (s, sub: string, a: string) => void D.askForHelp(w(s), sub, a));

// DIPL-118, D-DIPL-21
Given(/^the country "([^"]*)" (refused passage to|revoked the passage of|never granted passage to) the country "([^"]*)"$/, (s, b: string, how: string, a: string) => {
  w(s).routes[D.pairKey(a, "Far")] = { land: [{ kind: "land", units: 5, crosses: [b] }] };
  if (how === "refused passage to") D.applyAnswer(w(s), { action: "ask_passage", asker: a, asked: b }, false);
  if (how === "revoked the passage of") {
    D.grantPassage(w(s), b, a);
    D.revokePassage(w(s), b, a);
  }
  s.pair = [a, b];
});
When("{int} months pass", (s, n: number) => {
  act(s);
  for (let i = 0; i < n; i++) D.advanceMonth(w(s));
});
Then(/^the envoys of "([^"]*)" (may|may not) cross "([^"]*)"$/, (s, a: string, how: string) => expect(D.envoyRoute(w(s), a, "Far").by === "land").toBe(how === "may"));

// DIPL-192, D-DIPL-19
Given("the ledger of {string} toward {string} holds entries totalling {int}", (s, a: string, b: string, n: number) => {
  for (let left = n; left !== 0; ) {
    const step = Math.max(-100, Math.min(100, left));
    D.addEntry(w(s), a, b, { key: `test${left}`, name: "Test", weight: step });
    left -= step;
  }
  s.pair = [a, b];
});
Then("the standing of {string} toward {string} reads {int}", (s, a: string, b: string, n: number) => expect(D.standing(w(s), a, b)).toBe(n));

// DIPL-193, D-DIPL-22
Given("the country {string} has an embargo on the country {string}", (s, a: string, b: string) => void D.declareEmbargo(w(s), a, b));
When("the country {string} lifts its embargo on {string}", (s, a: string, b: string) => attempt(s, () => D.liftEmbargo(w(s), a, b)));
Then("trade flows between {string} and {string}", (s, a: string, b: string) => expect(D.tradeAllowed(w(s), a, b)).toBe(true));
Given("the date is {string} and {string} and {string} share a mobilisation pact", (s, date: string, a: string, b: string) => {
  setDate(s, date);
  addState(s, "alliance", a, b);
  D.markMobilisationPact(w(s), a, b);
});
When("the country {string} unmarks the pact with {string}", (s, b: string, a: string) => attempt(s, () => D.unmarkMobilisationPact(w(s), b, a)));
Then("{string} and {string} share no mobilisation pact", (s, a: string, b: string) => expect(w(s).mobilisationPacts.includes(D.pairKey(a, b))).toBe(false));
Given("the country {string} pledged protection to {string}", (s, a: string, b: string) => void D.pledgeProtection(w(s), a, b));
When("the country {string} withdraws its pledge to {string}", (s, a: string, b: string) => attempt(s, () => D.withdrawPledge(w(s), a, b)));
When("the country {string} drops {string} as a rival", (s, a: string, b: string) => attempt(s, () => D.dropRival(w(s), a, b)));
Given(/^the country "([^"]*)" has (a resident in|an envoy on a mission to) "([^"]*)"$/, (s, a: string, how: string, b: string) => {
  if (how === "a resident in") c(s, a).inventions.push("G8");
  w(s).routes[D.pairKey(a, b)] = { land: [{ kind: "land", units: 40 }] };
  const e = D.sendEnvoy(w(s), { country: a, target: b, action: how === "a resident in" ? "make_resident" : "courtesy_visit" });
  if (how === "a resident in") {
    e.status = "resident";
    e.residentSince = D.monthOf(w(s).date);
  }
});
When("the country {string} recalls its envoy from {string}", (s, a: string, b: string) => attempt(s, () => D.recallEnvoy(w(s), a, b)));

// ---------------------------------------------------------------- worked example and card (DIPL-081 … DIPL-093, DIPL-184 … DIPL-187)

Given("the standing of {string} toward {string} is +{int} from {string}", (s, a: string, b: string, n: number, name: string) => {
  expect(D.standing(w(s), a, b)).toBe(n);
  expect(D.ledgerOf(w(s), a, b).some((e) => e.name.startsWith(name))).toBe(true);
});
Given("the soldiers of {string} with half its allies are between 1 and 2 times those of {string}", (s, a: string, b: string) => {
  const r = D.strength(w(s), a) / D.strength(w(s), b);
  expect(r > 1 && r < 2).toBe(true);
});
Given("the envoy of {string} is a {string} with {int} years served", (s, a: string, t: string, y: number) => void (s.envoyOf = { country: a, type: t, years: y }));
When("the envoy asks the country {string} for an alliance", (s, b: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: s.envoyOf.country, asked: b, envoy: { type: s.envoyOf.type, years: s.envoyOf.years } });
});
When("the player opens the country diplomacy card of {string}", (s, b: string) => {
  act(s);
  s.card = D.diplomacyCard(w(s), "Hungary", b);
});
Then("no action button shows a predicted answer or total", (s) => expect((s.card as ReturnType<typeof D.diplomacyCard>).buttons.every((x) => x.prediction === undefined)).toBe(true));
const EVERY_ASK = ["propose_alliance", "arrange_marriage", "demand", "ask_passage", "trade_pact", "swear_peace", "offer_overlordship", "ask_protection", "call_to_arms"];
When("any count is made", (s) => {
  act(s);
  s.counts = [];
  for (const posture of Object.keys(D.config.ai.posture)) {
    c(s, "B").posture = posture;
    c(s, "A").soldiers = 100000;
    c(s, "B").soldiers = 1000;
    for (const action of EVERY_ASK) s.counts.push(D.countAsk(w(s), { action, asker: "A", asked: "B", callKind: "defensive", callTarget: "A" }));
  }
});
Then("the personality reason is between -30 and +30", (s) => {
  for (const k of s.counts as D.Count[]) for (const r of k.reasons.filter((x) => x.kind === "posture")) expect(Math.abs(r.number)).toBeLessThanOrEqual(30);
});
When("any action is counted", (s) => {
  act(s);
  s.counts = EVERY_ASK.filter((a) => a !== "call_to_arms").map((action) => D.countAsk(w(s), { action, asker: "A", asked: "B" }));
});
Then("at most two reasons beyond the common reasons belong to that action", (s) => {
  // The strength rows of a demand (DIPL-087) are common to the binding asks, not the demand's own.
  const strengthRows = ["We cannot beat you", "We have strong friends"];
  for (const k of s.counts as D.Count[]) expect(k.reasons.filter((r) => r.own && r.kind !== "base" && !strengthRows.includes(r.name)).length).toBeLessThanOrEqual(k.ask.action === "offer_overlordship" ? 3 : 2);
});

Given("an envoy of {string} is on the road to {string}", (s, a: string, b: string) => {
  w(s).routes[D.pairKey(a, b)] = { land: [{ kind: "land", units: 40 }] };
  D.sendEnvoy(w(s), { country: a, target: b, action: "courtesy_visit" });
});
Given("the country {string} holds a war aim against {string}", (s, a: string, b: string) => void D.grantAim(w(s), { holder: a, target: b, aim: "punish", source: "test" }));
When(/^the diplomacy lens is at "(world|regional)" zoom$/, (s, zoom: "world" | "regional") => {
  act(s);
  s.marks = D.lensMarks(w(s), "Hungary", zoom);
});
Then("only the colours show", (s) => expect(s.marks).toEqual([]));
Then("the envoy rider and its dotted route show, and a crossed sword over {string}", (s, x: string) => {
  expect(s.marks).toContain("envoy rider to Venice");
  expect(s.marks).toContain("dotted route to Venice");
  expect(s.marks).toContain(`crossed sword over ${x}`);
});
When("the player taps {string} on the diplomacy lens", (s, b: string) => {
  act(s);
  start1444(s);
  addState(s, "at_war", b, "Ottomans");
  addState(s, "alliance", b, "Florence");
  D.letterOf(w(s), { to: "Hungary", from: b, action: "Alliance", answer: "no", reasons: [], total: -13 });
  D.advanceMonth(w(s));
  s.card = D.diplomacyCard(w(s), "Hungary", b);
});
Then("the card shows {string} and {string}", (s, x: string, y: string) => {
  expect(`Toward you: ${s.card.toward}`).toBe(x);
  expect(`You toward them: ${s.card.from}`).toBe(y);
});
Then("the card lists the tie {string} at +{int} and no wrongs", (s, name: string, n: number) => {
  expect(s.card.entries).toContainEqual({ name, weight: n });
  expect(s.card.entries.every((e: { weight: number }) => e.weight >= 0)).toBe(true);
});
Then("the card shows {string}", (s, text: string) => {
  const card = s.card as ReturnType<typeof D.diplomacyCard>;
  const lines = [card.status, `Your war aims on them: ${card.aims}`];
  expect(lines).toContain(text);
});
Then("the card shows {string} with a {string} button", (s, text: string, _b: string) => expect(`Last answer: ${s.card.lastAnswer}`).toBe(text));
Then("the action buttons show no prediction", (s) => expect((s.card as ReturnType<typeof D.diplomacyCard>).buttons.every((x) => x.prediction === undefined)).toBe(true));
Given("the last answer of {string} was {string} at {int}", (s, b: string, ans: string, n: number) => {
  s.reasons = [{ name: "Base (alliance)", number: -40 }, { name: "Other reasons", number: n + 40 }];
  D.letterOf(w(s), { to: "Hungary", from: b, action: "Alliance", answer: ans as "no", reasons: s.reasons, total: n });
  D.advanceMonth(w(s));
});
When("the player taps {string}", (s) => {
  act(s);
  s.letter = D.lettersReceived(w(s), "Hungary").at(-1);
});
Then("the full reasons list with every number is shown", (s) => expect(s.letter.reasons).toEqual(s.reasons));
When("the player taps {string} on the card of {string}", (s, _btn: string, b: string) => {
  act(s);
  c(s, "Hungary").officials.push({ name: "Judge Pál", type: "Judge", yearsServed: 3, province: "Buda" }, { name: "Steward Ján", type: "Steward", yearsServed: 1, province: "Pest" });
  s.picker = D.envoyPicker(w(s), "Hungary", b);
});
Then("the envoy picker shows each available official, the days on the road, and which province loses its official meanwhile", (s) => {
  expect(s.picker).toEqual([
    { official: "Judge Pál", days: 20, leaves: "Buda" },
    { official: "Steward Ján", days: 20, leaves: "Pest" },
  ]);
});
Given("the screen is in landscape", (s) => void (s.orientation = "landscape"));
When("the player opens the card of {string}", (s) => void act(s));
Then("the card sits on the right of the map instead of covering it", (s) => expect(D.cardPlacement(s.orientation)).toBe("right of the map"));

// ---------------------------------------------------------------- neighbours answer conquest (X-21)

Given(/^the country "([^"]*)" has notoriety (\d+)$/, (s, x: string, n: string) => {
  // Notoriety is 5 × Lands taken with no event notoriety (DIPL-174).
  c(s, x).landsTaken = Number(n) / 5;
  expect(D.notoriety(w(s), x)).toBe(Number(n));
});
When(/^the AI country "([^"]*)" counts an alliance with (\w+)$/, (s, a: string, x: string) => {
  act(s);
  s.count = D.countAsk(w(s), { action: "propose_alliance", asker: x, asked: a });
});
When(/^(\w+) counts joining a league against (\w+)$/, (s, a: string, x: string) => {
  act(s);
  s.count = D.aiLeagueCount(w(s), a, x, 0);
});
Then(/^the count has ([+−-])(\d+) for (\w+)'s notoriety$/, (s, sign: string, n: string) => {
  const want = (sign === "+" ? 1 : -1) * Number(n);
  expect(D.reasonNumber(s.count, "Notoriety") + D.reasonNumber(s.count, "X's notoriety")).toBe(want);
});
