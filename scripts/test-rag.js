"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const gemini_1 = require("../src/lib/gemini");
const pinecone_1 = require("../src/lib/pinecone");
const logger_1 = require("../src/utils/logger");
async function testRAG() {
    try {
        console.log('='.repeat(50));
        console.log('RAG SYSTEM TEST');
        console.log('='.repeat(50));
        console.log('');
        const testQuery = 'What is the main topic of this document?';
        console.log(`Test Query: "${testQuery}"`);
        console.log('');
        console.log('Embedding query...');
        const queryEmbedding = await (0, gemini_1.embedText)(testQuery);
        console.log(`✓ Embedding generated (dimension: ${queryEmbedding.length})`);
        console.log('');
        console.log('Querying Pinecone...');
        const matches = await (0, pinecone_1.queryVectors)(queryEmbedding, 5);
        console.log(`✓ Retrieved ${matches.length} chunks`);
        console.log('');
        if (matches.length === 0) {
            console.log('⚠ No matches found in vector database');
            return;
        }
        console.log('Results:');
        console.log('-'.repeat(50));
        matches.forEach((match, idx) => {
            console.log(`\n[${idx + 1}] Match:`);
            console.log(`  Source: ${match.metadata.source}`);
            console.log(`  Similarity Score: ${match.score.toFixed(4)}`);
            console.log(`  Chunk Index: ${match.metadata.chunkIndex}`);
            console.log(`  Text Preview: ${match.metadata.text.substring(0, 100)}...`);
            if (match.score < 0.6) {
                console.log(`  ⚠ LOW SCORE - Below 0.6 threshold`);
            }
        });
        console.log('');
        console.log('='.repeat(50));
        console.log('TEST COMPLETED');
        console.log('='.repeat(50));
    }
    catch (error) {
        logger_1.logger.error('Test failed', error);
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
testRAG();
