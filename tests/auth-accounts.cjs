const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const bcrypt = require('bcryptjs');
const passwordFile = 'src/lib/passwords.ts';

function load(file, dependencies = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) return dependencies[name];
    if (name === 'crypto') return require('node:crypto');
    if (name === 'bcryptjs') return require('bcryptjs');
    throw Error('Unexpected dependency: ' + name);
  }, mod, mod.exports);
  return mod.exports;
}
const passwords = load(passwordFile);
const json = { NextResponse: { json: (value, options) => Response.json(value, options) } };
const admin = { user: { role: 'ADMIN', id: 'admin-1' } };
function authHandler(prisma) {
  let options;
  load('src/auth.ts', {
    'next-auth': config => { options = config; return { handlers: {}, auth: async () => null, signIn: () => {}, signOut: () => {} }; },
    'next-auth/providers/credentials': config => config,
    '@/lib/prisma': { prisma }, '@/lib/passwords': passwords
  });
  return options.providers[0].authorize;
}

test('known demo passwords cannot log in even when old database values remain', async () => {
  const authorize = authHandler({
    student: { findUnique: async () => ({ id: 'STU1', status: 'ACTIVE', password: 'student123' }) },
    parent: { findFirst: async () => ({ id: 'PAR1', password: 'parent123' }) }
  });
  assert.equal(await authorize({ username: 'STU1', password: 'student123', roleType: 'STUDENT' }), null);
  assert.equal(await authorize({ username: 'a@example.com', password: 'parent123', roleType: 'PARENT' }), null);
});

test('super admin requires configured environment password; no admin123 fallback', async () => {
  const old = process.env.SUPER_ADMIN_PASSWORD;
  process.env.SUPER_ADMIN_PASSWORD = 'a-strong-demo-value-only-for-test';
  try {
    const authorize = authHandler({});
    assert.equal(await authorize({ username: 'admin@ditmur.com', password: 'admin123', roleType: 'STAFF' }), null);
    assert.equal((await authorize({ username: 'admin@ditmur.com', password: 'a-strong-demo-value-only-for-test', roleType: 'STAFF' })).id, 'admin-1');
  } finally {
    if (old === undefined) delete process.env.SUPER_ADMIN_PASSWORD;
    else process.env.SUPER_ADMIN_PASSWORD = old;
  }
});

test('accountant signs in with individual bcrypt password and must change it', async () => {
  const secret = await passwords.hashPassword('different-valid-secret');
  const authorize = authHandler({ staff: { findFirst: async () => ({
    id: 'STF-ACCT1', email: 'acct@example.com', firstName: 'Grace', lastName: 'Okoro',
    role: 'ACCOUNTANT', status: 'ACTIVE', passwordHash: secret, mustChangePassword: true
  }) } });
  assert.equal(await authorize({ username: 'acct@example.com', password: 'incorrect', roleType: 'STAFF' }), null);
  const person = await authorize({ username: 'acct@example.com', password: 'different-valid-secret', roleType: 'STAFF' });
  assert.equal(person.role, 'ACCOUNTANT');
  assert.equal(person.mustChangePassword, true);
});

test('super admin reset issues strong one-time password and stores only bcrypt hash', async () => {
  let updated;
  const prisma = { student: {
    findUnique: async () => ({ id: 'STU1', status: 'ACTIVE' }),
    update: async ({ data }) => { updated = data; return {}; }
  } };
  const permissions = load('src/lib/permissions.ts');
  const route = load('src/app/api/credentials/reset/route.ts', {
    'next/server': json, '@/auth': { auth: async () => admin }, '@/lib/prisma': { prisma },
    '@/lib/permissions': permissions, '@/lib/passwords': passwords
  });
  const response = await route.POST(new Request('http://school.test/api/credentials/reset', {
    method: 'POST', body: JSON.stringify({ kind: 'STUDENT', id: 'STU1' }), headers: { 'content-type': 'application/json' }
  }));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.data.temporaryPassword.length >= 16, true);
  assert.equal(await bcrypt.compare(result.data.temporaryPassword, updated.password), true);
  assert.equal(updated.mustChangePassword, true);
  assert.notEqual(updated.password, result.data.temporaryPassword);
});

test('legacy custom plaintext upgrades to bcrypt on successful login', async () => {
  let updated;
  const authorize = authHandler({ student: {
    findUnique: async () => ({ id: 'STU1', firstName: 'Ada', lastName: 'Bello', status: 'ACTIVE', password: 'unique-legacy-secret', mustChangePassword: false }),
    update: async ({ data }) => { updated = data; return {}; }
  } });
  const person = await authorize({ username: 'STU1', password: 'unique-legacy-secret', roleType: 'STUDENT' });
  assert.equal(person.name, 'Ada Bello');
  assert.equal(person.mustChangePassword, true);
  assert.equal(await bcrypt.compare('unique-legacy-secret', updated.password), true);
});

test('new password validation rejects demo and short strings', () => {
  assert.ok(passwords.validateNewPassword('student123'));
  assert.ok(passwords.validateNewPassword('short'));
  assert.equal(passwords.validateNewPassword('new long unique 2026!'), null);
});

test('proxy forces first password change and limits accountant to finance screens', async () => {
  const session = { user: { id: 'STF-ACCT1', role: 'ACCOUNTANT', mustChangePassword: true, sessionVersion: 0 } };
  const next = { NextResponse: {
    next: () => new Response('allowed'),
    redirect: url => new Response(null, { status: 307, headers: { location: String(url) } }),
    json: (value, init) => Response.json(value, init)
  } };
  const proxy = load('src/proxy.ts', {
    'next/server': next,
    '@/auth': { auth: async () => session },
    '@/lib/prisma': { prisma: { staff: { findUnique: async () => ({ role: 'ACCOUNTANT', status: 'ACTIVE', sessionVersion: 0 }) } } }
  }).proxy;
  const req = path => ({ url: 'https://school.test' + path, nextUrl: { pathname: path }, method: 'GET' });
  const first = await proxy(req('/dashboard'));
  assert.equal(first.status, 307);
  assert.match(first.headers.get('location'), /change-password/);
  assert.equal((await proxy(req('/change-password'))).status, 200);
  session.user.mustChangePassword = false;
  assert.equal((await proxy(req('/payments'))).status, 200);
  assert.equal((await proxy(req('/students'))).status, 307);
  session.user.sessionVersion = -1;
  assert.equal((await proxy(req('/payments'))).status, 307);
});
