export type AttendanceRowForSummary = { date: Date | string; status: string };
export type AttendanceSummaryInput = {
  termStart: string | null | undefined;
  termEnd: string | null | undefined;
  asOf: string;
  holidays: string[];
  records: AttendanceRowForSummary[];
};

export type AttendanceSummary = {
  available: boolean;
  message: string | null;
  termStart: string | null;
  termEnd: string | null;
  throughDate: string | null;
  schoolDaysOpened: number;
  presentDays: number;
  absentDays: number;
  unmarkedDays: number;
};

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateKeyFromDate(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const key = date.toISOString().slice(0, 10);
  return isDateKey(key) ? key : null;
}

export function dateKeyInNigeria(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDateKeyDays(value: string, days: number): string | null {
  if (!isDateKey(value) || !Number.isInteger(days)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const result = date.toISOString().slice(0, 10);
  return isDateKey(result) ? result : null;
}

export function isWeekdayDateKey(value: string): boolean {
  if (!isDateKey(value)) return false;
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

export function makeUnavailableAttendanceSummary(message: string): AttendanceSummary {
  return {
    available: false, message, termStart: null, termEnd: null, throughDate: null,
    schoolDaysOpened: 0, presentDays: 0, absentDays: 0, unmarkedDays: 0
  };
}

export function computeAttendanceSummary(input: AttendanceSummaryInput): AttendanceSummary {
  const { termStart, termEnd, asOf, holidays, records } = input;
  if (!isDateKey(termStart) || !isDateKey(termEnd) || termEnd < termStart || !isDateKey(asOf)) {
    return makeUnavailableAttendanceSummary('Attendance term dates are not configured. Set the term start and end dates in school Configuration.');
  }

  const throughDate = asOf < termEnd ? asOf : termEnd;
  const holidaySet = new Set(holidays.filter(isDateKey));
  let schoolDaysOpened = 0;
  let presentDays = 0;
  let absentDays = 0;
  let cursor = termStart;

  if (throughDate >= termStart) {
    while (cursor <= throughDate) {
      if (isWeekdayDateKey(cursor) && !holidaySet.has(cursor)) schoolDaysOpened += 1;
      cursor = addDateKeyDays(cursor, 1)!;
    }
  }

  const markedDates = new Set<string>();
  if (throughDate >= termStart) {
    for (const row of records) {
      const date = dateKeyFromDate(row.date);
      if (!date || date < termStart || date > throughDate || !isWeekdayDateKey(date) || holidaySet.has(date)) continue;
      const status = row.status.toUpperCase();
      if (status === 'PRESENT' || status === 'LATE') {
        markedDates.add(date);
        presentDays += 1;
      } else if (status === 'ABSENT') {
        markedDates.add(date);
        absentDays += 1;
      }
    }
  }

  return {
    available: true,
    message: null,
    termStart,
    termEnd,
    throughDate: throughDate >= termStart ? throughDate : null,
    schoolDaysOpened,
    presentDays,
    absentDays,
    unmarkedDays: Math.max(0, schoolDaysOpened - markedDates.size)
  };
}

export function dateKeyToUtcDate(value: string): Date | null {
  return isDateKey(value) ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function nextDateKeyUtcStart(value: string): Date | null {
  const next = addDateKeyDays(value, 1);
  return next ? new Date(`${next}T00:00:00.000Z`) : null;
}
