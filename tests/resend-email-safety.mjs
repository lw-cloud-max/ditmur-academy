import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const envNames = ['RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO', 'RESEND_EMAILS_ENABLED', 'RESEND_NEWSLETTER_ENABLED'];
async function withEnv(values, run) {
  const previous = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  for (const name of envNames) {
    if (typeof values[name] === 'string' && values[name]) process.env[name] = values[name];
    else delete process.env[name];
  }
  try { return await run(); }
  finally { for (const name of envNames) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } }
}
function load(file, deps) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name in deps) return deps[name];
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
const mail = load('src/lib/resend-mail.ts', {});
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
function route(file, session, prisma = {}, mailModule = mail) {
  return load(file, {
    'crypto': { randomUUID },
    'next/server': next,
    '@/auth': { auth: async () => session },
    '@/lib/prisma': { prisma },
    '@/lib/permissions': { isSuperAdmin: value => value?.user?.id === 'admin-1' && value?.user?.role === 'ADMIN' },
    '@/lib/resend-mail': mailModule
  });
}
const testRequest = body => new Request('https://ditmur.test/api/email/test', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const newsletterRequest = body => new Request('https://ditmur.test/api/email/newsletter', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const admin = { user: { id: 'admin-1', role: 'ADMIN' } };
const baseEnv = { RESEND_API_KEY: 'fake-resend-key', EMAIL_FROM: 'Ditmur Academy <newsletter@updates.ditmuracademy.com>',
  EMAIL_REPLY_TO: 'ditmuracademy@gmail.com', RESEND_EMAILS_ENABLED: 'true' };

test('email test stays disabled without private Resend configuration', () => withEnv({}, async () => {
  const originalFetch = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return Response.json({ id: 'should-not-send' }); };
  try {
    const api = route('src/app/api/email/test/route.ts', admin);
    const response = await api.POST(testRequest({ to: 'owner@example.com', consent: true, confirmed: true }));
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
}));

test('single test email requires consent and explicit confirmation; sends one fixed message', () => withEnv(baseEnv, async () => {
  const originalFetch = global.fetch; let requestBody, requestUrl, requestHeaders;
  global.fetch = async (url, options) => { requestUrl = url; requestBody = JSON.parse(options.body); requestHeaders = options.headers; return Response.json({ id: 'email-test-id' }); };
  try {
    const api = route('src/app/api/email/test/route.ts', admin);
    const denied = await api.POST(testRequest({ to: 'owner@example.com', consent: false, confirmed: true }));
    assert.equal(denied.status, 400);
    const accepted = await api.POST(testRequest({ to: 'owner@example.com', consent: true, confirmed: true }));
    const json = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.equal(requestUrl, 'https://api.resend.com/emails');
    assert.equal(requestHeaders.Authorization, 'Bearer fake-resend-key');
    assert.deepEqual(requestBody.to, ['owner@example.com']);
    assert.equal(requestBody.subject, 'Ditmur Academy email connection test');
    assert.equal(json.data.status, 'ACCEPTED');
  } finally { global.fetch = originalFetch; }
}));

test('newsletter preview deduplicates active Parent email addresses and returns masked samples only', () => withEnv(baseEnv, async () => {
  let query;
  const prisma = { parent: { findMany: async args => { query = args; return [
    { email: 'Parent@Example.com' }, { email: 'parent@example.com' }, { email: null }, { email: '' }
  ]; } } };
  const api = route('src/app/api/email/newsletter/route.ts', admin, prisma);
  const response = await api.GET();
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(query.where.students.some, { status: 'ACTIVE' });
  assert.equal(json.data.activeParentRecords, 4);
  assert.equal(json.data.uniqueRecipients, 1);
  assert.equal(json.data.duplicateEmailRecords, 1);
  assert.equal(json.data.parentsWithoutEmail, 2);
  assert.match(json.data.sampleMaskedRecipients[0], /\*\*\*@example\.com/i);
  assert.equal(JSON.stringify(json.data).includes('Parent@Example.com'), false);
}));

test('newsletter sending is separately disabled until the super admin enables it', () => withEnv(baseEnv, async () => {
  const originalFetch = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return Response.json({ data: [{ id: 'should-not-send' }] }); };
  const prisma = { parent: { findMany: async () => [{ email: 'parent@example.com' }] } };
  try {
    const api = route('src/app/api/email/newsletter/route.ts', admin, prisma);
    const response = await api.POST(newsletterRequest({ subject: 'News', text: 'Hello', expectedRecipientCount: 1, campaignId: 'campaign-00001', consent: true, confirmed: true }));
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
}));

test('newsletter requires matching preview count and sends one address per item in Resend batch', () => withEnv({ ...baseEnv, RESEND_NEWSLETTER_ENABLED: 'true' }, async () => {
  const originalFetch = global.fetch; const outgoing = [];
  global.fetch = async (url, options) => {
    outgoing.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return Response.json({ data: [{ id: 'email-1' }, { id: 'email-2' }] });
  };
  const prisma = { parent: { findMany: async () => [
    { email: 'one@example.com' }, { email: 'TWO@example.com' }, { email: 'one@example.com' }
  ] } };
  try {
    const api = route('src/app/api/email/newsletter/route.ts', admin, prisma);
    const mismatch = await api.POST(newsletterRequest({ subject: 'Newsletter', text: 'Hello', expectedRecipientCount: 4, campaignId: 'campaign-00001', consent: true, confirmed: true }));
    assert.equal(mismatch.status, 409);
    assert.equal(outgoing.length, 0);
    const response = await api.POST(newsletterRequest({ subject: 'Newsletter', text: 'Hello <parents>', expectedRecipientCount: 2, campaignId: 'campaign-00001', consent: true, confirmed: true }));
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(outgoing.length, 1);
    assert.equal(outgoing[0].url, 'https://api.resend.com/emails/batch');
    assert.equal(outgoing[0].body.length, 2);
    assert.ok(outgoing[0].body.every(item => item.to.length === 1));
    assert.ok(outgoing[0].body[0].html.includes('&lt;parents&gt;'));
    assert.ok(outgoing[0].headers['Idempotency-Key'].includes('campaign-00001'));
    assert.equal(json.data.accepted, 2);
  } finally { global.fetch = originalFetch; }
}));
