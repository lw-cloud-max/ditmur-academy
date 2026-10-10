import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
type Fields = { id: string; firstName: string; lastName: string; otherNames: string | null;
  dob: Date; gender: string; classId: string; parentId: string | null };
const name = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const words = (value: string) => name(value).split(' ').filter(Boolean).sort().join(' ');

function parseFields(body: Record<string, unknown>): Fields | null {
  const field = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const id = field('id').toUpperCase();
  const firstName = field('firstName'), lastName = field('lastName'), otherNames = field('otherNames');
  const classId = field('classId'), parentId = field('parentId');
  const dob = field('dob');
  if (!/^[A-Z0-9][A-Z0-9./_-]{1,79}$/.test(id) || !firstName || firstName.length > 80 ||
      !lastName || lastName.length > 80 || otherNames.length > 120 || !classId || classId.length > 150 ||
      parentId.length > 150 || !['Male', 'Female'].includes(field('gender')) || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const date = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dob ||
      date.getTime() > Date.now() || date.getUTCFullYear() < 1900) return null;
  return { id, firstName, lastName, otherNames: otherNames || null, dob: date,
    gender: field('gender'), classId, parentId: parentId || null };
}
type Db = Pick<typeof prisma, 'student' | 'parent' | 'class'>;
async function inspect(db: Db, fields: Fields) {
  const nextDay = new Date(fields.dob.getTime() + 24 * 60 * 60 * 1000);
  const [idMatches, sameBirthday, schoolClass, parent] = await Promise.all([
    db.student.findMany({ where: { id: { equals: fields.id, mode: 'insensitive' } },
      select: { id: true, firstName: true, lastName: true }, take: 3 }),
    db.student.findMany({ where: { dob: { gte: fields.dob, lt: nextDay } },
      select: { id: true, firstName: true, otherNames: true, lastName: true, class: { select: { name: true } } } }),
    db.class.findUnique({ where: { id: fields.classId }, select: { id: true, name: true } }),
    fields.parentId ? db.parent.findUnique({ where: { id: fields.parentId },
      select: { id: true, fullName: true, email: true, students: { select: { id: true, firstName: true, lastName: true } } } }) : Promise.resolve(null)
  ]);
  const full = words(`${fields.firstName} ${fields.otherNames || ''} ${fields.lastName}`);
  const firstLast = words(`${fields.firstName} ${fields.lastName}`);
  const possibleDuplicates = sameBirthday.filter(row =>
    words(`${row.firstName} ${row.otherNames || ''} ${row.lastName}`) === full ||
    words(`${row.firstName} ${row.lastName}`) === firstLast);
  return { id: fields.id, idMatches, possibleDuplicates, schoolClass, parent,
    canCreate: idMatches.length === 0 && possibleDuplicates.length === 0 && !!schoolClass && (!fields.parentId || !!parent) };
}
export async function GET() {
  if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers });
  try {
    const [classes, parents] = await Promise.all([
      prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.parent.findMany({ select: { id: true, fullName: true, email: true,
        students: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { fullName: 'asc' } })
    ]);
    return NextResponse.json({ success: true, classes, parents }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not load admission choices' }, { status: 500, headers });
  }
}
export async function POST(req: Request) {
  if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers });
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host)
    return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers });
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return NextResponse.json({ success: false, error: 'Invalid form' }, { status: 400, headers });
    const value = body as Record<string, unknown>;
    const fields = parseFields(value);
    if (!fields || !['preview', 'create'].includes(String(value.action)))
      return NextResponse.json({ success: false, error: 'Enter a valid existing Student ID, names, date of birth, gender and class' }, { status: 400, headers });
    if (value.action === 'preview') {
      const result = await inspect(prisma, fields);
      return NextResponse.json({ success: true, data: result }, { headers });
    }
    if (value.confirmed !== true)
      return NextResponse.json({ success: false, error: 'Preview and confirm this exact student first' }, { status: 400, headers });
    const result = await prisma.$transaction(async tx => {
      const checked = await inspect(tx, fields);
      if (!checked.canCreate) return { created: false, checked };
      const created = await tx.student.create({ data: {
        id: fields.id, firstName: fields.firstName, lastName: fields.lastName,
        otherNames: fields.otherNames, dob: fields.dob, gender: fields.gender,
        classId: fields.classId, parentId: fields.parentId,
        password: null, mustChangePassword: true, sessionVersion: 0, status: 'ACTIVE'
      }, select: { id: true } });
      return { created: true, id: created.id };
    }, { isolationLevel: 'Serializable' });
    if (!result.created) return NextResponse.json({ success: false, error: 'Records changed or duplicate found. Nothing created. Preview again.', data: result.checked }, { status: 409, headers });
    return NextResponse.json({ success: true, data: { id: result.id, passwordIssued: false },
      message: 'Student created with the original ID. No login password was issued.' }, { status: 201, headers });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code)))
      return NextResponse.json({ success: false, error: 'Student ID or matching records changed. No student created. Preview again.' }, { status: 409, headers });
    console.error('Preserve-ID student operation failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Unable to complete request. No confirmation of a new student; check the Students directory before retrying.' }, { status: 500, headers });
  }
}
