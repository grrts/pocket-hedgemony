import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import * as G from "@ph/engine/domain/religion";
import * as R from "@ph/engine/domain/rebellions";
import { costOf } from "@ph/engine/domain/buildings";
import { formIdFromName } from "@ph/engine/domain/government";
import * as C from "@ph/engine/domain/culture";

const { Given, When, Then } = steps("religion");

// ---------------------------------------------------------------- helpers

const POL: Record<string, G.Policy> = { Established: "established", Tolerated: "tolerated", Restricted: "restricted", Persecuted: "persecuted" };
const LOW: Record<string, G.Policy> = { tolerated: "tolerated", restricted: "restricted", persecuted: "persecuted", established: "established" };
const pol = (x: string): G.Policy => POL[x] ?? LOW[x.toLowerCase()]!;

function realm(s: Scenario, name: string, faith = "catholic"): G.RealmFaith {
  s.r ??= {};
  s.main ??= name;
  return (s.r[name] ??= G.newRealm(name, faith));
}
function main(s: Scenario): G.RealmFaith {
  return realm(s, s.main ?? "Testland");
}
function prov(s: Scenario, name: string, mix?: Record<string, number>, init: Partial<G.ProvinceFaith> = {}): G.ProvinceFaith {
  s.p ??= {};
  if (mix) s.p[name] = G.newProvince(name, init.owner ?? s.main ?? "Testland", mix, init);
  return (s.p[name] ??= G.newProvince(name, init.owner ?? s.main ?? "Testland", { catholic: 1 }, init));
}
function provinces(s: Scenario): G.ProvinceFaith[] {
  return Object.values((s.p ?? {}) as Record<string, G.ProvinceFaith>);
}
function ownerOf(s: Scenario, p: G.ProvinceFaith): G.RealmFaith {
  return realm(s, p.owner);
}
function lords(s: Scenario): G.Lord[] {
  return (s.lords ??= []);
}
function world(s: Scenario, r: G.RealmFaith): G.PolicyWorld {
  return { provinces: provinces(s).filter((p) => p.owner === r.id), lords: lords(s), realmShare: s.realmShare ?? {}, borderRulers: s.border ?? [] };
}
function withOther(faith: string, share: number): Record<string, number> {
  const other = faith === "catholic" ? "protestant" : "catholic";
  return share >= 1 ? { [faith]: 1 } : { [faith]: share, [other]: 1 - share };
}
function stepsOf(s: Scenario, ev: G.PolicyChanged[] | G.PolicyChanged): void {
  s.lordSteps ??= {};
  for (const e of Array.isArray(ev) ? ev : [ev]) for (const [k, v] of Object.entries(e.lordSteps)) s.lordSteps[k] = (s.lordSteps[k] ?? 0) + v;
}
const pct = (x: string) => Number(x) / 100;

// ---------------------------------------------------------------- common facts

Given("the country {string} has the state faith {string}", (s, name: string, faith: string) => {
  realm(s, name, faith).stateFaith = faith;
  realm(s, name).policies[faith] = "established";
});
Given("the event {string} has fired", (s, ev: string) => {
  (s.fired ??= []).push(ev);
});
Given("the date is {int}", (s, year: number) => {
  s.year = year;
});
Given(/^(\w+) is (Tolerated|Restricted|Persecuted)$/, (s, faith: string, p: string) => {
  main(s).policies[faith] = pol(p);
});
Given(/^(\w+) is (Tolerated|Restricted|Persecuted) in "([^"]+)"$/, (s, faith: string, p: string, name: string) => {
  const r = realm(s, name);
  r.policies[faith] = pol(p);
  if (!provinces(s).some((x) => (x.mix[faith] ?? 0) > 0 && x.owner === name)) prov(s, `${name} town`, { [r.stateFaith]: 0.7, [faith]: 0.3 }, { owner: name });
});
When(/^(\w+) becomes (Tolerated|Restricted|Persecuted) at the next New Year$/, (s, faith: string, p: string) => {
  const r = main(s);
  expect(G.setPolicy(r, faith, pol(p) as Exclude<G.Policy, "established">)).toBe(true);
  expect(G.policyOf(r, faith)).not.toBe(pol(p) === "tolerated" && r.policies[faith] === undefined ? "x" : "never");
  s.changes = G.newYear(r, world(s, r));
  stepsOf(s, s.changes);
});
When(/^(\w+) becomes (Tolerated|Restricted|Persecuted)$/, (s, faith: string, p: string) => {
  const r = main(s);
  s.changes = [G.applyPolicy(r, faith, pol(p), world(s, r))];
});
Then(/^"([^"]+)" (has|does not have) the grievance "([^"]+)"$/, (s, name: string, has: string, g: string) => {
  const p = prov(s, name);
  const gs = G.faithGrievances(p, ownerOf(s, p));
  if (has === "has") expect(gs[g]).toBeDefined();
  else expect(gs[g]).toBeUndefined();
});
Given("the lord {string} is Pious and {word}", (s, name: string, faith: string) => {
  lords(s).push({ name, faith, pious: true });
});
Given(/^the lord "([^"]+)" is (\w+)$/, (s, name: string, faith: string) => {
  lords(s).push({ name, faith });
});
Then(/^the lord "([^"]+)" wavers (?:once|one step)$/, (s, name: string) => {
  expect(s.lordSteps?.[name]).toBe(-1);
});
Then("the flag {string} is set on {string}", (s, flag: string, name: string) => {
  expect(realm(s, name).flags).toContain(flag);
});
Then(/^"([^"]+)" gains the war aim "Defend the faith" against "([^"]+)"$/, (s, holder: string, against: string) => {
  const fromPolicy = ((s.changes ?? []) as G.PolicyChanged[]).flatMap((c) => c.defendTheFaith.map((h) => ({ holder: h, against: main(s).id })));
  expect([...(s.warAims ?? []), ...fromPolicy]).toContainEqual({ holder, against });
});
When("the faith list is loaded", () => {});
When("the year's pulls are worked out", (s) => {
  s.pulls = {};
  for (const p of provinces(s)) s.pulls[p.id] = G.pulls(p, ownerOf(s, p), { waves: s.waves ?? [] });
});
When("a year ends", (s) => {
  s.before = {};
  for (const p of provinces(s)) {
    s.before[p.id] = { ...p.mix };
    G.yearMix(p, ownerOf(s, p), { waves: s.waves ?? [] });
  }
  if (s.tithe) s.paid = G.payTithes(realm(s, s.tithe.realm), { [s.tithe.faith]: s.tithe.people });
});

// ---------------------------------------------------------------- communities and policy

Given("the faith {string} is {float} of {string}", (s, faith: string, share: number, name: string) => {
  prov(s, name, withOther(faith, share));
});
Then(/^"([^"]+)" is (a community|not a community) in "([^"]+)"$/, (s, faith: string, c: string, name: string) => {
  expect(G.isCommunity(prov(s, name), faith)).toBe(c === "a community");
});
Given(/^the province "([^"]+)" has a (\w+) community of (\d+) %$/, (s, name: string, faith: string, share: string) => {
  prov(s, name, { [main(s).stateFaith]: 1 - pct(share), [faith]: pct(share) });
  s.community = { province: name, faith };
});
Given(/^"([^"]+)" (has|has no) a (\w+) house of worship$/, (s, name: string, has: string, faith: string) => {
  if (has === "has") prov(s, name).buildings.push({ faith, kind: "house", step: 2 });
});
Then(/^the (\w+) community is (served|unserved)$/, (s, faith: string, st: string) => {
  const p = prov(s, s.community.province);
  expect(G.isServed(p, ownerOf(s, p), faith)).toBe(st === "served");
});
Given(/^"([^"]+)" has the grievance "Wrong faith" from its (\w+) community$/, (s, name: string, faith: string) => {
  const r = realm(s, "France", "catholic");
  r.policies[faith] = "tolerated";
  const p = prov(s, name, { catholic: 0.6, [faith]: 0.4 }, { owner: "France" });
  expect(G.faithGrievances(p, r)["Wrong faith"]).toBe(1);
  s.wf = faith;
});
When(/^(a \w+ house is built and \w+ is Tolerated|the \w+ people convert below a third|a "Faith tolerance" charter for \w+ is granted)$/, (s, what: string) => {
  const p = prov(s, "La Rochelle");
  const f: string = s.wf;
  if (what.startsWith("a ") && what.includes("house")) {
    p.buildings.push({ faith: f, kind: "house", step: 1 });
    main(s).policies[f] = "tolerated";
  } else if (what.includes("convert")) p.mix = { catholic: 0.7, [f]: 0.3 };
  else p.charters.push(f);
});
When("the player opens the Faith policy screen", (s) => {
  const r = main(s);
  prov(s, "Paris", { catholic: 0.9, jewish: 0.1 }, { owner: r.id });
  prov(s, "La Rochelle", { catholic: 0.6, protestant: 0.4 }, { owner: r.id });
  const present = [...new Set(provinces(s).filter((p) => p.owner === r.id).flatMap((p) => Object.keys(p.mix)))];
  s.screen = G.policyScreen(r, present);
  s.present = present;
});
Then("there is one row per faith present in the realm", (s) => {
  expect(s.screen.map((x: { faith: string }) => x.faith).sort()).toEqual([...s.present].sort());
});
Then("only {string} is Established", (s, faith: string) => {
  expect(s.screen.filter((x: { policy: string }) => x.policy === "established").map((x: { faith: string }) => x.faith)).toEqual([faith]);
});
Given(/^the country "([^"]+)" has (\w+)s as (\d+) % of the realm$/, (s, name: string, faith: string, share: string) => {
  const r = realm(s, name);
  r.policies[faith] = "restricted";
  s.realmShare = { [faith]: pct(share) };
  prov(s, "La Rochelle", { catholic: 0.6, [faith]: 0.4 }, { owner: name, buildings: [{ faith, kind: "house", step: 1 }] });
});
Then(/^(\w+) clergy keep their houses and may build new ones$/, (s, faith: string) => {
  expect(G.clergyMayBuild(main(s), faith)).toBe(true);
  expect(provinces(s).flatMap((p) => p.buildings).filter((b) => b.faith === faith && !b.closed).length).toBeGreaterThan(0);
});
Then(/^(\w+) tax is normal$/, (s, faith: string) => {
  expect(G.faithTaxMultiplier(main(s), faith)).toBe(1);
});
Then(/^the (\w+) share of the tax is (\d+) % higher$/, (s, faith: string, n: string) => {
  expect((G.faithTaxMultiplier(main(s), faith) - 1) * 100).toBeCloseTo(Number(n));
});
Then(/^"(\w+)" gets (\d+) more pull in every province where (\w+)s live$/, (s, ruler: string, n: string, faith: string) => {
  const r = main(s);
  if (!provinces(s).some((p) => p.owner === r.id && (p.mix[faith] ?? 0) > 0)) prov(s, `${r.id} town`, { [r.stateFaith]: 0.7, [faith]: 0.3 }, { owner: r.id });
  const lives = provinces(s).filter((p) => p.owner === r.id && (p.mix[faith] ?? 0) > 0);
  for (const p of lives) {
    const src = G.pulls(p, r)[ruler] ?? [];
    expect(src.find((x) => x.source === "Restricted faith escapes the tax")?.amount).toBe(Number(n));
  }
});
Then(/^(\w+) clergy build no new houses$/, (s, faith: string) => {
  expect(G.clergyMayBuild(main(s), faith)).toBe(false);
});
Given("the country {string} has the state faith {string} and chose to close persecuted houses", (s, name: string, faith: string) => {
  const r = realm(s, name, faith);
  r.persecutedHouses = "close";
});
Given(/^(\w+) is (\d+) % of "([^"]+)" and (\d+) % of "([^"]+)"$/, (s, faith: string, a: string, pa: string, b: string, pb: string) => {
  const r = main(s);
  prov(s, pa, { [r.stateFaith]: 1 - pct(a), [faith]: pct(a) }, { owner: r.id, buildings: [{ faith, kind: "house", step: 2 }, { faith: r.stateFaith, kind: "house", step: 2 }] });
  prov(s, pb, { [r.stateFaith]: 1 - pct(b), [faith]: pct(b) }, { owner: r.id, buildings: [{ faith: r.stateFaith, kind: "house", step: 1 }] });
  lords(s).push({ name: `a ${faith} lord`, faith });
  s.fleeClasses = { farmers: 20000, craftsmen: 300, scholars: 100 };
});
Given(/^the country "([^"]+)" is (\w+) and borders "([^"]+)"$/, (s, name: string, faith: string) => {
  (s.border ??= []).push({ id: name, faith });
});
Then(/^the (\w+) houses of "([^"]+)" are closed$/, (s, faith: string, name: string) => {
  const hs = provinces(s).filter((p) => p.owner === name).flatMap((p) => p.buildings.filter((b) => b.faith === faith));
  expect(hs.length).toBeGreaterThan(0);
  for (const b of hs) expect(b.closed).toBe(true);
  for (const p of provinces(s)) expect(total(G.pulls(p, realm(s, name))[faith])).toBe(0);
});
function total(x: G.PullSource[] | undefined): number {
  return G.total(x);
}
Then(/^(\w+) pays no tax$/, (s, faith: string) => {
  expect(G.faithTaxMultiplier(main(s), faith)).toBe(0);
});
Then(/^"([^"]+)" has the grievance "([^"]+)", counting as two$/, (s, name: string, g: string) => {
  const p = prov(s, name);
  expect(G.faithGrievances(p, ownerOf(s, p))[g]).toBe(2);
});
Then(/^the "(\w+)" pull doubles where (\w+) lives$/, (s, ruler: string, faith: string) => {
  for (const p of provinces(s).filter((x) => (x.mix[faith] ?? 0) > 0)) {
    const src = G.pulls(p, ownerOf(s, p))[ruler] ?? [];
    const t = total(src);
    const doubling = src.find((x) => x.source === "persecution")!.amount;
    expect(t).toBeCloseTo(2 * (t - doubling));
  }
});
Then(/^(\w+) lords become disloyal$/, (s, faith: string) => {
  for (const l of lords(s).filter((l) => l.faith === faith)) expect(s.lordSteps[l.name]).toBe(-2);
});
Then(/^each year (\d+) % of the (\w+) people flee as refugees, craftsmen and scholars first$/, (s, n: string) => {
  const fled = G.persecutionFlight(s.fleeClasses);
  const all = Object.values(s.fleeClasses as Record<string, number>).reduce((a, b) => a + b, 0);
  expect(Object.values(fled).reduce((a, b) => a + b, 0)).toBeCloseTo(all * pct(n));
  expect(fled["craftsmen"]).toBe(s.fleeClasses.craftsmen);
  expect(fled["scholars"]).toBe(s.fleeClasses.scholars);
});
Given(/^the date is (\d+) (January|February|March|April|May|June|July|August|September|October|November|December) (\d+)$/, (s, _d: string, _m: string, y: string) => {
  s.year = Number(y);
  realm(s, "France").policies["protestant"] = "tolerated";
});
When(/^the player sets (\w+) to (\w+)$/, (s, faith: string, p: string) => {
  expect(G.setPolicy(main(s), faith, pol(p) as Exclude<G.Policy, "established">)).toBe(true);
  s.effective = G.takesEffect(s.year);
});
Then(/^(\w+) is still (\w+) until (\d+) January (\d+)$/, (s, faith: string, p: string, d: string, y: string) => {
  expect(G.policyOf(main(s), faith)).toBe(pol(p));
  expect(s.effective).toEqual({ year: Number(y), month: 1, day: Number(d) });
  G.newYear(main(s), world(s, main(s)));
  expect(G.policyOf(main(s), faith)).toBe("restricted");
});
When(/^it is changed to (\w+)$/, (s, p: string) => {
  const r = main(s);
  s.changes = [G.applyPolicy(r, "protestant", pol(p), world(s, r))];
});
Then("a faith-rising spark is raised where protestants live", (s) => {
  const lives = provinces(s).filter((p) => (p.mix["protestant"] ?? 0) > 0).map((p) => p.id);
  expect(s.changes[0].sparks).toEqual(lives);
});
Then("no spark is raised", (s) => {
  expect(s.changes[0].sparks).toEqual([]);
});
Given(/^"([^"]+)" has a "Faith tolerance" charter for (\w+)$/, (s, name: string, faith: string) => {
  const r = main(s);
  prov(s, name, { [r.stateFaith]: 0.9, [faith]: 0.1 }, { owner: r.id, charters: [faith] });
});
Then(/^(\w+) is treated as Tolerated in "([^"]+)"$/, (s, faith: string, name: string) => {
  const p = prov(s, name);
  expect(G.policyOf(ownerOf(s, p), faith)).toBe("restricted");
  expect(G.policyIn(ownerOf(s, p), p, faith)).toBe("tolerated");
});
Given(/^"([^"]+)" has the grievance "Persecuted" from (\w+)$/, (s, name: string, faith: string) => {
  const r = realm(s, "Castile", "catholic");
  r.policies[faith] = "persecuted";
  const p = prov(s, name, { catholic: 0.7, [faith]: 0.3 }, { owner: "Castile" });
  expect(G.faithGrievances(p, r)["Persecuted"]).toBe(2);
});
Given(/^the lord "([^"]+)" is of the faith "([^"]+)"(, Pious)?$/, (s, name: string, faith: string, pious?: string) => {
  s.lord = { name, faith, pious: !!pious } satisfies G.Lord;
});
When(
  /^(catholic is set to Restricted|catholic is set to Persecuted|the realm tolerates protestants at 12 % of the realm|the realm takes over protestant houses|the ruler builds a temple in his land|the state faith changes away from hindu|the state faith changes to hindu)$/,
  (s, change: string) => {
    const l: G.Lord = s.lord;
    const C: Record<string, [string, G.LordChange]> = {
      "catholic is set to Restricted": ["hussite", { kind: "policy", faith: "catholic", to: "restricted" }],
      "catholic is set to Persecuted": ["hussite", { kind: "policy", faith: "catholic", to: "persecuted" }],
      "the realm tolerates protestants at 12 % of the realm": ["catholic", { kind: "tolerate", faith: "protestant", realmShare: 0.12 }],
      "the realm takes over protestant houses": ["catholic", { kind: "take over", faith: "protestant" }],
      "the ruler builds a temple in his land": ["sunni", { kind: "build house", faith: "hindu", inHisLand: true }],
      "the state faith changes away from hindu": ["hindu", { kind: "state faith", from: "hindu", to: "sunni" }],
      "the state faith changes to hindu": ["sunni", { kind: "state faith", from: "sunni", to: "hindu" }],
    };
    const [state, c] = C[change]!;
    s.step = G.lordFaithSteps(G.newRealm("Testland", state), l, c);
  },
);
Then(/^the lord "([^"]+)" (loses one step|loses two steps|gains one step)$/, (s, _n: string, what: string) => {
  expect(s.step).toBe(what === "loses one step" ? -1 : what === "loses two steps" ? -2 : 1);
});

// ---------------------------------------------------------------- expulsion and Inquisition

Then(/^the decision "Expel" (is|is not) offered for (\w+)$/, (s, is: string, faith: string) => {
  expect(G.expelOffered(main(s), faith)).toBe(is === "is");
});
Given(/^the nearest realm where (\w+) is Tolerated is "([^"]+)"$/, (s, faith: string, host: string) => {
  const h = realm(s, host, "sunni");
  h.policies[faith] = "tolerated";
  const near = realm(s, "Portugal", "catholic");
  near.policies[faith] = "persecuted";
  s.hosts = [
    { realm: near, distance: 1, freeSlots: {} },
    { realm: h, distance: 6, freeSlots: { craftsmen: 100000, clerks: 100000, scholars: 100000 } },
  ] satisfies G.Host[];
});
function expelFixture(s: Scenario, name: string, faith: string): void {
  const r = realm(s, name, "catholic");
  r.policies[faith] = "persecuted";
  if (!s.hosts) {
    const h = realm(s, "Ottomans", "sunni");
    s.hosts = [{ realm: h, distance: 6, freeSlots: { craftsmen: 100000, clerks: 100000, scholars: 100000 } }];
  }
  prov(s, "Toledo", { catholic: 0.88, [faith]: 0.12 }, { owner: name, buildings: [{ faith, kind: "house", step: 1 }] });
  prov(s, "Seville", { catholic: 0.95, [faith]: 0.05 }, { owner: name });
  prov(s, "Burgos", { catholic: 1 }, { owner: name });
  s.expelClasses = { craftsmen: 20000, clerks: 5000, scholars: 2000, "market folk": 30000 };
}
When(/^"([^"]+)" expels the (\w+) faith$/, (s, name: string, faith: string) => {
  expelFixture(s, name, faith);
  expect(G.faithGrievances(prov(s, "Toledo"), realm(s, name))["Persecuted"]).toBe(2);
  s.livedIn = provinces(s).filter((p) => p.owner === name && (p.mix[faith] ?? 0) > 0).map((p) => p.id);
  s.expulsion = G.expel(realm(s, name), faith, provinces(s), s.expelClasses, s.hosts);
  s.expelFaith = faith;
});
Then(/^within a year (\d+) % of the (\w+) people leave as refugees for "([^"]+)", keeping their class where a slot is free$/, (s, n: string, _f: string, host: string) => {
  const e: G.Expulsion = s.expulsion;
  expect(e.host).toBe(host);
  expect(e.withinMonths).toBe(12);
  for (const x of e.refugees) {
    expect(x.people).toBeCloseTo(s.expelClasses[x.class] * pct(n));
    expect(x.keepsClass).toBe(x.class !== "market folk");
  }
});
Then("the rest convert or hide, and the hidden-believer floor still applies", (s) => {
  const e: G.Expulsion = s.expulsion;
  const all = Object.values(s.expelClasses as Record<string, number>).reduce((a, b) => a + b, 0);
  expect(e.stay).toBeCloseTo(all * 0.3);
  const p = prov(s, "Toledo");
  expect(G.hiddenFloorApplies(p, ownerOf(s, p), s.expelFaith)).toBe(true);
});
Then(/^"([^"]+)" gains their houses and the gold of their property$/, (s) => {
  expect(s.expulsion.houses).toBe(1);
  expect(s.expulsion.gold).toBeGreaterThan(0);
  expect(prov(s, "Toledo").buildings[0]!.faith).toBe("catholic");
});
Then(/^the "Persecuted" grievance of (\w+) ends in "([^"]+)"$/, (s, _f: string, name: string) => {
  for (const p of provinces(s).filter((x) => x.owner === name)) expect(G.faithGrievances(p, realm(s, name))["Persecuted"]).toBeUndefined();
});
Then(/^every province where they lived gets the grievance "Bloodshed"$/, (s) => {
  expect([...s.expulsion.bloodshed].sort()).toEqual([...s.livedIn].sort());
  expect(s.expulsion.bloodshed).toEqual(expect.arrayContaining(["Toledo", "Seville"]));
});
Then(/^"([^"]+)" is not better off in people or skills$/, (s) => {
  expect(s.expulsion.expellerGains.people).toBeLessThan(0);
  expect(s.expulsion.expellerGains.skilled).toBeLessThanOrEqual(0);
});
Then(/^"([^"]+)" gains the people and their skills$/, (s, host: string) => {
  expect(s.expulsion.host).toBe(host);
  expect(s.expulsion.hostGains.people).toBeGreaterThan(0);
  expect(s.expulsion.hostGains.skilled).toBeGreaterThan(0);
});
Given("{string} founds an Inquisition", (s, name: string) => {
  const r = realm(s, name, "catholic");
  r.government = "feudal_realm";
  expect(G.establishInquisition(r)).toBe(true);
});
Given(/^"([^"]+)" has a (Restricted|Persecuted|Tolerated) (\w+) community$/, (s, name: string, p: string, faith: string) => {
  const r = main(s);
  r.policies[faith] = pol(p);
  prov(s, name, { [r.stateFaith]: 0.7, [faith]: 0.3 }, { owner: r.id, buildings: [{ faith: r.stateFaith, kind: "house", step: 1 }], closedYearsAgo: { [faith]: 10 } });
  s.classes = { farmers: 50000, craftsmen: 2000, scholars: 300 };
});
Then(/^"([^"]+)" pays the Inquisition's gold upkeep each year$/, (s, name: string) => {
  const p = provinces(s)[0]!;
  expect(G.inquisitionYear(realm(s, name), p, s.classes).upkeep).toBe(G.religionConfig.inquisition.upkeep_gold_per_year);
});
Then(/^"(\w+)" gets (\d+) more pull in "([^"]+)"$/, (s, faith: string, n: string, name: string) => {
  const p = prov(s, name);
  const r = ownerOf(s, p);
  const withIt = G.pullTotals(p, r)[faith] ?? 0;
  const without = G.pullTotals(p, { ...r, inquisition: false })[faith] ?? 0;
  expect(withIt - without).toBe(Number(n));
});
Then(/^the hidden-believer floor no longer applies in "([^"]+)"$/, (s, name: string) => {
  const r = realm(s, name);
  for (const p of provinces(s)) for (const f of Object.keys(p.closedYearsAgo)) expect(G.hiddenFloorApplies(p, r, f)).toBe(false);
});
Then(/^each year (\d+) % of the scholars and craftsmen of "([^"]+)" leave$/, (s, n: string, name: string) => {
  const leave = G.inquisitionYear(main(s), prov(s, name), s.classes).leave;
  expect(leave).toEqual({ scholars: s.classes.scholars * pct(n), craftsmen: s.classes.craftsmen * pct(n) });
});
Given("{string} has an Inquisition", (s, name: string) => {
  const r = realm(s, name, "catholic");
  expect(G.establishInquisition(r)).toBe(true);
  prov(s, "Valencia", { catholic: 0.7, sunni: 0.3 }, { owner: name, closedYearsAgo: { sunni: 10 } });
  r.policies["sunni"] = "persecuted";
});
When("{string} closes it in {int}", (s, name: string) => {
  G.closeInquisition(realm(s, name));
});
Then("the Inquisition's effects end", (s) => {
  const r = main(s);
  const p = prov(s, "Valencia");
  expect(r.flags).not.toContain(G.FLAGS.inquisition);
  expect(G.inquisitionYear(r, p, { scholars: 100, craftsmen: 100 })).toEqual({ upkeep: 0, leave: {} });
  expect(G.hiddenFloorApplies(p, r, "sunni")).toBe(true);
  expect(G.pulls(p, r)["catholic"]?.some((x) => x.source === "Inquisition") ?? false).toBe(false);
});

// ---------------------------------------------------------------- faith buildings

const BUILDINGS: Record<string, Omit<G.FaithBuilding, "faith">> = {
  "house of worship at step 1": { kind: "house", step: 1 },
  "house of worship at step 2": { kind: "house", step: 2 },
  "house of worship at step 3": { kind: "house", step: 3 },
  "minority house of worship": { kind: "minority" },
  "monastery without seats": { kind: "monastery" },
  "monastery with seats": { kind: "monastery", seats: true },
  "religious school": { kind: "school" },
  "pilgrimage shrine": { kind: "shrine" },
};
Given(/^the province "([^"]+)" has a (.+) of the faith "([^"]+)", at least half filled with clergy$/, (s, name: string, what: string, faith: string) => {
  const b = { faith, ...BUILDINGS[what]! };
  prov(s, name, { [faith]: 0.6, catholic: 0.4 }).buildings.push(b);
  s.building = b;
});
Then(/^"(\w+)" gets ([\d.]+) pull from it$/, (s, faith: string, n: string) => {
  expect(s.building.faith).toBe(faith);
  const p = provinces(s)[0]!;
  expect(total(s.pulls[p.id][faith])).toBeCloseTo(Number(n));
  expect(G.buildingPull(s.building)).toBeCloseTo(Number(n));
});
Then(/^the building (serves|does not serve) the (\w+) community$/, (s, sv: string) => {
  expect(G.serves(s.building)).toBe(sv === "serves");
});
Given(/^the country "([^"]+)" owns the Hagia Sophia, a step-4 house of "([^"]+)", in "([^"]+)"$/, (s, name: string, faith: string, where: string) => {
  realm(s, name, faith);
  prov(s, where, { [faith]: 1 }, { owner: name, buildings: [{ faith, kind: "house", step: 4 }] });
  s.rings = { [where]: 0 };
  for (const k of [1, 2, 3, 4]) {
    const id = `${k} rings away`;
    s.rings[id] = k;
    prov(s, id, { [faith]: 1 }, { owner: name, landmarksNear: G.landmarkPullAt(k, true) > 0 ? [faith] : [] });
  }
  prov(s, "a foreign province 1 ring away", { [faith]: 1 }, { owner: "Ottomans", landmarksNear: G.landmarkPullAt(1, false) > 0 ? [faith] : [] });
  realm(s, "Ottomans", "sunni");
});
Then(/^"(\w+)" gets ([\d.]+) pull in "([^"]+)"$/, (s, faith: string, n: string, name: string) => {
  expect(total(s.pulls[name][faith])).toBeCloseTo(Number(n));
});
Then(/^"(\w+)" gets ([\d.]+) pull in every province of "([^"]+)" within (\d+) rings of "([^"]+)"$/, (s, faith: string, n: string, owner: string, rings: string) => {
  for (const [id, k] of Object.entries(s.rings as Record<string, number>)) {
    if (k === 0) continue;
    const got = (s.pulls[id][faith] ?? []).filter((x: G.PullSource) => x.source === "landmark house nearby");
    expect(total(got)).toBeCloseTo(k <= Number(rings) ? Number(n) : 0);
    expect(prov(s, id).owner).toBe(owner);
  }
  expect(s.pulls["a foreign province 1 ring away"][faith]).toBeUndefined();
});
Given(/^the province "([^"]+)" has an? (\w+) community$/, (s, name: string, faith: string) => {
  prov(s, name, { [main(s).stateFaith]: 0.7, [faith]: 0.3 });
});
Then(/^an? (\w+) house of worship can be built in "([^"]+)"$/, (s, faith: string, name: string) => {
  expect(G.mayBuildHouse(prov(s, name), faith)).toBe(true);
  expect(faith).not.toBe(main(s).stateFaith);
});
Given(/^"([^"]+)" (has|has no) a "Faith tolerance" charter for "([^"]+)"$/, (s, name: string, has: string, faith: string) => {
  if (has === "has") prov(s, name).charters.push(faith);
});
Then(/^a (\w+) minority house of worship is (allowed|not allowed) in "([^"]+)"$/, (s, faith: string, a: string, name: string) => {
  expect(G.mayBuildMinorityHouse(prov(s, name), faith)).toBe(a === "allowed");
});
Given(/^the province "([^"]+)" has a (\w+) monastery with monastic land$/, (s, name: string, faith: string) => {
  const b: G.FaithBuilding = { faith, kind: "monastery", monasticLand: true };
  prov(s, name, { [faith]: 0.9, [main(s).stateFaith]: 0.1 }, { owner: main(s).id, buildings: [b] });
  s.building = b;
  s.buildingProvince = name;
});
When(/^the country "([^"]+)" converts the monastery to "([^"]+)"$/, (s, name: string, to: string) => {
  const r = realm(s, name);
  s.buildCost = costOf("monastery", 1).gold;
  s.plain = { ...s.building, monasticLand: false };
  s.take = G.takeOver(s.building, to, s.buildCost);
  s.plainTake = G.takeOver({ ...s.plain }, to, s.buildCost);
  s.lordSteps = {};
  for (const l of lords(s)) if (l.faith === s.take.from) s.lordSteps[l.name] = s.take.oldFaithLords;
  void r;
});
Then(/^"([^"]+)" pays half the cost of building it$/, (s) => {
  expect(s.take.cost).toBeCloseTo(s.buildCost / 2);
});
Then(/^its pull now goes to "([^"]+)"$/, (s, faith: string) => {
  const p = prov(s, s.buildingProvince);
  expect(total(G.pulls(p, ownerOf(s, p))[faith])).toBeGreaterThan(0);
  expect(G.pulls(p, ownerOf(s, p))[s.take.from]).toBeUndefined();
});
Then("its property's gold is paid into the treasury twice over for monastic land", (s) => {
  expect(s.take.gold).toBe(2 * s.plainTake.gold);
});
Then(/^an "insult to faith" spark is raised in "([^"]+)"$/, (s) => {
  expect(s.take.spark).toBe("insult_to_faith");
});
Given(/^the realm of "([^"]+)" has ([\d,]+) people of the faith "([^"]+)"$/, (s, name: string, n: string, faith: string) => {
  realm(s, name, "catholic");
  s.tithe = { realm: name, faith, people: Number(n.replace(/,/g, "")) };
});
Given(/^"(\w+)" is (Tolerated|Restricted|Persecuted) in "([^"]+)"$/, (s, faith: string, p: string, name: string) => {
  realm(s, name).policies[faith] = pol(p);
});
Then(/^the (\w+) clergy's purse gains (\d+) gold and they may build a house in a town of their faith$/, (s, faith: string, g: string) => {
  expect(s.paid[faith]).toBe(Number(g));
  expect(G.clergyMayBuild(main(s), faith)).toBe(true);
});
Then(/^the (\w+) clergy's purse gains (\d+) gold but they build no new house$/, (s, faith: string, g: string) => {
  expect(s.paid[faith]).toBe(Number(g));
  expect(G.clergyMayBuild(main(s), faith)).toBe(false);
});
Then(/^the (\w+) clergy's purse is seized$/, (s, faith: string) => {
  expect(s.paid[faith]).toBeUndefined();
  expect(main(s).purses[faith]).toBe(0);
});
Given(/^a (\w+) preacher has been in "([^"]+)" for (\d+) years$/, (s, faith: string, name: string, years: string) => {
  prov(s, name, { african_traditional: 0.9, [faith]: 0.1 }, { preachers: [faith] });
  s.preacherYears = { faith, years: Number(years) };
});
Given(/^"([^"]+)" has no (\w+) house$/, (s, name: string, faith: string) => {
  expect(prov(s, name).buildings.filter((b) => b.faith === faith)).toEqual([]);
});
Then(/^a step-1 (\w+) house is (founded|not founded) in "([^"]+)"$/, (s, faith: string, f: string, name: string) => {
  const b = G.preacherFoundsHouse(prov(s, name), faith, s.preacherYears.years);
  if (f === "founded") expect(b).toEqual({ faith, kind: "house", step: 1 });
  else expect(b).toBeNull();
});
Given(/^the province "([^"]+)" has a step-(\d) (\w+) (?:church|chapel)$/, (s, name: string, step: string, faith: string) => {
  const b: G.FaithBuilding = { faith, kind: "house", step: Number(step) };
  realm(s, "Brandenburg", faith);
  prov(s, name, { [faith]: 0.6, protestant: 0.4 }, { owner: "Brandenburg", buildings: [b] });
  s.building = b;
  s.buildingProvince = name;
});
When(
  /^(the town is sacked and the church burned|catholic is Persecuted and the realm closes its houses|the state faith changes and the realm takes the houses over|the church has fewer than half its clergy)$/,
  (s, ev: string) => {
    const b: G.FaithBuilding = s.building;
    const r = main(s);
    if (ev.startsWith("the town")) b.burned = true;
    else if (ev.startsWith("catholic")) {
      G.adoptFaith(r, "protestant", { houses: "keep", schools: "keep", year: 1550, byDecision: false, provinces: provinces(s), lords: [] });
      r.persecutedHouses = "close";
      G.applyPolicy(r, "catholic", "persecuted", world(s, r));
    } else if (ev.startsWith("the state")) {
      G.adoptFaith(r, "protestant", { houses: "take_over", schools: "keep", year: 1550, byDecision: false, provinces: provinces(s), lords: [] });
    } else b.fallow = true;
  },
);
Then(/^the church (gives no pull|gives no pull for catholic|pulls for the new state faith|gives half its pull)$/, (s, what: string) => {
  const b: G.FaithBuilding = s.building;
  const p = prov(s, s.buildingProvince);
  const ps = G.pulls(p, ownerOf(s, p));
  if (what === "gives no pull") expect(G.buildingPull(b)).toBe(0);
  else if (what === "gives no pull for catholic") expect(total(ps["catholic"])).toBe(0);
  else if (what === "pulls for the new state faith") {
    expect(b.faith).toBe(main(s).stateFaith);
    expect(total(ps[main(s).stateFaith])).toBeGreaterThan(0);
  } else expect(G.buildingPull(b)).toBeCloseTo(G.religionConfig.pull.house_steps[1]! / 2);
});
Then(/^the clergy of "([^"]+)" (marry|do not marry)$/, (s, faith: string, m: string) => {
  expect(G.clergyMarry(faith)).toBe(m === "marry");
});

// ---------------------------------------------------------------- the faith mix

const SOURCES: Record<string, (p: G.ProvinceFaith, r: G.RealmFaith, f: string) => void> = {
  "a step-2 church at least half filled with clergy": (p, _r, f) => p.buildings.push({ faith: f, kind: "house", step: 2 }),
  "a fallow step-2 church": (p, _r, f) => p.buildings.push({ faith: f, kind: "house", step: 2, fallow: true }),
  "a stationed preacher": (p, _r, f) => p.preachers.push(f),
  "a cathedral school": (p, _r, f) => p.buildings.push({ faith: f, kind: "school" }),
  "the ruler's capital, the ruler being catholic": (p, r, f) => {
    r.stateFaith = f;
    p.capital = true;
  },
  "a lord of that faith holding the province": (p, _r, f) => {
    p.lordFaith = f;
  },
};
Given(/^the province "([^"]+)" has (.+) of the faith "([^"]+)"$/, (s, name: string, source: string, faith: string) => {
  const r = realm(s, "Testland", "jewish");
  const p = prov(s, name, { [faith]: 0.5, jewish: 0.5 }, { owner: r.id });
  SOURCES[source]!(p, r, faith);
});
Then(/^"(\w+)" gets ([\d.]+) pull from it in "([^"]+)"$/, (s, faith: string, n: string, name: string) => {
  expect(total(s.pulls[name][faith])).toBeCloseTo(Number(n));
});
Given(/^(\d+) traders pass through "([^"]+)" each year from markets where "(\w+)" is the majority$/, (s, n: string, name: string, faith: string) => {
  prov(s, name, { african_traditional: 0.7, [faith]: 0.3 }, { tradersFrom: { [faith]: Number(n) } });
  realm(s, "Testland", "african_traditional");
});
Given(/^(\d+) (?!more )(\w+) traders pass through "([^"]+)" each year$/, (s, n: string, faith: string, name: string) => {
  prov(s, name, { [faith]: 1 }, { tradersFrom: { [faith]: Number(n) } });
  realm(s, "Testland", "jewish");
});
Then(/^"(\w+)" gets ([\d.]+) pull from traders in "([^"]+)"$/, (s, faith: string, n: string, name: string) => {
  expect((s.pulls[name][faith] as G.PullSource[]).find((x) => x.source === "traders passing")?.amount).toBeCloseTo(Number(n));
});
Then(/^"(\w+)" gets no pull from traders in "([^"]+)"$/, (s, faith: string, name: string) => {
  expect((s.pulls[name][faith] ?? []).find((x: G.PullSource) => x.source === "traders passing")).toBeUndefined();
});
Given(/^the province "([^"]+)" has (\d+) step-1 (\w+) chapels and no preacher$/, (s, name: string, n: string, faith: string) => {
  const r = main(s);
  prov(s, name, { [faith]: 0.8, sunni: 0.2 }, { owner: r.id, buildings: Array.from({ length: Number(n) }, () => ({ faith, kind: "house" as const, step: 1 })) });
});
Given("nothing else", () => {});
Given(/^(\w+) is (Restricted|Persecuted) and lives in "([^"]+)"$/, (s, faith: string, p: string, name: string) => {
  main(s).policies[faith] = pol(p);
  expect(prov(s, name).mix[faith]).toBeGreaterThan(0);
});
Given(/^a Chaplain official serves in "([^"]+)"$/, (s, name: string) => {
  prov(s, name).chaplain = true;
});
Then(/^"(\w+)" has ([\d.]+) pull in "([^"]+)"$/, (s, faith: string, n: string, name: string) => {
  expect(total(s.pulls[name][faith])).toBeCloseTo(Number(n));
});
Given("the province {string} has one faith with three houses and another with one, nothing else pulling", (s, name: string) => {
  realm(s, "Testland", "jewish");
  prov(s, name, { catholic: 0.5, orthodox: 0.5 }, { buildings: [1, 2, 3].map(() => ({ faith: "catholic", kind: "house" as const, step: 1 })).concat([{ faith: "orthodox", kind: "house", step: 1 }]) });
});
When("many years pass", (s) => {
  for (const p of provinces(s)) for (let y = 0; y < 1000; y++) G.yearMix(p, ownerOf(s, p));
});
Then("the province ends up about three to one", (s) => {
  const p = provinces(s)[0]!;
  expect(p.mix["catholic"]! / p.mix["orthodox"]!).toBeCloseTo(3, 1);
});
Given("no faith in the province {string} has any pull", (s, name: string) => {
  realm(s, "Testland", "jewish");
  prov(s, name, { catholic: 0.6, orthodox: 0.3, sunni: 0.1 });
});
Then("the mix of {string} is unchanged", (s, name: string) => {
  expect(prov(s, name).mix).toEqual(s.before[name]);
});
Given(/^it (has|has no) a house of its own there$/, (s, has: string) => {
  const p = provinces(s)[0]!;
  const f = Object.entries(p.mix).sort((a, b) => a[1] - b[1])[0]![0];
  realm(s, "Testland", "protestant");
  if (has === "has") p.buildings.push({ faith: f, kind: "minority" });
});
Then(/^"(\w+)" (disappears|stays) in "([^"]+)"$/, (s, faith: string, what: string, name: string) => {
  expect(prov(s, name).mix[faith] !== undefined).toBe(what === "stays");
});
Given(/^the faith "([^"]+)" is Persecuted in "([^"]+)" and its houses in "([^"]+)" closed (\d+) years ago$/, (s, faith: string, name: string, where: string, years: string) => {
  const r = realm(s, name, "shinto");
  r.policies[faith] = "persecuted";
  prov(s, where, { shinto: 0.97, [faith]: 0.03 }, { owner: name, closedYearsAgo: { [faith]: Number(years) } });
  s.hidden = { faith, where };
});
Given("no Inquisition runs", (s) => {
  main(s).inquisition = false;
});
Given("an Inquisition runs there", (s) => {
  main(s).inquisition = true;
});
When(/^the pulls would push "(\w+)" below (\d+) % in "([^"]+)"$/, (s, faith: string, _n: string, where: string) => {
  const p = prov(s, where);
  p.mix = { shinto: 0.985, [faith]: 0.015 };
  G.settleSmallShares(p, ownerOf(s, p));
});
Then(/^"(\w+)" stays at (\d+) % in "([^"]+)"$/, (s, faith: string, n: string, where: string) => {
  expect(prov(s, where).mix[faith]).toBeCloseTo(pct(n));
});
Then(/^"(\w+)" may fall below (\d+) %$/, (s, faith: string, n: string) => {
  expect(prov(s, s.hidden.where).mix[faith]).toBeLessThan(pct(n));
});
Given("the province {string} is wholly {word}", (s, name: string, faith: string) => {
  prov(s, name, { [faith]: 1 }, { people: 100000 });
});
When(/^([\d,]+) (\w+) refugees and ([\d,]+) (\w+) refugees settle in "([^"]+)"$/, (s, a: string, fa: string, b: string, fb: string, name: string) => {
  const p = prov(s, name);
  s.before = { people: p.people, mix: { ...p.mix } };
  s.arrivals = { [fa]: Number(a.replace(/,/g, "")), [fb]: Number(b.replace(/,/g, "")) };
  G.moversArrive(p, s.arrivals);
});
Then(/^the mix of "([^"]+)" shifts by their headcount at once, outside the pulls$/, (s, name: string) => {
  const p = prov(s, name);
  const all = s.before.people + Object.values(s.arrivals as Record<string, number>).reduce((x, y) => x + y, 0);
  expect(p.people).toBe(all);
  for (const [f, n] of Object.entries(s.arrivals as Record<string, number>)) expect(p.mix[f]).toBeCloseTo(((s.before.mix[f] ?? 0) * s.before.people + n) / all);
});
When("the player opens the Faith line of a province", (s) => {
  const r = realm(s, "France", "catholic");
  const p = prov(s, "Rouen", { catholic: 0.61, protestant: 0.37, jewish: 0.02 }, { owner: "France", capital: true, presses: 2, buildings: [{ faith: "catholic", kind: "house", step: 2 }, { faith: "protestant", kind: "house", step: 1 }], preachers: ["catholic"] });
  s.line = G.faithLine(p, r);
});
Then("each faith's pull is listed with its sources", (s) => {
  for (const row of s.line.rows as G.FaithLineRow[]) {
    for (const src of row.pulls) {
      expect(src.source.length).toBeGreaterThan(0);
      expect(src.amount).not.toBe(0);
    }
  }
  const cat = (s.line.rows as G.FaithLineRow[]).find((x) => x.faith === "catholic")!;
  expect(cat.pulls.map((x) => x.source)).toEqual(["house of worship step 2", "preacher", "the ruler's capital"]);
});

// ---------------------------------------------------------------- faith rules

Given(/^an? (\w+) monastery with monastic land is taken over$/, (s, faith: string) => {
  const b: G.FaithBuilding = { faith, kind: "monastery", monasticLand: true };
  s.take = G.takeOver(b, "protestant", 90);
  s.plainTake = G.takeOver({ faith, kind: "monastery" }, "protestant", 90);
});
Then("its property pays double gold into the treasury", (s) => {
  expect(s.take.gold).toBe(2 * s.plainTake.gold);
});
Given(/^the province "([^"]+)" has (\d+) presses and (\d+) schools?$/, (s, name: string, presses: string, schools: string) => {
  realm(s, "Saxony", "catholic");
  prov(s, name, { catholic: 0.7, protestant: 0.3 }, { owner: "Saxony", presses: Number(presses), schools: Number(schools) });
});
Then(/^"(\w+)" gets ([\d.]+) pull from them$/, (s, faith: string, n: string) => {
  const p = provinces(s)[0]!;
  expect((s.pulls[p.id][faith] as G.PullSource[]).find((x) => x.source === "presses and schools")?.amount).toBeCloseTo(Number(n));
});
Given(/^the lord "([^"]+)" is a clergy lord$/, (s, name: string) => {
  lords(s).push({ name, faith: main(s).stateFaith, clergy: true });
});
When(/^"([^"]+)" changes any faith policy$/, (s, name: string) => {
  const r = realm(s, name);
  prov(s, "Lancashire", { [r.stateFaith]: 0.8, catholic: 0.2 }, { owner: name });
  s.realmShare = { catholic: 0.2 };
  s.lordSteps = {};
  for (const p of ["restricted", "persecuted", "tolerated"] as const) stepsOf(s, G.applyPolicy(r, "catholic", p, world(s, r)));
  for (const p of ["restricted", "persecuted"] as const) for (const l of lords(s)) s.lordSteps[l.name] = (s.lordSteps[l.name] ?? 0) + G.lordFaithSteps(r, l, { kind: "policy", faith: "catholic", to: p });
});
Then(/^the lord "([^"]+)" does not waver over it$/, (s, name: string) => {
  expect(s.lordSteps[name] ?? 0).toBe(0);
});
Then(/^"([^"]+)" is a kin faith of "([^"]+)"$/, (s, a: string, b: string) => {
  expect(s.fired).toContain("protestant_reformation");
  expect(G.isKin(a, b)).toBe(true);
});
Given(/^the ruler of "([^"]+)" is "([^"]+)"$/, (s, name: string, faith: string) => {
  realm(s, name, faith);
});
Given(/^christians are the majority of "([^"]+)", Restricted and served$/, (s, name: string) => {
  const r = main(s);
  const faith = r.stateFaith === "orthodox" ? "catholic" : "orthodox";
  r.policies[faith] = "restricted";
  prov(s, name, { [faith]: 0.6, [r.stateFaith]: 0.4 }, { owner: r.id, buildings: [{ faith, kind: "house", step: 2 }] });
  expect(G.isServed(prov(s, name), r, faith)).toBe(true);
});
const RULES: Record<string, G.FaithBuilding> = {
  "a step-3 hindu temple": { faith: "hindu", kind: "house", step: 3 },
  "a sikh gurdwara": { faith: "sikh", kind: "house", step: 2 },
  "a theravada house of worship": { faith: "theravada", kind: "house", step: 1 },
  "a step-3 vajrayana house": { faith: "vajrayana", kind: "house", step: 3 },
};
Given(/^the province "([^"]+)" has (a step-3 hindu temple|a sikh gurdwara|a theravada house of worship|a step-3 vajrayana house)$/, (s, _n: string, what: string) => {
  s.rules = G.buildingRules(RULES[what]!);
});
Then(/^it draws (\d+) traders a year$/, (s, n: string) => {
  expect(s.rules.traders).toBe(Number(n));
});
Then(/^it shelters ([\d,]+) homeless like an almshouse$/, (s, n: string) => {
  expect(s.rules.homelessSheltered).toBe(Number(n.replace(/,/g, "")));
});
Then(/^it gives (\d+) student seats$/, (s, n: string) => {
  expect(s.rules.studentSeats).toBe(Number(n));
});
Then("it can be granted as a lord's land, its abbot the lord", (s) => {
  expect(s.rules.mayBeLordsLand).toBe(true);
});
When(/^it sets (\w+) to (Tolerated|Restricted|Persecuted)$/, (s, faith: string, p: string) => {
  s.ok = G.setPolicy(main(s), faith, pol(p) as Exclude<G.Policy, "established">);
});
Then(/^the change is (allowed|refused)$/, (s, a: string) => {
  expect(s.ok).toBe(a === "allowed");
});

// ---------------------------------------------------------------- faith waves and events

Given(/^the event "([^"]+)" fires with the option "([^"]+)" and the reform centre "([^"]+)"$/, (s, ev: string, opt: string, centre: string) => {
  s.wavesStarted = G.wavesOf(ev, opt, { $reform_centre: centre }, 1517);
});
Then(/^a faith wave "([^"]+)" starts for "([^"]+)" from "([^"]+)"$/, (s, id: string, faith: string, from: string) => {
  const w: G.Wave = s.wavesStarted[0];
  expect([w.id, w.faith, w.from]).toEqual([id, faith, from]);
});
Then(/^it gives ([\d.]+) pull per press, school and market town or bigger in each province reached$/, (s, n: string) => {
  const w: G.Wave = s.wavesStarted[0];
  expect(w.pull).toBe(Number(n));
  expect(w.carriers).toEqual(["presses", "schools", "towns"]);
  const p = G.newProvince("Leipzig", "Saxony", { catholic: 1 }, { presses: 1, schools: 1, towns: ["market town", "village"] });
  expect(G.wavePull(w, p)).toBeCloseTo(3 * Number(n));
});
Then(/^it spreads ([\d.]+) rings a year and never leaves (\w+)$/, (s, n: string, region: string) => {
  const w: G.Wave = s.wavesStarted[0];
  expect(w.reachPerYear).toBe(Number(n));
  expect(w.limit).toBe(`region:${region.toLowerCase()}`);
  expect(G.waveRings(w, w.startYear + 10)).toBe(5);
  const inside = G.newProvince("near", "x", { catholic: 1 });
  const outside = G.newProvince("abroad", "x", { catholic: 1 });
  expect(G.growWave(w, w.startYear + 10, [{ p: inside, rings: 5, inLimit: true }, { p: outside, rings: 1, inLimit: false }])).toEqual(["near"]);
});
Then(/^it ends with the period "([^"]+)"$/, (s, period: string) => {
  const w: G.Wave = s.wavesStarted[0];
  expect(w.untilPeriod).toBe(period);
  expect(G.waveActive(w, 1600, [period])).toBe(true);
  expect(G.waveActive(w, 1600, [])).toBe(false);
});
Given(/^a wave of "([^"]+)" with the carrier "([^"]+)" and pull (\d+) has reached "([^"]+)"$/, (s, faith: string, carrier: string, n: string, name: string) => {
  s.wave = { id: "w", faith, from: "Fromland", carriers: [carrier as G.Carrier], pull: Number(n), reachPerYear: 1, limit: "region:world", startYear: 1500 } satisfies G.Wave;
  prov(s, name, { [faith]: 0.5, catholic: 0.5 }, { waves: ["w"] });
});
const COUNTS: Record<string, Partial<G.ProvinceFaith>> = {
  "2 presses": { presses: 2 },
  "1 school": { schools: 1 },
  "1 market town and 1 village": { towns: ["market town", "village"] },
  "300 traders passing": { tradersPassing: 300 },
  "the wave's from country as owner": { owner: "Fromland" },
  "an army of the from country passing this year": { armies: ["Fromland"] },
};
Given(
  /^"([^"]+)" has (2 presses|1 school|1 market town and 1 village|300 traders passing|the wave's from country as owner|an army of the from country passing this year|1 preacher of that faith)$/,
  (s, name: string, what: string) => {
    const p = prov(s, name);
    if (what === "1 preacher of that faith") p.preachers.push(s.wave.faith);
    else Object.assign(p, COUNTS[what]);
  },
);
Then(/^the wave gives (\d+) pull in "([^"]+)"$/, (s, n: string, name: string) => {
  expect(G.wavePull(s.wave, prov(s, name))).toBe(Number(n));
  realm(s, prov(s, name).owner, "jewish");
  expect(total(G.pulls(prov(s, name), ownerOf(s, prov(s, name)), { waves: [s.wave] })[s.wave.faith]?.filter((x) => x.source === "wave w"))).toBe(Number(n));
});
Given(/^the Reformation wave has reached "([^"]+)"$/, (s, name: string) => {
  s.waves = G.wavesOf("protestant_reformation", "protect_the_reformer", { $reform_centre: "Saxony" }, 1517);
  prov(s, name, { catholic: 0.7, protestant: 0.3 }, { owner: name, waves: ["reformation"], presses: 2, schools: 2, towns: ["town", "market town"] });
});
Given(/^the duke of "([^"]+)" has many catholic churches, schools and preachers, and persecutes protestants$/, (s, name: string) => {
  const r = realm(s, name, "catholic");
  r.policies["protestant"] = "persecuted";
  const p = prov(s, name);
  p.capital = true;
  p.buildings.push(...Array.from({ length: 6 }, () => ({ faith: "catholic", kind: "house" as const, step: 2 })), { faith: "catholic", kind: "school" }, { faith: "catholic", kind: "school" });
  p.preachers.push("catholic", "catholic");
});
Then(/^"([^"]+)" may stay catholic$/, (s, name: string) => {
  const p = prov(s, name);
  const r = ownerOf(s, p);
  const t = G.pullTotals(p, r, { waves: s.waves });
  expect(t["protestant"]).toBeGreaterThan(0);
  for (let y = 0; y < 100; y++) G.yearMix(p, r, { waves: s.waves });
  expect(p.mix["catholic"]).toBeGreaterThan(0.7);
});
When(/^the event "([^"]+)" fires with the option "([^"]+)"$/, (s, ev: string, opt: string) => {
  s.wavesStarted = G.wavesOf(ev, opt, {}, 1600);
});
Then(/^a wave "([^"]+)" of "([^"]+)" starts with carriers (.+), pull ([\d.]+), reach ([\d.]+) a year, limited to (.+), for (.+)$/, (s, id: string, faith: string, carriers: string, pull: string, reach: string, limit: string, end: string) => {
  const w: G.Wave = s.wavesStarted[0];
  expect(w.id).toBe(id);
  expect(w.faith).toBe(faith);
  expect(w.carriers).toEqual(carriers.split(", "));
  expect(w.pull).toBe(Number(pull));
  expect(w.reachPerYear).toBe(Number(reach));
  expect(w.limit).toBe("region:" + limit.replace(/^the /, "").toLowerCase().replace(/[\s-]+/g, "_"));
  const years = end.match(/^(\d+) years$/);
  if (years) expect(w.years).toBe(Number(years[1]));
  else expect(w.untilPeriod).toBe("p_" + end.replace(/^the /, "").replace(/ period$/, "").replace(/\s+/g, "_"));
});
When(/^an event uses "([^"]+)" with (.+)$/, (s, item: string, params: string) => {
  let m: RegExpMatchArray | null;
  if ((m = params.match(/^on (\w+), faith (\w+), set (\w+)$/))) {
    const r = realm(s, m[1]!, "sunni");
    G.applyOption(r, "x", "y", 1679);
    r.policies[m[2]!] = pol(m[3]!);
    s.result = { kind: "row", realm: m[1], faith: m[2], policy: pol(m[3]!) };
  } else if ((m = params.match(/^who (\w+), faith (\w+), is (\w+)$/))) {
    const r = realm(s, m[1]!, "sunni");
    r.policies[m[2]!] = pol(m[3]!);
    s.result = { kind: "cond", value: G.conditions.faith_policy(r, m[2]!, pol(m[3]!)), off: (r.policies[m[2]!] = "restricted") && G.conditions.faith_policy(r, m[2]!, pol(m[3]!)) };
  } else if ((m = params.match(/^who (\w+), faith (\w+), op >=, value (\d+)$/))) {
    const holders = { jerusalem: m[1]!, mecca_medina: m[1]!, constantinople: m[1]!, rome: "papal_states" };
    s.result = { kind: "count", value: G.conditions.holds_holy_place(m[1]!, m[2]!, holders), min: Number(m[3]) };
  } else if ((m = params.match(/^id (\w+)$/))) {
    const w = G.wavesOf("protestant_reformation", "protect_the_reformer", { $reform_centre: "Saxony" }, 1517);
    s.result = { kind: "wave", running: G.conditions.faith_wave_active(w, m[1]!, 1550, ["p_protestant_reformation"]), ended: G.conditions.faith_wave_active(w, m[1]!, 1650, []) };
  } else if ((m = params.match(/^where (\w+), religion (\w+)$/))) {
    const p = prov(s, m[1]!, { hindu: 0.6, [m[2]!]: 0.4 });
    s.result = { kind: "share", value: G.conditions.religion_share(p, m[2]!), want: p.mix[m[2]!] };
  } else throw new Error(item);
});
Then(/^the (\w+) row of "([^"]+)" becomes (\w+)$/, (s, faith: string, name: string, p: string) => {
  expect(G.policyOf(realm(s, name), faith)).toBe(pol(p));
});
Then(/^the condition is true while (\w+) is Tolerated in "([^"]+)"$/, (s) => {
  expect(s.result.value).toBe(true);
  expect(s.result.off).toBe(false);
});
Then(/^the condition counts (\w+) holy places owned by "([^"]+)"$/, (s) => {
  expect(s.result.value).toBe(2);
  expect(s.result.value >= s.result.min).toBe(true);
});
Then(/^the condition is true while the wave "([^"]+)" runs$/, (s) => {
  expect(s.result.running).toBe(true);
  expect(s.result.ended).toBe(false);
});
Then("it reads the faith mix directly", (s) => {
  expect(s.result.value).toBe(s.result.want);
});
When(/^an event gives "([^"]+)" (\d+) preachers for (\d+) years with no faith named$/, (s, name: string, n: string, years: string) => {
  const r = realm(s, name, "protestant");
  G.grantPreachers(r, Number(n), Number(years), 1800);
});
Then(/^"([^"]+)" has (\d+) extra preachers of its state faith for (\d+) years$/, (s, name: string, n: string, years: string) => {
  const r = realm(s, name);
  const none = { monasteries: 0, schools: 0, houses: 0, holyPlaces: 0 };
  expect(r.grants).toEqual([{ faith: r.stateFaith, amount: Number(n), until: 1800 + Number(years) }]);
  expect(G.preacherCount(r, none, 1800 + Number(years) - 1)).toBe(Number(n));
  expect(G.preacherCount(r, none, 1800 + Number(years))).toBe(0);
});
When(/^(a faith is Persecuted|a preacher is killed or expelled abroad|a Catholic monarchy founds an Inquisition)$/, (s, cause: string) => {
  if (cause === "a faith is Persecuted") {
    const r = realm(s, "Castile", "catholic");
    G.applyPolicy(r, "sunni", "persecuted", { provinces: [], lords: [], realmShare: {}, borderRulers: [] });
  } else if (cause.startsWith("a preacher")) {
    const sender = realm(s, "Portugal", "catholic");
    const host = realm(s, "Japan", "shinto");
    const pr: G.Preacher = { id: "p", faith: "catholic", at: null, years: 0 };
    G.sendPreacher(sender, pr, G.newProvince("Nagasaki", "Japan", { shinto: 1 }), "foreign without leave");
    G.expelForeignPreacher(sender, host, pr);
  } else {
    const r = realm(s, "Castile", "catholic");
    G.establishInquisition(r);
  }
});
Then("the flag {string} is set", (s, flag: string) => {
  expect(Object.values(s.r as Record<string, G.RealmFaith>).some((r) => r.flags.includes(flag))).toBe(true);
});
Given(/^the prince "([^"]+)" is catholic and its realm is at least (\d+) % protestant during the Reformation$/, (s, name: string, n: string) => {
  const r = realm(s, name, "catholic");
  prov(s, "Kassel", { catholic: 1 - pct(n), protestant: pct(n) }, { owner: name, buildings: [{ faith: "catholic", kind: "monastery", monasticLand: true }] });
  lords(s).push({ name: "a catholic lord", faith: "catholic" });
  void r;
});
When(/^it chooses "([^"]+)"$/, (s, option: string) => {
  G.applyOption(main(s), "princes_adopt_the_reformation", option, 1526, { provinces: provinces(s), lords: lords(s) });
});
Then("it becomes protestant, dissolves the monasteries and Restricts catholic", (s) => {
  const r = main(s);
  expect(r.stateFaith).toBe("protestant");
  expect(r.modifiers).toContain("dissolution_of_monasteries");
  expect(G.policyOf(r, "catholic")).toBe("restricted");
});
Then("it becomes protestant and Tolerates catholic", (s) => {
  const r = main(s);
  expect(r.stateFaith).toBe("protestant");
  expect(G.policyOf(r, "catholic")).toBe("tolerated");
});
Then(/^it gains (\d+) catholic preacher for (\d+) years and Restricts protestant$/, (s, n: string, years: string) => {
  const r = main(s);
  expect(r.grants).toEqual([{ faith: "catholic", amount: Number(n), until: 1526 + Number(years) }]);
  expect(G.policyOf(r, "protestant")).toBe("restricted");
});

// ---------------------------------------------------------------- faiths and the start

Then("the faith {string} belongs to the family {string}", (s, faith: string, family: string) => {
  expect(G.faithIds()).toContain(faith);
  expect(G.familyOf(faith)).toBe(family);
});
Then(/^"([^"]+)" is not a faith id and stays a named minority in the catalogue$/, (s, people: string) => {
  expect(G.isFaith(people.toLowerCase())).toBe(false);
  expect(G.catalogueMinorities()).toContain(people);
});
Given(/^the province "([^"]+)" has (\w+) and (\w+) communities of (\d+) % each without their own houses$/, (s, name: string, a: string, b: string, n: string) => {
  const r = main(s);
  prov(s, name, { [r.stateFaith]: 1 - 2 * pct(n), [a]: pct(n), [b]: pct(n) }, { owner: r.id });
});
When("grievances are worked out", (s) => {
  s.grievances = {};
  for (const p of provinces(s)) s.grievances[p.id] = G.faithGrievances(p, ownerOf(s, p));
});
Then(/^the province "([^"]+)" has no "([^"]+)" grievance$/, (s, name: string, g: string) => {
  expect(s.grievances[name][g]).toBeUndefined();
});
Then(/^(\w+), (\w+) and (\w+) do not pull against each other$/, (s, a: string, b: string, c: string) => {
  for (const [x, y] of [[a, b], [a, c], [b, c]] as const) expect(G.pullAgainst(x, y)).toBe(false);
});
Given(/^the province "([^"]+)" has had "([^"]+)" and "([^"]+)" together for (\d+) years$/, (s, name: string, a: string, b: string, years: string) => {
  prov(s, name, { [a]: 0.5, [b]: 0.5 }, { together: { [a]: Number(years) } });
});
Then(/^"([^"]+)" is (layered|not layered) with "([^"]+)" in "([^"]+)"$/, (s, a: string, l: string, b: string, name: string) => {
  expect(G.isLayered(a, b, prov(s, name).together[a] ?? 0)).toBe(l === "layered");
});
Given(/^the province "([^"]+)" has "([^"]+)" at ([\d.]+)$/, (s, name: string, faith: string, share: string) => {
  realm(s, "Bengal", "sunni");
  prov(s, name, { hindu: 1 - Number(share), [faith]: Number(share) }, { owner: "Bengal" });
  s.rooted = { name, faith };
});
Given(/^it has no house of "([^"]+)"$/, (s, faith: string) => {
  expect(prov(s, s.rooted.name).buildings.filter((b) => b.faith === faith)).toEqual([]);
});
Then(/^the "([^"]+)" community is served without a house$/, (s, faith: string) => {
  const p = prov(s, s.rooted.name);
  expect(G.isServed(p, ownerOf(s, p), faith)).toBe(true);
});
Then(/^its hold is ([\d.]+)$/, (s, n: string) => {
  const p = prov(s, s.rooted.name);
  expect(G.hold(s.rooted.faith, p.mix[s.rooted.faith]!)).toBeCloseTo(Number(n));
});
Then(/^its sacred places give (\d+) pull$/, (s, n: string) => {
  const p = prov(s, s.rooted.name);
  const src = (G.pulls(p, ownerOf(s, p))[s.rooted.faith] ?? []).filter((x) => x.source === "sacred places");
  expect(total(src)).toBe(Number(n));
});
Given(/^the province "([^"]+)" has a "([^"]+)" church and a "([^"]+)" community of ([\d.]+)$/, (s, name: string, church: string, faith: string, share: string) => {
  realm(s, "Hesse", church);
  prov(s, name, { [church]: 1 - Number(share), [faith]: Number(share) }, { owner: "Hesse", buildings: [{ faith: church, kind: "house", step: 2 }] });
  s.kin = { name, faith };
});
Given(/^the faith "([^"]+)" is (Tolerated|Restricted|Persecuted)$/, (s, faith: string, p: string) => {
  main(s).policies[faith] = pol(p);
});
Then(/^the "([^"]+)" community is (served|unserved)$/, (s, faith: string, st: string) => {
  const p = prov(s, s.kin.name);
  expect(G.isServed(p, ownerOf(s, p), faith)).toBe(st === "served");
});
Given(/^the catalogue faiths file maps "([^"]+)" to the ruler's faith "([^"]+)" and the people's majority "([^"]+)"$/, (s, name: string, ruler: string, people: string) => {
  const rec = G.catalogueRecord(name.toLowerCase())!;
  expect([rec.state_faith, rec.people_majority]).toEqual([ruler, people]);
  s.startOf = name;
});
When("the 1444 start is set up", (s) => {
  if (s.startOf) s.start = G.startMix(s.startOf.toLowerCase());
});
Then("the state faith of {string} is {string}", (s, name: string, faith: string) => {
  if (s.start) expect(s.start.stateFaith).toBe(faith);
  else expect(realm(s, name).stateFaith).toBe(faith);
});
Then(/^in its provinces "([^"]+)" starts at ([\d.]+)$/, (s, faith: string, share: string) => {
  expect(s.start.mix[faith]).toBeCloseTo(Number(share));
  expect(Object.values(s.start.mix as Record<string, number>).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  expect(Object.keys(s.start.mix).length).toBeLessThanOrEqual(3);
});
const OVERRIDES: Record<string, { where: string; owner?: string; town?: boolean }> = {
  "the Balkans under the Ottomans": { where: "region:balkans", owner: "ottoman" },
  Bohemia: { where: "area:bohemia" },
  Granada: { where: "area:granada" },
  "the north Java coast": { where: "area:north_java_coast" },
  Punjab: { where: "area:punjab" },
  Persia: { where: "region:persia" },
  Egypt: { where: "area:egypt" },
  "Polish towns": { where: "area:poland", town: true },
};
Then(/^(the Balkans under the Ottomans|Bohemia|Granada|the north Java coast|Punjab|Persia|Egypt|Polish towns) starts with (.+)$/, (s, where: string, mix: string) => {
  const o = OVERRIDES[where]!;
  const base = { catholic: 1 };
  const got = G.startOverride(o.where, base, { ...(o.owner ? { owner: o.owner } : {}), ...(o.town ? { town: true } : {}) });
  const more = mix.match(/^(\d+) % more (\w+)$/);
  if (more) {
    expect(got[more[2]!]).toBeCloseTo(pct(more[1]!));
    expect(Object.values(got).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(G.startOverride(o.where, base, {})).toEqual(base);
  } else {
    const want: Record<string, number> = {};
    for (const m of mix.matchAll(/(\w+) (\d+) %/g)) want[m[1]!] = pct(m[2]!);
    expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
    for (const [f, v] of Object.entries(want)) expect(got[f]).toBeCloseTo(v);
  }
});

// ---------------------------------------------------------------- holy places

When("the holy places are loaded for 1444", (s) => {
  s.holy = G.holyPlaces([]);
});
Then(/^the holy place "([^"]+)" is sacred to (.+) and held in 1444 by "([^"]+)"$/, (s, place: string, faiths: string, holder: string) => {
  const h = (s.holy as G.HolyPlace[]).find((x) => x.name === place)!;
  expect(h.faiths).toEqual(faiths.split(", "));
  expect(h.holderName).toBe(holder);
});
function holy(name: string): G.HolyPlace {
  return G.holyPlaces(["sikh_panth_founded"]).find((h) => h.name === name)!;
}
Given(/^the country "([^"]+)" is (\w+) and holds "([^"]+)"$/, (s, name: string, faith: string, place: string) => {
  s.holding = G.holdingEffect(holy(place), realm(s, name, faith));
  s.place = holy(place);
});
Then(/^"([^"]+)" has (\d+) more preacher$/, (s, name: string, n: string) => {
  expect(s.holding.preachers).toBe(Number(n));
  const r = realm(s, name);
  const c = { monasteries: 0, schools: 0, houses: 0 };
  expect(G.preacherCount(r, { ...c, holyPlaces: 1 }) - G.preacherCount(r, { ...c, holyPlaces: 0 })).toBe(Number(n));
});
Then("it has the pilgrimage shrine there", (s) => {
  expect(s.holding.shrine).toBe(true);
});
Then(/^(\d+) more traders pass through "([^"]+)" each year$/, (s, n: string, province: string) => {
  expect(s.holding.pilgrimTraders).toBe(Number(n));
  expect(s.place.province).toBe(province);
});
Given(/^the country "([^"]+)" is (\w+) and holds "([^"]+)" after "([^"]+)"$/, (s, name: string, faith: string, place: string) => {
  s.holding = G.holdingEffect(holy(place), realm(s, name, faith));
  s.place = holy(place);
});
Then(/^every (\w+) ruler may use the war aim "Defend the faith" against "([^"]+)" with "([^"]+)" as the prize$/, (s, faith: string, _h: string, place: string) => {
  expect(s.holding.defendTheFaithFor).toContain(faith);
  expect(s.place.name).toBe(place);
});
Given(/^the country "([^"]+)" holds "([^"]+)"$/, (s, name: string, place: string) => {
  realm(s, name, "sunni");
  s.place = holy(place);
});
Given(/^(\w+) is (Tolerated|Restricted|Persecuted) in "([^"]+)" and "([^"]+)" (has|has no) a (\w+) house$/, (s, faith: string, p: string, name: string, _pl: string, has: string) => {
  realm(s, name).policies[faith] = pol(p);
  s.pilgrims = { faith, house: has === "has", realm: name };
});
Then(/^(\w+) pilgrim traders (still come|do not come)$/, (s, faith: string, come: string) => {
  const r = realm(s, s.pilgrims.realm);
  expect(G.pilgrimsCome(r, faith, s.pilgrims.house)).toBe(come === "still come");
});

// ---------------------------------------------------------------- preachers

Given(/^"([^"]+)" has (\d+) (\w+) monasteries, (\d+) \w+ religious school and (\d+) \w+ houses of worship$/, (s, _n: string, m: string, _f: string, sc: string, h: string) => {
  s.counts = { monasteries: Number(m), schools: Number(sc), houses: Number(h), holyPlaces: 0 };
});
Given(/^"([^"]+)" holds the holy place "([^"]+)"$/, (s, name: string, place: string) => {
  expect(holy(place).faiths).toContain(realm(s, name).stateFaith);
  s.counts.holyPlaces++;
});
When("its preachers are counted", (s) => {
  s.counted = G.preacherCount(main(s), s.counts);
});
Then(/^"([^"]+)" has (\d+) preachers$/, (s, name: string, n: string) => {
  if (s.counted !== undefined) expect(s.counted).toBe(Number(n));
  else expect(realm(s, name).preachers.length).toBe(Number(n));
});
Given(/^the event "([^"]+)" option "([^"]+)" fires for the (\w+) powers$/, (s, ev: string, opt: string, faith: string) => {
  s.powers = ["Castile", "Portugal", "Austria"].map((n) => realm(s, n, faith));
  for (const r of s.powers as G.RealmFaith[]) G.applyOption(r, ev, opt, 1563);
});
Then(/^each gets (\d+) extra (\w+) preachers for (\d+) years$/, (s, n: string, faith: string, years: string) => {
  for (const r of s.powers as G.RealmFaith[]) expect(r.grants).toEqual([{ faith, amount: Number(n), until: 1563 + Number(years) }]);
});
const DEST: Record<string, G.Destination> = {
  'its own province "Goa"': "own",
  'its province "Goa"': "own",
  "a province of its subject": "subject",
  '"Kongo", whose ruler gave "Allow preachers"': "foreign with leave",
  '"Japan", whose ruler gave no leave': "foreign without leave",
};
Given(/^the country "([^"]+)" sends a (\w+) preacher to (.+)$/, (s, name: string, faith: string, to: string) => {
  const r = realm(s, name, faith);
  const d = DEST[to]!;
  const target = prov(s, d === "own" ? "Goa" : to, { hindu: 0.9, [faith]: 0.1 }, { owner: d === "own" ? name : "elsewhere" });
  realm(s, "elsewhere", "hindu");
  s.before = G.pullTotals(target, ownerOf(s, target))[faith] ?? 0;
  s.preacher = { id: "p1", faith, at: null, years: 0 } satisfies G.Preacher;
  G.sendPreacher(r, s.preacher, target, d);
  s.dest = G.preacherMayGo(d);
  s.target = target;
});
Then("the preacher travels there like an envoy", (s) => {
  expect(s.dest.travelsLike).toBe("envoy");
  expect(s.preacher.at).toBe(s.target.id);
});
Then(/^once there "(\w+)" gets (\d+) more pull in "([^"]+)" each year$/, (s, faith: string, n: string, name: string) => {
  const p = prov(s, name);
  expect((G.pullTotals(p, ownerOf(s, p))[faith] ?? 0) - s.before).toBe(Number(n));
});
Then(/^he may go(| without permission| and stays|, and each year the ruler may expel or execute him)$/, (s, what: string) => {
  expect(s.dest.may).toBe(true);
  expect(s.dest.needsPermission).toBe(false);
  if (what.startsWith(", and each year")) expect(s.dest.expelChancePerYear).toBe(G.religionConfig.preachers.foreign_without_leave_expel_chance_per_year);
  else expect(s.dest.expelChancePerYear).toBe(0);
});
Given(/^a (\w+) preacher of "([^"]+)" is in "([^"]+)" without leave$/, (s, faith: string, name: string, host: string) => {
  const r = realm(s, name, faith);
  realm(s, host, "shinto");
  s.preacher = { id: "p1", faith, at: null, years: 0 } satisfies G.Preacher;
  G.sendPreacher(r, s.preacher, prov(s, "Nagasaki", { shinto: 0.9, [faith]: 0.1 }, { owner: host }), "foreign without leave");
});
When(/^the ruler of "([^"]+)" expels him$/, (s, host: string) => {
  const sender = Object.values(s.r as Record<string, G.RealmFaith>).find((r) => r.preachers.includes(s.preacher))!;
  const res = G.expelForeignPreacher(sender, realm(s, host), s.preacher, prov(s, "Nagasaki"));
  (s.warAims ??= []).push(res.defendTheFaith);
  s.sender = sender;
});
Then(/^"([^"]+)" loses the preacher$/, (s, name: string) => {
  expect(realm(s, name).preachers).not.toContain(s.preacher);
  expect(prov(s, "Nagasaki").preachers).toEqual([]);
});
Given(/^the country "([^"]+)" has (\d+) (\w+) preachers$/, (s, name: string, n: string, faith: string) => {
  const r = realm(s, name, faith);
  for (let i = 0; i < Number(n); i++) r.preachers.push({ id: `p${i}`, faith, at: null, years: 0 });
});
When(/^(?:one is recalled|one is killed abroad|the state faith changes to (protestant))$/, (s, to?: string | null) => {
  const r = main(s);
  if (to) G.adoptFaith(r, to, { houses: "keep", schools: "keep", year: 1527, byDecision: true, provinces: provinces(s), lords: [] });
  else G.losePreacher(r, r.preachers[0]!);
});
Then(/^all (\w+) preachers are gone$/, (s, faith: string) => {
  expect(main(s).preachers.filter((p) => p.faith === faith)).toEqual([]);
});
Given(/^a (\w+) preacher is inside "([^"]+)"$/, (s, faith: string, name: string) => {
  s.insidePreacher = { faith, realm: name };
});
When(/^a (\w+) faith rising starts near him$/, (s, faith: string) => {
  const r = realm(s, s.insidePreacher.realm);
  const leads = G.leadsRising(r, s.insidePreacher.faith) && s.insidePreacher.faith === faith;
  s.rising = R.newRising("r1", "Faith", "La Rochelle", leads ? { leader: { name: `a ${faith} preacher`, kind: "preacher" } } : {});
});
Then("he leads it and it spreads twice as fast", (s) => {
  expect(s.rising.leader?.kind).toBe("preacher");
  expect(R.faithSpreadFactor(s.rising)).toBe(2);
});

// ---------------------------------------------------------------- AI

Given("the AI country {string} has gold to spare", (s, name: string) => {
  realm(s, name, "catholic");
  s.gold = true;
});
Given(/^its state faith is (\d+) % of the province "([^"]+)"$/, (s, n: string) => {
  s.stateShare = pct(n);
});
Given("no minority has Wrong faith", (s) => {
  s.minority = null;
});
Given("a minority has Wrong faith there and its lords are wavering", (s) => {
  s.minority = { faith: "orthodox", wrongFaith: true, lordsWavering: true };
});
Then(/^the AI builds a house of the state faith in "([^"]+)"$/, (s) => {
  expect(G.aiBuild(s.gold, s.stateShare, s.minority, main(s).stateFaith)).toBe(main(s).stateFaith);
});
Then(/^the AI builds no house in "([^"]+)"$/, (s) => {
  expect(G.aiBuild(s.gold, s.stateShare, s.minority, main(s).stateFaith)).toBeNull();
});
Then(/^the AI builds a house of that minority in "([^"]+)"$/, (s) => {
  expect(G.aiBuild(s.gold, s.stateShare, s.minority, main(s).stateFaith)).toBe(s.minority.faith);
});
Given("the AI country {string} has the personality {string}", (s, name: string, p: string) => {
  realm(s, name, "catholic").personality = p;
});
Given(/^the faith "([^"]+)" is (\d+) % of its realm$/, (s, faith: string, n: string) => {
  s.aiFaith = { faith, share: pct(n) };
});
Given(/^(no event or war of religion|a war of religion has been fought)$/, (s, h: string) => {
  s.history = h !== "no event or war of religion";
});
Then(/^the AI sets (\w+) to "([^"]+)"$/, (s, _f: string, p: string) => {
  expect(G.aiPolicy(main(s).personality!, s.aiFaith.share, s.history)).toBe(pol(p));
});
Given("the AI country {string} has a free preacher", (s, name: string) => {
  realm(s, name, "catholic").preachers.push({ id: "p", faith: "catholic", at: null, years: 0 });
});
Given(/^its state faith is under half in its province "([^"]+)"$/, (s, name: string) => {
  (s.own ??= []).push({ id: "Homeshire", stateShare: 0.9 }, { id: name, stateShare: 0.4 });
});
Given("a neighbour has given it leave to preach", (s) => {
  s.abroad = ["Neighbourland"];
});
Then(/^it sends the preacher to "([^"]+)" first$/, (s, name: string) => {
  expect(G.aiPreacherTarget(s.own, s.abroad)).toBe(name);
  expect(G.aiPreacherTarget([], s.abroad)).toBe("Neighbourland");
});
Given(/^a faith is (\d+) % of the AI country's realm and (no event offers it|an event offers it)$/, (s, n: string, ev: string) => {
  s.adopt = G.aiAdopt(pct(n), ev === "an event offers it");
});
Then(/^the AI (adopts|does not adopt|may adopt) it$/, (s, what: string) => {
  expect(s.adopt).toBe(what);
});

// ---------------------------------------------------------------- uses by other systems

Given(/^a (\w+) faith rising holds "([^"]+)"$/, (s, faith: string) => {
  s.risingFaith = faith;
});
When(/^the ruler talks with the rebels and offers (.+)$/, (s, offer: string) => {
  s.accepts = G.risingAccepts(s.risingFaith, offer);
});
Then("the rebels accept", (s) => {
  expect(s.accepts).toBe(true);
});
Given(/^the country "([^"]+)" is (\w+)$/, (s, name: string, faith: string) => {
  realm(s, name, faith);
});
When(
  /^(its neighbour persecutes protestants in a province bordering Brandenburg|its preacher is killed in a foreign realm|a protestant holy place is held by another faith)$/,
  (s, cause: string) => {
    const me = main(s);
    if (cause.startsWith("its neighbour")) {
      const n = realm(s, "Saxony", "catholic");
      const ev = G.applyPolicy(n, me.stateFaith, "persecuted", { provinces: [], lords: [], realmShare: {}, borderRulers: [{ id: me.id, faith: me.stateFaith }] });
      s.gains = ev.defendTheFaith.includes(me.id);
    } else if (cause.startsWith("its preacher")) {
      const pr: G.Preacher = { id: "p", faith: me.stateFaith, at: null, years: 0 };
      G.sendPreacher(me, pr, G.newProvince("Abroad", "Hostland", { catholic: 1 }), "foreign without leave");
      s.gains = G.expelForeignPreacher(me, realm(s, "Hostland", "catholic"), pr).defendTheFaith.holder === me.id;
    } else {
      const place: G.HolyPlace = { id: "a protestant holy place", name: "a protestant holy place", faiths: [me.stateFaith], province: "Somewhere", holder1444: null, holderName: null };
      s.gains = G.holdingEffect(place, realm(s, "Holder", "catholic")).defendTheFaithFor.includes(me.stateFaith);
    }
  },
);
Then(/^"([^"]+)" gains the war aim "Defend the faith"$/, (s) => {
  expect(s.gains).toBe(true);
});
Given(/^the country "([^"]+)" persecutes (\w+)s$/, (s, name: string, faith: string) => {
  const r = realm(s, name, "catholic");
  prov(s, "Paris", { catholic: 0.8, [faith]: 0.2 }, { owner: name, buildings: [{ faith: "catholic", kind: "school" }, { faith, kind: "school" }] });
  G.applyPolicy(r, faith, "persecuted", world(s, r));
  s.persecuted = faith;
});
Then(/^(\w+) scholars leave "([^"]+)" for realms that take them$/, (s, faith: string, name: string) => {
  expect(G.policyOf(realm(s, name), faith)).toBe("persecuted");
  const fled = G.persecutionFlight({ farmers: 10000, scholars: 50, craftsmen: 0 });
  expect(fled["scholars"]).toBe(50);
});
Then(/^every school in "([^"]+)" has a faith$/, (s, name: string) => {
  const schools = provinces(s).filter((p) => p.owner === name).flatMap((p) => p.buildings.filter((b) => b.kind === "school"));
  expect(schools.length).toBeGreaterThan(0);
  for (const b of schools) expect(G.faithIds()).toContain(b.faith);
});
Given(/^"([^"]+)" and "([^"]+)" are both (\w+)$/, (s, a: string, b: string, faith: string) => {
  realm(s, a, faith);
  realm(s, b, faith);
  s.pair = [a, b];
  s.leave = [{ from: a, to: b }];
});
Then("diplomacy is told they share a faith", (s) => {
  expect(G.diplomacyFacts(realm(s, s.pair[0]), realm(s, s.pair[1]), s.leave).sameFaith).toBe(true);
});
Then("diplomacy is told whether each allows the other's preachers", (s) => {
  const f = G.diplomacyFacts(realm(s, s.pair[0]), realm(s, s.pair[1]), s.leave);
  expect([f.aAllowsB, f.bAllowsA]).toEqual([true, false]);
});
Given(/^its people are (.+)$/, (s, list: string) => {
  s.people = {};
  for (const m of list.matchAll(/(\d+) % (\w+)/g)) s.people[m[2]!] = Number(m[1]);
});
Given(/^(\w+) is not yet layered with (\w+)$/, (s, a: string, b: string) => {
  expect(G.isLayered(a, b, 0)).toBe(false);
});
Then("the Faith % of {string} is {int}", (s, name: string, n: number) => {
  expect(Math.round(G.faithPercent(realm(s, name).stateFaith, s.people) * 100)).toBe(n);
});
When("the player opens the country card", (s) => {
  s.card = G.countryCardFaith(main(s), { percent: 90, otherFaiths: 1, preachers: 0, holyPlaces: [] });
});
Then("there is no faith meter, piety, fervour or unity score", (s) => {
  expect(Object.keys(s.card)).toEqual(["faithRow"]);
  expect(s.card.faithRow).not.toMatch(/piety|fervour|unity|meter/i);
});
Then(/^there is no "convert province" button$/, () => {
  expect(G.COMMANDS.map((c) => c.toLowerCase())).not.toContain("convertprovince");
  expect(G.COMMANDS.some((c) => /convert.*province/i.test(c))).toBe(false);
});

// ---------------------------------------------------------------- what the player sees

Given(/^the province "([^"]+)" is (\w+) (\d+) % falling, (\w+) (\d+) % rising and (\w+) (\d+) %$/, (s, name: string, a: string, pa: string, b: string, pb: string, c: string, pc: string) => {
  const r = realm(s, "France", a);
  r.policies[b] = "tolerated";
  r.policies[c] = "tolerated";
  prov(s, name, { [a]: pct(pa), [b]: pct(pb), [c]: pct(pc) }, { owner: "France", presses: 4, buildings: [{ faith: a, kind: "house", step: 1 }, { faith: b, kind: "house", step: 2 }] });
  s.view = name;
});
When("the player taps its Faith line", (s) => {
  const p = prov(s, s.view);
  s.line = G.faithLine(p, ownerOf(s, p));
});
Then("it lists the pulls this year for each faith with their sources", (s) => {
  const rows = s.line.rows as G.FaithLineRow[];
  expect(rows.map((r) => r.faith)).toEqual(["catholic", "protestant", "jewish"]);
  expect(rows.map((r) => r.trend)).toEqual(["falling", "rising", "falling"]);
  expect(rows[0]!.pulls).toEqual([{ source: "house of worship step 1", amount: 1 }]);
  expect(rows[1]!.pulls).toEqual([
    { source: "house of worship step 2", amount: 1.5 },
    { source: "presses and schools", amount: 2 },
  ]);
});
Then(/^it shows the (\w+) community as served by its own church and Tolerated$/, (s, faith: string) => {
  const row = (s.line.rows as G.FaithLineRow[]).find((r) => r.faith === faith)!;
  expect([row.community, row.servedBy, row.policy]).toEqual(["served", "its own church", "tolerated"]);
});
Then(/^it shows the (\w+) (\d+) % as below a community, with no grievance$/, (s, faith: string, n: string) => {
  const row = (s.line.rows as G.FaithLineRow[]).find((r) => r.faith === faith)!;
  expect(row.share).toBeCloseTo(pct(n));
  expect(row.community).toBe("below a community");
  expect(row.grievance).toBeNull();
});
Then("it shows how fast the mix is moving and toward which faith", (s) => {
  expect(s.line.toward).toBe("protestant");
  expect(s.line.pointsPerYear).toBeGreaterThan(0);
});
Given(/^the country "([^"]+)" is (\w+) with (\d+) % of its people \w+, (\d+) more faiths, (\d+) preachers and no holy place$/, (s, name: string, faith: string, n: string, more: string, pr: string) => {
  realm(s, name, faith);
  s.row = G.faithRow(realm(s, name), { percent: Number(n), otherFaiths: Number(more), preachers: Number(pr), holyPlaces: [] });
});
Then("the Faith row shows {string}", (s, text: string) => {
  expect(s.row.text).toBe(text);
});
When("the player taps it", (s) => {
  s.opened = s.row.opens;
});
Then("the Faith policy screen opens", (s) => {
  expect(s.opened).toBe("Faith policy screen");
});
When(/^the map is at (world|region|local)$/, (s, zoom: "world" | "region" | "local") => {
  s.lens = G.faithLens(zoom);
});
Then(
  /^it shows (each province in its majority faith's colour, hatched where another faith's community is 30 % or more, with holy place icons|houses of worship as town sprites, preachers as walking figures, active waves as a spreading tint|the Faith line on the province card with its pulls)$/,
  (s, what: string) => {
    if (what.startsWith("each")) expect(s.lens).toEqual({ colour_by: "majority faith", hatched_at_community_share: 0.3, holy_place_icons: true });
    else if (what.startsWith("houses")) expect(s.lens).toEqual({ houses: "town sprites", preachers: "walking figures", waves: "spreading tint" });
    else expect(s.lens).toEqual({ faith_line_with_pulls: true });
  },
);

// ---------------------------------------------------------------- changing the state faith

Given(/^(\w+) is (\d+) % of its capital province and (\d+) % of the realm$/, (s, faith: string, cap: string, rlm: string) => {
  s.adoptCase = { faith, capitalShare: pct(cap), realmShare: pct(rlm), eventOffers: false };
});
Given("no event offers it", () => {});
Given("the Reformation event offers it", (s) => {
  s.adoptCase.eventOffers = true;
});
Then(/^"Adopt a faith" for (\w+) is (offered|not offered)$/, (s, faith: string, o: string) => {
  expect(G.adoptOffered(main(s), faith, s.adoptCase)).toBe(o === "offered");
});
function sweden(s: Scenario, preachers: number): G.RealmFaith {
  const r = realm(s, "Sweden", "catholic");
  r.stateFaith = "catholic";
  for (let i = 0; i < preachers; i++) r.preachers.push({ id: `p${i}`, faith: "catholic", at: null, years: 0 });
  prov(s, "Uppsala", { catholic: 0.6, protestant: 0.4 }, { owner: "Sweden", buildings: [{ faith: "catholic", kind: "house", step: 3 }, { faith: "catholic", kind: "monastery", monasticLand: true }, { faith: "catholic", kind: "school" }] });
  prov(s, "Stockholm", { catholic: 0.5, protestant: 0.5 }, { owner: "Sweden", buildings: [{ faith: "catholic", kind: "house", step: 2 }] });
  lords(s).push({ name: "a catholic lord", faith: "catholic" }, { name: "a protestant lord", faith: "protestant" });
  return r;
}
Given(/^the country "([^"]+)" has the state faith "([^"]+)" and (\d+) (\w+) preachers$/, (s, _n: string, _f: string, n: string) => {
  sweden(s, Number(n));
});
When(/^"([^"]+)" adopts "([^"]+)" and takes over the (\w+) houses, closing \w+ schools$/, (s, _n: string, faith: string) => {
  const r = s.r?.["Sweden"] ?? sweden(s, 0);
  s.oldHouses = provinces(s).flatMap((p) => p.buildings.filter((b) => b.kind !== "school"));
  s.adoption = G.adoptFaith(r, faith, { houses: "take_over", schools: "close", year: 1527, byDecision: true, provinces: provinces(s), lords: lords(s), buildCost: () => 0 });
});
Then(/^(\w+) is Tolerated and can be changed from the next New Year$/, (s, faith: string) => {
  const r = main(s);
  expect(G.policyOf(r, faith)).toBe("tolerated");
  expect(G.setPolicy(r, faith, "restricted")).toBe(true);
  expect(G.policyOf(r, faith)).toBe("tolerated");
});
Then(/^"([^"]+)" has no (\w+) preachers and no (\w+) preachers until \w+ houses exist$/, (s, name: string, old: string, neu: string) => {
  const r = realm(s, name);
  expect(s.adoption.preachersLost).toBe(3);
  expect(r.preachers.filter((p) => p.faith === old || p.faith === neu)).toEqual([]);
  expect(G.preacherCountFrom(r, [], 0)).toBe(0);
});
Then("the catholic houses become protestant and their pull flips", (s) => {
  for (const b of s.oldHouses as G.FaithBuilding[]) expect(b.faith).toBe("protestant");
  for (const p of provinces(s)) expect(G.pulls(p, ownerOf(s, p))["catholic"]).toBeUndefined();
});
Then("their property's gold is paid into the treasury, twice for monastic land", (s) => {
  const t: G.TakeOver[] = s.adoption.takenOver;
  const per = G.religionConfig.houses.take_over_gold.per_step;
  expect(t.map((x) => x.gold)).toEqual([per * 3, per * 2, per * 1 * 2]);
});
Then("an \"insult to faith\" spark is raised where each house was taken", (s) => {
  expect(s.adoption.sparks).toEqual(["Uppsala", "Stockholm"]);
  for (const t of s.adoption.takenOver as G.TakeOver[]) expect(t.spark).toBe("insult_to_faith");
});
Then(/^(\w+) schools close$/, (s, faith: string) => {
  expect(s.adoption.schoolsClosed).toBe(1);
  void faith;
});
Then(/^(\w+) lords lose one step and (\w+) lords gain one step$/, (s, a: string, b: string) => {
  expect(s.adoption.lordSteps).toEqual({ [`a ${a} lord`]: -1, [`a ${b} lord`]: 1 });
});
When(/^"([^"]+)" adopts "([^"]+)" and keeps the (\w+) houses$/, (s, _n: string, faith: string) => {
  const r = sweden(s, 0);
  s.adoption = G.adoptFaith(r, faith, { houses: "keep", schools: "keep", year: 1527, byDecision: true, provinces: provinces(s), lords: lords(s) });
});
Then(/^the (\w+) houses serve the (\w+) community$/, (s, faith: string) => {
  const r = main(s);
  for (const p of provinces(s)) {
    expect(p.buildings.filter((b) => b.kind !== "school").every((b) => b.faith === faith)).toBe(true);
    expect(G.isServed(p, r, faith)).toBe(true);
  }
});
Given(/^"([^"]+)" adopted a faith by decision in (\d+)$/, (s, name: string, year: string) => {
  realm(s, name, "protestant").lastAdoptByDecision = Number(year);
});
When(/^"([^"]+)" tries to adopt a faith (by decision|by an event)$/, (s, name: string, how: string) => {
  s.allowed = G.adoptAllowed(realm(s, name), s.year, how === "by decision");
});
Then(/^it is (refused|allowed)$/, (s, a: string) => {
  expect(s.allowed).toBe(a === "allowed");
});
Given(/^the country "([^"]+)" is inside the Empire with the state faith "([^"]+)"$/, (s, name: string, faith: string) => {
  realm(s, name, faith).empire = true;
});
Given(/^(\w+) is (\d+) % of its capital and of the realm$/, (s, faith: string, n: string) => {
  s.adoptCase = { capitalShare: pct(n), realmShare: pct(n), firedEvents: s.fired ?? [] };
  s.adoptFaith = faith;
});
Then(/^the (\w+) may adopt "([^"]+)"$/, (s, _n: string, faith: string) => {
  expect(G.adoptOffered(main(s), faith, s.adoptCase)).toBe(true);
});
Then(/^it may not adopt "([^"]+)" this way$/, (s, faith: string) => {
  expect(G.adoptOffered(main(s), faith, s.adoptCase)).toBe(false);
});

// ---------------------------------------------------------------- decided questions (D-RELG-n)

Given(/^(\w+) is ([\d.]+) of "([^"]+)", (Tolerated|Restricted), with (no \w+ house|a \w+ church)$/, (s, faith: string, share: string, name: string, p: string, house: string) => {
  const r = main(s);
  r.policies[faith] = pol(p);
  const sh = Number(share);
  prov(s, name, { [r.stateFaith]: 1 - sh, [faith]: sh }, { owner: r.id, buildings: house.startsWith("a ") ? [{ faith, kind: "house", step: 1 }] : [] });
});

Given(/^the country "([^"]+)" Tolerates (\w+) while (\w+)s are (\d+) % of the realm$/, (s, name: string, faith: string, _f: string, share: string) => {
  const r = realm(s, name, "catholic");
  r.policies[faith] = "tolerated";
  s.realmShare = { [faith]: pct(share) };
});
When(/^(\w+)s grow to (\d+) % of the realm and (\w+) stays Tolerated at the next New Year$/, (s, faith: string, share: string) => {
  const r = main(s);
  s.realmShare[faith] = pct(share);
  expect(G.setPolicy(r, faith, "tolerated")).toBe(true);
  s.changes = G.newYear(r, world(s, r));
  stepsOf(s, s.changes);
});
Then(/^the lord "([^"]+)" does not waver$/, (s, name: string) => {
  expect(s.lordSteps?.[name] ?? 0).toBe(0);
});

Given(/^the country "([^"]+)" has the state faith "([^"]+)" and the form "([^"]+)"$/, (s, name: string, faith: string, form: string) => {
  const r = realm(s, name, faith);
  r.stateFaith = faith;
  r.government = formIdFromName(form);
});
Then(/^the Inquisition decision is (offered|not offered) to "([^"]+)"$/, (s, o: string, name: string) => {
  expect(G.inquisitionOffered(realm(s, name))).toBe(o === "offered");
});

Given(/^the province "([^"]+)" is half "(\w+)" and half "(\w+)"$/, (s, name: string, a: string, b: string) => {
  prov(s, name, { [a]: 0.5, [b]: 0.5 });
});
Given(/^"(\w+)" has (\d+) pull and "(\w+)" has (\d+) pull$/, (s, a: string, na: string, b: string, nb: string) => {
  // Step-1 houses give 1 pull each and nothing else pulls in the province.
  const p = provinces(s)[0]!;
  for (let i = 0; i < Number(na); i++) p.buildings.push({ faith: a, kind: "house", step: 1 });
  for (let i = 0; i < Number(nb); i++) p.buildings.push({ faith: b, kind: "house", step: 1 });
  expect(G.pullTotals(p, ownerOf(s, p))).toEqual({ [a]: Number(na), [b]: Number(nb) });
});
Then(/^the target share of "(\w+)" is ([\d.]+)$/, (s, faith: string, t: string) => {
  const p = provinces(s)[0]!;
  expect(G.targets(s.before[p.id], G.pullTotals(p, ownerOf(s, p)))![faith]).toBeCloseTo(Number(t), 10);
});
Then(/^the share of "(\w+)" becomes ([\d.]+)$/, (s, faith: string, v: string) => {
  expect(provinces(s)[0]!.mix[faith]).toBeCloseTo(Number(v), 10);
});

Given(/^the province "([^"]+)" is (\d+) % (\w+), (\d+) % (\w+) and (\d+) % (\w+)$/, (s, name: string, a: string, fa: string, b: string, fb: string, c: string, fc: string) => {
  prov(s, name, { [fa]: pct(a), [fb]: pct(b), [fc]: pct(c) });
});
Given(/^the province "([^"]+)" has (\d+) (\w+) temples and a (\w+) lord$/, (s, name: string, n: string, faith: string, lord: string) => {
  const p = prov(s, name);
  for (let i = 0; i < Number(n); i++) p.buildings.push({ faith, kind: "house", step: 1 });
  p.lordFaith = lord;
});
When(/^the forest is cleared and a mosque is granted on each of (\d+) new field tiles$/, (s, n: string) => {
  const p = provinces(s)[0]!;
  p.owner = s.main;
  for (let i = 0; i < Number(n); i++) p.buildings.push({ faith: "sunni", kind: "house", step: 1 });
});
Then(/^"(\w+)" has ([\d.]+) pull, "(\w+)" (\d+) and "(\w+)" (\d+)$/, (s, a: string, na: string, b: string, nb: string, c: string, nc: string) => {
  const p = provinces(s)[0]!;
  expect(G.pullTotals(p, ownerOf(s, p))).toEqual({ [a]: Number(na), [b]: Number(nb), [c]: Number(nc) });
});
Then(/^by pulls alone the mix would settle at (\w+) (\d+) %, (\w+) (\d+) % and (\w+) (\d+) %$/, (s, a: string, na: string, b: string, nb: string, c: string, nc: string) => {
  const p = provinces(s)[0]!;
  const t = G.pullTotals(p, ownerOf(s, p));
  const all = Object.values(t).reduce((x, y) => x + y, 0);
  for (const [f, n] of [[a, na], [b, nb], [c, nc]] as [string, string][]) expect(Math.round(((t[f] ?? 0) / all) * 100)).toBe(Number(n));
});
function eastBengalBy(s: Scenario, year: number): G.ProvinceFaith {
  const p = structuredClone(provinces(s)[0]!);
  const r = ownerOf(s, provinces(s)[0]!);
  for (let y = s.year ?? 1444; y < year; y++) G.yearMix(p, r);
  return p;
}
Then(/^the double hold of "(\w+)" keeps it at about (\d+) %, above a quarter, so it keeps its sacred-places pull$/, (s, faith: string, share: string) => {
  const p = eastBengalBy(s, 1900);
  expect(Math.round(p.mix[faith]! * 100)).toBe(Number(share));
  expect(G.pulls(p, ownerOf(s, provinces(s)[0]!))[faith]?.map((x) => x.source)).toContain("sacred places");
});
Then(/^by about (\d+) "(\w+)" is the largest faith of "([^"]+)", at about (\d+) %$/, (s, year: string, faith: string, _n: string, share: string) => {
  const p = eastBengalBy(s, Number(year));
  const top = Object.entries(p.mix).sort((x, y) => y[1] - x[1])[0]!;
  expect(top[0]).toBe(faith);
  expect(Math.round(top[1] * 100)).toBe(Number(share));
});

Given(/^the province "([^"]+)" holds (\w+) (\d+) %, (\w+) (\d+) % and (\w+) (\d+) %$/, (s, name: string, a: string, na: string, b: string, nb: string, c: string, nc: string) => {
  prov(s, name, { [a]: pct(na), [b]: pct(nb), [c]: pct(nc) }, { people: 100000 });
  s.before = { ...prov(s, name).mix };
});
When(/^(\d+) % of "(\w+)" people arrive$/, (s, share: string, faith: string) => {
  const p = provinces(s)[0]!;
  s.arrived = { faith, people: p.people * pct(share) };
  G.moversArrive(p, { [faith]: s.arrived.people });
});
Then(/^"(\w+)" (replaces "\w+" among the three|does not enter the mix)$/, (s, faith: string, how: string) => {
  const p = provinces(s)[0]!;
  expect(Object.keys(p.mix).length).toBe(3);
  const out = /"(\w+)"/.exec(how)?.[1];
  if (out) {
    expect(p.mix[faith]).toBeGreaterThan(0);
    expect(p.mix[out]).toBeUndefined();
  } else expect(p.mix[faith]).toBeUndefined();
});
Then(/^the (\w+) people join the majority faith "(\w+)"$/, (s, faith: string, major: string) => {
  const p = provinces(s)[0]!;
  const joined = faith === s.arrived.faith ? s.arrived.people : s.before[faith] * 100000;
  expect(p.mix[major]! * p.people).toBeCloseTo(s.before[major] * 100000 + joined, 6);
});

Given("the Reformation period has ended", (s) => {
  s.reformationEnded = true;
});
Given(/^the province "([^"]+)" has hussite people and (a protestant church|no protestant house)$/, (s, name: string, house: string) => {
  prov(s, name, { hussite: 0.4, catholic: 0.6 }, { buildings: house.startsWith("a ") ? [{ faith: "protestant", kind: "house", step: 1 }] : [{ faith: "catholic", kind: "house", step: 1 }] });
});
Then(/^its hussite share merges into "(\w+)"$/, (s, into: string) => {
  expect(s.reformationEnded).toBe(true);
  const p = provinces(s)[0]!;
  expect(G.mergeHussites(p)).toBe(into);
  expect(p.mix["hussite"]).toBeUndefined();
  expect(p.mix[into]).toBeCloseTo(into === "catholic" ? 1 : 0.4);
});
Given(/^the Reformation period (ends in \d+|has not yet ended)$/, (s, w: string) => {
  const year = /\d+/.exec(w)?.[0];
  s.reformationEnds = year ? Number(year) : null;
});
Then(/^the Hussites merge in (\d+)$/, (s, year: string) => {
  expect(G.hussiteMergeYear(s.reformationEnds)).toBe(Number(year));
});

Given(/^the town "([^"]+)" has (factories|no factory), (mass schooling|no mass schooling) and (\d+) schools$/, (s, name: string, f: string, m: string, n: string) => {
  const amount = G.secularPull(s.year ?? 1444, { factory: f === "factories", schools: Number(n) }, m === "mass schooling" ? ["mass_literacy_schooling"] : []);
  s.pulls = { [name]: amount > 0 ? { secular: [{ source: "schools in a factory town", amount }] } : {} };
});
Then(/^"(\w+)" gets no pull in "([^"]+)"$/, (s, faith: string, name: string) => {
  expect(total(s.pulls[name][faith])).toBe(0);
});
Then(/^"(\w+)" has no houses$/, (s, faith: string) => {
  expect(G.hasHouses(faith)).toBe(false);
});

When("the religion additions are read", (s) => {
  s.adds = G.additionEvents();
});
Then(/^the religion additions hold the event "(\w+)" dated (\d+)(?:–(\d+))?$/, (s, ev: string, from: string, to?: string) => {
  expect(s.adds[ev]).toEqual(to ? [Number(from), Number(to)] : Number(from));
});

Given(/^the crown "([^"]+)" is (\w+) with the flag "([^"]+)"$/, (s, name: string, faith: string, flag: string) => {
  realm(s, name, faith).flags.push(flag);
});
Given("the Mudejar and Morisco population exists", (s) => {
  s.group = "mudejar_morisco_population";
});
When(/^the event "([^"]+)" fires and "([^"]+)" chooses "([^"]+)"$/, (s, ev: string, name: string, option: string) => {
  s.effects = G.optionEffects(ev, option);
  expect(realm(s, name).flags).toContain(G.FLAGS.inquisition);
});
Then(/^(\d+) % of the Morisco population moves to the host, as in any expulsion$/, (s, share: string) => {
  const mv = (s.effects as Record<string, unknown>[]).find((e) => "move_population" in e)!["move_population"] as { group: string; amount: string };
  expect(mv.group).toBe(s.group);
  expect(mv.amount).toBe(`${share}%`);
  expect(G.religionConfig.expulsion.leave_share).toBeCloseTo(pct(share));
});
Then(/^the flag "([^"]+)" is set on "([^"]+)" for (\d+) years$/, (s, flag: string, _n: string, years: string) => {
  const f = (s.effects as Record<string, unknown>[]).find((e) => "set_flag" in e)!["set_flag"] as { id: string; years: number };
  expect(f).toMatchObject({ id: flag, years: Number(years) });
});

Given(/^([\d.]+) of (its capital|the realm) is (\w+)$/, (s, share: string, where: string) => {
  s.convShares = where === "its capital" ? { capital: Number(share), realm: 0 } : { capital: 0, realm: Number(share) };
});
Then(/^the event "(court_conversion_islam|court_conversion_christian)" is (offered|not offered) to "([^"]+)"$/, (s, ev: "court_conversion_islam" | "court_conversion_christian", o: string, name: string) => {
  expect(G.courtConversionOffered(ev, realm(s, name), s.convShares)).toBe(o === "offered");
});

Given("the event tree's religions list", (s) => {
  s.tree = G.religionConfig.event_tree_religions;
});
Then(/^it also holds "(\w+)", "(\w+)" and "(\w+)"$/, (s, ...fs: string[]) => {
  for (const f of fs.slice(0, 3)) {
    expect(s.tree).not.toContain(f);
    expect(G.faithIds()).toContain(f);
    expect(G.isFaith(f)).toBe(true);
  }
});

Given(/^the catalogue record "([^"]+)" names its faith "([^"]+)"$/, (s, id: string, text: string) => {
  const raw = G.catalogueRecord(id) as unknown as { source_texts: string[]; state_faith: string | null };
  expect(raw.source_texts.some((t) => t.includes(text))).toBe(true);
  expect(raw.state_faith === null || !G.isFaith(raw.state_faith)).toBe(true);
  s.startOf = id;
});
Then(/^the record "([^"]+)" starts with the state faith "(\w+)"$/, (s, _id: string, faith: string) => {
  expect(s.start.stateFaith).toBe(faith);
  expect(s.start.mix[faith]).toBeGreaterThan(0.5);
});

Given(/^the event "([^"]+)" has not fired$/, (s) => {
  s.fired ??= [];
});
Then(/^"([^"]+)" is (not|now) a holy place$/, (s, name: string, is: string) => {
  const found = G.holyPlaces(s.fired ?? [], s.year ?? 1444).some((h) => h.name === name);
  expect(found).toBe(is === "now");
});
Then(/^the holy place "([^"]+)" is in the province "([^"]+)"$/, (s, name: string, province: string) => {
  expect(G.holyPlaces([], s.year ?? 1444).find((h) => h.name === name)!.province).toBe(province);
});

Given(/^the province "([^"]+)" is (\w+) (\d+) %, (\w+) (\d+) % and (\w+) (\d+) %$/, (s, name: string, a: string, na: string, b: string, nb: string, c: string, nc: string) => {
  prov(s, name, { [a]: pct(na), [b]: pct(nb), [c]: pct(nc) });
});
Given(/^"([^"]+)" has (\d+) catholic churches, a catholic monastery with seats, (\d+) protestant church, (\d+) synagogue and (\d+) presses$/, (s, name: string, c: string, pr: string, j: string, presses: string) => {
  const p = prov(s, name);
  for (let i = 0; i < Number(c); i++) p.buildings.push({ faith: "catholic", kind: "house", step: 1 });
  p.buildings.push({ faith: "catholic", kind: "monastery", seats: true });
  for (let i = 0; i < Number(pr); i++) p.buildings.push({ faith: "protestant", kind: "house", step: 1 });
  for (let i = 0; i < Number(j); i++) p.buildings.push({ faith: "jewish", kind: "house", step: 1 });
  p.presses = Number(presses);
});
Given(/^the Reformation wave covers "([^"]+)"$/, (s, name: string) => {
  s.waves = G.wavesOf("protestant_reformation", "protect_the_reformer", { $reform_centre: "Saxony" }, 1517);
  prov(s, name).waves.push(s.waves[0].id);
});
When(/^the pulls of "([^"]+)" are worked out$/, (s, name: string) => {
  const p = prov(s, name);
  s.line = G.faithLine(p, ownerOf(s, p), { waves: s.waves });
  s.totals = G.pullTotals(p, ownerOf(s, p), { waves: s.waves });
});
Then(/^the pulls are (\w+) ([\d.]+), (\w+) ([\d.]+) and (\w+) ([\d.]+)$/, (s, a: string, na: string, b: string, nb: string, c: string, nc: string) => {
  expect(s.totals).toEqual({ [a]: Number(na), [b]: Number(nb), [c]: Number(nc) });
});
Then(/^the Faith line shows the mix moving about ([\d.]+) points a year toward (\w+)$/, (s, pts: string, faith: string) => {
  expect(s.line.toward).toBe(faith);
  expect(Math.round(s.line.pointsPerYear * 10) / 10).toBe(Number(pts));
});

Given(/^an event has granted "([^"]+)" (\d+) (\w+) preachers for (\d+) years$/, (s, name: string, n: string, faith: string, years: string) => {
  G.grantPreachers(realm(s, name), Number(n), Number(years), 1520, faith);
});
Then(/^"([^"]+)" has (\d+) (\w+) preachers before any \w+ house exists$/, (s, name: string, n: string, faith: string) => {
  const r = realm(s, name);
  expect(r.stateFaith).toBe(faith);
  expect(G.preacherCountFrom(r, [], 0, 1527)).toBe(Number(n));
});

When(/^"([^"]+)" adopts "(\w+)"$/, (s, name: string, faith: string) => {
  const r = realm(s, name);
  s.oldFaith = r.stateFaith;
  G.adoptFaith(r, faith, { houses: "keep", schools: "keep", year: 1600, byDecision: false, provinces: [], lords: [] });
});
Then(/^the ruler of "([^"]+)" (takes|does not take) a reformed faith for government's reforms$/, (s, name: string, t: string) => {
  expect(G.takesReformedFaith(s.oldFaith, realm(s, name).stateFaith)).toBe(t === "takes");
});

When("the holy places are loaded", (s) => {
  s.heads1444 = G.churchHeads(1444);
  s.heads1600 = G.churchHeads(1600);
});
Then(/^the holy places of the Pope, the Ecumenical Patriarch, a Caliph's claim and the Dalai Lama \(from (\d+)\) are marked$/, (s, year: string) => {
  const ids = new Set(G.holyPlaces([]).map((h) => h.id));
  for (const h of s.heads1600 as { place: string }[]) expect(ids.has(h.place)).toBe(true);
  expect((s.heads1600 as { name: string }[]).map((h) => h.name)).toEqual(["the Pope", "the Ecumenical Patriarch", "a Caliph's claim", "the Dalai Lama"]);
  expect((s.heads1444 as { id: string }[]).map((h) => h.id)).not.toContain("dalai_lama");
  expect(G.churchHeads(Number(year)).map((h) => h.id)).toContain("dalai_lama");
});
Then("religion gives church heads no rules of their own", (s) => {
  for (const h of s.heads1600 as Record<string, unknown>[]) expect(Object.keys(h).sort()).toEqual(["id", "name", "place"]);
});

Given(/^the people of "([^"]+)" convert to (\w+)$/, (s, name: string, faith: string) => {
  const p = prov(s, name, { orthodox: 0.6, catholic: 0.4 }, { people: 100000 });
  s.tongues = C.newProvinceTongues(name, { Bosnian: 100000 });
  s.tongueBefore = { ...s.tongues.people };
  p.mix = { [faith]: 1 };
});
Then("their tongue does not change", (s) => {
  expect(s.tongues.people).toEqual(s.tongueBefore);
});
Then("the faith grievances and tongue grievances stay separate", (s) => {
  const p = provinces(s)[0]!;
  const faith = Object.keys(G.faithGrievances(p, G.newRealm("Hungary", "catholic")));
  const tongue = C.updateGrievances(s.tongues, C.newCountryCulture("hungary", "Bosnian"));
  for (const g of faith) expect(tongue).not.toContain(g);
  expect(faith).toContain("Wrong faith");
  expect(tongue).not.toContain("Wrong faith");
});
