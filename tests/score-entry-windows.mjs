import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(file, deps) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name in deps) return deps[name];
    throw Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
const helper = load('src/lib/score-entry-window.ts', {
  '@/lib/prisma': { prisma: { scoreEntryWindow: { findUnique: async () => null } } }
});
const staff = { user: { id: 'staff-1', role: 'STAFF' } };
const admin = { user: { id: 'admin-1', role: 'ADMIN' } };
const response = (body, options) => Response.json(body, options);

test('WAT local form values convert to UTC+1 and invalid calendar dates are rejected', () => {
  assert.equal(helper.parseWATDateTime('2026-10-26T09:30')?.toISOString(), '2026-10-26T08:30:00.000Z');
  assert.equal(helper.parseWATDateTime('2026-02-31T09:30'), null);
  assert.equal(helper.parseWATDateTime('2026-10-26T09:30Z'), null);
  assert.equal(helper.formatWATInput('2026-10-26T08:30:00.000Z'), '2026-10-26T09:30');
});
test('scheduled window opens inclusively and closes after deadline; reopened windows are bounded', () => {
  const config={opensAt:new Date('2026-10-26T08:00:00Z'),closesAt:new Date('2026-10-26T12:00:00Z'),reopenUntil:null};
  assert.equal(helper.makeScoreEntryStatus('First Term 2026-2027',config,new Date('2026-10-26T08:00:00Z')).isOpen,true);
  const closed=helper.makeScoreEntryStatus('First Term 2026-2027',config,new Date('2026-10-26T12:01:00Z'));
  assert.equal(closed.isOpen,false);assert.equal(closed.canReopen,true);
  const reopened=helper.makeScoreEntryStatus('First Term 2026-2027',{...config,reopenUntil:new Date('2026-10-27T12:00:00Z')},new Date('2026-10-26T13:00:00Z'));
  assert.equal(reopened.isOpen,true);assert.equal(reopened.isReopened,true);
});
function loadWindowApi({session=staff,record=null}={}) {
  let written;
  const db={academicTerm:{findMany:async()=>[{name:'First Term',session:'2026-2027'}]},scoreEntryWindow:{findUnique:async()=>record,upsert:async args=>{written=args;return {opensAt:args.create?.opensAt||args.update.opensAt,closesAt:args.create?.closesAt||args.update.closesAt,reopenUntil:null};},update:async args=>{written=args;return {opensAt:record.opensAt,closesAt:record.closesAt,reopenUntil:args.data.reopenUntil};}}};
  const route=load('src/app/api/score-entry-windows/route.ts',{
    'next/server':{NextResponse:{json:response}}, '@/auth':{auth:async()=>session}, '@/lib/prisma':{prisma:db},
    '@/lib/permissions':{isSuperAdmin:s=>s?.user?.id==='admin-1'&&s.user.role==='ADMIN'},
    '@/lib/score-entry-window':helper
  });
  return {route,get written(){return written}};
}
const post=(route,body)=>route.POST(new Request('https://school.test/api/score-entry-windows',{method:'POST',headers:{'content-type':'application/json',origin:'https://school.test'},body:JSON.stringify(body)}));
test('only super admin can configure window; schedule is stored with Nigeria WAT offset',async()=>{
 const denied=loadWindowApi({session:staff});assert.equal((await post(denied.route,{action:'SET_WINDOW',term:'First Term 2026-2027',opensAtLocal:'2026-10-26T09:00',closesAtLocal:'2026-10-26T15:00'})).status,403);
 const f=loadWindowApi({session:admin});const result=await post(f.route,{action:'SET_WINDOW',term:'First Term 2026-2027',opensAtLocal:'2026-10-26T09:00',closesAtLocal:'2026-10-26T15:00'});
 assert.equal(result.status,200);assert.equal(f.written.create.opensAt.toISOString(),'2026-10-26T08:00:00.000Z');assert.equal(f.written.create.closesAt.toISOString(),'2026-10-26T14:00:00.000Z');
});
test('temporary reopen requires a closed configured window, a short WAT expiry and an audit reason', async () => {
  const oldRecord={opensAt:new Date('2020-01-01T00:00:00.000Z'),closesAt:new Date('2020-01-02T00:00:00.000Z'),reopenUntil:null};
  const f=loadWindowApi({session:admin,record:oldRecord});
  const reopenUntilLocal=helper.formatWATInput(new Date(Date.now()+2*24*60*60*1000));
  const response=await post(f.route,{action:'REOPEN',term:'First Term 2026-2027',reopenUntilLocal,reason:'Correct reviewed grade entries'});
  assert.equal(response.status,200);
  assert.equal(f.written.data.reopenReason,'Correct reviewed grade entries');
  assert.equal(f.written.data.reopenedBy,'admin-1');
  const far=helper.formatWATInput(new Date(Date.now()+20*24*60*60*1000));
  assert.equal((await post(f.route,{action:'REOPEN',term:'First Term 2026-2027',reopenUntilLocal:far,reason:'Too long reopening'})).status,400);
});
test('score APIs fail closed when term window is not configured and do not write scores',async()=>{
 const closed=async term=>({term,configured:false,isOpen:false,isReopened:false,canReopen:false,opensAt:null,closesAt:null,reopenUntil:null,reason:'No score window; locked',serverNow:new Date().toISOString()});
 let touched=false;
 const deps={'next/server':{NextResponse:{json:response}},'@/auth':{auth:async()=>staff},'@/lib/score-entry-window':{getScoreEntryStatus:closed},
   '@/lib/prisma':{prisma:new Proxy({}, {get:()=>async()=>{touched=true;return {count:1};}})}};
 for(const [file,body] of [
  ['src/app/api/grades/route.ts',{subjectId:'SUB',classId:'CLASS',term:'First Term 2026-2027',grades:[{studentId:'S1',ca1:1,ca2:1,exam:1}]}],
  ['src/app/api/skills/route.ts',{classId:'CLASS',term:'First Term 2026-2027',ratings:[{studentId:'S1',name:'Soccer',category:'PHYSICAL',rating:4}]}]
 ]){
  const route=load(file,deps);const res=await route.POST(new Request('https://school.test/api/entry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
  assert.equal(res.status,423,file);assert.equal((await res.json()).error,'No score window; locked');
 }
 assert.equal(touched,false);
});
test('schema and configuration expose one whole-school per-term window without reusing term dates', () => {
  const schema=fs.readFileSync('prisma/schema.prisma','utf8');
  const config=fs.readFileSync('src/app/configuration/page.tsx','utf8');
  assert.equal((schema.match(/model ScoreEntryWindow \{/g)||[]).length,1);
  assert.equal((config.match(/Whole-school score-entry window/g)||[]).length,1);
  assert.match(config,/Entry opens \(WAT\)/); assert.match(config,/Entry closes \(WAT\)/);
  assert.match(config,/REOPEN/); assert.match(config,/reason/);
  assert.match(schema,/startDate\s+DateTime\?/); assert.match(schema,/endDate\s+DateTime\?/);
});
test('broadsheet and class skill entry UI explain deadline and disable writes when closed',()=>{
 const broadsheet=fs.readFileSync('src/app/broadsheet/page.tsx','utf8');
 const classPage=fs.readFileSync('src/app/classes/[id]/page.tsx','utf8');
 const config=fs.readFileSync('src/app/configuration/page.tsx','utf8');
 assert.match(broadsheet,/disabled=\{saving \|\| students\.length === 0 \|\| !scoreEntryOpen\}/);
 assert.match(broadsheet,/disabled=\{!scoreEntryOpen\}/);
 assert.match(classPage,/disabled=\{savingSkills \|\| !scoreEntryOpen\}/);
 assert.match(classPage,/disabled=\{!scoreEntryOpen\}/);
 assert.match(config,/Whole-school score-entry window/);
 assert.match(config,/Entry opens \(WAT\)/);assert.match(config,/Entry closes \(WAT\)/);
 assert.match(config,/Reopen temporarily/);assert.match(config,/End temporary reopening now/);
});
