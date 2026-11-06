import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/students/route.ts', import.meta.url), 'utf8');
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
const request = body => new Request('https://ditmur.test/api/students', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const profile = { id: 'DIT/STU/001', status: 'ACTIVE', classId: 'C1', parentId: 'P1' };
const edit = { id: profile.id, action: 'update_student', firstName: 'Ada', lastName: 'Bello', otherNames: '', dob: '2014-03-12', gender: 'Female' };

test('assigned class teacher can correct basic student details including gender', async () => {
  let update;
  let updateWhere;
  const prisma = {
    student: {
      findUnique: async () => profile,
      updateMany: async args => { update = args.data; updateWhere = args.where; return { count: 1 }; }
    },
    class: { findUnique: async () => ({ teacherId: 'teacher-1' }) }
  };
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, prisma);
  const response = await route.PATCH(request(edit));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(updateWhere.classId, 'C1');
  assert.equal(update.gender, 'Female');
  assert.equal(update.otherNames, null);
  assert.equal(json.success, true);
});

test('teacher cannot edit a student outside their assigned class', async () => {
  let writes = 0;
  const prisma = {
    student: { findUnique: async () => profile, updateMany: async () => { writes++; return { count: 1 }; } },
    class: { findUnique: async () => ({ teacherId: 'teacher-2' }) }
  };
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, prisma);
  const response = await route.PATCH(request(edit));
  assert.equal(response.status, 403);
  assert.equal(writes, 0);
});
