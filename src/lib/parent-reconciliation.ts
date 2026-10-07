// Roster preview only: no writes, no credentials, no transmission of CSV data.
export type ExistingStudent = { id: string; firstName: string; lastName: string; otherNames: string | null; parentId: string | null; class: { name: string } | null };
export type ExistingParent = { id: string; fullName: string; email: string | null; phone: string; students: { id: string }[] };
export type RosterEntry = { line: number; name: string; email: string; phone: string; children: string[] };
export type ChildSuggestion = { name: string; matches: ExistingStudent[]; possible: ExistingStudent[] };
export type FamilySuggestion = { row: RosterEntry; children: ChildSuggestion[]; parents: ExistingParent[]; flags: string[]; kind: 'review' | 'consolidation' | 'existing' };

export function parseCsv(text: string): string[][] {
  if (text.length > 2_000_000) throw Error('CSV exceeds 2 MB. Split the roster into smaller files.');
  const rows: string[][] = [], row: string[] = [];
  let field = '', quoted = false, closed = false, started = false;
  const pushField = () => { row.push(field); field = ''; started = false; closed = false; };
  const pushRow = () => { pushField(); if (row.some(cell => cell.trim())) rows.push(row.slice()); row.length = 0; };
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === '"') {
      if (started || closed) throw Error('Invalid CSV quotation at character ' + (i + 1));
      quoted = true; started = true;
    } else if (ch === ',') pushField();
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      pushRow();
    } else {
      if (closed && ch.trim()) throw Error('Unexpected text after closing CSV quote at character ' + (i + 1));
      if (!closed) field += ch;
      started = true;
    }
  }
  if (quoted) throw Error('CSV has an unclosed quoted field. Save as CSV UTF-8 from Excel.');
  if (started || closed || field || row.length) pushRow();
  if (!rows.length) throw Error('CSV is empty.');
  if (rows[0].length === 1 && rows[0][0].includes(';')) throw Error('Use comma-separated CSV UTF-8, not semicolon-separated CSV.');
  if (rows.length > 1001) throw Error('Preview is limited to 1,000 guardian rows.');
  return rows;
}

const normHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export function normalizeName(value: string) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
export const normalizeEmail = (value: string | null) => String(value || '').trim().toLowerCase();
export function normalizePhone(value: string | null) {
  let digits = String(value || '').replace(/\D/g, '');
  if (/^0[789]\d{9}$/.test(digits)) digits = '234' + digits.slice(1);
  else if (/^[789]\d{9}$/.test(digits)) digits = '234' + digits;
  return digits;
}
export function parseChildren(value: string) {
  // Excel CSV quotes cells containing line breaks. One numbered child per line.
  return String(value || '').split(/\r\n|\n|\r/)
    .map(line => line.trim().replace(/^\d+\s*[.)-]\s*/, '').trim())
    .filter(Boolean);
}
export function parseRoster(text: string): RosterEntry[] {
  const rows = parseCsv(text);
  const headings = rows[0].map(normHeader);
  const required = ['firstname', 'surname', 'email', 'phone', 'linkedstudents'];
  for (const heading of required) if (headings.indexOf(heading) === -1)
    throw Error('Missing column: ' + heading + '. Required: First Name, Surname, Email, Phone, Linked students.');
  const col = (row: string[], key: string) => (row[headings.indexOf(key)] || '').trim();
  return rows.slice(1).filter(row => row.some(cell => cell.trim())).map((row, i) => {
    if (row.length !== headings.length) throw Error('CSV row ' + (i + 2) + ' has a different number of columns. Export again as CSV UTF-8.');
    const name = [col(row, 'firstname'), col(row, 'othername'), col(row, 'surname')].filter(Boolean).join(' ');
    return { line: i + 2, name, email: col(row, 'email'), phone: col(row, 'phone'), children: parseChildren(col(row, 'linkedstudents')) };
  });
}
function namesFor(student: ExistingStudent) {
  const firstLast = `${student.firstName} ${student.lastName}`;
  const full = `${student.firstName} ${student.otherNames || ''} ${student.lastName}`;
  const lastFirst = `${student.lastName} ${student.firstName}`;
  return new Set([firstLast, full, lastFirst].map(normalizeName));
}
// Suggestions only. Two shared name tokens are required; no partial or
// one-token guesses. Never use these candidates to select or merge a Parent.
export function possibleStudentMatches(name: string, students: ExistingStudent[]): ExistingStudent[] {
  const query = new Set(normalizeName(name).split(' ').filter(Boolean));
  if (query.size < 2) return [];
  const ranked = students.map(student => {
    const tokens = new Set(normalizeName(`${student.firstName} ${student.otherNames || ''} ${student.lastName}`).split(' ').filter(Boolean));
    const shared = [...query].filter(token => tokens.has(token)).length;
    return { student, shared, score: shared * 10 - Math.abs(query.size - tokens.size) * 2 };
  }).filter(item => item.shared >= 2);
  ranked.sort((a, b) => b.score - a.score || a.student.id.localeCompare(b.student.id));
  // Never flood the screen with common names or suggest weak matches.
  return ranked.slice(0, 5).map(item => item.student);
}
export function previewRoster(entries: RosterEntry[], students: ExistingStudent[], parents: ExistingParent[]): FamilySuggestion[] {
  const index = new Map<string, ExistingStudent[]>();
  for (const student of students) for (const name of namesFor(student)) {
    if (!name) continue;
    const list = index.get(name) || [];
    if (!list.some(item => item.id === student.id)) list.push(student);
    index.set(name, list);
  }
  const parentsById = new Map(parents.map(parent => [parent.id, parent]));
  const childUse = new Map<string, number>();
  const contactUse = new Map<string, number>();
  for (const entry of entries) {
    for (const name of entry.children) {
      const key = normalizeName(name); if (key) childUse.set(key, (childUse.get(key) || 0) + 1);
    }
    const email = normalizeEmail(entry.email);
    if (email) contactUse.set(email, (contactUse.get(email) || 0) + 1);
  }
  return entries.map(row => {
    const flags: string[] = [];
    if (!normalizeName(row.name)) flags.push('Guardian name missing');
    if (!row.email || !row.email.includes('@')) flags.push('Guardian email missing or invalid');
    if (!normalizePhone(row.phone)) flags.push('Guardian phone missing');
    if (!row.children.length) flags.push('No linked students listed');
    if (row.children.some(name => (childUse.get(normalizeName(name)) || 0) > 1)) flags.push('Child appears in more than one roster row');
    if (normalizeEmail(row.email) && (contactUse.get(normalizeEmail(row.email)) || 0) > 1) flags.push('Email repeats in the roster');
    const children = row.children.map(name => {
      const matches = index.get(normalizeName(name)) || [];
      return { name, matches, possible: matches.length ? [] : possibleStudentMatches(name, students) };
    });
    if (children.some(child => child.matches.length !== 1)) flags.push('Missing or ambiguous child-name match');
    const ids = new Set(children.filter(child => child.matches.length === 1).map(child => child.matches[0].parentId).filter((id): id is string => !!id));
    const email = normalizeEmail(row.email), phone = normalizePhone(row.phone);
    const contactParents = parents.filter(p => (email && normalizeEmail(p.email) === email) || (phone && normalizePhone(p.phone) === phone));
    if (contactParents.some(p => !ids.has(p.id))) flags.push('Contact matches another Parent record; verify identity');
    for (const parent of contactParents) ids.add(parent.id);
    const matchedParents = [...ids].map(id => parentsById.get(id)).filter((p): p is ExistingParent => !!p);
    if (!matchedParents.length) flags.push('No existing Parent candidate');
    // These are suggestions, never approval to merge or write anything.
    const kind = flags.length ? 'review' : matchedParents.length > 1 ? 'consolidation' : 'existing';
    return { row, children, parents: matchedParents, flags, kind };
  });
}
