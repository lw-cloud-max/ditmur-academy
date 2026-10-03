const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, session, prisma) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  const perms = ts.transpileModule(fs.readFileSync('src/lib/permissions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const permissionModule = { exports: {} };
  new Function('require','module','exports',perms)(require,permissionModule,permissionModule.exports);
  const deps = { 'next/server': { NextResponse: { json: (body, opts) => Response.json(body,opts) } },
    '@/auth': { auth: async () => session }, '@/lib/prisma': { prisma }, '@/lib/permissions': permissionModule.exports };
  new Function('require','module','exports',js)(name => {
    if (!(name in deps)) throw Error('Unknown dependency ' + name);
    return deps[name];
  },mod,mod.exports);
  return mod.exports;
}
const request = (route, method = 'GET', body) => new Request('https://ditmur.test' + route, {
  method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
});
const admin = { user: { role: 'ADMIN', id: 'admin-1' } };
const teacher = { user: { role: 'STAFF', id: 'teacher-1' } };
const parent = { user: { role: 'PARENT', id: 'parent-1' } };
const student = { user: { role: 'STUDENT', id: 'STU1' } };
const classRoute = 'src/app/api/broadsheet/class/route.ts';
const gradeRoute = 'src/app/api/grades/route.ts';
const approvalRoute = 'src/app/api/report-releases/route.ts';

test('students and parents cannot see unapproved reports, including via direct API', async () => {
  const prisma = {
    student: { findUnique: async () => ({ classId: 'C1' }), findFirst: async () => ({ id: 'STU1' }),
      findMany: async () => { throw Error('Draft grade query should not run'); } },
    reportRelease: { findUnique: async () => null }
  };
  for (const user of [student, parent]) {
    const res = await load(classRoute,user,prisma).GET(request('/api/broadsheet/class?classId=C1&term=First%20Term%202026-2027'));
    assert.equal(res.status,403);
    assert.match((await res.json()).error,/awaiting approval/i);
  }
});

test('even after approval, students and parents receive only their own reports', async () => {
  const whereList = [];
  const prisma = {
    student: { findUnique: async () => ({ classId: 'C1' }), findFirst: async () => ({ id: 'STU1' }),
      findMany: async ({ where }) => { whereList.push(where); return []; } },
    class: { findUnique: async () => ({ id:'C1',name:'JSS 1' }) }, subject: { findMany: async () => [] },
    reportRelease: { findUnique: async () => ({ approvedAt: new Date() }) }
  };
  assert.equal((await load(classRoute,student,prisma).GET(request('/api/broadsheet/class?classId=C1'))).status,200);
  assert.equal((await load(classRoute,parent,prisma).GET(request('/api/broadsheet/class?classId=C1'))).status,200);
  assert.equal(whereList[0].id,'STU1');
  assert.equal(whereList[1].parentId,'parent-1');
});

test('teacher sees draft, but families cannot GET raw grades endpoint', async () => {
  const prisma = {
    reportRelease: { findUnique: async () => null },
    class: { findUnique: async () => ({ id:'C1',name:'JSS 1' }) }, subject: { findMany: async () => [] },
    student: { findMany: async () => [] }, grade: { findMany: async () => [] }
  };
  const response = await load(classRoute,teacher,prisma).GET(request('/api/broadsheet/class?classId=C1'));
  assert.equal(response.status,200);
  assert.equal((await response.json()).data.approved,false);
  assert.equal((await load(gradeRoute,parent,prisma).GET(request('/api/grades?classId=C1&subjectId=S1'))).status,403);
});

test('only super admin can release a class/term with existing grades', async () => {
  let change;
  const prisma = {
    class: { findUnique: async () => ({ id:'C1' }) }, grade: { count: async () => 3 },
    reportRelease: { upsert: async ({ update }) => { change=update; return { approvedAt: update.approvedAt }; } }
  };
  const req = request('/api/report-releases','POST',{classId:'C1',term:'First Term 2026-2027',approved:true});
  assert.equal((await load(approvalRoute,teacher,prisma).POST(req.clone())).status,403);
  assert.equal((await load(approvalRoute,admin,prisma).POST(req)).status,200);
  assert.ok(change.approvedAt instanceof Date);
  assert.equal(change.approvedBy,'admin-1');
});

test('saving grades reverts previously approved results to draft inside the same transaction', async () => {
  let release;
  const prisma = {
    class: { findUnique: async () => ({ id:'C1' }) }, subject: { findUnique: async () => ({ id:'S1' }) },
    student: { count: async () => 1 },
    $transaction: async callback => callback({
      grade: { upsert: async () => ({}) },
      reportRelease: { upsert: async ({ update }) => { release=update; return {}; } }
    })
  };
  const req = request('/api/grades','POST',{classId:'C1',subjectId:'S1',term:'First Term 2026-2027',
    grades:[{studentId:'STU1',ca1:10,ca2:10,exam:30,total:50,grade:'A'}]});
  const result = await load(gradeRoute,teacher,prisma).POST(req);
  assert.equal(result.status,200);
  assert.deepEqual(release,{approvedAt:null,approvedBy:null});
});

test('student dashboard returns no draft grades or derived average', async () => {
  const prisma = {
    student: { findUnique: async () => ({ id:'STU1',classId:'C1',grades:[{total:92,term:'First Term 2026-2027'}],
      cbtResults:[],internalResults:[] }) },
    reportRelease: { findMany: async () => [] }, internalExam: { findMany: async () => [] }
  };
  const out = await load('src/app/api/student-dashboard/route.ts',student,prisma)
    .GET(request('/api/student-dashboard?studentId=STU1'));
  assert.equal(out.status,200);
  const data=(await out.json()).data;
  assert.deepEqual(data.student.grades,[]);
  assert.equal(data.average,'0.0');
});

test('skill ratings stay staff-only and saving them withdraws approval', async () => {
  const file = 'src/app/api/skills/route.ts';
  assert.equal((await load(file,parent,{}).GET(request('/api/skills?classId=C1'))).status,403);
  let release;
  const prisma = { class: { findUnique: async () => ({ id:'C1' }) }, student: { count: async () => 1 },
    $transaction: async callback => callback({ skillRating: { upsert: async () => ({}) },
      reportRelease: { upsert: async ({ update }) => { release=update; return {}; } } })
  };
  const res = await load(file,teacher,prisma).POST(request('/api/skills','POST',{
    classId:'C1',term:'First Term 2026-2027',ratings:[{studentId:'STU1',name:'Punctuality',category:'AFFECTIVE',rating:4}]
  }));
  assert.equal(res.status,200);
  assert.deepEqual(release,{approvedAt:null,approvedBy:null});
});

test('Hall of Fame cannot reveal an unapproved subject mark in awards or averages', async () => {
  const prisma = {
    student: { findMany: async () => [{ id:'STU1',firstName:'Ada',lastName:'Bello',classId:'C1',class:{name:'JSS 1'},
      grades:[{total:99,term:'First Term 2026-2027',subject:{name:'Mathematics'}}],
      cbtResults:[],internalResults:[],behaviorRecords:[] }] },
    reportRelease: { findMany: async () => [] }
  };
  const res = await load('src/app/api/hall-of-fame/route.ts',student,prisma).GET();
  assert.equal(res.status,200);
  const result = (await res.json()).data[0];
  assert.equal(result.averageGrade,0);
  assert.equal(result.badges.some(badge => badge.name === 'Math Whiz' || badge.name === 'Scholar'),false);
});
