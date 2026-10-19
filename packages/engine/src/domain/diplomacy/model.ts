import { Rng } from "../../rng.ts";
import { addMonths, monthOf, monthsBetween } from "./dates.ts";
import { config, dataset1444, type EntryRule } from "./rules.ts";
import { alliesOf, createGraph, enemiesOf, hasFact, overlord, stance, stateOf, storedStance, storedStancesOf, type FactRecord, type RelationGraph, type RelationRecord } from "./relations.ts";

/** A lord of a realm, as far as diplomacy needs him (realm owns lords). */
export interface Lord {
  name: string;
  country: string;
  loyalty: string;
  provinces: string[];
  warlike?: boolean;
  wantsWarWith?: string;
  wants?: string[];
  away?: boolean;
}

/** An official (realm owns officials); an envoy is one of them sent abroad (DIPL-047). */
export interface Official {
  name: string;
  type: string;
  province?: string;
  yearsServed: number;
}

/** What diplomacy reads of a country (stats owned by realm, research, religion, culture, government). */
export interface Country {
  id: string;
  soldiers: number;
  gold: number;
  goldToSpare: boolean;
  provinces: number;
  inventions: string[];
  faith?: string;
  cultureGroup?: string;
  culture?: string;
  acceptedCultures: string[];
  posture: string;
  negotiation: string;
  traits: string[];
  regency: boolean;
  unmarriedChildren: number;
  people: number;
  noOfficials: boolean;
  officials: Official[];
  extraSeats: number;
  /** Extra officials at court ready to go abroad as envoys, from the catalogue's diplomatic influence (REALM-130). */
  courtEnvoys?: number;
  landsTaken: number;
  /** Dates of Oaths broken (realm keeps the stat; diplomacy reports them). */
  oaths: string[];
  castles: number;
  armiesAway: boolean;
  peaceVoicesForPeace: number;
  capital?: string;
  form?: string;
  ai: boolean;
  /** Gold the realm earns in a year (economy supplies it); funding costs 1 % of the target's a month. */
  yearlyIncome: number;
  /** Signs lit on the realm's most advanced revolution card (revolutions supplies it). */
  revolutionSigns: number;
  /** Sea zones the realm's coast touches (map supplies them). */
  seaZones: string[];
  /** The neighbours the realm is Wary or Threatened of this month, most feared first (DIPL-228); measured again each month, never a lasting tie. */
  fears?: Fear[];
}

/** Fear of a much stronger neighbour (DIPL-228): who, how much, and its strength over the realm's side's. */
export interface Fear {
  of: string;
  level: "wary" | "threatened";
  ratio: number;
}

export interface Province {
  id: string;
  owner: string;
  culture?: string;
  capital?: boolean;
  persecution?: boolean;
  /** The culture whose homeland this is, if any. */
  homelandOf?: string;
  /** Countries this province borders. */
  borders: string[];
  /** Who runs it: an official type, or "lord". */
  runBy?: string;
  official?: string;
  grievances: { name: string; until?: string }[];
  /** Past owners with the date their rule ended. */
  history: { owner: string; until: string }[];
}

export interface LedgerEntry {
  key: string;
  name: string;
  weight: number;
  base: number;
  created: string;
  fadeYears?: number;
  /** For entries that last while something holds. */
  condition?: string;
}

export interface Envoy {
  id: string;
  country: string;
  person: string;
  personKind: "official" | "lord";
  type: string;
  years: number;
  province?: string;
  action: string;
  target: string;
  status: "road" | "court" | "resident" | "held" | "returning" | "home" | "failed";
  sent: string;
  arrival: string;
  leaveCourt?: string;
  returnDate?: string;
  residentSince?: string;
  residentSeasons?: number;
  ask?: Ask;
  instant?: boolean;
  missionMonths?: number;
}

/** An ask waiting at the player's court for their own answer, until the month the envoy leaves (DIPL-211). */
export interface PendingAsk {
  id: string;
  envoy: string;
  ask: Ask;
  arrived: string;
  until: string;
}

/** An ask carried to another country, decided by the reasons count. */
export interface Ask {
  action: string;
  asker: string;
  asked: string;
  envoy?: { type: string; years: number };
  gift?: number;
  against?: string[];
  demandKind?: string;
  province?: string;
  passageTarget?: string;
  callKind?: "defensive" | "offensive";
  callTarget?: string;
  /** A tie the mission leaves at the court it reaches (Seek their vote, institutions INST-026). */
  tie?: { key: string; name: string; weight: number; fadeYears: number };
}

export interface Reason {
  name: string;
  number: number;
  own?: boolean;
  kind?: "posture" | "negotiation" | "trait" | "envoy" | "base";
}

export interface Count {
  ask: Ask;
  reasons: Reason[];
  total: number;
  yes: boolean;
}

export interface Letter {
  to: string;
  from: string;
  action: string;
  answer: "yes" | "no" | "done";
  reasons: Reason[];
  total?: number;
  given: string;
  deliverOn: string;
  subject?: string;
}

export interface Call {
  id: string;
  caller: string;
  called: string;
  against: string;
  kind: "defensive" | "offensive";
  via: "alliance" | "pledge" | "league" | "subject" | "empire";
  war: string;
  issued: string;
  answerOn: string;
  answer?: "yes" | "no";
  automatic?: boolean;
}

export interface War {
  id: string;
  attackers: string[];
  defenders: string[];
  aim: string;
  declarer: string;
  target: string;
  start: string;
  provokedBy?: string;
  startedBy: string;
  /** Men each side has lost in this war's battles, for the peace settlement (WAR-234). */
  menLost?: { attackers: number; defenders: number };
  /** Countries that have surrendered in this war: the victor may ask its full settlement (WAR-240). */
  surrendered?: string[];
}

export interface WarAim {
  holder: string;
  target: string;
  aim: string;
  province?: string;
  until?: string;
  source: string;
}

export interface League {
  target: string;
  members: string[];
  formed: string;
  origin: "threshold" | "event";
}

export interface Pretender {
  name: string;
  throne: string;
  court: string;
  heir?: string;
  claims: string[];
}

export interface Funding {
  funder: string;
  emigreCourt?: string;
  target: string;
  gold: number;
  envoy?: string;
  caught?: boolean;
}

export interface Courting {
  by: string;
  lord: string;
  since: string;
  countered?: boolean;
  envoy?: string;
}

export interface DomainEvent {
  type: string;
  date: string;
  to?: string;
  [k: string]: unknown;
}

/** One land or sea leg of an envoy's route (world-map and naval supply these). */
export type RouteLeg = { kind: "land"; units: number; crosses?: string[] } | { kind: "sea"; days: number };

export interface Route {
  land?: RouteLeg[];
  sea?: RouteLeg[];
}

/** The diplomacy state of a game. */
export interface Diplomacy {
  date: string;
  graph: RelationGraph;
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  lords: Lord[];
  borders: string[];
  ledgers: Record<string, LedgerEntry[]>;
  standingOverride: Record<string, number>;
  envoys: Envoy[];
  letters: Letter[];
  calls: Call[];
  wars: War[];
  aims: WarAim[];
  leagues: League[];
  passages: { granter: string; grantee: string; until: string }[];
  /** Passage refused or revoked: blocks the asker's envoys until `until` (D-DIPL-21). */
  passageDenied: { by: string; to: string; until: string }[];
  /** Subjects that asked a country for help against their overlord (DIPL-143). */
  helpAsked: { subject: string; helper: string }[];
  /** Notoriety added by events, fading like Notorious deeds (D-DIPL-26). */
  notorietyDeeds: { actor: string; n: number; date: string }[];
  embargoes: { by: string; on: string }[];
  marriages: { a: string; b: string }[];
  marriageForbidden: string[];
  pretenders: Pretender[];
  fundings: Funding[];
  courtings: Courting[];
  events: DomainEvent[];
  flags: string[];
  trespasses: { intruder: string; owner: string; month: string }[];
  plannedWars: { by: string; on: string; month: string }[];
  refusedDemands: { asker: string; asked: string; kind: string; province?: string; date: string }[];
  /** Asks waiting for the player's answer (DIPL-211); missing in saves made before it. */
  asks?: PendingAsk[];
  defections: { from: string; to: string; provinces: string[] }[];
  taken: { by: string; from: string; province: string; date: string }[];
  statelessCultures: string[];
  faithHostility: Record<string, number>;
  revolutionRows: { country: string; name: string; number: number; againstForm: string; until?: string }[];
  mobilisationPacts: string[];
  routes: Record<string, Route>;
  defaultRoute?: Route;
  era?: string;
  player?: string;
  rng: number[];
  seq: number;
}

export const key = (a: string, b: string) => `${a}>${b}`;
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function createDiplomacy(date: string, seed = 1): Diplomacy {
  return {
    date,
    graph: createGraph(date),
    countries: {},
    provinces: {},
    lords: [],
    borders: [],
    ledgers: {},
    standingOverride: {},
    envoys: [],
    letters: [],
    calls: [],
    wars: [],
    aims: [],
    leagues: [],
    passages: [],
    passageDenied: [],
    helpAsked: [],
    notorietyDeeds: [],
    embargoes: [],
    marriages: [],
    marriageForbidden: [],
    pretenders: [],
    fundings: [],
    courtings: [],
    events: [],
    flags: [],
    trespasses: [],
    plannedWars: [],
    refusedDemands: [],
    asks: [],
    defections: [],
    taken: [],
    statelessCultures: [],
    faithHostility: {},
    revolutionRows: [],
    mobilisationPacts: [],
    routes: {},
    rng: [...new Rng(seed).state],
    seq: 0,
  };
}

/** A game state on the 1444 dataset (DIPL-020): the dataset itself is only read. */
export function createFromDataset(date = config.relations.reference_date): Diplomacy {
  const d = createDiplomacy(date);
  d.graph = createGraph(date, dataset1444.relations as unknown as RelationRecord[], dataset1444.facts as unknown as FactRecord[]);
  return d;
}

/** The country record, created with neutral defaults the first time it is read. */
export function country(d: Diplomacy, id: string): Country {
  let c = d.countries[id];
  if (!c) {
    c = {
      id,
      soldiers: 0,
      gold: 0,
      goldToSpare: false,
      provinces: 1,
      inventions: [],
      acceptedCultures: [],
      posture: "mixed",
      negotiation: "unknown",
      traits: [],
      regency: false,
      unmarriedChildren: 0,
      people: 0,
      noOfficials: false,
      officials: [],
      extraSeats: 0,
      courtEnvoys: 0,
      landsTaken: 0,
      oaths: [],
      castles: 0,
      armiesAway: false,
      peaceVoicesForPeace: 0,
      ai: true,
      yearlyIncome: 0,
      revolutionSigns: 0,
      seaZones: [],
    };
    d.countries[id] = c;
  }
  return c;
}

export function province(d: Diplomacy, id: string, owner?: string): Province {
  let p = d.provinces[id];
  if (!p) {
    p = { id, owner: owner ?? "", borders: [], grievances: [], history: [] };
    d.provinces[id] = p;
  }
  if (owner !== undefined) p.owner = owner;
  return p;
}

/** Draws with the game's own Rng, keeping its state in the diplomacy state. */
export function draw(d: Diplomacy, rng?: Rng): number {
  if (rng) return rng.next();
  const r = new Rng(Uint32Array.from(d.rng));
  const x = r.next();
  d.rng = [...r.state];
  return x;
}

export function emit(d: Diplomacy, type: string, payload: Record<string, unknown> = {}): DomainEvent {
  const e: DomainEvent = { type, date: d.date, ...payload };
  d.events.push(e);
  return e;
}

export function setBorder(d: Diplomacy, a: string, b: string): void {
  const k = pairKey(a, b);
  const index = bordersOf(d);
  if (index.set.has(k)) return;
  d.borders.push(k);
  // Keep the index in step, so adding many borders stays linear.
  const hit = borderIndex.get(d.borders)!;
  hit.n = d.borders.length;
  hit.set.add(k);
  const [x, y] = k.split("|") as [string, string];
  (hit.by.get(x) ?? hit.by.set(x, []).get(x)!).push(y === undefined ? x : y);
  if (y !== undefined && y !== x) (hit.by.get(y) ?? hit.by.set(y, []).get(y)!).push(x);
}

/** The border list as a set and by country, rebuilt when the list changes (borders are only added). */
const borderIndex = new WeakMap<string[], { n: number; set: Set<string>; by: Map<string, string[]> }>();
function bordersOf(d: Diplomacy): { set: Set<string>; by: Map<string, string[]> } {
  let hit = borderIndex.get(d.borders);
  if (!hit || hit.n !== d.borders.length) {
    const by = new Map<string, string[]>();
    for (const k of d.borders) {
      const [a, b] = k.split("|") as [string, string];
      (by.get(a) ?? by.set(a, []).get(a)!).push(b === undefined ? a : b);
      if (b !== undefined && b !== a) (by.get(b) ?? by.set(b, []).get(b)!).push(a);
    }
    hit = { n: d.borders.length, set: new Set(d.borders), by };
    borderIndex.set(d.borders, hit);
  }
  return hit;
}

export function borders(d: Diplomacy, a: string, b: string): boolean {
  return bordersOf(d).set.has(pairKey(a, b));
}

export function neighbours(d: Diplomacy, c: string): string[] {
  return [...(bordersOf(d).by.get(c) ?? [])];
}

/** Soldiers under arms with allies who would come at half (DIPL-085). */
export function strength(d: Diplomacy, c: string): number {
  const own = country(d, c).soldiers;
  const allies = alliesOf(d.graph, c).reduce((s, a) => s + country(d, a).soldiers, 0);
  return own + allies * config.reasons.strength.allies_counted_at;
}

/** Oaths broken in the last 30 years (DIPL-078). */
export function oathsBroken(d: Diplomacy, c: string): number {
  return country(d, c).oaths.filter((o) => monthsBetween(o, d.date) < config.oaths_broken_years * 12).length;
}

export function addOath(d: Diplomacy, c: string, reason: string): void {
  country(d, c).oaths.push(monthOf(d.date));
  emit(d, "OathBroken", { country: c, reason });
}

// ---------------------------------------------------------------- eras

export const ERAS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export function eraOf(d: Diplomacy): string {
  if (d.era) return d.era;
  const y = Number(d.date.slice(0, 4));
  let era = "I";
  for (const e of config.eras_by_year) if (y >= e.from) era = e.era;
  return era;
}

export function eraAtLeast(d: Diplomacy, era: string): boolean {
  return ERAS.indexOf(eraOf(d)) >= ERAS.indexOf(era);
}

/** A tie or wrong rule with the era rows applied (DIPL-167, DIPL-170). */
export function entryRule(d: Diplomacy, kind: "ties" | "wrongs", id: string): EntryRule {
  let r: EntryRule = { ...(config.ledger[kind][id] as EntryRule) };
  if (kind === "ties") {
    // The eras up to the current one, read once (eraAtLeast for each).
    const now = ERAS.indexOf(eraOf(d));
    for (let i = 0; i <= now; i++) {
      const over = config.eras[ERAS[i]!]?.ties?.[id];
      if (over) r = { ...r, ...over };
    }
  }
  return r;
}

// ---------------------------------------------------------------- ledger

/** Adds a stored tie or wrong to holder's ledger toward other; merges into Old matters past the cap (DIPL-076). */
export function addEntry(d: Diplomacy, holder: string, other: string, e: Omit<LedgerEntry, "created" | "base"> & { base?: number }): LedgerEntry {
  const list = (d.ledgers[key(holder, other)] ??= []);
  const entry: LedgerEntry = { ...e, base: e.base ?? e.weight, created: monthOf(d.date) };
  list.push(entry);
  const max = config.ledger.max_entries_per_pair;
  while (list.length > max) {
    // D-DIPL-19: the two smallest by size merge; Old matters keeps the sum and does not fade.
    list.sort((x, y) => Math.abs(x.weight) - Math.abs(y.weight));
    const [a, b] = list.splice(0, 2) as [LedgerEntry, LedgerEntry];
    const merged: LedgerEntry = { key: "old_matters", name: config.ledger.merged_entry_name, weight: a.weight + b.weight, base: a.weight + b.weight, created: monthOf(d.date) };
    list.push(merged);
  }
  emit(d, "LedgerEntryAdded", { holder, other, entry: entry.name });
  return entry;
}

/** Adds a tie or wrong from the config tables by id. */
export function addRuleEntry(d: Diplomacy, holder: string, other: string, kind: "ties" | "wrongs", id: string, weight?: number, name?: string): LedgerEntry {
  const r = entryRule(d, kind, id);
  const w = weight ?? r.weight ?? 0;
  const e: Omit<LedgerEntry, "created" | "base"> = { key: id, name: name ?? r.name, weight: w };
  if (r.fade_years !== undefined) e.fadeYears = r.fade_years;
  return addEntry(d, holder, other, e);
}

export function removeEntries(d: Diplomacy, holder: string, other: string, entryKey: string): void {
  const list = d.ledgers[key(holder, other)];
  if (list) d.ledgers[key(holder, other)] = list.filter((e) => e.key !== entryKey);
}

/** Fade in equal yearly steps, recomputed once a year on each entry's anniversary (DIPL-075, DIPL-190). */
export function fadeLedgers(d: Diplomacy): void {
  for (const [k, list] of Object.entries(d.ledgers)) {
    d.ledgers[k] = list.filter((e) => {
      if (e.fadeYears === undefined) return true;
      const months = monthsBetween(e.created, d.date);
      if (months <= 0 || months % 12 !== 0) return true;
      const years = months / 12;
      if (years >= e.fadeYears) return false;
      e.weight = e.base * (1 - years / e.fadeYears);
      return true;
    });
  }
}

function tieWhile(d: Diplomacy, id: string, weight: number, condition: string, name?: string): LedgerEntry {
  const r = entryRule(d, "ties", id);
  return { key: id, name: name ?? r.name, weight, base: weight, created: monthOf(d.date), condition };
}

function wrongWhile(d: Diplomacy, id: string, weight: number, condition: string): LedgerEntry {
  const r = entryRule(d, "wrongs", id);
  return { key: id, name: r.name, weight, base: weight, created: monthOf(d.date), condition };
}

export function marriagesBetween(d: Diplomacy, a: string, b: string): number {
  const k = pairKey(a, b);
  let n = 0;
  for (const m of d.marriages) if (pairKey(m.a, m.b) === k) n++;
  return n;
}

/** Ties and wrongs that hold while something is true, read from the world each time. */
export function conditionalEntries(d: Diplomacy, holder: string, other: string): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  const h = country(d, holder), o = country(d, other);
  const n = marriagesBetween(d, holder, other);
  if (n > 0) {
    const r = entryRule(d, "ties", "married_houses");
    out.push(tieWhile(d, "married_houses", Math.min(n * r.weight!, r.max!), "marriage"));
  }
  // A third country both hold a stored Rival or Hostile stance toward (one pass each, not one per country).
  const foe = (s: string | undefined) => s === "rival" || s === "hostile";
  let theirs: Map<string, string> | undefined;
  let shared = false;
  // Other's stances are read only once holder has a foe to share.
  for (const [c, s] of storedStancesOf(d.graph, holder)) if (c !== holder && c !== other && foe(s) && foe((theirs ??= storedStancesOf(d.graph, other)).get(c))) shared = true;
  if (shared) out.push(tieWhile(d, "share_a_rival", entryRule(d, "ties", "share_a_rival").weight!, "true"));
  if (h.faith && h.faith === o.faith) out.push(tieWhile(d, "same_faith", entryRule(d, "ties", "same_faith").weight!, "true"));
  if (h.cultureGroup && h.cultureGroup === o.cultureGroup) out.push(tieWhile(d, "same_culture_group", entryRule(d, "ties", "same_culture_group").weight!, "true"));
  if (hasFact(d.graph, "trade_agreement", holder, other)) out.push(tieWhile(d, "trade_pact", entryRule(d, "ties", "trade_pact").weight!, "in_force"));
  if (hasFact(d.graph, "protection_pledge", other, holder, true)) out.push(tieWhile(d, "pledged_to_protect_us", entryRule(d, "ties", "pledged_to_protect_us").weight!, "in_force"));
  const res = d.envoys.find((e) => e.status === "resident" && e.country === other && e.target === holder);
  if (res) {
    const r = entryRule(d, "ties", "resident_envoy");
    out.push(tieWhile(d, "resident_envoy", Math.min((res.residentSeasons ?? 0) * r.weight_per_season!, r.max!), "resident"));
  }
  if (hasFact(d.graph, "dynastic_claim", other, holder, true) || hasFact(d.graph, "territorial_claim", other, holder, true)) {
    out.push(wrongWhile(d, "holds_claim_on_us", entryRule(d, "wrongs", "holds_claim_on_us").weight!, "claim"));
  }
  if (d.embargoes.some((e) => e.by === other && e.on === holder)) out.push(wrongWhile(d, "embargo_against_us", entryRule(d, "wrongs", "embargo_against_us").weight!, "in_force"));
  const hostility = d.faithHostility[pairKey(holder, other)];
  if (hostility !== undefined) {
    const [lo, hi] = entryRule(d, "wrongs", "hostile_faith").weight_range!;
    out.push(wrongWhile(d, "hostile_faith", Math.min(hi, Math.max(lo, hostility)), "true"));
  }
  return out;
}

/** Every entry of holder's ledger toward other: stored ones and those that hold while true. */
export function ledgerOf(d: Diplomacy, holder: string, other: string): LedgerEntry[] {
  return [...(d.ledgers[key(holder, other)] ?? []), ...conditionalEntries(d, holder, other)];
}

/**
 * The stance and state as one ledger line (DIPL-072): the pair's relation that
 * comes first in the precedence order, among the state and holder's stance.
 */
export function relationLine(d: Diplomacy, holder: string, other: string): { relation: string; weight: number } {
  const lines = config.ledger.stance_lines;
  const order = config.relations.precedence.order;
  // The state wins a tie in precedence, as the stable sort of [state, stance] had it.
  const st = stateOf(d.graph, holder, other);
  const sn = stance(d.graph, holder, other);
  const a = st && st in lines ? st : null;
  const b = sn && sn in lines ? sn : null;
  const relation = (a !== null && b !== null ? (order.indexOf(b) < order.indexOf(a) ? b : a) : a ?? b) ?? config.relations.default_stance;
  return { relation, weight: lines[relation] ?? 0 };
}

/** Standing of holder toward other: the ledger total, the event tree's `opinion` (DIPL-071). */
export function standing(d: Diplomacy, holder: string, other: string, ledger?: readonly LedgerEntry[], line?: { weight: number }): number {
  const o = d.standingOverride[key(holder, other)];
  if (o !== undefined) return o;
  // Summed in ledgerOf's order without building its array.
  let n = 0;
  if (ledger) for (const e of ledger) n += e.weight;
  else {
    for (const e of d.ledgers[key(holder, other)] ?? []) n += e.weight;
    for (const e of conditionalEntries(d, holder, other)) n += e.weight;
  }
  n += (line ?? relationLine(d, holder, other)).weight;
  const cap = config.ledger.standing_limit;
  return Math.max(-cap, Math.min(cap, n));
}

/** D-DIPL-26: 5 × Lands taken + event notoriety still unfaded (30 years), capped at 100 (DIPL-174). */
export function notoriety(d: Diplomacy, c: string): number {
  const fade = entryRule(d, "wrongs", "notorious_deed").fade_years! * 12;
  let deeds = 0;
  for (const x of d.notorietyDeeds) if (x.actor === c) deeds += x.n * Math.max(0, 1 - monthsBetween(x.date, d.date) / fade);
  return Math.min(config.event_tree_mapping.notoriety.cap, Math.round(5 * country(d, c).landsTaken + deeds));
}

/** Reason points for a country's notoriety: 1 per 5 (DIPL-223). */
export function notorietyPoints(d: Diplomacy, c: string): number {
  return Math.floor(notoriety(d, c) / config.ai.notoriety_per_reason);
}

/** DIPL-077. */
export function standingWord(n: number): string {
  for (const w of config.ledger.standing_words) if (n >= w.min) return w.word[0]!.toUpperCase() + w.word.slice(1);
  return "Bitter";
}

/** A ledger exists only for pairs that have dealt with each other (DIPL-190). */
export function hasLedger(d: Diplomacy, a: string, b: string): boolean {
  return (d.ledgers[key(a, b)]?.length ?? 0) > 0 || (d.ledgers[key(b, a)]?.length ?? 0) > 0;
}

export { addMonths, enemiesOf, overlord };
