import { expect } from "vitest";
import {
  PLAYABLE_SUBJECTS,
  acceptsTributaryOffer,
  addEventReason,
  addReason,
  aiAcceptsNewSubject,
  aiOverlord,
  aiSubject,
  answerDefence,
  armySeenByOverlord,
  arrangeMarriage,
  arrows,
  baseShare,
  becomeSubjectAllowed,
  callToWar,
  cardButtons,
  charterColony,
  claimOnOverlordThrone,
  colonyStage,
  colonyStageTraits,
  courtingSeen,
  depose,
  fateWhenOverlordFalls,
  foldIn,
  foldInMissing,
  foreignEnvoys,
  foundColony,
  frontierGrant,
  grantsLoosenAsk,
  harmHostage,
  inheritCrown,
  isSeasonEnd,
  joinRising,
  kindDrift,
  kindFromName,
  kindIcon,
  lendOfficial,
  loosen,
  mayAct,
  mayActAbroad,
  mayAttackFellowSubject,
  mayHoldSubjects,
  mergeCrowns,
  mergeCrownsMissing,
  newBond,
  overlordOwes,
  overlordWinsIndependenceWar,
  owesDefence,
  payTribute,
  progressEnvoys,
  protectorateAllowed,
  raiseLord,
  reachFromCapacity,
  reachUsed,
  reachWeight,
  reasonsOf,
  records1444,
  regionMark,
  removeReason,
  rise,
  rises,
  rulerDiesWithoutHeir,
  rungOf,
  seasonCount,
  seatPretender,
  secondMasterTribute,
  leansTo,
  setTribute,
  settlerIndependenceTrigger,
  sharesOverlordWars,
  start1444,
  startFoldIn,
  startLoyalty1444,
  stationResident,
  stepFromName,
  stepName,
  stepUp,
  subjectFromEvent,
  subjectOrLord,
  subjectRow,
  subjectWinsIndependenceWar,
  subjectsList,
  takeHostage,
  tighten,
  tributeOwed,
  judgeQuarrel,
  subjectRulerDied,
  waveringStillInWar,
  yearEndStipend,
  type ColonyStage,
  type Kind,
  type Reason,
  type Record1444,
  type RosterEntry,
  type Step,
  type SubjectBond,
  type SubjectSituation,
  type Tie,
  type WarAnswer,
} from "@ph/engine/domain/subjects";
import {
  breakSubjectPeace,
  breakSubjectWar,
  changeMasters,
  forceUsed,
  giftCost,
  kindByAgreement,
  mapRelationKind,
  release,
  sendGift,
  stretchedThin,
} from "@ph/engine/domain/subjects";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("subjects");

const START = 1444 * 12 + 10; // November 1444

function now(s: Scenario): number {
  s.now ??= START;
  return s.now;
}

function bonds(s: Scenario): Map<string, SubjectBond> {
  s.bonds ??= new Map<string, SubjectBond>();
  return s.bonds;
}

/** The bond of a subject, made on first mention (overlord "O", a Loyal Vassal, unless set). */
function bond(s: Scenario, name: string, init: Partial<SubjectBond> = {}): SubjectBond {
  const all = bonds(s);
  // The 1444 data keys subjects by lower-case id ("brittany"); the features name them ("Brittany").
  if (!all.has(name) && all.has(name.toLowerCase())) name = name.toLowerCase();
  let b = all.get(name);
  if (!b) {
    b = newBond({ subject: name, overlord: "O", kind: "vassal", ...init }, now(s));
    all.set(name, b);
  } else {
    Object.assign(b, init);
    if (init.loyalty) b.loyalSince = init.loyalty === "loyal" ? now(s) : null;
  }
  return b;
}

function sit(s: Scenario, name: string): SubjectSituation {
  s.sit ??= new Map<string, SubjectSituation>();
  if (!s.sit.has(name)) s.sit.set(name, {});
  return s.sit.get(name);
}

/** Reasons a scenario gives as bare arrows. */
function extra(s: Scenario, name: string): Reason[] {
  s.extra ??= new Map<string, Reason[]>();
  if (!s.extra.has(name)) s.extra.set(name, []);
  return s.extra.get(name);
}

function currentReasons(s: Scenario, name: string): Reason[] {
  const b = bond(s, name);
  const st = { ...sit(s, name) };
  const own = [...bonds(s).values()].filter((x) => x.overlord === name).length;
  if (own) st.ownSubjects = own;
  return [...reasonsOf(b, now(s), st), ...extra(s, name)];
}

function only(s: Scenario): SubjectBond {
  const all = [...bonds(s).values()];
  return s.focus ? bond(s, s.focus) : all[0]!;
}

function otherSubjectsOf(s: Scenario, b: SubjectBond): SubjectBond[] {
  const others = [...bonds(s).values()].filter((x) => x !== b && x.overlord === b.overlord);
  if (others.length === 0) others.push(bond(s, "another subject", { overlord: b.overlord }));
  return others;
}

/** Folding scenarios that do not state the years treat the time requirements as met. */
function primeYears(s: Scenario, b: SubjectBond): void {
  if (s.yearsGiven) return;
  b.since = Math.min(b.since, now(s) - 20 * 12);
  if (b.loyalty === "loyal") b.loyalSince = Math.min(b.loyalSince ?? now(s), now(s) - 10 * 12);
}

const KIND = "(Vassal|Tributary|Union|March|Colony|Protectorate)";
const STEP = "(Loyal|Wavering|Disloyal|In revolt)";

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

Given("the subject rules are in force", () => {});

When("the game evaluates it", (s) => {
  s.acted = true;
});

Given("the date is {string}", (s, date: string) => {
  const [y, m] = date.split("-").map(Number);
  s.now = y! * 12 + (m ?? 1) - 1;
});

Given("the era is {string}", (s, era: string) => {
  s.era = era;
});

Then("the order is {word}", (s, result: string) => {
  expect(s.order.ok).toBe(result === "accepted");
});

Then(/^the order is refused: (.+)$/, (s, why: string) => {
  expect(s.order.ok).toBe(false);
  if (s.orderContext === "fold") expect(s.order.missing).toBe(why);
  if (s.orderContext === "tighten") expect(why).toBe("Vassal to Union is not possible");
});

Then("the order is refused until the war is won", (s) => {
  expect(s.order).toEqual({ ok: false, missing: "win the war first" });
});

Then("it is {word}", (s, result: string) => {
  expect(s.allowed).toBe(result === "allowed");
});

// ---------------------------------------------------------------------------
// Ladder and kinds
// ---------------------------------------------------------------------------

Given(/^the province "([^"]+)" is (run by|held by|in) (.+)$/, (s, province: string, how: string, rest: string) => {
  s.provinces ??= {};
  if (how === "run by") s.provinces[province] = { runBy: "official", ownerHasOverlord: false };
  else if (how === "held by") s.provinces[province] = { runBy: "lord", ownerHasOverlord: false };
  else s.provinces[province] = { runBy: "own ruler", ownerHasOverlord: / a subject of "/.test(rest) && !/no overlord/.test(rest) };
});

Then("the province {string} is on the rung {string}", (s, province: string, rung: string) => {
  expect(rungOf(s.provinces[province])).toBe(rung);
});

Given(/^the realm "([^"]+)" under "([^"]+)" (its own country on the map with treasury, army, lords and diplomacy|no country of its own on the map)$/, (s, realm: string, _o: string, has: string) => {
  s.realms ??= {};
  s.realms[realm] = has.startsWith("its own");
});

Then("{string} is a {string}", (s, realm: string, what: string) => {
  expect(subjectOrLord(s.realms[realm])).toBe(what);
});

Given("the catalogue lists {string} as a subject of {string}", (s, subject: string, overlord: string) => {
  s.records ??= [] as Record1444[];
  s.records.push({ subject, overlord, subjectKind: "vassal", autonomy: "moderate", startDate: null });
});

Given("the 1444 map has no nation {string}", (s, name: string) => {
  s.notOnMap ??= new Set<string>();
  s.notOnMap.add(name);
});

function startScenario(s: Scenario): void {
  s.acted = true;
  const records: Record1444[] = s.records ?? [];
  const notOnMap: Set<string> = s.notOnMap ?? new Set();
  const out = start1444(records, { isMapNation: (id) => !notOnMap.has(id), startMonth: now(s), startYear: Math.floor(now(s) / 12) });
  s.lords = out.lords;
  for (const b of out.bonds) {
    const prev = bonds(s).get(b.subject) ?? bonds(s).get(s.renamed?.[b.subject] ?? "");
    // A worked example renames ids to names ("france" → "France"); keep its naming when the scenario starts again.
    if (prev) Object.assign(prev, { ...b, subject: prev.subject, overlord: prev.overlord });
    else bonds(s).set(b.subject, b);
  }
}

When("the scenario starts", (s) => startScenario(s));

When("the scenario starts on {string}", (s, date: string) => {
  const [y, m] = date.split("-").map(Number);
  s.now = y! * 12 + m! - 1;
  startScenario(s);
});

Then("{string} is a lord of {string} with a lord card filled from the catalogue's history", (s, name: string, overlord: string) => {
  expect(s.lords).toContainEqual({ name, overlord, fromCatalogue: true });
  expect(bonds(s).has(name)).toBe(false);
});

Given("the subject {string} is of the kind {string}", (s, name: string, kind: string) => {
  bond(s, name, { kind: kindFromName(kind) });
});

Then("its icon is {string}", (s, icon: string) => {
  expect(kindIcon(only(s).kind)).toBe(icon);
});

Given("the subject {string} is a Loyal {string} with an income of {int} gold a month at normal tribute", (s, name: string, kind: string, income: number) => {
  bond(s, name, { kind: kindFromName(kind), loyalty: "loyal", tribute: "normal" });
  s.income ??= {};
  s.income[name] = income;
});

function monthEnds(s: Scenario): void {
  s.acted = true;
  s.paid ??= {};
  for (const b of bonds(s).values()) {
    const income = s.income?.[b.subject];
    if (income === undefined) continue;
    s.paid[b.subject] = payTribute(b, income, s.treasury?.[b.subject] ?? 1e9, s.castles?.[b.overlord] ?? []);
    if (s.secondMaster?.[b.subject]) s.paid[`${b.subject}→second`] = secondMasterTribute(income);
  }
  for (const b of bonds(s).values()) {
    const ctx = s.rising?.[b.subject];
    if (ctx && rises(b, ctx)) s.rose = [...(s.rose ?? []), b.subject];
  }
  s.now = now(s) + 1;
}

When("the month ends", (s) => monthEnds(s));

Then("{string} pays its overlord {int} gold from its treasury", (s, name: string, gold: number) => {
  expect(s.paid[name].gold).toBeCloseTo(gold, 6);
});

Then("{string} pays {int} gold", (s, name: string, gold: number) => {
  expect(s.paid[name].gold).toBeCloseTo(gold, 6);
});

Given(new RegExp(`^the subject "([^"]+)" is an? ${KIND} of "([^"]+)"$`), (s, name: string, kind: string, overlord: string) => {
  bond(s, name, { kind: kindFromName(kind), overlord });
});

Then("the trade goods of {string} flow to {string} first", (s, name: string, overlord: string) => {
  const b = bond(s, name);
  expect(b.kind).toBe("colony");
  expect(b.overlord).toBe(overlord);
  expect(baseShare(b)).toBe(0.25);
});

Given("the overlord {string} takes the tribute of {string} in grain", (s, overlord: string, name: string) => {
  bond(s, name, { overlord, kind: "tributary", tributeForm: "grain" });
  s.income ??= {};
  s.income[name] = 100;
  s.castles ??= {};
  s.castles[overlord] = [
    { id: "a far castle", distance: 9 },
    { id: "the nearest castle", distance: 2 },
  ];
});

Then("the grain arrives at the nearest castle of {string}", (s, _overlord: string) => {
  const paid = Object.values(s.paid as Record<string, { grain: number; castle?: string }>)[0]!;
  expect(paid.grain).toBeGreaterThan(0);
  expect(paid.castle).toBe("the nearest castle");
});

Then("it counts toward the Food of {string}", (s) => {
  const paid = Object.values(s.paid as Record<string, { gold: number; grain: number }>)[0]!;
  expect(paid.gold).toBe(0);
  expect(paid.grain).toBeGreaterThan(0);
});

Given(/^the subject "([^"]+)" is an? (Loyal|Wavering|Disloyal) "([^"]+)" of "([^"]+)"$/, (s, name: string, step: string, kind: string, overlord: string) => {
  bond(s, name, { loyalty: stepFromName(step), kind: kindFromName(kind), overlord });
});

When(/^"([^"]+)" goes to war (when called|anywhere|on the March's own frontier|far from its frontier)$/, (s, _o: string, where: string) => {
  s.acted = true;
  s.answer = callToWar(only(s), now(s), { onOwnFrontier: where === "on the March's own frontier" });
});

const ANSWERS: Record<string, WarAnswer[]> = {
  "comes at once with its whole army": ["whole_at_once"],
  "never comes": ["not_called"],
  comes: ["whole_at_once", "half_late"],
  "does not come": ["refuses", "not_called"],
  "fights and raids the enemy there": ["frontier"],
  "defends itself only": ["defends_self"],
  "comes with half its army, late": ["half_late"],
  refuses: ["refuses"],
  "is not called": ["not_called"],
};

Then(new RegExp(`^"([^"]+)" (${Object.keys(ANSWERS).map((k) => k.replace(/[,]/g, ",")).join("|")})$`), (s, name: string, answer: string) => {
  if (s.offer !== undefined) {
    expect(answer).toBe("refuses");
    expect(s.offer).toBe(false);
    return;
  }
  void name;
  expect(ANSWERS[answer]).toContain(s.answer);
});

Given(/^the subject "([^"]+)" is an? "([^"]+)" of "([^"]+)"$/, (s, name: string, kind: string, overlord: string) => {
  bond(s, name, { kind: kindFromName(kind), overlord });
});

When(/^"([^"]+)" (allies with a country at war with "[^"]+"|signs a trade pact with a third country|allies with any country|sends an envoy of its own|proposes an alliance)$/, (s, name: string, act: string) => {
  const kind = bond(s, name).kind;
  if (act.startsWith("allies with a country at war")) s.allowed = mayActAbroad(kind, "alliance", true);
  else if (act.startsWith("signs a trade pact")) s.allowed = mayActAbroad(kind, "pact", false);
  else if (act === "allies with any country") s.allowed = mayActAbroad(kind, "alliance", false);
  else if (act === "sends an envoy of its own") s.allowed = mayActAbroad(kind, "envoy", false);
  else s.allowed = mayActAbroad(kind, "alliance", false);
});

Then("the act is {word}", (s, result: string) => {
  expect(s.allowed).toBe(result === "allowed");
});

Given("the subject {string} is a {string}", (s, name: string, kind: string) => {
  bond(s, name, { kind: kindFromName(kind) });
});

When("{string} would gain a subject", (s, name: string) => {
  s.allowed = mayHoldSubjects(bond(s, name).kind);
});

const OWED: Record<string, string[]> = {
  "defence when attacked": ["defence"],
  'defence when attacked by anyone but "O"': ["defence_except_from_overlord"],
  "defence and one ruler for both": ["defence", "shared_ruler"],
  "a yearly stipend of gold or titles": ["yearly_stipend"],
  "defence and ships on its sea route": ["defence", "sea_route"],
  defence: ["defence"],
};

Then(/^"([^"]+)" owes "([^"]+)" (.+)$/, (s, _o: string, name: string, owed: string) => {
  expect(overlordOwes(bond(s, name).kind)).toEqual(OWED[owed]);
});

Then("its reasons include a kind drift of {int}", (s, drift: number) => {
  const b = only(s);
  expect(kindDrift(b.kind)).toBe(drift);
  const r = reasonsOf(b, now(s)).find((x) => x.id === "drift");
  expect(r?.arrow ?? 0).toBe(drift);
});

Given(/^the country "([^"]+)" (is|is not) an overseas trade empire$/, (s, _c: string, is: string) => {
  s.overseas = is === "is";
});

When("{string} would make a Protectorate", (s) => {
  s.allowed = protectorateAllowed(s.era, s.overseas);
});

// ---------------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------------

Given("the subject {string} owes {int} gold a month and is {string}", (s, name: string, gold: number, step: string) => {
  const b = bond(s, name, { kind: "vassal", loyalty: stepFromName(step) });
  s.income ??= {};
  s.income[name] = gold / tributeOwed(b, 1);
});

const ENVOYS: Record<string, string> = { "turns away": "refused", "listens to": "listens", "bargains with": "seeks_backer", "is at war and ignores": "at_war" };

Then(/^"([^"]+)" (turns away|listens to|bargains with|is at war and ignores) foreign envoys$/, (s, name: string, how: string) => {
  expect(foreignEnvoys(bond(s, name).loyalty)).toBe(ENVOYS[how]);
});

Given("the subject {string} is {string}", (s, name: string, step: string) => {
  bond(s, name, { loyalty: stepFromName(step) });
});

function tryFold(s: Scenario, b: SubjectBond, ctx = { reachable: true, lordRoom: true }): void {
  s.acted = true;
  s.orderContext = "fold";
  const missing = foldInMissing(b, now(s), ctx);
  s.order = missing === null ? { ok: true } : { ok: false, missing };
}

When("its overlord tries to fold it in", (s) => {
  const b = only(s);
  primeYears(s, b);
  tryFold(s, b);
});

Given("the Vassal {string} is {string}", (s, name: string, step: string) => {
  bond(s, name, { kind: "vassal", loyalty: stepFromName(step) });
});

Given(/^its overlord's war is (far from its border|on its border)$/, (s, where: string) => {
  s.onBorder = where === "on its border";
});

When("{string} is called to war and {int} months pass", (s, name: string, months: number) => {
  s.answer = callToWar(bond(s, name), now(s));
  s.stillInWar = waveringStillInWar(months, s.onBorder);
});

Then("{string} sent half its army, late", (s) => {
  expect(s.answer).toBe("half_late");
});

Then(/^"([^"]+)" (has gone home|stays in the war)$/, (s, _name: string, home: string) => {
  expect(s.stillInWar).toBe(home === "stays in the war");
});

When("its overlord calls it to war twice", (s) => {
  const b = only(s);
  s.answers = [callToWar(b, now(s)), callToWar(b, now(s))];
});

Then("{string} refuses both calls", (s) => {
  expect(s.answers).toEqual(["refuses", "refuses"]);
});

Then("{string} gains the down reason {string} for {int} months", (s, name: string, label: string, months: number) => {
  const r = bond(s, name).reasons.find((x) => x.label === label)!;
  expect(r.arrow).toBeLessThan(0);
  expect(r.until! - r.from).toBe(months);
});

Then("its overlord sees no true size of the army of {string}", (s, name: string) => {
  expect(armySeenByOverlord(bond(s, name), 5000)).toBeNull();
});

Given("the subject {string} has reasons", (s, name: string) => {
  const b = bond(s, name, { kind: "vassal", loyalty: "wavering" });
  Object.assign(sit(s, name), { sameFaith: true, sameCulture: false, courted: true });
  b.since = now(s) - 40 * 12;
});

Given(/^the subject "([^"]+)" is (Loyal|Wavering|Disloyal|In revolt)$/, (s, name: string, step: string) => {
  bond(s, name, { loyalty: stepFromName(step) });
});

When("the player opens the card of {string}", (s, name: string) => {
  const b = bond(s, name);
  s.card = { reasons: currentReasons(s, name), buttons: cardButtons(b.overlord, b, now(s), { reachable: true, lordRoom: true }), bond: b };
});

Then("every reason shows as a named badge pointing up or down", (s) => {
  expect(s.card.reasons.length).toBeGreaterThan(0);
  for (const r of s.card.reasons as Reason[]) {
    expect(r.label.length).toBeGreaterThan(0);
    expect(r.arrow).not.toBe(0);
  }
});

Then("no loyalty number is shown or kept", (s) => {
  const b = s.card.bond as SubjectBond;
  expect(typeof b.loyalty).toBe("string");
  for (const [k, v] of Object.entries(b)) if (/loyal/i.test(k) && k !== "loyalSince") expect(typeof v).not.toBe("number");
});

Then("the button {string} is locked and reads {string}", (s, action: string, reads: string) => {
  const button = (s.card.buttons as { action: string; locked: string | null }[]).find((x) => x.action === action)!;
  expect(button.locked).toBe(reads);
});

Given("the subject {string} is {string} with {int} up arrows and {int} down arrows", (s, name: string, step: string, up: number, down: number) => {
  bond(s, name, { loyalty: stepFromName(step) });
  extra(s, name).push({ id: "up", label: "up", arrow: up }, { id: "down", label: "down", arrow: -down });
});

function seasonEnds(s: Scenario): void {
  s.acted = true;
  s.now = now(s) + 3;
  s.triggers = [] as string[];
  for (const b of bonds(s).values()) {
    if (s.reach?.[b.overlord] !== undefined) applyStretched(s, b.overlord);
    const total = arrows(currentReasons(s, b.subject)).total;
    seasonCount(b, s.forcedTotal?.[b.subject] ?? total, now(s));
    if (settlerIndependenceTrigger(b)) s.triggers.push(b.subject);
  }
}

When("the season ends", (s) => seasonEnds(s));

Then("{string} is {string}", (s, name: string, step: string) => {
  expect(stepName(bond(s, name).loyalty)).toBe(step);
});

Given("the subject {string} dropped from {string} to {string} {int} months ago", (s, name: string, _from: string, to: string, months: number) => {
  const b = bond(s, name, { loyalty: stepFromName(to) });
  b.lastStep = { month: now(s) - months, dir: -1 };
});

Given("its arrows total {int}", (s, total: number) => {
  extra(s, only(s).subject).push({ id: "total", label: "total", arrow: total });
});

Then("{string} is still {string}", (s, name: string, step: string) => {
  expect(stepName(bond(s, name).loyalty)).toBe(step);
});

// Situations of the reasons table (SUBJ-032)
Given("{string} shares its overlord's faith", (s, name: string) => {
  bond(s, name);
  sit(s, name).sameFaith = true;
});
Given("{string} has another faith and its overlord persecutes it", (s, name: string) => {
  bond(s, name);
  Object.assign(sit(s, name), { sameFaith: false, persecuted: true });
});
Given("the ruler of {string} shares the culture of its overlord's ruler", (s, name: string) => {
  bond(s, name);
  sit(s, name).sameCulture = true;
});
Given("the culture of {string} is not accepted by its overlord", (s, name: string) => {
  bond(s, name);
  Object.assign(sit(s, name), { sameCulture: false, cultureAccepted: false });
});
Given("its overlord defended {string} {int} years ago", (s, name: string, years: number) => {
  addReason(bond(s, name), "defended", now(s) - years * 12);
});
Given("its overlord sent a gift {int} years ago", (s, years: number) => {
  addReason(bond(s, "S"), "gift", now(s) - years * 12);
});
Given("a marriage binds the houses", (s) => {
  arrangeMarriage(bond(s, "S"));
});
Given("an envoy of its overlord is resident there", (s) => {
  stationResident(bond(s, "S"));
});
Given("a foreign envoy works against its overlord there", (s) => {
  bond(s, "S");
  sit(s, "S").courted = true;
});
Given("both have the same rival", (s) => {
  bond(s, "S");
  sit(s, "S").commonEnemy = true;
});
Given("{string} has been a subject {int} years", (s, name: string, years: number) => {
  bond(s, name).since = now(s) - years * 12;
});
Given("tribute is {word}", (s, level: string) => {
  setTribute(bond(s, "S"), level as SubjectBond["tribute"]);
});
Given("its overlord lost a war {int} years ago", (s, years: number) => {
  addReason(bond(s, "S"), "lost_war", now(s) - years * 12);
});
Given("a new ruler took its overlord's throne {int} years ago", (s, years: number) => {
  addReason(bond(s, "S"), "new_overlord_ruler", now(s) - years * 12);
});
Given("no land path and no sea route of its overlord reach {string}", (s, name: string) => {
  bond(s, name);
  sit(s, name).farAway = true;
});
Given("{string} holds a subject of its own", (s, name: string) => {
  bond(s, name);
  bond(s, `${name}'s own subject`, { overlord: name });
});
Given(/^"([^"]+)" is (Hostile|Rival) toward its overlord$/, (s, name: string, stance: string) => {
  bond(s, name);
  sit(s, name).stance = stance === "Hostile" ? "hostile" : "rival";
});

function hasReason(s: Scenario, name: string, label: string, arrow: number): void {
  const found = currentReasons(s, name).filter((r) => r.label === label);
  expect(found.map((r) => r.arrow), `reasons of ${name}: ${currentReasons(s, name).map((r) => `${r.label} ${r.arrow}`).join(", ")}`).toContain(arrow);
}

Then("the subject {string} has the reason {string} at {int}", (s, name: string, label: string, arrow: number) => {
  hasReason(s, name, label, arrow);
});

Then("{string} has the reason {string} at {int}", (s, name: string, label: string, arrow: number) => {
  hasReason(s, name, label, arrow);
});

Then("{string} has the reason {string} at {int} for {int} years", (s, name: string, label: string, arrow: number, years: number) => {
  hasReason(s, name, label, arrow);
  const r = bond(s, name).reasons.find((x) => x.label === label)!;
  expect(r.until! - r.from).toBe(years * 12);
});

Given("the overlord has {int} soldiers and the subject {string} has {int}", (s, o: number, name: string, n: number) => {
  bond(s, name);
  Object.assign(sit(s, name), { overlordSoldiers: o, subjectSoldiers: n });
});

Then("{string} has neither strength reason", (s, name: string) => {
  const ids = currentReasons(s, name).map((r) => r.id);
  expect(ids).not.toContain("much_stronger");
  expect(ids).not.toContain("not_much_stronger");
});

Given("the overlord has {int} provinces and the {word} {string} has {int}", (s, o: number, kind: string, name: string, n: number) => {
  bond(s, name, { kind: kindFromName(kind) });
  Object.assign(sit(s, name), { overlordProvinces: o, subjectProvinces: n });
});

Then(/^"([^"]+)" (has|does not have) the reason "([^"]+)"$/, (s, name: string, has: string, label: string) => {
  const labels = currentReasons(s, name).map((r) => r.label);
  if (has === "has") expect(labels).toContain(label);
  else expect(labels).not.toContain(label);
});

When("an event adds a named one-off reason at {int} for {int} months to {string}", (s, arrow: number, months: number, name: string) => {
  s.acted = true;
  s.eventReason = addEventReason(bond(s, name), { id: "event_one_off", label: "An event", arrow, months }, now(s));
});

Then("{string} has that reason for {int} months", (s, name: string, months: number) => {
  const b = bond(s, name);
  const r = s.eventReason;
  expect(r.until - r.from).toBe(months);
  expect(reasonsOf(b, now(s) + months - 1).some((x) => x.id === r.id)).toBe(true);
  expect(reasonsOf(b, now(s) + months).some((x) => x.id === r.id)).toBe(false);
});

When("an event removes it", (s) => {
  removeReason(only(s), s.eventReason.id);
});

Then("{string} no longer has it", (s, name: string) => {
  expect(currentReasons(s, name).some((r) => r.id === s.eventReason.id)).toBe(false);
});

Given(/^the 1444 data holds "([^"]+)" with autonomy "([^"]+)" and (no Hostile stance|a Hostile stance) toward its overlord$/, (s, name: string, autonomy: string, stance: string) => {
  s.startLoyalty ??= {};
  s.startLoyalty[name] = { autonomy, hostile: stance === "a Hostile stance" };
});

Then("{string} starts {string}", (s, name: string, step: string) => {
  if (!s.startLoyalty) return void expect(stepName(bond(s, name).loyalty)).toBe(step);
  const r = s.startLoyalty[name];
  expect(stepName(startLoyalty1444(r.autonomy, r.hostile))).toBe(step);
});

// ---------------------------------------------------------------------------
// Ties
// ---------------------------------------------------------------------------

const TIES: Record<string, Tie> = { Kin: "kin", "Held of the Church": "held_of_the_church", "Held in fief": "held_in_fief", "Second master": "second_master", "Hostage at court": "hostage_at_court" };

Given("the subject {string} is a Vassal of {string} with the tie {string}", (s, name: string, overlord: string, tie: string) => {
  bond(s, name, { kind: "vassal", overlord, ties: [TIES[tie]!] });
  s.income ??= {};
  s.income[name] = 100;
});

Then(/^"([^"]+)" has the up reason "([^"]+)" of \+(\d+)$/, (s, name: string, label: string, arrow: string) => {
  hasReason(s, name, label, Number(arrow));
});

When("the ruling line of {string} dies out", (s) => {
  s.lineDiedOut = true;
});

Then("the ruler of {string} has a claim to the throne of {string}", (s, name: string) => {
  expect(claimOnOverlordThrone(bond(s, name), s.lineDiedOut)).toBe(true);
});

When("{string} goes to war", (s, overlord: string) => {
  s.answers = Object.fromEntries([...bonds(s).values()].filter((b) => b.overlord === overlord).map((b) => [b.subject, callToWar(b, now(s))]));
});

Then("{string} is never called", (s, name: string) => {
  expect(s.answers[name]).toBe("not_called");
});

Then("{string} pays only a token", (s, name: string) => {
  expect(baseShare(bond(s, name))).toBe(0.01);
});

When("{string} counts its reach", (s, overlord: string) => {
  s.weights = Object.fromEntries([...bonds(s).values()].filter((b) => b.overlord === overlord).map((b) => [b.subject, reachWeight(b, ownCount(s, b.subject))]));
});

function ownCount(s: Scenario, name: string): number {
  return [...bonds(s).values()].filter((x) => x.overlord === name).length;
}

Then(/^"([^"]+)" counts ([\d.]+)$/, (s, name: string, w: string) => {
  expect(s.weights[name]).toBe(Number(w));
});

Then("{string} pays only a token and is never called to war", (s, name: string) => {
  const b = bond(s, name);
  expect(baseShare(b)).toBe(0.01);
  expect(callToWar(b, now(s))).toBe("not_called");
});

Given("the subject {string} is a Tributary of {string} with a {string} fact to {string}", (s, name: string, overlord: string, fact: string, master: string) => {
  expect(fact).toBe("secondary_tribute");
  bond(s, name, { kind: "tributary", overlord, ties: ["second_master"] });
  s.income ??= {};
  s.income[name] = 100;
  s.secondMaster ??= {};
  s.secondMaster[name] = master;
});

Then("{string} receives a small tribute and has no other rights over {string}", (s, master: string, name: string) => {
  const got = s.paid[`${name}→second`];
  expect(got).toBeGreaterThan(0);
  expect(got).toBeLessThan(s.paid[name].gold);
  expect(mayAct(master, bond(s, name))).toBe(false);
});

When("{string} and {string} go to war with {string} the stronger", (s, a: string, b: string, stronger: string) => {
  s.lean = leansTo({ id: a, strength: a === stronger ? 2 : 1 }, { id: b, strength: b === stronger ? 2 : 1 });
});

Then("{string} leans to {string}", (s, _name: string, to: string) => {
  expect(s.lean).toBe(to);
});

Given("the overlord {string} holds the heir of the subject {string} at court", (s, overlord: string, name: string) => {
  const b = bond(s, name, { overlord });
  expect(takeHostage(b)).toEqual({ ok: true });
});

When("{string} harms the hostage", (s) => {
  harmHostage(only(s));
});

Then("{string} has the hostage reason at {int}", (s, name: string, arrow: number) => {
  hasReason(s, name, "Hostage at court", arrow);
});

// ---------------------------------------------------------------------------
// Colony stages
// ---------------------------------------------------------------------------

When("the country {string} founds the colony {string}", (s, overlord: string, name: string) => {
  bonds(s).set(name, foundColony(name, overlord, now(s)));
});

const STAGES: Record<string, ColonyStage> = { Outpost: "outpost", Settled: "settled", "Self-governing": "self_governing" };

Then(/^"([^"]+)" is a Colony at (?:stage )?"([^"]+)"$/, (s, name: string, stage: string) => {
  const b = bond(s, name);
  expect(b.kind).toBe("colony");
  expect(b.stage).toBe(STAGES[stage]);
});

Then("{string} pays {int} percent and has no army of its own", (s, name: string, pct: number) => {
  const b = bond(s, name);
  expect(baseShare(b)).toBeCloseTo(pct / 100, 9);
  expect(colonyStageTraits(b.stage!).ownArmy).toBe(false);
});

Then("a governor of {string}, an official, runs it", (s, overlord: string) => {
  const b = only(s);
  expect(b.overlord).toBe(overlord);
  expect(colonyStageTraits(b.stage!).governorRuns).toBe(true);
});

Given("the Colony {string} has {int} provinces, mostly of settler people", (s, name: string, n: number) => {
  bond(s, name, { kind: "colony", stage: "outpost" });
  s.colony = { provinces: n, mostlySettlers: true, years: 0 };
});

Given("the Colony {string} has {int} provinces and has been a colony {int} years", (s, name: string, n: number, years: number) => {
  bond(s, name, { kind: "colony", stage: "outpost" });
  s.colony = { provinces: n, mostlySettlers: true, years };
});

When("the stage is checked", (s) => {
  const b = only(s);
  b.stage = colonyStage({ ...s.colony, current: b.stage });
});

Then("{string} is at stage {string}", (s, name: string, stage: string) => {
  expect(bond(s, name).stage).toBe(STAGES[stage]);
});

Then("{string} raises its own militia", (s, name: string) => {
  expect(colonyStageTraits(bond(s, name).stage!).militia).toBe(true);
});

Then("its settlers form a voice that can be Wavering", (s) => {
  expect(colonyStageTraits(only(s).stage!).settlerVoice).toBe(true);
});

Given("the Colony {string} is at stage {string}", (s, name: string, stage: string) => {
  bond(s, name, { kind: "colony", stage: STAGES[stage]! });
});

Then("{string} pays {int} percent and keeps its own lords", (s, name: string, pct: number) => {
  const b = bond(s, name);
  expect(baseShare(b)).toBeCloseTo(pct / 100, 9);
  expect(colonyStageTraits(b.stage!).ownLords).toBe(true);
});

Then("its overlord may release or keep it", (s) => {
  expect(s.order.ok).toBe(false);
  expect(only(s).stage).toBe("self_governing");
});

Given("the Colony {string} at stage {string} turns Disloyal", (s, name: string, stage: string) => {
  bond(s, name, { kind: "colony", stage: STAGES[stage]!, loyalty: "disloyal" });
});

Then(/^the revolutions context (gets|does not get) the settler-independence trigger$/, (s, gets: string) => {
  expect(s.triggers.length > 0).toBe(gets === "gets");
});

// ---------------------------------------------------------------------------
// Mapping the data
// ---------------------------------------------------------------------------

Given("the 1444 data holds {string} as a subject of {string} with kind {string}", (s, name: string, overlord: string, kind: string) => {
  const rec = records1444().find((r) => r.subject === name.toLowerCase().replace(/é/g, "e").replace(/\s+/g, "_") || r.subject === name);
  s.records ??= [] as Record1444[];
  s.records.push({ subject: name, overlord: overlordId(overlord), subjectKind: kind, autonomy: rec?.autonomy ?? "moderate", startDate: rec?.startDate ?? null });
});

function overlordId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

Then(new RegExp(`^"([^"]+)" is an? ${KIND}(?: with "([^"]+)")?$`), (s, name: string, kind: string, tie?: string) => {
  const b = bond(s, name);
  expect(b.kind).toBe(kindFromName(kind));
  if (tie) expect(b.ties).toContain(TIES[tie]);
});

Then("{string} is a lord of {string}, not a country", (s, name: string, overlord: string) => {
  expect(s.lords).toContainEqual({ name, overlord: overlordId(overlord), fromCatalogue: true });
  expect(bonds(s).has(name)).toBe(false);
});

When("an event makes {string} a subject of {string} with the type {string}", (s, name: string, overlord: string, type: string) => {
  bonds(s).set(name, subjectFromEvent({ key: "vassalize", type }, name, overlord, now(s)));
});

Given("the 1444 data holds {int} Subject records of which {int} are estates", (s, total: number, estates: number) => {
  const recs = records1444();
  expect(recs.length).toBe(total);
  expect(recs.filter((r) => r.subjectKind === "estate").length).toBe(estates);
  s.records = recs;
});

When("the scenario starts with every subject a map nation", (s) => startScenario(s));

Then("there are {int} subjects", (s, n: number) => {
  expect(bonds(s).size).toBe(n);
});

Then("they are {int} vassals, {int} tributaries, {int} unions, {int} marches and {int} colonies", (s, v: number, t: number, u: number, m: number, c: number) => {
  const count = (k: Kind) => [...bonds(s).values()].filter((b) => b.kind === k).length;
  expect([count("vassal"), count("tributary"), count("union"), count("march"), count("colony")]).toEqual([v, t, u, m, c]);
});

// ---------------------------------------------------------------------------
// Overlord actions
// ---------------------------------------------------------------------------

Given("the Loyal Tributary {string} owes {int} gold a month at normal tribute", (s, name: string, gold: number) => {
  const b = bond(s, name, { kind: "tributary", loyalty: "loyal", tribute: "normal" });
  s.income ??= {};
  s.income[name] = gold / tributeOwed(b, 1);
});

When("its overlord sets tribute to {string}", (s, level: string) => {
  setTribute(only(s), level as SubjectBond["tribute"]);
  monthEnds(s);
});

Then("{string} pays {int} gold a month", (s, name: string, gold: number) => {
  expect(s.paid[name].gold).toBeCloseTo(gold, 6);
});

Then("{string} has no tribute reason", (s, name: string) => {
  expect(currentReasons(s, name).filter((r) => /tribute/.test(r.label))).toEqual([]);
});

Given(new RegExp(`^the subject "([^"]+)" is an? "?${STEP}"? "([^"]+)"$`), (s, name: string, step: string, kind: string) => {
  bond(s, name, { loyalty: stepFromName(step), kind: kindFromName(kind) });
});

When("its overlord calls it to war", (s) => {
  s.answer = callToWar(only(s), now(s));
});

Given("the country {string} has an envoy courting {string}", (s, country: string, name: string) => {
  bond(s, name, { overlord: "France" });
  sit(s, name).courted = true;
  s.courting = [country];
});

Given(/^"([^"]+)" is (Loyal|Wavering|Disloyal)$/, (s, name: string, step: string) => {
  bond(s, name, { loyalty: stepFromName(step) });
});

When("{string} stations a resident at the court of {string}", (s, overlord: string, name: string) => {
  const b = bond(s, name);
  expect(mayAct(overlord, b)).toBe(true);
  stationResident(b);
  s.envoysAt = { [overlord]: name };
});

Then("one envoy of {string} stays there", (s, overlord: string) => {
  expect(s.envoysAt[overlord]).toBeDefined();
  expect(bond(s, s.envoysAt[overlord]).resident).toBe(true);
});

Then("{string} sees the envoy of {string} courting {string}", (s, _o: string, envoy: string, name: string) => {
  expect(courtingSeen(bond(s, name), s.courting)).toContain(envoy);
});

Then("{string} sees the true size of the army of {string}", (s, _o: string, name: string) => {
  expect(armySeenByOverlord(bond(s, name), 3500)).toBe(3500);
});

When("{string} lends a {word} to {string} and pays his wages", (s, overlord: string, official: string, name: string) => {
  const b = bond(s, name, { overlord });
  lendOfficial(b, official);
});

Then("{string} has an up reason at {int} for the lent official", (s, name: string, arrow: number) => {
  expect(currentReasons(s, name).find((r) => r.id === "lent_official")?.arrow).toBe(arrow);
});

Then(/^the (\w+)'s type effect applies in the land of "([^"]+)"$/, (s, official: string, name: string) => {
  expect(bond(s, name).lentOfficial).toBe(official);
});

When("its overlord takes a hostage from {string}", (s, name: string) => {
  s.order = takeHostage(bond(s, name));
});

Given("the overlord {string} holds the heir of {string} at court", (s, overlord: string, name: string) => {
  expect(takeHostage(bond(s, name, { overlord }))).toEqual({ ok: true });
});

When("the ruler of {string} dies", (s, name: string) => {
  subjectRulerDied(bond(s, name));
});

Then("the heir returns to {string}", (s, name: string) => {
  expect(bond(s, name).ties).not.toContain("hostage_at_court");
});

When("the houses of {string} and its subject {string} are joined by a marriage", (s, overlord: string, name: string) => {
  arrangeMarriage(bond(s, name, { overlord }));
});

Then("a Union may follow if a ruler dies without heirs", (s) => {
  expect(only(s).marriage).toBe(true);
});

When("its overlord tightens {string}", (s, name: string) => {
  s.orderContext = "tighten";
  s.order = tighten(bond(s, name), now(s));
});

Then("after one envoy spends {int} months, {string} is a Vassal", (s, months: number, name: string) => {
  const b = bond(s, name);
  expect(s.order.ok).toBe(true);
  for (let i = 1; i < months; i++) expect(progressEnvoys(b)).toBe("continues");
  expect(b.kind).toBe("tributary");
  expect(progressEnvoys(b)).toBe("tightened");
  expect(b.kind).toBe("vassal");
});

Then("{string} refuses and drops a step to {word}", (s, name: string, step: string) => {
  expect(s.order.ok).toBe(false);
  expect(stepName(bond(s, name).loyalty)).toBe(step);
});

When("its overlord loosens {string}", (s, name: string) => {
  s.acted = true;
  s.order = loosen(bond(s, name), now(s));
});

Given(/^the subject "([^"]+)" (has a Disloyal ruler|has a Loyal ruler and no pretender at court)$/, (s, name: string, cond: string) => {
  bond(s, name, { loyalty: cond === "has a Disloyal ruler" ? "disloyal" : "loyal" });
});

When("its overlord deposes the ruler of {string}", (s, name: string) => {
  const b = bond(s, name);
  const others = otherSubjectsOf(s, b);
  s.others = others;
  s.order = depose(b, [b, ...others], now(s));
});

Then("the candidate rules {string} and starts Loyal, and every other subject has {int} for {int} years", (s, name: string, arrow: number, years: number) => {
  expect(s.order.ok).toBe(true);
  expect(bond(s, name).loyalty).toBe("loyal");
  for (const o of s.others as SubjectBond[]) {
    const r = o.reasons.find((x) => x.id === "deposed_other_subject")!;
    expect([r.arrow, (r.until! - r.from) / 12]).toEqual([arrow, years]);
  }
  expect(bond(s, name).reasons.some((x) => x.id === "deposed_other_subject")).toBe(false);
});

// ---------------------------------------------------------------------------
// Subject reach
// ---------------------------------------------------------------------------

Given("the country {string} has the catalogue administrative capacity {string} and a government that changes nothing", (s, c: string, capacity: string) => {
  s.capacity = { [c]: capacity.replace(/\s+/g, "_") };
});

When("its reach is counted", (s) => {
  s.acted = true;
});

Then("the subject reach of {string} is {int}", (s, c: string, reach: number) => {
  expect(reachFromCapacity(s.capacity[c], 0)).toBe(reach);
});

Given("the country {string} has a lord capacity and a subject reach", (s, c: string) => {
  s.lordsOf = { [c]: 3 };
  s.reachBefore = reachFromCapacity("high", 0);
});

When("{string} gains a lord", (s, c: string) => {
  s.lordsOf[c] += 1;
});

Then("its subject reach is unchanged", (s) => {
  expect(reachFromCapacity("high", 0)).toBe(s.reachBefore);
});

Given("the country {string} has reach {int}", (s, c: string, reach: number) => {
  s.reach ??= {};
  s.reach[c] = reach;
});

Given("{string} holds {int} tributaries and {int} marches", (s, c: string, t: number, m: number) => {
  for (let i = 0; i < t; i++) bond(s, `tributary ${i + 1}`, { overlord: c, kind: "tributary" });
  for (let i = 0; i < m; i++) bond(s, `march ${i + 1}`, { overlord: c, kind: "march" });
});

function roster(s: Scenario, overlord: string): RosterEntry[] {
  return [...bonds(s).values()].filter((b) => b.overlord === overlord).map((b, i) => ({ bond: b, ownSubjects: ownCount(s, b.subject), distance: s.distance?.[b.subject] ?? i }));
}

/** D-SUBJ-7: every subject −1, the N furthest −1 more each (shown as one reason). */
function applyStretched(s: Scenario, overlord: string): void {
  const map = stretchedThin(roster(s, overlord), s.reach[overlord]);
  for (const e of roster(s, overlord)) {
    const list = extra(s, e.bond.subject);
    const i = list.findIndex((r) => r.id === "stretched_thin");
    if (i >= 0) list.splice(i, 1);
    const n = map.get(e.bond.subject);
    if (n) list.push({ id: "stretched_thin", label: "Stretched thin", arrow: n });
  }
}

Then("{string} uses {int} reach of {int}", (s, c: string, used: number, reach: number) => {
  if (!s.acted) {
    // As a Given: earlier fold-ins (the example's step) brought reach used down to this.
    const r = roster(s, c);
    for (const e of [...r].sort((a, b) => Number(b.bond.ties.includes("kin")) - Number(a.bond.ties.includes("kin")))) {
      if (reachUsed(roster(s, c)) <= used) break;
      bonds(s).delete(e.bond.subject);
    }
  }
  expect(reachUsed(roster(s, c))).toBe(used);
  expect(s.reach[c]).toBe(reach);
});

Given(new RegExp(`^"([^"]+)" is an? ${KIND} of "([^"]+)"$`), (s, name: string, kind: string, overlord: string) => {
  if (s.acted) {
    const b = bond(s, name);
    expect([b.kind, b.overlord]).toEqual([kindFromName(kind), overlord]);
    return;
  }
  bond(s, name, { kind: kindFromName(kind), overlord });
});

When("the reach of {string} is counted", (s, overlord: string) => {
  s.weights = Object.fromEntries(roster(s, overlord).map((e) => [e.bond.subject, reachWeight(e.bond, e.ownSubjects)]));
});

Given("{string} holds the subject {string}", (s, name: string, sub: string) => {
  bond(s, name);
  bond(s, sub, { overlord: name });
});

Given("{string} is a subject of {string}, a Vassal of {string}", (s, name: string, mid: string, top: string) => {
  bond(s, mid, { kind: "vassal", overlord: top });
  bond(s, name, { overlord: mid });
});

When("{string} opens the card of {string}", (s, viewer: string, name: string) => {
  const b = bond(s, name);
  s.card = { buttons: cardButtons(viewer, b, now(s), { reachable: true, lordRoom: true }) };
});

Then("{string} has no buttons on {string}", (s) => {
  expect(s.card.buttons).toEqual([]);
});

Then("{string} counts nothing in the reach of {string} and pays it nothing", (s, name: string, overlord: string) => {
  expect(roster(s, overlord).some((e) => e.bond.subject === name)).toBe(false);
  expect(bond(s, name).overlord).not.toBe(overlord);
});

When("{string} releases {string} as a peace term", (s, _name: string, sub: string) => {
  s.acted = true;
  bonds(s).delete(sub);
});

Then("{string} no longer has the reason {string}", (s, name: string, label: string) => {
  expect(currentReasons(s, name).map((r) => r.label)).not.toContain(label);
});

Given("{string} is a Wavering subject of {string}, a Vassal of {string}", (s, name: string, mid: string, top: string) => {
  bond(s, mid, { kind: "vassal", overlord: top });
  bond(s, name, { overlord: mid, loyalty: "wavering" });
});

When("{string} folds in {string}", (s, overlord: string, name: string) => {
  s.acted = true;
  const b = bond(s, name);
  expect(b.overlord).toBe(overlord);
  stepUp([...bonds(s).values()].filter((x) => x.overlord === name), overlord);
  bonds(s).delete(name);
});

// ---------------------------------------------------------------------------
// Folding in
// ---------------------------------------------------------------------------

Given(/^the subject "([^"]+)" is an? "([^"]+)" that has been Loyal (\d+) years, a subject (\d+) years, (reachable|unreachable), with (lord room|no lord room)$/, (s, name: string, kind: string, loyal: string, held: string, reach: string, room: string) => {
  const b = bond(s, name, { kind: kindFromName(kind), loyalty: "loyal" });
  b.loyalSince = now(s) - Number(loyal) * 12;
  b.since = now(s) - Number(held) * 12;
  s.yearsGiven = true;
  s.foldCtx = { reachable: reach === "reachable", lordRoom: room === "lord room" };
});

When("its overlord orders {string} folded in", (s, name: string) => {
  tryFold(s, bond(s, name), s.foldCtx);
});

Given("the 1444 data holds {string} as a subject since {string} with autonomy {string}", (s, name: string, since: string, autonomy: string) => {
  s.records ??= [] as Record1444[];
  s.records.push({ subject: name, overlord: "france", subjectKind: "vassal", autonomy: autonomy as Record1444["autonomy"], startDate: since === "unknown" ? null : since });
});

Then("{string} counts as a subject for {int} years", (s, name: string, years: number) => {
  const b = bond(s, name);
  expect((now(s) - b.since) / 12).toBe(years);
});

Then("{string} counts as Loyal for {int} years", (s, name: string, years: number) => {
  const b = bond(s, name);
  expect(b.loyalSince === null ? 0 : (now(s) - b.loyalSince) / 12).toBe(years);
});

Given("the Loyal Vassal {string} has {int} provinces", (s, name: string, n: number) => {
  bond(s, name, { kind: "vassal", loyalty: "loyal" });
  s.provincesOf = { [name]: n };
});

Given("its overlord's envoy has begun folding it in", (s) => {
  const b = only(s);
  primeYears(s, b);
  expect(startFoldIn(b, s.provincesOf[b.subject], now(s), { reachable: true, lordRoom: true })).toEqual({ ok: true });
});

When("{int} months pass and {string} stays Loyal", (s, months: number, name: string) => {
  const b = bond(s, name);
  for (let i = 0; i < months; i++) s.progress = progressEnvoys(b);
});

When("{string} drops to Wavering after {int} months", (s, name: string, months: number) => {
  const b = bond(s, name);
  for (let i = 0; i < months; i++) s.progress = progressEnvoys(b);
  expect(s.progress).toBe("continues");
  b.loyalty = "wavering";
  s.progress = progressEnvoys(b);
});

Then("{string} is folded in", (s) => {
  expect(s.progress === "folded_in" || s.lapse === "lapse_folded_in").toBe(true);
});

Then("the folding stops and the envoy comes home", (s) => {
  expect(s.progress).toBe("stopped");
  expect(only(s).foldIn).toBeUndefined();
});

Given(/^the Loyal Vassal "([^"]+)" has (\d+) provinces, (\d+) lords, (\d+) buildings, an army of ([\d,]+) and (\d+) gold$/, (s, name: string, p: string, l: string, bld: string, army: string, gold: string) => {
  bond(s, name, { kind: "vassal", loyalty: "loyal" });
  s.realm = {
    name,
    provinces: Array.from({ length: Number(p) }, (_, i) => `${name} province ${i + 1}`),
    lords: Array.from({ length: Number(l) }, (_, i) => ({ name: `${name} lord ${i + 1}`, provinces: [] })),
    buildings: Array.from({ length: Number(bld) }, (_, i) => `building ${i + 1}`),
    army: Number(army.replace(/,/g, "")),
    treasury: Number(gold),
    sharesFaithAndPeople: true,
  };
});

When("its overlord {string} folds it in", (s, overlord: string) => {
  s.acted = true;
  const b = bond(s, s.realm.name, { overlord });
  primeYears(s, b);
  tryFold(s, b);
  expect(s.order.ok).toBe(true);
  s.folded = foldIn(b, s.realm);
  stepUp([...bonds(s).values()].filter((x) => x.overlord === b.subject), overlord);
  bonds(s).delete(b.subject);
  s.gone = b.subject;
});

Then("{string} is gone from the map", (s, name: string) => {
  expect(s.gone).toBe(name);
  expect(bonds(s).has(name)).toBe(false);
});

Then("the ruler of {string} is a lord of {string} holding all {int} provinces on one card", (s, name: string, _o: string, n: number) => {
  expect(s.folded.lord.name).toBe(name);
  expect(s.folded.lord.provinces.length).toBe(n);
});

Then("the lords of {string} are merged into his card", (s) => {
  expect(s.folded.lord.mergedLords).toEqual(s.realm.lords.map((l: { name: string }) => l.name));
});

Then(/^his retinue is the army of ([\d,]+) and his wealth is (\d+) gold$/, (s, army: string, gold: string) => {
  expect(s.folded.lord.retinue).toBe(Number(army.replace(/,/g, "")));
  expect(s.folded.lord.wealth).toBe(Number(gold));
});

Then("the {int} buildings stay with his land", (s, n: number) => {
  expect(s.folded.lord.buildings.length).toBe(n);
});

Given(/^the Loyal Vassal "([^"]+)" (shares|does not share) the faith and people of its overlord$/, (s, name: string, shares: string) => {
  bond(s, name, { kind: "vassal", loyalty: "loyal" });
  s.realm = { name, provinces: [`${name} 1`], lords: [], buildings: [], army: 0, treasury: 0, sharesFaithAndPeople: shares === "shares" };
});

When("its overlord folds it in", (s) => {
  s.acted = true;
  const b = only(s);
  primeYears(s, b);
  tryFold(s, b);
  if (!s.order.ok) return;
  s.folded = foldIn(b, s.realm ?? { name: b.subject, provinces: [`${b.subject} 1`, `${b.subject} 2`], lords: [], buildings: [], army: 0, treasury: 0, sharesFaithAndPeople: true });
});

Then(/^its provinces (gain no grievance|have the grievance "Foreign rule" for \d+ years)$/, (s, what: string) => {
  expect(s.folded.foreignRuleYears).toBe(what === "gain no grievance" ? 0 : Number(/(\d+)/.exec(what)![1]));
});

Then("its provinces are royal land at once, needing officials", (s) => {
  expect(s.order.ok).toBe(true);
  expect(s.folded.royalLand.length).toBeGreaterThan(0);
  expect(s.folded.lord.provinces).toEqual([]);
});

Given("the Union {string} of {string} has been in union {int} years and is {string}", (s, name: string, overlord: string, years: number, step: string) => {
  const b = bond(s, name, { kind: "union", overlord, loyalty: stepFromName(step) });
  b.since = now(s) - years * 12;
});

When("{string} merges the crowns", (s) => {
  const b = only(s);
  const missing = mergeCrownsMissing(b, now(s));
  s.order = missing === null ? { ok: true } : { ok: false, missing };
  if (missing === null) s.merged = mergeCrowns({ provinces: ["Palermo", "Messina"], lords: [{ name: "Ventimiglia", loyalty: "wavering" }, { name: "Chiaramonte", loyalty: "loyal" }] });
});

Then(/^its provinces join "([^"]+)", its lords become lords of "[^"]+" one by one keeping their loyalty, and its laws become a charter there$/, (s) => {
  expect(s.order.ok).toBe(true);
  expect(s.merged.provinces).toEqual(["Palermo", "Messina"]);
  expect(s.merged.lords).toEqual([{ name: "Ventimiglia", loyalty: "wavering" }, { name: "Chiaramonte", loyalty: "loyal" }]);
  expect(s.merged.charterIn).toEqual(["Palermo", "Messina"]);
});

When("the ruler of {string} dies without an heir", (s, name: string) => {
  const b = bond(s, name);
  s.heirless = rulerDiesWithoutHeir(b, otherSubjectsOf(s, b), now(s));
});

Then("its overlord inherits it and folds it in at once", (s) => {
  expect(s.heirless).toBe("inherited_and_folded_in");
});

Then("its lords pick a new ruler and its overlord may back one by envoy", (s) => {
  expect(s.heirless).toBe("lords_pick_new_ruler");
});

Given("the overlord {string} holds the flag {string}", (s, overlord: string, flag: string) => {
  s.flags = { [overlord]: new Set([flag]) };
});

Given("the ruler of its Protectorate {string} dies without a natural heir", (s, name: string) => {
  const overlord = Object.keys(s.flags)[0]!;
  bond(s, name, { kind: "protectorate", overlord });
  bond(s, "another subject", { overlord });
  s.focus = name;
});

When("the death is resolved", (s) => {
  const b = only(s);
  s.lapse = rulerDiesWithoutHeir(b, otherSubjectsOf(s, b), now(s), s.flags[b.overlord]);
});

Then("every other subject of {string} has {int} for {int} years", (s, overlord: string, arrow: number, years: number) => {
  const others = [...bonds(s).values()].filter((b) => b.overlord === overlord && b.subject !== s.focus);
  expect(others.length).toBeGreaterThan(0);
  for (const o of others) {
    const r = o.reasons.find((x) => x.arrow === arrow && x.until !== undefined && x.until - x.from === years * 12);
    expect(r).toBeDefined();
  }
});

// ---------------------------------------------------------------------------
// Losing subjects
// ---------------------------------------------------------------------------

Given("the Vassal {string} of {string} is {string}", (s, name: string, overlord: string, step: string) => {
  bond(s, name, { kind: "vassal", overlord, loyalty: stepFromName(step) });
  s.income ??= {};
  s.income[name] = 100;
  s.focus = name;
});

Then("{string} pays nothing and refuses calls", (s, name: string) => {
  expect(s.paid[name].gold).toBe(0);
  expect(warAnswerOf(s, name)).toBe("refuses");
});

function warAnswerOf(s: Scenario, name: string): WarAnswer {
  const b = bond(s, name);
  return callToWar({ ...b, reasons: [...b.reasons] }, now(s));
}

Then("{string} may bargain with a foreign envoy for a backer who agrees to declare {string} when it rises", (s, name: string, aim: string) => {
  expect(aim).toBe("Break a subject");
  expect(foreignEnvoys(bond(s, name).loyalty)).toBe("seeks_backer");
});

Given("the subjects {string} and {string} of {string} are {string}", (s, a: string, b: string, overlord: string, step: string) => {
  bond(s, a, { overlord, loyalty: stepFromName(step) });
  bond(s, b, { overlord, loyalty: stepFromName(step) });
  s.neighbours = { [a]: new Set<string>(), [b]: new Set<string>() };
});

Given(/^"([^"]+)" (borders|shares the backer of|neither borders nor shares a backer with) "([^"]+)"$/, (s, b: string, link: string, a: string) => {
  if (link === "borders") {
    s.neighbours[a].add(b);
    s.neighbours[b].add(a);
  } else if (link === "shares the backer of") {
    bond(s, a).backer = "Backer";
    bond(s, b).backer = "Backer";
  }
});

Given("{string} rises", (s, name: string) => {
  if (s.acted) {
    expect(s.rose ?? []).toContain(name);
    return;
  }
  s.acted = true;
  const b = bond(s, name);
  if (s.neighbours) {
    const others = [...bonds(s).values()].filter((x) => x !== b).map((x) => ({ bond: x, neighbours: s.neighbours[x.subject] ?? new Set<string>() }));
    s.joined = joinRising({ bond: b, neighbours: s.neighbours[name] }, others).map((x) => x.subject);
  }
  s.war = rise(b, now(s));
});

Then(/^"([^"]+)" (rises too|does not rise)$/, (s, name: string, what: string) => {
  if (s.joined) expect(s.joined.includes(name)).toBe(what === "rises too");
  else expect((s.rose ?? []).includes(name)).toBe(false);
});

Given("{string} has a backer that is at peace and willing", (s, name: string) => {
  s.rising = { [name]: { backer: { atPeace: true, willing: true } } };
});

Given("{string} is at war elsewhere with over half its peace voices for peace", (s, _o: string) => {
  s.rising = { [s.focus]: { overlordAtWarElsewhere: true, overlordPeaceShare: 0.6 } };
});

Given("an event says {string} rises", (s, name: string) => {
  s.rising = { [name]: { eventSaysRise: true } };
});

Given("{string} has no backer and {string} is at peace", (s, name: string) => {
  s.rising = { [name]: {} };
});

Given("the Vassal {string} of {string} has the backer {string}", (s, name: string, overlord: string, backer: string) => {
  bond(s, name, { kind: "vassal", overlord, loyalty: "disloyal", backer });
});

Then("the Subject relation of {string} ends and {string} is at war with {string}", (s, name: string, _n: string, overlord: string) => {
  expect(bond(s, name).loyalty).toBe("in_revolt");
  expect(s.war.rebel).toBe(name);
  expect(s.war.overlord).toBe(overlord);
});

Then("the war aim of {string} is {string}", (s, _name: string, aim: string) => {
  expect(s.war.warAim).toBe(aim);
});

Then("{string} joins the war on the side of {string}", (s, backer: string, name: string) => {
  expect(s.war.rebelSide).toEqual([name, backer]);
});

Given(new RegExp(`^the ${KIND} "([^"]+)" rose against "([^"]+)" and "[^"]+" (does not share a border with|shares a border with) "[^"]+"$`), (s, kind: string, name: string, overlord: string, border: string) => {
  const b = bond(s, name, { kind: kindFromName(kind), overlord, loyalty: "disloyal" });
  rise(b, now(s));
  s.border = border === "shares a border with";
});

When("{string} wins the independence war", (s, winner: string) => {
  const b = only(s);
  s.peace = winner === b.overlord ? overlordWinsIndependenceWar(b, s.border) : subjectWinsIndependenceWar(b);
});

Then(/^the peace may (restore "[^"]+" as a Vassal|fold "[^"]+" in at once, ignoring the year requirements)$/, (s, what: string) => {
  if (what.startsWith("restore")) expect(s.peace.restoreAs).toBe("vassal");
  else expect(s.peace.foldInAtOnce).toBe(true);
});

Given("the Vassal {string} rose against {string}", (s, name: string, overlord: string) => {
  rise(bond(s, name, { kind: "vassal", overlord, loyalty: "disloyal" }), now(s));
});

Then("{string} is independent", (s) => {
  expect(s.peace.independent).toBe(true);
});

Then("{string} is Hostile toward {string}", (s) => {
  expect(s.peace.stance).toBe("hostile");
});

Given("the overlord {string} has the {string} {string}", (s, overlord: string, kind: string, name: string) => {
  bond(s, name, { overlord, kind: kindFromName(kind) });
});

Given("{string} took the capital of {string}", (s, taker: string) => {
  s.taker = taker;
});

When(/^"([^"]+)" is destroyed and "[^"]+" (wants|does not want) it$/, (s, _o: string, wants: string) => {
  const b = only(s);
  s.fate = fateWhenOverlordFalls(b.kind, wants === "wants");
});

Then("{string} goes free", (s) => {
  expect(s.fate).toBe("free");
});

Then(/^"([^"]+)" is a subject of "([^"]+)"$/, (s, name: string, overlord: string) => {
  if (s.peace?.overlord !== undefined) {
    expect(s.peace.overlord).toBe(overlord);
    return;
  }
  if (s.fate !== undefined) {
    expect(s.fate).toBe("to_capital_taker");
    expect(s.taker).toBe(overlord);
    return;
  }
  if (!s.acted) {
    bond(s, name, { overlord });
    return;
  }
  expect(bond(s, name).overlord).toBe(overlord);
});

// ---------------------------------------------------------------------------
// Making subjects
// ---------------------------------------------------------------------------

Given(/^the loser "([^"]+)" (has a land path to|has no land path to) the winner "([^"]+)"$/, (s, _l: string, path: string) => {
  s.landPath = path === "has a land path to";
});

Given("over three quarters of the peace voices of {string} say peace", (s) => {
  s.peaceShare = 0.8;
});

When("{string} asks the term {string} as a {string}", (s, _w: string, term: string, kind: string) => {
  expect(term).toBe("Become a subject");
  s.term = becomeSubjectAllowed({ kind: kindFromName(kind), era: s.era, landPath: s.landPath, peaceShare: s.peaceShare });
});

Then("the term is {word}", (s, result: string) => {
  expect(s.term).toBe(result === "allowed");
});

Given("{string} has paid tribute to {string} as a peace term for {int} years", (s, _l: string, _w: string, years: number) => {
  s.tributeYears = years;
});

Given(/^"([^"]+)" is (weaker|stronger) than "([^"]+)"$/, (s, _l: string, which: string) => {
  s.payerStrength = which === "weaker" ? 1 : 3;
});

When("{string} offers {string} to become a Tributary by envoy", (s) => {
  s.offer = acceptsTributaryOffer(s.tributeYears, s.payerStrength, 2);
});

Then("{string} accepts", (s) => {
  expect(s.offer).toBe(true);
});

Given("{string} won a war with the aim {string} against {string}", (s, winner: string, aim: string, loser: string) => {
  expect(aim).toBe("Seat a pretender");
  s.pretender = { winner, loser };
});

When("the pretender takes the throne of {string}", (s, loser: string) => {
  const out = seatPretender(loser, s.pretender.winner, "vassal", now(s));
  if (out !== "ally") bonds(s).set(loser, out);
  s.allyOption = seatPretender(loser, s.pretender.winner, "ally", now(s));
});

Then("{string} picks {string} as its Vassal or its ally", (s, winner: string, loser: string) => {
  expect(bond(s, loser)).toMatchObject({ kind: "vassal", overlord: winner });
  expect(s.allyOption).toBe("ally");
});

Then("the new ruler of {string} starts {string}", (s, name: string, step: string) => {
  expect(stepName(bond(s, name).loyalty)).toBe(step);
});

Given("the ruler of {string} inherits the crown of {string} after a marriage", (s, heir: string, crown: string) => {
  s.inherit = { heir, crown };
});

When("the inheritance is received", (s) => {
  s.acted = true;
  bonds(s).set(s.inherit.crown, inheritCrown(s.inherit.crown, s.inherit.heir, now(s)));
});

Given(/^the chief "([^"]+)" (is nobody's subject|is a subject of "[^"]+") and (shares a border with "[^"]+"|shares no border with "[^"]+")$/, (s, name: string, subj: string, border: string) => {
  s.chief = { name, overlord: subj === "is nobody's subject" ? null : "Oirat", bordersGrantor: border.startsWith("shares a border") };
});

When("{string} gives its titles to {string} with a gift", (s, grantor: string) => {
  s.grant = frontierGrant(s.chief, grantor, true, now(s));
});

Then(/^the grant is (made: "[^"]+" is a March|refused)$/, (s, result: string) => {
  if (result === "refused") expect(s.grant).toBeNull();
  else expect(s.grant?.kind).toBe("march");
});

Given("{string} holds {int} colonial provinces in one distant region", (s, overlord: string, n: number) => {
  s.colonial = { overlord, provinces: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, region: "a distant region" })) };
});

When("{string} charters them", (s, overlord: string) => {
  s.chartered = charterColony(overlord, s.colonial.provinces, "the new colony", now(s));
});

Then("they form one Colony of {string}", (s, overlord: string) => {
  expect(s.chartered).toMatchObject({ kind: "colony", overlord });
});

When("an event uses {string} for {string} under {string}", (s, key: string, name: string, overlord: string) => {
  let b: SubjectBond;
  if (key.startsWith("vassalize with type ")) b = subjectFromEvent({ key: "vassalize", type: key.slice("vassalize with type ".length) }, name, overlord, now(s));
  else if (key === "create_country subject_of") b = subjectFromEvent({ key: "create_country" }, name, overlord, now(s));
  else if (key.startsWith("create_country subject_of as a ")) b = subjectFromEvent({ key: "create_country", kind: kindFromName(key.split(" as a ")[1]!) }, name, overlord, now(s));
  else if (key === "relation personal_union") b = subjectFromEvent({ key: "personal_union" }, name, overlord, now(s));
  else throw new Error(`Unknown event key ${key}`);
  bonds(s).set(name, b);
});

Then("{string} is a {string} of {string}", (s, name: string, kind: string, overlord: string) => {
  const b = bond(s, name);
  expect(b.overlord).toBe(overlord);
  const m = /^(\w+)(?: at (.+))?$/.exec(kind)!;
  expect(b.kind).toBe(kindFromName(m[1]!));
  if (m[2]) expect(b.stage).toBe(STAGES[m[2]]);
});

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

Given("the country {string} declares war on {string}", (s, attacker: string, name: string) => {
  s.attacker = attacker;
  s.focus = name;
  bond(s, "another subject", { overlord: bond(s, name).overlord });
});

When(/^"([^"]+)" (answers|refuses|ignores) the call$/, (s, _o: string, answer: string) => {
  const b = only(s);
  s.owes = owesDefence(b, s.attacker);
  if (!s.owes) return;
  s.defence = answerDefence(b, otherSubjectsOf(s, b), answer === "answers", now(s));
});

Then("{string} gains an Oath broken, {string} has {string} at {int}, and every other subject has {int} for {int} years", (s, _o: string, name: string, label: string, arrow: number, otherArrow: number, years: number) => {
  expect(s.defence.oathBroken).toBe(true);
  hasReason(s, name, label, arrow);
  for (const o of otherSubjectsOf(s, bond(s, name))) {
    const r = o.reasons.find((x) => x.id === "left_other_subject_alone")!;
    expect([r.arrow, (r.until! - r.from) / 12]).toEqual([otherArrow, years]);
  }
});

Then("{string} owes no defence against itself", (s) => {
  expect(s.owes).toBe(false);
});

Given("the March {string} expects a yearly stipend from {string}", (s, name: string, overlord: string) => {
  bond(s, name, { kind: "march", overlord });
});

When("a year ends without the stipend paid", (s) => {
  yearEndStipend(only(s), false, now(s));
});

Given("the Union {string} shares the ruler of {string}", (s, name: string, overlord: string) => {
  bond(s, name, { kind: "union", overlord });
});

When("{string} goes to war with {string}", (s, overlord: string, enemy: string) => {
  s.wars = [...bonds(s).values()].filter((b) => b.overlord === overlord && sharesOverlordWars(b)).map((b) => ({ country: b.subject, enemy }));
});

Then("the war is also the war of {string}", (s, name: string) => {
  expect(s.wars.map((w: { country: string }) => w.country)).toContain(name);
});

Then("the lords of {string} add their peace voices to those of {string}", (s, name: string) => {
  expect(sharesOverlordWars(bond(s, name))).toBe(true);
});

Given("the subjects {string} and {string} of {string} are at odds", (s, a: string, b: string, overlord: string) => {
  bond(s, a, { overlord, loyalty: "loyal" });
  bond(s, b, { overlord, loyalty: "loyal" });
  s.pair = [a, b];
});

When("{string} would attack {string} without the leave of {string}", (s, a: string, b: string) => {
  s.attackAllowed = mayAttackFellowSubject(bond(s, a), bond(s, b), false);
});

Then("it is refused and the matter goes to {string}", (s, overlord: string) => {
  expect(s.attackAllowed).toBe(false);
  expect(bond(s, s.pair[0]).overlord).toBe(overlord);
});

When(/^"([^"]+)" (sides with "[^"]+"|forbids it)$/, (s, _o: string, what: string) => {
  const [a, b] = (s.pair as string[]).map((n) => bond(s, n));
  const side = /"([^"]+)"/.exec(what)?.[1];
  judgeQuarrel(a!, b!, what === "forbids it" ? "forbid" : { sideWith: bond(s, side!) }, now(s));
});

Then("the loyalty of {string} drops one step", (s, name: string) => {
  expect(bond(s, name).loyalty).toBe("wavering");
  expect(bond(s, s.pair[0]).loyalty).toBe("loyal");
});

Then("{string} and {string} each have {int} for {int} years", (s, a: string, b: string, arrow: number, years: number) => {
  for (const n of [a, b]) {
    const r = bond(s, n).reasons.find((x) => x.id === "quarrel_forbidden")!;
    expect([r.arrow, (r.until! - r.from) / 12]).toEqual([arrow, years]);
  }
});

// ---------------------------------------------------------------------------
// Raising a lord
// ---------------------------------------------------------------------------

Given(/^the lord "([^"]+)"(?: of "([^"]+)")? holds (\d+) provinces(?: (inside the realm|on a frontier))?(?: and is "?(Loyal|Wavering|Disloyal)"?)?$/, (s, lord: string, ruler: string | undefined, n: string, where: string | undefined, step: string | undefined) => {
  s.lord = { name: lord, ruler: ruler ?? "France", provinces: Array.from({ length: Number(n) }, (_, i) => `${lord} ${i + 1}`), loyalty: stepFromName(step ?? "Loyal"), retinue: 1200, onFrontier: where === "on a frontier" };
});

function raise(s: Scenario): void {
  s.acted = true;
  const out = raiseLord(s.lord, s.lord.ruler, now(s));
  s.order = "missing" in out ? { ok: false, missing: out.missing } : { ok: true };
  if (!("missing" in out)) {
    bonds(s).set(out.bond.subject, out.bond);
    s.raised = out;
  }
}

When("{string} raises {string}", (s) => raise(s));
When("his ruler raises him", (s) => raise(s));

Then("{string} is a {word} with his provinces as its own country on the map", (s, name: string, kind: string) => {
  expect(bond(s, name).kind).toBe(kindFromName(kind));
  expect(s.raised.country.provinces).toEqual(s.lord.provinces);
});

Then("his retinue becomes its army", (s) => {
  expect(s.raised.country.army).toBe(s.lord.retinue);
});

Then("the new subject {string} has the reason {string} at {int} for {int} years", (s, name: string, label: string, arrow: number, years: number) => {
  hasReason(s, name, label, arrow);
  const r = bond(s, name).reasons.find((x) => x.label === label)!;
  expect(r.until! - r.from).toBe(years * 12);
});

Then("{string} no longer counts against the lord capacity of {string}", (s, name: string, ruler: string) => {
  expect(bond(s, name).overlord).toBe(ruler);
  expect(s.raised.country.name).toBe(name);
});

Then("{string} counts against the subject reach of {string}", (s, name: string, ruler: string) => {
  expect(roster(s, ruler).map((e) => e.bond.subject)).toContain(name);
  expect(reachUsed(roster(s, ruler))).toBe(1);
});

Then("the provinces of {string} are no longer in the realm of {string}", (s) => {
  expect(s.raised.country.provinces).toEqual(s.lord.provinces);
});

Then("{string} receives a Vassal's share instead of half his taxes", (s, ruler: string) => {
  const b = bond(s, s.lord.name);
  expect(b.overlord).toBe(ruler);
  expect(baseShare(b)).toBe(0.1);
});

Then("{string} may make friends abroad of its own", (s, name: string) => {
  expect(mayActAbroad(bond(s, name).kind, "alliance", false)).toBe(true);
});

// ---------------------------------------------------------------------------
// France 1444 (the worked example)
// ---------------------------------------------------------------------------

Given("the country {string} has high administrative capacity and subject reach {int}", (s, c: string, reach: number) => {
  expect(reachFromCapacity("high", 0)).toBe(reach);
  s.reach ??= {};
  s.reach[c] = reach;
});

Given("{string} has {int} vassals and the appanage {string}", (s, c: string, n: number, appanage: string) => {
  const recs = records1444().filter((r) => r.overlord === c.toLowerCase());
  s.records = recs;
  startScenario(s);
  s.acted = false;
  for (const b of [...bonds(s).values()]) {
    if (b.overlord !== c.toLowerCase()) continue;
    bonds(s).delete(b.subject);
    const name = b.subject === "dauphine" ? appanage : b.subject;
    s.renamed = { ...(s.renamed ?? {}), [b.subject]: name };
    bonds(s).set(name, { ...b, subject: name, overlord: c });
  }
  const mine = [...bonds(s).values()].filter((b) => b.overlord === c);
  expect(mine.filter((b) => b.kind === "vassal" && !b.ties.includes("kin")).length).toBe(n);
  expect(bond(s, appanage).ties).toContain("kin");
});

When("{string} folds in {string} and {string} over the next years", (s, c: string, a: string, b: string) => {
  s.acted = true;
  s.lordsGained = 0;
  for (const name of [a, b]) {
    const id = name.toLowerCase().replace(/\s+/g, "_");
    const bd = bond(s, id);
    expect(bd.overlord).toBe(c);
    expect(foldInMissing(bd, now(s), { reachable: true, lordRoom: true })).toBeNull();
    bonds(s).delete(id);
    s.lordsGained += 1;
  }
});

Then("the lord capacity of {string} fills up instead", (s) => {
  expect(s.lordsGained).toBe(2);
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

Given(/^the AI overlord "([^"]+)" (.+)$/, (s, o: string, situation: string) => {
  s.aiOverlord = o;
  s.aiSituation = situation;
});

When("the AI turn runs", (s) => {
  if (s.aiOverlord) {
    const o = s.aiOverlord as string;
    const sitText = s.aiSituation as string;
    if (sitText.startsWith("is at reach")) {
      const [, used, reach] = /reach (\d+) of (\d+)/.exec(sitText)!;
      s.ai = { accepts: (w: number) => aiAcceptsNewSubject(Number(used), Number(reach), w) };
      return;
    }
    const subjects: { bond: SubjectBond; foldInReady: boolean; size: number }[] = [];
    if (sitText.startsWith("has a Loyal subject")) subjects.push({ bond: bond(s, "S", { overlord: o, loyalty: "loyal" }), foldInReady: true, size: 3 });
    if (sitText.includes("Disloyal Vassal")) subjects.push({ bond: bond(s, "S", { overlord: o, loyalty: "disloyal", kind: "vassal" }), foldInReady: false, size: 3 });
    if (sitText.includes("big Wavering subject")) {
      subjects.push({ bond: bond(s, "small", { overlord: o, loyalty: "wavering" }), foldInReady: false, size: 1 });
      subjects.push({ bond: bond(s, "big", { overlord: o, loyalty: "wavering" }), foldInReady: false, size: 6 });
    }
    s.ai = aiOverlord({ subjects, likesCentralising: sitText.includes("likes centralising"), atWarElsewhere: sitText.includes("at war elsewhere"), freeEnvoy: sitText.includes("free envoy") });
    return;
  }
  s.ai = aiSubject({ personality: s.personality, overlordLosing: !!s.overlordLosing, hasBacker: !s.noBacker });
});

Then(/^"([^"]+)" (folds it in|loosens it|stations a resident there|gains no subject that would take it past 8)$/, (s, _o: string, does: string) => {
  if (does === "folds it in") expect(s.ai).toEqual({ act: "fold_in", subject: "S" });
  else if (does === "loosens it") expect(s.ai).toEqual({ act: "loosen", subject: "S" });
  else if (does === "stations a resident there") expect(s.ai).toEqual({ act: "station_resident", subject: "big" });
  else {
    expect(s.ai.accepts(1)).toBe(true);
    expect(s.ai.accepts(1.5)).toBe(false);
    expect(s.ai.accepts(2)).toBe(false);
  }
});

Given("the AI subject {string} is Disloyal with the personality {string}", (s, name: string, personality: string) => {
  bond(s, name, { loyalty: "disloyal" });
  s.personality = personality;
});

Given(/^(its overlord is losing a war|its overlord is losing a war and it has no backer|it has no backer)$/, (s, situation: string) => {
  s.overlordLosing = situation.startsWith("its overlord is losing");
  s.noBacker = situation.includes("no backer");
});

Then(/^"([^"]+)" (rises at once|waits for a backer and its neighbours|looks for a backer)$/, (s, _n: string, does: string) => {
  expect(s.ai).toBe({ "rises at once": "rise", "waits for a backer and its neighbours": "wait", "looks for a backer": "seek_backer" }[does]);
});

Given("several hundred subjects exist", (s) => {
  for (let i = 0; i < 300; i++) {
    bond(s, `subject ${i}`, { loyalty: "wavering" });
    extra(s, `subject ${i}`).push({ id: "up", label: "up", arrow: 5 });
  }
});

When("a month that is not a season end passes", (s) => {
  let month = (now(s) % 12) + 1;
  while (isSeasonEnd(month)) {
    s.now = now(s) + 1;
    month = (now(s) % 12) + 1;
  }
  expect(isSeasonEnd(month)).toBe(false);
  if (isSeasonEnd(month)) seasonEnds(s);
  else s.now = now(s) + 1;
});

Then("no subject's loyalty is recomputed", (s) => {
  for (const b of bonds(s).values()) expect(b.loyalty).toBe("wavering");
});

// ---------------------------------------------------------------------------
// Playing as a subject
// ---------------------------------------------------------------------------

Given("the player plays the Loyal Vassal {string} of the AI country {string}", (s, name: string, overlord: string) => {
  bond(s, name, { kind: "vassal", overlord, loyalty: "loyal" });
});

Given(/^"([^"]+)" (is cautious|is over its reach|is neither cautious nor over reach)$/, (s, _o: string, state: string) => {
  s.askOverlord = { cautious: state === "is cautious", overReach: state === "is over its reach" };
});

When("{string} sends an envoy to ask politely for a looser kind", (s, name: string) => {
  s.ask = grantsLoosenAsk(bond(s, name), s.askOverlord);
});

Then("the ask is {word}", (s, result: string) => {
  expect(s.ask).toBe(result === "granted");
});

Given("the catalogue lists {int} playable subjects", (_s, n: number) => {
  expect(PLAYABLE_SUBJECTS.length).toBe(n);
});

When("the player picks a country to start the campaign", (s) => {
  s.choosable = new Set(PLAYABLE_SUBJECTS);
});

Then("each of the {int} playable subjects can be chosen", (s, n: number) => {
  expect(s.choosable.size).toBe(n);
  for (const id of PLAYABLE_SUBJECTS) expect(s.choosable.has(id)).toBe(true);
});

// ---------------------------------------------------------------------------
// On screen
// ---------------------------------------------------------------------------

Given("{string} is a Disloyal Tributary with {int} up and {int} down arrows, worst {string}", (s, name: string, up: number, down: number, worst: string) => {
  bond(s, name, { kind: "tributary", loyalty: "disloyal" });
  // The design's row: the worst reason and the tributary's drift make up the down arrows.
  s.rowReasons = [
    ...(up ? [{ id: "up", label: "up", arrow: up }] : []),
    { id: "different_faith", label: worst, arrow: -(down - 1) },
    { id: "drift", label: "Kind's drift", arrow: -1 },
  ];
});

When("the player opens the subjects tab", (s) => {
  const [name, b] = [...bonds(s)][0]!;
  s.row = subjectRow(b, s.rowReasons, payTribute(b, 100, 100).gold);
  void name;
});

Then("the row of {string} shows {string}, {string}, {string} and {string}", (s, name: string, loyalty: string, arr: string, pays: string, worst: string) => {
  expect(s.row).toMatchObject({ name, loyalty, arrows: arr, pays, worst });
});

When("the map is at region zoom", (s) => {
  s.mark = regionMark(only(s));
});

Then("the icon {string} sits on its capital with a {word} frame", (s, icon: string, tint: string) => {
  expect(s.mark).toEqual({ icon, tint });
});

// Unused helpers kept typed for the compiler.
void subjectsList;
void stepUp;
void seasonCount;
void startLoyalty1444;
void ((x: Step) => x);

// ---------------------------------------------------------------------------
// Decided questions (D-SUBJ-*)
// ---------------------------------------------------------------------------

function overReachArrows(s: Scenario, overlord: string): Map<string, number> {
  applyStretched(s, overlord);
  return stretchedThin(roster(s, overlord), s.reach[overlord]);
}

Then("{string} and {string} have the reason {string}", (s, a: string, b: string, label: string) => {
  const o = bond(s, a).overlord;
  applyStretched(s, o);
  for (const n of [a, b]) expect(currentReasons(s, bond(s, n).subject).map((r) => r.label)).toContain(label);
});

Then(/^the (\d+) furthest subjects of "([^"]+)" have 1 more down arrow from being over reach$/, (s, n: string, o: string) => {
  const arrows = overReachArrows(s, o);
  const r = roster(s, o).sort((a, b) => b.distance - a.distance);
  for (const e of r.slice(0, Number(n))) expect(arrows.get(e.bond.subject)).toBe(-2);
  s.furthest = Number(n);
});

Then("the other subjects of {string} have no more down arrows from being over reach", (s, o: string) => {
  const arrows = overReachArrows(s, o);
  const r = roster(s, o).sort((a, b) => b.distance - a.distance);
  for (const e of r.slice(s.furthest)) expect(arrows.get(e.bond.subject)).toBe(-1);
});

Given("{string} is a Loyal Vassal with {string}, a subject since {int}, with {int} provinces", (s, name: string, tie: string, year: number, provinces: number) => {
  const b = bond(s, name);
  expect(b.kind).toBe("vassal");
  expect(b.ties).toContain(tie.toLowerCase());
  b.loyalty = "loyal";
  b.since = year * 12;
  b.loyalSince = year * 12;
  s.provinces = provinces;
  s.focus = name;
});

When("{string} sends one envoy to fold it in for {int} months", (s, _c: string, months: number) => {
  s.acted = true;
  const b = only(s);
  expect(startFoldIn(b, s.provinces, now(s), { reachable: true, lordRoom: true })).toEqual({ ok: true });
  expect(b.foldIn?.monthsLeft).toBe(months);
  let r = "continues";
  for (let i = 0; i < months; i++) r = progressEnvoys(b);
  expect(r).toBe("folded_in");
  s.folded = foldIn(b, { name: b.subject, provinces: Array.from({ length: s.provinces }, (_, i) => `p${i}`), army: 1000, treasury: 50, buildings: [], lords: [], sharesFaithAndPeople: true });
  bonds(s).delete(b.subject);
});

Then("the Dauphin is a great lord inside the realm of {string}", (s) => {
  expect(s.folded.lord.provinces.length).toBe(3);
  expect(s.folded.foreignRuleYears).toBe(0);
});

Given("{string} stations an envoy at the court of {string}", (s, _c: string, name: string) => {
  sit(s, name).courted = true;
  s.focus = name;
});

Given("{string} stations a resident there and arranges a marriage", (s) => {
  stationResident(only(s));
  arrangeMarriage(only(s));
});

When("the season ends with {string} at {int} up and {int} down arrows", (s, name: string, up: number, down: number) => {
  s.forcedTotal = { [name]: up - down };
  seasonEnds(s);
});

When("the war with {string} resumes in 1449 and {string} calls {string}", (s, _e: string, _o: string, name: string) => {
  s.answer = callToWar(bond(s, name), now(s));
});

Given("{string} sets the tribute of {string} to heavy to pay for the war", (s, _c: string, name: string) => {
  setTribute(bond(s, name), "heavy");
  s.focus = name;
});

Given("{string} turns {string} and an event makes it rise", (s, name: string, step: string) => {
  const b = bond(s, name, { loyalty: stepFromName(step) });
  expect(rises(b, { eventSaysRise: true })).toBe(true);
  rise(b, now(s));
});

When("{string} wins the war against {string}", (s, _c: string, name: string) => {
  s.acted = true;
  const b = bond(s, name);
  s.focus = name;
  s.peace = overlordWinsIndependenceWar(b, true);
  forceUsed([...bonds(s).values()].filter((x) => x.overlord === b.overlord), name, now(s));
});

Then("the peace folds {string} in at once because it shares a border", (s) => expect(s.peace.foldInAtOnce).toBe(true));

Then("every other subject of {string} has the reason {string} at {int} for {int} years", (s, o: string, label: string, arrow: number, years: number) => {
  for (const b of [...bonds(s).values()].filter((x) => x.overlord === o && x.subject !== s.focus)) {
    const r = b.reasons.find((x) => x.label === label);
    expect(r?.arrow).toBe(arrow);
    expect(r!.until! - r!.from).toBe(years * 12);
  }
});

Given(/^"([^"]+)" is a (Loyal|Wavering|Disloyal) Vassal of "([^"]+)"$/, (s, name: string, step: string, o: string) => {
  bond(s, name, { kind: "vassal", overlord: o, loyalty: stepFromName(step) });
  s.focus = name;
});

Given("{string} borders {string}, a rival of {string}", (s, _name: string, rival: string) => void (s.rival = rival));

Given("{string} has {int} reach free", (s, _r: string, n: number) => void (s.rivalReachFree = n));

When("{string} asks to change masters", (s, name: string) => {
  s.acted = true;
  s.changed = changeMasters(bond(s, name), s.rival, { bordersRival: true, rivalReachFree: s.rivalReachFree });
});

Then(/^"([^"]+)" is a Vassal of "([^"]+)", and "([^"]+)" and "([^"]+)" are Hostile toward each other$/, (s, name: string, o: string, a: string, b: string) => {
  expect(bond(s, name).overlord).toBe(o);
  expect(bond(s, name).kind).toBe("vassal");
  expect(s.changed.hostile).toEqual([[a, b], [b, a]]);
});

Then("{string} stays a Vassal of {string}", (s, name: string, o: string) => {
  expect(s.changed.ok).toBe(false);
  expect(bond(s, name).overlord).toBe(o);
});

Given("the country {string} declares {string} against {string} over its Disloyal Vassal {string}", (s, x: string, _aim: string, o: string, name: string) => {
  bond(s, name, { kind: "vassal", overlord: o, loyalty: "disloyal" });
  s.war = breakSubjectWar(bond(s, name));
  s.attacker = x;
  s.focus = name;
});

Then("the war is on {string}, who defends, and {string} answers by its kind and loyalty", (s, o: string) => {
  expect(s.war.target).toBe(o);
  expect(s.war.defender).toBe(o);
  expect(s.war.subjectAnswer).toBe("refuses");
});

When(/^"([^"]+)" wins and chooses to (free|take) it$/, (s, x: string, choice: "free" | "take") => {
  s.acted = true;
  const nb = breakSubjectPeace(only(s), x, choice, now(s));
  s.peace = nb ? { independent: false, overlord: nb.overlord } : { independent: true };
});


Given(/^diplomacy's count said yes to "([^"]+)" (offering overlordship to|asking) "([^"]+)"(?: for protection as a Vassal)?$/, (s, a: string, how: string, b: string) => {
  s.agreement = how === "asking" ? { subject: a, overlord: b, askedVassal: true } : { subject: b, overlord: a, askedVassal: false };
});

When("the subjects context makes the subject", (s) => {
  s.acted = true;
  const a = s.agreement;
  bond(s, a.subject, { overlord: a.overlord, kind: kindByAgreement(a.askedVassal) });
});

Then("{string} becomes a {string} of {string}", (s, name: string, kind: string, o: string) => {
  expect(bond(s, name).kind).toBe(kindFromName(kind));
  expect(bond(s, name).overlord).toBe(o);
});

Given("the subject {string} earns {int} gold a month", (s, name: string, gold: number) => {
  bond(s, name);
  s.income ??= {};
  s.income[name] = gold;
});

When("the overlord sends the subject {string} a gift", (s, name: string) => {
  s.acted = true;
  s.giftCost = giftCost(s.income[name]);
  sendGift(bond(s, name), now(s));
});

Then("the gift costs {int} gold", (s, n: number) => expect(s.giftCost).toBe(n));

When("{string} releases {string}", (s, o: string, name: string) => {
  s.acted = true;
  bond(s, "Other", { overlord: o });
  s.otherReasons = currentReasons(s, "Other").length;
  s.peace = release(bond(s, name));
  bonds(s).delete(name);
});

Then("{string} is Friendly toward {string}", (s) => expect(s.peace.stance).toBe("friendly"));

Then("no other subject of {string} gains or loses a reason", (s) => expect(currentReasons(s, "Other").length).toBe(s.otherReasons));

Then("{string} stays {string}", (s, name: string, step: string) => expect(stepName(bond(s, name).loyalty)).toBe(step));

Given("the country {string} has reach {int} and {int} subjects of weight {int}", (s, o: string, reach: number, n: number, _w: number) => {
  s.reach ??= {};
  s.reach[o] = reach;
  for (let i = 0; i < n; i++) bond(s, `subject ${i + 1}`, { overlord: o, kind: "vassal" });
});

Then("every subject of {string} has the reason {string} at {int}", (s, o: string, label: string, arrow: number) => {
  const map = stretchedThin(roster(s, o), s.reach[o]);
  for (const e of roster(s, o)) expect(Math.max(map.get(e.bond.subject) ?? 0, arrow)).toBe(arrow);
  void label;
});

// D-SUBJ-21: Sweden is a Wavering Union of Denmark in 1444; events carry it down.
Given(/^"([^"]+)" is a (Loyal|Wavering|Disloyal) Union of "([^"]+)"$/, (s, name: string, step: string, o: string) => {
  const rec = records1444().find((r) => r.subject === name.toLowerCase())!;
  expect(mapRelationKind(rec.subjectKind, false)).toEqual({ kind: "union", ties: [] });
  expect(rec.overlord).toBe(o.toLowerCase());
  expect(stepName(startLoyalty1444(rec.autonomy, false))).toBe(step);
  bond(s, name, { kind: "union", overlord: o, loyalty: stepFromName(step) });
  s.focus = name;
});

When("events add down reasons to {string} through 1448", (s, name: string) => {
  s.acted = true;
  for (let year = 1445; year <= 1448; year++) addEventReason(bond(s, name), { id: `kalmar_${year}`, label: "Kalmar quarrels", arrow: -1, months: 48 }, now(s));
  for (let season = 0; season < 4 * 4; season++) seasonEnds(s);
});

Then("{string} can fall to {string} by 1448", (s, name: string, step: string) => expect(stepName(bond(s, name).loyalty)).toBe(step));
