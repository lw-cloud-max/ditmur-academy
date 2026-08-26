import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch conversations for the current user
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userRole = session.user.role;
    const userId = session.user.id;

    let conversations;

    if (userRole === 'PARENT') {
      // Parents see their conversations with teachers
      conversations = await prisma.conversation.findMany({
        where: { parentId: userId },
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true, role: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: { where: { isRead: false, senderType: 'TEACHER' } } } }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else if (userRole === 'STAFF' || userRole === 'ADMIN') {
      // Teachers see conversations with parents
      conversations = await prisma.conversation.findMany({
        where: { teacherId: userId },
        include: {
          parent: { select: { id: true, fullName: true, email: true, phone: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: { where: { isRead: false, senderType: 'PARENT' } } } }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Fetch conversations error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST: Create a new conversation
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { teacherId, studentId, message } = await req.json();
    const userRole = session.user.role;
    const userId = session.user.id;

    if (userRole !== 'PARENT') {
      return NextResponse.json({ success: false, error: 'Only parents can start conversations' }, { status: 403 });
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        parentId: userId,
        teacherId: teacherId,
        studentId: studentId || null
      }
    });

    if (existingConversation) {
      return NextResponse.json({ success: false, error: 'Conversation already exists', conversationId: existingConversation.id }, { status: 409 });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        parentId: userId,
        teacherId: teacherId,
        studentId: studentId || null,
        lastMessage: message,
        messages: {
          create: {
            senderId: userId,
            senderType: 'PARENT',
            content: message
          }
        }
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        messages: true
      }
    });

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 });
  }
}
