import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/student-subject-offerings/route.ts', import.meta.url), 'utf8');
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
const teacher = { user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } };
const postRequest = body => new Request('https://ditmur.test/api/student-subject-offerings', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
function mockPrisma({ assignedTeacherId = 'teacher-1', studentIds = ['S1'], gradeRows = [] } = {}) {
  const writes = { upsert: 0, deleteMany: 0 };
  const tx = {
    student: { findMany: async () => studentIds.map(id => ({ id })) },
    subject: { findMany: async ({ where }) => where.id.in.map(id => ({ id })) },
    grade: { findMany: async () => gradeRows },
    studentSubjectOffering: {
      upsert: async () => { writes.upsert++; return {}; },
      deleteMany: async () => { writes.deleteMany++; return { count: 0 }; }
    }
  };
  return { writes, class: { findUnique: async () => ({ id: 'C1', name: 'Primary 1', teacherId: assignedTeacherId }) },
    $transaction: async callback => callback(tx) };
}

test('teacher cannot manage subjects for a class assigned to someone else', async () => {
  let transactionCount = 0;
  const prisma = { class: { findUnique: async () => ({ id: 'C1', teacherId: 'teacher-2' }) }, $transaction: async () => { transactionCount++; } };
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(postRequest({ classId: 'C1', term: 'First Term 2026-2027', confirmed: true,
    offerings: [{ studentId: 'S1', subjectIds: ['SUB1'] }] }));
  assert.equal(response.status, 403);
  assert.equal(transactionCount, 0);
});

test('empty subject selection is rejected before database writes', async () => {
  const prisma = mockPrisma();
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(postRequest({ classId: 'C1', term: 'First Term 2026-2027', confirmed: true,
    offerings: [{ studentId: 'S1', subjectIds: [] }] }));
  assert.equal(response.status, 400);
  assert.deepEqual(prisma.writes, { upsert: 0, deleteMany: 0 });
});

test('an offering change that would hide an existing grade is refused without writes', async () => {
  const prisma = mockPrisma({ gradeRows: [{ studentId: 'S1', subjectId: 'SUB2' }] });
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(postRequest({ classId: 'C1', term: 'First Term 2026-2027', confirmed: true,
    offerings: [{ studentId: 'S1', subjectIds: ['SUB1'] }] }));
  const json = await response.json();
  assert.equal(response.status, 409);
  assert.match(json.error, /grade record/);
  assert.deepEqual(prisma.writes, { upsert: 0, deleteMany: 0 });
});

test('valid offerings save for every active student in the assigned class', async () => {
  const prisma = mockPrisma({ studentIds: ['S1', 'S2'] });
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(postRequest({ classId: 'C1', term: 'First Term 2026-2027', confirmed: true,
    offerings: [{ studentId: 'S1', subjectIds: ['SUB1'] }, { studentId: 'S2', subjectIds: ['SUB1', 'SUB2'] }] }));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(json.data.studentsUpdated, 2);
  assert.equal(prisma.writes.upsert, 3);
  assert.equal(prisma.writes.deleteMany, 2);
});
