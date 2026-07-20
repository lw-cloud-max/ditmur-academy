import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { studentName, totalScore, finalGrade } = await req.json();
    if (!studentName) return NextResponse.json({ success: false, error: 'Student data required' }, { status: 400 });

    /* 
      ======================================================
      REAL AI INTEGRATION (OPENAI / CHATGPT)
      ======================================================
      import OpenAI from 'openai';
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are a thoughtful teacher writing end-of-term report card comments. Keep it under 2 sentences. Be encouraging but honest based on their grade."
          },
          { role: "user", content: `Write a comment for ${studentName} who scored ${totalScore} (Grade: ${finalGrade}).` }
        ]
      });

      return NextResponse.json({ success: true, data: response.choices[0].message.content });
      ======================================================
    */

    await new Promise(resolve => setTimeout(resolve, 1500));

    let comment = "";
    if (["A", "B"].includes(finalGrade)) {
      comment = `${studentName} has demonstrated exceptional understanding and discipline this term, reflecting the core values of Ditmur Academy. Keep up the excellent work!`;
    } else if (finalGrade === "C") {
      comment = `${studentName} has shown steady progress but needs to focus more on independent study to reach their full potential next term.`;
    } else {
      comment = `${studentName} has faced some academic challenges this term. With increased focus and participation, we are confident they will improve significantly.`;
    }

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate AI comment." }, { status: 500 });
  }
}
