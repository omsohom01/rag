import 'dotenv/config';
import { embedText, generateAnswer } from '../src/lib/gemini';
import { queryVectors } from '../src/lib/pinecone';
import { logger } from '../src/utils/logger';

async function testRAG() {
  try {
    console.log('='.repeat(60));
    console.log('RAG SYSTEM TEST');
    console.log('='.repeat(60));
    console.log('');

    const testQueries = [
      'What farming practice helps prevent soil erosion?',
      'what is crop rotation',
      'what are the different methods of irrigation?',
      'Which crop is the major source of food in africa?',
      'what is the major cassava disease?'
    ];

    for (const testQuery of testQueries) {
      const queryEmbedding = await embedText(testQuery);
      const matches = await queryVectors(queryEmbedding, 1);

      console.log(`Query: ${testQuery}`);
      
      if (matches.length === 0 || matches[0].score < 0.6) {
        // Generate answer from Gemini if no match or low similarity
        let generatedAnswer = await generateAnswer(testQuery);
        
        // Remove markdown formatting (stars, bold, headers, etc.)
        generatedAnswer = generatedAnswer
          .replace(/\*\*/g, '') // Remove bold **
          .replace(/\*/g, '') // Remove italic *
          .replace(/^#+\s+/gm, '') // Remove headers
          .replace(/^-\s+/gm, '') // Remove bullet points with dash
          .replace(/^\*\s+/gm, ''); // Remove bullet points with asterisk
        
        console.log(`Answer: ${generatedAnswer}`);
        console.log(`Source: Gemini AI (Generated)`);
        console.log(`Similarity: ${matches.length > 0 ? matches[0].score.toFixed(4) : 'N/A'}`);
      } else {
        // Use RAG answer
        const topMatch = matches[0];
        console.log(`Answer: ${topMatch.metadata.text}`);
        console.log(`Source: ${topMatch.metadata.source}`);
        console.log(`Similarity: ${topMatch.score.toFixed(4)}`);
      }
      
      console.log('-'.repeat(60));
    }

  } catch (error) {
    logger.error('Test failed', error);
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRAG();
