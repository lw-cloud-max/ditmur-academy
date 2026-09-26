import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let title = '';

  try {
    const body = await req.json();
    title = body.title;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.log('OPENAI_API_KEY not found, using mock data');
      return getLessonPlanFallback(title);
    }

    // Call OpenAI API directly
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert curriculum developer. Create a detailed lesson plan for Nigerian schools. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Create a lesson plan for: "${title}"\n\nReturn JSON with these keys:\n{\n  "schemeOfWork": "Weekly scheme with objectives",\n  "lessonNote": "Detailed lesson note for students",\n  "evaluation": "Evaluation questions",\n  "assignment": "Take-home assignment"\n}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return getLessonPlanFallback(title);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return getLessonPlanFallback(title);
    }

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ success: true, data: parsed });
      }
    } catch (e) {
      console.log('JSON parse failed, using mock data');
    }

    return getLessonPlanFallback(title);

  } catch (error) {
    console.error('Lesson plan error:', error);
    return getLessonPlanFallback(title || 'Unknown Topic');
  }
}

function getLessonPlanFallback(title: string) {
  const data = {
    schemeOfWork: `WEEKLY SCHEME OF WORK\nTopic: ${title}\n\nOBJECTIVES:\nBy the end of this lesson, students should be able to:\n1. Define and explain ${title}\n2. Identify real-world applications\n3. Solve problems related to the topic\n\nINSTRUCTIONAL MATERIALS:\n- Whiteboard\n- Textbook\n- Handouts\n\nTEACHING METHODOLOGY:\n- Direct Instruction (30%)\n- Interactive Q&A (20%)\n- Guided Practice (30%)\n- Independent Work (20%)`,
    lessonNote: `LESSON NOTE: ${title.toUpperCase()}\n\n1. INTRODUCTION\n${title} is an important topic in this subject.\n\n2. KEY CONCEPTS\n- Definition\n- Main principles\n- Important formulas\n\n3. EXAMPLES\nExample 1: Basic application\nExample 2: Real-world scenario\n\n4. SUMMARY\n- Key points to remember\n- Common mistakes to avoid\n\nPlease copy these notes.`,
    evaluation: `EVALUATION:\n1. Define ${title}\n2. Give one example\n3. What are the key principles?`,
    assignment: `ASSIGNMENT:\n1. Read textbook chapter on ${title}\n2. Answer questions 1-5\n3. Research one application of ${title}`
  };
  return NextResponse.json({ success: true, data });
}
