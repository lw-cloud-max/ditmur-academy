// Test script for Africa's Talking API - Version 2
// Tries multiple endpoints and provides detailed diagnostics

require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AFRICASTALKING_API_KEY;
const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';

console.log('=== Africa\'s Talking API Test v2 ===\n');

console.log('Configuration:');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NOT SET');
console.log('Username:', username);
console.log('');

if (!apiKey) {
  console.log('❌ ERROR: AFRICASTALKING_API_KEY is not set');
  process.exit(1);
}

// Test URLs to try
const urlsToTest = [
  { name: 'Production', url: 'https://api.africastalking.com/version1/messaging' },
  { name: 'Sandbox', url: 'https://sandbox.africastalking.com/version1/messaging' },
  { name: 'Alternative Production', url: 'https://api.africastalking.com/version1/messaging' },
];

async function testURL(urlInfo) {
  console.log(`\nTesting: ${urlInfo.name}`);
  console.log(`URL: ${urlInfo.url}`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('to', '+2348012345678');
    formData.append('message', 'Test from Ditmur Academy');

    const response = await fetch(urlInfo.url, {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('✅ Connection successful!');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const text = await response.text();
      console.log('Response (text):', text.substring(0, 500));
      return { success: false, error: text };
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    
    if (error.name === 'AbortError') {
      console.log('   Reason: Request timed out (10 seconds)');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   Reason: DNS lookup failed - no internet or wrong URL');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   Reason: Connection refused - server may be down');
    } else if (error.message.includes('fetch failed')) {
      console.log('   Reason: Network error - check internet connection');
    }
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Starting tests...\n');
  
  let anySuccess = false;
  
  for (const urlInfo of urlsToTest) {
    const result = await testURL(urlInfo);
    if (result.success) {
      anySuccess = true;
      console.log('\n✅ Found working endpoint!');
      break;
    }
  }
  
  if (!anySuccess) {
    console.log('\n\n=== DIAGNOSIS ===');
    console.log('All API endpoints failed. This suggests:');
    console.log('');
    console.log('1. INTERNET CONNECTION ISSUE');
    console.log('   - Check if you can access other websites');
    console.log('   - Try running: ping google.com');
    console.log('');
    console.log('2. FIREWALL/PROXY BLOCKING');
    console.log('   - Your network may block external API calls');
    console.log('   - Try from a different network (mobile hotspot)');
    console.log('');
    console.log('3. AFRICA\'S TALKING API DOWN');
    console.log('   - Check status: https://status.africastalking.com/');
    console.log('   - Try again later');
    console.log('');
    console.log('4. WRONG API KEY FORMAT');
    console.log('   - API key should start with "atsk_"');
    console.log('   - Make sure no extra spaces');
    console.log('');
    console.log('=== ALTERNATIVE SOLUTIONS ===');
    console.log('');
    console.log('Option 1: Use Africa\'s Talking SDK (more reliable)');
    console.log('  npm install africastalking');
    console.log('');
    console.log('Option 2: Use a different SMS provider');
    console.log('  - Twilio (twilio.com)');
    console.log('  - Infobip (infobip.com)');
    console.log('');
    console.log('Option 3: Test from production environment');
    console.log('  - Deploy to Vercel and test there');
    console.log('  - Local network may have restrictions');
  }
}

main();
