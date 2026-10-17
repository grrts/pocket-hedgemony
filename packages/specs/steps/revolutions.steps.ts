import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { Rng } from "@ph/engine";
import * as E from "@ph/engine/domain/events";
import * as G from "@ph/engine/domain/government";
import * as Rb from "@ph/engine/domain/rebellions";
import * as V from "@ph/engine/domain/revolutions";

const { Given, When, Then } = steps("revolutions");

// ---------------------------------------------------------------- helpers

/** "France" → "france", "Harsh lord" → "harsh_lord". */
const key = (name: string): string => name.trim().toLowerCase().replace(/[\s-]+/g, "_");
/** "a", "b" and "c" / "a, b, c" → ["a", "b", "c"]. */
const quoted = (text: string): string[] => [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
const list = (text: string): string[] => (text.trim() === "none" ? [] : text.split(",").map((x) => x.trim()).filter(Boolean));
const exact = (text: string): RegExp => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

/** The data's layer build, made once (read-only uses). */
let dataBuild: V.LayerBuild | undefined;
const built = (): V.LayerBuild => (dataBuild ??= V.buildLayer());

function rs(s: Scenario): V.RevoState {
  return (s.rs ??= V.newRevoState(E.emptyWorld(1789)));
}
function w(s: Scenario): E.World {
  return rs(s).es.world;
}
function rng(s: Scenario): Rng {
  return (s.rng ??= new Rng(11));
}
function act(s: Scenario): void {
  s.acted = true;
}
/** A country with ten provinces. */
function realm(s: Scenario, name: string): string {
  const id = key(name);
  const c = E.country(w(s), id);
  c.exists = true;
  provinces(s, id, 10);
  s.country ??= id;
  return id;
}
/** Makes sure a country owns at least n provinces (`province:<country>_<i>`). */
function provinces(s: Scenario, id: string, n: number): string[] {
  const have = V.provincesOf(rs(s), id);
  for (let i = have.length; i < n; i++) {
    const p = E.place(w(s), `province:${id}_${i + 1}`);
    p.owner = id;
  }
  return V.provincesOf(rs(s), id);
}
function monarchy(s: Scenario, name: string): string {
  const id = realm(s, name);
  V.setForm(rs(s), id, "absolute_monarchy");
  return id;
}
function lords(s: Scenario, id: string, loyalties: V.Loyalty[], traits: string[][] = []): V.Lord[] {
  const ps = V.provincesOf(rs(s), id);
  const made = loyalties.map((loyalty, i) => ({ id: `${id}_lord_${i + 1}`, loyalty, provinces: ps[i] ? [ps[i]!] : [], retinue: 100, traits: traits[i] ?? [] }));
  rs(s).lords[id] = made;
  return made;
}
function rev(s: Scenario, id?: string): V.Revolution {
  return V.revolution(id ?? s.rev);
}
function track(s: Scenario, id?: string, country?: string): V.Track {
  return V.trackOf(rs(s), id ?? s.rev, country ?? s.country);
}
/** Runs f as if one month earlier (so a sign lit before this turn has been seen). */
function monthBefore(s: Scenario, f: () => void): void {
  const world = w(s);
  const [y, m] = [world.year, world.month];
  world.month -= 1;
  if (world.month < 1) {
    world.month = 12;
    world.year -= 1;
  }
  f();
  world.year = y;
  world.month = m;
}

const NUM = (op: string, v: number, frac: boolean): number => {
  const d = frac ? 0.01 : 1;
  return op === ">" ? v + d : op === "<" ? v - d : v;
};

/** Changes the world so a condition holds (signs and requirements of the data). */
function satisfy(s: Scenario, c: E.Condition, roles: Record<string, string[]>): void {
  if ("all" in c) return (c.all as E.Condition[]).forEach((x) => satisfy(s, x, roles));
  if ("any" in c) return satisfy(s, (c.any as E.Condition[])[0]!, roles);
  if ("not" in c) return;
  if ("at_least" in c) {
    const a = c.at_least as { n: number; of: E.Condition[] };
    return a.of.slice(0, a.n).forEach((x) => satisfy(s, x, roles));
  }
  const r = rs(s);
  const world = w(s);
  const [type, p] = E.leaf(c);
  const who = p.who === undefined ? [] : E.resolve(p.who, { roles });
  const op = String(p.op ?? ">=");
  const v = Number(p.value ?? 0);
  const frac = !Number.isInteger(v);
  const holder = (id: string) => world.countries[id] ?? E.place(world, id);
  switch (type) {
    case "stat":
      for (const id of who) holder(id).stats[String(p.stat)] = NUM(op, v, frac);
      return;
    case "ideology":
      for (const id of who) (holder(id).ideologies ??= {})[String(p.id)] = Math.min(1, NUM(op, v, true));
      return;
    case "grievance":
      for (const id of who) {
        const ps = world.countries[id] ? provinces(s, id, 10) : V.provincesOf(r, id);
        const k = Math.min(ps.length, op === ">" ? Math.floor(v * ps.length) + 1 : Math.ceil(v * ps.length - 1e-9));
        for (const pr of ps.slice(0, k)) if (!V.grievancesIn(r, pr).includes(String(p.id))) V.grievancesIn(r, pr).push(String(p.id));
      }
      return;
    case "lords":
      for (const id of who) {
        const ps = provinces(s, id, 10);
        const have = r.lords[id] ?? [];
        if (p.measure === "land_share") {
          const k = Math.ceil(NUM(op, v, true) * ps.length - 1e-9);
          r.lords[id] = [...have, { id: `${id}_landed`, loyalty: "loyal", provinces: ps.slice(0, k), retinue: 100 }];
        } else {
          const loyalty: V.Loyalty = p.measure === "disloyal_or_worse" ? "disloyal" : p.measure === "count" ? "loyal" : "wavering";
          const n = Math.ceil(NUM(op, v, false));
          r.lords[id] = [...have, ...Array.from({ length: n }, (_, i) => ({ id: `${id}_${String(p.measure)}_${i}`, loyalty, retinue: 50 }))];
        }
      }
      return;
    case "class_share":
      for (const id of who) r.classes[id] = { ...(r.classes[id] ?? {}), [String(p.class)]: Math.round(NUM(op, v, true) * 1000), other: Math.round((1 - NUM(op, v, true)) * 1000) };
      return;
    case "war_lost":
      for (const id of who) r.peaces.push({ who: id, at: E.now(world) - 6, side: "loser", terms: "land" });
      return;
    case "flag":
      for (const id of p.who === undefined ? ["global"] : who) {
        if (world.countries[id]) (world.countries[id]!.flags ??= []).push(String(p.id));
        else world.flags.push({ on: id, id: String(p.id) });
      }
      return;
    case "event":
      world.history.push({ event: String(p.id), year: world.year - 1, month: world.month, roles: {} });
      return;
    case "at_war":
      for (const id of who) (E.country(world, id).enemies ??= []).push(p.other === undefined ? "enemy" : E.resolve(p.other, { roles })[0]!);
      return;
    case "government":
      for (const id of who) E.country(world, id).government = String(p.is);
      return;
    case "religion":
      for (const id of who) holder(id).religion = String(p.is);
      return;
    case "religion_share":
      (E.place(world, String(p.where)).religionShares ??= {})[String(p.religion)] = NUM(op, v, true);
      return;
    case "period_active":
      world.periods.push(String(p.id));
      return;
    case "owns":
    case "controls": {
      const area = E.place(world, String(p.where));
      if (!area.provinces?.length) area.provinces = [`province:${String(p.where).replace(/^\w+:/, "")}_1`];
      for (const pr of area.provinces) {
        const pl = E.place(world, pr);
        pl.owner = who[0]!;
        pl.controller = who[0]!;
      }
      return;
    }
    case "exists":
      for (const id of who) E.country(world, id).exists = true;
      return;
    case "rebels_active":
      for (const id of who) (E.country(world, id).rebels ??= []).push(String(p.type ?? "any"));
      return;
    case "colonial_presence":
      for (const id of who) (E.country(world, id).colonies ??= {})[String(p.where)] = NUM(op, v, false);
      return;
    case "relation":
      for (const id of who) (E.country(world, id).relations ??= []).push({ other: E.resolve(p.other, { roles })[0]!, type: String(p.type) });
      return;
    default:
      throw new Error(`The steps cannot light a ${type} condition`);
  }
}

/** Changes the world so a sign goes dark again. */
function darken(s: Scenario, c: E.Condition, roles: Record<string, string[]>): void {
  if ("all" in c || "any" in c) return ((c.all ?? c.any) as E.Condition[]).forEach((x) => darken(s, x, roles));
  const r = rs(s);
  const world = w(s);
  const [type, p] = E.leaf(c);
  const who = p.who === undefined ? [] : E.resolve(p.who, { roles });
  const op = String(p.op ?? ">=");
  const v = Number(p.value ?? 0);
  const away = op.startsWith(">") ? v - 1 : v + 1;
  for (const id of who) {
    if (type === "stat") (world.countries[id] ?? E.place(world, id)).stats[String(p.stat)] = away;
    else if (type === "ideology") (E.country(world, id).ideologies ??= {})[String(p.id)] = 0;
    else if (type === "grievance") for (const pr of V.provincesOf(r, id)) r.grievances[pr] = V.grievancesIn(r, pr).filter((g) => g !== p.id);
    else if (type === "lords") r.lords[id] = [];
    else throw new Error(`The steps cannot darken a ${type} condition`);
  }
}

/** Lights the first n signs of a revolution (and its requirements) for a country. */
function light(s: Scenario, id: string, country: string, n: number, requirements = true): void {
  s.rev = id;
  s.country = country;
  const roles = V.rolesFor(rs(s), id, country);
  if (requirements) for (const c of rev(s, id).requirements) satisfy(s, c, roles);
  const list = rev(s, id).signs!.list;
  for (const sign of list.slice(0, n)) satisfy(s, sign.if, roles);
  expect(V.litCount(rs(s), id, country), `lit signs of ${id}`).toBe(n);
}
/** Lights n signs and lets the revolution see them before this turn. */
function litBefore(s: Scenario, id: string, country: string, n: number): void {
  light(s, id, country, n);
  monthBefore(s, () => V.evaluate(rs(s), id, country));
}
function card(s: Scenario): V.Card {
  return V.card(rs(s), s.rev, s.country);
}
/** Fires a revolution for a country (no answer yet). */
function fire(s: Scenario, id: string, country: string, lit = true): void {
  s.rev = id;
  s.country = country;
  if (id === "french_revolution") {
    lords(s, country, ["loyal", "wavering", "disloyal", "loyal"], [[], [], ["Ambitious"], ["Pious"]]);
    if (lit) light(s, id, country, 6);
  } else for (const c of rev(s, id).requirements) satisfy(s, c, V.rolesFor(rs(s), id, country));
  s.litBefore = V.signs(rs(s), id, country).filter((x) => x.lit).map((x) => x.sign.label);
  V.breakOut(rs(s), id, country);
}
function take(s: Scenario, option: string, stance?: string): void {
  if (stance) expect(rev(s).stances[option]).toBe(stance);
  s.litBefore = V.signs(rs(s), s.rev, s.country).filter((x) => x.lit).map((x) => x.sign.label);
  s.taken = V.takeOption(rs(s), s.rev, s.country, option);
  act(s);
}
function tagged(s: Scenario): V.TaggedRising {
  const t = rs(s).risings.find((x) => x.revolution === s.rev && x.country === s.country);
  expect(t, `a rising tagged ${s.rev}`).toBeDefined();
  return t!;
}
function firstOfFamily(fam: string): string {
  return Object.entries(V.revolutions).find(([, r]) => r.family === fam)![0];
}

// ---------------------------------------------------------------- the card (REVO-001 … REVO-006)

Given("the revolution {string} needs {int} of {int} signs and warns at {int}", (s, id: string, need: number, of: number, warn: number) => {
  s.rev = id;
  expect(rev(s).signs).toMatchObject({ need, warn_at: warn });
  expect(rev(s).signs!.list).toHaveLength(of);
});
Given("the revolution {string} requires its country to be a monarchy", (s, id: string) => {
  expect(rev(s, id).requirements).toContainEqual({ government: { who: rev(s, id).country, is: "monarchy" } });
});
Given(/^the country "([^"]+)" is an? ([a-z ]+)$/, (s, name: string, what: string) => {
  if (what === "monarchy") monarchy(s, name);
  else V.setForm(rs(s), realm(s, name), G.formIdFromName(what));
  s.country = key(name);
});
Given("the country {string} has debt above {int} gold", (s, name: string, n: number) => {
  E.country(w(s), realm(s, name)).stats.debt = n + 100;
});
Given("a quarter of the people of {string} want a constitution", (s, name: string) => {
  (E.country(w(s), realm(s, name)).ideologies ??= {}).liberalism = 0.25;
});
Given("the crown of {string} is distrusted", (s, name: string) => {
  E.country(w(s), realm(s, name)).stats.stability = -1;
});
When("the turn's signs are evaluated", (s) => {
  V.evaluateAll(rs(s));
  act(s);
});
Then("the country screen of {string} shows the card {string} as {string}", (s, name: string, title: string, stage: string) => {
  const id = Object.keys(V.revolutions).find((k) => V.card(rs(s), k, key(name)).title === title)!;
  s.rev = id;
  s.country = key(name);
  expect(card(s).shown).toBe(true);
  expect(card(s).stage.toLowerCase()).toBe(stage);
});
Then("the card says {string}", (s, text: string) => {
  expect(card(s).breaksOut).toBe(text);
});
Then("no card for {string} is shown for {string}", (s, id: string, name: string) => {
  V.evaluate(rs(s), id, key(name));
  expect(V.card(rs(s), id, key(name)).shown).toBe(false);
});
Given("no sign of {string} is lit for {string}", (s, id: string, name: string) => {
  expect(V.litCount(rs(s), id, realm(s, name))).toBe(0);
});
Given("{int} signs of {string} are lit for {string}", (s, n: number, id: string, name: string) => {
  litBefore(s, id, monarchy(s, name), n);
});
Then("the card's bar is {string}", (s, colour: string) => {
  expect(card(s).colour).toBe(colour);
});
Given("the card {string} is shown for {string}", (s, id: string, name: string) => {
  light(s, id, monarchy(s, name), 1);
  expect(card(s).shown).toBe(true);
});
When("the player opens {string}", (s, what: string) => {
  expect(what).toBe("What happens if it breaks out");
  s.preview = V.preview(rs(s), s.rev);
  act(s);
});
Then("the stances are listed with the regime each leads to", (s) => {
  for (const p of s.preview as V.Preview[]) expect(p.regimes.length + p.won.length + p.crushed.length).toBeGreaterThan(0);
});
const previewOf = (s: Scenario, label: string): V.Preview => {
  const p = (s.preview as V.Preview[]).find((x) => x.label === label);
  expect(p, label).toBeDefined();
  return p!;
};
Then("{string} leads to the regime {string}", (s, label: string, regime: string) => {
  expect(previewOf(s, label).regimes).toEqual([regime]);
});
Then("{string} leads to the regimes {string} and {string}", (s, label: string, a: string, b: string) => {
  expect(previewOf(s, label).regimes).toEqual([a, b]);
});
Then("{string} leads to a rising that ends in {string} if won or {string} if crushed", (s, label: string, won: string, crushed: string) => {
  const p = previewOf(s, label);
  expect(p.rising).toBe(true);
  expect(p.won).toEqual([won]);
  expect(p.crushed).toEqual([crushed]);
});

// ---------------------------------------------------------------- stages (REVO-007 … REVO-009)

Given(
  /^the country "([^"]+)" (does not meet the requirements|meets the requirements with no sign lit|meets the requirements with \d+ signs lit|has just had the event fire|is fighting the rising its Fight option raised|has just seen that rising won or crushed|has had the regime applied)$/,
  (s, name: string, situation: string) => {
    const n = /(\d+) signs/.exec(situation)?.[1];
    const id = "french_revolution";
    s.rev = id;
    if (situation.startsWith("does not")) {
      const c = realm(s, name);
      V.setForm(rs(s), c, "merchant_republic");
      light(s, id, c, 2, false);
      return;
    }
    const c = monarchy(s, name);
    s.country = c;
    if (situation.includes("no sign")) return;
    if (n) return light(s, id, c, Number(n));
    fire(s, id, c);
    if (situation.includes("fighting") || situation.includes("won or crushed")) take(s, "royal_reaction");
    if (situation.includes("won or crushed")) V.settle(rs(s), tagged(s), "won");
    if (situation.includes("regime applied")) take(s, "radical_republic");
    s.acted = false;
  },
);
When("the turn is processed", (s) => {
  s.turnLog = V.processTurn(rs(s), rng(s));
  act(s);
});
Then("the revolution {string} is at the stage {string} for {string}", (s, id: string, stage: string, name: string) => {
  V.evaluate(rs(s), id, key(name));
  expect(track(s, id, key(name)).stage).toBe(stage);
});
Given("the revolution {string} is Ready for {string}", (s, id: string, name: string) => {
  litBefore(s, id, monarchy(s, name), rev(s, id).signs!.need);
});
Given("the revolution {string} is Ready for {string} with {int} signs lit", (s, id: string, name: string, n: number) => {
  litBefore(s, id, monarchy(s, name), n);
  expect(track(s).stage).toBe("Ready");
});
Given("the event {string} has a mean wait of {int} years", (s, id: string, years: number) => {
  expect(V.eventOf(rs(s), id).selection.mean_years).toBe(years);
});
Given("the event {string} has happened", (s, id: string) => {
  w(s).history.push({ event: id, year: w(s).year - 3, month: 1, roles: {} });
});
When("the month's selection roll is made", (s) => {
  expect(V.mayBreakOut(rs(s), s.rev, s.country)).toBe(true);
  s.chance = V.chance(rs(s), s.rev, s.country);
  act(s);
});
Then("the chance is based on {int} years and multiplied by {int}", (s, years: number, mult: number) => {
  expect(s.chance.base).toBeCloseTo(E.baseChance(years * E.preset(rs(s).es.rules.mode).mean_years_mult));
  expect(s.chance.modifiers).toBe(mult);
  expect(s.chance.chance).toBeCloseTo(s.chance.base * mult * s.chance.boost * s.chance.optional);
});
Given("the country {string} has {int} signs of {string} lit", (s, name: string, n: number, id: string) => {
  litBefore(s, id, monarchy(s, name), n);
  expect(track(s).stage).toBe("Brewing");
});
When("a fourth sign lights this turn", (s) => {
  satisfy(s, rev(s).signs!.list[3]!.if, V.rolesFor(rs(s), s.rev, s.country));
  s.turnLog = V.processTurn(rs(s), rng(s));
  act(s);
});
Then("the event {string} does not fire this turn", (s, id: string) => {
  expect(w(s).history.some((h) => h.event === id)).toBe(false);
  expect((s.turnLog as E.DomainEvent[]).some((l) => l.type === "RevolutionRolled" && l.revolution === id)).toBe(false);
  expect(V.whyNot(rs(s), id, s.country)).toBe("same turn");
});
Then("the card shows {string} in red", (s, line: string) => {
  expect(card(s).colour).toBe("red");
  expect(card(s).readyLine).toBe(line);
});
When("the player opens the castle stores so that {string} goes dark", (s, label: string) => {
  const sign = rev(s).signs!.list.find((x) => x.label === label)!;
  darken(s, sign.if, V.rolesFor(rs(s), s.rev, s.country));
  V.evaluate(rs(s), s.rev, s.country);
  act(s);
});
Then("the event {string} no longer rolls", (s, id: string) => {
  expect(V.mayBreakOut(rs(s), id, s.country)).toBe(false);
  const log = V.processTurn(rs(s), rng(s));
  expect(log.some((l) => l.type === "RevolutionRolled" && l.revolution === id)).toBe(false);
});

// ---------------------------------------------------------------- requirements, signs and sparks (REVO-010 … REVO-017)

Given("the revolution {string} has {int} requirement(s), {int} signs with need {int} and {int} sparks", (s, id: string, req: number, n: number, need: number, sparks: number) => {
  s.rev = id;
  expect(rev(s).requirements).toHaveLength(req);
  expect(rev(s).signs).toMatchObject({ need });
  expect(rev(s).signs!.list).toHaveLength(n);
  expect(rev(s).sparks.filter((x) => !x.foreign_backing)).toHaveLength(sparks);
});
When("the revolution layer is built", (s) => {
  s.build = built();
  act(s);
});
Then("the event's trigger is all of the requirement and at least {int} of the {int} sign conditions", (s, need: number, n: number) => {
  const t = (s.build as V.LayerBuild).patch[s.rev]!.trigger as { all: E.Condition[] };
  expect(t.all.slice(0, -1)).toEqual(rev(s).requirements);
  expect(t.all.at(-1)).toEqual({ at_least: { n: need, of: rev(s).signs!.list.map((x) => x.if) } });
  expect((t.all.at(-1)!.at_least as { of: unknown[] }).of).toHaveLength(n);
});
Then("the event's selection has one modifier per spark", (s) => {
  const mods = (s.build as V.LayerBuild).patch[s.rev]!.selection.modifiers!;
  expect(mods).toEqual(rev(s).sparks.map((x) => ({ if: x.if, mult: x.mult })));
});
Then("the event's selection has the spark {string} with multiplier {int}", (s, label: string, mult: number) => {
  const spark = rev(s).sparks.find((x) => x.label === label)!;
  expect(spark.foreign_backing).toBe(true);
  expect((s.build as V.LayerBuild).patch[s.rev]!.selection.modifiers).toContainEqual({ if: spark.if, mult });
});
Given("the country {string} has {int} provinces", (s, name: string, n: number) => {
  const id = key(name);
  E.country(w(s), id);
  provinces(s, id, n);
});
Given("{int} provinces of {string} have the grievance {string}", (s, n: number, name: string, g: string) => {
  for (const p of V.provincesOf(rs(s), key(name)).slice(0, n)) V.grievancesIn(rs(s), p).push(g);
});
/** "grievance who France id hungry >= 0.2" → a condition leaf; country names become ids. */
function parseLeaf(text: string): E.Condition {
  const [type, ...rest] = text.trim().split(/\s+/);
  const p: Record<string, unknown> = {};
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i]!;
    if (["<", "<=", ">", ">=", "=="].includes(t)) {
      p.op = t;
      p.value = Number(rest[++i]);
    } else {
      const v = rest[++i]!;
      p[t] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : t === "who" || t === "on" ? key(v) : v;
    }
  }
  return { [type!]: p };
}
When("the condition {string} is evaluated", (s, text: string) => {
  const c = parseLeaf(text);
  s.condition = c;
  const [type, p] = E.leaf(c);
  if (type === "lords" && p.op === undefined) s.value = V.lordsMeasure(rs(s), String(p.who), String(p.measure));
  s.result = E.holds(c, w(s), { roles: {}, ...(rs(s).es.conditions ? { conditions: rs(s).es.conditions } : {}) });
  act(s);
});
Then(/^it is (true|false)$/, (s, v: string) => {
  expect(s.result).toBe(v === "true");
});
Given("{int} percent of the people of {string} are craftsmen", (s, n: number, name: string) => {
  rs(s).classes[key(name)] = { craftsmen: n, farmers: 100 - n };
});
Given("the country {string} has {int} provinces, {int} held by lords", (s, name: string, n: number, held: number) => {
  const id = key(name);
  E.country(w(s), id);
  const ps = provinces(s, id, n);
  rs(s).lords[id] = ps.slice(0, held).map((p, i) => ({ id: `${id}_lord_${i + 1}`, loyalty: "loyal", provinces: [p] }));
});
Given("the lords of {string} have the loyalties {string}", (s, name: string, text: string) => {
  const ls = rs(s).lords[key(name)]!;
  list(text).forEach((l, i) => (ls[i]!.loyalty = key(l) as V.Loyalty));
});
Then(/^its value is ([\d.]+)$/, (s, v: string) => {
  expect(s.value).toBeCloseTo(Number(v));
});
Given(/^the country "([^"]+)" made peace on the losing side (\d+) years ago by (giving land|paying|being made a subject)$/, (s, name: string, years: string, how: string) => {
  const terms = how === "giving land" ? "land" : how === "paying" ? "paid" : "subject";
  rs(s).peaces.push({ who: key(name), at: E.now(w(s)) - Number(years) * 12, side: "loser", terms });
});
Given("the event {string} is available from {int} to {int}", (s, id: string, a: number, b: number) => {
  expect(V.eventOf(rs(s), id).availability).toMatchObject({ earliest: a, latest: b });
});
Given("the date is {int}", (s, year: number) => {
  w(s).year = year;
  w(s).month = 1;
});
Given("every sign of {string} is lit for {string}", (s, id: string, name: string) => {
  litBefore(s, id, monarchy(s, name), rev(s, id).signs!.list.length);
});
Then("the revolution {string} cannot break out", (s, id: string) => {
  expect(V.whyNot(rs(s), id, s.country)).toBe("outside years");
  expect(w(s).history.some((h) => h.event === id)).toBe(false);
});
Given("the revolution {string} has keep_trigger true", (s, id: string) => {
  s.rev = id;
  expect(rev(s).keep_trigger).toBe(true);
});
Then("the event {string} keeps its existing trigger", (s, id: string) => {
  const t = (s.build as V.LayerBuild).patch[id]!.trigger;
  expect(t).toEqual(V.revolutionEvents[id]!.trigger);
  expect(t).not.toBeNull();
  expect(V.threshold(V.revolution(id))).toBe("its existing trigger");
});

// ---------------------------------------------------------------- stances (REVO-018 … REVO-025)

Given("the revolution {string} of the family {string}", (s, id: string, fam: string) => {
  s.rev = id;
  expect(rev(s).family).toBe(fam);
});
When("the event fires for {string}", (s, name: string) => {
  fire(s, s.rev, monarchy(s, name));
  s.options = V.stanceOptions(rs(s), s.rev, V.rolesFor(rs(s), s.rev, s.country));
  act(s);
});
Then("it offers between {int} and {int} options", (s, a: number, b: number) => {
  expect(s.options.length).toBeGreaterThanOrEqual(a);
  expect(s.options.length).toBeLessThanOrEqual(b);
  for (const o of s.options as V.StanceOption[]) expect(["lead", "bend", "fight", "path"]).toContain(o.stance);
});
Then("the options are labelled {string}, {string} and {string}", (s, a: string, b: string, c: string) => {
  expect((s.options as V.StanceOption[]).map((o) => o.label)).toEqual([a, b, c]);
});
Then("exactly one option is marked historical", (s) => {
  expect((s.options as V.StanceOption[]).filter((o) => o.historical)).toHaveLength(1);
});
Given("the event {string} fires for {string}", (s, id: string, name: string) => {
  const c = id === "french_revolution" ? monarchy(s, name) : realm(s, name);
  fire(s, id, c);
  // A revolution whose options are all paths is not the ruler's choice: it takes its historical path.
  if (Object.values(rev(s).stances).every((x) => x === "path")) {
    const hist = V.eventOf(rs(s), id).options.find((o) => o.historical)!;
    take(s, hist.id);
  }
});
Given("{string} takes the option {string} with the stance {string}", (s, name: string, option: string, stance: string) => {
  expect(key(name)).toBe(s.country);
  take(s, option, stance);
});
Then("the regime {string} applies to {string} at once", (s, id: string, name: string) => {
  const h = V.holding(rs(s), key(name));
  expect(h.regime).toBe(id);
  expect(h.appliedAt[id]).toBe(E.now(w(s)));
  expect(track(s).stage).toBe("Aftermath");
});
Then("no revolution rising is raised", (s) => {
  expect(rs(s).risings).toHaveLength(0);
  expect(w(s).rebels.filter((x) => x.revolution)).toHaveLength(0);
});
Then("the lords and clergy the regime hurts may rise as the old order camp", (s) => {
  const camp = V.oldOrderCamp(rs(s), s.rev, s.country);
  expect(camp.lords.length).toBeGreaterThan(0);
  expect(camp.clergy).toMatch(/clergy/i);
  expect(V.regime("revolutionary_republic").lords).toMatch(/abolished/i);
});
Then("the regimes {string} and {string} apply to {string}", (s, a: string, b: string, name: string) => {
  const h = V.holding(rs(s), key(name));
  expect(h.regime).toBe(a);
  expect(h.addOns).toContain(b);
});
Then("some signs of {string} end", (s, id: string) => {
  const now = V.signs(rs(s), id, s.country).filter((x) => x.lit).map((x) => x.sign.label);
  expect(now.length).toBeLessThan(s.litBefore.length);
  expect(now.length).toBeGreaterThan(0);
});
Then("the revolution {string} re-arms", (s, id: string) => {
  const t = track(s, id);
  expect(t.rearmed).toBe(true);
  expect(t.rearmedAt).toBe(E.now(w(s)));
  expect(rs(s).log.some((l) => l.type === "RevolutionRearmed" && l.revolution === id)).toBe(true);
});
Given("a rising tagged {string} is raised in {string}", (s, id: string, name: string) => {
  expect(rs(s).risings.some((t) => t.revolution === id && t.country === key(name) && t.rising.provinces.length > 0)).toBe(true);
  expect(w(s).rebels.some((x) => x.revolution === id)).toBe(true);
  expect(track(s).stage).toBe("Struggle");
});
When(/^the tagged rising is (won|crushed)$/, (s, outcome: "won" | "crushed") => {
  V.settle(rs(s), tagged(s), outcome);
  act(s);
});
Then("the regime {string} applies to {string}", (s, id: string, name: string) => {
  if (!s.acted) {
    // As an action (regimes, aftermath): the regime effect applies.
    const c = s.country && key(name) === s.country ? s.country : realm(s, name);
    seedGrievances(s, c);
    s.country = c;
    E.applyEffect({ regime: { on: c, id } }, w(s), V.ctxFor(rs(s), {}));
    act(s);
    return;
  }
  expect(V.holding(rs(s), key(name)).regime).toBe(id);
});
Given("a rising tagged {string} in {string} is crushed", (s, id: string, name: string) => {
  fire(s, id, monarchy(s, name));
  take(s, "royal_reaction");
  s.acted = false;
});
When("the settlement is applied", (s) => {
  s.litBefore = V.signs(rs(s), s.rev, s.country).filter((x) => x.lit).map((x) => x.sign.label);
  V.settle(rs(s), tagged(s), "crushed");
  act(s);
});
Then("provinces of {string} get the grievance {string}", (s, name: string, g: string) => {
  const ps = V.provincesOf(rs(s), key(name));
  expect(ps.length).toBeGreaterThan(0);
  for (const p of ps) expect(V.grievancesIn(rs(s), p)).toContain(key(g));
});
Then("the signs of {string} that were lit stay lit", (s, id: string) => {
  const now = V.signs(rs(s), id, s.country).filter((x) => x.lit).map((x) => x.sign.label);
  for (const l of s.litBefore as string[]) expect(now).toContain(l);
});
Given("the event {string} fires", (s, id: string) => {
  const r = rev(s, id);
  const country = V.eventOf(rs(s), id).roles[V.roleOf(r)]!.historical[0]!;
  E.country(w(s), country).exists = true;
  fire(s, id, country);
});
When("its chooser picks the option {string} with the stance {string}", (s, option: string, stance: string) => {
  take(s, option, stance);
});
When("its chooser picks the option {string}", (s, option: string) => {
  take(s, option);
});
Then("the regime {string} applies to {string} {int} years later", (s, id: string, who: string, years: number) => {
  for (let m = 1; m <= years * 12; m++) {
    expect(V.holding(rs(s), who).regime, `month ${m}`).toBeUndefined();
    E.nextMonth(w(s));
    E.tick(rs(s).es);
  }
  expect(V.holding(rs(s), who).regime).toBe(id);
});

// ---------------------------------------------------------------- camps (REVO-026 … REVO-031)

function campRising(s: Scenario, fam: string): V.TaggedRising {
  const id = firstOfFamily(fam);
  const t: V.TaggedRising = { revolution: id, country: "testland", option: "x", roles: {}, rising: Rb.newRising(`${id}:testland:0`, "New ideas", "province:testland_1"), castles: [] };
  rs(s).risings.push(t);
  s.tagged = t;
  s.family = fam;
  return t;
}
Given(/^a rising tagged with a revolution of the family "([^"]+)" grows in a (hungry )?province$/, (s, fam: string, hungry: string | null) => {
  campRising(s, fam);
  s.hungry = !!hungry;
  s.classes = {};
});
Given("a rising tagged with a revolution of the family {string}", (s, fam: string) => {
  campRising(s, fam);
});
Given("the province has {int} men of the class {string}", (s, n: number, cls: string) => {
  s.classes[cls] = n;
});
Given("the province has {int} farmers", (s, n: number) => {
  s.classes.farmers = n;
});
Given("the province's homeless are of another faith than the movement", (s) => {
  s.classes.homeless = 1000;
  s.sameFaith = false;
});
When("the month is processed", (s) => {
  if (s.classes) s.joined = V.musterCamp(s.tagged, s.classes, { hungry: s.hungry, ...(s.sameFaith === false ? { sameFaith: false } : {}) });
  act(s);
});
Then("{int} men of the class {string} join the revolution camp", (s, n: number, cls: string) => {
  expect(s.joined[cls] ?? 0).toBe(n);
});
Then("{int} farmers join the revolution camp", (s, n: number) => {
  expect(s.joined.farmers ?? 0).toBe(n);
});
Then("the rebellions join table is not used for that rising", (s) => {
  expect(V.joinTableFor(rs(s), s.tagged.rising.id)).toBe("camps");
  expect(V.joinTableFor(rs(s), "an ordinary rising")).toBe("rebellions");
});
Then("none of those homeless join the revolution camp", (s) => {
  expect(s.joined.homeless ?? 0).toBe(0);
  expect(V.joiners(s.family, "homeless", 1000, { sameFaith: true })).toBe(300);
});
When("the camps are formed", (s) => {
  act(s);
});
const lord = (loyalty: V.Loyalty, more: Partial<V.Lord> = {}): V.Lord => ({ id: "l", loyalty, ...more });
Then("lords of the movement's faith who are Wavering or worse join the revolution camp", (s) => {
  const m = { faith: "jodo_shinshu" };
  expect(V.lordCamp(s.family, lord("wavering", { faith: "jodo_shinshu" }), m)).toBe("revolution");
  expect(V.lordCamp(s.family, lord("in_revolt", { faith: "jodo_shinshu" }), m)).toBe("revolution");
  expect(V.lordCamp(s.family, lord("loyal", { faith: "jodo_shinshu" }), m)).not.toBe("revolution");
  expect(V.lordCamp(s.family, lord("wavering", { faith: "zen" }), m)).not.toBe("revolution");
});
Then("soldiers of the movement's faith desert at 5 percent a month", (s) => {
  expect(V.desertion(s.family)).toEqual({ rate: 0.05, conditions: ["same_faith"] });
});
Then("disloyal lords join the revolution camp with their retinues", (s) => {
  expect(V.lordCamp(s.family, lord("disloyal"))).toBe("revolution");
  expect(V.bringsRetinue(s.family, lord("disloyal"))).toBe(true);
  expect(V.lordCamp(s.family, lord("wavering"))).not.toBe("revolution");
});
Then("colonial troops of the same people desert at 10 percent a month", (s) => {
  expect(V.desertion(s.family)).toEqual({ rate: 0.1, conditions: ["colonial_same_people"] });
});
Then("soldiers mutiny at 10 percent a month while war weariness is above 14", (s) => {
  expect(V.mutiny(s.family, 15)).toBe(0.1);
  expect(V.mutiny(s.family, 14)).toBe(0);
});
Then("every Disloyal lord, and Wavering lords with the Pious or Proud trait, join the old order", (s) => {
  expect(V.lordCamp(s.family, lord("disloyal"))).toBe("old_order");
  expect(V.lordCamp(s.family, lord("wavering", { traits: ["Pious"] }))).toBe("old_order");
  expect(V.lordCamp(s.family, lord("wavering", { traits: ["Proud"] }))).toBe("old_order");
  expect(V.lordCamp(s.family, lord("wavering"))).toBeNull();
  expect(V.lordCamp(s.family, lord("loyal"))).toBeNull();
});
Given("a rising tagged {string} in {string}", (s, id: string, name: string) => {
  fire(s, id, monarchy(s, name));
  take(s, "royal_reaction");
  s.acted = false;
});
Given("a lord of {string} is {string}", (s, name: string, loyalty: string) => {
  const l: V.Lord = { id: "the_loyal_lord", loyalty: key(loyalty) as V.Loyalty, retinue: 300 };
  (rs(s).lords[key(name)] ??= []).push(l);
  s.lord = l.id;
});
Then("that lord sends his retinue to the ruler", (s) => {
  const camp = V.oldOrderCamp(rs(s), s.rev, s.country);
  expect(camp.lords).toContain(s.lord);
  expect(camp.retinues).toBeGreaterThanOrEqual(300);
});
Then("the clergy of the state faith calm their provinces", (s) => {
  expect(V.oldOrderCamp(rs(s), s.rev, s.country).clergy).toBe("Clergy of the state faith");
});
Given("the revolution camp of a rising tagged {string} holds the castle of {string}", (s, id: string, province: string) => {
  const c = monarchy(s, "France");
  fire(s, id, c);
  take(s, "royal_reaction");
  s.acted = false;
  E.place(w(s), `province:${key(province)}`).owner = c;
  V.takeCastle(tagged(s), `province:${key(province)}`);
});
Then("the province {string} counts as risen", (s, province: string) => {
  expect(V.isRisen(rs(s), `province:${key(province)}`)).toBe(true);
  expect(V.isRisen(rs(s), V.provincesOf(rs(s), s.country).find((p) => p !== `province:${key(province)}`)!)).toBe(false);
});
Then("the rising's strength, march, sieges and melting away follow the rebellions rules", (s) => {
  const r = tagged(s).rising;
  expect(Rb.fightsFromWalls(r)).toBe(true);
  expect(Rb.totalMen(r)).toBe(0);
  expect(["Riot", "Rising", "Rebellion", "Great revolt"]).toContain(Rb.severity(r));
});

// ---------------------------------------------------------------- re-arm (REVO-032 … REVO-038)

Given(/^the revolution "([^"]+)" was answered by (the Bend option|a Fight rising that was crushed|a Path option that applies no regime)$/, (s, id: string, how: string) => {
  const r = rev(s, id);
  const country = id === "french_revolution" ? monarchy(s, "France") : V.eventOf(rs(s), id).roles[V.roleOf(r)]!.historical[0]!;
  E.country(w(s), country).exists = true;
  fire(s, id, country);
  s.outcome = how;
  s.acted = false;
});
When("the outcome is applied", (s) => {
  const how: string | undefined = s.outcome;
  const stance = (st: V.Stance) => Object.entries(rev(s).stances).find(([, x]) => x === st)![0];
  if (how === "the Bend option") take(s, stance("bend"));
  else if (how?.startsWith("a Fight")) {
    take(s, stance("fight"));
    V.settle(rs(s), tagged(s), "crushed");
  } else if (how?.startsWith("a Path")) {
    const p = V.preview(rs(s), s.rev).find((x) => x.stance === "path" && !x.regimes.length && !x.rising)!;
    take(s, p.option);
  }
  act(s);
});
Then("its card stays up marked {string}", (s, label: string) => {
  const c = card(s);
  expect(c.status).toBe(label);
  expect(c.shown).toBe(true);
});
Given("the revolution {string} re-armed for {string} {int} years ago", (s, id: string, name: string, years: number) => {
  const c = monarchy(s, name);
  s.rev = id;
  w(s).history.push({ event: id, year: w(s).year - years, month: w(s).month, roles: V.rolesFor(rs(s), id, c), option: "constitutional_monarchy" });
  const t = track(s, id, c);
  t.rearmed = true;
  t.rearmedAt = E.now(w(s)) - years * 12;
});
Then(/^the revolution "([^"]+)" (can|cannot) break out through the normal selection with its sparks$/, (s, id: string, can: string) => {
  const rolled = (s.turnLog as E.DomainEvent[]).find((l) => l.type === "RevolutionRolled" && l.revolution === id && l.country === s.country);
  if (can === "can") {
    expect(rolled).toBeDefined();
    const ch = E.poolChance(rs(s).es, V.eventOf(rs(s), id), V.rolesFor(rs(s), id, s.country));
    expect(rolled!.chance).toBeCloseTo(ch.chance);
    expect(V.eventOf(rs(s), id).selection.modifiers).toHaveLength(rev(s, id).sparks.length);
  } else {
    expect(rolled).toBeUndefined();
    expect(V.whyNot(rs(s), id, s.country)).toBe("grace");
  }
});
Given("the revolution {string} is re-armed for {string}", (s, id: string, name: string) => {
  const c = monarchy(s, name);
  light(s, id, c, 4);
  w(s).history.push({ event: id, year: w(s).year - 1, month: w(s).month, roles: V.rolesFor(rs(s), id, c), option: "constitutional_monarchy" });
  V.rearm(rs(s), id, c);
});
Given("the grace period has passed", (s) => {
  const t = track(s);
  t.rearmedAt = E.now(w(s)) - rev(s).rearm.grace_years * 12;
  monthBefore(s, () => {
    t.stage = "Quiet";
    V.evaluate(rs(s), s.rev, s.country);
  });
  expect(V.mayBreakOut(rs(s), s.rev, s.country)).toBe(true);
});
When("the lit signs of {string} fall to {int}", (s, id: string, n: number) => {
  const roles = V.rolesFor(rs(s), id, s.country);
  const lit = V.signs(rs(s), id, s.country).filter((x) => x.lit);
  for (const x of lit.slice(n)) darken(s, x.sign.if, roles);
  expect(V.litCount(rs(s), id, s.country)).toBe(n);
  s.darkened = lit.slice(n).map((x) => x.sign);
  V.evaluate(rs(s), id, s.country);
  act(s);
});
Then("the revolution {string} is disarmed", (s, id: string) => {
  expect(V.disarmed(rs(s), id, s.country)).toBe(true);
  expect(V.mayBreakOut(rs(s), id, s.country)).toBe(false);
  expect(rs(s).log.some((l) => l.type === "RevolutionDisarmed" && l.revolution === id)).toBe(true);
});
Then("no fixed cooldown applies", (s) => {
  const roles = V.rolesFor(rs(s), s.rev, s.country);
  for (const sign of s.darkened as V.Sign[]) satisfy(s, sign.if, roles);
  V.evaluate(rs(s), s.rev, s.country);
  E.nextMonth(w(s));
  expect(V.whyNot(rs(s), s.rev, s.country)).toBeNull();
});
Given("{string} bent to the revolution {string} once", (s, name: string, id: string) => {
  fire(s, id, monarchy(s, name));
  take(s, Object.entries(rev(s).stances).find(([, x]) => x === "bend")![0]);
  track(s).rearmedAt = E.now(w(s)) - rev(s).rearm.grace_years * 12;
  s.acted = false;
});
When("the event {string} fires again for {string}", (s, id: string, name: string) => {
  expect(E.repeatBlocks(rs(s).es, V.eventOf(rs(s), id), V.rolesFor(rs(s), id, key(name)))).toBeNull();
  V.breakOut(rs(s), id, key(name));
  expect(track(s).times).toBe(2);
  act(s);
});
Then("{string} may choose Lead, Bend or Fight again", (s, name: string) => {
  const opts = V.stanceOptions(rs(s), s.rev, V.rolesFor(rs(s), s.rev, key(name)));
  expect(opts.map((o) => o.stance).sort()).toEqual(["bend", "fight", "lead"]);
  expect(E.controllerOf(V.eventOf(rs(s), s.rev), V.rolesFor(rs(s), s.rev, key(name)))).toBe(key(name));
});
Given("the regime {string} was applied to {string} by {string}", (s, regime: string, name: string, id: string) => {
  fire(s, id, monarchy(s, name));
  const p = V.preview(rs(s), id).find((x) => x.regimes.includes(regime) && x.stance === "lead")!;
  take(s, p.option);
  s.acted = false;
});
Then("the revolution {string} does not re-arm", (s, id: string) => {
  expect(track(s, id).rearmed).toBe(false);
  expect(V.holding(rs(s), s.country).regime).toBe("revolutionary_republic");
  expect(V.whyNot(rs(s), id, s.country)).not.toBeNull();
});
Given("the event {string} has repeat {string}", (s, id: string, repeat: string) => {
  s.rev = id;
  expect(V.eventOf(rs(s), id).availability.repeat).toBe(repeat);
});
Given("its revolution block lists the outcome {string} under rearm", (s, text: string) => {
  const [option, when] = text.split(":").map((x) => x.trim());
  expect(rev(s).rearm.after[option!]).toBe(when);
  s.option = option;
});
Given("the league's rising was crushed", (s) => {
  w(s).year = 1500;
  const governor = V.eventOf(rs(s), s.rev).roles[V.roleOf(rev(s))]!.historical[0]!;
  E.country(w(s), governor).exists = true;
  fire(s, s.rev, governor);
  take(s, s.option);
  V.settle(rs(s), tagged(s), "crushed");
  expect(track(s).rearmed).toBe(true);
  s.acted = false;
});
When("the grace period has passed and the signs are lit", (s) => {
  for (let m = 0; m < rev(s).rearm.grace_years * 12; m++) E.nextMonth(w(s));
  light(s, s.rev, s.country, rev(s).signs!.need);
  monthBefore(s, () => V.evaluate(rs(s), s.rev, s.country));
  act(s);
});
Then("the event {string} may fire again", (s, id: string) => {
  expect(w(s).history.some((h) => h.event === id)).toBe(true);
  expect(E.repeatBlocks(rs(s).es, V.eventOf(rs(s), id), V.rolesFor(rs(s), id, s.country))).toBeNull();
  expect(V.whyNot(rs(s), id, s.country)).toBeNull();
});

// ---------------------------------------------------------------- regimes (REVO-039 … REVO-051)

/** Provinces with the grievances regimes end, so their end shows. */
function seedGrievances(s: Scenario, c: string): void {
  for (const p of provinces(s, c, 10)) for (const g of ["harsh_lord", "wrong_faith", "heavy_taxes"]) if (!V.grievancesIn(rs(s), p).includes(g)) V.grievancesIn(rs(s), p).push(g);
}
Then("the form of {string} is {string}", (s, name: string, form: string) => {
  expect(rs(s).forms[key(name)]).toBe(form);
});
Then("the ruler of {string} is deposed and goes abroad with the heirs as pretenders", (s, name: string) => {
  expect(V.regime(V.holding(rs(s), key(name)).regime!).ruler).toBe("deposed");
  expect(rs(s).pretenders).toContainEqual({ country: key(name), who: "the ruler and heirs" });
});
Then(/^"([^"]+)" gains the decrees (.+)$/, (s, name: string, text: string) => {
  expect(rs(s).decrees[key(name)]).toEqual(quoted(text));
});
Then(/^"([^"]+)" loses the actions (.+)$/, (s, name: string, text: string) => {
  for (const a of quoted(text)) expect(V.isLocked(rs(s), key(name), a)).toBe(true);
  s.locked = quoted(text);
});
Then("the locked actions show {string}", (s, label: string) => {
  for (const a of s.locked as string[]) expect(V.actionLabel(rs(s), s.country, a)).toEqual({ action: a, enabled: false, note: label });
  expect(V.actionLabel(rs(s), s.country, "massacre").enabled).toBe(true);
});
Then(/^the grievances? "([^"]+)"(?: and "([^"]+)")? ends? in the provinces of "([^"]+)"$/, (s, a: string, b: string | null, name: string) => {
  for (const p of V.provincesOf(rs(s), key(name))) for (const g of [a, b].filter(Boolean) as string[]) expect(V.grievancesIn(rs(s), p)).not.toContain(key(g));
});
Then("the grievance {string} is added in the provinces of {string}", (s, g: string, name: string) => {
  for (const p of V.provincesOf(rs(s), key(name))) expect(V.grievancesIn(rs(s), p)).toContain(key(g));
});
Then(/^"([^"]+)" has the flags? (.+)$/, (s, name: string, text: string) => {
  for (const f of quoted(text)) expect(V.hasFlag(rs(s), key(name), f)).toBe(true);
});
Then(/^"([^"]+)" no longer has the flags? (.+)$/, (s, name: string, text: string) => {
  for (const f of quoted(text)) expect(V.hasFlag(rs(s), key(name), f)).toBe(false);
});
When("the regime {string} applies to a country", (s, id: string) => {
  const c = realm(s, "Testland");
  V.setForm(rs(s), c, "feudal_realm");
  V.applyRegime(rs(s), c, id);
  act(s);
});
Then("the country's form becomes {string}", (s, form: string) => {
  expect(rs(s).forms[s.country]).toBe(form);
});
Then("its ruler is {string}", (s, ruler: string) => {
  if (s.kinds) {
    // The AI's ruler and his trait (REVO-070).
    s.trait = ruler;
    return;
  }
  expect(V.regime(V.holding(rs(s), s.country).regime!).ruler).toBe(ruler);
  expect(rs(s).pretenders.some((p) => p.country === s.country)).toBe(ruler === "deposed");
});
Then("it gains the decrees {string}", (s, text: string) => {
  expect(rs(s).decrees[s.country] ?? []).toEqual(list(text));
});
Then("it loses the actions {string}", (s, text: string) => {
  expect(rs(s).locks[s.country] ?? []).toEqual(list(text));
});
Given("the country {string} holds the form {string}", (s, name: string, form: G.FormId) => {
  V.setForm(rs(s), realm(s, name), form);
});
Given("{string} held the form {string} before its last revolutionary regime", (s, name: string, form: G.FormId) => {
  rs(s).formBefore[key(name)] = form;
});
Then("the form held before the revolutionary regime is recorded as {string}", (s, form: string) => {
  expect(rs(s).formBefore[s.country]).toBe(form);
});
Given(/^the country "([^"]+)" (has|does not have) the invention G14 Written constitution$/, (s, name: string, has: string) => {
  const c = realm(s, name);
  V.setForm(rs(s), c, "diet_monarchy");
  rs(s).inventions[c] = has === "has" ? ["G14"] : [];
});
Then("the officials and lords caps of {string} are those of the form {string}", (s, name: string, form: G.FormId) => {
  const caps = G.workOutCaps({ form, buildings: [] });
  expect(V.caps(rs(s), key(name))).toEqual({ officials: caps.officials.total, lords: caps.lords.total });
  expect(Object.keys(V.regime(V.holding(rs(s), key(name)).regime!)).filter((k) => /officials|cap/.test(k))).toEqual([]);
});
Given("the country {string} holds the regime {string}", (s, name: string, id: string) => {
  const c = realm(s, name);
  if (!rs(s).forms[c]) V.setForm(rs(s), c, "absolute_monarchy");
  seedGrievances(s, c);
  if (!rs(s).lords[c]) lords(s, c, ["loyal", "loyal", "wavering"]);
  s.lordsBefore = rs(s).lords[c]!.map((l) => l.loyalty);
  V.applyRegime(rs(s), c, id);
  s.country = c;
});
Then("{string} holds the regime {string} and the add-on {string}", (s, name: string, id: string, addOn: string) => {
  const h = V.holding(rs(s), key(name));
  expect(h.regime).toBe(id);
  expect(h.addOns).toEqual([addOn]);
});
Then("the lords of {string} waver one step at once", (s, name: string) => {
  const now = rs(s).lords[key(name)]!.map((l) => l.loyalty);
  (s.lordsBefore as V.Loyalty[]).forEach((l, i) => expect(now[i]).toBe(V.waver(l)));
});
Given("the country {string} holds the regime {string} with the flag {string}", (s, name: string, id: string, flag: string) => {
  const c = realm(s, name);
  V.setForm(rs(s), c, "diet_monarchy");
  V.applyRegime(rs(s), c, id);
  expect(V.hasFlag(rs(s), c, flag)).toBe(true);
  s.country = c;
});
Then("{string} holds only the regime {string}", (s, name: string, id: string) => {
  const h = V.holding(rs(s), key(name));
  expect(h.regime).toBe(id);
  expect(h.addOns).toEqual([]);
  expect(rs(s).decrees[key(name)]).toEqual(V.regime(id).decrees ?? []);
});
Given("the country {string} has the flags {string} and {string}", (s, name: string, a: string, b: string) => {
  const c = realm(s, name);
  V.setForm(rs(s), c, "constitutional_republic");
  rs(s).formBefore[c] = "absolute_monarchy";
  (E.country(w(s), c).flags ??= []).push(a, b);
});
Given("the country {string} took the regime {string} {int} years ago", (s, name: string, id: string, years: number) => {
  const c = monarchy(s, name);
  w(s).year -= years;
  V.applyRegime(rs(s), c, id);
  w(s).year += years;
});
Given("the revolution {string} needs {int} signs", (s, id: string, n: number) => {
  s.rev = id;
  expect(rev(s).signs!.need).toBe(n);
});
Then("the revolution {string} breaks out at {int} signs for {string}", (s, id: string, n: number, name: string) => {
  expect(V.needFor(rs(s), id, key(name))).toBe(n);
  expect(V.card(rs(s), id, key(name)).breaksOut).toBe(`Breaks out at ${n} of ${rev(s, id).signs!.list.length} signs`);
  light(s, id, key(name), n);
  V.evaluate(rs(s), id, key(name));
  expect(track(s, id, key(name)).stage).toBe("Ready");
});
When("the effect {string} applies", (s, text: string) => {
  const e = parseLeaf(text);
  s.country = String((e.lock as { on: string }).on);
  E.applyEffect(e, w(s), V.ctxFor(rs(s), {}));
  act(s);
});
Then("{string} cannot massacre after beating a rising", (s, name: string) => {
  expect(V.isLocked(rs(s), key(name), "massacre")).toBe(true);
  expect(V.actionLabel(rs(s), key(name), "massacre").enabled).toBe(false);
});

// ---------------------------------------------------------------- decrees (REVO-052 … REVO-054)

Given("the country holds a regime that unlocks the decree {string}", (s, d: string) => {
  const id = Object.values(V.regimes).find((g) => (g.decrees ?? []).includes(d))!.id;
  const c = realm(s, "Testland");
  V.setForm(rs(s), c, "absolute_monarchy");
  const [p1, p2] = V.provincesOf(rs(s), c);
  rs(s).lords[c] = [
    { id: "pious_lord", loyalty: "loyal", provinces: [p1!], traits: ["Pious"] },
    { id: "disloyal_lord", loyalty: "disloyal", provinces: [p2!] },
  ];
  V.applyRegime(rs(s), c, id);
  V.grievancesIn(rs(s), p1!).push("harsh_lord");
  s.decree = d;
});
When(/^the player opens the (country|province) card$/, (s, which: "country" | "province") => {
  s.buttons = V.decreeButtons(rs(s), s.country, which);
  act(s);
});
Then("the button {string} is shown with the cost {string} and the limit {string}", (s, d: string, cost: string, limit: string) => {
  expect(s.buttons).toContainEqual({ decree: d, card: V.decree(d).card, cost, limit });
});
When("the player uses the decree {string}", (s, d: string) => {
  const p1 = V.provincesOf(rs(s), s.country)[0]!;
  s.useInput = { province: p1, churchTileIncome: 100, tribute: "chauth", provinceTax: 40, owner: "neighbour" };
  s.used = V.useDecree(rs(s), s.country, d, s.useInput);
  act(s);
});
const used = (s: Scenario): V.DecreeResult => s.used;
const tradeOffs: Record<string, (s: Scenario) => void> = {
  "the treasury gains ten years of the state church's tile income": (s) => expect(E.country(w(s), s.country).stats.treasury).toBe(10 * 100),
  "the clergy and Pious lords waver": (s) => {
    expect(used(s).prices.clergyWaver).toBe(true);
    expect(rs(s).lords[s.country]!.find((l) => l.id === "pious_lord")!.loyalty).toBe("wavering");
  },
  "every class can be levied at the farmers' share and the levy caps double for one war": (s) => expect(used(s).gains).toEqual({ levyShareOf: "farmers", everyClass: true, levyCapMult: 2, forOneWar: true }),
  "every province gets Conscription for 3 years": (s) => {
    for (const p of V.provincesOf(rs(s), s.country)) expect(V.grievancesIn(rs(s), p)).toContain("conscription");
    expect(used(s).prices.until).toBe(E.now(w(s)) + 36);
  },
  "disloyal lords, officers or pretenders' backers are removed at once": (s) => {
    expect(used(s).gains.removed).toEqual(["disloyal_lord"]);
    expect(rs(s).lords[s.country]!.map((l) => l.id)).toEqual(["pious_lord"]);
  },
  "Bloodshed in the provinces of those tried; scholars may flee abroad": (s) => {
    const p2 = V.provincesOf(rs(s), s.country)[1]!;
    expect(V.grievancesIn(rs(s), p2)).toContain("bloodshed");
    expect(V.grievancesIn(rs(s), V.provincesOf(rs(s), s.country)[0]!)).not.toContain("bloodshed");
    expect(used(s).prices.scholarsMayFlee).toBe(true);
  },
  "estate and plantation tiles become family farms, Harsh lord ends and food rises": (s) => {
    expect(used(s).gains).toEqual({ tiles: "family_farms", ends: "harsh_lord", food: "up" });
    expect(V.grievancesIn(rs(s), s.useInput.province)).not.toContain("harsh_lord");
  },
  "the lord or owner turns Disloyal and export wares fall": (s) => {
    expect(rs(s).lords[s.country]!.find((l) => l.id === "pious_lord")!.loyalty).toBe("disloyal");
    expect(used(s).prices.exportWares).toBe("down");
  },
  "new ideas spread half as fast in the realm": (s) => expect(used(s).gains.ideasSpreadMult).toBe(0.5),
  "scholars fall 10 % a year and presses and schools slow": (s) => expect(used(s).prices).toEqual({ scholarsPerYear: -0.1, pressesAndSchools: "slow" }),
  "a neighbour pays a quarter (chauth) or a fifth (rakhi) of the province's tax each year": (s) => {
    expect(used(s).gains).toEqual({ taxShare: 0.25, yearly: 10 });
    expect(V.useDecree(rs(s), s.country, s.decree, { province: s.useInput.province, tribute: "rakhi", provinceTax: 40 }).gains.taxShare).toBe(0.2);
  },
  "the owner's opinion falls 20; a refusal means a raid with Burned homes there": (s) => {
    expect(E.country(w(s), "neighbour").opinions![s.country]).toBe(-20);
    const refused = V.useDecree(rs(s), s.country, s.decree, { ...s.useInput, refused: true });
    expect(refused.prices.raid).toBe("burned_homes");
    expect(V.grievancesIn(rs(s), s.useInput.province)).toContain("burned_homes");
  },
};
for (const [text, fn] of Object.entries(tradeOffs)) Then(exact(text), fn);
Given("the country holds the regime {string}", (s, id: string) => {
  const c = realm(s, "Testland");
  V.setForm(rs(s), c, "diet_monarchy");
  V.applyRegime(rs(s), c, id);
});
Given("fewer than a third of its provinces have grievances", (s) => {
  for (const p of V.provincesOf(rs(s), s.country).slice(0, 3)) V.grievancesIn(rs(s), p).push("heavy_taxes");
});
Given("the realm is not deep in debt", (s) => {
  s.deepInDebt = false;
});
When("the player puts a tax rise to the assembly", (s) => {
  s.assembly = V.assemblyAgrees(rs(s), s.country, s.deepInDebt);
  act(s);
});
Then("the assembly agrees", (s) => {
  expect(s.assembly.agrees).toBe(true);
  for (const p of V.provincesOf(rs(s), s.country).slice(3, 4)) V.grievancesIn(rs(s), p).push("heavy_taxes");
  expect(V.assemblyAgrees(rs(s), s.country, false).agrees).toBe(false);
  expect(V.assemblyAgrees(rs(s), "testland", true).agrees).toBe(false);
});
Then("the tax rise brings no grievance penalties", (s) => {
  expect(s.assembly.grievancePenalties).toBe(false);
});

// ---------------------------------------------------------------- aftermath (REVO-055 … REVO-059)

Given("a revolution of the family {string} wins in a country", (s, fam: string) => {
  s.rev = firstOfFamily(fam);
  const c = realm(s, "Testland");
  const world = w(s);
  world.countries[c]!.region = "europe";
  world.countries[c]!.borders = ["north", "south"];
  for (const n of ["north", "south", "far"]) {
    E.country(world, n).region = "europe";
    provinces(s, n, 2);
  }
  E.country(world, "abroad").region = "asia";
  s.ideasBefore = JSON.stringify(Object.fromEntries(Object.entries(world.countries).map(([k, v]) => [k, v.ideologies ?? {}])));
});
When("the wave is applied", (s) => {
  s.wave = V.spreadWave(rs(s), s.rev, s.country);
  act(s);
});
Then(/^(\w+) support rises by ([\d.]+) in the (neighbours|region)$/, (s, idea: string, amount: string, where: string) => {
  const world = w(s);
  const reached = where === "neighbours" ? ["north", "south"] : ["north", "south", "far"];
  for (const c of reached) expect(world.countries[c]!.ideologies?.[idea]).toBeCloseTo(Number(amount));
  for (const c of ["abroad", s.country, ...(where === "neighbours" ? ["far"] : [])]) expect(world.countries[c]!.ideologies?.[idea] ?? 0).toBe(0);
});
Then("religion's faith wave starts toward the neighbours", (s) => {
  expect(s.wave).toMatchObject({ kind: "faith_wave", amount: 0.05 });
  expect([...s.wave.targets].sort()).toEqual(["north", "south"]);
});
Then("neighbouring provinces get the grievance {string}, not an ideology", (s, g: string) => {
  for (const c of ["north", "south"]) for (const p of V.provincesOf(rs(s), c)) expect(V.grievancesIn(rs(s), p)).toContain(key(g));
  for (const p of V.provincesOf(rs(s), "far")) expect(V.grievancesIn(rs(s), p)).not.toContain(key(g));
  expect(JSON.stringify(Object.fromEntries(Object.entries(w(s).countries).filter(([k]) => k !== "abroad" || true).map(([k, v]) => [k, v.ideologies ?? {}])))).toBe(s.ideasBefore);
});
Then("nothing spreads", (s) => {
  expect(s.wave).toEqual({ kind: "none", targets: [] });
  expect(rs(s).log.some((l) => l.type === "WaveSpread")).toBe(false);
});
Then("the old dynasty of {string} lives abroad as a pretender", (s, name: string) => {
  expect(rs(s).pretenders.some((p) => p.country === key(name))).toBe(true);
});
Then("rivals of {string} can fund the pretender", (s, name: string) => {
  (E.country(w(s), "austria").relations ??= []).push({ other: key(name), type: "rivalry" });
  expect(V.canFundPretender(rs(s), "austria", key(name))).toBe(true);
  expect(V.canFundPretender(rs(s), "sweden", key(name))).toBe(false);
});
Then("the old dynasty can bind the role of {string}", (s, id: string) => {
  expect(id).toBe("restoration_of_the_old_order");
  expect(V.restorationCandidates(rs(s))).toContain(s.country);
});
When("the chance of a general growing too big is computed for {string}", (s, name: string) => {
  s.mult = V.generalsTooBigMult(rs(s), key(name));
  act(s);
});
Then("the chance is doubled", (s) => {
  expect(s.mult).toBe(2);
});
Then("a winning general can switch the regime to {string} or {string}", (s, a: string, b: string) => {
  expect(V.generalSwitches(rs(s), s.country)).toEqual([a, b]);
  E.applyEffect({ regime: { on: s.country, id: a } }, w(s), V.ctxFor(rs(s), {}));
  expect(V.holding(rs(s), s.country).regime).toBe(a);
});
Given("the country {string} has the flag {string}", (s, name: string, flag: string) => {
  const c = realm(s, name);
  V.setForm(rs(s), c, "constitutional_republic");
  rs(s).formBefore[c] = "absolute_monarchy";
  (E.country(w(s), c).flags ??= []).push(flag, "revolutionary_regime");
});
Given("{string} has lost a war, has broken charters and a weak regime", (s, name: string) => {
  const c = key(name);
  rs(s).peaces.push({ who: c, at: E.now(w(s)) - 6, side: "loser", terms: "land" });
  for (const p of V.provincesOf(rs(s), c)) V.grievancesIn(rs(s), p).push("broken_charter");
  E.country(w(s), c).stats = { ...E.country(w(s), c).stats, legitimacy: 30, stability: -1 };
  expect(V.litCount(rs(s), "restoration_of_the_old_order", c)).toBeGreaterThanOrEqual(V.revolution("restoration_of_the_old_order").signs!.need);
});
Then("the form of {string} returns to the form it held before the revolution", (s, name: string) => {
  expect(rs(s).forms[key(name)]).toBe("absolute_monarchy");
});

// ---------------------------------------------------------------- the 36 revolutions (REVO-066 … REVO-068)

Given("the revolution {string}", (s, id: string) => {
  s.rev = id;
});
When("the revolution catalogue is generated", (s) => {
  s.row = built().catalogue.find((r) => r.event === s.rev);
  act(s);
});
Then("its family is {string}", (s, fam: string) => {
  expect(s.row.family).toBe(fam);
});
Then("it breaks out at {string}", (s, t: string) => {
  expect(s.row.threshold).toBe(t);
});
Then("{int} revolutions are new events", (s, n: number) => {
  expect((s.build as V.LayerBuild).newEvents).toHaveLength(n);
  for (const id of (s.build as V.LayerBuild).newEvents) expect(E.tree.index[id]).toBeUndefined();
});
Then("{int} revolutions extend events that already exist in the event tree", (s, n: number) => {
  expect((s.build as V.LayerBuild).extended).toHaveLength(n);
  for (const id of (s.build as V.LayerBuild).extended) expect(E.tree.index[id]).toBeDefined();
});
Given("the country {string} is a monarchy with debt above {int} gold and lit signs of {string}", (s, name: string, debt: number, id: string) => {
  const c = monarchy(s, name);
  E.country(w(s), c).stats.debt = debt + 100;
  s.rev = id;
  s.country = c;
  expect(V.litCount(rs(s), id, c)).toBeGreaterThan(0);
});
When("the event's role selector for {string} is evaluated", (s, role: string) => {
  s.candidates = E.roleCandidates(rs(s).es, V.eventOf(rs(s), s.rev), role);
  act(s);
});
Then("{string} can be bound as the realm of {string}", (s, name: string, id: string) => {
  expect(s.candidates).toContain(key(name));
  expect(V.eventOf(rs(s), id).roles.realm!.historical).not.toContain(key(name));
});
Then("{string} sees the card {string}", (s, name: string, id: string) => {
  expect(V.card(rs(s), id, key(name)).shown).toBe(true);
});
Given("{string} has recently lost a war, liberal and socialist ideas, crowded factory workers, land hunger and war weariness", (s, name: string) => {
  w(s).year = 1905;
  light(s, "russian_revolution_1905", key(name), 6);
});
Then("{string} can break out with {string} at {int} of {int} signs", (s, name: string, id: string, need: number, n: number) => {
  const c = V.card(rs(s), id, key(name));
  expect(c.breaksOut).toBe(`Breaks out at ${need} of ${n} signs`);
  expect(c.lit).toBeGreaterThanOrEqual(need);
  expect(track(s, id, key(name)).stage).toBe("Ready");
});
Given("no sign of {string} was ever lit for any country by {int}", (s, id: string, year: number) => {
  s.rev = id;
  monarchy(s, "France");
  monarchy(s, "Spain");
  w(s).year = year;
  w(s).month = 12;
  V.evaluateAll(rs(s));
  for (const c of V.countriesOf(rs(s))) expect(V.litCount(rs(s), id, c)).toBe(0);
});
When("the date passes {int}", (s, year: number) => {
  E.nextMonth(w(s));
  expect(w(s).year).toBe(year + 1);
  s.turnLog = V.processTurn(rs(s), rng(s));
  act(s);
});
Then("the revolution {string} never fires", (s, id: string) => {
  expect(w(s).history.some((h) => h.event === id)).toBe(false);
  for (const c of V.countriesOf(rs(s))) {
    satisfy(s, { all: V.revolution(id).signs!.list.map((x) => x.if) }, V.rolesFor(rs(s), id, c));
    expect(V.whyNot(rs(s), id, c)).toBe("outside years");
  }
});
Then("its historical path is gone", (s) => {
  expect(E.gate(rs(s).es, V.eventOf(rs(s), s.rev))).toBe("outside years");
});

// ---------------------------------------------------------------- AI (REVO-070, REVO-072 … REVO-074)

Given("the AI country {string} has an amber card with the lit signs {string}", (s, name: string, text: string) => {
  realm(s, name);
  s.kinds = list(text).map((x) => x.replace(/^an? /, "").replace(/ sign$/, "")) as V.SignKind[];
});
When("the AI plans its turn", (s) => {
  if (s.kinds) s.plan = V.aiEaseOrder(s.kinds, s.trait);
  act(s);
});
Then("it eases {string} first", (s, what: string) => {
  const [first, rest] = what.split(", ");
  expect(s.plan.order[0]).toBe(first!.replace(/^the /, "").replace(/ sign$/, ""));
  expect(s.plan.cutsTaxes).toBe(rest !== "not by cutting taxes");
  const sign = V.revolution("french_revolution").signs!.list[0]!;
  expect(V.signKind(sign)).toBe("debt");
});
Given("the AI country {string} hosts the émigré court of {string}'s old dynasty", (s, host: string, name: string) => {
  const c = monarchy(s, name);
  realm(s, host);
  V.applyRegime(rs(s), c, "revolutionary_republic");
  for (const p of rs(s).pretenders) if (p.country === c) p.host = key(host);
});
const rivalry = (s: Scenario, a: string, b: string) => (E.country(w(s), key(a)).relations ??= []).push({ other: key(b), type: "rivalry" });
Given("{string} is a rival of the revolutionary state {string}", (s, a: string, b: string) => {
  rivalry(s, a, b);
});
Then("{string} funds the pretender abroad", (s, host: string) => {
  expect(V.aiFundsPretender(rs(s), key(host), s.country)).toBe(true);
  expect(V.aiFundsPretender(rs(s), "sweden", s.country)).toBe(false);
});
Given("the AI monarchy {string} holds a counter-revolution reason against {string}", (s, a: string, b: string) => {
  const m = monarchy(s, a);
  const t = realm(s, b);
  E.country(w(s), t).government = "monarchy";
  V.applyRegime(rs(s), t, "revolutionary_republic");
  expect(rs(s).opinions).toContainEqual({ from: m, to: t, value: -50, reason: "counter_revolution", years: 25 });
  s.pair = [m, t];
});
Given("{string} is stronger than {string}", (s, a: string, b: string) => {
  E.country(w(s), key(a)).stats.army_strength = 200;
  E.country(w(s), key(b)).stats.army_strength = 100;
});
Then("{string} may use the counter-revolution reason to go to war", (s, a: string) => {
  expect(V.aiUsesCounterRevolution(rs(s), key(a), s.pair[1])).toBe(true);
  E.country(w(s), key(a)).stats.army_strength = 50;
  expect(V.aiUsesCounterRevolution(rs(s), key(a), s.pair[1])).toBe(false);
});
Given("the AI country {string} is a rival of {string}", (s, a: string, b: string) => {
  realm(s, a);
  rivalry(s, a, b);
});
Given("the card of {string} in {string} is {string}", (s, id: string, name: string, colour: string) => {
  const n = colour === "neutral" ? 1 : colour === "amber" ? rev(s, id).signs!.warn_at : rev(s, id).signs!.need;
  light(s, id, monarchy(s, name), n);
  expect(card(s).colour).toBe(colour);
});
Given(/^"([^"]+)" and "([^"]+)" (are|are not) allied$/, (s, a: string, b: string, are: string) => {
  if (are === "are") (E.country(w(s), key(a)).relations ??= []).push({ other: key(b), type: "alliance" });
  s.funder = key(a);
});
Then(/^"([^"]+)" (funds|does not fund) the revolution$/, (s, name: string, funds: string) => {
  expect(V.aiFundsRevolution(rs(s), key(name), s.country, s.rev)).toBe(funds === "funds");
});

// ---------------------------------------------------------------- phone views (REVO-076, REVO-077)

Given("the revolution {string} has province-level signs", (s, id: string) => {
  expect(V.provinceSigns(id)).toEqual(["hungry"]);
  const c = monarchy(s, "France");
  fire(s, id, c);
  take(s, "royal_reaction");
  s.acted = false;
  const ps = V.provincesOf(rs(s), c);
  V.takeCastle(tagged(s), ps[9]!);
});
When("the player turns on the revolution lens", (s) => {
  s.lens = V.lens(rs(s), s.rev, s.country);
  act(s);
});
Then("each province is shaded by how many of those signs it meets", (s) => {
  const ids = V.provinceSigns(s.rev);
  for (const x of s.lens as ReturnType<typeof V.lens>) expect(x.shade).toBe(ids.filter((g) => V.grievancesIn(rs(s), x.province).includes(g)).length);
  expect((s.lens as ReturnType<typeof V.lens>).some((x) => x.shade > 0)).toBe(true);
  expect((s.lens as ReturnType<typeof V.lens>).some((x) => x.shade === 0)).toBe(true);
});
Then("risen provinces are hatched in the revolution's colour", (s) => {
  const lens = s.lens as ReturnType<typeof V.lens>;
  const risen = lens.filter((x) => x.hatched);
  expect(risen.map((x) => x.province)).toEqual(tagged(s).castles);
  for (const x of risen) expect(x.colour).toBe(s.rev);
});
When("the player opens the government screen", (s) => {
  s.regimeCard = V.regimeCard(rs(s), s.country);
  act(s);
});
Then("it shows the line {string}", (s, line: string) => {
  expect(s.regimeCard.loop).toBe(line);
});
Then("the decrees {string}, {string} and {string} are buttons", (s, a: string, b: string, c: string) => {
  expect(s.regimeCard.decrees.map((d: V.DecreeButton) => d.decree)).toEqual([a, b, c]);
});
Then("{string}, {string} and {string} are greyed out with {string}", (s, a: string, b: string, c: string, note: string) => {
  expect(s.regimeCard.locked).toEqual([a, b, c].map((action) => ({ action, note })));
});

// ---------------------------------------------------------------- data and build (REVO-079, REVO-080)

Given("the revolution patch is merged into the event tree", (s) => {
  for (const id of Object.keys(V.revolutions)) expect(rs(s).es.events[id]).toBeDefined();
});
When("the engine runs a campaign", (s) => {
  act(s);
});
const abilities: Record<string, (s: Scenario) => void> = {
  "evaluate the conditions grievance, class_share, lords and war_lost": (s) => {
    const c = realm(s, "France");
    V.grievancesIn(rs(s), V.provincesOf(rs(s), c)[0]!).push("hungry");
    rs(s).classes[c] = { craftsmen: 1, farmers: 9 };
    rs(s).lords[c] = [{ id: "l", loyalty: "disloyal", provinces: [V.provincesOf(rs(s), c)[1]!] }];
    rs(s).peaces.push({ who: c, at: E.now(w(s)), side: "loser", terms: "paid" });
    const ctx = { roles: {}, ...(rs(s).es.conditions ? { conditions: rs(s).es.conditions } : {}) };
    for (const [cond, expected] of [
      [{ grievance: { who: c, id: "hungry", op: ">=", value: 0.1 } }, true],
      [{ grievance: { who: c, id: "hungry", op: ">=", value: 0.2 } }, false],
      [{ class_share: { who: c, class: "craftsmen", op: ">=", value: 0.1 } }, true],
      [{ lords: { who: c, measure: "land_share", op: ">=", value: 0.1 } }, true],
      [{ lords: { who: c, measure: "disloyal_or_worse", op: ">=", value: 2 } }, false],
      [{ war_lost: { who: c, within_years: 1 } }, true],
    ] as [E.Condition, boolean][])
      expect(E.holds(cond, w(s), ctx)).toBe(expected);
  },
  "apply the effects regime and lock": (s) => {
    const c = realm(s, "France");
    V.setForm(rs(s), c, "absolute_monarchy");
    E.applyEffects([{ regime: { on: c, id: "court_absolutism" } }, { lock: { on: c, id: "persecute" } }], w(s), V.ctxFor(rs(s), {}));
    expect(V.holding(rs(s), c).regime).toBe("court_absolutism");
    expect(V.isLocked(rs(s), c, "persecute")).toBe(true);
  },
  "keep the revolution tag on a rising and apply rising_won or rising_crushed": (s) => {
    fire(s, "french_revolution", monarchy(s, "France"));
    take(s, "royal_reaction");
    expect(w(s).rebels.at(-1)!.revolution).toBe("french_revolution");
    V.settle(rs(s), tagged(s), "won");
    expect(V.holding(rs(s), "france").regime).toBe("revolutionary_republic");
  },
  "show the card from the runtime sign data": (s) => {
    light(s, "french_revolution", monarchy(s, "France"), 2);
    const c = card(s);
    expect(c.signs.map((x) => x.label).sort()).toEqual(V.revolution("french_revolution").signs!.list.map((x) => x.label).sort());
    expect(c.signs.slice(0, 2).every((x) => x.lit)).toBe(true);
  },
  "re-arm a stopped revolution": (s) => {
    fire(s, "french_revolution", monarchy(s, "France"));
    take(s, "constitutional_monarchy");
    expect(track(s).rearmed).toBe(true);
  },
};
Then(/^it can (.+)$/, (s, ability: string) => {
  const fn = abilities[ability];
  expect(fn, ability).toBeDefined();
  fn!(s);
});
When("the revolution build runs", (s) => {
  s.build = s.layer ? V.buildLayer(s.layer) : built();
  act(s);
});
Then("it validates families, regimes against government forms, decrees, every sign leaf and stances", (s) => {
  const b = s.build as V.LayerBuild;
  expect(b.errors).toEqual([]);
  expect(b.checked).toEqual(expect.arrayContaining(["families", "regimes against government forms", "decrees", "sign leaves", "stances"]));
  const bad = V.defaultLayer();
  bad.revolutions.french_revolution!.signs!.list[0]!.if = { mood: { who: "$realm" } };
  bad.revolutions.french_revolution!.stances.radical_republic = "charge" as V.Stance;
  bad.regimes.reaction!.decrees = ["free_bread"];
  delete (bad.families.estates!.stance_labels as Record<string, string>).bend;
  const errs = V.validateLayer(bad);
  for (const m of ["undeclared condition mood", "option radical_republic has no stance", "unknown decree free_bread", "family estates: no bend label"]) expect(errs.join("\n")).toContain(m);
});
Then("it checks that every Fight option raises tagged rebels", (s) => {
  const bad = V.defaultLayer();
  const o = bad.events.french_revolution!.options.find((x) => x.id === "royal_reaction")!;
  o.effects.immediate = [];
  expect(V.validateLayer(bad)).toContain("revolution french_revolution: Fight option royal_reaction raises no tagged rebels");
});
Then("it merges the layer into a scratch copy of the event tree and runs the event tree's validator", (s) => {
  const b = s.build as V.LayerBuild;
  for (const id of Object.keys(V.revolutions)) expect(b.merged[id]).toEqual(b.patch[id]);
  for (const id of Object.keys(E.tree.events)) expect(b.merged[id]).toBeDefined();
  expect(b.treeReport).toHaveProperty("errors");
  expect(b.treeReport).toHaveProperty("warnings");
});
Then("it writes the catalogue, the runtime data and the event-tree patch", (s) => {
  const b = s.build as V.LayerBuild;
  expect(b.catalogue).toHaveLength(36);
  expect(Object.keys(b.runtime.revolutions)).toHaveLength(36);
  expect(Object.keys(b.patch)).toHaveLength(36);
});
Then("it does not edit the event tree itself", (s) => {
  const b = s.build as V.LayerBuild;
  expect(b.treeUntouched).toBe(true);
  expect(E.tree.events.french_revolution!.trigger).not.toEqual(b.patch.french_revolution!.trigger);
});
Then("it reports {int} revolutions, {int} regimes, {int} decrees and {int} families", (s, a: number, b: number, c: number, d: number) => {
  expect((s.build as V.LayerBuild).counts).toEqual({ revolutions: a, regimes: b, decrees: c, families: d });
});
Then("it reports {int} layer errors", (s, n: number) => {
  expect((s.build as V.LayerBuild).errors).toHaveLength(n);
});
Given("a regime names the form {string} which is not in the government forms", (s, form: string) => {
  expect(G.isFormId(form)).toBe(false);
  s.layer = V.defaultLayer();
  s.layer.regimes.commonwealth.form = form;
  s.badForm = form;
});
Then("it reports a layer error for that regime", (s) => {
  expect((s.build as V.LayerBuild).errors).toEqual([`regime commonwealth: unknown form ${s.badForm}`]);
});
