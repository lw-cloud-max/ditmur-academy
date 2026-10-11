import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('public header uses the existing official crest on white, title-case serif wordmark and verified tagline', () => {
  const page = fs.readFileSync('src/app/page.tsx', 'utf8');
  assert.match(page, /aria-label="Public site navigation"/);
  assert.match(page, /<img src="\/logo\.jpg" alt="Ditmur Academy crest" className="h-full w-full object-contain"/);
  assert.match(page, /font-serif text-base font-bold[^>]+>Ditmur Academy<\/span>/);
  assert.match(page, /Cultivating Excellence and Discipline<\/span>/);
  assert.doesNotMatch(page, /mix-blend-multiply/);
  assert.ok(fs.statSync('public/logo.jpg').size > 10_000);
});

test('current carousel, links and photos remain; verified school facts are present', () => {
  const page = fs.readFileSync('src/app/page.tsx', 'utf8');
  for (const route of ['/programs/creche','/programs/primary','/programs/secondary','/apply','/login'])
    assert.ok(page.includes(route), route);
  assert.match(page, /const HERO_SLIDES = \[/);
  assert.ok(page.includes('window.setInterval(() => setActiveSlide(index => (index + 1) % HERO_SLIDES.length), 7000)'));
  for (const fact of ['Government-approved', 'BECE centre', 'WAEC centre', 'Since 2014'])
    assert.match(page, new RegExp(fact));
  assert.match(page, /aria-label="School credentials"/);
});
