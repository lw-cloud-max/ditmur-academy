import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/classes/route.ts', import.meta.url), 'utf8');
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

test('class detail request includes the assigned teacher identity', async () => {
  const prisma = {
    class: { findMany: async args => {
      assert.deepEqual(args.include.teacher.select, { id: true, firstName: true, lastName: true, role: true, status: true });
      return [{ id: 'C1', name: 'Primary 1', level: 'Primary', teacherId: 'T1', teacher: { id: 'T1', firstName: 'Ada', lastName: 'Teacher', role: 'TEACHER', status: 'ACTIVE' } }];
    } },
    student: { groupBy: async () => [{ classId: 'C1', _count: { id: 1 } }] }
  };
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF' } }, prisma);
  const response = await route.GET(new Request('https://ditmur.test/api/classes?includeTeacher=1'));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(json.data[0].teacher.firstName, 'Ada');
  assert.equal(json.data[0]._count.students, 1);
});

test('teacher detail relation is not exposed to an unauthenticated request', async () => {
  let queried = false;
  const route = loadRoute(null, { class: { findMany: async () => { queried = true; return []; } } });
  const response = await route.GET(new Request('https://ditmur.test/api/classes?includeTeacher=1'));
  assert.equal(response.status, 403);
  assert.equal(queried, false);
});
