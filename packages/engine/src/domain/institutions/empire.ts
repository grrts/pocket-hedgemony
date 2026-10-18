import config from "../../../../rules/data/domain/institutions.json" with { type: "json" };
import * as dip from "../diplomacy/index.ts";

/**
 * The Empire (INST-001 to INST-034): an office, the Emperor, held by one
 * member's ruler over members who keep their own land; hold says what the
 * office is worth. Seven seats elect the Emperor by the reasons count; the
 * Emperor is called to defend members against outsiders and is paid dues.
 * Pure and deterministic, keyed by realm ids like the diplomacy context;
 * the engine (institutions.ts) feeds it the world's soldiers, faiths and wars.
 */

export const institutionsConfig = config;
const E = config.empire;

/** One gain or loss of hold this year, with its cause (the hold record, INST-003). */
export interface HoldLine {
  cause: string;
  number: number;
}

/** One vote in the election (INST-020): a realm's, a church seat's, or vacant. */
export interface Seat {
  name: string;
  /** The realm that holds it; null for a church seat or a vacant one. */
  realm: string | null;
  church: boolean;
}

export interface Election {
  /** Month (YYYY-MM) the election was called, and the month the seats' votes are counted. */
  called: string;
  ends: string;
  candidates: string[];
  /** Why it was called, in the player's words. */
  why: string;
  /** The player's own seat's choice, if they made one before it ended. */
  playerVote?: string;
}

export interface Empire {
  /** The member whose ruler holds the office, or null once it has ended. */
  holder: string | null;
  /** The Emperor's ruler by name, to see a new ruler and call an election (INST-023). */
  holderRuler: string;
  /** Month the holder's house took the crown. */
  since: string;
  members: string[];
  /** Provinces the members held on 1 January 1444; never changes (INST-011). */
  imperialLand: string[];
  hold: number;
  /** This year's gains and losses so far, and last year's whole record. */
  year: HoldLine[];
  record: HoldLine[];
  seats: Seat[];
  /** Members whose rulers stand for the crown (INST-024). */
  standing: string[];
  election: Election | null;
  /** Month of the last election (the 25-year rule, INST-023). */
  lastElection: string;
  /** The Emperor's open defence calls: the member attacked and the war (INST-030). */
  defence: { member: string; war: string; attacker: string; call: string }[];
  /** Members that left this year (the year's count, INST-033). */
  left: number;
  ended: { date: string; how: string } | null;
}

/** INST-002. */
export function holdWord(hold: number): string {
  for (const w of config.hold.words) if (hold >= w.min) return w.word;
  return "Hollow";
}

export const clampHold = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** The Empire in 1444 (INST-010, INST-011, INST-020): the members on the map, their land, seven seats, Austria's hold 35. */
export function startEmpire(o: { date: string; onMap: (id: string) => boolean; landOf: (id: string) => string[]; rulerOf: (id: string) => string }): Empire {
  const members = E.members_1444.filter(o.onMap);
  const holder = members.includes(E.holder_1444) ? E.holder_1444 : (members[0] ?? null);
  const month = dip.monthOf(o.date);
  return {
    holder,
    holderRuler: holder ? o.rulerOf(holder) : "",
    since: month,
    members,
    imperialLand: members.flatMap(o.landOf),
    hold: E.hold_start,
    year: [],
    record: [],
    seats: E.seats_1444.map((s) => ({ name: s.name, realm: "realm" in s && s.realm && o.onMap(s.realm) && members.includes(s.realm) ? s.realm : null, church: !!("church" in s && s.church) })),
    standing: [],
    election: null,
    lastElection: month,
    defence: [],
    left: 0,
    ended: null,
  };
}

export const isMember = (e: Empire, id: string) => !e.ended && e.members.includes(id);
export const isImperialLand = (e: Empire, province: string) => e.imperialLand.includes(province);
export const seatOf = (e: Empire, id: string) => e.seats.find((s) => s.realm === id) ?? null;
export const vacant = (s: Seat) => !s.church && !s.realm;

/** A member's role in the Empire, as the Institutions row says it (INST-080). */
export function roleOf(e: Empire, id: string): "Emperor" | "Elector" | "Member" | null {
  if (!isMember(e, id)) return null;
  if (e.holder === id) return "Emperor";
  return seatOf(e, id) ? "Elector" : "Member";
}

/** A gain or loss of hold now, kept in this year's record (INST-001, INV-INST-1). */
export function addHold(e: Empire, cause: string, n: number): void {
  if (e.ended || !n) return;
  e.hold = clampHold(e.hold + n);
  e.year.push({ cause, number: n });
}

// ---------------------------------------------------------------- members (INST-012)

/** A member leaves: its seat stands vacant, hold falls at the year's count. */
export function leave(e: Empire, id: string): boolean {
  if (!e.members.includes(id)) return false;
  e.members = e.members.filter((m) => m !== id);
  e.standing = e.standing.filter((m) => m !== id);
  for (const s of e.seats) if (s.realm === id) s.realm = null;
  e.left++;
  return true;
}

/** Why a member must leave now, or null (INST-012): its capital left imperial land, it is an outsider's subject, it ended. */
export function mustLeave(e: Empire, id: string, f: { capital: string; overlord: string | null; gone: boolean }): string | null {
  if (f.gone) return "ended";
  if (!isImperialLand(e, f.capital)) return "its capital left imperial land";
  if (f.overlord && !isMember(e, f.overlord)) return "became the subject of an outsider";
  return null;
}

/** Why the Emperor can't admit this realm, or null (INST-012). */
export function whyNotAdmit(e: Empire, id: string, capital: string): string | null {
  if (e.ended) return "the Empire has ended";
  if (isMember(e, id)) return "already a member";
  if (!isImperialLand(e, capital)) return "its capital is not in imperial land";
  return null;
}

/** The count of a realm asked to join (an envoy ask of the Emperor's, decided by the reasons count). */
export function admitCount(d: dip.Diplomacy, e: Empire, id: string, faithOf: (id: string) => string | null): dip.Count {
  const a = E.admit;
  const emperor = e.holder!;
  const reasons: dip.Reason[] = [{ name: "Base (join the Empire)", number: a.base, own: true, kind: "base" }];
  reasons.push({ name: "Standing / 4", number: dip.quarter(dip.standing(d, id, emperor), a.standing_divisor) });
  if (faithOf(id) && faithOf(id) === faithOf(emperor)) reasons.push({ name: "Same faith as the Emperor", number: a.same_faith });
  if (dip.strength(d, emperor) > dip.strength(d, id)) reasons.push({ name: "The Emperor is stronger", number: a.emperor_stronger });
  const total = reasons.reduce((t, r) => t + r.number, 0);
  return { ask: { action: "join_empire", asker: emperor, asked: id }, reasons, total, yes: total > 0 };
}

export function join(e: Empire, id: string): void {
  if (!e.members.includes(id)) e.members.push(id);
}

// ---------------------------------------------------------------- seats (INST-020 to INST-022)

/** Why the Emperor can't grant this seat to this member, or null (INST-022, INV-INST-3). */
export function whyNotGrant(e: Empire, seat: string, member: string): string | null {
  const s = e.seats.find((x) => x.name === seat);
  if (!s) return "no such seat";
  if (!vacant(s)) return "that seat is not vacant";
  if (!isMember(e, member)) return "not a member of the Empire";
  if (seatOf(e, member)) return "a realm holds at most one seat";
  return null;
}

export function grantSeat(e: Empire, seat: string, member: string): string | null {
  const why = whyNotGrant(e, seat, member);
  if (why) return why;
  e.seats.find((x) => x.name === seat)!.realm = member;
  return null;
}

// ---------------------------------------------------------------- the election (INST-023 to INST-026)

/** What the vote counter reads of the realms. */
export interface Realms {
  soldiers: (id: string) => number;
  faith: (id: string) => string | null;
}

/** The faith a candidate must hold (INST-024): Catholic until Westphalia, then any. */
export const empireFaith = (westphalia: boolean): string | null => (westphalia ? null : E.faith);

/**
 * INST-024: the three members with the most soldiers and every member
 * standing for the crown, of the Empire's faith. The sitting house always
 * stands for its own crown (the AI Emperor's choice, spec §12).
 */
export function candidates(e: Empire, r: Realms, westphalia = false): string[] {
  const faith = empireFaith(westphalia);
  const ok = (m: string) => !faith || r.faith(m) === faith;
  const strongest = e.members.filter(ok).sort((a, b) => r.soldiers(b) - r.soldiers(a) || a.localeCompare(b)).slice(0, E.candidates_by_soldiers);
  const out = [...strongest];
  for (const m of [...(e.holder ? [e.holder] : []), ...e.standing]) if (ok(m) && isMember(e, m) && !out.includes(m)) out.push(m);
  return out;
}

const SOUGHT = "sought_our_vote";

/** The reasons a seat's realm rates a candidate by (INST-025): standing, same faith, the sitting house, strength, Sought our vote, war. */
export function seatReasons(d: dip.Diplomacy, e: Empire, voter: string, candidate: string, r: Realms): dip.Reason[] {
  const v = E.vote;
  const out: dip.Reason[] = [];
  const sought = (d.ledgers[dip.key(voter, candidate)] ?? []).filter((x) => x.key === SOUGHT).reduce((t, x) => t + x.weight, 0);
  if (voter === candidate) out.push({ name: "Our own ruler", number: 100 });
  else out.push({ name: "Standing / 4", number: dip.quarter(dip.standing(d, voter, candidate) - sought, v.standing_divisor) });
  if (r.faith(voter) && r.faith(voter) === r.faith(candidate)) out.push({ name: "Same faith", number: v.same_faith });
  if (e.holder === candidate) out.push({ name: "The sitting house", number: v.sitting_house });
  const cs = r.soldiers(candidate), vs = Math.max(1, r.soldiers(voter));
  if (cs > vs && voter !== candidate) out.push({ name: "A strong crown", number: Math.min(v.strength_max, v.strength_per_multiple * dip.multiples(cs, vs)) });
  if (sought) out.push({ name: "Sought our vote", number: Math.round(sought) });
  if (voter !== candidate && dip.relations.has(d.graph, "at_war", voter, candidate)) out.push({ name: "We are at war with them", number: v.at_war });
  return out;
}

const total = (rs: dip.Reason[]) => rs.reduce((t, x) => t + x.number, 0);

/** How one seat votes today (INST-021, INST-025): its realm's best-rated candidate; a church seat follows the head of the faith. */
export function seatVote(d: dip.Diplomacy, e: Empire, seat: Seat, cands: string[], r: Realms, headOfFaith: string | null): string | null {
  if (!cands.length) return null;
  if (seat.church) {
    if (!headOfFaith) return e.holder && cands.includes(e.holder) ? e.holder : cands[0]!;
    // The candidate the head of the Catholic faith holds the highest standing toward; a tie keeps the sitting house.
    return [...cands].sort((a, b) => dip.standing(d, headOfFaith, b) - dip.standing(d, headOfFaith, a) || (b === e.holder ? 1 : 0) - (a === e.holder ? 1 : 0))[0]!;
  }
  if (!seat.realm) return null;
  let best: string | null = null;
  let most = -Infinity;
  for (const c of cands) {
    const n = total(seatReasons(d, e, seat.realm, c, r)) + (c === e.holder ? 0.5 : 0);
    if (n > most) ((most = n), (best = c));
  }
  return best;
}

/** Each seat's vote today, by seat name (vacant seats don't vote). */
export function votes(d: dip.Diplomacy, e: Empire, cands: string[], r: Realms, headOfFaith: string | null, own?: { realm: string; vote: string }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of e.seats) {
    const v = own && s.realm === own.realm && cands.includes(own.vote) ? own.vote : seatVote(d, e, s, cands, r, headOfFaith);
    if (v) out[s.name] = v;
  }
  return out;
}

/** Votes per candidate, most first. */
export function tally(v: Record<string, string>, cands: string[]): { candidate: string; votes: number }[] {
  return cands.map((c) => ({ candidate: c, votes: Object.values(v).filter((x) => x === c).length })).sort((a, b) => b.votes - a.votes);
}

/** INST-025: most votes win; a tie goes to the sitting house, then to more soldiers. */
export function winner(e: Empire, v: Record<string, string>, cands: string[], r: Realms): string | null {
  const t = tally(v, cands);
  if (!t.length) return e.holder;
  const top = t[0]!.votes;
  const tied = t.filter((x) => x.votes === top).map((x) => x.candidate);
  if (e.holder && tied.includes(e.holder)) return e.holder;
  return tied.sort((a, b) => r.soldiers(b) - r.soldiers(a) || a.localeCompare(b))[0]!;
}

/** Calls an election (INST-023): it sits for a month, then the seats' votes are counted. */
export function callElection(e: Empire, date: string, why: string, r: Realms, westphalia = false): Election | null {
  if (e.ended || e.election) return e.election;
  const called = dip.monthOf(date);
  e.election = { called, ends: dip.addMonths(called, E.election_months), candidates: candidates(e, r, westphalia), why };
  return e.election;
}

/** Ends the election: the winner holds the crown (INST-025). Returns the winner and the votes. */
export function endElection(d: dip.Diplomacy, e: Empire, r: Realms, headOfFaith: string | null, rulerOf: (id: string) => string, player?: string): { winner: string | null; votes: Record<string, string>; changed: boolean } | null {
  const el = e.election;
  if (!el) return null;
  const cands = el.candidates.filter((c) => isMember(e, c));
  const v = votes(d, e, cands, r, headOfFaith, player && el.playerVote ? { realm: player, vote: el.playerVote } : undefined);
  const w = winner(e, v, cands, r);
  const changed = !!w && w !== e.holder;
  if (w) {
    if (changed) e.since = dip.monthOf(d.date);
    e.holder = w;
    e.holderRuler = rulerOf(w);
  }
  e.election = null;
  e.lastElection = dip.monthOf(d.date);
  return { winner: w, votes: v, changed };
}

/** INST-023: an election is due when the Emperor's realm has a new ruler, left or ended, or (without rulers) every 25 years. */
export function electionDue(e: Empire, date: string, rulerOf: (id: string) => string): string | null {
  if (e.ended || e.election) return null;
  if (!e.holder || !isMember(e, e.holder)) return "The Emperor's realm is no longer in the Empire.";
  if (rulerOf(e.holder) && rulerOf(e.holder) !== e.holderRuler) return "The Emperor has died; the seats choose his successor.";
  if (!e.holderRuler && dip.monthsBetween(e.lastElection, dip.monthOf(date)) >= E.election_years_without_rulers * 12) return "Twenty-five years have passed since the last election.";
  return null;
}

export function standForCrown(e: Empire, id: string, on: boolean): string | null {
  if (!isMember(e, id)) return "not a member of the Empire";
  e.standing = e.standing.filter((m) => m !== id);
  if (on) e.standing.push(id);
  return null;
}

/** INST-026: the tie an envoy seeking a seat's vote leaves at its court on arrival. */
export function voteSought(d: dip.Diplomacy, voter: string, asker: string): void {
  dip.addEntry(d, voter, asker, { key: SOUGHT, name: "Sought our vote", weight: E.seek_vote.tie, fadeYears: E.seek_vote.fade_years });
}

// ---------------------------------------------------------------- the Emperor (INST-030 to INST-033)

/** INST-030: the member a war calls the Emperor to defend: a non-member declared war on a member. */
export function defenceNeeded(e: Empire, war: { declarer: string; target: string }): string | null {
  if (e.ended || !e.holder) return null;
  if (!isMember(e, war.target) || isMember(e, war.declarer) || war.target === e.holder) return null;
  return war.target;
}

/** The Emperor answered a defence call: hold, and on a refusal the wrong *Left us to our fate* from the member and every elector (INST-030). */
export function defenceAnswered(d: dip.Diplomacy, e: Empire, member: string, yes: boolean): void {
  const D = E.defence;
  const emperor = e.holder;
  e.defence = e.defence.filter((x) => x.member !== member);
  if (!emperor) return;
  if (yes) return addHold(e, `Defended ${member}`, D.answer);
  addHold(e, `Left ${member} to its fate`, D.refuse);
  const wronged = new Set([member, ...e.seats.map((s) => s.realm).filter((x): x is string => !!x)]);
  wronged.delete(emperor);
  for (const w of wronged) dip.addEntry(d, w, emperor, { key: "left_us_to_our_fate", name: "Left us to our fate", weight: D.wrong, fadeYears: D.wrong_fade_years });
}

/** INST-032: the Emperor's dues this month. */
export const dues = (e: Empire) => (e.ended || !e.holder ? 0 : (e.members.length * E.dues_per_member * e.hold) / 100);

/** What the year's hold count reads of the world (INST-033). */
export interface YearFacts {
  /** Wars between members running now, as pairs. */
  memberWars: [string, string][];
  /** Imperial provinces held (owned or occupied) by a non-member. */
  outsiderProvinces: number;
  /** Members whose faith is not the Emperor's. */
  otherFaith: number;
  augsburg: boolean;
  westphalia: boolean;
}

/** The year's count lines (INST-033). */
export function yearLines(e: Empire, f: YearFacts): HoldLine[] {
  const h = E.hold_year;
  const out: HoldLine[] = [];
  if (!f.memberWars.length && !f.outsiderProvinces) out.push({ cause: "Peace in the Empire", number: h.peace });
  for (const [a, b] of f.memberWars) out.push({ cause: `War between ${a} and ${b}`, number: h.member_war });
  if (f.outsiderProvinces) out.push({ cause: `Imperial land held by outsiders (${f.outsiderProvinces} province${f.outsiderProvinces === 1 ? "" : "s"})`, number: Math.max(h.outsider_max, h.outsider_province * f.outsiderProvinces) });
  if (e.left) out.push({ cause: `Members who left (${e.left})`, number: h.member_left * e.left });
  if (f.otherFaith && !f.westphalia) {
    const n = Math.round(h.other_faith * f.otherFaith * (f.augsburg ? h.augsburg_factor : 1));
    if (n) out.push({ cause: `Members of another faith (${f.otherFaith})`, number: n });
  }
  return out;
}

/** INST-003: in January the year's count is added, the record kept and hold clamped. */
export function countYear(e: Empire, lines: HoldLine[]): void {
  if (e.ended) return;
  e.hold = clampHold(e.hold + lines.reduce((t, l) => t + l.number, 0));
  e.record = [...e.year.filter((l) => l.number), ...lines];
  e.year = [];
  e.left = 0;
}

/** INST-031: who holds imperial land and is not a member, with how many provinces. */
export function outsiders(e: Empire, holderOf: (province: string) => string | null): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (e.ended) return out;
  for (const p of e.imperialLand) {
    const h = holderOf(p);
    if (h && !isMember(e, h)) out.set(h, [...(out.get(h) ?? []), p]);
  }
  return out;
}
