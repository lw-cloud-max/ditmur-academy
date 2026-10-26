import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadRoute(file, deps) {
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
const admin={user:{id:'admin-1',role:'ADMIN'}};
const req=body=>new Request('https://school.test/api/parent-households',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
function householdFixture() {
  const parents=[
    {id:'P1',fullName:'Guardian One',email:' SHARED@example.test ',phone:'08012345678',students:[{id:'S1',firstName:'Child',lastName:'One'}],_count:{tickets:1,conversations:0,smsNotifications:1}},
    {id:'P2',fullName:'Guardian One',email:'shared@example.test',phone:'+234 801 234 5678',students:[{id:'S2',firstName:'Child',lastName:'Two'}],_count:{tickets:0,conversations:2,smsNotifications:0}},
    {id:'P3',fullName:'Other Guardian',email:'shared@example.test',phone:'08033333333',students:[{id:'S3',firstName:'Child',lastName:'Three'}],_count:{tickets:0,conversations:0,smsNotifications:0}},
    {id:'P4',fullName:'Missing email',email:null,phone:'08012345678',students:[{id:'S4',firstName:'Child',lastName:'Four'}],_count:{tickets:0,conversations:0,smsNotifications:0}}
  ];
  let moved;
  const db={parent:{findMany:async()=>parents},student:{updateMany:async input=>{moved=input;return {count:input.where.id.in.length}}}};
  db.$transaction=async fn=>fn(db);
  const route=loadRoute('src/app/api/parent-households/route.ts',{
    'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    '@/auth':{auth:async()=>admin},'@/lib/prisma':{prisma:db},'@/lib/permissions':{isSuperAdmin:session=>session?.user?.id==='admin-1'&&session.user.role==='ADMIN'}
  });
  return {route,get moved(){return moved}};
}
test('household candidates require exact normalized email AND phone and exclude single-contact matches',async()=>{
 const f=householdFixture();const response=await f.route.GET();assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.data.length,1);assert.equal(result.data[0].parents.length,2);
 assert.deepEqual(result.data[0].parents.map(p=>p.id),['P1','P2']);
 assert.equal(result.summary.activeChildren,2);assert.equal(result.data[0].parents[0]._count.tickets,1);
 assert.equal(response.headers.get('cache-control').includes('no-store'),true);
});
test('only selected active students move, contacts/historical Parent records stay intact',async()=>{
 const f=householdFixture();const response=await f.route.POST(req({keeperId:'P1',studentIds:['S2'],confirmed:true}));
 assert.equal(response.status,200);assert.deepEqual(f.moved,{where:{id:{in:['S2']},status:'ACTIVE',parentId:{in:['P2']}},data:{parentId:'P1'}});
 const data=await response.json();assert.equal(data.data.linkedCount,1);assert.equal(data.data.preservedTicketCount,1);assert.equal(data.data.preservedConversationCount,2);
});
test('no auto-link, bad confirmation, cross-group student or non-admin can write',async()=>{
 const f=householdFixture();assert.equal((await f.route.POST(req({keeperId:'P1',studentIds:['S2']}))).status,400);
 assert.equal((await f.route.POST(req({keeperId:'P1',studentIds:['S3'],confirmed:true}))).status,409);
 assert.equal(f.moved,undefined);
 const denied=loadRoute('src/app/api/parent-households/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
  '@/auth':{auth:async()=>({user:{id:'teacher-1',role:'STAFF'}})},
  '@/lib/prisma':{prisma:{parent:{findMany:async()=>{throw Error('must not query')}}}},
  '@/lib/permissions':{isSuperAdmin:()=>false}
 });
 assert.equal((await denied.GET()).status,403);assert.equal((await denied.POST(req({keeperId:'P1',studentIds:['S2'],confirmed:true}))).status,403);
});
test('reconciliation screen requires super admin, a chosen keeper and explicit confirmation',()=>{
 const ui=fs.readFileSync('src/app/parent-households/page.tsx','utf8');
 assert.match(ui,/exact matching email AND phone/);
 assert.match(ui,/window\.confirm\(`Link/);
 assert.match(ui,/No one is linked automatically|No one is linked automatically/i);
 assert.match(ui,/Parent-specific tickets\/chats\/SMS history stays with its original account/);
 const parents=fs.readFileSync('src/app/parents/page.tsx','utf8');assert.match(parents,/Review possible sibling households/);
});
