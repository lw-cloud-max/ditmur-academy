import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { term, ratings } = body;

    // Use a transaction to safely upsert all ratings at once
    await prisma.$transaction(
      ratings.map((ratingData: any) => {
        return prisma.skillRating.upsert({
          where: {
            studentId_name_term: {
              studentId: ratingData.studentId,
              name: ratingData.name,
              term: term
            }
          },
          update: {
            rating: parseInt(ratingData.rating, 10)
          },
          create: {
            studentId: ratingData.studentId,
            category: ratingData.category,
            name: ratingData.name,
            term: term,
            rating: parseInt(ratingData.rating, 10)
          }
        });
      })
    );

    return NextResponse.json({ success: true, message: "Skills saved successfully!" }, { status: 200 });

  } catch (error) {
    console.error("Failed to save skills:", error);
    return NextResponse.json({ success: false, error: "Failed to save skills." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const term = searchParams.get('term') || "Term 1 - 2024";

    if (!classId) {
      return NextResponse.json({ success: false, error: "classId required" }, { status: 400 });
    }

    const skills = await prisma.skillRating.findMany({
      where: {
        term: term,
        student: {
          classId: classId
        }
      }
    });

    return NextResponse.json({ success: true, data: skills });
  } catch (error) {
    console.error("Failed to fetch skills:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch skills." }, { status: 500 });
  }
}
