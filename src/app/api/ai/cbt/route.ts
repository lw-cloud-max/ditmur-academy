import { NextResponse } from 'next/server';
import { createOpenAIClient, getAIModel, isAIConfigured } from '@/lib/ai-config';

export async function POST(req: Request) {
  try {
    const { topic, numQuestions, examType, subject, action, question, options, correctAnswer } = await req.json();

    console.log('AI CBT Request:', { action, topic, numQuestions, examType, subject });

    const openai = createOpenAIClient();

    if (!openai || !isAIConfigured()) {
      console.log('AI not configured, returning mock response');
      
      // Return mock questions when AI is not configured
      if (action === 'explain') {
        return NextResponse.json({ 
          success: true, 
          explanation: `This question tests your understanding of the concept. The correct answer is ${correctAnswer}. Please review the topic for a detailed understanding.` 
        });
      }

      // Generate mock questions
      const mockQuestions = [];
      for (let i = 1; i <= (numQuestions || 5); i++) {
        mockQuestions.push({
          questionNumber: i,
          text: `Sample ${subject || 'Mathematics'} question ${i} about ${topic || 'general topics'}?`,
          optionA: 'Option A',
          optionB: 'Option B',
          optionC: 'Option C',
          optionD: 'Option D',
          correctAnswer: 'B',
          explanation: `This is a sample explanation for question ${i}. The correct answer is B because it directly relates to the concept being tested.`,
          topic: topic || 'General',
          difficulty: i % 3 === 0 ? 'HARD' : i % 3 === 1 ? 'EASY' : 'MEDIUM'
        });
      }

      return NextResponse.json({ success: true, data: mockQuestions });
    }

    // Action: Generate explanation for a single question
    if (action === 'explain' && question) {
      console.log('Generating explanation for question');
      
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

Keep it concise but educational. Maximum 200 words.`;

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

    console.log('Generating', numQuestions, 'questions for topic:', topic);

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
    console.log('AI response received, length:', responseText.length);
    
    // Parse the JSON response
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed', questions.length, 'questions');
        return NextResponse.json({ success: true, data: questions });
      } else {
        console.error('No JSON array found in response');
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
