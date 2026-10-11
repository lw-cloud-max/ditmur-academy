import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('login displays the same official asset in light badges, without dark blend or cropping',()=>{
 const login=fs.readFileSync('src/app/login/page.tsx','utf8');
 assert.equal((login.match(/src="\/logo\.jpg"/g)||[]).length,2);
 assert.doesNotMatch(login,/mix-blend-multiply/);
 assert.match(login,/w-36 h-36[^"\n]*mx-auto[^"\n]*bg-white/);
 assert.match(login,/w-24 h-24 lg:w-28 lg:h-28[^"\n]*bg-white/);
 assert.match(login,/flex flex-col items-center gap-3 text-center/);
 assert.equal((login.match(/object-contain/g)||[]).length,2);
 const img=fs.statSync('public/logo.jpg');assert.ok(img.size>10_000);
});
