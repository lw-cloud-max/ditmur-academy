const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function endpoint(session) {
  const text = fs.readFileSync('src/app/api/payment-instructions/route.ts', 'utf8');
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  const deps = {
    'next/server': { NextResponse: { json: (value, init) => Response.json(value, init) } },
    '@/auth': { auth: async () => session }
  };
  new Function('require','module','exports',js)(name => {
    if (!(name in deps)) throw Error('Unexpected dependency: ' + name);
    return deps[name];
  }, mod, mod.exports);
  return mod.exports;
}
function withBank(callback) {
  const names = ['SCHOOL_BANK_NAME', 'SCHOOL_ACCOUNT_NAME', 'SCHOOL_ACCOUNT_NUMBER'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  process.env.SCHOOL_BANK_NAME = 'Example Bank';
  process.env.SCHOOL_ACCOUNT_NAME = 'Ditmur Academy';
  process.env.SCHOOL_ACCOUNT_NUMBER = '0123456789';
  return Promise.resolve().then(callback).finally(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
}

test('only a logged-in parent receives school bank details with no-store headers', () => withBank(async () => {
  const parentResponse = await endpoint({ user: { role: 'PARENT', id: 'parent-1' } }).GET();
  assert.equal(parentResponse.status, 200);
  assert.match(parentResponse.headers.get('cache-control'), /no-store/);
  assert.deepEqual((await parentResponse.json()).data, {
    bankName: 'Example Bank', accountName: 'Ditmur Academy', accountNumber: '0123456789'
  });
  for (const role of [null, 'STUDENT', 'STAFF', 'ACCOUNTANT']) {
    const session = role ? { user: { role, id: 'other' } } : null;
    const response = await endpoint(session).GET();
    assert.equal(response.status, 403);
    assert.equal((await response.json()).data, undefined);
  }
}));

test('missing or malformed bank settings show an honest error, never fake numbers', () => withBank(async () => {
  process.env.SCHOOL_ACCOUNT_NUMBER = 'not-set';
  const response = await endpoint({ user: { role: 'PARENT', id: 'parent-1' } }).GET();
  assert.equal(response.status, 503);
  const json = await response.json();
  assert.equal(json.success, false);
  assert.equal(json.data, undefined);
}));

test('bank numbers are not embedded in frontend code and Paystack requires explicit enable flag', () => {
  const page = fs.readFileSync('src/app/payments/page.tsx', 'utf8');
  assert.match(page, /fetch\('\/api\/payment-instructions'/);
  assert.doesNotMatch(page, /SCHOOL_ACCOUNT_NUMBER/);
  assert.match(page, /NEXT_PUBLIC_PAYSTACK_ENABLED === 'true'/);
});
