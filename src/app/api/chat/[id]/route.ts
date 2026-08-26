import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch messages for a conversation
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const userId = session.user.id;
    const userRole = session.user.role;

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        parent: { select: { id: true, fullName: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const isParent = userRole === 'PARENT' && conversation.parentId === userId;
    const isTeacher = (userRole === 'STAFF' || userRole === 'ADMIN') && conversation.teacherId === userId;

    if (!isParent && !isTeacher) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch messages
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    const senderType = isParent ? 'TEACHER' : 'PARENT';
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderType: senderType,
        isRead: false
      },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true, data: { conversation, messages } });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: Send a message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const userId = session.user.id;
    const userRole = session.user.role;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
    }

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const isParent = userRole === 'PARENT' && conversation.parentId === userId;
    const isTeacher = (userRole === 'STAFF' || userRole === 'ADMIN') && conversation.teacherId === userId;

    if (!isParent && !isTeacher) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const senderType = isParent ? 'PARENT' : 'TEACHER';

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        senderType,
        content: content.trim()
      }
    });

    // Update conversation's last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.trim(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
