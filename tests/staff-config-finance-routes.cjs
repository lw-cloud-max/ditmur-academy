const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(path, session, prisma) {
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
  } }).outputText;
  const mod = { exports: {} };
  const deps = {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@/auth': { auth: async () => session },
    '@/lib/prisma': { prisma },
    '@/lib/permissions': null,
    '@/lib/passwords': null,
    crypto: require('node:crypto')
  };
  // TS modules cannot be required directly: expose the helper's actual source
  // through a compiled wrapper in this test instead.
  const perm = ts.transpileModule(fs.readFileSync('src/lib/permissions.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const pm = { exports: {} };
  new Function('require', 'module', 'exports', perm)(require, pm, pm.exports);
  deps['@/lib/permissions'] = pm.exports;
  const passJs = ts.transpileModule(fs.readFileSync('src/lib/passwords.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const pass = { exports: {} };
  new Function('require', 'module', 'exports', passJs)(key => key === 'crypto' ? require('node:crypto') : require(key), pass, pass.exports);
  deps['@/lib/passwords'] = pass.exports;
  new Function('require', 'module', 'exports', js)(key => {
    if (!(key in deps)) throw Error('Unexpected dependency: ' + key);
    return deps[key];
  }, mod, mod.exports);
  return mod.exports;
}
const req = (path, method = 'GET', body) => new Request('https://ditmur.test' + path,
  { method, ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
function loadPasswordModule() {
  const source = ts.transpileModule(fs.readFileSync('src/lib/passwords.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', source)(key => key === 'crypto' ? require('node:crypto') : require(key), mod, mod.exports);
  return mod.exports;
}
const admin = { user: { id: 'admin-1', role: 'ADMIN' } };
const teacher = { user: { id: 'teacher-1', role: 'STAFF' } };

test('staff directory creates actual record with required ID and retains relations on soft removal', async () => {
  let created, deactivated;
  const prisma = { staff: {
    findUnique: async () => null,
    create: async ({ data }) => { created = data; return data; },
    update: async ({ where, data }) => { deactivated = { where, data }; return data; }
  } };
  const h = load('src/app/api/staff/route.ts', admin, prisma);
  const response = await h.POST(req('/api/staff', 'POST', {
    firstName: 'Ada', lastName: 'Okeke', email: 'ADA@EXAMPLE.COM', phone: '08012345678', role: 'TEACHER'
  }));
  assert.equal(response.status, 201);
  assert.match(created.id, /^STF-/);
  assert.equal(created.email, 'ada@example.com');
  assert.equal((await h.DELETE(req(`/api/staff?id=${created.id}`, 'DELETE'))).status, 200);
  assert.deepEqual(deactivated.data, { status: 'INACTIVE' });
});

test('ordinary staff cannot add staff records', async () => {
  const h = load('src/app/api/staff/route.ts', teacher, {});
  assert.equal((await h.POST(req('/api/staff', 'POST', { firstName: 'Ada' }))).status, 403);
});

test('subjects can be renamed in place so grades retain their subject ID', async () => {
  let update;
  const h = load('src/app/api/subjects/route.ts', admin, { subject: {
    update: async args => { update = args; return { id: args.where.id, name: args.data.name }; }
  } });
  const response = await h.PATCH(req('/api/subjects', 'PATCH', { id: 'math', name: '  General   Mathematics  ' }));
  assert.equal(response.status, 200);
  assert.deepEqual(update, { where: { id: 'math' }, data: { name: 'General Mathematics' } });
});

test('teachers never trigger revenue aggregation or receive school revenue', async () => {
  const prisma = {
    student: { count: async () => 10, findMany: async () => [] },
    staff: { count: async () => 3, findMany: async () => [] },
    class: { count: async () => 5 },
    academicTerm: { findMany: async () => [] },
    invoice: { aggregate: async () => { throw Error('must not query finance'); }, findMany: async () => { throw Error('must not query invoices'); } }
  };
  const h = load('src/app/api/dashboard/route.ts', teacher, prisma);
  const res = await h.GET();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.totalRevenue, undefined);
});

test('teachers cannot query invoices; parents only query their children', async () => {
  const prisma = { invoice: { findMany: async args => {
    assert.equal(args.where.student.parentId, 'parent-1');
    return [];
  } } };
  assert.equal((await load('src/app/api/payments/route.ts', teacher, prisma).GET(req('/api/payments'))).status, 403);
  const parent = { user: { id: 'parent-1', role: 'PARENT' } };
  const res = await load('src/app/api/payments/route.ts', parent, prisma).GET(req('/api/payments'));
  assert.equal(res.status, 200);
});

test('payment verification never approves missing Paystack secret', async () => {
  const old = process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_SECRET_KEY;
  try {
    const prisma = { invoice: { findUnique: async () => ({ id: 'inv1', amount: 100,
      status: 'PENDING', studentId: 'STU1', student: { parentId: 'parent-1' } }) } };
    const h = load('src/app/api/payments/verify/route.ts', { user: { id: 'parent-1', role: 'PARENT' } }, prisma);
    const res = await h.POST(req('/api/payments/verify', 'POST', { invoiceId: 'inv1', reference: 'reference-123' }));
    assert.equal(res.status, 503);
  } finally {
    if (old === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = old;
  }
});

test('dashboard recent activity comes from real records and finance is returned to super admin only', async () => {
  const today = new Date('2026-09-28T10:00:00Z');
  const yesterday = new Date('2026-09-27T09:00:00Z');
  const prisma = {
    student: { count: async () => 10, findMany: async () => [{ firstName: 'Amina', lastName: 'Bello', createdAt: today }] },
    staff: { count: async () => 3, findMany: async () => [] },
    class: { count: async () => 5 },
    academicTerm: { findMany: async () => [{ name: 'First Term', session: '2026-2027', createdAt: yesterday }] },
    invoice: { aggregate: async () => ({ _sum: { amount: 12000 } }), findMany: async () => [] }
  };
  const res = await load('src/app/api/dashboard/route.ts', admin, prisma).GET();
  const data = (await res.json()).data;
  assert.equal(data.totalRevenue, 12000);
  assert.match(data.recentActivity[0].text, /Amina Bello/);
  assert.match(data.recentActivity[1].text, /2026-2027/);
});

test('academic session dropdown values can create the current term', async () => {
  const prisma = { academicTerm: {
    findFirst: async () => null,
    $unused: null
  }, $transaction: async callback => callback({ academicTerm: {
    updateMany: async () => ({}),
    create: async ({ data }) => ({ id: 'term1', ...data })
  } }) };
  const h = load('src/app/api/terms/route.ts', admin, prisma);
  const res = await h.POST(req('/api/terms', 'POST', {
    name: 'First Term', session: '2026-2027', isCurrent: true, startDate: '', endDate: ''
  }));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).data.session, '2026-2027');
});

test('student login uses the actual name and checks the stored password', async () => {
  let options;
  const prisma = { student: { findUnique: async () => ({ id: 'DIT/STU/001', firstName: 'Ada', lastName: 'Okafor', password: 'individual-student-password', status: 'ACTIVE', sessionVersion: 0, mustChangePassword: true }), update: async () => ({}) } };
  const js = ts.transpileModule(fs.readFileSync('src/auth.ts', 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  const deps = {
    'next-auth': config => { options = config; return { handlers: {}, signIn: () => {}, signOut: () => {}, auth: () => {} }; },
    'next-auth/providers/credentials': config => config,
    '@/lib/prisma': { prisma },
    '@/lib/passwords': loadPasswordModule()
  };
  new Function('require', 'module', 'exports', js)(key => deps[key], mod, mod.exports);
  const authorize = options.providers[0].authorize;
  assert.equal(await authorize({ username: 'dit/stu/001', password: 'wrong', roleType: 'STUDENT' }), null);
  const user = await authorize({ username: 'dit/stu/001', password: 'individual-student-password', roleType: 'STUDENT' });
  assert.equal(user.name, 'Ada Okafor');
  assert.equal(user.id, 'DIT/STU/001');
});
