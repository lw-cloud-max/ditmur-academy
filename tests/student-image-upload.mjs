import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/students/upload/route.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
function loadRoute(session, prisma, blob = { put: async () => ({ url: 'https://store.blob.vercel-storage.com/student-photo.png' }) }) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', javascript)(key => {
    if (key === 'next/server') return next;
    if (key === '@vercel/blob') return blob;
    if (key === '@/auth') return { auth: async () => session };
    if (key === '@/lib/prisma') return { prisma };
    if (key === '@/lib/permissions') return { isSuperAdmin: value => value?.user?.id === 'admin-1' && value?.user?.role === 'ADMIN' };
    throw new Error(`Unexpected import: ${key}`);
  }, mod, mod.exports);
  return mod.exports;
}
function uploadRequest() {
  const form = new FormData();
  form.append('studentId', 'DIT/STU/001');
  form.append('file', new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])], { type: 'image/png' }), 'profile.png');
  return new Request('https://ditmur.test/api/students/upload', { method: 'POST', body: form });
}

async function withToken(value, run) {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;
  if (value === null) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = value;
  try { return await run(); }
  finally { if (previous === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = previous; }
}

test('student image upload refuses a class teacher outside the assigned class', () => withToken('dummy-token', async () => {
  let blobCalls = 0;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    student: { findUnique: async () => ({ id: 'DIT/STU/001', status: 'ACTIVE', classId: 'C1' }) },
    class: { findUnique: async () => ({ teacherId: 'teacher-2' }) }
  }, { put: async () => { blobCalls++; return { url: 'https://store.blob.vercel-storage.com/x' }; } });
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 403);
  assert.equal(blobCalls, 0);
}));

test('student photos require durable Blob storage configuration', () => withToken(null, async () => {
  let studentQueries = 0;
  const route = loadRoute({ user: { id: 'admin-1', role: 'ADMIN' } }, {
    student: { findUnique: async () => { studentQueries++; return {}; } }
  });
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 503);
  assert.equal(studentQueries, 0);
}));

test('assigned class teacher uploads a validated photo to durable Blob storage', () => withToken('dummy-token', async () => {
  let putArgs;
  let updateArgs;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    student: {
      findUnique: async () => ({ id: 'DIT/STU/001', status: 'ACTIVE', classId: 'C1' }),
      update: async args => { updateArgs = args; return {}; }
    },
    class: { findUnique: async () => ({ teacherId: 'teacher-1' }) }
  }, { put: async (path, file, options) => {
    putArgs = { path, type: file.type, options };
    return { url: 'https://store.blob.vercel-storage.com/student-profile.png' };
  } });
  const response = await route.POST(uploadRequest());
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(putArgs.options.access, 'public');
  assert.equal(putArgs.options.token, 'dummy-token');
  assert.equal(putArgs.type, 'image/png');
  assert.equal(updateArgs.data.imageUrl, json.imageUrl);
  assert.equal(json.success, true);
}));
