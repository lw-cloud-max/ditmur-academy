// Test script to verify AgentRouter API connection
// Run this locally to test your API key

require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AGENTROUTER_API_KEY;
const baseURL = process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1';

console.log('Testing AgentRouter API Connection...\n');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
console.log('Base URL:', baseURL);
console.log('');

if (!apiKey) {
  console.log('❌ ERROR: AGENTROUTER_API_KEY is not set');
  console.log('Please add it to your .env.local file');
  process.exit(1);
}

// Test the API
async function testAPI() {
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "Hello from AgentRouter!" in 5 words or less.' }
        ],
        max_tokens: 50,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! API is working');
      console.log('Response:', data.choices[0].message.content);
    } else {
      console.log('❌ ERROR:', data.error?.message || 'Unknown error');
      console.log('Status:', response.status);
    }
  } catch (error) {
    console.log('❌ CONNECTION ERROR:', error.message);
    console.log('');
    console.log('Possible issues:');
    console.log('1. Wrong base URL');
    console.log('2. Invalid API key');
    console.log('3. Network issue');
  }
}

testAPI();
