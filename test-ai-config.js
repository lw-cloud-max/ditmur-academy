// Test script to verify AI configuration
// Run this locally to check if your environment variables are set correctly

require('dotenv').config({ path: '.env.local' });

console.log('=== AI Configuration Test ===\n');

console.log('Environment Variables:');
console.log('AGENTROUTER_API_KEY:', process.env.AGENTROUTER_API_KEY ? '✅ Set (' + process.env.AGENTROUTER_API_KEY.length + ' chars)' : '❌ Not set');
console.log('AGENTROUTER_BASE_URL:', process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1 (default)');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('AI_MODEL:', process.env.AI_MODEL || 'gpt-4o-mini (default)');

console.log('\n=== Instructions ===');
console.log('1. Create a .env.local file in your project root');
console.log('2. Add these lines:');
console.log('   AGENTROUTER_API_KEY=your-api-key-here');
console.log('   AGENTROUTER_BASE_URL=https://api.agentrouter.org/v1');
console.log('   AI_MODEL=gpt-4o-mini');
console.log('3. Run this script again to verify');
console.log('\nFor Vercel deployment, add these in Settings → Environment Variables');
