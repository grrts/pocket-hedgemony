import type { GameDate } from "@ph/rules";

/**
 * The calendar. A turn is one week (decision X-18) on the real calendar
 * (X-3): months have their real length, with Gregorian leap years applied to
 * every year. Things measured per day, such as marching, use the real days;
 * monthly, seasonal and yearly steps keep their size and run once, at the end
 * of the turn in which a new month, season or year begins.
 */
export const DAYS_PER_TURN = 7;
/** A month's worth of a monthly amount, in days, for things eaten or found per day. */
export const DAYS_PER_RATION_MONTH = 30;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** The date `days` days later. */
export function addDays(date: GameDate, days: number): Required<GameDate> {
  let { year, month } = date;
  let day = (date.day ?? 1) + days;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month = month === 12 ? 1 : month + 1;
    if (month === 1) year++;
  }
  return { year, month, day };
}

/** The month that begins during the turn starting on this date, if one does. */
export function monthBeginning(date: GameDate): number | null {
  const day = date.day ?? 1;
  if (day === 1) return date.month;
  return day + DAYS_PER_TURN - 1 > daysInMonth(date.year, date.month) ? (date.month % 12) + 1 : null;
}

/** Turns a march of `days` days takes from this date, and the day it ends. */
export function turnOfDay(date: GameDate, days: number): { turns: number; date: Required<GameDate> } {
  const whole = Math.max(1, Math.ceil(days - 1e-9));
  return { turns: Math.ceil(whole / DAYS_PER_TURN), date: addDays(date, whole - 1) };
}
