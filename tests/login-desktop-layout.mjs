import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('desktop login form is wider and remains naturally scrollable', () => {
  const page = fs.readFileSync('src/app/login/page.tsx', 'utf8');
  assert.match(page, /max-w-\[500px\]/);
  assert.match(page, /overflow-x-hidden/);
  assert.doesNotMatch(page, /flex flex-col md:flex-row overflow-hidden/);
  assert.match(page, /min-h-14/);
});

test('readability changes keep exact wording, role actions and auth flow', () => {
  const page = fs.readFileSync('src/app/login/page.tsx', 'utf8');
  assert.match(page, /real-time academic records, live CBT assessments, and learning tools/);
  assert.match(page, /Secure Access/);
  assert.match(page, /AI Powered/);
  assert.match(page, /First login with a temporary password\?/);
  for (const role of ['STAFF', 'STUDENT', 'PARENT']) assert.ok(page.includes(`setRoleType('${role}')`));
  assert.match(page, /signIn\('credentials'/);
  assert.match(page, /autoComplete="current-password"/);
});
