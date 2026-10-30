import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';
import { makeScoreEntryStatus, parseWATDateTime } from '@/lib/score-entry-window';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const validTerm = (value: unknown): value is string => typeof value === 'string' && value.trim().length >= 3 && value.trim().length <= 120;
type ScoreActor = { user?: { role?: string } } | null;
const allowedStaff = (session: ScoreActor) => !!session?.user && ['STAFF', 'ADMIN'].includes(session.user.role || '');

export async function GET(req: Request) {
  const session = await auth();
  if (!allowedStaff(session)) return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
  try {
    const term = new URL(req.url).searchParams.get('term')?.trim() || '';
    if (!validTerm(term)) return NextResponse.json({ success: false, error: 'A valid academic term is required' }, { status: 400, headers: noStore });
    const config = await prisma.scoreEntryWindow.findUnique({ where: { term }, select: { opensAt: true, closesAt: true, reopenUntil: true, reopenReason: true, reopenedBy: true } });
    const status = makeScoreEntryStatus(term, config);
    return NextResponse.json({ success: true, data: isSuperAdmin(session)
      ? { ...status, reopenReason: config?.reopenReason || null, reopenedBy: config?.reopenedBy || null }
      : status }, { headers: noStore });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not check score-entry window' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: noStore });
    const input = body as Record<string, unknown>;
    const term = typeof input.term === 'string' ? input.term.trim() : '';
    const action = input.action;
    if (!validTerm(term) || !['SET_WINDOW', 'REOPEN', 'END_REOPEN'].includes(String(action))) {
      return NextResponse.json({ success: false, error: 'Choose a valid academic term and action' }, { status: 400, headers: noStore });
    }
    const isLegacyTerm = term === 'Term 1 - 2024';
    const terms = isLegacyTerm ? [] : await prisma.academicTerm.findMany({ select: { name: true, session: true } });
    if (!isLegacyTerm && !terms.some(item => `${item.name} ${item.session}`.trim() === term)) {
      return NextResponse.json({ success: false, error: 'Choose a term configured in the school calendar' }, { status: 404, headers: noStore });
    }
    if (action === 'SET_WINDOW') {
      const opensAt = parseWATDateTime(input.opensAtLocal);
      const closesAt = parseWATDateTime(input.closesAtLocal);
      if (!opensAt || !closesAt || closesAt <= opensAt) return NextResponse.json({ success: false, error: 'Set valid opening and closing date/times; closing must be after opening.' }, { status: 400, headers: noStore });
      const config = await prisma.scoreEntryWindow.upsert({ where: { term },
        create: { term, opensAt, closesAt },
        update: { opensAt, closesAt, reopenUntil: null, reopenReason: null, reopenedBy: null },
        select: { opensAt: true, closesAt: true, reopenUntil: true } });
      return NextResponse.json({ success: true, data: makeScoreEntryStatus(term, config), message: 'Score-entry schedule saved (Nigeria time, WAT).' }, { headers: noStore });
    }
    const existing = await prisma.scoreEntryWindow.findUnique({ where: { term }, select: { opensAt: true, closesAt: true, reopenUntil: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Set the normal score-entry window before reopening it.' }, { status: 409, headers: noStore });
    if (action === 'END_REOPEN') {
      const config = await prisma.scoreEntryWindow.update({ where: { term }, data: { reopenUntil: null, reopenReason: null, reopenedBy: null },
        select: { opensAt: true, closesAt: true, reopenUntil: true } });
      return NextResponse.json({ success: true, data: makeScoreEntryStatus(term, config), message: 'Temporary reopen ended.' }, { headers: noStore });
    }
    const now = new Date();
    if (now <= existing.closesAt) return NextResponse.json({ success: false, error: 'The scheduled window has not closed yet; no reopen is needed.' }, { status: 409, headers: noStore });
    const reopenUntil = parseWATDateTime(input.reopenUntilLocal);
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    const maxUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (!reopenUntil || reopenUntil <= now || reopenUntil > maxUntil || reason.length < 10 || reason.length > 300) {
      return NextResponse.json({ success: false, error: 'Choose a future WAT time within 14 days and enter a 10-300 character reason.' }, { status: 400, headers: noStore });
    }
    const config = await prisma.scoreEntryWindow.update({ where: { term }, data: {
      reopenUntil, reopenReason: reason, reopenedBy: session!.user!.id
    }, select: { opensAt: true, closesAt: true, reopenUntil: true } });
    return NextResponse.json({ success: true, data: makeScoreEntryStatus(term, config), message: 'Score entry temporarily reopened; the reason is recorded.' }, { headers: noStore });
  } catch (error) {
    console.error('Update score-entry window failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not save score-entry window' }, { status: 500, headers: noStore });
  }
}
