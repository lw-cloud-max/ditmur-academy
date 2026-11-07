import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import * as crypto from 'node:crypto';

const envNames = ['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'NODE_ENV', 'RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO', 'RESEND_EMAILS_ENABLED'];
async function withEnv(values, run) {
  const previous = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  for (const name of envNames) {
    if (typeof values[name] === 'string' && values[name]) process.env[name] = values[name];
    else delete process.env[name];
  }
  try { return await run(); }
  finally {
    for (const name of envNames) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}
function load(file, deps = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name in deps) return deps[name];
    if (name === 'crypto' || name === 'node:crypto') return crypto;
    if (name === 'typescript') return ts;
    throw new Error(`Unexpected dependency ${name} in ${file}`);
  }, mod, mod.exports);
  return mod.exports;
}
const normalize = load('src/lib/normalize-email.ts');
const tokenLib = load('src/lib/password-reset-token.ts', { '@/lib/normalize-email': normalize });
const mail = load('src/lib/resend-mail.ts');
const jsonResponse = (body, init) => Response.json(body, init);
const nextServer = { NextResponse: { json: jsonResponse } };
const baseEnv = {
  AUTH_SECRET: 'test-only-secret-do-not-use-in-production-1234567890',
  RESEND_API_KEY: 're_test_fake_key',
  EMAIL_FROM: 'Ditmur Academy <newsletter@updates.ditmuracademy.com>',
  EMAIL_REPLY_TO: 'ditmuracademy@gmail.com',
  RESEND_EMAILS_ENABLED: 'true'
};
const genericMessage = 'If a matching eligible staff or parent account exists, reset instructions will be sent shortly.';
const account = {
  kind: 'PARENT', id: 'parent-123', email: 'parent@example.com', name: 'Parent Account',
  role: 'PARENT', mustChangePassword: true, sessionVersion: 3, passwordConfigured: false
};

function forgotRoute(lookup, allow = () => true) {
  return load('src/app/api/forgot-password/route.ts', {
    'next/server': nextServer,
    '@/lib/email-account-lookup': { findUniqueStaffOrParentByEmail: lookup },
    '@/lib/normalize-email': normalize,
    '@/lib/password-reset-rate-limit': { allowPasswordResetRequest: allow },
    '@/lib/password-reset-token': tokenLib,
    '@/lib/resend-mail': mail
  });
}
function resetRoute(prisma, passwords = {}) {
  return load('src/app/api/reset-password/route.ts', {
    'next/server': nextServer,
    '@/lib/prisma': { prisma },
    '@/lib/passwords': {
      checkPassword: passwords.checkPassword || (async () => ({ valid: false, upgrade: false })),
      hashPassword: passwords.hashPassword || (async () => 'bcrypt-test-hash'),
      validateNewPassword: passwords.validateNewPassword || (value => value.length < 12 ? 'Use a password of at least 12 characters' : null)
    },
    '@/lib/normalize-email': normalize,
    '@/lib/password-reset-token': tokenLib
  });
}
const request = (url, body, headers = {}) => new Request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body)
});

test('reset tokens are signed, email-bound, single-use by version, and expire', async () => withEnv(baseEnv, async () => {
  const now = 1_800_000_000_000;
  const first = tokenLib.createPasswordResetToken({ kind: 'PARENT', id: 'parent-123', email: 'Parent@Example.com', sessionVersion: 3 }, now);
  assert.ok(first);
  const verified = tokenLib.verifyPasswordResetToken(first, now + 1_000);
  assert.equal(verified?.id, 'parent-123');
  assert.equal(verified?.sessionVersion, 3);
  assert.equal(tokenLib.passwordResetTokenMatchesEmail(verified, 'parent@example.com'), true);
  assert.equal(tokenLib.passwordResetTokenMatchesEmail(verified, 'other@example.com'), false);
  assert.equal(tokenLib.verifyPasswordResetToken(`${first}x`, now + 1_000), null);
  assert.equal(tokenLib.verifyPasswordResetToken(first, now + tokenLib.PASSWORD_RESET_WINDOW_MS + 10_000)?.id, 'parent-123');
  assert.equal(tokenLib.verifyPasswordResetToken(first, now + tokenLib.PASSWORD_RESET_TOKEN_TTL_MS), null);
  const sameWindow = tokenLib.createPasswordResetToken({ kind: 'PARENT', id: 'parent-123', email: 'parent@example.com', sessionVersion: 3 }, now + 10_000);
  assert.equal(sameWindow, first);
  const nextWindow = tokenLib.createPasswordResetToken({ kind: 'PARENT', id: 'parent-123', email: 'parent@example.com', sessionVersion: 3 }, now + tokenLib.PASSWORD_RESET_WINDOW_MS + 10_000);
  assert.notEqual(nextWindow, first);
  assert.match(tokenLib.passwordResetIdempotencyKey(first), /^ditmur-password-reset-[a-f0-9]{64}$/);
}));

test('email lookup accepts one eligible account and rejects duplicates and inactive staff', async () => {
  const staffRow = { id: 'staff-1', firstName: 'Ada', lastName: 'Teacher', email: 'staff@example.com', role: 'TEACHER', status: 'ACTIVE', passwordHash: 'hash', mustChangePassword: true, sessionVersion: 4 };
  const parentRow = { id: 'parent-1', fullName: 'Parent One', email: 'parent@example.com', password: null, mustChangePassword: true, sessionVersion: 2 };
  let staffRows = [];
  let parentRows = [parentRow];
  const lookupLib = load('src/lib/email-account-lookup.ts', {
    '@/lib/prisma': { prisma: {
      staff: { findMany: async () => staffRows },
      parent: { findMany: async () => parentRows }
    } },
    '@/lib/normalize-email': normalize
  });
  assert.equal((await lookupLib.findUniqueStaffOrParentByEmail(' PARENT@example.com '))?.id, 'parent-1');
  parentRows = [parentRow, { ...parentRow, id: 'parent-2' }];
  assert.equal(await lookupLib.findUniqueStaffOrParentByEmail('parent@example.com'), null);
  parentRows = [parentRow];
  staffRows = [staffRow];
  assert.equal(await lookupLib.findUniqueStaffOrParentByEmail('parent@example.com'), null);
  parentRows = [];
  staffRows = [{ ...staffRow, status: 'INACTIVE' }];
  assert.equal(await lookupLib.findUniqueStaffOrParentByEmail('staff@example.com'), null);
  assert.equal(await lookupLib.findUniqueStaffOrParentByEmail('admin@ditmur.com'), null);
});

test('reset-request throttling limits repeat emails and excessive requests per IP', () => {
  const limiter = load('src/lib/password-reset-rate-limit.ts', {
    'crypto': crypto,
    '@/lib/password-reset-token': tokenLib,
    '@/lib/normalize-email': normalize
  });
  const now = 1_800_000_000_000;
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.80', 'person@example.com', now), true);
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.81', 'PERSON@example.com', now + 1), false);
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.80', 'other1@example.com', now + 2), true);
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.80', 'other2@example.com', now + 3), true);
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.80', 'other3@example.com', now + 4), true);
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.80', 'other4@example.com', now + 5), true);
  assert.equal(limiter.allowPasswordResetRequest('198.51.100.80', 'other5@example.com', now + 6), false);
});

test('forgot-password response is generic and sends only to a unique eligible stored address', async () => withEnv(baseEnv, async () => {
  const originalFetch = global.fetch;
  let sent = [];
  global.fetch = async (url, options) => {
    sent.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return Response.json({ id: 'resend-reset-1' });
  };
  try {
    const api = forgotRoute(async email => email === 'parent@example.com' ? account : null);
    const found = await api.POST(request('https://www.ditmuracademy.com/api/forgot-password', { email: ' Parent@Example.com ' }, { 'x-real-ip': '198.51.100.1' }));
    const foundJson = await found.json();
    assert.equal(found.status, 200);
    assert.equal(foundJson.message, genericMessage);
    assert.equal(JSON.stringify(foundJson).includes('parent@example.com'), false);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://api.resend.com/emails');
    assert.deepEqual(sent[0].body.to, ['parent@example.com']);
    assert.equal(sent[0].body.subject, 'Reset your Ditmur Academy password');
    assert.match(sent[0].body.text, /www\.ditmuracademy\.com\/reset-password#token=/);
    assert.ok(sent[0].headers['Idempotency-Key'].startsWith('ditmur-password-reset-'));

    const noMatch = await api.POST(request('https://www.ditmuracademy.com/api/forgot-password', { email: 'nobody@example.com' }, { 'x-real-ip': '198.51.100.2' }));
    assert.equal(noMatch.status, 200);
    assert.deepEqual(await noMatch.json(), foundJson);
    assert.equal(sent.length, 1);
  } finally { global.fetch = originalFetch; }
}));

test('forgot-password does not send if email resolution is ambiguous or throttled', async () => withEnv(baseEnv, async () => {
  const originalFetch = global.fetch;
  let sends = 0;
  global.fetch = async () => { sends++; return Response.json({ id: 'should-not-send' }); };
  try {
    const ambiguous = forgotRoute(async () => null);
    const response = await ambiguous.POST(request('https://www.ditmuracademy.com/api/forgot-password', { email: 'parent@example.com' }, { 'x-real-ip': '198.51.100.3' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).message, genericMessage);
    const throttled = forgotRoute(async () => account, () => false);
    const limited = await throttled.POST(request('https://www.ditmuracademy.com/api/forgot-password', { email: 'parent@example.com' }, { 'x-real-ip': '198.51.100.4' }));
    assert.equal(limited.status, 429);
    assert.equal(sends, 0);
  } finally { global.fetch = originalFetch; }
}));

test('forgot-password fails closed when email sending or signing secret is not configured', async () => withEnv({ RESEND_EMAILS_ENABLED: 'true', RESEND_API_KEY: 'key', EMAIL_FROM: 'Ditmur Academy <newsletter@updates.ditmuracademy.com>' }, async () => {
  const api = forgotRoute(async () => account);
  const response = await api.POST(request('https://www.ditmuracademy.com/api/forgot-password', { email: 'parent@example.com' }));
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes('parent@example.com'), false);
}));

test('reset-password updates one account atomically and makes the token unusable', async () => withEnv(baseEnv, async () => {
  const current = { id: 'parent-123', email: 'parent@example.com', password: null, sessionVersion: 3 };
  const prisma = {
    parent: {
      findUnique: async () => current,
      updateMany: async args => {
        if (args.where.sessionVersion !== current.sessionVersion || args.where.id !== current.id || args.where.email !== current.email) return { count: 0 };
        current.password = args.data.password;
        current.sessionVersion += args.data.sessionVersion.increment;
        current.mustChangePassword = args.data.mustChangePassword;
        return { count: 1 };
      }
    },
    staff: { findUnique: async () => null, updateMany: async () => ({ count: 0 }) }
  };
  const token = tokenLib.createPasswordResetToken({ kind: 'PARENT', id: current.id, email: current.email, sessionVersion: current.sessionVersion });
  const api = resetRoute(prisma);
  const body = { token, newPassword: 'a-new-long-password-123' };
  const response = await api.POST(request('https://www.ditmuracademy.com/api/reset-password', body));
  assert.equal(response.status, 200);
  assert.equal(current.password, 'bcrypt-test-hash');
  assert.equal(current.sessionVersion, 4);
  assert.equal(current.mustChangePassword, false);
  const replay = await api.POST(request('https://www.ditmuracademy.com/api/reset-password', body));
  assert.equal(replay.status, 400);
  assert.match((await replay.json()).error, /invalid, expired, or has already been used/i);
}));

test('reset-password rejects bad passwords and cross-origin form submissions without a database write', async () => withEnv(baseEnv, async () => {
  const current = { id: 'parent-123', email: 'parent@example.com', password: null, sessionVersion: 3 };
  let writes = 0;
  const prisma = {
    parent: { findUnique: async () => current, updateMany: async () => { writes++; return { count: 1 }; } },
    staff: { findUnique: async () => null, updateMany: async () => ({ count: 0 }) }
  };
  const token = tokenLib.createPasswordResetToken({ kind: 'PARENT', id: current.id, email: current.email, sessionVersion: current.sessionVersion });
  const api = resetRoute(prisma);
  const tooShort = await api.POST(request('https://www.ditmuracademy.com/api/reset-password', { token, newPassword: 'short' }));
  assert.equal(tooShort.status, 400);
  const crossOrigin = await api.POST(request('https://www.ditmuracademy.com/api/reset-password', { token, newPassword: 'a-new-long-password-123' }, { origin: 'https://evil.example' }));
  assert.equal(crossOrigin.status, 403);
  assert.equal(writes, 0);
}));

test('Google sign-in accepts only a verified Google email with one local staff or parent match', async () => withEnv({ ...baseEnv, AUTH_GOOGLE_ID: 'client-id', AUTH_GOOGLE_SECRET: 'client-secret', NODE_ENV: 'production' }, async () => {
  let config;
  const localAccount = { ...account, kind: 'STAFF', id: 'staff-99', email: 'staff@example.com', name: 'Staff Person', role: 'STAFF', staffRole: 'TEACHER', passwordConfigured: false };
  const authModule = load('src/auth.ts', {
    'next-auth': configValue => { config = configValue; return { handlers: {}, signIn: async () => {}, signOut: async () => {}, auth: async () => null }; },
    'next-auth/providers/credentials': options => ({ id: 'credentials', ...options }),
    'next-auth/providers/google': options => ({ id: 'google', ...options }),
    '@/lib/prisma': { prisma: {} },
    '@/lib/passwords': { checkPassword: async () => ({ valid: false, upgrade: false }), hashPassword: async value => value, isKnownDemoPassword: () => false },
    '@/lib/email-account-lookup': { findUniqueStaffOrParentByEmail: async email => email.toLowerCase() === 'staff@example.com' ? localAccount : null }
  });
  assert.equal(typeof authModule.auth, 'function');
  assert.ok(config.providers.some(provider => provider.id === 'google'));
  assert.equal(await config.callbacks.signIn({ account: { provider: 'google' }, user: { email: 'staff@example.com' }, profile: { email_verified: false } }), false);
  assert.equal(await config.callbacks.signIn({ account: { provider: 'google' }, user: { email: 'unknown@example.com' }, profile: { email_verified: true } }), false);
  assert.equal(await config.callbacks.signIn({ account: { provider: 'google' }, user: { email: 'staff@example.com' }, profile: { email_verified: true } }), true);
  const token = await config.callbacks.jwt({ token: {}, user: { email: 'staff@example.com' }, account: { provider: 'google' }, profile: { email_verified: true } });
  assert.equal(token.id, 'staff-99');
  assert.equal(token.role, 'STAFF');
  assert.equal(token.mustChangePassword, false);
  assert.equal(await config.callbacks.redirect({ url: '/dashboard', baseUrl: 'https://old-ditmur.vercel.app' }), 'https://www.ditmuracademy.com/dashboard');
  assert.equal(await config.callbacks.redirect({ url: 'https://evil.example', baseUrl: 'https://old-ditmur.vercel.app' }), 'https://www.ditmuracademy.com');
}));

test('Google provider is absent until both private credentials are configured', async () => withEnv({ ...baseEnv, AUTH_GOOGLE_ID: 'client-id-only', NODE_ENV: 'production' }, async () => {
  let config;
  load('src/auth.ts', {
    'next-auth': configValue => { config = configValue; return { handlers: {}, signIn: async () => {}, signOut: async () => {}, auth: async () => null }; },
    'next-auth/providers/credentials': options => ({ id: 'credentials', ...options }),
    'next-auth/providers/google': options => ({ id: 'google', ...options }),
    '@/lib/prisma': { prisma: {} },
    '@/lib/passwords': { checkPassword: async () => ({ valid: false, upgrade: false }), hashPassword: async value => value, isKnownDemoPassword: () => false },
    '@/lib/email-account-lookup': { findUniqueStaffOrParentByEmail: async () => null }
  });
  assert.deepEqual(config.providers.map(provider => provider.id), ['credentials']);
}));

test('login and proxy expose recovery only for staff/parents and preserve Student ID login', () => {
  const login = fs.readFileSync('src/app/login/LoginForm.tsx', 'utf8');
  const proxy = fs.readFileSync('src/proxy.ts', 'utf8');
  assert.match(login, /href="\/forgot-password"/);
  assert.match(login, /getProviders\(\)/);
  assert.match(login, /roleType !== 'STUDENT' && googleEnabled/);
  assert.match(login, /Student ID and password/);
  assert.match(proxy, /'\/forgot-password', '\/reset-password', '\/api\/forgot-password', '\/api\/reset-password'/);
});
