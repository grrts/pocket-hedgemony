/**
 * Calendar helpers for diplomacy. Dates are ISO-like strings: "YYYY",
 * "YYYY-MM" or "YYYY-MM-DD", as in the relations dataset. Adding months keeps
 * the precision of the input, so a truce expiring "1446-04-01" moved by 36
 * months expires "1449-04-01".
 */

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

export function parseDate(s: string): Ymd {
  const [y, m, d] = s.split("-");
  return { y: Number(y), m: m ? Number(m) : 1, d: d ? Number(d) : 1 };
}

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

/** Months since year 0, for whole-month arithmetic. */
export function monthIndex(s: string): number {
  const { y, m } = parseDate(s);
  return y * 12 + (m - 1);
}

export function fromMonthIndex(i: number): string {
  return `${pad(Math.floor(i / 12), 4)}-${pad((i % 12) + 1)}`;
}

/** Adds whole months, keeping the day when the input has one. */
export function addMonths(s: string, n: number): string {
  const parts = s.split("-");
  const ym = fromMonthIndex(monthIndex(s) + n);
  return parts.length >= 3 ? `${ym}-${parts[2]}` : ym;
}

/** "YYYY-MM" of any date. */
export function monthOf(s: string): string {
  return fromMonthIndex(monthIndex(s));
}

/** Whole months from a to b (b later is positive), ignoring days. */
export function monthsBetween(a: string, b: string): number {
  return monthIndex(b) - monthIndex(a);
}

function toUtc(s: string): number {
  const { y, m, d } = parseDate(s);
  return Date.UTC(y, m - 1, d);
}

/** Adds calendar days; always returns "YYYY-MM-DD". */
export function addDays(s: string, days: number): string {
  const t = new Date(toUtc(s) + days * 86400000);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/** Earliest day a partial date can mean ("1440s" is 1440-01-01). */
export function dateKey(s: string): string {
  const t = s.endsWith("s") ? s.slice(0, -1) : s;
  const p = [...t.split("-"), "01", "01"];
  return p.slice(0, 3).join("-");
}

/** Latest day a partial date can mean. */
export function dateKeyEnd(s: string): string {
  if (s.endsWith("s")) return `${Number(s.slice(0, 4)) + 9}-12-31`;
  const p = s.split("-");
  if (p.length === 1) return `${p[0]}-12-31`;
  if (p.length === 2) return `${p[0]}-${p[1]}-31`;
  return s;
}

export const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$|^\d{3}0s$/;

/** Compares two dates by their first day: negative when a is earlier. */
export function compareDates(a: string, b: string): number {
  return dateKey(a) < dateKey(b) ? -1 : dateKey(a) > dateKey(b) ? 1 : 0;
}
