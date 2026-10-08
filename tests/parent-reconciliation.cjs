const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)((name) => {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) return dependencies[name];
    throw Error('Unexpected module: ' + name);
  }, module, module.exports);
  return module.exports;
}
const audit = load('src/lib/parent-reconciliation.ts');
const student = (id, firstName, lastName, parentId, otherNames = null) => ({ id, firstName, lastName, otherNames, parentId, class: { name: 'Primary 3' } });
const parent = (id, email, phone, studentId) => ({ id, fullName: 'Guardian', email, phone, students: [{ id: studentId }] });

test('Excel UTF-8 CSV with quoted multi-line numbered children parses as one guardian', () => {
  const csv = '\uFEFFS/NO,First Name,Surname,Other name,Email,Gender,Occupation,Phone,Linked students\r\n' +
    '1,Ada,Okafor,Joy,ada@example.test,F,Trader,08012345678,"1. John Doe\r\n2. John Cena"\r\n';
  const rows = audit.parseRoster(csv);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].children, ['John Doe', 'John Cena']);
  assert.equal(rows[0].name, 'Ada Joy Okafor');
});
test('quoted commas and doubled quotes are parsed, malformed CSV is rejected', () => {
  assert.deepEqual(audit.parseCsv('Name,Note\n"A, B","said ""hello"""\n')[1], ['A, B','said "hello"']);
  assert.throws(() => audit.parseCsv('Name,Note\n"unclosed'), /unclosed/i);
  assert.throws(() => audit.parseRoster('Name,Email\nAda,a@example.test'), /Missing column/);
});
test('split sibling accounts are suggestions only, not a merged record', () => {
  const rows = [{ line: 2, name: 'Ada', email: 'ada@example.test', phone: '08012345678', children: ['John Doe', 'John Cena'] }];
  const results = audit.previewRoster(rows,
    [student('S1','John','Doe','P1'), student('S2','John','Cena','P2')],
    [parent('P1','ada@example.test','08012345678','S1'), parent('P2','ada@example.test','08012345678','S2')]);
  assert.equal(results[0].kind, 'consolidation');
  assert.deepEqual(results[0].parents.map(p => p.id), ['P1','P2']);
  assert.equal(results[0].children.every(c => c.matches.length === 1), true);
});
test('two students with same name are ambiguous; roster duplicates are flagged', () => {
  const row = { line: 2, name: 'Ada', email: 'ada@example.test', phone: '', children: ['John Doe'] };
  const results = audit.previewRoster([row, { ...row, line: 3 }],
    [student('S1','John','Doe','P1'), student('S2','John','Doe','P2')], []);
  assert.equal(results[0].kind, 'review');
  assert.equal(results[0].children[0].matches.length, 2);
  assert.ok(results[0].flags.some(f => f.includes('more than one roster row')));
});
test('email or phone colliding with another family forces review', () => {
  const results = audit.previewRoster([{ line: 2, name: 'Ada', email: 'same@example.test', phone: '08012345678', children: ['John Doe'] }],
    [student('S1','John','Doe','P1')],
    [parent('P1','other@example.test','08022222222','S1'), parent('P2','same@example.test','08012345678','S2')]);
  assert.equal(results[0].kind, 'review');
  assert.ok(results[0].flags.some(f => f.includes('Contact matches another Parent')));
});
test('non-admin cannot fetch data; all mutations are rejected even for admin', async () => {
  let session = { user: { id:'ordinary', role:'STAFF' } };
  let queries = 0;
  const route = load('src/app/api/parent-reconciliation/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/auth': { auth: async () => session },
    '@/lib/prisma': { prisma: {
      parent: { findMany: async () => { queries++; return []; } },
      student: { findMany: async () => { queries++; return []; } }
    } },
    '@/lib/permissions': { isSuperAdmin: s => s?.user?.role === 'ADMIN' && s.user.id === 'admin-1' }
  });
  assert.equal((await route.GET()).status, 403);
  assert.equal(queries, 0);
  session = { user: { id:'admin-1', role:'ADMIN' } };
  const r = await route.GET();
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control').includes('no-store'), true);
  assert.equal(queries, 2);
  for (const method of ['POST','PUT','PATCH','DELETE']) assert.equal((await route[method]()).status, 405);
  assert.equal(queries, 2);
});
test('name variants get possible Student suggestions only, never an automatic Parent link', () => {
  const rows = [{ line: 2, name: 'Guardian', email: 'new@example.test', phone: '08077777777', children: ['John Michael Doe'] }];
  const results = audit.previewRoster(rows, [student('S1','John','Doe','P1')], [parent('P1','old@example.test','08055555555','S1')]);
  assert.equal(results[0].children[0].matches.length, 0);
  assert.equal(results[0].children[0].possible[0].id, 'S1');
  assert.equal(results[0].parents.length, 0);
  assert.equal(results[0].kind, 'review');
  assert.deepEqual(audit.possibleStudentMatches('John', [student('S1','John','Doe','P1')]), []);
});
test('possible match requires two complete matching name tokens', () => {
  const students = [student('S1','John','Doe','P1'), student('S2','John','Cena','P2')];
  assert.deepEqual(audit.possibleStudentMatches('John Cena Nursery 2', students).map(s => s.id), ['S2']);
  assert.deepEqual(audit.possibleStudentMatches('Jane Smith', students), []);
});
test('student CSV uses useralias and fullname, only Student role', () => {
  const roster = audit.parseStudentRoster('useralias,fullname,email,role,class,category,phone,classarm\nSTU-1,"John Doe",,STUDENT,Primary,,,\nSTF-1,John Doe,,STAFF,,,,\n');
  assert.deepEqual(roster, [{ id: 'STU-1', fullName: 'John Doe' }]);
  assert.throws(() => audit.parseStudentRoster('id,name\n1,John Doe'), /useralias and fullname/);
});
test('same student roster ID links a different app name as a preview suggestion, without writing', () => {
  const rows = [{ line: 2, name: 'Guardian', email: 'guardian@example.test', phone: '08012345678', children: ['John Doe'] }];
  const appStudents = [student('STU-1','John','Cena','P1')];
  const matched = audit.previewRoster(rows, appStudents, [parent('P1','old@example.test','08098765432','STU-1')],
    [{ id: 'stu-1', fullName: 'John Doe' }])[0];
  assert.equal(matched.children[0].matches[0].id, 'STU-1');
  assert.equal(matched.children[0].source, 'Student CSV ID');
  assert.equal(matched.parents[0].id, 'P1');
  assert.equal(matched.kind, 'existing'); // existing = suggestion, NOT approval or apply
});
test('conflicting IDs and duplicate aliases never become unique matches', () => {
  const rows = [{ line: 2, name: 'Guardian', email: '', phone: '', children: ['John Doe'] }];
  const appStudents = [student('STU-1','John','Doe','P1'), student('STU-2','Jane','Cena','P2')];
  const conflict = audit.previewRoster(rows, appStudents, [], [{ id: 'STU-2', fullName: 'John Doe' }])[0];
  assert.equal(conflict.children[0].matches.length, 2);
  const duplicate = audit.previewRoster([{ ...rows[0], children: ['Jane Cena'] }], appStudents, [],
    [{ id: 'STU-1', fullName: 'Jane Cena' }, { id: 'STU-1', fullName: 'Jane Cena' }])[0];
  assert.equal(duplicate.children[0].matches.length, 1); // direct app match only; duplicated alias ignored
  assert.equal(duplicate.children[0].matches[0].id, 'STU-2');
});
test('unrecognized student roster IDs do not create app matches', () => {
  const rows = [{ line: 2, name: 'Guardian', email: '', phone: '', children: ['John Doe'] }];
  const result = audit.previewRoster(rows, [student('STU-1','Jane','Cena','P1')], [],
    [{ id: 'UNKNOWN', fullName: 'John Doe' }])[0];
  assert.equal(result.children[0].matches.length, 0);
  assert.equal(result.children[0].possible.length, 0);
});
test('same three name words in a different order suggest the correct school ID', () => {
  const rows = [{ line: 2, name: 'Guardian', email: '', phone: '', children: ['Doe Michael John'] }];
  const result = audit.previewRoster(rows, [student('STU-1','John','Doe','P1','Michael')], [],
    [{ id:'STU-1', fullName:'John Michael Doe' }])[0];
  assert.equal(result.children[0].matches.length, 1);
  assert.equal(result.children[0].matches[0].id, 'STU-1');
  assert.match(result.children[0].source, /any order/);
  assert.equal(result.kind, 'review');
});
test('same word set on two Student IDs remains ambiguous, not unique', () => {
  const rows = [{ line: 2, name: 'Guardian', email: '', phone: '', children: ['Doe Michael John'] }];
  const result = audit.previewRoster(rows,
    [student('STU-1','John','Doe','P1','Michael'), student('STU-2','Michael','John','P2','Doe')], [])[0];
  assert.equal(result.children[0].matches.length, 2);
  assert.equal(result.kind, 'review');
  assert.equal(audit.unorderedNameKey('John Michael Doe'), audit.unorderedNameKey('Doe John Michael'));
});
