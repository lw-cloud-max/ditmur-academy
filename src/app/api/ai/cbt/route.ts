import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { topic, numQuestions } = await req.json();
    if (!topic || !numQuestions) return NextResponse.json({ success: false, error: 'Topic required' }, { status: 400 });

    /* 
      ======================================================
      REAL AI INTEGRATION (OPENAI / CHATGPT)
      ======================================================
      To make this real, install OpenAI: npm install openai
      Then uncomment the code below:

      import OpenAI from 'openai';
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: `You are an expert exam creator. Generate exactly ${numQuestions} multiple-choice questions about the topic requested. 
            Format the response strictly as a JSON array of objects. Each object must have these keys: 
            "text" (the question), "optionA", "optionB", "optionC", "optionD", "correctAnswer" (must be A, B, C, or D), and "marks" (always 1.0).`
          },
          { role: "user", content: `Topic: ${topic}` }
        ],
        response_format: { type: "json_object" }
      });

      const aiData = JSON.parse(response.choices[0].message.content);
      return NextResponse.json({ success: true, data: aiData.questions });
      ======================================================
    */

    await new Promise(resolve => setTimeout(resolve, 3000)); 

    const mockQuestions = [];
    for (let i = 1; i <= numQuestions; i++) {
      mockQuestions.push({
        text: `(AI Generated) What is a key principle of ${topic} - Question ${i}?`,
        optionA: "A fundamental theory",
        optionB: "A mathematical equation",
        optionC: "An obsolete concept",
        optionD: "None of the above",
        correctAnswer: "A",
        marks: 1.0
      });
    }

    return NextResponse.json({ success: true, data: mockQuestions });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate AI questions." }, { status: 500 });
  }
}
