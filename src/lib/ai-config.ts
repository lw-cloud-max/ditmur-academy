import OpenAI from 'openai';

// Shared OpenAI configuration that works with AgentRouter or direct OpenAI
export function createOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AGENTROUTER_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1',
  });
}

// Get the model to use (configurable via environment)
export function getAIModel(): string {
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

// Check if AI is configured
export function isAIConfigured(): boolean {
  return !!(process.env.AGENTROUTER_API_KEY || process.env.OPENAI_API_KEY);
}
