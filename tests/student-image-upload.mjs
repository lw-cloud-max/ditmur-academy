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
const envKeys = ['BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID', 'VERCEL_OIDC_TOKEN'];
async function withBlobEnv(values, run) {
  const previous = Object.fromEntries(envKeys.map(name => [name, process.env[name]]));
  for (const name of envKeys) {
    if (typeof values[name] === 'string' && values[name]) process.env[name] = values[name];
    else delete process.env[name];
  }
  try { return await run(); }
  finally {
    for (const name of envKeys) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
}

test('student image upload refuses a class teacher outside the assigned class', () => withBlobEnv({ BLOB_READ_WRITE_TOKEN: 'dummy-token' }, async () => {
  let blobCalls = 0;
  const route = loadRoute({ user: { id: 'teacher-1', role: 'STAFF', staffRole: 'TEACHER' } }, {
    student: { findUnique: async () => ({ id: 'DIT/STU/001', status: 'ACTIVE', classId: 'C1' }) },
    class: { findUnique: async () => ({ teacherId: 'teacher-2' }) }
  }, { put: async () => { blobCalls++; return { url: 'https://store.blob.vercel-storage.com/x' }; } });
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 403);
  assert.equal(blobCalls, 0);
}));

test('photo upload gives an actionable setup response when no Blob store is connected', () => withBlobEnv({}, async () => {
  let studentQueries = 0;
  const route = loadRoute({ user: { id: 'admin-1', role: 'ADMIN' } }, {
    student: { findUnique: async () => { studentQueries++; return {}; } }
  });
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 503);
  assert.equal(studentQueries, 0);
}));

test('assigned class teacher upload works with Vercel OIDC store connection and no static token', () => withBlobEnv({
  BLOB_STORE_ID: 'store_school_photos', VERCEL_OIDC_TOKEN: 'runtime-oidc-token'
}, async () => {
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
  assert.equal('token' in putArgs.options, false);
  assert.equal(putArgs.type, 'image/png');
  assert.equal(updateArgs.data.imageUrl, json.imageUrl);
  assert.equal(json.success, true);
}));

test('static read-write token remains a fallback outside OIDC-connected Vercel deployments', () => withBlobEnv({
  BLOB_READ_WRITE_TOKEN: 'local-read-write-token'
}, async () => {
  let putArgs;
  const route = loadRoute({ user: { id: 'admin-1', role: 'ADMIN' } }, {
    student: { findUnique: async () => ({ id: 'DIT/STU/001', status: 'ACTIVE', classId: 'C1' }),
      update: async ({ data }) => ({ imageUrl: data.imageUrl }) }
  }, { put: async (_path, _file, options) => { putArgs = options; return { url: 'https://store.blob.vercel-storage.com/profile.png' }; } });
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 200);
  assert.equal(putArgs.token, 'local-read-write-token');
}));
