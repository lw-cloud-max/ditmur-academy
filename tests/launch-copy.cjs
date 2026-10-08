const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('public launch copy is consistent with admissions enquiry and disabled payments',()=>{
  const home=fs.readFileSync('src/app/page.tsx','utf8');
  const login=fs.readFileSync('src/app/login/page.tsx','utf8');
  assert.match(home,/provides a caring education/);
  assert.match(home,/Ask About Admissions <ArrowRight/);
  assert.doesNotMatch(home,/Apply Now|a a caring education|1,000 students|30\+ dedicated teachers/);
  assert.doesNotMatch(login,/automated fee processing/);
  assert.match(login,/learning tools/);
});
