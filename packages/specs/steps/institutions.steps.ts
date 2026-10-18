import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as G from "@ph/engine";
import * as I from "@ph/engine/domain/institutions";
import * as DIP from "@ph/engine/domain/diplomacy";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("institutions");

/**
 * Institutions slice 1 (INST-001 to INST-034, INST-080 to INST-085). The
 * Empire's rules are checked on the domain's own Empire (a Diplomacy and
 * realms the scenario sets up) where the feature names no campaign, and on a
 * whole 1444 world where it does: a new campaign, wars, envoys, the ledger.
 */

const RULES = loadDefaultRuleset();
type S = Scenario;

const idOf = (name: string) => name.toLowerCase().replace(/^the /, "").replace(/ü/g, "u").replace(/ /g, "_");

// ---------------------------------------------------------------- the two ways a scenario holds the Empire

/** A whole 1444 campaign, made on first need. */
function world(s: S): G.World {
  if (!s.w) {
    s.w = G.createWorld(RULES, 1);
    s.news = [] as G.News[];
  }
  return s.w;
}

/** The domain's own Empire, every catalogue member on the map, all Catholic, soldiers as the scenario sets them. */
function pure(s: S): void {
  if (s.e || s.w) return;
  s.d = DIP.createDiplomacy("1444-11-11");
  s.soldiers = new Map<string, number>();
  s.rulers = new Map<string, string>();
  s.e = I.startEmpire({ date: "1444-11-11", onMap: () => true, landOf: (id) => [`${id}_land`], rulerOf: (id) => s.rulers.get(id) ?? "Frederick" });
}

const empire = (s: S): I.Empire => (s.w ? s.w.empire! : (pure(s), s.e));
const dipl = (s: S): DIP.Diplomacy => (s.w ? s.w.diplomacy : (pure(s), s.d));
const realms = (s: S): I.Realms => (s.w ? G.realmsOf(s.w) : { soldiers: (id) => s.soldiers.get(id) ?? 1000, faith: () => "catholic" });
const head = (s: S): string | null => (s.w ? G.headOfFaith(s.w) : "papal_states");
const nation = (s: S, name: string): number => {
  const n = world(s).nationIndex.get(idOf(name));
  if (n === undefined) throw new Error(`no realm ${name}`);
  return n;
};
const province = (s: S, name: string): number => {
  const p = world(s).rules.provinces.findIndex((x) => x.name === name);
  if (p < 0) throw new Error(`no province ${name}`);
  return p;
};
const list = (names: string) => [...names.matchAll(/"([^"]+)"/g)].map((m) => idOf(m[1]!));

/** Runs the monthly step on the 1st of the given month (no other system moves). */
function monthStep(s: S, year: number, month: number): void {
  const w = world(s);
  w.date = { year, month, day: 1 };
  G.syncDate(w);
  G.monthlyInstitutions(w, s.news);
}

// ---------------------------------------------------------------- hold (INST-001 to INST-003)

Given("the Empire has hold {int}", (s, n: number) => {
  empire(s).hold = n;
});
Then("its hold reads {string}", (s, word: string) => expect(I.holdWord(empire(s).hold)).toBe(word));
Given("this year's hold gains add up to {int}", (s, n: number) => {
  s.lines = [
    { cause: "Peace in the Empire", number: 2 },
    { cause: "Defended Lorraine", number: n - 2 },
  ];
});
When("January begins", (s) => {
  if (s.w) monthStep(s, s.w.date.year + 1, 1);
  else I.countYear(empire(s), s.lines ?? []);
});
Then("the Empire's hold is {int}", (s, n: number) => expect(empire(s).hold).toBe(n));
Then("the hold record lists each gain with its cause", (s) => {
  expect(empire(s).record).toEqual(s.lines);
});

// ---------------------------------------------------------------- members and imperial land (INST-010 to INST-012)

Given("a new campaign starts on 11 November 1444", (s) => {
  const w = world(s);
  expect(w.date).toMatchObject({ year: 1444, month: 11, day: 11 });
});
Then("{string} holds the office of Emperor", (s, name: string) => expect(empire(s).holder).toBe(idOf(name)));
Then(/^((?:"[^"]+"(?:, | and )?)+) are members of the Empire$/, (s, names: string) => {
  for (const id of list(names)) expect(I.isMember(empire(s), id)).toBe(true);
});
Given("{string} held the province {string} on 1 January 1444", (s, realm: string, p: string) => {
  const w = world(s);
  expect(w.provinceOwner[province(s, p)]).toBe(nation(s, realm));
  expect(I.isImperialLand(empire(s), w.provinceIds[province(s, p)]!)).toBe(true);
});
When("{string} takes {string} in a peace", (s, realm: string, p: string) => {
  G.cedeProvince(world(s), province(s, p), nation(s, realm), s.news);
});
Then("{string} is still imperial land", (s, p: string) => expect(I.isImperialLand(empire(s), world(s).provinceIds[province(s, p)]!)).toBe(true));
Then("it is imperial land held by a non-member", (s) => {
  const lens = G.institutionsLens(world(s));
  expect([...lens.outsiderLand].some((x) => x === 1)).toBe(true);
});
Given(/^(?:the )?"([^"]+)" is a member of the Empire$/, (s, name: string) => {
  if (!s.w && !s.e) world(s);
  expect(I.isMember(empire(s), idOf(name))).toBe(true);
});
When("{string} becomes a Vassal of {string}", (s, sub: string, over: string) => {
  G.makeSubject(world(s), nation(s, sub), nation(s, over), "vassal");
  monthStep(s, 1444, 12);
});
Then("{string} is no longer a member of the Empire", (s, name: string) => expect(I.isMember(empire(s), idOf(name))).toBe(false));
Given("the {string} has its capital in imperial land and is not a member", (s, name: string) => {
  const w = world(s);
  const n = nation(s, name);
  expect(I.isMember(empire(s), w.nationIds[n]!)).toBe(false);
  empire(s).imperialLand.push(w.rules.nations[n]!.capital);
  s.asked = n;
});
When("the Emperor asks it to join and its reasons count is over zero", (s) => {
  const w = world(s);
  const e = empire(s);
  w.diplomacy.standingOverride[DIP.key(w.nationIds[s.asked]!, e.holder!)] = 100;
  expect(I.admitCount(w.diplomacy, e, w.nationIds[s.asked]!, () => "catholic").yes).toBe(true);
  expect(G.admit(w, nation(s, "Austria"), s.asked, s.news)).toBeNull();
});

// ---------------------------------------------------------------- seats and elections (INST-020 to INST-026)

Then("the Empire has {int} seats", (s, n: number) => expect(empire(s).seats).toHaveLength(n));
Then(/^((?:"[^"]+"(?:, | and )?)+) hold a seat each$/, (s, names: string) => {
  for (const id of list(names)) expect(I.seatOf(empire(s), id)).not.toBeNull();
});
Then(/^((?:"[^"]+"(?:, | and )?)+) are church seats$/, (s, names: string) => {
  for (const m of names.matchAll(/"([^"]+)"/g)) expect(empire(s).seats.find((x) => x.name === m[1])?.church).toBe(true);
});
Given("the {string} hold their highest standing toward {string} among the candidates", (s, holder: string, cand: string) => {
  const d = dipl(s);
  s.cands = ["austria", "bohemia", "saxony"];
  for (const c of s.cands) d.standingOverride[DIP.key(idOf(holder), c)] = c === idOf(cand) ? 60 : 10;
});
When("an election is held", (s) => {
  const e = empire(s);
  s.cands ??= I.candidates(e, realms(s));
  if (!s.cands.length) s.cands = I.candidates(e, realms(s));
  s.votes = I.votes(dipl(s), e, s.cands, realms(s), head(s));
  s.candidates = I.candidates(e, realms(s));
});
Then("the church seats vote for {string}", (s, cand: string) => {
  for (const seat of empire(s).seats.filter((x) => x.church)) expect(s.votes[seat.name]).toBe(idOf(cand));
});
Given("{string} holds a seat", (s, name: string) => expect(I.seatOf(empire(s), idOf(name))).not.toBeNull());
When("{string} ends", (s, name: string) => {
  I.leave(empire(s), idOf(name));
});
Then("the seat of {string} is vacant", (s, seat: string) => expect(I.vacant(empire(s).seats.find((x) => x.name === seat)!)).toBe(true));
When("the Emperor grants it to {string}", (s, name: string) => {
  const seat = empire(s).seats.find((x) => I.vacant(x))!;
  expect(I.grantSeat(empire(s), seat.name, idOf(name))).toBeNull();
});
Then("{string} holds the seat", (s, name: string) => expect(I.seatOf(empire(s), idOf(name))).not.toBeNull());
Then("the Emperor cannot grant a vacant seat to {string}", (s, name: string) => {
  const e = empire(s);
  I.leave(e, "brandenburg");
  expect(I.whyNotGrant(e, "Brandenburg", idOf(name))).toMatch(/at most one seat/);
});
Given("{string} is the Emperor's realm", (s, name: string) => expect(empire(s).holder).toBe(idOf(name)));
When("{string} gets a new ruler", (s, name: string) => {
  pure(s);
  s.rulers.set(idOf(name), "Albert");
});
Then("the Empire holds an election", (s) => {
  const e = empire(s);
  const why = I.electionDue(e, "1445-01-01", (id) => s.rulers.get(id) ?? "Frederick");
  expect(why).toMatch(/died/);
  expect(I.callElection(e, "1445-01-01", why!, realms(s))).not.toBeNull();
  expect(e.election?.ends).toBe("1445-02");
});
Given("the three members with the most soldiers are {string}, {string} and {string}", (s, a: string, b: string, c: string) => {
  pure(s);
  [a, b, c].forEach((x, k) => s.soldiers.set(idOf(x), 50000 - k * 1000));
});
Given("the ruler of {string} stands for the crown", (s, name: string) => {
  expect(I.standForCrown(empire(s), idOf(name), true)).toBeNull();
});
Then("the candidates are {string}, {string}, {string} and {string}", (s, ...names: string[]) => {
  expect([...s.candidates].sort()).toEqual(names.map(idOf).sort());
});
Given("{string} holds the crown", (s, name: string) => {
  empire(s).holder = idOf(name);
});
Given("{int} seats vote for {string} and {int} for {string} and the eighth seat is vacant", (s, a: number, x: string, b: number, y: string) => {
  const e = empire(s);
  e.seats.push({ name: "Bavaria", realm: null, church: false });
  s.cands = [idOf(x), idOf(y)];
  s.votes = Object.fromEntries(e.seats.filter((seat) => !I.vacant(seat)).slice(0, a + b).map((seat, k) => [seat.name, k < a ? idOf(x) : idOf(y)]));
  // Bohemia has more soldiers: the tie must still go to the sitting house.
  s.soldiers.set(idOf(y), 90000);
});
When("the election ends", (s) => {
  s.winner = I.winner(empire(s), s.votes, s.cands, realms(s));
});
Then("{string} keeps the crown", (s, name: string) => expect(s.winner).toBe(idOf(name)));
Given("{string} has a free envoy seat and gold for a gift", (s, name: string) => {
  const w = world(s);
  const n = nation(s, name);
  w.nationTreasury[n] = 500;
  expect(DIP.freeSeats(w.diplomacy, w.nationIds[n]!)).toBeGreaterThan(0);
});
When("{string} sends an envoy to seek the vote of {string}", (s, a: string, b: string) => {
  const w = world(s);
  const gold = w.nationTreasury[nation(s, a)]!;
  expect(G.seekVote(w, nation(s, a), nation(s, b))).toBeNull();
  expect(w.nationTreasury[nation(s, a)]).toBe(gold - I.institutionsConfig.empire.seek_vote.gift_gold);
});
Then(/^on arrival "([^"]+)" holds the tie "([^"]+)" of \+(\d+) toward "([^"]+)", fading over (\d+) years$/, (s, voter: string, tie: string, n: string, asker: string, years: string) => {
  const w = world(s);
  const ledger = () => w.diplomacy.ledgers[DIP.key(idOf(voter), idOf(asker))] ?? [];
  for (let day = 0; day < 200 && !ledger().some((x) => x.name === tie); day++) G.advance(w, G.STEPS_PER_DAY);
  const entry = ledger().find((x) => x.name === tie);
  expect(entry).toMatchObject({ weight: Number(n), fadeYears: Number(years) });
});
Then("it counts in the reasons of the seat of {string}", (s, voter: string) => {
  const w = world(s);
  const rows = I.seatReasons(w.diplomacy, empire(s), idOf(voter), "bavaria", realms(s));
  expect(rows.find((r) => r.name === "Sought our vote")?.number).toBe(I.institutionsConfig.empire.seek_vote.tie);
});

// ---------------------------------------------------------------- the Emperor (INST-030 to INST-033)

Given("{string} is the Emperor with hold {int}", (s, name: string, hold: number) => {
  const w = world(s);
  expect(empire(s).holder).toBe(idOf(name));
  empire(s).hold = hold;
  // The player rules the Emperor's realm, so the call waits for an answer.
  w.player = nation(s, name);
});
function declare(s: S, a: string, b: string): void {
  const w = world(s);
  if (w.player < 0) w.player = w.nationIndex.get(empire(s).holder!)!;
  expect(G.declareWar(w, nation(s, a), nation(s, b), s.news)).toBeNull();
}
When("{string} declares war on the member {string}", (s, a: string, b: string) => declare(s, a, b));
Given("{string} has declared war on the member {string}", (s, a: string, b: string) => declare(s, a, b));
const defenceCall = (s: S, member: string) => world(s).diplomacy.calls.find((c) => c.via === "empire" && c.caller === idOf(member));
Then("{string} is called to defend {string}", (s, emperor: string, member: string) => {
  expect(defenceCall(s, member)).toMatchObject({ called: idOf(emperor), kind: "defensive" });
  expect(defenceCall(s, member)?.answer).toBeUndefined();
  expect(empire(s).defence.some((x) => x.member === idOf(member))).toBe(true);
});
When(/^"([^"]+)" (answers the call|refuses the call|does not answer)$/, (s, _emperor: string, answer: string) => {
  const w = world(s);
  const call = w.diplomacy.calls.find((c) => c.via === "empire" && !c.answer)!;
  if (answer === "does not answer") monthStep(s, 1444, 12);
  else {
    G.answerCall(w, call, answer === "answers the call", s.news);
    G.defenceCalls(w, empire(s), s.news);
  }
});
When("the Emperor refuses the call to defend {string}", (s, member: string) => {
  const w = world(s);
  G.answerCall(w, defenceCall(s, member)!, false, s.news);
  G.defenceCalls(w, empire(s), s.news);
});
Then(/^"([^"]+)" and every elector hold the wrong "([^"]+)" toward the Emperor$/, (s, member: string, wrong: string) => {
  const e = empire(s);
  const d = dipl(s);
  const holders = [idOf(member), ...e.seats.map((x) => x.realm).filter((x): x is string => !!x && x !== e.holder)];
  for (const h of holders) expect((d.ledgers[DIP.key(h, e.holder!)] ?? []).some((x) => x.name === wrong)).toBe(true);
});
Given("{string} is not a member and holds imperial land", (s, name: string) => {
  const w = world(s);
  expect(I.isMember(empire(s), idOf(name))).toBe(false);
  G.cedeProvince(w, province(s, "Meuse"), nation(s, name), s.news);
  monthStep(s, 1444, 12);
});
Then("the Emperor holds the war aim {string} on {string}", (s, aim: string, target: string) => {
  const d = dipl(s);
  expect(DIP.warAimsOf(d, empire(s).holder!, idOf(target)).some((a) => DIP.aimName(a.aim) === aim)).toBe(true);
});
Given("the Empire has {int} members and hold {int}", (s, n: number, hold: number) => {
  world(s);
  expect(empire(s).members).toHaveLength(n);
  empire(s).hold = hold;
});
When("a new month begins", (s) => {
  G.runLedger(world(s), false);
});
Then("the Emperor receives {int} gold in dues", (s, gold: number) => {
  const w = world(s);
  expect(G.empireDues(w, w.nationIndex.get(empire(s).holder!)!)).toBe(gold);
  expect(G.empireDues(w, nation(s, "Saxony"))).toBe(0);
});
Given(/^"([^"]+)" and "([^"]+)", both members, are at war all year$/, (s, a: string, b: string) => {
  const w = world(s);
  expect(G.declareWar(w, nation(s, a), nation(s, b), s.news)).toBeNull();
  // A war between members calls no Emperor.
  expect(empire(s).defence).toHaveLength(0);
});
Given("no non-member holds imperial land", (s) => {
  expect([...G.institutionsLens(world(s)).outsiderLand].every((x) => x === 0)).toBe(true);
});
Then("the hold record shows {int} for the war between {string} and {string}", (s, n: number, a: string, b: string) => {
  expect(empire(s).record).toContainEqual({ cause: `War between ${[a, b].sort().join(" and ")}`, number: n });
});
Then("no gain for peace in the Empire", (s) => expect(empire(s).record.some((l) => l.cause === "Peace in the Empire")).toBe(false));

// ---------------------------------------------------------------- on screen (INST-080 to INST-085)

Given("the player plays {string}", (s, name: string) => {
  world(s).player = nation(s, name);
});
const view = (s: S): G.EmpireView => {
  const w = world(s);
  const v = G.empireView(w, w.player);
  expect(v).not.toBeNull();
  return v!;
};
When("the player opens their country card's Diplomacy tab", (s) => {
  s.view = view(s);
});
Then("an Institutions row reads {string}", (s, text: string) => {
  const v: G.EmpireView = s.view;
  const w = world(s);
  expect(I.institutionRow({ name: v.name, office: I.institutionsConfig.empire.office, holder: w.rules.nations[v.emperor]!.name, hold: v.hold, role: v.role })).toBe(text);
});
Then(/^tapping (?:it|the badge) opens the Empire card$/, (s) => {
  expect(view(s).name).toBe("The Empire");
  expect(I.EMPIRE_FOLDS[0]).toBe("Election");
});
When("the player opens the country card of {string}", (s, name: string) => {
  s.badge = I.empireBadge(I.roleOf(empire(s), idOf(name)));
});
Then("it shows the badge {string}", (s, badge: string) => expect(s.badge).toBe(badge));
When("the player opens the Empire card", (s) => {
  if (s.shape) s.card = I.institutionCard(s.shape);
  else {
    if (world(s).player < 0) world(s).player = nation(s, "Saxony");
    s.view = view(s);
  }
});
Then("it shows the Emperor, the hold bar with number and word, and the player's role", (s) => {
  const v: G.EmpireView = s.view;
  expect(v.emperor).toBe(nation(s, "Austria"));
  expect(v.ruler).not.toBe("");
  expect(v).toMatchObject({ hold: 35, word: "Weak", role: "Elector" });
});
Then("it has the folds Election, Reforms, Members and Hold", () => expect([...I.EMPIRE_FOLDS]).toEqual(["Election", "Reforms", "Members", "Hold"]));
Given("the player opens the Election fold", (s) => {
  world(s).player = nation(s, "Bavaria");
  s.view = view(s);
});
When("the player taps the seat of {string}", (s, seat: string) => {
  s.seat = (s.view as G.EmpireView).seats.find((x) => x.name === seat);
});
Then("the reasons list of {string} for each candidate opens", (s, _seat: string) => {
  const v: G.EmpireView = s.view;
  expect(s.seat.reasons.map((r: { candidate: number }) => r.candidate).sort()).toEqual([...v.candidates].sort());
  for (const r of s.seat.reasons) expect(r.rows.length).toBeGreaterThan(0);
});
Then("a {string} button is shown, or why not", (s, _button: string) => {
  // Bavaria is a member with gold and a free envoy: it may seek Saxony's vote.
  expect(s.seat.seekWhyNot).toBeNull();
});
When("a call to defend the Empire concerns the player", (s) => {
  const w = world(s);
  w.player = nation(s, "Austria");
  declare(s, "France", "Lorraine");
  s.call = w.diplomacy.calls.find((c) => c.via === "empire")!;
});
Then("an answer card with two 44-point buttons waits in the dispatches and on Needs attention", (s) => {
  const w = world(s);
  const waiting = w.diplomacy.calls.filter((c) => !c.answer && c.called === w.nationIds[w.player]);
  expect(waiting.map((c) => c.via)).toContain("empire");
  expect(I.institutionCard("Short wide").minTap).toBeGreaterThanOrEqual(44);
});
Then("silence counts as {string}", (s, silence: string) => {
  expect(I.SILENCE.defence).toBe(silence);
  monthStep(s, 1444, 12);
  expect(s.call.answer).toBe("no");
});
When("the player picks the Institutions lens", (s) => {
  s.lens = G.institutionsLens(world(s));
});
Then("the Emperor's land is gold and members' land light gold", (s) => {
  expect(s.lens.realm[nation(s, "Austria")]).toBe(3);
  expect(s.lens.realm[nation(s, "Hesse")]).toBe(1);
  expect(s.lens.realm[nation(s, "France")]).toBe(0);
  expect(I.INSTITUTIONS_KEY.map((k) => k.colour).slice(0, 2)).toEqual(["gold", "light gold"]);
});
Then("seats carry a mark and imperial land held by outsiders is hatched", (s) => {
  expect(s.lens.realm[nation(s, "Saxony")]).toBe(2);
  expect(I.INSTITUTIONS_KEY.find((k) => k.what.includes("seat"))?.pattern).toBe("seat mark");
  expect(I.INSTITUTIONS_KEY.find((k) => k.what.includes("outsider"))?.pattern).toBe("hatched");
});
Then("the lens reads with patterns as well as colours", () => {
  const seen = new Set(I.INSTITUTIONS_KEY.map((k) => `${k.colour}/${k.pattern}`));
  expect(seen.size).toBe(I.INSTITUTIONS_KEY.length);
});
Given("the window has the {word} layout", (s, layout: string) => {
  s.shape = layout === "Wide" ? "Short wide" : layout;
});
Then(/^it sits as a (side sheet|bottom sheet) inside the safe areas$/, (s, sheet: string) => {
  expect(s.card).toMatchObject({ sheet, safeAreas: true });
});
Then("every fold header, row and button is at least 44 points high", (s) => expect(s.card.minTap).toBeGreaterThanOrEqual(44));
Then("nothing needs hover", (s) => expect(s.card.hover).toBe(false));
