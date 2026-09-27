const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(path, deps) {
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(key => {
    if (!(key in deps)) throw Error('Unexpected dependency ' + key);
    return deps[key];
  }, mod, mod.exports);
  return mod.exports;
}
const json = { NextResponse: { json: (body, opts) => Response.json(body, opts) } };
const deps = (session, prisma, ai) => ({
  'next/server': json,
  '@/auth': { auth: async () => session },
  '@/lib/prisma': { prisma },
  '@/lib/lesson-note-file': { noteHasAttachment: s => !!s?.startsWith('dbfile:'), readNoteFile: async () => ({}) , STORED_FILE_PREFIX: 'dbfile:' },
  '@/lib/ai-config': { createOpenAIClient: () => ai || null, getAIModel: () => 'gpt-4o-mini' }
});
const path = 'src/app/api/lesson-notes/route.ts';
const filePath = 'src/app/api/lesson-notes/[id]/file/route.ts';
const aiPath = 'src/app/api/lesson-notes/generate/route.ts';

test('students only query published notes for their own class; never select fileUrl in list', async () => {
  let where;
  const prisma = { student: { findUnique: async () => ({ classId: 'class-1' }) },
    lessonPlan: { findMany: async args => { where = args.where; assert.equal(args.select.fileUrl, undefined); return []; } } };
  const handler = load(path, deps({ user: { id: 'STU1', role: 'STUDENT' } }, prisma));
  const response = await handler.GET(new Request('http://localhost/api/lesson-notes?subjectId=math'));
  assert.equal(response.status, 200);
  assert.deepEqual(where, { schemeOfWork: null, classId: 'class-1', status: 'PUBLISHED', subjectId: 'math' });
});

test('students cannot open notes assigned to a different class', async () => {
  const prisma = { student: { findUnique: async () => ({ classId: 'class-1' }) },
    lessonPlan: { findFirst: async ({ where }) => {
      assert.equal(where.classId, 'class-1');
      assert.equal(where.status, 'PUBLISHED');
      return null;
    } } };
  const handler = load(path, deps({ user: { id: 'STU1', role: 'STUDENT' } }, prisma));
  const response = await handler.GET(new Request('http://localhost/api/lesson-notes?id=other-note'));
  assert.equal(response.status, 404);
});

test('admins can publish a typed note without writing to the server filesystem', async () => {
  let stored;
  const prisma = {
    subject: { findUnique: async () => ({ id: 'math' }) },
    class: { findUnique: async () => ({ id: 'class-1' }) },
    staff: { findUnique: async () => null },
    lessonPlan: { create: async ({ data }) => { stored = data; return { id: 'note1' }; } }
  };
  const form = new FormData();
  for (const [k, v] of Object.entries({ title: 'Fractions', subjectId: 'math', classId: 'class-1',
    lessonNote: 'Add fractions', evaluation: '1. Add 1/2+1/2', assignment: 'Read page 4', status: 'PUBLISHED' })) form.append(k, v);
  const handler = load(path, deps({ user: { id: 'admin-1', role: 'ADMIN' } }, prisma));
  const response = await handler.POST(new Request('http://localhost/api/lesson-notes', { method: 'POST', body: form }));
  assert.equal(response.status, 201);
  assert.equal(stored.status, 'PUBLISHED');
  assert.equal(stored.schemeOfWork, null);
  assert.equal(stored.evaluation, '1. Add 1/2+1/2');
});

test('students cannot save notes', async () => {
  const handler = load(path, deps({ user: { id: 'STU1', role: 'STUDENT' } }, {}));
  const response = await handler.POST(new Request('http://localhost/api/lesson-notes', { method: 'POST' }));
  assert.equal(response.status, 403);
});

test('students cannot download a note file from another class', async () => {
  const prisma = {
    lessonPlan: { findUnique: async () => ({ schemeOfWork: null, fileUrl: 'dbfile:UERG', fileName: 'x.pdf', fileType: 'application/pdf', classId: 'other-class', status: 'PUBLISHED' }) },
    student: { findUnique: async () => ({ classId: 'class-1' }) }
  };
  const handler = load(filePath, deps({ user: { id: 'STU1', role: 'STUDENT' } }, prisma));
  const response = await handler.GET(new Request('http://localhost/api/lesson-notes/note1/file'), { params: Promise.resolve({ id: 'note1' }) });
  assert.equal(response.status, 403);
});

test('AI missing key shows explicit error, never fake lesson content', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const prisma = {
      subject: { findUnique: async () => ({ name: 'Mathematics' }) },
      class: { findUnique: async () => ({ name: 'Primary 4', level: 'PRIMARY' }) }
    };
    const handler = load(aiPath, deps({ user: { id: 'admin-1', role: 'ADMIN' } }, prisma));
    const response = await handler.POST(new Request('http://localhost/api/lesson-notes/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: 'math', classId: 'class-1', topic: 'Fractions', instructions: '' })
    }));
    assert.equal(response.status, 503);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('AI generation displays fenced JSON as one readable lesson note', async () => {
  const previous = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = 'sk-test-not-a-real-key';
  try {
    const prisma = {
      subject: { findUnique: async () => ({ name: 'Mathematics' }) },
      class: { findUnique: async () => ({ name: 'Primary 4', level: 'PRIMARY' }) }
    };
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      const request = JSON.parse(options.body);
      assert.equal(request.response_format, undefined);
      assert.equal(request.model, process.env.AI_MODEL || 'gpt-4o-mini');
      assert.match(request.messages[1].content, /Fractions/);
      return Response.json({ choices: [{ message: { content: '```json\n{"lessonNote":"Explain fractions","evaluation":"1. Calculate","assignment":"1. Practice"}\n```' }, finish_reason: 'stop' }] });
    };
    const handler = load(aiPath, deps({ user: { id: 'admin-1', role: 'ADMIN' } }, prisma));
    const response = await handler.POST(new Request('http://localhost/api/lesson-notes/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: 'math', classId: 'class-1', topic: 'Fractions', instructions: 'Use examples' })
    }));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { lessonNote: 'LESSON NOTE\nExplain fractions\n\nEVALUATION\n1. Calculate\n\nASSIGNMENT\n1. Practice', evaluation: '', assignment: '' });
  } finally {
    global.fetch = originalFetch;
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('PDF attachment is stored in the existing database field and rejects disguised files', async () => {
  const helper = load('src/lib/lesson-note-file.ts', {});
  const valid = new File([new TextEncoder().encode('%PDF-1.7\nlesson')], 'topic.pdf', { type: 'application/pdf' });
  const stored = await helper.readNoteFile(valid);
  assert.equal(stored.fileName, 'topic.pdf');
  assert.ok(stored.fileUrl.startsWith('dbfile:'));
  assert.equal(Buffer.from(stored.fileUrl.slice(7), 'base64').toString(), '%PDF-1.7\nlesson');
  const invalid = new File(['<script>alert(1)</script>'], 'fake.pdf', { type: 'application/pdf' });
  await assert.rejects(helper.readNoteFile(invalid), /contents do not match/);
});

test('a nonempty first response is shown for teacher review without a costly retry', async () => {
  const previous = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = 'sk-test-not-a-real-key';
  let calls = 0;
  try {
    const prisma = {
      subject: { findUnique: async () => ({ name: 'Basic Science' }) },
      class: { findUnique: async () => ({ name: 'Primary 3', level: 'PRIMARY' }) }
    };
    global.fetch = async () => {
      calls++;
      return Response.json({ choices: [{ message: { content: 'LESSON NOTE\nPlants need light\n\nEVALUATION\n1. Why?\n\nASSIGNMENT\n1. Observe a plant' }, finish_reason: 'stop' }] });
    };
    const handler = load(aiPath, deps({ user: { id: 'admin-1', role: 'ADMIN' } }, prisma));
    const response = await handler.POST(new Request('http://localhost/api/lesson-notes/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: 'science', classId: 'class-1', topic: 'Plants', instructions: '' })
    }));
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    const output = await response.json();
    assert.match(output.data.lessonNote, /EVALUATION/);
    assert.match(output.data.lessonNote, /ASSIGNMENT/);
    assert.equal(output.data.evaluation, '');
    assert.equal(output.data.assignment, '');
  } finally {
    global.fetch = originalFetch;
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('JSON with evaluation and assignment arrays is readable in the single field', async () => {
  const previous = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = 'sk-test-not-a-real-key';
  let calls = 0;
  try {
    const prisma = {
      subject: { findUnique: async () => ({ name: 'English' }) },
      class: { findUnique: async () => ({ name: 'JSS 1', level: 'SECONDARY' }) }
    };
    global.fetch = async () => {
      calls++;
      return Response.json({ choices: [{ message: { content: JSON.stringify({
        lessonNote: 'Parts of speech', evaluation: ['Name a noun', 'Name a verb'], assignment: ['Write five sentences']
      }) } }] });
    };
    const handler = load(aiPath, deps({ user: { id: 'admin-1', role: 'ADMIN' } }, prisma));
    const response = await handler.POST(new Request('http://localhost/api/lesson-notes/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: 'english', classId: 'jss1', topic: 'Parts of speech', instructions: '' })
    }));
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    const data = (await response.json()).data;
    assert.match(data.lessonNote, /EVALUATION\n1\. Name a noun/);
    assert.match(data.lessonNote, /ASSIGNMENT\n1\. Write five sentences/);
    assert.equal(data.evaluation, '');
    assert.equal(data.assignment, '');
  } finally {
    global.fetch = originalFetch;
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
