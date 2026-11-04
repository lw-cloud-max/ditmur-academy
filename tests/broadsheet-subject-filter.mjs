import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/broadsheet/class/route.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
function loadRoute(session, prisma) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', javascript)(key => {
    if (key === 'next/server') return next;
    if (key === '@/auth') return { auth: async () => session };
    if (key === '@/lib/prisma') return { prisma };
    throw new Error(`Unexpected import: ${key}`);
  }, mod, mod.exports);
  return mod.exports;
}
const request = () => new Request('https://ditmur.test/api/broadsheet/class?classId=C1&term=First%20Term%202026-2027');
function makePrisma(offerings) {
  return {
    reportRelease: { findUnique: async () => ({ approvedAt: new Date() }) },
    class: { findUnique: async () => ({ id: 'C1', name: 'Primary 1', level: 'Primary' }) },
    subject: { findMany: async () => [{ id: 'SUB1', name: 'English' }, { id: 'SUB2', name: 'Mathematics' }, { id: 'SUB3', name: 'Portal-only Subject' }] },
    student: { findUnique: async () => ({ classId: 'C1' }), findFirst: async () => ({ id: 'S1' }), findMany: async () => [{
      id: 'S1', firstName: 'Ada', lastName: 'Bello', parentId: 'P1', status: 'ACTIVE', classId: 'C1',
      grades: [
        { subjectId: 'SUB1', total: 80, subject: { id: 'SUB1', name: 'English' } },
        { subjectId: 'SUB2', total: 70, subject: { id: 'SUB2', name: 'Mathematics' } }
      ], skillRatings: []
    }] },
    studentSubjectOffering: { findMany: async () => offerings }
  };
}

test('broadsheet shows only explicitly offered subjects and filters other portal grades', async () => {
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF' } }, makePrisma([{ studentId: 'S1', subjectId: 'SUB2' }]));
  const response = await route.GET(request());
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(json.data.subjects.map(subject => subject.id), ['SUB2']);
  assert.deepEqual(json.data.students[0].offeredSubjectIds, ['SUB2']);
  assert.deepEqual(json.data.students[0].grades.map(grade => grade.subjectId), ['SUB2']);
});

test('legacy terms with no saved offerings fall back only to subjects with existing grades', async () => {
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF' } }, makePrisma([]));
  const response = await route.GET(request());
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(json.data.subjects.map(subject => subject.id).sort(), ['SUB1', 'SUB2']);
  assert.equal(json.data.subjectsConfigured, false);
  assert.deepEqual(json.data.students[0].offeredSubjectIds.sort(), ['SUB1', 'SUB2']);
});
