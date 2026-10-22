import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadRoute() {
  const source = fs.readFileSync('src/app/api/internal-exams/questions/route.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  let role = 'STAFF', updated;
  const prisma = { internalQuestion: {
    findUnique: async ({where}) => where.id === 'Q1' ? { id: 'Q1', examId: 'E1' } : null,
    update: async input => { updated = input; return { id: input.where.id, ...input.data }; }
  } };
  const mod = { exports: {} };
  const deps = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/auth': { auth: async () => ({ user: { role, id: 'T1' } }) }, '@/lib/prisma': { prisma }
  };
  new Function('require','module','exports',js)(name=>{ if(name in deps)return deps[name];throw Error(`Unexpected ${name}`); },mod,mod.exports);
  return { route: mod.exports, setRole: value => { role = value; }, get updated() { return updated; } };
}
const request = body => new Request('https://school.test/api/internal-exams/questions', {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
});
test('internal exam question PATCH ignores unrelated GET fields and updates only editable question data', async () => {
  const f=loadRoute();
  const response=await f.route.PATCH(request({ id:'Q1', text:'Updated question', optionA:'One', optionB:'Two', optionC:'Three', optionD:'Four', correctAnswer:'b', marks:'2', examId:'OTHER', createdAt:'2020-01-01', exam:{id:'OTHER'} }));
  assert.equal(response.status,200);
  assert.deepEqual(f.updated,{where:{id:'Q1'},data:{text:'Updated question',optionA:'One',optionB:'Two',optionC:'Three',optionD:'Four',correctAnswer:'B',marks:2}});
});
test('internal exam question edit validates role, ID, answer and marks',async()=>{
 const f=loadRoute();f.setRole('STUDENT');assert.equal((await f.route.PATCH(request({id:'Q1',text:'x'}))).status,403);
 f.setRole('STAFF');assert.equal((await f.route.PATCH(request({id:'missing',text:'x'}))).status,404);
 assert.equal((await f.route.PATCH(request({id:'Q1',correctAnswer:'X'}))).status,400);
 assert.equal((await f.route.PATCH(request({id:'Q1',marks:-1}))).status,400);
});
test('edit form sends explicit allowlisted fields and handles failed HTTP/JSON responses',()=>{
 const page=fs.readFileSync('src/app/internal-exams/[id]/page.tsx','utf8');
 assert.match(page,/JSON\.stringify\(\{ id: editQ\.id, text: editQ\.text/);
 assert.match(page,/if \(!res\.ok \|\| data\.success !== true\)/);
 assert.match(page,/Unexpected server response/);
});
