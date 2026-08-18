import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      firstName, lastName, dob, gender, 
      parentName, email, phone, 
      previousSchool, classId 
    } = body;

    // 1. Generate the Custom Student ID (e.g. DIT/STU/001)
    const lastStudent = await prisma.student.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let nextNumber = 1;
    if (lastStudent && lastStudent.id.startsWith("DIT/STU/")) {
      const lastNumberStr = lastStudent.id.split("/").pop();
      if (lastNumberStr) {
        nextNumber = parseInt(lastNumberStr, 10) + 1;
      }
    }
    
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    const newStudentId = `DIT/STU/${formattedNumber}`;

    // 2. Start a Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      let parent = await tx.parent.findFirst({
        where: { email: email }
      });

      if (!parent) {
        parent = await tx.parent.create({
          data: {
            fullName: parentName,
            email: email,
            phone: phone,
          }
        });
      }

      // Create the new student and assign them to the selected class!
      const student = await tx.student.create({
        data: {
          id: newStudentId,
          firstName,
          lastName,
          dob: new Date(dob),
          gender,
          previousSchool,
          parentId: parent.id,
          classId: classId !== "" ? classId : null, // Assign to class
        }
      });

      return student;
    });

    return NextResponse.json({ 
      success: true, 
      message: "Admission successful!", 
      studentId: result.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Admission Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to process admission. Please check the data and try again." 
    }, { status: 500 });
  }
}
