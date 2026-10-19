import type { Rng } from "../../rng.ts";
import { addDays, addMonths, daysBetween, monthOf, monthsBetween } from "./dates.ts";
import { config } from "./rules.ts";
import * as rel from "./relations.ts";
import { RuleError } from "./relations.ts";
import {
  addEntry, addOath, addRuleEntry, borders, country, draw, emit, entryRule, eraAtLeast, eraOf, fadeLedgers, key, marriagesBetween, neighbours, pairKey,
  province, removeEntries, standing, strength,
  type Ask, type Call, type Count, type Diplomacy, type Envoy, type Funding, type Letter, type Route, type RouteLeg, type War, type WarAim,
} from "./model.ts";
import { countAsk, giftCounts, multiples } from "./reasons.ts";
import { KINDS, kindFights, mapRelationKind, mayActAbroad, type Kind } from "../subjects/index.ts";

const C = config;

// ---------------------------------------------------------------- envoys

/** Envoy seats (DIPL-048, DIPL-049). */
export function envoySeats(d: Diplomacy, c: string): number {
  const k = country(d, c);
  const s = C.envoys.seats;
  let n = s.base + Math.min(1, k.extraSeats) + (k.courtEnvoys ?? 0);
  if (k.provinces > s.extra_if_provinces_over.provinces) n += s.extra_if_provinces_over.seats;
  if (k.inventions.length) for (const [inv, add] of Object.entries(s.inventions)) if (k.inventions.includes(inv)) n += add;
  return n;
}

const ABROAD = ["road", "court", "resident", "held", "returning"];

export function envoysAbroad(d: Diplomacy, c: string): Envoy[] {
  return d.envoys.filter((e) => e.country === c && ABROAD.includes(e.status));
}

export function freeSeats(d: Diplomacy, c: string): number {
  // Counted without building envoysAbroad's list.
  let abroad = 0;
  for (const e of d.envoys) if (e.country === c && ABROAD.includes(e.status)) abroad++;
  return envoySeats(d, c) - abroad;
}

/**
 * D-DIPL-13: when seats fall below the envoys abroad, missions finish but
 * residents beyond the seats are recalled, newest first.
 */
export function enforceSeats(d: Diplomacy, c: string): Envoy[] {
  const out: Envoy[] = [];
  let over = envoysAbroad(d, c).length - envoySeats(d, c);
  const residents = envoysAbroad(d, c).filter((e) => e.status === "resident").sort((a, b) => (b.residentSince ?? "").localeCompare(a.residentSince ?? ""));
  for (const e of residents) {
    if (over <= 0) break;
    recallResident(d, c, e.target);
    out.push(e);
    over--;
  }
  return out;
}

/** enforceSeats for every country, only where the envoys abroad (counted in one pass) are over the seats. */
function enforceAllSeats(d: Diplomacy): void {
  const abroad = new Map<string, number>();
  for (const e of d.envoys) if (ABROAD.includes(e.status)) abroad.set(e.country, (abroad.get(e.country) ?? 0) + 1);
  // A recall touches only that country's envoys, so the others' counts hold.
  for (const c of Object.keys(d.countries)) if ((abroad.get(c) ?? 0) > envoySeats(d, c)) enforceSeats(d, c);
}

/** The realm's province count changes (realm supplies it); seats follow at once. */
export function setProvinceCount(d: Diplomacy, c: string, n: number): void {
  country(d, c).provinces = n;
  enforceSeats(d, c);
}

/** The route an envoy takes: by land, by sea when land crosses an enemy or a denier, or none (DIPL-057). */
export function envoyRoute(d: Diplomacy, from: string, to: string): { by: "land" | "sea" | "none" | "resident" | "telegraph"; legs: RouteLeg[] } {
  const r: Route | undefined = d.routes[pairKey(from, to)] ?? d.defaultRoute;
  if (!r) return { by: "none", legs: [] };
  const blocked = (r.land ?? []).some((l) => l.kind === "land" && (l.crosses ?? []).some((x) => rel.has(d.graph, "at_war", x, from) || passageDenied(d, x, from)));
  if (r.land && !blocked) return { by: "land", legs: r.land };
  if (r.sea) return { by: "sea", legs: r.sea };
  return { by: "none", legs: [] };
}

/** A country that refused or revoked passage blocks the asker's envoys for 2 years (D-DIPL-21). */
export function passageDenied(d: Diplomacy, by: string, to: string): boolean {
  return d.passageDenied.some((x) => x.by === by && x.to === to && monthOf(d.date) < x.until);
}

function denyPassage(d: Diplomacy, by: string, to: string): void {
  d.passageDenied = d.passageDenied.filter((x) => !(x.by === by && x.to === to));
  d.passageDenied.push({ by, to, until: addMonths(monthOf(d.date), C.envoys.passage_denied_blocks_months) });
}

/** Days on the road: 2 per crossing unit by land, naval times by sea (DIPL-055). */
export function routeDays(legs: readonly RouteLeg[]): number {
  return legs.reduce((s, l) => s + (l.kind === "land" ? l.units * C.envoys.days_per_crossing_unit : l.days), 0);
}

export interface SendOrder {
  country: string;
  target: string;
  action: string;
  official?: string;
  lord?: string;
  type?: string;
  years?: number;
  ask?: Partial<Ask>;
  /** Carry the mission through the resident at that court (DIPL-063). */
  throughResident?: boolean;
}

const knows = (d: Diplomacy, c: string, inv: string) => country(d, c).inventions.includes(inv);

/** Sends an envoy; dates are fixed once, when sent (DIPL-050, DIPL-056 … DIPL-059). */
export function sendEnvoy(d: Diplomacy, o: SendOrder): Envoy {
  if (freeSeats(d, o.country) <= 0 && !o.throughResident) throw new RuleError("no free seat: every envoy seat is taken");
  const k = country(d, o.country);
  let person = o.official ?? o.lord ?? `${o.type ?? "Envoy"} of ${o.country}`;
  let personKind: "official" | "lord" = o.lord ? "lord" : "official";
  let type = o.type ?? "", years = o.years ?? 0, prov: string | undefined;
  if (o.official) {
    const busy = d.envoys.find((e) => e.person === o.official && ABROAD.includes(e.status));
    if (busy) throw new RuleError(`${o.official} already carries a task`);
    const off = k.officials.find((x) => x.name === o.official);
    if (off) {
      type = off.type;
      years = off.yearsServed;
      prov = off.province;
    }
  }
  if (k.noOfficials && !o.lord) {
    personKind = "lord";
    person = o.lord ?? person;
  }
  if (o.action === "make_resident") {
    if (!knows(d, o.country, C.actions.make_resident.requires_invention)) throw new RuleError("residents need G8 Resident ambassadors");
  }
  d.seq++;
  const ask: Ask = { action: o.action, asker: o.country, asked: o.target, ...(o.ask ?? {}) };
  if (type) ask.envoy = { type, years };
  const e: Envoy = { id: `envoy${d.seq}`, country: o.country, person, personKind, type, years, action: o.action, target: o.target, status: "road", sent: d.date, arrival: d.date, ask };
  if (prov) e.province = prov;
  const telegraph = knows(d, o.country, C.envoys.instant_if_both_know) && knows(d, o.target, C.envoys.instant_if_both_know) && !C.envoys.instant_excludes.includes(o.action);
  const resident = d.envoys.find((x) => x.status === "resident" && x.country === o.country && x.target === o.target);
  if (telegraph) {
    e.instant = true;
    e.status = "home";
    d.envoys.push(e);
    decideMission(d, e);
    return e;
  }
  if (o.throughResident && resident) {
    e.status = "court";
    e.arrival = d.date;
    d.envoys.push(e);
    decideMission(d, e);
    e.status = "home";
    return e;
  }
  const route = envoyRoute(d, o.country, o.target);
  if (route.by === "none") throw new RuleError(`no route for an envoy from ${o.country} to ${o.target}`);
  const days = routeDays(route.legs);
  e.arrival = addDays(d.date, days);
  e.leaveCourt = addMonths(e.arrival, C.envoys.months_at_court);
  e.returnDate = addDays(e.leaveCourt, days);
  e.missionMonths = monthsBetween(d.date, e.returnDate);
  if (prov) delete d.provinces[prov]!.official;
  if (personKind === "lord") {
    const lord = d.lords.find((l) => l.name === person);
    if (lord) {
      lord.away = true;
      if (e.missionMonths > C.envoys.lord_loyalty_step_lost_if_mission_months_over) lord.loyalty = loyaltyStep(lord.loyalty, -1);
    }
  }
  d.envoys.push(e);
  emit(d, "EnvoySent", { country: o.country, envoy: e.id, target: o.target, action: o.action, arrival: e.arrival, return: e.returnDate, provinceLeft: prov });
  if (monthOf(e.arrival) <= monthOf(d.date)) arrive(d, e);
  return e;
}

/** An envoy's person may hold only one task (DIPL-059). */
export function assignResidence(d: Diplomacy, person: string, target: string, c: string): void {
  if (d.envoys.some((e) => e.person === person && ABROAD.includes(e.status))) throw new RuleError(`${person} already carries a task`);
  sendEnvoy(d, { country: c, target, action: "make_resident", official: person });
}

function arrive(d: Diplomacy, e: Envoy): void {
  if (e.status !== "road") return;
  e.status = "court";
  emit(d, "EnvoyArrived", { envoy: e.id, court: e.target });
  decideMission(d, e);
}

/** Writes an answer letter, delivered a month after (DIPL-082). */
export const letterOf = (d: Diplomacy, l: Omit<Letter, "given" | "deliverOn">): Letter => letter(d, l);

function letter(d: Diplomacy, l: Omit<Letter, "given" | "deliverOn">): Letter {
  const full: Letter = { ...l, given: monthOf(d.date), deliverOn: addMonths(monthOf(d.date), C.answers.delay_months) };
  d.letters.push(full);
  return full;
}

/** Letters a country has received by now; none before a month has passed since the answer was given (DIPL-082). */
export function lettersReceived(d: Diplomacy, c: string): Letter[] {
  return d.letters.filter((l) => l.to === c && l.deliverOn <= monthOf(d.date));
}

/** Asks a country the player runs answers itself, not by the count (DIPL-211). */
export const PLAYER_ANSWERS = ["propose_alliance", "arrange_marriage", "demand", "offer_overlordship", "ask_protection"];

const NO_COUNT = ["send_gift", "courtesy_visit", "make_resident", "court_lord", "fund_rebels", "peace_offer", "seek_vote"];

/** Decides a mission on arrival; the answer is a letter a month after (DIPL-059, DIPL-081, DIPL-082). */
export function decideMission(d: Diplomacy, e: Envoy, rng?: Rng): Count | undefined {
  const ask = e.ask ?? { action: e.action, asker: e.country, asked: e.target };
  if (NO_COUNT.includes(e.action)) {
    if (e.action === "send_gift") receiveGift(d, e.country, e.target, ask.gift ?? 0, e.type || undefined);
    if (e.action === "courtesy_visit") addRuleEntry(d, e.target, e.country, "ties", "courtesy_visit");
    if (ask.tie) addEntry(d, e.target, e.country, { key: ask.tie.key, name: ask.tie.name, weight: ask.tie.weight, fadeYears: ask.tie.fadeYears });
    if (e.action === "make_resident") {
      e.status = "resident";
      e.residentSince = monthOf(d.date);
      e.residentSeasons = 0;
      emit(d, "ResidentInstalled", { country: e.country, court: e.target });
    }
    letter(d, { to: e.country, from: e.target, action: e.action, answer: "done", reasons: [] });
    return undefined;
  }
  if (!country(d, ask.asked).ai && PLAYER_ANSWERS.includes(e.action)) {
    // The player answers; the envoy waits at court until he leaves (DIPL-211).
    const now = monthOf(d.date);
    d.seq++;
    (d.asks ??= []).push({ id: `ask${d.seq}`, envoy: e.id, ask, arrived: now, until: e.leaveCourt ? monthOf(e.leaveCourt) : addMonths(now, C.envoys.months_at_court) });
    emit(d, "AskAwaitingAnswer", { asker: ask.asker, asked: ask.asked, action: ask.action });
    return undefined;
  }
  const count = countAsk(d, ask, (a, b) => routeDays(envoyRoute(d, a, b).legs));
  emit(d, "AnswerGiven", { asker: ask.asker, asked: ask.asked, action: ask.action, total: count.total, yes: count.yes });
  letter(d, { to: e.country, from: e.target, action: e.action, answer: count.yes ? "yes" : "no", reasons: count.reasons, total: count.total });
  applyAnswer(d, ask, count.yes, rng, e);
  return count;
}

/** The player's own answer to an ask at their court (DIPL-212): what a counted yes or no does, and a letter to the asker. */
export function answerAsk(d: Diplomacy, id: string, yes: boolean, rng?: Rng): void {
  const p = (d.asks ?? []).find((x) => x.id === id);
  if (!p) throw new RuleError("that ask has lapsed");
  d.asks = d.asks!.filter((x) => x !== p);
  const e = d.envoys.find((x) => x.id === p.envoy);
  emit(d, "AnswerGiven", { asker: p.ask.asker, asked: p.ask.asked, action: p.ask.action, yes });
  letter(d, { to: p.ask.asker, from: p.ask.asked, action: p.ask.action, answer: yes ? "yes" : "no", reasons: [] });
  applyAnswer(d, p.ask, yes, rng, e);
}

/** Asks the player left unanswered until the envoy leaves count as refused (DIPL-211). */
function lapseAsks(d: Diplomacy): void {
  const now = monthOf(d.date);
  for (const p of [...(d.asks ?? [])]) if (p.until <= now) answerAsk(d, p.id, false);
}

/** What a yes or a no does (section 6). */
export function applyAnswer(d: Diplomacy, ask: Ask, yes: boolean, rng?: Rng, e?: Envoy): void {
  const { asker, asked } = ask;
  switch (ask.action) {
    case "propose_alliance": if (yes) rel.formAlliance(d.graph, asker, asked); break;
    case "arrange_marriage": if (yes) marriageAgreed(d, asker, asked); break;
    case "trade_pact": if (yes) tradePactAgreed(d, asker, asked); break;
    case "swear_peace": if (yes) swornPeace(d, asker, asked); break;
    case "ask_passage": if (yes) grantPassage(d, asked, asker); else denyPassage(d, asked, asker); break;
    case "offer_overlordship": if (yes) emit(d, "SubjectByAgreementAgreed", { overlord: asker, subject: asked }); break;
    case "ask_protection": if (yes) emit(d, "SubjectByAgreementAgreed", { overlord: asked, subject: asker }); break;
    case "demand":
      if (yes) demandGivenIn(d, asker, asked, ask.demandKind ?? "", ask.province);
      else demandRefused(d, asker, asked, ask.demandKind ?? "", ask.province, rng, e);
      break;
  }
}

/** Monthly envoy movement: arrivals, leaving court, coming home (official back in his province). */
function moveEnvoys(d: Diplomacy): void {
  const now = monthOf(d.date);
  for (const e of d.envoys) {
    if (e.status === "road" && monthOf(e.arrival) <= now) arrive(d, e);
    if (e.status === "court" && e.leaveCourt && monthOf(e.leaveCourt) <= now) e.status = "returning";
    if (e.status === "returning" && e.returnDate && monthOf(e.returnDate) <= now) envoyHome(d, e);
    if (e.status === "resident") {
      const months = monthsBetween(e.residentSince ?? now, now);
      if (months > 0 && months % C.ledger.resident_envoy_season_months === 0) e.residentSeasons = (e.residentSeasons ?? 0) + 1;
    }
  }
}

export function envoyHome(d: Diplomacy, e: Envoy): void {
  e.status = "home";
  if (e.province) province(d, e.province).official = e.person;
  const lord = d.lords.find((l) => l.name === e.person);
  if (lord) lord.away = false;
  emit(d, "EnvoyReturned", { envoy: e.id });
}

/** The official running a province, or null while he is abroad (DIPL-047). */
export function provinceOfficial(d: Diplomacy, p: string): string | null {
  return d.provinces[p]?.official ?? null;
}

/** Recalls a resident; the Resident envoy tie then fades over 5 years (DIPL-061). */
export function recallResident(d: Diplomacy, c: string, host: string): void {
  const e = d.envoys.find((x) => x.status === "resident" && x.country === c && x.target === host);
  if (!e) throw new RuleError("no resident there");
  const r = entryRule(d, "ties", "resident_envoy");
  const weight = Math.min((e.residentSeasons ?? 0) * r.weight_per_season!, r.max!);
  e.status = "returning";
  e.returnDate = d.date;
  envoyHome(d, e);
  addEntry(d, host, c, { key: "resident_envoy", name: r.name, weight, fadeYears: r.fade_years_after! });
  emit(d, "EnvoyRecalled", { envoy: e.id });
}

/** What a resident lets the sender see (DIPL-062, DIPL-083). */
export function courtView(d: Diplomacy, viewer: string, host: string): { soldiers: "exact" | "estimate"; soldierCount?: number; treasury?: number; lordLoyalty?: { name: string; loyalty: string }[] } {
  const res = d.envoys.some((e) => e.status === "resident" && e.country === viewer && e.target === host);
  if (!res) return { soldiers: "estimate" };
  const k = country(d, host);
  return {
    soldiers: "exact",
    soldierCount: k.soldiers,
    treasury: Math.round(k.gold / 100) * 100,
    lordLoyalty: d.lords.filter((l) => l.country === host).map((l) => ({ name: l.name, loyalty: l.loyalty })),
  };
}

/** Residents warn a month ahead of a war on the sender or its allies (DIPL-064). */
export function residentWarnings(d: Diplomacy, viewer: string): { host: string; target: string }[] {
  const next = addMonths(monthOf(d.date), C.envoys.resident.war_warning_months);
  return d.plannedWars
    .filter((w) => w.month === next && d.envoys.some((e) => e.status === "resident" && e.country === viewer && e.target === w.by))
    .filter((w) => w.on === viewer || rel.alliesOf(d.graph, viewer).includes(w.on))
    .map((w) => ({ host: w.by, target: w.on }));
}

/** Holds the envoys of two countries going to war, except those carrying a peace (DIPL-066, DIPL-070). */
function holdEnvoys(d: Diplomacy, a: string, b: string): void {
  for (const e of d.envoys) {
    if (!ABROAD.includes(e.status) || e.action === "peace_offer") continue;
    if ((e.country === a && e.target === b) || (e.country === b && e.target === a)) {
      e.status = "held";
      emit(d, "EnvoyHeld", { envoy: e.id, reason: "war" });
    }
  }
}

export const mayBeHeld = (e: Envoy) => e.action !== "peace_offer";

/** An envoy's official dies on the road: the seat is freed, the mission fails (DIPL-069). */
export function envoyOfficialDies(d: Diplomacy, e: Envoy): void {
  e.status = "failed";
  emit(d, "EnvoyLost", { envoy: e.id, reason: "old age" });
}

/** A court fallen to rebels sends residents home (DIPL-068). */
export function fallsToRebels(d: Diplomacy, c: string): void {
  for (const e of d.envoys) if (e.target === c && (e.status === "resident" || e.status === "court")) envoyHome(d, e);
}

// ---------------------------------------------------------------- ledger events

const loyaltySteps = ["loyal", "wavering", "disloyal"];
export function loyaltyStep(l: string, by: number): string {
  const i = loyaltySteps.indexOf(l.toLowerCase());
  return loyaltySteps[Math.max(0, Math.min(loyaltySteps.length - 1, i - by))]!;
}

/** Gift tie: +1 per 5 gold up to +30, fading over 10 years; era VII half (DIPL-131, DIPL-170). */
export function receiveGift(d: Diplomacy, giver: string, receiver: string, gold: number, envoyType?: string): number {
  const counted = giftCounts(d, gold, envoyType, receiver);
  const r = entryRule(d, "ties", "gift");
  const w = Math.min(counted * r.weight_per_gold!, r.max!);
  country(d, giver).gold -= gold;
  addEntry(d, receiver, giver, { key: "gift", name: r.name, weight: w, fadeYears: r.fade_years! });
  emit(d, "GiftReceived", { giver, receiver, gold });
  return counted;
}

/** Provinces taken: wrong Took our land and Lands taken (policy from warfare). */
export function provincesTaken(d: Diplomacy, by: string, from: string, provinces: string[]): void {
  const r = entryRule(d, "wrongs", "took_our_land");
  addEntry(d, from, by, { key: "took_our_land", name: r.name, weight: r.weight_per_province! * provinces.length, fadeYears: r.fade_years! });
  for (const p of provinces) {
    d.taken.push({ by, from, province: p, date: monthOf(d.date) });
    const pr = province(d, p);
    pr.history.push({ owner: from, until: monthOf(d.date) });
    pr.owner = by;
  }
  country(d, by).landsTaken += provinces.length;
}

/**
 * Land that joins a realm without being seized: folding in a subject, merging a
 * Union's crowns (DIPL-224). The province records follow the new owner, but no
 * Took our land and no Lands taken are written.
 */
export function provincesJoined(d: Diplomacy, by: string, from: string, provinces: string[]): void {
  for (const p of provinces) {
    const pr = province(d, p);
    pr.history.push({ owner: from, until: monthOf(d.date) });
    pr.owner = by;
  }
}

/**
 * Lands taken in the last 20 years (DIPL-157, DIPL-221; REALM-168: a hard
 * window). `holds` says whether the taker still holds a province, so land given
 * back stops counting (REALM-125); without it, the library's own records decide.
 */
export function landsTakenWithin(d: Diplomacy, c: string, holds?: (c: string, province: string) => boolean): number {
  const window = C.lands_taken_years * 12;
  let n = 0;
  for (const t of d.taken) {
    if (t.by !== c || monthsBetween(t.date, d.date) >= window) continue;
    if (holds ? holds(c, t.province) : (d.provinces[t.province]?.owner ?? c) === c) n++;
  }
  return n;
}

/** Sets every country's Lands taken to the last 20 years' (DIPL-221), dropping older entries whole. */
export function refreshLandsTaken(d: Diplomacy, holds?: (c: string, province: string) => boolean): void {
  const window = C.lands_taken_years * 12;
  // Entries older than the window never count again; Took our land and the frontier keep their own ledger entries.
  const counts = new Map<string, number>();
  for (const t of d.taken) {
    if (monthsBetween(t.date, d.date) >= window) continue;
    if (holds ? !holds(t.by, t.province) : (d.provinces[t.province]?.owner ?? t.by) !== t.by) continue;
    counts.set(t.by, (counts.get(t.by) ?? 0) + 1);
  }
  for (const [id, c] of Object.entries(d.countries)) c.landsTaken = counts.get(id) ?? 0;
}

/**
 * DIPL-222: a country near land that changed hands by a peace or a demand holds
 * the wrong Grabbed land near us toward the taker, −5 a province, fading over 20 years.
 */
export function grabbedLandNearUs(d: Diplomacy, holder: string, taker: string, provinces: number): void {
  if (provinces <= 0 || holder === taker) return;
  const r = entryRule(d, "wrongs", "grabbed_land_near_us");
  addEntry(d, holder, taker, { key: "grabbed_land_near_us", name: r.name, weight: r.weight_per_province! * provinces, fadeYears: r.fade_years! });
}

/** "Freed us" after a won Free a people or Break a subject (diplomacy 3.2). */
export function freedBy(d: Diplomacy, freed: string, liberator: string): void {
  addRuleEntry(d, freed, liberator, "ties", "freed_us");
}

// ---------------------------------------------------------------- war aims

const AIM_NAMES: Record<string, string> = {
  take_land: "Take land", seat_pretender: "Seat a pretender", tribute: "Tribute", free_people: "Free a people", break_subject: "Break a subject",
  defend_faith: "Defend the faith", punish: "Punish", raid: "Raid", no_aim: "No aim",
  restore_imperial_land: "Restore imperial land", breaker_of_the_peace: "Breaker of the Peace", bring_to_heel: "Bring to heel",
};
export const aimName = (id: string) => AIM_NAMES[id] ?? id;
export const aimId = (name: string) => Object.entries(AIM_NAMES).find(([, n]) => n === name)?.[0] ?? name;

export function grantAim(d: Diplomacy, a: WarAim): void {
  d.aims.push(a);
  emit(d, "WarAimGained", { holder: a.holder, target: a.target, aim: a.aim, until: a.until });
}

function timedAim(d: Diplomacy, holder: string, target: string, aim: string, years: number, source: string, prov?: string): void {
  const a: WarAim = { holder, target, aim, until: addMonths(monthOf(d.date), years * 12), source };
  if (prov) a.province = prov;
  grantAim(d, a);
}

/** Every war aim holder holds against target now (DIPL-139 … DIPL-147). */
export function warAimsOf(d: Diplomacy, holder: string, target: string): WarAim[] {
  const now = monthOf(d.date);
  const out: WarAim[] = d.aims.filter((a) => a.holder === holder && a.target === target && (!a.until || now < a.until));
  const h = country(d, holder);
  const add = (aim: string, source: string, prov?: string) => out.push(prov ? { holder, target, aim, source, province: prov } : { holder, target, aim, source });
  for (const p of Object.values(d.provinces).filter((x) => x.owner === target)) {
    if (p.history.some((x) => x.owner === holder && monthsBetween(x.until, now) <= C.war_aims.held_province_years * 12)) add("take_land", "held within 50 years", p.id);
    if (d.pretenders.some((x) => x.court === holder && x.claims.includes(p.id))) add("take_land", "a pretender's claim", p.id);
    if (p.homelandOf && p.homelandOf === h.culture) add("take_land", "homeland of our culture", p.id);
    if (d.lords.some((l) => l.country === holder && (l.wants ?? []).includes(p.id))) add("take_land", "a lord's Want", p.id);
    if (d.defections.some((x) => x.from === holder && x.to === target && x.provinces.includes(p.id))) add("take_land", "a lord defected with it", p.id);
    if (p.homelandOf && d.statelessCultures.includes(p.homelandOf) && (h.culture === p.homelandOf || h.acceptedCultures.includes(p.homelandOf))) add("free_people", `homeland of ${p.homelandOf}`);
    if (p.persecution && p.borders.includes(holder)) add("defend_faith", "persecution on our border");
  }
  if (d.pretenders.some((x) => x.court === holder && x.throne === target)) add("seat_pretender", "a pretender at our court");
  if (borders(d, holder, target) && h.soldiers >= C.war_aims.tribute_by_strength_multiple * country(d, target).soldiers && country(d, target).soldiers > 0) add("tribute", "three times their soldiers");
  for (const s of rel.subjectsOf(d.graph, target)) {
    if (rel.stance(d.graph, s, target) === "hostile") add("break_subject", `${s} is Hostile toward ${target}`);
    else if (d.helpAsked.some((x) => x.subject === s && x.helper === holder)) add("break_subject", `${s} asked us for help`);
  }
  add("raid", "always");
  add("no_aim", "always");
  return out;
}

export function holdsAim(d: Diplomacy, holder: string, target: string, aim: string, prov?: string): boolean {
  return warAimsOf(d, holder, target).some((a) => a.aim === aim && (!prov || a.province === prov));
}

// ---------------------------------------------------------------- war and calls

/** The subjects kind of a subject: relation kinds are mapped onto the six kinds (X-8, D-DIPL-10). */
export function subjectKind(d: Diplomacy, subject: string): Kind {
  const raw = d.graph.relations.find((r) => r.type === "subject" && r.source === subject)?.subject_kind ?? "vassal";
  if ((KINDS as string[]).includes(raw)) return raw as Kind;
  const m = mapRelationKind(raw, false);
  return "lord" in m ? "vassal" : m.kind;
}

export interface DeclareOptions {
  aim?: string;
  scripted?: boolean;
}

/** Declares war: aim held, pacts broken, subjects and regencies limited; calls go out the same turn (DIPL-148 … DIPL-153). */
export function declareWar(d: Diplomacy, a: string, b: string, o: DeclareOptions = {}): War {
  const aim = o.aim ?? "no_aim";
  if (!holdsAim(d, a, b, aim)) throw new RuleError(`${a} holds no aim ${aimName(aim)} against ${b}`);
  if (country(d, a).regency && !C.war_aims.regency_allows.includes(aim)) throw new RuleError("a regency fights only defensive wars and raids");
  const ov = rel.overlord(d.graph, a);
  if (ov && ov !== b) {
    const kind = subjectKind(d, a);
    const againstOverlord = rel.alliesOf(d.graph, ov).includes(b);
    if (!mayActAbroad(kind, "war", againstOverlord)) throw new RuleError(`a ${kind} has no diplomacy of its own`);
  }
  if (rel.hasFact(d.graph, "protection_pledge", a, b, true)) throw new RuleError(`${a} pledged to protect ${b}; break the pledge first`);
  rel.guarded(d.graph, o.scripted ?? false, () => rel.declareWar(d.graph, a, b));
  d.seq++;
  const provoked = d.refusedDemands.find((x) => x.asker === a && x.asked === b);
  const trespass = d.trespasses.find((t) => t.intruder === b && t.owner === a && t.month === monthOf(d.date));
  const war: War = { id: `war${d.seq}`, attackers: [a], defenders: [b], aim, declarer: a, target: b, start: monthOf(d.date), startedBy: trespass ? b : a };
  if (provoked) war.provokedBy = b;
  d.wars.push(war);
  holdEnvoys(d, a, b);
  rel.removeFact(d.graph, "trade_agreement", a, b);
  emit(d, "WarDeclared", { declarer: a, target: b, aim: aimName(aim), public: true });
  if (aim === "no_aim") for (const n of neighbours(d, a)) if (n !== b) addRuleEntry(d, n, a, "wrongs", "threatened_us");
  issueCalls(d, war);
  return war;
}

function issueCall(d: Diplomacy, war: War, caller: string, called: string, against: string, kind: Call["kind"], via: Call["via"]): Call | undefined {
  if (called === against || d.calls.some((c) => c.war === war.id && c.called === called)) return undefined;
  d.seq++;
  const call: Call = { id: `call${d.seq}`, caller, called, against, kind, via, war: war.id, issued: monthOf(d.date), answerOn: addMonths(monthOf(d.date), C.answers.delay_months) };
  d.calls.push(call);
  emit(d, "CallToArmsIssued", { caller, called, kind, war: war.id });
  if (kind === "defensive" && via === "alliance" && eraAtLeast(d, "VI") && d.mobilisationPacts.includes(pairKey(caller, called))) {
    call.automatic = true;
    answerCall(d, call, true);
    emit(d, "MobilisationTriggered", { partners: [caller, called], war: war.id, to: called, title: C.eras.VI?.mobilisation_event, joined: called });
  }
  return call;
}

/** A call from outside the war's own ties: the Emperor called to defend a member (institutions INST-030). */
export function issueOutsideCall(d: Diplomacy, war: War, caller: string, called: string, against: string, via: "empire"): Call | undefined {
  return issueCall(d, war, caller, called, against, "defensive", via);
}

function issueCalls(d: Diplomacy, war: War): void {
  const a = war.declarer, b = war.target;
  const attackerKind: Call["kind"] = war.startedBy === b ? "defensive" : "offensive";
  for (const ally of rel.alliesOf(d.graph, a)) issueCall(d, war, a, ally, b, attackerKind, "alliance");
  if (war.provokedBy !== b) {
    for (const ally of rel.alliesOf(d.graph, b)) issueCall(d, war, b, ally, a, "defensive", "alliance");
    for (const f of d.graph.facts) if (f.fact === "protection_pledge" && f.target === b) issueCall(d, war, b, f.source, a, "defensive", "pledge");
  }
  for (const l of d.leagues) if (l.target === a) for (const m of l.members) if (m !== b) issueCall(d, war, m, m, a, "defensive", "league");
  // D-DIPL-10: subjects follow their kind. A Union joins at once; a Vassal or Protectorate is called and
  // answers by its loyalty (subjects context); a March joins when the enemy borders it; a Tributary never
  // joins and a Colony only defends itself.
  for (const [side, enemy] of [[a, b], [b, a]] as const) {
    for (const r of d.graph.relations.filter((x) => x.type === "subject" && x.target === side)) {
      const fights = kindFights(subjectKind(d, r.source));
      if (fights === "always_if_loyal_or_wavering") joinWar(d, war, r.source, side, enemy);
      else if (fights === "own_frontier_only" && borders(d, r.source, enemy)) joinWar(d, war, r.source, side, enemy);
      else if (fights === "when_called_by_loyalty") issueCall(d, war, side, r.source, enemy, side === a ? attackerKind : "defensive", "subject");
    }
  }
}

/** Country c joins the war on side's side against enemy (a call answered, or a backer of a rising). */
export function joinWar(d: Diplomacy, war: War, c: string, side: string, enemy: string): void {
  if (!rel.stateOf(d.graph, c, enemy)) rel.newRecord(d.graph, "at_war", c, enemy, "mutual");
  for (const x of [c, enemy]) if (rel.storedStance(d.graph, x, x === c ? enemy : c) === null) rel.setStance(d.graph, x, x === c ? enemy : c, "hostile");
  (war.attackers.includes(side) ? war.attackers : war.defenders).push(c);
  emit(d, "JoinedWar", { country: c, war: war.id });
}

/** Answers a call to arms; refusals follow the call's kind (DIPL-096, DIPL-097, DIPL-123, DIPL-160). */
export function answerCall(d: Diplomacy, call: Call, yes: boolean): void {
  call.answer = yes ? "yes" : "no";
  emit(d, "CallToArmsAnswered", { caller: call.caller, called: call.called, answer: call.answer });
  const war = d.wars.find((w) => w.id === call.war);
  if (yes) {
    const side = war && war.attackers.includes(call.caller) ? war.declarer : war?.target ?? call.caller;
    if (war) joinWar(d, war, call.called, side, call.against);
    if (call.via !== "league") addRuleEntry(d, call.caller, call.called, "ties", "answered_our_call");
    return;
  }
  if (call.via === "subject") return; // the subjects context answers a subject's refusal (SUBJ-028)
  if (call.via === "empire") return; // the institutions context answers the Emperor's refusal (INST-030)
  if (call.via === "league") {
    for (const l of d.leagues) if (l.target === call.against) l.members = l.members.filter((m) => m !== call.called);
    emit(d, "LeagueMemberLeft", { member: call.called, target: call.against });
    return;
  }
  if (call.kind !== "defensive") return; // an offensive refusal breaks nothing (D-DIPL-2)
  if (call.via === "alliance") {
    rel.breakAlliance(d.graph, call.caller, call.called);
    emit(d, "AllianceBroken", { pair: [call.caller, call.called] });
    addRuleEntry(d, call.caller, call.called, "wrongs", "abandoned_us");
  }
  addOath(d, call.called, "refused a defensive call");
}

export function pendingCall(d: Diplomacy, called: string): Call | undefined {
  return d.calls.find((c) => c.called === called && !c.answer);
}

/** A regency may answer defensive calls (DIPL-153). */
export function mayAnswerCall(d: Diplomacy, c: string, kind: Call["kind"]): boolean {
  return !country(d, c).regency || C.war_aims.regency_allows.includes(kind);
}

/** Ends a war: peace for every pair across the sides, Fought side by side for partners (DIPL-102). */
export function endWar(d: Diplomacy, war: War, o: rel.PeaceOptions = {}): void {
  for (const x of war.attackers) for (const y of war.defenders) if (rel.has(d.graph, "at_war", x, y)) rel.makePeace(d.graph, x, y, o);
  for (const side of [war.attackers, war.defenders]) {
    for (const x of side) for (const y of side) if (x !== y) addRuleEntry(d, x, y, "ties", "fought_side_by_side");
  }
  for (const e of d.envoys) if (e.status === "held" && [...war.attackers, ...war.defenders].includes(e.country)) envoyHome(d, e);
  d.wars = d.wars.filter((w) => w !== war);
  emit(d, "PeaceSigned", { war: war.id });
}

export function warOf(d: Diplomacy, c: string): War | undefined {
  return d.wars.find((w) => w.attackers.includes(c) || w.defenders.includes(c));
}

/** A separate peace when over half of the ally's own voices say peace; no Oath broken, but the call tie is lost (DIPL-101). */
export function separatePeace(d: Diplomacy, ally: string, enemy: string): void {
  if (country(d, ally).peaceVoicesForPeace <= C.actions.call_to_arms.separate_peace_when_peace_voices_over) throw new RuleError("not enough peace voices for a separate peace");
  rel.makePeace(d.graph, ally, enemy);
  for (const k of Object.keys(d.ledgers)) if (k.endsWith(`>${ally}`)) removeEntries(d, k.split(">")[0]!, ally, "answered_our_call");
  for (const w of d.wars) {
    w.attackers = w.attackers.filter((x) => x !== ally);
    w.defenders = w.defenders.filter((x) => x !== ally);
  }
  emit(d, "SeparatePeaceMade", { ally, enemy });
}

/** Many-sided peace from era III or the Peace of Westphalia (DIPL-156, DIPL-166). */
export function manySidedPeaceUnlocked(d: Diplomacy): boolean {
  return eraAtLeast(d, "III") || d.flags.includes(C.eras.III?.or_event ?? "peace_of_westphalia");
}

export function manySidedPeace(d: Diplomacy, sides: [string[], string[]]): { signs: Record<string, boolean> } {
  if (!manySidedPeaceUnlocked(d)) throw new RuleError("each pair must make its own peace");
  const signs: Record<string, boolean> = {};
  for (const c of [...sides[0], ...sides[1]]) signs[c] = country(d, c).peaceVoicesForPeace > 0.5;
  return { signs };
}

// ---------------------------------------------------------------- pacts

export function proposeAlliance(d: Diplomacy, a: string, b: string, o: Partial<SendOrder> = {}): Envoy {
  if (rel.has(d.graph, "at_war", a, b)) throw new RuleError("propose_alliance: at war");
  for (const [x, y] of [[a, b], [b, a]] as const) if (rel.stance(d.graph, x, y) === "hostile") throw new RuleError("propose_alliance: a stance is hostile");
  if (rel.overlord(d.graph, a) === b || rel.overlord(d.graph, b) === a) throw new RuleError("propose_alliance: a subject tie");
  return sendEnvoy(d, { ...o, country: a, target: b, action: "propose_alliance" });
}

/** DIPL-103: ends it, an Oath broken, the wrong Broke our alliance. */
export function breakAlliance(d: Diplomacy, a: string, b: string): void {
  rel.breakAlliance(d.graph, a, b);
  addOath(d, a, "broke an alliance");
  const r = entryRule(d, "wrongs", "broke_truce_or_alliance");
  addEntry(d, b, a, { key: "broke_alliance", name: r.names!.alliance!, weight: r.weight!, fadeYears: r.fade_years! });
  emit(d, "AllianceBroken", { pair: [a, b] });
}

/** DIPL-125 / DIPL-029: an Oath broken, the wrong Broke a truce with us, both Hostile, Punish for 5 years. */
export function breakTruce(d: Diplomacy, a: string, b: string): void {
  rel.guarded(d.graph, false, () => rel.breakTruce(d.graph, a, b));
  addOath(d, a, "broke a truce");
  const r = entryRule(d, "wrongs", "broke_truce_or_alliance");
  addEntry(d, b, a, { key: "broke_truce", name: r.names!.truce!, weight: r.weight!, fadeYears: r.fade_years! });
  timedAim(d, b, a, "punish", C.war_aims.punish_years, "broke a truce with us");
  emit(d, "TruceBroken", { pair: [a, b] });
}

/** DIPL-122. */
export function pledgeProtection(d: Diplomacy, p: string, q: string): void {
  if (rel.has(d.graph, "at_war", p, q)) throw new RuleError("pledge: at war with them");
  if (rel.overlord(d.graph, q) === p) throw new RuleError("pledge: they are our subject");
  rel.addFact(d.graph, "protection_pledge", p, q);
  emit(d, "ProtectionPledged", { protector: p, protected: q });
}

/** DIPL-149: breaking a pledge before war counts as an Oath broken. */
export function breakPledge(d: Diplomacy, p: string, q: string): void {
  rel.removeFact(d.graph, "protection_pledge", p, q, true);
  addOath(d, p, "broke a pledge");
}

/** DIPL-124: a Truce of 10 years made without a war. */
export function swornPeace(d: Diplomacy, a: string, b: string): void {
  if (rel.has(d.graph, "at_war", a, b)) throw new RuleError("swear_peace: at war");
  rel.setRelation(d.graph, "truce", a, b);
  const t = rel.find(d.graph, "truce", a, b)[0]!;
  t.expires_on = addMonths(monthOf(d.date), C.actions.swear_peace.truce_months);
  t.sworn = true;
  emit(d, "TruceCreated", { pair: [a, b], expiry: t.expires_on });
}

/** Truce length after a peace, by its terms (DIPL-154; X-11, D-DIPL-3). */
export function truceMonthsAfterPeace(terms: { white?: boolean; landOrSubject?: boolean }): number {
  if (terms.white) return C.truce.white_peace_months;
  return C.truce.base_months + (terms.landOrSubject ? C.truce.extra_months_if_land_or_subject : 0);
}

export function markMobilisationPact(d: Diplomacy, a: string, b: string): void {
  if (!eraAtLeast(d, "VI")) throw new RuleError("mobilisation pacts need era VI");
  if (!rel.has(d.graph, "alliance", a, b)) throw new RuleError("mobilisation pacts need an alliance");
  d.mobilisationPacts.push(pairKey(a, b));
  emit(d, "MobilisationPactMarked", { pair: [a, b] });
}

/** D-DIPL-22: either ally may unmark a pact, at once. */
export function unmarkMobilisationPact(d: Diplomacy, a: string, b: string): void {
  d.mobilisationPacts = d.mobilisationPacts.filter((k) => k !== pairKey(a, b));
  emit(d, "MobilisationPactUnmarked", { pair: [a, b] });
}

/** D-DIPL-22: withdrawing a pledge is breaking it (an Oath broken). */
export const withdrawPledge = (d: Diplomacy, p: string, q: string) => breakPledge(d, p, q);

/** D-DIPL-22: a Rival may be dropped once it has stood 10 years. */
export function dropRival(d: Diplomacy, a: string, b: string): void {
  if (!rel.rivalMayChange(d.graph, a, b)) throw new RuleError("a Rival stands at least 10 years");
  rel.removeRelation(d.graph, "rival", a, b);
  emit(d, "RivalDropped", { by: a, target: b });
}

/** D-DIPL-22: an envoy on a mission cannot be recalled; a resident can. */
export function recallEnvoy(d: Diplomacy, c: string, target: string): void {
  if (d.envoys.some((e) => e.country === c && e.target === target && e.status === "resident")) return recallResident(d, c, target);
  throw new RuleError("an envoy on a mission cannot be recalled");
}

/** A subject asks a country for help against its overlord (DIPL-143). */
export function askForHelp(d: Diplomacy, subject: string, helper: string): void {
  d.helpAsked.push({ subject, helper });
}

// ---------------------------------------------------------------- trade

export function tradePactAgreed(d: Diplomacy, a: string, b: string): void {
  if (rel.has(d.graph, "at_war", a, b)) throw new RuleError("trade pact: at war");
  rel.addFact(d.graph, "trade_agreement", a, b);
  emit(d, "TradePactSigned", { pair: [a, b] });
}

export function offerTradePact(d: Diplomacy, a: string, b: string): Envoy {
  if (rel.has(d.graph, "at_war", a, b)) throw new RuleError("trade pact: at war");
  return sendEnvoy(d, { country: a, target: b, action: "trade_pact" });
}

export function cancelTradePact(d: Diplomacy, a: string, b: string): void {
  rel.removeFact(d.graph, "trade_agreement", a, b);
  emit(d, "TradePactEnded", { pair: [a, b] });
}

export const tollsWaived = (d: Diplomacy, a: string, b: string) => rel.hasFact(d.graph, "trade_agreement", a, b);

export function declareEmbargo(d: Diplomacy, a: string, b: string): void {
  if (rel.has(d.graph, "at_war", a, b)) throw new RuleError("embargo: at war");
  d.embargoes.push({ by: a, on: b });
  emit(d, "EmbargoDeclared", { pair: [a, b] });
}

/** D-DIPL-22: lifting an embargo is free and instant. */
export function liftEmbargo(d: Diplomacy, a: string, b: string): void {
  d.embargoes = d.embargoes.filter((e) => !(e.by === a && e.on === b));
  emit(d, "EmbargoLifted", { pair: [a, b] });
}

/** Trade between two countries: stopped by war (DIPL-044) or an embargo either way (DIPL-121). */
export function tradeAllowed(d: Diplomacy, a: string, b: string): boolean {
  return !rel.has(d.graph, "at_war", a, b) && !d.embargoes.some((e) => (e.by === a && e.on === b) || (e.by === b && e.on === a));
}

export function pathsClosed(d: Diplomacy, through: string, trader: string): boolean {
  return d.embargoes.some((e) => e.by === through && e.on === trader) || rel.has(d.graph, "at_war", through, trader);
}

// ---------------------------------------------------------------- passage

/** Armies may enter only at war, as subject or ally, or with passage (DIPL-116). */
export function mayEnter(d: Diplomacy, a: string, b: string): boolean {
  if (rel.has(d.graph, "at_war", a, b) || rel.has(d.graph, "alliance", a, b) || rel.overlord(d.graph, b) === a) return true;
  return d.passages.some((p) => p.granter === b && p.grantee === a && monthOf(d.date) < p.until);
}

export function askPassage(d: Diplomacy, a: string, b: string, target?: string): Envoy {
  if (!knows(d, a, C.actions.ask_passage.requires_invention)) throw new RuleError("passage needs G8 Resident ambassadors");
  if (rel.has(d.graph, "at_war", a, b)) throw new RuleError("passage: at war");
  return sendEnvoy(d, { country: a, target: b, action: "ask_passage", ...(target ? { ask: { passageTarget: target } } : {}) });
}

export function grantPassage(d: Diplomacy, granter: string, grantee: string): void {
  d.passages.push({ granter, grantee, until: addMonths(monthOf(d.date), C.actions.ask_passage.months) });
  emit(d, "PassageGranted", { pair: [granter, grantee] });
}

/** Revoking passage ends it that day without an Oath broken (DIPL-118). */
export function revokePassage(d: Diplomacy, granter: string, grantee: string): void {
  d.passages = d.passages.filter((p) => !(p.granter === granter && p.grantee === grantee));
  denyPassage(d, granter, grantee);
  emit(d, "PassageRevoked", { pair: [granter, grantee] });
}

/** An army without passage: an act of war; the owner holds Punish (DIPL-119). */
export function armyEnters(d: Diplomacy, a: string, b: string): void {
  if (mayEnter(d, a, b)) return;
  d.trespasses.push({ intruder: a, owner: b, month: monthOf(d.date) });
  timedAim(d, b, a, "punish", C.war_aims.punish_years, "entered our land without passage");
  emit(d, "TrespassWithoutPassage", { owner: a, country: b });
}

// ---------------------------------------------------------------- demands

export const DEMANDS: Record<string, string> = {
  "Hand over a province": "hand_over_province", "Pay tribute": "pay_tribute", "Recognise our pretender": "recognise_pretender", "Release a subject": "release_subject",
  "Tolerate our faith": "tolerate_faith", "Apologise and pay": "apologise_and_pay", "Expel an envoy or cut an alliance": "expel_envoy_or_cut_alliance",
};

/** Whether a demand kind's need is met (Demand kinds table). */
export function demandNeedMet(d: Diplomacy, a: string, b: string, kind: string, prov?: string): boolean {
  switch (kind) {
    case "hand_over_province": {
      const p = prov ? d.provinces[prov] : undefined;
      return !!p && (p.borders.includes(a) || d.graph.facts.some((f) => f.fact === "territorial_claim" && f.source === a && f.target === b));
    }
    case "pay_tribute": return borders(d, a, b);
    case "recognise_pretender": return d.pretenders.some((x) => x.court === a && x.throne === b);
    case "release_subject": return rel.subjectsOf(d.graph, b).length > 0;
    case "tolerate_faith": return Object.values(d.provinces).some((p) => p.owner === b && p.persecution && p.borders.includes(a));
    case "apologise_and_pay": return d.events.some((e) => (e.type === "Insulted" || e.type === "OathBrokenToward") && e.by === b && e.target === a);
    case "expel_envoy_or_cut_alliance":
      return rel.alliesOf(d.graph, b).some((x) => rel.stance(d.graph, a, x) === "rival") || d.envoys.some((e) => e.status === "resident" && e.target === b && rel.enemiesOf(d.graph, a).includes(e.country));
    default: return false;
  }
}

/** A demand needs a war aim or a Rival or Hostile stance, and its kind's need (DIPL-111). */
export function makeDemand(d: Diplomacy, a: string, b: string, kind: string, prov?: string): Envoy {
  const reason = ["rival", "hostile"].includes(rel.stance(d.graph, a, b)) || warAimsOf(d, a, b).some((x) => x.aim !== "raid" && x.aim !== "no_aim");
  if (!reason) throw new RuleError("a demand needs a war aim or a Rival or Hostile stance");
  if (!(kind in C.actions.demand.kinds)) throw new RuleError(`unknown demand ${kind}`);
  if (!demandNeedMet(d, a, b, kind, prov)) throw new RuleError(`the need of ${kind} is not met`);
  return sendEnvoy(d, { country: a, target: b, action: "demand", ask: { demandKind: kind, ...(prov ? { province: prov } : {}) } });
}

/** DIPL-113. */
export function demandGivenIn(d: Diplomacy, a: string, b: string, kind: string, prov?: string): void {
  addRuleEntry(d, b, a, "wrongs", "threatened_us");
  emit(d, "DemandGivenIn", { asker: a, asked: b, kind, province: prov, granted: kind });
}

/** DIPL-114, DIPL-067: the matching aim for 5 years; a Hostile refuser may hold the envoy. */
export function demandRefused(d: Diplomacy, a: string, b: string, kind: string, prov?: string, rng?: Rng, e?: Envoy): void {
  const aim = C.actions.demand.kinds[kind]!.grants_aim;
  timedAim(d, a, b, aim, C.actions.demand.on_refusal.aim_years, `refused ${kind}`, kind === "hand_over_province" ? prov : undefined);
  addRuleEntry(d, b, a, "wrongs", "threatened_us");
  d.refusedDemands.push({ asker: a, asked: b, kind, date: monthOf(d.date), ...(prov ? { province: prov } : {}) });
  emit(d, "DemandRefused", { asker: a, asked: b, kind });
  if (e && rel.stance(d.graph, b, a) === "hostile" && draw(d, rng) < C.envoys.held.refused_demand_by_hostile_chance) {
    e.status = "held";
    emit(d, "EnvoyHeld", { envoy: e.id, reason: "refused demand" });
    timedAim(d, a, b, "punish", C.war_aims.punish_years, "held our envoy");
  }
}

/** Holding an envoy gives the sender Punish (DIPL-145). */
export function holdEnvoy(d: Diplomacy, host: string, e: Envoy): void {
  e.status = "held";
  timedAim(d, e.country, host, "punish", C.war_aims.punish_years, "held our envoy");
}

// ---------------------------------------------------------------- insults and rivals

/** DIPL-132: the insulted side turns Hostile, the wrong Insulted us, Warlike lords pleased, Punish. */
export function insult(d: Diplomacy, a: string, b: string, scripted = false): void {
  rel.guarded(d.graph, scripted, () => rel.insult(d.graph, a, b));
  addRuleEntry(d, b, a, "wrongs", "insulted_us");
  for (const l of d.lords) if (l.country === a && l.warlike && l.wantsWarWith === b) l.loyalty = loyaltyStep(l.loyalty, 1);
  timedAim(d, b, a, "punish", C.war_aims.punish_years, "insulted us");
  emit(d, "Insulted", { by: a, target: b });
}

export function declareRival(d: Diplomacy, a: string, b: string, contested: string | undefined): void {
  rel.setRival(d.graph, a, b, contested);
  emit(d, "RivalDeclared", { by: a, target: b, contested });
}

// ---------------------------------------------------------------- marriages and pretenders

export function proposeMarriage(d: Diplomacy, a: string, b: string): Envoy {
  if (d.marriageForbidden.includes(pairKey(a, b))) throw new RuleError("the religion rules do not allow this marriage");
  if (country(d, a).unmarriedChildren < 1 || country(d, b).unmarriedChildren < 1) throw new RuleError("a marriage needs an unmarried heir or child on each side");
  return sendEnvoy(d, { country: a, target: b, action: "arrange_marriage" });
}

/** DIPL-106. */
export function marriageAgreed(d: Diplomacy, a: string, b: string): void {
  d.marriages.push({ a, b });
  if (!rel.hasFact(d.graph, "royal_marriage", a, b)) rel.addFact(d.graph, "royal_marriage", a, b);
  emit(d, "MarriageArranged", { houses: [a, b] });
}

/** DIPL-107: each marriage a 1 in 10 chance of a claim and a pretender. */
export function rulerDiesWithoutDirectHeir(d: Diplomacy, x: string, rng?: Rng): void {
  for (const m of d.marriages.filter((m) => m.a === x || m.b === x)) {
    const other = m.a === x ? m.b : m.a;
    if (draw(d, rng) < C.actions.arrange_marriage.claim_chance_per_heirless_death) {
      rel.addFact(d.graph, "dynastic_claim", other, x);
      placePretender(d, `Claimant of ${other}`, x, other);
      emit(d, "ClaimArisen", { claimant: other, throne: x });
    }
  }
}

export function placePretender(d: Diplomacy, name: string, throne: string, court: string, claims: string[] = []): void {
  d.pretenders.push({ name, throne, court, claims });
  emit(d, "PretenderPlaced", { pretender: name, court, throne });
}

/** DIPL-109. */
export function pretenderDies(d: Diplomacy, name: string, heir?: string): void {
  const p = d.pretenders.find((x) => x.name === name);
  if (!p) return;
  d.pretenders = d.pretenders.filter((x) => x !== p);
  if (heir) d.pretenders.push({ ...p, name: heir });
}

/** DIPL-110: the strongest claim (most marriages) inherits; the union goes to subjects; disloyal lords roll. */
export function rulerDiesWithNoHeir(d: Diplomacy, x: string): string | null {
  const houses = [...new Set(d.marriages.filter((m) => m.a === x || m.b === x).map((m) => (m.a === x ? m.b : m.a)))];
  houses.sort((p, q) => marriagesBetween(d, q, x) - marriagesBetween(d, p, x));
  const heir = houses[0];
  if (!heir) return null;
  emit(d, "CrownInherited", { realm: x, newRuler: heir, kind: "personal_union" });
  for (const l of d.lords.filter((l) => l.country === x && ["wavering", "disloyal"].includes(l.loyalty.toLowerCase()))) emit(d, "SuccessionWarRoll", { lord: l.name, realm: x });
  return heir;
}

// ---------------------------------------------------------------- courting lords

export function courtLord(d: Diplomacy, by: string, lordName: string): void {
  const lord = d.lords.find((l) => l.name === lordName);
  if (!lord || !C.actions.court_lord.requires_lord_loyalty.includes(lord.loyalty.toLowerCase())) throw new RuleError("only a Wavering or Disloyal lord can be courted");
  d.courtings.push({ by, lord: lordName, since: monthOf(d.date) });
  emit(d, "LordCourted", { lord: lordName, by });
}

/** Season end: loyalty drops a step unless countered; 1 in 4 discovery (DIPL-128, DIPL-130). */
export function courtingSeason(d: Diplomacy, rng?: Rng): void {
  for (const c of [...d.courtings]) {
    const lord = d.lords.find((l) => l.name === c.lord);
    if (!lord) continue;
    if (!c.countered) lord.loyalty = loyaltyStep(lord.loyalty, -C.actions.court_lord.loyalty_steps_per_season);
    c.countered = false;
    if (draw(d, rng) < C.actions.court_lord.discovery_chance_per_season) {
      addRuleEntry(d, lord.country, c.by, "wrongs", "courted_our_lord");
      d.courtings = d.courtings.filter((x) => x !== c);
      for (const e of d.envoys) if (e.country === c.by && e.action === "court_lord" && ABROAD.includes(e.status)) envoyHome(d, e);
      emit(d, "CourtingDiscovered", { lord: c.lord, by: c.by });
    }
  }
}

/** A courted Disloyal lord bordering the courter defects after a year (DIPL-129). */
export function courtingDefections(d: Diplomacy): void {
  for (const c of [...d.courtings]) {
    const lord = d.lords.find((l) => l.name === c.lord);
    if (!lord || lord.loyalty.toLowerCase() !== "disloyal") continue;
    if (monthsBetween(c.since, d.date) < C.actions.court_lord.defect_after_months) continue;
    const bordersUs = lord.provinces.some((p) => d.provinces[p]?.borders.includes(c.by));
    if (C.actions.court_lord.defect_needs_border && !bordersUs) continue;
    const from = lord.country;
    for (const p of lord.provinces) province(d, p).owner = c.by;
    d.defections.push({ from, to: c.by, provinces: [...lord.provinces] });
    lord.country = c.by;
    d.courtings = d.courtings.filter((x) => x !== c);
    emit(d, "LordDefected", { lord: lord.name, from, to: c.by, provinces: lord.provinces });
  }
}

// ---------------------------------------------------------------- funding rebels

const FR = () => C.actions.fund_rebels;

/** Gold a month: 1 % of the target's yearly income, at least 1 (X-10, D-DIPL-23). */
export function fundingGold(d: Diplomacy, target: string): number {
  return Math.max(1, Math.round(country(d, target).yearlyIncome * FR().gold_share_of_target_yearly_income));
}

/** DIPL-134: a free seat, not an ally or subject, a revolution card with a sign lit; secret. */
export function fundRebels(d: Diplomacy, funder: string, target: string): Funding {
  if (freeSeats(d, funder) <= 0) throw new RuleError("no free seat");
  if (rel.has(d.graph, "alliance", funder, target) || rel.overlord(d.graph, target) === funder) throw new RuleError("not in an ally's or subject's land");
  if (country(d, target).revolutionSigns < FR().needs_revolution_signs) throw new RuleError("no revolution is brewing there");
  d.seq++;
  const e: Envoy = { id: `envoy${d.seq}`, country: funder, person: `Agent of ${funder}`, personKind: "official", type: "", years: 0, action: "fund_rebels", target, status: "court", sent: d.date, arrival: d.date };
  d.envoys.push(e);
  const f: Funding = { funder, target, gold: fundingGold(d, target), envoy: e.id };
  d.fundings.push(f);
  return f;
}

/** DIPL-136: an émigré pretender court is funded under the same rules. */
export function fundEmigreCourt(d: Diplomacy, funder: string, court: string, target: string): Funding {
  if (freeSeats(d, funder) <= 0) throw new RuleError("no free seat");
  const f: Funding = { funder, emigreCourt: court, target, gold: fundingGold(d, target) };
  d.fundings.push(f);
  return f;
}

/** DIPL-135: the flag the revolutions context reads. */
export function revolutionFunded(d: Diplomacy, target: string): boolean {
  return d.fundings.some((f) => f.target === target && !f.caught);
}

/** D-DIPL-22: stopping is free and instant; the target is told nothing (D-DIPL-30). */
export function stopFunding(d: Diplomacy, funder: string, target: string): void {
  for (const f of d.fundings.filter((x) => x.funder === funder && x.target === target)) {
    const e = d.envoys.find((x) => x.id === f.envoy);
    if (e) envoyHome(d, e);
  }
  d.fundings = d.fundings.filter((x) => !(x.funder === funder && x.target === target));
}

/** DIPL-137. */
export function caughtChance(): number {
  return FR().caught_chance_per_month;
}

/** DIPL-138. */
export function fundingCaught(d: Diplomacy, f: Funding): void {
  f.caught = true;
  const e = d.envoys.find((x) => x.id === f.envoy);
  if (e) e.status = "held";
  d.fundings = d.fundings.filter((x) => x !== f);
  addRuleEntry(d, f.target, f.funder, "wrongs", "stirred_revolt_in_our_land");
  timedAim(d, f.target, f.funder, "punish", FR().on_caught.aim_years, "caught funding rebels");
  emit(d, "RebelFundingCaught", { funder: f.funder, to: f.target });
  letter(d, { to: f.funder, from: f.target, action: "fund_rebels", answer: "no", reasons: [], subject: "caught" });
}

/** DIPL-194: the new regime remembers who backed it, unless it is hostile to the funder's form. */
export function revolutionWon(d: Diplomacy, target: string, hostileToForm: (funder: string) => boolean = () => false): void {
  const funders = [...new Set(d.fundings.filter((f) => f.target === target).map((f) => f.funder))];
  for (const f of funders) if (!hostileToForm(f)) addRuleEntry(d, target, f, "ties", "backed_our_revolution");
  d.fundings = d.fundings.filter((f) => f.target !== target);
}

/** Charges each funding and rolls the caught chance (DIPL-137). */
export function fundingMonth(d: Diplomacy, rng?: Rng): void {
  for (const f of [...d.fundings]) {
    country(d, f.funder).gold -= f.gold;
    if (draw(d, rng) < caughtChance()) fundingCaught(d, f);
  }
}

// ---------------------------------------------------------------- leagues

export function leagueThreshold(d: Diplomacy): number {
  return C.leagues.threshold_by_era[eraOf(d)]!;
}

/** Who makes the count Join a league against X (DIPL-157). */
export function leagueCandidates(d: Diplomacy, x: string): string[] {
  if (country(d, x).landsTaken < leagueThreshold(d)) return [];
  const tookFrom = d.taken.filter((t) => t.by === x && monthsBetween(t.date, d.date) < C.lands_taken_years * 12).map((t) => t.province);
  const known = new Set([...Object.keys(d.countries), ...d.borders.flatMap((k) => k.split("|"))]);
  return [...known].filter((c) => {
    if (c === x) return false;
    const near = borders(d, c, x) || tookFrom.some((p) => d.provinces[p]?.borders.includes(c));
    if (!near) return false;
    return !rel.has(d.graph, "alliance", c, x) && rel.overlord(d.graph, c) !== x && rel.overlord(d.graph, x) !== c && !rel.has(d.graph, "at_war", c, x);
  });
}

export function leagueAgainst(d: Diplomacy, x: string) {
  return d.leagues.find((l) => l.target === x);
}

/** DIPL-159, DIPL-164. */
export function formLeague(d: Diplomacy, x: string, yes: string[], origin: "threshold" | "event" = "threshold"): boolean {
  if (origin === "threshold" && yes.length < C.leagues.min_members) return false;
  const l = leagueAgainst(d, x);
  if (l) l.members = [...new Set([...l.members, ...yes])];
  else d.leagues.push({ target: x, members: [...yes], formed: monthOf(d.date), origin });
  emit(d, "LeagueFormed", { target: x, members: yes, name: `League against ${x}` });
  return true;
}

/** The yearly league check (DIPL-157 … DIPL-159). */
export function yearlyLeagueCheck(d: Diplomacy, countFn: (c: string, x: string, members: number) => boolean): void {
  for (const x of Object.keys(d.countries)) {
    const members = leagueAgainst(d, x)?.members.length ?? 0;
    const yes = leagueCandidates(d, x).filter((c) => countFn(c, x, members));
    if (yes.length) formLeague(d, x, yes);
  }
}

/** DIPL-163. */
export function checkLeagueDissolution(d: Diplomacy): void {
  for (const l of [...d.leagues]) {
    if (l.origin === "event") continue; // D-DIPL-25: an event league ends only by event or a peace
    if (country(d, l.target).landsTaken < leagueThreshold(d) * C.leagues.dissolve_below_share_of_threshold) dissolveLeague(d, l.target);
  }
}

export function dissolveLeague(d: Diplomacy, x: string): void {
  d.leagues = d.leagues.filter((l) => l.target !== x);
  emit(d, "LeagueDissolved", { target: x });
}

/** A peace giving provinces back to a member dissolves the league (DIPL-163). */
export function peaceReturnsProvinces(d: Diplomacy, x: string, to: string): void {
  if (leagueAgainst(d, x)?.members.includes(to)) dissolveLeague(d, x);
}

// ---------------------------------------------------------------- events

/** DIPL-172. */
export function eventOpinion(d: Diplomacy, event: string, holder: string, other: string, weight: number, fadeYears?: number): void {
  addEntry(d, holder, other, { key: `event:${event}`, name: event, weight, fadeYears: fadeYears ?? C.event_tree_mapping.opinion.default_fade_years });
}

/** DIPL-173. */
export function trust(d: Diplomacy, c: string): number {
  return Math.max(0, 100 - 10 * oathsBrokenCount(d, c));
}

const oathsBrokenCount = (d: Diplomacy, c: string) => country(d, c).oaths.filter((o) => monthsBetween(o, d.date) < C.oaths_broken_years * 12).length;

export function lowerTrust(d: Diplomacy, c: string): void {
  addOath(d, c, "event");
}

/**
 * DIPL-174: an effect adding notoriety n writes the wrong Notorious deed
 * (-10 × n, fading over 30 years) with every country that knows the actor; it
 * never adds Lands taken. Knowing is read here as sharing a border or a trade pact.
 */
export function eventNotoriety(d: Diplomacy, actor: string, n: number): void {
  const r = entryRule(d, "wrongs", "notorious_deed");
  d.notorietyDeeds.push({ actor, n, date: monthOf(d.date) });
  const seas = country(d, actor).seaZones;
  const bySea = Object.values(d.countries).filter((k) => k.id !== actor && k.seaZones.some((z) => seas.includes(z))).map((k) => k.id);
  const knowers = new Set([...neighbours(d, actor), ...bySea, ...d.graph.facts.filter((f) => f.fact === "trade_agreement" && (f.source === actor || f.target === actor)).map((f) => (f.source === actor ? f.target : f.source))]);
  for (const k of knowers) addEntry(d, k, actor, { key: "notorious_deed", name: r.name, weight: r.weight_per_notoriety! * n, fadeYears: r.fade_years! });
}


/** DIPL-175: an event's relation goes through the matching action and its requirements. */
export function eventRelation(d: Diplomacy, type: string, a: string, b: string, contested?: string): string {
  const action = C.event_tree_mapping.relation[type];
  if (!action) throw new RuleError(`unknown relation ${type}`);
  switch (action) {
    case "form_alliance": rel.formAlliance(d.graph, a, b); break;
    case "swear_peace": swornPeace(d, a, b); break;
    case "set_rival": declareRival(d, a, b, contested); break;
    case "declare_war": declareWar(d, a, b, { scripted: true }); break;
    case "trade_pact": tradePactAgreed(d, a, b); break;
    case "embargo": declareEmbargo(d, a, b); break;
    case "pledge_protection": pledgeProtection(d, a, b); break;
  }
  return action;
}

/** DIPL-176. */
export function eventEffect(d: Diplomacy, effect: string, roles: { holder?: string; target?: string; court?: string; years?: number; aim?: string; name?: string }): void {
  switch (effect) {
    case "war_aim": timedAim(d, roles.holder!, roles.target!, roles.aim ?? "punish", roles.years ?? 1, "event"); break;
    case "league": formLeague(d, roles.target!, roles.holder ? [roles.holder] : [], "event"); break;
    case "pretender": placePretender(d, roles.name ?? "Pretender", roles.target!, roles.court!); break;
    default: throw new RuleError(`unknown effect ${effect}`);
  }
}

// ---------------------------------------------------------------- the month

/** One month of diplomacy (spec section 9), without the AI. */
export function advanceMonth(d: Diplomacy, rng?: Rng): void {
  d.date = addMonths(d.date, 1);
  d.graph.date = d.date;
  lapseAsks(d);
  moveEnvoys(d);
  enforceAllSeats(d);
  fundingMonth(d, rng);
  for (const t of rel.expireTruces(d.graph)) emit(d, "TruceExpired", { pair: [t.source, t.target] });
  d.passages = d.passages.filter((p) => monthOf(d.date) < p.until);
  courtingDefections(d);
  fadeLedgers(d);
  rel.decayHostility(d.graph);
}

/** The month's envoys and ledgers for a game that keeps the date itself: arrivals, answers, homecomings and fading entries. */
export function envoysAndLedgers(d: Diplomacy): void {
  lapseAsks(d);
  moveEnvoys(d);
  enforceAllSeats(d);
  fadeLedgers(d);
}

export function advanceTo(d: Diplomacy, date: string, rng?: Rng): void {
  while (monthOf(d.date) < monthOf(date)) advanceMonth(d, rng);
}

export { daysBetween, strength, standing, multiples };
