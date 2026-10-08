const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps) {
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020, esModuleInterop:true } }).outputText;
  const mod = { exports:{} };
  new Function('require','module','exports',js)(name => {
    if (name in deps) return deps[name];
    throw Error('Unexpected dependency: '+name);
  },mod,mod.exports);
  return mod.exports;
}
test('public application POST rejects all references without creating paid records', async () => {
  const route=load('src/app/api/apply/route.ts', {
    'next/server': { NextResponse:{ json: (body,options) => Response.json(body,options) } }
  });
  const r=await route.POST(new Request('https://school.test/api/apply',{method:'POST',body:JSON.stringify({reference:'fake'})}));
  assert.equal(r.status,503);
  assert.equal((await r.json()).success,false);
  assert.equal(r.headers.get('cache-control'),'no-store');
});
test('public admissions page contains contact instructions but no active payment flow', () => {
  const page=fs.readFileSync('src/app/apply/page.tsx','utf8');
  assert.match(page,/Online application payments are not active/);
  assert.doesNotMatch(page,/usePaystackPayment|pk_test_mock_key|Pay Application Fee/);
});
test('homepage has no false figures or unverified named testimonials', () => {
  const page=fs.readFileSync('src/app/page.tsx','utf8');
  for (const claim of ['1,000 students','30+ dedicated teachers','Mrs. Adebayo','Mr. Okonkwo','Mrs. Fatima','APPLY ONLINE'])
    assert.equal(page.includes(claim),false,claim);
  assert.match(page,/Cultivating/);
  assert.match(page,/Admissions/);
});
