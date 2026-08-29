import { NextResponse } from 'next/server';
import { createOpenAIClient, getAIModel, isAIConfigured } from '@/lib/ai-config';

export async function POST(req: Request) {
  try {
    const { topic, numQuestions, examType, subject, action, question, options, correctAnswer } = await req.json();

    const openai = createOpenAIClient();

    if (!openai || !isAIConfigured()) {
      return NextResponse.json({ 
        success: false, 
        error: 'AI is not configured. Please add OPENAI_API_KEY to environment variables.' 
      }, { status: 500 });
    }

    // Action: Generate explanation for a single question
    if (action === 'explain' && question) {
      const prompt = `You are an expert ${subject || 'academic'} tutor. Provide a clear, step-by-step explanation for this multiple-choice question:

Question: ${question}
Options:
A. ${options.A}
B. ${options.B}
C. ${options.C}
D. ${options.D}
Correct Answer: ${correctAnswer}

Provide a detailed explanation that helps the student understand WHY the correct answer is correct. Include:
1. The concept being tested
2. Step-by-step solution process
3. Why other options are incorrect (if relevant)

Keep it concise but educational.`;

      const completion = await openai.chat.completions.create({
        model: getAIModel(),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const explanation = completion.choices[0]?.message?.content || '';
      return NextResponse.json({ success: true, explanation });
    }

    // Action: Generate multiple questions
    if (!topic || !numQuestions) {
      return NextResponse.json({ success: false, error: 'Topic and number of questions required' }, { status: 400 });
    }

    const prompt = `You are an expert in Nigerian education. Generate ${numQuestions} multiple-choice questions for ${examType || 'JAMB'} ${subject || 'Mathematics'} exam on the topic: "${topic}".

For each question, provide:
1. The question text
2. Four options (A, B, C, D)
3. The correct answer (A, B, C, or D)
4. A detailed explanation/solution
5. The topic category
6. Difficulty level (EASY, MEDIUM, or HARD)

Return the response as a JSON array with this exact structure:
[
  {
    "questionNumber": 1,
    "text": "Question text here",
    "optionA": "Option A text",
    "optionB": "Option B text",
    "optionC": "Option C text",
    "optionD": "Option D text",
    "correctAnswer": "B",
    "explanation": "Step-by-step explanation here",
    "topic": "Topic name",
    "difficulty": "EASY"
  }
]

Make sure:
- Questions are appropriate for ${examType || 'JAMB'} level
- Explanations are clear and educational
- Mix of difficulty levels
- Questions test understanding, not just memorization
- Return ONLY the JSON array, no other text`;

    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ success: true, data: questions });
      } else {
        return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 500 });
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ success: false, error: 'Failed to parse AI response as JSON' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('AI CBT Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `AI error: ${error.message}` 
    }, { status: 500 });
  }
}
