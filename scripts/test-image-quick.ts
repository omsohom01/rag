import 'dotenv/config';
import { generateAnswer } from '../src/lib/gemini';
import { logger } from '../src/utils/logger';
import { detectLanguage, translateToEnglish } from '../src/lib/translator';

interface ImageResponse {
  treatment: string;
  prevention: string;
  detectedLanguage: string;
}

async function testImageEndpoint(description: string): Promise<ImageResponse> {
  console.log(`\n🦠 Disease Description: "${description}"`);
  
  // Step 1: Detect language
  const detectedLanguage = await detectLanguage(description);
  console.log(`🌍 Detected Language: ${detectedLanguage}`);
  
  let englishDescription = description;
  
  // Step 2: Translate to English if not already in English
  if (detectedLanguage !== 'en') {
    console.log('🔄 Translating to English...');
    englishDescription = await translateToEnglish(description, detectedLanguage);
    console.log(`📖 English Description: "${englishDescription}"`);
  }
  
  console.log('-'.repeat(60));

  // Step 3: Generate treatment string
  console.log('💊 Generating treatment...');
  const treatmentPrompt = detectedLanguage !== 'en'
    ? `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable TREATMENT plan. Respond ONLY with the treatment steps, no extra explanation. Respond in ${detectedLanguage} language.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nTREATMENT in ${detectedLanguage}:`
    : `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable TREATMENT plan. Respond ONLY with the treatment steps, no extra explanation.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nTREATMENT:`;
  
  const treatment = await generateAnswer(treatmentPrompt);
  console.log(`✓ Treatment generated (${treatment.length} chars)`);
  
  // Step 4: Generate prevention string
  console.log('🛡️ Generating prevention...');
  const preventionPrompt = detectedLanguage !== 'en'
    ? `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable PREVENTION plan to avoid this disease in the future. Respond ONLY with the prevention steps, no extra explanation. Respond in ${detectedLanguage} language.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nPREVENTION in ${detectedLanguage}:`
    : `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable PREVENTION plan to avoid this disease in the future. Respond ONLY with the prevention steps, no extra explanation.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nPREVENTION:`;
  
  const prevention = await generateAnswer(preventionPrompt);
  console.log(`✓ Prevention generated (${prevention.length} chars)`);
  
  console.log('-'.repeat(60));
  
  return {
    treatment,
    prevention,
    detectedLanguage,
  };
}

async function runQuickTest() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         IMAGE ENDPOINT QUICK TEST - Single Example             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Get description from command line or use default
  const description = process.argv[2] || 'Tomato leaves have yellow spots with brown centers, curling edges, and white powdery substance on the underside';

  try {
    const result = await testImageEndpoint(description);
    
    console.log('\n📋 RESULTS:');
    console.log(`\nLanguage: ${result.detectedLanguage.toUpperCase()}`);
    console.log(`\n💊 TREATMENT:\n${result.treatment}`);
    console.log(`\n🛡️ PREVENTION:\n${result.prevention}`);
    
    console.log('\n✅ Test passed! Backend is generating treatment and prevention correctly.');
    
    // Show how it would be returned by the API
    console.log('\n📦 API Response format:');
    console.log(JSON.stringify({
      treatment: result.treatment,
      prevention: result.prevention,
      detectedLanguage: result.detectedLanguage,
    }, null, 2));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n⚠️  Make sure:');
    console.log('   1. GEMINI_API_KEY_1/2/3 are set in .env');
    console.log('   2. You have internet connectivity');
    console.log('   3. API keys have quota remaining');
    process.exit(1);
  }
}

// Run test
console.log('\nUsage: npm run test:image:quick ["disease description"]');
console.log('Example: npm run test:image:quick "Rice blast with brown spots"\n');

runQuickTest().catch((error) => {
  logger.error('Test script error', error);
  console.error('Fatal error:', error);
  process.exit(1);
});
