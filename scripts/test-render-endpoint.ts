/**
 * Test script to verify the /image endpoint on Render
 * Simulates the exact request format sent by the ShowcaseX frontend
 */

const RENDER_URL = 'https://rag-xru1.onrender.com';

interface ImageResponse {
  treatment: string;
  prevention: string;
  detectedLanguage: string;
}

async function testRenderEndpoint(description: string): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            TESTING RENDER ENDPOINT - /image                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 Target URL: ${RENDER_URL}/image`);
  console.log(`📝 Description: "${description}"\n`);

  const startTime = Date.now();

  try {
    console.log('🔄 Sending POST request...');
    
    const response = await fetch(`${RENDER_URL}/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response received in ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ Request failed with status ${response.status}`);
      console.error('Error response:', errorText);
      return;
    }

    const data: ImageResponse = await response.json();

    console.log('\n✅ SUCCESS! Backend responded correctly\n');
    console.log('═'.repeat(70));
    console.log('📦 RESPONSE DATA:');
    console.log('═'.repeat(70));
    console.log(`\n🌍 Detected Language: ${data.detectedLanguage.toUpperCase()}`);
    console.log(`\n💊 TREATMENT (${data.treatment.length} chars):`);
    console.log('-'.repeat(70));
    console.log(data.treatment);
    console.log('\n🛡️  PREVENTION (${data.prevention.length} chars):');
    console.log('-'.repeat(70));
    console.log(data.prevention);
    console.log('\n' + '═'.repeat(70));

    console.log('\n✅ Frontend integration test: PASSED');
    console.log('   The Render backend is responding correctly to frontend requests.');

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Request failed after ${duration}ms`);
    
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      
      if (error.message.includes('fetch')) {
        console.error('\n⚠️  Possible causes:');
        console.error('   1. Render service is not running');
        console.error('   2. Network connectivity issues');
        console.error('   3. CORS configuration problem');
        console.error('   4. Render URL is incorrect');
      }
    } else {
      console.error('Unknown error:', error);
    }

    console.log('\n❌ Frontend integration test: FAILED');
    process.exit(1);
  }
}

// Test with a realistic disease description (matching frontend format)
const testDescription = process.argv[2] || 
  'Crop: Tomato. Disease: Late Blight. Severity: medium. Brown spots on leaves with white powdery substance on underside. Leaves curling and wilting.';

console.log('\n🧪 FRONTEND INTEGRATION TEST');
console.log('Testing Render endpoint with frontend-format request\n');

testRenderEndpoint(testDescription)
  .then(() => {
    console.log('\n✅ All tests passed! Deploy with confidence.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
