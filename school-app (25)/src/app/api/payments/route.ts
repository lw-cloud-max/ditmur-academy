import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Fetch invoices, optionally filtered by status
    const whereCondition = status ? { status } : {};

    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            id: true,
            parentId: true,
            parent: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, description, amount, status, dueDate } = body;

    // Generate Invoice ID (INV-2024-XXX)
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const formattedNumber = (count + 1).toString().padStart(3, '0');
    const invoiceId = `INV-${year}-${formattedNumber}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        id: invoiceId,
        studentId,
        description,
        amount: parseFloat(amount),
        status: status || 'PENDING',
        dueDate: new Date(dueDate),
        paidDate: status === 'PAID' ? new Date() : null
      }
    });

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json({ success: false, error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, status } = body;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status,
        paidDate: status === 'PAID' ? new Date() : null 
      }
    });

    return NextResponse.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json({ success: false, error: "Failed to update invoice" }, { status: 500 });
  }
}
