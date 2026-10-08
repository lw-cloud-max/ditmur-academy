const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file) {
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020, esModuleInterop:true } }).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',js)(name => {
    if(name==='next/server') return {NextResponse:{json:(body,opts)=>Response.json(body,opts)}};
    throw Error('Unexpected dependency '+name);
  },mod,mod.exports);
  return mod.exports;
}
for(const file of ['src/app/api/messaging/route.ts','src/app/api/ai/messaging/route.ts']){
  test(file+' refuses broadcasts without sending or logging', async()=>{
    const source=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(source,/console\.log|fetch\(|prisma\.|setTimeout/);
    const res=await load(file).POST(new Request('https://school.test/'+file,{method:'POST',body:JSON.stringify({message:'PRIVATE SCHOOL DATA'})}));
    assert.equal(res.status,503);
    assert.equal((await res.json()).success,false);
    assert.equal(res.headers.get('cache-control'),'no-store');
  });
}
test('broadcast page cannot show a compose/send form',()=>{
  const page=fs.readFileSync('src/app/messaging/page.tsx','utf8');
  assert.match(page,/Broadcast messaging is not available/);
  assert.doesNotMatch(page,/<form|handleSendMessage|usePaystackPayment/);
});
