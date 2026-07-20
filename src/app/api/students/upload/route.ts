import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('studentId') as string;

    if (!file || !studentId) {
      return NextResponse.json({ success: false, error: 'File and Student ID are required.' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename (e.g. DIT-STU-001-163456789.jpg)
    const sanitizedId = studentId.replace(/\//g, '-');
    const filename = `${sanitizedId}-${Date.now()}${path.extname(file.name)}`;
    
    // Save to public/uploads directory
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Update the database with the public URL
    const imageUrl = `/uploads/${filename}`;
    await prisma.student.update({
      where: { id: studentId },
      data: { imageUrl }
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Image upload failed:", error);
    return NextResponse.json({ success: false, error: 'Failed to upload image' }, { status: 500 });
  }
}
