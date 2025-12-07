import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🔍 Testing Gemini API with key:', apiKey.substring(0, 20) + '...\n');

// Test different model endpoints
const modelsToTest = [
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-exp-1206',
  'gemini-2.0-flash-exp'
];

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}`);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Hello, is this working?'
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100
        }
      },
      {
        timeout: 5000
      }
    );

    console.log(`✅ SUCCESS: ${modelName}`);
    console.log(`   Response: ${response.data.candidates[0].content.parts[0].text.substring(0, 50)}...`);
    return true;
  } catch (error) {
    const status = error.response?.status || 'unknown';
    const message = error.response?.data?.error?.message || error.message;
    console.log(`❌ FAILED: ${modelName} (Status: ${status})`);
    console.log(`   Error: ${message}\n`);
    return false;
  }
}

// List available models
async function listModels() {
  try {
    console.log('\n📋 Fetching list of available models...\n');
    
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    const models = response.data.models || [];
    console.log('Available models:');
    models.forEach((model) => {
      console.log(`  - ${model.name.split('/')[1]}`);
    });
    return models;
  } catch (error) {
    console.log('❌ Could not fetch model list');
    console.log(`   Error: ${error.message}\n`);
    return [];
  }
}

// Main execution
async function main() {
  await listModels();
  
  console.log('\n🧪 Testing individual models:\n');
  
  for (const model of modelsToTest) {
    await testModel(model);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }
}

main().catch(console.error);
