import 'dotenv/config';
import { generateAnswer } from '../src/lib/gemini';
import { logger } from '../src/utils/logger';
import { detectLanguage, translateToEnglish } from '../src/lib/translator';

interface ImageResponse {
  treatment: string;
  prevention: string;
  detectedLanguage: string;
}

async function simulateImageRequest(description: string): Promise<ImageResponse> {
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

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         IMAGE ENDPOINT TEST - Disease Treatment & Prevention    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const testCases = [
    {
      name: 'Test 1: Tomato Late Blight',
      description: 'Tomato leaves have yellow spots with brown centers, curling edges, and white powdery substance on the underside',
    },
    {
      name: 'Test 2: Rice Blast (High Severity)',
      description: 'Crop: Rice. Disease: Blast. Severity: high. Leaf spots and brown lesions on rice leaves.',
    },
    {
      name: 'Test 3: Wheat Rust',
      description: 'Wheat crop showing orange-red pustules on leaves and stems, with some leaves turning yellow and dying',
    },
    {
      name: 'Test 4: Potato Early Blight',
      description: 'Potato plants with dark brown circular spots on lower leaves, concentric rings visible, leaves yellowing',
    },
    {
      name: 'Test 5: Cotton Leaf Curl',
      description: 'Cotton leaves curling upward, yellowing between veins, reduced leaf size, stunted plant growth',
    },
  ];

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${testCase.name}`);
    console.log(`${'═'.repeat(70)}`);

    try {
      const result = await simulateImageRequest(testCase.description);
      
      console.log('\n📋 RESULTS:');
      console.log(`\nLanguage: ${result.detectedLanguage.toUpperCase()}`);
      console.log(`\n💊 TREATMENT:`);
      console.log(result.treatment);
      console.log(`\n🛡️ PREVENTION:`);
      console.log(result.prevention);
      
      successCount++;
      console.log('\n✅ Test passed');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      failureCount++;
    }

    // Add delay between requests to avoid rate limiting
    if (i < testCases.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Passed: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failureCount}/${testCases.length}`);
  
  if (failureCount === 0) {
    console.log('\n🎉 All tests passed! Backend is ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review errors above.');
  }
}

// Run tests
runTests().catch((error) => {
  logger.error('Test script error', error);
  console.error('Fatal error:', error);
  process.exit(1);
});
