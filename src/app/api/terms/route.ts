import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export async function GET() {
  try {
    const terms = await prisma.academicTerm.findMany({
      orderBy: [
        { session: 'desc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json({ success: true, data: terms });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch terms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const body = await req.json();
    const { name, session, isCurrent, startDate, endDate } = body;

    if (!['First Term', 'Second Term', 'Third Term'].includes(name) ||
        typeof session !== 'string' || !/^\d{4}[-/]\d{4}$/.test(session) ||
        Number(session.slice(5)) !== Number(session.slice(0, 4)) + 1 ||
        (startDate && Number.isNaN(Date.parse(startDate))) ||
        (endDate && Number.isNaN(Date.parse(endDate)))) {
      return NextResponse.json({ success: false, error: 'Choose a valid term and academic session' }, { status: 400 });
    }
    const alreadyExists = await prisma.academicTerm.findFirst({ where: { session, name } });
    if (alreadyExists) return NextResponse.json({ success: false, error: 'This term already exists for that session' }, { status: 409 });
    const term = await prisma.$transaction(async tx => {
      if (isCurrent) await tx.academicTerm.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      return tx.academicTerm.create({ data: {
        name, session, isCurrent: !!isCurrent,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      } });
    });

    return NextResponse.json({ success: true, data: term }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create term' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const body = await req.json();
    const { id, isCurrent } = body;

    if (typeof id !== 'string' || !id || typeof isCurrent !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Valid term and status required' }, { status: 400 });
    }
    const updated = await prisma.$transaction(async tx => {
      if (isCurrent) await tx.academicTerm.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      return tx.academicTerm.update({ where: { id }, data: { isCurrent } });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update term' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.academicTerm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete term' }, { status: 500 });
  }
}
