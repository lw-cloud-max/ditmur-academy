const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, deps = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function('require','module','exports',js)(name => {
    if (Object.hasOwn(deps, name)) return deps[name];
    throw Error('Unexpected dependency ' + name);
  }, mod, mod.exports);
  return mod.exports;
}
const permissions = load('src/lib/permissions.ts');
const next = { NextResponse: {
  json: (body, opts) => Response.json(body, opts),
  next: () => new Response('allowed'),
  redirect: url => new Response(null, { status: 307, headers: { location: String(url) } })
} };
const admin = { user: { id: 'admin-1', role: 'ADMIN', mustChangePassword: false } };
const teacher = { user: { id: 'STF-T', role: 'STAFF', staffRole: 'TEACHER', mustChangePassword: false, sessionVersion: 1 } };
const combined = { user: { id: 'STF-A', role: 'STAFF', staffRole: 'ACCOUNTANT_TEACHER', mustChangePassword: false, sessionVersion: 2 } };
const req = (path, method, data) => new Request('https://school.test' + path, {
  method, ...(data ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) } : {})
});
function route(path, session, prisma = {}) {
  return load(path, { 'next/server': next, '@/lib/prisma': { prisma }, '@/auth': { auth: async () => session },
    '@/lib/permissions': permissions });
}

test('teacher AND accountant-teacher cannot create classes, events, promote students, or assign teachers', async () => {
  for (const session of [teacher, combined]) {
    assert.equal((await route('src/app/api/classes/route.ts', session).POST(req('/api/classes','POST',{name:'Grade 3',level:'Primary'}))).status, 403);
    assert.equal((await route('src/app/api/classes/route.ts', session).DELETE(req('/api/classes?id=any','DELETE'))).status, 403);
    assert.equal((await route('src/app/api/calendar/route.ts', session).POST(req('/api/calendar','POST',{title:'Event',date:'2026-10-01'}))).status, 403);
    assert.equal((await route('src/app/api/calendar/route.ts', session).DELETE(req('/api/calendar?id=any','DELETE'))).status, 403);
    assert.equal((await route('src/app/api/students/promote/route.ts', session).POST(req('/api/students/promote','POST',{studentIds:['S1'],targetClassId:'C1'}))).status, 403);
    assert.equal((await route('src/app/api/classes/assign-teacher/route.ts', session).PATCH(req('/api/classes/assign-teacher','PATCH',{classId:'C1',teacherId:'STF-T'}))).status, 403);
  }
});

test('super admin can assign active dual-role teacher to a class', async () => {
  const prisma = {
    staff: { findUnique: async () => ({ role: 'ACCOUNTANT_TEACHER', status: 'ACTIVE' }) },
    class: { update: async ({data}) => ({ id:'C1', teacherId:data.teacherId }) }
  };
  const out = await route('src/app/api/classes/assign-teacher/route.ts', admin, prisma)
    .PATCH(req('/api/classes/assign-teacher','PATCH',{classId:'C1',teacherId:'STF-A'}));
  assert.equal(out.status, 200);
  assert.equal((await out.json()).data.teacherId, 'STF-A');
});

test('teachers can still read the calendar and classes', async () => {
  const events = await route('src/app/api/calendar/route.ts', teacher,
    { calendarEvent: { findMany: async () => [] } }).GET();
  assert.equal(events.status, 200);
  const classes = await route('src/app/api/classes/route.ts', combined,
    { class: { findMany: async () => [] }, student: { groupBy: async () => [] } }).GET();
  assert.equal(classes.status, 200);
});

test('configuration and assessment-format pages are denied to teachers but teaching and finance remain for the designated accountant', async () => {
  const proxy = load('src/proxy.ts', { 'next/server': next, '@/auth': { auth: async () => combined },
    '@/lib/prisma': { prisma: { staff: { findUnique: async () => ({ status: 'ACTIVE', role: 'ACCOUNTANT_TEACHER', sessionVersion: 2 }) } } }
  }).proxy;
  const request = path => ({ nextUrl: { pathname: path }, url: 'https://school.test' + path, method: 'GET' });
  for (const path of ['/configuration', '/assessment-format']) {
    const out = await proxy(request(path));
    assert.equal(out.status, 307);
    assert.match(out.headers.get('location'), /access-denied/);
  }
  assert.equal((await proxy(request('/lesson-notes'))).status, 200);
  assert.equal((await proxy(request('/payments'))).status, 200);
});
