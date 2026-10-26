import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const emailKey = (value: string | null) => String(value || '').trim().toLowerCase();
function phoneKey(value: string | null) {
  let digits = String(value || '').replace(/\D/g, '');
  if (/^0[789]\d{9}$/.test(digits)) digits = `234${digits.slice(1)}`;
  else if (/^[789]\d{9}$/.test(digits)) digits = `234${digits}`;
  return digits;
}
type HouseholdStudent = { id: string; firstName: string; lastName: string; classId: string | null; class: { name: string } | null };
type HouseholdParent = {
  id: string; fullName: string; email: string | null; phone: string;
  students: HouseholdStudent[];
  _count: { tickets: number; conversations: number; smsNotifications: number };
};
type HouseholdGroup = { groupKey: string; email: string; phone: string; parents: HouseholdParent[] };
function buildGroups(parents: HouseholdParent[]): HouseholdGroup[] {
  const index = new Map<string, HouseholdParent[]>();
  for (const parent of parents) {
    const email = emailKey(parent.email), phone = phoneKey(parent.phone);
    if (!email.includes('@') || phone.length < 10) continue;
    const key = `${email}\u0000${phone}`;
    const records = index.get(key) || [];
    records.push(parent); index.set(key, records);
  }
  return [...index.entries()].filter(([, records]) => records.length > 1).map(([, records]) => ({
    groupKey: records.map(record => record.id).sort().join('|'),
    email: emailKey(records[0].email), phone: records[0].phone,
    parents: records.map(record => ({ ...record, students: record.students.sort((a, b) => a.firstName.localeCompare(b.firstName)) }))
      .sort((a, b) => b.students.length - a.students.length || a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id))
  })).filter(group => group.parents.filter(parent => parent.students.length > 0).length > 1)
    .sort((a, b) => a.email.localeCompare(b.email));
}
async function findGroups(db: Pick<typeof prisma, 'parent'>) {
  const parents = await db.parent.findMany({
    select: { id: true, fullName: true, email: true, phone: true,
      students: { where: { status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, classId: true,
        class: { select: { name: true } } } },
      _count: { select: { tickets: true, conversations: true, smsNotifications: true } }
    }, orderBy: { fullName: 'asc' }
  });
  return buildGroups(parents);
}

export async function GET() {
  if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
  try {
    const groups = await findGroups(prisma);
    return NextResponse.json({ success: true, data: groups,
      summary: { possibleGroups: groups.length, parentRecords: groups.reduce((sum, group) => sum + group.parents.length, 0),
        activeChildren: groups.reduce((sum, group) => sum + group.parents.reduce((count, parent) => count + parent.students.length, 0), 0) }
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not load possible sibling groups' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: noStore });
    const input = body as Record<string, unknown>;
    const keeperId = typeof input.keeperId === 'string' ? input.keeperId.trim() : '';
    const studentIds = input.studentIds;
    if (!keeperId || keeperId.length > 150 || !Array.isArray(studentIds) || studentIds.length < 1 || studentIds.length > 200 ||
        !studentIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 150) ||
        new Set(studentIds).size !== studentIds.length || input.confirmed !== true) {
      return NextResponse.json({ success: false, error: 'Choose one Parent record, select active children, and confirm this family' }, { status: 400, headers: noStore });
    }
    const requestedIds = studentIds as string[];
    const linked = await prisma.$transaction(async tx => {
      const groups = await findGroups(tx);
      const group = groups.find(item => item.parents.some(parent => parent.id === keeperId));
      if (!group) return { error: 'Contact details no longer match a possible family group. Refresh and review again.' };
      const memberIds = group.parents.map(parent => parent.id);
      const keeper = group.parents.find(parent => parent.id === keeperId)!;
      const eligibleIds = new Set(group.parents.flatMap(parent => parent.students.map(student => student.id)));
      if (requestedIds.some(id => !eligibleIds.has(id))) return { error: 'One or more selected students are no longer active or are outside this matching family. Refresh and review again.' };
      const sourceIds = group.parents.filter(parent => parent.id !== keeperId).map(parent => parent.id);
      const movingIds = requestedIds.filter(id => !keeper.students.some(student => student.id === id));
      if (!movingIds.length) return { error: 'The selected active students are already linked to this Parent account.' };
      if (movingIds.some(id => !eligibleIds.has(id))) return { error: 'Invalid student selection.' };
      const result = await tx.student.updateMany({
        where: { id: { in: movingIds }, status: 'ACTIVE', parentId: { in: sourceIds } },
        data: { parentId: keeperId }
      });
      if (result.count !== movingIds.length) throw new Error('HOUSEHOLD_MEMBERSHIP_CHANGED');
      return { linkedCount: result.count, keeperId, retainedParentRecords: memberIds.length,
        preservedTicketCount: group.parents.reduce((sum, parent) => sum + parent._count.tickets, 0),
        preservedConversationCount: group.parents.reduce((sum, parent) => sum + parent._count.conversations, 0),
        preservedSmsHistoryCount: group.parents.reduce((sum, parent) => sum + parent._count.smsNotifications, 0) };
    }, { isolationLevel: 'Serializable' });
    if ('error' in linked) return NextResponse.json({ success: false, error: linked.error }, { status: 409, headers: noStore });
    return NextResponse.json({ success: true, data: linked,
      message: `${linked.linkedCount} active student(s) linked to the selected Parent account. Other Parent records and their individual history were retained.` }, { headers: noStore });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'P2034' || (error instanceof Error && error.message === 'HOUSEHOLD_MEMBERSHIP_CHANGED'))
      return NextResponse.json({ success: false, error: 'School records changed while linking. No partial changes were kept; refresh and review the family again.' }, { status: 409, headers: noStore });
    console.error('Parent household link failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not link this family. Check the records before retrying.' }, { status: 500, headers: noStore });
  }
}
