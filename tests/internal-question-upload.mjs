import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/lib/internal-question-upload.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { parseInternalQuestionUpload } = mod.exports;

test('six-field pipe rows and optional header import without optional metadata', () => {
  const result = parseInternalQuestionUpload('\uFEFFQuestion | Option A | Option B | Option C | Option D | Correct Answer\r\nWhat is 2 + 2? | 3 | 4 | 5 | 6 | b\r\nWhich is blue? | Red | Blue | Green | Gold | B');
  assert.deepEqual(result.errors, []);
  assert.equal(result.questions.length, 2);
  assert.deepEqual(result.questions[0], { text: 'What is 2 + 2?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correctAnswer: 'B' });
  assert.equal('explanation' in result.questions[0], false);
  assert.equal('topic' in result.questions[0], false);
  assert.equal('difficulty' in result.questions[0], false);
});
test('reject entire paste on malformed row, empty option or invalid answer', () => {
  assert.match(parseInternalQuestionUpload('Q | A | B | C | D | B | explanation').errors[0], /six fields/);
  assert.match(parseInternalQuestionUpload('Q | A | | C | D | B').errors[0], /four options/);
  assert.match(parseInternalQuestionUpload('Q | A | B | C | D | X').errors[0], /A, B, C or D/);
  assert.ok(parseInternalQuestionUpload(' ').errors.length);
});
test('bulk form uses new parser and requires explicit subject, without changing manual fields', () => {
  const page = fs.readFileSync('src/app/internal-question-bank/page.tsx', 'utf8');
  assert.match(page, /parseInternalQuestionUpload\(bulkCsv\)/);
  assert.match(page, /Select a subject before uploading questions/);
  assert.match(page, /What is 2 \+ 2\? \| 3 \| 4 \| 5 \| 6 \| B/);
  assert.match(page, /Explanation \(Optional\)/);
  assert.doesNotMatch(page, /Format: Question \| Option A \| Option B \| Option C \| Option D \| Correct Answer \| Explanation/);
});

test('bulk API accepts six-field rows while retaining the existing MEDIUM default', async () => {
  const routeSource = fs.readFileSync('src/app/api/internal-question-bank/route.ts', 'utf8');
  const routeJs = ts.transpileModule(routeSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const route = { exports: {} };
  let saved;
  const dependencies = {
    'next/server': { NextResponse: { json: (value, options) => Response.json(value, options) } },
    '@/lib/prisma': { prisma: { internalQuestionBank: { createMany: async input => {
      saved = input.data; return { count: input.data.length };
    } } } },
    '@/auth': { auth: async () => ({ user: { role: 'STAFF', id: 'staff-1' } }) }
  };
  new Function('require', 'module', 'exports', routeJs)(name => {
    if (name in dependencies) return dependencies[name];
    throw Error(`Unexpected dependency ${name}`);
  }, route, route.exports);
  const question = { ...parseInternalQuestionUpload('What is 2 + 2? | 3 | 4 | 5 | 6 | B').questions[0], subjectId: 'subject-1' };
  const response = await route.exports.PUT(new Request('https://school.test/api/internal-question-bank', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questions: [question] })
  }));
  assert.equal(response.status, 200);
  assert.equal(saved[0].difficulty, 'MEDIUM');
  assert.equal(saved[0].explanation, undefined);
  assert.equal(saved[0].topic, undefined);
});
