const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function route(path, session, prisma) {
  const source = fs.readFileSync(path, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const deps = {
    'next/server': { NextResponse: { json: (data, opts) => Response.json(data, opts) } },
    '@/lib/prisma': { prisma },
    '@/auth': { auth: async () => session }
  };
  new Function('require', 'module', 'exports', js)((key) => deps[key], module, module.exports);
  return module.exports;
}
const exams = 'src/app/api/internal-exams-new/route.ts';
const take = 'src/app/api/internal-exams-new/take/route.ts';
const request = (path, method, body) => new Request('https://test.local' + path, {
  method, ...(body && { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
});

test('staff detail loads full exam instead of returning an array without questions', async () => {
  const data = { id: 'e1', questions: [{ id: 'q1' }], attempts: [] };
  const prisma = { internalExamNew: { findUnique: async ({ include }) => {
    assert.ok(include.questions); assert.ok(include.attempts); return data;
  } } };
  const response = await route(exams, { user: { role: 'ADMIN', id: 'admin-1' } }, prisma)
    .GET(request('/api/internal-exams-new?id=e1', 'GET'));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, data);
});

test('student sees only published exams assigned to their class or all classes', async () => {
  const prisma = {
    student: { findUnique: async () => ({ classId: 'class-1' }) },
    internalExamNew: { findMany: async ({ where }) => {
      assert.equal(where.isActive, true);
      assert.deepEqual(where.OR, [{ classId: null }, { classId: 'class-1' }]);
      return [{ id: 'e1', title: 'Math' }];
    } }
  };
  const response = await route(exams, { user: { role: 'STUDENT', id: 'STU1' } }, prisma)
    .GET(request('/api/internal-exams-new', 'GET'));
  assert.equal((await response.json()).data[0].id, 'e1');
});

test('students cannot see staff-only detail and correct answers', async () => {
  const response = await route(exams, { user: { role: 'STUDENT', id: 'STU1' } }, {})
    .GET(request('/api/internal-exams-new?id=e1', 'GET'));
  assert.equal(response.status, 403);
});

test('start blocks wrong class and allows assigned class without leaking answers', async () => {
  const exam = { id: 'e1', title: 'Math', classId: 'class-1', isActive: true,
    startTime: null, endTime: null, durationMinutes: 30, totalMarks: 100,
    questions: [{ id: 'q1', correctAnswer: 'B', optionA: '1', optionB: '2', optionC: '3', optionD: '4', text: '1+1', marks: 100, orderIndex: 1 }] };
  let classId = 'class-2';
  const prisma = {
    student: { findUnique: async () => ({ classId }) },
    internalExamNew: { findUnique: async () => exam },
    internalExamAttempt: {
      findUnique: async () => null,
      create: async () => ({ id: 'attempt1', startedAt: new Date().toISOString() })
    }
  };
  const handler = route(take, { user: { role: 'STUDENT', id: 'STU1' } }, prisma);
  assert.equal((await handler.POST(request('/api/internal-exams-new/take', 'POST', { examId: 'e1' }))).status, 403);
  classId = 'class-1';
  const res = await handler.POST(request('/api/internal-exams-new/take', 'POST', { examId: 'e1' }));
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.data.questions[0].correctAnswer, undefined);
});

test('older 1-mark questions are graded against their advertised total marks; hidden results stay hidden', async () => {
  const exam = { totalMarks: 100, passingMarks: 40, showResults: false,
    questions: [{ id: 'q1', correctAnswer: 'B', marks: 1 }, { id: 'q2', correctAnswer: 'C', marks: 1 }] };
  let recorded;
  const prisma = {
    internalExamAttempt: { findUnique: async () => ({ id: 'attempt1', studentId: 'STU1', submittedAt: null, exam }) },
    $transaction: async callback => callback({
      internalExamAttempt: { updateMany: async ({ data }) => { recorded = data; return { count: 1 }; } },
      internalExamAnswer: { createMany: async () => ({ count: 2 }) }
    })
  };
  const response = await route(take, { user: { role: 'STUDENT', id: 'STU1' } }, prisma)
    .PUT(request('/api/internal-exams-new/take', 'PUT', { attemptId: 'attempt1', answers: [{ questionId: 'q1', selectedAnswer: 'B' }] }));
  assert.equal(response.status, 200);
  assert.equal(recorded.score, 50);
  assert.equal(recorded.totalMarks, 100);
  assert.deepEqual((await response.json()).data, { submitted: true });
});

test('creating a published exam stores selected questions and marks adding up to total', async () => {
  let stored;
  const prisma = {
    staff: { findUnique: async () => ({ id: 'admin-1' }) },
    internalQuestionBank: { findMany: async () => [
      { id: 'q1', subjectId: 'math', classId: null, text: 'one?', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', correctAnswer: 'A' },
      { id: 'q2', subjectId: 'math', classId: null, text: 'two?', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', correctAnswer: 'B' }
    ] },
    internalExamNew: { create: async ({ data }) => { stored = data; return { id: 'e1' }; } }
  };
  const response = await route(exams, { user: { role: 'ADMIN', id: 'admin-1' } }, prisma)
    .POST(request('/api/internal-exams-new', 'POST', {
      title: 'Math', subjectId: 'math', classId: 'class-1', durationMinutes: 60,
      totalMarks: 99, passingMarks: 40, isActive: true, questionIds: ['q2', 'q1']
    }));
  assert.equal(response.status, 201);
  assert.equal(stored.isActive, true);
  assert.equal(stored.questions.create[0].questionBankId, 'q2');
  assert.equal(stored.questions.create.reduce((n, q) => n + q.marks, 0), 99);
});
