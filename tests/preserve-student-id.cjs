const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source='src/app/api/students/preserve-id/route.ts';
function load(file,deps){
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',js)(name=>{
  if(Object.prototype.hasOwnProperty.call(deps,name)) return deps[name];
  throw Error('Unexpected dependency: '+name);
 },mod,mod.exports);return mod.exports;
}
function fixture(){
 const students=[{id:'DIT/STU/010',firstName:'Ada',lastName:'Obi',otherNames:null,dob:new Date('2013-01-20T00:00:00.000Z'),class:{name:'JSS1'}}];
 let created=0, reads=0, session={user:{id:'admin-1',role:'ADMIN'}};
 const db={student:{
  findMany:async ({where})=>{reads++; if(where.id)return students.filter(s=>s.id.toUpperCase()===where.id.equals.toUpperCase());
   return students.filter(s=>s.dob>=where.dob.gte&&s.dob<where.dob.lt);},
  create:async ({data})=>{created++;students.push({...data,class:{name:'JSS1'}});return {id:data.id};}
 },class:{findUnique:async ({where})=>where.id==='C1'?{id:'C1',name:'JSS1'}:null,findMany:async()=>[{id:'C1',name:'JSS1'}]},
 parent:{findUnique:async ({where})=>where.id==='P1'?{id:'P1',fullName:'Verified Parent',email:'guardian@example.test',students:[{id:'DIT/STU/010',firstName:'Ada',lastName:'Obi'}]}:null,findMany:async()=>[]}};
 db.$transaction=async callback=>callback(db);
 const route=load(source,{'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
  '@/auth':{auth:async()=>session},'@/lib/prisma':{prisma:db},
  '@/lib/permissions':{isSuperAdmin:s=>s?.user?.role==='ADMIN'&&s.user.id==='admin-1'}});
 return {route,students,get created(){return created;},get reads(){return reads;},setSession:s=>{session=s}};
}
const form={id:'DIT/STU/112',firstName:'Bola',lastName:'Okafor',dob:'2014-02-12',gender:'Female',classId:'C1',parentId:'P1'};
const post=(route,body,headers={})=>route.POST(new Request('https://school.test/api/students/preserve-id',{
 method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)
}));
test('ordinary staff cannot list options, preview, or create',async()=>{
 const f=fixture();f.setSession({user:{id:'STAFF1',role:'STAFF'}});
 assert.equal((await f.route.GET()).status,403);
 assert.equal((await post(f.route,{...form,action:'create',confirmed:true})).status,403);
 assert.equal(f.reads,0);assert.equal(f.created,0);
});
test('preview does not write; existing ID is blocked case-insensitively',async()=>{
 const f=fixture();const r=await post(f.route,{...form,id:'dit/stu/010',action:'preview'});
 assert.equal(r.status,200);const j=await r.json();assert.equal(j.data.id,'DIT/STU/010');
 assert.equal(j.data.canCreate,false);assert.equal(j.data.idMatches.length,1);assert.equal(f.created,0);
});
test('same-name same-birthday student under another ID is blocked',async()=>{
 const f=fixture();const r=await post(f.route,{...form,firstName:'Ada',lastName:'Obi',dob:'2013-01-20',action:'preview'});
 assert.equal((await r.json()).data.possibleDuplicates[0].id,'DIT/STU/010');
 assert.equal(f.created,0);
});
test('unverified Parent and missing class block creation',async()=>{
 const f=fixture();
 for(const payload of [{...form,parentId:'wrong'},{...form,classId:'wrong'}]){
  assert.equal((await (await post(f.route,{...payload,action:'preview'})).json()).data.canCreate,false);
 }
 assert.equal(f.created,0);
});
test('create requires explicit confirmation and rechecks within transaction',async()=>{
 const f=fixture();assert.equal((await post(f.route,{...form,action:'create'})).status,400);
 const preview=await (await post(f.route,{...form,action:'preview'})).json();assert.equal(preview.data.canCreate,true);
 const made=await post(f.route,{...form,action:'create',confirmed:true});assert.equal(made.status,201);
 assert.deepEqual(await made.json(),{success:true,data:{id:'DIT/STU/112',passwordIssued:false},message:'Student created with the original ID. No login password was issued.'});
 assert.equal(f.students.at(-1).password,null);assert.equal(f.students.at(-1).parentId,'P1');
 assert.equal(f.students.at(-1).mustChangePassword,true);
 const twice=await post(f.route,{...form,action:'create',confirmed:true});assert.equal(twice.status,409);
 assert.equal(f.created,1);
});
test('preview forbids invalid ID, DOB and cross-origin mutation',async()=>{
 const f=fixture();
 for(const input of [{...form,id:'Bad ID'}, {...form,dob:'2014-02-30'}, {...form,gender:'invalid'}])
  assert.equal((await post(f.route,{...input,action:'preview'})).status,400);
 assert.equal((await post(f.route,{...form,action:'create',confirmed:true},{origin:'https://other.test'})).status,403);
 assert.equal(f.created,0);
});
test('frontend has explicit single-student review and does not generate passwords',()=>{
 const page=fs.readFileSync('src/app/students/preserve-id/page.tsx','utf8');
 assert.match(page,/Preview duplicate checks/);
 assert.match(page,/No password is created/);
 assert.doesNotMatch(page,/newTemporaryPassword|prisma\.student\.create/);
});
