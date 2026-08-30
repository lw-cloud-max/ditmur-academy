import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch all parents
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    const parents = await prisma.parent.findMany({
      where: whereClause,
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    return NextResponse.json({ success: true, data: parents });
  } catch (error) {
    console.error('Fetch parents error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch parents' }, { status: 500 });
  }
}

// PATCH: Update parent
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, fullName, email, phone, password } = await req.json();

    if (!id || !fullName || !phone) {
      return NextResponse.json({ success: false, error: 'ID, name, and phone are required' }, { status: 400 });
    }

    // Check if parent exists
    const existingParent = await prisma.parent.findUnique({
      where: { id }
    });

    if (!existingParent) {
      return NextResponse.json({ success: false, error: 'Parent not found' }, { status: 404 });
    }

    // Update parent
    const updateData: any = {
      fullName,
      email: email || null,
      phone
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const parent = await prisma.parent.update({
      where: { id },
      data: updateData,
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: parent });
  } catch (error) {
    console.error('Update parent error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update parent' }, { status: 500 });
  }
}

// DELETE: Delete parent
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Parent ID required' }, { status: 400 });
    }

    // Check if parent exists
    const parent = await prisma.parent.findUnique({
      where: { id },
      include: { students: true }
    });

    if (!parent) {
      return NextResponse.json({ success: false, error: 'Parent not found' }, { status: 404 });
    }

    // Unlink all students from this parent
    if (parent.students.length > 0) {
      await prisma.student.updateMany({
        where: { parentId: id },
        data: { parentId: null }
      });
    }

    // Delete related records
    await prisma.ticket.deleteMany({ where: { parentId: id } });
    await prisma.conversation.deleteMany({ where: { parentId: id } });
    await prisma.sMSNotification.deleteMany({ where: { parentId: id } });

    // Delete parent
    await prisma.parent.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Parent deleted successfully' });
  } catch (error) {
    console.error('Delete parent error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete parent' }, { status: 500 });
  }
}
