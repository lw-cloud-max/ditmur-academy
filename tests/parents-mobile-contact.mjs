import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Parent cards can shrink on narrow phones; action button stays separate from unbroken email', () => {
  const page = fs.readFileSync('src/app/parents/page.tsx', 'utf8');
  assert.match(page, /min-w-0 max-w-full bg-white rounded-xl border/);
  assert.match(page, /flex min-w-0 max-w-full items-start justify-between gap-2/);
  assert.match(page, /className="min-w-0 flex-1"/);
  assert.match(page, /break-all underline-offset-2/);
  assert.match(page, /min-h-11 min-w-11/);
  assert.match(page, /aria-label=\{`Actions for \$\{parent\.fullName\}`\}/);
  assert.match(page, /role="menu"/);
});
test('Privacy policy has real clickable school contact details', () => {
  const page = fs.readFileSync('src/app/privacy/page.tsx', 'utf8');
  assert.match(page, /mailto:ditmuracademy@gmail\.com/);
  assert.match(page, /tel:\+2348038164705/);
  assert.match(page, /https:\/\/wa\.me\/2349018009872/);
  assert.match(page, /11, Adeshina Close Off Pipeline, Ishasi Akute, Ogun State/);
  assert.doesNotMatch(page, /privacy@ditmuracademy\.edu\.ng|123 Academy Road|\+234 801 234 5678/);
});
test('public age ranges match the school-provided details', () => {
  const home = fs.readFileSync('src/app/page.tsx', 'utf8');
  const early = fs.readFileSync('src/app/programs/creche/page.tsx', 'utf8');
  const primary = fs.readFileSync('src/app/programs/primary/page.tsx', 'utf8');
  assert.match(home, /Ages 3 months to 5 years/);
  assert.match(early, /Ages 3 months to 5 years/);
  assert.match(home, /Ages 6-10 years/);
  assert.match(primary, /Ages 6-10 years/);
  for (const page of [home, early]) assert.doesNotMatch(page, /Crèche & Nursery/);
});
