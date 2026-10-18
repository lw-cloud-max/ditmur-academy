import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadRoute(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in dependencies) return dependencies[name];
    throw Error(`Unexpected dependency: ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
function fixture(role = 'STAFF') {
  let updated;
  const route = loadRoute('src/app/api/internal-question-bank/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/auth': { auth: async () => ({ user: { role, id: 'staff-1' } }) },
    '@/lib/prisma': { prisma: { internalQuestionBank: { update: async input => {
      updated = input; return { id: input.where.id, ...input.data };
    } } } }
  });
  return { route, get updated() { return updated; } };
}
const patch = (route, body) => route.PATCH(new Request('https://school.test/api/internal-question-bank', {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
}));
test('question edit strips nested relations and timestamps; saves only editable fields', async () => {
  const f = fixture();
  const response = await patch(f.route, { id: 'question-1', text: 'Which is correct?', optionA: 'A',
    optionB: 'B', optionC: 'C', optionD: 'D', correctAnswer: 'b',
    explanation: '', topic: 'Revision', difficulty: 'MEDIUM',
    subject: { id: 'subject-1', name: 'Math' }, class: { id: 'class-1' }, createdAt: '2026-01-01',
    studentId: 'STU-OTHER' });
  assert.equal(response.status, 200);
  assert.equal(f.updated.where.id, 'question-1');
  assert.deepEqual(Object.keys(f.updated.data).sort(),
    ['text', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'topic', 'difficulty'].sort());
  assert.equal(f.updated.data.correctAnswer, 'B');
  assert.equal(f.updated.data.explanation, null);
});
test('question edit requires staff and rejects invalid or non-editable payloads', async () => {
  assert.equal((await patch(fixture('PARENT').route, { id: 'q', text: 'Change' })).status, 401);
  const f = fixture();
  assert.equal((await patch(f.route, { id: 'q', correctAnswer: 'Z' })).status, 400);
  assert.equal((await patch(f.route, { id: 'q', subject: { id: 'other' } })).status, 400);
  assert.equal(f.updated, undefined);
});
test('flashcards use the separate general bank, not graded exam answers', () => {
  const study = fs.readFileSync('src/app/study-hub/page.tsx', 'utf8');
  assert.match(study, /fetch\(`\/api\/question-bank\?subjectId=/);
  assert.doesNotMatch(study, /fetch\(`\/api\/internal-question-bank\?subjectId=/);
  assert.match(study, /Graded Internal Exam questions and answer keys are not shown here/);
});
test('public school contact links and Early Years language are consistent', () => {
  const terms = fs.readFileSync('src/app/terms/page.tsx', 'utf8');
  const apply = fs.readFileSync('src/app/apply/page.tsx', 'utf8');
  const home = fs.readFileSync('src/app/page.tsx', 'utf8');
  const early = fs.readFileSync('src/app/programs/creche/page.tsx', 'utf8');
  for (const file of [terms, apply, home]) {
    assert.match(file, /tel:\+2348038164705/);
    assert.match(file, /https:\/\/wa\.me\/2349018009872/);
  }
  assert.match(terms, /11, Adeshina Close Off Pipeline, Ishasi Akute, Ogun State/);
  assert.doesNotMatch(terms, /info@ditmuracademy\.edu\.ng|123 Academy Road/);
  for (const file of [home, apply, early]) assert.match(file, /Early Years/);
  assert.match(home, /href="\/programs\/creche"/);
  assert.match(early, /src="\/images\/creche\//);
});
