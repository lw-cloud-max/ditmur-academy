import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { date: 'asc' }
    });
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, date, endDate, type } = body;

    // Set time to 12:00:00 to prevent timezone timezone shifts across days
    const start = new Date(`${date}T12:00:00Z`);
    const end = endDate ? new Date(`${endDate}T12:00:00Z`) : new Date(`${date}T12:00:00Z`);

    if (end < start) {
       return NextResponse.json({ success: false, error: 'End date cannot be before start date' }, { status: 400 });
    }

    const eventsToCreate = [];
    let current = new Date(start);
    
    while (current <= end) {
      eventsToCreate.push({
        title,
        description,
        type,
        date: new Date(current)
      });
      // Add 24 hours safely
      current.setDate(current.getDate() + 1);
    }

    const createdEvents = await prisma.$transaction(
      eventsToCreate.map(evt => prisma.calendarEvent.create({ data: evt }))
    );

    return NextResponse.json({ success: true, data: createdEvents[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create event", error);
    return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
  }
}
