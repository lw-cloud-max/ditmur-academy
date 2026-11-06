import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const behavior = fs.readFileSync(new URL('../src/app/behavior/page.tsx', import.meta.url), 'utf8');
const attendance = fs.readFileSync(new URL('../src/app/school-attendance/page.tsx', import.meta.url), 'utf8');

test('manual behavior award form searches students and filters by class', () => {
  assert.match(behavior, /awardStudentSearch/);
  assert.match(behavior, /awardClassFilter/);
  assert.match(behavior, /filteredAwardStudents/);
  assert.match(behavior, /Search student by name or ID/);
  assert.match(behavior, /Filter by class/);
});

test('behavior award terms come from configured Academic Terms instead of fixed 2024 choices', () => {
  assert.match(behavior, /fetch\('\/api\/terms'/);
  assert.match(behavior, /\$\{item\.name\} \$\{item\.session\}/);
  assert.doesNotMatch(behavior, /<option value="Term [123] - 2024">/);
});

test('attendance-triggered behavior records use the current configured term label', () => {
  assert.match(attendance, /fetch\('\/api\/terms'/);
  assert.match(attendance, /currentTermLabel/);
  assert.doesNotMatch(attendance, /term: 'Term 1 - 2024'/);
});
