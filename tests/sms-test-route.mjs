import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/sms/test/route.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
function loadRoute(session, sender) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', javascript)(specifier => {
    if (specifier === 'next/server') return next;
    if (specifier === '@/auth') return { auth: async () => session };
    if (specifier === '@/lib/permissions') return { isSuperAdmin: value => value?.user?.id === 'admin-1' && value?.user?.role === 'ADMIN' };
    if (specifier === '@/lib/africastalking') return sender;
    throw new Error(`Unexpected import: ${specifier}`);
  }, mod, mod.exports);
  return mod.exports;
}
const request = body => new Request('https://ditmur.test/api/sms/test', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

const config = { enabled: true, mode: 'live', reason: 'Live test', senderId: 'DITMUR' };

test('non-super-admin cannot request a test message', async () => {
  let sendCount = 0;
  const route = loadRoute({ user: { id: 'staff-1', role: 'STAFF' } }, {
    getSMSConfig: () => config, formatNigeriaPhone: value => value, sendSMS: async () => { sendCount++; return { success: true, status: 'ACCEPTED' }; }
  });
  const response = await route.POST(request({ to: '08012345678', consent: true, confirmed: true }));
  assert.equal(response.status, 403);
  assert.equal(sendCount, 0);
});

test('test send requires separate consent and explicit confirmation', async () => {
  let sendCount = 0;
  const route = loadRoute({ user: { id: 'admin-1', role: 'ADMIN' } }, {
    getSMSConfig: () => config, formatNigeriaPhone: value => value, sendSMS: async () => { sendCount++; return { success: true, status: 'ACCEPTED' }; }
  });
  const response = await route.POST(request({ to: '08012345678', consent: false, confirmed: true }));
  assert.equal(response.status, 400);
  assert.equal(sendCount, 0);
});

test('test sends only the fixed short message to the single confirmed number', async () => {
  let send;
  const route = loadRoute({ user: { id: 'admin-1', role: 'ADMIN' } }, {
    getSMSConfig: () => config,
    formatNigeriaPhone: value => value === '08012345678' ? '+2348012345678' : null,
    sendSMS: async args => { send = args; return { success: true, status: 'ACCEPTED', messageId: 'test-id' }; }
  });
  const response = await route.POST(request({ to: '08012345678', consent: true, confirmed: true, message: 'ignore client message' }));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(json.data.status, 'ACCEPTED');
  assert.deepEqual(send, { to: '+2348012345678', message: 'Ditmur Academy SMS connection test. Please ignore this message.' });
});

test('disabled live mode sends nothing', async () => {
  let sendCount = 0;
  const route = loadRoute({ user: { id: 'admin-1', role: 'ADMIN' } }, {
    getSMSConfig: () => ({ enabled: false, mode: 'disabled', reason: 'SMS disabled' }),
    formatNigeriaPhone: value => value, sendSMS: async () => { sendCount++; return { success: true, status: 'ACCEPTED' }; }
  });
  const response = await route.POST(request({ to: '08012345678', consent: true, confirmed: true }));
  assert.equal(response.status, 503);
  assert.equal(sendCount, 0);
});
