const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function('require','module','exports',js)(key => {
    if (Object.hasOwn(dependencies, key)) return dependencies[key];
    throw Error('Unknown dependency: ' + key);
  },mod,mod.exports);
  return mod.exports;
}
const templates = load('src/lib/sms-templates.ts');
const gateway = load('src/lib/africastalking.ts', { './sms-templates': templates });
const permissions = load('src/lib/permissions.ts');
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
const envNames = ['AFRICASTALKING_MODE','AFRICASTALKING_LIVE_ENABLED','AFRICASTALKING_USERNAME','AFRICASTALKING_API_KEY','AFRICASTALKING_SENDER_ID'];
async function withEnv(values, run) {
  const previous = Object.fromEntries(envNames.map(name => [name,process.env[name]]));
  for (const name of envNames) {
    if (name in values) process.env[name] = values[name]; else delete process.env[name];
  }
  try { return await run(); } finally {
    for (const name of envNames) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
}
function smsRoute(session, prisma, sender = gateway) {
  return load('src/app/api/sms/route.ts', { 'next/server': next,
    '@/auth': { auth: async () => session }, '@/lib/prisma': { prisma },
    '@/lib/permissions': permissions, '@/lib/africastalking': { ...sender, SMS_TEMPLATES: templates.SMS_TEMPLATES } });
}
const request = body => new Request('https://ditmur.test/api/sms', { method:'POST', headers: { 'Content-Type':'application/json' }, body:JSON.stringify(body) });

test('SMS is DISABLED by default even when someone already has sandbox credentials', () => withEnv({ AFRICASTALKING_USERNAME:'sandbox', AFRICASTALKING_API_KEY:'dummy' }, async () => {
  const config = gateway.getSMSConfig();
  assert.equal(config.mode,'disabled'); assert.equal(config.enabled,false);
  const result = await gateway.sendSMS({to:'08012345678',message:'Never send'});
  assert.equal(result.success,false);
}));

test('live mode requires explicit opt-in AND approved sender ID setting', () => withEnv({ AFRICASTALKING_MODE:'live', AFRICASTALKING_USERNAME:'live-username', AFRICASTALKING_API_KEY:'dummy-live-key' }, async () => {
  assert.equal(gateway.getSMSConfig().enabled,false);
  process.env.AFRICASTALKING_LIVE_ENABLED='true';
  assert.equal(gateway.getSMSConfig().enabled,false);
  process.env.AFRICASTALKING_SENDER_ID='DITMUR';
  assert.equal(gateway.getSMSConfig().enabled,true);
}));

test('one live Nigerian recipient can be ACCEPTED; not counted as delivered', () => withEnv({
  AFRICASTALKING_MODE:'live', AFRICASTALKING_LIVE_ENABLED:'true', AFRICASTALKING_USERNAME:'testlive',
  AFRICASTALKING_API_KEY:'dummy-live-key', AFRICASTALKING_SENDER_ID:'DITMUR'
}, async () => {
  const originalFetch=global.fetch;
  let count=0;
  global.fetch=async (url, options) => {
    count++;
    assert.equal(url,'https://api.africastalking.com/version1/messaging');
    const body=new URLSearchParams(options.body);
    assert.equal(body.get('to'),'+2348012345678');
    assert.equal(body.get('from'),'DITMUR');
    assert.equal(body.get('username'),'testlive');
    assert.equal(options.headers.apiKey,'dummy-live-key');
    return Response.json({ SMSMessageData: { Recipients: [{status:'Success',statusCode:101,messageId:'ATPid_123'}] } });
  };
  try {
    const result=await gateway.sendSMS({to:'08012345678',message:'Safe test'});
    assert.equal(result.status,'ACCEPTED');assert.equal(result.success,true);
    assert.equal(count,1);
  } finally { global.fetch=originalFetch; }
}));

test('empty recipient response never reports success', () => withEnv({
  AFRICASTALKING_MODE:'sandbox', AFRICASTALKING_USERNAME:'sandbox', AFRICASTALKING_API_KEY:'dummy'
}, async () => {
  const originalFetch=global.fetch;
  global.fetch=async () => Response.json({ SMSMessageData: { Recipients: [] } });
  try { const result=await gateway.sendSMS({to:'08012345678',message:'Sandbox'}); assert.equal(result.success,false); }
  finally { global.fetch=originalFetch; }
}));

test('teacher cannot send or browse every parent SMS', async () => {
  const route=smsRoute({user:{id:'teacher-1',role:'STAFF'}},{});
  assert.equal((await route.POST(request({studentId:'STU1',type:'CUSTOM',customMessage:'Hi',confirmed:true}))).status,403);
  assert.equal((await route.GET(new Request('https://ditmur.test/api/sms'))).status,403);
});

test('unapproved term results cannot trigger a result SMS', () => withEnv({
  AFRICASTALKING_MODE:'sandbox', AFRICASTALKING_USERNAME:'sandbox', AFRICASTALKING_API_KEY:'dummy'
}, async () => {
  const prisma = { student: { findUnique: async () => ({id:'STU1',status:'ACTIVE',classId:'C1',firstName:'Ada',lastName:'Bello',parent:{id:'P1',phone:'08012345678'}}) },
    reportRelease: { findUnique: async () => null } };
  const route=smsRoute({user:{id:'admin-1',role:'ADMIN'}},prisma,{...gateway,sendSMS:async () => {throw Error('Must not send');}});
  const result=await route.POST(request({studentId:'STU1',type:'RESULT',term:'First Term 2026-2027',confirmed:true}));
  assert.equal(result.status,409);
}));
