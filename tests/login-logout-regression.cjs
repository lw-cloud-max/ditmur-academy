const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const login = fs.readFileSync('src/app/login/page.tsx', 'utf8');
const logout = fs.readFileSync('src/components/LogoutButton.tsx', 'utf8');
const worker = fs.readFileSync('public/sw.js', 'utf8');

test('login password has an explicit, accessible toggle for every role', () => {
  assert.match(login, /type=\{showPassword \? 'text' : 'password'\}/);
  assert.match(login, /aria-label=\{showPassword \? 'Hide password' : 'Show password'\}/);
  assert.match(login, /aria-pressed=\{showPassword\}/);
  assert.match(login, /onClick=\{\(\) => setShowPassword/);
  assert.match(login, /aria-controls="login-password"/);
});

test('logout uses NextAuth and same-origin client navigation, not a forced reload or storage wipe', () => {
  assert.match(logout, /await signOut\(\{ redirect: false, redirectTo: '\/login' \}\)/);
  assert.match(logout, /router\.replace\('\/login'\)/);
  assert.doesNotMatch(logout, /window\.location\.(?:href|assign|replace)/);
  assert.doesNotMatch(logout, /(?:localStorage|sessionStorage)\.clear\(/);
});

test('new service worker removes stale login cache and does not intercept navigation', async () => {
  const listeners = {};
  let skipWaiting = false;
  let claimed = false;
  const deleted = [];
  const context = {
    self: { addEventListener: (name, callback) => { listeners[name] = callback; },
      skipWaiting: () => { skipWaiting = true; }, clients: { claim: async () => { claimed = true; } } },
    caches: { keys: async () => ['ditmur-academy-v1', 'unrelated-site-cache'],
      delete: async name => { deleted.push(name); return true; } }
  };
  vm.runInNewContext(worker, context);
  listeners.install();
  assert.equal(skipWaiting, true);
  let activation;
  listeners.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['ditmur-academy-v1']);
  assert.equal(claimed, true);
  assert.equal(listeners.fetch, undefined);
});
