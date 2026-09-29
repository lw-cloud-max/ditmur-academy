import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { hashPassword, newTemporaryPassword } from "@/lib/passwords";

export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const body = await req.json();
    const { 
      firstName, lastName, otherNames, dob, gender, 
      parentName, email, phone, 
      previousSchool, classId 
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !dob || !gender || !parentName || !email || !phone) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields. Please fill in all required information." 
      }, { status: 400 });
    }

    // 1. Generate the Custom Student ID (e.g. DIT/STU/001)
    // Find the highest existing DIT/STU/ ID
    const allStudents = await prisma.student.findMany({
      select: { id: true }
    });

    let maxNumber = 0;
    allStudents.forEach(student => {
      if (student.id.startsWith("DIT/STU/")) {
        const numStr = student.id.split("/").pop();
        if (numStr) {
          const num = parseInt(numStr, 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
    });

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    const newStudentId = `DIT/STU/${formattedNumber}`;

    // Unique temporary logins are returned ONLY to the super admin once.
    const studentTemp = newTemporaryPassword();
    const parentTemp = newTemporaryPassword();
    const [studentHash, parentHash] = await Promise.all([hashPassword(studentTemp), hashPassword(parentTemp)]);
    const result = await prisma.$transaction(async (tx) => {
      
      let parent = await tx.parent.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' } }
      });

      const parentWasNew = !parent;
      if (!parent) {
        parent = await tx.parent.create({
          data: {
            fullName: parentName,
            email: email,
            phone: phone, password: parentHash, mustChangePassword: true
          }
        });
      }

      // Create the new student and assign them to the selected class!
      const student = await tx.student.create({
        data: {
          id: newStudentId, password: studentHash, mustChangePassword: true,
          firstName,
          lastName,
          otherNames: otherNames || null,
          dob: new Date(dob),
          gender,
          previousSchool,
          parentId: parent.id,
          classId: classId !== "" ? classId : null, // Assign to class
        }
      });

      return { studentId: student.id, parentId: parent.id, parentWasNew };
    });

    return NextResponse.json({
      success: true, message: 'Admission successful!', studentId: result.studentId,
      credentials: [
        { kind: 'STUDENT', id: result.studentId, temporaryPassword: studentTemp },
        ...(result.parentWasNew ? [{ kind: 'PARENT', id: result.parentId, temporaryPassword: parentTemp }] : [])
      ]
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error("Admission Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to process admission. Please check the data and try again." 
    }, { status: 500 });
  }
}
