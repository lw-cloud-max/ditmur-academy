// Test script for Africa's Talking API
// Run this to verify your API credentials

require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AFRICASTALKING_API_KEY;
const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';

console.log('=== Africa\'s Talking API Test ===\n');

console.log('Configuration:');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NOT SET');
console.log('Username:', username);
console.log('');

if (!apiKey) {
  console.log('❌ ERROR: AFRICASTALKING_API_KEY is not set');
  console.log('Please add it to your .env.local file');
  process.exit(1);
}

// Test the API
async function testAPI() {
  try {
    const apiUrl = username === 'sandbox' 
      ? 'https://sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    console.log('Testing API URL:', apiUrl);
    console.log('');

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('to', '+2348012345678'); // Test number
    formData.append('message', 'Test message from Ditmur Academy');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    console.log('Response Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('');

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('✅ JSON Response:', JSON.stringify(data, null, 2));
      
      if (data.SMSMessageData && data.SMSMessageData.Recipients) {
        console.log('\n✅ SUCCESS! API is working');
        console.log('Recipients:', data.SMSMessageData.Recipients);
      } else if (data.SMSMessageData && data.SMSMessageData.Message) {
        console.log('\n⚠️ API returned message:', data.SMSMessageData.Message);
      }
    } else {
      const text = await response.text();
      console.log('❌ Non-JSON Response:');
      console.log(text);
      console.log('');
      console.log('This usually means:');
      console.log('1. Invalid API key');
      console.log('2. Wrong username');
      console.log('3. Account not activated');
      console.log('4. Sandbox mode restrictions');
    }
  } catch (error) {
    console.log('❌ CONNECTION ERROR:', error.message);
    console.log('');
    console.log('Possible issues:');
    console.log('1. No internet connection');
    console.log('2. Africa\'s Talking API is down');
    console.log('3. Firewall blocking the request');
  }
}

testAPI();
