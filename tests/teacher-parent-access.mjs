import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/parents/route.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
function loadRoute(session, prisma) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', javascript)(key => {
    if (key === 'next/server') return next;
    if (key === '@/auth') return { auth: async () => session };
    if (key === '@/lib/prisma') return { prisma };
    if (key === '@/lib/permissions') return { isSuperAdmin: value => value?.user?.id === 'admin-1' && value?.user?.role === 'ADMIN' };
    throw new Error(`Unexpected import: ${key}`);
  }, mod, mod.exports);
  return mod.exports;
}
const request = body => new Request('https://ditmur.test/api/parents', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

test('teacher Parent directory is scoped to active children in their assigned class', async () => {
  let args;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    parent: { findMany: async input => { args = input; return []; } }
  });
  const response = await route.GET(new Request('https://ditmur.test/api/parents'));
  assert.equal(response.status, 200);
  assert.equal(args.where.students.some.status, 'ACTIVE');
  assert.equal(args.where.students.some.class.is.teacherId, 'teacher-1');
  assert.equal(args.select.students.where.class.is.teacherId, 'teacher-1');
});

test('assigned class teacher may update contacts for a Parent linked to their class', async () => {
  let scope;
  let update;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    parent: {
      findFirst: async input => { scope = input.where; return { id: 'P1', email: 'old@example.com' }; },
      update: async input => { update = input; return { id: 'P1', fullName: input.data.fullName, email: input.data.email, phone: input.data.phone, students: [] }; }
    }
  });
  const response = await route.PATCH(request({ id: 'P1', fullName: 'Guardian Name', email: 'NEW@EXAMPLE.COM', phone: '+2348012345678', confirmEmailChange: true }));
  assert.equal(response.status, 200);
  assert.equal(scope.students.some.class.is.teacherId, 'teacher-1');
  assert.equal(update.data.email, 'new@example.com');
});

test('email/login changes require explicit server-side confirmation', async () => {
  let writes = 0;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    parent: { findFirst: async () => ({ id: 'P1', email: 'old@example.com' }), update: async () => { writes++; return {}; } }
  });
  const response = await route.PATCH(request({ id: 'P1', fullName: 'Guardian', email: 'new@example.com', phone: '08012345678' }));
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});

test('teacher cannot edit Parent contacts outside their assigned class', async () => {
  let writes = 0;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    parent: { findFirst: async () => null, update: async () => { writes++; return {}; } }
  });
  const response = await route.PATCH(request({ id: 'P2', fullName: 'Guardian Name', email: 'g@example.com', phone: '08012345678', confirmEmailChange: true }));
  assert.equal(response.status, 404);
  assert.equal(writes, 0);
});

test('staff without a teacher assignment cannot edit Parent records', async () => {
  const route = loadRoute({ user: { id: 'accountant-1', role: 'STAFF', staffRole: 'SUPPORT' } }, {});
  const response = await route.PATCH(request({ id: 'P1', fullName: 'Guardian', phone: '08012345678' }));
  assert.equal(response.status, 403);
});
