import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');

    const whereClause = parentId ? { parentId } : {};

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        parent: { select: { fullName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { subject, parentId, message } = await req.json();

    if (!subject || !parentId || !message) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    // Verify the parent exists
    const parent = await prisma.parent.findUnique({
      where: { id: parentId }
    });

    if (!parent) {
      return NextResponse.json({ success: false, error: 'Parent not found' }, { status: 404 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        parentId,
        messages: {
          create: { body: message, sender: 'PARENT' }
        }
      },
      include: {
        parent: { select: { fullName: true } },
        messages: true
      }
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    console.error('Ticket creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create ticket' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { ticketId, action, message, sender } = await req.json();

    if (action === 'close') {
      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'RESOLVED' }
      });
      return NextResponse.json({ success: true, data: ticket });
    }

    if (action === 'reply') {
      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'OPEN', // Re-open if it was resolved
          messages: {
            create: { body: message, sender }
          }
        },
        include: {
          messages: { orderBy: { createdAt: 'asc' } }
        }
      });
      return NextResponse.json({ success: true, data: ticket });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update ticket' }, { status: 500 });
  }
}
