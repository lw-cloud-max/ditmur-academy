import OpenAI from 'openai';

// Shared OpenAI configuration that works with AgentRouter or direct OpenAI
export function createOpenAIClient(): OpenAI | null {
  const agentRouterKey = process.env.AGENTROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1';
  
  console.log('AI Config Debug:', {
    hasAgentRouterKey: !!agentRouterKey,
    hasOpenAIKey: !!openaiKey,
    baseURL: baseURL,
    agentRouterKeyLength: agentRouterKey?.length || 0,
  });

  const apiKey = agentRouterKey || openaiKey;
  
  if (!apiKey) {
    console.log('No AI API key found');
    return null;
  }

  console.log('Creating OpenAI client with base URL:', baseURL);

  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
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
  const configured = !!(process.env.AGENTROUTER_API_KEY || process.env.OPENAI_API_KEY);
  console.log('AI configured:', configured);
  return configured;
}
