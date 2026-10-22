import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadRoute(file, deps) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in deps) return deps[name];
    throw Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
const next = { NextResponse: { json: (value, options) => Response.json(value, options) } };
const request = (url, body) => new Request(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const session = (role, id, staffRole) => ({ user: { role, id, staffRole } });
const isSuperAdmin = s => s?.user?.role === 'ADMIN' && s.user.id === 'admin-1';
function manageFixture({ actor=session('STAFF','teacher-1','TEACHER'), classTeacher='teacher-1', student={id:'STU-1',status:'ACTIVE',classId:'CLASS-1',parentId:'P-OLD'}, history=[0,0,0,0,0,0,0,0]}={}) {
  const calls=[];
  const prisma={student:{findUnique:async()=>student,update:async q=>{calls.push(['update',q]);return q.data},updateMany:async q=>{calls.push(['updateMany',q]);return {count:1}}},
    class:{findUnique:async ({where})=>where.id==='CLASS-2'?{id:'CLASS-2',name:'Primary 4'}:{id:student.classId,name:'Primary 3',teacherId:classTeacher}},
    parent:{findUnique:async ({where})=>where.id==='P-NEW'?{id:'P-NEW'}:null},
    grade:{count:async()=>history[0]},skillRating:{count:async()=>history[1]},attendance:{count:async()=>history[2]},
    internalResult:{count:async()=>history[3]},cBTResult:{count:async()=>history[4]},internalExamAttempt:{count:async()=>history[5]},
    behaviorRecord:{count:async()=>history[6]},invoice:{count:async()=>history[7]}};
  const route=loadRoute('src/app/api/students/route.ts',{
    'next/server':next,'@/auth':{auth:async()=>actor},'@/lib/prisma':{prisma},'@/lib/permissions':{isSuperAdmin}
  });
  return {route,calls};
}
function optionsFixture({actor=session('STAFF','teacher-1','TEACHER'),classTeacher='teacher-1'}={}){
  let parentQuery;
  const prisma={student:{findUnique:async()=>({id:'STU-1',status:'ACTIVE',classId:'CLASS-1'})},
    class:{findUnique:async()=>({teacherId:classTeacher})},
    parent:{findMany:async q=>{parentQuery=q;return [{id:'P-1',fullName:'Guardian',email:'g@example.test',phone:'08012345678',students:[]}]}}};
  const route=loadRoute('src/app/api/students/parent-options/route.ts',{
    'next/server':next,'@/auth':{auth:async()=>actor},'@/lib/prisma':{prisma},'@/lib/permissions':{isSuperAdmin}
  });
  return {route,get parentQuery(){return parentQuery}};
}
test('assigned class teacher can link only an existing Parent record, leaving other relations untouched',async()=>{
 const f=manageFixture();
 const res=await f.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'link_parent',parentId:'P-NEW',expectedParentId:'P-OLD',confirmed:true}));
 assert.equal(res.status,200);assert.deepEqual(f.calls,[['updateMany',{where:{id:'STU-1',status:'ACTIVE',classId:'CLASS-1',parentId:'P-OLD'},data:{parentId:'P-NEW'}}]]);
 assert.equal(res.headers.get('cache-control'),'no-store');
});
test('parent linking is blocked for inactive/out-of-class students, non-teachers and nonexistent Parent IDs',async()=>{
 const unauthorized=manageFixture({actor:session('STAFF','other-teacher','TEACHER'),classTeacher:'teacher-1'});
 assert.equal((await unauthorized.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'link_parent',parentId:'P-NEW',expectedParentId:'P-OLD',confirmed:true}))).status,403);
 assert.equal(unauthorized.calls.length,0);
 const support=manageFixture({actor:session('STAFF','teacher-1','SUPPORT')});
 assert.equal((await support.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'link_parent',parentId:'P-NEW',expectedParentId:'P-OLD',confirmed:true}))).status,403);
 const absent=manageFixture();
 assert.equal((await absent.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'link_parent',parentId:'P-NO',expectedParentId:'P-OLD',confirmed:true}))).status,404);
 const inactive=manageFixture({student:{id:'STU-1',status:'INACTIVE',classId:'CLASS-1',parentId:'P-OLD'}});
 assert.equal((await inactive.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'link_parent',parentId:'P-NEW',expectedParentId:'P-OLD',confirmed:true}))).status,404);
});
test('Parent search requires a class teacher assignment and returns contact/linked-child preview without secrets',async()=>{
 const f=optionsFixture();
 const response=await f.route.GET(new Request('https://school.test/api/students/parent-options?studentId=STU-1&search=Guardian'));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control').includes('no-store'),true);
 const body=await response.json();assert.equal(body.data[0].id,'P-1');assert.equal(body.data[0].phone,'08012345678');assert.equal('password' in body.data[0],false);
 assert.deepEqual(f.parentQuery.where.OR.map(x=>Object.keys(x)[0]),['fullName','email','phone']);assert.equal(f.parentQuery.take,25);
 const wrong=optionsFixture({actor:session('STAFF','other','TEACHER'),classTeacher:'teacher-1'});
 assert.equal((await wrong.route.GET(new Request('https://school.test/api/students/parent-options?studentId=STU-1&search=Guardian'))).status,403);
});

test('a stale expected Parent ID cannot overwrite a newer Parent link', async () => {
 const f=manageFixture({actor:session('ADMIN','admin-1')});
 const response=await f.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'link_parent',parentId:'P-NEW',expectedParentId:'P-STALE',confirmed:true}));
 assert.equal(response.status,409);assert.equal(f.calls.length,0);
});
test('superadmin class move warns when history exists and moves only after confirmation',async()=>{
 const f=manageFixture({actor:session('ADMIN','admin-1'),history:[2,0,3,0,0,0,0,1]});
 const body={id:'STU-1',action:'assign_class',classId:'CLASS-2',expectedClassId:'CLASS-1',confirmed:true};
 const preview=await f.route.PATCH(request('https://school.test/api/students',body));
 assert.equal(preview.status,409);const result=await preview.json();assert.equal(result.needsHistoryConfirmation,true);assert.equal(result.historyCounts.grades,2);assert.equal(f.calls.length,0);
 const moved=await f.route.PATCH(request('https://school.test/api/students',{...body,historyConfirmed:true}));
 assert.equal(moved.status,200);assert.deepEqual(f.calls,[['updateMany',{where:{id:'STU-1',status:'ACTIVE',classId:'CLASS-1'},data:{classId:'CLASS-2'}}]]);
});
test('only superadmin can move class or edit student profile; active/current class is guarded',async()=>{
 const teacher=manageFixture();
 assert.equal((await teacher.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'assign_class',classId:'CLASS-2',expectedClassId:'CLASS-1',confirmed:true}))).status,403);
 assert.equal((await teacher.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'update_student',firstName:'New',lastName:'Name',dob:'2015-01-01',gender:'Male'}))).status,403);
 const admin=manageFixture({actor:session('ADMIN','admin-1')});
 assert.equal((await admin.route.PATCH(request('https://school.test/api/students',{id:'STU-1',action:'assign_class',classId:'CLASS-2',expectedClassId:'OLD',confirmed:true}))).status,409);
});
test('the student edit UI uses JSON-safe error handling, chooses an existing Parent and limits class/edit actions to superadmin',()=>{
 const page=fs.readFileSync('src/app/students/page.tsx','utf8');
 assert.match(page,/const raw = await response\.text\(\)/);assert.match(page,/parent-options\?/);
 assert.match(page,/Link Existing Parent/);assert.ok(page.includes('student.class?.teacherId === session?.user?.id'));
 assert.ok(page.includes("isSuperAdmin && <button onClick={() => openModal(student, 'class')}"));
 assert.match(page,/Student status is managed separately/);
});
test('flashcards explicitly use the general practice bank, not internal graded exam answers',()=>{
 const page=fs.readFileSync('src/app/study-hub/page.tsx','utf8');
 assert.match(page,/fetch\(`\/api\/question-bank\?subjectId=/);
 assert.doesNotMatch(page,/fetch\(`\/api\/internal-question-bank\?subjectId=/);
 assert.match(page,/Graded Internal Exam questions and answer keys are not shown here/);
});
