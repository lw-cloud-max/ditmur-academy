import { NextResponse } from 'next/server';

export async function GET() {
  // In a real app, you would fetch this from a database like PostgreSQL or MongoDB
  const students = [
    { id: 'STU-2023-001', name: 'Alice Johnson', grade: 'Grade 10', status: 'Active', gpa: '3.8' },
    { id: 'STU-2023-002', name: 'Bob Smith', grade: 'Grade 9', status: 'Active', gpa: '3.2' },
  ];

  return NextResponse.json({ success: true, data: students });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Simulate saving to a database
    // await db.students.create(body)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Student added successfully',
      data: { id: `STU-2023-00${Math.floor(Math.random() * 10) + 5}`, ...body }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
