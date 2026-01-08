import 'dotenv/config';

// Simulate the handler call
async function testApiDeployment() {
  try {
    console.log('🧪 Testing API Deployment Readiness...\n');
    
    // Import the handler
    const handler = (await import('./api/chat')).default;
    
    // Create mock request and response
    const mockRequest = {
      method: 'POST',
      body: {
        query: 'What is agriculture?'
      }
    };
    
    let responseData: any = null;
    let statusCode: number = 0;
    
    const mockResponse = {
      status: (code: number) => {
        statusCode = code;
        return mockResponse;
      },
      json: (data: any) => {
        responseData = data;
      }
    };
    
    // Call the handler
    console.log('📤 Sending test query: "What is agriculture?"');
    await handler(mockRequest as any, mockResponse as any);
    
    console.log('\n✅ DEPLOYMENT READINESS CHECK:\n');
    console.log(`Status Code: ${statusCode}`);
    
    if (responseData) {
      console.log(`Answer Length: ${responseData.answer?.length || 0} characters`);
      console.log(`Number of Sources: ${responseData.sources?.length || 0}`);
      console.log(`Detected Language: ${responseData.detectedLanguage}`);
      console.log(`Has Translation Support: ${responseData.translatedQuery !== undefined ? 'Yes' : 'No'}`);
      
      if (statusCode === 200 && responseData.answer) {
        console.log('\n🎉 SUCCESS! API is ready for Render deployment!');
        console.log('\n📝 Sample Answer (first 100 chars):');
        console.log(responseData.answer.substring(0, 100) + '...');
        console.log('\n✅ All checks passed!');
      } else {
        console.log('\n❌ FAILED: Response incomplete or error');
      }
    } else {
      console.log('\n❌ FAILED: No response data');
    }
    
  } catch (error) {
    console.error('\n❌ DEPLOYMENT TEST FAILED:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testApiDeployment();
