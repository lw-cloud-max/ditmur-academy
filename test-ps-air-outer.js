// Test script to try ps.air-outer.com API endpoint
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AGENTROUTER_API_KEY;

console.log('Testing ps.air-outer.com API endpoint...\n');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
console.log('');

const urlsToTest = [
  'https://ps.air-outer.com/v1',
  'https://ps.air-outer.com',
  'https://ps.air-outer.com/api/v1',
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
  console.log('The API key might be invalid or expired.');
}

main();
