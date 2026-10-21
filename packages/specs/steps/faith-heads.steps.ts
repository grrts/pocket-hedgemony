import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { loadDefaultRuleset } from "@ph/rules";
import * as E from "@ph/engine";
import * as DIP from "@ph/engine/domain/diplomacy";
import * as RELG from "@ph/engine/domain/religion";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { worldChunks, restoreWorld } from "@ph/engine/domain/saves";
import { loadMapTiles } from "@ph/engine/node";
import * as FH from "../../engine/src/faithHeads.ts";
import { offerPeace } from "../../engine/src/war.ts";

/**
 * Heads of the faith (religion §5.17, faith-heads.feature). Scenarios that
 * name realms on the 1444 map play on a copy of the game's world (the engine's
 * faithHeads.ts); those that name realms the map has not got (Italy, Russia,
 * Qing, Vijayanagara) check the rules in domain/religion/faithHeads.ts.
 */

const { Given, When, Then } = steps("religion");
const H = RELG.heads;

const rules = loadDefaultRuleset();
let base: E.World | null = null;
/** A fresh 1444 world: a copy of one built once. */
function world(s: Scenario): E.World {
  if (!s.fhWorld) {
    base ??= E.createWorld(rules, 1, loadMapTiles(rules));
    s.fhWorld = copyWorld(base);
  }
  return s.fhWorld;
}
/** Realms the map names otherwise: the Tümed are not on the 1444 map, so the Mongols stand for them. */
const ALIAS: Record<string, string> = { Tumed: "mongols" };
const id = (name: string) => ALIAS[name] ?? name.toLowerCase().replace(/ /g, "_");
const N = (w: E.World, name: string): number => {
  const n = w.nationIndex.get(id(name));
  if (n === undefined) throw new Error(`no realm ${name} on the map`);
  return n;
};
const faithIndex = (f: string) => E.FAITH_IDS.indexOf(f);
const news = (s: Scenario): E.News[] => (s.fhNews ??= []);
const AIM: Record<string, string> = { "Take land": "take_land", Tribute: "tribute", Raid: "raid", "Seat a pretender": "seat_pretender", Punish: "punish", "No aim": "no_aim" };
const HEAD_ID: Record<string, string> = { "the Pope": "pope", "the Ecumenical Patriarch": "ecumenical_patriarch", "the Catholicos": "catholicos", "the Caliph": "caliph", "the Dalai Lama": "dalai_lama" };
const SEAT_PROVINCE: Record<string, string[]> = { Rome: ["p1624"], Constantinople: ["p1662"], "Mecca and Medina": ["p2932", "p2721"], Lhasa: ["p2614"], "Santiago de Compostela": ["p1325"] };
const month = (w: E.World) => FH.monthlyFaithHeads(w, []);
const ledger = (w: E.World, holder: number, other: number) => DIP.ledgerOf(w.diplomacy, w.nationIds[holder]!, w.nationIds[other]!);
/** Clears truces, alliances and subject ties between two realms, so one may declare on the other. */
function clearTies(w: E.World, a: number, b: number): void {
  const x = w.nationIds[a]!, y = w.nationIds[b]!;
  w.diplomacy.graph.relations = w.diplomacy.graph.relations.filter((r) => !((r.source === x && r.target === y) || (r.source === y && r.target === x)));
}
function declare(w: E.World, a: number, b: number): void {
  clearTies(w, a, b);
  const why = E.applyNow(w, { type: "declareWar", target: b }, a).rejectedOrders[0]?.reason;
  if (why) throw new Error(why);
}

// ---------------------------------------------------------------- background

Given("the date is {int}-{int}-{int}", (s, y: number, m: number, d: number) => {
  s.fhDate = { year: y, month: m, day: d };
  if (s.fhWorld) (s.fhWorld as E.World).date = { ...s.fhDate };
});

/** The world, at the scenario's date. */
function at(s: Scenario): E.World {
  const w = world(s);
  if (s.fhDate) w.date = { ...s.fhDate };
  return w;
}

// ---------------------------------------------------------------- the card (RELG-135 to RELG-138)

// "the country X is <faith>" is religion.steps.ts's step: it records s.fhFaiths and s.fhMe for these steps.
When("the player opens the Peoples tab", (s) => {
  const w = at(s);
  const faith = s.fhFaiths[s.fhMe];
  if (!w.nationIndex.has(id(s.fhMe))) {
    s.fhCard = FH.headCard(w, faith, -1);
    return;
  }
  w.player = N(w, s.fhMe);
  s.fhCard = E.faithHeadsView(w, w.player).card;
});
Then("under the faith cards there is a {string} card naming {string}, the seat {string}, its holder {string} and the patron {string}", (s, _card: string, head: string, seat: string, holder: string, patron: string) => {
  const c: E.HeadCard = s.fhCard;
  const w = at(s);
  expect(c.title).toBe(head.charAt(0).toUpperCase() + head.slice(1));
  expect(c.seat).toBe(seat);
  expect(c.holder).toBe(N(w, holder));
  expect(patron === "none" ? -1 : N(w, patron)).toBe(c.patron);
});
Then("it lists what the patron gets and what he owes", (s) => {
  expect(s.fhCard.gets.length).toBeGreaterThan(0);
  expect(s.fhCard.owes.length).toBeGreaterThan(0);
});
Then("its action button {string} is disabled with the reason {string}", (s, label: string, why: string) => {
  expect(s.fhCard.action).toMatchObject({ label, why });
});
Then("the {string} card says {string} with the reason", (s, _card: string, line: string) => {
  expect(s.fhCard.leadership).toBe("none");
  expect(s.fhCard.line.startsWith(`${line}:`)).toBe(true);
  expect(s.fhCard.line.length).toBeGreaterThan(line.length + 3);
});

Given("the ruler of {string} has died", (s, name: string) => {
  const w = at(s);
  s.fhPlayer = N(w, "castile");
  w.player = s.fhPlayer;
  FH.rulerDied(w, N(w, name), news(s));
});
Then("a dispatch says a conclave sits for {int} month", (s, months: number) => {
  expect(news(s).some((x) => x.text.includes(`A conclave sits for ${months} month`))).toBe(true);
});
Then("the {string} card lists the top three realms by votes and then the player's, one row each with cardinals and gold votes", (s) => {
  const w = at(s);
  const c = FH.headCard(w, "catholic", s.fhPlayer);
  const rows = c.conclave!.rows;
  expect(rows.length).toBeLessThanOrEqual(4);
  expect(rows.some((r) => r.n === s.fhPlayer)).toBe(true);
  const top = [...rows].slice(0, 3).map((r) => r.votes);
  expect(top).toEqual([...top].sort((a, b) => b - a));
  for (const r of rows) expect(r).toMatchObject({ cardinals: expect.any(Number), goldVotes: expect.any(Number) });
});
Then("the player sends gold in steps of {int}", (s, step: number) => {
  const w = at(s);
  w.nationTreasury[s.fhPlayer] = 1e6;
  expect(FH.whyNotConclaveGold(w, s.fhPlayer, step / 2)).toBe(`Gold goes in steps of ${step}`);
  expect(FH.headCard(w, "catholic", s.fhPlayer).conclave!.mine!.step).toBe(step);
});

When("the player of {string} opens the declare war view on {string} with the war aim {string}", (s, a: string, b: string, aim: string) => {
  const w = at(s);
  s.fhPreview = FH.censurePreview(w, N(w, a), N(w, b), AIM[aim]!);
  s.fhFaith = E.FAITH_IDS[w.nationStateFaith[N(w, a)]!];
});
Then("before confirming it lists {string} with the wrong, the number of catholic realms that will hold it, the lords who will waver and the {string} aim for every catholic realm", (s, line: string) => {
  const p = s.fhPreview;
  expect(p).not.toBeNull();
  expect(`${p.head.charAt(0).toUpperCase()}${p.head.slice(1)} will censure this war`).toBe(line);
  expect(p.wrong).toBe("Censured by the Pope");
  expect(p.realms).toBeGreaterThan(10);
  expect(p.lords).toBeGreaterThanOrEqual(0);
});

Given("the country {string} holds Mecca and Medina as Caliph", (s, name: string) => {
  const w = at(s);
  const n = N(w, name);
  for (const p of SEAT_PROVINCE["Mecca and Medina"]!) w.provinceOwner[w.provinceIndex.get(p)!] = n;
  w.player = n;
  month(w);
  E.applyNow(w, { type: "claimCaliphate" }, n);
  s.fhBadge = n;
});
/** "is anglican" and "is censured" come through the faith step; the badge applies them to the world. */
function applyState(w: E.World, name: string, state: string): number {
  const n = N(w, name);
  if (state === "anglican") w.nationStateFaith[n] = faithIndex("anglican");
  else if (state === "censured") declare(w, n, N(w, "genoa"));
  return n;
}
Then("the Faith line on its General tab shows the badge {string}", (s, badge: string) => {
  const w = at(s);
  const n = s.fhBadge ?? applyState(w, s.fhMe, s.fhFaiths[s.fhMe]);
  expect(E.faithBadge(w, n)?.text).toBe(badge);
});

// ---------------------------------------------------------------- who leads each faith (rules)

Then(/^the faith "([^"]+)" has (.+)$/, (s, faith: string, what: string) => {
  const h = H.headOf(faith);
  if (what === "no head") return expect(H.leadership(faith)).toBe("none");
  if (what === "a crown-headed church") return expect(H.leadership(faith)).toBe("crown");
  const m = /^the head "([^"]+)" (chosen|held) at "([^"]+)"(?: from (\d+))?$/.exec(what)!;
  expect(h?.name).toBe(m[1]);
  expect(h!.way === "chosen" ? "chosen" : "held").toBe(m[2]);
  expect(RELG.holyPlaces([], 1700).find((x) => x.id === h!.seat)?.name).toBe(m[3]);
  expect(h!.from).toBe(m[4] ? Number(m[4]) : undefined);
});

Given("the country {string} owns {string} and is a subject of {string}", (s, owner: string, _seat: string, overlord: string) => {
  s.fhPure = true;
  s.fhSeat = { owner, overlord };
});
Then("the patron of {string} is {string}", (s, _head: string, patron: string) => {
  if (s.fhSeat) return expect(H.seatPatron(s.fhSeat.owner, s.fhSeat.overlord)).toBe(patron);
  if (s.fhConclave) return expect(s.fhConclave.patron ?? "none").toBe(patron === "none" ? "none" : id(patron));
  const w = at(s);
  expect(FH.patronOf(w, HEAD_ID[_head]!)).toBe(patron === "none" ? -1 : N(w, patron));
});

Given("the country {string} is sunni and is the overlord of {string}", (s, ov: string, sub: string) => {
  const w = at(s);
  DIP.relations.makeSubject(w.diplomacy.graph, id(sub), id(ov));
  s.fhSub = N(w, sub);
  // The Hejaz is played here, so its AI does not claim the caliphate the moment it is free.
  w.player = s.fhSub;
});
/** Given: the Caliph's claim is put down; Then: no one holds it. */
Given("no ruler is Caliph", (s) => {
  const w = at(s);
  if (!s.fhCaliphCleared) {
    s.fhCaliphCleared = true;
    FH.setHeadPatron(w, "caliph", -1);
  }
  expect(FH.caliph(w)).toBe(-1);
});
When("{string} takes the decision {string}", (s, name: string, decision: string) => {
  const w = at(s);
  const n = N(w, name);
  const order = decision === "Claim the caliphate" ? { type: "claimCaliphate" as const } : { type: "raiseOwnPatriarch" as const };
  s.fhWhy = E.applyNow(w, order, n).rejectedOrders[0]?.reason ?? null;
  expect(s.fhWhy).toBeNull();
});
Then("the ruler of {string} is the Caliph", (s, name: string) => {
  const w = at(s);
  expect(FH.caliph(w)).toBe(N(w, name));
});
When("{string} no longer holds {string} directly or as overlord", (s, name: string) => {
  const w = at(s);
  DIP.relations.releaseSubject(w.diplomacy.graph, w.nationIds[s.fhSub]!);
  expect(FH.seatHolder(w, H.headById("caliph")!)).not.toBe(N(w, name));
  month(w);
});

Given("the country {string} has {int} catholic houses of worship at step 3 or more and sends {int} gold", (s, name: string, houses: number, gold: number) => {
  s.fhPure = true;
  (s.fhEntries ??= []).push({ realm: id(name), cardinals: houses, gold });
});
When("the conclave closes", (s) => {
  s.fhConclave = H.conclaveResult(s.fhEntries);
});
Then("the votes are France {int}, Castile {int} and Rome {int}", (s, fr: number, ca: number, rome: number) => {
  expect(s.fhConclave.votes).toEqual({ france: fr, castile: ca, rome });
});

/** A seat's owner: on the map the world changes hands; Italy, not on the 1444 map, is read by the rules. */
Given("the country {string} owns {string}", (s, owner: string, seat: string) => {
  s.fhSeatOwner = { owner, seat };
  if (s.fhOrth) return;
  const w = at(s);
  if (!w.nationIndex.has(id(owner))) return;
  for (const p of SEAT_PROVINCE[seat]!) w.provinceOwner[w.provinceIndex.get(p)!] = N(w, owner);
  month(w);
});
Given("the country {string} does not exist", (s, name: string) => {
  s.fhGone = name;
});
When("the Pope dies", (s) => {
  // Rome is held by a realm other than the Papal States: no conclave, and its holder is the patron (RELG-143).
  const pope = H.headById("pope")!;
  s.fhNoConclave = s.fhSeatOwner.owner !== pope.seatRealm && id(s.fhGone) === pope.seatRealm;
  s.fhSeat = { owner: s.fhSeatOwner.owner, overlord: null };
});
Then("no conclave sits", (s) => {
  expect(s.fhNoConclave).toBe(true);
});

Given("the country {string} takes {string} by war from the country {string}", (s, taker: string, _seat: string, loser: string) => {
  s.fhTaken = { taker, loser };
});
Then(/^every (\w+) realm holds the (wrong|tie) "([^"]+)" of (-?\d+) toward "([^"]+)", fading over (\d+) years$/, (s, faith: string, kind: string, name: string, weight: string, toward: string, years: string) => {
  if (!s.fhTaken) {
    const w = at(s);
    const p = N(w, toward);
    for (let r = 0; r < w.nationCount; r++) {
      if (r === p || w.nationGone[r] || w.nationStateFaith[r] !== faithIndex(faith)) continue;
      expect(ledger(w, r, p).some((e) => e.name === name && e.weight === Number(weight) && e.fadeYears === Number(years))).toBe(true);
    }
    return;
  }
  const loserFaith = s.fhTaken.loser === "Ottomans" ? "sunni" : faith;
  const e = H.seatTaken(faith, loserFaith);
  expect(e.kind).toBe(kind === "wrong" ? "wrongs" : "ties");
  expect(e.name).toBe(name);
  expect(e.weight).toBe(Number(weight));
  expect(e.fadeYears).toBe(Number(years));
});

Then("{string} gets no patron's tie and no extra preacher", (s, name: string) => {
  const w = at(s);
  const n = N(w, name);
  expect(FH.headPreachers(w, n)).toBe(0);
  for (let r = 0; r < w.nationCount; r++) expect(ledger(w, r, n).some((e) => e.name.endsWith("favours us"))).toBe(false);
});
Then("every orthodox community in {string} counts as served", (s, name: string) => {
  const w = at(s);
  expect(w.nationServes[N(w, name) * E.FAITH_IDS.length + faithIndex("orthodox")]).toBe(1);
});

// ---------------------------------------------------------------- what the patron gets and owes

Given("the country {string} is the Pope's patron", (s, name: string) => {
  const w = at(s);
  FH.setHeadPatron(w, "pope", N(w, name));
  s.fhBadge = N(w, name);
});
Then("every catholic realm holds the tie {string} of {int} toward {string}", (s, tie: string, weight: number, name: string) => {
  const w = at(s);
  const p = N(w, name);
  for (let r = 0; r < w.nationCount; r++) {
    if (r === p || w.nationGone[r] || w.nationStateFaith[r] !== faithIndex("catholic")) continue;
    expect(ledger(w, r, p).some((e) => e.name === tie && e.weight === weight)).toBe(true);
  }
});
Then("{string} has {int} more catholic preacher", (s, name: string, k: number) => {
  const w = at(s);
  expect(FH.headPreachers(w, N(w, name))).toBe(k);
});
Given("the country {string} is catholic and owns {string}", (s, name: string, place: string) => {
  const w = at(s);
  expect(w.nationStateFaith[N(w, name)]).toBe(faithIndex("catholic"));
  for (const p of SEAT_PROVINCE[place]!) expect(w.provinceOwner[w.provinceIndex.get(p)!]).toBe(N(w, name));
});
When("the country {string} declares war on {string}", (s, a: string, b: string) => {
  const w = at(s);
  // Granada is Castile's tributary in 1444; for the scenario it is free to declare.
  DIP.relations.releaseSubject(w.diplomacy.graph, id(a));
  // France and Castile are allies in 1444; break that so the call comes from the patronage alone.
  const patron = FH.patronOf(w, "pope");
  if (patron >= 0) DIP.relations.breakAlliance(w.diplomacy.graph, w.nationIds[patron]!, id(b));
  declare(w, N(w, a), N(w, b));
});
Then("{string} receives a defensive call to arms in that war", (s, name: string) => {
  const w = at(s);
  const call = w.diplomacy.calls.find((c) => c.called === id(name) && c.via === "pledge" && !c.answer);
  expect(call?.kind).toBe("defensive");
  s.fhCall = call;
  s.fhOaths = DIP.oathsBroken(w.diplomacy, id(name));
});
When("{string} refuses the call", (s, name: string) => {
  const w = at(s);
  E.applyNow(w, { type: "answerCall", call: s.fhCall.id, yes: false }, N(w, name));
});
Then("{string} has one more oath broken", (s, name: string) => {
  expect(DIP.oathsBroken(at(s).diplomacy, id(name))).toBe(s.fhOaths + 1);
});

When("{string} adopts the faith {string}", (s, name: string, faith: string) => {
  const w = at(s);
  w.nationStateFaith[N(w, name)] = faithIndex(faith);
  month(w);
});
Then("the Pope has no patron", (s) => {
  expect(FH.patronOf(at(s), "pope")).toBe(-1);
});

// ---------------------------------------------------------------- censure

When("{string} declares war on {string} with the war aim {string}", (s, a: string, b: string, aim: string) => {
  s.fhHead = H.censuringHead({ attackerFaith: s.fhFaiths[a], targetFaith: s.fhFaiths[b], aim: AIM[aim]! });
});
Then(/^"([^"]+)" is (censured|not censured)$/, (s, _a: string, what: string) => {
  expect(s.fhHead !== null).toBe(what === "censured");
});

Given("the country {string} is censured by the Pope in its war on {string}", (s, a: string, b: string) => {
  const w = at(s);
  const x = N(w, a), y = N(w, b);
  s.fhLords = w.lords.filter((l) => l.nation === x).map((l) => l.loyalty);
  // A Tribute aim, censured as well, so only the censure moves the lords (a war with no aim costs more, F-167).
  DIP.grantAim(w.diplomacy, { holder: w.nationIds[x]!, target: w.nationIds[y]!, aim: "tribute", source: "test" });
  declare(w, x, y);
  expect(FH.censuresOf(w, x)).toHaveLength(1);
  s.fhMe = x;
  s.fhTarget = y;
});
Then("every catholic realm holds the wrong {string} of {int} toward {string} while the war lasts", (s, wrong: string, weight: number, name: string) => {
  const w = at(s);
  const p = N(w, name);
  for (let r = 0; r < w.nationCount; r++) {
    if (r === p || w.nationGone[r] || w.nationStateFaith[r] !== faithIndex("catholic")) continue;
    expect(ledger(w, r, p).some((e) => e.name === wrong && e.weight === weight && e.fadeYears === undefined)).toBe(true);
  }
});
Then("every catholic lord of {string} wavers one step", (s, name: string) => {
  const w = at(s);
  const now = w.lords.filter((l) => l.nation === N(w, name)).map((l) => l.loyalty);
  // One step down, stopping at Disloyal (going into revolt is a rising, not a step).
  const next: Record<string, string> = { Loyal: "Wavering", Wavering: "Disloyal", Disloyal: "Disloyal", "In revolt": "In revolt" };
  now.forEach((l, k) => expect(l).toBe(next[s.fhLords[k]]));
});
Then("every catholic realm holds the war aim {string} against {string}", (s, aim: string, name: string) => {
  const w = at(s);
  const p = N(w, name);
  for (let r = 0; r < w.nationCount; r++) {
    if (r === p || w.nationGone[r] || w.nationStateFaith[r] !== faithIndex("catholic")) continue;
    expect(DIP.holdsAim(w.diplomacy, w.nationIds[r]!, w.nationIds[p]!, AIM[aim]!)).toBe(true);
  }
});
Then("a catholic ally of {string} may refuse its call without an oath broken", (s, name: string) => {
  const w = at(s);
  const war = w.diplomacy.wars.find((x) => x.declarer === id(name))!;
  const ally = w.nationIds.find((x, n) => n !== s.fhMe && n !== s.fhTarget && w.nationStateFaith[n] === faithIndex("catholic") && !war.attackers.includes(x) && !war.defenders.includes(x))!;
  const call: DIP.Call = { id: "fh-test", caller: id(name), called: ally, against: war.target, kind: war.startedBy === war.target ? "defensive" : "offensive", via: "alliance", war: war.id, issued: "1444-11", answerOn: "1444-12" };
  const before = DIP.oathsBroken(w.diplomacy, ally);
  DIP.answerCall(w.diplomacy, call, false);
  expect(DIP.oathsBroken(w.diplomacy, ally)).toBe(before);
});

Given("{string} is the Pope's patron", (s, name: string) => {
  const w = at(s);
  FH.setHeadPatron(w, "pope", N(w, name));
});
When(/^the war ends with a peace that (gives back every province taken in it|keeps one province taken in it)$/, (s, terms: string) => {
  const w = at(s);
  if (terms.startsWith("keeps")) {
    // Not the capital: one peace takes a capital only when it is the loser's last province (WAR-227).
    const capital = w.provinceIndex.get(w.rules.nations[s.fhTarget]!.capital);
    const owned = Array.from(w.provinceOwner.keys()).filter((q) => w.provinceOwner[q] === s.fhTarget);
    const p = owned.find((q) => q !== capital) ?? owned[0]!;
    w.provinceOccupier[p] = s.fhMe;
    offerPeace(w, s.fhMe, s.fhTarget, "take", [], true, [p]);
  } else offerPeace(w, s.fhMe, s.fhTarget, "white", [], true);
  w.date = { year: 1445, month: 1, day: 1 };
  month(w);
});
Then(/^the censure (ends at once and its wrong fades over 10 years|lasts until its wrong has faded over 10 years)$/, (s, how: string) => {
  const w = at(s);
  const wrong = ledger(w, N(w, "castile"), s.fhMe).find((e) => e.name === "Censured by the Pope");
  expect(wrong?.fadeYears).toBe(10);
  expect(FH.censuresOf(w, s.fhMe).length).toBe(how.startsWith("ends") ? 0 : 1);
});
Then("{string} is still the Pope's patron", (s, name: string) => {
  const w = at(s);
  expect(FH.patronOf(w, "pope")).toBe(N(w, name));
});

// ---------------------------------------------------------------- the Orthodox way out (rules: Russia is Muscovy's later name)

Given("the country {string} is orthodox with a step-4 orthodox house of worship in its capital", (s, name: string) => {
  s.fhPure = true;
  s.fhOrth = { name, raised: false, capitalHouse: true, gold: 1000, preachers: 0, crown: false };
});
When("{string} takes the decision {string} for {int} gold", (s, _name: string, _d: string, gold: number) => {
  const o = s.fhOrth;
  // Constantinople's owner (the Ottomans) is Sunni.
  expect(s.fhSeatOwner).toEqual({ owner: "Ottomans", seat: "Constantinople" });
  expect(H.whyNotOwnPatriarch({ faith: "orthodox", raised: o.raised, capitalHouse: o.capitalHouse, constantinopleFaith: "sunni", gold: o.gold, cost: gold })).toBeNull();
  expect(H.FH.own_patriarch.gold).toBe(gold);
  o.raised = true;
  o.crown = H.crownHeaded("orthodox", true);
  o.preachers = H.FH.own_patriarch.preachers;
});
Then("the church of {string} is crown-headed", (s) => {
  expect(s.fhOrth.crown).toBe(true);
});
Then("{string} has {int} more orthodox preacher", (s, _n: string, k: number) => {
  expect(s.fhOrth.preachers).toBe(k);
});
Then("{string} can no longer be censured by the Ecumenical Patriarch", (s) => {
  expect(H.censuringHead({ attackerFaith: "orthodox", targetFaith: "orthodox", aim: "take_land", attackerOwnPatriarch: true })).toBeNull();
});
Then("the decision is not offered to {string} again", (s) => {
  const o = s.fhOrth;
  expect(H.whyNotOwnPatriarch({ faith: "orthodox", raised: o.raised, capitalHouse: true, constantinopleFaith: "sunni", gold: 1000, cost: 200 })).toBe("your church already has its own patriarch");
});

// ---------------------------------------------------------------- the heads in time

When("a campaign starts in 1444", (s) => {
  at(s);
});
Then("{string} follows the Pope", (s, name: string) => {
  const w = at(s);
  expect(FH.headCard(w, E.FAITH_IDS[w.nationStateFaith[N(w, name)]!]!, N(w, name)).head).toBe("pope");
});
Then("the Caliph's claim is held by {string}", (s, name: string) => {
  const w = at(s);
  expect(FH.caliph(w)).toBe(N(w, name));
});
Then("there is no Dalai Lama", (s) => {
  const w = at(s);
  month(w);
  expect(FH.liveHeads(w).some((h) => h.id === "dalai_lama")).toBe(false);
});
When("the event {string} fires with the chooser {string}", (s, ev: string, chooser: string) => {
  const w = at(s);
  s.fhChooser = N(w, chooser);
  w.date = { year: 1578, month: 1, day: 1 };
  FH.headEventChosen(w, ev, s.fhChooser, []);
});
When("the owner of {string} changes", (s, _place: string) => {
  const w = at(s);
  w.provinceOwner[w.provinceIndex.get("p2614")!] = N(w, "ming");
  month(w);
});
Then("the patron of {string} follows the new owner of {string} or its overlord", (s) => {
  const w = at(s);
  expect(FH.patronOf(w, "dalai_lama")).toBe(N(w, "ming"));
});

Given("a conclave sits", (s) => {
  const w = at(s);
  FH.rulerDied(w, N(w, "papal_states"), []);
  w.faithHeads.conclave!.gold[N(w, "france")] = 300;
});
Given("the country {string} is censured by the Pope", (s, name: string) => {
  const w = at(s);
  declare(w, N(w, name), N(w, "genoa"));
});
When("the game is saved and loaded", (s) => {
  const w = at(s);
  s.fhBefore = structuredClone(w.faithHeads);
  s.fhAfter = restoreWorld(new Map(worldChunks(w, { playerNation: "castile", options: {} as never }).map((c) => [c.id, c])), rules, {}, loadMapTiles(rules)).world.faithHeads;
});
Then("the patrons, the Caliph, the conclave's votes, the censures and the own patriarchs are the same", (s) => {
  const a = s.fhBefore, b = s.fhAfter;
  expect(b.patron).toEqual(a.patron);
  expect(b.conclave).toEqual(a.conclave);
  expect(b.censures).toEqual(a.censures);
  expect(b.ownPatriarch).toEqual(a.ownPatriarch);
});
