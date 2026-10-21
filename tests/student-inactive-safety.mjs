import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(file, deps) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name in deps) return deps[name];
    throw Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
const next = { NextResponse: { json: (body, options) => Response.json(body, options) } };
const request = (body) => new Request('https://school.test/api/students/status', {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
});
function fixture(role = 'ADMIN', resultCount = 1) {
  const calls = [];
  const prisma = { student: { updateMany: async args => { calls.push(args); return { count: resultCount }; } } };
  const route = load('src/app/api/students/status/route.ts', {
    'next/server': next, '@/auth': { auth: async () => ({ user: { id: role === 'ADMIN' ? 'admin-1' : 'staff-1', role } }) },
    '@/lib/prisma': { prisma }, '@/lib/permissions': { isSuperAdmin: session => session?.user?.id === 'admin-1' && session.user.role === 'ADMIN' }
  });
  return { route, calls };
}
test('super admin marks only one ACTIVE pupil INACTIVE and invalidates that session without deleting relations', async () => {
  const f = fixture();
  const res = await f.route.PATCH(request({ id: 'DIT/STU/101', action: 'MARK_INACTIVE', confirmed: true }));
  assert.equal(res.status, 200);
  assert.deepEqual(f.calls, [{ where: { id: 'DIT/STU/101', status: 'ACTIVE' }, data: { status: 'INACTIVE', sessionVersion: { increment: 1 } } }]);
  assert.equal((await res.json()).data.status, 'INACTIVE');
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
test('ordinary staff, malformed requests and already inactive pupils cannot change status', async () => {
  const teacher = fixture('STAFF');
  assert.equal((await teacher.route.PATCH(request({ id: 'DIT/STU/101', action: 'MARK_INACTIVE', confirmed: true }))).status, 403);
  assert.equal(teacher.calls.length, 0);
  const admin = fixture();
  assert.equal((await admin.route.PATCH(request({ id: 'DIT/STU/101', action: 'MARK_INACTIVE' }))).status, 400);
  assert.equal(admin.calls.length, 0);
  const inactive = fixture('ADMIN', 0);
  assert.equal((await inactive.route.PATCH(request({ id: 'DIT/STU/101', action: 'MARK_INACTIVE', confirmed: true }))).status, 409);
});
test('old permanent DELETE path always refuses and does not call Prisma', async () => {
  const route = load('src/app/api/students/route.ts', {
    'next/server': next, '@/auth': { auth: async () => null },
    '@/lib/prisma': { prisma: { student: { delete: () => { throw Error('Must never delete'); } } } }
  });
  const res = await route.DELETE();
  assert.equal(res.status, 405);
  assert.match((await res.json()).error, /Permanent Student deletion is disabled/);
});
test('students directory shows only super-admin Mark Inactive, not Delete Student', () => {
  const page = fs.readFileSync('src/app/students/page.tsx', 'utf8');
  assert.match(page, /isSuperAdmin && \(\s*<>[\s\S]*Mark Inactive \(left school\)/);
  assert.doesNotMatch(page, /Delete Student|handleDeleteStudent/);
  assert.match(fs.readFileSync('src/app/api/students/route.ts', 'utf8'), /whereClause: any = \{ status: 'ACTIVE' \}/);
});

test('class counts and Hall of Fame exclude inactive pupils while preserving historical records', async () => {
  let classFilter, hallFilter;
  const classRoute = load('src/app/api/classes/route.ts', {
    'next/server': next, '@/auth': { auth: async () => null },
    '@/lib/prisma': { prisma: {
      class: { findMany: async () => [{ id: 'C1', name: 'JSS1' }] },
      student: { groupBy: async input => { classFilter = input.where; return [{ classId: 'C1', _count: { id: 2 } }]; } }
    } }, '@/lib/permissions': { isSuperAdmin: () => false }
  });
  assert.equal((await classRoute.GET()).status, 200);
  assert.equal(classFilter.status, 'ACTIVE');
  const hallRoute = load('src/app/api/hall-of-fame/route.ts', {
    'next/server': next, '@/lib/prisma': { prisma: {
      student: { findMany: async input => { hallFilter = input.where; return []; } },
      reportRelease: { findMany: async () => [] }
    } }
  });
  assert.equal((await hallRoute.GET()).status, 200);
  assert.equal(hallFilter.status, 'ACTIVE');
});
test('promotions update only ACTIVE pupils and report actual updated count', async () => {
  let where;
  const route = load('src/app/api/students/promote/route.ts', {
    'next/server': next, '@/auth': { auth: async () => ({ user: { id: 'admin-1', role: 'ADMIN' } }) },
    '@/lib/prisma': { prisma: { student: { updateMany: async input => { where = input.where; return { count: 1 }; } } } },
    '@/lib/permissions': { isSuperAdmin: session => session?.user?.id === 'admin-1' }
  });
  const response = await route.POST(new Request('https://school.test/api/students/promote', { method: 'POST',
    body: JSON.stringify({ studentIds: ['ACTIVE1', 'INACTIVE2'], targetClassId: 'C2' }) }));
  assert.equal(response.status, 200);
  assert.equal(where.status, 'ACTIVE');
  assert.match((await response.json()).message, /1 active student\./);
});
