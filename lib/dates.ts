/** Helpers for calendar months. Months are 1-based (1 = January). */

export const APP_TIMEZONE = "Asia/Jerusalem";

export function assertValidMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError(`Invalid year: ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${month}`);
  }
}

/**
 * Half-open UTC range [start, end) covering a calendar month. Ledger dates are
 * stored as Postgres DATE values, which Prisma maps to UTC midnight.
 */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  assertValidMonth(year, month);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** A DATE value for a given day in a month (day clamped to 1–28). */
export function dateInMonth(year: number, month: number, day: number): Date {
  assertValidMonth(year, month);
  const safeDay = Math.min(Math.max(Math.trunc(day) || 1, 1), 28);
  return new Date(Date.UTC(year, month - 1, safeDay));
}

/** "2026-11" — used in idempotency keys. */
export function periodKey(year: number, month: number): string {
  assertValidMonth(year, month);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Today's year and month in Israel. */
export function currentYearMonth(now: Date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
