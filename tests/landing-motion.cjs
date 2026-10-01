const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = fs.readFileSync('src/app/page.tsx', 'utf8');

test('each carousel photo is included and self-hosted', () => {
  const paths = [...page.matchAll(/(?:mobile|desktop): '(\/images\/[^']+\.webp)'/g)].map(m => m[1]);
  assert.equal(paths.length, 6);
  for (const asset of paths) assert.equal(fs.existsSync(path.join('public', asset)), true, asset);
});

test('carousel is pausable, manually controllable, and respects reduced motion', () => {
  assert.match(page, /setInterval\(\(\) => setActiveSlide/);
  assert.match(page, /carouselPaused \|\| carouselHovered \|\| reducedMotion/);
  assert.match(page, /Previous school photo/);
  assert.match(page, /Next school photo/);
  assert.match(page, /Pause automatic slideshow/);
  assert.match(page, /prefers-reduced-motion: reduce/);
});

test('school ticker has a pause control and unverified numerical claims are removed', () => {
  assert.match(page, /Pause moving school information/);
  assert.match(page, /ditmurTicker/);
  assert.doesNotMatch(page, /1,000\+|100%|30\+ Expert Teachers/);
});
