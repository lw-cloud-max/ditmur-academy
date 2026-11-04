import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/students/create/route.ts', import.meta.url), 'utf8');
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
const body = overrides => ({ firstName: 'Ada', lastName: 'Bello', otherNames: '', dob: '2015-02-10', gender: 'Female',
  classId: 'C1', parentFullName: 'Guardian Bello', parentEmail: 'family@example.com', parentPhone: '08012345678', ...overrides });
const request = value => new Request('https://ditmur.test/api/students/create', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value)
});
const teacher = { user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } };
function makePrisma({ assignedTeacherId = 'teacher-1', parents = [] } = {}) {
  const records = { parentCreates: [], studentCreates: [] };
  const tx = {
    parent: {
      findMany: async () => parents,
      create: async ({ data }) => { records.parentCreates.push(data); return { id: 'PN1', ...data }; }
    },
    student: {
      findMany: async () => [{ id: 'DIT/STU/001' }],
      create: async ({ data }) => { records.studentCreates.push(data); return { id: data.id }; }
    }
  };
  return { records, class: { findUnique: async () => ({ id: 'C1', name: 'Primary 1', teacherId: assignedTeacherId }) },
    $transaction: async callback => callback(tx) };
}

test('teacher cannot add a student to an unassigned class', async () => {
  let transactions = 0;
  const prisma = { class: { findUnique: async () => ({ id: 'C1', name: 'Primary 1', teacherId: 'teacher-2' }) },
    $transaction: async () => { transactions++; return {}; } };
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(request(body({})));
  assert.equal(response.status, 403);
  assert.equal(transactions, 0);
});

test('an exact email-and-phone Parent match is previewed; nothing is created until selected', async () => {
  const prisma = makePrisma({ parents: [{ id: 'P1', fullName: 'Guardian Bello', email: 'FAMILY@example.com', phone: '+234 801 234 5678' }] });
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(request(body({})));
  const json = await response.json();
  assert.equal(response.status, 409);
  assert.equal(json.needsParentChoice, true);
  assert.equal(json.matches[0].id, 'P1');
  assert.equal(prisma.records.parentCreates.length, 0);
  assert.equal(prisma.records.studentCreates.length, 0);
});

test('a selected exact-match Parent is linked without changing their account or issuing passwords', async () => {
  const prisma = makePrisma({ parents: [{ id: 'P1', fullName: 'Guardian Bello', email: 'family@example.com', phone: '+234 801 234 5678' }] });
  const route = loadRoute(teacher, prisma);
  const response = await route.POST(request(body({ parentId: 'P1', confirmedParentMatch: true })));
  const json = await response.json();
  assert.equal(response.status, 201);
  assert.equal(json.data.parentId, 'P1');
  assert.equal(json.data.loginIssued, false);
  assert.equal(prisma.records.parentCreates.length, 0);
  assert.equal(prisma.records.studentCreates[0].parentId, 'P1');
  assert.equal(prisma.records.studentCreates[0].password, null);
});

test('new Parent creation requires explicit confirmation and leaves both logins unprovisioned', async () => {
  const prisma = makePrisma({ parents: [] });
  const route = loadRoute(teacher, prisma);
  const needsConfirm = await route.POST(request(body({})));
  assert.equal(needsConfirm.status, 409);
  assert.equal(prisma.records.parentCreates.length, 0);
  const response = await route.POST(request(body({ confirmedNewParent: true })));
  const json = await response.json();
  assert.equal(response.status, 201);
  assert.equal(json.data.studentId, 'DIT/STU/002');
  assert.equal(json.data.parentCreated, true);
  assert.equal(json.data.loginIssued, false);
  assert.equal(prisma.records.parentCreates[0].password, null);
  assert.equal(prisma.records.studentCreates[0].password, null);
  assert.equal('temporaryPassword' in json.data, false);
});
