import OpenAI from 'openai';

// Shared OpenAI configuration
export function createOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('OPENAI_API_KEY is not set');
    return null;
  }

  console.log('Creating OpenAI client');

  return new OpenAI({
    apiKey: apiKey,
  });
}

// Get the model to use (configurable via environment)
export function getAIModel(): string {
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  console.log('Using AI model:', model);
  return model;
}

// Check if AI is configured
export function isAIConfigured(): boolean {
  const configured = !!process.env.OPENAI_API_KEY;
  console.log('AI configured:', configured);
  return configured;
}
