import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/attendance/route.ts', import.meta.url), 'utf8');
const helperSource = fs.readFileSync(new URL('../src/lib/attendance-calendar.ts', import.meta.url), 'utf8');
const helperJavascript = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const helperModule = { exports: {} };
new Function('require', 'module', 'exports', helperJavascript)((() => { throw new Error('No helper dependencies expected'); }), helperModule, helperModule.exports);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
function loadRoute(session, prisma) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', javascript)(specifier => {
    if (specifier === 'next/server') return next;
    if (specifier === '@/auth') return { auth: async () => session };
    if (specifier === '@/lib/prisma') return { prisma };
    if (specifier === '@/lib/attendance-calendar') return helperModule.exports;
    throw new Error(`Unexpected import: ${specifier}`);
  }, mod, mod.exports);
  return mod.exports;
}
const request = (body, url = 'https://ditmur.test/api/attendance') => new Request(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

test('attendance writes are blocked on a weekend before any database mutation', async () => {
  let writes = 0;
  const prisma = {
    calendarEvent: { findFirst: async () => { writes++; return null; } },
    student: { findMany: async () => { writes++; return []; } },
    attendance: { upsert: async () => { writes++; return {}; } },
    $transaction: async operations => { writes++; return Promise.all(operations); }
  };
  const route = loadRoute({ user: { id: 'staff-1', role: 'STAFF' } }, prisma);
  const response = await route.POST(request({
    date: '2026-10-31', attendance: [{ studentId: 'STU1', classId: 'CLASS1', status: 'PRESENT' }]
  }));
  assert.equal(response.status, 409);
  assert.equal(writes, 0);
});

test('attendance writes are blocked for a saved Holiday event', async () => {
  let writes = 0;
  const prisma = {
    calendarEvent: { findFirst: async () => { writes++; return { title: 'Midterm break' }; } },
    student: { findMany: async () => { writes++; return [{ id: 'STU1' }]; } },
    attendance: { upsert: async () => { writes++; return {}; } },
    $transaction: async operations => { writes++; return Promise.all(operations); }
  };
  const route = loadRoute({ user: { id: 'staff-1', role: 'STAFF' } }, prisma);
  const response = await route.POST(request({
    date: '2026-10-30', attendance: [{ studentId: 'STU1', classId: 'CLASS1', status: 'ABSENT' }]
  }));
  const json = await response.json();
  assert.equal(response.status, 409);
  assert.match(json.error, /Midterm break/);
  assert.equal(writes, 1);
});

test('partial register saves upsert only submitted marks and never clears other students', async () => {
  const upserts = [];
  let deleted = false;
  const prisma = {
    calendarEvent: { findFirst: async () => null },
    student: { findMany: async () => [{ id: 'STU1' }] },
    attendance: {
      upsert: async args => { upserts.push(args); return { studentId: args.create.studentId, status: args.create.status }; },
      deleteMany: async () => { deleted = true; }
    },
    $transaction: async operations => Promise.all(operations)
  };
  const route = loadRoute({ user: { id: 'staff-1', role: 'STAFF' } }, prisma);
  const response = await route.POST(request({
    date: '2026-10-30', attendance: [{ studentId: 'STU1', classId: 'CLASS1', status: 'LATE' }]
  }));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(json.success, true);
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].where.studentId_date.studentId, 'STU1');
  assert.equal(upserts[0].create.status, 'LATE');
  assert.equal(deleted, false);
});

test('only staff or super admins can read a register', async () => {
  const route = loadRoute({ user: { id: 'parent-1', role: 'PARENT' } }, {});
  const response = await route.GET(new Request('https://ditmur.test/api/attendance?classId=CLASS1&date=2026-10-30'));
  assert.equal(response.status, 403);
});
