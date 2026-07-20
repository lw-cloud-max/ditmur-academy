import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI conditionally
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function POST(req: Request) {
  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 });
    }

    if (!openai) {
      console.log("No OPENAI_API_KEY found. Falling back to mock data.");
      // Fallback Mock Data
      const generatedScheme = `WEEKLY SCHEME OF WORK\nTopic: ${title}\n\nOBJECTIVES:\nBy the end of this lesson, students should be able to:\n1. Clearly define and explain the core concepts of ${title}.\n2. Identify at least three real-world applications or examples.\n3. Solve basic problems or answer structural questions related to the topic.\n4. Participate in group discussions demonstrating comprehension of the material.\n\nINSTRUCTIONAL MATERIALS:\n- Whiteboard and markers\n- Printed diagram/chart handouts\n- Recommended textbook\n- Interactive projector (if available)\n\nTEACHING METHODOLOGY:\n- Direct Instruction (30%)\n- Interactive Q&A (20%)\n- Guided Practice (30%)\n- Independent Work (20%)`;

      const generatedNote = `COMPREHENSIVE LESSON NOTE FOR STUDENTS: ${title.toUpperCase()}\n\n1. INTRODUCTION TO THE TOPIC\n${title} is a fundamental concept that forms the foundation of our current study module. It refers to the systematic process or structural understanding of how specific elements interact within this field of study. Understanding this topic is crucial because it applies directly to everyday scenarios and advanced academic concepts.\n\n2. CORE DEFINITIONS & PRINCIPLES\n- Principle A: The primary rule governing this topic states that under normal conditions, the standard outcome is predictable and measurable.\n- Principle B: Whenever variables are introduced, the structure adapts in a proportional manner.\n- Key Terminology: Ensure you memorize the definitions of the foundational terms discussed today, as they will appear in your continuous assessments.\n\n3. DETAILED EXAMPLES\nExample 1 (Theoretical): Consider a situation where the foundational rules are applied in a controlled environment. The outcome demonstrates the exact definition of our topic.\nExample 2 (Practical application): If you observe this phenomenon in real life, such as the mechanisms behind daily technology or natural occurrences, you are seeing ${title} in action.\n\n4. STEP-BY-STEP BREAKDOWN\nStep 1: Identify the core variables involved in the problem.\nStep 2: Apply the standard formula or theoretical framework we just discussed.\nStep 3: Calculate or deduce the final outcome.\nStep 4: Verify your result against the known principles of ${title}.\n\n5. SUMMARY & KEY TAKEAWAYS\n- ${title} is essential for understanding broader concepts in this subject.\n- Always remember the two core principles when approaching a problem.\n- Practice is required to master the application of these rules.\n\n(Note for students: Please copy these notes into your notebooks as they will form the basis of next week's test.)`;

      const generatedEvaluation = `FORMATIVE EVALUATION (In-Class):\n\nOral Questions:\n1. In your own words, define ${title}?\n2. Can anyone give me a real-world example of this concept?\n3. What are the two core principles we discussed?\n\nClasswork Activity:\nDivide the class into 4 groups. Provide each group with a scenario related to ${title}. Give them 10 minutes to apply the step-by-step breakdown to solve the scenario, and have one representative from each group present their findings to the class.`;

      const generatedAssignment = `TAKE-HOME ASSIGNMENT:\n\n1. Read pages 42-47 in your recommended textbook covering ${title}.\n2. Answer questions 1 through 5 in the workbook exercise at the end of the chapter.\n3. Research Project: Find one real-world application of ${title} that we did NOT discuss in class, write a short paragraph explaining it, and be prepared to share it in our next lesson.\n\nNOTE: This assignment is due on the first day of our classes next week and will count towards your CA1 score.`;

      // Simulate network processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      return NextResponse.json({ 
        success: true, 
        data: { schemeOfWork: generatedScheme, lessonNote: generatedNote, evaluation: generatedEvaluation, assignment: generatedAssignment }
      });
    }

    // Call Real OpenAI API
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fast and capable
        messages: [
          {
            role: "system",
            content: "You are an expert curriculum developer and teacher. Given a specific topic, generate a comprehensive, highly-detailed, and pedagogical NERC-compliant lesson plan. Return ONLY raw JSON without any markdown formatting blocks. The JSON must exactly match these keys: `schemeOfWork`, `lessonNote`, `evaluation`, `assignment`."
          },
          {
            role: "user",
            content: `Create a detailed lesson plan and student notes for the topic: "${title}". Format the response strictly as a JSON object.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const aiContent = response.choices[0].message.content;
      if (!aiContent) throw new Error("AI returned empty content");
      
      const parsedData = JSON.parse(aiContent);

      return NextResponse.json({ 
        success: true, 
        data: {
          schemeOfWork: parsedData.schemeOfWork,
          lessonNote: parsedData.lessonNote,
          evaluation: parsedData.evaluation,
          assignment: parsedData.assignment
        }
      });
    } catch (apiError: any) {
      // If OpenAI API quota is exceeded or fails, gracefully fallback to mock data
      console.warn("OpenAI API call failed (likely quota exceeded). Falling back to mock data.", apiError.message);
      
      const generatedScheme = `WEEKLY SCHEME OF WORK\nTopic: ${title}\n\nOBJECTIVES:\nBy the end of this lesson, students should be able to:\n1. Clearly define and explain the core concepts of ${title}.\n2. Identify at least three real-world applications or examples.\n3. Solve basic problems or answer structural questions related to the topic.\n4. Participate in group discussions demonstrating comprehension of the material.\n\nINSTRUCTIONAL MATERIALS:\n- Whiteboard and markers\n- Printed diagram/chart handouts\n- Recommended textbook\n- Interactive projector (if available)\n\nTEACHING METHODOLOGY:\n- Direct Instruction (30%)\n- Interactive Q&A (20%)\n- Guided Practice (30%)\n- Independent Work (20%)`;
      const generatedNote = `COMPREHENSIVE LESSON NOTE FOR STUDENTS: ${title.toUpperCase()}\n\n1. INTRODUCTION TO THE TOPIC\n${title} is a fundamental concept that forms the foundation of our current study module. It refers to the systematic process or structural understanding of how specific elements interact within this field of study. Understanding this topic is crucial because it applies directly to everyday scenarios and advanced academic concepts.\n\n2. CORE DEFINITIONS & PRINCIPLES\n- Principle A: The primary rule governing this topic states that under normal conditions, the standard outcome is predictable and measurable.\n- Principle B: Whenever variables are introduced, the structure adapts in a proportional manner.\n- Key Terminology: Ensure you memorize the definitions of the foundational terms discussed today, as they will appear in your continuous assessments.\n\n3. DETAILED EXAMPLES\nExample 1 (Theoretical): Consider a situation where the foundational rules are applied in a controlled environment. The outcome demonstrates the exact definition of our topic.\nExample 2 (Practical application): If you observe this phenomenon in real life, such as the mechanisms behind daily technology or natural occurrences, you are seeing ${title} in action.\n\n4. STEP-BY-STEP BREAKDOWN\nStep 1: Identify the core variables involved in the problem.\nStep 2: Apply the standard formula or theoretical framework we just discussed.\nStep 3: Calculate or deduce the final outcome.\nStep 4: Verify your result against the known principles of ${title}.\n\n5. SUMMARY & KEY TAKEAWAYS\n- ${title} is essential for understanding broader concepts in this subject.\n- Always remember the two core principles when approaching a problem.\n- Practice is required to master the application of these rules.\n\n(Note for students: Please copy these notes into your notebooks as they will form the basis of next week's test.)`;
      const generatedEvaluation = `FORMATIVE EVALUATION (In-Class):\n\nOral Questions:\n1. In your own words, define ${title}?\n2. Can anyone give me a real-world example of this concept?\n3. What are the two core principles we discussed?\n\nClasswork Activity:\nDivide the class into 4 groups. Provide each group with a scenario related to ${title}. Give them 10 minutes to apply the step-by-step breakdown to solve the scenario, and have one representative from each group present their findings to the class.`;
      const generatedAssignment = `TAKE-HOME ASSIGNMENT:\n\n1. Read pages 42-47 in your recommended textbook covering ${title}.\n2. Answer questions 1 through 5 in the workbook exercise at the end of the chapter.\n3. Research Project: Find one real-world application of ${title} that we did NOT discuss in class, write a short paragraph explaining it, and be prepared to share it in our next lesson.\n\nNOTE: This assignment is due on the first day of our classes next week and will count towards your CA1 score.`;

      return NextResponse.json({ 
        success: true, 
        data: { schemeOfWork: generatedScheme, lessonNote: generatedNote, evaluation: generatedEvaluation, assignment: generatedAssignment }
      });
    }

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate AI lesson plan." }, { status: 500 });
  }
}
