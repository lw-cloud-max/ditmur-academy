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
      return getMockData(title);
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
            content: `You are an expert curriculum developer and teacher. Create a comprehensive, detailed lesson plan for Nigerian schools. Return ONLY valid JSON with these exact keys: schemeOfWork, lessonNote, evaluation, assignment. Make the content detailed and practical.`
          },
          {
            role: 'user',
            content: `Create a detailed lesson plan for the topic: "${title}". Include:\n1. Scheme of Work with objectives\n2. Comprehensive lesson note for students\n3. Evaluation questions\n4. Take-home assignment\n\nReturn as JSON: {"schemeOfWork": "...", "lessonNote": "...", "evaluation": "...", "assignment": "..."}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return getMockData(title);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return getMockData(title);
    }

    try {
      // Try to parse JSON from the response
      const parsed = JSON.parse(content);
      return NextResponse.json({ success: true, data: parsed });
    } catch {
      // If JSON parsing fails, return mock data
      return getMockData(title);
    }

  } catch (error) {
    console.error('Lesson plan error:', error);
    return getMockData(title || 'Unknown Topic');
  }
}

function getMockData(title: string) {
  const data = {
    schemeOfWork: `WEEKLY SCHEME OF WORK\nTopic: ${title}\n\nOBJECTIVES:\nBy the end of this lesson, students should be able to:\n1. Clearly define and explain the core concepts of ${title}.\n2. Identify at least three real-world applications.\n3. Solve basic problems related to the topic.\n4. Participate in group discussions.\n\nINSTRUCTIONAL MATERIALS:\n- Whiteboard and markers\n- Printed handouts\n- Recommended textbook\n\nTEACHING METHODOLOGY:\n- Direct Instruction (30%)\n- Interactive Q&A (20%)\n- Guided Practice (30%)\n- Independent Work (20%)`,

    lessonNote: `COMPREHENSIVE LESSON NOTE: ${title.toUpperCase()}\n\n1. INTRODUCTION\n${title} is a fundamental concept in this subject. Understanding it is crucial for your academic success.\n\n2. CORE CONCEPTS\n- Definition and key terms\n- Main principles and rules\n- Important formulas (if applicable)\n\n3. EXAMPLES\nExample 1: Basic application of ${title}\nExample 2: Real-world scenario\n\n4. STEP-BY-STEP GUIDE\nStep 1: Identify the problem\nStep 2: Apply the relevant rules\nStep 3: Calculate the answer\nStep 4: Verify your solution\n\n5. SUMMARY\n- Key points to remember\n- Common mistakes to avoid\n\nPlease copy these notes into your notebooks.`,

    evaluation: `FORMATIVE EVALUATION:\n\nOral Questions:\n1. Define ${title} in your own words.\n2. Give one real-world example.\n3. What are the key principles?\n\nClass Activity:\nGroup work - Solve problems related to ${title} in teams.`,

    assignment: `TAKE-HOME ASSIGNMENT:\n\n1. Read the textbook chapter on ${title}.\n2. Answer questions 1-5 at the end of the chapter.\n3. Research one real-world application of ${title}.\n\nDue: Next class session`
  };

  return NextResponse.json({ success: true, data });
}
