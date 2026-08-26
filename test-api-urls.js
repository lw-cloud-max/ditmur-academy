// Test script to find the correct AgentRouter API endpoint
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AGENTROUTER_API_KEY;

console.log('Testing different AgentRouter API endpoints...\n');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
console.log('');

const urlsToTest = [
  'https://api.agentrouter.org/v1',
  'https://agentrouter.org/v1',
  'https://agentrouter.org/api/v1',
  'https://api.agentrouter.org',
  'https://agentrouter.org',
];

async function testURL(baseURL) {
  try {
    console.log(`Testing: ${baseURL}`);
    
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "Hello" in 1 word.' }
        ],
        max_tokens: 10,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ SUCCESS with ${baseURL}`);
      console.log('Response:', data.choices[0].message.content);
      return true;
    } else {
      console.log(`❌ Failed: ${data.error?.message || response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    return false;
  }
}

async function main() {
  for (const url of urlsToTest) {
    const success = await testURL(url);
    if (success) {
      console.log('\n🎉 Found working endpoint!');
      console.log('Use this base URL:', url);
      process.exit(0);
    }
    console.log('');
  }
  
  console.log('\n❌ None of the URLs worked.');
  console.log('Please check:');
  console.log('1. Your API key is correct');
  console.log('2. You have credits/quota');
  console.log('3. AgentRouter service is available');
}

main();
