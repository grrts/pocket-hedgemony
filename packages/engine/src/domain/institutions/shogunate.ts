import config from "../../../../rules/data/domain/institutions.json" with { type: "json" };
import * as dip from "../diplomacy/index.ts";
import { clampHold, holdWord, type HoldLine } from "./empire.ts";

/**
 * The Shogunate (INST-060 to INST-069): an office, the Shogun, held by the
 * realm with the shogunate form whose capital is the Court's province. While
 * Japan is whole its members are the shogun's great houses (lords); once it
 * has broken they are the warlord domains on Japan's land. Hold says what the
 * office is worth. Pure and deterministic; the engine (shogunate.ts) feeds it
 * the world's lords, heirs, wars and soldiers.
 */

export const S = config.shogunate;

export interface Shogunate {
  /** The shogun's realm, null while the office is vacant (INST-066). */
  holder: string | null;
  since: string;
  hold: number;
  /** Japan's land provinces, by id: the shogun's realm's in 1444. */
  land: string[];
  year: HoldLine[];
  record: HoldLine[];
  /** Houses (lords, by index) summoned to the capital (INST-063). */
  summoned: number[];
  /** Houses whose land a ruler confirmed, and which ruler (INST-064). */
  confirmed: { lord: number; ruler: string }[];
  /** The realm each sworn house was before it swore, so it wakes as itself at the next break (INST-067). */
  sworn: { lord: number; realm: string }[];
  /** The last break, or null (INST-065). */
  broke: string | null;
  /** Oaths asked of the player's realm and the day the asking lapses (INST-067, INST-083). */
  oaths: { realm: string; ends: string }[];
  /** The closed country and its one port, or null (INST-068). */
  closed: { port: string; since: string } | null;
  /** The ports were forced open (by `perry_expedition`), for the restoration (INST-069). */
  forcedOpen: boolean;
  ended: { date: string; how: string } | null;
}

export function startShogunate(holder: string, land: string[], date: string): Shogunate {
  return { holder, since: date, hold: S.hold_start, land, year: [], record: [], summoned: [], confirmed: [], sworn: [], broke: null, oaths: [], closed: null, forcedOpen: false, ended: null };
}

const firm = (hold: number) => holdWord(hold) === "Firm" || holdWord(hold) === "Strong";

/** INST-062: the step *The shogun's hold* gives each house a season: +1 at Firm or Strong, none at Weak, −1 at Hollow. */
export function holdStep(hold: number): 1 | 0 | -1 {
  const w = holdWord(hold);
  return w === "Strong" || w === "Firm" ? 1 : w === "Hollow" ? -1 : 0;
}

export interface ShogunYearFacts {
  /** Houses In revolt, by name. */
  revolts: string[];
  noAdultHeir: boolean;
  /** At war while over half his houses are Wavering or worse. */
  unhappyWar: boolean;
}

/** INST-061, INST-068: the year's hold lines. */
export function shogunYearLines(s: Shogunate, f: ShogunYearFacts): HoldLine[] {
  const h = S.hold_year;
  const out: HoldLine[] = [];
  if (!f.revolts.length) out.push({ cause: "No house in revolt", number: h.no_revolt });
  for (const r of f.revolts) out.push({ cause: `${r} in revolt`, number: h.per_revolt });
  if (f.noAdultHeir) out.push({ cause: "No adult heir", number: h.no_heir });
  if (f.unhappyWar) out.push({ cause: "At war with over half the houses Wavering or worse", number: h.unhappy_war });
  if (s.summoned.length) out.push({ cause: `Houses at the capital (${s.summoned.length})`, number: h.summoned * s.summoned.length });
  if (s.closed) out.push({ cause: "The closed country", number: S.closed_country.hold_per_year });
  return out;
}

export function countShogunYear(s: Shogunate, lines: HoldLine[]): void {
  s.hold = clampHold(s.hold + lines.reduce((t, l) => t + l.number, 0));
  s.record = [...s.year.filter((l) => l.number), ...lines];
  s.year = [];
}

/** A change of hold during the year, kept for the record. */
export function moveShogunHold(s: Shogunate, cause: string, number: number): void {
  s.hold = clampHold(s.hold + number);
  s.year.push({ cause, number });
}

/** INST-063: why the shogun can't summon this house now, or null. */
export function whyNotSummon(s: Shogunate, lord: number): string | null {
  if (!firm(s.hold)) return "only while hold is Firm or better";
  if (s.summoned.includes(lord)) return "already at the capital";
  return null;
}

/** INST-063: the summons end once hold falls below Firm. */
export function summonsLapse(s: Shogunate): boolean {
  if (firm(s.hold) || !s.summoned.length) return false;
  s.summoned = [];
  return true;
}

/** INST-064: why this ruler can't confirm the house's land, or null. */
export function whyNotConfirm(s: Shogunate, lord: number, ruler: string): string | null {
  if (s.confirmed.some((c) => c.lord === lord && c.ruler === ruler)) return "already confirmed by this ruler";
  if (s.hold < S.confirm_cost) return `hold below ${S.confirm_cost}`;
  return null;
}

export interface CourtFacts {
  /** A warlord domain with its capital in Japan (a member while the office is vacant). */
  member: boolean;
  holdsCourt: boolean;
  /** Japan's land provinces it owns or holds as subjects. */
  landHeld: number;
}

/** INST-066: why the realm can't ask the Court now, or null. */
export function whyNotAskCourt(s: Shogunate, f: CourtFacts): string | null {
  if (s.ended) return "the Shogunate has ended";
  if (s.holder) return "the office is held";
  if (!f.member) return "only a warlord domain of Japan";
  if (!f.holdsCourt) return "you must hold the Court's province";
  if (f.landHeld * 2 <= s.land.length) return `you hold ${f.landHeld} of Japan's ${s.land.length} provinces; over half are needed`;
  return null;
}

/** INST-066: the Court appoints the realm; hold starts afresh. */
export function appoint(s: Shogunate, realm: string, date: string): void {
  s.holder = realm;
  s.since = date;
  s.hold = S.appointed_hold;
  s.year = [];
  s.summoned = [];
}

/** INST-065: the office falls vacant; summons and the closed country end with it. */
export function breakOffice(s: Shogunate, date: string): void {
  s.holder = null;
  s.broke = date;
  s.summoned = [];
  s.confirmed = [];
  s.closed = null;
  s.oaths = [];
}

/** INST-067: the reasons count of a member asked to swear to the shogun: his soldiers against its own, hold and standing. */
export function oathCount(d: dip.Diplomacy, s: Shogunate, realm: string, soldiers: (id: string) => number): dip.Count {
  const o = S.oath;
  const shogun = s.holder!;
  const reasons: dip.Reason[] = [{ name: "Base (keep our own realm)", number: o.base, own: true, kind: "base" }];
  reasons.push({ name: "Standing / 4", number: dip.quarter(dip.standing(d, realm, shogun), o.standing_divisor) });
  const his = soldiers(shogun), ours = Math.max(1, soldiers(realm));
  if (his > ours) reasons.push({ name: "The shogun is stronger", number: Math.min(o.stronger_max, o.stronger_per_multiple * dip.multiples(his, ours)) });
  reasons.push({ name: "The shogun's hold", number: Math.round((s.hold - 50) / o.hold_divisor) });
  const total = reasons.reduce((t, r) => t + r.number, 0);
  return { ask: { action: "swear_to_shogun", asker: shogun, asked: realm }, reasons, total, yes: total > 0 };
}

/** INST-068: why the shogun can't close the country now, or null. */
export function whyNotClose(d: dip.Diplomacy, s: Shogunate): string | null {
  if (!dip.eraAtLeast(d, S.closed_country.min_era)) return `only from era ${S.closed_country.min_era}`;
  if (!firm(s.hold)) return "only while hold is Firm or better";
  if (s.closed) return "the country is closed already";
  if (s.forcedOpen) return "the ports were forced open";
  return null;
}

/** INST-069: the Shogunate has ended. */
export function endShogunate(s: Shogunate, date: string, how: string): void {
  breakOffice(s, date);
  s.broke = null;
  s.ended = { date, how };
}

/** INST-069: from era V, while hold is Weak or Hollow and the ports were forced open, the restoration for the Court may open. */
export function restorationOpen(d: dip.Diplomacy, s: Shogunate): boolean {
  return !s.ended && !!s.holder && dip.eraAtLeast(d, S.restoration_min_era) && !firm(s.hold) && s.forcedOpen;
}
