const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const bcrypt = require('bcryptjs');

function load(file, deps = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;
  const mod = { exports: {} };
  new Function('require','module','exports',js)(name => {
    if (Object.hasOwn(deps, name)) return deps[name];
    if (name === 'crypto') return require('node:crypto');
    if (name === 'bcryptjs') return bcrypt;
    throw Error('Unexpected dependency ' + name);
  }, mod, mod.exports);
  return mod.exports;
}
const permissions = load('src/lib/permissions.ts');
const passwords = load('src/lib/passwords.ts');
const response = { NextResponse: { json: (body, options) => Response.json(body, options), next: () => new Response('ok'),
  redirect: url => new Response(null, { status: 307, headers: { location: String(url) } }) } };
const admin = { user: { id: 'admin-1', role: 'ADMIN' } };
const combined = { user: { id: 'STF-1', role: 'STAFF', staffRole: 'ACCOUNTANT_TEACHER', mustChangePassword: false, sessionVersion: 2 } };

test('only the combined-role staff member receives both finance and teacher capabilities', () => {
  assert.equal(permissions.canViewSchoolFinance(combined), true);
  assert.equal(permissions.canViewSchoolFinance({ user: { role: 'STAFF', id: 'STF-2', staffRole: 'TEACHER' } }), false);
  assert.equal(permissions.canViewSchoolFinance({ user: { role: 'ACCOUNTANT', id: 'STF-3', staffRole: 'ACCOUNTANT' } }), true);
});

test('accountant-teacher logs in as staff for existing teaching endpoints', async () => {
  let opts;
  const secret = await bcrypt.hash('unique-accountant-teacher-pass', 4);
  const prisma = { staff: { findFirst: async () => ({ id: 'STF-1', firstName: 'Grace', lastName: 'Okoro',
    email: 'grace@example.com', role: 'ACCOUNTANT_TEACHER', status: 'ACTIVE',
    passwordHash: secret, mustChangePassword: false, sessionVersion: 2 }) } };
  load('src/auth.ts', { 'next-auth': options => {
    opts = options; return { handlers: {}, signIn: () => {}, signOut: () => {}, auth: () => {} };
  }, 'next-auth/providers/credentials': config => config,
  '@/lib/prisma': { prisma }, '@/lib/passwords': passwords });
  const user = await opts.providers[0].authorize({ username: 'grace@example.com', password: 'unique-accountant-teacher-pass', roleType: 'STAFF' });
  assert.equal(user.role, 'STAFF');
  assert.equal(user.staffRole, 'ACCOUNTANT_TEACHER');
  assert.equal(user.sessionVersion, 2);
});

test('proxy permits this accountant to teach and view finance; revoked role is rejected', async () => {
  let dbRole = 'ACCOUNTANT_TEACHER';
  const proxy = load('src/proxy.ts', { 'next/server': response, '@/auth': { auth: async () => combined },
    '@/lib/prisma': { prisma: { staff: { findUnique: async () => ({ role: dbRole, status: 'ACTIVE', sessionVersion: 2 }) } } }
  }).proxy;
  const req = url => ({ nextUrl: { pathname: url }, url: `https://school.test${url}`, method: 'GET' });
  assert.equal((await proxy(req('/lesson-notes'))).status, 200);
  assert.equal((await proxy(req('/payments'))).status, 200);
  dbRole = 'ACCOUNTANT';
  assert.equal((await proxy(req('/payments'))).status, 307);
});

test('finance-only accountant is still blocked from teaching pages', async () => {
  const onlyFinance = { user: { id: 'STF-2', role: 'ACCOUNTANT', staffRole: 'ACCOUNTANT', mustChangePassword: false, sessionVersion: 1 } };
  const proxy = load('src/proxy.ts', { 'next/server': response, '@/auth': { auth: async () => onlyFinance },
    '@/lib/prisma': { prisma: { staff: { findUnique: async () => ({ role: 'ACCOUNTANT', status: 'ACTIVE', sessionVersion: 1 }) } } }
  }).proxy;
  assert.equal((await proxy({ nextUrl: { pathname: '/lesson-notes' }, url: 'https://school.test/lesson-notes', method: 'GET' })).status, 307);
});

test('super admin role toggle changes only an accountant and revokes old sessions', async () => {
  let update;
  const prisma = { staff: {
    findUnique: async () => ({ id: 'STF-1', role: 'ACCOUNTANT', status: 'ACTIVE' }),
    update: async args => { update = args; return { id: args.where.id, role: args.data.role }; }
  } };
  const route = load('src/app/api/staff/route.ts', { 'next/server': response, crypto: require('node:crypto'),
    '@/auth': { auth: async () => admin }, '@/lib/prisma': { prisma }, '@/lib/permissions': permissions,
    '@/lib/passwords': passwords
  });
  const result = await route.PATCH(new Request('https://school.test/api/staff', {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'STF-1', teachingEnabled: true })
  }));
  assert.equal(result.status, 200);
  assert.deepEqual(update.data, { role: 'ACCOUNTANT_TEACHER', sessionVersion: { increment: 1 } });
});

test('teacher directory search includes an accountant who also teaches', async () => {
  let where;
  const route = load('src/app/api/staff/route.ts', { 'next/server': response, crypto: require('node:crypto'),
    '@/auth': { auth: async () => admin }, '@/lib/prisma': { prisma: { staff: {
      findMany: async query => { where = query.where; return []; }
    } } }, '@/lib/permissions': permissions, '@/lib/passwords': passwords });
  const result = await route.GET(new Request('https://school.test/api/staff?role=TEACHER'));
  assert.equal(result.status, 200);
  assert.deepEqual(where.role.in, ['TEACHER', 'ACCOUNTANT_TEACHER']);
});
