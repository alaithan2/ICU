/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Timezone-safe date helpers. All schedule dates are stored as plain
// "YYYY-MM-DD" strings representing a *local* calendar day. Using
// `new Date('YYYY-MM-DD')` parses as UTC midnight, and `toISOString()`
// converts back to UTC — both shift the day near local midnight (e.g. in
// Saudi Arabia, UTC+3, from 00:00–03:00). These helpers stay in local time.

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Today's local calendar date as "YYYY-MM-DD". */
export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/** Format a local Date as "YYYY-MM-DD". */
export const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Weekday (0 = Sunday … 6 = Saturday) for a "YYYY-MM-DD" string, local. */
export const weekdayOf = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

/** True when the date (YYYY-MM-DD) is Friday or Saturday — the KSA weekend. */
export const isWeekendStr = (dateStr: string): boolean => {
  const dow = weekdayOf(dateStr);
  return dow === 5 || dow === 6;
};
