import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../src/lib/attendance-calendar.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', javascript)(require, loaded, loaded.exports);
const {
  computeAttendanceSummary, dateKeyInNigeria, isDateKey, isWeekdayDateKey, localDateKey
} = loaded.exports;

test('term attendance subtracts weekday holidays; late counts present; holiday records are ignored', () => {
  const result = computeAttendanceSummary({
    termStart: '2026-10-26', termEnd: '2026-10-30', asOf: '2026-10-30',
    holidays: ['2026-10-29', '2026-10-30'],
    records: [
      { date: '2026-10-26T00:00:00.000Z', status: 'PRESENT' },
      { date: '2026-10-27T00:00:00.000Z', status: 'LATE' },
      { date: '2026-10-28T00:00:00.000Z', status: 'ABSENT' },
      { date: '2026-10-29T00:00:00.000Z', status: 'PRESENT' }
    ]
  });
  assert.equal(result.available, true);
  assert.equal(result.schoolDaysOpened, 3);
  assert.equal(result.presentDays, 2);
  assert.equal(result.absentDays, 1);
  assert.equal(result.unmarkedDays, 0);
});

test('weekends and unmarked school days are not silently counted as present or absent', () => {
  const result = computeAttendanceSummary({
    termStart: '2026-10-26', termEnd: '2026-11-01', asOf: '2026-11-01',
    holidays: [],
    records: [
      { date: '2026-10-26T00:00:00.000Z', status: 'PRESENT' },
      { date: '2026-10-31T00:00:00.000Z', status: 'ABSENT' }
    ]
  });
  assert.equal(result.schoolDaysOpened, 5);
  assert.equal(result.presentDays, 1);
  assert.equal(result.absentDays, 0);
  assert.equal(result.unmarkedDays, 4);
});

test('future term dates show zero school days opened to date', () => {
  const result = computeAttendanceSummary({
    termStart: '2026-11-02', termEnd: '2026-11-06', asOf: '2026-10-30', holidays: [], records: []
  });
  assert.equal(result.available, true);
  assert.equal(result.throughDate, null);
  assert.equal(result.schoolDaysOpened, 0);
  assert.equal(result.unmarkedDays, 0);
});

test('missing or invalid term boundaries fail closed with a helpful message', () => {
  const result = computeAttendanceSummary({ termStart: null, termEnd: '2026-11-06', asOf: '2026-10-30', holidays: [], records: [] });
  assert.equal(result.available, false);
  assert.match(result.message, /term start and end dates/i);
  assert.equal(isDateKey('2026-02-30'), false);
});

test('school date helpers use stable calendar-day keys', () => {
  assert.equal(dateKeyInNigeria(new Date('2026-10-29T23:30:00.000Z')), '2026-10-30');
  assert.equal(localDateKey(new Date(2026, 9, 30)), '2026-10-30');
  assert.equal(isWeekdayDateKey('2026-10-30'), true);
  assert.equal(isWeekdayDateKey('2026-10-31'), false);
});
