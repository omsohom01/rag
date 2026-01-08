import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

let pinecone: Pinecone | null = null;
let indexName: string | null = null;

function getClient(): Pinecone {
  if (!pinecone) {
    const apiKey = process.env.PINECONE_API_KEY;
    indexName = process.env.PINECONE_INDEX || null;
    
    if (!apiKey || !indexName) {
      throw new Error('PINECONE_API_KEY and PINECONE_INDEX environment variables are required');
    }
    
    pinecone = new Pinecone({ apiKey });
  }
  return pinecone;
}

export interface VectorMetadata {
  text: string;
  source: string;
  chunkIndex: number;
  [key: string]: string | number;
}

export interface QueryMatch {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export async function getIndex() {
  const client = getClient();
  if (!indexName) {
    throw new Error('PINECONE_INDEX is not defined');
  }
  return client.index(indexName);
}

export async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: VectorMetadata }[]
): Promise<void> {
  try {
    const index = await getIndex();
    
    // DIAGNOSTIC: Get index stats before upsert
    logger.info(`\n🔍 Index stats BEFORE upsert:`);
    try {
      const statsBefore = await index.describeIndexStats();
      logger.info(`   Total vectors: ${statsBefore.totalRecordCount || 0}`);
      logger.info(`   Dimension: ${statsBefore.dimension || 'unknown'}`);
      logger.info(`   Namespaces: ${JSON.stringify(statsBefore.namespaces || {})}`);
    } catch (e) {
      logger.warn('Could not fetch index stats before upsert');
    }
    
    const batchSize = 100;
    const namespace = process.env.PINECONE_NAMESPACE || '';
    
    logger.info(`📤 Upserting ${vectors.length} vectors to namespace: "${namespace || '(default)'}"`);
    logger.info(`   First vector dimension: ${vectors[0]?.values.length || 0}`);
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(vectors.length / batchSize);
      
      // DIAGNOSTIC: Log batch vector IDs
      const first3Ids = batch.slice(0, 3).map(v => v.id);
      const last3Ids = batch.slice(-3).map(v => v.id);
      
      logger.info(`📦 Upserting batch ${batchNum}/${totalBatches}:`);
      logger.info(`   IDs (first 3): ${first3Ids.join(', ')}`);
      logger.info(`   IDs (last 3): ${last3Ids.join(', ')}`);
      logger.info(`   Namespace: "${namespace || '(default)'}"`);
      logger.info(`   Vector count: ${batch.length}`);
      
      // Retry upsert with exponential backoff for network errors
      await withRetry(
        async () => {
          const upsertConfig: any = batch;
          await index.upsert(upsertConfig);
        },
        { maxAttempts: 5, delayMs: 2000 }
      );
      
      logger.info(`✓ Upserted batch ${batchNum}/${totalBatches} (${batch.length} vectors)`);
    }
    
    // DIAGNOSTIC: Wait a moment and check final stats
    logger.info(`\n⏳ Waiting 5 seconds for Pinecone to update stats...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    logger.info(`\n🔍 Index stats AFTER upsert:`);
    const statsAfter = await index.describeIndexStats();
    logger.info(`   Total vectors: ${statsAfter.totalRecordCount || 0}`);
    logger.info(`   Dimension: ${statsAfter.dimension || 'unknown'}`);
    logger.info(`   Namespaces: ${JSON.stringify(statsAfter.namespaces || {}, null, 2)}`);
    
    // DIAGNOSTIC: Analyze results
    const expectedVectors = vectors.length;
    const actualVectors = statsAfter.totalRecordCount || 0;
    
    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`📊 INGESTION DIAGNOSTIC REPORT:`);
    logger.info(`${'='.repeat(70)}`);
    logger.info(`Expected vectors to upsert: ${expectedVectors}`);
    logger.info(`Actual vectors in index: ${actualVectors}`);
    logger.info(`Difference: ${expectedVectors - actualVectors} vectors`);
    
    if (actualVectors < expectedVectors) {
      logger.warn(`\n⚠️  PROBLEM DETECTED: Only ${actualVectors} of ${expectedVectors} vectors exist!`);
      logger.warn(`\nPossible causes:`);
      logger.warn(`1. ID COLLISION: ${expectedVectors - actualVectors} duplicate IDs overwrote existing vectors`);
      logger.warn(`   - Check if chunk.index resets per file (causing same IDs for different files)`);
      logger.warn(`   - Solution: Use globally unique IDs or include more file context in ID`);
      logger.warn(`2. NAMESPACE MISMATCH: Vectors upserted to different namespace than expected`);
      logger.warn(`   - Expected namespace: "${namespace || '(default)'}"`);
      logger.warn(`   - Check .env PINECONE_NAMESPACE setting`);
      logger.warn(`3. DIMENSION MISMATCH: Some vectors rejected due to wrong dimensions`);
      logger.warn(`   - Index dimension: ${statsAfter.dimension}`);
      logger.warn(`   - Vector dimension: ${vectors[0]?.values.length || 0}`);
    } else {
      logger.info(`\n✅ SUCCESS: All ${actualVectors} vectors ingested correctly!`);
    }
    logger.info(`${'='.repeat(70)}\n`);
    
  } catch (error) {
    logger.error('Error upserting vectors', error);
    throw error;
  }
}

export async function queryVectors(
  queryVector: number[],
  topK: number = 5
): Promise<QueryMatch[]> {
  try {
    const index = await getIndex();
    // Retrieve more results to ensure we get both JSON and PDF sources
    const queryResponse = await index.query({
      vector: queryVector,
      topK: topK * 3,
      includeMetadata: true,
    });

    let matches = (queryResponse.matches || []).map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as unknown as VectorMetadata,
    }));

    // Boost JSON sources by 50% to strongly prioritize concise answers
    matches = matches.map((match) => {
      if (match.metadata.source.endsWith('.json')) {
        return {
          ...match,
          score: match.score * 1.5,
        };
      }
      return match;
    });

    // Re-sort by boosted scores and take top K
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, topK);
  } catch (error) {
    logger.error('Error querying vectors', error);
    throw error;
  }
}
